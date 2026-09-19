(()=>{
  'use strict';
  if(window.__DINI_CANONICAL_CONSUMER_BRIDGE_1250__)return;
  window.__DINI_CANONICAL_CONSUMER_BRIDGE_1250__=true;
  const VERSION='1.25.2';
  const FRAME_IDS=['templatePreviewFrame','diniPublicCanonicalFrame'];
  const injected=new WeakSet();

  function inject(frame){
    if(!frame||injected.has(frame))return;
    const doc=frame.contentDocument;
    if(!doc?.documentElement)return;
    if(!doc.getElementById('diniSnapshotAuthorityData'))return;
    if(!doc.querySelector('script[data-canonical-consumer-parity]')){
      const s=doc.createElement('script');
      s.src='/assets/js/canonical-consumer-parity-v1250.js?v=1250';
      s.setAttribute('data-canonical-consumer-parity','1.25.0');
      s.onload=()=>{try{frame.dataset.canonicalConsumerParity='1.25.0'}catch{}};
      (doc.body||doc.documentElement).appendChild(s);
    }
    if(!doc.querySelector('script[data-dini-global-copy-feedback]')){
      const c=doc.createElement('script');
      c.src='/assets/js/global-copy-feedback-v1.js?v=110';
      c.setAttribute('data-dini-global-copy-feedback','1.1.0');
      c.onload=()=>{try{frame.dataset.globalCopyFeedback='1.1.0'}catch{}};
      (doc.body||doc.documentElement).appendChild(c);
    }
    injected.add(frame);
  }

  function bind(frame){
    if(!frame||frame.dataset.canonicalConsumerBridge===VERSION)return;
    frame.dataset.canonicalConsumerBridge=VERSION;
    frame.addEventListener('load',()=>{setTimeout(()=>inject(frame),0);[80,250,700,1600,3500].forEach(ms=>setTimeout(()=>inject(frame),ms))});
    [0,60,180,500,1200,3000].forEach(ms=>setTimeout(()=>inject(frame),ms));
  }

  const isPublic=!!window.DINI_PUBLIC_ENTRY||!!document.querySelector('meta[name="dini-public-renderer"]');
  let mo=null;

  function scan(){
    let publicFrameFound=false;
    for(const id of FRAME_IDS){
      const frame=document.getElementById(id);
      if(frame){
        bind(frame);
        if(id==='diniPublicCanonicalFrame')publicFrameFound=true;
      }
    }
    document.documentElement.dataset.canonicalConsumerBridge=VERSION;
    if(isPublic&&publicFrameFound&&mo){
      mo.disconnect();
      mo=null;
      document.documentElement.dataset.canonicalConsumerBridgeWatch='settled';
    }
    return publicFrameFound;
  }

  const found=scan();
  if(!(isPublic&&found)){
    mo=new MutationObserver(scan);
    try{
      const root=isPublic?(document.body||document.documentElement):document.documentElement;
      mo.observe(root,{subtree:!isPublic,childList:true});
    }catch{}
  }
  const scans=isPublic?[120,500,1500,4000]:[100,300,800,1800,4000,8000,14000];
  scans.forEach(ms=>setTimeout(scan,ms));
  setTimeout(()=>{mo?.disconnect();mo=null},isPublic?6000:20000);
})();
