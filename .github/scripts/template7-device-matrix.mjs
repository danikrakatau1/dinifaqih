import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium, webkit } from 'playwright';

const fixture = JSON.parse(await readFile('golden-tests/template-7/fixture.json', 'utf8'));
const profile = String(process.env.DEVICE_PROFILE || 'desktop').toLowerCase();
const browserName = String(process.env.BROWSER_ENGINE || (profile === 'iphone' ? 'webkit' : 'chromium')).toLowerCase();
const outDir = `device-matrix-artifacts/${profile}`;
await mkdir(outDir, { recursive: true });

const profiles = {
  desktop: {
    viewport: { width: 1440, height: 900 },
    screen: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false
  },
  android: {
    viewport: { width: 412, height: 915 },
    screen: { width: 412, height: 915 },
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'
  },
  iphone: {
    viewport: { width: 393, height: 852 },
    screen: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1'
  }
};

if (!profiles[profile]) throw new Error(`Unknown DEVICE_PROFILE: ${profile}`);
if (!['chromium', 'webkit'].includes(browserName)) throw new Error(`Unknown BROWSER_ENGINE: ${browserName}`);

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

// Always prove the browser is testing the exact pinned Golden artifact first.
const artifactResponse = await fetch(targetUrl, {
  redirect: 'follow',
  signal: AbortSignal.timeout(30000),
  headers: { 'user-agent': 'DiniFaqih-RoadToFinal-DeviceMatrix/1.0' }
});
const artifactBuffer = Buffer.from(await artifactResponse.arrayBuffer());
const pin = fixture.artifacts['index.html'];
check('artifact:http', artifactResponse.ok, 'Pinned Template 7 artifact is reachable', true, artifactResponse.status);
check('artifact:bytes', artifactBuffer.length === pin.bytes, 'Browser target byte length matches Golden fixture', pin.bytes, artifactBuffer.length);
check('artifact:md5', md5(artifactBuffer) === pin.md5, 'Browser target hash matches Golden fixture', pin.md5, md5(artifactBuffer));

const browserType = browserName === 'webkit' ? webkit : chromium;
const launchOptions = browserName === 'chromium'
  ? { headless: true, args: ['--autoplay-policy=no-user-gesture-required'] }
  : { headless: true };
const browser = await browserType.launch(launchOptions);
const context = await browser.newContext({
  ...profiles[profile],
  locale: 'id-ID',
  timezoneId: 'Asia/Jakarta',
  colorScheme: 'light',
  reducedMotion: 'no-preference',
  javaScriptEnabled: true,
  serviceWorkers: 'block'
});
const page = await context.newPage();
page.setDefaultTimeout(20000);
page.on('console', msg => {
  if (msg.type() === 'error' && observations.console_errors.length < 30) observations.console_errors.push(msg.text());
});
page.on('pageerror', err => {
  if (observations.page_errors.length < 30) observations.page_errors.push(String(err?.message || err));
});
page.on('requestfailed', req => {
  if (observations.request_failures.length < 30) observations.request_failures.push({ url: req.url(), error: req.failure()?.errorText || 'failed' });
});

