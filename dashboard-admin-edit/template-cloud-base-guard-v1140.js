(()=>{
  'use strict';
  if(window.__DINI_CLOUD_BASE_GUARD_1140__)return;
  window.__DINI_CLOUD_BASE_GUARD_1140__=true;

  const realFetch=window.fetch.bind(window);
  const dirname=url=>{try{const u=new URL(url,location.href);if(/\.[a-z0-9]{1,8}$/i.test(u.pathname.split('/').pop()||''))u.pathname=u.pathname.replace(/[^/]*$/,'');if(!u.pathname.endsWith('/'))u.pathname+='/';u.search='';u.hash='';return u.href}catch{return ''}};
  const embeddedBase=(html,manifest={})=>{
    try{
      const doc=new DOMParser().parseFromString(String(html||''),'text/html');
      const raw=String(doc.querySelector('base')?.getAttribute('href')||'').trim();
      if(raw)return dirname(new URL(raw,manifest?.source_url||location.href).href)||raw;
    }catch{}
    const source=String(manifest?.source_url||'').trim();if(source)return dirname(source);
    const current=String(manifest?.asset_base||'').trim();if(current)return dirname(current)||current;
    return location.origin+'/';
  };

  window.fetch=async function guardedFetch(input,init){
    const res=await realFetch(input,init);
    let url='';try{url=String(typeof input==='string'?input:input?.url||res.url||'')}catch{}
    if(!/editor-snapshot\.json(?:$|[?#])/i.test(url))return res;
    try{
      const text=await res.clone().text();
      const snap=JSON.parse(text);
      if(!snap||typeof snap!=='object'||!(snap.html||snap.baseHtml))return res;
      const manifest={...(snap.manifest||{})};
      const assetBase=embeddedBase(snap.html||snap.baseHtml,manifest);
      if(assetBase)manifest.asset_base=assetBase;
      snap.manifest={...manifest,cloud_base_guard:'1.14.0'};
      return new Response(JSON.stringify(snap),{status:res.status,statusText:res.statusText,headers:new Headers(res.headers)});
    }catch(err){console.warn('TEMPLATE_CLOUD_BASE_GUARD_V1140',err);return res}
  };
  document.documentElement.dataset.cloudBaseGuard='v1.14.0';
})();
