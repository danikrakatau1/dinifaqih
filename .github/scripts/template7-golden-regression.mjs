import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const fixturePath = 'golden-tests/template-7/fixture.json';
const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
const checks = [];
const startedAt = new Date().toISOString();

function check(id, pass, detail, expected, actual) {
  checks.push({ id, pass: Boolean(pass), detail, ...(expected !== undefined ? { expected } : {}), ...(actual !== undefined ? { actual } : {}) });
}

function md5(buf) {
  return createHash('md5').update(buf).digest('hex');
}

async function fetchBuffer(url, label) {
  let last;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        headers: { 'user-agent': 'DiniFaqih-RoadToFinal-GoldenRegression/1.0' },
        signal: AbortSignal.timeout(25000)
      });
      if (!res.ok) throw new Error(`${label} HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      last = err;
      if (attempt < 3) await new Promise(r => setTimeout(r, 1200 * attempt));
    }
  }
  throw last;
}

function graphVisual(graph, type, elementId) {
  return (graph?.visuals || []).find(x => x?.type === type && x?.element_id === elementId);
}

// Fixture identity/self-consistency.
check('fixture:version', fixture.version === 1, 'Golden fixture schema version is pinned', 1, fixture.version);
check('fixture:template-id', fixture.template_id === '009e1a47-296f-4580-bedb-f0069f409d65', 'Template 7 UUID is immutable', '009e1a47-296f-4580-bedb-f0069f409d65', fixture.template_id);
check('fixture:source-url', fixture.source_url === 'https://web.galeriundanganofficial.com/art-jawa-hitam/', 'Golden source is ART JAWA HITAM', 'https://web.galeriundanganofficial.com/art-jawa-hitam/', fixture.source_url);
check('fixture:artifact-parity-pin', fixture.artifacts?.['index.html']?.md5 === fixture.artifacts?.['source-native.html']?.md5, 'index.html and source-native.html are pinned to same golden hash');

// Global engine policy guards. These intentionally inspect generic engine code, never Template 7 DOM.
const runtimeSource = await readFile('assets/js/source-runtime-compiler-v1.js', 'utf8');
const scannerSource = await readFile('assets/js/source-truth-scanner-v1.js', 'utf8');
const resolverSource = await readFile('dashboard-admin-fetch/visual-resolver.js', 'utf8').catch(async () => readFile('assets/js/visual-resolver.js', 'utf8'));
const genericEngineSource = [runtimeSource, scannerSource, resolverSource].join('\n');

const runtimeGuards = {
  execute_arbitrary_source_js: 'execute_arbitrary_source_js:false',
  source_delay_authoritative: 'source_delay_authoritative:true',
  synthetic_stagger: 'synthetic_stagger:false',
  source_transform_authoritative: 'source_transform_authoritative:true',
  editor_pause_non_destructive: 'editor_pause_non_destructive:true'
};
for (const [key, needle] of Object.entries(runtimeGuards)) {
  check(`engine-policy:${key}`, runtimeSource.includes(needle), `Runtime compiler preserves ${key}`, fixture.runtime_contract?.[key], runtimeSource.includes(needle) ? fixture.runtime_contract?.[key] : undefined);
}
for (const fn of ['scanMedia', 'scanLayers', 'scanAnimations', 'scanLifecycle', 'scanResponsive', 'scanPersonalization']) {
  check(`scanner:${fn}`, scannerSource.includes(`function ${fn}`), `Source Truth scanner still implements ${fn}`);
}
check('engine:no-template7-hardcode', !/template-7-164ddf61|009e1a47-296f-4580-bedb-f0069f409d65|art-jawa-hitam/i.test(genericEngineSource), 'Global engine contains no Template 7/source-specific hardcode');
check('engine:source-ownership-authoritative', /source_ownership_authoritative\s*:\s*true/.test(resolverSource), 'Visual resolver keeps source ownership authoritative');
check('engine:preserve-css-cascade', /preserve_css_cascade\s*:\s*true/.test(resolverSource), 'Visual resolver keeps authored CSS cascade');

// Live source contract.
const sourceBuffer = await fetchBuffer(fixture.source_url, 'ART JAWA HITAM source');
const sourceHtml = sourceBuffer.toString('utf8');
for (const marker of fixture.source_markers || []) {
  check(`source-marker:${marker}`, sourceHtml.includes(marker), `Live source still exposes ${marker}`);
}
const postCssMatch = sourceHtml.match(/https?:[^"']*\/uploads\/elementor\/css\/post-340856\.css[^"']*/i);
check('source:post-css-link', Boolean(postCssMatch), 'Live source still links Elementor post-340856.css');
let postCss = '';
if (postCssMatch) {
  postCss = (await fetchBuffer(postCssMatch[0].replaceAll('&amp;', '&'), 'post-340856.css')).toString('utf8');
  for (const marker of ['jawa-cvr-1.jpg', 'X-JAWA-HITAM.jpg', 'back-DEMO.jpg']) {
    check(`source-css:${marker}`, postCss.includes(marker), `Critical source CSS still contains ${marker}`);
  }
}

// Pinned saved artifact contract.
const artifactBuffers = {};
for (const [name, pin] of Object.entries(fixture.artifacts || {})) {
  const buf = await fetchBuffer(new URL(name, fixture.artifact_base).href, `artifact ${name}`);
  artifactBuffers[name] = buf;
  check(`artifact:${name}:bytes`, buf.length === pin.bytes, `${name} byte length stays golden`, pin.bytes, buf.length);
  const actualHash = md5(buf);
  check(`artifact:${name}:md5`, actualHash === pin.md5, `${name} content hash stays golden`, pin.md5, actualHash);
}
check('artifact:index-equals-native', artifactBuffers['index.html']?.equals(artifactBuffers['source-native.html']), 'Saved index.html equals source-native.html byte-for-byte');

// Saved manifest graph contract.
let manifest = null;
try {
  manifest = JSON.parse(artifactBuffers['manifest.json'].toString('utf8'));
  check('manifest:parse', true, 'manifest.json parses as JSON');
} catch (err) {
  check('manifest:parse', false, `manifest.json parse failed: ${err.message}`);
}
if (manifest) {
  check('manifest:source-url', manifest.source_url === fixture.source_url || manifest.origin_source_url === fixture.source_url, 'Manifest source URL matches golden', fixture.source_url, manifest.source_url || manifest.origin_source_url);
  check('manifest:baseline-hash', manifest.baseline_hash === fixture.baseline_hash, 'Baseline hash stays golden', fixture.baseline_hash, manifest.baseline_hash);
  check('manifest:fetch-handoff', manifest.fetch_handoff_id === fixture.fetch_handoff_id, 'Fetch handoff stays golden', fixture.fetch_handoff_id, manifest.fetch_handoff_id);
  const graph = manifest.source_graph || {};
  check('graph:open-selector', (graph.interactions || []).some(x => x?.type === 'open-invitation' && x?.selector === fixture.source_graph.open_selector), 'Open invitation selector stays golden', fixture.source_graph.open_selector);
  const vg = fixture.source_graph.video_background;
  const video = graphVisual(graph, 'video-background', vg.element_id);
  check('graph:video-background', Boolean(video) && String(video.url || '').endsWith(vg.url_suffix), 'Opening background video ownership stays golden', vg, video || null);
  for (const s of fixture.source_graph.slideshows || []) {
    const found = graphVisual(graph, 'slideshow', s.element_id);
    const pass = Boolean(found) && Number(found.duration) === s.duration && String(found.transition || '') === s.transition && Number(found.transition_duration) === s.transition_duration && Boolean(found.ken_burns) === s.ken_burns && (!s.ken_burns_direction || found.ken_burns_direction === s.ken_burns_direction);
    check(`graph:slideshow:${s.element_id}`, pass, 'Slideshow timing/transition stays golden', s, found || null);
  }
  for (const c of fixture.source_graph.critical_css || []) {
    const pass = (graph.visuals || []).some(x => x?.element_id === c.element_id && String(x?.url || '').endsWith(c.url_suffix) && String(x?.source_location || '') === 'external-css');
    check(`graph:css-owner:${c.element_id}`, pass, 'Critical external CSS ownership stays golden', c);
  }
}

const failed = checks.filter(x => !x.pass);
const report = {
  name: fixture.name,
  fixture_version: fixture.version,
  commit: process.env.GITHUB_SHA || null,
  ref: process.env.GITHUB_REF || null,
  started_at: startedAt,
  finished_at: new Date().toISOString(),
  checks_total: checks.length,
  checks_passed: checks.length - failed.length,
  checks_failed: failed.length,
  ok: failed.length === 0,
  checks
};
await writeFile('template7-golden-regression-report.json', JSON.stringify(report, null, 2));

console.log(`\nTemplate 7 Golden Regression: ${report.ok ? 'PASS' : 'FAIL'} · ${report.checks_passed}/${report.checks_total} checks`);
for (const item of failed) console.error(`FAIL ${item.id}: ${item.detail}`);
if (failed.length) process.exit(1);
