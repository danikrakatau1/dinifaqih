(()=>{
  'use strict';
  if(window.DINI_GALLERY_LOVE_SHARED_LAYER_V1?.version)return;

  const VERSION='1.5.0';
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

  function ensureStyle(){
    if(doc.getElementById('diniGalleryLoveNativeOverlapStyle'))return;

    const style=doc.createElement('style');
    style.id='diniGalleryLoveNativeOverlapStyle';
    style.textContent=`
      [data-dini-gallery-native-overlap="1"]{
        position:relative!important;
        z-index:2!important;
        background-color:transparent!important;
        background-image:none!important;
      }

      [data-dini-gallery-native-overlap="1"] > .elementor-container,
      [data-dini-gallery-native-overlap="1"] .elementor-column,
      [data-dini-gallery-native-overlap="1"] .elementor-widget-wrap,
      [data-dini-gallery-native-overlap="1"] .elementor-widget-heading,
      [data-dini-gallery-native-overlap="1"] .elementor-widget-gallery,
      [data-dini-gallery-native-overlap="1"] .e-con,
      [data-dini-gallery-native-overlap="1"] .e-con-inner{
        background-color:transparent!important;
        background-image:none!important;
      }

      [data-dini-gallery-native-overlap="1"] .elementor-background-overlay{
        background-color:transparent!important;
        background-image:none!important;
      }

      [data-dini-love-native-overlap="1"]{
        position:relative!important;
        z-index:1!important;
        box-sizing:border-box!important;
      }
    `;

    (doc.head||doc.documentElement).appendChild(style);
  }

  function clearGallerySurface(gallery){
    gallery.setAttribute('data-dini-gallery-native-overlap','1');
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

  function numberPx(value){
    const n=Number.parseFloat(String(value||'0'));
    return Number.isFinite(n)?n:0;
  }

  function setup(){
    const gallery=galleryTop();
    const love=loveContext();
    if(!gallery||!love?.section)return null;

    ensureStyle();
    clearGallerySurface(gallery);

    const section=love.section;
    section.setAttribute('data-dini-love-native-overlap','1');

    const initialStyle=getComputedStyle(section);
    const nativeMarginTop=numberPx(initialStyle.marginTop);
    const nativePaddingTop=numberPx(initialStyle.paddingTop);

    let appliedOverlap=0;
    let raf=0;

    const layout=()=>{
      cancelAnimationFrame(raf);
      raf=requestAnimationFrame(()=>{
        const g=gallery.getBoundingClientRect();
        const l=section.getBoundingClientRect();

        // Recover where Love Story would naturally start without the overlap
        // already applied, then align its native background box to Gallery top.
        const nativeLoveTop=l.top+appliedOverlap;
        const overlap=Math.max(0,Math.round(nativeLoveTop-g.top));

        section.style.setProperty(
          'margin-top',
          (nativeMarginTop-overlap)+'px',
          'important'
        );
        section.style.setProperty(
          'padding-top',
          (nativePaddingTop+overlap)+'px',
          'important'
        );

        appliedOverlap=overlap;

        doc.documentElement.setAttribute('data-dini-gallery-love-shared-layer',VERSION);
        doc.documentElement.setAttribute('data-dini-gallery-love-layer-mode','native-overlap');
        doc.documentElement.setAttribute('data-dini-gallery-love-overlap',String(overlap));
      });
    };

    const ro='ResizeObserver' in window?new ResizeObserver(layout):null;
    try{ro?.observe(gallery);ro?.observe(section)}catch{}

    window.addEventListener('resize',layout,{passive:true});
    window.addEventListener('orientationchange',layout,{passive:true});

    [0,100,260,600,1100,1800,2800].forEach(ms=>setTimeout(layout,ms));

    window.addEventListener('pagehide',()=>{
      cancelAnimationFrame(raf);
      try{ro?.disconnect()}catch{}
      window.removeEventListener('resize',layout);
      window.removeEventListener('orientationchange',layout);
    },{once:true});

    layout();

    return{
      gallery,
      love:section,
      slideshow:love.slideshow,
      layout
    };
  }

  function boot(){
    const controller=setup();
    if(controller){
      window.DINI_GALLERY_LOVE_SHARED_LAYER_V1.controller=controller;
      return;
    }

    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      const controller=setup();

      if(controller){
        window.DINI_GALLERY_LOVE_SHARED_LAYER_V1.controller=controller;
        clearInterval(timer);
      }else if(tries>=40){
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