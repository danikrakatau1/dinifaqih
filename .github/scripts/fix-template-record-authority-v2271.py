from pathlib import Path

def once(s, old, new, label):
    if old not in s:
        raise SystemExit('ANCHOR NOT FOUND: '+label)
    return s.replace(old,new,1)

# Template Library: resolve the exact DB row at click time.
p=Path('dashboard-admin-template/index.html');s=p.read_text(encoding='utf-8')
old='''          <a class="btn" href="/dashboard-admin-fetch?autoEdit=1&template=${encodeURIComponent(t.slug||t.id)}&source=${encodeURIComponent(source)}">✏️ Edit</a>'''
new='''          <button class="btn" data-edit="${esc(t.id)}">✏️ Edit</button>'''
s=once(s,old,new,'template edit action')
old="""  grid.querySelectorAll('[data-activate]').forEach(btn=>btn.addEventListener('click',()=>activateTemplate(btn.dataset.activate)));
"""
new="""  grid.querySelectorAll('[data-edit]').forEach(btn=>btn.addEventListener('click',()=>editTemplate(btn.dataset.edit,btn)));
  grid.querySelectorAll('[data-activate]').forEach(btn=>btn.addEventListener('click',()=>activateTemplate(btn.dataset.activate)));
"""
s=once(s,old,new,'template edit listener')
anchor="""const TEMPLATE_BUCKET='template-packages';
"""
block="""async function editTemplate(id,btn){
  const oldText=btn?.textContent||'✏️ Edit';
  if(btn){btn.disabled=true;btn.textContent='Memuat…'}
  libraryStatus.className='status';libraryStatus.textContent='Mengunci record template yang dipilih…';
  try{
    const latest=await sb.from('templates').select('id,name,slug,source_path,updated_at').eq('id',id).single();
    if(latest.error)throw latest.error;
    const row=latest.data;if(!row)throw new Error('Record template tidak ditemukan.');
    const source=String(row.source_path||'').trim();if(!source||source==='/')throw new Error('Template belum memiliki source snapshot yang dapat diedit.');
    libraryStatus.className='status ok';libraryStatus.textContent=`Membuka ${row.name} dari record terbaru…`;
    const q=new URLSearchParams({autoEdit:'1',template:row.slug||row.id,record:row.id,source,updated:String(row.updated_at||'')});
    location.href='/dashboard-admin-fetch?'+q.toString();
  }catch(e){
    libraryStatus.className='status warn';libraryStatus.textContent='Edit gagal: '+(e.message||String(e));
    if(btn){btn.disabled=false;btn.textContent=oldText}
  }
}

const TEMPLATE_BUCKET='template-packages';
"""
s=once(s,anchor,block,'record-authoritative edit function')
p.write_text(s,encoding='utf-8')

# Fetch Studio: seal record identity into the exact-source handoff.
p=Path('dashboard-admin-fetch/studio.js');s=p.read_text(encoding='utf-8')
old="""    const template=qs.get('template')||'';
    const target=qs.get('source')||'';
    if(!template||!target){toast('Template/source tidak lengkap.','error','Auto Edit gagal');return}
"""
new="""    const template=qs.get('template')||'';
    const recordId=qs.get('record')||'';
    const target=qs.get('source')||'';
    if(!template||!recordId||!target){toast('Template/record/source tidak lengkap.','error','Auto Edit gagal');return}
"""
s=once(s,old,new,'fetch record context')
old="""      rebuild.manifest.editor_context_template=template;
      rebuild.manifest.editor_context_source=target;
"""
new="""      rebuild.manifest.editor_context_template=template;
      rebuild.manifest.editor_context_record_id=recordId;
      rebuild.manifest.editor_context_source=target;
"""
s=once(s,old,new,'fetch record identity seal')
p.write_text(s,encoding='utf-8')

# Editor: validate record ID in addition to slug + source, and retain scoped handoff for refresh.
p=Path('dashboard-admin-edit/editor.js');s=p.read_text(encoding='utf-8')
old="""     const handoffTemplate=String(pack?.manifest?.editor_context_template||'').trim();
     const handoffSource=String(pack?.manifest?.editor_context_source||pack?.manifest?.source_url||pack?.native?.source_url||'').trim();
     if(requestedTemplate&&handoffTemplate!==requestedTemplate){console.warn('HANDOFF_TEMPLATE_MISMATCH',{expected:requestedTemplate,received:handoffTemplate});return false}
     if(currentTemplateRecord?.source_path&&handoffSource&&!sameSource(currentTemplateRecord.source_path,handoffSource)){console.warn('HANDOFF_SOURCE_MISMATCH',{expected:currentTemplateRecord.source_path,received:handoffSource});return false}
"""
new="""     const handoffTemplate=String(pack?.manifest?.editor_context_template||'').trim();
     const handoffRecordId=String(pack?.manifest?.editor_context_record_id||'').trim();
     const handoffSource=String(pack?.manifest?.editor_context_source||pack?.manifest?.source_url||pack?.native?.source_url||'').trim();
     if(requestedTemplate&&handoffTemplate!==requestedTemplate){console.warn('HANDOFF_TEMPLATE_MISMATCH',{expected:requestedTemplate,received:handoffTemplate});return false}
     if(currentTemplateRecord?.id&&handoffRecordId&&String(currentTemplateRecord.id)!==handoffRecordId){console.warn('HANDOFF_RECORD_MISMATCH',{expected:currentTemplateRecord.id,received:handoffRecordId});return false}
     if(currentTemplateRecord?.source_path&&handoffSource&&!sameSource(currentTemplateRecord.source_path,handoffSource)){console.warn('HANDOFF_SOURCE_MISMATCH',{expected:currentTemplateRecord.source_path,received:handoffSource});return false}
"""
s=once(s,old,new,'editor record validation')
old="""     try{sessionStorage.removeItem(handoffKey());localStorage.removeItem(handoffKey());if(typeof window.name==='string'&&window.name.startsWith(handoffWindowPrefix()))window.name=''}catch{}
"""
new="""     try{if(typeof window.name==='string'&&window.name.startsWith(handoffWindowPrefix()))window.name=''}catch{}
"""
s=once(s,old,new,'retain scoped handoff for refresh')
p.write_text(s,encoding='utf-8')

# Invariants
lib=Path('dashboard-admin-template/index.html').read_text(encoding='utf-8')
studio=Path('dashboard-admin-fetch/studio.js').read_text(encoding='utf-8')
editor=Path('dashboard-admin-edit/editor.js').read_text(encoding='utf-8')
assert 'data-edit="${esc(t.id)}"' in lib
assert "select('id,name,slug,source_path,updated_at').eq('id',id).single()" in lib
assert "record:row.id" in lib
assert "const recordId=qs.get('record')||'';" in studio
assert 'editor_context_record_id=recordId' in studio
assert 'HANDOFF_RECORD_MISMATCH' in editor
print('Template record authority V2.27.1 invariants: OK')
