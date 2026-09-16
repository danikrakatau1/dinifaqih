(()=>{
  'use strict';
  if(window.__DINI_PUBLIC_PERSONALIZATION_BRIDGE_V1__)return;
  window.__DINI_PUBLIC_PERSONALIZATION_BRIDGE_V1__=true;

  const VERSION='1.0.0';
  const sanitizeName=v=>String(v||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,120);
  const name=sanitizeName(new URLSearchParams(location.search).get('to')||'');
  if(!name)return;

  document.documentElement.dataset.publicPersonalization='v1';
  document.documentElement.dataset.publicPersonalizationMode='text-only';

  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const esc=(doc,v)=>doc?.defaultView?.CSS?.escape?doc.defaultView.CSS.escape(String(v||'')):String(v||'').replace(/[^a-zA-Z0-9_-]/g,'\\$&');
  const query=(doc,sel,root=doc)=>{try{return root?.querySelector?.(sel)||null}catch{return null}};
  const queryAll=(doc,sel,root=doc)=>{try{return [...(root?.querySelectorAll?.(sel)||[])]}catch{return[]}};
  const sourceTruth=doc=>{
    const tpl=query(doc,'template[data-dini-source-truth]');
    if(!tpl)return{};
    try{return JSON.parse(tpl.content?.textContent||tpl.textContent||'{}')}catch{return{}}
  };
  const byPath=(owner,path)=>{
    let node=owner;
    for(const i of Array.isArray(path)?path:[]){node=node?.children?.[Number(i)];if(!node)return null}
    return node||null;
  };

  function fieldNodes(doc,field){
    const out=[];
    if(field?.node_selector)out.push(...queryAll(doc,field.node_selector));
    if(field?.selector)out.push(...queryAll(doc,field.selector));
    if(field?.owner_selector&&Array.isArray(field?.node_path)){
      for(const owner of queryAll(doc,field.owner_selector)){const node=byPath(owner,field.node_path);if(node)out.push(node)}
    }
    if(field?.element_id&&Array.isArray(field?.node_path)){
      const id=esc(doc,field.element_id);
      const owner=query(doc,`[data-id="${id}"],.elementor-element-${id}`);
      const node=byPath(owner,field.node_path);if(node)out.push(node);
    }
    return out;
  }

  function boundNodes(doc){
    if(!doc)return[];
    const graph=sourceTruth(doc);
    const fields=(graph?.personalization?.fields||[]).filter(f=>String(f?.type||f?.binding||'')==='guest_name');
    const out=[],seen=new Set();
    const add=n=>{if(!n||seen.has(n)||n.matches?.('script,style,noscript,template,iframe,object,input,textarea,select'))return;seen.add(n);out.push(n)};
    fields.forEach(f=>fieldNodes(doc,f).forEach(add));
    [
      '[data-dini-bind="guest_name"]',
      '[data-dini-personalization-field="guest_name"]',
      '[data-native-guest-name]',
      '[data-dini-guest-name]',
      '[data-guest-name]',
      '#guestName','.guest-name','.guest_name','.nama-tamu','.nama_tamu'
    ].forEach(sel=>queryAll(doc,sel).forEach(add));
    return out;
  }

  function applyToFrame(frame){
    const doc=frame?.contentDocument;if(!doc)return {matched:0,changed:0};
    let matched=0,changed=0;
    for(const node of boundNodes(doc)){
      matched++;
      if(clean(node.textContent)===name)continue;
      node.textContent=name;
      changed++;
    }
    document.documentElement.dataset.publicGuestMatches=String(matched);
    document.documentElement.dataset.publicGuestChanged=String(changed);
    document.documentElement.dataset.publicGuestParity=matched?'template-node':'missing-binding';
    return {matched,changed};
  }

  let observer=null,timer=0,lastFrame=null;
  function bind(frame){
    if(!frame||frame===lastFrame)return;
    lastFrame=frame;
    const run=()=>applyToFrame(frame);
    frame.addEventListener('load',()=>{run();setTimeout(run,80);setTimeout(run,400)},{once:false});
    run();
    try{
      observer?.disconnect();
      observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(run,25)});
      observer.observe(frame.contentDocument?.documentElement,{subtree:true,childList:true});
      setTimeout(()=>observer?.disconnect(),12000);
    }catch{}
  }

  function discover(){
    const frame=document.getElementById('diniPublicCanonicalFrame');
    if(frame)bind(frame);
  }
  discover();
  const rootObserver=new MutationObserver(discover);
  try{rootObserver.observe(document.documentElement,{subtree:true,childList:true})}catch{}
  [50,150,400,900,1800,3500].forEach(ms=>setTimeout(discover,ms));
  setTimeout(()=>rootObserver.disconnect(),10000);

  window.DINI_PUBLIC_PERSONALIZATION_BRIDGE_V1={VERSION,applyToFrame,boundNodes,sanitizeName};
})();
