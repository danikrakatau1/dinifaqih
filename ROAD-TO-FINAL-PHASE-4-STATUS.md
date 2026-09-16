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

Batas scope poin 28:

- UI diagnostics hanya membaca dan menampilkan hasil scanner.
- Click/highlight/hit-test elemen source belum diaktifkan di panel diagnostics.
- Per-element inspection + jump/highlight adalah POINT 29 agar concern tetap terpisah.

## NEXT

29. Per-element inspection untuk role/layer/source/animation/lifecycle.
30. Rebuild ART JAWA HITAM / Template 7 sebagai golden test.
31. Jadikan Template 7 regression fixture.
32. Test desktop + Android + iPhone.
33. Lifecycle regression test, bukan screenshot saja.
34. Hapus patch lama yang redundant hanya setelah engine baru PASS.

## Contract tetap

`FETCH SOURCE TRUTH -> FETCH PREVIEW -> FETCH EDITOR -> APPLIED SNAPSHOT -> SAVED TEMPLATE -> TEMPLATE EDITOR BASELINE -> CLEAN PREVIEW / ZIP / PUBLIC`

Tidak boleh ada reinterpretasi baseline di tahap downstream.
