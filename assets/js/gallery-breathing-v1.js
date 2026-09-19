(()=>{
  'use strict';
  if(window.DINI_GALLERY_BREATHING_V1?.version)return;

  const VERSION='1.2.0';
  const doc=document;
  const SELECTOR='.elementor-widget-gallery .e-gallery-image';
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
  const timers=new WeakMap();

  function ensureStyle(){
    if(doc.getElementById('diniGalleryBreathingStyle'))return;

    const style=doc.createElement('style');
    style.id='diniGalleryBreathingStyle';
    style.textContent=`
      ${SELECTOR}[data-dini-gallery-breathe="1"]{
        position:relative!important;
        overflow:hidden!important;
        isolation:isolate!important;
        background-image:none!important;
      }

      ${SELECTOR}[data-dini-gallery-breathe="1"] > .dini-gallery-breathe-layer{
        position:absolute;
        inset:-2px;
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
          var(--dini-gallery-breathe-duration,5.8s)
          cubic-bezier(.45,0,.55,1)
          0s
          infinite
          both;
      }

      ${SELECTOR}[data-dini-gallery-breathe="1"] > :not(.dini-gallery-breathe-layer){
        position:relative;
        z-index:1;
      }

      @keyframes diniGalleryBreathingLayer{
        0%,100%{
          transform:translate3d(0,0,0) scale(1);
        }
        50%{
          transform:translate3d(0,0,0) scale(1.038);
        }
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

  const durations=[5.6,6.0,5.8,6.2,5.7,6.1,5.9,6.3,5.75,6.05,5.85,6.15];

  function renderedBackground(image){
    let computed=null;
    try{computed=getComputedStyle(image)}catch{}

    const inline=String(image.style?.backgroundImage||'').trim();
    const css=String(computed?.backgroundImage||'').trim();
    const backgroundImage=(inline&&inline!=='none')?inline:css;

    if(!backgroundImage||backgroundImage==='none')return null;

    return{
      image:backgroundImage,
      size:String(computed?.backgroundSize||'cover')||'cover',
      position:String(computed?.backgroundPosition||'50% 50%')||'50% 50%',
      repeat:String(computed?.backgroundRepeat||'no-repeat')||'no-repeat'
    };
  }

  function activate(image,index){
    if(!image?.isConnected)return false;
    if(image.getAttribute('data-dini-gallery-breathe')==='1')return true;

    const bg=renderedBackground(image);
    if(!bg)return false;

    ensureStyle();

    const layer=doc.createElement('span');
    layer.className='dini-gallery-breathe-layer';
    layer.setAttribute('aria-hidden','true');
    layer.style.backgroundImage=bg.image;
    layer.style.backgroundSize=bg.size;
    layer.style.backgroundPosition=bg.position;
    layer.style.backgroundRepeat=bg.repeat;

    image.style.setProperty('--dini-gallery-breathe-duration',String(durations[index%durations.length])+'s');

    // Put the animated copy in place first, then remove the static parent
    // background in the same frame. This avoids a visible blank/flash.
    image.insertBefore(layer,image.firstChild);
    image.setAttribute('data-dini-gallery-breathe','1');
    image.style.setProperty('background-image','none','important');

    return true;
  }

  function schedule(image,index){
    if(!image?.isConnected)return;
    if(image.getAttribute('data-dini-gallery-breathe')==='1')return;
    if(timers.has(image))return;

    // Breathing starts only after the source-native reveal has substantially
    // finished, preserving the existing one-by-one gallery choreography.
    const ready=
      image.classList.contains('e-gallery-image-loaded')||
      image.getAttribute('data-dini-gallery-bg-loaded')==='1';

    if(!ready)return;

    const timer=setTimeout(()=>{
      timers.delete(image);
      activate(image,index);
      updateState();
    },900);

    timers.set(image,timer);
  }

  function updateState(){
    const images=[...doc.querySelectorAll(SELECTOR)];
    const active=images.filter(x=>x.getAttribute('data-dini-gallery-breathe')==='1').length;
    doc.documentElement.setAttribute('data-dini-gallery-breathing',VERSION);
    doc.documentElement.setAttribute('data-dini-gallery-breathing-count',String(active));
    return{total:images.length,active};
  }

  function scan(){
    const images=[...doc.querySelectorAll(SELECTOR)];
    images.forEach((image,index)=>schedule(image,index));
    return updateState();
  }

  function boot(){
    ensureStyle();

    if(reduced){
      // Respect accessibility preference: keep gallery visually unchanged.
      doc.documentElement.setAttribute('data-dini-gallery-breathing',VERSION+'-reduced');
      return;
    }

    const observer=new MutationObserver(scan);
    try{
      observer.observe(doc.documentElement,{
        subtree:true,
        childList:true,
        attributes:true,
        attributeFilter:['class','style','data-dini-gallery-bg-loaded']
      });
    }catch{}

    [0,120,300,600,1000,1500,2200,3200,4500,6000,8000].forEach(ms=>setTimeout(scan,ms));
    setTimeout(()=>{
      scan();
      observer.disconnect();
    },11000);
  }

  window.DINI_GALLERY_BREATHING_V1={
    version:VERSION,
    scan,
    activate
  };

  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
