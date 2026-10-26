import { readTextBlob, writeTextBlob } from "../lib/blob-json.js";
import { mergeStoreStock, parseRequestJson } from "../lib/game-state-store.js";

const ARCHIVE_PATH = "spin-archive/entries.jsonl";
const MAX_ROWS = 8000;
const STORES = new Set(["paskal", "taruma", "duyut", "kebonraya"]);

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

function validateEntry(entry) {
  if (!entry || typeof entry !== "object") return false;
  if (!STORES.has(entry.storeId)) return false;
  if (typeof entry.at !== "string" || !entry.at) return false;
  if (typeof entry.prize !== "string" || !entry.prize) return false;
  if (typeof entry.store !== "string" || !entry.store) return false;
  return true;
}

function parseArchiveText(text) {
  if (!text?.trim()) return [];
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function readArchive() {
  const text = await readTextBlob(ARCHIVE_PATH, "");
  return parseArchiveText(text);
}

async function writeArchive(rows) {
  const trimmed = rows.slice(-MAX_ROWS);
  const body = trimmed.map((row) => JSON.stringify(row)).join("\n");
  await writeTextBlob(ARCHIVE_PATH, body);
  return trimmed;
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
      const body = parseRequestJson(req);
      if (!validateEntry(body)) {
        return res.status(400).json({ error: "invalid payload" });
      }
      const { stockSnapshot, ...entry } = body;
      const rows = await readArchive();
      rows.push(entry);
      await writeArchive(rows);
      if (stockSnapshot && typeof stockSnapshot === "object") {
        try {
          await mergeStoreStock(entry.storeId, stockSnapshot);
        } catch (mergeErr) {
          console.error("merge stock after spin", mergeErr);
        }
      }
      return res.status(201).json({ ok: true });
    }

    if (req.method === "GET") {
      const key = req.query.key;
      if (!adminKeyOk(key)) {
        return res.status(401).json({ error: "unauthorized" });
      }

      const all = await readArchive();

      if (req.query.stats === "1") {
        const byStore = { paskal: 0, taruma: 0, duyut: 0, kebonraya: 0 };
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
      await writeArchive([]);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "method not allowed" });
  } catch (err) {
    console.error("spin archive api", err);
    const msg = String(err.message || err);
    const missingBlob = /blob_not_configured|BLOB_READ_WRITE_TOKEN/i.test(msg);
    return res.status(500).json({
      error: missingBlob ? "storage_not_configured" : "server_error",
      detail: msg.slice(0, 200)
    });
  }
}
