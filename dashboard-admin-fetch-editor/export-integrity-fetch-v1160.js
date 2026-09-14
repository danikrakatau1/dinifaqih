(async()=>{
  'use strict';
  try{
    const r=await fetch('/dashboard-admin-edit/export-integrity-v1110.js?v=1110',{cache:'no-store'});
    if(!r.ok)throw new Error('export v1110 HTTP '+r.status);
    let src=await r.text();
    const old=`    // Exact Clean Preview text wins, including emoji and inline markup.\n    for(const f of snap.schema?.fields||[]){\n      if(f.kind!=='text')continue;\n      const state=textState(liveDoc,f);if(!state)continue;\n      applyTextState(doc,f,state);\n      textLocks.push({id:f.id,node_id:f.node_id||'',mode:state.mode,value:state.value});\n    }`;
    const replacement=`    // Fetch V1.16: APPLY snapshot is canonical text authority.\n    const encodeText=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');\n    for(const f of snap.schema?.fields||[]){\n      if(f.kind!=='text')continue;\n      const value=String(snap.values?.[f.id]??f.value??'');\n      const state={mode:'html',value:encodeText(value)};\n      applyTextState(doc,f,state);\n      textLocks.push({id:f.id,node_id:f.node_id||'',mode:state.mode,value:state.value});\n    }`;
    if(!src.includes(old))throw new Error('Anchor export text authority V1.11.0 tidak ditemukan');
    src=src.replace(old,replacement);
    src=src.replaceAll('1.11.0','1.16.0-fetch').replaceAll('__diniIntegrity1110','__diniIntegrityFetch1160').replaceAll('v1110','v1160-fetch').replaceAll('V1110','V1160_FETCH');
    (0,eval)(src+'\n//# sourceURL=export-integrity-fetch-v1160-inner.js');
    const st=document.getElementById('sweepStatus');if(st&&!/ERROR/i.test(st.textContent||''))st.textContent='EXPORT FETCH V1.16 READY';
  }catch(err){
    console.error('EXPORT_INTEGRITY_FETCH_V1160',err);
    const st=document.getElementById('sweepStatus');if(st)st.textContent='EXPORT FETCH V1.16 ERROR: '+(err.message||err);
  }
})();
