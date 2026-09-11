from pathlib import Path


def read(path):
    return Path(path).read_text(encoding='utf-8')

def write(path, text):
    Path(path).write_text(text, encoding='utf-8')

def once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'PATCH ANCHOR NOT FOUND: {label}')
    return text.replace(old, new, 1)

# -----------------------------------------------------------------------------
# EDITOR — every mutable browser state is scoped to the selected template.
# -----------------------------------------------------------------------------
p = 'dashboard-admin-edit/editor.js'
s = read(p)

old = """ let currentTemplateRecord=null, currentTemplateLoadPromise=null;
 let pendingB2Upload=null;
 try{const savedPending=JSON.parse(localStorage.getItem('diniAnifPendingB2Upload')||'null');if(savedPending?.object_key)pendingB2Upload=savedPending}catch{}
"""
new = """ let currentTemplateRecord=null, currentTemplateLoadPromise=null;
 const editorParams=new URLSearchParams(location.search);
 const requestedTemplate=String(editorParams.get('template')||'').trim();
 function templateContextId(rec=currentTemplateRecord){return requestedTemplate||String(rec?.slug||rec?.id||'standalone')}
 function scopedStorageKey(base,rec=currentTemplateRecord){return `${base}:${encodeURIComponent(templateContextId(rec))}`}
 function draftKey(){return scopedStorageKey('diniAnifNativeDraft-v170')}
 function pendingB2Key(){return scopedStorageKey('diniAnifPendingB2Upload')}
 function handoffKey(){return scopedStorageKey('diniAnifRebuildSnapshot')}
 function handoffWindowPrefix(){return `__DINI_ANIF_REBUILD__${encodeURIComponent(templateContextId())}__`}
 function appliedSnapshotIdbKey(){return `native-applied:${templateContextId()}`}
 function appliedRefKey(){return scopedStorageKey('diniAnifNativeAppliedRef')}
 function appliedLegacyKey(){return scopedStorageKey('diniAnifNativeApplied')}
 function cleanPreviewStorageKey(){return scopedStorageKey('diniAnifCleanPreviewApplied')}
 function sameSource(a,b){try{const x=new URL(String(a||''),location.href),y=new URL(String(b||''),location.href);x.hash='';y.hash='';x.search='';y.search='';return x.href===y.href}catch{return String(a||'')===String(b||'')}}
 let pendingB2Upload=null;
 try{const savedPending=JSON.parse(localStorage.getItem(pendingB2Key())||'null');if(savedPending?.object_key)pendingB2Upload=savedPending}catch{}
"""
s = once(s, old, new, 'editor context helpers')
s = once(s, " const DRAFT_KEY='diniAnifNativeDraft-v169';", " const LEGACY_GLOBAL_DRAFT_KEY='diniAnifNativeDraft-v169';", 'legacy global draft declaration')

old = """ function templateRecoveryKey(rec=currentTemplateRecord){
   const id=rec?.id||rec?.slug||new URLSearchParams(location.search).get('template')||'fetch-session';
   return `diniAnifRecovery:${id}`;
 }
"""
new = """ function templateRecoveryKey(rec=currentTemplateRecord){
   const id=requestedTemplate||rec?.slug||rec?.id||'standalone';
   return `diniAnifRecovery:${encodeURIComponent(String(id))}`;
 }
"""
s = once(s, old, new, 'template recovery scope')

# Replace all editor-local global draft state accesses with the selected-template key.
s = s.replace('localStorage.setItem(DRAFT_KEY,', 'localStorage.setItem(draftKey(),')
s = s.replace('localStorage.getItem(DRAFT_KEY)', 'localStorage.getItem(draftKey())')
s = s.replace('localStorage.removeItem(DRAFT_KEY)', 'localStorage.removeItem(draftKey())')
s = s.replace("localStorage.getItem('diniAnifPendingB2Upload')", 'localStorage.getItem(pendingB2Key())')
s = s.replace("localStorage.setItem('diniAnifPendingB2Upload',", 'localStorage.setItem(pendingB2Key(),')
s = s.replace("localStorage.removeItem('diniAnifPendingB2Upload')", 'localStorage.removeItem(pendingB2Key())')

