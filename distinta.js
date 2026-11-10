// DISTINTA: legge calendario e rosa da index.html e compila il foglio del torneo per la partita scelta.
// I documenti della squadra stanno in assets/documenti.json solo cifrati (tools/cifra_documenti.mjs): si leggono
// con la parola d'ordine della squadra, che questo telefono ricorda dopo la prima volta. Le correzioni scritte
// a mano nel foglio restano solo in questo browser (localStorage) e valgono sopra quelle della squadra.
(function(){
  var RIGHE=17,DIRIGENTI=3,CHIAVE='distinta-documenti',CHIAVE_PAROLA='distinta-parola';
  var squadra={}; // documenti della squadra, una volta decifrati
  var cassaforteC=false,aperta=false; // c'è il file cifrato sul sito? è stato aperto?
  var sceltaDoc=document.getElementById('con-documenti');
  try{var dSalvato=localStorage.getItem('distinta-con-documenti');if(dSalvato)sceltaDoc.querySelector('input[value="'+dSalvato+'"]').checked=true}catch(e){}
  function conDocumenti(){return sceltaDoc.querySelector('input:checked').value==='si'}
  var scelta=document.getElementById('partita'),spunte=document.getElementById('spunte');
  var righe=document.getElementById('righe'),staff=document.getElementById('staff'),stato=document.getElementById('stato');
  var partite=[],rosa=[];

  var data=new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Europe/Rome'});
  var ora=new Intl.DateTimeFormat('it-IT',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Rome'});
  var breve=new Intl.DateTimeFormat('it-IT',{weekday:'short',day:'numeric',month:'short',timeZone:'Europe/Rome'});

  // --- documenti: solo in questo browser ---
  function documenti(){try{return JSON.parse(localStorage.getItem(CHIAVE))||{}}catch(e){return {}}}
  function salvaDocumento(chi,campo,valore){
    try{
      var d=documenti();d[chi]=d[chi]||{};d[chi][campo]=valore;
      localStorage.setItem(CHIAVE,JSON.stringify(d));
    }catch(e){stato.textContent='Questo browser non salva i documenti: compilali prima di stampare.'}
  }

  // --- dati da index.html ---
  function leggi(html){
    var doc=new DOMParser().parseFromString(html,'text/html');
    partite=[].map.call(doc.querySelectorAll('.match[data-inizio]'),function(r){
      var b=r.querySelector('b').cloneNode(true),ris=b.querySelector('.ris');
      if(ris)ris.textContent=' – ';
      var parti=b.textContent.split(/\s+[–-]\s+/);
      return {inizio:new Date(r.dataset.inizio),casa:(parti[0]||'').trim(),ospite:(parti[1]||'').trim(),giocata:r.dataset.gf!=null};
    });
    // "Reis Brito Filipe" → cognome "Reis Brito", nome "Filipe": il nome è l'ultima parola
    rosa=[].map.call(doc.querySelectorAll('.rosa .giocatore'),function(g){
      var anagrafe=(g.querySelector('.anagrafe')||{}).textContent||'',p=anagrafe.trim().split(/\s+/);
      var n=g.querySelector('.m-num'),r=g.querySelector('.ruolo-tag');
      return {soprannome:g.querySelector('h3').textContent.trim(),cognome:p.slice(0,-1).join(' '),nome:p.slice(-1)[0]||'',
        num:n?n.textContent.trim():'',allenatore:!!(r&&/allenatore/i.test(r.textContent)),assente:g.hasAttribute('data-assente')};
    });
  }

  function cella(testo,classe){var td=document.createElement('td');if(classe)td.className=classe;td.textContent=testo;return td}
  // campo del documento: scritto nel foglio, ricordato su questo telefono
  function campoDocumento(chi,campo,etichetta,predefinito){
    if(!conDocumenti())return cella(''); // distinta senza documenti: colonne vuote, da compilare a penna
    var td=document.createElement('td');td.className='doc';
    var i=document.createElement('input');
    i.value=(documenti()[chi]||{})[campo]||(squadra[chi]||{})[campo]||predefinito||'';
    i.setAttribute('aria-label',etichetta);i.autocomplete='off';i.spellcheck=false;
    i.addEventListener('input',function(){salvaDocumento(chi,campo,i.value.trim())});
    td.appendChild(i);return td;
  }
  function chiave(g){return g.cognome+' '+g.nome}

  function compila(){
    var p=partite[+scelta.value];
    if(!p)return;
    document.getElementById('casa').textContent=p.casa.toUpperCase();
    document.getElementById('ospite').textContent=p.ospite.toUpperCase();
    document.getElementById('data').textContent=data.format(p.inizio);
    document.getElementById('ora').textContent=ora.format(p.inizio);
    var convocati=[].filter.call(spunte.querySelectorAll('input'),function(c){return c.checked}).map(function(c){return rosa[+c.value]});
    convocati.sort(function(a,b){return (parseInt(a.num,10)||0)-(parseInt(b.num,10)||0)});
    righe.textContent='';
    for(var i=0;i<Math.max(RIGHE,convocati.length);i++){
      var g=convocati[i],tr=document.createElement('tr');
      if(g){
        tr.appendChild(cella(g.num,'num'));tr.appendChild(cella(g.cognome.toUpperCase()));tr.appendChild(cella(g.nome.toUpperCase()));
        tr.appendChild(campoDocumento(chiave(g),'tipo','Tipo di documento di '+g.soprannome,'C.I.'));
        tr.appendChild(campoDocumento(chiave(g),'numero','Numero di documento di '+g.soprannome));
        tr.appendChild(campoDocumento(chiave(g),'tessera','Tessera di '+g.soprannome));
      }else for(var k=0;k<6;k++)tr.appendChild(cella('',k?'':'num'));
      righe.appendChild(tr);
    }
    staff.textContent='';
    var mister=rosa.filter(function(g){return g.allenatore})[0];
    var ruoli=['ALLENATORE'];for(var d=1;d<=DIRIGENTI;d++)ruoli.push('DIRIGENTE '+d);
    ruoli.forEach(function(ruolo,j){
      var tr=document.createElement('tr'),th=document.createElement('th');th.scope='row';th.textContent=ruolo;tr.appendChild(th);
      var chi=j===0&&mister?mister:null;
      tr.appendChild(cella(chi?chi.cognome.toUpperCase():''));tr.appendChild(cella(chi?chi.nome.toUpperCase():''));
      if(chi){tr.appendChild(campoDocumento(chiave(chi),'tipo','Tipo di documento dell’allenatore','C.I.'));tr.appendChild(campoDocumento(chiave(chi),'numero','Numero di documento dell’allenatore'))}
      else{tr.appendChild(cella(''));tr.appendChild(cella(''))}
      staff.appendChild(tr);
    });
    stato.textContent=convocati.length>RIGHE?'Attenzione: più di '+RIGHE+' convocati, il foglio del torneo ha '+RIGHE+' righe.':'';
    document.title='Distinta '+p.casa+' – '+p.ospite+' · '+data.format(p.inizio);
  }

  // --- documenti della squadra: cifrati nel sito, si aprono con la parola d'ordine ---
  var cassaforte=fetch('assets/documenti.json',{cache:'no-cache'}).then(function(r){return r.ok?r.json():null}).catch(function(){return null});
  var boxChiuso=document.getElementById('sblocca'),boxAperto=document.getElementById('documenti-aperti');
  var campoParola=document.getElementById('parola');
  function daB64(t){return Uint8Array.from(atob(t),function(c){return c.charCodeAt(0)})}
  function apri(parola){
    if(!window.crypto||!crypto.subtle)return Promise.reject(new Error('crypto'));
    return cassaforte.then(function(c){
      if(!c)throw new Error('assente');
      return crypto.subtle.importKey('raw',new TextEncoder().encode(parola),'PBKDF2',false,['deriveKey']).then(function(base){
        return crypto.subtle.deriveKey({name:'PBKDF2',salt:daB64(c.sale),iterations:c.iterazioni,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['decrypt']);
      }).then(function(k){
        return crypto.subtle.decrypt({name:'AES-GCM',iv:daB64(c.iv)},k,daB64(c.dati));
      }).then(function(b){return JSON.parse(new TextDecoder().decode(b))});
    });
  }
  // cosa mostrare sopra il foglio: parola d'ordine, documenti caricati o documenti da scrivere sul telefono
  function aggiornaPannelli(){
    var si=conDocumenti();
    boxChiuso.hidden=!(si&&cassaforteC&&!aperta);
    boxAperto.hidden=!(si&&aperta);
    document.getElementById('documenti-locali').hidden=!(si&&!cassaforteC);
  }
  function mostraDocumenti(aperti){aperta=aperti;aggiornaPannelli()}
  function sblocca(parola,ricorda){
    stato.textContent='Apro i documenti…';
    return apri(parola).then(function(d){
      squadra=d;
      if(ricorda)try{localStorage.setItem(CHIAVE_PAROLA,parola)}catch(e){}
      mostraDocumenti(true);stato.textContent='';compila();
    },function(e){
      mostraDocumenti(false);
      stato.textContent=e&&e.message==='crypto'?'Questo browser non apre i documenti: compilali a mano.':'Parola d’ordine sbagliata.';
    });
  }
  document.getElementById('sblocca').addEventListener('submit',function(e){
    e.preventDefault();
    if(campoParola.value.trim())sblocca(campoParola.value.trim(),true);
  });
  document.getElementById('blocca').addEventListener('click',function(){
    try{localStorage.removeItem(CHIAVE_PAROLA);localStorage.removeItem(CHIAVE)}catch(e){}
    squadra={};campoParola.value='';mostraDocumenti(false);compila();
    stato.textContent='Documenti tolti da questo telefono.';
  });

  document.getElementById('stampa').addEventListener('click',function(){window.print()});
  scelta.addEventListener('change',compila);
  sceltaDoc.addEventListener('change',function(){
    try{localStorage.setItem('distinta-con-documenti',sceltaDoc.querySelector('input:checked').value)}catch(e){}
    aggiornaPannelli();compila();
  });
  spunte.addEventListener('change',compila);

  fetch('index.html',{cache:'no-cache'}).then(function(r){return r.text()}).then(function(html){
    leggi(html);
    // partite da giocare (e quella di oggi), la prossima selezionata
    var adesso=new Date(),oggi=adesso.toDateString(),prima=-1;
    partite.forEach(function(p,i){
      if(p.giocata&&p.inizio.toDateString()!==oggi)return;
      var o=document.createElement('option');o.value=i;o.textContent=breve.format(p.inizio)+' · '+p.casa+' – '+p.ospite;
      scelta.appendChild(o);
      if(prima<0&&(p.inizio>adesso||p.inizio.toDateString()===oggi))prima=i;
    });
    if(prima>=0)scelta.value=prima;
    rosa.forEach(function(g,i){
      if(g.allenatore)return;
      var l=document.createElement('label'),c=document.createElement('input');
      c.type='checkbox';c.value=i;c.checked=!g.assente;
      l.appendChild(c);l.appendChild(document.createTextNode(' '+g.soprannome));
      spunte.appendChild(l);
    });
    compila();
    return cassaforte.then(function(c){
      // senza documenti della squadra sul sito si scrivono nel foglio e restano su questo telefono
      cassaforteC=!!c;
      if(!c){aggiornaPannelli();return}
      var ricordata=null;
      try{ricordata=localStorage.getItem(CHIAVE_PAROLA)}catch(e){}
      if(ricordata)sblocca(ricordata,false);else mostraDocumenti(false);
    });
  }).catch(function(){stato.textContent='Non riesco a leggere il calendario: ricarica la pagina.'});
})();
