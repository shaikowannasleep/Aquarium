'use strict';
/* =====================================================================
 * Runs the boids engine headless, records every agent's path, and bakes
 * it into an SVG with SMIL <animateMotion> and cubic spline interpolation.
 * Uses authentic high-resolution cartoon sprites embedded as Base64.
 * Directed composition: 14-16 featured creatures across 5 depth zones.
 * ===================================================================== */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { fetchProfile, fallback } = require('./fetch-github');

const W = 880, H = 360;
const FRAMES = 420;          // 14 s at 30 fps
const FPS = 30;
const SAMPLE = 4;            // 105 samples for smooth motion

const SPRITE_META = {
  "blue_shark": {"w": 105, "h": 76}, "spotted_shark": {"w": 92, "h": 60}, "orca": {"w": 100, "h": 74},
  "blue_dolphin": {"w": 98, "h": 73}, "pink_dolphin": {"w": 100, "h": 70}, "blue_whale": {"w": 103, "h": 88},
  "beluga": {"w": 103, "h": 59}, "stingray": {"w": 96, "h": 68}, "spotted_ray": {"w": 88, "h": 73},
  "swordfish": {"w": 106, "h": 69}, "clownfish": {"w": 96, "h": 70}, "blue_tang": {"w": 92, "h": 65},
  "yellow_tang": {"w": 91, "h": 72}, "purple_fish": {"w": 92, "h": 66}, "flame_angelfish": {"w": 93, "h": 72},
  "moorish_idol": {"w": 81, "h": 77}, "damselfish": {"w": 92, "h": 73}, "butterflyfish": {"w": 92, "h": 75},
  "striped_angelfish": {"w": 88, "h": 83}, "lionfish": {"w": 99, "h": 93}, "green_turtle": {"w": 101, "h": 75},
  "brown_turtle": {"w": 101, "h": 69}, "green_pufferfish": {"w": 90, "h": 84}, "orange_pufferfish": {"w": 87, "h": 80},
  "blue_porcupinefish": {"w": 89, "h": 72}, "orange_seahorse": {"w": 66, "h": 100}, "pink_seahorse": {"w": 62, "h": 97},
  "red_octopus": {"w": 108, "h": 95}, "pink_squid": {"w": 82, "h": 98}, "moray_eel": {"w": 101, "h": 61},
  "red_lobster": {"w": 100, "h": 93}, "red_crab": {"w": 96, "h": 79}, "mantis_shrimp": {"w": 97, "h": 77},
  "blue_jellyfish": {"w": 80, "h": 101}, "pink_jellyfish": {"w": 83, "h": 97}, "sea_anemone": {"w": 104, "h": 87},
  "sea_urchin": {"w": 88, "h": 83}, "orange_starfish": {"w": 91, "h": 84}, "blue_starfish": {"w": 88, "h": 83},
  "sea_cucumber": {"w": 96, "h": 54}, "pink_clam": {"w": 89, "h": 85}, "brown_clam": {"w": 89, "h": 83},
  "banded_shrimp": {"w": 105, "h": 89}, "orange_shrimp": {"w": 90, "h": 85}, "yellow_striped_fish": {"w": 91, "h": 73},
  "parrotfish": {"w": 93, "h": 74}, "cyan_fish": {"w": 98, "h": 68}, "pink_fish": {"w": 94, "h": 80},
  "multicolor_fish": {"w": 92, "h": 82}, "violet_fish": {"w": 89, "h": 77}, "grey_shark": {"w": 99, "h": 77},
  "hammerhead_shark": {"w": 104, "h": 72}, "whale_shark": {"w": 108, "h": 73}, "killer_whale": {"w": 97, "h": 77},
  "dolphin": {"w": 92, "h": 75}, "beluga_whale": {"w": 103, "h": 72}, "blue_whale_v2": {"w": 112, "h": 65},
  "humpback_whale": {"w": 103, "h": 74}, "narwhal": {"w": 119, "h": 87}, "manta_ray": {"w": 97, "h": 70},
  "electric_ray": {"w": 93, "h": 71}, "spotted_eagle_ray": {"w": 99, "h": 78}, "sawfish": {"w": 137, "h": 70},
  "spotted_moray": {"w": 96, "h": 77}, "electric_eel": {"w": 106, "h": 51}, "octopus_v2": {"w": 96, "h": 87},
  "blue_ringed_octopus": {"w": 87, "h": 75}, "squid_v2": {"w": 81, "h": 90}, "cuttlefish": {"w": 111, "h": 70},
  "nautilus": {"w": 74, "h": 76}, "yellow_pufferfish": {"w": 86, "h": 77}, "spiny_pufferfish": {"w": 88, "h": 83},
  "clownfish_v2": {"w": 98, "h": 74}, "blue_tang_v2": {"w": 94, "h": 71}, "yellow_tang_v2": {"w": 90, "h": 75},
  "angelfish_v2": {"w": 91, "h": 86}, "butterflyfish_v2": {"w": 91, "h": 71}, "lionfish_v2": {"w": 90, "h": 87},
  "rainbow_fish": {"w": 96, "h": 73}, "black_triggerfish": {"w": 90, "h": 78}, "seahorse_v2": {"w": 52, "h": 89},
  "green_turtle_v2": {"w": 111, "h": 72}, "leatherback_turtle": {"w": 117, "h": 85}, "spiny_lobster": {"w": 92, "h": 91},
  "king_prawn": {"w": 114, "h": 91}, "hermit_crab": {"w": 90, "h": 76}, "shore_crab": {"w": 95, "h": 79},
  "blue_crab": {"w": 107, "h": 82}, "mantis_shrimp_v2": {"w": 93, "h": 70}, "horseshoe_crab": {"w": 93, "h": 84},
  "pink_jellyfish_v2": {"w": 84, "h": 94}, "blue_jellyfish_v2": {"w": 86, "h": 95}, "moon_jellyfish": {"w": 78, "h": 88},
  "red_anemone": {"w": 93, "h": 85}, "starfish_v2": {"w": 85, "h": 80}, "purple_urchin": {"w": 93, "h": 82},
  "sea_cucumber_v2": {"w": 96, "h": 64}, "giant_clam": {"w": 108, "h": 74}, "cleaner_shrimp": {"w": 106, "h": 91},
  "peppermint_shrimp": {"w": 97, "h": 92}
};

