import { list, put } from "@vercel/blob";

export async function readJsonBlob(pathname, fallback) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("blob_not_configured");

  const prefix = pathname.includes("/") ? pathname.slice(0, pathname.lastIndexOf("/") + 1) : "";
  const found = await list({ prefix, limit: 50, token });
  const blob = found.blobs.find((b) => b.pathname === pathname);
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
    access: "public",
    token,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json; charset=utf-8"
  });
}

export async function readTextBlob(pathname, fallback = "") {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("blob_not_configured");

  const prefix = pathname.includes("/") ? pathname.slice(0, pathname.lastIndexOf("/") + 1) : "";
  const found = await list({ prefix, limit: 50, token });
  const blob = found.blobs.find((b) => b.pathname === pathname);
  if (!blob?.url) return fallback;

  const res = await fetch(blob.url);
  if (!res.ok) throw new Error("blob_read_failed");
  return await res.text();
}

export async function writeTextBlob(pathname, text, contentType = "text/plain; charset=utf-8") {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("blob_not_configured");

  await put(pathname, text, {
    access: "public",
    token,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType
  });
}
