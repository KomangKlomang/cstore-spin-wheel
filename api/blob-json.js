import { list, put } from "@vercel/blob";

export async function readJsonBlob(pathname, fallback) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("blob_not_configured");

  const found = await list({ prefix: pathname.split("/")[0] + "/", limit: 20, token });
  const blob = found.blobs.find((b) => b.pathname === pathname) || found.blobs[0];
  if (!blob?.url) return fallback;

  const res = await fetch(blob.url);
  if (!res.ok) throw new Error("blob_read_failed");
  const text = await res.text();
  if (!text.trim()) return fallback;
  return JSON.parse(text);
}

export async function writeJsonBlob(pathname, data) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("blob_not_configured");

  const body = JSON.stringify(data);
  await put(pathname, body, {
    access: "private",
    token,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json; charset=utf-8"
  });
}
