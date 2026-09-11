# DINI ANIF — FINAL 2 BUG FIX V2.8

Scope dibekukan hanya dua bug:

1. iPhone Safari public/main viewport
   - Hapus meta theme-color homepage agar tidak memaksa tint Safari yang berbeda dari Dashboard/Fetch.
   - iOS Safari memakai visualViewport.height sebagai tinggi opening runtime.
   - Sync pada resize/visual viewport scroll/orientationchange.
   - Root horizontal overflow tetap dikunci.
   - Source Fetch/Preview tidak diubah.

2. Dashboard Edit — klik foto membuka lightbox/zoom
   - Penyebab: homepage gallery memakai <button class="gallery-item">, sementara bridge Editor menganggap semua button sebagai native interaction.
   - Media hit-test sekarang diprioritaskan sebelum interactive-button bypass.
   - Klik image/background/video/audio di Editor: prevent native action + select field + buka Inspector.
   - Tombol asli seperti Buka Undangan tetap native karena tidak diklasifikasikan sebagai media.

Regression statis:
- dashboard-admin-edit/editor.js syntax PASS
- public assets/js/script.js syntax PASS
- root/index.html parse PASS
- dashboard-admin-edit/index.html parse PASS
