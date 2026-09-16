import {DEFAULT_SOURCE,parseTarget,analyzeHtml,compareReports,fetchRaw,injectBase} from './v3/analyzer.js';
import {createFreezeEnvelope,envelopeSummary} from './v3/freeze.js';

const ENGINE='3.1.0-alpha.1';
const BASELINE='94c4fddccde5d714f6ca9a247b87a0a9ef833f75';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json=(d,s=200,h={})=>new Response(JSON.stringify(d,null,2),{status:s,headers:{'content-type':'application/json; charset=UTF-8','cache-control':'no-store',...h}});

async function browserContent(env,target){
  if(!env.BROWSER?.quickAction)throw new Error('Browser Run binding belum aktif.');
  const r=await env.BROWSER.quickAction('content',{url:target.href});
  const ms=r.headers.get('X-Browser-Ms-Used')||r.headers.get('x-browser-ms-used');
  if(!r.ok)throw new Error(`Browser Run content gagal HTTP ${r.status}: ${await r.text()}`);
  const body=await r.text();let html=body;
  try{const p=JSON.parse(body);html=p?.result?.content??p?.result??p?.content??body;if(typeof html!=='string')html=JSON.stringify(html)}catch{}
  return{html,browserMs:ms?Number(ms):null};
}
async function analyze(url){
  const t=parseTarget(url.searchParams.get('url')),raw=await fetchRaw(t);
  return json({ok:true,engine:ENGINE,capturedAt:new Date().toISOString(),transport:{status:raw.status,contentType:raw.contentType,finalUrl:raw.finalUrl},report:await analyzeHtml(raw.html,raw.finalUrl,'raw-source')});
}
async function capture(url,env){
  const t=parseTarget(url.searchParams.get('url')),raw=await fetchRaw(t),a=await analyzeHtml(raw.html,raw.finalUrl,'raw-source'),b=await browserContent(env,t),c=await analyzeHtml(b.html,raw.finalUrl,'browser-rendered');
  return json({ok:true,engine:ENGINE,capturedAt:new Date().toISOString(),browserMsUsed:b.browserMs,raw:a,rendered:c,comparison:compareReports(a,c)});
}
async function freezeRuntime(url,env){
  const t=parseTarget(url.searchParams.get('url')),raw=await fetchRaw(t),runtime=await browserContent(env,t);
  const envelope=await createFreezeEnvelope({source:raw.finalUrl,rawHtml:raw.html,runtimeHtml:runtime.html,browserMs:runtime.browserMs,transport:{status:raw.status,contentType:raw.contentType,finalUrl:raw.finalUrl}});
  return json({ok:true,engine:ENGINE,envelope,summary:envelopeSummary(envelope)});
}
async function screenshot(url,env){
  const t=parseTarget(url.searchParams.get('url'));if(!env.BROWSER?.quickAction)throw new Error('Browser Run binding belum aktif.');
  return env.BROWSER.quickAction('screenshot',{url:t.href,screenshotOptions:{fullPage:true,type:'png'}});
}
async function render(url){
  const t=parseTarget(url.searchParams.get('url')),raw=await fetchRaw(t);
  return new Response(injectBase(raw.html,raw.finalUrl),{headers:{'content-type':'text/html; charset=UTF-8','cache-control':'no-store','x-dini-v3-mode':'raw-baseline-render-envelope','x-dini-v3-source':raw.finalUrl}});
}

