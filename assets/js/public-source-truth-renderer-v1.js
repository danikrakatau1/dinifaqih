(()=>{
  'use strict';
  if(window.__DINI_PUBLIC_SOURCE_TRUTH_RENDERER_V1__)return;
  window.__DINI_PUBLIC_SOURCE_TRUTH_RENDERER_V1__=true;

  const VERSION='1.3.76';
  const CFG=window.DINI_PUBLIC_ENTRY||{};
  const MODE=CFG.mode==='guest'?'guest':'public';
  const SB='https://jfvmcerrsxjvbiogfqes.supabase.co';
  const KEY='sb_publishable_3IqSDxkpxCGiDpxAEwdsXQ_AsJpsC4W';
  const H={apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'};
  const state=document.getElementById('diniPublicState');

  const esc=s=>String(s||'').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
  const renderGuest404=()=>{
    document.title='404 — Faqih & Dini';
    document.documentElement.dataset.publicEntryError='404';
    document.documentElement.dataset.guestNotFound='custom-404-v2';
    document.documentElement.style.cssText='margin:0;width:100%;min-height:100%;background:#fff;overflow:auto';
    document.body.style.cssText='margin:0;width:100%;min-height:100vh;background:#fff;overflow:auto;display:block';

    if(!state)return;
    state.className='guest-404-state';
    state.removeAttribute('aria-busy');
    state.setAttribute('aria-live','polite');
    state.style.cssText='min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box;background:#fff;color:#1a2e35';

    state.innerHTML=`
      <style>
        .guest-404-card{width:min(760px,100%);text-align:center;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}
        .guest-404-art{width:min(520px,92vw);height:auto;display:block;margin:0 auto 18px}
        .guest-404-title{margin:0 0 10px;font-size:clamp(22px,4vw,32px);line-height:1.18;font-weight:900;color:#1a2e35}
        .guest-404-copy{max-width:560px;margin:0 auto;color:#657078;font-size:14px;line-height:1.7}
        .guest-404-action{display:inline-flex;align-items:center;justify-content:center;margin-top:24px;padding:12px 20px;border-radius:999px;background:#1a2e35;color:#fff;text-decoration:none;font-weight:800;font-size:13px;box-shadow:0 10px 26px rgba(26,46,53,.16);transition:transform .18s ease,box-shadow .18s ease}
        .guest-404-action:hover{transform:translateY(-1px);box-shadow:0 14px 30px rgba(26,46,53,.2)}
        @media(max-width:520px){.guest-404-card{padding:6px}.guest-404-art{width:min(430px,94vw)}.guest-404-copy{font-size:13px}}
        @media(prefers-reduced-motion:reduce){.guest-404-action{transition:none}}
      </style>
      <main class="guest-404-card" role="main">
        <img class="guest-404-art" src="/assets/branding/guest-404-cat.svg?v=1" alt="Ilustrasi 404">
        <h1 class="guest-404-title">Oops! Tamu tidak ditemukan</h1>
        <p class="guest-404-copy">Link undangan ini tidak tersedia atau data tamunya sudah tidak aktif. Periksa kembali link yang dibagikan.</p>
        <a class="guest-404-action" href="/" aria-label="Kembali ke halaman utama">Kembali ke halaman utama</a>
      </main>`;
  };
  const fail=(title,msg,code=500)=>{
    const guestExpectedError=MODE==='guest'&&/^(Tamu tidak ditemukan\.|Link tamu tidak valid\.)$/i.test(String(msg||'').trim());
    if(guestExpectedError)return renderGuest404();
    document.title=title+' — Faqih & Dini';
    if(state)state.innerHTML='<div><b>'+esc(title)+'</b><small>'+esc(msg||'')+'</small></div>';
    document.documentElement.dataset.publicEntryError=String(code);
  };
  const sourceTruthVersion=value=>Number(
    value?.manifest?.source_graph?.source_truth_version ??
    value?.manifest?.source_truth_package_version ??
    value?.source_graph?.source_truth_version ??
    value?.source_truth_version ?? 0
  )||0;
  const isSourceTruth=value=>sourceTruthVersion(value)>=1;
  const dirname=raw=>{
    try{
      const u=new URL(raw,location.href);
      if(/\.[a-z0-9]{1,8}$/i.test(u.pathname.split('/').pop()||''))u.pathname=u.pathname.replace(/[^/]*$/,'');
      if(!u.pathname.endsWith('/'))u.pathname+='/' ;
      u.search='';u.hash='';return u.href;
    }catch{return ''}
  };
  const embeddedBase=(html,manifest={},fallback='')=>{
    try{
      const raw=String(html||'');
      const m=raw.match(/<base\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/i);
      const authored=String(m?.[2]||'').trim();
      if(authored)return new URL(authored,manifest.source_url||manifest.asset_base||fallback||location.href).href;
    }catch{}
    for(const raw of [manifest.source_url,manifest.asset_base,fallback]){
      const d=dirname(raw);if(d)return d;
    }
    return location.origin+'/';
  };
  const ensureBase=(html,manifest,sourcePath)=>{
    const raw=String(html||'');
    const href=embeddedBase(raw,manifest,sourcePath).replace(/"/g,'&quot;');
    if(/<base\b[^>]*\bhref\s*=\s*(["'])[^"']*\1/i.test(raw)){
      return raw.replace(/(<base\b[^>]*\bhref\s*=\s*)(["'])[^"']*\2/i,'$1"'+href+'"');
    }
    if(/<base\b/i.test(raw)){
      return raw.replace(/<base\b[^>]*>/i,'<base data-dini-template-base="source-truth" href="'+href+'">');
    }
    return /<head(\s[^>]*)?>/i.test(raw)?raw.replace(/<head(\s[^>]*)?>/i,m=>m+'<base data-dini-template-base="source-truth" href="'+href+'">'):raw;
  };
  const appendRuntime=(html,blocks)=>{
    const block=(blocks||[]).filter(Boolean).join('');
    if(!block)return html;
    return /<\/body>/i.test(html)?html.replace(/<\/body>/i,block+'</body>'):html+block;
  };
  const safeJson=value=>JSON.stringify(value??{}).replace(/</g,'\\u003c').replace(/-->/g,'--\\>');
  const localAsset=path=>new URL(path,location.origin).href.replace(/"/g,'&quot;');

  const imageLike=value=>{
    const v=String(value||'').trim();
    return !!v&&(/\.(?:avif|bmp|gif|jpe?g|png|svg|webp)(?:$|[?#])/i.test(v)||/\/wp-content\/uploads\//i.test(v)||/^https?:\/\//i.test(v));
  };
  const mediaReplacementMapFromSnapshot=snap=>{
    const map=new Map();
    const fields=Array.isArray(snap?.schema?.fields)?snap.schema.fields:[];
    const values=snap?.values&&typeof snap.values==='object'?snap.values:{};
    for(const f of fields){
      if(f?.kind!=='image'||!f?.id)continue;
      const old=String(f.value??f.source_value??f.original_value??f.baseline_value??'').trim();
      const next=String(values[f.id]??'').trim();
      if(!old||!next||old===next||!imageLike(old)||!imageLike(next))continue;
      map.set(old,next);
      try{
        const absOld=new URL(old,location.href).href;
        if(absOld!==old)map.set(absOld,next);
      }catch{}
    }
    return map;
  };
  const reconcileSnapshotImageLinks=(html,snap)=>{
    const map=mediaReplacementMapFromSnapshot(snap);
    if(!map.size)return {html:String(html||''),count:0,mapSize:0};
    const doc=new DOMParser().parseFromString(String(html||''),'text/html');
    let count=0;
    const replaceAttr=(el,name)=>{
      const raw=String(el.getAttribute(name)||'');
      if(!raw)return;
      let next=raw;
      for(const [old,to] of map){
        if(next===old)next=to;
        else if(next.includes(old))next=next.split(old).join(to);
      }
      if(next!==raw){el.setAttribute(name,next);count++}
    };
    for(const a of doc.querySelectorAll('a[href]')){
      replaceAttr(a,'href');
      for(const at of [...a.attributes]){
        if(/^data-/i.test(at.name))replaceAttr(a,at.name);
      }
    }
    doc.documentElement.setAttribute('data-dini-media-authority-prepatched',String(count));
    doc.documentElement.setAttribute('data-dini-media-authority-map-size',String(map.size));
    return {html:'<!doctype html>\n'+doc.documentElement.outerHTML,count,mapSize:map.size};
  };

  const optimizeCoverEntrance=html=>{
    const doc=new DOMParser().parseFromString(String(html||''),'text/html');
    const cover=doc.querySelector('#cover');
    if(!cover)return {html:String(html||''),preloads:0};

    const style=doc.createElement('style');
    style.setAttribute('data-dini-cover-performance','1');
    style.textContent=`
      html.dini-cover-perf-active #cover{
        will-change:opacity,transform;
        backface-visibility:hidden;
        -webkit-backface-visibility:hidden;
        isolation:isolate;
      }
      html.dini-cover-perf-active #cover [data-native-reveal]{
        backface-visibility:hidden;
        -webkit-backface-visibility:hidden;
      }
      html.dini-cover-staging #cover [data-native-reveal]{
        animation-play-state:paused!important;
        -webkit-animation-play-state:paused!important;
      }
    `;
    (doc.head||doc.documentElement).appendChild(style);

    const urls=new Set();
    for(const img of cover.querySelectorAll('img[src]')){
      const u=String(img.getAttribute('src')||'').trim();
      if(u)urls.add(u);
      img.setAttribute('fetchpriority','high');
      img.setAttribute('loading','eager');
    }

    // Discover CSS background URLs owned by elements inside the cover only.
    const ids=[...cover.querySelectorAll('[data-id]')].map(x=>String(x.getAttribute('data-id')||'').trim()).filter(Boolean);
    for(const st of doc.querySelectorAll('style')){
      const css=String(st.textContent||'');
      if(!css||!css.includes('background-image'))continue;
      for(const id of ids){
        let pos=0;
        const needle='elementor-element-'+id;
        while((pos=css.indexOf(needle,pos))>=0){
          const open=css.indexOf('{',pos);
          const close=open>=0?css.indexOf('}',open):-1;
          if(open<0||close<0||open-pos>600){pos+=needle.length;continue}
          const rule=css.slice(open+1,close);
          const m=rule.match(/background-image\s*:\s*url\(\s*["']?([^"')]+)["']?\s*\)/i);
          if(m?.[1])urls.add(m[1]);
          pos=close+1;
        }
      }
    }

    let preloads=0;
    for(const href of [...urls].slice(0,4)){
      if(!/^https?:\/\//i.test(href))continue;
      const link=doc.createElement('link');
      link.rel='preload';
      link.as='image';
      link.href=href;
      link.setAttribute('fetchpriority','high');
      link.setAttribute('data-dini-cover-preload','1');
      (doc.head||doc.documentElement).appendChild(link);
      preloads++;
    }

    const nativeRuntime=doc.querySelector('script[data-dini-source-native-runtime]');
    if(nativeRuntime?.parentNode){
      const coverScript=doc.createElement('script');
      coverScript.src=localAsset('/assets/js/cover-entrance-performance-v1.js?v=102');
      coverScript.setAttribute('data-dini-cover-performance-runtime','1');
      nativeRuntime.parentNode.insertBefore(coverScript,nativeRuntime);

      // Source motion section contract: keep title/name/date locked until the
      // authored frame image has completed its entrance. Must run before the
      // generic source-native animation runtime.
      const motionScript=doc.createElement('script');
      motionScript.src=localAsset('/assets/js/motion-section-sequence-v1.js?v=150');
      motionScript.setAttribute('data-dini-motion-section-sequence-runtime','1');
      nativeRuntime.parentNode.insertBefore(motionScript,nativeRuntime);
    }

    doc.documentElement.setAttribute('data-dini-cover-performance-preloads',String(preloads));
    return {html:'<!doctype html>\n'+doc.documentElement.outerHTML,preloads};
  };

  const galleryThumbUrl=(raw,width=720,quality=68)=>{
    const value=String(raw||'').trim();
    if(!value)return '';
    try{
      const u=new URL(value,location.href);
      if(u.hostname.endsWith('.supabase.co')&&u.pathname.includes('/storage/v1/object/public/')){
        u.pathname=u.pathname.replace('/storage/v1/object/public/','/storage/v1/render/image/public/');
        u.searchParams.set('width',String(width));
        u.searchParams.set('quality',String(quality));
        u.searchParams.set('resize','contain');
        return u.href;
      }
    }catch{}
    return value;
  };

  const deferHeavyGalleryBackgrounds=html=>{
    const doc=new DOMParser().parseFromString(String(html||''),'text/html');
    let count=0;
    const preloads=[];
    for(const el of doc.querySelectorAll('.e-gallery-image[data-thumbnail],[data-native-gallery-image][data-thumbnail]')){
      const original=String(el.getAttribute('data-thumbnail')||'').trim();
      if(!original)continue;
      const runtime=galleryThumbUrl(original,720,68);
      if(!runtime)continue;
      el.setAttribute('data-dini-gallery-bg',original);
      el.setAttribute('data-dini-gallery-bg-runtime',runtime);
      el.setAttribute('data-dini-gallery-bg-loaded','1');
      el.removeAttribute('data-dini-gallery-bg-deferred');
      el.style.setProperty('background-image','url("'+String(runtime).replaceAll('"','%22')+'")','important');
      if(preloads.length<4)preloads.push(runtime);
      count++;
    }
    if(preloads.length&&doc.head){
      for(const href of preloads){
        const link=doc.createElement('link');
        link.rel='preload';
        link.as='image';
        link.href=href;
        link.setAttribute('fetchpriority','high');
        link.setAttribute('data-dini-gallery-preload','1');
        doc.head.appendChild(link);
      }
    }
    if(count){
      doc.documentElement.setAttribute('data-dini-gallery-optimized-count',String(count));
      doc.documentElement.setAttribute('data-dini-gallery-preload-count',String(preloads.length));
    }
    return {html:'<!doctype html>\n'+doc.documentElement.outerHTML,count,preloadCount:preloads.length};
  };

  const prepareSourceDocument=(html,manifest,sourcePath,snap)=>{
    const raw=String(html||'');
    const doc=new DOMParser().parseFromString(raw,'text/html');

    // Base URL: preserve authored behavior without a separate parser pass.
    const baseHref=embeddedBase(raw,manifest,sourcePath);
    let base=doc.querySelector('base');
    if(!base){
      base=doc.createElement('base');
      base.setAttribute('data-dini-template-base','source-truth');
      (doc.head||doc.documentElement).prepend(base);
    }else{
      base.setAttribute('data-dini-template-base','source-truth');
    }
    base.setAttribute('href',baseHref);

    // Media authority patch.
    const map=mediaReplacementMapFromSnapshot(snap);
    let mediaCount=0;
    const replaceAttr=(el,name)=>{
      const before=String(el.getAttribute(name)||'');
      if(!before)return;
      let next=before;
      for(const [old,to] of map){
        if(next===old)next=to;
        else if(next.includes(old))next=next.split(old).join(to);
      }
      if(next!==before){el.setAttribute(name,next);mediaCount++}
    };
    if(map.size){
      for(const a of doc.querySelectorAll('a[href]')){
        replaceAttr(a,'href');
        for(const at of [...a.attributes])if(/^data-/i.test(at.name))replaceAttr(a,at.name);
      }
    }
    doc.documentElement.setAttribute('data-dini-media-authority-prepatched',String(mediaCount));
    doc.documentElement.setAttribute('data-dini-media-authority-map-size',String(map.size));

    // Cover performance contract, unchanged visually.
    let coverPreloads=0;
    const cover=doc.querySelector('#cover');
    if(cover){
      const style=doc.createElement('style');
      style.setAttribute('data-dini-cover-performance','1');
      style.textContent=`
        html.dini-cover-perf-active #cover{
          will-change:opacity,transform;
          backface-visibility:hidden;
          -webkit-backface-visibility:hidden;
          isolation:isolate;
        }
        html.dini-cover-perf-active #cover [data-native-reveal]{
          backface-visibility:hidden;
          -webkit-backface-visibility:hidden;
        }
        html.dini-cover-staging #cover [data-native-reveal]{
          animation-play-state:paused!important;
          -webkit-animation-play-state:paused!important;
        }
      `;
      (doc.head||doc.documentElement).appendChild(style);

      const urls=new Set();
      for(const img of cover.querySelectorAll('img[src]')){
        const u=String(img.getAttribute('src')||'').trim();
        if(u)urls.add(u);
        img.setAttribute('fetchpriority','high');
        img.setAttribute('loading','eager');
      }
      const ids=[...cover.querySelectorAll('[data-id]')].map(x=>String(x.getAttribute('data-id')||'').trim()).filter(Boolean);
      for(const st of doc.querySelectorAll('style')){
        const css=String(st.textContent||'');
        if(!css||!css.includes('background-image'))continue;
        for(const id of ids){
          let pos=0;
          const needle='elementor-element-'+id;
          while((pos=css.indexOf(needle,pos))>=0){
            const open=css.indexOf('{',pos);
            const close=open>=0?css.indexOf('}',open):-1;
            if(open<0||close<0||open-pos>600){pos+=needle.length;continue}
            const rule=css.slice(open+1,close);
            const m=rule.match(/background-image\s*:\s*url\(\s*["']?([^"')]+)["']?\s*\)/i);
            if(m?.[1])urls.add(m[1]);
            pos=close+1;
          }
        }
      }
      for(const href of [...urls].slice(0,4)){
        if(!/^https?:\/\//i.test(href))continue;
        const link=doc.createElement('link');
        link.rel='preload';
        link.as='image';
        link.href=href;
        link.setAttribute('fetchpriority','high');
        link.setAttribute('data-dini-cover-preload','1');
        (doc.head||doc.documentElement).appendChild(link);
        coverPreloads++;
      }

      const nativeRuntime=doc.querySelector('script[data-dini-source-native-runtime]');
      if(nativeRuntime?.parentNode){
        const coverScript=doc.createElement('script');
        coverScript.src=localAsset('/assets/js/cover-entrance-performance-v1.js?v=102');
        coverScript.setAttribute('data-dini-cover-performance-runtime','1');
        nativeRuntime.parentNode.insertBefore(coverScript,nativeRuntime);

        const motionScript=doc.createElement('script');
        motionScript.src=localAsset('/assets/js/motion-section-sequence-v1.js?v=150');
        motionScript.setAttribute('data-dini-motion-section-sequence-runtime','1');
        nativeRuntime.parentNode.insertBefore(motionScript,nativeRuntime);
      }
    }
    doc.documentElement.setAttribute('data-dini-cover-performance-preloads',String(coverPreloads));

    // Gallery images stay source-identical, but network/decode work waits until
    // the existing gallery runtime's large pre-viewport window is reached.
    let galleryCount=0;
    for(const el of doc.querySelectorAll('.e-gallery-image[data-thumbnail],[data-native-gallery-image][data-thumbnail]')){
      const original=String(el.getAttribute('data-thumbnail')||'').trim();
      if(!original)continue;
      const runtime=galleryThumbUrl(original,720,68);
      if(!runtime)continue;
      el.setAttribute('data-dini-gallery-bg',original);
      el.setAttribute('data-dini-gallery-bg-runtime',runtime);
      el.setAttribute('data-dini-gallery-bg-deferred','1');
      el.removeAttribute('data-dini-gallery-bg-loaded');
      el.removeAttribute('data-dini-gallery-bg-loading');
      el.style.removeProperty('background-image');
      galleryCount++;
    }
    if(galleryCount){
      doc.documentElement.setAttribute('data-dini-gallery-optimized-count',String(galleryCount));
      doc.documentElement.setAttribute('data-dini-gallery-preload-count','0');
    }

    return {
      html:'<!doctype html>\n'+doc.documentElement.outerHTML,
      mediaCount,
      mapSize:map.size,
      coverPreloads,
      galleryCount
    };
  };
  const guestContractFromPackage=pkg=>{
    const m=pkg?.manifest||{},s=pkg?.snapshot||{};
    const candidates=[
      m?.runtime_manifest?.personalization,
      m?.personalization_contract,
      m?.source_graph?.personalization,
      s?.manifest?.runtime_manifest?.personalization,
      s?.manifest?.personalization_contract,
      s?.manifest?.source_graph?.personalization,
      s?.source_graph?.personalization
    ];
    return candidates.find(x=>Array.isArray(x?.fields)&&x.fields.length)||candidates.find(x=>x&&typeof x==='object')||{};
  };
  const runtimeManifestFromPackage=pkg=>{
    const m=pkg?.manifest||{},s=pkg?.snapshot||{};
    const candidates=[
      m?.runtime_manifest,
      s?.manifest?.runtime_manifest,
      s?.runtime_manifest
    ];
    return candidates.find(x=>x?.format==='dini-universal-runtime-manifest')||
      candidates.find(x=>x&&typeof x==='object')||{};
  };
  const layoutContractFromPackage=pkg=>{
    const m=pkg?.manifest||{},s=pkg?.snapshot||{};
    const candidates=[
      m?.runtime_manifest?.layout,
      m?.layout_topology,
      m?.source_graph?.layout,
      s?.manifest?.runtime_manifest?.layout,
      s?.manifest?.layout_topology,
      s?.manifest?.source_graph?.layout,
      s?.source_graph?.layout
    ];
    return candidates.find(x=>x&&typeof x==='object'&&x.topology)||candidates.find(x=>x&&typeof x==='object')||{version:1,topology:'unclassified',runtime:{viewport_policy:'canonical-content'}};
  };

  async function getActiveTemplate(){
    const q='id,name,slug,source_path,updated_at,manifest_json';
    const r=await fetch(SB+'/rest/v1/templates?select='+encodeURIComponent(q)+'&is_active=eq.true&limit=1',{headers:H,cache:'no-store'});
    if(!r.ok)throw new Error('Template aktif HTTP '+r.status);
    const row=(await r.json())?.[0];
    return row||{id:'template-1-local',name:'Template 1',slug:'template-1',source_path:'/',updated_at:Date.now(),manifest_json:{template_original:true,asset_base:location.origin+'/'}};
  }

  async function getGuest(){
    if(MODE!=='guest')return null;
    const pathSlug=decodeURIComponent(location.pathname.replace(/^\/+|\/+$/g,'')).toLowerCase();
    const querySlug=String(new URLSearchParams(location.search).get('guest_slug')||'').trim().toLowerCase();
    const slug=(querySlug||pathSlug).replace(/[^a-z0-9-]/g,'');
    if(!slug)throw new Error('Link tamu tidak valid.');
    const r=await fetch(SB+'/rest/v1/rpc/resolve_guest_slug_v2',{method:'POST',headers:H,body:JSON.stringify({p_slug:slug}),cache:'no-store'});
    if(!r.ok)throw new Error(r.status===404||r.status===400?'Guest RPC belum tersedia.':'Guest resolver HTTP '+r.status);
    const j=await r.json();const guest=Array.isArray(j)?j[0]:j;
    if(!guest?.name)throw new Error('Tamu tidak ditemukan.');
    return {
      name:String(guest.name),
      slug:String(guest.guest_slug||slug),
      ramah_tamah_side:String(guest.ramah_tamah_side||'').trim().toLowerCase()
    };
  }

  async function loadSnapshot(row,manifest){
    const snapUrl=String(manifest?.editor_snapshot_url||'').trim();
    if(snapUrl){
      const u=new URL(snapUrl,location.href);u.searchParams.set(MODE==='guest'?'_guest':'_public',String(row.updated_at||Date.now()));
      const r=await fetch(u.href,{cache:'no-store'});if(!r.ok)throw new Error('Editor Snapshot HTTP '+r.status);return await r.json();
    }
    if(String(row?.slug||'').toLowerCase()==='template-1'){
      const u='/template-1-original/editor-snapshot.json?_'+MODE+'='+encodeURIComponent(row.updated_at||Date.now());
      const r=await fetch(u,{cache:'no-store'});if(r.ok)return await r.json();
    }
    return null;
  }

  async function loadPackage(row){
    let manifest={...(row.manifest_json||{})};
    let snap=await loadSnapshot(row,manifest);
    if(snap){
      if(snap?.template_id&&String(snap.template_id)!==String(row.id)&&String(row.id)!=='template-1-local')throw new Error('Snapshot template mismatch.');
      const exact=isSourceTruth(snap);
      if(!exact&&window.DINI_TEMPLATE_CANONICAL_V1160?.resolveSnapshot)snap=window.DINI_TEMPLATE_CANONICAL_V1160.resolveSnapshot(snap);
      const html=String(snap?.html||snap?.baseHtml||'');if(!html)throw new Error('Snapshot HTML kosong.');
      manifest={...manifest,...(snap.manifest||{})};
      return {
        html,manifest,snapshot:snap,source_truth:exact,
        authority:{schema:snap.schema||{},values:snap.values||{},transforms:snap.transforms||{},persistent:true,template_id:row.id,revision:snap.revision||manifest.revision||'',authority_hash:snap.authority_hash||manifest.authority_hash||'',applied_html_hash:snap.applied_html_hash||manifest.fetch_applied_html_hash||''}
      };
    }
    const source=String(row.source_path||'').trim();
    if(!source||source==='/')throw new Error('Template aktif belum memiliki source snapshot.');
    const u=new URL(source,location.href);u.searchParams.set(MODE==='guest'?'_guest':'_public',String(row.updated_at||Date.now()));
    const r=await fetch(u.href,{cache:'no-store'});if(!r.ok)throw new Error('Template HTML HTTP '+r.status);
    return {html:await r.text(),manifest,snapshot:null,source_truth:false,authority:null};
  }

  function prepareHtml(pkg,row,guest){
    const prepared=prepareSourceDocument(
      pkg.html,
      pkg.manifest,
      String(row.source_path||''),
      pkg.snapshot
    );
    let html=prepared.html;
    const galleryPerf={count:prepared.galleryCount||0,preloadCount:0};
    document.documentElement.dataset.publicMediaAuthorityPrepatched=String(prepared.mediaCount||0);
    document.documentElement.dataset.publicCoverPerformancePreloads=String(prepared.coverPreloads||0);
    document.documentElement.dataset.publicMediaAuthorityMapSize=String(prepared.mapSize||0);
    document.documentElement.dataset.publicGalleryOptimized=String(prepared.galleryCount||0);
    document.documentElement.dataset.publicPreparePasses='1';
    const blocks=[];
    const runtimeManifest=runtimeManifestFromPackage(pkg);
    blocks.push('<script src="'+localAsset('/assets/js/live-stream-contract-v1.js?v=101')+'"></script>');
    if(runtimeManifest&&Object.keys(runtimeManifest).length){
      blocks.push('<script type="application/json" id="diniSemanticRuntimeManifest">'+safeJson(runtimeManifest)+'</script>');
    }
    if(pkg.source_truth){
      blocks.push('<script>document.documentElement.dataset.diniSourceTruthPublic="1";document.documentElement.dataset.diniPublicCompatibility="source-truth-exact-plus-runtime-compat";</script>');
      blocks.push('<script src="'+localAsset('/assets/js/icon-contract-v1.js?v=100')+'"></script>');
      blocks.push('<script src="'+localAsset('/assets/js/source-truth-runtime-compat-v1.js?v=125')+'"></script>');
      blocks.push('<script src="'+localAsset('/assets/js/testimonial-carousel-runtime-v1.js?v=104')+'"></script>');
      if(galleryPerf.count){
        blocks.push('<script src="'+localAsset('/assets/js/gallery-performance-v1.js?v=141')+'"></script>');
        blocks.push('<script src="'+localAsset('/assets/js/gallery-breathing-v1.js?v=130')+'"></script>');
        blocks.push('<script src="'+localAsset('/assets/js/gallery-love-shared-layer-v1.js?v=140')+'"></script>');
      }
    }else{
      if(pkg.authority){
        blocks.push('<script type="application/json" id="diniSnapshotAuthorityData">'+safeJson(pkg.authority)+'</script>');
        blocks.push('<script src="/dashboard-admin-template/snapshot-authority-v1162.js?v=1162"></script>');
      }
      blocks.push('<script src="/assets/js/public-visibility-chain-v1241.js?v=1241"></script>');
    }
    if(guest){
      const contract=guestContractFromPackage(pkg);
      blocks.push('<script type="application/json" id="diniGuestRuntimeData">'+safeJson(guest)+'</script>');
      blocks.push('<script type="application/json" id="diniGuestPersonalizationContract">'+safeJson(contract)+'</script>');
      blocks.push('<script src="'+localAsset('/assets/js/guest-contract-core-v1.js?v=112')+'"></script>');
      blocks.push('<script src="'+localAsset('/assets/js/guest-runtime-v1.js?v=214')+'"></script>');
    }
    blocks.push('<script src="'+localAsset('/assets/js/ramah-tamah-runtime-v1.js?v=110')+'"></script>');
    blocks.push('<script src="'+localAsset('/assets/js/live-stream-gallery-marquee-v1.js?v=100')+'"></script>');
    const giftWhatsappBySide={
      dini:'6285702606816',
      faqih:'62895328484764'
    };
    const giftWhatsapp=giftWhatsappBySide[String(guest?.ramah_tamah_side||'').toLowerCase()]||giftWhatsappBySide.dini;
    blocks.push('<script type="application/json" id="diniRsvpGiftFeatureConfig">'+safeJson({
      invitationId:String(CFG.invitationId||''),
      giftWhatsapp,
      giftWhatsappSide:String(guest?.ramah_tamah_side||'').toLowerCase()||'public-default-dini'
    })+'</script>');
    blocks.push('<script src="'+localAsset('/assets/js/rsvp-gift-feature-runtime-v1.js?v=132')+'"></script>');
    return appendRuntime(html,blocks);
  }

  function renderFrame(html,title,layout={}){
    const frame=document.createElement('iframe');
    frame.id='diniPublicCanonicalFrame';frame.title=title||'Undangan Faqih & Dini';
    frame.setAttribute('allow','autoplay; fullscreen; clipboard-read; clipboard-write');
    frame.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
    const topology=String(layout?.topology||'unclassified');
    const fullDocument=layout?.runtime?.viewport_policy==='full-document'||topology==='split-shell'||topology==='fixed-sidebar';
    frame.style.cssText=fullDocument
      ?'display:block;width:100vw;max-width:none;height:100vh;height:100dvh;border:0;margin:0;background:#fff;box-shadow:none;position:relative;z-index:0'
      :'display:block;width:min(100vw,450px);max-width:450px;height:100vh;height:100dvh;border:0;margin:0 auto;background:#fff;box-shadow:none;position:relative;z-index:0';
    frame.style.visibility='hidden';
    frame.style.opacity='0';
    frame.style.pointerEvents='none';
    frame.srcdoc=String(html||'');

    document.documentElement.style.cssText='margin:0;width:100%;height:100%;background:#fff;overflow:hidden';
    document.body.style.cssText=fullDocument
      ?'margin:0;width:100%;height:100%;background:#fff;overflow:hidden;display:block;position:relative'
      :'margin:0;width:100%;height:100%;background:#fff;overflow:hidden;display:flex;justify-content:center;align-items:stretch;position:relative';

    const loader=state?.isConnected?state:null;
    if(loader){
      loader.style.position='fixed';
      loader.style.inset='0';
      loader.style.zIndex='20';
      loader.style.margin='0';
      loader.style.boxSizing='border-box';
      loader.style.transition='opacity 460ms cubic-bezier(.22,1,.36,1)';
      loader.style.opacity='1';
      loader.style.pointerEvents='auto';
      try{
        const cs=getComputedStyle(loader);
        if(cs.backgroundColor==='rgba(0, 0, 0, 0)'&&cs.backgroundImage==='none'){
          loader.style.backgroundColor='#fff';
        }
      }catch{}
      document.body.insertBefore(frame,loader);
    }else{
      document.body.appendChild(frame);
    }

    let presented=false;
    let presenting=false;
    const started=performance.now();
    const minLoaderMs=2600;
    let minPresentTimer=0;
    let readyMessageHandler=null;

    const childApi=()=>{
      try{return frame.contentWindow?.DINI_COVER_ENTRANCE_PERFORMANCE_V1||null}catch{return null}
    };
    const childReady=()=>{
      try{
        const api=childApi();
        const root=frame.contentDocument?.documentElement;
        return !!(api?.ready||root?.hasAttribute('data-dini-cover-entrance-ready'));
      }catch{return false}
    };
    const releaseChild=()=>{
      try{
        const api=childApi();
        if(api?.release)api.release();
      }catch{}
    };
    const present=()=>{
      if(presented||presenting)return;
      const elapsed=performance.now()-started;
      if(elapsed<minLoaderMs){
        if(!minPresentTimer){
          minPresentTimer=setTimeout(()=>{
            minPresentTimer=0;
            present();
          },Math.max(0,minLoaderMs-elapsed));
        }
        return;
      }

      presenting=true;
      frame.style.visibility='visible';
      frame.style.opacity='1';
      document.documentElement.dataset.publicCoverFirstPaintReady=childReady()?'1':'fallback';
      document.documentElement.dataset.publicLoaderDuration=String(Math.round(performance.now()-started));

      const releaseAfterHandoff=()=>{
        requestAnimationFrame(()=>requestAnimationFrame(releaseChild));
      };

      if(loader?.isConnected){
        // Freeze the tiny decorative loops while the heavy iframe performs its
        // first visible paint behind the opaque loader. After two compositor
        // frames, fade the loader itself. This avoids visible stutter caused by
        // SVG/iframe paint competing in the same frame.
        loader.setAttribute('data-phase','settling');
        loader.setAttribute('aria-busy','false');
        loader.style.pointerEvents='none';

        requestAnimationFrame(()=>requestAnimationFrame(()=>{
          presented=true;
          presenting=false;
          frame.style.pointerEvents='auto';
          loader.style.opacity='0';
          setTimeout(()=>{
            try{loader.remove()}catch{}
            releaseAfterHandoff();
          },520);
        }));
      }else{
        presented=true;
        presenting=false;
        frame.style.pointerEvents='auto';
        releaseAfterHandoff();
      }

      if(readyMessageHandler)window.removeEventListener('message',readyMessageHandler);
    };

    const check=()=>{
      if(presented||presenting)return;
      if(childReady())return present();
      if(performance.now()-started>=1500)return present();
      requestAnimationFrame(check);
    };

    readyMessageHandler=event=>{
      if(event.source!==frame.contentWindow)return;
      if(event.data?.type==='dini-cover-entrance-ready')present();
    };
    window.addEventListener('message',readyMessageHandler);
    frame.addEventListener('load',()=>requestAnimationFrame(check),{once:true});
    requestAnimationFrame(check);
    setTimeout(present,3200);

    document.documentElement.dataset.publicCanonicalViewport=fullDocument?'source-layout':'450';
    document.documentElement.dataset.publicLayoutTopology=topology;
    document.documentElement.dataset.publicLayoutViewportPolicy=fullDocument?'full-document':'canonical-content';
    return frame;
  }

  (async()=>{
    try{
      const [row,guest]=await Promise.all([getActiveTemplate(),getGuest()]);
      const pkg=await loadPackage(row);
      const html=prepareHtml(pkg,row,guest);
      const layout=layoutContractFromPackage(pkg);
      const runtimeManifest=runtimeManifestFromPackage(pkg);
      document.documentElement.dataset.publicCanonicalMode=MODE;
      document.documentElement.dataset.publicSourceTruthVersion=String(sourceTruthVersion(pkg.snapshot||pkg.manifest));
      document.documentElement.dataset.publicPackagePolicy=pkg.source_truth?'exact-source-truth-snapshot':'legacy-canonical-compatibility';
      document.documentElement.dataset.guestSourceRestore=guest?'global-personalization-contract':'not-guest';
      if(guest){document.title='Untuk '+guest.name+' — Faqih & Dini';}else document.title='Dini & Faqih';
      const frame=renderFrame(html,guest?'Untuk '+guest.name:'Undangan Faqih & Dini',layout);
      const bindConsumer=()=>{
        try{
          const api=window.DiniSourceConsumerContract;
          if(!api?.bindFrame||!runtimeManifest||!Object.keys(runtimeManifest).length)return false;
          api.bindFrame(frame,runtimeManifest,{
            mode:guest?'guest':'public',
            invitationId:String(CFG.invitationId||''),
            guestName:String(guest?.name||''),
            templateId:String(row.id||'')
          });
          document.documentElement.dataset.publicConsumerContract=api.version||'';
          document.documentElement.dataset.publicRuntimeManifest=String(runtimeManifest.compiler||'');
          return true;
        }catch(err){console.warn('PUBLIC_CONSUMER_BIND',err);return false}
      };
      bindConsumer();
      [80,250,700,1600,3500].forEach(ms=>setTimeout(bindConsumer,ms));
    }catch(err){
      console.error('PUBLIC_SOURCE_TRUTH_RENDERER_V1',err);
      fail(MODE==='guest'?'Undangan belum dapat dimuat':'Template belum dapat dimuat',err?.message||String(err),500);
    }
  })();

  window.DINI_PUBLIC_SOURCE_TRUTH_RENDERER={VERSION,sourceTruthVersion,isSourceTruth,guestContractFromPackage,runtimeManifestFromPackage,layoutContractFromPackage,mediaReplacementMapFromSnapshot,reconcileSnapshotImageLinks,optimizeCoverEntrance,deferHeavyGalleryBackgrounds};
})();
