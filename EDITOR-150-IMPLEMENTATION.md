# Dini Anif — Visual Editor 150 Pack

Release: V2.4 PRO-150

Paket ini menerapkan backlog 150 poin Visual Editor secara berkelompok tanpa mengubah flow utama:
Dashboard Admin → Fetch → Preview → Editor → APPLY (IndexedDB) → Download ZIP.

## Core selection & gallery fixes
- Klik foto/galeri sekarang diprioritaskan sebagai selection, bukan membuka lightbox/zoom.
- Visual Inspector tetap menampilkan Upload/Ganti, Generate, Hapus, Buka/Lihat, focal X/Y, zoom, rotate, fit, reset.
- Selection outline, deep hit-test dan Alt+Click overlap-cycle.
- Drag langsung di canvas, resize handles, numeric transform, keyboard nudge 1px / Shift 10px.

## Transform & image system
- Move, resize, rotate, opacity, radius, shadow, z-index.
- Fit cover/contain/fill, focal point, aspect-ratio lock.
- Lock/unlock, hide/show, reset, delete, duplicate, copy/paste.
- Bring front/back dan drag reorder layer.
- Foto baru sebagai Free Image Layer yang bisa ditempatkan bebas.
- Auto-compress foto besar ke WebP bila hasilnya lebih kecil.
- Batch replace galeri dan drag reorder slot galeri.

## Precision tools
- Smart center guides, optional grid + grid snapping.
- Measurement overlay (W/H/X/Y).
- Safe-area overlay.
- Desktop / Tablet / Mobile mode dengan responsive transform overrides.
- Anchor control, pinned-page/free-fixed mode untuk free layer.
- Canvas Fit, Canvas Zoom, Pan Mode.
- Original vs Edited comparison.
- Animation pause/play editing mode + duration/delay inspector.

## Layers & multi-edit
- Searchable/filterable Layers panel.
- Rename, select, multi-select Ctrl/Cmd.
- Align left/center/right/top/middle/bottom.
- Distribute horizontal/vertical.
- Group/Ungroup metadata.
- Multi-drag dan multi-resize.
- Jump to selected element/section via selection bridge.

## Reliability
- Undo/Redo multi-step.
- Autosave IndexedDB + recovery prompt.
- Manual named checkpoints.
- Dirty-state unload warning.
- APPLY snapshot tetap IndexedDB (tidak kembali ke localStorage besar).
- Free layer + responsive metadata ikut Production ZIP.
- Free-layer asset bisa direstore saat ZIP hasil editor di-import kembali.
- Editor-only outline/guides tidak ikut export.
- Export Preflight: missing asset, external dependency, hidden/locked/free layer report.
- Production dependency sweep yang sudah ada tetap dipertahankan.

## QA
- `node --check` seluruh JavaScript: PASS.
- Static feature assertions: PASS.
- String audit `project besar lain`: 0 reference.
- Flow lama Fetch / Preview / APPLY IndexedDB / ZIP dipertahankan.

Catatan: interaksi visual final tetap perlu smoke test di browser setelah deploy karena ukuran/layout setiap template hasil Fetch bisa berbeda.
