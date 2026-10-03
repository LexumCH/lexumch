(function(){
  try{localStorage.removeItem('lexum-anteprima-tema');}catch(e){}
  function adatta(){
    var t=document.querySelector('.telefono');if(!t)return;
    if(window.innerWidth<=500){t.style.zoom='';return;}
    var s=Math.min(1,(window.innerHeight-40)/844);t.style.zoom=s<1?String(s):'';
  }
  window.addEventListener('resize',adatta);adatta();
})();
