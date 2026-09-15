(()=>{
  'use strict';
  if(window.__DINI_GLOBAL_COPY_FEEDBACK_V1__)return;
  window.__DINI_GLOBAL_COPY_FEEDBACK_V1__=true;
  const VERSION='1.1.0';
  const states=new WeakMap();
  const norm=v=>String(v||'').replace(/\s+/g,' ').trim();
  function isCopyControl(el){
    if(!el)return null;
    const control=el.closest?.('button,a,[role="button"],input[type="button"],input[type="submit"],[onclick]')||el;
    const text=norm(control.textContent||control.value||control.getAttribute?.('aria-label')||control.getAttribute?.('title'));
    if(!/\b(copy|salin|copykan|copikan)\b/i.test(text))return null;
    if(/rekening|nomor\s*rek|account/i.test(text))return {kind:'rekening',control};
    if(/alamat|address/i.test(text))return {kind:'alamat',control};
    return null;
  }
  function stateFor(doc){let s=states.get(doc);if(!s){s={timer:0,activeUntil:0,observer:null};states.set(doc,s)}return s}
  function ensureStyle(doc){
    if(!doc?.documentElement||doc.getElementById('diniGlobalCopyFeedbackStyle'))return;
    const s=doc.createElement('style');s.id='diniGlobalCopyFeedbackStyle';s.textContent=`
#diniGlobalCopyToast{position:fixed;left:50%;bottom:max(20px,calc(env(safe-area-inset-bottom,0px) + 14px));z-index:2147483600;transform:translate(-50%,18px) scale(.98);opacity:0;pointer-events:none;min-width:min(320px,calc(100vw - 32px));max-width:min(440px,calc(100vw - 32px));box-sizing:border-box;padding:13px 17px;border:1px solid rgba(255,255,255,.12);border-radius:18px;background:rgba(24,27,31,.94);color:#fff;font:600 13px/1.35 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.01em;text-align:center;box-shadow:0 18px 50px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.06);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);transition:opacity .22s ease,transform .28s cubic-bezier(.2,.8,.2,1)}
#diniGlobalCopyToast[data-show="1"]{opacity:1;transform:translate(-50%,0) scale(1)}
#diniGlobalCopyToast .dini-copy-check{display:inline-grid;place-items:center;width:18px;height:18px;margin-left:6px;border-radius:50%;background:rgba(69,201,123,.16);color:#73e3a2;font-size:12px;vertical-align:-2px}
[data-dini-native-copy-hidden="1"]{display:none!important}
@media (prefers-reduced-motion:reduce){#diniGlobalCopyToast{transition:none}}
`;
    (doc.head||doc.documentElement).appendChild(s);
  }
  function toast(doc){
    ensureStyle(doc);
    let el=doc.getElementById('diniGlobalCopyToast');
    if(!el){el=doc.createElement('div');el.id='diniGlobalCopyToast';el.setAttribute('role','status');el.setAttribute('aria-live','polite');(doc.body||doc.documentElement).appendChild(el)}
    return el;
  }
  function show(doc,kind){
    const s=stateFor(doc),el=toast(doc),win=doc.defaultView||window;s.activeUntil=Date.now()+1800;
    el.innerHTML=(kind==='alamat'?'Alamat berhasil disalin':'Nomor rekening berhasil disalin')+' <span class="dini-copy-check">✓</span>';
    el.dataset.show='1';win.clearTimeout(s.timer);s.timer=win.setTimeout(()=>{el.dataset.show='0'},2200);
    doc.documentElement.dataset.globalCopyFeedback=VERSION;
  }
  function looksLikeNativeFeedback(doc,node){
    if(!node||node.nodeType!==1||node.id==='diniGlobalCopyToast'||node.closest?.('#diniGlobalCopyToast'))return false;
    const text=norm(node.textContent);
    if(!/(berhasil\s+(?:di\s*)?salin|berhasil\s+dicopy|copied|tersalin)/i.test(text))return false;
    const sig=norm(`${node.id||''} ${node.className||''} ${node.getAttribute?.('role')||''}`).toLowerCase();
    if(/toast|snack|alert|notice|popup|pop-up|swal|message|notification/.test(sig))return true;
    try{const cs=(doc.defaultView||window).getComputedStyle(node);return ['fixed','absolute'].includes(cs.position)&&Number(cs.zIndex||0)>10}catch{return false}
  }
  function install(doc){
    if(!doc?.documentElement||doc.documentElement.dataset.diniGlobalCopyInstalled==='1')return;
    doc.documentElement.dataset.diniGlobalCopyInstalled='1';ensureStyle(doc);
    const s=stateFor(doc),Win=doc.defaultView?.MutationObserver||MutationObserver;
    s.observer=new Win(list=>{
      if(Date.now()>s.activeUntil)return;
      for(const m of list){
        const candidates=[];if(m.target?.nodeType===1)candidates.push(m.target);
        for(const n of m.addedNodes||[])if(n.nodeType===1)candidates.push(n,...(n.querySelectorAll?.('*')||[]));
        for(const n of candidates)if(looksLikeNativeFeedback(doc,n))n.setAttribute('data-dini-native-copy-hidden','1');
      }
    });
    s.observer.observe(doc.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden','aria-hidden']});
    doc.addEventListener('click',e=>{const hit=isCopyControl(e.target);if(!hit)return;s.activeUntil=Date.now()+1800;(doc.defaultView||window).setTimeout(()=>show(doc,hit.kind),90)},true);
  }
  function attachFrame(frame){
    if(!frame||frame.dataset?.diniCopyBridge==='1')return;
    if(frame.dataset)frame.dataset.diniCopyBridge='1';
    const run=()=>{try{if(frame.contentDocument)install(frame.contentDocument)}catch{}};
    frame.addEventListener?.('load',()=>setTimeout(run,30));run();
  }
  function watchFrames(){
    document.querySelectorAll('iframe').forEach(attachFrame);
    const o=new MutationObserver(list=>{for(const m of list)for(const n of m.addedNodes||[])if(n.nodeType===1){if(n.tagName==='IFRAME')attachFrame(n);n.querySelectorAll?.('iframe').forEach(attachFrame)}});
    o.observe(document.documentElement,{subtree:true,childList:true});
  }
  function boot(){install(document);watchFrames()}
  window.DINI_GLOBAL_COPY_FEEDBACK={VERSION,install,attachFrame};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
