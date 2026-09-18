(() => {
  const $=s=>document.querySelector(s);
  const source=$('#sourceInput'), analyzeBtn=$('#analyzeBtn'), buildBtn=$('#buildBtn'), previewBtn=$('#previewBtn'), downloadBtn=$('#downloadBtn');
  const clone=v=>structuredClone(v);
  let analysis=null, rebuild=null, sourceBaseUrl='';


  // V1.1.3 — premium action feedback / toast system
  function ensureFeedbackUI(){
    if(!document.querySelector('#studioToastStack')){
      const stack=document.createElement('div');stack.id='studioToastStack';stack.className='toast-stack';stack.setAttribute('aria-live','polite');document.body.appendChild(stack);
    }
    if(!document.querySelector('#actionProgress')){
      const box=document.createElement('div');box.id='actionProgress';box.className='action-progress';box.innerHTML='<span class="action-spinner"></span><div><strong id="actionProgressTitle">Memproses…</strong><small id="actionProgressDetail">Mohon tunggu</small></div>';
      document.querySelector('.source-actions')?.insertAdjacentElement('afterend',box);
    }
  }
  function toast(message,type='success',title=''){
    ensureFeedbackUI();
    const stack=document.querySelector('#studioToastStack');
    const item=document.createElement('div');
    item.className='studio-toast '+type;
    const icon=type==='success'?'✓':type==='error'?'!':type==='loading'?'◌':'i';
    item.innerHTML=`<span class="toast-icon">${icon}</span><div><strong>${title||({success:'Sukses',error:'Gagal',loading:'Memproses',info:'Info'}[type]||'Info')}</strong><small>${message}</small></div>`;
    stack.appendChild(item);
    requestAnimationFrame(()=>item.classList.add('show'));
    if(type!=='loading') setTimeout(()=>{item.classList.remove('show');setTimeout(()=>item.remove(),280)},3200);
    return item;
  }
  function finishToast(el,message,type='success',title=''){
    if(!el)return toast(message,type,title);
    el.className='studio-toast '+type+' show';
    const icon=type==='success'?'✓':type==='error'?'!':'i';
    el.innerHTML=`<span class="toast-icon">${icon}</span><div><strong>${title||(type==='success'?'Sukses':'Gagal')}</strong><small>${message}</small></div>`;
    setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),280)},3200);
  }
  function setProgress(show,title='',detail=''){
    ensureFeedbackUI();const box=document.querySelector('#actionProgress');if(!box)return;
    box.classList.toggle('show',!!show);
    if(title) box.querySelector('#actionProgressTitle').textContent=title;
    if(detail) box.querySelector('#actionProgressDetail').textContent=detail;
  }
  function setBusy(btn,busy,label){
    if(!btn)return; if(busy){btn.dataset.oldText=btn.textContent;btn.disabled=true;btn.classList.add('is-loading');btn.innerHTML='<span class="btn-spinner"></span>'+label;}else{btn.disabled=false;btn.classList.remove('is-loading');btn.textContent=btn.dataset.oldText||label||btn.textContent;}
  }
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  ensureFeedbackUI();

  const cleanText=s=>String(s||'').replace(/\s+/g,' ').trim();
  const abs=(u,base='')=>{try{return new URL(u,base||location.href).href}catch{return u||''}};
  const decodeSettings=v=>{const ta=document.createElement('textarea');ta.innerHTML=v||'';return ta.value};
  const pickText=(texts,patterns)=>texts.find(t=>patterns.some(p=>p.test(t)))||'';
  const unique=a=>[...new Set(a.filter(Boolean))];
  const settingUrls=html=>unique([...html.matchAll(/https?:\\?\/\\?\/[^"'&<>\\\s]+/g)].map(m=>m[0].replaceAll('\\/','/')));

  function parse(html, baseOverride=''){
    const doc=new DOMParser().parseFromString(html,'text/html');
    const declaredBase=doc.querySelector('base')?.getAttribute('href') || '';
    const base=declaredBase ? abs(declaredBase, baseOverride) : baseOverride;
    const embeddedAudit=window.DiniEmbeddedDataDecoder?.materializeDocument?.(doc,{baseUrl:base||baseOverride||location.href})||null;
    const allText=unique([...doc.querySelectorAll('h1,h2,h3,h4,p,span,div,a,button,label')].map(el=>cleanText(el.textContent)).filter(t=>t.length>=2&&t.length<350));
    const imgs=unique([...doc.images].flatMap(img=>[img.getAttribute('src'),img.getAttribute('data-src'),img.getAttribute('data-lazy-src')]).filter(Boolean).map(u=>abs(u,base)));
    const bg=[]; const animations=[]; const settings=[];
    doc.querySelectorAll('[style],[data-settings]').forEach(el=>{
      const st=el.getAttribute('style')||'';
      for(const m of st.matchAll(/url\(["']?([^"')]+)["']?\)/g)) bg.push(abs(m[1],base));
      const raw=decodeSettings(el.getAttribute('data-settings')||'');
      if(raw){settings.push(raw);for(const m of raw.matchAll(/"(?:_?animation(?:_mobile)?|animation)"\s*:\s*"([^"]+)"/g)) if(m[1]&&m[1]!=='none')animations.push(m[1]);for(const m of raw.matchAll(/"url"\s*:\s*"([^"]+)"/g)) bg.push(abs(m[1].replaceAll('\\/','/'),base));}
    });
    const videos=unique([...doc.querySelectorAll('video,video source')].map(v=>v.getAttribute('src')).filter(Boolean).map(u=>abs(u,base)).concat(settingUrls(settings.join(' ')).filter(u=>/\.(mp4|webm|mov)(\?|$)/i.test(u))));
    const audios=unique([...doc.querySelectorAll('audio,audio source')].map(v=>v.getAttribute('src')).filter(Boolean).map(u=>abs(u,base)).concat(settingUrls(settings.join(' ')).filter(u=>/\.(mp3|m4a|ogg|wav)(\?|$)/i.test(u))));
    const links=unique([...doc.querySelectorAll('a[href]')].map(a=>a.href).filter(Boolean));
    const sections=[...doc.querySelectorAll('section,.elementor-top-section')];
    const forms=[...doc.querySelectorAll('form')];
    const customScripts=[...doc.scripts].filter(s=>!s.src&&!s.hasAttribute('data-dini-source-js-inert')&&cleanText(s.textContent).length>80).length;
    const externalScripts=[...doc.scripts].filter(s=>/^https?:/i.test(s.src)).map(s=>s.src);
    const canvas=doc.querySelectorAll('canvas').length;
    const iframes=doc.querySelectorAll('iframe').length;
    const elementor=!!doc.querySelector('.elementor,.elementor-section,[data-elementor-type]') || /elementor/i.test(html);
    const detected={sections:sections.length,texts:allText.length,images:imgs.length,backgrounds:unique(bg).length,videos:videos.length,audios:audios.length,links:links.length,forms:forms.length,animations:unique(animations).length,canvas,iframes,customScripts,externalScripts:externalScripts.length,elementor,embeddedCss:embeddedAudit?.counts?.css||0,embeddedJs:embeddedAudit?.counts?.javascript||0,embeddedBytes:embeddedAudit?.counts?.bytes||0};
    const unsupported=canvas+iframes+Math.min(customScripts,5);
    let parity=68;
    if(elementor) parity+=14;
    if(detected.images) parity+=4;if(detected.animations)parity+=4;if(detected.forms)parity+=3;if(detected.videos)parity+=3;
    parity=Math.max(25,Math.min(98,parity-unsupported*3));
    return {doc,html,baseUrl:base,allText,imgs,backgrounds:unique(bg),videos,audios,links,animations:unique(animations),detected,unsupported,parity,embeddedAudit};
  }


  async function fetchLinkedCss(html,base){
    const doc=new DOMParser().parseFromString(html,'text/html');
    const links=[...doc.querySelectorAll('link[rel~="stylesheet"][href]')]
      .map(l=>{try{return new URL(l.getAttribute('href'),base).href}catch{return''}}).filter(Boolean);
    const uniq=[...new Set(links)];
    // Elementor post CSS is the most important source of visual media (portraits/overlays/fixed layer rules).
    // Fetch it first, then a small set of Elementor/plugin stylesheets for additional CSS-bound assets.
    const ranked=uniq.sort((a,b)=>{
      const score=u=>(/\/post-\d+\.css(?:\?|$)/i.test(u)?100:/elementor/i.test(u)?50:/uploads\/elementor\/css/i.test(u)?45:0);
      return score(b)-score(a);
    }).slice(0,14);
    const out=[];
    for(const url of ranked){
      try{
        const r=await fetch('/api/fetch-asset?url='+encodeURIComponent(url)+'&offset=0&size=3000000',{cache:'no-store'});
        if(!r.ok)continue;
        const ct=(r.headers.get('content-type')||'').toLowerCase();
        if(ct&&!/css|text|octet-stream/.test(ct))continue;
        const text=await r.text();
        if(text&&/[{}]/.test(text))out.push({url,text});
      }catch(e){console.warn('CSS source fetch gagal',url,e)}
    }

    // V1.6.8 — deterministic Elementor post-CSS fallback.
    // The browser preview can load source images, but the server-side CSS fetch can fail on some hosts.
    // When that happens, use a bundled copy of a known source post CSS while preserving the ORIGINAL
    // stylesheet URL as the CSS base, so url(...) assets still resolve to the source exactly as authored.
    const postLinks=uniq.filter(u=>/\/post-(\d+)\.css(?:\?|$)/i.test(u));
    for(const originalUrl of postLinks){
      const m=originalUrl.match(/\/post-(\d+)\.css(?:\?|$)/i);
      const postId=m?.[1]; if(!postId)continue;
      if(out.some(x=>new URL(x.url,location.href).pathname.endsWith('/post-'+postId+'.css')))continue;
      try{
        const local=new URL('./source-fallbacks/post-'+postId+'.css',document.baseURI).href;
        const r=await fetch(local,{cache:'no-store'});
        if(!r.ok)continue;
        const text=await r.text();
        if(text&&/[{}]/.test(text)){
          out.unshift({url:originalUrl,text,local_fallback:true});
          console.info('SOURCE_POST_CSS_FALLBACK_OK',postId);
        }
      }catch(e){console.warn('Bundled post CSS fallback gagal',postId,e)}
    }
    return out;
  }

  // V2.26: legacy synthetic cover-decoration embedding removed permanently. Source ownership is authoritative.

  function sourceSlideshowGeometry(cssSources,elementId){
    const out={position:'',size:''};
    if(!elementId)return out;
    const idEsc=String(elementId).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const ruleRe=new RegExp('([^{}]*elementor-element-'+idEsc+'[^{}]*elementor-background-slideshow__slide__image[^{}]*)\\{([^{}]*)\\}','ig');
    const pick=(body,name)=>{const m=String(body||'').match(new RegExp(name+'\\s*:\\s*([^;{}]+)','i'));return m?m[1].trim():''};
    for(const src of (Array.isArray(cssSources)?cssSources:[])){
      const css=String(src?.text||'');let m;
      while((m=ruleRe.exec(css))){const body=m[2]||'';const pos=pick(body,'background-position');const size=pick(body,'background-size');if(pos)out.position=pos;if(size)out.size=size;}
    }
    return out;
  }

  function normalizeCssAssetUrlsV226(css,cssUrl,base){
    return String(css||'').replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/ig,(m,q,u)=>{
      const raw=String(u||'').trim();
      if(!raw||/^data:|^blob:|^#/.test(raw))return m;
      let absolute=raw;try{absolute=new URL(raw,cssUrl||base).href}catch{}
      return `url("${String(absolute).replaceAll('"','%22')}")`;
    });
  }

  function embedCriticalElementorCssV226(doc,cssSources,base){
    const picked=(Array.isArray(cssSources)?cssSources:[]).filter(src=>{
      const u=String(src?.url||'');
      return /\/uploads\/elementor\/css\/post-\d+\.css(?:\?|$)/i.test(u) || /\/post-\d+\.css(?:\?|$)/i.test(u);
    });
    doc.querySelectorAll('style[data-dini-critical-elementor-css]').forEach(n=>n.remove());
    let bytes=0,rules=0;
    for(const src of picked){
      const raw=String(src?.text||'');if(!raw.trim())continue;
      const normalized=normalizeCssAssetUrlsV226(raw,src?.url||base,base);
      const style=doc.createElement('style');
      style.setAttribute('data-dini-critical-elementor-css','v2.26');
      style.setAttribute('data-source-css',String(src?.url||''));
      style.textContent=`/* Dini Anif V2.26 — frozen source CSS: ${String(src?.url||'').replaceAll('*/','* /')} */\n${normalized}`;
      doc.head.appendChild(style);bytes+=normalized.length;rules+=(normalized.match(/\{/g)||[]).length;
    }
    return {version:'2.26',preserved:picked.length>0,stylesheets:picked.length,bytes,rules,reason:picked.length?'external-elementor-css-frozen-cascade-preserved':'no-post-css-found'};
  }

  // V2.26: legacy cssBoundBackgrounds removed; shared DiniVisualResolver is the single CSS ownership resolver.



  function describeElement(el, index){
    const rawSettings=decodeSettings(el.getAttribute('data-settings')||'');
    let settings={};try{settings=rawSettings?JSON.parse(rawSettings):{}}catch{}
    const texts=unique([...el.querySelectorAll('h1,h2,h3,h4,p,a,button,label')].map(n=>cleanText(n.textContent)).filter(Boolean)).slice(0,30);
    const images=unique([...el.querySelectorAll('img')].flatMap(img=>[img.getAttribute('src'),img.getAttribute('data-src'),img.getAttribute('data-lazy-src')]).filter(Boolean).map(u=>abs(u,sourceBaseUrl)));
    const backgrounds=[];
    const scan=[el,...el.querySelectorAll('[style],[data-settings]')];
    scan.forEach(node=>{
      const st=node.getAttribute?.('style')||'';
      for(const m of st.matchAll(/url\(["']?([^"')]+)["']?\)/g))backgrounds.push(abs(m[1],sourceBaseUrl));
      const raw=decodeSettings(node.getAttribute?.('data-settings')||'');
      for(const m of raw.matchAll(/"url"\s*:\s*"([^"]+)"/g))backgrounds.push(abs(m[1].replaceAll('\\/','/'),sourceBaseUrl));
    });
    const anim=[];
    scan.forEach(node=>{const raw=decodeSettings(node.getAttribute?.('data-settings')||'');for(const m of raw.matchAll(/"(?:_?animation(?:_mobile)?|animation)"\s*:\s*"([^"]+)"/g))if(m[1]&&m[1]!=='none')anim.push(m[1]);});
    const id=el.id||el.getAttribute('data-id')||`section-${index+1}`;
    const label=texts[0]||el.getAttribute('aria-label')||`Section ${index+1}`;
    return {index,id,label,texts,images,backgrounds:unique(backgrounds),animations:unique(anim),className:el.className||''};
  }

  function makeSourceNativeHtml(a){
    const doc=new DOMParser().parseFromString(a.html,'text/html');
    const base=a.baseUrl||sourceBaseUrl||location.href;
    const embeddedNativeAudit=window.DiniEmbeddedDataDecoder?.materializeDocument?.(doc,{baseUrl:base})||null;
    const cssSources=Array.isArray(a.linkedCss)?a.linkedCss:[]; // V1.7.8.1 hotfix: exact slideshow geometry uses fetched source CSS in this scope.
    const nativeFields=[];
    const nativeSections=[];
    const topSections=[...doc.querySelectorAll('.elementor-top-section, body > section')];
    const fieldId=(kind,si,n)=>`s${String(si+1).padStart(2,'0')}-${kind}-${String(n+1).padStart(2,'0')}`;
    const short=s=>cleanText(s).slice(0,90);
    const sectionOf=node=>{
      let s=node.closest?.('.elementor-top-section, body > section');
      let i=topSections.indexOf(s); return i<0?0:i;
    };
    topSections.forEach((sec,si)=>{
      const title=short(sec.querySelector('h1,h2,h3,h4,p')?.textContent)||`Section ${si+1}`;
      nativeSections.push({id:sec.id||sec.getAttribute('data-id')||`section-${si+1}`,label:title,index:si,field_ids:[]});
    });
    let nativeNodeSeq=0;
    const addField=(node,kind,label,value,attr='',extra={})=>{
      const si=sectionOf(node), sec=nativeSections[si]||nativeSections[0];
      const seq=nativeFields.filter(f=>f.section_index===si&&f.kind===kind).length;
      const id=fieldId(kind,si,seq);
      if(!node.getAttribute('data-native-node-id'))node.setAttribute('data-native-node-id','n'+(++nativeNodeSeq));
      const ids=(node.getAttribute('data-native-edit-ids')||'').split(',').filter(Boolean);ids.push(id);
      node.setAttribute('data-native-edit-ids',ids.join(','));
      if(!node.getAttribute('data-native-edit-id'))node.setAttribute('data-native-edit-id',id);
      const f={id,section_index:si,section_id:sec?.id||`section-${si+1}`,kind,label,value:value??'',attribute:attr||null,node_id:node.getAttribute('data-native-node-id'),...extra};
      nativeFields.push(f); if(sec)sec.field_ids.push(id); return f;
    };
    // Text fields: use meaningful leaf text nodes only.
    [...doc.querySelectorAll('h1,h2,h3,h4,p,label,.elementor-button-text')].forEach(node=>{
      const v=cleanText(node.textContent); if(v&&v.length<900)addField(node,'text',short(v)||'Teks',v);
    });
    // Images and media.
    [...doc.querySelectorAll('img')].forEach((node,i)=>{const v=node.getAttribute('data-src')||node.getAttribute('data-lazy-src')||node.getAttribute('src')||'';addField(node,'image',node.getAttribute('alt')||`Foto ${i+1}`,abs(v,base),'src',{media_role:'image'});});
    // Gallery hydration + action-hash recovery. P1-C runtime owns source-specific layout/lightbox semantics.
    // Elementor gallery can hide the real file URL inside data-e-action-hash while data-thumbnail
    // is only a transparent 1x1 placeholder. Recover the authored URL and bind each item by index.
    const galleryPlaceholder=u=>{
      const x=String(u||'').trim();
      return !x || x==='#' || /^javascript:/i.test(x) || /^data:image\/(?:gif|svg\+xml)/i.test(x);
    };
    const galleryActionUrl=parent=>{
      const hash=parent?.getAttribute?.('data-e-action-hash')||'';if(!hash)return '';
      try{
        const dec=decodeURIComponent(hash.replace(/^#/,''));
        const m=dec.match(/(?:^|&)settings=([^&]+)/);if(!m)return '';
        let raw=decodeURIComponent(m[1]);
        raw=raw.replace(/-/g,'+').replace(/_/g,'/');while(raw.length%4)raw+='=';
        const json=atob(raw);const cfg=JSON.parse(json);return cfg?.url||'';
      }catch{return ''}
    };
    const galleryNodes=[...doc.querySelectorAll('.e-gallery-image, .elementor-gallery-item__image')];
    galleryNodes.forEach((node,i)=>{
      const parent=node.closest?.('a.e-gallery-item,a.elementor-gallery-item');
      const thumb=node.getAttribute('data-thumbnail')||'';const href=parent?.getAttribute('href')||'';
      const raw=!galleryPlaceholder(thumb)?thumb:(!galleryPlaceholder(href)?href:galleryActionUrl(parent));
      if(!raw)return;
      const v=abs(String(raw).replaceAll('\\/','/'),base);
      node.setAttribute('data-native-gallery-image','1');node.setAttribute('data-native-gallery-index',String(i));
      parent?.setAttribute('data-native-gallery-item','1');parent?.setAttribute('data-native-gallery-index',String(i));
      node.setAttribute('data-thumbnail',v);if(parent)parent.setAttribute('href',v);
      node.style.setProperty('background-image',`url("${v.replaceAll('"','%22')}")`,'important');
      node.style.setProperty('background-repeat','no-repeat','important');
      node.style.setProperty('background-position','center center','important');
      node.style.setProperty('background-size','cover','important');
      const gw=Number(node.getAttribute('data-width')||0),gh=Number(node.getAttribute('data-height')||0);if(gw>0&&gh>0)node.style.setProperty('--native-gallery-ratio',`${gw}/${gh}`);
      const f=addField(node,'background',`Foto Galeri ${i+1}`,v,'style.backgroundImage',{media_role:'gallery',gallery_index:i});
      if(parent){const ids=(parent.getAttribute('data-native-media-proxy')||'').split(/[\s,]+/).filter(Boolean);if(!ids.includes(f.id))ids.push(f.id);parent.setAttribute('data-native-media-proxy',ids.join(','));}
    });
    // Elementor's gallery JS is intentionally stripped. Mark the root for a neutral static fallback;
    // P1-C applies source-authored grid/masonry/justified settings at runtime.
    [...doc.querySelectorAll('.elementor-gallery__container')].forEach(root=>{
      if(!root.querySelector('[data-native-gallery-item]'))return;root.setAttribute('data-native-gallery-root','1');
    });
    [...doc.querySelectorAll('video')].forEach((node,i)=>{let v=node.getAttribute('src')||node.querySelector('source')?.getAttribute('src')||'';if(!v){const host=node.closest('[data-settings]');const raw=decodeSettings(host?.getAttribute('data-settings')||'');let cfg={};try{cfg=raw?JSON.parse(raw):{}}catch{};v=cfg.background_video_link||cfg.background_video_url||cfg.video_url||'';}addField(node,'video',`Video ${i+1}`,abs(v,base),'src')});
    [...doc.querySelectorAll('audio')].forEach((node,i)=>{let v=node.getAttribute('src')||node.querySelector('source')?.getAttribute('src')||'';addField(node,'audio',`Audio ${i+1}`,abs(v,base),'src')});
    // URLs. Do not duplicate open invitation href="#" as a meaningful link.
    [...doc.querySelectorAll('a[href]')].forEach((node,i)=>{if(node.hasAttribute('data-native-gallery-item'))return;const v=node.getAttribute('href')||'';if(v&&v!=='#'&&!/^javascript:/i.test(v))addField(node,'url',short(node.textContent)||`Link ${i+1}`,abs(v,base),'href')});
    // Form placeholders.
    [...doc.querySelectorAll('input[placeholder],textarea[placeholder]')].forEach((node,i)=>addField(node,'placeholder',`Placeholder ${i+1}`,node.getAttribute('placeholder')||'','placeholder'));
    // Countdown/date targets exposed as one editable datetime source.
    [...doc.querySelectorAll('[data-date]')].forEach((node,i)=>{const v=node.getAttribute('data-date')||'';if(v)addField(node,'datetime',`Countdown / Tanggal ${i+1}`,v,'data-date',{media_role:'countdown'});});
    // Backgrounds & slideshow frames. Every slideshow image gets its own editable field.
    [...doc.querySelectorAll('[style],[data-settings]')].forEach((node,i)=>{
      if(node.hasAttribute('data-native-gallery-image'))return;
      const raw=decodeSettings(node.getAttribute('data-settings')||''); let cfg={};try{cfg=raw?JSON.parse(raw):{}}catch{};
      const gal=Array.isArray(cfg.background_slideshow_gallery)?cfg.background_slideshow_gallery:[];
      if(gal.length){
        gal.forEach((item,j)=>{const u=item?.url||'';if(u)addField(node,'background',`Slideshow ${j+1}`,abs(String(u).replaceAll('\\/','/'),base),'data-settings',{media_role:'slideshow',slide_index:j});});
        return;
      }
      // V2.26: non-slideshow backgrounds are mapped once by DiniVisualResolver below.
      // This avoids duplicate owner-level fields that could later promote a nested/widget-wrap background to the full cover.

    });
    // V1.5.3 — CSS-LINKED MEDIA MAPPING.
    // Elementor often stores real portrait photos only in post-<id>.css (especially .elementor-background-overlay),
    // so they are invisible to HTML/data-settings-only scanners. Promote those CSS assets to first-class editable fields.
    // V2.26: external CSS ownership is mapped ONLY by the shared Source Graph resolver below.
    // Shared Source Graph V3 keeps selector/cascade/media ownership without inline promotion.
    const criticalCssAudit=embedCriticalElementorCssV226(doc,a.linkedCss,base);

    // V2.23 — shared Universal Visual Source Resolver. Fetch and Editor now consume the same
    // visual vocabulary instead of maintaining separate one-off detectors.
    const resolvedVisuals=window.DiniVisualResolver?.discoverStatic(doc,{baseUrl:base,cssSources:a.linkedCss||[]})||[];
    // V2.26 Source Ownership Gate: only skip classic-background hydration when THIS exact Elementor
    // owner is proven to have an authored external-CSS visual rule. A global "post CSS exists" flag
    // is not enough and can hide data-settings-only backgrounds on unrelated elements.
    const sourceCssOwnedIds=new Set(resolvedVisuals.filter(v=>v.source_location==='external-css'&&v.element_id).map(v=>String(v.element_id)));
    const roleForType=t=>({classic:'classic-background','classic-css':'classic-background','css-background':'css-background','inline-background':'css-background','overlay':'css-overlay','pseudo':'pseudo-background','computed-background':'css-background','classic-runtime':'classic-background'}[t]||t);
    const fieldExists=(node,value,role,src)=>nativeFields.some(f=>{
      if(src?.source_key&&f.source_key===src.source_key)return true;
      return !src?.source_key&&f.node_id===node?.getAttribute?.('data-native-node-id')&&String(f.value||'')===String(value||'')&&(f.media_role===role||(!f.media_role&&role==='css-background'))&&String(f.pseudo||'')===String(src?.pseudo||'');
    });
    const hostFor=src=>src.element_id?doc.querySelector(`[data-id="${CSS.escape(src.element_id)}"],.elementor-element-${CSS.escape(src.element_id)}`):null;
    for(const src of resolvedVisuals){
      const host=hostFor(src),role=roleForType(src.type);
      if(['gradient','effect'].includes(src.type)){
        const node=src.element||host;if(!node)continue;
        if(nativeFields.some(f=>f.kind==='effect'&&f.node_id===node.getAttribute('data-native-node-id')&&f.media_role===src.type))continue;
        addField(node,'effect',src.label||`Visual Effect ${src.type}`,src.gradient||src.effect||src.type,'data-settings',{media_role:src.type,effect_type:src.effect||src.type,visual_source:true});
        continue;
      }
      if(src.type==='video-background'){
        let video=src.element?.querySelector?.('video.elementor-background-video-hosted,video')||host?.querySelector?.('video.elementor-background-video-hosted,video');
        if(!video&&src.element){video=doc.createElement('video');video.className='elementor-background-video-hosted';video.muted=true;video.setAttribute('muted','');video.setAttribute('playsinline','');src.element.prepend(video)}
        if(video&&!nativeFields.some(f=>f.kind==='video'&&f.node_id===video.getAttribute('data-native-node-id'))){video.setAttribute('src',src.url||'');addField(video,'video',src.label||'Video Background',src.url||'','src',{media_role:'video-background',source_element_id:src.element_id,play_once:!!src.play_once,play_mobile:!!src.play_mobile,visual_source:true})}
        continue;
      }
      if(!src.url||src.type==='image'||src.type==='slideshow')continue; // already first-class above
      let node=src.element||host;
      // Source Graph V3 resolves the exact selector target. Only fall back to Elementor heuristics when no target was resolved.
      if(!src.element&&src.type==='classic-css'&&host)node=host.querySelector(':scope > .elementor-widget-wrap,:scope > .elementor-element-populated')||host;
      if(src.type==='overlay'&&host&&(!node||!node.classList?.contains('elementor-background-overlay'))){
        let overlay=host.querySelector(':scope > .elementor-widget-wrap > .elementor-background-overlay,:scope > .elementor-element-populated > .elementor-background-overlay,:scope > .elementor-background-overlay')||host.querySelector('.elementor-background-overlay');
        if(!overlay){const wrap=host.querySelector(':scope > .elementor-widget-wrap,:scope > .elementor-element-populated')||host;overlay=doc.createElement('div');overlay.className='elementor-background-overlay';overlay.setAttribute('data-native-source-created-overlay','1');wrap.prepend(overlay)}
        node=overlay;
      }
      if(!node)continue;
      if(fieldExists(node,src.url,role,src))continue;
      const responsive=src.media_query?` · ${src.media_query}`:'';
      const smartLabel=(src.semantic_role==='base-background'?'Background Dasar':src.semantic_role==='cover-decoration'?'Dekor Cover':src.semantic_role==='cover-content-background'?'Background Konten Cover':src.label||'Visual Background')+responsive;
      const f=addField(node,'background',smartLabel,src.url,'style.backgroundImage',{media_role:role,pseudo:src.pseudo||'',background_layer:Number(src.background_layer||0),css_selector:src.css_selector||'',css_source:src.css_source||'',source_element_id:src.element_id||'',owner_selector:src.owner_selector||'',render_target:src.render_target||'',source_location:src.source_location||'',source_property:src.source_property||'',source_background_image:src.source_background_image||'',source_key:src.source_key||'',semantic_role:src.semantic_role||'',css_priority:src.css_priority||'',css_order:Number.isInteger(src.css_order)?src.css_order:null,css_specificity:src.css_specificity||'',css_specificity_score:Number(src.css_specificity_score||0),media_query:src.media_query||'',at_rule_path:Array.isArray(src.at_rule_path)?src.at_rule_path:[],visual_source:true});
      if(host&&host!==node){const ids=(host.getAttribute('data-native-media-proxy')||'').split(/[\s,]+/).filter(Boolean);if(!ids.includes(f.id))ids.push(f.id);host.setAttribute('data-native-media-proxy',ids.join(','));}
    }
    lastVisualManifest=window.DiniVisualResolver?.makeManifest(resolvedVisuals)||{version:2,sources:[]};
    lastSourceGraph=window.DiniVisualResolver?.makeSourceGraph(doc,{baseUrl:base,cssSources:a.linkedCss||[]})||{version:3,visuals:lastVisualManifest.sources,interactions:[]};
    lastCriticalCssAudit=criticalCssAudit;

    // V2.24 — NO VISUAL FLATTENING.
    // Do not synthesize a full-cover IMG/background fallback. The source graph and authored CSS
    // remain authoritative, so ornaments/backgrounds keep their original independent layers.

    // Normalize URL-bearing attributes so production export does not depend on <base>.
    doc.querySelectorAll('[src],[href],[poster],[data-src],[data-lazy-src]').forEach(el=>{
      for(const at of ['src','href','poster','data-src','data-lazy-src']){const v=el.getAttribute(at);if(!v||v.startsWith('#')||/^(data:|blob:|mailto:|tel:|javascript:)/i.test(v))continue;try{el.setAttribute(at,abs(v,base))}catch{}}
    });
    doc.querySelectorAll('[srcset]').forEach(el=>{const v=el.getAttribute('srcset')||'';el.setAttribute('srcset',v.split(',').map(part=>{const x=part.trim().split(/\s+/);if(x[0])x[0]=abs(x[0],base);return x.join(' ')}).join(', '));});
    // Force absolute URL resolution for every relative source asset.
    let baseEl=doc.querySelector('base');
    if(!baseEl){baseEl=doc.createElement('base');doc.head.prepend(baseEl)}
    baseEl.setAttribute('href',base);
    // Remove source-protection/runtime scripts only after Source Graph has captured authored interaction intent.
    window.DiniVisualResolver?.sanitizeRuntimeNoise(doc);
    doc.querySelectorAll('script').forEach(n=>n.remove());
    doc.querySelectorAll('*').forEach(el=>{
      [...el.attributes].forEach(at=>{if(/^on/i.test(at.name))el.removeAttribute(at.name)});
      if(el.tagName==='IMG'){const ds=el.getAttribute('data-src')||el.getAttribute('data-lazy-src');if(ds&&!el.getAttribute('src'))el.setAttribute('src',ds)}
      if(el.tagName==='SOURCE'){const ds=el.getAttribute('data-src');if(ds&&!el.getAttribute('src'))el.setAttribute('src',ds)}
    });
    // Hydrate Elementor hosted background videos from data-settings because source scripts are removed.
    doc.querySelectorAll('[data-settings]').forEach(el=>{
      const raw=decodeSettings(el.getAttribute('data-settings')||'');
      let cfg={}; try{cfg=raw?JSON.parse(raw):{}}catch{}
      const videoUrl=cfg.background_video_link||cfg.background_video_url||cfg.video_url||'';
      if(videoUrl){
        const video=el.querySelector('video.elementor-background-video-hosted, video');
        if(video){
          video.setAttribute('src',abs(videoUrl,base));
          video.setAttribute('playsinline','');
          video.setAttribute('muted','');
          video.muted=true;
          video.removeAttribute('autoplay');
          if(cfg.background_play_once==='yes') video.removeAttribute('loop');
        }
      }
    });
    // V1.4.4 — SOURCE FIXED-LAYER SCROLL parity.
    // Elementor normally creates .elementor-background-slideshow at runtime. The source CSS
    // (notably .tes .elementor-background-slideshow) pins that generated layer with position:fixed.
    // Rebuild the missing DOM layer instead of flattening the slideshow onto the host element.
    doc.querySelectorAll('[data-settings]').forEach(el=>{
      const raw=decodeSettings(el.getAttribute('data-settings')||'');
      let cfg={}; try{cfg=raw?JSON.parse(raw):{}}catch{}
      const gal=Array.isArray(cfg.background_slideshow_gallery)?cfg.background_slideshow_gallery:[];
      const bg=gal.length?(gal[0]?.url||''):(cfg.background_image?.url||'');
      if(!bg)return;
      const mode=cfg.background_background||'';
      const size=(cfg.background_size||cfg.background_slideshow_background_size||'cover').toString().replaceAll('_',' ');
      const pos=(cfg.background_position||cfg.background_slideshow_background_position||'center center').toString().replaceAll('_',' ');
      el.style.setProperty('--native-bg-size',size==='default'?'cover':size);
      el.style.setProperty('--native-bg-position',pos==='default'?'center center':pos);
      // V1.7.8 — exact source slideshow geometry. Elementor post CSS frequently stores
      // per-scene position/size on .elementor-background-slideshow__slide__image rather than data-settings.
      // Recover those declarations and mirror the ORIGINAL Elementor slide-image class so source CSS applies.
      const sourceElId=el.getAttribute('data-id')||((el.className||'').match(/elementor-element-([a-zA-Z0-9_-]+)/)||[])[1]||'';
      const sourceGeo=sourceSlideshowGeometry(cssSources,sourceElId);
      if(sourceGeo.size)el.style.setProperty('--native-bg-size',sourceGeo.size);
      if(sourceGeo.position)el.style.setProperty('--native-bg-position',sourceGeo.position);
      if(sourceGeo.position)el.setAttribute('data-native-source-bg-position',sourceGeo.position);
      if(sourceGeo.size)el.setAttribute('data-native-source-bg-size',sourceGeo.size);
      const sourceSlideshowHost = gal.length && (el.classList.contains('tes') || el.matches?.('.elementor-top-section.tes,.elementor-column.tes')); // V1.7.6: fixed-layer slideshow is source-proven only on .tes hosts
      if(sourceSlideshowHost){
        // Do not put the slideshow image on the scrolling host: that destroys the source fixed-layer effect.
        el.style.removeProperty('background-image');
        let layer=el.querySelector(':scope > .elementor-background-slideshow[data-native-slideshow]');
        if(!layer){
          layer=doc.createElement('div');
          layer.className='elementor-background-slideshow swiper';
          layer.setAttribute('data-native-slideshow','1');
          layer.setAttribute('aria-hidden','true');
          const wrap=doc.createElement('div');wrap.className='swiper-wrapper';
          const slide=doc.createElement('div');slide.className='swiper-slide';
          const pic=doc.createElement('div');pic.className='swiper-slide-bg elementor-background-slideshow__slide__image native-slideshow-bg';pic.setAttribute('data-native-slide-bg','1');
          slide.appendChild(pic);wrap.appendChild(slide);layer.appendChild(wrap);
          el.insertBefore(layer,el.firstChild);
        }
        const urls=(gal.length?gal.map(x=>x?.url).filter(Boolean):[bg]).map(x=>abs(String(x).replaceAll('\\/','/'),base));
        layer.setAttribute('data-native-slideshow-urls',JSON.stringify(urls));
        layer.setAttribute('data-native-slideshow-duration',String(Number(cfg.background_slideshow_slide_duration)||5000));
        layer.setAttribute('data-native-slideshow-transition',String(cfg.background_slideshow_slide_transition||'fade'));
        const pic=layer.querySelector('[data-native-slide-bg]');
        if(pic&&urls[0])pic.style.backgroundImage=`url("${urls[0].replaceAll('"','%22')}")`;
        el.setAttribute('data-native-slideshow-host','1');
      }else if(mode==='classic'&&sourceCssOwnedIds.has(sourceElId)){
        // Frozen post CSS owns THIS exact element's geometry. Do not promote this URL to the owner element.
        el.setAttribute('data-native-bg-authored-css','1');
        el.setAttribute('data-native-bg-owner-id',sourceElId);
      }else{
        const target=el.querySelector(':scope > .elementor-widget-wrap,:scope > .elementor-element-populated')||el;
        target.style.setProperty('background-image',`url("${abs(String(bg).replaceAll('\/','/'),base)}")`);
        target.setAttribute('data-native-bg-hydrated','1');
      }
    });

    const style=doc.createElement('style');
    style.textContent=`
html,body{margin:0;min-height:100%;}
/* V1.3.4: never globally resize source media. Source/Elementor CSS owns geometry. */
[data-native-reveal]{visibility:hidden}
[data-native-reveal].native-visible{visibility:visible!important}
[data-native-preserve-layout]{transform:none!important}
/* V1.4.3: source-native animation classes own movement/easing; no synthetic stack transforms. */
[data-native-open]{opacity:1!important;visibility:visible!important;pointer-events:auto!important;transform:none!important;position:relative;z-index:2147483000}
.native-cover-opening{pointer-events:none!important}.native-opened #cover{pointer-events:none}
/* Reconstructed Elementor slideshow background: direct parent background with source-like cover geometry. */
[data-native-bg-hydrated]{background-repeat:no-repeat!important;background-size:var(--native-bg-size,cover)!important;background-position:var(--native-bg-position,center center)!important}
/* V1.4.4: recreate Elementor's generated slideshow surface so source CSS can pin/clip it. */
.elementor-background-slideshow[data-native-slideshow]{pointer-events:none;overflow:hidden}
.elementor-background-slideshow[data-native-slideshow] .swiper-wrapper,
.elementor-background-slideshow[data-native-slideshow] .swiper-slide,
.elementor-background-slideshow[data-native-slideshow] .native-slideshow-bg,.elementor-background-slideshow[data-native-slideshow] .elementor-background-slideshow__slide__image{width:100%;height:100%}
.elementor-background-slideshow[data-native-slideshow] .native-slideshow-bg{background-repeat:no-repeat;background-size:var(--native-bg-size,cover);background-position:var(--native-bg-position,center center);transition:opacity .5s ease,transform 4s ease}
/* V1.5.7: never let a synthesized empty slideshow cover the invitation. Source CSS remains authoritative for fixed geometry. */
.elementor-background-slideshow[data-native-slideshow][data-native-empty="1"]{display:none!important}
[data-native-gallery-image]{background-repeat:no-repeat;background-position:center center;background-size:cover}
/* Neutral gallery fallback. P1-C source gallery adapter overrides layout from source settings. */
[data-native-gallery-root]:not([data-dini-gallery-ready]){display:grid!important;grid-template-columns:repeat(auto-fit,minmax(120px,1fr))!important;gap:10px!important;height:auto!important;align-items:stretch!important}
[data-native-gallery-root] > [data-native-gallery-item]{position:relative!important;inset:auto!important;width:auto!important;height:auto!important;min-width:0!important;overflow:hidden!important;display:block!important;grid-column:auto!important}
[data-native-gallery-root] [data-native-gallery-image]{position:relative!important;inset:auto!important;width:100%!important;height:auto!important;min-height:0!important;aspect-ratio:var(--native-gallery-ratio,1/1)!important}
[data-native-gallery-root] .elementor-gallery-item__overlay{position:absolute!important;inset:0!important}
@media(max-width:560px){[data-native-gallery-root]:not([data-dini-gallery-ready]){grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}}
`;
    doc.head.appendChild(style);
    // Mark source-defined animations using exact responsive ownership, including explicit "none".
    // Runtime V1.4+ consumes the semantic adapter plan; these attributes are deterministic fallback metadata.
    doc.querySelectorAll('[data-settings]').forEach(el=>{
      const raw=decodeSettings(el.getAttribute('data-settings')||'');
      let cfg={}; try{cfg=raw?JSON.parse(raw):{}}catch{}
      const has=(k)=>Object.prototype.hasOwnProperty.call(cfg,k);
      const pick=(a,b)=>has(a)?cfg[a]:(has(b)?cfg[b]:undefined);
      const desktop=pick('_animation','animation');
      const tablet=pick('_animation_tablet','animation_tablet');
      const mobile=pick('_animation_mobile','animation_mobile');
      const delayDesktop=pick('_animation_delay','animation_delay');
      const delayTablet=pick('_animation_delay_tablet','animation_delay_tablet');
      const delayMobile=pick('_animation_delay_mobile','animation_delay_mobile');
      const durationDesktop=pick('_animation_duration','animation_duration');
      const durationTablet=pick('_animation_duration_tablet','animation_duration_tablet');
      const durationMobile=pick('_animation_duration_mobile','animation_duration_mobile');
      const anyDefined=[desktop,tablet,mobile,delayDesktop,delayTablet,delayMobile,durationDesktop,durationTablet,durationMobile].some(v=>v!==undefined);
      if(!anyDefined)return;
      const fallback=[desktop,tablet,mobile].find(v=>v!==undefined&&String(v)!=='none'&&String(v)!=='')||'source-responsive';
      el.setAttribute('data-native-reveal',String(fallback));
      const set=(name,v)=>{if(v!==undefined)el.setAttribute(name,String(v))};
      set('data-native-animation',desktop);
      set('data-native-animation-tablet',tablet);
      set('data-native-animation-mobile',mobile);
      set('data-native-animation-delay',delayDesktop);
      set('data-native-animation-delay-tablet',delayTablet);
      set('data-native-animation-delay-mobile',delayMobile);
      set('data-native-animation-duration',durationDesktop);
      set('data-native-animation-duration-tablet',durationTablet);
      set('data-native-animation-duration-mobile',durationMobile);
      // Structural wrappers keep source geometry; only their authored animation state changes.
      if(el.matches('.elementor-top-section,.elementor-section,.elementor-container,.elementor-column,[class*="wdp-sticky-section"]'))
        el.setAttribute('data-native-preserve-layout','1');
    });
    // Mark likely invitation-open controls before serializing, so source CSS cannot keep them invisible.
    const openCandidates=[...doc.querySelectorAll('a,button,[role="button"],.elementor-widget-button')];
    const openControl=openCandidates.find(el=>/\b(buka\s+undangan|open\s+invitation|open\s+invitation)\b/i.test(cleanText(el.textContent||''))) || doc.querySelector('#tombolbuka,.tombolbuka');
    if(openControl){
      const clickable=openControl.matches('a,button,[role="button"]')?openControl:(openControl.querySelector('a,button,[role="button"]')||openControl);
      clickable.setAttribute('data-native-open','1');
      clickable.classList.remove('elementor-invisible');
      openControl.classList?.remove('elementor-invisible');
    }
    // V1.4.6 — deterministic Source-Native runtime parity.
    // The rebuilt document must NOT execute arbitrary source-page JS inside the Editor origin.
    // Source-Native already reconstructs the visual/runtime behavior below, so freeze only
    // executable source scripts while preserving inert JSON/template payloads.
    doc.querySelectorAll('script').forEach(sc=>{
      const type=String(sc.getAttribute('type')||'').trim().toLowerCase();
      const executable=!type||['text/javascript','application/javascript','module','text/ecmascript','application/ecmascript'].includes(type);
      if(executable)sc.remove();
    });
    const safe=doc.createElement('script');
    safe.setAttribute('data-dini-source-native-runtime','v1.4.6');
    const forceOpenStyle=doc.createElement('style');
    forceOpenStyle.setAttribute('data-native-open-visibility','1');
    forceOpenStyle.textContent=`
      [data-native-open],#tombolbuka,.tombolbuka,
      [data-native-open] *,#tombolbuka *,.tombolbuka *{
        opacity:1!important;visibility:visible!important;pointer-events:auto!important;
      }
      [data-native-open],#tombolbuka,.tombolbuka{
        transform:none!important;display:block!important;
      }
      .elementor-widget-button[data-native-open],
      #tombolbuka.elementor-widget-button,
      .tombolbuka.elementor-widget-button{
        opacity:1!important;visibility:visible!important;display:block!important;
      }
    `;
    doc.head.appendChild(forceOpenStyle);

    safe.textContent=`(()=>{
const norm=s=>(s||'').replace(/\\s+/g,' ').trim();
const all=[...document.querySelectorAll('a,button,[role="button"],.elementor-widget-button')];
let btn=document.querySelector('[data-native-open],#tombolbuka,.tombolbuka');
if(btn&&!btn.matches('a,button,[role="button"]'))btn=btn.querySelector('a,button,[role="button"]')||btn;
if(!btn)btn=all.find(el=>/\\b(buka\\s+undangan|open\\s+invitation)\\b/i.test(norm(el.textContent)));
let cover=null;
const revealNow=el=>{if(!el)return;const mobile=matchMedia('(max-width:767px)').matches;let name=(mobile?el.getAttribute('data-native-animation-mobile'):el.getAttribute('data-native-animation'))||el.getAttribute('data-native-reveal')||'';if(name==='none')name='';el.classList.remove('elementor-invisible');el.classList.add('native-visible');el.style.removeProperty('opacity');el.style.removeProperty('visibility');if(name&&!matchMedia('(prefers-reduced-motion: reduce)').matches){el.classList.add('animated',name);const d=Number(el.getAttribute('data-native-animation-delay')||0);if(d>0)el.style.animationDelay=d+'ms';}};
const activateSections=()=>{
 document.body.classList.remove('stop-scrolling','locked-section');
 document.documentElement.classList.add('native-opened');
 document.documentElement.style.setProperty('overflow-y','auto','important');
 document.documentElement.style.setProperty('overflow-x','hidden','important');
 document.documentElement.style.setProperty('height','auto','important');
 document.body.style.setProperty('overflow-y','auto','important');
 document.body.style.setProperty('overflow-x','hidden','important');
 document.body.style.setProperty('height','auto','important');
 document.body.style.setProperty('touch-action','pan-y','important');
 const secs=[...document.querySelectorAll('.elementor-top-section,body>section')];
 secs.forEach((s,i)=>{
   if(s===cover)return;
   s.hidden=false;s.removeAttribute('aria-hidden');
   const cs=getComputedStyle(s);
   if(cs.display==='none')s.style.setProperty('display','block','important');
   if(cs.visibility==='hidden')s.style.setProperty('visibility','visible','important');
   if(parseFloat(cs.opacity||'1')===0)s.style.setProperty('opacity','1','important');
 });
 // Motion text is intentionally released by the open timeline, not here.
 // Remove Elementor's script-controlled invisible state, but keep our observer-driven reveal.
 document.querySelectorAll('.elementor-invisible:not([data-native-reveal])').forEach(el=>el.classList.remove('elementor-invisible'));
 // Ensure the first content viewport cannot remain blank after the cover exits.
 const first=secs.find(s=>s!==cover&&getComputedStyle(s).display!=='none');
 if(first){first.querySelectorAll('[data-native-reveal]').forEach((el,i)=>{if(el.closest('.motionText,[class*="motionText"]'))return;setTimeout(()=>revealNow(el),Math.min(i,8)*110+80)});}
 // Recover widgets that source JS would normally initialize into visibility.
 document.querySelectorAll('.elementor-widget,.elementor-inner-section').forEach(el=>{
   const cs=getComputedStyle(el);
   if(cs.visibility==='hidden'&&!el.matches('[data-native-reveal]'))el.style.setProperty('visibility','visible','important');
 });
};
if(btn){
 btn.setAttribute('data-native-open','1');btn.classList.remove('elementor-invisible');
 cover=document.querySelector('#cover');
 if(!cover)cover=btn.closest('.elementor-top-section,section,[data-element_type="section"]');
 document.body.style.overflow='hidden';
 const open=ev=>{
   ev.preventDefault();ev.stopPropagation();
   activateSections();
   const motionTexts=[...document.querySelectorAll('.motionText,[class*="motionText"]')];
   motionTexts.forEach(el=>{el.style.setProperty('display','none','important');el.setAttribute('aria-hidden','true');});
   // Source parity: hosted motion video begins ~100ms after open.
   setTimeout(()=>document.querySelectorAll('video').forEach(v=>{if(v.getAttribute('src'))v.play?.().catch(()=>{})}),100);
   document.querySelectorAll('audio').forEach(a=>a.play?.().catch(()=>{}));
   // Source parity: motionText mounts at 3000ms.
   setTimeout(()=>motionTexts.forEach(el=>{el.style.setProperty('display','flex','important');el.removeAttribute('aria-hidden');}),3000);
   // Elementor-like delayed overlay reveal around 4.5s / 4.6s.
   setTimeout(()=>motionTexts.forEach(el=>el.querySelectorAll('[data-native-reveal],.delay-image').forEach((n,i)=>setTimeout(()=>revealNow(n),i*80))),4500);
   setTimeout(()=>motionTexts.forEach(el=>{const nodes=[...el.querySelectorAll('[data-native-reveal]')];if(nodes.length)revealNow(nodes[nodes.length-1]);}),4600);
   if(cover){
     cover.classList.add('native-cover-opening');
     cover.style.transition='opacity 1.5s ease,transform 1.5s ease';
     cover.style.opacity='0';cover.style.transform='translateY(-100%)';
     setTimeout(()=>{cover.style.setProperty('display','none','important');cover.setAttribute('aria-hidden','true');activateSections();
       // BUG-12/13: sections were hidden while runtime initialized. Re-hydrate post-open media + fixed slideshow after they become visible.
       try{hydrateRuntimeBackgroundGeometry()}catch{};
       setTimeout(()=>{try{hydrateRuntimeBackgroundGeometry()}catch{};document.querySelectorAll('.elementor-background-overlay,[data-native-slide-bg],img').forEach(n=>n.classList.remove('elementor-invisible'));},80);
       setTimeout(()=>{try{hydrateRuntimeBackgroundGeometry()}catch{}},500);
     },1500);
   }else {activateSections();try{hydrateRuntimeBackgroundGeometry()}catch{};setTimeout(()=>{try{hydrateRuntimeBackgroundGeometry()}catch{}},80)}
 };
 btn.addEventListener('click',open,{capture:true});
 btn.addEventListener('touchend',ev=>{if(ev.cancelable)ev.preventDefault();open(ev)},{passive:false,capture:true});
}
const hydrateRuntimeBackgroundGeometry=()=>{
 // V1.7.6: synthetic fixed slideshow layers may only live directly under source-proven .tes hosts.
 document.querySelectorAll('.elementor-background-slideshow[data-native-slideshow]').forEach(layer=>{const p=layer.parentElement;if(!p?.classList?.contains('tes'))layer.remove()});
 document.querySelectorAll('[data-settings]').forEach(el=>{
   let cfg={};try{cfg=JSON.parse((el.getAttribute('data-settings')||'').replaceAll('&quot;','"'))}catch{}
   const gal=Array.isArray(cfg.background_slideshow_gallery)?cfg.background_slideshow_gallery:[];
   const url=gal.length?(gal[0]?.url||''):(cfg.background_image?.url||'');
   if(!url)return;
   const mode=cfg.background_background||'';
   const size=String(cfg.background_size||cfg.background_slideshow_background_size||'cover').replaceAll('_',' ');
   const pos=String(cfg.background_position||cfg.background_slideshow_background_position||'center center').replaceAll('_',' ');
   el.style.setProperty('--native-bg-size',size==='default'?'cover':size);
   el.style.setProperty('--native-bg-position',pos==='default'?'center center':pos);
   const fixedHost=gal.length && (el.classList.contains('tes') || el.matches?.('.elementor-top-section.tes,.elementor-column.tes'));
   if(fixedHost){
     let layer=el.querySelector(':scope > .elementor-background-slideshow[data-native-slideshow]');
     if(!layer){
       layer=document.createElement('div');layer.className='elementor-background-slideshow swiper';layer.dataset.nativeSlideshow='1';layer.setAttribute('aria-hidden','true');
       layer.innerHTML='<div class=\"swiper-wrapper\"><div class=\"swiper-slide\"><div class=\"swiper-slide-bg elementor-background-slideshow__slide__image native-slideshow-bg\" data-native-slide-bg=\"1\"></div></div></div>';
       el.insertBefore(layer,el.firstChild);
     }
     const urls=(gal.length?gal.map(x=>x?.url).filter(Boolean):[url]);
     layer.dataset.nativeSlideshowUrls=JSON.stringify(urls);layer.dataset.nativeEmpty=urls.length?'0':'1';
     layer.dataset.nativeSlideshowDuration=String(Number(cfg.background_slideshow_slide_duration)||5000);
     const pic=layer.querySelector('[data-native-slide-bg]');if(pic){pic.classList.add('elementor-background-slideshow__slide__image');if(urls[0])pic.style.backgroundImage='url(\"'+String(urls[0]).replaceAll('\"','%22')+'\")';}
     // Keep the source-derived geometry captured during Analyze. Runtime data-settings defaults must not overwrite it.
     const sourcePos=el.getAttribute('data-native-source-bg-position');const sourceSize=el.getAttribute('data-native-source-bg-size');
     if(sourcePos)el.style.setProperty('--native-bg-position',sourcePos);if(sourceSize)el.style.setProperty('--native-bg-size',sourceSize);
     el.removeAttribute('data-native-bg-hydrated');el.style.removeProperty('background-image');el.setAttribute('data-native-slideshow-host','1');
   }else if(el.hasAttribute('data-native-bg-authored-css')){
     // Frozen source CSS already owns this layer; do not promote the URL to the owner element.
   }else{
     const target=el.querySelector(':scope > .elementor-widget-wrap,:scope > .elementor-element-populated')||el;
     target.setAttribute('data-native-bg-hydrated','1');if(!target.style.backgroundImage)target.style.backgroundImage='url(\"'+url+'\")';
   }
 });
 document.querySelectorAll('.elementor-background-slideshow[data-native-slideshow]').forEach(layer=>{
   if(layer.dataset.nativeCycle==='1')return;layer.dataset.nativeCycle='1';
   let urls=[];try{urls=JSON.parse(layer.dataset.nativeSlideshowUrls||'[]')}catch{};if(urls.length<2)return;
   let i=0;const pic=layer.querySelector('[data-native-slide-bg]');const ms=Math.max(1200,Number(layer.dataset.nativeSlideshowDuration)||5000);
   setInterval(()=>{if(!pic)return;i=(i+1)%urls.length;pic.style.opacity='0';setTimeout(()=>{pic.style.backgroundImage='url(\"'+String(urls[i]).replaceAll('\"','%22')+'\")';pic.style.opacity='1'},240)},ms);
 });
};
const preserveNativeGeometry=()=>{
 document.querySelectorAll('[data-native-reveal]').forEach(el=>{
   if(el.matches('.elementor-top-section,.elementor-section,.elementor-container,.elementor-column,[class*="wdp-sticky-section"]'))
     el.setAttribute('data-native-preserve-layout','1');
 });
};
hydrateRuntimeBackgroundGeometry();preserveNativeGeometry();
const startNativeCountdown=()=>{
 document.querySelectorAll('[data-date]').forEach(root=>{
   if(root.dataset.nativeCountdown==='1')return;root.dataset.nativeCountdown='1';
   const tick=()=>{const target=Date.parse(root.getAttribute('data-date')||'');if(!Number.isFinite(target))return;let left=Math.max(0,target-Date.now());const d=Math.floor(left/86400000);left-=d*86400000;const h=Math.floor(left/3600000);left-=h*3600000;const m=Math.floor(left/60000);left-=m*60000;const sec=Math.floor(left/1000);const put=(q,v)=>{const el=root.querySelector(q);if(el)el.textContent=String(v).padStart(2,'0')};put('[data-days]',d);put('[data-hours]',h);put('[data-minutes]',m);put('[data-seconds]',sec)};tick();setInterval(tick,1000);
 });
};
startNativeCountdown();
window.addEventListener('load',()=>{hydrateRuntimeBackgroundGeometry();preserveNativeGeometry();startNativeCountdown();},{once:true});
// Hard safety: once the cover is gone, scrolling must never remain locked.
setInterval(()=>{
  if(cover&&getComputedStyle(cover).display==='none'){
    document.body.classList.remove('stop-scrolling','locked-section');
    document.documentElement.style.setProperty('overflow-y','auto','important');
    document.body.style.setProperty('overflow-y','auto','important');
    document.body.style.setProperty('height','auto','important');
  }
},1000);
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){revealNow(e.target);io.unobserve(e.target)}}),{threshold:.12,rootMargin:'0px 0px -6%'});
document.querySelectorAll('[data-native-reveal]').forEach(el=>io.observe(el));
})();`;
    doc.body.appendChild(safe);
    window.DiniVisualResolver?.sanitizeIdentity(doc,{title:'Dini Anif — '+(doc.querySelector('h1,h2')?.textContent?.trim()||'Template'),favicon:'/assets/favicon.svg'});
    lastNativeSchema={version:5,mode:'source-native-dynamic',resolver:'dini-source-graph-v3',section_count:nativeSections.length,field_count:nativeFields.length,sections:nativeSections,fields:nativeFields};
    return '<!doctype html>\n'+doc.documentElement.outerHTML;
  }

  let lastNativeSchema=null;
  let lastVisualManifest={version:3,sources:[]};
  let lastSourceGraph={version:3,visuals:[],interactions:[]};
  let lastCriticalCssAudit={version:'2.26',preserved:false,stylesheets:0,bytes:0,rules:0,reason:'not-built'};
  let lastCoverDecorAudit=null;
  function sourceGraphAudit(graph){
    const v=Array.isArray(graph?.visuals)?graph.visuals:[];
    const external=v.filter(x=>x.source_location==='external-css');
    return {version:3,visuals:v.length,external_css_layers:external.length,responsive_layers:external.filter(x=>x.media_query).length,pseudo_layers:v.filter(x=>x.pseudo).length,overlay_layers:v.filter(x=>x.type==='overlay'||x.semantic_role==='cover-decoration').length,source_bound:external.filter(x=>x.source_key&&x.css_selector&&x.owner_selector).length,ambiguous_targets:external.filter(x=>Number(x.target_count||0)>1).length,policy:graph?.policy||{}};
  }
  function sourceNativeSchema(a){ return lastNativeSchema || {version:5,mode:'source-native-dynamic',section_count:0,sections:[],fields:[]}; }


  function mapToBlueprint(a){
    const d=clone(window.UNDANGAN_DEFAULTS);
    const t=a.allText;
    const names=pickText(t,[/\s&\s/,/\sdan\s/i]);
    const wedding=pickText(t,[/the wedding of/i,/wedding of/i]);
    const save=pickText(t,[/save the date/i]);
    const gallery=pickText(t,[/galeri|gallery/i]);
    const story=pickText(t,[/love story/i]);
    const gift=pickText(t,[/wedding gift|amplop|hadiah/i]);
    const rsvp=pickText(t,[/^rsvp$/i,/konfirmasi kehadiran/i]);
    const wish=pickText(t,[/ucapan|doa/i]);
    const thank=pickText(t,[/terima kasih|thank you/i]);
    if(wedding){d.cover.eyebrow=wedding;d.motionHero.eyebrow=wedding.toUpperCase()}
    if(names){d.cover.couple_name=names;d.motionHero.names=names;d.closing.names=names}
    if(save)d.saveDate.title=save;if(gallery)d.galleryMeta.eyebrow=gallery;if(story)d.story.title=story;if(gift)d.gift.title=gift;if(rsvp)d.rsvp.title=rsvp;if(wish)d.wishes.eyebrow=wish;if(thank)d.closing.title=thank;
    const photos=a.imgs.filter(u=>!/(logo|icon|avatar|emoji|favicon)/i.test(u));
    if(photos[0])d.cover.photo=photos[0];
    if(photos[1])d.motionHero.photo=photos[1];
    if(photos[2])d.couple.person1.photo=photos[2];
    if(photos[3])d.couple.person2.photo=photos[3];
    d.gallery=Array.from({length:6},(_,i)=>photos[i+4]||photos[i%Math.max(1,photos.length)]||d.gallery[i]);
    const b=a.backgrounds;
    if(b[0])d.backgrounds.page=b[0];if(b[1])d.backgrounds.couple1=b[1];if(b[2])d.backgrounds.couple2=b[2];if(b[3])d.backgrounds.save=b[3];if(b[4])d.backgrounds.event=b[4];if(b[5])d.backgrounds.gallery=b[5];if(b[6])d.backgrounds.story=b[6];if(b[7])d.backgrounds.gift=b[7];if(b[8])d.backgrounds.rsvp=b[8];if(b[9])d.backgrounds.wishes=b[9];if(b[10])d.backgrounds.closing=b[10];if(b[0])d.backgrounds.decoration=b[0];
    if(a.videos[0])d.motionHero.video=a.videos[0];
    if(a.audios[0])d.media.music=a.audios[0];
    const insta=a.links.find(u=>/instagram\.com/i.test(u));if(insta){d.couple.person1.instagram=insta;d.brand.instagram=insta}
    const maps=a.links.filter(u=>/maps|goo\.gl/i.test(u));if(maps[0])d.event.akad.maps_url=maps[0];if(maps[1])d.event.reception.maps_url=maps[1];
    const live=a.links.find(u=>/youtube|youtu\.be|instagram.*live|tiktok/i.test(u));if(live)d.live.url=live;
    return d;
  }

  function reportRows(a){
    const D=a.detected;
    const rows=[['Framework',D.elementor?'Elementor / WordPress terdeteksi':'Generic HTML'],['Sections',D.sections],['Text nodes',D.texts],['Images',D.images],['Backgrounds',D.backgrounds],['Video',D.videos],['Music/Audio',D.audios],['Links',D.links],['Forms',D.forms],['Animations',D.animations],['Embedded CSS',D.embeddedCss||0],['Embedded JS (inert)',D.embeddedJs||0],['Canvas',D.canvas],['Iframes',D.iframes],['Custom scripts',D.customScripts]];
    $('#detectList').classList.remove('empty');$('#detectList').innerHTML=rows.map(([k,v])=>`<div class="detect-row"><b>${k}</b><span>${v}</span></div>`).join('');
  }
  function setAnalysis(a){
    analysis=a;const D=a.detected;
    $('#analysisStatus').textContent='Selesai';$('#analysisStatus').className='badge ok';
    $('#sourceBadge').textContent='Source terbaca';$('#sourceBadge').className='badge ok';
    $('#parityScore').textContent=a.parity+'%';$('#editableScore').textContent='100%';$('#dependencyScore').textContent=D.externalScripts?D.externalScripts+' external':'0 runtime*';$('#unsupportedScore').textContent=a.unsupported;
    reportRows(a);buildBtn.disabled=false;$('#studioMessage').textContent='Analysis selesai. Generate Rebuild untuk membuat snapshot editable.';
  }
  async function build(){
    if(!analysis)return;
    const data=mapToBlueprint(analysis); // compatibility payload for the legacy editor while native editor evolves
    const D=analysis.detected;
    let nativeHtml=makeSourceNativeHtml(analysis);
    // V2.24: source graph owns cover layers. No synthetic cover image/background embedding.
    lastCoverDecorAudit={version:'2.26',embedded:false,preserved:!!lastCriticalCssAudit?.preserved,bytes:lastCriticalCssAudit?.bytes||0,stylesheets:lastCriticalCssAudit?.stylesheets||0,rules:lastCriticalCssAudit?.rules||0,reason:lastCriticalCssAudit?.preserved?'source-graph-v3-css-cascade-preserved':'source-graph-no-flatten'};
    const nativeSchema=sourceNativeSchema(analysis);
    rebuild={
      manifest:{format:'dini-anif-rebuild-package',version:3,engine:'source-native-rebuild-v2.26-smart-source-ownership',created_at:new Date().toISOString(),invitation_id:(globalThis.crypto?.randomUUID?.()||('inv-'+Date.now()+'-'+Math.random().toString(36).slice(2))),template:'source-native',source_url:sourceBaseUrl||'',visual_manifest:lastVisualManifest,source_graph:lastSourceGraph,layout_topology:lastSourceGraph?.layout||null,semantic_diagnostics:lastSourceGraph?.semantic_diagnostics||null,embedded_data:analysis.embeddedAudit?.scan||null,identity_sanitized:true},
      schema:{editable_coverage:100,mode:'source-native',native:nativeSchema,legacy_groups:['cover','motionHero','couple','saveDate','event','live','gallery','story','gift','rsvp','wishes','closing','brand','media','backgrounds']},
      data,
      native:{html:nativeHtml,schema:nativeSchema,source_url:sourceBaseUrl||''},
      motion:{locked:true,source_animations:analysis.animations,baseline:'source-defined animations + safe observer'},
      report:{parity_score:analysis.parity,editable_coverage:100,unsupported_items:analysis.unsupported,detected:D,renderer:'source-native',cover_decor:lastCoverDecorAudit||null,source_graph_version:3,source_graph_audit:sourceGraphAudit(lastSourceGraph),layout_topology:lastSourceGraph?.layout||null,semantic_diagnostics:lastSourceGraph?.semantic_diagnostics||null,critical_css:lastCriticalCssAudit,embedded_data:analysis.embeddedAudit?.scan||null,flatten_visuals:false}
    };
    const snapshotRaw=JSON.stringify(rebuild);
    try{localStorage.setItem('diniAnifRebuildSnapshot',snapshotRaw)}catch(err){console.warn('localStorage snapshot quota',err)}
    try{sessionStorage.setItem('diniAnifRebuildSnapshot',snapshotRaw)}catch(err){console.warn('sessionStorage snapshot quota',err)}
    try{window.name='__DINI_ANIF_REBUILD__'+snapshotRaw}catch{}
    try{localStorage.setItem('diniAnifNativeHtml',nativeHtml);sessionStorage.setItem('diniAnifNativeHtml',nativeHtml)}catch{}
    localStorage.setItem('artSundaMerahPreview',JSON.stringify(data));
    sessionStorage.setItem('artSundaMerahPreview',JSON.stringify(data));
    $('#mappingBadge').textContent='Source Native';$('#mappingBadge').className='badge ok';
    $('#mappingTree').classList.remove('empty');
    const safeSections=Array.isArray(nativeSchema?.sections)?nativeSchema.sections:[];
    const safeFields=Array.isArray(nativeSchema?.fields)?nativeSchema.fields:[];
    const rows=safeSections.slice(0,18).map(sec=>{
      const si=Number.isInteger(sec?.index)?sec.index:0;
      const label=String(sec?.label||sec?.id||`Section ${si+1}`).replace(/[<>]/g,'');
      const sectionFields=safeFields.filter(f=>f&&f.section_index===si);
      const imageCount=sectionFields.filter(f=>f.kind==='image').length;
      const bgCount=sectionFields.filter(f=>f.kind==='background').length;
      const videoCount=sectionFields.filter(f=>f.kind==='video').length;
      const textCount=sectionFields.filter(f=>f.kind==='text').length;
      return `<div class="mapping-group"><strong>✓ ${label}</strong><small>${textCount} text · ${imageCount} image · ${bgCount} bg · ${videoCount} video</small></div>`;
    }).join('');
    $('#mappingTree').innerHTML=rows+(safeSections.length>18?`<div class="mapping-group"><strong>+ ${safeSections.length-18} section lainnya</strong><small>source-native mapping</small></div>`:'');
    previewBtn.classList.remove('disabled');downloadBtn.disabled=false;$('#studioMessage').textContent='Source-Native Rebuild siap ✓ · Source Graph V3 · Engine V2.26 · Runtime V1.4.6. Struktur dan visual berasal dari source yang sedang di-Fetch.';
  }

  async function packageBlob(){
    const raw=localStorage.getItem('diniAnifRebuildSnapshot');if(!raw)throw new Error('Belum ada rebuild snapshot.');
    const p=JSON.parse(raw);const entries=[
      {name:'manifest.json',data:JSON.stringify(p.manifest,null,2)},
      {name:'schema.json',data:JSON.stringify(p.schema,null,2)},
      {name:'data.json',data:JSON.stringify(p.data,null,2)},
      {name:'motion.json',data:JSON.stringify(p.motion,null,2)},
      {name:'source-report.json',data:JSON.stringify(p.report,null,2)},
      {name:'source-native.html',data:p.native?.html||''},
      {name:'native-schema.json',data:JSON.stringify(p.native?.schema||{},null,2)},
      {name:'visual-manifest.json',data:JSON.stringify(p.manifest?.visual_manifest||{version:2,sources:[]},null,2)},{name:'source-graph.json',data:JSON.stringify(p.manifest?.source_graph||{version:2,visuals:[],interactions:[]},null,2)},{name:'layout-topology.json',data:JSON.stringify(p.manifest?.layout_topology||p.manifest?.source_graph?.layout||{version:1,topology:'unclassified'},null,2)},{name:'behavior-adapters.json',data:JSON.stringify(p.manifest?.runtime_manifest?.behavior_adapters||p.manifest?.source_graph?.behavior_adapters||{},null,2)},{name:'semantic-components.json',data:JSON.stringify(p.manifest?.runtime_manifest?.semantic_components||p.manifest?.source_graph?.semantic_components||{},null,2)},{name:'semantic-diagnostics.json',data:JSON.stringify(p.manifest?.semantic_diagnostics||p.manifest?.source_graph?.semantic_diagnostics||{version:1,warnings:[],counts:{}},null,2)},{name:'embedded-data.json',data:JSON.stringify(p.manifest?.embedded_data||{version:1,resources:[],counts:{}},null,2)},
      {name:'README.txt',data:'DINI ANIF REBUILD PACKAGE V2.26 — SMART SOURCE OWNERSHIP\n\nBuka /dashboard-admin-edit untuk melanjutkan edit, atau import ZIP hasil Fetch secara manual.\nLayout/motion blueprint terkunci; konten dapat diedit setelah import.\n'}
    ];
    return window.UNDANGAN_ZIP.buildZip(entries);
  }
  async function download(){
    const t=toast('Menyiapkan rebuild package…','loading','Download ZIP');setBusy(downloadBtn,true,'Preparing ZIP…');
    try{const blob=await packageBlob();const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='dini-anif-rebuild-package.zip';a.click();setTimeout(()=>URL.revokeObjectURL(u),1500);finishToast(t,'Rebuild ZIP siap dan download dimulai.','success','ZIP siap')}
    catch(e){finishToast(t,e.message,'error','Download gagal')}
    finally{downloadBtn.disabled=false;downloadBtn.classList.remove('is-loading');downloadBtn.textContent='Download Rebuild ZIP'}
  }

  analyzeBtn.onclick=async()=>{
    const html=source.value.trim();
    if(!html){toast('Fetch, paste, atau upload source HTML dulu.','error','Source kosong');source.focus();return}
    const t=toast('Parsing HTML dan membaca struktur…','loading','Analyze Source');
    setBusy(analyzeBtn,true,'Analyzing…');
    setProgress(true,'Analyzing Source','Parsing HTML…');
    $('#analysisStatus').textContent='Analyzing…';$('#analysisStatus').className='badge neutral pulse';
    try{
      await sleep(180);setProgress(true,'Analyzing Source','Detecting Elementor / framework…');
      const a=parse(html,sourceBaseUrl);
      setProgress(true,'Analyzing Source','Fetching Elementor post CSS & CSS-bound photos…');
      a.linkedCss=await fetchLinkedCss(html,a.baseUrl||sourceBaseUrl||location.href);
      if(a.linkedCss.length){
        const cssUrls=[];for(const src of a.linkedCss){for(const m of String(src.text||'').matchAll(/url\(\s*(["']?)([^"')]+)\1\s*\)/ig)){const u=m[2];if(!u||/^data:/i.test(u))continue;try{cssUrls.push(new URL(u,src.url).href)}catch{}}}
        a.backgrounds=unique([...(a.backgrounds||[]),...cssUrls.filter(u=>/\.(?:png|jpe?g|webp|gif|svg|avif)(?:\?|$)/i.test(u))]);
        a.detected.backgrounds=a.backgrounds.length;
        a.detected.linkedCss=a.linkedCss.length;
      }
      a.visualSources=window.DiniVisualResolver?.discoverStatic(a.doc,{baseUrl:a.baseUrl||sourceBaseUrl||location.href,cssSources:a.linkedCss||[]})||[];
      const visualImages=a.visualSources.filter(x=>['image','classic','classic-css','css-background','inline-background','overlay','pseudo','slideshow'].includes(x.type)&&x.url).map(x=>x.url);
      const visualVideos=a.visualSources.filter(x=>x.type==='video-background'&&x.url).map(x=>x.url);
      a.backgrounds=unique([...(a.backgrounds||[]),...visualImages]);
      a.videos=unique([...(a.videos||[]),...visualVideos]);
      a.detected.backgrounds=a.backgrounds.length;
      a.detected.videos=a.videos.length;
      a.detected.visualSources=a.visualSources.length;
      a.detected.visualEffects=a.visualSources.filter(x=>x.type==='effect'||x.type==='gradient').length;
      await sleep(160);setProgress(true,'Analyzing Source','Mapping images, backgrounds, media & forms…');
      await sleep(160);setProgress(true,'Analyzing Source','Reading animations & scripts…');
      setAnalysis(a);
      finishToast(t,`Analysis selesai • ${a.detected.sections} section • ${a.detected.images} image • ${a.detected.animations} animation`,'success','Analysis sukses');
      setProgress(false);
    }catch(e){console.error(e);$('#analysisStatus').textContent='Gagal';$('#analysisStatus').className='badge bad';finishToast(t,e.message,'error','Analysis gagal');setProgress(false)}
    finally{setBusy(analyzeBtn,false,'Analyze Source')}
  };
  buildBtn.onclick=async()=>{
    if(!analysis){toast('Analyze Source dulu sebelum Generate Rebuild.','error','Belum dianalisis');return}
    const t=toast('Menyusun editable snapshot…','loading','Generate Rebuild');setBusy(buildBtn,true,'Generating…');setProgress(true,'Generate Rebuild','Menyusun manifest & editable schema…');
    try{await sleep(220);await build();await sleep(140);const cd=rebuild?.report?.cover_decor||{},ga=rebuild?.report?.source_graph_audit||{};const cm=cd.preserved?(' • Source Graph V3: '+(ga.external_css_layers||0)+' CSS layer · '+(ga.responsive_layers||0)+' responsive · '+(ga.pseudo_layers||0)+' pseudo · cascade preserved'):(' • Source Graph warning: '+(cd.reason||'unknown'));finishToast(t,'Snapshot rebuild siap untuk Preview dan Download ZIP.'+cm,cd.preserved?'success':'info','Rebuild selesai');setProgress(false)}catch(e){console.error(e);finishToast(t,e.message,'error','Generate gagal');setProgress(false)}finally{buildBtn.disabled=false;buildBtn.classList.remove('is-loading');buildBtn.textContent='Generate Rebuild'}
  };
  downloadBtn.onclick=download;
  function encodeSnapshotForUrl(raw){
    const bytes=new TextEncoder().encode(raw);
    let binary='';
    const chunk=0x8000;
    for(let i=0;i<bytes.length;i+=chunk) binary+=String.fromCharCode(...bytes.subarray(i,i+chunk));
    return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  function currentSnapshotRaw(){
    if(rebuild){try{return JSON.stringify(rebuild)}catch{}}
    try{const v=localStorage.getItem('diniAnifRebuildSnapshot');if(v)return v}catch{}
    try{const v=sessionStorage.getItem('diniAnifRebuildSnapshot');if(v)return v}catch{}
    if(typeof window.name==='string'&&window.name.startsWith('__DINI_ANIF_REBUILD__')) return window.name.slice('__DINI_ANIF_REBUILD__'.length);
    return '';
  }
  function persistPreviewHandoff(raw){
    let saved=0;
    try{localStorage.setItem('diniAnifRebuildSnapshot',raw);saved++}catch(err){console.warn('localStorage handoff failed',err)}
    try{sessionStorage.setItem('diniAnifRebuildSnapshot',raw);saved++}catch(err){console.warn('sessionStorage handoff failed',err)}
    try{window.name='__DINI_ANIF_REBUILD__'+raw;saved++}catch(err){console.warn('window.name handoff failed',err)}
    return saved;
  }
  async function publishPreviewSnapshot(raw){
    const response=await fetch('/api/preview-save',{
      method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify({snapshot:raw})
    });
    const result=await response.json().catch(()=>({ok:false,error:'Response preview backend tidak valid.'}));
    if(!response.ok||!result.ok) throw new Error(result.error||('HTTP '+response.status));
    return result;
  }
  async function openPreview(e){
    if(e)e.preventDefault();
    const raw=currentSnapshotRaw();
    if(!raw){toast('Klik Generate Rebuild dulu sebelum Preview.','error','Belum ada snapshot');return;}
    const saved=persistPreviewHandoff(raw);
    const t=toast('Mempublish snapshot agar preview bisa dibuka dari Incognito/HP lain…','loading','Publishing Preview');
    try{
      const published=await publishPreviewSnapshot(raw);
      finishToast(t,`Preview publik siap • ID ${published.id}`,'success','Shareable Preview siap');
      location.assign('./preview.html?id='+encodeURIComponent(published.id));
      return;
    }catch(err){
      console.warn('Server preview unavailable, fallback to browser handoff:',err);
      let target='./preview.html#handoff=storage';
      if(raw.length<90000){const payload=encodeSnapshotForUrl(raw);target='./preview.html#snapshot='+payload;}
      finishToast(t,`Backend preview belum aktif (${err.message}). Memakai fallback browser ${saved}/3.`,'info','Preview lokal');
      setTimeout(()=>location.assign(target),260);
    }
  }
  previewBtn.addEventListener('click',openPreview);
  const previewNavBtn=document.getElementById('previewNavBtn');
  if(previewNavBtn)previewNavBtn.addEventListener('click',openPreview);
  $('#uploadHtmlBtn').onclick=()=>$('#htmlFileInput').click();
  $('#htmlFileInput').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;const t=toast('Membaca file HTML…','loading','Upload HTML');try{source.value=await f.text();sourceBaseUrl='';$('#sourceUrl').value='';$('#fetchMeta').textContent='';$('#sourceBadge').textContent=f.name;$('#sourceBadge').className='badge ok';finishToast(t,f.name+' berhasil dimuat.','success','Upload sukses')}catch(err){finishToast(t,err.message,'error','Upload gagal')}};
  $('#clearBtn').onclick=()=>{source.value='';sourceBaseUrl='';analysis=null;rebuild=null;localStorage.removeItem('diniAnifRebuildSnapshot');sessionStorage.removeItem('diniAnifRebuildSnapshot');localStorage.removeItem('artSundaMerahPreview');sessionStorage.removeItem('artSundaMerahPreview');window.name='';location.reload()};


  const fetchBtn=$('#fetchSourceBtn'), sourceUrl=$('#sourceUrl'), fetchMeta=$('#fetchMeta');
  async function fetchSource(){
    const target=sourceUrl.value.trim();
    if(!target){toast('Masukkan URL website terlebih dahulu.','error','URL kosong');sourceUrl.focus();return}
    const fetchToast=toast('Mengambil HTML melalui Vercel Function…','loading','Fetch Source');setBusy(fetchBtn,true,'Fetching…');fetchMeta.className='fetch-meta';fetchMeta.textContent='Mengambil source melalui Vercel proxy…';setProgress(true,'Fetch Source','Menghubungi website sumber…');
    try{
      const response=await fetch('/api/fetch-source?url='+encodeURIComponent(target),{headers:{Accept:'application/json'}});
      const result=await response.json().catch(()=>({ok:false,error:'Response proxy tidak valid.'}));
      if(!response.ok||!result.ok)throw new Error(result.error||('HTTP '+response.status));
      source.value=result.html||'';sourceBaseUrl=result.url||target;sourceUrl.value=sourceBaseUrl;
      $('#sourceBadge').textContent='URL source terbaca';$('#sourceBadge').className='badge ok';
      const kb=Math.max(1,Math.round((result.bytes||source.value.length)/1024));
      fetchMeta.className='fetch-meta ok';fetchMeta.textContent=`✅ Source berhasil diambil • ${kb.toLocaleString('id-ID')} KB • ${result.contentType||'HTML'}`;setProgress(true,'Fetch Source','Source diterima. Menjalankan auto-analysis…');
      const autoAnalysis=parse(source.value,sourceBaseUrl);setAnalysis(autoAnalysis);finishToast(fetchToast,`Source berhasil • ${kb.toLocaleString('id-ID')} KB • auto-analysis selesai`,'success','Fetch sukses');setProgress(false);
    }catch(e){console.error(e);fetchMeta.className='fetch-meta error';fetchMeta.textContent='❌ '+e.message;finishToast(fetchToast,e.message,'error','Fetch gagal');setProgress(false)}
    finally{fetchBtn.disabled=false;fetchBtn.classList.remove('is-loading');fetchBtn.textContent='Fetch Source'}
  }
  fetchBtn.onclick=fetchSource;
  sourceUrl.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();fetchSource()}});

  const existing=localStorage.getItem('diniAnifRebuildSnapshot');
  if(existing){try{rebuild=JSON.parse(existing);localStorage.setItem('artSundaMerahPreview',JSON.stringify(rebuild.data));previewBtn.classList.remove('disabled');downloadBtn.disabled=false;$('#mappingBadge').textContent='Snapshot tersedia';$('#mappingBadge').className='badge ok';$('#studioMessage').textContent='Ada rebuild snapshot sebelumnya. Preview/Download siap digunakan.'}catch{}}
  window.DINI_ANIF_STUDIO={packageBlob};
})();
