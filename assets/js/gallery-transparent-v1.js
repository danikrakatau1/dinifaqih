(()=>{
  'use strict';
  if(window.DINI_GALLERY_TRANSPARENT_V1?.version)return;

  const VERSION='3.0.0';
  const doc=document;
  const clean=value=>String(value||'').replace(/\s+/g,' ').trim();

  function galleryHeading(){
    return [...doc.querySelectorAll('.elementor-heading-title,h1,h2,h3,h4,h5,h6,[class*="heading"]')]
      .find(el=>/^galerifoto$/i.test(clean(el.textContent).replace(/\s+/g,'')))||null;
  }

  function galleryScope(widget,heading){
    if(!widget)return null;
    let node=widget;
    let best=null;

    for(let depth=0;node&&depth<12;depth++,node=node.parentElement){
      if(heading&&node.contains(heading)&&node.contains(widget)){
        best=node;
        if(node.matches?.('.elementor-section,.elementor-top-section,.e-con'))return node;
      }
    }

    return best||widget.closest('.elementor-section,.e-con,.elementor-element')||widget.parentElement;
  }

  function findLoveStorySection(){
    const carousel=doc.querySelector('.elementor-widget-testimonial-carousel');
    if(!carousel)return null;

    let node=carousel;
    let fallback=carousel.parentElement;

    for(let depth=0;node&&depth<14;depth++,node=node.parentElement){
      fallback=node;

      if(node.querySelector?.(
        '.elementor-background-slideshow,'+
        '.elementor-background-slideshow__slide,'+
        '.elementor-background-slideshow__slide__image'
      )){
        return node;
      }

      const settings=String(node.getAttribute?.('data-settings')||'');
      if(/background_slideshow_gallery|background_background[^}]*slideshow/i.test(settings)){
        return node;
      }
    }

    return fallback;
  }

  function backgroundFrom(el){
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

  function activeLoveBackground(section){
    if(!section)return null;

    const preferred=[
      '.elementor-background-slideshow .swiper-slide-active .elementor-background-slideshow__slide__image',
      '.elementor-background-slideshow .swiper-slide-active [style*="background-image"]',
      '.elementor-background-slideshow__slide.swiper-slide-active .elementor-background-slideshow__slide__image',
      '.elementor-background-slideshow .swiper-slide-active',
      '.elementor-background-slideshow__slide__image'
    ];

    for(const selector of preferred){
      const nodes=[...section.querySelectorAll(selector)];
      for(const node of nodes){
        const bg=backgroundFrom(node);
        if(bg)return bg;
      }
    }

    // Elementor may paint the slideshow image on the section itself while the
    // slideshow runtime is settling. Use that only as a final Love Story-local
    // fallback, never search outside the Love Story section.
    let node=section;
    for(let depth=0;node&&depth<5;depth++,node=node.parentElement){
      const bg=backgroundFrom(node);
      if(bg)return bg;
    }

    return null;
  }

  function ensureStyle(){
    if(doc.getElementById('diniGalleryLoveStoryMirrorStyle'))return;

    const style=doc.createElement('style');
    style.id='diniGalleryLoveStoryMirrorStyle';
    style.textContent=`
      [data-dini-gallery-love-mirror="1"]{
        position:relative!important;
        isolation:isolate!important;
        background-color:transparent!important;
        background-image:none!important;
      }

      [data-dini-gallery-love-mirror="1"] > .dini-gallery-love-bg{
        position:absolute;
        inset:0;
        z-index:0;
        overflow:hidden;
        pointer-events:none;
      }

      [data-dini-gallery-love-mirror="1"] > .dini-gallery-love-bg > span{
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

      [data-dini-gallery-love-mirror="1"] > .dini-gallery-love-bg > span.is-active{
        opacity:1;
      }

      [data-dini-gallery-love-mirror="1"] > .elementor-container,
      [data-dini-gallery-love-mirror="1"] > .e-con-inner{
        position:relative!important;
        z-index:1!important;
      }

      [data-dini-gallery-love-mirror="1"] .elementor-widget-wrap,
      [data-dini-gallery-love-mirror="1"] .elementor-column,
      [data-dini-gallery-love-mirror="1"] .elementor-container,
      [data-dini-gallery-love-mirror="1"] .e-con,
      [data-dini-gallery-love-mirror="1"] .e-con-inner,
      [data-dini-gallery-love-mirror="1"] .elementor-widget-heading,
      [data-dini-gallery-love-mirror="1"] .elementor-widget-gallery{
        background-color:transparent!important;
      }
    `;

    (doc.head||doc.documentElement).appendChild(style);
  }

  function ensureMirror(scope){
    let root=scope.querySelector(':scope > .dini-gallery-love-bg');
    if(root)return root;

    root=doc.createElement('div');
    root.className='dini-gallery-love-bg';
    root.setAttribute('aria-hidden','true');

    const a=doc.createElement('span');
    const b=doc.createElement('span');
    a.className='is-active';

    root.append(a,b);
    scope.insertBefore(root,scope.firstChild);
    return root;
  }

  function clearGallerySurface(scope){
    const structural=[
      scope,
      ...scope.querySelectorAll(
        '.elementor-container,.elementor-column,.elementor-widget-wrap,'+
        '.elementor-widget-heading,.elementor-widget-gallery,.e-con,.e-con-inner'
      )
    ];

    for(const el of structural){
      if(el.matches?.('.e-gallery-image,.e-gallery-item'))continue;
      if(el.closest?.('.e-gallery-image,.e-gallery-item'))continue;
      el.style.setProperty('background-color','transparent','important');
      if(el!==scope)el.style.setProperty('background-image','none','important');
    }

    for(const overlay of scope.querySelectorAll('.elementor-background-overlay')){
      if(overlay.closest('.e-gallery-item,.e-gallery-image'))continue;
      overlay.style.setProperty('background-color','transparent','important');
      overlay.style.setProperty('background-image','none','important');
    }
  }

  function createController(scope,loveSection){
    ensureStyle();
    scope.setAttribute('data-dini-gallery-love-mirror','1');
    clearGallerySurface(scope);

    const mirror=ensureMirror(scope);
    const layers=[...mirror.children];
    let active=0;
    let lastImage='';

    const sync=()=>{
      const bg=activeLoveBackground(loveSection);
      if(!bg||!bg.image||bg.image===lastImage)return false;

      lastImage=bg.image;
      const next=active===0?1:0;
      const nextLayer=layers[next];
      const currentLayer=layers[active];

      nextLayer.style.backgroundImage=bg.image;
      nextLayer.style.backgroundSize=bg.size||'cover';
      nextLayer.style.backgroundPosition=bg.position||'center center';
      nextLayer.style.backgroundRepeat=bg.repeat||'no-repeat';

      requestAnimationFrame(()=>{
        nextLayer.classList.add('is-active');
        currentLayer.classList.remove('is-active');
        active=next;
      });

      doc.documentElement.setAttribute('data-dini-gallery-love-mirror',VERSION);
      doc.documentElement.setAttribute('data-dini-gallery-love-mirror-active','1');
      return true;
    };

    const observer=new MutationObserver(()=>{
      requestAnimationFrame(sync);
    });

    try{
      observer.observe(loveSection,{
        subtree:true,
        childList:true,
        attributes:true,
        attributeFilter:['class','style','aria-hidden']
      });
    }catch{}

    [0,120,300,650,1100,1800,2800,4200,6500].forEach(ms=>setTimeout(sync,ms));
    window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});

    return{sync,observer};
  }

  function apply(){
    const widget=doc.querySelector('.elementor-widget-gallery');
    const heading=galleryHeading();
    const scope=galleryScope(widget,heading);
    const loveSection=findLoveStorySection();

    if(!widget||!scope||!loveSection)return null;
    if(scope.__diniGalleryLoveMirror)return scope.__diniGalleryLoveMirror;

    const controller=createController(scope,loveSection);
    scope.__diniGalleryLoveMirror=controller;
    return controller;
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
