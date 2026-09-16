(function(g){
  'use strict';
  if(g.DiniSourceTruthScanner?.version)return;

  const VERSION='1.0.0';
  const VR=g.DiniVisualResolver;
  if(!VR||typeof VR.makeSourceGraph!=='function'){
    console.warn('[DINI SOURCE TRUTH] Visual resolver belum tersedia.');
    return;
  }

  const originalMakeSourceGraph=VR.makeSourceGraph.bind(VR);
  const uniq=a=>[...new Set((a||[]).filter(v=>v!==''&&v!=null))];
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const decode=v=>{try{const t=document.createElement('textarea');t.innerHTML=String(v||'');return t.value}catch{return String(v||'')}};
  const stableHash=s=>typeof VR.stableHash==='function'?VR.stableHash(String(s||'')):(()=>{let h=2166136261;for(const c of String(s||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')})();
  const abs=(u,base)=>{try{return new URL(String(u||'').replaceAll('\\/','/'),base||document.baseURI).href}catch{return String(u||'')}};
  const elementId=el=>el?.getAttribute?.('data-id')||((String(el?.className||'').match(/elementor-element-([a-zA-Z0-9_-]+)/)||[])[1])||el?.id||'';
  const selectorFor=el=>{if(!el)return'';if(el.id)return '#'+el.id;const id=elementId(el);if(id)return `[data-id="${id}"]`;const cls=[...(el.classList||[])].find(x=>/^elementor-element-/.test(x));if(cls)return'.'+cls;return String(el.tagName||'element').toLowerCase()};
  const parseSettings=el=>{const raw=decode(el?.getAttribute?.('data-settings')||'');try{return raw?JSON.parse(raw):{}}catch{return{}}};
  const attrBool=(el,name)=>el?.hasAttribute?.(name)||false;
  const num=v=>Number.isFinite(Number(v))?Number(v):null;
  const rawSourceHtml=doc=>{
    const input=g.document?.getElementById?.('sourceInput');
    const value=String(input?.value||'');
    return value.trim()?value:'<!doctype html>\n'+String(doc?.documentElement?.outerHTML||'');
  };
  const cssTextAll=(doc,cssSources)=>[
    ...[...doc.querySelectorAll('style')].map((s,i)=>({url:`inline-style://${i}`,text:String(s.textContent||'')})),
    ...(Array.isArray(cssSources)?cssSources:[]).map((x,i)=>({url:String(x?.url||`linked-style://${i}`),text:String(x?.text||'')}))
  ];
  const scriptRecords=doc=>[...doc.querySelectorAll('script')].map((s,i)=>({
    index:i,
    src:String(s.getAttribute('src')||''),
    type:String(s.getAttribute('type')||''),
    inline:!s.getAttribute('src'),
    text:String(s.textContent||'')
  }));
  const snippet=(text,start,len=220)=>clean(String(text||'').slice(Math.max(0,start-70),Math.min(String(text||'').length,start+len))).slice(0,320);

  function scanDependencies(doc,{baseUrl='',cssSources=[]}={}){
    const scripts=scriptRecords(doc);
    const external_scripts=uniq(scripts.filter(x=>x.src).map(x=>abs(x.src,baseUrl)));
    const stylesheets=uniq([
      ...[...doc.querySelectorAll('link[rel~="stylesheet"][href]')].map(x=>abs(x.getAttribute('href'),baseUrl)),
      ...(cssSources||[]).map(x=>String(x?.url||'')).filter(Boolean)
    ]);
    const fonts=uniq([...doc.querySelectorAll('link[href]')].map(x=>x.getAttribute('href')).filter(x=>/\.(woff2?|ttf|otf)(?:\?|$)/i.test(String(x||''))).map(x=>abs(x,baseUrl)));
    const combined=[doc.documentElement?.className||'',doc.body?.className||'',...external_scripts, ...stylesheets, ...scripts.filter(x=>x.inline).map(x=>x.text.slice(0,5000))].join('\n');
    const frameworks=[];
    const probes=[
      ['elementor',/elementor/i],['wordpress',/wp-content|wp-includes|wordpress/i],['jquery',/jquery/i],['swiper',/swiper/i],['gsap',/\bgsap\b|greensock|ScrollTrigger/i],['lottie',/lottie|bodymovin/i],['threejs',/three(?:\.min)?\.js|THREE\./i],['aos',/aos\.js|data-aos/i],['animate.css',/animate(?:\.min)?\.css|animated\s/i],['powerpack-elementor',/powerpack|pp-bg-effects/i]
    ];
    for(const [name,re] of probes)if(re.test(combined))frameworks.push(name);
    return {version:1,external_scripts,stylesheets,fonts,frameworks,inline_script_count:scripts.filter(x=>x.inline&&clean(x.text).length>0).length};
  }

  function scanMedia(doc,sourceGraph,{baseUrl=''}={}){
    const out=[],seen=new Set();
    const add=x=>{const key=x.id||stableHash([x.type,x.role,x.url,x.owner_selector,x.element_id,x.index].join('|'));if(seen.has(key))return;seen.add(key);out.push({id:'media-'+key,...x})};
    for(const v of sourceGraph?.visuals||[]){
      if(!v?.url&&!['effect','gradient'].includes(v?.type))continue;
      const type=v.type==='video-background'?'video':v.type==='slideshow'?'image-sequence':v.type==='effect'||v.type==='gradient'?'effect':'image';
      const role=v.semantic_role||v.type||type;
      add({type,role,url:v.url||'',element_id:v.element_id||'',owner_selector:v.owner_selector||'',render_target:v.render_target||'',source_key:v.source_key||'',source_location:v.source_location||'',source_property:v.source_property||'',slide_index:v.slide_index??null,duration:v.duration??null,transition:v.transition||'',transition_duration:v.transition_duration??null,loop:v.loop??null,ken_burns:v.ken_burns??null,ken_burns_direction:v.ken_burns_direction||'',play_once:v.play_once??null,play_mobile:v.play_mobile??null,effect:v.effect||''});
    }
    [...doc.querySelectorAll('video')].forEach((el,i)=>{
      const host=el.closest?.('[data-settings]');const cfg=parseSettings(host);
      const url=el.getAttribute('src')||el.querySelector('source')?.getAttribute('src')||cfg.background_video_link||cfg.background_video_url||cfg.video_url||'';
      add({type:'video',role:/elementor-background-video|background/i.test(String(el.className||''))||cfg.background_background==='video'?'video-background':'content-video',url:abs(url,baseUrl),element_id:elementId(host||el),owner_selector:selectorFor(host||el),render_target:selectorFor(el),autoplay:attrBool(el,'autoplay'),muted:attrBool(el,'muted')||!!el.muted,playsinline:attrBool(el,'playsinline'),loop:attrBool(el,'loop'),preload:el.getAttribute('preload')||'',poster:abs(el.getAttribute('poster')||'',baseUrl),play_once:cfg.background_play_once==='yes',play_mobile:cfg.background_play_on_mobile==='yes',index:i});
    });
    [...doc.querySelectorAll('audio')].forEach((el,i)=>{const url=el.getAttribute('src')||el.querySelector('source')?.getAttribute('src')||'';add({type:'audio',role:'audio',url:abs(url,baseUrl),element_id:elementId(el),owner_selector:selectorFor(el),render_target:selectorFor(el),autoplay:attrBool(el,'autoplay'),muted:attrBool(el,'muted')||!!el.muted,loop:attrBool(el,'loop'),preload:el.getAttribute('preload')||'',index:i})});
    [...doc.querySelectorAll('iframe[src]')].forEach((el,i)=>add({type:'iframe',role:/youtube|vimeo/i.test(el.src||'')?'embedded-video':'iframe',url:abs(el.getAttribute('src'),baseUrl),element_id:elementId(el),owner_selector:selectorFor(el),render_target:selectorFor(el),index:i}));
    return {version:1,items:out,counts:out.reduce((a,x)=>(a[x.type]=(a[x.type]||0)+1,a),{})};
  }

  function scanLayers(doc,sourceGraph){
    const visuals=Array.isArray(sourceGraph?.visuals)?sourceGraph.visuals:[];
    const layers=visuals.map((v,i)=>{
      const host=v.element_id?(doc.querySelector(`[data-id="${CSS.escape(v.element_id)}"]`)||doc.querySelector(`.elementor-element-${CSS.escape(v.element_id)}`)):null;
      const style=String(host?.getAttribute?.('style')||'');
      const z=/z-index\s*:\s*(-?\d+)/i.exec(style);
      const ancestors=[];let n=host?.parentElement;
      while(n&&ancestors.length<8){const id=elementId(n);if(id||n.id)ancestors.push(id||n.id);n=n.parentElement}
      return {id:v.source_key||`layer-${i+1}`,order:i,type:v.type||'',semantic_role:v.semantic_role||'',element_id:v.element_id||'',owner_selector:v.owner_selector||'',render_target:v.render_target||'',pseudo:v.pseudo||'',background_layer:v.background_layer??0,z_index:z?Number(z[1]):null,media_query:v.media_query||'',ancestors};
    });
    return {version:1,policy:'preserve-authored-hierarchy',items:layers};
  }

  function scanAnimations(doc,{cssSources=[]}={}){
    const nodes=[];const seen=new Set();
    const add=x=>{const key=stableHash(JSON.stringify(x));if(seen.has(key))return;seen.add(key);nodes.push({id:'anim-'+key,...x})};
    doc.querySelectorAll('[data-settings],[style]').forEach((el,index)=>{
      const cfg=parseSettings(el);const style=String(el.getAttribute('style')||'');
      const variants=[['desktop',cfg._animation??cfg.animation],['tablet',cfg._animation_tablet??cfg.animation_tablet],['mobile',cfg._animation_mobile??cfg.animation_mobile]];
      const delayDesktop=num(cfg._animation_delay??cfg.animation_delay),delayTablet=num(cfg._animation_delay_tablet??cfg.animation_delay_tablet),delayMobile=num(cfg._animation_delay_mobile??cfg.animation_delay_mobile);
      for(const [viewport,name0] of variants){const name=String(name0||'');if(!name||name==='none')continue;const delay=viewport==='mobile'?delayMobile:viewport==='tablet'?delayTablet:delayDesktop;add({source:'elementor-data-settings',element_id:elementId(el),selector:selectorFor(el),viewport,name,delay_ms:delay,duration:cfg._animation_duration??cfg.animation_duration??null,classes:String(el.className||''),initially_invisible:el.classList?.contains('elementor-invisible')||false,index})}
      const name=/animation-name\s*:\s*([^;]+)/i.exec(style)?.[1]?.trim();
      const shorthand=/\banimation\s*:\s*([^;]+)/i.exec(style)?.[1]?.trim();
      if(name||shorthand)add({source:'inline-style',element_id:elementId(el),selector:selectorFor(el),name:name||'',shorthand:shorthand||'',delay:/animation-delay\s*:\s*([^;]+)/i.exec(style)?.[1]?.trim()||'',duration:/animation-duration\s*:\s*([^;]+)/i.exec(style)?.[1]?.trim()||'',iteration_count:/animation-iteration-count\s*:\s*([^;]+)/i.exec(style)?.[1]?.trim()||'',index});
    });
    const css=cssTextAll(doc,cssSources);const keyframes=[];const cssRules=[];
    for(const src of css){
      const text=String(src.text||'');
      for(const m of text.matchAll(/@(?:-webkit-)?keyframes\s+([\w-]+)/ig))keyframes.push({name:m[1],source:src.url});
      const ruleRe=/([^{}@][^{}]{0,280})\{([^{}]*(?:animation(?:-name|-duration|-delay|-timing-function|-iteration-count)?|transition)\s*:[^{}]+)\}/ig;let m;
      while((m=ruleRe.exec(text))&&cssRules.length<500){const body=m[2];const anim=/animation(?:-name)?\s*:\s*([^;]+)/i.exec(body);const transition=/transition\s*:\s*([^;]+)/i.exec(body);cssRules.push({selector:clean(m[1]).slice(0,260),animation:anim?.[1]?.trim()||'',transition:transition?.[1]?.trim()||'',source:src.url})}
    }
    const scripts=scriptRecords(doc);const api=[];
    const apiPatterns=[['gsap.to',/\bgsap\.to\s*\(/g],['gsap.from',/\bgsap\.from\s*\(/g],['gsap.fromTo',/\bgsap\.fromTo\s*\(/g],['gsap.timeline',/\bgsap\.timeline\s*\(/g],['ScrollTrigger',/\bScrollTrigger\b/g],['lottie',/\blottie\b|bodymovin/g],['IntersectionObserver',/\bIntersectionObserver\s*\(/g],['MutationObserver',/\bMutationObserver\s*\(/g],['requestAnimationFrame',/\brequestAnimationFrame\s*\(/g],['Web Animations API',/\.animate\s*\(\s*\[/g]];
    for(const s of scripts.filter(x=>x.inline))for(const [name,re0] of apiPatterns){const re=new RegExp(re0.source,re0.flags);let m;while((m=re.exec(s.text))){api.push({api:name,script_index:s.index,evidence:snippet(s.text,m.index)});if(api.length>=300)break}}
    return {version:1,nodes,keyframes:uniq(keyframes.map(x=>`${x.name}|${x.source}`)).map(k=>{const [name,...rest]=k.split('|');return{name,source:rest.join('|')}}),css_rules:cssRules,script_apis:api,counts:{nodes:nodes.length,keyframes:keyframes.length,css_rules:cssRules.length,script_apis:api.length}};
  }

  function scanLifecycle(doc){
    const events=[],timers=[],actions=[],targets=[],seen=new Set();
    const add=(arr,x,prefix)=>{const key=prefix+'|'+stableHash(JSON.stringify(x));if(seen.has(key))return;seen.add(key);arr.push({id:prefix+'-'+stableHash(JSON.stringify(x)),...x})};
    const scripts=scriptRecords(doc).filter(x=>x.inline&&clean(x.text));
    const eventRe=/addEventListener\s*\(\s*['"]([\w:-]+)['"]|\.on(click|load|ended|pause|play|scroll|touchend|transitionend|animationend)\s*=|\.on\s*\(\s*['"]([\w:-]+)['"]/ig;
    const targetRe=/(?:getElementById\s*\(\s*['"]([^'"]+)['"]|querySelector\s*\(\s*['"]([^'"]+)['"]|jQuery\s*\(\s*['"]([^'"]+)['"]|\$\s*\(\s*['"]([^'"]+)['"])/ig;
    const timerRe=/setTimeout\s*\([\s\S]{0,420}?,\s*(\d{1,7})\s*\)/ig;
    const actionPatterns=[['play-media',/\.play\s*\(/ig],['pause-media',/\.pause\s*\(/ig],['jquery-animate',/\.animate\s*\(\s*\{/ig],['hide',/\.hide\s*\(/ig],['show',/\.show\s*\(/ig],['scroll-lock',/overflow\s*=|overflow['"]?\s*,|stop-scrolling|disableScroll/ig],['scroll-unlock',/enableScroll|removeClass\s*\([^)]*stop-scrolling|overflow[^;]{0,80}auto/ig],['display-change',/style\.display\s*=|\.css\s*\(\s*['"]display/ig],['opacity-change',/style\.opacity\s*=|opacity\s*:/ig],['transform-change',/style\.transform\s*=|transform\s*:/ig]];
    for(const s of scripts){
      let m;const er=new RegExp(eventRe.source,eventRe.flags);while((m=er.exec(s.text))){const event=m[1]||m[2]||m[3]||'unknown';add(events,{event,script_index:s.index,evidence:snippet(s.text,m.index)},'event')}
      const tr=new RegExp(targetRe.source,targetRe.flags);while((m=tr.exec(s.text))){const selector=m[1]?'#'+m[1]:(m[2]||m[3]||m[4]||'');if(selector)add(targets,{selector,script_index:s.index,evidence:snippet(s.text,m.index,140)},'target')}
      const tmr=new RegExp(timerRe.source,timerRe.flags);while((m=tmr.exec(s.text)))add(timers,{delay_ms:Number(m[1]),script_index:s.index,evidence:snippet(s.text,m.index,300)},'timer');
      for(const [action,re0] of actionPatterns){const re=new RegExp(re0.source,re0.flags);while((m=re.exec(s.text)))add(actions,{action,script_index:s.index,evidence:snippet(s.text,m.index,180)},'action')}
    }
    const media=[];
    doc.querySelectorAll('[data-settings]').forEach(el=>{const cfg=parseSettings(el);const u=cfg.background_video_link||cfg.background_video_url||cfg.video_url||'';if(!u)return;media.push({element_id:elementId(el),selector:selectorFor(el),kind:'background-video',play_once:cfg.background_play_once==='yes',play_on_mobile:cfg.background_play_on_mobile==='yes',autoplay_source:cfg.background_autoplay??null,source_settings:{background_play_once:cfg.background_play_once??null,background_play_on_mobile:cfg.background_play_on_mobile??null}})});
    return {version:1,capture:'static-source-evidence',events,timers,actions,targets,media,counts:{events:events.length,timers:timers.length,actions:actions.length,targets:targets.length,media:media.length}};
  }

  function scanResponsive(doc,{cssSources=[]}={}){
    const variants=[];doc.querySelectorAll('[data-settings]').forEach(el=>{const cfg=parseSettings(el);for(const [k,v] of Object.entries(cfg)){if(!/_(?:mobile|tablet)$/.test(k))continue;variants.push({element_id:elementId(el),selector:selectorFor(el),key:k,value:v})}});
    const media_queries=[];for(const src of cssTextAll(doc,cssSources))for(const m of String(src.text||'').matchAll(/@media\s*([^\{]+)\{/ig))media_queries.push({query:clean(m[1]),source:src.url});
    return {version:1,settings_variants:variants,media_queries:uniq(media_queries.map(x=>`${x.query}|${x.source}`)).map(k=>{const [query,...rest]=k.split('|');return{query,source:rest.join('|')}})};
  }

  function scanPersonalization(doc){
    const fields=[],candidates=[];
    const marked=[...doc.querySelectorAll('[data-dini-guest-name],[data-native-guest-name]')];
    marked.forEach((el,i)=>fields.push({id:`guest-name-${i+1}`,type:'guest_name',selector:selectorFor(el),element_id:elementId(el),fallback_text:clean(el.textContent)||'Nama Tamu',source:'source-probe-marker',confidence:1,preserve_style:true,preserve_animation:true,url_parameter:'to',sanitize:'text-only'}));
    if(!fields.length){
      const textEls=[...doc.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,label,div')].filter(el=>{const t=clean(el.textContent);return t&&t.length<160&&![...el.children].some(c=>clean(c.textContent)===t)});
      for(const el of textEls){const t=clean(el.textContent);const context=clean(el.parentElement?.textContent).slice(0,300);let score=0;if(/kepada\s+yth|kpd\.?\s*yth/i.test(context))score+=0.45;if(/di\s+tempat/i.test(context))score+=0.25;if(/nama\s+tamu|guest/i.test(t))score+=0.2;if(score>=0.45)candidates.push({type:'guest_name',selector:selectorFor(el),element_id:elementId(el),text:t,confidence:Math.min(.9,score),reason:'context-heuristic-needs-confirmation'})}
    }
    return {version:1,fields,candidates:candidates.slice(0,12),binding_policy:{automatic_min_confidence:0.95,heuristic_requires_confirmation:true,url_parameter:'to',fallback:'source-text',injection:'textContent-only',style_owner:'template',animation_owner:'template'}};
  }

  function augmentSourceGraph(doc,opts={},baseGraph){
    const raw=rawSourceHtml(doc);const cssSources=Array.isArray(opts.cssSources)?opts.cssSources:[];
    const graph={...(baseGraph||{})};
    const dependencies=scanDependencies(doc,opts);
    const media=scanMedia(doc,graph,opts);
    const layers=scanLayers(doc,graph);
    const animations=scanAnimations(doc,opts);
    const lifecycle=scanLifecycle(doc);
    const responsive=scanResponsive(doc,opts);
    const personalization=scanPersonalization(doc);
    const cssFingerprint=cssSources.map(x=>`${x?.url||''}:${stableHash(x?.text||'')}`).join('|');
    graph.source_truth_version=1;
    graph.source_truth_engine=`dini-source-truth-v${VERSION}`;
    graph.capture_stage='pre-sanitize-post-source-mapping';
    graph.source={url:opts.baseUrl||'',html_bytes:new Blob([raw]).size,html_hash:stableHash(raw),css_hash:stableHash(cssFingerprint),hash_algorithm:'fnv1a32-stable'};
    graph.dependencies=dependencies;
    graph.media=media;
    graph.layers=layers;
    graph.animations=animations;
    graph.lifecycle=lifecycle;
    graph.responsive={...(graph.responsive||{}),source_truth:responsive};
    graph.personalization=personalization;
    graph.compatibility_policy={mode:'separate-from-source-truth',default_mutation:'none',allow_runtime_fallbacks:true,template_specific_hardcode:false,synthetic_animation_timing:false,blanket_animation_disable:false,blanket_transform_reset:false,blanket_visibility_force:false};
    graph.authority={source_truth:'fetched-source',visual_ownership:'source-graph',animation_truth:'source-metadata-and-script-evidence',lifecycle_truth:'source-event-and-timing-evidence',personalization_truth:'explicit-marker-first',editor_rule:'consume-do-not-reinterpret'};
    graph.diagnostics={visuals:(graph.visuals||[]).length,interactions:(graph.interactions||[]).length,media:media.items.length,layers:layers.items.length,animations:animations.nodes.length,animation_apis:animations.script_apis.length,lifecycle_events:lifecycle.events.length,lifecycle_timers:lifecycle.timers.length,lifecycle_actions:lifecycle.actions.length,dependencies:dependencies.external_scripts.length+dependencies.stylesheets.length,personalization_fields:personalization.fields.length,personalization_candidates:personalization.candidates.length};
    return graph;
  }

  VR.makeSourceGraph=function(doc,opts={}){
    const base=originalMakeSourceGraph(doc,opts);
    try{return augmentSourceGraph(doc,opts,base)}catch(err){console.error('[DINI SOURCE TRUTH] scan gagal; Source Graph V3 tetap dipakai.',err);return{...base,source_truth_version:1,source_truth_error:String(err?.message||err)}}
  };

  g.DiniSourceTruthScanner={version:VERSION,augmentSourceGraph,scanDependencies,scanMedia,scanLayers,scanAnimations,scanLifecycle,scanResponsive,scanPersonalization,originalMakeSourceGraph};
  console.info('[DINI SOURCE TRUTH] V'+VERSION+' aktif — visual/media/layer/animation/lifecycle/dependency/personalization graph.');
})(window);
