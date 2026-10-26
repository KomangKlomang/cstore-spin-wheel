import {
  loadGameState,
  saveGameState,
  parseRequestJson,
  sanitizePrizes,
  sanitizeStock
} from "../lib/game-state-store.js";

function adminKeyOk(key) {
  const expected = process.env.SPIN_ADMIN_KEY || "cstore";
  return typeof key === "string" && key.length > 0 && key === expected;
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
      return res.status(200).json({ ...data, storage: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL ? "redis" : "blob" });
    }

    if (req.method === "PUT") {
      if (!adminKeyOk(req.query.key)) {
        return res.status(401).json({ error: "unauthorized" });
      }
      const body = parseRequestJson(req);
      const prizes = sanitizePrizes(body.prizes);
      const stock = sanitizeStock(body.stock);
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
      error: missingBlob ? "storage_not_configured" : "server_error",
      detail: msg.slice(0, 200)
    });
  }
}
