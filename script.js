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
  // il riquadro "Partite" del menu mostra subito la prossima partita
  function segnaRiquadro(r,quando){
    var d=document.querySelector('[data-prossima]');
    if(d)d.textContent=quando+': '+r.querySelector('b').textContent.trim()+', '+r.querySelector('time').textContent.trim();
  }
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
      prossimaTrovata=true;segnaRiquadro(r,stato.textContent);
    }else if(!prossimaTrovata){
      stato.textContent='Prossima';
      prossimaTrovata=true;segnaRiquadro(r,'Prossima');
    }
  });
  var b=document.querySelector('.bilancio');
  if(b&&g){
    b.textContent='Giocate '+g+' · vinte '+v+' · pari '+n+' · perse '+p+' · gol fatti '+gf+', subiti '+gs;
    b.hidden=false;
  }
  var nota=document.querySelector('[data-bilancio]');
  if(nota&&g)nota.textContent=v+(v===1?' vinta':' vinte')+' · '+n+' pari · '+p+(p===1?' persa':' perse');
})();

// CLASSIFICA: il riquadro del menu dice a che posto siamo
(function(){
  var noi=document.querySelector('.classifica .noi');
  if(!noi)return;
  var pos=noi.cells[0].textContent.trim(),pt=noi.querySelector('.pt').textContent.trim();
  var d=document.querySelector('[data-posizione]'),g=document.querySelector('[data-posizione-grande]');
  if(d)d.textContent=pos+'° posto nel girone B · '+pt+(pt==='1'?' punto':' punti');
  if(g)g.textContent=pos+'°';
})();

// MARCATORI: somma i gol dalle righe "Gol: CiccioGamer 6, Tarallo 3" del calendario e fa la classifica della squadra
(function(){
  var lista=document.querySelector('[data-marcatori]');
  if(!lista)return;
  // numero di maglia dalla rosa, per soprannome
  var maglie={};
  document.querySelectorAll('.rosa .giocatore').forEach(function(g){
    var n=g.querySelector('.m-num');maglie[g.querySelector('h3').textContent.trim().toLowerCase()]=n?n.textContent.trim():'';
  });
  var gol={},nomi={},partite={};
  document.querySelectorAll('.match[data-gf] .marcatori').forEach(function(m){
    m.textContent.replace(/^\s*Gol:\s*/i,'').split(/,\s*/).forEach(function(x){
      var t=x.trim().match(/^(.*?)(?:\s+(\d+))?$/);
      if(!t||!t[1])return;
      var k=t[1].toLowerCase();
      nomi[k]=nomi[k]||t[1];gol[k]=(gol[k]||0)+(t[2]?+t[2]:1);partite[k]=(partite[k]||0)+1;
    });
  });
  var chi=Object.keys(gol).sort(function(a,b){return gol[b]-gol[a]||nomi[a].localeCompare(nomi[b],'it')});
  if(!chi.length){lista.outerHTML='<p class="lead">Ancora nessun gol in calendario.</p>';return}
  var max=gol[chi[0]],pos=0;
  chi.forEach(function(k,i){
    if(i===0||gol[k]<gol[chi[i-1]])pos=i+1; // a pari gol, stessa posizione
    var li=document.createElement('li'),num=maglie[k]!=null?maglie[k]:'';
    li.innerHTML='<span class="b-pos"></span>'+
      '<svg viewBox="0 0 200 290" aria-hidden="true"><use href="#maglia-retro"/><text class="m-num" x="100" y="170"></text></svg>'+
      '<span class="b-nome"><span class="b-partite"></span></span>'+
      '<span class="b-gol"><small>gol</small></span>'+
      '<span class="b-barra" aria-hidden="true"></span>';
    li.querySelector('.b-pos').textContent=pos;
    li.querySelector('text').textContent=num;
    li.querySelector('.b-nome').insertBefore(document.createTextNode(nomi[k]),li.querySelector('.b-partite'));
    li.querySelector('.b-partite').textContent='a segno in '+partite[k]+(partite[k]===1?' partita':' partite');
    li.querySelector('.b-gol').insertBefore(document.createTextNode(gol[k]),li.querySelector('.b-gol small'));
    li.querySelector('.b-barra').style.setProperty('--quota',Math.max(4,gol[k]/max*100)+'%');
    lista.appendChild(li);
  });
  // il riquadro del menu: capocannoniere (o i capocannonieri a pari merito)
  var primi=chi.filter(function(k){return gol[k]===max}).map(function(k){return nomi[k]});
  var d=document.querySelector('[data-capocannoniere]'),g=document.querySelector('[data-gol-grande]');
  if(d)d.textContent=(primi.length>2?primi.length+' a pari merito':primi.join(' e '))+' · '+max+' gol';
  if(g)g.textContent=max;
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
  document.querySelectorAll('.riquadri li').forEach(function(m,i){m.style.setProperty('--ritardo',i*90+'ms')});

  var foto=document.querySelectorAll('.carosello-finestra');
  foto.forEach(function(f){
    var tende=document.createElement('div');
    tende.className='tende';tende.setAttribute('aria-hidden','true');
    for(var i=0;i<10;i++){var b=document.createElement('i');b.style.setProperty('--i',i);tende.appendChild(b)}
    f.appendChild(tende);
  });

  var oss=new IntersectionObserver(function(voci){
    voci.forEach(function(v){
      if(v.isIntersecting){v.target.classList.add('visto');oss.unobserve(v.target)}
    });
  },{rootMargin:'0px 0px -12% 0px',threshold:.12});
  document.querySelectorAll('main h2, main .lead, .riquadri li, .tabella-scorre, .kit figure, .kit p, .giocatore, .bilancio, .match').forEach(function(el){
    el.classList.add('reveal');oss.observe(el);
  });
  foto.forEach(function(f){oss.observe(f)});
})();

