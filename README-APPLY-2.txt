AQUARIUM — ARCADE BACKGROUND + SMOOTH LURE + ENCOUNTER WAVE + IDLE MOTION
=======================================================================

PACKAGE
=======
Project: Aquarium monorepo
Scope: Original arcade background, smoother pointer lure, Aquarium encounter waves, creature idle animation
Update type: feature
Version: v1
Package name: Aquarium-arcade-background-smooth-lure-encounter-idle-feature-v1-20260916-020000.zip
Source repository: https://github.com/shaikowannasleep/Aquarium
Source branch: main
Baseline: latest GitHub main used before this package

PURPOSE
=======
This package applies the requested movement and presentation update without
copying a third-party game's exact UI, assets, layout or choreography.

1. Aquarium gets a local original arcade-style background PNG:
   - blue/turquoise water depth
   - light shafts
   - distant underwater ruin/arch
   - cave rocks on the sides
   - sandy seabed
   - coral and kelp framing
   - bubbles/particles
   The background is embedded into the generated Aquarium HTML so the public
   output remains self-contained.

2. Shared SoftLureController is added for Aquarium, Lumen and Abyssal Dive:
   - pointer target follows with exponential smoothing
   - lure power ramps up while holding pointer
   - lure power fades on release
   - Aquarium separates pointerDown from hover so release works correctly
   - no singleton SwarmEngine; each scene owns its controller instance

3. Aquarium EncounterWaveDirector adds periodic original arcade encounters:
   - first wave after approximately 60 seconds
   - next wave approximately every 60 seconds
   - current sweep appears at wave start
   - one large leader plus escort formation crosses the scene
   - ambient boids remain independent

4. Aquarium receives subtle visual-only idle motion:
   - per-creature phase offsets
   - tiny bob/sway
   - reduced swimming wiggle and squash
   - idle motion does not affect physics

5. Lumen and Abyssal Dive builds are regenerated as zero-external-request
   self-contained HTML bundles.

CHANGED FILES
=============
ADDED
- apps/shared/soft-lure.js
- apps/aquarium/src/encounter-wave-director.js
- apps/aquarium/docs/assets/arcade-aquarium-background.png

MODIFIED SOURCE
- apps/aquarium/src/aquarium.js
- apps/aquarium/tools/bake-svg.js
- apps/aquarium/tools/build-pages.js
- apps/lumen-playable/src/index.html
- apps/lumen-playable/src/game.js
- apps/lumen-playable/build.js
- apps/abyssal-dive/src/index.html
- apps/abyssal-dive/src/game.js
- apps/abyssal-dive/build.js

GENERATED OUTPUTS
- apps/aquarium/docs/aquarium.svg
- apps/aquarium/docs/index.html
- docs/aquarium.svg
- docs/apps/aquarium/aquarium.svg
- docs/apps/aquarium/index.html
- apps/lumen-playable/dist/index.html
- docs/apps/lumen-playable/index.html
- apps/abyssal-dive/dist/index.html
- apps/abyssal-dive/docs/index.html
- docs/apps/abyssal-dive/index.html

IMPORTANT SCOPE NOTE
====================
The SVG README generator and live Canvas Aquarium are separate systems.
This package includes the current directed SVG output and the live Canvas
movement update. The generated arcade background PNG is used by the live
Aquarium HTML background and is embedded into its generated HTML output.

BACKUP BEFORE APPLY
===================
PowerShell:

$Repo = "D:\Dungvd\Aquarium"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Backup = "D:\Dungvd\Backups\Aquarium-arcade-movement-$Stamp"
New-Item -ItemType Directory -Force -Path $Backup | Out-Null