old = """ async function putAppliedSnapshot(snap){const db=await openDB();await new Promise((res,rej)=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(snap,'native-applied');tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error||new Error('IndexedDB transaction aborted'))});try{localStorage.setItem('diniAnifNativeAppliedRef',JSON.stringify({store:'indexeddb',db:'dini-anif-editor-v150',key:'native-applied',revision:snap.revision,applied_at:snap.applied_at}))}catch{};try{localStorage.removeItem('diniAnifNativeApplied')}catch{};try{sessionStorage.removeItem('diniAnifCleanPreviewApplied')}catch{}}
 async function getAppliedSnapshot(){try{const db=await openDB();const snap=await new Promise((res,rej)=>{const tx=db.transaction('snapshots');const q=tx.objectStore('snapshots').get('native-applied');q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)});if(snap)return snap}catch(e){console.warn('IndexedDB applied snapshot read failed',e)}try{return JSON.parse(localStorage.getItem('diniAnifNativeApplied')||'null')}catch{return null}}
 async function deleteAppliedSnapshot(){try{const db=await openDB();await new Promise((res,rej)=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').delete('native-applied');tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}catch{}try{localStorage.removeItem('diniAnifNativeApplied');localStorage.removeItem('diniAnifNativeAppliedRef')}catch{}try{sessionStorage.removeItem('diniAnifCleanPreviewApplied')}catch{}}
"""
new = """ async function putAppliedSnapshot(snap){const db=await openDB(),stored={...snap,template_context:templateContextId()};await new Promise((res,rej)=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(stored,appliedSnapshotIdbKey());tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error||new Error('IndexedDB transaction aborted'))});try{localStorage.setItem(appliedRefKey(),JSON.stringify({store:'indexeddb',db:'dini-anif-editor-v150',key:appliedSnapshotIdbKey(),revision:stored.revision,applied_at:stored.applied_at,template_context:templateContextId()}))}catch{};try{localStorage.removeItem(appliedLegacyKey())}catch{};try{sessionStorage.removeItem(cleanPreviewStorageKey())}catch{}}
 async function getAppliedSnapshot(){try{const db=await openDB();const snap=await new Promise((res,rej)=>{const tx=db.transaction('snapshots');const q=tx.objectStore('snapshots').get(appliedSnapshotIdbKey());q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)});if(snap&&(!snap.template_context||snap.template_context===templateContextId()))return snap}catch(e){console.warn('IndexedDB applied snapshot read failed',e)}try{const snap=JSON.parse(localStorage.getItem(appliedLegacyKey())||'null');return snap&&(!snap.template_context||snap.template_context===templateContextId())?snap:null}catch{return null}}
 async function deleteAppliedSnapshot(){try{const db=await openDB();await new Promise((res,rej)=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').delete(appliedSnapshotIdbKey());tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}catch{}try{localStorage.removeItem(appliedLegacyKey());localStorage.removeItem(appliedRefKey())}catch{}try{sessionStorage.removeItem(cleanPreviewStorageKey())}catch{}}
"""
s = once(s, old, new, 'scoped applied snapshot')

s = once(s, "window.open('./clean-preview.html','_blank')", "window.open(`./clean-preview.html?template=${encodeURIComponent(templateContextId())}`,'_blank')", 'clean preview template context')

