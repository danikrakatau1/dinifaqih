from pathlib import Path
import subprocess, re, shutil

BASE='839aa2f'
ROOT=Path('.')
OUT=ROOT/'dashboard-admin-edit-v229'
FILES=['index.html','styles.css','defaults.js','package-manifest.js','zip-builder.js','editor.js','clean-preview.html','clean-preview.js']

def old(path):
    return subprocess.check_output(['git','show',f'{BASE}:{path}']).decode('utf-8')

def write(path,text):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(text,encoding='utf-8')

if OUT.exists(): shutil.rmtree(OUT)
OUT.mkdir(parents=True)
for name in FILES:
    write(OUT/name,old('dashboard-admin-edit/'+name))
write(OUT/'source-fallbacks/post-183200.css',old('dashboard-admin-edit/source-fallbacks/post-183200.css'))
write(OUT/'invitation.html','''<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>V2.29 Editor Guard</title><style>html,body{margin:0;min-height:100%;display:grid;place-items:center;background:#fff;color:#555;font:14px system-ui;text-align:center}div{max-width:360px;padding:28px}</style></head><body><div><b>V2.29: belum ada template tervalidasi.</b><br><small>Renderer tidak akan menampilkan template fallback lain.</small></div></body></html>''')

# ---- V2.29 editor shell: V2.26 renderer only ----
p=OUT/'index.html'; s=p.read_text()
s=s.replace('<base href="/dashboard-admin-edit/">','<base href="/dashboard-admin-edit-v229/">')
s=s.replace('<title>Dini Anif — Template Editor</title>','<title>Dini Anif — Template Editor V2.29 Recovery</title>')
s=s.replace('<h1>DINI ANIF — TEMPLATE EDITOR</h1>','<h1>DINI ANIF — TEMPLATE EDITOR <span style="color:#d6b97c">V2.29 RECOVERY</span></h1>')
s=s.replace('<p>Editor native berbasis runtime Preview. Layout dan motion source dipertahankan; perubahan hanya diterapkan pada field yang dipilih.</p>','<p>Golden V2.26 Smart Source Ownership + UUID isolation V2.29. Satu renderer saja; tanpa exact-source/rescue/fallback visual lain.</p>')
s=s.replace('<script src="./editor.js"></script>','<script src="./editor.js?v=2290"></script>')
p.write_text(s)

p=OUT/'editor.js'; s=p.read_text()
old_top=""" let currentTemplateRecord=null, currentTemplateLoadPromise=null;\n let pendingB2Upload=null;\n try{const savedPending=JSON.parse(localStorage.getItem('diniAnifPendingB2Upload')||'null');if(savedPending?.object_key)pendingB2Upload=savedPending}catch{}\n const DINI_ANIF_SUPABASE_URL='https://jfvmcerrsxjvbiogfqes.supabase.co';\n const DINI_ANIF_SUPABASE_KEY='sb_publishable_3IqSDxkpxCGiDpxAEwdsXQ_AsJpsC4W';\n const adminSb=window.supabase?.createClient?.(DINI_ANIF_SUPABASE_URL,DINI_ANIF_SUPABASE_KEY);\n const TEMPLATE_BUCKET='template-packages';\n const DRAFT_KEY='diniAnifNativeDraft-v169';\n"""
new_top=""" let currentTemplateRecord=null, currentTemplateLoadPromise=null;\n const editorParams=new URLSearchParams(location.search);\n const requestedTemplate=String(editorParams.get('template')||'').trim();\n const requestedRecord=String(editorParams.get('record')||requestedTemplate).trim();\n const handoffMode=editorParams.get('handoff')==='1';\n const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;\n const isUuid=v=>UUID_RE.test(String(v||''));\n function templateContextId(rec=currentTemplateRecord){return requestedTemplate||String(rec?.id||rec?.slug||'standalone')}\n function scopedStorageKey(base,rec=currentTemplateRecord){const id=templateContextId(rec);return id==='standalone'?base:`${base}:${encodeURIComponent(id)}`}\n function handoffKey(){return scopedStorageKey('diniAnifRebuildSnapshot')}\n function handoffWindowPrefix(){const id=templateContextId();return id==='standalone'?'__DINI_ANIF_REBUILD__':`__DINI_ANIF_REBUILD__${encodeURIComponent(id)}__`}\n function appliedSnapshotIdbKey(){return `native-applied:v229:${templateContextId()}`}\n function appliedRefKey(){return scopedStorageKey('diniAnifNativeAppliedRef:v229')}\n function pendingB2Key(){return scopedStorageKey('diniAnifPendingB2Upload:v229')}\n function sameSource(a,b){try{const x=new URL(String(a||''),location.href),y=new URL(String(b||''),location.href);x.hash='';y.hash='';x.search='';y.search='';return x.href===y.href}catch{return String(a||'')===String(b||'')}}\n let pendingB2Upload=null;\n try{const savedPending=JSON.parse(localStorage.getItem(pendingB2Key())||'null');if(savedPending?.object_key)pendingB2Upload=savedPending}catch{}\n const DINI_ANIF_SUPABASE_URL='https://jfvmcerrsxjvbiogfqes.supabase.co';\n const DINI_ANIF_SUPABASE_KEY='sb_publishable_3IqSDxkpxCGiDpxAEwdsXQ_AsJpsC4W';\n const adminSb=window.supabase?.createClient?.(DINI_ANIF_SUPABASE_URL,DINI_ANIF_SUPABASE_KEY);\n const TEMPLATE_BUCKET='template-packages';\n const DRAFT_KEY=scopedStorageKey('diniAnifNativeDraft-v229');\n"""
if old_top not in s: raise SystemExit('V229 top anchor missing')
s=s.replace(old_top,new_top,1)
s=re.sub(r"function templateRecoveryKey\(rec=currentTemplateRecord\)\{.*?\n \}","function templateRecoveryKey(rec=currentTemplateRecord){return `diniAnifRecovery:v229:${encodeURIComponent(templateContextId(rec))}`\n }",s,count=1,flags=re.S)
s=s.replace("localStorage.setItem('diniAnifPendingB2Upload',JSON.stringify(pendingB2Upload))","localStorage.setItem(pendingB2Key(),JSON.stringify(pendingB2Upload))")
s=s.replace("localStorage.removeItem('diniAnifPendingB2Upload')","localStorage.removeItem(pendingB2Key())")

