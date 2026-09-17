(function(g){
  'use strict';
  if(g.DINI_GUEST_CONTRACT_CORE_V1?.version)return;

  const VERSION='1.1.0';
  const CONTRACT_VERSION=1;
  const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
  const norm=s=>clean(s).toLowerCase();
  const uniq=a=>[...new Set((a||[]).filter(Boolean))];
  const esc=v=>g.CSS?.escape?g.CSS.escape(String(v||'')):String(v||'').replace(/[^a-zA-Z0-9_-]/g,'\\$&');
  const hash=s=>{let h=2166136261;for(const c of String(s??'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')};
  const elementId=el=>el?.getAttribute?.('data-id')||((String(el?.className||'').match(/elementor-element-([a-zA-Z0-9_-]+)/)||[])[1])||el?.id||'';
  const isInput=el=>!!el?.matches?.('input,textarea,select');
  const isTextInput=el=>{
    if(!el?.matches?.('input,textarea'))return false;
    if(el.matches('textarea'))return true;
    const type=String(el.getAttribute('type')||'text').toLowerCase();
    return ['text','search','email','tel','url',''].includes(type);
  };
  const isLeafText=el=>{
    if(!el||isInput(el))return false;
    const text=clean(el.textContent);if(!text)return false;
    return ![...(el.children||[])].some(c=>clean(c.textContent)===text&&clean(c.textContent));
  };
  const ownerFor=el=>el?.closest?.('.elementor-widget,[data-widget_type],[data-id],form')||el?.parentElement||el;
  const pathWithinOwner=(owner,node)=>{
    if(!owner||!node)return[];
    const out=[];let n=node;
    while(n&&n!==owner){const p=n.parentElement;if(!p)return[];out.unshift([...p.children].indexOf(n));n=p}
    return n===owner?out:[];
  };
  const selectorFor=el=>{
    if(!el)return'';
    if(el.id)return '#'+esc(el.id);
    const bind=el.getAttribute?.('data-dini-guest-slot-id');if(bind)return `[data-dini-guest-slot-id="${String(bind).replace(/"/g,'\\"')}"]`;
    const id=elementId(el);if(id)return `[data-id="${String(id).replace(/"/g,'\\"')}"]`;
    const name=el.getAttribute?.('name');if(name)return `${String(el.tagName||'input').toLowerCase()}[name="${String(name).replace(/"/g,'\\"')}"]`;
    const rep=[...(el.classList||[])].find(x=>/^elementor-repeater-item-/.test(x));if(rep)return'.'+esc(rep);
    const cls=[...(el.classList||[])].find(x=>/^elementor-element-/.test(x));if(cls)return'.'+esc(cls);
    return String(el.tagName||'element').toLowerCase();
  };
  const slotSignature=(owner,node,role)=>[
    role,
    elementId(owner),
    selectorFor(owner),
    pathWithinOwner(owner,node).join('.'),
    node?.getAttribute?.('name')||'',
    node?.id||'',
    clean(node?.textContent||node?.getAttribute?.('placeholder')||'').slice(0,120)
  ].join('|');
  const fieldIdFor=(owner,node,role)=>'guest-'+role+'-'+hash(slotSignature(owner,node,role));
  const SALUTATION_RE=/(?:kepada\s+(?:yth\.?|bapak\s*\/?\s*ibu\s*\/?\s*saudara(?:\s*\/?\s*i)?|bapak\/ibu\/saudara\/i)|kpd\.?\s*yth\.?|dear\s+guest)/i;
  const PLACE_RE=/(?:di\s+tempat|at\s+place)/i;
  const GUEST_PLACEHOLDER_RE=/(?:nama\s+tamu|guest\s*name|nama\s+guest|nama\s+undangan|__DINI_GUEST_PROBE__)/i;

  function markNode(node,role,id,targetKind){
    if(!node)return;
    node.setAttribute('data-dini-bind','guest_name');
    node.setAttribute('data-dini-personalization-field','guest_name');
    node.setAttribute('data-dini-guest-name','1');
    node.setAttribute('data-dini-guest-role',role);
    node.setAttribute('data-dini-guest-slot-id',id);
    if(targetKind==='value')node.setAttribute('data-dini-guest-input','1');
    const owner=ownerFor(node);
    owner?.setAttribute?.('data-dini-guest-binding-owner','guest_name');
  }

  function contextFor(el){
    const parts=[];let n=el;
    for(let i=0;n&&i<4;i++,n=n.parentElement){
      parts.push(clean(n.textContent).slice(0,700));
      parts.push(String(n.className||''));
      parts.push(String(n.id||''));
      parts.push(String(n.getAttribute?.('data-widget_type')||''));
    }
    return norm(parts.join(' '));
  }
  function labelForInput(doc,input){
    const bits=[input.getAttribute('name'),input.id,input.getAttribute('placeholder'),input.getAttribute('aria-label')].filter(Boolean);
    if(input.id){try{const l=doc.querySelector(`label[for="${esc(input.id)}"]`);if(l)bits.push(l.textContent)}catch{}}
    const group=input.closest?.('.elementor-field-group,.form-group,.field,.cui-comment-form,form');
    if(group){const l=group.querySelector?.('label');if(l)bits.push(l.textContent)}
    return norm(bits.join(' '));
  }
  function roleForInput(doc,input){
    const label=labelForInput(doc,input),ctx=contextFor(input);
    if(!/(^|\b)(nama|name|author|guest|tamu)(\b|$)/i.test(label))return'';
    if(/bank|rekening|account|nominal|jumlah transfer|transfer amount|bukti|proof|file/i.test(label))return'';
    if(/guestbook|comment|komentar|ucapan|doa|wishes|weddingpress-kit2|cui-/i.test(ctx))return'guestbook_author';
    if(/rsvp|konfirmasi kehadiran|kehadiran|attendance|hadir|jumlah tamu|jumlah orang/i.test(ctx))return'rsvp_name';
    if(/wedding gift|gift|hadiah|transfer|amplop/i.test(ctx))return'gift_name';
    return'form_name';
  }

  function explicitNodes(doc){
    const out=[],seen=new Set();
    const selectors=['[data-dini-bind="guest_name"]','[data-dini-personalization-field="guest_name"]','[data-native-guest-name]','[data-dini-guest-name]','[data-guest-name]'];
    for(const sel of selectors){
      try{doc.querySelectorAll(sel).forEach(n=>{if(!seen.has(n)){seen.add(n);out.push(n)}})}catch{}
    }
    return out;
  }
  function exactPlaceholderNodes(doc){
    const out=[];
    doc.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,strong,b,label,div').forEach(el=>{
      if(!isLeafText(el))return;
      const t=norm(el.textContent);
      if(['nama tamu','guest name','nama guest','nama undangan'].includes(t))out.push(el);
    });
    return out;
  }
  function synthesizeCoverSlot(salutation){
    if(!salutation?.parentElement)return null;
    const existing=salutation.parentElement.querySelector?.('[data-dini-guest-synthetic="semantic-cover-slot"]');
    if(existing)return existing;
    const node=salutation.cloneNode(false);
    node.removeAttribute('id');
    for(const at of [...node.attributes]){
      if(/^data-(?:id|element|settings|widget|dini|native)/i.test(at.name))node.removeAttribute(at.name);
    }
    node.textContent='Nama Tamu';
    node.setAttribute('data-dini-guest-synthetic','semantic-cover-slot');
    node.setAttribute('data-dini-guest-source','strong-cover-structure');
    salutation.insertAdjacentElement('afterend',node);
    return node;
  }
  function coverCandidates(doc,{allowSemanticSynthesis=false}={}){
    const out=[];
    const explicitCover=doc.querySelector('#cover');
    const roots=explicitCover?[explicitCover]:[...doc.querySelectorAll('.elementor-top-section,section,.elementor-section')];
    const rootSeen=new Set();
    for(const root of roots){
      if(rootSeen.has(root))continue;rootSeen.add(root);
      const ctx=clean(root.textContent);
      if(!SALUTATION_RE.test(ctx)||!PLACE_RE.test(ctx))continue;
      const leaves=[...root.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,strong,b,label,div')].filter(isLeafText);
      const sal=leaves.findIndex(n=>SALUTATION_RE.test(clean(n.textContent)));
      if(sal<0)continue;
      const place=leaves.findIndex((n,i)=>i>sal&&PLACE_RE.test(clean(n.textContent)));
      if(place<0)continue;
      const between=leaves.filter((n,i)=>i>sal&&i<place);
      let node=between.find(n=>GUEST_PLACEHOLDER_RE.test(clean(n.textContent))||n.matches?.('[data-dini-bind="guest_name"],[data-dini-guest-name],[data-native-guest-name]'));
      if(!node)node=between.find(n=>{const t=clean(n.textContent);return t.length>=2&&t.length<=120&&!SALUTATION_RE.test(t)&&!PLACE_RE.test(t)&&!/buka undangan|open invitation/i.test(t)});
      if(!node&&allowSemanticSynthesis)node=synthesizeCoverSlot(leaves[sal]);
      if(node&&!out.includes(node))out.push(node);
    }
    return out;
  }
  function formCandidates(doc){
    const out=[];
    doc.querySelectorAll('input,textarea').forEach(input=>{
      if(!isTextInput(input))return;
      const role=roleForInput(doc,input);if(role)out.push({node:input,role});
    });
    return out;
  }

  function makeField(node,role,{source='semantic-scan',confidence=1,mark=true}={}){
    const owner=ownerFor(node),targetKind=isInput(node)?'value':'text',id=fieldIdFor(owner,node,role);
    if(mark)markNode(node,role,id,targetKind);
    const synthetic=node.getAttribute?.('data-dini-guest-synthetic')==='semantic-cover-slot';
    return {
      id,
      type:'guest_name',
      binding:'guest_name',
      role,
      target_kind:targetKind,
      selector:`[data-dini-guest-slot-id="${id}"]`,
      node_selector:selectorFor(node),
      owner_selector:selectorFor(owner),
      element_id:elementId(owner),
      node_path:pathWithinOwner(owner,node),
      fallback_text:isInput(node)?String(node.value||node.getAttribute('value')||node.getAttribute('placeholder')||''):clean(node.textContent),
      source:synthetic?'cover-semantic-synthesis':source,
      confidence:synthetic?1:confidence,
      url_parameter:'to',
      sanitize:'text-only',
      preserve_style:true,
      preserve_animation:true,
      mutation_policy:targetKind==='value'?'value-prefill':'textContent-only',
      preserve_readonly:node.hasAttribute?.('readonly')||false,
      semantic_synthesis:synthetic,
      synthesis_kind:synthetic?'strong-cover-structure':'',
      clone_node:synthetic,
      create_node:synthetic,
      force_visibility:false,
      strip_identity:false
    };
  }

  function scanDocument(doc,baseContract={},opts={}){
    if(!doc?.querySelectorAll)return baseContract||{};
    const mark=opts.mark!==false;
    const allowSemanticSynthesis=opts.allowSemanticSynthesis===true;
    const fields=[];const seen=new Set();
    const add=(node,role,meta={})=>{
      if(!node)return;
      const owner=ownerFor(node);const id=fieldIdFor(owner,node,role);
      const key=id+'|'+role;if(seen.has(key))return;seen.add(key);
      fields.push(makeField(node,role,{...meta,mark}));
    };

    for(const node of explicitNodes(doc)){
      const role=node.getAttribute?.('data-dini-guest-role')||(isInput(node)?roleForInput(doc,node):'cover')||'generic';
      add(node,role,{source:'explicit-marker',confidence:1});
    }
    for(const node of exactPlaceholderNodes(doc))add(node,node.closest?.('#cover')?'cover':'generic',{source:'exact-placeholder',confidence:1});
    for(const node of coverCandidates(doc,{allowSemanticSynthesis}))add(node,'cover',{source:'cover-structure',confidence:.99});
    for(const {node,role} of formCandidates(doc))add(node,role,{source:'form-semantic',confidence:.99});

    const existing=Array.isArray(baseContract?.fields)?baseContract.fields:[];
    const merged=[];const mergedIds=new Set();
    for(const f of [...existing,...fields]){
      const id=String(f?.id||'');
      const key=id||hash(JSON.stringify(f));
      if(mergedIds.has(key))continue;mergedIds.add(key);merged.push(f);
    }
    const roles=uniq(merged.map(f=>f?.role||'generic'));
    return {
      ...(baseContract||{}),
      version:4,
      contract_version:CONTRACT_VERSION,
      engine:`guest-contract-core-v${VERSION}`,
      binding:'guest_name',
      multi_slot_binding:true,
      fields:merged,
      candidates:[],
      roles,
      binding_policy:{
        ...(baseContract?.binding_policy||{}),
        automatic_min_confidence:.95,
        heuristic_requires_confirmation:false,
        url_parameter:'to',
        fallback:'source-text-or-structural-slot',
        injection:'role-aware',
        text_mutation:'textContent-only',
        form_mutation:'value-prefill',
        preserve_user_edits:true,
        style_owner:'template',
        animation_owner:'template',
        node_owner:'template',
        allow_clone:false,
        allow_create:false,
        allow_semantic_cover_synthesis:true,
        semantic_synthesis_rule:'strong-salutation-plus-di-tempat-only',
        allow_force_visibility:false,
        allow_style_mutation:false,
        allow_class_mutation:false
      }
    };
  }

  const byPath=(owner,path)=>{let n=owner;for(const i of Array.isArray(path)?path:[]){n=n?.children?.[Number(i)];if(!n)return null}return n||null};
  function resolveFieldNodes(doc,field){
    const out=[],seen=new Set();const add=n=>{if(n&&!seen.has(n)){seen.add(n);out.push(n)}};
    const q=sel=>{try{return [...doc.querySelectorAll(sel)]}catch{return[]}};
    if(field?.selector)q(field.selector).forEach(add);
    if(field?.node_selector)q(field.node_selector).forEach(add);
    if(field?.owner_selector&&Array.isArray(field?.node_path))q(field.owner_selector).forEach(o=>add(byPath(o,field.node_path)));
    if(field?.element_id&&Array.isArray(field?.node_path)){
      const id=esc(field.element_id);let owner=null;try{owner=doc.querySelector(`[data-id="${id}"],.elementor-element-${id}`)}catch{}
      add(byPath(owner,field.node_path));
    }
    return out;
  }

  g.DINI_GUEST_CONTRACT_CORE_V1={VERSION,contract_version:CONTRACT_VERSION,scanDocument,resolveFieldNodes,markNode,roleForInput,selectorFor,coverCandidates};
  console.info('[DINI GUEST CONTRACT] V'+VERSION+' aktif — global multi-slot + proven cover semantic slot.');
})(window);