old = """ resetBtn.onclick=async()=>{if(!confirm('Reset editor dan hapus draft lokal?'))return;localStorage.removeItem(draftKey());localStorage.removeItem(LEGACY_DRAFT_KEY);await deleteAppliedSnapshot();location.reload()};
 function snapshotHandoffRaw(){
   try{const v=sessionStorage.getItem('diniAnifRebuildSnapshot');if(v)return v}catch{}
   try{const v=localStorage.getItem('diniAnifRebuildSnapshot');if(v)return v}catch{}
   try{if(typeof window.name==='string'&&window.name.startsWith('__DINI_ANIF_REBUILD__'))return window.name.slice('__DINI_ANIF_REBUILD__'.length)}catch{}
   return ''
 }
"""
new = """ resetBtn.onclick=async()=>{if(!confirm('Reset editor dan hapus draft lokal untuk template ini?'))return;localStorage.removeItem(draftKey());localStorage.removeItem(templateRecoveryKey());localStorage.removeItem(pendingB2Key());localStorage.removeItem(handoffKey());sessionStorage.removeItem(handoffKey());try{if(typeof window.name==='string'&&window.name.startsWith(handoffWindowPrefix()))window.name=''}catch{}await deleteAppliedSnapshot();location.reload()};
 function snapshotHandoffRaw(){
   const key=handoffKey(),prefix=handoffWindowPrefix();
   try{const v=sessionStorage.getItem(key);if(v)return v}catch{}
   try{const v=localStorage.getItem(key);if(v)return v}catch{}
   try{if(typeof window.name==='string'&&window.name.startsWith(prefix))return window.name.slice(prefix.length)}catch{}
   return ''
 }
"""
s = once(s, old, new, 'scoped handoff reader and reset')

old = """     const pack=JSON.parse(raw),schema=pack?.native?.schema||pack?.schema?.native,html=pack?.native?.html||'';
     if(!schema||!Array.isArray(schema.fields)||!html)return false;
"""
new = """     const pack=JSON.parse(raw),schema=pack?.native?.schema||pack?.schema?.native,html=pack?.native?.html||'';
     const handoffTemplate=String(pack?.manifest?.editor_context_template||'').trim();
     const handoffSource=String(pack?.manifest?.editor_context_source||pack?.manifest?.source_url||pack?.native?.source_url||'').trim();
     if(requestedTemplate&&handoffTemplate!==requestedTemplate){console.warn('HANDOFF_TEMPLATE_MISMATCH',{expected:requestedTemplate,received:handoffTemplate});return false}
     if(currentTemplateRecord?.source_path&&handoffSource&&!sameSource(currentTemplateRecord.source_path,handoffSource)){console.warn('HANDOFF_SOURCE_MISMATCH',{expected:currentTemplateRecord.source_path,received:handoffSource});return false}
     if(!schema||!Array.isArray(schema.fields)||!html)return false;
"""
s = once(s, old, new, 'handoff identity validation')

old = """     try{localStorage.setItem(draftKey(),JSON.stringify({schema:native.schema,baseHtml:native.baseHtml,manifest:native.manifest,values:native.values}))}catch{}
     editorToast('Snapshot dari Fetch/Preview dimuat otomatis. Tidak perlu Import ZIP ulang.','success','Editor terhubung');
"""
new = """     try{localStorage.setItem(draftKey(),JSON.stringify({schema:native.schema,baseHtml:native.baseHtml,manifest:native.manifest,values:native.values}))}catch{}
     try{sessionStorage.removeItem(handoffKey());localStorage.removeItem(handoffKey());if(typeof window.name==='string'&&window.name.startsWith(handoffWindowPrefix()))window.name=''}catch{}
     editorToast(`Snapshot khusus ${templateContextId()} dari Fetch dimuat otomatis.`, 'success','Editor terhubung');
"""
s = once(s, old, new, 'consume handoff once')

s = once(s, "     if(recordOnly)return true;", "     if(recordOnly){finishEditorToast(t,`${data.name} dipilih. Menunggu Source Graph khusus template ini…`,'success','Template terkunci');return true}", 'record-only toast completion')

