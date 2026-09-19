(()=>{
  'use strict';
  if(window.DINI_GALLERY_SECTION_TRANSPARENT_V1?.version)return;

  const VERSION='2.0.0';
  const doc=document;
  const GALLERY_SECTION_ID='9687b1a';

  function gallerySection(){
    const exact=doc.querySelector('[data-id="'+GALLERY_SECTION_ID+'"]');
    if(exact&&exact.querySelector('.elementor-widget-gallery'))return exact;
    const widget=doc.querySelector('.elementor-widget-gallery');
    return widget?.closest('.elementor-inner-section,.elementor-section,.e-con')||widget?.parentElement||null;
  }

  function liveHeading(){
    const all=[...doc.querySelectorAll('.elementor-heading-title,h1,h2,h3,h4,h5,h6,[class*="heading"]')];
    return all.find(el=>/^live\s*streaming$/i.test(String(el.textContent||'').replace(/\s+/g,' ').trim()))||null;
  }

  function commonAncestor(a,b){
    if(!a||!b)return null;
    const seen=new Set();
    for(let n=a;n;n=n.parentElement)seen.add(n);
    for(let n=b;n;n=n.parentElement)if(seen.has(n))return n;
    return null;
  }

  function branchUnder(common,node){
    if(!common||!node||common===node)return node;
    let cur=node;
    let prev=node;
    while(cur&&cur!==common){
      prev=cur;
      cur=cur.parentElement;
    }
    return cur===common?prev:null;
  }

  function liveSection(heading,gallery){
    if(!heading)return null;
    let node=heading.closest('.elementor-element,.e-con,.elementor-section')||heading.parentElement;
    let best=node;

    for(let depth=0;node&&depth<12;depth++,node=node.parentElement){
      if(gallery&&node.contains(gallery))break;
      if(node.matches?.('.elementor-section,.elementor-top-section,.e-con,.elementor-element'))best=node;
    }
    return best;
  }

  function ensureStyle(){
    if(doc.getElementById('diniGallerySplitTransparentStyle'))return;

    const style=doc.createElement('style');
    style.id='diniGallerySplitTransparentStyle';
    style.textContent=`
      [data-dini-gallery-shared-owner="1"]{
        background-color:transparent!important;
      }

      [data-dini-live-white-branch="1"]{
        background-color:#fff!important;
      }

      [data-dini-gallery-transparent-branch="1"],
      [data-dini-gallery-transparent-branch="1"] > .elementor-container,
      [data-dini-gallery-transparent-branch="1"] .elementor-column,
      [data-dini-gallery-transparent-branch="1"] .elementor-widget-wrap,
      [data-dini-gallery-transparent-branch="1"] .elementor-widget-heading,
      [data-dini-gallery-transparent-branch="1"] .elementor-widget-gallery,
      [data-dini-gallery-transparent-branch="1"] .e-con,
      [data-dini-gallery-transparent-branch="1"] .e-con-inner{
        background-color:transparent!important;
      }

      [data-dini-gallery-transparent-branch="1"] .elementor-background-overlay{
        background-color:transparent!important;
      }
    `;

    (doc.head||doc.documentElement).appendChild(style);
  }

  function clearGalleryInner(gallery){
    gallery.setAttribute('data-dini-gallery-transparent-branch','1');
    gallery.style.setProperty('background-color','transparent','important');

    for(const el of gallery.querySelectorAll(
      '.elementor-container,.elementor-column,.elementor-widget-wrap,'+
      '.elementor-widget-heading,.elementor-widget-gallery,.e-con,.e-con-inner'
    )){
      if(el.matches('.e-gallery-image,.e-gallery-item'))continue;
      if(el.closest('.e-gallery-image,.e-gallery-item'))continue;
      el.style.setProperty('background-color','transparent','important');
    }

    for(const overlay of gallery.querySelectorAll('.elementor-background-overlay')){
      if(overlay.closest('.e-gallery-image,.e-gallery-item'))continue;
      overlay.style.setProperty('background-color','transparent','important');
    }
  }

  function apply(){
    const gallery=gallerySection();
    const heading=liveHeading();
    const live=liveSection(heading,gallery);
    if(!gallery||!heading||!live)return false;

    const common=commonAncestor(live,gallery);
    if(!common||common===doc.body||common===doc.documentElement)return false;

    const liveBranch=branchUnder(common,live);
    const galleryBranch=branchUnder(common,gallery);
    if(!liveBranch||!galleryBranch||liveBranch===galleryBranch)return false;

    ensureStyle();

    // Remove only the shared white fill.
    common.setAttribute('data-dini-gallery-shared-owner','1');
    common.style.setProperty('background-color','transparent','important');

    // Restore white only to the Live Streaming branch.
    liveBranch.setAttribute('data-dini-live-white-branch','1');
    liveBranch.style.setProperty('background-color','#fff','important');

    // Keep the Gallery branch transparent.
    galleryBranch.setAttribute('data-dini-gallery-transparent-branch','1');
    galleryBranch.style.setProperty('background-color','transparent','important');
    clearGalleryInner(gallery);

    doc.documentElement.setAttribute('data-dini-gallery-section-transparent',VERSION);
    doc.documentElement.setAttribute('data-dini-gallery-split-active','1');
    doc.documentElement.setAttribute(
      'data-dini-gallery-shared-owner-id',
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

  window.DINI_GALLERY_SECTION_TRANSPARENT_V1={
    version:VERSION,
    apply
  };

  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
