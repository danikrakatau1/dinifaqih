(()=>{
  'use strict';
  if(window.__DINI_APPLY_TEXT_PARITY_1230__)return;
  window.__DINI_APPLY_TEXT_PARITY_1230__=true;

  const VERSION='1.23.0';
  const DB_NAME='dini-anif-editor-v150',DB_VERSION=2,GLOBAL_KEY='native-applied';
  const q=new URLSearchParams(location.search),recordId=q.get('record')||q.get('template')||'',scopedKey=recordId?`${GLOBAL_KEY}:${recordId}`:'';
  const norm=v=>String(v??'').replace(/\s+/g,' ').trim();
  const esc=v=>(window.CSS?.escape?CSS.escape(String(v||'')):String(v||'').replace(/["\\]/g,'\\$&'));
  const TEXT_SEL='h1,h2,h3,h4,h5,h6,p,span,a,label,button,strong,em,small,li,td,th,input,textarea,select';

  const openDB=()=>new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains('snapshots'))db.createObjectStore('snapshots')};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
  const read=async key=>{const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('snapshots');const r=tx.objectStore('snapshots').get(key);r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error)})};
  const write=async(key,val)=>{const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(val,key);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})};

  function textOf(n){return n?.matches?.('input,textarea,select')?String(n.value??''):String(n?.textContent??'')}
  function leafNodes(root){
    if(!root)return[];
    const all=[...root.querySelectorAll?.(TEXT_SEL)||[]].filter(n=>!n.matches?.('script,style,noscript,template'));
    const leaves=all.filter(n=>![...n.children||[]].some(c=>c.matches?.(TEXT_SEL)&&norm(textOf(c))));
    return leaves.length?leaves:all;
  }
  function clearId(doc,id){
    doc.querySelectorAll('[data-native-edit-id],[data-native-edit-ids]').forEach(n=>{
      if(n.getAttribute('data-native-edit-id')===id)n.removeAttribute('data-native-edit-id');
      const ids=(n.getAttribute('data-native-edit-ids')||'').split(/[\s,]+/).filter(Boolean).filter(x=>x!==id);
      if(ids.length)n.setAttribute('data-native-edit-ids',ids.join(','));else n.removeAttribute('data-native-edit-ids');
    });
  }
  function mark(n,id){
    if(!n||!id)return;
    const ids=(n.getAttribute('data-native-edit-ids')||'').split(/[\s,]+/).filter(Boolean);
    if(!ids.includes(id))ids.push(id);
    n.setAttribute('data-native-edit-ids',ids.join(','));
    n.setAttribute('data-native-edit-id',id);
    n.setAttribute('data-text-leaf-lock',VERSION);
  }
  function writeFromLive(outLeaf,liveLeaf){
    if(!outLeaf||!liveLeaf)return;
    if(outLeaf.matches?.('input,textarea,select')){
      const v=textOf(liveLeaf);outLeaf.value=v;outLeaf.setAttribute('value',v);
    }else{
      // Preserve source-native inline markup / <br> while freezing CURRENT editor text.
      outLeaf.innerHTML=liveLeaf.innerHTML;
    }
  }
  function sourceHost(doc,f){
    if(!doc||!f)return null;
    if(f.source_element_id){const n=doc.querySelector(`[data-id="${esc(f.source_element_id)}"]`);if(n)return n}
    if(f.id){
      const n=doc.querySelector(`[data-native-edit-id="${esc(f.id)}"],[data-native-edit-ids~="${esc(f.id)}"]`);
      if(n)return n.closest?.('[data-id]')||n;
    }
    if(f.node_id){const n=doc.querySelector(`[data-native-node-id="${esc(f.node_id)}"]`);if(n)return n.closest?.('[data-id]')||n}
    return null;
  }
  function markedLeaf(root,id){
    if(!root||!id)return null;
    try{return root.matches?.(`[data-native-edit-id="${esc(id)}"]`)?root:root.querySelector?.(`[data-native-edit-id="${esc(id)}"]`)}catch{return null}
  }
  function preferredLeaf(host,f,expected=''){
    if(!host)return null;
    const marked=markedLeaf(host,f?.id);if(marked)return marked;
    const headings=[...host.querySelectorAll?.('.elementor-heading-title')||[]];if(headings.length===1)return headings[0];
    const form=host.matches?.('input,textarea,select')?host:host.querySelector?.('input,textarea,select');if(form)return form;
    const list=leafNodes(host),want=norm(expected),original=norm(f?.source_text??f?.value??'');
    let hit=list.find(n=>want&&norm(textOf(n))===want);if(hit)return hit;
    hit=list.find(n=>original&&norm(textOf(n))===original);if(hit)return hit;
    return list.length===1?list[0]:null;
  }
  function findLiveLeaf(live,f,expected=''){
    const host=sourceHost(live,f);
    const anchored=preferredLeaf(host,f,expected);if(anchored)return anchored;
    const marked=markedLeaf(live,f?.id);if(marked)return marked;
    const want=norm(expected),original=norm(f?.source_text??f?.value??'');
    const list=leafNodes(live.body);
    let hit=list.find(n=>want&&norm(textOf(n))===want);if(hit)return hit;
    hit=list.find(n=>original&&norm(textOf(n))===original);if(hit)return hit;
    return null;
  }
  function safeTextWidget(host){return !!host&&!host.querySelector('img,picture,video,audio,canvas,iframe,object,embed')}

  function reconcile(live,snap){
    const out=new DOMParser().parseFromString(String(snap.html||snap.baseHtml||''),'text/html');
    snap.values=snap.values&&typeof snap.values==='object'?snap.values:{};
    let captured=0,anchored=0,leafPatched=0,missed=0;
    const details=[];

    for(const f of snap.schema?.fields||[]){
      if(f?.kind!=='text'||!f.id)continue;
      const expected=String(snap.values[f.id]??f.value??'');
      const liveLeaf=findLiveLeaf(live,f,expected);
      if(!liveLeaf){missed++;continue}

      const actual=textOf(liveLeaf);
      const liveHost=liveLeaf.closest?.('[data-id]')||sourceHost(live,f);
      const hostId=String(liveHost?.getAttribute?.('data-id')||f.source_element_id||'').trim();
      let outHost=hostId?out.querySelector(`[data-id="${esc(hostId)}"]`):sourceHost(out,f);
      let outLeaf=preferredLeaf(outHost,f,expected);

      // If the exact source widget exists, never guess globally: bind CURRENT text to that native widget.
      if(outHost&&liveHost&&safeTextWidget(outHost)&&safeTextWidget(liveHost)){
        const livePreferred=preferredLeaf(liveHost,f,actual)||liveLeaf;
        outLeaf=preferredLeaf(outHost,f,expected)||preferredLeaf(outHost,f,f?.value||'');
        if(!outLeaf&&outHost.matches?.(TEXT_SEL))outLeaf=outHost;
        if(outLeaf&&livePreferred){writeFromLive(outLeaf,livePreferred);anchored++}
      }

      if(!outLeaf){
        const candidates=leafNodes(out.body);
        outLeaf=candidates.find(n=>norm(textOf(n))===norm(expected))||candidates.find(n=>norm(textOf(n))===norm(f?.value??f?.source_text??''))||null;
      }
      if(!outLeaf){missed++;continue}

      clearId(out,f.id);
      mark(outLeaf,f.id);
      if(hostId)f.source_element_id=hostId;
      f.node_id='';
      f.text_leaf_locked=VERSION;
      snap.values[f.id]=actual;
      // Final write after ID cleanup guarantees the baked HTML contains CURRENT text.
      writeFromLive(outLeaf,liveLeaf);
      captured++;leafPatched++;
      details.push({id:f.id,source_element_id:hostId||'',value:actual.slice(0,120)});
    }

    snap.html='<!doctype html>\n'+out.documentElement.outerHTML;
    snap.baseHtml=snap.html;
    snap.text_parity={version:VERSION,captured_fields:captured,source_anchor_hits:anchored,leaf_patches:leafPatched,missed_fields:missed,captured_at:new Date().toISOString(),source:'editor-current-to-source-native-anchor',details:details.slice(0,120)};
    return {captured,anchored,leafPatched,missed};
  }

  async function reconcileApplied(){
    // Critical: original APPLY + Fresh Overlay writes the newest state to GLOBAL_KEY first.
    // Reading scoped first re-opened the old cloud snapshot and caused CURRENT text to disappear.
    const globalSnap=await read(GLOBAL_KEY);
    const scopedSnap=scopedKey?await read(scopedKey):null;
    const snap=globalSnap?.html?globalSnap:scopedSnap;
    if(!snap?.html||!snap?.schema)return null;
    const live=document.getElementById('previewFrame')?.contentDocument;
    if(!live?.documentElement)throw new Error('Live Editor DOM tidak tersedia.');
    const r=reconcile(live,snap);
    if(recordId){snap.template_id=recordId;snap.record_id=recordId;snap.snapshot_scope=recordId}
    await write(GLOBAL_KEY,snap);
    if(scopedKey)await write(scopedKey,snap);
    document.documentElement.dataset.textParity=VERSION;
    return r;
  }

  function install(){
    const btn=document.getElementById('applyBtn');
    if(!btn||typeof btn.onclick!=='function'||btn.dataset.freshOverlay198!=='1')return false;
    if(btn.dataset.textParity1230==='1')return true;
    const original=btn.onclick;
    btn.dataset.textParity1230='1';
    btn.onclick=async function(e){
      await original.call(this,e);
      try{
        const r=await reconcileApplied();
        if(r){
          const d=document.getElementById('dirtyState');
          if(d){
            const base=String(d.textContent||'APPLIED ✓').replace(/\s*· TEXT PARITY.*$/,'').trim();
            d.textContent=`${base} · TEXT PARITY V1.23 ✓ · ANCHOR ${r.anchored} · ${r.leafPatched}/${r.missed}`;
          }
        }
      }catch(err){
        console.error('APPLY_TEXT_PARITY_V1230',err);
        window.editorToast?.(err.message||String(err),'error','Text Parity V1.23 gagal');
      }
    };
    document.documentElement.dataset.textParityGuard=VERSION;
    return true;
  }

  let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>260)clearInterval(timer)},100);
})();
