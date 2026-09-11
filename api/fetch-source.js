const dns = require('node:dns').promises;
const net = require('node:net');

const MAX_BYTES = 3_500_000;
const TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 3;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function isPrivateIPv4(ip) {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some(n => Number.isNaN(n) || n < 0 || n > 255)) return true;
  return (
    p[0] === 0 || p[0] === 10 || p[0] === 127 ||
    (p[0] === 169 && p[1] === 254) ||
    (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
    (p[0] === 192 && p[1] === 168) ||
    (p[0] === 100 && p[1] >= 64 && p[1] <= 127) ||
    (p[0] === 192 && p[1] === 0 && p[2] === 0) ||
    (p[0] === 192 && p[1] === 0 && p[2] === 2) ||
    (p[0] === 198 && (p[1] === 18 || p[1] === 19)) ||
    (p[0] === 198 && p[1] === 51 && p[2] === 100) ||
    (p[0] === 203 && p[1] === 0 && p[2] === 113) ||
    p[0] >= 224
  );
}

function isPrivateIPv6(ip) {
  const v = ip.toLowerCase().split('%')[0];
  return (
    v === '::' || v === '::1' ||
    v.startsWith('fc') || v.startsWith('fd') ||
    /^fe[89ab]/.test(v) ||
    v.startsWith('ff') ||
    v.startsWith('2001:db8:') ||
    v.startsWith('::ffff:127.') ||
    v.startsWith('::ffff:10.') ||
    v.startsWith('::ffff:192.168.')
  );
}

function isBlockedIp(ip) {
  const family = net.isIP(ip);
  if (family === 4) return isPrivateIPv4(ip);
  if (family === 6) return isPrivateIPv6(ip);
  return true;
}

async function validateTarget(url) {
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Hanya URL http/https yang didukung.');
  if (url.username || url.password) throw new Error('URL dengan username/password tidak didukung.');
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) throw new Error('Host lokal/private diblok.');

  if (net.isIP(host)) {
    if (isBlockedIp(host)) throw new Error('IP lokal/private diblok.');
    return;
  }

  const answers = await dns.lookup(host, { all: true, verbatim: true });
  if (!answers.length) throw new Error('Hostname tidak dapat di-resolve.');
  if (answers.some(a => isBlockedIp(a.address))) throw new Error('Hostname mengarah ke jaringan lokal/private.');
}

async function readLimited(response) {
  const len = Number(response.headers.get('content-length') || 0);
  if (len && len > MAX_BYTES) throw new Error(`Source terlalu besar. Maks ${Math.round(MAX_BYTES / 1_000_000 * 10) / 10} MB.`);
  if (!response.body) return '';

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      try { await reader.cancel(); } catch {}
      throw new Error(`Source terlalu besar. Maks ${Math.round(MAX_BYTES / 1_000_000 * 10) / 10} MB.`);
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder('utf-8').decode(out);
}

async function fetchHtml(startUrl) {
  let current = new URL(startUrl);
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    await validateTarget(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response;
    try {
      response = await fetch(current.href, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'Accept': 'text/html,application/xhtml+xml;q=0.9,text/plain;q=0.5,*/*;q=0.1',
          'User-Agent': 'Mozilla/5.0 (compatible; DiniAnif-Fetch-Studio/1.1; +https://vercel.com/)'
        }
      });
    } finally {
      clearTimeout(timer);
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw new Error('Redirect tanpa Location header.');
      if (i === MAX_REDIRECTS) throw new Error('Terlalu banyak redirect.');
      current = new URL(location, current);
      continue;
    }

    if (!response.ok) throw new Error(`Website mengembalikan HTTP ${response.status}.`);
    const type = (response.headers.get('content-type') || '').toLowerCase();
    if (type && !/(text\/html|application\/xhtml\+xml|text\/plain)/.test(type)) {
      throw new Error(`Content-Type bukan HTML (${type.split(';')[0]}).`);
    }
    const html = await readLimited(response);
    if (!/<(?:!doctype|html|head|body|section|div)[\s>]/i.test(html)) throw new Error('Response tidak terlihat seperti HTML yang bisa dianalisis.');
    return { html, finalUrl: current.href, contentType: type || 'unknown' };
  }
  throw new Error('Fetch source gagal.');
}

module.exports = async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method || 'GET')) {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { ok: false, error: 'Method tidak didukung.' });
  }

  const rawUrl = req.method === 'POST' ? req.body?.url : req.query?.url;
  if (!rawUrl || typeof rawUrl !== 'string') return json(res, 400, { ok: false, error: 'URL wajib diisi.' });
  if (rawUrl.length > 2048) return json(res, 400, { ok: false, error: 'URL terlalu panjang.' });

  try {
    const result = await fetchHtml(rawUrl.trim());
    return json(res, 200, {
      ok: true,
      url: result.finalUrl,
      bytes: Buffer.byteLength(result.html, 'utf8'),
      contentType: result.contentType,
      html: result.html
    });
  } catch (err) {
    const aborted = err && (err.name === 'AbortError' || /aborted|timeout/i.test(err.message || ''));
    return json(res, aborted ? 504 : 422, { ok: false, error: aborted ? 'Fetch source timeout.' : (err.message || 'Fetch source gagal.') });
  }
};
