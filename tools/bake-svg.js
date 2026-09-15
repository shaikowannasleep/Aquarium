'use strict';
/* =====================================================================
 * Runs the boids engine headless, records every agent's path, and bakes
 * it into an SVG with SMIL <animateMotion> and cubic spline interpolation.
 * Uses the authentic high-resolution cartoon sprites embedded as Base64.
 * ===================================================================== */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { fetchProfile, fallback } = require('./fetch-github');

const W = 880, H = 360;
const FRAMES = 420;          // 14 s at 30 fps
const FPS = 30;
const SAMPLE = 4;            // 105 samples for buttery smooth motion

const SPRITE_META = {"blue_shark": {"w": 105, "h": 76}, "spotted_shark": {"w": 92, "h": 60}, "orca": {"w": 100, "h": 74}, "blue_dolphin": {"w": 98, "h": 73}, "pink_dolphin": {"w": 100, "h": 70}, "blue_whale": {"w": 103, "h": 88}, "beluga": {"w": 103, "h": 59}, "stingray": {"w": 96, "h": 68}, "spotted_ray": {"w": 88, "h": 73}, "swordfish": {"w": 106, "h": 69}, "clownfish": {"w": 96, "h": 70}, "blue_tang": {"w": 92, "h": 65}, "yellow_tang": {"w": 91, "h": 72}, "purple_fish": {"w": 92, "h": 66}, "flame_angelfish": {"w": 93, "h": 72}, "moorish_idol": {"w": 81, "h": 77}, "damselfish": {"w": 92, "h": 73}, "butterflyfish": {"w": 92, "h": 75}, "striped_angelfish": {"w": 88, "h": 83}, "lionfish": {"w": 99, "h": 93}, "green_turtle": {"w": 101, "h": 75}, "brown_turtle": {"w": 101, "h": 69}, "green_pufferfish": {"w": 90, "h": 84}, "orange_pufferfish": {"w": 87, "h": 80}, "blue_porcupinefish": {"w": 89, "h": 72}, "orange_seahorse": {"w": 66, "h": 100}, "pink_seahorse": {"w": 62, "h": 97}, "red_octopus": {"w": 108, "h": 95}, "pink_squid": {"w": 82, "h": 98}, "moray_eel": {"w": 101, "h": 61}, "red_lobster": {"w": 100, "h": 93}, "red_crab": {"w": 96, "h": 79}, "mantis_shrimp": {"w": 97, "h": 77}, "blue_jellyfish": {"w": 80, "h": 101}, "pink_jellyfish": {"w": 83, "h": 97}, "sea_anemone": {"w": 104, "h": 87}, "sea_urchin": {"w": 88, "h": 83}, "orange_starfish": {"w": 91, "h": 84}, "blue_starfish": {"w": 88, "h": 83}, "sea_cucumber": {"w": 96, "h": 54}, "pink_clam": {"w": 89, "h": 85}, "brown_clam": {"w": 89, "h": 83}, "banded_shrimp": {"w": 105, "h": 89}, "orange_shrimp": {"w": 90, "h": 85}, "yellow_striped_fish": {"w": 91, "h": 73}, "parrotfish": {"w": 93, "h": 74}, "cyan_fish": {"w": 98, "h": 68}, "pink_fish": {"w": 94, "h": 80}, "multicolor_fish": {"w": 92, "h": 82}, "violet_fish": {"w": 89, "h": 77}, "grey_shark": {"w": 99, "h": 77}, "hammerhead_shark": {"w": 104, "h": 72}, "whale_shark": {"w": 108, "h": 73}, "killer_whale": {"w": 97, "h": 77}, "dolphin": {"w": 92, "h": 75}, "beluga_whale": {"w": 103, "h": 72}, "blue_whale_v2": {"w": 112, "h": 65}, "humpback_whale": {"w": 103, "h": 74}, "narwhal": {"w": 119, "h": 87}, "manta_ray": {"w": 97, "h": 70}, "electric_ray": {"w": 93, "h": 71}, "spotted_eagle_ray": {"w": 99, "h": 78}, "sawfish": {"w": 137, "h": 70}, "spotted_moray": {"w": 96, "h": 77}, "electric_eel": {"w": 106, "h": 51}, "octopus_v2": {"w": 96, "h": 87}, "blue_ringed_octopus": {"w": 87, "h": 75}, "squid_v2": {"w": 81, "h": 90}, "cuttlefish": {"w": 111, "h": 70}, "nautilus": {"w": 74, "h": 76}, "yellow_pufferfish": {"w": 86, "h": 77}, "spiny_pufferfish": {"w": 88, "h": 83}, "clownfish_v2": {"w": 98, "h": 74}, "blue_tang_v2": {"w": 94, "h": 71}, "yellow_tang_v2": {"w": 90, "h": 75}, "angelfish_v2": {"w": 91, "h": 86}, "butterflyfish_v2": {"w": 91, "h": 71}, "lionfish_v2": {"w": 90, "h": 87}, "rainbow_fish": {"w": 96, "h": 73}, "black_triggerfish": {"w": 90, "h": 78}, "seahorse_v2": {"w": 52, "h": 89}, "green_turtle_v2": {"w": 111, "h": 72}, "leatherback_turtle": {"w": 117, "h": 85}, "spiny_lobster": {"w": 92, "h": 91}, "king_prawn": {"w": 114, "h": 91}, "hermit_crab": {"w": 90, "h": 76}, "shore_crab": {"w": 95, "h": 79}, "blue_crab": {"w": 107, "h": 82}, "mantis_shrimp_v2": {"w": 93, "h": 70}, "horseshoe_crab": {"w": 93, "h": 84}, "pink_jellyfish_v2": {"w": 84, "h": 94}, "blue_jellyfish_v2": {"w": 86, "h": 95}, "moon_jellyfish": {"w": 78, "h": 88}, "red_anemone": {"w": 93, "h": 85}, "starfish_v2": {"w": 85, "h": 80}, "purple_urchin": {"w": 93, "h": 82}, "sea_cucumber_v2": {"w": 96, "h": 64}, "giant_clam": {"w": 108, "h": 74}, "cleaner_shrimp": {"w": 106, "h": 91}, "peppermint_shrimp": {"w": 97, "h": 92}};

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

