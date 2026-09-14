(()=>{
  'use strict';
  if(window.__DINI_APPLY_TEXT_PARITY_1220__)return;
  window.__DINI_APPLY_TEXT_PARITY_1220__=true;

  const VERSION='1.22.0';
  const DB_NAME='dini-anif-editor-v150',DB_VERSION=2,GLOBAL_KEY='native-applied';
  const q=new URLSearchParams(location.search),recordId=q.get('record')||q.get('template')||'',scopedKey=recordId?`${GLOBAL_KEY}:${recordId}`:'';
  const norm=v=>String(v??'').replace(/\s+/g,' ').trim();
  const esc=v=>(window.CSS?.escape?CSS.escape(String(v||'')):String(v||'').replace(/["\\]/g,'\\$&'));
  const leafSel='h1,h2,h3,h4,h5,h6,p,span,a,label,button,strong,em,small,li,td,th,div';

  const openDB=()=>new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains('snapshots'))db.createObjectStore('snapshots')};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
  const read=async key=>{const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('snapshots');const r=tx.objectStore('snapshots').get(key);r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error)})};
  const write=async(key,val)=>{const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(val,key);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})};

  function leafNodes(root){if(!root)return[];const all=[root,...root.querySelectorAll?.(leafSel)||[]].filter(n=>!n.matches?.('script,style,noscript,template'));const leaves=all.filter(n=>!n.querySelector?.(leafSel));return leaves.length?leaves:all}
  function textOf(n){return n?.matches?.('input,textarea,select')?String(n.value??''):String(n?.textContent??'')}
  function clearId(doc,id){doc.querySelectorAll('[data-native-edit-id],[data-native-edit-ids]').forEach(n=>{if(n.getAttribute('data-native-edit-id')===id)n.removeAttribute('data-native-edit-id');const ids=(n.getAttribute('data-native-edit-ids')||'').split(/[\s,]+/).filter(Boolean).filter(x=>x!==id);if(ids.length)n.setAttribute('data-native-edit-ids',ids.join(','));else n.removeAttribute('data-native-edit-ids')})}
  function mark(n,id){if(!n||!id)return;const ids=(n.getAttribute('data-native-edit-ids')||'').split(/[\s,]+/).filter(Boolean);if(!ids.includes(id))ids.push(id);n.setAttribute('data-native-edit-ids',ids.join(','));n.setAttribute('data-native-edit-id',id);n.setAttribute('data-text-leaf-lock',VERSION)}
  function writeText(n,v){if(!n)return;if(n.matches?.('input,textarea,select')){n.value=v;n.setAttribute('value',v)}else n.textContent=v}
  function sourceHost(doc,f){if(!doc||!f)return null;if(f.source_element_id){const n=doc.querySelector(`[data-id="${esc(f.source_element_id)}"]`);if(n)return n}if(f.id){const n=doc.querySelector(`[data-native-edit-id="${esc(f.id)}"]`);if(n)return n.closest?.('[data-id]')||n}if(f.node_id){const n=doc.querySelector(`[data-native-node-id="${esc(f.node_id)}"]`);if(n)return n.closest?.('[data-id]')||n}return null}
  function findLiveLeaf(doc,f,value){const want=norm(value),old=norm(f?.value??f?.source_text??'');const roots=[];const h=sourceHost(doc,f);if(h)roots.push(h);roots.push(doc.body);for(const root of roots){const list=leafNodes(root);let hit=list.find(n=>want&&norm(textOf(n))===want);if(hit)return hit;hit=list.find(n=>old&&norm(textOf(n))===old);if(hit)return hit}return null}
  function relativePath(anchor,node){const p=[];let cur=node;while(cur&&cur!==anchor){const par=cur.parentElement;if(!par)return null;p.unshift([...par.children].indexOf(cur));cur=par}return cur===anchor?p:null}
  function follow(anchor,p){let cur=anchor;for(const i of p||[]){cur=cur?.children?.[i];if(!cur)return null}return cur}
  function safeTextWidget(host){return !!host&&!host.querySelector('img,picture,video,audio,canvas,iframe,object,embed')}
  function stripTransient(root){if(!root)return;root.querySelectorAll?.('[data-template-authority],[data-dini-guest-injected],[data-dini-guest-runtime-heading]').forEach(n=>{n.removeAttribute('data-template-authority');n.removeAttribute('data-dini-guest-injected');n.removeAttribute('data-dini-guest-runtime-heading')})}

  function reconcile(live,snap){
    const out=new DOMParser().parseFromString(String(snap.html||snap.baseHtml||''),'text/html');
    snap.values=snap.values&&typeof snap.values==='object'?snap.values:{};
    let captured=0,widgetCopied=0,leafPatched=0,missed=0;
    for(const f of snap.schema?.fields||[]){
      if(f?.kind!=='text'||!f.id)continue;
      const value=String(snap.values[f.id]??f.value??'');
      const liveLeaf=findLiveLeaf(live,f,value);if(!liveLeaf){missed++;continue}
      const actual=textOf(liveLeaf);snap.values[f.id]=actual;captured++;
      const liveHost=liveLeaf.closest?.('[data-id]')||null;
      const hostId=liveHost?.getAttribute?.('data-id')||f.source_element_id||'';
      let outLeaf=null;
      if(liveHost&&hostId){
        const outHost=out.querySelector(`[data-id="${esc(hostId)}"]`);
        if(outHost&&safeTextWidget(liveHost)&&safeTextWidget(outHost)){
          outHost.innerHTML=liveHost.innerHTML;
          stripTransient(outHost);
          outLeaf=findLiveLeaf(out,{...f,source_element_id:hostId},actual);
          widgetCopied++;
        }else if(outHost){
          const rp=relativePath(liveHost,liveLeaf),candidate=rp?follow(outHost,rp):null;
          if(candidate&&!candidate.matches?.('img,picture,video,audio,canvas,iframe,object,embed'))outLeaf=candidate;
        }
      }
      if(!outLeaf)outLeaf=findLiveLeaf(out,f,actual);
      if(!outLeaf){
        const oldHost=sourceHost(out,f);
        if(oldHost&&safeTextWidget(oldHost)){
          const clone=liveLeaf.cloneNode(true);oldHost.innerHTML='';oldHost.appendChild(clone);outLeaf=clone;widgetCopied++;
        }
      }
      if(!outLeaf){missed++;continue}
      clearId(out,f.id);mark(outLeaf,f.id);writeText(outLeaf,actual);f.node_id='';if(hostId)f.source_element_id=hostId;f.text_leaf_locked=VERSION;leafPatched++;
    }
    snap.html='<!doctype html>\n'+out.documentElement.outerHTML;snap.baseHtml=snap.html;
    snap.text_parity={version:VERSION,captured_fields:captured,widget_copies:widgetCopied,leaf_patches:leafPatched,missed_fields:missed,captured_at:new Date().toISOString(),source:'editor-live-widget-authority'};
    return {captured,widgetCopied,leafPatched,missed};
  }

  async function reconcileApplied(){const snap=await read(scopedKey||GLOBAL_KEY)||await read(GLOBAL_KEY);if(!snap?.html||!snap?.schema)return null;const live=document.getElementById('previewFrame')?.contentDocument;if(!live?.documentElement)throw new Error('Live Editor DOM tidak tersedia.');const r=reconcile(live,snap);if(recordId){snap.template_id=recordId;snap.record_id=recordId;snap.snapshot_scope=recordId}await write(GLOBAL_KEY,snap);if(scopedKey)await write(scopedKey,snap);document.documentElement.dataset.textParity=VERSION;return r}

  function install(){const btn=document.getElementById('applyBtn');if(!btn||typeof btn.onclick!=='function'||btn.dataset.freshOverlay198!=='1')return false;if(btn.dataset.textParity1220==='1')return true;const original=btn.onclick;btn.dataset.textParity1220='1';btn.onclick=async function(e){await original.call(this,e);try{const r=await reconcileApplied();if(r){const d=document.getElementById('dirtyState');if(d){const base=String(d.textContent||'APPLIED ✓').replace(/\s*· TEXT PARITY.*$/,'').trim();d.textContent=`${base} · TEXT PARITY V1.22 ✓ · ${r.leafPatched}/${r.missed}`}}}catch(err){console.error('APPLY_TEXT_PARITY_V1220',err);window.editorToast?.(err.message||String(err),'error','Text Parity V1.22 gagal')}};document.documentElement.dataset.textParityGuard=VERSION;return true}
  let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>260)clearInterval(timer)},100);
})();
