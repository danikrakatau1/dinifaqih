(()=>{
  'use strict';
  if(window.__DINI_GUEST_SLOT_PROBE_V2__)return;
  window.__DINI_GUEST_SLOT_PROBE_V2__=true;

  const VERSION='2.0.1';
  const SENTINEL='__DINI_GUEST_PROBE__';
  const PLACEHOLDER='Nama Tamu';
  const source=document.getElementById('sourceInput');
  const sourceUrl=document.getElementById('sourceUrl');
  const fetchBtn=document.getElementById('fetchSourceBtn');
  const analyzeBtn=document.getElementById('analyzeBtn');
  const buildBtn=document.getElementById('buildBtn');
  const fetchMeta=document.getElementById('fetchMeta');
  if(!source||!sourceUrl||!fetchBtn)return;

  const deepestWith=(doc,text)=>{
    const all=[...doc.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,label,div')].filter(n=>String(n.textContent||'').includes(text));
    return all.find(n=>![...n.children].some(c=>String(c.textContent||'').includes(text)))||all[0]||null;
  };
  const ownerOf=n=>n?.closest?.('.elementor-widget,[data-id]')||n?.parentElement||n;
  const elementId=n=>String(n?.getAttribute?.('data-id')||((String(n?.className||'').match(/elementor-element-([\w-]+)/)||[])[1])||n?.id||'');
  const findOwner=(doc,id)=>{if(!id)return null;try{return doc.querySelector(`[data-id="${CSS.escape(id)}"],.elementor-element-${CSS.escape(id)}`)}catch{return null}};
  const nodePath=(owner,node)=>{
    if(!owner||!node)return[];
    const path=[];let n=node;
    while(n&&n!==owner){const p=n.parentElement;if(!p)return[];path.unshift([...p.children].indexOf(n));n=p}
    return n===owner?path:[];
  };
  const nodeAtPath=(owner,path)=>{
    let n=owner;
    for(const i of Array.isArray(path)?path:[]){n=n?.children?.[Number(i)];if(!n)return null}
    return n||null;
  };
  const markGuest=leaf=>{
    if(!leaf)return false;
    leaf.textContent=PLACEHOLDER;
    leaf.setAttribute('data-native-guest-name','1');
    leaf.setAttribute('data-dini-guest-name','1');
    leaf.setAttribute('data-dini-bind','guest_name');
    leaf.setAttribute('data-dini-personalization-field','guest_name');
    leaf.setAttribute('data-dini-guest-source-probe','1');
    const owner=ownerOf(leaf);owner?.setAttribute?.('data-dini-guest-source-probe-widget','1');owner?.setAttribute?.('data-dini-guest-binding-owner','guest_name');
    return true;
  };
  const serialize=doc=>'<!doctype html>\n'+doc.documentElement.outerHTML;

  function adoptSourceNativeGuest(baselineHtml,probeHtml){
    const baseline=new DOMParser().parseFromString(String(baselineHtml||''),'text/html');
    const existing=baseline.querySelector('[data-dini-bind="guest_name"],[data-dini-personalization-field="guest_name"],[data-native-guest-name],[data-dini-guest-name],[data-guest-name]');
    if(existing){markGuest(existing);return {html:serialize(baseline),count:1,mode:'existing-source-node',element_id:elementId(ownerOf(existing))}}

    const probe=new DOMParser().parseFromString(String(probeHtml||''),'text/html');
    const probeLeaf=deepestWith(probe,SENTINEL);
    if(!probeLeaf)return {html:baselineHtml,count:0,mode:'sentinel-not-found'};
    const probeOwner=ownerOf(probeLeaf),id=elementId(probeOwner);
    const baselineOwner=findOwner(baseline,id);
    if(baselineOwner){
      const path=nodePath(probeOwner,probeLeaf);
      const leaf=nodeAtPath(baselineOwner,path);
      if(leaf){
        markGuest(leaf);
        return {html:serialize(baseline),count:1,mode:'matched-existing-owner-path',element_id:id,node_path:path};
      }
    }

    // The personalized node exists only in the upstream ?to= source variant. Preserve that
    // complete authored source document as the baseline instead of cloning/creating a guest UI.
    markGuest(probeLeaf);
    return {html:serialize(probe),count:1,mode:'source-variant-authoritative',element_id:id,node_path:nodePath(probeOwner,probeLeaf)};
  }

  async function fetchProbe(url){
    const u=new URL(url,location.href);u.searchParams.set('to',SENTINEL);
    const r=await fetch('/api/fetch-source?url='+encodeURIComponent(u.href),{headers:{Accept:'application/json'},cache:'no-store'});
    const j=await r.json().catch(()=>({ok:false,error:'Response Guest Probe tidak valid.'}));
    if(!r.ok||!j.ok)throw new Error(j.error||('Guest Probe HTTP '+r.status));
    return j;
  }

  let runId=0;
  async function runAfterFetch(before,token){
    const started=Date.now();
    while(Date.now()-started<18000){
      if(token!==runId)return;
      if(!fetchBtn.disabled&&source.value&&source.value!==before)break;
      await new Promise(r=>setTimeout(r,120));
    }
    if(token!==runId||!source.value||source.value===before)return;
    const canonicalUrl=sourceUrl.value.trim();if(!/^https?:/i.test(canonicalUrl))return;
    try{
      if(buildBtn)buildBtn.disabled=true;
      if(fetchMeta){fetchMeta.classList.add('ok');fetchMeta.textContent+=' · 🔎 Guest Source Binding…'}
      const probe=await fetchProbe(canonicalUrl);
      const result=adoptSourceNativeGuest(source.value,probe.html||'');
      source.dataset.guestProbe=JSON.stringify({version:VERSION,count:result.count,mode:result.mode,element_id:result.element_id||'',node_path:result.node_path||[],source_url:canonicalUrl,binding:'guest_name',mutation:'textContent-only',clone_node:false,create_node:false});
      if(result.count>0){
        source.value=result.html;
        if(fetchMeta)fetchMeta.textContent=`✅ Source-native guest_name bound · ${result.mode}${result.element_id?' · '+result.element_id:''}`;
        if(analyzeBtn&&!analyzeBtn.disabled)analyzeBtn.click();else setTimeout(()=>analyzeBtn?.click(),80);
      }else if(fetchMeta)fetchMeta.textContent+=' · Guest binding tidak ditemukan di source';
    }catch(err){
      console.warn('GUEST_SLOT_PROBE_V2',err);
      if(fetchMeta)fetchMeta.textContent+=' · Guest Probe dilewati ('+String(err?.message||err)+')';
    }
  }

  function scheduleProbe(){const token=++runId;const before=source.value;setTimeout(()=>runAfterFetch(before,token),40)}
  fetchBtn.addEventListener('click',scheduleProbe,true);
  sourceUrl.addEventListener('keydown',e=>{if(e.key==='Enter')scheduleProbe()},true);
  window.DINI_GUEST_SLOT_PROBE_V2={VERSION,adoptSourceNativeGuest,fetchProbe};
})();
