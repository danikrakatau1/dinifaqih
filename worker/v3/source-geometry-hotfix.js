export const SOURCE_GEOMETRY_HOTFIX_CLIENT=String.raw`(()=>{
'use strict';
if(window.__DINI_V3_SOURCE_GEOMETRY_HOTFIX__)return;
window.__DINI_V3_SOURCE_GEOMETRY_HOTFIX__=true;
const VERSION='source-transform-preserve-v1';
const nativeSetItem=Storage.prototype.setItem;

function patchHtml(html){
  let out=String(html||'');
  if(!out)return out;
  out=out.replace(/\[data-native-preserve-layout\]\s*\{\s*transform\s*:\s*none\s*!important\s*;?\s*\}/g,'[data-native-preserve-layout]{/* V3 staging: preserve source transform */}');
  out=out.replace(/if\(name&&!matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches\)\{el\.classList\.add\('animated',name\);/g,"if(name&&!el.hasAttribute('data-native-preserve-layout')&&!matchMedia('(prefers-reduced-motion: reduce)').matches){el.classList.add('animated',name);");
  if(!/data-v3-geometry-hotfix=/.test(out))out=out.replace(/<html(\s|>)/i,'<html data-v3-geometry-hotfix="'+VERSION+'"$1');
  return out;
}

function patchSnapshotRaw(raw){
  const text=String(raw||'');
  if(!text)return text;
  try{
    const pack=JSON.parse(text);
    if(pack?.native?.html)pack.native.html=patchHtml(pack.native.html);
    if(pack?.html)pack.html=patchHtml(pack.html);
    pack.report={...(pack.report||{}),v3_geometry_hotfix:{version:VERSION,source_transform_preserved:true,structural_animation_transform_blocked:true}};
    return JSON.stringify(pack);
  }catch{return text}
}

function patchStoredValue(key,value){
  const k=String(key||'');
  if(k==='diniAnifNativeHtml')return patchHtml(value);
  if(k==='diniAnifRebuildSnapshot'||k.startsWith('diniAnifRebuildSnapshot:'))return patchSnapshotRaw(value);
  return value;
}

Storage.prototype.setItem=function(key,value){
  return nativeSetItem.call(this,key,patchStoredValue(key,value));
};

function patchExisting(store){
  try{
    const keys=[];
    for(let i=0;i<store.length;i++){const k=store.key(i);if(k)keys.push(k)}
    for(const k of keys){
      if(k!=='diniAnifNativeHtml'&&k!=='diniAnifRebuildSnapshot'&&!k.startsWith('diniAnifRebuildSnapshot:'))continue;
      const old=store.getItem(k);if(old==null)continue;
      const next=patchStoredValue(k,old);if(next!==old)nativeSetItem.call(store,k,next);
    }
  }catch{}
}
patchExisting(localStorage);patchExisting(sessionStorage);
window.DINI_V3_SOURCE_GEOMETRY_HOTFIX={VERSION,patchHtml,patchSnapshotRaw};
})();`;
