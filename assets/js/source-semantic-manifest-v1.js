(function(g){
  'use strict';
  if(g.DiniSemanticManifest?.version)return;

  const VERSION='1.0.0';
  const MANIFEST_VERSION=1;
  const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
  const clone=v=>{try{return structuredClone(v)}catch{try{return JSON.parse(JSON.stringify(v))}catch{return v}}};
  const uniq=a=>[...new Set((a||[]).filter(v=>v!==''&&v!=null))];
  const hash=s=>{
    let h=2166136261;
    for(const c of String(s??'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}
    return (h>>>0).toString(16).padStart(8,'0');
  };
  const decode=v=>{
    try{const t=document.createElement('textarea');t.innerHTML=String(v||'');return t.value}catch{return String(v||'')}
  };
  const parseSettings=el=>{
    const raw=decode(el?.getAttribute?.('data-settings')||'');
    if(!raw)return{};
    try{return JSON.parse(raw)}catch{return{__parse_error:true,__raw:raw}}
  };
  const elementId=el=>el?.getAttribute?.('data-id')||((String(el?.className||'').match(/elementor-element-([a-zA-Z0-9_-]+)/)||[])[1])||el?.id||'';
  const selectorFor=el=>{
    if(!el)return'';
    if(el.id)return '#'+el.id;
    const id=elementId(el);
    if(id)return `[data-id="${id}"]`;
    const cls=[...(el.classList||[])].find(x=>/^elementor-element-/.test(x));
    if(cls)return'.'+cls;
    return String(el.tagName||'element').toLowerCase();
  };
  const safeArray=v=>Array.isArray(v)?v:[];
  const normalizeWidgetType=raw=>{
    const v=String(raw||'').replace(/\.default$/,'');
    const map={
      'image-carousel':'image-carousel',
      'media-carousel':'media-carousel',
      'testimonial-carousel':'testimonial-carousel',
      'gallery':'gallery',
      'video':'video',
      'form':'form',
      'counter':'counter',
      'icon-list':'icon-list',
      'social-icons':'social-links',
      'weddingpress-countdown':'countdown',
      'weddingpress-timeline':'timeline',
      'weddingpress-copy-text':'copy-action',
      'weddingpress-kit2':'guestbook',
      'weddingpress-audio':'audio',
      'weddingpress-datekit':'calendar-cta'
    };
    return map[v]||v||'widget';
  };
  const nearestSectionId=el=>{
    const sec=el?.closest?.('.elementor-top-section,body > section,section');
    return elementId(sec)||sec?.id||'';
  };
  const itemCountFor=(el,type)=>{
    if(!el)return 0;
    const selectors={
      'image-carousel':'.swiper-slide',
      'media-carousel':'.swiper-slide',
      'testimonial-carousel':'.swiper-slide',
      'gallery':'.e-gallery-item,.elementor-gallery-item',
      'timeline':'.weddingpress-timeline-item',
      'guestbook':'.cui-item-comment',
      'icon-list':'.elementor-icon-list-item',
      'social-links':'.elementor-grid-item',
      'form':'.elementor-field-group'
    };
    const q=selectors[type];
    return q?el.querySelectorAll(q).length:0;
  };
  const actionStateFor=el=>{
    const link=el?.matches?.('a,button,[role="button"]')?el:el?.querySelector?.('a,button,[role="button"]');
    if(!link)return null;
    const disabled=link.hasAttribute('disabled')||link.getAttribute('aria-disabled')==='true'||link.classList?.contains('disabled');
    const href=link.getAttribute?.('href');
    return {state:disabled?'disabled':href&&href!=='#'&&!/^javascript:/i.test(href)?'bound':'unbound',href:href||'',target:link.getAttribute?.('target')||'',label:clean(link.textContent)};
  };

  function compileComponents(doc,nativeSchema){
    const out=[];const seen=new Set();
    const add=(el,{kind='widget',type='',index=0}={})=>{
      if(!el)return;
      const sourceId=elementId(el)||el.id||'';
      const selector=selectorFor(el);
      const widgetRaw=el.getAttribute?.('data-widget_type')||'';
      const normalized=type||normalizeWidgetType(widgetRaw);
      const stableKey=[kind,normalized,sourceId,selector,index].join('|');
      const id='cmp-'+hash(stableKey);
      if(seen.has(id))return;seen.add(id);
      const settings=parseSettings(el);
      const action=actionStateFor(el);
      out.push({
        id,
        source_id:sourceId,
        kind,
        type:normalized,
        widget_type:widgetRaw,
        selector,
        section_id:nearestSectionId(el),
        order:out.length,
        item_count:itemCountFor(el,normalized),
        settings,
        action,
        classes:uniq(String(el.className||'').split(/\s+/)).slice(0,80),
        editable_field_ids:safeArray(nativeSchema?.fields).filter(f=>f?.source_element_id===sourceId||f?.node_id===el.getAttribute?.('data-native-node-id')).map(f=>f.id),
        source_authority:true
      });
    };
    [...doc.querySelectorAll('.elementor-top-section,body > section')].forEach((el,i)=>add(el,{kind:'section',type:'section',index:i}));
    [...doc.querySelectorAll('[data-widget_type]')].forEach((el,i)=>add(el,{kind:'widget',index:i}));
    return out;
  }

  function compileAssets(sourceGraph,visualManifest){
    const out=[],seen=new Set();
    const add=x=>{
      const url=String(x?.url||'');
      const key=x?.id||x?.source_key||hash([x?.type,x?.role,url,x?.owner_selector,x?.element_id].join('|'));
      if(seen.has(key))return;seen.add(key);
      out.push({
        id:'asset-'+hash(key),
        type:x?.type||'asset',
        role:x?.role||x?.semantic_role||'',
        url,
        element_id:x?.element_id||'',
        owner_selector:x?.owner_selector||'',
        render_target:x?.render_target||'',
        source_key:x?.source_key||'',
        source_location:x?.source_location||'',
        source_property:x?.source_property||'',
        media_query:x?.media_query||'',
        source_authority:true
      });
    };
    safeArray(sourceGraph?.media?.items).forEach(add);
    safeArray(visualManifest?.sources).forEach(add);
    safeArray(sourceGraph?.visuals).forEach(add);
    return out;
  }

  function compileBehaviors(sourceGraph){
    const anim=safeArray(sourceGraph?.animations?.nodes).map(x=>({id:x.id||'behavior-'+hash(JSON.stringify(x)),kind:'animation',...clone(x),source_authority:true}));
    const lifecycle=[];
    const lc=sourceGraph?.lifecycle||{};
    for(const x of safeArray(lc.events))lifecycle.push({id:x.id||'behavior-'+hash(JSON.stringify(x)),kind:'event',...clone(x),source_authority:true});
    for(const x of safeArray(lc.timers))lifecycle.push({id:x.id||'behavior-'+hash(JSON.stringify(x)),kind:'timer',...clone(x),source_authority:true});
    for(const x of safeArray(lc.actions))lifecycle.push({id:x.id||'behavior-'+hash(JSON.stringify(x)),kind:'action',...clone(x),source_authority:true});
    return [...anim,...lifecycle];
  }

  function compileInteractions(sourceGraph,components){
    const raw=safeArray(sourceGraph?.interactions).map((x,i)=>({id:x?.id||'interaction-'+hash(JSON.stringify(x)||String(i)),...clone(x),source_authority:true}));
    const semantic=components.filter(c=>c.action).map(c=>({
      id:'interaction-'+hash(c.id+'|action'),
      type:'component-action',
      component_id:c.id,
      action:clone(c.action),
      source_authority:true
    }));
    return [...raw,...semantic];
  }

  function compileCapabilities(components,sourceGraph){
    const set=new Set();
    components.forEach(c=>set.add(c.type));
    const frameworks=safeArray(sourceGraph?.dependencies?.frameworks);
    frameworks.forEach(x=>set.add('framework:'+x));
    if(safeArray(sourceGraph?.animations?.nodes).length)set.add('animations');
    if(safeArray(sourceGraph?.lifecycle?.timers).length)set.add('timers');
    if(safeArray(sourceGraph?.lifecycle?.events).length)set.add('lifecycle-events');
    if(safeArray(sourceGraph?.personalization?.fields).length||safeArray(sourceGraph?.personalization?.candidates).length)set.add('personalization');
    return [...set].sort();
  }

  function compileDiagnostics({components,assets,behaviors,sourceGraph,nativeSchema}){
    const warnings=[];
    if(sourceGraph?.source_truth_error)warnings.push({code:'SOURCE_TRUTH_SCAN_ERROR',severity:'warning',message:String(sourceGraph.source_truth_error)});
    const parseErrors=components.filter(c=>c.settings?.__parse_error);
    if(parseErrors.length)warnings.push({code:'COMPONENT_SETTINGS_PARSE_ERROR',severity:'warning',count:parseErrors.length,component_ids:parseErrors.map(x=>x.id)});
    const duplicateSourceIds={};
    components.forEach(c=>{if(c.source_id)(duplicateSourceIds[c.source_id]=(duplicateSourceIds[c.source_id]||0)+1)});
    const dup=Object.entries(duplicateSourceIds).filter(([,n])=>n>1);
    if(dup.length)warnings.push({code:'DUPLICATE_SOURCE_ID',severity:'info',items:dup.map(([source_id,count])=>({source_id,count}))});
    return {
      version:1,
      warnings,
      counts:{
        components:components.length,
        assets:assets.length,
        behaviors:behaviors.length,
        native_fields:safeArray(nativeSchema?.fields).length,
        personalization_fields:safeArray(sourceGraph?.personalization?.fields).length,
        personalization_candidates:safeArray(sourceGraph?.personalization?.candidates).length
      }
    };
  }

  function compile({doc,sourceGraph={},visualManifest={},nativeSchema={},sourceUrl='',createdAt=''}={}){
    if(!doc?.querySelectorAll)throw new Error('DiniSemanticManifest.compile membutuhkan Document source.');
    const components=compileComponents(doc,nativeSchema);
    const assets=compileAssets(sourceGraph,visualManifest);
    const behaviors=compileBehaviors(sourceGraph);
    const interactions=compileInteractions(sourceGraph,components);
    const personalization=clone(sourceGraph?.personalization||{version:1,fields:[],candidates:[],binding_policy:{}});
    const responsive=clone(sourceGraph?.responsive||{version:1});
    const dependencies=clone(sourceGraph?.dependencies||{version:1,external_scripts:[],stylesheets:[],fonts:[],frameworks:[]});
    const diagnostics=compileDiagnostics({components,assets,behaviors,sourceGraph,nativeSchema});
    return {
      format:'dini-universal-runtime-manifest',
      version:MANIFEST_VERSION,
      compiler:`dini-semantic-manifest-v${VERSION}`,
      created_at:createdAt||new Date().toISOString(),
      source:{
        url:sourceUrl||sourceGraph?.source?.url||'',
        html_bytes:sourceGraph?.source?.html_bytes??null,
        html_hash:sourceGraph?.source?.html_hash||'',
        css_hash:sourceGraph?.source?.css_hash||'',
        hash_algorithm:sourceGraph?.source?.hash_algorithm||''
      },
      authority:{
        mode:'source-authoritative-semantic-contract',
        source_truth:sourceGraph?.authority?.source_truth||'fetched-source',
        visual_ownership:sourceGraph?.authority?.visual_ownership||'source-graph',
        mutation_policy:'none-at-compile-time',
        arbitrary_source_js:false,
        plugin_specific_template_hardcode:false
      },
      components,
      assets,
      behaviors,
      interactions,
      responsive,
      layout:{version:1,mode:'source-native',topology:'unclassified',source_authority:true},
      personalization,
      dependencies,
      capabilities:compileCapabilities(components,sourceGraph),
      editor_contract:{
        component_identity:'stable-instance-id',
        source_ids_preserved:true,
        source_settings_preserved:true,
        explicit_none_preserved:true,
        repeater_contract_version:0,
        consumer_contract_version:0
      },
      runtime_policy:{
        execute_arbitrary_source_js:false,
        behavior_execution:'adapter-or-safe-compiler-only',
        source_delays_authoritative:true,
        source_responsive_authoritative:true,
        null_safe_required:true,
        fault_isolation_required:true
      },
      diagnostics
    };
  }

  g.DiniSemanticManifest={
    version:VERSION,
    manifest_version:MANIFEST_VERSION,
    compile,
    compileComponents,
    compileAssets,
    compileBehaviors,
    compileInteractions
  };
  console.info('[DINI SEMANTIC MANIFEST] V'+VERSION+' aktif — Universal Runtime Manifest P0-A.');
})(window);
