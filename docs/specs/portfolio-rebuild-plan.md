# Portfolio rebuild: executor task plan

> **Producer amendments (these override the plan below):**
> - **Task 0 is DONE.** `docs/vendor/three.module.js` (374 KB) and `three.core.js` (389 KB) are already vendored and minified with terser, and they keep their original names. Skip Task 0.
> - **Screenshots are DONE.** `docs/assets/projects/sticker-room.png` (73 KB) and `webwiki.png` (160 KB) exist and are **800x500**. In Task 9c, use `width="800" height="500"` on both `<img>`.
> - **Task 5 verify:** short `#fff` literals may remain. Convert them to `var(--text-pure)` too, except inside `:root`.

All paths are relative to `D:\Dungvd\Aquarium` (call it `$R`). Run shell commands from `$R` in Git Bash. Line numbers are from the current files. After each edit, re-find the anchors with the grep patterns given, because line numbers shift after deletions. Do the tasks in the order listed, from the bottom of each file to the top where noted.

## Findings that change the plan

1. There are NO min files. `D:\Threejs\Sandbus\node_modules\three\build\` has only `three.module.js` (662,772 B), `three.core.js` (1,458,113 B), `three.cjs`, `three.tsl.js`, `three.webgpu*.js`. `@esbuild` is an empty dir, so we cannot minify offline.
   - Decision: vendor the two unminified files with their original names. `three.module.js` imports `./three.core.js` by relative path, so both are needed and the names must not change.
   - Files: `docs/vendor/three.module.js` and `docs/vendor/three.core.js` (about 2.1 MB total). Flag this in the final size table. The producer may minify later.
   - The test regex therefore accepts `vendor/three.module(.min)?.js`.
2. The body background hides the canvas. `html` has `background-color` (css line 74) and `body` also has one (line 77). Because `html` has one, the body background is NOT propagated to the canvas. It paints in the body's in-flow layer, above any `z-index:-1` element. The result would be a solid body colour covering the WebGL canvas. Fix: remove `background-color` from `body` and put the fallback gradient on `html` (Task 7).
3. Grep of references to removed things (executed against `docs/` and `tools/`):

| File | Lines | Action |
| --- | --- | --- |
| `docs/index.html` | 50-63 | Whole backdrop block (bg-img, caustics, god-rays, depth-fog, `#ocean-canvas`, fauna and 6 creature imgs). Replace (Task 2). |
| `docs/index.html` | 13, 18 | og:image / twitter:image point to `abyssal-dive.png`. Change to `idle-rpg.png`. |
| `docs/index.html` | 585-602 | Abyssal Dive project card. Delete. |
| `docs/index.html` | 604-621 | Lumen project card. Delete. |
| `docs/index.html` | 714-732 | `gh-page-card` "Abyssal Dive", an EXTERNAL link to `github.io/AbyssalDive`. It is not a `.project` card and is not in scope. LEAVE IT. |
| `docs/index.html` | 232 | `.abyssal-radar-viewport` is a hero HUD class, unrelated. LEAVE IT. |
| `docs/index.html` | 1186-1207 | `tank-creatures-group` and "ATTRACT CREATURES" are the hero tank. LEAVE IT. |
| `docs/assets/portfolio.js` | 149 | `document.getElementById('ocean-canvas')`. The whole section 3 is removed (Task 8). |
| `docs/assets/portfolio.js` | 4-5 | Header comment mentions a "60 FPS Particle Canvas" line. Delete that line. |
| `docs/assets/portfolio.js` | 353-391 | `.interactive-fish` / creatures belong to the hero tank. LEAVE IT. |
| `docs/assets/portfolio.css` | 123-321 | Backdrop, caustics, god-rays, depth-fog, fx-canvas, fauna, creatures and 8 keyframes. Delete the block (Task 3). |
| `docs/assets/portfolio.css` | 2451-2465 | The reduced-motion block lists `.ocean-fauna-layer, .ocean-caustics-layer, .ocean-god-rays, .ocean-fx-canvas`. Replace (Task 3b). |
| `docs/assets/portfolio.css` | ~1724-1727 | `.art-lumen .art-glyph` rule. Delete (no element uses it afterwards). |
| `docs/assets/portfolio.css` | 242-243 | `calc(100vw + 400px)` is inside the deleted block, so it is gone. |
| `tools/check-portfolio.js` | 10, 15 | Hard-coded `abyssal-dive`, `lumen-playable`. Rewrite (Task 13). |
| `docs/assets/aquarium25d.js` | 112, 460 | Only the word "caustics" in a comment, for the hero canvas. LEAVE IT. |
| `tools/bake-svg.js` | many | `creature*` identifiers for the SVG baker. LEAVE IT. |
| `tools/fetch-github.js` | 54 | User-Agent string. LEAVE IT. |
| `docs/PORTFOLIO-DESIGN.md` | none | No references. |
| `docs/assets/bg2.png / .jpg / .avif` | n/a | Referenced ONLY by css lines 138-139, which are deleted. Safe to delete (Task 10). |
| `docs/apps/*` | n/a | `docs/apps/abyssal-dive`, `docs/apps/lumen-playable` and `docs/apps/playable/**` are separate apps and the Playables hub. LEAVE THEM. Do not delete the app folders. Only the portfolio cards go. |

   - `data-category` filter JS (portfolio.js lines 413-436) uses `category.includes(filter)`. It needs no JS change for a new "web" filter.
   - There is no `html[data-theme=light]` and no `prefers-color-scheme` in the CSS, so the light-theme check is N/A.

---

