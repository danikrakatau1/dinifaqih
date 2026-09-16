const CSS = String.raw`
.actions .phase31{border-color:#315d72;background:#0e2029}.inspectorPanel{margin-top:16px}.inspectGrid{display:grid;grid-template-columns:1.35fr .65fr .65fr;gap:10px}.inspectCard{border:1px solid #232323;background:#101010;border-radius:14px;padding:12px}.inspectCard span{display:block;color:#777;font-size:10px;text-transform:uppercase;letter-spacing:.09em;margin-bottom:6px}.inspectCard code,.inspectCard b{display:block;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;overflow-wrap:anywhere}.inspectHint{margin:12px 0 0;color:#969696;line-height:1.55}.inspectState{font-size:11px;letter-spacing:.12em;color:#8a8a8a}.inspectState.on{color:#72e38e}.inspectState.ready{color:#78c8ff}@media(max-width:900px){.inspectGrid{grid-template-columns:1fr}}
`;

const PANEL = String.raw`
<section id="inspectorPanel" class="panel inspectorPanel"><div class="panelHead"><b>Phase 3.1 — Click-to-Edit Inspector</b><span id="inspectorState" class="inspectState">OFF</span></div><div class="panelBody"><div class="inspectGrid"><div class="inspectCard"><span>Selector terpilih</span><code id="inspectSelector">Belum ada elemen dipilih.</code></div><div class="inspectCard"><span>Element</span><b id="inspectElement">—</b></div><div class="inspectCard"><span>Matched</span><b id="inspectMatched">—</b></div></div><p id="inspectHint" class="inspectHint">Klik <b>Inspect Element</b>, lalu arahkan mouse ke Source-Native Render. Elemen akan diberi outline biru. Klik sekali untuk mengisi form Edit Delta otomatis. Inspector akan OFF otomatis setelah memilih agar interaksi undangan kembali normal.</p></div></section>
`;

