'use strict';
/* =====================================================================
 * Pulls the public GitHub profile of a user and maps it onto fish.
 * Uses only the unauthenticated REST API when no token is present, so
 * it works locally without any secret. Inside Actions, GITHUB_TOKEN is
 * injected automatically and raises the rate limit.
 * ===================================================================== */

const https = require('https');

/* GitHub's own language palette, trimmed to the common ones. */
const LANG_COLOR = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
  'C#': '#178600', 'C++': '#f34b7d', C: '#555555', Java: '#b07219',
  HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051', Go: '#00ADD8',
  Rust: '#dea584', Ruby: '#701516', PHP: '#4F5D95', Swift: '#F05138',
  Kotlin: '#A97BFF', Dart: '#00B4AB', Lua: '#000080', GLSL: '#5686a5',
  ShaderLab: '#222c37', HLSL: '#aace60', Vue: '#41b883', Jupyter: '#DA5B0B',
};

function get(path) {
  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': 'abyssal-aquarium',
      Accept: 'application/vnd.github+json',
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = 'Bearer ' + process.env.GITHUB_TOKEN;
    }
    https.get({ host: 'api.github.com', path, headers }, res => {
      let body = '';
      res.on('data', d => (body += d));
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error('GitHub ' + res.statusCode + ' on ' + path + ' :: ' + body.slice(0, 160)));
        }
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

/* Map one repository onto one fish. */
function repoToFish(r, now) {
  const stars = r.stargazers_count || 0;
  const pushed = new Date(r.pushed_at || r.updated_at || now).getTime();
  const ageDays = (now - pushed) / 86400000;

  // size: sublinear in stars so one viral repo does not eat the screen
  const size = 5.5 + Math.min(Math.sqrt(stars) * 1.5, 13);

  // A repo left alone for a year swims slowly. That is the whole of it.
  // Nothing sinks, nothing dies: the point of an aquarium is that the
  // fish are alive.
  const dormant = ageDays > 365;
  const pace = dormant ? 0.45 : 1;

  return {
    name: r.name,
    lang: r.language || 'Other',
    color: LANG_COLOR[r.language] || '#7fd8ff',
    stars,
    forks: r.forks_count || 0,
    size,
    pace,
    dormant,
    ageDays: Math.round(ageDays),
  };
}

async function fetchProfile(user) {
  const repos = [];
  for (let page = 1; page <= 3; page++) {
    const batch = await get('/users/' + user + '/repos?per_page=100&page=' + page + '&sort=pushed');
    repos.push.apply(repos, batch);
    if (batch.length < 100) break;
  }
  const profile = await get('/users/' + user);
  const now = Date.now();

  const fish = repos
    .filter(r => !r.fork)
    .map(r => repoToFish(r, now))
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 42);          // keep the SVG light

  return {
    user,
    name: profile.name || user,
    followers: profile.followers || 0,
    publicRepos: profile.public_repos || 0,
    fish,
    generated: new Date().toISOString(),
  };
}

/* A deterministic fallback so the build never breaks when the API is
 * rate-limited or the machine is offline. */
function fallback(user) {
  const langs = Object.keys(LANG_COLOR).slice(0, 14);
  return {
    user,
    name: user,
    followers: 0,
    publicRepos: langs.length,
    offline: true,
    fish: langs.map((l, i) => ({
      name: 'repo-' + i, lang: l, color: LANG_COLOR[l],
      stars: (i * 7) % 40, forks: i,
      size: 6 + ((i * 5) % 11), pace: i % 6 === 0 ? 0.45 : 1,
      dormant: i % 6 === 0, ageDays: i * 30,
    })),
    generated: new Date().toISOString(),
  };
}

module.exports = { fetchProfile, fallback, LANG_COLOR };

if (require.main === module) {
  const user = process.argv[2] || 'shaikowannasleep';
  fetchProfile(user)
    .then(d => console.log(JSON.stringify(d, null, 2)))
    .catch(e => {
      console.error('warn: ' + e.message);
      console.log(JSON.stringify(fallback(user), null, 2));
    });
}
