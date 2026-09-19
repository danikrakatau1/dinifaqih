(()=>{
  'use strict';
  if(window.DINI_GALLERY_TRANSPARENT_V1?.version)return;

  const VERSION='2.0.0';
  const doc=document;
  const clean=value=>String(value||'').replace(/\s+/g,' ').trim();

  function cssUrl(value){
    const raw=String(value||'').trim();
    const match=raw.match(/url\(\s*["']?([^"')]+)["']?\s*\)/i);
    return match?.[1]||'';
  }

  function galleryHeading(){
    const candidates=[...doc.querySelectorAll(
      '.elementor-heading-title,h1,h2,h3,h4,h5,h6,[class*="heading"]'
    )];
    return candidates.find(el=>/^galerifoto$/i.test(clean(el.textContent).replace(/\s+/g,'')))||null;
  }

  function commonScope(widget,heading){
    if(!widget)return null;

    let node=widget;
    let best=null;
    for(let depth=0;node&&depth<12;depth++,node=node.parentElement){
      if(heading&&node.contains(heading)&&node.contains(widget)){
        best=node;
        if(node.matches?.('.elementor-section,.elementor-top-section,.e-con'))return node;
      }
    }
    return best||widget.closest('.elementor-section,.e-con,.elementor-element')||widget.parentElement;
  }

  function rectScore(el,scopeBottom){
    let rect=null;
    try{rect=el.getBoundingClientRect()}catch{}
    if(!rect||rect.width<180||rect.height<220)return -Infinity;
    if(rect.bottom<scopeBottom-4)return -Infinity;

    const viewportWidth=Math.max(320,doc.documentElement.clientWidth||window.innerWidth||450);
    const widthRatio=Math.min(1,rect.width/viewportWidth);
    const distance=Math.max(0,rect.top-scopeBottom);
    return (widthRatio*1000)+Math.min(rect.height,900)-(distance*.65);
  }

  function visualFromElement(el){
    if(!el)return '';

    if(el.tagName==='IMG'){
      const src=String(el.currentSrc||el.getAttribute('src')||'').trim();
      if(src)return src;
    }

    let cs=null;
    try{cs=getComputedStyle(el)}catch{}
    const bg=cssUrl(el.style?.backgroundImage)||cssUrl(cs?.backgroundImage);
    return bg;
  }

  function followingBackground(scope){
    if(!scope)return '';

    let scopeRect=null;
    try{scopeRect=scope.getBoundingClientRect()}catch{}
    const scopeBottom=scopeRect?.bottom||0;

    const candidates=[];
    let seen=0;

    for(const el of doc.querySelectorAll('img,[style*="background"],.elementor-section,.elementor-widget-wrap,.e-con,.elementor-background-overlay')){
      if(seen>900)break;
      if(scope.contains(el))continue;

      const relation=scope.compareDocumentPosition(el);
      if(!(relation&Node.DOCUMENT_POSITION_FOLLOWING))continue;
      seen++;

      const url=visualFromElement(el);
      if(!url)continue;
      if(/\.svg(?:[?#]|$)/i.test(url))continue;

      const score=rectScore(el,scopeBottom);
      if(!Number.isFinite(score))continue;
      candidates.push({el,url,score});
    }

    candidates.sort((a,b)=>b.score-a.score);
    return candidates[0]?.url||'';
  }

  function clearSurface(el){
    if(!el?.style)return;
    el.style.setProperty('background-color','transparent','important');
  }

  function applyBackground(scope,url){
    if(!scope||!url)return false;

    scope.setAttribute('data-dini-gallery-transparent-scope','1');
    scope.setAttribute('data-dini-gallery-follow-background','1');

    scope.style.setProperty(
      'background-image',
      'url("'+String(url).replaceAll('"','%22')+'")',
      'important'
    );
    scope.style.setProperty('background-size','cover','important');
    scope.style.setProperty('background-position','center center','important');
    scope.style.setProperty('background-repeat','no-repeat','important');
    scope.style.setProperty('background-color','transparent','important');

    const structural=[
      scope,
      ...scope.querySelectorAll(
        '.elementor-container,.elementor-column,.elementor-widget-wrap,'+
        '.elementor-widget-heading,.elementor-widget-gallery,.e-con,.e-con-inner'
      )
    ];

    for(const el of structural){
      if(el.matches?.('.e-gallery-image,.e-gallery-item'))continue;
      if(el.closest?.('.e-gallery-image,.e-gallery-item'))continue;
      clearSurface(el);
    }

    // Neutralize only color overlays inside this Gallery scope. Existing image
    // backgrounds are left intact; the Gallery items themselves are untouched.
    for(const overlay of scope.querySelectorAll('.elementor-background-overlay')){
      overlay.style.setProperty('background-color','transparent','important');
    }

    doc.documentElement.setAttribute('data-dini-gallery-follow-background-url',url);
    return true;
  }

  function apply(){
    const widget=doc.querySelector('.elementor-widget-gallery');
    if(!widget)return false;

    const heading=galleryHeading();
    const scope=commonScope(widget,heading);
    if(!scope)return false;

    const url=followingBackground(scope);
    if(!url)return false;

    const ok=applyBackground(scope,url);
    if(ok){
      doc.documentElement.setAttribute('data-dini-gallery-transparent',VERSION);
      doc.documentElement.setAttribute('data-dini-gallery-transparent-count','1');
    }
    return ok;
  }

  function boot(){
    if(apply())return;

    let attempts=0;
    const timer=setInterval(()=>{
      attempts++;
      if(apply()||attempts>=32)clearInterval(timer);
    },250);
  }

  window.DINI_GALLERY_TRANSPARENT_V1={
    version:VERSION,
    apply
  };

  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
