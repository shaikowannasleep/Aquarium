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
p.margin = 56; p.maxNeighbours = 6;

const world = {
  predators: [], obstacles: [], ripples: [],
};

let mx = W / 2, my = H / 2, hovering = false, rippleClock = 0;
const RIPPLE_COUNT = 12;
for (let i = 0; i < RIPPLE_COUNT; i++) {
  world.ripples.push({ x: 0, y: 0, radius: 0, speed: 150, strength: 0,
    age: 0, lifetime: 1.1, band: 30, active: false });
}

function addRipple(x, y, strength) {
  let ripple = null;
  for (let i = 0; i < RIPPLE_COUNT; i++) {
    if (!world.ripples[i].active) { ripple = world.ripples[i]; break; }
  }
  if (!ripple) ripple = world.ripples[0];
  ripple.x = x; ripple.y = y; ripple.radius = 8; ripple.speed = 150;
  ripple.strength = strength; ripple.age = 0; ripple.lifetime = 1.1; ripple.active = true;
}

function movePointer(x, y) {
  const distance = Math.hypot(x - mx, y - my);
  mx = x; my = y; hovering = true;
  if (distance > 16 || rippleClock > 0.18) { addRipple(x, y, Math.min(1, 0.48 + distance / 180)); rippleClock = 0; }
}

