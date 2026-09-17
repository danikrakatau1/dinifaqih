(()=>{
  'use strict';
  if(window.__DINI_UNIVERSAL_GUEST_RUNTIME_V20__)return;
  window.__DINI_UNIVERSAL_GUEST_RUNTIME_V20__=true;

  const VERSION='2.0.1';
  const cfgEl=document.getElementById('diniGuestRuntimeData');
  let cfg={};try{cfg=cfgEl?JSON.parse(cfgEl.textContent||'{}'):{} }catch{}
  const qs=new URLSearchParams(location.search||'');
  const sanitizeName=v=>String(v||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,120);
  const name=sanitizeName(cfg.name||qs.get('to')||'');
  const slug=String(cfg.slug||'').trim();
  if(!name)return;

  document.documentElement.dataset.guestRuntime='v2.0';
  document.documentElement.dataset.guestMutation='text-only';
  if(slug)document.documentElement.dataset.guestSlug=slug;

  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const esc=v=>window.CSS?.escape?CSS.escape(String(v||'')):String(v||'').replace(/[^a-zA-Z0-9_-]/g,'\\$&');
  const sourceTruth=()=>{
    const tpl=document.querySelector('template[data-dini-source-truth]');
    if(!tpl)return{};
    try{return JSON.parse(tpl.content?.textContent||tpl.textContent||'{}')}catch{return{}}
  };
  const byPath=(owner,path)=>{
    let node=owner;
    for(const i of Array.isArray(path)?path:[]){node=node?.children?.[Number(i)];if(!node)return null}
    return node||null;
  };
  const query=(sel,root=document)=>{try{return root.querySelector(sel)}catch{return null}};
  const queryAll=(sel,root=document)=>{try{return [...root.querySelectorAll(sel)]}catch{return[]}};

  function nodesFromField(field){
    const out=[];
    if(field?.owner_selector&&Array.isArray(field?.node_path)){
      for(const owner of queryAll(field.owner_selector)){const node=byPath(owner,field.node_path);if(node)out.push(node)}
    }
    if(field?.element_id&&Array.isArray(field?.node_path)){
      const id=esc(field.element_id);
      const owner=query(`[data-id="${id}"],.elementor-element-${id}`);
      const node=byPath(owner,field.node_path);if(node)out.push(node);
    }
    if(out.length)return out;
    if(field?.node_selector)out.push(...queryAll(field.node_selector));
    if(out.length)return out;
    if(field?.selector)out.push(...queryAll(field.selector));
    return out;
  }

  function boundNodes(){
    const graph=sourceTruth();
    const fields=(graph?.personalization?.fields||[]).filter(f=>String(f?.type||f?.binding||'')==='guest_name');
    const out=[],seen=new Set();
    const add=n=>{if(!n||seen.has(n)||n.matches?.('script,style,noscript,template,iframe,object,input,textarea,select'))return;seen.add(n);out.push(n)};

    // Source Truth is authoritative. Once an exact guest field resolves, do not sweep
    // legacy class/id aliases that may belong to unrelated template text such as footer labels.
    fields.forEach(f=>nodesFromField(f).forEach(add));
    if(out.length)return out;

    [
      '[data-dini-bind="guest_name"]',
      '[data-dini-personalization-field="guest_name"]',
      '[data-native-guest-name]',
      '[data-dini-guest-name]',
      '[data-guest-name]'
    ].forEach(sel=>queryAll(sel).forEach(add));
    if(out.length)return out;

    ['#guestName','.guest-name','.guest_name','.nama-tamu','.nama_tamu'].forEach(sel=>queryAll(sel).forEach(add));
    return out;
  }

  function apply(){
    let changed=0,matched=0;
    for(const node of boundNodes()){
      matched++;
      if(clean(node.textContent)===name)continue;
      node.textContent=name;
      changed++;
    }
    document.documentElement.dataset.guestBoundMatches=String(matched);
    document.documentElement.dataset.guestChanged=String(changed);
    document.documentElement.dataset.guestBinding=matched?'source-native':'missing';
    return {matched,changed};
  }

  let timer=0;
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(apply,25)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  [80,220,600,1400,3000].forEach(ms=>setTimeout(apply,ms));
  const observer=new MutationObserver(mutations=>{
    if(mutations.some(m=>m.type==='childList'&&m.addedNodes?.length))schedule();
  });
  try{observer.observe(document.documentElement,{subtree:true,childList:true})}catch{}
  setTimeout(()=>observer.disconnect(),12000);

  window.DINI_GUEST_RUNTIME_V2={VERSION,apply,boundNodes,sanitizeName};
})();
