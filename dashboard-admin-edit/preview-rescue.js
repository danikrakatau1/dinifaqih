(()=>{
  if(new URLSearchParams(location.search).get('handoff')==='1')return;
  'use strict';
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  const visibleCount=doc=>{
    try{
      return [...doc.body.querySelectorAll('*')].filter(el=>{
        if(el.matches('script,style,link,meta,source'))return false;
        const cs=doc.defaultView.getComputedStyle(el),r=el.getBoundingClientRect();
        return cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity||1)>.01&&r.width>2&&r.height>2;
      }).length;
    }catch{return 0}
  };

  const revealBox=el=>{
    if(!el)return;
    try{
      el.hidden=false;el.removeAttribute('hidden');el.removeAttribute('aria-hidden');
      const cs=el.ownerDocument.defaultView.getComputedStyle(el);
      if(cs.display==='none')el.style.setProperty('display',el.matches('.elementor-container,.elementor-row')?'flex':'block','important');
      if(cs.visibility==='hidden')el.style.setProperty('visibility','visible','important');
      if(Number(cs.opacity||1)<=.01)el.style.setProperty('opacity','1','important');
      if((el.getBoundingClientRect()?.height||0)<2)el.style.setProperty('min-height','100vh','important');
      el.classList.remove('elementor-invisible');
    }catch{}
  };

  const rescue=()=>{
    let doc;try{doc=frame.contentDocument}catch{return false}
    if(!doc?.body)return false;
    if(visibleCount(doc)>0)return true;

    const html=doc.documentElement,body=doc.body;
    revealBox(html);revealBox(body);
    html.style.setProperty('visibility','visible','important');
    html.style.setProperty('opacity','1','important');
    body.style.setProperty('visibility','visible','important');
    body.style.setProperty('opacity','1','important');

    const allButtons=[...doc.querySelectorAll('[data-native-open],#tombolbuka,.tombolbuka,a,button,[role="button"],.elementor-widget-button')];
    let opener=allButtons.find(el=>el.matches('[data-native-open],#tombolbuka,.tombolbuka'));
    if(!opener)opener=allButtons.find(el=>/\b(buka\s+undangan|open\s+invitation)\b/i.test((el.textContent||'').replace(/\s+/g,' ').trim()));
    if(opener&&!opener.matches('a,button,[role="button"]'))opener=opener.querySelector('a,button,[role="button"]')||opener;

    let cover=doc.querySelector('#cover,.cover,[data-cover]');
    if(!cover&&opener)cover=opener.closest('.elementor-top-section,.elementor-section,section,[data-element_type="section"]');
    if(!cover)cover=doc.querySelector('.elementor-top-section,.elementor-section,body>section,section');

    // Restore the selected template's initial viewport only. Do not auto-open the invitation.
    if(cover){
      const chain=[];let n=cover;while(n&&n!==body){chain.push(n);n=n.parentElement}chain.reverse().forEach(revealBox);revealBox(cover);
      cover.querySelectorAll('.elementor-invisible').forEach(el=>el.classList.remove('elementor-invisible'));
      cover.querySelectorAll('[data-native-reveal]').forEach(el=>{el.classList.add('native-visible');el.style.setProperty('visibility','visible','important');el.style.setProperty('opacity','1','important')});
    }
    if(opener){
      let n=opener;while(n&&n!==body){revealBox(n);n=n.parentElement}
      opener.classList.remove('elementor-invisible');
      opener.style.setProperty('visibility','visible','important');
      opener.style.setProperty('opacity','1','important');
      opener.style.setProperty('pointer-events','auto','important');
    }

    // Some imported Elementor sources leave a full-page preloader/loader above the real cover after source JS is stripped.
    doc.querySelectorAll('[class*="preloader"],[id*="preloader"],[class*="page-loader"],[id*="page-loader"],[class*="loading-screen"]').forEach(el=>{
      if(el===cover||cover?.contains(el))return;
      try{const cs=doc.defaultView.getComputedStyle(el);if(/fixed|absolute/.test(cs.position)&&Number(cs.zIndex||0)>10)el.style.setProperty('display','none','important')}catch{}
    });

    doc.documentElement.setAttribute('data-dini-editor-preview-rescued','1');
    try{window.dispatchEvent(new CustomEvent('dini-editor-preview-rescued',{detail:{template:new URLSearchParams(location.search).get('template')||''}}))}catch{}
    return visibleCount(doc)>0;
  };

  const schedule=()=>[80,250,700,1500,3000].forEach(ms=>setTimeout(()=>{
    try{if(!visibleCount(frame.contentDocument))rescue()}catch{}
  },ms));
  frame.addEventListener('load',schedule);
  new MutationObserver(()=>{
    try{if(frame.srcdoc&&!visibleCount(frame.contentDocument))schedule()}catch{}
  }).observe(frame,{attributes:true,attributeFilter:['src','srcdoc']});
  schedule();
})();
