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
    const attendance = text(body.attendance || body.status, 40).toLowerCase();
    const guestCountRaw = Number(body.guest_count ?? body.guestCount ?? body.pax ?? 1);
    const guestCount = Number.isFinite(guestCountRaw) ? Math.max(0, Math.min(20, Math.trunc(guestCountRaw))) : 1;
    const message = text(body.message || body.note || body.ucapan, 1500);

    if (!invitationId || !guestName || !attendance) {
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
      .from('invitation_rsvps')
      .insert({
        invitation_id: invitationId,
        guest_name: guestName,
        attendance,
        guest_count: guestCount,
        message: message || null,
      })
      .select('id,created_at')
      .single();

    if (error) throw error;
    return json(res, 200, { ok: true, id: data.id, created_at: data.created_at });
  } catch (error) {
    console.error('[api/rsvp]', error);
    return json(res, 500, { ok: false, error: 'server_error' });
  }
}
