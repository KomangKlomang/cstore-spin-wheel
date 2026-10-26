# C Store · Spin Wheel

Roda undian untuk tiga toko: **Paskal**, **Taruma**, dan **Duyut**.

- **Stok & daftar hadiah** — disinkron ke **server** (Vercel Blob); saat buka app, data diambil dari server. Cache kecil di browser hanya cadangan.
- **Arsip setiap spin** — juga di server (CSV unduh di panel staf).

Peluang menang mengikuti sisa stok. Hadiah yang habis hilang dari roda.

## Deploy di Vercel (disarankan)

GitHub Pages **tidak** menjalankan API arsip. Host project ini di Vercel.

Production: **https://cstore-spin-wheel.vercel.app** (bukan GitHub Pages).

Jika setup ulang:

1. Import repo `KomangKlomang/cstore-spin-wheel` di [vercel.com](https://vercel.com).
2. **Storage → Marketplace → Upstash Redis** (gratis) → **Connect** ke project (`UPSTASH_REDIS_*` atau `KV_REST_*` otomatis). Wajib untuk sync stok laptop ↔ toko.
3. **Blob** (opsional) tetap dipakai jika Redis belum ada.
3. Env `SPIN_ADMIN_KEY` = `cstore` (sama dengan kode staf panel).
4. Redeploy setelah Redis terhubung.

### Arsip spin

| Aksi | Cara |
|------|------|
| Catat spin | Otomatis `POST /api/spins` setiap hadiah keluar |
| Unduh CSV | Panel staf → **Unduh CSV** (pakai kode staf = `SPIN_ADMIN_KEY`) |
| Hapus arsip server | Panel staf → **Hapus arsip di server** |

Kolom CSV: No, Tanggal, Waktu, Toko, Hadiah, Sisa hadiah, Sisa total toko.

## Panel staf

Buka `#admin` atau tautan **Staf**. Kode awal: `cstore`.

## Lokal

```bash
npm install
npx vercel dev
```

Butuh KV di project Vercel (link lewat CLI) agar arsip jalan di lokal.
