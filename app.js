const KEY = "cstore-spin-v2";
const TAU = Math.PI * 2;

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");
const spinBtn = document.getElementById("spinBtn");
const pointer = document.getElementById("pointer");
const resultDlg = document.getElementById("result");

const saved = load();
const state = {
  pin: saved.pin || DEFAULT_PIN,
  lock: saved.lock || null,
  choice: saved.choice || null,
  stock: mergeStock(saved.stock),
  history: saved.history || { paskal: [], taruma: [], duyut: [] }
};

let rotation = 0;
let spinning = false;
let board = [];
let audioCtx;
let adminStore = "paskal";

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
  catch { return {}; }
}

function mergeStock(prev) {
  const stock = {};
  for (const id of Object.keys(STORES)) {
    stock[id] = {};
    for (const prize of STORES[id].prizes) {
      const kept = prev?.[id]?.[prize.id];
      stock[id][prize.id] = Number.isFinite(kept) ? kept : prize.stock;
    }
  }
  return stock;
}

function persist() {
  localStorage.setItem(KEY, JSON.stringify({
    pin: state.pin,
    lock: state.lock,
    choice: state.choice,
    stock: state.stock,
    history: state.history
  }));
}

function activeStoreId() {
  return state.lock || state.choice;
}

function qty(storeId, prizeId) {
  return state.stock[storeId][prizeId] || 0;
}

function slicesFor(storeId) {
  return STORES[storeId].prizes.filter((p) => qty(storeId, p.id) > 0);
}

function sumStock(storeId) {
  return STORES[storeId].prizes.reduce((n, p) => n + qty(storeId, p.id), 0);
}

function render() {
  const admin = location.hash === "#admin";
  const storeId = activeStoreId();
  document.getElementById("picker").hidden = admin || !!storeId;
  document.getElementById("floor").hidden = admin || !storeId;
  document.getElementById("admin").hidden = !admin;
  document.getElementById("navLink").textContent = admin ? "Ke roda" : "Staf";
  document.getElementById("navLink").href = admin ? "#" : "#admin";

  if (!admin && !storeId) {
    document.getElementById("crumb").textContent = "Pilih toko";
    renderPicker();
    return;
  }
  if (!admin && storeId) {
    document.getElementById("crumb").textContent = STORES[storeId].name;
    renderFloor(storeId);
    return;
  }
  document.getElementById("crumb").textContent = "Panel staf";
  const authed = sessionStorage.getItem("cstore-staff") === "1";
  document.getElementById("login").hidden = authed;
  document.getElementById("panel").hidden = !authed;
  if (authed) renderAdmin();
}

function renderPicker() {
  document.getElementById("storeButtons").innerHTML = Object.entries(STORES).map(([id, store]) => `
    <button type="button" data-store="${id}">
      <strong>${store.name}</strong>
      <span>sisa ${sumStock(id)}</span>
    </button>`).join("");
}

function renderFloor(storeId) {
  const store = STORES[storeId];
  board = slicesFor(storeId);
  document.getElementById("storeTitle").textContent = store.name;
  document.getElementById("remain").textContent = `${sumStock(storeId)} hadiah tersisa. Peluang ikut sisa stok.`;
  document.getElementById("switchStore").hidden = !!state.lock;
  document.getElementById("emptyMsg").hidden = board.length > 0;
  spinBtn.disabled = board.length === 0 || spinning;
  if (!spinning && rotation === 0 && board.length) {
    const arc = TAU / board.length;
    rotation = (TAU - 0.5 * arc) % TAU;
  }
  document.getElementById("prizeList").innerHTML = store.prizes.map((p) => {
    const left = qty(storeId, p.id);
    return `<li class="${left ? "" : "gone"}">
      <span class="no">${String(p.no).padStart(2, "0")}</span>
      <span class="name">${p.name}</span>
      <span class="qty">${left}</span>
    </li>`;
  }).join("");
  const log = state.history[storeId] || [];
  document.getElementById("history").innerHTML = log.length
    ? log.slice(0, 5).map((h) => `<li><span>${h.name}</span></li>`).join("")
    : "<li>Belum ada.</li>";
}

