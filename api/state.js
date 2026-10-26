import { readJsonBlob, writeJsonBlob } from "./blob-json.js";

const STATE_PATH = "spin-state/global.json";
const STORES = new Set(["paskal", "taruma", "duyut", "kebonraya"]);

function adminKeyOk(key) {
  const expected = process.env.SPIN_ADMIN_KEY || "cstore";
  return typeof key === "string" && key.length > 0 && key === expected;
}

function emptyState() {
  return { version: 1, prizes: {}, stock: {}, updatedAt: null };
}

function sanitizePrizes(prizes) {
  if (!prizes || typeof prizes !== "object") return null;
  const out = {};
  for (const storeId of STORES) {
    const rows = prizes[storeId];
    if (!Array.isArray(rows)) continue;
    out[storeId] = rows
      .filter((p) => p && typeof p.id === "string")
      .map((p, i) => ({
        id: p.id,
        name: String(p.name || "Hadiah").slice(0, 120),
        short: String(p.short || p.name || "").slice(0, 32),
        stock: Math.max(0, parseInt(p.stock, 10) || 0),
        no: i + 1
      }));
  }
  return out;
}

function sanitizeStock(stock) {
  if (!stock || typeof stock !== "object") return null;
  const out = {};
  for (const storeId of STORES) {
    const row = stock[storeId];
    if (!row || typeof row !== "object") continue;
    out[storeId] = {};
    for (const [id, val] of Object.entries(row)) {
      out[storeId][id] = Math.max(0, parseInt(val, 10) || 0);
    }
  }
  return out;
}

export async function loadGameState() {
  try {
    return await readJsonBlob(STATE_PATH, emptyState());
  } catch {
    return emptyState();
  }
}

export async function saveGameState(partial) {
  const current = await loadGameState();
  const next = {
    version: 1,
    prizes: partial.prizes ?? current.prizes ?? {},
    stock: partial.stock ?? current.stock ?? {},
    updatedAt: new Date().toISOString()
  };
  await writeJsonBlob(STATE_PATH, next);
  return next;
}

export async function mergeStoreStock(storeId, stockSnapshot) {
  if (!STORES.has(storeId) || !stockSnapshot || typeof stockSnapshot !== "object") return;
  const current = await loadGameState();
  const stock = { ...(current.stock || {}) };
  stock[storeId] = { ...(stock[storeId] || {}) };
  for (const [id, val] of Object.entries(stockSnapshot)) {
    stock[storeId][id] = Math.max(0, parseInt(val, 10) || 0);
  }
  return saveGameState({ prizes: current.prizes, stock });
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  try {
    if (req.method === "GET") {
      const data = await loadGameState();
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json(data);
    }

    if (req.method === "PUT") {
      if (!adminKeyOk(req.query.key)) {
        return res.status(401).json({ error: "unauthorized" });
      }
      const prizes = sanitizePrizes(req.body?.prizes);
      const stock = sanitizeStock(req.body?.stock);
      const current = await loadGameState();
      const saved = await saveGameState({
        prizes: prizes ?? current.prizes,
        stock: stock ?? current.stock
      });
      return res.status(200).json(saved);
    }

    return res.status(405).json({ error: "method not allowed" });
  } catch (err) {
    console.error("state api", err);
    const msg = String(err.message || err);
    const missingBlob = /blob_not_configured|BLOB_READ_WRITE_TOKEN/i.test(msg);
    return res.status(500).json({
      error: missingBlob ? "storage_not_configured" : "server_error"
    });
  }
}
