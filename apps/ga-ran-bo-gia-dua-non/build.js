/* Produces one file that can run from file:// or a GitHub Pages folder. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const asset = (name, mime) => `data:${mime};base64,` +
  fs.readFileSync(path.join(root, name), 'base64');
const game = fs.readFileSync(path.join(root, 'src/game.js'), 'utf8')
  .replace(/SHEET_URL\s*=\s*['"]runtime\/people-atlas\.png['"]/, "SHEET_URL='" + asset('runtime/people-atlas.png', 'image/png') + "'")
  .replace(/FOOD_SHEET_URL\s*=\s*['"]runtime\/food-atlas\.png['"]/, "FOOD_SHEET_URL='" + asset('runtime/food-atlas.png', 'image/png') + "'")
  .replace(/CHEF_SHEET_URL\s*=\s*['"]runtime\/chef-atlas\.png['"]/, "CHEF_SHEET_URL='" + asset('runtime/chef-atlas.png', 'image/png') + "'");

const out = html
  .replace('<script src="node_modules/phaser/dist/phaser.min.js"></script>',
    '<script>' + fs.readFileSync(path.join(root, 'node_modules/phaser/dist/phaser.min.js'), 'utf8') + '</script>')
  .replace('<script src="src/game.js"></script>', '<script>' + game + '</script>');

const scripts = [...out.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
if (!scripts.length) throw new Error('BUILD FAILED - no game script found');
try { scripts.forEach((script, index) => new vm.Script(script, { filename: `bundle-${index}.js` })); }
catch (error) { throw new Error('BUILD FAILED - game script does not parse: ' + error.message); }
if (/runtime\/|generated_image\.png|1\.png|assets\//.test(out) || /<(script|link)[^>]+(?:src|href)=/.test(out)) {
  throw new Error('BUILD FAILED - an external asset reference survived');
}
const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(path.join(dist, 'index.html'), out);

// Also sync directly to docs/apps/ga-ran-bo-gia-dua-non/index.html
const docsAppDir = path.resolve(root, '../../docs/apps/ga-ran-bo-gia-dua-non');
if (fs.existsSync(docsAppDir)) {
  fs.writeFileSync(path.join(docsAppDir, 'index.html'), out);
  console.log('Synchronized to docs/apps/ga-ran-bo-gia-dua-non/index.html');
}

const kb = Buffer.byteLength(out) / 1024;
const gzip = require('zlib').gzipSync(out).length / 1024;
console.log(`dist/index.html   ${kb.toFixed(1)} KB   (gzip ${gzip.toFixed(1)} KB)`);
console.log('external requests 0   ·   file:// ready');
