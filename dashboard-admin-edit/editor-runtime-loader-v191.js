(async()=>{
  const loadScript = src => new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('Gagal load '+src));document.body.appendChild(s);
  });
  try{
    const r=await fetch('./editor.js?v=source-runtime-191',{cache:'no-store'});
    if(!r.ok)throw new Error('editor.js HTTP '+r.status);
    let src=await r.text();

    if(!src.includes('const directImg=e.target?.closest?.')){
      const old="     let fs=[];const direct=editableNode(e.target);if(direct)fs=[...proxyFields(direct),...fieldsForNode(direct)];";
      const replacement=`     let fs=[];\n     const directImg=e.target?.closest?.('img[data-native-edit-id],img[data-native-edit-ids],img[data-native-node-id]');\n     if(directImg){\n       fs=[...fieldsForNode(directImg),...proxyFields(directImg)];\n       fs.sort((a,b)=>(b.kind==='image'?1:0)-(a.kind==='image'?1:0));\n     }else{\n       const direct=editableNode(e.target);if(direct)fs=[...fieldsForNode(direct),...proxyFields(direct)];\n     }`;
      if(!src.includes(old))throw new Error('Anchor direct-media tidak ditemukan');
      src=src.replace(old,replacement);
    }

    if(!src.includes('function linkedMediaAliasIds(id)')){
      const old=" function uploadFor(id,accept){const inp=document.createElement('input');inp.type='file';inp.accept=accept||'*/*';inp.onchange=()=>{const f=inp.files?.[0];if(!f)return;pushHistory();const name=f.name.replace(/[^a-zA-Z0-9._-]+/g,'-');generatedAssets.set(id,{blob:f,name,type:f.type||'application/octet-stream',path:'assets/generated/'+id+'-'+name,source:'upload'});setDirty('Perubahan asset belum di-APPLY');liveApply(id);renderNativeEditor();selectField(id,false);editorToast(`${f.name} siap dan akan ikut Production ZIP.`,'success','Upload sukses')};inp.click()}";
      const replacement=` function linkedMediaAliasIds(id){\n   const f=fieldById(id);if(!f||!native)return[id];\n   const kinds=new Set(['image','background']);\n   if(!kinds.has(f.kind))return[id];\n   const doc=liveDoc(),node=doc&&nodeFor(doc,f);\n   const host=node?.closest?.('[data-id],.elementor-widget,.elementor-element')||node?.parentElement||null;\n   const original=String(native.values[id]??f.value??'').trim();\n   const ids=[];\n   for(const x of native.schema.fields||[]){\n     if(!kinds.has(x.kind))continue;\n     if(x.id===id){ids.push(x.id);continue}\n     const xv=String(native.values[x.id]??x.value??'').trim();\n     if(!original||xv!==original)continue;\n     let linked=!!(f.node_id&&x.node_id&&f.node_id===x.node_id)||!!(f.source_element_id&&x.source_element_id&&f.source_element_id===x.source_element_id);\n     if(!linked&&host&&doc){const xn=nodeFor(doc,x);linked=!!(xn&&(host.contains(xn)||xn.contains?.(host)))}\n     if(linked)ids.push(x.id)\n   }\n   return [...new Set(ids.length?ids:[id])]\n }\n function uploadFor(id,accept){const inp=document.createElement('input');inp.type='file';inp.accept=accept||'*/*';inp.onchange=()=>{const f=inp.files?.[0];if(!f)return;pushHistory();const name=f.name.replace(/[^a-zA-Z0-9._-]+/g,'-');const asset={blob:f,name,type:f.type||'application/octet-stream',path:'assets/generated/'+id+'-'+name,source:'upload'};const aliases=linkedMediaAliasIds(id);for(const aid of aliases)generatedAssets.set(aid,asset);setDirty('Perubahan asset belum di-APPLY');for(const aid of aliases)liveApply(aid);renderNativeEditor();selectField(id,false);editorToast(\`${'${f.name}'} siap · ${'${aliases.length}'} linked layer tersinkron dan akan ikut Production ZIP.\`,'success','Upload sukses')};inp.click()}`;
      if(!src.includes(old))throw new Error('Anchor uploadFor tidak ditemukan');
      src=src.replace(old,replacement);
    }

    (0,eval)(src+'\n//# sourceURL=editor-runtime-v191.js');
    await loadScript('./fetch-frame-rescue.js?v=147');
    await loadScript('./fetch-srcdoc-restore.js?v=148');
    await loadScript('./editor-protection-guard.js?v=191');
    await loadScript('./apply-live-parity.js?v=191');
    document.documentElement.dataset.editorRuntime='v1.9.1';
  }catch(err){
    console.error('EDITOR_RUNTIME_LOADER_V191',err);
    const d=document.getElementById('dirtyState');if(d)d.textContent='EDITOR V1.9.1 LOAD ERROR: '+(err.message||err);
  }
})();
