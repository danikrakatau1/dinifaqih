(function(g){
  'use strict';
  if(g.DiniMediaLifecycleAdapter?.version)return;

  const VERSION='1.0.0';
  const CONTRACT_VERSION=1;
  const VR=g.DiniVisualResolver;
  if(!VR?.makeSourceGraph){
    console.warn('[DINI MEDIA] Visual resolver belum tersedia.');
    return;
  }
  const originalMakeSourceGraph=VR.makeSourceGraph.bind(VR);
  const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
  const hash=s=>{let h=2166136261;for(const c of String(s??'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')};
  const decode=v=>{try{const t=document.createElement('textarea');t.innerHTML=String(v||'');return t.value}catch{return String(v||'')}};
  const parseSettings=el=>{const raw=decode(el?.getAttribute?.('data-settings')||'');try{return raw?JSON.parse(raw):{}}catch{return{__parse_error:true,__raw:raw}}};
  const elementId=el=>el?.getAttribute?.('data-id')||((String(el?.className||'').match(/elementor-element-([A-Za-z0-9_-]+)/)||[])[1])||el?.id||'';
  const selectorFor=el=>{
    if(!el)return'';
    if(el.id)return '#'+el.id;
    const id=elementId(el);if(id)return '[data-id="'+id+'"]';
    return String(el.tagName||'element').toLowerCase();
  };
  const yes=v=>/^(?:yes|true|1|on)$/i.test(clean(v));
  const num=(v,f=null)=>Number.isFinite(Number(v))?Number(v):f;
  const abs=(u,base)=>{try{return new URL(String(u||''),base||document.baseURI||location.href).href}catch{return String(u||'')}};
  const scriptText=doc=>[...doc.querySelectorAll('script')].map(x=>String(x.textContent||'')).join('\n');

  function firstDelay(code,patterns,fallback){
    for(const p of patterns){
      const m=code.match(p);
      if(m?.[1]&&Number.isFinite(Number(m[1])))return Number(m[1]);
    }
    return fallback;
  }
  function findOpenSelector(doc){
    if(doc.querySelector('#tombolbuka'))return '#tombolbuka';
    if(doc.querySelector('.tombolbuka'))return '.tombolbuka';
    if(doc.querySelector('[data-native-open]'))return '[data-native-open]';
    return '';
  }
  function motionIntro(doc,{baseUrl=''}={}){
    const host=doc.querySelector('.motionSection[data-settings],.motionSection [data-settings]')?.closest?.('[data-settings]')||doc.querySelector('.motionSection[data-settings]');
    if(!host)return null;
    const cfg=parseSettings(host);
    const url=cfg.background_video_link||cfg.background_video_url||cfg.video_url||'';
    if(!url)return null;
    const video=host.querySelector('video.elementor-background-video-hosted,video');
    const code=scriptText(doc);
    const playDelay=firstDelay(code,[
      /motionSection[\s\S]{0,900}?\.play\(\)[\s\S]{0,120}?\}\s*,\s*(\d+)\s*\)/i,
      /btnBukaClicked[\s\S]{0,900}?\.play\(\)[\s\S]{0,120}?\}\s*,\s*(\d+)\s*\)/i
    ],100);
    const textDelay=firstDelay(code,[
      /motionText[\s\S]{0,260}?display\s*=\s*["']flex["'][\s\S]{0,120}?\}\s*,\s*(\d+)\s*\)/i
    ],3000);
    const fallbackDelay=firstDelay(code,[
      /btnVisibleAfterLoad[\s\S]{0,260}?\}\s*,\s*(\d+)\s*\)/i
    ],15000);
    const readyMatches=[...code.matchAll(/btnVisibleAfterLoad[\s\S]{0,340}?iframeOrVideoLoaded\s*=\s*true[\s\S]{0,120}?\}\s*,\s*(\d+)\s*\)/ig)];
    const hostedReady=readyMatches.length?Number(readyMatches[0][1]):200;
    const unlockOnEnded=/\.onended\s*=|addEventListener\(\s*["']ended["']/i.test(code);
    const unlockOnPause=/\.onpause\s*=|addEventListener\(\s*["']pause["']/i.test(code);
    const lockMatch=code.match(/let\s+lockSection\s*=\s*\(\s*["']([^"']+)["']\s*===\s*["']yes["']\s*\)/i);
    const sourceLockValue=lockMatch?.[1]||'';
    return {
      id:'motion-intro-'+hash(selectorFor(host)+'|'+url),
      adapter:'motion-intro-video',
      selector:selectorFor(host),
      video_selector:video?selectorFor(video):'.elementor-background-video-container video',
      open_selector:findOpenSelector(doc),
      text_selector:host.querySelector('.motionText')?'.motionText':'',
      provider:/youtu(?:\.be|be\.com)/i.test(url)?'youtube':'hosted',
      url:abs(url,baseUrl),
      muted:true,
      playsinline:true,
      play_once:cfg.background_play_once==='yes',
      play_on_mobile:cfg.background_play_on_mobile==='yes',
      source_autoplay:video?.hasAttribute?.('autoplay')||false,
      timing:{
        play_after_open_ms:playDelay,
        motion_text_after_open_ms:textDelay,
        hosted_ready_ms:hostedReady,
        force_button_visible_ms:fallbackDelay
      },
      unlock:{
        on_ended:unlockOnEnded,
        on_pause:unlockOnPause,
        class_name:'locked-section',
        source_lock_enabled:sourceLockValue==='yes'
      },
      source_authority:true
    };
  }

  function audioContract(doc,{baseUrl=''}={}){
    const code=scriptText(doc);
    const audios=[...doc.querySelectorAll('audio')].map((el,index)=>({
      id:'audio-'+hash(selectorFor(el)+'|'+index),
      selector:selectorFor(el),
      url:abs(el.getAttribute('src')||el.querySelector('source')?.getAttribute('src')||'',baseUrl),
      loop:el.hasAttribute('loop'),
      autoplay:el.hasAttribute('autoplay'),
      muted:el.hasAttribute('muted')||!!el.muted,
      preload:el.getAttribute('preload')||'',
      source_authority:true
    }));
    const widget=doc.querySelector('[data-widget_type="weddingpress-audio.default"],[data-widget_type^="weddingpress-audio."]');
    const cfg=parseSettings(widget);
    if(widget&&audios[0]&&cfg.loop!==undefined)audios[0].loop=yes(cfg.loop);
    const controls=[...doc.querySelectorAll('.elementor-icon-wrapper[id*="mute-sound"],[id*="mute-sound"],.audio-box')].map((el,index)=>({
      id:'audio-control-'+hash(selectorFor(el)+'|'+index),
      selector:selectorFor(el),
      icon_selector:el.querySelector('i')?'i':'',
      active_class:'audioRotate'
    }));
    const youtubeIframe=doc.querySelector('iframe#youtube-player,#youtube-player');
    const playOnOpen=/onclick\s*=|addEventListener\([^)]*click/i.test(code)&&/\b_playAudio\s*\(/i.test(code);
    const visibilityEvidence=/visibilitychange|document\.hidden|visibilityState/i.test(code);
    return {
      version:1,
      tracks:audios,
      controls,
      youtube_audio:youtubeIframe?{selector:'#youtube-player',provider:'youtube'}:null,
      play_on_open:playOnOpen||audios.some(x=>x.autoplay),
      toggle_evidence:/\b_pauseAudio\s*\(/i.test(code)&&/\b_playAudio\s*\(/i.test(code),
      visibility_policy:visibilityEvidence?'pause-hidden-resume-visible':'source-none',
      source_active_class:/audioRotate/i.test(code)?'audioRotate':'',
      source_authority:true
    };
  }

  function providerWidgets(doc,{baseUrl=''}={}){
    const out=[];
    [...doc.querySelectorAll('[data-widget_type="video.default"],[data-widget_type^="video."]')].forEach((el,index)=>{
      const cfg=parseSettings(el);
      const type=String(cfg.video_type||(/youtu/i.test(cfg.youtube_url||'')?'youtube':/vimeo/i.test(cfg.vimeo_url||'')?'vimeo':'hosted')).toLowerCase();
      const raw=type==='youtube'?(cfg.youtube_url||''):type==='vimeo'?(cfg.vimeo_url||''):(cfg.hosted_url?.url||cfg.external_url?.url||cfg.video_url||'');
      if(!raw)return;
      out.push({
        id:'provider-video-'+hash(selectorFor(el)+'|'+index+'|'+raw),
        selector:selectorFor(el),
        provider:type,
        url:abs(raw,baseUrl),
        autoplay:yes(cfg.autoplay),
        play_on_mobile:yes(cfg.play_on_mobile),
        muted:yes(cfg.mute),
        loop:yes(cfg.loop),
        controls:cfg.controls===undefined?true:yes(cfg.controls),
        start:num(cfg.start,0),
        end:num(cfg.end,0),
        rel:cfg.rel===undefined?null:yes(cfg.rel),
        modestbranding:cfg.modestbranding===undefined?null:yes(cfg.modestbranding),
        privacy_mode:yes(cfg.privacy_mode),
        lazy_load:yes(cfg.lazy_load),
        source_authority:true
      });
    });
    return out;
  }

  function compile(doc,opts={}){
    const intro=motionIntro(doc,opts);
    const audio=audioContract(doc,opts);
    const providers=providerWidgets(doc,opts);
    return {
      version:CONTRACT_VERSION,
      engine:'dini-media-lifecycle-adapter-v'+VERSION,
      intro_video:intro,
      audio,
      provider_videos:providers,
      counts:{
        intro_video:intro?1:0,
        audio_tracks:audio.tracks.length,
        audio_controls:audio.controls.length,
        provider_videos:providers.length,
        youtube:providers.filter(x=>x.provider==='youtube').length,
        vimeo:providers.filter(x=>x.provider==='vimeo').length,
        hosted:providers.filter(x=>x.provider==='hosted').length,
        visibility_audio_policy:audio.visibility_policy!=='source-none'?1:0
      },
      runtime_policy:{
        source_timing_authoritative:true,
        exact_open_play_delay:true,
        exact_motion_text_delay:true,
        exact_force_visible_delay:true,
        ended_pause_unlock_source_authoritative:true,
        source_audio_toggle_state:true,
        arbitrary_source_js:false,
        provider_reconstruction_only_when_missing:true
      }
    };
  }

  VR.makeSourceGraph=function(doc,opts={}){
    const graph=originalMakeSourceGraph(doc,opts);
    try{
      const plan=compile(doc,opts);
      graph.behavior_adapters={...(graph.behavior_adapters||{}),media_lifecycle:plan};
      graph.authority={...(graph.authority||{}),media_lifecycle_truth:'source-dom-settings-and-script-evidence'};
      graph.diagnostics={...(graph.diagnostics||{}),intro_video_contract:plan.counts.intro_video,audio_track_count:plan.counts.audio_tracks,audio_control_count:plan.counts.audio_controls,provider_video_count:plan.counts.provider_videos,provider_youtube_count:plan.counts.youtube};
      return graph;
    }catch(err){
      console.warn('[DINI MEDIA] compile gagal; graph lama dipertahankan.',err);
      graph.behavior_adapters={...(graph.behavior_adapters||{}),media_lifecycle:{version:CONTRACT_VERSION,engine:'dini-media-lifecycle-adapter-v'+VERSION,intro_video:null,audio:{tracks:[],controls:[],visibility_policy:'source-none'},provider_videos:[],counts:{intro_video:0,audio_tracks:0,provider_videos:0},error:String(err?.message||err)}};
      return graph;
    }
  };

  g.DiniMediaLifecycleAdapter={version:VERSION,contract_version:CONTRACT_VERSION,compile,motionIntro,audioContract,providerWidgets};
  console.info('[DINI MEDIA] V'+VERSION+' aktif — intro video/audio/provider lifecycle semantic contract.');
})(window);