/* Proportional, comfortable size specs per creature class */
const CLASS_SCALE = {
  'blue_whale':      { baseW: 38, maxW: 44, classType: 'pelagic' },
  'blue_dolphin':    { baseW: 30, maxW: 34, classType: 'pelagic' },
  'blue_shark':      { baseW: 32, maxW: 36, classType: 'pelagic' },
  'killer_whale':    { baseW: 36, maxW: 42, classType: 'pelagic' },
  'green_turtle':    { baseW: 28, maxW: 32, classType: 'glider' },
  'manta_ray':       { baseW: 30, maxW: 35, classType: 'glider' },
  'spotted_ray':     { baseW: 28, maxW: 32, classType: 'glider' },
  'clownfish':       { baseW: 20, maxW: 24, classType: 'reef' },
  'yellow_tang':     { baseW: 21, maxW: 25, classType: 'reef' },
  'blue_tang':       { baseW: 21, maxW: 25, classType: 'reef' },
  'striped_angelfish': { baseW: 22, maxW: 26, classType: 'reef' },
  'butterflyfish':   { baseW: 22, maxW: 26, classType: 'reef' },
  'damselfish':      { baseW: 20, maxW: 24, classType: 'reef' },
  'cyan_fish':       { baseW: 20, maxW: 24, classType: 'reef' },
  'green_pufferfish':{ baseW: 22, maxW: 25, classType: 'reef' },
  'orange_seahorse': { baseW: 17, maxW: 21, classType: 'coral' },
  'pink_seahorse':   { baseW: 17, maxW: 21, classType: 'coral' },
  'blue_jellyfish':  { baseW: 21, maxW: 25, classType: 'coral' },
  'red_crab':        { baseW: 20, maxW: 24, classType: 'benthic' },
  'orange_starfish': { baseW: 18, maxW: 22, classType: 'benthic' },
  'giant_clam':      { baseW: 20, maxW: 24, classType: 'benthic' },
  'red_lobster':     { baseW: 22, maxW: 26, classType: 'benthic' },
  'moray_eel':       { baseW: 26, maxW: 30, classType: 'benthic' },
};

