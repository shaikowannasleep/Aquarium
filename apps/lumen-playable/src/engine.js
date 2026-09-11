'use strict';
/* =====================================================================
 * LUMEN :: SwarmEngine
 * ---------------------------------------------------------------------
 * Boids (Reynolds 1987) hardened for playable-ad constraints:
 *   - Structure-of-Arrays (Float32Array) : cache friendly, zero GC
 *   - Uniform spatial hash + counting sort : O(n) neighbour queries
 *   - Zero per-frame allocation after warm-up
 *   - Swap-remove O(1) despawn
 *   - Fixed timestep, deterministic-ish integration
 *   - Per-agent "stress" channel drives art direction (panic colour)
 * ===================================================================== */

/* Wrapped in an IIFE: top-level `const` in a classic script lands in the
 * shared global lexical scope, so engine.js and game.js would collide on
 * TAU/clamp/lerp and the second file would fail to parse. */
(function (global) {

const TAU = Math.PI * 2;

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
function rand(a, b) { return a + Math.random() * (b - a); }

/* ---------------------------------------------------------------------
 * Params : every magic number lives here so the whole feel is tunable
 * live from the Tech Overlay. This is the "80% of the work" surface.
 * ------------------------------------------------------------------- */
function defaultParams() {
  return {
    // perception
    rSep: 18, rAli: 42, rCoh: 52,
    fov: -0.35,          // dot() threshold => ~250 deg cone, blind spot behind

    // weights
    wSep: 2.10, wAli: 1.05, wCoh: 0.95,
    wFlee: 4.60, wAvoid: 5.20, wLure: 2.40, wBounds: 3.40,

    // locomotion
    minSpeed: 46, maxSpeed: 132, maxForce: 260,
    panicSpeedBoost: 1.55,

    // senses
    rFlee: 132, rLure: 210,
    maxNeighbours: 7,    // Ballerini et al. 2008: starlings track ~6-7 peers
    margin: 54,

    stressDecay: 1.9,
  };
}

class SwarmEngine {
  constructor(capacity, width, height) {
    const c = capacity | 0;
    this.cap = c;
    this.n = 0;
    this.w = width;
    this.h = height;
    this.p = defaultParams();

    // --- agent state (SoA) ---
    this.px = new Float32Array(c);
    this.py = new Float32Array(c);
    this.vx = new Float32Array(c);
    this.vy = new Float32Array(c);
    this.ax = new Float32Array(c);
    this.ay = new Float32Array(c);
    this.tx = new Float32Array(c);   // trail anchor
    this.ty = new Float32Array(c);
    this.stress = new Float32Array(c);
    this.phase = new Float32Array(c); // tail wiggle offset
    this.alive = new Uint8Array(c);

    // --- spatial hash ---
    this.cell = Math.max(16, this.p.rCoh);
    this.cols = 1; this.rows = 1;
    this.cellOf = new Int32Array(c);
    this.sorted = new Int32Array(c);
    this.counts = new Int32Array(1);
    this.resize(width, height);

    // --- instrumentation (Tech Overlay) ---
    this.stat = {
      neighbourTests: 0, neighbourHits: 0,
      simMs: 0, gridMs: 0, occupied: 0,
    };
    this.debugIndex = 0;
    this.dbg = { sx: 0, sy: 0, ax: 0, ay: 0, cx: 0, cy: 0, count: 0 };
  }

  resize(w, h) {
    this.w = w; this.h = h;
    this.cell = Math.max(16, this.p.rCoh);
    this.cols = Math.max(1, Math.ceil(w / this.cell) + 1);
    this.rows = Math.max(1, Math.ceil(h / this.cell) + 1);
    const nc = this.cols * this.rows;
    if (this.counts.length < nc + 1) this.counts = new Int32Array(nc + 1);
  }

  spawn(x, y, speed) {
    if (this.n >= this.cap) return -1;
    const i = this.n++;
    const a = Math.random() * TAU;
    const s = speed !== undefined ? speed : rand(this.p.minSpeed, this.p.maxSpeed);
    this.px[i] = x; this.py[i] = y;
    this.vx[i] = Math.cos(a) * s; this.vy[i] = Math.sin(a) * s;
    this.tx[i] = x; this.ty[i] = y;
    this.stress[i] = 0;
    this.phase[i] = Math.random() * TAU;
    this.alive[i] = 1;
    return i;
  }

  /* O(1) despawn: swap the last agent into the hole. */
  removeAt(i) {
    const last = --this.n;
    if (i !== last) {
      this.px[i] = this.px[last]; this.py[i] = this.py[last];
      this.vx[i] = this.vx[last]; this.vy[i] = this.vy[last];
      this.tx[i] = this.tx[last]; this.ty[i] = this.ty[last];
      this.stress[i] = this.stress[last];
      this.phase[i] = this.phase[last];
    }
  }

  /* -------------------------------------------------------------------
   * Counting sort into the uniform grid.
   * counts[] is reused across frames; no allocation happens here.
   * ----------------------------------------------------------------- */
  buildGrid() {
    const t0 = performance.now();
    const n = this.n, cols = this.cols, rows = this.rows, cs = this.cell;
    const nc = cols * rows;
    const counts = this.counts;
    counts.fill(0, 0, nc + 1);

    for (let i = 0; i < n; i++) {
      const cx = clamp((this.px[i] / cs) | 0, 0, cols - 1);
      const cy = clamp((this.py[i] / cs) | 0, 0, rows - 1);
      const c = cy * cols + cx;
      this.cellOf[i] = c;
      counts[c + 1]++;
    }
    let occupied = 0;
    for (let c = 0; c < nc; c++) {
      if (counts[c + 1] > 0) occupied++;
      counts[c + 1] += counts[c];
    }
    // scatter (counts[] doubles as the write cursor, restored by the prefix)
    const cursor = this.sorted; // reuse as temp is unsafe -> use separate walk
    for (let i = 0; i < n; i++) {
      const c = this.cellOf[i];
      cursor[counts[c]++] = i;
    }
    // undo cursor advance to restore cellStart
    for (let c = nc; c > 0; c--) counts[c] = counts[c - 1];
    counts[0] = 0;

    this.stat.occupied = occupied;
    this.stat.gridMs = performance.now() - t0;
  }

  /* -------------------------------------------------------------------
   * One fixed simulation step.
   * ctx supplies the world: predators, obstacles, lure, flow field.
   * ----------------------------------------------------------------- */
  step(dt, world) {
    const t0 = performance.now();
    this.buildGrid();

    const p = this.p, n = this.n;
    const cols = this.cols, rows = this.rows, cs = this.cell;
    const counts = this.counts;
    const sorted = this.sorted;
    const rSep2 = p.rSep * p.rSep, rAli2 = p.rAli * p.rAli, rCoh2 = p.rCoh * p.rCoh;
    const maxN = p.maxNeighbours;

    let tests = 0, hits = 0;

    for (let i = 0; i < n; i++) {
      const x = this.px[i], y = this.py[i];
      const vxi = this.vx[i], vyi = this.vy[i];
      const sp = Math.hypot(vxi, vyi) || 1e-6;
      const fwx = vxi / sp, fwy = vyi / sp;

      let sepX = 0, sepY = 0, aliX = 0, aliY = 0, cohX = 0, cohY = 0;
      let nAli = 0, nCoh = 0, seen = 0;

      const gx = clamp((x / cs) | 0, 0, cols - 1);
      const gy = clamp((y / cs) | 0, 0, rows - 1);
      const x0 = gx > 0 ? gx - 1 : 0, x1 = gx < cols - 1 ? gx + 1 : cols - 1;
      const y0 = gy > 0 ? gy - 1 : 0, y1 = gy < rows - 1 ? gy + 1 : rows - 1;

      outer:
      for (let cy = y0; cy <= y1; cy++) {
        const rowBase = cy * cols;
        for (let cx = x0; cx <= x1; cx++) {
          const c = rowBase + cx;
          const s = counts[c], e = counts[c + 1];
          for (let k = s; k < e; k++) {
            const j = sorted[k];
            if (j === i) continue;
            const dx = this.px[j] - x, dy = this.py[j] - y;
            const d2 = dx * dx + dy * dy;
            tests++;
            if (d2 > rCoh2 || d2 < 1e-8) continue;

            // field of view : ignore what is behind the blind spot
            const inv = 1 / Math.sqrt(d2);
            if (fwx * dx * inv + fwy * dy * inv < p.fov) continue;

            hits++;
            if (d2 < rSep2) {
              const w = 1 / d2;           // inverse-square crowding response
              sepX -= dx * w; sepY -= dy * w;
            }
            if (d2 < rAli2) { aliX += this.vx[j]; aliY += this.vy[j]; nAli++; }
            cohX += this.px[j]; cohY += this.py[j]; nCoh++;

            if (++seen >= maxN) break outer;   // topological, not metric
          }
        }
      }

      let fx = 0, fy = 0;
      let dsx = 0, dsy = 0, dax = 0, day = 0, dcx = 0, dcy = 0;

      if (sepX || sepY) {
        const m = Math.hypot(sepX, sepY);
        dsx = (sepX / m) * p.maxSpeed - vxi;
        dsy = (sepY / m) * p.maxSpeed - vyi;
        fx += dsx * p.wSep; fy += dsy * p.wSep;
      }
      if (nAli) {
        const mx = aliX / nAli, my = aliY / nAli;
        const m = Math.hypot(mx, my) || 1;
        dax = (mx / m) * p.maxSpeed - vxi;
        day = (my / m) * p.maxSpeed - vyi;
        fx += dax * p.wAli; fy += day * p.wAli;
      }
      if (nCoh) {
        const mx = cohX / nCoh - x, my = cohY / nCoh - y;
        const m = Math.hypot(mx, my) || 1;
        dcx = (mx / m) * p.maxSpeed - vxi;
        dcy = (my / m) * p.maxSpeed - vyi;
        fx += dcx * p.wCoh; fy += dcy * p.wCoh;
      }

      if (i === this.debugIndex) {
        this.dbg.sx = dsx; this.dbg.sy = dsy;
        this.dbg.ax = dax; this.dbg.ay = day;
        this.dbg.cx = dcx; this.dbg.cy = dcy;
        this.dbg.count = seen;
      }

      /* ---- predators : flee, and raise stress -------------------- */
      let panic = 0;
      const preds = world.predators;
      for (let q = 0; q < preds.length; q++) {
        const P = preds[q];
        if (!P.active) continue;
        const dx = x - P.x, dy = y - P.y;
        const d = Math.hypot(dx, dy);
        const R = p.rFlee * (P.scare || 1);
        if (d < R && d > 1e-4) {
          const t = 1 - d / R;
          const w = t * t;               // soft falloff, no popping
          fx += (dx / d) * p.maxSpeed * p.wFlee * w;
          fy += (dy / d) * p.maxSpeed * p.wFlee * w;
          if (w > panic) panic = w;
        }
      }

      /* ---- obstacles : predictive circle avoidance ---------------- */
      const obs = world.obstacles;
      for (let q = 0; q < obs.length; q++) {
        const O = obs[q];
        const ahx = x + fwx * 26, ahy = y + fwy * 26;
        const dx = ahx - O.x, dy = ahy - O.y;
        const d = Math.hypot(dx, dy);
        const R = O.r + 22;
        if (d < R && d > 1e-4) {
          const t = 1 - d / R;
          fx += (dx / d) * p.maxSpeed * p.wAvoid * t;
          fy += (dy / d) * p.maxSpeed * p.wAvoid * t;
        }
      }

      /* ---- the player's light : an attractor with a soft core ----- */
      const L = world.lure;
      if (L && L.active) {
        const dx = L.x - x, dy = L.y - y;
        const d = Math.hypot(dx, dy);
        const R = p.rLure * L.power;
        if (d < R && d > 1e-4) {
          // attract from afar, but refuse to collapse into a singularity
          const t = 1 - d / R;
          const core = d < 34 ? -1.1 : 1;
          fx += (dx / d) * p.maxSpeed * p.wLure * t * L.power * core;
          fy += (dy / d) * p.maxSpeed * p.wLure * t * L.power * core;
        }
      }

      /* ---- soft bounds (never wrap: wrapping reads as a bug) ------ */
      const m0 = p.margin;
      if (x < m0) fx += (m0 - x) * p.wBounds;
      else if (x > this.w - m0) fx -= (x - (this.w - m0)) * p.wBounds;
      if (y < m0) fy += (m0 - y) * p.wBounds;
      else if (y > this.h - m0) fy -= (y - (this.h - m0)) * p.wBounds;

      /* ---- clamp force, integrate, clamp speed -------------------- */
      const fm = Math.hypot(fx, fy);
      if (fm > p.maxForce) { const k = p.maxForce / fm; fx *= k; fy *= k; }

      let nvx = vxi + fx * dt;
      let nvy = vyi + fy * dt;

      const st = Math.max(this.stress[i] - p.stressDecay * dt, panic);
      this.stress[i] = clamp(st, 0, 1);

      const vmax = p.maxSpeed * lerp(1, p.panicSpeedBoost, this.stress[i]);
      const nsp = Math.hypot(nvx, nvy);
      if (nsp > vmax) { const k = vmax / nsp; nvx *= k; nvy *= k; }
      else if (nsp < p.minSpeed) {
        const k = p.minSpeed / (nsp || 1e-6); nvx *= k; nvy *= k;
      }

      this.vx[i] = nvx; this.vy[i] = nvy;

      const nx = this.px[i] + nvx * dt;
      const ny = this.py[i] + nvy * dt;
      this.tx[i] = lerp(this.tx[i], this.px[i], 0.45);
      this.ty[i] = lerp(this.ty[i], this.py[i], 0.45);
      this.px[i] = clamp(nx, -40, this.w + 40);
      this.py[i] = clamp(ny, -40, this.h + 40);
      this.phase[i] += dt * (6 + nsp * 0.05);
    }

    this.stat.neighbourTests = tests;
    this.stat.neighbourHits = hits;
    this.stat.simMs = performance.now() - t0;
  }

  /* Order parameter phi: mean normalised velocity.
   * 1.0 = perfectly polarised school, 0.0 = disordered swarm.
   * Straight out of the statistical-physics literature on flocking. */
  polarisation() {
    let sx = 0, sy = 0;
    const n = this.n;
    if (!n) return 0;
    for (let i = 0; i < n; i++) {
      const s = Math.hypot(this.vx[i], this.vy[i]) || 1;
      sx += this.vx[i] / s; sy += this.vy[i] / s;
    }
    return Math.hypot(sx, sy) / n;
  }

  centroid(out) {
    let sx = 0, sy = 0; const n = this.n;
    for (let i = 0; i < n; i++) { sx += this.px[i]; sy += this.py[i]; }
    out.x = n ? sx / n : 0; out.y = n ? sy / n : 0;
    return out;
  }
}

global.SwarmEngine = SwarmEngine;

})(typeof window !== 'undefined' ? window : globalThis);
