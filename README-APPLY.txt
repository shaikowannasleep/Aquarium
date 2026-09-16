AQUARIUM — BOID CROWDING, LURE SMOOTHNESS AND FLIP-FLICKER FIX
================================================================

PACKAGE
=======
Project: Aquarium monorepo
Scope: Aquarium boid separation, pointer lure smoothness, sprite flip stability
Update type: fix
Version: v1
Source repository: https://github.com/shaikowannasleep/Aquarium
Source branch: main
Affected app: apps/aquarium only. Lumen and Abyssal Dive source is untouched
by this package.

ROOT CAUSES FOUND AND FIXED
============================
1. Overlapping same-species fish
   apps/aquarium/src/engine.js previously weighted same-species separation
   LOWER than cross-species separation (0.9 vs 1.7), and doubled same-species
   cohesion/alignment contribution. Cohesion always won, so schooling fish
   visibly overlapped. Fixed: same-species separation is now at least as
   strong as cross-species (1.85 vs 1.6), cohesion no longer double-counts,
   and a new per-frame positional "declutter" pass in aquarium.js uses each
   fish's actual drawn sprite radius (not just the physics point radius) to
   guarantee no two sprites end up visually overlapping, independent of any
   boid weight tuning.

2. Jittery/"orbiting" pointer lure
   The lure force flipped sign at 48px from the pointer (core = -0.7), which
   made fish bounce/orbit around the cursor instead of smoothly arriving.
   Fixed: the sign flip is replaced with a smooth quadratic ease-to-zero
   inside a settle radius (p.lureCore), so fish glide up to the pointer and
   hold station instead of bouncing off an invisible repulsive ring.

3. Sprite flip flicker
   Facing flipped on any vx crossing +-5px/s, which is well inside normal
   boid velocity noise in a crowd, causing visible rapid left/right flicker.
   Fixed: the dead-band is widened to +-9px/s and a fish must hold the new
   heading for 120ms before the sprite actually flips, so crowding jitter no
   longer flickers the sprite; only a genuine turn does.

4. Alignment feel
   Aquarium's boid weights are retuned toward the same alignment-forward feel
   as Lumen's "RULE 03 — ALIGNMENT" beat (strong wAli, moderate wCoh, and a
   wSep that now reflects sprite footprint) so schools read as one coherent,
   polarised group rather than fish trailing over each other.

CHANGED FILES
=============
MODIFIED
- apps/aquarium/src/engine.js
- apps/aquarium/src/aquarium.js

REGENERATED OUTPUT
- apps/aquarium/docs/index.html
- docs/apps/aquarium/index.html

NOT CHANGED
===========
- apps/lumen-playable/* (already reads as smooth; left untouched)
- apps/abyssal-dive/* (hunter/game balance already tuned; left untouched
  to avoid destabilising its existing behaviour and tests)
- SVG README generator/output (apps/aquarium/tools/bake-svg.js and the
  generated aquarium.svg files) — unaffected by this fix; it already avoids
  animateMotion/rotate="auto"/scale-flip from prior work.

VERIFICATION PERFORMED BEFORE PACKAGING
========================================
Headless simulations against the patched engine (not just visual review):
- 40 same-species fish crowded into a small radius, run for 900 physics
  steps through both the boid step and the new declutter pass: zero pairs
  ended up closer than 70% of their required sprite-radius spacing.
- A single fish pulled toward an active pointer lure for 180 steps never
  moved backward by more than 2px in one step (no bounce/orbit), and settled
  within the configured lureCore radius.
- A synthetic velocity oscillating inside the new +-9px/s dead-band produced
  zero facing flips over 300 simulated frames.
node --check passed for every touched and adjacent file listed above.

BACKUP BEFORE APPLY
====================
$Repo = "D:\Dungvd\Aquarium"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Backup = "D:\Dungvd\Backups\Aquarium-boid-fix-$Stamp"
New-Item -ItemType Directory -Force -Path $Backup | Out-Null

Copy-Item "$Repo\apps\aquarium\src\engine.js" "$Backup\engine.js.before" -ErrorAction SilentlyContinue
Copy-Item "$Repo\apps\aquarium\src\aquarium.js" "$Backup\aquarium.js.before" -ErrorAction SilentlyContinue

Write-Host "Backup created: $Backup"

APPLY
=====
1. Extract this ZIP.
2. Open the extracted folder:
   Aquarium-boid-declutter-smooth-lure-fix-v1-20260916-023000
3. Copy ALL CONTENTS into the repository root:
   D:\Dungvd\Aquarium
4. Choose "Replace the files in the destination" when prompted.

POWERSHELL AFTER OVERWRITE
===========================
cd D:\Dungvd\Aquarium

git status
git branch --show-current
git log -1 --oneline

node --check apps\aquarium\src\engine.js
node --check apps\aquarium\src\aquarium.js

# This package already includes the regenerated Aquarium HTML, but if you
# also changed sprite data or want to confirm a clean rebuild, you can
# rerun the Aquarium page build (Lumen/Abyssal are unaffected, no rebuild
# needed for them):
node apps\aquarium\tools\build-pages.js shaikowannasleep

git diff --check
git status

LOCAL PREVIEW
=============
python -m http.server 8090 -d docs

Open:
http://localhost:8090/apps/aquarium/

Try:
- Move the pointer slowly across a school: fish should ease toward it and
  hold station near the cursor, without bouncing or circling it.
- Click and hold, then release: fish should glide in while held and coast
  away smoothly on release, not snap.
- Watch a dense school for 30+ seconds: sprites should keep a visible gap
  from same-species neighbours and should not flicker left/right rapidly.

VALIDATION CHECKLIST
=====================
[ ] Same-species fish keep a visible gap; no two sprites sit on top of
    each other even in a tight school.
[ ] Pointer lure feels like a smooth pull, not an orbit or bounce near the
    cursor.
[ ] Fish no longer flicker their left/right facing while swimming in a
    crowd; flips only happen on genuine direction changes.
[ ] Schools read as more polarised/aligned (Lumen RULE-03-like feel).
[ ] Lumen and Abyssal Dive behave exactly as before (unaffected).
[ ] git diff --check has no output.

ROLLBACK
========
If not committed:
cd D:\Dungvd\Aquarium
git restore apps\aquarium\src\engine.js apps\aquarium\src\aquarium.js apps\aquarium\docs\index.html docs\apps\aquarium\index.html

Or restore the .before files from the backup folder created above.

COMMIT AND PUSH AFTER REVIEW
==============================
cd D:\Dungvd\Aquarium

git add apps\aquarium\src\engine.js apps\aquarium\src\aquarium.js apps\aquarium\docs\index.html docs\apps\aquarium\index.html

git commit -m "fix(aquarium): resolve boid overlap, lure bounce, and flip flicker"
git push origin main

DO NOT
======
- Do not apply this package on top of unresolved merge conflicts.
- Do not copy these Aquarium-specific engine changes into Lumen or Abyssal
  Dive's engine.js; their tuning and hunter/game balance are separate and
  already verified.
- Do not remove the declutter pass call in aquarium.js; boid forces alone
  cannot guarantee zero visual overlap once maxForce clamps a crowded,
  aligned school.
