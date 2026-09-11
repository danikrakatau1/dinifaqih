const { requireUser } = require('./_supabase-auth');

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

async function readResponse(resp) {
  const text = await resp.text();
  let data = {};
  try { data = JSON.parse(text); } catch {}
  return { resp, data, text };
}

function responseError(result, fallback) {
  const err = new Error(result.data?.message || result.data?.error || result.data?.code || fallback || `Backblaze HTTP ${result.resp.status}`);
  err.statusCode = result.resp.status;
  err.code = result.data?.code || '';
  return err;
}

async function authorizeB2(keyId, secret) {
  const basic = Buffer.from(`${keyId}:${secret}`, 'utf8').toString('base64');
  const result = await readResponse(await fetch('https://api.backblazeb2.com/b2api/v4/b2_authorize_account', {
    cache: 'no-store',
    headers: { Authorization: `Basic ${basic}` }
  }));
  if (!result.resp.ok) throw responseError(result, 'Authorize Backblaze gagal.');
  const storage = result.data?.apiInfo?.storageApi;
  const token = result.data?.authorizationToken;
  if (!storage?.apiUrl || !token) throw new Error('Response authorize B2 tidak valid.');
  return { storage, token };
}

async function nativeCall(state, path, options = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const url = new URL(state.storage.apiUrl + '/b2api/v4/' + path);
    for (const [k, v] of Object.entries(options.query || {})) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
    const init = {
      method: options.method || 'GET',
      cache: 'no-store',
      headers: { Authorization: state.token }
    };
    if (options.body) {
      init.headers['content-type'] = 'application/json';
      init.body = JSON.stringify(options.body);
    }
    const result = await readResponse(await fetch(url, init));
    if (result.resp.ok) return result.data;

    const code = String(result.data?.code || '');
    if (result.resp.status === 401 && /^(bad_auth_token|expired_auth_token)$/i.test(code) && attempt === 0) {
      const refreshed = await authorizeB2(state.keyId, state.secret);
      state.storage = refreshed.storage;
      state.token = refreshed.token;
      continue;
    }
    throw responseError(result);
  }
  throw new Error('Backblaze auth retry gagal.');
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
    const bucketName = process.env.B2_BUCKET_NAME;
    if (!keyId || !secret || !bucketName) return json(res, 500, { error: 'Konfigurasi B2 belum lengkap.' });

    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const objectKey = String(payload.objectKey || '').replace(/^\/+/, '');
    if (!objectKey || !objectKey.startsWith('template-packages/')) return json(res, 400, { error: 'Object key B2 tidak valid.' });

    const initial = await authorizeB2(keyId, secret);
    const state = { keyId, secret, storage: initial.storage, token: initial.token };
    const caps = new Set(state.storage.allowed?.capabilities || []);
    if (!caps.has('listFiles') || !caps.has('deleteFiles')) {
      throw new Error('Application Key B2 membutuhkan capability listFiles + deleteFiles untuk cleanup permanen.');
    }

    const allowedBuckets = Array.isArray(state.storage.allowed?.buckets) ? state.storage.allowed.buckets : [];
    const bucket = allowedBuckets.find(b => b?.name === bucketName) || (allowedBuckets.length === 1 ? allowedBuckets[0] : null);
    if (!bucket?.id) throw new Error('Bucket ID tidak tersedia untuk Application Key ini.');

    const listed = await nativeCall(state, 'b2_list_file_versions', {
      method: 'GET',
      query: { bucketId: bucket.id, prefix: objectKey, maxFileCount: 1000 }
    });
    const versions = (listed.files || []).filter(f => f.fileName === objectKey && f.fileId);
    let deleted = 0;
    for (const f of versions) {
      await nativeCall(state, 'b2_delete_file_version', {
        method: 'POST',
        body: { fileName: f.fileName, fileId: f.fileId }
      });
      deleted++;
    }

    return json(res, 200, { ok: true, objectKey, bucket: bucketName, versionsDeleted: deleted });
  } catch (err) {
    console.error('b2-sign-delete', err);
    return json(res, err?.statusCode || 500, { error: err?.message || String(err), code: err?.code || undefined });
  }
};
