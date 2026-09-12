(() => {
  'use strict';
  const VERSION='1.10.0';
  const DB_NAME='dini-anif-editor-v150',DB_VERSION=2,SNAP_KEY='native-applied';
  const frame=document.getElementById('cleanFrame');
  if(!frame)return;

  const openDB=()=>new Promise((res,rej)=>{const q=indexedDB.open(DB_NAME,DB_VERSION);q.onupgradeneeded=()=>{const db=q.result;if(!db.objectStoreNames.contains('assets'))db.createObjectStore('assets');if(!db.objectStoreNames.contains('snapshots'))db.createObjectStore('snapshots')};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
  const read=(db,store,key)=>new Promise((res,rej)=>{const tx=db.transaction(store);const q=tx.objectStore(store).get(key);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)});
  const esc=v=>CSS.escape(String(v||''));
  const urls=[];
  let observer=null,busy=false;

  async function loadAuthority(){
    const db=await openDB();
    let snap=await read(db,'snapshots',SNAP_KEY);
    if(!snap){try{snap=JSON.parse(sessionStorage.getItem('diniAnifCleanPreviewApplied')||localStorage.getItem('diniAnifNativeApplied')||'null')}catch{}}
    if(!snap)return null;
    const fields=new Map((snap.schema?.fields||[]).map(f=>[f.id,f]));
    const entries=[];
    for(const a of snap.assets||[]){
      if(a?.role!=='field'||!a.id||!a.path)continue;
      const f=fields.get(a.id);if(!f)continue;
      const blob=await read(db,'assets',a.key);if(!blob)continue;
      const url=URL.createObjectURL(blob);urls.push(url);
      entries.push({f,url,path:a.path});
    }
    return {snap,entries};
  }

  function directNodes(doc,f){
    const out=[],seen=new Set();
    const add=n=>{if(n&&!seen.has(n)){seen.add(n);out.push(n)}};
    doc.querySelectorAll('[data-native-edit-id],[data-native-edit-ids]').forEach(n=>{
      const one=n.getAttribute('data-native-edit-id')||'';
      const many=(n.getAttribute('data-native-edit-ids')||'').split(/[\s,]+/).filter(Boolean);
      if(one===f.id||many.includes(f.id))add(n);
    });
    if(f.node_id)add(doc.querySelector(`[data-native-node-id="${esc(f.node_id)}"]`));
    return out;
  }

  function ownedNodes(doc,f){
    const direct=directNodes(doc,f);
    const out=[...direct],seen=new Set(direct);
    const add=n=>{if(n&&!seen.has(n)){seen.add(n);out.push(n)}};
    if(f.kind==='background'||f.media_role==='css-overlay'){
      if(f.source_element_id){
        const host=doc.querySelector(`[data-id="${esc(f.source_element_id)}"]`);add(host);
        if(host&&f.media_role==='css-overlay')add(host.querySelector(':scope > .elementor-widget-wrap > .elementor-background-overlay,:scope > .elementor-element-populated > .elementor-background-overlay,:scope > .elementor-background-overlay')||host.querySelector('.elementor-background-overlay'));
      }
    }else if(!out.length&&f.source_element_id){
      add(doc.querySelector(`[data-id="${esc(f.source_element_id)}"]`));
    }
    return out;
  }

  function replaceDeep(v,oldValue,newValue){
    if(!oldValue)return v;
    if(typeof v==='string')return v.includes(oldValue)?v.split(oldValue).join(newValue):v;
    if(Array.isArray(v))return v.map(x=>replaceDeep(x,oldValue,newValue));
    if(v&&typeof v==='object')for(const k of Object.keys(v))v[k]=replaceDeep(v[k],oldValue,newValue);
    return v;
  }

  function syncSettings(doc,f,url){
    const hosts=new Set();
    if(f.source_element_id){const h=doc.querySelector(`[data-id="${esc(f.source_element_id)}"]`);if(h)hosts.add(h)}
    for(const n of directNodes(doc,f)){const h=n.closest?.('[data-settings]');if(h)hosts.add(h)}
    const old=String(f.value||f.source_url||'').trim();
    for(const h of hosts){
      if(!h.hasAttribute('data-settings'))continue;
      let cfg;try{cfg=JSON.parse(h.getAttribute('data-settings')||'{}')}catch{continue}
      if(old)replaceDeep(cfg,old,url);
      const layer=Number(f.background_layer);
      if(Array.isArray(cfg.background_slideshow_gallery)&&Number.isFinite(layer)&&cfg.background_slideshow_gallery[layer]){
        const item=cfg.background_slideshow_gallery[layer];if(typeof item==='string')cfg.background_slideshow_gallery[layer]=url;else if(item&&typeof item==='object')item.url=url;
      }
      if((f.kind==='background'||/data-settings|slideshow/i.test(String(f.source_location||'')+' '+String(f.media_role||'')))&&cfg.background_image&&typeof cfg.background_image==='object')cfg.background_image.url=url;
      h.setAttribute('data-settings',JSON.stringify(cfg));
    }
  }

  function applyNode(node,f,url){
    if(!node||!url)return;
    node.setAttribute('data-native-final-asset','hydrated');
    node.setAttribute('data-native-true-replace','1');
    if(f.kind==='image'){
      const imgs=node.tagName==='IMG'?[node]:[...node.querySelectorAll?.('img')||[]];
      if(node.tagName==='IMG'&&!imgs.includes(node))imgs.unshift(node);
      for(const img of imgs){img.setAttribute('src',url);img.setAttribute('data-src',url);img.removeAttribute('srcset');img.removeAttribute('data-srcset')}
    }
    if(f.kind==='background'||f.media_role==='gallery'||f.media_role==='css-overlay'||node.classList?.contains('e-gallery-image')){
      const want=`url("${String(url).replaceAll('"','%22')}")`;
      node.style.setProperty('background-image',want,'important');
      node.setAttribute('data-thumbnail',url);
      const a=node.closest?.('a.e-gallery-item,a.elementor-gallery-item,.e-gallery-item');if(a?.tagName==='A')a.setAttribute('href',url);
      const slide=node.matches?.('[data-native-slide-bg]')?node:node.querySelector?.('[data-native-slide-bg]');if(slide)slide.style.setProperty('background-image',want,'important');
    }
    if((f.kind==='video'||f.kind==='audio')&&node.matches?.('video,audio,source'))node.setAttribute('src',url);
  }

  function applyAll(auth){
    const doc=frame.contentDocument;if(!doc||!doc.documentElement||busy)return;
    busy=true;
    try{
      let count=0;
      for(const {f,url} of auth.entries){
        const nodes=ownedNodes(doc,f);for(const n of nodes)applyNode(n,f,url);syncSettings(doc,f,url);count+=nodes.length?1:0;
      }
      doc.documentElement.setAttribute('data-clean-hydrated-authority',VERSION);
      doc.documentElement.setAttribute('data-clean-hydrated-fields',String(count));
    }finally{busy=false}
  }

  loadAuthority().then(auth=>{
    if(!auth)return;
    const install=()=>{
      applyAll(auth);
      if(observer)observer.disconnect();
      const doc=frame.contentDocument;if(!doc?.documentElement)return;
      let raf=0;
      observer=new MutationObserver(()=>{if(busy||raf)return;raf=requestAnimationFrame(()=>{raf=0;applyAll(auth)})});
      observer.observe(doc.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['style','src','srcset','href','data-thumbnail','data-settings','data-native-slideshow-urls']});
      [80,250,700,1700,4800].forEach(ms=>setTimeout(()=>applyAll(auth),ms));
    };
    frame.addEventListener('load',install);
    if(frame.contentDocument?.readyState==='complete'||frame.contentDocument?.body)setTimeout(install,0);
  }).catch(e=>console.error('CLEAN_MEDIA_AUTHORITY_V1100',e));

  addEventListener('beforeunload',()=>{try{observer?.disconnect()}catch{};urls.forEach(u=>URL.revokeObjectURL(u))});
})();
