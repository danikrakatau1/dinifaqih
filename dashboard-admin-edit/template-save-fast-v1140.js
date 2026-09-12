(()=>{
  'use strict';
  if(window.__DINI_TEMPLATE_SAVE_FAST_1140__)return;
  window.__DINI_TEMPLATE_SAVE_FAST_1140__=true;

  const SUPABASE_URL='https://jfvmcerrsxjvbiogfqes.supabase.co';
  const SUPABASE_KEY='sb_publishable_3IqSDxkpxCGiDpxXQ_AsJpsC4W';
  const BUCKET='template-packages';
  const DB_NAME='dini-anif-editor-v150',DB_VERSION=2,GLOBAL_KEY='native-applied';
  const sb=window.supabase?.createClient?.(SUPABASE_URL,SUPABASE_KEY);
  let saving=false;

  const params=new URLSearchParams(location.search);
  const urlRecordId=()=>params.get('record')||params.get('template')||'';
  const scopedKey=id=>`${GLOBAL_KEY}:${id}`;
  const deep=v=>JSON.parse(JSON.stringify(v));
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const safeSlug=v=>String(v||'template').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,64)||'template';
  const withTimeout=(promise,ms,label='Operasi')=>Promise.race([promise,new Promise((_,rej)=>setTimeout(()=>rej(new Error(`${label} timeout setelah ${Math.round(ms/1000)} detik`)),ms))]);

  function toast(message,type='success',title=''){
    if(typeof window.editorToast==='function')return window.editorToast(message,type,title);
    let stack=document.querySelector('#editorToastStack');if(!stack){stack=document.createElement('div');stack.id='editorToastStack';stack.className='editor-toast-stack';document.body.appendChild(stack)}
    const el=document.createElement('div');el.className='editor-toast '+type;el.innerHTML=`<strong>${title||'Info'}</strong><small>${message}</small>`;stack.appendChild(el);requestAnimationFrame(()=>el.classList.add('show'));if(type!=='loading')setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),250)},3600);return el;
  }
  function finishToast(el,message,type='success',title=''){
    if(typeof window.finishEditorToast==='function')return window.finishEditorToast(el,message,type,title);
    if(!el)return toast(message,type,title);el.className='editor-toast '+type+' show';el.innerHTML=`<strong>${title||(type==='success'?'Sukses':'Gagal')}</strong><small>${message}</small>`;if(type!=='loading')setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),250)},3600);
  }

  function openDB(){return new Promise((res,rej)=>{const q=indexedDB.open(DB_NAME,DB_VERSION);q.onupgradeneeded=()=>{const db=q.result;if(!db.objectStoreNames.contains('assets'))db.createObjectStore('assets');if(!db.objectStoreNames.contains('snapshots'))db.createObjectStore('snapshots')};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error||new Error('IndexedDB gagal dibuka'))})}
  async function readSnapKey(key){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('snapshots');const q=tx.objectStore('snapshots').get(key);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error||new Error('Snapshot APPLY tidak terbaca'))})}
  async function writeSnapKey(key,value){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(value,key);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error||new Error('IndexedDB transaction aborted'))})}
  async function readApplied(){const id=urlRecordId();if(id){const scoped=await readSnapKey(scopedKey(id));if(scoped)return scoped;throw new Error('Snapshot APPLY khusus template ini belum ada. Klik APPLY sekali lagi sebelum Simpan / Update Draft.')}return readSnapKey(GLOBAL_KEY)}
  async function readAsset(db,key){return new Promise((res,rej)=>{const tx=db.transaction('assets');const q=tx.objectStore('assets').get(key);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error||new Error(`Asset ${key} tidak terbaca`))})}

  function publicUrl(path){return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl}
  async function upload(path,blob,type){const op=sb.storage.from(BUCKET).upload(path,blob,{contentType:type||blob?.type||'application/octet-stream',upsert:true,cacheControl:'3600'});const {error}=await withTimeout(op,45000,`Upload ${path.split('/').pop()}`);if(error)throw new Error(`${path}: ${error.message}`);return publicUrl(path)}
  const uploadText=(path,text,type='application/json; charset=utf-8')=>upload(path,new Blob([text],{type}),type);
  async function runPool(items,limit,worker){let cursor=0;const runners=Array.from({length:Math.min(limit,Math.max(1,items.length))},async()=>{while(true){const i=cursor++;if(i>=items.length)return;await worker(items[i],i)}});await Promise.all(runners)}
  function replaceAllDeep(value,map){if(typeof value==='string'){let out=value;for(const [from,to] of map)if(from&&out.includes(from))out=out.split(from).join(to);return out}if(Array.isArray(value))return value.map(v=>replaceAllDeep(v,map));if(value&&typeof value==='object'){const out={};for(const [k,v] of Object.entries(value))out[k]=replaceAllDeep(v,map);return out}return value}

  function dirname(raw){try{const u=new URL(raw,location.href);if(/\.[a-z0-9]{1,8}$/i.test(u.pathname.split('/').pop()||''))u.pathname=u.pathname.replace(/[^/]*$/,'');if(!u.pathname.endsWith('/'))u.pathname+='/';u.search='';u.hash='';return u.href}catch{return ''}}
  function canonicalAssetBase(html,manifest={}){
    try{const doc=new DOMParser().parseFromString(String(html||''),'text/html');const raw=String(doc.querySelector('base')?.getAttribute('href')||'').trim();if(raw){const resolved=new URL(raw,manifest.source_url||location.href).href;const d=dirname(resolved);if(d)return d}}
    catch{}
    const source=String(manifest.source_url||'').trim();if(source){const d=dirname(source);if(d)return d}
    const current=String(manifest.asset_base||'').trim();if(current){const d=dirname(current);if(d)return d}
    return location.origin+'/';
  }

  async function currentRow(){const id=urlRecordId();if(!id)return null;const r=await withTimeout(sb.from('templates').select('*').eq('id',id).maybeSingle(),15000,'Baca template');if(r.error)throw r.error;return r.data||null}
  async function nextIdentity(){const r=await withTimeout(sb.from('templates').select('name,slug'),15000,'Baca nomor template');if(r.error)throw r.error;let max=1;for(const row of r.data||[]){const m=String(row.name||'').match(/^Template\s+(\d+)$/i);if(m)max=Math.max(max,Number(m[1])||1)}const n=max+1;return{id:crypto.randomUUID(),name:`Template ${n}`,slug:`template-${n}-${crypto.randomUUID().slice(0,8)}`}}

  async function saveAppliedAsTemplate(){
    if(saving)return;const btn=document.getElementById('saveDraftBtn');const dirty=String(document.getElementById('dirtyState')?.textContent||'');
    if(!/APPLIED|FRESH OVERLAY|PARITY CANONICAL/i.test(dirty))return toast('Klik APPLY dulu. Template Library hanya menyimpan snapshot final yang sama dengan Preview Bersih.','info','Belum APPLY');
    if(!sb)return toast('Supabase client tidak tersedia.','error','Simpan gagal');
    saving=true;if(btn)btn.disabled=true;const t=toast('Membaca snapshot APPLY scoped…','loading','Simpan Template');
    try{
      const sessionRes=await withTimeout(sb.auth.getSession(),12000,'Session admin');if(sessionRes.error||!sessionRes.data?.session)throw new Error('Session admin tidak ditemukan. Login ulang.');
      const snap=await withTimeout(readApplied(),12000,'Snapshot APPLY scoped');if(!snap?.schema||!Array.isArray(snap.schema.fields)||!snap.html)throw new Error('Snapshot APPLY belum tersedia/valid. Klik APPLY sekali lagi.');
      const requested=urlRecordId();if(requested&&snap.template_id&&String(snap.template_id)!==String(requested))throw new Error('Snapshot template mismatch. APPLY ulang Template yang sedang dibuka.');

      const row=await currentRow();const ident=row&&!row.is_active?{id:row.id,name:row.name,slug:row.slug}:await nextIdentity();
      const revision='r-'+Date.now().toString(36)+'-'+crypto.randomUUID().slice(0,6);const base=`${safeSlug(ident.slug)}/revisions/${revision}`;
      const assets=[...(snap.assets||[])].filter(a=>a?.key&&a?.path);const unique=[];const seen=new Set();for(const a of assets){const p=String(a.path||'').replace(/^\/+/, '');if(!p||seen.has(p))continue;seen.add(p);unique.push({...a,path:p})}
      const db=await openDB(),replacements=new Map();let finished=0;const small=t?.querySelector?.('small');if(small)small.textContent=`Upload asset 0/${unique.length}…`;
      await runPool(unique,4,async a=>{const blob=await readAsset(db,a.key);if(!blob)throw new Error(`Blob asset hilang: ${a.path}`);const cloudPath=`${base}/${a.path}`;const url=await upload(cloudPath,blob,a.type||blob.type);replacements.set(a.path,url);finished++;if(small)small.textContent=`Upload asset ${finished}/${unique.length}…`});

      let finalHtml=String(snap.html||'');for(const [from,to] of replacements)finalHtml=finalHtml.split(from).join(to);
      const values=replaceAllDeep(deep(snap.values||{}),replacements),schema=replaceAllDeep(deep(snap.schema||{}),replacements),manifestBase=replaceAllDeep(deep(snap.manifest||{}),replacements);
      const assetBase=canonicalAssetBase(finalHtml,manifestBase);
      const snapshotPath=`${base}/editor-snapshot.json`,indexPath=`${base}/index.html`,schemaPath=`${base}/native-schema.json`,dataPath=`${base}/native-data.json`,manifestPath=`${base}/manifest.json`;
      const snapshotUrl=publicUrl(snapshotPath),sourceUrl=publicUrl(indexPath);
      const pendingB2=(()=>{try{return JSON.parse(localStorage.getItem('diniAnifPendingB2Upload')||'null')}catch{return null}})();
      const manifest={...manifestBase,editor_version:'2.31.0',renderer_version:'stable-template-save-1.14.0',revision,revision_id:revision,template_id:ident.id,record_id:ident.id,editor_snapshot_url:snapshotUrl,source_of_truth:'applied-snapshot-scoped',snapshot_scope_version:'1.14.0',asset_base:assetBase,saved_at:new Date().toISOString(),artifact_prefix:base,...(pendingB2?.object_key?{package_storage:pendingB2}:{})};
      const cloudSnap={...deep(snap),version:'2.31.0',template_id:ident.id,record_id:ident.id,snapshot_scope:ident.id,snapshot_scope_version:'1.14.0',revision,html:finalHtml,baseHtml:finalHtml,values,schema,manifest,assets:[],saved_at:new Date().toISOString()};
      if(small)small.textContent='Upload index + scoped snapshot + schema…';
      await Promise.all([uploadText(indexPath,finalHtml,'text/html; charset=utf-8'),uploadText(snapshotPath,JSON.stringify(cloudSnap,null,2)),uploadText(schemaPath,JSON.stringify(schema,null,2)),uploadText(dataPath,JSON.stringify({values,transforms:deep(snap.transforms||{})},null,2)),uploadText(manifestPath,JSON.stringify(manifest,null,2))]);

      const payload={name:ident.name,slug:ident.slug,source_path:sourceUrl,status:'draft',is_active:false,package_path:`supabase://${BUCKET}/${snapshotPath}`,manifest_json:manifest,updated_at:new Date().toISOString()};
      if(small)small.textContent='Mendaftarkan Template Library…';
      let result;if(row&&!row.is_active)result=await withTimeout(sb.from('templates').update(payload).eq('id',ident.id).select('*').single(),15000,'Update template');else result=await withTimeout(sb.from('templates').insert({id:ident.id,...payload}).select('*').single(),15000,'Insert template');if(result.error)throw result.error;
      const verify=await withTimeout(sb.from('templates').select('id,name,slug,status,is_active').eq('id',ident.id).single(),12000,'Verifikasi template');if(verify.error||!verify.data)throw new Error('Row template belum terbaca setelah simpan.');

      const localScoped={...deep(snap),template_id:ident.id,record_id:ident.id,snapshot_scope:ident.id,snapshot_scope_version:'1.14.0'};await writeSnapKey(scopedKey(ident.id),localScoped);await writeSnapKey(GLOBAL_KEY,localScoped);
      finishToast(t,`${verify.data.name} tersimpan dari snapshot scoped yang sama dengan Clean Preview.`,'success','Template tersimpan');await sleep(650);location.href='/dashboard-admin-template?refresh='+Date.now();
    }catch(err){console.error('TEMPLATE_SAVE_FAST_V1140',err);finishToast(t,err?.message||String(err),'error','Simpan Template gagal');if(btn)btn.disabled=false}finally{saving=false}
  }

  document.addEventListener('click',e=>{const btn=e.target?.closest?.('#saveDraftBtn');if(!btn)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();saveAppliedAsTemplate()},true);
  document.documentElement.dataset.templateSave='v1.14.0';
})();
