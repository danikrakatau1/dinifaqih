const html = String.raw`<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Dini & Faqih — Engine V3 Lab</title>
  <style>
    :root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#090909;color:#f5f5f5;padding:24px}.card{width:min(720px,100%);border:1px solid #2a2a2a;border-radius:24px;background:#111;padding:28px;box-shadow:0 24px 80px rgba(0,0,0,.35)}.eyebrow{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#aaa}.status{display:inline-flex;gap:8px;align-items:center;margin-top:18px;padding:8px 12px;border:1px solid #303030;border-radius:999px;background:#171717}.dot{width:8px;height:8px;border-radius:50%;background:#69db7c;box-shadow:0 0 16px rgba(105,219,124,.6)}h1{font-size:clamp(30px,6vw,56px);line-height:1;margin:18px 0 10px}.muted{color:#aaa;line-height:1.65}.guest{margin-top:24px;padding:18px;border-radius:18px;background:#0b0b0b;border:1px solid #252525}.guest strong{display:block;font-size:24px;margin-top:6px}.meta{margin-top:20px;font:12px/1.6 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#777}
  </style>
</head>
<body>
  <main class="card">
    <div class="eyebrow">Source-Native Fidelity Lab</div>
    <div class="status"><span class="dot"></span> Engine V3 playground online</div>
    <h1>Dini & Faqih</h1>
    <p class="muted">Lab terisolasi untuk eksperimen Fetch → Preview → Editor → Clean Preview. Production Vercel dan Supabase tidak disentuh.</p>
    <section class="guest">
      <span class="eyebrow">Kepada Yth.</span>
      <strong id="guest">Tamu Undangan</strong>
    </section>
    <div class="meta">branch: engine/v3-source-native-fidelity<br>baseline: 94c4fddccde5d714f6ca9a247b87a0a9ef833f75</div>
  </main>
  <script>
    const value = new URLSearchParams(location.search).get('to');
    if (value && value.trim()) document.getElementById('guest').textContent = value.trim();
  </script>
</body>
</html>`;

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return Response.json({
        ok: true,
        service: 'dinifaqih-engine-v3-lab',
        branch: 'engine/v3-source-native-fidelity',
        baseline: '94c4fddccde5d714f6ca9a247b87a0a9ef833f75'
      });
    }

    return new Response(html, {
      headers: {
        'content-type': 'text/html; charset=UTF-8',
        'cache-control': 'no-store'
      }
    });
  }
};
