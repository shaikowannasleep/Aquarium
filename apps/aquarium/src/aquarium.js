'use strict';
/* Interactive aquarium: boids simulation stepped live with sprite rendering.
 * FISH_DATA is injected by tools/build-pages.js. */
(function () {

const TAU = Math.PI * 2;
const cv = document.getElementById('cv');
const g = cv.getContext('2d');
const tip = document.getElementById('tip');
const ordEl = document.getElementById('ord');
const fpsEl = document.getElementById('fps');
const waveCountdownEl = document.getElementById('waveCountdown');
const aquariumBackground = new Image();
aquariumBackground.onload = () => { aquariumBackground._loaded = true; };
if (typeof AQUARIUM_BACKGROUND !== 'undefined') aquariumBackground.src = AQUARIUM_BACKGROUND;

let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
function resize() {
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (sw) sw.resize(W, H);
}

/* =========================================================================
 * Sprite Sheet Setup (100 Sea Creatures: Sharks, Dolphins, Turtles, Fish, etc.)
 * ========================================================================= */
const SPRITE_DATA = {"blue_shark": [0, 5, 30, 105, 76], "spotted_shark": [0, 114, 44, 92, 60], "orca": [0, 208, 32, 100, 74], "blue_dolphin": [0, 310, 33, 98, 73], "pink_dolphin": [0, 410, 35, 100, 70], "blue_whale": [0, 511, 22, 103, 88], "beluga": [0, 616, 47, 103, 59], "stingray": [0, 721, 36, 96, 68], "spotted_ray": [0, 824, 34, 88, 73], "swordfish": [0, 916, 34, 106, 69], "clownfish": [0, 7, 127, 96, 70], "blue_tang": [0, 111, 128, 92, 65], "yellow_tang": [0, 213, 129, 91, 72], "purple_fish": [0, 313, 130, 92, 66], "flame_angelfish": [0, 417, 128, 93, 72], "moorish_idol": [0, 524, 126, 81, 77], "damselfish": [0, 621, 131, 92, 73], "butterflyfish": [0, 727, 129, 92, 75], "striped_angelfish": [0, 825, 124, 88, 83], "lionfish": [0, 918, 119, 99, 93], "green_turtle": [0, 4, 221, 101, 75], "brown_turtle": [0, 107, 224, 101, 69], "green_pufferfish": [0, 213, 215, 90, 84], "orange_pufferfish": [0, 315, 218, 87, 80], "blue_porcupinefish": [0, 417, 218, 89, 72], "orange_seahorse": [0, 531, 211, 66, 100], "pink_seahorse": [0, 629, 212, 62, 97], "red_octopus": [0, 711, 214, 108, 95], "pink_squid": [0, 832, 212, 82, 98], "moray_eel": [0, 918, 231, 101, 61], "red_lobster": [0, 6, 308, 100, 93], "red_crab": [0, 111, 320, 96, 79], "mantis_shrimp": [0, 212, 318, 97, 77], "blue_jellyfish": [0, 318, 305, 80, 101], "pink_jellyfish": [0, 413, 307, 83, 97], "sea_anemone": [0, 511, 317, 104, 87], "sea_urchin": [0, 623, 319, 88, 83], "orange_starfish": [0, 724, 318, 91, 84], "blue_starfish": [0, 825, 318, 88, 83], "sea_cucumber": [0, 920, 334, 96, 54], "pink_clam": [0, 10, 412, 89, 85], "brown_clam": [0, 108, 412, 89, 83], "banded_shrimp": [0, 201, 406, 105, 89], "orange_shrimp": [0, 308, 413, 90, 85], "yellow_striped_fish": [0, 414, 420, 91, 73], "parrotfish": [0, 516, 417, 93, 74], "cyan_fish": [0, 615, 419, 98, 68], "pink_fish": [0, 721, 414, 94, 80], "multicolor_fish": [0, 824, 413, 92, 82], "violet_fish": [0, 926, 413, 89, 77], "grey_shark": [1, 10, 48, 99, 77], "hammerhead_shark": [1, 109, 54, 104, 72], "whale_shark": [1, 211, 55, 108, 73], "killer_whale": [1, 318, 50, 97, 77], "dolphin": [1, 416, 53, 92, 75], "beluga_whale": [1, 509, 56, 103, 72], "blue_whale_v2": [1, 610, 62, 112, 65], "humpback_whale": [1, 720, 56, 103, 74], "narwhal": [1, 818, 42, 119, 87], "manta_ray": [1, 914, 54, 97, 70], "electric_ray": [1, 9, 142, 93, 71], "spotted_eagle_ray": [1, 107, 137, 99, 78], "sawfish": [1, 209, 146, 137, 70], "spotted_moray": [1, 322, 148, 96, 77], "electric_eel": [1, 416, 158, 106, 51], "octopus_v2": [1, 528, 138, 96, 87], "blue_ringed_octopus": [1, 631, 145, 87, 75], "squid_v2": [1, 727, 137, 81, 90], "cuttlefish": [1, 817, 154, 111, 70], "nautilus": [1, 943, 145, 74, 76], "yellow_pufferfish": [1, 9, 233, 86, 77], "spiny_pufferfish": [1, 109, 231, 88, 83], "clownfish_v2": [1, 205, 235, 98, 74], "blue_tang_v2": [1, 311, 237, 94, 71], "yellow_tang_v2": [1, 417, 234, 90, 75], "angelfish_v2": [1, 517, 231, 91, 86], "butterflyfish_v2": [1, 621, 238, 91, 71], "lionfish_v2": [1, 721, 230, 90, 87], "rainbow_fish": [1, 820, 238, 96, 73], "black_triggerfish": [1, 926, 232, 90, 78], "seahorse_v2": [1, 27, 320, 52, 89], "green_turtle_v2": [1, 85, 331, 111, 72], "leatherback_turtle": [1, 192, 325, 117, 85], "spiny_lobster": [1, 310, 321, 92, 91], "king_prawn": [1, 396, 320, 114, 91], "hermit_crab": [1, 517, 335, 90, 76], "shore_crab": [1, 615, 327, 95, 79], "blue_crab": [1, 716, 327, 107, 82], "mantis_shrimp_v2": [1, 827, 331, 93, 70], "horseshoe_crab": [1, 917, 326, 93, 84], "pink_jellyfish_v2": [1, 14, 413, 84, 94], "blue_jellyfish_v2": [1, 113, 412, 86, 95], "moon_jellyfish": [1, 219, 418, 78, 88], "red_anemone": [1, 312, 418, 93, 85], "starfish_v2": [1, 417, 418, 85, 80], "purple_urchin": [1, 514, 421, 93, 82], "sea_cucumber_v2": [1, 613, 431, 96, 64], "giant_clam": [1, 716, 430, 108, 74], "cleaner_shrimp": [1, 823, 413, 106, 91], "peppermint_shrimp": [1, 920, 413, 97, 92]};
const ALL_SPRITE_KEYS = Object.keys(SPRITE_DATA);

const SPECIES_MAP = {
  'tetra': 'damselfish',
  'neon-tetra': 'cyan_fish',
  'clownfish': 'clownfish',
  'tang': 'yellow_tang',
  'yellow-tang': 'yellow_tang',
  'blue-tang': 'blue_tang',
  'butterflyfish': 'butterflyfish',
  'angelfish': 'striped_angelfish',
  'seahorse': 'orange_seahorse',
  'pink-seahorse': 'pink_seahorse',
  'shark': 'blue_shark',
  'blue-shark': 'blue_shark',
  'dolphin': 'blue_dolphin',
  'whale': 'blue_whale',
  'blue-whale': 'blue_whale',
  'turtle': 'green_turtle',
  'sea-turtle': 'green_turtle',
  'pufferfish': 'green_pufferfish',
  'octopus': 'red_octopus',
  'squid': 'pink_squid',
  'jellyfish': 'blue_jellyfish',
  'crab': 'red_crab',
  'lobster': 'red_lobster',
  'starfish': 'orange_starfish',
  'manta-ray': 'manta_ray',
  'clam': 'giant_clam',
  'shrimp': 'cleaner_shrimp',
  'eel': 'moray_eel'
};

function getSpriteKey(f, index) {
  if (f && f.sprite && SPECIES_MAP[f.sprite]) return SPECIES_MAP[f.sprite];
  if (f && f.species && SPECIES_MAP[f.species]) return SPECIES_MAP[f.species];
  let h = index || 0;
  const str = (f ? f.name || '' : '') + (f ? f.lang || '' : '');
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return ALL_SPRITE_KEYS[Math.abs(h) % ALL_SPRITE_KEYS.length];
}

const sheetImgs = [new Image(), new Image()];
function setupSheetImage(img, filename) {
  const paths = [
    'assets/sprites/' + filename,
    '../assets/sprites/' + filename,
    '../../assets/sprites/' + filename,
    'docs/assets/sprites/' + filename
  ];
  let idx = 0;
  img.onload = function () { img._loaded = true; };
  img.onerror = function () {
    idx++;
    if (idx < paths.length) img.src = paths[idx];
  };
  img.src = paths[0];
}
setupSheetImage(sheetImgs[0], 'sheet1.png');
setupSheetImage(sheetImgs[1], 'sheet2.png');

/* Schooling companion logic: only duplicate small schooling species */
const SCHOOLING_SPECIES = new Set([
  'clownfish', 'tang', 'yellow-tang', 'blue-tang', 'yellow_tang', 'blue_tang',
  'tetra', 'neon-tetra', 'cyan_fish', 'damselfish', 'angelfish', 'striped_angelfish',
  'butterflyfish', 'pufferfish', 'green_pufferfish'
]);

const ALL_FISH = [];
(FISH_DATA || []).forEach(f => {
  ALL_FISH.push(f);
  const spKey = (f.sprite || f.species || '').toLowerCase().replace(/_/g, '-');
  const isSchooling = SCHOOLING_SPECIES.has(spKey) || SCHOOLING_SPECIES.has(f.sprite) || f.schooling;
  if (isSchooling) {
    ALL_FISH.push(Object.assign({}, f, {
      size: Math.max(4.8, f.size * (0.85 + Math.random() * 0.22)),
      pace: f.pace * (0.92 + Math.random() * 0.16),
      peer: true
    }));
  }
});

const sw = new SwarmEngine(Math.max(ALL_FISH.length, 64), 800, 600);
resize();
window.addEventListener('resize', resize);

ALL_FISH.forEach((f, idx) => {
  const gid = (f.groupId !== undefined) ? f.groupId : (idx % 8);
  const targetDepth = f.depth !== undefined ? f.depth : (0.2 + (idx % 6) * 0.12);
  const spawnY = targetDepth * (H - 120) + 50;
  sw.spawn(40 + Math.random() * (W - 80), spawnY, undefined, gid);
  sw.speedScale[sw.n - 1] = f.pace || 1.0;
});

/* Orientation smoothing states to eliminate rotation jitter */
const fishFacing = new Float32Array(sw.cap);
const fishPitch = new Float32Array(sw.cap);
const fishScaleX = new Float32Array(sw.cap);
const fishFlipHold = new Float32Array(sw.cap);
for (let i = 0; i < sw.cap; i++) {
  fishFacing[i] = Math.random() < 0.5 ? 1 : -1;
  fishScaleX[i] = fishFacing[i];
}

const p = sw.p;
// Rule-03 (Lumen ALIGNMENT beat) feel: polarised schools read as alive and
// do not visually overlap, because separation now covers roughly the drawn
// sprite footprint, not just the physics point radius.
p.rCoh = 88; p.rAli = 70; p.rSep = 40;
p.wCoh = 0.62; p.wAli = 1.9; p.wSep = 2.6;
p.minSpeed = 24; p.maxSpeed = 66; p.maxForce = 165;
p.margin = 56; p.maxNeighbours = 8;
p.lureCore = 40;

/* World entities */
const world = {
  predators: [], obstacles: [], ripples: [], foods: [], lure: { x: 0, y: 0, power: 0, active: false }
};
const softLure = new window.SoftLureController(W / 2, H / 2);
const encounterDirector = new window.EncounterWaveDirector();

/* Food feeding system */
const foods = [];
const crumbs = [];

function dropFood(x, y) {
  for (let k = 0; k < 3; k++) {
    foods.push({
      x: x + (Math.random() - 0.5) * 24,
      y: y + (Math.random() - 0.5) * 16,
      vx: (Math.random() - 0.5) * 12,
      vy: 22 + Math.random() * 26,
      r: 3.2 + Math.random() * 1.6,
      active: true,
      age: 0,
      maxAge: 16,
      hue: 35 + Math.random() * 18
    });
  }
  spawnCursorBubbles(x, y);
}

/* Mouse interaction & Rising bubbles */
let mx = W / 2, my = H / 2, hovering = false, pointerDown = false;

function spawnCursorBubbles(x, y) {
  for (let k = 0; k < 2; k++) {
    bubbles.push({
      x: x + (Math.random() - 0.5) * 18,
      y: y + (Math.random() - 0.5) * 18,
      v: 24 + Math.random() * 34,
      r: 1.5 + Math.random() * 3.2,
      drift: (Math.random() - 0.5) * 14,
      a: 0.38 + Math.random() * 0.35,
      wobblePhase: Math.random() * TAU,
      wobbleAmp: 0.8 + Math.random() * 1.2,
      wobbleFreq: 2 + Math.random() * 2.5,
    });
  }
  if (bubbles.length > 80) bubbles.shift();
}

function movePointer(x, y) {
  mx = x; my = y; hovering = true;
  softLure.setTarget(mx, my, true);
  spawnCursorBubbles(x, y);
}

cv.addEventListener('pointermove', e => movePointer(e.clientX, e.clientY));
cv.addEventListener('pointerdown', e => {
  pointerDown = true;
  movePointer(e.clientX, e.clientY);
  dropFood(e.clientX, e.clientY);
});
window.addEventListener('pointerup', () => { pointerDown = false; softLure.setTarget(mx, my, false); });
cv.addEventListener('pointerleave', () => { hovering = false; pointerDown = false; softLure.setTarget(mx, my, false); });
cv.addEventListener('pointercancel', () => { hovering = false; pointerDown = false; softLure.setTarget(mx, my, false); });
cv.addEventListener('touchmove', e => {
  e.preventDefault();
  movePointer(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });

/* marine snow: drift only */
const snow = [];
for (let i = 0; i < 90; i++) {
  snow.push({
    x: Math.random() * 2000, y: Math.random() * 1200,
    v: 8 + Math.random() * 16, r: 0.6 + Math.random() * 1.5,
    a: 0.15 + Math.random() * 0.3, drift: (Math.random() - 0.5) * 6,
  });
}

/* bubbles */
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

/* seaweed config */
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
    hue: 100 + Math.random() * 50,
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
    phase: Math.random() * TAU,
    speed: 0.2 + Math.random() * 0.3,
  });
}

