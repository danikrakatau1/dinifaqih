import { getSupabaseAdmin } from './_supabase-auth.js';

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
};

const text = (value, max = 500) => String(value ?? '').trim().slice(0, max);

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

    const supabase = getSupabaseAdmin();
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select('id,status')
      .eq('id', invitationId)
      .maybeSingle();

    if (invitationError) throw invitationError;
    if (!invitation || invitation.status !== 'published') {
      return json(res, 404, { ok: false, error: 'invitation_not_found' });
    }

    const { data, error } = await supabase
      .from('gift_confirmations')
      .insert({
        invitation_id: invitationId,
        guest_name: guestName,
        bank_name: bankName || null,
        amount: amount || null,
        note: note || null,
        proof_path: proofPath || null,
      })
      .select('id,created_at')
      .single();

    if (error) throw error;
    return json(res, 200, { ok: true, id: data.id, created_at: data.created_at });
  } catch (error) {
    console.error('[api/gift-confirmation]', error);
    return json(res, 500, { ok: false, error: 'server_error' });
  }
}
