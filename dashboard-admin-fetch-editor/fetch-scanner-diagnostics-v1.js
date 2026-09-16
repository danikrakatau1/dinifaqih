(()=>{
  'use strict';
  if(window.__DINI_FETCH_SCANNER_DIAGNOSTICS_V1__)return;
  window.__DINI_FETCH_SCANNER_DIAGNOSTICS_V1__=true;

  const VERSION='1.0.0';
  const E=window.DINI_FETCH_V2;
  const frame=document.getElementById('previewFrame');
  const toolbar=document.querySelector('.preview-toolbar');
  if(!E||!toolbar)return;

  const h=E.handoffFromUrl();
  let graph=null;
  let session=null;
  let active='overview';
  let query='';

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const arr=v=>Array.isArray(v)?v:[];
  const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
  const yes=v=>v===true?'YES':v===false?'NO':v==null?'—':String(v);
  const compact=v=>{try{return typeof v==='string'?v:JSON.stringify(v)}catch{return String(v)}};
  const match=v=>!query||compact(v).toLowerCase().includes(query.toLowerCase());
  const count=(v,k)=>Number(obj(v)[k]||0);
  const visibleItems=list=>arr(list).filter(match);

  const style=document.createElement('style');
  style.textContent=`
    .dini-diag-launch{margin-left:8px;border:1px solid rgba(214,180,95,.35);background:rgba(214,180,95,.08);color:#e8cc83;border-radius:8px;padding:6px 9px;font:700 10px/1 system-ui;letter-spacing:.04em;cursor:pointer}
    .dini-diag-launch:hover{background:rgba(214,180,95,.16)}
    .dini-diag-launch[data-state="error"]{color:#ff9d9d;border-color:rgba(255,95,95,.45)}
    .dini-diag-shell{position:fixed;inset:0;z-index:2147483000;display:none;background:rgba(2,4,8,.68);backdrop-filter:blur(8px)}
    .dini-diag-shell.open{display:flex;justify-content:flex-end}
    .dini-diag-panel{width:min(760px,96vw);height:100%;background:#0d1118;color:#eef2f7;border-left:1px solid rgba(255,255,255,.1);box-shadow:-24px 0 80px rgba(0,0,0,.45);display:grid;grid-template-rows:auto auto auto 1fr;overflow:hidden}
    .dini-diag-head{display:flex;align-items:flex-start;gap:12px;padding:16px 18px;border-bottom:1px solid rgba(255,255,255,.08)}
    .dini-diag-title{min-width:0;flex:1}.dini-diag-title strong{display:block;font:800 14px/1.2 system-ui;letter-spacing:.04em}.dini-diag-title small{display:block;margin-top:5px;color:#8994a4;font:500 11px/1.35 system-ui}
    .dini-diag-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.dini-diag-actions button{border:1px solid rgba(255,255,255,.12);background:#151b24;color:#dce4ee;border-radius:8px;padding:7px 9px;font:700 10px/1 system-ui;cursor:pointer}.dini-diag-actions button:hover{background:#202938}.dini-diag-actions .close{font-size:14px;padding-inline:10px}
    .dini-diag-health{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:12px 18px;border-bottom:1px solid rgba(255,255,255,.07)}
    .dini-diag-metric{padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:10px;background:#111721}.dini-diag-metric b{display:block;font:800 16px/1 system-ui}.dini-diag-metric span{display:block;margin-top:5px;color:#7f8a9b;font:600 9px/1.2 system-ui;text-transform:uppercase;letter-spacing:.06em}
    .dini-diag-navrow{padding:10px 18px 12px;border-bottom:1px solid rgba(255,255,255,.08)}
    .dini-diag-search{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.1);background:#080c12;color:#e8edf4;border-radius:9px;padding:9px 11px;outline:none;font:500 11px/1.2 system-ui}.dini-diag-search:focus{border-color:rgba(214,180,95,.55)}
    .dini-diag-tabs{display:flex;gap:6px;overflow:auto;margin-top:9px;padding-bottom:2px}.dini-diag-tabs button{white-space:nowrap;border:1px solid rgba(255,255,255,.09);background:#111720;color:#9aa5b5;border-radius:999px;padding:6px 9px;font:700 9px/1 system-ui;cursor:pointer}.dini-diag-tabs button.active{color:#19160d;background:#d6b45f;border-color:#d6b45f}
    .dini-diag-body{overflow:auto;padding:14px 18px 28px}.dini-diag-section{margin-bottom:16px}.dini-diag-section h3{margin:0 0 8px;font:800 11px/1.2 system-ui;letter-spacing:.05em;text-transform:uppercase;color:#d8bd7b}
    .dini-diag-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.dini-diag-card{border:1px solid rgba(255,255,255,.08);border-radius:10px;background:#111720;padding:10px;min-width:0}.dini-diag-card.warn{border-color:rgba(255,183,77,.38)}.dini-diag-card.fail{border-color:rgba(255,95,95,.48)}.dini-diag-card.ok{border-color:rgba(75,210,130,.3)}
    .dini-diag-card strong{font:750 11px/1.3 system-ui}.dini-diag-card p{margin:6px 0 0;color:#a3aebe;font:500 10px/1.45 system-ui;overflow-wrap:anywhere}.dini-diag-kv{display:grid;grid-template-columns:minmax(100px,150px) 1fr;gap:5px 9px;font:500 10px/1.35 system-ui}.dini-diag-kv dt{color:#7f8a9a}.dini-diag-kv dd{margin:0;color:#d8dfe8;overflow-wrap:anywhere}.dini-diag-badge{display:inline-flex;align-items:center;border-radius:999px;padding:3px 6px;margin:0 4px 4px 0;background:#1c2531;color:#aeb9c8;font:700 9px/1 system-ui}.dini-diag-badge.ok{background:rgba(75,210,130,.12);color:#8fe0ad}.dini-diag-badge.warn{background:rgba(255,183,77,.12);color:#efc274}.dini-diag-badge.fail{background:rgba(255,95,95,.12);color:#ff9d9d}
    .dini-diag-list{display:grid;gap:7px}.dini-diag-item{border:1px solid rgba(255,255,255,.075);border-radius:9px;background:#0f151e;padding:9px}.dini-diag-item-head{display:flex;gap:8px;align-items:flex-start}.dini-diag-item-head b{font:750 10px/1.3 system-ui;overflow-wrap:anywhere}.dini-diag-index{flex:0 0 auto;color:#687486;font:800 9px/1.4 ui-monospace,monospace}.dini-diag-item pre{white-space:pre-wrap;overflow-wrap:anywhere;margin:7px 0 0;padding:7px;border-radius:7px;background:#090d13;color:#9da9ba;font:500 9px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;max-height:170px;overflow:auto}.dini-diag-empty{padding:20px;border:1px dashed rgba(255,255,255,.12);border-radius:10px;color:#7f8a9a;text-align:center;font:600 10px/1.5 system-ui}
    @media(max-width:720px){.dini-diag-health{grid-template-columns:repeat(2,minmax(0,1fr))}.dini-diag-grid{grid-template-columns:1fr}.dini-diag-head{padding:13px}.dini-diag-health,.dini-diag-navrow,.dini-diag-body{padding-left:13px;padding-right:13px}}
  `;
  document.head.appendChild(style);

  const launch=document.createElement('button');
  launch.type='button';launch.className='dini-diag-launch';launch.textContent='DIAGNOSTICS';launch.title='Buka Scanner Diagnostics — read-only Source Truth';
  toolbar.appendChild(launch);

  const shell=document.createElement('div');
  shell.className='dini-diag-shell';
  shell.innerHTML=`<section class="dini-diag-panel" role="dialog" aria-modal="true" aria-label="Scanner Diagnostics">
    <header class="dini-diag-head"><div class="dini-diag-title"><strong>SCANNER DIAGNOSTICS</strong><small id="diniDiagSubtitle">Source Truth package · read-only · tidak mengubah baseline</small></div><div class="dini-diag-actions"><button data-diag-action="refresh">Refresh</button><button data-diag-action="copy">Copy JSON</button><button data-diag-action="download">Export JSON</button><button class="close" data-diag-action="close">×</button></div></header>
    <div class="dini-diag-health" id="diniDiagHealth"></div>
    <div class="dini-diag-navrow"><input class="dini-diag-search" id="diniDiagSearch" type="search" placeholder="Filter diagnostics: selector, animation, event, URL, role…"><nav class="dini-diag-tabs" id="diniDiagTabs"></nav></div>
    <div class="dini-diag-body" id="diniDiagBody"></div>
  </section>`;
  document.body.appendChild(shell);

  const health=shell.querySelector('#diniDiagHealth');
  const tabs=shell.querySelector('#diniDiagTabs');
  const body=shell.querySelector('#diniDiagBody');
  const search=shell.querySelector('#diniDiagSearch');
  const subtitle=shell.querySelector('#diniDiagSubtitle');

  const tabDefs=[['overview','Overview'],['media','Media'],['layers','Layers'],['animations','Animations'],['lifecycle','Lifecycle'],['responsive','Responsive'],['dependencies','Dependencies'],['personalization','Personalization'],['policy','Policy']];

  function metric(value,label){return `<div class="dini-diag-metric"><b>${esc(value)}</b><span>${esc(label)}</span></div>`}
  function badge(text,state=''){return `<span class="dini-diag-badge ${state}">${esc(text)}</span>`}
  function kv(data,keys){return `<dl class="dini-diag-kv">${keys.map(([k,label=k])=>`<dt>${esc(label)}</dt><dd>${esc(data?.[k]??'—')}</dd>`).join('')}</dl>`}
  function item(title,data,i){return `<article class="dini-diag-item"><div class="dini-diag-item-head"><span class="dini-diag-index">#${i+1}</span><b>${esc(title)}</b></div><pre>${esc(JSON.stringify(data,null,2))}</pre></article>`}
  function list(title,items,titleFn=x=>x?.selector||x?.element_id||x?.id||x?.type||x?.event||x?.action||x?.api||x?.url||'record'){
    const rows=visibleItems(items);return `<section class="dini-diag-section"><h3>${esc(title)} · ${rows.length}/${arr(items).length}</h3>${rows.length?`<div class="dini-diag-list">${rows.map((x,i)=>item(titleFn(x),x,i)).join('')}</div>`:'<div class="dini-diag-empty">Tidak ada record yang cocok.</div>'}</section>`;
  }

  function healthState(){
    const d=obj(graph?.diagnostics),c=obj(graph?.compatibility_policy),a=obj(graph?.authority);
    const sourceOk=Number(graph?.source_truth_version||0)>=1&&!graph?.source_truth_error;
    const policyOk=c.blanket_animation_disable===false&&c.blanket_transform_reset===false&&c.blanket_visibility_force===false&&c.template_specific_hardcode===false;
    const hashOk=!!graph?.source?.html_hash;
    const authorityOk=!!a.source_truth&&a.editor_rule==='consume-do-not-reinterpret';
    return {d,c,a,sourceOk,policyOk,hashOk,authorityOk};
  }

  function renderHealth(){
    if(!graph){health.innerHTML=metric('—','Source Truth')+metric('—','Animations')+metric('—','Lifecycle')+metric('—','Media');return}
    const d=obj(graph.diagnostics);
    health.innerHTML=metric('V'+(graph.source_truth_version||'?'),'Source Truth')+metric(count(d,'animations')+' / '+count(d,'animation_apis'),'Anim / API')+metric(count(d,'lifecycle_events')+' / '+count(d,'lifecycle_timers'),'Event / Timer')+metric(count(d,'media'),'Media');
  }

  function renderTabs(){tabs.innerHTML=tabDefs.map(([id,label])=>`<button type="button" data-diag-tab="${id}" class="${active===id?'active':''}">${label}</button>`).join('')}

  function overview(){
    const s=healthState(),d=s.d,src=obj(graph?.source),deps=obj(graph?.dependencies),resp=obj(graph?.responsive?.source_truth),p=obj(graph?.personalization);
    const checks=[['SOURCE TRUTH',s.sourceOk,'Version/hash scanner tersedia'],['NON-DESTRUCTIVE POLICY',s.policyOk,'Tidak ada blanket animation/transform/visibility kill'],['SOURCE HASH',s.hashOk,src.html_hash||'hash belum tersedia'],['AUTHORITY CONTRACT',s.authorityOk,s.a.editor_rule||'authority belum lengkap']];
    return `<section class="dini-diag-section"><h3>Health Gate</h3><div class="dini-diag-grid">${checks.map(([name,ok,desc])=>`<div class="dini-diag-card ${ok?'ok':'fail'}"><strong>${badge(ok?'PASS':'FAIL',ok?'ok':'fail')} ${esc(name)}</strong><p>${esc(desc)}</p></div>`).join('')}</div></section>
      <section class="dini-diag-section"><h3>Source Identity</h3><div class="dini-diag-card">${kv(src,[['url','Source URL'],['html_bytes','HTML bytes'],['html_hash','HTML hash'],['css_hash','CSS hash'],['hash_algorithm','Hash algorithm']])}</div></section>
      <section class="dini-diag-section"><h3>Scanner Summary</h3><div class="dini-diag-grid">${[['Visuals',count(d,'visuals')],['Interactions',count(d,'interactions')],['Media',count(d,'media')],['Layers',count(d,'layers')],['Animations',count(d,'animations')],['Animation APIs',count(d,'animation_apis')],['Lifecycle events',count(d,'lifecycle_events')],['Lifecycle timers',count(d,'lifecycle_timers')],['Lifecycle actions',count(d,'lifecycle_actions')],['Dependencies',count(d,'dependencies')],['Personalization fields',count(d,'personalization_fields')],['Candidates',count(d,'personalization_candidates')]].map(([k,v])=>`<div class="dini-diag-card"><strong>${esc(v)} · ${esc(k)}</strong></div>`).join('')}</div></section>
      <section class="dini-diag-section"><h3>Runtime Evidence</h3><div class="dini-diag-card"><p>${badge((deps.frameworks||[]).length+' frameworks')} ${arr(deps.frameworks).map(x=>badge(x)).join('')||badge('none detected','warn')}</p><p>${badge(arr(resp.settings_variants).length+' responsive settings')} ${badge(arr(resp.media_queries).length+' media queries')} ${badge(arr(p.fields).length+' guest bindings',arr(p.fields).length?'ok':'warn')} ${badge(arr(p.candidates).length+' candidates')}</p></div></section>`;
  }

  function media(){return list('Media',graph?.media?.items,x=>[x.role,x.type,x.element_id].filter(Boolean).join(' · ')||x.url)}
  function layers(){return list('Layers / ownership',graph?.layers?.items,x=>[x.semantic_role||x.type,x.element_id,x.owner_selector].filter(Boolean).join(' · '))}
  function animations(){return list('Animation nodes',graph?.animations?.nodes,x=>[x.name||x.shorthand||x.source,x.viewport,x.selector].filter(Boolean).join(' · '))+list('Animation API evidence',graph?.animations?.script_apis,x=>[x.api,'script '+x.script_index].join(' · '))+list('CSS animation / transition rules',graph?.animations?.css_rules,x=>x.selector||x.animation||x.transition)}
  function lifecycle(){return list('Lifecycle events',graph?.lifecycle?.events,x=>x.event)+list('Lifecycle timers',graph?.lifecycle?.timers,x=>`${x.delay_ms??'—'} ms · script ${x.script_index??'—'}`)+list('Lifecycle actions',graph?.lifecycle?.actions,x=>x.action)+list('Lifecycle targets',graph?.lifecycle?.targets,x=>x.selector)+list('Lifecycle media',graph?.lifecycle?.media,x=>[x.kind,x.selector,x.element_id].filter(Boolean).join(' · '))}
  function responsive(){const r=obj(graph?.responsive?.source_truth);return list('Responsive setting variants',r.settings_variants,x=>[x.key,x.selector].filter(Boolean).join(' · '))+list('CSS media queries',r.media_queries,x=>x.query)}
  function dependencies(){const d=obj(graph?.dependencies);return `<section class="dini-diag-section"><h3>Frameworks</h3><div class="dini-diag-card">${arr(d.frameworks).map(x=>badge(x,'ok')).join('')||badge('Tidak ada framework terdeteksi','warn')}</div></section>`+list('External scripts',arr(d.external_scripts).map(url=>({url})),x=>x.url)+list('Stylesheets',arr(d.stylesheets).map(url=>({url})),x=>x.url)+list('Fonts',arr(d.fonts).map(url=>({url})),x=>x.url)}
  function personalization(){const p=obj(graph?.personalization);return `<section class="dini-diag-section"><h3>Binding policy</h3><div class="dini-diag-card">${kv(obj(p.binding_policy),[['url_parameter'],['fallback'],['injection'],['style_owner'],['animation_owner'],['automatic_min_confidence'],['heuristic_requires_confirmation']])}</div></section>`+list('Confirmed fields',p.fields,x=>[x.type,x.selector].filter(Boolean).join(' · '))+list('Candidates',p.candidates,x=>[x.type,x.selector,`confidence ${x.confidence}`].filter(Boolean).join(' · '))}
  function policy(){const c=obj(graph?.compatibility_policy),a=obj(graph?.authority);return `<section class="dini-diag-section"><h3>Compatibility Policy</h3><div class="dini-diag-card ${healthState().policyOk?'ok':'fail'}">${Object.entries(c).map(([k,v])=>badge(`${k}: ${yes(v)}`,v===false&&/^blanket_|template_specific/.test(k)?'ok':'' )).join('')}</div></section><section class="dini-diag-section"><h3>Authority</h3><div class="dini-diag-card">${kv(a,Object.keys(a).map(k=>[k,k]))}</div></section>`}

  function render(){
    renderTabs();renderHealth();
    if(!graph){body.innerHTML='<div class="dini-diag-empty">Source Truth belum tersedia. Klik Refresh setelah Fetch session selesai.</div>';return}
    const views={overview,media,layers,animations,lifecycle,responsive,dependencies,personalization,policy};
    body.innerHTML=(views[active]||overview)();
    subtitle.textContent=`Source Truth V${graph.source_truth_version||'?'} · ${graph.source_truth_engine||'scanner'} · ${graph.capture_stage||'capture stage unknown'} · read-only`;
  }

  async function load(){
    launch.textContent='DIAGNOSTICS…';launch.dataset.state='loading';
    try{
      session=await E.loadOrCreateSession(h);
      graph=session?.baseline?.manifest?.source_graph||null;
      if(!graph?.source_truth_version)throw new Error('Session belum memiliki Source Truth V1. Fetch ulang source melalui engine Road-to-Final.');
      launch.textContent='DIAGNOSTICS';launch.dataset.state='ready';render();return graph;
    }catch(err){
      graph=null;launch.textContent='DIAGNOSTICS !';launch.dataset.state='error';subtitle.textContent=String(err?.message||err);render();throw err;
    }
  }

  function open(){shell.classList.add('open');document.documentElement.dataset.diniDiagnosticsOpen='1';load().catch(()=>{})}
  function close(){shell.classList.remove('open');delete document.documentElement.dataset.diniDiagnosticsOpen}
  async function copyJson(){if(!graph)return;try{await navigator.clipboard.writeText(JSON.stringify(graph,null,2));window.editorToast?.('Source Truth JSON disalin.','success','DIAGNOSTICS')}catch{window.editorToast?.('Clipboard tidak tersedia. Gunakan Export JSON.','error','DIAGNOSTICS')}}
  function downloadJson(){if(!graph)return;const blob=new Blob([JSON.stringify(graph,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`dini-source-truth-${String(h||'session').slice(0,12)}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}

  launch.addEventListener('click',open);
  shell.addEventListener('click',e=>{if(e.target===shell)close();const action=e.target.closest?.('[data-diag-action]')?.dataset?.diagAction;if(action==='close')close();if(action==='refresh')load().catch(()=>{});if(action==='copy')copyJson();if(action==='download')downloadJson();const tab=e.target.closest?.('[data-diag-tab]')?.dataset?.diagTab;if(tab){active=tab;render()}});
  search.addEventListener('input',()=>{query=search.value.trim();render()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&shell.classList.contains('open'))close()});
  frame?.addEventListener('load',()=>{if(shell.classList.contains('open'))render()});

  render();
  window.DINI_FETCH_SCANNER_DIAGNOSTICS={version:VERSION,open,close,load,get graph(){return graph},get session(){return session},set tab(v){if(tabDefs.some(x=>x[0]===v)){active=v;render()}}};
  console.info('[DINI FETCH] Scanner Diagnostics V'+VERSION+' aktif — Source Truth read-only diagnostics UI.');
})();
