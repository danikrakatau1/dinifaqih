(()=>{
  'use strict';
  if(window.__DINI_UNIVERSAL_GUEST_RUNTIME_V17__)return;
  window.__DINI_UNIVERSAL_GUEST_RUNTIME_V17__=true;

  const cfgEl=document.getElementById('diniGuestRuntimeData');
  let cfg={};try{cfg=cfgEl?JSON.parse(cfgEl.textContent||'{}'):{} }catch{}
  const qs=new URLSearchParams(location.search);
  const name=String(cfg.name||qs.get('to')||'').trim();
  const slug=String(cfg.slug||'').trim();
  if(!name)return;

  document.documentElement.dataset.guestRuntime='v1.7';
  if(slug)document.documentElement.dataset.guestSlug=slug;

  const norm=s=>String(s||'').replace(/\s+/g,' ').trim().toLowerCase();
  const isGenericSalutation=t=>/^kepada\b/.test(t)&&(/bapak/.test(t)||/ibu/.test(t)||/saudara/.test(t));
  const isPlace=t=>/^di\s+tempat[.!]?$/.test(t);
  const stripIdentity=n=>{
    if(!n)return;
    ['id','data-native-node-id','data-native-edit-id','data-native-edit-ids','data-id','data-template-authority'].forEach(a=>n.removeAttribute?.(a));
    n.querySelectorAll?.('[id],[data-native-node-id],[data-native-edit-id],[data-native-edit-ids],[data-id],[data-template-authority]').forEach(x=>{
      ['id','data-native-node-id','data-native-edit-id','data-native-edit-ids','data-id','data-template-authority'].forEach(a=>x.removeAttribute(a));
    });
  };

  function explicitSlots(){
    const selectors=['[data-guest-name]','[data-native-guest-name]','[data-dini-guest-name]','#guestName','.guest-name','.guest_name','.nama-tamu','.nama_tamu'];
    const out=[],seen=new Set();
    for(const s of selectors)document.querySelectorAll(s).forEach(n=>{if(!seen.has(n)){seen.add(n);out.push(n)}});
    return out;
  }

  function setExplicit(){
    let count=0;
    for(const n of explicitSlots()){
      if(n.closest?.('[data-dini-guest-semantic-widget="1"]'))continue;
      const current=norm(n.matches?.('input,textarea')?n.value:n.textContent);
      if(isGenericSalutation(current)||isPlace(current))continue;
      stripIdentity(n);
      if(n.matches?.('input,textarea'))n.value=name;else n.textContent=name;
      n.setAttribute('data-dini-guest-name','1');
      n.setAttribute('data-dini-guest-injected','1');
      n.setAttribute('data-dini-guest-slot-mode','explicit-v17');
      count++;
    }
    document.documentElement.dataset.guestExplicitMatches=String(count);
    return count;
  }

  function semanticCandidates(test){
    const root=document.body;if(!root)return [];
    const out=[];
    for(const n of root.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,label,div')){
      if(n.matches?.('script,style,noscript,template,iframe,object'))continue;
      const t=norm(n.textContent);if(!t||t.length>180||!test(t))continue;
      let childOwns=false;for(const c of n.children||[]){const ct=norm(c.textContent);if(ct&&ct.length<=180&&test(ct)){childOwns=true;break}}
      if(!childOwns)out.push(n);
    }
    return out;
  }

  function widgetOf(n){return n?.closest?.('.elementor-widget')||null}
  function copyTextStyle(src,dst){
    if(!src||!dst)return;
    try{const cs=getComputedStyle(src);for(const p of ['font-family','font-size','font-weight','font-style','line-height','color','letter-spacing','text-transform','text-decoration','text-align','text-shadow','white-space']){const v=cs.getPropertyValue(p);if(v)dst.style.setProperty(p,v,'important')}}catch{}
    dst.style.setProperty('opacity','1','important');dst.style.setProperty('visibility','visible','important');
  }
  function copyBox(src,dst){
    if(!src||!dst)return;
    try{const cs=getComputedStyle(src);for(const p of ['margin-top','margin-right','margin-bottom','margin-left','padding-top','padding-right','padding-bottom','padding-left']){const v=cs.getPropertyValue(p);if(v)dst.style.setProperty(p,v,'important')}}catch{}
    dst.style.setProperty('display','block','important');dst.style.setProperty('position','relative','important');dst.style.setProperty('inset','auto','important');dst.style.setProperty('transform','none','important');dst.style.setProperty('opacity','1','important');dst.style.setProperty('visibility','visible','important');
  }

  function ensureElementorSlot(label,place){
    const lw=widgetOf(label),pw=widgetOf(place);if(!lw?.parentElement||!pw?.parentElement||lw.parentElement!==pw.parentElement)return false;
    const parent=pw.parentElement;
    let slot=[...parent.children].find(x=>x.getAttribute?.('data-dini-guest-semantic-widget')==='1');
    if(!slot){
      slot=document.createElement('div');slot.className='elementor-element elementor-widget elementor-widget-heading dini-guest-runtime-widget';
      slot.setAttribute('data-dini-guest-semantic-widget','1');slot.setAttribute('data-dini-guest-name','1');slot.setAttribute('data-dini-guest-injected','1');slot.setAttribute('data-dini-guest-slot-mode','elementor-sibling-v17');
      const c=document.createElement('div');c.className='elementor-widget-container';const tag=(place.tagName||'h2').toLowerCase();const h=document.createElement(tag);h.className=place.className||'elementor-heading-title elementor-size-default';h.setAttribute('data-dini-guest-runtime-heading','1');h.textContent=name;copyTextStyle(place,h);c.appendChild(h);slot.appendChild(c);copyBox(pw,slot);stripIdentity(slot);slot.setAttribute('data-dini-guest-semantic-widget','1');slot.setAttribute('data-dini-guest-name','1');slot.setAttribute('data-dini-guest-injected','1');slot.setAttribute('data-dini-guest-slot-mode','elementor-sibling-v17');parent.insertBefore(slot,pw);
    }
    const h=slot.querySelector('[data-dini-guest-runtime-heading],.elementor-heading-title,h1,h2,h3,h4,h5,h6,p,span');if(h){stripIdentity(h);h.setAttribute('data-dini-guest-runtime-heading','1');h.textContent=name;copyTextStyle(place,h)}
    return true;
  }

  function ensurePlainSlot(label,place){
    const parent=place?.parentElement;if(!parent)return false;
    let slot=parent.querySelector(':scope > [data-dini-guest-plain-slot="1"]');
    if(!slot){slot=document.createElement(place.tagName?.toLowerCase?.()||'div');slot.setAttribute('data-dini-guest-plain-slot','1');slot.setAttribute('data-dini-guest-semantic-widget','1');slot.setAttribute('data-dini-guest-name','1');slot.setAttribute('data-dini-guest-injected','1');slot.setAttribute('data-dini-guest-slot-mode','plain-v17');copyTextStyle(place,slot);parent.insertBefore(slot,place)}
    stripIdentity(slot);slot.setAttribute('data-dini-guest-plain-slot','1');slot.setAttribute('data-dini-guest-semantic-widget','1');slot.setAttribute('data-dini-guest-name','1');slot.setAttribute('data-dini-guest-injected','1');slot.textContent=name;return true;
  }

  function ensureGenericCoverSlots(){
    const labels=semanticCandidates(isGenericSalutation),places=semanticCandidates(isPlace);let count=0;
    for(const label of labels){
      let place=places.find(p=>!!(label.compareDocumentPosition(p)&Node.DOCUMENT_POSITION_FOLLOWING));if(!place)continue;
      if(ensureElementorSlot(label,place)||ensurePlainSlot(label,place))count++;
    }
    document.documentElement.dataset.guestSemanticMatches=String(count);return count;
  }

  function forceVisible(){
    document.querySelectorAll('[data-dini-guest-semantic-widget="1"],[data-dini-guest-name="1"]').forEach(n=>{n.style?.setProperty('opacity','1','important');n.style?.setProperty('visibility','visible','important');if(n.getAttribute('data-dini-guest-semantic-widget')==='1')n.style?.setProperty('display','block','important')});
  }
  function prefillForms(){const selectors=['#wishName','input[name="guest_name"]','input[name="nama"]','input[name="name"][data-guest]','input[data-guest-name-input]'];for(const s of selectors)document.querySelectorAll(s).forEach(n=>{if(!n.value||n.dataset.diniGuestPrefill==='1'){n.value=name;n.dataset.diniGuestPrefill='1'}})}
  function apply(){setExplicit();ensureGenericCoverSlots();forceVisible();prefillForms()}

  let timer=0;const schedule=()=>{clearTimeout(timer);timer=setTimeout(apply,35)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  [60,140,300,650,1200,2200,3800,6000,9000,12000].forEach(ms=>setTimeout(apply,ms));
  const observer=new MutationObserver(schedule);try{observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['style','class','data-template-authority']})}catch{}
  setTimeout(()=>observer.disconnect(),20000);
})();
