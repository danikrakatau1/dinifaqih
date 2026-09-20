(()=>{
'use strict';
if(window.__DINI_POST_OPEN_WELCOME_V2__)return;
window.__DINI_POST_OPEN_WELCOME_V2__=true;

const VERSION='2.0.0';
const root=document.documentElement;
let cfg={};
try{cfg=JSON.parse(document.getElementById('diniPostOpenWelcomeConfig')?.textContent||'{}')}catch{}
const mode=cfg.mode==='guest'?'guest':'public';
const guestName=mode==='guest'?String(cfg.guestName||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,120):'';
const delayMs=Number(cfg.delayMs)||1500;
const holdMs=Number(cfg.holdMs)||1500;
let fired=false;

function pick(sel,fallback){
  for(const s of sel){
    const el=document.querySelector(s);
    if(!el)continue;
    try{
      const v=getComputedStyle(el);
      if(v&&v[fallback])return v[fallback];
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
    const found=[...document.images].map(x=>String(x.currentSrc||x.src||'')).find(x=>/\/download\.png(?:$|[?#])/i.test(x));
    if(found)return found;
  }catch{}
  return 'https://web.galeriundanganofficial.com/wp-content/uploads/2026/03/download.png';
}

function build(){
  const t=tokens();
  const ov=document.createElement('div');
  ov.id='diniPostOpenWelcome';
  ov.setAttribute('aria-hidden','true');
  ov.innerHTML=`
    <div class="dw2-card">
      <svg class="dw2-frame" viewBox="0 0 1000 430" preserveAspectRatio="none" aria-hidden="true">
        <path class="dw2-panel" d="M94 42 Q500 -8 906 42 L906 74 L950 74 L950 356 L906 356 L906 388 Q500 438 94 388 L94 356 L50 356 L50 74 L94 74 Z"/>
        <path class="dw2-outer" pathLength="1" d="M94 42 Q500 -8 906 42 L906 74 L950 74 L950 356 L906 356 L906 388 Q500 438 94 388 L94 356 L50 356 L50 74 L94 74 Z"/>
        <path class="dw2-inner" pathLength="1" d="M116 59 Q500 13 884 59 L884 91 L929 91 L929 339 L884 339 L884 371 Q500 415 116 371 L116 339 L71 339 L71 91 L116 91 Z"/>
      </svg>
      <div class="dw2-content">
        <img class="dw2-gunungan" src="${gunungan()}" alt="" aria-hidden="true">
        <div class="dw2-hello"></div>
        <div class="dw2-sub">Selamat Datang Di Undangan Pernikahan</div>
        <div class="dw2-couple">DINI &amp; FAQIH</div>
      </div>
    </div>`;
  ov.querySelector('.dw2-hello').textContent=guestName?'Halo '+guestName:'Halo';

  const st=document.createElement('style');
  st.id='dini-post-open-welcome-v2-style';
  st.textContent=`
  #diniPostOpenWelcome{
    --dw2-display:${t.displayFont};
    --dw2-body:${t.bodyFont};
    --dw2-color:${t.color};
    --dw2-body-color:${t.bodyColor};
    position:fixed;inset:0;z-index:2147482000;display:grid;place-items:center;
    padding:16px;box-sizing:border-box;pointer-events:none;color:var(--dw2-color);
    opacity:0;visibility:hidden;transition:opacity .48s ease,visibility 0s linear .48s
  }
  #diniPostOpenWelcome[data-state="in"],
  #diniPostOpenWelcome[data-state="hold"]{opacity:1;visibility:visible;transition:opacity .18s linear}
  #diniPostOpenWelcome .dw2-card{
    position:relative;width:min(92vw,410px);aspect-ratio:1000/430;min-height:176px;
    opacity:0;transform:translateY(14px) scale(.988);
    transition:opacity .42s cubic-bezier(.22,1,.36,1),transform .56s cubic-bezier(.22,1,.36,1)
  }
  #diniPostOpenWelcome[data-state="in"] .dw2-card,
  #diniPostOpenWelcome[data-state="hold"] .dw2-card{opacity:1;transform:none}
  #diniPostOpenWelcome[data-state="out"] .dw2-card{opacity:0;transform:translateY(-8px) scale(.994)}
  #diniPostOpenWelcome .dw2-frame{position:absolute;inset:0;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 10px 22px rgba(58,42,24,.08))}
  #diniPostOpenWelcome .dw2-panel{fill:rgba(250,247,237,.76);stroke:none}
  #diniPostOpenWelcome .dw2-outer,
  #diniPostOpenWelcome .dw2-inner{
    fill:none;stroke:currentColor;vector-effect:non-scaling-stroke;stroke-linecap:round;stroke-linejoin:round;
    stroke-dasharray:1;stroke-dashoffset:1
  }
  #diniPostOpenWelcome .dw2-outer{stroke-width:1.65;opacity:.84}
  #diniPostOpenWelcome .dw2-inner{stroke-width:.9;opacity:.46}
  #diniPostOpenWelcome[data-state="in"] .dw2-outer,
  #diniPostOpenWelcome[data-state="hold"] .dw2-outer{animation:dw2trace .62s .05s cubic-bezier(.22,1,.36,1) forwards}
  #diniPostOpenWelcome[data-state="in"] .dw2-inner,
  #diniPostOpenWelcome[data-state="hold"] .dw2-inner{animation:dw2traceInner .56s .30s cubic-bezier(.22,1,.36,1) forwards}
  @keyframes dw2trace{to{stroke-dashoffset:0}}
  @keyframes dw2traceInner{from{stroke-dashoffset:1;opacity:0}to{stroke-dashoffset:0;opacity:.46}}
  #diniPostOpenWelcome .dw2-content{
    position:absolute;inset:8% 8.5% 9%;display:grid;place-items:center;align-content:center;gap:3px;text-align:center
  }
  #diniPostOpenWelcome .dw2-gunungan{
    height:clamp(42px,11vw,56px);width:auto;max-width:62px;object-fit:contain;margin-bottom:0;
    opacity:0;transform:translateY(7px) scale(.94)
  }
  #diniPostOpenWelcome .dw2-hello{font-family:var(--dw2-body);color:var(--dw2-body-color);font-size:clamp(14px,3.7vw,17px);line-height:1.25;font-weight:500;opacity:0;transform:translateY(8px)}
  #diniPostOpenWelcome .dw2-sub{font-family:var(--dw2-body);color:var(--dw2-body-color);font-size:clamp(11px,3vw,14px);line-height:1.4;font-weight:400;max-width:88%;opacity:0;transform:translateY(8px)}
  #diniPostOpenWelcome .dw2-couple{font-family:var(--dw2-display);color:var(--dw2-color);font-size:clamp(21px,6.4vw,31px);line-height:1.07;font-weight:${t.displayWeight};opacity:0;transform:translateY(9px)}
  #diniPostOpenWelcome[data-state="in"] .dw2-gunungan,
  #diniPostOpenWelcome[data-state="hold"] .dw2-gunungan{animation:dw2orn .48s .36s cubic-bezier(.22,1,.36,1) both}
  #diniPostOpenWelcome[data-state="in"] .dw2-hello,
  #diniPostOpenWelcome[data-state="hold"] .dw2-hello{animation:dw2line .42s .43s cubic-bezier(.22,1,.36,1) both}
  #diniPostOpenWelcome[data-state="in"] .dw2-sub,
  #diniPostOpenWelcome[data-state="hold"] .dw2-sub{animation:dw2line .44s .51s cubic-bezier(.22,1,.36,1) both}
  #diniPostOpenWelcome[data-state="in"] .dw2-couple,
  #diniPostOpenWelcome[data-state="hold"] .dw2-couple{animation:dw2line .48s .59s cubic-bezier(.22,1,.36,1) both}
  @keyframes dw2orn{to{opacity:1;transform:none}}
  @keyframes dw2line{to{opacity:1;transform:none}}
  @media(max-width:390px){
    #diniPostOpenWelcome .dw2-card{width:min(94vw,390px);min-height:168px}
    #diniPostOpenWelcome .dw2-gunungan{height:42px}
  }
  @media(prefers-reduced-motion:reduce){
    #diniPostOpenWelcome,#diniPostOpenWelcome .dw2-card{transition:none!important;transform:none!important}
    #diniPostOpenWelcome .dw2-outer,#diniPostOpenWelcome .dw2-inner{animation:none!important;stroke-dashoffset:0!important}
    #diniPostOpenWelcome .dw2-gunungan,#diniPostOpenWelcome .dw2-hello,#diniPostOpenWelcome .dw2-sub,#diniPostOpenWelcome .dw2-couple{animation:none!important;opacity:1!important;transform:none!important}
  }`;
  (document.head||document.documentElement).appendChild(st);
  document.body.appendChild(ov);
  return ov;
}

function show(){
  const ov=build();
  root.setAttribute('data-dini-post-open-welcome-triggered',VERSION);
  ov.setAttribute('data-state','in');ov.setAttribute('aria-hidden','false');
  setTimeout(()=>{
    if(!ov.isConnected)return;
    ov.setAttribute('data-state','hold');
    setTimeout(()=>{
      if(!ov.isConnected)return;
      ov.setAttribute('data-state','out');ov.setAttribute('aria-hidden','true');
      setTimeout(()=>{try{ov.remove()}catch{};document.getElementById('dini-post-open-welcome-v2-style')?.remove?.();root.setAttribute('data-dini-post-open-welcome-complete',VERSION)},620);
    },holdMs);
  },720);
}
function trigger(){
  if(fired)return;
  fired=true;
  root.setAttribute('data-dini-post-open-welcome-pending',String(delayMs));
  setTimeout(show,delayMs);
}
document.addEventListener('click',e=>{if(e.target?.closest?.('#tombolbuka,.tombolbuka'))trigger()},true);
window.DINI_POST_OPEN_WELCOME_V2={VERSION,trigger,get fired(){return fired},get mode(){return mode},get guestName(){return guestName}};
})();