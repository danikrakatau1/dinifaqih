(function(g){
  'use strict';
  if(g.DINI_GALLERY_PERFORMANCE_V1?.version)return;
  const VERSION='1.0.0';
  const doc=document;
  const items=[...doc.querySelectorAll('[data-dini-gallery-bg-deferred="1"]')];
  if(!items.length){
    g.DINI_GALLERY_PERFORMANCE_V1={version:VERSION,count:0};
    return;
  }

  const mobile=matchMedia('(max-width:767px)').matches;
  const concurrency=mobile?1:2;
  const rootMargin=mobile?'1800px 0px':'2200px 0px';
  const queue=[];
  const queued=new WeakSet();
  let active=0,loaded=0,failed=0;

  function bgUrl(el){
    return String(el.getAttribute('data-dini-gallery-bg')||el.getAttribute('data-thumbnail')||'').trim();
  }

  function apply(el,url){
    if(!el||!url)return;
    el.style.setProperty('background-image','url("'+String(url).replaceAll('"','%22')+'")','important');
    el.setAttribute('data-dini-gallery-bg-loaded','1');
    el.removeAttribute('data-dini-gallery-bg-loading');
  }

  function runNext(){
    while(active<concurrency&&queue.length){
      const el=queue.shift();
      const url=bgUrl(el);
      if(!url||el.getAttribute('data-dini-gallery-bg-loaded')==='1')continue;
      active++;
      el.setAttribute('data-dini-gallery-bg-loading','1');
      const img=new Image();
      img.decoding='async';
      try{img.fetchPriority='low'}catch{}
      const done=ok=>{
        if(ok){requestAnimationFrame(()=>apply(el,url));loaded++}
        else{apply(el,url);failed++}
        active--;
        runNext();
      };
      img.onload=async()=>{
        try{
          if(img.decode)await img.decode();
          done(true);
        }catch{done(true)}
      };
      img.onerror=()=>done(false);
      img.src=url;
    }
    doc.documentElement.setAttribute('data-dini-gallery-loaded',String(loaded));
    doc.documentElement.setAttribute('data-dini-gallery-active',String(active));
    doc.documentElement.setAttribute('data-dini-gallery-queued',String(queue.length));
  }

  function enqueue(el){
    if(!el||queued.has(el)||el.getAttribute('data-dini-gallery-bg-loaded')==='1')return;
    queued.add(el);
    queue.push(el);
    runNext();
  }

  if('IntersectionObserver' in g){
    const io=new IntersectionObserver(entries=>{
      for(const e of entries){
        if(!e.isIntersecting)continue;
        io.unobserve(e.target);
        enqueue(e.target);
      }
    },{root:null,rootMargin,threshold:0.01});
    items.forEach(el=>io.observe(el));

    // Prewarm the first visible gallery tile during idle time so entering the
    // gallery never starts from a completely cold decode.
    const prewarm=()=>{if(items[0])enqueue(items[0])};
    if('requestIdleCallback' in g)requestIdleCallback(prewarm,{timeout:1800});
    else setTimeout(prewarm,900);

    g.addEventListener('pagehide',()=>io.disconnect(),{once:true});
  }else{
    items.forEach(enqueue);
  }

  doc.documentElement.setAttribute('data-dini-gallery-performance',VERSION);
  doc.documentElement.setAttribute('data-dini-gallery-deferred-count',String(items.length));
  g.DINI_GALLERY_PERFORMANCE_V1={
    version:VERSION,
    count:items.length,
    enqueue,
    stats:()=>({loaded,failed,active,queued:queue.length})
  };
})(window);
