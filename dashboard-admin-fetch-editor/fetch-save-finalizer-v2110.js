(()=>{
  'use strict';
  if(window.__DINI_FETCH_SAVE_FINALIZER_2110__)return;
  window.__DINI_FETCH_SAVE_FINALIZER_2110__=true;

  const E=window.DINI_FETCH_V2;
  const btn=document.getElementById('saveDraftBtn');
  if(!E||!btn)return;

  const VERSION='2.1.1';
  const BUCKET='template-packages';
  const SB_URL='https://jfvmcerrsxjvbiogfqes.supabase.co';
  const SB_KEY='sb_publishable_3IqSDxkpxCGiDpxAEwdsXQ_AsJpsC4W';
  const sb=window.supabase?.createClient?.(SB_URL,SB_KEY);
  const h=E.handoffFromUrl();

  const notify=(message,type='info',title='')=>{
    if(window.editorToast)return window.editorToast(message,type,title||undefined);
    if(type==='error')alert('SIMPAN TEMPLATE GAGAL\n\n'+message);
    else alert(message);
  };

  function contentType(path){
    const x=String(path||'').split('.').pop().toLowerCase();
    return ({html:'text/html',json:'application/json',css:'text/css',js:'text/javascript',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',svg:'image/svg+xml',mp4:'video/mp4',webm:'video/webm',mp3:'audio/mpeg',ogg:'audio/ogg',wav:'audio/wav',woff:'font/woff',woff2:'font/woff2',ttf:'font/ttf'}[x]||'application/octet-stream');
  }

  async function uploadText(path,text,type){
    const blob=new Blob([text],{type});
    const {error}=await sb.storage.from(BUCKET).upload(path,blob,{contentType:type,upsert:true,cacheControl:'3600'});
    if(error)throw error;
    return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  async function nextIdentity(){
    const {data,error}=await sb.from('templates').select('name,slug');
    if(error)throw error;
    let max=1;
    for(const r of data||[]){
      const m=String(r.name||'').match(/^Template\s+(\d+)$/i);
      if(m)max=Math.max(max,Number(m[1])||1);
    }
    const n=max+1;
    return {id:crypto.randomUUID(),name:`Template ${n}`,slug:`template-${n}-${crypto.randomUUID().slice(0,8)}`};
  }

  function sanitizeHtml(html){
    const doc=new DOMParser().parseFromString(String(html||''),'text/html');
    doc.querySelectorAll('#wpcp-error-message,.msgmsg-box-wpcp,[id^="wpcp-"]').forEach(n=>n.remove());
    doc.querySelectorAll('script').forEach(s=>{
      const id=String(s.id||''),src=String(s.getAttribute('src')||''),txt=String(s.textContent||'');
      if(/^wpcp_/i.test(id)||/wpcp|wp-content-copy-protector/i.test(src)||/Content is protected|show_wpcp_message|wccp_free_|disable_copy|disableEnterKey|document\.oncontextmenu/i.test(txt))s.remove();
    });
    doc.querySelectorAll('style').forEach(st=>{
      const t=String(st.textContent||'');
      if(/#wpcp-error-message|msgmsg-box-wpcp/i.test(t)||(/\.unselectable/i.test(t)&&/user-select\s*:\s*none/i.test(t))||/You are not allowed to print preview/i.test(t))st.remove();
    });
    doc.body?.removeAttribute('unselectable');
    doc.querySelectorAll('.unselectable').forEach(n=>n.classList.remove('unselectable'));
    const htmlOut='<!doctype html>\n'+doc.documentElement.outerHTML;
    return htmlOut;
  }

  function replacePathsInString(value,map){
    let out=String(value??'');
    for(const [local,publicUrl] of [...map.entries()].sort((a,b)=>b[0].length-a[0].length)){
      if(local)out=out.split(local).join(publicUrl);
    }
    return out;
  }

  function replaceDeep(value,map){
    if(typeof value==='string')return replacePathsInString(value,map);
    if(Array.isArray(value))return value.map(v=>replaceDeep(v,map));
    if(value&&typeof value==='object'){
      const out={};
      for(const [k,v] of Object.entries(value))out[k]=replaceDeep(v,map);
      return out;
    }
    return value;
  }

  async function collectAssets(session,snap){
    const list=[];
    const seen=new Set();
    for(const a of snap.assets||[]){
      if(!a?.key||!a?.path||seen.has(a.path))continue;
      seen.add(a.path);
      const blob=await E.getAssetByKey(a.key);
      if(!blob)throw new Error('Asset edit tidak ditemukan di IndexedDB: '+a.path);
      list.push({meta:a,blob});
    }
    for(const a of Object.values(session.assets||{})){
      if(!a?.key||!a?.path||seen.has(a.path))continue;
      seen.add(a.path);
      const blob=await E.getAssetByKey(a.key);
      if(!blob)throw new Error('Asset session tidak ditemukan di IndexedDB: '+a.path);
      list.push({meta:a,blob});
    }
    return list;
  }

  async function finalizeAndSave(){
    if(!sb)throw new Error('Supabase tidak tersedia.');
    if(!h)throw new Error('Handoff Fetch tidak ditemukan.');

    const {data:{session:auth},error:authError}=await sb.auth.getSession();
    if(authError||!auth)throw new Error('Session admin tidak ditemukan.');

    const session=await E.loadOrCreateSession(h);
    const snap=await E.readApplied(h);
    if(!snap?.html)throw new Error('Belum ada Applied Snapshot. Klik APPLY terlebih dulu.');
    if(snap.handoff!==h)throw new Error('Applied Snapshot berbeda handoff.');

    const currentDelta=JSON.stringify(session.delta||{});
    const appliedDelta=JSON.stringify(snap.delta||{});
    if(currentDelta!==appliedDelta)throw new Error('Ada perubahan setelah APPLY. Klik APPLY lagi sebelum Simpan sebagai Template Baru.');

    const ident=await nextIdentity();
    const base=ident.slug;
    const assets=await collectAssets(session,snap);
    const publicMap=new Map();
    const cloudAssets=[];

    for(const {meta,blob} of assets){
      const objectPath=`${base}/${meta.path}`;
      const {error}=await sb.storage.from(BUCKET).upload(objectPath,blob,{contentType:blob.type||meta.type||contentType(meta.path),upsert:true,cacheControl:'3600'});
      if(error)throw new Error(`${meta.path}: ${error.message}`);
      const publicUrl=sb.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl;
      publicMap.set(meta.path,publicUrl);
      cloudAssets.push({...meta,public_url:publicUrl,cloud_object_path:objectPath});
    }

    let html=replacePathsInString(snap.html,publicMap);
    html=sanitizeHtml(html);

    const values=replaceDeep(snap.values||{},publicMap);
    const delta=replaceDeep(snap.delta||{},publicMap);
    const schema=replaceDeep(snap.schema||{},publicMap);
    const manifestBase=replaceDeep(snap.manifest||{},publicMap);

    const sourceUrl=await uploadText(`${base}/index.html`,html,'text/html');
    await uploadText(`${base}/source-native.html`,html,'text/html');
    const assetBase=sourceUrl.replace(/index\.html(?:\?.*)?$/,'');

    const manifest={
      ...manifestBase,
      editor_version:'fetch-v2.1.1',
      renderer_version:'immutable-baseline-delta-v2',
      save_finalizer_version:VERSION,
      source_of_truth:'editor-snapshot',
      baseline_hash:snap.baseline_hash,
      fetch_handoff_id:h,
      asset_base:assetBase,
      saved_asset_count:cloudAssets.length,
      saved_asset_paths_absolute:true,
      source_protection_sanitized:true,
      saved_at:E.now(),
      ...(session.package_storage?{package_storage:session.package_storage}:{})
    };

    const cloudSnap={
      ...snap,
      manifest,
      html,
      baseHtml:html,
      values,
      delta,
      schema,
      assets:cloudAssets,
      save_finalizer:{version:VERSION,asset_count:cloudAssets.length,absolute_asset_urls:true,protection_sanitized:true,finalized_at:E.now()}
    };

    const snapshotUrl=await uploadText(`${base}/editor-snapshot.json`,JSON.stringify(cloudSnap),'application/json');
    manifest.editor_snapshot_url=snapshotUrl;
    await uploadText(`${base}/native-schema.json`,JSON.stringify(schema,null,2),'application/json');
    await uploadText(`${base}/native-data.json`,JSON.stringify({values,transforms:snap.transforms||{},delta},null,2),'application/json');
    await uploadText(`${base}/fetch-delta.json`,JSON.stringify(delta,null,2),'application/json');
    await uploadText(`${base}/manifest.json`,JSON.stringify(manifest,null,2),'application/json');

    const payload={
      id:ident.id,
      name:ident.name,
      slug:ident.slug,
      source_path:sourceUrl,
      status:'draft',
      is_active:false,
      package_path:session.package_storage?`b2://${session.package_storage.bucket}/${session.package_storage.object_key}`:`supabase://${BUCKET}/${base}/manifest.json`,
      manifest_json:manifest,
      updated_at:E.now()
    };

    const {error}=await sb.from('templates').insert(payload);
    if(error)throw error;

    notify(`${ident.name} tersimpan. ${cloudAssets.length} asset edit dimaterialisasi menjadi URL publik dan proteksi source dibersihkan sebelum masuk Template Library.`,'success','TEMPLATE BARU BERHASIL ✅');
    setTimeout(()=>location.href='/dashboard-admin-template',1100);
  }

  btn.addEventListener('click',async e=>{
    e.preventDefault();
    e.stopImmediatePropagation();
    if(btn.disabled)return;
    btn.disabled=true;
    const old=btn.textContent;
    btn.textContent='Menyimpan Template Baru…';
    try{
      await finalizeAndSave();
    }catch(err){
      console.error('FETCH_SAVE_FINALIZER_2110',err);
      notify(err?.message||String(err),'error','SIMPAN TEMPLATE GAGAL ❌');
      btn.disabled=false;
      btn.textContent=old;
    }
  },true);
})();