## Task 0: Vendor three r186

```bash
mkdir -p docs/vendor
cp /d/Threejs/Sandbus/node_modules/three/build/three.module.js docs/vendor/three.module.js
cp /d/Threejs/Sandbus/node_modules/three/build/three.core.js   docs/vendor/three.core.js
```
Verify:
```bash
ls -l docs/vendor && grep -c "from './three.core.js'" docs/vendor/three.module.js
```
Expected: both files are listed and the grep count is at least 1.

---

## Task 1: `docs/index.html` head

Find the head block with `grep -n "fonts.g\|assets/portfolio.css\|ld+json\|assets/portfolio.js" docs/index.html`.

a) Delete lines 21-23: the two `preconnect` links and the `fonts.googleapis.com/css2` link.

b) Lines 13 and 18: replace `assets/projects/abyssal-dive.png` with `assets/projects/idle-rpg.png`. There are two occurrences, so use sed:
```bash
sed -i 's#assets/projects/abyssal-dive.png#assets/projects/idle-rpg.png#g' docs/index.html
```
c) Line 6: change `content="#020c17"` to `content="#0b1620"`.

d) Immediately AFTER `<link rel="stylesheet" href="assets/portfolio.css">` and BEFORE `<script type="application/ld+json">`, insert exactly:
```html
  <script type="importmap">
  {
    "imports": {
      "three": "./vendor/three.module.js"
    }
  }
  </script>
  <script type="module" src="assets/ocean-bg.js"></script>
```
The importmap must come before any module script. Keep the existing `portfolio.js` and `aquarium25d.js` defer tags as they are.

Verify:
```bash
grep -c "googleapis\|gstatic" docs/index.html; grep -c 'type="importmap"' docs/index.html
```
Expected: `0` then `1`.

---

## Task 2: `docs/index.html` backdrop markup

Find it with `grep -n "ocean-backdrop-wrapper" docs/index.html`. This is lines 47-65, the whole `<!-- Ambient Ocean ... --> <div class="ocean-backdrop-wrapper"> ... </div>`. Replace the entire block with:
```html
  <!-- Three.js deep-sea background (assets/ocean-bg.js). CSS gradient on <html> is the fallback. -->
  <div class="ocean-backdrop-wrapper" aria-hidden="true">
    <canvas id="ocean-bg"></canvas>
  </div>
```
In the header CTA (`grep -n "DOWNLOAD CV" docs/index.html`, about line 124), replace the text node line `DOWNLOAD CV (PDF) ↗` with:
```html
          <span class="cta-label">DOWNLOAD CV (PDF) ↗</span><span class="cta-short" aria-hidden="true">CV ↗</span>
```
Keep `<span class="btn-spark" ...></span>` above it. The anchor already has an `aria-label`.

Verify:
```bash
grep -cE "ocean-bg-img|caustics|god-rays|depth-fog|ocean-canvas|ocean-fauna|marine-creature" docs/index.html
```
Expected: `0`.

---

## Task 3: `docs/assets/portfolio.css` delete the old backdrop

3a) Delete the block from the comment banner `/* ===...\n   AMBIENT OCEAN BACKDROP, GOD RAYS & ENVIRONMENTAL FX` (line 123) through the closing `}` of `@keyframes dartFish2` (line 321). The next lines are the banner `SUBSEA OPERATIONS COCKPIT HEADER`. Do it with a safe node script (idempotent):
```bash
node -e "
const fs=require('fs');let c=fs.readFileSync('docs/assets/portfolio.css','utf8');
const a=c.indexOf('/* ==========================================================================\n   AMBIENT OCEAN BACKDROP');
const b=c.indexOf('/* ==========================================================================\n   SUBSEA OPERATIONS COCKPIT HEADER');
if(a<0||b<a) throw new Error('anchors not found (check CRLF: retry with \\\\r\\\\n)');
c=c.slice(0,a)+c.slice(b);fs.writeFileSync('docs/assets/portfolio.css',c);console.log('removed',b-a,'chars');"
```
If the anchors are not found, the file may use CRLF. Retry replacing `\n` in the two search strings with `\r\n`.

3b) Insert the new backdrop CSS where the old block was. Place it right before the `SUBSEA OPERATIONS COCKPIT HEADER` banner:
```css
/* ==========================================================================
   THREE.JS OCEAN BACKGROUND (canvas drawn by assets/ocean-bg.js)
   ========================================================================== */
.ocean-backdrop-wrapper {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  contain: strict;
  pointer-events: none;
}
#ocean-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
}
```
3c) In the `@media (prefers-reduced-motion: reduce)` block (`grep -n "ocean-fauna-layer" docs/assets/portfolio.css`), delete the 5 lines `.ocean-fauna-layer, .ocean-caustics-layer, .ocean-god-rays, .ocean-fx-canvas { display:none !important; }`. Keep the rest of the block, the `*, *::before, *::after` rule.

3d) Delete the `.art-lumen .art-glyph { ... }` rule (3 lines plus a blank line). Find it with `grep -n "art-lumen" docs/assets/portfolio.css`.

Verify:
```bash
grep -cE "bg2|ocean-fauna|marine-creature|creature-|caustics|god-rays|depth-fog|ocean-fx-canvas|art-lumen|dartFish|swimWhale|glideRay|pulseJelly|raysShimmer" docs/assets/portfolio.css
```
Expected: `0`.

---

## Task 4: Palette, `:root` replacement (also fonts)

