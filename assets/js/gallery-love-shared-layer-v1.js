(()=>{
  'use strict';
  if(window.DINI_GALLERY_LOVE_SHARED_LAYER_V1?.version)return;

  const VERSION='2.7.0';
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

  function directBranch(root,node){
    if(!root||!node)return null;
    let cur=node;

    while(cur&&cur.parentElement&&cur.parentElement!==root){
      cur=cur.parentElement;
    }

    return cur&&cur.parentElement===root?cur:null;
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
        display:flex!important;
        flex-direction:column!important;
        align-items:stretch!important;
        width:100%!important;
        max-width:none!important;
      }

      [data-dini-love-same-section-owner="1"] > [data-dini-gallery-same-section="1"]{
        order:0!important;
        width:100%!important;
        max-width:none!important;
        flex:0 0 auto!important;
        align-self:stretch!important;
      }

      [data-dini-gallery-love-v22-spacer="1"]{
        order:1!important;
        position:relative!important;
        z-index:1!important;
        display:block!important;
        width:100%!important;
        height:clamp(320px,42vh,480px)!important;
        min-height:320px!important;
        flex:0 0 auto!important;
        background:transparent!important;
        pointer-events:none!important;
      }

      [data-dini-love-same-section-content="1"]{
        position:relative!important;
        z-index:1!important;
      }

      [data-dini-love-exact-branch="1"]{
        order:2!important;
        position:relative!important;
        z-index:1!important;
        display:block!important;
        width:100%!important;
        max-width:none!important;
        flex:0 0 auto!important;
        align-self:stretch!important;
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
    const loveBranch=directBranch(section,love.carousel)||contentRoot;

    section.setAttribute('data-dini-love-same-section-owner','1');
    if(contentRoot){
      contentRoot.setAttribute('data-dini-love-same-section-content','1');
    }
    if(loveBranch){
      loveBranch.setAttribute('data-dini-love-exact-branch','1');
    }

    // Gallery becomes the first content block INSIDE the native Love Story
    // section. The source-native slideshow/background remains untouched and
    // automatically covers Gallery + Love Story as one section.
    if(gallery.parentElement!==section){
      if(contentRoot){
        section.insertBefore(gallery,contentRoot);
      }else{
        section.appendChild(gallery);
      }
    }

    // Keep V1.6 native structure intact. Add only one transparent direct-child
    // breathing spacer between Gallery and the original Love Story content.
    let spacer=section.querySelector(':scope > [data-dini-gallery-love-v22-spacer="1"]');
    if(!spacer&&contentRoot){
      spacer=doc.createElement('div');
      spacer.setAttribute('data-dini-gallery-love-v22-spacer','1');
      spacer.setAttribute('aria-hidden','true');
      section.insertBefore(spacer,contentRoot);
    }

    // V2.6: order the EXACT direct branch that contains the Love carousel.
    // No background/slideshow changes.
    if(loveBranch){
      // Physical DOM order:
      // Gallery -> spacer -> exact Love Story branch.
      section.insertBefore(gallery,loveBranch);
      if(spacer){
        section.insertBefore(spacer,loveBranch);
      }

      section.style.setProperty('display','flex','important');
      section.style.setProperty('flex-direction','column','important');
      section.style.setProperty('align-items','stretch','important');

      gallery.style.setProperty('order','0','important');
      gallery.style.setProperty('width','100%','important');
      gallery.style.setProperty('max-width','none','important');
      gallery.style.setProperty('flex','0 0 auto','important');
      gallery.style.setProperty('align-self','stretch','important');

      if(spacer){
        spacer.style.setProperty('order','1','important');
        spacer.style.setProperty('width','100%','important');
        spacer.style.setProperty('flex','0 0 auto','important');
      }

      loveBranch.style.setProperty('order','2','important');
      loveBranch.style.setProperty('width','100%','important');
      loveBranch.style.setProperty('max-width','none','important');
      loveBranch.style.setProperty('flex','0 0 auto','important');
      loveBranch.style.setProperty('align-self','stretch','important');
    }

    doc.documentElement.setAttribute('data-dini-gallery-love-shared-layer',VERSION);
    doc.documentElement.setAttribute('data-dini-gallery-love-layer-mode','v27-spacer-tune');
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
      loveBranch,
      spacer:section.querySelector(':scope > [data-dini-gallery-love-v22-spacer="1"]')
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