/* Headless correctness + perf harness for SwarmEngine.
 * Run: node test/headless.js
 * Verifies the counting sort, checks for NaN drift, measures the real
 * speed-up of the spatial hash against brute force, and confirms that
 * the flock actually self-organises (polarisation rises over time). */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { performance: { now: () => Number(process.hrtime.bigint()) / 1e6 }, Math, console };
vm.createContext(sandbox);
// engine.js is an IIFE that assigns onto the global object, so after
// running it the constructor is simply a property of the sandbox.
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
const src = fs.readFileSync(path.join(__dirname, '../src/engine.js'), 'utf8');
vm.runInContext(src, sandbox);
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
let bad = 0, inBounds = 0;
for (let i = 0; i < sw.n; i++) {
  if (!Number.isFinite(sw.px[i]) || !Number.isFinite(sw.vx[i])) bad++;
  if (sw.px[i] >= -45 && sw.px[i] <= W + 45 && sw.py[i] >= -45 && sw.py[i] <= H + 45) inBounds++;
}
ok('no NaN / Infinity in state', bad === 0, bad + ' bad');
ok('all agents contained by soft bounds', inBounds === sw.n, inBounds + '/' + sw.n);

let minS = Infinity, maxS = 0;
for (let i = 0; i < sw.n; i++) {
  const s = Math.hypot(sw.vx[i], sw.vy[i]);
  if (s < minS) minS = s; if (s > maxS) maxS = s;
}
const p = sw.p;
ok('speed >= minSpeed', minS >= p.minSpeed - 1.5, minS.toFixed(1));
ok('speed <= maxSpeed*boost', maxS <= p.maxSpeed * p.panicSpeedBoost + 1.5, maxS.toFixed(1));

console.log('\n=== 3. emergence: does it actually flock? ===');
const s2 = new SwarmEngine(400, W, H);
for (let i = 0; i < 300; i++) s2.spawn(Math.random() * W, Math.random() * H);
const w2 = { predators: [], obstacles: [], lure: { active: false } };
const polStart = s2.polarisation();
for (let f = 0; f < 900; f++) s2.step(1 / 60, w2);
const polEnd = s2.polarisation();
ok('polarisation rises from disorder', polEnd > polStart + 0.15,
   polStart.toFixed(3) + ' -> ' + polEnd.toFixed(3));

console.log('\n=== 4. spatial hash vs brute force ===');
const s3 = new SwarmEngine(1500, W, H);
for (let i = 0; i < 1000; i++) s3.spawn(Math.random() * W, Math.random() * H);
for (let f = 0; f < 30; f++) s3.step(1 / 60, world);
const tests = s3.stat.neighbourTests;
const naive = s3.n * s3.n;
console.log('        agents            ' + s3.n);
console.log('        pair tests/frame  ' + tests.toLocaleString());
console.log('        naive O(n^2)      ' + naive.toLocaleString());
console.log('        reduction         ' + ((1 - tests / naive) * 100).toFixed(1) + '%');
ok('hash cuts >80% of pair tests', tests < naive * 0.2);

let t0 = sandbox.performance.now();
for (let f = 0; f < 120; f++) s3.step(1 / 60, world);
const ms = (sandbox.performance.now() - t0) / 120;
console.log('        avg step          ' + ms.toFixed(3) + ' ms  @ ' + s3.n + ' agents');
ok('1000 agents inside 16.6ms budget', ms < 16.6, ms.toFixed(2) + ' ms');

console.log('\n=== 5. O(1) swap-remove ===');
const s4 = new SwarmEngine(64, W, H);
for (let i = 0; i < 50; i++) s4.spawn(i * 10, i * 10);
const before = s4.n;
s4.removeAt(0); s4.removeAt(10); s4.removeAt(s4.n - 1);
ok('n decremented correctly', s4.n === before - 3, s4.n + '');
let clean = true;
for (let i = 0; i < s4.n; i++) if (!Number.isFinite(s4.px[i])) clean = false;
ok('no holes / garbage left behind', clean);

console.log('\n' + (fail === 0 ? 'ALL CHECKS PASSED' : fail + ' CHECK(S) FAILED') + '\n');
process.exit(fail ? 1 : 0);