old = """         const parsed=await rr.json();
         if(!parsed?.schema||!Array.isArray(parsed.schema.fields)||!(parsed.baseHtml||parsed.html)){lastSnapshotError=`${candidate} -> snapshot tidak valid`;continue}
         snap=parsed;snapUrl=candidate;break;
"""
new = """         const parsed=await rr.json();
         if(!parsed?.schema||!Array.isArray(parsed.schema.fields)||!(parsed.baseHtml||parsed.html)){lastSnapshotError=`${candidate} -> snapshot tidak valid`;continue}
         const expectedRevision=String(data.manifest_json?.revision||'').trim(),parsedRevision=String(parsed?.manifest?.revision||parsed?.revision||'').trim();
         if(expectedRevision&&parsedRevision&&expectedRevision!==parsedRevision){lastSnapshotError=`${candidate} -> revision mismatch ${parsedRevision} != ${expectedRevision}`;continue}
         snap=parsed;snapUrl=candidate;break;
"""
s = once(s, old, new, 'cloud snapshot revision validation')

s = s.replace("const handoffMode=new URLSearchParams(location.search).get('handoff')==='1';", "const handoffMode=editorParams.get('handoff')==='1';")

# Exact-template handoff must never be replaced by the legacy generic invitation fallback.
old = """if(!els.length){const handoffMode=new URLSearchParams(location.search).get('handoff')==='1';const sourceGraphReady=handoffMode&&((b.innerHTML||'').trim().length>300||!!b.querySelector('[data-native-edit-id],[data-native-edit-ids],section,.elementor-top-section,img,video,main,#cover'));if(sourceGraphReady){console.info('Exact-template handoff: legacy blank guard skipped while source preview hydrates');setTimeout(()=>{try{installFrameBridge();if(selectedFieldId)highlightSelection()}catch{}},1200);return}console.warn('Editor preview blank guard triggered');frame.removeAttribute('srcdoc');frame.src='./invitation.html?editor=1&blankguard=1';editorToast('Draft preview lama tidak kompatibel. Import ulang Rebuild ZIP terbaru.','info','Preview dipulihkan')}"""
new = """if(!els.length){const handoffMode=editorParams.get('handoff')==='1';if(handoffMode){console.info('Exact-template handoff: generic blank fallback disabled; preserving selected template source');setTimeout(()=>{try{installFrameBridge();if(selectedFieldId)highlightSelection()}catch{}},1400);return}console.warn('Editor preview blank guard triggered');frame.removeAttribute('srcdoc');frame.src='./invitation.html?editor=1&blankguard=1';editorToast('Draft preview lama tidak kompatibel. Import ulang Rebuild ZIP terbaru.','info','Preview dipulihkan')}"""
s = once(s, old, new, 'disable generic blank fallback for exact handoff')

# Selected-template boot may only restore selected-template recovery/draft; global V169 is quarantined.
if 'localStorage.getItem(draftKey())' not in s:
    raise SystemExit('Scoped draft getter did not land')

write(p, s)

# -----------------------------------------------------------------------------
# FETCH/STUDIO — handoff snapshot is scoped by template and carries identity.
# -----------------------------------------------------------------------------
p = 'dashboard-admin-fetch/studio.js'
s = read(p)

old = """  let analysis=null, rebuild=null, sourceBaseUrl='';


"""
new = """  let analysis=null, rebuild=null, sourceBaseUrl='';
  const studioParams=new URLSearchParams(location.search);
  const studioTemplate=String(studioParams.get('template')||'').trim();
  const studioStorageKey=base=>studioTemplate?`${base}:${encodeURIComponent(studioTemplate)}`:base;
  const studioWindowPrefix=()=>studioTemplate?`__DINI_ANIF_REBUILD__${encodeURIComponent(studioTemplate)}__`:'__DINI_ANIF_REBUILD__';


"""
s = once(s, old, new, 'studio template context helpers')

old = """      manifest:{format:'dini-anif-rebuild-package',version:3,engine:'source-native-rebuild-v2.26-smart-source-ownership',created_at:new Date().toISOString(),invitation_id:(globalThis.crypto?.randomUUID?.()||('inv-'+Date.now()+'-'+Math.random().toString(36).slice(2))),template:'source-native',source_url:sourceBaseUrl||'',visual_manifest:lastVisualManifest,source_graph:lastSourceGraph,identity_sanitized:true},
"""
new = """      manifest:{format:'dini-anif-rebuild-package',version:3,engine:'source-native-rebuild-v2.27-template-isolation',created_at:new Date().toISOString(),invitation_id:(globalThis.crypto?.randomUUID?.()||('inv-'+Date.now()+'-'+Math.random().toString(36).slice(2))),template:'source-native',source_url:sourceBaseUrl||'',editor_context_template:studioTemplate||'',editor_context_source:studioTemplate?(sourceBaseUrl||''):'',visual_manifest:lastVisualManifest,source_graph:lastSourceGraph,identity_sanitized:true},
"""
s = once(s, old, new, 'studio manifest identity')

