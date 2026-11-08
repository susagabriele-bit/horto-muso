// STORIE INSTAGRAM: legge il calendario da index.html e disegna la storia (1080×1920) su un canvas.
// Prima della partita: matchday. A partita giocata (data-gf/data-gs presenti): risultato e marcatori.
(function(){
  var W=1080,H=1920;
  var VERDE='#028947',ERBA='#1fcf6a',BIANCO='#f7f5ef',GRIGIO='#a9b3ad';
  var TITOLO='"Big Shoulders Display",Impact,"Arial Narrow",sans-serif';
  var TESTO='Barlow,system-ui,sans-serif';
  var NOI='Horto Muso';

  var tela=document.getElementById('tela'),ctx=tela.getContext('2d');
  var scelta=document.getElementById('partita');
  var bottoneCondividi=document.getElementById('condividi');
  var linkScarica=document.getElementById('scarica');
  var stato=document.getElementById('stato');
  var logo=new Image();logo.src='assets/logo.png';
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
        marcatori:m?m.textContent.replace(/^\s*Gol:\s*/i,'').trim():''
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
  function stemma(cx,y,lato){
    if(logo.complete&&logo.naturalWidth){
      ctx.save();ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=40;
      ctx.drawImage(logo,cx-lato/2,y,lato,lato);ctx.restore();
    }
  }
  function nomeSquadra(nome,y,dim){
    var nostra=nome.toLowerCase()===NOI.toLowerCase();
    scritta(nome.toUpperCase(),W/2,y,'900 {} '+TITOLO,dim,nostra?ERBA:BIANCO,940,2);
  }

  function matchday(p){
    sfondo();
    ctx.textAlign='center';ctx.textBaseline='alphabetic';
    scritta('MAZZOLA CUP · GIRONE B',W/2,300,'600 {} '+TESTO,40,BIANCO,940,8);
    scritta('MATCHDAY',W/2,470,'900 {} '+TITOLO,190,BIANCO,980,6);
    stemma(W/2,510,440);
    nomeSquadra(p.casa,1080,130);
    // VS nel cerchio verde
    ctx.fillStyle=VERDE;ctx.beginPath();ctx.arc(W/2,1160,62,0,Math.PI*2);ctx.fill();
    ctx.textBaseline='middle';scritta('VS',W/2,1166,'900 {} '+TITOLO,64,BIANCO);ctx.textBaseline='alphabetic';
    nomeSquadra(p.ospiti,1340,130);
    // fascia a strisce, come sotto i titoli del sito
    for(var i=0;i<6;i++){ctx.fillStyle=VERDE;ctx.fillRect(W/2-275+i*100,1400,50,12)}
    scritta(giorno.format(p.inizio).toUpperCase(),W/2,1510,'700 {} '+TITOLO,84,BIANCO,960,3);
    scritta('ORE '+ora.format(p.inizio),W/2,1600,'900 {} '+TITOLO,84,ERBA,960,3);
    scritta('Campo Mazzola · Beinasco',W/2,1665,'600 {} '+TESTO,40,GRIGIO,940,1);
  }

  function risultato(p){
    sfondo();
    ctx.textAlign='center';ctx.textBaseline='alphabetic';
    var esito=p.gf>p.gs?'VITTORIA':p.gf<p.gs?'SCONFITTA':'PAREGGIO';
    scritta('MAZZOLA CUP · '+breve.format(p.inizio).toUpperCase(),W/2,300,'600 {} '+TESTO,40,BIANCO,940,8);
    scritta(esito,W/2,470,'900 {} '+TITOLO,190,p.gf>p.gs?ERBA:BIANCO,980,6);
    stemma(W/2,510,340);
    nomeSquadra(p.casa,990,110);
    scritta((p.punteggio||'').replace(/\s*[–-]\s*/,' – '),W/2,1250,'900 {} '+TITOLO,290,BIANCO,960,4);
    nomeSquadra(p.ospiti,1370,110);
    if(p.marcatori){
      for(var i=0;i<6;i++){ctx.fillStyle=VERDE;ctx.fillRect(W/2-275+i*100,1420,50,12)}
      scritta('GOL',W/2,1505,'900 {} '+TITOLO,54,ERBA,940,6);
      var dim=46,righe;
      do{ctx.font='600 '+dim+'px '+TESTO;righe=aCapo(p.marcatori.replace(/,\s*/g,' · '),900);dim-=2}while(righe.length>3&&dim>28);
      ctx.fillStyle=BIANCO;
      righe.forEach(function(r,k){ctx.fillText(r,W/2,1570+k*(dim+16))});
    }
  }

  function storiaClassifica(){
    sfondo();
    ctx.textAlign='center';ctx.textBaseline='alphabetic';
    scritta('MAZZOLA CUP · GIRONE B',W/2,300,'600 {} '+TESTO,40,BIANCO,940,8);
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

  function disegna(){
    if(scelta.value==='classifica'){
      storiaClassifica();
      nomeFile='horto-muso-classifica.png';
      var n=classifica.filter(function(s){return s.noi})[0];
      tela.setAttribute('aria-label','Storia della classifica del girone B'+(n?': Horto Muso '+n.pos+'° con '+n.pt+' punti':''));
      prepara();return;
    }
    var p=partite[+scelta.value];
    if(!p)return;
    var giocata=p.gf!=null;
    if(giocata)risultato(p);else matchday(p);
    var data=p.inizio.toISOString().slice(0,10);
    nomeFile='horto-muso-'+(giocata?'risultato':'matchday')+'-'+data+'.png';
    tela.setAttribute('aria-label',giocata
      ?'Storia del risultato: '+p.casa+' '+p.punteggio+' '+p.ospiti+(p.marcatori?'. Gol: '+p.marcatori:'')
      :'Storia del matchday: '+p.casa+' contro '+p.ospiti+', '+giorno.format(p.inizio)+' alle '+ora.format(p.inizio)+', campo Mazzola di Beinasco');
    prepara();
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
    document.fonts.load('600 40px Barlow')
  ]).catch(function(){}):Promise.resolve();
  var stemmaPronto=logo.decode?logo.decode().catch(function(){}):Promise.resolve();

  fetch('index.html',{cache:'no-cache'}).then(function(r){return r.text()}).then(function(html){
    partite=leggi(html);
    classifica=leggiClassifica(html);
    partite.forEach(function(p,i){
      var o=document.createElement('option');
      o.value=i;
      o.textContent=breve.format(p.inizio)+' · '+(p.gf!=null?p.casa+' '+p.punteggio+' '+p.ospiti:p.casa+' – '+p.ospiti+' (matchday)');
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
