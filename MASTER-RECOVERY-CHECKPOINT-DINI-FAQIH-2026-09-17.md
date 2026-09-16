# MASTER RECOVERY CHECKPOINT — DINI & FAQIH

Tanggal checkpoint: **2026-09-17**

Status dokumen: **AUTHORITATIVE RECOVERY / START HERE**

Branch checkpoint: `checkpoint/master-recovery-2026-09-17`

Functional master lock sumber checkpoint: `engine/road-to-final-dini-faqih` @ `00dd300d828e2e3b4bb16e98fb2f7d0c605bf4b0`

Production baseline yang DILARANG disentuh tanpa keputusan eksplisit: `main` @ `94c4fddccde5d714f6ca9a247b87a0a9ef833f75`

---

## 0. TUJUAN CHECKPOINT INI

File ini dibuat agar project Dini & Faqih dapat dipulihkan dengan benar meskipun chat hilang, konteks terpotong, perangkat berpindah, atau eksperimen preview gagal.

Aturan pertama saat recovery:

1. Baca file ini sebelum mengubah apa pun.
2. Verifikasi `main` masih berada pada baseline production yang diharapkan.
3. Verifikasi `engine/road-to-final-dini-faqih` masih menunjuk ke functional master lock atau commit penerus yang memang disetujui.
4. Jangan menebak status dari chat lama jika repo, CI, Vercel, atau Supabase memberikan bukti yang lebih baru.
5. Jangan menyentuh production hanya karena branch eksperimen sudah PASS.

---

# 1. IDENTITAS PROJECT

Project: **Dini & Faqih Wedding Invitation + Source-Native Template Editor**

GitHub repository:

- Repo: `danikrakatau1/dinifaqih`
- Default production branch: `main`
- Road-to-Final engine branch: `engine/road-to-final-dini-faqih`
- Master recovery branch: `checkpoint/master-recovery-2026-09-17`

Source reference utama Golden Template 7:

- `https://web.galeriundanganofficial.com/art-jawa-hitam/`

Arsitektur inti:

- **FETCH EDITOR != TEMPLATE EDITOR**
- Fetch Editor mengambil source baru dan saat Save membuat **template baru / UUID baru**.
- Template Editor membuka template yang sudah ada dan saat Save mengubah **UUID yang sama**.
- Keduanya boleh memakai scanner/renderer/runtime bersama, tetapi lifecycle Save tidak boleh disamakan.

Single Source Truth law:

`SOURCE -> DEEP FETCH -> SOURCE TRUTH PACKAGE -> FETCH PREVIEW -> FETCH EDITOR -> APPLIED SNAPSHOT -> SAVED TEMPLATE -> TEMPLATE EDITOR BASELINE -> CLEAN PREVIEW / ZIP / PUBLIC RENDERER`

Applied Snapshot setelah Fetch Editor adalah authority downstream. Downstream tidak boleh membangun ulang baseline kedua yang mengubah struktur source.

---

# 2. STATUS GITHUB SAAT CHECKPOINT

## 2.1 Production branch — LOCK

Branch: `main`

HEAD production baseline:

`94c4fddccde5d714f6ca9a247b87a0a9ef833f75`

Commit message:

`chore(fetch editor): load source background parity`

**STATUS: FROZEN / JANGAN DISENTUH.**

Tidak boleh dilakukan tanpa perintah eksplisit user:

- direct push ke `main`;
- merge Road-to-Final ke `main`;
- force push/rebase `main`;
- mengganti production alias karena alasan preview;
- menjadikan eksperimen Cloudflare sebagai production;
- mengubah database production untuk menyesuaikan branch eksperimen.

Catatan keamanan operasional: GitHub branch protection saat checkpoint belum aktif. Secara teknis direct push mungkin bisa dilakukan, tetapi secara aturan project **tetap dilarang**. Sebelum promotion production, branch protection / PR workflow disarankan dikunci.

## 2.2 Engine Road-to-Final — MASTER 38 COMPLETE