function simulate(data) {
  const SwarmEngine = loadEngine();
  const rnd = mulberry32(
    data.fish.reduce((h, f) => (h * 31 + f.name.length + f.stars) | 0, 7)
  );
  const origRandom = Math.random;
  Math.random = rnd;

  const n = data.fish.length;
  const sw = new SwarmEngine(Math.max(n, 8), W, H);

  data.fish.forEach((f, idx) => {
    const gid = f.groupId !== undefined ? f.groupId : (idx % 8);
    sw.spawn(50 + rnd() * (W - 100), 50 + rnd() * (H - 120), undefined, gid);
    sw.speedScale[sw.n - 1] = f.pace;
  });

  const p = sw.p;
  p.rCoh = 90; p.rAli = 70; p.rSep = 26;
  p.wCoh = 0.82; p.wAli = 1.30; p.wSep = 2.1;
  p.minSpeed = 22; p.maxSpeed = 58; p.maxForce = 140;
  p.margin = 52; p.maxNeighbours = 7;
  sw.resize(W, H);

  const world = {
    predators: [],
    obstacles: [],
    lure: { x: W * 0.5, y: H * 0.5, power: 0.85, active: true },
  };

  // settle the flock before recording
  for (let f = 0; f < 200; f++) {
    world.lure.x = W * 0.5 + Math.cos(f * 0.015) * W * 0.32;
    world.lure.y = H * 0.5 + Math.sin(f * 0.018) * H * 0.28;
    sw.step(1 / FPS, world);
  }

  const tracks = data.fish.map(() => []);
  for (let f = 0; f < FRAMES; f++) {
    const t = (f / FRAMES) * Math.PI * 2;
    world.lure.x = W * 0.5 + Math.cos(t) * W * 0.32;
    world.lure.y = H * 0.5 + Math.sin(t * 1.4) * H * 0.26;
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

/* Catmull-Rom to Cubic B?zier conversion for mathematically smooth C1 path */
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

/* DoTween style smoothed facing & pitch calculations */
function bakeFishTransforms(track, phaseOffset) {
  const n = track.length;
  const rawScales = [];
  const rawAngles = [];

  // Default sprite orientation is facing LEFT (facing = 1)
  // When swimming left: scaleX = 1 (faces left)
  // When swimming right: scaleX = -1 (horizontally mirrored to face right)
  let facing = 1;

  for (let i = 0; i < n; i++) {
    const prev = track[(i - 1 + n) % n];
    const next = track[(i + 1) % n];
    const vx = next[0] - prev[0];
    const vy = next[1] - prev[1];

    // Hysteresis threshold to prevent flickering when swimming vertically
    if (vx < -0.3) {
      facing = 1;  // swimming left -> keep default left-facing sprite
    } else if (vx > 0.3) {
      facing = -1; // swimming right -> mirror horizontally to face right
    }
    rawScales.push(facing);

    // Natural swimming pitch: head tilts up when swimming up (vy < 0 in SVG), tilts down when swimming down (vy > 0)
    const pitchRad = Math.atan2(-vy, Math.abs(vx) || 1);
    const pitchDeg = Math.max(-14, Math.min(14, pitchRad * (180 / Math.PI) * 0.55));
    const wiggleDeg = Math.sin((i / n) * Math.PI * 6 + (phaseOffset || 0)) * 2.8;
    rawAngles.push(pitchDeg + wiggleDeg);
  }

  const smoothedScaleStrs = new Array(n);
  const smoothedAngleStrs = new Array(n);
  let curScale = rawScales[0];
  let curAngle = rawAngles[0];

  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < n; i++) {
      curScale += (rawScales[i] - curScale) * 0.35;
      curAngle += (rawAngles[i] - curAngle) * 0.45;
      if (pass === 2) {
        let sx = Math.round(curScale * 100) / 100;
        // Avoid singular matrix at sx = 0
        if (Math.abs(sx) < 0.08) sx = Math.sign(sx || 1) * 0.08;
        // CRITICAL FIX: Explicit 2D scale with sy STRICTLY 1!
        // Prevents SVG SMIL from parsing -1 as scale(-1, -1) which turns fish upside down 180?!
        smoothedScaleStrs[i] = sx.toFixed(2) + ' 1';
        smoothedAngleStrs[i] = (Math.round(curAngle * 10) / 10).toFixed(1);
      }
    }
  }

  // Seamless loop wrap-around
  smoothedScaleStrs[n - 1] = smoothedScaleStrs[0];
  smoothedAngleStrs[n - 1] = smoothedAngleStrs[0];

  const keyTimes = [];
  for (let i = 0; i < n; i++) {
    keyTimes.push((i / (n - 1)).toFixed(3));
  }

  return {
    scaleValues: smoothedScaleStrs.join(';'),
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

function buildSvg(data, tracks) {
  const dur = (FRAMES / FPS).toFixed(2) + 's';
  const parts = [];

  parts.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H +
             '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' +
             esc(data.name) + ' GitHub aquarium">');

  parts.push('<defs>');
  /* Enhanced deep ocean gradient */
  parts.push('<radialGradient id="bg" cx="50%" cy="18%" r="82%">' +
             '<stop offset="0%" stop-color="#1a8aaa"/>' +
             '<stop offset="18%" stop-color="#0e5f82"/>' +
             '<stop offset="45%" stop-color="#08375a"/>' +
             '<stop offset="75%" stop-color="#041e3a"/>' +
             '<stop offset="100%" stop-color="#020c1e"/></radialGradient>');
  /* Surface gradient */
  parts.push('<linearGradient id="surface" x1="0" x2="0" y1="0" y2="1">' +
             '<stop offset="0%" stop-color="#c8f8ff" stop-opacity=".55"/>' +
             '<stop offset="30%" stop-color="#82e1f5" stop-opacity=".32"/>' +
             '<stop offset="70%" stop-color="#3cb4d7" stop-opacity=".12"/>' +
             '<stop offset="100%" stop-color="#1e78aa" stop-opacity="0"/></linearGradient>');
  /* God ray gradient */
  parts.push('<linearGradient id="ray" x1="0" x2="0" y1="0" y2="1">' +
             '<stop offset="0%" stop-color="#b4ebff" stop-opacity=".08"/>' +
             '<stop offset="15%" stop-color="#78d2f0" stop-opacity=".05"/>' +
             '<stop offset="50%" stop-color="#46aae0" stop-opacity=".025"/>' +
             '<stop offset="100%" stop-color="#1e64a0" stop-opacity="0"/></linearGradient>');
  /* Floor gradient */
  parts.push('<linearGradient id="floor" x1="0" x2="0" y1="0" y2="1">' +
             '<stop offset="0%" stop-color="#143c50" stop-opacity="0"/>' +
             '<stop offset="30%" stop-color="#123241" stop-opacity=".15"/>' +
             '<stop offset="100%" stop-color="#0c2332" stop-opacity=".3"/></linearGradient>');
  parts.push('<filter id="glow" x="-50%" y="-50%" width="200%" height="200%">' +
             '<feGaussianBlur stdDeviation="3.5" result="b"/>' +
             '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>' +
             '</filter>');
  parts.push('<filter id="softglow" x="-60%" y="-60%" width="220%" height="220%">' +
             '<feGaussianBlur stdDeviation="6" result="b"/>' +
             '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>' +
             '</filter>');

  /* Embed Base64 sprite assets for each unique species in the school */
  const uniqueSprites = new Set(data.fish.map(f => f.sprite || 'clownfish'));
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
  for (let i = 0; i < 8; i++) {
    const x = 40 + i * 108 + Math.floor((rayRnd() - 0.5) * 40);
    const topW = 25 + Math.floor(rayRnd() * 45);
    const bottomW = 70 + Math.floor(rayRnd() * 140);
    const baseAlpha = (0.02 + rayRnd() * 0.04).toFixed(3);
    const maxAlpha = (parseFloat(baseAlpha) * 2.2).toFixed(3);
    const animDur = (12 + rayRnd() * 16).toFixed(1);
    parts.push('<polygon points="' + (x - topW/2) + ',0 ' + (x + topW/2) + ',0 ' +
               (x + bottomW/2) + ',' + H + ' ' + (x - bottomW/2) + ',' + H +
               '" fill="url(#ray)">' +
               '<animate attributeName="opacity" values="' + baseAlpha + ';' + maxAlpha + ';' + baseAlpha +
               '" dur="' + animDur + 's" repeatCount="indefinite"/></polygon>');
  }

  /* Surface waves */
  parts.push('<rect width="' + W + '" height="55" fill="url(#surface)"/>');
  for (let wave = 0; wave < 3; wave++) {
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
    parts.push('<path d="' + d1 + '" fill="none" stroke="rgba(180,240,255,' + (0.28 - wave * 0.08) +
               ')" stroke-width="' + (2.0 - wave * 0.4) + '">' +
               '<animate attributeName="d" dur="' + animDur + '" repeatCount="indefinite" values="' +
               d1 + ';' + d2 + ';' + d1 + '"/></path>');
  }

  /* Sandy floor */
  parts.push('<rect y="' + (H - 45) + '" width="' + W + '" height="45" fill="url(#floor)"/>');

  /* The fish: Real cartoon sprites swimming along DoTween smooth Catmull-Rom splines */
  data.fish.forEach((f, i) => {
    const track = tracks[i];
    if (!track || track.length < 3) return;
    const d = loopPathFrom(track);
    const transforms = bakeFishTransforms(track, i);
    const op = f.dormant ? 0.76 : 0.98;
    const filt = f.dormant ? 'softglow' : 'glow';
    const spriteKey = f.sprite || 'clownfish';
    const meta = SPRITE_META[spriteKey] || { w: 72, h: 54 };
    // Balanced, comfortable size (22px - 36px) to avoid crowding or ballooning
    const drawW = Math.round(18 + Math.min(f.size * 1.5, 18));
    const drawH = Math.round(drawW * (meta.h / meta.w));

    // Outer container: path translation only
    parts.push('<g opacity="' + op + '" filter="url(#' + filt + ')">');
    parts.push('<animateMotion dur="' + dur + '" repeatCount="indefinite" path="' + d + '"/>');
    // Middle container: horizontal facing only (X-axis flip, Y locked to 1, NO additive sum)
    parts.push('<g>');
    parts.push('<animateTransform attributeName="transform" type="scale" dur="' + dur +
               '" repeatCount="indefinite" values="' + transforms.scaleValues +
               '" keyTimes="' + transforms.keyTimes + '" calcMode="linear"/>');
    // Inner container: pitch tilt & swimming wiggle around fish center (NO additive sum)
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
      data.fish.length + ' fish ? smooth boids bakes';
  parts.push('<text x="16" y="' + (H - 14) + '" font-family="ui-monospace,Menlo,Consolas,monospace" ' +
             'font-size="11" fill="#7fd8ff" opacity="0.55">' + esc(caption) + '</text>');
  parts.push('<text x="' + (W - 16) + '" y="' + (H - 14) + '" text-anchor="end" ' +
             'font-family="ui-monospace,Menlo,Consolas,monospace" font-size="11" ' +
             'fill="#7fd8ff" opacity="0.35">ABYSSAL</text>');

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

  const tracks = simulate(data);
  const svg = buildSvg(data, tracks);

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

  console.log('fish: ' + data.fish.length + '  keyframes/fish: ' + tracks[0].length);
}

if (require.main === module) main();
module.exports = { simulate, buildSvg, loopPathFrom };