Replace the whole `:root { ... }` block (css lines 6-58, from `:root {` to its closing `}` just before the `RESET & GLOBAL BASE` banner) with:
```css
:root {
  /* Ocean Deep Color Palette (low-glare, WCAG AA) */
  --ocean-abyss:        #0b1620;
  --ocean-deep:         #0f1d29;
  --ocean-mid:          #142636;
  --ocean-marine:       #1b3347;
  --ocean-surface:      #234559;

  /* Accents (muted) */
  --cyan-glow:          #7cc4d6;
  --cyan-dim:           rgba(124, 196, 214, 0.10);
  --cyan-subtle:        rgba(124, 196, 214, 0.06);
  --cyan-border:        rgba(124, 196, 214, 0.20);
  --seafoam-neon:       #9fd3b4;
  --seafoam-dim:        rgba(159, 211, 180, 0.10);
  --electric-azure:     #5b9fd0;
  --deep-purple-glow:   #9a8bd0;
  --coral-accent:       #e08a9a;
  --gold-accent:        #e3c27a;

  /* Text */
  --text-pure:          #e8eef2;
  --text-bright:        #dde6ec;
  --text-lum:           #c5d2db;
  --text-muted:         #93a6b4;
  --text-dim:           #6f8494; /* decoration only, never body text */

  /* Glassmorphism Surface Tokens */
  --glass-bg:           rgba(15, 29, 41, 0.78);
  --glass-bg-hover:     rgba(20, 38, 54, 0.86);
  --glass-card:         rgba(15, 29, 41, 0.78);
  --glass-border:       1px solid rgba(124, 196, 214, 0.15);
  --glass-border-hover: 1px solid rgba(124, 196, 214, 0.38);
  --glass-inner-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.05), inset 0 -1px 1px rgba(0, 0, 0, 0.35);
  --panel-shadow:       0 16px 40px -10px rgba(0, 6, 16, 0.6), 0 0 25px rgba(124, 196, 214, 0.04);
  --panel-shadow-hover: 0 22px 50px -8px rgba(0, 6, 16, 0.75), 0 0 35px rgba(124, 196, 214, 0.10);

  /* Radii & Transitions */
  --radius-xs:  4px;
  --radius-sm:  8px;
  --radius-md:  14px;
  --radius-lg:  20px;
  --radius-xl:  28px;
  --radius-full: 9999px;

  --transition-fast: 0.18s cubic-bezier(0.2, 0, 0, 1);
  --transition-med:  0.32s cubic-bezier(0.16, 1, 0.3, 1);
  --transition-slow: 0.6s cubic-bezier(0.16, 1, 0.3, 1);

  /* System fonts only (no Google Fonts request) */
  --font-main:  system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-hud:   system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-mono:  ui-monospace, "Cascadia Code", Consolas, monospace;
}
```
Verify:
```bash
grep -c "Outfit\|Space Grotesk\|JetBrains" docs/assets/portfolio.css
```
Expected: `0`.

---

## Task 5: Convert remaining neon colours in the CSS (one script)

Run this exact node script. It rewrites rgba neon values, caps glow alpha, strips neon text-shadows and replaces pure-white and neon hex literals.
```bash
node -e "
const fs=require('fs');const f='docs/assets/portfolio.css';let c=fs.readFileSync(f,'utf8');
const r3=(n)=>+n.toFixed(3);
c=c.replace(/rgba\(\s*0,\s*229,\s*255,\s*([\d.]+)\s*\)/g,(m,a)=>'rgba(124, 196, 214, '+r3(parseFloat(a)*0.7)+')');
c=c.replace(/rgba\(\s*0,\s*255,\s*163,\s*([\d.]+)\s*\)/g,(m,a)=>'rgba(159, 211, 180, '+r3(parseFloat(a)*0.7)+')');
c=c.replace(/rgba\(\s*255,\s*92,\s*138,\s*([\d.]+)\s*\)/g,(m,a)=>'rgba(224, 138, 154, '+r3(parseFloat(a)*0.7)+')');
c=c.replace(/rgba\(\s*255,\s*209,\s*102,\s*([\d.]+)\s*\)/g,(m,a)=>'rgba(227, 194, 122, '+r3(parseFloat(a)*0.7)+')');
c=c.replace(/rgba\(\s*(?:26,\s*140|0,\s*136),\s*255,\s*([\d.]+)\s*\)/g,(m,a)=>'rgba(91, 159, 208, '+r3(parseFloat(a)*0.7)+')');
c=c.replace(/rgba\(\s*138,\s*63,\s*252,\s*([\d.]+)\s*\)/g,(m,a)=>'rgba(154, 139, 208, '+r3(parseFloat(a)*0.7)+')');
// strip neon text-shadow glows
c=c.replace(/^[ \t]*text-shadow:[^;\n]*;[ \t]*\r?\n/gm,'');
// cap glow alpha at 0.12 on single-line box-shadows that have a 0 0 Npx glow
c=c.split('\n').map(l=>{
  if(/box-shadow:/.test(l)&&/0 0 \d+px/.test(l)){
    l=l.replace(/rgba\((124, 196, 214|159, 211, 180|224, 138, 154|227, 194, 122|91, 159, 208|154, 139, 208),\s*([\d.]+)\)/g,(m,rgb,a)=>'rgba('+rgb+', '+Math.min(parseFloat(a),0.12)+')');
    l=l.replace(/0 0 (\d+px) var\(--(cyan-glow|seafoam-neon|gold-accent|coral-accent)\)/g,(m,px)=>'0 0 '+px+' rgba(124, 196, 214, 0.12)');
  }return l;}).join('\n');
c=c.replace(/#ffffff/gi,'var(--text-pure)').replace(/#00e5ff/gi,'var(--cyan-glow)').replace(/#00ffa3/gi,'var(--seafoam-neon)');
fs.writeFileSync(f,c);"
```
Caveat: the previous step turns `#ffffff` inside `:root` into `var(--text-pure)`. Task 4 already wrote `--text-pure:#e8eef2`, so no `#ffffff` is left in `:root`. If the replace hit anything inside `:root`, it would produce a self-reference, so run Task 4 first and then check with `sed -n 6,40p docs/assets/portfolio.css | grep "var(--"`. This should show only `var(--radius`-free lines, i.e. nothing.