s = s.replace("localStorage.setItem('diniAnifRebuildSnapshot',", "localStorage.setItem(studioStorageKey('diniAnifRebuildSnapshot'),")
s = s.replace("sessionStorage.setItem('diniAnifRebuildSnapshot',", "sessionStorage.setItem(studioStorageKey('diniAnifRebuildSnapshot'),")
s = s.replace("localStorage.getItem('diniAnifRebuildSnapshot')", "localStorage.getItem(studioStorageKey('diniAnifRebuildSnapshot'))")
s = s.replace("sessionStorage.getItem('diniAnifRebuildSnapshot')", "sessionStorage.getItem(studioStorageKey('diniAnifRebuildSnapshot'))")
s = s.replace("localStorage.removeItem('diniAnifRebuildSnapshot')", "localStorage.removeItem(studioStorageKey('diniAnifRebuildSnapshot'))")
s = s.replace("sessionStorage.removeItem('diniAnifRebuildSnapshot')", "sessionStorage.removeItem(studioStorageKey('diniAnifRebuildSnapshot'))")
s = s.replace("localStorage.setItem('diniAnifNativeHtml',", "localStorage.setItem(studioStorageKey('diniAnifNativeHtml'),")
s = s.replace("sessionStorage.setItem('diniAnifNativeHtml',", "sessionStorage.setItem(studioStorageKey('diniAnifNativeHtml'),")
s = s.replace("localStorage.setItem('artSundaMerahPreview',", "localStorage.setItem(studioStorageKey('artSundaMerahPreview'),")
s = s.replace("sessionStorage.setItem('artSundaMerahPreview',", "sessionStorage.setItem(studioStorageKey('artSundaMerahPreview'),")
s = s.replace("localStorage.removeItem('artSundaMerahPreview')", "localStorage.removeItem(studioStorageKey('artSundaMerahPreview'))")
s = s.replace("sessionStorage.removeItem('artSundaMerahPreview')", "sessionStorage.removeItem(studioStorageKey('artSundaMerahPreview'))")

s = once(s, "    try{window.name='__DINI_ANIF_REBUILD__'+snapshotRaw}catch{}", "    try{window.name=studioWindowPrefix()+snapshotRaw}catch{}", 'studio build window handoff')
s = once(s, "    const raw=localStorage.getItem(studioStorageKey('diniAnifRebuildSnapshot'));if(!raw)throw new Error('Belum ada rebuild snapshot.');", "    const raw=currentSnapshotRaw();if(!raw)throw new Error('Belum ada rebuild snapshot.');", 'package uses current scoped snapshot')

old = """    if(typeof window.name==='string'&&window.name.startsWith('__DINI_ANIF_REBUILD__')) return window.name.slice('__DINI_ANIF_REBUILD__'.length);
"""
new = """    const prefix=studioWindowPrefix();if(typeof window.name==='string'&&window.name.startsWith(prefix)) return window.name.slice(prefix.length);
"""
s = once(s, old, new, 'studio current window handoff')

old = """    try{window.name='__DINI_ANIF_REBUILD__'+raw;saved++}catch(err){console.warn('window.name handoff failed',err)}
"""
new = """    try{window.name=studioWindowPrefix()+raw;saved++}catch(err){console.warn('window.name handoff failed',err)}
"""
s = once(s, old, new, 'studio persist window handoff')

