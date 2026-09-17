(()=>{
  'use strict';
  if(window.__DINI_SOURCE_TRUTH_RUNTIME_COMPAT_V1__)return;
  window.__DINI_SOURCE_TRUTH_RUNTIME_COMPAT_V1__=true;

  const VERSION='1.0.1';
  const MOBILE_MAX=767;
  const boundDocs=new WeakMap();
  const boundFrames=new WeakSet();

  const lower=v=>String(v??'').trim().toLowerCase();
  const parseSettings=host=>{
    try{return JSON.parse(host?.getAttribute?.('data-settings')||'{}')||{}}
    catch{return{}}
  };
  const mobileAnimation=host=>lower(host?.getAttribute?.('data-native-animation-mobile')||parseSettings(host)?._animation_mobile||'');
  const isMobileDoc=doc=>{
    const win=doc?.defaultView;
    try{if(win?.matchMedia?.(`(max-width: ${MOBILE_MAX}px)`)?.matches)return true}catch{}
    const width=Number(doc?.documentElement?.clientWidth||win?.innerWidth||0);
    return width>0&&width<=MOBILE_MAX;
  };

  function revealMobileNone(host,doc){
    if(!host||host.nodeType!==1||!isMobileDoc(doc)||mobileAnimation(host)!=='none')return false;
    let changed=false;
    if(host.classList?.contains('elementor-invisible')){host.classList.remove('elementor-invisible');changed=true}

    const visibility=lower(host.style?.getPropertyValue?.('visibility'));
    const visibilityPriority=lower(host.style?.getPropertyPriority?.('visibility'));
    if(visibility!=='visible'||visibilityPriority!=='important'){
      host.style?.setProperty('visibility','visible','important');
      changed=true;
    }

    const opacity=String(host.style?.getPropertyValue?.('opacity')||'').trim();
    const opacityPriority=lower(host.style?.getPropertyPriority?.('opacity'));
    if(opacity!=='1'||opacityPriority!=='important'){
      host.style?.setProperty('opacity','1','important');
      changed=true;
    }

    if(host.getAttribute('data-dini-mobile-none-compat')!==VERSION){
      host.setAttribute('data-dini-mobile-none-compat',VERSION);
      changed=true;
    }
    return changed;
  }

  function socialRole(anchor){
    const sig=[
      anchor?.className||'',
      anchor?.textContent||'',
      anchor?.getAttribute?.('aria-label')||'',
      anchor?.getAttribute?.('title')||'',
      anchor?.getAttribute?.('href')||''
    ].join(' ').toLowerCase();
    if(/(?:whatsapp|wa\.me|api\.whatsapp)/i.test(sig))return'whatsapp';
    if(/instagram/i.test(sig))return'instagram';
    if(/(?:social-icon-link|\blink\b|website|galeriundanganofficial\.com)/i.test(sig))return'website';
    return'';
  }

  function socialSvg(role){
    const common=`data-dini-source-truth-social-svg="${role}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"`;
    if(role==='instagram')return `<svg ${common}><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.4" cy="6.6" r="1" class="dini-social-dot"></circle></svg>`;
    if(role==='whatsapp')return `<svg ${common}><path d="M20.5 3.5A10 10 0 0 0 4.8 15.7L3.5 20.5l4.9-1.3A10 10 0 1 0 20.5 3.5Z"></path><path d="M8.3 7.8c.2-.5.4-.5.7-.5h.6c.2 0 .4.1.5.4l.8 1.8c.1.3.1.5-.1.7l-.6.7c-.2.2-.2.4-.1.6.6 1.1 1.5 2 2.6 2.6.2.1.4.1.6-.1l.8-1c.2-.2.4-.3.7-.2l1.8.8c.3.1.4.3.4.5v.6c0 .3-.1.6-.4.8-.5.5-1.4.9-2.3.8-1.4-.1-3.2-.7-5-2.3-1.6-1.5-2.6-3.4-2.8-4.9-.1-.7.1-1.7.6-2.3Z"></path></svg>`;
    return `<svg ${common}><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"></path><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"></path></svg>`;
  }

  function ensureStyle(doc){
    if(!doc?.head||doc.getElementById('dini-source-truth-runtime-compat-style'))return;
    const style=doc.createElement('style');
    style.id='dini-source-truth-runtime-compat-style';
    style.textContent=`
[data-dini-source-truth-social-compat="${VERSION}"] [data-dini-social-font-icon="1"]{display:none!important}
[data-dini-source-truth-social-compat="${VERSION}"] [data-dini-source-truth-social-svg]{width:1em!important;height:1em!important;display:block!important;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}
[data-dini-source-truth-social-compat="${VERSION}"] [data-dini-source-truth-social-svg] .dini-social-dot{fill:currentColor;stroke:none}
`;
    doc.head.appendChild(style);
  }

  function patchSocial(doc){
    if(!doc?.querySelectorAll||!isMobileDoc(doc))return 0;
    let patched=0;
    ensureStyle(doc);
    for(const widget of doc.querySelectorAll('.elementor-widget-social-icons,[data-widget_type="social-icons.default"]')){
      revealMobileNone(widget,doc);
      let widgetPatched=false;
      for(const anchor of widget.querySelectorAll('a.elementor-social-icon')){
        const role=socialRole(anchor);if(!role)continue;
        if(anchor.querySelector('svg:not([data-dini-source-truth-social-svg])'))continue;
        if(!anchor.querySelector(`[data-dini-source-truth-social-svg="${role}"]`)){
          for(const icon of anchor.querySelectorAll('i'))icon.setAttribute('data-dini-social-font-icon','1');
          anchor.insertAdjacentHTML('beforeend',socialSvg(role));
          widgetPatched=true;patched++;
        }
        if(!anchor.getAttribute('aria-label'))anchor.setAttribute('aria-label',role==='instagram'?'Instagram':role==='whatsapp'?'WhatsApp':'Website');
      }
      if(widgetPatched||widget.querySelector('[data-dini-source-truth-social-svg]'))widget.setAttribute('data-dini-source-truth-social-compat',VERSION);
    }
    return patched;
  }

  function applyDocument(doc){
    if(!doc?.documentElement)return {revealed:0,social:0};
    let revealed=0;
    if(isMobileDoc(doc)){
      for(const host of doc.querySelectorAll('[data-native-animation-mobile],[data-settings]'))if(revealMobileNone(host,doc))revealed++;
    }
    const social=patchSocial(doc);
    doc.documentElement.setAttribute('data-dini-source-truth-runtime-compat',VERSION);
    doc.documentElement.setAttribute('data-dini-source-truth-runtime-revealed',String(revealed));
    doc.documentElement.setAttribute('data-dini-source-truth-runtime-social',String(social));
    return {revealed,social};
  }

  function bindDocument(doc){
    if(!doc?.documentElement||boundDocs.has(doc))return;
    let timer=0;
    const run=()=>applyDocument(doc);
    const schedule=()=>{clearTimeout(timer);timer=setTimeout(run,24)};
    run();
    const observer=new MutationObserver(schedule);
    try{observer.observe(doc.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','data-settings','data-native-animation-mobile']})}catch{}
    boundDocs.set(doc,observer);
    [60,180,500,1200,3000,6000].forEach(ms=>setTimeout(run,ms));
  }

  function bindFrame(frame){
    if(!frame||boundFrames.has(frame))return;
    boundFrames.add(frame);
    const run=()=>{try{bindDocument(frame.contentDocument)}catch{}};
    frame.addEventListener('load',()=>{run();[40,120,400,1000,2500].forEach(ms=>setTimeout(run,ms))});
    run();
  }

  function discoverFrames(doc=document){
    for(const id of ['previewFrame','templatePreviewFrame','diniPublicCanonicalFrame'])bindFrame(doc.getElementById?.(id));
  }

  bindDocument(document);
  discoverFrames();
  const rootObserver=new MutationObserver(()=>discoverFrames());
  try{rootObserver.observe(document.documentElement,{subtree:true,childList:true})}catch{}
  [100,300,800,1800,4000,8000].forEach(ms=>setTimeout(discoverFrames,ms));
  setTimeout(()=>rootObserver.disconnect(),15000);

  window.DINI_SOURCE_TRUTH_RUNTIME_COMPAT_V1={VERSION,applyDocument,revealMobileNone,patchSocial,isMobileDoc};
})();
