(()=>{
  'use strict';
  if(window.DINI_RAMAH_TAMAH_RUNTIME_V1?.version)return;

  const VERSION='1.1.0';
  const EVENT={
    title:'Ramah Tamah',
    date:'KAMIS, 24 SEPTEMBER 2026',
    time:'SELERA ANDA',
    dini:{
      label:'Dini',
      address:'Dukuh Madureso, Sidorejo, Warungasem, Batang',
      maps:'https://maps.app.goo.gl/gbu377WKqwHDLD3h7'
    },
    faqih:{
      label:'Faqih',
      address:'Kertoharjo Gang 10',
      maps:'https://maps.app.goo.gl/5aj8aQhKqa7z9xi76'
    }
  };

  const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
  const lower=v=>clean(v).toLowerCase();
  const guestDataEl=document.getElementById('diniGuestRuntimeData');
  const cfg=(()=>{
    try{return guestDataEl?JSON.parse(guestDataEl.textContent||'{}'):{}}
    catch{return{}}
  })();
  const isGuest=!!guestDataEl;
  const guestSide=lower(cfg.ramah_tamah_side);

  document.documentElement.setAttribute('data-dini-ramah-tamah-runtime',VERSION);
  document.documentElement.setAttribute('data-dini-ramah-tamah-mode',isGuest?'guest':'public');
  document.documentElement.setAttribute('data-dini-ramah-tamah-side',guestSide||'unassigned');

  if(isGuest&&!EVENT[guestSide]){
    document.documentElement.setAttribute('data-dini-ramah-tamah','unassigned');
    window.DINI_RAMAH_TAMAH_RUNTIME_V1={
      version:VERSION,
      mode:'guest',
      side:'',
      event:EVENT
    };
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

  function replaceTextNodes(root,side,title){
    const location=EVENT[side];
    if(!location)return;

    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);

    for(const node of nodes){
      const raw=String(node.nodeValue||'');
      const normalized=clean(raw);
      if(!normalized)continue;

      let next=raw;
      next=next.replace(/\bResepsi\b/gi,title);
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
        a.setAttribute('aria-label','Google Maps '+location.label);
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
    const hidden=[root,...root.querySelectorAll('.elementor-invisible')];
    for(const el of hidden){
      const wasInvisible=el.classList?.contains('elementor-invisible');
      el.classList?.remove('elementor-invisible');
      if(wasInvisible&&el.style?.visibility==='hidden')el.style.removeProperty('visibility');
      if(wasInvisible&&el.style?.opacity==='0')el.style.removeProperty('opacity');
    }
  }

  function makeClone(source,side,title,index){
    const clone=source.cloneNode(true);
    clone.setAttribute('data-dini-ramah-tamah-event','1');
    clone.setAttribute('data-dini-ramah-tamah-side',side);
    clone.setAttribute('data-dini-ramah-tamah-index',String(index));
    replaceTextNodes(clone,side,title);
    revealClone(clone);
    return clone;
  }

  function installGuest(source){
    if(document.querySelector('[data-dini-ramah-tamah-event="1"]'))return true;
    const clone=makeClone(source,guestSide,EVENT.title,1);
    source.parentNode.insertBefore(clone,source.nextSibling);
    document.documentElement.setAttribute('data-dini-ramah-tamah','ready');
    document.documentElement.setAttribute('data-dini-ramah-tamah-count','1');
    return true;
  }

  function installPublic(source){
    const existing=[...document.querySelectorAll('[data-dini-ramah-tamah-event="1"]')];
    if(existing.length>=2)return true;
    existing.forEach(el=>el.remove());

    const dini=makeClone(source,'dini',EVENT.title+' Dini',1);
    const faqih=makeClone(source,'faqih',EVENT.title+' Faqih',2);
    source.parentNode.insertBefore(dini,source.nextSibling);
    source.parentNode.insertBefore(faqih,dini.nextSibling);

    document.documentElement.setAttribute('data-dini-ramah-tamah','ready');
    document.documentElement.setAttribute('data-dini-ramah-tamah-count','2');
    document.documentElement.setAttribute('data-dini-ramah-tamah-public-order','dini,faqih');
    return true;
  }

  function install(){
    const label=exactTextNode('Resepsi');
    if(!label)return false;
    const source=eventRoot(label);
    if(!source?.parentNode)return false;

    const ok=isGuest?installGuest(source):installPublic(source);
    if(ok)document.documentElement.setAttribute('data-dini-ramah-tamah-source','resepsi-clone');
    return ok;
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
    mode:isGuest?'guest':'public',
    side:guestSide,
    event:EVENT,
    install:settle
  };
})();