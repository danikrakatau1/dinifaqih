(() => {
  'use strict';
  const VERSION='1.11.0';
  const DB_NAME='dini-anif-editor-v150',DB_VERSION=2,SNAP_KEY='native-applied';
  const frame=document.getElementById('cleanFrame');
  const zip=window.UNDANGAN_ZIP;
  if(!frame||!zip?.buildZip||zip.__diniIntegrity1110)return;
  zip.__diniIntegrity1110=true;

  const originalBuildZip=zip.buildZip.bind(zip);
  const openDB=()=>new Promise((res,rej)=>{const q=indexedDB.open(DB_NAME,DB_VERSION);q.onupgradeneeded=()=>{const db=q.result;if(!db.objectStoreNames.contains('assets'))db.createObjectStore('assets');if(!db.objectStoreNames.contains('snapshots'))db.createObjectStore('snapshots')};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
  const read=(db,store,key)=>new Promise((res,rej)=>{const tx=db.transaction(store);const q=tx.objectStore(store).get(key);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)});
  const esc=v=>(window.CSS?.escape?CSS.escape(String(v||'')):String(v||'').replace(/["\\]/g,'\\$&'));
  const normName=n=>String(n||'').replace(/^\/+/, '').replace(/\\/g,'/').replace(/\/+/g,'/');
  const td=new TextDecoder('utf-8');

  async function readSnap(){
    try{const db=await openDB();const s=await read(db,'snapshots',SNAP_KEY);if(s)return s}catch(e){console.warn('EXPORT_INTEGRITY_IDB',e)}
    try{return JSON.parse(sessionStorage.getItem('diniAnifCleanPreviewApplied')||localStorage.getItem('diniAnifNativeApplied')||'null')}catch{return null}
  }

  function directNodes(doc,f){
    const out=[],seen=new Set(),add=n=>{if(n&&!seen.has(n)){seen.add(n);out.push(n)}};
    if(!doc||!f)return out;
    doc.querySelectorAll('[data-native-edit-id],[data-native-edit-ids]').forEach(n=>{
      const one=n.getAttribute('data-native-edit-id')||'';
      const many=(n.getAttribute('data-native-edit-ids')||'').split(/[\s,]+/).filter(Boolean);
      if(one===f.id||many.includes(f.id))add(n);
    });
    if(f.node_id)add(doc.querySelector(`[data-native-node-id="${esc(f.node_id)}"]`));
    return out;
  }

  const isOverlayNode=n=>!!n&&(
    n.classList?.contains('elementor-background-overlay')||
    n.hasAttribute?.('data-native-pseudo-field')||
    n.hasAttribute?.('data-native-slide-bg')||
    n.getAttribute?.('data-native-media-owner')==='overlay'
  );

  function ownedNodes(doc,f){
    const direct=directNodes(doc,f),out=[],seen=new Set(),add=n=>{if(n&&!seen.has(n)){seen.add(n);out.push(n)}};
    if(f.media_role==='css-overlay'){
      let host=null,overlay=null;
      if(f.source_element_id){host=doc.querySelector(`[data-id="${esc(f.source_element_id)}"]`);if(host)overlay=host.querySelector(':scope > .elementor-widget-wrap > .elementor-background-overlay,:scope > .elementor-element-populated > .elementor-background-overlay,:scope > .elementor-background-overlay')||host.querySelector('.elementor-background-overlay')}
      for(const n of direct){if(n!==host&&(isOverlayNode(n)||n===overlay))add(n)}
      if(overlay)add(overlay);
      if(!out.length)for(const n of direct)if(n!==host)add(n);
      if(!out.length&&host)add(host);
      return out;
    }
    for(const n of direct)add(n);
    if(f.kind==='background'&&f.source_element_id)add(doc.querySelector(`[data-id="${esc(f.source_element_id)}"]`));
    else if(!out.length&&f.source_element_id)add(doc.querySelector(`[data-id="${esc(f.source_element_id)}"]`));
    return out;
  }

  function replaceDeep(v,oldValue,newValue){
    if(!oldValue)return v;
    if(typeof v==='string')return v.includes(oldValue)?v.split(oldValue).join(newValue):v;
    if(Array.isArray(v))return v.map(x=>replaceDeep(x,oldValue,newValue));
    if(v&&typeof v==='object')for(const k of Object.keys(v))v[k]=replaceDeep(v[k],oldValue,newValue);
    return v;
  }

  function syncSettings(doc,f,path){
    const hosts=new Set();
    if(f.source_element_id){const h=doc.querySelector(`[data-id="${esc(f.source_element_id)}"]`);if(h)hosts.add(h)}
    for(const n of directNodes(doc,f)){const h=n.closest?.('[data-settings]');if(h)hosts.add(h)}
    const old=String(f.value||f.source_url||'').trim();
    for(const h of hosts){
      if(!h.hasAttribute('data-settings'))continue;
      let cfg;try{cfg=JSON.parse(h.getAttribute('data-settings')||'{}')}catch{continue}
      if(path&&old)replaceDeep(cfg,old,path);
      const layer=Number(f.background_layer);
      if(Array.isArray(cfg.background_slideshow_gallery)&&Number.isFinite(layer)&&cfg.background_slideshow_gallery[layer]){
        const item=cfg.background_slideshow_gallery[layer];if(typeof item==='string')cfg.background_slideshow_gallery[layer]=path||'';else if(item&&typeof item==='object')item.url=path||'';
      }
      if((f.kind==='background'||/data-settings|slideshow/i.test(String(f.source_location||'')+' '+String(f.media_role||'')))&&cfg.background_image&&typeof cfg.background_image==='object')cfg.background_image.url=path||'';
      h.setAttribute('data-settings',JSON.stringify(cfg));
    }
  }

  function clearMedia(node,f){
    if(!node)return;
    if(f.kind==='image'){
      const imgs=node.tagName==='IMG'?[node]:[...node.querySelectorAll?.('img')||[]];
      for(const img of imgs){img.removeAttribute('src');img.removeAttribute('data-src');img.removeAttribute('srcset');img.removeAttribute('data-srcset')}
    }
    if(f.kind==='background'||f.media_role==='gallery'||f.media_role==='css-overlay'||node.classList?.contains('e-gallery-image')){
      node.style.setProperty('background-image','none','important');node.removeAttribute('data-thumbnail');
      const a=node.closest?.('a.e-gallery-item,a.elementor-gallery-item,.e-gallery-item');if(a?.tagName==='A')a.setAttribute('href','#');
      const slide=node.matches?.('[data-native-slide-bg]')?node:node.querySelector?.('[data-native-slide-bg]');if(slide)slide.style.setProperty('background-image','none','important');
    }
    if(f.kind==='audio'||f.kind==='video'){
      const media=node.matches?.('audio,video')?node:(node.closest?.('audio,video')||node.querySelector?.('audio,video')||null);
      if(media){media.removeAttribute('src');media.removeAttribute('data-src');for(const s of media.querySelectorAll('source')){s.removeAttribute('src');s.removeAttribute('data-src');s.removeAttribute('data-lazy-src')}}
      if(node.matches?.('source')){node.removeAttribute('src');node.removeAttribute('data-src');node.removeAttribute('data-lazy-src')}
    }
    node.setAttribute('data-native-export-deleted','1');
  }

  function applyMedia(node,f,path){
    if(!node)return;
    if(!path){clearMedia(node,f);return}
    node.setAttribute('data-native-export-asset',path);node.setAttribute('data-native-true-replace','1');
    if(f.kind==='image'){
      const imgs=node.tagName==='IMG'?[node]:[...node.querySelectorAll?.('img')||[]];
      for(const img of imgs){img.setAttribute('src',path);img.setAttribute('data-src',path);img.removeAttribute('srcset');img.removeAttribute('data-srcset')}
    }
    if(f.kind==='background'||f.media_role==='gallery'||f.media_role==='css-overlay'||node.classList?.contains('e-gallery-image')){
      const want=`url("${String(path).replaceAll('"','%22')}")`;
      node.style.setProperty('background-image',want,'important');node.setAttribute('data-thumbnail',path);
      const a=node.closest?.('a.e-gallery-item,a.elementor-gallery-item,.e-gallery-item');if(a?.tagName==='A')a.setAttribute('href',path);
      const slide=node.matches?.('[data-native-slide-bg]')?node:node.querySelector?.('[data-native-slide-bg]');if(slide)slide.style.setProperty('background-image',want,'important');
    }
    if(f.kind==='audio'||f.kind==='video'){
      const media=node.matches?.('audio,video')?node:(node.closest?.('audio,video')||node.querySelector?.('audio,video')||null);
      if(media){media.setAttribute('src',path);for(const s of media.querySelectorAll('source'))s.setAttribute('src',path)}
      else if(node.matches?.('source'))node.setAttribute('src',path);
    }
  }

  function textState(doc,f){
    const n=directNodes(doc,f)[0];if(!n)return null;
    if(n.matches?.('input,textarea,select'))return {mode:'value',value:String(n.value??n.getAttribute('value')??'')};
    return {mode:'html',value:String(n.innerHTML??'')};
  }

  function applyTextState(doc,f,state){
    if(!state)return;
    for(const n of directNodes(doc,f)){
      if(state.mode==='value'){n.value=state.value;n.setAttribute('value',state.value)}else n.innerHTML=state.value;
    }
  }

  function buildRuntimeLock(textLocks,mediaLocks){
    if(!textLocks.length&&!mediaLocks.length)return '';
    const payload=JSON.stringify({t:textLocks,m:mediaLocks}).replace(/<\/script/gi,'<\\/script');
    return `(()=>{const P=${payload},esc=s=>CSS.escape(String(s||'')),busy={v:false};function nodes(f){const a=[],z=new Set(),add=n=>{if(n&&!z.has(n)){z.add(n);a.push(n)}};document.querySelectorAll('[data-native-edit-id],[data-native-edit-ids]').forEach(n=>{const o=n.getAttribute('data-native-edit-id')||'',m=(n.getAttribute('data-native-edit-ids')||'').split(/[\\s,]+/).filter(Boolean);if(o===f.id||m.includes(f.id))add(n)});if(f.node_id)add(document.querySelector('[data-native-node-id="'+esc(f.node_id)+'"]'));return a}function owned(f){const d=nodes(f),o=[],z=new Set(),add=n=>{if(n&&!z.has(n)){z.add(n);o.push(n)}};if(f.media_role==='css-overlay'){let h=null,v=null;if(f.source_element_id){h=document.querySelector('[data-id="'+esc(f.source_element_id)+'"]');if(h)v=h.querySelector(':scope > .elementor-widget-wrap > .elementor-background-overlay,:scope > .elementor-element-populated > .elementor-background-overlay,:scope > .elementor-background-overlay')||h.querySelector('.elementor-background-overlay')}for(const n of d){if(n!==h&&(n===v||n.classList?.contains('elementor-background-overlay')||n.hasAttribute?.('data-native-pseudo-field')||n.hasAttribute?.('data-native-slide-bg')))add(n)}if(v)add(v);if(!o.length)for(const n of d)if(n!==h)add(n);if(!o.length&&h)add(h);return o}d.forEach(add);if(f.kind==='background'&&f.source_element_id)add(document.querySelector('[data-id="'+esc(f.source_element_id)+'"]'));return o}function media(n,x){if(!n)return;if(x.deleted||!x.path){if(x.kind==='image'){const a=n.tagName==='IMG'?[n]:[...n.querySelectorAll('img')];for(const i of a){i.removeAttribute('src');i.removeAttribute('data-src');i.removeAttribute('srcset');i.removeAttribute('data-srcset')}}if(x.kind==='background'||x.media_role==='gallery'||x.media_role==='css-overlay'){n.style.setProperty('background-image','none','important');n.removeAttribute('data-thumbnail');const a=n.closest?.('a.e-gallery-item,a.elementor-gallery-item,.e-gallery-item');if(a?.tagName==='A')a.setAttribute('href','#')}if(x.kind==='audio'||x.kind==='video'){const m=n.matches?.('audio,video')?n:(n.closest?.('audio,video')||n.querySelector?.('audio,video'));if(m){m.removeAttribute('src');for(const s of m.querySelectorAll('source'))s.removeAttribute('src')}if(n.matches?.('source'))n.removeAttribute('src')}return}if(x.kind==='image'){const a=n.tagName==='IMG'?[n]:[...n.querySelectorAll('img')];for(const i of a){i.setAttribute('src',x.path);i.setAttribute('data-src',x.path);i.removeAttribute('srcset');i.removeAttribute('data-srcset')}}if(x.kind==='background'||x.media_role==='gallery'||x.media_role==='css-overlay'){const w='url("'+String(x.path).replaceAll('"','%22')+'")';n.style.setProperty('background-image',w,'important');n.setAttribute('data-thumbnail',x.path);const a=n.closest?.('a.e-gallery-item,a.elementor-gallery-item,.e-gallery-item');if(a?.tagName==='A')a.setAttribute('href',x.path)}if(x.kind==='audio'||x.kind==='video'){const m=n.matches?.('audio,video')?n:(n.closest?.('audio,video')||n.querySelector?.('audio,video'));if(m){m.setAttribute('src',x.path);for(const s of m.querySelectorAll('source'))s.setAttribute('src',x.path)}}}function apply(){if(busy.v)return;busy.v=true;try{for(const x of P.t){for(const n of nodes(x)){if(x.mode==='value'){if(n.value!==x.value)n.value=x.value;n.setAttribute('value',x.value)}else if(n.innerHTML!==x.value)n.innerHTML=x.value}}for(const x of P.m)for(const n of owned(x))media(n,x)}finally{busy.v=false}}apply();addEventListener('DOMContentLoaded',apply,{once:true});addEventListener('load',apply,{once:true});[0,80,250,700,1700,4800].forEach(ms=>setTimeout(apply,ms));let r=0;new MutationObserver(()=>{if(busy.v||r)return;r=requestAnimationFrame(()=>{r=0;apply()})}).observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['style','src','srcset','href','data-thumbnail','data-settings']})})();`;
  }

  async function finalizeExportHtml(input,snap){
    const liveDoc=frame.contentDocument;if(!liveDoc?.documentElement||!snap)return String(input||'');
    const doc=new DOMParser().parseFromString(String(input||''),'text/html');
    const fields=new Map((snap.schema?.fields||[]).map(f=>[f.id,f]));
    const textLocks=[],mediaLocks=[],assetIds=new Set((snap.assets||[]).filter(a=>a?.role==='field'&&a.id).map(a=>a.id));

    // Exact Clean Preview text wins, including emoji and inline markup.
    for(const f of snap.schema?.fields||[]){
      if(f.kind!=='text')continue;
      const state=textState(liveDoc,f);if(!state)continue;
      applyTextState(doc,f,state);
      textLocks.push({id:f.id,node_id:f.node_id||'',mode:state.mode,value:state.value});
    }

    for(const a of snap.assets||[]){
      if(a?.role!=='field'||!a.id||!a.path)continue;
      const f=fields.get(a.id);if(!f)continue;
      for(const n of ownedNodes(doc,f))applyMedia(n,f,a.path);
      syncSettings(doc,f,a.path);
      mediaLocks.push({id:f.id,node_id:f.node_id||'',kind:f.kind||'',media_role:f.media_role||'',source_element_id:f.source_element_id||'',path:a.path,deleted:false});
    }

    // A source value changed to empty means a real delete, not a request to fall back to authored <source>/CSS.
    for(const f of snap.schema?.fields||[]){
      if(!['image','background','audio','video'].includes(f.kind)||assetIds.has(f.id))continue;
      const stored=snap.values?.[f.id];
      const deleted=stored===''&&String(f.value??'')!=='';
      if(!deleted)continue;
      for(const n of ownedNodes(doc,f))applyMedia(n,f,'');
      syncSettings(doc,f,'');
      mediaLocks.push({id:f.id,node_id:f.node_id||'',kind:f.kind||'',media_role:f.media_role||'',source_element_id:f.source_element_id||'',path:'',deleted:true});
    }

    doc.querySelectorAll('script[data-dini-export-parity],script[data-dini-integrity-lock]').forEach(s=>s.remove());
    const lock=buildRuntimeLock(textLocks,mediaLocks);
    if(lock){const s=doc.createElement('script');s.setAttribute('data-dini-integrity-lock',VERSION);s.textContent=lock;(doc.body||doc.documentElement).appendChild(s)}
    doc.documentElement.setAttribute('data-export-integrity',VERSION);
    doc.documentElement.setAttribute('data-export-text-locks',String(textLocks.length));
    doc.documentElement.setAttribute('data-export-media-locks',String(mediaLocks.length));
    return '<!doctype html>\n'+doc.documentElement.outerHTML;
  }

  function dirname(p){const a=normName(p).split('/');a.pop();return a}
  function normalizeParts(parts){const out=[];for(const p of parts){if(!p||p==='.')continue;if(p==='..')out.pop();else out.push(p)}return out}
  function resolveRel(from,ref){return normalizeParts([...dirname(from),...String(ref||'').split('/')]).join('/')}
  function relativePath(from,to){const a=dirname(from),b=normName(to).split('/');while(a.length&&b.length&&a[0]===b[0]){a.shift();b.shift()}return '../'.repeat(a.length)+b.join('/')}
  function canonicalBase(name){let b=decodeURIComponent(String(name||'').split('/').pop()||'').split(/[?#]/)[0];for(let i=0;i<5;i++){const n=b.replace(/^[0-9a-f]{8}-/i,'').replace(/^\d+-\d+-/,'');if(n===b)break;b=n}return b.toLowerCase()}
  async function asText(data){if(typeof data==='string')return data;if(data instanceof Blob)return data.text();if(data instanceof Uint8Array)return td.decode(data);if(data instanceof ArrayBuffer)return td.decode(new Uint8Array(data));return String(data??'')}

  async function repairCssAndDedupe(entries){
    const byName=new Map(),order=[];let duplicates=0;
    for(const e of entries||[]){if(!e?.name)continue;const name=normName(e.name);if(byName.has(name))duplicates++;else order.push(name);byName.set(name,{...e,name})}
    const names=new Set(byName.keys()),baseMap=new Map();
    for(const name of names){const b=canonicalBase(name);if(!baseMap.has(b))baseMap.set(b,[]);baseMap.get(b).push(name)}
    let cssRewrites=0;const unresolved=[];
    for(const name of [...names]){
      if(!/\.css$/i.test(name))continue;
      const e=byName.get(name);let css=await asText(e.data);
      css=css.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi,(all,q,raw)=>{
        const ref=String(raw||'').trim();if(!ref||/^(?:data:|blob:|https?:|\/\/|#)/i.test(ref))return all;
        const clean=ref.split(/[?#]/)[0],resolved=resolveRel(name,clean);if(names.has(resolved))return all;
        const key=canonicalBase(clean);let cand=(baseMap.get(key)||[]).slice();
        if(!cand.length)cand=[...names].filter(n=>canonicalBase(n).endsWith(key)||key.endsWith(canonicalBase(n)));
        cand=cand.filter(n=>!n.endsWith('/'));if(!cand.length){unresolved.push({css:name,ref});return all}
        cand.sort((a,b)=>a.length-b.length);const rel=relativePath(name,cand[0]);cssRewrites++;return `url(${q||''}${rel}${q||''})`;
      });
      css=css.replace(/@import\s+(["'])([^"']+)\1/gi,(all,q,raw)=>{
        const ref=String(raw||'').trim();if(!ref||/^(?:data:|blob:|https?:|\/\/|#)/i.test(ref))return all;const resolved=resolveRel(name,ref);if(names.has(resolved))return all;
        const cand=(baseMap.get(canonicalBase(ref))||[]).filter(n=>/\.css$/i.test(n));if(!cand.length)return all;cssRewrites++;return `@import ${q}${relativePath(name,cand[0])}${q}`;
      });
      byName.set(name,{...e,data:css});
    }
    return {entries:order.map(n=>byName.get(n)),report:{duplicates_removed:duplicates,css_rewrites:cssRewrites,css_unresolved:[...new Map(unresolved.map(x=>[x.css+'|'+x.ref,x])).values()].slice(0,200)}};
  }

  async function pruneDeletedAudio(entries,snap){
    const audioFields=(snap?.schema?.fields||[]).filter(f=>f.kind==='audio');
    const active=audioFields.some(f=>String(snap.values?.[f.id]??f.value??'').trim()!=='');
    if(active||!audioFields.length)return {entries,removed:0};
    let removed=0;const out=[];
    for(const e of entries){if(/\.(?:mp3|wav|ogg|m4a|aac|flac)(?:$|[?#])/i.test(e.name)){removed++;continue}out.push(e)}
    return {entries:out,removed};
  }

  zip.buildZip=async entries=>{
    const snap=await readSnap();
    let out=[];
    for(const entry of entries||[]){
      if(!entry?.name){out.push(entry);continue}
      if((entry.name==='index.html'||entry.name==='source-native.html')&&typeof entry.data==='string'){out.push({...entry,data:await finalizeExportHtml(entry.data,snap)});continue}
      if(entry.name==='manifest.json'&&typeof entry.data==='string'){
        try{const m=JSON.parse(entry.data);m.preview='clean-preview-v1.10.1';m.export='integrity-v1.11.0';m.editor_integrity='v1.11.0';out.push({...entry,data:JSON.stringify(m,null,2)});continue}catch{}
      }
      if(entry.name==='README-CLEAN-DEPENDENCY.txt'){
        out.push({...entry,data:`Dini Anif Production ZIP V1.11.0 Integrity Sweep\nExact Clean Preview text/emoji lock: ON\nMedia authority: ON\nTrue audio delete: ON\nCSS/font repair: ON\nZIP path dedupe: ON\n`});continue
      }
      out.push(entry);
    }

    const repaired=await repairCssAndDedupe(out);out=repaired.entries;
    const pruned=await pruneDeletedAudio(out,snap);out=pruned.entries;
    const integrity={version:VERSION,generated_at:new Date().toISOString(),...repaired.report,orphan_audio_removed:pruned.removed,entry_count_final:out.length};
    const existing=out.findIndex(e=>e.name==='integrity-audit.json');if(existing>=0)out.splice(existing,1);
    out.push({name:'integrity-audit.json',data:JSON.stringify(integrity,null,2)});
    return originalBuildZip(out);
  };

  const save=document.getElementById('saveCleanZip');
  if(save){const fix=()=>{save.download='dini-anif-native-production-v1110-integrity.zip'};fix();new MutationObserver(fix).observe(save,{attributes:true,attributeFilter:['download']})}
})();
