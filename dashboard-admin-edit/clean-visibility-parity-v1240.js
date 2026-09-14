(()=>{
  'use strict';
  if(window.__DINI_CLEAN_VISIBILITY_PARITY_1240__)return;
  window.__DINI_CLEAN_VISIBILITY_PARITY_1240__=true;
  const VERSION='1.24.0';
  const frame=document.getElementById('cleanFrame');
  if(!frame)return;

  function mobileNone(host){
    if(!host)return false;
    if(String(host.getAttribute('data-native-animation-mobile')||'').toLowerCase()==='none')return true;
    try{return String(JSON.parse(host.getAttribute('data-settings')||'{}')?._animation_mobile||'').toLowerCase()==='none'}catch{return false}
  }
  function revealHost(host){
    if(!host)return false;
    let changed=false;
    if(host.classList?.contains('elementor-invisible')){host.classList.remove('elementor-invisible');changed=true}
    const vis=host.style?.getPropertyValue('visibility');
    const op=host.style?.getPropertyValue('opacity');
    if(vis==='hidden'){host.style.removeProperty('visibility');changed=true}
    if(op==='0'){host.style.removeProperty('opacity');changed=true}
    if(changed)host.setAttribute('data-clean-visibility-parity',VERSION);
    return changed;
  }
  function hostForLeaf(leaf){
    let p=leaf;
    while(p&&p.nodeType===1){
      if(p.classList?.contains('elementor-invisible')||p.hasAttribute?.('data-native-animation-mobile')||p.hasAttribute?.('data-settings')){
        if(mobileNone(p)||p.getAttribute?.('data-dini-visibility-parity'))return p;
      }
      p=p.parentElement;
    }
    return null;
  }
  function apply(){
    const doc=frame.contentDocument;
    if(!doc?.documentElement)return 0;
    let fixed=0;
    const leaves=[...doc.querySelectorAll('[data-native-edit-id],[data-native-edit-ids]')];
    const seen=new Set();
    for(const leaf of leaves){
      const host=hostForLeaf(leaf);
      if(!host||seen.has(host))continue;
      seen.add(host);
      if(revealHost(host))fixed++;
    }
    // Exact source-native fallback for the edited bottom heading from this source.
    const exact=doc.querySelector('[data-id="43f80b1b"]');
    if(exact&&(mobileNone(exact)||exact.getAttribute('data-dini-visibility-parity'))){
      if(revealHost(exact))fixed++;
    }
    doc.documentElement.setAttribute('data-clean-visibility-parity',VERSION);
    document.documentElement.dataset.cleanVisibilityParity=VERSION;
    return fixed;
  }

  let observer=null,busy=false;
  function install(){
    const doc=frame.contentDocument;
    if(!doc?.documentElement)return;
    observer?.disconnect();
    const run=()=>{if(busy)return;busy=true;try{apply()}finally{busy=false}};
    run();
    observer=new MutationObserver(()=>requestAnimationFrame(run));
    observer.observe(doc.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','data-native-animation-mobile','data-dini-visibility-parity']});
    [50,180,500,1200,3000,6000].forEach(ms=>setTimeout(run,ms));
  }

  frame.addEventListener('load',()=>setTimeout(install,0));
  if(frame.contentDocument?.readyState!=='loading')install();
})();
