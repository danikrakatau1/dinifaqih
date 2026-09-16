# Engine V3 Editor Fix 3.11.1

Checkpoint patch untuk Cloudflare FULL V3 staging.

Fix:
- left-click picker memilih editable element termasuk Buka Undangan
- editor-only click tidak menjalankan source action
- live delta guard mempertahankan edit saat runtime DOM berubah
- source content-protection alert dinetralkan hanya di editor iframe
- Clean Preview/ZIP authority tetap berasal dari frozen envelope + V3 delta

Commit engine version: 3.11.1-staging.2
Production main/Supabase write tidak disentuh.