Branch:

`engine/road-to-final-dini-faqih`

Functional master lock:

`00dd300d828e2e3b4bb16e98fb2f7d0c605bf4b0`

Commit message:

`checkpoint(road-to-final): lock master 38 complete`

Dibanding `main` pada saat audit:

- **82 commits ahead**
- **0 commits behind**
- merge base = production baseline `94c4fdd...`

**STATUS: IMPLEMENTATION + REGRESSION COMPLETE, BELUM PRODUCTION.**

Engine branch juga sebaiknya diperlakukan sebagai locked baseline sekarang. Eksperimen berikutnya dibuat dari branch baru, bukan mengacak functional master lock.

## 2.3 Branch checkpoint penting

Road-to-Final memiliki checkpoint bertahap antara lain:

- `checkpoint/road-to-final-phase-1-source-truth`
- `checkpoint/road-to-final-phase-2-runtime-preservation`
- `checkpoint/road-to-final-phase-3-snapshot-authority`
- `checkpoint/road-to-final-phase-4-scanner-diagnostics`
- `checkpoint/road-to-final-phase-4-element-inspection`
- `checkpoint/road-to-final-phase-4-template7-golden`
- `checkpoint/road-to-final-phase-4-template7-regression`
- `checkpoint/road-to-final-phase-4-device-matrix`
- lifecycle / cleanup / personalization checkpoint berada dalam history Road-to-Final
- master recovery baru: `checkpoint/master-recovery-2026-09-17`

Checkpoint branch lama tidak boleh dipindah paksa hanya agar terlihat mengikuti branch terbaru. Checkpoint adalah titik restore, bukan branch kerja.

---

# 3. ROAD-TO-FINAL MASTER 38 — STATUS TERBARU

**MASTER POINT 1–38 COMPLETE ON ENGINE BRANCH.**

## Phase 1 — Points 1–15: Deep Fetch + Source Truth

COMPLETE.

Mencakup:

- Deep Source Scanner;
- Source Native Analyzer V3 foundation;
- media classifier per role/element;
- layer / ownership graph;
- animation scanner;
- lifecycle scanner;
- event graph;
- responsive source truth desktop/tablet/mobile;
- preserve randomness jika source random;
- media lifecycle scan;
- SOURCE TRUTH dipisah dari COMPATIBILITY POLICY;
- media end-state compatibility tidak boleh menyamar sebagai source truth;
- no template-specific global hardcode;
- synthetic timing hanya fallback dan harus ditandai.

## Phase 2 — Points 16–21: Editor Preservation + Runtime Control

COMPLETE.

Mencakup:

- menghilangkan global kill rules yang merusak source;
- tidak force-visible semua node hanya agar mudah diedit;
- Production Editor tetap editor utama;
- LIVE / PAUSE / EDIT / REPLAY;
- selection overlay / hit testing;
- Source Truth Package per template.

## Phase 3 — Points 22–27: Snapshot Authority + Exact Parity

COMPLETE.

Mencakup:

- Applied Snapshot menjadi MASTER;
- Save Template Baru menyimpan snapshot tanpa rebuild kedua;
- Template Editor memakai exact baseline yang sama;
- canonicalizer dibatasi agar non-destructive;
- authority/parity hash gate;
- Clean Preview, ZIP, Template Editor dan Public Renderer memakai package yang sama.

## Phase 4 — Points 28–34: Diagnostics + Regression + Cleanup

COMPLETE.

### 28 — Scanner Diagnostics UI

COMPLETE.

Diagnostics membaca `manifest.source_graph` / Source Truth, bukan menganalisis ulang baseline secara destruktif.

### 29 — Per-element Source Truth Inspection

COMPLETE.

Inspector dapat memetakan node ke role/source/layer/media/animation/timing/lifecycle/responsive/personalization evidence.

### 30 — Template 7 ART JAWA HITAM Golden Test

COMPLETE.

Template 7 dijadikan Golden read-only.

### 31 — Repeatable Golden Regression

