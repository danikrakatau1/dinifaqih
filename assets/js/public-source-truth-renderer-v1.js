(()=>{
  'use strict';
  if(window.__DINI_PUBLIC_SOURCE_TRUTH_RENDERER_V1__)return;
  window.__DINI_PUBLIC_SOURCE_TRUTH_RENDERER_V1__=true;

  const VERSION='1.3.16';
  const CFG=window.DINI_PUBLIC_ENTRY||{};
  const MODE=CFG.mode==='guest'?'guest':'public';
  const SB='https://jfvmcerrsxjvbiogfqes.supabase.co';
  const KEY='sb_publishable_3IqSDxkpxCGiDpxAEwdsXQ_AsJpsC4W';
  const H={apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'};
  const state=document.getElementById('diniPublicState');

  const esc=s=>String(s||'').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
  const fail=(title,msg,code=500)=>{
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
      const doc=new DOMParser().parseFromString(String(html||''),'text/html');
      const authored=String(doc.querySelector('base')?.getAttribute('href')||'').trim();
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
    const r=await fetch(SB+'/rest/v1/rpc/resolve_guest_slug',{method:'POST',headers:H,body:JSON.stringify({p_slug:slug}),cache:'no-store'});
    if(!r.ok)throw new Error(r.status===404||r.status===400?'Guest RPC belum tersedia.':'Guest resolver HTTP '+r.status);
    const j=await r.json();const guest=Array.isArray(j)?j[0]:j;
    if(!guest?.name)throw new Error('Tamu tidak ditemukan.');
    return {name:String(guest.name),slug:String(guest.guest_slug||slug)};
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
    let html=ensureBase(pkg.html,pkg.manifest,String(row.source_path||''));
    const mediaPatch=reconcileSnapshotImageLinks(html,pkg.snapshot);
    html=mediaPatch.html;
    const galleryPerf=deferHeavyGalleryBackgrounds(html);
    html=galleryPerf.html;
    document.documentElement.dataset.publicMediaAuthorityPrepatched=String(mediaPatch.count||0);
    document.documentElement.dataset.publicMediaAuthorityMapSize=String(mediaPatch.mapSize||0);
    document.documentElement.dataset.publicGalleryOptimized=String(galleryPerf.count||0);
    const blocks=[];
    const runtimeManifest=runtimeManifestFromPackage(pkg);
    blocks.push('<script src="'+localAsset('/assets/js/live-stream-contract-v1.js?v=101')+'"></script>');
    if(runtimeManifest&&Object.keys(runtimeManifest).length){
      blocks.push('<script type="application/json" id="diniSemanticRuntimeManifest">'+safeJson(runtimeManifest)+'</script>');
    }
    if(pkg.source_truth){
      blocks.push('<script>document.documentElement.dataset.diniSourceTruthPublic="1";document.documentElement.dataset.diniPublicCompatibility="source-truth-exact-plus-runtime-compat";</script>');
      blocks.push('<script src="'+localAsset('/assets/js/icon-contract-v1.js?v=100')+'"></script>');
      blocks.push('<script src="'+localAsset('/assets/js/source-truth-runtime-compat-v1.js?v=123')+'"></script>');
      blocks.push('<script src="'+localAsset('/assets/js/testimonial-carousel-runtime-v1.js?v=102')+'"></script>');
      if(galleryPerf.count)blocks.push('<script src="'+localAsset('/assets/js/gallery-performance-v1.js?v=110')+'"></script>');
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
      blocks.push('<script src="'+localAsset('/assets/js/guest-runtime-v1.js?v=213')+'"></script>');
    }
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
      ?'display:block;width:100vw;max-width:none;height:100vh;height:100dvh;border:0;margin:0;background:#fff;box-shadow:none'
      :'display:block;width:min(100vw,450px);max-width:450px;height:100vh;height:100dvh;border:0;margin:0 auto;background:#fff;box-shadow:none';
    frame.srcdoc=String(html||'');
    document.documentElement.style.cssText='margin:0;width:100%;height:100%;background:#fff;overflow:hidden';
    document.body.style.cssText=fullDocument
      ?'margin:0;width:100%;height:100%;background:#fff;overflow:hidden;display:block'
      :'margin:0;width:100%;height:100%;background:#fff;overflow:hidden;display:flex;justify-content:center;align-items:stretch';
    document.body.replaceChildren(frame);
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
      if(guest){document.title='Untuk '+guest.name+' — Faqih & Dini';}else document.title=(row.name?row.name+' — ':'')+'Faqih & Dini';
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

  window.DINI_PUBLIC_SOURCE_TRUTH_RENDERER={VERSION,sourceTruthVersion,isSourceTruth,guestContractFromPackage,runtimeManifestFromPackage,layoutContractFromPackage,mediaReplacementMapFromSnapshot,reconcileSnapshotImageLinks,deferHeavyGalleryBackgrounds};
})();
