import { head, put } from "@vercel/blob";

function tokenOrThrow() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("blob_not_configured");
  return token;
}

export async function readJsonBlob(pathname, fallback) {
  const token = tokenOrThrow();
  try {
    const meta = await head(pathname, { token });
    const res = await fetch(meta.downloadUrl);
    if (!res.ok) throw new Error("blob_read_failed");
    const text = await res.text();
    if (!text.trim()) return fallback;
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

export async function writeJsonBlob(pathname, data) {
  const token = tokenOrThrow();
  const body = JSON.stringify(data);
  return put(pathname, body, {
    access: "private",
    token,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json; charset=utf-8"
  });
}

export async function readTextBlob(pathname, fallback = "") {
  const token = tokenOrThrow();
  try {
    const meta = await head(pathname, { token });
    const res = await fetch(meta.downloadUrl);
    if (!res.ok) throw new Error("blob_read_failed");
    return await res.text();
  } catch {
    return fallback;
  }
}

export async function writeTextBlob(pathname, text, contentType = "text/plain; charset=utf-8") {
  const token = tokenOrThrow();
  return put(pathname, text, {
    access: "private",
    token,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType
  });
}
