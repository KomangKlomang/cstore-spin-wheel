const STORE = "cstore-spin-dummy-v1";
const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");
const spinBtn = document.getElementById("spinBtn");
const pointer = document.getElementById("pointer");
const listEl = document.getElementById("prizeList");
const historyEl = document.getElementById("history");
const resultDlg = document.getElementById("result");
const confetti = document.getElementById("confetti");
const cctx = confetti.getContext("2d");

const saved = JSON.parse(localStorage.getItem(STORE) || "{}");
const stock = Object.fromEntries(PRIZES.map((p) => [p.id, saved.stock?.[p.id] ?? p.stock]));
let history = saved.history || [];

let rotation = 0;
let spinning = false;
let lastIdx = -1;
let audioCtx;

function persist() {
  localStorage.setItem(STORE, JSON.stringify({ stock, history }));
}

function renderList() {
  listEl.innerHTML = PRIZES.map((p) => `
    <li>
      <i class="swatch" style="background:${p.color}"></i>
      <div><strong>${p.name}</strong><span>sisa ${stock[p.id]}</span></div>
    </li>`).join("");
  historyEl.innerHTML = history.length
    ? history.slice(0, 6).map((h) => `<li><em>${h.name}</em></li>`).join("")
    : "<li>Belum ada spin.</li>";
}

