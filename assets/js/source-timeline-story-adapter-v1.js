(function(g){
  'use strict';
  if(g.DiniTimelineStoryAdapter?.version)return;

  const VERSION='1.0.0';
  const CONTRACT_VERSION=1;
  const VR=g.DiniVisualResolver;
  if(!VR?.makeSourceGraph){
    console.warn('[DINI TIMELINE/STORY] Visual resolver belum tersedia.');
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
    const cls=[...(el.classList||[])].find(x=>/(?:weddingpress|bdt|timeline|story)/i.test(x));
    if(cls)return'.'+cls;
    return String(el.tagName||'element').toLowerCase();
  };

  function timelineItems(host){
    const selectors=[
      '.weddingpress-timeline-item',
      '.bdt-timeline-item',
      '.timeline-item',
      '[class*="timeline-item"]'
    ];
    for(const sel of selectors){
      const nodes=[...host.querySelectorAll(sel)];
      if(nodes.length)return{selector:sel,nodes};
    }
    return{selector:'',nodes:[]};
  }

  function sideOf(node,index){
    const cls=String(node?.className||'').toLowerCase();
    const attr=String(node?.getAttribute?.('data-side')||node?.getAttribute?.('data-position')||'').toLowerCase();
    if(/(?:^|[-_ ])left(?:$|[-_ ])/.test(cls)||attr==='left')return'left';
    if(/(?:^|[-_ ])right(?:$|[-_ ])/.test(cls)||attr==='right')return'right';
    return index%2===0?'left':'right';
  }

  function progressSelector(host){
    const candidates=[
      '.weddingpress-timeline-progress',
      '.weddingpress-timeline-line-progress',
      '.bdt-timeline-line-progress',
      '.bdt-timeline-progress',
      '.timeline-line-progress',
      '.timeline-progress',
      '[class*="timeline"][class*="progress"]'
    ];
    for(const sel of candidates)if(host.querySelector(sel))return sel;
    return'';
  }

  function lineSelector(host){
    const candidates=[
      '.weddingpress-timeline-line',
      '.bdt-timeline-line',
      '.timeline-line',
      '[class*="timeline"][class*="line"]'
    ];
    for(const sel of candidates)if(host.querySelector(sel))return sel;
    return'';
  }

  function compileTimeline(el,index){
    const cfg=parseSettings(el);
    const {selector:itemSelector,nodes}=timelineItems(el);
    if(!nodes.length)return null;
    const sides=nodes.map((node,i)=>sideOf(node,i));
    const explicit=sides.some((s,i)=>String(nodes[i]?.className||'').toLowerCase().includes(s)||String(nodes[i]?.getAttribute?.('data-side')||'').toLowerCase()===s);
    return {
      id:'timeline-'+hash(selectorFor(el)+'|'+index),
      adapter:'weddingpress-timeline-semantic',
      mode:'timeline',
      selector:selectorFor(el),
      element_id:elementId(el),
      item_selector:itemSelector,
      item_count:nodes.length,
      items:nodes.map((node,i)=>({
        id:'timeline-item-'+hash(selectorFor(el)+'|'+i+'|'+clean(node.textContent).slice(0,160)),
        index:i,
        source_id:node.getAttribute?.('data-id')||node.id||'',
        side:sides[i],
        text:clean(node.textContent).slice(0,500),
        source_authority:true
      })),
      alternating:{
        enabled:true,
        explicit_source_side:explicit,
        preserve_dom_order:true,
        preserve_source_geometry:true
      },
      progress:{
        enabled:true,
        line_selector:lineSelector(el),
        progress_selector:progressSelector(el),
        viewport_anchor:'center',
        source_authority:true
      },
      scroll_reveal:{
        enabled:true,
        add_class:'dini-timeline-inview',
        reverse:true,
        preserve_source_animation:true
      },
      raw_settings:cfg,
      source_authority:true
    };
  }

  function storyCandidates(doc){
    const out=[],seen=new Set();
    const sels=[
      '[class*="love-story"]',
      '[class*="lovestory"]',
      '[id*="love-story"]',
      '[id*="lovestory"]',
      '.story-section',
      '[class*="story-section"]'
    ];
    for(const sel of sels){
      let nodes=[];try{nodes=[...doc.querySelectorAll(sel)]}catch{}
      for(const el of nodes){if(seen.has(el))continue;seen.add(el);out.push(el)}
    }
    return out;
  }

  function classifyStory(el,index){
    const swiper=!!el.querySelector('.swiper,.swiper-container,.swiper-wrapper,[data-widget_type*="carousel"]');
    const hasTimeline=timelineItems(el).nodes.length>0||/timeline/i.test(String(el.className||'')+' '+String(el.id||''));
    const mode=hasTimeline?'timeline':swiper?'carousel':'static';
    const cards=[...el.querySelectorAll(':scope > *, .story-item, [class*="story-item"]')]
      .filter((n,i,a)=>n!==el&&a.indexOf(n)===i)
      .slice(0,100);
    return {
      id:'story-'+hash(selectorFor(el)+'|'+index),
      adapter:'love-story-classifier',
      mode,
      selector:selectorFor(el),
      element_id:elementId(el),
      item_count:cards.length,
      delegated_to:mode==='carousel'?'carousel':mode==='timeline'?'timeline':'source-css',
      preserve_source_order:true,
      preserve_source_layout:true,
      runtime_mutation:mode==='timeline'?'timeline-progress-only':'none',
      source_authority:true
    };
  }

  function compile(doc){
    const timelineNodes=[...doc.querySelectorAll('[data-widget_type*="timeline"],.weddingpress-timeline,.bdt-timeline,[class*="weddingpress"][class*="timeline"]')];
    const timelines=[];
    const seen=new Set();
    timelineNodes.forEach((el,index)=>{
      if(seen.has(el))return;
      const t=compileTimeline(el,index);
      if(t){seen.add(el);timelines.push(t)}
    });
    const stories=storyCandidates(doc).map(classifyStory);
    return {
      version:CONTRACT_VERSION,
      engine:'dini-timeline-story-adapter-v'+VERSION,
      timelines,
      stories,
      counts:{
        timelines:timelines.length,
        timeline_items:timelines.reduce((n,x)=>n+x.item_count,0),
        stories:stories.length,
        story_static:stories.filter(x=>x.mode==='static').length,
        story_timeline:stories.filter(x=>x.mode==='timeline').length,
        story_carousel:stories.filter(x=>x.mode==='carousel').length
      },
      runtime_policy:{
        source_dom_order_authoritative:true,
        source_side_authoritative:true,
        reverse_scroll_state:true,
        progress_read_only_to_source_geometry:true,
        static_story_no_runtime_conversion:true,
        carousel_story_delegated_to_carousel_adapter:true,
        no_template_specific_patch:true
      }
    };
  }

  VR.makeSourceGraph=function(doc,opts={}){
    const graph=originalMakeSourceGraph(doc,opts);
    try{
      const plan=compile(doc);
      graph.behavior_adapters={...(graph.behavior_adapters||{}),timeline_story:plan};
      graph.authority={...(graph.authority||{}),timeline_story_truth:'source-timeline-dom-and-story-mode'};
      graph.diagnostics={...(graph.diagnostics||{}),timeline_adapter_count:plan.counts.timelines,timeline_item_count:plan.counts.timeline_items,story_static_count:plan.counts.story_static,story_timeline_count:plan.counts.story_timeline,story_carousel_count:plan.counts.story_carousel};
      return graph;
    }catch(err){
      console.warn('[DINI TIMELINE/STORY] compile gagal; graph lama dipertahankan.',err);
      graph.behavior_adapters={...(graph.behavior_adapters||{}),timeline_story:{version:CONTRACT_VERSION,engine:'dini-timeline-story-adapter-v'+VERSION,timelines:[],stories:[],counts:{timelines:0,timeline_items:0,stories:0},error:String(err?.message||err)}};
      return graph;
    }
  };

  g.DiniTimelineStoryAdapter={version:VERSION,contract_version:CONTRACT_VERSION,compile,compileTimeline,classifyStory};
  console.info('[DINI TIMELINE/STORY] V'+VERSION+' aktif — WeddingPress timeline + Love Story mode classifier.');
})(window);
