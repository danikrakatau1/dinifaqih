import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium, webkit } from 'playwright';

const fixture = JSON.parse(await readFile('golden-tests/template-7/fixture.json', 'utf8'));
const browserName = String(process.env.BROWSER_ENGINE || 'chromium').toLowerCase();
if (!['chromium', 'webkit'].includes(browserName)) throw new Error(`Unknown BROWSER_ENGINE: ${browserName}`);
const outDir = `lifecycle-artifacts/${browserName}`;
await mkdir(outDir, { recursive: true });

const checks = [];
const observations = { console_errors: [], page_errors: [], request_failures: [] };
const check = (id, pass, detail, expected, actual) => checks.push({ id, pass: Boolean(pass), detail, ...(expected !== undefined ? { expected } : {}), ...(actual !== undefined ? { actual } : {}) });
const md5 = buf => createHash('md5').update(buf).digest('hex');
const targetUrl = new URL('index.html', fixture.artifact_base).href;

async function fetchBuffer(url, ua) {
  const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(30000), headers: { 'user-agent': ua } });
  return { response, buffer: Buffer.from(await response.arrayBuffer()) };
}

const golden = await fetchBuffer(targetUrl, 'DiniFaqih-RoadToFinal-Lifecycle/2.0');
const artifactHtml = golden.buffer.toString('utf8');
const pin = fixture.artifacts['index.html'];
check('golden:http', golden.response.ok, 'Pinned Golden artifact is reachable', true, golden.response.status);
check('golden:bytes', golden.buffer.length === pin.bytes, 'Golden bytes remain pinned', pin.bytes, golden.buffer.length);
check('golden:md5', md5(golden.buffer) === pin.md5, 'Golden MD5 remains pinned', pin.md5, md5(golden.buffer));

const source = await fetchBuffer(fixture.source_url, 'Mozilla/5.0 DiniFaqih-RoadToFinal-SourceCapture/2.0');
const sourceHtml = source.buffer.toString('utf8');
check('source:http', source.response.ok, 'Live source is reachable for pre-sanitize capture', true, source.response.status);
for (const marker of fixture.source_markers) check(`source:marker:${marker}`, sourceHtml.includes(marker), `Live source still contains Golden marker ${marker}`);

const browserType = browserName === 'webkit' ? webkit : chromium;
const browser = await browserType.launch(browserName === 'chromium' ? { headless: true, args: ['--autoplay-policy=no-user-gesture-required'] } : { headless: true });
const context = await browser.newContext({
  viewport: browserName === 'webkit' ? { width: 393, height: 852 } : { width: 1280, height: 800 },
  isMobile: browserName === 'webkit',
  hasTouch: browserName === 'webkit',
  deviceScaleFactor: browserName === 'webkit' ? 3 : 1,
  locale: 'id-ID',
  timezoneId: 'Asia/Jakarta',
  reducedMotion: 'no-preference',
  serviceWorkers: 'block'
});

function attachObservers(page) {
  page.on('console', msg => { if (msg.type() === 'error' && observations.console_errors.length < 50) observations.console_errors.push(msg.text()); });
  page.on('pageerror', err => { if (observations.page_errors.length < 30) observations.page_errors.push(String(err?.message || err)); });
  page.on('requestfailed', req => { if (observations.request_failures.length < 80) observations.request_failures.push({ url: req.url(), error: req.failure()?.errorText || 'failed' }); });
}

