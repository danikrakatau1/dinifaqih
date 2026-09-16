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

const BLOCKED_PREVIEW_API = new Set([
  '/api/preview-save',
  '/api/b2-sign-upload',
  '/api/b2-sign-delete'
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

function assetRequest(request, pathname, mutateSearch) {
  const url = new URL(request.url);
  url.pathname = pathname;
  if (mutateSearch) mutateSearch(url.searchParams);
  return new Request(url.toString(), request);
}

async function proxySafeApi(request) {
  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, VERCEL_ORIGIN);
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('origin');
  headers.set('x-dinifaqih-preview-host', 'cloudflare');

  const init = {
    method: request.method,
    headers,
    redirect: 'follow'
  };
  if (!['GET', 'HEAD'].includes(request.method)) init.body = request.body;

  const upstream = await fetch(target.toString(), init);
  const outHeaders = new Headers(upstream.headers);
  outHeaders.set('x-dinifaqih-preview-api', 'vercel-readonly-proxy');
  outHeaders.set('cache-control', 'no-store');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: outHeaders
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (SAFE_API_PROXY.has(path)) {
      try {
        return await proxySafeApi(request);
      } catch (error) {
        return json({
          ok: false,
          error: 'Cloudflare preview gagal meneruskan API read-only ke Vercel.',
          detail: error?.message || String(error)
        }, 502);
      }
    }

    if (BLOCKED_PREVIEW_API.has(path) || path.startsWith('/api/')) {
      return json({
        ok: false,
        preview_only: true,
        error: 'Endpoint write/server-only ini sengaja dinonaktifkan pada Cloudflare preview agar production Supabase/B2 tetap aman.'
      }, 503, { 'x-dinifaqih-preview-guard': 'write-blocked' });
    }

    const rewritten = STATIC_REWRITES.get(path);
    if (rewritten) {
      return env.ASSETS.fetch(assetRequest(request, rewritten));
    }

    if (/^\/[a-z0-9-]+$/.test(path) && path !== '/index') {
      const slug = path.slice(1);
      return env.ASSETS.fetch(assetRequest(request, '/guest-entry-v18.html', params => {
        params.set('guest_slug', slug);
      }));
    }

    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    if (
      path === '/' ||
      path === '/index.html' ||
      path === '/guest-entry-v18.html' ||
      path === '/assets/js/public-canonical-renderer-v18.js'
    ) {
      headers.set('cache-control', 'no-store');
    }
    headers.set('x-dinifaqih-preview', 'cloudflare-engine-1-38');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
