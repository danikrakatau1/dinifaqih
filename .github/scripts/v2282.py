# trigger v2.28.2
from pathlib import Path

repo = Path('.')
editor = repo/'dashboard-admin-edit/editor.js'
clean = repo/'dashboard-admin-edit/clean-preview.js'
index = repo/'dashboard-admin-edit/index.html'
clean_html = repo/'dashboard-admin-edit/clean-preview.html'

s = editor.read_text(encoding='utf-8')
old = ''' function captureLiveParityHtml(){
   const live=liveDoc();
   if(editorParams.get('handoff')!=='1'||!live?.documentElement)return rebuildHtml({forExport:true});
   const raw=parityDoctype(live)+live.documentElement.outerHTML;
   const doc=parseNative(raw);
   for(const f of native.schema.fields||[]){
     const a=generatedAssets.get(f.id);
     const v=a?a.path:(native.values[f.id]??f.value??'');
     try{applyField(doc,f,v)}catch{}
   }
   for(const f of native.schema.fields||[]){if(transforms[f.id])try{applyTransform(nodeFor(doc,f),f,transforms[f.id])}catch{}}
   doc.querySelectorAll('.native-selected-outline').forEach(n=>n.classList.remove('native-selected-outline'));
   doc.querySelectorAll('[data-dini-anif-editor-parity],[data-dini-anif-action-runtime]').forEach(n=>n.remove());
   doc.documentElement.removeAttribute('data-dini-editor-live-stabilized');
   return serialize(doc);
 }
'''
new = ''' function captureLiveParityHtml(){
   const live=liveDoc();
   if(editorParams.get('handoff')!=='1'||!live?.documentElement)return rebuildHtml({forExport:true});
   // V2.28.2 PARITY LOCK: the visible Exact Source DOM is already the final visual truth.
   // Never replay every Source Graph field here; overlapping ownership can mutate the
   // captured page after the user has already approved what is visible in Editor.
   const raw=parityDoctype(live)+live.documentElement.outerHTML;
   const doc=parseNative(raw);
   // Only generated/uploaded object URLs need conversion to persistent asset paths.
   // Everything else stays byte-for-byte as captured from the live Editor DOM.
   for(const [fieldId,a] of generatedAssets){
     if(!a?.path)continue;
     const f=fieldById(fieldId);if(!f)continue;
     try{applyField(doc,f,a.path)}catch{}
   }
   doc.querySelectorAll('.native-selected-outline').forEach(n=>n.classList.remove('native-selected-outline'));
   doc.querySelectorAll('[data-dini-anif-editor-parity],[data-dini-anif-action-runtime],#dini-anif-editor-hit-css').forEach(n=>n.remove());
   doc.documentElement.removeAttribute('data-dini-editor-live-stabilized');
   doc.documentElement.setAttribute('data-dini-applied-parity','v2282');
   return serialize(doc);
 }
'''
if old not in s:
    raise SystemExit('captureLiveParityHtml anchor not found')
s = s.replace(old,new,1)

old = ''' async function putAppliedSnapshot(snap){const db=await openDB(),stored={...snap,template_context:templateContextId()};await new Promise((res,rej)=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(stored,appliedSnapshotIdbKey());tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error||new Error('IndexedDB transaction aborted'))});try{localStorage.setItem(appliedRefKey(),JSON.stringify({store:'indexeddb',db:'dini-anif-editor-v150',key:appliedSnapshotIdbKey(),revision:stored.revision,applied_at:stored.applied_at,template_context:templateContextId()}))}catch{};try{localStorage.removeItem(appliedLegacyKey())}catch{};try{sessionStorage.removeItem(cleanPreviewStorageKey())}catch{}}
 async function getAppliedSnapshot(){try{const db=await openDB();const snap=await new Promise((res,rej)=>{const tx=db.transaction('snapshots');const q=tx.objectStore('snapshots').get(appliedSnapshotIdbKey());q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)});if(snap&&(!snap.template_context||snap.template_context===templateContextId()))return snap}catch(e){console.warn('IndexedDB applied snapshot read failed',e)}try{const snap=JSON.parse(localStorage.getItem(appliedLegacyKey())||'null');return snap&&(!snap.template_context||snap.template_context===templateContextId())?snap:null}catch{return null}}
'''
new = ''' function appliedRevisionIdbKey(revision){return `${appliedSnapshotIdbKey()}:${String(revision||'')}`}
 async function putAppliedSnapshot(snap){const db=await openDB(),stored={...snap,template_context:templateContextId()};await new Promise((res,rej)=>{const tx=db.transaction('snapshots','readwrite'),store=tx.objectStore('snapshots');store.put(stored,appliedSnapshotIdbKey());if(stored.revision)store.put(stored,appliedRevisionIdbKey(stored.revision));tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error||new Error('IndexedDB transaction aborted'))});try{localStorage.setItem(appliedRefKey(),JSON.stringify({store:'indexeddb',db:'dini-anif-editor-v150',key:appliedSnapshotIdbKey(),revision:stored.revision,applied_at:stored.applied_at,template_context:templateContextId()}))}catch{};try{localStorage.removeItem(appliedLegacyKey())}catch{};try{sessionStorage.removeItem(cleanPreviewStorageKey())}catch{}}
 async function getAppliedSnapshot(revision=''){try{const db=await openDB();const key=revision?appliedRevisionIdbKey(revision):appliedSnapshotIdbKey();const snap=await new Promise((res,rej)=>{const tx=db.transaction('snapshots');const q=tx.objectStore('snapshots').get(key);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)});if(snap&&(!revision||snap.revision===revision)&&(!snap.template_context||snap.template_context===templateContextId()))return snap}catch(e){console.warn('IndexedDB applied snapshot read failed',e)}if(revision)return null;try{const snap=JSON.parse(localStorage.getItem(appliedLegacyKey())||'null');return snap&&(!snap.template_context||snap.template_context===templateContextId())?snap:null}catch{return null}}
'''
if old not in s:
    raise SystemExit('applied snapshot functions anchor not found')
