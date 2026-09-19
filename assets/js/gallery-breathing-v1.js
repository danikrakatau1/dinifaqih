(()=>{
  'use strict';
  if(window.DINI_GALLERY_BREATHING_V1?.version)return;

  const VERSION='1.3.0';
  const doc=document;
  const SELECTOR='.elementor-widget-gallery .e-gallery-image';
  const WIDGET_SELECTOR='.elementor-widget-gallery';
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
  const timers=new WeakMap();
  const watchedWidgets=new WeakSet();

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
        0%,100%{transform:translate3d(0,0,0) scale(1)}
        50%{transform:translate3d(0,0,0) scale(1.038)}
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

    const runtime=String(image.getAttribute('data-dini-gallery-bg-runtime')||'').trim();
    const inline=String(image.style?.backgroundImage||'').trim();
    const css=String(computed?.backgroundImage||'').trim();

    let backgroundImage='';
    if(inline&&inline!=='none')backgroundImage=inline;
    else if(css&&css!=='none')backgroundImage=css;
    else if(runtime)backgroundImage='url("'+runtime.replaceAll('"','%22')+'")';

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

    image.insertBefore(layer,image.firstChild);
    image.setAttribute('data-dini-gallery-breathe','1');
    image.style.setProperty('background-image','none','important');
    return true;
  }

  function imageReady(image){
    return image.classList.contains('e-gallery-image-loaded')&&(
      image.classList.contains('dini-gallery-compositor-released')||
      image.getAttribute('data-dini-gallery-bg-loaded')==='1'||
      !!image.getAttribute('data-dini-gallery-bg-runtime')||
      !!String(image.style?.backgroundImage||'').replace(/^none$/i,'')
    );
  }

  function schedule(image,index,onChange){
    if(!image?.isConnected)return;
    if(image.getAttribute('data-dini-gallery-breathe')==='1')return;
    if(timers.has(image)||!imageReady(image))return;

    const timer=setTimeout(()=>{
      timers.delete(image);
      activate(image,index);
      onChange?.();
    },760);

    timers.set(image,timer);
  }

  function widgetState(widget){
    const images=[...widget.querySelectorAll('.e-gallery-image')];
    const active=images.filter(x=>x.getAttribute('data-dini-gallery-breathe')==='1').length;
    return{images,active,total:images.length};
  }

  function updateDocumentState(){
    const all=[...doc.querySelectorAll(SELECTOR)];
    const active=all.filter(x=>x.getAttribute('data-dini-gallery-breathe')==='1').length;
    doc.documentElement.setAttribute('data-dini-gallery-breathing',VERSION);
    doc.documentElement.setAttribute('data-dini-gallery-breathing-count',String(active));
    doc.documentElement.setAttribute('data-dini-gallery-breathing-total',String(all.length));
  }

  function watchWidget(widget){
    if(!widget?.isConnected||watchedWidgets.has(widget))return;
    watchedWidgets.add(widget);

    let observer=null;
    let settleTimer=0;
    let hardTimer=0;

    const cleanup=()=>{
      clearTimeout(settleTimer);
      clearTimeout(hardTimer);
      try{observer?.disconnect()}catch{}
      observer=null;
    };

    const scan=()=>{
      if(!widget.isConnected)return cleanup();

      const state=widgetState(widget);
      state.images.forEach((image,index)=>schedule(image,index,scan));
      updateDocumentState();

      const latest=widgetState(widget);
      if(latest.total>0&&latest.active>=latest.total){
        clearTimeout(settleTimer);
        settleTimer=setTimeout(cleanup,1200);
      }
    };

    observer=new MutationObserver(scan);
    observer.observe(widget,{
      subtree:true,
      childList:true,
      attributes:true,
      attributeFilter:['class','style','data-dini-gallery-bg-loaded','data-dini-gallery-bg-runtime']
    });

    // This watcher starts only when the Gallery itself approaches the viewport,
    // so lazy-loaded photos 2..N are still observed even if the user reaches the
    // Gallery long after page load.
    [0,120,320,650,1050,1600,2400,3400,4800,6500,8500,11000,14000].forEach(ms=>setTimeout(scan,ms));
    hardTimer=setTimeout(()=>{
      scan();
      cleanup();
    },18000);

    scan();
  }

  function boot(){
    ensureStyle();
    updateDocumentState();

    if(reduced){
      doc.documentElement.setAttribute('data-dini-gallery-breathing',VERSION+'-reduced');
      return;
    }

    const widgets=[...doc.querySelectorAll(WIDGET_SELECTOR)];
    if(!widgets.length)return;

    if('IntersectionObserver' in window){
      const io=new IntersectionObserver(entries=>{
        for(const entry of entries){
          if(!entry.isIntersecting)continue;
          io.unobserve(entry.target);
          watchWidget(entry.target);
        }
      },{
        root:null,
        rootMargin:'1200px 0px',
        threshold:0.01
      });

      widgets.forEach(widget=>io.observe(widget));
      window.addEventListener('pagehide',()=>io.disconnect(),{once:true});
    }else{
      widgets.forEach(watchWidget);
    }
  }

  window.DINI_GALLERY_BREATHING_V1={
    version:VERSION,
    watchWidget,
    activate
  };

  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
