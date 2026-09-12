from pathlib import Path
import re

p=Path('dashboard-admin-edit/editor.js')
s=p.read_text(encoding='utf-8')
old='''   const raw=parityDoctype(live)+live.documentElement.outerHTML;
   const doc=parseNative(raw);
   // Only generated/uploaded object URLs need conversion to persistent asset paths.
   // Everything else stays byte-for-byte as captured from the live Editor DOM.
   for(const [fieldId,a] of generatedAssets){
     if(!a?.path)continue;
     const f=fieldById(fieldId);if(!f)continue;
     try{applyField(doc,f,a.path)}catch{}
   }
'''
new='''   let raw=parityDoctype(live)+live.documentElement.outerHTML;
   // V2.28.3: preserve the approved DOM literally. Uploaded/generated files are already
   // represented by blob URLs in the live DOM, so replace only those URL strings with
   // their persistent package paths. Never call applyField/applyTransform during APPLY.
   for(const [,a] of generatedAssets){
     if(a?.previewUrl&&a?.path)raw=raw.split(a.previewUrl).join(a.path);
   }
   const doc=parseNative(raw);
'''
if old not in s: raise SystemExit('capture asset anchor not found')
s=s.replace(old,new,1)

pattern=r'''( function currentB2PackageName\(\)\{.*?\n \}\n) zipBtn\.onclick=async\(\)=>\{.*?\};\n\n backupBtn\.onclick'''
m=re.search(pattern,s,re.S)
if not m: raise SystemExit('duplicate zip handler anchor not found')
s=re.sub(pattern,r'''\1 // V2.28.3: no second ZIP renderer. The earlier zipBtn handler opens the exact
 // Clean Preview revision with download=1, so Preview Bersih and downloaded ZIP share
 // the same immutable applied snapshot and the same exporter.

 backupBtn.onclick''',s,count=1,flags=re.S)
p.write_text(s,encoding='utf-8')

idx=Path('dashboard-admin-edit/index.html')
x=idx.read_text(encoding='utf-8').replace('./editor.js?v=2282','./editor.js?v=2283')
idx.write_text(x,encoding='utf-8')
print('V2.28.3 final parity lock applied')
