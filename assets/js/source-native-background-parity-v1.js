(()=>{
  'use strict';
  if(window.__DINI_SOURCE_BACKGROUND_PARITY_V1__)return;
  window.__DINI_SOURCE_BACKGROUND_PARITY_V1__=true;

  const VERSION='1.0.0';
  const MARKER='dini-source-background-parity-v100';
  const deep=v=>JSON.parse(JSON.stringify(v??null));
  const parseSettings=node=>{try{return JSON.parse(String(node?.getAttribute?.('data-settings')||'').replace(/&quot;/g,'"'))}catch{return{}}};
  const isUrl=v=>/^https?:\/\//i.test(String(v||''));

  function install(html){
    const raw=String(html||'');
    if(!raw.trim())return raw;
    const doc=new DOMParser().parseFromString(raw,'text/html');
    if(doc.getElementById(MARKER))return '<!doctype html>\n'+doc.documentElement.outerHTML;

    let bgVideos=0,bgSlideshows=0;
    for(const el of doc.querySelectorAll('[data-settings]')){
      const cfg=parseSettings(el);
      const videoUrl=String(cfg.background_video_link||'').trim();
      if(cfg.background_background==='video'&&isUrl(videoUrl)){
        el.setAttribute('data-dini-native-bg-video','1');
        el.setAttribute('data-dini-bg-video-url',videoUrl);
        el.setAttribute('data-dini-bg-video-play-on-mobile',cfg.background_play_on_mobile==='yes'?'1':'0');
        el.setAttribute('data-dini-bg-video-play-once',cfg.background_play_once==='yes'?'1':'0');
        bgVideos++;
      }

      const gallery=Array.isArray(cfg.background_slideshow_gallery)?cfg.background_slideshow_gallery:[];
      const urls=gallery.map(x=>String(x?.url||'').trim()).filter(isUrl);
      if(cfg.background_background==='slideshow'&&urls.length){
        el.setAttribute('data-dini-native-bg-slideshow','1');
        el.setAttribute('data-dini-bg-slideshow-urls',JSON.stringify(urls));
        el.setAttribute('data-dini-bg-slideshow-duration',String(cfg.background_slideshow_slide_duration||5000));
        el.setAttribute('data-dini-bg-slideshow-transition',String(cfg.background_slideshow_transition_duration||500));
        el.setAttribute('data-dini-bg-slideshow-loop',cfg.background_slideshow_loop==='no'?'0':'1');
        el.setAttribute('data-dini-bg-slideshow-kenburns',cfg.background_slideshow_ken_burns==='yes'?'1':'0');
        bgSlideshows++;
      }
    }

    const style=doc.createElement('style');
    style.id=MARKER;
    style.textContent=`
[data-dini-native-bg-video="1"]{position:relative}
[data-dini-native-bg-video="1"]>.elementor-background-video-container{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;overflow:hidden!important;pointer-events:none!important}
[data-dini-native-bg-video="1"]>.elementor-background-video-container>video{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;object-fit:cover!important;object-position:center center!important}
[data-dini-native-bg-slideshow="1"]{position:relative}
[data-dini-native-bg-slideshow="1"]>.dini-source-native-bg-slideshow{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:hidden;background-position:center center;background-repeat:no-repeat;background-size:cover;transition-property:opacity,transform;transition-timing-function:ease;will-change:opacity,transform}
`;
    (doc.head||doc.documentElement).appendChild(style);

    const runtime=doc.createElement('script');
    runtime.id='dini-source-background-runtime-v100';
    runtime.textContent=`(()=>{
'use strict';
if(window.__DINI_SOURCE_BACKGROUND_RUNTIME_V100__)return;
window.__DINI_SOURCE_BACKGROUND_RUNTIME_V100__=true;
const num=(v,d)=>{const n=Number(v);return Number.isFinite(n)?n:d};
const sourceCfg=el=>{try{return JSON.parse(String(el.getAttribute('data-settings')||'').replace(/&quot;/g,'"'))}catch{return{}}};
const urlsFor=el=>{try{const a=JSON.parse(String(el.getAttribute('data-dini-bg-slideshow-urls')||'[]'));return Array.isArray(a)?a.filter(Boolean):[]}catch{return[]}};

function ensureHostedVideo(host){
  if(host.__diniBgVideoReady)return;
  const cfg=sourceCfg(host),url=String(host.getAttribute('data-dini-bg-video-url')||cfg.background_video_link||'').trim();
  if(!/^https?:\\/\\//i.test(url))return;
  let box=host.querySelector(':scope > .elementor-background-video-container')||host.querySelector('.elementor-background-video-container');
  if(!box){box=document.createElement('div');box.className='elementor-background-video-container';host.insertBefore(box,host.firstChild)}
  let video=box.querySelector('video');
  if(!video){video=document.createElement('video');video.className='elementor-background-video-hosted';box.appendChild(video)}
  video.muted=true;video.defaultMuted=true;video.playsInline=true;video.setAttribute('playsinline','');video.setAttribute('muted','');video.preload='auto';
  video.loop=host.getAttribute('data-dini-bg-video-play-once')!=='1';
  if(video.getAttribute('src')!==url){video.setAttribute('src',url);try{video.load()}catch{}}
  host.__diniBgVideoReady=true;

  const play=()=>{setTimeout(()=>{try{const p=video.play();if(p&&typeof p.catch==='function')p.catch(()=>{})}catch{}},100)};
  const showMotionText=()=>setTimeout(()=>{const text=host.querySelector('.motionText')||document.querySelector('.motionText');if(text)text.style.display='flex'},3000);
  const buttons=[...document.querySelectorAll('#tombolbuka,.tombolbuka')];
  if(buttons.length){
    buttons.forEach(btn=>{if(btn.dataset.diniBgVideoBound==='1')return;btn.dataset.diniBgVideoBound='1';btn.addEventListener('click',()=>{play();showMotionText()})});
  }else if(video.muted){
    play();
  }
}

function ensureSlideshow(host){
  if(host.__diniBgSlideshowReady)return;
  const urls=urlsFor(host);if(!urls.length)return;
  let layer=host.querySelector(':scope > .dini-source-native-bg-slideshow');
  if(!layer){layer=document.createElement('div');layer.className='dini-source-native-bg-slideshow';host.insertBefore(layer,host.firstChild)}
  let i=0;
  const duration=Math.max(250,num(host.getAttribute('data-dini-bg-slideshow-duration'),5000));
  const transition=Math.max(0,num(host.getAttribute('data-dini-bg-slideshow-transition'),500));
  const loop=host.getAttribute('data-dini-bg-slideshow-loop')!=='0';
  const ken=host.getAttribute('data-dini-bg-slideshow-kenburns')==='1';
  const paint=()=>{layer.style.transitionDuration=transition+'ms';layer.style.backgroundImage='url("'+String(urls[i]).replace(/"/g,'%22')+'")';layer.style.transform=ken?'scale(1.035)':'none';requestAnimationFrame(()=>{if(ken)layer.style.transform='scale(1.10)'})};
  paint();
  if(urls.length>1&&(loop||i<urls.length-1)){
    const tick=()=>{if(!loop&&i>=urls.length-1)return;i=(i+1)%urls.length;paint();setTimeout(tick,duration+transition)};
    setTimeout(tick,duration+transition);
  }
  host.__diniBgSlideshowReady=true;
}

function boot(){
  document.querySelectorAll('[data-dini-native-bg-video="1"]').forEach(ensureHostedVideo);
  document.querySelectorAll('[data-dini-native-bg-slideshow="1"]').forEach(ensureSlideshow);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();`;
    (doc.body||doc.documentElement).appendChild(runtime);
    doc.documentElement.setAttribute('data-dini-source-background-parity',VERSION);
    doc.documentElement.setAttribute('data-dini-source-background-videos',String(bgVideos));
    doc.documentElement.setAttribute('data-dini-source-background-slideshows',String(bgSlideshows));
    return '<!doctype html>\n'+doc.documentElement.outerHTML;
  }

  function augmentSnapshot(input){
    const snap=deep(input||{});
    if(!snap||!(snap.html||snap.baseHtml))return snap;
    const html=install(snap.html||snap.baseHtml||'');
    snap.html=html;
    snap.baseHtml=html;
    snap.source_background_parity={version:VERSION,hosted_video:true,slideshow:true};
    return snap;
  }

  function patchMediaPublic(){
    const M=window.DINI_MEDIA_SOURCE_PARITY_V1;
    if(!M||M.__diniSourceBackgroundParityV1)return;
    if(typeof M.augment==='function'){
      const base=M.augment.bind(M);
      M.augment=(html,schema,values)=>{const out=base(html,schema,values);if(out?.html)out.html=install(out.html);return out};
    }
    if(typeof M.augmentSnapshot==='function'){
      const base=M.augmentSnapshot.bind(M);
      M.augmentSnapshot=input=>augmentSnapshot(base(input));
    }
    M.__diniSourceBackgroundParityV1=VERSION;
  }

  function patchFetch(){
    const E=window.DINI_FETCH_V2;
    if(!E||E.__diniSourceBackgroundParityV1)return;
    if(typeof E.loadOrCreateSession==='function'){
      const baseLoad=E.loadOrCreateSession.bind(E);
      E.loadOrCreateSession=async h=>{const s=await baseLoad(h);if(s?.baseline?.html){const a=augmentSnapshot(s.baseline);s.baseline={...s.baseline,...a};if(typeof E.baselineHash==='function')s.baseline.hash=E.baselineHash(s.baseline.html,s.baseline.schema||{})}return s};
    }
    if(typeof E.augmentMediaSourceSnapshot==='function'){
      const base=E.augmentMediaSourceSnapshot.bind(E);
      E.augmentMediaSourceSnapshot=input=>augmentSnapshot(base(input));
    }
    E.augmentSourceBackgroundSnapshot=augmentSnapshot;
    E.__diniSourceBackgroundParityV1=VERSION;
    document.documentElement.dataset.sourceBackgroundFetch=VERSION;
  }

  function patchCanonical(){
    const C=window.DINI_TEMPLATE_CANONICAL_V1160;
    if(!C||C.__diniSourceBackgroundParityV1)return;
    if(typeof C.resolveSnapshot==='function'){
      const base=C.resolveSnapshot.bind(C);
      C.resolveSnapshot=input=>augmentSnapshot(base(input));
    }
    if(typeof C.augmentMediaSourceSnapshot==='function'){
      const base=C.augmentMediaSourceSnapshot.bind(C);
      C.augmentMediaSourceSnapshot=input=>augmentSnapshot(base(input));
    }
    C.augmentSourceBackgroundSnapshot=augmentSnapshot;
    C.__diniSourceBackgroundParityV1=VERSION;
    document.documentElement.dataset.sourceBackgroundCanonical=VERSION;
  }

  patchMediaPublic();
  patchFetch();
  patchCanonical();
  window.DINI_SOURCE_BACKGROUND_PARITY_V1={VERSION,install,augmentSnapshot,patchMediaPublic,patchFetch,patchCanonical};
})();