function renderAdmin() {
  document.getElementById("lockRow").innerHTML = [
    `<button type="button" data-lock="" aria-pressed="${state.lock ? "false" : "true"}">Bebas dipilih</button>`,
    ...Object.entries(STORES).map(([id, store]) =>
      `<button type="button" data-lock="${id}" aria-pressed="${state.lock === id ? "true" : "false"}">${store.name}</button>`)
  ].join("");

  document.getElementById("tabs").innerHTML = Object.entries(STORES).map(([id, store]) =>
    `<button type="button" role="tab" data-tab="${id}" aria-selected="${adminStore === id ? "true" : "false"}">${store.name}</button>`
  ).join("");

  const store = STORES[adminStore];
  document.getElementById("tableCaption").textContent = `Stok ${store.name}`;
  document.getElementById("stockBody").innerHTML = store.prizes.map((p) => `
    <tr>
      <td>${p.no}</td>
      <td>${p.name}</td>
      <td>${p.stock}</td>
      <td><input type="number" min="0" step="1" inputmode="numeric" aria-label="Sisa ${p.name}" data-qty="${p.id}" value="${qty(adminStore, p.id)}"></td>
    </tr>`).join("");

  const log = state.history[adminStore] || [];
  document.getElementById("adminHistory").innerHTML = log.length
    ? log.map((h) => `<li><span>${h.name}</span><span>${h.when}</span></li>`).join("")
    : "<li>Belum ada.</li>";
}

