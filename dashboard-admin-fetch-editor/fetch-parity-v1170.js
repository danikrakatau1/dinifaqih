(()=>{
  'use strict';
  if(window.__DINI_FETCH_PARITY_1170__)return;
  window.__DINI_FETCH_PARITY_1170__=true;

  const VERSION='1.17.0-fetch';
  const DB_NAME='dini-anif-editor-v150',DB_VERSION=2,SNAP_KEY='native-applied';
  const TEXT_SEL='h1,h2,h3,h4,h5,h6,p,span,a,label,button,strong,em,small,li,td,th,input,textarea,select';
  const blobRx=/blob:[^"'\)\s<>]+/g;
  const blobsIn=v=>[...new Set(String(v||'').match(blobRx)||[])];
  const esc=v=>(window.CSS?.escape?CSS.escape(String(v||'')):String(v||'').replace(/["\\]/g,'\\$&'));
  const norm=v=>String(v??'').replace(/\s+/g,' ').trim();
  const deep=v=>JSON.parse(JSON.stringify(v??null));

  const openDB=()=>new Promise((res,rej)=>{const q=indexedDB.open(DB_NAME,DB_VERSION);q.onupgradeneeded=()=>{const db=q.result;if(!db.objectStoreNames.contains('assets'))db.createObjectStore('assets');if(!db.objectStoreNames.contains('snapshots'))db.createObjectStore('snapshots')};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error||new Error('IndexedDB Fetch gagal dibuka'))});
  const readStore=(db,store,key)=>new Promise((res,rej)=>{const tx=db.transaction(store);const q=tx.objectStore(store).get(key);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)});
  const putStore=(db,store,key,value)=>new Promise((res,rej)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(value,key);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error||new Error('IndexedDB Fetch transaction aborted'))});
  const readApplied=async()=>readStore(await openDB(),'snapshots',SNAP_KEY);
  const writeApplied=async snap=>putStore(await openDB(),'snapshots',SNAP_KEY,snap);

  function nodesFor(doc,f){
    const out=[],seen=new Set(),add=n=>{if(n&&!seen.has(n)){seen.add(n);out.push(n)}};
    if(!doc||!f)return out;
    if(f.node_id)add(doc.querySelector(`[data-native-node-id="${esc(f.node_id)}"]`));
    if(f.id){
      const exact=doc.querySelector(`[data-native-edit-id="${esc(f.id)}"]`);if(exact)add(exact);
      for(const n of doc.querySelectorAll('[data-native-edit-ids]')){const ids=(n.getAttribute('data-native-edit-ids')||'').split(/[\s,]+/).filter(Boolean);if(ids.includes(f.id))add(n)}
    }
    if(!out.length&&f.source_element_id)add(doc.querySelector(`[data-id="${esc(f.source_element_id)}"]`));
    return out.filter(Boolean);
  }
  function textLeaf(root,f){
    if(!root)return null;
    if(root.matches?.(`[data-native-edit-id="${esc(f.id)}"]`)&&root.matches?.(TEXT_SEL))return root;
    const exact=root.querySelector?.(`[data-native-edit-id="${esc(f.id)}"]`);if(exact&&exact.matches?.(TEXT_SEL))return exact;
    if(root.matches?.(TEXT_SEL))return root;
    const heading=[...root.querySelectorAll?.('.elementor-heading-title')||[]];if(heading.length===1)return heading[0];
    const leaves=[...root.querySelectorAll?.(TEXT_SEL)||[]].filter(n=>![...n.children||[]].some(c=>c.matches?.(TEXT_SEL)&&norm(c.textContent)));
    return leaves.length===1?leaves[0]:(leaves[0]||null);
  }
  const textOf=n=>n?.matches?.('input,textarea,select')?String(n.value??''):String(n?.textContent??'');
  function sourceAssetPath(snap,url){
    const target=String(url||'').split('?')[0].split('#')[0];if(!target)return'';const file=target.split('/').pop()||'';
    for(const a of snap.assets||[]){const src=String(a?.source||'').split('?')[0].split('#')[0],path=String(a?.path||''),name=String(a?.name||'');if(src===target||(file&&(path.endsWith('/'+file)||name===file)))return path||''}
    return'';
  }
  function setImage(node,value){
    const img=node?.matches?.('img')?node:node?.querySelector?.('img');if(!img||!value)return false;
    img.setAttribute('src',value);img.setAttribute('data-src',value);img.removeAttribute('srcset');img.removeAttribute('data-srcset');img.removeAttribute('data-lazy-src');img.removeAttribute('data-original');return true;
  }

  function mapPeerBlobs(liveDoc,baseDoc,map){
    const addPair=(live,base)=>{
      if(!live||!base)return;
      for(const a of [...live.attributes||[]]){
        const lu=blobsIn(a.value);if(!lu.length)continue;const bv=String(base.getAttribute?.(a.name)||'');const refs=[...new Set((bv.match(/assets\/(?:generated|source)\/[A-Za-z0-9_./%+~@()\-]+/g)||[]))];
        if(refs.length===lu.length)lu.forEach((u,i)=>{if(!map.has(u))map.set(u,refs[i])});
        else if(refs.length===1)lu.forEach(u=>{if(!map.has(u))map.set(u,refs[0])});
      }
      if(live.tagName==='STYLE'){
        const lu=blobsIn(live.textContent),bv=String(base.textContent||''),refs=[...new Set((bv.match(/assets\/(?:generated|source)\/[A-Za-z0-9_./%+~@()\-]+/g)||[]))];
        if(lu.length&&refs.length===lu.length)lu.forEach((u,i)=>{if(!map.has(u))map.set(u,refs[i])});
      }
    };
    for(const live of liveDoc.querySelectorAll('[data-native-node-id]')){const id=live.getAttribute('data-native-node-id');addPair(live,baseDoc.querySelector(`[data-native-node-id="${esc(id)}"]`))}
    for(const live of liveDoc.querySelectorAll('[data-id]')){const id=live.getAttribute('data-id');addPair(live,baseDoc.querySelector(`[data-id="${esc(id)}"]`))}
    for(const live of liveDoc.querySelectorAll('[id]')){const id=live.id;if(id)addPair(live,baseDoc.getElementById(id))}
    const liveStyles=[...liveDoc.querySelectorAll('style')],baseStyles=[...baseDoc.querySelectorAll('style')];for(let i=0;i<Math.min(liveStyles.length,baseStyles.length);i++)addPair(liveStyles[i],baseStyles[i]);
  }
  function mapFieldBlobs(liveDoc,snap,map){
    const fields=new Map((snap.schema?.fields||[]).map(f=>[f.id,f]));
    for(const a of snap.assets||[]){if(a?.role!=='field'||!a?.id||!a?.path)continue;const f=fields.get(a.id);if(!f)continue;for(const n of nodesFor(liveDoc,f)){const scan=[n,...n.querySelectorAll?.('*')||[]];for(const x of scan){for(const at of [...x.attributes||[]])for(const u of blobsIn(at.value))if(!map.has(u))map.set(u,a.path)}}}
  }
  function sanitizeLiveClone(doc,baseDoc){
    doc.querySelectorAll('.native-selected-outline').forEach(n=>n.classList.remove('native-selected-outline'));
    doc.querySelectorAll('#dini-anif-editor-hit-css,[data-editor-only],[data-native-editor-only]').forEach(n=>n.remove());
    doc.documentElement.classList.remove('native-opened');doc.body?.classList.remove('native-opened','native-cover-opening');
    if(baseDoc?.documentElement)doc.documentElement.className=baseDoc.documentElement.className;
    if(baseDoc?.body&&doc.body){doc.body.className=baseDoc.body.className;doc.body.setAttribute('style',baseDoc.body.getAttribute('style')||'')}
    const runtimeProps=['display','visibility','opacity','top','left','right','bottom','pointer-events','overflow','overflow-y','height','touch-action'];
    const syncRuntime=(live,base)=>{if(!live||!base)return;for(const p of runtimeProps){const v=base.style?.getPropertyValue(p)||'',pri=base.style?.getPropertyPriority(p)||'';if(v)live.style.setProperty(p,v,pri);else live.style.removeProperty(p)}if(base.hasAttribute('hidden'))live.setAttribute('hidden','');else live.removeAttribute('hidden');if(base.hasAttribute('aria-hidden'))live.setAttribute('aria-hidden',base.getAttribute('aria-hidden'));else live.removeAttribute('aria-hidden')};
    for(const el of doc.querySelectorAll('#cover,.elementor-top-section,[data-native-reveal]')){
      let base=null;const nid=el.getAttribute('data-native-node-id'),did=el.getAttribute('data-id');if(nid)base=baseDoc.querySelector(`[data-native-node-id="${esc(nid)}"]`);if(!base&&did)base=baseDoc.querySelector(`[data-id="${esc(did)}"]`);if(!base&&el.id)base=baseDoc.getElementById(el.id);if(base)syncRuntime(el,base);
      el.classList.remove('native-visible','native-cover-opening');const anim=el.getAttribute('data-native-reveal');if(anim)el.classList.remove(anim,'animated');
    }
  }
  const replaceMap=(text,map)=>{let out=String(text||'');for(const [from,to] of map)out=out.split(from).join(to);return out};
  const mimeExt=t=>({"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif","image/svg+xml":"svg","video/mp4":"mp4","audio/mpeg":"mp3","audio/ogg":"ogg","font/woff":"woff","font/woff2":"woff2","text/css":"css"}[String(t||'').split(';')[0]]||'bin');
  const toDataUrl=blob=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result||''));r.onerror=()=>rej(r.error);r.readAsDataURL(blob)});
  async function persistLooseBlob(db,snap,url,index){
    const r=await fetch(url);if(!r.ok)throw new Error('Blob Fetch HTTP '+r.status);let blob=await r.blob();let type=blob.type||'application/octet-stream';
    if(/text\/css/i.test(type)){
      let css=await blob.text();for(const nested of blobsIn(css)){try{const nr=await fetch(nested);if(nr.ok)css=css.split(nested).join(await toDataUrl(await nr.blob()))}catch{}}
      blob=new Blob([css],{type:'text/css'});type='text/css';
    }
    const ext=mimeExt(type),path=`assets/generated/fetch-live-${String(index).padStart(3,'0')}.${ext}`,key=`${snap.revision}:fetch-live:${index}`;
    await putStore(db,'assets',key,blob);snap.assets=snap.assets||[];snap.assets.push({id:null,key,path,name:path.split('/').pop(),type,source:'fetch-live-blob',role:'project'});return path;
  }

  async function captureExact(liveDoc,snap){
    const db=await openDB(),baseDoc=new DOMParser().parseFromString(String(snap.html||snap.baseHtml||''),'text/html');
    snap.values=snap.values&&typeof snap.values==='object'?snap.values:{};snap.assets=Array.isArray(snap.assets)?snap.assets:[];
    const map=new Map(),textDetails=[];let textCaptured=0,textMissed=0,imageRecovered=0,nestedPersisted=0;

    const nested=window.__DINI_FETCH_NESTED_ASSETS__ instanceof Map?window.__DINI_FETCH_NESTED_ASSETS__:new Map();
    for(const [id,a] of nested){if(!a?.blob||!a?.path)continue;const key=`${snap.revision}:fetch-nested:${id}`;await putStore(db,'assets',key,a.blob);snap.assets=snap.assets.filter(x=>!(x?.role==='field'&&x?.id===id));snap.assets.push({id,key,path:a.path,name:a.name,type:a.type,source:'fetch-nested-upload',role:'field'});snap.values[id]=a.path;map.set(a.url,a.path);nestedPersisted++}

    for(const f of snap.schema?.fields||[]){
      if(f?.kind!=='image'||!f.id)continue;const current=String(snap.values[f.id]??'').trim(),fallback=String(f.value??'').trim();if(current||!/^https?:\/\//i.test(fallback))continue;
      const nodes=nodesFor(liveDoc,f),img=nodes.map(n=>n.matches?.('img')?n:n.querySelector?.('img')).find(Boolean);if(!img?.closest?.('.weddingpress-timeline-thumbnail,.weddingpress-timeline-item'))continue;
      const liveValue=String(img.getAttribute('src')||img.getAttribute('data-src')||'').trim();if(liveValue&&!/^blob:/.test(liveValue))continue;
      const local=sourceAssetPath(snap,fallback)||fallback;snap.values[f.id]=local;setImage(img,local);imageRecovered++;
    }

    for(const f of snap.schema?.fields||[]){if(f?.kind!=='text'||!f.id)continue;const root=nodesFor(liveDoc,f)[0],leaf=textLeaf(root,f);if(!leaf){textMissed++;continue}const actual=textOf(leaf);snap.values[f.id]=actual;textDetails.push({id:f.id,value:actual,source_element_id:f.source_element_id||'',node_id:f.node_id||''});textCaptured++}

    mapFieldBlobs(liveDoc,snap,map);mapPeerBlobs(liveDoc,baseDoc,map);
    const cloneDoc=new DOMParser().parseFromString('<!doctype html>\n'+liveDoc.documentElement.outerHTML,'text/html');sanitizeLiveClone(cloneDoc,baseDoc);
    let html='<!doctype html>\n'+cloneDoc.documentElement.outerHTML;html=replaceMap(html,map);

    let remaining=blobsIn(html),seq=0;for(const u of remaining){if(map.has(u))continue;try{const path=await persistLooseBlob(db,snap,u,++seq);map.set(u,path)}catch(err){console.warn('FETCH_LIVE_BLOB_PERSIST',u,err)}}
    html=replaceMap(html,map);remaining=blobsIn(html);
    if(remaining.length)throw new Error(`Fetch exact snapshot masih memiliki ${remaining.length} blob URL yang belum persisten.`);

    const outDoc=new DOMParser().parseFromString(html,'text/html');for(const [id,a] of nested){const f=(snap.schema?.fields||[]).find(x=>x.id===id);for(const n of nodesFor(outDoc,f||{id})){setImage(n,a.path)}}
    html='<!doctype html>\n'+outDoc.documentElement.outerHTML;

    const m=snap.manifest=snap.manifest&&typeof snap.manifest==='object'?snap.manifest:{};
    const handoff=(new URLSearchParams(location.search).get('handoff')||'').trim();
    if(handoff){snap.fetch_handoff_id=handoff;m.fetch_handoff_id=handoff}
    const origin=[m.origin_source_url,m.original_source_url,m.fetch_source_url,m.source_page_url,m.upstream_source_url,m.source_url].map(x=>String(x||'').trim()).find(x=>{try{const u=new URL(x,location.href);return /^https?:$/.test(u.protocol)&&u.origin!==location.origin&&!/supabase\.co$/i.test(u.hostname)}catch{return false}});
    if(origin&&!m.origin_source_url)m.origin_source_url=origin;
    m.fetch_editor_version='1.17.0';m.fetch_snapshot_mode='source-native-exact-live-dom';

    snap.html=html;snap.baseHtml=html;snap.parity_source='fetch-live-dom-exact-v1.17.0';snap.cover_state='fresh-unopened';
    snap.text_parity={version:VERSION,captured_fields:textCaptured,missed_fields:textMissed,details:textDetails.slice(0,240),source:'fetch-live-dom-exact',captured_at:new Date().toISOString()};
    snap.fetch_media_recovery={version:VERSION,recovered_images:imageRecovered,nested_uploads:nestedPersisted,policy:'source-nested-only+exact-owner',applied_at:new Date().toISOString()};
    snap.fetch_visual_parity={version:VERSION,mode:'full-live-dom',blob_paths_rewritten:map.size,remaining_blob_urls:0,source_css_preserved:true,template_editor_shared_state:false,applied_at:new Date().toISOString()};
    return {textCaptured,textMissed,imageRecovered,nestedPersisted,blobMapped:map.size};
  }

  async function reconcileApplied(){const snap=await readApplied();if(!snap?.html||!snap?.schema)return null;const live=document.getElementById('previewFrame')?.contentDocument;if(!live?.documentElement)throw new Error('Fetch Live Preview DOM tidak tersedia.');const r=await captureExact(live,snap);await writeApplied(snap);try{localStorage.setItem('diniAnifNativeAppliedRef',JSON.stringify({store:'indexeddb',db:window.__DINI_FETCH_EDITOR_DB__||'dini-anif-fetch-editor-v1150',key:SNAP_KEY,revision:snap.revision||null,applied_at:snap.applied_at||null,fetch_parity:VERSION}))}catch{};document.documentElement.dataset.fetchParity=VERSION;delete document.documentElement.dataset.fetchNestedDirty;return r}

  function install(){
    const btn=document.getElementById('applyBtn');if(!btn||typeof btn.onclick!=='function'||btn.dataset.freshOverlay198!=='1')return false;if(btn.dataset.fetchParity1170==='1')return true;
    const original=btn.onclick;btn.dataset.fetchParity1170='1';btn.onclick=async function(e){await original.call(this,e);try{const r=await reconcileApplied();if(!r)return;const d=document.getElementById('dirtyState');if(d){const base=String(d.textContent||'APPLIED ✓').replace(/\s*· FETCH PARITY.*$/,'').trim();d.textContent=`${base} · FETCH PARITY V1.17 ✓ · TEXT ${r.textCaptured}/${r.textMissed} · NESTED ${r.nestedPersisted} · RECOVER ${r.imageRecovered} · BLOB ${r.blobMapped}`}}catch(err){console.error('FETCH_PARITY_V1170',err);const d=document.getElementById('dirtyState');if(d)d.textContent='FETCH PARITY V1.17 ERROR: '+(err.message||err);window.editorToast?.(err.message||String(err),'error','Fetch Parity V1.17 gagal')}};return true;
  }
  let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>300)clearInterval(timer)},100);
})();
