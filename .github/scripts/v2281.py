from pathlib import Path

# Exact-source editor must not be visually mutated by legacy rescue/stabilizer scripts.
for rel in [
    'dashboard-admin-edit/force-visible-v2274.js',
    'dashboard-admin-edit/preview-rescue.js',
]:
    p = Path(rel)
    s = p.read_text(encoding='utf-8')
    guard = "  if(new URLSearchParams(location.search).get('handoff')==='1')return;\n"
    if guard not in s:
        anchor = "(()=>{\n"
        if anchor not in s:
            raise SystemExit(f'guard anchor missing: {rel}')
        s = s.replace(anchor, anchor + guard, 1)
    p.write_text(s, encoding='utf-8')

# Bust browser/CDN cache for the editor helper scripts.
p = Path('dashboard-admin-edit/index.html')
s = p.read_text(encoding='utf-8')
s = s.replace('./force-visible-v2274.js?v=2276', './force-visible-v2274.js?v=2281')
s = s.replace('./preview-rescue.js?v=2276', './preview-rescue.js?v=2281')
s = s.replace('./exact-source-preview-v2275.js?v=2276', './exact-source-preview-v2275.js?v=2281')
p.write_text(s, encoding='utf-8')

# B2/Supabase cleanup is best-effort. Deleting the DB row is the critical library operation.
p = Path('dashboard-admin-template/index.html')
s = p.read_text(encoding='utf-8')
old = '''async function deleteTemplate(id){
  const t=templates.find(x=>String(x.id)===String(id));if(!t||t.is_active)return;
  if(!confirm(`Hapus ${t.name}? Snapshot Supabase + paket Backblaze yang terhubung juga akan dibersihkan.`))return;
  libraryStatus.className='status';libraryStatus.textContent=`Menghapus ${t.name} secara aman…`;
  try{
    const metas=[t.manifest_json?.package_storage,...(t.manifest_json?.revision_history||[]).map(x=>x.package_storage)].filter(Boolean);
    const seen=new Set();
    for(const meta of metas){const k=meta.object_key||meta.b2_object_key;if(k&&!seen.has(k)){seen.add(k);await deleteB2Object(meta)}}
    await removeStorageTree(t.slug);
    const {error}=await sb.from('templates').delete().eq('id',id);if(error)throw error;
    lastRenderSignature='';await loadTemplates();
    libraryStatus.className='status ok';libraryStatus.textContent=`${t.name} + storage terkait berhasil dihapus.`;
  }catch(e){libraryStatus.className='status warn';libraryStatus.textContent='Delete dibatalkan/parsial: '+(e.message||String(e))}
}'''
new = '''async function deleteTemplate(id){
  const t=templates.find(x=>String(x.id)===String(id));if(!t||t.is_active)return;
  if(!confirm(`Hapus ${t.name}? Template akan dihapus dari library dan storage terkait akan dibersihkan.`))return;
  libraryStatus.className='status';libraryStatus.textContent=`Menghapus ${t.name} dari library…`;
  try{
    const cleanupWarnings=[];
    const metas=[t.manifest_json?.package_storage,...(t.manifest_json?.revision_history||[]).map(x=>x.package_storage)].filter(Boolean);
    const seen=new Set();
    for(const meta of metas){
      const k=meta.object_key||meta.b2_object_key;
      if(!k||seen.has(k))continue;
      seen.add(k);
      try{await deleteB2Object(meta)}catch(err){cleanupWarnings.push('Backblaze: '+(err.message||String(err)))}
    }
    try{await removeStorageTree(t.slug)}catch(err){cleanupWarnings.push('Supabase Storage: '+(err.message||String(err)))}

    const {error}=await sb.from('templates').delete().eq('id',id);if(error)throw error;
    lastRenderSignature='';await loadTemplates();
    if(cleanupWarnings.length){
      libraryStatus.className='status warn';
      libraryStatus.textContent=`${t.name} berhasil dihapus dari library. Cleanup eksternal menyisakan peringatan: ${cleanupWarnings.join(' • ')}`;
    }else{
      libraryStatus.className='status ok';libraryStatus.textContent=`${t.name} + storage terkait berhasil dihapus.`;
    }
  }catch(e){libraryStatus.className='status warn';libraryStatus.textContent='Delete template gagal: '+(e.message||String(e))}
}'''
if old not in s:
    raise SystemExit('deleteTemplate anchor not found')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

# Applied exact DOM should not carry editor-only hit-test CSS into Clean Preview / ZIP.
p = Path('dashboard-admin-edit/editor.js')
s = p.read_text(encoding='utf-8')
old = "   doc.querySelectorAll('[data-dini-anif-editor-parity],[data-dini-anif-action-runtime]').forEach(n=>n.remove());\n"
new = "   doc.querySelectorAll('[data-dini-anif-editor-parity],[data-dini-anif-action-runtime],#dini-anif-editor-hit-css,#dini-force-visible-v2274').forEach(n=>n.remove());\n"
if old not in s:
    raise SystemExit('capture cleanup anchor not found')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

print('V2.28.1 exact parity + template delete repair applied')
