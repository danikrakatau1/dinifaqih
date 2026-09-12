(()=>{
  'use strict';
  const VERSION='1.16.2';
  const dataEl=document.getElementById('diniSnapshotAuthorityData');
  if(!dataEl||document.documentElement.dataset.snapshotAuthority===VERSION)return;
  let payload={};try{payload=JSON.parse(dataEl.textContent||'{}')}catch(err){console.error('SNAPSHOT_AUTHORITY_DATA',err);return}
  const schema=payload.schema||{},persistent=payload.persistent!==false;
  const resolved=window.DINI_TEMPLATE_CANONICAL_V1160?.resolveValues?.(schema,payload.values||{});
  const values=resolved?.values||payload.values||{};
  const esc=v=>(window.CSS?.escape?CSS.escape(String(v||'')):String(v||'').replace(/["\\]/g,'\\$&'));
  let busy=false,observer=null,raf=0;

  function directNodes(f){
    const out=[],seen=new Set(),add=n=>{if(n&&!seen.has(n)){seen.add(n);out.push(n)}};
    if(f.node_id)add(document.querySelector(`[data-native-node-id="${esc(f.node_id)}"]`));
    document.querySelectorAll('[data-native-edit-id],[data-native-edit-ids]').forEach(n=>{
      const one=n.getAttribute('data-native-edit-id')||'';
      const many=(n.getAttribute('data-native-edit-ids')||'').split(/[\s,]+/).filter(Boolean);
      if(one===f.id||many.includes(f.id))add(n);
    });
    if(f.source_element_id){
      const host=document.querySelector(`[data-id="${esc(f.source_element_id)}"]`);
      if(f.media_role==='css-overlay')add(host?.querySelector('.elementor-background-overlay'));
      else if(!out.length)add(host);
    }
    return out.filter(Boolean);
  }

  function replaceDeep(v,oldValue,newValue){
    if(!oldValue||oldValue===newValue)return v;
    if(typeof v==='string')return v.includes(oldValue)?v.split(oldValue).join(newValue):v;
    if(Array.isArray(v))return v.map(x=>replaceDeep(x,oldValue,newValue));
    if(v&&typeof v==='object')for(const k of Object.keys(v))v[k]=replaceDeep(v[k],oldValue,newValue);
    return v;
  }

  function setAttr(n,k,v){
    if(!n)return;
    if(v){if(n.getAttribute(k)!==v)n.setAttribute(k,v)}
    else if(n.hasAttribute(k))n.removeAttribute(k);
  }

  function setBgImage(n,value,important=true){
    if(!n)return;
    const want=value?`url("${String(value).replaceAll('"','%22')}")`:'none';
    const now=n.style.getPropertyValue('background-image');
    const prio=n.style.getPropertyPriority('background-image');
    if(now!==want||(important&&prio!=='important'))n.style.setProperty('background-image',want,important?'important':'');
    if(value){setAttr(n,'data-thumbnail',value);setAttr(n,'data-template-authority',VERSION)}
  }

  function syncSettings(node,f,value){
    const hosts=new Set();
    if(node?.closest?.('[data-settings]'))hosts.add(node.closest('[data-settings]'));
    if(f.source_element_id){const h=document.querySelector(`[data-id="${esc(f.source_element_id)}"]`);if(h)hosts.add(h)}
    const old=String(f.value||f.source_url||'').trim(),idx=Number.isInteger(Number(f.slide_index))?Number(f.slide_index):null;
    for(const h of hosts){
      let cfg;try{cfg=JSON.parse(h.getAttribute('data-settings')||'{}')}catch{continue}
      if(f.media_role==='slideshow'||idx!==null){
        const gal=Array.isArray(cfg.background_slideshow_gallery)?cfg.background_slideshow_gallery:null;
        if(gal&&idx!==null&&idx>=0&&idx<gal.length){
          gal[idx]={...(gal[idx]||{}),url:value};
        }else replaceDeep(cfg,old,value);
      }else replaceDeep(cfg,old,value);
      const next=JSON.stringify(cfg);
      if(h.getAttribute('data-settings')!==next)h.setAttribute('data-settings',next);
    }
  }

  function syncSlideshow(f,value,nodes){
    if(f.kind!=='background')return false;
    const idx=Number.isInteger(Number(f.slide_index))?Number(f.slide_index):0;
    const candidates=[];
    for(const n of nodes){
      const root=n.closest?.('[data-native-slideshow]')||n.querySelector?.('[data-native-slideshow]');
      if(root)candidates.push(root);
      const sec=n.closest?.('.elementor-top-section,section');
      const r=sec?.querySelector?.('[data-native-slideshow]');
      if(r)candidates.push(r);
    }
    let touched=false;
    for(const root of new Set(candidates)){
      let urls=[];try{urls=JSON.parse(root.getAttribute('data-native-slideshow-urls')||'[]')}catch{}
      if(!Array.isArray(urls))urls=[];
      while(urls.length<=idx)urls.push('');
      if(urls[idx]!==value){urls[idx]=value;root.setAttribute('data-native-slideshow-urls',JSON.stringify(urls))}
      const slides=[...root.querySelectorAll('[data-native-slide-bg],.swiper-slide-bg')];
      if(slides.length){
        if(slides[idx])setBgImage(slides[idx],value,true);
        else if(slides.length===1)setBgImage(slides[0],value,true);
      }
      const host=root.parentElement?.closest?.('[data-settings]')||root.parentElement;
      if(host?.hasAttribute?.('data-settings'))syncSettings(host,f,value);
      touched=true;
    }
    return touched;
  }

  function applyPseudo(f,value){
    if(!f.pseudo||!f.node_id)return;
    let st=document.querySelector(`style[data-template-authority-field="${esc(f.id)}"]`);
    if(!st){st=document.createElement('style');st.setAttribute('data-template-authority-field',f.id);document.head.appendChild(st)}
    const safe=String(value||'').replace(/\\/g,'\\\\').replace(/"/g,'\\"');
    const next=`[data-native-node-id="${String(f.node_id).replace(/"/g,'\\"')}"]::${f.pseudo==='after'?'after':'before'}{background-image:${safe?`url("${safe}")`:'none'}!important}`;
    if(st.textContent!==next)st.textContent=next;
  }

  function applyField(f){
    const value=String(values[f.id]??f.value??''),nodes=directNodes(f);
    if(f.kind==='text'){
      for(const n of nodes){
        if(n.matches?.('input,textarea,select')){if(n.value!==value)n.value=value;setAttr(n,'value',value)}
        else if(n.textContent!==value)n.textContent=value;
        setAttr(n,'data-template-authority','text-'+VERSION);
      }
      return;
    }
    if(f.kind==='url'){for(const n of nodes)if(n.matches?.('a,[href]'))setAttr(n,'href',value);return}
    if(f.kind==='image'){
      for(const n of nodes){
        const imgs=n.tagName==='IMG'?[n]:[...n.querySelectorAll?.('img')||[]];
        for(const img of imgs){
          setAttr(img,'src',value);setAttr(img,'data-src',value);
          img.removeAttribute('srcset');img.removeAttribute('data-srcset');img.removeAttribute('sizes');img.removeAttribute('data-lazy-src');
        }
      }
      return;
    }
    if(f.kind==='background'){
      if(f.media_role==='pseudo-background'){applyPseudo(f,value);return}
      const slideshow=f.media_role==='slideshow'||Number.isInteger(Number(f.slide_index));
      if(slideshow){
        for(const n of nodes)syncSettings(n,f,value);
        syncSlideshow(f,value,nodes);
        return;
      }
      for(const n of nodes){
        setBgImage(n,value,true);
        syncSettings(n,f,value);
        if(f.media_role==='gallery'){
          setAttr(n,'data-native-gallery-image','1');
          const a=n.closest?.('a.e-gallery-item,a.elementor-gallery-item');
          if(a)setAttr(a,'href',value||'#');
        }
      }
      return;
    }
    if(f.kind==='video'||f.kind==='audio'){
      for(const n of nodes){
        const media=n.matches?.('video,audio,source')?[n]:[...n.querySelectorAll?.('video,audio,source')||[]];
        for(const m of media)setAttr(m,'src',value);
      }
    }
  }

  function applyAll(){
    if(busy)return;busy=true;
    try{
      for(const f of schema.fields||[])applyField(f);
      document.documentElement.dataset.snapshotAuthority=VERSION;
      document.documentElement.dataset.snapshotAuthorityAliases=String(resolved?.diagnostics?.propagated_fields||0);
      document.documentElement.dataset.snapshotGeometry='canonical-html';
    }finally{busy=false}
  }
  function schedule(){if(busy||raf)return;raf=requestAnimationFrame(()=>{raf=0;applyAll()})}
  function install(){
    applyAll();
    [100,320,900,2200,5200].forEach(ms=>setTimeout(applyAll,ms));
    if(persistent){
      observer?.disconnect();
      observer=new MutationObserver(schedule);
      observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['style','src','srcset','href','data-thumbnail','data-settings','data-native-slideshow-urls']});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
