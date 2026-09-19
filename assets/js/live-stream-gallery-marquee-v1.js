(()=>{
  'use strict';
  if(window.DINI_LIVE_STREAM_GALLERY_V1?.version)return;

  const VERSION='1.0.0';
  const SPEED_PX_PER_SECOND=28;
  const GAP_PX=8;
  const doc=document;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;

  const clean=value=>String(value||'').replace(/\s+/g,' ').trim();

  function cssUrl(value){
    const raw=String(value||'').trim();
    const match=raw.match(/url\(\s*["']?([^"')]+)["']?\s*\)/i);
    return match?.[1]||'';
  }

  function optimize(raw,width=420,quality=72){
    const value=String(raw||'').trim();
    if(!value)return '';
    try{
      const url=new URL(value,location.href);
      if(url.hostname.endsWith('.supabase.co')&&url.pathname.includes('/storage/v1/object/public/')){
        url.pathname=url.pathname.replace('/storage/v1/object/public/','/storage/v1/render/image/public/');
        url.searchParams.set('width',String(width));
        url.searchParams.set('quality',String(quality));
        url.searchParams.set('resize','cover');
        return url.href;
      }
      return url.href;
    }catch{
      return value;
    }
  }

  function galleryPhotos(){
    const selectors=[
      '.elementor-widget-gallery .e-gallery-image',
      '[data-native-gallery-image]',
      '.e-gallery-image[data-thumbnail]'
    ].join(',');

    const seen=new Set();
    const photos=[];

    for(const el of doc.querySelectorAll(selectors)){
      const authored=clean(
        el.getAttribute('data-thumbnail')||
        el.getAttribute('data-dini-gallery-bg')||
        el.closest('a[href]')?.getAttribute('href')||
        ''
      );
      const rendered=clean(
        el.getAttribute('data-dini-gallery-bg-runtime')||
        cssUrl(el.style?.backgroundImage)||
        authored
      );
      const key=authored||rendered;
      if(!key||seen.has(key))continue;
      if(!/^(?:https?:|\/|\.\/|\.\.\/)/i.test(rendered||authored))continue;
      seen.add(key);
      photos.push({
        source:key,
        src:optimize(rendered||authored,420,72)
      });
    }

    return photos;
  }

  function findLiveHeading(){
    const candidates=[
      ...doc.querySelectorAll(
        '.elementor-heading-title,h1,h2,h3,h4,h5,h6,[class*="heading"]'
      )
    ];

    return candidates.find(el=>/^live\s*streaming$/i.test(clean(el.textContent)))||null;
  }

  function insertionAnchor(heading){
    if(!heading)return null;
    return heading.closest('.elementor-widget-heading,.elementor-element')||heading;
  }

  function ensureStyle(){
    if(doc.getElementById('diniLiveStreamGalleryStyle'))return;
    const style=doc.createElement('style');
    style.id='diniLiveStreamGalleryStyle';
    style.textContent=`
      .dini-live-gallery{
        width:100%;
        box-sizing:border-box;
        overflow:hidden;
        padding:0 14px;
        margin:0 0 26px;
        pointer-events:none;
      }
      .dini-live-gallery__viewport{
        width:100%;
        overflow:hidden;
        contain:layout paint;
      }
      .dini-live-gallery__track{
        display:flex;
        width:max-content;
        max-width:none;
        transform:translate3d(0,0,0);
        will-change:transform;
        backface-visibility:hidden;
        -webkit-backface-visibility:hidden;
      }
      .dini-live-gallery__group{
        display:flex;
        flex:none;
        align-items:stretch;
        gap:${GAP_PX}px;
        padding-right:${GAP_PX}px;
        box-sizing:content-box;
      }
      .dini-live-gallery__item{
        position:relative;
        flex:0 0 var(--dini-live-card-width,120px);
        width:var(--dini-live-card-width,120px);
        aspect-ratio:4/5;
        overflow:hidden;
        border-radius:8px;
        background:#eeeae2;
        transform:translateZ(0);
      }
      .dini-live-gallery__item img{
        display:block;
        width:100%;
        height:100%;
        object-fit:cover;
        object-position:center;
        border:0;
        margin:0;
        padding:0;
        user-select:none;
        -webkit-user-drag:none;
      }
      @media (max-width:360px){
        .dini-live-gallery{padding-inline:10px;margin-bottom:22px}
        .dini-live-gallery__group{gap:6px;padding-right:6px}
      }
      @media (prefers-reduced-motion:reduce){
        .dini-live-gallery__track{
          transform:none!important;
          will-change:auto;
        }
      }
    `;
    (doc.head||doc.documentElement).appendChild(style);
  }

  function createItem(photo,index,duplicate=false){
    const item=doc.createElement('div');
    item.className='dini-live-gallery__item';
    item.setAttribute('aria-hidden',duplicate?'true':'false');

    const img=doc.createElement('img');
    img.src=photo.src;
    img.alt=duplicate?'':('Foto galeri pernikahan '+String(index+1));
    img.loading='lazy';
    img.decoding='async';
    img.draggable=false;
    try{img.fetchPriority='low'}catch{}

    item.appendChild(img);
    return item;
  }

  function build(){
    if(doc.querySelector('[data-dini-live-gallery="1"]'))return doc.querySelector('[data-dini-live-gallery="1"]');

    const heading=findLiveHeading();
    const anchor=insertionAnchor(heading);
    const photos=galleryPhotos();
    if(!anchor||photos.length<1)return null;

    const usable=[...photos];
    while(usable.length<3)usable.push(...photos.slice(0,Math.min(photos.length,3-usable.length)));

    ensureStyle();

    const root=doc.createElement('div');
    root.className='dini-live-gallery';
    root.setAttribute('data-dini-live-gallery','1');
    root.setAttribute('data-photo-count',String(photos.length));
    root.setAttribute('aria-label','Slideshow foto galeri');

    const viewport=doc.createElement('div');
    viewport.className='dini-live-gallery__viewport';

    const track=doc.createElement('div');
    track.className='dini-live-gallery__track';

    const groupA=doc.createElement('div');
    groupA.className='dini-live-gallery__group';
    groupA.setAttribute('data-dini-live-gallery-group','a');

    const groupB=doc.createElement('div');
    groupB.className='dini-live-gallery__group';
    groupB.setAttribute('data-dini-live-gallery-group','b');
    groupB.setAttribute('aria-hidden','true');

    usable.forEach((photo,index)=>{
      groupA.appendChild(createItem(photo,index,false));
      groupB.appendChild(createItem(photo,index,true));
    });

    track.append(groupA,groupB);
    viewport.appendChild(track);
    root.appendChild(viewport);
    anchor.parentNode?.insertBefore(root,anchor);

    let frame=0;
    let last=performance.now();
    let phase=0;
    let loopWidth=0;

    const layout=()=>{
      const width=viewport.clientWidth;
      if(width<=0)return;
      const gap=window.innerWidth<=360?6:GAP_PX;
      const card=Math.max(72,(width-(gap*2))/3);
      root.style.setProperty('--dini-live-card-width',card+'px');
      loopWidth=groupA.getBoundingClientRect().width;
      if(loopWidth>0)phase%=loopWidth;
    };

    const tick=now=>{
      const dt=Math.min(64,Math.max(0,now-last));
      last=now;
      if(loopWidth>0){
        phase+=(SPEED_PX_PER_SECOND*dt)/1000;
        if(phase>=loopWidth)phase%=loopWidth;
        track.style.transform='translate3d('+(-phase).toFixed(3)+'px,0,0)';
      }
      frame=requestAnimationFrame(tick);
    };

    layout();

    let resizeObserver=null;
    if('ResizeObserver' in window){
      resizeObserver=new ResizeObserver(()=>layout());
      resizeObserver.observe(viewport);
    }else{
      window.addEventListener('resize',layout,{passive:true});
    }

    if(!reduced){
      frame=requestAnimationFrame(tick);
    }else{
      track.style.transform='none';
    }

    const cleanup=()=>{
      if(frame)cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      if(!resizeObserver)window.removeEventListener('resize',layout);
    };
    window.addEventListener('pagehide',cleanup,{once:true});

    root.__diniLiveGallery={
      layout,
      cleanup,
      photos:photos.length,
      speed:SPEED_PX_PER_SECOND
    };

    doc.documentElement.setAttribute('data-dini-live-gallery-runtime',VERSION);
    doc.documentElement.setAttribute('data-dini-live-gallery-count',String(photos.length));
    return root;
  }

  let built=build();

  if(!built){
    let attempts=0;
    const timer=setInterval(()=>{
      attempts++;
      built=build();
      if(built||attempts>=12)clearInterval(timer);
    },250);
  }

  window.DINI_LIVE_STREAM_GALLERY_V1={
    version:VERSION,
    build,
    photos:galleryPhotos
  };
})();