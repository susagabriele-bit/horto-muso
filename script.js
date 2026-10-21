// HERO: le strisce dello scudo si chiudono mentre scorri
(function(){
  var hero=document.querySelector('.hero');
  var ridotto=matchMedia('(prefers-reduced-motion: reduce)');
  var tick=false;
  function update(){
    tick=false;
    if(ridotto.matches)return;
    var span=hero.offsetHeight-window.innerHeight;
    var p=span>0?Math.min(1,Math.max(0,-hero.getBoundingClientRect().top/span)):1;
    hero.style.setProperty('--p',p.toFixed(3));
  }
  function onScroll(){if(!tick){tick=true;requestAnimationFrame(update)}}
  // se l'utente attiva "riduci movimento" a pagina aperta, lascia decidere al CSS
  ridotto.addEventListener('change',function(){
    if(ridotto.matches)hero.style.removeProperty('--p');else update();
  });
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('resize',onScroll);
  update();
})();

// MAGLIE: i nomi lunghi vengono stretti per stare tra le spalle
(function(){
  var MAX=84;
  function fit(){
    document.querySelectorAll('.m-nome').forEach(function(t){
      t.removeAttribute('textLength');
      if(t.getComputedTextLength()>MAX){
        t.setAttribute('textLength',MAX);
        t.setAttribute('lengthAdjust','spacingAndGlyphs');
      }
    });
  }
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);else fit();
})();

// CALENDARIO: segna la prossima partita, quella di oggi e i risultati che mancano
(function(){
  var righe=document.querySelectorAll('.match[data-inizio]');
  var ora=new Date(),prossimaTrovata=false;
  var g=0,v=0,n=0,p=0,gf=0,gs=0;
  righe.forEach(function(r){
    var stato=r.querySelector('.stato');
    if(r.dataset.gf!=null){
      var f=+r.dataset.gf,s=+r.dataset.gs;
      g++;gf+=f;gs+=s;if(f>s)v++;else if(f===s)n++;else p++;
      r.classList.add('giocata');
      if(stato){stato.className='stato esito'+(f<s?' persa':'');stato.textContent=f>s?'Vinta':f===s?'Pari':'Persa'}
      return;
    }
    var inizio=new Date(r.dataset.inizio);
    var fine=new Date(inizio.getTime()+90*60000);
    if(ora>fine){
      stato.className='todo';
      stato.textContent='Risultato da inserire';
    }else if(inizio.toDateString()===ora.toDateString()){
      stato.classList.add('oggi');
      stato.textContent=inizio.getHours()>=18?'Stasera':'Oggi';
      prossimaTrovata=true;
    }else if(!prossimaTrovata){
      stato.textContent='Prossima';
      prossimaTrovata=true;
    }
  });
  var b=document.querySelector('.bilancio');
  if(b&&g){
    b.textContent='Giocate '+g+' · vinte '+v+' · pari '+n+' · perse '+p+' · gol fatti '+gf+', subiti '+gs;
    b.hidden=false;
  }
})();

// COMPARSE: maglie, partite e foto entrano in scena quando arrivano sullo schermo
(function(){
  if(!('IntersectionObserver' in window))return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  document.documentElement.classList.add('anim');

  // le maglie arrivano dal lato della colonna in cui stanno, quelle centrali dal basso
  var griglia=document.querySelector('.rosa');
  var schede=griglia?griglia.querySelectorAll('.giocatore'):[];
  var colonne=griglia?getComputedStyle(griglia).gridTemplateColumns.split(' ').length:1;
  schede.forEach(function(c,i){
    var col=i%colonne,meta=(colonne-1)/2;
    if(colonne>1&&col!==meta){
      var sx=col<meta;
      c.style.setProperty('--da-x',sx?'-70px':'70px');
      c.style.setProperty('--da-y','10px');
      c.style.setProperty('--giro',sx?'-5deg':'5deg');
    }
    c.style.setProperty('--ritardo',col*90+'ms');
  });
  document.querySelectorAll('.match').forEach(function(m,i){m.style.setProperty('--ritardo',i*70+'ms')});

  var foto=document.querySelector('.foto');
  if(foto){
    var tende=document.createElement('div');
    tende.className='tende';tende.setAttribute('aria-hidden','true');
    for(var i=0;i<10;i++){var b=document.createElement('i');b.style.setProperty('--i',i);tende.appendChild(b)}
    foto.appendChild(tende);
  }

  var oss=new IntersectionObserver(function(voci){
    voci.forEach(function(v){
      if(v.isIntersecting){v.target.classList.add('visto');oss.unobserve(v.target)}
    });
  },{rootMargin:'0px 0px -12% 0px',threshold:.12});
  document.querySelectorAll('main h2, main .lead, .kit figure, .kit p, .giocatore, .bilancio, .match').forEach(function(el){
    el.classList.add('reveal');oss.observe(el);
  });
  if(foto)oss.observe(foto);
})();
