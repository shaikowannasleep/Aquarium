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

/* ---------------------------------------------------------------------
 * 2.5D shading, in vector.
 *
 * Bitmap sprites were the obvious idea and the wrong one: GitHub only
 * renders SVG in a README, animateMotion rotate="auto" would smear a
 * raster, and one PNG per language colour does not scale. So depth comes
 * from layering instead - a lit dorsal gradient, a shadowed belly, a
 * translucent fin over the body, a specular highlight and a contact
 * shadow underneath. Same trick a 2.5D game uses, no pixels involved.
 * ------------------------------------------------------------------- */

/* Shift a hex colour toward white or black. Used to derive the lit and
 * shaded tones from whatever colour the repository's language gave us,
 * so every fish stays on-palette without a hand-picked ramp. */
function shade(hex, amt) {
  const h = hex.replace('#', '');
  const n = h.length === 3
    ? h.split('').map(c => parseInt(c + c, 16))
    : [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  const mix = amt > 0 ? 255 : 0;
  const t = Math.abs(amt);
  return '#' + n.map(v => {
    const out = Math.round(v + (mix - v) * t);
    return Math.max(0, Math.min(255, out)).toString(16).padStart(2, '0');
  }).join('');
}

/* Per-fish gradients and the soft shadow that sells the volume. */
function fishDefs(f, id) {
  const lit = shade(f.color, 0.42);
  const dark = shade(f.color, -0.45);
  return '<linearGradient id="fb' + id + '" x1="0" y1="0" x2="0" y2="1">' +
           '<stop offset="0%" stop-color="' + lit + '"/>' +
           '<stop offset="42%" stop-color="' + f.color + '"/>' +
           '<stop offset="100%" stop-color="' + dark + '"/>' +
         '</linearGradient>' +
         '<linearGradient id="ff' + id + '" x1="0" y1="0" x2="1" y2="0">' +
           '<stop offset="0%" stop-color="' + lit + '" stop-opacity=".85"/>' +
           '<stop offset="100%" stop-color="' + f.color + '" stop-opacity=".35"/>' +
         '</linearGradient>';
}

function fishSilhouette(f, id) {
  const body = f.size;
  const tail = body * 0.8;
  const gid = id === undefined ? 0 : id;

  /* An eye with a catchlight reads as wet and alive; a flat dot does not. */
  const ex = body * 0.42, ey = -body * 0.16;
  const er = Math.max(1.2, body * 0.15);
  const eye =
    '<circle cx="' + ex.toFixed(1) + '" cy="' + ey.toFixed(1) + '" r="' + er.toFixed(1) +
      '" fill="#f2fbff" opacity=".92"/>' +
    '<circle cx="' + ex.toFixed(1) + '" cy="' + ey.toFixed(1) + '" r="' + (er * 0.62).toFixed(1) +
      '" fill="#06131f"/>' +
    '<circle cx="' + (ex + er * 0.3).toFixed(1) + '" cy="' + (ey - er * 0.32).toFixed(1) +
      '" r="' + (er * 0.26).toFixed(1) + '" fill="#ffffff" opacity=".95"/>';

  /* Contact shadow: a squashed ellipse under the belly, no blur filter -
   * filters are expensive when 29 of them animate at once. */
  const shadow = '<ellipse cx="' + (-body * 0.1).toFixed(1) + '" cy="' + (body * 0.62).toFixed(1) +
    '" rx="' + (body * 0.85).toFixed(1) + '" ry="' + (body * 0.2).toFixed(1) +
    '" fill="#010a14" opacity=".22"/>';

  /* Specular streak along the lit dorsal edge. */
  const gloss = '<ellipse cx="' + (body * 0.1).toFixed(1) + '" cy="' + (-body * 0.42).toFixed(1) +
    '" rx="' + (body * 0.5).toFixed(1) + '" ry="' + (body * 0.13).toFixed(1) +
    '" fill="#ffffff" opacity=".26"/>';

  /* Pectoral fin, translucent and slightly ahead of centre: this single
   * overlapping shape does most of the work of reading as 3D. */
  const pec = '<path d="M' + (body * 0.05).toFixed(1) + ',' + (body * 0.05).toFixed(1) +
    ' q' + (-body * 0.5).toFixed(1) + ',' + (body * 0.42).toFixed(1) + ' ' +
    (-body * 0.08).toFixed(1) + ',' + (body * 0.56).toFixed(1) +
    ' q' + (body * 0.3).toFixed(1) + ',' + (-body * 0.2).toFixed(1) + ' ' +
    (body * 0.12).toFixed(1) + ',' + (-body * 0.58).toFixed(1) + 'Z"' +
    ' fill="url(#ff' + gid + ')" opacity=".75"/>';

  const fill = ' fill="url(#fb' + gid + ')"';
  const extras = shadow;
  const overlay = gloss + pec + eye;
  switch (f.sprite) {
    case 'angelfish':
      return extras + '<path d="M' + (-body) + ',0 Q0,' + (-body * 1.15) + ' ' + body + ',0 Q0,' + body * 1.15 + ' ' + (-body) + ',0 L' + (-body - tail) + ',' + (-tail * 0.6) + ' L' + (-body - tail) + ',' + (tail * 0.6) + 'Z"' + fill + '/>' + overlay;
    case 'butterflyfish':
      return extras + '<path d="M' + (-body * 0.9) + ',0 Q0,' + (-body * 0.95) + ' ' + body + ',0 Q0,' + body * 0.95 + ' ' + (-body * 0.9) + ',0 L' + (-body - tail) + ',' + (-tail * 0.52) + ' L' + (-body - tail) + ',' + (tail * 0.52) + 'Z"' + fill + '/>' + overlay;
    case 'seahorse':
      return extras + '<path d="M' + (body * 0.45) + ',' + (-body * 0.7) + ' q' + (body * 0.7) + ',' + (body * 0.55) + ' 0,' + body + ' q' + (-body * 0.95) + ',' + (body * 1.0) + ' ' + (-body * 0.3) + ',' + (body * 1.65) + ' q' + (body * 0.85) + ',' + (body * 0.65) + ' ' + (-body * 0.22) + ',' + (body * 1.18) + ' q' + (-body * 0.6) + ',' + (body * 0.25) + ' ' + (-body * 0.6) + ',' + (-body * 0.38) + ' q0,' + (-body * 0.55) + ' ' + (body * 0.52) + ',' + (-body * 0.66) + ' q' + (-body * 0.78) + ',' + (-body * 1.0) + ' ' + (-body * 0.15) + ',' + (-body * 1.54) + 'Z"' + fill + '/>' + overlay;
    case 'tang':
      return extras + '<path d="M' + (-body) + ',0 Q' + (-body * 0.15) + ',' + (-body * 1.05) + ' ' + body + ',0 Q' + (-body * 0.15) + ',' + body * 1.05 + ' ' + (-body) + ',0 L' + (-body - tail) + ',' + (-tail * 0.72) + ' L' + (-body - tail) + ',' + (tail * 0.72) + 'Z"' + fill + '/>' + overlay;
    case 'clownfish':
      return extras + '<path d="M' + (-body) + ',0 Q0,' + (-body * 0.72) + ' ' + body + ',0 Q0,' + body * 0.72 + ' ' + (-body) + ',0 L' + (-body - tail) + ',' + (-tail * 0.7) + ' L' + (-body - tail) + ',' + (tail * 0.7) + 'Z"' + fill + '/><path d="M' + (-body * 0.15).toFixed(1) + ',' + (-body * 0.61).toFixed(1) + ' L' + (body * 0.1).toFixed(1) + ',' + (-body * 0.55).toFixed(1) + ' L' + (body * 0.1).toFixed(1) + ',' + (body * 0.55).toFixed(1) + ' L' + (-body * 0.15).toFixed(1) + ',' + (body * 0.61).toFixed(1) + 'Z" fill="#f4f1dd" opacity=".84"/>' + overlay;
    default:
      return extras + '<path d="M' + (-body) + ',0 Q0,' + (-body * 0.52) + ' ' + body + ',0 Q0,' + body * 0.52 + ' ' + (-body) + ',0 L' + (-body - tail) + ',' + (-tail * 0.62) + ' L' + (-body - tail) + ',' + (tail * 0.62) + 'Z"' + fill + '/>' + overlay;
  }
}

function buildSvg(data, tracks) {
  const dur = (FRAMES / FPS).toFixed(2) + 's';
  const parts = [];

  parts.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H +
             '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' +
             esc(data.name) + ' GitHub aquarium">');

  parts.push('<defs>');
  /* Enhanced deep ocean gradient — brighter top center */
  parts.push('<radialGradient id="bg" cx="50%" cy="18%" r="82%">' +
             '<stop offset="0%" stop-color="#1a8aaa"/>' +
             '<stop offset="18%" stop-color="#0e5f82"/>' +
             '<stop offset="45%" stop-color="#08375a"/>' +
             '<stop offset="75%" stop-color="#041e3a"/>' +
             '<stop offset="100%" stop-color="#020c1e"/></radialGradient>');
  /* Bright surface gradient */
  parts.push('<linearGradient id="surface" x1="0" x2="0" y1="0" y2="1">' +
             '<stop offset="0%" stop-color="#c8f8ff" stop-opacity=".55"/>' +
             '<stop offset="30%" stop-color="#82e1f5" stop-opacity=".32"/>' +
             '<stop offset="70%" stop-color="#3cb4d7" stop-opacity=".12"/>' +
             '<stop offset="100%" stop-color="#1e78aa" stop-opacity="0"/></linearGradient>');
  /* Seaweed gradients — multiple shades */
  parts.push('<linearGradient id="weed1" x1="0" x2="0" y1="1" y2="0">' +
             '<stop stop-color="#0a4a3a"/><stop offset=".5" stop-color="#1a7a50"/>' +
             '<stop offset="1" stop-color="#38c488"/></linearGradient>');
  parts.push('<linearGradient id="weed2" x1="0" x2="0" y1="1" y2="0">' +
             '<stop stop-color="#083a40"/><stop offset=".5" stop-color="#167060"/>' +
             '<stop offset="1" stop-color="#2aaa7a"/></linearGradient>');
  parts.push('<linearGradient id="weed3" x1="0" x2="0" y1="1" y2="0">' +
             '<stop stop-color="#064535"/><stop offset=".5" stop-color="#12804e"/>' +
             '<stop offset="1" stop-color="#30d890"/></linearGradient>');
  /* God ray gradient */
  parts.push('<linearGradient id="ray" x1="0" x2="0" y1="0" y2="1">' +
             '<stop offset="0%" stop-color="#b4ebff" stop-opacity=".08"/>' +
             '<stop offset="15%" stop-color="#78d2f0" stop-opacity=".05"/>' +
             '<stop offset="50%" stop-color="#46aae0" stop-opacity=".025"/>' +
             '<stop offset="100%" stop-color="#1e64a0" stop-opacity="0"/></linearGradient>');
  /* Floor caustic radial gradient */
  parts.push('<radialGradient id="caustic" cx="50%" cy="50%" r="50%">' +
             '<stop offset="0%" stop-color="#b4f0ff" stop-opacity=".06"/>' +
             '<stop offset="60%" stop-color="#64c8e6" stop-opacity=".02"/>' +
             '<stop offset="100%" stop-color="#3296c8" stop-opacity="0"/></radialGradient>');
  /* Floor gradient */
  parts.push('<linearGradient id="floor" x1="0" x2="0" y1="0" y2="1">' +
             '<stop offset="0%" stop-color="#143c50" stop-opacity="0"/>' +
             '<stop offset="30%" stop-color="#123241" stop-opacity=".15"/>' +
             '<stop offset="100%" stop-color="#0c2332" stop-opacity=".3"/></linearGradient>');
  parts.push('<filter id="glow" x="-70%" y="-70%" width="240%" height="240%">' +
             '<feGaussianBlur stdDeviation="3.2" result="b"/>' +
             '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>' +
             '</filter>');
  parts.push('<filter id="softglow" x="-90%" y="-90%" width="280%" height="280%">' +
             '<feGaussianBlur stdDeviation="6" result="b"/>' +
             '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>' +
             '</filter>');
  /* One body gradient and one fin gradient per fish, derived from its
   * language colour. Declared once here rather than inline, so the same
   * ramp is reused by every frame of that fish's animation. */
  data.fish.forEach((f, i) => parts.push(fishDefs(f, i)));

  parts.push('</defs>');

  /* Background */
  parts.push('<rect width="' + W + '" height="' + H + '" fill="url(#bg)"/>');

  /* God rays — volumetric light shafts with animated opacity */
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

  /* Bright water surface */
  parts.push('<rect width="' + W + '" height="55" fill="url(#surface)"/>');

  /* Surface wave lines — 3 animated waves */
  for (let wave = 0; wave < 3; wave++) {
    const yBase = 12 + wave * 10;
    const amp = 4 + wave * 2;
    const opacity = (0.38 - wave * 0.1).toFixed(2);
    const strokeW = (2.5 - wave * 0.6).toFixed(1);
    const animDur = (6 + wave * 2) + 's';
    // Build two wave states for animation
    let d1 = 'M0,' + yBase;
    let d2 = 'M0,' + yBase;
    for (let x = 0; x <= W; x += 55) {
      const y1 = yBase + Math.sin(x * 0.035) * amp;
      const y2 = yBase + Math.sin(x * 0.035 + Math.PI) * amp;
      d1 += ' L' + x + ',' + y1.toFixed(1);
      d2 += ' L' + x + ',' + y2.toFixed(1);
    }
    parts.push('<path d="' + d1 + '" fill="none" stroke="#d5fbff" stroke-opacity="' + opacity +
               '" stroke-width="' + strokeW + '">' +
               '<animate attributeName="d" dur="' + animDur + '" repeatCount="indefinite" values="' +
               d1 + ';' + d2 + ';' + d1 + '"/></path>');
  }

  /* Surface shimmer highlights */
  const shimmerRnd = mulberry32(5555);
  for (let i = 0; i < 12; i++) {
    const sx = Math.floor(shimmerRnd() * W);
    const sy = 4 + Math.floor(shimmerRnd() * 14);
    const rx = 5 + Math.floor(shimmerRnd() * 8);
    const dur = (3 + shimmerRnd() * 5).toFixed(1);
    parts.push('<ellipse cx="' + sx + '" cy="' + sy + '" rx="' + rx + '" ry="1.5" fill="#fff" opacity="0">' +
               '<animate attributeName="opacity" values="0;.15;0" dur="' + dur + 's" repeatCount="indefinite" begin="-' +
               (shimmerRnd() * 5).toFixed(1) + 's"/></ellipse>');
  }

  /* Caustic light patches on floor */
  const causticRnd = mulberry32(7777);
  for (let i = 0; i < 10; i++) {
    const cx = Math.floor(causticRnd() * W);
    const cy = Math.floor(H * 0.82 + causticRnd() * H * 0.18);
    const r = 15 + Math.floor(causticRnd() * 40);
    const dur = (6 + causticRnd() * 8).toFixed(1);
    parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="url(#caustic)">' +
               '<animate attributeName="opacity" values=".3;.8;.3" dur="' + dur + 's" repeatCount="indefinite" begin="-' +
               (causticRnd() * 6).toFixed(1) + 's"/>' +
               '<animate attributeName="r" values="' + r + ';' + (r + 8) + ';' + r + '" dur="' + (parseFloat(dur) + 2).toFixed(1) +
               's" repeatCount="indefinite"/></circle>');
  }

  /* Sandy floor */
  parts.push('<rect x="0" y="' + Math.floor(H * 0.88) + '" width="' + W + '" height="' + Math.ceil(H * 0.12) +
             '" fill="url(#floor)"/>');

  /* Coral, drawn before the weed so the weed reads as nearer the camera.
   * Depth here comes from the same trick as the fish: a lit crown, a
   * darker base, and a contact shadow where it meets the floor. */
  const coralRnd = mulberry32(8899);
  const coralPalette = [
    ['#ff7f9c', '#c23f68', '#7d1f42'],
    ['#ffa864', '#d86a34', '#8c3c1c'],
    ['#b98cff', '#7b52c8', '#472c7a'],
    ['#5fe0c8', '#2b9f92', '#145a56'],
  ];
  for (let i = 0; i < 7; i++) {
    const cx = 60 + i * Math.floor((W - 120) / 6) + Math.floor((coralRnd() - 0.5) * 40);
    const scale = 0.72 + coralRnd() * 0.7;
    const pal = coralPalette[(coralRnd() * coralPalette.length) | 0];
    const baseY = H - 4;
    const gid = 'cor' + i;

    parts.push('<linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
               '<stop offset="0%" stop-color="' + pal[0] + '"/>' +
               '<stop offset="55%" stop-color="' + pal[1] + '"/>' +
               '<stop offset="100%" stop-color="' + pal[2] + '"/></linearGradient>');

    // contact shadow on the sand
    parts.push('<ellipse cx="' + cx + '" cy="' + baseY + '" rx="' + (26 * scale).toFixed(1) +
               '" ry="' + (5 * scale).toFixed(1) + '" fill="#010a14" opacity=".3"/>');

    if (i % 3 === 0) {
      /* Brain coral: stacked domes with grooves. */
      const r = 20 * scale;
      parts.push('<ellipse cx="' + cx + '" cy="' + (baseY - r * 0.55).toFixed(1) +
                 '" rx="' + r.toFixed(1) + '" ry="' + (r * 0.72).toFixed(1) +
                 '" fill="url(#' + gid + ')" opacity=".9"/>');
      for (let k = 0; k < 4; k++) {
        const gy = baseY - r * 0.95 + k * r * 0.32;
        parts.push('<path d="M' + (cx - r * 0.78).toFixed(1) + ',' + gy.toFixed(1) +
                   ' q' + (r * 0.4).toFixed(1) + ',' + (-r * 0.2).toFixed(1) + ' ' +
                   (r * 0.78).toFixed(1) + ',0 q' + (r * 0.4).toFixed(1) + ',' +
                   (r * 0.2).toFixed(1) + ' ' + (r * 0.78).toFixed(1) + ',0"' +
                   ' fill="none" stroke="' + pal[2] + '" stroke-width="1.1" opacity=".45"/>');
      }
      parts.push('<ellipse cx="' + (cx - r * 0.28).toFixed(1) + '" cy="' + (baseY - r).toFixed(1) +
                 '" rx="' + (r * 0.4).toFixed(1) + '" ry="' + (r * 0.2).toFixed(1) +
                 '" fill="#ffffff" opacity=".2"/>');
    } else {
      /* Branching coral: a few tapering arms that drift very slightly. */
      const arms = 3 + ((coralRnd() * 3) | 0);
      const sway = (1.2 + coralRnd() * 1.4).toFixed(1);
      const dur = (5 + coralRnd() * 4).toFixed(1);
      let d = '';
      for (let a = 0; a < arms; a++) {
        const lean = (a - (arms - 1) / 2) * 9 * scale;
        const hgt = (26 + coralRnd() * 20) * scale;
        const w0 = 5.5 * scale;
        d += 'M' + (cx + lean - w0).toFixed(1) + ',' + baseY +
             ' Q' + (cx + lean * 1.5 - w0 * 0.4).toFixed(1) + ',' + (baseY - hgt * 0.6).toFixed(1) +
             ' ' + (cx + lean * 1.9).toFixed(1) + ',' + (baseY - hgt).toFixed(1) +
             ' Q' + (cx + lean * 1.5 + w0 * 0.4).toFixed(1) + ',' + (baseY - hgt * 0.6).toFixed(1) +
             ' ' + (cx + lean + w0).toFixed(1) + ',' + baseY + 'Z ';
      }
      parts.push('<path d="' + d.trim() + '" fill="url(#' + gid + ')" opacity=".88">' +
                 '<animateTransform attributeName="transform" type="rotate" values="' +
                 (-sway) + ' ' + cx + ' ' + baseY + ';' + sway + ' ' + cx + ' ' + baseY + ';' +
                 (-sway) + ' ' + cx + ' ' + baseY +
                 '" dur="' + dur + 's" repeatCount="indefinite"/></path>');
      // polyp tips catch the light
      for (let a = 0; a < arms; a++) {
        const lean = (a - (arms - 1) / 2) * 9 * scale;
        parts.push('<circle cx="' + (cx + lean * 1.9).toFixed(1) + '" cy="' +
                   (baseY - (26 + 10) * scale).toFixed(1) + '" r="' + (2.4 * scale).toFixed(1) +
                   '" fill="' + pal[0] + '" opacity=".5"/>');
      }
    }
  }

  /* Seaweed — lush multi-segment kelp with leaf shapes */
  for (let i = 0; i < 16; i++) {
    const x = 18 + i * Math.floor((W - 36) / 15);
    const h = 35 + (i % 6) * 12;
    const w = 7 + (i % 4) * 3;
    const weedGrd = 'weed' + ((i % 3) + 1);
    const swayAmt = 5 + (i % 3) * 3;
    const durSway = (3.5 + i % 5 * 0.8).toFixed(1);
    
    /* Main stem */
    parts.push('<path d="M' + x + ',' + H + ' Q' + (x - w * 0.8) + ',' + (H - h * 0.4) + ' ' + x + ',' + (H - h) +
               ' Q' + (x + w * 0.9) + ',' + (H - h * 0.45) + ' ' + (x + 2) + ',' + H + 'Z" fill="url(#' + weedGrd + ')" opacity=".82">' +
               '<animateTransform attributeName="transform" type="rotate" values="' +
               (-swayAmt) + ' ' + x + ' ' + H + ';' + swayAmt + ' ' + x + ' ' + H + ';' + (-swayAmt) + ' ' + x + ' ' + H +
               '" dur="' + durSway + 's" repeatCount="indefinite"/></path>');

    /* Leaf shapes on alternating sides */
    if (i % 2 === 0 && h > 40) {
      const leafY = H - h * 0.55;
      const leafLen = w * 1.6;
      const side = (i % 4 === 0) ? -1 : 1;
      const leafDur = (parseFloat(durSway) + 0.5).toFixed(1);
      parts.push('<path d="M' + x + ',' + leafY + ' Q' + (x + side * leafLen * 0.6) + ',' + (leafY - 8) + ' ' +
                 (x + side * leafLen) + ',' + (leafY - 3) + ' Q' + (x + side * leafLen * 0.5) + ',' + (leafY + 6) + ' ' +
                 x + ',' + (leafY + 3) + 'Z" fill="url(#' + weedGrd + ')" opacity=".65">' +
                 '<animateTransform attributeName="transform" type="rotate" values="' +
                 (-swayAmt * 1.2) + ' ' + x + ' ' + H + ';' + (swayAmt * 1.2) + ' ' + x + ' ' + H + ';' +
                 (-swayAmt * 1.2) + ' ' + x + ' ' + H +
                 '" dur="' + leafDur + 's" repeatCount="indefinite"/></path>');
    }
  }

  /* Enhanced bubbles with gradient-like opacity */
  const bubbleRnd = mulberry32(731);
  for (let i = 0; i < 24; i++) {
    const x = bubbleRnd() * W;
    const r = 1.5 + bubbleRnd() * 4.5;
    const delay = (bubbleRnd() * 12).toFixed(2);
    const d = (7 + bubbleRnd() * 9).toFixed(2);
    const wobble = (bubbleRnd() - 0.5) * 30;
    /* Bubble body */
    parts.push('<circle r="' + r.toFixed(1) + '" fill="none" stroke="#c8f5ff" stroke-width=".7" opacity="0">' +
               '<animateMotion dur="' + d + 's" repeatCount="indefinite" begin="-' + delay + 's" path="M' +
               x.toFixed(1) + ',' + (H + 12) + ' C' + (x - 18 + wobble * 0.3).toFixed(1) + ',' + (H * 0.64).toFixed(1) + ' ' +
               (x + 20 + wobble * 0.5).toFixed(1) + ',' + (H * 0.28).toFixed(1) + ' ' + (x - 8 + wobble).toFixed(1) + ',-12"/>' +
               '<animate attributeName="opacity" values="0;.40;.45;.35;0" dur="' + d + 's" repeatCount="indefinite" begin="-' + delay + 's"/></circle>');
    /* Highlight dot inside larger bubbles */
    if (r > 3) {
      parts.push('<circle r="' + (r * 0.2).toFixed(1) + '" fill="#fff" opacity="0">' +
                 '<animateMotion dur="' + d + 's" repeatCount="indefinite" begin="-' + delay + 's" path="M' +
                 (x - r * 0.3).toFixed(1) + ',' + (H + 12 - r * 0.3) + ' C' +
                 (x - 18 + wobble * 0.3 - r * 0.3).toFixed(1) + ',' + (H * 0.64 - r * 0.3).toFixed(1) + ' ' +
                 (x + 20 + wobble * 0.5 - r * 0.3).toFixed(1) + ',' + (H * 0.28 - r * 0.3).toFixed(1) + ' ' +
                 (x - 8 + wobble - r * 0.3).toFixed(1) + ',' + (-12 - r * 0.3) + '"/>' +
                 '<animate attributeName="opacity" values="0;.50;.55;.40;0" dur="' + d + 's" repeatCount="indefinite" begin="-' + delay + 's"/></circle>');
    }
  }

  // marine snow: pure drift
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
    parts.push(fishSilhouette(f, i));
    parts.push('<title>' + esc(f.name) + ' — ' + esc(f.lang) + ' · ' + f.stars +
               '★ · ' + (f.dormant ? 'resting, ' + f.ageDays + 'd since last push' : 'active') +
               '</title>');
    parts.push('</g>');
    parts.push('<animateMotion dur="' + dur + '" repeatCount="indefinite" rotate="auto" path="' +
               d + '"/>');
    parts.push('</g>');
  });

  /* Vignette overlay */
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
