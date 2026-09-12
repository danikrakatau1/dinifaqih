function editorToast(message,type='success',title=''){
  let stack=document.querySelector('#editorToastStack');if(!stack){stack=document.createElement('div');stack.id='editorToastStack';stack.className='editor-toast-stack';document.body.appendChild(stack)}
  const el=document.createElement('div');el.className='editor-toast '+type;el.innerHTML=`<strong>${title||({success:'Sukses',error:'Gagal',loading:'Memproses',info:'Info'}[type]||'Info')}</strong><small>${message}</small>`;stack.appendChild(el);requestAnimationFrame(()=>el.classList.add('show'));if(type!=='loading')setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),250)},3200);return el
}
function finishEditorToast(el,message,type='success',title=''){if(!el)return editorToast(message,type,title);el.className='editor-toast '+type+' show';el.innerHTML=`<strong>${title||(type==='success'?'Sukses':'Gagal')}</strong><small>${message}</small>`;setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),250)},3200)}
(()=>{
 const sections=document.getElementById('editorSections'),frame=document.getElementById('previewFrame'),dirty=document.getElementById('dirtyState');
 const inspector=document.getElementById('inspectorPanel'),inspectorBody=document.getElementById('inspectorBody'),selectionBadge=document.getElementById('selectionBadge');
 const importBtn=document.getElementById('importZipBtn'),importInput=document.getElementById('importZipInput');
 const generateAllBtn=document.getElementById('generateAllAssetsBtn'),applyBtn=document.getElementById('applyBtn'),previewBtn=document.getElementById('cleanPreviewBtn'),zipBtn=document.getElementById('downloadZipBtn'),saveDraftBtn=document.getElementById('saveDraftBtn'),b2UploadBtn=document.getElementById('b2UploadBtn'),b2UploadState=document.getElementById('b2UploadState'),b2UploadProgress=document.getElementById('b2UploadProgress'),backupBtn=document.getElementById('downloadDataBtn'),resetBtn=document.getElementById('resetBtn');
 let native=null,isDirty=false,previewTimer=0,selectedFieldId='',suspendHistory=false;
 let selectedMediaStackIds=[];
 let importedZipFile=null, importedZipPackage=null;
 let currentTemplateRecord=null, currentTemplateLoadPromise=null;
 let pendingB2Upload=null;
 try{const savedPending=JSON.parse(localStorage.getItem('diniAnifPendingB2Upload')||'null');if(savedPending?.object_key)pendingB2Upload=savedPending}catch{}
 const DINI_ANIF_SUPABASE_URL='https://jfvmcerrsxjvbiogfqes.supabase.co';
 const DINI_ANIF_SUPABASE_KEY='sb_publishable_3IqSDxkpxCGiDpxAEwdsXQ_AsJpsC4W';
 const adminSb=window.supabase?.createClient?.(DINI_ANIF_SUPABASE_URL,DINI_ANIF_SUPABASE_KEY);
 const TEMPLATE_BUCKET='template-packages';
 const DRAFT_KEY='diniAnifNativeDraft-v169';
 const OLD_DRAFT_KEYS=['diniAnifNativeDraft-v159','diniAnifNativeDraft-v158','diniAnifNativeDraft-v157','diniAnifNativeDraft-v156','diniAnifNativeDraft-v155','diniAnifNativeDraft-v154','diniAnifNativeDraft-v153','diniAnifNativeDraft-v152','diniAnifNativeDraft-v151','diniAnifNativeDraft-v150'];
 const LEGACY_DRAFT_KEY='diniAnifNativeDraft';
 const generatedAssets=new Map(); // fieldId -> {blob,path,name,type,source}
 const sourceAssetCache=new Map();
 const projectAssets=new Map(); // path -> {blob,path,name,type,source}
 const localizedLinks=new Map(); // absolute source stylesheet -> local path
 const transforms={};
 const history=[],future=[];
 const objectUrls=new Set();
 const esc=s=>String(s??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
 const attr=s=>esc(s).replaceAll('"','&quot;');
 function parseNative(html){return new DOMParser().parseFromString(html,'text/html')}
 function serialize(doc){return '<!doctype html>\n'+doc.documentElement.outerHTML}
 function deep(v){return JSON.parse(JSON.stringify(v))}
 function templateAssetBase(manifest={}){
   const explicit=String(manifest?.asset_base||'').trim();
   if(explicit){
     try{const u=new URL(explicit,location.href);return u.href.endsWith('/')?u.href:(u.href+'/')}catch{}
   }
   const source=String(manifest?.source_url||'').trim();
   if(source){try{return new URL('./',new URL(source,location.href).href).href}catch{}}
   return location.origin+'/';
 }
 function normalizeSnapshotHtml(html,manifest={}){
   const doc=parseNative(String(html||''));
   const assetBase=templateAssetBase(manifest);
   let base=doc.querySelector('base[data-dini-template-base]');
   if(!base){
     const existing=doc.querySelector('base');
     if(existing)existing.remove();
     base=doc.createElement('base');
     base.setAttribute('data-dini-template-base','1');
     doc.head.prepend(base);
   }
   base.setAttribute('href',assetBase);
   return {html:serialize(doc),assetBase};
 }
 function templateRecoveryKey(rec=currentTemplateRecord){
   const id=rec?.id||rec?.slug||new URLSearchParams(location.search).get('template')||'fetch-session';
   return `diniAnifRecovery:${id}`;
 }
 function saveRecovery(){
   if(!native)return;
   try{localStorage.setItem(templateRecoveryKey(),JSON.stringify({schema:native.schema,baseHtml:native.baseHtml,manifest:native.manifest,values:native.values,transforms:deep(transforms),saved_at:new Date().toISOString()}))}catch{}
 }
 function nodeFor(doc,f){return f?.node_id?doc.querySelector(`[data-native-node-id="${CSS.escape(f.node_id)}"]`):doc.querySelector(`[data-native-edit-id="${CSS.escape(f.id)}"],[data-native-edit-ids~="${CSS.escape(f.id)}"]`)}
 function fieldById(id){return native?.schema?.fields?.find(f=>f.id===id)}
 function fieldsForNode(node){if(!node||!native)return[];const ids=(node.getAttribute('data-native-edit-ids')||node.getAttribute('data-native-edit-id')||'').split(/[\s,]+/).filter(Boolean);return ids.map(fieldById).filter(Boolean)}
 function editableNode(el){return el?.closest?.('[data-native-edit-id],[data-native-edit-ids],[data-native-node-id],[data-native-media-proxy]')||null}
 function proxyFields(node){if(!node||!native)return[];const ids=(node.getAttribute('data-native-media-proxy')||'').split(/[\s,]+/).filter(Boolean);return ids.map(fieldById).filter(Boolean)}
 function hitFieldsAtPoint(doc,x,y){
   if(!doc||!native)return[];
   const candidates=[];const seen=new Set();
   const add=(node,stackIndex=999)=>{if(!node)return;const key=node;const fs=[...fieldsForNode(node),...proxyFields(node)];if(!fs.length)return;let r;try{r=node.getBoundingClientRect()}catch{return}if(!r||r.width<1||r.height<1)return;const area=Math.max(1,r.width*r.height);for(const f of fs){const uniqueKey=(f.id||'')+'@'+(node.getAttribute?.('data-native-node-id')||node.getAttribute?.('data-id')||'');if(seen.has(uniqueKey))continue;seen.add(uniqueKey);const overlayBoost=f.media_role==='css-overlay'?120:0;const media=f.kind==='image'?60:f.kind==='background'?50:(f.kind==='video'||f.kind==='audio'?45:f.kind==='effect'?35:0);const direct=node.tagName==='IMG'?18:0;const score=overlayBoost+media+direct-Math.log10(area+1)-(stackIndex*.02);candidates.push({f,node,score,area,stackIndex})}};
   let stack=[];try{stack=doc.elementsFromPoint(x,y)||[]}catch{}
   stack.forEach((el,i)=>{add(editableNode(el),i);if(el?.matches?.('[data-native-edit-id],[data-native-edit-ids],[data-native-node-id],[data-native-media-proxy]'))add(el,i)});
   // Fallback for decorative overlays / pointer-events:none: inspect every editable/proxy box under the exact click point.
   doc.querySelectorAll('[data-native-edit-id],[data-native-edit-ids],[data-native-node-id],[data-native-media-proxy]').forEach(node=>{let r;try{r=node.getBoundingClientRect()}catch{return};if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)add(node,500)});
   candidates.sort((a,b)=>b.score-a.score||a.area-b.area||a.stackIndex-b.stackIndex);
   const out=[];const ids=new Set();for(const c of candidates){if(!ids.has(c.f.id)){ids.add(c.f.id);out.push(c.f)}}return out;
 }
 function runtimeBgUrl(styleValue){
   const m=String(styleValue||'').match(/url\(\s*(["']?)(.*?)\1\s*\)/i);return m&&m[2]&&!/^data:/i.test(m[2])?m[2]:''
 }
 function runtimeBgUrls(styleValue){
   const out=[];String(styleValue||'').replace(/url\(\s*(["']?)(.*?)\1\s*\)/ig,(_,q,u)=>{u=String(u||'').trim();if(u&&!/^data:/i.test(u)&&!out.includes(u))out.push(u);return _});return out
 }
 function runtimeNodeLabel(el){
   if(!el)return 'Background';
   const id=String(el.id||'').trim(),cls=[...el.classList||[]].filter(Boolean).slice(0,2).join('.');
   if(id)return '#'+id;if(cls)return '.'+cls;return String(el.tagName||'element').toLowerCase()
 }
 function ensurePseudoBackgroundRule(doc,f,value,t){
   if(!doc||!f?.node_id)return;
   const pseudo=f.pseudo==='after'?'after':'before';
   let st=doc.querySelector(`style[data-native-pseudo-field="${CSS.escape(f.id)}"]`);
   if(!st){st=doc.createElement('style');st.setAttribute('data-native-pseudo-field',f.id);doc.head.appendChild(st)}
   const x=Number.isFinite(Number(t?.x))?Number(t.x):50,y=Number.isFinite(Number(t?.y))?Number(t.y):50,scale=Math.max(.25,Math.min(3,Number(t?.scale)||1)),fit=t?.fit||'cover';
   let size=fit==='fill'?'100% 100%':fit;
   if(Math.abs(scale-1)>.001){const pct=(scale*100).toFixed(2).replace(/\.00$/,'');size=fit==='fill'?`${pct}% ${pct}%`:`${pct}% auto`}
   const safe=String(value||'').replace(/\\/g,'\\\\').replace(/"/g,'\\"');
   st.textContent=`[data-native-node-id="${String(f.node_id).replace(/"/g,'\\"')}"]::${pseudo}{background-image:${safe?`url("${safe}")`:'none'}!important;background-position:${x}% ${y}%!important;background-size:${size}!important;background-repeat:no-repeat!important}`;
 }
 function ensureRuntimeCssBackgroundFields(doc){
   if(!doc||!native)return false;
   let changed=false;const top=[...doc.querySelectorAll('.elementor-top-section, body > section')];
   const baseDoc=parseNative(native.baseHtml);let baseChanged=false;
   const uniqueId=base=>{let id=base,n=2;while(fieldById(id))id=base+'-'+(n++);return id};
   for(const overlay of doc.querySelectorAll('.elementor-background-overlay')){
     const host=overlay.closest('.elementor-element[data-id]');if(!host)continue;
     const hostId=host.getAttribute('data-id')||'';if(!hostId)continue;
     let nodeId=overlay.getAttribute('data-native-node-id')||('cssov-'+hostId);overlay.setAttribute('data-native-node-id',nodeId);
     // V2.26 Source Graph V3: if Fetch already mapped exact external-CSS ownership, BIND it only.
     // Never promote a computed overlay URL to inline style, because that destroys the authored cascade/media variant.
     const authored=(native.schema.fields||[]).filter(x=>x.kind==='background'&&x.media_role==='css-overlay'&&x.source_element_id===hostId&&x.source_location==='external-css');
     if(authored.length){
       const ids=(overlay.getAttribute('data-native-edit-ids')||'').split(/[\s,]+/).filter(Boolean);
       for(const f of authored){if(!ids.includes(f.id))ids.push(f.id);if(f.node_id!==nodeId){f.node_id=nodeId;changed=true}if(native.values[f.id]==null)native.values[f.id]=f.value||''}
       overlay.setAttribute('data-native-edit-ids',ids.join(','));if(!overlay.getAttribute('data-native-edit-id')&&ids[0])overlay.setAttribute('data-native-edit-id',ids[0]);overlay.setAttribute('data-native-media-owner',hostId);
       const proxy=(host.getAttribute('data-native-media-proxy')||'').split(/[\s,]+/).filter(Boolean);for(const f of authored)if(!proxy.includes(f.id))proxy.push(f.id);host.setAttribute('data-native-media-proxy',proxy.join(','));
       const bh=baseDoc.querySelector(`[data-id="${CSS.escape(hostId)}"]`);if(bh){const bo=bh.querySelector(':scope > .elementor-widget-wrap > .elementor-background-overlay,:scope > .elementor-element-populated > .elementor-background-overlay,:scope > .elementor-background-overlay')||bh.querySelector('.elementor-background-overlay');if(bo){bo.setAttribute('data-native-node-id',nodeId);bo.setAttribute('data-native-edit-ids',authored.map(x=>x.id).join(','));if(!bo.getAttribute('data-native-edit-id'))bo.setAttribute('data-native-edit-id',authored[0].id);baseChanged=true}}
       continue;
     }
     let full='';try{full=doc.defaultView.getComputedStyle(overlay).backgroundImage}catch{};if(!full)full=overlay.style.backgroundImage||'';const urls=runtimeBgUrls(full);if(!urls.length)continue;
     const sec=host.closest('.elementor-top-section, body > section');let si=top.indexOf(sec);if(si<0)si=0;const secMeta=native.schema.sections?.[si]||{};
     const ids=(overlay.getAttribute('data-native-edit-ids')||'').split(/[\s,]+/).filter(Boolean);
     urls.forEach((bg,layer)=>{let f=(native.schema.fields||[]).find(x=>x.kind==='background'&&x.node_id===nodeId&&x.media_role==='css-overlay'&&Number(x.background_layer||0)===layer&&x.source_location!=='external-css');if(!f){const id=uniqueId('css-overlay-'+hostId+'-'+layer);f={id,section_index:si,section_id:secMeta.id||(sec?.getAttribute('data-id')||`section-${si+1}`),kind:'background',label:`Runtime Overlay Layer ${layer+1} · ${hostId}`,value:bg,attribute:'style.backgroundImage',node_id:nodeId,media_role:'css-overlay',source_element_id:hostId,source_location:'computed-style',source_property:'background-image',source_background_image:full,background_layer:layer,runtime_discovered:true};native.schema.fields.push(f);if(Array.isArray(secMeta.field_ids)&&!secMeta.field_ids.includes(id))secMeta.field_ids.push(id);native.values[id]=bg;changed=true}if(!ids.includes(f.id))ids.push(f.id)});
     overlay.setAttribute('data-native-edit-ids',ids.join(','));if(!overlay.getAttribute('data-native-edit-id')&&ids[0])overlay.setAttribute('data-native-edit-id',ids[0]);overlay.setAttribute('data-native-media-owner',hostId);
   }
   // Universal background discovery: not every template uses Elementor overlays. Detect visible
   // CSS backgrounds on normal/root containers, CSS-variable-resolved backgrounds, and ::before/::after layers.
   // Mirror the discovered edit handles into baseHtml so Draft/Preview/Public keep the same editable layer identity.
   const runtimeNodes=[...doc.querySelectorAll('body,body *')],baseNodes=[...baseDoc.querySelectorAll('body,body *')];
   const basePeer=(el,idx)=>{const nid=el.getAttribute?.('data-native-node-id'),did=el.getAttribute?.('data-id'),id=el.id;if(nid){const x=baseDoc.querySelector(`[data-native-node-id="${CSS.escape(nid)}"]`);if(x)return x}if(did){const x=baseDoc.querySelector(`[data-id="${CSS.escape(did)}"]`);if(x)return x}if(id){const x=baseDoc.getElementById(id);if(x)return x}return baseNodes[idx]||null};
   const usedNodeIds=new Set((native.schema.fields||[]).map(x=>x.node_id).filter(Boolean));
   const ensureNodeId=(el,baseEl,idx,prefix='cssbg')=>{
     let id=el.getAttribute('data-native-node-id')||baseEl?.getAttribute?.('data-native-node-id')||'';
     if(!id){id=`${prefix}-${idx}`;let n=2,seed=id;while(usedNodeIds.has(id))id=seed+'-'+(n++);usedNodeIds.add(id)}
     el.setAttribute('data-native-node-id',id);if(baseEl)baseEl.setAttribute('data-native-node-id',id);return id;
   };
   const attachField=(el,baseEl,idx,bg,{role='css-background',pseudo='',layer=0,fullBackground='',sourceLocation='computed-style',sourceKey='',cssSelector='',cssSource='',sourceProperty='background-image',semanticRole='',cssPriority='',cssOrder=null,cssSpecificity='',mediaQuery='',atRulePath=[]}={})=>{
     if(!bg)return null;const nodeId=ensureNodeId(el,baseEl,idx,role==='pseudo-background'?'csspseudo':'cssbg');
     let f=sourceKey?(native.schema.fields||[]).find(x=>x.source_key===sourceKey):null;
     if(!f)f=(native.schema.fields||[]).find(x=>x.kind==='background'&&x.node_id===nodeId&&x.media_role===role&&String(x.pseudo||'')===pseudo&&Number(x.background_layer||0)===Number(layer||0)&&String(x.source_location||'')===String(sourceLocation||''));
     if(!f){
       const sec=el.closest('.elementor-top-section,body > section,section');let si=top.indexOf(sec);if(si<0)si=0;const secMeta=native.schema.sections?.[si]||{};
       const id=uniqueId(`${role}-${nodeId}${pseudo?'-'+pseudo:''}${layer?'-'+layer:''}`);
       const label=semanticRole==='base-background'?`Background Dasar · ${runtimeNodeLabel(el)}`:semanticRole==='cover-decoration'?`Dekor Cover · ${runtimeNodeLabel(el)}`:role==='pseudo-background'?`Layer ${pseudo==='after'?'::after':'::before'} · ${runtimeNodeLabel(el)}`:`Background Layer ${layer+1} · ${runtimeNodeLabel(el)}`;
       f={id,section_index:si,section_id:secMeta.id||(sec?.getAttribute('data-id')||`section-${si+1}`),kind:'background',label,value:bg,attribute:role==='pseudo-background'?`pseudo.${pseudo}.backgroundImage`:'style.backgroundImage',node_id:nodeId,media_role:role,pseudo,background_layer:layer,runtime_discovered:true,source_location:sourceLocation,source_property:sourceProperty,source_background_image:fullBackground||`url("${String(bg).replaceAll('"','%22')}")`,source_key:sourceKey,css_selector:cssSelector,css_source:cssSource,semantic_role:semanticRole,css_priority:cssPriority,css_order:cssOrder,css_specificity:cssSpecificity,media_query:mediaQuery,at_rule_path:Array.isArray(atRulePath)?atRulePath:[]};
       native.schema.fields.push(f);if(Array.isArray(secMeta.field_ids)&&!secMeta.field_ids.includes(id))secMeta.field_ids.push(id);native.values[id]=bg;changed=true;
     } else {if(f.node_id!==nodeId){f.node_id=nodeId;changed=true}if(native.values[f.id]==null)native.values[f.id]=f.value||bg}
     const ids=(el.getAttribute('data-native-edit-ids')||'').split(/[\s,]+/).filter(Boolean);if(!ids.includes(f.id))ids.push(f.id);el.setAttribute('data-native-edit-ids',ids.join(','));if(!el.getAttribute('data-native-edit-id'))el.setAttribute('data-native-edit-id',f.id);
     if(baseEl){const bids=(baseEl.getAttribute('data-native-edit-ids')||'').split(/[\s,]+/).filter(Boolean);if(!bids.includes(f.id))bids.push(f.id);baseEl.setAttribute('data-native-edit-ids',bids.join(','));if(!baseEl.getAttribute('data-native-edit-id'))baseEl.setAttribute('data-native-edit-id',f.id);baseChanged=true}
     // Discovery is read-only. Never inline a computed/external background merely to make it editable.
     return f;
   };
   runtimeNodes.forEach((el,idx)=>{
     if(!el||el.matches('script,style,link,meta,source,img,picture,video,audio,canvas,svg')||el.classList?.contains('elementor-background-overlay'))return;
     let r;try{r=el.getBoundingClientRect()}catch{return};if(!r||r.width<8||r.height<8)return;
     let cs;try{cs=doc.defaultView.getComputedStyle(el)}catch{return};
     const full=cs.backgroundImage||el.style.backgroundImage||'',urls=runtimeBgUrls(full);urls.forEach((u,layer)=>attachField(el,basePeer(el,idx),idx,u,{role:'css-background',layer,fullBackground:full,sourceLocation:'computed-style'}));
     for(const pseudo of ['before','after']){let ps;try{ps=doc.defaultView.getComputedStyle(el,'::'+pseudo)}catch{};if(!ps||ps.content==='none'||ps.display==='none')continue;const pf=ps.backgroundImage||'',pu=runtimeBgUrls(pf);pu.forEach((u,layer)=>attachField(el,basePeer(el,idx),idx,u,{role:'pseudo-background',pseudo,layer,fullBackground:pf,sourceLocation:'computed-pseudo'}))}
   });
   // V2.23 shared resolver supplement: Elementor classic backgrounds can live on child widget-wrap,
   // while slides/video/effects live in data-settings and may not exist as direct DOM media attributes.
   const staticVisuals=window.DiniVisualResolver?.discoverStatic(doc,{baseUrl:doc.baseURI})||[];
   const runtimeVisuals=window.DiniVisualResolver?.discoverRuntime(doc,{baseUrl:doc.baseURI,includePseudo:true})||[];
   for(const src of [...staticVisuals,...runtimeVisuals]){
     if(src.type==='image'||src.type==='gradient')continue;
     let el=src.element||src.host||null;const host=src.host||(src.element_id?doc.querySelector(`[data-id="${CSS.escape(src.element_id)}"]`):null);
     if(src.type==='classic'&&host)el=host.querySelector(':scope > .elementor-widget-wrap,:scope > .elementor-element-populated')||host;
     if(src.type==='classic-runtime'||src.type==='computed-background'||src.type==='inline-background'||src.type==='css-background'||src.type==='classic-css'||src.type==='overlay'||src.type==='pseudo'){
       if(!el||!src.url)continue;const idx=Math.max(0,runtimeNodes.indexOf(el));
       const role=src.type==='overlay'?'css-overlay':src.type==='pseudo'?'pseudo-background':src.type.startsWith('classic')?'classic-background':'css-background';
       attachField(el,basePeer(el,idx),idx,src.url,{role,pseudo:src.pseudo||'',layer:src.background_layer||0,fullBackground:src.source_background_image||'',sourceLocation:src.source_location||'computed-style',sourceKey:src.source_key||'',cssSelector:src.css_selector||'',cssSource:src.css_source||'',sourceProperty:src.source_property||'background-image',semanticRole:src.semantic_role||'',cssPriority:src.css_priority||'',cssOrder:Number.isInteger(src.css_order)?src.css_order:null,cssSpecificity:src.css_specificity||'',mediaQuery:src.media_query||'',atRulePath:Array.isArray(src.at_rule_path)?src.at_rule_path:[]});continue;
     }
     if(src.type==='slideshow'&&src.element&&src.url){
       const node=src.element,idx=Math.max(0,runtimeNodes.indexOf(node)),nodeId=ensureNodeId(node,basePeer(node,idx),idx,'slide');
       let f=(native.schema.fields||[]).find(x=>x.kind==='background'&&x.node_id===nodeId&&x.media_role==='slideshow'&&Number(x.slide_index||0)===Number(src.slide_index||0));
       if(!f){const sec=node.closest('.elementor-top-section,body > section,section');let si=top.indexOf(sec);if(si<0)si=0;const sm=native.schema.sections?.[si]||{};const id=uniqueId(`slideshow-${nodeId}-${src.slide_index||0}`);f={id,section_index:si,section_id:sm.id||(sec?.getAttribute?.('data-id')||`section-${si+1}`),kind:'background',label:src.label||`Slideshow ${(src.slide_index||0)+1}`,value:src.url,attribute:'data-settings',node_id:nodeId,media_role:'slideshow',slide_index:Number(src.slide_index)||0,slideshow_duration:src.duration,slideshow_transition:src.transition,slideshow_transition_duration:src.transition_duration,slideshow_loop:src.loop,ken_burns:src.ken_burns,ken_burns_direction:src.ken_burns_direction,runtime_discovered:true};native.schema.fields.push(f);if(Array.isArray(sm.field_ids)&&!sm.field_ids.includes(id))sm.field_ids.push(id);native.values[id]=src.url;changed=true}
       const ids=(node.getAttribute('data-native-edit-ids')||'').split(/[\s,]+/).filter(Boolean);if(!ids.includes(f.id))ids.push(f.id);node.setAttribute('data-native-edit-ids',ids.join(','));if(!node.getAttribute('data-native-edit-id'))node.setAttribute('data-native-edit-id',f.id);continue;
     }
     if(src.type==='video-background'&&src.url){
       let video=src.element?.querySelector?.('video.elementor-background-video-hosted,video')||host?.querySelector?.('video.elementor-background-video-hosted,video');if(!video)continue;const idx=Math.max(0,runtimeNodes.indexOf(video));const nodeId=ensureNodeId(video,basePeer(video,idx),idx,'video');
       if(!(native.schema.fields||[]).some(x=>x.kind==='video'&&x.node_id===nodeId&&x.media_role==='video-background')){const sec=video.closest('.elementor-top-section,body > section,section');let si=top.indexOf(sec);if(si<0)si=0;const sm=native.schema.sections?.[si]||{};const id=uniqueId(`video-background-${nodeId}`);const f={id,section_index:si,section_id:sm.id||(sec?.getAttribute?.('data-id')||`section-${si+1}`),kind:'video',label:src.label||'Video Background',value:src.url,attribute:'src',node_id:nodeId,media_role:'video-background',runtime_discovered:true};native.schema.fields.push(f);if(Array.isArray(sm.field_ids)&&!sm.field_ids.includes(id))sm.field_ids.push(id);native.values[id]=src.url;video.setAttribute('data-native-edit-id',id);video.setAttribute('data-native-edit-ids',id);changed=true}continue;
     }
     if(src.type==='effect'&&src.element){const node=src.element,idx=Math.max(0,runtimeNodes.indexOf(node)),nodeId=ensureNodeId(node,basePeer(node,idx),idx,'effect');if(!(native.schema.fields||[]).some(x=>x.kind==='effect'&&x.node_id===nodeId&&x.media_role==='effect')){const sec=node.closest('.elementor-top-section,body > section,section');let si=top.indexOf(sec);if(si<0)si=0;const sm=native.schema.sections?.[si]||{};const id=uniqueId(`effect-${nodeId}`);const f={id,section_index:si,section_id:sm.id||(sec?.getAttribute?.('data-id')||`section-${si+1}`),kind:'effect',label:src.label||'Visual Effect',value:src.effect||'effect',attribute:'data-settings',node_id:nodeId,media_role:'effect',effect_type:src.effect||'',runtime_discovered:true};native.schema.fields.push(f);if(Array.isArray(sm.field_ids)&&!sm.field_ids.includes(id))sm.field_ids.push(id);native.values[id]=f.value;changed=true}}
   }
   if(baseChanged)native.baseHtml=serialize(baseDoc);
   if(changed){native.schema.field_count=native.schema.fields.length;try{localStorage.setItem(DRAFT_KEY,JSON.stringify({schema:native.schema,baseHtml:native.baseHtml,manifest:native.manifest,values:native.values}))}catch{}}
   return changed
 }
 let recoveryTimer=0;
 function setDirty(msg='Perubahan belum di-APPLY'){isDirty=true;dirty.textContent=msg;clearTimeout(recoveryTimer);recoveryTimer=setTimeout(saveRecovery,450)}
 function captureState(){return {values:deep(native?.values||{}),transforms:deep(transforms),assets:new Map(generatedAssets),selected:selectedFieldId}}
 function pushHistory(){if(!native||suspendHistory)return;history.push(captureState());if(history.length>80)history.shift();future.length=0;updateHistoryButtons()}
 function restoreState(st){if(!st||!native)return;suspendHistory=true;native.values=deep(st.values||{});for(const k of Object.keys(transforms))delete transforms[k];Object.assign(transforms,deep(st.transforms||{}));generatedAssets.clear();for(const [k,v] of (st.assets||new Map()))generatedAssets.set(k,v);selectedFieldId=st.selected||'';suspendHistory=false;setDirty();renderNativeEditor();renderPreview(true);renderInspector();updateHistoryButtons()}
 function undo(){if(!history.length)return;future.push(captureState());restoreState(history.pop())}
 function redo(){if(!future.length)return;history.push(captureState());restoreState(future.pop())}
 function updateHistoryButtons(){document.querySelectorAll('[data-history="undo"]').forEach(b=>b.disabled=!history.length);document.querySelectorAll('[data-history="redo"]').forEach(b=>b.disabled=!future.length)}
 document.addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey))return;const k=e.key.toLowerCase();if(k==='z'){e.preventDefault();e.shiftKey?redo():undo()}else if(k==='y'){e.preventDefault();redo()}});
 function injectEditorParityPatch(doc,{forExport=false}={}){
   doc.querySelectorAll('[data-dini-anif-editor-parity],[data-dini-anif-action-runtime]').forEach(n=>n.remove());
   // Keep the source <base> untouched in Live Editor so relative source JS/CSS keeps the same runtime as Fetch Preview.
   // Only exported ZIPs must resolve generated/local assets against the package root.
   const base=doc.querySelector('base');if(forExport&&base)base.setAttribute('href','./');
   const st=doc.createElement('style');st.setAttribute('data-dini-anif-editor-parity','v180');st.textContent=`
     html.native-opened,html.native-opened body{overflow-y:auto!important;overflow-x:clip!important;height:auto!important;touch-action:pan-y!important}
     .elementor-top-section[data-native-preserve-layout],.elementor-section[data-native-preserve-layout],.elementor-container[data-native-preserve-layout],.elementor-column[data-native-preserve-layout]{transform:none!important}
     [data-native-node-id].native-selected-outline{outline:2px solid #d8b86b!important;outline-offset:2px!important}
     #dini-anifActionToast{position:fixed;left:50%;bottom:max(24px,env(safe-area-inset-bottom));z-index:2147483646;max-width:min(88vw,420px);padding:11px 16px;border-radius:999px;background:rgba(20,22,26,.94);color:#fff;font:600 13px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 14px 42px rgba(0,0,0,.34);backdrop-filter:blur(14px);opacity:0;transform:translate(-50%,12px) scale(.96);pointer-events:none;transition:.25s ease}
     #dini-anifActionToast.show{opacity:1;transform:translate(-50%,0) scale(1)}
     #dini-anifActionToast.error{background:rgba(120,28,28,.96)}
   `;doc.head.appendChild(st);
   const dt=(native?.schema?.fields||[]).find(f=>f.kind==='datetime');
   const dtValue=dt?(native.values[dt.id]??dt.value??''):'';
   const runtime=doc.createElement('script');runtime.setAttribute('data-dini-anif-action-runtime','v180');runtime.textContent=`(()=>{
     const CAL=${JSON.stringify(String(dtValue||''))};
     let tt=0;const toast=(m,bad=false)=>{let x=document.getElementById('dini-anifActionToast');if(!x){x=document.createElement('div');x.id='dini-anifActionToast';x.setAttribute('role','status');x.setAttribute('aria-live','polite');document.body.appendChild(x)}clearTimeout(tt);x.textContent=m;x.className=bad?'error show':'show';tt=setTimeout(()=>x.className='',2200)};
     const copy=async v=>{v=String(v||'').trim();if(!v)throw new Error('Data yang akan disalin kosong');if(navigator.clipboard&&isSecureContext)return navigator.clipboard.writeText(v);const t=document.createElement('textarea');t.value=v;t.style.cssText='position:fixed;opacity:0;pointer-events:none';document.body.appendChild(t);t.select();const ok=document.execCommand('copy');t.remove();if(!ok)throw new Error('Clipboard tidak tersedia')};
     const fmt=d=>{const p=n=>String(n).padStart(2,'0');return d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+'T'+p(d.getHours())+p(d.getMinutes())+'00'};
     const calendar=()=>{let d=new Date(CAL);if(Number.isNaN(d.getTime()))return '';const e=new Date(d.getTime()+4*3600000),u=new URL('https://www.google.com/calendar/render');u.searchParams.set('action','TEMPLATE');u.searchParams.set('text',(document.title||'Wedding Invitation').replace(/\\s*[|–-].*$/,''));u.searchParams.set('dates',fmt(d)+'/'+fmt(e));u.searchParams.set('ctz','Asia/Jakarta');return u.toString()};
     document.addEventListener('click',async e=>{
       const copyBtn=e.target.closest?.('[data-copy],.copy-btn,.elementor-widget-weddingpress-copy-text .elementor-button');
       if(copyBtn){e.preventDefault();e.stopImmediatePropagation();const w=copyBtn.closest('.elementor-widget-weddingpress-copy-text'),v=copyBtn.getAttribute('data-copy')||w?.querySelector('.copy-content,.spancontent')?.textContent||'';try{await copy(v);const label=(copyBtn.textContent||'').toLowerCase();toast(label.includes('alamat')?'Alamat berhasil disalin ✅':'Nomor rekening berhasil disalin ✅')}catch(err){toast('Gagal menyalin. Coba lagi.',true)}return}
       const a=e.target.closest?.('a,button,[role="button"]');if(!a)return;const text=(a.textContent||'').replace(/\\s+/g,' ').trim().toLowerCase(),href=a.getAttribute?.('href')||'';
       if(/save\\s*the\\s*date|simpan\\s*tanggal/.test(text)||/google\\.(com|co\\.id)\\/calendar\\/render|calendar\\.google\\.com/i.test(href)){const u=calendar()||href;if(u){e.preventDefault();e.stopImmediatePropagation();window.open(u,'_blank','noopener');toast('Save The Date siap ✅')}return}
     },true);
   })();`;doc.body.appendChild(runtime);

   // V1.8.0 — Supabase Live Forms: RSVP + Ucapan/Doa + Gift Confirm/proof upload.
   // Publishable key is intentionally client-side; RLS/storage policies are the security boundary.
   const sbUrl='https://jfvmcerrsxjvbiogfqes.supabase.co';
   const sbKey='sb_publishable_3IqSDxkpxCGiDpxAEwdsXQ_AsJpsC4W';
   let invitationId=String(native?.manifest?.invitation_id||'').trim();
   if(!invitationId){
     try{const u=new URL(native?.manifest?.source_url||location.href);invitationId='legacy-'+(u.pathname.split('/').filter(Boolean).pop()||'undangan')}catch{invitationId='legacy-undangan'}
     native.manifest.invitation_id=invitationId;
   }
   const live=doc.createElement('script');live.setAttribute('data-dini-anif-supabase-live','v180');live.textContent=`(()=>{
     const CFG={url:${JSON.stringify(sbUrl)},key:${JSON.stringify(sbKey)},invitationId:${JSON.stringify(invitationId)},bucket:'gift-proofs'};
     const H=(extra={})=>({apikey:CFG.key,Authorization:'Bearer '+CFG.key,'Content-Type':'application/json',...extra});
     const toast=(msg,bad=false)=>{let x=document.getElementById('dini-anifActionToast');if(!x){x=document.createElement('div');x.id='dini-anifActionToast';document.body.appendChild(x)}x.textContent=msg;x.className=(bad?'error ':'')+'show';clearTimeout(window.__ukSbToast);window.__ukSbToast=setTimeout(()=>x.className='',2600)};
     const errText=async r=>{let t='';try{t=await r.text()}catch{};try{const j=JSON.parse(t);return j.message||j.error_description||j.error||t}catch{return t||('HTTP '+r.status)}};
     const insert=async(table,payload)=>{const r=await fetch(CFG.url+'/rest/v1/'+table,{method:'POST',headers:H({Prefer:'return=representation'}),body:JSON.stringify(payload)});if(!r.ok)throw new Error(await errText(r));return r.json()};
     const select=async(path)=>{const r=await fetch(CFG.url+'/rest/v1/'+path,{headers:H()});if(!r.ok)throw new Error(await errText(r));return r.json()};
     const cleanFile=n=>String(n||'bukti').replace(/[^a-z0-9._-]+/gi,'-').replace(/^-+|-+$/g,'').slice(-90)||'bukti';
     const uploadProof=async file=>{if(!file)return null;if(file.size>5*1024*1024)throw new Error('Bukti transfer maksimal 5 MB');const ok=/^(image\/(jpeg|png|webp)|application\/pdf)$/i.test(file.type||'');if(!ok)throw new Error('Format bukti harus JPG, PNG, WebP, atau PDF');const path=CFG.invitationId+'/'+Date.now()+'-'+Math.random().toString(36).slice(2,9)+'-'+cleanFile(file.name);const r=await fetch(CFG.url+'/storage/v1/object/'+CFG.bucket+'/'+path,{method:'POST',headers:{apikey:CFG.key,Authorization:'Bearer '+CFG.key,'Content-Type':file.type||'application/octet-stream','x-upsert':'false'},body:file});if(!r.ok)throw new Error(await errText(r));return path};
     const field=(form,needle)=>{const ns=needle.toLowerCase();return [...form.elements].find(el=>String(el.name||el.id||el.placeholder||'').toLowerCase().includes(ns))};
     const val=(form,needle)=>String(field(form,needle)?.value||'').trim();
     const setBusy=(form,busy,label)=>{const b=form.querySelector('button[type="submit"],input[type="submit"]');if(!b)return;b.disabled=busy;if(b.tagName==='INPUT'){if(!b.dataset.ukLabel)b.dataset.ukLabel=b.value;b.value=busy?'Mengirim…':(b.dataset.ukLabel||label||'Kirim')}else{if(!b.dataset.ukLabel)b.dataset.ukLabel=b.textContent;b.textContent=busy?'Mengirim…':(b.dataset.ukLabel||label||'Kirim')}};
     const attendance=v=>/tidak|no|absen/i.test(v)?'tidak_hadir':(/ragu|maybe/i.test(v)?'ragu':'hadir');
     const count=v=>Math.max(1,Math.min(20,Number(String(v||'1').match(/\d+/)?.[0]||1)));

     // RSVP — source Elementor form identified by attendance selector/label.
     [...document.querySelectorAll('form')].forEach(form=>{
       const text=(form.textContent||'').replace(/\s+/g,' ');
       const isRsvp=/konfirmasi\s*kehadiran|\brsvp\b/i.test(text)||[...form.elements].some(el=>/konfirmasikehadiran|attendance|kehadiran/i.test(el.name||el.id||''));
       if(!isRsvp||form.dataset.ukSbBound)return;form.dataset.ukSbBound='rsvp';form.removeAttribute('action');
       form.addEventListener('submit',async e=>{e.preventDefault();e.stopImmediatePropagation();setBusy(form,true);try{
         const name=val(form,'nama')||val(form,'guest_name')||val(form,'name');if(!name)throw new Error('Nama wajib diisi');
         const attend=val(form,'konfirmasikehadiran')||val(form,'attendance')||val(form,'kehadiran')||'hadir';
         const guests=val(form,'jumlah')||val(form,'guest_count')||'1';
         const message=val(form,'message')||val(form,'pesan')||'';
         await insert('invitation_rsvps',{invitation_id:CFG.invitationId,guest_name:name,attendance:attendance(attend),guest_count:count(guests),message:message||null});
         form.reset();toast('RSVP berhasil dikirim ✅');
       }catch(err){toast('RSVP gagal: '+err.message,true)}finally{setBusy(form,false)}},true);
     });

     // Gift Confirm — source Elementor form with bank/nominal/proof fields.
     [...document.querySelectorAll('form')].forEach(form=>{
       const text=(form.textContent||'').replace(/\s+/g,' ');
       const isGift=/nama\s*bank|nominal|bukti\s*(tf|transfer)|gift\s*confirm/i.test(text)&&([...form.elements].some(el=>/buktitf|proof|bukti/i.test(el.name||el.id||'')));
       if(!isGift||form.dataset.ukSbBound)return;form.dataset.ukSbBound='gift';form.removeAttribute('action');
       form.addEventListener('submit',async e=>{e.preventDefault();e.stopImmediatePropagation();setBusy(form,true);try{
         const name=val(form,'nama')||val(form,'guest_name')||val(form,'name');
         const bank=val(form,'namabank')||val(form,'bank_name')||val(form,'bank');
         const rawAmount=val(form,'nominal')||val(form,'amount');const amountDigits=rawAmount.replace(/[^0-9]/g,'');
         const note=val(form,'ucapan')||val(form,'note')||val(form,'message');
         const fi=[...form.elements].find(el=>el.type==='file');const file=fi?.files?.[0]||null;
         const proof=await uploadProof(file);
         await insert('gift_confirmations',{invitation_id:CFG.invitationId,guest_name:name||null,bank_name:bank||null,amount:amountDigits?Number(amountDigits):null,note:note||null,proof_path:proof});
         form.reset();toast('Konfirmasi gift berhasil dikirim ✅');
       }catch(err){toast('Konfirmasi gift gagal: '+err.message,true)}finally{setBusy(form,false)}},true);
     });

     // Ucapan & Doa — replace the closed WordPress comment form with Dini Anif/Supabase.
     const setupWishes=()=>{
       const wrapper=document.querySelector('.cui-wrapper');if(!wrapper||wrapper.dataset.ukSbWishes==='1')return;wrapper.dataset.ukSbWishes='1';wrapper.classList.remove('cui-comments-closed');
       const wrapComments=wrapper.querySelector('.cui-wrap-comments');if(wrapComments)wrapComments.style.setProperty('display','block','important');
       const host=wrapper.querySelector('.cui-container-form')||wrapper;
       host.innerHTML='<form class="uk-live-wish-form"><input name="guest_name" type="text" maxlength="80" required placeholder="Nama"><textarea name="message" maxlength="1000" required placeholder="Ucapan & Doa"></textarea><button type="submit">Kirim Ucapan</button></form><div class="uk-live-wish-status" aria-live="polite"></div>';
       const form=host.querySelector('form');form.addEventListener('submit',async e=>{e.preventDefault();e.stopImmediatePropagation();setBusy(form,true);try{const fd=new FormData(form),name=String(fd.get('guest_name')||'').trim(),message=String(fd.get('message')||'').trim();if(name.length<2||message.length<2)throw new Error('Nama dan ucapan wajib diisi');await insert('guestbook_messages',{invitation_id:CFG.invitationId,guest_name:name,message,is_approved:true});form.reset();toast('Ucapan & doa berhasil dikirim ✅');await loadWishes()}catch(err){toast('Ucapan gagal: '+err.message,true)}finally{setBusy(form,false)}},true);
       loadWishes();
     };
     const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
     async function loadWishes(){const wrapper=document.querySelector('.cui-wrapper');if(!wrapper)return;const list=wrapper.querySelector('.cui-container-comments')||(()=>{const u=document.createElement('ul');u.className='cui-container-comments';wrapper.appendChild(u);return u})();try{const q='guestbook_messages?invitation_id=eq.'+encodeURIComponent(CFG.invitationId)+'&is_approved=eq.true&select=guest_name,message,created_at&order=created_at.desc&limit=100';const rows=await select(q);list.innerHTML=rows.map(w=>'<li class="cui-item-comment uk-live-wish"><div class="uk-live-wish-avatar">♡</div><div class="uk-live-wish-body"><strong>'+esc(w.guest_name)+'</strong><p>'+esc(w.message)+'</p><small>'+new Date(w.created_at).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'})+'</small></div></li>').join('');const link=wrapper.querySelector('.cui-link span');if(link)link.textContent=String(rows.length)}catch(err){const st=wrapper.querySelector('.uk-live-wish-status');if(st)st.textContent='Ucapan belum dapat dimuat.'}}
     setupWishes();
     addEventListener('load',setupWishes,{once:true});
   })();`;doc.body.appendChild(live);
   const liveStyle=doc.createElement('style');liveStyle.setAttribute('data-dini-anif-supabase-live','v180');liveStyle.textContent=`
     .uk-live-wish-form{display:grid;gap:10px;margin:10px 0 16px}.uk-live-wish-form input,.uk-live-wish-form textarea{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.5);border-radius:10px;padding:11px 12px;background:rgba(10,10,10,.42);color:inherit;font:inherit}.uk-live-wish-form textarea{min-height:92px;resize:vertical}.uk-live-wish-form button{border:0;border-radius:10px;padding:11px 16px;cursor:pointer;font:700 14px/1.2 inherit}.uk-live-wish-form button:disabled{opacity:.65;cursor:wait}.uk-live-wish-status{font-size:12px;opacity:.8;margin-bottom:8px}.uk-live-wish{display:flex!important;gap:11px!important;padding:14px 10px!important;border-bottom:1px solid rgba(255,255,255,.35)!important;list-style:none!important;text-align:left!important}.uk-live-wish-avatar{flex:0 0 34px;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;border:1px solid currentColor}.uk-live-wish-body{min-width:0;flex:1}.uk-live-wish-body strong{display:block;margin-bottom:4px}.uk-live-wish-body p{margin:0 0 5px;white-space:pre-wrap;overflow-wrap:anywhere}.uk-live-wish-body small{opacity:.72;font-size:10px}
   `;doc.head.appendChild(liveStyle);
   const sc=doc.createElement('script');sc.setAttribute('data-dini-anif-editor-parity','v180');sc.textContent=`(()=>{const unlock=()=>{document.documentElement.classList.add('native-opened');document.body.classList.remove('stop-scrolling','locked-section');document.documentElement.style.setProperty('overflow-y','auto','important');document.body.style.setProperty('overflow-y','auto','important');document.documentElement.style.setProperty('overflow-x','clip','important');document.body.style.setProperty('overflow-x','clip','important');document.documentElement.style.setProperty('height','auto','important');document.body.style.setProperty('height','auto','important')};const btn=[...document.querySelectorAll('#openInvitation,#tombolbuka,.tombolbuka,[data-open-invitation],[data-action=\"open-invitation\"],button,a,[role=\"button\"]')].find(x=>x.matches('#openInvitation,#tombolbuka,.tombolbuka,[data-open-invitation],[data-action=\"open-invitation\"]')||/\bbuka\s+undangan\b/i.test((x.textContent||'').replace(/\s+/g,' ').trim()));if(btn)btn.addEventListener('click',()=>{setTimeout(unlock,120);setTimeout(unlock,1700);setTimeout(unlock,4700)},{capture:true});addEventListener('load',()=>{const c=document.querySelector('#cover');if(!c||getComputedStyle(c).display==='none')setTimeout(unlock,120)},{once:true})})();`;doc.body.appendChild(sc);
 }
 function applyTransform(el,f,t){
   if(!el||!t)return;
   const x=Number.isFinite(Number(t.x))?Number(t.x):50,y=Number.isFinite(Number(t.y))?Number(t.y):50,scale=Math.max(.25,Math.min(3,Number(t.scale)||1)),fit=t.fit||'cover',rotate=Number(t.rotate)||0;
   if(f.kind==='image'){
     el.style.objectPosition=`${x}% ${y}%`;el.style.transformOrigin=`${x}% ${y}%`;el.style.transform=`scale(${scale}) rotate(${rotate}deg)`;el.style.objectFit=fit==='fill'?'fill':fit;
   }else if(f.kind==='background'){
     if(f.source_location==='external-css'&&f.css_selector){window.DiniVisualResolver?.upsertCssBackgroundOverride?.(el.ownerDocument,f,native?.values?.[f.id]??f.value??'',t);return}
     if(f.media_role==='pseudo-background'){ensurePseudoBackgroundRule(el.ownerDocument,f,native?.values?.[f.id]??f.value??'',t);return}
     // Source portraits can be CSS background-images rather than <img>. Treat them as real editable photo slots.
     // For normal backgrounds, "zoom" must alter background-size; transform:scale() would scale the whole section/content.
     el.style.setProperty('--native-bg-position',`${x}% ${y}%`);
     const pic=el.querySelector?.('[data-native-slide-bg]');
     if(pic){
       pic.style.backgroundPosition=`${x}% ${y}%`;pic.style.transformOrigin=`${x}% ${y}%`;pic.style.transform=`scale(${scale}) rotate(${rotate}deg)`;
       pic.style.backgroundSize=fit==='fill'?'100% 100%':fit;
     }else{
       el.style.backgroundPosition=`${x}% ${y}%`;
       if(Math.abs(scale-1)<.001){el.style.backgroundSize=fit==='fill'?'100% 100%':fit}
       else if(fit==='fill'){const pct=(scale*100).toFixed(2).replace(/\.00$/,'');el.style.backgroundSize=`${pct}% ${pct}%`}
       else {const pct=(scale*100).toFixed(2).replace(/\.00$/,'');el.style.backgroundSize=`${pct}% auto`;el.style.backgroundRepeat='no-repeat'}
     }
   }
 }
 function normalizeActionUrl(f,v){
   let raw=String(v??'').trim();if(!raw)return raw;
   const hint=String(f?.label||'').toLowerCase();
   if(/instagram/.test(hint) && !/^[a-z][a-z0-9+.-]*:/i.test(raw)){raw=raw.replace(/^@/,'').replace(/^\/+|\/+$/g,'');return 'https://www.instagram.com/'+raw+'/'}
   if(/whats?app|\bwa\b/.test(hint) && !/^[a-z][a-z0-9+.-]*:/i.test(raw)){let n=raw.replace(/\D/g,'');if(n.startsWith('0'))n='62'+n.slice(1);else if(!n.startsWith('62'))n='62'+n;return 'https://wa.me/'+n}
   if(/map|lokasi|location/.test(hint) && !/^[a-z][a-z0-9+.-]*:/i.test(raw))return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(raw);
   if(/website|live|stream|link/.test(hint) && !/^[a-z][a-z0-9+.-]*:/i.test(raw) && !raw.startsWith('#'))return 'https://'+raw.replace(/^\/+/, '');
   return raw;
 }
 function applyField(doc,f,v){const el=nodeFor(doc,f);if(!el)return false;
   if(f.kind==='text'){el.textContent=v}
   else if(f.kind==='datetime'){
     el.setAttribute(f.attribute||'data-date',v||'');
     const d=new Date(v);if(!Number.isNaN(d.getTime())){const pad=n=>String(n).padStart(2,'0'),fmt=x=>x.getFullYear()+pad(x.getMonth()+1)+pad(x.getDate())+'T'+pad(x.getHours())+pad(x.getMinutes())+'00';const end=new Date(d.getTime()+4*3600000);const sec=el.closest('.elementor-top-section,section')||el.parentElement;const cal=sec?.querySelector('a[href*=\"google.com/calendar/render\"],a[href*=\"calendar.google.com\"]');if(cal){try{const u=new URL(cal.href);u.searchParams.set('dates',fmt(d)+'/'+fmt(end));u.searchParams.set('ctz','Asia/Jakarta');cal.href=u.href}catch{}}}
   }
   else if(f.kind==='image'){
     el.setAttribute('src',v||'');el.removeAttribute('srcset');el.removeAttribute('sizes');el.setAttribute('data-src',v||'');el.removeAttribute('data-lazy-src');
     const picture=el.closest('picture');picture?.querySelectorAll('source').forEach(s=>{s.removeAttribute('srcset');s.removeAttribute('data-srcset')});
   }
   else if(f.kind==='background'){
     if(f.media_role==='gallery'){
       el.style.setProperty('background-image',v?`url("${String(v).replaceAll('"','%22')}")`:'none','important');
       el.style.setProperty('background-size','cover','important');
       el.style.setProperty('background-position','center center','important');
       el.style.setProperty('background-repeat','no-repeat','important');
       el.setAttribute('data-thumbnail',v||'');el.setAttribute('data-native-gallery-image','1');
       const a=el.closest?.('a.e-gallery-item,a.elementor-gallery-item');if(a){a.setAttribute('data-native-gallery-item','1');a.setAttribute('href',v||'#');}
     }else if(f.media_role==='slideshow' || Number.isInteger(f.slide_index)){
       const raw=el.getAttribute('data-settings')||'{}';let cfg={};try{cfg=JSON.parse(raw.replace(/&quot;/g,'"'))}catch{}
       const gal=Array.isArray(cfg.background_slideshow_gallery)?cfg.background_slideshow_gallery:[];const idx=Number(f.slide_index)||0;while(gal.length<=idx)gal.push({url:''});gal[idx]={...(gal[idx]||{}),url:v};cfg.background_slideshow_gallery=gal;el.setAttribute('data-settings',JSON.stringify(cfg));
       const layer=el.querySelector?.('.elementor-background-slideshow[data-native-slideshow]');if(layer){let urls=[];try{urls=JSON.parse(layer.getAttribute('data-native-slideshow-urls')||'[]')}catch{};while(urls.length<=idx)urls.push('');urls[idx]=v;layer.setAttribute('data-native-slideshow-urls',JSON.stringify(urls));if(idx===0){const pic=layer.querySelector('[data-native-slide-bg]');if(pic)pic.style.backgroundImage=v?`url("${String(v).replaceAll('"','%22')}")`:''}}
     }else if(f.source_location==='external-css'&&f.css_selector){
       window.DiniVisualResolver?.upsertCssBackgroundOverride?.(doc,f,v);
       el.setAttribute('data-native-true-replace','source-css');
     }else if(f.source_location==='elementor-data-settings'&&f.source_property==='background_image.url'){
       const host=f.source_element_id?doc.querySelector(`[data-id="${CSS.escape(f.source_element_id)}"]`):null;
       if(host){let cfg={};try{cfg=JSON.parse((host.getAttribute('data-settings')||'{}').replace(/&quot;/g,'"'))}catch{};cfg.background_background=cfg.background_background||'classic';cfg.background_image={...(cfg.background_image||{}),url:v};host.setAttribute('data-settings',JSON.stringify(cfg))}
       el.style.backgroundImage=v?`url("${String(v).replaceAll('"','%22')}")`:'';
       el.setAttribute('data-native-true-replace','elementor-settings');
     }else if(f.media_role==='pseudo-background'){
       ensurePseudoBackgroundRule(doc,f,v,transforms[f.id]);
     }else{
       const slide=el.querySelector?.('[data-native-slide-bg]');
       if(slide)slide.style.backgroundImage=v?`url("${String(v).replaceAll('"','%22')}")`:'';
       else if(Number.isInteger(Number(f.background_layer)) && (f.source_background_image||f.source_location==='external-css'||f.media_role==='decoration'||f.semantic_role==='cover-decoration')){
         const current=el.style.backgroundImage||f.source_background_image||'';
         const next=window.DiniVisualResolver?.replaceBackgroundLayer?.(current,Number(f.background_layer)||0,v) || (v?`url("${String(v).replaceAll('"','%22')}")`:'none');
         el.style.setProperty('background-image',next,'important');
         el.setAttribute('data-native-true-replace','1');
       }else el.style.backgroundImage=v?`url("${String(v).replaceAll('"','%22')}")`:'';
     }
   } else if(f.kind==='effect'){/* visual effect source is mapped/read-only; preserve authored runtime settings */}
   else {const at=f.attribute||({video:'src',audio:'src',url:'href',placeholder:'placeholder'}[f.kind]);if(at)el.setAttribute(at,f.kind==='url'?normalizeActionUrl(f,v):v)}
   applyTransform(el,f,transforms[f.id]);return true;
 }
 function refreshVisualManifest(){
   if(!native)return {version:1,sources:[]};
   const sources=(native.schema.fields||[]).filter(f=>['image','background','video','effect'].includes(f.kind)).map((f,i)=>({id:f.id,type:f.media_role||f.kind,url:['image','background','video'].includes(f.kind)?String(native.values[f.id]??f.value??''):'',element_id:f.source_element_id||'',node_id:f.node_id||'',owner_selector:f.owner_selector||'',render_target:f.css_selector||f.render_target||'',source_location:f.source_location||'',source_property:f.source_property||'',source_background_image:f.source_background_image||'',source_key:f.source_key||'',css_source:f.css_source||'',css_selector:f.css_selector||'',css_priority:f.css_priority||'',css_order:Number.isInteger(f.css_order)?f.css_order:null,css_specificity:f.css_specificity||'',media_query:f.media_query||'',at_rule_path:Array.isArray(f.at_rule_path)?f.at_rule_path:[],semantic_role:f.semantic_role||'',pseudo:f.pseudo||'',background_layer:Number(f.background_layer||0),slide_index:Number.isInteger(f.slide_index)?f.slide_index:null,duration:f.slideshow_duration??null,transition:f.slideshow_transition||'',transition_duration:f.slideshow_transition_duration??null,loop:f.slideshow_loop??null,ken_burns:f.ken_burns??null,ken_burns_direction:f.ken_burns_direction||'',effect:f.effect_type||'',label:f.label||`Visual ${i+1}`}));
   const vm={version:3,engine:'dini-source-graph-v3',updated_at:new Date().toISOString(),sources};
   const oldGraph=native.manifest?.source_graph||{};
   const graph={...oldGraph,version:3,engine:'dini-source-graph-v3',updated_at:new Date().toISOString(),visuals:sources,policy:{...(oldGraph.policy||{}),flatten_visuals:false,true_replace:true,preserve_hierarchy:true}};
   native.manifest={...(native.manifest||{}),visual_manifest:vm,source_graph:graph,visual_resolver:'dini-source-graph-v3',identity_sanitized:true};return vm;
 }
 function rebuildHtml({forExport=false}={}){const doc=parseNative(native.baseHtml);refreshVisualManifest();for(const f of native.schema.fields||[]){const a=generatedAssets.get(f.id);const v=a?(forExport?a.path:assetPreviewUrl(a)):(native.values[f.id]??f.value??'');applyField(doc,f,v)}for(const f of native.schema.fields||[]){if(transforms[f.id])applyTransform(nodeFor(doc,f),f,transforms[f.id])}if(forExport){doc.querySelectorAll('link[rel~="stylesheet"][href]').forEach(l=>{const local=localizedLinks.get(l.href)||localizedLinks.get(l.getAttribute('href'));if(local)l.setAttribute('href',local)})}window.DiniVisualResolver?.sanitizeRuntimeNoise?.(doc);window.DiniVisualResolver?.sanitizeIdentity(doc,{title:'Dini Anif — '+(currentTemplateRecord?.name||'Template'),favicon:'/assets/favicon.svg'});injectEditorParityPatch(doc,{forExport});return serialize(doc)}
 function assetPreviewUrl(a){if(!a?.blob)return a?.path||'';if(a.previewUrl)return a.previewUrl;const u=URL.createObjectURL(a.blob);a.previewUrl=u;objectUrls.add(u);return u}
 function liveDoc(){try{return frame.contentDocument}catch{return null}}
 function liveApply(id){const f=fieldById(id),doc=liveDoc();if(!f||!doc)return false;const a=generatedAssets.get(id);return applyField(doc,f,a?assetPreviewUrl(a):(native.values[id]??f.value??''))}
 function schedulePreview(){clearTimeout(previewTimer);previewTimer=setTimeout(()=>renderPreview(),300)}
 function installFrameBridge(){const doc=liveDoc();if(!doc)return;
   const runtimeAdded=ensureRuntimeCssBackgroundFields(doc);if(runtimeAdded){renderNativeEditor();renderInspector()}
   const rescan=()=>{const d=liveDoc();if(d&&ensureRuntimeCssBackgroundFields(d)){renderNativeEditor();renderInspector()}};
   [180,650,1400,2600].forEach(ms=>setTimeout(rescan,ms));
   // Elementor lazy-load toggles classes after the iframe becomes visible. Debounced rescans catch
   // those late computed backgrounds without continuously rebuilding the sidebar.
   let rescanTimer=0;const mo=new MutationObserver(()=>{clearTimeout(rescanTimer);rescanTimer=setTimeout(rescan,120)});
   try{mo.observe(doc.documentElement,{subtree:true,attributes:true,attributeFilter:['class','style','data-settings'],childList:true});setTimeout(()=>mo.disconnect(),6000)}catch{}
   if(!doc.getElementById('dini-anif-editor-hit-css')){const st=doc.createElement('style');st.id='dini-anif-editor-hit-css';st.textContent='[data-native-edit-id],[data-native-edit-ids],[data-native-node-id],[data-native-media-proxy]{cursor:pointer}';doc.head.appendChild(st)}
   doc.addEventListener('click',e=>{
     // V2.9 interaction priority:
     // 1) real "Buka Undangan" control must ALWAYS reach the template's native click handler.
     // 2) gallery/media controls are editable media and must NOT open their native lightbox.
     // 3) other native controls keep their original behavior.
     const interactive=e.target?.closest?.('a[href],button,input,textarea,select,option,label,form,[role="button"],[data-copy],.copy-btn,.elementor-widget-weddingpress-copy-text .elementor-button');
     const interactiveText=(interactive?.textContent||'').replace(/\s+/g,' ').trim();
     const opener=e.target?.closest?.('#openInvitation,#tombolbuka,.tombolbuka,[data-open-invitation],[data-action="open-invitation"]') || (interactive&&/\bbuka\s+undangan\b/i.test(interactiveText)?interactive:null);
     if(opener)return;

     let fs=[];const direct=editableNode(e.target);if(direct)fs=[...proxyFields(direct),...fieldsForNode(direct)];
     const hit=hitFieldsAtPoint(doc,e.clientX,e.clientY);
     selectedMediaStackIds=hit.filter(f=>['image','background','video','audio','effect'].includes(f.kind)).map(f=>f.id);
     if(hit.length&&!fs.some(f=>['image','background','video','audio'].includes(f.kind)))fs=hit
     const galleryHost=e.target?.closest?.('.gallery-item,[data-native-gallery-item],a.e-gallery-item,a.elementor-gallery-item');
     const media=fs.find(f=>['image','background','video','audio'].includes(f.kind))||hit.find(f=>['image','background','video','audio'].includes(f.kind));
     if(media&&(galleryHost||!interactive)){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();selectField(media.id,true);return}
     if(interactive)return;
     if(!fs.length)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();selectField(fs[0].id,true)
   },true);
   if(selectedFieldId)highlightSelection()}
 function renderPreview(force=false){
   if(!native){
     frame.removeAttribute('src');
     if(new URLSearchParams(location.search).get('mode')==='fetch'){
       frame.srcdoc='<!doctype html><html><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;color:#555;font:14px system-ui;text-align:center;padding:30px;box-sizing:border-box"><div><b>Belum ada snapshot Fetch yang cocok.</b><br><small>Kembali ke Source-Native Preview lalu klik Buka Editor.</small></div></body></html>';
     }else{
       frame.removeAttribute('srcdoc');frame.src='./invitation.html?editor=1';
     }
     return
   }
   if(!force&&frame.srcdoc&&liveDoc())return;
   const html=rebuildHtml();
   frame.onload=()=>{
     installFrameBridge();
     // A source can legitimately begin hidden while its own animation/runtime initializes.
     // Never replace it with invitation.html: doing so loads an unrelated template.
     setTimeout(()=>{
       try{
         const d=liveDoc(),b=d?.body;if(!b)return;
         const els=[...b.querySelectorAll('*')].filter(el=>{const cs=d.defaultView.getComputedStyle(el),r=el.getBoundingClientRect();return cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity||1)>0&&r.width>2&&r.height>2});
         if(!els.length){
           console.warn('Editor source is still initializing; preserving exact Fetch snapshot');
           editorToast('Source masih melakukan inisialisasi/animasi. Snapshot Fetch dipertahankan dan tidak diganti template lain.','info','Preview masih memuat');
           setTimeout(()=>{try{installFrameBridge()}catch{}},1200);
         }
       }catch(e){console.warn('source readiness guard',e)}
     },700)
   };
   frame.removeAttribute('src');frame.srcdoc='';requestAnimationFrame(()=>{frame.srcdoc=html})
 }
 function highlightSelection(){const doc=liveDoc();if(!doc)return;doc.querySelectorAll('.native-selected-outline').forEach(n=>n.classList.remove('native-selected-outline'));const f=fieldById(selectedFieldId),el=f&&nodeFor(doc,f);if(el){el.classList.add('native-selected-outline');try{el.scrollIntoView({block:'center',behavior:'smooth'})}catch{}}}
 function mediaAcceptFor(f,v){const x=String(v||'').toLowerCase().split('#')[0].split('?')[0];if(f.kind==='image'||f.kind==='background'||/\.(png|jpe?g|webp|gif|svg|avif)$/.test(x))return 'image/*';if(f.kind==='video'||/\.(mp4|webm|mov|m4v|ogv)$/.test(x))return 'video/*';if(f.kind==='audio'||/\.(mp3|wav|ogg|m4a|aac|flac)$/.test(x))return 'audio/*';if(f.kind==='url'&&(/\/wp-content\/uploads\//.test(x)||/\/uploads\//.test(x)))return '*/*';return ''}
 function assetLike(f,v){return !!mediaAcceptFor(f,v)}
 function safeAssetName(url,type,id){let n='';try{n=decodeURIComponent(new URL(url,location.href).pathname.split('/').pop()||'')}catch{};n=n.replace(/[^a-zA-Z0-9._-]+/g,'-').slice(-100);if(!n)n=`asset-${id}`;if(!/\.[a-z0-9]{2,5}$/i.test(n)){if(type?.startsWith('image/'))n+='.jpg';else if(type?.startsWith('video/'))n+='.mp4';else if(type?.startsWith('audio/'))n+='.mp3'}return n}
 async function fetchAssetBlob(url,onProgress){let offset=0,total=0,type='application/octet-stream',name='asset',parts=[];for(let guard=0;guard<500;guard++){const q=new URLSearchParams({url,offset:String(offset),size:'3000000'});const r=await fetch('/api/fetch-asset?'+q,{cache:'no-store'});if(!r.ok){let msg=`HTTP ${r.status}`;try{msg=(await r.json()).error||msg}catch{}throw Error(msg)}const b=await r.blob();if(!b.size)break;type=r.headers.get('content-type')||type;total=Number(r.headers.get('x-asset-total')||0)||total;try{name=decodeURIComponent(r.headers.get('x-asset-name')||name)}catch{}parts.push(b);offset+=b.size;onProgress?.(offset,total);if((total&&offset>=total)||b.size<3000000)break;if(r.headers.get('x-asset-range')!=='1')throw Error('Server sumber tidak mendukung download bertahap untuk asset besar.')}return {blob:new Blob(parts,{type}),name,total:total||offset,type}}
 async function generateAsset(fieldId,quiet=false){const f=fieldById(fieldId);if(!f)throw Error('Field asset tidak ditemukan.');const source=String(native.values[fieldId]??f.value??'').trim();if(!/^https?:\/\//i.test(source))throw Error('Asset ini bukan URL source yang bisa digenerate.');pushHistory();if(sourceAssetCache.has(source)){const a=sourceAssetCache.get(source);generatedAssets.set(fieldId,a);setDirty('Perubahan asset belum di-APPLY');liveApply(fieldId);renderNativeEditor();renderInspector();return a}const status=document.querySelector(`[data-asset-status="${CSS.escape(fieldId)}"]`);if(status){status.className='asset-status processing';status.textContent='Generating 0%…'}const a=await fetchAssetBlob(source,(done,total)=>{if(status)status.textContent=total?`Generating ${Math.min(99,Math.round(done/total*100))}%…`:`Generating ${(done/1024/1024).toFixed(1)} MB…`});a.name=safeAssetName(source,a.type,fieldId);a.path='assets/generated/'+fieldId+'-'+a.name;a.source=source;generatedAssets.set(fieldId,a);sourceAssetCache.set(source,a);setDirty('Perubahan asset belum di-APPLY');liveApply(fieldId);if(!quiet)editorToast(`${a.name} berhasil diambil (${(a.blob.size/1024/1024).toFixed(2)} MB).`,'success','Generate sukses');renderNativeEditor();renderInspector();return a}
 async function localizeStylesheets(progress){
   const doc=parseNative(native.baseHtml),links=[...doc.querySelectorAll('link[rel~="stylesheet"][href]')].map(l=>l.href||l.getAttribute('href')).filter(u=>/^https?:\/\//i.test(u));let done=0;
   for(let i=0;i<links.length;i++){
     const url=links[i];if(localizedLinks.has(url)){done++;continue}
     try{
       const src=await fetchAssetBlob(url),text=await src.blob.text(),depMap=new Map();
       const refs=[...text.matchAll(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi)].map(m=>m[2]).filter(x=>x&&!/^(data:|blob:|#)/i.test(x));
       const unique=[...new Set(refs)].slice(0,120);
       for(let j=0;j<unique.length;j++){
         const ref=unique[j];let abs;try{abs=new URL(ref,url).href}catch{continue}if(!/^https?:\/\//i.test(abs))continue;
         try{const a=await fetchAssetBlob(abs),name=safeAssetName(abs,a.type,'dep'+i+'-'+j),path='assets/source/deps/'+i+'-'+j+'-'+name;const pa={...a,name,path,source:abs};projectAssets.set(path,pa);depMap.set(ref,'../deps/'+i+'-'+j+'-'+name)}catch(e){console.warn('CSS dependency skip',abs,e.message)}
       }
       let rewritten=text;for(const [from,to] of depMap)rewritten=rewritten.split(from).join(to);
       const name='style-'+String(i+1).padStart(2,'0')+'.css',path='assets/source/css/'+name,blob=new Blob([rewritten],{type:'text/css'});projectAssets.set(path,{blob,name,path,type:'text/css',source:url});localizedLinks.set(url,path);done++;progress?.(done,links.length);
     }catch(e){console.warn('Stylesheet localization skip',url,e.message)}
   }
   return {done,total:links.length};
 }
 async function generateAllAssets(){if(!native)return;const fs=(native.schema.fields||[]).filter(f=>assetLike(f,native.values[f.id]??f.value??'')&&/^https?:\/\//i.test(String(native.values[f.id]??f.value??'')));const t=editorToast(`0/${fs.length} field asset…`,'loading','Generate Semua Aset');let ok=0;try{for(const f of fs){await generateAsset(f.id,true);ok++;t.querySelector('small').textContent=`${ok}/${fs.length} field · ${sourceAssetCache.size} file unik…`}const css=await localizeStylesheets((d,n)=>t.querySelector('small').textContent=`Media ${ok}/${fs.length} · CSS ${d}/${n}…`);finishEditorToast(t,`${ok} field media + ${css.done}/${css.total} stylesheet dilokalkan.`,'success','Generate selesai')}catch(e){finishEditorToast(t,`${ok}/${fs.length} selesai. ${e.message}`,'error','Generate berhenti');throw e}}
 function control(f){const v=native.values[f.id]??f.value??'',label=esc(f.label||f.id),accept=mediaAcceptFor(f,v);if(f.kind==='text')return `<div class="e-field"><label>${label}</label><textarea rows="2" data-native-field="${attr(f.id)}">${esc(v)}</textarea></div>`;if(accept){const a=generatedAssets.get(f.id),fileLabel=a?.name||(String(v).split('?')[0].split('/').pop()||f.kind||'Asset');return `<div class="e-field asset-field" data-control-field="${attr(f.id)}"><label>${label}</label><div class="asset-card"><div class="asset-meta"><strong>${esc(fileLabel)}</strong><span data-asset-status="${attr(f.id)}" class="asset-status ${a?'success':'pending'}">${a?'✓ Siap export':'Source / belum lokal'}</span></div><div class="asset-actions"><button type="button" data-native-generate="${attr(f.id)}">${a?'Generate Ulang':'Generate Asset'}</button><button type="button" data-native-upload="${attr(f.id)}" data-accept="${attr(accept)}">Upload / Ganti</button><button type="button" data-native-delete="${attr(f.id)}">Hapus</button><button type="button" data-native-open="${attr(f.id)}">Buka</button></div></div></div>`}if(f.kind==='effect')return `<div class="e-field visual-effect-field"><label>${label}</label><div class="asset-card"><div class="asset-meta"><strong>${esc(f.effect_type||f.media_role||'Visual Effect')}</strong><span class="asset-status success">✓ Source effect dipertahankan</span></div></div></div>`;if(f.kind==='url')return `<div class="e-field"><label>${label}</label><div class="upload-row"><input data-native-field="${attr(f.id)}" value="${attr(v)}"><button type="button" data-native-open="${attr(f.id)}">Buka Link</button></div></div>`;return `<div class="e-field"><label>${label}</label><input data-native-field="${attr(f.id)}" value="${attr(v)}"></div>`}
 function captureAccordion(){return {open:[...sections.querySelectorAll('details[open]')].map(d=>d.dataset.sectionId),scroll:sections.closest('.editor-panel')?.scrollTop||0}}
 function restoreAccordion(st){if(!st)return;for(const id of st.open||[]){const d=sections.querySelector(`details[data-section-id="${CSS.escape(id)}"]`);if(d)d.open=true}requestAnimationFrame(()=>{const p=sections.closest('.editor-panel');if(p)p.scrollTop=st.scroll||0})}
 function renderNativeEditor(){const st=captureAccordion();if(!native){sections.innerHTML='<div class="native-welcome"><strong>Import Rebuild ZIP</strong><p>Setelah import, field akan dibuat otomatis. Klik elemen di preview untuk edit visual.</p></div>';return}sections.innerHTML=(native.schema.sections||[]).map((s,i)=>{const fs=(native.schema.fields||[]).filter(f=>f.section_index===i);if(!fs.length)return'';return `<details class="editor-section" data-section-id="${attr(s.id||String(i))}" ${i<2?'open':''}><summary>${esc(s.label||s.id||`Section ${i+1}`)} <span class="native-count">${fs.length}</span></summary><div class="editor-fields">${fs.map(control).join('')}</div></details>`}).join('');bindControls();restoreAccordion(st);updateHistoryButtons()}
 function bindControls(){sections.querySelectorAll('[data-native-field]').forEach(el=>{let before='';el.addEventListener('focus',()=>before=el.value);el.addEventListener('input',()=>{const id=el.dataset.nativeField;if(before!==null&&!el.dataset.hist){pushHistory();el.dataset.hist='1'}native.values[id]=el.value;setDirty();if(!liveApply(id))schedulePreview();if(selectedFieldId===id)renderInspector()});el.addEventListener('blur',()=>delete el.dataset.hist)});sections.querySelectorAll('[data-native-generate]').forEach(btn=>btn.onclick=async()=>{btn.disabled=true;try{await generateAsset(btn.dataset.nativeGenerate)}catch(e){editorToast(e.message,'error','Generate gagal')}finally{btn.disabled=false}});sections.querySelectorAll('[data-native-upload]').forEach(btn=>btn.onclick=()=>uploadFor(btn.dataset.nativeUpload,btn.dataset.accept));sections.querySelectorAll('[data-native-delete]').forEach(btn=>btn.onclick=()=>deleteFieldAsset(btn.dataset.nativeDelete));sections.querySelectorAll('[data-native-open]').forEach(btn=>btn.onclick=()=>openField(btn.dataset.nativeOpen))}
 function uploadFor(id,accept){const inp=document.createElement('input');inp.type='file';inp.accept=accept||'*/*';inp.onchange=()=>{const f=inp.files?.[0];if(!f)return;pushHistory();const name=f.name.replace(/[^a-zA-Z0-9._-]+/g,'-');generatedAssets.set(id,{blob:f,name,type:f.type||'application/octet-stream',path:'assets/generated/'+id+'-'+name,source:'upload'});setDirty('Perubahan asset belum di-APPLY');liveApply(id);renderNativeEditor();selectField(id,false);editorToast(`${f.name} siap dan akan ikut Production ZIP.`,'success','Upload sukses')};inp.click()}
 function deleteFieldAsset(id){pushHistory();generatedAssets.delete(id);native.values[id]='';setDirty();liveApply(id);renderNativeEditor();renderInspector()}
 function openField(id){const a=generatedAssets.get(id),v=a?assetPreviewUrl(a):String(native.values[id]??fieldById(id)?.value??'');if(v)window.open(v,'_blank','noopener')}
 function selectField(id,scrollSidebar=false){selectedFieldId=id;selectionBadge.textContent=fieldById(id)?.label||id;inspector?.classList.add('is-open');highlightSelection();renderInspector();if(scrollSidebar){const c=sections.querySelector(`[data-control-field="${CSS.escape(id)}"],[data-native-field="${CSS.escape(id)}"]`)?.closest('.editor-section');if(c){c.open=true;c.scrollIntoView({block:'nearest'})}}}
 function renderInspector(){if(!native||!selectedFieldId){inspectorBody.className='inspector-empty';inspectorBody.innerHTML='Klik teks, foto, background, tombol, atau elemen editable di preview.';return}const f=fieldById(selectedFieldId);if(!f)return;const v=native.values[f.id]??f.value??'',accept=mediaAcceptFor(f,v),t=transforms[f.id]||{x:50,y:50,scale:1,rotate:0,fit:f.kind==='image'?'cover':'cover'};const siblings=(native.schema.fields||[]).filter(x=>x.node_id&&x.node_id===f.node_id);inspectorBody.className='';let html=`<div class="history-actions"><button data-history="undo">↶ Undo</button><button data-history="redo">↷ Redo</button></div><div class="inspector-group"><h3>${esc(f.kind==='background'?'FOTO / BACKGROUND':f.kind)} · ${esc(f.label||f.id)}</h3>${f.kind==='background'?`<div class="inspector-hint"><b>${esc(f.semantic_role||f.media_role||'background')}</b>${f.source_location?` · ${esc(f.source_location)}`:''}${f.media_query?`<br>Responsive: ${esc(f.media_query)}`:''}${f.owner_selector?`<br>Owner: ${esc(f.owner_selector)}`:''}${f.css_selector?`<br>Selector: ${esc(f.css_selector)}`:''}<br>Upload/Ganti melakukan true replace pada source layer ini, bukan menambah layer baru.</div>`:''}${selectedMediaStackIds.length>1?`<div class="inspector-hint"><b>Layer di titik ini</b><br>Pilih layer depan/belakang yang ingin diedit.</div><div class="inspector-actions">${selectedMediaStackIds.map((id,i)=>{const x=fieldById(id);return x?`<button data-inspector-stack="${attr(id)}" class="${id===f.id?'accent':''}">Layer ${i+1} · ${esc(x.semantic_role||x.media_role||x.kind)} · ${esc(x.label||x.kind)}</button>`:''}).join('')}</div>`:''}${siblings.length>1?`<div class="inspector-actions">${siblings.map((x,i)=>`<button data-inspector-sibling="${attr(x.id)}" class="${x.id===f.id?'accent':''}">${esc(x.kind==='background'?`Gambar ${i+1}`:(x.label||x.kind))}</button>`).join('')}</div>`:''}`;if(f.kind==='effect')html+=`<div class="inspector-hint">Effect source <b>${esc(f.effect_type||f.media_role||'visual')}</b> dipertahankan dari template dan ikut layer stack. Kontrol effect tidak menimpa data-settings asli.</div>`;else if(f.kind==='text'||(!accept&&f.kind!=='url'))html+=`<div class="inspector-row"><label>Isi</label><textarea rows="4" data-inspector-value>${esc(v)}</textarea></div>`;else if(f.kind==='url')html+=`<div class="inspector-row"><label>Link</label><input data-inspector-value value="${attr(v)}"></div>`;if(accept)html+=`<div class="inspector-actions"><button class="accent" data-inspector-generate>Generate</button><button data-inspector-upload>Upload / Ganti</button><button class="danger" data-inspector-delete>Hapus</button><button data-inspector-open>Buka</button></div>`;if(f.kind==='image'||f.kind==='background')html+=`<div class="transform-grid"><div class="inspector-row"><label>Posisi X</label><input type="range" min="0" max="100" value="${t.x}" data-transform="x"></div><div class="inspector-row"><label>Posisi Y</label><input type="range" min="0" max="100" value="${t.y}" data-transform="y"></div><div class="inspector-row"><label>Zoom</label><input type="range" min="0.5" max="2.5" step="0.05" value="${t.scale}" data-transform="scale"></div>${f.kind==='image'?`<div class="inspector-row"><label>Rotate</label><input type="range" min="-30" max="30" step="1" value="${t.rotate||0}" data-transform="rotate"></div>`:''}</div><div class="inspector-row"><label>Fit</label><select data-transform="fit"><option ${t.fit==='cover'?'selected':''}>cover</option><option ${t.fit==='contain'?'selected':''}>contain</option><option ${t.fit==='fill'?'selected':''}>fill</option></select></div><div class="inspector-actions"><button data-transform-center>Center</button><button data-transform-reset>Reset</button></div>`;html+='</div>';inspectorBody.innerHTML=html;updateHistoryButtons();const val=inspectorBody.querySelector('[data-inspector-value]');if(val){let hist=false;val.oninput=()=>{if(!hist){pushHistory();hist=true}native.values[f.id]=val.value;setDirty();liveApply(f.id);const sidebar=sections.querySelector(`[data-native-field="${CSS.escape(f.id)}"]`);if(sidebar)sidebar.value=val.value};val.onblur=()=>hist=false}inspectorBody.querySelectorAll('[data-inspector-stack]').forEach(b=>b.addEventListener('click',()=>selectField(b.dataset.inspectorStack,false)));inspectorBody.querySelectorAll('[data-inspector-sibling]').forEach(b=>b.addEventListener('click',()=>selectField(b.dataset.inspectorSibling,false)));inspectorBody.querySelector('[data-inspector-generate]')?.addEventListener('click',()=>generateAsset(f.id).catch(e=>editorToast(e.message,'error','Generate gagal')));inspectorBody.querySelector('[data-inspector-upload]')?.addEventListener('click',()=>uploadFor(f.id,accept));inspectorBody.querySelector('[data-inspector-delete]')?.addEventListener('click',()=>deleteFieldAsset(f.id));inspectorBody.querySelector('[data-inspector-open]')?.addEventListener('click',()=>openField(f.id));inspectorBody.querySelectorAll('[data-transform]').forEach(el=>{let hist=false;el.oninput=()=>{if(!hist){pushHistory();hist=true}const tt=transforms[f.id]||(transforms[f.id]={x:50,y:50,scale:1,rotate:0,fit:'cover'});tt[el.dataset.transform]=el.tagName==='SELECT'?el.value:Number(el.value);setDirty();liveApply(f.id)};el.onchange=()=>hist=false});inspectorBody.querySelector('[data-transform-center]')?.addEventListener('click',()=>{pushHistory();transforms[f.id]={...(transforms[f.id]||{}),x:50,y:50};setDirty();liveApply(f.id);renderInspector()});inspectorBody.querySelector('[data-transform-reset]')?.addEventListener('click',()=>{pushHistory();delete transforms[f.id];setDirty();liveApply(f.id);renderInspector()});inspectorBody.querySelector('[data-history="undo"]')?.addEventListener('click',undo);inspectorBody.querySelector('[data-history="redo"]')?.addEventListener('click',redo)}
 function openDB(){return new Promise((res,rej)=>{const q=indexedDB.open('dini-anif-editor-v150',2);q.onupgradeneeded=()=>{const db=q.result;if(!db.objectStoreNames.contains('assets'))db.createObjectStore('assets');if(!db.objectStoreNames.contains('snapshots'))db.createObjectStore('snapshots')};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
 async function putAppliedSnapshot(snap){const db=await openDB();await new Promise((res,rej)=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(snap,'native-applied');tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error||new Error('IndexedDB transaction aborted'))});try{localStorage.setItem('diniAnifNativeAppliedRef',JSON.stringify({store:'indexeddb',db:'dini-anif-editor-v150',key:'native-applied',revision:snap.revision,applied_at:snap.applied_at}))}catch{};try{localStorage.removeItem('diniAnifNativeApplied')}catch{};try{sessionStorage.removeItem('diniAnifCleanPreviewApplied')}catch{}}
 async function getAppliedSnapshot(){try{const db=await openDB();const snap=await new Promise((res,rej)=>{const tx=db.transaction('snapshots');const q=tx.objectStore('snapshots').get('native-applied');q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)});if(snap)return snap}catch(e){console.warn('IndexedDB applied snapshot read failed',e)}try{return JSON.parse(localStorage.getItem('diniAnifNativeApplied')||'null')}catch{return null}}
 async function deleteAppliedSnapshot(){try{const db=await openDB();await new Promise((res,rej)=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').delete('native-applied');tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}catch{}try{localStorage.removeItem('diniAnifNativeApplied');localStorage.removeItem('diniAnifNativeAppliedRef')}catch{}try{sessionStorage.removeItem('diniAnifCleanPreviewApplied')}catch{}}
 async function idbPut(k,v){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('assets','readwrite');tx.objectStore('assets').put(v,k);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}
 async function persistAppliedAssets(revision){const list=[];for(const [id,a] of generatedAssets){const key=`${revision}:field:${id}`;await idbPut(key,a.blob);list.push({id,key,path:a.path,name:a.name,type:a.type,source:a.source,role:'field'})}let n=0;for(const [path,a] of projectAssets){const key=`${revision}:project:${n++}`;await idbPut(key,a.blob);list.push({id:null,key,path:a.path,name:a.name,type:a.type,source:a.source,role:'project'})}return list}
 function setNativePackage(pkg){const schema=pkg.json('native-schema.json')||pkg.json('schema.json')?.native,html=pkg.text('source-native.html'),manifest=pkg.json('manifest.json')||{};if(!schema||!Array.isArray(schema.fields))throw new Error('Package belum memakai Dynamic Native Schema. Scrape ulang dari menu Fetch.');if(!html)throw new Error('source-native.html tidak ditemukan.');const rawData=pkg.json('native-data.json')||{};const packedValues=(rawData&&rawData.values&&typeof rawData.values==='object')?rawData.values:rawData;const packedTransforms=(rawData&&rawData.transforms&&typeof rawData.transforms==='object')?rawData.transforms:{};const defaults=Object.fromEntries(schema.fields.map(f=>[f.id,f.value??'']));native={schema,baseHtml:html,manifest,values:{...defaults,...deep(packedValues||{})}};for(const k of Object.keys(transforms))delete transforms[k];Object.assign(transforms,deep(packedTransforms||{}));generatedAssets.clear();projectAssets.clear();localizedLinks.clear();history.length=future.length=0;selectedFieldId='';isDirty=false;dirty.textContent=`NATIVE IMPORTED ✓ · ${schema.field_count||schema.fields.length} field`;renderNativeEditor();renderPreview(true);renderInspector();try{localStorage.setItem(DRAFT_KEY,JSON.stringify({schema,baseHtml:html,manifest,values:native.values,transforms:deep(transforms)}))}catch{}editorToast(`${schema.section_count} section · ${schema.fields.length} field berhasil dimuat beserta native-data hasil edit.`,'success','Visual Editor siap')}
 if(generateAllBtn)generateAllBtn.onclick=async()=>{if(!native)return editorToast('Import ZIP dulu.','error','Belum ada template');generateAllBtn.disabled=true;try{await generateAllAssets()}finally{generateAllBtn.disabled=false}};
 function validateTemplatePackage(pkg,file){
   if(!pkg?.files?.size)throw new Error('ZIP kosong atau format tidak didukung.');
   if(pkg.files.size>1200)throw new Error('ZIP terlalu besar: jumlah file melebihi 1200.');
   let total=0;for(const [name,bytes] of pkg.files){
     if(!name||name.startsWith('/')||name.includes('\\')||name.split('/').includes('..'))throw new Error('Path ZIP tidak aman: '+name);
     total+=bytes?.length||0;
   }
   if(total>500*1024*1024)throw new Error('ZIP melebihi batas import 500 MB.');
   if(!pkg.files.has('index.html')&&!pkg.files.has('source-native.html'))throw new Error('Paket harus memiliki index.html atau source-native.html.');
   if(!pkg.files.has('native-schema.json'))throw new Error('native-schema.json tidak ditemukan. Gunakan ZIP hasil Fetch → Preview → Editor → Download ZIP.');
   if(file&&file.size>500*1024*1024)throw new Error('File ZIP melebihi 500 MB.');
   return true;
 }
 async function requestB2Upload(file){
   const {data:{session}}=await adminSb.auth.getSession();if(!session?.access_token)throw new Error('Session admin tidak ditemukan.');
   const r=await fetch('/api/b2-sign-upload',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token},body:JSON.stringify({fileName:file.name,fileSize:file.size,contentType:file.type||'application/zip'})});
   let data={};try{data=await r.json()}catch{}
   if(!r.ok||!data.uploadUrl)throw new Error(data.error||`B2 signer HTTP ${r.status}`);
   return data;
 }
 function uploadFileToB2(file,signed,onProgress){
   return new Promise((resolve,reject)=>{
     const xhr=new XMLHttpRequest();
     xhr.open('PUT',signed.uploadUrl,true);
     xhr.setRequestHeader('Content-Type',file.type||'application/zip');
     xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress?.(e.loaded,e.total)};
     xhr.onerror=()=>reject(new Error('Upload langsung ke Backblaze B2 gagal. Cek koneksi/CORS bucket.'));
     xhr.onload=()=>{if(xhr.status>=200&&xhr.status<300)resolve({etag:String(xhr.getResponseHeader('ETag')||'').replace(/^\"|\"$/g,'')});else reject(new Error(`Backblaze B2 HTTP ${xhr.status}: ${String(xhr.responseText||'').slice(0,300)}`))};
     xhr.send(file);
   });
 }
 function fmtBytes(n){const x=Number(n||0);if(x<1024)return `${x} B`;if(x<1048576)return `${(x/1024).toFixed(1)} KB`;if(x<1073741824)return `${(x/1048576).toFixed(1)} MB`;return `${(x/1073741824).toFixed(2)} GB`}
 function setB2State(state,text,progress=0){
   if(!b2UploadState)return; b2UploadState.dataset.state=state||'idle';
   const span=b2UploadState.querySelector('span');if(span)span.textContent=text||'';
   if(b2UploadProgress){b2UploadProgress.value=Math.max(0,Math.min(100,Number(progress)||0));b2UploadProgress.style.display=state==='idle'?'none':'block'}
 }
 function b2Columns(meta){
   if(!meta)return {};return {storage_provider:'backblaze-b2',b2_bucket:meta.bucket||null,b2_object_key:meta.object_key||null,original_filename:meta.original_filename||null,file_size:Number(meta.file_size||0)||null,mime_type:meta.mime_type||null,b2_etag:meta.etag||null,storage_uploaded_at:meta.uploaded_at||null};
 }
 async function sha256Blob(blob){
   const buf=await blob.arrayBuffer();
   const digest=await crypto.subtle.digest('SHA-256',buf);
   return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
 }
 async function uploadPackageToB2(file){
   if(!file)return;
   if(file.size>500*1024*1024)throw new Error('File melebihi batas 500 MB.');
   if(!/\.zip$/i.test(file.name)&&file.type!=='application/zip'&&file.type!=='application/x-zip-compressed')throw new Error('Pilih file ZIP template.');
   b2UploadBtn.disabled=true;setB2State('uploading',`Meminta signed URL untuk ${file.name}…`,1);
   try{
     const packageSha256=await sha256Blob(file);
     const existingSha=currentTemplateRecord?.manifest_json?.package_storage?.sha256||pendingB2Upload?.sha256||'';
     if(existingSha&&existingSha===packageSha256){
       setB2State('success',`✓ Package tidak berubah · upload B2 dilewati`,100);
       editorToast('Isi package sama dengan versi B2 terakhir. Upload ulang dilewati untuk menghemat storage/bandwidth.','info','B2 duplicate guard');
       return pendingB2Upload||currentTemplateRecord?.manifest_json?.package_storage||null;
     }
     const signed=await requestB2Upload(file);
     const out=await uploadFileToB2(file,signed,(loaded,total)=>{const pct=total?Math.round(loaded/total*100):0;setB2State('uploading',`Upload ${pct}% · ${fmtBytes(loaded)} / ${fmtBytes(total)}`,pct)});
     pendingB2Upload={provider:'backblaze-b2',bucket:signed.bucket,object_key:signed.objectKey,original_filename:file.name,file_size:file.size,mime_type:file.type||'application/zip',etag:out?.etag||'',sha256:packageSha256,uploaded_at:new Date().toISOString()};
     if(native){native.manifest={...(native.manifest||{}),package_storage:deep(pendingB2Upload)}}
     setB2State('success',`✓ ${file.name} · ${fmtBytes(file.size)} · ${signed.bucket}/${signed.objectKey}`,100);
     editorToast('ZIP sudah tersimpan di Backblaze B2. Metadata siap ditempel ke Draft tanpa mengubah snapshot Editor.','success','Upload B2 selesai');
     // Never auto-create a Draft from a B2 upload. B2 is package storage only.
     // The visual/source-of-truth snapshot must be created exclusively by an explicit
     // Simpan Draft action so it always serializes the CURRENT Editor state.
     if(currentTemplateRecord&&!currentTemplateRecord.is_active){
       const manifest={...(currentTemplateRecord.manifest_json||{}),package_storage:deep(pendingB2Upload)};
       const upd=await adminSb.from('templates').update({...b2Columns(pendingB2Upload),package_path:`b2://${pendingB2Upload.bucket}/${pendingB2Upload.object_key}`,manifest_json:manifest,updated_at:new Date().toISOString()}).eq('id',currentTemplateRecord.id).select('*').single();
       if(upd.error)throw upd.error;currentTemplateRecord=upd.data;
       editorToast('Metadata B2 tersimpan pada Draft ini. Snapshot visual tidak diubah. Klik Simpan Draft untuk menyimpan perubahan Editor terbaru.','success','Supabase tersambung');
     }else{
       try{localStorage.setItem('diniAnifPendingB2Upload',JSON.stringify(pendingB2Upload))}catch{}
       editorToast('Upload B2 selesai. Sekarang klik Simpan Draft agar state Editor terbaru + metadata B2 disimpan bersama.','info','Siap Simpan Draft');
     }
   }catch(e){setB2State('error',e.message||String(e),0);throw e}
   finally{b2UploadBtn.disabled=false}
 }
 function contentTypeFor(path){const ext=String(path).split('.').pop().toLowerCase();return ({html:'text/html',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8',json:'application/json; charset=utf-8',svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',mp3:'audio/mpeg',wav:'audio/wav',ogg:'audio/ogg',mp4:'video/mp4',webm:'video/webm',woff:'font/woff',woff2:'font/woff2',ttf:'font/ttf',otf:'font/otf'}[ext]||'application/octet-stream')}
 function safeSlug(v){return String(v||'template').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,64)||'template'}
 async function nextTemplateIdentity(){
   const {data,error}=await adminSb.from('templates').select('name,slug');if(error)throw error;
   let max=1;for(const r of data||[]){const m=String(r.name||'').match(/^Template\s+(\d+)$/i);if(m)max=Math.max(max,Number(m[1])||1)}
   const n=max+1, token=crypto.randomUUID().slice(0,8);return {name:`Template ${n}`,slug:`template-${n}-${token}`,id:crypto.randomUUID()}
 }

 function publicUrlFor(path){
   return adminSb.storage.from(TEMPLATE_BUCKET).getPublicUrl(path).data.publicUrl;
 }
 async function uploadTemplateBlob(path,blob,contentType){
   const {error}=await adminSb.storage.from(TEMPLATE_BUCKET).upload(path,blob,{contentType:contentType||blob.type||'application/octet-stream',upsert:true,cacheControl:'3600'});
   if(error)throw new Error(`${path}: ${error.message}`);
   return publicUrlFor(path);
 }
 async function uploadTemplateText(path,text,type='application/json'){
   return uploadTemplateBlob(path,new Blob([text],{type}),type);
 }
 async function buildCloudSnapshot(base){
   if(!native)throw new Error('Belum ada template di Editor.');
   const publicValues=deep(native.values||{});
   // Upload only media freshly uploaded/generated in this editor session. Existing public/source URLs remain untouched.
   for(const [fieldId,a] of generatedAssets){
     if(!a?.blob)continue;
     const clean=(a.name||`${fieldId}.bin`).replace(/[^a-zA-Z0-9._-]+/g,'-');
     const path=`${base}/assets/editor/${fieldId}-${Date.now()}-${clean}`;
     publicValues[fieldId]=await uploadTemplateBlob(path,a.blob,a.type||a.blob.type||'application/octet-stream');
   }
   const doc=parseNative(native.baseHtml);
   for(const f of native.schema.fields||[]){
     const v=publicValues[f.id]??f.value??'';
     applyField(doc,f,v);
     if(transforms[f.id])applyTransform(nodeFor(doc,f),f,transforms[f.id]);
   }
   injectEditorParityPatch(doc,{forExport:false});
   const normalized=normalizeSnapshotHtml(serialize(doc),native.manifest||{});
   const html=normalized.html;
   const revision='cloud-'+Date.now().toString(36);
   return {
     version:'2.24.0',revision,
     schema:deep(native.schema),manifest:{...deep(native.manifest||{}),asset_base:normalized.assetBase},
     values:publicValues,transforms:deep(transforms),
     baseHtml:html,html,
     saved_at:new Date().toISOString()
   };
 }
 async function saveCurrentDraft(options={}){
   if(!native)return editorToast('Belum ada template. Masuk dari Fetch → Preview → Edit atau buka Draft dari Template Library.','error','Belum ada template');
   if(!adminSb)return editorToast('Supabase client tidak tersedia.','error','Draft gagal');
   const t=editorToast('Menyimpan snapshot Editor 1:1 ke Template Library…','loading','Simpan Draft');
   saveDraftBtn.disabled=true;
   try{
     const {data:{session},error:sessionError}=await adminSb.auth.getSession();
     if(sessionError||!session)throw new Error('Session admin tidak ditemukan. Login ulang.');
     let rec=currentTemplateRecord;
     let ident;
     // Never mutate the currently published row while the user is only saving a draft.
     // Editing an ACTIVE template creates a new draft clone; editing a DRAFT updates that same draft.
     if(rec&&!rec.is_active){ ident={id:rec.id,name:rec.name,slug:rec.slug}; }
     else { ident=await nextTemplateIdentity(); }
     const sm=t?.querySelector('small');if(sm)sm.textContent='Upload asset Editor + bangun snapshot final…';
     const revisionId='r-'+Date.now().toString(36)+'-'+crypto.randomUUID().slice(0,6);
     const base=`${ident.slug}/revisions/${revisionId}`;
     const snap=await buildCloudSnapshot(base);
     const indexPath=`${base}/index.html`;
     const snapshotPath=`${base}/editor-snapshot.json`;
     const schemaPath=`${base}/native-schema.json`;
     const dataPath=`${base}/native-data.json`;
     const manifestPath=`${base}/manifest.json`;
     const sourceUrl=await uploadTemplateText(indexPath,snap.html,'text/html');
     const snapshotUrl=await uploadTemplateText(snapshotPath,JSON.stringify(snap),'application/json');
     await uploadTemplateText(schemaPath,JSON.stringify(snap.schema,null,2),'application/json');
     await uploadTemplateText(dataPath,JSON.stringify({values:snap.values,transforms:snap.transforms},null,2),'application/json');
     const packageStorage=pendingB2Upload||snap.manifest?.package_storage||currentTemplateRecord?.manifest_json?.package_storage||null;
     const prev=currentTemplateRecord&&!currentTemplateRecord.is_active?currentTemplateRecord:null;
     const previousHistory=Array.isArray(prev?.manifest_json?.revision_history)?prev.manifest_json.revision_history:[];
     const prevEntry=prev?.source_path&&prev?.manifest_json?.editor_snapshot_url?{
       revision:prev.manifest_json.revision||'previous',
       source_path:prev.source_path,
       editor_snapshot_url:prev.manifest_json.editor_snapshot_url,
       asset_base:prev.manifest_json.asset_base||location.origin+'/',
       package_storage:prev.manifest_json.package_storage||null,
       saved_at:prev.manifest_json.saved_at||prev.updated_at||null
     }:null;
     const revisionHistory=[...(prevEntry?[prevEntry]:[]),...previousHistory].filter((x,i,a)=>x?.source_path&&a.findIndex(y=>y.source_path===x.source_path)===i).slice(0,3);
     const manifest={...(snap.manifest||{}),editor_version:'2.26.0',renderer_version:'source-graph-3.0-smart-ownership',revision:snap.revision,revision_id:revisionId,editor_snapshot_url:snapshotUrl,source_of_truth:'editor-snapshot',saved_at:snap.saved_at,asset_base:snap.manifest?.asset_base||location.origin+'/',revision_history:revisionHistory,artifact_prefix:base,...(packageStorage?{package_storage:deep(packageStorage)}:{})};
     await uploadTemplateText(manifestPath,JSON.stringify(manifest,null,2),'application/json');
     const payload={name:ident.name,slug:ident.slug,source_path:sourceUrl,status:'draft',is_active:false,package_path:packageStorage?`b2://${packageStorage.bucket}/${packageStorage.object_key}`:`supabase://${TEMPLATE_BUCKET}/${snapshotPath}`,manifest_json:manifest,...b2Columns(packageStorage),updated_at:new Date().toISOString()};
     let result;
     if(rec&&!rec.is_active){ result=await adminSb.from('templates').update(payload).eq('id',ident.id).select('*').single(); }
     else { result=await adminSb.from('templates').insert({id:ident.id,...payload}).select('*').single(); }
     if(result.error)throw result.error;
     currentTemplateRecord=result.data;
     pendingB2Upload=packageStorage?deep(packageStorage):null;
     native.values=deep(snap.values); native.baseHtml=snap.html; native.manifest=deep(manifest);
     generatedAssets.clear();
     isDirty=false; dirty.textContent='DRAFT CLOUD SAVED ✓';
     try{localStorage.setItem(DRAFT_KEY,JSON.stringify({schema:native.schema,baseHtml:native.baseHtml,manifest:native.manifest,values:native.values,transforms:deep(transforms)}))}catch{};saveRecovery()
     finishEditorToast(t,`${ident.name} tersimpan 1:1 sebagai DRAFT. Preview, buka ulang, dan Publish memakai snapshot yang sama.`,'success','Draft tersimpan');
     try{localStorage.removeItem('diniAnifPendingB2Upload')}catch{}
     try{localStorage.removeItem(templateRecoveryKey())}catch{}
     if(options.autoFromB2){
       setB2State('success',`✓ B2 + Supabase tersambung · ${ident.name} · ${pendingB2Upload?.original_filename||'package.zip'}`,100);
     }
     setTimeout(()=>location.href='/dashboard-admin-template',options.autoFromB2?1300:900);
   }catch(e){finishEditorToast(t,e.message||String(e),'error','Simpan Draft gagal');saveDraftBtn.disabled=false}
 }
 async function loadTemplateFromLibrary(){
   if(!adminSb)return false;
   const params=new URLSearchParams(location.search),q=params.get('template'),record=params.get('record')||'';if(!q)return false;
   const t=editorToast('Memuat snapshot Draft dari Template Library…','loading','Buka Draft');
   try{
     if(record&&record!==q)throw new Error('Template mismatch: UUID request dan record berbeda.');
     const isUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(q);
     let lookup=isUuid?await adminSb.from('templates').select('*').eq('id',q).limit(1).maybeSingle():await adminSb.from('templates').select('*').eq('slug',q).limit(1).maybeSingle();
     if(lookup.error)throw lookup.error;
     if(lookup.error)throw lookup.error;const data=lookup.data;if(!data)throw new Error('Template tidak ditemukan.');if(record&&String(data.id)!==record)throw new Error('Template mismatch: row Supabase berbeda dari UUID yang dipilih.');
     currentTemplateRecord=data;
     pendingB2Upload=data.manifest_json?.package_storage||((data.storage_provider==='backblaze-b2'&&data.b2_object_key)?{provider:'backblaze-b2',bucket:data.b2_bucket,object_key:data.b2_object_key,original_filename:data.original_filename,file_size:data.file_size,mime_type:data.mime_type,etag:data.b2_etag,uploaded_at:data.storage_uploaded_at}:null);
     if(pendingB2Upload)setB2State('success',`✓ ${pendingB2Upload.original_filename||'Paket B2'} · ${fmtBytes(pendingB2Upload.file_size)} · ${pendingB2Upload.bucket}/${pendingB2Upload.object_key}`,100);
     let snapUrl=data.manifest_json?.editor_snapshot_url||'';
     if(!snapUrl&&data.source_path&&data.source_path!=='/')snapUrl=data.source_path.replace(/\/index\.html(?:\?.*)?$/,'/editor-snapshot.json');
     if(!snapUrl)throw new Error('Template lama belum memiliki editor snapshot V2.14. Buka dari Fetch lalu Simpan Draft sekali.');
     const r=await fetch(snapUrl,{cache:'no-store'});if(!r.ok)throw new Error(`Snapshot HTTP ${r.status}`);
     const snap=await r.json();
     if(!snap?.schema||!Array.isArray(snap.schema.fields)||!(snap.baseHtml||snap.html))throw new Error('Snapshot Draft tidak valid.');
     native={schema:deep(snap.schema),baseHtml:snap.baseHtml||snap.html,manifest:deep(snap.manifest||data.manifest_json||{}),values:deep(snap.values||{})};
     for(const k of Object.keys(transforms))delete transforms[k];Object.assign(transforms,deep(snap.transforms||{}));
     generatedAssets.clear();projectAssets.clear();localizedLinks.clear();history.length=future.length=0;selectedFieldId='';isDirty=false;
     dirty.textContent=`DRAFT CLOUD LOADED ✓ · ${native.schema.fields.length} field`;saveDraftBtn.disabled=false;
     renderNativeEditor();renderPreview(true);renderInspector();
     try{localStorage.setItem(DRAFT_KEY,JSON.stringify({schema:native.schema,baseHtml:native.baseHtml,manifest:native.manifest,values:native.values,transforms:deep(transforms)}))}catch{};saveRecovery()
     finishEditorToast(t,`${data.name} dibuka dari snapshot yang sama dengan Preview/Publish.`,'success','Draft siap diedit');
     return true;
   }catch(e){finishEditorToast(t,e.message||String(e),'error','Buka Draft gagal');return false}
 }
 async function persistImportedDraft(){
   if(!importedZipPackage||!importedZipFile)return editorToast('Upload/Import ZIP hasil Fetch terlebih dahulu.','error','Belum ada ZIP');
   if(isDirty)return editorToast('Template berubah setelah ZIP di-import. APPLY → Download ZIP terbaru → Import ulang ZIP final sebelum Simpan Draft.','info','ZIP perlu diperbarui');
   if(!adminSb)return editorToast('Supabase client tidak tersedia.','error','Draft gagal');
   const t=editorToast('Menyiapkan asset publik + paket ZIP Backblaze B2…','loading','Simpan Draft');saveDraftBtn.disabled=true;
   try{
     validateTemplatePackage(importedZipPackage,importedZipFile);
     const {data:{session},error:sessionError}=await adminSb.auth.getSession();if(sessionError||!session)throw new Error('Session admin tidak ditemukan. Login ulang.');
     const ident=await nextTemplateIdentity(), base=`${ident.slug}`;
     const oversized=[...importedZipPackage.files].filter(([,bytes])=>(bytes?.length||0)>50*1024*1024);
     if(oversized.length)throw new Error(`Asset terurai melebihi 50 MB (${oversized[0][0]}). ZIP besar didukung via B2, tetapi asset publik per-file masih harus <50 MB.`);
     let done=0,total=importedZipPackage.files.size;
     for(const [name,bytes] of importedZipPackage.files){
       const blob=new Blob([bytes],{type:contentTypeFor(name)});
       const {error}=await adminSb.storage.from(TEMPLATE_BUCKET).upload(`${base}/${name}`,blob,{contentType:contentTypeFor(name),upsert:true,cacheControl:'3600'});if(error)throw new Error(`${name}: ${error.message}`);
       done++;const sm=t?.querySelector('small');if(sm)sm.textContent=`Asset publik ${done}/${total} file…`;
     }
     const sm=t?.querySelector('small');if(sm)sm.textContent='Meminta signed URL Backblaze B2…';
     const signed=await requestB2Upload(importedZipFile);
     await uploadFileToB2(importedZipFile,signed,(loaded,totalBytes)=>{if(sm)sm.textContent=`Upload ZIP ke B2 ${Math.min(100,Math.round(loaded/totalBytes*100))}% · ${(loaded/1024/1024).toFixed(1)}/${(totalBytes/1024/1024).toFixed(1)} MB`});
     const entry=importedZipPackage.files.has('index.html')?'index.html':'source-native.html';
     const {data:pub}=adminSb.storage.from(TEMPLATE_BUCKET).getPublicUrl(`${base}/${entry}`);
     const manifest0=importedZipPackage.json('manifest.json')||native?.manifest||{};
     const b2Result={provider:'backblaze-b2',bucket:signed.bucket,object_key:signed.objectKey,original_filename:importedZipFile.name,file_size:importedZipFile.size,mime_type:importedZipFile.type||'application/zip',etag:'',uploaded_at:new Date().toISOString()};
     const manifest={...manifest0,package_storage:b2Result};
     const payload={id:ident.id,name:ident.name,slug:ident.slug,source_path:pub.publicUrl,status:'draft',is_active:false,package_path:`b2://${signed.bucket}/${signed.objectKey}`,manifest_json:manifest,...b2Columns(b2Result),updated_at:new Date().toISOString()};
     const {error}=await adminSb.from('templates').insert(payload);if(error)throw error;
     finishEditorToast(t,`${ident.name} tersimpan sebagai DRAFT dan sekarang muncul di menu Template.`,'success','Draft tersimpan');
     editorToast('Membuka Template Library…','info','Selesai');setTimeout(()=>location.href='/dashboard-admin-template',850);
   }catch(e){finishEditorToast(t,e.message||String(e),'error','Simpan Draft gagal');saveDraftBtn.disabled=false}
 }
 importBtn.onclick=()=>importInput.click();importInput.onchange=async()=>{const file=importInput.files?.[0];if(!file)return;const t=editorToast('Membaca native schema + source-native HTML…','loading','Import ZIP');try{const pkg=window.UNDANGAN_ZIP.readStoreZip(await file.arrayBuffer());validateTemplatePackage(pkg,file);setNativePackage(pkg);importedZipFile=file;importedZipPackage=pkg;saveDraftBtn.disabled=false;finishEditorToast(t,'ZIP berhasil di-import sebagai jalur cadangan. Edit lalu klik Simpan / Update Draft.','success','Import sukses')}catch(e){importedZipFile=null;importedZipPackage=null;saveDraftBtn.disabled=true;finishEditorToast(t,e.message,'error','Import gagal')}finally{importInput.value=''}};
 if(b2UploadBtn){b2UploadBtn.onclick=async()=>{if(!native)return editorToast('Belum ada template di Editor.','error','Upload B2 gagal');b2UploadBtn.disabled=true;setB2State('uploading','Menyiapkan package dari state Editor CURRENT…',1);try{const built=await buildProductionZipFromCurrent(msg=>setB2State('uploading',msg,Math.max(2,Number(b2UploadProgress?.value||0))));const file=new File([built.blob],currentB2PackageName(),{type:'application/zip',lastModified:Date.now()});setB2State('uploading',`Package CURRENT siap · ${fmtBytes(file.size)}. Memulai upload B2…`,3);await uploadPackageToB2(file);editorToast('Package B2 dibuat otomatis dari state Editor CURRENT. Tidak ada file picker/download manual.','success','B2 Current Editor tersimpan')}catch(e){setB2State('error',e.message||String(e),0);editorToast(e.message||String(e),'error','Upload B2 gagal')}finally{b2UploadBtn.disabled=false}};setB2State('idle','Klik untuk generate package dari Editor CURRENT lalu upload langsung ke B2.',0)}
 saveDraftBtn.onclick=saveCurrentDraft;
 applyBtn.onclick=async()=>{if(!native)return editorToast('Import Rebuild ZIP dulu.','error','Belum ada template');const t=editorToast('Menyimpan snapshot final + asset ke IndexedDB…','loading','APPLY');try{const revision='r'+Date.now().toString(36),assets=await persistAppliedAssets(revision),html=rebuildHtml({forExport:true}),snap={version:'2.23.0',revision,schema:native.schema,manifest:native.manifest,values:deep(native.values),transforms:deep(transforms),html,assets,applied_at:new Date().toISOString()};await putAppliedSnapshot(snap);isDirty=false;dirty.textContent='APPLIED ✓';finishEditorToast(t,`${assets.length} asset + semua perubahan tersimpan di IndexedDB tanpa batas localStorage kecil.`,'success','APPLY sukses')}catch(e){finishEditorToast(t,e.message,'error','APPLY gagal')}};
 previewBtn.onclick=e=>{e.preventDefault();if(isDirty){editorToast('Ada perubahan belum APPLY. Klik APPLY supaya Preview Bersih memakai snapshot final.','info','Belum APPLY');return}window.open('./clean-preview.html','_blank')};
 
 function depHash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16).padStart(8,'0')}
 function depCleanUrl(raw){return String(raw||'').replace(/&amp;/g,'&').replace(/&quot;.*$/,'').replace(/["'<>\s]+$/g,'').trim()}
 function depBaseName(url,ct=''){let n='asset';try{const u=new URL(url);n=decodeURIComponent(u.pathname.split('/').pop()||'asset')}catch{}n=n.replace(/[^a-zA-Z0-9._-]+/g,'-').slice(-100)||'asset';if(!/\.[a-z0-9]{2,6}$/i.test(n)){const m={'text/css':'.css','image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','image/gif':'.gif','image/svg+xml':'.svg','video/mp4':'.mp4','audio/mpeg':'.mp3','font/woff':'.woff','font/woff2':'.woff2','application/font-woff':'.woff'}[String(ct||'').split(';')[0]];if(m)n+=m}return n}
 function depIsAssetUrl(raw){const url=depCleanUrl(raw);let u;try{u=new URL(url)}catch{return false}if(!/^https?:$/.test(u.protocol))return false;const p=u.pathname.toLowerCase(),h=u.hostname.toLowerCase();if(h==='fonts.googleapis.com')return true;if(h==='fonts.gstatic.com')return p!=='/'&&p!=='';if(/\.(css|js|mjs|jpg|jpeg|png|gif|webp|avif|svg|mp4|webm|mp3|ogg|wav|woff2?|ttf|otf|eot)(?:$|\?)/i.test(p+u.search))return true;if(h==='web.galeriundanganofficial.com'&&/\/wp-content\//i.test(p))return true;return false}
 function depExtractUrls(text){const out=new Set();const re=/https?:\/\/[^\s"'<>\)]+/g;for(const m of String(text||'').matchAll(re)){let u=depCleanUrl(m[0]);u=u.replace(/(?:&quot;|&#0*34;).*$/i,'');if(depIsAssetUrl(u))out.add(u)}return [...out]}
  function depKnownMissingOptional(raw){let u;try{u=new URL(depCleanUrl(raw))}catch{return false}if(u.hostname!=='web.galeriundanganofficial.com')return false;return /\/(?:divider-icon|form-datalist|list-bullet|loading)\.svg$/i.test(u.pathname)||/\/modal_x\.png$/i.test(u.pathname)}
  function depTransparentReplacement(url){return /\.png(?:$|\?)/i.test(url)?'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=':'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221%22 height=%221%22/%3E'}
 async function depFetchBlob(url){let offset=0,total=0,chunks=[],type='',name='',guard=0;while(guard++<180){const r=await fetch('/api/fetch-asset?url='+encodeURIComponent(url)+'&offset='+offset+'&size=3000000',{cache:'no-store'});if(!r.ok){let msg='HTTP '+r.status;try{msg=(await r.json()).error||msg}catch{}throw new Error(msg)}const b=await r.blob();if(!b.size)throw new Error('Asset kosong');if(!type)type=r.headers.get('content-type')||b.type||'application/octet-stream';if(!name)try{name=decodeURIComponent(r.headers.get('x-asset-name')||'')}catch{};total=Number(r.headers.get('x-asset-total')||0)||total||b.size;chunks.push(b);offset+=b.size;const range=r.headers.get('x-asset-range')==='1';if(offset>=total||!range)break}return {blob:new Blob(chunks,{type}),type,total:offset,name:name||depBaseName(url,type)}}
 function depCssRefs(css,base){const out=[];const add=v=>{v=String(v||'').trim().replace(/^['"]|['"]$/g,'');if(!v||v.startsWith('data:')||v.startsWith('#'))return;try{const u=new URL(v,base).href;if(depIsAssetUrl(u))out.push(u)}catch{}};String(css||'').replace(/url\(([^)]+)\)/gi,(_,v)=>(add(v),_));String(css||'').replace(/@import\s+(?:url\()?\s*['"]?([^'"\s\)]+)['"]?\)?/gi,(_,v)=>(add(v),_));return [...new Set(out)]}
 function depRel(fromPath,toPath){const a=fromPath.split('/');a.pop();const b=toPath.split('/');while(a.length&&b.length&&a[0]===b[0]){a.shift();b.shift()}return '../'.repeat(a.length)+b.join('/')||'./'}
 async function localizeProductionHtml(inputHtml,onProgress){let html=String(inputHtml||''),queue=depExtractUrls(html),seen=new Set(),map=new Map(),blobs=new Map(),cssText=new Map(),failed=[];let idx=0;while(idx<queue.length&&idx<420){const url=queue[idx++];if(seen.has(url))continue;seen.add(url);try{onProgress?.(`Lokalisasi ${seen.size} asset…`);const got=await depFetchBlob(url),path='assets/source/'+depHash(url)+'-'+depBaseName(url,got.type);map.set(url,path);if(String(got.type).toLowerCase().includes('text/css')||/\.css(?:\?|$)/i.test(url)||new URL(url).hostname==='fonts.googleapis.com'){const txt=await got.blob.text();cssText.set(url,txt);for(const child of depCssRefs(txt,url))if(!seen.has(child)&&!queue.includes(child))queue.push(child)}else blobs.set(path,got.blob)}catch(e){if(depKnownMissingOptional(url)){map.set(url,depTransparentReplacement(url))}else failed.push({url,error:e.message||String(e)})}}
   for(const [url,path] of map){html=html.split(url).join(path);html=html.split(url.replace(/&/g,'&amp;')).join(path)}
   for(const [url,txt0] of cssText){let txt=txt0;for(const child of depCssRefs(txt0,url)){const p=map.get(child);if(!p)continue;let variants=[child];try{const cu=new URL(child),bu=new URL(url);if(cu.origin===bu.origin){variants.push(cu.pathname+cu.search);const baseDir=bu.pathname.slice(0,bu.pathname.lastIndexOf('/')+1);if(cu.pathname.startsWith(baseDir))variants.push(cu.pathname.slice(baseDir.length)+cu.search)}}catch{}const rel=String(p).startsWith('data:')?p:depRel(map.get(url),p);for(const v of variants)txt=txt.split(v).join(rel)}blobs.set(map.get(url),new Blob([txt],{type:'text/css'}))}
   const remaining=depExtractUrls(html).filter(u=>!map.has(u));
   const audit={version:'2.23.0',localized_count:map.size,failed_count:failed.length,remaining_runtime_dependency_count:remaining.length,localized:[...map].map(([url,path])=>({url,path})),failed,remaining_runtime_dependencies:remaining,generated_at:new Date().toISOString()};
   return {html,blobs,audit}
 }

 async function snapshotCurrentEditorForPackage(){
   if(!native)throw new Error('Belum ada template di Editor.');
   const revision='b2-'+Date.now().toString(36);
   const assets=await persistAppliedAssets(revision);
   return {version:'2.23.0',revision,schema:deep(native.schema),manifest:deep(native.manifest||{}),values:deep(native.values||{}),transforms:deep(transforms||{}),html:rebuildHtml({forExport:true}),assets,applied_at:new Date().toISOString()};
 }
 async function buildProductionZipFromCurrent(onProgress){
   if(!window.UNDANGAN_ZIP?.buildZip)throw new Error('ZIP Builder belum siap.');
   const snap=await snapshotCurrentEditorForPackage();
   onProgress?.('Melokalkan dependency source…');
   const clean=await localizeProductionHtml(snap.html,msg=>onProgress?.(msg));
   const entries=[
     {name:'index.html',data:clean.html},
     {name:'source-native.html',data:clean.html},
     {name:'native-schema.json',data:JSON.stringify(snap.schema,null,2)},
     {name:'native-data.json',data:JSON.stringify({values:snap.values,transforms:snap.transforms},null,2)},
     {name:'dependency-audit.json',data:JSON.stringify(clean.audit,null,2)},
     {name:'visual-manifest.json',data:JSON.stringify(snap.manifest?.visual_manifest||{version:3,sources:[]},null,2)},{name:'source-graph.json',data:JSON.stringify(snap.manifest?.source_graph||{version:3,visuals:[],interactions:[]},null,2)},
     {name:'manifest.json',data:JSON.stringify({...snap.manifest,editor:'v2.26.0',revision:snap.revision,dependency_audit:{localized:clean.audit.localized_count,failed:clean.audit.failed_count,remaining_runtime:clean.audit.remaining_runtime_dependency_count}},null,2)}
   ];
   const db=await openDB();
   for(const a of snap.assets||[]){
     const blob=await new Promise((res,rej)=>{const tx=db.transaction('assets');const q=tx.objectStore('assets').get(a.key);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
     if(blob)entries.push({name:a.path,data:blob});
   }
   for(const [path,blob] of clean.blobs)entries.push({name:path,data:blob});
   entries.push({name:'README-CLEAN-DEPENDENCY.txt',data:`Dini Anif Production ZIP V2.26.0\nLocalized runtime dependencies: ${clean.audit.localized_count}\nFailed localization: ${clean.audit.failed_count}\nRemaining runtime dependencies: ${clean.audit.remaining_runtime_dependency_count}\n\nLihat dependency-audit.json untuk detail.\n`});
   onProgress?.('Membangun ZIP dari state Editor CURRENT…');
   const blob=await window.UNDANGAN_ZIP.buildZip(entries);
   return {blob,snap,clean};
 }
 function currentB2PackageName(){
   const base=(currentTemplateRecord?.slug||native?.manifest?.slug||'dini-anif-editor-current').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'')||'dini-anif-editor-current';
   return `${base}-current-${new Date().toISOString().replace(/[:.]/g,'-')}.zip`;
 }
 zipBtn.onclick=async()=>{if(!native)return editorToast('Import ZIP dulu.','error','Belum ada template');if(isDirty)return editorToast('Klik APPLY dulu agar ZIP sama dengan Preview Bersih.','info','Belum APPLY');const snap=await getAppliedSnapshot();if(!snap)return editorToast('Snapshot APPLY belum ada.','error','Belum APPLY');const t=editorToast('Melokalkan dependency source untuk Production ZIP…','loading','Clean Dependency Sweep');try{const clean=await localizeProductionHtml(snap.html,msg=>{if(t?.querySelector){const el=t.querySelector('.toast-message');if(el)el.textContent=msg}}),entries=[{name:'index.html',data:clean.html},{name:'source-native.html',data:clean.html},{name:'native-schema.json',data:JSON.stringify(snap.schema,null,2)},{name:'native-data.json',data:JSON.stringify(snap.values,null,2)},{name:'dependency-audit.json',data:JSON.stringify(clean.audit,null,2)},{name:'visual-manifest.json',data:JSON.stringify(snap.manifest?.visual_manifest||{version:3,sources:[]},null,2)},{name:'source-graph.json',data:JSON.stringify(snap.manifest?.source_graph||{version:3,visuals:[],interactions:[]},null,2)},{name:'manifest.json',data:JSON.stringify({...snap.manifest,editor:'v2.26.0',revision:snap.revision,dependency_audit:{localized:clean.audit.localized_count,failed:clean.audit.failed_count,remaining_runtime:clean.audit.remaining_runtime_dependency_count}},null,2)}];const db=await openDB();for(const a of snap.assets||[]){const blob=await new Promise((res,rej)=>{const tx=db.transaction('assets');const q=tx.objectStore('assets').get(a.key);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});if(blob)entries.push({name:a.path,data:blob})}for(const [path,blob] of clean.blobs)entries.push({name:path,data:blob});entries.push({name:'README-CLEAN-DEPENDENCY.txt',data:`Dini Anif Production ZIP V2.26.0\nLocalized runtime dependencies: ${clean.audit.localized_count}\nFailed localization: ${clean.audit.failed_count}\nRemaining runtime dependencies: ${clean.audit.remaining_runtime_dependency_count}\n\nLihat dependency-audit.json untuk detail.\n`});const blob=await window.UNDANGAN_ZIP.buildZip(entries),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='dini-anif-native-production-v226-smart-source.zip';a.click();setTimeout(()=>URL.revokeObjectURL(u),1500);finishEditorToast(t,`Localized ${clean.audit.localized_count} dependency · gagal ${clean.audit.failed_count} · sisa runtime ${clean.audit.remaining_runtime_dependency_count}.`,clean.audit.remaining_runtime_dependency_count===0&&clean.audit.failed_count===0?'success':'info','Production ZIP siap')}catch(e){finishEditorToast(t,e.message,'error','Dependency Sweep gagal')}};

 backupBtn.onclick=()=>{if(!native)return;const blob=new Blob([JSON.stringify({schema:native.schema,manifest:native.manifest,values:native.values,transforms},null,2)],{type:'application/json'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='dini-anif-native-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
 resetBtn.onclick=async()=>{if(!confirm('Reset editor dan hapus draft lokal?'))return;localStorage.removeItem(DRAFT_KEY);localStorage.removeItem(LEGACY_DRAFT_KEY);await deleteAppliedSnapshot();location.reload()};
 function snapshotHandoffRaw(){
   const params=new URLSearchParams(location.search),mode=params.get('mode')||'',token=params.get('handoff')||'';
   // Fetch flow MUST use the exact scoped snapshot selected by Source-Native Preview.
   // Never fall back to a generic "last snapshot" key because that can cross-load another template.
   if(mode==='fetch'){
     if(!token)return '';
     const key='diniAnifRebuildSnapshot:'+token;
     try{const v=sessionStorage.getItem(key);if(v)return v}catch{}
     try{const v=localStorage.getItem(key);if(v)return v}catch{}
     try{const prefix='__DINI_ANIF_REBUILD_SCOPED__'+token+'__';if(typeof window.name==='string'&&window.name.startsWith(prefix))return window.name.slice(prefix.length)}catch{}
     return ''
   }
   // Legacy non-Fetch flows keep their previous compatibility fallback.
   try{const v=sessionStorage.getItem('diniAnifRebuildSnapshot');if(v)return v}catch{}
   try{const v=localStorage.getItem('diniAnifRebuildSnapshot');if(v)return v}catch{}
   try{if(typeof window.name==='string'&&window.name.startsWith('__DINI_ANIF_REBUILD__'))return window.name.slice('__DINI_ANIF_REBUILD__'.length)}catch{}
   return ''
 }
 function loadSnapshotHandoff(){
   const raw=snapshotHandoffRaw();if(!raw)return false;
   try{
     const pack=JSON.parse(raw),schema=pack?.native?.schema||pack?.schema?.native,html=pack?.native?.html||'';
     if(!schema||!Array.isArray(schema.fields)||!html)return false;
     native={schema:deep(schema),baseHtml:html,manifest:{...deep(pack.manifest||{}),source_url:deep(pack.manifest||{}).source_url||pack?.native?.source_url||''},values:Object.fromEntries(schema.fields.map(f=>[f.id,f.value??'']))};
     dirty.textContent=`FETCH SNAPSHOT LOADED ✓ · ${schema.field_count||schema.fields.length} field`;saveDraftBtn.disabled=false;
     renderNativeEditor();renderPreview(true);renderInspector();
     try{localStorage.setItem(DRAFT_KEY,JSON.stringify({schema:native.schema,baseHtml:native.baseHtml,manifest:native.manifest,values:native.values}))}catch{}
     editorToast('Snapshot dari Fetch/Preview dimuat otomatis. Tidak perlu Import ZIP ulang.','success','Editor terhubung');
     return true
   }catch(e){console.warn('snapshot handoff',e);return false}
 }
 // V1.6.9: a fresh Fetch/Generate snapshot ALWAYS wins over an older editor draft.
 // This prevents a valid new rebuild from being hidden by a V1.5.9 draft (visible as "DRAFT V1.5.9 RESTORED").
 try{
   for(const k of OLD_DRAFT_KEYS) localStorage.removeItem(k);
   if(localStorage.getItem(LEGACY_DRAFT_KEY)) localStorage.removeItem(LEGACY_DRAFT_KEY);
 }catch{}
 async function bootEditor(){
   const fromLibrary=await loadTemplateFromLibrary();
   if(!fromLibrary&&!loadSnapshotHandoff()){
     try{
       const scoped=JSON.parse(localStorage.getItem(templateRecoveryKey())||'null');
       const d=scoped?.schema&&scoped?.baseHtml?scoped:JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');
       if(d?.schema&&d?.baseHtml){native=d;Object.assign(transforms,deep(d.transforms||{}));dirty.textContent=scoped?'RECOVERY TEMPLATE RESTORED':'LOCAL DRAFT RESTORED';saveDraftBtn.disabled=false;renderNativeEditor();renderPreview(true)}
     }catch(e){console.warn('draft restore',e)}
   }
   if(!native){
     renderNativeEditor();
     frame.srcdoc='<!doctype html><html><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;color:#555;font:14px system-ui;text-align:center;padding:30px;box-sizing:border-box"><div><b>Belum ada snapshot editor.</b><br><small>Kembali ke Fetch → Preview → Edit, atau buka Draft dari Template Library.</small></div></body></html>';
   }
   renderInspector();
 }
 bootEditor();
 window.addEventListener('beforeunload',()=>{for(const u of objectUrls)URL.revokeObjectURL(u)});
})();
