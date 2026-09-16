(()=>{
  'use strict';
  if(window.__DINI_LEGACY_PARITY_GATE_V1__)return;
  window.__DINI_LEGACY_PARITY_GATE_V1__=true;

  const VERSION='1.0.0';
  const deep=v=>{try{return JSON.parse(JSON.stringify(v??null))}catch{return v}};
  const sourceTruthVersion=snap=>Number(
    snap?.manifest?.source_graph?.source_truth_version ??
    snap?.manifest?.source_truth_package_version ??
    snap?.source_graph?.source_truth_version ??
    snap?.source_truth_version ?? 0
  )||0;
  const isSourceTruth=snap=>sourceTruthVersion(snap)>=1;
  const state={version:VERSION,finalized:false,template_path:'pending',fetch_path:'pending'};

  const cleanCanonical=window.DINI_TEMPLATE_CANONICAL_V1160?.resolveSnapshot?.bind(window.DINI_TEMPLATE_CANONICAL_V1160)||null;
  const cleanFetchLoad=window.DINI_FETCH_V2?.loadOrCreateSession?.bind(window.DINI_FETCH_V2)||null;

  function mark(kind,path){
    state[kind+'_path']=path;
    try{document.documentElement.dataset[kind==='template'?'templateLegacyParityPath':'fetchLegacyParityPath']=path}catch{}
  }

  function guardSnapshotMethod(obj,key){
    if(!obj||typeof obj[key]!=='function'||obj[key].__diniLegacyParityGuardV1)return;
    const legacy=obj[key].bind(obj);
    const guarded=input=>{
      if(isSourceTruth(input)){
        mark('template','source-truth-bypass');
        return deep(input);
      }
      return legacy(input);
    };
    guarded.__diniLegacyParityGuardV1=VERSION;
    obj[key]=guarded;
  }

  function finalize(){
    if(state.finalized)return state;

    const C=window.DINI_TEMPLATE_CANONICAL_V1160;
    if(C&&cleanCanonical&&typeof C.resolveSnapshot==='function'){
      const legacyCanonical=C.resolveSnapshot.bind(C);
      C.resolveSnapshot=input=>{
        if(isSourceTruth(input)){
          mark('template','source-truth-authority');
          return cleanCanonical(input);
        }
        mark('template','legacy-compatibility');
        return legacyCanonical(input);
      };
    }

    const E=window.DINI_FETCH_V2;
    if(E&&cleanFetchLoad&&typeof E.loadOrCreateSession==='function'){
      const legacyFetchLoad=E.loadOrCreateSession.bind(E);
      E.loadOrCreateSession=async handoff=>{
        const cleanSession=await cleanFetchLoad(handoff);
        if(isSourceTruth(cleanSession?.baseline)){
          mark('fetch','source-truth-authority');
          return cleanSession;
        }
        mark('fetch','legacy-compatibility');
        return legacyFetchLoad(handoff);
      };
    }

    const snapshotMethods=['augmentSocialSnapshot','augmentMediaSourceSnapshot','augmentSourceBackgroundSnapshot'];
    for(const key of snapshotMethods){
      guardSnapshotMethod(C,key);
      guardSnapshotMethod(E,key);
    }
    guardSnapshotMethod(window.DINI_SOCIAL_LINK_PARITY_V1,'augmentSnapshot');
    guardSnapshotMethod(window.DINI_MEDIA_SOURCE_PARITY_V1,'augmentSnapshot');
    guardSnapshotMethod(window.DINI_SOURCE_BACKGROUND_PARITY_V1,'augmentSnapshot');

    state.finalized=true;
    try{
      document.documentElement.dataset.legacyParityGate=VERSION;
      document.documentElement.dataset.sourceTruthLegacyParityPolicy='bypass';
    }catch{}
    return state;
  }

  window.DINI_LEGACY_PARITY_GATE_V1={VERSION,state,isSourceTruth,sourceTruthVersion,finalize};
})();
