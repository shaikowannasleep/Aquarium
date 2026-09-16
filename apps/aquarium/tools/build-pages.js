'use strict';
/* Generates docs/index.html: the interactive aquarium for GitHub Pages.
 * Inlines engine.js and the fish data so the page is a single file with
 * no external requests, exactly like the playable-ad build. */

const fs = require('fs');
const path = require('path');
const { fetchProfile, fallback } = require('./fetch-github');

function squeeze(js) {
  return js
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map(l => l.replace(/(^|[^:])\/\/.*$/, '$1').trimEnd())
    .filter(l => l.trim().length)
    .join('\n');
}

async function main() {
  const user = process.argv[2] || process.env.GH_USER || 'shaikowannasleep';
  let data;
  try { data = await fetchProfile(user); }
  catch (e) { console.error('warn: ' + e.message); data = fallback(user); }

  const sharedLure = fs.readFileSync(path.join(__dirname, '../../shared/soft-lure.js'), 'utf8');
  const encounter = fs.readFileSync(path.join(__dirname, '../src/encounter-wave-director.js'), 'utf8');
  const engine = fs.readFileSync(path.join(__dirname, '../src/engine.js'), 'utf8');
  const client = fs.readFileSync(path.join(__dirname, '../src/aquarium.js'), 'utf8');
  const background = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '../docs/assets/arcade-aquarium-background.png')).toString('base64');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${data.name} — Aquarium</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;overflow:hidden;background:#02060f;
  font-family:ui-monospace,Menlo,Consolas,monospace;color:#cfeaff}
canvas{display:block;width:100%;height:100%;cursor:crosshair}
#hud{position:fixed;top:14px;left:16px;font-size:11px;line-height:1.9;
  opacity:.72;pointer-events:none;text-shadow:0 2px 8px #000}
#hud b{color:#8fe4ff}
#tip{position:fixed;padding:7px 11px;border-radius:7px;font-size:11px;
  background:rgba(6,18,36,.94);border:1px solid rgba(120,220,255,.35);
  pointer-events:none;opacity:0;transition:opacity .15s;white-space:nowrap;
  box-shadow:0 6px 24px rgba(0,0,0,.6)}
#tip.on{opacity:1}
#foot{position:fixed;bottom:14px;left:16px;font-size:10px;opacity:.4}
#foot a{color:#8fe4ff}
</style>
</head>
<body>
<canvas id="cv"></canvas>
<div id="hud">
  <div><b>${data.name}</b> · ${data.publicRepos} repos · ${data.followers} followers</div>
  <div>${data.fish.length} fish · hover to identify · move to lead them</div>
  <div>next encounter <b><span id="waveCountdown">00:00:60</span></b></div>
  <div>local order <b><span id="ord">0.00</span></b> · <span id="fps">60</span> fps</div>
</div>
<div id="tip"></div>
<div id="foot">boids · reynolds 1987 · <a href="https://github.com/${user}/Aquarium">source</a></div>
<script>
const FISH_DATA = ${JSON.stringify(data.fish)};
${squeeze(sharedLure)}
${squeeze(encounter)}
const AQUARIUM_BACKGROUND = '${background}';
${squeeze(engine)}
${squeeze(client)}
</script>
</body>
</html>`;

  const rootDir = path.resolve(__dirname, '..');
  const isSubApp = path.basename(rootDir) === 'aquarium';
  const projectRoot = isSubApp ? path.resolve(rootDir, '../..') : rootDir;
  const targets = [
    path.join(projectRoot, 'docs/apps/aquarium/index.html'),
    path.join(projectRoot, 'apps/aquarium/docs/index.html')
  ];
  targets.forEach(t => {
    fs.mkdirSync(path.dirname(t), { recursive: true });
    fs.writeFileSync(t, html);
    console.log(t + '  ' + (Buffer.byteLength(html) / 1024).toFixed(1) + ' KB  (' + data.fish.length + ' fish)');

    // Ensure assets/sprites/ has catalog synced
    const targetCatalog = path.join(path.dirname(t), 'assets/sprites/sprite-catalog.json');
    const srcCatalog = path.join(projectRoot, 'docs/assets/sprites/sprite-catalog.json');
    if (fs.existsSync(srcCatalog)) {
      fs.mkdirSync(path.dirname(targetCatalog), { recursive: true });
      fs.copyFileSync(srcCatalog, targetCatalog);
    }
  });
}

if (require.main === module) main();
