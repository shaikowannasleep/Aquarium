'use strict';
/* Interactive aquarium: same engine as the SVG bake, but stepped live.
 * FISH_DATA is injected by tools/build-pages.js. */
(function () {

const TAU = Math.PI * 2;
const cv = document.getElementById('cv');
const g = cv.getContext('2d');
const tip = document.getElementById('tip');
const ordEl = document.getElementById('ord');
const fpsEl = document.getElementById('fps');

let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
function resize() {
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (sw) sw.resize(W, H);
}

const sw = new SwarmEngine(Math.max(FISH_DATA.length, 8), 800, 600);
resize();
window.addEventListener('resize', resize);

FISH_DATA.forEach(f => {
  sw.spawn(40 + Math.random() * (W - 80), 60 + Math.random() * (H - 160));
  sw.speedScale[sw.n - 1] = f.pace;
});

const p = sw.p;
p.rCoh = 84; p.rAli = 64; p.rSep = 30;
p.wCoh = 0.7; p.wAli = 1.2; p.wSep = 2.2;
p.minSpeed = 18; p.maxSpeed = 62; p.maxForce = 140;
p.margin = 56; p.maxNeighbours = 6; p.rLure = 240;

const world = {
  predators: [], obstacles: [],
  lure: { x: W / 2, y: H / 2, power: 0, active: false },
};

let mx = W / 2, my = H / 2, hovering = false;
cv.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY; hovering = true;
});
cv.addEventListener('mouseleave', () => { hovering = false; });
cv.addEventListener('touchmove', e => {
  e.preventDefault();
  mx = e.touches[0].clientX; my = e.touches[0].clientY; hovering = true;
}, { passive: false });

/* marine snow: drift only, independent of the flock */
const snow = [];
for (let i = 0; i < 90; i++) {
  snow.push({
    x: Math.random() * 2000, y: Math.random() * 1200,
    v: 8 + Math.random() * 16, r: 0.6 + Math.random() * 1.5,
    a: 0.15 + Math.random() * 0.3, drift: (Math.random() - 0.5) * 6,
  });
}

function localOrder() {
  let tot = 0, cnt = 0;
  const r2 = sw.p.rAli * sw.p.rAli;
  for (let i = 0; i < sw.n; i++) {
    const si = Math.hypot(sw.vx[i], sw.vy[i]) || 1;
    for (let j = i + 1; j < sw.n; j++) {
      const dx = sw.px[j] - sw.px[i], dy = sw.py[j] - sw.py[i];
      if (dx * dx + dy * dy > r2) continue;
      const sj = Math.hypot(sw.vx[j], sw.vy[j]) || 1;
      tot += (sw.vx[i] * sw.vx[j] + sw.vy[i] * sw.vy[j]) / (si * sj);
      cnt++;
    }
  }
  return cnt ? tot / cnt : 0;
}

let last = performance.now(), acc = 0, fps = 60, fa = 0, fn = 0, t = 0, ordT = 0;

function frame(now) {
  const raw = (now - last) / 1000; last = now;
  const dt = Math.min(raw, 0.05); t += dt;
  fa += raw; fn++;
  if (fa > 0.5) { fps = fn / fa; fa = 0; fn = 0; fpsEl.textContent = fps.toFixed(0); }

  const L = world.lure;
  L.x += (mx - L.x) * 0.15; L.y += (my - L.y) * 0.15;
  L.power += ((hovering ? 0.85 : 0) - L.power) * 0.08;
  L.active = L.power > 0.03;

  acc += dt;
  let guard = 0;
  while (acc >= 1 / 60 && guard++ < 5) {
    sw.step(1 / 60, world);
    acc -= 1 / 60;
  }

  ordT += dt;
  if (ordT > 0.25) { ordEl.textContent = localOrder().toFixed(2); ordT = 0; }

  /* ---- draw ---- */
  const bg = g.createRadialGradient(W * 0.5, H * 0.38, 20, W * 0.5, H * 0.5, Math.max(W, H) * 0.8);
  bg.addColorStop(0, '#0d2b52'); bg.addColorStop(0.55, '#061630'); bg.addColorStop(1, '#020712');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);

  g.globalAlpha = 0.04; g.fillStyle = '#69c7ff';
  for (let i = 0; i < 6; i++) {
    const x = ((i * 0.19 + t * 0.01) % 1.2 - 0.1) * W;
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 60, 0);
    g.lineTo(x + 170, H); g.lineTo(x + 30, H); g.closePath(); g.fill();
  }
  g.globalAlpha = 1;

  for (const s of snow) {
    s.y += s.v * dt; s.x += s.drift * dt;
    if (s.y > H + 10) { s.y = -10; s.x = Math.random() * W; }
    if (s.x > W + 10) s.x = -10; if (s.x < -10) s.x = W + 10;
    g.fillStyle = 'rgba(207,234,255,' + s.a + ')';
    g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.fill();
  }

  if (world.lure.active) {
    const R = 200 * world.lure.power;
    const gr = g.createRadialGradient(world.lure.x, world.lure.y, 2, world.lure.x, world.lure.y, R);
    gr.addColorStop(0, 'rgba(180,240,255,' + (0.16 * world.lure.power).toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(80,190,255,0)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(world.lure.x, world.lure.y, R, 0, TAU); g.fill();
  }

  let hoverIdx = -1, hoverD = 1e9;
  for (let i = 0; i < sw.n; i++) {
    const f = FISH_DATA[i]; if (!f) continue;
    const x = sw.px[i], y = sw.py[i];
    const vx = sw.vx[i], vy = sw.vy[i];
    const sp = Math.hypot(vx, vy) || 1;
    const dx = vx / sp, dy = vy / sp;
    const nx = -dy, ny = dx;
    const b = f.size, tl = b * 0.75;
    const op = f.dormant ? 0.74 : 0.95;

    if (hovering) {
      const d = Math.hypot(x - mx, y - my);
      if (d < b + 12 && d < hoverD) { hoverD = d; hoverIdx = i; }
    }

    g.globalAlpha = op;
    g.shadowBlur = f.dormant ? 14 : 9; g.shadowColor = f.color;
    g.fillStyle = f.color;
    g.beginPath();
    g.ellipse(x, y, b, b * 0.52, Math.atan2(dy, dx), 0, TAU);
    g.fill();
    const wig = Math.sin(sw.phase[i]) * tl * 0.34;
    g.beginPath();
    g.moveTo(x - dx * b, y - dy * b);
    g.lineTo(x - dx * (b + tl) + nx * (tl * 0.6 + wig), y - dy * (b + tl) + ny * (tl * 0.6 + wig));
    g.lineTo(x - dx * (b + tl) - nx * (tl * 0.6 - wig), y - dy * (b + tl) - ny * (tl * 0.6 - wig));
    g.closePath(); g.fill();
    g.shadowBlur = 0;
    g.fillStyle = '#04121f';
    g.beginPath();
    g.arc(x + dx * b * 0.45 + nx * b * 0.16, y + dy * b * 0.45 + ny * b * 0.16,
          Math.max(1.1, b * 0.13), 0, TAU);
    g.fill();
    g.globalAlpha = 1;
  }

  if (hoverIdx >= 0) {
    const f = FISH_DATA[hoverIdx];
    tip.textContent = f.name + '  ·  ' + f.lang + '  ·  ' + f.stars + '\u2605' +
      (f.dormant ? '  ·  resting ' + f.ageDays + 'd' : '');
    tip.style.left = Math.min(mx + 16, W - 230) + 'px';
    tip.style.top = (my + 16) + 'px';
    tip.classList.add('on');
  } else tip.classList.remove('on');

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

})();
