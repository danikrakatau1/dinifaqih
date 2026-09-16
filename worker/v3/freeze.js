import {analyzeHtml,compareReports,injectBase,sha256Text} from './analyzer.js';

const uniq=a=>[...new Set((a||[]).filter(Boolean))];
const diff=(a,b)=>{const x=new Set(a||[]);return uniq(b).filter(v=>!x.has(v))};
const removed=(a,b)=>{const x=new Set(b||[]);return uniq(a).filter(v=>!x.has(v))};

function dependencyGraph(raw,runtime){
  const kinds=['scripts','stylesheets','images','videos','audio','iframes','fonts'];
  const graph={};
  for(const kind of kinds){
    graph[kind]={
      raw:raw.dependencies[kind]||[],
      runtime:runtime.dependencies[kind]||[],
      injected:diff(raw.dependencies[kind],runtime.dependencies[kind]),
      removed:removed(raw.dependencies[kind],runtime.dependencies[kind])
    };
  }
  graph.injectedAll=diff(raw.dependencies.all,runtime.dependencies.all);
  graph.removedAll=removed(raw.dependencies.all,runtime.dependencies.all);
  return graph;
}

export async function createFreezeEnvelope({source,rawHtml,runtimeHtml,browserMs=null,transport={}}){
  const raw=await analyzeHtml(rawHtml,source,'raw-source');
  const runtime=await analyzeHtml(runtimeHtml,source,'browser-rendered');
  const comparison=compareReports(raw,runtime);
  const graph=dependencyGraph(raw,runtime);
  const replayHtml=injectBase(runtimeHtml,source);
  const replayHash=await sha256Text(replayHtml);
  const core={
    schema:'dini-source-native-envelope-v3',
    version:'3.1.0-alpha.1',
    immutable:true,
    authority:'raw+runtime+dependency-graph',
    source:{url:source,transport},
    capture:{capturedAt:new Date().toISOString(),browserMs},
    baseline:{raw:{html:rawHtml,sha256:raw.sha256,bytes:raw.bytes},runtime:{html:runtimeHtml,sha256:runtime.sha256,bytes:runtime.bytes},replay:{html:replayHtml,sha256:replayHash}},
    reports:{raw,runtime,comparison},
    preserve:{dependencies:graph,sourceNative:{raw:raw.sourceNative,runtime:runtime.sourceNative},runtimeSignals:{raw:raw.runtime,runtime:runtime.runtime},animation:{raw:raw.animation,runtime:runtime.animation},layers:{raw:raw.layers,runtime:runtime.layers}},
    editDelta:{version:1,values:{},transforms:{},guest:{}}
  };
  const envelopeHash=await sha256Text(JSON.stringify(core));
  return{...core,integrity:{rawHash:raw.sha256,runtimeHash:runtime.sha256,replayHash,envelopeHash}};
}

export function envelopeSummary(e){return{
  schema:e.schema,version:e.version,immutable:e.immutable,authority:e.authority,
  source:e.source.url,capturedAt:e.capture.capturedAt,browserMs:e.capture.browserMs,
  hashes:e.integrity,
  bytes:{raw:e.baseline.raw.bytes,runtime:e.baseline.runtime.bytes,replay:new TextEncoder().encode(e.baseline.replay.html).byteLength},
  injectedDependencies:e.preserve.dependencies.injectedAll,
  removedDependencies:e.preserve.dependencies.removedAll,
  comparison:e.reports.comparison,
  sourceNative:e.preserve.sourceNative
}}
