// STORIE INSTAGRAM: legge il calendario da index.html e disegna la storia (1080×1920) su un canvas.
// Prima della partita: Gran Premio. A partita giocata (data-gf/data-gs presenti): Fotofinish con risultato e marcatori.
// Se la riga del calendario ha data-scena (e per il Fotofinish data-scena-fotofinish) l'illustrazione fa da sfondo,
// altrimenti restano le strisce dello scudo.
(function(){
  var W=1080,H=1920;
  var VERDE='#028947',ERBA='#1fcf6a',BIANCO='#f7f5ef',GRIGIO='#a9b3ad';
  var TITOLO='"Big Shoulders Display",Impact,"Arial Narrow",sans-serif';
  var TESTO='Barlow,system-ui,sans-serif';
  var NOI='Horto Muso';

  // TORNA AL SITO: riporta alla sezione da cui sei arrivato, non al cavallo
  var torna=document.getElementById('torna');
  var da=(location.search.match(/[?&]da=(partite|classifica)\b/)||[])[1];
  if(torna&&da)torna.href='./#'+da;

  var tela=document.getElementById('tela'),ctx=tela.getContext('2d');
  var scelta=document.getElementById('partita');
  var bottoneCondividi=document.getElementById('condividi');
  var linkScarica=document.getElementById('scarica');
  var stato=document.getElementById('stato');
  var logo=new Image();logo.src='assets/logo.png';
  var torneo=new Image();torneo.src='assets/mazzola.png';
  var partite=[],classifica=[],aggiornata='',immagine=null,urlImmagine=null,nomeFile='horto-muso-storia.png';

  var giorno=new Intl.DateTimeFormat('it-IT',{weekday:'long',day:'numeric',month:'long',timeZone:'Europe/Rome'});
  var breve=new Intl.DateTimeFormat('it-IT',{weekday:'short',day:'numeric',month:'short',timeZone:'Europe/Rome'});
  var ora=new Intl.DateTimeFormat('it-IT',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Rome'});

  // --- dati: le righe .match di index.html ---
  function leggi(html){
    var doc=new DOMParser().parseFromString(html,'text/html');
    return [].map.call(doc.querySelectorAll('.match[data-inizio]'),function(r){
      var b=r.querySelector('b'),ris=b.querySelector('.ris'),casa,ospiti,punteggio=null;
      if(ris){
        var prima='',dopo='',passato=false;
        b.childNodes.forEach(function(n){
          if(n===ris){passato=true;return}
          if(passato)dopo+=n.textContent;else prima+=n.textContent;
        });
        casa=prima.trim();ospiti=dopo.trim();punteggio=ris.textContent.trim();
      }else{
        var parti=b.textContent.split(/\s+[–-]\s+/);
        casa=(parti[0]||'').trim();ospiti=(parti[1]||'').trim();
      }
      var m=r.querySelector('.marcatori');
      return {
        inizio:new Date(r.dataset.inizio),
        casa:casa,ospiti:ospiti,punteggio:punteggio,
        gf:r.dataset.gf!=null?+r.dataset.gf:null,
        gs:r.dataset.gs!=null?+r.dataset.gs:null,
        marcatori:m?m.textContent.replace(/^\s*Gol:\s*/i,'').trim():'',
        scena:r.dataset.scena||'',
        scenaFotofinish:r.dataset.scenaFotofinish||''
      };
    });
  }

  function leggiClassifica(html){
    var doc=new DOMParser().parseFromString(html,'text/html');
    var t=doc.querySelector('#classifica time');
    aggiornata=t?t.textContent.trim():'';
    return [].map.call(doc.querySelectorAll('.classifica tbody tr'),function(r){
      return {pos:r.cells[0].textContent.trim(),nome:r.querySelector('th').textContent.trim(),
        pt:r.querySelector('.pt').textContent.trim(),g:r.cells[3].textContent.trim(),
        dr:r.cells[9].textContent.trim(),noi:r.classList.contains('noi')};
    });
  }

  // partita proposta all'apertura: quella di oggi, se no il risultato degli ultimi due giorni, se no la prossima
  function predefinita(){
    if(/[?&]storia=classifica\b/.test(location.search)&&classifica.length)return 'classifica';
    var adesso=new Date(),oggi=adesso.toDateString();
    for(var i=0;i<partite.length;i++)if(partite[i].inizio.toDateString()===oggi)return i;
    var ultimaGiocata=-1;
    partite.forEach(function(p,i){if(p.gf!=null)ultimaGiocata=i});
    if(ultimaGiocata>=0&&adesso-partite[ultimaGiocata].inizio<2*864e5)return ultimaGiocata;
    for(var j=0;j<partite.length;j++)if(partite[j].gf==null&&partite[j].inizio>adesso)return j;
    return ultimaGiocata>=0?ultimaGiocata:0;
  }

  // --- disegno ---
  function spaziatura(px){if('letterSpacing' in ctx)ctx.letterSpacing=px+'px'}
  function scritta(testo,x,y,font,dim,colore,max,spazio){
    spaziatura(spazio||0);
    do{ctx.font=font.replace('{}',dim+'px');dim-=4}while(max&&ctx.measureText(testo).width>max&&dim>20);
    ctx.fillStyle=colore;ctx.fillText(testo,x,y);
    spaziatura(0);
  }
  function aCapo(testo,max){
    var parole=testo.split(' '),righe=[],riga='';
    parole.forEach(function(p){
      var prova=riga?riga+' '+p:p;
      if(ctx.measureText(prova).width>max&&riga){righe.push(riga);riga=p}else riga=prova;
    });
    if(riga)righe.push(riga);
    return righe;
  }
  function sfondo(){
    // le strisce dello scudo, che sfumano nel nero verso il basso
    ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
    var l=W/10;
    for(var i=0;i<10;i+=2){ctx.fillStyle=VERDE;ctx.fillRect(i*l,0,l,H)}
    var g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'rgba(0,0,0,.25)');g.addColorStop(.42,'rgba(0,0,0,.72)');g.addColorStop(.6,'rgba(0,0,0,.92)');g.addColorStop(1,'rgba(0,0,0,.96)');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  }
  // la scena riempie tutta la storia (tagliando i lati se serve) e sfuma nel nero in alto e in basso, dove vanno le scritte
  function sfondoScena(img){
    ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
    var k=Math.max(W/img.naturalWidth,H/img.naturalHeight),w=img.naturalWidth*k,h=img.naturalHeight*k;
    ctx.drawImage(img,(W-w)/2,(H-h)/2,w,h);
    var g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'rgba(0,0,0,.85)');g.addColorStop(.3,'rgba(0,0,0,0)');g.addColorStop(.52,'rgba(0,0,0,0)');
    g.addColorStop(.66,'rgba(0,0,0,.9)');g.addColorStop(1,'rgba(0,0,0,.97)');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  }
  // grana di stampa sopra tutta la storia: scritte e disegno sembrano usciti dalla stessa serigrafia
  var trama=null;
  function grana(){
    if(!trama){
      var t=document.createElement('canvas');t.width=t.height=256;
      var c=t.getContext('2d'),d=c.createImageData(256,256);
      for(var i=0;i<d.data.length;i+=4){var v=Math.random()*255;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255}
      c.putImageData(d,0,0);trama=ctx.createPattern(t,'repeat');
    }
    ctx.save();ctx.globalCompositeOperation='overlay';ctx.globalAlpha=.16;
    ctx.fillStyle=trama;ctx.fillRect(0,0,W,H);ctx.restore();
  }
  function fascia(y){
    // fascia a strisce, come sotto i titoli del sito
    for(var i=0;i<6;i++){ctx.fillStyle=VERDE;ctx.fillRect(W/2-275+i*100,y,50,12)}
  }
  // la prima scena della lista che si riesce a caricare
  function primaScena(lista){
    return lista.reduce(function(prima,src){
      return prima.then(function(img){return img||caricaScena(src)});
    },Promise.resolve(null));
  }
  function sceneDi(p){
    if(p.gf==null)return [p.scena];
    // il Fotofinish della linea "manifesto": scena della partita, se no quella pronta per l'esito, se no quella del Gran Premio
    return p.scena||p.scenaFotofinish?[p.scenaFotofinish,'assets/scene/fotofinish-'+esitoDi(p).toLowerCase()+'.webp',p.scena]:[];
  }
  var scene={};
  function caricaScena(src){
    if(!src)return Promise.resolve(null);
    if(!scene[src])scene[src]=new Promise(function(ok){
      var i=new Image();
      i.onload=function(){ok(i)};i.onerror=function(){ok(null)};
      i.src=src;
    });
    return scene[src];
  }
  function stemma(cx,y,lato){
    if(logo.complete&&logo.naturalWidth){
      ctx.save();ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=40;
      ctx.drawImage(logo,cx-lato/2,y,lato,lato);ctx.restore();
    }
  }
  // riga in alto: stemma della Mazzola Cup e scritta, centrati insieme
  function intestazione(testo,font){
    var lato=80,spazio=20;
    spaziatura(font?4:8);ctx.font=font?'400 34px '+font:'600 40px '+TESTO;
    var tw=Math.min(ctx.measureText(testo).width,940-lato-spazio);
    var x=(W-(lato+spazio+tw))/2;
    if(torneo.complete&&torneo.naturalWidth)ctx.drawImage(torneo,x,282-lato/2,lato,lato);else{x-=(lato+spazio)/2}
    ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillStyle=BIANCO;
    ctx.fillText(testo,x+lato+spazio,288,940-lato-spazio);
    spaziatura(0);ctx.textAlign='center';ctx.textBaseline='alphabetic';
  }
  function nomeSquadra(nome,y,dim){
    var nostra=nome.toLowerCase()===NOI.toLowerCase();
    scritta(nome.toUpperCase(),W/2,y,'900 {} '+TITOLO,dim,nostra?ERBA:BIANCO,940,2);
  }

  function granPremio(p,img){
    if(img){granPremioScena(p,img);return}
    sfondo();
    ctx.textAlign='center';ctx.textBaseline='alphabetic';
    intestazione('MAZZOLA CUP · GIRONE B');
    scritta('GRAN PREMIO',W/2,470,'900 {} '+TITOLO,190,BIANCO,980,6);
    stemma(W/2,510,440);
    nomeSquadra(p.casa,1080,130);
    // VS nel cerchio verde
    ctx.fillStyle=VERDE;ctx.beginPath();ctx.arc(W/2,1160,62,0,Math.PI*2);ctx.fill();
    ctx.textBaseline='middle';scritta('VS',W/2,1166,'900 {} '+TITOLO,64,BIANCO);ctx.textBaseline='alphabetic';
    nomeSquadra(p.ospiti,1340,130);
    fascia(1400);
    scritta(giorno.format(p.inizio).toUpperCase(),W/2,1510,'700 {} '+TITOLO,84,BIANCO,960,3);
    scritta('ORE '+ora.format(p.inizio),W/2,1600,'900 {} '+TITOLO,84,ERBA,960,3);
    scritta('Campo Mazzola · Beinasco',W/2,1665,'600 {} '+TESTO,40,GRIGIO,940,1);
  }

  // STILE MANIFESTO (storie con la scena): titolo in corsivo anni '70, il resto in lettere a bastoni pesanti,
  // ogni scritta con una copia sfalsata in un altro inchiostro, come una serigrafia fuori registro
  var CORSIVO='Shrikhand,'+TITOLO,LASTRA='"Alfa Slab One",'+TITOLO,ARANCIO='#e8641e';
  function stampa(t,x,y,font,dim,colore,ombra,max,sfalso){
    do{ctx.font='400 '+dim+'px '+font;dim-=4}while(max&&ctx.measureText(t).width>max&&dim>20);
    var d=sfalso||Math.max(3,dim*.05);
    ctx.fillStyle=ombra;ctx.fillText(t,x+d,y+d);
    ctx.fillStyle=colore;ctx.fillText(t,x,y);
  }
  function titoloManifesto(t,y){
    ctx.save();ctx.translate(W/2,y);ctx.rotate(-.05);
    stampa(t,0,0,CORSIVO,170,BIANCO,ARANCIO,960,9);
    ctx.restore();
  }
  function nomeManifesto(nome,y,dim){
    var nostra=nome.toLowerCase()===NOI.toLowerCase();
    stampa(nome.toUpperCase(),W/2,y,LASTRA,dim,nostra?ERBA:BIANCO,nostra?'#000':VERDE,940);
  }

  function granPremioScena(p,img){
    sfondoScena(img);
    ctx.textAlign='center';ctx.textBaseline='alphabetic';
    intestazione('MAZZOLA CUP · GIRONE B',LASTRA);
    titoloManifesto('Gran Premio',470);
    nomeManifesto(p.casa,1290,92);
    stampa('contro',W/2,1368,CORSIVO,60,ARANCIO,'#000',600,3);
    nomeManifesto(p.ospiti,1480,92);
    fascia(1520);
    stampa(giorno.format(p.inizio).toUpperCase(),W/2,1610,LASTRA,56,BIANCO,'#000',960,3);
    stampa('ORE '+ora.format(p.inizio)+' · BEINASCO',W/2,1684,LASTRA,50,ERBA,'#000',960,3);
    grana();
  }

  // "CiccioGamer 3, Tarallo 2" → "CiccioGamer 3 · Tarallo 2", con nome e numero sempre sulla stessa riga
  function gol(m){return m.split(/,\s*/).map(function(x){return x.trim().replace(/\s+/g,'\u00a0')}).join(' · ')}
  function esitoDi(p){return p.gf>p.gs?'VITTORIA':p.gf<p.gs?'SCONFITTA':'PAREGGIO'}

  function fotofinishScena(p,img){
    sfondoScena(img);
    ctx.textAlign='center';ctx.textBaseline='alphabetic';
    intestazione('MAZZOLA CUP · '+breve.format(p.inizio).toUpperCase(),LASTRA);
    titoloManifesto('Fotofinish',470);
    var vinta=p.gf>p.gs,esito=esitoDi(p);
    stampa(esito.charAt(0)+esito.slice(1).toLowerCase()+(vinta?'!':''),W/2,1246,CORSIVO,72,vinta?ERBA:BIANCO,vinta?'#000':ARANCIO,700,4);
    nomeManifesto(p.casa,1330,72);
    stampa((p.punteggio||'').replace(/\s*[–-]\s*/,' – '),W/2,1490,LASTRA,160,BIANCO,VERDE,960,8);
    nomeManifesto(p.ospiti,1578,72);
    if(p.marcatori){
      var dim=34,righe;
      do{ctx.font='400 '+dim+'px '+LASTRA;righe=aCapo('GOL: '+gol(p.marcatori.toUpperCase()),920);dim-=2}while(righe.length>2&&dim>24);
      ctx.fillStyle=BIANCO;
      righe.forEach(function(r,k){ctx.fillText(r,W/2,1644+k*(dim+12))});
    }
    grana();
  }

  function fotofinish(p,img){
    if(img){fotofinishScena(p,img);return}
    sfondo();
    ctx.textAlign='center';ctx.textBaseline='alphabetic';
    var esito=esitoDi(p);
    intestazione('FOTOFINISH · '+breve.format(p.inizio).toUpperCase());
    scritta(esito,W/2,470,'900 {} '+TITOLO,190,p.gf>p.gs?ERBA:BIANCO,980,6);
    stemma(W/2,510,340);
    nomeSquadra(p.casa,990,110);
    scritta((p.punteggio||'').replace(/\s*[–-]\s*/,' – '),W/2,1250,'900 {} '+TITOLO,290,BIANCO,960,4);
    nomeSquadra(p.ospiti,1370,110);
    if(p.marcatori){
      fascia(1420);
      scritta('GOL',W/2,1505,'900 {} '+TITOLO,54,ERBA,940,6);
      var dim=46,righe;
      do{ctx.font='600 '+dim+'px '+TESTO;righe=aCapo(gol(p.marcatori),900);dim-=2}while(righe.length>3&&dim>28);
      ctx.fillStyle=BIANCO;
      righe.forEach(function(r,k){ctx.fillText(r,W/2,1570+k*(dim+16))});
    }
  }

  function storiaClassifica(){
    sfondo();
    ctx.textAlign='center';ctx.textBaseline='alphabetic';
    intestazione('MAZZOLA CUP · GIRONE B');
    scritta('CLASSIFICA',W/2,470,'900 {} '+TITOLO,190,BIANCO,980,6);
    var x0=70,x1=W-70,top=540,h=Math.min(100,1060/Math.max(classifica.length,1));
    ctx.textBaseline='middle';
    // intestazione colonne
    ctx.textAlign='right';
    scritta('G',x1-150,top+20,'600 {} '+TESTO,30,GRIGIO,0,4);
    scritta('PT',x1-20,top+20,'600 {} '+TESTO,30,GRIGIO,0,4);
    top+=50;
    classifica.forEach(function(s,i){
      var y=top+i*h,cy=y+h/2;
      if(s.noi){ctx.fillStyle=VERDE;ctx.fillRect(x0-20,y+4,x1-x0+40,h-8)}
      else{ctx.fillStyle='rgba(2,137,71,.45)';ctx.fillRect(x0,y,x1-x0,2)}
      ctx.textAlign='left';
      scritta(s.pos,x0+4,cy+3,'900 {} '+TITOLO,58,s.noi?BIANCO:GRIGIO);
      scritta(s.nome.toUpperCase(),x0+90,cy+3,'900 {} '+TITOLO,58,BIANCO,620,1);
      ctx.textAlign='right';
      scritta(s.g,x1-150,cy+3,'700 {} '+TITOLO,52,s.noi?BIANCO:GRIGIO);
      scritta(s.pt,x1-20,cy+3,'900 {} '+TITOLO,64,s.noi?BIANCO:ERBA);
    });
    ctx.textAlign='center';ctx.textBaseline='alphabetic';
    if(aggiornata)scritta('Aggiornata a '+aggiornata,W/2,Math.min(top+classifica.length*h+60,1665),'600 {} '+TESTO,38,GRIGIO,940,1);
  }

  var giri=0;
  function disegna(){
    if(scelta.value==='classifica'){
      giri++;
      storiaClassifica();
      nomeFile='horto-muso-classifica.png';
      var n=classifica.filter(function(s){return s.noi})[0];
      tela.setAttribute('aria-label','Storia della classifica del girone B'+(n?': Horto Muso '+n.pos+'° con '+n.pt+' punti':''));
      prepara();return;
    }
    var p=partite[+scelta.value];
    if(!p)return;
    var giocata=p.gf!=null,turno=++giri;
    immagine=null;
    primaScena(sceneDi(p).filter(Boolean)).then(function(img){
      if(turno!==giri)return; // nel frattempo è stata scelta un'altra partita
      if(giocata)fotofinish(p,img);else granPremio(p,img);
      var data=p.inizio.toISOString().slice(0,10);
      nomeFile='horto-muso-'+(giocata?'fotofinish':'gran-premio')+'-'+data+'.png';
      tela.setAttribute('aria-label',giocata
        ?'Storia del fotofinish: '+p.casa+' '+p.punteggio+' '+p.ospiti+(p.marcatori?'. Gol: '+p.marcatori:'')
        :'Storia del Gran Premio: '+p.casa+' contro '+p.ospiti+', '+giorno.format(p.inizio)+' alle '+ora.format(p.inizio)+', campo Mazzola di Beinasco');
      prepara();
    });
  }
  function prepara(){
    // l'immagine è pronta prima del tocco su Condividi (Safari vuole la condivisione subito dopo il tocco)
    immagine=null;
    tela.toBlob(function(b){
      immagine=b;
      if(urlImmagine)URL.revokeObjectURL(urlImmagine);
      urlImmagine=URL.createObjectURL(b);
      linkScarica.href=urlImmagine;linkScarica.download=nomeFile;
    },'image/png');
  }

  bottoneCondividi.addEventListener('click',function(){
    if(!immagine){stato.textContent='Un attimo, sto preparando l’immagine…';return}
    var file=new File([immagine],nomeFile,{type:'image/png'});
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      navigator.share({files:[file]}).then(function(){stato.textContent='Fatto!'}).catch(function(e){
        if(e&&e.name!=='AbortError')stato.textContent='Condivisione non riuscita: usa Scarica.';
      });
    }else{
      linkScarica.click();
      stato.textContent='Questo browser non condivide immagini: l’ho scaricata, caricala tu su Instagram.';
    }
  });
  linkScarica.addEventListener('click',function(e){if(!urlImmagine)e.preventDefault()});
  scelta.addEventListener('change',function(){stato.textContent='';disegna()});

  var fonts=document.fonts?Promise.all([
    document.fonts.load('900 100px "Big Shoulders Display"'),
    document.fonts.load('700 100px "Big Shoulders Display"'),
    document.fonts.load('600 40px Barlow'),
    document.fonts.load('400 100px Shrikhand'),
    document.fonts.load('400 100px "Alfa Slab One"')
  ]).catch(function(){}):Promise.resolve();
  var stemmaPronto=Promise.all([logo,torneo].map(function(i){return i.decode?i.decode().catch(function(){}):null}));

  fetch('index.html',{cache:'no-cache'}).then(function(r){return r.text()}).then(function(html){
    partite=leggi(html);
    classifica=leggiClassifica(html);
    partite.forEach(function(p,i){
      var o=document.createElement('option');
      o.value=i;
      o.textContent=breve.format(p.inizio)+' · '+(p.gf!=null?p.casa+' '+p.punteggio+' '+p.ospiti:p.casa+' – '+p.ospiti+' (Gran Premio)');
      scelta.appendChild(o);
    });
    if(classifica.length){
      var c=document.createElement('option');
      c.value='classifica';c.textContent='Classifica girone B'+(aggiornata?' · '+aggiornata:'');
      scelta.appendChild(c);
    }
    scelta.value=predefinita();
    return Promise.all([fonts,stemmaPronto]);
  }).then(disegna).catch(function(){
    stato.textContent='Non riesco a leggere il calendario: ricarica la pagina.';
  });
})();