PASS **58/58**.

### 32 — Device Matrix

PASS:

- Desktop Chromium
- Android Chromium
- iPhone WebKit

Historically masing-masing gate device mencapai 22/22 checks pada locked matrix.

### 33 — Lifecycle Regression

PASS:

- Chromium **46/46**
- WebKit **46/46**

Lifecycle gate menguji behavior, bukan screenshot saja: open choreography, source timers/delays, media play intent, carousel movement, cover dismissal, runtime authority, dll.

### 34 — Cleanup / Hardening

COMPLETE.

Cleanup lock commit:

`39c0ee4f6601cfd7bb5d1ca809ff9aef02bf284a`

Regression setelah cleanup:

- Legacy Parity Gate: **26/26 PASS**
- Golden cleanup run `35128007629`: SUCCESS
- Device cleanup run `35128007650`: **3/3 jobs SUCCESS**
- Lifecycle cleanup run `35128007659`: Chromium + WebKit SUCCESS

Legacy compatibility dapat tetap ada secara fisik untuk template legacy/v0, tetapi **Source Truth snapshots wajib bypass legacy reinterpretation**.

## Personalization — Points 35–38

COMPLETE.

Tested personalization implementation:

`a9ba47d3757106b2e34e931e5eaf3420df62d9f8`

Workflow run:

`35129756735`

Result:

- Chromium: **30/30 PASS**, job `104907534431`, artifact `10459999753`
- WebKit: **30/30 PASS**, job `104907534082`, artifact `10460579074`
- Combined: **60/60 PASS, 0 failed**

Final personalization contract:

- `guest_name` bind ke node asli template;
- guest URL input plain-text sanitized;
- mutation runtime hanya `textContent`;
- tidak membuat clone/new global guest UI;
- tidak force-visible node;
- tidak mengubah class/style/animation/identity node;
- nama tamu mengikuti typography/layout/animation template;
- `?to=Agus` tidak boleh menjalankan HTML/JS dari parameter.

Approximate aggregate locked regression checks across dedicated gates:

- Legacy: 26
- Golden: 58
- Device: 66
- Lifecycle: 92
- Personalization: 60
- Total dedicated assertions: **302**

Catatan: jumlah ini adalah agregat gate yang berbeda dan bukan pengganti manual acceptance test.

---

# 4. TEMPLATE 7 — GOLDEN AUTHORITY

Current production database record saat audit:

- UUID: `009e1a47-296f-4580-bedb-f0069f409d65`
- slug: `template-7-164ddf61`
- name: `Template 7`
- status: `draft`
- `is_active=false`
- source path: `https://jfvmcerrsxjvbiogfqes.supabase.co/storage/v1/object/public/template-packages/template-7-164ddf61/index.html`
- package path: `supabase://template-packages/template-7-164ddf61/manifest.json`
- editor version: `fetch-v2.1.1`
- renderer version: `immutable-baseline-delta-v2`
- source_of_truth: `editor-snapshot`
- fetch_handoff_id: `9dbf469c-3b54-42d8-9297-6584cc7103d8`

Golden rules:

- Template 7 artifact **READ-ONLY** selama regression.
- Jangan rewrite Golden supaya test hijau.
- Jangan mengganti baseline hash/fixture ketika engine gagal tanpa membuktikan source memang sengaja berubah.
- Jangan menambahkan hardcode selector/URL/timing Template 7 ke global engine hanya untuk membuat Golden PASS.
- Jika source upstream ART JAWA HITAM berubah, bedakan `upstream drift` dari `engine regression`; jangan otomatis menerima upstream baru sebagai Golden.

Known behavior Golden penting:

- cover/open choreography;
- opening background video `.motionSection` / Elementor element `36dc2bf`;
- source video `jawa-hitam-demo.mp4`;
- opening control `.tombolbuka` / `#tombolbuka`;
- source delay sekitar 100 ms untuk media trigger dan 3000 ms untuk motion text reveal;
- carousel widget `c7a6ff4`;
- timeline widget `4528199`;
- YouTube/video widget `b6188c0`;
- Elementor background slideshow / Ken Burns ownership.

