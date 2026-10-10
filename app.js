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

const PALETTE = [
  ["#FF5A2C", "#FFF8F4"],
  ["#FFC93C", "#10131A"],
  ["#14B8B0", "#06201F"],
  ["#F4EEE3", "#10131A"],
  ["#E04518", "#FFF8F4"],
  ["#F6D36B", "#10131A"],
  ["#0E8F8A", "#F4EEE3"],
  ["#E7D7BC", "#10131A"]
];
const STORE_ACCENT = {
  paskal: ["#FF5A2C", true],
  taruma: ["#FFC93C", false],
  duyut: ["#14B8B0", false]
};
const confetti = document.getElementById("confetti");
const cctx = confetti.getContext("2d");

let rotation = 0;
let spinning = false;
let spinRaf = 0;
let spinToken = 0;
let suppressSpinOnClose = false;
let colorOf = {};
let lastHit = null;
let board = [];
let audioCtx;
let adminStore = "paskal";
const switchStoreBtn = document.getElementById("switchStore");

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
  document.getElementById("navLink").href = admin ? location.pathname + location.search : "#admin";

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
  document.getElementById("storeButtons").innerHTML = Object.entries(STORES).map(([id, store]) => {
    const [accent, light] = STORE_ACCENT[id] || ["#F4EEE3", false];
    return `
    <button type="button" class="store-card${light ? " light" : ""}" style="--accent:${accent}" data-store="${id}">
      <span class="tag">C Store</span>
      <span class="meta">
        <strong>${store.name}</strong>
        ${sumStock(id)} hadiah · ${slicesFor(id).length} jenis
        <span class="go">Mulai putar <span aria-hidden="true">→</span></span>
      </span>
    </button>`;
  }).join("");
}

