/* Correctness + perf harness for SwarmEngine, plus SVG bake validation.
 * Run: node test/headless.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { performance: { now: () => Number(process.hrtime.bigint()) / 1e6 }, Math, console };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/engine.js'), 'utf8'), sandbox);
const SwarmEngine = sandbox.SwarmEngine;
if (typeof SwarmEngine !== 'function') {
  console.error('FATAL: engine.js did not export SwarmEngine onto the global');
  process.exit(1);
}

let fail = 0;
const ok = (name, cond, extra) => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (extra ? '   ' + extra : ''));
  if (!cond) fail++;
};

const W = 800, H = 1200;
const sw = new SwarmEngine(1200, W, H);
for (let i = 0; i < 700; i++) sw.spawn(Math.random() * W, Math.random() * H);
const world = { predators: [], obstacles: [], lure: { x: W / 2, y: H / 2, power: 1, active: true } };

console.log('\n=== 1. counting sort integrity ===');
sw.buildGrid();
const nc = sw.cols * sw.rows;
ok('cellStart[0] === 0', sw.counts[0] === 0);
ok('cellStart[last] === n', sw.counts[nc] === sw.n, sw.counts[nc] + ' vs ' + sw.n);
let mono = true;
for (let c = 0; c < nc; c++) if (sw.counts[c] > sw.counts[c + 1]) mono = false;
ok('prefix array is monotonic', mono);
const seen = new Set();
let bucketOk = true;
for (let c = 0; c < nc; c++) {
  for (let k = sw.counts[c]; k < sw.counts[c + 1]; k++) {
    const idx = sw.sorted[k];
    if (sw.cellOf[idx] !== c) bucketOk = false;
    seen.add(idx);
  }
}
ok('every agent lands in its own cell', bucketOk);
ok('every agent appears exactly once', seen.size === sw.n, seen.size + ' of ' + sw.n);

console.log('\n=== 2. numerical stability (1800 steps) ===');
for (let f = 0; f < 1800; f++) sw.step(1 / 60, world);
let bad = 0, inB = 0;
for (let i = 0; i < sw.n; i++) {
  if (!Number.isFinite(sw.px[i]) || !Number.isFinite(sw.vx[i])) bad++;
  if (sw.px[i] >= -45 && sw.px[i] <= W + 45 && sw.py[i] >= -45 && sw.py[i] <= H + 45) inB++;
}
ok('no NaN / Infinity in state', bad === 0, bad + ' bad');
ok('all agents contained by soft bounds', inB === sw.n, inB + '/' + sw.n);

console.log('\n=== 3. emergence: does it actually flock? ===');
/* Global polarisation is the WRONG metric here. In a domain this large the
 * swarm settles into several sub-flocks heading different ways, so the
 * global vector sum cancels out (measured 0.16-0.50 across seeds) even
 * though each sub-flock is tightly ordered. Local order - the mean cosine
 * between an agent and its actual neighbours - is what "is it flocking?"
 * really means, and it is stable at 0.73-0.85. */
function localOrder(sw) {
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

/* Run several seeds so a lucky start cannot make this pass. */
let worst = 1, best = 0;
for (let run = 0; run < 4; run++) {
  const s2 = new SwarmEngine(400, W, H);
  for (let i = 0; i < 300; i++) s2.spawn(Math.random() * W, Math.random() * H);
  const w2 = { predators: [], obstacles: [], lure: { active: false } };
  const l0 = localOrder(s2);
  for (let f = 0; f < 900; f++) s2.step(1 / 60, w2);
  const l1 = localOrder(s2);
  if (l1 < worst) worst = l1;
  if (l1 > best) best = l1;
  if (run === 0) ok('starts disordered (|local| < 0.15)', Math.abs(l0) < 0.15, l0.toFixed(3));
}
ok('local order rises above 0.6 on every seed', worst > 0.6,
   'worst ' + worst.toFixed(3) + ', best ' + best.toFixed(3));

console.log('\n=== 4. spatial hash vs brute force ===');
const s3 = new SwarmEngine(1500, W, H);
for (let i = 0; i < 1000; i++) s3.spawn(Math.random() * W, Math.random() * H);
for (let f = 0; f < 30; f++) s3.step(1 / 60, world);
const tests = s3.stat.neighbourTests, naive = s3.n * s3.n;
console.log('        pair tests/frame  ' + tests.toLocaleString());
console.log('        naive O(n^2)      ' + naive.toLocaleString());
console.log('        reduction         ' + ((1 - tests / naive) * 100).toFixed(1) + '%');
ok('hash cuts >80% of pair tests', tests < naive * 0.2);

console.log('\n=== 5. deterministic bake ===');
const { simulate, buildSvg } = require('../tools/bake-svg');
const sample = {
  user: 'x', name: 'x', followers: 1, publicRepos: 3,
  fish: [
    { name: 'a', lang: 'C#', color: '#178600', stars: 3, forks: 0, size: 8, pace: 1, dormant: false, ageDays: 5 },
    { name: 'b', lang: 'Go', color: '#00ADD8', stars: 1, forks: 0, size: 6, pace: 0.45, dormant: true, ageDays: 400 },
    { name: 'c', lang: 'Lua', color: '#000080', stars: 0, forks: 0, size: 6, pace: 1, dormant: false, ageDays: 20 },
  ],
  generated: 'fixed',
};
const t1 = simulate(sample);
const t2 = simulate(sample);
ok('same profile bakes the same swim', JSON.stringify(t1) === JSON.stringify(t2));
const svg = buildSvg(sample, t1);
ok('svg has an xml root', svg.startsWith('<svg') && svg.endsWith('</svg>'));
ok('svg contains animateMotion', svg.includes('<animateMotion'));
ok('svg has no <script>', !/<script/i.test(svg));
ok('one path per fish', (svg.match(/<animateMotion/g) || []).length >= sample.fish.length);

console.log('\n' + (fail === 0 ? 'ALL CHECKS PASSED' : fail + ' CHECK(S) FAILED') + '\n');
process.exit(fail ? 1 : 0);
