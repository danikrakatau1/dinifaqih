const VERCEL_ORIGIN = 'https://www.dini-faqih.my.id';
const SUPABASE_URL = 'https://jfvmcerrsxjvbiogfqes.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_3IqSDxkpxCGiDpxAEwdsXQ_AsJpsC4W';

const STATIC_REWRITES = new Map([
  ['/', '/index.html'],
  ['/dashboard-admin', '/dashboard-admin/index.html'],
  ['/dashboard-admin-template', '/dashboard-admin-template/index.html'],
  ['/dashboard-admin-fetch', '/dashboard-admin-fetch/index.html'],
  ['/dashboard-admin-edit', '/dashboard-admin-edit/index.html'],
  ['/dashboard-admin-fetch-editor', '/dashboard-admin-fetch-editor/index.html'],
  ['/buat-tamu', '/buat%20tamu.html']
]);

const SAFE_API_PROXY = new Set([
  '/api/fetch-source',
  '/api/fetch-asset',
  '/api/preview-load'
]);

const SAFE_WRITE_PROXY = new Set([
  '/api/rsvp',
  '/api/gift-confirmation'
]);

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders
    }
  });
}

function assetRequest(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return new Request(url.toString(), request);
}

async function proxyReadOnlyApi(request) {
  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, VERCEL_ORIGIN);
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('origin');
  headers.set('x-dinifaqih-preview-host', 'cloudflare-test-rsvp-gift');

  const init = {
    method: request.method,
    headers,
    redirect: 'follow'
  };
  if (!['GET', 'HEAD'].includes(request.method)) init.body = request.body;

  const upstream = await fetch(target.toString(), init);
  const outHeaders = new Headers(upstream.headers);
  outHeaders.set('cache-control', 'no-store');
  outHeaders.set(
    'x-dinifaqih-preview-api',
    ['GET','HEAD'].includes(request.method) ? 'vercel-readonly-proxy' : 'vercel-feature-write-proxy'
  );

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: outHeaders
  });
}

const cleanText = (value, max = 500) => String(value ?? '').trim().slice(0, max);

const supabaseHeaders = (extra = {}) => ({
  apikey: SUPABASE_PUBLISHABLE_KEY,
  ...extra
});

async function readBody(request) {
  try { return await request.json(); } catch { return {}; }
}

async function invitationIsPublished(invitationId) {
  const url = new URL(SUPABASE_URL + '/rest/v1/invitations');
  url.searchParams.set('id', 'eq.' + invitationId);
  url.searchParams.set('status', 'eq.published');
  url.searchParams.set('select', 'id');
  url.searchParams.set('limit', '1');
  const res = await fetch(url.toString(), {
    headers: supabaseHeaders({ Accept: 'application/json' })
  });
  if (!res.ok) throw new Error('invitation_check_' + res.status);
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0;
}

async function handleRsvpWrite(request) {
  const body = await readBody(request);
  const invitationId = cleanText(body.invitation_id || body.invitationId, 80);
  const guestName = cleanText(body.guest_name || body.guestName || body.name, 120);
  const attendance = cleanText(body.attendance || body.status, 40).toLowerCase();
  const guestCountRaw = Number(body.guest_count ?? body.guestCount ?? body.pax ?? 1);
  const guestCount = Number.isFinite(guestCountRaw) ? Math.max(1, Math.min(20, Math.trunc(guestCountRaw))) : 1;
  const message = cleanText(body.message || body.note || body.ucapan, 1000);

  if (!invitationId || !guestName || !['hadir','tidak_hadir','ragu'].includes(attendance)) {
    return json({ ok:false, error:'missing_or_invalid_fields' }, 400);
  }
  if (!(await invitationIsPublished(invitationId))) {
    return json({ ok:false, error:'invitation_not_found' }, 404);
  }

  const res = await fetch(SUPABASE_URL + '/rest/v1/invitation_rsvps', {
    method:'POST',
    headers:supabaseHeaders({
      'Content-Type':'application/json',
      Prefer:'return=minimal'
    }),
    body:JSON.stringify({
      invitation_id:invitationId,
      guest_name:guestName,
      attendance,
      guest_count:guestCount,
      message:message || null
    })
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0,300);
    return json({ ok:false, error:'supabase_rsvp_' + res.status, detail }, 502);
  }
  return json({ ok:true }, 200, { 'x-dinifaqih-preview-api':'cloudflare-rsvp-direct' });
}

