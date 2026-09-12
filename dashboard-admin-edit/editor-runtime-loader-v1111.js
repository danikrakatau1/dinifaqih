(async()=>{
  'use strict';
  try{
    const r=await fetch('./editor-runtime-loader-v1110.js?v=1110',{cache:'no-store'});
    if(!r.ok)throw new Error('loader v1110 HTTP '+r.status);
    let outer=await r.text();
    const marker='    boot=boot.replace(anchor,integrityPatch+';
    if(!outer.includes(marker))throw new Error('Anchor V1.11.0 tidak ditemukan');

    const extra=String.raw`
    const integrity1111=String.raw\`
    // V1.11.1 — isolate history per handoff, exact text authority at APPLY,
    // and keep deleted audio/video silent after Undo/Redo preview rebuild.
    {
      const old="     native={schema:deep(schema),baseHtml:html,manifest:{...deep(pack.manifest||{}),source_url:deep(pack.manifest||{}).source_url||pack?.native?.source_url||''},values:Object.fromEntries(schema.fields.map(f=>[f.id,f.value??'']))};";
      const replacement="     const defaults=Object.fromEntries(schema.fields.map(f=>[f.id,f.value??''])),handoffValues=(pack?.native?.values&&typeof pack.native.values==='object')?deep(pack.native.values):{};native={schema:deep(schema),baseHtml:html,manifest:{...deep(pack.manifest||{}),source_url:deep(pack.manifest||{}).source_url||pack?.native?.source_url||''},values:{...defaults,...handoffValues}};for(const k of Object.keys(transforms))delete transforms[k];generatedAssets.clear();projectAssets.clear();localizedLinks.clear();history.length=0;future.length=0;selectedFieldId='';suspendHistory=false;";
      if(!src.includes(old))throw new Error('Anchor loadSnapshotHandoff V1.11.1 tidak ditemukan');
      src=src.replace(old,replacement);
    }

    {
      const old=" applyBtn.onclick=async()=>{if(!native)return editorToast('Import Rebuild ZIP dulu.','error','Belum ada template');const t=editorToast('Menyimpan snapshot final + asset ke IndexedDB…','loading','APPLY');try{";
      const replacement=" function syncLiveTextValuesForApply(){const doc=liveDoc();if(!doc||!native)return 0;let n=0;for(const f of native.schema.fields||[]){if(f.kind!=='text')continue;const el=nodeFor(doc,f);if(!el)continue;const value=el.matches?.('input,textarea,select')?String(el.value??''):String(el.textContent??'');if(native.values[f.id]!==value){native.values[f.id]=value;n++}}return n}\n applyBtn.onclick=async()=>{if(!native)return editorToast('Import Rebuild ZIP dulu.','error','Belum ada template');const textSynced=syncLiveTextValuesForApply();const t=editorToast('Menyimpan snapshot final + asset ke IndexedDB…','loading','APPLY');try{";
      if(!src.includes(old))throw new Error('Anchor APPLY V1.11.1 tidak ditemukan');
      src=src.replace(old,replacement);
      src=src.replace("finishEditorToast(t,\`${assets.length} asset + semua perubahan tersimpan di IndexedDB tanpa batas localStorage kecil.\`,'success','APPLY sukses')","finishEditorToast(t,\`${assets.length} asset + ${textSynced} teks disinkronkan · snapshot IndexedDB tersimpan.\`,'success','APPLY sukses')");
    }

    {
      const old=" function captureState(){return {values:deep(native?.values||{}),transforms:deep(transforms),assets:cloneAssetMap(generatedAssets),projectAssets:cloneAssetMap(projectAssets),localizedLinks:new Map(localizedLinks),selected:selectedFieldId}}";
      const replacement=" function enforceDeletedMediaAfterHistory(){const doc=liveDoc();if(!doc||!native)return;for(const f of native.schema.fields||[]){if(!['audio','video'].includes(f.kind))continue;const value=String(native.values[f.id]??f.value??'');if(value!=='')continue;const el=nodeFor(doc,f);if(!el)continue;const media=el.matches?.('audio,video')?el:(el.closest?.('audio,video')||el.querySelector?.('audio,video')||null);if(media){try{media.pause?.();media.currentTime=0}catch{}media.removeAttribute('src');media.removeAttribute('data-src');media.removeAttribute('autoplay');for(const s of media.querySelectorAll('source')){s.removeAttribute('src');s.removeAttribute('data-src');s.removeAttribute('data-lazy-src')}try{media.load?.()}catch{}}}}\n function captureState(){return {values:deep(native?.values||{}),transforms:deep(transforms),assets:cloneAssetMap(generatedAssets),projectAssets:cloneAssetMap(projectAssets),localizedLinks:new Map(localizedLinks),selected:selectedFieldId}}";
      if(!src.includes(old))throw new Error('Anchor captureState V1.11.1 tidak ditemukan');
      src=src.replace(old,replacement);
      const tail="renderNativeEditor();renderPreview(true);renderInspector();updateHistoryButtons()}";
      const tail2="renderNativeEditor();renderPreview(true);[80,260,700,1600].forEach(ms=>setTimeout(enforceDeletedMediaAfterHistory,ms));renderInspector();updateHistoryButtons()}";
      if(!src.includes(tail))throw new Error('Anchor restoreState tail V1.11.1 tidak ditemukan');
      src=src.replace(tail,tail2);
    }
\`;
`;

    outer=outer.replace(marker,extra+'\n    boot=boot.replace(anchor,integrityPatch+integrity1111+');
    outer=outer.replaceAll('v1.11.0','v1.11.1').replaceAll('V1.11.0','V1.11.1').replaceAll('V1110','V1111').replaceAll('v1110','v1111');
    (0,eval)(outer+'\n//# sourceURL=editor-runtime-loader-v1111-outer.js');
  }catch(err){
    console.error('EDITOR_RUNTIME_LOADER_V1111',err);
    const d=document.getElementById('dirtyState');if(d)d.textContent='EDITOR V1.11.1 LOAD ERROR: '+(err.message||err);
  }
})();
