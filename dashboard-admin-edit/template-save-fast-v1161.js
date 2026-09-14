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

    const oldBake=`      let finalHtml=String(snap.html||'');for(const [from,to] of replacements)finalHtml=finalHtml.split(from).join(to);
      const values=replaceAllDeep(deep(snap.values||{}),replacements),schema=replaceAllDeep(deep(snap.schema||{}),replacements),manifestBase=replaceAllDeep(deep(snap.manifest||{}),replacements);`;

    const bakeReplacement=String.raw`      let finalHtml=String(snap.html||'');for(const [from,to] of replacements)finalHtml=finalHtml.split(from).join(to);
      const values=replaceAllDeep(deep(snap.values||{}),replacements),schema=replaceAllDeep(deep(snap.schema||{}),replacements),manifestBase=replaceAllDeep(deep(snap.manifest||{}),replacements);

      // V1.16.2 — bake CURRENT text values directly into canonical HTML before upload.
      // This is a final parity guard for source widgets whose runtime can later rebuild/replace
      // their inner markup. Preview/Public then starts from the same text the Editor shows,
      // even before Snapshot Authority runs.
      const bakeTextParity=(html,schema0,values0)=>{
        try{
          const doc=new DOMParser().parseFromString(String(html||''),'text/html');
          const norm=v=>String(v??'').replace(/\\s+/g,' ').trim();
          const escCss=v=>(window.CSS?.escape?CSS.escape(String(v||'')):String(v||'').replace(/["\\\\]/g,'\\\\$&'));
          const leafSelector='h1,h2,h3,h4,h5,h6,p,span,a,label,button,strong,em,small,div';
          const add=(arr,seen,n)=>{if(n&&!seen.has(n)){seen.add(n);arr.push(n)}};
          const candidatesFor=f=>{
            const arr=[],seen=new Set();
            if(f?.node_id)add(arr,seen,doc.querySelector('[data-native-node-id="'+escCss(f.node_id)+'"]'));
            if(f?.id){
              add(arr,seen,doc.querySelector('[data-native-edit-id="'+escCss(f.id)+'"]'));
              doc.querySelectorAll('[data-native-edit-ids]').forEach(n=>{const ids=(n.getAttribute('data-native-edit-ids')||'').split(/[\\s,]+/).filter(Boolean);if(ids.includes(f.id))add(arr,seen,n)});
            }
            if(f?.source_element_id)add(arr,seen,doc.querySelector('[data-id="'+escCss(f.source_element_id)+'"]'));
            return arr;
          };
          const pick=(root,f,value)=>{
            if(!root)return null;
            if(root.matches?.('input,textarea,select'))return root;
            const old=norm(f?.value??f?.source_text??'');
            const want=norm(value);
            const pool=[root,...(root.querySelectorAll?.(leafSelector)||[])];
            const leaves=pool.filter(n=>!n.querySelector?.(leafSelector));
            const all=leaves.length?leaves:pool;
            return all.find(n=>old&&norm(n.textContent)===old)
              ||all.find(n=>want&&norm(n.textContent)===want)
              ||all.find(n=>old&&norm(n.textContent).includes(old))
              ||((root.children?.length||0)===0?root:null);
          };
          let baked=0;
          for(const f of schema0?.fields||[]){
            if(f?.kind!=='text')continue;
            const value=String(values0?.[f.id]??f.value??'');
            const roots=candidatesFor(f);let target=null;
            for(const root of roots){target=pick(root,f,value);if(target)break}
            if(!target)continue;
            if(target.matches?.('input,textarea,select')){target.value=value;target.setAttribute('value',value)}
            else target.textContent=value;
            target.setAttribute('data-template-text-baked','v1.16.2');baked++;
          }
          doc.documentElement.setAttribute('data-template-text-parity','v1.16.2');
          return {html:'<!doctype html>\\n'+doc.documentElement.outerHTML,baked};
        }catch(err){console.warn('TEMPLATE_TEXT_BAKE_V1162',err);return {html,baked:0}}
      };
      const textBake=bakeTextParity(finalHtml,schema,values);finalHtml=textBake.html;`;

    if(!src.includes(oldBake))throw new Error('Anchor finalHtml V1.16.0 tidak ditemukan');
    src=src.replace(oldBake,bakeReplacement);
    src=src.replace("document.documentElement.dataset.templateSave='v1.16.0';","document.documentElement.dataset.templateSave='v1.16.2';");
    (0,eval)(src+'\n//# sourceURL=template-save-fast-v1162-core.js');

    // Template Editor contract: Save/Update MUST update the selected UUID, including ACTIVE rows.
    // Disable the legacy editor onclick that clones ACTIVE templates into a new Template N.
    // Canonical V1.16.x owns saving through its document-capture listener above.
    if(location.pathname.includes('/dashboard-admin-edit/')){
      const btn=document.getElementById('saveDraftBtn');
      if(btn){btn.onclick=null;btn.dataset.canonicalSaveOnly='v1.16.2'}
    }
    document.documentElement.dataset.templateSaveLoader='v1.16.2';
  }catch(err){
    console.error('TEMPLATE_SAVE_FAST_V1162_LOADER',err);
    window.editorToast?.(err.message||String(err),'error','Template Save V1.16.2 gagal dimuat');
  }
})();
