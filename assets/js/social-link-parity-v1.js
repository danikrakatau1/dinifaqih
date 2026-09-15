(()=>{
  'use strict';
  if(window.__DINI_SOCIAL_LINK_PARITY_V1__)return;
  window.__DINI_SOCIAL_LINK_PARITY_V1__=true;

  const VERSION='1.0.0';
  const deep=v=>JSON.parse(JSON.stringify(v??null));
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
  const safe=v=>String(v||'social').toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'')||'social';
  const fieldIds=node=>[...new Set(((node?.getAttribute?.('data-native-edit-id')||'')+','+(node?.getAttribute?.('data-native-edit-ids')||'')).split(/[\s,]+/).filter(Boolean))];

  function roleOf(a){
    const sig=[a?.className||'',a?.textContent||'',a?.getAttribute?.('aria-label')||'',a?.getAttribute?.('title')||'',a?.getAttribute?.('href')||''].join(' ').toLowerCase();
    if(/(?:whatsapp|wa\.me|api\.whatsapp)/i.test(sig))return'whatsapp';
    if(/instagram/i.test(sig))return'instagram';
    if(/(?:social-icon-link|>\s*link\s*<|\blink\b|website|galeriundanganofficial\.com)/i.test(sig))return'website';
    return'';
  }
  const labelOf=role=>role==='instagram'?'Instagram URL':role==='whatsapp'?'WhatsApp URL':'Website URL';

  function svg(role){
    const common='data-dini-social-svg="'+role+'" viewBox="0 0 24 24" aria-hidden="true" focusable="false" style="width:1em;height:1em;display:block;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;pointer-events:none"';
    if(role==='instagram')return `<svg ${common}><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.4" cy="6.6" r="1" style="fill:currentColor;stroke:none"></circle></svg>`;
    if(role==='whatsapp')return `<svg ${common}><path d="M20.5 3.5A10 10 0 0 0 4.8 15.7L3.5 20.5l4.9-1.3A10 10 0 1 0 20.5 3.5Z"></path><path d="M8.3 7.8c.2-.5.4-.5.7-.5h.6c.2 0 .4.1.5.4l.8 1.8c.1.3.1.5-.1.7l-.6.7c-.2.2-.2.4-.1.6.6 1.1 1.5 2 2.6 2.6.2.1.4.1.6-.1l.8-1c.2-.2.4-.3.7-.2l1.8.8c.3.1.4.3.4.5v.6c0 .3-.1.6-.4.8-.5.5-1.4.9-2.3.8-1.4-.1-3.2-.7-5-2.3-1.6-1.5-2.6-3.4-2.8-4.9-.1-.7.1-1.7.6-2.3Z"></path></svg>`;
    return `<svg ${common}><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"></path><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"></path></svg>`;
  }

  function ensureStyle(doc){
    if(doc.getElementById('dini-social-parity-style'))return;
    const s=doc.createElement('style');s.id='dini-social-parity-style';s.textContent=`
[data-dini-social-parity="${VERSION}"]{visibility:visible!important;opacity:1!important}
[data-dini-social-parity="${VERSION}"] .elementor-social-icons-wrapper{display:flex!important;align-items:center!important;justify-content:center!important;flex-wrap:wrap!important}
[data-dini-social-parity="${VERSION}"] a.elementor-social-icon{display:inline-flex!important;align-items:center!important;justify-content:center!important;pointer-events:auto!important;text-decoration:none!important}
[data-dini-social-parity="${VERSION}"] [data-dini-social-font-icon="1"]{display:none!important}
[data-dini-social-parity="${VERSION}"] [data-dini-social-svg]{width:1em!important;height:1em!important;display:block!important}
`;(doc.head||doc.documentElement).appendChild(s);
  }

  function markAnchor(a,fieldId,nodeId){
    const prior=fieldIds(a);
    if(!a.getAttribute('data-native-node-id'))a.setAttribute('data-native-node-id',nodeId);
    if(!prior.length)a.setAttribute('data-native-edit-id',fieldId);
    else if(!prior.includes(fieldId))a.setAttribute('data-native-edit-ids',[...prior,fieldId].join(' '));
    a.setAttribute('data-dini-social-field',fieldId);
  }

  function augment(html,inputSchema,inputValues){
    const schema=deep(inputSchema||{});schema.fields=Array.isArray(schema.fields)?schema.fields:[];schema.sections=Array.isArray(schema.sections)?schema.sections:[];
    const values={...deep(inputValues||{})};
    const doc=new DOMParser().parseFromString(String(html||''),'text/html');
    const anchors=[...doc.querySelectorAll('.elementor-widget-social-icons a.elementor-social-icon')];
    if(!anchors.length)return {html:String(html||''),schema,values,count:0,version:VERSION};
    ensureStyle(doc);
    let sectionIndex=schema.sections.findIndex(s=>String(s?.id||'')==='dini-social-links');
    if(sectionIndex<0){sectionIndex=schema.sections.length;schema.sections.push({id:'dini-social-links',label:'Social Links',source:'social-parity-v1'})}
    const used=new Set(schema.fields.map(f=>String(f?.id||'')));
    let count=0;
    anchors.forEach((a,index)=>{
      const role=roleOf(a);if(!role)return;
      const widget=a.closest('[data-widget_type="social-icons.default"],.elementor-widget-social-icons');
      if(widget){widget.classList.remove('elementor-invisible');widget.setAttribute('data-dini-social-parity',VERSION);widget.style?.setProperty('visibility','visible','important');widget.style?.setProperty('opacity','1','important')}
      const widgetId=safe(widget?.getAttribute?.('data-id')||'social');
      const href=String(a.getAttribute('href')||'');
      const marked=fieldIds(a);
      let field=marked.map(id=>schema.fields.find(f=>f?.id===id&&f?.kind==='url')).find(Boolean)||null;
      if(!field)field=schema.fields.find(f=>f?.kind==='url'&&String(f?.source_element_id||'')===String(widget?.getAttribute?.('data-id')||'')&&String(values[f.id]??f.value??'')===href)||null;
      if(!field){
        let id=`social-url-${widgetId}-${role}`,n=2;while(used.has(id))id=`social-url-${widgetId}-${role}-${n++}`;used.add(id);
        field={id,kind:'url',label:labelOf(role),value:href,section_index:sectionIndex,source_element_id:String(widget?.getAttribute?.('data-id')||''),source_location:'source-dom',attribute:'href',social_role:role,social_parity_version:VERSION};
        schema.fields.push(field);
      }else{
        field.social_role=role;field.social_parity_version=VERSION;field.label=labelOf(role);field.section_index=sectionIndex;field.attribute='href';
      }
      const nodeId=String(a.getAttribute('data-native-node-id')||`dini-social-${widgetId}-${role}-${index+1}`);
      field.node_id=nodeId;markAnchor(a,field.id,nodeId);
      if(!own(values,field.id))values[field.id]=href;
      const oldIcons=[...a.querySelectorAll('i')];oldIcons.forEach(i=>{i.setAttribute('data-dini-social-font-icon','1');i.style.setProperty('display','none','important')});
      if(!a.querySelector(`[data-dini-social-svg="${role}"]`))a.insertAdjacentHTML('beforeend',svg(role));
      a.setAttribute('data-dini-social-role',role);a.setAttribute('aria-label',labelOf(role).replace(' URL',''));
      count++;
    });
    doc.documentElement.setAttribute('data-dini-social-parity',VERSION);
    return {html:'<!doctype html>\n'+doc.documentElement.outerHTML,schema,values,count,version:VERSION};
  }

  function augmentSnapshot(input){
    const snap=deep(input||{});if(!snap?.schema)return snap;
    const out=augment(snap.html||snap.baseHtml||'',snap.schema,snap.values||{});
    if(!out.count)return snap;
    snap.html=out.html;snap.baseHtml=out.html;snap.schema=out.schema;snap.values=out.values;
    snap.social_link_parity={version:VERSION,count:out.count,materialized:true};
    return snap;
  }

  function patchCanonical(){
    const C=window.DINI_TEMPLATE_CANONICAL_V1160;if(!C||C.__diniSocialParityV1)return;
    const base=C.resolveSnapshot?.bind(C);if(typeof base!=='function')return;
    C.resolveSnapshot=input=>base(augmentSnapshot(input));
    C.augmentSocialSnapshot=augmentSnapshot;C.__diniSocialParityV1=VERSION;
    document.documentElement.dataset.socialCanonicalExtension=VERSION;
  }

  function patchFetch(){
    const E=window.DINI_FETCH_V2;if(!E||E.__diniSocialParityV1)return;
    const baseLoad=E.loadOrCreateSession.bind(E),baseSave=E.saveSession.bind(E);
    const sourceBaseline=new WeakMap();
    E.loadOrCreateSession=async h=>{
      const session=await baseLoad(h);if(!session?.baseline)return session;
      const original=deep(session.baseline);sourceBaseline.set(session,original);
      const out=augment(original.html||'',original.schema||{},original.values||{});
      if(out.count){session.baseline.html=out.html;session.baseline.schema=out.schema;session.baseline.values=out.values;session.baseline.hash=E.baselineHash(out.html,out.schema);session.baseline.field_count=out.schema.fields.length;session.baseline.social_link_parity={version:VERSION,count:out.count,runtime_extension:true}}
      Object.defineProperty(session,'__diniSocialSourceBaseline',{value:original,writable:false,configurable:true,enumerable:false});
      return session;
    };
    E.saveSession=async session=>{
      const persist=deep(session);const original=session?.__diniSocialSourceBaseline||sourceBaseline.get(session);
      if(original)persist.baseline=deep(original);
      const saved=await baseSave(persist);session.updated_at=saved?.updated_at||session.updated_at;return session;
    };
    E.augmentSocialSnapshot=augmentSnapshot;E.__diniSocialParityV1=VERSION;
    document.documentElement.dataset.socialFetchExtension=VERSION;
  }

  patchCanonical();patchFetch();
  window.DINI_SOCIAL_LINK_PARITY_V1={VERSION,augment,augmentSnapshot,patchCanonical,patchFetch};
})();