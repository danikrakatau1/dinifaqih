(function(g){
  'use strict';
  if(g.DiniAnimationScrollAdapter?.version)return;

  const VERSION='1.0.0';
  const CONTRACT_VERSION=1;
  const VR=g.DiniVisualResolver;
  if(!VR?.makeSourceGraph){
    console.warn('[DINI ANIMATION/SCROLL] Visual resolver belum tersedia.');
    return;
  }
  const originalMakeSourceGraph=VR.makeSourceGraph.bind(VR);
  const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
  const decode=v=>{try{const t=document.createElement('textarea');t.innerHTML=String(v||'');return t.value}catch{return String(v||'')}};
  const hash=s=>{let h=2166136261;for(const c of String(s??'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')};
  const num=v=>v===''||v==null?null:(Number.isFinite(Number(v))?Number(v):null);
  const elementId=el=>el?.getAttribute?.('data-id')||((String(el?.className||'').match(/elementor-element-([A-Za-z0-9_-]+)/)||[])[1])||el?.id||'';
  const selectorFor=el=>{
    if(!el)return'';
    if(el.id)return '#'+el.id;
    const id=elementId(el);if(id)return '[data-id="'+id+'"]';
    const cls=[...(el.classList||[])].find(x=>/^elementor-element-/.test(x));if(cls)return'.'+cls;
    return String(el.tagName||'element').toLowerCase();
  };
  const parseSettings=el=>{const raw=decode(el?.getAttribute?.('data-settings')||'');try{return raw?JSON.parse(raw):{}}catch{return{__parse_error:true,__raw:raw}}};

  function animationViewport(cfg,viewport){
    const suffix=viewport==='desktop'?'':'_'+viewport;
    const pick=(base)=>{
      const a='_'+base+suffix,b=base+suffix;
      if(Object.prototype.hasOwnProperty.call(cfg,a))return cfg[a];
      if(Object.prototype.hasOwnProperty.call(cfg,b))return cfg[b];
      return undefined;
    };
    const rawName=pick('animation');
    const rawDelay=pick('animation_delay');
    const rawDuration=pick('animation_duration');
    return {
      defined:rawName!==undefined||rawDelay!==undefined||rawDuration!==undefined,
      name:rawName===undefined?'':String(rawName),
      delay_ms:num(rawDelay),
      duration:rawDuration===undefined?null:rawDuration,
      source_authority:true
    };
  }

  function compileElementor(doc){
    const out=[];
    [...doc.querySelectorAll('[data-settings]')].forEach((el,index)=>{
      const cfg=parseSettings(el);
      const desktop=animationViewport(cfg,'desktop');
      const tablet=animationViewport(cfg,'tablet');
      const mobile=animationViewport(cfg,'mobile');
      if(!desktop.defined&&!tablet.defined&&!mobile.defined)return;
      out.push({
        id:'elementor-animation-'+hash(selectorFor(el)+'|'+index),
        adapter:'elementor-animation',
        selector:selectorFor(el),
        element_id:elementId(el),
        responsive:{desktop,tablet,mobile},
        trigger:{type:'intersection',profile:'elementor-compatible',source_threshold:null,source_root_margin:null},
        source_authority:true
      });
    });
    return out;
  }

  function splitConfig(raw){
    const out={};let buf='',depth=0,q='';
    const flush=()=>{
      const part=buf.trim();buf='';if(!part)return;
      const i=part.indexOf(':');if(i<1)return;
      out[clean(part.slice(0,i)).toLowerCase()]=clean(part.slice(i+1));
    };
    for(const c of String(raw||'')){
      if(q){buf+=c;if(c===q)q='';continue}
      if(c==='"'||c==="'"){q=c;buf+=c;continue}
      if(c==='('||c==='['){depth++;buf+=c;continue}
      if(c===')'||c===']'){depth=Math.max(0,depth-1);buf+=c;continue}
      if(c===';'&&depth===0){flush();continue}
      buf+=c;
    }
    flush();return out;
  }
  const bool=v=>/^(?:1|true|yes|on)$/i.test(clean(v));
  function compileScrollspy(doc){
    const attrs=['data-bdt-scrollspy','bdt-scrollspy','data-uk-scrollspy','uk-scrollspy'];
    const nodes=new Set();
    attrs.forEach(a=>doc.querySelectorAll('['+a+']').forEach(el=>nodes.add(el)));
    return [...nodes].map((el,index)=>{
      const attr=attrs.find(a=>el.hasAttribute?.(a))||'';
      const raw=String(el.getAttribute?.(attr)||'');
      const cfg=splitConfig(raw);
      return {
        id:'bdt-scrollspy-'+hash(selectorFor(el)+'|'+index),
        adapter:'bdt-scrollspy',
        selector:selectorFor(el),
        element_id:elementId(el),
        raw,
        config:{
          cls:cfg.cls||cfg.class||'',
          target:cfg.target||'',
          delay_ms:num(cfg.delay)??0,
          repeat:bool(cfg.repeat),
          offset:num(cfg.offset),
          hidden:cfg.hidden===undefined?null:bool(cfg.hidden)
        },
        source_authority:true
      };
    });
  }

  function parseRange(raw){
    const parts=String(raw||'').split(',').map(clean).filter(Boolean);
    if(!parts.length)return null;
    if(parts.length===1)return {from:'0',to:parts[0],implicit_from_zero:true};
    return {from:parts[0],to:parts[parts.length-1],implicit_from_zero:false};
  }
  function compileParallax(doc){
    const attrs=['data-bdt-parallax','bdt-parallax','data-uk-parallax','uk-parallax'];
    const nodes=new Set();
    attrs.forEach(a=>doc.querySelectorAll('['+a+']').forEach(el=>nodes.add(el)));
    const supported=new Set(['x','y','opacity','scale','rotate','bgx','bgy','background-x','background-y']);
    return [...nodes].map((el,index)=>{
      const attr=attrs.find(a=>el.hasAttribute?.(a))||'';
      const raw=String(el.getAttribute?.(attr)||'');
      const cfg=splitConfig(raw),properties={},unsupported={};
      for(const [k,v] of Object.entries(cfg)){
        if(['viewport','easing','target','start','end'].includes(k))continue;
        if(supported.has(k))properties[k]=parseRange(v);
        else unsupported[k]=v;
      }
      return {
        id:'bdt-parallax-'+hash(selectorFor(el)+'|'+index),
        adapter:'bdt-parallax',
        selector:selectorFor(el),
        element_id:elementId(el),
        raw,
        config:{
          viewport:num(cfg.viewport),
          easing:num(cfg.easing),
          target:cfg.target||'',
          start:cfg.start||'',
          end:cfg.end||''
        },
        properties,
        unsupported_properties:unsupported,
        source_authority:true
      };
    });
  }

  function compile(doc){
    const elementor=compileElementor(doc);
    const scrollspy=compileScrollspy(doc);
    const parallax=compileParallax(doc);
    const unsupportedParallax=parallax.reduce((n,x)=>n+Object.keys(x.unsupported_properties||{}).length,0);
    return {
      version:CONTRACT_VERSION,
      engine:'dini-animation-scroll-adapter-v'+VERSION,
      elementor,
      scrollspy,
      parallax,
      counts:{elementor:elementor.length,scrollspy:scrollspy.length,parallax:parallax.length,unsupported_parallax_properties:unsupportedParallax,total:elementor.length+scrollspy.length+parallax.length},
      runtime_policy:{
        arbitrary_source_js:false,
        source_delay_authoritative:true,
        responsive_none_authoritative:true,
        scrollspy_repeat_authoritative:true,
        parallax_transform_composition:'individual-css-transform-properties',
        generic_reveal_fallback_only:true
      }
    };
  }

  VR.makeSourceGraph=function(doc,opts={}){
    const graph=originalMakeSourceGraph(doc,opts);
    try{
      const plan=compile(doc);
      graph.behavior_adapters={...(graph.behavior_adapters||{}),animation_scroll:plan};
      graph.authority={...(graph.authority||{}),animation_scroll_truth:'source-settings-and-bdt-attributes'};
      graph.diagnostics={...(graph.diagnostics||{}),animation_adapter_count:plan.counts.elementor,scrollspy_adapter_count:plan.counts.scrollspy,parallax_adapter_count:plan.counts.parallax,unsupported_parallax_properties:plan.counts.unsupported_parallax_properties};
      return graph;
    }catch(err){
      console.warn('[DINI ANIMATION/SCROLL] compile gagal; source graph lama dipertahankan.',err);
      graph.behavior_adapters={...(graph.behavior_adapters||{}),animation_scroll:{version:CONTRACT_VERSION,engine:'dini-animation-scroll-adapter-v'+VERSION,elementor:[],scrollspy:[],parallax:[],counts:{total:0},error:String(err?.message||err)}};
      return graph;
    }
  };

  g.DiniAnimationScrollAdapter={version:VERSION,contract_version:CONTRACT_VERSION,compile,compileElementor,compileScrollspy,compileParallax,splitConfig,parseRange};
  console.info('[DINI ANIMATION/SCROLL] V'+VERSION+' aktif — Elementor responsive animation + BDT/UIkit Scrollspy/Parallax semantic plan.');
})(window);
