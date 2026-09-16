AQUARIUM — LUMEN/ABYSSAL/SVG 180-DEGREE FACING FIX
==================================================

PACKAGE
=======
Project: Aquarium monorepo
Scope: Lumen hunter, Abyssal hunter/school, directed SVG cruise facing
Update type: fix
Version: v1
Package name: Aquarium-lumen-abyssal-svg-180-flip-fix-v1-20260916-071500.zip
Source repository: https://github.com/shaikowannasleep/Aquarium
Source branch: main
Baseline commit: 23c0af4dc42814eded911e306e6382b6b444ee82  (add svg)
Local backup of related files before this change:
  /home/a33c99fe/Temp/Aquarium/backup/20260916-070224-main-related

PURPOSE
=======
PNG sprites in docs/assets/sprites face LEFT natively (eyes/mouth on the
left of the image). Lumen and Abyssal were rotating those sprites with
Math.atan2(vy, vx). That treats a left-facing drawing as if it already
faced +X, so a creature swimming right looks 180 degrees backwards.

This package:
1. Adds Sprites.drawSideSprite() to Lumen and Abyssal.
   - keep a horizontal pose
   - only a small pitch from vertical velocity
   - mirror with scaleX when swimming right (facing = -1)
   - keep native pose when swimming left (facing = 1)
2. Uses the same hysteresis facing on Lumen school + hunter and Abyssal
   school + hunter.
3. Flips bake-svg.js facingScale so a right-moving cruise/patrol/bob
   pose is mirrored (scale -1 1) and a left-moving pose stays native.
4. Rebuilds SVG, Lumen dist, and Abyssal dist/docs.

Browser checks on Chromium after rebuild:
- Lumen ALIGNMENT hunter swimming right: hammerhead nose points right
- Lumen ALIGNMENT hunter swimming left: hammerhead nose points left
- Abyssal hunter swimming right/left: blue shark nose matches vx
- School sprites keep upright side-view (no 90/180 spin)
- SVG cruise dolphin/shark/turtle on the right-moving leg face right

CHANGED FILES
=============
MODIFIED SOURCE
- apps/lumen-playable/src/game.js
- apps/abyssal-dive/src/game.js
- apps/aquarium/tools/bake-svg.js

GENERATED OUTPUTS
- apps/aquarium/docs/aquarium.svg
- docs/aquarium.svg
- docs/apps/aquarium/aquarium.svg
- apps/lumen-playable/dist/index.html
- docs/apps/lumen-playable/index.html
- apps/abyssal-dive/dist/index.html
- apps/abyssal-dive/docs/index.html
- docs/apps/abyssal-dive/index.html

BACKUP BEFORE APPLY
===================
PowerShell:

$Repo = "D:\Dungvd\Aquarium"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Backup = "D:\Dungvd\Backups\Aquarium-180-flip-$Stamp"
New-Item -ItemType Directory -Force -Path $Backup | Out-Null

$BackupFiles = @(
  "apps\lumen-playable\src\game.js",
  "apps\abyssal-dive\src\game.js",
  "apps\aquarium\tools\bake-svg.js",
  "apps\aquarium\docs\aquarium.svg",
  "docs\aquarium.svg",
  "docs\apps\aquarium\aquarium.svg",
  "apps\lumen-playable\dist\index.html",
  "docs\apps\lumen-playable\index.html",
  "apps\abyssal-dive\dist\index.html",
  "apps\abyssal-dive\docs\index.html",
  "docs\apps\abyssal-dive\index.html"
)

foreach ($File in $BackupFiles) {
  $Source = Join-Path $Repo $File
  if (Test-Path $Source) {
    $Destination = Join-Path $Backup ($File + ".before")
    New-Item -ItemType Directory -Force -Path (Split-Path $Destination) | Out-Null
    Copy-Item $Source $Destination -Force
  }
}

Write-Host "Backup created: $Backup"

APPLY
=====
1. Download and extract this ZIP.
2. Open the extracted folder with this exact package name:
   Aquarium-lumen-abyssal-svg-180-flip-fix-v1-20260916-071500
3. Copy ALL CONTENTS of that folder into the repository root:
   D:\Dungvd\Aquarium
4. When Windows asks, choose:
   Replace the files in the destination

