(()=>{
  'use strict';
  if(window.DINI_RAMAH_TAMAH_RUNTIME_V1?.version)return;

  const VERSION='1.0.0';
  const EVENT={
    title:'Ramah Tamah',
    date:'KAMIS, 24 SEPTEMBER 2026',
    time:'SELERA ANDA',
    dini:{
      address:'Dukuh Madureso, Sidorejo, Warungasem, Batang',
      maps:'https://maps.app.goo.gl/gbu377WKqwHDLD3h7'
    },
    faqih:{
      address:'Kertoharjo Gang 10',
      maps:'https://maps.app.goo.gl/5aj8aQhKqa7z9xi76'
    }
  };

  const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
  const lower=v=>clean(v).toLowerCase();
  const cfg=(()=>{
    try{
      const el=document.getElementById('diniGuestRuntimeData');
      return el?JSON.parse(el.textContent||'{}'):{};
    }catch{return{}}
  })();
  const side=lower(cfg.ramah_tamah_side);
  const location=EVENT[side];

  document.documentElement.setAttribute('data-dini-ramah-tamah-runtime',VERSION);
  document.documentElement.setAttribute('data-dini-ramah-tamah-side',side||'unassigned');

  if(!location){
    document.documentElement.setAttribute('data-dini-ramah-tamah','unassigned');
    window.DINI_RAMAH_TAMAH_RUNTIME_V1={version:VERSION,side:'',event:EVENT};
    return;
  }

  function exactTextNode(label){
    const target=lower(label);
    const selector='h1,h2,h3,h4,h5,h6,p,span,strong,b,div,a';
    const nodes=[...document.querySelectorAll(selector)];
    for(const el of nodes){
      if(lower(el.textContent)!==target)continue;
      const ownsExact=[...el.children].some(child=>lower(child.textContent)===target);
      if(!ownsExact)return el;
    }
    return null;
  }

  function hasMap(root){
    return [...root.querySelectorAll('a[href]')].some(a=>
      /google\s*maps?/i.test(clean(a.textContent))||
      /maps\.(?:app\.goo\.gl|google\.)|google\.com\/maps|goo\.gl\/maps/i.test(String(a.getAttribute('href')||''))
    );
  }

  function eventRoot(label){
    const candidates=[];
    let node=label;
    for(let depth=0;node&&node!==document.body&&depth<14;depth++,node=node.parentElement){
      const text=clean(node.textContent);
      if(!/\bresepsi\b/i.test(text))continue;
      if(/akad\s+nikah/i.test(text))continue;
      if(!/25\s+september\s+2026/i.test(text))continue;
      if(!hasMap(node))continue;
      if(text.length>4200)continue;
      candidates.push(node);
    }
    if(!candidates.length)return label.closest('.elementor-section,section,.elementor-widget')||null;

    const topSection=[...candidates].reverse().find(el=>
      el.matches?.('.elementor-top-section,section.elementor-section,section')
    );
    return topSection||candidates[candidates.length-1];
  }

  function replaceTextNodes(root){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);

    for(const node of nodes){
      const raw=String(node.nodeValue||'');
      const normalized=clean(raw);
      if(!normalized)continue;

      let next=raw;
      next=next.replace(/\bResepsi\b/gi,EVENT.title);
      next=next.replace(/JUMAT\s*,?\s*25\s+SEPTEMBER\s+2026/gi,EVENT.date);
      next=next.replace(/25\s+SEPTEMBER\s+2026/gi,'24 SEPTEMBER 2026');
      next=next.replace(/13[.:]00\s*WIB\s*(?:-|–|—)?\s*SELESAI/gi,EVENT.time);
      next=next.replace(/13[.:]00\s*WIB/gi,EVENT.time);
      next=next.replace(/^\s*(?:-|–|—)\s*SELESAI\s*$/gi,'');
      next=next.replace(/Google\s+Map\b/gi,'Google Maps');

      if(next!==raw)node.nodeValue=next;
    }

    const addressCandidates=[...root.querySelectorAll('p,div,span,h1,h2,h3,h4,h5,h6')].filter(el=>{
      const t=lower(el.textContent);
      if(!t)return false;
      const childMatches=[...el.children].some(child=>{
        const c=lower(child.textContent);
        return c.includes('madureso')||c.includes('warungasem');
      });
      return !childMatches&&(t.includes('madureso')||t.includes('warungasem'));
    });
    if(addressCandidates.length){
      addressCandidates.sort((a,b)=>clean(a.textContent).length-clean(b.textContent).length);
      const target=addressCandidates[0];
      if(clean(target.textContent).length<320)target.textContent=location.address;
    }

    for(const a of root.querySelectorAll('a[href]')){
      const txt=clean(a.textContent);
      const href=String(a.getAttribute('href')||'');
      if(/google\s*maps?/i.test(txt)||/maps\.(?:app\.goo\.gl|google\.)|google\.com\/maps|goo\.gl\/maps/i.test(href)){
        a.setAttribute('href',location.maps);
        a.setAttribute('target','_blank');
        a.setAttribute('rel','noopener');
        a.setAttribute('aria-label','Google Maps');
        const textWalker=document.createTreeWalker(a,NodeFilter.SHOW_TEXT);
        const textNodes=[];
        while(textWalker.nextNode())textNodes.push(textWalker.currentNode);
        for(const tn of textNodes){
          if(/google\s+map/i.test(String(tn.nodeValue||''))){
            tn.nodeValue=String(tn.nodeValue||'').replace(/Google\s+Map(?:s)?/gi,'Google Maps');
          }
        }
      }
    }
  }

  function revealClone(root){
    root.querySelectorAll('.elementor-invisible').forEach(el=>el.classList.remove('elementor-invisible'));
    root.classList?.remove('elementor-invisible');
    root.querySelectorAll('[style*="visibility:hidden"],[style*="opacity: 0"],[style*="opacity:0"]').forEach(el=>{
      if(el.style.visibility==='hidden')el.style.removeProperty('visibility');
      if(el.style.opacity==='0')el.style.removeProperty('opacity');
    });
  }

  function install(){
    const existing=document.querySelector('[data-dini-ramah-tamah-event="1"]');
    if(existing)return true;

    const label=exactTextNode('Resepsi');
    if(!label)return false;
    const source=eventRoot(label);
    if(!source?.parentNode)return false;

    const clone=source.cloneNode(true);
    clone.setAttribute('data-dini-ramah-tamah-event','1');
    clone.setAttribute('data-dini-ramah-tamah-side',side);
    replaceTextNodes(clone);
    revealClone(clone);

    source.parentNode.insertBefore(clone,source.nextSibling);
    document.documentElement.setAttribute('data-dini-ramah-tamah','ready');
    document.documentElement.setAttribute('data-dini-ramah-tamah-source','resepsi-clone');
    return true;
  }

  let observer=null;
  const settle=()=>{
    if(install()){
      observer?.disconnect();
      observer=null;
      return true;
    }
    return false;
  };

  if(!settle()){
    observer=new MutationObserver(()=>settle());
    try{observer.observe(document.body||document.documentElement,{childList:true,subtree:true})}catch{}
    [120,400,900,1800,3200].forEach(ms=>setTimeout(settle,ms));
    setTimeout(()=>{observer?.disconnect();observer=null},5000);
  }

  window.DINI_RAMAH_TAMAH_RUNTIME_V1={
    version:VERSION,
    side,
    event:EVENT,
    install:settle
  };
})();