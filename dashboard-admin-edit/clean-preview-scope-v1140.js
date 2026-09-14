(()=>{
  'use strict';
  if(window.__DINI_CLEAN_SCOPE_1140__)return;
  window.__DINI_CLEAN_SCOPE_1140__=true;

  const DB_NAME='dini-anif-editor-v150',DB_VERSION=2,GLOBAL_KEY='native-applied';
  const params=new URLSearchParams(location.search);
  const recordId=params.get('record')||params.get('template')||'';
  const handoffId=params.get('handoff')||'';
  const scopeId=recordId||(!recordId&&handoffId?`handoff:${handoffId}`:'');
  const scopedKey=scopeId?`${GLOBAL_KEY}:${scopeId}`:'';
  const empty=document.getElementById('empty'),frame=document.getElementById('cleanFrame');

  const openDB=()=>new Promise((res,rej)=>{const q=indexedDB.open(DB_NAME,DB_VERSION);q.onupgradeneeded=()=>{const db=q.result;if(!db.objectStoreNames.contains('assets'))db.createObjectStore('assets');if(!db.objectStoreNames.contains('snapshots'))db.createObjectStore('snapshots')};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
  const readKey=async key=>{const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('snapshots');const q=tx.objectStore('snapshots').get(key);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)})};
  const writeKey=async(key,value)=>{const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(value,key);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})};
  const loadScript=src=>new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('Gagal memuat '+src));document.body.appendChild(s)});

  (async()=>{
    if(scopedKey){
      const snap=await readKey(scopedKey);
      if(!snap?.html){if(frame)frame.hidden=true;if(empty){empty.hidden=false;empty.textContent='Snapshot APPLY untuk template ini belum ada. Kembali ke Editor Template ini lalu klik APPLY.'}return}
      if(recordId&&snap.template_id&&String(snap.template_id)!==String(recordId)){if(frame)frame.hidden=true;if(empty){empty.hidden=false;empty.textContent='Snapshot template mismatch. APPLY ulang template yang sedang dibuka.'}return}
      await writeKey(GLOBAL_KEY,{...snap,template_id:recordId||snap.template_id||'',record_id:recordId||snap.record_id||'',snapshot_scope:scopeId,snapshot_scope_version:'1.14.0'});
    }
    document.documentElement.dataset.cleanSnapshotScope='v1.14.0';
    await loadScript('./clean-preview.js?v=1111-legacy-core');
    await loadScript('./clean-preview-guard.js?v=1111');
    await loadScript('./clean-media-authority-v1101.js?v=1111');
    await loadScript('./clean-text-authority-v1111.js?v=1111');
    await loadScript('./clean-visibility-parity-v1240.js?v=1240');
    await loadScript('./export-integrity-v1111.js?v=1111');
    document.documentElement.dataset.cleanParityBundle='text-1111+visibility-1240';
  })().catch(err=>{console.error('CLEAN_PREVIEW_SCOPE_V1140',err);if(frame)frame.hidden=true;if(empty){empty.hidden=false;empty.textContent='Clean Preview scoped gagal: '+(err.message||String(err))}});
})();
