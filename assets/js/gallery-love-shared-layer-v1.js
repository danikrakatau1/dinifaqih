(()=>{
  'use strict';
  if(window.DINI_GALLERY_LOVE_SHARED_LAYER_V1?.version)return;

  const VERSION='1.9.0';
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

      const slideshow=
        node.querySelector?.(':scope > .elementor-background-slideshow')||
        node.querySelector?.('.elementor-background-slideshow');

      if(slideshow){
        return{section:node,slideshow,carousel};
      }
    }

    return fallback?{
      section:fallback,
      slideshow:fallback.querySelector?.('.elementor-background-slideshow')||null,
      carousel
    }:null;
  }

  function directContentRoot(section){
    if(!section)return null;

    for(const child of section.children){
      if(
        child.matches?.('.elementor-container,.e-con-inner') &&
        !child.classList.contains('elementor-background-slideshow')
      ){
        return child;
      }
    }

    return section.querySelector(':scope > .elementor-container,:scope > .e-con-inner');
  }

  function liveSection(){
    return doc.querySelector('[data-dini-live-stream="1"]')||
      [...doc.querySelectorAll('.elementor-top-section,.elementor-section,.e-con')]
        .find(sec=>/live\s*streaming/i.test(String(sec.textContent||'')))||
      null;
  }

  function ensureStyle(){
    if(doc.getElementById('diniGalleryLoveNativeLongStyle'))return;

    const style=doc.createElement('style');
    style.id='diniGalleryLoveNativeLongStyle';
    style.textContent=`
      [data-dini-live-cropped="1"]{
        height:auto!important;
        min-height:0!important;
        overflow:hidden!important;
      }

      [data-dini-love-long-owner="1"]{
        position:relative!important;
        display:flex!important;
        flex-direction:column!important;
        align-items:stretch!important;
        width:100%!important;
        max-width:none!important;
        overflow:hidden!important;
      }

      [data-dini-love-long-owner="1"] > .elementor-background-slideshow{
        position:absolute!important;
        inset:0!important;
        width:100%!important;
        height:100%!important;
        min-height:100%!important;
        z-index:0!important;
      }

      [data-dini-gallery-long-slot="1"]{
        order:0!important;
        position:relative!important;
        z-index:2!important;
        display:block!important;
        width:100%!important;
        max-width:none!important;
        flex:0 0 auto!important;
        background:transparent!important;
      }

      [data-dini-gallery-long-slot="1"] > [data-dini-gallery-native-long="1"]{
        width:100%!important;
        max-width:none!important;
        margin:0!important;
      }

      [data-dini-gallery-native-long="1"],
      [data-dini-gallery-native-long="1"] > .elementor-container,
      [data-dini-gallery-native-long="1"] .elementor-column,
      [data-dini-gallery-native-long="1"] .elementor-widget-wrap,
      [data-dini-gallery-native-long="1"] .elementor-widget-heading,
      [data-dini-gallery-native-long="1"] .elementor-widget-gallery,
      [data-dini-gallery-native-long="1"] .e-con,
      [data-dini-gallery-native-long="1"] .e-con-inner{
        background-color:transparent!important;
        background-image:none!important;
      }

      [data-dini-gallery-native-long="1"] .elementor-background-overlay{
        background-color:transparent!important;
        background-image:none!important;
      }

      [data-dini-gallery-love-long-spacer="1"]{
        order:1!important;
        position:relative!important;
        z-index:1!important;
        display:block!important;
        width:100%!important;
        height:clamp(180px,28vh,320px)!important;
        min-height:180px!important;
        flex:0 0 auto!important;
        pointer-events:none!important;
        background:transparent!important;
      }

      [data-dini-love-long-content="1"]{
        order:2!important;
        position:relative!important;
        z-index:2!important;
        display:block!important;
        width:100%!important;
        max-width:none!important;
        flex:0 0 auto!important;
      }
    `;

    (doc.head||doc.documentElement).appendChild(style);
  }

  function clearGallerySurface(gallery){
    gallery.setAttribute('data-dini-gallery-native-long','1');
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

  function cropLive(){
    const live=liveSection();
    if(!live)return null;

    live.setAttribute('data-dini-live-cropped','1');
    live.style.setProperty('height','auto','important');
    live.style.setProperty('min-height','0','important');

    // Keep the authored Live section itself intact; only remove fixed-height
    // behavior that lets its white surface continue below its real content.
    return live;
  }

  function setup(){
    const gallery=galleryTop();
    const love=loveContext();

    if(!gallery||!love?.section)return null;
    if(gallery===love.section)return null;

    ensureStyle();
    const live=cropLive();

    const section=love.section;
    const contentRoot=directContentRoot(section);
    if(!contentRoot)return null;

    clearGallerySurface(gallery);

    section.setAttribute('data-dini-love-long-owner','1');
    contentRoot.setAttribute('data-dini-love-long-content','1');

    // Keep the ORIGINAL Love Story content root intact. Gallery and spacer are
    // siblings BEFORE it, all inside the same native Love Story background owner.
    let slot=section.querySelector(':scope > [data-dini-gallery-long-slot="1"]');
    if(!slot){
      slot=doc.createElement('div');
      slot.setAttribute('data-dini-gallery-long-slot','1');
      section.insertBefore(slot,contentRoot);
    }

    if(gallery.parentElement!==slot){
      slot.appendChild(gallery);
    }

    let spacer=section.querySelector(':scope > [data-dini-gallery-love-long-spacer="1"]');
    if(!spacer){
      spacer=doc.createElement('div');
      spacer.setAttribute('data-dini-gallery-love-long-spacer','1');
      spacer.setAttribute('aria-hidden','true');
      section.insertBefore(spacer,contentRoot);
    }

    // Native slideshow remains the single background and is stretched only to
    // the new owner height. Its visual origin is not translated upward.
    if(love.slideshow){
      love.slideshow.style.setProperty('top','0','important');
      love.slideshow.style.setProperty('bottom','0','important');
      love.slideshow.style.setProperty('height','100%','important');
      love.slideshow.style.setProperty('min-height','100%','important');
    }

    doc.documentElement.setAttribute('data-dini-gallery-love-shared-layer',VERSION);
    doc.documentElement.setAttribute('data-dini-gallery-love-layer-mode','crop-live-native-long');
    doc.documentElement.setAttribute('data-dini-gallery-love-layout','gallery-spacer-love');
    doc.documentElement.setAttribute(
      'data-dini-love-owner-id',
      String(section.getAttribute('data-id')||'love-section')
    );

    return{
      live,
      gallery,
      love:section,
      slideshow:love.slideshow,
      slot,
      spacer,
      contentRoot
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