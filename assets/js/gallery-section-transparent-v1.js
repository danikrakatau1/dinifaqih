(()=>{
  'use strict';
  if(window.DINI_GALLERY_SECTION_TRANSPARENT_V1?.version)return;

  const VERSION='3.0.0';
  const doc=document;
  const GALLERY_TOP_ID='bc6eeaf';

  function gallerySection(){
    const exact=doc.querySelector('[data-id="'+GALLERY_TOP_ID+'"]');
    if(exact&&exact.querySelector('.elementor-widget-gallery'))return exact;

    const widget=doc.querySelector('.elementor-widget-gallery');
    return widget?.closest('.elementor-top-section,.elementor-section,.e-con')||null;
  }

  function liveHeading(){
    return [...doc.querySelectorAll(
      '.elementor-heading-title,h1,h2,h3,h4,h5,h6,[class*="heading"]'
    )].find(el=>/^live\s*streaming$/i.test(
      String(el.textContent||'').replace(/\s+/g,' ').trim()
    ))||null;
  }

  function liveSection(){
    const heading=liveHeading();
    if(!heading)return null;
    return heading.closest('.elementor-top-section,.elementor-section,.e-con')||
           heading.closest('.elementor-element')||null;
  }

  function ensureStyle(){
    if(doc.getElementById('diniGalleryBodySplitStyle'))return;

    const style=doc.createElement('style');
    style.id='diniGalleryBodySplitStyle';
    style.textContent=`
      html,body{
        background-color:transparent!important;
      }

      [data-dini-live-white-section="1"]{
        background-color:#fff!important;
      }

      [data-dini-gallery-transparent-section="1"],
      [data-dini-gallery-transparent-section="1"] > .elementor-container,
      [data-dini-gallery-transparent-section="1"] .elementor-column,
      [data-dini-gallery-transparent-section="1"] .elementor-widget-wrap,
      [data-dini-gallery-transparent-section="1"] .elementor-widget-heading,
      [data-dini-gallery-transparent-section="1"] .elementor-widget-gallery,
      [data-dini-gallery-transparent-section="1"] .e-con,
      [data-dini-gallery-transparent-section="1"] .e-con-inner{
        background-color:transparent!important;
      }

      [data-dini-gallery-transparent-section="1"] .elementor-background-overlay{
        background-color:transparent!important;
      }
    `;

    (doc.head||doc.documentElement).appendChild(style);
  }

  function clearGallery(section){
    section.setAttribute('data-dini-gallery-transparent-section','1');
    section.style.setProperty('background-color','transparent','important');

    for(const el of section.querySelectorAll(
      '.elementor-container,.elementor-column,.elementor-widget-wrap,'+
      '.elementor-widget-heading,.elementor-widget-gallery,.e-con,.e-con-inner'
    )){
      if(el.matches('.e-gallery-image,.e-gallery-item'))continue;
      if(el.closest('.e-gallery-image,.e-gallery-item'))continue;
      el.style.setProperty('background-color','transparent','important');
    }

    for(const overlay of section.querySelectorAll('.elementor-background-overlay')){
      if(overlay.closest('.e-gallery-image,.e-gallery-item'))continue;
      overlay.style.setProperty('background-color','transparent','important');
    }
  }

  function apply(){
    const gallery=gallerySection();
    const live=liveSection();
    if(!gallery||!live||!doc.body)return false;

    ensureStyle();

    // Exact diagnosis: BODY is the white owner.
    doc.body.style.setProperty('background-color','transparent','important');
    doc.documentElement.style.setProperty('background-color','transparent','important');

    // Restore white ONLY on Live Streaming.
    live.setAttribute('data-dini-live-white-section','1');
    live.style.setProperty('background-color','#fff','important');

    // Gallery remains transparent.
    clearGallery(gallery);

    doc.documentElement.setAttribute('data-dini-gallery-section-transparent',VERSION);
    doc.documentElement.setAttribute('data-dini-gallery-body-owner-fixed','1');
    doc.documentElement.setAttribute(
      'data-dini-live-white-section-id',
      String(live.getAttribute('data-id')||'live')
    );

    return true;
  }

  function boot(){
    if(apply())return;
    let n=0;
    const t=setInterval(()=>{
      n++;
      if(apply()||n>=40)clearInterval(t);
    },250);
  }

  window.DINI_GALLERY_SECTION_TRANSPARENT_V1={
    version:VERSION,
    apply
  };

  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
