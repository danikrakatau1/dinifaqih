(()=>{
  'use strict';
  if(window.DINI_GALLERY_LOVE_SHARED_LAYER_V1?.version)return;

  const VERSION='2.1.0';
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

  function ensureStyle(){
    if(doc.getElementById('diniGalleryLoveStackStyle'))return;

    const style=doc.createElement('style');
    style.id='diniGalleryLoveStackStyle';
    style.textContent=`
      [data-dini-love-stack-owner="1"]{
        position:relative!important;
        width:100%!important;
        max-width:none!important;
        overflow:hidden!important;
      }

      [data-dini-love-stack-owner="1"] > .elementor-background-slideshow{
        position:absolute!important;
        inset:0!important;
        width:100%!important;
        height:100%!important;
        min-height:100%!important;
        z-index:0!important;
        pointer-events:none!important;
      }

      [data-dini-love-stack="1"]{
        position:relative!important;
        z-index:1!important;
        display:flex!important;
        flex-direction:column!important;
        align-items:stretch!important;
        width:100%!important;
        max-width:none!important;
        margin:0!important;
        padding:0!important;
        background:transparent!important;
      }

      [data-dini-gallery-love-stack-gallery="1"]{
        display:block!important;
        width:100%!important;
        max-width:none!important;
        margin:0!important;
        flex:0 0 auto!important;
        background-color:transparent!important;
        background-image:none!important;
      }

      [data-dini-gallery-love-stack-gallery="1"] > .elementor-container,
      [data-dini-gallery-love-stack-gallery="1"] .elementor-column,
      [data-dini-gallery-love-stack-gallery="1"] .elementor-widget-wrap,
      [data-dini-gallery-love-stack-gallery="1"] .elementor-widget-heading,
      [data-dini-gallery-love-stack-gallery="1"] .elementor-widget-gallery,
      [data-dini-gallery-love-stack-gallery="1"] .e-con,
      [data-dini-gallery-love-stack-gallery="1"] .e-con-inner{
        background-color:transparent!important;
        background-image:none!important;
      }

      [data-dini-gallery-love-stack-gallery="1"] .elementor-background-overlay{
        background-color:transparent!important;
        background-image:none!important;
      }

      [data-dini-gallery-love-stack-spacer="1"]{
        display:block!important;
        width:100%!important;
        height:clamp(180px,26vh,320px)!important;
        min-height:180px!important;
        flex:0 0 auto!important;
        background:transparent!important;
        pointer-events:none!important;
      }

      [data-dini-love-stack-content="1"]{
        position:relative!important;
        z-index:1!important;
        display:block!important;
        width:100%!important;
        max-width:none!important;
        flex:0 0 auto!important;
      }
    `;

    (doc.head||doc.documentElement).appendChild(style);
  }

  function clearGallerySurface(gallery){
    gallery.setAttribute('data-dini-gallery-love-stack-gallery','1');
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
    if(gallery===love.section)return null;

    const section=love.section;
    const contentRoot=directContentRoot(section);
    if(!contentRoot)return null;

    ensureStyle();
    clearGallerySurface(gallery);

    section.setAttribute('data-dini-love-stack-owner','1');
    contentRoot.setAttribute('data-dini-love-stack-content','1');

    // One transparent content stack INSIDE the native Love Story owner:
    // Gallery -> empty breathing area -> original Love Story content.
    let stack=section.querySelector(':scope > [data-dini-love-stack="1"]');
    if(!stack){
      stack=doc.createElement('div');
      stack.setAttribute('data-dini-love-stack','1');

      // Keep background slideshow as a sibling behind the stack.
      section.appendChild(stack);
    }

    if(gallery.parentElement!==stack){
      stack.appendChild(gallery);
    }

    let spacer=stack.querySelector(':scope > [data-dini-gallery-love-stack-spacer="1"]');
    if(!spacer){
      spacer=doc.createElement('div');
      spacer.setAttribute('data-dini-gallery-love-stack-spacer','1');
      spacer.setAttribute('aria-hidden','true');
      stack.appendChild(spacer);
    }

    if(contentRoot.parentElement!==stack){
      stack.appendChild(contentRoot);
    }

    // Native slideshow remains the ONLY background and fills the now-taller
    // Love Story owner. It is not copied, mirrored, shifted, or hidden.
    if(love.slideshow){
      love.slideshow.style.setProperty('top','0','important');
      love.slideshow.style.setProperty('right','0','important');
      love.slideshow.style.setProperty('bottom','0','important');
      love.slideshow.style.setProperty('left','0','important');
      love.slideshow.style.setProperty('width','100%','important');
      love.slideshow.style.setProperty('height','100%','important');
      love.slideshow.style.setProperty('min-height','100%','important');
    }

    doc.documentElement.setAttribute('data-dini-gallery-love-shared-layer',VERSION);
    doc.documentElement.setAttribute('data-dini-gallery-love-layer-mode','love-stack-native');
    doc.documentElement.setAttribute('data-dini-gallery-love-layout','gallery-spacer-love');
    doc.documentElement.setAttribute(
      'data-dini-love-owner-id',
      String(section.getAttribute('data-id')||'love-section')
    );

    return{
      gallery,
      love:section,
      slideshow:love.slideshow,
      stack,
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