Manual follow-up for shadows the script cannot catch (multi-line or `var()`-based):
```bash
grep -nE "box-shadow:[^;]*0 0 [0-9]+px[^;]*(var\(--(cyan|seafoam|gold|coral)|#)" docs/assets/portfolio.css
```
Change each hit's glow colour to `rgba(124, 196, 214, 0.12)`.

Verify:
```bash
grep -ciE "#00e5ff|#00ffa3|0, ?229, ?255|0, ?255, ?163|text-shadow|#ffffff|#fff\b" docs/assets/portfolio.css
```
Expected: `0`.

---

## Task 6: Header overflow fix (CSS plus a markup tweak from Task 2)

Root cause: at 375px, `.subsea-brand` (about 300px with the nowrap callsign) plus `.subsea-header-cta` (264px) is wider than the viewport, which widens the layout viewport to 600.

6a) Add default rules (outside any media query) right after the existing `.subsea-header-cta { ... }` block (`grep -n "^.subsea-header-cta" docs/assets/portfolio.css`):
```css
.subsea-header-cta .cta-short { display: none; }
.subsea-navbar-main > * { min-width: 0; }
.subsea-header { max-width: 100vw; overflow-x: clip; }
```
6b) Append a new media block at the END of the file (after all other rules, so it wins by order):
```css
/* ==========================================================================
   MOBILE OVERFLOW FIX (spec section 1)
   ========================================================================== */
@media (max-width: 760px) {
  .subsea-navbar-main { padding: 8px 12px; gap: 8px; }
  .subsea-brand { min-width: 0; gap: 10px; flex: 1 1 auto; }
  .brand-role { display: none; }
  .subsea-header-cta { flex: 0 0 auto; gap: 6px; }
  .subsea-header-cta .cta-label { display: none; }
  .subsea-header-cta .cta-short { display: inline; }
  .btn-ocean-glow { padding: 8px 12px; font-size: 0.78rem; }
}
@media (max-width: 520px) {
  .brand-callsign { font-size: 1rem; }
  .brand-callsign span { display: none; }
}
```
Note that the CTA button is kept visible as a short "CV" pill, so no icon work is needed.

---

## Task 7: html/body overflow and fallback gradient

In the `html { ... }` and `body { ... }` rules (css about lines 68-92), edit exactly:
- `html`: keep `scroll-behavior`, `color-scheme`. Replace the `background-color` line with these three lines:
```css
  background-color: var(--ocean-abyss);
  background-image: linear-gradient(180deg, #162b3b 0%, #0f1d29 45%, #0b1620 100%);
  background-attachment: fixed;
  overflow-x: clip;
```
- `body`: DELETE the `background-color: var(--ocean-abyss);` line. This is critical, see finding 2. Replace `overflow-x: hidden;` with:
```css
  overflow-x: hidden;
  overflow-x: clip;
```
The `hidden` line comes first as the fallback and `clip` second wins where supported. The test greps `overflow-x: clip`, so keep the exact spelling with the space.

Verify:
```bash
grep -c "overflow-x: clip" docs/assets/portfolio.css; sed -n 66,95p docs/assets/portfolio.css | grep -c "background-color"
```
Expected: at least `2`, then `1`. The one remaining background-color is on `html`.

---

## Task 8: `docs/assets/portfolio.js` remove the 2D ocean canvas

- Delete the section-3 block. It starts at the `// ====` banner line just above `// 3. HIGH-PERFORMANCE CANVAS: ASCENDING BUBBLES` (about line 146) and ends at the `  }` that closes `if (canvas) {` (about line 350, right after `startOceanFx();`). It stops just before the banner `// 4. INTERACTIVE ABYSS TANK`. Safe node script:
```bash
node -e "
const fs=require('fs');const f='docs/assets/portfolio.js';let c=fs.readFileSync(f,'utf8');
const b3=c.indexOf('// 3. HIGH-PERFORMANCE CANVAS');const a=c.lastIndexOf('  // ====',b3);
const b4=c.indexOf('// 4. INTERACTIVE ABYSS TANK');const b=c.lastIndexOf('  // ====',b4-1);
const b4banner=c.lastIndexOf('  // ====',b4);
if(b3<0||b4<0)throw new Error('anchor');
c=c.slice(0,a)+c.slice(c.lastIndexOf('  // ====',b4));
c=c.replace(/^ \* - 60 FPS Particle Canvas.*\r?\n/m,'');
fs.writeFileSync(f,c);"
```
(`c.lastIndexOf('  // ====', b4)` finds the banner line immediately above the section-4 title, so section 4 stays intact.)
- Verify syntax and no dangling refs:
```bash
node --check docs/assets/portfolio.js && grep -cE "ocean-canvas|renderOceanFx|startOceanFx|bubbleCount|cursorBubbles|ocean-fx" docs/assets/portfolio.js && grep -c "abyss-tank" docs/assets/portfolio.js
```
Expected: the `--check` is silent, the first grep prints `0` (grep exits 1, which is fine), and `abyss-tank` is still at least 1.
- Also make sure nothing else references the removed variables. If `node --check` passes and the grep returns 0, we are done. Do NOT touch the code from `const tank = document.getElementById('abyss-tank')` onward.

