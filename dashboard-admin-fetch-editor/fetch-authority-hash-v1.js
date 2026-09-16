(()=>{
  'use strict';
  if(window.__DINI_FETCH_AUTHORITY_HASH_V1__)return;
  window.__DINI_FETCH_AUTHORITY_HASH_V1__=true;
  const VERSION='1.0.0';
  const E=window.DINI_FETCH_V2;
  if(!E||typeof E.buildApplied!=='function')return;

  function stable(value){
    if(value===null||typeof value!=='object')return JSON.stringify(value);
    if(Array.isArray(value))return '['+value.map(stable).join(',')+']';
    return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';
  }
  async function sha256(text){
    const bytes=new TextEncoder().encode(String(text||''));
    const digest=await crypto.subtle.digest('SHA-256',bytes);
    return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
  }
  function canonicalPayload(snap){
    const assetByField=new Map((snap?.assets||[]).filter(a=>a?.field_id).map(a=>[String(a.field_id),a]));
    const values={};
    for(const [id,v] of Object.entries(snap?.delta?.values||{}))values[id]=assetByField.has(id)?`__DINI_ASSET_FIELD__:${id}`:v;
    const fields=(snap?.schema?.fields||[]).map(f=>({id:f.id,kind:f.kind,node_id:f.node_id||'',source_key:f.source_key||'',source_element_id:f.source_element_id||'',media_role:f.media_role||'',attribute:f.attribute||'',slide_index:f.slide_index??null}));
    const graph=snap?.manifest?.source_graph||{};
    return {
      contract:'road-to-final-authority-v1',
      baseline_hash:snap?.baseline_hash||'',
      source_html_hash:graph?.source?.html_hash||'',
      source_css_hash:graph?.source?.css_hash||'',
      source_truth_version:graph?.source_truth_version||0,
      fields,
      delta_values:values,
      transforms:snap?.delta?.transforms||snap?.transforms||{},
      personalization:(graph?.personalization?.fields||[]).map(x=>({type:x.type,element_id:x.element_id||'',selector:x.selector||'',url_parameter:x.url_parameter||''}))
    };
  }

  async function decorate(snap){
    if(!snap)return snap;
    const payload=canonicalPayload(snap);
    const authorityHash=await sha256(stable(payload));
    const exactHtmlHash=await sha256(String(snap.html||snap.baseHtml||''));
    snap.authority_hash=authorityHash;
    snap.applied_html_hash=exactHtmlHash;
    snap.parity_contract={version:VERSION,authority_hash:authorityHash,applied_html_hash:exactHtmlHash,authority_algorithm:'sha256-stable-json',html_algorithm:'sha256',asset_materialization_normalized:true,generated_at:E.now?.()||new Date().toISOString()};
    snap.manifest={...(snap.manifest||{}),source_truth_package_version:1,authority_hash:authorityHash,authority_hash_version:VERSION,parity_contract:'road-to-final-authority-v1',fetch_applied_html_hash:exactHtmlHash};
    return snap;
  }

  const original=E.buildApplied.bind(E);
  E.buildApplied=async function(session){return await decorate(await original(session))};
  window.DINI_FETCH_AUTHORITY_HASH={version:VERSION,stable,sha256,canonicalPayload,decorate};
  console.info('[DINI FETCH] Authority Hash V'+VERSION+' aktif.');
})();
