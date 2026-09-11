# DINI ANIF V2.10 — Editor Runtime Base + iPhone Safari Layer Hardening

Scope locked:
1. Dashboard Edit / Fetch→Edit: restore native `Buka Undangan` runtime parity.
2. Gallery click remains editor selection-first (no native lightbox while editing).
3. Public iPhone Safari: remove fullscreen fixed compositors and bust public asset cache.

## Root cause found — Editor
`injectEditorParityPatch()` changed the source document `<base href>` to `./` for every Live Editor render.
Fetch Preview does not do this and renders `source-native.html` with its original base.
Any source-relative JS/CSS can therefore resolve against `/dashboard-admin-edit/` in Editor and lose its source runtime.

V2.10:
- Live Editor preserves the original source `<base>` exactly.
- `<base href="./">` is applied only for exported/local ZIP builds (`forExport=true`).
- Fetch Preview remains untouched.

## iPhone Safari
- Explicit iOS Safari class detection only; removed visualViewport resize/scroll JS sizing loop.
- On iPhone Safari `.preloader` and `.opening` are no longer `position:fixed` fullscreen compositor layers.
- They use absolute + `100svh` geometry, then are removed with `display:none` after opening.
- Public CSS/JS receive `?v=2.10` cache-busters.
- Explicit neutral dark `theme-color` is restored to prevent stale burgundy browser-chrome tinting.

## Frozen
- Clean Preview photo geometry mismatch remains intentionally untouched.
- Backblaze integration remains untouched.
