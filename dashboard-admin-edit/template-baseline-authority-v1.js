(()=>{
  'use strict';
  if(window.__DINI_TEMPLATE_BASELINE_AUTHORITY_V1__)return;
  window.__DINI_TEMPLATE_BASELINE_AUTHORITY_V1__=true;
  const VERSION='1.0.0';
  const canonical=window.DINI_TEMPLATE_CANONICAL_V1160;
  if(!canonical?.resolveSnapshot)return;

  const fnv=s=>{let h=2166136261;for(let i=0;i<String(s||'').length;i++){h^=String(s||'').charCodeAt(i);h=Math.imul(h,16777619)}return ('00000000'+(h>>>0).toString(16)).slice(-8)};
  const original=canonical.resolveSnapshot.bind(canonical);
  const exactSnap=snap=>Number(snap?.manifest?.source_graph?.source_truth_version||snap?.manifest?.source_truth_package_version||0)>=1;

  canonical.resolveSnapshot=function(snap){
    if(!exactSnap(snap))return original(snap);
    const html=String(snap?.html||snap?.baseHtml||'');
    const record={
      version:VERSION,
      policy:'exact-saved-snapshot',
      template_id:String(snap?.template_id||window.__DINI_TEMPLATE_EDITOR_SCOPE__?.template_id||''),
      input_html_hash:fnv(html),
      authority_hash:String(snap?.authority_hash||snap?.manifest?.authority_hash||''),
      source_truth_version:Number(snap?.manifest?.source_graph?.source_truth_version||snap?.manifest?.source_truth_package_version||0),
      canonicalizer_bypassed:true,
      loaded_at:new Date().toISOString()
    };
    window.__DINI_EXACT_BASELINE_AUTHORITY__=record;
    document.documentElement.dataset.templateBaselinePolicy='exact-source-truth';
    return snap;
  };

  function ensureBadge(){
    let badge=document.getElementById('templateParityBadge');
    if(badge)return badge;
    const host=document.querySelector('.preview-toolbar');if(!host)return null;
    badge=document.createElement('span');badge.id='templateParityBadge';badge.style.cssText='margin-left:8px;padding:4px 7px;border-radius:999px;border:1px solid rgba(255,255,255,.16);font:700 10px/1 system-ui;letter-spacing:.04em;color:#b8c1cf;background:rgba(10,13,18,.68)';host.appendChild(badge);return badge;
  }
  function paint(text,state){const b=ensureBadge();if(!b)return;b.textContent=text;b.dataset.state=state;b.style.color=state==='ok'?'#8fe0ad':state==='fail'?'#ff9d9d':'#d8bd7b';b.style.borderColor=state==='ok'?'rgba(75,210,130,.45)':state==='fail'?'rgba(255,95,95,.55)':'rgba(216,189,123,.35)'}

  const frame=document.getElementById('previewFrame');
  frame?.addEventListener('load',()=>{
    const a=window.__DINI_EXACT_BASELINE_AUTHORITY__;
    if(!a){paint('LEGACY CANONICAL','legacy');return}
    const live=String(frame.srcdoc||'');
    if(!live){paint('PARITY WAIT','legacy');return}
    const hash=fnv(live),ok=hash===a.input_html_hash;
    a.frame_srcdoc_hash=hash;a.exact_match=ok;a.checked_at=new Date().toISOString();
    paint(ok?'PARITY EXACT ✓':'PARITY FAIL',''+(ok?'ok':'fail'));
    if(!ok)console.error('[DINI TEMPLATE PARITY] saved snapshot != editor baseline',a);
  });

  window.DINI_TEMPLATE_BASELINE_AUTHORITY={version:VERSION,fnv,exactSnap,get state(){return window.__DINI_EXACT_BASELINE_AUTHORITY__||null}};
  console.info('[DINI TEMPLATE] Baseline Authority V'+VERSION+' aktif — source-truth snapshots bypass destructive canonicalization.');
})();
