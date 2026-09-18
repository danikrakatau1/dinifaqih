(function(g){
  'use strict';
  if(g.DiniGalleryAdapter?.version)return;

  const VERSION='1.0.0';
  const CONTRACT_VERSION=1;
  const VR=g.DiniVisualResolver;
  if(!VR?.makeSourceGraph){
    console.warn('[DINI GALLERY] Visual resolver belum tersedia.');
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
  const num=v=>{
    if(v===''||v==null)return null;
    if(typeof v==='object'&&v&&v.size!==undefined)return Number.isFinite(Number(v.size))?Number(v.size):null;
    return Number.isFinite(Number(v))?Number(v):null;
  };
  const pick=(cfg,...keys)=>{for(const k of keys)if(cfg&&Object.prototype.hasOwnProperty.call(cfg,k)&&cfg[k]!==''&&cfg[k]!=null)return cfg[k];return null};
  const isPlaceholder=u=>{const x=String(u||'').trim();return !x||x==='#'||/^javascript:/i.test(x)||/^data:image\/(?:gif|svg\+xml)/i.test(x)};
  const yes=v=>/^(?:yes|true|1|on|default)$/i.test(clean(v));

  function actionHashUrl(anchor){
    const raw=String(anchor?.getAttribute?.('data-e-action-hash')||'');if(!raw)return'';
    try{
      const decoded=decodeURIComponent(raw.replace(/^#/,''));
      const m=decoded.match(/(?:^|&)settings=([^&]+)/);if(!m)return'';
      let body=decodeURIComponent(m[1]).replace(/-/g,'+').replace(/_/g,'/');
      while(body.length%4)body+='=';
      const json=atob(body),cfg=JSON.parse(json);
      return String(cfg?.url||cfg?.src||'');
    }catch{return''}
  }
  function imageFromItem(item){
    const image=item.querySelector('.e-gallery-image,.elementor-gallery-item__image,img');
    const href=item.getAttribute?.('href')||'';
    const thumb=image?.getAttribute?.('data-thumbnail')||image?.getAttribute?.('data-src')||image?.getAttribute?.('src')||'';
    const recovered=actionHashUrl(item);
    return !isPlaceholder(href)?href:!isPlaceholder(thumb)?thumb:recovered;
  }
  function itemMeta(item,index){
    const image=item.querySelector('.e-gallery-image,.elementor-gallery-item__image,img');
    const url=imageFromItem(item);
    const width=num(image?.getAttribute?.('data-width'))||num(image?.getAttribute?.('width'));
    const height=num(image?.getAttribute?.('data-height'))||num(image?.getAttribute?.('height'));
    const title=clean(
      item.getAttribute?.('data-elementor-lightbox-title')||
      image?.getAttribute?.('alt')||
      item.querySelector?.('.elementor-gallery-item__title,.e-gallery-item__title')?.textContent||
      ''
    );
    const description=clean(
      item.getAttribute?.('data-elementor-lightbox-description')||
      item.getAttribute?.('data-elementor-lightbox-caption')||
      item.querySelector?.('.elementor-gallery-item__description,.e-gallery-item__description')?.textContent||
      ''
    );
    return {
      id:'gallery-item-'+hash((item.getAttribute?.('data-id')||item.id||'')+'|'+index+'|'+url),
      index,
      source_id:item.getAttribute?.('data-id')||item.id||'',
      url,
      width,
      height,
      aspect_ratio:width&&height?width/height:null,
      title,
      description,
      source_authority:true
    };
  }
  function layoutMode(cfg,el){
    const raw=String(pick(cfg,'gallery_layout','layout')||'').toLowerCase();
    if(/masonry/.test(raw)||el.querySelector('.e-gallery-masonry'))return'masonry';
    if(/justified/.test(raw)||el.querySelector('.e-gallery-justified'))return'justified';
    return'grid';
  }
  function columns(cfg){
    const d=num(pick(cfg,'columns','columns_desktop'))??3;
    const t=num(pick(cfg,'columns_tablet'))??Math.min(d,3);
    const m=num(pick(cfg,'columns_mobile'))??Math.min(t,2);
    return {desktop:d,tablet:t,mobile:m};
  }
  function gap(cfg){
    const d=num(pick(cfg,'gap','gallery_gap'))??10;
    const t=num(pick(cfg,'gap_tablet','gallery_gap_tablet'))??d;
    const m=num(pick(cfg,'gap_mobile','gallery_gap_mobile'))??t;
    return {desktop:d,tablet:t,mobile:m};
  }
  function lightboxConfig(cfg,el,items){
    const attr=el.getAttribute?.('data-elementor-open-lightbox');
    const setting=pick(cfg,'open_lightbox');
    const enabled=setting==='no'||attr==='no'?false:setting==='yes'||attr==='yes'?true:items.some(x=>!!x.url);
    const titleMode=String(pick(cfg,'lightbox_title')||'title').toLowerCase();
    const descriptionMode=String(pick(cfg,'lightbox_description')||'description').toLowerCase();
    return {
      enabled,
      title_mode:titleMode,
      description_mode:descriptionMode,
      navigation:true,
      counter:true,
      keyboard:true,
      close_on_backdrop:true
    };
  }
  function compileInstance(el,index){
    const cfg=parseSettings(el);
    const root=el.querySelector('.elementor-gallery__container,.e-gallery-container')||el;
    let nodes=[...root.querySelectorAll(':scope > .e-gallery-item,:scope > .elementor-gallery-item')];
    if(!nodes.length)nodes=[...el.querySelectorAll('.e-gallery-item,.elementor-gallery-item')];
    const items=nodes.map(itemMeta).filter(x=>x.url||x.title||x.description);
    const mode=layoutMode(cfg,el);
    return {
      id:'gallery-'+hash(selectorFor(el)+'|'+index),
      adapter:'elementor-gallery-semantic',
      selector:selectorFor(el),
      element_id:elementId(el),
      root_selector:root===el?selectorFor(el):'.elementor-gallery__container,.e-gallery-container',
      mode,
      item_count:items.length,
      items,
      responsive:{columns:columns(cfg),gap_px:gap(cfg)},
      justified:{
        ideal_row_height_px:num(pick(cfg,'ideal_row_height','ideal_row_height_tablet'))??200,
        last_row:String(pick(cfg,'last_row')||'nojustify')
      },
      masonry:{column_fill:'balance'},
      lightbox:lightboxConfig(cfg,el,items),
      raw_settings:cfg,
      isolation:{
        scope:selectorFor(el),
        lightbox_group:'gallery-'+hash(selectorFor(el)+'|'+index),
        runtime_state:'per-instance',
        cross_instance_writes:false
      },
      source_order_authoritative:true,
      source_authority:true
    };
  }
  function compile(doc){
    const nodes=[...doc.querySelectorAll('[data-widget_type="gallery.default"],[data-widget_type^="gallery."]')];
    const instances=nodes.map(compileInstance);
    return {
      version:CONTRACT_VERSION,
      engine:'dini-gallery-adapter-v'+VERSION,
      instances,
      counts:{
        total:instances.length,
        items:instances.reduce((n,x)=>n+x.item_count,0),
        grid:instances.filter(x=>x.mode==='grid').length,
        masonry:instances.filter(x=>x.mode==='masonry').length,
        justified:instances.filter(x=>x.mode==='justified').length,
        lightbox:instances.filter(x=>x.lightbox.enabled).length
      },
      runtime_policy:{
        per_instance_state:true,
        source_item_order_authoritative:true,
        source_urls_authoritative:true,
        no_template_specific_layout:true,
        lightbox_group_isolated:true,
        arbitrary_source_js:false
      }
    };
  }

  VR.makeSourceGraph=function(doc,opts={}){
    const graph=originalMakeSourceGraph(doc,opts);
    try{
      const plan=compile(doc);
      graph.behavior_adapters={...(graph.behavior_adapters||{}),gallery:plan};
      graph.authority={...(graph.authority||{}),gallery_truth:'source-widget-settings-and-gallery-dom'};
      graph.diagnostics={...(graph.diagnostics||{}),gallery_adapter_count:plan.counts.total,gallery_item_count:plan.counts.items,gallery_masonry_count:plan.counts.masonry,gallery_justified_count:plan.counts.justified,gallery_lightbox_count:plan.counts.lightbox};
      return graph;
    }catch(err){
      console.warn('[DINI GALLERY] compile gagal; graph lama dipertahankan.',err);
      graph.behavior_adapters={...(graph.behavior_adapters||{}),gallery:{version:CONTRACT_VERSION,engine:'dini-gallery-adapter-v'+VERSION,instances:[],counts:{total:0},error:String(err?.message||err)}};
      return graph;
    }
  };

  g.DiniGalleryAdapter={version:VERSION,contract_version:CONTRACT_VERSION,compile,compileInstance,actionHashUrl,imageFromItem};
  console.info('[DINI GALLERY] V'+VERSION+' aktif — grid/masonry/justified + isolated Elementor lightbox contract.');
})(window);
