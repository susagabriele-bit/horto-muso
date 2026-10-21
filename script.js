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
