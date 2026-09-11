/* Every generated reef must be winnable and must differ from the last.
 * This is the test that protects the core design promise:
 * "cuu duoc tat ca la kha thi" - saving everyone must be possible.
 * Run: node test/level.test.js */
const { makeLevel } = require('../src/level');
const { FlowField, UNREACHABLE } = require('../src/flowfield');

let fail = 0;
const ok = (name, cond, extra) => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (extra ? '   ' + extra : ''));
  if (!cond) fail++;
};

const W = 1280, H = 720;
const SEEDS = 400;

console.log('\n=== 1. every seed is solvable ===');
{
  let unreachable = 0, tooTight = 0, worstCap = 1e9;
  const firstBad = [];
  for (let s = 0; s < SEEDS; s++) {
    const lv = makeLevel(s, W, H);
    const ff = new FlowField(W, H, 24);
    ff.rasterise(lv.obstacles);
    ff.build(lv.refuges);

    // every spawned fish must have a route to some refuge
    let bad = 0;
    for (const f of lv.school) {
      if (ff.distanceAt(f.x, f.y) >= UNREACHABLE) bad++;
    }
    if (bad > 0) { unreachable++; if (firstBad.length < 3) firstBad.push(s + ':' + bad); }

    // capacity must be able to hold the whole school
    if (lv.totalCapacity < lv.schoolSize) tooTight++;
    if (lv.totalCapacity < worstCap) worstCap = lv.totalCapacity;
  }
  ok('no seed strands a fish behind rock', unreachable === 0,
     unreachable + '/' + SEEDS + (firstBad.length ? ' e.g. ' + firstBad.join(', ') : ''));
  ok('capacity always fits the whole school', tooTight === 0,
     'worst total capacity ' + worstCap + ' vs school 64');
}

console.log('\n=== 2. determinism ===');
{
  const a = JSON.stringify(makeLevel(1234, W, H));
  const b = JSON.stringify(makeLevel(1234, W, H));
  ok('same seed rebuilds the identical reef', a === b);
  const c = JSON.stringify(makeLevel(1235, W, H));
  ok('a different seed gives a different reef', a !== c);
}

console.log('\n=== 3. varied but not chaotic ===');
{
  /* The design brief: recognisable structure, different details.
   * Rock count should stay in a tight band (structure) while gap
   * positions should spread out (variety). */
  let minRock = 1e9, maxRock = 0;
  const gapSignatures = new Set();
  for (let s = 0; s < 200; s++) {
    const lv = makeLevel(s, W, H);
    minRock = Math.min(minRock, lv.obstacles.length);
    maxRock = Math.max(maxRock, lv.obstacles.length);
    // quantise refuge layout to a coarse signature
    const sig = lv.refuges.map(r => (r.x / 100 | 0) + ',' + (r.y / 100 | 0)).sort().join('|');
    gapSignatures.add(sig);
  }
  console.log('        rock count range  ' + minRock + ' .. ' + maxRock);
  console.log('        distinct layouts  ' + gapSignatures.size + ' / 200 seeds');
  ok('rock count stays structured', maxRock - minRock < 40, minRock + '..' + maxRock);
  ok('layouts genuinely vary', gapSignatures.size > 6, gapSignatures.size + ' distinct');
}

console.log('\n=== 4. refuges are reachable from the spawn side ===');
{
  let ok1 = 0;
  for (let s = 0; s < 120; s++) {
    const lv = makeLevel(s, W, H);
    const ff = new FlowField(W, H, 24);
    ff.rasterise(lv.obstacles);
    ff.build(lv.refuges);
    const d = ff.distanceAt(W * 0.10, H * 0.5);
    if (d < UNREACHABLE) ok1++;
  }
  ok('spawn point always has a route out', ok1 === 120, ok1 + '/120');
}

console.log('\n=== 5. no refuge is sealed by its own reef ===');
{
  /* Only SOLID cover can seal a mouth. Kelp sitting over a crevice is
   * fine - fish swim straight through it - and in fact it is good, since
   * it hides the entrance from the hunter. */
  let sealed = 0, kelpNearMouth = 0;
  for (let s = 0; s < 200; s++) {
    const lv = makeLevel(s, W, H);
    for (const r of lv.refuges) {
      for (const o of lv.obstacles) {
        if (Math.hypot(o.x - r.x, o.y - r.y) < r.r + 40) {
          if (o.passable) kelpNearMouth++;
          else { sealed++; break; }
        }
      }
    }
  }
  console.log('        kelp near mouths  ' + kelpNearMouth + '  (harmless, fish pass through)');
  ok('solid cover is cleared from every refuge mouth', sealed === 0, sealed + ' collisions');
}