function loadEngine() {
  const sandbox = {
    performance: { now: () => Number(process.hrtime.bigint()) / 1e6 },
    Math, console,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/engine.js'), 'utf8'), sandbox);
  if (typeof sandbox.SwarmEngine !== 'function') {
    throw new Error('engine.js did not export SwarmEngine');
  }
  return sandbox.SwarmEngine;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Directed composition: deterministic selection of 14-16 creatures across 5 depth zones */
function selectDirectedSchool(allFish) {
  const byZone = {
    pelagic: [],  // upper water (whale, dolphin, shark)
    glider: [],   // mid gliders (turtle, ray)
    reef: [],     // schooling reef fish (tang, clownfish, angelfish, damselfish, butterflyfish)
    coral: [],    // coral drift (seahorse, jellyfish)
    benthic: []   // seabed (crab, starfish, clam, lobster)
  };

  allFish.forEach(f => {
    const sp = f.sprite || 'clownfish';
    const spec = CLASS_SCALE[sp] || { classType: 'reef' };
    const zone = spec.classType || (f.depth < 0.38 ? 'pelagic' : (f.depth < 0.55 ? 'glider' : (f.depth < 0.72 ? 'reef' : (f.depth < 0.85 ? 'coral' : 'benthic'))));
    (byZone[zone] || byZone.reef).push(f);
  });

  // Sort each zone by significance (commits + stars*100)
  const score = f => (f.commits || 0) + (f.stars || 0) * 150;
  for (const z in byZone) {
    byZone[z].sort((a, b) => score(b) - score(a));
  }

  const selected = [];
  // 1. Pelagic: top 2
  selected.push(...byZone.pelagic.slice(0, 2));
  // 2. Gliders: top 2
  selected.push(...byZone.glider.slice(0, 2));
  // 3. Reef: top 6 distinct species
  const seenReefSprites = new Set();
  for (const f of byZone.reef) {
    if (selected.filter(x => x.classType === 'reef').length >= 6) break;
    if (!seenReefSprites.has(f.sprite)) {
      seenReefSprites.add(f.sprite);
      selected.push(f);
    }
  }
  // 4. Coral: top 2
  selected.push(...byZone.coral.slice(0, 2));

  // 5. Benthic: top 2, or construct habitat benthic companion if none exist
  if (byZone.benthic.length >= 2) {
    selected.push(...byZone.benthic.slice(0, 2));
  } else if (byZone.benthic.length === 1) {
    selected.push(byZone.benthic[0]);
    selected.push({
      name: 'CoralSeabed', species: 'starfish', sprite: 'orange_starfish',
      lang: 'CSS', stars: 0, commits: 14, depth: 0.92, benthic: true
    });
  } else {
    selected.push({
      name: 'ReefSanctuary', species: 'red-crab', sprite: 'red_crab',
      lang: 'Rust', stars: 0, commits: 24, depth: 0.90, benthic: true
    });
    selected.push({
      name: 'CoralSeabed', species: 'starfish', sprite: 'orange_starfish',
      lang: 'CSS', stars: 0, commits: 14, depth: 0.92, benthic: true
    });
  }

  // Ensure total is between 14 and 16
  return selected.slice(0, 15);
}

function simulate(featuredFish) {
  const SwarmEngine = loadEngine();
  const rnd = mulberry32(
    featuredFish.reduce((h, f) => (h * 31 + f.name.length + (f.stars || 0)) | 0, 7)
  );
  const origRandom = Math.random;
  Math.random = rnd;

  const n = featuredFish.length;
  const sw = new SwarmEngine(Math.max(n, 16), W, H);

  featuredFish.forEach((f, idx) => {
    const gid = f.group !== undefined ? f.group : (idx % 8);
    const targetY = f.depth ? (f.depth * (H - 100) + 35) : (H * 0.5);
    const spawnX = 60 + (idx / n) * (W - 120) + (rnd() - 0.5) * 30;
    sw.spawn(spawnX, targetY, undefined, gid);
    sw.speedScale[sw.n - 1] = f.pace || 1.0;
  });

  const p = sw.p;
  // High separation & mild cohesion for airy, spacious distribution
  p.rCoh = 55; p.rAli = 45; p.rSep = 58;
  p.wCoh = 0.40; p.wAli = 0.95; p.wSep = 4.5;
  p.minSpeed = 16; p.maxSpeed = 42; p.maxForce = 110;
  p.margin = 52; p.maxNeighbours = 4;
  sw.resize(W, H);

  const world = {
    predators: [],
    obstacles: [],
    lure: { x: W * 0.5, y: H * 0.5, power: 0.18, active: true },
  };

  // Warm-up and settle according to depth tethers
  for (let f = 0; f < 240; f++) {
    const t = (f / 240) * Math.PI * 2;
    world.lure.x = W * 0.5 + Math.cos(t) * W * 0.32;
    world.lure.y = H * 0.48 + Math.sin(t * 1.1) * H * 0.16;

    for (let i = 0; i < sw.n; i++) {
      const fish = featuredFish[i];
      const targetDepth = fish.depth || 0.5;
      const targetY = targetDepth * (H - 90) + 35;
      if (fish.benthic || fish.sprite === 'red_crab' || fish.sprite === 'orange_starfish' || fish.sprite === 'giant_clam' || fish.sprite === 'red_lobster') {
        sw.py[i] = H - 34 + Math.sin(f * 0.05 + i) * 2;
        sw.vy[i] *= 0.1;
      } else {
        const dy = targetY - sw.py[i];
        sw.vy[i] += dy * 0.45 * (1 / FPS);
      }
    }
    sw.step(1 / FPS, world);
  }

  const tracks = featuredFish.map(() => []);
  for (let f = 0; f < FRAMES; f++) {
    const t = (f / FRAMES) * Math.PI * 2;
    world.lure.x = W * 0.5 + Math.cos(t) * W * 0.32;
    world.lure.y = H * 0.48 + Math.sin(t * 1.1) * H * 0.16;

    for (let i = 0; i < sw.n; i++) {
      const fish = featuredFish[i];
      const targetDepth = fish.depth || 0.5;
      const targetY = targetDepth * (H - 90) + 35;
      // Per-fish horizontal wave offset to avoid clustering
      const phase = (i / sw.n) * Math.PI * 2;
      sw.vx[i] += Math.sin(t * 1.5 + phase) * 2.5 * (1 / FPS);

      if (fish.benthic || fish.sprite === 'red_crab' || fish.sprite === 'orange_starfish' || fish.sprite === 'giant_clam' || fish.sprite === 'red_lobster') {
        sw.py[i] = H - 34 + Math.sin(t * 2 + i) * 2;
        sw.vy[i] *= 0.1;
      } else {
        const dy = targetY - sw.py[i];
        sw.vy[i] += dy * 0.45 * (1 / FPS);
      }
    }

    sw.step(1 / FPS, world);

    if (f % SAMPLE === 0) {
      for (let i = 0; i < sw.n; i++) {
        tracks[i].push([
          Math.round(sw.px[i] * 10) / 10,
          Math.round(sw.py[i] * 10) / 10,
        ]);
      }
    }
  }

  Math.random = origRandom;
  return tracks;
}

/* Catmull-Rom to Cubic B?zier conversion for smooth C1 path */
function loopPathFrom(track) {
  const n = track.length;
  if (n < 3) return '';

  let d = 'M' + track[0][0].toFixed(1) + ',' + track[0][1].toFixed(1);
  for (let i = 0; i < n; i++) {
    const p0 = track[(i - 1 + n) % n];
    const p1 = track[i];
    const p2 = track[(i + 1) % n];
    const p3 = track[(i + 2) % n];

    const cp1x = (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1);
    const cp1y = (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1);
    const cp2x = (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1);
    const cp2y = (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1);
    const endX = p2[0].toFixed(1);
    const endY = p2[1].toFixed(1);

    d += ' C' + cp1x + ',' + cp1y + ' ' + cp2x + ',' + cp2y + ' ' + endX + ',' + endY;
  }
  d += 'Z';
  return d;
}

/* Discrete scale flip & gentle pitch tilt */
function bakeFishTransforms(track, phaseOffset) {
  const n = track.length;
  const rawScales = [];
  const rawAngles = [];

  let facing = 1; // 1 = facing left (natural sprite orientation), -1 = facing right

  for (let i = 0; i < n; i++) {
    const prev = track[(i - 1 + n) % n];
    const next = track[(i + 1) % n];
    const vx = next[0] - prev[0];
    const vy = next[1] - prev[1];

    // Hysteresis: only change facing when moving decisively
    if (vx < -0.32) {
      facing = 1;   // swimming left -> keep default left-facing sprite
    } else if (vx > 0.32) {
      facing = -1;  // swimming right -> mirror horizontally
    }
    rawScales.push(facing);

    // Subtle pitch: strictly clamped to [-8?, 8?]
    const pitchRad = Math.atan2(-vy, Math.abs(vx) || 1);
    const pitchDeg = Math.max(-8, Math.min(8, pitchRad * (180 / Math.PI) * 0.32));
    // Subtle tail wiggle: 1.5?
    const wiggleDeg = Math.sin((i / n) * Math.PI * 6 + (phaseOffset || 0)) * 1.5;
    rawAngles.push(pitchDeg + wiggleDeg);
  }

  // Smooth angles
  let curAngle = rawAngles[0];
  const smoothedAngleStrs = new Array(n);
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < n; i++) {
      curAngle += (rawAngles[i] - curAngle) * 0.40;
      if (pass === 1) {
        smoothedAngleStrs[i] = (Math.round(curAngle * 10) / 10).toFixed(1);
      }
    }
  }

  // Discrete Scale Values: EITHER '1 1' OR '-1 1'
  // When used with calcMode="discrete", SVG SMIL NEVER interpolates through 0!
  // Zero squishing, zero flattening!
  const discreteScaleStrs = rawScales.map(s => (s === 1 ? '1 1' : '-1 1'));
  discreteScaleStrs[n - 1] = discreteScaleStrs[0];
  smoothedAngleStrs[n - 1] = smoothedAngleStrs[0];

  const keyTimes = [];
  for (let i = 0; i < n; i++) {
    keyTimes.push((i / (n - 1)).toFixed(3));
  }

  return {
    scaleValues: discreteScaleStrs.join(';'),
    angleValues: smoothedAngleStrs.join(';'),
    keyTimes: keyTimes.join(';')
  };
}