async function installBehaviorProbe(page) {
  await page.addInitScript(() => {
    const P = window.__DINI_LIFECYCLE_PROBE__ = { plays: [], pauses: [], events: [], timeouts: [] };
    const srcOf = el => String(el.currentSrc || el.src || el.querySelector?.('source[src]')?.src || '');
    const nativePlay = HTMLMediaElement.prototype.play;
    const nativePause = HTMLMediaElement.prototype.pause;
    const nativeSetTimeout = window.setTimeout.bind(window);
    HTMLMediaElement.prototype.play = function(...args) {
      P.plays.push({ tag: this.tagName, src: srcOf(this), at: performance.now() });
      try { const out = nativePlay.apply(this, args); if (out?.catch) out.catch(() => {}); return out || Promise.resolve(); } catch { return Promise.resolve(); }
    };
    HTMLMediaElement.prototype.pause = function(...args) {
      P.pauses.push({ tag: this.tagName, src: srcOf(this), at: performance.now() });
      try { return nativePause.apply(this, args); } catch { return undefined; }
    };
    window.setTimeout = function(fn, delay, ...args) {
      const d = Number(delay || 0);
      if (Number.isFinite(d) && P.timeouts.length < 300) P.timeouts.push({ delay: d, at: performance.now() });
      return nativeSetTimeout(fn, delay, ...args);
    };
    for (const ev of ['play','pause','ended','loadedmetadata','canplay']) {
      document.addEventListener(ev, e => {
        const t = e.target;
        if (t instanceof HTMLMediaElement && P.events.length < 200) P.events.push({ type: ev, tag: t.tagName, src: srcOf(t), at: performance.now() });
      }, true);
    }
  });
}

