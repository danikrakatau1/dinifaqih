(()=>{
  'use strict';
  if(window.__DINI_UNIVERSAL_GUEST_RUNTIME_V214__)return;
  window.__DINI_UNIVERSAL_GUEST_RUNTIME_V214__=true;

  const VERSION='2.1.4';
  const Core=window.DINI_GUEST_CONTRACT_CORE_V1;
  const cfgEl=document.getElementById('diniGuestRuntimeData');
  let cfg={};try{cfg=cfgEl?JSON.parse(cfgEl.textContent||'{}'):{} }catch{}
  const qs=new URLSearchParams(location.search||'');
  const sanitizeName=v=>String(v||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,120);
  const name=sanitizeName(cfg.name||qs.get('to')||'');
  const slug=String(cfg.slug||'').trim();
  if(!name)return;

  document.documentElement.dataset.guestRuntime='v2.1.4';
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
    const source=contractFromSourceTruth();
    const base=(Array.isArray(direct?.fields)&&direct.fields.length)?direct:((Array.isArray(source?.fields)&&source.fields.length)?source:(direct&&Object.keys(direct).length?direct:source||{}));
    if(Core?.scanDocument)return Core.scanDocument(document,base||{},{mark:true,allowSemanticSynthesis:true});
    return base||{};
  }

  const coverRootFor=node=>node?.closest?.('#cover,.elementor-top-section,section,.elementor-section')||null;
  function pruneLegacyProbeCoverDuplicate(){
    if(!Core?.coverCandidates)return 0;
    let candidates=[];
    try{candidates=Core.coverCandidates(document,{allowSemanticSynthesis:true})||[]}catch{}
    const canonical=candidates.find(node=>node?.getAttribute?.('data-dini-guest-source-probe')!=='1')||candidates[0]||null;
    const root=coverRootFor(canonical);
    if(!canonical||!root)return 0;
    let pruned=0;
    for(const probe of queryAll('[data-dini-guest-source-probe="1"]')){
      if(probe===canonical||probe.contains?.(canonical)||canonical.contains?.(probe))continue;
      if(coverRootFor(probe)!==root)continue;
      const owner=probe.closest?.('[data-dini-guest-source-probe-widget="1"]');
      if(owner&&owner!==root&&!owner.contains?.(canonical)){owner.remove();pruned++}
      else{probe.remove();pruned++}
    }
    document.documentElement.dataset.guestProbeDuplicatesPruned=String(pruned);
    return pruned;
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
    if((!Array.isArray(contract?.fields)||!contract.fields.length)&&Core?.scanDocument)contract=Core.scanDocument(document,contract||{},{mark:true,allowSemanticSynthesis:true});
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
  function safeTextTarget(node){
    if(!node||node.nodeType!==1)return false;
    if(node.matches?.('input,textarea,select'))return true;
    // Guest personalization must never collapse a structural/container node.
    // A textContent write on a wrapper with element children would destroy the
    // template subtree (for example headings/images that share the same column).
    if((node.children?.length||0)>0){
      node.setAttribute?.('data-dini-guest-unsafe-container','1');
      return false;
    }
    return true;
  }
  function applyText(node){
    if(!safeTextTarget(node))return false;
    if(clean(node.textContent)===name)return false;
    node.textContent=name;
    node.setAttribute?.('data-dini-guest-name','1');
    if(slug)node.setAttribute?.('data-dini-guest-slug',slug);
    return true;
  }

  function apply(){
    const pruned=pruneLegacyProbeCoverDuplicate();
    let changed=0,matched=0,unsafeSkipped=0;const roles=new Set();
    for(const {node,field} of boundSlots()){
      matched++;roles.add(field?.role||'generic');
      const target=field?.target_kind||(node.matches?.('input,textarea,select')?'value':'text');
      if(target==='value'||node.matches?.('input,textarea,select')){if(applyValue(node,field))changed++}
      else if(!safeTextTarget(node)){unsafeSkipped++}
      else if(applyText(node))changed++;
    }
    document.documentElement.dataset.guestBoundMatches=String(matched);
    document.documentElement.dataset.guestChanged=String(changed);
    document.documentElement.dataset.guestUnsafeContainersSkipped=String(unsafeSkipped);
    document.documentElement.dataset.guestBinding=matched?'global-contract':'missing';
    document.documentElement.dataset.guestRoles=[...roles].join(',');
    return {matched,changed,unsafeSkipped,roles:[...roles],pruned};
  }

  let timer=0;
  let observer=null;
  let stableRuns=0;
  const runApply=()=>{
    const result=apply();
    if(result.matched>0&&result.changed===0)stableRuns++;
    else stableRuns=0;
    if(stableRuns>=2&&observer){
      observer.disconnect();
      observer=null;
      document.documentElement.dataset.guestObserver='settled';
    }
    return result;
  };
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(runApply,25)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',runApply,{once:true});else runApply();
  [80,220,600,1400,3000,6000].forEach(ms=>setTimeout(runApply,ms));
  observer=new MutationObserver(mutations=>{
    if(mutations.some(m=>m.type==='childList'&&m.addedNodes?.length))schedule();
  });
  try{observer.observe(document.documentElement,{subtree:true,childList:true})}catch{}
  setTimeout(()=>{observer?.disconnect();observer=null},6000);

  window.DINI_GUEST_RUNTIME_V2={VERSION,apply:runApply,boundNodes,boundSlots,currentContract,sanitizeName,pruneLegacyProbeCoverDuplicate};
})();
