export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    return new Response(
      [
        "Dini & Faqih — Cloudflare staging",
        "Status: Worker pipeline connected",
        `Path: ${url.pathname}`,
        "Production domain is still untouched."
      ].join("\n"),
      {
        status: 200,
        headers: {
          "content-type": "text/plain; charset=UTF-8",
          "cache-control": "no-store"
        }
      }
    );
  }
};
