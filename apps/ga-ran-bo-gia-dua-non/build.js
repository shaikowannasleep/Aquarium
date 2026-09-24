/* Produces one file that can run from file:// or a GitHub Pages folder. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const asset = name => 'data:image/svg+xml;base64,' +
  fs.readFileSync(path.join(root, 'assets', name), 'base64');
const out = html
  .replace("assets/menu.svg", asset('menu.svg'))
  .replace("assets/khach.svg", asset('khach.svg'));

const script = out.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!script) throw new Error('BUILD FAILED - no game script found');
try { new vm.Script(script, { filename: 'ga-ran-bo-gia-dua-non.js' }); }
catch (error) { throw new Error('BUILD FAILED - game script does not parse: ' + error.message); }
if (/assets\//.test(out) || /<(script|link)[^>]+(?:src|href)=/.test(out)) {
  throw new Error('BUILD FAILED - an external asset reference survived');
}
const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(path.join(dist, 'index.html'), out);
const kb = Buffer.byteLength(out) / 1024;
const gzip = require('zlib').gzipSync(out).length / 1024;
console.log(`dist/index.html   ${kb.toFixed(1)} KB   (gzip ${gzip.toFixed(1)} KB)`);
console.log('external requests 0   ·   file:// ready');
