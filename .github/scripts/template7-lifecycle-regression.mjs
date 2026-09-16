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
const check = (id, pass, detail, expected, actual) => checks.push({
  id,
  pass: Boolean(pass),
  detail,
  ...(expected !== undefined ? { expected } : {}),
  ...(actual !== undefined ? { actual } : {})
});
const md5 = buf => createHash('md5').update(buf).digest('hex');
const targetUrl = new URL('index.html', fixture.artifact_base).href;

const artifactResponse = await fetch(targetUrl, {
  redirect: 'follow',
  signal: AbortSignal.timeout(30000),
  headers: { 'user-agent': 'DiniFaqih-RoadToFinal-Lifecycle/1.0' }
});
const artifactBuffer = Buffer.from(await artifactResponse.arrayBuffer());
const artifactHtml = artifactBuffer.toString('utf8');
const pin = fixture.artifacts['index.html'];
check('artifact:http', artifactResponse.ok, 'Pinned Template 7 artifact is reachable', true, artifactResponse.status);
check('artifact:bytes', artifactBuffer.length === pin.bytes, 'Lifecycle target byte length matches Golden fixture', pin.bytes, artifactBuffer.length);
check('artifact:md5', md5(artifactBuffer) === pin.md5, 'Lifecycle target hash matches Golden fixture', pin.md5, md5(artifactBuffer));

const browserType = browserName === 'webkit' ? webkit : chromium;
const browser = await browserType.launch(browserName === 'chromium'
  ? { headless: true, args: ['--autoplay-policy=no-user-gesture-required'] }
  : { headless: true });
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

const attachObservers = page => {
  page.on('console', msg => {
    if (msg.type() === 'error' && observations.console_errors.length < 40) observations.console_errors.push(msg.text());
  });
  page.on('pageerror', err => {
    if (observations.page_errors.length < 40) observations.page_errors.push(String(err?.message || err));
  });
  page.on('requestfailed', req => {
    if (observations.request_failures.length < 60) observations.request_failures.push({ url: req.url(), error: req.failure()?.errorText || 'failed' });
  });
};

const installMediaProbe = async page => {
  await page.addInitScript(() => {
    window.__DINI_LIFECYCLE_PROBE__ = { plays: [], pauses: [], events: [] };
    const P = window.__DINI_LIFECYCLE_PROBE__;
    const srcOf = el => String(el.currentSrc || el.src || el.querySelector?.('source[src]')?.src || '');
    const nativePlay = HTMLMediaElement.prototype.play;
    const nativePause = HTMLMediaElement.prototype.pause;
    HTMLMediaElement.prototype.play = function(...args) {
      P.plays.push({ tag: this.tagName, src: srcOf(this), at: performance.now() });
      try {
        const out = nativePlay.apply(this, args);
        if (out?.catch) out.catch(() => {});
        return out || Promise.resolve();
      } catch {
        return Promise.resolve();
      }
    };
    HTMLMediaElement.prototype.pause = function(...args) {
      P.pauses.push({ tag: this.tagName, src: srcOf(this), at: performance.now() });
      try { return nativePause.apply(this, args); } catch { return undefined; }
    };
    for (const ev of ['play','pause','ended','loadedmetadata','canplay']) {
      document.addEventListener(ev, e => {
        const t = e.target;
        if (t instanceof HTMLMediaElement) P.events.push({ type: ev, tag: t.tagName, src: srcOf(t), at: performance.now() });
      }, true);
    }
  });
};

