import {createFreezeEnvelope} from './freeze.js';
import {fetchRaw,parseTarget} from './analyzer.js';
import {PRODUCTION_EDITOR_BRIDGE_CLIENT} from './production-editor-bridge.js';
import {SOURCE_GEOMETRY_HOTFIX_CLIENT} from './source-geometry-hotfix.js';

const PROD='https://www.dini-faqih.my.id';
const MAX_HTML=6_000_000;
const json=(d,s=200)=>new Response(JSON.stringify(d,null,2),{status:s,headers:{'content-type':'application/json; charset=UTF-8','cache-control':'no-store'}});
const redirect=to=>new Response(null,{status:302,headers:{location:to,'cache-control':'no-store'}});

function isBridgeShell(path){
  if(path==='/dashboard-admin-fetch'||path==='/dashboard-admin-fetch/')return true;
  if(path==='/dashboard-admin-fetch-editor'||path==='/dashboard-admin-fetch-editor/')return true;
  if(path==='/dashboard-admin-edit'||path==='/dashboard-admin-edit/')return true;
  return false;
}
function isGeometryShell(path){
  return path==='/dashboard-admin-fetch'||path==='/dashboard-admin-fetch/'||path.startsWith('/dashboard-admin-fetch/preview')||path==='/dashboard-admin-fetch-editor'||path==='/dashboard-admin-fetch-editor/';
}
function injectClients(html,path){
  let out=String(html),tags='';
  if(isGeometryShell(path)&&!out.includes('/__v3/source-geometry-hotfix.js'))tags+='<script src="/__v3/source-geometry-hotfix.js"></script>';
  if(isBridgeShell(path)&&!out.includes('/__v3/production-editor-bridge.js'))tags+='<script src="/__v3/production-editor-bridge.js"></script>';
  if(!tags)return out;
  if(/<head[^>]*>/i.test(out))return out.replace(/<head([^>]*)>/i,'<head$1>'+tags);
  return tags+out;
}
function stagingHome(engine){return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Engine V3 + Production Editor Staging</title><style>:root{font-family:Inter,system-ui;color-scheme:dark;background:#080808;color:#f7f7f7}body{margin:0}.x{max-width:920px;margin:auto;padding:42px 22px}.card{border:1px solid #2a2a2a;background:#101010;border-radius:22px;padding:22px;margin:14px 0}.pill{display:inline-block;border:1px solid #355f49;background:#10251a;border-radius:999px;padding:7px 10px;color:#7ae69a;font-size:12px}h1{font-size:clamp(34px,6vw,62px);line-height:1;margin:16px 0}.muted{color:#999;line-height:1.65}.actions{display:flex;gap:10px;flex-wrap:wrap}.actions a{color:#fff;text-decoration:none;border:1px solid #333;background:#171717;padding:12px 15px;border-radius:13px;font-weight:700}.actions a.primary{border-color:#355f49;background:#10251a}</style></head><body><main class="x"><span class="pill">${engine} · V3 CAPTURE + PROD EDITOR · READ ONLY</span><h1>Production Editor + Engine V3 Safety Backend</h1><p class="muted">Editor production dipakai utuh untuk click-to-edit, layer picker, media, transform, tombol, slider, dan interaksi runtime. Engine V3 hanya menangani Browser Capture, immutable source provenance, final candidate regression, hash, dan finalization. Tidak ada write ke project utama/Supabase production.</p><section class="card"><h2>Fetch workflow</h2><div class="actions"><a class="primary" href="/dashboard-admin-fetch/?staging_v3=prod-editor">Buka Fetch Production Editor + V3</a></div></section><section class="card"><h2>Template workflow</h2><div class="actions"><a class="primary" href="/dashboard-admin-template/?staging_v3=prod-editor">Template Library</a></div><p class="muted">Klik Edit dari library. Production Template Editor tetap utuh; V3 memvalidasi Applied Snapshot setelah APPLY.</p></section><section class="card"><h2>Diagnostics</h2><div class="actions"><a href="/">Engine Lab</a><a href="/health">Health JSON</a></div></section></main></body></html>`}

export function stagingProductionEditorBridge(engine){return new Response(`window.__DINI_V3_STAGING_ENGINE__=${JSON.stringify(engine)};\n`+PRODUCTION_EDITOR_BRIDGE_CLIENT,{headers:{'content-type':'text/javascript; charset=UTF-8','cache-control':'no-store'}})}
export function stagingSourceGeometryHotfix(){return new Response(SOURCE_GEOMETRY_HOTFIX_CLIENT,{headers:{'content-type':'text/javascript; charset=UTF-8','cache-control':'no-store'}})}
export async function stagingFetchSource(url){const target=parseTarget(url.searchParams.get('url')),raw=await fetchRaw(target);return json({ok:true,url:raw.finalUrl,html:raw.html,bytes:new TextEncoder().encode(raw.html).length,contentType:raw.contentType,engine:'v3-fetch-raw'});}
export async function stagingFreezeHtml(request){let body;try{body=await request.json()}catch{throw new Error('Body freeze-html harus JSON.')};const html=String(body?.html||'');if(!html||html.length>MAX_HTML)throw new Error('Saved HTML kosong atau terlalu besar.');const source=String(body?.source||'https://production-editor-baseline.staging.invalid/');const envelope=await createFreezeEnvelope({source,rawHtml:html,runtimeHtml:html,browserMs:null,transport:{status:200,contentType:'text/html',finalUrl:source,migration:'production-editor-working-baseline'}});return json({ok:true,migration:true,template_id:body?.template_id||null,envelope});}

function rewriteLocation(headers,requestUrl){const loc=headers.get('location');if(!loc)return;try{const dest=new URL(loc,PROD),origin=new URL(requestUrl).origin;if(dest.origin===new URL(PROD).origin)headers.set('location',origin+dest.pathname+dest.search+dest.hash)}catch{}}
export async function proxyProduction(request,engine){
  const src=new URL(request.url),target=new URL(src.pathname+src.search,PROD);
  const init={method:request.method,headers:new Headers(request.headers),redirect:'manual'};
  init.headers.set('host',new URL(PROD).host);
  if(!['GET','HEAD'].includes(request.method)){
    if(src.pathname==='/api/fetch-source')return stagingFetchSource(src);
    if(src.pathname==='/api/fetch-asset')return fetch(target,request);
    return json({ok:false,error:'ENGINE_V3_STAGING_READ_ONLY'},403);
  }
  const res=await fetch(target,init),headers=new Headers(res.headers);
  headers.delete('content-length');headers.delete('content-encoding');headers.delete('content-security-policy');headers.delete('content-security-policy-report-only');
  headers.set('cache-control','no-store');headers.set('x-dini-v3-staging','production-editor-bridge');rewriteLocation(headers,request.url);
  const ct=(headers.get('content-type')||'').toLowerCase();
  if(ct.includes('text/html')){let html=await res.text();html=injectClients(html,src.pathname);return new Response(html,{status:res.status,headers});}
  return new Response(res.body,{status:res.status,headers});
}

export async function stagingRoute(request,engine){
  const url=new URL(request.url);
  if(url.pathname==='/staging'||url.pathname==='/staging/')return new Response(stagingHome(engine),{headers:{'content-type':'text/html; charset=UTF-8','cache-control':'no-store'}});
  if(url.pathname==='/staging/fetch')return redirect('/dashboard-admin-fetch/?staging_v3=prod-editor');
  if(url.pathname==='/staging/templates')return redirect('/dashboard-admin-template/?staging_v3=prod-editor');
  if(url.pathname==='/__v3/source-geometry-hotfix.js')return stagingSourceGeometryHotfix();
  if(url.pathname==='/__v3/production-editor-bridge.js')return stagingProductionEditorBridge(engine);
  return null;
}
