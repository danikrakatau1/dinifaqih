(()=>{
  'use strict';
  if(window.DINI_GALLERY_LOVE_SHARED_LAYER_V1?.version)return;

  const VERSION='1.8.0';
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

      const slideshow=node.querySelector?.(':scope > .elementor-background-slideshow')||
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
    if(doc.getElementById('diniGalleryLoveSameSectionStyle'))return;

    const style=doc.createElement('style');
    style.id='diniGalleryLoveSameSectionStyle';
    style.textContent=`
      [data-dini-gallery-same-section="1"]{
        position:relative!important;
        z-index:1!important;
        width:100%!important;
        background-color:transparent!important;
        background-image:none!important;
      }

      [data-dini-gallery-same-section="1"] > .elementor-container,
      [data-dini-gallery-same-section="1"] .elementor-column,
      [data-dini-gallery-same-section="1"] .elementor-widget-wrap,
      [data-dini-gallery-same-section="1"] .elementor-widget-heading,
      [data-dini-gallery-same-section="1"] .elementor-widget-gallery,
      [data-dini-gallery-same-section="1"] .e-con,
      [data-dini-gallery-same-section="1"] .e-con-inner{
        background-color:transparent!important;
        background-image:none!important;
      }

      [data-dini-gallery-same-section="1"] .elementor-background-overlay{
        background-color:transparent!important;
        background-image:none!important;
      }

      [data-dini-love-same-section-owner="1"]{
        position:relative!important;
      }

      [data-dini-love-same-section-content="1"]{
        position:relative!important;
        z-index:1!important;
        display:flex!important;
        flex-direction:column!important;
        align-items:stretch!important;
        width:100%!important;
        max-width:none!important;
      }

      [data-dini-gallery-same-section-slot="1"]{
        order:-2!important;
        display:block!important;
        width:100%!important;
        max-width:none!important;
        flex:0 0 auto!important;
      }

      [data-dini-gallery-same-section="1"]{
        display:block!important;
        width:100%!important;
        max-width:none!important;
        margin:0!important;
      }

      [data-dini-gallery-love-spacer="1"]{
        order:-1!important;
        display:block!important;
        width:100%!important;
        height:clamp(150px,22vh,260px)!important;
        min-height:150px!important;
        flex:0 0 auto!important;
        pointer-events:none!important;
      }

      [data-dini-love-original-content="1"]{
        order:0!important;
        width:100%!important;
        flex:0 0 auto!important;
      }
    `;

    (doc.head||doc.documentElement).appendChild(style);
  }

  function clearGallerySurface(gallery){
    gallery.setAttribute('data-dini-gallery-same-section','1');
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

    ensureStyle();
    clearGallerySurface(gallery);

    const section=love.section;
    const contentRoot=directContentRoot(section);

    section.setAttribute('data-dini-love-same-section-owner','1');

    if(!contentRoot){
      return null;
    }

    contentRoot.setAttribute('data-dini-love-same-section-content','1');

    // Preserve the original Love Story children as the final content block.
    let original=contentRoot.querySelector(':scope > [data-dini-love-original-content="1"]');
    if(!original){
      original=doc.createElement('div');
      original.setAttribute('data-dini-love-original-content','1');

      const originalChildren=[...contentRoot.children];
      for(const child of originalChildren){
        original.appendChild(child);
      }
      contentRoot.appendChild(original);
    }

    // Gallery occupies the FIRST slot in the Love Story content container.
    let slot=contentRoot.querySelector(':scope > [data-dini-gallery-same-section-slot="1"]');
    if(!slot){
      slot=doc.createElement('div');
      slot.setAttribute('data-dini-gallery-same-section-slot','1');
      contentRoot.insertBefore(slot,original);
    }

    if(gallery.parentElement!==slot){
      slot.appendChild(gallery);
    }

    // Real empty breathing area between Gallery and Love Story.
    let spacer=contentRoot.querySelector(':scope > [data-dini-gallery-love-spacer="1"]');
    if(!spacer){
      spacer=doc.createElement('div');
      spacer.setAttribute('data-dini-gallery-love-spacer','1');
      spacer.setAttribute('aria-hidden','true');
      contentRoot.insertBefore(spacer,original);
    }

    doc.documentElement.setAttribute('data-dini-gallery-love-shared-layer',VERSION);
    doc.documentElement.setAttribute('data-dini-gallery-love-layer-mode','same-section-native-ordered');
    doc.documentElement.setAttribute('data-dini-gallery-love-layout','gallery-spacer-love');
    doc.documentElement.setAttribute(
      'data-dini-love-owner-id',
      String(section.getAttribute('data-id')||'love-section')
    );

    return{
      gallery,
      love:section,
      slideshow:love.slideshow,
      contentRoot,
      slot:contentRoot.querySelector(':scope > [data-dini-gallery-same-section-slot="1"]'),
      spacer:contentRoot.querySelector(':scope > [data-dini-gallery-love-spacer="1"]')
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