---

## Task 9: `docs/index.html` projects

Anchors: `grep -n "Project 2: Abyssal Dive\|Project 3: Lumen\|Project 4: Idle RPG" docs/index.html`.

9a) Delete lines 585-621: from `<!-- Project 2: Abyssal Dive -->` through the `</article>` of Lumen, including the blank line between them. Keep Project 1 Aquarium and Idle RPG.

9b) Renumber the Idle RPG comment and label. `<!-- Project 4: Idle RPG -->` becomes `<!-- Project 2: Idle RPG -->`. The `art-label` `04 / 3D WEAPON FORGE &amp; BATTLE` becomes `02 / 3D WEAPON FORGE &amp; BATTLE`.

9c) Insert AFTER the Idle RPG `</article>` and BEFORE `</div>` that closes `projects-fleet-grid` (the line before `<!-- Live GitHub Pages ... -->` area; check with `grep -n "Card 4\|</div>" ` near line 640). These two cards, markup identical to the existing ones:
```html
        <!-- Project 3: Sticker Room -->
        <article class="project" data-category="game">
          <div class="project-art art-stickerroom">
            <span class="art-label">03 / 3D UNPACK &amp; DECORATE</span>
            <img src="assets/projects/sticker-room.png" alt="Sticker Room 3D puzzle game preview" class="project-thumb-img" width="1200" height="750" loading="lazy">
          </div>
          <div class="project-info">
            <div class="project-meta">WEB 3D GAME <span>↗ 2026</span></div>
            <h3>Sticker Room<span class="project-arrow" aria-hidden="true">↗</span></h3>
            <p>Cute 3D unpack &amp; decorate puzzle game — Three.js + Jolt Physics. 10 rooms × 3 stages, Zen mode, auto graphics tier, ~36 draw calls, render-on-demand.</p>
            <div class="project-foot">
              <div class="project-tags">
                <span>THREE.JS</span><span>JOLT PHYSICS</span><span>ZEN MODE</span><span>~36 DRAW CALLS</span>
              </div>
              <div class="project-links">
                <a href="https://shaikowannasleep.github.io/sticker-room/" target="_blank" rel="noopener noreferrer" aria-label="Open Sticker Room live demo">LIVE DEMO ↗</a>
                <a href="https://github.com/shaikowannasleep/sticker-room" target="_blank" rel="noopener noreferrer" aria-label="Sticker Room source on GitHub">GITHUB ↗</a>
              </div>
            </div>
          </div>
        </article>

        <!-- Project 4: WebWiki (TGSH Wiki) -->
        <article class="project" data-category="web">
          <div class="project-art art-webwiki">
            <span class="art-label">04 / WIKI &amp; STUDIO TOOLS</span>
            <img src="assets/projects/webwiki.png" alt="WebWiki (TGSH Wiki) website preview" class="project-thumb-img" width="1200" height="750" loading="lazy">
          </div>
          <div class="project-info">
            <div class="project-meta">WEB APP <span>↗ 2026</span></div>
            <h3>WebWiki (TGSH Wiki)<span class="project-arrow" aria-hidden="true">↗</span></h3>
            <p>Vietnamese wiki + studio tools for Soul Land: Awakening World — soul rings, soul bones, team builder, OCR crop tool. Node + Vercel serverless + Postgres.</p>
            <div class="project-foot">
              <div class="project-tags">
                <span>NODE.JS</span><span>VERCEL</span><span>POSTGRES</span><span>OCR TOOL</span>
              </div>
              <div class="project-links">
                <a href="https://tgsh-wiki.vercel.app/" target="_blank" rel="noopener noreferrer" aria-label="Open WebWiki live site">LIVE ↗</a>
                <a href="https://github.com/shaikowannasleep/WebWiki" target="_blank" rel="noopener noreferrer" aria-label="WebWiki source on GitHub">GITHUB ↗</a>
              </div>
            </div>
          </div>
        </article>
```
9d) Add to the CSS (end of file, before or after the mobile block) so the two links sit together:
```css
.project-links { display: flex; flex-wrap: wrap; gap: 8px; }
```
(The existing `.project-foot a` rule already styles the anchors, since `.project-links` is a descendant of `.project-foot`.)

9e) Filter and copy:
- Section-3 subtext (`grep -n "Playable ads, interactive living" docs/index.html`, about line 541): replace with `A playable ad, a living simulation, a 3D web game and a web app.`
- Add a filter button after the `data-filter="game"` button and before `data-filter="experiment"`:
```html
        <button type="button" class="filter-btn" data-filter="web" aria-pressed="false">
          <span>WEB APPS</span>
        </button>
```
- Leave `filter-count 08` alone. 4 `.project` plus 4 `.fleet-card` is still 8.
- Do not alter the Idle RPG card text. It is the only playable ad. Its `data-category="game playable"` stays.

Verify:
```bash
grep -c 'class="project ' docs/index.html; grep -cE "assets/projects/(abyssal|lumen)|apps/(abyssal-dive|lumen-playable)/|art-abyss|art-lumen|Project . Lumen" docs/index.html; grep -c "sticker-room\|tgsh-wiki" docs/index.html
```
Expected: `4` for the card count (the featured card has class `project project-featured`, which matches `class="project `). The second count must be `0`, and the third must be at least `4`.

