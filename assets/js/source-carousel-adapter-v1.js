(function(g){
  'use strict';
  if(g.DiniCarouselAdapter?.version)return;

  const VERSION='1.0.0';
  const CONTRACT_VERSION=1;
  const VR=g.DiniVisualResolver;
  if(!VR?.makeSourceGraph){
    console.warn('[DINI CAROUSEL] Visual resolver belum tersedia.');
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
  const yes=v=>/^(?:yes|true|1|on)$/i.test(clean(v));
  const num=v=>{
    if(v===''||v==null)return null;
    if(typeof v==='object'&&v&&v.size!==undefined)return Number.isFinite(Number(v.size))?Number(v.size):null;
    return Number.isFinite(Number(v))?Number(v):null;
  };
  const str=v=>v==null?'':String(v);
  const pick=(cfg,...keys)=>{for(const k of keys)if(cfg&&Object.prototype.hasOwnProperty.call(cfg,k)&&cfg[k]!==''&&cfg[k]!=null)return cfg[k];return null};
  const owned=(cfg,...keys)=>keys.some(k=>cfg&&Object.prototype.hasOwnProperty.call(cfg,k));

  function widgetKind(raw){
    const v=String(raw||'').replace(/\.default$/,'');
    if(v==='image-carousel')return'image-carousel';
    if(v==='media-carousel')return'media-carousel';
    if(v==='testimonial-carousel')return'testimonial-carousel';
    return'';
  }
  function sourceSwiperVersion(doc){
    const urls=[
      ...[...doc.querySelectorAll('script[src]')].map(x=>x.getAttribute('src')||''),
      ...[...doc.querySelectorAll('link[href]')].map(x=>x.getAttribute('href')||'')
    ];
    for(const u of urls){
      if(!/swiper/i.test(u))continue;
      const m=String(u).match(/[?&](?:ver|version)=([0-9]+(?:\.[0-9]+){1,3})/i)||String(u).match(/swiper(?:\.min)?(?:[-.]?)([0-9]+(?:\.[0-9]+){1,3})/i);
      if(m)return m[1];
    }
    return '';
  }
  function defaultsFor(kind){
    if(kind==='testimonial-carousel')return{slides:1,scroll:1,space:0,pagination:'none',navigation:'arrows',speed:500,autoplay_delay:5000,loop:false,effect:'slide'};
    if(kind==='media-carousel')return{slides:3,scroll:1,space:10,pagination:'bullets',navigation:'none',speed:500,autoplay_delay:5000,loop:false,effect:'slide'};
    return{slides:3,scroll:1,space:10,pagination:'none',navigation:'none',speed:500,autoplay_delay:5000,loop:false,effect:'slide'};
  }
  function responsiveSettings(cfg,kind){
    const d=defaultsFor(kind);
    const slideD=num(pick(cfg,'slides_per_view','slides_to_show','slides_to_show_desktop','slides_per_view_desktop'));
    const slideT=num(pick(cfg,'slides_per_view_tablet','slides_to_show_tablet'));
    const slideM=num(pick(cfg,'slides_per_view_mobile','slides_to_show_mobile'));
    const scrollD=num(pick(cfg,'slides_to_scroll','slides_to_scroll_desktop'));
    const scrollT=num(pick(cfg,'slides_to_scroll_tablet'));
    const scrollM=num(pick(cfg,'slides_to_scroll_mobile'));
    const spaceD=num(pick(cfg,'space_between','image_spacing_custom'));
    const spaceT=num(pick(cfg,'space_between_tablet','image_spacing_custom_tablet'));
    const spaceM=num(pick(cfg,'space_between_mobile','image_spacing_custom_mobile'));
    return {
      desktop:{
        slides_per_view:slideD??d.slides,
        slides_to_scroll:scrollD??d.scroll,
        space_between_px:spaceD??d.space,
        ownership:{
          slides_per_view:owned(cfg,'slides_per_view','slides_to_show','slides_to_show_desktop','slides_per_view_desktop'),
          slides_to_scroll:owned(cfg,'slides_to_scroll','slides_to_scroll_desktop'),
          space_between:owned(cfg,'space_between','image_spacing_custom')
        }
      },
      tablet:{
        slides_per_view:slideT??slideD??d.slides,
        slides_to_scroll:scrollT??scrollD??d.scroll,
        space_between_px:spaceT??spaceD??d.space,
        ownership:{
          slides_per_view:owned(cfg,'slides_per_view_tablet','slides_to_show_tablet'),
          slides_to_scroll:owned(cfg,'slides_to_scroll_tablet'),
          space_between:owned(cfg,'space_between_tablet','image_spacing_custom_tablet')
        }
      },
      mobile:{
        slides_per_view:slideM??slideT??slideD??d.slides,
        slides_to_scroll:scrollM??scrollT??scrollD??d.scroll,
        space_between_px:spaceM??spaceT??spaceD??d.space,
        ownership:{
          slides_per_view:owned(cfg,'slides_per_view_mobile','slides_to_show_mobile'),
          slides_to_scroll:owned(cfg,'slides_to_scroll_mobile'),
          space_between:owned(cfg,'space_between_mobile','image_spacing_custom_mobile')
        }
      }
    };
  }
  function paginationMode(cfg,kind){
    const raw=pick(cfg,'pagination');
    if(raw!=null)return str(raw).toLowerCase();
    const nav=str(pick(cfg,'navigation')).toLowerCase();
    if(/dots|both/.test(nav))return'bullets';
    return defaultsFor(kind).pagination;
  }
  function navigationMode(cfg,kind){
    const nav=str(pick(cfg,'navigation')).toLowerCase();
    if(nav==='both')return'both';
    if(nav==='arrows')return'arrows';
    if(nav==='dots')return'pagination';
    if(nav==='none')return'none';
    if(yes(pick(cfg,'show_arrows')))return'arrows';
    return defaultsFor(kind).navigation;
  }
  function effectMode(cfg,kind,el){
    const skin=str(pick(cfg,'skin')).toLowerCase();
    if(skin==='coverflow'||el?.classList?.contains('elementor-skin-coverflow'))return'coverflow';
    return defaultsFor(kind).effect;
  }
  function slideRecords(el){
    let slides=[...el.querySelectorAll('.swiper-wrapper > .swiper-slide')];
    if(!slides.length)slides=[...el.querySelectorAll('.swiper-slide')];
    slides=slides.filter(x=>!x.classList.contains('swiper-slide-duplicate'));
    return slides.map((slide,index)=>({
      id:'slide-'+hash(selectorFor(el)+'|'+index+'|'+clean(slide.textContent).slice(0,160)+'|'+(slide.querySelector('img')?.getAttribute('src')||slide.querySelector('a')?.getAttribute('href')||'')),
      index,
      source_id:slide.getAttribute('data-id')||slide.id||'',
      aria_label:slide.getAttribute('aria-label')||'',
      media:[...slide.querySelectorAll('img,video,source')].map(n=>n.getAttribute('src')||n.getAttribute('data-src')||'').filter(Boolean).slice(0,12),
      source_authority:true
    }));
  }
  function compileInstance(el,index,sourceVersion){
    const kind=widgetKind(el.getAttribute('data-widget_type'));
    const cfg=parseSettings(el),defs=defaultsFor(kind),slides=slideRecords(el);
    const loop=owned(cfg,'loop')?yes(cfg.loop):owned(cfg,'infinite')?yes(cfg.infinite):defs.loop;
    const autoplay=owned(cfg,'autoplay')?yes(cfg.autoplay):false;
    const delay=num(pick(cfg,'autoplay_speed'))??defs.autoplay_delay;
    const speed=num(pick(cfg,'speed'))??defs.speed;
    const wrapper=el.querySelector('.swiper-wrapper');
    const root=el.querySelector('.elementor-main-swiper,.elementor-image-carousel-wrapper,.swiper-container,.swiper');
    const pagination=el.querySelector('.swiper-pagination');
    const prev=el.querySelector('.elementor-swiper-button-prev,.swiper-button-prev');
    const next=el.querySelector('.elementor-swiper-button-next,.swiper-button-next');
    return {
      id:'carousel-'+hash(selectorFor(el)+'|'+index),
      adapter:'semantic-swiper-bridge',
      kind,
      selector:selectorFor(el),
      element_id:elementId(el),
      source_swiper_version:sourceVersion,
      source_swiper_major:Number((sourceVersion.match(/^\d+/)||[])[0]||0)||null,
      source_dom:{
        root_selector:root?'.'+[...(root.classList||[])].filter(Boolean).join('.'):'.swiper',
        wrapper_found:!!wrapper,
        root_found:!!root,
        legacy_container:!!el.querySelector('.swiper-container'),
        modern_container:!!el.querySelector('.swiper')
      },
      slides,
      item_count:slides.length,
      responsive:responsiveSettings(cfg,kind),
      motion:{
        speed_ms:speed,
        autoplay,
        autoplay_delay_ms:delay,
        pause_on_hover:yes(pick(cfg,'pause_on_hover')),
        pause_on_interaction:yes(pick(cfg,'pause_on_interaction')),
        loop,
        effect:effectMode(cfg,kind,el)
      },
      controls:{
        navigation:navigationMode(cfg,kind),
        pagination:paginationMode(cfg,kind),
        arrows_found:!!(prev||next),
        pagination_found:!!pagination
      },
      raw_settings:cfg,
      isolation:{
        scope:selectorFor(el),
        cross_instance_writes:false,
        runtime_state:'per-instance'
      },
      source_authority:true
    };
  }
  function compile(doc){
    const sourceVersion=sourceSwiperVersion(doc);
    const nodes=[...doc.querySelectorAll('[data-widget_type]')].filter(el=>widgetKind(el.getAttribute('data-widget_type')));
    const instances=nodes.map((el,index)=>compileInstance(el,index,sourceVersion));
    return {
      version:CONTRACT_VERSION,
      engine:'dini-carousel-adapter-v'+VERSION,
      source_swiper_version:sourceVersion,
      source_swiper_major:Number((sourceVersion.match(/^\d+/)||[])[0]||0)||null,
      compatibility:{
        swiper5:true,
        swiper8:true,
        implementation:'semantic-runtime-no-source-swiper-api-dependency',
        preserves_source_dom:true
      },
      instances,
      counts:{
        total:instances.length,
        image_carousel:instances.filter(x=>x.kind==='image-carousel').length,
        media_carousel:instances.filter(x=>x.kind==='media-carousel').length,
        testimonial_carousel:instances.filter(x=>x.kind==='testimonial-carousel').length,
        coverflow:instances.filter(x=>x.motion.effect==='coverflow').length,
        progressbar:instances.filter(x=>x.controls.pagination==='progressbar').length,
        slides:instances.reduce((n,x)=>n+x.item_count,0)
      },
      runtime_policy:{
        per_instance_state:true,
        cross_instance_mutation:false,
        source_speed_authoritative:true,
        source_autoplay_delay_authoritative:true,
        item_count_independent_from_viewport:true,
        no_template_specific_patch:true
      }
    };
  }

  VR.makeSourceGraph=function(doc,opts={}){
    const graph=originalMakeSourceGraph(doc,opts);
    try{
      const plan=compile(doc);
      graph.behavior_adapters={...(graph.behavior_adapters||{}),carousel:plan};
      graph.authority={...(graph.authority||{}),carousel_truth:'source-widget-settings-and-swiper-dom'};
      graph.diagnostics={...(graph.diagnostics||{}),carousel_adapter_count:plan.counts.total,carousel_slide_count:plan.counts.slides,coverflow_count:plan.counts.coverflow,progressbar_count:plan.counts.progressbar,source_swiper_version:plan.source_swiper_version||''};
      return graph;
    }catch(err){
      console.warn('[DINI CAROUSEL] compile gagal; graph lama dipertahankan.',err);
      graph.behavior_adapters={...(graph.behavior_adapters||{}),carousel:{version:CONTRACT_VERSION,engine:'dini-carousel-adapter-v'+VERSION,instances:[],counts:{total:0},error:String(err?.message||err)}};
      return graph;
    }
  };

  g.DiniCarouselAdapter={version:VERSION,contract_version:CONTRACT_VERSION,compile,compileInstance,responsiveSettings,sourceSwiperVersion};
  console.info('[DINI CAROUSEL] V'+VERSION+' aktif — Swiper 5/8 semantic compatibility, isolated per carousel instance.');
})(window);
