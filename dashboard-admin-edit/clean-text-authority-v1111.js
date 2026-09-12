(() => {
  'use strict';
  const VERSION='1.11.1';
  const DB_NAME='dini-anif-editor-v150',DB_VERSION=2,SNAP_KEY='native-applied';
  const frame=document.getElementById('cleanFrame');
  if(!frame||frame.dataset.textAuthority1111)return;
  frame.dataset.textAuthority1111='1';

  const openDB=()=>new Promise((res,rej)=>{const q=indexedDB.open(DB_NAME,DB_VERSION);q.onupgradeneeded=()=>{const db=q.result;if(!db.objectStoreNames.contains('snapshots'))db.createObjectStore('snapshots')};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
  const read=(db,key)=>new Promise((res,rej)=>{const tx=db.transaction('snapshots');const q=tx.objectStore('snapshots').get(key);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)});
  async function readSnap(){try{return await read(await openDB(),SNAP_KEY)}catch(e){console.warn('TEXT_AUTHORITY_IDB',e)}try{return JSON.parse(localStorage.getItem('diniAnifNativeApplied')||'null')}catch{return null}}
  const esc=v=>(window.CSS?.escape?CSS.escape(String(v||'')):String(v||'').replace(/["\\]/g,'\\$&'));
  function nodes(doc,f){const out=[],seen=new Set(),add=n=>{if(n&&!seen.has(n)){seen.add(n);out.push(n)}};doc.querySelectorAll('[data-native-edit-id],[data-native-edit-ids]').forEach(n=>{const one=n.getAttribute('data-native-edit-id')||'',many=(n.getAttribute('data-native-edit-ids')||'').split(/[\s,]+/).filter(Boolean);if(one===f.id||many.includes(f.id))add(n)});if(f.node_id)add(doc.querySelector(`[data-native-node-id="${esc(f.node_id)}"]`));return out}

  let snap=null,busy=false,observer=null;
  function apply(){
    const doc=frame.contentDocument;if(!doc?.documentElement||!snap||busy)return;
    busy=true;
    try{
      for(const f of snap.schema?.fields||[]){
        if(f.kind!=='text')continue;
        const value=String(snap.values?.[f.id]??f.value??'');
        for(const n of nodes(doc,f)){
          if(n.matches?.('input,textarea,select')){if(String(n.value??'')!==value)n.value=value;n.setAttribute('value',value)}
          else if(String(n.textContent??'')!==value)n.textContent=value;
          n.setAttribute('data-native-text-authority',VERSION);
        }
      }
    }finally{busy=false}
  }

  function watch(){
    const doc=frame.contentDocument;if(!doc?.documentElement)return;
    observer?.disconnect();
    observer=new MutationObserver(()=>{if(!busy)requestAnimationFrame(apply)});
    observer.observe(doc.documentElement,{subtree:true,childList:true,characterData:true});
    apply();[50,180,500,1200,3000].forEach(ms=>setTimeout(apply,ms));
  }

  (async()=>{snap=await readSnap();if(!snap)return;frame.addEventListener('load',watch);if(frame.contentDocument?.readyState!=='loading')watch()})().catch(e=>console.error('CLEAN_TEXT_AUTHORITY_V1111',e));
})();
