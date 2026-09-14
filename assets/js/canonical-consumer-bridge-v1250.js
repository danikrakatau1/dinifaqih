(()=>{
  'use strict';
  if(window.__DINI_CANONICAL_CONSUMER_BRIDGE_1250__)return;
  window.__DINI_CANONICAL_CONSUMER_BRIDGE_1250__=true;
  const VERSION='1.25.0';
  const FRAME_IDS=['templatePreviewFrame','diniPublicCanonicalFrame'];
  const injected=new WeakSet();

  function inject(frame){
    if(!frame||injected.has(frame))return;
    const doc=frame.contentDocument;
    if(!doc?.documentElement)return;
    if(!doc.getElementById('diniSnapshotAuthorityData'))return;
    if(doc.querySelector('script[data-canonical-consumer-parity="1.25.0"]')){injected.add(frame);return}
    const s=doc.createElement('script');
    s.src='/assets/js/canonical-consumer-parity-v1250.js?v=1250';
    s.setAttribute('data-canonical-consumer-parity',VERSION);
    s.onload=()=>{try{frame.dataset.canonicalConsumerParity=VERSION}catch{}};
    (doc.body||doc.documentElement).appendChild(s);
    injected.add(frame);
  }

  function bind(frame){
    if(!frame||frame.dataset.canonicalConsumerBridge===VERSION)return;
    frame.dataset.canonicalConsumerBridge=VERSION;
    frame.addEventListener('load',()=>{setTimeout(()=>inject(frame),0);[80,250,700,1600,3500].forEach(ms=>setTimeout(()=>inject(frame),ms))});
    [0,60,180,500,1200,3000].forEach(ms=>setTimeout(()=>inject(frame),ms));
  }

  function scan(){
    for(const id of FRAME_IDS)bind(document.getElementById(id));
    document.documentElement.dataset.canonicalConsumerBridge=VERSION;
  }

  scan();
  const mo=new MutationObserver(scan);
  try{mo.observe(document.documentElement,{subtree:true,childList:true})}catch{}
  [100,300,800,1800,4000,8000,14000].forEach(ms=>setTimeout(scan,ms));
  setTimeout(()=>mo.disconnect(),20000);
})();
