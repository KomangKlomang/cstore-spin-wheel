import { get, list, put } from "@vercel/blob";

const INDEX_PATH = "cstore-blob-index.json";

function tokenOrThrow() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("blob_not_configured");
  return token;
}

async function readIndex(token) {
  try {
    const blob = await get(INDEX_PATH, { access: "private", token });
    if (blob) return JSON.parse(await blob.text());
  } catch { /* try list */ }
  try {
    const found = await list({ prefix: "cstore", limit: 100, token });
    const indexBlob = found.blobs.find((b) => b.pathname === INDEX_PATH);
    if (indexBlob?.url) {
      const res = await fetch(indexBlob.url);
      if (res.ok) return JSON.parse(await res.text());
    }
  } catch { /* empty */ }
  return {};
}

async function writeIndex(token, index) {
  await put(INDEX_PATH, JSON.stringify(index), {
    access: "private",
    token,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json; charset=utf-8"
  });
}

async function readByUrl(url, fallback) {
  if (!url) return fallback;
  try {
    const res = await fetch(url);
    if (!res.ok) return fallback;
    const text = await res.text();
    if (!text.trim()) return fallback;
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

export async function readJsonBlob(pathname, fallback) {
  const token = tokenOrThrow();
  const index = await readIndex(token);
  const fromIndex = await readByUrl(index[pathname], null);
  if (fromIndex) return fromIndex;
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
  const saved = await put(pathname, body, {
    access: "private",
    token,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json; charset=utf-8"
  });
  const index = await readIndex(token);
  index[pathname] = saved.url;
  await writeIndex(token, index);
  return saved;
}

export async function readTextBlob(pathname, fallback = "") {
  const token = tokenOrThrow();
  const index = await readIndex(token);
  if (index[pathname]) {
    try {
      const res = await fetch(index[pathname]);
      if (res.ok) return await res.text();
    } catch { /* fall through */ }
  }
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
  const saved = await put(pathname, text, {
    access: "private",
    token,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType
  });
  const index = await readIndex(token);
  index[pathname] = saved.url;
  await writeIndex(token, index);
  return saved;
}