try {
  const nav = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  check('browser:navigation', Boolean(nav) && nav.status() < 400, 'Golden artifact renders as a browser document', '<400', nav?.status() ?? null);
  await page.waitForTimeout(4500);

  const initial = await page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    const cover = document.querySelector('#cover');
    const open = document.querySelector('#tombolbuka,.tombolbuka');
    const opening = document.querySelector('[data-id="36dc2bf"],.elementor-element-36dc2bf');
    const isVisible = el => {
      if (!el) return false;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity || 1) > 0 && r.width > 0 && r.height > 0;
    };
    const overflowMode = [getComputedStyle(html).overflowX, body ? getComputedStyle(body).overflowX : 'visible'];
    const scrollDelta = Math.max(0, html.scrollWidth - html.clientWidth);
    const userScrollableX = scrollDelta > 4 && !overflowMode.some(v => v === 'hidden' || v === 'clip');
    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      clientWidth: html.clientWidth,
      scrollWidth: html.scrollWidth,
      scrollHeight: html.scrollHeight,
      overflowMode,
      userScrollableX,
      mobileMedia: matchMedia('(max-width: 767px)').matches,
      portraitMedia: matchMedia('(orientation: portrait)').matches,
      coverExists: Boolean(cover),
      coverVisible: isVisible(cover),
      openExists: Boolean(open),
      openVisible: isVisible(open),
      openingExists: Boolean(opening),
      openingVisible: isVisible(opening),
      title: document.title
    };
  });

  const expectedViewport = profiles[profile].viewport;
  check('layout:viewport-width', Math.abs(initial.innerWidth - expectedViewport.width) <= 2, 'CSS viewport width matches device profile', expectedViewport.width, initial.innerWidth);
  check('layout:viewport-height', Math.abs(initial.innerHeight - expectedViewport.height) <= 4, 'CSS viewport height matches device profile', expectedViewport.height, initial.innerHeight);
  check('layout:responsive-media', initial.mobileMedia === (profile !== 'desktop'), 'Elementor mobile breakpoint resolves correctly for this profile', profile !== 'desktop', initial.mobileMedia);
  check('layout:portrait', initial.portraitMedia === true, 'Road-to-Final device profiles are portrait/desktop-safe test viewports', true, initial.portraitMedia);
  check('dom:cover', initial.coverExists, 'Golden cover remains in rendered artifact');
  check('dom:open-control', initial.openExists, 'Open Invitation control remains in rendered artifact');
  check('dom:open-visible', initial.openVisible, 'Open Invitation control is visible and reachable on this device');
  check('dom:opening-section', initial.openingExists, 'Opening motion section remains in rendered artifact');
  check('layout:no-user-horizontal-scroll-initial', !initial.userScrollableX, 'Initial state has no user-visible horizontal scroll regression', false, initial.userScrollableX);
  check('layout:document-has-content', initial.scrollHeight > expectedViewport.height, 'Document contains content beyond one viewport', `>${expectedViewport.height}`, initial.scrollHeight);

  await page.screenshot({ path: `${outDir}/01-cover.png`, fullPage: false });

  let openClick = false;
  try {
    const openLocator = page.locator('#tombolbuka,.tombolbuka').first();
    await openLocator.scrollIntoViewIfNeeded();
    await openLocator.click({ timeout: 15000 });
    openClick = true;
  } catch (err) {
    observations.open_click_error = String(err?.message || err);
  }
  check('interaction:open-control-click', openClick, 'Open Invitation control accepts a real browser click on this device');

  await page.waitForTimeout(4500);
  const opened = await page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    const opening = document.querySelector('[data-id="36dc2bf"],.elementor-element-36dc2bf');
    const video = opening?.querySelector('video, .elementor-background-video-hosted');
    const r = opening?.getBoundingClientRect();
    const s = opening ? getComputedStyle(opening) : null;
    const overflowMode = [getComputedStyle(html).overflowX, body ? getComputedStyle(body).overflowX : 'visible'];
    const scrollDelta = Math.max(0, html.scrollWidth - html.clientWidth);
    return {
      scrollWidth: html.scrollWidth,
      clientWidth: html.clientWidth,
      scrollHeight: html.scrollHeight,
      userScrollableX: scrollDelta > 4 && !overflowMode.some(v => v === 'hidden' || v === 'clip'),
      openingVisible: Boolean(opening && s && s.display !== 'none' && s.visibility !== 'hidden' && r && r.width > 0 && r.height > 0),
      openingWidth: r?.width || 0,
      videoExists: Boolean(video),
      videoReadyState: video?.readyState ?? null
    };
  });
  check('opened:opening-visible', opened.openingVisible, 'Main opening section is renderable after opening the invitation');
  check('opened:opening-width', opened.openingWidth > 0 && opened.openingWidth <= expectedViewport.width + 8, 'Opening section fits the CSS viewport', `0..${expectedViewport.width + 8}`, opened.openingWidth);
  check('layout:no-user-horizontal-scroll-opened', !opened.userScrollableX, 'Opened state has no user-visible horizontal scroll regression', false, opened.userScrollableX);
  await page.screenshot({ path: `${outDir}/02-opened.png`, fullPage: false });

  await page.evaluate(() => window.scrollTo({ top: Math.max(0, (document.documentElement.scrollHeight - innerHeight) * 0.5), behavior: 'instant' }));
  await page.waitForTimeout(1200);
  const middle = await page.evaluate(() => ({
    scrollY: window.scrollY,
    scrollHeight: document.documentElement.scrollHeight,
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    timelineExists: Boolean(document.querySelector('[data-id="4528199"],.elementor-element-4528199')),
    carouselExists: Boolean(document.querySelector('[data-id="c7a6ff4"],.elementor-element-c7a6ff4'))
  }));
  check('midpage:scroll', middle.scrollY > 0, 'Real browser can scroll the invitation on this device', '>0', middle.scrollY);
  check('midpage:timeline-preserved', middle.timelineExists, 'Timeline widget remains in device render');
  check('midpage:carousel-preserved', middle.carouselExists, 'Carousel widget remains in device render');
  await page.screenshot({ path: `${outDir}/03-midpage.png`, fullPage: false });

  observations.initial = initial;
  observations.opened = opened;
  observations.middle = middle;
} catch (err) {
  check('device-matrix:exception', false, String(err?.message || err));
  observations.exception = String(err?.stack || err);
} finally {
  await context.close().catch(() => {});
  await browser.close().catch(() => {});
}

const failed = checks.filter(x => !x.pass);
const report = {
  name: 'Template 7 — Road To Final Device Matrix',
  fixture_version: fixture.version,
  template_id: fixture.template_id,
  profile,
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
console.log(`Template 7 Device Matrix [${profile}/${browserName}]: ${report.ok ? 'PASS' : 'FAIL'} · ${report.checks_passed}/${report.checks_total}`);
for (const item of failed) console.error(`FAIL ${item.id}: ${item.detail}`);
if (failed.length) process.exit(1);
