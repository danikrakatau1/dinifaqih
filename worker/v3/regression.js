import {analyzeHtml,sha256Text} from './analyzer.js';
import {applyEditDelta} from './delta.js';

const eq=(a,b)=>Number(a||0)===Number(b||0);
const marker=(html,re)=>((String(html||'').match(re)||[]).length);

export async function runRegressionGate(envelope,input={}){
  if(!envelope||envelope.schema!=='dini-source-native-envelope-v3')throw new Error('Envelope V3 tidak valid. Freeze Runtime dulu.');
  const expected=String(envelope.baseline?.replay?.sha256||'');
  const replay=String(envelope.baseline?.replay?.html||'');
  if(!expected||!replay)throw new Error('Frozen replay baseline tidak lengkap.');
  const liveHash=await sha256Text(replay);
  if(liveHash!==expected)throw new Error('Regression gate: frozen baseline hash berubah sebelum test.');

  const applied=await applyEditDelta(envelope,input);
  const before=await analyzeHtml(replay,envelope.source?.url||'', 'regression-baseline');
  const after=await analyzeHtml(applied.html,envelope.source?.url||'', 'regression-output');
  const checks=[];
  const add=(id,label,pass,detail,severity='critical')=>checks.push({id,label,pass:Boolean(pass),detail,severity});
  const bridgePresent=/data-dini-v3-delta-bridge\b/i.test(applied.html)&&applied.integrity?.runtimeBridge===true;

  add('baseline-immutable','Frozen baseline immutable',applied.integrity.baselineStillImmutable,applied.integrity.baselineHash);
  add('selectors-match','Semua Edit Delta menemukan target',applied.matches.every(x=>x.matched>0),applied.matches);
  add('elementor-elements','Elementor element count preserved',eq(before.structure.elementorElements,after.structure.elementorElements),`${before.structure.elementorElements} → ${after.structure.elementorElements}`);
  add('elementor-widgets','Elementor widget count preserved',eq(before.structure.elementorWidgets,after.structure.elementorWidgets),`${before.structure.elementorWidgets} → ${after.structure.elementorWidgets}`);
  add('data-settings','Elementor data-settings preserved',eq(before.structure.dataSettings,after.structure.dataSettings),`${before.structure.dataSettings} → ${after.structure.dataSettings}`);
  add('scripts','Original script tags preserved',after.structure.scripts>=before.structure.scripts,`${before.structure.scripts} → ${after.structure.scripts}`);
  add('styles','Style tags preserved',eq(before.structure.styles,after.structure.styles),`${before.structure.styles} → ${after.structure.styles}`);
  add('background-video','Source-native background videos preserved',eq(before.sourceNative.backgroundVideos.length,after.sourceNative.backgroundVideos.length),`${before.sourceNative.backgroundVideos.length} → ${after.sourceNative.backgroundVideos.length}`);
  add('slideshow','Source-native slideshows preserved',eq(before.sourceNative.slideshows.length,after.sourceNative.slideshows.length),`${before.sourceNative.slideshows.length} → ${after.sourceNative.slideshows.length}`);
  add('cover-marker','#cover marker preserved',marker(replay,/\bid=["']cover["']/gi)===marker(applied.html,/\bid=["']cover["']/gi),`${marker(replay,/\bid=["']cover["']/gi)} → ${marker(applied.html,/\bid=["']cover["']/gi)}`);
  add('open-button','Open-invitation marker preserved',marker(replay,/\btombolbuka\b/gi)===marker(applied.html,/\btombolbuka\b/gi),`${marker(replay,/\btombolbuka\b/gi)} → ${marker(applied.html,/\btombolbuka\b/gi)}`);
  add('runtime-bridge','Runtime delta bridge installed',bridgePresent,'data-dini-v3-delta-bridge + integrity.runtimeBridge');
  add('navigation-guard','Navigation guard installed',bridgePresent&&applied.integrity?.navigationGuard===true,'runtime bridge owns tombolbuka href guard');
  add('output-changed-when-edited','Output changes when delta exists',!input?.operations?.length||applied.integrity.changed,`ops=${input?.operations?.length||0}; changed=${applied.integrity.changed}`,'warning');

  const failures=checks.filter(x=>!x.pass&&x.severity==='critical');
  const warnings=checks.filter(x=>!x.pass&&x.severity!=='critical');
  const status=failures.length?'FAIL':warnings.length?'PASS_WITH_WARNING':'PASS';
  return {status,pass:!failures.length,checks,failures,warnings,integrity:applied.integrity,matches:applied.matches,structure:{before:before.structure,after:after.structure},sourceNative:{before:before.sourceNative,after:after.sourceNative},html:applied.html};
}

export async function runCandidateRegressionGate(envelope,candidateHtml,{mode='production-editor',metadata={}}={}){
  if(!envelope||envelope.schema!=='dini-source-native-envelope-v3')throw new Error('Envelope V3 editor baseline tidak valid.');
  const replay=String(envelope.baseline?.replay?.html||'');
  const expected=String(envelope.baseline?.replay?.sha256||'');
  const candidate=String(candidateHtml||'');
  if(!replay||!expected||!candidate)throw new Error('Candidate regression membutuhkan baseline + candidate HTML.');
  const liveHash=await sha256Text(replay);
  if(liveHash!==expected)throw new Error('Candidate regression: frozen editor baseline berubah.');
  const outputHash=await sha256Text(candidate);
  const before=await analyzeHtml(replay,envelope.source?.url||'', 'candidate-baseline');
  const after=await analyzeHtml(candidate,envelope.source?.url||'', 'candidate-output');
  const checks=[];
  const add=(id,label,pass,detail,severity='critical')=>checks.push({id,label,pass:Boolean(pass),detail,severity});
  const count=(html,re)=>marker(html,re);
  const baseNodes=count(replay,/\bdata-native-node-id=/gi),outNodes=count(candidate,/\bdata-native-node-id=/gi);
  const baseGuest=count(replay,/\b(?:data-native-guest-name|data-dini-guest-name)=/gi),outGuest=count(candidate,/\b(?:data-native-guest-name|data-dini-guest-name)=/gi);
  const baseCritical=count(replay,/\bdata-dini-critical-elementor-css=/gi),outCritical=count(candidate,/\bdata-dini-critical-elementor-css=/gi);
  const baseCoverStyle=(replay.match(/<[^>]+id=["']cover["'][^>]*style=["']([^"']*)/i)||[])[1]||'';
  const outCoverStyle=(candidate.match(/<[^>]+id=["']cover["'][^>]*style=["']([^"']*)/i)||[])[1]||'';
  const runtimeOpenLeak=!/translateY\(\s*-100%\s*\)/i.test(baseCoverStyle)&&/translateY\(\s*-100%\s*\)/i.test(outCoverStyle);

  add('baseline-immutable','Editor baseline immutable',liveHash===expected,expected);
  add('source-native-nodes','Source-native node markers preserved',baseNodes===outNodes,`${baseNodes} → ${outNodes}`);
  add('guest-markers','Guest markers preserved',baseGuest===outGuest,`${baseGuest} → ${outGuest}`);
  add('critical-css','Critical source CSS preserved',baseCritical===outCritical,`${baseCritical} → ${outCritical}`);
  add('elementor-elements','Elementor element count preserved',eq(before.structure.elementorElements,after.structure.elementorElements),`${before.structure.elementorElements} → ${after.structure.elementorElements}`);
  add('elementor-widgets','Elementor widget count preserved',eq(before.structure.elementorWidgets,after.structure.elementorWidgets),`${before.structure.elementorWidgets} → ${after.structure.elementorWidgets}`);
  add('scripts','Script tag count preserved',eq(before.structure.scripts,after.structure.scripts),`${before.structure.scripts} → ${after.structure.scripts}`);
  add('styles','Style tag count preserved',eq(before.structure.styles,after.structure.styles),`${before.structure.styles} → ${after.structure.styles}`);
  add('background-video','Source-native background videos preserved',eq(before.sourceNative.backgroundVideos.length,after.sourceNative.backgroundVideos.length),`${before.sourceNative.backgroundVideos.length} → ${after.sourceNative.backgroundVideos.length}`);
  add('slideshow','Source-native slideshows preserved',eq(before.sourceNative.slideshows.length,after.sourceNative.slideshows.length),`${before.sourceNative.slideshows.length} → ${after.sourceNative.slideshows.length}`);
  add('cover-marker','#cover marker preserved',count(replay,/\bid=["']cover["']/gi)===count(candidate,/\bid=["']cover["']/gi),`${count(replay,/\bid=["']cover["']/gi)} → ${count(candidate,/\bid=["']cover["']/gi)}`);
  add('open-button','Open-invitation marker preserved',count(replay,/\btombolbuka\b/gi)===count(candidate,/\btombolbuka\b/gi),`${count(replay,/\btombolbuka\b/gi)} → ${count(candidate,/\btombolbuka\b/gi)}`);
  add('runtime-cover-state','Runtime open-state tidak bocor ke final HTML',!runtimeOpenLeak,runtimeOpenLeak?'translateY(-100%) leak detected':'clean');
  add('candidate-produced','Production editor candidate tersedia',candidate.length>200,`${candidate.length} bytes`);
  add('output-changed','Candidate boleh berubah dari baseline',outputHash!==expected,outputHash===expected?'no edit delta detected':`${expected.slice(0,12)} → ${outputHash.slice(0,12)}`,'warning');

  const failures=checks.filter(x=>!x.pass&&x.severity==='critical');
  const warnings=checks.filter(x=>!x.pass&&x.severity!=='critical');
  const status=failures.length?'FAIL':warnings.length?'PASS_WITH_WARNING':'PASS';
  return {status,pass:!failures.length,mode,checks,failures,warnings,integrity:{baselineHash:expected,outputHash,baselineStillImmutable:liveHash===expected,changed:outputHash!==expected},structure:{before:before.structure,after:after.structure},sourceNative:{before:before.sourceNative,after:after.sourceNative},metadata,html:candidate};
}
