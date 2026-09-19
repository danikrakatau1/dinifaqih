(function(g){
  'use strict';
  if(g.DINI_LIVE_STREAM_GALLERY_STRIP_V1?.version)return;

  const VERSION='1.0.0';
  const doc=document;
  const SPEED_PX_PER_SECOND=26;
  const GAP_PX=7;
  const MIN_ITEM_WIDTH=76;
  const liveText=/\blive\s*stream(?:ing)?\b/i;

  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();

  function optimizeUrl(raw,width=420,quality=70){
    const value=clean(raw);
    if(!value)return'';
    try{
      const u=new URL(value,location.href);
      if(u.hostname.endsWith('.supabase.co')){
        if(u.pathname.includes('/storage/v1/object/public/')){
          u.pathname=u.pathname.replace('/storage/v1/object/public/','/storage/v1/render/image/public/');
        }
        if(u.pathname.includes('/storage/v1/render/image/public/')){
          u.searchParams.set('width',String(width));
          u.searchParams.set('quality',String(quality));
          if(!u.searchParams.get('resize'))u.searchParams.set('resize','contain');
        }
      }
      return u.href;
    }catch{
      return value;
    }
  }

  function backgroundUrl(el){
    const bg=String(el?.style?.backgroundImage||'');
    const match=bg.match(/url\((['"]?)(.*?)\1\)/i);
    return clean(match?.[2]||'');
  }

  function mediaUrl(el){
    const candidates=[
      el?.getAttribute?.('data-dini-gallery-bg-runtime'),
      el?.getAttribute?.('data-thumbnail'),
      el?.getAttribute?.('data-dini-gallery-bg'),
      el?.getAttribute?.('data-src'),
      el?.querySelector?.('img')?.currentSrc,
      el?.querySelector?.('img')?.getAttribute?.('src'),
      backgroundUrl(el)
    ];
    const raw=candidates.map(clean).find(Boolean)||'';
    return optimizeUrl(raw);
  }

  function galleryUrls(){
    const nodes=[
      ...doc.querySelectorAll('.elementor-widget-gallery .e-gallery-image,[data-native-gallery-image][data-thumbnail],.e-gallery-image[data-thumbnail]')
    ];
    const seen=new Set();
    const urls=[];
    for(const el of nodes){
      const url=mediaUrl(el);
      if(!url||seen.has(url))continue;
      seen.add(url);
      urls.push(url);
    }
    return urls;
  }

  function findLiveHeading(){
    const nodes=[...doc.querySelectorAll('.elementor-heading-title,h1,h2,h3,h4,h5,h6')];
    return nodes.find(el=>liveText.test(clean(el.textContent)))||null;
  }

  function findLiveSection(heading){
    const marked=doc.querySelector('[data-dini-live-stream="1"],[data-dini-live-stream-contract]');
    if(marked)return marked;

    try{
      const sections=g.DINI_LIVE_STREAM_CONTRACT_V1?.findSections?.(doc)||[];
      if(sections[0])return sections[0];
    }catch{}

    if(heading){
      return heading.closest('.elementor-top-section,.elementor-section,.e-con,section')||heading.parentElement;
    }
    return null;
  }

  function ensureStyle(){
    if(doc.getElementById('diniLiveGalleryStripStyle'))return;
    const style=doc.createElement('style');
    style.id='diniLiveGalleryStripStyle';
    style.textContent=`
      [data-dini-live-gallery-strip]{
        --dini-strip-gap:${GAP_PX}px;
        --dini-strip-item-w:100px;
        --dini-strip-duration:24s;
        --dini-strip-distance-neg:-600px;
        position:relative;
        display:block;
        width:100%;
        max-width:100%;
        margin:0 auto clamp(18px,5vw,28px);
        padding:2px 0;
        overflow:hidden;
        box-sizing:border-box;
        contain:layout paint;
        isolation:isolate;
      }
      [data-dini-live-gallery-strip-track]{
        display:flex;
        width:max-content;
        max-width:none;
        transform:translate3d(0,0,0);
        animation:diniLiveGalleryStripMove var(--dini-strip-duration) linear infinite;
        will-change:transform;
        backface-visibility:hidden;
        -webkit-backface-visibility:hidden;
      }
      [data-dini-live-gallery-strip-group]{
        display:flex;
        flex:0 0 auto;
        align-items:stretch;
        gap:var(--dini-strip-gap);
        padding-right:var(--dini-strip-gap);
        box-sizing:border-box;
      }
      [data-dini-live-gallery-strip-item]{
        flex:0 0 var(--dini-strip-item-w);
        width:var(--dini-strip-item-w);
        aspect-ratio:4/5;
        position:relative;
        overflow:hidden;
        border-radius:8px;
        box-sizing:border-box;
        border:1px solid rgba(84,62,42,.12);
        background:rgba(84,62,42,.04);
        box-shadow:0 5px 14px rgba(46,31,20,.09);
        transform:translateZ(0);
      }
      [data-dini-live-gallery-strip-item] img{
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
        pointer-events:none;
      }
      @keyframes diniLiveGalleryStripMove{
        from{transform:translate3d(0,0,0)}
        to{transform:translate3d(var(--dini-strip-distance-neg),0,0)}
      }
      @media (prefers-reduced-motion:reduce){
        [data-dini-live-gallery-strip-track]{
          animation:none!important;
          transform:none!important;
          will-change:auto!important;
        }
        [data-dini-live-gallery-strip-group][data-dini-live-gallery-strip-clone="1"]{
          display:none!important;
        }
      }
    `;
    (doc.head||doc.documentElement).appendChild(style);
  }

  function makeGroup(urls,clone){
    const group=doc.createElement('div');
    group.setAttribute('data-dini-live-gallery-strip-group','1');
    if(clone)group.setAttribute('data-dini-live-gallery-strip-clone','1');

    for(const url of urls){
      const item=doc.createElement('div');
      item.setAttribute('data-dini-live-gallery-strip-item','1');
      const img=doc.createElement('img');
      img.src=url;
      img.alt='';
      img.loading='lazy';
      img.decoding='async';
      img.draggable=false;
      img.setAttribute('aria-hidden','true');
      item.appendChild(img);
      group.appendChild(item);
    }
    return group;
  }

  function insertionAnchor(section,heading){
    if(heading){
      const widget=heading.closest('.elementor-widget');
      if(widget?.parentElement)return widget;
      if(heading.parentElement)return heading;
    }

    const first=section?.firstElementChild||null;
    return first;
  }

  function syncMetrics(viewport,track,group){
    if(!viewport?.isConnected||!group?.isConnected)return;
    const width=Math.max(0,viewport.getBoundingClientRect().width);
    if(!width)return;

    const itemWidth=Math.max(MIN_ITEM_WIDTH,(width-(GAP_PX*2))/3);
    viewport.style.setProperty('--dini-strip-item-w',itemWidth.toFixed(2)+'px');

    requestAnimationFrame(()=>{
      const distance=group.getBoundingClientRect().width;
      if(!distance)return;
      const duration=Math.max(10,distance/SPEED_PX_PER_SECOND);
      viewport.style.setProperty('--dini-strip-duration',duration.toFixed(3)+'s');
      viewport.style.setProperty('--dini-strip-distance-neg',(-distance).toFixed(2)+'px');
      viewport.setAttribute('data-dini-live-gallery-strip-speed',String(SPEED_PX_PER_SECOND));
      viewport.setAttribute('data-dini-live-gallery-strip-distance',distance.toFixed(2));
    });
  }

  function mount(){
    if(doc.querySelector('[data-dini-live-gallery-strip]'))return true;

    const urls=galleryUrls();
    if(!urls.length)return false;

    const heading=findLiveHeading();
    const section=findLiveSection(heading);
    if(!section)return false;

    const anchor=insertionAnchor(section,heading);
    if(!anchor?.parentElement)return false;

    ensureStyle();

    const viewport=doc.createElement('div');
    viewport.setAttribute('data-dini-live-gallery-strip','1');
    viewport.setAttribute('data-dini-live-gallery-strip-version',VERSION);
    viewport.setAttribute('aria-hidden','true');

    const track=doc.createElement('div');
    track.setAttribute('data-dini-live-gallery-strip-track','1');

    const groupA=makeGroup(urls,false);
    const groupB=makeGroup(urls,true);
    track.append(groupA,groupB);
    viewport.appendChild(track);
    anchor.parentElement.insertBefore(viewport,anchor);

    const sync=()=>syncMetrics(viewport,track,groupA);
    requestAnimationFrame(()=>requestAnimationFrame(sync));

    if('ResizeObserver'in g){
      const ro=new ResizeObserver(sync);
      ro.observe(viewport);
      viewport.__diniLiveGalleryStripResizeObserver=ro;
    }else{
      let resizeTimer=0;
      const onResize=()=>{
        clearTimeout(resizeTimer);
        resizeTimer=setTimeout(sync,80);
      };
      g.addEventListener('resize',onResize,{passive:true});
    }

    doc.documentElement.setAttribute('data-dini-live-gallery-strip',VERSION);
    doc.documentElement.setAttribute('data-dini-live-gallery-strip-count',String(urls.length));
    return true;
  }

  function boot(){
    if(mount())return;

    let settled=false;
    const finish=()=>{
      if(settled)return;
      settled=true;
      try{observer.disconnect()}catch{}
    };
    const attempt=()=>{
      if(settled)return;
      if(mount())finish();
    };

    const observer=new MutationObserver(attempt);
    try{observer.observe(doc.documentElement,{subtree:true,childList:true})}catch{}

    [80,220,600,1400,2800,5000].forEach(ms=>setTimeout(attempt,ms));
    setTimeout(finish,7000);
  }

  g.DINI_LIVE_STREAM_GALLERY_STRIP_V1={
    version:VERSION,
    mount,
    galleryUrls,
    optimizeUrl
  };

  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})(window);
