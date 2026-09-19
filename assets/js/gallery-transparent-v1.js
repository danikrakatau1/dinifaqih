(()=>{
  'use strict';
  if(window.DINI_GALLERY_TRANSPARENT_V1?.version)return;

  const VERSION='4.0.0';
  const doc=document;
  const clean=value=>String(value||'').replace(/\s+/g,' ').trim();

  function galleryHeading(){
    return [...doc.querySelectorAll(
      '.elementor-heading-title,h1,h2,h3,h4,h5,h6,[class*="heading"]'
    )].find(el=>/^galerifoto$/i.test(clean(el.textContent).replace(/\s+/g,'')))||null;
  }

  function gallerySection(){
    const widget=doc.querySelector('.elementor-widget-gallery');
    if(!widget)return null;

    const heading=galleryHeading();

    let section=widget.closest('.elementor-top-section');
    if(section&&(!heading||section.contains(heading)))return section;

    section=widget.closest('.elementor-section');
    if(section&&(!heading||section.contains(heading)))return section;

    let node=widget;
    for(let depth=0;node&&depth<12;depth++,node=node.parentElement){
      if(heading&&node.contains(heading)&&node.contains(widget))return node;
    }

    return widget.parentElement;
  }

  function loveSection(){
    const carousel=doc.querySelector('.elementor-widget-testimonial-carousel');
    if(!carousel)return null;

    let node=carousel;
    let fallback=carousel.closest('.elementor-top-section,.elementor-section,.e-con');

    for(let depth=0;node&&depth<14;depth++,node=node.parentElement){
      if(
        node.matches?.('.elementor-top-section,.elementor-section,.e-con')&&
        node.querySelector?.('.elementor-background-slideshow')
      ){
        return node;
      }
      if(node.matches?.('.elementor-top-section,.elementor-section,.e-con'))fallback=node;
    }

    return fallback;
  }

  function clearGallerySurface(section){
    if(!section)return;

    const structural=[
      section,
      ...section.querySelectorAll(
        '.elementor-container,.elementor-column,.elementor-widget-wrap,'+
        '.elementor-widget-heading,.elementor-widget-gallery,.e-con,.e-con-inner'
      )
    ];

    for(const el of structural){
      if(el.matches?.('.e-gallery-image,.e-gallery-item'))continue;
      if(el.closest?.('.e-gallery-image,.e-gallery-item'))continue;
      el.style.setProperty('background-color','transparent','important');
      el.style.setProperty('background-image','none','important');
    }

    for(const overlay of section.querySelectorAll('.elementor-background-overlay')){
      if(overlay.closest('.e-gallery-image,.e-gallery-item'))continue;
      overlay.style.setProperty('background-color','transparent','important');
      overlay.style.setProperty('background-image','none','important');
    }

    section.setAttribute('data-dini-gallery-transparent-surface','1');
  }

  function ensureStyle(){
    if(doc.getElementById('diniGalleryLoveSharedLayerStyle'))return;

    const style=doc.createElement('style');
    style.id='diniGalleryLoveSharedLayerStyle';
    style.textContent=`
      .dini-gallery-love-shared{
        position:relative!important;
        width:100%!important;
        max-width:none!important;
        overflow:hidden!important;
        isolation:isolate!important;
        background:transparent!important;
      }

      .dini-gallery-love-shared > .dini-gallery-love-shared-bg{
        position:absolute!important;
        inset:0!important;
        width:100%!important;
        height:100%!important;
        min-height:100%!important;
        z-index:0!important;
        pointer-events:none!important;
        overflow:hidden!important;
      }

      .dini-gallery-love-shared > .dini-gallery-love-shared-bg.elementor-background-slideshow{
        position:absolute!important;
        inset:0!important;
      }

      .dini-gallery-love-shared > [data-dini-gallery-transparent-surface="1"],
      .dini-gallery-love-shared > [data-dini-love-story-shared-content="1"]{
        position:relative!important;
        z-index:1!important;
        background-color:transparent!important;
      }

      .dini-gallery-love-shared > [data-dini-gallery-transparent-surface="1"]{
        background-image:none!important;
      }
    `;

    (doc.head||doc.documentElement).appendChild(style);
  }

  function directLoveSlideshow(section){
    if(!section)return null;

    const direct=[...section.children].find(el=>
      el.classList?.contains('elementor-background-slideshow')
    );
    if(direct)return direct;

    return section.querySelector('.elementor-background-slideshow');
  }

  function buildSharedLayer(gallery,love){
    if(!gallery||!love||gallery===love)return null;
    if(gallery.closest('.dini-gallery-love-shared'))return gallery.closest('.dini-gallery-love-shared');

    const slideshow=directLoveSlideshow(love);
    if(!slideshow)return null;

    const galleryParent=gallery.parentNode;
    const loveParent=love.parentNode;

    // Only combine sections that live in the same source flow. This prevents
    // accidental reparenting across unrelated Elementor shells.
    if(!galleryParent||galleryParent!==loveParent)return null;

    ensureStyle();
    clearGallerySurface(gallery);

    const shared=doc.createElement('div');
    shared.className='dini-gallery-love-shared';
    shared.setAttribute('data-dini-gallery-love-shared','1');

    galleryParent.insertBefore(shared,gallery);

    // Move the ORIGINAL Love Story slideshow node, not a copy. Elementor keeps
    // animating the same node; it simply spans Gallery + Love Story together.
    slideshow.classList.add('dini-gallery-love-shared-bg');
    shared.appendChild(slideshow);

    love.setAttribute('data-dini-love-story-shared-content','1');
    love.style.setProperty('background-color','transparent','important');

    shared.appendChild(gallery);
    shared.appendChild(love);

    doc.documentElement.setAttribute('data-dini-gallery-transparent',VERSION);
    doc.documentElement.setAttribute('data-dini-gallery-love-shared-active','1');

    return shared;
  }

  function apply(){
    const gallery=gallerySection();
    const love=loveSection();
    if(!gallery||!love)return null;
    return buildSharedLayer(gallery,love);
  }

  function boot(){
    if(apply())return;

    let attempts=0;
    const timer=setInterval(()=>{
      attempts++;
      if(apply()||attempts>=40)clearInterval(timer);
    },250);
  }

  window.DINI_GALLERY_TRANSPARENT_V1={
    version:VERSION,
    apply
  };

  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
