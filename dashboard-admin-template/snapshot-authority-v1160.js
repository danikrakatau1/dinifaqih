(()=>{
  'use strict';
  const VERSION='1.16.0';
  const dataEl=document.getElementById('diniSnapshotAuthorityData');
  if(!dataEl||document.documentElement.dataset.snapshotAuthority===VERSION)return;
  let payload={};try{payload=JSON.parse(dataEl.textContent||'{}')}catch(err){console.error('SNAPSHOT_AUTHORITY_DATA',err);return}
  const schema=payload.schema||{},transforms=payload.transforms||{},persistent=payload.persistent!==false;
  const resolved=window.DINI_TEMPLATE_CANONICAL_V1160?.resolveValues?.(schema,payload.values||{});
  const values=resolved?.values||payload.values||{};
  const esc=v=>(window.CSS?.escape?CSS.escape(String(v||'')):String(v||'').replace(/["\\]/g,'\\$&'));
  let busy=false,observer=null,raf=0;

  function directNodes(f){
    const out=[],seen=new Set(),add=n=>{if(n&&!seen.has(n)){seen.add(n);out.push(n)}};
    if(f.node_id)add(document.querySelector(`[data-native-node-id="${esc(f.node_id)}"]`));
    document.querySelectorAll('[data-native-edit-id],[data-native-edit-ids]').forEach(n=>{const one=n.getAttribute('data-native-edit-id')||'',many=(n.getAttribute('data-native-edit-ids')||'').split(/[\s,]+/).filter(Boolean);if(one===f.id||many.includes(f.id))add(n)});
    if(f.source_element_id){const host=document.querySelector(`[data-id="${esc(f.source_element_id)}"]`);if(f.media_role==='css-overlay')add(host?.querySelector('.elementor-background-overlay'));else if(!out.length)add(host)}
    return out.filter(Boolean);
  }
  function replaceDeep(v,oldValue,newValue){if(!oldValue||oldValue===newValue)return v;if(typeof v==='string')return v.includes(oldValue)?v.split(oldValue).join(newValue):v;if(Array.isArray(v))return v.map(x=>replaceDeep(x,oldValue,newValue));if(v&&typeof v==='object')for(const k of Object.keys(v))v[k]=replaceDeep(v[k],oldValue,newValue);return v}
  function syncSettings(node,f,value){
    const hosts=new Set();if(node?.closest?.('[data-settings]'))hosts.add(node.closest('[data-settings]'));if(f.source_element_id){const h=document.querySelector(`[data-id="${esc(f.source_element_id)}"]`);if(h)hosts.add(h)}
    const old=String(f.value||f.source_url||'').trim();
    for(const h of hosts){let cfg;try{cfg=JSON.parse(h.getAttribute('data-settings')||'{}')}catch{continue}replaceDeep(cfg,old,value);if(Array.isArray(cfg.background_slideshow_gallery))for(const x of cfg.background_slideshow_gallery){if(x&&typeof x==='object')x.url=value}h.setAttribute('data-settings',JSON.stringify(cfg))}
  }
  function applyTransform(n,f){const t=transforms[f.id];if(!n||!t)return;const x=Number.isFinite(Number(t.x))?Number(t.x):50,y=Number.isFinite(Number(t.y))?Number(t.y):50,scale=Number(t.scale)||1,rotate=Number(t.rotate)||0,fit=t.fit||'cover';if(f.kind==='image'){const imgs=n.tagName==='IMG'?[n]:[...n.querySelectorAll?.('img')||[]];for(const img of imgs){img.style.objectFit=fit;img.style.objectPosition=`${x}% ${y}%`;img.style.transform=`scale(${scale}) rotate(${rotate}deg)`;img.style.transformOrigin=`${x}% ${y}%`}}else if(f.kind==='background'){n.style.setProperty('background-position',`${x}% ${y}%`,'important');n.style.setProperty('background-size',scale===1?fit:`${Math.round(scale*10000)/100}% auto`,'important')}}
  function setBg(n,value){if(!n)return;const want=value?`url("${String(value).replaceAll('"','%22')}")`:'none';n.style.setProperty('background-image',want,'important');if(value){n.setAttribute('data-thumbnail',value);n.setAttribute('data-template-authority',VERSION)}else n.removeAttribute('data-thumbnail')}
  function syncSlideshow(f,value,nodes){
    if(f.kind!=='background')return;
    const candidates=[];for(const n of nodes){const root=n.closest?.('[data-native-slideshow]')||n.querySelector?.('[data-native-slideshow]');if(root)candidates.push(root);const sec=n.closest?.('.elementor-top-section,section');const r=sec?.querySelector?.('[data-native-slideshow]');if(r)candidates.push(r)}
    for(const root of new Set(candidates)){root.setAttribute('data-native-slideshow-urls',JSON.stringify([value]));root.querySelectorAll('[data-native-slide-bg],.swiper-slide-bg').forEach(x=>setBg(x,value));const host=root.parentElement?.closest?.('[data-settings]')||root.parentElement;if(host?.hasAttribute?.('data-settings'))syncSettings(host,f,value)}
  }
  function applyPseudo(f,value){if(!f.pseudo||!f.node_id||!value)return;let st=document.querySelector(`style[data-template-authority-field="${esc(f.id)}"]`);if(!st){st=document.createElement('style');st.setAttribute('data-template-authority-field',f.id);document.head.appendChild(st)}const safe=String(value).replace(/\\/g,'\\\\').replace(/"/g,'\\"');st.textContent=`[data-native-node-id="${String(f.node_id).replace(/"/g,'\\"')}"]::${f.pseudo==='after'?'after':'before'}{background-image:url("${safe}")!important}`}

  function applyField(f){
    const value=String(values[f.id]??f.value??''),nodes=directNodes(f);
    if(f.kind==='text'){for(const n of nodes){if(n.matches?.('input,textarea,select')){n.value=value;n.setAttribute('value',value)}else if(n.textContent!==value)n.textContent=value;n.setAttribute('data-template-authority','text-'+VERSION)}return}
    if(f.kind==='url'){for(const n of nodes)if(n.matches?.('a,[href]'))n.setAttribute('href',value);return}
    if(f.kind==='image'){for(const n of nodes){const imgs=n.tagName==='IMG'?[n]:[...n.querySelectorAll?.('img')||[]];for(const img of imgs){if(value){img.setAttribute('src',value);img.setAttribute('data-src',value)}else{img.removeAttribute('src');img.removeAttribute('data-src')}img.removeAttribute('srcset');img.removeAttribute('data-srcset')}applyTransform(n,f)}return}
    if(f.kind==='background'){for(const n of nodes){setBg(n,value);syncSettings(n,f,value);applyTransform(n,f)}syncSlideshow(f,value,nodes);applyPseudo(f,value);return}
    if(f.kind==='video'||f.kind==='audio'){for(const n of nodes){const media=n.matches?.('video,audio,source')?[n]:[...n.querySelectorAll?.('video,audio,source')||[]];for(const m of media){if(value)m.setAttribute('src',value);else m.removeAttribute('src')}}}
  }
  function applyAll(){if(busy)return;busy=true;try{for(const f of schema.fields||[])applyField(f);document.documentElement.dataset.snapshotAuthority=VERSION;document.documentElement.dataset.snapshotAuthorityAliases=String(resolved?.diagnostics?.propagated_fields||0)}finally{busy=false}}
  function schedule(){if(busy||raf)return;raf=requestAnimationFrame(()=>{raf=0;applyAll()})}
  function install(){applyAll();[80,250,700,1700,4200].forEach(ms=>setTimeout(applyAll,ms));if(persistent){observer?.disconnect();observer=new MutationObserver(schedule);observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['style','src','srcset','href','data-thumbnail','data-settings','data-native-slideshow-urls']})}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
