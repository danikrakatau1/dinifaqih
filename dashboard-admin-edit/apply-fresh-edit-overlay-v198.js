(() => {
  'use strict';
  const VERSION='1.9.8';
  const DB_NAME='dini-anif-editor-v150', DB_VERSION=2, SNAP_KEY='native-applied';
  const openDB=()=>new Promise((res,rej)=>{const q=indexedDB.open(DB_NAME,DB_VERSION);q.onupgradeneeded=()=>{const db=q.result;if(!db.objectStoreNames.contains('assets'))db.createObjectStore('assets');if(!db.objectStoreNames.contains('snapshots'))db.createObjectStore('snapshots')};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
  const readApplied=async()=>{const db=await openDB();return await new Promise((res,rej)=>{const tx=db.transaction('snapshots');const q=tx.objectStore('snapshots').get(SNAP_KEY);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)})};
  const writeApplied=async snap=>{const db=await openDB();await new Promise((res,rej)=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(snap,SNAP_KEY);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error||new Error('IndexedDB transaction aborted'))})};
  const esc=v=>CSS.escape(String(v||''));
  const blobRx=/blob:[^"'\)\s<>]+/g;
  const blobList=v=>[...new Set(String(v||'').match(blobRx)||[])];
  const replaceMap=(v,map)=>{let s=String(v??'');for(const [from,to] of map)s=s.split(from).join(to);return s};

  function nodesForField(doc,f){
    const out=[],seen=new Set(),add=n=>{if(n&&!seen.has(n)){seen.add(n);out.push(n)}};
    if(!doc||!f)return out;
    doc.querySelectorAll('[data-native-edit-id],[data-native-edit-ids]').forEach(n=>{
      const one=n.getAttribute('data-native-edit-id')||'';
      const many=(n.getAttribute('data-native-edit-ids')||'').split(/[\s,]+/).filter(Boolean);
      if(one===f.id||many.includes(f.id))add(n);
    });
    if(f.node_id)add(doc.querySelector(`[data-native-node-id="${esc(f.node_id)}"]`));
    if(f.source_element_id){
      const host=doc.querySelector(`[data-id="${esc(f.source_element_id)}"]`);add(host);
      if(host&&f.media_role==='css-overlay')add(host.querySelector(':scope > .elementor-widget-wrap > .elementor-background-overlay,:scope > .elementor-element-populated > .elementor-background-overlay,:scope > .elementor-background-overlay')||host.querySelector('.elementor-background-overlay'));
    }
    return out;
  }
  function collectNodeBlobs(node){
    const out=new Set();if(!node)return out;
    for(const a of [...node.attributes||[]])for(const u of blobList(a.value))out.add(u);
    node.querySelectorAll?.('*').forEach(ch=>{for(const a of [...ch.attributes||[]])for(const u of blobList(a.value))out.add(u)});
    return out;
  }
  function buildBlobMap(liveDoc,snap){
    const fields=new Map((snap.schema?.fields||[]).map(f=>[f.id,f])),map=new Map();
    for(const a of snap.assets||[]){
      if(a?.role!=='field'||!a?.id||!a?.path)continue;
      const f=fields.get(a.id);if(!f)continue;
      const urls=new Set();
      for(const n of nodesForField(liveDoc,f))for(const u of collectNodeBlobs(n))urls.add(u);
      liveDoc.querySelectorAll('style').forEach(s=>{
        const owner=s.getAttribute('data-dini-css-override')||s.getAttribute('data-native-pseudo-field')||'';
        if(owner===String(f.source_key||'')||owner===String(f.id))for(const u of blobList(s.textContent))urls.add(u);
      });
      for(const u of urls)if(!map.has(u))map.set(u,a.path);
    }
    return map;
  }

  const MEDIA_ATTRS=['src','srcset','sizes','poster','data-src','data-lazy-src','data-original','data-bg','data-background','data-thumbnail','data-settings','data-native-gallery-image','data-native-slideshow-urls','data-native-true-replace'];
  const IMAGE_STYLE=['object-fit','object-position','transform','transform-origin','width','height','aspect-ratio'];
  const BG_STYLE=['background','background-image','background-position','background-size','background-repeat','background-attachment','background-blend-mode','--native-bg-position','--native-bg-size'];
  function copyAttr(live,out,name,map){if(live.hasAttribute(name))out.setAttribute(name,replaceMap(live.getAttribute(name),map));else if(out.hasAttribute(name)&&name.startsWith('data-native-'))out.removeAttribute(name)}
  function copyStyleProps(live,out,props,map){let n=0;for(const p of props){const v=live.style.getPropertyValue(p);if(v){out.style.setProperty(p,replaceMap(v,map),live.style.getPropertyPriority(p));n++}}return n}
  function syncNode(live,out,f,map){
    if(!live||!out||!f)return 0;let n=0;
    if(f.kind==='image'){
      for(const a of MEDIA_ATTRS){copyAttr(live,out,a,map);n++}
      n+=copyStyleProps(live,out,IMAGE_STYLE,map);
    }else if(f.kind==='background'){
      for(const a of MEDIA_ATTRS){if(a==='src'||a==='srcset'||a==='sizes'||a==='poster')continue;copyAttr(live,out,a,map);n++}
      n+=copyStyleProps(live,out,BG_STYLE,map);
      const ls=live.querySelector?.('[data-native-slide-bg]'),os=out.querySelector?.('[data-native-slide-bg]');if(ls&&os)n+=copyStyleProps(ls,os,BG_STYLE,map);
    }else if(f.kind==='video'||f.kind==='audio'){
      for(const a of ['src','poster','data-src']){copyAttr(live,out,a,map);n++}
    }else if(f.kind==='url'){
      for(const a of ['href','action','formaction','target'])if(live.hasAttribute(a)){out.setAttribute(a,live.getAttribute(a));n++}
    }
    return n;
  }
  function copyOwnedStyle(liveDoc,outDoc,attr,value,map){
    if(!value)return 0;const sel=`style[${attr}]`;
    const live=[...liveDoc.querySelectorAll(sel)].find(s=>s.getAttribute(attr)===String(value));if(!live)return 0;
    let out=[...outDoc.querySelectorAll(sel)].find(s=>s.getAttribute(attr)===String(value));if(!out){out=outDoc.createElement('style');out.setAttribute(attr,String(value));outDoc.head.appendChild(out)}
    out.textContent=replaceMap(live.textContent,map);return 1;
  }
  function appendLiveBlobStyles(liveDoc,outDoc,map){
    let count=0;outDoc.querySelectorAll('style[data-dini-parity-overlay="v198"]').forEach(s=>s.remove());
    for(const s of liveDoc.querySelectorAll('style')){
      const txt=String(s.textContent||'');if(!blobList(txt).some(u=>map.has(u)))continue;
      const clone=outDoc.createElement('style');clone.setAttribute('data-dini-parity-overlay','v198');clone.textContent=replaceMap(txt,map);outDoc.head.appendChild(clone);count++;
    }
    return count;
  }
  function sanitizeFresh(doc){
    if(!doc)return;
    doc.querySelectorAll('.native-selected-outline').forEach(n=>n.classList.remove('native-selected-outline'));
    doc.querySelectorAll('#dini-anif-editor-hit-css,[data-editor-only],[data-native-editor-only],style[data-dini-parity-overlay="v197"]').forEach(n=>n.remove());
    const bad=/content\s+is\s+protected|wccp|wp[-_ ]?content[-_ ]?copy[-_ ]?protection|disable[^\n]{0,24}right[^\n]{0,24}click|copy[_ -]?protection/i;
    doc.querySelectorAll('script').forEach(s=>{if(bad.test(`${s.src||''}\n${s.textContent||''}`))s.remove()});
    const phrase=/(?:error\s*:\s*)?content\s+is\s+protected\s*!{0,2}/ig;
    const walker=doc.createTreeWalker(doc.body||doc.documentElement,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    for(const n of nodes){const v=String(n.nodeValue||'');if(!/content\s+is\s+protected/i.test(v))continue;const x=v.replace(phrase,'').trim();if(x)n.nodeValue=x;else n.remove()}
  }
  function overlayEdits(liveDoc,snap){
    const outDoc=new DOMParser().parseFromString(String(snap.html||''),'text/html');
    const map=buildBlobMap(liveDoc,snap);let ops=0,fields=0,styles=0;
    for(const f of snap.schema?.fields||[]){
      if(!['image','background','video','audio','url'].includes(f.kind))continue;
      const liveNodes=nodesForField(liveDoc,f),outNodes=nodesForField(outDoc,f);if(!liveNodes.length||!outNodes.length)continue;
      const max=Math.min(liveNodes.length,outNodes.length);let local=0;for(let i=0;i<max;i++)local+=syncNode(liveNodes[i],outNodes[i],f,map);
      if(f.source_key)local+=copyOwnedStyle(liveDoc,outDoc,'data-dini-css-override',f.source_key,map);
      local+=copyOwnedStyle(liveDoc,outDoc,'data-native-pseudo-field',f.id,map);
      if(local){ops+=local;fields++}
    }
    styles+=appendLiveBlobStyles(liveDoc,outDoc,map);
    sanitizeFresh(outDoc);
    let html='<!doctype html>\n'+outDoc.documentElement.outerHTML;
    html=replaceMap(html,map);
    return {html,fields,ops,styles,blobMapped:map.size,remaining:blobList(html).length};
  }
  function install(){
    const root=document.documentElement,btn=document.getElementById('applyBtn'),dirty=document.getElementById('dirtyState');
    if(!btn||typeof btn.onclick!=='function')return false;
    if(btn.dataset.freshOverlay198==='1')return true;
    const original=btn.onclick;btn.dataset.freshOverlay198='1';
    btn.onclick=async function freshOverlayApply(event){
      await original.call(this,event);
      try{
        const snap=await readApplied();if(!snap?.html||!snap?.revision)throw new Error('Snapshot APPLY tidak ditemukan.');
        const liveDoc=document.getElementById('previewFrame')?.contentDocument;if(!liveDoc?.documentElement)throw new Error('Live Editor DOM tidak tersedia.');
        const r=overlayEdits(liveDoc,snap);snap.html=r.html;snap.parity_source='fresh-canonical+live-edit-overlay-v1.9.8';snap.fresh_edit_overlay={version:VERSION,synced_fields:r.fields,synced_operations:r.ops,overlay_styles:r.styles,blob_paths_rewritten:r.blobMapped,remaining_blob_urls:r.remaining,cover_state:'fresh-source',saved_at:new Date().toISOString()};await writeApplied(snap);
        root.dataset.editorRuntime='v1.9.8';if(dirty){const base=String(dirty.textContent||'APPLIED ✓').replace(/\s*· (?:PARITY|BG PARITY|EXACT DOM|FRESH OVERLAY).*$/,'').trim();dirty.textContent=`${base} · FRESH OVERLAY ✓ · FIELD ${r.fields} · STYLE ${r.styles} · BLOB ${r.blobMapped}/${r.remaining}`}
        try{localStorage.setItem('diniAnifNativeAppliedRef',JSON.stringify({store:'indexeddb',db:DB_NAME,key:SNAP_KEY,revision:snap.revision,applied_at:snap.applied_at,parity_source:snap.parity_source}))}catch{}
      }catch(err){console.error('APPLY_FRESH_EDIT_OVERLAY_V198',err);window.editorToast?.(err.message||String(err),'error','Fresh parity gagal')}
    };
    root.dataset.editorRuntime='v1.9.8';if(dirty&&/Loading Editor|EDITOR V1\.9\.5 READY/i.test(dirty.textContent||''))dirty.textContent='EDITOR V1.9.8 READY';return true;
  }
  let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>220)clearInterval(timer)},100);
})();
