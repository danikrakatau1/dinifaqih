(()=>{
  'use strict';
  if(window.DINI_MOTION_SECTION_SEQUENCE_V1?.version)return;

  const VERSION='1.4.3';
  const section=document.querySelector('.motionSection');
  const motionText=section?.querySelector('.motionText');
  const logo=motionText?.querySelector('.delay-image');
  const headings=[...motionText?.querySelectorAll?.('.elementor-widget-heading')||[]].slice(0,3);
  const video=section?.querySelector('.elementor-background-video-container video');
  const opener=document.querySelector('#tombolbuka,.tombolbuka');

  if(!section||!motionText||!logo||!headings.length){
    window.DINI_MOTION_SECTION_SEQUENCE_V1={version:VERSION,active:false};
    return;
  }

  const authored=new WeakMap();
  const parseSettings=el=>{
    try{return JSON.parse(el.getAttribute('data-settings')||'{}')||{}}
    catch{return{}}
  };
  for(const el of [logo,...headings])authored.set(el,parseSettings(el));

  const style=document.createElement('style');
  style.id='diniMotionSectionSequenceStyle';
  style.textContent=`
    @keyframes diniSourceFadeInUp{
      from{opacity:0;transform:none}
      to{opacity:1;transform:none}
    }
    @-webkit-keyframes diniSourceFadeInUp{
      from{opacity:0;-webkit-transform:none;transform:none}
      to{opacity:1;-webkit-transform:none;transform:none}
    }
    @keyframes diniSourceZoomIn{
      from{opacity:0;transform:scale3d(.3,.3,.3)}
      50%{opacity:1}
    }
    @-webkit-keyframes diniSourceZoomIn{
      from{opacity:0;-webkit-transform:scale3d(.3,.3,.3);transform:scale3d(.3,.3,.3)}
      50%{opacity:1}
    }
    .motionText[data-dini-motion-seq-hold="1"]{
      opacity:0!important;
      visibility:hidden!important;
      pointer-events:none!important;
    }
    .motionText[data-dini-motion-seq-hold="1"] .delay-image,
    .motionText[data-dini-motion-seq-hold="1"] .elementor-widget-heading{
      opacity:0!important;
      visibility:hidden!important;
      animation:none!important;
      -webkit-animation:none!important;
    }
    .motionText [data-dini-motion-seq-play="fadeInUp"]{
      -webkit-animation:diniSourceFadeInUp 1.25s ease both!important;
      animation:diniSourceFadeInUp 1.25s ease both!important;
    }
    .motionText [data-dini-motion-seq-play="zoomIn"]{
      -webkit-animation:diniSourceZoomIn 1.25s ease both!important;
      animation:diniSourceZoomIn 1.25s ease both!important;
    }
  `;
  (document.head||document.documentElement).appendChild(style);

  let released=false;
  let clicked=false;
  let fallbackTimer=0;
  let pollTimer=0;

  const isMobile=()=>{
    try{return matchMedia('(max-width:767px)').matches}catch{return innerWidth<=767}
  };
  const animationFor=(el,fallback='fadeInUp')=>{
    const s=authored.get(el)||{};
    const mobile=String(s._animation_mobile||'').trim();
    const desktop=String(s._animation||'').trim();
    const selected=(isMobile()&&mobile&&mobile!=='none')?mobile:desktop;
    return selected&&selected!=='none'?selected:fallback;
  };

  function stripAnimation(el){
    if(!el)return;
    try{
      for(const animation of el.getAnimations?.()||[])animation.cancel();
    }catch{}
    el.removeAttribute('data-dini-motion-seq-play');
    el.classList.remove(
      'animated','fadeInUp','fadeInDown','fadeInLeft','fadeInRight',
      'zoomIn','zoomOut','bounceIn'
    );
    el.style.removeProperty('animation');
    el.style.removeProperty('-webkit-animation');
    el.style.removeProperty('animation-delay');
    el.style.removeProperty('-webkit-animation-delay');
    el.style.removeProperty('animation-duration');
    el.style.removeProperty('-webkit-animation-duration');
    el.style.removeProperty('opacity');
    el.style.removeProperty('transform');
    el.style.removeProperty('clip-path');
    el.style.removeProperty('-webkit-clip-path');
  }

  function neutralizeGenericReveal(el){
    if(!el)return;
    // This runtime owns these four motion-overlay elements. Prevent the generic
    // source animation runtime from scheduling a second/delayed pass.
    el.removeAttribute('data-native-reveal');
    el.removeAttribute('data-native-animation');
    el.removeAttribute('data-native-animation-mobile');
    el.removeAttribute('data-native-animation-delay');

    const s={...(authored.get(el)||{})};
    if('_animation' in s)s._animation='none';
    if('_animation_mobile' in s)s._animation_mobile='none';
    if('_animation_delay' in s)s._animation_delay=0;
    el.setAttribute('data-settings',JSON.stringify(s));
    el.setAttribute('data-dini-motion-seq-owned',VERSION);
  }

  function lockMotion(){
    motionText.setAttribute('data-dini-motion-seq-hold','1');
    for(const el of [logo,...headings]){
      neutralizeGenericReveal(el);
      stripAnimation(el);
      el.classList.add('elementor-invisible');
    }
    document.documentElement.setAttribute('data-dini-motion-sequence',VERSION);
  }

  function formatMotionNames(){
    const host=headings[1];
    if(!host)return false;
    const title=host.querySelector('.elementor-heading-title')||host;
    const raw=String(title.textContent||'').replace(/\s+/g,' ').trim();
    const match=raw.match(/^(.+?)\s*&\s*(.+)$/);
    if(!match)return false;

    const left=match[1].trim();
    const right=match[2].trim();
    if(!left||!right)return false;

    const frag=document.createDocumentFragment();
    frag.append(document.createTextNode(left),document.createElement('br'));
    frag.append(document.createTextNode('&'),document.createElement('br'));
    frag.append(document.createTextNode(right));
    title.replaceChildren(frag);
    host.setAttribute('data-dini-motion-name-format','stacked-source');
    return true;
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

  function showOverlayTogether(reason='source-sync'){
    if(released)return;
    released=true;
    if(fallbackTimer)clearTimeout(fallbackTimer);
    cleanupWatch();

    if(getComputedStyle(motionText).display==='none')motionText.style.display='flex';

    // Source layout uses the couple names as three centered lines:
    // NAME / & / NAME. Re-apply at release in case upstream text substitution
    // normalized the heading into a single line.
    formatMotionNames();

    // Keep every overlay hidden until the exact release paint.
    for(const el of [logo,...headings]){
      stripAnimation(el);
      el.classList.add('elementor-invisible');
      el.style.removeProperty('opacity');
      el.style.removeProperty('visibility');
      el.style.removeProperty('transform');
    }

    motionText.removeAttribute('data-dini-motion-seq-hold');

    // Source recording is not perfectly simultaneous: the gold gunungan
    // starts first, then the three headings follow about a tenth of a second
    // later. Among headings, the name's authored 4120ms delay leads the
    // title/date 4150ms delays by ~30ms. Preserve that subtle choreography.
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const launch=(el,fallback,wait,tag)=>{
        setTimeout(()=>{
          if(!el?.isConnected)return;
          const authoredAnim=animationFor(el,fallback);
          const sourceAnim=authoredAnim==='fadeInUp'?'fadeInUp':'zoomIn';
          stripAnimation(el);

          // Mobile-safe path: use plain CSS transitions instead of pausing a
          // Web Animation at currentTime=0. Some Android/iOS iframe/browser
          // combinations can leave that paused animation pinned at opacity 0.
          el.style.setProperty('transition','none','important');
          el.style.setProperty('opacity','0','important');
          el.style.setProperty(
            'transform',
            sourceAnim==='fadeInUp'?'none':'scale3d(.3,.3,.3)',
            'important'
          );

          el.classList.remove('elementor-invisible');
          el.setAttribute('data-dini-motion-seq-released',tag);

          // Two paints guarantee the browser commits the start state before
          // transitioning to the final state on both mobile and desktop.
          requestAnimationFrame(()=>requestAnimationFrame(()=>{
            if(!el?.isConnected)return;
            el.style.setProperty(
              'transition',
              'opacity 1.25s ease, transform 1.25s ease',
              'important'
            );
            el.style.setProperty('opacity','1','important');
            el.style.setProperty('transform','none','important');
          }));

          const finalize=()=>{
            if(!el?.isConnected)return;
            el.style.removeProperty('transition');
            el.style.setProperty('opacity','1','important');
            el.style.setProperty('transform','none','important');
            el.removeAttribute('data-dini-motion-seq-play');
          };
          el.addEventListener('transitionend',finalize,{once:true});
          // Visibility watchdog: never leave overlays invisible if a mobile
          // browser suppresses transitionend inside the rendered iframe.
          setTimeout(finalize,1500);
        },wait);
      };

      launch(logo,'zoomIn',0,'source-sync-logo');
      launch(headings[1]||headings[0],'fadeInUp',100,'source-sync-name');
      launch(headings[0],'zoomIn',130,'source-sync-title');
      launch(headings[2]||headings[0],'zoomIn',130,'source-sync-date');
    }));

    document.documentElement.setAttribute('data-dini-motion-sequence-released',reason);
  }

  function thresholdForVideo(){
    const sourceSettings=String(section.getAttribute('data-settings')||'');
    if(/JAWA-COKLAT-3-1\.mp4/i.test(sourceSettings)){
      // Compared frame-by-frame with the supplied source recording:
      // 5.2s = red frame starts forming; 5.4s = logo + all text are entering.
      return 7.00;
    }
    const d=Number(video?.duration);
    if(Number.isFinite(d)&&d>4)return Math.min(Math.max(3,d*.52),d-1);
    return 5.55;
  }

  function checkVideoProgress(){
    if(!clicked||released||!video)return;
    const t=Number(video.currentTime)||0;
    if(t>=thresholdForVideo())showOverlayTogether('video-source-sync');
  }

  function onVideoEnded(){
    if(clicked&&!released)showOverlayTogether('video-ended');
  }

  function armVideoWatch(){
    if(!video){
      fallbackTimer=setTimeout(()=>showOverlayTogether('no-video-fallback'),5400);
      return;
    }
    video.addEventListener('timeupdate',checkVideoProgress);
    video.addEventListener('loadedmetadata',checkVideoProgress);
    video.addEventListener('durationchange',checkVideoProgress);
    video.addEventListener('playing',checkVideoProgress);
    video.addEventListener('ended',onVideoEnded,{once:true});
    pollTimer=setInterval(checkVideoProgress,60);
    fallbackTimer=setTimeout(()=>showOverlayTogether('video-safety-timeout'),7000);
    checkVideoProgress();
  }

  function onOpen(){
    if(clicked)return;
    clicked=true;
    lockMotion();
    armVideoWatch();
  }

  // Match the authored source composition before animations are armed.
  formatMotionNames();

  // Lock before the generic source animation runtime initializes.
  lockMotion();
  if(opener)opener.addEventListener('click',onOpen,{capture:true,once:true});
  else onOpen();

  window.DINI_MOTION_SECTION_SEQUENCE_V1={
    version:VERSION,
    active:true,
    release:showOverlayTogether,
    get released(){return released},
    get clicked(){return clicked},
    get videoTime(){return Number(video?.currentTime)||0},
    get videoDuration(){return Number(video?.duration)||0}
  };
})();