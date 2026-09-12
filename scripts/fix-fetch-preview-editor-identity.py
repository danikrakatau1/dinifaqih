from pathlib import Path
import re

# Narrow fix only: keep V2.26 Smart Source Ownership renderer intact.
# Fixes Preview -> Editor identity and removes the wrong-template blank fallback.

preview_html = Path('dashboard-admin-fetch/preview.html')
s = preview_html.read_text(encoding='utf-8')
s = s.replace('Source-Native Preview <small style="font-size:10px;color:#70d6a0">V1.4.1</small>',
              'Source-Native Preview <small style="font-size:10px;color:#70d6a0">V1.4.4</small>')
s = s.replace('<a class="btn secondary" href="/dashboard-admin-edit/?mode=fetch">Buka Editor</a>',
              '<a id="openEditorBtn" class="btn secondary" href="/dashboard-admin-edit/?mode=fetch">Buka Editor</a>')
s = s.replace('<script src="./preview-studio.js"></script>',
              '<script src="./preview-studio.js?v=fetch-identity-144"></script>')
preview_html.write_text(s, encoding='utf-8')

preview_js = Path('dashboard-admin-fetch/preview-studio.js')
s = preview_js.read_text(encoding='utf-8')
anchor = "  function showEmpty(message){frame.hidden=true;empty.hidden=false;if(diag)diag.textContent=message||'Snapshot handoff tidak ditemukan.'}\n"
if anchor not in s:
    raise SystemExit('preview-studio showEmpty anchor not found')
helper = r'''  function newEditorHandoffToken(){
    try{return crypto.randomUUID()}catch{return 'h-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)}
  }
  function persistEditorHandoff(raw,token){
    const key='diniAnifRebuildSnapshot:'+token;let saved=0;
    try{sessionStorage.setItem(key,raw);saved++}catch(err){console.warn('scoped session handoff failed',err)}
    try{localStorage.setItem(key,raw);saved++}catch(err){console.warn('scoped local handoff failed',err)}
    try{window.name='__DINI_ANIF_REBUILD_SCOPED__'+token+'__'+raw;saved++}catch(err){console.warn('scoped window.name handoff failed',err)}
    return saved
  }
'''
s = s.replace(anchor, anchor + helper, 1)
old = "    let pack;try{pack=JSON.parse(raw)}catch(err){showEmpty('Snapshot JSON gagal dibaca: '+err.message);return}\n    empty.hidden=true;frame.hidden=false;\n"
if old not in s:
    raise SystemExit('preview-studio pack anchor not found')
new = "    let pack;try{pack=JSON.parse(raw)}catch(err){showEmpty('Snapshot JSON gagal dibaca: '+err.message);return}\n    const editorHandoffToken=newEditorHandoffToken();\n    const editorHandoffSaved=persistEditorHandoff(raw,editorHandoffToken);\n    const openEditorBtn=document.getElementById('openEditorBtn');\n    if(openEditorBtn)openEditorBtn.onclick=e=>{\n      e.preventDefault();\n      const saved=persistEditorHandoff(raw,editorHandoffToken);\n      if(!saved){alert('Snapshot Editor terlalu besar dan tidak dapat disimpan untuk handoff. Kembali ke Fetch lalu Generate ulang.');return}\n      location.href='/dashboard-admin-edit/?mode=fetch&handoff='+encodeURIComponent(editorHandoffToken);\n    };\n    empty.hidden=true;frame.hidden=false;\n"
s = s.replace(old, new, 1)
old_meta = "    meta.textContent=`Parity ${pack.report?.parity_score??'—'}% · Editable ${pack.report?.editable_coverage??100}% · Unsupported ${pack.report?.unsupported_items??0} · ${nativeHtml?'SOURCE NATIVE':'Legacy'} · ${handoff.source}${handoff.warning?' · fallback':''}`;\n"
if old_meta not in s:
    raise SystemExit('preview-studio meta anchor not found')
new_meta = "    meta.textContent=`Parity ${pack.report?.parity_score??'—'}% · Editable ${pack.report?.editable_coverage??100}% · Unsupported ${pack.report?.unsupported_items??0} · ${nativeHtml?'SOURCE NATIVE':'Legacy'} · ${handoff.source}${handoff.warning?' · fallback':''} · Editor handoff ${editorHandoffToken.slice(0,8)} ${editorHandoffSaved}/3`;\n"
s = s.replace(old_meta, new_meta, 1)
preview_js.write_text(s, encoding='utf-8')

editor = Path('dashboard-admin-edit/editor.js')
s = editor.read_text(encoding='utf-8')
start = s.find(' function snapshotHandoffRaw(){')
end = s.find('\n function loadSnapshotHandoff(){', start)
if start < 0 or end < 0:
    raise SystemExit('editor snapshotHandoffRaw block not found')
scoped = r''' function snapshotHandoffRaw(){
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
 }'''
s = s[:start] + scoped + s[end:]

# Keep the original V2.26 rebuild/edit engine. Only remove the dangerous wrong-template fallback.
rstart = s.find(' function renderPreview(force=false){')
rend = s.find('\n function highlightSelection(){', rstart)
if rstart < 0 or rend < 0:
    raise SystemExit('editor renderPreview block not found')
render = r''' function renderPreview(force=false){
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
 }'''
s = s[:rstart] + render + s[rend:]
editor.write_text(s, encoding='utf-8')

index = Path('dashboard-admin-edit/index.html')
s = index.read_text(encoding='utf-8')
s = re.sub(r'<script src="\./editor\.js(?:\?[^\"]*)?"></script>',
           '<script src="./editor.js?v=fetch-identity-144"></script>', s, count=1)
index.write_text(s, encoding='utf-8')

print('FETCH_PREVIEW_EDITOR_IDENTITY_FIX_APPLIED')
