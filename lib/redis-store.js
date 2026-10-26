import { Redis } from "@upstash/redis";

const STATE_KEY = "cstore:game-state";
const ARCHIVE_KEY = "cstore:spin-archive";

function redisClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export function hasRedis() {
  return !!redisClient();
}

export async function getState() {
  const r = redisClient();
  if (!r) return null;
  return r.get(STATE_KEY);
}

export async function setState(data) {
  const r = redisClient();
  if (!r) return false;
  await r.set(STATE_KEY, data);
  return true;
}

export async function getArchiveRows() {
  const r = redisClient();
  if (!r) return null;
  const rows = await r.get(ARCHIVE_KEY);
  return Array.isArray(rows) ? rows : [];
}

export async function setArchiveRows(rows) {
  const r = redisClient();
  if (!r) return false;
  await r.set(ARCHIVE_KEY, rows);
  return true;
}
