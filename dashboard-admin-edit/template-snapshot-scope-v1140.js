(()=>{
  'use strict';
  if(window.__DINI_TEMPLATE_SCOPE_1140__)return;
  window.__DINI_TEMPLATE_SCOPE_1140__=true;

  const DB_NAME='dini-anif-editor-v150',DB_VERSION=2,GLOBAL_KEY='native-applied';
  const params=new URLSearchParams(location.search);
  const recordId=params.get('record')||params.get('template')||'';
  const handoffId=params.get('handoff')||'';
  const scopeId=recordId||(!recordId&&handoffId?`handoff:${handoffId}`:'');
  const scopedKey=scopeId?`${GLOBAL_KEY}:${scopeId}`:'';

  const openDB=()=>new Promise((res,rej)=>{
    const q=indexedDB.open(DB_NAME,DB_VERSION);
    q.onupgradeneeded=()=>{const db=q.result;if(!db.objectStoreNames.contains('assets'))db.createObjectStore('assets');if(!db.objectStoreNames.contains('snapshots'))db.createObjectStore('snapshots')};
    q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);
  });
  const readKey=async key=>{const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('snapshots');const q=tx.objectStore('snapshots').get(key);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)})};
  const writeKey=async(key,value)=>{const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(value,key);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error||new Error('IndexedDB transaction aborted'))})};

  function scopedPreviewUrl(){
    const q=new URLSearchParams();
    if(recordId){q.set('template',recordId);q.set('record',recordId)}
    else if(handoffId)q.set('handoff',handoffId);
    return './clean-preview.html'+(q.toString()?`?${q.toString()}`:'');
  }
  function patchPreviewHref(){
    const a=document.getElementById('cleanPreviewBtn');if(!a)return;
    a.href=scopedPreviewUrl();
    if(typeof a.onclick==='function'&&a.dataset.templateScopePreview1140!=='1'){
      const original=a.onclick;a.dataset.templateScopePreview1140='1';
      a.onclick=function scopedCleanPreview(e){
        const realOpen=window.open;
        window.open=function(url,target,...rest){
          const next=/^(?:\.\/)?clean-preview\.html(?:[?#].*)?$/i.test(String(url||''))?scopedPreviewUrl():url;
          return realOpen.call(window,next,target,...rest);
        };
        try{return original.call(this,e)}finally{window.open=realOpen}
      };
    }
  }

  function install(){
    patchPreviewHref();
    const btn=document.getElementById('applyBtn');
    if(!btn||typeof btn.onclick!=='function')return false;
    if(btn.dataset.templateScope1140==='1')return true;
    if(!btn.dataset.freshOverlay198)return false;
    const original=btn.onclick;btn.dataset.templateScope1140='1';
    btn.onclick=async function templateScopedApply(e){
      await original.call(this,e);
      if(!scopedKey)return;
      try{
        const snap=await readKey(GLOBAL_KEY);
        if(!snap?.html||!snap?.revision)return;
        const scoped={...snap,template_id:recordId||snap.template_id||'',record_id:recordId||snap.record_id||'',handoff_id:handoffId||snap.handoff_id||'',snapshot_scope:scopeId,snapshot_scope_version:'1.14.0'};
        await writeKey(GLOBAL_KEY,scoped);
        await writeKey(scopedKey,scoped);
        try{localStorage.setItem('diniAnifNativeAppliedRef',JSON.stringify({store:'indexeddb',db:DB_NAME,key:scopedKey,revision:scoped.revision,template_id:scoped.template_id||null,record_id:scoped.record_id||null,applied_at:scoped.applied_at||null,scope_version:'1.14.0'}))}catch{}
      }catch(err){console.error('TEMPLATE_SCOPE_V1140',err);window.editorToast?.(err.message||String(err),'error','Snapshot scope gagal')}
    };
    document.documentElement.dataset.templateScope='v1.14.0';
    return true;
  }

  let tries=0;const timer=setInterval(()=>{tries++;patchPreviewHref();if(install()||tries>240)clearInterval(timer)},100);
})();