cv.addEventListener('pointermove', e => movePointer(e.clientX, e.clientY));
cv.addEventListener('pointerdown', e => { movePointer(e.clientX, e.clientY); addRipple(e.clientX, e.clientY, 1); });
cv.addEventListener('pointerleave', () => { hovering = false; });
cv.addEventListener('pointercancel', () => { hovering = false; });
cv.addEventListener('touchmove', e => {
  e.preventDefault();
  movePointer(e.touches[0].clientX, e.touches[0].clientY);
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

/* enhanced bubbles — more count, varied sizes, with glow */
const bubbles = [];
for (let i = 0; i < 40; i++) {
  bubbles.push({
    x: Math.random() * 2000, y: Math.random() * 1200,
    v: 10 + Math.random() * 30, r: 1.2 + Math.random() * 5.5,
    drift: (Math.random() - 0.5) * 18, a: 0.12 + Math.random() * 0.32,
    wobblePhase: Math.random() * TAU,
    wobbleAmp: 0.4 + Math.random() * 1.2,
    wobbleFreq: 1.5 + Math.random() * 2.5,
  });
}

/* seaweed config — lush multi-segment kelp */
const seaweeds = [];
for (let i = 0; i < 18; i++) {
  const baseX = 16 + i * ((typeof W !== 'undefined' ? Math.max(W, 800) : 800) - 32) / 17;
  seaweeds.push({
    x: baseX,
    segments: 5 + Math.floor(Math.random() * 4),
    segLen: 14 + Math.random() * 12,
    width: 4 + Math.random() * 6,
    phase: Math.random() * TAU,
    speed: 0.7 + Math.random() * 0.6,
    hue: 100 + Math.random() * 50,  // green to teal
    sat: 55 + Math.random() * 30,
    lit: 18 + Math.random() * 16,
    leafFreq: 0.3 + Math.random() * 0.4,
  });
}

/* god-ray config */
const godRays = [];
for (let i = 0; i < 8; i++) {
  godRays.push({
    xNorm: 0.06 + i * 0.12 + (Math.random() - 0.5) * 0.06,
    topW: 30 + Math.random() * 50,
    bottomW: 80 + Math.random() * 160,
    alpha: 0.015 + Math.random() * 0.03,
    speed: 0.003 + Math.random() * 0.006,
    phase: Math.random() * TAU,
    alphaPhase: Math.random() * TAU,
    alphaSpeed: 0.15 + Math.random() * 0.25,
  });
}

/* caustic pattern config */
const caustics = [];
for (let i = 0; i < 14; i++) {
  caustics.push({
    xNorm: Math.random(),
    yNorm: 0.82 + Math.random() * 0.18,
    size: 20 + Math.random() * 50,
    phase: Math.random() * TAU,
    speed: 0.3 + Math.random() * 0.5,
    alpha: 0.02 + Math.random() * 0.04,
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
  rippleClock += dt;
  fa += raw; fn++;
  if (fa > 0.5) { fps = fn / fa; fa = 0; fn = 0; fpsEl.textContent = fps.toFixed(0); }

  for (let i = 0; i < RIPPLE_COUNT; i++) {
    const ripple = world.ripples[i];
    if (!ripple.active) continue;
    ripple.age += dt;
    ripple.radius += ripple.speed * dt;
    ripple.strength = Math.max(0, 1 - ripple.age / ripple.lifetime);
    if (ripple.age >= ripple.lifetime) ripple.active = false;
  }

  acc += dt;
  let guard = 0;
  while (acc >= 1 / 60 && guard++ < 5) {
    sw.step(1 / 60, world);
    acc -= 1 / 60;
  }

  ordT += dt;
  if (ordT > 0.25) { ordEl.textContent = localOrder().toFixed(2); ordT = 0; }

  /* ---- draw ---- */

  /* 1. Deep ocean background gradient */
  const bg = g.createRadialGradient(W * 0.5, H * 0.12, 20, W * 0.5, H * 0.6, Math.max(W, H) * 0.85);
  bg.addColorStop(0, '#1a8aaa');
  bg.addColorStop(0.18, '#0e5f82');
  bg.addColorStop(0.45, '#08375a');
  bg.addColorStop(0.75, '#041e3a');
  bg.addColorStop(1, '#020c1e');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);

  /* 2. God rays — volumetric light shafts from above */
  g.save();
  for (let i = 0; i < godRays.length; i++) {
    const ray = godRays[i];
    const x = (ray.xNorm + Math.sin(t * ray.speed + ray.phase) * 0.04) * W;
    const alphaOsc = ray.alpha * (0.6 + 0.4 * Math.sin(t * ray.alphaSpeed + ray.alphaPhase));
    const grd = g.createLinearGradient(x, 0, x + (ray.bottomW - ray.topW) * 0.3, H);
    grd.addColorStop(0, 'rgba(180,235,255,' + (alphaOsc * 2.2) + ')');
    grd.addColorStop(0.15, 'rgba(120,210,240,' + (alphaOsc * 1.5) + ')');
    grd.addColorStop(0.5, 'rgba(70,170,220,' + (alphaOsc * 0.8) + ')');
    grd.addColorStop(1, 'rgba(30,100,160,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(x - ray.topW / 2, 0);
    g.lineTo(x + ray.topW / 2, 0);
    g.lineTo(x + ray.bottomW / 2, H);
    g.lineTo(x - ray.bottomW / 2, H);
    g.closePath();
    g.fill();
  }
  g.restore();

  /* 3. Bright water surface */
  const surfH = 70;
  const surface = g.createLinearGradient(0, 0, 0, surfH);
  surface.addColorStop(0, 'rgba(200,248,255,.55)');
  surface.addColorStop(0.3, 'rgba(130,225,245,.32)');
  surface.addColorStop(0.7, 'rgba(60,180,215,.12)');
  surface.addColorStop(1, 'rgba(30,120,170,0)');
  g.fillStyle = surface; g.fillRect(0, 0, W, surfH);

  /* Surface ripple wave lines */
  g.save();
  for (let wave = 0; wave < 3; wave++) {
    g.strokeStyle = 'rgba(213,251,255,' + (0.38 - wave * 0.1) + ')';
    g.lineWidth = 2.5 - wave * 0.6;
    g.beginPath();
    const yBase = 14 + wave * 12;
    const freq = 0.035 + wave * 0.008;
    const amp = 5 + wave * 2;
    const spd = 0.8 + wave * 0.3;
    for (let x = 0; x <= W + 70; x += 4) {
      const y = yBase + Math.sin(t * spd + x * freq) * amp
                      + Math.sin(t * 0.6 + x * 0.018 + wave) * (amp * 0.5);
      if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }
  /* Bright shimmer highlights on surface */
  for (let i = 0; i < 20; i++) {
    const sx = ((i * 0.053 + t * 0.008 + Math.sin(i * 3.7) * 0.02) % 1.1) * W;
    const sy = 6 + Math.sin(t * 1.2 + i * 2.3) * 4;
    const shimAlpha = 0.12 + 0.1 * Math.sin(t * 2.5 + i * 1.9);
    g.fillStyle = 'rgba(255,255,255,' + Math.max(0, shimAlpha) + ')';
    g.beginPath();
    g.ellipse(sx, sy, 8 + Math.sin(i) * 4, 1.5, 0, 0, TAU);
    g.fill();
  }
  g.restore();

  /* 4. Caustic light patterns on the sandy floor */
  g.save();
  for (let i = 0; i < caustics.length; i++) {
    const c = caustics[i];
    const cx = (c.xNorm + Math.sin(t * c.speed * 0.3 + c.phase) * 0.03) * W;
    const cy = c.yNorm * H;
    const sz = c.size * (0.8 + 0.2 * Math.sin(t * c.speed + c.phase));
    const ca = c.alpha * (0.5 + 0.5 * Math.sin(t * c.speed * 0.7 + c.phase));
    const cGrd = g.createRadialGradient(cx, cy, 0, cx, cy, sz);
    cGrd.addColorStop(0, 'rgba(180,240,255,' + ca + ')');
    cGrd.addColorStop(0.6, 'rgba(100,200,230,' + (ca * 0.4) + ')');
    cGrd.addColorStop(1, 'rgba(50,150,200,0)');
    g.fillStyle = cGrd;
    g.fillRect(cx - sz, cy - sz, sz * 2, sz * 2);
  }
  g.restore();

  /* 5. Sandy floor gradient */
  const floorH = H * 0.12;
  const floor = g.createLinearGradient(0, H - floorH, 0, H);
  floor.addColorStop(0, 'rgba(20,60,80,0)');
  floor.addColorStop(0.3, 'rgba(18,50,65,.15)');
  floor.addColorStop(1, 'rgba(12,35,50,.3)');
  g.fillStyle = floor; g.fillRect(0, H - floorH, W, floorH);

  /* 6. Seaweed — lush swaying kelp */
  g.save();
  for (let si = 0; si < seaweeds.length; si++) {
    const sw2 = seaweeds[si];
    const baseX = 16 + si * (W - 32) / (seaweeds.length - 1);
    const baseY = H;
    g.lineWidth = sw2.width;
    g.lineCap = 'round';
    g.lineJoin = 'round';

    /* draw main stem */
    const pts = [{ x: baseX, y: baseY }];
    for (let s = 1; s <= sw2.segments; s++) {
      const frac = s / sw2.segments;
      const sway = Math.sin(t * sw2.speed + sw2.phase + s * 0.8) * (9 + s * 3)
                  + Math.sin(t * sw2.speed * 0.6 + s * 1.3) * (4 + s * 1.5);
      pts.push({
        x: baseX + sway,
        y: baseY - s * sw2.segLen,
      });
    }

    /* stem stroke gradient */
    const stemGrd = g.createLinearGradient(baseX, baseY, baseX, baseY - sw2.segments * sw2.segLen);
    stemGrd.addColorStop(0, 'hsl(' + sw2.hue + ',' + sw2.sat + '%,' + (sw2.lit + 5) + '%)');
    stemGrd.addColorStop(0.5, 'hsl(' + sw2.hue + ',' + (sw2.sat + 10) + '%,' + (sw2.lit + 10) + '%)');
    stemGrd.addColorStop(1, 'hsl(' + (sw2.hue + 15) + ',' + (sw2.sat + 15) + '%,' + (sw2.lit + 20) + '%)');
    g.strokeStyle = stemGrd;

    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let s = 1; s < pts.length; s++) {
      const prev = pts[s - 1], cur = pts[s];
      const cpx = (prev.x + cur.x) / 2;
      const cpy = (prev.y + cur.y) / 2;
      g.quadraticCurveTo(prev.x, prev.y, cpx, cpy);
    }
    const lastPt = pts[pts.length - 1];
    g.lineTo(lastPt.x, lastPt.y);
    g.stroke();

    /* draw leaf-like shapes along stem */
    for (let s = 2; s < pts.length; s++) {
      if (Math.sin(s * 7.1 + si * 3.3) < sw2.leafFreq) continue;
      const pt = pts[s];
      const side = (s % 2 === 0) ? 1 : -1;
      const leafLen = (sw2.width * 1.8 + Math.sin(t * sw2.speed * 0.8 + s) * 3) * (1 - (s / pts.length) * 0.3);
      const leafSway = Math.sin(t * sw2.speed * 1.2 + s * 1.5 + sw2.phase) * 4;

      g.fillStyle = 'hsla(' + (sw2.hue + 10) + ',' + (sw2.sat + 20) + '%,' + (sw2.lit + 15) + '%,0.7)';
      g.beginPath();
      g.moveTo(pt.x, pt.y);
      g.quadraticCurveTo(
        pt.x + side * leafLen * 0.6 + leafSway, pt.y - sw2.segLen * 0.3,
        pt.x + side * leafLen + leafSway, pt.y - sw2.segLen * 0.15
      );
      g.quadraticCurveTo(
        pt.x + side * leafLen * 0.5 + leafSway, pt.y + sw2.segLen * 0.15,
        pt.x, pt.y + 3
      );
      g.closePath();
      g.fill();
    }
  }
  g.restore();

  /* 7. Marine snow (falling particles) */
  for (const s of snow) {
    s.y += s.v * dt; s.x += s.drift * dt;
    if (s.y > H + 10) { s.y = -10; s.x = Math.random() * W; }
    if (s.x > W + 10) s.x = -10; if (s.x < -10) s.x = W + 10;
    g.fillStyle = 'rgba(207,234,255,' + s.a + ')';
    g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.fill();
  }

  /* 8. Bubbles — enhanced with gradient fill and highlight */
  g.lineWidth = 1;
  for (const bubble of bubbles) {
    bubble.wobblePhase += dt * bubble.wobbleFreq;
    bubble.y -= bubble.v * dt;
    bubble.x += bubble.drift * dt + Math.sin(bubble.wobblePhase) * bubble.wobbleAmp;
    if (bubble.y < -bubble.r - 4) { bubble.y = H + bubble.r + 4; bubble.x = Math.random() * W; }
    if (bubble.x > W + 12) bubble.x = -12; if (bubble.x < -12) bubble.x = W + 12;

    const br = bubble.r;

    /* bubble body: transparent with edge highlight */
    g.globalAlpha = bubble.a * 0.6;
    const bGrd = g.createRadialGradient(
      bubble.x - br * 0.25, bubble.y - br * 0.25, br * 0.1,
      bubble.x, bubble.y, br
    );
    bGrd.addColorStop(0, 'rgba(220,250,255,0.35)');
    bGrd.addColorStop(0.7, 'rgba(150,220,240,0.1)');
    bGrd.addColorStop(1, 'rgba(120,200,230,0.02)');
    g.fillStyle = bGrd;
    g.beginPath(); g.arc(bubble.x, bubble.y, br, 0, TAU); g.fill();

    /* bubble outline */
    g.globalAlpha = bubble.a * 0.8;
    g.strokeStyle = 'rgba(200,245,255,0.5)';
    g.beginPath(); g.arc(bubble.x, bubble.y, br, 0, TAU); g.stroke();

    /* highlight spot */
    g.globalAlpha = bubble.a * 0.9;
    g.fillStyle = 'rgba(255,255,255,0.6)';
    g.beginPath();
    g.arc(bubble.x - br * 0.3, bubble.y - br * 0.3, br * 0.18, 0, TAU);
    g.fill();
  }
  g.globalAlpha = 1;

  /* 9. Water ripples from pointer interaction */
  for (let i = 0; i < RIPPLE_COUNT; i++) {
    const ripple = world.ripples[i];
    if (!ripple.active) continue;
    g.globalAlpha = ripple.strength * 0.32;
    g.strokeStyle = '#a8eaff'; g.lineWidth = 1.2;
    g.beginPath(); g.arc(ripple.x, ripple.y, ripple.radius, 0, TAU); g.stroke();
  }
  g.globalAlpha = 1;

  /* 10. Fish rendering */
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

  /* 11. Vignette overlay for depth */
  const vig = g.createRadialGradient(W * 0.5, H * 0.4, Math.min(W, H) * 0.25, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(0.7, 'rgba(2,8,20,0.08)');
  vig.addColorStop(1, 'rgba(2,6,16,0.25)');
  g.fillStyle = vig; g.fillRect(0, 0, W, H);

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