---

# 5. TEMPLATE 8 — HISTORICAL / JANGAN DIANGGAP CURRENT AUTHORITY

Historical UUID yang pernah dipakai dalam diskusi:

`cb827da6-d723-47e0-abc4-e616a783bd4f`

Namun audit Supabase production pada checkpoint ini **tidak menemukan row Template 8** berdasarkan UUID/slug/name lama.

Aturan:

- jangan menulis ke UUID Template 8 lama berdasarkan memory saja;
- jika Template 8 perlu dipulihkan, cari artifact/history/revision lebih dulu;
- jangan membuat row pengganti dengan UUID yang sama tanpa recovery plan eksplisit;
- current DB truth lebih tinggi prioritas daripada memory chat lama.

---

# 6. VERCEL — VERIFIED HOSTING AUTHORITY SAAT INI

Vercel project:

- name: `dinifaqih`
- project ID: `prj_sOubhd28HYMTrGjTzklWd8ynA52U`
- team: `undangankuuuu`
- team ID: `team_CxvdeuCteay47aaNTEPSvr71`
- Node runtime configuration: 24.x

Production-facing domains attached to project:

- `dini-faqih.my.id`
- `www.dini-faqih.my.id`
- Vercel project domains also exist, including project/branch aliases.

## Production rule

`main` adalah production code baseline saat ini. Custom domain tidak boleh dialihkan ke Road-to-Final/Cloudflare tanpa explicit promotion decision.

## Preview rule

Branch `engine/road-to-final-dini-faqih` memakai Vercel branch preview (`target=null` / branch alias), bukan production target.

## Current Vercel quota warning

Current functional master HEAD `00dd300d...` mendapat GitHub Vercel status **FAILURE karena build-rate-limit / upgrade-to-Pro**, bukan karena CI regression code.

Artinya:

- `Vercel READY` dan `functional PASS` adalah dua hal berbeda;
- `Vercel failure build-rate-limit` juga tidak otomatis berarti code rusak;
- full Master-38 acceptance preview harus memakai deployment yang benar-benar berasal dari current locked implementation, bukan deployment lama.

Latest READY preview yang terverifikasi sebelum rate-limit berada pada personalization sequence, termasuk deployment dari commit `9dceb5cd89fa5525a22d80515214499b49316156`. Setelah commit tersebut masih ada perubahan personalization penting (`guest runtime`, public `?to=` bridge, regression/checkpoint docs). Karena itu **jangan gunakan READY preview lama sebagai bukti final bahwa seluruh 35–38 sudah terdeploy**.

Next acceptance preview membutuhkan salah satu:

1. Vercel quota/build-rate-limit pulih lalu deploy exact current acceptance branch; atau
2. preview provider terisolasi lain (mis. eksperimen Cloudflare) dengan aturan di bagian Cloudflare di bawah.

**Dilarang** menganggap branch preview sebagai production hanya karena link bisa dibuka.

---

# 7. SUPABASE — VERIFIED PRODUCTION DATA AUTHORITY

Supabase project:

- project ref / ID: `jfvmcerrsxjvbiogfqes`
- project name: `dini-anif undangan` (legacy naming project, tetapi ini project yang dipakai Dini–Faqih)
- organization: `snujhmscmzrygbloxnmh`
- region: `ap-southeast-1`
- project status at audit: `ACTIVE_HEALTHY`
- project URL: `https://jfvmcerrsxjvbiogfqes.supabase.co`
- Postgres: 17.x

## Critical DB environment fact

Saat checkpoint dibuat, **tidak ada Supabase development branch**.

Artinya DB yang terhubung adalah production project tunggal. Oleh karena itu:

