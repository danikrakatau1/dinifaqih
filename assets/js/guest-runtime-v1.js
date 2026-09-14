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

  document.documentElement.dataset.guestRuntime='v1';
  if(slug)document.documentElement.dataset.guestSlug=slug;

  const norm=s=>String(s||'').replace(/\s+/g,' ').trim().toLowerCase();
  const cleanNode=n=>{
    if(!n)return;
    ['id','data-native-node-id','data-native-edit-id','data-native-edit-ids','data-element_type','data-id'].forEach(a=>n.removeAttribute?.(a));
    n.querySelectorAll?.('[id],[data-native-node-id],[data-native-edit-id],[data-native-edit-ids],[data-id]').forEach(x=>{
      ['id','data-native-node-id','data-native-edit-id','data-native-edit-ids','data-id'].forEach(a=>x.removeAttribute(a));
    });
  };

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
      // A few source templates reuse "guest-name" class on the static salutation/place line.
      // Never destroy those labels; the three-line resolver will insert the dynamic name between them.
      if(/^kepada\b/.test(current)||/^di\s+tempat[.!]?$/.test(current))continue;
      if(n.dataset?.diniGuestInjected==='1'&&n.textContent===name){count++;continue}
      if(n.matches?.('input,textarea')){if(n.value!==name)n.value=name}
      else if(n.textContent!==name)n.textContent=name;
      n.setAttribute('data-dini-guest-name','1');
      n.setAttribute('data-dini-guest-injected','1');
      // Public guest data is runtime authority. Detach the guest slot from Template Editor
      // identity so persistent canonical snapshot hydration cannot restore its placeholder text.
      // Classes/styles stay intact, therefore source-native typography/layout is preserved.
      cleanNode(n);
      count++;
    }
    return count;
  }

  function textCandidates(){
    return [...document.querySelectorAll('p,span,div,h1,h2,h3,h4,h5,h6,strong,small')].filter(n=>{
      if(n.children.length>4)return false;
      const t=norm(n.textContent);
      return t&&t.length<=100;
    });
  }

  function ensureThreeLineSlot(){
    if(document.querySelector('[data-dini-guest-three-line="1"]'))return true;
    const all=textCandidates();
    const places=all.filter(n=>/^di\s+tempat[.!]?$/i.test(norm(n.textContent)));
    const labels=all.filter(n=>{
      const t=norm(n.textContent);
      return /^kepada\b/.test(t)&&(/bapak|ibu|saudara/.test(t)||/yth/.test(t));
    });
    if(!places.length||!labels.length)return false;

    for(const place of places){
      let label=null;
      for(const cand of labels){
        const pos=cand.compareDocumentPosition(place);
        if(pos&Node.DOCUMENT_POSITION_FOLLOWING)label=cand;
      }
      if(!label)continue;

      const parent=place.parentNode;
      if(!parent)continue;
      const between=[...parent.children].filter(x=>{
        const p1=label.compareDocumentPosition(x),p2=x.compareDocumentPosition(place);
        return (p1&Node.DOCUMENT_POSITION_FOLLOWING)&&(p2&Node.DOCUMENT_POSITION_FOLLOWING);
      });
      const existing=between.find(x=>x.matches?.('[data-guest-name],[data-dini-guest-name]'));
      if(existing){existing.textContent=name;existing.setAttribute('data-dini-guest-three-line','1');cleanNode(existing);return true}

      const slot=place.cloneNode(true);
      cleanNode(slot);
      slot.textContent=name;
      slot.setAttribute('data-guest-name','1');
      slot.setAttribute('data-dini-guest-name','1');
      slot.setAttribute('data-dini-guest-injected','1');
      slot.setAttribute('data-dini-guest-three-line','1');

      // Preserve the template's typography/cascade by cloning "Di Tempat".
      // Only give the dynamic name a modest breathing room; do not impose a new design system.
      if(slot.style){
        slot.style.setProperty('margin-top',slot.style.marginTop||'.32em');
        slot.style.setProperty('margin-bottom',slot.style.marginBottom||'.32em');
      }
      parent.insertBefore(slot,place);
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
    ensureThreeLineSlot();
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
