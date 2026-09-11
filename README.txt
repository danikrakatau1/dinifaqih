UNDANGAN ONLINE FAQIH & DINI
============================

Cara pakai:
1. Upload seluruh isi folder ini ke Netlify Drop.
2. Buka index.html untuk preview lokal.
3. Semua foto sudah berada di assets/images dan tidak membutuhkan Google Drive.
4. Tombol Google Maps dan WhatsApp memang membuka layanan eksternal.

MUSIK LOKAL (OPSIONAL)
-----------------------
Jika ingin musik background:
- siapkan file MP3 milik Anda sendiri
- beri nama: lagu-pernikahan.mp3
- simpan ke: assets/music/lagu-pernikahan.mp3
- tidak perlu mengubah HTML/JS.

PERSONALISASI NAMA TAMU
-----------------------
Gunakan parameter URL:
index.html?to=Nama%20Tamu
Contoh:
index.html?to=Bapak%20Andi

DATA ACARA
----------
Akad: Jumat, 25 September 2026, 07.00 WIB
Resepsi: Jumat, 25 September 2026, 13.00 WIB - selesai
Lokasi: Dukuh Madureso, Sidorejo, Kec. Warungasem, Kabupaten Batang

Catatan:
- Website dibuat tanpa library/CDN eksternal agar dapat dipindahkan sebagai satu folder.
- Untuk performa, foto tetap dalam JPG resolusi 1365x2048 dengan ukuran file sekitar 0,5-0,6 MB per foto.


MUSIK: Setelah pengunjung menekan 'Buka Undangan', musik otomatis mulai diputar. Ini menggunakan interaksi tombol pembuka agar kompatibel dengan kebijakan autoplay browser. Tombol musik hanya muncul sebagai fallback jika browser menolak playback otomatis.


DASHBOARD ADMIN — TAMU, FOTO & MUSIK
-------------------------------------
1. Jalankan file SUPABASE-DASHBOARD-ASSETS.sql di Supabase SQL Editor.
2. Pastikan user admin sudah dibuat di Supabase Authentication.
3. Upload project ini ke Netlify (atau hosting lain).
4. Buka generator-tamu-supabase-final.html.
5. Login dengan akun admin.
6. Menu Tamu: tambah/hapus tamu, generate link, ubah RSVP, export CSV.
7. Menu Foto: upload/ganti foto cover, mempelai, dan galeri 1-6.
8. Menu Musik: upload MP3 dan aktifkan musik baru.

Catatan:
- Foto dan musik yang diupload dari Dashboard disimpan di Supabase Storage bucket "invitation-assets".
- Halaman undangan publik membaca aset aktif dari tabel public.site_assets.
- Jika aset dashboard belum tersedia, undangan tetap memakai file lokal di assets/images dan assets/music.
- Jangan mengubah atau membagikan SUPABASE_SERVICE_ROLE_KEY. Dashboard cukup memakai anon/publishable key karena akses upload dibatasi oleh policy authenticated.
