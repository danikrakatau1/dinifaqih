(()=>{
  'use strict';
  if(window.DINI_GALLERY_TRANSPARENT_V1?.version)return;

  const VERSION='7.0.0';
  const doc=document;
  const GALLERY_SECTION_ID='9687b1a';

  function gallerySection(){
    const exact=doc.querySelector('[data-id="'+GALLERY_SECTION_ID+'"]');
    if(exact&&exact.querySelector('.elementor-widget-gallery'))return exact;
    const widget=doc.querySelector('.elementor-widget-gallery');
    return widget?.closest('.elementor-inner-section,.elementor-section,.e-con')||widget?.parentElement||null;
  }

  function loveContext(){
    const carousel=doc.querySelector('.elementor-widget-testimonial-carousel');
    if(!carousel)return null;

    let node=carousel;
    let fallback=carousel.closest('.elementor-section,.elementor-top-section,.e-con')||carousel.parentElement;

    for(let depth=0;node&&depth<16;depth++,node=node.parentElement){
      if(node.matches?.('.elementor-section,.elementor-top-section,.e-con'))fallback=node;
      const slideshow=node.querySelector?.('.elementor-background-slideshow');
      if(slideshow){
        return{section:node,slideshow,carousel};
      }
    }

    return null;
  }

  function commonAncestor(a,b){
    if(!a||!b)return null;
    const seen=new Set();
    for(let n=a;n;n=n.parentElement)seen.add(n);
    for(let n=b;n;n=n.parentElement)if(seen.has(n))return n;
    return null;
  }

  function ensureStyle(){
    if(doc.getElementById('diniGalleryLoveLayerExtensionStyle'))return;

    const style=doc.createElement('style');
    style.id='diniGalleryLoveLayerExtensionStyle';
    style.textContent=`
      [data-dini-gallery-layer-transparent="1"],
      [data-dini-gallery-layer-transparent="1"] > .elementor-container,
      [data-dini-gallery-layer-transparent="1"] > .e-con-inner,
      [data-dini-gallery-layer-transparent="1"] .elementor-column,
      [data-dini-gallery-layer-transparent="1"] .elementor-widget-wrap,
      [data-dini-gallery-layer-transparent="1"] .elementor-widget-heading,
      [data-dini-gallery-layer-transparent="1"] .elementor-widget-gallery,
      [data-dini-gallery-layer-transparent="1"] .e-con,
      [data-dini-gallery-layer-transparent="1"] .e-con-inner,
      [data-dini-gallery-layer-path="1"]{
        background-color:transparent!important;
      }

      [data-dini-gallery-layer-transparent="1"] .elementor-background-overlay{
        background-color:transparent!important;
      }

      [data-dini-gallery-layer-transparent="1"]{
        position:relative!important;
        z-index:2!important;
      }

      [data-dini-love-layer-host="1"]{
        position:relative!important;
        overflow:visible!important;
        z-index:1!important;
      }

      [data-dini-love-layer-path="1"]{
        overflow:visible!important;
      }

      [data-dini-love-layer-extended="1"]{
        pointer-events:none!important;
        z-index:0!important;
        overflow:hidden!important;
      }
    `;

    (doc.head||doc.documentElement).appendChild(style);
  }

  function clearGalleryPath(gallery,common){
    gallery.setAttribute('data-dini-gallery-layer-transparent','1');
    gallery.style.setProperty('background-color','transparent','important');

    for(const el of gallery.querySelectorAll(
      '.elementor-container,.elementor-column,.elementor-widget-wrap,'+
      '.elementor-widget-heading,.elementor-widget-gallery,.e-con,.e-con-inner'
    )){
      if(el.matches('.e-gallery-image,.e-gallery-item'))continue;
      if(el.closest('.e-gallery-image,.e-gallery-item'))continue;
      el.style.setProperty('background-color','transparent','important');
    }

    for(const overlay of gallery.querySelectorAll('.elementor-background-overlay')){
      overlay.style.setProperty('background-color','transparent','important');
    }

    let node=gallery.parentElement;
    let depth=0;
    while(node&&node!==common&&depth<14){
      node.setAttribute('data-dini-gallery-layer-path','1');
      node.style.setProperty('background-color','transparent','important');
      node=node.parentElement;
      depth++;
    }
    return depth;
  }

  function exposeLoveLayer(love,common){
    love.setAttribute('data-dini-love-layer-host','1');
    love.style.setProperty('overflow','visible','important');

    let node=love.parentElement;
    let depth=0;
    while(node&&node!==common&&depth<14){
      node.setAttribute('data-dini-love-layer-path','1');
      node.style.setProperty('overflow','visible','important');
      node=node.parentElement;
      depth++;
    }
    return depth;
  }

  function extendLayer(gallery,love,slideshow){
    if(!gallery||!love||!slideshow)return false;

    const g=gallery.getBoundingClientRect();
    const l=love.getBoundingClientRect();
    if(!g.height||!l.height)return false;

    // Distance from the Love Story section's top edge back to the Gallery's
    // top edge. The ORIGINAL slideshow is extended upward by this amount.
    const extend=Math.max(0,Math.round(l.top-g.top));
    if(extend<20)return false;

    slideshow.setAttribute('data-dini-love-layer-extended','1');
    slideshow.style.setProperty('top',(-extend)+'px','important');
    slideshow.style.setProperty('height','calc(100% + '+extend+'px)','important');
    slideshow.style.setProperty('min-height','calc(100% + '+extend+'px)','important');

    doc.documentElement.setAttribute('data-dini-gallery-love-layer-extend',String(extend));
    return true;
  }

  function apply(){
    const gallery=gallerySection();
    const ctx=loveContext();
    if(!gallery||!ctx?.section||!ctx?.slideshow)return false;

    const love=ctx.section;
    const slideshow=ctx.slideshow;
    const common=commonAncestor(gallery,love);
    if(!common)return false;

    ensureStyle();
    const galleryDepth=clearGalleryPath(gallery,common);
    const loveDepth=exposeLoveLayer(love,common);

    const sync=()=>{
      const ok=extendLayer(gallery,love,slideshow);
      if(ok){
        doc.documentElement.setAttribute('data-dini-gallery-transparent',VERSION);
        doc.documentElement.setAttribute('data-dini-gallery-love-layer-active','1');
        doc.documentElement.setAttribute('data-dini-gallery-path-depth',String(galleryDepth));
        doc.documentElement.setAttribute('data-dini-love-path-depth',String(loveDepth));
      }
      return ok;
    };

    sync();

    let raf=0;
    const onResize=()=>{
      cancelAnimationFrame(raf);
      raf=requestAnimationFrame(sync);
    };
    window.addEventListener('resize',onResize,{passive:true});
    window.addEventListener('orientationchange',onResize,{passive:true});

    const ro='ResizeObserver' in window?new ResizeObserver(onResize):null;
    try{ro?.observe(gallery);ro?.observe(love)}catch{}

    window.addEventListener('pagehide',()=>{
      window.removeEventListener('resize',onResize);
      window.removeEventListener('orientationchange',onResize);
      try{ro?.disconnect()}catch{}
    },{once:true});

    return true;
  }

  function boot(){
    if(apply())return;

    let attempts=0;
    const timer=setInterval(()=>{
      attempts++;
      if(apply()||attempts>=48)clearInterval(timer);
    },250);
  }

  window.DINI_GALLERY_TRANSPARENT_V1={
    version:VERSION,
    apply
  };

  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