function renderFloor(storeId) {
  const store = STORES[storeId];
  board = slicesFor(storeId);
  colorOf = {};
  board.forEach((p, i) => { colorOf[p.id] = PALETTE[i % PALETTE.length]; });
  if (board.length > 1 && board.length % PALETTE.length === 1) {
    colorOf[board[board.length - 1].id] = PALETTE[2];
  }
  document.getElementById("storeTitle").textContent = store.name;
  document.getElementById("statLeft").textContent = sumStock(storeId);
  document.getElementById("statKinds").textContent = board.length;
  switchStoreBtn.hidden = !!state.lock;
  switchStoreBtn.disabled = spinning;
  switchStoreBtn.setAttribute("aria-busy", spinning ? "true" : "false");
  document.getElementById("emptyMsg").hidden = board.length > 0;
  spinBtn.disabled = board.length === 0 || spinning;
  if (!spinning && rotation === 0 && board.length) {
    const arc = TAU / board.length;
    rotation = (TAU - 0.5 * arc) % TAU;
  }
  document.getElementById("prizeList").innerHTML = store.prizes.map((p) => {
    const left = qty(storeId, p.id);
    const swatch = left ? colorOf[p.id][0] : "#2F3850";
    const cls = [left ? "" : "gone", lastHit === p.id ? "hit" : ""].join(" ").trim();
    return `<li class="${cls}">
      <span class="swatch" style="background:${swatch}"></span>
      <span class="name">${p.name}</span>
      <span class="qty">${left}</span>
    </li>`;
  }).join("");
  const log = state.history[storeId] || [];
  document.getElementById("history").innerHTML = log.length
    ? log.slice(0, 6).map((h) => `<li>${h.name}</li>`).join("")
    : `<li class="none">Belum ada pemenang.</li>`;
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
  const outer = size / 2 - 4;
  const rimW = size * 0.055;
  const R = outer - rimW;
  const n = board.length;
  const now = performance.now() / 1000;

  const rim = ctx.createLinearGradient(0, 0, size, size);
  rim.addColorStop(0, "#3a4462");
  rim.addColorStop(0.5, "#151a28");
  rim.addColorStop(1, "#2a3249");
  ctx.beginPath();
  ctx.arc(cx, cy, outer, 0, TAU);
  ctx.fillStyle = rim;
  ctx.fill();

  const bulbs = 30;
  for (let i = 0; i < bulbs; i++) {
    const a = -Math.PI / 2 + (i / bulbs) * TAU;
    const on = Math.floor(now * (spinning ? 12 : 2.5) + i) % 2 === 0;
    const bx = cx + Math.cos(a) * (R + rimW / 2);
    const by = cy + Math.sin(a) * (R + rimW / 2);
    const br = rimW * 0.2;
    if (on) {
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, br * 3);
      g.addColorStop(0, "rgba(255, 214, 102, 0.55)");
      g.addColorStop(1, "rgba(255, 214, 102, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(bx, by, br * 3, 0, TAU);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, TAU);
    ctx.fillStyle = on ? "#FFF1C2" : "#4A5372";
    ctx.fill();
  }

  if (!n) {
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.fillStyle = "#1B2030";
    ctx.fill();
    return;
  }

  const arc = TAU / n;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  board.forEach((p, i) => {
    const [fill, ink] = colorOf[p.id] || PALETTE[i % PALETTE.length];
    const a0 = -Math.PI / 2 + i * arc;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, R, a0, a0 + arc);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.save();
    ctx.rotate(a0 + arc / 2);
    ctx.fillStyle = ink;
    const fs = Math.max(10, Math.round(size * (n > 12 ? 0.03 : 0.036)));
    ctx.font = `800 ${fs}px "Bricolage Grotesque", "Segoe UI", sans-serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const maxW = R * 0.62;
    let label = p.short;
    while (ctx.measureText(label).width > maxW && label.length > 3) label = label.slice(0, -1);
    ctx.fillText(label, R * 0.9, 0);
    ctx.restore();
  });

  board.forEach((_, i) => {
    const a0 = -Math.PI / 2 + i * arc;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a0) * R, Math.sin(a0) * R);
    ctx.lineWidth = Math.max(2, size * 0.004);
    ctx.strokeStyle = "rgba(13, 16, 23, 0.55)";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(Math.cos(a0) * (R - size * 0.012), Math.sin(a0) * (R - size * 0.012), size * 0.008, 0, TAU);
    ctx.fillStyle = "#0D1017";
    ctx.fill();
  });
  ctx.restore();

  const gloss = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.4, R * 0.05, cx, cy, R);
  gloss.addColorStop(0, "rgba(255, 255, 255, 0.28)");
  gloss.addColorStop(0.4, "rgba(255, 255, 255, 0.04)");
  gloss.addColorStop(1, "rgba(0, 0, 0, 0.22)");
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.fillStyle = gloss;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.lineWidth = Math.max(3, size * 0.008);
  ctx.strokeStyle = "#0D1017";
  ctx.stroke();
}

function resizeConfetti() {
  const dpr = window.devicePixelRatio || 1;
  confetti.width = innerWidth * dpr;
  confetti.height = innerHeight * dpr;
  cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function burst(color) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  resizeConfetti();
  const colors = [color, "#FFC93C", "#F4EEE3", "#14B8B0", "#FF5A2C"];
  const bits = Array.from({ length: 160 }, (_, k) => {
    const fromLeft = k % 2 === 0;
    return {
      x: fromLeft ? -10 : innerWidth + 10,
      y: innerHeight * (0.55 + Math.random() * 0.3),
      vx: (fromLeft ? 1 : -1) * (6 + Math.random() * 10),
      vy: -(10 + Math.random() * 12),
      w: 6 + Math.random() * 7,
      h: 9 + Math.random() * 9,
      r: Math.random() * TAU,
      vr: (Math.random() - 0.5) * 0.4,
      color: colors[k % colors.length],
      life: 1
    };
  });
  let frame = 0;
  (function step() {
    cctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const b of bits) {
      b.x += b.vx;
      b.y += b.vy;
      b.vx *= 0.985;
      b.vy += 0.38;
      b.r += b.vr;
      if (frame > 70) b.life -= 0.02;
      cctx.save();
      cctx.globalAlpha = Math.max(0, b.life);
      cctx.translate(b.x, b.y);
      cctx.rotate(b.r);
      cctx.fillStyle = b.color;
      cctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h * Math.abs(Math.cos(b.r * 2)));
      cctx.restore();
    }
    if (frame++ < 130) requestAnimationFrame(step);
    else cctx.clearRect(0, 0, innerWidth, innerHeight);
  })();
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

function stopSpinAnimation() {
  spinToken += 1;
  if (spinRaf) cancelAnimationFrame(spinRaf);
  spinRaf = 0;
  spinning = false;
}

function closeResultDialog(suppressRespin) {
  if (!resultDlg.open) return;
  if (suppressRespin) suppressSpinOnClose = true;
  resultDlg.close();
}

function spin() {
  const storeId = activeStoreId();
  if (!storeId || spinning) return;
  board = slicesFor(storeId);
  if (!board.length) return;
  const token = ++spinToken;
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
    if (token !== spinToken) return;
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
    if (t < 1) {
      spinRaf = requestAnimationFrame(step);
    } else if (token === spinToken) {
      finish(storeId, idx, token);
    }
  })(start);
}

function finish(storeId, idx, token) {
  if (token !== spinToken) return;
  spinning = false;
  spinRaf = 0;
  const prize = board[idx];
  if (!prize) return;
  const [band] = colorOf[prize.id] || PALETTE[0];
  lastHit = prize.id;
  state.stock[storeId][prize.id] = Math.max(0, qty(storeId, prize.id) - 1);
  const when = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  state.history[storeId] = [{ name: prize.name, when }, ...(state.history[storeId] || [])].slice(0, 30);
  persist();
  render();
  document.getElementById("resultStore").textContent = STORES[storeId].name;
  document.getElementById("resultName").textContent = prize.name;
  const left = qty(storeId, prize.id);
  document.getElementById("resultStock").textContent = left
    ? `Sisa ${left} di ${STORES[storeId].name}.`
    : `Ini yang terakhir di ${STORES[storeId].name}.`;
  document.getElementById("resultBand").style.setProperty("--band", band);
  burst(band);
  resultDlg.showModal();
}

function applyHash() {
  const hash = location.hash.slice(1);
  if (hash === "admin") return;
  if (STORES[hash] && (!state.lock || state.lock === hash)) {
    state.choice = hash;
  } else if (!state.lock) {
    state.choice = null;
  }
}

function clearStoreHash() {
  const base = location.pathname + location.search;
  if (location.hash && location.hash !== "#admin") {
    history.replaceState(null, "", base);
  }
}

function goToPicker() {
  if (state.lock) return;
  stopSpinAnimation();
  closeResultDialog(true);
  state.choice = null;
  rotation = 0;
  lastHit = null;
  board = [];
  persist();
  clearStoreHash();
  render();
}

function goToStore(storeId) {
  if (!STORES[storeId]) return;
  if (state.lock && state.lock !== storeId) return;
  stopSpinAnimation();
  closeResultDialog(true);
  rotation = 0;
  lastHit = null;
  state.choice = storeId;
  persist();
  const target = `#${storeId}`;
  if (location.hash !== target) location.hash = storeId;
  else render();
}

document.getElementById("storeButtons").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-store]");
  if (!btn || state.lock) return;
  goToStore(btn.dataset.store);
});

document.getElementById("switchStore").addEventListener("click", () => {
  goToPicker();
});

document.querySelector(".brand").addEventListener("click", (e) => {
  if (location.hash === "#admin") return;
  e.preventDefault();
  goToPicker();
});

spinBtn.addEventListener("click", spin);
window.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !resultDlg.open && location.hash !== "#admin" && activeStoreId()) {
    e.preventDefault();
    spin();
  }
});
resultDlg.addEventListener("close", () => {
  if (suppressSpinOnClose) {
    suppressSpinOnClose = false;
    return;
  }
  if (resultDlg.returnValue === "again" && activeStoreId() && !state.lock) spin();
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
  if (state.lock) goToStore(state.lock);
  else {
    persist();
    render();
  }
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

window.addEventListener("resize", resizeConfetti);
document.getElementById("navLink").addEventListener("click", (e) => {
  if (location.hash === "#admin") {
    e.preventDefault();
    goToPicker();
  }
});

window.addEventListener("hashchange", () => {
  applyHash();
  persist();
  render();
});
applyHash();
render();
document.fonts.ready.then(loop);
