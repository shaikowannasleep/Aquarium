AQUARIUM DIRECTED SVG UPDATE
=============================

This ZIP contains files with their repository-relative paths.

How to apply on Windows:
1. Close any open preview of aquarium.svg.
2. Open the ZIP.
3. Drag/copy the CONTENTS of folder "Aquarium-directed-svg-update"
   into the ROOT of your local repository:

   D:\Dungvd\Aquarium

4. Choose "Replace files in the destination" when Windows asks.
5. In VS Code terminal, run:

   cd D:\Dungvd\Aquarium
   node apps\aquarium\tools\bake-svg.js shaikowannasleep
   git status

Included files:
- apps\aquarium\tools\bake-svg.js
- apps\aquarium\docs\aquarium.svg
- docs\aquarium.svg
- docs\apps\aquarium\aquarium.svg

What changed:
- Fixed 16-creature directed roster:
  6 seahorses, 3 crabs, 2 shrimp, 2 turtles, 2 dolphins, 1 shark.
- Separate habitat lanes and coral/kelp/rock scene.
- No animateMotion, no rotate="auto", no animated scale flip.
- Base64 embedded PNG sprites; SVG is standalone for GitHub README.
