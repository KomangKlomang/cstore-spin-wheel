import { get, put } from "@vercel/blob";

function tokenOrThrow() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("blob_not_configured");
  return token;
}

export async function readJsonBlob(pathname, fallback) {
  const token = tokenOrThrow();
  try {
    const blob = await get(pathname, { access: "private", token });
    if (!blob) return fallback;
    const text = await blob.text();
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
    const blob = await get(pathname, { access: "private", token });
    if (!blob) return fallback;
    return await blob.text();
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
