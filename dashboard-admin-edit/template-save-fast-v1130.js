(()=>{
  'use strict';
  if(window.__DINI_TEMPLATE_SAVE_FAST_1130__)return;
  window.__DINI_TEMPLATE_SAVE_FAST_1130__=true;

  const SUPABASE_URL='https://jfvmcerrsxjvbiogfqes.supabase.co';
  const SUPABASE_KEY='sb_publishable_3IqSDxkpxCGiDpxAEwdsXQ_AsJpsC4W';
  const BUCKET='template-packages';
  const DB_NAME='dini-anif-editor-v150';
  const DB_VERSION=2;
  const SNAP_KEY='native-applied';
  const sb=window.supabase?.createClient?.(SUPABASE_URL,SUPABASE_KEY);
  let saving=false;

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const withTimeout=(promise,ms,label='Operasi')=>Promise.race([
    promise,
    new Promise((_,rej)=>setTimeout(()=>rej(new Error(`${label} timeout setelah ${Math.round(ms/1000)} detik`)),ms))
  ]);
  const safeSlug=v=>String(v||'template').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,64)||'template';
  const deep=v=>JSON.parse(JSON.stringify(v));

  function toast(message,type='success',title=''){
    if(typeof window.editorToast==='function')return window.editorToast(message,type,title);
    let stack=document.querySelector('#editorToastStack');
    if(!stack){stack=document.createElement('div');stack.id='editorToastStack';stack.className='editor-toast-stack';document.body.appendChild(stack)}
    const el=document.createElement('div');el.className='editor-toast '+type;
    el.innerHTML=`<strong>${title||'Info'}</strong><small>${message}</small>`;stack.appendChild(el);
    requestAnimationFrame(()=>el.classList.add('show'));
    if(type!=='loading')setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),250)},3600);
    return el;
  }
  function finishToast(el,message,type='success',title=''){
    if(typeof window.finishEditorToast==='function')return window.finishEditorToast(el,message,type,title);
    if(!el)return toast(message,type,title);
    el.className='editor-toast '+type+' show';
    el.innerHTML=`<strong>${title||(type==='success'?'Sukses':'Gagal')}</strong><small>${message}</small>`;
    if(type!=='loading')setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),250)},3600);
  }

  function openDB(){
    return new Promise((res,rej)=>{
      const q=indexedDB.open(DB_NAME,DB_VERSION);
      q.onupgradeneeded=()=>{const db=q.result;if(!db.objectStoreNames.contains('assets'))db.createObjectStore('assets');if(!db.objectStoreNames.contains('snapshots'))db.createObjectStore('snapshots')};
      q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error||new Error('IndexedDB gagal dibuka'));
    });
  }
  async function readSnap(){
    const db=await openDB();
    return new Promise((res,rej)=>{
      const tx=db.transaction('snapshots');const q=tx.objectStore('snapshots').get(SNAP_KEY);
      q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error||new Error('Snapshot APPLY tidak terbaca'));
    });
  }
  async function readAsset(db,key){
    return new Promise((res,rej)=>{
      const tx=db.transaction('assets');const q=tx.objectStore('assets').get(key);
      q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error||new Error(`Asset ${key} tidak terbaca`));
    });
  }
  function publicUrl(path){return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl}
  async function upload(path,blob,type){
    const op=sb.storage.from(BUCKET).upload(path,blob,{contentType:type||blob?.type||'application/octet-stream',upsert:true,cacheControl:'3600'});
    const {error}=await withTimeout(op,45000,`Upload ${path.split('/').pop()}`);
    if(error)throw new Error(`${path}: ${error.message}`);
    return publicUrl(path);
  }
  async function uploadText(path,text,type='application/json; charset=utf-8'){
    return upload(path,new Blob([text],{type}),type);
  }
  async function runPool(items,limit,worker){
    let cursor=0,done=0;
    const runners=Array.from({length:Math.min(limit,Math.max(1,items.length))},async()=>{
      while(true){const i=cursor++;if(i>=items.length)return;await worker(items[i],i);done++}
    });
    await Promise.all(runners);return done;
  }
  function replaceAllDeep(value,map){
    if(typeof value==='string'){
      let out=value;for(const [from,to] of map)if(from&&out.includes(from))out=out.split(from).join(to);return out;
    }
    if(Array.isArray(value))return value.map(v=>replaceAllDeep(v,map));
    if(value&&typeof value==='object'){
      const out={};for(const [k,v] of Object.entries(value))out[k]=replaceAllDeep(v,map);return out;
    }
    return value;
  }
  async function currentRow(){
    const q=new URLSearchParams(location.search);const id=q.get('record')||q.get('template')||'';
    if(!id)return null;
    const r=await withTimeout(sb.from('templates').select('*').eq('id',id).maybeSingle(),15000,'Baca template');
    if(r.error)throw r.error;return r.data||null;
  }
  async function nextIdentity(){
    const r=await withTimeout(sb.from('templates').select('name,slug'),15000,'Baca nomor template');
    if(r.error)throw r.error;
    let max=1;for(const row of r.data||[]){const m=String(row.name||'').match(/^Template\s+(\d+)$/i);if(m)max=Math.max(max,Number(m[1])||1)}
    const n=max+1;return {id:crypto.randomUUID(),name:`Template ${n}`,slug:`template-${n}-${crypto.randomUUID().slice(0,8)}`};
  }
  async function saveAppliedAsTemplate(){
    if(saving)return;
    const btn=document.getElementById('saveDraftBtn');
    const dirty=String(document.getElementById('dirtyState')?.textContent||'');
    if(!/APPLIED|FRESH OVERLAY|PARITY CANONICAL/i.test(dirty)){
      return toast('Klik APPLY dulu. Template Library hanya menyimpan snapshot final yang sama dengan Preview Bersih.','info','Belum APPLY');
    }
    if(!sb)return toast('Supabase client tidak tersedia.','error','Simpan gagal');
    saving=true;if(btn)btn.disabled=true;
    const t=toast('Membaca snapshot APPLY…','loading','Simpan Template');
    try{
      const sessionRes=await withTimeout(sb.auth.getSession(),12000,'Session admin');
      if(sessionRes.error||!sessionRes.data?.session)throw new Error('Session admin tidak ditemukan. Login ulang.');
      const snap=await withTimeout(readSnap(),12000,'Snapshot APPLY');
      if(!snap?.schema||!Array.isArray(snap.schema.fields)||!snap.html)throw new Error('Snapshot APPLY belum tersedia/valid. Klik APPLY sekali lagi.');

      const row=await currentRow();
      const ident=row&&!row.is_active?{id:row.id,name:row.name,slug:row.slug}:await nextIdentity();
      const revision='r-'+Date.now().toString(36)+'-'+crypto.randomUUID().slice(0,6);
      const base=`${safeSlug(ident.slug)}/revisions/${revision}`;
      const assets=[...(snap.assets||[])].filter(a=>a?.key&&a?.path);
      const unique=[];const seen=new Set();for(const a of assets){const p=String(a.path||'').replace(/^\/+/, '');if(!p||seen.has(p))continue;seen.add(p);unique.push({...a,path:p})}
      const db=await openDB();const replacements=new Map();let finished=0;
      const small=t?.querySelector?.('small');
      if(small)small.textContent=`Upload asset 0/${unique.length}…`;

      await runPool(unique,4,async a=>{
        const blob=await readAsset(db,a.key);if(!blob)throw new Error(`Blob asset hilang: ${a.path}`);
        const cloudPath=`${base}/${a.path}`;
        const url=await upload(cloudPath,blob,a.type||blob.type);
        replacements.set(a.path,url);finished++;
        if(small)small.textContent=`Upload asset ${finished}/${unique.length}…`;
      });

      let finalHtml=String(snap.html||'');
      for(const [from,to] of replacements)finalHtml=finalHtml.split(from).join(to);
      const values=replaceAllDeep(deep(snap.values||{}),replacements);
      const schema=replaceAllDeep(deep(snap.schema||{}),replacements);
      const manifestBase=replaceAllDeep(deep(snap.manifest||{}),replacements);
      const snapshotPath=`${base}/editor-snapshot.json`;
      const indexPath=`${base}/index.html`;
      const schemaPath=`${base}/native-schema.json`;
      const dataPath=`${base}/native-data.json`;
      const manifestPath=`${base}/manifest.json`;
      const snapshotUrl=publicUrl(snapshotPath);
      const sourceUrl=publicUrl(indexPath);
      const pendingB2=(()=>{try{return JSON.parse(localStorage.getItem('diniAnifPendingB2Upload')||'null')}catch{return null}})();
      const manifest={...manifestBase,editor_version:'2.30.0',renderer_version:'stable-template-save-1.0',revision,revision_id:revision,editor_snapshot_url:snapshotUrl,source_of_truth:'applied-snapshot',saved_at:new Date().toISOString(),artifact_prefix:base,...(pendingB2?.object_key?{package_storage:pendingB2}:{})};
      const cloudSnap={...deep(snap),version:'2.30.0',revision,html:finalHtml,baseHtml:finalHtml,values,manifest,assets:[],saved_at:new Date().toISOString()};
      if(small)small.textContent='Upload index + snapshot + schema…';
      await Promise.all([
        uploadText(indexPath,finalHtml,'text/html; charset=utf-8'),
        uploadText(snapshotPath,JSON.stringify(cloudSnap,null,2)),
        uploadText(schemaPath,JSON.stringify(schema,null,2)),
        uploadText(dataPath,JSON.stringify({values,transforms:deep(snap.transforms||{})},null,2)),
        uploadText(manifestPath,JSON.stringify(manifest,null,2))
      ]);

      const payload={name:ident.name,slug:ident.slug,source_path:sourceUrl,status:'draft',is_active:false,package_path:`supabase://${BUCKET}/${snapshotPath}`,manifest_json:manifest,updated_at:new Date().toISOString()};
      if(small)small.textContent='Mendaftarkan Template Library…';
      let result;
      if(row&&!row.is_active)result=await withTimeout(sb.from('templates').update(payload).eq('id',ident.id).select('*').single(),15000,'Update template');
      else result=await withTimeout(sb.from('templates').insert({id:ident.id,...payload}).select('*').single(),15000,'Insert template');
      if(result.error)throw result.error;
      const verify=await withTimeout(sb.from('templates').select('id,name,slug,status,is_active').eq('id',ident.id).single(),12000,'Verifikasi template');
      if(verify.error||!verify.data)throw new Error('Row template belum terbaca setelah simpan.');
      finishToast(t,`${verify.data.name} tersimpan dan sudah terverifikasi di Template Library.`,'success','Template tersimpan');
      await sleep(650);location.href='/dashboard-admin-template?refresh='+Date.now();
    }catch(err){
      console.error('TEMPLATE_SAVE_FAST_V1130',err);
      finishToast(t,err?.message||String(err),'error','Simpan Template gagal');
      if(btn)btn.disabled=false;
    }finally{saving=false}
  }

  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('#saveDraftBtn');if(!btn)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    saveAppliedAsTemplate();
  },true);
  document.documentElement.dataset.templateSave='v1.13.0';
})();
