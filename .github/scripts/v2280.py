from pathlib import Path

editor = Path('dashboard-admin-edit/editor.js')
s = editor.read_text(encoding='utf-8')

# 1) Exact-source mode must never run the generic visual stabilizer.
old = "frame.onload=()=>{installFrameBridge();setTimeout(()=>{try{const d=liveDoc(),w=d?.defaultView;if(!d?.body||!w)return;"
new = "frame.onload=()=>{installFrameBridge();if(editorParams.get('handoff')==='1'){setTimeout(()=>{try{installFrameBridge();if(selectedFieldId)highlightSelection()}catch{}},80);return}setTimeout(()=>{try{const d=liveDoc(),w=d?.defaultView;if(!d?.body||!w)return;"
if old not in s:
    raise SystemExit('renderPreview handoff anchor not found')
s = s.replace(old, new, 1)

# 2) Capture the actual live Editor DOM as the APPLY source of truth.
anchor = "function liveDoc(){try{return frame.contentDocument}catch{return null}}"
helper = r'''function liveDoc(){try{return frame.contentDocument}catch{return null}}
 function parityDoctype(doc){try{if(!doc?.doctype)return '<!doctype html>';const d=doc.doctype;return '<!DOCTYPE '+d.name+(d.publicId?' PUBLIC "'+d.publicId+'"':'')+(d.systemId?' "'+d.systemId+'"':'')+'>'}catch{return '<!doctype html>'}}
 function captureLiveParityHtml(){
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
 }'''
if anchor not in s:
    raise SystemExit('liveDoc anchor not found')
s = s.replace(anchor, helper, 1)

# 3) APPLY snapshots the exact live DOM, not a second renderer.
old = "html=rebuildHtml({forExport:true}),snap={version:'2.23.0'"
new = "html=captureLiveParityHtml(),snap={version:'2.28.0'"
if old not in s:
    raise SystemExit('APPLY html anchor not found')
s = s.replace(old, new, 1)

# 4) Editor Download delegates to Clean Preview exporter.
anchor = " saveDraftBtn.onclick=saveCurrentDraft;"
replacement = r''' zipBtn.onclick=async e=>{
   e?.preventDefault?.();
   if(!native)return editorToast('Import ZIP dulu.','error','Belum ada template');
   if(isDirty)return editorToast('Klik APPLY dulu agar ZIP sama 100% dengan Preview Bersih.','info','Belum APPLY');
   const snap=await getAppliedSnapshot();
   if(!snap)return editorToast('Snapshot APPLY belum ada.','error','Belum APPLY');
   window.open(`./clean-preview.html?template=${encodeURIComponent(templateContextId())}&download=1`,'_blank');
 };
 saveDraftBtn.onclick=saveCurrentDraft;'''
if anchor not in s:
    raise SystemExit('saveDraft anchor not found')
s = s.replace(anchor, replacement, 1)
editor.write_text(s, encoding='utf-8')

# 5) Exact Source Preview is visual read-only: remove centering/layout mutation hack.
exact = Path('dashboard-admin-edit/exact-source-preview-v2275.js')
x = exact.read_text(encoding='utf-8')
start = x.find('  // V2.27.9 — Exact Source Preview')
end = x.find('  const installExact=()=>{', start)
if start < 0 or end < 0:
    raise SystemExit('V2279 exact-source centering block not found')
x = x[:start] + x[end:]
x = x.replace("console.info('EXACT_TEMPLATE_PREVIEW_V2279'", "console.info('EXACT_TEMPLATE_PREVIEW_V2280'", 1)
x = x.replace("console.warn('EXACT_TEMPLATE_PREVIEW_V2279_FAILED'", "console.warn('EXACT_TEMPLATE_PREVIEW_V2280_FAILED'", 1)
x = x.replace("    scheduleCenterOpenButtons();\n", "", 1)
x = x.replace("      centerOpenButtons();\n", "", 1)
exact.write_text(x, encoding='utf-8')

# 6) Clean Preview is the single download exporter; ?download=1 auto-starts it.
clean = Path('dashboard-admin-edit/clean-preview.js')
c = clean.read_text(encoding='utf-8')
anchor = "  addEventListener('beforeunload',()=>{urls.forEach(URL.revokeObjectURL);"
auto = "  if(new URLSearchParams(location.search).get('download')==='1'){setTimeout(()=>document.getElementById('downloadCleanZip')?.click(),260);}\n"
if anchor not in c:
    raise SystemExit('clean preview beforeunload anchor not found')
c = c.replace(anchor, auto + anchor, 1)
clean.write_text(c, encoding='utf-8')

print('V2.28.0 exact visual parity pipeline applied')