s = s.replace(old,new,1)

old = ''' zipBtn.onclick=async e=>{
   e?.preventDefault?.();
   if(!native)return editorToast('Import ZIP dulu.','error','Belum ada template');
   if(isDirty)return editorToast('Klik APPLY dulu agar ZIP sama 100% dengan Preview Bersih.','info','Belum APPLY');
   const snap=await getAppliedSnapshot();
   if(!snap)return editorToast('Snapshot APPLY belum ada.','error','Belum APPLY');
   window.open(`./clean-preview.html?template=${encodeURIComponent(templateContextId())}&download=1`,'_blank');
 };
 saveDraftBtn.onclick=saveCurrentDraft;
 applyBtn.onclick=async()=>{if(!native)return editorToast('Import Rebuild ZIP dulu.','error','Belum ada template');const t=editorToast('Menyimpan snapshot final + asset ke IndexedDB…','loading','APPLY');try{const revision='r'+Date.now().toString(36),assets=await persistAppliedAssets(revision),html=captureLiveParityHtml(),snap={version:'2.28.0',revision,schema:native.schema,manifest:native.manifest,values:deep(native.values),transforms:deep(transforms),html,assets,applied_at:new Date().toISOString()};await putAppliedSnapshot(snap);isDirty=false;dirty.textContent='APPLIED ✓';finishEditorToast(t,`${assets.length} asset + semua perubahan tersimpan di IndexedDB tanpa batas localStorage kecil.`,'success','APPLY sukses')}catch(e){finishEditorToast(t,e.message,'error','APPLY gagal')}};
 previewBtn.onclick=e=>{e.preventDefault();if(isDirty){editorToast('Ada perubahan belum APPLY. Klik APPLY supaya Preview Bersih memakai snapshot final.','info','Belum APPLY');return}window.open(`./clean-preview.html?template=${encodeURIComponent(templateContextId())}`,'_blank')};
'''
new = ''' function cleanPreviewUrl(snap,{download=false}={}){const q=new URLSearchParams({template:templateContextId(),rev:String(snap?.revision||''),v:'2282'});if(download)q.set('download','1');return './clean-preview.html?'+q.toString()}
 zipBtn.onclick=async e=>{
   e?.preventDefault?.();
   if(!native)return editorToast('Import ZIP dulu.','error','Belum ada template');
   if(isDirty)return editorToast('Klik APPLY dulu agar ZIP sama 100% dengan Preview Bersih.','info','Belum APPLY');
   const snap=await getAppliedSnapshot();
   if(!snap)return editorToast('Snapshot APPLY belum ada.','error','Belum APPLY');
   window.open(cleanPreviewUrl(snap,{download:true}),'_blank');
 };
 saveDraftBtn.onclick=saveCurrentDraft;
 applyBtn.onclick=async()=>{if(!native)return editorToast('Import Rebuild ZIP dulu.','error','Belum ada template');const t=editorToast('Mengunci DOM Editor yang sedang terlihat…','loading','APPLY');try{const revision='r'+Date.now().toString(36),assets=await persistAppliedAssets(revision),html=captureLiveParityHtml(),snap={version:'2.28.2',revision,schema:deep(native.schema),manifest:deep(native.manifest||{}),values:deep(native.values),transforms:deep(transforms),html,assets,template_context:templateContextId(),applied_at:new Date().toISOString()};await putAppliedSnapshot(snap);isDirty=false;dirty.textContent=`APPLIED ✓ · ${revision}`;finishEditorToast(t,`${assets.length} asset + DOM Editor CURRENT dikunci sebagai revision ${revision}.`,'success','APPLY parity terkunci')}catch(e){finishEditorToast(t,e.message,'error','APPLY gagal')}};
 previewBtn.onclick=async e=>{e.preventDefault();if(isDirty){editorToast('Ada perubahan belum APPLY. Klik APPLY supaya Preview Bersih memakai snapshot final.','info','Belum APPLY');return}const snap=await getAppliedSnapshot();if(!snap)return editorToast('Snapshot APPLY belum ada. Klik APPLY dulu.','error','Belum APPLY');window.open(cleanPreviewUrl(snap),'_blank')};
'''
if old not in s:
    raise SystemExit('apply/preview/zip anchor not found')
