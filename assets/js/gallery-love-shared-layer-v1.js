(()=>{
  'use strict';
  if(window.DINI_GALLERY_LOVE_SHARED_LAYER_V1?.version)return;

  const VERSION='1.3.0';
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
    if(doc.getElementById('diniGalleryLoveDocumentLayerStyle'))return;

    const style=doc.createElement('style');
    style.id='diniGalleryLoveDocumentLayerStyle';
    style.textContent=`
      body{
        position:relative!important;
      }

      [data-dini-gallery-love-document-layer="1"]{
        position:absolute!important;
        z-index:0!important;
        pointer-events:none!important;
        overflow:hidden!important;
        background-repeat:no-repeat!important;
        background-size:cover!important;
        background-position:center center!important;
      }

      [data-dini-gallery-love-content="1"]{
        position:relative!important;
        z-index:1!important;
      }

      [data-dini-gallery-love-gallery="1"],
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

      [data-dini-love-shared-section="1"]{
        background-color:transparent!important;
        background-image:none!important;
      }

      [data-dini-love-shared-section="1"] > .elementor-background-overlay{
        background-color:transparent!important;
        background-image:none!important;
      }

      [data-dini-love-native-slideshow-hidden="1"]{
        opacity:0!important;
        pointer-events:none!important;
      }
    `;

    (doc.head||doc.documentElement).appendChild(style);
  }

  function ensureLayer(){
    let layer=doc.querySelector('[data-dini-gallery-love-document-layer="1"]');
    if(layer)return layer;
    layer=doc.createElement('div');
    layer.setAttribute('data-dini-gallery-love-document-layer','1');
    layer.setAttribute('aria-hidden','true');
    doc.body.appendChild(layer);
    return layer;
  }

  function clearGallerySurface(gallery){
    gallery.setAttribute('data-dini-gallery-love-gallery','1');
    gallery.setAttribute('data-dini-gallery-love-content','1');
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
    const layer=ensureLayer();

    clearGallerySurface(gallery);

    love.section.setAttribute('data-dini-gallery-love-content','1');
    love.section.setAttribute('data-dini-love-shared-section','1');
    love.section.style.setProperty('background-color','transparent','important');
    love.section.style.setProperty('background-image','none','important');

    if(love.slideshow){
      love.slideshow.setAttribute('data-dini-love-native-slideshow-hidden','1');
      love.slideshow.style.setProperty('opacity','0','important');
      love.slideshow.style.setProperty('pointer-events','none','important');
    }

    let lastImage='';

    const layout=()=>{
      const g=gallery.getBoundingClientRect();
      const l=love.section.getBoundingClientRect();

      const scrollX=window.scrollX||doc.documentElement.scrollLeft||0;
      const scrollY=window.scrollY||doc.documentElement.scrollTop||0;

      const left=Math.round(g.left+scrollX);
      const top=Math.round(g.top+scrollY);
      const width=Math.max(1,Math.round(g.width));
      const height=Math.max(1,Math.round((l.bottom+scrollY)-top));

      layer.style.setProperty('left',left+'px','important');
      layer.style.setProperty('top',top+'px','important');
      layer.style.setProperty('width',width+'px','important');
      layer.style.setProperty('height',height+'px','important');

      doc.documentElement.setAttribute('data-dini-gallery-love-layer-left',String(left));
      doc.documentElement.setAttribute('data-dini-gallery-love-layer-top',String(top));
      doc.documentElement.setAttribute('data-dini-gallery-love-layer-width',String(width));
      doc.documentElement.setAttribute('data-dini-gallery-love-layer-height',String(height));
      doc.documentElement.setAttribute('data-dini-gallery-love-layer-scope','document-gallery-through-love');
    };

    const sync=()=>{
      const bg=activeLoveBackground(love);
      if(!bg||!bg.image||bg.image===lastImage)return false;

      lastImage=bg.image;
      layer.style.setProperty('background-image',bg.image,'important');
      layer.style.setProperty('background-size',bg.size||'cover','important');
      layer.style.setProperty('background-position',bg.position||'center center','important');
      layer.style.setProperty('background-repeat',bg.repeat||'no-repeat','important');

      doc.documentElement.setAttribute('data-dini-gallery-love-shared-layer',VERSION);
      doc.documentElement.setAttribute('data-dini-gallery-love-shared-active','1');
      return true;
    };

    const refresh=()=>{
      layout();
      sync();
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

    const ro='ResizeObserver' in window?new ResizeObserver(()=>requestAnimationFrame(layout)):null;
    try{ro?.observe(gallery);ro?.observe(love.section)}catch{}

    [0,120,320,700,1200,2000,3200,5000,7500].forEach(ms=>setTimeout(refresh,ms));

    window.addEventListener('resize',refresh,{passive:true});
    window.addEventListener('orientationchange',refresh,{passive:true});

    window.addEventListener('pagehide',()=>{
      try{mo.disconnect()}catch{}
      try{ro?.disconnect()}catch{}
      window.removeEventListener('resize',refresh);
      window.removeEventListener('orientationchange',refresh);
    },{once:true});

    refresh();
    return{gallery,love:love.section,layer,refresh};
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
      const c=setup();
      if(c){
        window.DINI_GALLERY_LOVE_SHARED_LAYER_V1.controller=c;
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

  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();