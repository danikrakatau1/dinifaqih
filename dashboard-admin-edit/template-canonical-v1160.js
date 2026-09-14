(()=>{
  'use strict';
  if(window.DINI_TEMPLATE_CANONICAL_V1160)return;
  const VERSION='1.16.6';
  const deep=v=>JSON.parse(JSON.stringify(v??null));
  const esc=v=>(window.CSS?.escape?CSS.escape(String(v||'')):String(v||'').replace(/["\\]/g,'\\$&'));
  const str=v=>String(v??'').trim();
  const norm=v=>String(v??'').replace(/\s+/g,' ').trim();
  const current=(values,f)=>str(values?.[f.id] ?? f.value ?? '');
  const original=f=>str(f?.value ?? f?.source_url ?? '');
  const changed=(values,f)=>{const v=current(values,f),o=original(f);return !!v && !!o && v!==o};
  const mediaKinds=new Set(['image','background','video','audio']);
  const localish=v=>/^(?:assets\/|blob:|data:)/i.test(str(v))||/\/revisions\//i.test(str(v));
  const TEXT_SEL='h1,h2,h3,h4,h5,h6,p,span,a,label,button,strong,em,small,li,td,th,input,textarea,select';

  const score=(values,f)=>{
    const v=current(values,f);let s=0;
    if(changed(values,f))s+=1000;
    if(localish(v))s+=250;
    if(/^s\d+-/i.test(f.id||''))s+=30;
    if(f.source_location==='external-css')s+=20;
    if(f.source_location==='inline-style')s+=10;
    return s;
  };

  function chooseWinner(fields,values){
    const ranked=(fields||[]).map(f=>({f,v:current(values,f),s:score(values,f)})).filter(x=>x.v).sort((a,b)=>b.s-a.s);
    if(!ranked.length)return null;
    const changedRows=ranked.filter(x=>changed(values,x.f));
    return (changedRows[0]||ranked[0])?.v||null;
  }

  function resolveValues(schema={},inputValues={}){
    const fields=Array.isArray(schema.fields)?schema.fields:[];
    const values={...deep(inputValues||{})};
    const diagnostics={version:VERSION,node_alias_groups:0,slideshow_alias_groups:0,propagated_fields:0};

    const nodeGroups=new Map();
    for(const f of fields){
      if(!mediaKinds.has(f.kind)||!f.node_id)continue;
      const layer=Number.isFinite(Number(f.background_layer))?Number(f.background_layer):0;
      const role=str(f.media_role||f.kind);
      const key=`${f.kind}|${f.node_id}|${role}|${layer}`;
      if(!nodeGroups.has(key))nodeGroups.set(key,[]);nodeGroups.get(key).push(f);
    }
    for(const group of nodeGroups.values()){
      if(group.length<2||!group.some(f=>changed(values,f)))continue;
      const winner=chooseWinner(group,values);if(!winner)continue;
      diagnostics.node_alias_groups++;
      for(const f of group){if(current(values,f)!==winner){values[f.id]=winner;diagnostics.propagated_fields++}}
    }

    const slideCandidates=fields.filter(f=>f.kind==='background'&&(f.media_role==='slideshow'||/^css-background-cssbg-/i.test(f.id||'')));
    const slideGroups=new Map();
    for(const f of slideCandidates){
      const base=original(f);if(!base)continue;
      const key=`${Number(f.section_index)}|${base}`;
      if(!slideGroups.has(key))slideGroups.set(key,[]);slideGroups.get(key).push(f);
    }
    for(const group of slideGroups.values()){
      if(group.length<2||!group.some(f=>changed(values,f)))continue;
      const winner=chooseWinner(group,values);if(!winner)continue;
      diagnostics.slideshow_alias_groups++;
      for(const f of group){if(current(values,f)!==winner){values[f.id]=winner;diagnostics.propagated_fields++}}
    }
    return {values,diagnostics};
  }

  function replaceDeep(v,oldValue,newValue){
    if(!oldValue||oldValue===newValue)return v;
    if(typeof v==='string')return v.includes(oldValue)?v.split(oldValue).join(newValue):v;
    if(Array.isArray(v))return v.map(x=>replaceDeep(x,oldValue,newValue));
    if(v&&typeof v==='object')for(const k of Object.keys(v))v[k]=replaceDeep(v[k],oldValue,newValue);
    return v;
  }

  function nodesFor(doc,f){
    const out=[],seen=new Set(),add=n=>{if(n&&!seen.has(n)){seen.add(n);out.push(n)}};
    if(f.node_id)add(doc.querySelector(`[data-native-node-id="${esc(f.node_id)}"]`));
    doc.querySelectorAll('[data-native-edit-id],[data-native-edit-ids]').forEach(n=>{
      const one=n.getAttribute('data-native-edit-id')||'';
      const many=(n.getAttribute('data-native-edit-ids')||'').split(/[\s,]+/).filter(Boolean);
      if(one===f.id||many.includes(f.id))add(n);
    });
    if(f.source_element_id){
      const host=doc.querySelector(`[data-id="${esc(f.source_element_id)}"]`);
      if(f.media_role==='css-overlay')add(host?.querySelector('.elementor-background-overlay'));
      else if(!out.length)add(host);
    }
    return out.filter(Boolean);
  }

  function textOf(n){return n?.matches?.('input,textarea,select')?String(n.value??''):String(n?.textContent??'')}
  function markedLeaf(root,id){
    if(!root||!id)return null;
    try{
      if(root.matches?.(`[data-native-edit-id="${esc(id)}"]`))return root;
      const exact=root.querySelector?.(`[data-native-edit-id="${esc(id)}"]`);if(exact)return exact;
      return [...(root.querySelectorAll?.('[data-native-edit-ids]')||[])].find(n=>(n.getAttribute('data-native-edit-ids')||'').split(/[\s,]+/).filter(Boolean).includes(id))||null;
    }catch{return null}
  }
  function textLeaves(root){
    if(!root)return[];
    const all=[...root.querySelectorAll?.(TEXT_SEL)||[]];
    const leaves=all.filter(n=>![...n.children||[]].some(c=>c.matches?.(TEXT_SEL)&&norm(textOf(c))));
    return leaves.length?leaves:all;
  }
  function chooseTextLeaf(root,f,value){
    if(!root)return null;
    const marked=markedLeaf(root,f.id);if(marked)return marked;
    if(root.matches?.('input,textarea,select'))return root;
    const heading=[...root.querySelectorAll?.('.elementor-heading-title')||[]];if(heading.length===1)return heading[0];
    const form=root.querySelector?.('input,textarea,select');if(form)return form;
    const list=textLeaves(root),want=norm(value),old=norm(f?.source_text??f?.value??'');
    let hit=list.find(n=>want&&norm(textOf(n))===want);if(hit)return hit;
    hit=list.find(n=>old&&norm(textOf(n))===old);if(hit)return hit;
    return list.length===1?list[0]:(root.matches?.(TEXT_SEL)?root:null);
  }
  function mobileNone(host){
    if(!host)return false;
    if(String(host.getAttribute('data-native-animation-mobile')||'').toLowerCase()==='none')return true;
    try{return String(JSON.parse(host.getAttribute('data-settings')||'{}')?._animation_mobile||'').toLowerCase()==='none'}catch{return false}
  }
  function revealTextChain(doc,leaf,f){
    let host=f.source_element_id?doc.querySelector(`[data-id="${esc(f.source_element_id)}"]`):null;
    host=host||leaf?.closest?.('[data-id]')||leaf;
    if(!host)return;
    const locked=String(f.text_leaf_locked||'');
    const exact=String(f.source_element_id||'')==='43f80b1b';
    const should=exact||locked.startsWith('1.23')||locked.startsWith('1.24')||host.hasAttribute?.('data-dini-visibility-parity')||host.hasAttribute?.('data-clean-visibility-chain')||mobileNone(host);
    if(!should)return;
    let p=host,depth=0;
    while(p&&p.nodeType===1&&depth++<32){
      p.classList?.remove('elementor-invisible');
      p.hidden=false;p.removeAttribute?.('hidden');p.removeAttribute?.('aria-hidden');
      if(String(p.style?.getPropertyValue('display')||'').toLowerCase()==='none')p.style.removeProperty('display');
      p.style?.setProperty('visibility','visible','important');
      p.style?.setProperty('opacity','1','important');
      p.setAttribute?.('data-canonical-text-visible',VERSION);
      if(p.tagName==='BODY'||p.tagName==='HTML')break;
      p=p.parentElement;
    }
  }

  function setBackground(node,value){
    if(!node)return;const want=value?`url("${String(value).replaceAll('"','%22')}")`:'none';
    node.style.setProperty('background-image',want,'important');
    if(value){node.setAttribute('data-thumbnail',value);node.setAttribute('data-native-true-replace','canonical-v1160')}
    else node.removeAttribute('data-thumbnail');
    const slide=node.matches?.('[data-native-slide-bg]')?node:node.querySelector?.('[data-native-slide-bg]');
    if(slide)slide.style.setProperty('background-image',want,'important');
  }

  function syncSettings(node,oldValue,newValue){
    const host=node?.closest?.('[data-settings]');if(!host)return;
    let cfg;try{cfg=JSON.parse(host.getAttribute('data-settings')||'{}')}catch{return}
    replaceDeep(cfg,oldValue,newValue);host.setAttribute('data-settings',JSON.stringify(cfg));
  }

  function applyHtml(html,schema={},values={}){
    const doc=new DOMParser().parseFromString(String(html||''),'text/html');
    const fields=Array.isArray(schema.fields)?schema.fields:[];
    for(const f of fields){
      const value=current(values,f),old=original(f),nodes=nodesFor(doc,f);
      if(f.kind==='text'){
        for(const n of nodes){
          const leaf=chooseTextLeaf(n,f,value)||n;
          if(leaf.matches?.('input,textarea,select')){leaf.value=value;leaf.setAttribute('value',value)}else leaf.textContent=value;
          leaf.setAttribute('data-template-canonical-text',VERSION);
          revealTextChain(doc,leaf,f);
        }
      }else if(f.kind==='url'){
        for(const n of nodes)if(n.matches?.('a,[href]'))n.setAttribute('href',value);
      }else if(f.kind==='image'){
        for(const n of nodes){const imgs=n.tagName==='IMG'?[n]:[...n.querySelectorAll?.('img')||[]];for(const img of imgs){if(value){img.setAttribute('src',value);img.setAttribute('data-src',value)}else{img.removeAttribute('src');img.removeAttribute('data-src')}img.removeAttribute('srcset');img.removeAttribute('data-srcset')}}
      }else if(f.kind==='background'){
        for(const n of nodes){setBackground(n,value);syncSettings(n,old,value)}
      }else if(f.kind==='audio'||f.kind==='video'){
        for(const n of nodes){const media=n.matches?.('audio,video,source')?[n]:[...n.querySelectorAll?.('audio,video,source')||[]];for(const m of media){if(value)m.setAttribute('src',value);else m.removeAttribute('src')}}
      }
    }

    const sections=Array.isArray(schema.sections)?schema.sections:[];
    for(let si=0;si<sections.length;si++){
      const related=fields.filter(f=>Number(f.section_index)===si&&f.kind==='background'&&(f.media_role==='slideshow'||/^css-background-cssbg-/i.test(f.id||'')));
      if(!related.length)continue;
      const edited=related.filter(f=>changed(values,f));if(!edited.length)continue;
      const value=chooseWinner(related,values);if(!value)continue;
      const sid=sections[si]?.id||'';
      const sec=sid?doc.querySelector(`[data-id="${esc(sid)}"]`):null;if(!sec)continue;
      const host=sec.querySelector('[data-native-slideshow-host="1"],[data-settings*="slideshow"]');
      if(host){
        let cfg;try{cfg=JSON.parse(host.getAttribute('data-settings')||'{}')}catch{cfg=null}
        if(cfg){
          if(Array.isArray(cfg.background_slideshow_gallery))for(const item of cfg.background_slideshow_gallery){if(typeof item==='string'){}else if(item&&typeof item==='object')item.url=value}
          host.setAttribute('data-settings',JSON.stringify(cfg));
        }
      }
      const runtime=sec.querySelector('[data-native-slideshow-urls]');
      if(runtime)runtime.setAttribute('data-native-slideshow-urls',JSON.stringify([value]));
      sec.querySelectorAll('[data-native-slide-bg],.swiper-slide-bg').forEach(n=>setBackground(n,value));
    }

    doc.documentElement.setAttribute('data-template-canonical',VERSION);
    return '<!doctype html>\n'+doc.documentElement.outerHTML;
  }

  function recoverExactTextParity(snapshot,values){
    const fields=Array.isArray(snapshot?.schema?.fields)?snapshot.schema.fields:[];
    const details=Array.isArray(snapshot?.text_parity?.details)?snapshot.text_parity.details:[];
    if(!details.length)return values;
    const out={...values};
    for(const f of fields){
      if(f?.kind!=='text'||String(f.source_element_id||'')!=='43f80b1b')continue;
      const d=details.find(x=>x?.id===f.id);
      if(d&&typeof d.value==='string'&&d.value.trim())out[f.id]=d.value;
    }
    return out;
  }

  function resolveSnapshot(snapshot){
    const snap=deep(snapshot||{});if(!snap?.schema||!Array.isArray(snap.schema.fields))return snap;
    const input=recoverExactTextParity(snap,snap.values||{});
    const r=resolveValues(snap.schema,input);snap.values=r.values;
    snap.html=applyHtml(snap.html||snap.baseHtml||'',snap.schema,snap.values);
    snap.baseHtml=snap.html;
    snap.canonicalization={...(snap.canonicalization||{}),...r.diagnostics,version:VERSION,canonicalized_at:new Date().toISOString(),text_visibility_materialized:true};
    return snap;
  }

  window.DINI_TEMPLATE_CANONICAL_V1160={VERSION,resolveValues,applyHtml,resolveSnapshot};
})();
