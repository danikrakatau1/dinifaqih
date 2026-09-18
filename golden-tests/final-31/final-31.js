(()=>{
  'use strict';

  const SOURCES=[
    ['01 jawa','https://web.galeriundanganofficial.com/jawa/'],
    ['02 art-jawa-coklat-2','https://web.galeriundanganofficial.com/art-jawa-coklat-2/'],
    ['03 art-jawa-coklat-3','https://web.galeriundanganofficial.com/art-jawa-coklat-3/'],
    ['04 jawa-merah','https://web.galeriundanganofficial.com/jawa-merah/'],
    ['05 art-jawa-merah-2','https://web.galeriundanganofficial.com/art-jawa-merah-2/'],
    ['06 art-jawa-merah-3','https://web.galeriundanganofficial.com/art-jawa-merah-3/'],
    ['07 art-jawa-merah-4','https://web.galeriundanganofficial.com/art-jawa-merah-4/'],
    ['08 jawa-biru','https://web.galeriundanganofficial.com/jawa-biru/'],
    ['09 art-jawa-biru-2','https://web.galeriundanganofficial.com/art-jawa-biru-2/'],
    ['10 art-jawa-biru-3','https://web.galeriundanganofficial.com/art-jawa-biru-3/'],
    ['11 art-jawa-hitam','https://web.galeriundanganofficial.com/art-jawa-hitam/'],
    ['12 art-bali','https://web.galeriundanganofficial.com/art-bali/'],
    ['13 art-2-kito','https://web.galeriundanganofficial.com/art-2-kito/'],
    ['14 art-palembang-2','https://web.galeriundanganofficial.com/art-palembang-2/'],
    ['15 art-batak','https://galeriundanganofficial.com/art-batak/'],
    ['16 art-batak-2','https://web.galeriundanganofficial.com/art-batak-2/'],
    ['17 art-batak-3','https://web.galeriundanganofficial.com/art-batak-3/'],
    ['18 art-lampung-2','https://web.galeriundanganofficial.com/art-lampung-2/'],
    ['19 art-chinese','https://web.galeriundanganofficial.com/art-chinese/'],
    ['20 art-chinese-2','https://web.galeriundanganofficial.com/art-chinese-2/'],
    ['21 minang','https://web.galeriundanganofficial.com/minang/'],
    ['22 art-minang-2','https://web.galeriundanganofficial.com/art-minang-2/'],
    ['23 art-minang-3','https://web.galeriundanganofficial.com/art-minang-3/'],
    ['24 art-melayu','https://web.galeriundanganofficial.com/art-melayu/'],
    ['25 art-sunda-merah-2','https://web.galeriundanganofficial.com/art-sunda-merah-2/'],
    ['26 art-sunda','https://web.galeriundanganofficial.com/art-sunda/'],
    ['27 art-bugis-merah','https://web.galeriundanganofficial.com/art-bugis-merah/'],
    ['28 art-bugis','https://web.galeriundanganofficial.com/art-bugis/'],
    ['29 art-banjar','https://web.galeriundanganofficial.com/art-banjar/'],
    ['30 art-aceh-2','https://web.galeriundanganofficial.com/art-aceh-2/'],
    ['31 art-toraja','https://web.galeriundanganofficial.com/art-toraja/']
  ];

  const rowsEl=document.getElementById('rows');
  const runBtn=document.getElementById('runBtn');
  const copyBtn=document.getElementById('copyBtn');
  const statusEl=document.getElementById('status');
  const sourceCountEl=document.getElementById('sourceCount');
  const checkCountEl=document.getElementById('checkCount');
  const failureCountEl=document.getElementById('failureCount');
  const engineVersionEl=document.getElementById('engineVersion');
  const progressEl=document.getElementById('progress');
  const reportEl=document.getElementById('report');
  let latestReport=null;

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const abs=(u,b)=>{try{return new URL(u,b).href}catch{return String(u||'')}};
  const has=(html,re)=>re.test(String(html||''));

  function rowCard(source){
    const el=document.createElement('article');
    el.className='row running';
    el.innerHTML='<div class="head"><strong>'+esc(source[0])+'</strong><span class="tag">WAITING</span></div><div class="detail">'+esc(source[1])+'</div><div class="failures"></div>';
    rowsEl.appendChild(el);
    return el;
  }

  function setRow(el,result){
    const failed=result.checks.filter(x=>!x.pass);
    el.className='row '+(failed.length?'fail':'ok');
    el.querySelector('.tag').textContent=failed.length?'FAIL '+failed.length:'PASS '+result.checks.length;
    el.querySelector('.detail').textContent='CSS '+result.css_count+' · source '+result.bytes+' B · graph V'+(result.source_truth_version||0)+' · '+(result.compiler||'no manifest');
    el.querySelector('.failures').textContent=failed.map(x=>x.id+(x.actual!==undefined?' ['+String(x.actual)+']':'')).join(' · ');
  }

  async function fetchLinkedCss(html,base){
    const doc=new DOMParser().parseFromString(html,'text/html');
    const links=[...doc.querySelectorAll('link[rel~="stylesheet"][href]')].map(x=>abs(x.getAttribute('href'),base)).filter(Boolean);
    const ranked=[...new Set(links)].sort((a,b)=>{
      const score=u=>(/\/post-\d+\.css(?:\?|$)/i.test(u)?100:/uploads\/elementor\/css/i.test(u)?80:/elementor/i.test(u)?50:0);
      return score(b)-score(a);
    }).slice(0,14);
    const out=[];
    for(const url of ranked){
      try{
        const r=await fetch('/api/fetch-asset?url='+encodeURIComponent(url)+'&offset=0&size=3000000',{cache:'no-store'});
        if(!r.ok)continue;
        const text=await r.text();
        if(text&&/[{}]/.test(text))out.push({url,text});
      }catch{}
    }
    return out;
  }

  function rawFlags(html){
    return {
      embedded_css:has(html,/data:text\/css;base64/i),
      embedded_js:has(html,/data:(?:text|application)\/javascript;base64/i),
      parallax:has(html,/(?:data-bdt-parallax|bdt-parallax|uk-parallax)/i),
      scrollspy:has(html,/(?:data-bdt-scrollspy|bdt-scrollspy|uk-scrollspy)/i),
      carousel:has(html,/data-widget_type=(?:"|&quot;)(?:image-carousel|media-carousel|testimonial-carousel)\.default/i),
      gallery:has(html,/(?:data-widget_type=(?:"|&quot;)gallery\.default|e-gallery-container|elementor-gallery)/i),
      timeline:has(html,/(?:weddingpress-timeline|bdt-timeline|data-widget_type=(?:"|&quot;)[^"\s&]*timeline[^"\s&]*\.default)/i),
      counter:has(html,/(?:elementor-widget-counter|data-widget_type=(?:"|&quot;)counter\.default)/i),
      progressbar:has(html,/(?:swiper-pagination-progressbar|progressbar|progress-bar)/i),
      live_instagram:has(html,/LIVE\s+INSTAGRAM/i),
      calendar:has(html,/(?:calendar\.google\.com|google\.com\/calendar|outlook\.live\.com|outlook\.office\.com)/i)
    };
  }

  function makeCheck(list,id,pass,actual){
    list.push({id,pass:!!pass,...(actual!==undefined?{actual}:{})});
  }

  async function testOne(name,url){
    const checks=[];
    const r=await fetch('/api/fetch-source?url='+encodeURIComponent(url),{cache:'no-store'});
    const j=await r.json().catch(()=>({ok:false,error:'invalid-json'}));
    makeCheck(checks,'fetch-source',r.ok&&j.ok,j.error||r.status);
    if(!r.ok||!j.ok)return {name,url,checks,bytes:0,css_count:0,source_truth_version:0,compiler:''};

    const html=String(j.html||'');
    const base=j.url||url;
    const flags=rawFlags(html);
    makeCheck(checks,'source-html-nonempty',html.length>50000,html.length);

    const cssSources=await fetchLinkedCss(html,base);
    const doc=new DOMParser().parseFromString(html,'text/html');
    const graph=window.DiniVisualResolver.makeSourceGraph(doc,{baseUrl:base,cssSources});
    const plan=graph?.lifecycle?.safe_plan||{};
    makeCheck(checks,'source-truth-v1',Number(graph?.source_truth_version||0)>=1,graph?.source_truth_version||0);
    makeCheck(checks,'safe-plan-source-delay',plan.uses_source_delays===true,plan.uses_source_delays);
    makeCheck(checks,'safe-plan-no-synthetic-stagger',plan.synthetic_stagger===false,plan.synthetic_stagger);
    makeCheck(checks,'safe-plan-no-arbitrary-js',plan.arbitrary_source_js===false,plan.arbitrary_source_js);
    makeCheck(checks,'runtime-fault-isolation',graph?.runtime_policy?.fault_isolation===true,graph?.runtime_policy?.fault_isolation);

    const manifest=window.DiniSemanticManifest.compile({
      doc,
      sourceGraph:graph,
      visualManifest:{version:3,sources:[]},
      nativeSchema:{version:1,fields:[]},
      sourceUrl:base,
      createdAt:new Date().toISOString()
    });
    const counts=manifest?.diagnostics?.counts||{};
    makeCheck(checks,'manifest-format',manifest?.format==='dini-universal-runtime-manifest',manifest?.format);
    makeCheck(checks,'manifest-compiler-v2.5',manifest?.compiler==='dini-semantic-manifest-v2.5.0',manifest?.compiler);
    makeCheck(checks,'authority-no-arbitrary-js',manifest?.authority?.arbitrary_source_js===false,manifest?.authority?.arbitrary_source_js);
    makeCheck(checks,'layout-contract',!!manifest?.layout?.topology,manifest?.layout?.topology||'');
    makeCheck(checks,'consumer-contract-v1',manifest?.editor_contract?.consumer_contract_version===1,manifest?.editor_contract?.consumer_contract_version);
    makeCheck(checks,'consumer-source-dom',manifest?.editor_contract?.native_form_source_dom_preserved===true,manifest?.editor_contract?.native_form_source_dom_preserved);
    makeCheck(checks,'consumer-wp-admin-ajax-off',manifest?.editor_contract?.native_form_upstream_wp_admin_ajax===false,manifest?.editor_contract?.native_form_upstream_wp_admin_ajax);
    makeCheck(checks,'consumer-wp-nonce-off',manifest?.editor_contract?.native_form_upstream_wp_nonce===false,manifest?.editor_contract?.native_form_upstream_wp_nonce);
    makeCheck(checks,'consumer-manifest-driven',manifest?.runtime_policy?.consumer_execution==='manifest-driven-source-dom-preserving',manifest?.runtime_policy?.consumer_execution);
    makeCheck(checks,'consumer-reload-persistent',manifest?.runtime_policy?.consumer_reload_persistent===true,manifest?.runtime_policy?.consumer_reload_persistent);
    makeCheck(checks,'semantic-auto-fix-off',manifest?.semantic_diagnostics?.policy?.auto_fix===false,manifest?.semantic_diagnostics?.policy?.auto_fix);

    makeCheck(checks,'native-rsvp',Number(counts.native_rsvp_forms||0)>0,counts.native_rsvp_forms||0);
    makeCheck(checks,'native-gift',Number(counts.native_gift_forms||0)>0,counts.native_gift_forms||0);
    makeCheck(checks,'native-guestbook',Number(counts.native_guestbook_forms||0)>0,counts.native_guestbook_forms||0);
    makeCheck(checks,'countdown-adapter',Number(counts.countdown_adapters||0)>0,counts.countdown_adapters||0);
    makeCheck(checks,'background-slideshow',Number(counts.background_slideshows||0)>0,counts.background_slideshows||0);
    makeCheck(checks,'responsive-animation-adapter',Number(counts.elementor_animation_adapters||0)>0,counts.elementor_animation_adapters||0);
    makeCheck(checks,'action-contract',Number(counts.action_contract_total||0)>0,counts.action_contract_total||0);

    if(flags.embedded_css)makeCheck(checks,'conditional:embedded-css',Number(counts.embedded_css||0)>0,counts.embedded_css||0);
    if(flags.embedded_js)makeCheck(checks,'conditional:embedded-js-evidence',Number(counts.embedded_javascript||0)>0,counts.embedded_javascript||0);
    if(flags.parallax)makeCheck(checks,'conditional:parallax',Number(counts.parallax_adapters||0)>0,counts.parallax_adapters||0);
    if(flags.scrollspy)makeCheck(checks,'conditional:scrollspy',Number(counts.scrollspy_adapters||0)>0,counts.scrollspy_adapters||0);
    if(flags.carousel)makeCheck(checks,'conditional:carousel',Number(counts.carousel_adapters||0)>0,counts.carousel_adapters||0);
    if(flags.gallery)makeCheck(checks,'conditional:gallery',Number(counts.gallery_adapters||0)>0,counts.gallery_adapters||0);
    if(flags.timeline)makeCheck(checks,'conditional:timeline',Number(counts.timeline_adapters||0)>0,counts.timeline_adapters||0);
    if(flags.counter)makeCheck(checks,'conditional:counter',Number(counts.counter_adapters||0)>0,counts.counter_adapters||0);
    if(flags.progressbar)makeCheck(checks,'conditional:progressbar',Number(counts.carousel_progressbar||0)>0,counts.carousel_progressbar||0);
    if(flags.live_instagram)makeCheck(checks,'conditional:live-instagram',Number(counts.live_ctas||0)>0,counts.live_ctas||0);
    if(flags.calendar)makeCheck(checks,'conditional:calendar',Number(counts.calendar_ctas||0)>0,counts.calendar_ctas||0);

    return {
      name,url,checks,bytes:Number(j.bytes||html.length),css_count:cssSources.length,
      source_truth_version:graph?.source_truth_version||0,compiler:manifest?.compiler||'',
      topology:manifest?.layout?.topology||'',counts,flags
    };
  }

  async function run(){
    runBtn.disabled=true;copyBtn.disabled=true;rowsEl.innerHTML='';
    statusEl.textContent='RUNNING';sourceCountEl.textContent='0/31';checkCountEl.textContent='0';failureCountEl.textContent='0';progressEl.style.width='0%';
    const results=[];let totalChecks=0,totalFailures=0;

    const engineOkay=!!window.DiniVisualResolver&&!!window.DiniSourceRuntimeCompiler&&!!window.DiniSemanticManifest;
    let runtimeSyntax=false,runtimeError='';
    try{new Function(window.DiniSourceRuntimeCompiler.runtimeText());runtimeSyntax=true}catch(err){runtimeError=String(err?.message||err)}
    engineVersionEl.textContent=(window.DiniSemanticManifest?.version||'—')+(runtimeSyntax?' ✓':' ✕');
    if(!engineOkay||!runtimeSyntax){
      statusEl.textContent='ENGINE FAIL';
      latestReport={ok:false,engine:{engineOkay,runtimeSyntax,runtimeError}};
      reportEl.textContent=JSON.stringify(latestReport,null,2);copyBtn.disabled=false;runBtn.disabled=false;return;
    }

    for(let i=0;i<SOURCES.length;i++){
      const source=SOURCES[i],card=rowCard(source);card.querySelector('.tag').textContent='RUNNING';
      let result;
      try{result=await testOne(source[0],source[1])}
      catch(err){result={name:source[0],url:source[1],checks:[{id:'exception',pass:false,actual:String(err?.message||err)}],bytes:0,css_count:0,source_truth_version:0,compiler:''}}
      results.push(result);setRow(card,result);
      const failed=result.checks.filter(x=>!x.pass).length;
      totalChecks+=result.checks.length;totalFailures+=failed;
      sourceCountEl.textContent=(i+1)+'/31';checkCountEl.textContent=String(totalChecks);failureCountEl.textContent=String(totalFailures);
      progressEl.style.width=((i+1)/SOURCES.length*100).toFixed(1)+'%';
      await new Promise(r=>setTimeout(r,40));
    }

    const failedSources=results.filter(x=>x.checks.some(c=>!c.pass));
    latestReport={
      ok:failedSources.length===0,
      version:1,
      suite:'DINI FAQIH FINAL 31/31 GOLDEN REGRESSION',
      generated_at:new Date().toISOString(),
      engine:{
        semantic_manifest:window.DiniSemanticManifest?.version||'',
        runtime_compiler:window.DiniSourceRuntimeCompiler?.version||'',
        visual_resolver:window.DiniVisualResolver?.version||'loaded',
        runtime_syntax:runtimeSyntax
      },
      totals:{sources:31,passed_sources:31-failedSources.length,failed_sources:failedSources.length,checks:totalChecks,failed_checks:totalFailures},
      results
    };
    statusEl.textContent=failedSources.length?'FAIL':'PASS 31/31';
    reportEl.textContent=JSON.stringify(latestReport,null,2);
    window.__DINI_FINAL_31_GOLDEN__=latestReport;
    copyBtn.disabled=false;runBtn.disabled=false;
  }

  copyBtn.onclick=async()=>{
    if(!latestReport)return;
    const text=JSON.stringify(latestReport,null,2);
    try{await navigator.clipboard.writeText(text);copyBtn.textContent='Copied ✓';setTimeout(()=>copyBtn.textContent='Copy JSON Report',1500)}
    catch{reportEl.hidden=false;reportEl.textContent=text}
  };
  runBtn.onclick=run;
  run();
})();