/* caustics config */
const caustics = [];
for (let i = 0; i < 14; i++) {
  caustics.push({
    xNorm: 0.04 + i * 0.07 + (Math.random() - 0.5) * 0.04,
    yNorm: 0.82 + Math.random() * 0.16,
    size: 25 + Math.random() * 40,
    phase: Math.random() * TAU,
    speed: 0.5 + Math.random() * 0.6,
    alpha: 0.03 + Math.random() * 0.04,
  });
}

function localOrder() {
  let sx = 0, sy = 0;
  for (let i = 0; i < sw.n; i++) {
    const sp = Math.hypot(sw.vx[i], sw.vy[i]) || 1;
    sx += sw.vx[i] / sp; sy += sw.vy[i] / sp;
  }
  return Math.hypot(sx, sy) / (sw.n || 1);
}

let lastT = performance.now() / 1000, frames = 0, fpsT = 0, ordT = 0;

function spriteVisualRadius(f) {
  const scaleFactor = Math.min(Math.max(W / 1100, 0.82), 1.25);
  const drawW = Math.max(24, Math.min(48, f.size * 2.5)) * scaleFactor;
  return drawW * 0.42;
}

function declutterOverlaps(dt) {
  const n = sw.n;
  const push = Math.min(1, dt * 14);
  for (let i = 0; i < n; i++) {
    const fi = ALL_FISH[i]; if (!fi) continue;
    const ri = spriteVisualRadius(fi);
    for (let j = i + 1; j < n; j++) {
      const fj = ALL_FISH[j]; if (!fj) continue;
      const dx = sw.px[j] - sw.px[i], dy = sw.py[j] - sw.py[i];
      const rj = spriteVisualRadius(fj);
      const minDist = (ri + rj) * 0.86; // slight tolerance so schools stay tight, not glued
      const d2 = dx * dx + dy * dy;
      if (d2 >= minDist * minDist || d2 < 1e-6) continue;
      const d = Math.sqrt(d2);
      const overlap = (minDist - d) * 0.5 * push;
      const nx = dx / d, ny = dy / d;
      sw.px[i] -= nx * overlap; sw.py[i] -= ny * overlap;
      sw.px[j] += nx * overlap; sw.py[j] += ny * overlap;
    }
  }
}

