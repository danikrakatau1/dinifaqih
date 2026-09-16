(()=>{
  'use strict';
  if(window.__DINI_TEMPLATE_BASELINE_AUTHORITY_V1__)return;
  window.__DINI_TEMPLATE_BASELINE_AUTHORITY_V1__=true;
  const VERSION='1.1.0';
  const canonical=window.DINI_TEMPLATE_CANONICAL_V1160;
  if(!canonical?.resolveSnapshot)return;

  const fnv=s=>{let h=2166136261;const t=String(s||'');for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619)}return ('00000000'+(h>>>0).toString(16)).slice(-8)};
  const stable=value=>{if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return '['+value.map(stable).join(',')+']';return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}'};
  const sha256=async text=>{const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(text||'')));return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('')};
  function canonicalPayload(snap){
    const assetByField=new Map((snap?.assets||[]).filter(a=>a?.field_id).map(a=>[String(a.field_id),a]));
    const values={};for(const [id,v] of Object.entries(snap?.delta?.values||{}))values[id]=assetByField.has(id)?`__DINI_ASSET_FIELD__:${id}`:v;
    const fields=(snap?.schema?.fields||[]).map(f=>({id:f.id,kind:f.kind,node_id:f.node_id||'',source_key:f.source_key||'',source_element_id:f.source_element_id||'',media_role:f.media_role||'',attribute:f.attribute||'',slide_index:f.slide_index??null}));
    const graph=snap?.manifest?.source_graph||{};
    return {contract:'road-to-final-authority-v1',baseline_hash:snap?.baseline_hash||'',source_html_hash:graph?.source?.html_hash||'',source_css_hash:graph?.source?.css_hash||'',source_truth_version:graph?.source_truth_version||0,fields,delta_values:values,transforms:snap?.delta?.transforms||snap?.transforms||{},personalization:(graph?.personalization?.fields||[]).map(x=>({type:x.type,element_id:x.element_id||'',selector:x.selector||'',url_parameter:x.url_parameter||''}))};
  }
  const original=canonical.resolveSnapshot.bind(canonical);
  const exactSnap=snap=>Number(snap?.manifest?.source_graph?.source_truth_version||snap?.manifest?.source_truth_package_version||0)>=1;

  function updateBadge(){
    const a=window.__DINI_EXACT_BASELINE_AUTHORITY__;if(!a)return;
    if(a.exact_match===false||a.authority_match===false)return paint('PARITY FAIL','fail');
    if(a.exact_match===true&&a.authority_match===true)return paint('AUTH ✓ · HTML ✓','ok');
    if(a.exact_match===true)return paint('HTML ✓ · AUTH…','legacy');
    if(a.authority_match===true)return paint('AUTH ✓ · HTML…','legacy');
    paint('PARITY CHECK…','legacy');
  }

  canonical.resolveSnapshot=function(snap){
    if(!exactSnap(snap))return original(snap);
    const html=String(snap?.html||snap?.baseHtml||'');
    const record={version:VERSION,policy:'exact-saved-snapshot',template_id:String(snap?.template_id||window.__DINI_TEMPLATE_EDITOR_SCOPE__?.template_id||''),input_html_hash:fnv(html),authority_hash:String(snap?.authority_hash||snap?.manifest?.authority_hash||''),source_truth_version:Number(snap?.manifest?.source_graph?.source_truth_version||snap?.manifest?.source_truth_package_version||0),canonicalizer_bypassed:true,loaded_at:new Date().toISOString()};
    window.__DINI_EXACT_BASELINE_AUTHORITY__=record;
    document.documentElement.dataset.templateBaselinePolicy='exact-source-truth';
    if(record.authority_hash){
      sha256(stable(canonicalPayload(snap))).then(hash=>{record.recomputed_authority_hash=hash;record.authority_match=hash===record.authority_hash;record.authority_checked_at=new Date().toISOString();updateBadge();if(!record.authority_match)console.error('[DINI TEMPLATE PARITY] authority hash mismatch',record)}).catch(err=>{record.authority_error=String(err?.message||err);updateBadge()});
    }else{record.authority_match=null}
    return snap;
  };

  function ensureBadge(){let badge=document.getElementById('templateParityBadge');if(badge)return badge;const host=document.querySelector('.preview-toolbar');if(!host)return null;badge=document.createElement('span');badge.id='templateParityBadge';badge.style.cssText='margin-left:8px;padding:4px 7px;border-radius:999px;border:1px solid rgba(255,255,255,.16);font:700 10px/1 system-ui;letter-spacing:.04em;color:#b8c1cf;background:rgba(10,13,18,.68)';host.appendChild(badge);return badge}
  function paint(text,state){const b=ensureBadge();if(!b)return;b.textContent=text;b.dataset.state=state;b.style.color=state==='ok'?'#8fe0ad':state==='fail'?'#ff9d9d':'#d8bd7b';b.style.borderColor=state==='ok'?'rgba(75,210,130,.45)':state==='fail'?'rgba(255,95,95,.55)':'rgba(216,189,123,.35)'}

  const frame=document.getElementById('previewFrame');
  frame?.addEventListener('load',()=>{const a=window.__DINI_EXACT_BASELINE_AUTHORITY__;if(!a){paint('LEGACY CANONICAL','legacy');return}const live=String(frame.srcdoc||'');if(!live){paint('PARITY WAIT','legacy');return}const hash=fnv(live);a.frame_srcdoc_hash=hash;a.exact_match=hash===a.input_html_hash;a.checked_at=new Date().toISOString();updateBadge();if(!a.exact_match)console.error('[DINI TEMPLATE PARITY] saved snapshot != editor baseline',a)});

  window.DINI_TEMPLATE_BASELINE_AUTHORITY={version:VERSION,fnv,stable,sha256,canonicalPayload,exactSnap,get state(){return window.__DINI_EXACT_BASELINE_AUTHORITY__||null}};
  console.info('[DINI TEMPLATE] Baseline Authority V'+VERSION+' aktif — exact saved baseline + authority hash verification.');
})();
