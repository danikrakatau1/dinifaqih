(function(g){
  'use strict';
  if(g.DiniSourceRuntimeAuthority?.version)return;
  const VERSION='1.0.0';
  const VR=g.DiniVisualResolver;
  const C=g.DiniSourceRuntimeCompiler;
  if(!VR?.sanitizeRuntimeNoise||!C?.graphByDoc){
    console.warn('[DINI SOURCE AUTHORITY] Runtime compiler belum tersedia.');
    return;
  }

  const authorityByDoc=new WeakMap();
  const originalSanitize=VR.sanitizeRuntimeNoise.bind(VR);
  const clone=value=>{
    try{return JSON.parse(JSON.stringify(value||{}))}catch{return value||{}}
  };

  function normalizeGraph(graph){
    const out=clone(graph);
    if(!Number(out.source_truth_version))out.source_truth_version=1;
    out.authority={
      ...(out.authority||{}),
      editor_rule:'consume-do-not-reinterpret',
      lifecycle_rule:'capture-before-sanitize-consume-downstream'
    };
    out.runtime_policy={
      ...(out.runtime_policy||{}),
      source_delay_authoritative:true,
      synthetic_stagger:false,
      source_transform_authoritative:true,
      editor_pause_non_destructive:true,
      execute_arbitrary_source_js:false
    };
    return out;
  }

  function bindSourceTruth(doc,graph){
    if(!doc||!graph)return null;
    const authoritative=normalizeGraph(graph);
    authorityByDoc.set(doc,authoritative);
    C.graphByDoc.set(doc,authoritative);
    return authoritative;
  }

  function ensureRuntimeOrder(doc,graph){
    if(!doc?.body||!graph?.source_truth_version)return;
    let tpl=doc.querySelector('template[data-dini-source-truth]');
    if(!tpl){
      tpl=doc.createElement('template');
      tpl.setAttribute('data-dini-source-truth','1');
    }
    tpl.textContent=JSON.stringify(graph);
    // Move Source Truth to the end first. The safe runtime must parse after it exists.
    doc.body.appendChild(tpl);

    // Legacy/source runtime may already exist before compiler append interceptors were installed.
    // Remove it and append a fresh marker after Source Truth; the compiler interceptor rewrites
    // the new node to the safe runtime without executing arbitrary source JavaScript.
    for(const old of [...doc.querySelectorAll('script[data-dini-source-native-runtime]')])old.remove();
    const runtime=doc.createElement('script');
    runtime.setAttribute('data-dini-source-native-runtime','source-truth-v1');
    runtime.setAttribute('data-dini-runtime-authority',VERSION);
    doc.body.appendChild(runtime);
  }

  VR.sanitizeRuntimeNoise=function(doc){
    const bound=authorityByDoc.get(doc);
    if(bound)C.graphByDoc.set(doc,bound);
    const result=originalSanitize(doc);
    try{
      const graph=authorityByDoc.get(doc)||C.graphByDoc.get(doc);
      if(graph?.source_truth_version)ensureRuntimeOrder(doc,graph);
    }catch(err){
      console.warn('[DINI SOURCE AUTHORITY] runtime ordering gagal; baseline tidak diubah paksa',err);
    }
    return result;
  };

  g.DiniSourceRuntimeAuthority={
    version:VERSION,
    bindSourceTruth,
    getSourceTruth:doc=>authorityByDoc.get(doc)||C.graphByDoc.get(doc)||null
  };
  console.info('[DINI SOURCE AUTHORITY] V'+VERSION+' aktif — pre-sanitize truth menjadi authority downstream.');
})(window);
