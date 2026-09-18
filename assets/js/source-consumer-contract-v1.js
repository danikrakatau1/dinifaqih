(function(g){
  'use strict';
  if(g.DiniSourceConsumerContract?.version)return;

  const VERSION='1.0.1';
  const CONTRACT_VERSION=1;
  const boundDocs=new WeakMap();
  const boundFrames=new WeakMap();
  const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
  const norm=s=>clean(s).toLowerCase();

  const runtimeManifestFrom=value=>{
    const candidates=[
      value?.runtime_manifest,
      value?.manifest?.runtime_manifest,
      value?.snapshot?.manifest?.runtime_manifest,
      value?.semantic_runtime_manifest
    ];
    return candidates.find(x=>x?.format==='dini-universal-runtime-manifest')||
      candidates.find(x=>x&&typeof x==='object')||{};
  };

  const queryAll=(root,selector)=>{
    if(!root||!selector)return[];
    try{return [...root.querySelectorAll(selector)]}catch{return[]}
  };
  const queryOne=(root,selector)=>queryAll(root,selector)[0]||null;

  function markActions(doc,manifest){
    const actions=manifest?.semantic_components?.actions_v1;
    if(!actions)return {actions:0,copy:0};
    let count=0,copyCount=0;
    for(const a of actions.actions||[]){
      for(const node of queryAll(doc,a.selector)){
        node.setAttribute('data-dini-semantic-action-id',String(a.id||''));
        node.setAttribute('data-dini-semantic-action-state',String(a.state||'unbound'));
        node.setAttribute('data-dini-semantic-action-role',String(a.role||''));
        if(a.provider)node.setAttribute('data-dini-semantic-provider',String(a.provider));
        if(a.state==='disabled')node.setAttribute('aria-disabled','true');
        count++;
      }
    }
    const copies=manifest?.semantic_components?.native_forms_v1?.copy_actions||[];
    for(const a of copies){
      for(const node of queryAll(doc,a.selector)){
        node.setAttribute('data-dini-semantic-copy','1');
        node.setAttribute('data-dini-copy-kind',String(a.kind||'copy'));
        node.setAttribute('data-dini-copy-action-id',String(a.id||''));
        node.setAttribute('data-dini-copy-state',String(a.state||'unbound'));
        if(a.state==='bound'&&a.value){
          node.setAttribute('data-copy',String(a.value));
          node.setAttribute('data-dini-copy-value-authority','semantic-contract');
        }
        copyCount++;
      }
    }
    return {actions:count,copy:copyCount};
  }

  function markForms(doc,manifest){
    const forms=manifest?.semantic_components?.native_forms_v1?.forms||[];
    let formCount=0,fieldCount=0;
    for(const formSpec of forms){
      const roots=queryAll(doc,formSpec.selector);
      for(const form of roots){
        if(String(form.tagName||'').toUpperCase()!=='FORM')continue;
        form.setAttribute('data-dini-semantic-consumer','1');
        form.setAttribute('data-dini-native-form-id',String(formSpec.id||''));
        form.setAttribute('data-dini-native-form-kind',String(formSpec.kind||''));
        form.setAttribute('data-dini-backend-owner',String(formSpec.backend?.owner||'dini-faqih'));
        if(formSpec.backend?.endpoint)form.setAttribute('data-dini-backend-endpoint',String(formSpec.backend.endpoint));
        form.setAttribute('data-dini-upstream-wp-admin-ajax','0');
        form.setAttribute('data-dini-upstream-wp-nonce','0');
        for(const fieldSpec of formSpec.fields||[]){
          let nodes=queryAll(form,fieldSpec.selector);
          if(!nodes.length&&fieldSpec.name)nodes=queryAll(form,'[name="'+String(fieldSpec.name).replace(/"/g,'\\\"')+'"]');
          if(!nodes.length&&fieldSpec.dom_id){
            const n=form.querySelector?.('#'+(g.CSS?.escape?CSS.escape(fieldSpec.dom_id):fieldSpec.dom_id));
            if(n)nodes=[n];
          }
          for(const field of nodes){
            field.setAttribute('data-dini-native-field-id',String(fieldSpec.id||''));
            field.setAttribute('data-dini-native-field-role',String(fieldSpec.role||'field'));
            fieldCount++;
          }
        }
        formCount++;
      }
    }
    return {forms:formCount,fields:fieldCount};
  }

  function markRepeaters(doc,manifest){
    const reps=[
      ...(Array.isArray(manifest?.repeaters)?manifest.repeaters:[]),
      ...(manifest?.semantic_components?.repeaters_v1?.repeaters||[])
    ];
    let roots=0,items=0;
    for(const rep of reps){
      const selectors=[rep.selector,rep.instance_scope,rep.component_selector].filter(Boolean);
      let hosts=[];
      for(const sel of selectors){hosts=queryAll(doc,sel);if(hosts.length)break}
      for(const host of hosts){
        host.setAttribute('data-dini-semantic-repeater-id',String(rep.id||rep.source_component_id||''));
        host.setAttribute('data-dini-semantic-repeater-type',String(rep.type||rep.mode||'repeater'));
        host.setAttribute('data-dini-repeater-item-count',String(rep.item_count??rep.items?.length??0));
        roots++;
        const itemSelector=rep.repeater?.item_selector||rep.item_selector||'';
        if(itemSelector){
          queryAll(host,itemSelector).forEach((item,index)=>{
            const spec=rep.items?.[index];
            item.setAttribute('data-dini-semantic-repeater-item','1');
            item.setAttribute('data-dini-semantic-repeater-index',String(index));
            if(spec?.id)item.setAttribute('data-dini-semantic-repeater-item-id',String(spec.id));
            items++;
          });
        }
      }
    }
    return {repeater_roots:roots,repeater_items:items};
  }

  function roleValue(form,role){
    const field=queryOne(form,'[data-dini-native-field-role="'+role+'"]');
    if(!field)return'';
    if((field.type==='radio'||field.type==='checkbox')&&!field.checked)return'';
    return clean(field.value??field.textContent??'');
  }

  function guestNameFor(doc,context,form){
    const explicit=clean(context?.guestName||context?.guest_name);
    if(explicit)return explicit;
    const semantic=roleValue(form,'guest_name');
    if(semantic)return semantic;
    try{
      const raw=doc.getElementById('diniGuestRuntimeData')?.textContent||'';
      const data=raw?JSON.parse(raw):{};
      if(clean(data?.name))return clean(data.name);
    }catch{}
    return '';
  }

  async function guestbookRequest(url,options={}){
    const res=await fetch(url,{cache:'no-store',...options});
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data.ok)throw new Error(data.error||'guestbook_http_'+res.status);
    return data;
  }

  function guestbookSurfaces(doc,manifest){
    const specs=manifest?.semantic_components?.native_forms_v1?.guestbook_surfaces||[];
    const out=[],seen=new Set();
    for(const spec of specs)for(const node of queryAll(doc,spec.selector)){
      if(!seen.has(node)){seen.add(node);out.push(node)}
    }
    if(!out.length){
      for(const sel of ['#guestbookList','#wishList','[data-guestbook-list]','.cui-container-comments','.commentlist']){
        for(const node of queryAll(doc,sel))if(!seen.has(node)){seen.add(node);out.push(node)}
      }
    }
    return out;
  }

  function renderGuestbookRows(doc,surfaces,rows){
    for(const surface of surfaces){
      const frag=doc.createDocumentFragment();
      for(const row of rows||[]){
        const article=doc.createElement('article');
        article.setAttribute('data-dini-guestbook-entry','1');
        article.setAttribute('data-dini-guestbook-id',String(row?.id||''));
        const strong=doc.createElement('strong');strong.textContent=clean(row?.guest_name||'Tamu');
        const message=doc.createElement('p');message.textContent=clean(row?.message||'');
        const small=doc.createElement('small');
        try{small.textContent=new Date(row?.created_at||Date.now()).toLocaleString('id-ID')}catch{small.textContent=''}
        article.append(strong,message,small);frag.appendChild(article);
      }
      surface.replaceChildren(frag);
      surface.setAttribute('data-dini-guestbook-loaded','1');
      surface.setAttribute('data-dini-guestbook-count',String(rows?.length||0));
    }
  }

  async function loadGuestbook(doc,manifest,context){
    const invitationId=clean(context?.invitationId||context?.invitation_id);
    if(!invitationId)return false;
    const surfaces=guestbookSurfaces(doc,manifest);
    if(!surfaces.length)return false;
    const data=await guestbookRequest('/api/guestbook?invitation_id='+encodeURIComponent(invitationId));
    renderGuestbookRows(doc,surfaces,Array.isArray(data.rows)?data.rows:[]);
    return true;
  }

  function bindGuestbook(doc,manifest,context){
    const specs=(manifest?.semantic_components?.native_forms_v1?.forms||[]).filter(x=>x.kind==='guestbook');
    let bound=0;
    for(const spec of specs){
      for(const form of queryAll(doc,spec.selector)){
        if(form.dataset.diniGuestbookConsumer==='1')continue;
        form.dataset.diniGuestbookConsumer='1';
        form.addEventListener('submit',async ev=>{
          ev.preventDefault();ev.stopImmediatePropagation();
          const invitationId=clean(context?.invitationId||context?.invitation_id);
          const guestName=guestNameFor(doc,context,form);
          const message=roleValue(form,'guestbook_message')||roleValue(form,'message');
          if(!invitationId||!guestName||!message){
            form.setAttribute('data-dini-submit-state','invalid');
            return;
          }
          const submit=ev.submitter||form.querySelector('[type="submit"]');
          if(submit)submit.disabled=true;
          form.setAttribute('data-dini-submit-state','sending');
          try{
            await guestbookRequest('/api/guestbook',{
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify({invitation_id:invitationId,guest_name:guestName,message})
            });
            form.setAttribute('data-dini-submit-state','success');
            const msgField=queryOne(form,'[data-dini-native-field-role="guestbook_message"]');
            if(msgField)msgField.value='';
            await loadGuestbook(doc,manifest,context).catch(()=>false);
            const EventCtor=doc.defaultView?.CustomEvent||CustomEvent;form.dispatchEvent(new EventCtor('dinifaqih:guestbook:success',{bubbles:true}));
          }catch(err){
            form.setAttribute('data-dini-submit-state','error');
            const EventCtor=doc.defaultView?.CustomEvent||CustomEvent;form.dispatchEvent(new EventCtor('dinifaqih:guestbook:error',{bubbles:true,detail:{error:String(err?.message||err)}}));
          }finally{if(submit)submit.disabled=false}
        },true);
        bound++;
      }
    }
    if(bound)loadGuestbook(doc,manifest,context).catch(err=>console.warn('[DINI CONSUMER] guestbook load',err));
    return bound;
  }

  function bindPublicActions(doc,context){
    const api=g.DiniFaqihPublicActions;
    if(!api?.applyDocument)return false;
    try{
      api.setContext?.(context||{});
      api.applyDocument(doc,context||{});
      return true;
    }catch(err){
      console.warn('[DINI CONSUMER] public action bridge',err);
      return false;
    }
  }

  function bindDocument(doc,value,context={}){
    if(!doc?.documentElement)return {ok:false,error:'document-unavailable'};
    const manifest=runtimeManifestFrom(value);
    const previous=boundDocs.get(doc);
    const key=[manifest?.compiler||'',context?.mode||'',context?.invitationId||'',context?.guestName||''].join('|');
    const formResult=markForms(doc,manifest);
    const actionResult=markActions(doc,manifest);
    const repeaterResult=markRepeaters(doc,manifest);
    let guestbook=0,publicActions=false;
    const publicMode=context?.mode==='public'||context?.mode==='guest';
    if(publicMode){
      publicActions=bindPublicActions(doc,context);
      guestbook=bindGuestbook(doc,manifest,context);
    }
    doc.documentElement.setAttribute('data-dini-consumer-contract',VERSION);
    doc.documentElement.setAttribute('data-dini-consumer-manifest',String(manifest?.compiler||'none'));
    doc.documentElement.setAttribute('data-dini-consumer-mode',String(context?.mode||'preview'));
    const report={
      ok:true,
      version:VERSION,
      contract_version:CONTRACT_VERSION,
      manifest_compiler:manifest?.compiler||'',
      ...formResult,
      ...actionResult,
      ...repeaterResult,
      guestbook_forms_bound:guestbook,
      public_action_bridge:publicActions
    };
    boundDocs.set(doc,{key,report});
    return report;
  }

  function bindFrame(frame,value,context={}){
    if(!frame)return false;
    const run=()=>{
      try{
        const doc=frame.contentDocument;
        if(!doc?.documentElement)return false;
        const report=bindDocument(doc,value,context);
        frame.dataset.diniConsumerContract=VERSION;
        frame.dataset.diniConsumerManifest=String(report.manifest_compiler||'');
        boundFrames.set(frame,report);
        return true;
      }catch(err){
        console.warn('[DINI CONSUMER] frame bind',err);
        return false;
      }
    };
    if(frame.dataset.diniConsumerListener!==VERSION){
      frame.dataset.diniConsumerListener=VERSION;
      frame.addEventListener('load',()=>setTimeout(run,0));
    }
    run();
    return true;
  }

  function verify(value){
    const manifest=runtimeManifestFrom(value);
    const nf=manifest?.semantic_components?.native_forms_v1||{};
    const rp=manifest?.semantic_components?.repeaters_v1||{};
    return {
      version:VERSION,
      has_runtime_manifest:manifest?.format==='dini-universal-runtime-manifest',
      compiler:manifest?.compiler||'',
      native_forms:Number(nf?.counts?.forms||0),
      rsvp_forms:Number(nf?.counts?.rsvp_forms||0),
      gift_forms:Number(nf?.counts?.gift_forms||0),
      guestbook_forms:Number(nf?.counts?.guestbook_forms||0),
      copy_actions:Number(nf?.counts?.copy_actions||0),
      semantic_repeaters:Number(rp?.counts?.repeaters||0),
      guest_personalization_fields:Number(manifest?.personalization?.fields?.length||0),
      consumer_ready:!!manifest?.format
    };
  }

  g.DiniSourceConsumerContract={
    version:VERSION,
    contract_version:CONTRACT_VERSION,
    runtimeManifestFrom,
    bindDocument,
    bindFrame,
    verify,
    loadGuestbook
  };
  console.info('[DINI CONSUMER] V'+VERSION+' aktif — semantic contract → Preview/Editor/Public/Guest consumer bridge.');
})(window);