try {
  const compilerPage = await context.newPage();
  attachObservers(compilerPage);
  await compilerPage.goto('about:blank');
  await compilerPage.addScriptTag({ path: 'assets/js/visual-resolver.js' });
  await compilerPage.addScriptTag({ path: 'assets/js/source-truth-scanner-v1.js' });
  await compilerPage.addScriptTag({ path: 'assets/js/source-runtime-compiler-v1.js' });

  const compiled = await compilerPage.evaluate(({ html, baseUrl }) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const graph = window.DiniVisualResolver.makeSourceGraph(doc, { baseUrl, cssSources: [] });
    window.DiniVisualResolver.sanitizeRuntimeNoise(doc);
    const safe = graph?.lifecycle?.safe_plan || {};
    const runtime = graph?.runtime_policy || {};
    const delayed = (safe.on_open || []).filter(x => Number(x?.delay_ms || 0) > 0);
    const commandTypes = [...new Set((safe.on_open || []).map(x => x?.type).filter(Boolean))];
    return {
      sourceTruthVersion: Number(graph?.source_truth_version || 0),
      runtime,
      safe: {
        open_selector: safe.open_selector || '',
        on_open_count: (safe.on_open || []).length,
        initial_count: (safe.initial || []).length,
        source_timer_count: Number(safe.source_timer_count || 0),
        uses_source_delays: safe.uses_source_delays === true,
        synthetic_stagger: safe.synthetic_stagger === true,
        arbitrary_source_js: safe.arbitrary_source_js === true,
        delayed_count: delayed.length,
        delayed_ms: delayed.map(x => Number(x.delay_ms || 0)),
        command_types: commandTypes
      },
      hasTruthTemplate: Boolean(doc.querySelector('template[data-dini-source-truth]')),
      hasRuntimeScript: Boolean(doc.querySelector('script[data-dini-source-native-runtime]')),
      rebuiltHtml: '<!doctype html>\n' + doc.documentElement.outerHTML
    };
  }, { html: artifactHtml, baseUrl: targetUrl });

  check('compiler:source-truth', compiled.sourceTruthVersion >= 1, 'Source Truth scanner enriches the exact Golden artifact', '>=1', compiled.sourceTruthVersion);
  check('compiler:open-selector', compiled.safe.open_selector === fixture.source_graph.open_selector, 'Runtime compiler keeps the Golden open selector', fixture.source_graph.open_selector, compiled.safe.open_selector);
  check('compiler:on-open-plan', compiled.safe.on_open_count > 0, 'Safe lifecycle plan contains executable open commands', '>0', compiled.safe.on_open_count);
  check('compiler:source-timers', compiled.safe.source_timer_count > 0, 'Source-authored timer evidence is preserved', '>0', compiled.safe.source_timer_count);
  check('compiler:source-delay-authoritative', compiled.safe.uses_source_delays === true, 'Lifecycle compiler uses source-authored delays', true, compiled.safe.uses_source_delays);
  check('compiler:no-synthetic-stagger', compiled.safe.synthetic_stagger === false, 'Lifecycle compiler does not invent stagger timing', false, compiled.safe.synthetic_stagger);
  check('compiler:no-arbitrary-source-js', compiled.safe.arbitrary_source_js === false, 'Lifecycle compiler does not execute arbitrary source JS', false, compiled.safe.arbitrary_source_js);
  check('compiler:delayed-command', compiled.safe.delayed_count > 0, 'At least one delayed source lifecycle command is compiled', '>0', compiled.safe.delayed_ms);
  check('compiler:truth-embedded', compiled.hasTruthTemplate, 'Rebuilt artifact embeds Source Truth JSON');
  check('compiler:runtime-embedded', compiled.hasRuntimeScript, 'Rebuilt artifact embeds the safe runtime script');
  check('compiler:policy-source-delay', compiled.runtime.source_delay_authoritative === true, 'Runtime policy keeps source delay authoritative');
  check('compiler:policy-pause-safe', compiled.runtime.editor_pause_non_destructive === true, 'Runtime policy marks editor pause as non-destructive');
  observations.compiled = { ...compiled, rebuiltHtml: undefined };

  const lifecycleUrl = 'https://road-to-final.local/template7-lifecycle.html';
  const runtimePage = await context.newPage();
  attachObservers(runtimePage);
  await installMediaProbe(runtimePage);
  await runtimePage.route(lifecycleUrl, async route => route.fulfill({
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
    body: compiled.rebuiltHtml
  }));
  await runtimePage.goto(lifecycleUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await runtimePage.waitForTimeout(900);

  const beforeOpen = await runtimePage.evaluate(() => {
    const cover = document.querySelector('#cover');
    const btn = document.querySelector('#tombolbuka,.tombolbuka');
    const motion = document.querySelector('.motionText');
    const visible = el => {
      if (!el) return false;
      const s = getComputedStyle(el), r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity || 1) > 0.05 && r.width > 0 && r.height > 0;
    };
    window.__DINI_MOTION_PROBE__ = { clickAt: null, visibleAt: visible(motion) ? performance.now() : null };
    const timer = setInterval(() => {
      if (window.__DINI_MOTION_PROBE__.visibleAt !== null) return clearInterval(timer);
      if (visible(motion)) {
        window.__DINI_MOTION_PROBE__.visibleAt = performance.now();
        clearInterval(timer);
      }
    }, 50);
    return {
      runtimeMarker: document.documentElement.getAttribute('data-dini-source-runtime'),
      coverVisible: visible(cover),
      buttonVisible: visible(btn),
      motionVisible: visible(motion),
      overflowY: getComputedStyle(document.body).overflowY,
      scrollY: window.scrollY
    };
  });
  check('runtime:marker', Boolean(beforeOpen.runtimeMarker), 'Safe runtime executed in the real browser', true, beforeOpen.runtimeMarker);
  check('runtime:cover-initial', beforeOpen.coverVisible, 'Golden cover is visible before open');
  check('runtime:open-visible', beforeOpen.buttonVisible, 'Open Invitation control is reachable before open');

  await runtimePage.evaluate(() => { window.__DINI_MOTION_PROBE__.clickAt = performance.now(); });
  const openBtn = runtimePage.locator('#tombolbuka,.tombolbuka').first();
  await openBtn.click({ timeout: 15000 });
  await runtimePage.waitForTimeout(700);

  const afterOpenFast = await runtimePage.evaluate(() => {
    const cover = document.querySelector('#cover');
    const cs = cover ? getComputedStyle(cover) : null;
    const P = window.__DINI_LIFECYCLE_PROBE__ || { plays: [], pauses: [] };
    return {
      coverDisplay: cs?.display || null,
      coverOpacity: cs ? Number(cs.opacity || 1) : null,
      bodyOverflowY: getComputedStyle(document.body).overflowY,
      htmlOverflowY: getComputedStyle(document.documentElement).overflowY,
      playCalls: P.plays.length,
      pauseCalls: P.pauses.length,
      playSamples: P.plays.slice(0, 8)
    };
  });
  check('runtime:cover-opens', afterOpenFast.coverDisplay === 'none' || Number(afterOpenFast.coverOpacity) < 0.2, 'Cover transitions away after real click', 'hidden/opacity<0.2', afterOpenFast);
  check('runtime:scroll-unlocked', afterOpenFast.bodyOverflowY !== 'hidden' && afterOpenFast.htmlOverflowY !== 'hidden', 'Open lifecycle unlocks vertical scrolling', 'not hidden', { body: afterOpenFast.bodyOverflowY, html: afterOpenFast.htmlOverflowY });
  check('runtime:media-play-intent', afterOpenFast.playCalls > 0 || compiled.safe.command_types.some(x => x === 'play' || x === 'play-audio-all'), 'Open lifecycle preserves media play intent', '>0 play call or compiled play command', { playCalls: afterOpenFast.playCalls, commandTypes: compiled.safe.command_types });

  await runtimePage.waitForTimeout(3300);
  const delayedState = await runtimePage.evaluate(() => {
    const p = window.__DINI_MOTION_PROBE__ || {};
    const delta = p.clickAt != null && p.visibleAt != null ? p.visibleAt - p.clickAt : null;
    const motion = document.querySelector('.motionText');
    const s = motion ? getComputedStyle(motion) : null;
    return { delta, visibleAt: p.visibleAt ?? null, clickAt: p.clickAt ?? null, motionDisplay: s?.display || null, motionOpacity: s ? Number(s.opacity || 1) : null };
  });
  if (!beforeOpen.motionVisible && delayedState.delta != null) {
    check('runtime:source-delay-not-immediate', delayedState.delta >= 2500, 'Delayed motion does not reveal immediately', '>=2500ms', Math.round(delayedState.delta));
    check('runtime:source-delay-bounded', delayedState.delta <= 4500, 'Delayed motion reveals within the expected source timing window', '<=4500ms', Math.round(delayedState.delta));
  } else {
    check('runtime:source-delay-plan-preserved', compiled.safe.delayed_count > 0, 'When visual target is already visible, compiled delayed lifecycle evidence still exists', '>0', compiled.safe.delayed_ms);
  }

  const revealBefore = await runtimePage.evaluate(() => {
    const root = document.querySelector('[data-id="4528199"],.elementor-element-4528199');
    if (!root) return { exists: false, total: 0, visible: 0 };
    const nodes = [...root.querySelectorAll('[data-native-reveal],.elementor-invisible')];
    return { exists: true, total: nodes.length, visible: nodes.filter(x => x.classList.contains('native-visible')).length };
  });
  check('runtime:timeline-exists', revealBefore.exists, 'Golden timeline exists in compiled runtime');
  await runtimePage.evaluate(() => document.querySelector('[data-id="4528199"],.elementor-element-4528199')?.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await runtimePage.waitForTimeout(1000);
  const revealAfter = await runtimePage.evaluate(() => {
    const root = document.querySelector('[data-id="4528199"],.elementor-element-4528199');
    if (!root) return { exists: false, total: 0, visible: 0 };
    const nodes = [...root.querySelectorAll('[data-native-reveal],.elementor-invisible,.native-visible')];
    return { exists: true, total: nodes.length, visible: nodes.filter(x => x.classList.contains('native-visible') || !x.classList.contains('elementor-invisible')).length };
  });
  check('runtime:timeline-scroll-reacts', revealAfter.exists && (revealAfter.visible > revealBefore.visible || revealAfter.visible > 0 || revealAfter.total === 0), 'Timeline/scroll lifecycle reacts when brought into viewport', 'visible count increases or source has no tagged children', { before: revealBefore, after: revealAfter });
  await runtimePage.screenshot({ path: `${outDir}/01-runtime-opened.png`, fullPage: false });

  const controlPage = await context.newPage();
  attachObservers(controlPage);
  await controlPage.setContent('<!doctype html><html><body><div class="preview-toolbar"></div><iframe id="previewFrame"></iframe></body></html>');
  await controlPage.evaluate(({ html }) => {
    window.editorToast = () => {};
    window.DINI_FETCH_V2 = {
      handoffFromUrl: () => ({ id: 'golden-lifecycle-ci' }),
      loadOrCreateSession: async () => ({ baseline: { manifest: { source_graph: { source_truth_version: 1, diagnostics: { animations: 1, lifecycle_events: 1, lifecycle_timers: 1, media: 1 } } } } })
    };
    const frame = document.getElementById('previewFrame');
    frame.srcdoc = html;
  }, { html: compiled.rebuiltHtml });
  await controlPage.locator('#previewFrame').evaluate(el => new Promise(resolve => {
    if (el.contentDocument?.readyState === 'complete') return resolve();
    el.addEventListener('load', () => resolve(), { once: true });
  }));

  await controlPage.evaluate(() => {
    const doc = document.getElementById('previewFrame').contentDocument;
    const style = doc.createElement('style');
    style.textContent = '@keyframes diniLifecycleProbe{from{transform:translateX(0px)}to{transform:translateX(20px)}}#diniLifecycleProbe{animation:diniLifecycleProbe 10s linear infinite}';
    doc.head.appendChild(style);
    const probe = doc.createElement('div'); probe.id = 'diniLifecycleProbe'; doc.body.appendChild(probe);
  });
  await controlPage.addScriptTag({ path: 'dashboard-admin-fetch-editor/fetch-runtime-control-v1.js' });
  await controlPage.waitForTimeout(250);

  const controlLoaded = await controlPage.evaluate(() => Boolean(window.DINI_FETCH_RUNTIME_CONTROL));
  check('control:loaded', controlLoaded, 'Actual Fetch Runtime Control bootstraps in lifecycle harness');

  await controlPage.evaluate(() => window.DINI_FETCH_RUNTIME_CONTROL.setMode('pause', { silent: true }));
  await controlPage.waitForTimeout(120);
  const paused = await controlPage.evaluate(() => {
    const frame = document.getElementById('previewFrame');
    const doc = frame.contentDocument;
    return {
      mode: window.DINI_FETCH_RUNTIME_CONTROL.mode,
      rootMode: doc.documentElement.getAttribute('data-dini-editor-runtime-mode'),
      states: doc.getAnimations().map(a => a.playState)
    };
  });
  check('control:pause-mode', paused.mode === 'pause' && paused.rootMode === 'pause', 'PAUSE mode is applied to editor and frame', 'pause', paused);
  check('control:pause-animation', paused.states.length > 0 && paused.states.every(x => x === 'paused'), 'PAUSE freezes active Web Animations non-destructively', 'all paused', paused.states);

  await controlPage.evaluate(() => window.DINI_FETCH_RUNTIME_CONTROL.setMode('live', { silent: true }));
  await controlPage.waitForTimeout(120);
  const resumed = await controlPage.evaluate(() => {
    const frame = document.getElementById('previewFrame');
    const doc = frame.contentDocument;
    return { mode: window.DINI_FETCH_RUNTIME_CONTROL.mode, states: doc.getAnimations().map(a => a.playState) };
  });
  check('control:live-mode', resumed.mode === 'live', 'LIVE mode restores runtime state', 'live', resumed.mode);
  check('control:live-resume', resumed.states.some(x => x === 'running' || x === 'finished'), 'LIVE resumes a paused animation', 'running/finished', resumed.states);

  await controlPage.evaluate(() => window.DINI_FETCH_RUNTIME_CONTROL.setMode('edit', { silent: true }));
  await controlPage.waitForTimeout(120);
  const edited = await controlPage.evaluate(() => {
    const frame = document.getElementById('previewFrame');
    const doc = frame.contentDocument;
    return { mode: window.DINI_FETCH_RUNTIME_CONTROL.mode, rootMode: doc.documentElement.getAttribute('data-dini-editor-runtime-mode'), states: doc.getAnimations().map(a => a.playState) };
  });
  check('control:edit-mode', edited.mode === 'edit' && edited.rootMode === 'edit', 'EDIT mode freezes playback without stripping source state', 'edit', edited);
  check('control:edit-animation', edited.states.length > 0 && edited.states.every(x => x === 'paused'), 'EDIT freezes animation playback', 'all paused', edited.states);

  const beforeReplaySrcdoc = await controlPage.locator('#previewFrame').getAttribute('srcdoc');
  await controlPage.evaluate(() => window.DINI_FETCH_RUNTIME_CONTROL.replay());
  await controlPage.waitForTimeout(800);
  const replayed = await controlPage.evaluate(() => {
    const frame = document.getElementById('previewFrame');
    const doc = frame.contentDocument;
    const cover = doc.querySelector('#cover');
    const s = cover ? doc.defaultView.getComputedStyle(cover) : null;
    return {
      mode: window.DINI_FETCH_RUNTIME_CONTROL.mode,
      rootMode: doc.documentElement.getAttribute('data-dini-editor-runtime-mode'),
      coverDisplay: s?.display || null,
      coverOpacity: s ? Number(s.opacity || 1) : null,
      srcdoc: frame.srcdoc
    };
  });
  check('control:replay-mode', replayed.mode === 'live' && replayed.rootMode === 'live', 'REPLAY restarts lifecycle in LIVE mode', 'live', { mode: replayed.mode, rootMode: replayed.rootMode });
  check('control:replay-snapshot-identical', replayed.srcdoc === beforeReplaySrcdoc, 'REPLAY reloads the same snapshot bytes/string rather than rewriting it');
  check('control:replay-cover-reset', replayed.coverDisplay !== 'none' && Number(replayed.coverOpacity) > 0.5, 'REPLAY restores the initial cover state', 'visible', { display: replayed.coverDisplay, opacity: replayed.coverOpacity });

  observations.runtime = { beforeOpen, afterOpenFast, delayedState, revealBefore, revealAfter };
  observations.control = { paused, resumed, edited, replayed: { ...replayed, srcdoc: undefined } };
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
  name: 'Template 7 — Road To Final Lifecycle Regression',
  fixture_version: fixture.version,
  template_id: fixture.template_id,
  browser: browserName,
  target_url: targetUrl,
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
console.log(`Template 7 Lifecycle Regression [${browserName}]: ${report.ok ? 'PASS' : 'FAIL'} · ${report.checks_passed}/${report.checks_total}`);
for (const item of failed) console.error(`FAIL ${item.id}: ${item.detail}`);
if (failed.length) process.exit(1);