$BackupFiles = @(
  "apps\shared\soft-lure.js",
  "apps\aquarium\src\encounter-wave-director.js",
  "apps\aquarium\src\aquarium.js",
  "apps\aquarium\tools\bake-svg.js",
  "apps\aquarium\tools\build-pages.js",
  "apps\lumen-playable\src\game.js",
  "apps\lumen-playable\build.js",
  "apps\abyssal-dive\src\game.js",
  "apps\abyssal-dive\build.js"
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
   Aquarium-arcade-background-smooth-lure-encounter-idle-feature-v1-20260916-020000
3. Copy ALL CONTENTS of that folder into the repository root:
   D:\Dungvd\Aquarium
4. When Windows asks, choose:
   Replace the files in the destination

Do not copy the outer package folder itself into the repository. Copy its
contents so paths such as apps\shared\soft-lure.js land at the repository root.

POWERSHELL CHECK AFTER OVERWRITE
================================
cd D:\Dungvd\Aquarium

git status
git branch --show-current
git log -1 --oneline

node --check apps\shared\soft-lure.js
node --check apps\aquarium\src\encounter-wave-director.js
node --check apps\aquarium\src\aquarium.js
node --check apps\aquarium\tools\bake-svg.js
node --check apps\aquarium\tools\build-pages.js
node --check apps\lumen-playable\src\game.js
node --check apps\lumen-playable\build.js
node --check apps\abyssal-dive\src\game.js
node --check apps\abyssal-dive\build.js

BUILD ALL OUTPUTS
=================
node apps\aquarium\tools\bake-svg.js shaikowannasleep
node apps\aquarium\tools\build-pages.js shaikowannasleep

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
# No output is expected from diff check.
git diff --check

# Verify shared controllers were included in self-contained bundles.
Select-String -Path apps\lumen-playable\dist\index.html -Pattern "SoftLureController"
Select-String -Path apps\abyssal-dive\dist\index.html -Pattern "SoftLureController"

# These should produce no matches in the built playable bundles.
Select-String -Path apps\lumen-playable\dist\index.html -Pattern '<script[^>]+src='
Select-String -Path apps\abyssal-dive\dist\index.html -Pattern '<script[^>]+src='

# Aquarium must expose countdown and background in generated HTML.
Select-String -Path docs\apps\aquarium\index.html -Pattern "waveCountdown"
Select-String -Path docs\apps\aquarium\index.html -Pattern "AQUARIUM_BACKGROUND"

# SVG output checks.
Select-String -Path docs\aquarium.svg -Pattern '<animateMotion'
Select-String -Path docs\aquarium.svg -Pattern 'rotate="auto"'

LOCAL PREVIEW
=============
python -m http.server 8090 -d docs

Open:
http://localhost:8090/apps/aquarium/
http://localhost:8090/apps/lumen-playable/
http://localhost:8090/apps/abyssal-dive/

EXPECTED RESULT
===============
- Aquarium background has an original arcade reef/ruin look.
- Aquarium ambient creature motion has subtle independent idle bob/sway.
- Holding/clicking pointer attracts smoothly.
- Releasing pointer fades lure influence and fish coast naturally.
- Aquarium countdown shows the next encounter in MM:SS-style text using the
  requested 00:00:60 initial format.
- A current sweep and large-leader escort wave appears roughly once per minute.
- Lumen and Abyssal retain their game-specific mechanics and launch normally.

COMMIT/PUSH AFTER REVIEW
========================
cd D:\Dungvd\Aquarium

git add apps\shared apps\aquarium apps\lumen-playable apps\abyssal-dive docs\apps docs\aquarium.svg

git commit -m "feat(aquarium): add arcade background and smoother encounters"
git push origin main

ROLLBACK BEFORE COMMIT
======================
cd D:\Dungvd\Aquarium
git restore apps\shared apps\aquarium apps\lumen-playable apps\abyssal-dive docs\apps docs\aquarium.svg
git clean -fd apps\shared

Or copy the .before files from the backup directory back to their original
relative paths.

DO NOT
======
- Do not apply on top of unresolved merge conflicts.
- Do not delete existing sprite assets.
- Do not expose or paste GitHub tokens into chat.
- Do not overwrite unrelated applications or root configuration.
- Do not expect the SVG README to become a full realtime boid simulation;
  the live Canvas apps handle realtime movement separately.
