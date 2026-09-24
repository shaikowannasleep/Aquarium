/* Produces one file that can run from file:// or a GitHub Pages folder. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const asset = (name, mime) => `data:${mime};base64,` +
  fs.readFileSync(path.join(root, name), 'base64');
const out = html
  .replace('<script src="node_modules/phaser/dist/phaser.min.js"></script>',
    '<script>' + fs.readFileSync(path.join(root, 'node_modules/phaser/dist/phaser.min.js'), 'utf8') + '</script>')
  .replace("SHEET_URL='generated_image.png'", "SHEET_URL='" + asset('generated_image.png', 'image/png') + "'")
  .replace("FOOD_SHEET_URL='1.png'", "FOOD_SHEET_URL='" + asset('1.png', 'image/png') + "'");

const scripts = [...out.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
if (!scripts.length) throw new Error('BUILD FAILED - no game script found');
try { scripts.forEach((script, index) => new vm.Script(script, { filename: `bundle-${index}.js` })); }
catch (error) { throw new Error('BUILD FAILED - game script does not parse: ' + error.message); }
if (/generated_image\.png|1\.png|assets\//.test(out) || /<(script|link)[^>]+(?:src|href)=/.test(out)) {
  throw new Error('BUILD FAILED - an external asset reference survived');
}
const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(path.join(dist, 'index.html'), out);
const kb = Buffer.byteLength(out) / 1024;
const gzip = require('zlib').gzipSync(out).length / 1024;
console.log(`dist/index.html   ${kb.toFixed(1)} KB   (gzip ${gzip.toFixed(1)} KB)`);
console.log('external requests 0   ·   file:// ready');
