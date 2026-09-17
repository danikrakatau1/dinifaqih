(()=>{
  'use strict';

  const CFG=window.DINI_PUBLIC_ENTRY||{};
  const MODE=CFG.mode==='guest'?'guest':'public';
  const SB='https://jfvmcerrsxjvbiogfqes.supabase.co';
  const KEY='sb_publishable_3IqSDxkpxCGiDpxAEwdsXQ_AsJpsC4W';
  const H={apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'};
  const state=document.getElementById('diniPublicState');
  const GUEST_SENTINEL='__DINI_GUEST_PROBE__';
  const KNOWN_ART_JAWA_COKLAT_3='https://web.galeriundanganofficial.com/art-jawa-coklat-3/';

  const esc=s=>String(s||'').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
  const fail=(title,msg,code=500)=>{
    document.title=title+' — Faqih & Dini';
    if(state)state.innerHTML='<div><b>'+esc(title)+'</b><small>'+esc(msg||'')+'</small></div>';
    document.documentElement.dataset.publicEntryError=String(code);
  };
  const dirname=raw=>{
    try{
      const u=new URL(raw,location.href);
      if(/\.[a-z0-9]{1,8}$/i.test(u.pathname.split('/').pop()||''))u.pathname=u.pathname.replace(/[^/]*$/,'');
      if(!u.pathname.endsWith('/'))u.pathname+='/';
      u.search='';u.hash='';
      return u.href;
    }catch{return ''}
  };
  const embeddedBase=(html,manifest={},fallback='')=>{
    try{
      const doc=new DOMParser().parseFromString(String(html||''),'text/html');
      const raw=String(doc.querySelector('base')?.getAttribute('href')||'').trim();
      if(raw){
        const d=dirname(new URL(raw,manifest.origin_source_url||manifest.source_url||manifest.asset_base||fallback||location.href).href);
        if(d)return d;
      }
    }catch{}
    for(const raw of [manifest.origin_source_url,manifest.source_url,manifest.asset_base,fallback]){
      const d=dirname(raw);if(d)return d;
    }
    return location.origin+'/';
  };
  const isTemplate1=row=>String(row?.slug||'').toLowerCase()==='template-1';

  async function getActiveTemplate(){
    const q='id,name,slug,source_path,updated_at,manifest_json';
    const r=await fetch(SB+'/rest/v1/templates?select='+encodeURIComponent(q)+'&is_active=eq.true&limit=1',{headers:{apikey:KEY,Authorization:'Bearer '+KEY},cache:'no-store'});
    if(!r.ok)throw new Error('Template aktif HTTP '+r.status);
    const row=(await r.json())?.[0];
    return row||{id:'template-1-local',name:'Template 1',slug:'template-1',source_path:'/',updated_at:Date.now(),manifest_json:{template_original:true,asset_base:location.origin+'/'}};
  }

  async function getGuest(){
    if(MODE!=='guest')return null;
    const pathSlug=decodeURIComponent(location.pathname.replace(/^\/+|\/+$/g,'')).toLowerCase();
    const querySlug=(new URLSearchParams(location.search).get('guest_slug')||'').trim().toLowerCase();
    const slug=(querySlug||pathSlug).replace(/[^a-z0-9-]/g,'');
    if(!slug)throw new Error('Link tamu tidak valid.');
    const r=await fetch(SB+'/rest/v1/rpc/resolve_guest_slug',{method:'POST',headers:H,body:JSON.stringify({p_slug:slug}),cache:'no-store'});
    if(!r.ok){
      if(r.status===404||r.status===400)throw new Error('Guest RPC belum tersedia.');
      throw new Error('Guest resolver HTTP '+r.status);
    }
    const j=await r.json();
    const guest=Array.isArray(j)?j[0]:j;
    if(!guest?.name)throw new Error('Tamu tidak ditemukan.');
    return {name:String(guest.name),slug:String(guest.guest_slug||slug)};
  }

  async function loadSnapshot(row,manifest){
    const snapUrl=String(manifest.editor_snapshot_url||'').trim();
    if(snapUrl){
      try{
        const u=new URL(snapUrl,location.href);
        u.searchParams.set(MODE==='guest'?'_guest':'_public',String(row.updated_at||Date.now()));
        const r=await fetch(u.href,{cache:'no-store'});
        if(!r.ok)throw new Error('Editor Snapshot HTTP '+r.status);
        return await r.json();
      }catch(err){
        if(!isTemplate1(row))throw err;
        console.warn('Template 1 cloud snapshot fallback:',err);
      }
    }
    if(isTemplate1(row)){
      const u='/template-1-original/editor-snapshot.json?_'+MODE+'='+encodeURIComponent(row.updated_at||Date.now());
      const r=await fetch(u,{cache:'no-store'});
      if(!r.ok)throw new Error('Template 1 local snapshot HTTP '+r.status);
      return await r.json();
    }
    return null;
  }

  async function loadCanonical(row){
    let manifest={...(row.manifest_json||{})};
    let html='';
    let authority=null;
    let snap=await loadSnapshot(row,manifest);
    if(snap){
      if(snap?.template_id&&String(snap.template_id)!==String(row.id)&&String(row.id)!=='template-1-local')throw new Error('Snapshot template mismatch.');
      if(window.DINI_TEMPLATE_CANONICAL_V1160?.resolveSnapshot)snap=window.DINI_TEMPLATE_CANONICAL_V1160.resolveSnapshot(snap);
      html=String(snap?.html||snap?.baseHtml||'');
      if(!html)throw new Error('Snapshot HTML kosong.');
      manifest={...manifest,...(snap.manifest||{})};
      authority={schema:snap.schema||{},values:snap.values||{},transforms:snap.transforms||{},persistent:true,template_id:row.id,revision:snap.revision||manifest.revision||''};
    }else{
      const source=String(row.source_path||'').trim();
      if(!source||source==='/')throw new Error('Template aktif belum memiliki source snapshot.');
      const u=new URL(source,location.href);
      u.searchParams.set(MODE==='guest'?'_guest':'_public',String(row.updated_at||Date.now()));
      const r=await fetch(u.href,{cache:'no-store'});
      if(!r.ok)throw new Error('Template HTML HTTP '+r.status);
      html=await r.text();
    }
    return {html,manifest,authority};
  }

  const deepestWith=(doc,text)=>{
    const all=[...doc.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,label,div')].filter(n=>String(n.textContent||'').includes(text));
    return all.find(n=>![...n.children].some(c=>String(c.textContent||'').includes(text)))||all[0]||null;
  };
  const widgetOf=n=>n?.closest?.('.elementor-widget')||n?.parentElement||null;
  const widgetKey=n=>String(n?.getAttribute?.('data-id')||'').trim();
  const findWidget=(doc,key)=>{
    if(!key)return null;
    try{return doc.querySelector(`[data-id="${CSS.escape(key)}"]`)}catch{return null}
  };
  const hasGuestSlot=doc=>!!doc.querySelector('[data-native-guest-name],[data-guest-name],[data-dini-guest-name],#guestName,.guest-name,.guest_name,.nama-tamu,.nama_tamu');
  const hasKnownArtJawaAnchors=doc=>!!(findWidget(doc,'fd2b4a3')&&findWidget(doc,'5361f63'));
  const isCloudRevisionUrl=raw=>{try{const u=new URL(String(raw||''),location.href);return /supabase\.co$/i.test(u.hostname)&&/\/storage\/v1\/object\/public\/template-packages\//i.test(u.pathname)}catch{return false}};
  const isOriginCandidate=raw=>{try{const u=new URL(String(raw||''),location.href);if(!/^https?:$/.test(u.protocol)||isCloudRevisionUrl(u.href))return false;if(u.origin===location.origin)return false;if(/\/wp-content\//i.test(u.pathname))return false;const last=u.pathname.split('/').filter(Boolean).pop()||'';if(/\.[a-z0-9]{2,8}$/i.test(last))return false;return true}catch{return false}};

  function originSourceForProbe(baseHtml,manifest,row){
    const explicit=[manifest?.origin_source_url,manifest?.original_source_url,manifest?.fetch_source_url,manifest?.upstream_source_url,manifest?.source_page_url];
    for(const raw of explicit)if(isOriginCandidate(raw))return new URL(raw).href;
    try{
      const d=new DOMParser().parseFromString(String(baseHtml||''),'text/html');
      const b=String(d.querySelector('base')?.getAttribute('href')||'').trim();
      if(b){const absolute=new URL(b,manifest?.source_url||row?.source_path||location.href).href;if(isOriginCandidate(absolute))return absolute}
      if(hasKnownArtJawaAnchors(d))return KNOWN_ART_JAWA_COKLAT_3;
    }catch{}
    for(const raw of [manifest?.source_url,manifest?.asset_base,row?.source_path])if(isOriginCandidate(raw))return new URL(raw).href;
    return '';
  }

  const setGuestLeaf=(root,value)=>{
    const all=[root,...(root.querySelectorAll?.('h1,h2,h3,h4,h5,h6,p,span,label,div')||[])];
    const leaf=all.find(n=>String(n.textContent||'').includes(GUEST_SENTINEL)&&![...(n.children||[])].some(c=>String(c.textContent||'').includes(GUEST_SENTINEL)));
    if(!leaf)return null;
    leaf.textContent=value;
    leaf.setAttribute('data-native-guest-name','1');
    leaf.setAttribute('data-dini-guest-name','1');
    leaf.setAttribute('data-dini-guest-injected','1');
    leaf.setAttribute('data-dini-guest-slot-mode','source-probe');
    root.setAttribute('data-dini-guest-source-probe-widget','1');
    return leaf;
  };

  function transplantProbeWidget(baseHtml,probeHtml,guestName){
    const baseDoc=new DOMParser().parseFromString(String(baseHtml||''),'text/html');
    if(hasGuestSlot(baseDoc))return {html:baseHtml,restored:false,mode:'existing-slot'};
    const probeDoc=new DOMParser().parseFromString(String(probeHtml||''),'text/html');
    const leaf=deepestWith(probeDoc,GUEST_SENTINEL),probeWidget=widgetOf(leaf);
    if(!leaf||!probeWidget)return {html:baseHtml,restored:false,mode:'probe-sentinel-missing'};
    const key=widgetKey(probeWidget),existing=findWidget(baseDoc,key);
    if(existing&&setGuestLeaf(existing,guestName))return {html:'<!doctype html>\n'+baseDoc.documentElement.outerHTML,restored:true,mode:'probe-existing',widget_id:key};
    const clone=probeWidget.cloneNode(true);
    if(!setGuestLeaf(clone,guestName))return {html:baseHtml,restored:false,mode:'probe-clone-failed'};
    const prevKey=widgetKey(probeWidget.previousElementSibling),nextKey=widgetKey(probeWidget.nextElementSibling);
    const next=findWidget(baseDoc,nextKey),prev=findWidget(baseDoc,prevKey);
    if(next?.parentElement)next.parentElement.insertBefore(clone,next);
    else if(prev?.parentElement)prev.parentElement.insertBefore(clone,prev.nextSibling);
    else return {html:baseHtml,restored:false,mode:'probe-anchor-missing'};
    return {html:'<!doctype html>\n'+baseDoc.documentElement.outerHTML,restored:true,mode:'source-probe',widget_id:key||'',prev_id:prevKey||'',next_id:nextKey||''};
  }

  function legacyTemplate2Restore(baseHtml,guestName,row,manifest){
    const doc=new DOMParser().parseFromString(String(baseHtml||''),'text/html');
    if(hasGuestSlot(doc))return {html:baseHtml,restored:false,mode:'existing-slot'};
    const source=String(manifest?.origin_source_url||manifest?.original_source_url||manifest?.source_url||'').toLowerCase();
    const isKnown=/^template-2(?:-|$)/i.test(String(row?.slug||''))||source.includes('/art-jawa-coklat-3/')||hasKnownArtJawaAnchors(doc);
    if(!isKnown)return {html:baseHtml,restored:false,mode:'not-known-source'};
    const sal=findWidget(doc,'fd2b4a3'),place=findWidget(doc,'5361f63');
    if(!sal?.parentElement||!place?.parentElement||sal.parentElement!==place.parentElement)return {html:baseHtml,restored:false,mode:'legacy-anchor-missing'};
    const w=doc.createElement('div');
    w.className='elementor-element elementor-element-b3551e3 elementor-widget elementor-widget-heading';
    w.setAttribute('data-id','b3551e3');w.setAttribute('data-element_type','widget');w.setAttribute('data-widget_type','heading.default');w.setAttribute('data-dini-guest-source-probe-widget','source-native-fallback');
    const c=doc.createElement('div');c.className='elementor-widget-container';
    const h=doc.createElement('h2');h.className='elementor-heading-title elementor-size-default';h.textContent=guestName;
    h.setAttribute('data-native-guest-name','1');h.setAttribute('data-dini-guest-name','1');h.setAttribute('data-dini-guest-injected','1');h.setAttribute('data-dini-guest-slot-mode','source-restore');
    c.appendChild(h);w.appendChild(c);place.parentElement.insertBefore(w,place);
    return {html:'<!doctype html>\n'+doc.documentElement.outerHTML,restored:true,mode:'source-native-fallback',widget_id:'b3551e3'};
  }

  async function restoreGuestSlotBeforeRender(baseHtml,manifest,row,guestName){
    if(MODE!=='guest'||!guestName)return {html:baseHtml,restored:false,mode:'not-guest'};
    const doc=new DOMParser().parseFromString(String(baseHtml||''),'text/html');
    if(hasGuestSlot(doc))return {html:baseHtml,restored:false,mode:'existing-slot'};
    const rawSource=originSourceForProbe(baseHtml,manifest,row);
    if(rawSource){
      manifest.origin_source_url=rawSource;
      document.documentElement.dataset.guestOriginSource=rawSource;
      try{
        const u=new URL(rawSource);u.searchParams.set('to',GUEST_SENTINEL);
        const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6500);
        let r;
        try{r=await fetch('/api/fetch-source?url='+encodeURIComponent(u.href),{headers:{Accept:'application/json'},cache:'no-store',signal:controller.signal})}
        finally{clearTimeout(timer)}
        const j=await r.json().catch(()=>({ok:false}));
        if(r.ok&&j.ok){const out=transplantProbeWidget(baseHtml,j.html||'',guestName);if(out.restored)return {...out,origin_source_url:rawSource}}
      }catch(err){console.warn('GUEST_SOURCE_PROBE_RUNTIME',err)}
    }
    const fallback=legacyTemplate2Restore(baseHtml,guestName,row,manifest);
    return rawSource&&fallback.restored?{...fallback,origin_source_url:rawSource}:fallback;
  }

  function injectAuthorityAndGuest(html,authority,guest){
    const blocks=[];
    if(authority){
      const a=JSON.stringify(authority).replace(/</g,'\\u003c').replace(/-->/g,'--\\>');
      blocks.push('<script type="application/json" id="diniSnapshotAuthorityData">'+a+'</script>');
      blocks.push('<script src="/dashboard-admin-edit/template-canonical-v1160.js?v=1160"></script>');
      blocks.push('<script src="/dashboard-admin-template/snapshot-authority-v1162.js?v=1162"></script>');
    }
    blocks.push('<script src="/assets/js/public-visibility-chain-v1241.js?v=1241"></script>');
    if(guest){
      const g=JSON.stringify(guest).replace(/</g,'\\u003c').replace(/-->/g,'--\\>');
      blocks.push('<script type="application/json" id="diniGuestRuntimeData">'+g+'</script>');
      blocks.push('<script src="/assets/js/guest-runtime-v1.js?v=17-20260914c"></script>');
    }
    const block=blocks.join('');
    return /<\/body>/i.test(html)?html.replace(/<\/body>/i,block+'</body>'):html+block;
  }

  function injectTemplate1Watchdog(html){
    const watchdog='<script data-dini-template1-watchdog>('+function(){
      var done=false;
      function clear(){
        if(done)return;
        var p=document.getElementById('preloader');
        if(!p)return;
        done=true;
        try{p.classList.add('done')}catch(e){}
        setTimeout(function(){try{p.hidden=true;p.style.display='none';p.style.pointerEvents='none'}catch(e){}},520);
      }
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(clear,180)},{once:true});
      else setTimeout(clear,180);
      window.addEventListener('load',clear,{once:true});
      setTimeout(clear,1600);
    }.toString()+')();</script>';
    return /<\/body>/i.test(html)?html.replace(/<\/body>/i,watchdog+'</body>'):html+watchdog;
  }

  function injectInteractionGuard(html){
    const guard='<script data-dini-public-interaction-v224>('+function(){
      var busy=false;
      function isOpenControl(el){
        var c=el&&el.closest&&el.closest('#openInvitation,#tombolbuka,.tombolbuka,[data-native-open],[data-open-invitation],[data-action="open-invitation"],a,button,[role="button"]');
        if(!c)return null;
        var t=(c.textContent||'').replace(/\s+/g,' ').trim();
        return c.matches('#openInvitation,#tombolbuka,.tombolbuka,[data-native-open],[data-open-invitation],[data-action="open-invitation"]')||/\b(buka\s+undangan|open\s+invitation)\b/i.test(t)?c:null;
      }
      var revealObserver=null;
      function restoreRevealEngine(main){
        if(!main)return;
        var nodes=[].slice.call(main.querySelectorAll('.reveal'));
        if(!nodes.length)return;
        nodes.forEach(function(el){el.classList.remove('elementor-invisible');el.style.removeProperty('opacity');el.style.removeProperty('visibility')});
        if('IntersectionObserver' in window){
          if(!revealObserver)revealObserver=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting){entry.target.classList.add('visible');revealObserver.unobserve(entry.target)}})},{threshold:.12});
          nodes.forEach(function(el){if(!el.classList.contains('visible'))revealObserver.observe(el)});
        }
      }
      function recoverOpen(){
        if(busy)return;busy=true;
        try{
          document.body.classList.remove('stop-scrolling','locked-section');document.body.classList.add('opened');document.documentElement.classList.add('native-opened');
          ['html','body'].forEach(function(q){var n=document.querySelector(q);if(n){n.style.setProperty('overflow-y','auto','important');n.style.setProperty('height','auto','important')}});
          var main=document.querySelector('#mainContent');
          if(main){main.classList.remove('hidden');main.hidden=false;main.removeAttribute('aria-hidden');main.style.removeProperty('display');main.style.removeProperty('visibility');main.style.removeProperty('opacity');restoreRevealEngine(main)}
          var covers=[document.querySelector('#opening'),document.querySelector('#cover')].filter(Boolean);
          covers.forEach(function(c){var cs=getComputedStyle(c);if(cs.display==='none'||cs.visibility==='hidden'||parseFloat(cs.opacity||'1')<.05)return;c.style.transition=c.style.transition||'opacity .65s ease, transform .8s ease, visibility .65s ease';c.style.opacity='0';c.style.visibility='hidden';c.style.pointerEvents='none';if(c.id==='cover')c.style.transform='translateY(-100%)';setTimeout(function(){c.hidden=true;c.style.setProperty('display','none','important')},800)});
          document.querySelectorAll('.elementor-top-section,body>section').forEach(function(sec){if(covers.indexOf(sec)>=0)return;sec.hidden=false;sec.removeAttribute('aria-hidden');if(getComputedStyle(sec).display==='none')sec.style.setProperty('display','block','important')});
          var aud=document.querySelector('#bgMusic,#song,audio');if(aud&&aud.play)aud.play().catch(function(){});
          setTimeout(function(){try{window.scrollTo(0,0)}catch(e){}},30);
        }finally{setTimeout(function(){busy=false},900)}
      }
      function repairState(){
        var opening=document.querySelector('#opening'),cover=document.querySelector('#cover'),main=document.querySelector('#mainContent');
        if(main){var cs=getComputedStyle(main);if(main.hidden||main.classList.contains('hidden')||cs.display==='none'||cs.visibility==='hidden')return 'open';restoreRevealEngine(main)}
        var opened=document.body.classList.contains('opened')||document.documentElement.classList.contains('native-opened');
        if(opened)return 'ok';
        if((opening&&getComputedStyle(opening).display!=='none'&&getComputedStyle(opening).visibility!=='hidden')||(cover&&getComputedStyle(cover).display!=='none'&&getComputedStyle(cover).visibility!=='hidden'))return 'open';
        return 'ok';
      }
      function scheduleRepair(){[120,700,1800].forEach(function(ms){setTimeout(function(){if(repairState()==='open')recoverOpen()},ms)})}
      document.addEventListener('click',function(ev){var c=isOpenControl(ev.target);if(!c)return;scheduleRepair()},true);
      document.addEventListener('touchend',function(ev){var c=isOpenControl(ev.target);if(!c)return;scheduleRepair()},{capture:true,passive:true});
    }.toString()+')();</script>';
    return /<\/body>/i.test(html)?html.replace(/<\/body>/i,guard+'</body>'):html+guard;
  }

  function prepareBaseAndPublicLayers(html,row,manifest,authority,guest){
    const source=String(row.source_path||'').trim();
    const t1=isTemplate1(row);
    const assetBase=t1?location.origin+'/':embeddedBase(html,manifest,source);
    html=html.replace(/<base\b[^>]*data-dini-template-base[^>]*>/ig,'').replace(/<base\b[^>]*>/ig,'');
    html=html.replace(/<head(\s[^>]*)?>/i,m=>m+'<base data-dini-template-base="1" href="'+assetBase.replace(/"/g,'&quot;')+'">');
    if(t1){
      const rev=encodeURIComponent(row.updated_at||Date.now());
      html=html.replace(/((?:src|href)=["'])(?:https?:\/\/[^/"']+)?(\/assets\/(?:js|css)\/[^"'?#]+)(?:\?[^"']*)?(["'])/gi,(_,a,path,q)=>a+path+'?_publictpl='+rev+q);
      if(!/\/assets\/css\/style\.css/i.test(html))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/css/style.css?_publictpl='+rev+'"></head>');
      html=injectTemplate1Watchdog(html);
    }
    html=injectInteractionGuard(html);
    html=injectAuthorityAndGuest(html,authority,guest);
    return html;
  }

  function renderFrame(html,title){
    const frame=document.createElement('iframe');
    frame.id='diniPublicCanonicalFrame';
    frame.title=title||'Undangan Faqih & Dini';
    frame.setAttribute('allow','autoplay; fullscreen; clipboard-read; clipboard-write');
    frame.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
    frame.style.display='block';
    frame.style.width='min(100vw, 450px)';
    frame.style.maxWidth='450px';
    frame.style.height='100vh';
    frame.style.height='100dvh';
    frame.style.border='0';
    frame.style.margin='0 auto';
    frame.style.background='#fff';
    frame.style.boxShadow='none';
    frame.srcdoc=String(html||'');
    document.documentElement.style.cssText='margin:0;width:100%;height:100%;background:#fff;overflow:hidden';
    document.body.style.cssText='margin:0;width:100%;height:100%;background:#fff;overflow:hidden;display:flex;justify-content:center;align-items:stretch';
    document.body.replaceChildren(frame);
    document.documentElement.dataset.publicCanonicalViewport='450';
  }

  (async()=>{
    try{
      const [row,guest]=await Promise.all([getActiveTemplate(),getGuest()]);
      let {html,manifest,authority}=await loadCanonical(row);
      let guestRestore={mode:'not-guest'};
      if(guest){
        guestRestore=await restoreGuestSlotBeforeRender(html,manifest,row,guest.name);
        html=guestRestore.html;
      }
      html=prepareBaseAndPublicLayers(html,row,manifest,authority,guest);
      if(guest){
        document.title='Untuk '+guest.name+' — Faqih & Dini';
        try{history.replaceState(history.state,'',location.pathname)}catch{}
      }else{
        document.title=(row.name?row.name+' — ':'')+'Faqih & Dini';
      }
      document.documentElement.dataset.publicCanonicalMode=MODE;
      document.documentElement.dataset.guestSourceRestore=guestRestore.mode||'none';
      renderFrame(html,guest?'Untuk '+guest.name:'Undangan Faqih & Dini');
    }catch(err){
      console.error('PUBLIC_CANONICAL_RENDERER_V181',err);
      fail(MODE==='guest'?'Undangan belum dapat dimuat':'Template belum dapat dimuat',err.message||String(err),500);
    }
  })();
})();