---

## Task 10: Delete files that are no longer referenced

Run the guard grep first, then delete only if it prints nothing:
```bash
grep -rlE "bg2\.(png|jpg|avif)|projects/(abyssal-dive|lumen-playable)\.png" docs/index.html docs/assets/portfolio.css docs/assets/portfolio.js tools
```
If it prints nothing, then:
```bash
rm docs/assets/bg2.png docs/assets/bg2.jpg docs/assets/bg2.avif docs/assets/projects/abyssal-dive.png docs/assets/projects/lumen-playable.png
```
Do not delete anything under `docs/apps/`. `docs/assets/sprites/*` stays too, since the SVG baker and the apps use it.

Note: `sticker-room.png` and `webwiki.png` are captured by the producer into `docs/assets/projects/`. The executor must NOT create placeholders. Until they exist, `npm run test:portfolio` will correctly fail on those two files.

---

## Task 11: Create `docs/assets/ocean-bg.js` (new file, full content)

```js
// Calm deep-sea Three.js background. Fixed canvas #ocean-bg, no CDN.
// Fallback: if anything throws, the CSS gradient on <html> stays visible.
import * as THREE from 'three';

(function () {
  'use strict';
  const canvas = document.getElementById('ocean-bg');
  if (!canvas) return;

  const fail = (err) => {
    if (err) console.warn('[ocean-bg] disabled:', err.message || err);
    document.documentElement.classList.add('no-webgl');
    canvas.remove();
  };

  try {
    const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const isMobile = () => window.innerWidth <= 760;
    const dprCap = () => (isMobile() ? 1 : 1.5);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'low-power'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap()));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setClearColor(0x0b1620, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 60);
    camera.position.set(0, 0, 6);

    // --- Gradient backdrop (full-screen quad in clip space, sRGB values written directly) ---
    const bgMat = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }',
      fragmentShader: [
        'varying vec2 vUv;',
        'void main(){',
        '  vec3 bottom = vec3(0.027, 0.059, 0.086);', // ~ #070f16
        '  vec3 top    = vec3(0.075, 0.150, 0.205);', // ~ #132634
        '  float t = smoothstep(0.0, 1.0, vUv.y);',
        '  gl_FragColor = vec4(mix(bottom, top, t), 1.0);',
        '}'
      ].join('\n')
    });
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat);
    bg.frustumCulled = false;
    bg.renderOrder = -10;
    scene.add(bg);

    // --- Soft light shafts (additive, opacity <= 0.08) ---
    const shaftMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uOpacity: { value: 0.06 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: [
        'varying vec2 vUv; uniform float uOpacity;',
        'void main(){',
        '  float across = 1.0 - abs(vUv.x - 0.5) * 2.0;',
        '  float a = pow(max(across, 0.0), 2.0) * pow(vUv.y, 1.5) * uOpacity;',
        '  gl_FragColor = vec4(vec3(0.30, 0.52, 0.60) * a, a);',
        '}'
      ].join('\n')
    });
    const shafts = [];
    const shaftDefs = [[-4.0, 0.25, 2.2], [0.5, -0.18, 3.0], [4.2, 0.12, 2.0]];
    for (let i = 0; i < shaftDefs.length; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(shaftDefs[i][2], 18), shaftMat);
      m.position.set(shaftDefs[i][0], 1.5, -4 - i);
      m.rotation.z = shaftDefs[i][1];
      m.renderOrder = -5;
      scene.add(m);
      shafts.push(m);
    }

    // --- Marine snow particles ---
    const COUNT = isMobile() ? 300 : 500;
    const SPREAD_X = 14, SPREAD_Y = 9;
    const pos = new Float32Array(COUNT * 3);
    const speed = new Float32Array(COUNT);
    const phase = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * SPREAD_X * 2;
      pos[i * 3 + 1] = (Math.random() - 0.5) * SPREAD_Y * 2;
      pos[i * 3 + 2] = -6 + Math.random() * 8;
      speed[i] = 0.05 + Math.random() * 0.12;
      phase[i] = Math.random() * 6.2832;
    }
    const geo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(pos, 3);
    geo.setAttribute('position', posAttr);
    const snow = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0x9fb8c6,
      size: 1.5,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.3,
      depthWrite: false
    }));
    snow.frustumCulled = false;
    scene.add(snow);

    // --- Light parallax (camera offset <= 0.3) ---
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    const PARALLAX = 0.3;
    const updateTarget = (mx, my) => {
      target.x = Math.max(-1, Math.min(1, mx)) * PARALLAX * 0.6;
      target.y = Math.max(-1, Math.min(1, my)) * PARALLAX * 0.4;
    };
    let mouseX = 0, mouseY = 0, scrollT = 0;
    const applyParallax = () => {
      updateTarget(mouseX, mouseY);
      target.y = Math.max(-PARALLAX, Math.min(PARALLAX, target.y + (scrollT - 0.5) * PARALLAX * 0.8));
    };
    window.addEventListener('pointermove', (e) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = -((e.clientY / window.innerHeight) * 2 - 1);
      applyParallax();
    }, { passive: true });
    window.addEventListener('scroll', () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      scrollT = Math.min(1, Math.max(0, (window.scrollY || 0) / max));
      applyParallax();
    }, { passive: true });

    // --- Frame update ---
    const clock = new THREE.Clock();
    const step = (dt) => {
      for (let i = 0; i < COUNT; i++) {
        const i3 = i * 3;
        pos[i3 + 1] += speed[i] * dt;
        pos[i3] += Math.sin(phase[i] + clock.elapsedTime * 0.2) * 0.004;
        if (pos[i3 + 1] > SPREAD_Y) { pos[i3 + 1] = -SPREAD_Y; pos[i3] = (Math.random() - 0.5) * SPREAD_X * 2; }
      }
      posAttr.needsUpdate = true;
      for (let i = 0; i < shafts.length; i++) {
        shafts[i].rotation.z = shaftDefs[i][1] + Math.sin(clock.elapsedTime * 0.1 + i) * 0.03;
      }
      cur.x += (target.x - cur.x) * 0.05;
      cur.y += (target.y - cur.y) * 0.05;
      camera.position.x = cur.x;
      camera.position.y = cur.y;
    };
    const draw = () => renderer.render(scene, camera);

    // --- Loop: 30 fps cap, paused when hidden, static when reduced motion ---
    const FRAME_MS = 1000 / 30;
    let rafId = 0, last = 0, running = false;
    const loop = (t) => {
      rafId = requestAnimationFrame(loop);
      if (t - last < FRAME_MS) return;
      last = t;
      step(Math.min(clock.getDelta(), 0.1));
      draw();
    };
    const start = () => {
      if (running || document.hidden || mqReduce.matches) return;
      running = true;
      clock.getDelta();
      rafId = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    };
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop(); else start();
    });
    const onMotionPref = () => { if (mqReduce.matches) { stop(); draw(); } else start(); };
    if (mqReduce.addEventListener) mqReduce.addEventListener('change', onMotionPref);

    // --- Resize ---
    let resizeTimer = 0;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const w = window.innerWidth, h = window.innerHeight;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap()));
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        if (!running) draw();
      }, 120);
    }, { passive: true });

    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); stop(); fail(new Error('context lost')); });

    draw(); // first frame always (this is the single static frame for reduced motion)
    if (!mqReduce.matches) start();
  } catch (err) {
    fail(err);
  }
})();
```
Notes for the executor: module scripts are strict, so no `'use strict'` problem. The file starts with an `import`, so it must be loaded with `type="module"` (Task 1). The test strings `prefers-reduced-motion`, `visibilitychange`, `Math.min(` and `devicePixelRatio` are all present.

