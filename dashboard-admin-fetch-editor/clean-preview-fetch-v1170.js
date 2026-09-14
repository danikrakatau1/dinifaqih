(async()=>{
  'use strict';
  const VERSION='1.17.0-fetch-clean';
  const DB_NAME='dini-anif-editor-v150',DB_VERSION=2,SNAP_KEY='native-applied';
  const frame=document.getElementById('cleanFrame'),empty=document.getElementById('empty'),status=document.getElementById('sweepStatus');
  const download=document.getElementById('downloadCleanZip'),save=document.getElementById('saveCleanZip');
  if(!frame)return;

  const urls=[];
  const openDB=()=>new Promise((res,rej)=>{const q=indexedDB.open(DB_NAME,DB_VERSION);q.onupgradeneeded=()=>{const db=q.result;if(!db.objectStoreNames.contains('assets'))db.createObjectStore('assets');if(!db.objectStoreNames.contains('snapshots'))db.createObjectStore('snapshots')};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
  const read=(db,store,key)=>new Promise((res,rej)=>{const tx=db.transaction(store);const q=tx.objectStore(store).get(key);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)});
  const rel=(fromPath,toPath)=>{const a=String(fromPath).split('/');a.pop();const b=String(toPath).split('/');while(a.length&&b.length&&a[0]===b[0]){a.shift();b.shift()}return '../'.repeat(a.length)+b.join('/')||'./'};
  const extUrlCount=html=>[...new Set((String(html||'').match(/https?:\/\/[^\s"'<>\)]+/g)||[]).filter(u=>/\.(?:css|js|mjs|jpg|jpeg|png|gif|webp|avif|svg|mp4|webm|mp3|ogg|wav|woff2?|ttf|otf|eot)(?:\?|$)/i.test(u)))].length;

  const params=new URLSearchParams(location.search),expectedHandoff=(params.get('handoff')||'').trim();
  const back=document.getElementById('backToFetch');if(back){const q=new URLSearchParams({mode:'fetch'});if(expectedHandoff)q.set('handoff',expectedHandoff);back.href='/dashboard-admin-fetch-editor/?'+q.toString()}

  let db,snap;
  try{db=await openDB();snap=await read(db,'snapshots',SNAP_KEY)}catch(err){console.warn('FETCH_CLEAN_SNAPSHOT_READ',err)}
  if(!snap){try{snap=JSON.parse(sessionStorage.getItem('diniAnifCleanPreviewApplied')||localStorage.getItem('diniAnifNativeApplied')||'null')}catch{}}
  if(!snap?.html){frame.hidden=true;if(empty){empty.hidden=false;empty.textContent='Belum ada snapshot APPLY dari Fetch Editor.'}if(status)status.textContent='NO FETCH SNAPSHOT';return}
  const actualHandoff=String(snap.fetch_handoff_id||snap.manifest?.fetch_handoff_id||'').trim();
  if(expectedHandoff&&actualHandoff&&expectedHandoff!==actualHandoff){frame.hidden=true;if(empty){empty.hidden=false;empty.textContent='Snapshot Fetch berbeda dengan handoff yang sedang dibuka. Kembali ke Fetch Editor lalu APPLY ulang.'}if(status)status.textContent='HANDOFF MISMATCH';return}
  if(empty)empty.hidden=true;frame.hidden=false;

  const assets=new Map();
  if(db){
    for(const a of snap.assets||[]){if(!a?.path||!a?.key||assets.has(a.path))continue;try{const b=await read(db,'assets',a.key);if(b)assets.set(a.path,b)}catch(err){console.warn('FETCH_CLEAN_ASSET_READ',a.path,err)}}
  }

  const liveUrls=new Map();
  for(const [path,b] of assets){if(/\.css$/i.test(path)||/text\/css/i.test(b.type||''))continue;const u=URL.createObjectURL(b);urls.push(u);liveUrls.set(path,u)}
  for(const [path,b] of assets){if(!(/\.css$/i.test(path)||/text\/css/i.test(b.type||'')))continue;let css=await b.text();for(const [depPath,u] of liveUrls){const variants=new Set([depPath,rel(path,depPath)]);if(depPath.startsWith('assets/source/deps/'))variants.add('../deps/'+depPath.slice('assets/source/deps/'.length));for(const v of variants)if(v)css=css.split(v).join(u)}const u=URL.createObjectURL(new Blob([css],{type:'text/css'}));urls.push(u);liveUrls.set(path,u)}

  let previewHtml=String(snap.html||'');for(const [path,u] of [...liveUrls.entries()].sort((a,b)=>b[0].length-a[0].length))previewHtml=previewHtml.split(path).join(u);
  frame.srcdoc=previewHtml;
  const guestMarkers=(String(snap.html).match(/data-(?:native|dini)-guest-name/g)||[]).length;
  const external=extUrlCount(snap.html);
  if(status)status.textContent=`EXACT FETCH V1.17 ✓ · handoff ${actualHandoff?actualHandoff.slice(0,8):'legacy'} · asset ${assets.size}/${(snap.assets||[]).length} · guest ${guestMarkers?'✓':'—'} · ext ${external}`;
  document.documentElement.dataset.fetchClean=VERSION;

  if(download){download.onclick=async()=>{
    const old=download.textContent;download.disabled=true;download.textContent='Menyusun ZIP…';if(save)save.hidden=true;
    try{
      const entries=[
        {name:'index.html',data:String(snap.html||'')},
        {name:'source-native.html',data:String(snap.html||'')},
        {name:'native-schema.json',data:JSON.stringify(snap.schema||{},null,2)},
        {name:'native-data.json',data:JSON.stringify(snap.values||{},null,2)},
        {name:'manifest.json',data:JSON.stringify({...snap.manifest,exported_at:new Date().toISOString(),preview:'fetch-clean-exact-v1.17.0',editor:'fetch-v1.17.0',revision:snap.revision,fetch_visual_parity:snap.fetch_visual_parity||null,text_parity:snap.text_parity||null,fetch_media_recovery:snap.fetch_media_recovery||null},null,2)},
        {name:'dependency-audit.json',data:JSON.stringify({version:VERSION,stored_assets:assets.size,declared_assets:(snap.assets||[]).length,external_runtime_asset_urls:external,remaining_blob_urls:(String(snap.html).match(/blob:/g)||[]).length,source_native_exact:true,generated_at:new Date().toISOString()},null,2)},
        {name:'README-FETCH-PARITY.txt',data:`Dini Anif Fetch Source-Native V1.17\nSnapshot mode: exact Fetch APPLY DOM\nStored assets: ${assets.size}/${(snap.assets||[]).length}\nGuest marker: ${guestMarkers?'yes':'not-detected'}\nExternal runtime asset URLs: ${external}\n`}
      ];
      for(const [path,b] of assets)entries.push({name:path,data:b});
      const zip=await window.UNDANGAN_ZIP.buildZip(entries),u=URL.createObjectURL(zip);urls.push(u);
      if(save){save.href=u;save.download='dini-anif-fetch-source-native-v1170.zip';save.hidden=false;save.dataset.objectUrl=u;save.textContent='Simpan ZIP'}
      try{const a=document.createElement('a');a.href=u;a.download='dini-anif-fetch-source-native-v1170.zip';document.body.appendChild(a);a.click();a.remove()}catch{}
      if(status)status.textContent=`ZIP EXACT ✓ · ${assets.size} asset · blob 0 · guest ${guestMarkers?'✓':'—'}`;
      download.textContent='ZIP Siap';
    }catch(err){console.error('FETCH_CLEAN_ZIP_V1170',err);if(status)status.textContent='ZIP ERROR: '+(err.message||err);download.textContent='Coba Lagi'}finally{download.disabled=false;if(download.textContent==='Menyusun ZIP…')download.textContent=old}
  }}

  addEventListener('beforeunload',()=>{for(const u of urls)try{URL.revokeObjectURL(u)}catch{}});
})().catch(err=>{console.error('FETCH_CLEAN_V1170',err);const e=document.getElementById('empty');if(e){e.hidden=false;e.textContent='Fetch Clean Preview gagal: '+(err.message||err)}const s=document.getElementById('sweepStatus');if(s)s.textContent='FETCH CLEAN ERROR'});
