(()=>{
  'use strict';
  if(window.__DINI_UNIVERSAL_GUEST_RUNTIME_V21__)return;
  window.__DINI_UNIVERSAL_GUEST_RUNTIME_V21__=true;

  const VERSION='2.1.0';
  const Core=window.DINI_GUEST_CONTRACT_CORE_V1;
  const cfgEl=document.getElementById('diniGuestRuntimeData');
  let cfg={};try{cfg=cfgEl?JSON.parse(cfgEl.textContent||'{}'):{} }catch{}
  const qs=new URLSearchParams(location.search||'');
  const sanitizeName=v=>String(v||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,120);
  const name=sanitizeName(cfg.name||qs.get('to')||'');
  const slug=String(cfg.slug||'').trim();
  if(!name)return;

  document.documentElement.dataset.guestRuntime='v2.1';
  document.documentElement.dataset.guestMutation='role-aware';
  if(slug)document.documentElement.dataset.guestSlug=slug;

  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const norm=s=>clean(s).toLowerCase();
  const esc=v=>window.CSS?.escape?CSS.escape(String(v||'')):String(v||'').replace(/[^a-zA-Z0-9_-]/g,'\\$&');
  const query=(sel,root=document)=>{try{return root.querySelector(sel)}catch{return null}};
  const queryAll=(sel,root=document)=>{try{return [...root.querySelectorAll(sel)]}catch{return[]}};
  const byPath=(owner,path)=>{let node=owner;for(const i of Array.isArray(path)?path:[]){node=node?.children?.[Number(i)];if(!node)return null}return node||null};

  const parseJsonNode=id=>{
    const el=document.getElementById(id);if(!el)return{};
    try{return JSON.parse(el.textContent||'{}')}catch{return{}}
  };
  const sourceTruth=()=>{
    const tpl=query('template[data-dini-source-truth]');
    if(!tpl)return{};
    try{return JSON.parse(tpl.content?.textContent||tpl.textContent||'{}')}catch{return{}}
  };
  const dedicatedContract=()=>parseJsonNode('diniGuestPersonalizationContract');
  const contractFromSourceTruth=()=>{
    const graph=sourceTruth();
    return graph?.personalization||graph?.runtime_manifest?.personalization||{};
  };

  function legacyNodesFromField(field){
    const out=[];
    if(field?.owner_selector&&Array.isArray(field?.node_path)){
      for(const owner of queryAll(field.owner_selector)){const node=byPath(owner,field.node_path);if(node)out.push(node)}
    }
    if(field?.element_id&&Array.isArray(field?.node_path)){
      const id=esc(field.element_id);const owner=query(`[data-id="${id}"],.elementor-element-${id}`);const node=byPath(owner,field.node_path);if(node)out.push(node)
    }
    if(out.length)return out;
    if(field?.node_selector)out.push(...queryAll(field.node_selector));
    if(out.length)return out;
    if(field?.selector)out.push(...queryAll(field.selector));
    return out;
  }
  const fieldNodes=field=>Core?.resolveFieldNodes?Core.resolveFieldNodes(document,field):legacyNodesFromField(field);

  function currentContract(){
    const direct=dedicatedContract();
    if(Array.isArray(direct?.fields)&&direct.fields.length)return direct;
    const source=contractFromSourceTruth();
    if(Array.isArray(source?.fields)&&source.fields.length)return source;
    if(Core?.scanDocument)return Core.scanDocument(document,source||direct||{},{mark:true});
    return source||direct||{};
  }

  function structuralFallbackNodes(){
    const out=[],seen=new Set();const add=n=>{if(n&&!seen.has(n)){seen.add(n);out.push(n)}};
    [
      '[data-dini-bind="guest_name"]','[data-dini-personalization-field="guest_name"]','[data-native-guest-name]',
      '[data-dini-guest-name]','[data-guest-name]','#guestName','.guest-name','.guest_name','.nama-tamu','.nama_tamu'
    ].forEach(sel=>queryAll(sel).forEach(add));
    if(out.length)return out;
    queryAll('h1,h2,h3,h4,h5,h6,p,span,strong,b,label,div').forEach(node=>{
      if(norm(node.textContent)!=='nama tamu')return;
      const childOwns=[...(node.children||[])].some(child=>norm(child.textContent)==='nama tamu');
      if(!childOwns)add(node);
    });
    return out;
  }

  function boundSlots(){
    let contract=currentContract();
    if((!Array.isArray(contract?.fields)||!contract.fields.length)&&Core?.scanDocument)contract=Core.scanDocument(document,contract||{},{mark:true});
    const slots=[],seen=new Set();
    const add=(node,field={})=>{
      if(!node||seen.has(node)||node.matches?.('script,style,noscript,template,iframe,object'))return;
      seen.add(node);
      const targetKind=field.target_kind||(node.matches?.('input,textarea,select')?'value':'text');
      slots.push({node,field:{...field,target_kind:targetKind,role:field.role||node.getAttribute?.('data-dini-guest-role')||'generic'}});
    };
    for(const field of (Array.isArray(contract?.fields)?contract.fields:[])){
      if(String(field?.type||field?.binding||'')!=='guest_name')continue;
      fieldNodes(field).forEach(node=>add(node,field));
    }
    if(!slots.length)structuralFallbackNodes().forEach(node=>add(node,{type:'guest_name',binding:'guest_name',role:node.getAttribute?.('data-dini-guest-role')||'generic'}));
    return slots;
  }
  const boundNodes=()=>boundSlots().map(x=>x.node);

  function protectUserEdit(node){
    if(!node?.matches?.('input,textarea,select')||node.dataset.diniGuestEditGuard==='1')return;
    node.dataset.diniGuestEditGuard='1';
    const mark=()=>{if(!node.readOnly&&!node.disabled)node.dataset.diniGuestUserEdited='1'};
    node.addEventListener('input',mark,{passive:true});
    node.addEventListener('change',mark,{passive:true});
  }
  function applyValue(node,field){
    protectUserEdit(node);
    const readonly=node.readOnly||node.hasAttribute?.('readonly')||field?.preserve_readonly===true;
    if(node.dataset.diniGuestUserEdited==='1'&&!readonly)return false;
    if(String(node.value||'')===name&&String(node.getAttribute?.('value')||'')===name)return false;
    node.value=name;
    if(node.matches?.('input'))node.setAttribute('value',name);
    node.defaultValue=name;
    node.setAttribute?.('data-dini-guest-name','1');
    if(slug)node.setAttribute?.('data-dini-guest-slug',slug);
    return true;
  }
  function applyText(node){
    if(clean(node.textContent)===name)return false;
    node.textContent=name;
    node.setAttribute?.('data-dini-guest-name','1');
    if(slug)node.setAttribute?.('data-dini-guest-slug',slug);
    return true;
  }

  function apply(){
    let changed=0,matched=0;const roles=new Set();
    for(const {node,field} of boundSlots()){
      matched++;roles.add(field?.role||'generic');
      const target=field?.target_kind||(node.matches?.('input,textarea,select')?'value':'text');
      if(target==='value'||node.matches?.('input,textarea,select')){if(applyValue(node,field))changed++}
      else if(applyText(node))changed++;
    }
    document.documentElement.dataset.guestBoundMatches=String(matched);
    document.documentElement.dataset.guestChanged=String(changed);
    document.documentElement.dataset.guestBinding=matched?'global-contract':'missing';
    document.documentElement.dataset.guestRoles=[...roles].join(',');
    return {matched,changed,roles:[...roles]};
  }

  let timer=0;
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(apply,25)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  [80,220,600,1400,3000,6000].forEach(ms=>setTimeout(apply,ms));
  const observer=new MutationObserver(mutations=>{
    if(mutations.some(m=>m.type==='childList'&&m.addedNodes?.length))schedule();
  });
  try{observer.observe(document.documentElement,{subtree:true,childList:true})}catch{}
  setTimeout(()=>observer.disconnect(),15000);

  window.DINI_GUEST_RUNTIME_V2={VERSION,apply,boundNodes,boundSlots,currentContract,sanitizeName};
})();
