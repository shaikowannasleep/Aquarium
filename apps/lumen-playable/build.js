/* Inlines CSS + JS into one self-contained index.html.
 * Playable-ad networks (Mintegral, Unity, AppLovin, IronSource, Facebook)
 * all require a single HTML file with zero external requests. */
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'src');
const html = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(src, 'style.css'), 'utf8');
const engine = fs.readFileSync(path.join(src, 'engine.js'), 'utf8');
const game = fs.readFileSync(path.join(src, 'game.js'), 'utf8');

/* Conservative minifier: safe on this codebase (no regex literals, no ASI
 * hazards introduced because we keep all newlines that end statements). */
function squeeze(js) {
  return js
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map(l => l.replace(/(^|[^:])\/\/.*$/, '$1').trimEnd())
    .filter(l => l.trim().length)
    .join('\n');
}

const out = html
  .replace('<link rel="stylesheet" href="style.css">',
           '<style>' + css.replace(/\s*\n\s*/g, '') + '</style>')
  .replace('<script src="engine.js"></script>\n<script src="game.js"></script>',
           '<script>' + squeeze(engine) + '\n' + squeeze(game) + '</script>');

/* Guard: the inlined bundle must parse as a single script.
 * Concatenating two files that both declare top-level `const TAU` is a
 * silent black-screen in the browser, so we fail the build instead. */
const bundle = out.match(/<script>([\s\S]*?)<\/script>/)[1];
try {
  new (require('vm').Script)(bundle, { filename: 'bundle.js' });
} catch (e) {
  console.error('BUILD FAILED - inlined bundle does not parse:');
  console.error('  ' + e.message);
  process.exit(1);
}
if (/<script[^>]+src=/.test(out) || /<link[^>]+href=/.test(out)) {
  console.error('BUILD FAILED - external reference survived inlining');
  process.exit(1);
}

const dist = path.join(__dirname, 'dist');
fs.mkdirSync(dist, { recursive: true });
const file = path.join(dist, 'index.html');
fs.writeFileSync(file, out);

const kb = (Buffer.byteLength(out) / 1024).toFixed(1);
const gz = require('zlib').gzipSync(out).length / 1024;
console.log('dist/index.html   ' + kb + ' KB   (gzip ' + gz.toFixed(1) + ' KB)');
console.log('external requests 0');
console.log('budget 5 MB       ' + (kb / 5120 * 100).toFixed(2) + '% used');
