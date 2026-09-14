(()=>{
  'use strict';
  if(window.__DINI_CLEAN_VISIBILITY_PARITY_1241__)return;
  window.__DINI_CLEAN_VISIBILITY_PARITY_1241__=true;
  const VERSION='1.24.1';
  const frame=document.getElementById('cleanFrame');
  if(!frame)return;

  function mobileNone(host){
    if(!host)return false;
    if(String(host.getAttribute('data-native-animation-mobile')||'').toLowerCase()==='none')return true;
    try{return String(JSON.parse(host.getAttribute('data-settings')||'{}')?._animation_mobile||'').toLowerCase()==='none'}catch{return false}
  }

  function revealNode(node,reason='chain'){
    if(!node||node.nodeType!==1)return false;
    let changed=false;
    if(node.classList?.contains('elementor-invisible')){node.classList.remove('elementor-invisible');changed=true}
    const inlineVis=String(node.style?.getPropertyValue('visibility')||'').toLowerCase();
    const inlineOp=String(node.style?.getPropertyValue('opacity')||'').trim();
    if(inlineVis==='hidden'||inlineVis==='collapse'){node.style.removeProperty('visibility');changed=true}
    if(inlineOp==='0'){node.style.removeProperty('opacity');changed=true}
    // Keep this exact visibility chain authoritative even if Elementor re-applies
    // .elementor-invisible after its own animation bootstrap.
    node.style?.setProperty('visibility','visible','important');
    node.style?.setProperty('opacity','1','important');
    node.setAttribute('data-clean-visibility-chain',VERSION);
    node.setAttribute('data-clean-visibility-reason',reason);
    return changed;
  }

  function revealChain(start,reason='chain'){
    if(!start)return 0;
    let fixed=0,p=start,depth=0;
    while(p&&p.nodeType===1&&depth++<32){
      if(revealNode(p,reason))fixed++;
      if(p.tagName==='BODY'||p.tagName==='HTML')break;
      p=p.parentElement;
    }
    return fixed;
  }

  function qualifyingHostForLeaf(leaf){
    let p=leaf;
    while(p&&p.nodeType===1){
      if(mobileNone(p)||p.getAttribute?.('data-dini-visibility-parity')||p.getAttribute?.('data-clean-visibility-chain'))return p;
      p=p.parentElement;
    }
    return null;
  }

  function visibleNow(node){
    if(!node?.isConnected)return false;
    const win=node.ownerDocument?.defaultView;
    if(!win)return false;
    const cs=win.getComputedStyle(node);
    const rect=node.getBoundingClientRect();
    return cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity||1)>0.001&&rect.width>0&&rect.height>0;
  }

  function verifyExact(doc){
    const widget=doc.querySelector('[data-id="43f80b1b"]');
    const leaf=widget?.querySelector('.elementor-heading-title,[data-native-edit-id],[data-native-edit-ids]')||widget;
    if(!widget||!leaf)return {present:false,visible:false,text:''};
    const text=String(leaf.textContent||'').replace(/\s+/g,' ').trim();
    const visible=visibleNow(leaf)&&visibleNow(widget);
    widget.setAttribute('data-clean-visibility-verified',visible?'1':'0');
    widget.setAttribute('data-clean-visibility-text',text.slice(0,160));
    return {present:true,visible,text};
  }

  function apply(){
    const doc=frame.contentDocument;
    if(!doc?.documentElement)return {fixed:0,verified:null};
    let fixed=0;
    const seen=new Set();

    // Generic edited-text path: when an edited text lives inside a mobile-none
    // animation widget, open the entire ancestor chain rather than only the
    // nearest Elementor wrapper.
    for(const leaf of doc.querySelectorAll('[data-native-edit-id],[data-native-edit-ids]')){
      const host=qualifyingHostForLeaf(leaf);
      if(!host||seen.has(host))continue;
      seen.add(host);
      fixed+=revealChain(host,'edited-text-mobile-none');
    }

    // Exact source-native anchor from the audited ZIP. This is intentionally
    // narrow: text/media/guest data are untouched; only visibility ancestors
    // for this one source widget are forced visible.
    const exact=doc.querySelector('[data-id="43f80b1b"]');
    if(exact&&(mobileNone(exact)||exact.getAttribute('data-dini-visibility-parity')||exact.querySelector('[data-native-edit-id],[data-native-edit-ids]'))){
      fixed+=revealChain(exact,'source-43f80b1b');
    }

    const verified=verifyExact(doc);
    doc.documentElement.setAttribute('data-clean-visibility-parity',VERSION);
    doc.documentElement.setAttribute('data-clean-visibility-chain-verified',verified?.visible?'1':'0');
    if(verified?.text)doc.documentElement.setAttribute('data-clean-visibility-chain-text',verified.text.slice(0,160));
    document.documentElement.dataset.cleanVisibilityParity=VERSION;
    document.documentElement.dataset.cleanVisibilityVerified=verified?.visible?'1':'0';
    return {fixed,verified};
  }

  let observer=null,busy=false;
  function install(){
    const doc=frame.contentDocument;
    if(!doc?.documentElement)return;
    observer?.disconnect();
    const run=()=>{
      if(busy)return;
      busy=true;
      try{apply()}finally{busy=false}
    };
    run();
    observer=new MutationObserver(()=>requestAnimationFrame(run));
    observer.observe(doc.documentElement,{subtree:true,childList:true,attributes:true,characterData:true,attributeFilter:['class','style','data-native-animation-mobile','data-dini-visibility-parity','data-native-edit-id','data-native-edit-ids']});
    [0,50,180,500,1200,3000,6000,9000].forEach(ms=>setTimeout(run,ms));
  }

  frame.addEventListener('load',()=>setTimeout(install,0));
  if(frame.contentDocument?.readyState!=='loading')install();
})();
