// AGGIORNAMENTO AUTOMATICO: l'app salvata sulla schermata Home di iPhone non ha il tasto ricarica
// e quando la riapri ti rimostra la pagina vecchia. Ogni volta che torna in primo piano
// chiede al server la versione pubblicata (<meta name="versione">) e, se è cambiata, ricarica.
(function(){
  var meta=document.querySelector('meta[name="versione"]');
  if(!meta||!window.fetch)return;
  var mia=meta.content,ultimo=0;
  function controlla(){
    if(document.hidden)return;
    var ora=Date.now();
    if(ora-ultimo<30000)return; // al massimo una volta ogni 30 secondi
    ultimo=ora;
    fetch(location.pathname+'?controllo='+ora,{cache:'no-store'}).then(function(r){return r.ok?r.text():''}).then(function(html){
      var m=html.match(/<meta name="versione" content="([^"]+)"/);
      if(!m||m[1]===mia)return;
      // protezione: se dopo un ricaricamento la versione è ancora vecchia, non insistere all'infinito
      try{if(sessionStorage.getItem('versione-tentata')===m[1])return;sessionStorage.setItem('versione-tentata',m[1])}catch(e){}
      location.reload();
    }).catch(function(){});
  }
  document.addEventListener('visibilitychange',controlla);
  addEventListener('pageshow',function(e){if(e.persisted)controlla()});
  addEventListener('focus',controlla);
  controlla();
})();
