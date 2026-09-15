(()=>{
  'use strict';
  if(window.__DINI_FETCH_STABILITY_2100__)return;
  window.__DINI_FETCH_STABILITY_2100__=true;
  const VERSION='2.1.0';
  const frame=document.getElementById('previewFrame')||document.getElementById('cleanFrame');
  const cleanBtn=document.getElementById('cleanPreviewBtn');
  const params=new URLSearchParams(location.search),handoff=(params.get('handoff')||'').trim();
  const CLEAN='/dashboard-admin-fetch-editor-preview-bersih/?mode=fetch&handoff='+encodeURIComponent(handoff);
  const iconCssCache=new Map();
  const preservedUrls=new Set();
  let uploadArm={id:'',until:0};

  function ensureToast(){
    let host=document.getElementById('fetchV21ToastHost');
    if(host)return host;
    const st=document.createElement('style');
    st.textContent='#fetchV21ToastHost{position:fixed;z-index:999999;right:18px;top:18px;display:grid;gap:10px;max-width:min(400px,calc(100vw - 36px))}.fetch-v21-toast{background:#11151d;color:#f7f8fa;border:1px solid rgba(255,255,255,.14);box-shadow:0 16px 48px rgba(0,0,0,.42);border-radius:14px;padding:12px 14px;opacity:0;transform:translateY(-8px);transition:.22s ease}.fetch-v21-toast.show{opacity:1;transform:none}.fetch-v21-toast.success{border-color:rgba(73,190,124,.6)}.fetch-v21-toast.error{border-color:rgba(235,85,85,.7)}.fetch-v21-toast strong{display:block;font-size:13px;margin-bottom:3px}.fetch-v21-toast small{display:block;color:#c5cad3;line-height:1.45}';
    document.head.appendChild(st);host=document.createElement('div');host.id='fetchV21ToastHost';document.body.appendChild(host);return host;
  }
  window.editorToast=(message,type='info',title='')=>{
    const host=ensureToast(),el=document.createElement('div');el.className='fetch-v21-toast '+type;
    el.innerHTML='<strong>'+(title|| (type==='success'?'APPLY BERHASIL ✅':type==='error'?'APPLY GAGAL ❌':'Info'))+'</strong><small></small>';
    el.querySelector('small').textContent=String(message||'');host.appendChild(el);requestAnimationFrame(()=>el.classList.add('show'));
    setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),250)},4400);return el;
  };

  function sanitize(doc){
    if(!doc)return;
    doc.querySelectorAll('#wpcp-error-message,.msgmsg-box-wpcp,[id^="wpcp-"]').forEach(n=>n.remove());
    doc.querySelectorAll('script').forEach(s=>{const id=String(s.id||''),txt=String(s.textContent||''),src=String(s.src||'');if(/^wpcp_/i.test(id)||/Content is protected|show_wpcp_message|wccp_free_|disable_copy|disableEnterKey/i.test(txt)||/wpcp|wp-content-copy-protector/i.test(src))s.remove()});
    doc.querySelectorAll('style').forEach(st=>{const t=String(st.textContent||'');if(/#wpcp-error-message|msgmsg-box-wpcp/i.test(t)||(/\.unselectable/i.test(t)&&/user-select\s*:\s*none/i.test(t))||/You are not allowed to print preview/i.test(t))st.remove()});
    doc.body?.removeAttribute('unselectable');doc.querySelectorAll('.unselectable').forEach(n=>n.classList.remove('unselectable'));
    try{doc.onkeydown=null;doc.onmousedown=null;doc.onselectstart=null;doc.oncontextmenu=null;doc.ondragstart=null}catch{}
  }

  function proxyCssUrls(css,cssUrl){
    return String(css||'').replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/ig,(m,q,u)=>{const raw=String(u||'').trim();if(!raw||/^(?:data:|blob:|#)/i.test(raw))return m;let abs=raw;try{abs=new URL(raw,cssUrl).href}catch{}return 'url("'+location.origin+'/api/fetch-asset?url='+encodeURIComponent(abs)+'&offset=0&size=5000000")'});
  }
  async function injectIconCss(doc){
    if(!doc)return;
    const links=[...doc.querySelectorAll('link[rel~="stylesheet"][href]')].map(l=>l.href||l.getAttribute('href')).filter(u=>/font-?awesome|\/eicons\/|ep-font\.css|widget-social-icons/i.test(String(u||'')));
    let i=0;
    for(const url of [...new Set(links)]){
      try{
        let css=iconCssCache.get(url);
        if(!css){const r=await fetch('/api/fetch-asset?url='+encodeURIComponent(url)+'&offset=0&size=2000000',{cache:'no-store'});if(!r.ok)continue;css=proxyCssUrls(await r.text(),url);iconCssCache.set(url,css)}
        if(doc.querySelector('style[data-fetch-v21-icon="'+i+'"]')){i++;continue}
        const st=doc.createElement('style');st.setAttribute('data-fetch-v21-icon',String(i++));st.setAttribute('data-source-css',url);st.textContent=css;doc.head.appendChild(st);
      }catch(e){console.warn('FETCH_V21_ICON_CSS',url,e)}
    }
  }
  async function stabilizeFrame(){
    try{const doc=frame?.contentDocument;if(!doc)return;sanitize(doc);await injectIconCss(doc);sanitize(doc);document.documentElement.dataset.fetchStability=VERSION}catch(e){console.warn('FETCH_V21_STABILIZE',e)}
  }

  function selectedField(){return document.querySelector('.editor-field.active')?.dataset?.fieldId||''}
  function copyFieldFromIncoming(id,html){
    if(!frame?.contentDocument||!id)return false;
    const incoming=new DOMParser().parseFromString(String(html||''),'text/html'),cur=frame.contentDocument;
    const sel='[data-native-edit-id="'+CSS.escape(id)+'"],[data-native-edit-ids~="'+CSS.escape(id)+'"]';
    const a=incoming.querySelector(sel),b=cur.querySelector(sel);if(!a||!b)return false;
    const ai=a.matches('img')?a:a.querySelector('img'),bi=b.matches('img')?b:b.querySelector('img');
    if(ai&&bi){for(const k of ['src','data-src','srcset','data-srcset','style']){if(ai.hasAttribute(k))bi.setAttribute(k,ai.getAttribute(k));else bi.removeAttribute(k)}return true}
    for(const k of ['style','data-settings','data-native-slideshow-urls','src']){if(a.hasAttribute(k))b.setAttribute(k,a.getAttribute(k));else if(k!=='style')b.removeAttribute(k)}
    return true;
  }

  if(frame&&frame.id==='previewFrame'){
    const desc=Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype,'srcdoc');
    if(desc?.set&&desc?.get){
      Object.defineProperty(frame,'srcdoc',{configurable:true,get(){return desc.get.call(this)},set(v){
        const armed=uploadArm.id&&Date.now()<uploadArm.until;
        if(armed&&copyFieldFromIncoming(uploadArm.id,v)){
          uploadArm={id:'',until:0};stabilizeFrame();return;
        }
        uploadArm={id:'',until:0};desc.set.call(this,v);
      }});
    }
    const originalRevoke=URL.revokeObjectURL.bind(URL);
    URL.revokeObjectURL=u=>{if(uploadArm.id&&Date.now()<uploadArm.until){preservedUrls.add(u);return}return originalRevoke(u)};
    document.addEventListener('click',e=>{if(e.target?.closest?.('#v2upload'))uploadArm={id:selectedField(),until:Date.now()+60000}},true);
    addEventListener('beforeunload',()=>{for(const u of preservedUrls)try{originalRevoke(u)}catch{}});
  }

  if(cleanBtn){cleanBtn.href=CLEAN;cleanBtn.addEventListener('click',e=>{cleanBtn.href=CLEAN},true)}
  frame?.addEventListener('load',()=>{setTimeout(stabilizeFrame,0);setTimeout(stabilizeFrame,350)});
  setTimeout(stabilizeFrame,80);setTimeout(stabilizeFrame,900);
})();
