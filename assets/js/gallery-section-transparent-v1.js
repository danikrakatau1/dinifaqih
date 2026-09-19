(()=>{
  'use strict';
  if(window.DINI_GALLERY_SECTION_TRANSPARENT_V1?.version)return;

  const VERSION='1.0.0';
  const doc=document;
  const SECTION_ID='9687b1a';

  function section(){
    const exact=doc.querySelector('[data-id="'+SECTION_ID+'"]');
    if(exact&&exact.querySelector('.elementor-widget-gallery'))return exact;

    const widget=doc.querySelector('.elementor-widget-gallery');
    if(!widget)return null;

    return widget.closest('.elementor-inner-section,.elementor-section,.e-con')||widget.parentElement;
  }

  function ensureStyle(){
    if(doc.getElementById('diniGallerySectionTransparentStyle'))return;

    const style=doc.createElement('style');
    style.id='diniGallerySectionTransparentStyle';
    style.textContent=`
      [data-dini-gallery-section-transparent="1"]{
        background-color:transparent!important;
        background-image:none!important;
      }

      [data-dini-gallery-section-transparent="1"] > .elementor-container,
      [data-dini-gallery-section-transparent="1"] .elementor-column,
      [data-dini-gallery-section-transparent="1"] .elementor-widget-wrap,
      [data-dini-gallery-section-transparent="1"] .elementor-widget-heading,
      [data-dini-gallery-section-transparent="1"] .elementor-widget-gallery,
      [data-dini-gallery-section-transparent="1"] .e-con,
      [data-dini-gallery-section-transparent="1"] .e-con-inner{
        background-color:transparent!important;
        background-image:none!important;
      }

      [data-dini-gallery-section-transparent="1"] .elementor-background-overlay{
        background-color:transparent!important;
        background-image:none!important;
      }
    `;

    (doc.head||doc.documentElement).appendChild(style);
  }

  function apply(){
    const target=section();
    if(!target)return false;

    ensureStyle();

    target.setAttribute('data-dini-gallery-section-transparent','1');
    target.style.setProperty('background-color','transparent','important');
    target.style.setProperty('background-image','none','important');

    // Scope ends here: only wrappers INSIDE the Gallery section.
    for(const el of target.querySelectorAll(
      '.elementor-container,.elementor-column,.elementor-widget-wrap,'+
      '.elementor-widget-heading,.elementor-widget-gallery,.e-con,.e-con-inner'
    )){
      if(el.matches('.e-gallery-image,.e-gallery-item'))continue;
      if(el.closest('.e-gallery-image,.e-gallery-item'))continue;
      el.style.setProperty('background-color','transparent','important');
      el.style.setProperty('background-image','none','important');
    }

    for(const overlay of target.querySelectorAll('.elementor-background-overlay')){
      if(overlay.closest('.e-gallery-image,.e-gallery-item'))continue;
      overlay.style.setProperty('background-color','transparent','important');
      overlay.style.setProperty('background-image','none','important');
    }

    doc.documentElement.setAttribute('data-dini-gallery-section-transparent',VERSION);
    doc.documentElement.setAttribute('data-dini-gallery-section-transparent-id',SECTION_ID);
    return true;
  }

  function boot(){
    if(apply())return;

    let attempts=0;
    const timer=setInterval(()=>{
      attempts++;
      if(apply()||attempts>=32)clearInterval(timer);
    },250);
  }

  window.DINI_GALLERY_SECTION_TRANSPARENT_V1={
    version:VERSION,
    apply
  };

  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
