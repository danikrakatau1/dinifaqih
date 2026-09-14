(()=>{
  'use strict';
  if(window.__DINI_FETCH_PARITY_1160__)return;
  window.__DINI_FETCH_PARITY_1160__=true;

  const VERSION='1.16.0-fetch';
  const DB_NAME='dini-anif-editor-v150',DB_VERSION=2,SNAP_KEY='native-applied';
  const esc=v=>(window.CSS?.escape?CSS.escape(String(v||'')):String(v||'').replace(/["\\]/g,'\\$&'));
  const norm=v=>String(v??'').replace(/\s+/g,' ').trim();
  const TEXT_SEL='h1,h2,h3,h4,h5,h6,p,span,a,label,button,strong,em,small,li,td,th,input,textarea,select';

  const openDB=()=>new Promise((res,rej)=>{
    const q=indexedDB.open(DB_NAME,DB_VERSION);
    q.onupgradeneeded=()=>{const db=q.result;if(!db.objectStoreNames.contains('assets'))db.createObjectStore('assets');if(!db.objectStoreNames.contains('snapshots'))db.createObjectStore('snapshots')};
    q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error||new Error('IndexedDB Fetch gagal dibuka'));
  });
  const readApplied=async()=>{const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('snapshots');const q=tx.objectStore('snapshots').get(SNAP_KEY);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)})};
  const writeApplied=async snap=>{const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(snap,SNAP_KEY);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error||new Error('IndexedDB Fetch transaction aborted'))})};

  function nodeFor(doc,f){
    if(!doc||!f)return null;
    if(f.node_id){const n=doc.querySelector(`[data-native-node-id="${esc(f.node_id)}"]`);if(n)return n}
    if(f.id){
      const n=doc.querySelector(`[data-native-edit-id="${esc(f.id)}"]`);if(n)return n;
      for(const x of doc.querySelectorAll('[data-native-edit-ids]')){
        const ids=(x.getAttribute('data-native-edit-ids')||'').split(/[\s,]+/).filter(Boolean);if(ids.includes(f.id))return x;
      }
    }
    if(f.source_element_id){const host=doc.querySelector(`[data-id="${esc(f.source_element_id)}"]`);if(host)return host}
    return null;
  }
  function textLeaf(node,f){
    if(!node)return null;
    if(node.matches?.(TEXT_SEL))return node;
    if(f?.id){const marked=node.querySelector?.(`[data-native-edit-id="${esc(f.id)}"]`);if(marked)return marked}
    const heads=[...node.querySelectorAll?.('.elementor-heading-title')||[]];if(heads.length===1)return heads[0];
    const all=[...node.querySelectorAll?.(TEXT_SEL)||[]].filter(n=>!n.querySelector?.(TEXT_SEL));
    return all.length===1?all[0]:(all[0]||null);
  }
  function textOf(n){return n?.matches?.('input,textarea,select')?String(n.value??''):String(n?.textContent??'')}
  function writeText(out,live){
    if(!out||!live)return false;
    if(out.matches?.('input,textarea,select')){const v=textOf(live);out.value=v;out.setAttribute('value',v)}else out.innerHTML=live.innerHTML;
    return true;
  }
  function revealTextChain(leaf){
    let fixed=0,n=leaf,depth=0;
    while(n&&depth++<7){
      if(n.classList?.contains('elementor-invisible')){n.classList.remove('elementor-invisible');fixed++}
      if(n.hasAttribute?.('hidden')){n.removeAttribute('hidden');fixed++}
      if(n.getAttribute?.('aria-hidden')==='true'){n.removeAttribute('aria-hidden');fixed++}
      if(n.style?.getPropertyValue('display')==='none'){n.style.removeProperty('display');fixed++}
      if(n.style?.getPropertyValue('visibility')==='hidden'){n.style.removeProperty('visibility');fixed++}
      if(n.style?.getPropertyValue('opacity')==='0'){n.style.removeProperty('opacity');fixed++}
      n=n.parentElement;
    }
    return fixed;
  }
  function sourceAssetEvidence(snap,url){
    if(!url)return false;
    const target=String(url).split('?')[0].split('#')[0];
    const file=target.split('/').pop()||'';
    for(const a of snap.assets||[]){
      const src=String(a?.source||'');const path=String(a?.path||'');const name=String(a?.name||'');
      if(src===url||src.split('?')[0]===target||file&&(path.endsWith('/'+file)||name===file))return true;
    }
    const graphs=[snap.manifest?.source_graph?.visuals,snap.manifest?.visual_manifest?.sources].filter(Array.isArray);
    for(const list of graphs)if(list.some(x=>String(x?.url||'').split('?')[0]===target))return true;
    return false;
  }
  function repairImageNode(node,value){
    if(!node||!value)return false;
    const img=node.matches?.('img')?node:node.querySelector?.('img');if(!img)return false;
    img.setAttribute('src',value);img.setAttribute('data-src',value);
    img.removeAttribute('data-lazy-src');img.removeAttribute('data-original');
    return true;
  }
  function reconcile(live,snap){
    const out=new DOMParser().parseFromString(String(snap.html||snap.baseHtml||''),'text/html');
    snap.values=snap.values&&typeof snap.values==='object'?snap.values:{};
    let textCaptured=0,textMissed=0,visibilityFixed=0,imageRecovered=0;
    const textDetails=[],mediaDetails=[];

    for(const f of snap.schema?.fields||[]){
      if(f?.kind!=='text'||!f.id)continue;
      const ln=textLeaf(nodeFor(live,f),f),on=textLeaf(nodeFor(out,f),f);
      if(!ln||!on){textMissed++;continue}
      const actual=textOf(ln);snap.values[f.id]=actual;writeText(on,ln);
      on.setAttribute('data-native-edit-id',f.id);on.setAttribute('data-text-leaf-lock',VERSION);
      visibilityFixed+=revealTextChain(on);textCaptured++;
      textDetails.push({id:f.id,value:actual.slice(0,160)});
    }

    for(const f of snap.schema?.fields||[]){
      if(f?.kind!=='image'||!f.id)continue;
      const current=String(snap.values[f.id]??'').trim();
      const fallback=String(f.value??'').trim();
      if(current||!/^https?:\/\//i.test(fallback)||!sourceAssetEvidence(snap,fallback))continue;
      const liveNode=nodeFor(live,f),outNode=nodeFor(out,f);
      const liveImg=liveNode?.matches?.('img')?liveNode:liveNode?.querySelector?.('img');
      const liveValue=String(liveImg?.getAttribute('src')||liveImg?.getAttribute('data-src')||liveImg?.getAttribute('data-lazy-src')||'').trim();
      if(liveValue)continue;
      snap.values[f.id]=fallback;
      const a=repairImageNode(outNode,fallback);const b=repairImageNode(liveNode,fallback);
      if(a||b){imageRecovered++;mediaDetails.push({id:f.id,value:fallback,label:f.label||''})}
    }

    out.documentElement.setAttribute('data-fetch-parity',VERSION);
    snap.html='<!doctype html>\n'+out.documentElement.outerHTML;snap.baseHtml=snap.html;
    snap.text_parity={version:VERSION,captured_fields:textCaptured,missed_fields:textMissed,details:textDetails.slice(0,160),source:'fetch-editor-live-dom',captured_at:new Date().toISOString()};
    snap.visibility_parity={version:VERSION,fixed_nodes:visibilityFixed,applied_at:new Date().toISOString()};
    snap.fetch_media_recovery={version:VERSION,recovered_images:imageRecovered,details:mediaDetails,policy:'empty-live-image+schema-default+source-asset-evidence',applied_at:new Date().toISOString()};
    return {textCaptured,textMissed,visibilityFixed,imageRecovered};
  }

  async function reconcileApplied(){
    const snap=await readApplied();if(!snap?.html||!snap?.schema)return null;
    const live=document.getElementById('previewFrame')?.contentDocument;if(!live?.documentElement)throw new Error('Fetch Live Preview DOM tidak tersedia.');
    const r=reconcile(live,snap);await writeApplied(snap);
    try{localStorage.setItem('diniAnifNativeAppliedRef',JSON.stringify({store:'indexeddb',db:window.__DINI_FETCH_EDITOR_DB__||'dini-anif-fetch-editor-v1150',key:SNAP_KEY,revision:snap.revision||null,applied_at:snap.applied_at||null,fetch_parity:VERSION}))}catch{}
    document.documentElement.dataset.fetchParity=VERSION;
    return r;
  }

  function install(){
    const btn=document.getElementById('applyBtn');
    if(!btn||typeof btn.onclick!=='function'||btn.dataset.freshOverlay198!=='1')return false;
    if(btn.dataset.fetchParity1160==='1')return true;
    const original=btn.onclick;btn.dataset.fetchParity1160='1';
    btn.onclick=async function(e){
      await original.call(this,e);
      try{
        const r=await reconcileApplied();if(!r)return;
        const d=document.getElementById('dirtyState');if(d){const base=String(d.textContent||'APPLIED ✓').replace(/\s*· FETCH PARITY.*$/,'').trim();d.textContent=`${base} · FETCH PARITY V1.16 ✓ · TEXT ${r.textCaptured}/${r.textMissed} · VIS ${r.visibilityFixed} · MEDIA ${r.imageRecovered}`}
      }catch(err){console.error('FETCH_PARITY_V1160',err);window.editorToast?.(err.message||String(err),'error','Fetch Parity gagal')}
    };
    return true;
  }

  let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>280)clearInterval(timer)},100);
})();