- query audit/read-only boleh;
- schema/data mutation untuk eksperimen dilarang;
- jangan memakai production DB sebagai playground Cloudflare/Vercel preview;
- jika eksperimen membutuhkan schema mutation, buat environment/branch DB terpisah melalui keputusan eksplisit, termasuk pertimbangan biaya;
- migration production harus punya rollback dan backup/recovery plan.

## Storage authority

Arsitektur project memakai:

- Supabase Storage / `template-packages` untuk package/source authority;
- Backblaze B2 untuk workflow upload/storage tertentu melalui server-side signed endpoints.

Cloudflare R2 **belum menjadi storage authority Dini–Faqih**. Adopsi R2 nanti adalah keputusan arsitektur baru dan tidak boleh diam-diam menggantikan Supabase/B2.

## Security hardening backlog — jangan dicampur dengan visual promotion

Supabase advisor saat checkpoint memberi warning, antara lain:

- mutable function search path pada `public.dini_guest_slug_base`;
- beberapa `SECURITY DEFINER` function callable oleh anon/authenticated, termasuk:
  - `dini_assign_guest_contract()`
  - `dini_sync_active_template_to_invitation()`
  - `resolve_guest_slug(p_slug text)`
  - `uk_handle_new_user()`
  - `uk_is_admin()`
- leaked password protection disabled.

Ini adalah **hardening backlog** yang harus direview tersendiri. Jangan mengubahnya bersamaan dengan merge Road-to-Final hanya supaya satu release punya terlalu banyak perubahan.

## Performance backlog terpisah

Advisor juga mencatat antara lain:

- FK `invitations_active_template_id_fkey` belum punya covering index;
- RLS auth initialization plan warnings;
- multiple permissive policies;
- duplicate indexes pada slug invitations/templates;
- beberapa unused indexes.

Ini bukan alasan untuk memodifikasi production DB saat acceptance visual. Buat migration khusus setelah review policy/security.

---

# 8. BACKBLAZE B2

B2 termasuk storage path yang sudah ada di project melalui endpoint server-side seperti `/api/b2-sign-upload` dan `/api/b2-sign-delete`.

Aturan:

- jangan expose B2 credentials ke browser/repo/checkpoint;
- signed endpoint tetap server-side;
- jangan mengganti B2 dengan R2 hanya karena eksperimen Cloudflare;
- perubahan storage provider membutuhkan migration + integrity test package/manifest;
- Golden Template 7 tidak boleh dipindah/dihapus sebagai bagian eksperimen storage.

---

# 9. CLOUDFLARE — STATUS DAN BATAS EKSPERIMEN

## Current verified state

Tidak ada Cloudflare Workers/Pages/R2 deployment yang terverifikasi sebagai authority project **Dini & Faqih** pada checkpoint ini.

Cloudflare configuration dari project lain seperti 4N1F Labs, UndanganKuuu, html-to-video, atau tunnel/agent lain **DILARANG dicampur** dengan project ini.

## Jika Cloudflare dipakai setelah checkpoint

Status pertama wajib: **EXPERIMENT / PREVIEW ONLY**.

Branch naming yang disarankan:

`lab/cloudflare-preview-YYYYMMDD`

Branch harus dibuat dari locked engine/master acceptance commit, bukan dari `main` secara acak.

Cloudflare experiment MUST:

- memakai project/Worker/Pages name khusus Dini–Faqih;
- memakai hostname preview sendiri;
- tidak mengambil alih `dini-faqih.my.id` atau `www.dini-faqih.my.id`;
- tidak mengubah DNS production;
- tidak menggunakan KV/R2/database dari project lain;
- tidak mengubah Supabase production data sebagai bagian eksperimen;
- tidak menjadikan R2 source of truth tanpa keputusan arsitektur baru;
- menjalankan gate parity yang sama sebelum dianggap kandidat hosting;
- mencatat perbedaan runtime Vercel vs Cloudflare Functions/Workers jika API perlu dipindah.

Cloudflare experiment MAY:

- digunakan sebagai acceptance preview sementara jika Vercel preview terkena build-rate-limit;
- digunakan untuk menguji static/public renderer atau port server endpoints secara eksplisit;
- dijadikan kandidat staging setelah behavior parity terbukti.

