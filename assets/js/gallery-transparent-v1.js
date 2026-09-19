(()=>{
  'use strict';
  if(window.DINI_GALLERY_TRANSPARENT_V1?.version)return;

  const VERSION='1.0.0';
  const doc=document;

  const clean=value=>String(value||'').replace(/\s+/g,' ').trim();

  function headingFor(widget){
    const candidates=[...doc.querySelectorAll(
      '.elementor-heading-title,h1,h2,h3,h4,h5,h6,[class*="heading"]'
    )];
    return candidates.find(el=>{
      const text=clean(el.textContent).replace(/\s+/g,'');
      return /^galerifoto$/i.test(text);
    })||null;
  }

  function commonScope(widget,heading){
    if(!widget)return null;

    let node=widget;
    let fallback=widget.closest('.elementor-section,.e-con,.elementor-element')||widget.parentElement;

    for(let depth=0;node&&depth<10;depth++,node=node.parentElement){
      if(
        heading&&
        node.contains(heading)&&
        node.contains(widget)&&
        (
          node.matches?.('.elementor-section,.e-con,.elementor-top-section')||
          node.classList?.contains('elementor-element')
        )
      ){
        fallback=node;
        if(node.matches?.('.elementor-section,.e-con,.elementor-top-section'))return node;
      }
    }
    return fallback;
  }

  function parseRgb(value){
    const match=String(value||'').match(/rgba?\(([^)]+)\)/i);
    if(!match)return null;
    const parts=match[1].split(',').map(v=>Number.parseFloat(v.trim()));
    if(parts.length<3||parts.some((v,i)=>i<3&&!Number.isFinite(v)))return null;
    return{
      r:parts[0],
      g:parts[1],
      b:parts[2],
      a:Number.isFinite(parts[3])?parts[3]:1
    };
  }

  function lightSurface(el){
    let cs=null;
    try{cs=getComputedStyle(el)}catch{}
    if(!cs)return false;

    const rgb=parseRgb(cs.backgroundColor);
    if(!rgb||rgb.a<0.06)return false;

    const max=Math.max(rgb.r,rgb.g,rgb.b);
    const min=Math.min(rgb.r,rgb.g,rgb.b);
    const average=(rgb.r+rgb.g+rgb.b)/3;

    // Only remove very light neutral surfaces. Colored / dark theme surfaces
    // remain untouched, and background images are never removed.
    return average>=238&&(max-min)<=16;
  }

  function makeTransparent(el){
    if(!el?.style)return;
    if(!lightSurface(el))return;
    el.style.setProperty('background-color','transparent','important');
    el.setAttribute('data-dini-gallery-transparent-surface','1');
  }

  function apply(){
    const widgets=[...doc.querySelectorAll('.elementor-widget-gallery')];
    if(!widgets.length)return 0;

    let count=0;

    widgets.forEach(widget=>{
      const heading=headingFor(widget);
      const scope=commonScope(widget,heading);
      if(!scope)return;

      scope.setAttribute('data-dini-gallery-transparent-scope','1');

      // Clear only light neutral backgrounds along the structural chain.
      let node=widget;
      for(let depth=0;node&&depth<10;depth++,node=node.parentElement){
        makeTransparent(node);
        if(node===scope)break;
      }

      if(heading){
        let hnode=heading;
        for(let depth=0;hnode&&depth<8;depth++,hnode=hnode.parentElement){
          makeTransparent(hnode);
          if(hnode===scope)break;
        }
      }

      // Elementor often paints the visible white surface on these structural
      // wrappers inside the Gallery section. Restrict this to the identified
      // Gallery scope and never touch gallery image backgrounds.
      for(const el of scope.querySelectorAll(
        '.elementor-container,.elementor-column,.elementor-widget-wrap,.e-con,.e-con-inner'
      )){
        if(el.closest('.e-gallery-item,.e-gallery-image'))continue;
        makeTransparent(el);
      }

      count++;
    });

    doc.documentElement.setAttribute('data-dini-gallery-transparent',VERSION);
    doc.documentElement.setAttribute('data-dini-gallery-transparent-count',String(count));
    return count;
  }

  function boot(){
    let count=apply();
    if(count)return;

    let attempts=0;
    const timer=setInterval(()=>{
      attempts++;
      count=apply();
      if(count||attempts>=20)clearInterval(timer);
    },250);
  }

  window.DINI_GALLERY_TRANSPARENT_V1={
    version:VERSION,
    apply
  };

  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
