from pathlib import Path

editor = Path('dashboard-admin-edit/editor.js')
text = editor.read_text(encoding='utf-8')

anchor = " function renderPreview(force=false){\n"
if anchor not in text:
    raise SystemExit('renderPreview anchor not found')

helper = r''' function renderFetchSourceInitial(){
   const params=new URLSearchParams(location.search);
   if(params.get('mode')!=='fetch'||!params.get('handoff')||!native?.baseHtml)return false;
   // First Fetch render MUST be the exact source-native HTML that the Preview just displayed.
   // Do not rebuild/replay fields before the user changes anything; baseHtml already owns the
   // Source Graph edit markers, so installFrameBridge can attach full V2.26 editability directly.
   const html=String(native.baseHtml||'');
   frame.onload=()=>{
     installFrameBridge();
     dirty.textContent=`FETCH SOURCE EXACT ✓ · ${native?.schema?.field_count||native?.schema?.fields?.length||0} field`;
   };
   frame.removeAttribute('src');
   frame.srcdoc='';
   requestAnimationFrame(()=>{frame.srcdoc=html});
   return true
 }
'''
if 'function renderFetchSourceInitial()' not in text:
    text = text.replace(anchor, helper + anchor, 1)

old = "     renderNativeEditor();renderPreview(true);renderInspector();\n"
new = "     renderNativeEditor();if(!renderFetchSourceInitial())renderPreview(true);renderInspector();\n"
# Only replace the Fetch handoff occurrence nearest FETCH SNAPSHOT LOADED, not library loading.
pos = text.find("dirty.textContent=`FETCH SNAPSHOT LOADED ✓")
if pos < 0:
    raise SystemExit('Fetch handoff marker not found')
next_old = text.find(old, pos)
if next_old < 0:
    raise SystemExit('Fetch render call not found')
text = text[:next_old] + new + text[next_old+len(old):]

# Safety: Fetch mode must still be scoped and must never fall back to invitation.html from readiness guard.
if "const key='diniAnifRebuildSnapshot:'+token" not in text:
    raise SystemExit('scoped handoff invariant missing')
if "Editor source is still initializing; preserving exact Fetch snapshot" not in text:
    raise SystemExit('no-fallback readiness invariant missing')
for required in ['Upload / Ganti','function ensureRuntimeCssBackgroundFields','function rebuildHtml','function installFrameBridge']:
    if required not in text:
        raise SystemExit('editable engine invariant missing: '+required)

editor.write_text(text, encoding='utf-8')

index = Path('dashboard-admin-edit/index.html')
html = index.read_text(encoding='utf-8')
html = html.replace('<script src="./editor.js"></script>', '<script src="./editor.js?v=fetch-initial-145"></script>')
html = html.replace('<script src="./editor.js?v=fetch-initial-144"></script>', '<script src="./editor.js?v=fetch-initial-145"></script>')
index.write_text(html, encoding='utf-8')
