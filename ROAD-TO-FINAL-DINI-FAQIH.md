# ROAD TO FINAL DINI FAQIH

Branch kerja: `engine/road-to-final-dini-faqih`

Tujuan utama: satu source truth dari Fetch dipakai konsisten oleh Fetch Preview, Fetch Editor, Save Template, Template Editor, Clean Preview/Public Renderer, tanpa reinterpretasi atau global kill rules yang merusak source.

## Master 38 Point

1. Checkpoint production sebelum perubahan besar.
2. Upgrade Fetch menjadi Deep Source Scanner.
3. Bawa source-native analyzer V3 ke Fetch utama.
4. Media classifier per elemen/role.
5. Layer / ownership graph.
6. Animation scanner lengkap.
7. Lifecycle scanner.
8. Event graph.
9. Preserve desktop/tablet/mobile behavior terpisah.
10. Preserve randomness hanya jika source memang random.
11. Scan lifecycle media lengkap.
12. Pisahkan SOURCE TRUTH dan COMPATIBILITY POLICY.
13. Media/video end-state fix harus compatibility policy terukur, bukan source truth palsu.
14. Hilangkan hardcode template-specific dari engine global.
15. Synthetic timing hanya fallback terakhir dan harus ditandai fallback.
16. Hapus global kill rules yang merusak source.
17. Jangan membuka semua elemen hanya agar gampang diedit.
18. Pertahankan Production Editor sebagai editor utama.
19. Tambah mode LIVE / PAUSE / EDIT / REPLAY.
20. Selection overlay / hit-testing untuk elemen sulit diklik.
21. Source Truth Package per template.
22. Applied Snapshot menjadi MASTER setelah Fetch Editor.
23. Save Template Baru menyimpan snapshot itu tanpa rebuild kedua.
24. Template Editor load baseline yang sama persis.
25. Batasi canonicalizer agar non-destruktif pada baseline.
26. Parity Hash Gate: Fetch Applied = Saved Template = Template Editor Baseline.
27. Clean Preview, ZIP, Template Editor, Public Renderer memakai package yang sama.
28. Scanner Diagnostics UI.
29. Per-element inspection untuk role/layer/source/animation/lifecycle.
30. Rebuild ART JAWA HITAM / Template 7 sebagai golden test.
31. Jadikan Template 7 regression fixture.
32. Test desktop + Android + iPhone.
33. Lifecycle regression test, bukan screenshot saja.
34. Hapus patch lama yang redundant hanya setelah engine baru PASS.
35. Personalization Scanner untuk area nama tamu.
36. Dynamic Field Binding `guest_name` ke node asli template.
37. URL Personalization Runtime (`?to=Agus`) aman, text-only, preserve style/animation.
38. Public Template Parity: nama tamu mengikuti tampilan template, bukan UI global.

## Fase

- Phase 1 — 1–15: Deep Fetch + Source Truth foundation.
- Phase 2 — 16–21: Editor preservation + runtime control.
- Phase 3 — 22–27: Snapshot authority + exact parity.
- Phase 4 — 28–34: Diagnostics + regression.
- Personalization 35–38 dirancang sejak Phase 1 dan diaktifkan end-to-end pada fase terkait.

## Phase 1 Contract

`manifest.source_graph` tetap backward-compatible dengan Source Graph V3, lalu diperkaya dengan:

- `source_truth_version`
- `dependencies`
- `media`
- `layers`
- `animations`
- `lifecycle`
- `responsive.source_truth`
- `personalization`
- `compatibility_policy`
- `authority`
- `diagnostics`

Rule penting:

- Tidak ada hardcode ID/URL/timing milik template tertentu.
- Source truth hanya mencatat apa yang ada di source.
- Compatibility behavior dipisahkan dan tidak boleh menyamar sebagai source truth.
- Editor harus consume hasil Fetch, bukan menganalisis ulang baseline.
- Guest name injection harus text-only dan tetap memakai style/animation template.
