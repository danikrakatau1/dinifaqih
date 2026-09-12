(async()=>{
  const loadScript = src => new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('Gagal load '+src));document.body.appendChild(s);
  });
  try{
    const r=await fetch('./editor.js?v=source-runtime-195',{cache:'no-store'});
    if(!r.ok)throw new Error('editor.js HTTP '+r.status);
    let src=await r.text();

    if(!src.includes('let selectedMediaClickPoint=null;')){
      const old=" let selectedMediaStackIds=[];";
      const replacement=" let selectedMediaStackIds=[];\n let selectedMediaClickPoint=null;\n let selectedMediaSectionContext=null;";
      if(!src.includes(old))throw new Error('Anchor selectedMediaStackIds tidak ditemukan');
      src=src.replace(old,replacement);
    }

    if(!src.includes('function mediaVisualScore(')){
      const anchor=' function runtimeBgUrl(styleValue){';
      const helper=` function visualSectionContext(doc,target){\n   if(!doc||!target)return null;\n   const tops=[...doc.querySelectorAll('.elementor-top-section, body > section')];\n   const sec=target.closest?.('.elementor-top-section, body > section')||null;\n   const index=tops.indexOf(sec);\n   if(index<0)return null;\n   const key=String(sec?.id||sec?.getAttribute?.('data-id')||('section-'+(index+1)));\n   return {index,key};\n }\n function fieldMatchesSection(f,ctx){\n   if(!ctx||!f)return true;\n   const fieldKey=String(f.section_id||'');\n   if(fieldKey&&ctx.key&&fieldKey===ctx.key)return true;\n   const si=Number(f.section_index);\n   return Number.isFinite(si)&&si===ctx.index;\n }\n function mediaVisualScore(f,doc,x,y,sectionCtx=null){\n   if(!f||!doc||!['image','background','video','audio'].includes(f.kind))return -1e9;\n   if(sectionCtx&&!fieldMatchesSection(f,sectionCtx))return -1e9;\n   const node=nodeFor(doc,f);if(!node)return -1e9;\n   let r;try{r=node.getBoundingClientRect()}catch{return -1e9}\n   if(!r||r.width<2||r.height<2)return -1e9;\n   const hasPoint=Number.isFinite(x)&&Number.isFinite(y);\n   const inside=!hasPoint||(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom);\n   if(hasPoint&&!inside)return -1e9;\n   let score=inside?180:0;\n   if(f.media_role==='css-overlay')score+=240;\n   else if(f.media_role==='pseudo-background')score+=150;\n   else if(f.media_role==='gallery')score+=130;\n   else if(f.kind==='image')score+=75;\n   else if(f.kind==='background')score+=70;\n   const sem=String(f.semantic_role||'').toLowerCase();\n   if(/portrait|mempelai|bride|groom/.test(sem))score+=260;\n   if(/decoration|ornament|cover-decoration/.test(sem))score-=90;\n   let cs=null;try{cs=doc.defaultView?.getComputedStyle(node)||null}catch{}\n   if(cs){\n     const radii=[cs.borderTopLeftRadius,cs.borderTopRightRadius,cs.borderBottomRightRadius,cs.borderBottomLeftRadius].map(v=>parseFloat(v)||0);\n     const radius=Math.max(...radii,0),short=Math.max(1,Math.min(r.width,r.height));\n     if(radius>=80||radius>=short*.34)score+=220;\n     const bgSize=String(cs.backgroundSize||'').toLowerCase();\n     const bgImage=String(cs.backgroundImage||'');\n     if(bgImage&&bgImage!=='none')score+=45;\n     if(/cover/.test(bgSize))score+=70;\n     if(/\\d+(?:\\.\\d+)?%\\s+auto|auto\\s+\\d+(?:\\.\\d+)?%/.test(bgSize))score-=120;\n     const zi=parseInt(cs.zIndex,10);if(Number.isFinite(zi))score+=Math.max(-20,Math.min(40,zi*4));\n   }\n   const viewport=Math.max(1,(doc.defaultView?.innerWidth||450)*(doc.defaultView?.innerHeight||800));\n   const ratio=Math.min(2,(r.width*r.height)/viewport);\n   score-=ratio*70;\n   if(r.width<=360&&r.height<=520)score+=35;\n   if(f.css_selector&&/elementor-background-overlay/.test(f.css_selector))score+=90;\n   return score;\n }\n function rankMediaFields(fields,doc,x,y,preferGallery=false,sectionCtx=null){\n   const uniq=[];const seen=new Set();\n   for(const f of fields||[]){if(!f||seen.has(f.id)||!['image','background','video','audio'].includes(f.kind))continue;seen.add(f.id);uniq.push(f)}\n   return uniq.map(f=>({f,score:mediaVisualScore(f,doc,x,y,sectionCtx)+(preferGallery&&f.media_role==='gallery'?500:0)})).filter(x=>x.score>-1e8).sort((a,b)=>b.score-a.score).map(x=>x.f);\n }\n`;
      if(!src.includes(anchor))throw new Error('Anchor runtimeBgUrl tidak ditemukan');
      src=src.replace(anchor,helper+anchor);
    }

    {
      const old=`     let fs=[];const direct=editableNode(e.target);if(direct)fs=[...proxyFields(direct),...fieldsForNode(direct)];\n     const hit=hitFieldsAtPoint(doc,e.clientX,e.clientY);\n     selectedMediaStackIds=hit.filter(f=>['image','background','video','audio','effect'].includes(f.kind)).map(f=>f.id);\n     if(hit.length&&!fs.some(f=>['image','background','video','audio'].includes(f.kind)))fs=hit\n     const galleryHost=e.target?.closest?.('.gallery-item,[data-native-gallery-item],a.e-gallery-item,a.elementor-gallery-item');\n     const media=fs.find(f=>['image','background','video','audio'].includes(f.kind))||hit.find(f=>['image','background','video','audio'].includes(f.kind));`;
      const replacement=`     let fs=[];const direct=editableNode(e.target);if(direct)fs=[...fieldsForNode(direct),...proxyFields(direct)];\n     const hit=hitFieldsAtPoint(doc,e.clientX,e.clientY);\n     const galleryHost=e.target?.closest?.('.gallery-item,[data-native-gallery-item],a.e-gallery-item,a.elementor-gallery-item');\n     selectedMediaClickPoint={x:e.clientX,y:e.clientY};\n     selectedMediaSectionContext=visualSectionContext(doc,e.target);\n     const rankedMedia=rankMediaFields([...fs,...hit],doc,e.clientX,e.clientY,!!galleryHost,selectedMediaSectionContext);\n     selectedMediaStackIds=rankedMedia.map(f=>f.id);\n     const media=rankedMedia[0]||null;\n     if(hit.length&&!fs.length)fs=hit;`;
      if(!src.includes(old))throw new Error('Anchor click-media V1.9.5 tidak ditemukan');
      src=src.replace(old,replacement);
    }

    // Canonical parity V1.9.5: all authored fields render first, then USER-CHANGED assets render last.
    // This prevents a later stale background alias/field on the same owner from overwriting an uploaded asset during APPLY/export.
    {
      const old=`function rebuildHtml({forExport=false}={}){const doc=parseNative(native.baseHtml);refreshVisualManifest();for(const f of native.schema.fields||[]){const a=generatedAssets.get(f.id);const v=a?(forExport?a.path:assetPreviewUrl(a)):(native.values[f.id]??f.value??'');applyField(doc,f,v)}for(const f of native.schema.fields||[]){if(transforms[f.id])applyTransform(nodeFor(doc,f),f,transforms[f.id])}`;
      const replacement=`function rebuildHtml({forExport=false}={}){const doc=parseNative(native.baseHtml);refreshVisualManifest();for(const f of native.schema.fields||[]){const a=generatedAssets.get(f.id);const v=a?(forExport?a.path:assetPreviewUrl(a)):(native.values[f.id]??f.value??'');applyField(doc,f,v)}for(const [aid,a] of generatedAssets){const f=fieldById(aid);if(!f||!a)continue;const v=forExport?a.path:assetPreviewUrl(a);applyField(doc,f,v)}for(const f of native.schema.fields||[]){if(transforms[f.id])applyTransform(nodeFor(doc,f),f,transforms[f.id])}`;
      if(!src.includes(old))throw new Error('Anchor rebuildHtml V1.9.5 tidak ditemukan');
      src=src.replace(old,replacement);
    }

    if(!src.includes('function linkedMediaAliasIds(id)')){
      const old=" function uploadFor(id,accept){const inp=document.createElement('input');inp.type='file';inp.accept=accept||'*/*';inp.onchange=()=>{const f=inp.files?.[0];if(!f)return;pushHistory();const name=f.name.replace(/[^a-zA-Z0-9._-]+/g,'-');generatedAssets.set(id,{blob:f,name,type:f.type||'application/octet-stream',path:'assets/generated/'+id+'-'+name,source:'upload'});setDirty('Perubahan asset belum di-APPLY');liveApply(id);renderNativeEditor();selectField(id,false);editorToast(`${f.name} siap dan akan ikut Production ZIP.`,'success','Upload sukses')};inp.click()}";
      const replacement=` function linkedMediaAliasIds(id){\n   const f=fieldById(id);if(!f||!native)return[id];\n   const kinds=new Set(['image','background']);if(!kinds.has(f.kind))return[id];\n   const doc=liveDoc(),node=doc&&nodeFor(doc,f);\n   const original=String(native.values[id]??f.value??'').trim();const ids=[];\n   for(const x of native.schema.fields||[]){\n     if(!kinds.has(x.kind))continue;if(x.id===id){ids.push(x.id);continue}\n     if(Number(x.section_index)!==Number(f.section_index))continue;\n     const xv=String(native.values[x.id]??x.value??'').trim();if(!original||xv!==original)continue;\n     let linked=!!(f.node_id&&x.node_id&&f.node_id===x.node_id)||!!(f.source_key&&x.source_key&&f.source_key===x.source_key);\n     if(!linked&&f.source_element_id&&x.source_element_id&&f.source_element_id===x.source_element_id&&f.media_role===x.media_role)linked=true;\n     if(!linked&&doc&&node){const xn=nodeFor(doc,x);linked=!!(xn&&xn===node)}\n     if(linked)ids.push(x.id)\n   }\n   return [...new Set(ids.length?ids:[id])]\n }\n function uploadFor(id,accept){const inp=document.createElement('input');inp.type='file';inp.accept=accept||'*/*';inp.onchange=()=>{const file=inp.files?.[0];if(!file)return;pushHistory();let targetId=id;const doc=liveDoc();if(doc&&selectedMediaClickPoint&&selectedMediaStackIds.length){const ranked=rankMediaFields(selectedMediaStackIds.map(fieldById).filter(Boolean),doc,selectedMediaClickPoint.x,selectedMediaClickPoint.y,false,selectedMediaSectionContext);if(ranked[0])targetId=ranked[0].id}const name=file.name.replace(/[^a-zA-Z0-9._-]+/g,'-');const asset={blob:file,name,type:file.type||'application/octet-stream',path:'assets/generated/'+targetId+'-'+name,source:'upload'};const aliases=linkedMediaAliasIds(targetId);for(const aid of aliases){generatedAssets.set(aid,asset);native.values[aid]=asset.path}setDirty('Perubahan asset belum di-APPLY');for(const aid of aliases)liveApply(aid);renderNativeEditor();selectField(targetId,false);const tf=fieldById(targetId);editorToast(\`${'${file.name}'} siap · section ${'${Number(tf?.section_index)+1}'} · owner ${'${targetId}'} · ${'${aliases.length}'} layer sinkron.\`,'success','Upload sukses')};inp.click()}`;
      if(!src.includes(old))throw new Error('Anchor uploadFor tidak ditemukan');
      src=src.replace(old,replacement);
    }

    (0,eval)(src+'\n//# sourceURL=editor-runtime-v195.js');
    await loadScript('./fetch-frame-rescue.js?v=147');
    await loadScript('./fetch-srcdoc-restore.js?v=148');
    await loadScript('./editor-protection-guard.js?v=191');
    await loadScript('./apply-live-parity.js?v=191');
    document.documentElement.dataset.editorRuntime='v1.9.5';
    const d=document.getElementById('dirtyState');if(d&&/Loading Editor/i.test(d.textContent||''))d.textContent='EDITOR V1.9.5 READY';
  }catch(err){
    console.error('EDITOR_RUNTIME_LOADER_V195',err);
    const d=document.getElementById('dirtyState');if(d)d.textContent='EDITOR V1.9.5 LOAD ERROR: '+(err.message||err);
  }
})();
