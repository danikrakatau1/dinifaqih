import {DEFAULT_SOURCE,parseTarget,analyzeHtml,compareReports,fetchRaw,injectBase} from './v3/analyzer.js';
import {createFreezeEnvelope,envelopeSummary} from './v3/freeze.js';
import {applyEditDelta} from './v3/delta.js';
import {page} from './v3/ui.js';

const ENGINE='3.2.2-alpha.1';
const BASELINE='94c4fddccde5d714f6ca9a247b87a0a9ef833f75';
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
async function analyze(url){const t=parseTarget(url.searchParams.get('url')),raw=await fetchRaw(t);return json({ok:true,engine:ENGINE,capturedAt:new Date().toISOString(),transport:{status:raw.status,contentType:raw.contentType,finalUrl:raw.finalUrl},report:await analyzeHtml(raw.html,raw.finalUrl,'raw-source')})}
async function capture(url,env){const t=parseTarget(url.searchParams.get('url')),raw=await fetchRaw(t),a=await analyzeHtml(raw.html,raw.finalUrl,'raw-source'),b=await browserContent(env,t),c=await analyzeHtml(b.html,raw.finalUrl,'browser-rendered');return json({ok:true,engine:ENGINE,capturedAt:new Date().toISOString(),browserMsUsed:b.browserMs,raw:a,rendered:c,comparison:compareReports(a,c)})}
async function freezeRuntime(url,env){const t=parseTarget(url.searchParams.get('url')),raw=await fetchRaw(t),runtime=await browserContent(env,t);const envelope=await createFreezeEnvelope({source:raw.finalUrl,rawHtml:raw.html,runtimeHtml:runtime.html,browserMs:runtime.browserMs,transport:{status:raw.status,contentType:raw.contentType,finalUrl:raw.finalUrl}});return json({ok:true,engine:ENGINE,envelope,summary:envelopeSummary(envelope)})}
async function deltaApply(request){let body;try{body=await request.json()}catch{throw new Error('Body delta harus JSON.')};const result=await applyEditDelta(body?.envelope,body?.delta||{});return json({ok:true,engine:ENGINE,phase:3,...result})}
async function screenshot(url,env){const t=parseTarget(url.searchParams.get('url'));if(!env.BROWSER?.quickAction)throw new Error('Browser Run binding belum aktif.');return env.BROWSER.quickAction('screenshot',{url:t.href,screenshotOptions:{fullPage:true,type:'png'}})}
async function render(url){const t=parseTarget(url.searchParams.get('url')),raw=await fetchRaw(t);return new Response(injectBase(raw.html,raw.finalUrl),{headers:{'content-type':'text/html; charset=UTF-8','cache-control':'no-store','x-dini-v3-mode':'raw-baseline-render-envelope','x-dini-v3-source':raw.finalUrl}})}

export default{async fetch(request,env){const url=new URL(request.url);try{
  if(url.pathname==='/health')return json({ok:true,service:'dinifaqih-engine-v3-lab',engine:ENGINE,phase:3,branch:'engine/v3-source-native-fidelity',baseline:BASELINE,browserBinding:Boolean(env.BROWSER),popupSystem:true,runtimeDeltaBridge:true,navigationGuard:true,observerLoopGuard:true});
  if(url.pathname==='/api/analyze')return analyze(url);
  if(url.pathname==='/api/capture')return capture(url,env);
  if(url.pathname==='/api/freeze')return freezeRuntime(url,env);
  if(url.pathname==='/api/delta/apply'&&request.method==='POST')return deltaApply(request);
  if(url.pathname==='/api/screenshot')return screenshot(url,env);
  if(url.pathname==='/render')return render(url);
  if(url.pathname==='/')return new Response(page(request.url,{engine:ENGINE,baseline:BASELINE,defaultSource:DEFAULT_SOURCE}),{headers:{'content-type':'text/html; charset=UTF-8','cache-control':'no-store'}});
  return json({ok:false,error:'Not found'},404)
}catch(e){return json({ok:false,engine:ENGINE,error:e?.message||String(e)},500)}}};