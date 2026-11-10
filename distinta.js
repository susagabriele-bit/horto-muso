// DISTINTA: legge calendario e rosa da index.html e compila il foglio del torneo per la partita scelta.
// I numeri dei documenti NON sono nel sito: si scrivono nel foglio e restano solo in questo browser (localStorage).
(function(){
  var RIGHE=17,DIRIGENTI=3,CHIAVE='distinta-documenti';
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
        num:n?n.textContent.trim():'',allenatore:!!(r&&/allenatore/i.test(r.textContent))};
    });
  }

  function cella(testo,classe){var td=document.createElement('td');if(classe)td.className=classe;td.textContent=testo;return td}
  // campo del documento: scritto nel foglio, ricordato su questo telefono
  function campoDocumento(chi,campo,etichetta,predefinito){
    var td=document.createElement('td');td.className='doc';
    var i=document.createElement('input');
    i.value=(documenti()[chi]||{})[campo]||predefinito||'';
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

  document.getElementById('stampa').addEventListener('click',function(){window.print()});
  document.getElementById('cancella').addEventListener('click',function(){
    if(!confirm('Cancellare i numeri dei documenti salvati su questo telefono?'))return;
    try{localStorage.removeItem(CHIAVE)}catch(e){}
    compila();stato.textContent='Documenti cancellati da questo telefono.';
  });
  scelta.addEventListener('change',compila);
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
      c.type='checkbox';c.value=i;c.checked=true;
      l.appendChild(c);l.appendChild(document.createTextNode(' '+g.soprannome));
      spunte.appendChild(l);
    });
    compila();
  }).catch(function(){stato.textContent='Non riesco a leggere il calendario: ricarica la pagina.'});
})();
