(function(g){
  'use strict';
  if(g.DiniBackgroundLifecycleAdapter?.version)return;

  const VERSION='1.0.0';
  const CONTRACT_VERSION=1;
  const VR=g.DiniVisualResolver;
  if(!VR?.makeSourceGraph){
    console.warn('[DINI BACKGROUND] Visual resolver belum tersedia.');
    return;
  }
  const originalMakeSourceGraph=VR.makeSourceGraph.bind(VR);
  const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
  const hash=s=>{let h=2166136261;for(const c of String(s??'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')};
  const decode=v=>{try{const t=document.createElement('textarea');t.innerHTML=String(v||'');return t.value}catch{return String(v||'')}};
  const parseSettings=el=>{const raw=decode(el?.getAttribute?.('data-settings')||'');try{return raw?JSON.parse(raw):{}}catch{return{__parse_error:true,__raw:raw}}};
  const elementId=el=>el?.getAttribute?.('data-id')||((String(el?.className||'').match(/elementor-element-([A-Za-z0-9_-]+)/)||[])[1])||el?.id||'';
  const selectorFor=el=>{
    if(!el)return'';
    if(el.id)return '#'+el.id;
    const id=elementId(el);if(id)return '[data-id="'+id+'"]';
    return String(el.tagName||'element').toLowerCase();
  };
  const num=(v,fallback=null)=>Number.isFinite(Number(v))?Number(v):fallback;
  const yes=v=>/^(?:yes|true|1|on)$/i.test(clean(v));
  const abs=(u,base)=>{try{return new URL(String(u||''),base||document.baseURI||location.href).href}catch{return String(u||'')}};

  function slideshowInstance(el,index,{baseUrl=''}={}){
    const cfg=parseSettings(el);
    const gallery=Array.isArray(cfg.background_slideshow_gallery)?cfg.background_slideshow_gallery:[];
    if(!gallery.length)return null;
    const urls=gallery.map(x=>x?.url).filter(Boolean).map(u=>abs(String(u).replaceAll('\\/','/'),baseUrl));
    if(!urls.length)return null;
    const duration=num(cfg.background_slideshow_slide_duration,5000);
    const transitionDuration=num(cfg.background_slideshow_transition_duration,500);
    const transition=String(cfg.background_slideshow_slide_transition||'fade').toLowerCase();
    const ken=cfg.background_slideshow_ken_burns!==undefined?yes(cfg.background_slideshow_ken_burns):false;
    const direction=String(cfg.background_slideshow_ken_burns_zoom_direction||'in').toLowerCase();
    const position=String(cfg.background_position||cfg.background_slideshow_background_position||'').replaceAll('_',' ');
    const size=String(cfg.background_size||cfg.background_slideshow_background_size||'').replaceAll('_',' ');
    return {
      id:'background-slideshow-'+hash(selectorFor(el)+'|'+index),
      adapter:'elementor-background-slideshow',
      selector:selectorFor(el),
      element_id:elementId(el),
      frames:urls.map((url,i)=>({id:'bg-frame-'+hash(selectorFor(el)+'|'+i+'|'+url),index:i,url,source_authority:true})),
      item_count:urls.length,
      slide_duration_ms:duration,
      transition_duration_ms:transitionDuration,
      transition,
      loop:cfg.background_slideshow_loop===undefined?true:yes(cfg.background_slideshow_loop),
      ken_burns:{enabled:ken,direction:direction||'in'},
      geometry:{position:position||'',size:size||''},
      source_authority:true
    };
  }

  function detectLazyLifecycle(doc){
    const styles=[...doc.querySelectorAll('style')].map(x=>String(x.textContent||'')).join('\n');
    const scripts=[...doc.querySelectorAll('script')].map(x=>String(x.textContent||'')).join('\n');
    const hasCss=/\.e-con\.e-parent[^{}]*:not\(\.e-lazyloaded\)/i.test(styles);
    const hasScript=/lazyloadBackgrounds|e-lazyloaded|elementor\/lazyload\/observe/i.test(scripts);
    if(!hasCss&&!hasScript)return {enabled:false,version:1};
    let rootMargin='200px 0px 200px 0px';
    const m=scripts.match(/rootMargin\s*:\s*['"]([^'"]+)['"]/i);if(m?.[1])rootMargin=m[1];
    return {
      enabled:true,
      version:1,
      selector:'.e-con.e-parent:not(.e-no-lazyload)',
      loaded_class:'e-lazyloaded',
      root_margin:rootMargin,
      once:true,
      triggers:['DOMContentLoaded','elementor/lazyload/observe'],
      source_css_gate:hasCss,
      source_script_evidence:hasScript,
      source_authority:true
    };
  }

  function compile(doc,opts={}){
    const nodes=[...doc.querySelectorAll('[data-settings]')];
    const instances=nodes.map((el,index)=>slideshowInstance(el,index,opts)).filter(Boolean);
    const lazy=detectLazyLifecycle(doc);
    return {
      version:CONTRACT_VERSION,
      engine:'dini-background-lifecycle-adapter-v'+VERSION,
      slideshows:instances,
      lazy_background:lazy,
      counts:{
        slideshows:instances.length,
        frames:instances.reduce((n,x)=>n+x.item_count,0),
        fade:instances.filter(x=>x.transition==='fade').length,
        slide_left:instances.filter(x=>x.transition==='slide_left').length,
        slide_right:instances.filter(x=>x.transition==='slide_right').length,
        ken_burns:instances.filter(x=>x.ken_burns.enabled).length,
        lazy_background:lazy.enabled?1:0
      },
      runtime_policy:{
        exact_slide_duration:true,
        exact_transition_duration:true,
        exact_transition_mode:true,
        ken_burns_source_authoritative:true,
        lazy_background_source_lifecycle:true,
        no_duration_clamp:true,
        per_instance_state:true,
        arbitrary_source_js:false
      }
    };
  }

  VR.makeSourceGraph=function(doc,opts={}){
    const graph=originalMakeSourceGraph(doc,opts);
    try{
      const plan=compile(doc,opts);
      graph.behavior_adapters={...(graph.behavior_adapters||{}),background_lifecycle:plan};
      graph.authority={...(graph.authority||{}),background_lifecycle_truth:'elementor-data-settings-and-lazy-source-evidence'};
      graph.diagnostics={...(graph.diagnostics||{}),background_slideshow_count:plan.counts.slideshows,background_frame_count:plan.counts.frames,background_fade_count:plan.counts.fade,background_slide_left_count:plan.counts.slide_left,background_slide_right_count:plan.counts.slide_right,background_ken_burns_count:plan.counts.ken_burns,lazy_background_contract:plan.lazy_background.enabled};
      return graph;
    }catch(err){
      console.warn('[DINI BACKGROUND] compile gagal; graph lama dipertahankan.',err);
      graph.behavior_adapters={...(graph.behavior_adapters||{}),background_lifecycle:{version:CONTRACT_VERSION,engine:'dini-background-lifecycle-adapter-v'+VERSION,slideshows:[],lazy_background:{enabled:false},counts:{slideshows:0,frames:0},error:String(err?.message||err)}};
      return graph;
    }
  };

  g.DiniBackgroundLifecycleAdapter={version:VERSION,contract_version:CONTRACT_VERSION,compile,slideshowInstance,detectLazyLifecycle};
  console.info('[DINI BACKGROUND] V'+VERSION+' aktif — slideshow fade/slide + Ken Burns + Elementor lazy-background lifecycle.');
})(window);
