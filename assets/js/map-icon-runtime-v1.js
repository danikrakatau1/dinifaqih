(()=>{
  'use strict';
  if(window.DINI_MAP_ICON_RUNTIME_V1?.version)return;

  const VERSION='1.3.0';
  const clean=v=>String(v||'').replace(/\s+/g,' ').trim();

  const isMapLink=a=>{
    if(!a?.matches?.('a,button,[role="button"]'))return false;
    const text=clean(a.textContent);
    const href=String(a.getAttribute?.('href')||'');
    const aria=clean(a.getAttribute?.('aria-label')||'');
    return /google\s*maps?/i.test(text)||/google\s*maps?/i.test(aria)||
      /maps\.(?:app\.goo\.gl|google\.)|google\.com\/maps|goo\.gl\/maps/i.test(href);
  };

  function ensureStyle(){
    if(document.getElementById('diniEventMapPinStyle'))return;
    const style=document.createElement('style');
    style.id='diniEventMapPinStyle';
    style.textContent=`
      [data-dini-event-map-pin-runtime]::before,
      [data-dini-event-map-pin-runtime]::after{
        content:none!important;
        display:none!important;
        background:none!important;
      }
      [data-dini-event-map-pin-runtime]{
        background-image:none!important;
        text-shadow:none!important;
      }
      [data-dini-event-map-pin-runtime] > [data-dini-event-map-pin-svg]{
        display:block!important;
      }
      [data-dini-event-map-pin-runtime] img,
      [data-dini-event-map-pin-runtime] i,
      [data-dini-event-map-pin-runtime] svg:not([data-dini-event-map-pin-svg]){
        display:none!important;
      }
      [data-dini-event-map-pin-runtime] *::before,
      [data-dini-event-map-pin-runtime] *::after{
        content:none!important;
        display:none!important;
        background:none!important;
      }
    `;
    (document.head||document.documentElement).appendChild(style);
  }

  const iconSvg=()=>{
    const ns='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(ns,'svg');
    svg.setAttribute('viewBox','0 0 24 24');
    svg.setAttribute('width','30');
    svg.setAttribute('height','30');
    svg.setAttribute('fill','none');
    svg.setAttribute('stroke','currentColor');
    svg.setAttribute('stroke-width','1.9');
    svg.setAttribute('stroke-linecap','round');
    svg.setAttribute('stroke-linejoin','round');
    svg.setAttribute('aria-hidden','true');
    svg.setAttribute('focusable','false');
    svg.setAttribute('data-dini-event-map-pin-svg','lucide-map-pin');
    svg.style.cssText='display:block;width:30px;height:30px;min-width:30px;overflow:visible';

    const path=document.createElementNS(ns,'path');
    path.setAttribute('d','M20 10c0 5-5.5 11-7.4 12.9a1 1 0 0 1-1.2 0C9.5 21 4 15 4 10a8 8 0 1 1 16 0');
    const circle=document.createElementNS(ns,'circle');
    circle.setAttribute('cx','12');
    circle.setAttribute('cy','10');
    circle.setAttribute('r','3');
    svg.append(path,circle);
    return svg;
  };

  function eventRootFromButton(button){
    let node=button;
    let best=null;
    for(let depth=0;node&&node!==document.body&&depth<16;depth++,node=node.parentElement){
      const txt=clean(node.textContent);
      if(txt.length>6500)continue;
      if(!/google\s*maps?/i.test(txt))continue;
      if(!/(akad\s+nikah|resepsi|ramah\s+tamah)/i.test(txt))continue;
      best=node;
      if(node.matches?.('section,.elementor-section,.elementor-top-section'))break;
    }
    return best||button.closest('.elementor-section,section,.elementor-column,.elementor-widget-wrap')||button.parentElement;
  }

  function findAddress(root,button){
    let buttonRect=null;
    try{buttonRect=button.getBoundingClientRect()}catch{}
    const nodes=[...root.querySelectorAll('p,span,div,h4,h5,h6')].filter(el=>{
      if(el===button||el.contains(button)||button.contains(el))return false;
      const txt=clean(el.textContent);
      if(txt.length<5||txt.length>260)return false;
      if(/google\s*maps?|akad\s+nikah|resepsi|ramah\s+tamah|september|wib|selera\s+anda|selesai/i.test(txt))return false;
      const childSame=[...el.children].some(ch=>clean(ch.textContent)===txt);
      if(childSame)return false;
      return true;
    });

    let best=null,bestScore=-Infinity;
    for(const el of nodes){
      let r;try{r=el.getBoundingClientRect()}catch{continue}
      if(!r||!r.width||!r.height)continue;
      let score=0;
      if(buttonRect){
        const gap=buttonRect.top-r.bottom;
        if(gap<0||gap>210)continue;
        score+=320-gap*1.5;
        const dx=Math.abs((r.left+r.right)/2-(buttonRect.left+buttonRect.right)/2);
        score+=Math.max(0,140-dx);
      }
      const txt=clean(el.textContent);
      if(/dukuh|gang|jalan|jl\.?|desa|kec\.?|kab\.?|batang|kertoharjo|madureso|sidorejo|warungasem/i.test(txt))score+=260;
      if(txt.length>=10&&txt.length<=140)score+=60;
      if(score>bestScore){bestScore=score;best=el}
    }
    return best;
  }

  function siblingPinFromAddress(address,root){
    if(!address)return null;
    const addressWidget=address.closest?.('.elementor-element')||address.parentElement;
    if(!addressWidget)return null;

    let sibling=addressWidget.previousElementSibling;
    for(let step=0;sibling&&step<5;step++,sibling=sibling.previousElementSibling){
      if(root&&!root.contains(sibling))break;
      const txt=clean(sibling.textContent);
      if(txt.length>4)continue;

      const directIcon=sibling.querySelector?.('.elementor-icon');
      const visual=sibling.querySelector?.('svg,i,img,[class*="icon"],[class*="marker"],[class*="location"]');
      const container=sibling.querySelector?.('.elementor-widget-container')||sibling;
      const pseudo=pseudoHasVisual(sibling)||pseudoHasVisual(container);
      let rect=null;
      try{rect=sibling.getBoundingClientRect()}catch{}
      if(!rect||rect.height<4||rect.height>130)continue;

      if(directIcon||visual||pseudo){
        return {
          widget:sibling,
          host:directIcon||container,
          source:directIcon||visual||container,
          step
        };
      }
    }
    return null;
  }

  function signature(el){
    return clean([
      el.tagName||'',
      el.className?.baseVal||el.className||'',
      el.id||'',
      el.getAttribute?.('data-icon')||'',
      el.getAttribute?.('aria-label')||'',
      el.getAttribute?.('title')||'',
      el.getAttribute?.('src')||''
    ].join(' ')).toLowerCase();
  }

  function pseudoHasVisual(el){
    try{
      for(const pseudo of ['::before','::after']){
        const cs=getComputedStyle(el,pseudo);
        const content=String(cs.content||'');
        if(content&&content!=='none'&&content!=='normal'&&content!=='""')return true;
        if(cs.backgroundImage&&cs.backgroundImage!=='none')return true;
      }
    }catch{}
    return false;
  }

  function candidateElements(root,button,address){
    const all=[...root.querySelectorAll('*')];
    return all.filter(el=>{
      if(el===button||button.contains(el)||el.contains(button))return false;
      if(address&&(el===address||address.contains(el)||el.contains(address)))return false;
      if(el.closest?.('[data-dini-event-map-pin-runtime]'))return false;

      let r,cs;
      try{r=el.getBoundingClientRect();cs=getComputedStyle(el)}catch{return false}
      if(!r||r.width<5||r.height<5||r.width>95||r.height>95)return false;
      if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)===0)return false;

      const txt=clean(el.textContent);
      if(txt.length>3)return false;
      return true;
    });
  }

  function findStandalonePin(root,button,address){
    const candidates=candidateElements(root,button,address);
    let addressRect=null,buttonRect=null;
    try{addressRect=address?.getBoundingClientRect?.()||null}catch{}
    try{buttonRect=button.getBoundingClientRect()}catch{}

    let best=null,bestScore=-Infinity;
    for(const el of candidates){
      let r;try{r=el.getBoundingClientRect()}catch{continue}
      let score=0;
      const sig=signature(el);

      if(/map-marker|location|marker|map-pin|pin|place/.test(sig))score+=520;
      if(/^(IMG|SVG|I|SPAN)$/i.test(el.tagName||''))score+=90;
      if(pseudoHasVisual(el))score+=120;

      try{
        const cs=getComputedStyle(el);
        if(cs.backgroundImage&&cs.backgroundImage!=='none')score+=100;
      }catch{}

      if(addressRect){
        const vertical=addressRect.top-r.bottom;
        if(vertical<-8||vertical>145)continue;
        const dx=Math.abs((r.left+r.right)/2-(addressRect.left+addressRect.right)/2);
        if(dx>105)continue;

        score+=520-Math.abs(vertical-18)*3.2;
        score+=260-dx*2.2;
      }else if(buttonRect){
        const vertical=buttonRect.top-r.bottom;
        if(vertical<35||vertical>300)continue;
        const dx=Math.abs((r.left+r.right)/2-(buttonRect.left+buttonRect.right)/2);
        if(dx>110)continue;
        score+=260-Math.abs(vertical-105);
        score+=140-dx;
      }

      if(r.width>=12&&r.width<=50&&r.height>=12&&r.height<=55)score+=130;
      if(score>bestScore){bestScore=score;best=el}
    }
    return bestScore>250?best:null;
  }

  function replacementHost(pin){
    if(!pin)return null;
    if(pin.matches?.('img,svg,i')){
      const span=document.createElement('span');
      span.className='dini-event-map-pin-replacement';
      try{
        const cs=getComputedStyle(pin);
        span.style.color=cs.color||'';
      }catch{}
      pin.replaceWith(span);
      return span;
    }
    return pin;
  }

  function replaceStandalonePin(button){
    if(!isMapLink(button))return false;
    const root=eventRootFromButton(button);
    if(!root)return false;
    const address=findAddress(root,button);

    // Elementor source uses a dedicated widget immediately before the address
    // for this large pin. Prefer that exact sibling relationship before any
    // class/geometry fallback.
    const siblingHit=siblingPinFromAddress(address,root);
    const pin=siblingHit?.source||findStandalonePin(root,button,address);
    if(!pin)return false;

    let host=siblingHit?.host||replacementHost(pin);
    if(!host)return false;
    if(host.getAttribute?.('data-dini-event-map-pin-runtime')===VERSION)return true;

    let color='';
    try{
      color=getComputedStyle(pin).color||getComputedStyle(host).color||'';
    }catch{}
    if(!color||color==='rgb(0, 0, 0)'||color==='rgba(0, 0, 0, 0)')color='#b79a6d';

    // Remove the authored low-resolution/icon-font visual while preserving its
    // Elementor widget slot, spacing and animation position.
    host.textContent='';
    host.style.setProperty('background','none','important');
    host.style.setProperty('background-image','none','important');
    host.appendChild(iconSvg());
    host.setAttribute('data-dini-event-map-pin-runtime',VERSION);
    host.setAttribute('data-native-icon-role','location');
    host.setAttribute('aria-hidden','true');
    host.style.setProperty('display','flex','important');
    host.style.setProperty('align-items','center','important');
    host.style.setProperty('justify-content','center','important');
    host.style.setProperty('line-height','1','important');
    host.style.setProperty('font-size','0','important');
    host.style.setProperty('color',color,'important');
    host.style.setProperty('overflow','visible','important');

    if(!siblingHit){
      host.style.setProperty('width','30px','important');
      host.style.setProperty('height','30px','important');
      host.style.setProperty('min-width','30px','important');
      host.style.setProperty('min-height','30px','important');
    }else{
      siblingHit.widget.setAttribute('data-dini-event-map-pin-widget','1');
      siblingHit.widget.dataset.diniEventMapPinSibling=String(siblingHit.step);
    }

    button.setAttribute('data-dini-map-button-preserved','1');
    return true;
  }

  function scan(root=document){
    ensureStyle();
    let count=0;
    const buttons=[
      ...(root.matches?.('a,button,[role="button"]')?[root]:[]),
      ...(root.querySelectorAll?.('a,button,[role="button"]')||[])
    ].filter(isMapLink);

    for(const button of buttons){
      if(replaceStandalonePin(button))count++;
    }
    const total=document.querySelectorAll('[data-dini-event-map-pin-runtime]').length;
    document.documentElement.setAttribute('data-dini-event-map-pin-count',String(total));
    return count;
  }

  scan();

  let observer=null;
  let stopTimer=0;
  const rescan=()=>{
    scan();
    clearTimeout(stopTimer);
    stopTimer=setTimeout(()=>{observer?.disconnect();observer=null},1700);
  };

  observer=new MutationObserver(mutations=>{
    let shouldScan=false;
    for(const mutation of mutations){
      for(const node of mutation.addedNodes||[]){
        if(node?.nodeType===1){shouldScan=true;break}
      }
      if(shouldScan)break;
    }
    if(shouldScan)requestAnimationFrame(rescan);
  });

  try{observer.observe(document.body||document.documentElement,{childList:true,subtree:true})}catch{}
  [80,180,420,800,1400,2400,3600,5000].forEach(ms=>setTimeout(rescan,ms));
  stopTimer=setTimeout(()=>{observer?.disconnect();observer=null},6200);

  document.documentElement.setAttribute('data-dini-map-icon-runtime',VERSION);
  window.DINI_MAP_ICON_RUNTIME_V1={version:VERSION,scan,replaceStandalonePin,findStandalonePin};
})();