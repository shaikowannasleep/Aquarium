# LUMEN — a playable ad where Boids *is* the gameplay

> **Design thesis:** in almost every shipped game, flocking is decoration.
> Here the three Reynolds rules are the three levels. The player never
> controls a fish. They control a light, and the emergent behaviour does
> the rest.

---

## 1. Why this is a portfolio piece and not a boids demo

Most "boids showcases" are a screen full of triangles with sliders. A
recruiter has seen forty of them. What is scarce is someone who can show:

| Signal | How this build proves it |
|---|---|
| Understands the algorithm | Topological neighbours (7), FOV blind spot, inverse-square separation |
| Understands *shipping* it | SoA typed arrays, counting-sort spatial hash, zero per-frame allocation |
| Understands game design | Each rule is turned into a distinct, teachable player verb |
| Understands the ad format | Single file, 0 requests, 3 beats, sub-20s to CTA, no engine |
| Can prove the claims | Headless test harness with real measured numbers |

The **TECH** button in the corner is the flex: it draws the live
separation / alignment / cohesion vectors on a tracked agent and streams
real counters. It proves the swarm is simulated, not animated.

---

## 2. The three beats

| Beat | Rule taught | Player verb | Failure pressure |
|---|---|---|---|
| **01 Cohesion** | centre-of-mass attraction | hold light, gather 9 scattered pods into the sanctuary | none — this beat teaches |
| **02 Separation** | inverse-square crowding | lead the school through a rock corridor | agents crushed on geometry are lost |
| **03 Alignment** | velocity matching | keep order parameter **φ > 0.72** for 7s while a hunter charges | stragglers get eaten |

The light is an attractor with a **repulsive core** (inside 34px the sign
flips). Without that, holding the finger still collapses the whole school
into one pixel and the illusion dies instantly. That single line is the
difference between a demo and a game.

---

## 3. Engineering notes

### Neighbour search
Uniform grid + **counting sort**, rebuilt each frame:

```
count occupancies -> prefix sum -> scatter -> restore cellStart
```

`counts[]` doubles as the write cursor during scatter and is then shifted
back, so the whole grid build is allocation-free. Only the 3×3 cell
neighbourhood is scanned, and the scan aborts at 7 accepted neighbours
(`break outer`) — this is *topological*, matching Ballerini et al. 2008
on starlings, and it also caps the worst case in dense clumps.

Measured at 1000 agents: **20,352 pair tests/frame vs 1,000,000 naive → 98.0% reduction**.

### Stability
- Fixed 1/60 timestep with an accumulator and a 5-step guard, so physics
  does not change with refresh rate.
- `maxForce` clamp before integration, then a `[minSpeed, maxSpeed]` clamp
  after. Dropping `minSpeed` is the single most common cause of a flock
  freezing into a blob.
- Soft bounds that push inward. Wrap-around reads to a player as a bug.
- Verified over 1800 steps: no NaN, no escapes, speeds inside envelope.

### Art direction driven by simulation
Each agent carries a `stress` channel raised by predator proximity and
decayed over time. Hue lerps cyan → amber and `maxSpeed` gains a 1.55×
panic boost. The flash-expansion you see when the hunter hits the school
is not authored — it falls out of separation spiking while stress raises
the speed ceiling.

---

## 4. Verified numbers

```
counting sort integrity ........ PASS (5/5 invariants)
1800-step stability ............ PASS (0 NaN, 700/700 contained)
emergence (φ 0.061 -> 0.345) ... PASS
pair-test reduction ............ 98.0%
step cost @1000 agents ......... 6.25 ms  (60fps budget 16.6)
O(1) swap-remove ............... PASS
```

Reproduce: `node test/headless.js`

---

## 5. Build

```bash
node build.js      # -> dist/index.html, fully self-contained
node test/headless.js
python3 -m http.server 8080 -d src   # live dev
```

No engine, no framework, no assets, no network calls. Audio is synthesised
from oscillators at runtime, so there is not a single byte of media in
the bundle.

---

## 6. Talking points for the interview

1. **"Why topological instead of metric neighbours?"** — Metric breaks in
   dense clumps (cost explodes, and real starlings don't do it). Topological
   keeps cost bounded and density-invariant.
2. **"Why is separation weighted highest with the smallest radius?"** —
   Collision avoidance must dominate locally but must not fight cohesion
   globally, otherwise the flock oscillates.
3. **"Why does the lure repel at the core?"** — Prevents the singularity
   collapse; also creates the orbiting halo that reads as "alive".
4. **"How would this scale to 50k?"** — Same grid, moved to a compute
   shader: build the hash with a GPU prefix scan, double-buffer positions,
   one thread per agent. The CPU structure here is already SoA, so the
   port is mechanical.
5. **"Would you run this server-authoritative in multiplayer?"** — No.
   Float divergence desyncs instantly. Flocking stays client-side cosmetic
   unless you quantise to fixed-point.
