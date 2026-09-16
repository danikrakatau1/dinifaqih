(()=>{
  'use strict';
  if(window.__DINI_FETCH_DEEP_SOURCE_UI_V1__)return;
  window.__DINI_FETCH_DEEP_SOURCE_UI_V1__=true;
  const VERSION='1.0.0';
  const by=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=v=>Number(v||0);

  const style=document.createElement('style');
  style.textContent=`
    .deep-source-panel{margin-top:14px;border:1px solid rgba(116,205,151,.24);background:linear-gradient(180deg,rgba(13,31,23,.82),rgba(12,17,22,.9));border-radius:14px;padding:13px;display:grid;gap:12px}
    .deep-source-head{display:flex;gap:10px;align-items:flex-start;justify-content:space-between}.deep-source-head strong{display:block;font:800 12px/1.25 system-ui;letter-spacing:.04em}.deep-source-head small{display:block;margin-top:4px;color:#8fa39a;font:500 10px/1.4 system-ui}.deep-source-state{flex:0 0 auto;border:1px solid rgba(143,224,173,.28);border-radius:999px;padding:5px 8px;font:800 9px/1 system-ui;color:#8fe0ad;background:rgba(75,210,130,.08)}
    .deep-source-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.deep-source-metric{border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:9px;background:rgba(8,12,16,.68);min-width:0}.deep-source-metric b{display:block;font:800 15px/1 system-ui;color:#eff7f1}.deep-source-metric span{display:block;margin-top:5px;color:#7f8b86;font:700 8px/1.25 system-ui;text-transform:uppercase;letter-spacing:.05em;overflow-wrap:anywhere}
    .deep-source-flags{display:flex;flex-wrap:wrap;gap:6px}.deep-source-flag{border-radius:999px;padding:5px 7px;background:#141b1f;border:1px solid rgba(255,255,255,.08);color:#aeb8b2;font:700 8px/1 system-ui}.deep-source-flag.ok{color:#8fe0ad;border-color:rgba(75,210,130,.28);background:rgba(75,210,130,.06)}.deep-source-flag.warn{color:#f0c67d;border-color:rgba(240,198,125,.28);background:rgba(240,198,125,.06)}
    .deep-source-note{color:#8d9992;font:500 9px/1.45 system-ui}.deep-source-note b{color:#dce6df}
    @media(max-width:760px){.deep-source-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.deep-source-head{align-items:center}}
  `;
  document.head.appendChild(style);

  const report=document.querySelector('.report-card');
  if(!report)return;
  const panel=document.createElement('section');
  panel.className='deep-source-panel';
  panel.innerHTML=`
    <div class="deep-source-head"><div><strong>DEEP SOURCE TRUTH</strong><small>Media · layer ownership · animation · lifecycle · event graph · responsive · randomness · personalization</small></div><span id="deepSourceState" class="deep-source-state">WAITING</span></div>
    <div id="deepSourceGrid" class="deep-source-grid"></div>
    <div id="deepSourceFlags" class="deep-source-flags"></div>
    <div id="deepSourceNote" class="deep-source-note">Klik <b>Analyze Source</b>, lalu <b>Generate Rebuild</b> untuk membuat Source Truth Package lengkap. Angka Parity di atas tetap ditampilkan sebagai <b>legacy estimate</b>, bukan verdict Source Truth.</div>`;
  report.appendChild(panel);

  const scoreLabels=[...document.querySelectorAll('.score-grid .score span')];
  if(scoreLabels[0])scoreLabels[0].textContent='Legacy Parity Estimate';
  if(scoreLabels[1])scoreLabels[1].textContent='Editable Mapping';
  if(scoreLabels[2])scoreLabels[2].textContent='External JS Evidence';
  if(scoreLabels[3])scoreLabels[3].textContent='Legacy Unsupported';

  function metric(v,label){return `<div class="deep-source-metric"><b>${esc(v)}</b><span>${esc(label)}</span></div>`}
  function flag(text,state=''){return `<span class="deep-source-flag ${state}">${esc(text)}</span>`}

  function readSnapshot(){
    const raws=[];
    try{raws.push(sessionStorage.getItem('diniAnifRebuildSnapshot'))}catch{}
    try{raws.push(localStorage.getItem('diniAnifRebuildSnapshot'))}catch{}
    for(const raw of raws){if(!raw)continue;try{const j=JSON.parse(raw);if(j?.manifest?.source_graph)return j}catch{}}
    return null;
  }

  function renderPreload(){
    const gap=window.DiniSourceTruthGapClosure;
    const scripts=gap?.externalScripts||[];
    const loaded=scripts.filter(x=>x.loaded).length,failed=scripts.filter(x=>!x.loaded).length;
    by('deepSourceState').textContent=scripts.length?'JS EVIDENCE READY':'ANALYZING';
    by('deepSourceGrid').innerHTML=[metric(scripts.length,'external scripts detected'),metric(loaded,'external scripts loaded'),metric(failed,'external script fetch failed'),metric('—','source graph after Generate')].join('');
    by('deepSourceFlags').innerHTML=flag('Source Truth scanner','ok')+flag('Arbitrary source JS never executed','ok')+flag(scripts.length&&failed?'Partial external JS evidence':'External JS static evidence','warn');
  }

  function renderGraph(snap){
    const g=snap?.manifest?.source_graph;if(!g)return false;
    const d=g.diagnostics||{},deps=g.dependencies||{},life=g.lifecycle||{},resp=g.responsive?.behavior_contract||{},random=g.randomness||{},cp=g.compatibility_policy||{};
    const extTotal=(deps.external_script_records||[]).length;
    const extLoaded=num(deps.external_script_loaded);
    by('deepSourceState').textContent=g.source_truth_gap_closure_error?'SOURCE TRUTH WARN':'SOURCE TRUTH V'+num(g.source_truth_version||1);
    by('deepSourceGrid').innerHTML=[
      metric(num(d.media),'media'),metric(num(d.layers),'layers'),metric(num(d.animations),'animations'),metric(num(life.events?.length),'events'),
      metric(num(life.timers?.length),'timers'),metric(num(life.actions?.length),'actions'),metric(num(g.event_graph?.nodes?.length),'event graph nodes'),metric(num(g.event_graph?.edges?.length),'event graph edges'),
      metric(`${extLoaded}/${extTotal}`,'external JS evidence'),metric(num(resp.runtime_evidence?.length),'responsive runtime evidence'),metric(num(random.evidence?.length),'randomness evidence'),metric(num(d.personalization_fields),'personalization fields')
    ].join('');
    const flags=[];
    flags.push(flag('consume-do-not-reinterpret',g.authority?.editor_rule==='consume-do-not-reinterpret'?'ok':'warn'));
    flags.push(flag('no blanket animation kill',cp.blanket_animation_disable===false?'ok':'warn'));
    flags.push(flag('no blanket transform reset',cp.blanket_transform_reset===false?'ok':'warn'));
    flags.push(flag('randomness: '+(random.authored?'SOURCE-AUTHORED':'NONE DETECTED'),'ok'));
    flags.push(flag('media end-state: '+(cp.media_end_state?.strategy||'unknown'),cp.media_end_state?.strategy==='source-derived-only'?'ok':'warn'));
    flags.push(flag('external JS execution: blocked','ok'));
    flags.push(flag('responsive breakpoints: source only',resp.synthesize_breakpoints===false?'ok':'warn'));
    by('deepSourceFlags').innerHTML=flags.join('');
    by('dependencyScore').textContent=extTotal?`${extLoaded}/${extTotal} scanned`:(deps.external_scripts?.length?`${deps.external_scripts.length} refs`:'0');
    by('deepSourceNote').innerHTML=`Package <b>${esc(g.source_truth_engine||'Source Truth')}</b> · gap closure <b>${esc(g.source_truth_gap_closure_version||'—')}</b> · HTML hash <b>${esc(g.source?.html_hash||'—')}</b> · CSS hash <b>${esc(g.source?.css_hash||'—')}</b>. Deep metrics ini adalah authority report; Legacy Parity Estimate di atas hanya indikator historis.`;
    document.documentElement.dataset.fetchDeepSourceTruth='1';
    return true;
  }

  function refresh(){const snap=readSnapshot();if(snap&&renderGraph(snap))return;renderPreload()}

  by('analyzeBtn')?.addEventListener('click',()=>{by('deepSourceState').textContent='SCANNING';setTimeout(renderPreload,350);setTimeout(renderPreload,1200);setTimeout(renderPreload,2600)});
  by('buildBtn')?.addEventListener('click',()=>{by('deepSourceState').textContent='BUILDING TRUTH';[180,450,900,1600,2600].forEach(ms=>setTimeout(refresh,ms))});
  addEventListener('pageshow',refresh);
  setTimeout(refresh,120);
  window.DINI_FETCH_DEEP_SOURCE_UI={version:VERSION,refresh,readSnapshot};
})();
