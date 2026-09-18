(()=>{
  'use strict';
  if(window.DINI_COVER_ENTRANCE_PERFORMANCE_V1?.version)return;

  const VERSION='1.0.2';
  const root=document.documentElement;
  let released=false;
  let prepared=false;
  let preparing=null;
  let revealHintCleanup=()=>{};
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

    // CSS backgrounds are the heaviest part of the cover on mobile. They are
    // preloaded by the renderer, but preload alone does not guarantee decode
    // has finished before the authored entrance animations begin.
    const bgHrefs=[...document.querySelectorAll('link[data-dini-cover-preload][as="image"]')]
      .map(link=>String(link.href||'').trim())
      .filter(Boolean)
      .slice(0,4);
    for(const href of bgHrefs){
      jobs.push(new Promise(resolve=>{
        try{
          const probe=new Image();
          const done=()=>resolve();
          probe.addEventListener('load',()=>{
            try{
              const decoded=probe.decode?.();
              if(decoded?.then)decoded.then(done).catch(done);
              else done();
            }catch{done()}
          },{once:true});
          probe.addEventListener('error',done,{once:true});
          probe.src=href;
          if(probe.complete&&probe.naturalWidth>0){
            try{
              const decoded=probe.decode?.();
              if(decoded?.then)decoded.then(done).catch(done);
              else done();
            }catch{done()}
          }
        }catch{resolve()}
      }));
    }

    if(document.fonts?.ready)jobs.push(document.fonts.ready.catch(()=>{}));
    // Bounded warm-up: enough time for already-preloaded cover assets to decode,
    // but never hold the entrance for an unbounded network request.
    await Promise.race([Promise.allSettled(jobs),sleep(360)]);
  }

  function primeRevealLayers(){
    const cover=document.getElementById('cover');
    if(!cover)return ()=>{};
    const targets=[...cover.querySelectorAll('[data-native-reveal]')].slice(0,6);
    const prev=targets.map(el=>el.style.willChange||'');
    for(const el of targets)el.style.willChange='opacity, transform';
    return ()=>{
      targets.forEach((el,i)=>{
        if(prev[i])el.style.willChange=prev[i];
        else el.style.removeProperty('will-change');
      });
    };
  }

  async function prepare(){
    if(prepared)return true;
    if(preparing)return preparing;
    preparing=(async()=>{
      await warmCover();
      revealHintCleanup=primeRevealLayers();
      await nextPaint();
      prepared=true;
      root.classList.add('dini-cover-entrance-ready');
      root.setAttribute('data-dini-cover-entrance-ready',VERSION);
      try{
        if(window.parent&&window.parent!==window){
          window.parent.postMessage({type:'dini-cover-entrance-ready',version:VERSION},'*');
        }
      }catch{}
      return true;
    })();
    return preparing;
  }

  async function release(){
    if(released)return true;
    await prepare();
    if(released)return true;
    released=true;
    await nextPaint();
    root.classList.remove('dini-cover-staging','dini-cover-entrance-ready');
    root.classList.add('dini-cover-entrance-running');
    root.removeAttribute('data-dini-cover-entrance-ready');
    root.setAttribute('data-dini-cover-entrance-performance',VERSION);

    // Drop temporary compositor hints after authored entrance animations finish.
    setTimeout(()=>{
      try{revealHintCleanup()}catch{}
      root.classList.remove('dini-cover-perf-active','dini-cover-entrance-running');
      root.classList.add('dini-cover-entrance-settled');
    },2200);
    return true;
  }

  const insideCanonicalFrame=(()=>{
    try{return window.frameElement?.id==='diniPublicCanonicalFrame'}catch{return false}
  })();
  const startPrepare=()=>prepare().then(()=>{if(!insideCanonicalFrame)return release()}).catch(()=>release());

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',startPrepare,{once:true});
  }else{
    startPrepare();
  }

  // Start warming even if DOMContentLoaded is unusually delayed, but let the
  // outer public renderer decide the exact visible handoff when we are framed.
  setTimeout(startPrepare,420);
  // Deadlock guard: never leave authored cover animation paused forever.
  setTimeout(()=>{if(!released)release()},2200);

  window.DINI_COVER_ENTRANCE_PERFORMANCE_V1={
    version:VERSION,
    prepare,
    release,
    get ready(){return prepared},
    get released(){return released}
  };
})();