try {
  const compilerPage = await context.newPage();
  attachObservers(compilerPage);
  await compilerPage.goto('about:blank');
  await compilerPage.addScriptTag({ path: 'assets/js/visual-resolver.js' });
  await compilerPage.addScriptTag({ path: 'assets/js/source-truth-scanner-v1.js' });
  await compilerPage.addScriptTag({ path: 'assets/js/source-runtime-compiler-v1.js' });
  await compilerPage.addScriptTag({ path: 'assets/js/source-runtime-authority-v1.js' });

  const compiled = await compilerPage.evaluate(({ sourceHtml, sourceUrl, artifactHtml }) => {
    const VR = window.DiniVisualResolver;
    const A = window.DiniSourceRuntimeAuthority;
    const sourceDoc = new DOMParser().parseFromString(sourceHtml, 'text/html');
    const graph = VR.makeSourceGraph(sourceDoc, { baseUrl: sourceUrl, cssSources: [] });
    const artifactDoc = new DOMParser().parseFromString(artifactHtml, 'text/html');
    A.bindSourceTruth(artifactDoc, graph);
    VR.sanitizeRuntimeNoise(artifactDoc);

    const tpl = artifactDoc.querySelector('template[data-dini-source-truth]');
    const runtimeScript = artifactDoc.querySelector('script[data-dini-source-native-runtime]');
    let embedded = {};
    try { embedded = JSON.parse(tpl?.textContent || '{}'); } catch {}
    const safe = embedded?.lifecycle?.safe_plan || {};
    const delayed = (safe.on_open || []).filter(x => Number(x?.delay_ms || 0) > 0);
    const runtimeAfterTruth = Boolean(tpl && runtimeScript && (tpl.compareDocumentPosition(runtimeScript) & Node.DOCUMENT_POSITION_FOLLOWING));
    return {
      sourceTruthVersion: Number(embedded?.source_truth_version || 0),
      authority: embedded?.authority || {},
      lifecycleCounts: embedded?.lifecycle?.counts || {},
      scannerTimers: Array.isArray(embedded?.lifecycle?.timers) ? embedded.lifecycle.timers.length : 0,
      scannerEvents: Array.isArray(embedded?.lifecycle?.events) ? embedded.lifecycle.events.length : 0,
      safe: {
        open_selector: safe.open_selector || '',
        source_timer_count: Number(safe.source_timer_count || 0),
        on_open_count: (safe.on_open || []).length,
        delayed_count: delayed.length,
        delayed_ms: [...new Set(delayed.map(x => Number(x.delay_ms || 0)))].sort((a,b) => a-b),
        command_types: [...new Set((safe.on_open || []).map(x => x?.type).filter(Boolean))],
        play_selectors: (safe.on_open || []).filter(x => x?.type === 'play').map(x => x.selector || ''),
        synthetic_stagger: safe.synthetic_stagger === true,
        arbitrary_source_js: safe.arbitrary_source_js === true,
        uses_source_delays: safe.uses_source_delays === true
      },
      runtimePolicy: embedded?.runtime_policy || {},
      truthTemplate: Boolean(tpl),
      runtimeScript: Boolean(runtimeScript),
      runtimeScriptSafe: String(runtimeScript?.textContent || '').includes('data-dini-source-runtime'),
      runtimeAfterTruth,
      runtimeCount: artifactDoc.querySelectorAll('script[data-dini-source-native-runtime]').length,
      rebuiltHtml: '<!doctype html>\n' + artifactDoc.documentElement.outerHTML
    };
  }, { sourceHtml, sourceUrl: fixture.source_url, artifactHtml });

  check('capture:truth-v1', compiled.sourceTruthVersion >= 1, 'Pre-sanitize source capture produces Source Truth V1', '>=1', compiled.sourceTruthVersion);
  check('capture:authority', compiled.authority.editor_rule === 'consume-do-not-reinterpret', 'Captured graph is downstream authority', 'consume-do-not-reinterpret', compiled.authority.editor_rule);
  check('capture:lifecycle-events', compiled.scannerEvents > 0, 'Source capture preserves lifecycle event evidence', '>0', compiled.scannerEvents);
  check('capture:lifecycle-timers', compiled.scannerTimers > 0 || compiled.safe.source_timer_count > 0, 'Source capture preserves timer evidence', '>0', { scanner: compiled.scannerTimers, compiler: compiled.safe.source_timer_count });
  check('capture:open-selector', compiled.safe.open_selector === fixture.source_graph.open_selector, 'Safe plan preserves source open selector', fixture.source_graph.open_selector, compiled.safe.open_selector);
  check('capture:on-open', compiled.safe.on_open_count > 0, 'Safe plan contains on-open behavior', '>0', compiled.safe.on_open_count);
  check('capture:delayed', compiled.safe.delayed_count > 0, 'Safe plan keeps at least one source-authored delay', '>0', compiled.safe.delayed_ms);
  check('capture:no-stagger', compiled.safe.synthetic_stagger === false, 'No synthetic stagger is invented');
  check('capture:no-source-js', compiled.safe.arbitrary_source_js === false, 'Arbitrary source JavaScript remains disabled');
  check('capture:source-delay-authority', compiled.safe.uses_source_delays && compiled.runtimePolicy.source_delay_authoritative === true, 'Source delays remain authoritative');
  check('handoff:truth-template', compiled.truthTemplate, 'Source Truth is embedded into rebuilt artifact');
  check('handoff:runtime-single', compiled.runtimeCount === 1, 'Exactly one source-native safe runtime remains after sanitization', 1, compiled.runtimeCount);
  check('handoff:runtime-safe', compiled.runtimeScript && compiled.runtimeScriptSafe, 'Existing/legacy runtime is replaced with safe compiled runtime');
  check('handoff:runtime-after-truth', compiled.runtimeAfterTruth, 'Safe runtime is serialized after Source Truth template');
  observations.compiled = { ...compiled, rebuiltHtml: undefined };

  const runtimePage = await context.newPage();
  attachObservers(runtimePage);
  await installBehaviorProbe(runtimePage);
  const lifecycleUrl = 'https://road-to-final.local/template7-lifecycle-v2.html';
  await runtimePage.route(lifecycleUrl, route => route.fulfill({ status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }, body: compiled.rebuiltHtml }));
  await runtimePage.goto(lifecycleUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await runtimePage.waitForTimeout(700);

  const beforeOpen = await runtimePage.evaluate(() => {
    const visible = el => { if (!el) return false; const s = getComputedStyle(el), r = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity || 1) > .05 && r.width > 0 && r.height > 0; };
    const P = window.__DINI_LIFECYCLE_PROBE__ || {};
    return {
      runtimeMarker: document.documentElement.getAttribute('data-dini-source-runtime'),
      coverVisible: visible(document.querySelector('#cover')),
      openVisible: visible(document.querySelector('#tombolbuka,.tombolbuka')),
      bodyOverflowY: getComputedStyle(document.body).overflowY,
      plays: P.plays?.length || 0,
      timeouts: P.timeouts?.length || 0
    };
  });
  check('runtime:marker', Boolean(beforeOpen.runtimeMarker), 'Compiled safe runtime actually executes', true, beforeOpen.runtimeMarker);
  check('runtime:cover-before', beforeOpen.coverVisible, 'Cover is visible before opening');
  check('runtime:button-before', beforeOpen.openVisible, 'Open control is visible before opening');

  const countsBefore = { plays: beforeOpen.plays, timeouts: beforeOpen.timeouts };
  await runtimePage.locator('#tombolbuka,.tombolbuka').first().click({ timeout: 15000 });
  await runtimePage.waitForTimeout(750);
  const afterOpen = await runtimePage.evaluate(({ countsBefore }) => {
    const cover = document.querySelector('#cover');
    const s = cover ? getComputedStyle(cover) : null;
    const P = window.__DINI_LIFECYCLE_PROBE__ || { plays: [], timeouts: [] };
    return {
      coverDisplay: s?.display || null,
      coverOpacity: s ? Number(s.opacity || 1) : null,
      bodyOverflowY: getComputedStyle(document.body).overflowY,
      htmlOverflowY: getComputedStyle(document.documentElement).overflowY,
      plays: (P.plays || []).slice(countsBefore.plays),
      timeouts: (P.timeouts || []).slice(countsBefore.timeouts)
    };
  }, { countsBefore });
  check('runtime:cover-opened', afterOpen.coverDisplay === 'none' || Number(afterOpen.coverOpacity) < .2, 'Click dismisses the cover', 'hidden/opacity<0.2', { display: afterOpen.coverDisplay, opacity: afterOpen.coverOpacity });
  check('runtime:scroll-unlocked', afterOpen.bodyOverflowY !== 'hidden' && afterOpen.htmlOverflowY !== 'hidden', 'Click unlocks page scrolling', 'not hidden', { body: afterOpen.bodyOverflowY, html: afterOpen.htmlOverflowY });
  check('runtime:audio-play', afterOpen.plays.some(x => x.tag === 'AUDIO'), 'Open lifecycle calls audio playback', 'AUDIO play call', afterOpen.plays);
  check('runtime:bg-video-play', afterOpen.plays.some(x => x.tag === 'VIDEO' && /jawa-hitam-demo\.mp4/i.test(x.src)), 'Open lifecycle calls the authored background video', 'jawa-hitam-demo.mp4 VIDEO play call', afterOpen.plays);
  const scheduledDelays = afterOpen.timeouts.map(x => Number(x.delay || 0));
  check('runtime:source-delay-scheduled', compiled.safe.delayed_ms.some(d => scheduledDelays.some(x => Math.abs(x - d) <= 20)), 'Browser schedules a source-authored lifecycle delay', compiled.safe.delayed_ms, scheduledDelays.slice(0, 60));

  const carouselRoot = runtimePage.locator('[data-id="c7a6ff4"],.elementor-element-c7a6ff4').first();
  check('runtime:carousel-exists', await carouselRoot.count() > 0, 'Golden three-photo carousel exists');
  if (await carouselRoot.count()) {
    await carouselRoot.scrollIntoViewIfNeeded().catch(() => {});
    await runtimePage.waitForTimeout(350);
    const carBefore = await carouselRoot.evaluate(root => {
      const track = root.querySelector('.swiper-wrapper,.elementor-image-carousel-wrapper .swiper-wrapper,[data-native-carousel-track]') || root;
      return { transform: getComputedStyle(track).transform, scrollLeft: track.scrollLeft || 0, left: track.getBoundingClientRect().left };
    });
    await runtimePage.waitForTimeout(1400);
    const carAfter = await carouselRoot.evaluate(root => {
      const track = root.querySelector('.swiper-wrapper,.elementor-image-carousel-wrapper .swiper-wrapper,[data-native-carousel-track]') || root;
      return { transform: getComputedStyle(track).transform, scrollLeft: track.scrollLeft || 0, left: track.getBoundingClientRect().left };
    });
    const moved = carBefore.transform !== carAfter.transform || Math.abs(carBefore.scrollLeft - carAfter.scrollLeft) > 1 || Math.abs(carBefore.left - carAfter.left) > 1;
    check('runtime:carousel-moves', moved, 'Carousel changes position/transform over time', 'movement', { before: carBefore, after: carAfter });
  }

  const timeline = runtimePage.locator('[data-id="4528199"],.elementor-element-4528199').first();
  check('runtime:timeline-exists', await timeline.count() > 0, 'Golden timeline exists');
  if (await timeline.count()) {
    const yBefore = await runtimePage.evaluate(() => window.scrollY);
    await timeline.scrollIntoViewIfNeeded().catch(() => {});
    await runtimePage.waitForTimeout(700);
    const yAfter = await runtimePage.evaluate(() => window.scrollY);
    check('runtime:timeline-scroll', yAfter !== yBefore, 'Viewport can scroll from opening area to timeline', 'scrollY changes', { before: yBefore, after: yAfter });
  }
  await runtimePage.screenshot({ path: `${outDir}/01-runtime-opened-v2.png`, fullPage: false });

  const controlPage = await context.newPage();
  attachObservers(controlPage);
  await controlPage.setContent('<!doctype html><html><body><div class="preview-toolbar"></div><iframe id="previewFrame"></iframe></body></html>');
  await controlPage.evaluate(({ html }) => {
    window.editorToast = () => {};
    window.DINI_FETCH_V2 = { handoffFromUrl: () => ({ id: 'golden-lifecycle-v2' }), loadOrCreateSession: async () => ({ baseline: { manifest: { source_graph: { source_truth_version: 1, diagnostics: { animations: 1, lifecycle_events: 1, lifecycle_timers: 1, media: 1 } } } } }) };
    document.getElementById('previewFrame').srcdoc = html;
  }, { html: compiled.rebuiltHtml });
  await controlPage.locator('#previewFrame').evaluate(el => new Promise(resolve => { if (el.contentDocument?.readyState === 'complete') resolve(); else el.addEventListener('load', resolve, { once: true }); }));
  await controlPage.evaluate(() => {
    const doc = document.getElementById('previewFrame').contentDocument;
    const style = doc.createElement('style');
    style.textContent = '@keyframes diniLifecycleProbe{from{transform:translateX(0)}to{transform:translateX(20px)}}#diniLifecycleProbe{animation:diniLifecycleProbe 10s linear infinite}';
    doc.head.appendChild(style);
    const probe = doc.createElement('div'); probe.id = 'diniLifecycleProbe'; doc.body.appendChild(probe);
  });
  await controlPage.addScriptTag({ path: 'dashboard-admin-fetch-editor/fetch-runtime-control-v1.js' });
  await controlPage.waitForTimeout(200);
  check('control:loaded', await controlPage.evaluate(() => Boolean(window.DINI_FETCH_RUNTIME_CONTROL)), 'Fetch Runtime Control loads');

  await controlPage.evaluate(() => window.DINI_FETCH_RUNTIME_CONTROL.setMode('pause', { silent: true }));
  await controlPage.waitForTimeout(120);
  const paused = await controlPage.evaluate(() => { const d=document.getElementById('previewFrame').contentDocument; return { mode: window.DINI_FETCH_RUNTIME_CONTROL.mode, root: d.documentElement.getAttribute('data-dini-editor-runtime-mode'), states: d.getAnimations().map(a=>a.playState) }; });
  check('control:pause-mode', paused.mode === 'pause' && paused.root === 'pause', 'PAUSE mode reaches iframe');
  check('control:pause-freezes', paused.states.length > 0 && paused.states.every(x => x === 'paused'), 'PAUSE freezes Web Animations', 'all paused', paused.states);

  await controlPage.evaluate(() => window.DINI_FETCH_RUNTIME_CONTROL.setMode('live', { silent: true }));
  await controlPage.waitForTimeout(120);
  const live = await controlPage.evaluate(() => { const d=document.getElementById('previewFrame').contentDocument; return { mode: window.DINI_FETCH_RUNTIME_CONTROL.mode, root: d.documentElement.getAttribute('data-dini-editor-runtime-mode'), states: d.getAnimations().map(a=>a.playState) }; });
  check('control:live-mode', live.mode === 'live' && live.root === 'live', 'LIVE mode reaches iframe');
  check('control:live-resumes', live.states.some(x => x === 'running' || x === 'finished'), 'LIVE resumes animation', 'running/finished', live.states);

  await controlPage.evaluate(() => window.DINI_FETCH_RUNTIME_CONTROL.setMode('edit', { silent: true }));
  await controlPage.waitForTimeout(120);
  const edit = await controlPage.evaluate(() => { const d=document.getElementById('previewFrame').contentDocument; return { mode: window.DINI_FETCH_RUNTIME_CONTROL.mode, root: d.documentElement.getAttribute('data-dini-editor-runtime-mode'), states: d.getAnimations().map(a=>a.playState) }; });
  check('control:edit-mode', edit.mode === 'edit' && edit.root === 'edit', 'EDIT mode reaches iframe');
  check('control:edit-freezes', edit.states.length > 0 && edit.states.every(x => x === 'paused'), 'EDIT freezes playback without deleting animations', 'all paused', edit.states);

  const beforeReplay = await controlPage.locator('#previewFrame').getAttribute('srcdoc');
  await controlPage.evaluate(() => window.DINI_FETCH_RUNTIME_CONTROL.replay());
  await controlPage.waitForFunction(() => {
    const frame = document.getElementById('previewFrame');
    return window.DINI_FETCH_RUNTIME_CONTROL?.mode === 'live' && frame?.contentDocument?.readyState === 'complete' && frame.contentDocument.documentElement.getAttribute('data-dini-editor-runtime-mode') === 'live';
  }, null, { timeout: 6000 });
  const replay = await controlPage.evaluate(() => {
    const frame=document.getElementById('previewFrame'), d=frame.contentDocument, cover=d.querySelector('#cover'), s=cover?d.defaultView.getComputedStyle(cover):null;
    return { mode: window.DINI_FETCH_RUNTIME_CONTROL.mode, root: d.documentElement.getAttribute('data-dini-editor-runtime-mode'), srcdoc: frame.srcdoc, coverDisplay: s?.display || null, coverOpacity: s ? Number(s.opacity || 1) : null };
  });
  check('control:replay-live', replay.mode === 'live' && replay.root === 'live', 'REPLAY deterministically returns iframe to LIVE mode');
  check('control:replay-identical', replay.srcdoc === beforeReplay, 'REPLAY reloads identical snapshot string');
  check('control:replay-cover', replay.coverDisplay !== 'none' && Number(replay.coverOpacity) > .5, 'REPLAY restores cover initial state', 'visible', { display: replay.coverDisplay, opacity: replay.coverOpacity });

  observations.runtime = { beforeOpen, afterOpen, scheduledDelays };
  observations.control = { paused, live, edit, replay: { ...replay, srcdoc: undefined } };
  await compilerPage.close();
  await runtimePage.close();
  await controlPage.close();
} catch (err) {
  check('lifecycle:exception', false, String(err?.message || err));
  observations.exception = String(err?.stack || err);
} finally {
  await context.close().catch(() => {});
  await browser.close().catch(() => {});
}

const failed = checks.filter(x => !x.pass);
const report = {
  name: 'Template 7 — Road To Final Lifecycle Regression V2',
  fixture_version: fixture.version,
  template_id: fixture.template_id,
  browser: browserName,
  target_url: targetUrl,
  source_url: fixture.source_url,
  commit: process.env.GITHUB_SHA || null,
  ref: process.env.GITHUB_REF || null,
  checks_total: checks.length,
  checks_passed: checks.length - failed.length,
  checks_failed: failed.length,
  ok: failed.length === 0,
  checks,
  observations
};
await writeFile(`${outDir}/report.json`, JSON.stringify(report, null, 2));
console.log(`Template 7 Lifecycle Regression V2 [${browserName}]: ${report.ok ? 'PASS' : 'FAIL'} · ${report.checks_passed}/${report.checks_total}`);
for (const item of failed) console.error(`FAIL ${item.id}: ${item.detail}`);
if (failed.length) process.exit(1);
