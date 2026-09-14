(()=>{
  'use strict';
  if(window.__DINI_UNIVERSAL_GUEST_RUNTIME_V1__)return;
  window.__DINI_UNIVERSAL_GUEST_RUNTIME_V1__=true;

  const cfgEl=document.getElementById('diniGuestRuntimeData');
  let cfg={};try{cfg=cfgEl?JSON.parse(cfgEl.textContent||'{}'):{} }catch{}
  const qs=new URLSearchParams(location.search);
  const name=String(cfg.name||qs.get('to')||'').trim();
  const slug=String(cfg.slug||'').trim();
  if(!name)return;

  document.documentElement.dataset.guestRuntime='v1.1';
  if(slug)document.documentElement.dataset.guestSlug=slug;

  const norm=s=>String(s||'').replace(/\s+/g,' ').trim().toLowerCase();
  const cleanNode=n=>{
    if(!n)return;
    ['id','data-native-node-id','data-native-edit-id','data-native-edit-ids','data-element_type','data-id'].forEach(a=>n.removeAttribute?.(a));
    n.querySelectorAll?.('[id],[data-native-node-id],[data-native-edit-id],[data-native-edit-ids],[data-id]').forEach(x=>{
      ['id','data-native-node-id','data-native-edit-id','data-native-edit-ids','data-id'].forEach(a=>x.removeAttribute(a));
    });
  };

  function markGuestSlot(n,mode='explicit'){
    if(!n)return null;
    cleanNode(n);
    n.textContent=name;
    n.setAttribute('data-guest-name','1');
    n.setAttribute('data-dini-guest-name','1');
    n.setAttribute('data-dini-guest-injected','1');
    n.setAttribute('data-dini-guest-slot-mode',mode);
    return n;
  }

  function explicitSlots(){
    const selectors=[
      '[data-guest-name]',
      '[data-native-guest-name]',
      '[data-dini-guest-name]',
      '#guestName',
      '.guest-name',
      '.guest_name',
      '.nama-tamu',
      '.nama_tamu'
    ];
    const out=[],seen=new Set();
    for(const s of selectors)document.querySelectorAll(s).forEach(n=>{if(!seen.has(n)){seen.add(n);out.push(n)}});
    return out;
  }

  function setExplicit(){
    let count=0;
    for(const n of explicitSlots()){
      const current=norm(n.matches?.('input,textarea')?n.value:n.textContent);
      // A few source templates reuse guest-name-like classes for salutation/place lines.
      // Preserve those labels and let the semantic resolver create a runtime name slot nearby.
      if(/^kepada\b/.test(current)||/^di\s+tempat[.!]?$/.test(current))continue;
      if(n.dataset?.diniGuestInjected==='1'&&norm(n.textContent)===norm(name)){count++;continue}
      if(n.matches?.('input,textarea')){
        if(n.value!==name)n.value=name;
        n.setAttribute('data-dini-guest-name','1');
        n.setAttribute('data-dini-guest-injected','1');
        cleanNode(n);
      }else markGuestSlot(n,'explicit');
      count++;
    }
    return count;
  }

  const isLabelText=t=>/^kepada\b/.test(t)&&(/bapak|ibu|saudara/.test(t)||/yth\.?/.test(t));
  const isPlaceText=t=>/^di\s+tempat[.!]?$/.test(t);

  // Scan semantic text regardless of the template's wrapper/tag structure. This is intentionally
  // source-native: it finds the smallest matching HTML element and clones nearby source typography.
  function semanticCandidates(test){
    const root=document.body;
    if(!root)return [];
    const nodes=[...root.querySelectorAll('*')],out=[];
    for(const n of nodes){
      if(n.namespaceURI&&n.namespaceURI!=='http://www.w3.org/1999/xhtml')continue;
      if(n.matches?.('script,style,noscript,template,iframe,object'))continue;
      const t=norm(n.textContent);
      if(!t||t.length>160||!test(t))continue;
      let childOwns=false;
      for(const c of n.children||[]){
        const ct=norm(c.textContent);
        if(ct&&ct.length<=160&&test(ct)){childOwns=true;break}
      }
      if(!childOwns)out.push(n);
    }
    return out;
  }

  function decorateInsertedSlot(slot){
    if(!slot)return slot;
    slot.setAttribute('data-dini-guest-three-line','1');
    if(slot.style){
      slot.style.setProperty('margin-top',slot.style.marginTop||'.32em');
      slot.style.setProperty('margin-bottom',slot.style.marginBottom||'.32em');
    }
    return slot;
  }

  function ensureSemanticSlot(){
    const existing=document.querySelector('[data-dini-guest-three-line="1"]');
    if(existing){
      if(norm(existing.textContent)!==norm(name))existing.textContent=name;
      return true;
    }

    const labels=semanticCandidates(isLabelText);
    if(!labels.length)return false;
    const places=semanticCandidates(isPlaceText);

    // Prefer a source-native three-line composition:
    // "Kepada ..." -> runtime guest name -> "Di Tempat".
    for(const label of labels){
      const following=places.filter(place=>Boolean(label.compareDocumentPosition(place)&Node.DOCUMENT_POSITION_FOLLOWING));
      const place=following[0]||null;
      if(place?.parentNode){
        const slot=decorateInsertedSlot(markGuestSlot(place.cloneNode(true),'semantic-before-place'));
        place.parentNode.insertBefore(slot,place);
        return true;
      }
    }

    // Some templates only contain a salutation line. Insert directly after the smallest semantic
    // salutation element, preserving its own typography instead of imposing global CSS.
    const label=labels[0];
    if(label?.parentNode){
      const slot=decorateInsertedSlot(markGuestSlot(label.cloneNode(true),'semantic-after-label'));
      label.parentNode.insertBefore(slot,label.nextSibling);
      return true;
    }
    return false;
  }

  function prefillForms(){
    const selectors=[
      '#wishName',
      'input[name="guest_name"]',
      'input[name="nama"]',
      'input[name="name"][data-guest]',
      'input[data-guest-name-input]'
    ];
    for(const s of selectors)document.querySelectorAll(s).forEach(n=>{
      if(!n.value||n.dataset.diniGuestPrefill==='1'){n.value=name;n.dataset.diniGuestPrefill='1'}
    });
  }

  function apply(){
    setExplicit();
    ensureSemanticSlot();
    prefillForms();
  }

  let timer=0;
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(apply,40)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  [120,450,1100,2600,5200].forEach(ms=>setTimeout(apply,ms));

  const observer=new MutationObserver(schedule);
  try{observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true})}catch{}
  setTimeout(()=>observer.disconnect(),15000);
})();
