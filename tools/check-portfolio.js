// Dependency-free smoke check for the static portfolio and its published routes.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const html = fs.readFileSync('docs/index.html', 'utf8');
const assertFile = (relative) => assert.ok(fs.existsSync(path.join('docs', relative)), `Missing docs/${relative}`);
for (const section of ['main', 'work', 'about', 'skills', 'contact', 'top']) {
  assert.match(html, new RegExp(`id="${section}"`), `Missing #${section}`);
}
for (const route of ['aquarium', 'abyssal-dive', 'lumen-playable', 'idle-rpg']) {
  assert.ok(html.includes(`apps/${route}/`), `Missing route ${route}`);
  assertFile(`apps/${route}/index.html`);
}
for (const asset of ['assets/favicon.svg', 'assets/portfolio.css', 'assets/portfolio.js', 'apps/aquarium/aquarium.svg']) assertFile(asset);
for (const projImg of ['assets/projects/abyssal-dive.png', 'assets/projects/lumen-playable.png', 'assets/projects/idle-rpg.png']) assertFile(projImg);

// Verify no third-party shields.io badges remain (100% offline & zero external request compliance)
assert.ok(!html.includes('img.shields.io'), 'Expected zero external img.shields.io badges in docs/index.html');

// Verify typo EXPLORER is resolved to EXPLORE
assert.ok(!html.includes('EXPLORER ALL PLAYABLES'), 'Found typo EXPLORER ALL PLAYABLES; expected EXPLORE');

// Verify SEO & Structured Data tags
assert.match(html, /<link rel="canonical"/, 'Missing canonical link tag');
assert.match(html, /<meta property="og:image"/, 'Missing og:image tag');
assert.match(html, /<meta name="twitter:card"/, 'Missing twitter:card tag');
assert.match(html, /<script type="application\/ld\+json">/, 'Missing JSON-LD schema');

// Verify meta description length <= 155 chars
const descMatch = html.match(/<meta name="description" content="([^"]+)">/);
assert.ok(descMatch, 'Missing meta description');
assert.ok(descMatch[1].length <= 155, `Meta description too long (${descMatch[1].length} chars; expected <= 155)`);

// Verify CSS accessibility & responsive breakpoint rules
const css = fs.readFileSync('docs/assets/portfolio.css', 'utf8');
assert.ok(css.includes('prefers-reduced-motion'), 'Missing prefers-reduced-motion in portfolio.css');
assert.ok(css.includes(':focus-visible'), 'Missing :focus-visible styling in portfolio.css');
assert.ok(css.includes('1100px'), 'Missing max-width: 1100px tablet breakpoint in portfolio.css');

for (const href of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const url = href[1];
  if (/^(?:https?:|mailto:|#)/.test(url)) continue;
  assertFile(url.endsWith('/') ? `${url}index.html` : url);
}
assert.equal((html.match(/class="project(?: |")/g) || []).length, 4, 'Expected four project cards');
console.log('Portfolio smoke checks passed: sections, local links, 4 demos, assets, SEO, zero external shields, responsive & a11y CSS.');

