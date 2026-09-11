'use strict';
/* =====================================================================
 * ABYSSAL DIVE :: Level generation
 * ---------------------------------------------------------------------
 * The replay requirement, in the player's words: "khong nen lam quy dao
 * ca qua random nhung moi lan choi lai phai khac khac 1 ti".
 *
 * So the layout is not random and it is not fixed. It is a fixed SKELETON
 * with jittered joints:
 *
 *   - the reef always forms a corridor with two or three viable routes
 *   - refuges always exist, and there are always fewer than the school
 *     needs, so the choice of who to save is forced
 *   - what moves between runs is the width of each gap, which refuge is
 *     the generous one, and where the hunter first appears
 *
 * The result is a level you can learn but cannot memorise. A player who
 * has understood the flow field will read a new layout in a second; a
 * player who memorised one route will be caught out.
 * ===================================================================== */

/* Deterministic PRNG: same seed, same reef. Lets a player share a seed
 * and lets the test suite assert on generated layouts. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeLevel(seed, W, H, depth) {
  const rnd = mulberry32(seed);
  const R = (a, b) => a + rnd() * (b - a);

  /* Which cover exists is decided by depth, not by taste. Kelp needs
   * sunlight, so it cannot appear below the epipelagic; the deep gets
   * glass sponges and xenophyophores instead. Same mechanics, honest
   * dressing. */
  const OC = (typeof require !== 'undefined')
    ? require('./oceanography')
    : (typeof window !== 'undefined' ? window.OCEAN : null);
  const d = depth === undefined ? 140 : depth;
  const layer = OC ? OC.layerAt(d) : null;
  const solidKinds = layer ? layer.solid : ['rock', 'coral'];
  const softKind = layer ? layer.passable[0] : 'kelp';

  const obstacles = [];
  const refuges = [];

  /* --- the reef: three bands of rock, each with one or two gaps ------
   * Band positions are fixed so the player always reads left-to-right.
   * Gap centres and widths jitter, so the route changes every run. */
  const bands = 3;
  for (let b = 0; b < bands; b++) {
    const bx = W * (0.30 + b * 0.185);
    const gapCount = b === 1 ? 2 : 1;

    // choose gap centres, keeping them apart
    const gaps = [];
    if (gapCount === 1) {
      gaps.push(R(H * 0.22, H * 0.78));
    } else {
      gaps.push(R(H * 0.14, H * 0.38));
      gaps.push(R(H * 0.62, H * 0.86));
    }
    // one gap per band is generous, the rest are tight
    const generous = (rnd() * gapCount) | 0;

    for (let y = -10; y < H + 40; y += 40) {
      let inGap = false;
      for (let k = 0; k < gaps.length; k++) {
        const halfWidth = (k === generous ? R(74, 96) : R(46, 62));
        if (Math.abs(y - gaps[k]) < halfWidth) { inGap = true; break; }
      }
      if (inGap) continue;
      obstacles.push({
        kind: 'rock',
        x: bx + R(-16, 16),
        y: y + R(-8, 8),
        r: R(24, 34),
        spin: rnd() * Math.PI * 2,
        seedShape: (rnd() * 1000) | 0,
      });
    }

    /* Kelp curtains hang in the gaps. Fish slip through; the hunter is
     * too big and has to go round. This is the second escape route the
     * brief asked for - a gap that is only a gap if you are small. */
    for (let k = 0; k < gaps.length; k++) {
      if (rnd() > 0.55) continue;
      const gy = gaps[k];
      const blades = 3 + ((rnd() * 3) | 0);
      for (let b = 0; b < blades; b++) {
        obstacles.push({
          kind: softKind,
          passable: true,
          x: bx + R(-22, 22),
          y: gy + R(-46, 46),
          r: R(26, 38),
          spin: rnd() * Math.PI * 2,
          sway: rnd() * Math.PI * 2,
          seedShape: (rnd() * 1000) | 0,
        });
      }
    }
  }

  /* --- scattered boulders for texture and local cover ----------------
   * Never inside the spawn shoal: a fish that starts embedded in rock is
   * unreachable before the player has touched anything, which silently
   * breaks the promise that the whole school can be saved. */
  const extra = 5 + ((rnd() * 4) | 0);
  const secondSolid = solidKinds.length > 1 ? solidKinds[1] : solidKinds[0];
  for (let i = 0; i < extra; i++) {
    const fancy = rnd() < 0.45 && secondSolid !== 'rock';
    const kind = fancy ? secondSolid : 'rock';
    obstacles.push({
      kind,
      x: R(W * 0.24, W * 0.92),
      y: R(H * 0.10, H * 0.90),
      r: fancy ? R(22, 32) : R(20, 38),
      spin: rnd() * Math.PI * 2,
      seedShape: (rnd() * 1000) | 0,
      hue: kind === 'coral' ? R(300, 355)
         : kind === 'deepcoral' ? R(18, 44)
         : 0,
    });
  }

  /* Free-standing weed beds in open water: cover the school can duck
   * into mid-chase, away from the corridor gaps. */
  const beds = 2 + ((rnd() * 3) | 0);
  for (let i = 0; i < beds; i++) {
    const bx = R(W * 0.26, W * 0.88);
    const by = R(H * 0.14, H * 0.86);
    const blades = 4 + ((rnd() * 4) | 0);
    for (let b = 0; b < blades; b++) {
      obstacles.push({
        kind: softKind,
        passable: true,
        x: bx + R(-44, 44),
        y: by + R(-40, 40),
        r: R(24, 36),
        spin: rnd() * Math.PI * 2,
        sway: rnd() * Math.PI * 2,
        seedShape: (rnd() * 1000) | 0,
      });
    }
  }

  /* --- refuges: crevices with a finite capacity ----------------------
   * Total capacity is deliberately short of the school size. Saving the
   * whole school is possible, but only by shepherding in waves rather
   * than dumping everyone into the first hole. */
  const refugeCount = 2 + ((rnd() * 2) | 0);      // 2 or 3
  const spots = [
    { x: W * 0.93, y: H * 0.22 },
    { x: W * 0.93, y: H * 0.76 },
    { x: W * 0.62, y: H * 0.10 },
    { x: W * 0.62, y: H * 0.90 },
  ];
  // shuffle deterministically
  for (let i = spots.length - 1; i > 0; i--) {
    const j = (rnd() * (i + 1)) | 0;
    const t = spots[i]; spots[i] = spots[j]; spots[j] = t;
  }
  for (let i = 0; i < refugeCount; i++) {
    const s = spots[i];
    refuges.push({
      x: s.x + R(-24, 24),
      y: s.y + R(-20, 20),
      r: R(44, 58),
      capacity: 0,        // filled in below
      held: 0,
      closed: false,
      pulse: rnd() * Math.PI * 2,
    });
  }

  // keep solid rock away from the refuge mouths, otherwise a run can be
  // unwinnable; kelp may stay, it does not block anyone small
  for (let i = obstacles.length - 1; i >= 0; i--) {
    if (obstacles[i].passable) continue;
    for (let k = 0; k < refuges.length; k++) {
      const Rf = refuges[k];
      if (Math.hypot(obstacles[i].x - Rf.x, obstacles[i].y - Rf.y) < Rf.r + 52) {
        obstacles.splice(i, 1);
        break;
      }
    }
  }

  const schoolSize = 64;

  /* Capacity: total is between 100% and 115% of the school, but split
   * unevenly, so the player must still choose where to send whom. */
  let remaining = Math.round(schoolSize * (1.0 + rnd() * 0.15));
  for (let i = 0; i < refuges.length; i++) {
    const isLast = i === refuges.length - 1;
    const share = isLast ? remaining
      : Math.max(12, Math.round(remaining * R(0.32, 0.5)));
    refuges[i].capacity = share;
    remaining -= share;
  }

  /* --- hunter entry: always off-screen left, height varies ---------- */
  const hunter = {
    x: -120,
    y: R(H * 0.25, H * 0.75),
    vx: 0, vy: 0,
    active: true,
    scare: 1.0,
    slowUntil: 0,
    cooldownUntil: 0,
    t: 0,
    stunFlash: 0,
    stunCount: 0,       // three stuns provoke a frenzy
    frenzyUntil: 0,     // immune to the lamp, faster
    exhaustUntil: 0,    // the price it pays afterwards
  };

  /* --- school spawn: a loose shoal on the left ----------------------- */
  const school = [];
  const sx = W * 0.10, sy = H * 0.5;
  for (let i = 0; i < schoolSize; i++) {
    school.push({
      x: sx + R(-70, 70),
      y: sy + R(-130, 130),
    });
  }

  const level = {
    seed,
    depth: d,
    layer,
    softKind,
    obstacles,
    refuges,
    hunter,
    school,
    schoolSize,
    totalCapacity: refuges.reduce((s, r) => s + r.capacity, 0),
    repairs: 0,
  };

  repair(level, W, H);
  return level;
}

