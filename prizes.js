/* Stok awal mengikuti lembar hadiah per toko. Sisa berjalan disimpan di browser. */
const DUYUT_PRIZES = [
  ["kaos", "Kaos", "KAOS", 5],
  ["gelas-kaca", "Gelas Kaca", "GELAS", 2],
  ["sticker", "Sticker", "STICKER", 10],
  ["lost-vape", "Device Lost Vape", "DEVICE", 3],
  ["freemax", "Freemax Tempat Device", "FREE", 3],
  ["tutup-liquid", "Tutup Liquid", "TUTUP", 2],
  ["dompet-dway", "Dompet Dway", "DOMPET", 2],
  ["tumbler-330", "Tumbler 330ml", "330ML", 2],
  ["saltnic", "Liquid Saltnic", "SALTNIC", 3],
  ["liquid-15", "Liquid 15ml", "15ML", 4],
  ["liquid-fb", "Liquid FB", "LIQ FB", 2],
  ["tumbler-500", "Tumbler 500ml", "500ML", 1],
  ["lanyard", "Lanyard", "LANYARD", 12],
  ["tempat-sampah", "Tempat Sampah Makna", "SAMPAH", 1],
  ["kotak-tisu", "Kotak Tisu", "TISU", 1]
];

const PASKAL_PRIZES = [
  ["gelas-kaca", "Gelas Kaca", "GELAS", 2],
  ["tempat-sampah", "Tempat Sampah Makna", "SAMPAH", 1],
  ["freemax", "Freemax Tempat Device", "FREE", 3],
  ["tutup-liquid", "Tutup Liquid", "TUTUP", 2],
  ["kotak-tisu", "Kotak Tisu", "TISU", 1],
  ["tumbler-500", "Tumbler 500ml", "500ML", 2],
  ["tumbler-330", "Tumbler 330ml", "330ML", 2],
  ["lost-vape", "Device Lost Vape", "DEVICE", 3],
  ["liquid-fb", "Liquid FB", "LIQ FB", 2],
  ["saltnic", "Liquid Saltnic", "SALTNIC", 3],
  ["liquid-15", "Liquid 15ml", "15ML", 4],
  ["tas-dunia", "Tas Dunia Juice", "TAS", 3],
  ["kaos", "Kaos", "KAOS", 15],
  ["sticker", "Sticker", "STICKER", 10],
  ["lanyard", "Lanyard", "LANYARD", 12]
];

function pack(rows) {
  return rows.map(([id, name, short, stock], i) => ({ id, name, short, stock, no: i + 1 }));
}

const STORES = {
  paskal: { name: "Paskal", prizes: pack(PASKAL_PRIZES) },
  taruma: { name: "Taruma", prizes: pack(DUYUT_PRIZES) },
  duyut: { name: "Duyut", prizes: pack(DUYUT_PRIZES) }
};

const DEFAULT_PIN = "cstore";
