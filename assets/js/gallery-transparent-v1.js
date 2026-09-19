(()=>{
  'use strict';
  if(window.DINI_GALLERY_TRANSPARENT_V1?.version)return;

  const VERSION='5.0.0';
  const doc=document;
  const GALLERY_SECTION_ID='9687b1a';

  function cssImage(el){
    try{return String(getComputedStyle(el).backgroundImage||'').trim()}catch{return 'none'}
  }

  function cssColor(el){
    try{return String(getComputedStyle(el).backgroundColor||'').trim()}catch{return ''}
  }

  function rgba(value){
    const m=String(value||'').match(/rgba?\(([^)]+)\)/i);
    if(!m)return null;
    const p=m[1].split(',').map(x=>Number.parseFloat(x.trim()));
    if(p.length<3)return null;
    return{
      r:p[0],g:p[1],b:p[2],
      a:Number.isFinite(p[3])?p[3]:1
    };
  }

  function isWhiteSurface(el){
    const c=rgba(cssColor(el));
    if(!c||c.a<0.06)return false;
    const max=Math.max(c.r,c.g,c.b);
    const min=Math.min(c.r,c.g,c.b);
    const avg=(c.r+c.g+c.b)/3;
    return avg>=235&&(max-min)<=22;
  }

  function gallerySection(){
    const exact=doc.querySelector('[data-id="'+GALLERY_SECTION_ID+'"]');
    if(exact&&exact.querySelector('.elementor-widget-gallery'))return exact;

    const widget=doc.querySelector('.elementor-widget-gallery');
    if(!widget)return null;

    return widget.closest('.elementor-inner-section,.elementor-section,.e-con')||widget.parentElement;
  }

  function ensureStyle(){
    if(doc.getElementById('diniGalleryPureTransparentStyle'))return;

    const style=doc.createElement('style');
    style.id='diniGalleryPureTransparentStyle';
    style.textContent=`
      [data-dini-gallery-pure-transparent="1"],
      [data-dini-gallery-pure-transparent="1"] > .elementor-container,
      [data-dini-gallery-pure-transparent="1"] .elementor-column,
      [data-dini-gallery-pure-transparent="1"] .elementor-widget-wrap,
      [data-dini-gallery-pure-transparent="1"] .elementor-widget-heading,
      [data-dini-gallery-pure-transparent="1"] .elementor-widget-gallery,
      [data-dini-gallery-pure-transparent="1"] .e-con,
      [data-dini-gallery-pure-transparent="1"] .e-con-inner{
        background-color:transparent!important;
      }

      [data-dini-gallery-clear-white-parent="1"]{
        background-color:transparent!important;
      }

      [data-dini-gallery-pure-transparent="1"]::before,
      [data-dini-gallery-pure-transparent="1"]::after,
      [data-dini-gallery-pure-transparent="1"] > .elementor-container::before,
      [data-dini-gallery-pure-transparent="1"] > .elementor-container::after{
        background-color:transparent!important;
      }
    `;

    (doc.head||doc.documentElement).appendChild(style);
  }

  function clearWhiteParents(section){
    let node=section.parentElement;
    let cleared=0;
    let foundBackground=false;

    for(let depth=0;node&&depth<10;depth++,node=node.parentElement){
      const image=cssImage(node);

      // This is the background layer we want to reveal. Leave it completely
      // untouched and stop clearing above it.
      if(image&&image!=='none'){
        node.setAttribute('data-dini-gallery-background-anchor','1');
        foundBackground=true;
        break;
      }

      if(isWhiteSurface(node)){
        node.setAttribute('data-dini-gallery-clear-white-parent','1');
        node.style.setProperty('background-color','transparent','important');
        cleared++;
      }

      if(node===doc.body||node===doc.documentElement)break;
    }

    doc.documentElement.setAttribute('data-dini-gallery-transparent-parents',String(cleared));
    doc.documentElement.setAttribute('data-dini-gallery-background-anchor-found',foundBackground?'1':'0');
  }

  function apply(){
    const section=gallerySection();
    if(!section)return false;

    ensureStyle();

    section.setAttribute('data-dini-gallery-pure-transparent','1');
    section.style.setProperty('background-color','transparent','important');

    // Important: never remove or replace any background-image here.
    // Gallery images, lightbox, reveal and breathing remain untouched.
    for(const el of section.querySelectorAll(
      '.elementor-container,.elementor-column,.elementor-widget-wrap,'+
      '.elementor-widget-heading,.elementor-widget-gallery,.e-con,.e-con-inner'
    )){
      if(el.matches('.e-gallery-image,.e-gallery-item'))continue;
      if(el.closest('.e-gallery-image,.e-gallery-item'))continue;
      el.style.setProperty('background-color','transparent','important');
    }

    clearWhiteParents(section);

    doc.documentElement.setAttribute('data-dini-gallery-transparent',VERSION);
    doc.documentElement.setAttribute('data-dini-gallery-transparent-section',GALLERY_SECTION_ID);
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

  window.DINI_GALLERY_TRANSPARENT_V1={
    version:VERSION,
    apply
  };

  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
