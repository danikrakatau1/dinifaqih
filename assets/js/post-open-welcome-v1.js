(()=>{
  'use strict';
  if(window.__DINI_POST_OPEN_WELCOME_V1__)return;
  window.__DINI_POST_OPEN_WELCOME_V1__=true;

  const VERSION='1.0.0';
  const root=document.documentElement;
  const cfgEl=document.getElementById('diniPostOpenWelcomeConfig');
  let cfg={};
  try{cfg=cfgEl?JSON.parse(cfgEl.textContent||'{}'):{} }catch{}

  const sanitize=v=>String(v||'')
    .replace(/[\u0000-\u001f\u007f]/g,' ')
    .replace(/\s+/g,' ')
    .trim()
    .slice(0,120);

  const mode=cfg.mode==='guest'?'guest':'public';
  const guestName=mode==='guest'?sanitize(cfg.guestName||''):'';
  const delayMs=Math.max(0,Number(cfg.delayMs)||1500);
  const holdMs=Math.max(300,Number(cfg.holdMs)||1500);
  const enterMs=520;
  const exitMs=560;

  let fired=false;
  let overlay=null;

  const usableColor=value=>{
    const v=String(value||'').trim();
    return v&&v!=='transparent'&&v!=='rgba(0, 0, 0, 0)'?v:'';
  };

  function firstUsable(selectors){
    for(const sel of selectors){
      let nodes=[];
      try{nodes=[...document.querySelectorAll(sel)]}catch{}
      for(const node of nodes){
        try{
          const cs=getComputedStyle(node);
          if(cs.display==='none'||cs.visibility==='hidden')continue;
          return {node,cs};
        }catch{}
      }
    }
    return null;
  }

  function globalTokens(){
    const display=firstUsable([
      '#cover .elementor-heading-title',
      '#cover h1','#cover h2','#cover h3',
      '.elementor-heading-title','h1','h2','h3'
    ]);
    const body=firstUsable([
      '#cover .elementor-widget-text-editor',
      '#cover p',
      '.elementor-widget-text-editor','p','body'
    ]);

    const d=display?.cs;
    const b=body?.cs;
    const bodyCs=getComputedStyle(document.body);

    return {
      displayFont:String(d?.fontFamily||bodyCs.fontFamily||'inherit'),
      bodyFont:String(b?.fontFamily||bodyCs.fontFamily||d?.fontFamily||'inherit'),
      color:usableColor(d?.color)||usableColor(b?.color)||usableColor(bodyCs.color)||'currentColor',
      bodyColor:usableColor(b?.color)||usableColor(d?.color)||usableColor(bodyCs.color)||'currentColor',
      displayWeight:String(d?.fontWeight||'600'),
      letterSpacing:String(d?.letterSpacing||'normal')
    };
  }

  const cornerSvg=()=>`
    <svg class="dini-welcome-corner" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path d="M4 58V19C4 10.7 10.7 4 19 4h39" />
      <path d="M9 46c8-2 14-8 16-16 2 8 8 14 16 16-8 2-14 8-16 16-2-8-8-14-16-16Z" class="dini-welcome-leaf" />
      <path d="M14 34c6-1 10-5 11-11 1 6 5 10 11 11" />
      <path d="M29 18c3-5 8-8 14-9M18 29c-5 3-8 8-9 14" />
      <circle cx="25" cy="25" r="2.2" class="dini-welcome-dot" />
    </svg>`;

  function build(){
    if(overlay?.isConnected)return overlay;

    const tokens=globalTokens();
    overlay=document.createElement('div');
    overlay.id='diniPostOpenWelcome';
    overlay.setAttribute('aria-hidden','true');
    overlay.setAttribute('data-dini-post-open-welcome',VERSION);
    overlay.innerHTML=`
      <div class="dini-welcome-frame" role="presentation">
        <span class="dini-welcome-corner-wrap tl">${cornerSvg()}</span>
        <span class="dini-welcome-corner-wrap tr">${cornerSvg()}</span>
        <span class="dini-welcome-corner-wrap br">${cornerSvg()}</span>
        <span class="dini-welcome-corner-wrap bl">${cornerSvg()}</span>
        <div class="dini-welcome-copy">
          <div class="dini-welcome-hello"></div>
          <div class="dini-welcome-subtitle">Selamat Datang Di Undangan Pernikahan</div>
          <div class="dini-welcome-couple">DINI &amp; FAQIH</div>
        </div>
      </div>`;

    overlay.querySelector('.dini-welcome-hello').textContent=guestName?'Halo '+guestName:'Halo';

    const style=document.createElement('style');
    style.id='dini-post-open-welcome-style';
    style.textContent=`
      #diniPostOpenWelcome{
        --dini-welcome-display-font:${tokens.displayFont};
        --dini-welcome-body-font:${tokens.bodyFont};
        --dini-welcome-color:${tokens.color};
        --dini-welcome-body-color:${tokens.bodyColor};
        position:fixed;
        inset:0;
        z-index:2147482000;
        display:grid;
        place-items:center;
        box-sizing:border-box;
        padding:clamp(18px,5vw,28px);
        pointer-events:none;
        opacity:0;
        visibility:hidden;
        color:var(--dini-welcome-color);
        transition:opacity ${exitMs}ms cubic-bezier(.22,1,.36,1),visibility 0s linear ${exitMs}ms;
      }
      #diniPostOpenWelcome[data-state="enter"],
      #diniPostOpenWelcome[data-state="hold"]{
        opacity:1;
        visibility:visible;
        transition:opacity ${enterMs}ms cubic-bezier(.22,1,.36,1),visibility 0s linear 0s;
      }
      #diniPostOpenWelcome .dini-welcome-frame{
        position:relative;
        width:min(86vw,390px);
        min-height:220px;
        box-sizing:border-box;
        display:grid;
        place-items:center;
        padding:clamp(42px,10vw,58px) clamp(25px,7vw,42px);
        text-align:center;
        color:var(--dini-welcome-color);
        border:1px solid color-mix(in srgb,currentColor 48%,transparent);
        background:color-mix(in srgb,transparent 94%,currentColor 6%);
        -webkit-backdrop-filter:blur(1.5px) saturate(1.03);
        backdrop-filter:blur(1.5px) saturate(1.03);
        opacity:0;
        transform:translate3d(0,16px,0) scale(.985);
        transition:
          opacity ${enterMs}ms cubic-bezier(.22,1,.36,1),
          transform ${enterMs}ms cubic-bezier(.22,1,.36,1);
        will-change:opacity,transform;
      }
      #diniPostOpenWelcome .dini-welcome-frame::before{
        content:"";
        position:absolute;
        inset:9px;
        border:1px solid color-mix(in srgb,currentColor 34%,transparent);
        pointer-events:none;
      }
      #diniPostOpenWelcome[data-state="enter"] .dini-welcome-frame,
      #diniPostOpenWelcome[data-state="hold"] .dini-welcome-frame{
        opacity:1;
        transform:translate3d(0,0,0) scale(1);
      }
      #diniPostOpenWelcome[data-state="exit"] .dini-welcome-frame{
        opacity:0;
        transform:translate3d(0,-10px,0) scale(.992);
        transition:
          opacity ${exitMs}ms cubic-bezier(.4,0,.2,1),
          transform ${exitMs}ms cubic-bezier(.4,0,.2,1);
      }
      #diniPostOpenWelcome .dini-welcome-copy{
        position:relative;
        z-index:2;
        display:grid;
        gap:10px;
        width:100%;
      }
      #diniPostOpenWelcome .dini-welcome-hello{
        font-family:var(--dini-welcome-body-font);
        color:var(--dini-welcome-body-color);
        font-size:clamp(15px,4vw,18px);
        line-height:1.35;
        font-weight:500;
        opacity:0;
        transform:translateY(8px);
      }
      #diniPostOpenWelcome .dini-welcome-subtitle{
        font-family:var(--dini-welcome-body-font);
        color:var(--dini-welcome-body-color);
        font-size:clamp(13px,3.5vw,16px);
        line-height:1.55;
        font-weight:400;
        opacity:0;
        transform:translateY(9px);
      }
      #diniPostOpenWelcome .dini-welcome-couple{
        margin-top:2px;
        font-family:var(--dini-welcome-display-font);
        color:var(--dini-welcome-color);
        font-size:clamp(25px,7vw,34px);
        line-height:1.12;
        font-weight:${tokens.displayWeight};
        letter-spacing:${tokens.letterSpacing};
        opacity:0;
        transform:translateY(10px);
      }
      #diniPostOpenWelcome[data-state="enter"] .dini-welcome-hello,
      #diniPostOpenWelcome[data-state="hold"] .dini-welcome-hello{
        animation:diniWelcomeLineIn 460ms 40ms cubic-bezier(.22,1,.36,1) both;
      }
      #diniPostOpenWelcome[data-state="enter"] .dini-welcome-subtitle,
      #diniPostOpenWelcome[data-state="hold"] .dini-welcome-subtitle{
        animation:diniWelcomeLineIn 480ms 130ms cubic-bezier(.22,1,.36,1) both;
      }
      #diniPostOpenWelcome[data-state="enter"] .dini-welcome-couple,
      #diniPostOpenWelcome[data-state="hold"] .dini-welcome-couple{
        animation:diniWelcomeLineIn 520ms 230ms cubic-bezier(.22,1,.36,1) both;
      }
      @keyframes diniWelcomeLineIn{
        from{opacity:0;transform:translateY(10px)}
        to{opacity:1;transform:translateY(0)}
      }
      #diniPostOpenWelcome .dini-welcome-corner-wrap{
        position:absolute;
        width:44px;
        height:44px;
        color:currentColor;
        opacity:.74;
        z-index:3;
      }
      #diniPostOpenWelcome .dini-welcome-corner-wrap.tl{left:2px;top:2px}
      #diniPostOpenWelcome .dini-welcome-corner-wrap.tr{right:2px;top:2px;transform:rotate(90deg)}
      #diniPostOpenWelcome .dini-welcome-corner-wrap.br{right:2px;bottom:2px;transform:rotate(180deg)}
      #diniPostOpenWelcome .dini-welcome-corner-wrap.bl{left:2px;bottom:2px;transform:rotate(270deg)}
      #diniPostOpenWelcome .dini-welcome-corner{
        width:100%;
        height:100%;
        display:block;
        overflow:visible;
        fill:none;
        stroke:currentColor;
        stroke-width:1.35;
        stroke-linecap:round;
        stroke-linejoin:round;
      }
      #diniPostOpenWelcome .dini-welcome-leaf{
        fill:currentColor;
        fill-opacity:.08;
      }
      #diniPostOpenWelcome .dini-welcome-dot{
        fill:currentColor;
        stroke:none;
        opacity:.72;
      }
      @media(max-width:420px){
        #diniPostOpenWelcome .dini-welcome-frame{
          width:min(88vw,360px);
          min-height:210px;
        }
        #diniPostOpenWelcome .dini-welcome-corner-wrap{
          width:40px;
          height:40px;
        }
      }
      @media(prefers-reduced-motion:reduce){
        #diniPostOpenWelcome,
        #diniPostOpenWelcome .dini-welcome-frame,
        #diniPostOpenWelcome .dini-welcome-hello,
        #diniPostOpenWelcome .dini-welcome-subtitle,
        #diniPostOpenWelcome .dini-welcome-couple{
          animation:none!important;
          transition:none!important;
          transform:none!important;
        }
        #diniPostOpenWelcome[data-state="enter"],
        #diniPostOpenWelcome[data-state="hold"]{opacity:1;visibility:visible}
        #diniPostOpenWelcome[data-state="enter"] .dini-welcome-frame,
        #diniPostOpenWelcome[data-state="hold"] .dini-welcome-frame,
        #diniPostOpenWelcome[data-state="enter"] .dini-welcome-hello,
        #diniPostOpenWelcome[data-state="hold"] .dini-welcome-hello,
        #diniPostOpenWelcome[data-state="enter"] .dini-welcome-subtitle,
        #diniPostOpenWelcome[data-state="hold"] .dini-welcome-subtitle,
        #diniPostOpenWelcome[data-state="enter"] .dini-welcome-couple,
        #diniPostOpenWelcome[data-state="hold"] .dini-welcome-couple{opacity:1}
      }
    `;

    (document.head||document.documentElement).appendChild(style);
    document.body.appendChild(overlay);
    return overlay;
  }

  function show(){
    const el=build();
    if(!el)return;

    root.setAttribute('data-dini-post-open-welcome-triggered',VERSION);
    el.setAttribute('data-state','enter');
    el.setAttribute('aria-hidden','false');

    setTimeout(()=>{
      if(!el.isConnected)return;
      el.setAttribute('data-state','hold');

      setTimeout(()=>{
        if(!el.isConnected)return;
        el.setAttribute('data-state','exit');
        el.setAttribute('aria-hidden','true');

        setTimeout(()=>{
          try{el.remove()}catch{}
          document.getElementById('dini-post-open-welcome-style')?.remove?.();
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

  document.addEventListener('click',event=>{
    const target=event.target?.closest?.('#tombolbuka,.tombolbuka');
    if(target)trigger();
  },true);

  window.DINI_POST_OPEN_WELCOME_V1={
    VERSION,
    trigger,
    get fired(){return fired},
    get guestName(){return guestName},
    get mode(){return mode}
  };
})();