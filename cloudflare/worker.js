const VERCEL_ORIGIN = 'https://www.dini-faqih.my.id';

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
        return await proxyReadOnlyApi(request);
      } catch (error) {
        return json({
          ok: false,
          error: 'Cloudflare feature preview gagal meneruskan API ke Vercel.',
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
