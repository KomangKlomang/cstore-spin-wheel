# C Store · Spin Wheel

Roda undian untuk tiga toko: Paskal, Taruma, dan Duyut. Stok awal mengikuti lembar hadiah masing-masing toko. Sisa stok tersimpan di browser.

Peluang sebuah hadiah mengikuti sisa stoknya. Hadiah yang habis hilang dari roda.

## Staf

Buka `#admin` atau tautan **Staf**. Kode awal: `cstore`. Dari sana stok bisa diubah, dikembalikan ke angka awal, dan satu toko bisa dikunci di layar utama.

## Arsip spin (CSV)

Setiap putar disimpan di **Arsip spin** (localStorage browser). Unduh sebagai `.csv` (bisa dibuka di Excel). Reset stok tidak menghapus arsip; **Hapus riwayat tampilan** hanya membersihkan daftar singkat di panel.

## Jalankan

```bash
python -m http.server 4173
```