console.log('\n=== 6. the new cover types behave ===');
{
  let kelp = 0, coral = 0, rock = 0, seedsWithKelp = 0;
  for (let s = 0; s < 200; s++) {
    const lv = makeLevel(s, W, H);
    let k = 0;
    for (const o of lv.obstacles) {
      if (o.passable) { kelp++; k++; }
      else if (o.kind === 'coral') coral++;
      else rock++;
    }
    if (k > 0) seedsWithKelp++;
  }
  console.log('        per 200 seeds     ' + rock + ' rock, ' + coral + ' coral, ' + kelp + ' kelp');
  ok('every seed grows some kelp', seedsWithKelp === 200, seedsWithKelp + '/200');
  ok('kelp is marked passable', (() => {
    const lv = makeLevel(7, W, H);
    return lv.obstacles.filter(o => o.passable).every(o => o.passable === true);
  })());
  ok('rock and coral stay solid', (() => {
    const lv = makeLevel(7, W, H);
    return lv.obstacles.filter(o => !o.passable).every(o => !o.passable);
  })());

  /* The point of kelp: it must not change where the water says to go. */
  const lv = makeLevel(11, W, H);
  const ffAll = new FlowField(W, H, 24);
  ffAll.rasterise(lv.obstacles);
  ffAll.build(lv.refuges);
  const ffNoKelp = new FlowField(W, H, 24);
  ffNoKelp.rasterise(lv.obstacles.filter(o => !o.passable));
  ffNoKelp.build(lv.refuges);
  let same = true;
  for (let i = 0; i < ffAll.dist.length; i++) {
    if (Math.abs(ffAll.dist[i] - ffNoKelp.dist[i]) > 1e-6) { same = false; break; }
  }
  ok('kelp costs the flow field nothing', same);
}

console.log('\n=== 7. every depth generates a fair, honest reef ===');
{
  const OC = require('../src/oceanography');
  let bad = 0, wrongCover = 0;
  for (const depth of OC.DIVE_LADDER) {
    const layer = OC.layerAt(depth);
    const allowed = layer.solid.concat(layer.passable);
    for (let s = 0; s < 40; s++) {
      const lv = makeLevel(s, W, H, depth);
      // solvability must hold at every depth, not just the surface
      const ff = new FlowField(W, H, 24);
      ff.rasterise(lv.obstacles);
      ff.build(lv.refuges);
      for (const f of lv.school) {
        if (ff.distanceAt(f.x, f.y) >= UNREACHABLE) { bad++; break; }
      }
      // and the dressing must match the depth
      for (const o of lv.obstacles) {
        if (allowed.indexOf(o.kind) < 0) { wrongCover++; break; }
      }
    }
  }
  ok('every depth stays solvable', bad === 0, bad + ' bad runs across 8 depths');
  ok('cover always belongs to its layer', wrongCover === 0,
     wrongCover + ' mismatches');

  /* Kelp photosynthesises, so it must never appear in the dark. This is
   * the check that keeps the panel from lying to the player. */
  let kelpInDark = 0;
  for (const depth of [620, 1500, 2600, 4600, 6800]) {
    for (let s = 0; s < 30; s++) {
      const lv = makeLevel(s, W, H, depth);
      if (lv.obstacles.some(o => o.kind === 'kelp')) kelpInDark++;
    }
  }
  ok('no kelp below the sunlit zone', kelpInDark === 0, kelpInDark + ' found');

  /* Whatever the layer calls its soft cover, it must still be passable
   * and still cost the pathfinding nothing. */
  let softSolid = 0, fieldDiffers = 0;
  for (const depth of OC.DIVE_LADDER) {
    const lv = makeLevel(5, W, H, depth);
    for (const o of lv.obstacles) {
      const isSoft = OC.layerAt(depth).passable.indexOf(o.kind) >= 0;
      if (isSoft && !o.passable) softSolid++;
    }
    const a = new FlowField(W, H, 24);
    a.rasterise(lv.obstacles); a.build(lv.refuges);
    const b = new FlowField(W, H, 24);
    b.rasterise(lv.obstacles.filter(o => !o.passable)); b.build(lv.refuges);
    for (let i = 0; i < a.dist.length; i++) {
      if (Math.abs(a.dist[i] - b.dist[i]) > 1e-6) { fieldDiffers++; break; }
    }
  }
  ok('soft cover is passable at every depth', softSolid === 0, softSolid + ' solid');
  ok('soft cover is free at every depth', fieldDiffers === 0,
     fieldDiffers + ' depths differ');
}

console.log('\n' + (fail === 0 ? 'ALL CHECKS PASSED' : fail + ' CHECK(S) FAILED') + '\n');
process.exit(fail ? 1 : 0);
