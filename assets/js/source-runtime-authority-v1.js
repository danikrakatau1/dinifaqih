(function(g){
  'use strict';
  if(g.DiniSourceRuntimeAuthority?.version)return;
  const VERSION='1.1.2';
  const VR=g.DiniVisualResolver;
  const C=g.DiniSourceRuntimeCompiler;
  if(!VR?.sanitizeRuntimeNoise||!C?.graphByDoc){
    console.warn('[DINI SOURCE AUTHORITY] Runtime compiler belum tersedia.');
    return;
  }

  const authorityByDoc=new WeakMap();
  const originalSanitize=VR.sanitizeRuntimeNoise.bind(VR);
  const clone=value=>{try{return JSON.parse(JSON.stringify(value||{}))}catch{return value||{}}};
  const uniq=a=>[...new Set((a||[]).filter(Boolean))];
  const absolute=(u,base)=>{try{return new URL(String(u||'').replaceAll('\\/','/'),base||document.baseURI).href}catch{return String(u||'')}};

  function addCommand(list,cmd){
    if(!cmd?.type)return;
    const key=JSON.stringify(cmd);
    if(!list.some(x=>JSON.stringify(x)===key))list.push(cmd);
  }

  function lifecycleEvidence(graph){
    const life=graph?.lifecycle||{};
    return [
      ...(life.events||[]),...(life.timers||[]),...(life.actions||[]),...(life.targets||[])
    ].map(x=>String(x?.evidence||'')).filter(Boolean).join('\n');
  }

  function collectAudioUrls(graph){
    const base=graph?.source?.url||'';
    const evidence=lifecycleEvidence(graph);
    const found=[];
    const add=u=>{const s=String(u||'').replace(/&amp;/g,'&').trim();if(!s||!/(?:\.mp3|\.m4a|\.ogg|\.wav)(?:[?#]|$)/i.test(s))return;found.push(absolute(s,base))};
    for(const m of evidence.matchAll(/https?:\/\/[^\s'"`\\)]+?\.(?:mp3|m4a|ogg|wav)(?:\?[^\s'"`\\)]*)?/ig))add(m[0]);
    for(const m of evidence.matchAll(/['"]([^'"]+\.(?:mp3|m4a|ogg|wav)(?:\?[^'"]*)?)['"]/ig))add(m[1]);
    return uniq(found);
  }

  function timerCommands(graph){
    const life=graph?.lifecycle||{};
    const safe=life.safe_plan||{};
    const openSel=String(safe.open_selector||'');
    const openScriptIds=new Set((life.targets||[]).filter(x=>String(x?.selector||'')===openSel).map(x=>x.script_index));
    const out=[];
    for(const timer of life.timers||[]){
      if(openScriptIds.size&&!openScriptIds.has(timer?.script_index))continue;
      const evidence=String(timer?.evidence||'');
      const delay=Math.max(0,Number(timer?.delay_ms)||0);
      let m;
      const jqVis=/(?:jQuery|\$)\(\s*['"]([^'"]+)['"]\s*\)\.(fadeIn|fadeOut|show|hide)\s*\(\s*(\d*)/ig;
      while((m=jqVis.exec(evidence))){
        const kind=String(m[2]||'').toLowerCase();
        const duration=Math.max(0,Number(m[3]||0));
        if(kind==='fadein')addCommand(out,{type:'fade-in',selector:m[1],duration_ms:duration,delay_ms:delay,source:'source-timer-evidence'});
        else if(kind==='fadeout')addCommand(out,{type:'fade-out',selector:m[1],duration_ms:duration,delay_ms:delay,source:'source-timer-evidence'});
        else addCommand(out,{type:kind,selector:m[1],duration_ms:duration,delay_ms:delay,source:'source-timer-evidence'});
      }
      const jqCss=/(?:jQuery|\$)\(\s*['"]([^'"]+)['"]\s*\)\.css\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]*)['"]\s*\)/ig;
      while((m=jqCss.exec(evidence)))addCommand(out,{type:'style',selector:m[1],property:m[2],value:m[3],delay_ms:delay,source:'source-timer-evidence'});
    }
    return out;
  }

  function enrichMedia(graph){
    graph.media=graph.media||{version:1,items:[],counts:{}};
    graph.media.items=Array.isArray(graph.media.items)?graph.media.items:[];
    const urls=collectAudioUrls(graph);
    for(const url of urls){
      if(graph.media.items.some(x=>x?.type==='audio'&&String(x?.url||'')===url))continue;
      graph.media.items.push({
        id:'authority-audio-'+urls.indexOf(url),type:'audio',role:'source-script-audio',url,
        owner_selector:'body',render_target:'audio',source_location:'lifecycle-evidence',loop:false,autoplay:false
      });
    }
    const counts={};for(const item of graph.media.items)counts[item?.type||'unknown']=(counts[item?.type||'unknown']||0)+1;graph.media.counts=counts;
    return graph;
  }

  function enrichSafePlan(graph){
    const life=graph.lifecycle=graph.lifecycle||{};
    const safe=life.safe_plan=life.safe_plan||{version:1,open_selector:'',initial:[],on_open:[],handlers:[]};
    safe.initial=Array.isArray(safe.initial)?safe.initial:[];
    safe.on_open=Array.isArray(safe.on_open)?safe.on_open:[];
    for(const cmd of timerCommands(graph))addCommand(safe.on_open,cmd);

    if(safe.open_selector){
      const mediaItems=graph?.media?.items||[];
      for(const rec of life.media||[]){
        if(rec?.kind!=='background-video')continue;
        const media=mediaItems.find(x=>x?.type==='video'&&(
          (rec.element_id&&x.element_id===rec.element_id)||(rec.selector&&x.owner_selector===rec.selector)
        ));
        const owner=String(rec.selector||media?.owner_selector||'');
        if(owner)addCommand(safe.on_open,{type:'play',selector:owner+' video',delay_ms:0,source:'source-media-ownership'});
      }
      if(mediaItems.some(x=>x?.type==='audio')&&!safe.on_open.some(x=>x?.type==='play-audio-all')){
        addCommand(safe.on_open,{type:'play-audio-all',delay_ms:0,source:'source-media-ownership'});
      }
    }
    safe.on_open.sort((a,b)=>(Number(a?.delay_ms)||0)-(Number(b?.delay_ms)||0));
    safe.source_timer_count=Math.max(Number(safe.source_timer_count)||0,(life.timers||[]).length);
    safe.uses_source_delays=true;
    safe.synthetic_stagger=false;
    safe.arbitrary_source_js=false;
    return graph;
  }

  function normalizeGraph(graph){
    const out=enrichSafePlan(enrichMedia(clone(graph)));
    if(!Number(out.source_truth_version))out.source_truth_version=1;
    out.authority={
      ...(out.authority||{}),
      editor_rule:'consume-do-not-reinterpret',
      lifecycle_rule:'capture-before-sanitize-consume-downstream'
    };
    out.runtime_policy={
      ...(out.runtime_policy||{}),
      source_delay_authoritative:true,
      synthetic_stagger:false,
      source_transform_authoritative:true,
      editor_pause_non_destructive:true,
      execute_arbitrary_source_js:false,
      media_ownership_authoritative:true,
      carousel_settings_authoritative:true
    };
    return out;
  }

  function bindSourceTruth(doc,graph){
    if(!doc||!graph)return null;
    const authoritative=normalizeGraph(graph);
    authorityByDoc.set(doc,authoritative);
    C.graphByDoc.set(doc,authoritative);
    return authoritative;
  }

  function helperRuntimeText(){return `(()=>{
'use strict';
if(window.__DINI_SOURCE_AUTHORITY_RUNTIME_V112__)return;window.__DINI_SOURCE_AUTHORITY_RUNTIME_V112__=true;
const tpl=document.querySelector('template[data-dini-source-truth]');let G={};try{const raw=tpl?.content?.textContent||tpl?.textContent||'{}';G=JSON.parse(raw)}catch{}
const cfg=el=>{try{return JSON.parse(String(el?.getAttribute?.('data-settings')||'').replace(/&quot;/g,'"'))}catch{return{}}};
const num=(v,d)=>{const n=Number(v);return Number.isFinite(n)?n:d};
const esc=v=>window.CSS?.escape?CSS.escape(String(v||'')):String(v||'');
function ownerFor(item){try{if(item.owner_selector)return document.querySelector(item.owner_selector);if(item.element_id)return document.querySelector('[data-id="'+esc(item.element_id)+'"],.elementor-element-'+esc(item.element_id))}catch{}return null}
function ensureMedia(){
  const items=G?.media?.items||[];
  items.forEach((item,i)=>{
    const url=String(item?.url||'');if(!url)return;
    if(item.type==='audio'){
      let el=[...document.querySelectorAll('audio')].find(a=>String(a.currentSrc||a.src||a.querySelector('source')?.src||'')===url);
      if(!el){el=document.createElement('audio');el.setAttribute('data-dini-source-audio',String(item.id||i));el.preload=item.preload||'auto';el.src=url;el.loop=item.loop===true;el.style.display='none';document.body.appendChild(el)}
      return;
    }
    if(item.type==='video'&&(item.role==='video-background'||/background/i.test(String(item.role||'')))){
      const owner=ownerFor(item);if(!owner)return;
      let el=owner.querySelector('video.elementor-background-video-hosted,video');
      if(!el){let host=owner.querySelector('.elementor-background-video-container');if(!host){host=document.createElement('div');host.className='elementor-background-video-container';owner.prepend(host)}el=document.createElement('video');el.className='elementor-background-video-hosted';host.appendChild(el)}
      if(!el.getAttribute('src')&&!el.querySelector('source[src]'))el.src=url;
      el.muted=item.muted!==false;el.playsInline=true;if(item.play_once!==true)el.loop=true;
    }
  });
}
function initCarousel(w){
  if(w.__diniAuthorityCarousel)return;const root=w.querySelector('.elementor-image-carousel-wrapper'),track=root?.querySelector('.swiper-wrapper');if(!root||!track)return;
  if(root.swiper||w.swiper||track.swiper)return;
  const originals=[...track.children].filter(x=>x.classList?.contains('swiper-slide')&&!x.hasAttribute('data-dini-authority-clone'));if(originals.length<2)return;
  w.__diniAuthorityCarousel=true;const c=cfg(w);
  track.style.display='flex';track.style.flexWrap='nowrap';track.style.willChange='transform';root.style.overflow='hidden';
  const show=()=>Math.max(1,Math.min(originals.length,Math.round(num(matchMedia('(max-width:767px)').matches?(c.slides_to_show_mobile??c.slides_to_show):c.slides_to_show,c.slides_to_show_mobile??3))));
  const step=Math.max(1,Math.round(num(matchMedia('(max-width:767px)').matches?(c.slides_to_scroll_mobile??c.slides_to_scroll):c.slides_to_scroll,c.slides_to_scroll_mobile??1)));
  const speed=Math.max(250,num(c.speed,4000)),delay=Math.max(0,num(c.autoplay_speed,3000));
  const autoplay=c.autoplay!=='no',loop=c.infinite!=='no',pauseHover=c.pause_on_hover!=='no',pauseInteraction=c.pause_on_interaction!=='no';
  let index=0,timer=0,paused=false,slideW=0;
  const clear=()=>{if(timer){clearTimeout(timer);timer=0}};
  const schedule=()=>{clear();if(!autoplay||paused)return;timer=setTimeout(move,delay)};
  const move=()=>{if(paused||!autoplay)return schedule();index+=step;track.style.transition='transform '+speed+'ms linear';track.style.transform='translate3d('+(-index*slideW)+'px,0,0)'};
  const layout=()=>{clear();track.querySelectorAll('[data-dini-authority-clone]').forEach(n=>n.remove());const per=show();slideW=(root.clientWidth||root.getBoundingClientRect().width||1)/per;originals.forEach(s=>{s.style.width=slideW+'px';s.style.flexBasis=slideW+'px';s.style.flexShrink='0'});if(loop)originals.slice(0,Math.max(per,step)).forEach(s=>{const x=s.cloneNode(true);x.setAttribute('data-dini-authority-clone','1');x.setAttribute('aria-hidden','true');x.style.width=slideW+'px';x.style.flexBasis=slideW+'px';x.style.flexShrink='0';track.appendChild(x)});index=0;track.style.transition='none';track.style.transform='translate3d(0,0,0)';requestAnimationFrame(schedule)};
  track.addEventListener('transitionend',e=>{if(e.propertyName!=='transform')return;if(loop&&index>=originals.length){track.style.transition='none';index=index%originals.length;track.style.transform='translate3d('+(-index*slideW)+'px,0,0)';void track.offsetWidth}schedule()});
  if(pauseHover){root.addEventListener('mouseenter',()=>{paused=true;clear()});root.addEventListener('mouseleave',()=>{paused=false;schedule()})}
  if(pauseInteraction){root.addEventListener('pointerdown',()=>{paused=true;clear()},{passive:true});window.addEventListener('pointerup',()=>{paused=false;schedule()},{passive:true})}
  addEventListener('resize',()=>{clearTimeout(w.__diniAuthorityResize);w.__diniAuthorityResize=setTimeout(layout,120)},{passive:true});layout();
}
function initCarousels(){document.querySelectorAll('.elementor-widget-image-carousel,[data-widget_type="image-carousel.default"]').forEach(initCarousel)}
ensureMedia();initCarousels();
document.documentElement.setAttribute('data-dini-source-authority-runtime','${VERSION}');
})();`}

  function writeTruthTemplate(doc,tpl,graph){
    // Keep the detached/pre-serialization DOM readable via template.textContent.
    // Once serialized into HTML, browser runtime consumes template.content.textContent first.
    tpl.textContent=JSON.stringify(graph);
  }

  function ensureRuntimeOrder(doc,graph){
    if(!doc?.body||!graph?.source_truth_version)return;
    let tpl=doc.querySelector('template[data-dini-source-truth]');
    if(!tpl){tpl=doc.createElement('template');tpl.setAttribute('data-dini-source-truth','1')}
    writeTruthTemplate(doc,tpl,graph);
    doc.body.appendChild(tpl);

    for(const old of [...doc.querySelectorAll('script[data-dini-source-native-runtime]')])old.remove();
    for(const old of [...doc.querySelectorAll('script[data-dini-source-authority-runtime]')])old.remove();

    const runtime=doc.createElement('script');
    runtime.setAttribute('data-dini-source-native-runtime','source-truth-v1');
    runtime.setAttribute('data-dini-runtime-authority',VERSION);
    doc.body.appendChild(runtime);

    const helper=doc.createElement('script');
    helper.setAttribute('data-dini-source-authority-runtime',VERSION);
    helper.textContent=helperRuntimeText();
    doc.body.appendChild(helper);
  }

  VR.sanitizeRuntimeNoise=function(doc){
    const bound=authorityByDoc.get(doc);
    if(bound)C.graphByDoc.set(doc,bound);
    const result=originalSanitize(doc);
    try{
      const graph=authorityByDoc.get(doc)||C.graphByDoc.get(doc);
      if(graph?.source_truth_version)ensureRuntimeOrder(doc,graph);
    }catch(err){console.warn('[DINI SOURCE AUTHORITY] runtime ordering gagal; baseline tidak diubah paksa',err)}
    return result;
  };

  g.DiniSourceRuntimeAuthority={version:VERSION,bindSourceTruth,getSourceTruth:doc=>authorityByDoc.get(doc)||C.graphByDoc.get(doc)||null};
  console.info('[DINI SOURCE AUTHORITY] V'+VERSION+' aktif — lifecycle/media/carousel authority downstream.');
})(window);