Cloudflare experiment MUST NOT otomatis menjadi production.

Production migration Vercel -> Cloudflare, jika suatu hari dipilih, harus menjadi project/fase arsitektur tersendiri dengan DNS cutover, rollback, API runtime parity, cache policy, storage policy dan monitoring plan.

---

# 10. ATURAN BOLEH / TIDAK BOLEH

## BOLEH

1. Read/audit repo, Vercel, Supabase dan CI.
2. Membuat branch baru dari locked engine untuk acceptance/experiment.
3. Menjalankan Golden Regression, Device Matrix, Lifecycle, Personalization dan Legacy gate berulang kali.
4. Vercel preview branch deployment tanpa mengubah custom production domain.
5. Cloudflare preview terisolasi sesuai aturan di atas.
6. Supabase read-only query untuk sanity check.
7. Membuat template baru dari Fetch sebagai UUID baru.
8. Mengedit template existing lewat Template Editor dan menyimpan UUID yang sama setelah scope jelas.
9. Membuat checkpoint branch baru sebelum eksperimen besar.
10. Menambahkan diagnostics yang hanya membaca Source Truth.
11. Memperbaiki engine secara generic jika regression membuktikan bug lintas source.
12. Menjaga compatibility legacy/v0 di jalur yang guarded.

## DILARANG KERAS

1. Direct push ke `main` tanpa perintah eksplisit.
2. Merge `engine/road-to-final-dini-faqih` ke `main` hanya karena 1–38 COMPLETE.
3. Production deploy/promote tanpa acceptance preview current commit.
4. Mengubah DNS/custom production domain saat preview.
5. Force push/rewrite history branch checkpoint.
6. Rewrite Template 7 Golden supaya test hijau.
7. Menggunakan Fetch Save untuk overwrite UUID template existing.
8. Menggunakan Template Editor dengan semantics CREATE NEW UUID.
9. Menjalankan canonicalizer/destructive cleanup terhadap Source Truth baseline.
10. Force-visible semua node.
11. Global kill animation/transition hanya agar editor mudah diklik.
12. Hardcode selector, URL, element ID atau timing ART JAWA HITAM ke global engine sebagai solusi regression.
13. Menjalankan arbitrary source JavaScript (`eval`, unsafe direct execution) sebagai pengganti compiler safe plan.
14. Menganggap synthetic delay sebagai source timing tanpa menandai fallback.
15. Membiarkan legacy parity patch mengubah Source Truth snapshot.
16. Menganggap Vercel `READY` = functional PASS.
17. Menganggap screenshot PASS = lifecycle PASS.
18. Mengubah Supabase production schema/data untuk eksperimen tanpa migration/approval.
19. Menghapus RLS/security policy secara cepat untuk mengatasi error preview.
20. Menaruh service-role key, Vercel token, B2 secret, API key, password, cookie/session atau secret lain di repo/checkpoint/chat.
21. Mencampur Cloudflare account/project/config dari project lain.
22. Mengganti Supabase/B2 dengan Cloudflare R2 secara diam-diam.
23. Menghapus legacy compatibility files sebelum legacy parity gate membuktikan aman.
24. Mengubah Golden source upstream reference tanpa mencatat Golden version drift.
25. Menganggap Template 8 historical record masih hidup tanpa query DB/artifact proof.

---

# 11. ACCEPTANCE GATES WAJIB SEBELUM PRODUCTION

Sebelum merge/promotion production, kandidat exact commit wajib melewati:

1. **Legacy Parity Gate** — target locked: 26/26.
2. **Template 7 Golden Regression** — target locked: 58/58.
3. **Device Matrix**:
   - Desktop Chromium
   - Android Chromium
   - iPhone/WebKit
   Semua wajib PASS.
4. **Lifecycle Regression**:
   - Chromium 46/46
   - WebKit 46/46
