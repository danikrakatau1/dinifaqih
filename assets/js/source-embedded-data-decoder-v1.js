(function(g){
  'use strict';
  if(g.DiniEmbeddedDataDecoder?.version)return;

  const VERSION='1.0.0';
  const MAX_RESOURCE_BYTES=1500000;
  const MAX_TOTAL_BYTES=4000000;
  const JS_TYPES=new Set(['text/javascript','application/javascript','application/x-javascript','text/ecmascript','application/ecmascript']);
  const CSS_TYPES=new Set(['text/css']);

  const hash=s=>{let h=2166136261;for(const c of String(s??'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')};
  const byteLength=s=>{try{return new TextEncoder().encode(String(s??'')).length}catch{return String(s??'').length}};
  const safeDecodeURIComponent=s=>{try{return decodeURIComponent(String(s??''))}catch{return String(s??'')}};
  const decodeBase64=s=>{
    const raw=atob(String(s||'').replace(/\s+/g,''));
    const bytes=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
    try{return new TextDecoder('utf-8',{fatal:false}).decode(bytes)}catch{
      let out='';for(let i=0;i<bytes.length;i++)out+=String.fromCharCode(bytes[i]);return out;
    }
  };
  const kindFor=mime=>CSS_TYPES.has(mime)?'css':JS_TYPES.has(mime)?'javascript':'';

  function parseDataUri(uri){
    const raw=String(uri||'').trim();
    if(!/^data:/i.test(raw))return null;
    const comma=raw.indexOf(',');
    if(comma<5)return null;
    const meta=raw.slice(5,comma);
    const payload=raw.slice(comma+1);
    const parts=meta.split(';').map(x=>x.trim()).filter(Boolean);
    const mime=(parts[0]&&!parts[0].includes('=')?parts.shift():'text/plain').toLowerCase();
    const base64=parts.some(x=>x.toLowerCase()==='base64');
    const kind=kindFor(mime);
    if(!kind)return null;
    let text='';
    try{text=base64?decodeBase64(payload):safeDecodeURIComponent(payload)}catch(err){
      return {ok:false,kind,mime,encoding:base64?'base64':'url',error:String(err?.message||err),bytes:0,text:''};
    }
    const bytes=byteLength(text);
    if(bytes>MAX_RESOURCE_BYTES)return {ok:false,kind,mime,encoding:base64?'base64':'url',error:'embedded-resource-too-large',bytes,text:''};
    return {ok:true,kind,mime,encoding:base64?'base64':'url',bytes,text,hash:hash(text)};
  }

  function importMatches(text){
    const src=String(text||'');
    const out=[];
    const quoted=/@import\s+(?:url\(\s*)?(['"])(data:[\s\S]*?)\1\s*\)?\s*([^;]*);/ig;
    let m;
    while((m=quoted.exec(src))){
      const parsed=parseDataUri(m[2]);
      if(parsed?.kind==='css')out.push({full:m[0],uri:m[2],media:String(m[3]||'').trim(),index:m.index,parsed});
      if(out.length>=100)break;
    }
    const bare=/@import\s+url\(\s*(data:[^)]+)\s*\)\s*([^;]*);/ig;
    while((m=bare.exec(src))){
      if(out.some(x=>x.index===m.index))continue;
      const parsed=parseDataUri(m[1]);
      if(parsed?.kind==='css')out.push({full:m[0],uri:m[1],media:String(m[2]||'').trim(),index:m.index,parsed});
      if(out.length>=100)break;
    }
    return out.sort((a,b)=>a.index-b.index);
  }

  function recordFromParsed(parsed,meta={}){
    return {
      id:'embedded-'+hash([parsed.kind,parsed.hash||'',meta.source||'',meta.index??''].join('|')),
      kind:parsed.kind,
      mime:parsed.mime,
      encoding:parsed.encoding,
      bytes:parsed.bytes||0,
      hash:parsed.hash||'',
      ok:parsed.ok===true,
      error:parsed.error||'',
      source:meta.source||'',
      attribute:meta.attribute||'',
      index:meta.index??null,
      media:meta.media||'',
      text:parsed.text||''
    };
  }

  function scanDocument(doc,{baseUrl=''}={}){
    const resources=[];
    let total=0,truncated=false;
    const add=(parsed,meta)=>{
      if(!parsed)return;
      if(total+Number(parsed.bytes||0)>MAX_TOTAL_BYTES){truncated=true;return}
      const rec=recordFromParsed(parsed,meta);resources.push(rec);total+=rec.bytes;
    };

    [...doc.querySelectorAll('script[src]')].forEach((el,index)=>{
      const src=String(el.getAttribute('src')||'');
      const parsed=parseDataUri(src);
      if(parsed?.kind==='javascript')add(parsed,{source:'script-src',attribute:'src',index});
    });
    [...doc.querySelectorAll('link[rel~="stylesheet"][href]')].forEach((el,index)=>{
      const href=String(el.getAttribute('href')||'');
      const parsed=parseDataUri(href);
      if(parsed?.kind==='css')add(parsed,{source:'link-href',attribute:'href',index,media:el.getAttribute('media')||''});
    });
    [...doc.querySelectorAll('style')].forEach((el,index)=>{
      for(const imp of importMatches(el.textContent||''))add(imp.parsed,{source:'style-import',attribute:'textContent',index,media:imp.media});
    });

    // Materialized records remain discoverable after src/@import has been neutralized.
    [...doc.querySelectorAll('script[data-dini-decoded-source-js]')].forEach((el,index)=>{
      const text=String(el.textContent||'');if(!text)return;
      const parsed={ok:true,kind:'javascript',mime:el.getAttribute('data-dini-embedded-mime')||'text/javascript',encoding:el.getAttribute('data-dini-embedded-encoding')||'decoded',bytes:byteLength(text),text,hash:hash(text)};
      const key=parsed.hash;
      if(!resources.some(x=>x.kind==='javascript'&&x.hash===key))add(parsed,{source:'materialized-script',attribute:'textContent',index});
    });
    [...doc.querySelectorAll('style[data-dini-decoded-source-css]')].forEach((el,index)=>{
      const text=String(el.textContent||'');if(!text)return;
      const parsed={ok:true,kind:'css',mime:'text/css',encoding:'decoded',bytes:byteLength(text),text,hash:hash(text)};
      const key=parsed.hash;
      if(!resources.some(x=>x.kind==='css'&&x.hash===key))add(parsed,{source:'materialized-style',attribute:'textContent',index,media:el.getAttribute('media')||''});
    });

    return {
      version:1,
      decoder:'dini-embedded-data-decoder-v'+VERSION,
      base_url:baseUrl||'',
      resources,
      counts:{
        total:resources.length,
        css:resources.filter(x=>x.kind==='css').length,
        javascript:resources.filter(x=>x.kind==='javascript').length,
        decoded:resources.filter(x=>x.ok).length,
        failed:resources.filter(x=>!x.ok).length,
        bytes:resources.reduce((n,x)=>n+Number(x.bytes||0),0)
      },
      truncated,
      policy:{execute_arbitrary_source_js:false,css_materialization:'same-document-cascade',javascript_materialization:'inert-evidence-only'}
    };
  }

  function summary(scan){
    const s=scan||{resources:[],counts:{}};
    return {
      version:s.version||1,
      decoder:s.decoder||('dini-embedded-data-decoder-v'+VERSION),
      base_url:s.base_url||'',
      counts:{...(s.counts||{})},
      truncated:!!s.truncated,
      resources:(s.resources||[]).map(({text,...meta})=>meta),
      policy:{...(s.policy||{})}
    };
  }

  function materializeDocument(doc,{baseUrl=''}={}){
    if(!doc?.querySelectorAll)return {version:1,changed:false,counts:{css:0,javascript:0,total:0,bytes:0}};
    let css=0,javascript=0,bytes=0;

    [...doc.querySelectorAll('script[src]')].forEach(el=>{
      const raw=String(el.getAttribute('src')||'');
      const parsed=parseDataUri(raw);
      if(!parsed?.ok||parsed.kind!=='javascript')return;
      el.removeAttribute('src');
      el.removeAttribute('integrity');
      el.setAttribute('type','application/x-dini-source-evidence');
      el.setAttribute('data-dini-decoded-source-js',VERSION);
      el.setAttribute('data-dini-embedded-mime',parsed.mime);
      el.setAttribute('data-dini-embedded-encoding',parsed.encoding);
      el.setAttribute('data-dini-embedded-hash',parsed.hash);
      el.setAttribute('data-dini-source-js-inert','true');
      el.textContent=parsed.text;
      javascript++;bytes+=parsed.bytes;
    });

    [...doc.querySelectorAll('link[rel~="stylesheet"][href]')].forEach(el=>{
      const raw=String(el.getAttribute('href')||'');
      const parsed=parseDataUri(raw);
      if(!parsed?.ok||parsed.kind!=='css')return;
      const style=doc.createElement('style');
      style.setAttribute('data-dini-decoded-source-css',VERSION);
      style.setAttribute('data-dini-embedded-mime',parsed.mime);
      style.setAttribute('data-dini-embedded-encoding',parsed.encoding);
      style.setAttribute('data-dini-embedded-hash',parsed.hash);
      const media=el.getAttribute('media');if(media)style.setAttribute('media',media);
      style.textContent=parsed.text;
      el.replaceWith(style);
      css++;bytes+=parsed.bytes;
    });

    [...doc.querySelectorAll('style')].forEach(el=>{
      if(el.hasAttribute('data-dini-decoded-source-css'))return;
      const imports=importMatches(el.textContent||'');
      if(!imports.length)return;
      let text=String(el.textContent||'');
      let changed=false;
      for(const imp of imports){
        const p=imp.parsed;if(!p?.ok)continue;
        const body=imp.media?('@media '+imp.media+'{\n'+p.text+'\n}'):p.text;
        text=text.replace(imp.full,'/* Dini decoded embedded CSS '+p.hash+' */\n'+body);
        css++;bytes+=p.bytes;changed=true;
      }
      if(changed){
        el.textContent=text;
        el.setAttribute('data-dini-decoded-source-css',VERSION);
        el.setAttribute('data-dini-embedded-origin','style-import');
      }
    });

    const scan=scanDocument(doc,{baseUrl});
    return {version:1,decoder:'dini-embedded-data-decoder-v'+VERSION,changed:(css+javascript)>0,counts:{css,javascript,total:css+javascript,bytes},scan:summary(scan)};
  }

  g.DiniEmbeddedDataDecoder={version:VERSION,parseDataUri,scanDocument,summary,materializeDocument,importMatches};
  console.info('[DINI EMBEDDED DATA] V'+VERSION+' aktif — Base64/data CSS decoded, source JS inert + semantic-evidence only.');
})(window);
