(()=>{
  'use strict';
  if(window.DINI_ENGINE_V3_FINAL_BRIDGE)return;
  const LAB='https://dinifaqih.danikrakatau13.workers.dev/';
  const q=new URLSearchParams(location.search);
  const path=location.pathname;
  const mode=path.includes('/dashboard-admin-fetch-editor')?'fetch-create':path.includes('/dashboard-admin-edit')?'template-update':'admin-observer';
  const templateId=String(window.__DINI_TEMPLATE_EDITOR_SCOPE__?.template_id||q.get('template')||q.get('record')||'').trim();
  const source=String(q.get('source')||q.get('url')||'').trim();
  const ctx=Object.freeze({version:'3.9.0-rc.1',enabled:true,mode,template_id:templateId||null,source:source||null,lab:LAB,production_write:false});
  function labUrl(){const u=new URL(LAB);u.searchParams.set('to',q.get('to')||'Rozak');if(source)u.searchParams.set('url',source);return u.href}
  function openLab(){window.open(labUrl(),'_blank','noopener')}
  function contract(){return mode==='fetch-create'?{operation:'INSERT',requires_new_uuid:true,preserve_existing_uuid:false}:{operation:'UPDATE',requires_new_uuid:false,preserve_existing_uuid:true,template_id:templateId||null}}
  window.DINI_ENGINE_V3_FINAL_BRIDGE=Object.freeze({context:ctx,openLab,labUrl,contract});
  document.documentElement.dataset.engineV3Final='1';
  const mount=()=>{
    if(document.getElementById('diniEngineV3Bridge'))return;
    const box=document.createElement('div');box.id='diniEngineV3Bridge';box.style.cssText='position:fixed;right:14px;bottom:14px;z-index:2147483000;background:#101312;color:#f6fff8;border:1px solid #355f49;border-radius:16px;padding:10px 11px;box-shadow:0 18px 50px rgba(0,0,0,.35);font:12px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;display:flex;gap:9px;align-items:center;max-width:min(92vw,390px)';
    const text=document.createElement('div');text.innerHTML='<strong style="display:block;color:#7ae69a">ENGINE V3 FINAL RC</strong><span style="color:#9ba59e">'+(mode==='fetch-create'?'Fetch → NEW UUID':mode==='template-update'?'Template Edit → SAME UUID':'Admin observer')+' · opt-in</span>';
    const btn=document.createElement('button');btn.type='button';btn.textContent='Open Lab';btn.style.cssText='border:1px solid #406d53;background:#163020;color:white;border-radius:10px;padding:8px 10px;cursor:pointer;font-weight:700';btn.onclick=openLab;
    box.append(text,btn);document.body.appendChild(box);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  window.dispatchEvent(new CustomEvent('dini:v3:bridge-ready',{detail:ctx}));
  console.info('[DINI] Engine V3 FINAL bridge ready',ctx);
})();