function frame() {
  const now = performance.now() / 1000;
  const dt = Math.min(now - lastT, 0.05);
  lastT = now;
  const t = now;

  /* update foods */
  world.foods = foods;
  for (let fi = foods.length - 1; fi >= 0; fi--) {
    const fd = foods[fi];
    if (!fd.active) { foods.splice(fi, 1); continue; }
    fd.age += dt;
    if (fd.age > fd.maxAge) { fd.active = false; continue; }
    if (fd.y < H - 24) {
      fd.y += fd.vy * dt;
      fd.x += fd.vx * dt + Math.sin(t * 3 + fd.age * 2) * 6 * dt;
      fd.vy = Math.min(fd.vy + 12 * dt, 36);
    }
  }

  /* Soft lure: pointer controls a field with release inertia, not a hard point pull. */
  softLure.setTarget(mx, my, pointerDown);
  const soft = softLure.update(dt);
  world.lure.x = soft.x; world.lure.y = soft.y;
  world.lure.power = soft.power; world.lure.active = soft.active;
  encounterDirector.update(dt, W, H);
  if (waveCountdownEl) {
    const seconds = encounterDirector.secondsUntilWave();
    waveCountdownEl.textContent = '00:00:' + String(seconds).padStart(2, '0');
  }

  /* Habitat depth steering & species behavior */
  for (let i = 0; i < sw.n; i++) {
    const f = ALL_FISH[i];
    if (!f) continue;
    const spKey = getSpriteKey(f, i);
    const targetDepth = f.depth !== undefined ? f.depth : 0.5;
    const targetY = targetDepth * (H - 120) + 50;

    if (spKey === 'red_crab' || spKey === 'red_lobster' || spKey === 'orange_starfish' || spKey === 'giant_clam') {
      sw.py[i] = Math.max(H - 45, Math.min(H - 18, sw.py[i]));
      sw.vy[i] *= 0.15;
    } else if (spKey === 'blue_jellyfish' || spKey === 'pink_jellyfish') {
      sw.vy[i] += (Math.sin(t * 2.0 + i) * 16 - 3) * dt;
      sw.vx[i] *= 0.97;
    } else {
      const dy = targetY - sw.py[i];
      sw.vy[i] += dy * 0.45 * dt;
    }
  }

  /* update fish engine */
  sw.step(dt, world);

  /* Positional declutter pass: boid forces alone cannot GUARANTEE zero
   * visual overlap once maxForce clamps a crowded, aligned school, so this
   * runs once per frame using each fish's actual drawn sprite radius (not
   * the physics point radius) and gently pushes overlapping pairs apart.
   * It is a tiny position nudge, never a velocity/force change, so it does
   * not fight or destabilise the boid steering above it. */
  declutterOverlaps(dt);

  frames++; fpsT += dt;
  if (fpsT > 0.5) {
    fpsEl.textContent = Math.round(frames / fpsT);
    frames = 0; fpsT = 0;
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
  if (aquariumBackground._loaded) {
    g.save(); g.globalAlpha = 0.24;
    g.drawImage(aquariumBackground, 0, 0, W, H);
    g.restore();
  }

  /* 2. God rays */
  g.save();
  for (let i = 0; i < godRays.length; i++) {
    const r = godRays[i];
    const topX = (r.xNorm + Math.sin(t * r.speed * 0.5 + r.phase) * 0.03) * W;
    const botX = (r.xNorm + Math.sin(t * r.speed + r.phase) * 0.08) * W;
    const a = r.alpha * (0.6 + 0.4 * Math.sin(t * r.speed * 1.5 + r.phase));
    const grd = g.createLinearGradient(topX, 0, botX, H * 0.85);
    grd.addColorStop(0, 'rgba(180,240,255,' + (a * 2.2) + ')');
    grd.addColorStop(0.3, 'rgba(120,220,255,' + a + ')');
    grd.addColorStop(0.7, 'rgba(80,180,230,' + (a * 0.4) + ')');
    grd.addColorStop(1, 'rgba(40,120,180,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(topX - r.topW * 0.5, 0);
    g.lineTo(topX + r.topW * 0.5, 0);
    g.lineTo(botX + r.bottomW * 0.5, H * 0.85);
    g.lineTo(botX - r.bottomW * 0.5, H * 0.85);
    g.closePath();
    g.fill();
  }
  g.restore();

  /* 3. Surface waves */
  g.save();
  for (let w = 0; w < 3; w++) {
    const waveY = 8 + w * 7;
    const speed = 0.6 + w * 0.3;
    const amp = 3 + w * 1.5;
    g.beginPath();
    g.moveTo(0, waveY);
    for (let x = 0; x <= W; x += 16) {
      const y = waveY + Math.sin(x * 0.008 + t * speed + w * 1.8) * amp
                      + Math.sin(x * 0.018 - t * speed * 0.7) * (amp * 0.4);
      g.lineTo(x, y);
    }
    g.strokeStyle = 'rgba(180,240,255,' + (0.12 - w * 0.03) + ')';
    g.lineWidth = 1.2;
    g.stroke();
  }
  g.restore();

  /* 4. Caustic patterns */
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

  /* 5. Sandy floor */
  const floorH = H * 0.12;
  const floor = g.createLinearGradient(0, H - floorH, 0, H);
  floor.addColorStop(0, 'rgba(20,60,80,0)');
  floor.addColorStop(0.3, 'rgba(18,50,65,.15)');
  floor.addColorStop(1, 'rgba(12,35,50,.3)');
  g.fillStyle = floor; g.fillRect(0, H - floorH, W, floorH);

  /* 6. Seaweed */
  g.save();
  for (let si = 0; si < seaweeds.length; si++) {
    const sw2 = seaweeds[si];
    const baseX = 16 + si * (W - 32) / (seaweeds.length - 1);
    const baseY = H;
    g.lineWidth = sw2.width;
    g.lineCap = 'round';
    g.lineJoin = 'round';

    const pts = [{ x: baseX, y: baseY }];
    for (let s = 1; s <= sw2.segments; s++) {
      const sway = Math.sin(t * sw2.speed + sw2.phase + s * 0.8) * (9 + s * 3)
                  + Math.sin(t * sw2.speed * 0.6 + s * 1.3) * (4 + s * 1.5);
      pts.push({ x: baseX + sway, y: baseY - s * sw2.segLen });
    }

    const stemGrd = g.createLinearGradient(baseX, baseY, baseX, baseY - sw2.segments * sw2.segLen);
    stemGrd.addColorStop(0, 'hsl(' + sw2.hue + ',' + sw2.sat + '%,' + (sw2.lit + 5) + '%)');
    stemGrd.addColorStop(0.5, 'hsl(' + sw2.hue + ',' + (sw2.sat + 10) + '%,' + (sw2.lit + 10) + '%)');
    stemGrd.addColorStop(1, 'hsl(' + (sw2.hue + 15) + ',' + (sw2.sat + 15) + '%,' + (sw2.lit + 20) + '%)');
    g.strokeStyle = stemGrd;

    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let s = 1; s < pts.length; s++) {
      const prev = pts[s - 1], cur = pts[s];
      g.quadraticCurveTo(prev.x, prev.y, (prev.x + cur.x) / 2, (prev.y + cur.y) / 2);
    }
    g.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    g.stroke();
  }
  g.restore();

  /* 7. Marine snow */
  for (const s of snow) {
    s.y += s.v * dt; s.x += s.drift * dt;
    if (s.y > H + 10) { s.y = -10; s.x = Math.random() * W; }
    if (s.x > W + 10) s.x = -10; if (s.x < -10) s.x = W + 10;
    g.fillStyle = 'rgba(207,234,255,' + s.a + ')';
    g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.fill();
  }

  /* 8. Rising Bubbles */
  g.lineWidth = 1;
  for (let bi = bubbles.length - 1; bi >= 0; bi--) {
    const bubble = bubbles[bi];
    bubble.wobblePhase += dt * bubble.wobbleFreq;
    bubble.y -= bubble.v * dt;
    bubble.x += bubble.drift * dt + Math.sin(bubble.wobblePhase) * bubble.wobbleAmp;
    if (bubble.y < -bubble.r - 4) {
      if (bi >= 40) { bubbles.splice(bi, 1); continue; }
      bubble.y = H + bubble.r + 4; bubble.x = Math.random() * W;
    }
    const br = bubble.r;
    g.globalAlpha = bubble.a * 0.6;
    const bGrd = g.createRadialGradient(
      bubble.x - br * 0.25, bubble.y - br * 0.25, br * 0.1,
      bubble.x, bubble.y, br
    );
    bGrd.addColorStop(0, 'rgba(220,250,255,0.4)');
    bGrd.addColorStop(1, 'rgba(120,200,230,0.02)');
    g.fillStyle = bGrd;
    g.beginPath(); g.arc(bubble.x, bubble.y, br, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(200,245,255,0.5)';
    g.beginPath(); g.arc(bubble.x, bubble.y, br, 0, TAU); g.stroke();
  }
  g.globalAlpha = 1;

  /* 9. Food pellets rendering */
  for (let fi = 0; fi < foods.length; fi++) {
    const fd = foods[fi];
    if (!fd.active) continue;
    const alpha = Math.min(1, (fd.maxAge - fd.age) * 2.5);
    g.globalAlpha = alpha;
    g.fillStyle = 'hsl(' + fd.hue + ', 85%, 52%)';
    g.beginPath();
    g.arc(fd.x, fd.y, fd.r, 0, TAU);
    g.fill();
    g.fillStyle = 'hsl(' + fd.hue + ', 95%, 78%)';
    g.beginPath();
    g.arc(fd.x - fd.r * 0.3, fd.y - fd.r * 0.3, fd.r * 0.45, 0, TAU);
    g.fill();
  }
  /* Food crumbs */
  for (let ci = crumbs.length - 1; ci >= 0; ci--) {
    const cr = crumbs[ci];
    cr.x += cr.vx * dt; cr.y += cr.vy * dt; cr.life -= dt;
    if (cr.life <= 0) { crumbs.splice(ci, 1); continue; }
    g.globalAlpha = Math.min(1, cr.life * 2);
    g.fillStyle = cr.color;
    g.beginPath(); g.arc(cr.x, cr.y, 1.6, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;

  /* 10. Fish rendering (Zero-jitter, smoothed facing and swimming kinematics) */
  let hoverIdx = -1, hoverD = 1e9;
  for (let i = 0; i < sw.n; i++) {
    const f = ALL_FISH[i]; if (!f) continue;
    const x = sw.px[i], y = sw.py[i];
    const vx = sw.vx[i], vy = sw.vy[i];
    const b = f.size;
    const isDormant = !!f.dormant;

    /* Check food eating */
    for (let fi = 0; fi < foods.length; fi++) {
      const fd = foods[fi];
      if (!fd.active) continue;
      const dist = Math.hypot(fd.x - x, fd.y - y);
      if (dist < b * 1.8 + fd.r + 6) {
        fd.active = false;
        for (let c = 0; c < 5; c++) {
          crumbs.push({
            x: fd.x, y: fd.y,
            vx: (Math.random() - 0.5) * 28,
            vy: (Math.random() - 0.5) * 28,
            life: 0.5,
            color: 'hsl(' + fd.hue + ', 85%, 65%)'
          });
        }
        spawnCursorBubbles(x, y - b);
        break;
      }
    }

    // Hover detection with generous hit radius
    const hitR = Math.max(20, b * 2.2);
    if (hovering) {
      const d = Math.hypot(x - mx, y - my);
      if (d < hitR && d < hoverD) { hoverD = d; hoverIdx = i; }
    }

    const isHovered = (hoverIdx === i);
    const spriteKey = getSpriteKey(f, i);
    const spDef = SPRITE_DATA[spriteKey];
    const sheetImg = spDef ? sheetImgs[spDef[0]] : null;

    /* Jitter-free Facing Direction: Sprites natively face LEFT */
    // A wide dead-band plus a short hold timer stops the sprite from
    // flickering when boid separation makes vx wobble near zero in a
    // crowd; it only turns once heading has genuinely reversed.
    const desiredFacing = vx < -9 ? 1 : (vx > 9 ? -1 : fishFacing[i]);
    if (desiredFacing !== fishFacing[i]) {
      fishFlipHold[i] += dt;
      if (fishFlipHold[i] > 0.12) { fishFacing[i] = desiredFacing; fishFlipHold[i] = 0; }
    } else {
      fishFlipHold[i] = 0;
    }

    // Smooth turning transition
    fishScaleX[i] += (fishFacing[i] - fishScaleX[i]) * Math.min(1, dt * 10);

    // Gentle swimming pitch (clamped to avoid severe bending)
    const rawPitch = Math.atan2(-vy, Math.abs(vx) || 1);
    const targetPitch = Math.max(-0.25, Math.min(0.25, rawPitch * 0.35));
    fishPitch[i] += (targetPitch - fishPitch[i]) * Math.min(1, dt * 8);

    if (sheetImg && sheetImg._loaded) {
      const sx = spDef[1], sy = spDef[2], sw_px = spDef[3], sh_px = spDef[4];
      const aspect = sh_px / sw_px;
      // Proportional creature sizing based on viewport
      const scaleFactor = Math.min(Math.max(W / 1100, 0.82), 1.25);
      const drawW = Math.max(24, Math.min(48, b * 2.5)) * scaleFactor;
      const drawH = drawW * aspect;
      const visualRadius = Math.max(drawW, drawH) * 0.45;

      g.save();
      // Idle animation is visual-only: it never feeds back into boid physics.
      // Different phase/frequency per creature prevents a synchronized school.
      const idleBob = Math.sin(t * (0.85 + (i % 4) * 0.13) + i * 1.71) * (0.8 + (i % 3) * 0.35);
      const idleSway = Math.sin(t * (0.52 + (i % 5) * 0.08) + i * 2.13) * 0.018;
      g.translate(x, y + idleBob);

      // Natural swimming wiggle is deliberately tiny and eased.
      const wiggle = Math.sin(sw.phase[i]) * 0.035;
      g.rotate(fishPitch[i] + wiggle + idleSway);

      // Slow breathing / tail rhythm; no squash during direction changes.
      const squash = 1 + Math.sin(sw.phase[i] * 0.72 + i) * 0.018;
      g.scale(fishScaleX[i] * squash, (1 / squash));

      // Lighting, depth glow and interaction highlight
      if (isHovered) {
        g.globalAlpha = 1;
        g.shadowBlur = 20;
        g.shadowColor = '#66dcff';
      } else if (isDormant) {
        g.globalAlpha = 0.76;
        g.shadowBlur = 10;
        g.shadowColor = f.color || '#7fd8ff';
      } else {
        g.globalAlpha = 0.98;
        g.shadowBlur = 6;
        g.shadowColor = 'rgba(0,25,50,0.4)';
      }

      g.drawImage(sheetImg, sx, sy, sw_px, sh_px, -drawW / 2, -drawH / 2, drawW, drawH);
      g.restore();
    } else {
      // Procedural fallback
      const tl = b * 0.75;
      const sp = Math.hypot(vx, vy) || 1;
      const dx = vx / sp, dy = vy / sp;
      const nx = -dy, ny = dx;
      g.globalAlpha = isDormant ? 0.74 : 0.95;
      g.shadowBlur = isDormant ? 14 : 9; g.shadowColor = f.color;
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
  }

  /* 11. Directed encounter waves: large leader plus an escort formation. */
  encounterDirector.render(g, t, function (key, x, y, width, direction, alpha) {
    const def = SPRITE_DATA[key];
    const image = def ? sheetImgs[def[0]] : null;
    if (!image || !image._loaded) return;
    const sx = def[1], sy = def[2], swp = def[3], shp = def[4];
    const height = width * (shp / swp);
    g.save(); g.translate(x, y); g.scale(direction > 0 ? -1 : 1, 1);
    g.globalAlpha = alpha; g.shadowBlur = 5; g.shadowColor = 'rgba(30,160,210,.36)';
    g.drawImage(image, sx, sy, swp, shp, -width / 2, -height / 2, width, height);
    g.restore(); g.globalAlpha = 1;
  });

  /* 12. Vignette overlay for depth */
  const vig = g.createRadialGradient(W * 0.5, H * 0.4, Math.min(W, H) * 0.25, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(0.7, 'rgba(2,8,20,0.08)');
  vig.addColorStop(1, 'rgba(2,6,16,0.25)');
  g.fillStyle = vig; g.fillRect(0, 0, W, H);

  if (hoverIdx >= 0) {
    const f = ALL_FISH[hoverIdx];
    const spriteKey = getSpriteKey(f, hoverIdx);
    const dispSpecies = (f.species || spriteKey).replace(/_/g, ' ');
    const commitText = f.commits ? ('  ·  ' + f.commits + ' commits') : '';
    tip.textContent = f.name + '  ·  ' + dispSpecies + '  ·  ' + f.lang + commitText + '  ·  ' + f.stars + '\u2605' +
      (f.dormant ? '  ·  resting ' + f.ageDays + 'd' : '');
    tip.style.left = Math.min(mx + 16, W - 290) + 'px';
    tip.style.top = (my + 16) + 'px';
    tip.classList.add('on');
  } else tip.classList.remove('on');

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