function esc(s) {
  return String(s).replace(/[<>&'"]/g, c => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]
  ));
}

function getSpriteBase64(spriteName) {
  const p = path.join(__dirname, '../docs/assets/sprites/' + spriteName + '.png');
  if (fs.existsSync(p)) {
    return 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
  }
  const fallback = path.join(__dirname, '../docs/assets/sprites/clownfish.png');
  return 'data:image/png;base64,' + fs.readFileSync(fallback).toString('base64');
}

function buildSvg(data, featuredFish, tracks) {
  const dur = (FRAMES / FPS).toFixed(2) + 's';
  const parts = [];

  parts.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H +
             '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' +
             esc(data.name) + ' GitHub aquarium">');

  parts.push('<defs>');
  /* Enhanced deep ocean gradient */
  parts.push('<radialGradient id="bg" cx="50%" cy="16%" r="84%">' +
             '<stop offset="0%" stop-color="#168aa8"/>' +
             '<stop offset="20%" stop-color="#0c5b7e"/>' +
             '<stop offset="50%" stop-color="#073356"/>' +
             '<stop offset="80%" stop-color="#031b34"/>' +
             '<stop offset="100%" stop-color="#010918"/></radialGradient>');
  /* Surface gradient */
  parts.push('<linearGradient id="surface" x1="0" x2="0" y1="0" y2="1">' +
             '<stop offset="0%" stop-color="#c8f8ff" stop-opacity=".50"/>' +
             '<stop offset="30%" stop-color="#82e1f5" stop-opacity=".28"/>' +
             '<stop offset="70%" stop-color="#3cb4d7" stop-opacity=".10"/>' +
             '<stop offset="100%" stop-color="#1e78aa" stop-opacity="0"/></linearGradient>');
  /* God ray gradient */
  parts.push('<linearGradient id="ray" x1="0" x2="0" y1="0" y2="1">' +
             '<stop offset="0%" stop-color="#b4ebff" stop-opacity=".07"/>' +
             '<stop offset="20%" stop-color="#78d2f0" stop-opacity=".04"/>' +
             '<stop offset="60%" stop-color="#46aae0" stop-opacity=".02"/>' +
             '<stop offset="100%" stop-color="#1e64a0" stop-opacity="0"/></linearGradient>');
  /* Floor sand gradient */
  parts.push('<linearGradient id="floor" x1="0" x2="0" y1="0" y2="1">' +
             '<stop offset="0%" stop-color="#0c2d42"/>' +
             '<stop offset="40%" stop-color="#0a2538"/>' +
             '<stop offset="100%" stop-color="#061824"/></linearGradient>');

  /* Crisp drop shadow filter - replaces blurry glow */
  parts.push('<filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">' +
             '<feDropShadow dx="0" dy="2.5" stdDeviation="1.8" flood-color="#021428" flood-opacity="0.48"/>' +
             '</filter>');
  /* Subtle dormant glow */
  parts.push('<filter id="glow-dormant" x="-30%" y="-30%" width="160%" height="160%">' +
             '<feGaussianBlur stdDeviation="2.2" result="b"/>' +
             '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>' +
             '</filter>');

  /* Embed Base64 sprite assets for each unique species in the school */
  const uniqueSprites = new Set(featuredFish.map(f => f.sprite || 'clownfish'));
  uniqueSprites.forEach(spriteKey => {
    const b64Uri = getSpriteBase64(spriteKey);
    const meta = SPRITE_META[spriteKey] || { w: 72, h: 54 };
    parts.push('<image id="sp_' + spriteKey + '" width="' + meta.w + '" height="' + meta.h +
               '" href="' + b64Uri + '"/>');
  });

  parts.push('</defs>');

  /* Background */
  parts.push('<rect width="' + W + '" height="' + H + '" fill="url(#bg)"/>');

  /* God rays */
  const rayRnd = mulberry32(4242);
  for (let i = 0; i < 7; i++) {
    const x = 50 + i * 125 + Math.floor((rayRnd() - 0.5) * 40);
    const topW = 25 + Math.floor(rayRnd() * 40);
    const bottomW = 75 + Math.floor(rayRnd() * 120);
    const baseAlpha = (0.02 + rayRnd() * 0.035).toFixed(3);
    const maxAlpha = (parseFloat(baseAlpha) * 2.0).toFixed(3);
    const animDur = (12 + rayRnd() * 16).toFixed(1);
    parts.push('<polygon points="' + (x - topW/2) + ',0 ' + (x + topW/2) + ',0 ' +
               (x + bottomW/2) + ',' + H + ' ' + (x - bottomW/2) + ',' + H +
               '" fill="url(#ray)">' +
               '<animate attributeName="opacity" values="' + baseAlpha + ';' + maxAlpha + ';' + baseAlpha +
               '" dur="' + animDur + 's" repeatCount="indefinite"/></polygon>');
  }

  /* Surface waves */
  parts.push('<rect width="' + W + '" height="50" fill="url(#surface)"/>');
  for (let wave = 0; wave < 2; wave++) {
    const yBase = 12 + wave * 10;
    const amp = 4 + wave * 2;
    const animDur = (6 + wave * 2) + 's';
    let d1 = 'M0,' + yBase;
    let d2 = 'M0,' + yBase;
    for (let x = 0; x <= W; x += 55) {
      const y1 = yBase + Math.sin(x * 0.035) * amp;
      const y2 = yBase + Math.sin(x * 0.035 + Math.PI) * amp;
      d1 += ' L' + x + ',' + y1.toFixed(1);
      d2 += ' L' + x + ',' + y2.toFixed(1);
    }
    parts.push('<path d="' + d1 + '" fill="none" stroke="rgba(180,240,255,' + (0.24 - wave * 0.08) +
               ')" stroke-width="' + (1.8 - wave * 0.4) + '">' +
               '<animate attributeName="d" dur="' + animDur + '" repeatCount="indefinite" values="' +
               d1 + ';' + d2 + ';' + d1 + '"/></path>');
  }

  /* Organic sandy floor dunes */
  parts.push('<path d="M0,320 Q220,312 440,324 T880,318 L880,360 L0,360 Z" fill="url(#floor)"/>');
  parts.push('<path d="M0,332 Q240,326 480,334 T880,330 L880,360 L0,360 Z" fill="#041522" opacity="0.5"/>');

  /* Left Coral Reef & Rock cluster */
  parts.push('<g opacity="0.9">');
  parts.push('<path d="M-10,360 C15,310 55,305 90,325 C115,338 125,355 135,360 Z" fill="#072034"/>');
  parts.push('<path d="M-5,360 C10,325 40,320 70,336 C90,348 100,358 110,360 Z" fill="#0b2c45"/>');
  parts.push('<path d="M28,328 C28,295 36,295 36,328" stroke="#e76f51" stroke-width="7" stroke-linecap="round" fill="none"/>');
  parts.push('<path d="M38,332 C38,285 47,285 47,332" stroke="#f4a261" stroke-width="8" stroke-linecap="round" fill="none"/>');
  parts.push('<path d="M49,335 C49,300 56,300 56,335" stroke="#e76f51" stroke-width="6" stroke-linecap="round" fill="none"/>');
  parts.push('<path d="M68,336 Q80,305 95,302 Q88,318 78,340" stroke="#7209b7" stroke-width="3" fill="none"/>');
  parts.push('<path d="M72,338 Q90,312 105,312 Q94,324 82,342" stroke="#9d4edd" stroke-width="3" fill="none"/>');
  parts.push('<path d="M76,340 Q100,320 112,324 Q98,332 86,344" stroke="#c77dff" stroke-width="2.5" fill="none"/>');
  parts.push('</g>');

  /* Right Coral Reef & Rock cluster */
  parts.push('<g opacity="0.9">');
  parts.push('<path d="M890,360 C865,312 825,308 790,326 C768,338 758,354 750,360 Z" fill="#072034"/>');
  parts.push('<path d="M885,360 C870,326 840,322 810,338 C792,348 782,358 775,360 Z" fill="#0b2c45"/>');
  parts.push('<path d="M848,330 C848,290 838,290 838,330" stroke="#2a9d8f" stroke-width="8" stroke-linecap="round" fill="none"/>');
  parts.push('<path d="M836,334 C836,302 828,302 828,334" stroke="#52b788" stroke-width="7" stroke-linecap="round" fill="none"/>');
  parts.push('<path d="M822,338 Q806,310 790,312 Q802,324 814,342" stroke="#e76f51" stroke-width="3" fill="none"/>');
  parts.push('<path d="M818,340 Q798,318 782,322 Q798,330 810,344" stroke="#f4a261" stroke-width="3" fill="none"/>');
  parts.push('</g>');

  /* The fish: Real cartoon sprites swimming along DoTween smooth Catmull-Rom splines */
  featuredFish.forEach((f, i) => {
    const track = tracks[i];
    if (!track || track.length < 3) return;
    const d = loopPathFrom(track);
    const transforms = bakeFishTransforms(track, i);
    const op = f.dormant ? 0.72 : 0.98;
    const filt = f.dormant ? 'glow-dormant' : 'shadow';
    const spriteKey = f.sprite || 'clownfish';
    const meta = SPRITE_META[spriteKey] || { w: 72, h: 54 };
    const spec = CLASS_SCALE[spriteKey] || { baseW: 22, maxW: 26 };
    // Exact sizing by class
    const drawW = spec.baseW || 22;
    const drawH = Math.round(drawW * (meta.h / meta.w));

    // Outer container: path translation only
    parts.push('<g opacity="' + op + '" filter="url(#' + filt + ')">');
    parts.push('<animateMotion dur="' + dur + '" repeatCount="indefinite" path="' + d + '"/>');
    // Middle container: discrete scale flip (calcMode="discrete", NEVER passing through 0)
    parts.push('<g>');
    parts.push('<animateTransform attributeName="transform" type="scale" dur="' + dur +
               '" repeatCount="indefinite" values="' + transforms.scaleValues +
               '" keyTimes="' + transforms.keyTimes + '" calcMode="discrete"/>');
    // Inner container: subtle pitch tilt & breathing wiggle (clamped [-8?, 8?])
    parts.push('<g>');
    parts.push('<animateTransform attributeName="transform" type="rotate" dur="' + dur +
               '" repeatCount="indefinite" values="' + transforms.angleValues +
               '" keyTimes="' + transforms.keyTimes + '" calcMode="linear"/>');
    parts.push('<use href="#sp_' + spriteKey + '" x="' + (-drawW / 2) + '" y="' + (-drawH / 2) +
               '" width="' + drawW + '" height="' + drawH + '"/>');
    const commitText = f.commits ? (' ? ' + f.commits + ' commits') : '';
    parts.push('<title>' + esc(f.name) + ' ? ' + esc(f.species || spriteKey) + ' ? ' + esc(f.lang) + commitText + ' ? ' + f.stars + '?</title>');
    parts.push('</g>');
    parts.push('</g>');
    parts.push('</g>');
  });

  const caption = data.offline
    ? 'offline sample data'
    : data.publicRepos + ' repos ? ' + data.followers + ' followers ? ' +
      featuredFish.length + ' featured creatures ? abyssal boids';
  parts.push('<text x="16" y="' + (H - 14) + '" font-family="ui-monospace,Menlo,Consolas,monospace" ' +
             'font-size="11" fill="#7fd8ff" opacity="0.65">' + esc(caption) + '</text>');
  parts.push('<text x="' + (W - 16) + '" y="' + (H - 14) + '" text-anchor="end" ' +
             'font-family="ui-monospace,Menlo,Consolas,monospace" font-size="11" ' +
             'fill="#7fd8ff" opacity="0.40">ABYSSAL</text>');

  parts.push('</svg>');
  return parts.join('');
}

