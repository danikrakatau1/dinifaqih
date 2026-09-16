import { readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile('assets/js/legacy-parity-gate-v1.js','utf8');
const checks=[];
const check=(id,pass,detail,actual)=>checks.push({id,pass:Boolean(pass),detail,...(actual!==undefined?{actual}:{})});

const makeSnap=v=>({
  manifest:{source_graph:{source_truth_version:v}},
  html:'<!doctype html><html><body>golden</body></html>',
  schema:{fields:[]},values:{}
});

let cleanCanonicalCalls=0;
let cleanFetchCalls=0;
const cleanSourceTruth=makeSnap(1);
const cleanLegacy=makeSnap(0);
const sandbox={
  console,
  document:{documentElement:{dataset:{}}},
  setTimeout,clearTimeout,Promise,
  DINI_TEMPLATE_CANONICAL_V1160:{
    resolveSnapshot(input){cleanCanonicalCalls++;return {...structuredClone(input),clean_authority:true}}
  },
  DINI_FETCH_V2:{
    async loadOrCreateSession(handoff){
      cleanFetchCalls++;
      return {handoff,baseline:structuredClone(handoff==='source-truth'?cleanSourceTruth:cleanLegacy)};
    }
  }
};
sandbox.window=sandbox;
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'legacy-parity-gate-v1.js'});

const cleanCanonical=sandbox.DINI_TEMPLATE_CANONICAL_V1160.resolveSnapshot.bind(sandbox.DINI_TEMPLATE_CANONICAL_V1160);
sandbox.DINI_TEMPLATE_CANONICAL_V1160.resolveSnapshot=input=>{
  const mutated=structuredClone(input);mutated.legacy_mutated=true;return cleanCanonical(mutated);
};
const cleanLoad=sandbox.DINI_FETCH_V2.loadOrCreateSession.bind(sandbox.DINI_FETCH_V2);
sandbox.DINI_FETCH_V2.loadOrCreateSession=async handoff=>{
  const session=await cleanLoad(handoff);session.baseline.legacy_mutated=true;return session;
};
for(const key of ['augmentSocialSnapshot','augmentMediaSourceSnapshot','augmentSourceBackgroundSnapshot']){
  sandbox.DINI_TEMPLATE_CANONICAL_V1160[key]=input=>({...structuredClone(input),legacy_mutated:true});
  sandbox.DINI_FETCH_V2[key]=input=>({...structuredClone(input),legacy_mutated:true});
}
sandbox.DINI_SOCIAL_LINK_PARITY_V1={augmentSnapshot:input=>({...structuredClone(input),legacy_mutated:true})};
sandbox.DINI_MEDIA_SOURCE_PARITY_V1={augmentSnapshot:input=>({...structuredClone(input),legacy_mutated:true})};
sandbox.DINI_SOURCE_BACKGROUND_PARITY_V1={augmentSnapshot:input=>({...structuredClone(input),legacy_mutated:true})};

const gate=sandbox.DINI_LEGACY_PARITY_GATE_V1;
gate.finalize();

const stCanonical=sandbox.DINI_TEMPLATE_CANONICAL_V1160.resolveSnapshot(makeSnap(1));
const legacyCanonical=sandbox.DINI_TEMPLATE_CANONICAL_V1160.resolveSnapshot(makeSnap(0));
check('canonical:source-truth-bypass',stCanonical.clean_authority===true&&stCanonical.legacy_mutated!==true,'Source Truth canonical path uses pre-legacy authority resolver',stCanonical);
check('canonical:legacy-preserved',legacyCanonical.clean_authority===true&&legacyCanonical.legacy_mutated===true,'Legacy canonical path still uses compatibility wrapper',legacyCanonical);

const stFetch=await sandbox.DINI_FETCH_V2.loadOrCreateSession('source-truth');
const legacyFetch=await sandbox.DINI_FETCH_V2.loadOrCreateSession('legacy');
check('fetch:source-truth-bypass',stFetch.baseline.legacy_mutated!==true,'Source Truth Fetch session bypasses legacy augmentation',stFetch.baseline);
check('fetch:legacy-preserved',legacyFetch.baseline.legacy_mutated===true,'Legacy Fetch session still uses compatibility augmentation',legacyFetch.baseline);

for(const [owner,obj] of [
  ['canonical',sandbox.DINI_TEMPLATE_CANONICAL_V1160],
  ['fetch',sandbox.DINI_FETCH_V2],
  ['social',sandbox.DINI_SOCIAL_LINK_PARITY_V1],
  ['media',sandbox.DINI_MEDIA_SOURCE_PARITY_V1],
  ['background',sandbox.DINI_SOURCE_BACKGROUND_PARITY_V1]
]){
  const keys=owner==='canonical'||owner==='fetch'?['augmentSocialSnapshot','augmentMediaSourceSnapshot','augmentSourceBackgroundSnapshot']:['augmentSnapshot'];
  for(const key of keys){
    if(typeof obj?.[key]!=='function')continue;
    const st=obj[key](makeSnap(1));
    const legacy=obj[key](makeSnap(0));
    check(`${owner}:${key}:source-truth-bypass`,st.legacy_mutated!==true,`${owner}.${key} cannot mutate Source Truth snapshots`,st);
    check(`${owner}:${key}:legacy-preserved`,legacy.legacy_mutated===true,`${owner}.${key} remains available for legacy snapshots`,legacy);
  }
}

check('gate:finalized',gate.state.finalized===true,'Legacy parity gate finalized',gate.state);
check('gate:policy-marker',sandbox.document.documentElement.dataset.sourceTruthLegacyParityPolicy==='bypass','Source Truth bypass policy marker is exposed',sandbox.document.documentElement.dataset);
check('gate:clean-canonical-used',cleanCanonicalCalls>=2,'Clean canonical authority remained reachable',cleanCanonicalCalls);
check('gate:clean-fetch-used',cleanFetchCalls>=3,'Clean Fetch loader remained reachable',cleanFetchCalls);

const failed=checks.filter(x=>!x.pass);
const report={name:'Road To Final — Legacy Parity Isolation',checks_total:checks.length,checks_passed:checks.length-failed.length,checks_failed:failed.length,ok:failed.length===0,checks};
await writeFile('legacy-parity-gate-regression-report.json',JSON.stringify(report,null,2));
console.log(`Legacy Parity Gate Regression: ${report.ok?'PASS':'FAIL'} · ${report.checks_passed}/${report.checks_total}`);
for(const item of failed)console.error(`FAIL ${item.id}: ${item.detail}`);
if(failed.length)process.exit(1);
