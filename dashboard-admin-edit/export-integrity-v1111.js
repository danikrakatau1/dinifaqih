(async()=>{
  'use strict';
  try{
    const r=await fetch('./export-integrity-v1110.js?v=1110',{cache:'no-store'});
    if(!r.ok)throw new Error('export v1110 HTTP '+r.status);
    let src=await r.text();

    const old=`    // Exact Clean Preview text wins, including emoji and inline markup.\n    for(const f of snap.schema?.fields||[]){\n      if(f.kind!=='text')continue;\n      const state=textState(liveDoc,f);if(!state)continue;\n      applyTextState(doc,f,state);\n      textLocks.push({id:f.id,node_id:f.node_id||'',mode:state.mode,value:state.value});\n    }`;
    const replacement=`    // V1.11.1: the APPLY snapshot is the canonical text authority.\n    // Clean Preview runtime is allowed to animate, but it must never erase/replace the value\n    // the user actually applied. Encode as HTML text so emoji and special characters survive.\n    const encodeText=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');\n    for(const f of snap.schema?.fields||[]){\n      if(f.kind!=='text')continue;\n      const value=String(snap.values?.[f.id]??f.value??'');\n      const state={mode:'html',value:encodeText(value)};\n      applyTextState(doc,f,state);\n      textLocks.push({id:f.id,node_id:f.node_id||'',mode:state.mode,value:state.value});\n    }`;
    if(!src.includes(old))throw new Error('Anchor text authority V1.11.0 tidak ditemukan');
    src=src.replace(old,replacement);
    src=src.replaceAll('1.11.0','1.11.1').replaceAll('__diniIntegrity1110','__diniIntegrity1111').replaceAll('v1110','v1111').replaceAll('V1110','V1111');
    (0,eval)(src+'\n//# sourceURL=export-integrity-v1111-inner.js');
  }catch(err){
    console.error('EXPORT_INTEGRITY_V1111',err);
    const st=document.getElementById('sweepStatus');if(st)st.textContent='EXPORT V1.11.1 ERROR: '+(err.message||err);
  }
})();