// CAROSELLO FOTO: si scorre col dito, con frecce e pallini; va avanti da solo finché nessuno lo tocca
(function(){
  var car=document.querySelector('.carosello');
  if(!car)return;
  var binario=car.querySelector('.carosello-binario');
  var slide=binario.children,n=slide.length;
  var punti=car.querySelector('.car-punti'),pausa=car.querySelector('.car-pausa');
  var prec=car.querySelector('.car-prec'),succ=car.querySelector('.car-succ');
  var ridotto=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var timer=null,fermo=ridotto,visibile=false,sopra=false,attuale=0;

  function indice(){return Math.round(binario.scrollLeft/binario.clientWidth)}
  function vai(i){
    i=(i+n)%n;
    binario.scrollTo({left:i*binario.clientWidth,behavior:ridotto?'auto':'smooth'});
  }
  var bottoni=[];
  for(var i=0;i<n;i++){
    var b=document.createElement('button');
    b.type='button';b.setAttribute('aria-label','Foto '+(i+1)+' di '+n);
    b.addEventListener('click',(function(k){return function(){tocco();vai(k)}})(i));
    punti.appendChild(b);bottoni.push(b);
  }
  function segna(){
    var k=attuale=indice();
    bottoni.forEach(function(b,j){b.setAttribute('aria-current',j===k?'true':'false')});
  }
  var rinfresco=false;
  binario.addEventListener('scroll',function(){
    if(!rinfresco){rinfresco=true;requestAnimationFrame(function(){rinfresco=false;segna()})}
  },{passive:true});

  function ferma(){clearInterval(timer);timer=null}
  function avvia(){
    ferma();
    if(!fermo&&visibile&&!sopra&&!document.hidden)timer=setInterval(function(){vai(indice()+1)},5000);
  }
  function etichetta(){pausa.textContent=fermo?'Avvia':'Pausa'}
  // chi tocca il carosello prende il comando: lo scorrimento automatico si spegne
  function tocco(){if(!fermo){fermo=true;etichetta();ferma()}}

  prec.addEventListener('click',function(){tocco();vai(indice()-1)});
  succ.addEventListener('click',function(){tocco();vai(indice()+1)});
  pausa.addEventListener('click',function(){fermo=!fermo;etichetta();if(!fermo)vai(indice()+1);avvia()});
  binario.addEventListener('pointerdown',tocco);
  binario.addEventListener('wheel',function(e){if(Math.abs(e.deltaX)>Math.abs(e.deltaY))tocco()},{passive:true});
  binario.addEventListener('keydown',tocco);
  car.addEventListener('mouseenter',function(){sopra=true;ferma()});
  car.addEventListener('mouseleave',function(){sopra=false;avvia()});
  car.addEventListener('focusin',function(){sopra=true;ferma()});
  car.addEventListener('focusout',function(e){if(!car.contains(e.relatedTarget)){sopra=false;avvia()}});
  document.addEventListener('visibilitychange',avvia);
  if('IntersectionObserver' in window){
    new IntersectionObserver(function(v){visibile=v[0].isIntersecting;avvia()},{threshold:.5}).observe(car);
  }else{visibile=true}
  // se cambia la larghezza (telefono girato) resta sulla stessa foto
  addEventListener('resize',function(){binario.scrollLeft=attuale*binario.clientWidth});

  [prec,succ,car.querySelector('.carosello-comandi')].forEach(function(el){el.hidden=false});
  etichetta();segna();avvia();
})();

