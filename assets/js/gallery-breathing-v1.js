(()=>{
  'use strict';
  if(window.DINI_GALLERY_BREATHING_V1?.version)return;

  const VERSION='1.1.0';
  const doc=document;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
  const SELECTOR='.elementor-widget-gallery .e-gallery-image';

  function ensureStyle(){
    if(doc.getElementById('diniGalleryBreathingStyle'))return;
    const style=doc.createElement('style');
    style.id='diniGalleryBreathingStyle';
    style.textContent=`
      ${SELECTOR}[data-dini-gallery-breathe="1"]{
        position:relative!important;
        overflow:hidden!important;
        isolation:isolate;
      }

      ${SELECTOR}[data-dini-gallery-breathe="1"] > .dini-gallery-breathe-layer{
        position:absolute;
        inset:-1px;
        z-index:0;
        display:block;
        pointer-events:none;
        background-repeat:no-repeat;
        transform-origin:center center;
        transform:translate3d(0,0,0) scale(1);
        backface-visibility:hidden;
        -webkit-backface-visibility:hidden;
        will-change:transform;
        animation:
          diniGalleryBreathingLayer
          var(--dini-gallery-breathe-duration,6.4s)
          cubic-bezier(.45,0,.55,1)
          var(--dini-gallery-breathe-delay,0s)
          infinite
          both;
      }

      ${SELECTOR}[data-dini-gallery-breathe="1"] > :not(.dini-gallery-breathe-layer){
        position:relative;
        z-index:1;
      }

      @keyframes diniGalleryBreathingLayer{
        0%,100%{transform:translate3d(0,0,0) scale(1)}
        50%{transform:translate3d(0,0,0) scale(1.022)}
      }

      @media (prefers-reduced-motion:reduce){
        ${SELECTOR}[data-dini-gallery-breathe="1"] > .dini-gallery-breathe-layer{
          animation:none!important;
          transform:none!important;
          will-change:auto!important;
        }
      }
    `;
    (doc.head||doc.documentElement).appendChild(style);
  }

  const delays=[0,-1.15,-2.3,-3.45,-.55,-1.7,-2.85,-4,-1.05,-2.2,-3.35,-.25];
  const durations=[6.2,6.7,6.35,6.8,6.45,6.95,6.25,6.6,6.4,6.85,6.3,6.75];

  function readBackground(image){
    let cs=null;
    try{cs=getComputedStyle(image)}catch{}
    const inline=String(image.style?.backgroundImage||'').trim();
    const computed=String(cs?.backgroundImage||'').trim();
    const backgroundImage=inline&&inline!=='none'?inline:computed;
    if(!backgroundImage||backgroundImage==='none')return null;
    return{
      backgroundImage,
      backgroundSize:String(cs?.backgroundSize||'cover')||'cover',
      backgroundPosition:String(cs?.backgroundPosition||'50% 50%')||'50% 50%',
      backgroundRepeat:String(cs?.backgroundRepeat||'no-repeat')||'no-repeat'
    };
  }

  function attach(image,index){
    if(!image?.isConnected)return false;
    if(image.getAttribute('data-dini-gallery-breathe')==='1')return true;
    if(!image.classList.contains('e-gallery-image-loaded'))return false;
    if(!image.classList.contains('dini-gallery-compositor-released'))return false;

    const bg=readBackground(image);
    if(!bg)return false;

    ensureStyle();

    const layer=doc.createElement('span');
    layer.className='dini-gallery-breathe-layer';
    layer.setAttribute('aria-hidden','true');
    layer.style.backgroundImage=bg.backgroundImage;
    layer.style.backgroundSize=bg.backgroundSize;
    layer.style.backgroundPosition=bg.backgroundPosition;
    layer.style.backgroundRepeat=bg.backgroundRepeat;

    image.style.setProperty('--dini-gallery-breathe-delay',String(delays[index%delays.length])+'s');
    image.style.setProperty('--dini-gallery-breathe-duration',String(durations[index%durations.length])+'s');
    image.insertBefore(layer,image.firstChild);
    image.setAttribute('data-dini-gallery-breathe','1');
    return true;
  }

  function apply(){
    const images=[...doc.querySelectorAll(SELECTOR)];
    if(!images.length)return{total:0,attached:0};
    let attached=0;
    images.forEach((image,index)=>{if(attach(image,index))attached++});
    doc.documentElement.setAttribute('data-dini-gallery-breathing',VERSION);
    doc.documentElement.setAttribute('data-dini-gallery-breathing-count',String(attached));
    return{total:images.length,attached};
  }

  function boot(){
    if(reduced){
      apply();
      return;
    }

    let settled=false;
    let timer=0;
    const finish=()=>{
      if(settled)return;
      settled=true;
      clearTimeout(timer);
      try{observer.disconnect()}catch{}
      apply();
    };
    const run=()=>{
      if(settled)return;
      const state=apply();
      if(state.total>0&&state.attached>=state.total)finish();
    };

    const observer=new MutationObserver(run);
    try{
      observer.observe(doc.documentElement,{
        subtree:true,
        childList:true,
        attributes:true,
        attributeFilter:['class','style','data-dini-gallery-bg-loaded']
      });
    }catch{}

    [80,240,550,1000,1700,2600,3800,5200,7000].forEach(ms=>setTimeout(run,ms));
    timer=setTimeout(finish,9000);
    run();
  }

  window.DINI_GALLERY_BREATHING_V1={
    version:VERSION,
    apply
  };

  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
