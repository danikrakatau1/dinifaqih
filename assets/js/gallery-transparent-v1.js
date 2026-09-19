(()=>{
  'use strict';
  if(window.DINI_GALLERY_TRANSPARENT_V1?.version)return;

  const VERSION='6.0.0';
  const doc=document;
  const GALLERY_SECTION_ID='9687b1a';
  const RSVP_FORM_ID='f05a916';

  function gallerySection(){
    const exact=doc.querySelector('[data-id="'+GALLERY_SECTION_ID+'"]');
    if(exact&&exact.querySelector('.elementor-widget-gallery'))return exact;
    const widget=doc.querySelector('.elementor-widget-gallery');
    return widget?.closest('.elementor-inner-section,.elementor-section,.e-con')||widget?.parentElement||null;
  }

  function rsvpAnchor(){
    const exact=doc.querySelector('[data-id="'+RSVP_FORM_ID+'"]');
    if(exact)return exact;

    const headings=[...doc.querySelectorAll('.elementor-heading-title,h1,h2,h3,h4,h5,h6')];
    const title=headings.find(el=>/^rsvp$/i.test(String(el.textContent||'').trim()));
    if(title){
      return title.closest('.elementor-section,.e-con,.elementor-element')||title;
    }
    return null;
  }

  function commonAncestor(a,b){
    if(!a||!b)return null;
    const set=new Set();
    for(let n=a;n;n=n.parentElement)set.add(n);
    for(let n=b;n;n=n.parentElement)if(set.has(n))return n;
    return null;
  }

  function ensureStyle(){
    if(doc.getElementById('diniGalleryPureTransparentV6Style'))return;

    const style=doc.createElement('style');
    style.id='diniGalleryPureTransparentV6Style';
    style.textContent=`
      [data-dini-gallery-transparent-path="1"],
      [data-dini-gallery-transparent-path="1"] > .elementor-container,
      [data-dini-gallery-transparent-path="1"] > .e-con-inner,
      [data-dini-gallery-pure-transparent="1"],
      [data-dini-gallery-pure-transparent="1"] .elementor-container,
      [data-dini-gallery-pure-transparent="1"] .elementor-column,
      [data-dini-gallery-pure-transparent="1"] .elementor-widget-wrap,
      [data-dini-gallery-pure-transparent="1"] .elementor-widget-heading,
      [data-dini-gallery-pure-transparent="1"] .elementor-widget-gallery,
      [data-dini-gallery-pure-transparent="1"] .e-con,
      [data-dini-gallery-pure-transparent="1"] .e-con-inner{
        background-color:transparent!important;
      }

      [data-dini-gallery-pure-transparent="1"] .elementor-background-overlay{
        background-color:transparent!important;
      }

      [data-dini-gallery-pure-transparent="1"]::before,
      [data-dini-gallery-pure-transparent="1"]::after,
      [data-dini-gallery-transparent-path="1"]::before,
      [data-dini-gallery-transparent-path="1"]::after{
        background-color:transparent!important;
      }
    `;

    (doc.head||doc.documentElement).appendChild(style);
  }

  function clearColorOnly(el,attr){
    if(!el?.style)return;
    el.setAttribute(attr,'1');
    el.style.setProperty('background-color','transparent','important');
  }

  function apply(){
    const gallery=gallerySection();
    const rsvp=rsvpAnchor();
    if(!gallery||!rsvp)return false;

    const common=commonAncestor(gallery,rsvp);
    if(!common)return false;

    ensureStyle();

    gallery.setAttribute('data-dini-gallery-pure-transparent','1');
    clearColorOnly(gallery,'data-dini-gallery-pure-transparent');

    // Clear ONLY color surfaces on the Gallery branch up to the same shared
    // ancestor that also contains RSVP. Do not remove/copy/move any image layer.
    let node=gallery.parentElement;
    let depth=0;
    while(node&&node!==common&&depth<14){
      clearColorOnly(node,'data-dini-gallery-transparent-path');
      node=node.parentElement;
      depth++;
    }

    // Gallery-local wrappers can carry their own white/black fill.
    for(const el of gallery.querySelectorAll(
      '.elementor-container,.elementor-column,.elementor-widget-wrap,'+
      '.elementor-widget-heading,.elementor-widget-gallery,.e-con,.e-con-inner'
    )){
      if(el.matches('.e-gallery-image,.e-gallery-item'))continue;
      if(el.closest('.e-gallery-image,.e-gallery-item'))continue;
      el.style.setProperty('background-color','transparent','important');
    }

    // Remove only solid overlay color. Never touch overlay background-image.
    for(const overlay of gallery.querySelectorAll('.elementor-background-overlay')){
      overlay.style.setProperty('background-color','transparent','important');
    }

    doc.documentElement.setAttribute('data-dini-gallery-transparent',VERSION);
    doc.documentElement.setAttribute('data-dini-gallery-transparent-path-depth',String(depth));
    doc.documentElement.setAttribute('data-dini-gallery-rsvp-common-found','1');
    doc.documentElement.setAttribute(
      'data-dini-gallery-rsvp-common-id',
      String(common.getAttribute?.('data-id')||common.id||common.tagName||'common')
    );

    return true;
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
