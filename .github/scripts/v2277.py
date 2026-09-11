from pathlib import Path

# 1) Template library: Preview + Edit must use immutable DB UUID, never slug.
p = Path("dashboard-admin-template/index.html")
s = p.read_text(encoding="utf-8")
old = 'href="/dashboard-admin-template/preview.html?template=${encodeURIComponent(t.slug||t.id)}"'
new = 'href="/dashboard-admin-template/preview.html?template=${encodeURIComponent(t.id)}"'
if old not in s:
    raise SystemExit("template preview anchor not found")
s = s.replace(old, new, 1)

old = "const q=new URLSearchParams({autoEdit:'1',template:row.slug||row.id,record:row.id,source,updated:String(row.updated_at||'')});"
new = "const q=new URLSearchParams({autoEdit:'1',template:row.id,record:row.id,slug:row.slug||'',source,updated:String(row.updated_at||'')});"
if old not in s:
    raise SystemExit("edit UUID query anchor not found")
s = s.replace(old, new, 1)
p.write_text(s, encoding="utf-8")

# 2) Fetch studio: record UUID is canonical handoff identity.
p = Path("dashboard-admin-fetch/studio.js")
s = p.read_text(encoding="utf-8")
old = """    const template=qs.get('template')||'';
    const recordId=qs.get('record')||'';
    const target=qs.get('source')||'';
    if(!template||!recordId||!target){toast('Template/record/source tidak lengkap.','error','Auto Edit gagal');return}"""
new = """    const template=qs.get('template')||'';
    const recordId=qs.get('record')||'';
    const templateSlug=qs.get('slug')||'';
    const target=qs.get('source')||'';
    if(!template||!recordId||!target){toast('Template/record/source tidak lengkap.','error','Auto Edit gagal');return}
    if(template!==recordId){toast('Identity template tidak konsisten. Buka ulang dari Template Library.','error','Auto Edit ditolak');return}"""
if old not in s:
    raise SystemExit("autoEdit identity anchor not found")
s = s.replace(old, new, 1)

old = """      rebuild.manifest.editor_context_template=template;
      rebuild.manifest.editor_context_record_id=recordId;
      rebuild.manifest.editor_context_source=target;"""
new = """      rebuild.manifest.editor_context_template=recordId;
      rebuild.manifest.editor_context_record_id=recordId;
      rebuild.manifest.editor_context_slug=templateSlug;
      rebuild.manifest.editor_context_source=target;"""
if old not in s:
    raise SystemExit("manifest identity anchor not found")
s = s.replace(old, new, 1)

old = "setTimeout(()=>{location.href='/dashboard-admin-edit?template='+encodeURIComponent(template)+'&handoff=1'},120);"
new = "setTimeout(()=>{location.href='/dashboard-admin-edit?template='+encodeURIComponent(recordId)+'&record='+encodeURIComponent(recordId)+'&handoff=1'},120);"
if old not in s:
    raise SystemExit("editor redirect anchor not found")
s = s.replace(old, new, 1)
p.write_text(s, encoding="utf-8")

# 3) Exact-source preview: resolve selected DB row by UUID first and validate it.
p = Path("dashboard-admin-edit/exact-source-preview-v2275.js")
s = p.read_text(encoding="utf-8")
old = """  const template=String(params.get('template')||'').trim();
  if(!template)return;
  const frame=document.getElementById('previewFrame');"""
new = """  const template=String(params.get('template')||'').trim();
  const recordId=String(params.get('record')||template).trim();
  if(!template||!recordId)return;
  const frame=document.getElementById('previewFrame');"""
if old not in s:
    raise SystemExit("exact-source params anchor not found")
s = s.replace(old, new, 1)

old = """  const sameTemplateRow=async()=>{
    let res=await sb.from('templates').select('id,name,slug,source_path,updated_at,manifest_json').eq('slug',template).limit(1).maybeSingle();
    if(res.error)throw res.error;
    if(!res.data&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(template)){
      res=await sb.from('templates').select('id,name,slug,source_path,updated_at,manifest_json').eq('id',template).limit(1).maybeSingle();
      if(res.error)throw res.error;
    }
    if(!res.data)throw new Error('Template record tidak ditemukan');
    return res.data;
  };"""