Do not copy the outer package folder itself into the repository. Copy its
contents so paths such as apps\lumen-playable\src\game.js land at the
repository root.

POWERSHELL CHECK AFTER OVERWRITE
================================
cd D:\Dungvd\Aquarium

git status
git branch --show-current
git log -1 --oneline

node --check apps\lumen-playable\src\game.js
node --check apps\abyssal-dive\src\game.js
node --check apps\aquarium\tools\bake-svg.js

Select-String -Path apps\lumen-playable\src\game.js -Pattern "drawSideSprite"
Select-String -Path apps\abyssal-dive\src\game.js -Pattern "drawSideSprite"
Select-String -Path apps\aquarium\tools\bake-svg.js -Pattern "face LEFT natively"

BUILD ALL OUTPUTS
=================
# Optional rebuild if you prefer regenerating instead of using packaged outputs.
node apps\aquarium\tools\bake-svg.js shaikowannasleep

Push-Location apps\lumen-playable
node build.js
Pop-Location

Push-Location apps\abyssal-dive
node build.js
Pop-Location

Copy-Item apps\lumen-playable\dist\index.html docs\apps\lumen-playable\index.html -Force
Copy-Item apps\abyssal-dive\docs\index.html docs\apps\abyssal-dive\index.html -Force

VALIDATION
==========
git diff --check

Select-String -Path apps\lumen-playable\dist\index.html -Pattern "drawSideSprite"
Select-String -Path apps\abyssal-dive\dist\index.html -Pattern "drawSideSprite"
Select-String -Path apps\lumen-playable\src\game.js -Pattern "g.rotate\(a\)"
Select-String -Path apps\abyssal-dive\src\game.js -Pattern "g.rotate\(a\)"

# These should produce no matches in the built playable bundles.
Select-String -Path apps\lumen-playable\dist\index.html -Pattern '<script[^>]+src='
Select-String -Path apps\abyssal-dive\dist\index.html -Pattern '<script[^>]+src='

# SVG should not auto-rotate sprites along the path.
Select-String -Path docs\aquarium.svg -Pattern 'rotate="auto"'
Select-String -Path docs\aquarium.svg -Pattern 'scale\(-1 1\)'

LOCAL PREVIEW
=============
python -m http.server 8090 -d docs

Open:
http://localhost:8090/apps/lumen-playable/
http://localhost:8090/apps/abyssal-dive/
http://localhost:8090/aquarium.svg

EXPECTED RESULT
===============
- Lumen school fish stay upright; they flip left/right with vx, no 180 spin.
- Lumen ALIGNMENT hunter (hammerhead) nose points in the swim direction.
- Abyssal school fish stay upright; they flip left/right with vx.
- Abyssal hunter (blue shark) nose points in the swim direction.
- SVG cruise animals: right-moving leg faces right, left-moving leg faces left.
- Seahorses/crabs/shrimp keep their roster side without spinning.

COMMIT/PUSH AFTER REVIEW
========================
cd D:\Dungvd\Aquarium

git add apps\lumen-playable\src\game.js apps\lumen-playable\dist\index.html
git add apps\abyssal-dive\src\game.js apps\abyssal-dive\dist\index.html apps\abyssal-dive\docs\index.html
git add apps\aquarium\tools\bake-svg.js apps\aquarium\docs\aquarium.svg
git add docs\aquarium.svg docs\apps\aquarium\aquarium.svg
git add docs\apps\lumen-playable\index.html docs\apps\abyssal-dive\index.html

git commit -m "fix(sprites): stop 180-degree flip on left-facing PNG art"
git push origin main

ROLLBACK BEFORE COMMIT
======================
cd D:\Dungvd\Aquarium
git restore apps\lumen-playable apps\abyssal-dive apps\aquarium\tools\bake-svg.js apps\aquarium\docs\aquarium.svg docs\aquarium.svg docs\apps

Or copy the .before files from the backup directory back to their original
relative paths.

DO NOT
======
- Do not apply on top of unresolved merge conflicts.
- Do not delete existing sprite assets.
- Do not rotate side-view PNG sprites with atan2 heading.
- Do not animate SVG scale through zero.
- Do not overwrite unrelated applications or root configuration.
