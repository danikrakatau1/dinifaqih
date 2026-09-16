(function(g){
  'use strict';
  if(g.DiniSourcePersonalization?.version)return;

  const VERSION='1.0.0';
  const VR=g.DiniVisualResolver;
  if(!VR||typeof VR.makeSourceGraph!=='function'){
    console.warn('[DINI PERSONALIZATION] Visual resolver belum tersedia.');
    return;
  }

  const previousMakeSourceGraph=VR.makeSourceGraph.bind(VR);
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const uniq=a=>[...new Set((a||[]).filter(Boolean))];
  const elementId=el=>el?.getAttribute?.('data-id')||((String(el?.className||'').match(/elementor-element-([a-zA-Z0-9_-]+)/)||[])[1])||el?.id||'';
  const esc=v=>g.CSS?.escape?CSS.escape(String(v||'')):String(v||'').replace(/[^a-zA-Z0-9_-]/g,'\\$&');
  const selectorFor=el=>{
    if(!el)return'';
    if(el.id)return '#'+esc(el.id);
    if(el.hasAttribute?.('data-dini-bind'))return `[data-dini-bind="${String(el.getAttribute('data-dini-bind')||'').replace(/"/g,'\\"')}"]`;
    const id=elementId(el);if(id)return `[data-id="${String(id).replace(/"/g,'\\"')}"]`;
    const cls=[...(el.classList||[])].find(x=>/^elementor-element-/.test(x));if(cls)return'.'+esc(cls);
    return String(el.tagName||'element').toLowerCase();
  };
  const pathWithinOwner=(owner,node)=>{
    if(!owner||!node)return[];
    const out=[];let n=node;
    while(n&&n!==owner){const p=n.parentElement;if(!p)return[];out.unshift([...p.children].indexOf(n));n=p}
    return n===owner?out:[];
  };
  const ownerFor=el=>el?.closest?.('.elementor-widget,[data-id]')||el?.parentElement||el;
  const isLeaf=el=>![...(el?.children||[])].some(c=>clean(c.textContent)===clean(el.textContent)&&clean(c.textContent));

  function markBinding(el){
    if(!el)return;
    el.setAttribute('data-dini-bind','guest_name');
    el.setAttribute('data-dini-personalization-field','guest_name');
    el.setAttribute('data-dini-guest-name','1');
  }

  function explicitNodes(doc){
    const selectors=[
      '[data-dini-bind="guest_name"]',
      '[data-dini-personalization-field="guest_name"]',
      '[data-dini-guest-name]',
      '[data-native-guest-name]',
      '[data-guest-name]'
    ];
    const out=[],seen=new Set();
    for(const sel of selectors){
      doc.querySelectorAll(sel).forEach(el=>{
        if(seen.has(el))return;seen.add(el);
        const text=clean(el.textContent);
        if(!text||!isLeaf(el))return;
        markBinding(el);out.push(el);
      });
    }
    return out;
  }

  function heuristicCandidates(doc){
    const out=[];
    const nodes=[...doc.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,label,div')].filter(isLeaf);
    for(const el of nodes){
      const text=clean(el.textContent);if(!text||text.length>160)continue;
      const context=clean(el.parentElement?.textContent).slice(0,320);
      let score=0;
      const reasons=[];
      if(/kepada\s+yth|kpd\.?\s*yth/i.test(context)){score+=0.45;reasons.push('salutation-context')}
      if(/di\s+tempat/i.test(context)){score+=0.25;reasons.push('place-context')}
      if(/nama\s+tamu|guest\s*name|guest/i.test(text)){score+=0.2;reasons.push('guest-token')}
      if(/__DINI_GUEST_PROBE__/i.test(text)){score=1;reasons.push('source-probe-sentinel')}
      if(score<0.45)continue;
      out.push({
        type:'guest_name',selector:selectorFor(el),element_id:elementId(ownerFor(el)),text,
        confidence:Math.min(1,score),reason:reasons.join('+')||'context-heuristic',requires_confirmation:score<0.95
      });
    }
    return out.slice(0,12);
  }

  function buildField(el,index){
    const owner=ownerFor(el);
    markBinding(el);
    return {
      id:`guest-name-${index+1}`,
      type:'guest_name',
      binding:'guest_name',
      selector:'[data-dini-bind="guest_name"]',
      node_selector:selectorFor(el),
      owner_selector:selectorFor(owner),
      element_id:elementId(owner),
      node_path:pathWithinOwner(owner,el),
      fallback_text:clean(el.textContent)||'Nama Tamu',
      source:el.hasAttribute('data-dini-guest-source-probe')?'source-probe-marker':'explicit-marker',
      confidence:1,
      url_parameter:'to',
      sanitize:'text-only',
      preserve_style:true,
      preserve_animation:true,
      mutation_policy:'textContent-only',
      clone_node:false,
      create_node:false,
      force_visibility:false,
      strip_identity:false
    };
  }

  function scan(doc,basePersonalization={}){
    const nodes=explicitNodes(doc);
    const fields=nodes.map(buildField);
    const candidates=fields.length?[]:heuristicCandidates(doc);
    return {
      ...(basePersonalization||{}),
      version:2,
      engine:`source-personalization-v${VERSION}`,
      fields,
      candidates,
      binding_policy:{
        automatic_min_confidence:0.95,
        heuristic_requires_confirmation:true,
        url_parameter:'to',
        fallback:'source-text',
        injection:'textContent-only',
        style_owner:'template',
        animation_owner:'template',
        node_owner:'template',
        allow_clone:false,
        allow_create:false,
        allow_force_visibility:false,
        allow_style_mutation:false,
        allow_class_mutation:false
      }
    };
  }

  function augmentGraph(doc,graph){
    const out=graph||{};
    out.personalization=scan(doc,out.personalization||{});
    out.authority={...(out.authority||{}),personalization_truth:'source-native-binding',personalization_runtime:'textContent-only'};
    out.diagnostics={...(out.diagnostics||{}),personalization_fields:out.personalization.fields.length,personalization_candidates:out.personalization.candidates.length};
    return out;
  }

  VR.makeSourceGraph=function(doc,opts={}){
    const graph=previousMakeSourceGraph(doc,opts);
    try{return augmentGraph(doc,graph)}catch(err){console.warn('[DINI PERSONALIZATION] augment gagal; graph lama dipertahankan.',err);return graph}
  };

  g.DiniSourcePersonalization={version:VERSION,scan,augmentGraph,markBinding};
  console.info('[DINI PERSONALIZATION] V'+VERSION+' aktif — guest_name source-native binding, textContent-only.');
})(window);
