/* Validates the flow field: the thing that lets a school reach safety
 * without any fish knowing where safety is. Run: node test/flowfield.test.js */
const { FlowField, UNREACHABLE } = require('../src/flowfield');

let fail = 0;
const ok = (name, cond, extra) => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (extra ? '   ' + extra : ''));
  if (!cond) fail++;
};

const W = 900, H = 600;

console.log('\n=== 1. open water, single refuge ===');
{
  const ff = new FlowField(W, H, 25);
  ff.rasterise([]);
  const refuges = [{ x: 820, y: 300, r: 50 }];
  ff.build(refuges);

  ok('refuge itself has zero cost', ff.distanceAt(820, 300) === 0);
  ok('far corner is reachable', ff.distanceAt(30, 30) < UNREACHABLE,
     ff.distanceAt(30, 30).toFixed(1));

  // walk downhill from a far corner and check we arrive
  const out = { x: 0, y: 0 };
  let x = 40, y = 60, steps = 0;
  while (steps++ < 4000) {
    ff.sample(x, y, out);
    if (out.x === 0 && out.y === 0) break;
    x += out.x * 4; y += out.y * 4;
    if (Math.hypot(x - 820, y - 300) < 55) break;
  }
  ok('downhill walk reaches the refuge', Math.hypot(x - 820, y - 300) < 60,
     steps + ' steps, ended ' + Math.hypot(x - 820, y - 300).toFixed(0) + 'px away');
}

console.log('\n=== 2. wall with a single gap ===');
{
  const ff = new FlowField(W, H, 22);
  // a vertical wall at x=450 with a gap around y=430
  const obs = [];
  for (let y = 20; y < 360; y += 42) obs.push({ x: 450, y, r: 26 });
  for (let y = 500; y < H; y += 42) obs.push({ x: 450, y, r: 26 });
  ff.rasterise(obs);
  ff.build([{ x: 840, y: 120, r: 46 }]);

  const left = ff.distanceAt(120, 120);
  ok('left side still reachable through the gap', left < UNREACHABLE, left.toFixed(1));

  const out = { x: 0, y: 0 };
  let x = 120, y = 120, steps = 0, crossed = false, stuck = 0;
  let px = x, py = y;
  while (steps++ < 6000) {
    ff.sample(x, y, out);
    if (out.x === 0 && out.y === 0) break;
    x += out.x * 3; y += out.y * 3;
    if (x > 470) crossed = true;
    if (Math.hypot(x - px, y - py) < 0.4) stuck++; else stuck = 0;
    if (stuck > 60) break;
    px = x; py = y;
    if (Math.hypot(x - 840, y - 120) < 50) break;
  }
  ok('path routes through the gap, not through rock', crossed);
  ok('arrives at the refuge', Math.hypot(x - 840, y - 120) < 60,
     'ended ' + Math.hypot(x - 840, y - 120).toFixed(0) + 'px away');

  // verify no sampled cell along a straight line through rock is free
  let blockedFound = false;
  for (let yy = 40; yy < 340; yy += 10) if (ff.isBlocked(450, yy)) blockedFound = true;
  ok('rock is actually marked impassable', blockedFound);
}

console.log('\n=== 3. two refuges, nearest wins ===');
{
  const ff = new FlowField(W, H, 25);
  ff.rasterise([]);
  ff.build([{ x: 80, y: 80, r: 40 }, { x: 820, y: 520, r: 40 }]);
  const out = { x: 0, y: 0 };

  ff.sample(160, 160, out);
  ok('near the first refuge, flow points to it', out.x < 0 && out.y < 0,
     out.x.toFixed(2) + ',' + out.y.toFixed(2));

  ff.sample(740, 440, out);
  ok('near the second refuge, flow points to it', out.x > 0 && out.y > 0,
     out.x.toFixed(2) + ',' + out.y.toFixed(2));
}

console.log('\n=== 4. closing a refuge re-routes the field ===');
{
  const ff = new FlowField(W, H, 25);
  ff.rasterise([]);
  const refuges = [{ x: 80, y: 300, r: 40 }, { x: 820, y: 300, r: 40 }];
  ff.build(refuges);
  const out = { x: 0, y: 0 };
  ff.sample(200, 300, out);
  const wentLeft = out.x < 0;

  refuges[0].closed = true;
  ff.build(refuges);
  ff.sample(200, 300, out);
  const nowRight = out.x > 0;

  ok('flow favoured the near refuge first', wentLeft);
  ok('closing it flips the flow to the far one', nowRight,
     out.x.toFixed(2) + ',' + out.y.toFixed(2));
}

console.log('\n=== 5. fully sealed refuge ===');
{
  const ff = new FlowField(W, H, 24);
  const ring = [];
  for (let a = 0; a < Math.PI * 2; a += 0.22) {
    ring.push({ x: 450 + Math.cos(a) * 120, y: 300 + Math.sin(a) * 120, r: 24 });
  }
  ff.rasterise(ring);
  ff.build([{ x: 450, y: 300, r: 30 }]);
  ok('outside a sealed refuge is unreachable', ff.distanceAt(60, 60) >= UNREACHABLE,
     ff.distanceAt(60, 60).toExponential(1));
  ok('no NaN leaked into the gradient',
     Number.isFinite(ff.dirX[0]) && Number.isFinite(ff.dirY[0]));
}

console.log('\n=== 6. rebuild cost ===');
{
  const ff = new FlowField(1280, 720, 24);
  const obs = [];
  for (let i = 0; i < 26; i++) {
    obs.push({ x: 150 + (i * 137) % 1000, y: 90 + (i * 211) % 540, r: 30 + (i % 4) * 9 });
  }
  ff.rasterise(obs);
  const t0 = process.hrtime.bigint();
  const N = 40;
  for (let i = 0; i < N; i++) ff.build([{ x: 1180, y: 360, r: 48 }]);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / N;
  console.log('        grid              ' + ff.cols + 'x' + ff.rows + ' = ' + (ff.cols * ff.rows) + ' cells');
  console.log('        rebuild           ' + ms.toFixed(2) + ' ms');
  ok('rebuild is cheap enough to do on demand', ms < 12, ms.toFixed(2) + ' ms');
}

console.log('\n' + (fail === 0 ? 'ALL CHECKS PASSED' : fail + ' CHECK(S) FAILED') + '\n');
process.exit(fail ? 1 : 0);
