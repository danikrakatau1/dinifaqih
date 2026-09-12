from pathlib import Path

repo = Path('.')
studio = repo / 'dashboard-admin-fetch/studio.js'
editor = repo / 'dashboard-admin-edit/editor.js'
preview_html = repo / 'dashboard-admin-fetch/preview.html'
editor_html = repo / 'dashboard-admin-edit/index.html'

s = studio.read_text(encoding='utf-8')
old = """    const safe=doc.createElement('script');
    const forceOpenStyle=doc.createElement('style');
"""
new = """    // V1.4.6 — deterministic Source-Native runtime parity.
    // The rebuilt document must NOT execute arbitrary source-page JS inside the Editor origin.
    // Source-Native already reconstructs the visual/runtime behavior below, so freeze only
    // executable source scripts while preserving inert JSON/template payloads.
    doc.querySelectorAll('script').forEach(sc=>{
      const type=String(sc.getAttribute('type')||'').trim().toLowerCase();
      const executable=!type||['text/javascript','application/javascript','module','text/ecmascript','application/ecmascript'].includes(type);
      if(executable)sc.remove();
    });
    const safe=doc.createElement('script');
    safe.setAttribute('data-dini-source-native-runtime','v1.4.6');
    const forceOpenStyle=doc.createElement('style');
"""
if old not in s:
    raise SystemExit('studio anchor not found')
s = s.replace(old, new, 1)
s = s.replace("Source-native rebuild V1.3 siap. Preview sekarang memakai struktur source baru, bukan blueprint Art Sunda.", "Source-Native Rebuild siap ✓ · Source Graph V3 · Engine V2.26 · Runtime V1.4.6. Struktur dan visual berasal dari source yang sedang di-Fetch.")
studio.write_text(s, encoding='utf-8')

e = editor.read_text(encoding='utf-8')
old2 = """   const html=String(native.baseHtml||'');
   frame.onload=()=>{
"""
new2 = """   // V1.4.6 — old snapshots can still contain executable source-page scripts.
   // Preview isolates them with a unique-origin sandbox, but Editor needs same-origin DOM access
   // for 100% editability. Freeze arbitrary source JS here and keep only our deterministic
   // Source-Native runtime. This makes Preview/Editor visual runtime deterministic without
   // sacrificing installFrameBridge()/Visual Inspector access.
   const sourceDoc=parseNative(String(native.baseHtml||''));
   let frozenSourceScripts=0;
   sourceDoc.querySelectorAll('script').forEach(sc=>{
     const type=String(sc.getAttribute('type')||'').trim().toLowerCase();
     const executable=!type||['text/javascript','application/javascript','module','text/ecmascript','application/ecmascript'].includes(type);
     if(!executable)return;
     const body=String(sc.textContent||'');
     const keep=sc.hasAttribute('data-dini-source-native-runtime') || (/hydrateRuntimeBackgroundGeometry/.test(body)&&/startNativeCountdown/.test(body));
     if(!keep){sc.remove();frozenSourceScripts++}
   });
   const html=serialize(sourceDoc);
   frame.onload=()=>{
"""
if old2 not in e:
    raise SystemExit('editor exact-render anchor not found')
e = e.replace(old2, new2, 1)
e = e.replace("dirty.textContent=`FETCH SOURCE EXACT ✓ · ${native?.schema?.field_count||native?.schema?.fields?.length||0} field`;", "dirty.textContent=`FETCH SOURCE EXACT ✓ · ${native?.schema?.field_count||native?.schema?.fields?.length||0} field · JS frozen ${frozenSourceScripts}`;", 1)
editor.write_text(e, encoding='utf-8')

p = preview_html.read_text(encoding='utf-8')
p = p.replace('Source-Native Preview <small style="font-size:10px;color:#70d6a0">V1.4.4</small>', 'Source-Native Preview <small style="font-size:10px;color:#70d6a0">V1.4.6</small>')
p = p.replace('./preview-studio.js?v=fetch-identity-144', './preview-studio.js?v=source-runtime-146')
preview_html.write_text(p, encoding='utf-8')

i = editor_html.read_text(encoding='utf-8')
i = i.replace('./editor.js?v=fetch-identity-144', './editor.js?v=source-runtime-146')
editor_html.write_text(i, encoding='utf-8')

# Safety invariants: preserve V2.26 editability and exact scoped handoff.
e2 = editor.read_text(encoding='utf-8')
for needle in ['Upload / Ganti','function ensureRuntimeCssBackgroundFields','diniAnifRebuildSnapshot:'+"'",'FETCH SOURCE EXACT','installFrameBridge()']:
    if needle not in e2:
        raise SystemExit('missing editor invariant: '+needle)
if 'data-dini-source-native-runtime' not in studio.read_text(encoding='utf-8'):
    raise SystemExit('runtime marker missing')
print('Source-Native runtime parity V1.4.6 patch applied')
