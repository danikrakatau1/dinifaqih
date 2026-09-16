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

  add('baseline-immutable','Frozen baseline immutable',applied.integrity.baselineStillImmutable,applied.integrity.baselineHash);
  add('selectors-match','Semua Edit Delta menemukan target',applied.matches.every(x=>x.matched>0),applied.matches);
  add('elementor-elements','Elementor element count preserved',eq(before.structure.elementorElements,after.structure.elementorElements),`${before.structure.elementorElements} → ${after.structure.elementorElements}`);
  add('elementor-widgets','Elementor widget count preserved',eq(before.structure.elementorWidgets,after.structure.elementorWidgets),`${before.structure.elementorWidgets} → ${after.structure.elementorWidgets}`);
  add('data-settings','Elementor data-settings preserved',eq(before.structure.dataSettings,after.structure.dataSettings),`${before.structure.dataSettings} → ${after.structure.dataSettings}`);
  add('scripts','Script tags preserved',eq(before.structure.scripts,after.structure.scripts),`${before.structure.scripts} → ${after.structure.scripts}`);
  add('styles','Style tags preserved',eq(before.structure.styles,after.structure.styles),`${before.structure.styles} → ${after.structure.styles}`);
  add('background-video','Source-native background videos preserved',eq(before.sourceNative.backgroundVideos.length,after.sourceNative.backgroundVideos.length),`${before.sourceNative.backgroundVideos.length} → ${after.sourceNative.backgroundVideos.length}`);
  add('slideshow','Source-native slideshows preserved',eq(before.sourceNative.slideshows.length,after.sourceNative.slideshows.length),`${before.sourceNative.slideshows.length} → ${after.sourceNative.slideshows.length}`);
  add('cover-marker','#cover marker preserved',marker(replay,/\bid=["']cover["']/gi)===marker(applied.html,/\bid=["']cover["']/gi),`${marker(replay,/\bid=["']cover["']/gi)} → ${marker(applied.html,/\bid=["']cover["']/gi)}`);
  add('open-button','Open-invitation marker preserved',marker(replay,/\btombolbuka\b/gi)===marker(applied.html,/\btombolbuka\b/gi),`${marker(replay,/\btombolbuka\b/gi)} → ${marker(applied.html,/\btombolbuka\b/gi)}`);
  add('runtime-bridge','Runtime delta bridge installed',/data-dini-v3-runtime-delta=["']1["']/i.test(applied.html),'runtime mutation guard present');
  add('navigation-guard','Navigation guard installed',/data-dini-v3-runtime-delta=["']1["']/i.test(applied.html),'same runtime bridge owns anchor guard');
  add('output-changed-when-edited','Output changes when delta exists',!input?.operations?.length||applied.integrity.changed,`ops=${input?.operations?.length||0}; changed=${applied.integrity.changed}`,'warning');

  const failures=checks.filter(x=>!x.pass&&x.severity==='critical');
  const warnings=checks.filter(x=>!x.pass&&x.severity!=='critical');
  const status=failures.length?'FAIL':warnings.length?'PASS_WITH_WARNING':'PASS';
  return {status,pass:!failures.length,checks,failures,warnings,integrity:applied.integrity,matches:applied.matches,structure:{before:before.structure,after:after.structure},sourceNative:{before:before.sourceNative,after:after.sourceNative},html:applied.html};
}
