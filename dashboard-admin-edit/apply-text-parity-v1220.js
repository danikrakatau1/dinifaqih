(()=>{
  'use strict';
  if(window.__DINI_APPLY_TEXT_PARITY_1240__)return;
  window.__DINI_APPLY_TEXT_PARITY_1240__=true;

  const VERSION='1.24.0';
  const KNOWN_ART_JAWA_COKLAT_3='https://web.galeriundanganofficial.com/art-jawa-coklat-3/';
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

  function mobileAnimationNone(host){
    if(!host)return false;
    if(String(host.getAttribute('data-native-animation-mobile')||'').toLowerCase()==='none')return true;
    try{return String(JSON.parse(host.getAttribute('data-settings')||'{}')?._animation_mobile||'').toLowerCase()==='none'}catch{return false}
  }
  function applyVisibilityParity(doc){
    let fixed=0;
    const leaves=[...doc.querySelectorAll('[data-native-edit-id],[data-native-edit-ids]')];
    const seen=new Set();
    for(const leaf of leaves){
      const host=leaf.closest?.('.elementor-invisible,[data-native-animation-mobile],[data-settings]');
      if(!host||seen.has(host)||!host.classList?.contains('elementor-invisible')||!mobileAnimationNone(host))continue;
      seen.add(host);
      host.classList.remove('elementor-invisible');
      if(host.style?.getPropertyValue('visibility')==='hidden')host.style.removeProperty('visibility');
      if(host.style?.getPropertyValue('opacity')==='0')host.style.removeProperty('opacity');
      host.setAttribute('data-dini-visibility-parity',VERSION);
      fixed++;
    }
    return fixed;
  }

  function isCloudRevisionUrl(raw){
    try{const u=new URL(String(raw||''),location.href);return /supabase\.co$/i.test(u.hostname)&&/\/storage\/v1\/object\/public\/template-packages\//i.test(u.pathname)}catch{return false}
  }
  function normalizeOrigin(raw){
    try{
      const u=new URL(String(raw||''),location.href);
      if(!/^https?:$/.test(u.protocol)||isCloudRevisionUrl(u.href)||u.origin===location.origin||/\/wp-content\//i.test(u.pathname))return '';
      const last=u.pathname.split('/').filter(Boolean).pop()||'';
      if(/\.[a-z0-9]{2,8}$/i.test(last))return '';
      u.search='';u.hash='';if(!u.pathname.endsWith('/'))u.pathname+='/';return u.href;
    }catch{return ''}
  }
  function originSourceForSnapshot(snap,doc){
    const m=snap?.manifest||{};
    for(const raw of [m.origin_source_url,m.original_source_url,m.fetch_source_url,m.upstream_source_url,m.source_page_url,m.source_url]){
      const u=normalizeOrigin(raw);if(u)return u;
    }
    try{
      const b=String(doc.querySelector('base[href]')?.getAttribute('href')||'').trim();
      const u=normalizeOrigin(b);if(u)return u;
    }catch{}
    if(doc.querySelector('[data-id="fd2b4a3"]')&&doc.querySelector('[data-id="5361f63"]'))return KNOWN_ART_JAWA_COKLAT_3;
    return '';
  }

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
      writeFromLive(outLeaf,liveLeaf);
      captured++;leafPatched++;
      details.push({id:f.id,source_element_id:hostId||'',value:actual.slice(0,120)});
    }

    const visibilityFixed=applyVisibilityParity(out);
    const originSource=originSourceForSnapshot(snap,out);
    if(originSource){
      snap.manifest={...(snap.manifest||{}),origin_source_url:originSource,origin_source_locked_at:new Date().toISOString(),origin_source_lock_version:VERSION};
      out.documentElement.setAttribute('data-origin-source-lock',VERSION);
    }
    out.documentElement.setAttribute('data-visibility-parity',VERSION);

    snap.html='<!doctype html>\n'+out.documentElement.outerHTML;
    snap.baseHtml=snap.html;
    snap.text_parity={version:VERSION,captured_fields:captured,source_anchor_hits:anchored,leaf_patches:leafPatched,missed_fields:missed,captured_at:new Date().toISOString(),source:'editor-current-to-source-native-anchor',details:details.slice(0,120)};
    snap.visibility_parity={version:VERSION,revealed_mobile_none_text_widgets:visibilityFixed,applied_at:new Date().toISOString()};
    snap.origin_source_persistence={version:VERSION,origin_source_url:originSource||'',persisted:!!originSource,applied_at:new Date().toISOString()};
    return {captured,anchored,leafPatched,missed,visibilityFixed,originSource};
  }

  async function reconcileApplied(){
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
    document.documentElement.dataset.visibilityParity=VERSION;
    if(r.originSource)document.documentElement.dataset.originSourceLock=VERSION;
    return r;
  }

  function install(){
    const btn=document.getElementById('applyBtn');
    if(!btn||typeof btn.onclick!=='function'||btn.dataset.freshOverlay198!=='1')return false;
    if(btn.dataset.textParity1240==='1')return true;
    const original=btn.onclick;
    btn.dataset.textParity1240='1';
    btn.onclick=async function(e){
      await original.call(this,e);
      try{
        const r=await reconcileApplied();
        if(r){
          const d=document.getElementById('dirtyState');
          if(d){
            const base=String(d.textContent||'APPLIED ✓').replace(/\s*· TEXT PARITY.*$/,'').trim();
            d.textContent=`${base} · TEXT PARITY V1.24 ✓ · ANCHOR ${r.anchored} · VIS ${r.visibilityFixed} · ORIGIN ${r.originSource?'✓':'—'} · ${r.leafPatched}/${r.missed}`;
          }
        }
      }catch(err){
        console.error('APPLY_TEXT_PARITY_V1240',err);
        window.editorToast?.(err.message||String(err),'error','Text/Visibility Parity V1.24 gagal');
      }
    };
    document.documentElement.dataset.textParityGuard=VERSION;
    return true;
  }

  let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>260)clearInterval(timer)},100);
})();
