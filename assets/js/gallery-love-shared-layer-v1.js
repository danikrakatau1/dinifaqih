(()=>{
  'use strict';
  if(window.DINI_GALLERY_LOVE_SHARED_LAYER_V1?.version)return;

  const VERSION='1.4.0';
  const doc=document;
  const GALLERY_TOP_ID='bc6eeaf';

  function galleryTop(){
    const exact=doc.querySelector('[data-id="'+GALLERY_TOP_ID+'"]');
    if(exact&&exact.querySelector('.elementor-widget-gallery'))return exact;

    const widget=doc.querySelector('.elementor-widget-gallery');
    return widget?.closest('.elementor-top-section,.elementor-section,.e-con')||null;
  }

  function loveContext(){
    const carousel=doc.querySelector('.elementor-widget-testimonial-carousel');
    if(!carousel)return null;

    let node=carousel;
    let fallback=carousel.closest('.elementor-top-section,.elementor-section,.e-con')||carousel.parentElement;

    for(let depth=0;node&&depth<16;depth++,node=node.parentElement){
      if(node.matches?.('.elementor-top-section,.elementor-section,.e-con'))fallback=node;

      const slideshow=node.querySelector?.('.elementor-background-slideshow');
      if(slideshow)return{section:node,slideshow,carousel};
    }

    return fallback?{
      section:fallback,
      slideshow:fallback.querySelector?.('.elementor-background-slideshow')||null,
      carousel
    }:null;
  }

  function bgFrom(el){
    if(!el)return null;

    let cs=null;
    try{cs=getComputedStyle(el)}catch{}
    if(!cs)return null;

    const image=String(cs.backgroundImage||'').trim();
    if(!image||image==='none')return null;

    return{
      image,
      size:String(cs.backgroundSize||'cover')||'cover',
      position:String(cs.backgroundPosition||'50% 50%')||'50% 50%',
      repeat:String(cs.backgroundRepeat||'no-repeat')||'no-repeat'
    };
  }

  function activeLoveBackground(ctx){
    if(!ctx?.section)return null;

    const root=ctx.slideshow||ctx.section;
    const selectors=[
      '.swiper-slide-active .elementor-background-slideshow__slide__image',
      '.swiper-slide-active [style*="background-image"]',
      '.elementor-background-slideshow__slide.swiper-slide-active .elementor-background-slideshow__slide__image',
      '.swiper-slide-active',
      '.elementor-background-slideshow__slide__image'
    ];

    for(const selector of selectors){
      for(const el of root.querySelectorAll?.(selector)||[]){
        const bg=bgFrom(el);
        if(bg)return bg;
      }
    }

    return bgFrom(ctx.section);
  }

  function ensureStyle(){
    if(doc.getElementById('diniGalleryLoveContinuationStyle'))return;

    const style=doc.createElement('style');
    style.id='diniGalleryLoveContinuationStyle';
    style.textContent=`
      [data-dini-gallery-love-proxy-host="1"]{
        position:relative!important;
        isolation:isolate!important;
      }

      [data-dini-gallery-love-proxy="1"]{
        position:absolute!important;
        inset:0!important;
        z-index:0!important;
        pointer-events:none!important;
        overflow:hidden!important;
        background-repeat:no-repeat!important;
        background-size:cover!important;
        background-position:center top!important;
      }

      [data-dini-gallery-love-gallery="1"]{
        position:relative!important;
        z-index:1!important;
        background-color:transparent!important;
        background-image:none!important;
      }

      [data-dini-gallery-love-gallery="1"] > .elementor-container,
      [data-dini-gallery-love-gallery="1"] .elementor-column,
      [data-dini-gallery-love-gallery="1"] .elementor-widget-wrap,
      [data-dini-gallery-love-gallery="1"] .elementor-widget-heading,
      [data-dini-gallery-love-gallery="1"] .elementor-widget-gallery,
      [data-dini-gallery-love-gallery="1"] .e-con,
      [data-dini-gallery-love-gallery="1"] .e-con-inner{
        background-color:transparent!important;
        background-image:none!important;
      }

      [data-dini-gallery-love-gallery="1"] .elementor-background-overlay{
        background-color:transparent!important;
        background-image:none!important;
      }
    `;

    (doc.head||doc.documentElement).appendChild(style);
  }

  function ensureProxy(gallery){
    let proxy=gallery.querySelector(':scope > [data-dini-gallery-love-proxy="1"]');
    if(proxy)return proxy;

    proxy=doc.createElement('div');
    proxy.setAttribute('data-dini-gallery-love-proxy','1');
    proxy.setAttribute('aria-hidden','true');

    gallery.insertBefore(proxy,gallery.firstChild);
    return proxy;
  }

  function clearGallerySurface(gallery){
    gallery.setAttribute('data-dini-gallery-love-proxy-host','1');
    gallery.setAttribute('data-dini-gallery-love-gallery','1');
    gallery.style.setProperty('background-color','transparent','important');
    gallery.style.setProperty('background-image','none','important');

    for(const el of gallery.querySelectorAll(
      '.elementor-container,.elementor-column,.elementor-widget-wrap,'+
      '.elementor-widget-heading,.elementor-widget-gallery,.e-con,.e-con-inner'
    )){
      if(el.matches('.e-gallery-image,.e-gallery-item'))continue;
      if(el.closest('.e-gallery-image,.e-gallery-item'))continue;

      el.style.setProperty('background-color','transparent','important');
      el.style.setProperty('background-image','none','important');
    }

    for(const overlay of gallery.querySelectorAll('.elementor-background-overlay')){
      if(overlay.closest('.e-gallery-image,.e-gallery-item'))continue;

      overlay.style.setProperty('background-color','transparent','important');
      overlay.style.setProperty('background-image','none','important');
    }
  }

  function setup(){
    const gallery=galleryTop();
    const love=loveContext();
    if(!gallery||!love?.section)return null;

    ensureStyle();
    clearGallerySurface(gallery);

    // IMPORTANT:
    // Love Story stays completely source-native.
    // No opacity/background/DOM changes are applied to Love Story.
    const proxy=ensureProxy(gallery);

    let lastImage='';

    const sync=()=>{
      const bg=activeLoveBackground(love);
      if(!bg||!bg.image||bg.image===lastImage)return false;

      lastImage=bg.image;

      proxy.style.setProperty('background-image',bg.image,'important');
      proxy.style.setProperty('background-size','cover','important');
      proxy.style.setProperty('background-position','center top','important');
      proxy.style.setProperty('background-repeat','no-repeat','important');

      doc.documentElement.setAttribute('data-dini-gallery-love-shared-layer',VERSION);
      doc.documentElement.setAttribute('data-dini-gallery-love-shared-active','1');
      doc.documentElement.setAttribute('data-dini-gallery-love-layer-scope','gallery-continuation-window');
      return true;
    };

    const mo=new MutationObserver(()=>requestAnimationFrame(sync));
    try{
      mo.observe(love.section,{
        subtree:true,
        childList:true,
        attributes:true,
        attributeFilter:['class','style','aria-hidden']
      });
    }catch{}

    [0,120,320,700,1200,2000,3200,5000,7500].forEach(ms=>setTimeout(sync,ms));

    window.addEventListener('pagehide',()=>{
      try{mo.disconnect()}catch{}
    },{once:true});

    sync();

    return{
      gallery,
      love:love.section,
      proxy,
      sync
    };
  }

  function boot(){
    const controller=setup();
    if(controller){
      window.DINI_GALLERY_LOVE_SHARED_LAYER_V1.controller=controller;
      return;
    }

    let n=0;
    const timer=setInterval(()=>{
      n++;
      const controller=setup();

      if(controller){
        window.DINI_GALLERY_LOVE_SHARED_LAYER_V1.controller=controller;
        clearInterval(timer);
      }else if(n>=40){
        clearInterval(timer);
      }
    },250);
  }

  window.DINI_GALLERY_LOVE_SHARED_LAYER_V1={
    version:VERSION,
    controller:null,
    setup
  };

  if(doc.readyState==='loading'){
    doc.addEventListener('DOMContentLoaded',boot,{once:true});
  }else{
    boot();
  }
})();