// BARRA: nascosta durante l'intro, poi segna la sezione in cui ti trovi
(function(){
  var barra=document.querySelector('.barra'),hero=document.querySelector('.hero');
  if(!barra||!hero||!('IntersectionObserver' in window))return;
  barra.classList.add('nascosta');
  // la spia copre l'intro: finché se ne vede un pezzo la barra resta nascosta
  var spia=document.createElement('div');
  spia.setAttribute('aria-hidden','true');
  spia.style.cssText='position:absolute;left:0;width:1px;top:0;bottom:calc(100svh - 1px);pointer-events:none';
  hero.style.position='relative';hero.appendChild(spia);
  new IntersectionObserver(function(v){
    barra.classList.toggle('nascosta',v[0].isIntersecting);
  }).observe(spia);
  var link={};
  barra.querySelectorAll('a[href^="#"]:not(.barra-logo)').forEach(function(a){link[a.hash.slice(1)]=a});
  var attive={};
  var osservaSezioni=new IntersectionObserver(function(voci){
    voci.forEach(function(v){attive[v.target.id]=v.isIntersecting});
    var scelta=null;
    ['partite','classifica','rosa','foto'].forEach(function(id){if(attive[id]&&!scelta)scelta=id});
    Object.keys(link).forEach(function(id){link[id].setAttribute('aria-current',id===scelta?'true':'false')});
  },{rootMargin:'-45% 0px -50% 0px'});
  Object.keys(link).forEach(function(id){var s=document.getElementById(id);if(s)osservaSezioni.observe(s)});
})();

// ARRIVO DA UN LINK CON #sezione (es. "Torna al sito" dalle storie): salta lì subito, senza ripassare dal cavallo.
// RICARICANDO invece si riparte sempre dal cavallo: il browser non torna dov'eri e il #sezione non resta nell'indirizzo.
// Col tasto indietro (dalle storie, dalla distinta) il browser riporta invece dove eri, come sempre.
(function(){
  var ripristino='scrollRestoration' in history;
  // il ritorno automatico al punto di prima si spegne solo per questo caricamento e si riaccende a pagina caricata,
  // così il tasto indietro continua a riportare dove eri
  function senzaRitorno(){
    if(!ripristino)return;
    history.scrollRestoration='manual';
    addEventListener('load',function(){setTimeout(function(){history.scrollRestoration='auto'},300)});
  }
  function pulisci(){if(location.hash&&history.replaceState)history.replaceState(null,'',location.pathname+location.search)}
  var nav=performance.getEntriesByType?performance.getEntriesByType('navigation')[0]:null;
  if(nav&&nav.type==='reload'){senzaRitorno();pulisci();scrollTo(0,0);return}
  var id=decodeURIComponent(location.hash.slice(1));
  var meta=id&&document.getElementById(id);
  pulisci();
  if(!meta||meta.id==='top')return;
  senzaRitorno();
  function vai(){meta.scrollIntoView({behavior:'instant',block:'start'})}
  vai();
  // dopo che foto e font hanno finito di caricare la pagina può essersi allungata: riallinea,
  // ma solo se nel frattempo non hai già iniziato a scorrere tu
  var mosso=false;
  ['wheel','touchstart','keydown'].forEach(function(t){addEventListener(t,function(){mosso=true},{once:true,passive:true})});
  addEventListener('load',function(){if(!mosso)vai()});
})();
