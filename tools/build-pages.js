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

  const engine = fs.readFileSync(path.join(__dirname, '../src/engine.js'), 'utf8');
  const client = fs.readFileSync(path.join(__dirname, '../src/aquarium.js'), 'utf8');

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
  <div>local order <b><span id="ord">0.00</span></b> · <span id="fps">60</span> fps</div>
</div>
<div id="tip"></div>
<div id="foot">boids · reynolds 1987 · <a href="https://github.com/${user}/Aquarium">source</a></div>
<script>
const FISH_DATA = ${JSON.stringify(data.fish)};
${squeeze(engine)}
${squeeze(client)}
</script>
</body>
</html>`;

  const out = path.join(__dirname, '../docs/index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log('docs/index.html  ' + (Buffer.byteLength(html) / 1024).toFixed(1) + ' KB  (' + data.fish.length + ' fish)');
}

if (require.main === module) main();