Verify (no browser needed):
```bash
node --input-type=module --check < docs/assets/ocean-bg.js && grep -c "prefers-reduced-motion\|visibilitychange\|devicePixelRatio" docs/assets/ocean-bg.js
```
If `--check` via stdin is unsupported, use `cp docs/assets/ocean-bg.js /tmp/x.mjs && node --check /tmp/x.mjs`. That is allowed because it is a throwaway syntax check.

---

## Task 12: Add a `.no-webgl` safety net (optional, tiny)

The fallback gradient on `html` (Task 7) already shows when the canvas is removed, so no extra CSS is needed. Skip this task.

---

## Task 13: Rewrite `tools/check-portfolio.js` (full replacement)

```js
// Dependency-free smoke check for the static portfolio and its published routes.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const html = fs.readFileSync('docs/index.html', 'utf8');
const assertFile = (relative) => assert.ok(fs.existsSync(path.join('docs', relative)), `Missing docs/${relative}`);
for (const section of ['main', 'work', 'about', 'skills', 'contact', 'top']) {
  assert.match(html, new RegExp(`id="${section}"`), `Missing #${section}`);
}

// Routes: local app routes + external live links for the two web projects
for (const route of ['aquarium', 'idle-rpg']) {
  assert.ok(html.includes(`apps/${route}/`), `Missing route ${route}`);
  assertFile(`apps/${route}/index.html`);
}
assert.ok(html.includes('https://shaikowannasleep.github.io/sticker-room/'), 'Missing sticker-room live link');
assert.ok(html.includes('https://tgsh-wiki.vercel.app/'), 'Missing webwiki live link');
assert.ok(!/apps\/(?:abyssal-dive|lumen-playable)\//.test(html), 'Abyssal Dive / Lumen project routes must be removed');

for (const asset of ['assets/favicon.svg', 'assets/portfolio.css', 'assets/portfolio.js', 'assets/ocean-bg.js', 'apps/aquarium/aquarium.svg']) assertFile(asset);
for (const projImg of ['assets/projects/idle-rpg.png', 'assets/projects/sticker-room.png', 'assets/projects/webwiki.png']) assertFile(projImg);
for (const gone of ['assets/projects/abyssal-dive.png', 'assets/projects/lumen-playable.png']) {
  assert.ok(!fs.existsSync(path.join('docs', gone)), `docs/${gone} should be deleted`);
}

// Offline compliance: no shields, no Google Fonts / CDN
assert.ok(!html.includes('img.shields.io'), 'Expected zero external img.shields.io badges in docs/index.html');
assert.ok(!/fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr|unpkg\.com|cdnjs/.test(html), 'No Google Fonts / CDN allowed in docs/index.html');
assert.ok(!html.includes('EXPLORER ALL PLAYABLES'), 'Found typo EXPLORER ALL PLAYABLES; expected EXPLORE');

// Three.js import map must point to a local vendor file that exists
const im = html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
assert.ok(im, 'Missing <script type="importmap">');
const imports = JSON.parse(im[1]).imports || {};
assert.ok(imports.three && /vendor\/three\.module(?:\.min)?\.js$/.test(imports.three), 'importmap.three must point to vendor/three.module(.min).js');
assertFile(imports.three.replace(/^\.\//, ''));
const vendorSrc = fs.readFileSync(path.join('docs', imports.three.replace(/^\.\//, '')), 'utf8');
const core = vendorSrc.match(/from\s*['"]\.\/(three\.core(?:\.min)?\.js)['"]/);
if (core) assertFile(`vendor/${core[1]}`);

// SEO & Structured Data
assert.match(html, /<link rel="canonical"/, 'Missing canonical link tag');
assert.match(html, /<meta property="og:image"/, 'Missing og:image tag');
assert.match(html, /<meta name="twitter:card"/, 'Missing twitter:card tag');
assert.match(html, /<script type="application\/ld\+json">/, 'Missing JSON-LD schema');
const descMatch = html.match(/<meta name="description" content="([^"]+)">/);
assert.ok(descMatch, 'Missing meta description');
assert.ok(descMatch[1].length <= 155, `Meta description too long (${descMatch[1].length} chars; expected <= 155)`);

// CSS: palette, a11y, responsive, overflow
const css = fs.readFileSync('docs/assets/portfolio.css', 'utf8');
assert.ok(css.includes('prefers-reduced-motion'), 'Missing prefers-reduced-motion in portfolio.css');
assert.ok(css.includes(':focus-visible'), 'Missing :focus-visible styling in portfolio.css');
assert.ok(css.includes('1100px'), 'Missing max-width: 1100px tablet breakpoint in portfolio.css');
assert.ok(css.includes('overflow-x: clip'), 'Missing overflow-x: clip in portfolio.css');
assert.ok(!/#00e5ff|#00ffa3/i.test(css), 'Neon #00e5ff / #00ffa3 must be removed from portfolio.css');
assert.ok(!/bg2\.|ocean-fauna|ocean-god-rays|ocean-caustics/.test(css), 'Removed backdrop layers still referenced in CSS');

// Three.js background module
const bg = fs.readFileSync('docs/assets/ocean-bg.js', 'utf8');
assert.ok(bg.includes('prefers-reduced-motion'), 'ocean-bg.js missing prefers-reduced-motion');
assert.ok(bg.includes('visibilitychange'), 'ocean-bg.js missing visibilitychange');
assert.ok(bg.includes('Math.min(') && bg.includes('devicePixelRatio'), 'ocean-bg.js missing DPR cap');
assert.ok(html.includes('assets/ocean-bg.js') && html.includes('type="module"'), 'ocean-bg.js must be loaded as a module');
assert.ok(!fs.readFileSync('docs/assets/portfolio.js', 'utf8').includes('ocean-canvas'), 'portfolio.js still references #ocean-canvas');

// Local links (src/href) must resolve
for (const href of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const url = href[1];
  if (/^(?:https?:|mailto:|#)/.test(url)) continue;
  assertFile(url.endsWith('/') ? `${url}index.html` : url);
}
assert.equal((html.match(/class="project(?: |")/g) || []).length, 4, 'Expected four project cards');
console.log('Portfolio smoke checks passed: sections, local links, 4 cards, assets, importmap/vendor three, SEO, offline fonts, palette, overflow & a11y CSS.');
```
Why this works with the existing link loop: the importmap uses JSON keys, not `src=` or `href=`, so it is not hit by the loop. `assets/ocean-bg.js` is covered by the `src` loop.

Verify (expected to fail ONLY on the two missing screenshots until the producer adds them):
```bash
node --check tools/check-portfolio.js && node tools/check-portfolio.js 2>&1 | tail -3
```

---

## Task 14: Final checks, each under 10 seconds

```bash
# 1. No leftovers anywhere in the portfolio sources
grep -rnE "ocean-canvas|ocean-bg-img|caustics-layer|god-rays|depth-fog|ocean-fauna|marine-creature|bg2\." docs/index.html docs/assets/portfolio.css docs/assets/portfolio.js tools/check-portfolio.js; echo "exit=$? (1 = clean)"

# 2. Syntax
node --check docs/assets/portfolio.js && echo js-ok

# 3. Four project cards
grep -c 'class="project ' docs/index.html

# 4. Palette
grep -n "^  --cyan-glow\|^  --text-lum\|^  --ocean-abyss" docs/assets/portfolio.css

# 5. Sizes for the report
wc -c docs/index.html docs/assets/portfolio.css docs/assets/portfolio.js docs/assets/ocean-bg.js docs/vendor/three.module.js docs/vendor/three.core.js
```

Producer-only checks (not for the executor, needs a browser):
- At 360, 375, 390, 430, 768, 1280 and 1440, check that `document.documentElement.scrollWidth === innerWidth === visualViewport.width`.
- Screenshots at the sizes listed in the spec.
- Capture `sticker-room.png` and `webwiki.png` (1200x750, at most 150 KB).
- Check that the console has no errors and that only one WebGL context is used by the background. The hero `canvas.aquarium-25d` uses Canvas2D, so it is not a WebGL context.
- If the browser shows a black page, check the Network tab for `vendor/three.core.js` 404 and the importmap path.

## Out of scope / do not touch
`docs/apps/**`, `apps/**`, `docs/assets/aquarium25d.js`, `docs/assets/sprites/**`, the `gh-page-card` Abyssal Dive external link, `.abyssal-radar-viewport`, `.claude/`. Do not commit `.claude/`. Do not commit anything unless the producer asks.

### Critical Files for Implementation
- D:\Dungvd\Aquarium\docs\index.html
- D:\Dungvd\Aquarium\docs\assets\portfolio.css
- D:\Dungvd\Aquarium\docs\assets\portfolio.js
- D:\Dungvd\Aquarium\tools\check-portfolio.js
- D:\Dungvd\Aquarium\docs\assets\ocean-bg.js (new)