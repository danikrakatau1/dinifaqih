(function(g){
  'use strict';
  if(g.DINI_GALLERY_PERFORMANCE_V1?.version)return;
  const VERSION='1.2.0';
  const doc=document;
  const items=[...doc.querySelectorAll('[data-dini-gallery-bg-deferred="1"]')];

  function transformUrl(raw,width=840,quality=72){
    const value=String(raw||'').trim();
    if(!value)return '';
    try{
      const u=new URL(value,location.href);
      if(u.hostname.endsWith('.supabase.co')&&u.pathname.includes('/storage/v1/object/public/')){
        u.pathname=u.pathname.replace('/storage/v1/object/public/','/storage/v1/render/image/public/');
        u.searchParams.set('width',String(width));
        u.searchParams.set('quality',String(quality));
        u.searchParams.set('resize','contain');
        return u.href;
      }
    }catch{}
    return value;
  }

  // Keep the source's authored fadeInUp entrance, but run a lightweight
  // compositor-only equivalent instead of Elementor animating the full heavy surface.
  // Image loading/transform URLs stay untouched.
  const galleryWidgets=[...doc.querySelectorAll('.elementor-widget-gallery')];
  if(galleryWidgets.length){
    const style=doc.createElement('style');
    style.id='diniGalleryRevealPerformanceStyle';
    style.textContent=`
      @keyframes diniGalleryFadeInUp{
        from{opacity:0;transform:translate3d(0,28px,0)}
        to{opacity:1;transform:translate3d(0,0,0)}
      }
      .elementor-widget-gallery[data-dini-gallery-reveal="pending"]{
        opacity:0!important;
        transform:translate3d(0,28px,0)!important;
        animation:none!important;
        backface-visibility:hidden;
        -webkit-backface-visibility:hidden;
      }
      .elementor-widget-gallery[data-dini-gallery-reveal="running"]{
        animation:diniGalleryFadeInUp 760ms cubic-bezier(.215,.61,.355,1) both!important;
        backface-visibility:hidden;
        -webkit-backface-visibility:hidden;
      }
      .elementor-widget-gallery[data-dini-gallery-reveal="done"]{
        opacity:1!important;
        transform:none!important;
        animation:none!important;
      }
      @media (prefers-reduced-motion:reduce){
        .elementor-widget-gallery[data-dini-gallery-reveal]{
          opacity:1!important;
          transform:none!important;
          animation:none!important;
        }
      }
    `;
    (doc.head||doc.documentElement).appendChild(style);

    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const reveal=widget=>{
      if(!widget||widget.getAttribute('data-dini-gallery-reveal')==='done')return;
      widget.setAttribute('data-dini-gallery-reveal','running');
      widget.style.willChange='opacity, transform';
      setTimeout(()=>{
        widget.setAttribute('data-dini-gallery-reveal','done');
        widget.style.removeProperty('will-change');
      },820);
    };

    for(const widget of galleryWidgets){
      // Neutralize Elementor's heavy runtime path only; preserve the same fadeInUp look.
      widget.classList.remove('elementor-invisible','animated','fadeInUp');
      widget.removeAttribute('data-native-reveal');
      widget.removeAttribute('data-native-animation');
      widget.removeAttribute('data-dini-gallery-performance-static');
      widget.style.removeProperty('opacity');
      widget.style.removeProperty('transform');
      widget.style.removeProperty('animation');
      widget.setAttribute('data-dini-gallery-reveal',reduced?'done':'pending');
    }

    if(!reduced&&'IntersectionObserver' in g){
      const revealIo=new IntersectionObserver(entries=>{
        for(const e of entries){
          if(!e.isIntersecting)continue;
          revealIo.unobserve(e.target);
          requestAnimationFrame(()=>requestAnimationFrame(()=>reveal(e.target)));
        }
      },{root:null,rootMargin:'120px 0px -4% 0px',threshold:0.04});
      galleryWidgets.forEach(widget=>revealIo.observe(widget));
      g.addEventListener('pagehide',()=>revealIo.disconnect(),{once:true});
    }else{
      galleryWidgets.forEach(reveal);
    }
  }

  if(items.length){
    const mobile=matchMedia('(max-width:767px)').matches;
    const concurrency=mobile?1:2;
    const rootMargin=mobile?'1800px 0px':'2200px 0px';
    const queue=[];
    const queued=new WeakSet();
    let active=0,loaded=0,failed=0;

    function sourceUrl(el){
      return String(el.getAttribute('data-dini-gallery-bg')||el.getAttribute('data-thumbnail')||'').trim();
    }

    function apply(el,url){
      if(!el||!url)return;
      el.style.setProperty('background-image','url("'+String(url).replaceAll('"','%22')+'")','important');
      el.setAttribute('data-dini-gallery-bg-loaded','1');
      el.setAttribute('data-dini-gallery-bg-runtime',url);
      el.removeAttribute('data-dini-gallery-bg-loading');
    }

    function runNext(){
      while(active<concurrency&&queue.length){
        const el=queue.shift();
        const original=sourceUrl(el);
        if(!original||el.getAttribute('data-dini-gallery-bg-loaded')==='1')continue;
        const runtime=transformUrl(original,840,72);
        active++;
        el.setAttribute('data-dini-gallery-bg-loading','1');
        const img=new Image();
        img.decoding='async';
        try{img.fetchPriority='low'}catch{}
        const done=ok=>{
          apply(el,ok?runtime:original);
          if(ok)loaded++;else failed++;
          active--;
          runNext();
        };
        img.onload=async()=>{
          try{if(img.decode)await img.decode()}catch{}
          done(true);
        };
        img.onerror=()=>done(false);
        img.src=runtime;
      }
      doc.documentElement.setAttribute('data-dini-gallery-loaded',String(loaded));
      doc.documentElement.setAttribute('data-dini-gallery-active',String(active));
      doc.documentElement.setAttribute('data-dini-gallery-queued',String(queue.length));
    }

    function enqueue(el){
      if(!el||queued.has(el)||el.getAttribute('data-dini-gallery-bg-loaded')==='1')return;
      queued.add(el);
      queue.push(el);
      runNext();
    }

    if('IntersectionObserver' in g){
      const io=new IntersectionObserver(entries=>{
        for(const e of entries){
          if(!e.isIntersecting)continue;
          io.unobserve(e.target);
          enqueue(e.target);
        }
      },{root:null,rootMargin,threshold:0.01});
      items.forEach(el=>io.observe(el));
      const prewarm=()=>{if(items[0])enqueue(items[0])};
      if('requestIdleCallback' in g)requestIdleCallback(prewarm,{timeout:1500});
      else setTimeout(prewarm,700);
      g.addEventListener('pagehide',()=>io.disconnect(),{once:true});
    }else{
      items.forEach(enqueue);
    }

    doc.documentElement.setAttribute('data-dini-gallery-performance',VERSION);
    doc.documentElement.setAttribute('data-dini-gallery-deferred-count',String(items.length));

    g.DINI_GALLERY_PERFORMANCE_V1={
      version:VERSION,
      count:items.length,
      enqueue,
      transformUrl,
      stats:()=>({loaded,failed,active,queued:queue.length})
    };
  }else{
    g.DINI_GALLERY_PERFORMANCE_V1={version:VERSION,count:0,transformUrl};
  }

  // Lightweight public lightbox. Elementor's original JS is intentionally not executed
  // in Source Truth public mode, so navigating to href showed the raw 6MB image at native
  // pixel size. Intercept gallery clicks and fit the edited image inside the viewport.
  let overlay=null,lightboxImg=null,previousOverflow='';
  function ensureLightbox(){
    if(overlay)return overlay;
    const style=doc.createElement('style');
    style.id='diniGalleryLightboxStyle';
    style.textContent=`
      .dini-gallery-lightbox{position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.92);padding:max(18px,env(safe-area-inset-top)) max(14px,env(safe-area-inset-right)) max(18px,env(safe-area-inset-bottom)) max(14px,env(safe-area-inset-left));box-sizing:border-box}
      .dini-gallery-lightbox[data-open="1"]{display:flex}
      .dini-gallery-lightbox img{display:block;max-width:min(94vw,1200px);max-height:88dvh;width:auto;height:auto;object-fit:contain;box-shadow:0 16px 70px rgba(0,0,0,.35);border-radius:2px}
      .dini-gallery-lightbox button{position:absolute;top:max(14px,env(safe-area-inset-top));right:max(14px,env(safe-area-inset-right));width:44px;height:44px;border:0;border-radius:999px;background:rgba(20,20,20,.72);color:#fff;font:300 30px/1 system-ui;cursor:pointer;display:grid;place-items:center;padding:0}
      .dini-gallery-lightbox button:focus-visible{outline:2px solid #fff;outline-offset:2px}
    `;
    (doc.head||doc.documentElement).appendChild(style);

    overlay=doc.createElement('div');
    overlay.className='dini-gallery-lightbox';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label','Foto galeri');
    overlay.innerHTML='<button type="button" aria-label="Tutup">&times;</button><img alt="Foto galeri">';
    lightboxImg=overlay.querySelector('img');
    overlay.querySelector('button').addEventListener('click',closeLightbox);
    overlay.addEventListener('click',e=>{if(e.target===overlay)closeLightbox()});
    doc.body.appendChild(overlay);
    return overlay;
  }

  function editedGalleryUrl(anchor){
    const media=anchor?.querySelector?.('[data-thumbnail],.e-gallery-image,[data-dini-gallery-bg]');
    return String(media?.getAttribute?.('data-thumbnail')||media?.getAttribute?.('data-dini-gallery-bg')||anchor?.getAttribute?.('href')||'').trim();
  }

  function openLightbox(anchor){
    const original=editedGalleryUrl(anchor);
    if(!original)return;
    ensureLightbox();
    const fitted=transformUrl(original,1600,82);
    previousOverflow=doc.documentElement.style.overflow||'';
    doc.documentElement.style.setProperty('overflow','hidden','important');
    lightboxImg.src=fitted;
    overlay.setAttribute('data-open','1');
    overlay.querySelector('button')?.focus?.({preventScroll:true});
  }

  function closeLightbox(){
    if(!overlay)return;
    overlay.removeAttribute('data-open');
    lightboxImg?.removeAttribute('src');
    if(previousOverflow)doc.documentElement.style.overflow=previousOverflow;
    else doc.documentElement.style.removeProperty('overflow');
  }

  doc.addEventListener('click',e=>{
    const a=e.target?.closest?.('a[data-native-gallery-item],.elementor-widget-gallery a[data-elementor-open-lightbox="yes"]');
    if(!a)return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    openLightbox(a);
  },true);

  doc.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&overlay?.getAttribute('data-open')==='1')closeLightbox();
  },true);
})(window);
