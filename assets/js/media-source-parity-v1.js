(()=>{
  'use strict';
  if(window.__DINI_MEDIA_SOURCE_PARITY_V1__)return;
  window.__DINI_MEDIA_SOURCE_PARITY_V1__=true;

  const VERSION='1.0.2';
  const deep=v=>JSON.parse(JSON.stringify(v??null));
  const safe=v=>String(v||'media').toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'')||'media';
  const split=v=>String(v||'').split(/[\s,]+/).filter(Boolean);
  const uniq=a=>[...new Set(a.filter(Boolean))];
  const IMAGE_ATTRS=['src','data-src','data-lazy-src','data-original','data-thumb','data-thumbnail','poster'];
  const OWN_ATTRS=['data-native-edit-id','data-native-edit-ids','data-native-media-proxy'];
  const DECORATIVE_RX=/(?:frame|ornament|hias|decora|overlay|mask|border|bingkai|wayang|floral|flower|gold|mahkota)/i;

  function fieldIds(node){if(!node)return[];return uniq(OWN_ATTRS.flatMap(a=>split(node.getAttribute?.(a)||'')))}
  function setToken(node,attr,id){if(!node||!id)return;node.setAttribute(attr,uniq([...split(node.getAttribute?.(attr)||''),id]).join(' '))}
  function removeToken(node,attr,id){
    if(!node||!id||!node.hasAttribute?.(attr))return;
    if(attr==='data-native-edit-id'){if(String(node.getAttribute(attr)||'')===id)node.removeAttribute(attr);return}
    const xs=split(node.getAttribute(attr)||'').filter(x=>x!==id);if(xs.length)node.setAttribute(attr,xs.join(' '));else node.removeAttribute(attr);
  }
  function stripRef(v){let s=String(v||'').trim();const u=s.match(/^url\((['"]?)(.*?)\1\)$/i);if(u)s=u[2];s=s.replace(/^['"]|['"]$/g,'');try{s=decodeURIComponent(s)}catch{}return s.split('#')[0].split('?')[0]}
  function baseName(v){const s=stripRef(v);return s.split('/').pop()||''}
  function refTokens(raw){const s=String(raw||'').trim();if(!s)return[];if(/\s+\d+(?:\.\d+)?[wx](?:\s*,|$)/i.test(s)||s.includes(','))return s.split(',').map(x=>x.trim().split(/\s+/)[0]).filter(Boolean);return[s]}
  function sameRef(raw,ref){
    const b=stripRef(ref);if(!b)return false;const bb=baseName(b);
    return refTokens(raw).some(token=>{const a=stripRef(token);if(!a)return false;if(a===b)return true;if(a.endsWith('/'+b)||b.endsWith('/'+a))return true;const ab=baseName(a);return !!bb&&bb.length>5&&ab===bb});
  }
  function nodeMatches(node,refs){
    if(!node)return false;
    for(const a of IMAGE_ATTRS)if(refs.some(r=>sameRef(node.getAttribute?.(a)||'',r)))return true;
    for(const a of ['srcset','data-srcset'])if(refs.some(r=>sameRef(node.getAttribute?.(a)||'',r)))return true;
    const style=String(node.getAttribute?.('style')||'');return !!style&&refs.some(r=>{const bn=baseName(r);return style.includes(String(r))||(bn&&style.includes(bn))});
  }
  function isDecorative(node){const sig=[node?.className||'',node?.id||'',node?.getAttribute?.('alt')||'',node?.getAttribute?.('title')||'',node?.getAttribute?.('data-elementor-lightbox-title')||''].join(' ');return DECORATIVE_RX.test(sig)}
  function oldRefsFor(f){return uniq([f?.pre_v2_saved_value,f?.source_value,f?.original_value,f?.source_url,f?.source_path,f?.value].map(v=>String(v??'')).filter(x=>x&&x!=='undefined'&&x!=='null'))}
  function ensureNodeId(node,f,index=0){let id=String(node?.getAttribute?.('data-native-node-id')||'').trim();if(!id){id=`dini-media-${safe(f.id)}-${index+1}`;node?.setAttribute?.('data-native-node-id',id)}return id}
  function ownedByOtherImage(node,f,schemaById){return fieldIds(node).some(id=>id!==f.id&&schemaById.get(id)?.kind==='image')}
  function sourceImages(root){if(!root)return[];if(root.matches?.('img'))return[root];return[...(root.querySelectorAll?.('img')||[])]}
  function pickExactTargets(marked,f,refs){
    const out=[],seen=new Set(),add=n=>{if(n&&!seen.has(n)){seen.add(n);out.push(n)}};
    for(const root of marked){
      if(root.matches?.('img')){add(root);continue}
      const imgs=sourceImages(root);if(!imgs.length)continue;
      const self=imgs.filter(img=>fieldIds(img).includes(f.id));let matched=self.length?self:imgs.filter(img=>nodeMatches(img,refs));
      if(matched.length>1){const nonDecor=matched.filter(img=>!isDecorative(img));if(nonDecor.length)matched=nonDecor}
      if(!matched.length&&imgs.length===1)matched=imgs;
      if(!matched.length&&imgs.length>1){const nonDecor=imgs.filter(img=>!isDecorative(img));if(nonDecor.length===1)matched=nonDecor}
      matched.forEach(add);
    }
    return out;
  }
  function restoreDecorativeIfPossible(root,current){
    if(!root)return 0;let count=0;
    for(const img of sourceImages(root)){
      if(!isDecorative(img))continue;
      const src=String(img.getAttribute('src')||img.getAttribute('data-src')||''),original=String(img.getAttribute('data-original')||'').trim();
      if(original&&current&&sameRef(src,current)&&!sameRef(original,current)){img.setAttribute('src',original);img.setAttribute('data-src',original);count++}
    }
    return count;
  }
  function setImageValue(img,value){if(!img)return;if(value){img.setAttribute('src',value);img.setAttribute('data-src',value)}else{img.removeAttribute('src');img.removeAttribute('data-src')}img.removeAttribute('srcset');img.removeAttribute('data-srcset');img.removeAttribute('data-lazy-src')}
  function replaceInlineRef(node,refs,value){
    if(!node)return false;let changed=false;
    for(const attr of ['style','data-thumbnail','data-thumb','poster']){const raw=String(node.getAttribute?.(attr)||'');if(!raw)continue;let next=raw;for(const r of refs)if(r)next=next.split(r).join(value);if(next!==raw){node.setAttribute(attr,next);changed=true}}
    return changed;
  }
  function augment(html,inputSchema,inputValues){
    const schema=deep(inputSchema||{});schema.fields=Array.isArray(schema.fields)?schema.fields:[];const values={...deep(inputValues||{})};
    const doc=new DOMParser().parseFromString(String(html||''),'text/html'),byId=new Map(schema.fields.map(f=>[String(f?.id||''),f]));
    let fieldsFixed=0,aliases=0,containersDetached=0,decorativeRecovered=0;

    for(const f of schema.fields){
      if(!f?.id||f.kind!=='image')continue;
      const current=String(values[f.id]??f.value??''),refs=oldRefsFor(f);
      const marked=[...doc.querySelectorAll('[data-native-edit-id],[data-native-edit-ids],[data-native-media-proxy],[data-native-node-id]')].filter(n=>fieldIds(n).includes(f.id)||String(n.getAttribute('data-native-node-id')||'')===String(f.node_id||''));
      marked.forEach(n=>{decorativeRecovered+=restoreDecorativeIfPossible(n,current)});
      let targets=pickExactTargets(marked,f,refs);

      if(!targets.length){
        const global=[...doc.querySelectorAll('img')].filter(img=>nodeMatches(img,refs)&&!ownedByOtherImage(img,f,byId));
        if(global.length){const nonDecor=global.filter(img=>!isDecorative(img));targets=nonDecor.length?nonDecor:global.slice(0,1)}
      }
      if(!targets.length)continue;

      const primary=targets[0],oldNodeId=String(f.node_id||''),primaryId=ensureNodeId(primary,f,0);
      if(oldNodeId&&oldNodeId!==primaryId&&!f.source_container_node_id)f.source_container_node_id=oldNodeId;
      f.node_id=primaryId;f.media_owner='source-native-exact-image';f.media_parity_version=VERSION;

      for(const root of marked){
        if(root===primary||root.matches?.('img'))continue;
        if(sourceImages(root).length>1&&targets.some(t=>root.contains(t))){for(const attr of OWN_ATTRS)removeToken(root,attr,f.id);containersDetached++}
      }
      targets.forEach((img,i)=>{ensureNodeId(img,f,i);setToken(img,'data-native-edit-ids',f.id);img.setAttribute('data-dini-media-owner',f.id)});

      const aliasCandidates=[...doc.querySelectorAll('img')].filter(img=>!targets.includes(img)&&nodeMatches(img,refs)&&!ownedByOtherImage(img,f,byId)&&!isDecorative(img));
      for(const img of aliasCandidates){setToken(img,'data-native-edit-ids',f.id);setToken(img,'data-native-media-proxy',f.id);img.setAttribute('data-dini-media-alias-for',f.id);aliases++;targets.push(img)}

      for(const img of targets){
        if(current)setImageValue(img,current);
        const a=img.closest?.('a[href]');if(a&&refs.some(r=>sameRef(a.getAttribute('href')||'',r)))a.setAttribute('href',current||'#');
        const picture=img.closest?.('picture');if(picture)for(const s of picture.querySelectorAll('source'))if(refs.some(r=>sameRef(s.getAttribute('srcset')||'',r)))s.setAttribute('srcset',current||'');
      }
      for(const n of doc.querySelectorAll('[style*="background"],[data-thumbnail],[data-thumb]')){
        if(ownedByOtherImage(n,f,byId)||!nodeMatches(n,refs))continue;n.setAttribute('data-dini-media-alias-for',f.id);if(replaceInlineRef(n,refs,current))aliases++;
      }
      fieldsFixed++;
    }

    doc.documentElement.setAttribute('data-dini-media-source-parity',VERSION);
    return {html:'<!doctype html>\n'+doc.documentElement.outerHTML,schema,values,report:{version:VERSION,fields_fixed:fieldsFixed,aliases,containers_detached:containersDetached,decorative_recovered:decorativeRecovered}};
  }
  function augmentSnapshot(input){const snap=deep(input||{});if(!snap?.schema||!(snap.html||snap.baseHtml))return snap;const out=augment(snap.html||snap.baseHtml||'',snap.schema,snap.values||{});snap.html=out.html;snap.baseHtml=out.html;snap.schema=out.schema;snap.values=out.values;snap.media_source_parity=out.report;return snap}

  function patchCanonical(){
    const C=window.DINI_TEMPLATE_CANONICAL_V1160;if(!C||C.__diniMediaSourceParityV1)return;const base=C.resolveSnapshot?.bind(C);if(typeof base!=='function')return;
    C.resolveSnapshot=input=>base(augmentSnapshot(input));C.augmentMediaSourceSnapshot=augmentSnapshot;C.__diniMediaSourceParityV1=VERSION;document.documentElement.dataset.mediaSourceCanonical=VERSION;
  }
  function patchFetch(){
    const E=window.DINI_FETCH_V2;if(!E||E.__diniMediaSourceParityV1)return;const baseLoad=E.loadOrCreateSession.bind(E),baseSave=E.saveSession.bind(E);const sourceBaseline=new WeakMap();
    E.loadOrCreateSession=async h=>{const session=await baseLoad(h);if(!session?.baseline)return session;const original=deep(session.baseline);sourceBaseline.set(session,original);if(!session.__diniSocialSourceBaseline&&!session.__diniMediaSourceBaseline){try{Object.defineProperty(session,'__diniMediaSourceBaseline',{value:original,writable:false,configurable:true,enumerable:false})}catch{}}const out=augment(session.baseline.html||'',session.baseline.schema||{},session.baseline.values||{});session.baseline.html=out.html;session.baseline.schema=out.schema;session.baseline.values=out.values;session.baseline.hash=E.baselineHash(out.html,out.schema);session.baseline.field_count=out.schema.fields.length;session.baseline.media_source_parity=out.report;return session};
    E.saveSession=async session=>{if(session?.__diniSocialSourceBaseline)return baseSave(session);const original=session?.__diniMediaSourceBaseline||sourceBaseline.get(session);if(!original)return baseSave(session);const persist=deep(session);persist.baseline=deep(original);const saved=await baseSave(persist);session.updated_at=saved?.updated_at||session.updated_at;return session};
    E.augmentMediaSourceSnapshot=augmentSnapshot;E.__diniMediaSourceParityV1=VERSION;document.documentElement.dataset.mediaSourceFetch=VERSION;
  }
  function syncFrameAliases(frame){
    if(!frame)return;const esc=v=>window.CSS?.escape?CSS.escape(String(v||'')):String(v||'').replace(/["\\]/g,'\\$&');
    const install=()=>{let doc;try{doc=frame.contentDocument}catch{return}if(!doc)return;const sync=id=>{if(!id)return;const owner=doc.querySelector(`[data-dini-media-owner="${esc(id)}"]`);if(!owner)return;const value=String(owner.getAttribute('src')||owner.getAttribute('data-src')||'');if(!value)return;for(const n of doc.querySelectorAll(`[data-dini-media-alias-for~="${esc(id)}"]`)){if(n.matches('img'))setImageValue(n,value);else if(n.matches('a[href]'))n.setAttribute('href',value)}};const mo=new MutationObserver(ms=>{for(const m of ms){const t=m.target;if(t?.nodeType!==1)continue;const id=t.getAttribute('data-dini-media-owner');if(id)sync(id)}});mo.observe(doc.documentElement,{subtree:true,attributes:true,attributeFilter:['src','data-src']})};
    frame.addEventListener('load',install);setTimeout(install,0);
  }

  patchCanonical();patchFetch();syncFrameAliases(document.getElementById('previewFrame'));
  window.DINI_MEDIA_SOURCE_PARITY_V1={VERSION,augment,augmentSnapshot,patchCanonical,patchFetch};
})();