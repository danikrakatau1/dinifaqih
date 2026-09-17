const SUPABASE_URL = 'https://jfvmcerrsxjvbiogfqes.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_3IqSDxkpxCGiDpxAEwdsXQ_AsJpsC4W';

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
};

const text = (value, max = 500) => String(value ?? '').trim().slice(0, max);

const supabaseHeaders = (extra = {}) => ({
  apikey: SUPABASE_PUBLISHABLE_KEY,
  ...extra,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, error: 'method_not_allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const invitationId = text(body.invitation_id || body.invitationId, 80);
    const guestName = text(body.guest_name || body.guestName || body.name, 120);
    const bankName = text(body.bank_name || body.bankName || body.bank, 120);
    const amount = text(body.amount || body.nominal, 80);
    const note = text(body.note || body.message || body.ucapan, 1500);
    const proofPath = text(body.proof_path || body.proofPath || body.proof_url || body.proofUrl, 1000);

    if (!invitationId || !guestName) {
      return json(res, 400, { ok: false, error: 'missing_required_fields' });
    }

    const invitationUrl = new URL(`${SUPABASE_URL}/rest/v1/invitations`);
    invitationUrl.searchParams.set('id', `eq.${invitationId}`);
    invitationUrl.searchParams.set('status', 'eq.published');
    invitationUrl.searchParams.set('select', 'id');
    invitationUrl.searchParams.set('limit', '1');

    const invitationResponse = await fetch(invitationUrl, {
      headers: supabaseHeaders({ Accept: 'application/json' }),
    });

    if (!invitationResponse.ok) {
      const detail = (await invitationResponse.text()).slice(0, 300);
      throw new Error(`supabase_invitation_${invitationResponse.status}:${detail}`);
    }

    const invitations = await invitationResponse.json();
    if (!Array.isArray(invitations) || invitations.length === 0) {
      return json(res, 404, { ok: false, error: 'invitation_not_found' });
    }

    const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/gift_confirmations`, {
      method: 'POST',
      headers: supabaseHeaders({
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      }),
      body: JSON.stringify({
        invitation_id: invitationId,
        guest_name: guestName,
        bank_name: bankName || null,
        amount: amount || null,
        note: note || null,
        proof_path: proofPath || null,
      }),
    });

    if (!insertResponse.ok) {
      const detail = (await insertResponse.text()).slice(0, 300);
      throw new Error(`supabase_gift_${insertResponse.status}:${detail}`);
    }

    return json(res, 200, { ok: true });
  } catch (error) {
    console.error('[api/gift-confirmation]', error);
    return json(res, 500, { ok: false, error: 'server_error' });
  }
}
