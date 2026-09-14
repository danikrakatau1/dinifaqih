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

  document.documentElement.dataset.guestRuntime='v1.5';
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
    const selectors=['[data-guest-name]','[data-native-guest-name]','[data-dini-guest-name]','#guestName','.guest-name','.guest_name','.nama-tamu','.nama_tamu'];
    const out=[],seen=new Set();
    for(const s of selectors)document.querySelectorAll(s).forEach(n=>{if(!seen.has(n)){seen.add(n);out.push(n)}});
    return out;
  }

  function setExplicit(){
    let count=0;
    for(const n of explicitSlots()){
      const current=norm(n.matches?.('input,textarea')?n.value:n.textContent);
      // Static salutation/place lines are not the actual name slot.
      if(/^kepada\b/.test(current)||/^di\s+tempat[.!]?$/.test(current))continue;
      if(n.dataset?.diniGuestInjected==='1'&&current===norm(name)){count++;continue}
      if(n.matches?.('input,textarea')){
        if(n.value!==name)n.value=name;
        n.setAttribute('data-dini-guest-name','1');
        n.setAttribute('data-dini-guest-injected','1');
        cleanNode(n);
      }else markGuestSlot(n,'explicit');
      count++;
    }
    document.documentElement.dataset.guestExplicitMatches=String(count);
    return count;
  }

  // Generic source covers (Galeri Undangan / similar) often keep only the static
  // salutation in the saved HTML. The original server inserts ?to=... between this
  // line and "Di Tempat" before delivering the page. Our fetched snapshot therefore
  // needs a runtime slot even when some unrelated guest-like element exists elsewhere.
  const isGenericSalutation=t=>/^kepada\b/.test(t)&&(/bapak/.test(t)||/ibu/.test(t)||/saudara/.test(t));

  function semanticCandidates(test){
    const root=document.body;if(!root)return [];
    const out=[];
    for(const n of root.querySelectorAll('*')){
      if(n.namespaceURI&&n.namespaceURI!=='http://www.w3.org/1999/xhtml')continue;
      if(n.matches?.('script,style,noscript,template,iframe,object'))continue;
      const t=norm(n.textContent);
      if(!t||t.length>180||!test(t))continue;
      let childOwns=false;
      for(const c of n.children||[]){
        const ct=norm(c.textContent);
        if(ct&&ct.length<=180&&test(ct)){childOwns=true;break}
      }
      if(!childOwns)out.push(n);
    }
    return out;
  }

  function visible(n){
    if(!n?.isConnected)return false;
    try{
      const cs=getComputedStyle(n);
      return cs.display!=='none'&&cs.visibility!=='hidden'&&cs.visibility!=='collapse'&&Number(cs.opacity||1)>.01&&n.getClientRects().length>0;
    }catch{return false}
  }

  function coverHost(n){
    return n?.closest?.('#opening,#cover,.opening,.cover,[data-cover],[data-opening],section,article,main,[data-elementor-id]')||n?.parentElement?.parentElement||n?.parentElement||document.body;
  }

  function hasVisibleNameInHost(label){
    const host=coverHost(label);
    if(!host?.querySelectorAll)return false;
    const selectors='[data-dini-guest-name],[data-guest-name],[data-native-guest-name],#guestName,.guest-name,.guest_name,.nama-tamu,.nama_tamu,[data-dini-guest-semantic-slot]';
    for(const n of host.querySelectorAll(selectors)){
      if(n===label||!visible(n))continue;
      const v=norm(n.matches?.('input,textarea')?n.value:n.textContent);
      if(v===norm(name))return true;
    }
    return false;
  }

  function ensureGenericCoverSlots(){
    const labels=semanticCandidates(isGenericSalutation);
    let count=0;
    for(const label of labels){
      if(hasVisibleNameInHost(label))continue;
      let slot=label.querySelector?.(':scope > [data-dini-guest-semantic-slot="1"]');
      if(!slot){
        slot=document.createElement('span');
        slot.setAttribute('data-dini-guest-semantic-slot','1');
        slot.setAttribute('data-dini-guest-name','1');
        slot.setAttribute('data-dini-guest-injected','1');
        slot.setAttribute('data-dini-guest-slot-mode','generic-salutation-child');
        slot.style.setProperty('display','block','important');
        slot.style.setProperty('position','relative','important');
        slot.style.setProperty('inset','auto','important');
        slot.style.setProperty('transform','none','important');
        slot.style.setProperty('width','auto','important');
        slot.style.setProperty('height','auto','important');
        slot.style.setProperty('margin-top','.48em','important');
        slot.style.setProperty('margin-bottom','.12em','important');
        slot.style.setProperty('font','inherit','important');
        slot.style.setProperty('font-size','1.08em','important');
        slot.style.setProperty('font-weight','600','important');
        slot.style.setProperty('line-height','1.25','important');
        slot.style.setProperty('color','inherit','important');
        slot.style.setProperty('letter-spacing','inherit','important');
        slot.style.setProperty('text-transform','none','important');
        slot.style.setProperty('text-align','inherit','important');
        slot.style.setProperty('opacity','1','important');
        slot.style.setProperty('visibility','visible','important');
        label.appendChild(slot);
      }
      if(slot.textContent!==name)slot.textContent=name;
      label.setAttribute('data-dini-guest-label-runtime','1');
      count++;
    }
    document.documentElement.dataset.guestSemanticMatches=String(count);
    return count;
  }

  function prefillForms(){
    const selectors=['#wishName','input[name="guest_name"]','input[name="nama"]','input[name="name"][data-guest]','input[data-guest-name-input]'];
    for(const s of selectors)document.querySelectorAll(s).forEach(n=>{
      if(!n.value||n.dataset.diniGuestPrefill==='1'){n.value=name;n.dataset.diniGuestPrefill='1'}
    });
  }

  function apply(){
    setExplicit();
    // IMPORTANT: generic cover binding is intentionally independent from explicitCount.
    // Hidden/RSVP guest fields elsewhere must never suppress the visible cover name.
    ensureGenericCoverSlots();
    prefillForms();
  }

  let timer=0;
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(apply,45)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  [80,180,450,900,1800,3200,5200].forEach(ms=>setTimeout(apply,ms));
  const observer=new MutationObserver(schedule);
  try{observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true})}catch{}
  setTimeout(()=>observer.disconnect(),18000);
})();
