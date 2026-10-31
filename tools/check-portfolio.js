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
  const clean = url.split(/[?#]/)[0];
  assertFile(clean.endsWith("/") ? `${clean}index.html` : clean);
}
assert.equal((html.match(/class="project(?: |")/g) || []).length, 4, 'Expected four project cards');
console.log('Portfolio smoke checks passed: sections, local links, 4 cards, assets, importmap/vendor three, SEO, offline fonts, palette, overflow & a11y CSS.');
