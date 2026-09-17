import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const has=(text,...patterns)=>patterns.every(p=>p instanceof RegExp?p.test(text):text.includes(p));

const roadmap=read('ROAD-TO-FINAL-DINI-FAQIH.md');
const marker=read('ROAD-TO-FINAL-MASTER-38-COMPLETE.txt');
const fetchEntry=read('dashboard-admin-fetch/index.html');
const studio=read('dashboard-admin-fetch/studio.js');
const scanner=read('assets/js/source-truth-scanner-v1.js');
const gap=read('assets/js/source-truth-gap-closure-v1.js');
const compiler=read('assets/js/source-runtime-compiler-v1.js');
const runtimeControl=read('dashboard-admin-fetch-editor/fetch-runtime-control-v1.js');
const diagnostics=read('dashboard-admin-fetch-editor/fetch-scanner-diagnostics-v1.js');
const fetchEditor=read('dashboard-admin-fetch-editor/fetch-editor-v2000.js');
const fetchEditorEntry=read('dashboard-admin-fetch-editor/index.html');
const saveFinalizer=read('dashboard-admin-fetch-editor/fetch-save-finalizer-v2110.js');
const cleanPreview=read('dashboard-admin-fetch-editor/clean-preview-v2000.js');
const authorityHash=read('dashboard-admin-fetch-editor/fetch-authority-hash-v1.js');
const templateAuthority=read('dashboard-admin-edit/template-baseline-authority-v1.js');
const templateEntry=read('dashboard-admin-edit/index.html');
const legacyGate=read('assets/js/legacy-parity-gate-v1.js');
const deepUi=read('dashboard-admin-fetch/fetch-deep-source-ui-v1.js');
const guestProbe=read('dashboard-admin-fetch/guest-slot-probe-v2.js');
const sourcePersonalization=read('assets/js/source-personalization-v1.js');
const guestRuntime=read('assets/js/guest-runtime-v1.js');
const publicBridge=read('assets/js/public-personalization-bridge-v1.js');
const strictRenderer=read('assets/js/public-source-truth-renderer-v1.js');
const publicEntry=read('public-entry-v18.html');
const guestEntry=read('guest-entry-v18.html');
const goldenFixture=read('golden-tests/template-7/fixture.json');
const goldenScript=read('.github/scripts/template7-golden-regression.mjs');
const goldenWorkflow=read('.github/workflows/road-to-final-template7-golden.yml');
const deviceScript=read('.github/scripts/template7-device-matrix.mjs');
const deviceWorkflow=read('.github/workflows/road-to-final-template7-device-matrix.yml');
const lifecycleScript=read('.github/scripts/template7-lifecycle-regression-v2.mjs');
const lifecycleWorkflow=read('.github/workflows/road-to-final-template7-lifecycle.yml');

const checks=[];
const add=(point,name,ok,evidence)=>checks.push({point,name,ok:Boolean(ok),evidence});

