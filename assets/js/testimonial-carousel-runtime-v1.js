(()=>{
  'use strict';
  if(window.DINI_TESTIMONIAL_CAROUSEL_V1?.version)return;

  const VERSION='1.0.0';
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
  const parseSettings=el=>{
    try{return JSON.parse(el.getAttribute('data-settings')||'{}')||{}}catch{return{}}
  };

  function initWidget(widget){
    if(!widget||widget.dataset.diniCarouselReady==='1')return null;
    const viewport=widget.querySelector('.elementor-main-swiper.swiper,.elementor-swiper .swiper');
    const wrapper=viewport?.querySelector(':scope > .swiper-wrapper');
    if(!viewport||!wrapper)return null;

    const originals=[...wrapper.children].filter(el=>el.classList.contains('swiper-slide')&&!el.dataset.diniCarouselClone);
    if(originals.length<2)return null;

    widget.dataset.diniCarouselReady='1';
    const settings=parseSettings(widget);
    const count=originals.length;
    const speed=clamp(Number(settings.speed)||500,0,4000);
    const delay=Math.max(1200,Number(settings.autoplay_speed)||3000);
    const autoplay=String(settings.autoplay||'').toLowerCase()==='yes'||settings.autoplay===true;
    const loop=String(settings.loop||'').toLowerCase()==='yes'||settings.loop===true;
    const pauseOnHover=String(settings.pause_on_hover||'').toLowerCase()==='yes'||settings.pause_on_hover===true;
    const pauseOnInteraction=String(settings.pause_on_interaction||'').toLowerCase()==='yes'||settings.pause_on_interaction===true;

    // Preserve source markup and styling; only supply the missing carousel motion contract.
    viewport.style.setProperty('overflow','hidden');
    viewport.style.setProperty('touch-action','pan-y');
    wrapper.style.setProperty('display','flex');
    wrapper.style.setProperty('will-change','transform');
    originals.forEach(slide=>{
      slide.style.setProperty('flex','0 0 100%');
      slide.style.setProperty('width','100%');
    });

    let virtualSlides=originals;
    let logical=0;
    let physical=0;

    if(loop){
      const first=originals[0].cloneNode(true);
      const last=originals[count-1].cloneNode(true);
      first.dataset.diniCarouselClone='1';
      last.dataset.diniCarouselClone='1';
      first.setAttribute('aria-hidden','true');
      last.setAttribute('aria-hidden','true');
      first.style.setProperty('flex','0 0 100%');
      first.style.setProperty('width','100%');
      last.style.setProperty('flex','0 0 100%');
      last.style.setProperty('width','100%');
      wrapper.insertBefore(last,originals[0]);
      wrapper.appendChild(first);
      virtualSlides=[last,...originals,first];
      physical=1;
    }

    const pagination=widget.querySelector('.swiper-pagination');
    let progressFill=null;
    if(pagination&&String(settings.pagination||'').toLowerCase()==='progressbar'){
      pagination.classList.add('swiper-pagination-progressbar','swiper-pagination-horizontal');
      progressFill=pagination.querySelector('.swiper-pagination-progressbar-fill');
      if(!progressFill){
        progressFill=document.createElement('span');
        progressFill.className='swiper-pagination-progressbar-fill';
        pagination.appendChild(progressFill);
      }
    }

    function updateA11y(){
      originals.forEach((slide,i)=>{
        const active=i===logical;
        slide.classList.toggle('swiper-slide-active',active);
        slide.setAttribute('aria-hidden',active?'false':'true');
      });
      widget.dataset.diniCarouselIndex=String(logical);
      if(progressFill){
        const ratio=(logical+1)/count;
        progressFill.style.setProperty('transform','translate3d(0,0,0) scaleX('+ratio+')');
        progressFill.style.setProperty('transform-origin','left center');
      }
    }

    function translate(animate=true){
      wrapper.style.setProperty('transition-property','transform');
      wrapper.style.setProperty('transition-timing-function','ease');
      wrapper.style.setProperty('transition-duration',animate?speed+'ms':'0ms');
      wrapper.style.setProperty('transform','translate3d('+(-physical*100)+'%,0,0)');
      updateA11y();
    }

    function settleLoop(){
      if(!loop)return;
      if(physical===0){
        physical=count;
        logical=count-1;
        translate(false);
      }else if(physical===count+1){
        physical=1;
        logical=0;
        translate(false);
      }
    }

    let settleTimer=0;
    function goTo(nextLogical,direction=1,user=false){
      clearTimeout(settleTimer);
      if(loop){
        if(direction>0&&logical===count-1){
          logical=0; physical=count+1;
        }else if(direction<0&&logical===0){
          logical=count-1; physical=0;
        }else{
          logical=(nextLogical+count)%count;
          physical=logical+1;
        }
      }else{
        logical=clamp(nextLogical,0,count-1);
        physical=logical;
      }
      translate(true);
      settleTimer=setTimeout(settleLoop,speed+34);
      if(user)onUserInteraction();
    }

    const next=(user=false)=>goTo(logical+1,1,user);
    const prev=(user=false)=>goTo(logical-1,-1,user);

    const prevBtn=widget.querySelector('.elementor-swiper-button-prev,.swiper-button-prev');
    const nextBtn=widget.querySelector('.elementor-swiper-button-next,.swiper-button-next');
    if(prevBtn){
      prevBtn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();prev(true)});
      prevBtn.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();prev(true)}});
    }
    if(nextBtn){
      nextBtn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();next(true)});
      nextBtn.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();next(true)}});
    }

    let timer=0;
    let interactionPaused=false;
    let hoverPaused=false;
    let visible=true;

    function stopAuto(){clearTimeout(timer);timer=0}
    function schedule(){
      stopAuto();
      if(!autoplay||interactionPaused||hoverPaused||!visible||document.hidden)return;
      timer=setTimeout(()=>{next(false);schedule()},delay);
    }
    function onUserInteraction(){
      if(pauseOnInteraction){
        interactionPaused=true;
        stopAuto();
        // Source behavior pauses on interaction, but resume after a calm period so
        // the carousel does not become permanently static after one swipe/click.
        setTimeout(()=>{interactionPaused=false;schedule()},Math.max(delay,4500));
      }else schedule();
    }

    if(pauseOnHover){
      widget.addEventListener('mouseenter',()=>{hoverPaused=true;stopAuto()});
      widget.addEventListener('mouseleave',()=>{hoverPaused=false;schedule()});
    }

    let startX=0,startY=0,lastX=0,lastY=0,dragging=false,startTime=0;
    viewport.addEventListener('pointerdown',e=>{
      if(e.pointerType==='mouse'&&e.button!==0)return;
      startX=lastX=e.clientX;startY=lastY=e.clientY;startTime=performance.now();dragging=true;
      try{viewport.setPointerCapture(e.pointerId)}catch{}
    },{passive:true});
    viewport.addEventListener('pointermove',e=>{
      if(!dragging)return;
      lastX=e.clientX;lastY=e.clientY;
    },{passive:true});
    const finish=e=>{
      if(!dragging)return;
      dragging=false;
      lastX=e.clientX??lastX;lastY=e.clientY??lastY;
      const dx=lastX-startX,dy=lastY-startY,dt=Math.max(1,performance.now()-startTime);
      const horizontal=Math.abs(dx)>Math.abs(dy)*1.15;
      const enough=Math.abs(dx)>36||Math.abs(dx)/dt>0.45;
      if(horizontal&&enough){
        if(dx<0)next(true);else prev(true);
      }
    };
    viewport.addEventListener('pointerup',finish,{passive:true});
    viewport.addEventListener('pointercancel',()=>{dragging=false},{passive:true});

    if('IntersectionObserver' in window){
      const io=new IntersectionObserver(entries=>{
        const entry=entries[0];
        visible=!!entry?.isIntersecting;
        if(visible)schedule();else stopAuto();
      },{threshold:0.05});
      io.observe(widget);
    }

    document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAuto();else schedule()});

    // First frame: exact first authored story.
    translate(false);
    schedule();

    return {widget,count,next,prev,get index(){return logical}};
  }

  const instances=[...document.querySelectorAll('.elementor-widget-testimonial-carousel')].map(initWidget).filter(Boolean);
  document.documentElement.setAttribute('data-dini-testimonial-carousel',VERSION);
  document.documentElement.setAttribute('data-dini-testimonial-carousel-count',String(instances.length));
  window.DINI_TESTIMONIAL_CAROUSEL_V1={version:VERSION,instances,initWidget};
})();