5. **Personalization Regression**:
   - Chromium 30/30
   - WebKit 30/30
6. Manual visual acceptance:
   - cover;
   - open choreography;
   - background video;
   - slideshow/Ken Burns;
   - carousel;
   - timeline/scroll reveal;
   - audio/video;
   - gallery;
   - `?to=` guest name;
   - desktop/mobile layout;
   - no raw HTML/plain-text artifact render.
7. Manual editor acceptance:
   - Fetch Editor;
   - APPLY;
   - Clean Preview;
   - ZIP;
   - Save Template Baru creates NEW UUID;
   - Template Editor loads exact baseline and updates SAME UUID;
   - public renderer parity.
8. Supabase sanity check read-only before/after.

Tidak ada satu gate yang boleh diam-diam dilewati hanya karena yang lain hijau.

---

# 12. NEXT FLOW SETELAH CHECKPOINT INI

Road-to-Final coding 1–38 sudah complete. Tahap berikutnya **bukan langsung merge main**.

## STEP A — Freeze

- `main` freeze di `94c4fdd...`.
- functional master freeze di `00dd300d...`.
- master recovery disimpan di branch checkpoint ini.

## STEP B — Acceptance Preview Current Master

Buat acceptance branch dari `00dd300d...`, contoh:

`acceptance/master-38-preview`

Tujuan acceptance branch hanya staging/preview, bukan feature development.

Karena current Vercel HEAD terkena build-rate-limit:

- tunggu quota Vercel pulih / gunakan kapasitas resmi; atau
- buat Cloudflare experiment terisolasi jika memang ingin menguji preview di sana.

Jangan memakai deployment Vercel lama sebagai final visual acceptance untuk current master jika deployment itu belum mencakup semua commit personalization 35–38.

## STEP C — Run full regression gates

Jalankan Legacy + Golden + Device + Lifecycle + Personalization pada exact acceptance commit.

## STEP D — Manual Acceptance

Bandingkan Template 7 Golden dan public `?to=` secara visual/behavior di desktop + Android + iPhone.

Jika ada beda:

- jangan patch production;
- fix di branch turunan acceptance/engine;
- rerun seluruh gate yang terdampak;
- buat checkpoint baru.

## STEP E — Explicit Promotion Decision

Baru setelah user secara eksplisit mengatakan promote/merge ke production:

1. buat pre-production checkpoint branch/tag;
2. buat PR/migration plan ke `main`;
3. review diff `main...candidate`;
4. rerun CI pada merge candidate;
5. merge tanpa force push;
6. deploy production Vercel;
7. verify `dini-faqih.my.id` + `www.dini-faqih.my.id`;
8. smoke test production;
9. jika fail, rollback ke pre-production commit/deployment.

## STEP F — Post-production lock

Setelah production PASS:

- catat exact production Git SHA;
- catat exact Vercel deployment ID;
- catat Supabase schema/migration version jika ada;
- buat `checkpoint/production-YYYYMMDD-*`;
- update file recovery ini atau buat successor checkpoint, jangan mengedit sejarah checkpoint lama.

---

# 13. PREVIEW STRATEGY YANG DISARANKAN SEKARANG

Karena Master 38 sudah selesai tetapi production masih terpisah, urutan paling aman sekarang adalah:

**MASTER LOCK -> PREVIEW ACCEPTANCE -> FULL GATES -> MANUAL DEVICE TEST -> EXPLICIT PROMOTION -> MAIN -> PRODUCTION**

Bukan:

**MASTER LOCK -> LANGSUNG MAIN**

Dan bukan:

**VERCEL LIMIT -> LANGSUNG PINDAH PRODUCTION KE CLOUDFLARE**

Jika Cloudflare dipakai, posisinya:

**MASTER LOCK -> CLOUDFLARE EXPERIMENT PREVIEW -> PARITY PROOF -> tetap butuh explicit production decision**

---

# 14. PRODUCTION ROLLBACK LAW

Jika suatu future production promotion gagal:

