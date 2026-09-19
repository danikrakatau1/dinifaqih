(()=>{
  'use strict';
  if(window.DINI_GALLERY_LOVE_SHARED_LAYER_V1?.version)return;

  const VERSION='1.0.0';
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

      const slideshow=node.querySelector?.('.elementor-background-slideshow');
      if(slideshow){
        return{section:node,slideshow,carousel};
      }
    }

    return fallback?{section:fallback,slideshow:fallback.querySelector?.('.elementor-background-slideshow')||null,carousel}:null;
  }

  function commonAncestor(a,b){
    if(!a||!b)return null;
    const seen=new Set();
    for(let n=a;n;n=n.parentElement)seen.add(n);
    for(let n=b;n;n=n.parentElement)if(seen.has(n))return n;
    return null;
  }

  function bgFrom(el){
    if(!el)return null;
    let cs=null;
    try{cs=getComputedStyle(el)}catch{}
    if(!cs)return null;

    const image=String(cs.backgroundImage||'').trim();
    if(!image||image==='none')return null;

    return{
      image,
      size:String(cs.backgroundSize||'cover')||'cover',
      position:String(cs.backgroundPosition||'50% 50%')||'50% 50%',
      repeat:String(cs.backgroundRepeat||'no-repeat')||'no-repeat'
    };
  }

  function activeLoveBackground(ctx){
    if(!ctx?.section)return null;
    const root=ctx.slideshow||ctx.section;

    const selectors=[
      '.swiper-slide-active .elementor-background-slideshow__slide__image',
      '.swiper-slide-active [style*="background-image"]',
      '.elementor-background-slideshow__slide.swiper-slide-active .elementor-background-slideshow__slide__image',
      '.swiper-slide-active',
      '.elementor-background-slideshow__slide__image'
    ];

    for(const selector of selectors){
      for(const el of root.querySelectorAll?.(selector)||[]){
        const bg=bgFrom(el);
        if(bg)return bg;
      }
    }

    const sectionBg=bgFrom(ctx.section);
    return sectionBg;
  }

  function ensureStyle(){
    if(doc.getElementById('diniGalleryLoveSharedLayerStyleV1'))return;

    const style=doc.createElement('style');
    style.id='diniGalleryLoveSharedLayerStyleV1';
    style.textContent=`
      [data-dini-gallery-love-host="1"]{
        position:relative!important;
        isolation:isolate!important;
      }

      [data-dini-gallery-love-layer="1"]{
        position:absolute!important;
        left:0!important;
        width:100%!important;
        z-index:0!important;
        overflow:hidden!important;
        pointer-events:none!important;
      }

      [data-dini-gallery-love-layer="1"] > span{
        position:absolute;
        inset:0;
        display:block;
        opacity:0;
        background-size:cover;
        background-position:center center;
        background-repeat:no-repeat;
        transition:opacity 900ms cubic-bezier(.22,1,.36,1);
        will-change:opacity;
      }

      [data-dini-gallery-love-layer="1"] > span.is-active{
        opacity:1;
      }

      [data-dini-gallery-love-content="1"]{
        position:relative!important;
        z-index:1!important;
      }

      [data-dini-gallery-love-gallery="1"],
      [data-dini-gallery-love-gallery="1"] > .elementor-container,
      [data-dini-gallery-love-gallery="1"] .elementor-column,
      [data-dini-gallery-love-gallery="1"] .elementor-widget-wrap,
      [data-dini-gallery-love-gallery="1"] .elementor-widget-heading,
      [data-dini-gallery-love-gallery="1"] .elementor-widget-gallery,
      [data-dini-gallery-love-gallery="1"] .e-con,
      [data-dini-gallery-love-gallery="1"] .e-con-inner{
        background-color:transparent!important;
      }

      [data-dini-gallery-love-gallery="1"] .elementor-background-overlay{
        background-color:transparent!important;
      }
    `;

    (doc.head||doc.documentElement).appendChild(style);
  }

  function makeLayer(host){
    let layer=host.querySelector(':scope > [data-dini-gallery-love-layer="1"]');
    if(layer)return layer;

    layer=doc.createElement('div');
    layer.setAttribute('data-dini-gallery-love-layer','1');
    layer.setAttribute('aria-hidden','true');

    const a=doc.createElement('span');
    const b=doc.createElement('span');
    a.className='is-active';
    layer.append(a,b);

    host.insertBefore(layer,host.firstChild);
    return layer;
  }

  function clearGallerySurface(gallery){
    gallery.setAttribute('data-dini-gallery-love-gallery','1');
    gallery.setAttribute('data-dini-gallery-love-content','1');
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

  function setup(){
    const gallery=galleryTop();
    const love=loveContext();
    if(!gallery||!love?.section)return null;

    const host=commonAncestor(gallery,love.section);
    if(!host||host===doc.body||host===doc.documentElement)return null;

    ensureStyle();

    host.setAttribute('data-dini-gallery-love-host','1');
    clearGallerySurface(gallery);
    love.section.setAttribute('data-dini-gallery-love-content','1');

    const layer=makeLayer(host);
    const panes=[...layer.children];
    let active=0;
    let lastImage='';

    const layout=()=>{
      const h=host.getBoundingClientRect();
      const g=gallery.getBoundingClientRect();
      const l=love.section.getBoundingClientRect();

      const top=Math.max(0,Math.round(g.top-h.top));
      const height=Math.max(1,Math.round(l.bottom-g.top));

      layer.style.setProperty('top',top+'px','important');
      layer.style.setProperty('height',height+'px','important');

      doc.documentElement.setAttribute('data-dini-gallery-love-layer-top',String(top));
      doc.documentElement.setAttribute('data-dini-gallery-love-layer-height',String(height));
    };

    const sync=()=>{
      const bg=activeLoveBackground(love);
      if(!bg||!bg.image||bg.image===lastImage)return false;

      lastImage=bg.image;
      const next=active===0?1:0;
      const nextPane=panes[next];
      const oldPane=panes[active];

      nextPane.style.backgroundImage=bg.image;
      nextPane.style.backgroundSize=bg.size||'cover';
      nextPane.style.backgroundPosition=bg.position||'center center';
      nextPane.style.backgroundRepeat=bg.repeat||'no-repeat';

      requestAnimationFrame(()=>{
        nextPane.classList.add('is-active');
        oldPane.classList.remove('is-active');
        active=next;
      });

      doc.documentElement.setAttribute('data-dini-gallery-love-shared-layer',VERSION);
      doc.documentElement.setAttribute('data-dini-gallery-love-shared-active','1');
      return true;
    };

    const refresh=()=>{
      layout();
      sync();
    };

    const mo=new MutationObserver(()=>requestAnimationFrame(sync));
    try{
      mo.observe(love.section,{
        subtree:true,
        childList:true,
        attributes:true,
        attributeFilter:['class','style','aria-hidden']
      });
    }catch{}

    const ro='ResizeObserver' in window?new ResizeObserver(()=>requestAnimationFrame(layout)):null;
    try{ro?.observe(host);ro?.observe(gallery);ro?.observe(love.section)}catch{}

    [0,120,320,700,1200,2000,3200,5000,7500].forEach(ms=>setTimeout(refresh,ms));

    window.addEventListener('resize',refresh,{passive:true});
    window.addEventListener('orientationchange',refresh,{passive:true});
    window.addEventListener('pagehide',()=>{
      try{mo.disconnect()}catch{}
      try{ro?.disconnect()}catch{}
      window.removeEventListener('resize',refresh);
      window.removeEventListener('orientationchange',refresh);
    },{once:true});

    refresh();

    return{host,gallery,love:love.section,layer,refresh};
  }

  function boot(){
    const controller=setup();
    if(controller){
      window.DINI_GALLERY_LOVE_SHARED_LAYER_V1.controller=controller;
      return;
    }

    let n=0;
    const timer=setInterval(()=>{
      n++;
      const c=setup();
      if(c){
        window.DINI_GALLERY_LOVE_SHARED_LAYER_V1.controller=c;
        clearInterval(timer);
      }else if(n>=40){
        clearInterval(timer);
      }
    },250);
  }

  window.DINI_GALLERY_LOVE_SHARED_LAYER_V1={
    version:VERSION,
    controller:null,
    setup
  };

  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();