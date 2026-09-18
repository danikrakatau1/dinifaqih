(function(g){
  'use strict';
  if(g.DiniNativeFormComponents?.version)return;

  const VERSION='1.0.1';
  const CONTRACT_VERSION=1;
  const VR=g.DiniVisualResolver;
  if(!VR?.makeSourceGraph){
    console.warn('[DINI NATIVE FORMS] Visual resolver belum tersedia.');
    return;
  }

  const originalMakeSourceGraph=VR.makeSourceGraph.bind(VR);
  const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
  const norm=s=>clean(s).toLowerCase();
  const hash=s=>{let h=2166136261;for(const c of String(s??'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')};
  const elementId=el=>el?.getAttribute?.('data-id')||((String(el?.className||'').match(/elementor-element-([A-Za-z0-9_-]+)/)||[])[1])||el?.id||'';
  const selectorFor=el=>{
    if(!el)return'';
    const formId=el.getAttribute?.('data-dini-native-form-id');if(formId)return '[data-dini-native-form-id="'+String(formId).replace(/"/g,'\\\"')+'"]';
    const fieldId=el.getAttribute?.('data-dini-native-field-id');if(fieldId)return '[data-dini-native-field-id="'+String(fieldId).replace(/"/g,'\\\"')+'"]';
    if(el.id)return '#'+el.id;
    const id=elementId(el);if(id)return '[data-id="'+id+'"]';
    const name=el.getAttribute?.('name');if(name)return String(el.tagName||'input').toLowerCase()+'[name="'+String(name).replace(/"/g,'\\"')+'"]';
    const cls=[...(el.classList||[])].find(x=>/^elementor-(?:field-group|repeater-item)-/.test(x));
    if(cls)return'.'+cls;
    return String(el.tagName||'element').toLowerCase();
  };
  const validHref=href=>{const h=String(href||'').trim();return !!h&&h!=='#'&&!/^javascript:/i.test(h)};
  const disabled=el=>!!(el&&(el.hasAttribute?.('disabled')||el.getAttribute?.('aria-disabled')==='true'||el.classList?.contains('disabled')));

  function labelFor(doc,field){
    const bits=[field.getAttribute?.('aria-label'),field.getAttribute?.('placeholder'),field.getAttribute?.('name'),field.id];
    if(field.id){
      try{const l=doc.querySelector('label[for="'+field.id.replace(/"/g,'\\"')+'"]');if(l)bits.push(l.textContent)}catch{}
    }
    const group=field.closest?.('.elementor-field-group,.form-group,.field,label,.cui-comment-form,form');
    const label=group?.querySelector?.('label');if(label)bits.push(label.textContent);
    return norm(bits.filter(Boolean).join(' '));
  }

  function formKind(doc,form){
    const fields=[...form.querySelectorAll('input,select,textarea')];
    const labels=fields.map(x=>labelFor(doc,x)).join(' ');
    const hay=norm([form.id,form.className,form.getAttribute?.('name'),form.getAttribute?.('action'),form.textContent,labels].join(' '));
    const fieldNames=fields.map(x=>norm(x.getAttribute?.('name')||x.id||'')).join(' ');
    const hasAttendance=/konfirmasi\s*kehadiran|kehadiran|attendance|\brsvp\b|hadir|tidak\s*hadir/.test(hay)||/konfirmasikehadiran|attendance|rsvp/.test(fieldNames);
    const hasGuestCount=/jumlah\s*(?:tamu|orang)?|guest\s*count|\bpax\b/.test(hay)||/guestcount|guest_count|jumlah|pax/.test(fieldNames);
    const hasGift=/gift|hadiah|kado|amplop|transfer|nama\s*bank|nominal|bukti\s*(?:tf|transfer)|proof/.test(hay)||/gift|bank|nominal|amount|proof|bukti/.test(fieldNames);
    const hasGuestbook=/guestbook|comment|komentar|ucapan|doa|wishes|wish|cui-comment|weddingpress-kit2/.test(hay)||/comment|message|ucapan|wish/.test(fieldNames);
    if(hasGift)return'gift';
    if(hasAttendance||hasGuestCount)return'rsvp';
    if(hasGuestbook)return'guestbook';
    return'';
  }

  function fieldRole(doc,form,field,kind){
    const label=labelFor(doc,field);
    const name=norm(field.getAttribute?.('name')||field.id||'');
    const type=norm(field.getAttribute?.('type')||field.tagName||'');
    const sig=label+' '+name;

    if(type==='file'||/bukti|proof|receipt|upload/.test(sig))return kind==='gift'?'gift_proof':'upload';
    if(/(?:^|\b)(nama|name|guest|tamu|author)(?:\b|$)/.test(sig)&&!/bank|rekening|account/.test(sig))return'guest_name';

    if(kind==='rsvp'){
      if(/konfirmasi|kehadiran|attendance|status|\brsvp\b|hadir/.test(sig))return'attendance';
      if(/jumlah|guest\s*count|guestcount|pax|orang/.test(sig))return'guest_count';
      if(/events?|acara|event_card/.test(sig))return'event_selection';
      if(/ucapan|doa|message|note|wishes/.test(sig))return'message';
    }

    if(kind==='gift'){
      if(/nama\s*bank|namabank|bank\s*name|rekening|bank/.test(sig))return'gift_bank';
      if(/nominal|amount|jumlah\s*transfer/.test(sig))return'gift_amount';
      if(/ucapan|note|message|catatan/.test(sig))return'gift_note';
    }

    if(kind==='guestbook'){
      if(/ucapan|doa|comment|komentar|message|wish|pesan/.test(sig))return'guestbook_message';
    }

    if(/email/.test(sig))return'email';
    if(/phone|telp|telepon|whatsapp|wa\b/.test(sig))return'phone';
    return'field';
  }

  function fieldRecord(doc,form,field,kind,index){
    const role=fieldRole(doc,form,field,kind);
    const id='native-field-'+hash([selectorFor(form),selectorFor(field),role,index].join('|'));
    const options=field.matches?.('select')?[...field.querySelectorAll('option')].map(o=>({value:String(o.getAttribute('value')??o.value??''),label:clean(o.textContent),selected:!!o.selected})):[];
    const checked=field.matches?.('input[type="radio"],input[type="checkbox"]')?!!field.checked:null;
    field.setAttribute?.('data-dini-native-field-role',role);
    field.setAttribute?.('data-dini-native-field-id',id);
    return {
      id,
      role,
      selector:selectorFor(field),
      name:String(field.getAttribute?.('name')||''),
      dom_id:String(field.id||''),
      input_type:String(field.getAttribute?.('type')||field.tagName||'').toLowerCase(),
      label:labelFor(doc,field),
      required:field.hasAttribute?.('required')||field.getAttribute?.('aria-required')==='true',
      readonly:field.hasAttribute?.('readonly')||false,
      disabled:disabled(field),
      placeholder:String(field.getAttribute?.('placeholder')||''),
      value:String(field.value??field.getAttribute?.('value')??''),
      checked,
      accept:String(field.getAttribute?.('accept')||''),
      options,
      source_authority:true
    };
  }

  function backendContract(kind){
    if(kind==='rsvp')return{
      owner:'dini-faqih',
      transport:'json-post',
      endpoint:'/api/rsvp',
      invitation_scoped:true,
      guest_scoped:true,
      maps:{guest_name:'guest_name',attendance:'attendance',guest_count:'guest_count',message:'message'},
      upstream_wordpress:{admin_ajax:false,nonce:false,policy:'replace'},
      existing_lock:'RSVP'
    };
    if(kind==='gift')return{
      owner:'dini-faqih',
      transport:'json-post',
      endpoint:'/api/gift-confirmation',
      invitation_scoped:true,
      guest_scoped:true,
      maps:{guest_name:'guest_name',gift_bank:'bank_name',gift_amount:'amount',gift_note:'note',gift_proof:'proof_path'},
      proof_upload:{owner:'dini-faqih',bucket:'gift-proofs',max_bytes:5242880,types:['image/jpeg','image/png','image/webp','application/pdf']},
      upstream_wordpress:{admin_ajax:false,nonce:false,policy:'replace'},
      existing_lock:'Gift Confirm + Bukti TF'
    };
    return{
      owner:'dini-faqih',
      transport:'native-guestbook-bridge',
      endpoint:'',
      invitation_scoped:true,
      guest_scoped:true,
      maps:{guest_name:'name',guestbook_message:'message'},
      upstream_wordpress:{admin_ajax:false,nonce:false,policy:'replace'},
      consumer_binding:'existing-guestbook-runtime',
      consumer_integration:'P2-D',
      existing_lock:'Guestbook / Doa & Ucapan'
    };
  }

  function compileForms(doc){
    const forms=[];
    [...doc.querySelectorAll('form')].forEach((form,index)=>{
      const kind=formKind(doc,form);
      if(!kind)return;
      const fields=[...form.querySelectorAll('input,select,textarea')].map((field,i)=>fieldRecord(doc,form,field,kind,i));
      const submit=form.querySelector('[type="submit"],button:not([type]),button[type="button"].submit,.elementor-button');
      const id='native-form-'+hash([kind,elementId(form),selectorFor(form),index].join('|'));
      form.setAttribute('data-dini-native-form-kind',kind);
      form.setAttribute('data-dini-native-form-id',id);
      forms.push({
        id,
        type:'native-form',
        kind,
        selector:selectorFor(form),
        source_id:elementId(form)||elementId(form.closest?.('[data-id]'))||'',
        method:String(form.getAttribute('method')||'').toLowerCase(),
        source_action:String(form.getAttribute('action')||''),
        fields,
        submit:{
          selector:selectorFor(submit),
          label:clean(submit?.textContent||''),
          disabled:disabled(submit)
        },
        backend:backendContract(kind),
        source_style_owner:true,
        source_layout_owner:true,
        source_validation_preserved:true,
        arbitrary_source_submit_js:false,
        source_authority:true
      });
    });
    return forms;
  }

  function copyValue(button){
    const explicit=clean(button?.getAttribute?.('data-copy')||button?.getAttribute?.('data-clipboard-text')||button?.getAttribute?.('data-copy-value')||button?.getAttribute?.('data-aj-copy-text')||button?.getAttribute?.('data-value')||'');
    if(explicit)return{value:explicit,source:'explicit-attribute'};
    const targetId=clean(button?.getAttribute?.('data-aj-copy')||button?.getAttribute?.('data-copy-target')||'');
    if(targetId){
      const doc=button.ownerDocument;
      const target=doc?.getElementById?.(targetId);
      const value=clean(target?.getAttribute?.('data-copy-value')||target?.value||target?.textContent||'');
      if(value)return{value,source:'explicit-target'};
    }
    const card=button?.closest?.('[data-bank],.bank,.rekening,.gift,.gift-card,[class*="bank"],[class*="rekening"],[class*="gift"],article,section');
    if(!card)return{value:'',source:''};
    const nodes=[...card.querySelectorAll('[data-copy-value],.account-number,.rekening-number,.bank-number,.address,.alamat,[class*="account"],[class*="rekening"],[class*="alamat"],[class*="address"],strong,b,p,span')];
    const texts=nodes.map(n=>clean(n.getAttribute?.('data-copy-value')||n.value||n.textContent)).filter(v=>v&&v!==clean(button.textContent)&&v.length<320);
    const account=texts.find(v=>/\b\d[\d\s.-]{5,}\d\b/.test(v));
    if(account)return{value:(account.match(/\b\d[\d\s.-]{5,}\d\b/)||[])[0]||account,source:'nearest-source-account'};
    const address=texts.find(v=>/\b(?:jl\.?|jalan|gang|gg\.?|rt\.?\s*\d|rw\.?\s*\d|desa|kelurahan|kecamatan|kabupaten|kota)\b/i.test(v));
    if(address)return{value:address,source:'nearest-source-address'};
    return{value:'',source:''};
  }

  function compileCopyActions(doc){
    const out=[],seen=new Set();
    const buttons=[...doc.querySelectorAll('button,a,[role="button"],[data-copy],[data-clipboard-text],[data-aj-copy],[data-aj-copy-text]')];
    buttons.forEach((button,index)=>{
      const label=norm([button.textContent,button.getAttribute?.('aria-label'),button.getAttribute?.('title'),button.id,button.className].filter(Boolean).join(' '));
      const marked=button.matches?.('[data-copy],[data-clipboard-text],[data-aj-copy],[data-aj-copy-text]');
      if(!marked&&!/(?:salin|copy).*(?:rekening|nomor|alamat|address)|(?:rekening|alamat).*(?:salin|copy)/.test(label))return;
      const payload=copyValue(button);
      const kind=/alamat|address/.test(label)||payload.source.includes('address')?'address':/rekening|account|bank|nomor/.test(label)||payload.source.includes('account')?'account':'copy';
      const state=disabled(button)?'disabled':payload.value?'bound':'unbound';
      const key=[selectorFor(button),kind,payload.value].join('|');if(seen.has(key))return;seen.add(key);
      const id='copy-action-'+hash(key+'|'+index);
      button.setAttribute?.('data-dini-copy-action-id',id);
      button.setAttribute?.('data-dini-copy-kind',kind);
      out.push({
        id,
        type:'copy-action',
        kind,
        selector:selectorFor(button),
        label:clean(button.textContent||button.getAttribute?.('aria-label')||''),
        state,
        value:payload.value,
        value_source:payload.source,
        consumer:'DiniFaqihPublicActions.copy',
        synthesize_missing_value:false,
        source_authority:true
      });
    });
    return out;
  }

  function giftAccounts(doc,copyActions){
    const containers=[...doc.querySelectorAll('[data-bank],.bank,.rekening,.gift-card,[class*="bank"],[class*="rekening"],[class*="gift-account"]')];
    const out=[],seen=new Set();
    containers.forEach((card,index)=>{
      const text=clean(card.textContent);
      const number=(text.match(/\b\d[\d\s.-]{5,}\d\b/)||[])[0]||'';
      const address=/\b(?:jl\.?|jalan|gang|gg\.?|rt\.?\s*\d|rw\.?\s*\d|desa|kelurahan|kecamatan|kabupaten|kota)\b/i.test(text)?text.slice(0,320):'';
      if(!number&&!address)return;
      const provider=(text.match(/\b(?:bca|bni|bri|mandiri|cimb|btn|bsi|dana|gopay|ovo|shopeepay|seabank|jago|bank\s+[a-z0-9 ]{2,20})\b/i)||[])[0]||'';
      const id='gift-account-'+hash([selectorFor(card),provider,number,address,index].join('|'));if(seen.has(id))return;seen.add(id);
      const copies=copyActions.filter(a=>{try{return card.contains(doc.querySelector(a.selector))}catch{return false}});
      out.push({
        id,
        type:address&&!number?'gift-address':'gift-account',
        selector:selectorFor(card),
        provider:clean(provider),
        account_number:clean(number),
        address:clean(address),
        copy_action_ids:copies.map(x=>x.id),
        source_order:index,
        source_authority:true
      });
    });
    return out;
  }

  function guestbookSurfaces(doc,forms){
    const out=[];
    const selectors=['#wishList','.cui-container-comments','.cui-comment-text','.commentlist','.wishes-list','[data-guestbook-list]'];
    const seen=new Set();
    selectors.forEach(sel=>{
      let nodes=[];try{nodes=[...doc.querySelectorAll(sel)]}catch{}
      nodes.forEach((node,index)=>{
        if(seen.has(node))return;seen.add(node);
        out.push({
          id:'guestbook-surface-'+hash([selectorFor(node),sel,index].join('|')),
          type:'guestbook-surface',
          selector:selectorFor(node),
          form_ids:forms.filter(f=>f.kind==='guestbook'||f.kind==='rsvp').map(f=>f.id),
          read_owner:'dini-faqih',
          write_owner:'dini-faqih',
          source_style_owner:true,
          source_authority:true
        });
      });
    });
    return out;
  }

  function compile(doc){
    const forms=compileForms(doc);
    const copyActions=compileCopyActions(doc);
    const accounts=giftAccounts(doc,copyActions);
    const guestbook=guestbookSurfaces(doc,forms);
    return {
      version:CONTRACT_VERSION,
      engine:'dini-native-form-components-v'+VERSION,
      forms,
      copy_actions:copyActions,
      gift_accounts:accounts,
      guestbook_surfaces:guestbook,
      counts:{
        forms:forms.length,
        rsvp_forms:forms.filter(x=>x.kind==='rsvp').length,
        gift_forms:forms.filter(x=>x.kind==='gift').length,
        guestbook_forms:forms.filter(x=>x.kind==='guestbook').length,
        fields:forms.reduce((n,x)=>n+x.fields.length,0),
        copy_actions:copyActions.length,
        copy_bound:copyActions.filter(x=>x.state==='bound').length,
        copy_unbound:copyActions.filter(x=>x.state==='unbound').length,
        gift_accounts:accounts.length,
        guestbook_surfaces:guestbook.length
      },
      backend_policy:{
        owner:'dini-faqih',
        upstream_wordpress_form_backend:'replace',
        execute_admin_ajax:false,
        execute_wp_nonce:false,
        preserve_source_form_dom:true,
        preserve_source_form_style:true,
        preserve_source_validation:true,
        guest_name_binding:'global-guest-contract',
        consumer_integration:'P2-D'
      }
    };
  }

  VR.makeSourceGraph=function(doc,opts={}){
    const graph=originalMakeSourceGraph(doc,opts);
    try{
      const components=compile(doc);
      graph.semantic_components={...(graph.semantic_components||{}),native_forms_v1:components};
      graph.authority={...(graph.authority||{}),native_form_truth:'source-form-dom-dini-faqih-backend'};
      graph.diagnostics={...(graph.diagnostics||{}),native_form_count:components.counts.forms,native_rsvp_count:components.counts.rsvp_forms,native_gift_count:components.counts.gift_forms,native_guestbook_form_count:components.counts.guestbook_forms,native_copy_action_count:components.counts.copy_actions,native_gift_account_count:components.counts.gift_accounts,native_guestbook_surface_count:components.counts.guestbook_surfaces};
      return graph;
    }catch(err){
      console.warn('[DINI NATIVE FORMS] compile gagal; graph lama dipertahankan.',err);
      graph.semantic_components={...(graph.semantic_components||{}),native_forms_v1:{version:CONTRACT_VERSION,engine:'dini-native-form-components-v'+VERSION,forms:[],copy_actions:[],gift_accounts:[],guestbook_surfaces:[],counts:{forms:0,copy_actions:0,gift_accounts:0},error:String(err?.message||err)}};
      return graph;
    }
  };

  g.DiniNativeFormComponents={version:VERSION,contract_version:CONTRACT_VERSION,compile,compileForms,compileCopyActions,giftAccounts,guestbookSurfaces,backendContract,formKind,fieldRole};
  console.info('[DINI NATIVE FORMS] V'+VERSION+' aktif — RSVP/Gift/Guestbook + Copy/Gift Account semantic contract; backend tetap Dini/Faqih.');
})(window);
