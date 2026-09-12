(()=>{
  'use strict';
  const VERSION='1.15.0';
  const dataEl=document.getElementById('diniSnapshotAuthorityData');
  if(!dataEl||document.documentElement.dataset.snapshotAuthority===VERSION)return;
  let payload={};try{payload=JSON.parse(dataEl.textContent||'{}')}catch(err){console.error('SNAPSHOT_AUTHORITY_DATA',err);return}
  const schema=payload.schema||{},values=payload.values||{},transforms=payload.transforms||{},persistent=payload.persistent!==false;
  const esc=v=>(window.CSS?.escape?CSS.escape(String(v||'')):String(v||'').replace(/["\\]/g,'\\$&'));
  let busy=false,observer=null;

  function directNodes(f){
    const out=[],seen=new Set(),add=n=>{if(n&&!seen.has(n)){seen.add(n);out.push(n)}};
    document.querySelectorAll('[data-native-edit-id],[data-native-edit-ids]').forEach(n=>{
      const one=n.getAttribute('data-native-edit-id')||'',many=(n.getAttribute('data-native-edit-ids')||'').split(/[\s,]+/).filter(Boolean);
      if(one===f.id||many.includes(f.id))add(n);
    });
    if(f.node_id)add(document.querySelector(`[data-native-node-id="${esc(f.node_id)}"]`));
    return out;
  }
  const isOverlay=n=>!!n&&(n.classList?.contains('elementor-background-overlay')||n.hasAttribute?.('data-native-slide-bg')||n.getAttribute?.('data-native-media-owner')==='overlay');
  function ownedNodes(f){
    const direct=directNodes(f),out=[],seen=new Set(),add=n=>{if(n&&!seen.has(n)){seen.add(n);out.push(n)}};
    if(f.media_role==='css-overlay'){
      let host=null,overlay=null;
      if(f.source_element_id){host=document.querySelector(`[data-id="${esc(f.source_element_id)}"]`);if(host)overlay=host.querySelector(':scope > .elementor-widget-wrap > .elementor-background-overlay,:scope > .elementor-element-populated > .elementor-background-overlay,:scope > .elementor-background-overlay')||host.querySelector('.elementor-background-overlay')}
      for(const n of direct){if(n!==host&&(isOverlay(n)||n===overlay))add(n)}
      if(overlay)add(overlay);if(!out.length)for(const n of direct)if(n!==host)add(n);if(!out.length&&host)add(host);return out;
    }
    for(const n of direct)add(n);
    if(f.kind==='background'&&f.source_element_id)add(document.querySelector(`[data-id="${esc(f.source_element_id)}"]`));
    return out;
  }
  function replaceDeep(v,oldValue,newValue){
    if(!oldValue)return v;if(typeof v==='string')return v.includes(oldValue)?v.split(oldValue).join(newValue):v;
    if(Array.isArray(v))return v.map(x=>replaceDeep(x,oldValue,newValue));
    if(v&&typeof v==='object')for(const k of Object.keys(v))v[k]=replaceDeep(v[k],oldValue,newValue);return v;
  }
  function syncSettings(f,value){
    const hosts=new Set();if(f.source_element_id){const h=document.querySelector(`[data-id="${esc(f.source_element_id)}"]`);if(h)hosts.add(h)}
    for(const n of directNodes(f)){const h=n.closest?.('[data-settings]');if(h)hosts.add(h)}
    const old=String(f.value||f.source_url||'').trim();
    for(const h of hosts){if(!h.hasAttribute('data-settings'))continue;let cfg;try{cfg=JSON.parse(h.getAttribute('data-settings')||'{}')}catch{continue}
      if(old)replaceDeep(cfg,old,value);const layer=Number(f.background_layer);
      if(Array.isArray(cfg.background_slideshow_gallery)&&Number.isFinite(layer)&&cfg.background_slideshow_gallery[layer]){const item=cfg.background_slideshow_gallery[layer];if(typeof item==='string')cfg.background_slideshow_gallery[layer]=value;else if(item&&typeof item==='object')item.url=value}
      if((f.kind==='background'||/data-settings|slideshow/i.test(String(f.source_location||'')+' '+String(f.media_role||'')))&&cfg.background_image&&typeof cfg.background_image==='object')cfg.background_image.url=value;
      h.setAttribute('data-settings',JSON.stringify(cfg));
    }
  }
  function applyTransform(n,f){
    const t=transforms[f.id];if(!n||!t)return;
    const x=Number.isFinite(Number(t.x))?Number(t.x):50,y=Number.isFinite(Number(t.y))?Number(t.y):50,scale=Number(t.scale)||1,rotate=Number(t.rotate)||0,fit=t.fit||'cover';
    if(f.kind==='image'){
      const imgs=n.tagName==='IMG'?[n]:[...n.querySelectorAll?.('img')||[]];for(const img of imgs){img.style.objectFit=fit;img.style.objectPosition=`${x}% ${y}%`;img.style.transform=`scale(${scale}) rotate(${rotate}deg)`;img.style.transformOrigin=`${x}% ${y}%`}
    }else if(f.kind==='background'){
      n.style.setProperty('background-position',`${x}% ${y}%`,'important');
      n.style.setProperty('background-size',scale===1?fit:`${Math.round(scale*10000)/100}% auto`,'important');
    }
  }
  function applyPseudo(f,value){
    if(!f.pseudo||!f.node_id||!value)return;let st=document.querySelector(`style[data-template-authority-field="${esc(f.id)}"]`);if(!st){st=document.createElement('style');st.setAttribute('data-template-authority-field',f.id);document.head.appendChild(st)}
    const safe=String(value).replace(/\\/g,'\\\\').replace(/"/g,'\\"');st.textContent=`[data-native-node-id="${String(f.node_id).replace(/"/g,'\\"')}"]::${f.pseudo==='after'?'after':'before'}{background-image:url("${safe}")!important}`;
  }
  function applyField(f){
    const value=String(values[f.id]??f.value??'');const nodes=ownedNodes(f);
    if(f.kind==='text'){
      for(const n of nodes){if(n.matches?.('input,textarea,select')){n.value=value;n.setAttribute('value',value)}else n.textContent=value;n.setAttribute('data-template-authority','text-'+VERSION)}return;
    }
    if(f.kind==='url'){for(const n of nodes){if(n.matches?.('a'))n.setAttribute('href',value);else if(n.hasAttribute?.('href'))n.setAttribute('href',value)}return}
    if(f.kind==='image'){
      for(const n of nodes){const imgs=n.tagName==='IMG'?[n]:[...n.querySelectorAll?.('img')||[]];for(const img of imgs){if(value){img.src=value;img.setAttribute('data-src',value)}else{img.removeAttribute('src');img.removeAttribute('data-src')}img.removeAttribute('srcset');img.removeAttribute('data-srcset')}applyTransform(n,f)}return;
    }
    if(f.kind==='background'){
      for(const n of nodes){const want=value?`url("${value.replaceAll('"','%22')}")`:'none';n.style.setProperty('background-image',want,'important');if(value)n.setAttribute('data-thumbnail',value);else n.removeAttribute('data-thumbnail');const slide=n.matches?.('[data-native-slide-bg]')?n:n.querySelector?.('[data-native-slide-bg]');if(slide)slide.style.setProperty('background-image',want,'important');const a=n.closest?.('a.e-gallery-item,a.elementor-gallery-item,.e-gallery-item');if(a?.tagName==='A'&&value)a.setAttribute('href',value);applyTransform(n,f)}syncSettings(f,value);applyPseudo(f,value);return;
    }
    if(f.kind==='video'||f.kind==='audio')for(const n of nodes){const media=n.matches?.('video,audio,source')?[n]:[...n.querySelectorAll?.('video,audio,source')||[]];for(const m of media){if(value)m.setAttribute('src',value);else m.removeAttribute('src')}};
  }
  function applyAll(){if(busy)return;busy=true;try{for(const f of schema.fields||[])applyField(f);document.documentElement.dataset.snapshotAuthority=VERSION}finally{busy=false}}
  function install(){applyAll();[60,180,450,900,1600].forEach(ms=>setTimeout(applyAll,ms));if(persistent){observer?.disconnect();let raf=0;observer=new MutationObserver(()=>{if(busy||raf)return;raf=requestAnimationFrame(()=>{raf=0;applyAll()})});observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['style','src','srcset','href','data-thumbnail','data-settings']})}else setTimeout(()=>observer?.disconnect(),2200)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
