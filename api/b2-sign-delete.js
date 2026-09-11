const { requireUser } = require('./_supabase-auth');

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}
async function readJson(resp) {
  const text = await resp.text();
  let data = {};
  try { data = JSON.parse(text); } catch {}
  if (!resp.ok) throw new Error(data.message || data.code || `Backblaze HTTP ${resp.status}`);
  return data;
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

    const basic = Buffer.from(`${keyId}:${secret}`, 'utf8').toString('base64');
    const auth = await readJson(await fetch('https://api.backblazeb2.com/b2api/v4/b2_authorize_account', {
      headers: { Authorization: `Basic ${basic}` }
    }));
    const storage = auth.apiInfo?.storageApi;
    const token = auth.authorizationToken;
    if (!storage?.apiUrl || !token) throw new Error('Response authorize B2 tidak valid.');
    const caps = new Set(storage.allowed?.capabilities || []);
    if (!caps.has('listFiles') || !caps.has('deleteFiles')) {
      throw new Error('Application Key B2 membutuhkan capability listFiles + deleteFiles untuk cleanup permanen.');
    }
    const bucket = (storage.allowed?.buckets || []).find(b => b?.name === bucketName);
    if (!bucket?.id) throw new Error('Bucket ID tidak tersedia untuk Application Key ini.');

    const listUrl = new URL(storage.apiUrl + '/b2api/v4/b2_list_file_versions');
    listUrl.searchParams.set('bucketId', bucket.id);
    listUrl.searchParams.set('prefix', objectKey);
    listUrl.searchParams.set('maxFileCount', '1000');
    const listed = await readJson(await fetch(listUrl, { headers: { Authorization: token } }));
    const versions = (listed.files || []).filter(f => f.fileName === objectKey && f.fileId);
    let deleted = 0;
    for (const f of versions) {
      await readJson(await fetch(storage.apiUrl + '/b2api/v4/b2_delete_file_version', {
        method: 'POST',
        headers: { Authorization: token, 'content-type': 'application/json' },
        body: JSON.stringify({ fileName: f.fileName, fileId: f.fileId })
      }));
      deleted++;
    }
    return json(res, 200, { ok: true, objectKey, bucket: bucketName, versionsDeleted: deleted });
  } catch (err) {
    console.error('b2-sign-delete', err);
    return json(res, err?.statusCode || 500, { error: err?.message || String(err) });
  }
};