# Applied snapshot is isolated from production and from every other template.
s=s.replace("tx.objectStore('snapshots').put(snap,'native-applied')","tx.objectStore('snapshots').put(snap,appliedSnapshotIdbKey())")
s=s.replace("key:'native-applied'","key:appliedSnapshotIdbKey()")
s=s.replace("localStorage.setItem('diniAnifNativeAppliedRef'","localStorage.setItem(appliedRefKey()")
s=s.replace("localStorage.removeItem('diniAnifNativeApplied')","localStorage.removeItem(scopedStorageKey('diniAnifNativeApplied:v229'))")
s=s.replace("sessionStorage.removeItem('diniAnifCleanPreviewApplied')","sessionStorage.removeItem(scopedStorageKey('diniAnifCleanPreviewApplied:v229'))")
s=s.replace("tx.objectStore('snapshots').get('native-applied')","tx.objectStore('snapshots').get(appliedSnapshotIdbKey())")
s=s.replace("localStorage.getItem('diniAnifNativeApplied')","localStorage.getItem(scopedStorageKey('diniAnifNativeApplied:v229'))")
s=s.replace("tx.objectStore('snapshots').delete('native-applied')","tx.objectStore('snapshots').delete(appliedSnapshotIdbKey())")
s=s.replace("localStorage.removeItem('diniAnifNativeAppliedRef')","localStorage.removeItem(appliedRefKey())")

