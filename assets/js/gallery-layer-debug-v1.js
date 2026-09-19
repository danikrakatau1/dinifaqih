(()=>{
  'use strict';
  if(window.DINI_GALLERY_LAYER_DEBUG_V1)return;
  const doc=document;
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();

  function bg(el){
    let cs=null;
    try{cs=getComputedStyle(el)}catch{}
    if(!cs)return{};
    return{
      color:clean(cs.backgroundColor),
      image:clean(cs.backgroundImage),
      display:clean(cs.display),
      position:clean(cs.position),
      overflow:clean(cs.overflow)
    };
  }

  function idOf(el){
    return el?.getAttribute?.('data-id')||el?.id||'—';
  }

  function row(level,el){
    const st=bg(el);
    let rect={width:0,height:0};
    try{rect=el.getBoundingClientRect()}catch{}
    return {
      level,
      tag:el?.tagName||'?',
      id:idOf(el),
      cls:clean(el?.className).slice(0,90),
      color:st.color||'—',
      image:st.image&&st.image!=='none'?'YES':'none',
      size:Math.round(rect.width)+'×'+Math.round(rect.height),
      pos:st.position||'—',
      ov:st.overflow||'—'
    };
  }

  function build(){
    if(doc.getElementById('diniGalleryLayerDebug'))return true;

    const widget=doc.querySelector('.elementor-widget-gallery');
    if(!widget)return false;

    const rows=[];
    let el=widget;
    for(let i=0;i<10&&el;i++,el=el.parentElement){
      rows.push(row(i,el));
    }

    const panel=doc.createElement('div');
    panel.id='diniGalleryLayerDebug';
    panel.setAttribute('data-dini-gallery-debug','1');
    panel.style.cssText=[
      'position:fixed','left:6px','right:6px','bottom:6px','z-index:2147483647',
      'max-height:42vh','overflow:auto','padding:8px','border-radius:8px',
      'background:rgba(0,0,0,.88)','color:#fff','font:10px/1.35 monospace',
      'box-shadow:0 8px 24px rgba(0,0,0,.35)','pointer-events:none'
    ].join(';');

    const title=doc.createElement('div');
    title.textContent='DEBUG Gallery Layer — screenshot bagian ini';
    title.style.cssText='font-weight:700;font-size:11px;margin-bottom:5px';
    panel.appendChild(title);

    rows.forEach(r=>{
      const line=doc.createElement('div');
      line.textContent=
        'L'+r.level+' '+r.tag+' ['+r.id+'] '+r.size+
        ' bg='+r.color+' img='+r.image+
        ' pos='+r.pos+' ov='+r.ov+
        ' :: '+r.cls;
      line.style.cssText='padding:2px 0;border-top:1px solid rgba(255,255,255,.12)';
      panel.appendChild(line);
    });

    doc.body.appendChild(panel);
    doc.documentElement.setAttribute('data-dini-gallery-debug','1');
    return true;
  }

  function boot(){
    if(build())return;
    let n=0;
    const t=setInterval(()=>{n++;if(build()||n>=40)clearInterval(t)},250);
  }

  window.DINI_GALLERY_LAYER_DEBUG_V1={version:'1.0.0',build};
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();