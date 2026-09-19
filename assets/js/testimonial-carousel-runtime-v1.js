(()=>{
  'use strict';
  if(window.DINI_TESTIMONIAL_CAROUSEL_V1?.version)return;

  const VERSION='1.0.4';
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
  const parseSettings=el=>{
    try{return JSON.parse(el.getAttribute('data-settings')||'{}')||{}}catch{return{}}
  };

  function initWidget(widget){
    if(!widget||widget.dataset.diniCarouselReady==='1')return null;
    const viewport=widget.querySelector('.elementor-main-swiper.swiper,.elementor-swiper .swiper');
    const wrapper=viewport?.querySelector(':scope > .swiper-wrapper');
    if(!viewport||!wrapper)return null;

    const slides=[...wrapper.children].filter(el=>el.classList.contains('swiper-slide'));
    if(slides.length<2)return null;

    widget.dataset.diniCarouselReady='1';
    const settings=parseSettings(widget);
    const count=slides.length;
    const speed=clamp(Number(settings.speed)||500,180,900);
    const delay=Math.max(1200,Number(settings.autoplay_speed)||3000);
    const autoplay=String(settings.autoplay||'').toLowerCase()==='yes'||settings.autoplay===true;
    const loop=String(settings.loop||'').toLowerCase()==='yes'||settings.loop===true;
    const pauseOnHover=String(settings.pause_on_hover||'').toLowerCase()==='yes'||settings.pause_on_hover===true;
    const pauseOnInteraction=String(settings.pause_on_interaction||'').toLowerCase()==='yes'||settings.pause_on_interaction===true;

    viewport.style.setProperty('overflow','hidden');
    viewport.style.setProperty('touch-action','pan-y');
    wrapper.style.setProperty('display','block');
    wrapper.style.removeProperty('transform');
    wrapper.style.removeProperty('transition');
    wrapper.style.removeProperty('will-change');

    let logical=0;
    let direction=1;

    // Keep every Love Story slide at one stable height so text-length differences
    // never make the glass card jump between slides.
    let stabilizedHeight=0;
    function stabilizeHeight(){
      const prev=slides.map(slide=>({
        display:slide.style.getPropertyValue('display'),
        displayPriority:slide.style.getPropertyPriority('display'),
        position:slide.style.getPropertyValue('position'),
        visibility:slide.style.getPropertyValue('visibility'),
        width:slide.style.getPropertyValue('width'),
        minHeight:slide.style.getPropertyValue('min-height')
      }));

      slides.forEach(slide=>{
        slide.style.setProperty('display','block','important');
        slide.style.setProperty('position','absolute');
        slide.style.setProperty('visibility','hidden','important');
        slide.style.setProperty('width','100%');
        slide.style.removeProperty('min-height');
      });

      let maxH=0;
      for(const slide of slides){
        const testimonial=slide.querySelector('.elementor-testimonial')||slide;
        maxH=Math.max(maxH,Math.ceil(testimonial.getBoundingClientRect().height||slide.scrollHeight||0));
      }

      slides.forEach((slide,i)=>{
        const p=prev[i];
        if(p.display)slide.style.setProperty('display',p.display,p.displayPriority||'');
        else slide.style.removeProperty('display');
        if(p.position)slide.style.setProperty('position',p.position); else slide.style.removeProperty('position');
        if(p.visibility)slide.style.setProperty('visibility',p.visibility); else slide.style.removeProperty('visibility');
        if(p.width)slide.style.setProperty('width',p.width); else slide.style.removeProperty('width');
        if(p.minHeight)slide.style.setProperty('min-height',p.minHeight); else slide.style.removeProperty('min-height');
      });

      if(maxH>0){
        stabilizedHeight=maxH;
        wrapper.style.setProperty('min-height',maxH+'px');
        viewport.style.setProperty('min-height',maxH+'px');
        slides.forEach(slide=>{
          slide.style.setProperty('min-height',maxH+'px');
          const testimonial=slide.querySelector('.elementor-testimonial');
          if(testimonial){
            testimonial.style.setProperty('min-height',maxH+'px');
            testimonial.style.setProperty('display','flex');
            testimonial.style.setProperty('flex-direction','column');
            const content=testimonial.querySelector('.elementor-testimonial__content');
            const footer=testimonial.querySelector('.elementor-testimonial__footer');
            if(content)content.style.setProperty('flex','1 1 auto');
            if(footer)footer.style.setProperty('margin-top','auto');
          }
        });
        widget.dataset.diniCarouselStableHeight=String(maxH);
      }
    }

    const pagination=widget.querySelector('.swiper-pagination');
    let progressFill=null;
    if(pagination&&String(settings.pagination||'').toLowerCase()==='progressbar'){
      pagination.classList.add('swiper-pagination-progressbar','swiper-pagination-horizontal');
      pagination.style.setProperty('display','none','important');
      pagination.setAttribute('aria-hidden','true');
      progressFill=pagination.querySelector('.swiper-pagination-progressbar-fill');
      if(!progressFill){
        progressFill=document.createElement('span');
        progressFill.className='swiper-pagination-progressbar-fill';
        pagination.appendChild(progressFill);
      }
    }

    function render(animate=true){
      if(!stabilizedHeight)stabilizeHeight();
      slides.forEach((slide,i)=>{
        const active=i===logical;
        slide.classList.toggle('swiper-slide-active',active);
        slide.setAttribute('aria-hidden',active?'false':'true');
        slide.style.setProperty('width','100%');
        slide.style.setProperty('max-width','100%');
        slide.style.setProperty('flex','none');
        slide.style.setProperty('display',active?'block':'none','important');
        if(active){
          slide.style.setProperty('opacity','1','important');
          slide.style.setProperty('visibility','visible','important');
        }
      });

      const active=slides[logical];
      if(animate&&active?.animate){
        try{
          const x=direction>0?14:-14;
          active.animate(
            [
              {opacity:.25,transform:'translate3d('+x+'px,0,0)'},
              {opacity:1,transform:'translate3d(0,0,0)'}
            ],
            {duration:speed,easing:'cubic-bezier(.22,.61,.36,1)'}
          );
        }catch{}
      }

      widget.dataset.diniCarouselIndex=String(logical);
      if(progressFill){
        const ratio=(logical+1)/count;
        progressFill.style.setProperty('transform','translate3d(0,0,0) scaleX('+ratio+')');
        progressFill.style.setProperty('transform-origin','left center');
      }
    }

    function goTo(nextLogical,dir=1,user=false){
      direction=dir;
      if(loop) logical=(nextLogical+count)%count;
      else logical=clamp(nextLogical,0,count-1);
      render(true);
      if(user)onUserInteraction();
    }

    const next=(user=false)=>goTo(logical+1,1,user);
    const prev=(user=false)=>goTo(logical-1,-1,user);

    const prevBtn=widget.querySelector('.elementor-swiper-button-prev,.swiper-button-prev');
    const nextBtn=widget.querySelector('.elementor-swiper-button-next,.swiper-button-next');
    const prepareNavButton=btn=>{
      if(!btn)return;
      btn.style.setProperty('pointer-events','auto','important');
      btn.style.setProperty('z-index','30','important');
      btn.style.setProperty('cursor','pointer','important');
      btn.style.setProperty('touch-action','manipulation','important');
      btn.style.setProperty('user-select','none','important');
      btn.setAttribute('role','button');
      if(!btn.hasAttribute('tabindex'))btn.setAttribute('tabindex','0');
    };
    prepareNavButton(prevBtn);
    prepareNavButton(nextBtn);
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
    let scrolling=false;
    let scrollIdleTimer=0;

    function schedule(){
      stopAuto();
      if(!autoplay||interactionPaused||hoverPaused||!visible||document.hidden||scrolling)return;
      timer=setTimeout(()=>{next(false);schedule()},delay);
    }
    function onUserInteraction(){
      if(pauseOnInteraction){
        interactionPaused=true;
        stopAuto();
        setTimeout(()=>{interactionPaused=false;schedule()},Math.max(delay,4500));
      }else schedule();
    }

    if(pauseOnHover){
      widget.addEventListener('mouseenter',()=>{hoverPaused=true;stopAuto()});
      widget.addEventListener('mouseleave',()=>{hoverPaused=false;schedule()});
    }

    let startX=0,startY=0,lastX=0,lastY=0,dragging=false,startTime=0;
    viewport.addEventListener('pointerdown',e=>{
      if(e.target?.closest?.('.elementor-swiper-button-prev,.swiper-button-prev,.elementor-swiper-button-next,.swiper-button-next'))return;
      if(e.pointerType==='mouse'&&e.button!==0)return;
      startX=lastX=e.clientX;
      startY=lastY=e.clientY;
      startTime=performance.now();
      dragging=true;
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
        visible=!!entries[0]?.isIntersecting;
        if(visible)schedule();else stopAuto();
      },{threshold:0.05});
      io.observe(widget);
    }

    // Android Chrome can emit resize events while its browser chrome expands/
    // collapses during vertical scrolling. Height-only viewport churn must not
    // force carousel re-measurement because stabilizeHeight() reads every slide.
    let lastViewportWidth=Math.round(window.innerWidth||document.documentElement.clientWidth||0);
    let resizeTimer=0;
    window.addEventListener('resize',()=>{
      const width=Math.round(window.innerWidth||document.documentElement.clientWidth||0);
      if(lastViewportWidth&&Math.abs(width-lastViewportWidth)<=2)return;
      lastViewportWidth=width;
      clearTimeout(resizeTimer);
      resizeTimer=setTimeout(()=>{
        stabilizedHeight=0;
        stabilizeHeight();
        render(false);
      },160);
    },{passive:true});

    // Do not let autoplay transition compete with an active finger/scroll frame.
    // The exact slide timing resumes once scrolling has been idle briefly.
    const onScroll=()=>{
      if(!visible)return;
      scrolling=true;
      stopAuto();
      clearTimeout(scrollIdleTimer);
      scrollIdleTimer=setTimeout(()=>{
        scrolling=false;
        schedule();
      },180);
    };
    window.addEventListener('scroll',onScroll,{passive:true});

    document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAuto();else schedule()});

    stabilizeHeight();
    if(document.fonts?.ready){
      document.fonts.ready.then(()=>requestAnimationFrame(()=>{
        stabilizedHeight=0;
        stabilizeHeight();
        render(false);
      })).catch(()=>{});
    }

    render(false);
    schedule();

    return {widget,count,next,prev,get index(){return logical},get stableHeight(){return stabilizedHeight}};
  }

  const instances=[...document.querySelectorAll('.elementor-widget-testimonial-carousel')].map(initWidget).filter(Boolean);
  document.documentElement.setAttribute('data-dini-testimonial-carousel',VERSION);
  document.documentElement.setAttribute('data-dini-testimonial-carousel-count',String(instances.length));
  window.DINI_TESTIMONIAL_CAROUSEL_V1={version:VERSION,instances,initWidget};
})();