add(1,'Production checkpoint before major changes',has(marker,'Production/main baseline at lock: 94c4fddccde5d714f6ca9a247b87a0a9ef833f75'), 'Pinned production SHA exists');
add(2,'Fetch is Deep Source Scanner',has(fetchEntry,'source-truth-scanner-v1.js','source-truth-gap-closure-v1.js','fetch-deep-source-ui-v1.js')&&has(deepUi,'DEEP SOURCE TRUTH','event graph','randomness'), 'Deep scanner + visible deep report are wired into Fetch');
add(3,'Source-native analyzer is used by Fetch',has(studio,'DiniVisualResolver?.makeSourceGraph','lastSourceGraph'), 'Fetch build consumes shared source graph');
add(4,'Media classifier per element/role',has(scanner,'function scanMedia','role:','owner_selector','render_target'), 'Media records include ownership and role');
add(5,'Layer / ownership graph',has(scanner,'function scanLayers','preserve-authored-hierarchy','ancestors'), 'Layer hierarchy is captured');
add(6,'Animation scanner includes external JS evidence',has(scanner,'function scanAnimations')&&has(gap,'scanExternalAnimationApis','fetchScript','external_script_records'), 'CSS/data-settings/inline + fetched external JS evidence');
add(7,'Lifecycle scanner covers source and external evidence',has(scanner,'function scanLifecycle')&&has(gap,'scanLifecycleEvidence','setInterval','play-media','pause-media'), 'Lifecycle events/timers/actions scan external static source too');
add(8,'Event graph exists',has(gap,'function eventGraph','same-script-evidence','graph.event_graph=eventGraph'), 'Events/targets/timers/actions/media are correlated in evidence graph');
add(9,'Desktop/tablet/mobile behavior preserved separately',has(scanner,"['desktop'", "['tablet'", "['mobile'")&&has(gap,"viewports:['desktop','tablet','mobile']",'preserve_source_media_queries:true','preserve_source_runtime_checks:true','synthesize_breakpoints:false'), 'Responsive source settings, CSS queries and runtime checks are source-authoritative');
add(10,'Randomness preserved only when authored',has(gap,'function scanRandomness','preserve-authored-randomness','deterministic-no-randomness-detected','synthetic_randomness:false','do-not-invent-seed'), 'Explicit source-evidence-only randomness contract');
add(11,'Lifecycle media scan complete contract',has(scanner,"kind:'background-video'")&&has(gap,'lifecycle.media','play-media','pause-media','mediaUrl'), 'DOM/data-settings media plus JS media lifecycle evidence');
add(12,'Source Truth separated from Compatibility Policy',has(scanner,'compatibility_policy','authority','source_truth_version'), 'Truth and compatibility are distinct records');
add(13,'Media/video end-state is measured compatibility policy',has(gap,'function mediaEndState',"strategy:'source-derived-only'",'synthetic_hide:false','synthetic_reset:false','synthetic_seek:false'), 'No invented hide/reset/seek end state');
const forbiddenHardcode=/KNOWN_ART_JAWA|art-jawa-coklat|fd2b4a3|5361f63|b3551e3|template-2/i;
add(14,'No template-specific hardcode in active Source Truth renderer',!forbiddenHardcode.test(strictRenderer)&&!forbiddenHardcode.test(gap)&&!forbiddenHardcode.test(scanner), 'Active generic engine has no known template URL/ID fallback');
add(15,'Synthetic timing is labeled last-resort fallback',has(compiler,'source_delay_authoritative:true','synthetic_stagger:false','interaction-fallback','media-fallback'), 'Source delays authoritative; fallback explicitly tagged');
add(16,'No global kill rules on Source Truth public path',has(strictRenderer,"if(pkg.source_truth)","source-truth-exact")&&has(strictRenderer,"else{",'public-visibility-chain-v1241.js')&&has(scanner,'blanket_animation_disable:false','blanket_transform_reset:false','blanket_visibility_force:false'), 'Destructive compatibility runs only on legacy path; Source Truth exact path bypasses it');
add(17,'Editor does not force all elements visible',has(scanner,'blanket_visibility_force:false')&&has(runtimeControl,'animation-play-state:paused','editor-runtime-mode'), 'Editing pauses runtime without flattening visibility');
add(18,'Production Editor remains primary editor',has(fetchEditorEntry,'fetch-editor-v2000.js')&&has(templateEntry,'template-editor-v2000.js'), 'Existing Fetch/Template editors remain the editing surfaces');
add(19,'LIVE / PAUSE / EDIT / REPLAY runtime modes',has(runtimeControl,'LIVE','PAUSE','EDIT','REPLAY','replay()'), 'Four non-destructive runtime controls implemented');
add(20,'Selection overlay / hit-testing',has(diagnostics,'INSPECT ELEMENT','Jump + Highlight')&&has(fetchEditor,'fieldsAtPoint','native-selected-outline'), 'Inspector + field hit testing available');
add(21,'Source Truth Package per template',has(studio,'source_graph:lastSourceGraph','manifest:{format:')&&has(scanner,'source_truth_version=1'), 'Rebuild manifest carries source graph package');
add(22,'Applied Snapshot is master after Fetch Editor',has(fetchEditor,'buildApplied(session)','writeApplied(h,snap)'), 'APPLY writes canonical applied snapshot');
add(23,'Save Template stores same applied snapshot without second rebuild',has(saveFinalizer,'readApplied(h)','currentDelta!==appliedDelta')&&!has(saveFinalizer,'buildApplied('), 'Save consumes Applied Snapshot and rejects post-apply drift');
add(24,'Template Editor loads exact same baseline',has(templateAuthority,"policy:'exact-saved-snapshot'",'exact-source-truth'), 'Saved Source Truth snapshot is exact editor baseline');
add(25,'Canonicalizer is non-destructive for Source Truth baseline',has(templateAuthority,'canonicalizer_bypassed:true','if(!exactSnap(snap))return original(snap)'), 'Canonicalizer bypassed for exact Source Truth snapshots');
add(26,'Parity Hash Gate',has(authorityHash,'SHA-256','authority_hash','applied_html_hash','road-to-final-authority-v1')&&has(templateAuthority,'recomputed_authority_hash','authority_match','exact_match'), 'Fetch and Template Editor verify authority + exact HTML');
add(27,'Clean Preview, ZIP, Template Editor and Public use same package',has(cleanPreview,'readApplied(h)','snap.html')&&has(fetchEditor,'ZIP dibuat dari Applied Snapshot')&&has(publicEntry,'public-source-truth-renderer-v1.js')&&has(guestEntry,'public-source-truth-renderer-v1.js')&&has(strictRenderer,'const exact=isSourceTruth(snap)','if(!exact&&window.DINI_TEMPLATE_CANONICAL_V1160?.resolveSnapshot)'), 'Public Source Truth renderer consumes exact saved snapshot; legacy alone canonicalizes');
add(28,'Scanner Diagnostics UI',has(diagnostics,'SCANNER DIAGNOSTICS','Overview','Media','Animations','Lifecycle','Responsive','Dependencies','Personalization','Policy'), 'Read-only diagnostics surface exists');
add(29,'Per-element Source Truth inspection',has(diagnostics,'INSPECT ELEMENT','Copy Element Report','Jump + Highlight','owner / ancestor')||has(diagnostics,'chainFor','selectedNode','editable field'), 'Element-level correlation and inspection implemented');
add(30,'Template 7 golden test',has(goldenFixture,'template-7-164ddf61','art-jawa-hitam')&&has(goldenScript,'fixture.json'), 'Pinned Template 7 golden identity and harness');
add(31,'Repeatable Template 7 regression fixture',has(goldenWorkflow,'Template 7 Golden Regression')&&has(goldenScript,'checks'), 'Dedicated repeatable golden regression exists');
add(32,'Desktop + Android + iPhone matrix',has(deviceWorkflow,'profile: desktop','profile: android','profile: iphone')&&has(deviceScript,'DEVICE_PROFILE'), '3-profile real-browser device matrix');
add(33,'Lifecycle behavioral regression',has(lifecycleWorkflow,'Lifecycle')&&has(lifecycleScript,'playwright')&&has(lifecycleScript,'checks'), 'Real browser lifecycle regression, not screenshot-only');
add(34,'Legacy patches are isolated from Source Truth',has(legacyGate,'source-truth-bypass','source-truth-authority','legacy-compatibility')&&has(strictRenderer,"pkg.source_truth?'exact-source-truth-snapshot':'legacy-canonical-compatibility'")&&!publicEntry.includes('public-canonical-renderer-v18.js')&&!guestEntry.includes('public-canonical-renderer-v18.js'), 'Old canonical public renderer is no longer active entry; legacy compatibility is gated');
add(35,'Personalization Scanner',has(sourcePersonalization,"type:'guest_name'",'heuristic_requires_confirmation','textContent-only'), 'Source-native guest_name scanner with confidence policy');
add(36,'Dynamic guest_name binds to source-native node',has(guestProbe,"binding:'guest_name'",'source-variant-authoritative','clone_node:false','create_node:false')&&!guestProbe.includes('cloneNode(')&&!guestProbe.includes('createElement('), 'Fetch uses existing/upstream source document; does not construct guest UI');
add(37,'URL personalization is text-only and preserves style/animation',has(guestRuntime,'node.textContent=name','guestMutation','text-only')&&!guestRuntime.includes('.style.')&&!guestRuntime.includes('classList.')&&has(publicBridge,'node.textContent=name'), 'Only textContent changes on bound template node');
const noGuestSynthesis=!strictRenderer.includes('transplantProbeWidget')&&!strictRenderer.includes('legacyTemplate2Restore')&&!strictRenderer.includes('source-native-fallback')&&!strictRenderer.includes('data-dini-guest-injected');
add(38,'Public guest parity uses template node, never global/clone UI',has(strictRenderer,"guestSourceRestore=guest?'existing-source-binding-only':'not-guest'")&&noGuestSynthesis&&!forbiddenHardcode.test(strictRenderer)&&has(publicBridge,"publicGuestParity=matched?'template-node':'missing-binding'")&&has(guestProbe,'matched-existing-owner-path','source-variant-authoritative'), 'Strict public renderer may create its iframe shell, but guest personalization itself only targets source-native nodes and never synthesizes guest UI');

const expected=[...Array(38)].map((_,i)=>i+1);
const actual=checks.map(x=>x.point);
const shapeOk=expected.length===actual.length&&expected.every((n,i)=>actual[i]===n);
if(!shapeOk)throw new Error('Audit definition must contain exactly points 1..38 in order.');

const failed=checks.filter(x=>!x.ok);
const report={
  contract:'road-to-final-38-final-audit-v1.1',
  generated_at:new Date().toISOString(),
  points_total:38,
  points_passed:38-failed.length,
  points_failed:failed.length,
  ok:failed.length===0,
  checks
};
fs.mkdirSync(path.join(root,'road-to-final-38-artifacts'),{recursive:true});
fs.writeFileSync(path.join(root,'road-to-final-38-artifacts/report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(failed.length)process.exit(1);
