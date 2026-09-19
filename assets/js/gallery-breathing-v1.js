(()=>{
  'use strict';
  if(window.DINI_GALLERY_BREATHING_V1?.version)return;

  const VERSION='1.0.0';
  const doc=document;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;

  function ensureStyle(){
    if(doc.getElementById('diniGalleryBreathingStyle'))return;
    const style=doc.createElement('style');
    style.id='diniGalleryBreathingStyle';
    style.textContent=`
      .elementor-widget-gallery .e-gallery-image[data-dini-gallery-breathe="1"]{
        transform-origin:center center!important;
      }

      .elementor-widget-gallery .e-gallery-image.e-gallery-image-loaded.dini-gallery-compositor-released[data-dini-gallery-breathe="1"]{
        animation:
          diniGalleryBreathing
          var(--dini-gallery-breathe-duration,6.2s)
          ease-in-out
          var(--dini-gallery-breathe-delay,0s)
          infinite
          both;
      }

      @keyframes diniGalleryBreathing{
        0%,100%{scale:1}
        50%{scale:1.012}
      }

      @media (prefers-reduced-motion:reduce){
        .elementor-widget-gallery .e-gallery-image[data-dini-gallery-breathe="1"]{
          animation:none!important;
          scale:1!important;
        }
      }
    `;
    (doc.head||doc.documentElement).appendChild(style);
  }

  function apply(){
    const images=[...doc.querySelectorAll('.elementor-widget-gallery .e-gallery-image')];
    if(!images.length)return 0;

    ensureStyle();

    const delays=[0,-1.35,-2.7,-4.05,-.7,-2.05,-3.4,-4.75,-1.8,-3.15,-.45,-2.5];
    const durations=[6.4,6.8,6.1,6.6,6.3,6.9,6.2,6.7,6.5,6.05,6.75,6.25];

    images.forEach((image,index)=>{
      image.setAttribute('data-dini-gallery-breathe','1');
      image.style.setProperty('--dini-gallery-breathe-delay',String(delays[index%delays.length])+'s');
      image.style.setProperty('--dini-gallery-breathe-duration',String(durations[index%durations.length])+'s');
      if(reduced)image.style.setProperty('scale','1');
    });

    doc.documentElement.setAttribute('data-dini-gallery-breathing',VERSION);
    doc.documentElement.setAttribute('data-dini-gallery-breathing-count',String(images.length));
    return images.length;
  }

  let count=apply();

  if(!count){
    let attempts=0;
    const timer=setInterval(()=>{
      attempts++;
      count=apply();
      if(count||attempts>=16)clearInterval(timer);
    },250);
  }

  window.DINI_GALLERY_BREATHING_V1={
    version:VERSION,
    apply
  };
})();
