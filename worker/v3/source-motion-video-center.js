export const SOURCE_MOTION_VIDEO_CENTER_CLIENT=String.raw`(()=>{
'use strict';
if(window.__DINI_V3_MOTION_VIDEO_CENTER__)return;
window.__DINI_V3_MOTION_VIDEO_CENTER__=true;
const VERSION='jawa-hitam-motion-video-center-v2';
const TARGET_ID='36dc2bf';
const TARGET_VIDEO='jawa-hitam-demo.mp4';
const STYLE_ID='dini-v3-motion-video-center';
const SCRIPT_ID='dini-v3-motion-video-end-hold';
const nativeSetItem=Storage.prototype.setItem;
const css='\n<style id="'+STYLE_ID+'">\n'+
'.elementor-element-'+TARGET_ID+'.motionSection{position:relative!important;overflow:hidden!important;}\n'+
'.elementor-element-'+TARGET_ID+'.motionSection>.elementor-background-video-container{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;overflow:hidden!important;}\n'+
'.elementor-element-'+TARGET_ID+'.motionSection>.elementor-background-video-container>video.elementor-background-video-hosted{position:absolute!important;top:50%!important;left:50%!important;width:100%!important;height:100%!important;max-width:none!important;transform:translate(-50%,-50%)!important;object-fit:cover!important;object-position:50% 50%!important;}\n'+
'</style>\n';
const js='\n<script id="'+SCRIPT_ID+'">(function(){var SEL=".elementor-element-'+TARGET_ID+'.motionSection .elementor-background-video-container video.elementor-background-video-hosted";var SAFE=0.08;function bind(v){if(!v||v.dataset.v3EndHold)return;v.dataset.v3EndHold="1";v.addEventListener("ended",function(){try{var t=(isFinite(v.duration)&&v.duration>0)?Math.min(SAFE,Math.max(0,v.duration-0.01)):SAFE;v.currentTime=t;v.pause();}catch(e){}},{passive:true});}function scan(){document.querySelectorAll(SEL).forEach(bind)}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",scan,{once:true});else scan();new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});})();<\/script>\n';
function applies(html){const s=String(html||'');return s.includes('elementor-element-'+TARGET_ID)&&s.includes(TARGET_VIDEO)}
function patchHtml(html){let out=String(html||'');if(!out||!applies(out))return out;let payload='';if(!out.includes('id="'+STYLE_ID+'"'))payload+=css;if(!out.includes('id="'+SCRIPT_ID+'"'))payload+=js;if(!payload)return out;if(/<\/head>/i.test(out))return out.replace(/<\/head>/i,payload+'</head>');if(/<body[^>]*>/i.test(out))return out.replace(/<body([^>]*)>/i,payload+'<body$1>');return payload+out}
function patchSnapshotRaw(raw){const text=String(raw||'');if(!text)return text;try{const pack=JSON.parse(text);let changed=false;if(pack?.native?.html){const next=patchHtml(pack.native.html);changed=changed||next!==pack.native.html;pack.native.html=next}if(pack?.html){const next=patchHtml(pack.html);changed=changed||next!==pack.html;pack.html=next}if(!changed)return text;pack.report={...(pack.report||{}),v3_motion_video_center:{version:VERSION,target_id:TARGET_ID,target_video:TARGET_VIDEO,centered:true,end_hold:'first-safe-frame',safe_time:0.08}};return JSON.stringify(pack)}catch{return text}}
function patchStoredValue(key,value){const k=String(key||'');if(k==='diniAnifNativeHtml')return patchHtml(value);if(k==='diniAnifRebuildSnapshot'||k.startsWith('diniAnifRebuildSnapshot:'))return patchSnapshotRaw(value);return value}
Storage.prototype.setItem=function(key,value){return nativeSetItem.call(this,key,patchStoredValue(key,value))};
function patchExisting(store){try{const keys=[];for(let i=0;i<store.length;i++){const k=store.key(i);if(k)keys.push(k)}for(const k of keys){if(k!=='diniAnifNativeHtml'&&k!=='diniAnifRebuildSnapshot'&&!k.startsWith('diniAnifRebuildSnapshot:'))continue;const old=store.getItem(k);if(old==null)continue;const next=patchStoredValue(k,old);if(next!==old)nativeSetItem.call(store,k,next)}}catch{}}
patchExisting(localStorage);patchExisting(sessionStorage);
window.DINI_V3_MOTION_VIDEO_CENTER={VERSION,TARGET_ID,TARGET_VIDEO,patchHtml,patchSnapshotRaw,endHold:'first-safe-frame',safeTime:0.08};
})();`;
