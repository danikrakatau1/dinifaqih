(()=>{
  'use strict';
  if(window.DINI_MOTION_SECTION_SEQUENCE_V1?.version)return;

  const VERSION='1.0.0';
  const section=document.querySelector('.motionSection');
  const motionText=section?.querySelector('.motionText');
  const frame=motionText?.querySelector('.delay-image');
  const opener=document.querySelector('#tombolbuka,.tombolbuka');

  if(!section||!motionText||!frame){
    window.DINI_MOTION_SECTION_SEQUENCE_V1={version:VERSION,active:false};
    return;
  }

  const headings=[...motionText.querySelectorAll('.elementor-widget-heading')].slice(0,3);
  if(!headings.length){
    window.DINI_MOTION_SECTION_SEQUENCE_V1={version:VERSION,active:false};
    return;
  }

  const style=document.createElement('style');
  style.id='diniMotionSectionSequenceStyle';
  style.textContent=`
    [data-dini-motion-seq-text="1"]{
      opacity:0!important;
      visibility:hidden!important;
      animation:none!important;
      -webkit-animation:none!important;
    }
  `;
  (document.head||document.documentElement).appendChild(style);

  let released=false;
  let frameStarted=false;
  let clicked=false;
  let fallbackTimer=0;

  const settings=el=>{
    try{return JSON.parse(el.getAttribute('data-settings')||'{}')||{}}
    catch{return{}}
  };
  const isMobile=()=>{
    try{return matchMedia('(max-width:767px)').matches}catch{return innerWidth<=767}
  };
  const animationFor=el=>{
    const s=settings(el);
    const mobile=String(s._animation_mobile||'').trim();
    const desktop=String(s._animation||'').trim();
    const selected=(isMobile()&&mobile&&mobile!=='none')?mobile:desktop;
    return selected&&selected!=='none'?selected:'fadeInUp';
  };
  const delayFor=el=>{
    const n=Number(settings(el)._animation_delay);
    return Number.isFinite(n)?n:0;
  };

  function lockHeadings(){
    for(const el of headings){
      el.setAttribute('data-dini-motion-seq-text','1');
      el.classList.add('elementor-invisible');
    }
    document.documentElement.setAttribute('data-dini-motion-sequence',VERSION);
  }

  function restartHeading(el,wait){
    setTimeout(()=>{
      if(!el?.isConnected)return;
      const anim=animationFor(el);
      el.classList.remove('animated','fadeInUp','fadeInDown','fadeInLeft','fadeInRight','zoomIn','zoomOut','bounceIn');
      // Force a clean animation restart after the frame has finished.
      void el.offsetWidth;
      el.removeAttribute('data-dini-motion-seq-text');
      el.classList.remove('elementor-invisible');
      el.classList.add('animated',anim);
      el.setAttribute('data-dini-motion-seq-released',anim);
    },Math.max(0,wait));
  }

  function releaseHeadings(reason='frame-finished'){
    if(released)return;
    released=true;
    if(fallbackTimer)clearTimeout(fallbackTimer);

    const delays=headings.map(delayFor);
    const nonZero=delays.filter(n=>n>0);
    const base=nonZero.length?Math.min(...nonZero):0;

    headings.forEach((el,index)=>{
      const sourceDelay=delays[index]||base;
      // Source values differ by only ~30ms here. Preserve that relative order,
      // but anchor the whole text group after the frame entrance completes.
      restartHeading(el,Math.max(0,sourceDelay-base));
    });

    document.documentElement.setAttribute('data-dini-motion-sequence-released',reason);
  }

  function armFrameFinish(){
    if(frameStarted||released)return;
    frameStarted=true;
    document.documentElement.setAttribute('data-dini-motion-frame-started','1');

    const animations=()=>{
      try{return frame.getAnimations?.()||[]}catch{return[]}
    };
    const active=animations();
    if(active.length){
      Promise.allSettled(active.map(a=>a.finished)).then(()=>releaseHeadings('frame-animation-finished'));
    }

    // Elementor normal entrance is roughly 1s; this is only a safety fallback
    // in case animationend is swallowed by the compatibility runtime.
    setTimeout(()=>releaseHeadings('frame-animation-fallback'),1250);
  }

  frame.addEventListener('animationstart',armFrameFinish,true);
  frame.addEventListener('animationend',()=>releaseHeadings('frame-animationend'),true);

  const mo=new MutationObserver(()=>{
    if(released)return;
    const visible=!frame.classList.contains('elementor-invisible');
    const animated=frame.classList.contains('animated')||
      /zoomIn|fadeIn|bounceIn/.test(frame.className||'');
    if(visible&&animated)armFrameFinish();
  });
  mo.observe(frame,{attributes:true,attributeFilter:['class','style']});

  function onOpen(){
    if(clicked)return;
    clicked=true;
    lockHeadings();
    // Long guard only after the invitation is opened. It prevents a permanent
    // text lock if a browser skips the frame animation entirely.
    fallbackTimer=setTimeout(()=>releaseHeadings('open-safety-timeout'),14000);
  }

  lockHeadings();
  if(opener)opener.addEventListener('click',onOpen,{capture:true,once:true});
  else onOpen();

  window.DINI_MOTION_SECTION_SEQUENCE_V1={
    version:VERSION,
    active:true,
    release:releaseHeadings,
    get released(){return released},
    get frameStarted(){return frameStarted}
  };
})();