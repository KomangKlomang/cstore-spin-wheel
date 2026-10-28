import { readJsonBlob, writeJsonBlob } from "./blob-json.js";
import { getState, setState, hasRedis } from "./redis-store.js";

const STATE_PATH = "cstore-spin-state.json";
const STORES = new Set(["paskal", "taruma", "duyut", "kebonraya", "soedarto"]);

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
  if (hasRedis()) {
    const data = await getState();
    if (data && data.version === 1) return data;
  }
  try {
    const blob = await readJsonBlob(STATE_PATH, emptyState());
    if (blob?.updatedAt) return blob;
    return emptyState();
  } catch (err) {
    if (/blob_not_configured/i.test(String(err.message))) throw err;
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
  if (hasRedis()) {
    await setState(next);
    return next;
  }
  await writeJsonBlob(STATE_PATH, next);
  return next;
}

export async function mergeStoreStock(storeId, stockSnapshot) {
  if (!STORES.has(storeId) || !stockSnapshot || typeof stockSnapshot !== "object") return null;
  const current = await loadGameState();
  const stock = { ...(current.stock || {}) };
  stock[storeId] = { ...(stock[storeId] || {}) };
  for (const [id, val] of Object.entries(stockSnapshot)) {
    stock[storeId][id] = Math.max(0, parseInt(val, 10) || 0);
  }
  return saveGameState({ prizes: current.prizes, stock });
}

export function parseRequestJson(req) {
  const raw = req.body;
  if (raw == null) return {};
  if (typeof raw === "object") return raw;
  if (typeof raw === "string" && raw.trim()) {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return {};
}

export { sanitizePrizes, sanitizeStock, emptyState, STORES };
