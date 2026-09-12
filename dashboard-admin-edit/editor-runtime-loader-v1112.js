(async()=>{
  'use strict';
  try{
    const r=await fetch('./editor-runtime-loader-v1110.js?v=1110',{cache:'no-store'});
    if(!r.ok)throw new Error('loader v1110 HTTP '+r.status);
    let outer=await r.text();

    const patchCode=[
      "// V1.11.2 — minimal regression-safe patch: handoff history isolation, exact APPLY text, audio history silence.",
      "{",
      "  const old=\"     native={schema:deep(schema),baseHtml:html,manifest:{...deep(pack.manifest||{}),source_url:deep(pack.manifest||{}).source_url||pack?.native?.source_url||''},values:Object.fromEntries(schema.fields.map(f=>[f.id,f.value??'']))};\";",
      "  const replacement=\"     const defaults=Object.fromEntries(schema.fields.map(f=>[f.id,f.value??''])),handoffValues=(pack?.native?.values&&typeof pack.native.values==='object')?deep(pack.native.values):{};native={schema:deep(schema),baseHtml:html,manifest:{...deep(pack.manifest||{}),source_url:deep(pack.manifest||{}).source_url||pack?.native?.source_url||''},values:{...defaults,...handoffValues}};for(const k of Object.keys(transforms))delete transforms[k];generatedAssets.clear();projectAssets.clear();localizedLinks.clear();history.length=0;future.length=0;selectedFieldId='';suspendHistory=false;\";",
      "  if(!src.includes(old))throw new Error('Anchor handoff V1.11.2 tidak ditemukan');",
      "  src=src.replace(old,replacement);",
      "}",
      "{",
      "  const old=\" applyBtn.onclick=async()=>{if(!native)return editorToast('Import Rebuild ZIP dulu.','error','Belum ada template');const t=editorToast('Menyimpan snapshot final + asset ke IndexedDB…','loading','APPLY');try{\";",
      "  const replacement=\" applyBtn.onclick=async()=>{if(!native)return editorToast('Import Rebuild ZIP dulu.','error','Belum ada template');const applyDoc=liveDoc();if(applyDoc){for(const f of native.schema.fields||[]){if(f.kind!=='text')continue;const el=nodeFor(applyDoc,f);if(!el)continue;native.values[f.id]=el.matches?.('input,textarea,select')?String(el.value??''):String(el.textContent??'')}}const t=editorToast('Menyimpan snapshot final + asset ke IndexedDB…','loading','APPLY');try{\";",
      "  if(!src.includes(old))throw new Error('Anchor APPLY V1.11.2 tidak ditemukan');",
      "  src=src.replace(old,replacement);",
      "}",
      "{",
      "  const anchor=\" function captureState(){return {values:deep(native?.values||{}),transforms:deep(transforms),assets:cloneAssetMap(generatedAssets),projectAssets:cloneAssetMap(projectAssets),localizedLinks:new Map(localizedLinks),selected:selectedFieldId}}\";",
      "  const helper=\" function enforceDeletedMediaAfterHistory(){const doc=liveDoc();if(!doc||!native)return;for(const f of native.schema.fields||[]){if(!['audio','video'].includes(f.kind))continue;if(String(native.values[f.id]??f.value??'')!=='')continue;const el=nodeFor(doc,f);if(!el)continue;const media=el.matches?.('audio,video')?el:(el.closest?.('audio,video')||el.querySelector?.('audio,video')||null);if(media){try{media.pause?.();media.currentTime=0}catch{}media.removeAttribute('src');media.removeAttribute('data-src');media.removeAttribute('autoplay');for(const s of media.querySelectorAll('source')){s.removeAttribute('src');s.removeAttribute('data-src');s.removeAttribute('data-lazy-src')}try{media.load?.()}catch{}}if(el.matches?.('source')){el.removeAttribute('src');el.removeAttribute('data-src');el.removeAttribute('data-lazy-src')}}}\n\";",
      "  if(!src.includes(anchor))throw new Error('Anchor history helper V1.11.2 tidak ditemukan');",
      "  src=src.replace(anchor,helper+anchor);",
      "  const a=src.indexOf(' function restoreState(st)');const b=src.indexOf(' function undo()',a);",
      "  if(a<0||b<0)throw new Error('Anchor restoreState V1.11.2 tidak ditemukan');",
      "  let seg=src.slice(a,b);const oldTail='renderNativeEditor();renderPreview(true);renderInspector();updateHistoryButtons()}';",
      "  const newTail=\"renderNativeEditor();renderPreview(true);[80,260,700,1600].forEach(ms=>setTimeout(enforceDeletedMediaAfterHistory,ms));renderInspector();updateHistoryButtons()}\";",
      "  if(!seg.includes(oldTail))throw new Error('Tail restoreState V1.11.2 tidak ditemukan');",
      "  seg=seg.replace(oldTail,newTail);src=src.slice(0,a)+seg+src.slice(b);",
      "}"
    ].join('\n');

    const key='boot=boot.replace(anchor,integrityPatch+';
    if(!outer.includes(key))throw new Error('Anchor loader V1.11.0 tidak ditemukan');
    outer=outer.replace(key,key+JSON.stringify(patchCode)+'+');
    outer=outer.replaceAll('v1.11.0','v1.11.2').replaceAll('V1.11.0','V1.11.2').replaceAll('V1110','V1112').replaceAll('v1110','v1112');
    (0,eval)(outer+'\n//# sourceURL=editor-runtime-loader-v1112-inner.js');
  }catch(err){
    console.error('EDITOR_RUNTIME_LOADER_V1112',err);
    const d=document.getElementById('dirtyState');if(d)d.textContent='EDITOR V1.11.2 LOAD ERROR: '+(err.message||err);
  }
})();