function page(req){
  const u=new URL(req),guest=(u.searchParams.get('to')||'Rozak').trim()||'Rozak',source=u.searchParams.get('url')||DEFAULT_SOURCE;
  return`<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dini & Faqih — Engine V3 Lab</title><style>
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color-scheme:dark;background:#070707;color:#f7f7f7}*{box-sizing:border-box}body{margin:0}.shell{max-width:1500px;margin:auto;padding:24px}.top{display:flex;gap:16px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap}.eyebrow{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#8f8f8f}.pill{display:inline-flex;gap:8px;align-items:center;border:1px solid #2a2a2a;border-radius:999px;padding:7px 11px;background:#111;font-size:12px}.dot{width:7px;height:7px;border-radius:50%;background:#72e38e;box-shadow:0 0 14px #72e38e88}h1{font-size:clamp(30px,5vw,54px);margin:10px 0 8px;line-height:1}.muted{color:#9a9a9a;line-height:1.6}.guest{min-width:260px;border:1px solid #252525;background:#0d0d0d;border-radius:18px;padding:16px}.guest b{display:block;font-size:26px;margin-top:6px}.toolbar{display:grid;grid-template-columns:minmax(0,1fr) 180px auto;gap:10px;margin:22px 0}.toolbar input{width:100%;background:#0d0d0d;border:1px solid #2a2a2a;border-radius:14px;padding:13px 14px;color:#fff}.toolbar button,.actions a,.actions button{border:1px solid #303030;background:#151515;color:#fff;border-radius:14px;padding:12px 14px;text-decoration:none;cursor:pointer;font-weight:650}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}.actions .phase2{border-color:#665b1f;background:#211e0f}.grid{display:grid;grid-template-columns:390px minmax(0,1fr);gap:16px}.panel{border:1px solid #242424;background:#0d0d0d;border-radius:20px;overflow:hidden}.panelHead{padding:14px 16px;border-bottom:1px solid #222;display:flex;justify-content:space-between;gap:10px;align-items:center}.panelBody{padding:16px}.metricGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.metric{background:#111;border:1px solid #222;border-radius:14px;padding:11px}.metric span{display:block;color:#777;font-size:11px;text-transform:uppercase;letter-spacing:.08em}.metric b{display:block;margin-top:4px;font-size:19px;overflow-wrap:anywhere}.report{height:330px;overflow:auto;white-space:pre-wrap;font:11px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;color:#bcbcbc}.frame{width:100%;height:72vh;border:0;background:#fff}.status{font:12px ui-monospace,SFMono-Regular,Menlo,monospace;color:#8a8a8a}.ok{color:#72e38e}.warn{color:#ffd76b}.err{color:#ff8383}@media(max-width:900px){.grid{grid-template-columns:1fr}.toolbar{grid-template-columns:1fr}.frame{height:64vh}}
</style></head><body><main class="shell"><section class="top"><div><div class="eyebrow">Source-Native Fidelity Engine</div><h1>Engine V3 Lab</h1><div class="pill"><i class="dot"></i> isolated Cloudflare playground · ${ENGINE}</div><p class="muted">Phase 2 membekukan Raw + Runtime DOM + Dependency Graph menjadi immutable envelope. Editor berikutnya hanya menulis delta; baseline tidak direbuild.</p></div><aside class="guest"><span class="eyebrow">Kepada Yth.</span><b>${esc(guest)}</b><div class="muted">mock via <code>?to=Rozak</code></div></aside></section>
<div class="toolbar"><input id="source" value="${esc(source)}"><input id="guest" value="${esc(guest)}"><button id="apply">Apply Guest</button></div>
<div class="actions"><a id="src" target="_blank">Open Source</a><a id="raw" target="frame">Raw Render</a><button id="analyze">Analyze Raw</button><button id="capture">Browser Capture</button><button id="shot">Screenshot</button><button id="freeze" class="phase2">Freeze Runtime</button><button id="replay" class="phase2">Replay Frozen</button></div>
<div id="status" class="status">Ready · Phase 2 envelope belum dibuat.</div>
<section class="grid"><div class="panel"><div class="panelHead"><b>Fidelity Report</b><span class="eyebrow">Phase 2</span></div><div class="panelBody"><div id="metrics" class="metricGrid"><div class="metric"><span>Baseline</span><b>Ready</b></div><div class="metric"><span>Freeze</span><b>Idle</b></div></div><pre id="report" class="report">Klik Freeze Runtime setelah Browser Capture.</pre></div></div><div class="panel"><div class="panelHead"><b>Source-Native Render</b><span class="eyebrow">raw / frozen replay</span></div><iframe id="frame" name="frame" class="frame"></iframe></div></section></main>
<script>
const $=s=>document.querySelector(s),source=$('#source'),status=$('#status'),report=$('#report'),metrics=$('#metrics'),frame=$('#frame');let frozen=null;
const metric=(a,b)=>'<div class="metric"><span>'+a+'</span><b>'+b+'</b></div>';const target=()=>source.value.trim();
function links(){const q=encodeURIComponent(target());$('#src').href=target();$('#raw').href='/render?url='+q;if(!frame.srcdoc)frame.src='/render?url='+q}
function st(t,k=''){status.textContent=t;status.className='status '+k}
function rawView(d){const r=d.report;metrics.innerHTML=metric('SHA-256',r.sha256.slice(0,10)+'…')+metric('Bytes',r.bytes.toLocaleString())+metric('Dependencies',r.dependencies.total)+metric('Elementor',r.structure.elementorElements)+metric('Animations',r.animation.keyframes+r.animation.animationDeclarations+r.animation.motionSignals)+metric('Layers',r.layers.absolute+r.layers.fixed+r.layers.zIndex+r.layers.overlays)+metric('BG Videos',r.sourceNative.backgroundVideos.length)+metric('Slideshows',r.sourceNative.slideshows.length);report.textContent=JSON.stringify(d,null,2)}
function capView(d){const c=d.comparison;metrics.innerHTML=metric('Raw hash',d.raw.sha256.slice(0,9)+'…')+metric('Rendered hash',d.rendered.sha256.slice(0,9)+'…')+metric('DOM runtime',c.runtimeInjectedDom?'YES':'NO')+metric('Byte delta',c.byteDelta)+metric('Deps raw',d.raw.dependencies.total)+metric('Deps rendered',d.rendered.dependencies.total)+metric('Browser ms',d.browserMsUsed??'n/a')+metric('Widgets Δ',c.structureDelta.elementorWidgets);report.textContent=JSON.stringify(d,null,2)}
function freezeView(d){const s=d.summary;metrics.innerHTML=metric('Envelope',s.hashes.envelopeHash.slice(0,10)+'…')+metric('Immutable',d.envelope.immutable?'YES':'NO')+metric('Raw',s.hashes.rawHash.slice(0,9)+'…')+metric('Runtime',s.hashes.runtimeHash.slice(0,9)+'…')+metric('Replay',s.hashes.replayHash.slice(0,9)+'…')+metric('Injected deps',s.injectedDependencies.length)+metric('Runtime +bytes',s.comparison.byteDelta)+metric('Browser ms',s.browserMs??'n/a');report.textContent=JSON.stringify(s,null,2)}
async function call(p,m){st(m==='capture'?'Launching Chromium…':'Analyzing immutable raw source…');try{const r=await fetch(p+'?url='+encodeURIComponent(target()),{cache:'no-store'}),d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||'HTTP '+r.status);m==='capture'?capView(d):rawView(d);st(m==='capture'?'Browser capture complete ✅':'Raw analysis complete ✅','ok')}catch(e){st(e.message,'err');report.textContent=String(e.stack||e)}}
async function freezeNow(){st('Freezing Raw + Runtime + Dependency Graph…','warn');try{const r=await fetch('/api/freeze?url='+encodeURIComponent(target()),{cache:'no-store'}),d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||'HTTP '+r.status);frozen=d.envelope;try{const packed=JSON.stringify(frozen);if(packed.length<4000000)sessionStorage.setItem('dini-v3-freeze:'+target(),packed)}catch{}freezeView(d);st('Immutable runtime envelope frozen ✅','ok')}catch(e){st(e.message,'err');report.textContent=String(e.stack||e)}}
function replayFrozen(){if(!frozen){try{frozen=JSON.parse(sessionStorage.getItem('dini-v3-freeze:'+target())||'null')}catch{}}if(!frozen){st('Belum ada envelope. Klik Freeze Runtime dulu.','err');return}frame.removeAttribute('src');frame.srcdoc=frozen.baseline.replay.html;st('Frozen runtime replayed from immutable envelope ✅','ok')}
$('#analyze').onclick=()=>call('/api/analyze','raw');$('#capture').onclick=()=>call('/api/capture','capture');$('#shot').onclick=()=>window.open('/api/screenshot?url='+encodeURIComponent(target()),'_blank');$('#freeze').onclick=freezeNow;$('#replay').onclick=replayFrozen;
$('#apply').onclick=()=>{const u=new URL(location.href);u.searchParams.set('to',$('#guest').value.trim()||'Rozak');u.searchParams.set('url',target());location.href=u};source.onchange=()=>{frozen=null;frame.removeAttribute('srcdoc');links()};links();
</script></body></html>`
}

export default{async fetch(request,env){const url=new URL(request.url);try{
  if(url.pathname==='/health')return json({ok:true,service:'dinifaqih-engine-v3-lab',engine:ENGINE,phase:2,branch:'engine/v3-source-native-fidelity',baseline:BASELINE,browserBinding:Boolean(env.BROWSER)});
  if(url.pathname==='/api/analyze')return analyze(url);
  if(url.pathname==='/api/capture')return capture(url,env);
  if(url.pathname==='/api/freeze')return freezeRuntime(url,env);
  if(url.pathname==='/api/screenshot')return screenshot(url,env);
  if(url.pathname==='/render')return render(url);
  if(url.pathname==='/')return new Response(page(request.url),{headers:{'content-type':'text/html; charset=UTF-8','cache-control':'no-store'}});
  return json({ok:false,error:'Not found'},404)
}catch(e){return json({ok:false,engine:ENGINE,error:e?.message||String(e)},500)}}};
