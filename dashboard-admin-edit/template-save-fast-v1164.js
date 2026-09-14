(()=>{
  'use strict';
  if(window.__DINI_TEMPLATE_SAVE_FAST_1164__)return;
  window.__DINI_TEMPLATE_SAVE_FAST_1164__=true;

  const VERSION='1.16.4';
  const SUPABASE_URL='https://jfvmcerrsxjvbiogfqes.supabase.co';
  const SUPABASE_KEY='sb_publishable_3IqSDxkpxCGiDpxAEwdsXQ_AsJpsC4W';
  const BUCKET='template-packages';
  const DB_NAME='dini-anif-editor-v150',DB_VERSION=2,GLOBAL_KEY='native-applied';
  const sb=window.supabase?.createClient?.(SUPABASE_URL,SUPABASE_KEY);
  const params=new URLSearchParams(location.search);
  const recordId=params.get('record')||params.get('template')||'';
  let saving=false;

  const deep=v=>JSON.parse(JSON.stringify(v??null));
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const scopedKey=id=>`${GLOBAL_KEY}:${id}`;
  const safeSlug=v=>String(v||'template').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,64)||'template';
  const withTimeout=(p,ms,label='Operasi')=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error(`${label} timeout setelah ${Math.round(ms/1000)} detik`)),ms))]);
  const norm=v=>String(v??'').replace(/\s+/g,' ').trim();
  const cssEsc=v=>(window.CSS?.escape?CSS.escape(String(v||'')):String(v||'').replace(/["\\]/g,'\\$&'));

  function toast(message,type='success',title=''){
    if(typeof window.editorToast==='function')return window.editorToast(message,type,title);
    let stack=document.querySelector('#editorToastStack');if(!stack){stack=document.createElement('div');stack.id='editorToastStack';stack.className='editor-toast-stack';document.body.appendChild(stack)}
    const el=document.createElement('div');el.className='editor-toast '+type;el.innerHTML=`<strong>${title||'Info'}</strong><small>${message}</small>`;stack.appendChild(el);requestAnimationFrame(()=>el.classList.add('show'));if(type!=='loading')setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),250)},4200);return el;
  }
  function finishToast(el,message,type='success',title=''){
    if(typeof window.finishEditorToast==='function')return window.finishEditorToast(el,message,type,title);
    if(!el)return toast(message,type,title);el.className='editor-toast '+type+' show';el.innerHTML=`<strong>${title||(type==='success'?'Sukses':'Gagal')}</strong><small>${message}</small>`;if(type!=='loading')setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),250)},4200);
  }

  function openDB(){return new Promise((res,rej)=>{const q=indexedDB.open(DB_NAME,DB_VERSION);q.onupgradeneeded=()=>{const db=q.result;if(!db.objectStoreNames.contains('assets'))db.createObjectStore('assets');if(!db.objectStoreNames.contains('snapshots'))db.createObjectStore('snapshots')};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error||new Error('IndexedDB gagal dibuka'))})}
  async function readSnapKey(key){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('snapshots');const q=tx.objectStore('snapshots').get(key);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error||new Error('Snapshot APPLY tidak terbaca'))})}
  async function writeSnapKey(key,value){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(value,key);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error||new Error('IndexedDB transaction aborted'))})}
  async function readAsset(db,key){return new Promise((res,rej)=>{const tx=db.transaction('assets');const q=tx.objectStore('assets').get(key);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error||new Error(`Asset ${key} tidak terbaca`))})}
  async function readApplied(){if(!recordId)throw new Error('UUID template tidak ada di URL.');const s=await readSnapKey(scopedKey(recordId));if(s)return s;throw new Error('Snapshot APPLY khusus template ini belum ada. Klik APPLY sekali lagi.')}

  const publicUrl=path=>sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  async function upload(path,blob,type){const op=sb.storage.from(BUCKET).upload(path,blob,{contentType:type||blob?.type||'application/octet-stream',upsert:true,cacheControl:'3600'});const {error}=await withTimeout(op,60000,`Upload ${path.split('/').pop()}`);if(error)throw new Error(`${path}: ${error.message}`);return publicUrl(path)}
  const uploadText=(path,text,type='application/json; charset=utf-8')=>upload(path,new Blob([text],{type}),type);
  async function runPool(items,limit,worker){let cursor=0;await Promise.all(Array.from({length:Math.min(limit,Math.max(1,items.length))},async()=>{while(true){const i=cursor++;if(i>=items.length)return;await worker(items[i],i)}}))}
  function replaceAllDeep(value,map){if(typeof value==='string'){let out=value;for(const [from,to] of map)if(from&&out.includes(from))out=out.split(from).join(to);return out}if(Array.isArray(value))return value.map(v=>replaceAllDeep(v,map));if(value&&typeof value==='object'){const out={};for(const [k,v] of Object.entries(value))out[k]=replaceAllDeep(v,map);return out}return value}
  function dirname(raw){try{const u=new URL(raw,location.href);if(/\.[a-z0-9]{1,8}$/i.test(u.pathname.split('/').pop()||''))u.pathname=u.pathname.replace(/[^/]*$/,'');if(!u.pathname.endsWith('/'))u.pathname+='/';u.search='';u.hash='';return u.href}catch{return ''}}
  function canonicalAssetBase(html,manifest={}){try{const doc=new DOMParser().parseFromString(String(html||''),'text/html');const raw=String(doc.querySelector('base')?.getAttribute('href')||'').trim();if(raw){const d=dirname(new URL(raw,manifest.source_url||location.href).href);if(d)return d}}catch{}const source=String(manifest.source_url||'').trim();if(source){const d=dirname(source);if(d)return d}const current=String(manifest.asset_base||'').trim();if(current){const d=dirname(current);if(d)return d}return location.origin+'/'}
  function localRefs(value){const text=typeof value==='string'?value:JSON.stringify(value||{});return [...new Set((text.match(/assets\/(?:generated|source)\/[A-Za-z0-9_./%+~@()\-]+/g)||[]).map(x=>x.replace(/["'<>),;]+$/g,'')))]}
  function localPath(v){const m=String(v||'').match(/(assets\/(?:generated|source)\/[A-Za-z0-9_./%+~@()\-]+)/i);return m?m[1].replace(/["'<>),;]+$/g,''):''}
  const isStorageUrl=v=>String(v||'').includes('/storage/v1/object/public/'+BUCKET+'/');

  async function currentRow(){const r=await withTimeout(sb.from('templates').select('*').eq('id',recordId).maybeSingle(),15000,'Baca template');if(r.error)throw r.error;return r.data||null}
  async function fetchSnap(url,label='snapshot'){const u=new URL(url,location.href);u.searchParams.set('_v1164',String(Date.now()));const r=await withTimeout(fetch(u.href,{cache:'no-store'}),15000,'Baca '+label);if(!r.ok)throw new Error(`${label} HTTP ${r.status}`);return r.json()}

  function historyEntries(row,currentSnap){
    const out=[],seen=new Set(),add=e=>{const u=String(e?.editor_snapshot_url||'').trim();if(!u||seen.has(u))return;seen.add(u);out.push({editor_snapshot_url:u,revision:e?.revision||'',saved_at:e?.saved_at||null,source_path:e?.source_path||''})};
    add({editor_snapshot_url:row?.manifest_json?.editor_snapshot_url,revision:row?.manifest_json?.revision,saved_at:row?.manifest_json?.saved_at,source_path:row?.source_path});
    for(const e of row?.manifest_json?.revision_history||[])add(e);
    for(const e of currentSnap?.manifest?.revision_history||[])add(e);
    return out.slice(0,8);
  }
  async function loadHistory(row,currentSnap){
    const out=[];for(const e of historyEntries(row,currentSnap)){
      try{out.push({...e,snap:await fetchSnap(e.editor_snapshot_url,'revision history')})}catch(err){console.warn('REVISION_HISTORY_V1164',e.editor_snapshot_url,err)}
    }return out;
  }

  function mediaField(schema,id){return (schema?.fields||[]).find(f=>f?.id===id)}
  function repairBrokenMedia(raw,history){
    const map=new Map();let repaired=0;
    for(const f of raw?.schema?.fields||[]){
      if(!['image','background','audio','video'].includes(f?.kind)||!f.id)continue;
      const cur=String(raw.values?.[f.id]??f.value??'');const p=localPath(cur);
      if(!p)continue;
      const suspicious=!isStorageUrl(cur);
      if(!suspicious)continue;
      let good='';
      for(const h of history){
        const hf=mediaField(h.snap?.schema,f.id);const hv=String(h.snap?.values?.[f.id]??hf?.value??'');const hp=localPath(hv);
        if(isStorageUrl(hv)){good=hv;break}
        if(hp){good=new URL(hp,dirname(h.editor_snapshot_url)).href;break}
      }
      if(good&&good!==cur){raw.values=raw.values||{};raw.values[f.id]=good;map.set(cur,good);repaired++}
    }
    if(map.size){raw.html=replaceAllDeep(String(raw.html||raw.baseHtml||''),map);raw.baseHtml=raw.html;raw.schema=replaceAllDeep(raw.schema,map);raw.values=replaceAllDeep(raw.values,map)}
    raw.asset_recovery={version:VERSION,repaired_fields:repaired,recovered_at:new Date().toISOString()};
    return raw;
  }

  function clearEditId(doc,id){
    doc.querySelectorAll('[data-native-edit-id],[data-native-edit-ids]').forEach(n=>{
      if(n.getAttribute('data-native-edit-id')===id)n.removeAttribute('data-native-edit-id');
      const ids=(n.getAttribute('data-native-edit-ids')||'').split(/[\s,]+/).filter(Boolean).filter(x=>x!==id);
      if(ids.length)n.setAttribute('data-native-edit-ids',ids.join(','));else n.removeAttribute('data-native-edit-ids');
    });
  }
  function addEditId(node,id){if(!node||!id)return;const ids=(node.getAttribute('data-native-edit-ids')||'').split(/[\s,]+/).filter(Boolean);if(!ids.includes(id))ids.push(id);node.setAttribute('data-native-edit-ids',ids.join(','));node.setAttribute('data-native-edit-id',id);node.setAttribute('data-text-identity-stable',VERSION)}
  function leafPool(root){const sel='h1,h2,h3,h4,h5,h6,p,span,a,label,button,strong,em,small,li,td,th,div';const pool=[root,...(root?.querySelectorAll?.(sel)||[])].filter(Boolean);const leaves=pool.filter(n=>!(n.querySelector?.(sel)));return leaves.length?leaves:pool}
  function directRoots(doc,f){const out=[],seen=new Set(),add=n=>{if(n&&!seen.has(n)){seen.add(n);out.push(n)}};if(f.node_id)add(doc.querySelector(`[data-native-node-id="${cssEsc(f.node_id)}"]`));if(f.id){add(doc.querySelector(`[data-native-edit-id="${cssEsc(f.id)}"]`));doc.querySelectorAll('[data-native-edit-ids]').forEach(n=>{if((n.getAttribute('data-native-edit-ids')||'').split(/[\s,]+/).includes(f.id))add(n)})}if(f.source_element_id)add(doc.querySelector(`[data-id="${cssEsc(f.source_element_id)}"]`));return out}
  function pickTextTarget(doc,f,value){
    const want=norm(value),old=norm(f?.value??f?.source_text??'');let roots=directRoots(doc,f);if(!roots.length)roots=[doc.body];
    for(const root of roots){const list=leafPool(root);const hit=list.find(n=>want&&norm(n.textContent)===want)||list.find(n=>old&&norm(n.textContent)===old)||list.find(n=>want&&norm(n.textContent).includes(want))||list.find(n=>old&&norm(n.textContent).includes(old));if(hit)return hit}
    const all=leafPool(doc.body);return all.find(n=>want&&norm(n.textContent)===want)||null;
  }
  function relativePath(anchor,node){const path=[];let cur=node;while(cur&&cur!==anchor){const p=cur.parentElement;if(!p)return null;path.unshift([...p.children].indexOf(cur));cur=p}return cur===anchor?path:null}
  function followPath(anchor,path){let cur=anchor;for(const i of path||[]){cur=cur?.children?.[i];if(!cur)return null}return cur}
  function captureLiveText(raw){
    try{
      const live=document.getElementById('previewFrame')?.contentDocument;if(!live?.documentElement)return raw;
      const out=new DOMParser().parseFromString(String(raw.html||raw.baseHtml||''),'text/html');let captured=0;
      for(const f of raw?.schema?.fields||[]){
        if(f?.kind!=='text'||!f.id)continue;const value=String(raw.values?.[f.id]??f.value??'');const liveTarget=pickTextTarget(live,f,value);if(!liveTarget)continue;
        const liveAnchor=liveTarget.closest?.('[data-id]')||live.body;const anchorId=liveAnchor?.getAttribute?.('data-id')||'';const path=relativePath(liveAnchor,liveTarget);
        let outAnchor=anchorId?out.querySelector(`[data-id="${cssEsc(anchorId)}"]`):out.body;let outTarget=path?followPath(outAnchor,path):null;
        if(!outTarget||outTarget.tagName!==liveTarget.tagName)outTarget=pickTextTarget(out,f,value);
        if(!outTarget)continue;clearEditId(out,f.id);addEditId(outTarget,f.id);
        if(outTarget.matches?.('input,textarea,select')){outTarget.value=value;outTarget.setAttribute('value',value)}else outTarget.textContent=value;
        captured++;
      }
      raw.html='<!doctype html>\n'+out.documentElement.outerHTML;raw.baseHtml=raw.html;raw.text_identity={version:VERSION,captured_fields:captured,captured_at:new Date().toISOString(),source:'live-editor-leaf'};return raw;
    }catch(err){console.warn('TEXT_CAPTURE_V1164',err);return raw}
  }

  async function carryLocalRefs(history,snap,replacements){
    const refs=localRefs({html:snap.html,values:snap.values,schema:snap.schema});let missing=refs.filter(p=>!replacements.has(p));if(!missing.length)return;
    for(const h of history){
      if(!missing.length)break;const prevRefs=new Set(localRefs({html:h.snap?.html||h.snap?.baseHtml||'',values:h.snap?.values||{},schema:h.snap?.schema||{}}));const base=dirname(h.editor_snapshot_url);
      for(const p of [...missing])if(prevRefs.has(p)){replacements.set(p,new URL(p,base).href);missing=missing.filter(x=>x!==p)}
    }
  }

  async function save(){
    if(saving)return;const btn=document.getElementById('saveDraftBtn'),dirty=String(document.getElementById('dirtyState')?.textContent||'');
    if(!/APPLIED|FRESH OVERLAY|PARITY CANONICAL|TEXT PARITY/i.test(dirty))return toast('Klik APPLY dulu supaya state CURRENT dibekukan sebelum disimpan.','info','Belum APPLY');
    if(!recordId)return toast('UUID template tidak ada di URL.','error','Update dibatalkan');
    if(!window.DINI_TEMPLATE_CANONICAL_V1160?.resolveSnapshot)return toast('Canonical resolver V1.16 belum termuat. Hard refresh lalu coba lagi.','error','Update dibatalkan');
    saving=true;if(btn)btn.disabled=true;const t=toast('Recovery lineage + text parity CURRENT…','loading','Update Template');
    try{
      const sessionRes=await withTimeout(sb.auth.getSession(),12000,'Session admin');if(sessionRes.error||!sessionRes.data?.session)throw new Error('Session admin tidak ditemukan. Login ulang.');
      const row=await currentRow();if(!row||String(row.id)!==String(recordId))throw new Error('UUID LOCK gagal: template terpilih tidak ditemukan.');
      let raw=deep(await readApplied());if(!raw?.schema||!Array.isArray(raw.schema.fields)||!raw.html)throw new Error('Snapshot APPLY belum valid. Klik APPLY lagi.');
      if(raw.template_id&&String(raw.template_id)!==String(recordId))throw new Error('Snapshot UUID berbeda dari template yang sedang dibuka.');
      const history=await loadHistory(row,raw);
      raw=repairBrokenMedia(raw,history);raw=captureLiveText(raw);
      let snap=window.DINI_TEMPLATE_CANONICAL_V1160.resolveSnapshot(raw);snap=captureLiveText(snap);

      const revision='r-'+Date.now().toString(36)+'-'+crypto.randomUUID().slice(0,6),base=`${safeSlug(row.slug)}/revisions/${revision}`;
      const assets=[...(snap.assets||[])].filter(a=>a?.key&&a?.path),unique=[],seen=new Set();for(const a of assets){const p=String(a.path||'').replace(/^\/+/, '');if(!p||seen.has(p))continue;seen.add(p);unique.push({...a,path:p})}
      const db=await openDB(),replacements=new Map();let finished=0;const small=t?.querySelector?.('small');if(small)small.textContent=`Recovery OK · cek/upload asset 0/${unique.length}`;
      await runPool(unique,4,async a=>{const blob=await readAsset(db,a.key);if(blob){const url=await upload(`${base}/${a.path}`,blob,a.type||blob.type);replacements.set(a.path,url)}finished++;if(small)small.textContent=`Recovery OK · cek/upload asset ${finished}/${unique.length}`});
      await carryLocalRefs(history,snap,replacements);
      const refs=localRefs({html:snap.html,values:snap.values,schema:snap.schema}),missing=refs.filter(p=>!replacements.has(p));if(missing.length)throw new Error(`Masih ada ${missing.length} asset lokal yang tidak punya lineage (${missing.slice(0,3).join(', ')}). Jangan Generate semua; laporkan daftar ini.`);

      let finalHtml=String(snap.html||'');for(const [from,to] of replacements)finalHtml=finalHtml.split(from).join(to);
      const values=replaceAllDeep(deep(snap.values||{}),replacements),schema=replaceAllDeep(deep(snap.schema||{}),replacements),manifestBase=replaceAllDeep(deep(snap.manifest||{}),replacements);
      const snapshotPath=`${base}/editor-snapshot.json`,indexPath=`${base}/index.html`,schemaPath=`${base}/native-schema.json`,dataPath=`${base}/native-data.json`,manifestPath=`${base}/manifest.json`;
      const snapshotUrl=publicUrl(snapshotPath),sourceUrl=publicUrl(indexPath),assetBase=canonicalAssetBase(finalHtml,{...manifestBase,source_url:sourceUrl});
      const currentEntry=row.manifest_json?.editor_snapshot_url?{revision:row.manifest_json.revision||'previous',source_path:row.source_path,editor_snapshot_url:row.manifest_json.editor_snapshot_url,saved_at:row.manifest_json.saved_at||row.updated_at||null}:null;
      const oldHistory=[...(currentEntry?[currentEntry]:[]),...(row.manifest_json?.revision_history||[])].filter((x,i,a)=>x?.editor_snapshot_url&&a.findIndex(y=>y.editor_snapshot_url===x.editor_snapshot_url)===i).slice(0,6);
      const manifest={...manifestBase,editor_version:'2.35.0',renderer_version:'canonical-template-contract-1.16.4',revision,revision_id:revision,template_id:row.id,record_id:row.id,editor_snapshot_url:snapshotUrl,source_url:sourceUrl,source_of_truth:'canonical-editor-current',canonicalization_version:VERSION,snapshot_scope_version:VERSION,asset_base:assetBase,saved_at:new Date().toISOString(),artifact_prefix:base,revision_history:oldHistory};
      const cloudSnap={...deep(snap),version:'2.35.0',template_id:row.id,record_id:row.id,snapshot_scope:row.id,snapshot_scope_version:VERSION,revision,html:finalHtml,baseHtml:finalHtml,values,schema,manifest,assets:[],saved_at:new Date().toISOString()};
      if(small)small.textContent='Upload recovery snapshot UUID yang sama…';
      await Promise.all([uploadText(indexPath,finalHtml,'text/html; charset=utf-8'),uploadText(snapshotPath,JSON.stringify(cloudSnap,null,2)),uploadText(schemaPath,JSON.stringify(schema,null,2)),uploadText(dataPath,JSON.stringify({values,transforms:deep(snap.transforms||{}),canonicalization:snap.canonicalization||{},text_identity:raw.text_identity||{},asset_recovery:raw.asset_recovery||{}},null,2)),uploadText(manifestPath,JSON.stringify(manifest,null,2))]);
      const payload={name:row.name,slug:row.slug,source_path:sourceUrl,status:row.status||(row.is_active?'active':'draft'),is_active:!!row.is_active,package_path:`supabase://${BUCKET}/${snapshotPath}`,manifest_json:manifest,updated_at:new Date().toISOString()};
      const result=await withTimeout(sb.from('templates').update(payload).eq('id',row.id).select('*').single(),15000,'Update UUID yang sama');if(result.error)throw result.error;
      const verify=await withTimeout(sb.from('templates').select('id,manifest_json').eq('id',row.id).single(),12000,'Verifikasi UUID');if(verify.error||String(verify.data?.id)!==String(recordId)||verify.data?.manifest_json?.revision!==revision)throw new Error('UUID/revision verification gagal setelah update.');
      const localScoped={...snap,template_id:row.id,record_id:row.id,snapshot_scope:row.id,snapshot_scope_version:VERSION};await writeSnapKey(scopedKey(row.id),localScoped);await writeSnapKey(GLOBAL_KEY,localScoped);
      finishToast(t,`${row.name} UPDATE UUID SAMA ✓ · ${raw.text_identity?.captured_fields||0} text leaf · ${raw.asset_recovery?.repaired_fields||0} media recovery · revision ${revision}.`,'success','Recovery V1.16.4 tersimpan');
      await sleep(900);location.href='/dashboard-admin-template?refresh='+Date.now();
    }catch(err){console.error('TEMPLATE_SAVE_FAST_V1164',err);finishToast(t,err?.message||String(err),'error','Recovery save gagal');if(btn)btn.disabled=false}finally{saving=false}
  }

  document.addEventListener('click',e=>{const btn=e.target?.closest?.('#saveDraftBtn');if(!btn)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();save()},true);
  window.DINI_TEMPLATE_SAVE_V1164={VERSION,save};document.documentElement.dataset.templateSave=VERSION;
})();
