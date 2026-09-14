(async()=>{
  'use strict';
  try{
    const r=await fetch('./template-save-fast-v1160.js?v=1160-core',{cache:'no-store'});
    if(!r.ok)throw new Error('template-save-fast-v1160 HTTP '+r.status);
    let src=await r.text();

    const old=`      const refs=localRefs({html:snap.html,values:snap.values,schema:snap.schema});
      const missing=refs.filter(p=>!replacements.has(p));
      if(missing.length)throw new Error(\`Canonical package belum lengkap: \${missing.length} asset lokal tidak punya blob (\${missing.slice(0,3).join(', ')}). Klik Generate Semua Aset lalu APPLY lagi.\`);`;

    const replacement=String.raw`      const refs=localRefs({html:snap.html,values:snap.values,schema:snap.schema});
      let missing=refs.filter(p=>!replacements.has(p));

      // V1.16.1 — existing Template Edit may legitimately keep revision-local asset paths
      // from the previously saved cloud snapshot. Those files are already uploaded and must
      // be carried forward by absolute URL instead of forcing their old blobs back into the
      // Template Editor IndexedDB. Only refs that did NOT exist in the previous cloud snapshot
      // are treated as genuinely missing/new local assets.
      if(missing.length&&row){
        try{
          const prevSnapUrl=String(row.manifest_json?.editor_snapshot_url||'').trim();
          if(prevSnapUrl){
            const pu=new URL(prevSnapUrl,location.href);
            pu.searchParams.set('_carry',String(row.updated_at||Date.now()));
            const pr=await withTimeout(fetch(pu.href,{cache:'no-store'}),15000,'Baca snapshot revision sebelumnya');
            if(pr.ok){
              const prev=await pr.json();
              const prevHtml=String(prev?.html||prev?.baseHtml||'');
              const prevRefs=new Set(localRefs({html:prevHtml,values:prev?.values||{},schema:prev?.schema||{}}));
              const prevManifest={...(row.manifest_json||{}),...(prev?.manifest||{})};
              const carryBase=canonicalAssetBase(prevHtml,{...prevManifest,source_url:row.source_path||prevManifest.source_url||''});
              for(const p of missing){
                if(!prevRefs.has(p))continue;
                try{replacements.set(p,new URL(p,carryBase).href)}catch{}
              }
              missing=refs.filter(p=>!replacements.has(p));
            }
          }
        }catch(err){
          console.warn('TEMPLATE_SAVE_CARRYOVER_V1161',err);
        }
      }

      if(missing.length)throw new Error(\`Canonical package belum lengkap: \${missing.length} asset lokal BARU tidak punya blob (\${missing.slice(0,3).join(', ')}). Generate hanya asset baru tersebut lalu APPLY lagi.\`);`;

    if(!src.includes(old))throw new Error('Anchor localRefs V1.16.0 tidak ditemukan');
    src=src.replace(old,replacement);
    src=src.replace("document.documentElement.dataset.templateSave='v1.16.0';","document.documentElement.dataset.templateSave='v1.16.1';");
    (0,eval)(src+'\n//# sourceURL=template-save-fast-v1161-core.js');
    document.documentElement.dataset.templateSaveLoader='v1.16.1';
  }catch(err){
    console.error('TEMPLATE_SAVE_FAST_V1161_LOADER',err);
    window.editorToast?.(err.message||String(err),'error','Template Save V1.16.1 gagal dimuat');
  }
})();
