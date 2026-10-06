# CLAUDE.md — Dung Lab Architecture & AI Assistant Memory

> **Repository:** `shaikowannasleep/Aquarium` (Dung / Lab)  
> **Core Role:** Unity Developer · Playable Ads Engineer · Systems-minded Game Developer  
> **Architecture Philosophy:** "Small files. Living systems." Emergent multi-agent behaviors, zero per-frame memory allocation, self-contained single-file outputs, and zero external runtime requests.

---

## 1. Project Memory & Architectural Invariants

### 1.1 Non-Negotiable Hard Constraints
1. **Zero External Runtime Requests in Playable Builds:**
   - Playable ad networks (Mintegral, Unity, AppLovin, IronSource, TikTok, Google Ads) require self-contained single-file HTML builds.
   - All assets (PNG sprites, audio, stylesheets, game logic) must be inlined (base64 data URIs or procedural Web Audio synthesis).
   - Must run flawlessly from `file://` protocol or inside sandboxed `<iframe>` without any CDN or external fetch calls.
2. **Zero Per-Frame Allocation (0 GC during simulation):**
   - No `new Object()`, `new Array()`, or closure allocations inside game loops or simulation steps.
   - All flocking/boids states must use **Structure-of-Arrays (SoA)** backed by TypedArrays (`Float32Array`, `Int32Array`, `Uint8Array`).
   - Neighbour search is handled via **Uniform Spatial Hash + Counting Sort** running in $O(N)$ without allocating helper buckets per frame.
   - Despawn and removal use $O(1)$ swap-remove (swapping the dead index with the last active element).
3. **Emergence Over Scripting:**
   - Fish and agents must not follow global scripted paths or know where goals/refuges are.
   - Pathfinding is baked into the environment (Flow-field Dijkstra wavefront in the water) or emerges from local Reynolds rules (Separation, Alignment, Cohesion) with topological bounds (Ballerini et al. 2008, max 7 neighbours).
4. **Deterministic & Reproducible Systems:**
   - Procedural generation relies on seeded PRNGs (e.g., `mulberry32`). Same seed guarantees the exact same level layout, rock barriers, and refuge placement.

---

## 2. Repository Structure & Sub-Projects

```text
Aquarium/
├── apps/
│   ├── aquarium/          # GitHub profile metadata -> Boids tank + SMIL SVG baker
│   │   ├── src/           # engine.js, aquarium.js, encounter-wave-director.js
│   │   ├── tools/         # bake-svg.js, build-pages.js, fetch-github.js, extract-sprites.py
│   │   └── test/          # headless.js
│   ├── abyssal-dive/      # Canvas game: flow-field pathfinding + lamp dazzling mechanics
│   │   ├── src/           # engine.js, flowfield.js, level.js, oceanography.js, game.js
│   │   ├── test/          # flowfield.test.js, level.test.js, playable.test.js, frenzy.test.js
│   │   └── build.js       # Bundles into dist/index.html & docs/apps/abyssal-dive/index.html
│   ├── lumen-playable/    # Playable ad: Boids verbs (Cohesion, Separation, Alignment)
│   │   ├── src/           # engine.js, game.js, style.css, index.html
│   │   ├── test/          # headless.js (numerical stability & spatial hash benchmarks)
│   │   └── build.js       # Standalone single-file HTML compiler
│   ├── idle-rpg/          # Playable mini-game: Mukbang order tray & 3D Three.js WebGL
│   │   ├── src/           # game.js (Phaser 3 Mukbang state machine)
│   │   ├── tools/         # process-sprites.js, validate-atlases.js
│   │   └── build.js       # Inlines & syncs to docs/apps/idle-rpg/index.html
│   ├── playable/          # Interactive Device Simulator & Anti-Ripping Previewer
│   │   ├── config.js      # Catalog of playable builds & categories
│   │   ├── script.js      # GameListManager & Security Shield (anti-F12 / right-click)
│   │   └── index.html     # Device mockups (iPhone, iPad, Android) with iframe runner
│   └── shared/            # Reusable modules across all games
│       └── soft-lure.js   # SoftLureController (exponential damping input follower)
├── docs/                  # GitHub Pages publication root (Portfolio landing & demos)
│   ├── index.html         # Portfolio Hub
│   ├── aquarium.svg       # Baked SMIL animated SVG for GitHub README
│   └── apps/              # Published standalone web builds
├── tools/                 # Monorepo root check tools
│   └── check-portfolio.js # Link & route smoke tests
└── package.json           # Root npm scripts
```

