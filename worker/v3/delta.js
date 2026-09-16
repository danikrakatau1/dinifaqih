import {sha256Text} from './analyzer.js';

const MAX_OPS=64;
const ALLOWED_TYPES=new Set(['text','attribute','style']);
const clean=v=>String(v??'').trim();

function validateSelector(selector){
  const s=clean(selector);
  if(!s)throw new Error('CSS selector delta wajib diisi.');
  if(s.length>300)throw new Error('CSS selector terlalu panjang.');
  if(/[{}]/.test(s))throw new Error('CSS selector tidak valid.');
  return s;
}
function validateKey(key,type){
  const k=clean(key);
  if(type==='text')return'';
  if(!k)throw new Error(type==='style'?'Nama CSS property wajib diisi.':'Nama attribute wajib diisi.');
  if(!/^[a-zA-Z_][\w:.-]*$/.test(k))throw new Error(`Nama ${type==='style'?'CSS property':'attribute'} tidak valid.`);
  return k;
}
export function normalizeDelta(input={}){
  const ops=Array.isArray(input.operations)?input.operations:[];
  if(ops.length>MAX_OPS)throw new Error(`Maksimal ${MAX_OPS} operasi delta per render.`);
  return{version:1,operations:ops.map((op,i)=>{
    const type=clean(op?.type).toLowerCase();
    if(!ALLOWED_TYPES.has(type))throw new Error(`Delta #${i+1}: type tidak didukung.`);
    return{id:clean(op.id)||`op-${i+1}`,type,selector:validateSelector(op.selector),key:validateKey(op.key,type),value:String(op.value??'')};
  })};
}
function patchStyle(style,key,value){
  const map=new Map();
  String(style||'').split(';').forEach(part=>{const p=part.indexOf(':');if(p<1)return;const k=part.slice(0,p).trim().toLowerCase(),v=part.slice(p+1).trim();if(k)map.set(k,v)});
  const k=key.toLowerCase();
  if(String(value).trim())map.set(k,String(value).trim());else map.delete(k);
  return[...map].map(([a,b])=>`${a}: ${b}`).join('; ')+(map.size?';':'');
}
function assertEnvelope(envelope){
  if(!envelope||envelope.schema!=='dini-source-native-envelope-v3')throw new Error('Envelope V3 tidak valid. Freeze Runtime dulu.');
  if(envelope.immutable!==true)throw new Error('Envelope harus immutable.');
  if(!envelope.baseline?.replay?.html||!envelope.baseline?.replay?.sha256)throw new Error('Frozen replay baseline tidak lengkap.');
}
function injectRuntimeBridge(html,delta){
  const safe=JSON.stringify(delta).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
  const script=`<script data-dini-v3-delta-bridge>(()=>{\n`+
`if(window.__DINI_V3_DELTA_BRIDGE__)return;window.__DINI_V3_DELTA_BRIDGE__=true;\n`+
`const DELTA=${safe};const OPS=DELTA.operations||[];let applying=false,queued=false;\n`+
`function patchStyleText(style,key,value){const m=new Map();String(style||'').split(';').forEach(p=>{const i=p.indexOf(':');if(i<1)return;const k=p.slice(0,i).trim().toLowerCase(),v=p.slice(i+1).trim();if(k)m.set(k,v)});const k=String(key||'').toLowerCase();if(String(value||'').trim())m.set(k,String(value).trim());else m.delete(k);return[...m].map(([a,b])=>a+': '+b).join('; ')+(m.size?';':'')}\n`+
`function one(op){let nodes=[];try{nodes=document.querySelectorAll(op.selector)}catch{return 0}let n=0;nodes.forEach(el=>{n++;if(op.type==='text'){if(el.textContent!==op.value)el.textContent=op.value}else if(op.type==='attribute'){const cur=el.getAttribute(op.key);if(op.value===''){if(cur!==null)el.removeAttribute(op.key)}else if(cur!==op.value)el.setAttribute(op.key,op.value)}else if(op.type==='style'){const next=patchStyleText(el.getAttribute('style')||'',op.key,op.value);if((el.getAttribute('style')||'')!==next){if(next)el.setAttribute('style',next);else el.removeAttribute('style')}}});return n}\n`+
`function applyAll(){if(applying)return;applying=true;try{OPS.forEach(one);document.documentElement?.setAttribute('data-dini-v3-delta-live','1')}finally{applying=false}}\n`+
`function schedule(){if(queued||applying)return;queued=true;requestAnimationFrame(()=>{queued=false;applyAll()})}\n`+
`const mo=new MutationObserver(()=>schedule());function arm(){applyAll();const root=document.documentElement||document;if(root)mo.observe(root,{subtree:true,childList:true,attributes:true,characterData:true})}\n`+
`document.addEventListener('click',e=>{const scope=e.target?.closest?.('.tombolbuka');const a=e.target?.closest?.('a');if(scope&&a){const h=(a.getAttribute('href')||'').trim();if(!h||h==='#')e.preventDefault()}[0,50,250,1000,3000].forEach(ms=>setTimeout(applyAll,ms))},true);\n`+
`if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',arm,{once:true});else arm();window.addEventListener('load',applyAll);window.addEventListener('pageshow',applyAll);\n`+
`})();</script>`;
  if(/<\/body\s*>/i.test(html))return html.replace(/<\/body\s*>/i,script+'</body>');
  return html+script;
}

export async function applyEditDelta(envelope,input={}){
  assertEnvelope(envelope);
  const delta=normalizeDelta(input);
  const baselineHtml=String(envelope.baseline.replay.html);
  const expected=String(envelope.baseline.replay.sha256);
  const beforeHash=await sha256Text(baselineHtml);
  if(beforeHash!==expected)throw new Error('Integrity guard: frozen replay baseline berubah sebelum delta.');
  let response=new Response(baselineHtml,{headers:{'content-type':'text/html; charset=UTF-8'}});
  const matches=[];
  for(const op of delta.operations){
    let count=0;
    const handler={element(el){count++;
      if(op.type==='text')el.setInnerContent(op.value);
      else if(op.type==='attribute'){if(op.value==='')el.removeAttribute(op.key);else el.setAttribute(op.key,op.value)}
      else if(op.type==='style'){const next=patchStyle(el.getAttribute('style')||'',op.key,op.value);if(next)el.setAttribute('style',next);else el.removeAttribute('style')}
    }};
    response=new HTMLRewriter().on(op.selector,handler).transform(response);
    const html=await response.text();
    matches.push({id:op.id,type:op.type,selector:op.selector,matched:count});
    response=new Response(html,{headers:{'content-type':'text/html; charset=UTF-8'}});
  }
  let html=await response.text();
  html=injectRuntimeBridge(html,delta);
  const outputHash=await sha256Text(html);
  const afterBaselineHash=await sha256Text(baselineHtml);
  if(afterBaselineHash!==expected)throw new Error('Integrity guard: baseline termutasi setelah delta.');
  const deltaHash=await sha256Text(JSON.stringify(delta));
  return{html,delta,integrity:{baselineHash:expected,baselineStillImmutable:afterBaselineHash===expected,deltaHash,outputHash,changed:outputHash!==expected,runtimeBridge:true,navigationGuard:true},matches};
}
