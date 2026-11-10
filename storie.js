// STORIE INSTAGRAM: legge calendario, rosa e classifica da index.html e disegna la storia (1080×1920) su un canvas.
// Prima della partita: Gran Premio e I Partenti (convocati). A partita giocata (data-gf/data-gs presenti):
// Fotofinish con risultato e marcatori, e il Cavallo di razza della serata. Più la classifica.
// Ogni storia ha la sua scena in stile manifesto (assets/scene/): per il Gran Premio quella della partita
// (data-scena sulla riga del calendario) o quella di riserva, per il Fotofinish quella della partita
// (data-scena-fotofinish) o quella pronta per l'esito. Gran Premio, Fotofinish e classifica si possono fare anche
// nello stile classico, le strisce dello scudo senza scena (che restano anche se una scena non si carica).
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
  var boxPartenti=document.getElementById('scelta-partenti'),spunte=document.getElementById('spunte');
  var boxCavallo=document.getElementById('scelta-cavallo'),sceltaGiocatore=document.getElementById('giocatore');
  var boxStile=document.getElementById('scelta-stile');
  // stile ricordato su questo telefono (solo una comodità: se il browser non salva, si riparte da Manifesto)
  try{var salvato=localStorage.getItem('storie-stile');if(salvato)boxStile.querySelector('input[value="'+salvato+'"]').checked=true}catch(e){}
  function classico(){return boxStile.querySelector('input:checked').value==='classico'}
  var bottoneCondividi=document.getElementById('condividi');
  var linkScarica=document.getElementById('scarica');
  var stato=document.getElementById('stato');
  var logo=new Image();logo.src='assets/logo.png';
  var torneo=new Image();torneo.src='assets/mazzola.png';
  var partite=[],classifica=[],rosa=[],aggiornata='',immagine=null,urlImmagine=null,nomeFile='horto-muso-storia.png';

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

  // la rosa: soprannome, numero di maglia e ruolo di ogni scheda .giocatore
  function leggiRosa(html){
    var doc=new DOMParser().parseFromString(html,'text/html');
    return [].map.call(doc.querySelectorAll('.rosa .giocatore'),function(g){
      var n=g.querySelector('.m-num'),r=g.querySelector('.ruolo-tag');
      return {nome:g.querySelector('h3').textContent.trim(),num:n?n.textContent.trim():'',ruolo:r?r.textContent.trim():''};
    });
  }

  // storia proposta all'apertura: la partita di oggi, se no il risultato degli ultimi due giorni, se no la prossima
  function predefinita(){
    if(/[?&]storia=classifica\b/.test(location.search)&&classifica.length)return 'classifica';
    var adesso=new Date(),oggi=adesso.toDateString();
    function tipo(i){return (partite[i].gf!=null?'fotofinish:':'granpremio:')+i}
    for(var i=0;i<partite.length;i++)if(partite[i].inizio.toDateString()===oggi)return tipo(i);
    var ultimaGiocata=-1;
    partite.forEach(function(p,i){if(p.gf!=null)ultimaGiocata=i});
    if(ultimaGiocata>=0&&adesso-partite[ultimaGiocata].inizio<2*864e5)return tipo(ultimaGiocata);
    for(var j=0;j<partite.length;j++)if(partite[j].gf==null&&partite[j].inizio>adesso)return tipo(j);
    return tipo(ultimaGiocata>=0?ultimaGiocata:0);
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
  // scena rimpicciolita: la fascia [da,a] della scena (dove sta il disegno, in pixel della scena 1080×1920)
  // finisce tra le righe y0 e y1 della storia, centrata; intorno il colore del fondo della scena
  function scenaRiquadro(img,da,a,y0,y1){
    ctx.drawImage(img,0,0,W,H);
    var f=ctx.getImageData(W/2,120,1,1).data;
    ctx.fillStyle='rgb('+f[0]+','+f[1]+','+f[2]+')';ctx.fillRect(0,0,W,H);
    var k=(y1-y0)/(a-da),w=Math.round(W*k),h=Math.round(H*k);
    // i bordi della scena sfumano nel fondo, così non si vede il riquadro della carta
    var t=document.createElement('canvas');t.width=w;t.height=h;
    var c=t.getContext('2d');c.drawImage(img,0,0,w,h);
    c.globalCompositeOperation='destination-in';
    [[w,0],[0,h]].forEach(function(d){
      var g=c.createLinearGradient(0,0,d[0],d[1]);
      g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.14,'#000');g.addColorStop(.86,'#000');g.addColorStop(1,'rgba(0,0,0,0)');
      c.fillStyle=g;c.fillRect(0,0,w,h);
    });
    ctx.drawImage(t,(W-w)/2,y0-da*k);
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
  var SCENA={
    granpremio:'assets/scene/gran-premio.webp',classifica:'assets/scene/classifica.webp',
    partenti:'assets/scene/partenti.webp',cavallo:'assets/scene/cavallo-di-razza.webp'
  };
  function sceneDi(tipo,p){
    if(tipo==='granpremio')return [p.scena,SCENA.granpremio];
    // Fotofinish: scena della partita, se no quella pronta per l'esito
    if(tipo==='fotofinish')return [p.scenaFotofinish,'assets/scene/fotofinish-'+esitoDi(p).toLowerCase()+'.webp'];
    return [SCENA[tipo]];
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
    scritta('MATCHDAY',W/2,470,'900 {} '+TITOLO,190,BIANCO,980,6);
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
    intestazione('MAZZOLA CUP · '+breve.format(p.inizio).toUpperCase());
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

  function avversario(p){return p.casa.toLowerCase()===NOI.toLowerCase()?p.ospiti:p.casa}

  function classificaManifesto(img){
    scenaRiquadro(img,350,1043,340,700);
    ctx.textAlign='center';ctx.textBaseline='alphabetic';
    intestazione('MAZZOLA CUP · GIRONE B',LASTRA);
    titoloManifesto('Classifica',800);
    var x0=70,x1=W-70,top=860,h=Math.min(78,760/Math.max(classifica.length,1));
    ctx.textBaseline='middle';
    ctx.textAlign='right';
    stampa('G',x1-150,top+16,LASTRA,28,GRIGIO,'#000',0,2);
    stampa('PT',x1-20,top+16,LASTRA,28,GRIGIO,'#000',0,2);
    top+=40;
    classifica.forEach(function(s,i){
      var y=top+i*h,cy=y+h/2;
      if(s.noi){ctx.fillStyle=VERDE;ctx.fillRect(x0-20,y+4,x1-x0+40,h-8)}
      else{ctx.fillStyle='rgba(247,245,239,.18)';ctx.fillRect(x0,y,x1-x0,2)}
      ctx.textAlign='left';
      stampa(s.pos,x0+4,cy+2,LASTRA,44,s.noi?BIANCO:ARANCIO,'#000',0,2);
      stampa(s.nome.toUpperCase(),x0+80,cy+2,LASTRA,44,BIANCO,s.noi?'#000':VERDE,620,3);
      ctx.textAlign='right';
      stampa(s.g,x1-150,cy+2,LASTRA,40,s.noi?BIANCO:GRIGIO,'#000',0,2);
      stampa(s.pt,x1-20,cy+2,LASTRA,48,s.noi?BIANCO:ERBA,'#000',0,3);
    });
    ctx.textAlign='center';ctx.textBaseline='alphabetic';
    if(aggiornata)stampa('Aggiornata a '+aggiornata,W/2,Math.min(top+classifica.length*h+56,1700),CORSIVO,40,GRIGIO,'#000',940,2);
    grana();
  }

  function partenti(p,img,nomi){
    scenaRiquadro(img,360,1023,330,760);
    ctx.textAlign='center';ctx.textBaseline='alphabetic';
    intestazione('MAZZOLA CUP · '+breve.format(p.inizio).toUpperCase(),LASTRA);
    titoloManifesto('I Partenti',860);
    stampa('contro',W/2,935,CORSIVO,50,ARANCIO,'#000',600,3);
    stampa(avversario(p).toUpperCase(),W/2,1010,LASTRA,70,BIANCO,VERDE,940);
    fascia(1040);
    // i convocati in due colonne: numero di maglia nel riquadro verde, poi il soprannome
    var giocatori=rosa.filter(function(g){return nomi.indexOf(g.nome)>=0}),righe=Math.ceil(giocatori.length/2);
    var passo=righe>1?Math.min(76,470/(righe-1)):0;
    giocatori.forEach(function(g,i){
      var col=i<righe?0:1,riga=col?i-righe:i,x=col?570:70,y=1120+riga*passo;
      ctx.fillStyle=VERDE;ctx.fillRect(x,y-44,74,56);
      ctx.textAlign='center';stampa(g.num,x+37,y,LASTRA,40,BIANCO,'#000',70,2);
      ctx.textAlign='left';stampa(g.nome.toUpperCase(),x+92,y,LASTRA,44,BIANCO,'#000',360,3);
    });
    ctx.textAlign='center';
    // allenatore e data subito sotto l'elenco, anche quando i convocati sono pochi
    var y=Math.min(1120+Math.max(righe-1,0)*passo+100,1650);
    var mister=rosa.filter(function(g){return /allenatore/i.test(g.ruolo)})[0];
    if(mister){stampa('ALLENATORE · '+mister.nome.toUpperCase(),W/2,y,LASTRA,40,ERBA,'#000',940,2);y+=58}
    stampa(giorno.format(p.inizio).toUpperCase()+' · ORE '+ora.format(p.inizio),W/2,y,LASTRA,40,BIANCO,'#000',960,2);
    grana();
  }

  // gol segnati da un giocatore nella partita, letti dai marcatori ("CiccioGamer 3, Tarallo 2")
  function golDi(p,nome){
    var n=0;
    (p.marcatori||'').split(/,\s*/).forEach(function(x){
      var m=x.trim().match(/^(.*?)(?:\s+(\d+))?$/);
      if(m&&m[1].toLowerCase()===nome.toLowerCase())n+=m[2]?+m[2]:1;
    });
    return n;
  }
  function capocannoniere(p){
    var meglio=null,max=0;
    rosa.forEach(function(g){var n=golDi(p,g.nome);if(n>max){max=n;meglio=g.nome}});
    return meglio;
  }

  function cavalloDiRazza(p,img,nome){
    var g=rosa.filter(function(x){return x.nome===nome})[0]||{nome:nome,num:''};
    scenaRiquadro(img,351,1235,570,1170);
    ctx.textAlign='center';ctx.textBaseline='alphabetic';
    intestazione('MAZZOLA CUP · '+breve.format(p.inizio).toUpperCase(),LASTRA);
    titoloManifesto('Cavallo di razza',450);
    stampa('della serata',W/2,540,CORSIVO,60,ARANCIO,'#000',600,3);
    stampa(g.nome.toUpperCase(),W/2,1290,LASTRA,120,ERBA,'#000',960,6);
    var n=golDi(p,g.nome),dettagli=[];
    if(g.num!=='')dettagli.push('NUMERO '+g.num);
    if(n)dettagli.push(n+' GOL');
    if(dettagli.length)stampa(dettagli.join(' · '),W/2,1370,LASTRA,50,BIANCO,'#000',940,3);
    fascia(1410);
    stampa(p.casa.toUpperCase()+'  '+(p.punteggio||'').replace(/\s*[–-]\s*/,'–')+'  '+p.ospiti.toUpperCase(),W/2,1500,LASTRA,54,BIANCO,VERDE,960,3);
    grana();
  }

  // controlli in più: i convocati per I Partenti, il giocatore per il Cavallo di razza
  function mostraControlli(tipo,p){
    boxPartenti.hidden=tipo!=='partenti';
    boxCavallo.hidden=tipo!=='cavallo';
    boxStile.hidden=!(tipo==='granpremio'||tipo==='fotofinish'||tipo==='classifica');
    if(tipo==='cavallo'&&p&&sceltaGiocatore.dataset.partita!==String(partite.indexOf(p))){
      sceltaGiocatore.dataset.partita=partite.indexOf(p);
      sceltaGiocatore.value=capocannoniere(p)||sceltaGiocatore.options[0].value;
    }
  }
  function convocati(){
    return [].filter.call(spunte.querySelectorAll('input'),function(c){return c.checked}).map(function(c){return c.value});
  }

  var giri=0;
  function disegna(){
    var parti=scelta.value.split(':'),tipo=parti[0],p=partite[+parti[1]];
    if(tipo!=='classifica'&&!p)return;
    mostraControlli(tipo,p);
    var turno=++giri;
    immagine=null;
    var conScena=!(classico()&&!boxStile.hidden);
    primaScena(conScena?sceneDi(tipo,p).filter(Boolean):[]).then(function(img){
      if(turno!==giri)return; // nel frattempo è stata scelta un'altra storia
      var data=p?p.inizio.toISOString().slice(0,10):'',etichetta;
      if(tipo==='classifica'){
        if(img)classificaManifesto(img);else storiaClassifica();
        var n=classifica.filter(function(s){return s.noi})[0];
        etichetta='Storia della classifica del girone B'+(n?': Horto Muso '+n.pos+'° con '+n.pt+' punti':'');
        nomeFile='horto-muso-classifica.png';
      }else if(tipo==='partenti'){
        var nomi=convocati();
        if(img)partenti(p,img,nomi);else granPremio(p,null);
        etichetta='Storia dei partenti contro '+avversario(p)+': '+nomi.join(', ');
        nomeFile='horto-muso-partenti-'+data+'.png';
      }else if(tipo==='cavallo'){
        if(img)cavalloDiRazza(p,img,sceltaGiocatore.value);else fotofinish(p,null);
        etichetta='Storia del cavallo di razza della serata: '+sceltaGiocatore.value+', '+p.casa+' '+p.punteggio+' '+p.ospiti;
        nomeFile='horto-muso-cavallo-di-razza-'+data+'.png';
      }else if(tipo==='fotofinish'){
        fotofinish(p,img);
        etichetta='Storia del fotofinish: '+p.casa+' '+p.punteggio+' '+p.ospiti+(p.marcatori?'. Gol: '+p.marcatori:'');
        nomeFile='horto-muso-'+(img?'fotofinish':'risultato')+'-'+data+'.png';
      }else{
        granPremio(p,img);
        etichetta='Storia del Gran Premio: '+p.casa+' contro '+p.ospiti+', '+giorno.format(p.inizio)+' alle '+ora.format(p.inizio)+', campo Mazzola di Beinasco';
        nomeFile='horto-muso-'+(img?'gran-premio':'matchday')+'-'+data+'.png';
      }
      tela.setAttribute('aria-label',etichetta);
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
  spunte.addEventListener('change',disegna);
  sceltaGiocatore.addEventListener('change',disegna);
  boxStile.addEventListener('change',function(){
    try{localStorage.setItem('storie-stile',boxStile.querySelector('input:checked').value)}catch(e){}
    disegna();
  });

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
    rosa=leggiRosa(html);
    // l'elenco delle storie, diviso per tipo
    function gruppo(etichetta,voci){
      var nome=etichetta.split(' · ')[0];
      if(!voci.length)return;
      var g=document.createElement('optgroup');g.label=etichetta;
      voci.forEach(function(v){var o=document.createElement('option');o.value=v[0];o.textContent=nome+' · '+v[1];g.appendChild(o)});
      scelta.appendChild(g);
    }
    function voci(tipo,giocate){
      return partite.map(function(p,i){return [p,i]}).filter(function(x){return (x[0].gf!=null)===giocate}).map(function(x){
        var p=x[0];
        return [tipo+':'+x[1],breve.format(p.inizio)+' · '+(giocate?p.casa+' '+p.punteggio+' '+p.ospiti:p.casa+' – '+p.ospiti)];
      });
    }
    gruppo('Gran Premio · prima della partita',voci('granpremio',false));
    gruppo('I Partenti · i convocati',voci('partenti',false));
    gruppo('Fotofinish · il risultato',voci('fotofinish',true).reverse());
    gruppo('Cavallo di razza · il migliore in campo',voci('cavallo',true).reverse());
    if(classifica.length)gruppo('Classifica',[['classifica','Girone B'+(aggiornata?' · '+aggiornata:'')]]);
    // convocati: tutta la rosa tranne l'allenatore, spuntati; il giocatore del Cavallo di razza
    rosa.forEach(function(g){
      if(/allenatore/i.test(g.ruolo))return;
      var l=document.createElement('label'),c=document.createElement('input');
      c.type='checkbox';c.value=g.nome;c.checked=true;
      l.appendChild(c);l.appendChild(document.createTextNode(' '+g.nome));
      spunte.appendChild(l);
      var o=document.createElement('option');o.value=g.nome;o.textContent=g.nome+(g.num!==''?' · '+g.num:'');
      sceltaGiocatore.appendChild(o);
    });
    scelta.value=predefinita();
    return Promise.all([fonts,stemmaPronto]);
  }).then(disegna).catch(function(){
    stato.textContent='Non riesco a leggere il calendario: ricarica la pagina.';
  });
})();
