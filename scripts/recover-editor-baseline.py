from pathlib import Path
import subprocess

ROOT=Path('.')

def run(*args):
    subprocess.run(args,check=True)

# Restore only the rendering/editing engines to the known-good baseline.
run('git','rm','-rf','dashboard-admin-edit','dashboard-admin-fetch','dashboard-admin-edit-v229')
run('git','checkout','839aa2f','--','dashboard-admin-edit','dashboard-admin-fetch')

# Keep the latest Template Library infrastructure, but route Edit directly to the
# baseline Editor by immutable Supabase UUID. Remove the failed V2.29 experiment.
p=Path('dashboard-admin-template/index.html')
s=p.read_text()
s=s.replace('          <button class="btn" data-edit-v229="${esc(t.id)}" title="Golden V2.26 renderer + UUID isolation">🧪 Edit V2.29</button>\n','')
s=s.replace("  grid.querySelectorAll('[data-edit-v229]').forEach(btn=>btn.addEventListener('click',()=>editTemplateV229(btn.dataset.editV229,btn)));\n",'')
start=s.find('\nasync function editTemplateV229(')
if start!=-1:
    end=s.find('\n\nconst TEMPLATE_BUCKET=',start)
    if end!=-1:
        s=s[:start]+s[end:]

a=s.find('async function editTemplate(id,btn){')
b=s.find('\n\nconst TEMPLATE_BUCKET=',a)
if a<0 or b<0:
    raise SystemExit('editTemplate block anchor not found')
fn="""async function editTemplate(id,btn){
  const oldText=btn?.textContent||'✏️ Edit';
  if(btn){btn.disabled=true;btn.textContent='Memuat…'}
  libraryStatus.className='status';libraryStatus.textContent='Mengunci UUID template yang dipilih…';
  try{
    const latest=await sb.from('templates').select('id,name,slug,source_path,manifest_json,updated_at').eq('id',id).single();
    if(latest.error)throw latest.error;
    const row=latest.data;
    if(!row||String(row.id)!==String(id))throw new Error('UUID record template tidak cocok.');
    const snap=String(row.manifest_json?.editor_snapshot_url||'').trim();
    if(!snap)throw new Error('Template belum memiliki editor snapshot. Buka Fetch dan Simpan Draft sekali.');
    libraryStatus.className='status ok';libraryStatus.textContent=`Membuka ${row.name} pada Editor baseline dengan UUID terkunci…`;
    const q=new URLSearchParams({template:row.id,record:row.id,v:'baseline839'});
    location.href='/dashboard-admin-edit/?'+q.toString();
  }catch(e){
    libraryStatus.className='status warn';libraryStatus.textContent='Edit gagal: '+(e.message||String(e));
    if(btn){btn.disabled=false;btn.textContent=oldText}
  }
}"""
s=s[:a]+fn+s[b:]
p.write_text(s)

# Minimal UUID guard added to baseline Editor. No renderer/layout code is touched.
p=Path('dashboard-admin-edit/editor.js')
s=p.read_text()
old="""   const q=new URLSearchParams(location.search).get('template');if(!q)return false;
   const t=editorToast('Memuat snapshot Draft dari Template Library…','loading','Buka Draft');
   try{
     let lookup=await adminSb.from('templates').select('*').eq('slug',q).limit(1).maybeSingle();
     if(lookup.error)throw lookup.error;
     if(!lookup.data&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(q))lookup=await adminSb.from('templates').select('*').eq('id',q).limit(1).maybeSingle();
"""
new="""   const params=new URLSearchParams(location.search),q=params.get('template'),record=params.get('record')||'';if(!q)return false;
   const t=editorToast('Memuat snapshot Draft dari Template Library…','loading','Buka Draft');
   try{
     if(record&&record!==q)throw new Error('Template mismatch: UUID request dan record berbeda.');
     const isUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(q);
     let lookup=isUuid?await adminSb.from('templates').select('*').eq('id',q).limit(1).maybeSingle():await adminSb.from('templates').select('*').eq('slug',q).limit(1).maybeSingle();
     if(lookup.error)throw lookup.error;
"""
if old not in s:
    raise SystemExit('baseline library-load anchor not found')
s=s.replace(old,new,1)
needle="     if(lookup.error)throw lookup.error;const data=lookup.data;if(!data)throw new Error('Template tidak ditemukan.');"
replace=needle+"if(record&&String(data.id)!==record)throw new Error('Template mismatch: row Supabase berbeda dari UUID yang dipilih.');"
if needle not in s:
    raise SystemExit('baseline row anchor not found')
s=s.replace(needle,replace,1)
p.write_text(s)

print('KNOWN_GOOD_BASELINE_RECOVERED')
