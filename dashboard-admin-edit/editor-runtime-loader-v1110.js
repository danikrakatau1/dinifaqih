(async()=>{
  'use strict';
  try{
    const r=await fetch('./editor-runtime-loader-v195.js?v=195',{cache:'no-store'});
    if(!r.ok)throw new Error('loader v195 HTTP '+r.status);
    let boot=await r.text();
    const anchor="    (0,eval)(src+'\\n//# sourceURL=editor-runtime-v195.js');";
    if(!boot.includes(anchor))throw new Error('Anchor eval loader V1.9.5 tidak ditemukan');

    const integrityPatch=String.raw`
    // V1.11.0 Integrity Sweep — atomic history + true media deletion + asset dedupe.
    {
      const old=" function captureState(){return {values:deep(native?.values||{}),transforms:deep(transforms),assets:new Map(generatedAssets),selected:selectedFieldId}}\n function pushHistory(){if(!native||suspendHistory)return;history.push(captureState());if(history.length>80)history.shift();future.length=0;updateHistoryButtons()}\n function restoreState(st){if(!st||!native)return;suspendHistory=true;native.values=deep(st.values||{});for(const k of Object.keys(transforms))delete transforms[k];Object.assign(transforms,deep(st.transforms||{}));generatedAssets.clear();for(const [k,v] of (st.assets||new Map()))generatedAssets.set(k,v);selectedFieldId=st.selected||'';suspendHistory=false;setDirty();renderNativeEditor();renderPreview(true);renderInspector();updateHistoryButtons()}";
      const replacement=" function cloneAssetMap(m){return new Map([...(m||new Map())].map(([k,v])=>[k,v&&typeof v==='object'?{...v}:v]))}\n function captureState(){return {values:deep(native?.values||{}),transforms:deep(transforms),assets:cloneAssetMap(generatedAssets),projectAssets:cloneAssetMap(projectAssets),localizedLinks:new Map(localizedLinks),selected:selectedFieldId}}\n function pushHistory(){if(!native||suspendHistory)return;history.push(captureState());if(history.length>80)history.shift();future.length=0;updateHistoryButtons()}\n function restoreState(st){if(!st||!native)return;suspendHistory=true;native.values=deep(st.values||{});for(const k of Object.keys(transforms))delete transforms[k];Object.assign(transforms,deep(st.transforms||{}));generatedAssets.clear();for(const [k,v] of (st.assets||new Map()))generatedAssets.set(k,v);projectAssets.clear();for(const [k,v] of (st.projectAssets||new Map()))projectAssets.set(k,v);localizedLinks.clear();for(const [k,v] of (st.localizedLinks||new Map()))localizedLinks.set(k,v);selectedFieldId=st.selected||'';suspendHistory=false;setDirty();renderNativeEditor();renderPreview(true);renderInspector();updateHistoryButtons()}";
      if(!src.includes(old))throw new Error('Anchor atomic history tidak ditemukan');
      src=src.replace(old,replacement);
    }

    {
      const old="   } else if(f.kind==='effect'){/* visual effect source is mapped/read-only; preserve authored runtime settings */}\n   else {const at=f.attribute||({video:'src',audio:'src',url:'href',placeholder:'placeholder'}[f.kind]);if(at)el.setAttribute(at,f.kind==='url'?normalizeActionUrl(f,v):v)}";
      const replacement="   } else if(f.kind==='effect'){/* visual effect source is mapped/read-only; preserve authored runtime settings */}\n   else if(f.kind==='audio'||f.kind==='video'){\n     const value=String(v??'');\n     const media=el.matches?.('audio,video')?el:(el.closest?.('audio,video')||el.querySelector?.('audio,video')||null);\n     const sources=new Set();if(el.matches?.('source'))sources.add(el);for(const s of media?.querySelectorAll?.('source')||[])sources.add(s);\n     if(media){\n       if(value)media.setAttribute('src',value);else media.removeAttribute('src');\n       media.removeAttribute('data-src');media.removeAttribute('data-lazy-src');\n     }\n     for(const s of sources){if(value)s.setAttribute('src',value);else s.removeAttribute('src');s.removeAttribute('data-src');s.removeAttribute('data-lazy-src')}\n     if(!media){const at=f.attribute||'src';if(value)el.setAttribute(at,value);else el.removeAttribute(at)}\n     if(media){try{if(!value){media.pause?.();media.currentTime=0}media.load?.()}catch{}}\n   }\n   else {const at=f.attribute||({url:'href',placeholder:'placeholder'}[f.kind]);if(at)el.setAttribute(at,f.kind==='url'?normalizeActionUrl(f,v):v)}";
      if(!src.includes(old))throw new Error('Anchor audio/video applyField tidak ditemukan');
      src=src.replace(old,replacement);
    }

    {
      const old=" function deleteFieldAsset(id){pushHistory();generatedAssets.delete(id);native.values[id]='';setDirty();liveApply(id);renderNativeEditor();renderInspector()}";
      const replacement=" function deleteFieldAsset(id){const f=fieldById(id),current=String(native.values[id]??f?.value??'');const ids=(typeof linkedMediaAliasIds==='function'&&f&&['image','background'].includes(f.kind))?linkedMediaAliasIds(id):[id];const active=ids.some(x=>generatedAssets.has(x)||String(native.values[x]??fieldById(x)?.value??'')!=='');if(!active)return;pushHistory();for(const aid of ids){generatedAssets.delete(aid);native.values[aid]='';liveApply(aid)}setDirty('Asset dihapus · perubahan belum di-APPLY');renderNativeEditor();renderInspector()}";
      if(!src.includes(old))throw new Error('Anchor deleteFieldAsset tidak ditemukan');
      src=src.replace(old,replacement);
    }

    {
      const old=" async function persistAppliedAssets(revision){const list=[];for(const [id,a] of generatedAssets){const key=\`${revision}:field:${id}\`;await idbPut(key,a.blob);list.push({id,key,path:a.path,name:a.name,type:a.type,source:a.source,role:'field'})}let n=0;for(const [path,a] of projectAssets){const key=\`${revision}:project:${n++}\`;await idbPut(key,a.blob);list.push({id:null,key,path:a.path,name:a.name,type:a.type,source:a.source,role:'project'})}return list}";
      const replacement=" async function persistAppliedAssets(revision){const list=[],pathKeys=new Map();for(const [id,a] of generatedAssets){if(!a?.blob||!a?.path)continue;let key=pathKeys.get(a.path);if(!key){key=\`${revision}:field:${id}\`;await idbPut(key,a.blob);pathKeys.set(a.path,key)}list.push({id,key,path:a.path,name:a.name,type:a.type,source:a.source,role:'field'})}let n=0;for(const [path,a] of projectAssets){if(!a?.blob||!path)continue;let key=pathKeys.get(path);if(!key){key=\`${revision}:project:${n++}\`;await idbPut(key,a.blob);pathKeys.set(path,key)}list.push({id:null,key,path,name:a.name,type:a.type,source:a.source,role:'project'})}return list}";
      if(!src.includes(old))throw new Error('Anchor persistAppliedAssets tidak ditemukan');
      src=src.replace(old,replacement);
    }
`;

    boot=boot.replace(anchor,integrityPatch+"\n    (0,eval)(src+'\\n//# sourceURL=editor-runtime-v1110.js');");
    boot=boot.replaceAll('v1.9.5','v1.11.0').replaceAll('V1.9.5','V1.11.0').replaceAll('V195','V1110').replaceAll('source-runtime-195','source-runtime-1110');
    (0,eval)(boot+'\n//# sourceURL=editor-runtime-loader-v1110-inner.js');
    document.documentElement.dataset.editorIntegrity='v1.11.0';
  }catch(err){
    console.error('EDITOR_RUNTIME_LOADER_V1110',err);
    const d=document.getElementById('dirtyState');if(d)d.textContent='EDITOR V1.11.0 LOAD ERROR: '+(err.message||err);
  }
})();