s = s.replace(old,new,1)
editor.write_text(s,encoding='utf-8')

s = clean.read_text(encoding='utf-8')
old = "  const previewTemplate=String(new URLSearchParams(location.search).get('template')||'standalone').trim()||'standalone';\n  const previewScopedKey=base=>`${base}:${encodeURIComponent(previewTemplate)}`;\n  const appliedKey=`native-applied:${previewTemplate}`;"
new = "  const cleanParams=new URLSearchParams(location.search);\n  const previewTemplate=String(cleanParams.get('template')||'standalone').trim()||'standalone';\n  const requestedRevision=String(cleanParams.get('rev')||'').trim();\n  const previewScopedKey=base=>`${base}:${encodeURIComponent(previewTemplate)}`;\n  const appliedKey=requestedRevision?`native-applied:${previewTemplate}:${requestedRevision}`:`native-applied:${previewTemplate}`;"
if old not in s:
    raise SystemExit('clean preview param anchor not found')
s = s.replace(old,new,1)
old = "  if(!snap){try{snap=JSON.parse(sessionStorage.getItem(previewScopedKey('diniAnifCleanPreviewApplied'))||localStorage.getItem(previewScopedKey('diniAnifNativeApplied'))||'null')}catch{}}\n  if(!snap?.html){frame.hidden=true;empty.hidden=false;return}empty.hidden=true;frame.hidden=false;"
new = "  if(snap&&requestedRevision&&snap.revision!==requestedRevision)snap=null;\n  if(!snap&&!requestedRevision){try{snap=JSON.parse(sessionStorage.getItem(previewScopedKey('diniAnifCleanPreviewApplied'))||localStorage.getItem(previewScopedKey('diniAnifNativeApplied'))||'null')}catch{}}\n  if(!snap?.html){frame.hidden=true;empty.hidden=false;empty.textContent=requestedRevision?`Snapshot APPLY ${requestedRevision} tidak ditemukan. Kembali ke Editor dan APPLY ulang.`:'Belum ada snapshot APPLY. Kembali ke Editor lalu klik APPLY.';return}empty.hidden=true;frame.hidden=false;"
if old not in s:
    raise SystemExit('clean preview fallback anchor not found')
s = s.replace(old,new,1)
s = s.replace("preview:'clean-parity-v1.8.0',editor:'v1.8.0'","preview:'clean-parity-v2.28.2',editor:'v2.28.2'",1)
clean.write_text(s,encoding='utf-8')

s = index.read_text(encoding='utf-8')
s = s.replace('<script src="./editor.js"></script>','<script src="./editor.js?v=2282"></script>')
s = s.replace('./force-visible-v2274.js?v=2281','./force-visible-v2274.js?v=2282')
s = s.replace('./preview-rescue.js?v=2281','./preview-rescue.js?v=2282')
s = s.replace('./exact-source-preview-v2275.js?v=2281','./exact-source-preview-v2275.js?v=2282')
index.write_text(s,encoding='utf-8')

s = clean_html.read_text(encoding='utf-8')
s = s.replace('Clean Preview · Applied Snapshot V1.8.0','Clean Preview · Applied Snapshot V2.28.2')
s = s.replace('<script src="./clean-preview.js"></script>','<script src="./clean-preview.js?v=2282"></script>')
clean_html.write_text(s,encoding='utf-8')

print('V2.28.2 applied snapshot exact-revision parity patch applied')
