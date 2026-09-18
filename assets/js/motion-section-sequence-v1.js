(()=>{
  'use strict';
  if(window.DINI_MOTION_SECTION_SEQUENCE_V1?.version)return;

  const VERSION='1.1.0';
  const section=document.querySelector('.motionSection');
  const motionText=section?.querySelector('.motionText');
  const frame=motionText?.querySelector('.delay-image');
  const headings=[...motionText?.querySelectorAll?.('.elementor-widget-heading')||[]].slice(0,3);
  const video=section?.querySelector('.elementor-background-video-container video');
  const opener=document.querySelector('#tombolbuka,.tombolbuka');

  if(!section||!motionText||!frame||!headings.length){
    window.DINI_MOTION_SECTION_SEQUENCE_V1={version:VERSION,active:false};
    return;
  }

  const style=document.createElement('style');
  style.id='diniMotionSectionSequenceStyle';
  style.textContent=`
    .motionText[data-dini-motion-seq-hold="1"]{
      opacity:0!important;
      visibility:hidden!important;
      pointer-events:none!important;
    }
    .motionText[data-dini-motion-seq-hold="1"] .delay-image,
    .motionText[data-dini-motion-seq-hold="1"] .elementor-widget-heading{
      animation:none!important;
      -webkit-animation:none!important;
    }
  `;
  (document.head||document.documentElement).appendChild(style);

  let released=false;
  let clicked=false;
  let fallbackTimer=0;
  let pollTimer=0;

  const settings=el=>{
    try{return JSON.parse(el.getAttribute('data-settings')||'{}')||{}}
    catch{return{}}
  };
  const isMobile=()=>{
    try{return matchMedia('(max-width:767px)').matches}catch{return innerWidth<=767}
  };
  const animationFor=(el,fallback='fadeInUp')=>{
    const s=settings(el);
    const mobile=String(s._animation_mobile||'').trim();
    const desktop=String(s._animation||'').trim();
    const selected=(isMobile()&&mobile&&mobile!=='none')?mobile:desktop;
    return selected&&selected!=='none'?selected:fallback;
  };
  const delayFor=el=>{
    const n=Number(settings(el)._animation_delay);
    return Number.isFinite(n)?n:0;
  };

  function stripAnimation(el){
    if(!el)return;
    el.classList.remove(
      'animated','fadeInUp','fadeInDown','fadeInLeft','fadeInRight',
      'zoomIn','zoomOut','bounceIn'
    );
  }

  function lockMotion(){
    motionText.setAttribute('data-dini-motion-seq-hold','1');
    for(const el of [frame,...headings]){
      stripAnimation(el);
      el.classList.add('elementor-invisible');
    }
    document.documentElement.setAttribute('data-dini-motion-sequence',VERSION);
  }

  function restart(el,anim,wait=0){
    setTimeout(()=>{
      if(!el?.isConnected)return;
      stripAnimation(el);
      void el.offsetWidth;
      el.classList.remove('elementor-invisible');
      el.classList.add('animated',anim);
      el.setAttribute('data-dini-motion-seq-released',anim);
    },Math.max(0,wait));
  }

  function cleanupWatch(){
    if(pollTimer){clearInterval(pollTimer);pollTimer=0}
    if(video){
      video.removeEventListener('timeupdate',checkVideoProgress);
      video.removeEventListener('loadedmetadata',checkVideoProgress);
      video.removeEventListener('durationchange',checkVideoProgress);
      video.removeEventListener('playing',checkVideoProgress);
      video.removeEventListener('ended',onVideoEnded);
    }
  }

  function releaseMotion(reason='video-final-phase'){
    if(released)return;
    released=true;
    if(fallbackTimer)clearTimeout(fallbackTimer);
    cleanupWatch();

    // Prepare the elements while still fully hidden so no final-state flash can
    // occur between the motion video and the source entrance animations.
    for(const el of [frame,...headings]){
      stripAnimation(el);
      el.classList.add('elementor-invisible');
    }

    if(getComputedStyle(motionText).display==='none'){
      motionText.style.display='flex';
    }
    motionText.removeAttribute('data-dini-motion-seq-hold');

    // Source video shows the decorative/logo layer first, then the three text
    // lines a fraction later. Preserve that order without the premature pass.
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      restart(frame,animationFor(frame,'zoomIn'),0);

      const delays=headings.map(delayFor);
      const nonZero=delays.filter(n=>n>0);
      const base=nonZero.length?Math.min(...nonZero):0;
      headings.forEach((el,index)=>{
        const relative=Math.max(0,(delays[index]||base)-base);
        restart(el,animationFor(el,index===1?'fadeInUp':'zoomIn'),300+relative);
      });
    }));

    document.documentElement.setAttribute('data-dini-motion-sequence-released',reason);
  }

  function thresholdForVideo(){
    const d=Number(video?.duration);
    if(Number.isFinite(d)&&d>4){
      // In the source motion, the white ornamental frame is already formed when
      // the overlay starts. Enter the overlay only in the final ~1.25 seconds.
      return Math.max(3,d-1.25);
    }
    return 10.2;
  }

  function checkVideoProgress(){
    if(!clicked||released||!video)return;
    const t=Number(video.currentTime)||0;
    if(t>=thresholdForVideo())releaseMotion('video-final-phase');
  }

  function onVideoEnded(){
    if(clicked&&!released)releaseMotion('video-ended');
  }

  function armVideoWatch(){
    if(!video){
      fallbackTimer=setTimeout(()=>releaseMotion('no-video-fallback'),10500);
      return;
    }
    video.addEventListener('timeupdate',checkVideoProgress);
    video.addEventListener('loadedmetadata',checkVideoProgress);
    video.addEventListener('durationchange',checkVideoProgress);
    video.addEventListener('playing',checkVideoProgress);
    video.addEventListener('ended',onVideoEnded,{once:true});
    pollTimer=setInterval(checkVideoProgress,120);
    // Safety only. Never let the text stay hidden if a browser reports no
    // duration/timeupdate event for the hosted background video.
    fallbackTimer=setTimeout(()=>releaseMotion('video-safety-timeout'),12000);
    checkVideoProgress();
  }

  function onOpen(){
    if(clicked)return;
    clicked=true;
    lockMotion();
    armVideoWatch();
  }

  // Lock immediately. This removes the first premature motionText animation
  // while leaving the authored background motion/video untouched.
  lockMotion();
  if(opener)opener.addEventListener('click',onOpen,{capture:true,once:true});
  else onOpen();

  window.DINI_MOTION_SECTION_SEQUENCE_V1={
    version:VERSION,
    active:true,
    release:releaseMotion,
    get released(){return released},
    get clicked(){return clicked},
    get videoTime(){return Number(video?.currentTime)||0},
    get videoDuration(){return Number(video?.duration)||0}
  };
})();