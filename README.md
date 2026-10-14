# C Store · Spin Wheel

Roda undian untuk tiga toko: **Paskal**, **Taruma**, dan **Duyut**.

- **Stok & daftar hadiah** — per browser/tablet (localStorage): ubah nama, tambah/hapus item, atur sisa stok di panel staf.
- **Arsip setiap spin** — disimpan di **Vercel KV** (server), gabungan semua perangkat.

Peluang menang mengikuti sisa stok. Hadiah yang habis hilang dari roda.

## Deploy di Vercel (disarankan)

GitHub Pages **tidak** menjalankan API arsip. Host project ini di Vercel.

1. Buka [vercel.com](https://vercel.com) → **Add New Project** → import repo `cstore-spin-wheel`.
2. **Storage** → **Create Database** → **KV** → Connect ke project yang sama (variabel `KV_*` terisi otomatis).
3. **Settings → Environment Variables** → tambah:
   - `SPIN_ADMIN_KEY` = `cstore` (samakan dengan kode staf panel; ganti jika Anda ubah kode di panel **dan** di Vercel).
4. Deploy. URL production (mis. `https://cstore-spin-wheel.vercel.app`) dipakai untuk semua tablet.

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