# UUID-only Template Library resolver. A UUID is never reinterpreted as a slug.
start=s.index(' async function loadTemplateFromLibrary(){')
end=s.index(' async function persistImportedDraft(){',start)
strict_loader=r''' async function setCurrentRecordContextStrict(){
   if(!requestedTemplate)return null;
   if(!adminSb)throw new Error('Supabase client tidak tersedia.');
   if(!isUuid(requestedTemplate))throw new Error('V2.29 mewajibkan UUID template dari Template Library.');
   if(requestedRecord&&requestedRecord!==requestedTemplate)throw new Error('Template UUID dan record UUID tidak sama.');
   const lookup=await adminSb.from('templates').select('*').eq('id',requestedTemplate).limit(1).maybeSingle();
   if(lookup.error)throw lookup.error;
   const data=lookup.data;if(!data)throw new Error('Record UUID template tidak ditemukan.');
   if(String(data.id)!==requestedTemplate)throw new Error('Record UUID mismatch.');
   currentTemplateRecord=data;
   pendingB2Upload=data.manifest_json?.package_storage||((data.storage_provider==='backblaze-b2'&&data.b2_object_key)?{provider:'backblaze-b2',bucket:data.b2_bucket,object_key:data.b2_object_key,original_filename:data.original_filename,file_size:data.file_size,mime_type:data.mime_type,etag:data.b2_etag,uploaded_at:data.storage_uploaded_at}:null);
   if(pendingB2Upload)setB2State('success',`✓ ${pendingB2Upload.original_filename||'Paket B2'} · ${fmtBytes(pendingB2Upload.file_size)} · ${pendingB2Upload.bucket}/${pendingB2Upload.object_key}`,100);
   return data;
 }
 async function loadTemplateFromLibrary(){
   if(!requestedTemplate)return false;
   const t=editorToast('Memuat snapshot Draft berdasarkan UUID…','loading','V2.29 Record Lock');
   try{
     const data=await setCurrentRecordContextStrict();
     let snapUrl=data.manifest_json?.editor_snapshot_url||'';
     if(!snapUrl&&data.source_path&&data.source_path!=='/')snapUrl=data.source_path.replace(/\/index\.html(?:\?.*)?$/,'/editor-snapshot.json');
     if(!snapUrl)throw new Error('Record belum memiliki editor snapshot. Gunakan Edit V2.29 dari Template Library.');
     const r=await fetch(snapUrl,{cache:'no-store'});if(!r.ok)throw new Error(`Snapshot HTTP ${r.status}`);
     const snap=await r.json();
     if(!snap?.schema||!Array.isArray(snap.schema.fields)||!(snap.baseHtml||snap.html))throw new Error('Snapshot Draft tidak valid.');
     native={schema:deep(snap.schema),baseHtml:snap.baseHtml||snap.html,manifest:deep(snap.manifest||data.manifest_json||{}),values:deep(snap.values||{})};
     for(const k of Object.keys(transforms))delete transforms[k];Object.assign(transforms,deep(snap.transforms||{}));
     generatedAssets.clear();projectAssets.clear();localizedLinks.clear();history.length=future.length=0;selectedFieldId='';isDirty=false;
     dirty.textContent=`V2.29 UUID LOCKED ✓ · ${native.schema.fields.length} field`;saveDraftBtn.disabled=false;
     renderNativeEditor();renderPreview(true);renderInspector();
     try{localStorage.setItem(DRAFT_KEY,JSON.stringify({schema:native.schema,baseHtml:native.baseHtml,manifest:native.manifest,values:native.values,transforms:deep(transforms)}))}catch{};saveRecovery();
     finishEditorToast(t,`${data.name} dibuka dari UUID ${data.id}.`,'success','V2.29 Draft siap');
     return true;
   }catch(e){finishEditorToast(t,e.message||String(e),'error','V2.29 buka Draft gagal');return false}
 }
'''
s=s[:start]+strict_loader+s[end:]

# Scoped + validated Fetch handoff.
start=s.index(' function snapshotHandoffRaw(){')
end=s.index(' // V1.6.9:',start)
new_handoff=r''' function snapshotHandoffRaw(){
   const key=handoffKey(),prefix=handoffWindowPrefix();
   try{const v=sessionStorage.getItem(key);if(v)return v}catch{}
   try{const v=localStorage.getItem(key);if(v)return v}catch{}
   try{if(typeof window.name==='string'&&window.name.startsWith(prefix))return window.name.slice(prefix.length)}catch{}
   return ''
 }
 function loadSnapshotHandoff(){
   const raw=snapshotHandoffRaw();if(!raw)return false;
   try{
     const pack=JSON.parse(raw),schema=pack?.native?.schema||pack?.schema?.native,html=pack?.native?.html||'';
     const m=pack?.manifest||{};
     const handoffTemplate=String(m.editor_context_template||'').trim();
     const handoffRecord=String(m.editor_context_record_id||'').trim();
     const handoffSource=String(m.editor_context_source||'').trim();
     if(requestedTemplate&&handoffTemplate!==requestedTemplate)throw new Error(`Handoff template mismatch: ${handoffTemplate||'kosong'}`);
     if(requestedRecord&&handoffRecord!==requestedRecord)throw new Error(`Handoff record mismatch: ${handoffRecord||'kosong'}`);
     if(currentTemplateRecord?.id&&String(currentTemplateRecord.id)!==requestedTemplate)throw new Error('Current record UUID mismatch.');
     if(currentTemplateRecord?.source_path&&handoffSource&&!sameSource(currentTemplateRecord.source_path,handoffSource))throw new Error('Handoff source_path tidak sama dengan record UUID.');
     if(!schema||!Array.isArray(schema.fields)||!html)throw new Error('Source Graph handoff tidak lengkap.');
     native={schema:deep(schema),baseHtml:html,manifest:{...deep(m),source_url:deep(m).source_url||pack?.native?.source_url||''},values:Object.fromEntries(schema.fields.map(f=>[f.id,f.value??'']))};
     dirty.textContent=`V2.29 HANDOFF LOCKED ✓ · ${schema.field_count||schema.fields.length} field`;saveDraftBtn.disabled=false;
     renderNativeEditor();renderPreview(true);renderInspector();
     try{localStorage.setItem(DRAFT_KEY,JSON.stringify({schema:native.schema,baseHtml:native.baseHtml,manifest:native.manifest,values:native.values}))}catch{};
     editorToast(`UUID ${requestedTemplate||'standalone'} tervalidasi. Golden V2.26 renderer aktif.`,'success','V2.29 Editor terhubung');
     return true
   }catch(e){console.warn('V229 snapshot handoff',e);editorToast(e.message||String(e),'error','V2.29 handoff ditolak');return false}
 }
'''
s=s[:start]+new_handoff+s[end:]

