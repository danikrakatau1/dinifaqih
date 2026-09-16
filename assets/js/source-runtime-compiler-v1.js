(function(g){
  'use strict';
  if(g.DiniSourceRuntimeCompiler?.version)return;
  const VERSION='1.2.0';
  const VR=g.DiniVisualResolver;
  if(!VR?.makeSourceGraph||!VR?.sanitizeRuntimeNoise)return;

  const graphByDoc=new WeakMap();
  const originalGraph=VR.makeSourceGraph.bind(VR);
  const originalSanitize=VR.sanitizeRuntimeNoise.bind(VR);
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();

  function resolveVars(code){
    const out=new Map();let m;
    const patterns=[
      /(?:const|let|var)\s+([\w$]+)\s*=\s*document\.getElementById\(\s*['"]([^'"]+)['"]\s*\)/g,
      /(?:const|let|var)\s+([\w$]+)\s*=\s*document\.querySelector(?:All)?\(\s*['"]([^'"]+)['"]\s*\)/g,
      /(?:const|let|var)\s+([\w$]+)\s*=\s*(?:jQuery|\$)\(\s*['"]([^'"]+)['"]\s*\)/g
    ];
    for(const [i,re] of patterns.entries())while((m=re.exec(code)))out.set(m[1],i===0?'#'+m[2]:m[2]);
    return out;
  }

  function selectorOf(expr,vars){
    const x=String(expr||'').trim();let m;
    if((m=x.match(/document\.getElementById\(\s*['"]([^'"]+)['"]\s*\)/)))return '#'+m[1];
    if((m=x.match(/document\.querySelector(?:All)?\(\s*['"]([^'"]+)['"]\s*\)/)))return m[1];
    if((m=x.match(/(?:jQuery|\$)\(\s*['"]([^'"]+)['"]\s*\)/)))return m[1];
    if(vars.has(x))return vars.get(x);
    return '';
  }

  function parseCssObject(raw){
    const out={};for(const m of String(raw||'').matchAll(/([\w-]+)\s*:\s*(?:['"]([^'"]*)['"]|(-?\d+(?:\.\d+)?))/g))out[m[1]]=m[2]??m[3];return out;
  }

  function add(list,cmd){
    if(!cmd?.type)return;
    const key=JSON.stringify(cmd);
    if(!list.some(x=>JSON.stringify(x)===key))list.push(cmd);
  }

  function parseOps(code,vars,delay=0){
    const out=[];let m;
    // Named source helpers are converted to narrowly scoped semantics, never executed as source JS.
    if(/\benableScroll\s*\(/.test(code))add(out,{type:'scroll-unlock',delay_ms:delay});
    if(/\bdisableScroll\s*\(/.test(code))add(out,{type:'scroll-lock',delay_ms:delay});
    if(/\b(?:_?playAudio|playMusic)\s*\(/i.test(code))add(out,{type:'play-audio-all',delay_ms:delay});
    if(/\bshowAllSect\s*\(/i.test(code))add(out,{type:'reveal-sections',delay_ms:delay});

    const styleVar=/([\w$]+)\.style\.([\w-]+)\s*=\s*['"]([^'"]*)['"]/g;
    while((m=styleVar.exec(code))){const selector=selectorOf(m[1],vars);if(selector)add(out,{type:'style',selector,property:m[2],value:m[3],delay_ms:delay})}
    const directStyle=/((?:document\.)?(?:getElementById|querySelector)\([^)]*\))\.style\.([\w-]+)\s*=\s*['"]([^'"]*)['"]/g;
    while((m=directStyle.exec(code))){const selector=selectorOf(m[1],vars);if(selector)add(out,{type:'style',selector,property:m[2],value:m[3],delay_ms:delay})}

    const mediaVar=/([\w$]+)\.(play|pause)\s*\(/g;
    while((m=mediaVar.exec(code))){const selector=selectorOf(m[1],vars);if(selector)add(out,{type:m[2]==='play'?'play':'pause',selector,delay_ms:delay})}
    const mediaDirect=/((?:document\.)?(?:getElementById|querySelector)\([^)]*\))\.(play|pause)\s*\(/g;
    while((m=mediaDirect.exec(code))){const selector=selectorOf(m[1],vars);if(selector)add(out,{type:m[2]==='play'?'play':'pause',selector,delay_ms:delay})}

    const jqAnimate=/(?:jQuery|\$)\(\s*['"]([^'"]+)['"]\s*\)\.animate\(\s*\{([\s\S]*?)\}\s*,\s*(\d+)\s*\)/g;
    while((m=jqAnimate.exec(code)))add(out,{type:'animate-style',selector:m[1],properties:parseCssObject(m[2]),duration_ms:Number(m[3]),delay_ms:delay});
    const jqVis=/(?:jQuery|\$)\(\s*['"]([^'"]+)['"]\s*\)\.(hide|show|fadeIn|fadeOut)\(\s*(\d*)\s*\)/g;
    while((m=jqVis.exec(code))){
      const kind=m[2]==='fadeIn'?'fade-in':m[2]==='fadeOut'?'fade-out':m[2];
      add(out,{type:kind,selector:m[1],duration_ms:Number(m[3]||0),delay_ms:delay});
    }

    const cls=/([\w$]+)\.classList\.(add|remove)\(\s*['"]([^'"]+)['"]\s*\)/g;
    while((m=cls.exec(code))){const selector=selectorOf(m[1],vars);if(selector)add(out,{type:'class-'+m[2],selector,class_name:m[3],delay_ms:delay})}

    // Timers are source-authored. Keep exact numeric delay; never synthesize stagger values.
    const timerArrow=/setTimeout\s*\(\s*\(\s*\)\s*=>\s*\{([\s\S]{0,1800}?)\}\s*,\s*(\d{1,7})\s*\)/g;
    while((m=timerArrow.exec(code)))for(const x of parseOps(m[1],vars,delay+Number(m[2])))add(out,x);
    const timerFn=/setTimeout\s*\(\s*function\s*\([^)]*\)\s*\{([\s\S]{0,1800}?)\}\s*,\s*(\d{1,7})\s*\)/g;
    while((m=timerFn.exec(code)))for(const x of parseOps(m[1],vars,delay+Number(m[2])))add(out,x);
    const timerExpr=/setTimeout\s*\(\s*\(\s*\)\s*=>\s*([^,{][^,]{0,480})\s*,\s*(\d{1,7})\s*\)/g;
    while((m=timerExpr.exec(code)))for(const x of parseOps(m[1],vars,delay+Number(m[2])))add(out,x);
    return out;
  }

  function extractBraceBlock(code,braceAt){
    let depth=0,quote='',escape=false,line=false,block=false;
    for(let i=braceAt;i<code.length;i++){
      const c=code[i],n=code[i+1];
      if(line){if(c==='\n')line=false;continue}
      if(block){if(c==='*'&&n==='/'){block=false;i++}continue}
      if(quote){if(escape){escape=false;continue}if(c==='\\'){escape=true;continue}if(c===quote)quote='';continue}
      if(c==='/'&&n==='/'){line=true;i++;continue}if(c==='/'&&n==='*'){block=true;i++;continue}
      if(c==='"'||c==="'"||c==='`'){quote=c;continue}
      if(c==='{')depth++;else if(c==='}'){depth--;if(depth===0)return code.slice(braceAt+1,i)}
    }
    return '';
  }

  function localFunctionBodies(code){
    const out=new Map();let m;
    const declared=/\bfunction\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/g;
    while((m=declared.exec(code))){
      const brace=code.indexOf('{',m.index);
      const body=extractBraceBlock(code,brace);
      if(body)out.set(m[1],body);
    }
    const assigned=/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:function\s*\([^)]*\)|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)\s*\{/g;
    while((m=assigned.exec(code))){
      const brace=code.indexOf('{',m.index);
      const body=extractBraceBlock(code,brace);
      if(body&&!out.has(m[1]))out.set(m[1],body);
    }
    return out;
  }

  function expandLocalCalls(body,vars,fnMap,delay=0,visited=new Set()){
    const out=[];
    for(const cmd of parseOps(body,vars,delay))add(out,cmd);
    const call=/\b([A-Za-z_$][\w$]*)\s*\(/g;let m;
    while((m=call.exec(String(body||'')))){
      const name=m[1];
      if(!fnMap.has(name)||visited.has(name))continue;
      const next=new Set(visited);next.add(name);
      const nested=fnMap.get(name);
      for(const cmd of expandLocalCalls(nested,vars,fnMap,delay,next))add(out,cmd);
    }
    return out;
  }

  function eventBodies(code,vars){
    const out=[];let m;
    const direct=/(document\.getElementById\(\s*['"][^'"]+['"]\s*\)|document\.querySelector\(\s*['"][^'"]+['"]\s*\)|[\w$]+)\.on(click|load|ended|pause|play|touchend)\s*=\s*(?:function\s*\([^)]*\)|\([^)]*\)\s*=>|[\w$]+\s*=>)?\s*\{/g;
    while((m=direct.exec(code))){const selector=selectorOf(m[1],vars);const brace=code.indexOf('{',m.index);const body=extractBraceBlock(code,brace);if(body)out.push({event:m[2],selector,body,index:m.index})}
    const add=/(document|window|[\w$]+)\.addEventListener\(\s*['"]([\w:-]+)['"]\s*,\s*(?:function\s*\([^)]*\)|\([^)]*\)\s*=>|[\w$]+\s*=>)?\s*\{/g;
    while((m=add.exec(code))){const selector=m[1]==='document'?'document':m[1]==='window'?'window':selectorOf(m[1],vars);const brace=code.indexOf('{',m.index);const body=extractBraceBlock(code,brace);if(body)out.push({event:m[2],selector,body,index:m.index})}
    const jq=/(?:jQuery|\$)\(\s*['"]([^'"]+)['"]\s*\)\.(click|on)\(\s*(?:['"]([\w:-]+)['"]\s*,\s*)?(?:function\s*\([^)]*\)|\([^)]*\)\s*=>)?\s*\{/g;
    while((m=jq.exec(code))){const brace=code.indexOf('{',m.index);const body=extractBraceBlock(code,brace);if(body)out.push({event:m[3]||'click',selector:m[1],body,index:m.index})}
    return out;
  }

  function compileSafePlan(doc,graph){
    const scripts=[...doc.querySelectorAll('script')].filter(s=>!s.src&&clean(s.textContent)).map(s=>String(s.textContent||''));
    const interactions=graph?.interactions||[];
    const openSelector=interactions.find(x=>x.type==='open-invitation')?.selector||'';
    const initial=[];const onOpen=[];const handlers=[];
    let sourceTimerCount=0;
    for(const code of scripts){
      const vars=resolveVars(code);
      const fnMap=localFunctionBodies(code);
      if(/\bdisableScroll\s*\(\s*\)\s*;/.test(code))add(initial,{type:'scroll-lock',delay_ms:0});
      const bodies=eventBodies(code,vars);
      for(const h of bodies){
        const cmds=expandLocalCalls(h.body,vars,fnMap,0,new Set());
        sourceTimerCount+=(h.body.match(/setTimeout\s*\(/g)||[]).length;
        for(const [name,fnBody] of fnMap){
          if(new RegExp('\\b'+name.replace(/[$]/g,'\\$&')+'\\s*\\(').test(h.body))sourceTimerCount+=(fnBody.match(/setTimeout\s*\(/g)||[]).length;
        }
        handlers.push({event:h.event,selector:h.selector||'',command_count:cmds.length});
        const isOpen=h.event==='click'&&((openSelector&&h.selector===openSelector)||/tombolbuka|openInvitation|buka/i.test(h.selector||''));
        if(isOpen)for(const cmd of cmds)add(onOpen,cmd);
      }
    }
    if(openSelector&&!onOpen.some(x=>x.type==='scroll-unlock'))add(onOpen,{type:'scroll-unlock',delay_ms:0,source:'interaction-fallback'});
    if(openSelector&&!onOpen.some(x=>x.type==='reveal-sections'))add(onOpen,{type:'reveal-sections',delay_ms:0,source:'interaction-fallback'});
    const mediaItems=graph?.media?.items||[];
    if(openSelector&&mediaItems.some(x=>x.type==='audio')&&!onOpen.some(x=>x.type==='play-audio-all'))add(onOpen,{type:'play-audio-all',delay_ms:0,source:'media-fallback'});
    onOpen.sort((a,b)=>(a.delay_ms||0)-(b.delay_ms||0));
    return {version:1,compiler:`dini-safe-lifecycle-v${VERSION}`,open_selector:openSelector,initial,on_open:onOpen,handlers,source_timer_count:sourceTimerCount,uses_source_delays:true,synthetic_stagger:false,arbitrary_source_js:false,confidence:openSelector?(onOpen.length?0.9:0.6):0.5};
  }

  VR.makeSourceGraph=function(doc,opts={}){
    const graph=originalGraph(doc,opts);
    try{
      graph.lifecycle=graph.lifecycle||{};
      graph.lifecycle.safe_plan=compileSafePlan(doc,graph);
      graph.runtime_policy={compiler:`dini-source-runtime-v${VERSION}`,execute_arbitrary_source_js:false,source_delay_authoritative:true,synthetic_stagger:false,source_transform_authoritative:true,editor_pause_non_destructive:true};
      graphByDoc.set(doc,graph);
    }catch(err){console.warn('[DINI SOURCE RUNTIME] compile plan gagal',err)}
    return graph;
  };

  function runtimeText(){return `(()=>{
'use strict';
const tpl=document.querySelector('template[data-dini-source-truth]');let G={};try{const raw=tpl?.content?.textContent||tpl?.textContent||'{}';G=JSON.parse(raw)}catch(e){console.warn('SOURCE_TRUTH_JSON',e)}
const plan=G?.lifecycle?.safe_plan||{};const animations=G?.animations?.nodes||[];const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const q=s=>{try{return s==='document'?document:s==='window'?window:document.querySelector(s)}catch{return null}};
const qa=s=>{try{return s==='document'?[document]:s==='window'?[window]:[...document.querySelectorAll(s)]}catch{return[]}};
const unlock=()=>{document.body.classList.remove('stop-scrolling','locked-section');document.documentElement.style.removeProperty('overflow');document.body.style.removeProperty('overflow');document.documentElement.style.setProperty('overflow-y','auto','important');document.body.style.setProperty('overflow-y','auto','important');document.body.style.setProperty('touch-action','pan-y','important')};
const lock=()=>{document.body.style.setProperty('overflow','hidden','important')};
const revealSections=()=>{for(const s of document.querySelectorAll('.elementor-top-section,body>section')){if(s.id==='cover')continue;s.hidden=false;s.removeAttribute('aria-hidden')}};
const reveal=el=>{if(!el)return;const mobile=matchMedia('(max-width:767px)').matches;let name=(mobile?el.getAttribute('data-native-animation-mobile'):el.getAttribute('data-native-animation'))||el.getAttribute('data-native-reveal')||'';if(name==='none')name='';el.classList.remove('elementor-invisible');el.classList.add('native-visible');if(name&&!reduce){el.classList.add('animated',name);const d=Number(el.getAttribute('data-native-animation-delay')||0);if(d>0)el.style.animationDelay=d+'ms'}};
const run=cmd=>{const delay=Math.max(0,Number(cmd?.delay_ms)||0);setTimeout(()=>{try{if(cmd.type==='scroll-unlock')return unlock();if(cmd.type==='scroll-lock')return lock();if(cmd.type==='reveal-sections')return revealSections();if(cmd.type==='play-audio-all'){document.querySelectorAll('audio').forEach(a=>a.play?.().catch(()=>{}));return}const els=cmd.selector?qa(cmd.selector):[];if(cmd.type==='play'){els.forEach(x=>x.play?.().catch(()=>{}));return}if(cmd.type==='pause'){els.forEach(x=>x.pause?.());return}if(cmd.type==='style'){els.forEach(x=>x?.style?.setProperty(cmd.property,String(cmd.value)));return}if(cmd.type==='class-add'){els.forEach(x=>x.classList?.add(cmd.class_name));return}if(cmd.type==='class-remove'){els.forEach(x=>x.classList?.remove(cmd.class_name));return}if(cmd.type==='show'){els.forEach(x=>{x.hidden=false;x.style.removeProperty('display')});return}if(cmd.type==='hide'){setTimeout(()=>els.forEach(x=>x.style.setProperty('display','none','important')),Math.max(0,Number(cmd.duration_ms)||0));return}if(cmd.type==='fade-in'){const d=Math.max(0,Number(cmd.duration_ms)||0);els.forEach(x=>{x.hidden=false;x.style.removeProperty('display');if(!d){x.style.opacity='1';return}try{x.animate([{opacity:0},{opacity:1}],{duration:d,fill:'forwards',easing:'linear'})}catch{x.style.opacity='1'}});return}if(cmd.type==='fade-out'){const d=Math.max(0,Number(cmd.duration_ms)||0);els.forEach(x=>{if(!d){x.style.opacity='0';x.style.setProperty('display','none','important');return}try{const a=x.animate([{opacity:getComputedStyle(x).opacity||1},{opacity:0}],{duration:d,fill:'forwards',easing:'linear'});a.addEventListener?.('finish',()=>x.style.setProperty('display','none','important'),{once:true})}catch{setTimeout(()=>{x.style.opacity='0';x.style.setProperty('display','none','important')},d)}});return}if(cmd.type==='animate-style'){els.forEach(x=>{const end={};for(const [k,v] of Object.entries(cmd.properties||{}))end[k]=v;const cs=getComputedStyle(x),start={};for(const k of Object.keys(end))start[k]=cs[k]||cs.getPropertyValue(k);try{x.animate([start,end],{duration:Math.max(0,Number(cmd.duration_ms)||0),fill:'forwards',easing:'linear'})}catch{for(const [k,v] of Object.entries(end))x.style.setProperty(k,v)}});return}}catch(e){console.warn('SOURCE_SAFE_CMD',cmd,e)}},delay)};
(plan.initial||[]).forEach(run);
let opened=false;const openSel=plan.open_selector||G?.interactions?.find?.(x=>x.type==='open-invitation')?.selector||'';let btn=q(openSel)||document.querySelector('[data-native-open],#tombolbuka,.tombolbuka');if(btn&&!btn.matches('a,button,[role=button]'))btn=btn.querySelector('a,button,[role=button]')||btn;
const cover=document.querySelector('#cover')||btn?.closest?.('.elementor-top-section,section,[data-element_type="section"]')||null;
const startObserver=()=>{const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){reveal(e.target);io.unobserve(e.target)}}),{threshold:.12,rootMargin:'0px 0px -6%'});document.querySelectorAll('[data-native-reveal]').forEach(el=>{if(cover?.contains(el))return;io.observe(el)})};
if(cover)cover.querySelectorAll('[data-native-reveal]').forEach(reveal);if(btn){btn.classList.remove('elementor-invisible');btn.setAttribute('data-native-open','1');reveal(btn)}
const open=ev=>{if(opened)return;opened=true;if(ev){ev.preventDefault();ev.stopPropagation()}(plan.on_open||[]).forEach(run);startObserver();if(cover&&!plan.on_open?.some?.(x=>x.selector==='#cover'&&(x.type==='animate-style'||x.type==='hide'||x.type==='fade-out'))){cover.style.transition='opacity .45s ease';cover.style.opacity='0';setTimeout(()=>{cover.style.display='none';cover.setAttribute('aria-hidden','true')},450)}};
if(btn){btn.addEventListener('click',open,{capture:true});btn.addEventListener('touchend',open,{passive:false,capture:true})}else{unlock();startObserver()}
const startCountdown=()=>document.querySelectorAll('[data-date]').forEach(root=>{if(root.dataset.nativeCountdown)return;root.dataset.nativeCountdown='1';const tick=()=>{const target=Date.parse(root.getAttribute('data-date')||'');if(!Number.isFinite(target))return;let left=Math.max(0,target-Date.now());const d=Math.floor(left/86400000);left-=d*86400000;const h=Math.floor(left/3600000);left-=h*3600000;const m=Math.floor(left/60000);left-=m*60000;const s=Math.floor(left/1000);const put=(sel,v)=>{const el=root.querySelector(sel);if(el)el.textContent=String(v).padStart(2,'0')};put('[data-days]',d);put('[data-hours]',h);put('[data-minutes]',m);put('[data-seconds]',s)};tick();setInterval(tick,1000)});startCountdown();
document.documentElement.setAttribute('data-dini-source-runtime','${VERSION}');
})();`}

  function installAppendInterceptors(doc,graph){
    const patchHost=host=>{
      if(!host||host.__diniSourceRuntimePatched)return;host.__diniSourceRuntimePatched=true;
      const original=host.appendChild.bind(host);
      host.appendChild=function(node){
        try{
          if(node?.tagName==='STYLE'){
            let t=String(node.textContent||'');
            // Remove only destructive blanket transform resets. Other compatibility CSS stays intact.
            t=t.replace(/\[data-native-preserve-layout\]\s*\{\s*transform\s*:\s*none\s*!important\s*;?\s*\}/ig,'[data-native-preserve-layout]{}');
            t=t.replace(/(\[data-native-open\]\s*\{[^}]*?)transform\s*:\s*none\s*!important\s*;?/ig,'$1');
            if(node.hasAttribute?.('data-native-open-visibility'))t=t.replace(/transform\s*:\s*none\s*!important\s*;?/ig,'');
            node.textContent=t;
          }
          if(node?.tagName==='SCRIPT'&&node.hasAttribute?.('data-dini-source-native-runtime')&&graph?.source_truth_version){
            node.setAttribute('data-dini-source-native-runtime','source-truth-v1');node.textContent=runtimeText();
          }
        }catch(err){console.warn('[DINI SOURCE RUNTIME] append intercept',err)}
        return original(node);
      };
    };
    patchHost(doc.head);patchHost(doc.body);
  }

  function writeTruthTemplate(doc,tpl,graph){
    const text=doc.createTextNode(JSON.stringify(graph));
    if(tpl.content?.replaceChildren)tpl.content.replaceChildren(text);
    else tpl.textContent=JSON.stringify(graph);
  }

  VR.sanitizeRuntimeNoise=function(doc){
    const r=originalSanitize(doc);
    try{
      const graph=graphByDoc.get(doc);
      if(graph?.source_truth_version){
        let tpl=doc.querySelector('template[data-dini-source-truth]');if(!tpl){tpl=doc.createElement('template');tpl.setAttribute('data-dini-source-truth','1');doc.body.appendChild(tpl)}
        writeTruthTemplate(doc,tpl,graph);
        installAppendInterceptors(doc,graph);
      }
    }catch(err){console.warn('[DINI SOURCE RUNTIME] install gagal; legacy runtime dipertahankan',err)}
    return r;
  };

  g.DiniSourceRuntimeCompiler={version:VERSION,compileSafePlan,graphByDoc};
  console.info('[DINI SOURCE RUNTIME] V'+VERSION+' aktif — safe lifecycle compiler, no arbitrary source JS.');
})(window);