function resizeConfetti() {
  const dpr = window.devicePixelRatio || 1;
  confetti.width = innerWidth * dpr;
  confetti.height = innerHeight * dpr;
  cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function draw(rot) {
  const dpr = window.devicePixelRatio || 1;
  const size = canvas.clientWidth;
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 26;
  const n = PRIZES.length;
  const arc = (Math.PI * 2) / n;
  const now = performance.now() / 1000;

  for (let i = 0; i < 28; i++) {
    const a = -Math.PI / 2 + (i / 28) * Math.PI * 2;
    const on = Math.floor(now * (spinning ? 14 : 3) + i) % 2 === 0;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * (R + 14), cy + Math.sin(a) * (R + 14), size * 0.012, 0, Math.PI * 2);
    ctx.fillStyle = on ? (i % 2 ? "#FFC93C" : "#FF5A2C") : "#2A3142";
    ctx.fill();
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  PRIZES.forEach((p, i) => {
    const a0 = -Math.PI / 2 + i * arc;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, R, a0, a0 + arc);
    ctx.closePath();
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.lineWidth = Math.max(2, size * 0.006);
    ctx.strokeStyle = "#10131A";
    ctx.stroke();

    ctx.save();
    ctx.rotate(a0 + arc / 2);
    ctx.translate(R * 0.66, 0);
    ctx.rotate(-(rot + a0 + arc / 2));
    ctx.fillStyle = p.ink;
    ctx.font = `800 ${Math.round(size * 0.032)}px "Bricolage Grotesque", "Segoe UI", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lines = p.wheel.split("\n");
    const lh = size * 0.038;
    lines.forEach((ln, li) => {
      ctx.fillText(ln, 0, (li - (lines.length - 1) / 2) * lh);
    });
    ctx.restore();

    ctx.save();
    ctx.rotate(a0);
    ctx.beginPath();
    ctx.arc(R - 2, 0, size * 0.014, 0, Math.PI * 2);
    ctx.fillStyle = "#10131A";
    ctx.fill();
    ctx.restore();
  });

  ctx.beginPath();
  ctx.arc(0, 0, R * 0.18, 0, Math.PI * 2);
  ctx.fillStyle = "#10131A";
  ctx.fill();
  ctx.restore();

  const gloss = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.35, R * 0.1, cx, cy, R);
  gloss.addColorStop(0, "rgba(255,255,255,.22)");
  gloss.addColorStop(0.45, "rgba(255,255,255,0)");
  gloss.addColorStop(1, "rgba(0,0,0,.18)");
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = gloss;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, R + 2, 0, Math.PI * 2);
  ctx.lineWidth = size * 0.02;
  ctx.strokeStyle = "#141824";
  ctx.stroke();
}

function indexAtPointer(rot) {
  const arc = (Math.PI * 2) / PRIZES.length;
  const rel = ((-rot % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  return Math.floor(rel / arc) % PRIZES.length;
}

function tickSound() {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.frequency.value = 880;
  g.gain.setValueAtTime(0.04, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.04);
  o.connect(g);
  g.connect(audioCtx.destination);
  o.start();
  o.stop(audioCtx.currentTime + 0.05);
}

function burst(color) {
  resizeConfetti();
  const bits = Array.from({ length: 90 }, () => ({
    x: innerWidth / 2,
    y: innerHeight * 0.42,
    vx: (Math.random() - 0.5) * 16,
    vy: -Math.random() * 14 - 4,
    g: 0.35,
    w: 6 + Math.random() * 6,
    h: 8 + Math.random() * 8,
    color: [color, "#FFC93C", "#F4EEE3", "#14B8B0", "#FF5A2C"][Math.floor(Math.random() * 5)],
    life: 70 + Math.random() * 20
  }));
  let frame = 0;
  (function step() {
    cctx.clearRect(0, 0, innerWidth, innerHeight);
    bits.forEach((b) => {
      b.x += b.vx;
      b.y += b.vy;
      b.vy += b.g;
      b.life -= 1;
      cctx.globalAlpha = Math.max(0, b.life / 80);
      cctx.fillStyle = b.color;
      cctx.fillRect(b.x, b.y, b.w, b.h);
    });
    cctx.globalAlpha = 1;
    if (frame++ < 110) requestAnimationFrame(step);
    else cctx.clearRect(0, 0, innerWidth, innerHeight);
  })();
}

function loop() {
  draw(rotation);
  if (!spinning) {
    const idx = indexAtPointer(rotation);
    if (idx !== lastIdx) {
      lastIdx = idx;
    }
  }
  requestAnimationFrame(loop);
}

function spin() {
  if (spinning) return;
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  audioCtx && audioCtx.resume();
  spinning = true;
  spinBtn.disabled = true;

  const idx = Math.floor(Math.random() * PRIZES.length);
  const arc = (Math.PI * 2) / PRIZES.length;
  const turns = 6 + Math.floor(Math.random() * 2);
  const current = ((rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const desired = ((Math.PI * 2 - (idx + 0.5) * arc) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
  let delta = desired - current;
  if (delta < 0) delta += Math.PI * 2;
  delta += turns * Math.PI * 2;

  const from = rotation;
  const start = performance.now();
  const dur = 5400;
  let crossed = indexAtPointer(rotation);

  (function step(now) {
    const t = Math.min(1, (now - start) / dur);
    const e = 1 - Math.pow(1 - t, 4);
    rotation = from + delta * e;
    const at = indexAtPointer(rotation);
    if (at !== crossed) {
      crossed = at;
      pointer.classList.remove("tick");
      void pointer.offsetWidth;
      pointer.classList.add("tick");
      tickSound();
    }
    if (t < 1) requestAnimationFrame(step);
    else finish(idx);
  })(start);
}

function finish(idx) {
  spinning = false;
  spinBtn.disabled = false;
  const prize = PRIZES[idx];
  stock[prize.id] = Math.max(0, stock[prize.id] - 1);
  history.unshift({ name: prize.name, at: Date.now() });
  history = history.slice(0, 12);
  persist();
  renderList();
  document.getElementById("resultName").textContent = prize.name;
  document.getElementById("resultStock").textContent =
    stock[prize.id] > 0
      ? `Sisa stok dummy: ${stock[prize.id]}`
      : "Stok dummy untuk hadiah ini habis.";
  burst(prize.color);
  resultDlg.showModal();
}

spinBtn.addEventListener("click", spin);
document.getElementById("reset").addEventListener("click", () => {
  PRIZES.forEach((p) => { stock[p.id] = p.stock; });
  history = [];
  persist();
  renderList();
});
resultDlg.addEventListener("close", () => {
  if (resultDlg.returnValue === "again") spin();
});
window.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !resultDlg.open) {
    e.preventDefault();
    spin();
  }
});
window.addEventListener("resize", resizeConfetti);

renderList();
resizeConfetti();
document.fonts.ready.then(loop);
