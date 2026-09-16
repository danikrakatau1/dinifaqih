(()=>{
  'use strict';
  if(window.__DINI_FETCH_RUNTIME_CONTROL_V1__)return;
  window.__DINI_FETCH_RUNTIME_CONTROL_V1__=true;

  const VERSION='1.0.1';
  const E=window.DINI_FETCH_V2;
  const frame=document.getElementById('previewFrame');
  const toolbar=document.querySelector('.preview-toolbar');
  if(!E||!frame||!toolbar)return;

  const h=E.handoffFromUrl();
  let mode='live';
  let sourceTruth=null;

  const style=document.createElement('style');
  style.textContent=`
    .dini-runtime-controls{display:inline-flex;align-items:center;gap:5px;margin-left:10px;padding:3px;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:rgba(10,13,18,.7);vertical-align:middle}
    .dini-runtime-controls button{appearance:none;border:0;border-radius:7px;padding:6px 9px;background:transparent;color:#aeb6c4;font:600 10px/1 system-ui;letter-spacing:.04em;cursor:pointer}
    .dini-runtime-controls button:hover{background:rgba(255,255,255,.08);color:#fff}
    .dini-runtime-controls button.active{background:#d6b45f;color:#15130c}
    .dini-runtime-truth{margin-left:7px;font:600 10px/1.2 system-ui;color:#8bd6aa;white-space:nowrap}
    @media(max-width:900px){.dini-runtime-controls{display:flex;margin:6px 0 0;max-width:max-content}.dini-runtime-truth{display:none}}
  `;
  document.head.appendChild(style);

  const controls=document.createElement('span');
  controls.className='dini-runtime-controls';
  controls.innerHTML=`
    <button type="button" data-runtime-mode="live" title="Jalankan source sesuai runtime">LIVE</button>
    <button type="button" data-runtime-mode="pause" title="Pause sementara tanpa mengubah source">PAUSE</button>
    <button type="button" data-runtime-mode="edit" title="Bekukan playback sementara untuk memilih/edit elemen">EDIT</button>
    <button type="button" data-runtime-mode="replay" title="Ulang lifecycle dari awal">REPLAY</button>
  `;
  toolbar.appendChild(controls);
  const truth=document.createElement('span');
  truth.className='dini-runtime-truth';
  truth.textContent='SOURCE TRUTH…';
  toolbar.appendChild(truth);

  const buttons=()=>[...controls.querySelectorAll('[data-runtime-mode]')];
  const setButtons=next=>buttons().forEach(b=>b.classList.toggle('active',b.dataset.runtimeMode===next));

  function ensureControlStyle(doc){
    if(!doc?.head||doc.getElementById('dini-runtime-control-style'))return;
    const st=doc.createElement('style');
    st.id='dini-runtime-control-style';
    st.setAttribute('data-editor-only','runtime-control-v1');
    st.textContent=`
      html[data-dini-editor-runtime-mode="pause"] *,
      html[data-dini-editor-runtime-mode="edit"] *{animation-play-state:paused!important}
    `;
    doc.head.appendChild(st);
  }

  function animations(doc){
    try{return typeof doc?.getAnimations==='function'?doc.getAnimations():[]}catch{return[]}
  }

  function pauseMedia(doc){
    doc?.querySelectorAll?.('video,audio').forEach(m=>{
      const wasPlaying=!m.paused&&!m.ended;
      m.dataset.diniRuntimeWasPlaying=wasPlaying?'1':'0';
      if(wasPlaying)try{m.pause()}catch{}
    });
  }

  function resumeMedia(doc){
    doc?.querySelectorAll?.('video,audio').forEach(m=>{
      if(m.dataset.diniRuntimeWasPlaying!=='1')return;
      delete m.dataset.diniRuntimeWasPlaying;
      try{m.play?.().catch?.(()=>{})}catch{}
    });
  }

  function applyModeToFrame(next){
    const doc=frame.contentDocument;
    if(!doc?.documentElement)return;
    ensureControlStyle(doc);
    doc.documentElement.setAttribute('data-dini-editor-runtime-mode',next);
    doc.documentElement.setAttribute('data-dini-editor-control-version',VERSION);
    if(next==='pause'||next==='edit'){
      animations(doc).forEach(a=>{try{a.pause()}catch{}});
      pauseMedia(doc);
    }else if(next==='live'){
      animations(doc).forEach(a=>{try{if(a.playState==='paused')a.play()}catch{}});
      resumeMedia(doc);
    }
  }

  function setMode(next,{silent=false}={}){
    if(!['live','pause','edit'].includes(next))return;
    mode=next;
    setButtons(next);
    applyModeToFrame(next);
    document.documentElement.setAttribute('data-fetch-runtime-mode',next);
    if(!silent&&window.editorToast){
      const text=next==='live'?'Runtime source berjalan normal.':next==='pause'?'Animasi/media dipause sementara; source tidak diubah.':'Playback dibekukan sementara untuk editing; tidak ada transform/visibility yang dihapus.';
      window.editorToast(text,'info','RUNTIME '+next.toUpperCase());
    }
  }

  async function replay(){
    const previous=mode;
    const raw=String(frame.srcdoc||'');
    if(!raw){
      window.editorToast?.('Frame belum siap untuk Replay.','error','REPLAY GAGAL');
      return;
    }
    mode='live';setButtons('live');
    const onLoad=()=>{setMode('live',{silent:true});window.editorToast?.('Lifecycle dimulai ulang dari snapshot editor yang sama.','success','REPLAY ✓')};
    frame.addEventListener('load',onLoad,{once:true});
    frame.srcdoc=raw;
    if(previous==='edit')document.documentElement.setAttribute('data-fetch-runtime-before-replay','edit');
  }

  controls.addEventListener('click',e=>{
    const b=e.target.closest?.('[data-runtime-mode]');if(!b)return;
    const next=b.dataset.runtimeMode;
    if(next==='replay')replay();else setMode(next);
  });

  frame.addEventListener('load',()=>setTimeout(()=>applyModeToFrame(mode),0));

  async function loadTruth(){
    try{
      const session=await E.loadOrCreateSession(h);
      sourceTruth=session?.baseline?.manifest?.source_graph||null;
      const d=sourceTruth?.diagnostics||{};
      const v=sourceTruth?.source_truth_version;
      if(v){
        truth.textContent=`SOURCE TRUTH V${v} · A${Number(d.animations||0)} · L${Number(d.lifecycle_events||0)}/${Number(d.lifecycle_timers||0)} · M${Number(d.media||0)}`;
        truth.title=`Animation ${Number(d.animations||0)} · lifecycle event ${Number(d.lifecycle_events||0)} · timer ${Number(d.lifecycle_timers||0)} · media ${Number(d.media||0)} · personalization ${Number(d.personalization_fields||0)}`;
      }else{
        truth.textContent='LEGACY SOURCE GRAPH';
        truth.style.color='#d8b879';
      }
    }catch(err){
      truth.textContent='SOURCE TRUTH ?';truth.title=String(err?.message||err);
    }
  }

  function loadDiagnostics(){
    if(window.__DINI_FETCH_SCANNER_DIAGNOSTICS_V1__||document.querySelector('script[data-dini-scanner-diagnostics]'))return;
    const s=document.createElement('script');
    s.src='/dashboard-admin-fetch-editor/fetch-scanner-diagnostics-v1.js?v=100';
    s.async=false;
    s.dataset.diniScannerDiagnostics='1';
    s.onerror=()=>console.error('[DINI FETCH] Scanner Diagnostics gagal dimuat.');
    document.body.appendChild(s);
  }

  setMode('live',{silent:true});
  loadTruth();
  loadDiagnostics();
  window.DINI_FETCH_RUNTIME_CONTROL={version:VERSION,get mode(){return mode},setMode,replay,get sourceTruth(){return sourceTruth}};
  console.info('[DINI FETCH] Runtime Control V'+VERSION+' aktif — LIVE/PAUSE/EDIT/REPLAY non-destructive + diagnostics bootstrap.');
})();