function draw(rot) {
  const dpr = window.devicePixelRatio || 1;
  const size = canvas.clientWidth || 560;
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 8;
  const n = board.length;

  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.fillStyle = "#2c2824";
  ctx.fill();
  if (!n) return;

  const arc = TAU / n;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  board.forEach((p, i) => {
    const a0 = -Math.PI / 2 + i * arc;
    const light = i % 2 === 0;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, R - 10, a0, a0 + arc);
    ctx.closePath();
    ctx.fillStyle = light ? "#f4efe4" : "#2c2824";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#1c1915";
    ctx.stroke();

    ctx.save();
    ctx.rotate(a0 + arc / 2);
    ctx.translate((R - 10) * 0.58, 0);
    ctx.rotate(-(rot + a0 + arc / 2));
    ctx.fillStyle = light ? "#1c1915" : "#f4efe4";
    ctx.font = `600 ${Math.max(10, Math.round(size * 0.026))}px "IBM Plex Sans", "Segoe UI", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(p.short, 0, 0);
    ctx.restore();
  });
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.16, 0, TAU);
  ctx.fillStyle = "#1c1915";
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, R - 4, 0, TAU);
  ctx.lineWidth = Math.max(8, size * 0.02);
  ctx.strokeStyle = "#1c1915";
  ctx.stroke();
}

function indexAtPointer(rot, n) {
  const arc = TAU / n;
  const rel = ((-rot % TAU) + TAU) % TAU;
  return Math.floor(rel / arc) % n;
}

function tick() {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.frequency.value = 520;
  g.gain.setValueAtTime(0.03, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.03);
  o.connect(g);
  g.connect(audioCtx.destination);
  o.start();
  o.stop(audioCtx.currentTime + 0.04);
}

function loop() {
  if (!document.getElementById("floor").hidden) draw(rotation);
  requestAnimationFrame(loop);
}

function spin() {
  const storeId = activeStoreId();
  if (!storeId || spinning) return;
  board = slicesFor(storeId);
  if (!board.length) return;
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  if (audioCtx) audioCtx.resume();

  const total = board.reduce((n, p) => n + qty(storeId, p.id), 0);
  let roll = Math.random() * total;
  let idx = board.length - 1;
  for (let i = 0; i < board.length; i++) {
    roll -= qty(storeId, board[i].id);
    if (roll < 0) { idx = i; break; }
  }

  spinning = true;
  spinBtn.disabled = true;
  const arc = TAU / board.length;
  const turns = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 5 + Math.floor(Math.random() * 2);
  const dur = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 700 : 5200;
  const current = ((rotation % TAU) + TAU) % TAU;
  const desired = ((TAU - (idx + 0.5) * arc) % TAU + TAU) % TAU;
  let delta = desired - current;
  if (delta < 0) delta += TAU;
  delta += turns * TAU;
  const from = rotation;
  const start = performance.now();
  let crossed = indexAtPointer(rotation, board.length);

  (function step(now) {
    const t = Math.min(1, (now - start) / dur);
    const e = 1 - Math.pow(1 - t, 4);
    rotation = from + delta * e;
    const at = indexAtPointer(rotation, board.length);
    if (at !== crossed) {
      crossed = at;
      pointer.classList.remove("tick");
      void pointer.offsetWidth;
      pointer.classList.add("tick");
      tick();
    }
    if (t < 1) requestAnimationFrame(step);
    else finish(storeId, idx);
  })(start);
}

function finish(storeId, idx) {
  spinning = false;
  const prize = board[idx];
  state.stock[storeId][prize.id] = Math.max(0, qty(storeId, prize.id) - 1);
  const when = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  state.history[storeId] = [{ name: prize.name, when }, ...(state.history[storeId] || [])].slice(0, 30);
  persist();
  render();
  document.getElementById("resultStore").textContent = STORES[storeId].name;
  document.getElementById("resultName").textContent = prize.name;
  document.getElementById("resultStock").textContent = `Sisa ${qty(storeId, prize.id)}`;
  resultDlg.showModal();
}

function applyHash() {
  const hash = location.hash.slice(1);
  if (STORES[hash] && (!state.lock || state.lock === hash)) state.choice = hash;
}

document.getElementById("storeButtons").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-store]");
  if (!btn || state.lock) return;
  rotation = 0;
  location.hash = btn.dataset.store;
});

document.getElementById("switchStore").addEventListener("click", () => {
  if (state.lock || spinning) return;
  state.choice = null;
  persist();
  location.hash = "";
});

spinBtn.addEventListener("click", spin);
window.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !resultDlg.open && location.hash !== "#admin" && activeStoreId()) {
    e.preventDefault();
    spin();
  }
});
resultDlg.addEventListener("close", () => {
  if (resultDlg.returnValue === "again") spin();
});

document.getElementById("login").addEventListener("submit", (e) => {
  e.preventDefault();
  const value = document.getElementById("pin").value;
  const ok = value === state.pin;
  document.getElementById("loginError").hidden = ok;
  if (!ok) return;
  sessionStorage.setItem("cstore-staff", "1");
  document.getElementById("pin").value = "";
  render();
});

document.getElementById("logout").addEventListener("click", () => {
  sessionStorage.removeItem("cstore-staff");
  render();
});

document.getElementById("lockRow").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-lock]");
  if (!btn) return;
  state.lock = btn.dataset.lock || null;
  if (state.lock) state.choice = state.lock;
  persist();
  render();
});

document.getElementById("tabs").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-tab]");
  if (!btn) return;
  adminStore = btn.dataset.tab;
  renderAdmin();
});

document.getElementById("stockBody").addEventListener("change", (e) => {
  const input = e.target.closest("[data-qty]");
  if (!input || spinning) return;
  const next = Math.max(0, parseInt(input.value, 10) || 0);
  input.value = String(next);
  state.stock[adminStore][input.dataset.qty] = next;
  persist();
});

document.getElementById("resetStore").addEventListener("click", () => {
  const store = STORES[adminStore];
  if (!window.confirm(`Kembalikan stok ${store.name} ke angka awal?`)) return;
  for (const prize of store.prizes) state.stock[adminStore][prize.id] = prize.stock;
  persist();
  renderAdmin();
});

document.getElementById("clearHistory").addEventListener("click", () => {
  state.history[adminStore] = [];
  persist();
  renderAdmin();
});

document.getElementById("pinForm").addEventListener("submit", (e) => {
  e.preventDefault();
  state.pin = document.getElementById("newPin").value;
  persist();
  document.getElementById("newPin").value = "";
  const note = document.getElementById("pinSaved");
  note.hidden = false;
});

window.addEventListener("hashchange", () => {
  applyHash();
  persist();
  render();
});
applyHash();
render();
document.fonts.ready.then(loop);
