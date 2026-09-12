(()=>{
  'use strict';
  if(window.__DINI_TEMPLATE_SAVE_FAST_1160__)return;
  window.__DINI_TEMPLATE_SAVE_FAST_1160__=true;

  const SUPABASE_URL='https://jfvmcerrsxjvbiogfqes.supabase.co';
  const SUPABASE_KEY='sb_publishable_3IqSDxkpxCGiDpxAEwdsXQ_AsJpsC4W';
  const BUCKET='template-packages';
  const DB_NAME='dini-anif-editor-v150',DB_VERSION=2,GLOBAL_KEY='native-applied';
  const sb=window.supabase?.createClient?.(SUPABASE_URL,SUPABASE_KEY);
  const isFetchTool=document.documentElement.dataset.editorTool==='fetch-editor'||location.pathname.includes('/dashboard-admin-fetch-editor/');
  const params=new URLSearchParams(location.search);
  let saving=false;

  const deep=v=>JSON.parse(JSON.stringify(v??null));
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const urlRecordId=()=>isFetchTool?'':(params.get('record')||params.get('template')||'');
  const scopedKey=id=>`${GLOBAL_KEY}:${id}`;
  const safeSlug=v=>String(v||'template').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,64)||'template';
  const withTimeout=(p,ms,label='Operasi')=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error(`${label} timeout setelah ${Math.round(ms/1000)} detik`)),ms))]);

  function toast(message,type='success',title=''){
    if(typeof window.editorToast==='function')return window.editorToast(message,type,title);
    let stack=document.querySelector('#editorToastStack');if(!stack){stack=document.createElement('div');stack.id='editorToastStack';stack.className='editor-toast-stack';document.body.appendChild(stack)}
    const el=document.createElement('div');el.className='editor-toast '+type;el.innerHTML=`<strong>${title||'Info'}</strong><small>${message}</small>`;stack.appendChild(el);requestAnimationFrame(()=>el.classList.add('show'));if(type!=='loading')setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),250)},4200);return el;
  }
  function finishToast(el,message,type='success',title=''){
    if(typeof window.finishEditorToast==='function')return window.finishEditorToast(el,message,type,title);
    if(!el)return toast(message,type,title);el.className='editor-toast '+type+' show';el.innerHTML=`<strong>${title||(type==='success'?'Sukses':'Gagal')}</strong><small>${message}</small>`;if(type!=='loading')setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),250)},4200);
  }

  function openDB(){return new Promise((res,rej)=>{const q=indexedDB.open(DB_NAME,DB_VERSION);q.onupgradeneeded=()=>{const db=q.result;if(!db.objectStoreNames.contains('assets'))db.createObjectStore('assets');if(!db.objectStoreNames.contains('snapshots'))db.createObjectStore('snapshots')};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error||new Error('IndexedDB gagal dibuka'))})}
  async function readSnapKey(key){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('snapshots');const q=tx.objectStore('snapshots').get(key);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error||new Error('Snapshot APPLY tidak terbaca'))})}
  async function writeSnapKey(key,value){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(value,key);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error||new Error('IndexedDB transaction aborted'))})}
  async function readApplied(){const id=urlRecordId();if(id){const s=await readSnapKey(scopedKey(id));if(s)return s;throw new Error('Snapshot APPLY khusus template ini belum ada. Klik APPLY sekali lagi.')}return readSnapKey(GLOBAL_KEY)}
  async function readAsset(db,key){return new Promise((res,rej)=>{const tx=db.transaction('assets');const q=tx.objectStore('assets').get(key);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error||new Error(`Asset ${key} tidak terbaca`))})}

  const publicUrl=path=>sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  async function upload(path,blob,type){const op=sb.storage.from(BUCKET).upload(path,blob,{contentType:type||blob?.type||'application/octet-stream',upsert:true,cacheControl:'3600'});const {error}=await withTimeout(op,60000,`Upload ${path.split('/').pop()}`);if(error)throw new Error(`${path}: ${error.message}`);return publicUrl(path)}
  const uploadText=(path,text,type='application/json; charset=utf-8')=>upload(path,new Blob([text],{type}),type);
  async function runPool(items,limit,worker){let cursor=0;await Promise.all(Array.from({length:Math.min(limit,Math.max(1,items.length))},async()=>{while(true){const i=cursor++;if(i>=items.length)return;await worker(items[i],i)}}))}
  function replaceAllDeep(value,map){if(typeof value==='string'){let out=value;for(const [from,to] of map)if(from&&out.includes(from))out=out.split(from).join(to);return out}if(Array.isArray(value))return value.map(v=>replaceAllDeep(v,map));if(value&&typeof value==='object'){const out={};for(const [k,v] of Object.entries(value))out[k]=replaceAllDeep(v,map);return out}return value}
  function dirname(raw){try{const u=new URL(raw,location.href);if(/\.[a-z0-9]{1,8}$/i.test(u.pathname.split('/').pop()||''))u.pathname=u.pathname.replace(/[^/]*$/,'');if(!u.pathname.endsWith('/'))u.pathname+='/';u.search='';u.hash='';return u.href}catch{return ''}}
  function canonicalAssetBase(html,manifest={}){try{const doc=new DOMParser().parseFromString(String(html||''),'text/html');const raw=String(doc.querySelector('base')?.getAttribute('href')||'').trim();if(raw){const d=dirname(new URL(raw,manifest.source_url||location.href).href);if(d)return d}}catch{}const source=String(manifest.source_url||'').trim();if(source){const d=dirname(source);if(d)return d}const current=String(manifest.asset_base||'').trim();if(current){const d=dirname(current);if(d)return d}return location.origin+'/'}
  function localRefs(value){const text=typeof value==='string'?value:JSON.stringify(value||{});return [...new Set((text.match(/assets\/(?:generated|source)\/[A-Za-z0-9_./%+~@()\-]+/g)||[]).map(x=>x.replace(/["'<>),;]+$/g,'')))]}

  async function currentRow(){const id=urlRecordId();if(!id)return null;const r=await withTimeout(sb.from('templates').select('*').eq('id',id).maybeSingle(),15000,'Baca template');if(r.error)throw r.error;return r.data||null}
  async function nextIdentity(){const r=await withTimeout(sb.from('templates').select('name,slug'),15000,'Baca nomor template');if(r.error)throw r.error;let max=0;for(const row of r.data||[]){const m=String(row.name||'').match(/^Template\s+(\d+)$/i);if(m)max=Math.max(max,Number(m[1])||0)}const n=max+1;return{id:crypto.randomUUID(),name:`Template ${n}`,slug:`template-${n}-${crypto.randomUUID().slice(0,8)}`}}

  async function saveAppliedAsTemplate(){
    if(saving)return;
    const btn=document.getElementById('saveDraftBtn'),dirty=String(document.getElementById('dirtyState')?.textContent||'');
    if(!/APPLIED|FRESH OVERLAY|PARITY CANONICAL/i.test(dirty))return toast('Klik APPLY dulu supaya state CURRENT dibekukan sebelum disimpan.','info','Belum APPLY');
    if(!sb)return toast('Supabase client tidak tersedia.','error','Simpan gagal');
    if(!window.DINI_TEMPLATE_CANONICAL_V1160?.resolveSnapshot)return toast('Canonical resolver V1.16 belum termuat. Hard refresh lalu coba lagi.','error','Simpan dibatalkan');

    saving=true;if(btn)btn.disabled=true;
    const t=toast('Membekukan canonical state dari Editor CURRENT…','loading',isFetchTool?'Simpan Template Baru':'Update Template');
    try{
      const sessionRes=await withTimeout(sb.auth.getSession(),12000,'Session admin');if(sessionRes.error||!sessionRes.data?.session)throw new Error('Session admin tidak ditemukan. Login ulang.');
      const raw=await withTimeout(readApplied(),12000,'Snapshot APPLY');if(!raw?.schema||!Array.isArray(raw.schema.fields)||!raw.html)throw new Error('Snapshot APPLY belum valid. Klik APPLY lagi.');
      const requested=urlRecordId();if(requested&&raw.template_id&&String(raw.template_id)!==String(requested))throw new Error('Snapshot UUID berbeda dari template yang sedang dibuka.');
      const snap=window.DINI_TEMPLATE_CANONICAL_V1160.resolveSnapshot(raw);

      const row=isFetchTool?null:await currentRow();if(!isFetchTool&&!row)throw new Error('Template terpilih tidak ditemukan.');
      const ident=row?{id:row.id,name:row.name,slug:row.slug}:await nextIdentity();
      const revision='r-'+Date.now().toString(36)+'-'+crypto.randomUUID().slice(0,6),base=`${safeSlug(ident.slug)}/revisions/${revision}`;

      const assets=[...(snap.assets||[])].filter(a=>a?.key&&a?.path),unique=[],seen=new Set();
      for(const a of assets){const p=String(a.path||'').replace(/^\/+/, '');if(!p||seen.has(p))continue;seen.add(p);unique.push({...a,path:p})}
      const db=await openDB(),replacements=new Map();let finished=0;const small=t?.querySelector?.('small');if(small)small.textContent=`Canonical OK · upload asset 0/${unique.length}`;
      await runPool(unique,4,async a=>{const blob=await readAsset(db,a.key);if(!blob)throw new Error(`Blob asset hilang: ${a.path}`);const url=await upload(`${base}/${a.path}`,blob,a.type||blob.type);replacements.set(a.path,url);finished++;if(small)small.textContent=`Canonical OK · upload asset ${finished}/${unique.length}`});

      const refs=localRefs({html:snap.html,values:snap.values,schema:snap.schema});
      const missing=refs.filter(p=>!replacements.has(p));
      if(missing.length)throw new Error(`Canonical package belum lengkap: ${missing.length} asset lokal tidak punya blob (${missing.slice(0,3).join(', ')}). Klik Generate Semua Aset lalu APPLY lagi.`);

      let finalHtml=String(snap.html||'');for(const [from,to] of replacements)finalHtml=finalHtml.split(from).join(to);
      const values=replaceAllDeep(deep(snap.values||{}),replacements),schema=replaceAllDeep(deep(snap.schema||{}),replacements),manifestBase=replaceAllDeep(deep(snap.manifest||{}),replacements);
      const snapshotPath=`${base}/editor-snapshot.json`,indexPath=`${base}/index.html`,schemaPath=`${base}/native-schema.json`,dataPath=`${base}/native-data.json`,manifestPath=`${base}/manifest.json`;
      const snapshotUrl=publicUrl(snapshotPath),sourceUrl=publicUrl(indexPath),assetBase=canonicalAssetBase(finalHtml,{...manifestBase,source_url:sourceUrl});
      const pendingB2=(()=>{try{return JSON.parse(localStorage.getItem('diniAnifPendingB2Upload')||'null')}catch{return null}})();
      const manifest={...manifestBase,editor_version:'2.33.0',renderer_version:'canonical-template-contract-1.16.0',revision,revision_id:revision,template_id:ident.id,record_id:ident.id,editor_snapshot_url:snapshotUrl,source_url:sourceUrl,source_of_truth:'canonical-editor-current',canonicalization_version:'1.16.0',snapshot_scope_version:'1.16.0',asset_base:assetBase,saved_at:new Date().toISOString(),artifact_prefix:base,...(pendingB2?.object_key?{package_storage:pendingB2}:{})};
      const cloudSnap={...deep(snap),version:'2.33.0',template_id:ident.id,record_id:ident.id,snapshot_scope:ident.id,snapshot_scope_version:'1.16.0',revision,html:finalHtml,baseHtml:finalHtml,values,schema,manifest,assets:[],saved_at:new Date().toISOString()};
      if(small)small.textContent='Upload canonical HTML + snapshot + schema…';
      await Promise.all([
        uploadText(indexPath,finalHtml,'text/html; charset=utf-8'),
        uploadText(snapshotPath,JSON.stringify(cloudSnap,null,2)),
        uploadText(schemaPath,JSON.stringify(schema,null,2)),
        uploadText(dataPath,JSON.stringify({values,transforms:deep(snap.transforms||{}),canonicalization:snap.canonicalization||{}},null,2)),
        uploadText(manifestPath,JSON.stringify(manifest,null,2))
      ]);

      const status=row?(row.status||(row.is_active?'active':'draft')):'draft',isActive=row?!!row.is_active:false;
      const payload={name:ident.name,slug:ident.slug,source_path:sourceUrl,status,is_active:isActive,package_path:`supabase://${BUCKET}/${snapshotPath}`,manifest_json:manifest,updated_at:new Date().toISOString()};
      if(small)small.textContent=isFetchTool?'Mendaftarkan canonical template baru…':'Memperbarui canonical UUID yang sama…';
      const result=row?await withTimeout(sb.from('templates').update(payload).eq('id',ident.id).select('*').single(),15000,'Update template'):await withTimeout(sb.from('templates').insert({id:ident.id,...payload}).select('*').single(),15000,'Insert template baru');
      if(result.error)throw result.error;
      const verify=await withTimeout(sb.from('templates').select('id,name,slug,status,is_active,manifest_json').eq('id',ident.id).single(),12000,'Verifikasi template');if(verify.error||!verify.data)throw new Error('Template belum terbaca setelah simpan.');
      if(verify.data.manifest_json?.revision!==revision)throw new Error('Revision verification mismatch setelah simpan.');

      const localScoped={...snap,template_id:ident.id,record_id:ident.id,snapshot_scope:ident.id,snapshot_scope_version:'1.16.0'};
      await writeSnapKey(scopedKey(ident.id),localScoped);await writeSnapKey(GLOBAL_KEY,localScoped);
      const diag=snap.canonicalization||{};
      finishToast(t,`${verify.data.name} tersimpan dari canonical CURRENT · ${diag.propagated_fields||0} alias disinkronkan · revision ${revision}.`,'success',isFetchTool?'Template baru canonical':'Template canonical diperbarui');
      await sleep(850);location.href='/dashboard-admin-template?refresh='+Date.now();
    }catch(err){console.error('TEMPLATE_SAVE_FAST_V1160',err);finishToast(t,err?.message||String(err),'error','Simpan canonical gagal');if(btn)btn.disabled=false}
    finally{saving=false}
  }

  document.addEventListener('click',e=>{const btn=e.target?.closest?.('#saveDraftBtn');if(!btn)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();saveAppliedAsTemplate()},true);
  document.documentElement.dataset.templateSave='v1.16.0';
})();
