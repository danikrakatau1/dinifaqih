(function(g){
  'use strict';
  if(g.DiniSemanticComponents?.version)return;

  const VERSION='1.0.0';
  const CONTRACT_VERSION=1;
  const VR=g.DiniVisualResolver;
  if(!VR?.makeSourceGraph){
    console.warn('[DINI SEMANTIC COMPONENTS] Visual resolver belum tersedia.');
    return;
  }
  const originalMakeSourceGraph=VR.makeSourceGraph.bind(VR);
  const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
  const hash=s=>{let h=2166136261;for(const c of String(s??'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')};
  const elementId=el=>el?.getAttribute?.('data-id')||((String(el?.className||'').match(/elementor-element-([A-Za-z0-9_-]+)/)||[])[1])||el?.id||'';
  const selectorFor=el=>{
    if(!el)return'';
    if(el.id)return '#'+el.id;
    const id=elementId(el);if(id)return '[data-id="'+id+'"]';
    const rep=[...(el.classList||[])].find(x=>/^elementor-repeater-item-/.test(x));if(rep)return'.'+rep;
    const cls=[...(el.classList||[])].find(x=>/^elementor-(?:social-icon|icon-list-item)/.test(x));if(cls)return'.'+cls;
    return String(el.tagName||'element').toLowerCase();
  };
  const clickableFor=el=>{
    if(!el)return null;
    if(el.matches?.('a,button,[role="button"]'))return el;
    return el.querySelector?.('a,button,[role="button"]')||null;
  };
  const validHref=href=>{
    const h=String(href||'').trim();
    return !!h&&h!=='#'&&!/^javascript:/i.test(h);
  };
  function actionFor(el,{role='',provider='',componentId='',itemId=''}={}){
    const link=clickableFor(el);
    const disabled=!!(link&&(link.hasAttribute?.('disabled')||link.getAttribute?.('aria-disabled')==='true'||link.classList?.contains('disabled')));
    const href=String(link?.getAttribute?.('href')||'');
    const state=disabled?'disabled':validHref(href)?'bound':'unbound';
    const label=clean(link?.getAttribute?.('aria-label')||link?.getAttribute?.('title')||link?.textContent||el?.textContent||'');
    const id='action-'+hash([role,componentId,itemId,selectorFor(link||el),href,label].join('|'));
    return {
      id,
      role,
      provider,
      state,
      href,
      target:String(link?.getAttribute?.('target')||''),
      rel:String(link?.getAttribute?.('rel')||''),
      label,
      selector:selectorFor(link||el),
      component_id:componentId,
      item_id:itemId,
      source_authority:true,
      synthesize_missing_href:false
    };
  }

  function providerFromHref(href,label=''){
    const raw=String(href||'');
    let host='';
    try{host=new URL(raw,document.baseURI||location.href).hostname.toLowerCase()}catch{}
    const text=(String(label||'')+' '+host).toLowerCase();
    if(/instagram/.test(text))return'instagram';
    if(/youtube|youtu\.be/.test(text))return'youtube';
    if(/facebook|fb\.com/.test(text))return'facebook';
    if(/tiktok/.test(text))return'tiktok';
    if(/whatsapp|wa\.me/.test(text))return'whatsapp';
    if(/telegram|t\.me/.test(text))return'telegram';
    if(/twitter|x\.com/.test(text))return'x';
    if(/google\.com\/calendar|calendar\.google/.test(raw))return'google-calendar';
    if(/outlook\.live\.com|outlook\.office\.com|office\.com/.test(raw))return'outlook-calendar';
    return'';
  }

  function calendarProvider(href){
    const raw=String(href||'');
    if(/calendar\.google\.|google\.com\/calendar/i.test(raw))return'google';
    if(/outlook\.live\.com|outlook\.office\.com|office\.com/i.test(raw))return'outlook';
    return'';
  }
  function calendarPayload(href,provider){
    const out={title:'',start_raw:'',end_raw:'',location:'',details:''};
    if(!validHref(href))return out;
    try{
      const u=new URL(href,document.baseURI||location.href);
      if(provider==='google'){
        out.title=u.searchParams.get('text')||'';
        const dates=String(u.searchParams.get('dates')||'');const parts=dates.split('/');
        out.start_raw=parts[0]||'';out.end_raw=parts[1]||'';
        out.location=u.searchParams.get('location')||'';
        out.details=u.searchParams.get('details')||'';
      }else if(provider==='outlook'){
        out.title=u.searchParams.get('subject')||u.searchParams.get('title')||'';
        out.start_raw=u.searchParams.get('startdt')||u.searchParams.get('start')||'';
        out.end_raw=u.searchParams.get('enddt')||u.searchParams.get('end')||'';
        out.location=u.searchParams.get('location')||'';
        out.details=u.searchParams.get('body')||u.searchParams.get('description')||'';
      }
    }catch{}
    return out;
  }

  function compileCalendars(doc){
    const out=[],seen=new Set();
    const candidates=[
      ...doc.querySelectorAll('[data-widget_type="weddingpress-datekit.default"],[data-widget_type^="weddingpress-datekit."]'),
      ...doc.querySelectorAll('a[href*="calendar.google"],a[href*="google.com/calendar"],a[href*="outlook.live.com"],a[href*="outlook.office.com"]')
    ];
    candidates.forEach((node,index)=>{
      const click=clickableFor(node)||node.closest?.('a[href]')||node.querySelector?.('a[href]');
      const href=String(click?.getAttribute?.('href')||'');
      const provider=calendarProvider(href);
      const label=clean(click?.textContent||node.textContent||'');
      if(!provider&&!/save\s+the\s+date|calendar|kalender/i.test(label))return;
      const sourceId=elementId(node)||elementId(node.closest?.('[data-widget_type]'))||'';
      const semanticKey=[provider||'unknown',href,selectorFor(click||node),label].join('|');
      if(seen.has(semanticKey))return;seen.add(semanticKey);
      const id='calendar-'+hash([sourceId,semanticKey,index].join('|'));
      const action=actionFor(click||node,{role:'calendar-cta',provider:provider||'unknown',componentId:id});
      out.push({
        id,
        type:'calendar-cta',
        selector:selectorFor(node),
        source_id:sourceId,
        provider:provider||'unknown',
        action,
        payload:calendarPayload(href,provider),
        source_authority:true
      });
    });
    return out;
  }

  function compileIconLists(doc){
    return [...doc.querySelectorAll('[data-widget_type="icon-list.default"],[data-widget_type^="icon-list."]')].map((host,index)=>{
      const id='icon-list-'+hash([elementId(host),selectorFor(host),index].join('|'));
      const items=[...host.querySelectorAll('.elementor-icon-list-item')].map((item,order)=>{
        const text=clean(item.querySelector('.elementor-icon-list-text')?.textContent||item.textContent||'');
        const icon=item.querySelector('.elementor-icon-list-icon i,.elementor-icon-list-icon svg,.elementor-icon-list-icon');
        const sourceId=([...item.classList].find(x=>/^elementor-repeater-item-/.test(x))||'').replace(/^elementor-repeater-item-/,'')||item.getAttribute('data-id')||'';
        const itemId='icon-list-item-'+hash([id,sourceId,order,text].join('|'));
        return {
          id:itemId,
          source_id:sourceId,
          order,
          text,
          icon_class:clean(icon?.getAttribute?.('class')||''),
          action:actionFor(item,{role:'icon-list-item',componentId:id,itemId}),
          source_authority:true
        };
      });
      return {id,type:'icon-list',selector:selectorFor(host),source_id:elementId(host),item_count:items.length,items,source_order_authoritative:true,source_authority:true};
    });
  }

  function socialProvider(item,action){
    const classes=String(item?.className||'')+' '+String(clickableFor(item)?.className||'');
    const label=action?.label||'';
    const p=providerFromHref(action?.href,label+' '+classes);
    if(p)return p;
    const m=classes.match(/elementor-social-icon-([A-Za-z0-9_-]+)/i);
    return m?.[1]?.toLowerCase()||'unknown';
  }
  function compileSocial(doc){
    return [...doc.querySelectorAll('[data-widget_type="social-icons.default"],[data-widget_type^="social-icons."]')].map((host,index)=>{
      const id='social-'+hash([elementId(host),selectorFor(host),index].join('|'));
      let nodes=[...host.querySelectorAll('.elementor-grid-item,.elementor-social-icon')];
      const grid=nodes.filter(n=>n.classList.contains('elementor-grid-item'));if(grid.length)nodes=grid;
      const seen=new Set();
      const items=[];
      nodes.forEach((item,order)=>{
        const sourceId=([...item.classList].find(x=>/^elementor-repeater-item-/.test(x))||'').replace(/^elementor-repeater-item-/,'')||item.getAttribute('data-id')||'';
        const itemId='social-item-'+hash([id,sourceId,order].join('|'));if(seen.has(itemId))return;seen.add(itemId);
        const prelim=actionFor(item,{role:'social-link',componentId:id,itemId});
        const provider=socialProvider(item,prelim);
        prelim.provider=provider;
        items.push({id:itemId,source_id:sourceId,order,provider,label:prelim.label,action:prelim,source_authority:true});
      });
      return {id,type:'social-links',selector:selectorFor(host),source_id:elementId(host),item_count:items.length,items,source_order_authoritative:true,source_authority:true};
    });
  }

  function compileLiveCtas(doc){
    const out=[],seen=new Set();
    const candidates=[...doc.querySelectorAll('a,button,[role="button"],.elementor-widget-button')];
    candidates.forEach((node,index)=>{
      const click=clickableFor(node)||node;
      const label=clean(click.textContent||node.textContent||'');
      if(!/(?:\blive\s+(?:instagram|youtube|streaming)\b|\bsaksikan\s+(?:live|langsung)\b|\bsiaran\s+langsung\b)/i.test(label))return;
      const href=String(click.getAttribute?.('href')||'');
      const provider=providerFromHref(href,label)||(/instagram/i.test(label)?'instagram':/youtube/i.test(label)?'youtube':'live');
      const key=selectorFor(click)+'|'+label+'|'+href;if(seen.has(key))return;seen.add(key);
      const id='live-cta-'+hash(key);
      out.push({
        id,
        type:'live-cta',
        selector:selectorFor(node),
        provider,
        label,
        action:actionFor(click,{role:'live-cta',provider,componentId:id}),
        source_authority:true
      });
    });
    return out;
  }

  function compile(doc){
    const calendars=compileCalendars(doc);
    const iconLists=compileIconLists(doc);
    const socialLinks=compileSocial(doc);
    const liveCtas=compileLiveCtas(doc);
    const actions=[];
    const addAction=a=>{if(!a)return;if(actions.some(x=>x.id===a.id))return;actions.push(a)};
    calendars.forEach(x=>addAction(x.action));
    iconLists.forEach(x=>x.items.forEach(i=>addAction(i.action)));
    socialLinks.forEach(x=>x.items.forEach(i=>addAction(i.action)));
    liveCtas.forEach(x=>addAction(x.action));
    return {
      version:CONTRACT_VERSION,
      engine:'dini-semantic-components-v'+VERSION,
      calendars,
      icon_lists:iconLists,
      social_links:socialLinks,
      live_ctas:liveCtas,
      actions,
      counts:{
        calendars:calendars.length,
        icon_lists:iconLists.length,
        icon_list_items:iconLists.reduce((n,x)=>n+x.item_count,0),
        social_groups:socialLinks.length,
        social_links:socialLinks.reduce((n,x)=>n+x.item_count,0),
        live_ctas:liveCtas.length,
        actions:actions.length,
        bound:actions.filter(x=>x.state==='bound').length,
        unbound:actions.filter(x=>x.state==='unbound').length,
        disabled:actions.filter(x=>x.state==='disabled').length
      },
      action_contract:{
        states:['bound','unbound','disabled'],
        synthesize_missing_href:false,
        preserve_exact_href:true,
        preserve_target_rel:true,
        source_disabled_authoritative:true
      }
    };
  }

  VR.makeSourceGraph=function(doc,opts={}){
    const graph=originalMakeSourceGraph(doc,opts);
    try{
      const components=compile(doc);
      graph.semantic_components={...(graph.semantic_components||{}),actions_v1:components};
      graph.authority={...(graph.authority||{}),action_component_truth:'source-dom-href-and-disabled-state'};
      graph.diagnostics={...(graph.diagnostics||{}),calendar_cta_count:components.counts.calendars,icon_list_count:components.counts.icon_lists,icon_list_item_count:components.counts.icon_list_items,social_group_count:components.counts.social_groups,social_link_count:components.counts.social_links,live_cta_count:components.counts.live_ctas,bound_action_count:components.counts.bound,unbound_action_count:components.counts.unbound,disabled_action_count:components.counts.disabled};
      return graph;
    }catch(err){
      console.warn('[DINI SEMANTIC COMPONENTS] compile gagal; graph lama dipertahankan.',err);
      graph.semantic_components={...(graph.semantic_components||{}),actions_v1:{version:CONTRACT_VERSION,engine:'dini-semantic-components-v'+VERSION,calendars:[],icon_lists:[],social_links:[],live_ctas:[],actions:[],counts:{actions:0,bound:0,unbound:0,disabled:0},error:String(err?.message||err)}};
      return graph;
    }
  };

  g.DiniSemanticComponents={version:VERSION,contract_version:CONTRACT_VERSION,compile,compileCalendars,compileIconLists,compileSocial,compileLiveCtas,actionFor};
  console.info('[DINI SEMANTIC COMPONENTS] V'+VERSION+' aktif — Calendar/Icon List/Social/Live CTA + bound/unbound/disabled action contract.');
})(window);