old = """      try{localStorage.removeItem(studioStorageKey('diniAnifRebuildSnapshot'));sessionStorage.removeItem(studioStorageKey('diniAnifRebuildSnapshot'));window.name=''}catch{}
      sourceUrl.value=target;
"""
new = """      try{localStorage.removeItem(studioStorageKey('diniAnifRebuildSnapshot'));sessionStorage.removeItem(studioStorageKey('diniAnifRebuildSnapshot'));if(studioTemplate){localStorage.removeItem('diniAnifRebuildSnapshot');sessionStorage.removeItem('diniAnifRebuildSnapshot')}window.name=''}catch{}
      sourceUrl.value=target;
"""
s = once(s, old, new, 'auto-edit stale global quarantine')

old = """      await build();
      const raw=currentSnapshotRaw();
"""
new = """      await build();
      rebuild.manifest.editor_context_template=template;
      rebuild.manifest.editor_context_source=target;
      const raw=JSON.stringify(rebuild);
"""
s = once(s, old, new, 'auto-edit explicit identity seal')

# Existing snapshot restore must use the active template scoped key.
s = once(s, "  const existing=localStorage.getItem(studioStorageKey('diniAnifRebuildSnapshot'));", "  const existing=localStorage.getItem(studioStorageKey('diniAnifRebuildSnapshot'));", 'studio existing scoped key')

write(p, s)

# -----------------------------------------------------------------------------
# CLEAN PREVIEW — read only the APPLY snapshot of the requested template.
# -----------------------------------------------------------------------------
p = 'dashboard-admin-edit/clean-preview.js'
s = read(p)
old = """  const frame=document.getElementById('cleanFrame'),empty=document.getElementById('empty');let snap=null;
"""
new = """  const frame=document.getElementById('cleanFrame'),empty=document.getElementById('empty');let snap=null;
  const previewTemplate=String(new URLSearchParams(location.search).get('template')||'standalone').trim()||'standalone';
  const previewScopedKey=base=>`${base}:${encodeURIComponent(previewTemplate)}`;
  const appliedKey=`native-applied:${previewTemplate}`;
"""
s = once(s, old, new, 'clean preview context')
s = once(s, "tx.objectStore('snapshots').get('native-applied')", "tx.objectStore('snapshots').get(appliedKey)", 'clean preview scoped idb')
s = once(s, "sessionStorage.getItem('diniAnifCleanPreviewApplied')||localStorage.getItem('diniAnifNativeApplied')", "sessionStorage.getItem(previewScopedKey('diniAnifCleanPreviewApplied'))||localStorage.getItem(previewScopedKey('diniAnifNativeApplied'))", 'clean preview scoped fallback')
write(p, s)

# -----------------------------------------------------------------------------
# Static invariants — fail closed before any commit if global cross-template paths remain.
# -----------------------------------------------------------------------------
editor = read('dashboard-admin-edit/editor.js')
studio = read('dashboard-admin-fetch/studio.js')
clean = read('dashboard-admin-edit/clean-preview.js')
checks = {
    'editor requested template context': 'const requestedTemplate=' in editor,
    'editor scoped draft': "diniAnifNativeDraft-v170" in editor and 'localStorage.getItem(draftKey())' in editor,
    'editor scoped handoff': "sessionStorage.getItem(key)" in editor and 'HANDOFF_TEMPLATE_MISMATCH' in editor,
    'editor scoped applied': 'appliedSnapshotIdbKey()' in editor and "put(stored,appliedSnapshotIdbKey())" in editor,
    'editor handoff generic fallback disabled': 'generic blank fallback disabled' in editor,
    'studio scoped snapshot': "studioStorageKey('diniAnifRebuildSnapshot')" in studio,
    'studio identity seal': 'editor_context_template:studioTemplate' in studio and 'rebuild.manifest.editor_context_template=template' in studio,
    'clean preview scoped': 'const appliedKey=`native-applied:${previewTemplate}`' in clean,
}
failed=[k for k,v in checks.items() if not v]
if failed:
    raise SystemExit('INVARIANT FAILURE: '+', '.join(failed))
print('Template isolation V2.27 patch invariants: OK')
