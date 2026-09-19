(()=>{
  'use strict';
  if(window.DINI_MAP_ICON_RUNTIME_V1?.version)return;

  const VERSION='1.0.0';
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
    svg.setAttribute('width','15');
    svg.setAttribute('height','15');
    svg.setAttribute('fill','none');
    svg.setAttribute('stroke','currentColor');
    svg.setAttribute('stroke-width','2');
    svg.setAttribute('stroke-linecap','round');
    svg.setAttribute('stroke-linejoin','round');
    svg.setAttribute('aria-hidden','true');
    svg.setAttribute('focusable','false');
    svg.setAttribute('data-dini-map-pin-svg','lucide');
    svg.style.cssText='display:block;width:1em;height:1em;min-width:1em;flex:none;overflow:visible';

    const path=document.createElementNS(ns,'path');
    path.setAttribute('d','M20 10c0 5-5.5 11-7.4 12.9a1 1 0 0 1-1.2 0C9.5 21 4 15 4 10a8 8 0 1 1 16 0');
    const circle=document.createElementNS(ns,'circle');
    circle.setAttribute('cx','12');
    circle.setAttribute('cy','10');
    circle.setAttribute('r','3');
    svg.append(path,circle);
    return svg;
  };

  function replaceIcon(button){
    if(!isMapLink(button))return false;
    if(button.getAttribute('data-dini-map-icon-runtime')===VERSION)return true;

    const buttonText=button.querySelector('.elementor-button-text');
    let host=button.querySelector('.elementor-button-icon');
    if(!host){
      host=document.createElement('span');
      host.className='elementor-button-icon';
      host.setAttribute('aria-hidden','true');
      if(buttonText?.parentNode)buttonText.parentNode.insertBefore(host,buttonText);
      else button.insertBefore(host,button.firstChild);
    }

    // Replace only the decorative icon container. Text, link and authored
    // button styling stay source-native.
    host.textContent='';
    host.appendChild(iconSvg());
    host.style.setProperty('display','inline-flex');
    host.style.setProperty('align-items','center');
    host.style.setProperty('justify-content','center');
    host.style.setProperty('font-size','1em');
    host.style.setProperty('line-height','1');
    host.style.setProperty('vertical-align','middle');
    host.style.setProperty('margin-right','5px');

    button.setAttribute('data-dini-map-icon-runtime',VERSION);
    button.setAttribute('data-native-icon-role','location');
    return true;
  }

  function scan(root=document){
    let count=0;
    const candidates=[
      ...(root.matches?.('a,button,[role="button"]')?[root]:[]),
      ...(root.querySelectorAll?.('a,button,[role="button"]')||[])
    ];
    for(const button of candidates){
      if(replaceIcon(button))count++;
    }
    if(count){
      document.documentElement.setAttribute('data-dini-map-icon-count',
        String(document.querySelectorAll('[data-dini-map-icon-runtime]').length));
    }
    return count;
  }

  scan();

  let observer=null;
  let timer=0;
  const settle=()=>{
    scan();
    clearTimeout(timer);
    timer=setTimeout(()=>{
      observer?.disconnect();
      observer=null;
    },1400);
  };
  observer=new MutationObserver(mutations=>{
    for(const mutation of mutations){
      for(const node of mutation.addedNodes||[]){
        if(node?.nodeType===1)scan(node);
      }
    }
    clearTimeout(timer);
    timer=setTimeout(()=>{
      observer?.disconnect();
      observer=null;
    },1400);
  });
  try{observer.observe(document.body||document.documentElement,{childList:true,subtree:true})}catch{}
  timer=setTimeout(()=>{observer?.disconnect();observer=null},5000);
  [120,450,1000,2200,4200].forEach(ms=>setTimeout(settle,ms));

  document.documentElement.setAttribute('data-dini-map-icon-runtime',VERSION);
  window.DINI_MAP_ICON_RUNTIME_V1={version:VERSION,scan,replaceIcon};
})();