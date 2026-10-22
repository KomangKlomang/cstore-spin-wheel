/* Parser Purchase Order · baris produk FG GO SPIN WHEEL */

const PO_SPIN_PREFIX = /^FG\s*GO\s*SPIN\s*WHEEL\s+/i;

const PO_LINE_RE =
  /(?:^\d+\s+)?FG(\d+)\s+FG\s*GO\s*SPIN\s*WHEEL\s+(.+?)\s+(\d+)\s*(?:Pcs|PCS)?(?:\s|$)/i;

function titleCaseWords(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

function prizeNameFromPoSegment(segment) {
  const raw = String(segment || "").replace(PO_SPIN_PREFIX, "").trim();
  return titleCaseWords(raw);
}

function parsePurchaseOrderText(text) {
  const items = [];
  const seen = new Set();
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.replace(/\t+/g, " ").replace(/\s+/g, " ").trim();
    if (!/FG\d+/i.test(line) || !/SPIN\s*WHEEL/i.test(line)) continue;
    const m = line.match(PO_LINE_RE);
    if (!m) continue;
    const sku = `FG${m[1]}`;
    const id = `fg${m[1]}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const qty = Math.max(0, parseInt(m[3], 10) || 0);
    const name = prizeNameFromPoSegment(m[2]);
    items.push({ sku, id, name, qty });
  }
  return items;
}

/** PO Kebon Raya · PO/G/26/10/20/002332 */
const PO_PRESET_002332 = `1 FG2133 FG GO SPIN WHEEL KAOS 5 Pcs
2 FG2121 FG GO SPIN WHEEL BOTOL KACA 2 Pcs
3 FG2134 FG GO SPIN WHEEL STICKER 10 Pcs
4 FG2128 FG GO SPIN WHEEL DEVICE LOST VAPE 3 Pcs
5 FG2123 FG GO SPIN WHEEL FREEMAX TEMPAT DEVICE 3 Pcs
6 FG2124 FG GO SPIN WHEEL TUTUP LIQUID 2 Pcs
7 FG2132 FG GO SPIN WHEEL TAS DUNIA JUICE 2 Pcs
8 FG2127 FG GO SPIN WHEEL TUMBLER 330ML 2 Pcs
9 FG2130 FG GO SPIN WHEEL LIQUID SALTNIC 3 Pcs
10 FG2131 FG GO SPIN WHEEL LIQUID 15ML 4 Pcs
11 FG2129 FG GO SPIN WHEEL LIQUID FB 2 Pcs
12 FG2126 FG GO SPIN WHEEL TUMBLER 500ML 2 Pcs
13 FG2135 FG GO SPIN WHEEL LANYARD 12 Pcs
14 FG2122 FG GO SPIN WHEEL TEMPAT SAMPAH 1 Pcs
15 FG2125 FG GO SPIN WHEEL KOTAK TISSUE 1 Pcs`;

const PO_PRESETS = [
  {
    id: "PO-G-26-10-20-002332",
    label: "PO/G/26/10/20/002332 · Kebon Raya",
    text: PO_PRESET_002332
  }
];

function poItemsToPrizes(items) {
  return items.map((row, i) => ({
    id: row.id,
    name: row.name,
    short: shortFromNameGlobal(row.name),
    stock: row.qty,
    no: i + 1,
    sku: row.sku
  }));
}

function shortFromNameGlobal(name) {
  return String(name || "HADIAH").toUpperCase().replace(/\s+/g, " ").trim().slice(0, 24);
}
