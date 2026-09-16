(()=>{
  'use strict';
  const out=document.getElementById('goldenOutput');
  const summary=document.getElementById('goldenSummary');
  const runBtn=document.getElementById('runGoldenBtn');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const checks=[];
  const check=(id,pass,detail,expected,actual)=>checks.push({id,pass:!!pass,detail,...(expected!==undefined?{expected}:{}),...(actual!==undefined?{actual}:{})});
  const abs=(u,b)=>{try{return new URL(u,b).href}catch{return String(u||'')}};

  function render(){
    const failed=checks.filter(x=>!x.pass);
    summary.className=failed.length?'fail':'ok';
    summary.textContent=failed.length?`FAIL · ${checks.length-failed.length}/${checks.length} PASS`:`PASS · ${checks.length}/${checks.length} checks`;
    out.innerHTML=checks.map(x=>`<article class="check ${x.pass?'ok':'fail'}"><strong>${x.pass?'PASS':'FAIL'} · ${esc(x.id)}</strong><p>${esc(x.detail||'')}</p>${x.expected!==undefined?`<small>expected: ${esc(JSON.stringify(x.expected))}</small>`:''}${x.actual!==undefined?`<small>actual: ${esc(JSON.stringify(x.actual))}</small>`:''}</article>`).join('');
  }

  async function fetchLinkedCss(html,base){
    const doc=new DOMParser().parseFromString(html,'text/html');
    const links=[...doc.querySelectorAll('link[rel~="stylesheet"][href]')].map(x=>abs(x.getAttribute('href'),base)).filter(Boolean);
    const ranked=[...new Set(links)].sort((a,b)=>{
      const score=u=>(/\/post-\d+\.css(?:\?|$)/i.test(u)?100:/elementor/i.test(u)?50:/uploads\/elementor\/css/i.test(u)?45:0);
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

  function visualFor(graph,type,id){return (graph?.visuals||[]).find(x=>x?.type===type&&x?.element_id===id)}

  async function run(){
    checks.length=0;runBtn.disabled=true;runBtn.textContent='RUNNING…';summary.className='running';summary.textContent='Running Template 7 golden rebuild…';out.innerHTML='';
    try{
      const fixture=await fetch('./fixture.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('fixture HTTP '+r.status);return r.json()});
      check('engine:visual-resolver',!!window.DiniVisualResolver,'DiniVisualResolver loaded');
      check('engine:source-truth-scanner',!!window.DiniSourceTruthScanner,'Source Truth Scanner loaded');
      check('engine:runtime-compiler',!!window.DiniSourceRuntimeCompiler,'Source Runtime Compiler loaded');

      const serverProbe=await fetch('/api/golden-template-7',{cache:'no-store'});
      const serverJson=await serverProbe.json().catch(()=>({ok:false}));
      check('server:golden-probe',serverProbe.ok&&serverJson.ok,'Pinned source/artifact server probe passes',true,serverJson.ok);

      const sourceRes=await fetch('/api/fetch-source?url='+encodeURIComponent(fixture.source_url),{cache:'no-store'});
      const sourceJson=await sourceRes.json();
      check('fetch:source-proxy',sourceRes.ok&&sourceJson.ok,'Production /api/fetch-source returns ART JAWA HITAM',true,sourceJson.ok);
      if(!sourceJson.ok)throw new Error(sourceJson.error||'Fetch source gagal');

      const html=String(sourceJson.html||'');
      for(const marker of fixture.source_markers)check('source-marker:'+marker,html.includes(marker),'Fetched source preserves '+marker);
      const cssSources=await fetchLinkedCss(html,sourceJson.url||fixture.source_url);
      check('fetch:linked-css',cssSources.some(x=>/post-340856\.css/i.test(x.url)),'Production CSS proxy captured post-340856.css');

      const doc=new DOMParser().parseFromString(html,'text/html');
      const graph=window.DiniVisualResolver.makeSourceGraph(doc,{baseUrl:sourceJson.url||fixture.source_url,cssSources});
      check('graph:source-truth-version',Number(graph?.source_truth_version||0)>=1,'Road-to-Final Source Truth enrichment active','>=1',graph?.source_truth_version);
      check('graph:engine',String(graph?.source_truth_engine||'').includes('dini-source-truth'),'Source Truth engine identified',true,graph?.source_truth_engine);
      check('graph:open-selector',(graph?.interactions||[]).some(x=>x?.type==='open-invitation'&&x?.selector===fixture.source_graph.open_selector),'Open invitation selector matches golden',fixture.source_graph.open_selector);

      const vg=fixture.source_graph.video_background;
      const video=visualFor(graph,'video-background',vg.element_id);
      check('graph:video-background',!!video&&String(video.url||'').endsWith(vg.url_suffix),'Opening background video owner/source matches golden',vg,video||null);

      for(const s of fixture.source_graph.slideshows){
        const found=visualFor(graph,'slideshow',s.element_id);
        const pass=!!found&&Number(found.duration)===s.duration&&String(found.transition||'')===s.transition&&Number(found.transition_duration)===s.transition_duration&&Boolean(found.ken_burns)===s.ken_burns&&(!s.ken_burns_direction||found.ken_burns_direction===s.ken_burns_direction);
        check('graph:slideshow:'+s.element_id,pass,'Slideshow timing/transition matches Template 7 golden',s,found||null);
      }

      for(const c of fixture.source_graph.critical_css){
        const pass=(graph?.visuals||[]).some(x=>x?.element_id===c.element_id&&String(x?.url||'').endsWith(c.url_suffix)&&String(x?.source_location||'')==='external-css');
        check('graph:css-owner:'+c.element_id,pass,'External CSS ownership matches Template 7 golden',c);
      }

      const p=graph?.compatibility_policy||{};
      check('policy:no-blanket-animation',p.blanket_animation_disable===false,'No global animation kill rule',false,p.blanket_animation_disable);
      check('policy:no-transform-reset',p.blanket_transform_reset===false,'No global transform reset',false,p.blanket_transform_reset);
      check('policy:no-visibility-force',p.blanket_visibility_force===false,'No blanket visibility force',false,p.blanket_visibility_force);
      check('policy:no-template-hardcode',p.template_specific_hardcode===false,'No Template 7 hardcode in global compatibility policy',false,p.template_specific_hardcode);

      const runtime=graph?.runtime_policy||{};
      for(const [key,expected] of Object.entries(fixture.runtime_contract))check('runtime:'+key,runtime[key]===expected,'Runtime compiler contract matches golden',expected,runtime[key]);
      check('runtime:safe-plan-source-delays',graph?.lifecycle?.safe_plan?.uses_source_delays===true,'Safe lifecycle plan keeps source-authored delays');
      check('runtime:no-synthetic-stagger',graph?.lifecycle?.safe_plan?.synthetic_stagger===false,'Safe lifecycle plan does not invent stagger');
      check('scanner:animations',Number(graph?.diagnostics?.animations||0)>0,'Animation scanner found authored animation nodes','>0',graph?.diagnostics?.animations||0);
      check('scanner:lifecycle',Number(graph?.diagnostics?.lifecycle_events||0)>0||Number(graph?.diagnostics?.lifecycle_timers||0)>0,'Lifecycle scanner found event/timer evidence','>0',{events:graph?.diagnostics?.lifecycle_events||0,timers:graph?.diagnostics?.lifecycle_timers||0});
      check('scanner:layers',Number(graph?.diagnostics?.layers||0)>0,'Layer/ownership scanner produced records','>0',graph?.diagnostics?.layers||0);
      check('scanner:media',Number(graph?.diagnostics?.media||0)>0,'Media classifier produced records','>0',graph?.diagnostics?.media||0);

      window.DiniVisualResolver.sanitizeRuntimeNoise(doc);
      const truthTpl=doc.querySelector('template[data-dini-source-truth]');
      check('rebuild:source-truth-embedded',!!truthTpl&&truthTpl.textContent.includes('source_truth_version'),'Rebuilt DOM embeds Source Truth package');
      check('rebuild:runtime-sanitized',doc.documentElement.getAttribute('data-dini-runtime-sanitized')==='1','Runtime sanitizer completed without flattening source');
      check('rebuild:cover-preserved',!!doc.querySelector('#cover'),'Cover remains present after rebuild');
      check('rebuild:open-button-preserved',!!doc.querySelector('#tombolbuka,.tombolbuka'),'Open Invitation control remains present after rebuild');
      check('rebuild:opening-section-preserved',!!doc.querySelector('[data-id="36dc2bf"],.elementor-element-36dc2bf'),'Opening motion section remains present after rebuild');

      window.__DINI_TEMPLATE7_GOLDEN__={fixture,graph,checks:[...checks],source:{url:sourceJson.url,bytes:sourceJson.bytes},cssSources:cssSources.map(x=>x.url)};
    }catch(err){
      check('golden:exception',false,err?.message||String(err));
      console.error('[TEMPLATE 7 GOLDEN]',err);
    }finally{
      render();runBtn.disabled=false;runBtn.textContent='RUN GOLDEN TEST';
    }
  }

  runBtn.addEventListener('click',run);
  run();
})();
