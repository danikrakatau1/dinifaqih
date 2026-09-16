export const SOURCE_CSS_AUDIT_CLIENT=String.raw`(()=>{
'use strict';
if(window.__DINI_V3_SOURCE_CSS_AUDIT__)return;
window.__DINI_V3_SOURCE_CSS_AUDIT__=true;
const TARGET='post-341039.css';
const IDS=['250072f','e117593','c72d3e5','e7de999'];
let lastSig='';
function allSnapshotKeys(store){const out=[];for(let i=0;i<store.length;i++){const k=store.key(i);if(k&&(k==='diniAnifRebuildSnapshot'||k.startsWith('diniAnifRebuildSnapshot:')))out.push(k)}return out}
function newestRaw(){const handoff=new URLSearchParams(location.search).get('handoff')||'';for(const store of [sessionStorage,localStorage]){if(handoff){const v=store.getItem('diniAnifRebuildSnapshot:'+handoff);if(v)return v}const v=store.getItem('diniAnifRebuildSnapshot');if(v)return v;for(const k of allSnapshotKeys(store)){const x=store.getItem(k);if(x)return x}}return''}
function extractRules(css,id){const re=new RegExp('([^{}]*elementor-element-'+String(id)+'[^{}]*)\\{([^{}]*)\\}','ig'),out=[];let m;while((m=re.exec(css))&&out.length<12){const body=m[2]||'';if(/background|position|left|right|top|bottom|width|height|transform|margin|padding/i.test(body))out.push({selector:(m[1]||'').trim().slice(0,260),declarations:body.trim().slice(0,900)})}return out}
function inspect(raw){let pack;try{pack=JSON.parse(raw)}catch{return null}const html=String(pack?.native?.html||pack?.html||'');if(!html)return null;const doc=new DOMParser().parseFromString(html,'text/html'),styles=[...doc.querySelectorAll('style[data-dini-critical-elementor-css]')],sources=styles.map(s=>s.getAttribute('data-source-css')||''),target=styles.filter(s=>(s.getAttribute('data-source-css')||'').includes(TARGET)),css=target.map(s=>s.textContent||'').join('\n');const rules=Object.fromEntries(IDS.map(id=>[id,extractRules(css,id)]));return{target:TARGET,found:target.length>0,sourceUrls:sources,criticalCss:pack?.report?.critical_css||null,targetBytes:css.length,rules,sourceUrl:pack?.manifest?.source_url||pack?.native?.source_url||'',checkedAt:new Date().toISOString()}}
function badge(r){let b=document.getElementById('diniV3SourceCssAudit');if(!b){b=document.createElement('div');b.id='diniV3SourceCssAudit';b.style.cssText='position:fixed;left:14px;bottom:14px;z-index:2147482999;background:#111;color:#eee;border:1px solid #444;border-radius:12px;padding:8px 10px;font:10px/1.35 system-ui;box-shadow:0 12px 34px #0008;pointer-events:none';document.body.appendChild(b)}const ok=r?.found;b.style.borderColor=ok?'#356b49':'#8a5b2b';b.innerHTML='<strong style="color:'+(ok?'#79e69a':'#ffbd67')+'">SOURCE CSS AUDIT · '+(ok?'FOUND':'MISSING')+'</strong><br><span style="color:#aaa">'+TARGET+' · '+(r?.targetBytes||0)+' bytes</span>'}
function tick(){const raw=newestRaw();if(!raw)return;const sig=raw.length+'|'+raw.slice(0,80);if(sig===lastSig)return;lastSig=sig;const r=inspect(raw);if(!r)return;window.DINI_V3_SOURCE_CSS_AUDIT_LAST=r;badge(r);console.info('DINI_V3_SOURCE_CSS_AUDIT',r)}
setInterval(tick,650);setTimeout(tick,80);
})();`;
