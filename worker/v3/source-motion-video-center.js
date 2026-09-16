export const SOURCE_MOTION_VIDEO_CENTER_CLIENT=String.raw`(()=>{
'use strict';
if(window.__DINI_V3_MOTION_VIDEO_CENTER__)return;
window.__DINI_V3_MOTION_VIDEO_CENTER__=true;
const VERSION='jawa-hitam-motion-video-center-v1';
const TARGET_ID='36dc2bf';
const TARGET_VIDEO='jawa-hitam-demo.mp4';
const STYLE_ID='dini-v3-motion-video-center';
const nativeSetItem=Storage.prototype.setItem;
const css='\n<style id="'+STYLE_ID+'">\n'+
'.elementor-element-'+TARGET_ID+'.motionSection{position:relative!important;overflow:hidden!important;}\n'+
'.elementor-element-'+TARGET_ID+'.motionSection>.elementor-background-video-container{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;overflow:hidden!important;}\n'+
'.elementor-element-'+TARGET_ID+'.motionSection>.elementor-background-video-container>video.elementor-background-video-hosted{position:absolute!important;top:50%!important;left:50%!important;width:100%!important;height:100%!important;max-width:none!important;transform:translate(-50%,-50%)!important;object-fit:cover!important;object-position:50% 50%!important;}\n'+
'</style>\n';
function applies(html){const s=String(html||'');return s.includes('elementor-element-'+TARGET_ID)&&s.includes(TARGET_VIDEO)}
function patchHtml(html){let out=String(html||'');if(!out||!applies(out)||out.includes('id="'+STYLE_ID+'"'))return out;if(/<\/head>/i.test(out))return out.replace(/<\/head>/i,css+'</head>');if(/<body[^>]*>/i.test(out))return out.replace(/<body([^>]*)>/i,css+'<body$1>');return css+out}
function patchSnapshotRaw(raw){const text=String(raw||'');if(!text)return text;try{const pack=JSON.parse(text);let changed=false;if(pack?.native?.html){const next=patchHtml(pack.native.html);changed=changed||next!==pack.native.html;pack.native.html=next}if(pack?.html){const next=patchHtml(pack.html);changed=changed||next!==pack.html;pack.html=next}if(!changed)return text;pack.report={...(pack.report||{}),v3_motion_video_center:{version:VERSION,target_id:TARGET_ID,target_video:TARGET_VIDEO,centered:true}};return JSON.stringify(pack)}catch{return text}}
function patchStoredValue(key,value){const k=String(key||'');if(k==='diniAnifNativeHtml')return patchHtml(value);if(k==='diniAnifRebuildSnapshot'||k.startsWith('diniAnifRebuildSnapshot:'))return patchSnapshotRaw(value);return value}
Storage.prototype.setItem=function(key,value){return nativeSetItem.call(this,key,patchStoredValue(key,value))};
function patchExisting(store){try{const keys=[];for(let i=0;i<store.length;i++){const k=store.key(i);if(k)keys.push(k)}for(const k of keys){if(k!=='diniAnifNativeHtml'&&k!=='diniAnifRebuildSnapshot'&&!k.startsWith('diniAnifRebuildSnapshot:'))continue;const old=store.getItem(k);if(old==null)continue;const next=patchStoredValue(k,old);if(next!==old)nativeSetItem.call(store,k,next)}}catch{}}
patchExisting(localStorage);patchExisting(sessionStorage);
window.DINI_V3_MOTION_VIDEO_CENTER={VERSION,TARGET_ID,TARGET_VIDEO,patchHtml,patchSnapshotRaw};
})();`;
