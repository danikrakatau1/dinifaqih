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

  document.documentElement.dataset.guestRuntime='v1.2';
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
      // Some source templates reuse guest-name-like classes on the static salutation/place line.
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
  const semanticSlotByLabel=new WeakMap();

  function isVisible(n){
    if(!n?.isConnected)return false;
    try{
      const cs=getComputedStyle(n);
      if(cs.display==='none'||cs.visibility==='hidden'||cs.visibility==='collapse'||Number(cs.opacity||1)<=.01)return false;
      return n.getClientRects().length>0;
    }catch{return false}
  }

  // Find the smallest element that owns the semantic text. Hidden responsive clones are retained
  // because they may become the active cover at another breakpoint; visible candidates are simply
  // prioritized when choosing a nearby "Di Tempat" anchor.
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
    return out.sort((a,b)=>Number(isVisible(b))-Number(isVisible(a)));
  }

  function semanticHost(n){
    return n?.closest?.('#opening,#cover,.opening,.cover,[data-cover],[data-opening],section,article,main,[data-elementor-id]')||n?.parentElement||document.body;
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

  function pickPlace(label,places){
    const following=places.filter(place=>Boolean(label.compareDocumentPosition(place)&Node.DOCUMENT_POSITION_FOLLOWING));
    if(!following.length)return null;
    const host=semanticHost(label),labelVisible=isVisible(label);
    following.sort((a,b)=>{
      const ah=semanticHost(a)===host?1:0,bh=semanticHost(b)===host?1:0;
      if(ah!==bh)return bh-ah;
      const av=isVisible(a)===labelVisible?1:0,bv=isVisible(b)===labelVisible?1:0;
      if(av!==bv)return bv-av;
      return 0;
    });
    return following[0];
  }

  function ensureSemanticSlots(){
    const labels=semanticCandidates(isLabelText);
    if(!labels.length)return 0;
    const places=semanticCandidates(isPlaceText);
    let count=0;

    for(const label of labels){
      let existing=semanticSlotByLabel.get(label);
      if(existing?.isConnected){
        if(norm(existing.textContent)!==norm(name))existing.textContent=name;
        count++;
        continue;
      }

      const place=pickPlace(label,places);
      if(place?.parentNode){
        // Reuse a previously injected slot immediately before this place when a source script
        // recreated the label but kept the runtime slot alive.
        const prev=place.previousElementSibling;
        if(prev?.matches?.('[data-dini-guest-three-line="1"]')){
          if(norm(prev.textContent)!==norm(name))prev.textContent=name;
          semanticSlotByLabel.set(label,prev);
          count++;
          continue;
        }
        const slot=decorateInsertedSlot(markGuestSlot(place.cloneNode(true),'semantic-before-place'));
        place.parentNode.insertBefore(slot,place);
        semanticSlotByLabel.set(label,slot);
        count++;
        continue;
      }

      if(label?.parentNode){
        const next=label.nextElementSibling;
        if(next?.matches?.('[data-dini-guest-three-line="1"]')){
          if(norm(next.textContent)!==norm(name))next.textContent=name;
          semanticSlotByLabel.set(label,next);
          count++;
          continue;
        }
        const slot=decorateInsertedSlot(markGuestSlot(label.cloneNode(true),'semantic-after-label'));
        label.parentNode.insertBefore(slot,label.nextSibling);
        semanticSlotByLabel.set(label,slot);
        count++;
      }
    }

    document.documentElement.dataset.guestSemanticMatches=String(count);
    return count;
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
    const explicitCount=setExplicit();
    if(!explicitCount)ensureSemanticSlots();
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
