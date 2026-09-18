(()=>{
  'use strict';
  if(window.__DINI_SOURCE_TRUTH_RUNTIME_COMPAT_V1__)return;
  window.__DINI_SOURCE_TRUTH_RUNTIME_COMPAT_V1__=true;

  const VERSION='1.2.3';
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

  function generalIconRole(icon){
    const shared=window.DINI_ICON_CONTRACT_V1?.role?.(icon);if(shared&&shared!=='custom')return shared;
    const sig=lower(`${icon?.className||''} ${icon?.getAttribute?.('aria-label')||''} ${icon?.getAttribute?.('title')||''}`);
    if(/instagram/.test(sig))return'instagram';
    if(/whatsapp/.test(sig))return'whatsapp';
    if(/(?:fa-|eicon-)?copy\b|clipboard/.test(sig))return'copy';
    if(/(?:fa-|eicon-)?heart\b/.test(sig))return'heart';
    if(/(?:fa-|eicon-)?gift\b|gift-box|giftbox/.test(sig))return'gift';
    if(/map-marker|location-dot|map-pin|marker-alt/.test(sig))return'location';
    if(/calendar/.test(sig))return'calendar';
    if(/clock|time/.test(sig))return'clock';
    if(/envelope|mail/.test(sig))return'mail';
    if(/phone|mobile-alt|telephone/.test(sig))return'phone';
    if(/music|musical-note/.test(sig))return'music';
    if(/camera/.test(sig))return'camera';
    if(/\bfa-play(?:-circle)?\b|\beicon-play(?:-circle)?\b/.test(sig))return'play';
    if(/\bfa-pause(?:-circle)?\b|\beicon-pause(?:-circle)?\b/.test(sig))return'pause';
    if(/chevron-down|angle-down|caret-down/.test(sig))return'down';
    if(/chevron-up|angle-up|caret-up/.test(sig))return'up';
    if(/chevron-left|angle-left|caret-left/.test(sig))return'left';
    if(/chevron-right|angle-right|caret-right/.test(sig))return'right';
    if(/\bfa-link\b|social-icon-link/.test(sig))return'link';
    return'';
  }

  function generalIconSvg(role){
    const common=`data-dini-source-truth-general-svg="${role}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"`;
    if(role==='instagram')return `<svg ${common}><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.4" cy="6.6" r="1" class="dini-general-dot"></circle></svg>`;
    if(role==='whatsapp')return `<svg ${common}><path d="M20.5 3.5A10 10 0 0 0 4.8 15.7L3.5 20.5l4.9-1.3A10 10 0 1 0 20.5 3.5Z"></path><path d="M8.3 7.8c.2-.5.4-.5.7-.5h.6c.2 0 .4.1.5.4l.8 1.8c.1.3.1.5-.1.7l-.6.7c-.2.2-.2.4-.1.6.6 1.1 1.5 2 2.6 2.6.2.1.4.1.6-.1l.8-1c.2-.2.4-.3.7-.2l1.8.8c.3.1.4.3.4.5v.6c0 .3-.1.6-.4.8-.5.5-1.4.9-2.3.8-1.4-.1-3.2-.7-5-2.3-1.6-1.5-2.6-3.4-2.8-4.9-.1-.7.1-1.7.6-2.3Z"></path></svg>`;
    if(role==='copy')return `<svg ${common}><rect x="9" y="9" width="10" height="10" rx="1.5"></rect><path d="M15 9V6.5A1.5 1.5 0 0 0 13.5 5h-8A1.5 1.5 0 0 0 4 6.5v8A1.5 1.5 0 0 0 5.5 16H9"></path></svg>`;
    if(role==='heart')return `<svg ${common} class="dini-general-fill"><path d="M12 21s-7.2-4.5-9.4-8.6C.6 8.8 2.5 5 6.4 5c2.1 0 3.7 1.2 4.6 2.5C11.9 6.2 13.5 5 15.6 5c3.9 0 5.8 3.8 3.8 7.4C17.2 16.5 12 21 12 21Z"></path></svg>`;
    if(role==='gift')return `<svg ${common} class="dini-general-fill"><path d="M20 7h-2.2c.4-.6.7-1.3.7-2 0-1.7-1.3-3-3-3-1.7 0-2.8 1.3-3.5 2.6C11.3 3.3 10.2 2 8.5 2c-1.7 0-3 1.3-3 3 0 .7.3 1.4.7 2H4c-1.1 0-2 .9-2 2v3h1v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-8h1V9c0-1.1-.9-2-2-2Zm-4.5-3c.6 0 1 .4 1 1 0 1.1-1.6 1.8-3.1 2 .5-1.5 1.1-3 2.1-3Zm-7 0c1 0 1.6 1.5 2.1 3-1.5-.2-3.1-.9-3.1-2 0-.6.4-1 1-1ZM4 9h7v3H4V9Zm1 5h6v6H5v-6Zm14 6h-6v-6h6v6Zm1-8h-7V9h7v3Z"></path></svg>`;
    if(role==='location')return `<svg ${common}><path d="M12 21s6-6.2 6-12a6 6 0 1 0-12 0c0 5.8 6 12 6 12Z"></path><circle cx="12" cy="9" r="2"></circle></svg>`;
    if(role==='calendar')return `<svg ${common}><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M8 3v4M16 3v4M3 10h18"></path></svg>`;
    if(role==='clock')return `<svg ${common}><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>`;
    if(role==='mail')return `<svg ${common}><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m4 7 8 6 8-6"></path></svg>`;
    if(role==='phone')return `<svg ${common}><path d="M7 3h3l1 4-2 1c1.1 2.4 2.6 3.9 5 5l1-2 4 1v3c0 1.1-.9 2-2 2C9.8 17 7 14.2 7 7c0-1.1.9-2 2-2"></path></svg>`;
    if(role==='music')return `<svg ${common}><path d="M9 18V6l10-2v12"></path><circle cx="6" cy="18" r="3"></circle><circle cx="16" cy="16" r="3"></circle></svg>`;
    if(role==='camera')return `<svg ${common}><path d="M4 7h4l1.5-2h5L16 7h4v12H4Z"></path><circle cx="12" cy="13" r="3.5"></circle></svg>`;
    if(role==='link')return `<svg ${common}><path d="M10 13a5 5 0 0 0 7.1.1l2-2A5 5 0 0 0 12 4l-1.1 1.1"></path><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"></path></svg>`;
    if(role==='play')return `<svg ${common} class="dini-general-fill"><path d="M8 5v14l11-7Z"></path></svg>`;
    if(role==='pause')return `<svg ${common} class="dini-general-fill"><path d="M7 5h4v14H7zM13 5h4v14h-4z"></path></svg>`;
    if(role==='down')return `<svg ${common}><path d="m6 9 6 6 6-6"></path></svg>`;
    if(role==='up')return `<svg ${common}><path d="m6 15 6-6 6 6"></path></svg>`;
    if(role==='left')return `<svg ${common}><path d="m15 6-6 6 6 6"></path></svg>`;
    if(role==='right')return `<svg ${common}><path d="m9 6 6 6-6 6"></path></svg>`;
    return'';
  }

  function ensureStyle(doc){
    if(!doc?.head)return;
    let style=doc.getElementById('dini-source-truth-runtime-compat-style');
    if(!style){
      style=doc.createElement('style');
      style.id='dini-source-truth-runtime-compat-style';
      doc.head.appendChild(style);
    }
    style.textContent=`
[data-dini-source-truth-social-compat="${VERSION}"] [data-dini-social-font-icon="1"]{display:none!important}
[data-dini-source-truth-social-compat="${VERSION}"] [data-dini-source-truth-social-svg]{width:1em!important;height:1em!important;display:block!important;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}
[data-dini-source-truth-social-compat="${VERSION}"] [data-dini-source-truth-social-svg] .dini-social-dot{fill:currentColor;stroke:none}
[data-dini-source-truth-general-icon="${VERSION}"]::before{content:none!important;display:none!important}
[data-dini-source-truth-general-icon="${VERSION}"]>[data-dini-source-truth-general-svg]{width:1em!important;height:1em!important;display:inline-block!important;vertical-align:-.125em;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}
[data-dini-source-truth-general-icon="${VERSION}"]>[data-dini-source-truth-general-svg].dini-general-fill{fill:currentColor!important;stroke:none!important}
[data-dini-source-truth-general-icon="${VERSION}"]>[data-dini-source-truth-general-svg] .dini-general-dot{fill:currentColor;stroke:none}
`;
  }

  function patchGeneralIcons(doc){
    if(!doc?.querySelectorAll)return 0;
    ensureStyle(doc);
    let patched=0;
    window.DINI_ICON_CONTRACT_V1?.scanDocument?.(doc,{markNodes:true});
    const nodes=doc.querySelectorAll('i[class*="fa-"],i[class*="eicon-"],span[class*="fa-"],span[class*="eicon-"]');
    for(const icon of nodes){
      const role=generalIconRole(icon);if(!role)continue;
      if(icon.querySelector?.(`[data-dini-source-truth-general-svg="${role}"]`))continue;
      const svg=generalIconSvg(role);if(!svg)continue;
      icon.setAttribute('data-dini-source-truth-general-icon',VERSION);
      icon.insertAdjacentHTML('beforeend',svg);
      patched++;
    }
    return patched;
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

  function imageLikeUrl(v){
    const s=String(v||'').trim();if(!s)return false;
    return /\.(?:avif|bmp|gif|jpe?g|png|svg|webp)(?:$|[?#])/i.test(s)||/\/wp-content\/uploads\//i.test(s);
  }

  function isImageLightboxAnchor(a){
    if(!a?.matches?.('a[href]'))return false;
    const href=a.getAttribute('href')||'';
    return imageLikeUrl(href)||a.hasAttribute('data-elementor-open-lightbox')||a.hasAttribute('data-elementor-lightbox-slideshow')||/elementor-(?:gallery|lightbox)|gallery-item|lightbox/i.test(String(a.className||''));
  }

  function imageSrc(img){
    return String(img?.getAttribute?.('src')||img?.getAttribute?.('data-src')||img?.currentSrc||'').trim();
  }

  function cssUrl(value){
    const s=String(value||'');
    const m=s.match(/url\(\s*(["']?)(.*?)\1\s*\)/i);
    return String(m?.[2]||'').trim();
  }

  function mediaUrl(node){
    if(!node)return '';
    if(node.matches?.('img'))return imageSrc(node);
    const thumb=String(node.getAttribute?.('data-thumbnail')||node.getAttribute?.('data-src')||'').trim();
    if(thumb)return thumb;
    const inline=cssUrl(node.style?.getPropertyValue?.('background-image')||node.getAttribute?.('style')||'');
    if(inline)return inline;
    const bg=node.querySelector?.('[data-thumbnail],.e-gallery-image,[style*="background-image"]');
    if(bg){
      const nested=String(bg.getAttribute?.('data-thumbnail')||bg.getAttribute?.('data-src')||'').trim()||
        cssUrl(bg.style?.getPropertyValue?.('background-image')||bg.getAttribute?.('style')||'');
      if(nested)return nested;
    }
    const img=node.querySelector?.('img[src],img[data-src]');
    return imageSrc(img);
  }

  function syncElementorActionHash(a,url){
    const raw=String(a?.getAttribute?.('data-e-action-hash')||'').trim();
    if(!raw||!url)return false;
    try{
      const decoded=decodeURIComponent(raw.replace(/^#/,''));
      const prefix='elementor-action:';
      if(!decoded.startsWith(prefix))return false;
      const qs=new URLSearchParams(decoded.slice(prefix.length));
      const b64=qs.get('settings');if(!b64)return false;
      const cfg=JSON.parse(atob(b64));
      if(!cfg||typeof cfg!=='object')return false;
      const old=String(cfg.url||'');
      if(old===url)return false;
      cfg.url=url;
      qs.set('settings',btoa(JSON.stringify(cfg)));
      a.setAttribute('data-e-action-hash','#'+encodeURIComponent(prefix+qs.toString()));
      a.setAttribute('data-dini-lightbox-action-authority','display-media');
      return true;
    }catch{return false}
  }

  function authorityHost(a){
    return a?.closest?.('.elementor-widget-image,.elementor-widget-gallery,.elementor-image-gallery,.elementor-widget-image-carousel,.elementor-gallery-item,.gallery-item,.gallery,[data-widget_type*="image"],[data-widget_type*="gallery"],.elementor-widget-container')||a?.parentElement||null;
  }

  function displayedMediaForAnchor(a){
    if(!a)return null;

    // Elementor e-gallery uses a background-image DIV, not an IMG.
    const own=a.querySelector?.('[data-thumbnail],.e-gallery-image,[style*="background-image"],img[src],img[data-src]');
    if(own&&mediaUrl(own))return own;

    const host=authorityHost(a);
    if(host){
      const media=[...host.querySelectorAll?.('[data-thumbnail],.e-gallery-image,[style*="background-image"],img[src],img[data-src]')||[]]
        .filter(x=>mediaUrl(x));
      if(media.length===1)return media[0];

      // Separate overlay anchors are paired by authored order inside one gallery host.
      const anchors=[...host.querySelectorAll?.('a[href]')||[]].filter(isImageLightboxAnchor);
      const ai=anchors.indexOf(a);
      if(ai>=0&&media[ai])return media[ai];
    }

    const container=a.closest?.('.elementor-section,.elementor-column,.elementor-widget-wrap');
    if(container){
      const anchors=[...container.querySelectorAll?.('a[href]')||[]].filter(isImageLightboxAnchor);
      const media=[...container.querySelectorAll?.('[data-thumbnail],.e-gallery-image,[style*="background-image"],img[src],img[data-src]')||[]]
        .filter(x=>mediaUrl(x));
      const ai=anchors.indexOf(a);
      if(ai>=0&&anchors.length===media.length&&media[ai])return media[ai];
    }
    return null;
  }

  function syncImageAnchor(a){
    if(!a||!isImageLightboxAnchor(a))return false;
    const media=displayedMediaForAnchor(a);
    const src=mediaUrl(media);
    if(!src)return false;
    const old=a.getAttribute('href')||'';
    const hrefChanged=old!==src;
    if(hrefChanged)a.setAttribute('href',src);
    const actionChanged=syncElementorActionHash(a,src);
    a.setAttribute('data-dini-image-authority','display-media');
    a.setAttribute('data-dini-image-authority-from',hrefChanged||actionChanged?'runtime-reconciled':'already-synced');
    return hrefChanged||actionChanged;
  }

  function patchImageAuthority(doc){
    if(!doc?.querySelectorAll)return 0;
    let patched=0;
    for(const a of doc.querySelectorAll('a[href]')){
      if(syncImageAnchor(a))patched++;
    }
    return patched;
  }

  function bindImageAuthorityEvents(doc){
    if(!doc||doc.__diniImageAuthorityBound)return;
    doc.__diniImageAuthorityBound=true;
    const syncTarget=e=>{
      const a=e.target?.closest?.('a[href]');
      if(a)syncImageAnchor(a);
    };
    // mouseover updates desktop status-bar URL before click; pointer/touch covers mobile long-press.
    doc.addEventListener('mouseover',syncTarget,true);
    doc.addEventListener('pointerdown',syncTarget,true);
    doc.addEventListener('touchstart',syncTarget,{capture:true,passive:true});
    doc.addEventListener('click',syncTarget,true);
  }

  function applyDocument(doc){
    if(!doc?.documentElement)return {revealed:0,social:0,icons:0,imageLinks:0};
    let revealed=0;
    if(isMobileDoc(doc)){
      for(const host of doc.querySelectorAll('[data-native-animation-mobile],[data-settings]'))if(revealMobileNone(host,doc))revealed++;
    }
    bindImageAuthorityEvents(doc);
    const icons=patchGeneralIcons(doc);
    const social=patchSocial(doc);
    const imageLinks=patchImageAuthority(doc);
    doc.documentElement.setAttribute('data-dini-source-truth-runtime-compat',VERSION);
    doc.documentElement.setAttribute('data-dini-source-truth-runtime-revealed',String(revealed));
    doc.documentElement.setAttribute('data-dini-source-truth-runtime-social',String(social));
    doc.documentElement.setAttribute('data-dini-source-truth-runtime-icons',String(icons));
    doc.documentElement.setAttribute('data-dini-source-truth-runtime-image-links',String(imageLinks));
    return {revealed,social,icons,imageLinks};
  }

  function bindDocument(doc){
    if(!doc?.documentElement||boundDocs.has(doc))return;
    let timer=0;
    const run=()=>applyDocument(doc);
    const schedule=()=>{clearTimeout(timer);timer=setTimeout(run,50)};
    run();

    // PERFORMANCE: do not observe class/style globally.
    // Elementor changes them during scroll/reveal and the old observer rescanned the whole DOM,
    // causing gallery-area jank. Only process structural/media URL changes.
    const observer=new MutationObserver(records=>{
      let needsFull=false;
      for(const r of records){
        if(r.type==='childList'){needsFull=true;continue}
        const t=r.target;
        if(r.attributeName==='href'&&t?.matches?.('a[href]'))syncImageAnchor(t);
        if((r.attributeName==='src'||r.attributeName==='data-src'||r.attributeName==='data-thumbnail')&&
           t?.matches?.('img,[data-thumbnail],.e-gallery-image')){
          const a=t.closest?.('a[href]')||authorityHost(t)?.querySelector?.('a[href]');
          if(a)syncImageAnchor(a);
        }
      }
      if(needsFull)schedule();
    });
    try{observer.observe(doc.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['href','src','data-src','data-thumbnail','data-e-action-hash']})}catch{}
    boundDocs.set(doc,observer);

    // Short stabilization window only; no perpetual scroll-driven rescans.
    [60,180,500,1200,3000].forEach(ms=>setTimeout(run,ms));
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

  window.DINI_SOURCE_TRUTH_RUNTIME_COMPAT_V1={VERSION,applyDocument,revealMobileNone,patchSocial,patchGeneralIcons,patchImageAuthority,syncImageAnchor,isMobileDoc};
})();
