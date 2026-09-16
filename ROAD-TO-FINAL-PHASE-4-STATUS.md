# ROAD TO FINAL DINI FAQIH — PHASE 4 STATUS

Branch kerja: `engine/road-to-final-dini-faqih`

## Phase 4 — Diagnostics + Regression

### 28. Scanner Diagnostics UI — IMPLEMENTED

Implementasi:

- `dashboard-admin-fetch-editor/fetch-scanner-diagnostics-v1.js`
- bootstrap dari `dashboard-admin-fetch-editor/fetch-runtime-control-v1.js`
- read-only terhadap `baseline.manifest.source_graph`
- tidak mengubah Golden Baseline
- tidak menulis Delta
- tidak mengubah Applied Snapshot

UI diagnostics menyediakan:

- Overview / health gate
- Source identity + HTML/CSS hash
- Media diagnostics
- Layer / ownership diagnostics
- Animation diagnostics
- animation API evidence
- lifecycle events / timers / actions / targets / media
- responsive source truth
- dependency/framework diagnostics
- personalization diagnostics
- compatibility policy + authority contract
- search/filter diagnostics
- Refresh
- Copy Source Truth JSON
- Export Source Truth JSON

Health gate memeriksa:

1. Source Truth V1 tersedia dan tidak error.
2. Compatibility policy tidak memakai blanket animation disable.
3. Compatibility policy tidak memakai blanket transform reset.
4. Compatibility policy tidak memakai blanket visibility force.
5. Tidak ada template-specific hardcode pada policy.
6. Source HTML hash tersedia.
7. Authority contract memakai `consume-do-not-reinterpret`.

### 29. Per-element Source Truth Inspection — IMPLEMENTED

Implementasi utama tetap berada di:

- `dashboard-admin-fetch-editor/fetch-scanner-diagnostics-v1.js` V1.1.0
- `dashboard-admin-fetch-editor/fetch-runtime-control-v1.js` loader diagnostics `v=110`

Kemampuan per-elemen:

- tombol `INSPECT ELEMENT` terpisah dari LIVE / PAUSE / EDIT / REPLAY
- hover outline editor-only pada elemen source
- selected outline editor-only
- klik dalam Inspect Mode diblokir dari runtime source agar tombol/link/video/lifecycle tidak terpancing tanpa sengaja
- identitas elemen: tag, id, Elementor/data-id, selector, class, text preview
- owner / ancestor chain
- editable field candidates dari schema Production Editor yang sama
- visual ownership records
- media records
- layer / ownership records
- animation node termasuk viewport, delay, duration dan source evidence yang tersedia
- CSS animation / transition rule yang selector-nya cocok
- lifecycle target correlation
- lifecycle event / timer / action correlation berdasarkan script index dari target terkait
- lifecycle media records
- responsive setting variants
- personalization field / candidate yang terkait
- `Jump + Highlight`
- `Copy Element Report`
- pindah dari Source Truth Inspector ke field Production Editor yang cocok

Kontrak non-destruktif poin 29:

- tidak membuat editor kedua
- tidak mengubah source graph
- tidak mengubah baseline HTML
- tidak menulis Delta
- tidak mengubah Applied Snapshot
- style/attribute highlight hanya hidup pada iframe runtime dan ditandai editor-only
- Inspect Mode OFF mengembalikan click/runtime source normal
- elemen yang belum editable tetap boleh diinspeksi; engine tidak memaksa visibility atau membuat field palsu

Status verifikasi saat implementasi:

- JS syntax check lokal untuk Diagnostics V1.1.0: PASS
- JS syntax check lokal untuk Runtime Control V1.0.2: PASS
- browser/authenticated functional test tetap harus dibuktikan pada deployment branch sebelum Phase 4 dianggap regression-PASS

## NEXT

30. Rebuild ART JAWA HITAM / Template 7 sebagai golden test.
31. Jadikan Template 7 regression fixture.
32. Test desktop + Android + iPhone.
33. Lifecycle regression test, bukan screenshot saja.
34. Hapus patch lama yang redundant hanya setelah engine baru PASS.

## Contract tetap

`FETCH SOURCE TRUTH -> FETCH PREVIEW -> FETCH EDITOR -> APPLIED SNAPSHOT -> SAVED TEMPLATE -> TEMPLATE EDITOR BASELINE -> CLEAN PREVIEW / ZIP / PUBLIC`

Tidak boleh ada reinterpretasi baseline di tahap downstream.
