(() => {
  'use strict';
  const VERSION='1.9.7';
  const DB_NAME='dini-anif-editor-v150', DB_VERSION=2, SNAP_KEY='native-applied';
  const openDB=()=>new Promise((res,rej)=>{const q=indexedDB.open(DB_NAME,DB_VERSION);q.onupgradeneeded=()=>{const db=q.result;if(!db.objectStoreNames.contains('assets'))db.createObjectStore('assets');if(!db.objectStoreNames.contains('snapshots'))db.createObjectStore('snapshots')};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
  const readApplied=async()=>{const db=await openDB();return await new Promise((res,rej)=>{const tx=db.transaction('snapshots');const q=tx.objectStore('snapshots').get(SNAP_KEY);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)})};
  const writeApplied=async snap=>{const db=await openDB();await new Promise((res,rej)=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(snap,SNAP_KEY);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error||new Error('IndexedDB transaction aborted'))})};
  const esc=v=>CSS.escape(String(v||''));
  const blobRx=/blob:[^"'\)\s<>]+/g;
  const blobList=v=>[...new Set(String(v||'').match(blobRx)||[])];
  function nodesForField(doc,f){
    const out=[],seen=new Set(),add=n=>{if(n&&!seen.has(n)){seen.add(n);out.push(n)}};
    if(!doc||!f)return out;
    if(f.node_id)add(doc.querySelector(`[data-native-node-id="${esc(f.node_id)}"]`));
    doc.querySelectorAll('[data-native-edit-id],[data-native-edit-ids]').forEach(n=>{
      const one=n.getAttribute('data-native-edit-id')||'';
      const many=(n.getAttribute('data-native-edit-ids')||'').split(/[\s,]+/).filter(Boolean);
      if(one===f.id||many.includes(f.id))add(n);
    });
    if(f.source_element_id){
      const host=doc.querySelector(`[data-id="${esc(f.source_element_id)}"]`);add(host);
      if(host&&f.media_role==='css-overlay')add(host.querySelector(':scope > .elementor-widget-wrap > .elementor-background-overlay,:scope > .elementor-element-populated > .elementor-background-overlay,:scope > .elementor-background-overlay')||host.querySelector('.elementor-background-overlay'));
    }
    return out;
  }
  function collectNodeBlobs(node){
    const out=new Set();if(!node)return out;
    for(const a of [...node.attributes||[]])for(const u of blobList(a.value))out.add(u);
    const slide=node.querySelector?.('[data-native-slide-bg]');if(slide)for(const a of [...slide.attributes||[]])for(const u of blobList(a.value))out.add(u);
    return out;
  }
  function buildBlobMap(liveDoc,snap){
    const fields=new Map((snap.schema?.fields||[]).map(f=>[f.id,f])), map=new Map();
    for(const a of snap.assets||[]){
      if(a?.role!=='field'||!a?.id||!a?.path)continue;
      const f=fields.get(a.id);if(!f)continue;
      const urls=new Set();
      for(const n of nodesForField(liveDoc,f))for(const u of collectNodeBlobs(n))urls.add(u);
      if(f.source_key){
        liveDoc.querySelectorAll('style[data-dini-css-override]').forEach(s=>{if(s.getAttribute('data-dini-css-override')===String(f.source_key))for(const u of blobList(s.textContent))urls.add(u)});
      }
      liveDoc.querySelectorAll('style[data-native-pseudo-field]').forEach(s=>{if(s.getAttribute('data-native-pseudo-field')===String(f.id))for(const u of blobList(s.textContent))urls.add(u)});
      for(const u of urls)if(!map.has(u))map.set(u,a.path);
    }
    return map;
  }
  function copyTransientStateFromCanonical(outDoc,canonicalDoc){
    if(!outDoc||!canonicalDoc)return;
    const outHtml=outDoc.documentElement,canHtml=canonicalDoc.documentElement,outBody=outDoc.body,canBody=canonicalDoc.body;
    if(outHtml&&canHtml)outHtml.classList.toggle('native-opened',canHtml.classList.contains('native-opened'));
    for(const cls of ['stop-scrolling','locked-section'])if(outBody&&canBody)outBody.classList.toggle(cls,canBody.classList.contains(cls));
    const stateProps=['display','visibility','opacity','pointer-events'];
    const copyState=(a,b)=>{if(!a||!b)return;for(const p of stateProps){const v=b.style.getPropertyValue(p);if(v)a.style.setProperty(p,v,b.style.getPropertyPriority(p));else a.style.removeProperty(p)}if(b.hasAttribute('hidden'))a.setAttribute('hidden','');else a.removeAttribute('hidden');if(b.hasAttribute('aria-hidden'))a.setAttribute('aria-hidden',b.getAttribute('aria-hidden'));else a.removeAttribute('aria-hidden')};
    copyState(outDoc.querySelector('#cover,.cover'),canonicalDoc.querySelector('#cover,.cover'));
    const buttonSel='#openInvitation,#tombolbuka,.tombolbuka,[data-open-invitation],[data-action="open-invitation"]';
    copyState(outDoc.querySelector(buttonSel),canonicalDoc.querySelector(buttonSel));
  }
  function sanitizeExact(outDoc){
    if(!outDoc)return;
    outDoc.querySelectorAll('.native-selected-outline').forEach(n=>n.classList.remove('native-selected-outline'));
    outDoc.querySelectorAll('#dini-anif-editor-hit-css,[data-editor-only],[data-native-editor-only]').forEach(n=>n.remove());
    const bad=/content\s+is\s+protected|wccp|wp[-_ ]?content[-_ ]?copy[-_ ]?protection|disable[^\n]{0,24}right[^\n]{0,24}click|copy[_ -]?protection/i;
    outDoc.querySelectorAll('script').forEach(s=>{if(bad.test(`${s.src||''}\n${s.textContent||''}`))s.remove()});
    const phrase=/(?:error\s*:\s*)?content\s+is\s+protected\s*!{0,2}/ig;
    const walker=outDoc.createTreeWalker(outDoc.body||outDoc.documentElement,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    for(const n of nodes){const v=String(n.nodeValue||'');if(!/content\s+is\s+protected/i.test(v))continue;const x=v.replace(phrase,'').trim();if(x)n.nodeValue=x;else n.remove()}
  }
  function exactHtml(liveDoc,canonicalHtml,snap){
    const outDoc=new DOMParser().parseFromString('<!doctype html>\n'+liveDoc.documentElement.outerHTML,'text/html');
    const canonicalDoc=new DOMParser().parseFromString(String(canonicalHtml||''),'text/html');
    copyTransientStateFromCanonical(outDoc,canonicalDoc);
    sanitizeExact(outDoc);
    const map=buildBlobMap(liveDoc,snap);
    let html='<!doctype html>\n'+outDoc.documentElement.outerHTML;
    for(const [blob,path] of map)html=html.split(blob).join(path);
    const remaining=blobList(html);
    return {html,mapCount:map.size,remaining:remaining.length};
  }
  function install(){
    const root=document.documentElement,btn=document.getElementById('applyBtn'),dirty=document.getElementById('dirtyState');
    if(!btn||typeof btn.onclick!=='function')return false;
    if(root.dataset.editorRuntime!=='v1.9.6'||btn.dataset.bgParity196!=='1')return false;
    if(btn.dataset.exactParity197==='1')return true;
    const original=btn.onclick;btn.dataset.exactParity197='1';
    btn.onclick=async function exactDomApply(event){
      await original.call(this,event);
      try{
        const snap=await readApplied();if(!snap?.html||!snap?.revision)throw new Error('Snapshot APPLY tidak ditemukan.');
        const liveDoc=document.getElementById('previewFrame')?.contentDocument;if(!liveDoc?.documentElement)throw new Error('Live Editor DOM tidak tersedia.');
        const canonicalHtml=snap.html;
        const exact=exactHtml(liveDoc,canonicalHtml,snap);
        snap.html=exact.html;
        snap.parity_source='exact-live-editor-dom-v1.9.7';
        snap.exact_dom_parity={version:VERSION,blob_paths_rewritten:exact.mapCount,remaining_blob_urls:exact.remaining,saved_at:new Date().toISOString()};
        await writeApplied(snap);
        root.dataset.editorRuntime='v1.9.7';
        if(dirty){const base=String(dirty.textContent||'APPLIED ✓').replace(/\s*· EXACT DOM.*$/,'').trim();dirty.textContent=`${base} · EXACT DOM ✓ · BLOB ${exact.mapCount}/${exact.remaining}`}
        try{localStorage.setItem('diniAnifNativeAppliedRef',JSON.stringify({store:'indexeddb',db:DB_NAME,key:SNAP_KEY,revision:snap.revision,applied_at:snap.applied_at,parity_source:snap.parity_source}))}catch{}
      }catch(err){console.error('APPLY_EXACT_DOM_PARITY_V197',err);window.editorToast?.(err.message||String(err),'error','Exact DOM parity gagal')}
    };
    root.dataset.editorRuntime='v1.9.7';
    if(dirty&&/EDITOR V1\.9\.6 READY|Loading Editor/i.test(dirty.textContent||''))dirty.textContent='EDITOR V1.9.7 READY';
    return true;
  }
  let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>200)clearInterval(timer)},100);
})();
