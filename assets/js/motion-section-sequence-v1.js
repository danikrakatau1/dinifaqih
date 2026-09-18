(()=>{
  'use strict';
  if(window.DINI_MOTION_SECTION_SEQUENCE_V1?.version)return;

  const VERSION='1.2.0';
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

    // The source recording shows the gold logo and all three text lines
    // entering together immediately after the red ornamental frame has formed.
    // Start every overlay animation on the same paint; keep only each element's
    // authored animation type (zoomIn/fadeInUp), not its old absolute delay.
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const overlays=[frame,...headings];
      overlays.forEach((el,index)=>{
        const fallback=index===0?'zoomIn':(index===2?'fadeInUp':'zoomIn');
        stripAnimation(el);
        void el.offsetWidth;
        el.classList.remove('elementor-invisible');
        el.classList.add('animated',animationFor(el,fallback));
        el.setAttribute('data-dini-motion-seq-released','source-sync');
      });
    }));

    document.documentElement.setAttribute('data-dini-motion-sequence-released',reason);
  }

  function thresholdForVideo(){
    const d=Number(video?.duration);
    const sourceSettings=String(section.getAttribute('data-settings')||'');
    const isJawaCoklat3=/JAWA-COKLAT-3-1\.mp4/i.test(sourceSettings);

    // Measured against the user's source recording: the red ornamental frame is
    // essentially complete at ~10.1s of the hosted motion video, and the gold
    // logo + THE WEDDING OF + names + date begin together immediately after it.
    if(isJawaCoklat3)return 10.1;

    if(Number.isFinite(d)&&d>4){
      // Generic fallback for other motion sections: enter slightly before the
      // end, after their framing motion has normally settled.
      return Math.max(3,d-2.0);
    }
    return 10.1;
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