(function(g){
  'use strict';
  if(g.DiniSourceTruthGapClosure?.version)return;

  const VERSION='1.0.0';
  const VR=g.DiniVisualResolver;
  if(!VR||typeof VR.makeSourceGraph!=='function'){
    console.warn('[DINI SOURCE GAP CLOSURE] Visual resolver belum tersedia.');
    return;
  }

  const originalMakeSourceGraph=VR.makeSourceGraph.bind(VR);
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const uniq=a=>[...new Set((a||[]).filter(v=>v!==''&&v!=null))];
  const stableHash=s=>typeof VR.stableHash==='function'?VR.stableHash(String(s||'')):(()=>{let h=2166136261;for(const c of String(s||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')})();
  const snippet=(text,start,len=260)=>clean(String(text||'').slice(Math.max(0,start-90),Math.min(String(text||'').length,start+len))).slice(0,380);
  const absolute=(u,base)=>{try{return new URL(String(u||''),base||location.href).href}catch{return String(u||'')}};

  let externalJs=[];
  let preloadPromise=null;
  let replayBuild=false;
  let preloadGeneration=0;

  function sourceContext(){
    const input=document.getElementById('sourceInput');
    const urlInput=document.getElementById('sourceUrl');
    const html=String(input?.value||'');
    const doc=new DOMParser().parseFromString(html,'text/html');
    const requested=String(urlInput?.value||'').trim();
    const declared=String(doc.querySelector('base')?.getAttribute('href')||'').trim();
    let base=requested||location.href;
    try{if(declared)base=new URL(declared,base).href}catch{}
    return {html,doc,base};
  }

  function externalScriptUrls(doc,base){
    return uniq([...doc.querySelectorAll('script[src]')].map(s=>absolute(s.getAttribute('src'),base)).filter(u=>/^https?:/i.test(u)));
  }

  function rankScript(url){
    let n=0;
    if(/elementor|frontend/i.test(url))n+=70;
    if(/swiper|gsap|greensock|lottie|bodymovin|aos|motion/i.test(url))n+=60;
    if(/jquery/i.test(url))n+=20;
    if(/wp-content|plugins|themes/i.test(url))n+=30;
    if(/\.min\.js(?:\?|$)/i.test(url))n+=5;
    return n;
  }

  async function fetchScript(url,index){
    try{
      const endpoint='/api/fetch-asset?url='+encodeURIComponent(url)+'&offset=0&size=1500000';
      const r=await fetch(endpoint,{cache:'no-store',headers:{Accept:'text/javascript,text/plain,application/javascript,*/*'}});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const ct=String(r.headers.get('content-type')||'').toLowerCase();
      if(ct&&!/javascript|ecmascript|text|octet-stream|json/.test(ct))throw new Error('content-type '+ct);
      const text=await r.text();
      return {index,url,text,loaded:true,bytes:text.length,hash:stableHash(text),content_type:ct||'unknown'};
    }catch(err){
      return {index,url,text:'',loaded:false,bytes:0,hash:'',error:String(err?.message||err)};
    }
  }

  async function preloadExternalScripts(){
    const generation=++preloadGeneration;
    const {doc,base}=sourceContext();
    const urls=externalScriptUrls(doc,base).sort((a,b)=>rankScript(b)-rankScript(a)).slice(0,18);
    if(!urls.length){externalJs=[];return externalJs}
    const out=[];
    for(let i=0;i<urls.length;i+=4){
      const batch=await Promise.all(urls.slice(i,i+4).map((u,j)=>fetchScript(u,i+j)));
      out.push(...batch);
    }
    if(generation===preloadGeneration)externalJs=out;
    return out;
  }

  function schedulePreload(){
    preloadPromise=preloadExternalScripts().catch(err=>{
      console.warn('[DINI SOURCE GAP CLOSURE] external JS preload gagal',err);
      return externalJs;
    });
    return preloadPromise;
  }

  function records(doc){
    const inline=[...doc.querySelectorAll('script')].map((s,i)=>({
      script_index:i,source:s.getAttribute('src')?absolute(s.getAttribute('src'),document.baseURI):`inline-script://${i}`,
      external:!!s.getAttribute('src'),loaded:!s.getAttribute('src'),text:s.getAttribute('src')?'':String(s.textContent||'')
    })).filter(x=>!x.external&&clean(x.text));
    const ext=externalJs.filter(x=>x.loaded&&clean(x.text)).map(x=>({script_index:10000+x.index,source:x.url,external:true,loaded:true,text:x.text}));
    return [...inline,...ext];
  }

  function addUnique(list,item,keyFn=x=>JSON.stringify(x)){
    const key=keyFn(item);
    if(!list.some(x=>keyFn(x)===key))list.push(item);
  }

  function scanRandomness(doc){
    const evidence=[];
    const patterns=[
      ['math-random',/\bMath\.random\s*\(/g],
      ['crypto-random',/\bcrypto\.getRandomValues\s*\(/g],
      ['gsap-random',/\bgsap\.utils\.random\s*\(/g],
      ['shuffle',/\b(?:shuffle|randomize)\s*\(/gi],
      ['lodash-shuffle',/\b_\.shuffle\s*\(/g],
      ['random-sort',/\.sort\s*\(\s*[^)]*Math\.random/g]
    ];
    for(const s of records(doc))for(const [kind,re0] of patterns){
      const re=new RegExp(re0.source,re0.flags);let m;
      while((m=re.exec(s.text))){
        evidence.push({kind,script_index:s.script_index,source:s.source,external:s.external,evidence:snippet(s.text,m.index)});
        if(evidence.length>=160)break;
      }
    }
    return {
      version:1,
      authored:evidence.length>0,
      evidence,
      policy:evidence.length?'preserve-authored-randomness':'deterministic-no-randomness-detected',
      synthetic_randomness:false,
      seed_policy:'do-not-invent-seed',
      runtime_rule:'preserve-only-when-source-evidence-exists'
    };
  }

  function scanExternalAnimationApis(doc){
    const out=[];
    const patterns=[
      ['gsap.to',/\bgsap\.to\s*\(/g],['gsap.from',/\bgsap\.from\s*\(/g],['gsap.fromTo',/\bgsap\.fromTo\s*\(/g],
      ['gsap.timeline',/\bgsap\.timeline\s*\(/g],['ScrollTrigger',/\bScrollTrigger\b/g],['lottie',/\blottie\b|bodymovin/g],
      ['requestAnimationFrame',/\brequestAnimationFrame\s*\(/g],['Web Animations API',/\.animate\s*\(\s*\[/g],
      ['IntersectionObserver',/\bIntersectionObserver\s*\(/g],['MutationObserver',/\bMutationObserver\s*\(/g],['Swiper',/\bnew\s+Swiper\s*\(/g]
    ];
    for(const s of records(doc))for(const [api,re0] of patterns){
      const re=new RegExp(re0.source,re0.flags);let m;
      while((m=re.exec(s.text))){
        addUnique(out,{api,script_index:s.script_index,source:s.source,external:s.external,evidence:snippet(s.text,m.index)},x=>[x.api,x.script_index,x.evidence].join('|'));
        if(out.length>=500)break;
      }
    }
    return out;
  }

  function scanLifecycleEvidence(doc,base){
    const events=[],timers=[],actions=[],targets=[],media=[];
    const eventRe=/addEventListener\s*\(\s*['"]([\w:-]+)['"]|\.on(?:e|)\s*\(\s*['"]([\w:-]+)['"]|\.on(click|load|ended|pause|play|scroll|touchend|transitionend|animationend|resize|orientationchange)\s*=/ig;
    const timerRe=/\b(setTimeout|setInterval)\s*\([\s\S]{0,520}?,\s*(\d{1,8})\s*\)/ig;
    const targetRe=/(?:getElementById\s*\(\s*['"]([^'"]+)['"]|querySelector(?:All)?\s*\(\s*['"]([^'"]+)['"]|(?:jQuery|\$)\s*\(\s*['"]([^'"]+)['"])/ig;
    const actionPatterns=[
      ['play-media',/\.play\s*\(/ig],['pause-media',/\.pause\s*\(/ig],['load-media',/\.load\s*\(/ig],
      ['jquery-animate',/\.animate\s*\(\s*\{/ig],['show',/\.show\s*\(/ig],['hide',/\.hide\s*\(/ig],
      ['class-add',/\.classList\.add\s*\(/ig],['class-remove',/\.classList\.remove\s*\(/ig],
      ['style-change',/\.style\.[\w-]+\s*=/ig],['scroll-lock',/disableScroll|stop-scrolling|overflow\s*=\s*['"]hidden/ig],
      ['scroll-unlock',/enableScroll|overflow\s*=\s*['"](?:auto|visible)/ig]
    ];
    const mediaUrl=/["'`](https?:\/\/[^"'`\s]+?\.(?:mp4|webm|mov|mp3|m4a|ogg|wav)(?:\?[^"'`\s]*)?)["'`]/ig;
    for(const s of records(doc)){
      let m;
      const er=new RegExp(eventRe.source,eventRe.flags);
      while((m=er.exec(s.text)))addUnique(events,{event:m[1]||m[2]||m[3]||'',script_index:s.script_index,source:s.source,external:s.external,evidence:snippet(s.text,m.index)},x=>[x.event,x.script_index,x.evidence].join('|'));
      const tr=new RegExp(timerRe.source,timerRe.flags);
      while((m=tr.exec(s.text)))addUnique(timers,{kind:m[1],delay_ms:Number(m[2]),script_index:s.script_index,source:s.source,external:s.external,evidence:snippet(s.text,m.index)},x=>[x.kind,x.delay_ms,x.script_index,x.evidence].join('|'));
      const tar=new RegExp(targetRe.source,targetRe.flags);
      while((m=tar.exec(s.text))){const selector=m[1]?'#'+m[1]:(m[2]||m[3]||'');addUnique(targets,{selector,script_index:s.script_index,source:s.source,external:s.external,evidence:snippet(s.text,m.index)},x=>[x.selector,x.script_index].join('|'))}
      for(const [action,re0] of actionPatterns){const re=new RegExp(re0.source,re0.flags);while((m=re.exec(s.text)))addUnique(actions,{action,script_index:s.script_index,source:s.source,external:s.external,evidence:snippet(s.text,m.index)},x=>[x.action,x.script_index,x.evidence].join('|'))}
      const mr=new RegExp(mediaUrl.source,mediaUrl.flags);
      while((m=mr.exec(s.text))){const url=absolute(m[1],base);const kind=/\.(?:mp3|m4a|ogg|wav)(?:\?|$)/i.test(url)?'audio':'video';addUnique(media,{kind,url,script_index:s.script_index,source:s.source,external:s.external,evidence:snippet(s.text,m.index)},x=>[x.kind,x.url,x.script_index].join('|'))}
    }
    return {events,timers,actions,targets,media};
  }

  function eventGraph(lifecycle){
    const nodes=[],edges=[];
    const pushNode=(type,x,label)=>{const id=type+':'+stableHash(JSON.stringify(x));if(!nodes.some(n=>n.id===id))nodes.push({id,type,label,...x});return id};
    const byScript=new Map();
    const collect=(type,list,labelFn)=>{
      for(const x of list||[]){const id=pushNode(type,x,labelFn(x));const k=String(x.script_index??'');if(!byScript.has(k))byScript.set(k,[]);byScript.get(k).push(id)}
    };
    collect('event',lifecycle.events,x=>x.event||'event');collect('target',lifecycle.targets,x=>x.selector||'target');collect('timer',lifecycle.timers,x=>`${x.kind||'timer'} ${x.delay_ms||0}ms`);collect('action',lifecycle.actions,x=>x.action||'action');collect('media',lifecycle.media,x=>x.kind||'media');
    for(const [script,ids] of byScript){
      const ev=ids.filter(id=>id.startsWith('event:'));const others=ids.filter(id=>!id.startsWith('event:'));
      for(const from of ev)for(const to of others){if(edges.length>=1200)break;edges.push({from,to,relation:'same-script-evidence',script_index:Number(script)})}
    }
    return {version:1,nodes,edges,policy:'evidence-graph-not-execution-order',counts:{nodes:nodes.length,edges:edges.length}};
  }

  function responsiveRuntimeEvidence(doc){
    const items=[];
    const patterns=[
      ['matchMedia',/\bmatchMedia\s*\(/g],['innerWidth',/\b(?:window\.)?innerWidth\b/g],['innerHeight',/\b(?:window\.)?innerHeight\b/g],
      ['resize-event',/addEventListener\s*\(\s*['"]resize['"]/g],['orientation-event',/addEventListener\s*\(\s*['"]orientationchange['"]/g],
      ['visualViewport',/\bvisualViewport\b/g]
    ];
    for(const s of records(doc))for(const [kind,re0] of patterns){const re=new RegExp(re0.source,re0.flags);let m;while((m=re.exec(s.text))){items.push({kind,script_index:s.script_index,source:s.source,external:s.external,evidence:snippet(s.text,m.index)});if(items.length>=220)break}}
    return items;
  }

  function mediaEndState(graph,lifecycle){
    const items=(graph?.media?.items||[]).filter(x=>x?.type==='video'||x?.type==='audio').map(x=>{
      const related=(lifecycle?.events||[]).filter(e=>e.event==='ended').length>0;
      let end_behavior='source-driven';
      if(x.loop===true)end_behavior='loop';
      else if(x.play_once===true)end_behavior='hold-authored-final-state';
      else if(related)end_behavior='source-ended-handler';
      return {media_id:x.id||'',type:x.type,role:x.role||'',loop:x.loop??null,play_once:x.play_once??null,end_behavior,synthetic_hide:false,synthetic_reset:false};
    });
    return {version:1,strategy:'source-derived-only',items,synthetic_hide:false,synthetic_reset:false,synthetic_seek:false};
  }

  function augment(doc,opts,graph){
    const base=String(opts?.baseUrl||location.href);
    const ext=externalJs.map(({text,...x})=>x);
    graph.dependencies=graph.dependencies||{};
    graph.dependencies.external_script_records=ext;
    graph.dependencies.external_script_loaded=ext.filter(x=>x.loaded).length;
    graph.dependencies.external_script_failed=ext.filter(x=>!x.loaded).length;
    graph.dependencies.external_script_scan_complete=ext.length>0&&ext.every(x=>x.loaded);

    graph.animations=graph.animations||{nodes:[],keyframes:[],css_rules:[],script_apis:[],counts:{}};
    graph.animations.script_apis=Array.isArray(graph.animations.script_apis)?graph.animations.script_apis:[];
    for(const x of scanExternalAnimationApis(doc))addUnique(graph.animations.script_apis,x,y=>[y.api,y.script_index,y.evidence].join('|'));
    graph.animations.counts={...(graph.animations.counts||{}),script_apis:graph.animations.script_apis.length,external_script_apis:graph.animations.script_apis.filter(x=>x.external).length};

    const extraLife=scanLifecycleEvidence(doc,base);
    graph.lifecycle=graph.lifecycle||{};
    for(const key of ['events','timers','actions','targets','media']){
      graph.lifecycle[key]=Array.isArray(graph.lifecycle[key])?graph.lifecycle[key]:[];
      for(const x of extraLife[key])addUnique(graph.lifecycle[key],x,y=>[y.event||y.kind||y.action||y.selector||y.url,y.script_index,y.evidence||''].join('|'));
    }
    graph.lifecycle.counts={events:graph.lifecycle.events.length,timers:graph.lifecycle.timers.length,actions:graph.lifecycle.actions.length,targets:graph.lifecycle.targets.length,media:graph.lifecycle.media.length};
    graph.event_graph=eventGraph(graph.lifecycle);
    graph.randomness=scanRandomness(doc);

    graph.responsive=graph.responsive||{};
    const runtimeEvidence=responsiveRuntimeEvidence(doc);
    graph.responsive.behavior_contract={
      version:1,
      viewports:['desktop','tablet','mobile'],
      preserve_source_media_queries:true,
      preserve_source_runtime_checks:true,
      synthesize_breakpoints:false,
      settings_variant_count:Array.isArray(graph.responsive?.source_truth?.settings_variants)?graph.responsive.source_truth.settings_variants.length:0,
      media_query_count:Array.isArray(graph.responsive?.source_truth?.media_queries)?graph.responsive.source_truth.media_queries.length:0,
      runtime_evidence:runtimeEvidence
    };

    graph.compatibility_policy={...(graph.compatibility_policy||{}),media_end_state:mediaEndState(graph,graph.lifecycle),randomness:'source-evidence-only',external_js_execution:'never-execute-arbitrary-source-js'};
    graph.authority={...(graph.authority||{}),external_script_truth:'fetched-static-evidence',event_graph_truth:'static-source-evidence',randomness_truth:'source-evidence-only',responsive_truth:'source-settings-css-and-runtime-evidence',media_end_state_truth:'source-derived-only'};
    graph.diagnostics={...(graph.diagnostics||{}),external_scripts_loaded:ext.filter(x=>x.loaded).length,external_scripts_failed:ext.filter(x=>!x.loaded).length,event_graph_nodes:graph.event_graph.nodes.length,event_graph_edges:graph.event_graph.edges.length,randomness_evidence:graph.randomness.evidence.length,responsive_runtime_evidence:runtimeEvidence.length,lifecycle_media:graph.lifecycle.media.length};
    graph.source_truth_gap_closure_version=VERSION;
    return graph;
  }

  VR.makeSourceGraph=function(doc,opts={}){
    const graph=originalMakeSourceGraph(doc,opts);
    try{return augment(doc,opts,graph)}catch(err){
      console.error('[DINI SOURCE GAP CLOSURE] augment gagal; graph dasar dipertahankan.',err);
      graph.source_truth_gap_closure_error=String(err?.message||err);
      return graph;
    }
  };

  function bindPreloadControls(){
    const analyze=document.getElementById('analyzeBtn');
    const build=document.getElementById('buildBtn');
    const fetchBtn=document.getElementById('fetchSourceBtn');
    analyze?.addEventListener('click',()=>schedulePreload(),true);
    fetchBtn?.addEventListener('click',()=>{externalJs=[];preloadPromise=null},true);
    build?.addEventListener('click',async e=>{
      if(replayBuild){replayBuild=false;return}
      if(!preloadPromise)preloadPromise=schedulePreload();
      if(preloadPromise){
        e.preventDefault();e.stopImmediatePropagation();
        try{await preloadPromise}catch{}
        replayBuild=true;
        build.click();
      }
    },true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindPreloadControls,{once:true});else bindPreloadControls();

  g.DiniSourceTruthGapClosure={
    version:VERSION,
    preloadExternalScripts:schedulePreload,
    get externalScripts(){return externalJs.map(({text,...x})=>x)},
    get preloadPending(){return !!preloadPromise}
  };
  console.info('[DINI SOURCE GAP CLOSURE] V'+VERSION+' aktif — external JS evidence, event graph, randomness, responsive runtime, media end-state.');
})(window);
