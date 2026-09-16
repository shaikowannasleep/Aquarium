AQUARIUM — FINAL ANGEL PALACE / TEXTURE / FISH LAYER UPDATE
============================================================

PACKAGE
=======
Project:       Aquarium monorepo
Update type:   final artwork + baked SVG update
Version:       v2
Repository:    https://github.com/shaikowannasleep/Aquarium
Base branch:   main
Base commit:   1af01732bbc9963ad7d5f3f8d0d13bd48af1126c

IMPORTANT SOURCE-OF-TRUTH RULE
==============================
The SVG files are GENERATED OUTPUT. Do not edit them manually.

Authoritative generator:
  apps/aquarium/tools/bake-svg.js

The root scheduled generator is synchronized as well:
  tools/bake-svg.js

The three SVGs in this package were generated from the JS generator:
  docs/aquarium.svg
  docs/apps/aquarium/aquarium.svg
  apps/aquarium/docs/aquarium.svg

All three files were verified byte-for-byte identical after baking.


WHAT CHANGED
============
1. Background / Angelic submerged palace
   - Reworked the background into an original six-wing angelic palace ruin.
   - Added large dark foreground columns that partially crop at the left/right
     edges to create depth.
   - Added stone gradients and drop shadow treatment to the foreground columns.
   - Added engraved ring patterns, geometric relief marks and arch details.
   - Reduced the six-wing angel crest and lowered its opacity so it reads as a
     background relief rather than a dominant logo.
   - Kept the central gate visually open so fish can pass around the entrance.

2. Moss, seaweed, coral and seabed
   - Added dark/light double-stroke seaweed for depth.
   - Added moss strands attached directly to the architecture and columns.
   - Added layered asymmetrical purple/red/gold coral groups.
   - Added darker rear rocks, midground plant ribbons and foreground seabed
     cracks/path lines.
   - These elements were redesigned and layered, not removed.

3. Fish composition
   - Kept three schools with 120 fish each (360 school fish total).
   - Every fish uses shared embedded SVG <image> definitions through <use>;
     the sprite is not duplicated 360 times. This keeps the bake practical.
   - The yellow school is shifted away from the central gate to preserve the
     main architectural focal point.
   - All schools remain visible at frame 0 and use slow two-way off-screen turns.

4. Bubbles and underwater light
   - Added a continuous bubble field with staggered timing.
   - Several bubbles are visible at frame 0, so static GitHub rendering still
     reads as underwater.
   - Added animated surface ripple lines and light shafts/god rays.

5. UI
   - Kept AQUARIUM HAPPINESS.
   - Removed the old bottom caption text.

6. Behavior safety
   - The Canvas engine and existing interactive behavior were not changed.
   - This package changes the baked README artwork/generator and its bake tests.


FILES INCLUDED
==============
Source / generator:
  apps/aquarium/tools/bake-svg.js
  tools/bake-svg.js

Tests:
  apps/aquarium/test/headless.js
  test/headless.js

Generated SVG output:
  docs/aquarium.svg
  docs/apps/aquarium/aquarium.svg
  apps/aquarium/docs/aquarium.svg

Used source assets:
  apps/aquarium/docs/assets/sprites/blue_tang.png
  apps/aquarium/docs/assets/sprites/yellow_tang_v2.png
  apps/aquarium/docs/assets/sprites/clownfish_v2.png
  apps/aquarium/docs/assets/sprites/manta_ray.png
  apps/aquarium/docs/assets/sprites/blue_shark.png
  apps/aquarium/docs/assets/sprites/green_turtle_v2.png

The same six used sprites are also included under docs/assets/sprites for the
root generator's relative asset path.

Preview:
  preview/aquarium-final-preview.png


BACKUP BEFORE APPLY
===================
$Repo = "D:\Dungvd\Aquarium"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Backup = "D:\Dungvd\Backups\Aquarium-final-angel-palace-$Stamp"
New-Item -ItemType Directory -Force -Path $Backup | Out-Null

Copy-Item "$Repo\apps\aquarium\tools\bake-svg.js" "$Backup\bake-svg.app.js.before" -ErrorAction SilentlyContinue
Copy-Item "$Repo\tools\bake-svg.js" "$Backup\bake-svg.root.js.before" -ErrorAction SilentlyContinue
Copy-Item "$Repo\docs\aquarium.svg" "$Backup\aquarium.svg.before" -ErrorAction SilentlyContinue
Copy-Item "$Repo\README.md" "$Backup\README.md.before" -ErrorAction SilentlyContinue


APPLY
=====
1. Extract the ZIP.
2. Copy all contents inside the extracted package folder into:
       D:\Dungvd\Aquarium
3. Choose Replace files in destination.
4. Preserve the relative paths exactly.
5. Do not hand-edit generated SVG files after applying.


POWERSHELL VERIFICATION
=======================
cd D:\Dungvd\Aquarium

git status
git branch --show-current
git log -1 --oneline

node --check apps\aquarium\tools\bake-svg.js
node --check tools\bake-svg.js
node --check apps\aquarium\test\headless.js

# Bake from JS source. This regenerates all three SVG outputs.
node apps\aquarium\tools\bake-svg.js shaikowannasleep

# Main artwork and frame-0 checks.
node apps\aquarium\test\headless.js

# XML and identical-copy check.
@'PY' | python
from pathlib import Path
import hashlib
import xml.etree.ElementTree as ET
paths = [Path('docs/aquarium.svg'), Path('docs/apps/aquarium/aquarium.svg'), Path('apps/aquarium/docs/aquarium.svg')]
for p in paths:
    ET.fromstring(p.read_bytes())
assert len({hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}) == 1
print('XML valid and all three SVG copies identical')
PY

# Check formatting and status.
git diff --check
git status


LOCAL PREVIEW
=============
python -m http.server 8090 -d docs

Open:
  http://localhost:8090/aquarium.svg
  http://localhost:8090/apps/aquarium/

Open preview file:
  preview\aquarium-final-preview.png


ACCEPTANCE CHECKLIST
====================
[ ] Two dark foreground columns crop at the side edges.
[ ] Columns have visible light/dark gradient, relief rings and shadow.
[ ] Moss is attached to columns and arch areas, not only the seabed.
[ ] Coral is layered, asymmetrical and uses multiple colors.
[ ] Rear rocks, midground sea plants and foreground seabed are all present.
[ ] Six-wing crest is subtle and does not dominate the central gate.
[ ] Main gate has clear negative space around it.
[ ] Three schools remain at 120 fish each and are distributed in depth.
[ ] Yellow fish are shifted away from the central gate.
[ ] Bubbles are visible at frame 0 and continue rising.
[ ] God rays and water-surface ripples animate.
[ ] AQUARIUM HAPPINESS remains visible.
[ ] Old bottom caption is absent.
[ ] All three generated SVG copies are identical.


ROLLBACK
=========
cd D:\Dungvd\Aquarium
git checkout -- README.md apps\aquarium\tools\bake-svg.js tools\bake-svg.js apps\aquarium\test\headless.js test\headless.js docs\aquarium.svg docs\apps\aquarium\aquarium.svg apps\aquarium\docs\aquarium.svg

Or restore the files from the backup folder created above.


DO NOT
======
- Do not edit docs/aquarium.svg manually.
- Do not remove shared <use href="#schoolSprite..."> references.
- Do not remove frame-0 static opacity/transform values.
- Do not change the generator without rebaking all three SVG outputs.
- Do not modify the Canvas engine behavior unless separately requested.
- Do not commit or push automatically.
