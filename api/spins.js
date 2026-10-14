import { kv } from "@vercel/kv";

const LIST_KEY = "cstore:spin:archive";
const MAX_ROWS = 8000;
const STORES = new Set(["paskal", "taruma", "duyut"]);

function adminKeyOk(key) {
  const expected = process.env.SPIN_ADMIN_KEY || "cstore";
  return typeof key === "string" && key.length > 0 && key === expected;
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function rowsToCsv(rows) {
  const header = ["No", "Tanggal", "Waktu", "Toko", "Hadiah", "Sisa hadiah", "Sisa total toko"];
  const body = rows.map((row, index) => [
    index + 1,
    row.date,
    row.time,
    row.store,
    row.prize,
    row.stockLeft,
    row.storeStockLeft
  ].map(csvCell).join(","));
  return [header.join(","), ...body].join("\r\n");
}

function parseRows(raw) {
  return raw.map((line) => JSON.parse(line));
}

function validateEntry(entry) {
  if (!entry || typeof entry !== "object") return false;
  if (!STORES.has(entry.storeId)) return false;
  if (typeof entry.at !== "string" || !entry.at) return false;
  if (typeof entry.prize !== "string" || !entry.prize) return false;
  if (typeof entry.store !== "string" || !entry.store) return false;
  return true;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  try {
    if (req.method === "POST") {
      const entry = req.body;
      if (!validateEntry(entry)) {
        return res.status(400).json({ error: "invalid payload" });
      }
      await kv.lpush(LIST_KEY, JSON.stringify(entry));
      await kv.ltrim(LIST_KEY, 0, MAX_ROWS - 1);
      return res.status(201).json({ ok: true });
    }

    if (req.method === "GET") {
      const key = req.query.key;
      if (!adminKeyOk(key)) {
        return res.status(401).json({ error: "unauthorized" });
      }

      const raw = await kv.lrange(LIST_KEY, 0, -1);
      const all = parseRows(raw);

      if (req.query.stats === "1") {
        const byStore = { paskal: 0, taruma: 0, duyut: 0 };
        for (const row of all) {
          if (byStore[row.storeId] !== undefined) byStore[row.storeId] += 1;
        }
        return res.status(200).json({ total: all.length, byStore });
      }

      const store = req.query.store;
      let rows = all.slice();
      if (store && STORES.has(store)) {
        rows = rows.filter((row) => row.storeId === store);
      }
      rows.reverse();

      if (req.query.format === "csv") {
        const slug = store || "semua-toko";
        const stamp = new Date().toISOString().slice(0, 10);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="cstore-spin-${slug}-${stamp}.csv"`
        );
        return res.status(200).send("\uFEFF" + rowsToCsv(rows));
      }

      return res.status(200).json({ total: rows.length, rows });
    }

    if (req.method === "DELETE") {
      if (!adminKeyOk(req.query.key)) {
        return res.status(401).json({ error: "unauthorized" });
      }
      await kv.del(LIST_KEY);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "method not allowed" });
  } catch (err) {
    console.error("spin archive api", err);
    const missingKv = /KV|REST|redis/i.test(String(err.message));
    return res.status(500).json({
      error: missingKv ? "kv_not_configured" : "server_error"
    });
  }
}
