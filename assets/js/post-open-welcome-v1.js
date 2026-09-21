(()=>{
'use strict';
if(window.__DINI_POST_OPEN_WELCOME_V3__)return;
window.__DINI_POST_OPEN_WELCOME_V3__=true;

const VERSION='3.0.0';
const root=document.documentElement;
let cfg={};
try{cfg=JSON.parse(document.getElementById('diniPostOpenWelcomeConfig')?.textContent||'{}')}catch{}
const mode=cfg.mode==='guest'?'guest':'public';
const guestName=mode==='guest'
  ?String(cfg.guestName||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,120)
  :'';
const delayMs=Math.max(0,Number(cfg.delayMs)||1500);
const holdMs=Math.max(300,Number(cfg.holdMs)||2500);
const enterMs=1500;
const exitMs=560;
let fired=false;

function pick(selectors,prop){
  for(const s of selectors){
    const el=document.querySelector(s);
    if(!el)continue;
    try{
      const v=getComputedStyle(el);
      if(v&&v[prop])return v[prop];
    }catch{}
  }
  return '';
}
function tokens(){
  const display=['#cover .elementor-heading-title','#cover h1','#cover h2','.elementor-heading-title','h1','h2'];
  const body=['#cover p','#cover .elementor-widget-text-editor','.elementor-widget-text-editor','p','body'];
  const b=getComputedStyle(document.body);
  return {
    displayFont:pick(display,'fontFamily')||b.fontFamily||'inherit',
    bodyFont:pick(body,'fontFamily')||b.fontFamily||'inherit',
    color:pick(display,'color')||pick(body,'color')||b.color||'currentColor',
    bodyColor:pick(body,'color')||pick(display,'color')||b.color||'currentColor',
    displayWeight:pick(display,'fontWeight')||'600'
  };
}
function gunungan(){
  try{
    const found=[...document.images].map(x=>String(x.currentSrc||x.src||''))
      .find(x=>/\/download\.png(?:$|[?#])/i.test(x));
    if(found)return found;
  }catch{}
  return 'https://web.galeriundanganofficial.com/wp-content/uploads/2026/03/download.png';
}

function build(){
  const t=tokens();
  const ov=document.createElement('div');
  ov.id='diniPostOpenWelcome';
  ov.setAttribute('aria-hidden','true');
  ov.setAttribute('data-dini-post-open-welcome',VERSION);
  ov.innerHTML=`
    <div class="dw3-card">
      <svg class="dw3-frame" viewBox="0 0 1000 430" preserveAspectRatio="none" aria-hidden="true">
        <path class="dw3-panel" d="M94 42 Q500 -8 906 42 L906 74 L950 74 L950 356 L906 356 L906 388 Q500 438 94 388 L94 356 L50 356 L50 74 L94 74 Z"/>
        <path class="dw3-seed" pathLength="1" d="M474 411 Q500 415 526 411"/>
        <path class="dw3-outer dw3-outer-left" pathLength="1" d="M500 410 Q300 438 94 388 L94 356 L50 356 L50 74 L94 74 L94 42 Q292 -6 500 -8"/>
        <path class="dw3-outer dw3-outer-right" pathLength="1" d="M500 410 Q700 438 906 388 L906 356 L950 356 L950 74 L906 74 L906 42 Q708 -6 500 -8"/>
        <path class="dw3-inner dw3-inner-left" pathLength="1" d="M500 394 Q306 417 116 371 L116 339 L71 339 L71 91 L116 91 L116 59 Q306 13 500 11"/>
        <path class="dw3-inner dw3-inner-right" pathLength="1" d="M500 394 Q694 417 884 371 L884 339 L929 339 L929 91 L884 91 L884 59 Q694 13 500 11"/>
      </svg>
      <div class="dw3-content">
        <img class="dw3-gunungan" src="${gunungan()}" alt="" aria-hidden="true">
        <div class="dw3-hello"></div>
        <div class="dw3-sub">Selamat Datang Di Undangan Pernikahan</div>
        <div class="dw3-couple">DINI &amp; FAQIH</div>
      </div>
    </div>`;

  ov.querySelector('.dw3-hello').textContent=guestName?'Halo '+guestName:'Halo';

  const st=document.createElement('style');
  st.id='dini-post-open-welcome-v3-style';
  st.textContent=`
  #diniPostOpenWelcome{
    --dw3-display:${t.displayFont};
    --dw3-body:${t.bodyFont};
    --dw3-color:${t.color};
    --dw3-body-color:${t.bodyColor};
    position:fixed;inset:0;z-index:2147482000;display:grid;place-items:center;
    padding:16px;box-sizing:border-box;pointer-events:none;color:var(--dw3-color);
    opacity:0;visibility:hidden;
    transition:opacity ${exitMs}ms cubic-bezier(.4,0,.2,1),visibility 0s linear ${exitMs}ms
  }
  #diniPostOpenWelcome[data-state="in"],
  #diniPostOpenWelcome[data-state="hold"]{
    opacity:1;visibility:visible;transition:opacity .16s linear,visibility 0s linear 0s
  }
  #diniPostOpenWelcome .dw3-card{
    position:relative;width:min(92vw,410px);aspect-ratio:1000/430;min-height:176px;
    opacity:1;transform:translateY(8px) scale(.992);
    transition:transform .5s cubic-bezier(.22,1,.36,1),opacity .5s ease
  }
  #diniPostOpenWelcome[data-state="in"] .dw3-card,
  #diniPostOpenWelcome[data-state="hold"] .dw3-card{transform:none}
  #diniPostOpenWelcome[data-state="out"] .dw3-card{opacity:0;transform:translateY(-8px) scale(.995)}

  #diniPostOpenWelcome .dw3-frame{
    position:absolute;inset:0;width:100%;height:100%;overflow:visible;
    filter:drop-shadow(0 10px 22px rgba(58,42,24,.07))
  }
  #diniPostOpenWelcome .dw3-panel{
    fill:rgba(250,247,237,.76);stroke:none;opacity:0;
    transform-box:fill-box;transform-origin:center;transform:scale(.985,.88)
  }
  #diniPostOpenWelcome[data-state="in"] .dw3-panel,
  #diniPostOpenWelcome[data-state="hold"] .dw3-panel{
    animation:dw3PanelIn .54s .02s cubic-bezier(.22,1,.36,1) both
  }
  @keyframes dw3PanelIn{
    from{opacity:0;transform:scale(.985,.88)}
    to{opacity:1;transform:scale(1,1)}
  }

  #diniPostOpenWelcome .dw3-seed,
  #diniPostOpenWelcome .dw3-outer,
  #diniPostOpenWelcome .dw3-inner{
    fill:none;stroke:currentColor;vector-effect:non-scaling-stroke;
    stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:1
  }
  #diniPostOpenWelcome .dw3-seed{stroke-width:1.7;opacity:.88}
  #diniPostOpenWelcome .dw3-outer{stroke-width:1.65;opacity:.86}
  #diniPostOpenWelcome .dw3-inner{stroke-width:.86;opacity:.42}

  #diniPostOpenWelcome[data-state="in"] .dw3-seed,
  #diniPostOpenWelcome[data-state="hold"] .dw3-seed{
    animation:dw3Seed .24s .42s ease-out forwards
  }
  #diniPostOpenWelcome[data-state="in"] .dw3-outer,
  #diniPostOpenWelcome[data-state="hold"] .dw3-outer{
    animation:dw3TraceOuter 1.18s .54s cubic-bezier(.48,.02,.18,1) forwards
  }
  #diniPostOpenWelcome[data-state="in"] .dw3-inner,
  #diniPostOpenWelcome[data-state="hold"] .dw3-inner{
    animation:dw3TraceInner 1.02s .82s cubic-bezier(.48,.02,.18,1) forwards
  }
  @keyframes dw3Seed{
    from{stroke-dashoffset:1;opacity:0}
    to{stroke-dashoffset:0;opacity:.88}
  }
  @keyframes dw3TraceOuter{
    from{stroke-dashoffset:1}
    to{stroke-dashoffset:0}
  }
  @keyframes dw3TraceInner{
    from{stroke-dashoffset:1;opacity:0}
    to{stroke-dashoffset:0;opacity:.42}
  }

  #diniPostOpenWelcome .dw3-content{
    position:absolute;inset:8% 8.5% 9%;display:grid;place-items:center;align-content:center;
    gap:3px;text-align:center
  }
  #diniPostOpenWelcome .dw3-gunungan{
    height:clamp(42px,11vw,56px);width:auto;max-width:62px;object-fit:contain;
    opacity:0;transform:translateY(7px) scale(.92)
  }
  #diniPostOpenWelcome .dw3-hello{
    font-family:var(--dw3-body);color:var(--dw3-body-color);
    font-size:clamp(14px,3.7vw,17px);line-height:1.25;font-weight:500;
    opacity:0;transform:translateY(7px)
  }
  #diniPostOpenWelcome .dw3-sub{
    font-family:var(--dw3-body);color:var(--dw3-body-color);
    font-size:clamp(11px,3vw,14px);line-height:1.4;font-weight:400;max-width:88%;
    opacity:0;transform:translateY(7px)
  }
  #diniPostOpenWelcome .dw3-couple{
    font-family:var(--dw3-display);color:var(--dw3-color);
    font-size:clamp(21px,6.4vw,31px);line-height:1.07;font-weight:${t.displayWeight};
    opacity:0;transform:translateY(8px)
  }
  #diniPostOpenWelcome[data-state="in"] .dw3-gunungan,
  #diniPostOpenWelcome[data-state="hold"] .dw3-gunungan{
    animation:dw3Orn .46s .48s cubic-bezier(.22,1,.36,1) both
  }
  #diniPostOpenWelcome[data-state="in"] .dw3-hello,
  #diniPostOpenWelcome[data-state="hold"] .dw3-hello{
    animation:dw3Line .40s .62s cubic-bezier(.22,1,.36,1) both
  }
  #diniPostOpenWelcome[data-state="in"] .dw3-sub,
  #diniPostOpenWelcome[data-state="hold"] .dw3-sub{
    animation:dw3Line .42s .74s cubic-bezier(.22,1,.36,1) both
  }
  #diniPostOpenWelcome[data-state="in"] .dw3-couple,
  #diniPostOpenWelcome[data-state="hold"] .dw3-couple{
    animation:dw3Line .46s .86s cubic-bezier(.22,1,.36,1) both
  }
  @keyframes dw3Orn{
    from{opacity:0;transform:translateY(7px) scale(.92)}
    to{opacity:1;transform:none}
  }
  @keyframes dw3Line{
    from{opacity:0;transform:translateY(8px)}
    to{opacity:1;transform:none}
  }

  @media(max-width:390px){
    #diniPostOpenWelcome .dw3-card{width:min(94vw,390px);min-height:168px}
    #diniPostOpenWelcome .dw3-gunungan{height:42px}
  }
  @media(prefers-reduced-motion:reduce){
    #diniPostOpenWelcome,#diniPostOpenWelcome .dw3-card{transition:none!important;transform:none!important}
    #diniPostOpenWelcome .dw3-panel{animation:none!important;opacity:1!important;transform:none!important}
    #diniPostOpenWelcome .dw3-seed,#diniPostOpenWelcome .dw3-outer,#diniPostOpenWelcome .dw3-inner{
      animation:none!important;stroke-dashoffset:0!important
    }
    #diniPostOpenWelcome .dw3-gunungan,#diniPostOpenWelcome .dw3-hello,
    #diniPostOpenWelcome .dw3-sub,#diniPostOpenWelcome .dw3-couple{
      animation:none!important;opacity:1!important;transform:none!important
    }
  }`;

  (document.head||document.documentElement).appendChild(st);
  document.body.appendChild(ov);
  return ov;
}

function show(){
  const ov=build();
  root.setAttribute('data-dini-post-open-welcome-triggered',VERSION);
  ov.setAttribute('data-state','in');
  ov.setAttribute('aria-hidden','false');

  setTimeout(()=>{
    if(!ov.isConnected)return;
    ov.setAttribute('data-state','hold');

    setTimeout(()=>{
      if(!ov.isConnected)return;
      ov.setAttribute('data-state','out');
      ov.setAttribute('aria-hidden','true');

      setTimeout(()=>{
        try{ov.remove()}catch{}
        document.getElementById('dini-post-open-welcome-v3-style')?.remove?.();
        root.setAttribute('data-dini-post-open-welcome-complete',VERSION);
      },exitMs+80);
    },holdMs);
  },enterMs);
}

function trigger(){
  if(fired)return;
  fired=true;
  root.setAttribute('data-dini-post-open-welcome-pending',String(delayMs));
  setTimeout(show,delayMs);
}

document.addEventListener('click',e=>{
  if(e.target?.closest?.('#tombolbuka,.tombolbuka'))trigger();
},true);

window.DINI_POST_OPEN_WELCOME_V3={
  VERSION,trigger,
  get fired(){return fired},
  get mode(){return mode},
  get guestName(){return guestName},
  get delayMs(){return delayMs},
  get holdMs(){return holdMs}
};
})();