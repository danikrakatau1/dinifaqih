(()=>{
  const frame=document.getElementById('previewFrame');
  if(!frame)return;
  const toolbar=document.querySelector('.preview-toolbar');
  let badge=document.getElementById('frameDiagV2274');
  if(!badge&&toolbar){
    badge=document.createElement('span');
    badge.id='frameDiagV2274';
    badge.style.cssText='margin-left:10px;padding:2px 7px;border:1px solid #a97819;border-radius:999px;color:#f7b733;font:700 10px/1.4 ui-monospace,monospace;white-space:nowrap';
    badge.textContent='FRAME v2274 · WAIT';
    toolbar.appendChild(badge);
  }

  const short=(el)=>{
    if(!el)return '-';
    const id=el.id?'#'+el.id:'';
    const cls=typeof el.className==='string'&&el.className.trim()?'.'+el.className.trim().split(/\s+/).slice(0,2).join('.'):'';
    return (el.tagName||'?').toLowerCase()+id+cls;
  };

  function stabilize(){
    let d,w;
    try{d=frame.contentDocument;w=d?.defaultView}catch{}
    if(!d?.body||!w){if(badge)badge.textContent='FRAME v2274 · NO-DOC';return null}

    const root=d.documentElement,body=d.body;
    let style=d.getElementById('dini-force-visible-v2274');
    if(!style){
      style=d.createElement('style');style.id='dini-force-visible-v2274';
      style.textContent=`
        html,body{visibility:visible!important;opacity:1!important}
        [data-native-reveal],.elementor-invisible{visibility:visible!important;opacity:1!important}
        [data-native-reveal]{transform:none!important}
        #wptime-plugin-preloader,.wptime-plugin-preloader,.preloader,.preloader-plus,.page-loader,.page-loading,.loading-screen,.loader-wrapper,.e-page-transition,.animsition-loading,.pace,.pace-active,[id*="preloader" i],[class*="preloader" i]{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}
      `;
      (d.head||root).appendChild(style);
    }

    for(const el of [root,body]){
      el.style.setProperty('display',el===body?'block':'','important');
      el.style.setProperty('visibility','visible','important');
      el.style.setProperty('opacity','1','important');
      [...el.classList].filter(c=>/(loading|preload|preloader|locked)/i.test(c)).forEach(c=>el.classList.remove(c));
    }
    d.querySelectorAll('.e-con.e-parent').forEach(el=>el.classList.add('e-lazyloaded'));
    d.querySelectorAll('.elementor-invisible,[data-native-reveal]').forEach(el=>{
      el.classList.remove('elementor-invisible');el.classList.add('native-visible');
      el.style.setProperty('visibility','visible','important');el.style.setProperty('opacity','1','important');
      if(el.hasAttribute('data-native-reveal'))el.style.setProperty('transform','none','important');
    });

    const opener=[...d.querySelectorAll('[data-native-open],#tombolbuka,.tombolbuka,#openInvitation,[data-open-invitation],[data-action="open-invitation"],a,button,[role="button"]')].find(el=>el.matches('[data-native-open],#tombolbuka,.tombolbuka,#openInvitation,[data-open-invitation],[data-action="open-invitation"]')||/\b(buka\s+undangan|open\s+invitation)\b/i.test((el.textContent||'').replace(/\s+/g,' ').trim()));
    const firstMeaningful=d.querySelector('[data-native-edit-id],[data-native-edit-ids],h1,h2,h3,p,img,a,button');
    const cover=d.querySelector('#cover,.cover,[data-cover]')||opener?.closest?.('.elementor-top-section,section,[data-element_type="section"]')||firstMeaningful?.closest?.('.elementor-top-section,section,[data-element_type="section"]')||d.querySelector('.elementor-top-section,body>section');

    if(cover){
      for(let el=cover;el&&el!==body;el=el.parentElement){
        let cs;try{cs=w.getComputedStyle(el)}catch{continue}
        if(cs.display==='none')el.style.setProperty('display','block','important');
        el.style.setProperty('visibility','visible','important');el.style.setProperty('opacity','1','important');
      }
      cover.hidden=false;cover.removeAttribute('aria-hidden');
      cover.style.setProperty('visibility','visible','important');cover.style.setProperty('opacity','1','important');
      cover.querySelectorAll('*').forEach(el=>{let cs;try{cs=w.getComputedStyle(el)}catch{return}if(cs.visibility==='hidden')el.style.setProperty('visibility','visible','important');if(Number(cs.opacity||1)===0)el.style.setProperty('opacity','1','important')});
    }
    if(opener){
      opener.classList.remove('elementor-invisible');opener.classList.add('native-visible','btnVisibleAfterLoad');
      opener.style.setProperty('display','inline-flex','important');opener.style.setProperty('visibility','visible','important');opener.style.setProperty('opacity','1','important');opener.style.setProperty('transform','none','important');opener.style.setProperty('pointer-events','auto','important');
    }

    const removed=new Set(),vw=Math.max(1,w.innerWidth||body.clientWidth||1),vh=Math.max(1,w.innerHeight||body.clientHeight||1);
    const loaderSel='#wptime-plugin-preloader,.wptime-plugin-preloader,.preloader,.preloader-plus,.page-loader,.page-loading,.loading-screen,.loader-wrapper,.e-page-transition,.animsition-loading,.pace,.pace-active,[id*="preloader" i],[class*="preloader" i]';
    d.querySelectorAll(loaderSel).forEach(el=>{el.style.setProperty('display','none','important');removed.add(el)});
    d.querySelectorAll('body *').forEach(el=>{
      if(removed.has(el)||el===cover||cover?.contains?.(el))return;
      let cs,r;try{cs=w.getComputedStyle(el);r=el.getBoundingClientRect()}catch{return}
      const z=parseInt(cs.zIndex||'0',10)||0,area=(r.width*r.height)/(vw*vh),sig=((el.id||'')+' '+(typeof el.className==='string'?el.className:'')).toLowerCase();
      if(/(preload|loader|loading|page-transition|splash|pace)/.test(sig)&&area>.45&&(cs.position==='fixed'||cs.position==='absolute'||z>100)){el.style.setProperty('display','none','important');removed.add(el);return}
      const m=String(cs.backgroundColor||'').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/i);
      const white=m&&Number(m[1])>244&&Number(m[2])>244&&Number(m[3])>244&&Number(m[4]??1)>.92;
      const empty=(el.textContent||'').trim().length<2&&!el.querySelector('img,video,canvas,svg');
      if(white&&empty&&area>.82&&z>500&&(cs.position==='fixed'||cs.position==='absolute')){el.style.setProperty('display','none','important');removed.add(el)}
    });

    const meaningful=[...d.querySelectorAll('h1,h2,h3,h4,p,a,button,img,video,[data-native-edit-id],[data-native-edit-ids]')];
    const visible=meaningful.filter(el=>{try{const cs=w.getComputedStyle(el),r=el.getBoundingClientRect();return cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity||1)>.01&&r.width>2&&r.height>2}catch{return false}});
    const brokenImgs=[...d.images].filter(img=>img.complete&&img.naturalWidth===0).length;
    let center=[];try{center=d.elementsFromPoint(vw/2,Math.min(vh/2,400)).slice(0,3).map(short)}catch{}
    const info={dom:meaningful.length,vis:visible.length,block:removed.size,imgFail:brokenImgs,scroll:body.scrollHeight,cover:short(cover),top:center.join('>')};
    root.setAttribute('data-dini-editor-force-visible','v2274');
    root.setAttribute('data-dini-editor-visible-count',String(info.vis));
    root.setAttribute('data-dini-editor-blockers-removed',String(info.block));
    window.__DINI_FRAME_DIAG_V2274=info;
    if(badge){badge.textContent=`FRAME v2274 · DOM ${info.dom} · VIS ${info.vis} · BLOCK ${info.block} · IMG! ${info.imgFail}`;badge.title=`scroll=${info.scroll} cover=${info.cover} center=${info.top}`}
    return info;
  }

  function burst(){[0,40,120,350,800,1600,3000].forEach(ms=>setTimeout(()=>{try{stabilize()}catch(e){console.warn('FRAME_DIAG_V2274',e);if(badge)badge.textContent='FRAME v2274 · ERR'}},ms))}
  frame.addEventListener('load',burst,true);
  const attrObs=new MutationObserver(()=>{if(frame.hasAttribute('srcdoc')||frame.getAttribute('src'))burst()});
  attrObs.observe(frame,{attributes:true,attributeFilter:['src','srcdoc']});
  burst();
})();
