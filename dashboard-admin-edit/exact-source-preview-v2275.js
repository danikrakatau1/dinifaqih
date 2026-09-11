(()=>{
  'use strict';
  const params=new URLSearchParams(location.search);
  if(params.get('handoff')!=='1')return;
  const template=String(params.get('template')||'').trim();
  const recordId=String(params.get('record')||template).trim();
  if(!template||!recordId)return;
  const frame=document.getElementById('previewFrame');
  if(!frame||!window.supabase?.createClient)return;

  const SB_URL='https://jfvmcerrsxjvbiogfqes.supabase.co';
  const SB_KEY='sb_publishable_3IqSDxkpxCGiDpxAEwdsXQ_AsJpsC4W';
  const sb=window.supabase.createClient(SB_URL,SB_KEY);
  let exactHtml='',sourceUrl='',armed=false,installing=false,installed=false,retry=0;

  const sameTemplateRow=async()=>{
    const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    let res;
    if(uuid.test(recordId)){
      res=await sb.from('templates').select('id,name,slug,source_path,updated_at,manifest_json').eq('id',recordId).limit(1).maybeSingle();
    }else if(uuid.test(template)){
      res=await sb.from('templates').select('id,name,slug,source_path,updated_at,manifest_json').eq('id',template).limit(1).maybeSingle();
    }else{
      res=await sb.from('templates').select('id,name,slug,source_path,updated_at,manifest_json').eq('slug',template).limit(1).maybeSingle();
    }
    if(res.error)throw res.error;
    if(!res.data)throw new Error('Template record tidak ditemukan');
    if(uuid.test(recordId)&&String(res.data.id)!==recordId)throw new Error('Template record mismatch');
    return res.data;
  };

  const normalize=(html,row)=>{
    const source=String(row.source_path||'').trim();
    const u=new URL(source,location.href);
    let assetBase=String(row.manifest_json?.asset_base||'').trim();

    // V2.27.6 — Template 1 is the built-in Dini/Faqih app template. Its authored HTML
    // intentionally uses root-relative /assets/... URLs, therefore the editor must use
    // the app origin as its base exactly like dashboard-admin-template/preview.html and
    // the public bootstrap in /index.html. Other templates continue to resolve against
    // their own stored revision/source directory.
    if(!assetBase){
      assetBase=row.slug==='template-1'?location.origin+'/':new URL('./',u.href).href;
    }else{
      try{
        const au=new URL(assetBase,location.href);
        assetBase=/\.[a-z0-9]{1,8}(?:$|[?#])/i.test(au.pathname)?new URL('./',au.href).href:(au.href.endsWith('/')?au.href:au.href+'/');
      }catch{assetBase=row.slug==='template-1'?location.origin+'/':new URL('./',u.href).href}
    }

    // A stale early Template-1 draft may carry a revision-folder asset_base. Root assets
    // are authoritative for this built-in template, so force the same origin used by the
    // working Preview/Public path.
    if(row.slug==='template-1')assetBase=location.origin+'/';

    let out=String(html||'');
    out=out.replace(/<base\b[^>]*data-dini-template-base[^>]*>/ig,'').replace(/<base\b[^>]*>/ig,'');

    if(row.slug==='template-1'){
      const rev=encodeURIComponent(row.updated_at||Date.now());
      out=out.replace(/((?:src|href)=["'])(\/assets\/(?:js|css)\/[^"'?#]+)(?:\?[^"']*)?(["'])/gi,(_,a,path,q)=>a+path+'?_tpl='+rev+q);
    }

    const safeBase=assetBase.replace(/"/g,'&quot;');
    if(/<head(\s[^>]*)?>/i.test(out))out=out.replace(/<head(\s[^>]*)?>/i,m=>m+'<base data-dini-template-base="1" href="'+safeBase+'">');
    else out='<!doctype html><html><head><base data-dini-template-base="1" href="'+safeBase+'"></head><body>'+out+'</body></html>';
    return out;
  };

  const meaningfulVisible=()=>{
    try{
      const d=frame.contentDocument,w=d?.defaultView;if(!d?.body||!w)return 0;
      return [...d.querySelectorAll('h1,h2,h3,h4,p,a,button,img,video,[data-native-edit-id],[data-native-edit-ids]')].filter(el=>{
        const cs=w.getComputedStyle(el),r=el.getBoundingClientRect();
        if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity||1)<=.01||r.width<=2||r.height<=2)return false;
        if(el.tagName==='IMG'&&el.complete&&el.naturalWidth===0)return false;
        return true;
      }).length;
    }catch{return 0}
  };

  const installExact=()=>{
    if(installed||installing||!exactHtml)return;
    installing=true;
    try{
      frame.dataset.exactTemplateSource=recordId;
      frame.dataset.exactTemplateUrl=sourceUrl;
      frame.srcdoc=exactHtml;
      installed=true;
      console.info('EXACT_TEMPLATE_PREVIEW_V2280',{template,recordId,sourceUrl});
    }finally{installing=false}
  };

  const evaluate=()=>{
    if(!armed||installed||!exactHtml)return;
    const status=document.getElementById('dirtyState')?.textContent||'';
    const sourceGraph=/SOURCE GRAPH LOADED|FETCH SNAPSHOT LOADED/i.test(status);
    if(!sourceGraph&&retry++<20)return setTimeout(evaluate,120);
    setTimeout(installExact,30);
  };

  (async()=>{
    try{
      const row=await sameTemplateRow();
      sourceUrl=String(row.source_path||'').trim();
      if(!sourceUrl||sourceUrl==='/')return;
      const u=new URL(sourceUrl,location.href);u.searchParams.set('_editor_exact',String(row.updated_at||Date.now()));
      const r=await fetch(u.href,{cache:'no-store'});if(!r.ok)throw new Error('Exact source HTTP '+r.status);
      exactHtml=normalize(await r.text(),row);armed=true;evaluate();
    }catch(err){console.warn('EXACT_TEMPLATE_PREVIEW_V2280_FAILED',err)}
  })();

  frame.addEventListener('load',()=>{
    if(!installed||installing)return;
    setTimeout(()=>{
      if(meaningfulVisible()>0)return;
      if(retry>28)return;
      installed=false;retry++;installExact();
    },700);
  },true);
})();