# Side-by-side recovery must never mutate old editor's legacy storage.
s=re.sub(r" // V1\.6\.9:.*? async function bootEditor\(\)\{"," // V2.29: side-by-side recovery never mutates legacy editor storage.\n async function bootEditor(){",s,count=1,flags=re.S)
start=s.index(' async function bootEditor(){'); end=s.index(' bootEditor();',start)
boot=r''' async function bootEditor(){
   if(handoffMode){
     try{await setCurrentRecordContextStrict()}catch(e){editorToast(e.message||String(e),'error','V2.29 record lock gagal');native=null}
     if(currentTemplateRecord&&!loadSnapshotHandoff())native=null;
   }else{
     const fromLibrary=await loadTemplateFromLibrary();
     if(!fromLibrary){
       try{const d=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');if(d?.schema&&d?.baseHtml){native=d;Object.assign(transforms,deep(d.transforms||{}));dirty.textContent='V2.29 SCOPED DRAFT RESTORED';saveDraftBtn.disabled=false;renderNativeEditor();renderPreview(true)}}catch(e){console.warn('V229 draft restore',e)}
     }
   }
   if(!native){renderNativeEditor();frame.src='./invitation.html?guard=1'}
   renderInspector();
 }
'''
s=s[:start]+boot+s[end:]
s=re.sub(r"resetBtn\.onclick=async\(\)=>\{if\(!confirm\('Reset editor dan hapus draft lokal\?'\)\)return;.*?location\.reload\(\)\};","resetBtn.onclick=async()=>{if(!confirm('Reset hanya state V2.29 untuk template ini?'))return;localStorage.removeItem(DRAFT_KEY);localStorage.removeItem(templateRecoveryKey());localStorage.removeItem(pendingB2Key());sessionStorage.removeItem(handoffKey());localStorage.removeItem(handoffKey());try{if(typeof window.name==='string'&&window.name.startsWith(handoffWindowPrefix()))window.name=''}catch{}await deleteAppliedSnapshot();location.reload()};",s,count=1)

# APPLY -> Clean Preview -> ZIP stays V2.26 deterministic, but storage is UUID scoped.
s=s.replace("snap={version:'2.23.0',revision,schema:native.schema","snap={version:'2.29.0',template_context:templateContextId(),revision,schema:native.schema",1)
s=s.replace("window.open('./clean-preview.html','_blank')","window.open('./clean-preview.html?template='+encodeURIComponent(templateContextId()),'_blank')")
s=s.replace("return {version:'2.23.0',revision,schema:deep(native.schema)","return {version:'2.29.0',template_context:templateContextId(),revision,schema:deep(native.schema)")
p.write_text(s)

# Strict V2.29 Clean Preview snapshot key.
p=OUT/'clean-preview.js'; s=p.read_text()
s=s.replace("const frame=document.getElementById('cleanFrame'),empty=document.getElementById('empty');let snap=null;","const frame=document.getElementById('cleanFrame'),empty=document.getElementById('empty');let snap=null;const params=new URLSearchParams(location.search);const context=String(params.get('template')||'standalone');const snapKey=`native-applied:v229:${context}`;")
s=s.replace("tx.objectStore('snapshots').get('native-applied')","tx.objectStore('snapshots').get(snapKey)")
s=s.replace("  if(!snap){try{snap=JSON.parse(sessionStorage.getItem('diniAnifCleanPreviewApplied')||localStorage.getItem('diniAnifNativeApplied')||'null')}catch{}}\n","")
s=s.replace("  if(!snap?.html){frame.hidden=true;empty.hidden=false;return}","  if(!snap?.html||String(snap.template_context||context)!==context){frame.hidden=true;empty.hidden=false;empty.textContent='Belum ada APPLY V2.29 untuk template UUID ini.';return}")
p.write_text(s)
p=OUT/'clean-preview.html'; s=p.read_text().replace('Clean Preview · Applied Snapshot V1.8.0','Clean Preview · V2.29 UUID Scoped').replace('<script src="./clean-preview.js"></script>','<script src="./clean-preview.js?v=2290"></script>');p.write_text(s)
write(OUT/'V229-RECOVERY.md','''# Dini-Faqih Editor Recovery V2.29\n\nGolden renderer core: V2.26 Smart Source Ownership (`839aa2f`).\nIdentity authority: Supabase template UUID only.\nHandoff template/record/source must match.\nRenderer count: one (`editor.js`).\nNo exact-source, force-visible, preview-rescue, fetch-frame, centering patch, or generic visual template fallback.\nAPPLY state is isolated per UUID.\nSide-by-side route: `/dashboard-admin-edit-v229/`.\n''')

