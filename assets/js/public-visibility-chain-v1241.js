(()=>{
  'use strict';
  if(window.__DINI_PUBLIC_VISIBILITY_CHAIN_1241__)return;
  window.__DINI_PUBLIC_VISIBILITY_CHAIN_1241__=true;
  const VERSION='1.24.1';

  function mobileNone(host){
    if(!host)return false;
    if(String(host.getAttribute('data-native-animation-mobile')||'').toLowerCase()==='none')return true;
    try{return String(JSON.parse(host.getAttribute('data-settings')||'{}')?._animation_mobile||'').toLowerCase()==='none'}catch{return false}
  }

  function revealNode(node,reason='chain'){
    if(!node||node.nodeType!==1)return false;
    let changed=false;
    if(node.classList?.contains('elementor-invisible')){node.classList.remove('elementor-invisible');changed=true}
    const vis=String(node.style?.getPropertyValue('visibility')||'').toLowerCase();
    const op=String(node.style?.getPropertyValue('opacity')||'').trim();
    if(vis==='hidden'||vis==='collapse'){node.style.removeProperty('visibility');changed=true}
    if(op==='0'){node.style.removeProperty('opacity');changed=true}
    node.style?.setProperty('visibility','visible','important');
    node.style?.setProperty('opacity','1','important');
    node.setAttribute('data-public-visibility-chain',VERSION);
    node.setAttribute('data-public-visibility-reason',reason);
    return changed;
  }

  function revealChain(start,reason='chain'){
    let fixed=0,p=start,depth=0;
    while(p&&p.nodeType===1&&depth++<32){
      if(revealNode(p,reason))fixed++;
      if(p.tagName==='BODY'||p.tagName==='HTML')break;
      p=p.parentElement;
    }
    return fixed;
  }

  function qualifyingHost(leaf){
    let p=leaf;
    while(p&&p.nodeType===1){
      if(mobileNone(p)||p.getAttribute?.('data-dini-visibility-parity')||p.getAttribute?.('data-public-visibility-chain'))return p;
      p=p.parentElement;
    }
    return null;
  }

  function apply(){
    if(!document.documentElement)return 0;
    let fixed=0;
    const seen=new Set();
    for(const leaf of document.querySelectorAll('[data-native-edit-id],[data-native-edit-ids]')){
      const host=qualifyingHost(leaf);
      if(!host||seen.has(host))continue;
      seen.add(host);
      fixed+=revealChain(host,'edited-text-mobile-none');
    }
    const exact=document.querySelector('[data-id="43f80b1b"]');
    if(exact&&(mobileNone(exact)||exact.getAttribute('data-dini-visibility-parity')||exact.querySelector('[data-native-edit-id],[data-native-edit-ids]'))){
      fixed+=revealChain(exact,'source-43f80b1b');
    }
    document.documentElement.dataset.publicVisibilityChain=VERSION;
    return fixed;
  }

  let busy=false,timer=0;
  const run=()=>{if(busy)return;busy=true;try{apply()}finally{busy=false}};
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(run,20)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  window.addEventListener('load',run,{once:true});
  [50,180,500,1200,3000,6000,9000,12000].forEach(ms=>setTimeout(run,ms));
  const observer=new MutationObserver(schedule);
  try{observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','style','data-native-animation-mobile','data-dini-visibility-parity','data-native-edit-id','data-native-edit-ids']})}catch{}
  setTimeout(()=>observer.disconnect(),20000);
})();
