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

const SPECIES = [
  { name: 'clownfish', sprite: 'clownfish', group: 0, schooling: true, depth: 0.45 },
  { name: 'yellow-tang', sprite: 'yellow_tang', group: 1, schooling: true, depth: 0.55 },
  { name: 'blue-tang', sprite: 'blue_tang', group: 1, schooling: true, depth: 0.55 },
  { name: 'neon-tetra', sprite: 'cyan_fish', group: 2, schooling: true, depth: 0.32 },
  { name: 'damselfish', sprite: 'damselfish', group: 2, schooling: true, depth: 0.35 },
  { name: 'angelfish', sprite: 'striped_angelfish', group: 3, schooling: true, depth: 0.65 },
  { name: 'butterflyfish', sprite: 'butterflyfish', group: 3, schooling: true, depth: 0.60 },
  { name: 'seahorse', sprite: 'orange_seahorse', group: 4, schooling: true, depth: 0.78 },
  { name: 'pink-seahorse', sprite: 'pink_seahorse', group: 4, schooling: true, depth: 0.82 },
  { name: 'sea-turtle', sprite: 'green_turtle', group: 5, schooling: false, depth: 0.50 },
  { name: 'manta-ray', sprite: 'manta_ray', group: 5, schooling: true, depth: 0.40 },
  { name: 'dolphin', sprite: 'blue_dolphin', group: 6, schooling: true, depth: 0.25 },
  { name: 'blue-whale', sprite: 'blue_whale', group: 6, schooling: false, depth: 0.30 },
  { name: 'pufferfish', sprite: 'green_pufferfish', group: 7, schooling: true, depth: 0.70 },
  { name: 'jellyfish', sprite: 'blue_jellyfish', group: 7, schooling: true, depth: 0.75 },
  { name: 'blue-shark', sprite: 'blue_shark', group: 6, schooling: false, depth: 0.35 },
  { name: 'red-crab', sprite: 'red_crab', group: 8, schooling: false, depth: 0.90, benthic: true },
  { name: 'starfish', sprite: 'orange_starfish', group: 8, schooling: false, depth: 0.92, benthic: true },
  { name: 'giant-clam', sprite: 'giant_clam', group: 8, schooling: false, depth: 0.93, benthic: true },
  { name: 'red-lobster', sprite: 'red_lobster', group: 8, schooling: false, depth: 0.91, benthic: true },
];

function speciesFor(language, name) {
  let hash = 0;
  const source = (name || '') + (language || 'Other');
  for (let i = 0; i < source.length; i++) hash = (hash * 31 + source.charCodeAt(i)) | 0;
  return SPECIES[(hash >>> 0) % SPECIES.length];
}

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

  // Commits count approximation from repo code size and activity
  const commits = r.commits || Math.max(3, Math.round((r.size || 80) / 10) + stars * 4 + (r.forks_count || 0) * 8);

  // Size directly driven by commits and project volume:
  // Base 5.5px + logarithmic-linear scaling of commits count
  const size = 5.5 + Math.min(Math.cbrt(commits) * 2.2 + Math.sqrt(stars) * 1.1, 16.5);

  const dormant = ageDays > 365;
  const pace = dormant ? 0.45 : 1;
  const species = speciesFor(r.language, r.name);

  return {
    name: r.name,
    lang: r.language || 'Other',
    color: LANG_COLOR[r.language] || '#7fd8ff',
    stars,
    commits,
    forks: r.forks_count || 0,
    size,
    pace,
    species: species.name,
    sprite: species.sprite,
    groupId: species.group,
    schooling: species.schooling,
    depth: species.depth,
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
    fish: langs.map((l, i) => {
      const species = speciesFor(l);
      return {
      name: 'repo-' + i, lang: l, color: LANG_COLOR[l],
      stars: (i * 7) % 40, forks: i,
      size: 6 + ((i * 5) % 11), pace: i % 6 === 0 ? 0.45 : 1,
      species: species.name, sprite: species.sprite,
      schooling: species.schooling, depth: species.depth,
      dormant: i % 6 === 0, ageDays: i * 30,
      };
    }),
    generated: new Date().toISOString(),
  };
}

module.exports = { fetchProfile, fallback, LANG_COLOR, SPECIES, speciesFor };

if (require.main === module) {
  const user = process.argv[2] || 'shaikowannasleep';
  fetchProfile(user)
    .then(d => console.log(JSON.stringify(d, null, 2)))
    .catch(e => {
      console.error('warn: ' + e.message);
      console.log(JSON.stringify(fallback(user), null, 2));
    });
}
