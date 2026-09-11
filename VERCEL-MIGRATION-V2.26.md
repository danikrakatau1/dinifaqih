# Dini–Faqih V2.26 — Vercel migration build

This deploy package preserves the V2.26 public/admin site while adapting hosting-specific pieces from Netlify to Vercel.

Changes vs. the archived Netlify package:
- `site/*` is promoted to the deployment root so `/` serves `index.html` directly on Vercel.
- Netlify build artifacts and `.netlify/` are excluded.
- `/api/b2-sign-upload` and `/api/b2-sign-delete` are Vercel-native functions.
- Existing Vercel API functions are retained.
- Preview Supabase API supports both legacy `service_role` JWT keys and new `sb_secret_...` keys. New secret keys are sent only via `apikey`.
- Vercel rewrites preserve the old clean dashboard routes.

Required Vercel environment variables:
- `B2_KEY_ID`
- `B2_APPLICATION_KEY`
- `B2_BUCKET_NAME`
- `B2_ENDPOINT`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (existing name supported) or `SUPABASE_SECRET_KEY`
- optional `PREVIEW_TTL_DAYS`

Before testing direct B2 upload from a `*.vercel.app` preview URL, add that exact preview/production Vercel origin to the Backblaze B2 CORS rule. Keep `https://dini-faqih.my.id` allowed for production.
