(async()=>{
  const frame=document.getElementById('cleanFrame'),empty=document.getElementById('empty');let snap=null;
  const previewTemplate=String(new URLSearchParams(location.search).get('template')||'standalone').trim()||'standalone';
  const previewScopedKey=base=>`${base}:${encodeURIComponent(previewTemplate)}`;
  const appliedKey=`native-applied:${previewTemplate}`;
  const openDB=()=>new Promise((res,rej)=>{const q=indexedDB.open('dini-anif-editor-v150',2);q.onupgradeneeded=()=>{const db=q.result;if(!db.objectStoreNames.contains('assets'))db.createObjectStore('assets');if(!db.objectStoreNames.contains('snapshots'))db.createObjectStore('snapshots')};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
  try{const db=await openDB();snap=await new Promise((res,rej)=>{const tx=db.transaction('snapshots');const q=tx.objectStore('snapshots').get(appliedKey);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)})}catch(e){console.warn('Applied snapshot IndexedDB read:',e)}
  if(!snap){try{snap=JSON.parse(sessionStorage.getItem(previewScopedKey('diniAnifCleanPreviewApplied'))||localStorage.getItem(previewScopedKey('diniAnifNativeApplied'))||'null')}catch{}}
  if(!snap?.html){frame.hidden=true;empty.hidden=false;return}empty.hidden=true;frame.hidden=false;
  const get=(db,key)=>new Promise((res,rej)=>{const tx=db.transaction('assets');const q=tx.objectStore('assets').get(key);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
  const blobs=new Map(),blobUrls=new Map(),urls=[];let html=snap.html;
  try{
    const db=await openDB();for(const a of snap.assets||[]){const b=await get(db,a.key);if(b)blobs.set(a.path,b)}
    // Non-CSS first so localized stylesheet url(..) references can be rewritten to live blob URLs.
    for(const [path,b] of blobs){if(/\.css$/i.test(path))continue;const u=URL.createObjectURL(b);urls.push(u);blobUrls.set(path,u)}
    for(const [path,b] of blobs){if(!/\.css$/i.test(path))continue;let css=await b.text();for(const [depPath,u] of blobUrls){if(!depPath.startsWith('assets/source/deps/'))continue;const base=depPath.slice('assets/source/deps/'.length);css=css.split('../deps/'+base).join(u);css=css.split(depPath).join(u)}const u=URL.createObjectURL(new Blob([css],{type:'text/css'}));urls.push(u);blobUrls.set(path,u)}
    for(const [path,u] of blobUrls)html=html.split(path).join(u);
  }catch(e){console.warn('Clean asset hydrate:',e)}
  frame.srcdoc=html;
  // V1.7.4 — Clean Preview uses the SAME Clean Dependency Sweep exporter as Editor.
  function depHash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16).padStart(8,'0')}
  function depCleanUrl(raw){return String(raw||'').replace(/&amp;/g,'&').replace(/&quot;.*$/,'').replace(/["'<>\s]+$/g,'').trim()}
  function depBaseName(url,ct=''){let n='asset';try{const u=new URL(url);n=decodeURIComponent(u.pathname.split('/').pop()||'asset')}catch{}n=n.replace(/[^a-zA-Z0-9._-]+/g,'-').slice(-100)||'asset';if(!/\.[a-z0-9]{2,6}$/i.test(n)){const m={'text/css':'.css','image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','image/gif':'.gif','image/svg+xml':'.svg','video/mp4':'.mp4','audio/mpeg':'.mp3','font/woff':'.woff','font/woff2':'.woff2','application/font-woff':'.woff'}[String(ct||'').split(';')[0]];if(m)n+=m}return n}
  function depIsAssetUrl(raw){const url=depCleanUrl(raw);let u;try{u=new URL(url)}catch{return false}if(!/^https?:$/.test(u.protocol))return false;const p=u.pathname.toLowerCase(),h=u.hostname.toLowerCase();if(h==='fonts.googleapis.com')return true;if(h==='fonts.gstatic.com')return p!=='/'&&p!=='';if(/\.(css|js|mjs|jpg|jpeg|png|gif|webp|avif|svg|mp4|webm|mp3|ogg|wav|woff2?|ttf|otf|eot)(?:$|\?)/i.test(p+u.search))return true;if(h==='web.galeriundanganofficial.com'&&/\/wp-content\//i.test(p))return true;return false}
  function depExtractUrls(text){const out=new Set();const re=/https?:\/\/[^\s"'<>\)]+/g;for(const m of String(text||'').matchAll(re)){let u=depCleanUrl(m[0]);u=u.replace(/(?:&quot;|&#0*34;).*$/i,'');if(depIsAssetUrl(u))out.add(u)}return [...out]}
  function depKnownMissingOptional(raw){let u;try{u=new URL(depCleanUrl(raw))}catch{return false}if(u.hostname!=='web.galeriundanganofficial.com')return false;return /\/(?:divider-icon|form-datalist|list-bullet|loading)\.svg$/i.test(u.pathname)||/\/modal_x\.png$/i.test(u.pathname)}
  function depTransparentReplacement(url){return /\.png(?:$|\?)/i.test(url)?'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=':'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221%22 height=%221%22/%3E'}
  async function depFetchBlob(url){
    let offset=0,total=0,chunks=[],type='',name='',guard=0;
    while(guard++<180){
      const ctl=new AbortController();
      const tm=setTimeout(()=>ctl.abort(),35000);
      let r;
      try{
        r=await fetch('/api/fetch-asset?url='+encodeURIComponent(url)+'&offset='+offset+'&size=3000000',{cache:'no-store',signal:ctl.signal});
      }catch(e){
        if(e?.name==='AbortError') throw new Error('Timeout 35 detik');
        throw e;
      }finally{clearTimeout(tm)}
      if(!r.ok){let msg='HTTP '+r.status;try{msg=(await r.json()).error||msg}catch{}throw new Error(msg)}
      const b=await r.blob();if(!b.size)throw new Error('Asset kosong');
      if(!type)type=r.headers.get('content-type')||b.type||'application/octet-stream';
      if(!name)try{name=decodeURIComponent(r.headers.get('x-asset-name')||'')}catch{};
      total=Number(r.headers.get('x-asset-total')||0)||total||b.size;
      chunks.push(b);offset+=b.size;
      const range=r.headers.get('x-asset-range')==='1';
      if(offset>=total||!range)break;
    }
    return {blob:new Blob(chunks,{type}),type,total:offset,name:name||depBaseName(url,type)}
  }
  function depCssRefs(css,base){const out=[];const add=v=>{v=String(v||'').trim().replace(/^[\'\"]|[\'\"]$/g,'');if(!v||v.startsWith('data:')||v.startsWith('#'))return;try{const u=new URL(v,base).href;if(depIsAssetUrl(u))out.push(u)}catch{}};String(css||'').replace(/url\(([^)]+)\)/gi,(_,v)=>(add(v),_));String(css||'').replace(/@import\s+(?:url\()?\s*[\'\"]?([^\'\"\s\)]+)[\'\"]?\)?/gi,(_,v)=>(add(v),_));return [...new Set(out)]}
  function depRel(fromPath,toPath){const a=fromPath.split('/');a.pop();const b=toPath.split('/');while(a.length&&b.length&&a[0]===b[0]){a.shift();b.shift()}return '../'.repeat(a.length)+b.join('/')||'./'}
  async function localizeProductionHtml(inputHtml,onProgress=()=>{}){
    let html=String(inputHtml||''),queue=depExtractUrls(html),seen=new Set(),map=new Map(),outBlobs=new Map(),cssText=new Map(),failed=[];
    let cursor=0,processed=0; const MAX=420, CONCURRENCY=6;
    while(cursor<queue.length && processed<MAX){
      const batch=[];
      while(cursor<queue.length && batch.length<CONCURRENCY && processed+batch.length<MAX){
        const url=queue[cursor++]; if(seen.has(url))continue; seen.add(url); batch.push(url);
      }
      if(!batch.length) continue;
      await Promise.all(batch.map(async url=>{
        try{
          const got=await depFetchBlob(url),path='assets/source/'+depHash(url)+'-'+depBaseName(url,got.type);
          map.set(url,path);
          if(String(got.type).toLowerCase().includes('text/css')||/\.css(?:\?|$)/i.test(url)||new URL(url).hostname==='fonts.googleapis.com'){
            const txt=await got.blob.text();cssText.set(url,txt);
            for(const child of depCssRefs(txt,url)) if(!seen.has(child)&&!queue.includes(child))queue.push(child);
          }else outBlobs.set(path,got.blob);
        }catch(e){if(depKnownMissingOptional(url)){map.set(url,depTransparentReplacement(url))}else failed.push({url,error:e.message||String(e)})}
        finally{processed++;onProgress({processed,total:Math.min(MAX,Math.max(queue.length,processed)),failed:failed.length,localized:map.size})}
      }));
    }
    for(const [url,path] of map){html=html.split(url).join(path);html=html.split(url.replace(/&/g,'&amp;')).join(path)}
    for(const [url,txt0] of cssText){let txt=txt0;for(const child of depCssRefs(txt0,url)){const p=map.get(child);if(!p)continue;let variants=[child];try{const cu=new URL(child),bu=new URL(url);if(cu.origin===bu.origin){variants.push(cu.pathname+cu.search);const baseDir=bu.pathname.slice(0,bu.pathname.lastIndexOf('/')+1);if(cu.pathname.startsWith(baseDir))variants.push(cu.pathname.slice(baseDir.length)+cu.search)}}catch{}const rel=String(p).startsWith('data:')?p:depRel(map.get(url),p);for(const v of variants)txt=txt.split(v).join(rel)}outBlobs.set(map.get(url),new Blob([txt],{type:'text/css'}))}
    const remaining=depExtractUrls(html).filter(u=>!map.has(u));
    return {html,blobs:outBlobs,audit:{version:'1.8.0',localized_count:map.size,failed_count:failed.length,remaining_runtime_dependency_count:remaining.length,localized:[...map].map(([url,path])=>({url,path})),failed,remaining_runtime_dependencies:remaining,generated_at:new Date().toISOString()}}
  }
  document.getElementById('downloadCleanZip').onclick=async()=>{
    const btn=document.getElementById('downloadCleanZip'),save=document.getElementById('saveCleanZip'),status=document.getElementById('sweepStatus'),oldText=btn.textContent;
    btn.disabled=true;btn.textContent='Sweeping…';save.hidden=true;status.textContent='Menyiapkan sweep…';
    let objectUrl='';
    try{
      const clean=await localizeProductionHtml(snap.html,p=>{status.textContent=`Sweep ${p.processed}/${p.total} · lokal ${p.localized} · gagal ${p.failed}`});
      status.textContent='Menyusun ZIP…';
      const entries=[{name:'index.html',data:clean.html},{name:'source-native.html',data:clean.html},{name:'native-schema.json',data:JSON.stringify(snap.schema||{},null,2)},{name:'native-data.json',data:JSON.stringify(snap.values||{},null,2)},{name:'dependency-audit.json',data:JSON.stringify(clean.audit,null,2)},{name:'manifest.json',data:JSON.stringify({...snap.manifest,exported_at:new Date().toISOString(),preview:'clean-parity-v1.8.0',editor:'v1.8.0',revision:snap.revision,dependency_audit:{localized:clean.audit.localized_count,failed:clean.audit.failed_count,remaining_runtime:clean.audit.remaining_runtime_dependency_count}},null,2)},{name:'README-CLEAN-DEPENDENCY.txt',data:`Dini Anif Production ZIP V1.8.0\nLocalized runtime dependencies: ${clean.audit.localized_count}\nFailed localization: ${clean.audit.failed_count}\nRemaining runtime dependencies: ${clean.audit.remaining_runtime_dependency_count}\n`}];
      for(const a of snap.assets||[]){const b=blobs.get(a.path);if(b)entries.push({name:a.path,data:b})}
      for(const [path,b] of clean.blobs)entries.push({name:path,data:b});
      const blob=await window.UNDANGAN_ZIP.buildZip(entries);
      objectUrl=URL.createObjectURL(blob);
      save.href=objectUrl;save.download='dini-anif-native-production-v180-clean.zip';save.hidden=false;
      status.textContent=`ZIP siap · ${clean.audit.localized_count} lokal · ${clean.audit.failed_count} gagal · ${clean.audit.remaining_runtime_dependency_count} sisa`;
      // Auto-download where browser still permits it. Persistent Save link is the reliable fallback, especially on iPhone/Safari after long async work.
      try{const a=document.createElement('a');a.href=objectUrl;a.download=save.download;document.body.appendChild(a);a.click();a.remove()}catch(e){console.warn('Auto download blocked:',e)}
      btn.textContent='ZIP Siap';
      setTimeout(()=>{if(!save.hidden) save.textContent='Simpan ZIP';},50);
      // Keep object URL alive until page unload; revoking early can cancel Safari downloads.
      save.dataset.objectUrl=objectUrl;
    }catch(e){
      console.error(e);status.textContent='Export gagal: '+(e.message||e);btn.textContent='Coba Lagi';
    }finally{btn.disabled=false;if(btn.textContent==='Sweeping…')btn.textContent=oldText}
  };
  if(new URLSearchParams(location.search).get('download')==='1'){setTimeout(()=>document.getElementById('downloadCleanZip')?.click(),260);}
  addEventListener('beforeunload',()=>{urls.forEach(URL.revokeObjectURL);const s=document.getElementById('saveCleanZip');if(s?.dataset?.objectUrl)URL.revokeObjectURL(s.dataset.objectUrl)});
})().catch(e=>{console.error(e);const el=document.getElementById('empty');el.hidden=false;el.textContent='Clean Preview gagal: '+e.message});
