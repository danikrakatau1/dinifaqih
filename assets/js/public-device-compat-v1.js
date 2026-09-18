(function(g){
  'use strict';
  if(g.DINI_PUBLIC_DEVICE_COMPAT_V1?.version)return;
  const VERSION='1.0.0';
  const root=document.documentElement;
  const vv=g.visualViewport;
  const ua=navigator.userAgent||'';
  const isIOS=/iPad|iPhone|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const isAndroid=/Android/i.test(ua);
  const isSafari=/Safari/i.test(ua)&&!/Chrome|CriOS|Edg|OPR|FxiOS/i.test(ua);
  let raf=0,lastFrame=null;

  function viewport(){
    const w=Math.max(1,Math.round(vv?.width||g.innerWidth||root.clientWidth||1));
    const h=Math.max(1,Math.round(vv?.height||g.innerHeight||root.clientHeight||1));
    return {w,h,scale:Number(vv?.scale||1)};
  }
  function markInner(frame,m){
    try{
      const doc=frame.contentDocument;if(!doc?.documentElement)return;
      const r=doc.documentElement;
      r.style.setProperty('--dini-visual-viewport-height',m.h+'px');
      r.style.setProperty('--dini-visual-viewport-width',m.w+'px');
      r.style.setProperty('--dini-visual-viewport-scale',String(m.scale));
      r.dataset.diniDeviceCompat=VERSION;
      r.dataset.diniDeviceFamily=isIOS?'ios':isAndroid?'android':'desktop';
      if(isSafari)r.dataset.diniSafari='1';
      if(!doc.getElementById('diniDeviceCompatStyle')){
        const style=doc.createElement('style');
        style.id='diniDeviceCompatStyle';
        style.textContent='html{-webkit-text-size-adjust:100%;text-size-adjust:100%;}html,body{max-width:100%;min-width:0;}';
        (doc.head||r).appendChild(style);
      }
    }catch{}
  }
  function bindFrame(frame,m){
    if(!frame)return;
    if(frame!==lastFrame){
      lastFrame=frame;
      frame.addEventListener('load',()=>schedule(),{passive:true});
    }
    // Height only follows the real visual viewport. Width/layout remains source-authoritative.
    frame.style.height=m.h+'px';
    frame.style.minHeight=m.h+'px';
    frame.style.maxHeight=m.h+'px';
    frame.style.maxWidth='100%';
    frame.dataset.diniDeviceCompat=VERSION;
    markInner(frame,m);
  }
  function apply(){
    raf=0;
    const m=viewport();
    root.style.setProperty('--dini-visual-viewport-height',m.h+'px');
    root.style.setProperty('--dini-visual-viewport-width',m.w+'px');
    root.style.setProperty('--dini-visual-viewport-scale',String(m.scale));
    root.dataset.diniDeviceCompat=VERSION;
    root.dataset.diniDeviceFamily=isIOS?'ios':isAndroid?'android':'desktop';
    root.dataset.diniViewportOrientation=m.w>m.h?'landscape':'portrait';
    if(isSafari)root.dataset.diniSafari='1';
    bindFrame(document.getElementById('diniPublicCanonicalFrame'),m);
  }
  function schedule(){
    if(raf)return;
    raf=requestAnimationFrame(apply);
  }

  addEventListener('resize',schedule,{passive:true});
  addEventListener('orientationchange',()=>{schedule();setTimeout(schedule,120);setTimeout(schedule,420)},{passive:true});
  vv?.addEventListener?.('resize',schedule,{passive:true});

  const mo=new MutationObserver(schedule);
  try{mo.observe(root,{subtree:true,childList:true})}catch{}
  [0,80,240,700,1600,3500].forEach(ms=>setTimeout(schedule,ms));

  g.DINI_PUBLIC_DEVICE_COMPAT_V1={version:VERSION,viewport,apply:schedule};
})(window);