- jangan memperbaiki live production dengan serangkaian hotfix acak;
- rollback ke production checkpoint yang diketahui baik;
- reproduksi masalah di preview branch;
- patch + regression di branch;
- promote lagi hanya setelah gate PASS.

Production rollback target sebelum Road-to-Final promotion adalah `main` baseline `94c4fdd...` selama belum ada production successor yang dikunci.

Database rollback harus diperlakukan terpisah dari code rollback; migration data tidak boleh dianggap otomatis reversible.

---

# 15. AUTHORITY PRIORITY SAAT ADA KONFLIK INFORMASI

Jika chat, memory, screenshot, DB dan repo berbeda, gunakan urutan authority berikut:

1. current production DB/storage state untuk data yang benar-benar hidup;
2. locked Git commit + regression artifacts untuk code behavior;
3. deployment metadata untuk hosting state;
4. checkpoint docs yang menunjuk commit exact;
5. chat/memory sebagai historical context saja.

Contoh nyata checkpoint ini: Template 8 pernah ada dalam historical discussion, tetapi current DB tidak menemukannya. Maka jangan bertindak seolah Template 8 masih current row.

---

# 16. RECOVERY PROCEDURE JIKA CHAT HILANG

Gunakan prompt recovery singkat:

`Lanjut Dini & Faqih dari checkpoint/master-recovery-2026-09-17. Baca MASTER-RECOVERY-CHECKPOINT-DINI-FAQIH-2026-09-17.md. main tetap frozen; jangan merge/promote production tanpa perintah eksplisit.`

Setelah itu lakukan verifikasi:

1. Fetch branch `main` dan cocokkan HEAD.
2. Fetch `engine/road-to-final-dini-faqih` dan cocokkan locked master / successor.
3. Baca `ROAD-TO-FINAL-MASTER-38-COMPLETE.txt`.
4. Baca `ROAD-TO-FINAL-PERSONALIZATION-35-38.txt`.
5. Cek status Vercel project/branch preview.
6. Cek Supabase project ACTIVE_HEALTHY.
7. Jangan mutate apa pun sebelum scope lanjutan ditentukan.

---

# 17. CURRENT KNOWN INFRA SUMMARY

| Layer | Current authority/status | Rule |
|---|---|---|
| GitHub production | `main @ 94c4fdd...` | FROZEN |
| GitHub engine | `engine/road-to-final-dini-faqih @ 00dd300d...` | MASTER 38 COMPLETE, not production |
| Recovery | `checkpoint/master-recovery-2026-09-17` | immutable restore point |
| Vercel | project `dinifaqih`, custom domains attached | production hosting authority |
| Vercel engine preview | branch preview | acceptance only |
| Vercel current HEAD | blocked by build-rate-limit | infra quota issue, not code verdict |
| Supabase | `jfvmcerrsxjvbiogfqes`, ACTIVE_HEALTHY | production DB/storage authority |
| Supabase dev branch | none | no DB playground |
| Backblaze B2 | integrated storage path | keep server-side secrets |
| Cloudflare | no verified Dini–Faqih deployment | EXPERIMENT ONLY if introduced |
| Cloudflare R2 | not authority | new architecture decision required |
| Template 7 | Golden read-only | never rewrite for test |
| Template 8 | historical reference; current row not found | re-discover before use |

---

# 18. FINAL LOCK STATEMENT

As of this recovery checkpoint:

- **Master Road-to-Final 1–38 is COMPLETE on engine branch.**
- **Cleanup point 34 is COMPLETE.**
- **Personalization 35–38 is COMPLETE and regression PASS 60/60.**
- **Template 7 remains Golden read-only.**
- **Production `main` has NOT been merged with Road-to-Final.**
- **Production promotion has NOT been authorized by this checkpoint.**
- **Cloudflare is NOT production authority for Dini–Faqih.**
- **Current recommended next phase is acceptance preview of the locked master, not new engine rewriting.**

Any future assistant/agent must preserve these boundaries unless the user explicitly changes the project policy.
