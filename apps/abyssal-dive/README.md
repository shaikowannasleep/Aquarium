# Abyssal Dive

One lamp. Two jobs. You cannot do both at once.

You are a diver with a single light. The school follows it. The hunter is
dazzled by it. Every second the lamp spends blinding the predator is a
second it is not leading anyone to safety — and the crevices only hold so
many.

**Saving all 64 is possible.** It is not the default outcome.

---

## The design problem

The brief was specific:

- the whole school *can* be saved, but only by someone who plans
- the layout must not be so random that it is unlearnable, nor so fixed
  that one memorised route always works
- the school must be able to reach shelter **without any fish knowing
  where shelter is** — real fish do not carry a map

That last one is the interesting one.

## Where the knowledge lives

Not in the fish. In the water.

A Dijkstra wavefront expands once from every open crevice across a coarse
grid, producing a cost-to-nearest-refuge per cell. The gradient of that
field is a direction baked into the world. A fish never pathfinds. It
reads the one cell it is sitting in — a single array lookup — and drifts
with it when calm, runs with it when frightened.

So the school finds the gap the way a real one would: by following the
flow of the water and each other. When a crevice fills, it closes, the
field is rebuilt in **0.64 ms**, and the water quietly starts pointing
somewhere else. Nothing is told. Everything re-routes.

This is the flow-field trick from RTS pathfinding — one wavefront serves
any number of agents, instead of one A\* per agent per frame.

## Boids on top

The three Reynolds rules (separation, alignment, cohesion) run underneath,
with a uniform grid and counting sort for neighbour search, topological
neighbour capping at 7 per Ballerini et al. 2008, and structure-of-arrays
state with O(1) swap-remove. The flow field is just one more steering
force added to the mix — which is the whole reason this composes so
cleanly.

## The reef

Fixed skeleton, jittered joints. Three bands of rock always form a
corridor; what changes per seed is gap width, which gap is the generous
one, refuge count and capacity, and where the hunter enters. Recognisable
in a second, never the same twice.

Generation can occasionally seal a pocket, so every level runs a repair
pass: find the boulder responsible for a stranded spawn, remove it,
re-check. Across 400 seeds, **zero strand a fish** and the repair never
has to touch more than a handful of rocks.

---

## Verified by a bot that plays it

The design promise is not a claim in a readme, it is a test. A scripted
shepherd — no foresight, never splits the school on purpose, never banks
a dazzle — plays 60 seeds:

```
=== 1. a plain strategy can save everyone ===
        perfect runs      1/60  (2%)
        mean saved        47.1/64
  PASS  a no-loss run is reachable by a plain strategy
  PASS  but perfect is not the default outcome
  PASS  most runs save the majority
  PASS  few runs leave fish swimming at the bell   0/60 timeouts

=== 2. the dazzle actually matters ===
        per-seed          26 better, 19 worse, 5 level
  PASS  spending the lamp on the hunter wins more often than it loses

=== 3. outcomes vary across seeds ===
        saved range       25 .. 63
  PASS  one memorised line does not fit every reef
```

The bot is a **floor, not a ceiling**. If a strategy this plain already
rescues 47 of 64 and can occasionally take all of them, the headroom above
it belongs to the player.

### Three bugs this harness caught

**The lamp was pushing fish out of the crevice.** The lure carries a
repulsive core so a held finger cannot collapse the school into a
singularity. That core was 34px. Refuge mouths were 32px. With the hunter
removed entirely and the lamp parked directly on a refuge, only 10 of 64
ever got in. The core now sits at 15px, well inside any mouth.

**The school only moved when it was scared.** The flow hint was gated on
stress, so a calm school ignored the water completely and shepherding was
impossible. Calm fish now drift with the current; frightened ones run with
it.

**`SAME SEED` never worked.** `makeLevel` is seeded, but `spawn()` draws
heading and tail phase from `Math.random`, so the same seed produced a
different school every time. This also made the harness report 0 or 1
perfect runs at random. `Math.random` is now pinned across setup — two
consecutive full runs return byte-identical statistics.

---

## Running it

```bash
node test/flowfield.test.js    # 13 checks on the wavefront
node test/level.test.js        # every seed solvable, 400 seeds
node test/playable.test.js     # the bot plays: can everyone be saved?
node test/frenzy.test.js       # the lamp economy and the frenzy cycle
node build.js                  # -> dist/index.html
```

`dist/index.html` is a single self-contained file. No server, no
dependencies, no assets — open it directly from disk.

## Layout

```
src/flowfield.js   Dijkstra wavefront + gradient sampling
src/level.js       seeded generation + solvability repair
src/engine.js      boids: grid, counting sort, SoA
src/game.js        lamp, dazzle, hunter, crevices
test/              the three suites above
build.js           inlines everything, guards against file:// blockers
```
