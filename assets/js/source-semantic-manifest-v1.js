(function(g){
  'use strict';
  if(g.DiniSemanticManifest?.version)return;

  const VERSION='1.7.0';
  const MANIFEST_VERSION=1;
  const REPEATER_CONTRACT_VERSION=1;
  const COMPONENT_IDENTITY_VERSION=1;

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
    const repeater=[...(el.classList||[])].find(x=>/^elementor-repeater-item-/.test(x));
    if(repeater)return'.'+repeater;
    const cls=[...(el.classList||[])].find(x=>/^elementor-element-/.test(x));
    if(cls)return'.'+cls;
    const name=el.getAttribute?.('name');
    if(name)return `${String(el.tagName||'input').toLowerCase()}[name="${String(name).replaceAll('"','\\"')}"]`;
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
  const actionStateFor=el=>{
    const link=el?.matches?.('a,button,[role="button"]')?el:el?.querySelector?.('a,button,[role="button"]');
    if(!link)return null;
    const disabled=link.hasAttribute('disabled')||link.getAttribute('aria-disabled')==='true'||link.classList?.contains('disabled');
    const href=link.getAttribute?.('href');
    return {
      state:disabled?'disabled':href&&href!=='#'&&!/^javascript:/i.test(href)?'bound':'unbound',
      href:href||'',
      target:link.getAttribute?.('target')||'',
      label:clean(link.textContent)
    };
  };

  const REPEATER_SPECS={
    'image-carousel':{selector:'.swiper-slide',mode:'carousel'},
    'media-carousel':{selector:'.swiper-slide',mode:'carousel'},
    'testimonial-carousel':{selector:'.swiper-slide',mode:'carousel'},
    'gallery':{selector:'.e-gallery-item,.elementor-gallery-item',mode:'gallery'},
    'timeline':{selector:'.weddingpress-timeline-item,.bdt-timeline-item',mode:'timeline'},
    'guestbook':{selector:'.cui-item-comment',mode:'guestbook'},
    'icon-list':{selector:'.elementor-icon-list-item',mode:'list'},
    'social-links':{selector:'.elementor-grid-item,.elementor-social-icon',mode:'social'},
    'form':{selector:'.elementor-field-group',mode:'fields'}
  };

  const itemExplicitId=el=>{
    if(!el)return'';
    const candidates=[
      el.getAttribute?.('data-id'),
      el.id,
      ([...(el.classList||[])].find(x=>/^elementor-repeater-item-/.test(x))||'').replace(/^elementor-repeater-item-/,''),
      el.getAttribute?.('data-e-action-hash'),
      el.getAttribute?.('data-field-id'),
      el.querySelector?.('[name]')?.getAttribute?.('name'),
      el.querySelector?.('[id]')?.id
    ].filter(Boolean);
    return String(candidates[0]||'');
  };
  const itemMedia=el=>{
    const urls=[];
    el?.querySelectorAll?.('img,source,video,audio').forEach(n=>{
      for(const at of ['src','data-src','data-lazy-src','poster']){
        const v=n.getAttribute?.(at);if(v)urls.push(v);
      }
    });
    const style=String(el?.getAttribute?.('style')||'');
    for(const m of style.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/ig))urls.push(m[1]);
    const a=el?.querySelector?.('a[href]')?.getAttribute?.('href');
    if(a)urls.push(a);
    return uniq(urls).slice(0,20);
  };
  const itemText=el=>{
    const leaf=[...el.querySelectorAll?.('h1,h2,h3,h4,h5,h6,p,span,label,a,button')||[]]
      .map(n=>clean(n.textContent))
      .filter(t=>t&&t.length<=300);
    const all=clean(el?.textContent).slice(0,500);
    return uniq(leaf.length?leaf:[all]).slice(0,20);
  };
  const repeaterViewport=cfg=>{
    const pick=(...keys)=>{for(const k of keys)if(cfg?.[k]!==undefined&&cfg?.[k]!==null&&cfg?.[k]!=='')return cfg[k];return null};
    return {
      desktop:pick('slides_per_view','slides_to_show','slides_to_show_desktop','slides_per_view_desktop'),
      tablet:pick('slides_per_view_tablet','slides_to_show_tablet'),
      mobile:pick('slides_per_view_mobile','slides_to_show_mobile')
    };
  };
  function compileRepeater(el,type,componentId){
    const spec=REPEATER_SPECS[type];
    if(!spec||!el)return null;
    let nodes=[...el.querySelectorAll(spec.selector)];
    if(/carousel/.test(spec.mode))nodes=nodes.filter(n=>!n.classList.contains('swiper-slide-duplicate'));
    // Some social widgets match both wrapper and anchor. Keep the most specific repeated nodes only.
    if(type==='social-links'){
      const grid=nodes.filter(n=>n.classList.contains('elementor-grid-item'));
      if(grid.length)nodes=grid;
    }
    const seenKeys=new Map();
    const items=nodes.map((node,order)=>{
      const explicit=itemExplicitId(node);
      const text=itemText(node);
      const media=itemMedia(node);
      const action=actionStateFor(node);
      const contentSignature=hash([explicit,clean(node.getAttribute?.('class')||''),text.join('|'),media.join('|'),action?.href||''].join('||'));
      const baseKey=explicit?`source:${explicit}`:`content:${contentSignature}`;
      const occurrence=(seenKeys.get(baseKey)||0)+1;seenKeys.set(baseKey,occurrence);
      const stableKey=occurrence===1?baseKey:`${baseKey}|dup:${occurrence}`;
      const id=`item-${hash(componentId+'|'+stableKey)}`;
      const settings=parseSettings(node);
      return {
        id,
        source_id:explicit,
        order,
        selector:selectorFor(node),
        text,
        media,
        action,
        settings,
        source_html_hash:hash(node.outerHTML||''),
        source_authority:true
      };
    });
    const cfg=parseSettings(el);
    return {
      version:REPEATER_CONTRACT_VERSION,
      mode:spec.mode,
      item_selector:spec.selector,
      item_count:items.length,
      item_ids:items.map(x=>x.id),
      viewport_items:repeaterViewport(cfg),
      items,
      isolation:{
        component_id:componentId,
        scope:selectorFor(el),
        mutation_scope:'component-only',
        cross_instance_writes:false
      }
    };
  }

  const componentFingerprint=(el,kind,type)=>{
    const settings=parseSettings(el);
    const section=nearestSectionId(el);
    const text=clean(el?.textContent).slice(0,240);
    const cls=uniq(String(el?.className||'').split(/\s+/)).sort().join('.');
    return hash([kind,type,section,selectorFor(el),cls,hash(JSON.stringify(settings||{})),text].join('|'));
  };

  function compileComponents(doc,nativeSchema){
    const out=[];const seenIds=new Map();
    const add=(el,{kind='widget',type='',index=0}={})=>{
      if(!el)return;
      const sourceId=elementId(el)||el.id||'';
      const selector=selectorFor(el);
      const widgetRaw=el.getAttribute?.('data-widget_type')||'';
      const normalized=type||normalizeWidgetType(widgetRaw);
      const identityBase=sourceId
        ?[kind,normalized,'source',sourceId].join('|')
        :[kind,normalized,'fingerprint',componentFingerprint(el,kind,normalized)].join('|');
      let id='cmp-'+hash(identityBase);
      const collision=(seenIds.get(id)||0)+1;seenIds.set(id,collision);
      if(collision>1)id='cmp-'+hash(identityBase+'|collision:'+collision);
      const settings=parseSettings(el);
      const action=actionStateFor(el);
      const repeater=compileRepeater(el,normalized,id);
      out.push({
        id,
        instance_id:id,
        identity_version:COMPONENT_IDENTITY_VERSION,
        source_id:sourceId,
        kind,
        type:normalized,
        widget_type:widgetRaw,
        selector,
        instance_scope:selector,
        section_id:nearestSectionId(el),
        order:out.length,
        item_count:repeater?.item_count||0,
        items:repeater?.items||[],
        repeater,
        settings,
        action,
        classes:uniq(String(el.className||'').split(/\s+/)).slice(0,80),
        editable_field_ids:safeArray(nativeSchema?.fields)
          .filter(f=>f?.source_element_id===sourceId||f?.node_id===el.getAttribute?.('data-native-node-id'))
          .map(f=>f.id),
        isolation:{
          key:'isolate-'+hash(id+'|'+selector),
          scope:selector,
          cross_instance_writes:false,
          editor_mutation_scope:'instance-only'
        },
        source_authority:true
      });
    };
    [...doc.querySelectorAll('.elementor-top-section,body > section')].forEach((el,i)=>add(el,{kind:'section',type:'section',index:i}));
    [...doc.querySelectorAll('[data-widget_type]')].forEach((el,i)=>add(el,{kind:'widget',index:i}));
    return out;
  }

  function compileRepeaters(components){
    return components.filter(c=>c.repeater).map(c=>({
      id:'rep-'+hash(c.id),
      version:REPEATER_CONTRACT_VERSION,
      component_id:c.id,
      component_type:c.type,
      instance_scope:c.instance_scope,
      mode:c.repeater.mode,
      item_selector:c.repeater.item_selector,
      item_count:c.repeater.item_count,
      item_ids:c.repeater.item_ids,
      viewport_items:clone(c.repeater.viewport_items),
      isolation:clone(c.repeater.isolation),
      source_authority:true
    }));
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
    const itemActions=[];
    for(const c of components){
      for(const item of safeArray(c.items)){
        if(!item.action)continue;
        itemActions.push({
          id:'interaction-'+hash(c.id+'|'+item.id+'|action'),
          type:'repeater-item-action',
          component_id:c.id,
          item_id:item.id,
          action:clone(item.action),
          source_authority:true
        });
      }
    }
    return [...raw,...semantic,...itemActions];
  }

  function compileCapabilities(components,sourceGraph,repeaters,embeddedData,layout){
    const set=new Set();
    components.forEach(c=>set.add(c.type));
    const frameworks=safeArray(sourceGraph?.dependencies?.frameworks);
    frameworks.forEach(x=>set.add('framework:'+x));
    if(safeArray(sourceGraph?.animations?.nodes).length)set.add('animations');
    if(safeArray(sourceGraph?.lifecycle?.timers).length)set.add('timers');
    if(safeArray(sourceGraph?.lifecycle?.events).length)set.add('lifecycle-events');
    if(safeArray(sourceGraph?.personalization?.fields).length||safeArray(sourceGraph?.personalization?.candidates).length)set.add('personalization');
    if(repeaters.length)set.add('universal-repeater');
    if(components.length)set.add('component-instance-isolation');
    if(Number(embeddedData?.counts?.css||0)>0)set.add('embedded-css');
    if(Number(embeddedData?.counts?.javascript||0)>0)set.add('embedded-js-evidence');
    if(Number(embeddedData?.counts?.total||0)>0)set.add('embedded-data-decoder');
    if(layout?.topology)set.add('layout:'+layout.topology);
    if(Array.isArray(layout?.panes)&&layout.panes.length)set.add('layout-panes');
    if(Array.isArray(layout?.overlays)&&layout.overlays.length)set.add('fixed-overlay-ownership');
    if(sourceGraph?.semantic_diagnostics)set.add('semantic-diagnostics');
    if(sourceGraph?.runtime_policy?.fault_isolation)set.add('runtime-fault-isolation');
    const as=sourceGraph?.behavior_adapters?.animation_scroll;
    if(Number(as?.counts?.elementor||0)>0)set.add('elementor-responsive-animation');
    if(Number(as?.counts?.scrollspy||0)>0)set.add('bdt-scrollspy');
    if(Number(as?.counts?.parallax||0)>0)set.add('bdt-parallax');
    const car=sourceGraph?.behavior_adapters?.carousel;
    if(Number(car?.counts?.total||0)>0)set.add('universal-carousel-runtime');
    if(Number(car?.counts?.image_carousel||0)>0)set.add('image-carousel');
    if(Number(car?.counts?.media_carousel||0)>0)set.add('media-carousel');
    if(Number(car?.counts?.testimonial_carousel||0)>0)set.add('testimonial-carousel');
    if(Number(car?.counts?.coverflow||0)>0)set.add('carousel-coverflow');
    if(Number(car?.counts?.progressbar||0)>0)set.add('carousel-progressbar');
    if(Number(car?.source_swiper_major||0)===5)set.add('swiper-legacy-v5');
    if(Number(car?.source_swiper_major||0)>=8)set.add('swiper-modern-v8plus');
    const gal=sourceGraph?.behavior_adapters?.gallery;
    if(Number(gal?.counts?.total||0)>0)set.add('universal-gallery-runtime');
    if(Number(gal?.counts?.masonry||0)>0)set.add('gallery-masonry');
    if(Number(gal?.counts?.justified||0)>0)set.add('gallery-justified');
    if(Number(gal?.counts?.lightbox||0)>0)set.add('gallery-lightbox');
    return [...set].sort();
  }

  function compileDiagnostics({components,repeaters,assets,behaviors,sourceGraph,nativeSchema,embeddedData,layout}){
    const semanticDiagnostics=clone(sourceGraph?.semantic_diagnostics||{version:1,warnings:[],counts:{},policy:{read_only:true,auto_fix:false}});
    const warnings=safeArray(semanticDiagnostics?.warnings).map(x=>clone(x));
    if(sourceGraph?.source_truth_error)warnings.push({code:'SOURCE_TRUTH_SCAN_ERROR',severity:'warning',message:String(sourceGraph.source_truth_error)});
    const parseErrors=components.filter(c=>c.settings?.__parse_error);
    if(parseErrors.length)warnings.push({code:'COMPONENT_SETTINGS_PARSE_ERROR',severity:'warning',count:parseErrors.length,component_ids:parseErrors.map(x=>x.id)});
    const duplicateSourceIds={};
    components.forEach(c=>{if(c.source_id)(duplicateSourceIds[c.source_id]=(duplicateSourceIds[c.source_id]||0)+1)});
    const dup=Object.entries(duplicateSourceIds).filter(([,n])=>n>1);
    if(dup.length)warnings.push({code:'DUPLICATE_SOURCE_ID',severity:'info',items:dup.map(([source_id,count])=>({source_id,count}))});
    const itemIds=new Map();
    for(const c of components)for(const item of safeArray(c.items))itemIds.set(item.id,(itemIds.get(item.id)||0)+1);
    const duplicateItemIds=[...itemIds.entries()].filter(([,n])=>n>1);
    if(duplicateItemIds.length)warnings.push({code:'DUPLICATE_REPEATER_ITEM_ID',severity:'warning',items:duplicateItemIds.map(([item_id,count])=>({item_id,count}))});
    return {
      version:2,
      warnings,
      counts:{
        components:components.length,
        isolated_components:components.filter(c=>c.isolation?.cross_instance_writes===false).length,
        repeaters:repeaters.length,
        repeater_items:repeaters.reduce((n,r)=>n+Number(r.item_count||0),0),
        assets:assets.length,
        behaviors:behaviors.length,
        native_fields:safeArray(nativeSchema?.fields).length,
        personalization_fields:safeArray(sourceGraph?.personalization?.fields).length,
        personalization_candidates:safeArray(sourceGraph?.personalization?.candidates).length,
        embedded_resources:Number(embeddedData?.counts?.total||0),
        embedded_css:Number(embeddedData?.counts?.css||0),
        embedded_javascript:Number(embeddedData?.counts?.javascript||0),
        embedded_bytes:Number(embeddedData?.counts?.bytes||0),
        layout_panes:Array.isArray(layout?.panes)?layout.panes.length:0,
        layout_owned_overlays:Array.isArray(layout?.overlays)?layout.overlays.length:0,
        layout_breakpoints:Array.isArray(layout?.breakpoint_queries)?layout.breakpoint_queries.length:0,
        semantic_warnings:safeArray(semanticDiagnostics?.warnings).length,
        date_conflicts:Number(semanticDiagnostics?.counts?.date_conflicts||0),
        unbound_actions:Number(semanticDiagnostics?.counts?.unbound_actions||0),
        elementor_animation_adapters:Number(sourceGraph?.behavior_adapters?.animation_scroll?.counts?.elementor||0),
        scrollspy_adapters:Number(sourceGraph?.behavior_adapters?.animation_scroll?.counts?.scrollspy||0),
        parallax_adapters:Number(sourceGraph?.behavior_adapters?.animation_scroll?.counts?.parallax||0),
        unsupported_parallax_properties:Number(sourceGraph?.behavior_adapters?.animation_scroll?.counts?.unsupported_parallax_properties||0),
        carousel_adapters:Number(sourceGraph?.behavior_adapters?.carousel?.counts?.total||0),
        carousel_slides:Number(sourceGraph?.behavior_adapters?.carousel?.counts?.slides||0),
        carousel_coverflow:Number(sourceGraph?.behavior_adapters?.carousel?.counts?.coverflow||0),
        carousel_progressbar:Number(sourceGraph?.behavior_adapters?.carousel?.counts?.progressbar||0),
        gallery_adapters:Number(sourceGraph?.behavior_adapters?.gallery?.counts?.total||0),
        gallery_items:Number(sourceGraph?.behavior_adapters?.gallery?.counts?.items||0),
        gallery_masonry:Number(sourceGraph?.behavior_adapters?.gallery?.counts?.masonry||0),
        gallery_justified:Number(sourceGraph?.behavior_adapters?.gallery?.counts?.justified||0),
        gallery_lightbox:Number(sourceGraph?.behavior_adapters?.gallery?.counts?.lightbox||0)
      },
      layout:{topology:layout?.topology||'unclassified',confidence:Number(layout?.confidence||0),viewport_policy:layout?.runtime?.viewport_policy||'canonical-content'},
      semantic:semanticDiagnostics
    };
  }

  function compile({doc,sourceGraph={},visualManifest={},nativeSchema={},sourceUrl='',createdAt=''}={}){
    if(!doc?.querySelectorAll)throw new Error('DiniSemanticManifest.compile membutuhkan Document source.');
    const components=compileComponents(doc,nativeSchema);
    const repeaters=compileRepeaters(components);
    const assets=compileAssets(sourceGraph,visualManifest);
    const behaviors=compileBehaviors(sourceGraph);
    const interactions=compileInteractions(sourceGraph,components);
    const personalization=clone(sourceGraph?.personalization||{version:1,fields:[],candidates:[],binding_policy:{}});
    const responsive=clone(sourceGraph?.responsive||{version:1});
    const dependencies=clone(sourceGraph?.dependencies||{version:1,external_scripts:[],stylesheets:[],fonts:[],frameworks:[]});
    const layout=clone(sourceGraph?.layout||{version:1,mode:'source-native',topology:'unclassified',source_authority:true,runtime:{viewport_policy:'canonical-content',synthesize_layout:false}});
    const decoder=g.DiniEmbeddedDataDecoder;
    let embeddedData=clone(sourceGraph?.embedded_data||{});
    if(!Number(embeddedData?.counts?.total||0)&&decoder?.scanDocument){
      try{embeddedData=decoder.summary(decoder.scanDocument(doc,{baseUrl:sourceUrl||sourceGraph?.source?.url||''}))}catch(err){embeddedData={version:1,resources:[],counts:{total:0,css:0,javascript:0,bytes:0},error:String(err?.message||err)}}
    }
    const semanticDiagnostics=clone(sourceGraph?.semantic_diagnostics||{version:1,warnings:[],counts:{},policy:{read_only:true,auto_fix:false}});
    const behaviorAdapters=clone(sourceGraph?.behavior_adapters||{});
    const diagnostics=compileDiagnostics({components,repeaters,assets,behaviors,sourceGraph,nativeSchema,embeddedData,layout});
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
      repeaters,
      assets,
      behaviors,
      interactions,
      responsive,
      layout,
      personalization,
      dependencies,
      embedded_data:embeddedData,
      semantic_diagnostics:semanticDiagnostics,
      behavior_adapters:behaviorAdapters,
      capabilities:compileCapabilities(components,sourceGraph,repeaters,embeddedData,layout),
      editor_contract:{
        component_identity:'stable-instance-id',
        component_identity_version:COMPONENT_IDENTITY_VERSION,
        source_ids_preserved:true,
        source_settings_preserved:true,
        explicit_none_preserved:true,
        instance_isolation:true,
        mutation_scope:'instance-only',
        repeater_contract_version:REPEATER_CONTRACT_VERSION,
        repeater_item_identity:'stable-source-or-content-id',
        reorder_preserves_item_identity:true,
        arbitrary_item_count:true,
        viewport_count_independent_from_item_count:true,
        embedded_data_contract_version:1,
        embedded_css_preserved:true,
        embedded_javascript_semantic_only:true,
        layout_topology_contract_version:Number(layout?.version||1),
        layout_source_authoritative:true,
        pane_ownership_preserved:true,
        source_scroll_behavior_preserved:true,
        semantic_diagnostics_read_only:true,
        semantic_auto_fix:false,
        animation_scroll_contract_version:Number(behaviorAdapters?.animation_scroll?.version||0),
        responsive_animation_none_preserved:true,
        exact_animation_delay_preserved:true,
        bdt_scrollspy_semantic_adapter:true,
        bdt_parallax_semantic_adapter:true,
        carousel_contract_version:Number(behaviorAdapters?.carousel?.version||0),
        carousel_instance_isolation:true,
        swiper5_compatibility:true,
        swiper8_compatibility:true,
        carousel_item_count_independent_from_viewport:true,
        carousel_source_speed_preserved:true,
        carousel_source_autoplay_delay_preserved:true,
        gallery_contract_version:Number(behaviorAdapters?.gallery?.version||0),
        gallery_source_order_preserved:true,
        gallery_lightbox_group_isolation:true,
        gallery_source_urls_preserved:true,
        consumer_contract_version:0
      },
      runtime_policy:{
        execute_arbitrary_source_js:false,
        behavior_execution:'adapter-or-safe-compiler-only',
        source_delays_authoritative:true,
        source_responsive_authoritative:true,
        null_safe_required:true,
        fault_isolation_required:true,
        cross_instance_mutation:false,
        execute_embedded_source_js:false,
        embedded_css_policy:'decode-and-materialize-source-cascade',
        embedded_js_policy:'decode-for-evidence-and-safe-compiler-only',
        layout_execution:'source-css-plus-consumer-viewport-policy',
        layout_normalization:false,
        fault_isolation_contract_version:1,
        behavior_failure_policy:'isolate-and-continue',
        runtime_fault_log_limit:80,
        semantic_diagnostics_policy:'warn-never-normalize',
        animation_scroll_execution:'semantic-adapter-first-generic-fallback',
        explicit_responsive_none_authoritative:true,
        carousel_execution:'semantic-swiper-bridge-no-source-api-dependency',
        carousel_cross_instance_mutation:false,
        gallery_execution:'semantic-layout-and-lightbox-adapter',
        gallery_cross_instance_mutation:false
      },
      diagnostics
    };
  }

  function attachToRebuildPackage(pkg,{doc}={}){
    if(!pkg?.manifest||pkg.manifest.format!=='dini-anif-rebuild-package')return null;
    const currentCompiler=`dini-semantic-manifest-v${VERSION}`;
    if(pkg.manifest.runtime_manifest?.format==='dini-universal-runtime-manifest'&&pkg.manifest.runtime_manifest?.compiler===currentCompiler)return pkg.manifest.runtime_manifest;
    let sourceDoc=doc;
    if(!sourceDoc?.querySelectorAll){
      const raw=String(document.getElementById('sourceInput')?.value||'').trim();
      if(raw)sourceDoc=new DOMParser().parseFromString(raw,'text/html');
    }
    if(!sourceDoc?.querySelectorAll)throw new Error('Runtime Manifest: source Document tidak tersedia.');
    const runtimeManifest=compile({
      doc:sourceDoc,
      sourceGraph:pkg.manifest.source_graph||{},
      visualManifest:pkg.manifest.visual_manifest||{},
      nativeSchema:pkg.native?.schema||pkg.schema?.native||{},
      sourceUrl:pkg.manifest.source_url||pkg.native?.source_url||'',
      createdAt:pkg.manifest.created_at||''
    });
    pkg.manifest.runtime_manifest=runtimeManifest;
    pkg.manifest.runtime_manifest_version=MANIFEST_VERSION;
    pkg.manifest.runtime_manifest_ref='manifest.runtime_manifest';
    pkg.schema=pkg.schema||{};
    pkg.schema.runtime_manifest_version=MANIFEST_VERSION;
    pkg.schema.runtime_contract={
      version:2,
      manifest_path:'manifest.runtime_manifest',
      authority:'source-semantic',
      component_identity_version:COMPONENT_IDENTITY_VERSION,
      repeater_contract_version:REPEATER_CONTRACT_VERSION,
      instance_isolation:true
    };
    pkg.report=pkg.report||{};
    pkg.report.runtime_manifest={
      version:MANIFEST_VERSION,
      compiler:runtimeManifest.compiler,
      components:runtimeManifest.diagnostics?.counts?.components||0,
      isolated_components:runtimeManifest.diagnostics?.counts?.isolated_components||0,
      repeaters:runtimeManifest.diagnostics?.counts?.repeaters||0,
      repeater_items:runtimeManifest.diagnostics?.counts?.repeater_items||0,
      assets:runtimeManifest.diagnostics?.counts?.assets||0,
      behaviors:runtimeManifest.diagnostics?.counts?.behaviors||0,
      embedded_resources:runtimeManifest.diagnostics?.counts?.embedded_resources||0,
      embedded_css:runtimeManifest.diagnostics?.counts?.embedded_css||0,
      embedded_javascript:runtimeManifest.diagnostics?.counts?.embedded_javascript||0,
      layout_topology:runtimeManifest.layout?.topology||'unclassified',
      layout_panes:runtimeManifest.diagnostics?.counts?.layout_panes||0,
      layout_owned_overlays:runtimeManifest.diagnostics?.counts?.layout_owned_overlays||0,
      semantic_warnings:runtimeManifest.diagnostics?.counts?.semantic_warnings||0,
      date_conflicts:runtimeManifest.diagnostics?.counts?.date_conflicts||0,
      unbound_actions:runtimeManifest.diagnostics?.counts?.unbound_actions||0,
      elementor_animation_adapters:runtimeManifest.diagnostics?.counts?.elementor_animation_adapters||0,
      scrollspy_adapters:runtimeManifest.diagnostics?.counts?.scrollspy_adapters||0,
      parallax_adapters:runtimeManifest.diagnostics?.counts?.parallax_adapters||0,
      carousel_adapters:runtimeManifest.diagnostics?.counts?.carousel_adapters||0,
      carousel_slides:runtimeManifest.diagnostics?.counts?.carousel_slides||0,
      carousel_coverflow:runtimeManifest.diagnostics?.counts?.carousel_coverflow||0,
      carousel_progressbar:runtimeManifest.diagnostics?.counts?.carousel_progressbar||0,
      gallery_adapters:runtimeManifest.diagnostics?.counts?.gallery_adapters||0,
      gallery_items:runtimeManifest.diagnostics?.counts?.gallery_items||0,
      gallery_masonry:runtimeManifest.diagnostics?.counts?.gallery_masonry||0,
      gallery_justified:runtimeManifest.diagnostics?.counts?.gallery_justified||0,
      gallery_lightbox:runtimeManifest.diagnostics?.counts?.gallery_lightbox||0,
      warnings:safeArray(runtimeManifest.diagnostics?.warnings).length
    };
    return runtimeManifest;
  }

  // Compatibility bridge: Studio V2.26 keeps rebuild state private inside its closure.
  // Intercept only serialization of that exact rebuild package, attach/upgrade the semantic
  // manifest, then delegate to the native serializer unchanged. No other payload is modified.
  const nativeStringify=JSON.stringify.bind(JSON);
  let bridgeBusy=false;
  function armLegacyStudioBridge(){
    if(JSON.stringify?.__diniSemanticManifestBridge)return;
    const wrapped=function(value,replacer,space){
      const currentCompiler=`dini-semantic-manifest-v${VERSION}`;
      const stale=value?.manifest?.format==='dini-anif-rebuild-package'&&value?.manifest?.runtime_manifest?.compiler!==currentCompiler;
      if(!bridgeBusy&&value?.manifest?.format==='dini-anif-rebuild-package'&&(!value.manifest.runtime_manifest||stale)){
        bridgeBusy=true;
        try{attachToRebuildPackage(value)}catch(err){
          console.error('[DINI SEMANTIC MANIFEST] gagal attach ke rebuild package',err);
          value.manifest.runtime_manifest_error=String(err?.message||err);
        }finally{bridgeBusy=false}
      }
      return nativeStringify(value,replacer,space);
    };
    Object.defineProperty(wrapped,'__diniSemanticManifestBridge',{value:true});
    JSON.stringify=wrapped;
  }

  g.DiniSemanticManifest={
    version:VERSION,
    manifest_version:MANIFEST_VERSION,
    repeater_contract_version:REPEATER_CONTRACT_VERSION,
    component_identity_version:COMPONENT_IDENTITY_VERSION,
    compile,
    compileComponents,
    compileRepeaters,
    compileAssets,
    compileBehaviors,
    compileInteractions,
    attachToRebuildPackage,
    armLegacyStudioBridge
  };
  armLegacyStudioBridge();
  console.info('[DINI SEMANTIC MANIFEST] V'+VERSION+' aktif — P0 Core + P1-A/P1-B + P1-C Gallery/Lightbox contract.');
})(window);