/* ---------------------------------------------------------------------
 * Guarantee the design promise: every fish must have a route to safety.
 *
 * Jittered generation will occasionally seal a pocket or drop a boulder
 * on a spawn point. Rather than reject the seed and reroll - which would
 * make seeds non-portable - we carve: find the rock responsible for a
 * stranded fish and take it away. Convergence is fast because removing
 * one boulder usually reopens a whole pocket.
 * ------------------------------------------------------------------- */
function repair(level, W, H) {
  const FF = (typeof require !== 'undefined')
    ? require('./flowfield').FlowField
    : (typeof window !== 'undefined' ? window.FlowField : null);
  if (!FF) return level;
  const UNREACH = (typeof require !== 'undefined')
    ? require('./flowfield').UNREACHABLE
    : window.FLOW_UNREACHABLE;

  const ff = new FF(W, H, 24);

  for (let pass = 0; pass < 24; pass++) {
    ff.rasterise(level.obstacles);
    ff.build(level.refuges);

    // collect every spawn point with no route out
    const stranded = [];
    for (const f of level.school) {
      if (ff.distanceAt(f.x, f.y) >= UNREACH) stranded.push(f);
    }
    if (!stranded.length) return level;

    /* Remove the boulder most responsible: the one closest to the most
     * stranded fish. Ties break toward the larger rock. */
    let victim = -1, bestScore = -1;
    for (let i = 0; i < level.obstacles.length; i++) {
      const o = level.obstacles[i];
      if (o.passable) continue;      // kelp never strands anyone
      let score = 0;
      for (const f of stranded) {
        const d = Math.hypot(f.x - o.x, f.y - o.y);
        if (d < o.r + 90) score += (o.r + 90 - d) / (o.r + 90);
      }
      if (score > bestScore) { bestScore = score; victim = i; }
    }
    if (victim < 0 || bestScore <= 0) break;
    level.obstacles.splice(victim, 1);
    level.repairs++;
  }
  return level;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { makeLevel, mulberry32 };
}
if (typeof window !== 'undefined') {
  window.makeLevel = makeLevel;
  window.mulberry32 = mulberry32;
}
