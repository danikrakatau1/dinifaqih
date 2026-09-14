(()=>{
  'use strict';
  if(window.__DINI_CANONICAL_CONSUMER_PARITY_1250__)return;
  window.__DINI_CANONICAL_CONSUMER_PARITY_1250__=true;

  const VERSION='1.25.0';
  const dataEl=document.getElementById('diniSnapshotAuthorityData');
  if(!dataEl)return;

  let payload={};
  try{payload=JSON.parse(dataEl.textContent||'{}')}catch(err){console.error('CANONICAL_CONSUMER_PARITY_DATA',err);return}

  const schema=payload.schema||{};
  const resolved=window.DINI_TEMPLATE_CANONICAL_V1160?.resolveValues?.(schema,payload.values||{});
  const values=resolved?.values||payload.values||{};
  const esc=v=>(window.CSS?.escape?CSS.escape(String(v||'')):String(v||'').replace(/["\\]/g,'\\$&'));
  const norm=v=>String(v??'').replace(/\s+/g,' ').trim();
  const TEXT_SEL='h1,h2,h3,h4,h5,h6,p,span,a,label,button,strong,em,small,li,td,th,input,textarea,select';
  let busy=false,observer=null,raf=0;

  function isGuestNode(n){
    return !!n?.closest?.('[data-native-guest-name],[data-dini-guest-name],[data-dini-guest-injected],[data-dini-guest-source-probe-widget]');
  }

  function mobileNone(host){
    if(!host)return false;
    if(String(host.getAttribute('data-native-animation-mobile')||'').toLowerCase()==='none')return true;
    try{return String(JSON.parse(host.getAttribute('data-settings')||'{}')?._animation_mobile||'').toLowerCase()==='none'}catch{return false}
  }

  function leafNodes(root){
    if(!root)return[];
    const all=[...root.querySelectorAll?.(TEXT_SEL)||[]].filter(n=>!isGuestNode(n));
    const leaves=all.filter(n=>![...n.children||[]].some(c=>c.matches?.(TEXT_SEL)&&norm(c.textContent)));
    return leaves.length?leaves:all;
  }

  function markedLeaf(root,id){
    if(!root||!id)return null;
    try{
      if(root.matches?.(`[data-native-edit-id="${esc(id)}"]`))return root;
      const exact=root.querySelector?.(`[data-native-edit-id="${esc(id)}"]`);
      if(exact&&!isGuestNode(exact))return exact;
      return [...(root.querySelectorAll?.('[data-native-edit-ids]')||[])].find(n=>!isGuestNode(n)&&(n.getAttribute('data-native-edit-ids')||'').split(/[\s,]+/).filter(Boolean).includes(id))||null;
    }catch{return null}
  }

  function chooseLeaf(host,f,value){
    if(!host||isGuestNode(host))return null;
    const marked=markedLeaf(host,f.id);if(marked)return marked;
    if(host.matches?.('input,textarea,select'))return host;
    const heading=[...host.querySelectorAll?.('.elementor-heading-title')||[]].filter(n=>!isGuestNode(n));
    if(heading.length===1)return heading[0];
    const form=host.querySelector?.('input,textarea,select');if(form&&!isGuestNode(form))return form;
    const list=leafNodes(host),want=norm(value),old=norm(f.value??f.source_text??'');
    let hit=list.find(n=>want&&norm(n.matches?.('input,textarea,select')?n.value:n.textContent)===want);if(hit)return hit;
    hit=list.find(n=>old&&norm(n.matches?.('input,textarea,select')?n.value:n.textContent)===old);if(hit)return hit;
    return list.length===1?list[0]:(host.matches?.(TEXT_SEL)?host:null);
  }

  function directLeaf(f,value){
    let n=markedLeaf(document,f.id);
    if(n&&!isGuestNode(n))return {leaf:n,host:n.closest?.('[data-id]')||n};
    if(f.source_element_id){
      const host=document.querySelector(`[data-id="${esc(f.source_element_id)}"]`);
      const leaf=chooseLeaf(host,f,value);
      if(leaf)return {leaf,host};
    }
    if(f.node_id){
      const node=document.querySelector(`[data-native-node-id="${esc(f.node_id)}"]`);
      if(node&&!isGuestNode(node))return {leaf:chooseLeaf(node,f,value)||node,host:node.closest?.('[data-id]')||node};
    }
    return {leaf:null,host:null};
  }

  function writeText(leaf,value){
    if(!leaf)return false;
    if(leaf.matches?.('input,textarea,select')){
      if(leaf.value!==value)leaf.value=value;
      leaf.setAttribute('value',value);
    }else if(leaf.textContent!==value){
      leaf.textContent=value;
    }
    leaf.setAttribute('data-canonical-consumer-text',VERSION);
    return true;
  }

  function revealNode(node,reason){
    if(!node||node.nodeType!==1)return;
    node.classList?.remove('elementor-invisible');
    node.hidden=false;
    node.removeAttribute?.('aria-hidden');
    const cs=getComputedStyle(node);
    if(cs.display==='none')node.style.setProperty('display',node.matches?.('span,a,strong,em,small')?'inline':'block','important');
    node.style.setProperty('visibility','visible','important');
    node.style.setProperty('opacity','1','important');
    node.style.removeProperty('max-height');
    node.setAttribute('data-canonical-consumer-visible',VERSION);
    node.setAttribute('data-canonical-consumer-reason',reason);
  }

  function revealChain(start,reason){
    let p=start,depth=0;
    while(p&&p.nodeType===1&&depth++<32){
      revealNode(p,reason);
      if(p.tagName==='BODY'||p.tagName==='HTML')break;
      p=p.parentElement;
    }
  }

  function shouldReveal(f,host,leaf){
    if(!host&&!leaf)return false;
    // Exact audited source widget: edited footer text in the Art Jawa source.
    if(String(f.source_element_id||'')==='43f80b1b')return true;
    if(host?.getAttribute?.('data-dini-visibility-parity'))return true;
    if(host?.getAttribute?.('data-clean-visibility-chain'))return true;
    if(mobileNone(host))return true;
    if(String(f.text_leaf_locked||'').startsWith('1.23')||String(f.text_leaf_locked||'').startsWith('1.24'))return mobileNone(host)||host?.classList?.contains('elementor-invisible');
    return false;
  }

  function applyField(f){
    if(f?.kind!=='text'||!f.id)return false;
    const value=String(values[f.id]??f.value??'');
    const {leaf,host}=directLeaf(f,value);
    if(!leaf||isGuestNode(leaf))return false;
    writeText(leaf,value);
    if(shouldReveal(f,host,leaf))revealChain(host||leaf,'text-'+f.id);
    return true;
  }

  function applyAll(){
    if(busy)return;
    busy=true;
    try{
      let applied=0;
      for(const f of schema.fields||[])if(applyField(f))applied++;
      document.documentElement.dataset.canonicalConsumerParity=VERSION;
      document.documentElement.dataset.canonicalConsumerTextApplied=String(applied);
      const exact=document.querySelector('[data-id="43f80b1b"]');
      if(exact){
        const leaf=exact.querySelector('.elementor-heading-title,[data-native-edit-id],[data-native-edit-ids]')||exact;
        document.documentElement.dataset.canonicalConsumerExactText=norm(leaf.textContent).slice(0,120);
      }
    }finally{busy=false}
  }

  function schedule(){
    if(busy||raf)return;
    raf=requestAnimationFrame(()=>{raf=0;applyAll()});
  }

  function install(){
    applyAll();
    [60,180,500,1200,3000,6000,10000,16000].forEach(ms=>setTimeout(applyAll,ms));
    observer?.disconnect();
    observer=new MutationObserver(schedule);
    try{observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','style','hidden','aria-hidden','data-native-edit-id','data-native-edit-ids','data-settings']})}catch{}
    setTimeout(()=>observer?.disconnect(),22000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.addEventListener('load',applyAll,{once:true});
})();
