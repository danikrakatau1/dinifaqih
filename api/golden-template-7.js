const crypto = require('node:crypto');
const fixture = require('../golden-tests/template-7/fixture.json');

function reply(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body, null, 2));
}

async function fetchBuffer(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      redirect: 'follow',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'User-Agent': 'DiniFaqih-Golden-Test/1.0 (+road-to-final)',
        'Accept': '*/*'
      }
    });
    if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
    return { buffer: Buffer.from(await r.arrayBuffer()), headers: r.headers, finalUrl: r.url };
  } finally {
    clearTimeout(timer);
  }
}

const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const text = b => b.toString('utf8');

function check(list, id, pass, detail, expected = undefined, actual = undefined) {
  list.push({ id, pass: !!pass, detail, ...(expected !== undefined ? { expected } : {}), ...(actual !== undefined ? { actual } : {}) });
}

module.exports = async function handler(req, res) {
  if ((req.method || 'GET') !== 'GET') {
    res.setHeader('Allow', 'GET');
    return reply(res, 405, { ok: false, error: 'GET only' });
  }

  const checks = [];
  try {
    const [sourceRes, indexRes, nativeRes, manifestRes] = await Promise.all([
      fetchBuffer(fixture.source_url),
      fetchBuffer(fixture.artifact_base + 'index.html'),
      fetchBuffer(fixture.artifact_base + 'source-native.html'),
      fetchBuffer(fixture.artifact_base + 'manifest.json')
    ]);

    const sourceHtml = text(sourceRes.buffer);
    const indexHtml = text(indexRes.buffer);
    const nativeHtml = text(nativeRes.buffer);
    const manifestText = text(manifestRes.buffer);
    let manifest = null;
    try { manifest = JSON.parse(manifestText); } catch (e) {}

    for (const marker of fixture.source_markers) {
      check(checks, `source-marker:${marker}`, sourceHtml.includes(marker), `Source contains ${marker}`);
    }

    const indexPinned = fixture.artifacts['index.html'];
    const nativePinned = fixture.artifacts['source-native.html'];
    const manifestPinned = fixture.artifacts['manifest.json'];

    check(checks, 'artifact:index-bytes', indexRes.buffer.length === indexPinned.bytes, 'index.html byte length pinned', indexPinned.bytes, indexRes.buffer.length);
    check(checks, 'artifact:index-md5', md5(indexRes.buffer) === indexPinned.md5, 'index.html content hash pinned', indexPinned.md5, md5(indexRes.buffer));
    check(checks, 'artifact:native-bytes', nativeRes.buffer.length === nativePinned.bytes, 'source-native.html byte length pinned', nativePinned.bytes, nativeRes.buffer.length);
    check(checks, 'artifact:native-md5', md5(nativeRes.buffer) === nativePinned.md5, 'source-native.html content hash pinned', nativePinned.md5, md5(nativeRes.buffer));
    check(checks, 'artifact:index-equals-native', indexRes.buffer.equals(nativeRes.buffer), 'Saved index.html equals source-native.html exactly');
    check(checks, 'artifact:manifest-bytes', manifestRes.buffer.length === manifestPinned.bytes, 'manifest.json byte length pinned', manifestPinned.bytes, manifestRes.buffer.length);
    check(checks, 'artifact:manifest-md5', md5(manifestRes.buffer) === manifestPinned.md5, 'manifest.json content hash pinned', manifestPinned.md5, md5(manifestRes.buffer));

    check(checks, 'manifest:parse', !!manifest, 'manifest.json parses as JSON');
    if (manifest) {
      check(checks, 'manifest:source-url', manifest.source_url === fixture.source_url || manifest.origin_source_url === fixture.source_url, 'Manifest points to ART JAWA HITAM', fixture.source_url, manifest.source_url || manifest.origin_source_url || '');
      check(checks, 'manifest:baseline-hash', manifest.baseline_hash === fixture.baseline_hash, 'Template 7 baseline hash pinned', fixture.baseline_hash, manifest.baseline_hash);
      check(checks, 'manifest:fetch-handoff', manifest.fetch_handoff_id === fixture.fetch_handoff_id, 'Template 7 Fetch handoff pinned', fixture.fetch_handoff_id, manifest.fetch_handoff_id);
      const graph = manifest.source_graph || {};
      const visuals = Array.isArray(graph.visuals) ? graph.visuals : [];
      const interactions = Array.isArray(graph.interactions) ? graph.interactions : [];
      check(checks, 'manifest:open-selector', interactions.some(x => x?.type === 'open-invitation' && x?.selector === fixture.source_graph.open_selector), 'Open Invitation selector preserved', fixture.source_graph.open_selector);

      const vg = fixture.source_graph.video_background;
      check(checks, 'manifest:video-background', visuals.some(x => x?.type === 'video-background' && x?.element_id === vg.element_id && String(x?.url || '').endsWith(vg.url_suffix)), 'Opening video background ownership preserved', vg);

      for (const s of fixture.source_graph.slideshows) {
        const found = visuals.find(x => x?.type === 'slideshow' && x?.element_id === s.element_id);
        check(checks, `manifest:slideshow:${s.element_id}`, !!found && Number(found.duration) === s.duration && String(found.transition || '') === s.transition && Number(found.transition_duration) === s.transition_duration && Boolean(found.ken_burns) === s.ken_burns && (!s.ken_burns_direction || found.ken_burns_direction === s.ken_burns_direction), 'Slideshow timing/transition pinned', s, found || null);
      }

      for (const c of fixture.source_graph.critical_css) {
        check(checks, `manifest:css-owner:${c.element_id}`, visuals.some(x => x?.element_id === c.element_id && String(x?.url || '').endsWith(c.url_suffix) && /external-css/.test(String(x?.source_location || ''))), 'Critical CSS visual ownership preserved', c);
      }
    }

    const cssHrefMatch = sourceHtml.match(/https?:[^"']*\/uploads\/elementor\/css\/post-340856\.css[^"']*/i);
    check(checks, 'source:post-css-link', !!cssHrefMatch, 'Source exposes Elementor post-340856.css');
    if (cssHrefMatch) {
      const cssUrl = cssHrefMatch[0].replaceAll('&amp;', '&');
      const cssRes = await fetchBuffer(cssUrl);
      const css = text(cssRes.buffer);
      for (const marker of ['jawa-cvr-1.jpg', 'X-JAWA-HITAM.jpg', 'back-DEMO.jpg']) {
        check(checks, `source-css:${marker}`, css.includes(marker), `Critical Elementor CSS contains ${marker}`);
      }
    }

    const failed = checks.filter(x => !x.pass);
    return reply(res, failed.length ? 409 : 200, {
      ok: failed.length === 0,
      golden: fixture.name,
      template_id: fixture.template_id,
      source_url: fixture.source_url,
      checks_total: checks.length,
      checks_passed: checks.length - failed.length,
      checks_failed: failed.length,
      checks,
      note: 'Server probe validates pinned source/artifact contract. Browser engine graph/lifecycle validation runs in /golden-tests/template-7/.'
    });
  } catch (err) {
    return reply(res, 500, {
      ok: false,
      golden: fixture.name,
      error: err?.name === 'AbortError' ? 'Golden probe timeout.' : (err?.message || String(err)),
      checks
    });
  }
};
