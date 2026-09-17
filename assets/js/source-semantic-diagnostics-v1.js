(function(g){
  'use strict';
  if(g.DiniSemanticDiagnostics?.version)return;

  const VERSION='1.0.0';
  const VR=g.DiniVisualResolver;
  if(!VR?.makeSourceGraph){
    console.warn('[DINI SEMANTIC DIAGNOSTICS] Visual resolver belum tersedia.');
    return;
  }
  const originalMakeSourceGraph=VR.makeSourceGraph.bind(VR);
  const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
  const hash=s=>{let h=2166136261;for(const c of String(s??'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')};
  const uniqBy=(arr,keyFn)=>{const out=[],seen=new Set();for(const x of arr||[]){const k=keyFn(x);if(seen.has(k))continue;seen.add(k);out.push(x)}return out};

  const MONTHS={
    januari:1,january:1,jan:1,
    februari:2,february:2,feb:2,
    maret:3,march:3,mar:3,
    april:4,apr:4,
    mei:5,may:5,
    juni:6,june:6,jun:6,
    juli:7,july:7,jul:7,
    agustus:8,august:8,agu:8,aug:8,
    september:9,sep:9,sept:9,
    oktober:10,october:10,okt:10,oct:10,
    november:11,nov:11,
    desember:12,december:12,des:12,dec:12
  };
  const pad=n=>String(n).padStart(2,'0');
  const validYmd=(y,m,d)=>{
    y=Number(y);m=Number(m);d=Number(d);
    if(y<1900||y>2200||m<1||m>12||d<1||d>31)return'';
    const dt=new Date(Date.UTC(y,m-1,d));
    return dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d?String(y)+'-'+pad(m)+'-'+pad(d):'';
  };
  function dateOnlyFromText(raw){
    const text=clean(raw).replace(/[,]/g,' ');
    let m;
    if((m=text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/))){
      const ymd=validYmd(m[1],m[2],m[3]);if(ymd)return ymd;
    }
    if((m=text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/))){
      const ymd=validYmd(m[3],m[2],m[1]);if(ymd)return ymd;
    }
    if((m=text.match(/\b(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(20\d{2})\b/i))){
      const mon=MONTHS[String(m[2]).toLowerCase()];if(mon){const ymd=validYmd(m[3],mon,m[1]);if(ymd)return ymd}
    }
    const parsed=Date.parse(text);
    if(Number.isFinite(parsed)){
      const dt=new Date(parsed);
      if(dt.getUTCFullYear()>=1900&&dt.getUTCFullYear()<=2200)return validYmd(dt.getUTCFullYear(),dt.getUTCMonth()+1,dt.getUTCDate());
    }
    return '';
  }
  function googleDatePart(raw){
    const s=String(raw||'').trim();
    const first=s.split('/')[0]||'';
    let m=first.match(/^(20\d{2})(\d{2})(\d{2})/);
    if(m)return validYmd(m[1],m[2],m[3]);
    return dateOnlyFromText(first);
  }
  function selectorFor(el){
    if(!el)return'';
    if(el.id)return '#'+el.id;
    const id=el.getAttribute?.('data-id')||((String(el.className||'').match(/elementor-element-([A-Za-z0-9_-]+)/)||[])[1]);
    if(id)return '[data-id="'+id+'"]';
    return String(el.tagName||'element').toLowerCase();
  }

  function scanCountdowns(doc){
    const out=[];
    [...doc.querySelectorAll('[data-date]')].forEach((el,index)=>{
      const raw=String(el.getAttribute('data-date')||'').trim();
      const date=dateOnlyFromText(raw);
      if(raw)out.push({id:'countdown-'+hash(selectorFor(el)+'|'+raw),kind:'countdown',date,raw,selector:selectorFor(el),confidence:date?1:.45,index});
    });
    [...doc.querySelectorAll('[data-settings]')].forEach((el,index)=>{
      let cfg={};try{cfg=JSON.parse(String(el.getAttribute('data-settings')||'').replace(/&quot;/g,'"'))}catch{}
      for(const key of ['date','countdown_date','due_date']){
        const raw=String(cfg?.[key]||'').trim();if(!raw)continue;
        const date=dateOnlyFromText(raw);
        out.push({id:'countdown-'+hash(selectorFor(el)+'|'+key+'|'+raw),kind:'countdown',date,raw,selector:selectorFor(el),source_key:key,confidence:date?.length?0.95:.4,index});
      }
    });
    return uniqBy(out,x=>x.kind+'|'+x.selector+'|'+x.raw);
  }

  function scanCalendars(doc){
    const out=[];
    [...doc.querySelectorAll('a[href]')].forEach((el,index)=>{
      const raw=String(el.getAttribute('href')||'').trim();if(!raw)return;
      let u;try{u=new URL(raw,doc.baseURI||location.href)}catch{return}
      const host=u.hostname.toLowerCase(),path=u.pathname.toLowerCase();
      let provider='',date='',source='';
      if(/calendar\.google\./i.test(host)||/google\.com$/i.test(host)&&/calendar/.test(path)){
        provider='google';const dates=u.searchParams.get('dates')||'';date=googleDatePart(dates);source=dates;
      }else if(/outlook\.live\.com|outlook\.office\.com|office\.com/i.test(host)){
        provider='outlook';const start=u.searchParams.get('startdt')||u.searchParams.get('start')||'';date=dateOnlyFromText(start);source=start;
      }else return;
      out.push({id:'calendar-'+hash(raw),kind:'calendar',provider,date,raw:source||raw,url:raw,label:clean(el.textContent),selector:selectorFor(el),confidence:date?1:.6,index});
    });
    return uniqBy(out,x=>x.provider+'|'+x.date+'|'+x.url);
  }

  function eventContextNodes(doc){
    const nodes=[];
    const selectors='.elementor-widget,.elementor-top-section,section,.elementor-column,.elementor-container';
    [...doc.querySelectorAll(selectors)].forEach(el=>{
      const t=clean(el.textContent);if(!t||t.length>1800)return;
      if(/\b(akad(?:\s+nikah)?|resepsi|ramah\s+tamah|wedding\s+ceremony|reception|acara)\b/i.test(t))nodes.push(el);
    });
    return nodes;
  }
  function scanEvents(doc){
    const out=[];
    eventContextNodes(doc).forEach((el,index)=>{
      const text=clean(el.textContent);
      const date=dateOnlyFromText(text);if(!date)return;
      const role=/\bakad\b/i.test(text)?'akad':/\bresepsi|reception\b/i.test(text)?'reception':/ramah\s+tamah/i.test(text)?'ramah-tamah':'event';
      out.push({id:'event-'+hash(selectorFor(el)+'|'+date+'|'+role),kind:'event',role,date,raw:text.slice(0,500),selector:selectorFor(el),confidence:.8,index});
    });
    return uniqBy(out,x=>x.role+'|'+x.date);
  }

  function scanActions(doc){
    const out=[];
    [...doc.querySelectorAll('a,button,[role="button"]')].forEach((el,index)=>{
      const label=clean(el.textContent);if(!label||label.length>160)return;
      const href=el.getAttribute?.('href');
      const disabled=el.hasAttribute?.('disabled')||el.getAttribute?.('aria-disabled')==='true'||el.classList?.contains('disabled');
      const state=disabled?'disabled':href&&href!=='#'&&!/^javascript:/i.test(href)?'bound':'unbound';
      if(state==='unbound'&&/(instagram|maps?|lokasi|live|calendar|save\s+the\s+date|whatsapp|youtube|tiktok)/i.test(label)){
        out.push({id:'action-'+hash(selectorFor(el)+'|'+label),kind:'action',state,label,selector:selectorFor(el),severity:'info',index});
      }
    });
    return uniqBy(out,x=>x.selector+'|'+x.label);
  }

  function compile(doc){
    const countdowns=scanCountdowns(doc);
    const calendars=scanCalendars(doc);
    const events=scanEvents(doc);
    const actions=scanActions(doc);
    const facts=[...countdowns,...calendars,...events];
    const high=facts.filter(x=>x.date&&Number(x.confidence||0)>=.75);
    const families={};
    for(const x of high)(families[x.kind]||(families[x.kind]=[])).push(x);
    const distinctDates=[...new Set(high.map(x=>x.date))];
    const warnings=[];
    const familyCount=Object.keys(families).length;
    if(familyCount>=2&&distinctDates.length>=2){
      warnings.push({
        code:'SOURCE_DATE_CONFLICT',
        severity:'warning',
        message:'Source memiliki tanggal semantic yang berbeda antar Event/Countdown/Calendar. Nilai dipertahankan apa adanya.',
        dates:distinctDates,
        facts:high.map(x=>({kind:x.kind,role:x.role||'',provider:x.provider||'',date:x.date,raw:x.raw,selector:x.selector,confidence:x.confidence})),
        policy:'preserve-all-source-values-no-autofix'
      });
    }
    for(const a of actions){
      warnings.push({
        code:'UNBOUND_SOURCE_ACTION',
        severity:'info',
        message:'CTA source tidak memiliki action URL. Jangan mengarang href.',
        label:a.label,
        selector:a.selector,
        action_state:'unbound',
        policy:'preserve-unbound-state'
      });
    }
    return {
      version:1,
      engine:'dini-semantic-diagnostics-v'+VERSION,
      facts:{countdowns,calendars,events,actions},
      warnings,
      counts:{countdowns:countdowns.length,calendars:calendars.length,events:events.length,unbound_actions:actions.length,warnings:warnings.length,date_conflicts:warnings.filter(x=>x.code==='SOURCE_DATE_CONFLICT').length},
      policy:{read_only:true,auto_fix:false,preserve_source_values:true,confidence_gate:.75}
    };
  }

  VR.makeSourceGraph=function(doc,opts={}){
    const graph=originalMakeSourceGraph(doc,opts);
    try{
      const semantic=compile(doc);
      graph.semantic_diagnostics=semantic;
      graph.authority={...(graph.authority||{}),semantic_diagnostics:'read-only-source-evidence'};
      graph.diagnostics={...(graph.diagnostics||{}),semantic_warning_count:semantic.counts.warnings,date_conflicts:semantic.counts.date_conflicts,unbound_actions:semantic.counts.unbound_actions};
      return graph;
    }catch(err){
      console.warn('[DINI SEMANTIC DIAGNOSTICS] compile gagal; graph lama dipertahankan.',err);
      graph.semantic_diagnostics={version:1,engine:'dini-semantic-diagnostics-v'+VERSION,facts:{countdowns:[],calendars:[],events:[],actions:[]},warnings:[{code:'SEMANTIC_DIAGNOSTICS_ERROR',severity:'warning',message:String(err?.message||err)}],counts:{warnings:1},policy:{read_only:true,auto_fix:false}};
      return graph;
    }
  };

  g.DiniSemanticDiagnostics={version:VERSION,compile,scanCountdowns,scanCalendars,scanEvents,scanActions,dateOnlyFromText};
  console.info('[DINI SEMANTIC DIAGNOSTICS] V'+VERSION+' aktif — read-only date/action diagnostics, no source normalization.');
})(window);