async function main() {
  const user = process.argv[2] || process.env.GH_USER || 'shaikowannasleep';
  let data;
  try {
    data = await fetchProfile(user);
    console.log('fetched ' + data.fish.length + ' repos for ' + user);
  } catch (e) {
    console.error('warn: ' + e.message);
    console.error('falling back to sample data so the build still succeeds');
    data = fallback(user);
  }

  // Directed composition: select 14-16 featured creatures
  const featuredFish = selectDirectedSchool(data.fish);
  console.log('Selected ' + featuredFish.length + ' featured creatures across 5 depth zones');

  const tracks = simulate(featuredFish);
  const svg = buildSvg(data, featuredFish, tracks);

  const rootDir = path.resolve(__dirname, '..');
  const isSubApp = path.basename(rootDir) === 'aquarium';
  const projectRoot = isSubApp ? path.resolve(rootDir, '../..') : rootDir;

  const targets = [
    path.join(projectRoot, 'docs/aquarium.svg'),
    path.join(projectRoot, 'docs/apps/aquarium/aquarium.svg'),
    path.join(projectRoot, 'apps/aquarium/docs/aquarium.svg')
  ];

  targets.forEach(t => {
    fs.mkdirSync(path.dirname(t), { recursive: true });
    fs.writeFileSync(t, svg);
    console.log(t + '  ' + (Buffer.byteLength(svg) / 1024).toFixed(1) + ' KB');
  });

  console.log('featured fish: ' + featuredFish.length + '  keyframes/fish: ' + tracks[0].length);
}

if (require.main === module) main();
module.exports = { simulate, buildSvg, loopPathFrom, selectDirectedSchool };
