(() => {
  'use strict';
  const VERSION='1.10.2';
  const DB_NAME='dini-anif-editor-v150',DB_VERSION=2,SNAP_KEY='native-applied';
  const frame=document.getElementById('cleanFrame');
  const zip=window.UNDANGAN_ZIP;
  if(!frame||!zip?.buildZip||zip.__diniExportParity1102)return;
  zip.__diniExportParity1102=true;

  const originalBuildZip=zip.buildZip.bind(zip);
  const openDB=()=>new Promise((res,rej)=>{const q=indexedDB.open(DB_NAME,DB_VERSION);q.onupgradeneeded=()=>{const db=q.result;if(!db.objectStoreNames.contains('assets'))db.createObjectStore('assets');if(!db.objectStoreNames.contains('snapshots'))db.createObjectStore('snapshots')};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
  const read=(db,store,key)=>new Promise((res,rej)=>{const tx=db.transaction(store);const q=tx.objectStore(store).get(key);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)});
  const esc=v=>(window.CSS?.escape?CSS.escape(String(v||'')):String(v||'').replace(/["\\]/g,'\\$&'));
  const norm=v=>String(v??'').replace(/\s+/g,' ').trim();

  async function readSnap(){
    try{const db=await openDB();const s=await read(db,'snapshots',SNAP_KEY);if(s)return s}catch(e){console.warn('EXPORT_PARITY_IDB',e)}
    try{return JSON.parse(sessionStorage.getItem('diniAnifCleanPreviewApplied')||localStorage.getItem('diniAnifNativeApplied')||'null')}catch{return null}
  }

  function directNodes(doc,f){
    const out=[],seen=new Set();
    const add=n=>{if(n&&!seen.has(n)){seen.add(n);out.push(n)}};
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
    const direct=directNodes(doc,f),out=[],seen=new Set();
    const add=n=>{if(n&&!seen.has(n)){seen.add(n);out.push(n)}};
    if(f.media_role==='css-overlay'){
      let host=null,overlay=null;
      if(f.source_element_id){
        host=doc.querySelector(`[data-id="${esc(f.source_element_id)}"]`);
        if(host)overlay=host.querySelector(':scope > .elementor-widget-wrap > .elementor-background-overlay,:scope > .elementor-element-populated > .elementor-background-overlay,:scope > .elementor-background-overlay')||host.querySelector('.elementor-background-overlay');
      }
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
      if(old)replaceDeep(cfg,old,path);
      const layer=Number(f.background_layer);
      if(Array.isArray(cfg.background_slideshow_gallery)&&Number.isFinite(layer)&&cfg.background_slideshow_gallery[layer]){
        const item=cfg.background_slideshow_gallery[layer];if(typeof item==='string')cfg.background_slideshow_gallery[layer]=path;else if(item&&typeof item==='object')item.url=path;
      }
      if((f.kind==='background'||/data-settings|slideshow/i.test(String(f.source_location||'')+' '+String(f.media_role||'')))&&cfg.background_image&&typeof cfg.background_image==='object')cfg.background_image.url=path;
      h.setAttribute('data-settings',JSON.stringify(cfg));
    }
  }

  function applyMedia(node,f,path){
    if(!node||!path)return;
    node.setAttribute('data-native-export-asset',path);
    node.setAttribute('data-native-true-replace','1');
    if(f.kind==='image'){
      const imgs=node.tagName==='IMG'?[node]:[...node.querySelectorAll?.('img')||[]];
      for(const img of imgs){img.setAttribute('src',path);img.setAttribute('data-src',path);img.removeAttribute('srcset');img.removeAttribute('data-srcset')}
    }
    if(f.kind==='background'||f.media_role==='gallery'||f.media_role==='css-overlay'||node.classList?.contains('e-gallery-image')){
      const want=`url("${String(path).replaceAll('"','%22')}")`;
      node.style.setProperty('background-image',want,'important');
      node.setAttribute('data-thumbnail',path);
      const a=node.closest?.('a.e-gallery-item,a.elementor-gallery-item,.e-gallery-item');if(a?.tagName==='A')a.setAttribute('href',path);
      const slide=node.matches?.('[data-native-slide-bg]')?node:node.querySelector?.('[data-native-slide-bg]');if(slide)slide.style.setProperty('background-image',want,'important');
    }
    if((f.kind==='video'||f.kind==='audio')&&node.matches?.('video,audio,source'))node.setAttribute('src',path);
  }

  function liveTextState(liveDoc,f){
    const n=directNodes(liveDoc,f)[0];
    if(!n)return null;
    if(n.matches?.('input,textarea,select'))return {mode:'value',value:n.value??n.getAttribute('value')??''};
    return {mode:'html',value:n.innerHTML};
  }

  function applyTextState(doc,f,state){
    if(!state)return;
    for(const n of directNodes(doc,f)){
      if(state.mode==='value'){
        n.value=state.value;n.setAttribute('value',state.value);
      }else n.innerHTML=state.value;
    }
  }

  function buildRuntimeLock(textLocks,mediaLocks){
    if(!textLocks.length&&!mediaLocks.length)return '';
    const payload=JSON.stringify({t:textLocks,m:mediaLocks}).replace(/<\/script/gi,'<\\/script');
    return `(()=>{const P=${payload},esc=s=>CSS.escape(String(s||'')),busy={v:false};function nodes(f){const a=[],z=new Set(),add=n=>{if(n&&!z.has(n)){z.add(n);a.push(n)}};document.querySelectorAll('[data-native-edit-id],[data-native-edit-ids]').forEach(n=>{const o=n.getAttribute('data-native-edit-id')||'',m=(n.getAttribute('data-native-edit-ids')||'').split(/[\\s,]+/).filter(Boolean);if(o===f.id||m.includes(f.id))add(n)});if(f.node_id)add(document.querySelector('[data-native-node-id="'+esc(f.node_id)+'"]'));return a}function owned(f){const d=nodes(f),o=[],z=new Set(),add=n=>{if(n&&!z.has(n)){z.add(n);o.push(n)}};if(f.media_role==='css-overlay'){let h=null,v=null;if(f.source_element_id){h=document.querySelector('[data-id="'+esc(f.source_element_id)+'"]');if(h)v=h.querySelector(':scope > .elementor-widget-wrap > .elementor-background-overlay,:scope > .elementor-element-populated > .elementor-background-overlay,:scope > .elementor-background-overlay')||h.querySelector('.elementor-background-overlay')}for(const n of d){if(n!==h&&(n===v||n.classList?.contains('elementor-background-overlay')||n.hasAttribute?.('data-native-pseudo-field')||n.hasAttribute?.('data-native-slide-bg')))add(n)}if(v)add(v);if(!o.length)for(const n of d)if(n!==h)add(n);if(!o.length&&h)add(h);return o}d.forEach(add);if(f.kind==='background'&&f.source_element_id)add(document.querySelector('[data-id="'+esc(f.source_element_id)+'"]'));return o}function media(n,x){if(!n)return;if(x.kind==='image'){const a=n.tagName==='IMG'?[n]:[...n.querySelectorAll('img')];for(const i of a){i.setAttribute('src',x.path);i.setAttribute('data-src',x.path);i.removeAttribute('srcset');i.removeAttribute('data-srcset')}}if(x.kind==='background'||x.media_role==='gallery'||x.media_role==='css-overlay'||n.classList?.contains('e-gallery-image')){const w='url("'+String(x.path).replaceAll('"','%22')+'")';n.style.setProperty('background-image',w,'important');n.setAttribute('data-thumbnail',x.path);const a=n.closest?.('a.e-gallery-item,a.elementor-gallery-item,.e-gallery-item');if(a?.tagName==='A')a.setAttribute('href',x.path);const s=n.matches?.('[data-native-slide-bg]')?n:n.querySelector?.('[data-native-slide-bg]');if(s)s.style.setProperty('background-image',w,'important')}}function apply(){if(busy.v)return;busy.v=true;try{for(const x of P.t){for(const n of nodes(x)){if(x.mode==='value'){if(n.value!==x.value)n.value=x.value;n.setAttribute('value',x.value)}else if(n.innerHTML!==x.value)n.innerHTML=x.value}}for(const x of P.m)for(const n of owned(x))media(n,x)}finally{busy.v=false}}apply();addEventListener('DOMContentLoaded',apply,{once:true});addEventListener('load',apply,{once:true});[0,80,250,700,1700,4800].forEach(ms=>setTimeout(apply,ms));let r=0;new MutationObserver(()=>{if(busy.v||r)return;r=requestAnimationFrame(()=>{r=0;apply()})}).observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['style','src','srcset','href','data-thumbnail','data-settings']})})();`;
  }

  async function finalizeExportHtml(input,snap){
    const liveDoc=frame.contentDocument;
    if(!liveDoc?.documentElement||!snap)return String(input||'');
    const doc=new DOMParser().parseFromString(String(input||''),'text/html');
    const fields=new Map((snap.schema?.fields||[]).map(f=>[f.id,f]));
    const textLocks=[],mediaLocks=[];

    for(const f of snap.schema?.fields||[]){
      if(f.kind!=='text')continue;
      const stored=snap.values?.[f.id];
      const changed=stored!=null&&norm(stored)!==norm(f.value);
      if(!changed)continue;
      const state=liveTextState(liveDoc,f);if(!state)continue;
      applyTextState(doc,f,state);
      textLocks.push({id:f.id,node_id:f.node_id||'',mode:state.mode,value:state.value});
    }

    for(const a of snap.assets||[]){
      if(a?.role!=='field'||!a.id||!a.path)continue;
      const f=fields.get(a.id);if(!f)continue;
      for(const n of ownedNodes(doc,f))applyMedia(n,f,a.path);
      syncSettings(doc,f,a.path);
      mediaLocks.push({id:f.id,node_id:f.node_id||'',kind:f.kind||'',media_role:f.media_role||'',source_element_id:f.source_element_id||'',path:a.path});
    }

    doc.querySelectorAll('script[data-dini-export-parity]').forEach(s=>s.remove());
    const lock=buildRuntimeLock(textLocks,mediaLocks);
    if(lock){const s=doc.createElement('script');s.setAttribute('data-dini-export-parity',VERSION);s.textContent=lock;(doc.body||doc.documentElement).appendChild(s)}
    doc.documentElement.setAttribute('data-export-parity',VERSION);
    doc.documentElement.setAttribute('data-export-text-locks',String(textLocks.length));
    doc.documentElement.setAttribute('data-export-media-locks',String(mediaLocks.length));
    return '<!doctype html>\n'+doc.documentElement.outerHTML;
  }

  zip.buildZip=async entries=>{
    const snap=await readSnap();
    const out=[];
    for(const entry of entries||[]){
      if(!entry?.name){out.push(entry);continue}
      if((entry.name==='index.html'||entry.name==='source-native.html')&&typeof entry.data==='string'){
        out.push({...entry,data:await finalizeExportHtml(entry.data,snap)});continue;
      }
      if(entry.name==='manifest.json'&&typeof entry.data==='string'){
        try{const m=JSON.parse(entry.data);m.preview='clean-preview-v1.10.1';m.export='live-parity-v1.10.2';out.push({...entry,data:JSON.stringify(m,null,2)});continue}catch{}
      }
      out.push(entry);
    }
    return originalBuildZip(out);
  };

  const save=document.getElementById('saveCleanZip');
  if(save){const fix=()=>{save.download='dini-anif-native-production-v1102-parity.zip'};fix();new MutationObserver(fix).observe(save,{attributes:true,attributeFilter:['download']})}
})();
