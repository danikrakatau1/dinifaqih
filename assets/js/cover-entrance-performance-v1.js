(()=>{
  'use strict';
  if(window.DINI_COVER_ENTRANCE_PERFORMANCE_V1?.version)return;

  const VERSION='1.0.0';
  const root=document.documentElement;
  let released=false;
  root.classList.add('dini-cover-staging','dini-cover-perf-active');

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const nextPaint=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));

  async function warmCover(){
    const cover=document.getElementById('cover');
    if(!cover)return;
    const imgs=[...cover.querySelectorAll('img')];
    const jobs=imgs.map(img=>{
      try{
        if(img.complete&&img.naturalWidth>0)return img.decode?.()||Promise.resolve();
        return new Promise(resolve=>{
          const done=()=>resolve();
          img.addEventListener('load',done,{once:true});
          img.addEventListener('error',done,{once:true});
        }).then(()=>img.decode?.().catch?.(()=>{})||undefined);
      }catch{return Promise.resolve()}
    });
    if(document.fonts?.ready)jobs.push(document.fonts.ready.catch(()=>{}));
    await Promise.race([Promise.allSettled(jobs),sleep(160)]);
  }

  async function release(){
    if(released)return;
    released=true;
    await warmCover();
    await nextPaint();
    root.classList.remove('dini-cover-staging');
    root.classList.add('dini-cover-entrance-running');
    root.setAttribute('data-dini-cover-entrance-performance',VERSION);

    // Drop compositor hints after authored entrance animations finish.
    setTimeout(()=>{
      root.classList.remove('dini-cover-perf-active','dini-cover-entrance-running');
      root.classList.add('dini-cover-entrance-settled');
    },2400);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',release,{once:true});
  }else{
    release();
  }

  // Safety release if DOMContentLoaded is unusually delayed.
  setTimeout(release,420);

  window.DINI_COVER_ENTRANCE_PERFORMANCE_V1={version:VERSION,release};
})();