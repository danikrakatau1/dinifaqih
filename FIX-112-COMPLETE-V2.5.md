# DINI ANIF — FIX 112 V2.5

## Golden reference
Fetch Preview tetap menjadi golden reference dan tidak diubah runtime/source-nya.

## Perbaikan utama
- Template Library: iframe thumbnail animatif dihapus dari card fallback; render stabil tanpa flicker/double render.
- Supabase tetap single source of truth untuk template aktif.
- Editor: cover-guard V2.4.2 dihapus total karena bertabrakan dengan runtime native source.
- Native cover/text/button/event handler dibiarkan bekerja seperti Fetch Preview.
- Tombol Buka Undangan/link/form tidak ditangkap selection layer.
- Gallery/media di Mode Edit: klik memilih media dan membuka Visual Inspector, bukan lightbox/zoom.
- Mode Interact: runtime native (lightbox/link/form/button) berjalan tanpa ditangkap editor.
- PRO selection/drag/resize menghormati Mode Interact.
- Safari/iOS: viewport-fit=cover + dynamic viewport/safe-area compatibility ditambahkan tanpa mengubah source Fetch Preview.
- APPLY IndexedDB, Download ZIP, template UUID, Draft, guest per-template dipertahankan.

## Regression checklist
- [x] JS syntax editor.js
- [x] JS syntax pro-editor.js
- [x] JS syntax fetch studio.js
- [x] HTML parse
- [x] cover-guard lama tidak ada
- [x] Template Library tidak memakai iframe fallback animatif
- [x] no cross-project runtime reference
- [x] Edit/Interact mode tersedia
- [x] viewport-fit=cover tersedia pada admin/editor/fetch/public root

## Device validation yang tetap harus diuji secara fisik setelah deploy
Safari iPhone toolbar expanded/collapsed, orientation change, safe-area, touch drag/resize, dan native source interaction perlu smoke test di perangkat nyata karena WebKit UI tidak dapat divalidasi hanya dengan static source check.
