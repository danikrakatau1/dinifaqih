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

  document.documentElement.dataset.guestRuntime='v1.3';
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

  function semanticCandidates(test){
    const root=document.body;if(!root)return [];
    const out=[];
    for(const n of root.querySelectorAll('*')){
      if(n.namespaceURI&&n.namespaceURI!=='http://www.w3.org/1999/xhtml')continue;
      if(n.matches?.('script,style,noscript,template,iframe,object'))continue;
      const t=norm(n.textContent);if(!t||t.length>160||!test(t))continue;
      let childOwns=false;
      for(const c of n.children||[]){const ct=norm(c.textContent);if(ct&&ct.length<=160&&test(ct)){childOwns=true;break}}
      if(!childOwns)out.push(n);
    }
    return out;
  }

  function cssString(v){return String(v||'').replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,'\\A ')}

  function ensureSemanticLabels(){
    const labels=semanticCandidates(isLabelText);
    if(!labels.length){document.documentElement.dataset.guestSemanticMatches='0';return 0}
    let style=document.getElementById('diniGuestSemanticStyle');
    if(!style){style=document.createElement('style');style.id='diniGuestSemanticStyle';document.head.appendChild(style)}
    style.textContent='[data-dini-guest-label-runtime="1"]::after{content:"'+cssString(name)+'"!important;display:block!important;margin-top:.32em!important;font:inherit!important;font-size:1.08em!important;font-weight:600!important;line-height:1.25!important;color:inherit!important;letter-spacing:inherit!important;text-transform:none!important;white-space:normal!important;}';
    let count=0;
    for(const label of labels){label.setAttribute('data-dini-guest-label-runtime','1');label.setAttribute('data-dini-guest-injected','1');count++}
    document.documentElement.dataset.guestSemanticMatches=String(count);
    return count;
  }

  function prefillForms(){
    const selectors=['#wishName','input[name="guest_name"]','input[name="nama"]','input[name="name"][data-guest]','input[data-guest-name-input]'];
    for(const s of selectors)document.querySelectorAll(s).forEach(n=>{if(!n.value||n.dataset.diniGuestPrefill==='1'){n.value=name;n.dataset.diniGuestPrefill='1'}});
  }

  function apply(){const explicitCount=setExplicit();if(!explicitCount)ensureSemanticLabels();prefillForms()}
  let timer=0;const schedule=()=>{clearTimeout(timer);timer=setTimeout(apply,40)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  [120,450,1100,2600,5200].forEach(ms=>setTimeout(apply,ms));
  const observer=new MutationObserver(schedule);try{observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true})}catch{}
  setTimeout(()=>observer.disconnect(),15000);
})();
