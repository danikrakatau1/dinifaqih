export const SOURCE_MOTION_VIDEO_CENTER_CLIENT=String.raw`(()=>{
'use strict';
if(window.__DINI_V3_MOTION_VIDEO_CENTER__)return;
window.__DINI_V3_MOTION_VIDEO_CENTER__=true;
const VERSION='jawa-hitam-motion-video-center-v3';
const TARGET_ID='36dc2bf';
const TARGET_VIDEO='jawa-hitam-demo.mp4';
const STYLE_ID='dini-v3-motion-video-center';
const SCRIPT_ID='dini-v3-motion-video-end-cleanup';
const LEGACY_SCRIPT_ID='dini-v3-motion-video-end-hold';
const nativeSetItem=Storage.prototype.setItem;
const css='\n<style id="'+STYLE_ID+'">\n'+
'.elementor-element-'+TARGET_ID+'.motionSection{position:relative!important;overflow:hidden!important;}\n'+
'.elementor-element-'+TARGET_ID+'.motionSection>.elementor-background-video-container{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;overflow:hidden!important;}\n'+
'.elementor-element-'+TARGET_ID+'.motionSection>.elementor-background-video-container>video.elementor-background-video-hosted{position:absolute!important;top:50%!important;left:50%!important;width:100%!important;height:100%!important;max-width:none!important;transform:translate(-50%,-50%)!important;object-fit:cover!important;object-position:50% 50%!important;}\n'+
'</style>\n';
const js='\n<script id="'+SCRIPT_ID+'">(function(){var SECTION=".elementor-element-'+TARGET_ID+'.motionSection";var VIDEO=SECTION+" .elementor-background-video-container video.elementor-background-video-hosted";function cleanup(v){try{var s=v&&v.closest? v.closest(SECTION):document.querySelector(SECTION);if(!s)return;s.dataset.v3MotionVideoDone="1";var c=s.querySelector(".elementor-background-video-container");if(c)c.remove();}catch(e){}}function bind(v){if(!v||v.dataset.v3EndCleanup)return;v.dataset.v3EndCleanup="1";v.addEventListener("ended",function(){cleanup(v)},{once:true});}function scan(){var s=document.querySelector(SECTION);if(s&&s.dataset.v3MotionVideoDone==="1"){var stale=s.querySelector(".elementor-background-video-container");if(stale)stale.remove();return;}document.querySelectorAll(VIDEO).forEach(bind)}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",scan,{once:true});else scan();new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});})();<\/script>\n';
function applies(html){const s=String(html||'');return s.includes('elementor-element-'+TARGET_ID)&&s.includes(TARGET_VIDEO)}
function stripLegacy(html){let out=String(html||'');const re=new RegExp('<script[^>]*id=["\\\']'+LEGACY_SCRIPT_ID+'["\\\'][^>]*>[\\s\\S]*?<\\/script>','ig');return out.replace(re,'')}
function patchHtml(html){let out=stripLegacy(html);if(!out||!applies(out))return out;let payload='';if(!out.includes('id="'+STYLE_ID+'"'))payload+=css;if(!out.includes('id="'+SCRIPT_ID+'"'))payload+=js;if(!payload)return out;if(/<\/head>/i.test(out))return out.replace(/<\/head>/i,payload+'</head>');if(/<body[^>]*>/i.test(out))return out.replace(/<body([^>]*)>/i,payload+'<body$1>');return payload+out}
function patchSnapshotRaw(raw){const text=String(raw||'');if(!text)return text;try{const pack=JSON.parse(text);let changed=false;if(pack?.native?.html){const next=patchHtml(pack.native.html);changed=changed||next!==pack.native.html;pack.native.html=next}if(pack?.html){const next=patchHtml(pack.html);changed=changed||next!==pack.html;pack.html=next}if(!changed)return text;pack.report={...(pack.report||{}),v3_motion_video_center:{version:VERSION,target_id:TARGET_ID,target_video:TARGET_VIDEO,centered:true,end_behavior:'remove-video-container'}};return JSON.stringify(pack)}catch{return text}}
function patchStoredValue(key,value){const k=String(key||'');if(k==='diniAnifNativeHtml')return patchHtml(value);if(k==='diniAnifRebuildSnapshot'||k.startsWith('diniAnifRebuildSnapshot:'))return patchSnapshotRaw(value);return value}
Storage.prototype.setItem=function(key,value){return nativeSetItem.call(this,key,patchStoredValue(key,value))};
function patchExisting(store){try{const keys=[];for(let i=0;i<store.length;i++){const k=store.key(i);if(k)keys.push(k)}for(const k of keys){if(k!=='diniAnifNativeHtml'&&k!=='diniAnifRebuildSnapshot'&&!k.startsWith('diniAnifRebuildSnapshot:'))continue;const old=store.getItem(k);if(old==null)continue;const next=patchStoredValue(k,old);if(next!==old)nativeSetItem.call(store,k,next)}}catch{}}
patchExisting(localStorage);patchExisting(sessionStorage);
window.DINI_V3_MOTION_VIDEO_CENTER={VERSION,TARGET_ID,TARGET_VIDEO,patchHtml,patchSnapshotRaw,endBehavior:'remove-video-container'};
})();`;
