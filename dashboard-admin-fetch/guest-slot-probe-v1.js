(()=>{
  'use strict';
  const SENTINEL='__DINI_GUEST_PROBE__';
  const PLACEHOLDER='Nama Tamu';
  const source=document.getElementById('sourceInput');
  const sourceUrl=document.getElementById('sourceUrl');
  const fetchBtn=document.getElementById('fetchSourceBtn');
  const analyzeBtn=document.getElementById('analyzeBtn');
  const buildBtn=document.getElementById('buildBtn');
  const fetchMeta=document.getElementById('fetchMeta');
  if(!source||!sourceUrl||!fetchBtn)return;

  const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
  const deepestWith=(doc,text)=>{
    const all=[...doc.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,label,div')].filter(n=>String(n.textContent||'').includes(text));
    return all.find(n=>![...n.children].some(c=>String(c.textContent||'').includes(text)))||all[0]||null;
  };
  const widgetOf=n=>n?.closest?.('.elementor-widget')||n?.parentElement||null;
  const widgetKey=n=>String(n?.getAttribute?.('data-id')||'').trim();
  const findByWidgetKey=(doc,key)=>key?doc.querySelector(`[data-id="${CSS.escape(key)}"]`):null;
  const markGuest=(root,value)=>{
    if(!root)return null;
    const leaves=[...root.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,label,div')];
    let leaf=leaves.find(n=>String(n.textContent||'').includes(SENTINEL)&&![...n.children].some(c=>String(c.textContent||'').includes(SENTINEL)));
    if(!leaf&&String(root.textContent||'').includes(SENTINEL))leaf=root;
    if(!leaf)return null;
    leaf.textContent=value;
    leaf.setAttribute('data-native-guest-name','1');
    leaf.setAttribute('data-dini-guest-name','1');
    leaf.setAttribute('data-dini-guest-source-probe','1');
    root.setAttribute('data-dini-guest-source-probe-widget','1');
    return leaf;
  };

  function transplantGuestWidget(baselineHtml,probeHtml){
    const baseline=new DOMParser().parseFromString(String(baselineHtml||''),'text/html');
    const probe=new DOMParser().parseFromString(String(probeHtml||''),'text/html');
    const probeLeaf=deepestWith(probe,SENTINEL);
    const probeWidget=widgetOf(probeLeaf);
    if(!probeLeaf||!probeWidget)return {html:baselineHtml,count:0,reason:'sentinel-not-found'};

    const sameId=widgetKey(probeWidget);
    if(sameId){
      const existing=findByWidgetKey(baseline,sameId);
      if(existing){markGuest(existing,PLACEHOLDER);return {html:'<!doctype html>\n'+baseline.documentElement.outerHTML,count:1,reason:'existing-widget-marked',widget_id:sameId};}
    }

    const clone=probeWidget.cloneNode(true);
    if(!markGuest(clone,PLACEHOLDER))return {html:baselineHtml,count:0,reason:'clone-sentinel-missing'};
    const prevKey=widgetKey(probeWidget.previousElementSibling);
    const nextKey=widgetKey(probeWidget.nextElementSibling);
    const next=findByWidgetKey(baseline,nextKey);
    const prev=findByWidgetKey(baseline,prevKey);
    if(next?.parentElement){next.parentElement.insertBefore(clone,next)}
    else if(prev?.parentElement){prev.parentElement.insertBefore(clone,prev.nextSibling)}
    else return {html:baselineHtml,count:0,reason:'anchor-not-found',widget_id:sameId,prev_id:prevKey,next_id:nextKey};
    return {html:'<!doctype html>\n'+baseline.documentElement.outerHTML,count:1,reason:'source-widget-restored',widget_id:sameId,prev_id:prevKey,next_id:nextKey};
  }

  async function fetchProbe(url){
    const u=new URL(url,location.href);
    u.searchParams.set('to',SENTINEL);
    const r=await fetch('/api/fetch-source?url='+encodeURIComponent(u.href),{headers:{Accept:'application/json'},cache:'no-store'});
    const j=await r.json().catch(()=>({ok:false,error:'Response Guest Probe tidak valid.'}));
    if(!r.ok||!j.ok)throw new Error(j.error||('Guest Probe HTTP '+r.status));
    return j;
  }

  let runId=0;
  async function runAfterFetch(before,token){
    const started=Date.now();
    while(Date.now()-started<18000){
      if(token!==runId)return;
      if(!fetchBtn.disabled&&source.value&&source.value!==before)break;
      await new Promise(r=>setTimeout(r,120));
    }
    if(token!==runId||!source.value||source.value===before)return;
    const canonicalUrl=sourceUrl.value.trim();
    if(!/^https?:/i.test(canonicalUrl))return;
    try{
      if(buildBtn)buildBtn.disabled=true;
      if(fetchMeta){fetchMeta.classList.add('ok');fetchMeta.textContent+=' · 🔎 Guest Slot Probe…'}
      const probe=await fetchProbe(canonicalUrl);
      const result=transplantGuestWidget(source.value,probe.html||'');
      source.dataset.guestProbe=JSON.stringify({version:1,count:result.count,reason:result.reason,widget_id:result.widget_id||'',source_url:canonicalUrl});
      if(result.count>0){
        source.value=result.html;
        if(fetchMeta)fetchMeta.textContent=`✅ Source + Guest Slot source-native terdeteksi${result.widget_id?' · '+result.widget_id:''}`;
        if(analyzeBtn&&!analyzeBtn.disabled){analyzeBtn.click()}
        else setTimeout(()=>analyzeBtn?.click(),80);
      }else{
        if(fetchMeta)fetchMeta.textContent+=' · Guest Slot dinamis tidak terdeteksi';
      }
    }catch(err){
      console.warn('GUEST_SLOT_PROBE_V1',err);
      if(fetchMeta)fetchMeta.textContent+=' · Guest Probe dilewati ('+String(err.message||err)+')';
    }
  }

  function scheduleProbe(){
    const token=++runId;
    const before=source.value;
    setTimeout(()=>runAfterFetch(before,token),40);
  }
  fetchBtn.addEventListener('click',scheduleProbe,true);
  sourceUrl.addEventListener('keydown',e=>{if(e.key==='Enter')scheduleProbe()},true);
  window.DINI_GUEST_SLOT_PROBE_V1={transplantGuestWidget,fetchProbe};
})();
