const { requireUser } = require('./_supabase-auth');
const crypto = require('node:crypto');

const enc = encodeURIComponent;
const awsEncode = (value) => enc(String(value)).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest();
const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return json(res, 405, { error: 'Method not allowed' });
  }

  try {
    await requireUser(req);
    const keyId = process.env.B2_KEY_ID;
    const secret = process.env.B2_APPLICATION_KEY;
    const bucket = process.env.B2_BUCKET_NAME;
    const rawEndpoint = process.env.B2_ENDPOINT;
    if (!keyId || !secret || !bucket || !rawEndpoint) {
      return json(res, 500, { error: 'Konfigurasi B2 belum lengkap di Vercel Environment Variables.' });
    }

    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const fileName = String(payload.fileName || 'template.zip');
    const fileSize = Number(payload.fileSize || 0);
    const contentType = String(payload.contentType || 'application/zip');
    if (!Number.isFinite(fileSize) || fileSize <= 0) return json(res, 400, { error: 'Ukuran file tidak valid.' });
    if (fileSize > 500 * 1024 * 1024) return json(res, 413, { error: 'Maksimum upload B2 untuk flow ini 500 MB.' });

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-120) || 'template.zip';
    const objectKey = `template-packages/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName}`;

    const endpoint = new URL(/^https?:\/\//i.test(rawEndpoint) ? rawEndpoint : `https://${rawEndpoint}`);
    const host = endpoint.host;
    const regionMatch = host.match(/^s3\.([^.]+)\.backblazeb2\.com$/i);
    const region = regionMatch ? regionMatch[1] : 'us-west-004';
    const service = 's3';
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const expires = 900;
    const scope = `${dateStamp}/${region}/${service}/aws4_request`;
    const credential = `${keyId}/${scope}`;
    const canonicalUri = '/' + [bucket, ...objectKey.split('/')].map(awsEncode).join('/');

    const queryPairs = [
      ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
      ['X-Amz-Credential', credential],
      ['X-Amz-Date', amzDate],
      ['X-Amz-Expires', String(expires)],
      ['X-Amz-SignedHeaders', 'host']
    ];
    const canonicalQuery = queryPairs
      .map(([k, v]) => [awsEncode(k), awsEncode(v)])
      .sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]))
      .map(([k, v]) => `${k}=${v}`).join('&');

    const canonicalRequest = ['PUT', canonicalUri, canonicalQuery, `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');
    const kDate = hmac(Buffer.from('AWS4' + secret, 'utf8'), dateStamp);
    const kRegion = hmac(kDate, region);
    const kService = hmac(kRegion, service);
    const kSigning = hmac(kService, 'aws4_request');
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');
    const uploadUrl = `${endpoint.origin}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;

    return json(res, 200, { uploadUrl, objectKey, bucket, expiresIn: expires, contentType });
  } catch (err) {
    console.error('b2-sign-upload', err);
    return json(res, err?.statusCode || 500, { error: err?.message || String(err) });
  }
};
