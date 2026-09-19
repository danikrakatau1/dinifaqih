(()=>{
  'use strict';
  if(window.DINI_MAP_ICON_RUNTIME_V1?.version)return;

  const VERSION='1.1.0';
  const clean=v=>String(v||'').replace(/\s+/g,' ').trim();

  const isMapLink=a=>{
    if(!a?.matches?.('a,button,[role="button"]'))return false;
    const text=clean(a.textContent);
    const href=String(a.getAttribute?.('href')||'');
    const aria=clean(a.getAttribute?.('aria-label')||'');
    return /google\s*maps?/i.test(text)||/google\s*maps?/i.test(aria)||
      /maps\.(?:app\.goo\.gl|google\.)|google\.com\/maps|goo\.gl\/maps/i.test(href);
  };

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
    svg.style.cssText='display:block;width:30px;height:30px;overflow:visible';

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
    for(let depth=0;node&&node!==document.body&&depth<14;depth++,node=node.parentElement){
      const txt=clean(node.textContent);
      if(txt.length>5000)continue;
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
        if(gap<0||gap>190)continue;
        score+=300-gap*1.4;
        const dx=Math.abs((r.left+r.right)/2-(buttonRect.left+buttonRect.right)/2);
        score+=Math.max(0,120-dx);
      }
      const txt=clean(el.textContent);
      if(/dukuh|gang|jalan|jl\.?|desa|kec\.?|kab\.?|batang|kertoharjo|madureso|sidorejo|warungasem/i.test(txt))score+=220;
      if(txt.length>=15&&txt.length<=120)score+=50;
      if(score>bestScore){bestScore=score;best=el}
    }
    return best;
  }

  function iconCandidates(root,button){
    const selectors=[
      '.elementor-widget-icon .elementor-icon',
      '.elementor-icon',
      '.elementor-widget-icon i',
      'i[class*="map-marker"]',
      'i[class*="location"]',
      'i[class*="marker"]',
      '[class*="icon"] > svg',
      '.elementor-widget-icon svg'
    ].join(',');
    return [...new Set([...root.querySelectorAll(selectors)])].filter(el=>{
      if(button.contains(el)||el.closest('a,button,[role="button"]')===button)return false;
      if(el.closest('[data-dini-event-map-pin-runtime]'))return false;
      try{
        const cs=getComputedStyle(el);
        return cs.display!=='none'&&cs.visibility!=='hidden';
      }catch{return true}
    });
  }

  function findStandalonePin(root,button,address){
    const candidates=iconCandidates(root,button);
    let addressRect=null,buttonRect=null;
    try{addressRect=address?.getBoundingClientRect?.()||null}catch{}
    try{buttonRect=button.getBoundingClientRect()}catch{}

    let best=null,bestScore=-Infinity;
    for(const el of candidates){
      let r;try{r=el.getBoundingClientRect()}catch{continue}
      if(!r||!r.width||!r.height)continue;
      if(r.width>90||r.height>90)continue;

      let score=0;
      const sig=clean([
        el.className?.baseVal||el.className||'',
        el.getAttribute?.('data-icon')||'',
        el.getAttribute?.('aria-label')||'',
        el.getAttribute?.('title')||''
      ].join(' ')).toLowerCase();
      if(/map-marker|location|marker|map-pin/.test(sig))score+=420;

      if(addressRect){
        const vertical=addressRect.top-r.bottom;
        if(vertical< -15||vertical>170)continue;
        score+=260-Math.abs(vertical)*1.7;
        const dx=Math.abs((r.left+r.right)/2-(addressRect.left+addressRect.right)/2);
        score+=Math.max(0,160-dx*1.5);
      }else if(buttonRect){
        const vertical=buttonRect.top-r.bottom;
        if(vertical<20||vertical>280)continue;
        score+=180-Math.abs(vertical-90);
      }

      if(r.width>=12&&r.width<=55&&r.height>=12&&r.height<=60)score+=60;
      if(score>bestScore){bestScore=score;best=el}
    }
    return best;
  }

  function replaceStandalonePin(button){
    if(!isMapLink(button))return false;
    const root=eventRootFromButton(button);
    if(!root)return false;
    const address=findAddress(root,button);
    const pin=findStandalonePin(root,button,address);
    if(!pin)return false;

    let host=pin;
    if(pin.matches('i,svg')){
      host=pin.parentElement||pin;
    }

    if(host.getAttribute?.('data-dini-event-map-pin-runtime')===VERSION)return true;

    let color='';
    try{color=getComputedStyle(pin).color||getComputedStyle(host).color||''}catch{}

    host.textContent='';
    host.appendChild(iconSvg());
    host.setAttribute('data-dini-event-map-pin-runtime',VERSION);
    host.setAttribute('data-native-icon-role','location');
    host.setAttribute('aria-hidden','true');
    host.style.setProperty('display','inline-flex');
    host.style.setProperty('align-items','center');
    host.style.setProperty('justify-content','center');
    host.style.setProperty('line-height','1');
    host.style.setProperty('width','auto');
    host.style.setProperty('height','auto');
    if(color)host.style.setProperty('color',color);

    button.setAttribute('data-dini-map-button-preserved','1');
    return true;
  }

  function scan(root=document){
    let count=0;
    const buttons=[
      ...(root.matches?.('a,button,[role="button"]')?[root]:[]),
      ...(root.querySelectorAll?.('a,button,[role="button"]')||[])
    ].filter(isMapLink);

    for(const button of buttons){
      if(replaceStandalonePin(button))count++;
    }
    const total=document.querySelectorAll('[data-dini-event-map-pin-runtime]').length;
    if(total)document.documentElement.setAttribute('data-dini-event-map-pin-count',String(total));
    return count;
  }

  scan();

  let observer=null;
  let stopTimer=0;
  const rescan=()=>{
    scan();
    clearTimeout(stopTimer);
    stopTimer=setTimeout(()=>{observer?.disconnect();observer=null},1600);
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
  [120,450,900,1600,2800,4200].forEach(ms=>setTimeout(rescan,ms));
  stopTimer=setTimeout(()=>{observer?.disconnect();observer=null},5200);

  document.documentElement.setAttribute('data-dini-map-icon-runtime',VERSION);
  window.DINI_MAP_ICON_RUNTIME_V1={version:VERSION,scan,replaceStandalonePin};
})();