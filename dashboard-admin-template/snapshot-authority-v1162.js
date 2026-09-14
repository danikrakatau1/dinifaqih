(()=>{
  'use strict';
  const VERSION='1.16.3';
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
        if(gal&&idx!==null&&idx>=0&&idx<gal.length)gal[idx]={...(gal[idx]||{}),url:value};
        else replaceDeep(cfg,old,value);
      }else replaceDeep(cfg,old,value);
      const next=JSON.stringify(cfg);
      if(h.getAttribute('data-settings')!==next)h.setAttribute('data-settings',next);
    }
  }

  function transformOf(f){
    const t=transforms?.[f.id];
    if(!t||typeof t!=='object')return null;
    return {
      x:Number.isFinite(Number(t.x))?Number(t.x):50,
      y:Number.isFinite(Number(t.y))?Number(t.y):50,
      scale:Math.max(.25,Math.min(3,Number(t.scale)||1)),
      fit:t.fit||'cover',
      rotate:Number(t.rotate)||0
    };
  }

  function sizeFor(t){
    if(!t)return '';
    if(Math.abs(t.scale-1)<.001)return t.fit==='fill'?'100% 100%':t.fit;
    const pct=(t.scale*100).toFixed(2).replace(/\.00$/,'');
    return t.fit==='fill'?`${pct}% ${pct}%`:`${pct}% auto`;
  }

  function splitCssLayers(value){
    const s=String(value||''),out=[];let buf='',depth=0,q='';
    for(let i=0;i<s.length;i++){
      const c=s[i];
      if(q){buf+=c;if(c===q&&s[i-1]!=='\\')q='';continue}
      if(c==='"'||c==="'"){q=c;buf+=c;continue}
      if(c==='('||c==='['){depth++;buf+=c;continue}
      if(c===')'||c===']'){depth=Math.max(0,depth-1);buf+=c;continue}
      if(c===','&&depth===0){if(buf.trim())out.push(buf.trim());buf='';continue}
      buf+=c;
    }
    if(buf.trim())out.push(buf.trim());
    return out;
  }

  function replaceBackgroundLayer(value,index,newUrl){
    const layers=splitCssLayers(value);
    if(!layers.length)return newUrl?`url("${String(newUrl).replaceAll('"','%22')}")`:'none';
    let seen=-1,replaced=false;
    for(let i=0;i<layers.length;i++){
      if(/url\(/i.test(layers[i])){
        seen++;
        if(seen===Number(index||0)){
          layers[i]=newUrl?layers[i].replace(/url\(\s*(["']?)[^"')]+\1\s*\)/i,`url("${String(newUrl).replaceAll('"','%22')}")`):'none';
          replaced=true;break;
        }
      }
    }
    if(!replaced&&newUrl)layers.push(`url("${String(newUrl).replaceAll('"','%22')}")`);
    return layers.join(', ');
  }

  // Exact parity with Template Editor: external-CSS backgrounds keep their original selector,
  // media-query/at-rule ownership and receive the saved x/y/zoom/fit on that same CSS owner.
  function applyExternalCss(f,value,t){
    if(!f?.css_selector)return false;
    const key=String(f.source_key||f.id||'external-bg');
    let st=[...document.querySelectorAll('style[data-dini-css-override]')].find(x=>x.getAttribute('data-dini-css-override')===key);
    if(!st){st=document.createElement('style');st.setAttribute('data-dini-css-override',key);st.setAttribute('data-dini-source-owner','1');document.head.appendChild(st)}
    const prop=f.source_property||'background-image';
    const original=String(f.source_background_image||'');
    const next=replaceBackgroundLayer(original,Number(f.background_layer)||0,value);
    const important=String(f.css_priority||'').toLowerCase()==='important'?' !important':'';
    let extra='';
    if(t){
      extra=`background-position:${t.x}% ${t.y}%${important};background-size:${sizeFor(t)}${important};background-repeat:no-repeat${important};`;
    }
    let css=`${f.css_selector}{${prop}:${next}${important};${extra}}`;
    const path=Array.isArray(f.at_rule_path)?f.at_rule_path:[];
    for(let i=path.length-1;i>=0;i--)css=`${path[i]}{${css}}`;
    if(st.textContent!==css)st.textContent=css;
    return true;
  }

  function applyPseudo(f,value,t){
    if(!f.pseudo||!f.node_id)return;
    let st=document.querySelector(`style[data-template-authority-field="${esc(f.id)}"]`);
    if(!st){st=document.createElement('style');st.setAttribute('data-template-authority-field',f.id);document.head.appendChild(st)}
    const safe=String(value||'').replace(/\\/g,'\\\\').replace(/"/g,'\\"');
    const geometry=t?`;background-position:${t.x}% ${t.y}%!important;background-size:${sizeFor(t)}!important;background-repeat:no-repeat!important`:'';
    const next=`[data-native-node-id="${String(f.node_id).replace(/"/g,'\\"')}"]::${f.pseudo==='after'?'after':'before'}{background-image:${safe?`url("${safe}")`:'none'}!important${geometry}}`;
    if(st.textContent!==next)st.textContent=next;
  }

  function applyTransformNode(n,f,t){
    if(!n||!t)return;
    if(f.kind==='image'){
      const imgs=n.tagName==='IMG'?[n]:[...n.querySelectorAll?.('img')||[]];
      for(const img of imgs){
        img.style.objectPosition=`${t.x}% ${t.y}%`;
        img.style.transformOrigin=`${t.x}% ${t.y}%`;
        img.style.transform=`scale(${t.scale}) rotate(${t.rotate}deg)`;
        img.style.objectFit=t.fit==='fill'?'fill':t.fit;
      }
      return;
    }
    if(f.kind!=='background')return;
    n.style.setProperty('--native-bg-position',`${t.x}% ${t.y}%`);
    const pic=n.matches?.('[data-native-slide-bg]')?n:n.querySelector?.('[data-native-slide-bg]');
    if(pic){
      pic.style.backgroundPosition=`${t.x}% ${t.y}%`;
      pic.style.transformOrigin=`${t.x}% ${t.y}%`;
      pic.style.transform=`scale(${t.scale}) rotate(${t.rotate}deg)`;
      pic.style.backgroundSize=t.fit==='fill'?'100% 100%':t.fit;
      return;
    }
    n.style.backgroundPosition=`${t.x}% ${t.y}%`;
    n.style.backgroundSize=sizeFor(t);
    if(Math.abs(t.scale-1)>=.001)n.style.backgroundRepeat='no-repeat';
  }

  function syncSlideshow(f,value,nodes,t){
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
      const target=slides[idx]||((slides.length===1)?slides[0]:null);
      if(target){setBgImage(target,value,true);applyTransformNode(target,f,t)}
      const host=root.parentElement?.closest?.('[data-settings]')||root.parentElement;
      if(host?.hasAttribute?.('data-settings'))syncSettings(host,f,value);
      touched=true;
    }
    return touched;
  }

  function applyField(f){
    const value=String(values[f.id]??f.value??''),nodes=directNodes(f),t=transformOf(f);
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
        applyTransformNode(n,f,t);
      }
      return;
    }
    if(f.kind==='background'){
      if(f.source_location==='external-css'&&f.css_selector){applyExternalCss(f,value,t);return}
      if(f.media_role==='pseudo-background'){applyPseudo(f,value,t);return}
      const slideshow=f.media_role==='slideshow'||Number.isInteger(Number(f.slide_index));
      if(slideshow){
        for(const n of nodes)syncSettings(n,f,value);
        syncSlideshow(f,value,nodes,t);
        return;
      }
      for(const n of nodes){
        setBgImage(n,value,true);
        syncSettings(n,f,value);
        applyTransformNode(n,f,t);
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
      document.documentElement.dataset.snapshotGeometry='editor-transform-authority';
    }finally{busy=false}
  }
  function schedule(){if(busy||raf)return;raf=requestAnimationFrame(()=>{raf=0;applyAll()})}
  function install(){
    applyAll();
    [100,320,900,2200,5200].forEach(ms=>setTimeout(applyAll,ms));
    addEventListener('resize',schedule,{passive:true});
    if(persistent){
      observer?.disconnect();
      observer=new MutationObserver(schedule);
      observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','style','src','srcset','href','data-thumbnail','data-settings','data-native-slideshow-urls']});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
