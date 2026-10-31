# Spec: Portfolio rebuild (2026-10-31)

Site: `docs/` (GitHub Pages, static, no build step). Serve: `npm run serve` → http://localhost:8090. Test: `npm run test:portfolio`.

## 0. Size before (bytes)
| File | Before |
| --- | --- |
| docs/index.html | 71430 |
| docs/assets/portfolio.css | 72480 |
| docs/assets/portfolio.js | 19131 |
| docs/assets/aquarium25d.js | 30471 |
| docs/assets/bg2.png / .jpg / .avif | 1.79 MB png (+ jpg, avif) |

## 1. Mobile horizontal drag (BUG, root cause measured)
Measured at 375x812: `innerWidth=600`, `documentElement.scrollWidth=600`, `visualViewport.width=375`.
- `.subsea-header-cta` (264px wide, x=334) overflows `.subsea-header` → the layout viewport widens to 600px. `body{overflow-x:hidden}` does not stop the layout viewport from widening on mobile.
- `.ocean-god-rays` is 720px wide, and the creatures (`.creature-ray`, whale shark `translate(100vw+400px)`) also go outside the viewport.

Fix:
1. Header ≤ 760px: hide the CTA button text (keep the icon or move the CTA into the menu) so header content is ≤ 100% of the width. Add `min-width:0` on flex children.
2. `html, body { overflow-x: clip; }` (fallback `hidden`). `.ocean-backdrop-wrapper { position:fixed; inset:0; overflow:hidden; contain:strict; }`.
3. Remove the old fauna layer and god-rays layer (replaced by Three.js, §2).
4. Acceptance: at 360, 375, 390, 430, 768, 1280 and 1440, `document.documentElement.scrollWidth === innerWidth === visualViewport.width`.

## 2. Three.js background (replaces SVG/bg2 image + CSS fauna + ocean-canvas 2D)
- Vendor three r186: `docs/vendor/three.module.min.js` (+ `three.core.min.js` if the module imports it). Load it with `<script type="importmap">`. No CDN (offline rule).
- New file `docs/assets/ocean-bg.js` (ES module):
  - A fixed full-viewport canvas `#ocean-bg` with `z-index:-1` and `pointer-events:none`.
  - Scene: a calm deep-sea gradient (shader plane: deep navy at the bottom → slightly lighter blue-teal at the top, low saturation), soft light shafts (additive, opacity ≤ 0.08), 300–600 slow-drifting particles (marine snow, `Points`, size 1–2px, opacity ≤ 0.35), and a light mouse/scroll parallax (camera offset ≤ 0.3).
  - No neon colours and no bright glow. The background must never compete with the text: mean luminance ≤ 12%.
  - Performance: DPR cap at 1.5 (1 on mobile ≤ 760px); `antialias:false`; particles at 300 on mobile; pause on `visibilitychange` hidden; render at 30fps; on resize, update the renderer size and camera aspect.
  - `prefers-reduced-motion: reduce` → render 1 static frame, no loop.
  - Fallback: if WebGL fails or the module throws, the CSS gradient on `body` stays (do not leave a black page).
