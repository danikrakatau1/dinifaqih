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

  document.documentElement.dataset.guestRuntime='v1.6';
  if(slug)document.documentElement.dataset.guestSlug=slug;

  const norm=s=>String(s||'').replace(/\s+/g,' ').trim().toLowerCase();
  const stripIdentity=n=>{
    if(!n)return;
    ['id','data-native-node-id','data-native-edit-id','data-native-edit-ids','data-id'].forEach(a=>n.removeAttribute?.(a));
    n.querySelectorAll?.('[id],[data-native-node-id],[data-native-edit-id],[data-native-edit-ids],[data-id]').forEach(x=>{
      ['id','data-native-node-id','data-native-edit-id','data-native-edit-ids','data-id'].forEach(a=>x.removeAttribute(a));
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
      if(/^kepada\b/.test(current)||/^di\s+tempat[.!]?$/.test(current))continue;
      stripIdentity(n);
      if(n.matches?.('input,textarea'))n.value=name;else n.textContent=name;
      n.setAttribute('data-dini-guest-name','1');
      n.setAttribute('data-dini-guest-injected','1');
      n.setAttribute('data-dini-guest-slot-mode','explicit');
      count++;
    }
    document.documentElement.dataset.guestExplicitMatches=String(count);
    return count;
  }

  const isGenericSalutation=t=>/^kepada\b/.test(t)&&(/bapak/.test(t)||/ibu/.test(t)||/saudara/.test(t));
  const isPlace=t=>/^di\s+tempat[.!]?$/.test(t);

  function semanticCandidates(test){
    const root=document.body;if(!root)return [];
    const out=[];
    for(const n of root.querySelectorAll('*')){
      if(n.namespaceURI&&n.namespaceURI!=='http://www.w3.org/1999/xhtml')continue;
      if(n.matches?.('script,style,noscript,template,iframe,object'))continue;
      const t=norm(n.textContent);
      if(!t||t.length>180||!test(t))continue;
      let childOwns=false;
      for(const c of n.children||[]){const ct=norm(c.textContent);if(ct&&ct.length<=180&&test(ct)){childOwns=true;break}}
      if(!childOwns)out.push(n);
    }
    return out;
  }

  function widgetOf(n){return n?.closest?.('.elementor-widget')||null}

  function findPlaceWidget(label){
    const lw=widgetOf(label);
    if(lw?.parentElement){
      for(let sib=lw.nextElementSibling;sib;sib=sib.nextElementSibling){
        const heads=sib.querySelectorAll?.('.elementor-heading-title,h1,h2,h3,h4,h5,h6,p')||[];
        for(const h of heads)if(isPlace(norm(h.textContent)))return {widget:sib,heading:h};
      }
    }
    const places=semanticCandidates(isPlace);
    for(const p of places){
      if(label.compareDocumentPosition(p)&Node.DOCUMENT_POSITION_FOLLOWING)return {widget:widgetOf(p),heading:p};
    }
    return {widget:null,heading:null};
  }

  function copyTextStyle(src,dst){
    if(!src||!dst)return;
    try{
      const cs=getComputedStyle(src);
      const props=['font-family','font-size','font-weight','font-style','line-height','color','letter-spacing','text-transform','text-decoration','text-align','text-shadow','white-space'];
      for(const p of props){const v=cs.getPropertyValue(p);if(v)dst.style.setProperty(p,v,'important')}
    }catch{}
    dst.style.setProperty('opacity','1','important');
    dst.style.setProperty('visibility','visible','important');
  }

  function copyWidgetSpacing(src,dst){
    if(!src||!dst)return;
    try{
      const cs=getComputedStyle(src);
      for(const p of ['margin-top','margin-right','margin-bottom','margin-left','padding-top','padding-right','padding-bottom','padding-left']){
        const v=cs.getPropertyValue(p);if(v)dst.style.setProperty(p,v,'important');
      }
    }catch{}
    dst.style.setProperty('display','block','important');
    dst.style.setProperty('position','relative','important');
    dst.style.setProperty('inset','auto','important');
    dst.style.setProperty('transform','none','important');
    dst.style.setProperty('opacity','1','important');
    dst.style.setProperty('visibility','visible','important');
  }

  function createRuntimeWidget(label,placeWidget,placeHeading){
    const sourceHeading=placeHeading||label;
    const slot=document.createElement('div');
    slot.className='elementor-element elementor-widget elementor-widget-heading dini-guest-runtime-widget';
    slot.setAttribute('data-dini-guest-semantic-widget','1');
    slot.setAttribute('data-dini-guest-name','1');
    slot.setAttribute('data-dini-guest-injected','1');
    slot.setAttribute('data-dini-guest-slot-mode','elementor-sibling');
    const container=document.createElement('div');
    container.className='elementor-widget-container';
    const heading=document.createElement(sourceHeading?.tagName?.toLowerCase?.()||'h2');
    heading.className=sourceHeading?.className||'elementor-heading-title elementor-size-default';
    stripIdentity(heading);
    heading.textContent=name;
    heading.setAttribute('data-dini-guest-runtime-heading','1');
    copyTextStyle(sourceHeading,heading);
    heading.style.setProperty('font-weight','600','important');
    container.appendChild(heading);slot.appendChild(container);
    copyWidgetSpacing(placeWidget||widgetOf(label),slot);
    return slot;
  }

  function ensureGenericCoverSlots(){
    const labels=semanticCandidates(isGenericSalutation);
    let count=0;
    for(const label of labels){
      const lw=widgetOf(label);
      if(!lw?.parentElement)continue;
      const {widget:placeWidget,heading:placeHeading}=findPlaceWidget(label);
      if(!placeWidget?.parentElement)continue;
      const parent=placeWidget.parentElement;
      let slot=[...parent.children].find(x=>x.getAttribute?.('data-dini-guest-semantic-widget')==='1');
      if(!slot){
        slot=createRuntimeWidget(label,placeWidget,placeHeading);
        parent.insertBefore(slot,placeWidget);
      }
      const h=slot.querySelector('[data-dini-guest-runtime-heading],.elementor-heading-title,h1,h2,h3,h4,h5,h6,p');
      if(h&&h.textContent!==name)h.textContent=name;
      count++;
    }
    document.documentElement.dataset.guestSemanticMatches=String(count);
    return count;
  }

  function prefillForms(){
    const selectors=['#wishName','input[name="guest_name"]','input[name="nama"]','input[name="name"][data-guest]','input[data-guest-name-input]'];
    for(const s of selectors)document.querySelectorAll(s).forEach(n=>{if(!n.value||n.dataset.diniGuestPrefill==='1'){n.value=name;n.dataset.diniGuestPrefill='1'}});
  }

  function apply(){setExplicit();ensureGenericCoverSlots();prefillForms()}
  let timer=0;const schedule=()=>{clearTimeout(timer);timer=setTimeout(apply,45)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  [80,180,450,900,1800,3200,5200].forEach(ms=>setTimeout(apply,ms));
  const observer=new MutationObserver(schedule);try{observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true})}catch{}
  setTimeout(()=>observer.disconnect(),18000);
})();