async function handleGiftWrite(request) {
  const body = await readBody(request);
  const invitationId = cleanText(body.invitation_id || body.invitationId, 80);
  const guestName = cleanText(body.guest_name || body.guestName || body.name, 120);
  const bankName = cleanText(body.bank_name || body.bankName || body.bank, 120);
  const amountRaw = cleanText(body.amount || body.nominal, 80);
  const note = cleanText(body.note || body.message || body.ucapan, 1000);
  const proofPath = cleanText(body.proof_path || body.proofPath || body.proof_url || body.proofUrl, 1000);
  const amountDigits = amountRaw.replace(/[^0-9.]/g,'');
  const amount = amountDigits && Number.isFinite(Number(amountDigits)) ? Number(amountDigits) : null;

  if (!invitationId || !guestName) {
    return json({ ok:false, error:'missing_required_fields' }, 400);
  }
  if (!(await invitationIsPublished(invitationId))) {
    return json({ ok:false, error:'invitation_not_found' }, 404);
  }

  const res = await fetch(SUPABASE_URL + '/rest/v1/gift_confirmations', {
    method:'POST',
    headers:supabaseHeaders({
      'Content-Type':'application/json',
      Prefer:'return=minimal'
    }),
    body:JSON.stringify({
      invitation_id:invitationId,
      guest_name:guestName,
      bank_name:bankName || null,
      amount,
      note:note || null,
      proof_path:proofPath || null
    })
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0,300);
    return json({ ok:false, error:'supabase_gift_' + res.status, detail }, 502);
  }
  return json({ ok:true }, 200, { 'x-dinifaqih-preview-api':'cloudflare-gift-direct' });
}

function isGuestSlug(path) {
  return /^\/[a-z0-9][a-z0-9-]{0,119}$/i.test(path) &&
    !path.startsWith('/api') &&
    !path.startsWith('/assets');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const routePath = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;

    // Feature preview stays locked down except for the two explicitly
    // requested public submission endpoints. Those POSTs use the same Vercel
    // handlers as production, so validation + Supabase policies remain shared.
    if (routePath.startsWith('/api/')) {
      const readAllowed = SAFE_API_PROXY.has(routePath) && ['GET', 'HEAD'].includes(request.method);
      const writeAllowed = SAFE_WRITE_PROXY.has(routePath) && request.method === 'POST';
      if (!readAllowed && !writeAllowed) {
        return json({
          ok: false,
          preview_only: true,
          error: 'Cloudflare feature preview hanya mengizinkan API yang sudah di-whitelist.'
        }, 503, { 'x-dinifaqih-preview-guard': 'route-blocked' });
      }
      try {
        if (writeAllowed && routePath === '/api/rsvp') return await handleRsvpWrite(request);
        if (writeAllowed && routePath === '/api/gift-confirmation') return await handleGiftWrite(request);
        return await proxyReadOnlyApi(request);
      } catch (error) {
        return json({
          ok: false,
          error: 'Cloudflare feature preview gagal memproses API.',
          detail: error?.message || String(error)
        }, 502);
      }
    }

    const rewritten = STATIC_REWRITES.get(routePath);
    if (rewritten) {
      const response = await env.ASSETS.fetch(assetRequest(request, rewritten));
      const headers = new Headers(response.headers);
      headers.set('cache-control', 'no-store');
      headers.set('x-dinifaqih-preview', 'cloudflare-test-rsvp-gift');
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }

    // Universal guest link: /rozak, /imeel-nindya, etc.
    if (isGuestSlug(routePath)) {
      const response = await env.ASSETS.fetch(assetRequest(request, '/guest-entry-v18.html'));
      const headers = new Headers(response.headers);
      headers.set('cache-control', 'no-store');
      headers.set('x-dinifaqih-preview', 'cloudflare-test-rsvp-gift-guest');
      headers.set('x-dinifaqih-preview-guest-slug', routePath.slice(1));
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }

    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    if (
      routePath === '/index.html' ||
      routePath === '/guest-entry-v18.html' ||
      routePath.startsWith('/assets/js/')
    ) {
      headers.set('cache-control', 'no-store');
    }
    headers.set('x-dinifaqih-preview', 'cloudflare-test-rsvp-gift');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