- Remove: `#ocean-canvas` plus its code in `portfolio.js` (line ~149), `.ocean-bg-img` (bg2.*), `.ocean-caustics-layer`, `.ocean-god-rays`, `.ocean-depth-fog` and `.ocean-fauna-layer` with its creature `<img>`s, plus their CSS/keyframes. Do not delete bg2.* yet if it is still used elsewhere (grep first); if unused, delete the files.
- Hero `canvas.aquarium-25d` (aquarium25d.js) stays (it is the project's own demo).

## 3. Low-glare palette (WCAG AA)
Replace the neon variables (`--cyan-glow #00e5ff`, `--seafoam-neon #00ffa3`, `--coral-accent`, `--text-pure #fff`, ...) with:
| Var | Value | Use |
| --- | --- | --- |
| --ocean-abyss | #0b1620 | page background |
| --ocean-deep | #0f1d29 | section |
| --ocean-mid | #142636 | card |
| --cyan-glow (accent) | #7cc4d6 | link, focus, primary accent |
| --seafoam-neon (accent 2) | #9fd3b4 | tag, tertiary accent |
| --gold-accent | #e3c27a | highlights only |
| --coral-accent | #e08a9a | sparingly |
| --text-pure | #e8eef2 | headings |
| --text-bright | #dde6ec | |
| --text-lum | #c5d2db | body text (contrast ≥ 7:1 on #0b1620) |
| --text-muted | #93a6b4 | secondary text (≥ 4.5:1) |
| --text-dim | #6f8494 | decoration only, never body text |
- Every `rgba(0, 229, 255, x)` → `rgba(124, 196, 214, x*0.7)`. Reduce glows: `box-shadow`/`text-shadow` glows to alpha ≤ 0.12; remove text-shadow neon on headings.
- `.glass-*` keep blur but use background `rgba(15, 29, 41, 0.78)` (more readable over the 3D background).
- The light theme `html[data-theme=light]` (if present) must not break: check it once.

## 4. Project content
- Delete the cards **Abyssal Dive** (index.html ~line 586) and **Lumen** (~line 605); delete `assets/projects/abyssal-dive.png` and `lumen-playable.png` if they are no longer referenced.
- Add 2 cards (same markup as the existing `.project` cards):
  1. **Sticker Room**: "Cute 3D unpack & decorate puzzle game — Three.js + Jolt Physics. 10 rooms × 3 stages, Zen mode, auto graphics tier, ~36 draw calls, render-on-demand." `data-category="game"`. Buttons: Live demo https://shaikowannasleep.github.io/sticker-room/ and GitHub https://github.com/shaikowannasleep/sticker-room. Image `assets/projects/sticker-room.png` (capture a screenshot of the live demo, 1200x750, PNG/WebP ≤ 150 KB).
  2. **WebWiki (TGSH Wiki)**: "Vietnamese wiki + studio tools for Soul Land: Awakening World — soul rings, soul bones, team builder, OCR crop tool. Node + Vercel serverless + Postgres." `data-category="web"` (add a filter if one exists). Buttons: Live https://tgsh-wiki.vercel.app/ and GitHub https://github.com/shaikowannasleep/WebWiki. Image `assets/projects/webwiki.png` (screenshot of the live site, same spec).
  - Note: the WebWiki GitHub repo currently returns 404 when not signed in (private). Keep the link as requested; the Live button is primary.
- Card order: Aquarium (featured), Idle RPG, Sticker Room, WebWiki. Still exactly 4 `class="project"` cards.
- Update the JSON-LD/routes/filter that reference abyssal-dive/lumen-playable (grep `abyssal|lumen` across `docs/` and `tools/`).
- In-page text that calls these "playable ads": only Idle RPG is a playable ad; Sticker Room is a web game and WebWiki is a web app.

## 5. Fonts
Google Fonts makes an external request. Keep Outfit + JetBrains Mono but self-host woff2 (`docs/assets/fonts/`, latin + vietnamese subsets, weights 400/600/700) or drop to `system-ui` if the download fails. Remove `Space Grotesk` if it is not loaded.

## 6. Test `tools/check-portfolio.js`
- routes: `aquarium, idle-rpg, sticker-room, webwiki` (no abyssal/lumen).
- Required images: sticker-room.png, webwiki.png; abyssal/lumen are forbidden.
- Card count = 4; no Google Fonts / CDN; `type="importmap"` exists and points to a local `vendor/three` file that exists.
- CSS: no `#00e5ff` or `#00ffa3` left; has `overflow-x: clip`; keeps `prefers-reduced-motion`, `:focus-visible`, `1100px`.
- `ocean-bg.js` exists, contains `prefers-reduced-motion` and `visibilitychange`, and has a DPR cap (`Math.min(` + `devicePixelRatio`).

## 7. Acceptance (Producer checks)
- Screenshots at 375x812 portrait, 812x375 landscape, 768, 1280 and 1440: no overlap, readable text, the 3D background visible but calm, header not overflowing.
- No horizontal scroll at any width (§1.4). Drag left/right on mobile does not shift the frame.
- Console has no errors; at most 1 WebGL context for the background.
- `npm run test:portfolio` passes.
- Sizes after vs before (table §0) + vendor three.
- Commit only the task's files; do not commit `.claude/`.
