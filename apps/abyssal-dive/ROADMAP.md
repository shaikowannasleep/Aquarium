# Roadmap

Where this goes next, roughly in the order that makes sense to build.

---

## Done

- Boids core: uniform grid, counting sort, SoA, topological neighbours
- Flow field: multi-source Dijkstra, gradient, bilinear sampling
- Seeded level generation with a solvability repair pass
- Lamp: 5 charges, all-or-nothing refill, 0.4s aim to spend one
- Hunter: dazzle, three-stun frenzy, exhaustion window
- A dazzled hunter cannot feed, even on contact
- Three cover types: rock, coral, kelp (kelp passable by fish only)

---

## Next: more ways out

The brief was "nhieu duong thoat cho ca" - more escape routes. Cover was
step one. These are the obvious follow-ups, each of which composes with
the flow field rather than fighting it:

### Currents
A vector field layered on top of the flow field: fast water that carries
the school along a lane. Cheap to add (it is one more steering force) and
it gives the map direction without walls. The interesting part is that a
current pushing *against* safety is a puzzle, not a bug.

### Linked crevices
Two refuges joined by a tunnel. Fish that enter one can surface at the
other, which means a full crevice stops being a dead end. Implementation
is a zero-cost edge in the Dijkstra expansion between the two mouths.

### Breakable coral
Coral the hunter smashes through when frenzied, permanently opening a
route. The field already rebuilds in 0.64 ms, so re-rasterising mid-run
costs nothing. Turns the frenzy into something that changes the map
instead of only changing the clock.

### Bioluminescent bait
A one-use decoy the player drops: a light that stays put and holds the
hunter's attention for a few seconds. Gives the lamp economy a second
verb that is not "stun".

---

## Later: the dive

The original idea was a descent through the real ocean layers, each with
its own fauna. That is a bigger piece of work and probably a separate
mode, but the pieces fit:

| Layer | Depth | What changes |
|---|---|---|
| Epipelagic | 0-200 m | dense schools, bright water, teaching level |
| Mesopelagic | 200-1000 m | lanternfish, vertical migration, first darkness |
| Bathypelagic | 1000-4000 m | solitary hunters, no schools to shepherd |
| Abyssopelagic | 4000-6000 m | near-motionless benthic life, quiet ending |

Most deep-sea bioluminescence sits around 470-490 nm because that is the
wavelength that travels furthest in seawater. The palette is decided by
physics, which is a better reason than taste.

---

## Testing notes

The bot harness (`test/playable.test.js`, `test/frenzy.test.js`) plays
dozens of complete games and takes minutes. It is deliberately kept out
of the default `npm test` and out of CI on push - run it by hand when
balance changes, not on every commit.

The fast suites (`flowfield`, `level`) finish in seconds and do run on
every push, because they protect correctness rather than feel.
