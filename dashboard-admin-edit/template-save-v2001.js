(()=>{
  'use strict';
  if(window.__DINI_TEMPLATE_SAVE_V2001__)return;
  window.__DINI_TEMPLATE_SAVE_V2001__=true;

  const VERSION='2.0.2-p2d';
  const SUPABASE_URL='https://jfvmcerrsxjvbiogfqes.supabase.co';
  const SUPABASE_KEY='sb_publishable_3IqSDxkpxCGiDpxAEwdsXQ_AsJpsC4W';
  const BUCKET='template-packages';
  const DB_NAME='dini-anif-editor-v150',DB_VERSION=2,GLOBAL_KEY='native-applied';
  const scope=window.__DINI_TEMPLATE_EDITOR_SCOPE__||{};
  const recordId=String(scope.record_id||scope.template_id||'').trim();
  const sb=window.supabase?.createClient?.(SUPABASE_URL,SUPABASE_KEY);
  let saving=false;

  const deep=v=>JSON.parse(JSON.stringify(v??null));
  const scopedKey=id=>`${GLOBAL_KEY}:${id}`;
  const safeSlug=v=>String(v||'template').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,64)||'template';
  const withTimeout=(p,ms,label='Operasi')=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error(`${label} timeout setelah ${Math.round(ms/1000)} detik`)),ms))]);
  const toast=(message,type='info',title='')=>typeof window.editorToast==='function'?window.editorToast(message,type,title):null;

  function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains('assets'))db.createObjectStore('assets');if(!db.objectStoreNames.contains('snapshots'))db.createObjectStore('snapshots')};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error||new Error('IndexedDB gagal'))})}
  async function readSnap(key){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('snapshots');const r=tx.objectStore('snapshots').get(key);r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error)})}
  async function writeSnap(key,val){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(val,key);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})}
  async function readAsset(db,key){return new Promise((res,rej)=>{const tx=db.transaction('assets');const r=tx.objectStore('assets').get(key);r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error)})}

  const publicUrl=path=>sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  async function upload(path,blob,type){
    const r=await withTimeout(sb.storage.from(BUCKET).upload(path,blob,{contentType:type||blob?.type||'application/octet-stream',upsert:true,cacheControl:'3600'}),60000,'Upload '+path.split('/').pop());
    if(r.error)throw new Error(`${path}: ${r.error.message}`);
    return publicUrl(path);
  }
  const uploadText=(path,text,type='application/json; charset=utf-8')=>upload(path,new Blob([text],{type}),type);

  function replaceAllDeep(v,map){
    if(typeof v==='string'){let s=v;for(const [from,to] of map){if(from&&s.includes(from))s=s.split(from).join(to)}return s}
    if(Array.isArray(v))return v.map(x=>replaceAllDeep(x,map));
    if(v&&typeof v==='object'){const o={};for(const [k,x] of Object.entries(v))o[k]=replaceAllDeep(x,map);return o}
    return v;
  }
  function dirname(raw){try{const u=new URL(raw,location.href);u.search='';u.hash='';u.pathname=u.pathname.replace(/[^/]*$/,'');return u.href}catch{return ''}}
  function canonicalAssetBase(html,manifest={}){
    try{const d=new DOMParser().parseFromString(String(html||''),'text/html'),b=String(d.querySelector('base')?.getAttribute('href')||'').trim();if(b)return dirname(new URL(b,manifest.source_url||location.href).href)}catch{}
    return dirname(manifest.source_url||manifest.asset_base||'')||location.origin+'/';
  }
  function rebaseSchema(schema,values){
    const out=deep(schema||{});
    for(const f of out.fields||[]){
      if(!f?.id||!Object.prototype.hasOwnProperty.call(values||{},f.id))continue;
      if(!Object.prototype.hasOwnProperty.call(f,'pre_v2_saved_value'))f.pre_v2_saved_value=f.value??f.source_url??'';
      f.value=values[f.id];
      f.saved_value_authority='template-edit-v2';
    }
    return out;
  }
  async function currentRow(){
    const r=await withTimeout(sb.from('templates').select('*').eq('id',recordId).maybeSingle(),15000,'Baca template');
    if(r.error)throw r.error;
    if(!r.data||String(r.data.id)!==recordId)throw new Error('UUID LOCK gagal: template berbeda.');
    return r.data;
  }
  async function fetchJson(url,label){const u=new URL(url,location.href);u.searchParams.set('_verify',Date.now());const r=await withTimeout(fetch(u.href,{cache:'no-store'}),15000,label);if(!r.ok)throw new Error(`${label} HTTP ${r.status}`);return r.json()}

  async function save(){
    if(saving)return;
    if(!recordId)return toast('UUID template tidak tersedia.','error','Save dibatalkan');
    const btn=document.getElementById('saveDraftBtn');
    const state=String(document.getElementById('dirtyState')?.textContent||'');
    if(!/APPLIED/i.test(state))return toast('Klik APPLY terlebih dahulu.','info','Belum APPLY');
    saving=true;if(btn)btn.disabled=true;
    const progress=toast('Menyiapkan exact applied snapshot…','loading','Template V2 Save');
    try{
      const ses=await withTimeout(sb.auth.getSession(),12000,'Session admin');
      if(ses.error||!ses.data?.session)throw new Error('Session admin tidak ditemukan.');
      const current=await currentRow();
      const raw=deep(await readSnap(scopedKey(recordId)));
      if(!raw?.html||!raw?.schema||!raw?.template_edit_v2)throw new Error('Applied Snapshot V2 scoped belum tersedia. Klik APPLY lagi.');
      if(String(raw.template_id||raw.record_id||recordId)!==recordId)throw new Error('Applied Snapshot berasal dari UUID lain.');

      const revision='r-v2-'+Date.now().toString(36)+'-'+crypto.randomUUID().slice(0,6);
      const base=`${safeSlug(current.slug)}/revisions/${revision}`;
      const db=await openDB();
      const replacements=new Map();
      const uploadedFields=[];
      const assets=[...(raw.assets||[])].filter(a=>a?.key&&a?.path);
      const unique=new Map();
      for(const a of assets)if(!unique.has(a.path))unique.set(a.path,a);
      let n=0;
      for(const a of unique.values()){
        const blob=await readAsset(db,a.key);
        if(!blob)throw new Error(`Blob asset APPLY hilang: ${a.id||a.path}`);
        const dest=`${base}/${String(a.path).replace(/^\/+/, '')}`;
        const url=await upload(dest,blob,a.type||blob.type);
        replacements.set(a.path,url);
        if(a.id)uploadedFields.push({id:a.id,path:a.path,url});
        n++;
        if(progress?.querySelector?.('small'))progress.querySelector('small').textContent=`Materialisasi asset ${n}/${unique.size}`;
      }

      const values=replaceAllDeep(deep(raw.values||{}),replacements);
      const transforms=deep(raw.transforms||{});
      const finalHtml=replaceAllDeep(String(raw.html||raw.baseHtml||''),replacements);
      const schema=rebaseSchema(replaceAllDeep(deep(raw.schema||{}),replacements),values);
      const manifestBase=replaceAllDeep(deep(raw.manifest||{}),replacements);
      if(!manifestBase.runtime_manifest&&current.manifest_json?.runtime_manifest)manifestBase.runtime_manifest=replaceAllDeep(deep(current.manifest_json.runtime_manifest),replacements);
      if(!manifestBase.consumer_contract&&current.manifest_json?.consumer_contract)manifestBase.consumer_contract=replaceAllDeep(deep(current.manifest_json.consumer_contract),replacements);
      if(manifestBase.runtime_manifest){
        manifestBase.consumer_contract_version=1;
        manifestBase.consumer_contract=manifestBase.consumer_contract||{version:1,runtime_manifest_path:'manifest.runtime_manifest',runtime_manifest_compiler:manifestBase.runtime_manifest.compiler||'',semantic_components_path:'manifest.runtime_manifest.semantic_components',personalization_path:'manifest.runtime_manifest.personalization',chain:['fetch','preview','editor','apply','save','supabase','renderer','guest-route','reload'],backend_owner:'dini-faqih',source_dom_authoritative:true,arbitrary_source_js:false};
        manifestBase.runtime_manifest.consumer_contract_version=1;
        manifestBase.runtime_manifest.editor_contract={...(manifestBase.runtime_manifest.editor_contract||{}),consumer_contract_version:1,consumer_chain_persistent:true};
      }
      for(const a of uploadedFields){
        if(String(values[a.id]??'')!==a.url)throw new Error(`Exact field persistence gagal sebelum upload: ${a.id}`);
      }

      const snapshotPath=`${base}/editor-snapshot.json`,indexPath=`${base}/index.html`,schemaPath=`${base}/native-schema.json`,dataPath=`${base}/native-data.json`,manifestPath=`${base}/manifest.json`;
      const snapshotUrl=publicUrl(snapshotPath),sourceUrl=publicUrl(indexPath);
      const currentEntry=current.manifest_json?.editor_snapshot_url?{revision:current.manifest_json.revision||'previous',source_path:current.source_path,editor_snapshot_url:current.manifest_json.editor_snapshot_url,saved_at:current.manifest_json.saved_at||current.updated_at||null}:null;
      const history=[...(currentEntry?[currentEntry]:[]),...(current.manifest_json?.revision_history||[])].filter((x,i,a)=>x?.editor_snapshot_url&&a.findIndex(y=>y.editor_snapshot_url===x.editor_snapshot_url)===i).slice(0,10);
      const assetBase=canonicalAssetBase(finalHtml,{...manifestBase,source_url:sourceUrl});
      const manifest={...manifestBase,editor_version:'template-edit-v2.0.2-p2d',renderer_version:'template-edit-v2-exact-persistence',revision,revision_id:revision,template_id:recordId,record_id:recordId,editor_snapshot_url:snapshotUrl,source_url:sourceUrl,source_of_truth:'template-edit-v2-exact-applied',asset_base:assetBase,saved_at:new Date().toISOString(),artifact_prefix:base,revision_history:history,exact_persistence:true,explicit_saved_fields:uploadedFields.map(x=>x.id),consumer_contract_version:manifestBase.consumer_contract_version||0,consumer_chain_persisted:!!manifestBase.runtime_manifest};
      const cloud={...deep(raw),version:'template-edit-v2.0.2-p2d',template_id:recordId,record_id:recordId,snapshot_scope:recordId,snapshot_scope_version:'template-v2-exact',revision,html:finalHtml,baseHtml:finalHtml,values,schema,transforms,manifest,runtime_manifest:manifest.runtime_manifest||null,consumer_contract:manifest.consumer_contract||null,assets:[],saved_at:new Date().toISOString(),template_edit_v2:{...(raw.template_edit_v2||{}),version:'2.0.2-p2d',same_uuid:true,exact_persistence:true,consumer_contract_persisted:!!manifest.runtime_manifest,explicit_saved_fields:uploadedFields.map(x=>x.id),saved_revision:revision,saved_at:new Date().toISOString()}};

      if(progress?.querySelector?.('small'))progress.querySelector('small').textContent='Upload exact revision…';
      await Promise.all([
        uploadText(indexPath,finalHtml,'text/html; charset=utf-8'),
        uploadText(snapshotPath,JSON.stringify(cloud,null,2)),
        uploadText(schemaPath,JSON.stringify(schema,null,2)),
        uploadText(dataPath,JSON.stringify({values,transforms,runtime_manifest:manifest.runtime_manifest||null,consumer_contract:manifest.consumer_contract||null,template_edit_v2:cloud.template_edit_v2},null,2)),
        uploadText(manifestPath,JSON.stringify(manifest,null,2))
      ]);

      const verifyCloud=await fetchJson(snapshotUrl,'Verifikasi snapshot V2');
      if(String(verifyCloud.template_id)!==recordId||verifyCloud.revision!==revision)throw new Error('Cloud snapshot UUID/revision mismatch.');
      if(manifest.runtime_manifest?.compiler&&verifyCloud.manifest?.runtime_manifest?.compiler!==manifest.runtime_manifest.compiler)throw new Error('Consumer Runtime Manifest hilang/berubah saat save.');
      for(const a of uploadedFields){if(String(verifyCloud.values?.[a.id]??'')!==a.url)throw new Error(`Cloud snapshot tidak mempertahankan field ${a.id}`)}

      const payload={name:current.name,slug:current.slug,source_path:sourceUrl,status:current.status||(current.is_active?'active':'draft'),is_active:!!current.is_active,package_path:`supabase://${BUCKET}/${snapshotPath}`,manifest_json:manifest,updated_at:new Date().toISOString()};
      const upd=await withTimeout(sb.from('templates').update(payload).eq('id',recordId).select('id,source_path,manifest_json').single(),15000,'Update SAME UUID');
      if(upd.error)throw upd.error;
      if(String(upd.data?.id)!==recordId||upd.data?.manifest_json?.revision!==revision||upd.data?.manifest_json?.editor_snapshot_url!==snapshotUrl)throw new Error('DB pointer verification gagal.');

      await writeSnap(scopedKey(recordId),cloud);
      await writeSnap(GLOBAL_KEY,cloud);
      document.documentElement.dataset.templateSave='v2.0.2-p2d-exact';
      if(typeof window.finishEditorToast==='function')window.finishEditorToast(progress,`${current.name} tersimpan ✓ · ${uploadedFields.length} field media exact · UUID tetap ${recordId.slice(0,8)}.`,'success','Template V2 Saved');
      else toast(`${current.name} tersimpan. UUID tetap sama.`,'success','Template V2 Saved');
      setTimeout(()=>{location.href='/dashboard-admin-template?refresh='+Date.now()},850);
    }catch(err){
      console.error('TEMPLATE_SAVE_V2001',err);
      if(typeof window.finishEditorToast==='function')window.finishEditorToast(progress,err?.message||String(err),'error','Template V2 Save gagal');
      else toast(err?.message||String(err),'error','Template V2 Save gagal');
      if(btn)btn.disabled=false;
    }finally{saving=false}
  }

  document.addEventListener('click',e=>{const b=e.target?.closest?.('#saveDraftBtn');if(!b)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();save()},true);
  window.DINI_TEMPLATE_SAVE_V2001={VERSION,save};
  document.documentElement.dataset.templateSave='v2.0.2-p2d';
})();
