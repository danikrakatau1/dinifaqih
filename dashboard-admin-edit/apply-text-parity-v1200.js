(()=>{
  'use strict';
  if(window.__DINI_APPLY_TEXT_PARITY_1200__)return;
  window.__DINI_APPLY_TEXT_PARITY_1200__=true;

  const VERSION='1.20.0';
  const DB_NAME='dini-anif-editor-v150',DB_VERSION=2,GLOBAL_KEY='native-applied';
  const params=new URLSearchParams(location.search);
  const recordId=params.get('record')||params.get('template')||'';
  const scopedKey=recordId?`${GLOBAL_KEY}:${recordId}`:'';
  const esc=v=>(window.CSS?.escape?CSS.escape(String(v||'')):String(v||'').replace(/["\\]/g,'\\$&'));

  const openDB=()=>new Promise((res,rej)=>{
    const q=indexedDB.open(DB_NAME,DB_VERSION);
    q.onupgradeneeded=()=>{const db=q.result;if(!db.objectStoreNames.contains('assets'))db.createObjectStore('assets');if(!db.objectStoreNames.contains('snapshots'))db.createObjectStore('snapshots')};
    q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error||new Error('IndexedDB gagal dibuka'));
  });
  const readKey=async key=>{const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('snapshots');const q=tx.objectStore('snapshots').get(key);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)})};
  const writeKey=async(key,value)=>{const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(value,key);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error||new Error('IndexedDB transaction aborted'))})};

  function primaryNode(doc,f){
    if(!doc||!f)return null;
    if(f.node_id){const n=doc.querySelector(`[data-native-node-id="${esc(f.node_id)}"]`);if(n)return n}
    if(f.id){
      const one=doc.querySelector(`[data-native-edit-id="${esc(f.id)}"]`);if(one)return one;
      for(const n of doc.querySelectorAll('[data-native-edit-ids]')){
        const ids=(n.getAttribute('data-native-edit-ids')||'').split(/[\s,]+/).filter(Boolean);
        if(ids.includes(f.id))return n;
      }
    }
    if(f.source_element_id){
      const host=doc.querySelector(`[data-id="${esc(f.source_element_id)}"]`);
      if(host){
        const leaf=host.querySelector('h1,h2,h3,h4,h5,h6,p,span,label,input,textarea,select');
        return leaf||host;
      }
    }
    return null;
  }
  function readText(node){
    if(!node)return null;
    if(node.matches?.('input,textarea,select'))return String(node.value??'');
    return String(node.textContent??'');
  }
  function writeText(node,value){
    if(!node)return false;
    if(node.matches?.('input,textarea,select')){
      node.value=value;node.setAttribute('value',value);return true;
    }
    if(node.textContent!==value)node.textContent=value;
    return true;
  }
  function serialize(doc){return '<!doctype html>\n'+doc.documentElement.outerHTML}

  function reconcileText(liveDoc,snap){
    const fields=Array.isArray(snap?.schema?.fields)?snap.schema.fields:[];
    const textFields=fields.filter(f=>f?.kind==='text');
    if(!textFields.length)return {captured:0,changed:0,htmlUpdated:0};
    const outDoc=new DOMParser().parseFromString(String(snap.html||snap.baseHtml||''),'text/html');
    snap.values=snap.values&&typeof snap.values==='object'?snap.values:{};
    let captured=0,changed=0,htmlUpdated=0;
    for(const f of textFields){
      const live=primaryNode(liveDoc,f);if(!live)continue;
      const value=readText(live);if(value===null)continue;
      captured++;
      const before=String(snap.values[f.id]??f.value??'');
      if(before!==value){snap.values[f.id]=value;changed++}
      else if(!(f.id in snap.values))snap.values[f.id]=value;
      const out=primaryNode(outDoc,f);
      if(out&&writeText(out,value))htmlUpdated++;
    }
    snap.html=serialize(outDoc);snap.baseHtml=snap.html;
    snap.text_parity={version:VERSION,captured_fields:captured,changed_values:changed,html_fields:htmlUpdated,captured_at:new Date().toISOString(),source:'editor-live-dom'};
    return {captured,changed,htmlUpdated};
  }

  async function reconcileApplied(){
    const snap=await readKey(GLOBAL_KEY);
    if(!snap?.html||!snap?.schema)return null;
    const liveDoc=document.getElementById('previewFrame')?.contentDocument;
    if(!liveDoc?.documentElement)throw new Error('Live Editor DOM tidak tersedia untuk Text Parity.');
    const result=reconcileText(liveDoc,snap);
    if(recordId){
      snap.template_id=recordId;snap.record_id=recordId;snap.snapshot_scope=recordId;
    }
    await writeKey(GLOBAL_KEY,snap);
    if(scopedKey)await writeKey(scopedKey,snap);
    try{localStorage.setItem('diniAnifNativeAppliedRef',JSON.stringify({store:'indexeddb',db:DB_NAME,key:scopedKey||GLOBAL_KEY,revision:snap.revision||null,template_id:recordId||snap.template_id||null,record_id:recordId||snap.record_id||null,applied_at:snap.applied_at||null,text_parity:VERSION}))}catch{}
    document.documentElement.dataset.textParity=VERSION;
    return result;
  }

  function install(){
    const btn=document.getElementById('applyBtn');
    if(!btn||typeof btn.onclick!=='function')return false;
    if(btn.dataset.textParity1200==='1')return true;
    if(btn.dataset.freshOverlay198!=='1')return false;
    const original=btn.onclick;btn.dataset.textParity1200='1';
    btn.onclick=async function applyWithTextParity(e){
      await original.call(this,e);
      try{
        const r=await reconcileApplied();if(!r)return;
        const d=document.getElementById('dirtyState');
        if(d){const base=String(d.textContent||'APPLIED ✓').replace(/\s*· TEXT PARITY.*$/,'').trim();d.textContent=`${base} · TEXT PARITY ✓ · ${r.captured}/${r.changed}`}
      }catch(err){
        console.error('APPLY_TEXT_PARITY_V1200',err);
        window.editorToast?.(err.message||String(err),'error','Text Parity gagal');
      }
    };
    document.documentElement.dataset.textParityGuard=VERSION;
    return true;
  }

  let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>260)clearInterval(timer)},100);
})();
