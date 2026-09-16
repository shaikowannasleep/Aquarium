/* Inlines CSS + JS into one self-contained index.html.
 * Playable-ad networks (Mintegral, Unity, AppLovin, IronSource, Facebook)
 * all require a single HTML file with zero external requests. */
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'src');
const html = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(src, 'style.css'), 'utf8');
const shared = fs.readFileSync(path.join(__dirname, '../shared/soft-lure.js'), 'utf8');
const engine = fs.readFileSync(path.join(src, 'engine.js'), 'utf8');
const game = fs.readFileSync(path.join(src, 'game.js'), 'utf8');
const spriteNames = {
  school: 'cyan_fish.png', predator: 'hammerhead_shark.png', reef: 'sea_anemone.png',
};
const sprites = Object.fromEntries(Object.entries(spriteNames).map(([name, file]) => {
  const png = fs.readFileSync(path.join(__dirname, '../../docs/assets/sprites', file));
  return [name, 'data:image/png;base64,' + png.toString('base64')];
}));

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
  .replace(/<script>\s*window\.SPRITE_SOURCES\s*=[\s\S]*?<\/script>/,
           '<script>window.SPRITE_SOURCES=' + JSON.stringify(sprites) + ';</script>')
  .replace(/<script src="\.\.\/\.\.\/shared\/soft-lure\.js"><\/script>\s*/g, '')
  .replace(/<script src="(?:engine|game)\.js"><\/script>\s*/g, '')
  .replace('</body>', '<script>' + squeeze(shared) + '\n' + squeeze(engine) + '\n' + squeeze(game) + '</script>\n</body>');

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
