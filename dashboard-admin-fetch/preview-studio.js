(() => {
  const frame=document.getElementById('rebuildPreviewFrame'),empty=document.getElementById('previewEmpty'),meta=document.getElementById('previewMeta'),diag=document.getElementById('previewDiag');
  function decodeSnapshotFromUrl(){
    try{const hash=location.hash||'';const m=hash.match(/(?:^#|&)snapshot=([^&]+)/);if(!m)return null;let b64=m[1].replace(/-/g,'+').replace(/_/g,'/');while(b64.length%4)b64+='=';const binary=atob(b64);const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));return new TextDecoder().decode(bytes)}catch(err){console.warn('URL snapshot decode failed:',err);return null}
  }
  function getLocalRaw(){
    let raw=decodeSnapshotFromUrl();if(raw)return {raw,source:'URL payload'};
    try{raw=sessionStorage.getItem('diniAnifRebuildSnapshot')}catch{} if(raw)return {raw,source:'sessionStorage'};
    try{raw=localStorage.getItem('diniAnifRebuildSnapshot')}catch{} if(raw)return {raw,source:'localStorage'};
    if(typeof window.name==='string'&&window.name.startsWith('__DINI_ANIF_REBUILD__'))return {raw:window.name.slice('__DINI_ANIF_REBUILD__'.length),source:'window.name'};
    return {raw:'',source:'none'};
  }
  async function getHandoff(){
    const id=new URLSearchParams(location.search).get('id');
    if(id){
      try{
        meta.textContent='Memuat shareable preview '+id+'…';
        const response=await fetch('/api/preview-load?id='+encodeURIComponent(id),{headers:{Accept:'application/json'}});
        const result=await response.json().catch(()=>({ok:false,error:'Response preview backend tidak valid.'}));
        if(!response.ok||!result.ok)throw new Error(result.error||('HTTP '+response.status));
        return {raw:typeof result.snapshot==='string'?result.snapshot:JSON.stringify(result.snapshot),source:'server:'+id,id};
      }catch(err){
        console.warn('Server preview load failed:',err);
        const local=getLocalRaw();
        if(local.raw)return {...local,warning:err.message};
        return {raw:'',source:'server-error',warning:err.message,id};
      }
    }
    return getLocalRaw();
  }
  function showEmpty(message){frame.hidden=true;empty.hidden=false;if(diag)diag.textContent=message||'Snapshot handoff tidak ditemukan.'}
  function newEditorHandoffToken(){
    try{return crypto.randomUUID()}catch{return 'h-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)}
  }
  function persistEditorHandoff(raw,token){
    const key='diniAnifRebuildSnapshot:'+token;let saved=0;
    try{sessionStorage.setItem(key,raw);saved++}catch(err){console.warn('scoped session handoff failed',err)}
    try{localStorage.setItem(key,raw);saved++}catch(err){console.warn('scoped local handoff failed',err)}
    try{window.name='__DINI_ANIF_REBUILD_SCOPED__'+token+'__'+raw;saved++}catch(err){console.warn('scoped window.name handoff failed',err)}
    return saved
  }
  async function main(){
    const handoff=await getHandoff(),raw=handoff.raw;
    if(!raw){showEmpty(handoff.warning?('Preview server gagal: '+handoff.warning):'Snapshot handoff tidak ditemukan.');return}
    let pack;try{pack=JSON.parse(raw)}catch(err){showEmpty('Snapshot JSON gagal dibaca: '+err.message);return}
    const editorHandoffToken=newEditorHandoffToken();
    const editorHandoffSaved=persistEditorHandoff(raw,editorHandoffToken);
    const openEditorBtn=document.getElementById('openEditorBtn');
    if(openEditorBtn)openEditorBtn.onclick=e=>{
      e.preventDefault();
      const saved=persistEditorHandoff(raw,editorHandoffToken);
      if(!saved){alert('Snapshot Fetch Editor terlalu besar dan tidak dapat disimpan untuk handoff. Kembali ke Fetch lalu Generate ulang.');return}
      location.href='/dashboard-admin-fetch-editor/?mode=fetch&handoff='+encodeURIComponent(editorHandoffToken);
    };
    empty.hidden=true;frame.hidden=false;
    const nativeHtml=pack.native?.html || (()=>{try{return sessionStorage.getItem('diniAnifNativeHtml')||localStorage.getItem('diniAnifNativeHtml')||''}catch{return ''}})();
    meta.textContent=`Parity ${pack.report?.parity_score??'—'}% · Editable ${pack.report?.editable_coverage??100}% · Unsupported ${pack.report?.unsupported_items??0} · ${nativeHtml?'SOURCE NATIVE':'Legacy'} · ${handoff.source}${handoff.warning?' · fallback':''} · Fetch Editor handoff ${editorHandoffToken.slice(0,8)} ${editorHandoffSaved}/3`;
    if(nativeHtml){
      frame.removeAttribute('src');
      frame.setAttribute('sandbox','allow-scripts allow-forms allow-popups allow-modals allow-downloads');
      frame.srcdoc=nativeHtml;
    }else{
      try{localStorage.setItem('artSundaMerahPreview',JSON.stringify(pack.data));sessionStorage.setItem('artSundaMerahPreview',JSON.stringify(pack.data))}catch{}
      frame.src='./invitation.html?rebuildPreview=1&ts='+Date.now();
    }
    document.getElementById('downloadPreviewZip').onclick=async()=>{
      const entries=[
        {name:'manifest.json',data:JSON.stringify(pack.manifest,null,2)},
        {name:'schema.json',data:JSON.stringify(pack.schema,null,2)},
        {name:'data.json',data:JSON.stringify(pack.data,null,2)},
        {name:'motion.json',data:JSON.stringify(pack.motion,null,2)},
        {name:'source-report.json',data:JSON.stringify(pack.report,null,2)},
        {name:'source-native.html',data:nativeHtml||''},
        {name:'native-schema.json',data:JSON.stringify(pack.native?.schema||{},null,2)},
        {name:'visual-manifest.json',data:JSON.stringify(pack.manifest?.visual_manifest||{version:3,sources:[]},null,2)},{name:'source-graph.json',data:JSON.stringify(pack.manifest?.source_graph||{version:3,visuals:[],interactions:[]},null,2)},
        {name:'README.txt',data:'DINI ANIF REBUILD PACKAGE V2.23 — UNIVERSAL VISUAL RESOLVER\nPreview memakai source-native.html.\n'}
      ];
      const blob=await window.UNDANGAN_ZIP.buildZip(entries),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='dini-anif-source-native-rebuild.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
    };
  }
  main().catch(err=>showEmpty('Preview runtime gagal: '+err.message));
})();
