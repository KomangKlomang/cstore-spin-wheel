# C Store · Spin Wheel

Roda undian untuk tiga toko: **Paskal**, **Taruma**, dan **Duyut**.

- **Stok & daftar hadiah** — per browser/tablet (localStorage): ubah nama, tambah/hapus item, atur sisa stok di panel staf.
- **Arsip setiap spin** — disimpan di **Vercel KV** (server), gabungan semua perangkat.

Peluang menang mengikuti sisa stok. Hadiah yang habis hilang dari roda.

## Deploy di Vercel (disarankan)

GitHub Pages **tidak** menjalankan API arsip. Host project ini di Vercel.

Production: **https://cstore-spin-wheel.vercel.app** (bukan GitHub Pages).

Jika setup ulang:

1. Import repo `KomangKlomang/cstore-spin-wheel` di [vercel.com](https://vercel.com).
2. **Storage → Marketplace → Upstash Redis** (gratis) → **Connect** ke project ini (`KV_*` env otomatis).
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
