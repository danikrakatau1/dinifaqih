(()=>{
  'use strict';
  if(window.__DINI_FETCH_MEDIA_OWNER_1170__)return;
  window.__DINI_FETCH_MEDIA_OWNER_1170__=true;

  const VERSION='1.17.0';
  const frame=document.getElementById('previewFrame');
  const inspectorBody=document.getElementById('inspectorBody');
  const selectionBadge=document.getElementById('selectionBadge');
  const dirty=document.getElementById('dirtyState');
  if(!frame||!inspectorBody)return;

  const uploads=window.__DINI_FETCH_NESTED_ASSETS__=window.__DINI_FETCH_NESTED_ASSETS__||new Map();
  const objectUrls=window.__DINI_FETCH_NESTED_OBJECT_URLS__=window.__DINI_FETCH_NESTED_OBJECT_URLS__||new Set();
  const cleanName=v=>String(v||'image').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,110)||'image';
  const fieldIds=node=>{
    if(!node)return[];
    const raw=[node.getAttribute?.('data-native-edit-id')||'',node.getAttribute?.('data-native-edit-ids')||''].join(',');
    return [...new Set(raw.split(/[\s,]+/).filter(Boolean))];
  };
  const pickImageId=img=>fieldIds(img).find(id=>/image/i.test(id))||fieldIds(img)[0]||'';
  const imgForTarget=target=>{
    if(!target)return null;
    if(target.matches?.('img[data-native-edit-id],img[data-native-edit-ids]'))return target;
    const thumb=target.closest?.('.weddingpress-timeline-thumbnail,.elementor-image,.elementor-widget-image,[data-native-image-owner]');
    if(thumb){const img=thumb.querySelector?.('img[data-native-edit-id],img[data-native-edit-ids],img');if(img)return img}
    return null;
  };

  function renderInspector(img,id){
    const label=img.getAttribute('alt')||'Foto';
    const current=uploads.get(id);
    if(selectionBadge)selectionBadge.textContent=`${label} · ${id}`;
    inspectorBody.className='';
    inspectorBody.innerHTML=`
      <div style="padding:14px;display:grid;gap:12px">
        <div><strong style="display:block;margin-bottom:5px">Foto source-native</strong><small style="opacity:.72">Owner tepat: <code>${String(id).replace(/[<>&]/g,'')}</code></small></div>
        <div style="font-size:12px;line-height:1.55;opacity:.82">Nested image terdeteksi di dalam widget sumber. Upload di sini hanya mengganti foto ini, bukan background/layer parent.</div>
        <button type="button" id="fetchNestedReplace1170" style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:#d7b35d;color:#17120a;font-weight:700;cursor:pointer">${current?'Ganti Foto Lagi':'Ganti Foto'}</button>
        <div id="fetchNestedState1170" style="font-size:11px;opacity:.72">${current?`Siap APPLY · ${current.name}`:'Belum ada upload baru.'}</div>
      </div>`;
    inspectorBody.querySelector('#fetchNestedReplace1170')?.addEventListener('click',()=>openPicker(img,id,label));
  }

  function openPicker(img,id,label){
    const input=document.createElement('input');input.type='file';input.accept='image/*';input.hidden=true;document.body.appendChild(input);
    input.onchange=()=>{
      const file=input.files?.[0];input.remove();if(!file)return;
      const prev=uploads.get(id);if(prev?.url){try{URL.revokeObjectURL(prev.url)}catch{};objectUrls.delete(prev.url)}
      const name=cleanName(file.name),path=`assets/generated/${id}-${name}`,url=URL.createObjectURL(file);objectUrls.add(url);
      const rec={id,file,blob:file,name,type:file.type||'application/octet-stream',path,url,label,uploaded_at:new Date().toISOString()};uploads.set(id,rec);
      img.setAttribute('src',url);img.setAttribute('data-src',url);img.removeAttribute('srcset');img.removeAttribute('data-srcset');img.removeAttribute('data-lazy-src');img.removeAttribute('data-original');
      img.setAttribute('data-fetch-nested-owner',VERSION);img.setAttribute('data-native-final-asset','fetch-nested-v1170');
      if(dirty){dirty.textContent=`PERUBAHAN BELUM APPLY · FOTO ${label} · ${id}`;dirty.classList.add('dirty')}
      document.documentElement.dataset.fetchNestedDirty='1';
      renderInspector(img,id);
      window.editorToast?.(`${file.name} siap untuk ${label}. Klik APPLY agar masuk snapshot Fetch.`,'success','Foto Love Story siap');
    };
    input.click();
  }

  function onFrameClick(e){
    const img=imgForTarget(e.target);if(!img)return;
    const id=pickImageId(img);if(!id)return;
    const nested=!!img.closest('.weddingpress-timeline-thumbnail,.weddingpress-timeline-item,.elementor-image,.elementor-widget-image');
    if(!nested)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    renderInspector(img,id);
  }

  function install(){
    try{
      const doc=frame.contentDocument;if(!doc?.documentElement||doc.documentElement.dataset.fetchMediaOwner1170==='1')return;
      doc.documentElement.dataset.fetchMediaOwner1170='1';
      doc.addEventListener('click',onFrameClick,true);
    }catch(err){console.warn('FETCH_MEDIA_OWNER_V1170',err)}
  }
  frame.addEventListener('load',()=>{setTimeout(install,20);setTimeout(install,250)});
  [100,500,1200,2500].forEach(ms=>setTimeout(install,ms));
  addEventListener('beforeunload',()=>{for(const u of objectUrls)try{URL.revokeObjectURL(u)}catch{}});
})();
