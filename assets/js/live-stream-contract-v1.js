(function(g){
  'use strict';
  if(g.DINI_LIVE_STREAM_CONTRACT_V1?.version)return;

  const VERSION='1.0.1';
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const bool=v=>/^(?:1|true|yes|on|enabled)$/i.test(clean(v));
  const safeUrl=v=>{
    const raw=clean(v);
    if(!raw)return'';
    try{
      const u=new URL(raw,location.href);
      if(!/^https?:$/i.test(u.protocol))return'';
      return u.href;
    }catch{return''}
  };
  const provider=v=>{
    const u=safeUrl(v).toLowerCase();
    if(!u)return'none';
    if(/youtube\.com|youtu\.be/.test(u))return'youtube';
    if(/instagram\.com/.test(u))return'instagram';
    if(/tiktok\.com/.test(u))return'tiktok';
    if(/vimeo\.com/.test(u))return'vimeo';
    return'external';
  };
  const youtubeId=v=>{
    const u=safeUrl(v);if(!u)return'';
    try{
      const x=new URL(u);
      if(/youtu\.be$/i.test(x.hostname))return clean(x.pathname.split('/').filter(Boolean)[0]||'').replace(/[^a-zA-Z0-9_-]/g,'');
      if(/youtube\.com$/i.test(x.hostname)||/\.youtube\.com$/i.test(x.hostname)){
        if(x.searchParams.get('v'))return clean(x.searchParams.get('v')).replace(/[^a-zA-Z0-9_-]/g,'');
        const p=x.pathname.split('/').filter(Boolean);
        const i=p.findIndex(a=>/^(?:embed|live|shorts)$/i.test(a));
        if(i>=0&&p[i+1])return clean(p[i+1]).replace(/[^a-zA-Z0-9_-]/g,'');
      }
    }catch{}
    return'';
  };
  const sourceLiveText=/\blive\s*stream(?:ing)?\b|\blive\s+(?:instagram|youtube)\b|\bsiaran\s+langsung\b|\bsaksikan\s+(?:live|langsung)\b/i;
  const liveActionText=/\bjoin\s+live\b|\bwatch\s+live\b|\btonton\s+live\b|\bsaksikan\s+(?:live|langsung)\b|\blive\s+stream(?:ing)?\b/i;
  const providerUrl=/youtube\.com|youtu\.be|instagram\.com|tiktok\.com|vimeo\.com/i;

  function sectionRoots(doc){
    if(!doc?.querySelectorAll)return[];
    // One Live Stream Contract per authored top-level section.
    // Elementor pages often contain nested <section> wrappers inside the same top section;
    // treating every nested section as independent creates duplicate live-enabled/live-url fields.
    const primary=[...doc.querySelectorAll('.elementor-top-section,body > section')];
    if(primary.length)return [...new Set(primary)];
    const all=[...doc.querySelectorAll('section')];
    return all.filter(sec=>!all.some(other=>other!==sec&&other.contains(sec)));
  }
  function isLiveSection(sec){
    const txt=clean(sec?.textContent||'');
    if(sourceLiveText.test(txt))return true;
    const frame=sec?.querySelector?.('iframe[src],embed[src],object[data]');
    const src=frame?.getAttribute?.('src')||frame?.getAttribute?.('data')||'';
    if(providerUrl.test(src))return true;
    const a=[...sec?.querySelectorAll?.('a[href]')||[]].find(x=>liveActionText.test(clean(x.textContent))&&providerUrl.test(x.getAttribute('href')||''));
    return !!a;
  }
  function findSections(doc){return sectionRoots(doc).filter(isLiveSection)}

  function scrubProviderStrings(value){
    if(typeof value==='string')return providerUrl.test(value)?'':value;
    if(Array.isArray(value))return value.map(scrubProviderStrings);
    if(value&&typeof value==='object'){
      const out={};
      for(const [k,v] of Object.entries(value))out[k]=scrubProviderStrings(v);
      return out;
    }
    return value;
  }

  function makePlayerHost(doc,frame,sec){
    let host=frame?.parentElement||null;
    if(!host){
      const action=[...sec.querySelectorAll('a,button')].find(a=>liveActionText.test(clean(a.textContent)));
      const anchor=action?.closest?.('.elementor-widget,.elementor-column,.elementor-widget-wrap')||action||null;
      host=doc.createElement('div');
      host.setAttribute('data-dini-live-player-host-created','1');
      if(anchor?.parentElement)anchor.parentElement.insertBefore(host,anchor);
      else sec.appendChild(host);
    }
    if(!host.querySelector?.('[data-dini-live-player]')){
      const slot=doc.createElement('div');
      slot.setAttribute('data-dini-live-player','1');
      slot.setAttribute('aria-hidden','true');
      slot.style.cssText='display:none;width:100%;aspect-ratio:16/9;position:relative;overflow:hidden;';
      host.appendChild(slot);
    }
    return host.querySelector('[data-dini-live-player]');
  }

  function prepareDocument(doc){
    if(!doc?.querySelectorAll)return{version:1,count:0,sections:[]};
    const rows=[];
    for(const [i,sec] of findSections(doc).entries()){
      sec.setAttribute('data-dini-live-stream','1');
      sec.setAttribute('data-dini-live-stream-contract',VERSION);
      sec.setAttribute('data-dini-live-enabled','0');
      sec.setAttribute('data-dini-live-url','');
      sec.setAttribute('data-dini-live-provider','none');

      const frames=[...sec.querySelectorAll('iframe,embed,object')];
      const first=frames[0]||null;
      const player=makePlayerHost(doc,first,sec);
      for(const n of frames)n.remove();

      const playerWidget=player?.closest?.('.elementor-widget,[data-settings]')||null;
      for(const el of [playerWidget,...(playerWidget?.querySelectorAll?.('[data-settings]')||[])].filter(Boolean)){
        const raw=el.getAttribute?.('data-settings')||'';
        if(!raw)continue;
        try{
          const parsed=JSON.parse(raw);
          const next=JSON.stringify(scrubProviderStrings(parsed));
          el.setAttribute('data-settings',next);
        }catch{}
      }

      const actions=[...sec.querySelectorAll('a[href],button')].filter(a=>{
        const txt=clean(a.textContent);
        const href=a.getAttribute?.('href')||'';
        return liveActionText.test(txt)||providerUrl.test(href);
      });
      for(const a of actions){
        a.setAttribute('data-dini-live-action','1');
        if(a.matches?.('a'))a.setAttribute('href','#');
        a.removeAttribute?.('target');
        a.removeAttribute?.('rel');
        a.setAttribute('aria-disabled','true');
      }

      rows.push({
        index:i,
        section:sec,
        section_id:sec.id||sec.getAttribute('data-id')||'',
        player_present:!!player,
        action_count:actions.length,
        source_player_removed:frames.length
      });
    }
    return{version:1,contract:'dini-live-stream-v1',count:rows.length,sections:rows};
  }

  function applySection(sec){
    if(!sec)return{enabled:false,url:'',provider:'none',embedded:false};
    const enabled=bool(sec.getAttribute('data-dini-live-enabled'));
    const url=safeUrl(sec.getAttribute('data-dini-live-url')||'');
    const p=provider(url);
    sec.setAttribute('data-dini-live-provider',p);

    const player=sec.querySelector('[data-dini-live-player]');
    if(player){
      const id=enabled&&p==='youtube'?youtubeId(url):'';
      const expected=id?`https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`:'';
      let current=player.querySelector('[data-dini-live-generated]');
      if(expected){
        if(!current||current.getAttribute('src')!==expected){
          current?.remove();
          const iframe=sec.ownerDocument.createElement('iframe');
          iframe.setAttribute('data-dini-live-generated','1');
          iframe.setAttribute('title','Live Streaming');
          iframe.setAttribute('loading','lazy');
          iframe.setAttribute('src',expected);
          iframe.setAttribute('allow','accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
          iframe.setAttribute('allowfullscreen','');
          iframe.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
          iframe.style.cssText='position:absolute;inset:0;width:100%;height:100%;border:0;';
          player.appendChild(iframe);
          current=iframe;
        }
        player.style.display='block';
        player.setAttribute('aria-hidden','false');
      }else{
        current?.remove();
        player.style.display='none';
        player.setAttribute('aria-hidden','true');
      }
    }

    for(const a of sec.querySelectorAll('[data-dini-live-action]')){
      if(a.matches?.('a')){
        a.setAttribute('href',enabled&&url?url:'#');
        if(enabled&&url){a.setAttribute('target','_blank');a.setAttribute('rel','noopener noreferrer');a.removeAttribute('aria-disabled')}
        else{a.removeAttribute('target');a.removeAttribute('rel');a.setAttribute('aria-disabled','true')}
      }else a.setAttribute('aria-disabled',enabled&&url?'false':'true');
    }

    sec.setAttribute('data-dini-live-runtime',VERSION);
    return{enabled,url,provider:p,embedded:!!(enabled&&p==='youtube'&&youtubeId(url))};
  }

  function applyDocument(doc){
    if(!doc?.querySelectorAll)return{count:0,embedded:0};
    let count=0,embedded=0;
    for(const sec of doc.querySelectorAll('[data-dini-live-stream]')){
      const r=applySection(sec);count++;if(r.embedded)embedded++;
    }
    if(doc.documentElement){
      doc.documentElement.setAttribute('data-dini-live-runtime',VERSION);
      doc.documentElement.setAttribute('data-dini-live-count',String(count));
      doc.documentElement.setAttribute('data-dini-live-embedded',String(embedded));
    }
    return{count,embedded};
  }

  function manifestFromFields(fields=[]){
    const enabled=(fields||[]).filter(f=>f?.kind==='live-enabled');
    const urls=(fields||[]).filter(f=>f?.kind==='live-url');
    const sectionIds=[...new Set([...enabled,...urls].map(f=>f.section_id).filter(Boolean))];
    return{
      version:1,
      contract:'dini-live-stream-v1',
      count:sectionIds.length,
      section_ids:sectionIds,
      enabled_field_ids:enabled.map(f=>f.id),
      url_field_ids:urls.map(f=>f.id),
      source_player_policy:'removed',
      embed_policy:'youtube-url-only',
      external_url_policy:'button-only'
    };
  }

  const boundDocs=new WeakMap(),boundFrames=new WeakSet();
  function bindDocument(doc){
    if(!doc?.documentElement||boundDocs.has(doc))return;
    let timer=0;
    const run=()=>applyDocument(doc);
    const schedule=()=>{clearTimeout(timer);timer=setTimeout(run,20)};
    run();
    const mo=new MutationObserver(schedule);
    try{mo.observe(doc.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['data-dini-live-enabled','data-dini-live-url']})}catch{}
    boundDocs.set(doc,mo);
    [80,250,700,1800].forEach(ms=>setTimeout(run,ms));
  }
  function bindFrame(frame){
    if(!frame||boundFrames.has(frame))return;
    boundFrames.add(frame);
    const run=()=>{try{bindDocument(frame.contentDocument)}catch{}};
    frame.addEventListener('load',()=>{run();[50,180,600].forEach(ms=>setTimeout(run,ms))});
    run();
  }
  function discoverFrames(doc=document){
    for(const id of ['previewFrame','templatePreviewFrame','diniPublicCanonicalFrame','rebuildPreviewFrame','cleanFrame'])bindFrame(doc.getElementById?.(id));
  }

  g.DINI_LIVE_STREAM_CONTRACT_V1={version:VERSION,findSections,prepareDocument,applySection,applyDocument,manifestFromFields,safeUrl,provider,youtubeId,bool,bindDocument,bindFrame};
  bindDocument(document);discoverFrames();
  const rootObserver=new MutationObserver(()=>discoverFrames());
  try{rootObserver.observe(document.documentElement,{subtree:true,childList:true})}catch{}
  [100,300,900,2200,5000].forEach(ms=>setTimeout(discoverFrames,ms));
  setTimeout(()=>rootObserver.disconnect(),12000);
})(window);
