(()=>{
  'use strict';
  if(window.__DINI_TEMPLATE_EDIT_CLOUD_BOOTSTRAP_1160__)return;
  window.__DINI_TEMPLATE_EDIT_CLOUD_BOOTSTRAP_1160__=true;
  if(location.pathname.includes('/dashboard-admin-fetch-editor/'))return;
  const params=new URLSearchParams(location.search),recordId=params.get('record')||params.get('template')||'';
  if(!recordId||params.get('mode')==='fetch')return;

  const SUPABASE_URL='https://jfvmcerrsxjvbiogfqes.supabase.co',SUPABASE_KEY='sb_publishable_3IqSDxkpxCGiDpxAEwdsXQ_AsJpsC4W';
  const sb=window.supabase?.createClient?.(SUPABASE_URL,SUPABASE_KEY);if(!sb)return;
  const frame=document.getElementById('previewFrame'),dirty=document.getElementById('dirtyState');let done=false,running=false;
  const dirname=raw=>{try{const u=new URL(raw,location.href);if(/\.[a-z0-9]{1,8}$/i.test(u.pathname.split('/').pop()||''))u.pathname=u.pathname.replace(/[^/]*$/,'');if(!u.pathname.endsWith('/'))u.pathname+='/';u.search='';u.hash='';return u.href}catch{return ''}};
  const embeddedBase=(html,manifest={},fallback='')=>{try{const doc=new DOMParser().parseFromString(String(html||''),'text/html');const raw=String(doc.querySelector('base')?.getAttribute('href')||'').trim();if(raw){const d=dirname(new URL(raw,manifest.source_url||fallback||location.href).href);if(d)return d}}catch{}const source=String(manifest.source_url||'').trim();if(source){const d=dirname(source);if(d)return d}const current=String(manifest.asset_base||'').trim();if(current){const d=dirname(current);if(d)return d}return dirname(fallback)||location.origin+'/'};
  const inject=(html,payload)=>{const json=JSON.stringify(payload).replace(/</g,'\\u003c').replace(/-->/g,'--\\>');const block='<script type="application/json" id="diniSnapshotAuthorityData">'+json+'<\/script><script src="/dashboard-admin-edit/template-canonical-v1160.js?v=1160"><\/script><script src="/dashboard-admin-template/snapshot-authority-v1160.js?v=1160"><\/script>';return /<\/body>/i.test(html)?html.replace(/<\/body>/i,block+'</body>'):html+block};

  async function hydrate(){
    if(done||running||!frame)return;running=true;
    try{
      const rr=await sb.from('templates').select('id,name,slug,source_path,manifest_json,updated_at').eq('id',recordId).maybeSingle();if(rr.error)throw rr.error;const row=rr.data;if(!row||String(row.id)!==String(recordId))throw new Error('UUID template yang dipilih tidak cocok.');
      const snapUrl=String(row.manifest_json?.editor_snapshot_url||'').trim();if(!snapUrl)throw new Error('Template belum memiliki editor snapshot.');
      const u=new URL(snapUrl,location.href);u.searchParams.set('_edit',String(row.updated_at||Date.now()));const r=await fetch(u.href,{cache:'no-store'});if(!r.ok)throw new Error('Editor Snapshot HTTP '+r.status);let snap=await r.json();
      if(snap?.template_id&&String(snap.template_id)!==String(recordId))throw new Error('Snapshot UUID berbeda dari template yang dipilih.');
      if(window.DINI_TEMPLATE_CANONICAL_V1160?.resolveSnapshot)snap=window.DINI_TEMPLATE_CANONICAL_V1160.resolveSnapshot(snap);
      let html=String(snap.html||snap.baseHtml||'');if(!html)throw new Error('Snapshot HTML kosong.');
      const manifest={...(row.manifest_json||{}),...(snap.manifest||{})},assetBase=embeddedBase(html,manifest,row.source_path||'');
      html=html.replace(/<base\b[^>]*data-dini-template-base[^>]*>/ig,'').replace(/<base\b[^>]*>/ig,'');
      html=html.replace(/<head(\s[^>]*)?>/i,m=>m+'<base data-dini-template-base="1" href="'+assetBase.replace(/"/g,'&quot;')+'">');
      html=inject(html,{schema:snap.schema||{},values:snap.values||{},transforms:snap.transforms||{},persistent:false,template_id:recordId,revision:snap.revision||manifest.revision||''});
      frame.srcdoc=html;done=true;document.documentElement.dataset.templateEditAuthority='v1.16.0';
      if(dirty&&/DRAFT CLOUD LOADED/i.test(dirty.textContent||''))dirty.textContent=`DRAFT CLOUD LOADED ✓ · UUID ${recordId.slice(0,8)} · CANONICAL V1.16`;
    }catch(err){console.error('TEMPLATE_EDIT_CLOUD_BOOTSTRAP_V1160',err);window.editorToast?.(err.message||String(err),'error','Template Edit hydrate gagal')}finally{running=false}
  }
  let tries=0;const timer=setInterval(()=>{tries++;const state=String(dirty?.textContent||'');if(/DRAFT CLOUD LOADED/i.test(state)){clearInterval(timer);setTimeout(hydrate,40)}else if(tries>300)clearInterval(timer)},100);
})();
