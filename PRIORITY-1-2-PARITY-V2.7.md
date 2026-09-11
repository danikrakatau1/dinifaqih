# Dini Anif V2.7 — Priority 1 + 2 Parity

## Priority 1 — iPhone Safari public
- Public theme-color changed from burgundy to neutral dark to avoid Safari top/bottom chrome appearing as a large burgundy page layer.
- Public root locks horizontal overflow without using a fixed-bottom workaround.
- Opening/hero use svh/dvh with safe-area padding only on content, not double-applied on the root.
- No changes to Dashboard Admin or Fetch viewport CSS because both were already healthy on iPhone Safari.

## Priority 2 — Fetch Preview -> Editor parity
- Editor runtime restored from the pre-PRO150 V2.3 branch, the last branch before cover/event/gallery parity regressions appeared.
- PRO150 DOM overlay runtime is not loaded in this parity build.
- Native Preview DOM, gallery/slideshow, opening button, source actions, and source geometry are controlled by the native editor bridge only.
- APPLY still uses IndexedDB (quota fix retained).
- Import ZIP -> Save Draft retained.
- Draft template ids fixed to UUID for current Supabase schema.

## UI cleanup
- Left/right editor panel grouping and spacing cleaned through CSS only.
- No DOM mutation is used for the panel cleanup.
