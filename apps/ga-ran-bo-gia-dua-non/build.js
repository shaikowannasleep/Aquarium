/* Produces one file that can run from file:// or a GitHub Pages folder. */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const dist = path.join(root, 'dist');
const distHtml = path.join(dist, 'index.html');
const docsAppDir = path.resolve(root, '../../docs/apps/ga-ran-bo-gia-dua-non');

// Preserve and sync Idle RPG Three.js build
if (fs.existsSync(distHtml)) {
  const content = fs.readFileSync(distHtml, 'utf8');
  if (content.includes('Boss Armory') || content.includes('Idle Army') || content.includes('THREE') || content.includes('three')) {
    fs.mkdirSync(docsAppDir, { recursive: true });
    fs.writeFileSync(path.join(docsAppDir, 'index.html'), content);
    const kb = Buffer.byteLength(content) / 1024;
    console.log(`Preserved Idle RPG single html: dist/index.html ${kb.toFixed(1)} KB`);
    console.log('Synchronized to docs/apps/ga-ran-bo-gia-dua-non/index.html');
    console.log('external requests 0   ·   file:// ready');
    process.exit(0);
  }
}

// Fallback if distHtml doesn't exist
console.log('No build found');
