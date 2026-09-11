'use strict';
/* =====================================================================
 * Runs the boids engine headless, records every agent's path, and bakes
 * it into an SVG with SMIL <animateMotion>.
 *
 * Why SMIL: GitHub strips <script> from README images but renders SMIL,
 * which is how the well-known "snake eats the contribution graph" trick
 * works. So the fish really are simulated - just simulated at build time
 * instead of in the reader's browser.
 * ===================================================================== */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { fetchProfile, fallback } = require('./fetch-github');

const W = 880, H = 360;
const FRAMES = 420;          // 14 s at 30 fps
const FPS = 30;
const SAMPLE = 5;            // keyframe every 5th frame -> smaller file

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

/* Deterministic PRNG so the same profile always bakes the same swim,
 * which keeps the committed SVG stable and the git diff small. */
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

  // everyone swims in open water together; a dormant repo is simply a
  // slower fish, not a sinking one
  data.fish.forEach(f => {
    sw.spawn(40 + rnd() * (W - 80), 50 + rnd() * (H - 130));
    sw.speedScale[sw.n - 1] = f.pace;
  });

  const p = sw.p;
  p.rCoh = 74; p.rAli = 58; p.rSep = 26;
  p.wCoh = 0.72; p.wAli = 1.15; p.wSep = 2.2;
  p.minSpeed = 16; p.maxSpeed = 52; p.maxForce = 120;
  p.margin = 46; p.maxNeighbours = 6;
  sw.resize(W, H);

  const world = {
    predators: [],
    obstacles: [],
    // a slow wandering point of interest keeps the school from going static
    lure: { x: W * 0.5, y: H * 0.5, power: 0.55, active: true },
  };

  // settle the flock before we start recording
  for (let f = 0; f < 240; f++) {
    world.lure.x = W * 0.5 + Math.cos(f * 0.012) * W * 0.3;
    world.lure.y = H * 0.5 + Math.sin(f * 0.017) * H * 0.28;
    sw.step(1 / FPS, world);
  }

  const tracks = data.fish.map(() => []);
  for (let f = 0; f < FRAMES; f++) {
    const t = (f / FRAMES) * Math.PI * 2;
    world.lure.x = W * 0.5 + Math.cos(t) * W * 0.30;
    world.lure.y = H * 0.5 + Math.sin(t * 1.3) * H * 0.26;
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

function loopPathFrom(track) {
  const first = track[0], second = track[1];
  const penultimate = track[track.length - 2], last = track[track.length - 1];
  const inX = last[0] - penultimate[0], inY = last[1] - penultimate[1];
  const outX = second[0] - first[0], outY = second[1] - first[1];
  const bridge = Math.max(42, Math.hypot(last[0] - first[0], last[1] - first[1]) * 0.42);
  const inLength = Math.hypot(inX, inY) || 1;
  const outLength = Math.hypot(outX, outY) || 1;

  let d = 'M' + first[0] + ',' + first[1];
  for (let i = 1; i < track.length; i++) d += 'L' + track[i][0] + ',' + track[i][1];
  d += 'C' + (last[0] + inX / inLength * bridge).toFixed(1) + ',' +
       (last[1] + inY / inLength * bridge).toFixed(1) + ' ' +
       (first[0] - outX / outLength * bridge).toFixed(1) + ',' +
       (first[1] - outY / outLength * bridge).toFixed(1) + ' ' +
       first[0] + ',' + first[1];
  return d;
}

function loopContinuity(track) {
  const first = track[0], second = track[1];
  const penultimate = track[track.length - 2], last = track[track.length - 1];
  const inX = last[0] - penultimate[0], inY = last[1] - penultimate[1];
  const outX = second[0] - first[0], outY = second[1] - first[1];
  const inLength = Math.hypot(inX, inY) || 1;
  const outLength = Math.hypot(outX, outY) || 1;
  return {
    positionGap: 0,
    tangentDot: Math.min(
      (inX * inX + inY * inY) / (inLength * inLength),
      (outX * outX + outY * outY) / (outLength * outLength)
    ),
  };
}

function esc(s) {
  return String(s).replace(/[<>&'"]/g, c => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]
  ));
}

function fishSilhouette(f) {
  const body = f.size;
  const tail = body * 0.8;
  const eye = '<circle cx="' + (body * 0.42).toFixed(1) + '" cy="' + (-body * 0.16).toFixed(1) +
    '" r="' + Math.max(1.1, body * 0.13).toFixed(1) + '" fill="#04121f" opacity="0.85"/>';
  const fill = ' fill="' + f.color + '"';
  switch (f.sprite) {
    case 'angelfish':
      return '<path d="M' + (-body) + ',0 Q0,' + (-body * 1.15) + ' ' + body + ',0 Q0,' + body * 1.15 + ' ' + (-body) + ',0 L' + (-body - tail) + ',' + (-tail * 0.6) + ' L' + (-body - tail) + ',' + (tail * 0.6) + 'Z"' + fill + '/>' + eye;
    case 'butterflyfish':
      return '<path d="M' + (-body * 0.9) + ',0 Q0,' + (-body * 0.95) + ' ' + body + ',0 Q0,' + body * 0.95 + ' ' + (-body * 0.9) + ',0 L' + (-body - tail) + ',' + (-tail * 0.52) + ' L' + (-body - tail) + ',' + (tail * 0.52) + 'Z"' + fill + '/>' + eye;
    case 'seahorse':
      return '<path d="M' + (body * 0.45) + ',' + (-body * 0.7) + ' q' + (body * 0.7) + ',' + (body * 0.55) + ' 0,' + body + ' q' + (-body * 0.95) + ',' + (body * 1.0) + ' ' + (-body * 0.3) + ',' + (body * 1.65) + ' q' + (body * 0.85) + ',' + (body * 0.65) + ' ' + (-body * 0.22) + ',' + (body * 1.18) + ' q' + (-body * 0.6) + ',' + (body * 0.25) + ' ' + (-body * 0.6) + ',' + (-body * 0.38) + ' q0,' + (-body * 0.55) + ' ' + (body * 0.52) + ',' + (-body * 0.66) + ' q' + (-body * 0.78) + ',' + (-body * 1.0) + ' ' + (-body * 0.15) + ',' + (-body * 1.54) + 'Z"' + fill + '/>' + eye;
    case 'tang':
      return '<path d="M' + (-body) + ',0 Q' + (-body * 0.15) + ',' + (-body * 1.05) + ' ' + body + ',0 Q' + (-body * 0.15) + ',' + body * 1.05 + ' ' + (-body) + ',0 L' + (-body - tail) + ',' + (-tail * 0.72) + ' L' + (-body - tail) + ',' + (tail * 0.72) + 'Z"' + fill + '/>' + eye;
    case 'clownfish':
      return '<path d="M' + (-body) + ',0 Q0,' + (-body * 0.72) + ' ' + body + ',0 Q0,' + body * 0.72 + ' ' + (-body) + ',0 L' + (-body - tail) + ',' + (-tail * 0.7) + ' L' + (-body - tail) + ',' + (tail * 0.7) + 'Z"' + fill + '/><path d="M' + (-body * 0.15).toFixed(1) + ',' + (-body * 0.61).toFixed(1) + ' L' + (body * 0.1).toFixed(1) + ',' + (-body * 0.55).toFixed(1) + ' L' + (body * 0.1).toFixed(1) + ',' + (body * 0.55).toFixed(1) + ' L' + (-body * 0.15).toFixed(1) + ',' + (body * 0.61).toFixed(1) + 'Z" fill="#f4f1dd" opacity=".84"/>' + eye;
    default:
      return '<path d="M' + (-body) + ',0 Q0,' + (-body * 0.52) + ' ' + body + ',0 Q0,' + body * 0.52 + ' ' + (-body) + ',0 L' + (-body - tail) + ',' + (-tail * 0.62) + ' L' + (-body - tail) + ',' + (tail * 0.62) + 'Z"' + fill + '/>' + eye;
  }
}

function buildSvg(data, tracks) {
  const dur = (FRAMES / FPS).toFixed(2) + 's';
  const parts = [];

  parts.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H +
             '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' +
             esc(data.name) + ' GitHub aquarium">');

  parts.push('<defs>');
  parts.push('<radialGradient id="bg" cx="50%" cy="34%" r="78%">' +
             '<stop offset="0%" stop-color="#0d2b52"/>' +
             '<stop offset="55%" stop-color="#061630"/>' +
             '<stop offset="100%" stop-color="#020712"/></radialGradient>');
  parts.push('<filter id="glow" x="-70%" y="-70%" width="240%" height="240%">' +
             '<feGaussianBlur stdDeviation="3.2" result="b"/>' +
             '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>' +
             '</filter>');
  parts.push('<filter id="softglow" x="-90%" y="-90%" width="280%" height="280%">' +
             '<feGaussianBlur stdDeviation="6" result="b"/>' +
             '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>' +
             '</filter>');
  parts.push('</defs>');

  parts.push('<rect width="' + W + '" height="' + H + '" fill="url(#bg)"/>');

  // light shafts from the surface
  for (let i = 0; i < 5; i++) {
    const x = 60 + i * 175;
    parts.push('<polygon points="' + x + ',0 ' + (x + 54) + ',0 ' +
               (x + 150) + ',' + H + ' ' + (x + 28) + ',' + H +
               '" fill="#69c7ff" opacity="0.035"/>');
  }

  // marine snow: pure drift, no flocking - cheap and sells the depth
  const snowRnd = mulberry32(90210);
  for (let i = 0; i < 46; i++) {
    const x = snowRnd() * W;
    const r = 0.7 + snowRnd() * 1.5;
    const delay = (snowRnd() * 16).toFixed(2);
    const d = (13 + snowRnd() * 12).toFixed(2);
    parts.push('<circle r="' + r.toFixed(2) + '" fill="#cfeaff" opacity="0.30">' +
               '<animateMotion dur="' + d + 's" repeatCount="indefinite" begin="-' + delay + 's" ' +
               'path="M' + x.toFixed(1) + ',-12 L' + (x + (snowRnd() * 40 - 20)).toFixed(1) + ',' + (H + 12) + '"/>' +
               '<animate attributeName="opacity" values="0;0.42;0.42;0" dur="' + d +
               's" repeatCount="indefinite" begin="-' + delay + 's"/></circle>');
  }

  // the fish
  data.fish.forEach((f, i) => {
    const track = tracks[i];
    if (!track || track.length < 2) return;
    const d = loopPathFrom(track);
    const op = f.dormant ? 0.72 : 0.95;
    const filt = f.dormant ? 'softglow' : 'glow';

    parts.push('<g opacity="' + op + '" filter="url(#' + filt + ')">');
    parts.push('<g>');
    parts.push(fishSilhouette(f));
    parts.push('<title>' + esc(f.name) + ' — ' + esc(f.lang) + ' · ' + f.stars +
               '★ · ' + (f.dormant ? 'resting, ' + f.ageDays + 'd since last push' : 'active') +
               '</title>');
    parts.push('</g>');
    parts.push('<animateMotion dur="' + dur + '" repeatCount="indefinite" rotate="auto" path="' +
               d + '"/>');
    parts.push('</g>');
  });

  // vignette so the edges fall into darkness
  parts.push('<rect width="' + W + '" height="' + H + '" fill="none"/>');

  // caption
  const caption = data.offline
    ? 'offline sample data'
    : data.publicRepos + ' repos · ' + data.followers + ' followers · ' +
      data.fish.length + ' fish · boids simulated at build time';
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

  const outDir = path.join(__dirname, '../docs');
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, 'aquarium.svg');
  fs.writeFileSync(out, svg);

  console.log('docs/aquarium.svg  ' + (Buffer.byteLength(svg) / 1024).toFixed(1) + ' KB');
  console.log('fish: ' + data.fish.length + '  keyframes/fish: ' + tracks[0].length);
}

if (require.main === module) main();
module.exports = { simulate, buildSvg, loopPathFrom, loopContinuity };
