(async()=>{
  'use strict';
  if(window.__DINI_TEMPLATE_EDITOR_V2000__)return;
  window.__DINI_TEMPLATE_EDITOR_V2000__=true;

  const VERSION='2.0.0';
  const scope=window.__DINI_TEMPLATE_EDITOR_SCOPE__||{};
  const templateId=String(scope.template_id||'').trim();
  if(!templateId)throw new Error('Template Editor V2 membutuhkan UUID template ter-scope.');

  const SUPABASE_URL='https://jfvmcerrsxjvbiogfqes.supabase.co';
  const SUPABASE_KEY='sb_publishable_3IqSDxkpxCGiDpxAEwdsXQ_AsJpsC4W';
  const sb=window.supabase?.createClient?.(SUPABASE_URL,SUPABASE_KEY);
  if(!sb)throw new Error('Supabase client tidak tersedia.');

  const frame=document.getElementById('previewFrame');
  const sections=document.getElementById('editorSections');
  const inspector=document.getElementById('inspectorBody');
  const badge=document.getElementById('selectionBadge');
  const dirty=document.getElementById('dirtyState');
  const applyBtn=document.getElementById('applyBtn');
  const cleanBtn=document.getElementById('cleanPreviewBtn');
  const zipBtn=document.getElementById('downloadZipBtn');
  const saveBtn=document.getElementById('saveDraftBtn');
  const resetBtn=document.getElementById('resetBtn');
  const backupBtn=document.getElementById('downloadDataBtn');
  const auditBtn=document.getElementById('generateAllAssetsBtn');

  const DB_NAME='dini-anif-editor-v150',DB_VERSION=2,APPLIED_KEY=`native-applied:${templateId}`;
  const deep=v=>JSON.parse(JSON.stringify(v??null));
  const norm=v=>String(v??'').replace(/\s+/g,' ').trim();
  const escHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cssEsc=v=>window.CSS?.escape?CSS.escape(String(v||'')):String(v||'').replace(/["\\]/g,'\\$&');
  const eq=(a,b)=>JSON.stringify(a??null)===JSON.stringify(b??null);
  const now=()=>new Date().toISOString();

  function toast(message,type='info',title=''){
    if(typeof window.editorToast==='function')return window.editorToast(message,type,title);
    let host=document.getElementById('editorToastStack');
    if(!host){host=document.createElement('div');host.id='editorToastStack';host.className='editor-toast-stack';document.body.appendChild(host)}
    const el=document.createElement('div');el.className='editor-toast '+type;
    el.innerHTML=`<strong>${escHtml(title||(type==='success'?'Sukses':type==='error'?'Gagal':'Info'))}</strong><small>${escHtml(message)}</small>`;
    host.appendChild(el);requestAnimationFrame(()=>el.classList.add('show'));
    setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),250)},3800);return el;
  }
  window.editorToast=window.editorToast||toast;

  function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains('assets'))db.createObjectStore('assets');if(!db.objectStoreNames.contains('snapshots'))db.createObjectStore('snapshots')};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error||new Error('IndexedDB gagal dibuka'))})}
  async function putAsset(key,blob){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('assets','readwrite');tx.objectStore('assets').put(blob,key);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})}
  async function getAsset(key){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('assets');const r=tx.objectStore('assets').get(key);r.onsuccess=()=>res(r.result??null);r.onerror=()=>rej(r.error)})}
  async function putSnapshot(key,val){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(val,key);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})}

  const rowRes=await sb.from('templates').select('*').eq('id',templateId).maybeSingle();
  if(rowRes.error)throw rowRes.error;
  const row=rowRes.data;
  if(!row||String(row.id)!==templateId)throw new Error('UUID template tidak cocok.');
  const snapUrl=String(row.manifest_json?.editor_snapshot_url||'').trim();
  if(!snapUrl)throw new Error('Template belum memiliki editor snapshot.');
  const snapReq=new URL(snapUrl,location.href);snapReq.searchParams.set('_tev2',String(Date.now()));
  const snapRes=await fetch(snapReq.href,{cache:'no-store'});if(!snapRes.ok)throw new Error('Editor Snapshot HTTP '+snapRes.status);
  let originalSnap=await snapRes.json();
  if(originalSnap?.template_id&&String(originalSnap.template_id)!==templateId)throw new Error('Snapshot berasal dari UUID template lain.');
  if(window.DINI_TEMPLATE_CANONICAL_V1160?.resolveSnapshot)originalSnap=window.DINI_TEMPLATE_CANONICAL_V1160.resolveSnapshot(originalSnap);

  const schema=deep(originalSnap.schema||{});
  if(!Array.isArray(schema.fields)||!schema.fields.length)throw new Error('Schema template kosong.');
  const baselineHtml=String(originalSnap.html||originalSnap.baseHtml||'');
  if(!baselineHtml)throw new Error('HTML template kosong.');
  const baselineValues=deep(originalSnap.values||Object.fromEntries(schema.fields.map(f=>[f.id,f.value??''])));
  const baselineTransforms=deep(originalSnap.transforms||{});
  let values=deep(baselineValues),transforms=deep(baselineTransforms),selectedId='',dirtyFlag=false,lastApplied=null;
  const uploaded=new Map();
  const liveUrls=new Map();
  const byId=()=>new Map(schema.fields.map(f=>[f.id,f]));

  function status(extra=''){
    const changedValues=schema.fields.filter(f=>!eq(values[f.id],baselineValues[f.id])).length;
    const changedTransforms=Object.keys(transforms).filter(id=>!eq(transforms[id],baselineTransforms[id])).length;
    dirty.textContent=`TEMPLATE V2 · UUID ${templateId.slice(0,8)} · FIELD ${schema.fields.length} · DELTA ${changedValues} · TRANSFORM ${changedTransforms}${extra?' · '+extra:''}`;
    dirty.classList.toggle('dirty',dirtyFlag);
  }
  function setDirty(msg='BELUM APPLY'){dirtyFlag=true;saveBtn.disabled=true;status(msg)}
  function valueOf(f){return Object.prototype.hasOwnProperty.call(values,f.id)?values[f.id]:(f.value??'')}
  function transformOf(f){return transforms[f.id]||null}

  function fieldIds(node){if(!node)return[];return [...new Set(((node.getAttribute?.('data-native-edit-id')||'')+','+(node.getAttribute?.('data-native-edit-ids')||'')+','+(node.getAttribute?.('data-native-media-proxy')||'')).split(/[\s,]+/).filter(Boolean))]}
  function nodesFor(doc,f){
    const out=[],seen=new Set(),add=n=>{if(n&&!seen.has(n)){seen.add(n);out.push(n)}};
    if(!doc||!f)return out;
    if(f.node_id)add(doc.querySelector(`[data-native-node-id="${cssEsc(f.node_id)}"]`));
    for(const n of doc.querySelectorAll('[data-native-edit-id],[data-native-edit-ids],[data-native-media-proxy]'))if(fieldIds(n).includes(f.id))add(n);
    if(!out.length&&f.source_element_id){const host=doc.querySelector(`[data-id="${cssEsc(f.source_element_id)}"]`);if(f.media_role==='css-overlay')add(host?.querySelector('.elementor-background-overlay'));else add(host)}
    return out.filter(Boolean);
  }
  function fieldsAtPoint(doc,x,y,target){
    const by=byId(),found=[],seen=new Set();
    const add=(n,depth=0)=>{if(!n)return;for(const id of fieldIds(n)){const f=by.get(id);if(f&&!seen.has(id)){seen.add(id);found.push({f,depth,node:n})}}};
    let stack=[];try{stack=doc.elementsFromPoint(x,y)||[]}catch{}
    stack.forEach((n,i)=>{add(n,i);let p=n.parentElement,c=0;while(p&&c++<6){add(p,i+c/10);p=p.parentElement}});
    if(target){let p=target,c=0;while(p&&c++<8){add(p,-10+c/10);p=p.parentElement}}
    const rank=({f,depth})=>{let s=0;if(target?.matches?.('img')&&f.kind==='image')s+=500;if(f.kind==='text')s+=250;else if(f.kind==='image')s+=200;else if(f.kind==='background')s+=150;else s+=60;if(f.source_location==='external-css')s-=10;s-=Math.max(0,depth)*2;return s};
    return found.sort((a,b)=>rank(b)-rank(a)).map(x=>x.f);
  }

  const TEXT_SEL='h1,h2,h3,h4,h5,h6,p,span,a,label,button,strong,em,small,li,td,th,input,textarea,select';
  function textLeaf(root,f){
    if(!root)return null;
    if(root.matches?.('input,textarea,select'))return root;
    if(root.matches?.(TEXT_SEL)&&fieldIds(root).includes(f.id))return root;
    const exact=[...root.querySelectorAll?.('[data-native-edit-id],[data-native-edit-ids]')||[]].find(n=>fieldIds(n).includes(f.id)&&n.matches?.(TEXT_SEL));if(exact)return exact;
    const leaves=[...root.querySelectorAll?.(TEXT_SEL)||[]].filter(n=>![...n.children||[]].some(c=>c.matches?.(TEXT_SEL)&&norm(c.textContent)));
    return leaves.length===1?leaves[0]:(root.matches?.(TEXT_SEL)?root:null);
  }
  function setBg(n,value){if(!n)return;const css=value?`url("${String(value).replaceAll('"','%22')}")`:'none';n.style.setProperty('background-image',css,'important');if(n.hasAttribute?.('data-thumbnail'))n.setAttribute('data-thumbnail',value||'')}
  function replaceDeep(v,oldV,newV){if(!oldV||oldV===newV)return v;if(typeof v==='string')return v.split(oldV).join(newV);if(Array.isArray(v))return v.map(x=>replaceDeep(x,oldV,newV));if(v&&typeof v==='object')for(const k of Object.keys(v))v[k]=replaceDeep(v[k],oldV,newV);return v}

  function applyField(doc,f,value){
    const nodes=nodesFor(doc,f),old=String(baselineValues[f.id]??f.value??'');
    if(f.kind==='text'){
      for(const n of nodes){const leaf=textLeaf(n,f)||n;if(leaf.matches?.('input,textarea,select')){leaf.value=value;leaf.setAttribute('value',value)}else leaf.textContent=value;leaf.setAttribute?.('data-template-v2-text',f.id)}
    }else if(f.kind==='image'){
      for(const n of nodes){const imgs=n.matches?.('img')?[n]:[...n.querySelectorAll?.('img')||[]];for(const img of imgs){if(value){img.setAttribute('src',value);img.setAttribute('data-src',value)}else{img.removeAttribute('src');img.removeAttribute('data-src')}img.removeAttribute('srcset');img.removeAttribute('data-srcset');img.removeAttribute('data-lazy-src')}}
    }else if(f.kind==='background'){
      for(const n of nodes){
        if(f.media_role==='slideshow'||f.attribute==='data-settings'){
          const host=n.closest?.('[data-settings]')||n;let cfg={};try{cfg=JSON.parse(host.getAttribute('data-settings')||'{}')}catch{}
          replaceDeep(cfg,old,value);
          if(Array.isArray(cfg.background_slideshow_gallery)&&Number.isFinite(Number(f.slide_index))){const i=Number(f.slide_index);if(cfg.background_slideshow_gallery[i]){if(typeof cfg.background_slideshow_gallery[i]==='string')cfg.background_slideshow_gallery[i]=value;else cfg.background_slideshow_gallery[i].url=value}}
          host.setAttribute('data-settings',JSON.stringify(cfg));
          const runtime=host.querySelector?.('[data-native-slideshow-urls]')||host.closest?.('.elementor-top-section')?.querySelector?.('[data-native-slideshow-urls]');
          if(runtime){let arr=[];try{arr=JSON.parse(runtime.getAttribute('data-native-slideshow-urls')||'[]')}catch{};const i=Number(f.slide_index)||0;arr[i]=value;runtime.setAttribute('data-native-slideshow-urls',JSON.stringify(arr));const slides=[...runtime.querySelectorAll?.('[data-native-slide-bg],.swiper-slide-bg')||[]];if(slides[i])setBg(slides[i],value);else slides.forEach(x=>setBg(x,value))}
        }else setBg(n,value)
      }
    }else if(f.kind==='url'){
      for(const n of nodes){const a=n.matches?.('a,[href]')?n:n.querySelector?.('a,[href]');if(a)a.setAttribute('href',value)}
    }else if(f.kind==='placeholder'){
      for(const n of nodes){const x=n.matches?.('input,textarea')?n:n.querySelector?.('input,textarea');if(x)x.setAttribute('placeholder',value)}
    }else if(f.kind==='datetime'){
      for(const n of nodes)n.setAttribute('data-date',value)
    }else if(f.kind==='video'||f.kind==='audio'){
      for(const n of nodes){const xs=n.matches?.('video,audio,source')?[n]:[...n.querySelectorAll?.('video,audio,source')||[]];for(const x of xs){if(value)x.setAttribute('src',value);else x.removeAttribute('src')}}
    }
  }

  function bgTargets(doc,f){
    const out=new Set(),add=n=>{if(n)out.add(n)};
    for(const host of nodesFor(doc,f)){
      add(host);host.querySelectorAll?.('.swiper-slide-bg,[data-native-slide-bg]').forEach(add);
      host.querySelectorAll?.('[style*="background-image"]').forEach(add);
      const runtime=host.querySelector?.('[data-native-slideshow-urls]')||host.closest?.('.elementor-top-section')?.querySelector?.('[data-native-slideshow-urls]');
      if(runtime){const slides=[...runtime.querySelectorAll?.('.swiper-slide-bg,[data-native-slide-bg]')||[]],idx=Number(f.slide_index);if(Number.isFinite(idx)&&slides[idx])add(slides[idx]);else slides.forEach(add)}
    }
    return [...out];
  }
  function applyTransform(doc,f,t={}){
    if(!doc||!f||!t)return;
    const x=Number(t.x??50),y=Number(t.y??50),zoom=Number(t.zoom??t.scale??1),rotate=Number(t.rotate??0),fit=t.fit||'cover';
    if(f.kind==='image'){
      for(const n0 of nodesFor(doc,f)){const n=n0.matches?.('img')?n0:n0.querySelector?.('img');if(!n)continue;n.style.setProperty('object-position',`${x}% ${y}%`,'important');n.style.setProperty('object-fit',fit,'important');n.style.setProperty('transform',`scale(${zoom}) rotate(${rotate}deg)`,'important');n.style.setProperty('transform-origin',`${x}% ${y}%`,'important')}
    }else if(f.kind==='background'){
      const baseSize=fit==='fill'?'100% 100%':fit,size=Math.abs(zoom-1)<.0001?baseSize:`${Math.max(10,zoom*100)}% auto`;
      for(const n of bgTargets(doc,f)){n.style?.setProperty('background-position',`${x}% ${y}%`,'important');n.style?.setProperty('background-size',size,'important')}
    }
  }

  function liveValue(f){const v=String(valueOf(f)??'');return liveUrls.get(v)||v}
  function applyLive(f){const doc=frame.contentDocument;if(!doc)return;applyField(doc,f,liveValue(f));const t=transformOf(f);if(t)applyTransform(doc,f,t)}

  async function renderFresh(){
    const doc=new DOMParser().parseFromString(baselineHtml,'text/html');
    for(const f of schema.fields){const valueChanged=!eq(values[f.id],baselineValues[f.id]),transformChanged=!eq(transforms[f.id],baselineTransforms[f.id]);if(valueChanged)applyField(doc,f,valueOf(f));if(transformChanged||valueChanged){const t=transforms[f.id];if(t)applyTransform(doc,f,t)}}
    let html='<!doctype html>\n'+doc.documentElement.outerHTML;
    for(const [p,u] of [...liveUrls].sort((a,b)=>b[0].length-a[0].length))html=html.split(p).join(u);
    frame.srcdoc=html;
  }

  function sectionLabel(f){return schema.sections?.[Number(f.section_index)]?.label||`Section ${Number(f.section_index)+1}`}
  function renderSections(){
    const grouped=new Map();for(const f of schema.fields){const k=Number(f.section_index)||0;if(!grouped.has(k))grouped.set(k,[]);grouped.get(k).push(f)}
    sections.innerHTML='';
    for(const [si,fs] of grouped){const box=document.createElement('div');box.className='editor-section';box.innerHTML=`<div class="editor-section-head"><strong>${escHtml(schema.sections?.[si]?.label||'Section '+(si+1))}</strong><small>${fs.length} field</small></div><div class="editor-field-list"></div>`;const list=box.querySelector('.editor-field-list');for(const f of fs){const b=document.createElement('button');b.type='button';b.className='editor-field';b.dataset.fieldId=f.id;b.innerHTML=`<span>${escHtml(f.label||f.id)}</span><small>${escHtml(f.kind)} · ${escHtml(f.id)}</small>`;b.onclick=()=>selectField(f.id);list.appendChild(b)}sections.appendChild(box)}
  }
  function layerButtons(fields){if(!fields.length)return'';return `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">${fields.map((f,i)=>`<button type="button" data-layer-id="${escHtml(f.id)}" style="padding:9px;border-radius:9px;border:1px solid ${f.id===selectedId?'#d7b35d':'rgba(255,255,255,.15)'};background:${f.id===selectedId?'rgba(215,179,93,.15)':'#171b25'};color:#fff;font-size:11px">Layer ${i+1} · ${escHtml(f.kind)} · ${escHtml(f.label||f.id)}</button>`).join('')}</div>`}

  async function uploadExact(f,layers){
    const input=document.createElement('input');input.type='file';input.accept=f.kind==='image'||f.kind==='background'?'image/*':f.kind==='video'?'video/*':f.kind==='audio'?'audio/*':'*/*';
    input.onchange=async()=>{
      const file=input.files?.[0];if(!file)return;
      const safe=file.name.replace(/[^a-zA-Z0-9._-]+/g,'-'),path=`assets/generated/${f.id}-${Date.now()}-${safe}`,key=`template-v2:${templateId}:${f.id}:${crypto.randomUUID()}`;
      await putAsset(key,file);
      const old=uploaded.get(f.id);if(old?.path){const u=liveUrls.get(old.path);if(u){try{URL.revokeObjectURL(u)}catch{}liveUrls.delete(old.path)}}
      const url=URL.createObjectURL(file);liveUrls.set(path,url);
      uploaded.set(f.id,{id:f.id,key,path,name:file.name,type:file.type||'application/octet-stream',size:file.size,source:'template-v2-explicit-upload',role:'field'});
      values[f.id]=path;setDirty('UPLOAD '+f.id);applyLive(f);inspectorFor(f,layers);toast(`${file.name} → ${f.id}. UUID template tetap ${templateId.slice(0,8)}.`,'success','Upload Template V2');
    };
    input.click();
  }

  function inspectorFor(f,layers=[]){
    if(!f){inspector.className='inspector-empty';inspector.textContent='Klik elemen di preview atau pilih field dari panel kiri.';badge.textContent='Belum ada elemen';return}
    selectedId=f.id;badge.textContent=`${f.kind.toUpperCase()} · ${f.label||f.id}`;const v=valueOf(f);let control='';
    if(f.kind==='text')control=`<textarea id="v2val" rows="5" style="width:100%">${escHtml(v)}</textarea><button id="v2set">Terapkan Teks</button>`;
    else if(['image','background','video','audio'].includes(f.kind)){
      const t=transformOf(f)||{};const zoom=Number(t.zoom??t.scale??1);
      control=`<div style="font-size:11px;opacity:.72;word-break:break-all">${escHtml(v)}</div><button id="v2upload">Upload / Ganti</button><button id="v2delete" style="border-color:#a33;color:#ffb3b3">Hapus</button>${['image','background'].includes(f.kind)?`<div class="media-controls"><label>Posisi X <input id="tx" type="range" min="0" max="100" value="${Number(t.x??50)}"></label><label>Posisi Y <input id="ty" type="range" min="0" max="100" value="${Number(t.y??50)}"></label><label>Zoom <input id="tz" type="range" min="25" max="300" value="${Math.round(zoom*100)}"></label>${f.kind==='image'?`<label>Rotate <input id="tr" type="range" min="-180" max="180" value="${Number(t.rotate??0)}"></label>`:''}<label>Fit <select id="tf"><option>cover</option><option>contain</option><option>fill</option></select></label><button id="treset">Reset Transform</button></div>`:''}`;
    }else control=`<input id="v2val" type="text" style="width:100%" value="${escHtml(v)}"><button id="v2set">Terapkan</button>`;

    inspector.className='';inspector.innerHTML=`<div style="padding:14px;display:grid;gap:12px"><div><strong>${escHtml(f.label||f.id)}</strong><small style="display:block;opacity:.65">${escHtml(f.id)} · ${escHtml(f.kind)} · ${escHtml(sectionLabel(f))}</small></div>${layers.length?`<div><small style="display:block;margin-bottom:6px">Layer di titik ini — pilihan eksplisit selalu menang</small>${layerButtons(layers)}</div>`:''}${control}</div>`;
    inspector.querySelectorAll('[data-layer-id]').forEach(b=>b.onclick=()=>selectField(b.dataset.layerId,layers));
    const set=inspector.querySelector('#v2set');if(set)set.onclick=()=>{values[f.id]=inspector.querySelector('#v2val').value;setDirty('EDIT '+f.id);applyLive(f);inspectorFor(f,layers)};
    const up=inspector.querySelector('#v2upload');if(up)up.onclick=()=>uploadExact(f,layers);
    const del=inspector.querySelector('#v2delete');if(del)del.onclick=()=>{values[f.id]='';uploaded.delete(f.id);setDirty('HAPUS '+f.id);applyLive(f);inspectorFor(f,layers)};
    const fit=inspector.querySelector('#tf');if(fit){fit.value=transformOf(f)?.fit||'cover';const update=()=>{const z=Number(inspector.querySelector('#tz').value)/100;transforms[f.id]={x:Number(inspector.querySelector('#tx').value),y:Number(inspector.querySelector('#ty').value),zoom:z,scale:z,rotate:Number(inspector.querySelector('#tr')?.value||0),fit:fit.value};setDirty('TRANSFORM '+f.id);const doc=frame.contentDocument;if(doc)applyTransform(doc,f,transforms[f.id])};['#tx','#ty','#tz','#tr','#tf'].forEach(q=>{const x=inspector.querySelector(q);if(x)x.oninput=update});inspector.querySelector('#treset').onclick=async()=>{if(Object.prototype.hasOwnProperty.call(baselineTransforms,f.id))transforms[f.id]=deep(baselineTransforms[f.id]);else delete transforms[f.id];setDirty('RESET TRANSFORM '+f.id);await renderFresh();inspectorFor(f,layers)}}
  }

  function selectField(id,layers=[]){
    const f=byId().get(id);if(!f)return;selectedId=id;inspectorFor(f,layers);
    document.querySelectorAll('.editor-field').forEach(x=>x.classList.toggle('active',x.dataset.fieldId===id));
    const doc=frame.contentDocument;if(doc){doc.querySelectorAll('.native-selected-outline').forEach(n=>n.classList.remove('native-selected-outline'));for(const n of nodesFor(doc,f))n.classList.add('native-selected-outline')}
  }

  function bindFrame(){
    try{const doc=frame.contentDocument;if(!doc)return;let st=doc.getElementById('template-v2-editor-style');if(!st){st=doc.createElement('style');st.id='template-v2-editor-style';st.textContent='.native-selected-outline{outline:2px solid #f0c768!important;outline-offset:2px!important}';doc.head.appendChild(st)}
      doc.addEventListener('click',e=>{const open=e.target?.closest?.('[data-native-open],#tombolbuka,.tombolbuka');if(open||/\bBuka\s+Undangan\b/i.test(String(e.target?.textContent||'')))return;const fs=fieldsAtPoint(doc,e.clientX,e.clientY,e.target);if(!fs.length)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();selectField(fs[0].id,fs)},true);
    }catch(err){console.warn('TEMPLATE_V2_BIND',err)}
  }
  frame.addEventListener('load',bindFrame);

  async function buildApplied(){
    const doc=new DOMParser().parseFromString(baselineHtml,'text/html');
    for(const f of schema.fields){const valueChanged=!eq(values[f.id],baselineValues[f.id]),transformChanged=!eq(transforms[f.id],baselineTransforms[f.id]);if(valueChanged)applyField(doc,f,valueOf(f));if(transformChanged||valueChanged){const t=transforms[f.id];if(t)applyTransform(doc,f,t)}}
    let snap={...deep(originalSnap),version:'template-edit-v2.0.0',template_id:templateId,record_id:templateId,snapshot_scope:templateId,snapshot_scope_version:'template-v2',schema:deep(schema),values:deep(values),transforms:deep(transforms),html:'<!doctype html>\n'+doc.documentElement.outerHTML,baseHtml:'<!doctype html>\n'+doc.documentElement.outerHTML,assets:[...uploaded.values()].map(deep),template_edit_v2:{version:VERSION,baseline_snapshot_url:snapUrl,loaded_at:now(),same_uuid:true}};
    if(window.DINI_TEMPLATE_CANONICAL_V1160?.resolveSnapshot)snap=window.DINI_TEMPLATE_CANONICAL_V1160.resolveSnapshot(snap);
    return snap;
  }
  async function doApply(){
    const snap=await buildApplied();await putSnapshot(APPLIED_KEY,snap);lastApplied=snap;dirtyFlag=false;saveBtn.disabled=false;status('APPLIED ✓ · SAME UUID');toast(`APPLY selesai. ${schema.fields.length} field tetap ter-scope ke UUID ${templateId}.`,'success','Template V2 APPLY');return snap;
  }
  applyBtn.onclick=()=>doApply().catch(err=>toast(err.message||String(err),'error','APPLY gagal'));

  const cleanUrl=()=>`./clean-preview.html?template=${encodeURIComponent(templateId)}&record=${encodeURIComponent(templateId)}`;
  cleanBtn.href=cleanUrl();
  cleanBtn.onclick=async e=>{e.preventDefault();try{if(dirtyFlag||!lastApplied)await doApply();window.open(cleanUrl(),'_blank','noopener')}catch(err){toast(err.message||String(err),'error','Preview Bersih gagal')}};

  zipBtn.onclick=async()=>{try{const snap=dirtyFlag||!lastApplied?await doApply():lastApplied;if(!window.UNDANGAN_ZIP?.buildZip)throw new Error('ZIP builder tidak tersedia.');const entries=[{name:'index.html',data:snap.html},{name:'source-native.html',data:snap.html},{name:'native-schema.json',data:JSON.stringify(snap.schema,null,2)},{name:'native-data.json',data:JSON.stringify({values:snap.values,transforms:snap.transforms},null,2)},{name:'editor-snapshot.json',data:JSON.stringify(snap,null,2)}];for(const a of snap.assets||[]){const blob=await getAsset(a.key);if(blob)entries.push({name:a.path,data:blob})}const blob=await window.UNDANGAN_ZIP.buildZip(entries),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=`template-${templateId.slice(0,8)}-editor-v2.zip`;a.click();setTimeout(()=>URL.revokeObjectURL(u),5000)}catch(err){toast(err.message||String(err),'error','ZIP gagal')}};

  resetBtn.onclick=async()=>{if(!confirm('Reset perubahan sesi Template Editor V2 ke snapshot template tersimpan? UUID dan template cloud tidak diubah.'))return;values=deep(baselineValues);transforms=deep(baselineTransforms);for(const u of liveUrls.values())try{URL.revokeObjectURL(u)}catch{}liveUrls.clear();uploaded.clear();dirtyFlag=false;lastApplied=null;saveBtn.disabled=true;await renderFresh();status('RESET KE SAVED SNAPSHOT ✓');inspectorFor(null)};
  backupBtn.onclick=()=>{const out={version:VERSION,template_id:templateId,values,transforms,uploaded:[...uploaded.values()],baseline_snapshot_url:snapUrl,created_at:now()},blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=`template-edit-v2-${templateId.slice(0,8)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(u),5000)};
  if(auditBtn)auditBtn.onclick=()=>toast(`Saved snapshot authority: ${schema.fields.length} field. Template Editor V2 tidak melakukan discovery ulang.`,'info','Audit Baseline');

  renderSections();frame.srcdoc=baselineHtml;status('SAVED SNAPSHOT LOADED ✓');saveBtn.disabled=true;
  document.documentElement.dataset.templateEditorEngine='v2.0.0';
  document.querySelector('.editor-head h1').textContent='DINI ANIF — TEMPLATE EDITOR V2';
  const desc=document.querySelector('.editor-head p');if(desc)desc.textContent='UX Fetch-style · existing saved snapshot sebagai baseline · UPDATE SAME UUID · tidak memakai state Fetch Editor.';
  const toolbar=document.querySelector('.preview-toolbar');if(toolbar)toolbar.firstChild.textContent='Template Saved Snapshot + Delta ';
  addEventListener('beforeunload',()=>{for(const u of liveUrls.values())try{URL.revokeObjectURL(u)}catch{}});
})().catch(err=>{console.error('TEMPLATE_EDITOR_V2000',err);const d=document.getElementById('dirtyState');if(d)d.textContent='TEMPLATE V2 ERROR: '+(err.message||err);if(typeof window.editorToast==='function')window.editorToast(err.message||String(err),'error','Template Editor V2 gagal')});
