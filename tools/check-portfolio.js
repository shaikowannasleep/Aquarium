// Dependency-free smoke check for the static portfolio and its published routes.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const html = fs.readFileSync('docs/index.html', 'utf8');
const assertFile = (relative) => assert.ok(fs.existsSync(path.join('docs', relative)), `Missing docs/${relative}`);
for (const section of ['main', 'work', 'about', 'skills', 'contact', 'top']) {
  assert.match(html, new RegExp(`id="${section}"`), `Missing #${section}`);
}
for (const route of ['aquarium', 'abyssal-dive', 'lumen-playable', 'ga-ran-bo-gia-dua-non']) {
  assert.ok(html.includes(`apps/${route}/`), `Missing route ${route}`);
  assertFile(`apps/${route}/index.html`);
}
for (const asset of ['assets/favicon.svg', 'assets/portfolio.css', 'assets/portfolio.js', 'apps/aquarium/aquarium.svg']) assertFile(asset);
for (const href of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const url = href[1];
  if (/^(?:https?:|mailto:|#)/.test(url)) continue;
  assertFile(url.endsWith('/') ? `${url}index.html` : url);
}
assert.equal((html.match(/class="project(?: |")/g) || []).length, 4, 'Expected four project cards');
console.log('Portfolio smoke checks passed: sections, local links, four demos and assets.');