new = """  const sameTemplateRow=async()=>{
    const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    let res;
    if(uuid.test(recordId)){
      res=await sb.from('templates').select('id,name,slug,source_path,updated_at,manifest_json').eq('id',recordId).limit(1).maybeSingle();
    }else if(uuid.test(template)){
      res=await sb.from('templates').select('id,name,slug,source_path,updated_at,manifest_json').eq('id',template).limit(1).maybeSingle();
    }else{
      res=await sb.from('templates').select('id,name,slug,source_path,updated_at,manifest_json').eq('slug',template).limit(1).maybeSingle();
    }
    if(res.error)throw res.error;
    if(!res.data)throw new Error('Template record tidak ditemukan');
    if(uuid.test(recordId)&&String(res.data.id)!==recordId)throw new Error('Template record mismatch');
    return res.data;
  };"""
if old not in s:
    raise SystemExit("sameTemplateRow anchor not found")
s = s.replace(old, new, 1)

if "frame.dataset.exactTemplateSource=template;" not in s:
    raise SystemExit("exactTemplateSource anchor not found")
s = s.replace("frame.dataset.exactTemplateSource=template;", "frame.dataset.exactTemplateSource=recordId;", 1)

if "console.info('EXACT_TEMPLATE_PREVIEW_V2275',{template,sourceUrl});" not in s:
    raise SystemExit("exact preview log anchor not found")
s = s.replace("console.info('EXACT_TEMPLATE_PREVIEW_V2275',{template,sourceUrl});", "console.info('EXACT_TEMPLATE_PREVIEW_V2277',{template,recordId,sourceUrl});", 1)
p.write_text(s, encoding="utf-8")

# 4) Editor library loader: UUID query first; slug only for legacy links.
p = Path("dashboard-admin-edit/editor.js")
s = p.read_text(encoding="utf-8")
old = """     let lookup=await adminSb.from('templates').select('*').eq('slug',q).limit(1).maybeSingle();
     if(lookup.error)throw lookup.error;
     if(!lookup.data&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(q))lookup=await adminSb.from('templates').select('*').eq('id',q).limit(1).maybeSingle();
     if(lookup.error)throw lookup.error;const data=lookup.data;if(!data)throw new Error('Template tidak ditemukan.');"""
new = """     const isUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(q);
     let lookup=isUuid
       ? await adminSb.from('templates').select('*').eq('id',q).limit(1).maybeSingle()
       : await adminSb.from('templates').select('*').eq('slug',q).limit(1).maybeSingle();
     if(lookup.error)throw lookup.error;const data=lookup.data;if(!data)throw new Error('Template tidak ditemukan.');"""
if old not in s:
    raise SystemExit("editor lookup anchor not found")
s = s.replace(old, new, 1)
p.write_text(s, encoding="utf-8")

# 5) Template preview page: UUID first for canonical card links; slug fallback for old bookmarks.
p = Path("dashboard-admin-template/preview.html")
s = p.read_text(encoding="utf-8")
old = """    let res=await sb.from('templates').select('id,name,slug,source_path,updated_at,manifest_json').eq('slug',q).limit(1).maybeSingle();
    if(res.error)throw res.error;
    if(!res.data&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(q))res=await sb.from('templates').select('id,name,slug,source_path,updated_at,manifest_json').eq('id',q).limit(1).maybeSingle();"""
new = """    const isUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(q);
    let res=isUuid
      ? await sb.from('templates').select('id,name,slug,source_path,updated_at,manifest_json').eq('id',q).limit(1).maybeSingle()
      : await sb.from('templates').select('id,name,slug,source_path,updated_at,manifest_json').eq('slug',q).limit(1).maybeSingle();"""
if old not in s:
    raise SystemExit("template preview lookup anchor not found")
s = s.replace(old, new, 1)
p.write_text(s, encoding="utf-8")

# Invariants
checks = {
    "dashboard-admin-template/index.html": [
        "preview.html?template=${encodeURIComponent(t.id)}",
        "template:row.id,record:row.id,slug:row.slug||''"
    ],
    "dashboard-admin-fetch/studio.js": [
        "if(template!==recordId)",
        "editor_context_template=recordId",
        "&record='+encodeURIComponent(recordId)+'&handoff=1"
    ],
    "dashboard-admin-edit/exact-source-preview-v2275.js": [
        "const recordId=String(params.get('record')||template).trim();",
        ".eq('id',recordId)",
        "EXACT_TEMPLATE_PREVIEW_V2277"
    ],
    "dashboard-admin-edit/editor.js": [
        "let lookup=isUuid",
        ".eq('id',q)"
    ],
    "dashboard-admin-template/preview.html": [
        "let res=isUuid",
        ".eq('id',q)"
    ],
}
for name, needles in checks.items():
    txt=Path(name).read_text(encoding="utf-8")
    for needle in needles:
        if needle not in txt:
            raise SystemExit(f"invariant failed {name}: {needle}")

print("V2.27.7 UUID record-lock patch OK")
