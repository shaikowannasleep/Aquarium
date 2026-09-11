/* Inlines everything into one self-contained dist/index.html that runs
 * from file:// with zero requests. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = path.join(__dirname, 'src');
const html = fs.readFileSync(path.join(src, 'index.html'), 'utf8');

function squeeze(js) {
  return js
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map(l => l.replace(/(^|[^:])\/\/.*$/, '$1').trimEnd())
    .filter(l => l.trim().length)
    .join('\n');
}

const files = ['oceanography.js', 'flowfield.js', 'level.js', 'engine.js', 'game.js'];
const bundle = files.map(f => squeeze(fs.readFileSync(path.join(src, f), 'utf8'))).join('\n');

const tags = files.map(f => '<script src="' + f + '"></script>').join('\n');
const out = html.replace(tags, '<script>' + bundle + '</script>');

if (out.indexOf('<script src=') !== -1) {
  console.error('BUILD FAILED - a script tag survived inlining');
  process.exit(1);
}
try {
  new vm.Script(bundle, { filename: 'bundle.js' });
} catch (e) {
  console.error('BUILD FAILED - bundle does not parse:\n  ' + e.message);
  process.exit(1);
}
for (const [name, re] of [
  ['type="module"', /type=["']module["']/],
  ['fetch()', /\bfetch\s*\(/],
  ['external href', /<link[^>]+href=/],
]) {
  if (re.test(out)) { console.error('BUILD FAILED - ' + name + ' blocks file://'); process.exit(1); }
}

fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist/index.html'), out);

/* docs/ is what GitHub Pages serves, so keep it in step with dist/.
 * One build, two destinations, no chance of them drifting apart. */
fs.mkdirSync(path.join(__dirname, 'docs'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'docs/index.html'), out);
const kb = Buffer.byteLength(out) / 1024;
console.log('dist/index.html   ' + kb.toFixed(1) + ' KB   (gzip ' +
  (require('zlib').gzipSync(out).length / 1024).toFixed(1) + ' KB)');
console.log('external requests 0   ·   file:// ready');
console.log('also written to   docs/index.html  (GitHub Pages)');
