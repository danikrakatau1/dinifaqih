(function(g){
  'use strict';
  if(g.DiniEventRepeaterComponents?.version)return;

  const VERSION='1.0.0';
  const CONTRACT_VERSION=1;
  const VR=g.DiniVisualResolver;
  if(!VR?.makeSourceGraph){
    console.warn('[DINI EVENT/REPEATER] Visual resolver belum tersedia.');
    return;
  }

  const originalMakeSourceGraph=VR.makeSourceGraph.bind(VR);
  const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
  const hash=s=>{let h=2166136261;for(const c of String(s??'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')};
  const uniq=a=>[...new Set((a||[]).filter(Boolean))];
  const elementId=el=>el?.getAttribute?.('data-id')||((String(el?.className||'').match(/elementor-element-([A-Za-z0-9_-]+)/)||[])[1])||el?.id||'';
  const selectorFor=el=>{
    if(!el)return'';
    if(el.id)return '#'+el.id;
    const id=elementId(el);if(id)return '[data-id="'+id+'"]';
    const cls=[...(el.classList||[])].find(x=>/^elementor-(?:element|repeater-item)-/.test(x));
    if(cls)return'.'+cls;
    return String(el.tagName||'element').toLowerCase();
  };
  const validHref=href=>{const h=String(href||'').trim();return !!h&&h!=='#'&&!/^javascript:/i.test(h)};
  const actionState=el=>{
    const link=el?.matches?.('a,button,[role="button"]')?el:el?.querySelector?.('a,button,[role="button"]');
    if(!link)return null;
    const disabled=link.hasAttribute?.('disabled')||link.getAttribute?.('aria-disabled')==='true'||link.classList?.contains('disabled');
    const href=String(link.getAttribute?.('href')||'');
    return {
      state:disabled?'disabled':validHref(href)?'bound':'unbound',
      href,
      target:String(link.getAttribute?.('target')||''),
      rel:String(link.getAttribute?.('rel')||''),
      label:clean(link.getAttribute?.('aria-label')||link.getAttribute?.('title')||link.textContent||''),
      synthesize_missing_href:false,
      source_authority:true
    };
  };

  const DATE_RE=/(?:senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu|monday|tuesday|wednesday|thursday|friday|saturday|sunday)?\s*,?\s*\d{1,2}\s+(?:januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|january|february|march|may|june|july|august|october|december)\s+\d{4}|\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/i;
  const TIME_RE=/(?:pukul\s*)?\b\d{1,2}[.:]\d{2}\s*(?:wib|wita|wit|am|pm)?\b(?:\s*(?:s\.?d\.?|[-–—]|sampai|to)\s*(?:selesai|\d{1,2}[.:]\d{2}\s*(?:wib|wita|wit|am|pm)?))?/i;
  const EVENT_TITLE_RE=/\b(?:akad(?:\s+nikah)?|resepsi(?:\s+pernikahan)?|ramah\s+tamah|pemberkatan|holy\s+matrimony|wedding\s+reception|ngunduh\s+mantu|mappacci|mappettuada|siraman|midodareni|ijab\s+qabul|aqad|walimatul|ceremony|reception)\b/i;
  const MAP_LABEL_RE=/\b(?:google\s*maps?|google\s*map|lihat\s+lokasi|lokasi|location|map)\b/i;

  function leafTexts(root,selector){
    return [...root.querySelectorAll(selector)].map(x=>clean(x.textContent)).filter(Boolean);
  }
  function topSectionId(el){
    const top=el?.closest?.('.elementor-top-section,body > section,section');
    return elementId(top)||top?.id||'';
  }
  function eventContainerFor(titleNode){
    const candidates=[];
    let cur=titleNode;
    for(let depth=0;cur&&depth<8;depth++,cur=cur.parentElement){
      if(cur.matches?.('.elementor-inner-section,.e-con,.elementor-column,.elementor-widget-wrap,section,article'))candidates.push(cur);
    }
    let best=null,bestScore=-1;
    for(const c of candidates){
      const text=clean(c.textContent).slice(0,2200);
      const hasDate=DATE_RE.test(text),hasTime=TIME_RE.test(text);
      const hasLocation=!!c.querySelector?.('.elementor-widget-icon-box,[class*="location"],[class*="venue"],[class*="alamat"],a[href*="maps"],a[href*="google"]')||MAP_LABEL_RE.test(text);
      const size=text.length;
      let score=(hasDate?5:0)+(hasTime?4:0)+(hasLocation?2:0);
      if(size>0&&size<1100)score+=2;else if(size<1700)score+=1;
      if(c.matches?.('.elementor-inner-section,.e-con,article'))score+=1;
      if(score>bestScore){best=c;bestScore=score}
    }
    return bestScore>=6?best:null;
  }

  function eventFields(container,titleNode){
    const headings=leafTexts(container,'h1,h2,h3,h4,h5,h6,.elementor-heading-title');
    const paragraphs=leafTexts(container,'p,.elementor-icon-box-title,.elementor-icon-box-description,.elementor-button-text');
    const all=uniq([...headings,...paragraphs]);
    const title=clean(titleNode?.textContent||'');
    const dateText=all.find(t=>DATE_RE.test(t))||'';
    const timeText=all.find(t=>TIME_RE.test(t))||'';
    const locationWidget=container.querySelector?.('.elementor-widget-icon-box,.elementor-icon-box-content,[class*="venue"],[class*="location"],[class*="alamat"]');
    const locationTexts=locationWidget?leafTexts(locationWidget,'h1,h2,h3,h4,h5,h6,p,span,.elementor-icon-box-title,.elementor-icon-box-description'):[];
    const mapButtons=[...container.querySelectorAll('a,button,[role="button"]')].filter(x=>{
      const txt=clean(x.textContent),href=String(x.getAttribute?.('href')||'');
      return MAP_LABEL_RE.test(txt)||/maps\.app|google\.[^/]+\/maps|maps\.google/i.test(href);
    });
    const mapAction=mapButtons.length?actionState(mapButtons[0]):null;
    let venue='',address='';
    const loc=uniq(locationTexts.map(clean).filter(Boolean));
    if(loc.length===1){
      const parts=loc[0].split(/\n|<br\s*\/?\s*>/i).map(clean).filter(Boolean);
      venue=parts[0]||loc[0];address=parts.slice(1).join(' ');
    }else if(loc.length){
      venue=loc[0]||'';address=loc.slice(1).join(' ');
    }
    if(!venue){
      const candidates=all.filter(t=>t!==title&&t!==dateText&&t!==timeText&&!MAP_LABEL_RE.test(t)&&t.length>3&&t.length<320);
      venue=candidates.find(t=>/gedung|graha|hotel|masjid|kediaman|rumah|ballroom|aula|venue/i.test(t))||'';
      address=candidates.find(t=>/\b(?:jl\.?|jalan|rt\b|rw\b|kec\.|kel\.|kab\.|kota|desa|dusun|gang|komp\.|blok)\b/i.test(t))||'';
    }
    return {title,date_text:dateText,time_text:timeText,venue,address,map_action:mapAction};
  }

  function compileEvents(doc){
    const out=[],seenContainers=new Set();
    const addEvent=(container,titleNode,index,reason)=>{
      if(!container||seenContainers.has(container))return;
      const fields=eventFields(container,titleNode);
      if(!fields.title||!fields.date_text||!fields.time_text)return;
      seenContainers.add(container);
      const sourceId=elementId(container)||elementId(titleNode?.closest?.('[data-id]'))||'';
      const id='event-'+hash([sourceId,selectorFor(container),fields.title,fields.date_text,fields.time_text,index].join('|'));
      out.push({
        id,
        type:'event',
        detection:reason,
        source_id:sourceId,
        selector:selectorFor(container),
        group_id:'event-group-'+hash(topSectionId(container)||selectorFor(container.closest?.('section')||container)),
        order:out.length,
        fields:{
          title:{role:'title',value:fields.title,source_authority:true},
          date:{role:'date',value:fields.date_text,source_authority:true},
          time:{role:'time',value:fields.time_text,source_authority:true},
          venue:{role:'venue',value:fields.venue,source_authority:true},
          address:{role:'address',value:fields.address,source_authority:true},
          maps:{role:'maps',action:fields.map_action,source_authority:true}
        },
        action:fields.map_action,
        source_order_authoritative:true,
        source_authority:true
      });
    };

    const headings=[...doc.querySelectorAll('h1,h2,h3,h4,h5,h6,.elementor-heading-title')];
    headings.forEach((titleNode,index)=>{
      const title=clean(titleNode.textContent);
      if(!EVENT_TITLE_RE.test(title))return;
      addEvent(eventContainerFor(titleNode),titleNode,index,'known-event-title');
    });

    // Arbitrary event names are supported structurally: a compact source container with a
    // heading + date + time + venue/maps evidence is an event even when its title is unknown.
    const containers=[...doc.querySelectorAll('.elementor-inner-section,.e-con,article,[data-event],[class*="event-card"]')];
    containers.forEach((container,index)=>{
      if(seenContainers.has(container))return;
      const text=clean(container.textContent).slice(0,2200);
      if(!DATE_RE.test(text)||!TIME_RE.test(text))return;
      const titleNode=container.querySelector('h1,h2,h3,h4,h5,h6,.elementor-heading-title,[data-event-title]');
      if(!titleNode)return;
      const hasLocation=!!container.querySelector('.elementor-widget-icon-box,[class*="location"],[class*="venue"],[class*="alamat"],a[href*="maps"],a[href*="google"]')||
        [...container.querySelectorAll('a,button,[role="button"]')].some(x=>MAP_LABEL_RE.test(clean(x.textContent)));
      if(!hasLocation)return;
      addEvent(container,titleNode,headings.length+index,'structural-event');
    });
    return out;
  }

  function countdownDisplays(doc){
    const roots=[...new Set([...doc.querySelectorAll('[countdown]'),...doc.querySelectorAll('[data-date]')])];
    return roots.map((root,index)=>{
      const slot=(name,aliases=[])=>{
        const el=root.querySelector('[data-'+name+']');
        const labelSelectors=[
          '[data-'+name+'-label]',
          '.'+name+'-label',
          '.countdown-'+name+' .countdown-label',
          '.countdown-'+name+' .label'
        ];
        let label='';
        for(const sel of labelSelectors){const x=root.querySelector(sel);if(x){label=clean(x.textContent);break}}
        if(!label){
          const candidates=[...root.querySelectorAll('span,small,p,div')].map(x=>clean(x.textContent)).filter(t=>t&&t.length<40);
          label=candidates.find(t=>aliases.some(a=>new RegExp('^(?:\\d+\\s*)?'+a+'
        }
        return {value_selector:el?'[data-'+name+']':'',label,source_authority:true};
      };
      return {
        id:'countdown-display-'+hash([selectorFor(root),index,root.getAttribute('data-date')||root.getAttribute('countdown')||''].join('|')),
        selector:selectorFor(root),
        source_date:String(root.getAttribute('data-date')||root.getAttribute('countdown')||''),
        slots:{
          days:slot('days',['hari','day','days']),
          hours:slot('hours',['jam','hour','hours']),
          minutes:slot('minutes',['menit','minute','minutes']),
          seconds:slot('seconds',['detik','second','seconds'])
        },
        preserve_label_text:true,
        source_authority:true
      };
    });
  }

  function normalizedRepeaters(graph,events,countdowns){
    const actionComponents=graph?.semantic_components?.actions_v1||{};
    const out=[];
    const add=(type,id,items,extra={})=>{
      if(!Array.isArray(items)||!items.length)return;
      out.push({
        id:'semantic-repeater-'+hash([type,id].join('|')),
        type,
        source_component_id:id,
        item_count:items.length,
        item_ids:items.map(x=>x.id),
        items,
        mutation_contract:{
          arbitrary_item_count:true,
          preserve_item_identity:true,
          preserve_source_order:true,
          add_scope:'component-only',
          delete_scope:'component-only',
          reorder_scope:'component-only',
          cross_instance_writes:false
        },
        source_authority:true,
        ...extra
      });
    };
    add('events','events',events,{semantic_fields:['title','date','time','venue','address','maps']});
    for(const x of actionComponents.icon_lists||[])add('icon-list',x.id,x.items||[],{selector:x.selector});
    for(const x of actionComponents.social_links||[])add('social-links',x.id,x.items||[],{selector:x.selector});
    for(const x of graph?.behavior_adapters?.timeline_story?.timelines||[])add('timeline',x.id,x.items||[],{selector:x.selector});
    for(const x of graph?.behavior_adapters?.gallery?.instances||[])add('gallery',x.id,x.items||[],{selector:x.selector});
    for(const x of graph?.behavior_adapters?.carousel?.instances||[])add('carousel',x.id,x.slides||[],{selector:x.selector,viewport_items:x.responsive||{}});
    if(countdowns.length)add('countdown-display','countdowns',countdowns,{semantic_fields:['days','hours','minutes','seconds']});
    return out;
  }

  function compile(doc,graph={}){
    const events=compileEvents(doc);
    const countdowns=countdownDisplays(doc);
    const repeaters=normalizedRepeaters(graph,events,countdowns);
    return {
      version:CONTRACT_VERSION,
      engine:'dini-event-repeater-components-v'+VERSION,
      events,
      countdown_displays:countdowns,
      repeaters,
      counts:{
        events:events.length,
        event_groups:new Set(events.map(x=>x.group_id)).size,
        countdown_displays:countdowns.length,
        repeaters:repeaters.length,
        repeater_items:repeaters.reduce((n,x)=>n+x.item_count,0),
        icon_list_repeaters:repeaters.filter(x=>x.type==='icon-list').length,
        social_repeaters:repeaters.filter(x=>x.type==='social-links').length,
        event_repeaters:repeaters.filter(x=>x.type==='events').length
      },
      repeater_contract:{
        arbitrary_item_count:true,
        stable_item_identity:true,
        preserve_source_order:true,
        add_delete_reorder_component_scoped:true,
        cross_instance_writes:false,
        source_style_owner:true
      }
    };
  }

  VR.makeSourceGraph=function(doc,opts={}){
    const graph=originalMakeSourceGraph(doc,opts);
    try{
      const components=compile(doc,graph);
      graph.semantic_components={...(graph.semantic_components||{}),repeaters_v1:components};
      graph.authority={...(graph.authority||{}),event_repeater_truth:'source-dom-semantic-fields-and-stable-items'};
      graph.diagnostics={...(graph.diagnostics||{}),event_component_count:components.counts.events,event_group_count:components.counts.event_groups,countdown_display_count:components.counts.countdown_displays,semantic_repeater_count:components.counts.repeaters,semantic_repeater_item_count:components.counts.repeater_items};
      return graph;
    }catch(err){
      console.warn('[DINI EVENT/REPEATER] compile gagal; graph lama dipertahankan.',err);
      graph.semantic_components={...(graph.semantic_components||{}),repeaters_v1:{version:CONTRACT_VERSION,engine:'dini-event-repeater-components-v'+VERSION,events:[],countdown_displays:[],repeaters:[],counts:{events:0,repeaters:0,repeater_items:0},error:String(err?.message||err)}};
      return graph;
    }
  };

  g.DiniEventRepeaterComponents={version:VERSION,contract_version:CONTRACT_VERSION,compile,compileEvents,countdownDisplays,normalizedRepeaters};
  console.info('[DINI EVENT/REPEATER] V'+VERSION+' aktif — arbitrary event + semantic repeater + countdown display contract.');
})(window);
,'i').test(t)))||'';
          if(label)label=label.replace(/^\\d+\\s*/,'');
        }
        return {value_selector:el?'[data-'+name+']':'',label,source_authority:true};
      };
      return {
        id:'countdown-display-'+hash([selectorFor(root),index,root.getAttribute('data-date')||root.getAttribute('countdown')||''].join('|')),
        selector:selectorFor(root),
        source_date:String(root.getAttribute('data-date')||root.getAttribute('countdown')||''),
        slots:{
          days:slot('days',['hari','day','days']),
          hours:slot('hours',['jam','hour','hours']),
          minutes:slot('minutes',['menit','minute','minutes']),
          seconds:slot('seconds',['detik','second','seconds'])
        },
        preserve_label_text:true,
        source_authority:true
      };
    });
  }

  function normalizedRepeaters(graph,events,countdowns){
    const actionComponents=graph?.semantic_components?.actions_v1||{};
    const out=[];
    const add=(type,id,items,extra={})=>{
      if(!Array.isArray(items)||!items.length)return;
      out.push({
        id:'semantic-repeater-'+hash([type,id].join('|')),
        type,
        source_component_id:id,
        item_count:items.length,
        item_ids:items.map(x=>x.id),
        items,
        mutation_contract:{
          arbitrary_item_count:true,
          preserve_item_identity:true,
          preserve_source_order:true,
          add_scope:'component-only',
          delete_scope:'component-only',
          reorder_scope:'component-only',
          cross_instance_writes:false
        },
        source_authority:true,
        ...extra
      });
    };
    add('events','events',events,{semantic_fields:['title','date','time','venue','address','maps']});
    for(const x of actionComponents.icon_lists||[])add('icon-list',x.id,x.items||[],{selector:x.selector});
    for(const x of actionComponents.social_links||[])add('social-links',x.id,x.items||[],{selector:x.selector});
    for(const x of graph?.behavior_adapters?.timeline_story?.timelines||[])add('timeline',x.id,x.items||[],{selector:x.selector});
    for(const x of graph?.behavior_adapters?.gallery?.instances||[])add('gallery',x.id,x.items||[],{selector:x.selector});
    for(const x of graph?.behavior_adapters?.carousel?.instances||[])add('carousel',x.id,x.slides||[],{selector:x.selector,viewport_items:x.responsive||{}});
    if(countdowns.length)add('countdown-display','countdowns',countdowns,{semantic_fields:['days','hours','minutes','seconds']});
    return out;
  }

  function compile(doc,graph={}){
    const events=compileEvents(doc);
    const countdowns=countdownDisplays(doc);
    const repeaters=normalizedRepeaters(graph,events,countdowns);
    return {
      version:CONTRACT_VERSION,
      engine:'dini-event-repeater-components-v'+VERSION,
      events,
      countdown_displays:countdowns,
      repeaters,
      counts:{
        events:events.length,
        event_groups:new Set(events.map(x=>x.group_id)).size,
        countdown_displays:countdowns.length,
        repeaters:repeaters.length,
        repeater_items:repeaters.reduce((n,x)=>n+x.item_count,0),
        icon_list_repeaters:repeaters.filter(x=>x.type==='icon-list').length,
        social_repeaters:repeaters.filter(x=>x.type==='social-links').length,
        event_repeaters:repeaters.filter(x=>x.type==='events').length
      },
      repeater_contract:{
        arbitrary_item_count:true,
        stable_item_identity:true,
        preserve_source_order:true,
        add_delete_reorder_component_scoped:true,
        cross_instance_writes:false,
        source_style_owner:true
      }
    };
  }

  VR.makeSourceGraph=function(doc,opts={}){
    const graph=originalMakeSourceGraph(doc,opts);
    try{
      const components=compile(doc,graph);
      graph.semantic_components={...(graph.semantic_components||{}),repeaters_v1:components};
      graph.authority={...(graph.authority||{}),event_repeater_truth:'source-dom-semantic-fields-and-stable-items'};
      graph.diagnostics={...(graph.diagnostics||{}),event_component_count:components.counts.events,event_group_count:components.counts.event_groups,countdown_display_count:components.counts.countdown_displays,semantic_repeater_count:components.counts.repeaters,semantic_repeater_item_count:components.counts.repeater_items};
      return graph;
    }catch(err){
      console.warn('[DINI EVENT/REPEATER] compile gagal; graph lama dipertahankan.',err);
      graph.semantic_components={...(graph.semantic_components||{}),repeaters_v1:{version:CONTRACT_VERSION,engine:'dini-event-repeater-components-v'+VERSION,events:[],countdown_displays:[],repeaters:[],counts:{events:0,repeaters:0,repeater_items:0},error:String(err?.message||err)}};
      return graph;
    }
  };

  g.DiniEventRepeaterComponents={version:VERSION,contract_version:CONTRACT_VERSION,compile,compileEvents,countdownDisplays,normalizedRepeaters};
  console.info('[DINI EVENT/REPEATER] V'+VERSION+' aktif — arbitrary event + semantic repeater + countdown display contract.');
})(window);