# ---- Template Library: add experimental V2.29 button only ----
p=ROOT/'dashboard-admin-template/index.html'; d=p.read_text()
if 'data-edit-v229' not in d:
    d=d.replace('<button class="btn" data-edit="${esc(t.id)}">✏️ Edit</button>','<button class="btn" data-edit="${esc(t.id)}">✏️ Edit</button>\n          <button class="btn" data-edit-v229="${esc(t.id)}" title="Golden V2.26 renderer + UUID isolation">🧪 Edit V2.29</button>')
    listener="  grid.querySelectorAll('[data-edit]').forEach(btn=>btn.addEventListener('click',()=>editTemplate(btn.dataset.edit,btn)));"
    d=d.replace(listener,listener+"\n  grid.querySelectorAll('[data-edit-v229]').forEach(btn=>btn.addEventListener('click',()=>editTemplateV229(btn.dataset.editV229,btn)));",1)
    marker="\n\nconst TEMPLATE_BUCKET='template-packages';"
    fn=r'''
async function editTemplateV229(id,btn){
  const oldText=btn?.textContent||'🧪 Edit V2.29';
  if(btn){btn.disabled=true;btn.textContent='V2.29…'}
  libraryStatus.className='status';libraryStatus.textContent='V2.29 mengunci UUID record yang dipilih…';
  try{
    const latest=await sb.from('templates').select('id,name,slug,source_path,updated_at').eq('id',id).single();
    if(latest.error)throw latest.error;
    const row=latest.data;if(!row||String(row.id)!==String(id))throw new Error('Record UUID template tidak cocok.');
    const source=String(row.source_path||'').trim();if(!source||source==='/')throw new Error('Template belum memiliki source snapshot yang dapat diedit.');
    libraryStatus.className='status ok';libraryStatus.textContent=`V2.29: membangun Source Graph ${row.name} dari UUID ${row.id}…`;
    const q=new URLSearchParams({autoEdit:'1',editor:'v229',template:row.id,record:row.id,slug:row.slug||'',source,updated:String(row.updated_at||'')});
    location.href='/dashboard-admin-fetch?'+q.toString();
  }catch(e){libraryStatus.className='status warn';libraryStatus.textContent='V2.29 gagal: '+(e.message||String(e));if(btn){btn.disabled=false;btn.textContent=oldText}}
}
'''
    if marker not in d: raise SystemExit('Template Library insert marker missing')
    d=d.replace(marker,'\n'+fn+marker,1)
    p.write_text(d)

# ---- Fetch: conditional redirect only for editor=v229 ----
p=ROOT/'dashboard-admin-fetch/studio.js'; st=p.read_text()
if "const editorTarget=qs.get('editor')||'';" not in st:
    anchor="    const qs=new URLSearchParams(location.search);\n    if(qs.get('autoEdit')!=='1')return;"
    repl="    const qs=new URLSearchParams(location.search);\n    if(qs.get('autoEdit')!=='1')return;\n    const editorTarget=qs.get('editor')||'';"
    if anchor not in st: raise SystemExit('Fetch autoEdit anchor missing')
    st=st.replace(anchor,repl,1)
    old_redirect="      setTimeout(()=>{location.href='/dashboard-admin-edit?template='+encodeURIComponent(recordId)+'&record='+encodeURIComponent(recordId)+'&handoff=1'},120);"
    new_redirect="      const editorBase=editorTarget==='v229'?'/dashboard-admin-edit-v229/':'/dashboard-admin-edit';\n      setTimeout(()=>{location.href=editorBase+'?template='+encodeURIComponent(recordId)+'&record='+encodeURIComponent(recordId)+'&handoff=1'},120);"
    if old_redirect not in st: raise SystemExit('Fetch redirect anchor missing')
    st=st.replace(old_redirect,new_redirect,1)
    p.write_text(st)

print('V2.29 side-by-side recovery built')