---

## 3. Essential Commands & Development Workflow

### 3.1 Local Server
```bash
# Serve the entire portfolio hub and all sub-projects locally
npm run serve
# Server runs on http://localhost:8090
```

### 3.2 Testing & Quality Gates
```bash
# Fast automated checks (Flowfield unit tests + Level tests + Lumen headless boids)
npm run test:fast

# Portfolio hub integrity (verifies all 4 project routes, cards, and assets)
npm run test:portfolio

# Comprehensive CI test suite
npm run test:ci

# Abyssal Dive extended bot simulation tests (manual balance checks)
npm --prefix apps/abyssal-dive run test:bot
npm --prefix apps/abyssal-dive run test:frenzy
```

### 3.3 Building & Compiling Artifacts
```bash
# Compile all playable applications to single-file HTML distributions
npm run build:all

# Bake GitHub Profile Aquarium SVG and web preview
cd apps/aquarium
node tools/bake-svg.js shaikowannasleep
node tools/build-pages.js shaikowannasleep
```

---

## 4. Sub-Project Outputs & Distribution Targets

| Sub-Project | Primary Source | Build Output Artifact | Distribution Target | Constraints |
|---|---|---|---|---|
| **Aquarium SVG** | `apps/aquarium/tools/bake-svg.js` | `docs/aquarium.svg` | GitHub Profile README | Pure SVG + SMIL, 0 JS, 360 boids baked |
| **Aquarium Web** | `apps/aquarium/src/*.js` | `docs/apps/aquarium/index.html` | GitHub Pages | Single HTML file, 0 external requests |
| **Abyssal Dive** | `apps/abyssal-dive/src/*.js` | `apps/abyssal-dive/dist/index.html` | `docs/apps/abyssal-dive/index.html` | Single file, base64 sprites, < 150 KB |
| **Lumen Playable** | `apps/lumen-playable/src/*.js` | `apps/lumen-playable/dist/index.html` | `docs/apps/lumen-playable/index.html` | Single file, ad network compliant, < 120 KB |
| **Idle RPG** | `apps/idle-rpg/src/game.js` | `apps/idle-rpg/dist/index.html` | `docs/apps/idle-rpg/index.html` | Self-contained HTML with inlined assets |
| **Playable Hub** | `apps/playable/*` | `apps/playable/index.html` | Portfolio Hub tool | Device previewer with Anti-Ripping Shield |

---

## 5. Architectural Style & Coding Conventions

- **Module Encapsulation:** Always wrap classic client scripts in an IIFE `(function (global) { ... })(typeof window !== 'undefined' ? window : globalThis);` to avoid polluting the global lexical scope with duplicate constants (e.g., `TAU`, `clamp`, `lerp`).
- **Math Utilities:**
  - `TAU = Math.PI * 2`
  - `clamp(v, min, max) = v < min ? min : (v > max ? max : v)`
  - `lerp(a, b, t) = a + (b - a) * t`
- **Typing & Buffers:**
  - Float coordinates and physics: `Float32Array`
  - Cell counts and grid indices: `Int32Array`
  - State flags: `Uint8Array`
- **Minification Safety:** In `build.js`, preserve statement newlines (`trimEnd()`) to prevent Automatic Semicolon Insertion (ASI) bugs when stripping comments.

---

## 6. Known Gotchas & Historical Bug Patterns

1. **Lamp Repulsion vs. Refuge Entrances:**
   - In `abyssal-dive`, the lamp carries a soft repulsive core to prevent flock singularity. Keep the repulsive radius strictly smaller than refuge entrance diameters (mouth radius 32px vs repulsion radius < 28px), otherwise the light pushes fish away from safety.
2. **Same-Species vs. Cross-Species Separation:**
   - In `SwarmEngine`, same-species separation must have a higher force multiplier (`1.85`) than cross-species (`1.6`). If alignment/cohesion outweighs separation within the same species, sprites visibly overlap into dense blobs.
3. **Seeded Level Reachability:**
   - Procedural obstacle placement in `level.js` can occasionally generate closed rock loops. Always run the BFS reachability repair pass (`repairPass`) to remove the single offending rock before committing the level.
4. **Classic Script Concatenation:**
   - Concatenating two scripts defining `const TAU` in the same scope throws a fatal `SyntaxError: Identifier 'TAU' has already been declared`. Always guard with IIFEs or check before declaring.
