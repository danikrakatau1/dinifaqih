(function(g){
  'use strict';
  if(g.DINI_PUBLIC_DEVICE_COMPAT_V1?.version)return;

  const VERSION='1.1.0';
  const root=document.documentElement;
  const vv=g.visualViewport;
  const ua=navigator.userAgent||'';
  const isIOS=/iPad|iPhone|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const isAndroid=/Android/i.test(ua);
  const isSafari=/Safari/i.test(ua)&&!/Chrome|CriOS|Edg|OPR|FxiOS/i.test(ua);

  let raf=0;
  let settleTimer=0;
  let lastFrame=null;
  let frameObserver=null;
  let last={w:0,h:0,orientation:''};

  function viewport(){
    const w=Math.max(1,Math.round(vv?.width||g.innerWidth||root.clientWidth||1));
    const h=Math.max(1,Math.round(vv?.height||g.innerHeight||root.clientHeight||1));
    return {w,h,scale:Number(vv?.scale||1)};
  }

  function orientationOf(m){
    return m.w>m.h?'landscape':'portrait';
  }

  function markInner(frame,m){
    try{
      const doc=frame.contentDocument;
      if(!doc?.documentElement)return;
      const r=doc.documentElement;
      r.dataset.diniDeviceCompat=VERSION;
      r.dataset.diniDeviceFamily=isIOS?'ios':isAndroid?'android':'desktop';
      if(isSafari)r.dataset.diniSafari='1';

      if(!doc.getElementById('diniDeviceCompatStyle')){
        const style=doc.createElement('style');
        style.id='diniDeviceCompatStyle';
        // Defensive only: no spacing, typography, section, media or animation changes.
        style.textContent='html{-webkit-text-size-adjust:100%;text-size-adjust:100%;}html,body{max-width:100%;min-width:0;}';
        (doc.head||r).appendChild(style);
      }
    }catch{}
  }

  function bindFrame(frame,m){
    if(!frame)return false;

    if(frame!==lastFrame){
      lastFrame=frame;
      frame.addEventListener('load',()=>schedule(true),{passive:true});
    }

    // IMPORTANT:
    // Do not write pixel heights from visualViewport here.
    // Mobile Chrome/Safari changes visualViewport.height continuously while the
    // browser toolbar expands/collapses during scroll. Writing iframe height on
    // every one of those events caused forced layout/reflow and visible jank.
    // Renderer-owned 100dvh/100vh remains authoritative.
    frame.style.maxWidth='100%';
    frame.dataset.diniDeviceCompat=VERSION;
    frame.dataset.diniViewportHeightPolicy='renderer-css-dvh';
    markInner(frame,m);

    try{frameObserver?.disconnect()}catch{}
    frameObserver=null;
    return true;
  }

  function apply(force=false){
    raf=0;
    const m=viewport();
    const orientation=orientationOf(m);
    const widthChanged=Math.abs(m.w-last.w)>2;
    const orientationChanged=orientation!==last.orientation;

    // Ignore height-only visualViewport churn from mobile browser chrome.
    // Native 100dvh handles that without JS-driven frame relayout.
    if(!force&&!widthChanged&&!orientationChanged&&last.w)return;

    root.dataset.diniDeviceCompat=VERSION;
    root.dataset.diniDeviceFamily=isIOS?'ios':isAndroid?'android':'desktop';
    root.dataset.diniViewportOrientation=orientation;
    root.dataset.diniViewportHeightPolicy='renderer-css-dvh';
    if(isSafari)root.dataset.diniSafari='1';

    bindFrame(document.getElementById('diniPublicCanonicalFrame'),m);
    last={w:m.w,h:m.h,orientation};
  }

  function schedule(force=false){
    if(force){
      if(raf)cancelAnimationFrame(raf);
      raf=requestAnimationFrame(()=>apply(true));
      return;
    }
    if(raf)return;
    raf=requestAnimationFrame(()=>apply(false));
  }

  function settle(){
    clearTimeout(settleTimer);
    settleTimer=setTimeout(()=>schedule(false),180);
  }

  // Width/orientation changes matter. Height-only toolbar animation is ignored.
  addEventListener('resize',settle,{passive:true});
  vv?.addEventListener?.('resize',settle,{passive:true});
  addEventListener('orientationchange',()=>{
    schedule(true);
    setTimeout(()=>schedule(true),180);
    setTimeout(()=>schedule(true),520);
  },{passive:true});

  // Observe only until the canonical iframe is mounted, then disconnect.
  frameObserver=new MutationObserver(()=>{
    if(document.getElementById('diniPublicCanonicalFrame'))schedule(true);
  });
  try{frameObserver.observe(document.body||root,{childList:true,subtree:true})}catch{}

  [0,80,240,700,1600].forEach(ms=>setTimeout(()=>schedule(ms===0),ms));

  g.DINI_PUBLIC_DEVICE_COMPAT_V1={
    version:VERSION,
    viewport,
    apply:()=>schedule(true)
  };
})(window);
