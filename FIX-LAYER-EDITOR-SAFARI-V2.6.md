# Dini Anif V2.6 — Editor Layer + Public Safari Fix

## Fix utama
1. Fetch Preview/source tetap tidak diubah (golden reference).
2. Fetch > Editor dan Dashboard Edit memakai runtime editor yang sama.
3. Editor Mode menonaktifkan pointer interception dari `.elementor-background-overlay` tanpa menghapus layer visual.
4. Field editable dan parent Elementor terdekat distabilkan visibility/opacity hanya saat Mode Edit.
5. Node editable yang native runtime sembunyikan sementara dapat ditampilkan di Mode Edit; Mode Interact kembali memakai state native.
6. `liveApply()` sekarang menerapkan field + transform state bersamaan, agar drag/resize tidak hanya bersifat sementara.
7. Pointerup tidak membuang state transform yang sudah ditulis.
8. Public homepage: horizontal overflow dikunci; opening hanya scroll vertikal.
9. Opening menggunakan 100dvh + fallback 100svh untuk Safari dynamic toolbar.
10. Background cover yang di-scale tidak boleh membuat horizontal scrollbar.
11. viewport-fit=cover dipastikan pada halaman utama.

## Regression target
- Fetch Preview tetap identik.
- Fetch > Editor: content/logo/text/button tidak hilang setelah idle/drag.
- Dashboard Edit: sama.
- Mode Edit: klik foto memilih Inspector, dekorasi tidak menutup selection.
- Mode Interact: Buka Undangan/link/form native tetap bekerja.
- Drag > pointerup > idle 10 detik: elemen tetap terlihat dan posisinya menetap.
- APPLY > Clean Preview > Download ZIP: memakai transform final.
- iPhone Safari public/tamu: tidak ada horizontal scrollbar dan layout mengikuti dynamic viewport.
