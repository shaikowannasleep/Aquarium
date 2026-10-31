// Copies the playable hub (D:\Dungvd\PlayableWeb, its own repo) into the portfolio so
// /apps/playable/ is always the current hub, not a stale fork.
//   node tools/sync-playable.cjs [hubDir]     (or PLAYABLE_HUB=...)
// Replaces docs/apps/playable and apps/playable completely, then points the
// "Back to Portfolio" links at the local portfolio (../../) instead of the live site.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HUB = path.resolve(process.argv[2] || process.env.PLAYABLE_HUB || path.join(ROOT, '..', 'PlayableWeb'));
const ENTRIES = ['index.html', 'script.js', 'style.css', 'config.js', 'favicon.svg', 'README.md', 'assets', 'device', 'playable'];
const TARGETS = ['docs/apps/playable', 'apps/playable'];
const PORTFOLIO_URL = 'https://shaikowannasleep.github.io/Aquarium/';

if (!fs.existsSync(path.join(HUB, 'index.html'))) {
    console.error(`hub not found: ${HUB}`);
    process.exit(1);
}

const size = (p) => !fs.existsSync(p) ? 0
    : fs.statSync(p).isDirectory() ? fs.readdirSync(p).reduce((s, n) => s + size(path.join(p, n)), 0)
    : fs.statSync(p).size;
const mb = (b) => (b / 1048576).toFixed(2) + ' MB';

for (const rel of TARGETS) {
    const dest = path.join(ROOT, rel);
    const before = size(dest);
    fs.rmSync(dest, { recursive: true, force: true });
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of ENTRIES) {
        const src = path.join(HUB, entry);
        if (fs.existsSync(src)) fs.cpSync(src, path.join(dest, entry), { recursive: true });
    }
    const index = path.join(dest, 'index.html');
    fs.writeFileSync(index, fs.readFileSync(index, 'utf8').split(`href="${PORTFOLIO_URL}"`).join('href="../../"'));
    console.log(`${rel}: ${mb(before)} -> ${mb(size(dest))}`);
}
