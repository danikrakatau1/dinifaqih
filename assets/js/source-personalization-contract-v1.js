(function(g){
  'use strict';
  if(g.DINI_SOURCE_PERSONALIZATION_CONTRACT_V1?.version)return;

  const VERSION='1.1.0';
  const VR=g.DiniVisualResolver;
  const Core=g.DINI_GUEST_CONTRACT_CORE_V1;
  if(!VR||typeof VR.makeSourceGraph!=='function'||!Core?.scanDocument){
    console.warn('[DINI PERSONALIZATION CONTRACT] dependency belum tersedia.');
    return;
  }

  const previousMakeSourceGraph=VR.makeSourceGraph.bind(VR);
  function augmentGraph(doc,graph){
    const out=graph||{};
    const prior=out.personalization||{};
    out.personalization=Core.scanDocument(doc,prior,{mark:true,allowSemanticSynthesis:true});
    out.authority={
      ...(out.authority||{}),
      personalization_truth:'global-guest-contract',
      personalization_runtime:'role-aware-text-or-value',
      personalization_contract_version:Core.contract_version||1,
      personalization_cover_synthesis:'strong-source-structure-only'
    };
    out.diagnostics={
      ...(out.diagnostics||{}),
      personalization_fields:out.personalization.fields?.length||0,
      personalization_candidates:out.personalization.candidates?.length||0,
      personalization_roles:out.personalization.roles||[],
      personalization_synthetic_cover_slots:(out.personalization.fields||[]).filter(f=>f?.semantic_synthesis&&f?.role==='cover').length
    };
    return out;
  }

  VR.makeSourceGraph=function(doc,opts={}){
    const graph=previousMakeSourceGraph(doc,opts);
    try{return augmentGraph(doc,graph)}catch(err){
      console.warn('[DINI PERSONALIZATION CONTRACT] augment gagal; graph lama dipertahankan.',err);
      return graph;
    }
  };

  g.DINI_SOURCE_PERSONALIZATION_CONTRACT_V1={version:VERSION,augmentGraph};
  console.info('[DINI PERSONALIZATION CONTRACT] V'+VERSION+' aktif — multi-slot + strong cover synthesis.');
})(window);
