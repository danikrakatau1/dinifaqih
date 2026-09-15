(()=>{
  'use strict';
  if(window.__DINI_MEDIA_SOURCE_PARITY_V1__)return;
  window.__DINI_MEDIA_SOURCE_PARITY_V1__=true;

  const VERSION='1.1.0';
  const deep=v=>JSON.parse(JSON.stringify(v??null));
  const safe=v=>String(v||'media').toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'')||'media';
  const split=v=>String(v||'').split(/[\s,]+/).filter(Boolean);
  const uniq=a=>[...new Set(a.filter(Boolean))];
  const IMAGE_ATTRS=['src','data-src','data-lazy-src','data-original','data-thumb','data-thumbnail','poster'];
  const OWN_ATTRS=['data-native-edit-id','data-native-edit-ids','data-native-media-proxy'];
  const DECORATIVE_RX=/(?:frame|ornament|hias|decora|overlay|mask|border|bingkai|wayang|floral|flower|gold|mahkota)/i;

  function fieldIds(node){if(!node)return[];return uniq(OWN_ATTRS.flatMap(a=>split(node.getAttribute?.(a)||'')))}
  function setToken(node,attr,id){if(!node||!id)return;node.setAttribute(attr,uniq([...split(node.getAttribute?.(attr)||''),id]).join(' '))}
  function removeToken(node,attr,id){
    if(!node||!id||!node.hasAttribute?.(attr))return;
    if(attr==='data-native-edit-id'){if(String(node.getAttribute(attr)||'')===id)node.removeAttribute(attr);return}
    const xs=split(node.getAttribute(attr)||'').filter(x=>x!==id);if(xs.length)node.setAttribute(attr,xs.join(' '));else node.removeAttribute(attr);
  }
  function stripRef(v){let s=String(v||'').trim();const u=s.match(/^url\((['"]?)(.*?)\1\)$/i);if(u)s=u[2];s=s.replace(/^['"]|['"]$/g,'');try{s=decodeURIComponent(s)}catch{}return s.split('#')[0].split('?')[0]}
  function baseName(v){const s=stripRef(v);return s.split('/').pop()||''}
  function refTokens(raw){const s=String(raw||'').trim();if(!s)return[];if(/\s+\d+(?:\.\d+)?[wx](?:\s*,|$)/i.test(s)||s.includes(','))return s.split(',').map(x=>x.trim().split(/\s+/)[0]).filter(Boolean);return[s]}
  function sameRef(raw,ref){
    const b=stripRef(ref);if(!b)return false;const bb=baseName(b);
    return refTokens(raw).some(token=>{const a=stripRef(token);if(!a)return false;if(a===b)return true;if(a.endsWith('/'+b)||b.endsWith('/'+a))return true;const ab=baseName(a);return !!bb&&bb.length>5&&ab===bb});
  }
  function nodeMatches(node,refs){
    if(!node)return false;
    for(const a of IMAGE_ATTRS)if(refs.some(r=>sameRef(node.getAttribute?.(a)||'',r)))return true;
    for(const a of ['srcset','data-srcset'])if(refs.some(r=>sameRef(node.getAttribute?.(a)||'',r)))return true;
    const style=String(node.getAttribute?.('style')||'');return !!style&&refs.some(r=>{const bn=baseName(r);return style.includes(String(r))||(bn&&style.includes(bn))});
  }
  function isDecorative(node){const sig=[node?.className||'',node?.id||'',node?.getAttribute?.('alt')||'',node?.getAttribute?.('title')||'',node?.getAttribute?.('data-elementor-lightbox-title')||''].join(' ');return DECORATIVE_RX.test(sig)}
  function oldRefsFor(f){return uniq([f?.pre_v2_saved_value,f?.source_value,f?.original_value,f?.source_url,f?.source_path,f?.value].map(v=>String(v??'')).filter(x=>x&&x!=='undefined'&&x!=='null'))}
  function ensureNodeId(node,f,index=0){let id=String(node?.getAttribute?.('data-native-node-id')||'').trim();if(!id){id=`dini-media-${safe(f.id)}-${index+1}`;node?.setAttribute?.('data-native-node-id',id)}return id}
  function ownedByOtherImage(node,f,schemaById){return fieldIds(node).some(id=>id!==f.id&&schemaById.get(id)?.kind==='image')}
  function sourceImages(root){if(!root)return[];if(root.matches?.('img'))return[root];return[...(root.querySelectorAll?.('img')||[])]}
  function pickExactTargets(marked,f,refs){
    const out=[],seen=new Set(),add=n=>{if(n&&!seen.has(n)){seen.add(n);out.push(n)}};
    for(const root of marked){
      if(root.matches?.('img')){add(root);continue}
      const imgs=sourceImages(root);if(!imgs.length)continue;
      const self=imgs.filter(img=>fieldIds(img).includes(f.id));let matched=self.length?self:imgs.filter(img=>nodeMatches(img,refs));
      if(matched.length>1){const nonDecor=matched.filter(img=>!isDecorative(img));if(nonDecor.length)matched=nonDecor}
      if(!matched.length&&imgs.length===1)matched=imgs;
      if(!matched.length&&imgs.length>1){const nonDecor=imgs.filter(img=>!isDecorative(img));if(nonDecor.length===1)matched=nonDecor}
      matched.forEach(add);
    }
    return out;
  }
  function restoreDecorativeIfPossible(root,current){
    if(!root)return 0;let count=0;
    for(const img of sourceImages(root)){
      if(!isDecorative(img))continue;
      const src=String(img.getAttribute('src')||img.getAttribute('data-src')||''),original=String(img.getAttribute('data-original')||'').trim();
      if(original&&current&&sameRef(src,current)&&!sameRef(original,current)){img.setAttribute('src',original);img.setAttribute('data-src',original);count++}
    }
    return count;
  }
  function setImageValue(img,value){if(!img)return;if(value){img.setAttribute('src',value);img.setAttribute('data-src',value)}else{img.removeAttribute('src');img.removeAttribute('data-src')}img.removeAttribute('srcset');img.removeAttribute('data-srcset');img.removeAttribute('data-lazy-src')}
  function replaceInlineRef(node,refs,value){
    if(!node)return false;let changed=false;
    for(const attr of ['style','data-thumbnail','data-thumb','poster']){const raw=String(node.getAttribute?.(attr)||'');if(!raw)continue;let next=raw;for(const r of refs)if(r)next=next.split(r).join(value);if(next!==raw){node.setAttribute(attr,next);changed=true}}
    return changed;
  }
  function sourceSettings(node){try{return JSON.parse(String(node?.getAttribute?.('data-settings')||'').replace(/&quot;/g,'"'))}catch{return{}}}

  function installSourceNativeRuntime(doc){
    if(!doc||doc.getElementById('dini-source-runtime-parity-v110'))return;

    const carousels=[...doc.querySelectorAll('.elementor-widget-image-carousel,[data-widget_type="image-carousel.default"]')];
    carousels.forEach((w,i)=>{
      const cfg=sourceSettings(w),root=w.querySelector('.elementor-image-carousel-wrapper'),track=root?.querySelector('.swiper-wrapper'),slides=track?[...track.children].filter(x=>x.classList?.contains('swiper-slide')):[];
      if(!root||!track||slides.length<2)return;
      w.setAttribute('data-dini-native-carousel','1');
      w.setAttribute('data-dini-carousel-index',String(i));
      w.setAttribute('data-dini-carousel-show-mobile',String(cfg.slides_to_show_mobile||cfg.slides_to_show||3));
      w.setAttribute('data-dini-carousel-scroll-mobile',String(cfg.slides_to_scroll_mobile||cfg.slides_to_scroll||1));
      w.setAttribute('data-dini-carousel-speed',String(cfg.speed||4000));
      w.setAttribute('data-dini-carousel-delay',String(cfg.autoplay_speed??3000));
      w.setAttribute('data-dini-carousel-autoplay',cfg.autoplay==='no'?'0':'1');
      w.setAttribute('data-dini-carousel-loop',cfg.infinite==='no'?'0':'1');
      w.setAttribute('data-dini-carousel-pause-hover',cfg.pause_on_hover==='no'?'0':'1');
      w.setAttribute('data-dini-carousel-pause-interaction',cfg.pause_on_interaction==='no'?'0':'1');
    });

    const timelines=[...doc.querySelectorAll('.elementor-widget-weddingpress-timeline,[data-widget_type="weddingpress-timeline.default"]')];
    timelines.forEach(w=>w.setAttribute('data-dini-native-timeline','1'));

    const videos=[...doc.querySelectorAll('.elementor-widget-video,[data-widget_type="video.default"]')];
    videos.forEach(w=>{
      const cfg=sourceSettings(w),url=String(cfg.youtube_url||cfg.vimeo_url||cfg.hosted_url?.url||'');
      if(!url)return;
      w.setAttribute('data-dini-native-video','1');
      w.setAttribute('data-dini-video-type',String(cfg.video_type||(/youtu/i.test(url)?'youtube':'')));
      w.setAttribute('data-dini-video-url',url);
      w.setAttribute('data-dini-video-autoplay',cfg.autoplay==='yes'?'1':'0');
      w.setAttribute('data-dini-video-mute',cfg.mute==='yes'?'1':'0');
      w.setAttribute('data-dini-video-loop',cfg.loop==='yes'?'1':'0');
    });

    const style=doc.createElement('style');
    style.id='dini-source-runtime-parity-v110';
    style.textContent=`
[data-dini-native-carousel="1"] .elementor-image-carousel-wrapper{overflow:hidden!important}
[data-dini-native-carousel="1"] .swiper-wrapper{display:flex!important;flex-wrap:nowrap!important;align-items:stretch;will-change:transform}
[data-dini-native-carousel="1"] .swiper-slide{flex:0 0 auto!important;min-width:0}
[data-dini-native-timeline="1"] .weddingpress-timeline-item-main,
[data-dini-native-timeline="1"] .weddingpress-timeline-line>span,
[data-dini-native-timeline="1"] .weddingpress-timeline-icon{will-change:transform,opacity}
[data-dini-native-video="1"] .elementor-wrapper{overflow:hidden}
[data-dini-native-video="1"] iframe[data-dini-youtube-runtime]{display:block;width:100%;height:100%;border:0}
`;
    (doc.head||doc.documentElement).appendChild(style);

    const runtime=doc.createElement('script');
    runtime.id='dini-source-runtime-parity-runtime-v110';
    runtime.textContent=`(()=>{
'use strict';
if(window.__DINI_SOURCE_RUNTIME_PARITY_V110__)return;
window.__DINI_SOURCE_RUNTIME_PARITY_V110__=true;
const clamp=v=>Math.max(0,Math.min(1,v));
const num=(v,d)=>{const n=Number(v);return Number.isFinite(n)?n:d};
const sourceCfg=el=>{try{return JSON.parse(String(el.getAttribute('data-settings')||'').replace(/&quot;/g,'"'))}catch{return{}}};
const youtubeId=raw=>{
  try{
    const u=new URL(String(raw||''),location.href),h=u.hostname.replace(/^www\\./,'');
    if(h==='youtu.be')return u.pathname.split('/').filter(Boolean)[0]||'';
    if(h.endsWith('youtube.com')){
      if(u.pathname.startsWith('/embed/'))return u.pathname.split('/')[2]||'';
      if(u.pathname.startsWith('/shorts/'))return u.pathname.split('/')[2]||'';
      return u.searchParams.get('v')||'';
    }
  }catch{}
  const m=String(raw||'').match(/(?:youtu\\.be\\/|youtube\\.com\\/(?:embed\\/|shorts\\/|watch\\?v=))([A-Za-z0-9_-]{6,})/);
  return m?.[1]||'';
};
function initVideos(){
  document.querySelectorAll('[data-dini-native-video="1"]').forEach(w=>{
    if(w.querySelector('iframe[data-dini-youtube-runtime]'))return;
    const cfg=sourceCfg(w),type=String(w.getAttribute('data-dini-video-type')||cfg.video_type||''),url=String(w.getAttribute('data-dini-video-url')||cfg.youtube_url||'');
    if(type!=='youtube'&&!/youtu/i.test(url))return;
    const id=youtubeId(url);if(!id)return;
    const host=w.querySelector('.elementor-video')||w.querySelector('.elementor-wrapper')||w.querySelector('.elementor-widget-container');if(!host)return;
    host.textContent='';
    const autoplay=w.getAttribute('data-dini-video-autoplay')==='1',mute=w.getAttribute('data-dini-video-mute')==='1',loop=w.getAttribute('data-dini-video-loop')==='1';
    const q=new URLSearchParams({playsinline:'1',rel:'0'});
    if(autoplay)q.set('autoplay','1');if(mute)q.set('mute','1');if(loop){q.set('loop','1');q.set('playlist',id)}
    const f=document.createElement('iframe');f.setAttribute('data-dini-youtube-runtime','1');f.src='https://www.youtube.com/embed/'+encodeURIComponent(id)+'?'+q.toString();f.title='YouTube video player';f.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';f.allowFullscreen=true;f.loading='eager';
    host.appendChild(f);
  });
}
function initCarousel(w){
  if(w.__diniCarousel)return;w.__diniCarousel=true;
  const root=w.querySelector('.elementor-image-carousel-wrapper'),track=root?.querySelector('.swiper-wrapper');if(!root||!track)return;
  const originals=[...track.children].filter(x=>x.classList.contains('swiper-slide')&&!x.hasAttribute('data-dini-carousel-clone'));if(originals.length<2)return;
  const show=()=>Math.max(1,Math.min(originals.length,Math.round(num(matchMedia('(max-width:767px)').matches?w.getAttribute('data-dini-carousel-show-mobile'):sourceCfg(w).slides_to_show,w.getAttribute('data-dini-carousel-show-mobile')||3))));
  const step=()=>Math.max(1,Math.round(num(w.getAttribute('data-dini-carousel-scroll-mobile'),1)));
  const speed=Math.max(250,num(w.getAttribute('data-dini-carousel-speed'),4000)),delay=Math.max(0,num(w.getAttribute('data-dini-carousel-delay'),3000));
  const autoplay=w.getAttribute('data-dini-carousel-autoplay')!=='0',loop=w.getAttribute('data-dini-carousel-loop')!=='0',pauseHover=w.getAttribute('data-dini-carousel-pause-hover')!=='0',pauseInteraction=w.getAttribute('data-dini-carousel-pause-interaction')!=='0';
  let index=0,timer=0,paused=false,per=show(),slideW=0;
  const clones=()=>[...track.querySelectorAll('[data-dini-carousel-clone]')];
  const clear=()=>{if(timer){clearTimeout(timer);timer=0}};
  const layout=()=>{
    clear();clones().forEach(n=>n.remove());per=show();slideW=(root.clientWidth||root.getBoundingClientRect().width||1)/per;
    originals.forEach(s=>{s.style.width=slideW+'px';s.style.flexBasis=slideW+'px'});
    if(loop)originals.slice(0,Math.max(per,step())).forEach(s=>{const c=s.cloneNode(true);c.setAttribute('data-dini-carousel-clone','1');c.setAttribute('aria-hidden','true');c.style.width=slideW+'px';c.style.flexBasis=slideW+'px';track.appendChild(c)});
    index=0;track.style.transition='none';track.style.transform='translate3d(0,0,0)';requestAnimationFrame(()=>schedule());
  };
  const schedule=()=>{clear();if(!autoplay||paused)return;timer=setTimeout(move,delay)};
  const move=()=>{
    if(paused||!autoplay)return schedule();
    index+=step();track.style.transition='transform '+speed+'ms linear';track.style.transform='translate3d('+(-index*slideW)+'px,0,0)';
  };
  track.addEventListener('transitionend',e=>{
    if(e.propertyName!=='transform')return;
    if(loop&&index>=originals.length){track.style.transition='none';index=index%originals.length;track.style.transform='translate3d('+(-index*slideW)+'px,0,0)';void track.offsetWidth}
    schedule();
  });
  if(pauseHover){root.addEventListener('mouseenter',()=>{paused=true;clear()});root.addEventListener('mouseleave',()=>{paused=false;schedule()})}
  if(pauseInteraction){root.addEventListener('pointerdown',()=>{paused=true;clear()},{passive:true});window.addEventListener('pointerup',()=>{paused=false;schedule()},{passive:true})}
  let rz=0;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(layout,120)},{passive:true});
  layout();
}
function initCarousels(){document.querySelectorAll('[data-dini-native-carousel="1"]').forEach(initCarousel)}
let timelineRAF=0;
function updateTimelines(){
  timelineRAF=0;const vh=Math.max(1,innerHeight||document.documentElement.clientHeight||1);
  document.querySelectorAll('[data-dini-native-timeline="1"]').forEach(w=>{
    w.querySelectorAll('.weddingpress-timeline-item-main[bdt-parallax]').forEach(el=>{
      const r=el.getBoundingClientRect(),p=clamp((vh-r.top)/(vh*.5));el.style.opacity=String(p);el.style.transform='translate3d('+((1-p)*200)+'px,0,0)';
    });
    w.querySelectorAll('.weddingpress-timeline-line>span[bdt-parallax]').forEach(el=>{
      const r=el.getBoundingClientRect(),p=clamp((vh-r.top)/(vh*.8));el.style.opacity=String(p);
    });
    w.querySelectorAll('.weddingpress-timeline-icon[bdt-scrollspy]').forEach(el=>{
      const r=el.getBoundingClientRect(),p=clamp((vh-r.top)/(vh*.35));el.style.opacity=String(p);el.style.transform='scale('+(.72+.28*p)+')';
      el.classList.toggle('bdt-animation-scale-up',p>.03);
    });
  });
}
const queueTimeline=()=>{if(!timelineRAF)timelineRAF=requestAnimationFrame(updateTimelines)};
function initTimelines(){
  addEventListener('scroll',queueTimeline,{passive:true});addEventListener('resize',queueTimeline,{passive:true});queueTimeline();
}
function boot(){initVideos();initCarousels();initTimelines()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();`;
    (doc.body||doc.documentElement).appendChild(runtime);
  }

  function augment(html,inputSchema,inputValues){
    const schema=deep(inputSchema||{});schema.fields=Array.isArray(schema.fields)?schema.fields:[];const values={...deep(inputValues||{})};
    const doc=new DOMParser().parseFromString(String(html||''),'text/html'),byId=new Map(schema.fields.map(f=>[String(f?.id||''),f]));
    let fieldsFixed=0,aliases=0,containersDetached=0,decorativeRecovered=0;

    for(const f of schema.fields){
      if(!f?.id||f.kind!=='image')continue;
      const current=String(values[f.id]??f.value??''),refs=oldRefsFor(f);
      const marked=[...doc.querySelectorAll('[data-native-edit-id],[data-native-edit-ids],[data-native-media-proxy],[data-native-node-id]')].filter(n=>fieldIds(n).includes(f.id)||String(n.getAttribute('data-native-node-id')||'')===String(f.node_id||''));
      marked.forEach(n=>{decorativeRecovered+=restoreDecorativeIfPossible(n,current)});
      let targets=pickExactTargets(marked,f,refs);

      if(!targets.length){
        const global=[...doc.querySelectorAll('img')].filter(img=>nodeMatches(img,refs)&&!ownedByOtherImage(img,f,byId));
        if(global.length){const nonDecor=global.filter(img=>!isDecorative(img));targets=nonDecor.length?nonDecor:global.slice(0,1)}
      }
      if(!targets.length)continue;

      const primary=targets[0],oldNodeId=String(f.node_id||''),primaryId=ensureNodeId(primary,f,0);
      if(oldNodeId&&oldNodeId!==primaryId&&!f.source_container_node_id)f.source_container_node_id=oldNodeId;
      f.node_id=primaryId;f.media_owner='source-native-exact-image';f.media_parity_version=VERSION;

      for(const root of marked){
        if(root===primary||root.matches?.('img'))continue;
        if(sourceImages(root).length>1&&targets.some(t=>root.contains(t))){for(const attr of OWN_ATTRS)removeToken(root,attr,f.id);containersDetached++}
      }
      targets.forEach((img,i)=>{ensureNodeId(img,f,i);setToken(img,'data-native-edit-ids',f.id);img.setAttribute('data-dini-media-owner',f.id)});

      const aliasCandidates=[...doc.querySelectorAll('img')].filter(img=>!targets.includes(img)&&nodeMatches(img,refs)&&!ownedByOtherImage(img,f,byId)&&!isDecorative(img));
      for(const img of aliasCandidates){setToken(img,'data-native-edit-ids',f.id);setToken(img,'data-native-media-proxy',f.id);img.setAttribute('data-dini-media-alias-for',f.id);aliases++;targets.push(img)}

      for(const img of targets){
        if(current)setImageValue(img,current);
        const a=img.closest?.('a[href]');if(a&&refs.some(r=>sameRef(a.getAttribute('href')||'',r)))a.setAttribute('href',current||'#');
        const picture=img.closest?.('picture');if(picture)for(const s of picture.querySelectorAll('source'))if(refs.some(r=>sameRef(s.getAttribute('srcset')||'',r)))s.setAttribute('srcset',current||'');
      }
      for(const n of doc.querySelectorAll('[style*="background"],[data-thumbnail],[data-thumb]')){
        if(ownedByOtherImage(n,f,byId)||!nodeMatches(n,refs))continue;n.setAttribute('data-dini-media-alias-for',f.id);if(replaceInlineRef(n,refs,current))aliases++;
      }
      fieldsFixed++;
    }

    installSourceNativeRuntime(doc);
    doc.documentElement.setAttribute('data-dini-media-source-parity',VERSION);
    doc.documentElement.setAttribute('data-dini-source-runtime-parity',VERSION);
    return {html:'<!doctype html>\n'+doc.documentElement.outerHTML,schema,values,report:{version:VERSION,fields_fixed:fieldsFixed,aliases,containers_detached:containersDetached,decorative_recovered:decorativeRecovered,runtime_parity:true}};
  }
  function augmentSnapshot(input){const snap=deep(input||{});if(!snap?.schema||!(snap.html||snap.baseHtml))return snap;const out=augment(snap.html||snap.baseHtml||'',snap.schema,snap.values||{});snap.html=out.html;snap.baseHtml=out.html;snap.schema=out.schema;snap.values=out.values;snap.media_source_parity=out.report;return snap}

  function patchCanonical(){
    const C=window.DINI_TEMPLATE_CANONICAL_V1160;if(!C||C.__diniMediaSourceParityV1)return;const base=C.resolveSnapshot?.bind(C);if(typeof base!=='function')return;
    C.resolveSnapshot=input=>base(augmentSnapshot(input));C.augmentMediaSourceSnapshot=augmentSnapshot;C.__diniMediaSourceParityV1=VERSION;document.documentElement.dataset.mediaSourceCanonical=VERSION;
  }
  function patchFetch(){
    const E=window.DINI_FETCH_V2;if(!E||E.__diniMediaSourceParityV1)return;const baseLoad=E.loadOrCreateSession.bind(E),baseSave=E.saveSession.bind(E);const sourceBaseline=new WeakMap();
    E.loadOrCreateSession=async h=>{const session=await baseLoad(h);if(!session?.baseline)return session;const original=deep(session.baseline);sourceBaseline.set(session,original);if(!session.__diniSocialSourceBaseline&&!session.__diniMediaSourceBaseline){try{Object.defineProperty(session,'__diniMediaSourceBaseline',{value:original,writable:false,configurable:true,enumerable:false})}catch{}}const out=augment(session.baseline.html||'',session.baseline.schema||{},session.baseline.values||{});session.baseline.html=out.html;session.baseline.schema=out.schema;session.baseline.values=out.values;session.baseline.hash=E.baselineHash(out.html,out.schema);session.baseline.field_count=out.schema.fields.length;session.baseline.media_source_parity=out.report;return session};
    E.saveSession=async session=>{if(session?.__diniSocialSourceBaseline)return baseSave(session);const original=session?.__diniMediaSourceBaseline||sourceBaseline.get(session);if(!original)return baseSave(session);const persist=deep(session);persist.baseline=deep(original);const saved=await baseSave(persist);session.updated_at=saved?.updated_at||session.updated_at;return session};
    E.augmentMediaSourceSnapshot=augmentSnapshot;E.__diniMediaSourceParityV1=VERSION;document.documentElement.dataset.mediaSourceFetch=VERSION;
  }
  function syncFrameAliases(frame){
    if(!frame)return;const esc=v=>window.CSS?.escape?CSS.escape(String(v||'')):String(v||'').replace(/["\\]/g,'\\$&');
    const install=()=>{let doc;try{doc=frame.contentDocument}catch{return}if(!doc)return;const sync=id=>{if(!id)return;const owner=doc.querySelector(`[data-dini-media-owner="${esc(id)}"]`);if(!owner)return;const value=String(owner.getAttribute('src')||owner.getAttribute('data-src')||'');if(!value)return;for(const n of doc.querySelectorAll(`[data-dini-media-alias-for~="${esc(id)}"]`)){if(n.matches('img'))setImageValue(n,value);else if(n.matches('a[href]'))n.setAttribute('href',value)}};const mo=new MutationObserver(ms=>{for(const m of ms){const t=m.target;if(t?.nodeType!==1)continue;const id=t.getAttribute('data-dini-media-owner');if(id)sync(id)}});mo.observe(doc.documentElement,{subtree:true,attributes:true,attributeFilter:['src','data-src']})};
    frame.addEventListener('load',install);setTimeout(install,0);
  }

  patchCanonical();patchFetch();syncFrameAliases(document.getElementById('previewFrame'));
  window.DINI_MEDIA_SOURCE_PARITY_V1={VERSION,augment,augmentSnapshot,patchCanonical,patchFetch};
})();