const SCRIPT = String.raw`
(()=>{
  'use strict';
  const Q=s=>document.querySelector(s), frame=Q('#frame'), toggle=Q('#toggleInspector'), state=Q('#inspectorState');
  const outSelector=Q('#inspectSelector'),outElement=Q('#inspectElement'),outMatched=Q('#inspectMatched');
  const deltaType=Q('#deltaType'),deltaSelector=Q('#deltaSelector'),deltaKey=Q('#deltaKey'),deltaValue=Q('#deltaValue');
  if(!frame||!toggle)return;
  let active=false,boundDoc=null,overlay=null,cleanup=null,last=null;

  function notify(kind,title,text,auto=0){
    if(typeof popup==='function')return popup(kind,title,text,auto);
    console[kind==='error'?'error':'log']('[V3 Inspector]',title,text);
  }
  function frameDoc(){try{return frame.contentDocument||frame.contentWindow?.document||null}catch{return null}}
  function attrEscape(v){return String(v??'').replace(/\\/g,'\\\\').replace(/"/g,'\\"')}
  function cssEscape(v){try{return CSS.escape(String(v))}catch{return String(v).replace(/[^a-zA-Z0-9_-]/g,c=>'\\'+c)}}
  function unique(doc,selector,el){try{const all=doc.querySelectorAll(selector);return all.length===1&&all[0]===el}catch{return false}}
  function countMatches(doc,selector){try{return doc.querySelectorAll(selector).length}catch{return 0}}
  function staticClasses(el){
    const deny=/^(?:active|show|open|opened|hover|focus|selected|animated|elementor-invisible|swiper-slide-active|swiper-slide-next|swiper-slide-prev|aos-animate|is-active)$/i;
    return [...(el.classList||[])].filter(c=>c&&!deny.test(c)&&!/^e-con-inner$/.test(c)).slice(0,4);
  }
  function ownSelector(el,doc){
    if(el.id){const s='#'+cssEscape(el.id);if(unique(doc,s,el))return s}
    for(const name of ['data-native-edit-id','data-native-node-id','data-id']){
      const value=el.getAttribute?.(name);if(!value)continue;
      const s='['+name+'="'+attrEscape(value)+'"]';if(unique(doc,s,el))return s;
    }
    const cls=staticClasses(el);
    if(cls.length){const s='.'+cls.map(cssEscape).join('.');if(unique(doc,s,el))return s}
    const tag=(el.localName||'').toLowerCase();
    if(tag&&unique(doc,tag,el))return tag;
    return'';
  }
  function leafSelector(el){
    const tag=(el.localName||'').toLowerCase();const cls=staticClasses(el);
    if(cls.length)return(tag&&tag!=='div'&&tag!=='span'?tag:'')+'.'+cls.map(cssEscape).join('.');
    return tag||'*';
  }
  function selectorFor(el,doc){
    const direct=ownSelector(el,doc);if(direct)return direct;
    let anchor=el.parentElement;
    for(let depth=0;anchor&&anchor!==doc.body&&depth<6;depth++,anchor=anchor.parentElement){
      const a=ownSelector(anchor,doc);if(!a)continue;
      const leaf=leafSelector(el);const candidate=a+' '+leaf;if(unique(doc,candidate,el))return candidate;
    }
    const parts=[];let cur=el;
    for(let depth=0;cur&&cur.nodeType===1&&cur!==doc.documentElement&&depth<8;depth++,cur=cur.parentElement){
      let p=(cur.localName||'*').toLowerCase();
      const cls=staticClasses(cur);if(cls.length)p+='.'+cls.slice(0,2).map(cssEscape).join('.');
      const parent=cur.parentElement;
      if(parent){const same=[...parent.children].filter(x=>x.localName===cur.localName);if(same.length>1)p+=':nth-of-type('+(same.indexOf(cur)+1)+')'}
      parts.unshift(p);const candidate=parts.join(' > ');if(unique(doc,candidate,el))return candidate;
    }
    return parts.join(' > ');
  }
  function normalizeTarget(node){
    let el=node?.nodeType===1?node:node?.parentElement;if(!el)return null;
    if(el.matches?.('html,body'))return el;
    if(el.matches?.('path,use,svg,i')&&el.closest?.('button,a,[role="button"]'))el=el.closest('button,a,[role="button"]');
    return el;
  }
  function suggestEdit(el){
    const tag=(el.localName||'').toLowerCase();const text=String(el.textContent||'').replace(/\s+/g,' ').trim();
    if(tag==='img')return{type:'attribute',key:'src',value:el.getAttribute('src')||''};
    if(['video','audio','source','iframe'].includes(tag))return{type:'attribute',key:'src',value:el.getAttribute('src')||''};
    if(tag==='a'&&!text)return{type:'attribute',key:'href',value:el.getAttribute('href')||''};
    return{type:'text',key:'',value:text};
  }
  function fillForm(info){
    deltaSelector.value=info.selector;
    deltaType.value=info.edit.type;
    deltaType.dispatchEvent(new Event('change',{bubbles:true}));
    deltaKey.value=info.edit.key;
    deltaValue.value=info.edit.value;
  }
  function showSelection(info){
    outSelector.textContent=info.selector;outElement.textContent=info.tag+(info.id?'#'+info.id:'');outMatched.textContent=String(info.matched);
    state.textContent='SELECTED';state.className='inspectState ready';
  }
  function placeOverlay(el){
    if(!overlay)return;const r=el.getBoundingClientRect();overlay.style.display='block';overlay.style.left=r.left+'px';overlay.style.top=r.top+'px';overlay.style.width=Math.max(1,r.width)+'px';overlay.style.height=Math.max(1,r.height)+'px';
  }
  function removeBinding(){if(cleanup){cleanup();cleanup=null}boundDoc=null;overlay=null}
  function attach(){
    const doc=frameDoc();if(!doc?.documentElement){notify('warning','Inspector belum siap','Source-Native Render belum selesai dimuat.',0);return false}
    if(boundDoc===doc&&overlay)return true;
    removeBinding();boundDoc=doc;
    overlay=doc.createElement('div');overlay.setAttribute('data-dini-v3-inspector-overlay','1');Object.assign(overlay.style,{position:'fixed',zIndex:'2147483647',pointerEvents:'none',display:'none',border:'2px solid #55bfff',boxShadow:'0 0 0 2px rgba(0,0,0,.45),background:'rgba(85,191,255,.08)',borderRadius:'3px'});doc.documentElement.appendChild(overlay);
    const move=e=>{if(!active)return;const el=normalizeTarget(e.target);if(!el||el===overlay){overlay.style.display='none';return}placeOverlay(el)};
    const leave=()=>{if(overlay)overlay.style.display='none'};
    const click=e=>{if(!active)return;const el=normalizeTarget(e.target);if(!el||el===overlay)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      const selector=selectorFor(el,doc),matched=countMatches(doc,selector);if(!selector||!matched){notify('error','Selector gagal dibuat','Engine tidak menemukan selector aman untuk elemen ini.',0);return}
      const info={selector,matched,tag:(el.localName||'element').toLowerCase(),id:el.id||'',edit:suggestEdit(el)};last=info;fillForm(info);showSelection(info);placeOverlay(el);setActive(false,false);setTimeout(()=>{if(overlay)overlay.style.display='none'},900);
      notify(matched===1?'success':'warning','Elemen dipilih',matched===1?'Selector unik ditemukan dan form Delta sudah diisi otomatis.':'Selector ditemukan tetapi matched '+matched+' elemen. Periksa sebelum Apply Delta.',matched===1?1400:0);
    };
    doc.addEventListener('mousemove',move,true);doc.addEventListener('mouseleave',leave,true);doc.addEventListener('click',click,true);
    cleanup=()=>{try{doc.removeEventListener('mousemove',move,true);doc.removeEventListener('mouseleave',leave,true);doc.removeEventListener('click',click,true);overlay?.remove()}catch{}};
    return true;
  }
  function setActive(on,announce=true){
    if(on&&!attach())return;active=Boolean(on);toggle.textContent=active?'Inspector ON — klik elemen':'Inspect Element';toggle.setAttribute('aria-pressed',String(active));
    if(active){state.textContent='ON';state.className='inspectState on';if(announce)notify('success','Inspector aktif','Arahkan mouse ke Source-Native Render lalu klik elemen yang ingin diedit.',1100)}
    else if(!last){state.textContent='OFF';state.className='inspectState';}
  }
  toggle.addEventListener('click',()=>setActive(!active));
  frame.addEventListener('load',()=>{removeBinding();if(active)setTimeout(attach,80)});
  window.addEventListener('beforeunload',removeBinding);
  setActive(false,false);
})();
`;

export function augmentInspectorPage(html){
  let out=String(html||'');
  if(out.includes('data-dini-v3-inspector-ui="1"'))return out;
  out=out.replace('</style>',CSS+'</style>');
  out=out.replace('<button id="resetDelta" class="phase3">Reset Delta</button>','<button id="resetDelta" class="phase3">Reset Delta</button><button id="toggleInspector" class="phase31" aria-pressed="false">Inspect Element</button>');
  out=out.replace('</main>','<div data-dini-v3-inspector-ui="1"></div>'+PANEL+'</main>');
  out=out.replace('</body>','<script>'+SCRIPT+'</script></body>');
  return out;
}
