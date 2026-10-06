// 2.5D aquarium: a perspective-projected glass tank rendered on a 2D canvas.
// Fish, plants, rocks and bubbles live in a 3D box (x, y, z) and are drawn
// back-to-front with depth fog, so the scene reads as a real tank through glass.
// Dependency-free; pauses offscreen and renders a still frame for reduced motion.
(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);

  // Seeded RNG keeps decor layout identical across reloads.
  const seeded = (seed) => () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const WATER = hex('#0b3b52');
  const DEEP = hex('#05202f');
  // Mix a colour toward the water tint by fog amount f (0..1).
  const fog = (rgb, f, a = 1) => {
    const r = Math.round(lerp(rgb[0], WATER[0], f));
    const g = Math.round(lerp(rgb[1], WATER[1], f));
    const b = Math.round(lerp(rgb[2], WATER[2], f));
    return a === 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`;
  };

  // ------------------------------------------------------------------ species
  const SPECIES = {
    tetra: {
      count: 14, len: 0.085, h: 0.3, speed: 0.34, school: 1,
      body: hex('#9fb8c8'), belly: hex('#e8f1f6'), accent: hex('#26d6ff'), tail: hex('#e8424f'),
    },
    clown: {
      count: 2, len: 0.17, h: 0.48, speed: 0.2, school: 0.25,
      body: hex('#ff7a1a'), belly: hex('#ffb066'), accent: hex('#ffffff'), edge: hex('#1a1206'),
    },
    tang: {
      count: 2, len: 0.24, h: 0.62, speed: 0.22, school: 0.15,
      body: hex('#1f5fe0'), belly: hex('#3c8cff'), accent: hex('#0a1640'), tail: hex('#ffd23a'),
    },
    yellow: {
      count: 2, len: 0.2, h: 0.8, speed: 0.18, school: 0.15,
      body: hex('#ffd51f'), belly: hex('#fff07a'), accent: hex('#fff6c2'),
    },
  };

  function makeScene(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let W = 0, H = 0, S = 1, dpr = 1;
    // World box; filled in by resize() from the canvas aspect.
    const box = { hw: 1.6, top: -0.8, water: -0.72, floor: 0.62, bottom: 0.9, depth: 1.9 };
    const D = 2.7; // camera distance in front of the glass
    const cam = { x: 0, y: -0.05, tx: 0, ty: -0.05 };
    const pointer = { active: false, x: 0, y: 0 };

    const project = (x, y, z) => {
      const k = D / (z + D);
      return { x: W / 2 + (x - cam.x) * k * S, y: H / 2 + (y - cam.y) * k * S, k };
    };

    // ------------------------------------------------------------- decor
    const rng = seeded(7);
    const rocks = [];
    const plants = [];
    const pebbles = [];
    const blob = document.createElement('canvas');

    function buildDecor() {
      rocks.length = plants.length = pebbles.length = 0;
      const r = seeded(11);
      const rockSpots = [[-1.15, 1.35, 0.32], [-0.75, 1.55, 0.22], [0.95, 1.2, 0.36], [1.3, 1.6, 0.24], [0.15, 1.7, 0.18], [-1.45, 0.55, 0.16]];
      for (const [x, z, s] of rockSpots) {
        const pts = [];
        const n = 11;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI; // upper half dome
          const rr = 1 + (r() - 0.5) * 0.28;
          pts.push([Math.cos(Math.PI - a) * rr, -Math.pow(Math.sin(a), 0.7) * rr * (0.72 + r() * 0.22)]);
        }
        rocks.push({ x, z, s, pts, tone: 0.75 + r() * 0.25 });
      }
      const plantSpots = [
        [-1.38, 1.7, 0.95, '#2f8f4e'], [-1.0, 1.85, 1.15, '#3aa35a'], [-0.55, 1.75, 0.8, '#5fbf62'],
        [1.05, 1.75, 1.05, '#2f8f4e'], [1.42, 1.5, 0.85, '#c2553a'], [0.62, 1.82, 0.7, '#78c25a'],
        [-1.25, 0.75, 0.55, '#4fb06a'], [1.3, 0.85, 0.5, '#3aa35a'], [0.25, 1.9, 0.6, '#2b7f47'],
        [-0.2, 1.88, 0.45, '#8acb5c'],
      ];
      for (const [x, z, h, col] of plantSpots) {
        const blades = [];
        const nb = 5 + Math.floor(r() * 4);
        for (let i = 0; i < nb; i++) {
          blades.push({
            dx: (r() - 0.5) * 0.16, dz: (r() - 0.5) * 0.1,
            h: h * (0.5 + r() * 0.4) * (box.floor - box.water), w: 0.022 + r() * 0.02,
            lean: (r() - 0.5) * 0.25, phase: r() * TAU, speed: 0.7 + r() * 0.5,
            col: hex(col).map((c) => clamp(Math.round(c * (0.8 + r() * 0.35)), 0, 255)),
          });
        }
        plants.push({ x, z, blades });
      }
      for (let i = 0; i < 160; i++) {
        pebbles.push({ x: (r() * 2 - 1) * box.hw * 0.98, z: 0.04 + r() * (box.depth - 0.08), s: 0.008 + r() * 0.018, t: r() });
      }
    }

    // Soft radial sprite reused for caustics, glows and bubbles.
    function buildBlob() {
      blob.width = blob.height = 64;
      const b = blob.getContext('2d');
      const g = b.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.45, 'rgba(255,255,255,0.35)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      b.fillStyle = g;
      b.fillRect(0, 0, 64, 64);
    }

    // -------------------------------------------------------------- fish
    const fish = [];
    function spawnFish() {
      fish.length = 0;
      for (const [name, sp] of Object.entries(SPECIES)) {
        const cx = rand(-0.8, 0.8), cy = rand(-0.3, 0.2), cz = rand(0.5, 1.4);
        for (let i = 0; i < sp.count; i++) {
          const dir = Math.random() < 0.5 ? -1 : 1;
          fish.push({
            sp, name,
            p: [cx + rand(-0.25, 0.25), cy + rand(-0.12, 0.12), cz + rand(-0.2, 0.2)],
            v: [dir * sp.speed, rand(-0.02, 0.02), rand(-0.05, 0.05)],
            phase: rand(0, TAU), len: sp.len * rand(0.88, 1.1), wander: rand(0, TAU), facing: dir,
          });
        }
      }
    }

    function stepFish(dt, t) {
      const lo = [-box.swimX, box.water + 0.12, 0.25];
      const hi = [box.swimX, box.floor - 0.16, box.depth - 0.25];
      for (const f of fish) {
        const sp = f.sp;
        let ax = 0, ay = 0, az = 0;
        let cx = 0, cy = 0, cz = 0, vx = 0, vy = 0, vz = 0, n = 0;
        for (const o of fish) {
          if (o === f) continue;
          const dx = o.p[0] - f.p[0], dy = o.p[1] - f.p[1], dz = o.p[2] - f.p[2];
          const d2 = dx * dx + dy * dy + dz * dz;
          const sep = (f.len + o.len) * 0.9;
          if (d2 < sep * sep && d2 > 1e-6) {
            const d = Math.sqrt(d2);
            const push = (sep - d) / sep * 2.2;
            ax -= dx / d * push; ay -= dy / d * push; az -= dz / d * push;
          }
          if (o.name === f.name && d2 < 0.35) {
            cx += o.p[0]; cy += o.p[1]; cz += o.p[2];
            vx += o.v[0]; vy += o.v[1]; vz += o.v[2]; n++;
          }
        }
        if (n) {
          const s = sp.school;
          ax += ((cx / n - f.p[0]) * 0.9 + (vx / n - f.v[0]) * 1.2) * s;
          ay += ((cy / n - f.p[1]) * 0.9 + (vy / n - f.v[1]) * 1.2) * s;
          az += ((cz / n - f.p[2]) * 0.9 + (vz / n - f.v[2]) * 1.2) * s;
        }
        // Gentle wander so solitary fish keep exploring.
        f.wander += dt * rand(-1.2, 1.2);
        ax += Math.cos(f.wander) * 0.12;
        az += Math.sin(f.wander * 0.7 + t * 0.1) * 0.1;
        ay += Math.sin(f.wander * 1.3) * 0.04;
        // Soft walls.
        for (let i = 0; i < 3; i++) {
          const m = i === 1 ? 2.6 : 1.6;
          if (f.p[i] < lo[i]) (i === 0 ? (ax += (lo[i] - f.p[i]) * m * 4) : i === 1 ? (ay += (lo[i] - f.p[i]) * m * 4) : (az += (lo[i] - f.p[i]) * m * 4));
          if (f.p[i] > hi[i]) (i === 0 ? (ax -= (f.p[i] - hi[i]) * m * 4) : i === 1 ? (ay -= (f.p[i] - hi[i]) * m * 4) : (az -= (f.p[i] - hi[i]) * m * 4));
        }
        // Scatter from the pointer, treated as a finger on the glass.
        if (pointer.active) {
          const dx = f.p[0] - pointer.x, dy = f.p[1] - pointer.y;
          const d2 = dx * dx + dy * dy + f.p[2] * f.p[2] * 0.15;
          if (d2 < 0.16) {
            const d = Math.sqrt(d2) + 0.01;
            ax += dx / d * 1.6; ay += dy / d * 1.2; az += 0.6;
          }
        }
        f.v[0] += ax * dt; f.v[1] += ay * dt * 0.6; f.v[2] += az * dt;
        // Fish swim mostly level: damp vertical speed and clamp total speed.
        f.v[1] *= 0.985;
        const sp2 = Math.hypot(f.v[0], f.v[1], f.v[2]);
        const max = sp.speed * 1.5, min = sp.speed * 0.55;
        const sc = sp2 > max ? max / sp2 : sp2 < min ? min / (sp2 || 1) : 1;
        f.v[0] *= sc; f.v[1] *= sc; f.v[2] *= sc;
        f.p[0] += f.v[0] * dt; f.p[1] += f.v[1] * dt; f.p[2] += f.v[2] * dt;
        f.p[2] = clamp(f.p[2], 0.08, box.depth - 0.08);
        f.phase += dt * (6 + sp2 * 14);
        // Turn smoothly instead of snapping when the heading flips.
        const want = f.v[0] >= 0 ? 1 : -1;
        f.facing += (want - f.facing) * Math.min(1, dt * 3.5);
      }
    }

    function drawFish(f) {
      const { sp } = f;
      const pr = project(f.p[0], f.p[1], f.p[2]);
      const fz = clamp(f.p[2] / box.depth, 0, 1) * 0.62;
      const L = f.len * pr.k * S;
      const lateral = Math.hypot(f.v[0], f.v[1]);
      const total = Math.hypot(f.v[0], f.v[1], f.v[2]) || 1;
      // Foreshorten when swimming toward or away from the glass; facing eases through 0 on turns.
      const fore = Math.max(0.3, lateral / total) * Math.max(0.18, Math.abs(f.facing));
      const tilt = clamp(Math.atan2(f.v[1], Math.abs(f.v[0]) + 0.05), -0.45, 0.45);
      const h = sp.h;
      const wig = Math.sin(f.phase) * 0.28;

      ctx.save();
      ctx.translate(pr.x, pr.y);
      ctx.rotate(tilt * Math.sign(f.facing || 1));
      ctx.scale(L * fore * Math.sign(f.facing || 1), L);

      // Tail fin.
      ctx.save();
      ctx.translate(-0.42, 0);
      ctx.rotate(wig);
      ctx.beginPath();
      ctx.moveTo(0.04, 0);
      ctx.quadraticCurveTo(-0.16, -h * 0.25, -0.26, -h * 0.55);
      ctx.quadraticCurveTo(-0.18, 0, -0.26, h * 0.55);
      ctx.quadraticCurveTo(-0.16, h * 0.25, 0.04, 0);
      ctx.fillStyle = fog(sp.tail || sp.body, fz, 0.92);
      ctx.fill();
      ctx.restore();

      // Dorsal and pelvic fins for the deep-bodied species.
      if (f.name !== 'tetra') {
        ctx.beginPath();
        ctx.moveTo(0.18, -h * 0.42);
        ctx.quadraticCurveTo(-0.05, -h * (f.name === 'yellow' ? 0.95 : 0.72), -0.36, -h * 0.2);
        ctx.lineTo(-0.1, -h * 0.3);
        ctx.closePath();
        ctx.fillStyle = fog(f.name === 'tang' ? sp.accent : sp.body, fz, 0.85);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0.1, h * 0.4);
        ctx.quadraticCurveTo(-0.08, h * (f.name === 'yellow' ? 0.9 : 0.62), -0.34, h * 0.18);
        ctx.lineTo(-0.08, h * 0.3);
        ctx.closePath();
        ctx.fill();
      }

      // Body.
      ctx.beginPath();
      ctx.moveTo(0.5, 0.02 * h);
      ctx.bezierCurveTo(0.46, -h * 0.5, -0.12, -h * 0.62, -0.44, -h * 0.1);
      ctx.quadraticCurveTo(-0.47, 0, -0.44, h * 0.1);
      ctx.bezierCurveTo(-0.12, h * 0.6, 0.44, h * 0.5, 0.5, 0.02 * h);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.5);
      g.addColorStop(0, fog(sp.body.map((c) => c * 0.72), fz));
      g.addColorStop(0.45, fog(sp.body, fz));
      g.addColorStop(1, fog(sp.belly, fz));
      ctx.fillStyle = g;
      ctx.fill();

      // Markings, clipped to the body.
      ctx.save();
      ctx.clip();
      if (f.name === 'clown') {
        for (const bx of [0.24, -0.04, -0.33]) {
          ctx.fillStyle = fog(sp.edge, fz);
          ctx.fillRect(bx - 0.075, -h, 0.15, h * 2);
          ctx.fillStyle = fog(sp.accent, fz);
          ctx.fillRect(bx - 0.055, -h, 0.11, h * 2);
        }
      } else if (f.name === 'tetra') {
        ctx.fillStyle = fog(sp.accent, fz * 0.6);
        ctx.fillRect(-0.4, -h * 0.16, 0.86, h * 0.16);
        ctx.fillStyle = fog(sp.tail, fz);
        ctx.fillRect(-0.45, h * 0.02, 0.45, h * 0.4);
      } else if (f.name === 'tang') {
        ctx.beginPath();
        ctx.moveTo(0.3, -h * 0.18);
        ctx.quadraticCurveTo(-0.05, -h * 0.5, -0.38, -h * 0.05);
        ctx.quadraticCurveTo(-0.1, -h * 0.05, -0.05, h * 0.18);
        ctx.quadraticCurveTo(0.12, -h * 0.05, 0.3, -h * 0.18);
        ctx.fillStyle = fog(sp.accent, fz);
        ctx.fill();
      }
      // Soft top-light sheen.
      const sh = ctx.createLinearGradient(0, -h * 0.5, 0, 0);
      sh.addColorStop(0, 'rgba(255,255,255,0.28)');
      sh.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sh;
      ctx.fillRect(-0.5, -h * 0.6, 1.1, h * 0.6);
      ctx.restore();

      // Eye.
      ctx.beginPath();
      ctx.arc(0.33, -h * 0.1, h * 0.11, 0, TAU);
      ctx.fillStyle = fog([245, 248, 250], fz);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0.345, -h * 0.1, h * 0.065, 0, TAU);
      ctx.fillStyle = fog([8, 12, 18], fz);
      ctx.fill();
      ctx.restore();
    }

    function drawFishShadow(f) {
      const pr = project(f.p[0], box.floor, f.p[2]);
      const height = (box.floor - f.p[1]) / (box.floor - box.water);
      const r = f.len * pr.k * S * (0.5 + height * 0.6);
      ctx.globalAlpha = 0.22 * (1 - height * 0.7) * (1 - f.p[2] / box.depth * 0.6);
      ctx.drawImage(blob, pr.x - r, pr.y - r * 0.22, r * 2, r * 0.44);
      ctx.globalAlpha = 1;
    }

    // ------------------------------------------------------------- plants
    function drawPlant(p, t) {
      for (const b of p.blades) {
        const z = p.z + b.dz;
        const fz = clamp(z / box.depth, 0, 1) * 0.62;
        const segs = 9;
        const left = [], right = [];
        for (let i = 0; i <= segs; i++) {
          const u = i / segs;
          const sway = Math.sin(t * b.speed + b.phase + u * 2.2) * 0.07 * u * u + b.lean * u * u * 0.4;
          const x = p.x + b.dx + sway;
          const y = box.floor - b.h * u;
          const pr = project(x, y, z);
          const w = b.w * (1 - u * 0.85) * pr.k * S;
          left.push([pr.x - w, pr.y]);
          right.push([pr.x + w, pr.y]);
        }
        ctx.beginPath();
        ctx.moveTo(left[0][0], left[0][1]);
        for (let i = 1; i < left.length; i++) ctx.lineTo(left[i][0], left[i][1]);
        for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
        ctx.closePath();
        const top = left[left.length - 1], base = left[0];
        const g = ctx.createLinearGradient(0, base[1], 0, top[1]);
        g.addColorStop(0, fog(b.col.map((c) => c * 0.55), fz));
        g.addColorStop(1, fog(b.col.map((c) => Math.min(255, c * 1.2)), fz));
        ctx.fillStyle = g;
        ctx.fill();
      }
    }

    // -------------------------------------------------------------- rocks
    function drawRock(r) {
      const pr = project(r.x, box.floor, r.z);
      const s = r.s * pr.k * S;
      const fz = clamp(r.z / box.depth, 0, 1) * 0.62;
      // Contact shadow.
      ctx.globalAlpha = 0.45;
      ctx.drawImage(blob, pr.x - s * 1.5, pr.y - s * 0.22, s * 3, s * 0.5);
      ctx.globalAlpha = 1;
      ctx.beginPath();
      r.pts.forEach(([px, py], i) => (i ? ctx.lineTo(pr.x + px * s, pr.y + py * s + s * 0.08) : ctx.moveTo(pr.x + px * s, pr.y + py * s + s * 0.08)));
      ctx.closePath();
      const g = ctx.createRadialGradient(pr.x - s * 0.35, pr.y - s * 0.6, s * 0.05, pr.x, pr.y - s * 0.2, s * 1.2);
      const base = [128 * r.tone, 122 * r.tone, 112 * r.tone];
      g.addColorStop(0, fog(base.map((c) => c * 1.45), fz));
      g.addColorStop(0.55, fog(base, fz));
      g.addColorStop(1, fog(base.map((c) => c * 0.4), fz));
      ctx.fillStyle = g;
      ctx.fill();
    }

    // ------------------------------------------------------------ bubbles
    const bubbles = [];
    const bubbler = { x: -1.2, z: 1.55 };
    const motes = [];
    function spawnAmbient() {
      bubbles.length = motes.length = 0;
      for (let i = 0; i < 26; i++) bubbles.push(newBubble(true));
      for (let i = 0; i < 70; i++) motes.push({ p: [rand(-box.hw, box.hw), rand(box.water, box.floor), rand(0.1, box.depth)], ph: rand(0, TAU) });
    }
    function newBubble(anywhere) {
      return {
        x: bubbler.x + rand(-0.03, 0.03), z: bubbler.z + rand(-0.03, 0.03),
        y: anywhere ? rand(box.water, box.floor) : box.floor - 0.02,
        r: rand(0.008, 0.022), vy: rand(0.28, 0.42), ph: rand(0, TAU),
      };
    }
    function drawBubble(b) {
      const pr = project(b.x + Math.sin(b.ph) * 0.015, b.y, b.z);
      const r = b.r * pr.k * S;
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, r, 0, TAU);
      ctx.strokeStyle = 'rgba(210,240,255,0.55)';
      ctx.lineWidth = Math.max(0.6, r * 0.18);
      ctx.stroke();
      ctx.fillStyle = 'rgba(200,235,255,0.12)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pr.x - r * 0.35, pr.y - r * 0.35, r * 0.28, 0, TAU);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fill();
    }

    // ---------------------------------------------------------- the tank
    const quad = (pts) => {
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
    };

    function drawTank(t) {
      const { hw, water, floor, depth } = box;
      const fTL = project(-hw, water, 0), fTR = project(hw, water, 0);
      const fBL = project(-hw, floor, 0), fBR = project(hw, floor, 0);
      const bTL = project(-hw, water, depth), bTR = project(hw, water, depth);
      const bBL = project(-hw, floor, depth), bBR = project(hw, floor, depth);

      // Water volume colour behind everything.
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#0f5a73');
      bg.addColorStop(0.55, '#0a3c54');
      bg.addColorStop(1, '#062636');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Back wall with a soft light pool from above.
      quad([bTL, bTR, bBR, bBL]);
      const bw = ctx.createLinearGradient(0, bTL.y, 0, bBL.y);
      bw.addColorStop(0, '#1a7c92');
      bw.addColorStop(0.6, '#0e4c63');
      bw.addColorStop(1, '#093648');
      ctx.fillStyle = bw;
      ctx.fill();

      // Side walls: slightly darker glass seen at an angle.
      for (const side of [[fTL, bTL, bBL, fBL], [fTR, bTR, bBR, fBR]]) {
        quad(side);
        ctx.fillStyle = 'rgba(4,30,44,0.35)';
        ctx.fill();
      }

      // Sand floor.
      quad([bBL, bBR, fBR, fBL]);
      const sand = ctx.createLinearGradient(0, bBL.y, 0, fBL.y);
      sand.addColorStop(0, fog(hex('#b9a27a'), 0.55));
      sand.addColorStop(1, fog(hex('#e3cc9c'), 0.12));
      ctx.fillStyle = sand;
      ctx.fill();
      ctx.save();
      ctx.clip();
      for (const pb of pebbles) {
        const pr = project(pb.x, floor, pb.z);
        const r = pb.s * pr.k * S;
        ctx.fillStyle = fog(pb.t > 0.5 ? [150, 132, 104] : [214, 196, 160], pb.z / depth * 0.55, 0.8);
        ctx.beginPath();
        ctx.ellipse(pr.x, pr.y, r, r * 0.45, 0, 0, TAU);
        ctx.fill();
      }
      // Caustics: drifting soft light cells, added on top of the sand.
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 70; i++) {
        const gx = ((i * 0.618) % 1) * 2 - 1, gz = ((i * 0.381 + 0.13) % 1);
        const x = gx * hw + Math.sin(t * 0.6 + i * 1.7) * 0.12;
        const z = gz * depth + Math.cos(t * 0.5 + i * 2.3) * 0.1;
        const pr = project(x, floor, z);
        const r = (0.08 + 0.05 * Math.sin(t * 1.3 + i)) * pr.k * S;
        ctx.globalAlpha = 0.09 + 0.06 * Math.sin(t * 1.7 + i * 0.9);
        ctx.drawImage(blob, pr.x - r, pr.y - r * 0.4, r * 2, r * 0.8);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();

      // Underside of the water surface, rippling.
      quad([fTL, fTR, bTR, bTL]);
      const surf = ctx.createLinearGradient(0, fTL.y, 0, bTL.y);
      surf.addColorStop(0, 'rgba(140,215,232,0.38)');
      surf.addColorStop(1, 'rgba(80,175,205,0.22)');
      ctx.fillStyle = surf;
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 18; i++) {
        const z = (i / 18) * depth;
        const pa = project(-hw, water, z), pb = project(hw, water, z);
        ctx.strokeStyle = `rgba(220,250,255,${0.05 + 0.04 * Math.sin(t * 2 + i)})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let s = 0; s <= 24; s++) {
          const u = s / 24;
          const x = lerp(pa.x, pb.x, u);
          const y = lerp(pa.y, pb.y, u) + Math.sin(u * 18 + t * 1.6 + i) * 1.4 * pa.k;
          s ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();

      // Air gap above the waterline, seen through the glass.
      const air = ctx.createLinearGradient(0, 0, 0, fTL.y);
      air.addColorStop(0, '#04131c');
      air.addColorStop(1, '#0b2a37');
      ctx.fillStyle = air;
      ctx.fillRect(0, 0, W, fTL.y);
      ctx.fillStyle = 'rgba(200,245,255,0.75)';
      ctx.fillRect(0, fTL.y - 1, W, 2);

      return { fBL, fBR, bTL, bTR, bBL, bBR };
    }

    function drawLightRays(t) {
      const { hw, water, floor, depth } = box;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const x0 = -hw * 0.85 + i * hw * 0.42 + Math.sin(t * 0.25 + i * 1.9) * 0.08;
        const z = 0.5 + (i % 3) * 0.45;
        const w0 = 0.1 + (i % 2) * 0.06;
        const a = project(x0 - w0, water, z), b = project(x0 + w0, water, z);
        const c = project(x0 + w0 + 0.35, floor, z), d = project(x0 - w0 + 0.15, floor, z);
        quad([a, b, c, d]);
        const g = ctx.createLinearGradient(0, a.y, 0, d.y);
        const al = 0.07 + 0.03 * Math.sin(t * 0.7 + i * 2.1);
        g.addColorStop(0, `rgba(190,245,255,${al})`);
        g.addColorStop(1, 'rgba(190,245,255,0)');
        ctx.fillStyle = g;
        ctx.fill();
      }
      ctx.restore();
    }

    function drawFrontSand(edges) {
      // Substrate cross-section pressed against the front glass.
      const { fBL, fBR } = edges;
      const g = ctx.createLinearGradient(0, fBL.y, 0, H);
      g.addColorStop(0, '#d9c08c');
      g.addColorStop(0.25, '#b89a68');
      g.addColorStop(1, '#6e5634');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, fBL.y);
      for (let s = 0; s <= 30; s++) {
        const u = s / 30;
        const x = lerp(Math.min(0, fBL.x), Math.max(W, fBR.x), u);
        ctx.lineTo(x, fBL.y + Math.sin(u * 23) * 1.5 + Math.sin(u * 7) * 2.5);
      }
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.fill();
      const r = seeded(3);
      for (let i = 0; i < 260; i++) {
        const x = r() * W, y = fBL.y + 4 + r() * (H - fBL.y);
        const s = (0.6 + r() * 2.2) * (S / 300);
        ctx.fillStyle = r() > 0.5 ? 'rgba(70,52,30,0.5)' : 'rgba(240,222,186,0.45)';
        ctx.beginPath();
        ctx.ellipse(x, y, s, s * 0.7, r() * 3, 0, TAU);
        ctx.fill();
      }
    }

    function drawGlass(edges) {
      const { bTL, bTR, bBL, bBR } = edges;
      // Glass corner edges converging to the back wall: the main 2.5D cue.
      ctx.strokeStyle = 'rgba(190,240,255,0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bTL.x, bTL.y); ctx.lineTo(bTR.x, bTR.y); ctx.lineTo(bBR.x, bBR.y); ctx.lineTo(bBL.x, bBL.y); ctx.closePath();
      const c = project(-box.hw, box.water, 0), d = project(box.hw, box.water, 0);
      const e = project(-box.hw, box.floor, 0), f = project(box.hw, box.floor, 0);
      ctx.moveTo(c.x, c.y); ctx.lineTo(bTL.x, bTL.y);
      ctx.moveTo(d.x, d.y); ctx.lineTo(bTR.x, bTR.y);
      ctx.moveTo(e.x, e.y); ctx.lineTo(bBL.x, bBL.y);
      ctx.moveTo(f.x, f.y); ctx.lineTo(bBR.x, bBR.y);
      ctx.stroke();

      // Front pane reflection streaks.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const rx = W * 0.12 - cam.x * S * 0.4;
      const g = ctx.createLinearGradient(rx, 0, rx + W * 0.28, H);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.42, 'rgba(255,255,255,0.05)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.09)');
      g.addColorStop(0.56, 'rgba(255,255,255,0.03)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();

      // Vignette and a thin inner rim, like looking through a framed pane.
      const v = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(1,8,14,0.55)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(200,245,255,0.18)';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, W - 2, H - 2);
    }

    // ------------------------------------------------------------ frame
    function frame(t, dt) {
      cam.x += (cam.tx - cam.x) * Math.min(1, dt * 2.5);
      cam.y += (cam.ty - cam.y) * Math.min(1, dt * 2.5);
      if (dt > 0) {
        stepFish(dt, t);
        for (let i = 0; i < bubbles.length; i++) {
          const b = bubbles[i];
          b.y -= b.vy * dt;
          b.ph += dt * 6;
          if (b.y < box.water + 0.01) bubbles[i] = newBubble(false);
        }
        for (const m of motes) {
          m.p[0] += Math.sin(t * 0.3 + m.ph) * 0.004 * dt * 10;
          m.p[1] -= 0.004 * dt;
          if (m.p[1] < box.water) m.p[1] = box.floor;
        }
      }

      const edges = drawTank(t);
      drawLightRays(t);

      const items = [];
      for (const r of rocks) items.push({ z: r.z, d: () => drawRock(r) });
      for (const p of plants) items.push({ z: p.z, d: () => drawPlant(p, t) });
      for (const b of bubbles) items.push({ z: b.z - 0.001, d: () => drawBubble(b) });
      for (const f of fish) items.push({ z: f.p[2], d: () => drawFish(f) });
      items.sort((a, b) => b.z - a.z);
      for (const f of fish) drawFishShadow(f);
      for (const it of items) it.d();

      // Suspended particles catch the light.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const m of motes) {
        const pr = project(m.p[0], m.p[1], m.p[2]);
        const r = 1.6 * pr.k * (S / 320);
        ctx.globalAlpha = (0.25 + 0.2 * Math.sin(t * 1.2 + m.ph)) * pr.k;
        ctx.drawImage(blob, pr.x - r, pr.y - r, r * 2, r * 2);
      }
      ctx.restore();

      drawFrontSand(edges);
      drawGlass(edges);
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, rect.width);
      H = Math.max(1, rect.height);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Overscan so camera parallax never exposes the canvas edge.
      // Narrow screens crop the tank sides instead of shrinking the scene.
      S = Math.max(W / (box.hw * 2), H / 1.75) * 1.08;
      box.swimX = Math.min(box.hw - 0.2, (W / (2 * S)) * 1.15);
      const halfH = H / (2 * S);
      box.top = -halfH;
      box.water = -halfH * 0.84;
      box.floor = halfH * 0.66;
      box.bottom = halfH;
    }

    // ------------------------------------------------------------ input
    const toWorld = (e) => {
      const rect = canvas.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width, ny = (e.clientY - rect.top) / rect.height;
      return [nx, ny];
    };
    canvas.addEventListener('pointermove', (e) => {
      const [nx, ny] = toWorld(e);
      cam.tx = (nx - 0.5) * 0.5;
      cam.ty = -0.05 + (ny - 0.5) * 0.22;
      pointer.active = true;
      pointer.x = (nx - 0.5) * W / S + cam.x;
      pointer.y = (ny - 0.5) * H / S + cam.y;
    });
    canvas.addEventListener('pointerleave', () => {
      cam.tx = 0; cam.ty = -0.05; pointer.active = false;
    });

    buildBlob();
    resize();
    buildDecor();
    spawnFish();
    spawnAmbient();

    let last = 0, raf = 0, visible = true, clock = 0;
    const loop = (now) => {
      raf = 0;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      clock += dt;
      frame(clock, dt);
      if (visible && !document.hidden) raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (reduceMotion) return;
      if (!raf && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(loop); }
    };

    if (reduceMotion) {
      // Let the school settle, then draw one still frame.
      for (let i = 0; i < 90; i++) stepFish(1 / 30, i / 30);
      frame(4, 0);
    } else {
      start();
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
        start();
      }).observe(canvas);
    }
    document.addEventListener('visibilitychange', start);
    let rt = 0;
    const onResize = () => {
      clearTimeout(rt);
      rt = setTimeout(() => { resize(); buildDecor(); if (reduceMotion) frame(4, 0); }, 120);
    };
    if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(canvas);
    else window.addEventListener('resize', onResize);
    return true;
  }

  const boot = () => document.querySelectorAll('canvas.aquarium-25d').forEach((c) => {
    // Show the canvas before sizing it; fall back to the SVG if 2D canvas is unavailable.
    const host = c.closest('[data-aquarium-25d]');
    host?.classList.add('is-live');
    if (!makeScene(c)) host?.classList.remove('is-live');
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
