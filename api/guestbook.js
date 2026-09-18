const SUPABASE_URL = 'https://jfvmcerrsxjvbiogfqes.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_3IqSDxkpxCGiDpxAEwdsXQ_AsJpsC4W';

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
};

const text = (value, max = 500) => String(value ?? '').trim().slice(0, max);
const headers = (extra = {}) => ({ apikey: SUPABASE_PUBLISHABLE_KEY, ...extra });

async function invitationExists(invitationId) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/invitations`);
  url.searchParams.set('id', `eq.${invitationId}`);
  url.searchParams.set('status', 'eq.published');
  url.searchParams.set('select', 'id');
  url.searchParams.set('limit', '1');
  const r = await fetch(url, { headers: headers({ Accept: 'application/json' }) });
  if (!r.ok) throw new Error(`supabase_invitation_${r.status}:${(await r.text()).slice(0, 300)}`);
  const rows = await r.json();
  return Array.isArray(rows) && rows.length > 0;
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { ok: false, error: 'method_not_allowed' });
  }

  try {
    const body = req.method === 'POST'
      ? (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}))
      : {};
    const invitationId = text(
      body.invitation_id || body.invitationId || req.query?.invitation_id || req.query?.invitationId,
      80
    );
    if (!invitationId) return json(res, 400, { ok: false, error: 'invitation_id_required' });
    if (!(await invitationExists(invitationId))) return json(res, 404, { ok: false, error: 'invitation_not_found' });

    if (req.method === 'GET') {
      const url = new URL(`${SUPABASE_URL}/rest/v1/guestbook_messages`);
      url.searchParams.set('invitation_id', `eq.${invitationId}`);
      url.searchParams.set('is_approved', 'eq.true');
      url.searchParams.set('select', 'id,guest_name,message,created_at');
      url.searchParams.set('order', 'created_at.desc');
      url.searchParams.set('limit', String(Math.max(1, Math.min(100, Number(req.query?.limit || 100) || 100))));
      const r = await fetch(url, { headers: headers({ Accept: 'application/json' }), cache: 'no-store' });
      if (!r.ok) throw new Error(`supabase_guestbook_list_${r.status}:${(await r.text()).slice(0, 300)}`);
      return json(res, 200, { ok: true, rows: await r.json() });
    }

    const guestName = text(body.guest_name || body.guestName || body.name, 120);
    const message = text(body.message || body.ucapan || body.comment || body.wish, 1500);
    if (!guestName || !message) return json(res, 400, { ok: false, error: 'missing_required_fields' });

    const r = await fetch(`${SUPABASE_URL}/rest/v1/guestbook_messages`, {
      method: 'POST',
      headers: headers({
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      }),
      body: JSON.stringify({
        invitation_id: invitationId,
        guest_name: guestName,
        message,
        is_approved: true,
      }),
    });
    if (!r.ok) throw new Error(`supabase_guestbook_${r.status}:${(await r.text()).slice(0, 300)}`);
    return json(res, 200, { ok: true });
  } catch (error) {
    console.error('[api/guestbook]', error);
    return json(res, 500, { ok: false, error: 'server_error' });
  }
}
