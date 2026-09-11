(()=>{
  'use strict';
  const params=new URLSearchParams(location.search);
  if(params.get('handoff')!=='1')return;
  const template=String(params.get('template')||'').trim();
  if(!template)return;
  const frame=document.getElementById('previewFrame');
  if(!frame||!window.supabase?.createClient)return;

  const SB_URL='https://jfvmcerrsxjvbiogfqes.supabase.co';
  const SB_KEY='sb_publishable_3IqSDxkpxCGiDpxAEwdsXQ_AsJpsC4W';
  const sb=window.supabase.createClient(SB_URL,SB_KEY);
  let exactHtml='',sourceUrl='',armed=false,installing=false,installed=false,retry=0;

  const sameTemplateRow=async()=>{
    let res=await sb.from('templates').select('id,name,slug,source_path,updated_at,manifest_json').eq('slug',template).limit(1).maybeSingle();
    if(res.error)throw res.error;
    if(!res.data&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(template)){
      res=await sb.from('templates').select('id,name,slug,source_path,updated_at,manifest_json').eq('id',template).limit(1).maybeSingle();
      if(res.error)throw res.error;
    }
    if(!res.data)throw new Error('Template record tidak ditemukan');
    return res.data;
  };

  const normalize=(html,row)=>{
    const source=String(row.source_path||'').trim();
    const u=new URL(source,location.href);
    let assetBase=String(row.manifest_json?.asset_base||'').trim();
    if(!assetBase)assetBase=new URL('./',u.href).href;
    else try{const au=new URL(assetBase,location.href);assetBase=/\.[a-z0-9]{1,8}(?:$|[?#])/i.test(au.pathname)?new URL('./',au.href).href:(au.href.endsWith('/')?au.href:au.href+'/')}catch{assetBase=new URL('./',u.href).href}
    let out=String(html||'');
    out=out.replace(/<base\b[^>]*data-dini-template-base[^>]*>/ig,'').replace(/<base\b[^>]*>/ig,'');
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
      frame.dataset.exactTemplateSource=template;
      frame.dataset.exactTemplateUrl=sourceUrl;
      frame.srcdoc=exactHtml;
      installed=true;
      console.info('EXACT_TEMPLATE_PREVIEW_V2275',{template,sourceUrl});
    }finally{installing=false}
  };

  const evaluate=()=>{
    if(!armed||installed||!exactHtml)return;
    const status=document.getElementById('dirtyState')?.textContent||'';
    const sourceGraph=/SOURCE GRAPH LOADED|FETCH SNAPSHOT LOADED/i.test(status);
    if(!sourceGraph&&retry++<20)return setTimeout(evaluate,120);
    // For Template Library edit, exact DB source is the visual source of truth.
    // Wait one tick so editor.js finishes its own srcdoc assignment, then replace it exactly once.
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
    }catch(err){console.warn('EXACT_TEMPLATE_PREVIEW_V2275_FAILED',err)}
  })();

  // If another editor rebuild later replaces srcdoc with a blank document before the user edits,
  // restore the selected template once more. Do not fight intentional live mutations after a healthy preview exists.
  frame.addEventListener('load',()=>{
    if(!installed||installing)return;
    setTimeout(()=>{
      if(meaningfulVisible()>0)return;
      if(retry>28)return;
      installed=false;retry++;installExact();
    },700);
  },true);
})();
