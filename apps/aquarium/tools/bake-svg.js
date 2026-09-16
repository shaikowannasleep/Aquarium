'use strict';
/* =====================================================================
 * Directed Aquarium SVG bake.
 *
 * GitHub README SVG is a compact stage, not a full runtime simulation.
 * It uses a fixed 16-creature roster with separate habitat lanes so no
 * unrelated species form a mixed flock or overlap. Canvas boids remain a
 * separate concern in src/aquarium.js.
 * ===================================================================== */

const fs = require('fs');
const path = require('path');
const { fetchProfile, fallback } = require('./fetch-github');

const W = 880;
const H = 360;
const DURATION = '16s';

const SPRITE_META = {
  orange_seahorse: [66, 100], pink_seahorse: [62, 97],
  red_crab: [96, 79], blue_crab: [107, 82], shore_crab: [95, 79],
  cleaner_shrimp: [106, 91], peppermint_shrimp: [97, 92],
  green_turtle_v2: [111, 72], leatherback_turtle: [117, 85],
  blue_dolphin: [98, 73], dolphin: [92, 75], blue_shark: [105, 76]
};

const ROSTER = [
  // Six coral-anchored seahorses: bob only, never turn or join a flock.
  { key: 'orange_seahorse', role: 'seahorse', x: 92, y: 225, w: 23, side: 'right', motion: 'bob', phase: '0s' },
  { key: 'pink_seahorse', role: 'seahorse', x: 166, y: 245, w: 23, side: 'left', motion: 'bob', phase: '-3s' },
  { key: 'orange_seahorse', role: 'seahorse', x: 344, y: 220, w: 23, side: 'right', motion: 'bob', phase: '-2s' },
  { key: 'pink_seahorse', role: 'seahorse', x: 430, y: 244, w: 23, side: 'left', motion: 'bob', phase: '-5s' },
  { key: 'orange_seahorse', role: 'seahorse', x: 652, y: 225, w: 23, side: 'right', motion: 'bob', phase: '-1s' },
  { key: 'pink_seahorse', role: 'seahorse', x: 779, y: 241, w: 23, side: 'left', motion: 'bob', phase: '-4s' },
  // Bottom corridor: three crabs and two shrimp, no swimming through water.
  { key: 'red_crab', role: 'crab', x: 154, y: 295, w: 27, side: 'right', motion: 'patrol', dx: 16, phase: '-1s' },
  { key: 'blue_crab', role: 'crab', x: 400, y: 300, w: 29, side: 'left', motion: 'patrol', dx: -15, phase: '-4s' },
  { key: 'shore_crab', role: 'crab', x: 705, y: 293, w: 27, side: 'right', motion: 'patrol', dx: 15, phase: '-6s' },
  { key: 'cleaner_shrimp', role: 'shrimp', x: 283, y: 271, w: 27, side: 'right', motion: 'reef', dx: 10, phase: '-2s' },
  { key: 'peppermint_shrimp', role: 'shrimp', x: 614, y: 270, w: 28, side: 'left', motion: 'reef', dx: -10, phase: '-5s' },
  // The lower reef inhabitants stay anchored as before. The open upper water is
  // intentionally reserved for three calm, coordinated schools of small fish.
];

// start = how far into its own cycle each school already is when the SVG is
// first painted. A school is mid-crossing for the first half of its cycle, so
// any value below .5 means that school is already on screen at frame 0.
const SCHOOLS = [
  { key: 'blue_tang',      label: 'azure school',   y: 72,  size: 18, seconds: 26, start: 0.19 },
  { key: 'yellow_tang_v2', label: 'sunbeam school', y: 116, size: 17, seconds: 30, start: 0.26 },
  { key: 'clownfish_v2',   label: 'coral school',   y: 158, size: 18, seconds: 34, start: 0.38 }
];

function esc(value) {
  return String(value).replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

function spriteUri(key) {
  const source = path.join(__dirname, '../docs/assets/sprites', key + '.png');
  if (!fs.existsSync(source)) throw new Error('Missing aquarium sprite: ' + source);
  return 'data:image/png;base64,' + fs.readFileSync(source).toString('base64');
}

function spriteHeight(entry) {
  const meta = SPRITE_META[entry.key];
  return Math.round(entry.w * meta[1] / meta[0]);
}

function motionDuration(entry) {
  if (entry.role === 'shark') return '16s';
  if (entry.role === 'turtle') return '13s';
  if (entry.motion === 'patrol') return '8s';
  if (entry.motion === 'reef') return '7s';
  return '12s';
}

function creatureMotion(entry) {
  const phase = entry.phase || '0s';
  if (entry.motion === 'bob') {
    return '<animateTransform attributeName="transform" type="translate" values="0 0;0 -7;0 0" dur="6.8s" begin="' + phase + '" repeatCount="indefinite" additive="sum" calcMode="spline" keyTimes="0;.5;1" keySplines=".42 0 .58 1;.42 0 .58 1"/>';
  }
  if (entry.motion === 'patrol') {
    return '<animateTransform attributeName="transform" type="translate" values="0 0;' + entry.dx + ' 0;' + entry.dx + ' 0;0 0;0 0" dur="' + motionDuration(entry) + '" begin="' + phase + '" repeatCount="indefinite" additive="sum" calcMode="spline" keyTimes="0;.45;.54;.96;1" keySplines=".42 0 .58 1;0 0 1 1;.42 0 .58 1;0 0 1 1"/>';
  }
  if (entry.motion === 'reef') {
    return '<animateTransform attributeName="transform" type="translate" values="0 0;' + entry.dx + ' -3;0 0" dur="' + motionDuration(entry) + '" begin="' + phase + '" repeatCount="indefinite" additive="sum" calcMode="spline" keyTimes="0;.5;1" keySplines=".42 0 .58 1;.42 0 .58 1"/>';
  }
  return '<animateTransform attributeName="transform" type="translate" values="0 0;' + entry.dx + ' ' + entry.dy + ';0 0" dur="' + motionDuration(entry) + '" begin="' + phase + '" repeatCount="indefinite" additive="sum" calcMode="spline" keyTimes="0;.5;1" keySplines=".42 0 .58 1;.42 0 .58 1"/>';
}

function facingScale(direction) {
  // All approved side-view PNG sprites face LEFT natively. Mirror only the
  // right-moving leg; never animate scale through zero.
  return direction === 'right' ? -1 : 1;
}

function cruiseLeg(entry, image, direction, index) {
  const margin = Math.ceil(entry.w * 1.6);
  const leftOutside = -entry.x - margin;
  const rightOutside = W - entry.x + margin;
  const start = direction === 'right' ? leftOutside : rightOutside;
  const end = direction === 'right' ? rightOutside : leftOutside;
  const duration = motionDuration(entry);
  const phase = entry.phase || '0s';
  const firstLeg = index === 0;
  const keyTimes = firstLeg ? '0;.04;.46;1' : '0;.54;.96;1';
  const values = firstLeg
    ? start + ' 0;' + start + ' 0;' + end + ' 0;' + end + ' 0'
    : start + ' 0;' + start + ' 0;' + end + ' 0;' + end + ' 0';
  const splines = firstLeg
    ? '0 0 1 1;.42 0 .58 1;0 0 1 1'
    : '0 0 1 1;.42 0 .58 1;0 0 1 1';
  return '<g><animateTransform attributeName="transform" type="translate" values="' + values +
    '" dur="' + duration + '" begin="' + phase + '" repeatCount="indefinite" additive="sum" calcMode="spline" keyTimes="' + keyTimes + '" keySplines="' + splines + '"/>' +
    '<g transform="scale(' + facingScale(direction) + ' 1)">' + image + '</g></g>';
}

function renderCreature(entry, data, index) {
  const h = spriteHeight(entry);
  const repo = data.fish[index % Math.max(1, data.fish.length)] || { name: entry.role, lang: 'Aquarium' };
  const image = '<use href="#creatureSprite' + index + '"/>';
  const poses = entry.motion === 'cruise'
    ? cruiseLeg(entry, image, 'right', 0) + cruiseLeg(entry, image, 'left', 1)
    : '<g transform="scale(' + facingScale(entry.side) + ' 1)">' + image + '</g>';
  return '<g transform="translate(' + entry.x + ' ' + entry.y + ')" filter="url(#spriteShadow)">' +
    (entry.motion === 'cruise' ? '' : creatureMotion(entry)) + poses +
    '<title>' + esc(repo.name) + ' · ' + esc(entry.role) + ' · ' + esc(repo.lang) + '</title></g>';
}

function schoolSpriteDefs() {
  return SCHOOLS.map((school, index) => {
    const source = path.join(__dirname, '../docs/assets/sprites', school.key + '.png');
    if (!fs.existsSync(source)) throw new Error('Missing school sprite: ' + source);
    return '<image id="schoolSprite' + index + '" href="data:image/png;base64,' +
      fs.readFileSync(source).toString('base64') + '" x="-' + (school.size / 2) + '" y="-' +
      (school.size * 0.58).toFixed(1) + '" width="' + school.size + '" height="' +
      (school.size * 1.16).toFixed(1) + '" preserveAspectRatio="xMidYMid meet"/>';
  }).join('');
}

function renderSchool(school, schoolIndex) {
  // One school = ten small fish held in a fixed formation, so the group reads
  // as a single shoal rather than ten independent swimmers.
  const formation = [];
  for (let i = 0; i < 10; i++) {
    const column = i % 5;
    const row = Math.floor(i / 5);
    const localX = column * 22 + row * 10;
    const localY = (row ? 11 : 0) + ((column % 2) ? 4 : -2);
    const bob = (i % 3) * 2;
    formation.push('<g transform="translate(' + localX + ' ' + localY + ')">' +
      '<animateTransform attributeName="transform" type="translate" values="0 0;0 ' +
      (-3 - bob) + ';0 0" dur="' + (3.8 + (i % 3) * 0.45).toFixed(2) + 's" begin="' +
      (-i * 0.19).toFixed(2) + 's" repeatCount="indefinite" additive="sum"/>' +
      '<use href="#schoolSprite' + schoolIndex + '"/></g>');
  }
  const shoal = formation.join('');

  // Both ends sit fully outside the 880-wide frame, so a school is always off
  // screen at the moment it turns around.
  const left = -260;
  const right = W + 160;
  const dur = school.seconds + 's';
  // A negative begin winds the timeline forward, so the school is already part
  // way across the frame the instant the SVG is first painted.
  const begin = '-' + (school.seconds * school.start).toFixed(2) + 's';
  // Matching static pose, for GitHub's cached raster preview and for any
  // renderer that ignores SMIL: the school sits where the animation would
  // have carried it by that same point in the cycle.
  const restX = Math.round(left + (right - left) * (school.start / 0.5));

  // Outbound leg: left to right across the first half of the cycle, then
  // parked off screen. Visibility is switched discretely, while out of view.
  const outbound = '<g opacity="1" transform="translate(' + restX + ' 0)">' +
    '<animate attributeName="opacity" values="1;0" keyTimes="0;.5" calcMode="discrete" dur="' +
    dur + '" begin="' + begin + '" repeatCount="indefinite"/>' +
    '<animateTransform attributeName="transform" type="translate" values="' +
    left + ' 0;' + right + ' 0;' + right + ' 0" keyTimes="0;.5;1" dur="' + dur +
    '" begin="' + begin + '" repeatCount="indefinite"/>' +
    '<g transform="scale(-1 1)">' + shoal + '</g></g>';

  // Return leg: the same school mirrored, crossing right to left over the
  // second half of the cycle. It only becomes visible once the outbound leg
  // has left the frame, so the turn itself is never seen on screen.
  const inbound = '<g opacity="0" transform="translate(' + right + ' 0)">' +
    '<animate attributeName="opacity" values="0;1" keyTimes="0;.5" calcMode="discrete" dur="' +
    dur + '" begin="' + begin + '" repeatCount="indefinite"/>' +
    '<animateTransform attributeName="transform" type="translate" values="' +
    right + ' 0;' + right + ' 0;' + left + ' 0" keyTimes="0;.5;1" dur="' + dur +
    '" begin="' + begin + '" repeatCount="indefinite"/>' +
    '<g transform="scale(1 1)">' + shoal + '</g></g>';

  return '<g transform="translate(0 ' + school.y + ')" filter="url(#spriteShadow)"><title>' +
    school.label + ' · 10 small fish swimming together</title>' + outbound + inbound + '</g>';
}

function cartoonPalace() {
  return '<g id="cartoonPalace" stroke="#173f69" stroke-width="2.5" stroke-linejoin="round">' +
    '<path d="M249 305 L249 239 L275 214 L301 239 L301 305 M579 305 L579 239 L605 214 L631 239 L631 305" fill="#426fa6"/>' +
    '<path d="M274 214 L275 187 L293 206 L301 214 M604 214 L605 187 L623 206 L631 214" fill="#7fd9f0"/>' +
    '<path d="M301 305 L301 216 L340 188 L380 216 L380 305 M500 305 L500 216 L540 188 L579 216 L579 305" fill="#4f82bd"/>' +
    '<path d="M378 305 L378 192 L440 151 L502 192 L502 305" fill="#5c91c9"/>' +
    '<path d="M410 305 L410 227 Q440 202 470 227 L470 305" fill="#173f69" stroke="#9eeeff"/>' +
    '<path d="M419 238 Q440 219 461 238" fill="none" stroke="#ffd979" stroke-width="4"/>' +
    '<g fill="#b8f7ff" stroke="#173f69"><path d="M326 238 Q340 222 354 238 L354 258 L326 258Z"/><path d="M526 238 Q540 222 554 238 L554 258 L526 258Z"/><path d="M422 184 Q440 166 458 184 L458 207 L422 207Z"/></g>' +
    '<g fill="#ffe083" stroke="none" opacity=".85"><circle cx="340" cy="248" r="4"/><circle cx="540" cy="248" r="4"/><circle cx="440" cy="196" r="4"/></g>' +
    '<path d="M223 306 H657" fill="none" stroke="#8fd6e7" stroke-width="4" opacity=".65"/>' +
    '<path d="M237 305 Q282 287 322 305 Q364 288 405 305 Q450 287 494 305 Q538 288 590 305 Q624 291 652 305" fill="#295b88" stroke="none" opacity=".82"/>' +
    '</g>';
}

function coralAndHabitat() {
  return [
    '<path d="M0 296 Q48 267 91 297 Q132 237 180 300 Q233 260 283 300 Q340 245 390 300 Q442 269 496 300 Q545 236 602 300 Q654 258 708 299 Q755 238 809 299 Q848 272 880 294 L880 360 L0 360Z" fill="#11485f" opacity=".72"/>',
    '<path d="M0 306 Q146 291 287 308 Q437 292 592 309 Q742 291 880 305 L880 360 L0 360Z" fill="url(#sand)"/>',
    '<g fill="url(#rock)" stroke="#173a52" stroke-width="3"><path d="M5 322 L31 276 L66 263 L99 291 L122 323Z"/><path d="M211 324 L239 284 L278 276 L309 305 L327 324Z"/><path d="M499 324 L528 282 L566 274 L602 306 L622 324Z"/><path d="M743 324 L774 275 L819 268 L856 300 L880 324Z"/></g>',
    '<g fill="none" stroke="url(#kelp)" stroke-linecap="round">' +
    '<path d="M37 326 Q18 289 39 250 Q58 286 48 326" stroke-width="7"><animateTransform attributeName="transform" type="rotate" values="-3 37 326;3 37 326;-3 37 326" dur="7s" repeatCount="indefinite"/></path>' +
    '<path d="M121 326 Q95 278 124 227 Q150 279 133 326" stroke-width="8"><animateTransform attributeName="transform" type="rotate" values="-3 121 326;3 121 326;-3 121 326" dur="8s" repeatCount="indefinite"/></path>' +
    '<path d="M350 326 Q330 276 355 237 Q378 282 364 326" stroke-width="7"><animateTransform attributeName="transform" type="rotate" values="-3 350 326;3 350 326;-3 350 326" dur="7.5s" repeatCount="indefinite"/></path>' +
    '<path d="M681 326 Q655 274 688 233 Q714 281 700 326" stroke-width="8"><animateTransform attributeName="transform" type="rotate" values="-3 681 326;3 681 326;-3 681 326" dur="8.3s" repeatCount="indefinite"/></path></g>',
    '<g fill="none" stroke-linecap="round" stroke-width="5">' +
    '<path d="M88 322 Q75 273 93 240 M85 286 L61 265 M91 276 L113 252" stroke="url(#coralOrange)"/>' +
    '<path d="M165 322 Q178 274 161 244 M172 284 L197 261 M165 273 L143 257" stroke="url(#coralPink)"/>' +
    '<path d="M340 322 Q327 270 350 236 M340 285 L312 263 M347 273 L371 252" stroke="url(#coralOrange)"/>' +
    '<path d="M429 322 Q441 273 423 247 M434 285 L458 264 M428 274 L406 256" stroke="url(#coralPink)"/>' +
    '<path d="M648 322 Q634 272 655 241 M648 285 L621 264 M654 274 L677 254" stroke="url(#coralOrange)"/>' +
    '<path d="M777 322 Q789 273 771 244 M783 285 L807 263 M776 275 L754 255" stroke="url(#coralPink)"/></g>'
  ].join('');
}

function creatureSpriteDefs() {
  return ROSTER.map((entry, index) => {
    const h = spriteHeight(entry);
    return '<image id="creatureSprite' + index + '" href="' + spriteUri(entry.key) +
      '" x="' + (-entry.w / 2) + '" y="' + (-h / 2) + '" width="' + entry.w +
      '" height="' + h + '" preserveAspectRatio="xMidYMid meet"/>';
  }).join('');
}

function buildSvg(data) {
  const body = [];
  body.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(data.name) + ' directed aquarium">');
  body.push('<defs>' +
    '<radialGradient id="water" cx="50%" cy="0%" r="110%"><stop offset="0" stop-color="#2aaed0"/><stop offset=".30" stop-color="#08718f"/><stop offset=".75" stop-color="#043958"/><stop offset="1" stop-color="#01213f"/></radialGradient>' +
    '<linearGradient id="sand" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#e7c47b"/><stop offset="1" stop-color="#9c7044"/></linearGradient>' +
    '<linearGradient id="rock" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#7293a7"/><stop offset="1" stop-color="#1d435a"/></linearGradient>' +
    '<linearGradient id="kelp" x1="0" y1="1" x2="0" y2="0"><stop stop-color="#0b6c54"/><stop offset=".5" stop-color="#19b477"/><stop offset="1" stop-color="#77e69e"/></linearGradient>' +
    '<linearGradient id="coralPink" x1="0" y1="1" x2="0" y2="0"><stop stop-color="#b53b68"/><stop offset="1" stop-color="#ff9aba"/></linearGradient>' +
    '<linearGradient id="coralOrange" x1="0" y1="1" x2="0" y2="0"><stop stop-color="#ba4932"/><stop offset="1" stop-color="#ffbd76"/></linearGradient>' +
    '<filter id="spriteShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="1.4" flood-color="#011426" flood-opacity=".5"/></filter>' +
    '<filter id="uiShadow"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity=".45"/></filter>' +
    creatureSpriteDefs() + schoolSpriteDefs() + '</defs>');
  body.push('<rect width="880" height="360" fill="url(#water)"/>');
  body.push('<path d="M0 14 Q55 5 110 14 T220 14 T330 14 T440 14 T550 14 T660 14 T770 14 T880 14" fill="none" stroke="#d5fbff" stroke-width="2.5" opacity=".55"><animate attributeName="d" dur="9s" repeatCount="indefinite" values="M0 14 Q55 5 110 14 T220 14 T330 14 T440 14 T550 14 T660 14 T770 14 T880 14;M0 14 Q55 23 110 14 T220 14 T330 14 T440 14 T550 14 T660 14 T770 14 T880 14;M0 14 Q55 5 110 14 T220 14 T330 14 T440 14 T550 14 T660 14 T770 14 T880 14"/></path>');
  body.push('<path d="M75 0 L145 0 L245 290 L-30 290Z M344 0 L404 0 L489 290 L286 290Z M671 0 L735 0 L805 290 L583 290Z" fill="#c4f4ff" opacity=".045"/>');
  body.push(cartoonPalace());
  body.push(coralAndHabitat());
  body.push('<g fill="none" stroke="#d5f8ff" opacity=".45"><circle cx="305" cy="132" r="4"/><circle cx="316" cy="118" r="7"/><circle cx="325" cy="98" r="3"/><circle cx="548" cy="227" r="4"/><circle cx="561" cy="211" r="7"/><circle cx="573" cy="193" r="3"/></g>');
  SCHOOLS.forEach((school, index) => body.push(renderSchool(school, index)));
  ROSTER.forEach((entry, index) => body.push(renderCreature(entry, data, index)));
  body.push('<g transform="translate(16 16)" filter="url(#uiShadow)"><rect width="172" height="42" rx="10" fill="#06233b" fill-opacity=".86" stroke="#6ed8f4" stroke-opacity=".5"/><text x="13" y="16" fill="#d9f7ff" font-family="ui-sans-serif,Arial" font-size="10" font-weight="700">AQUARIUM HAPPINESS</text><rect x="13" y="23" width="145" height="10" rx="5" fill="#123b56"/><rect x="13" y="23" width="113" height="10" rx="5" fill="#46dc87"><animate attributeName="width" values="113;113;121;121;113" keyTimes="0;.625;.65;.72;1" dur="8s" repeatCount="indefinite" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1;.42 0 .58 1"/></rect><text x="162" y="32" text-anchor="end" fill="#fff" font-family="ui-monospace,monospace" font-size="9">78%</text></g>');
  body.push('<g transform="translate(283 211)" opacity="0"><circle r="4" fill="#ffd45e"/><path d="M-7 0 L-13 -4 M-7 0 L-13 4" stroke="#ffd45e" stroke-width="1.7" stroke-linecap="round"/><animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;.375;.39;.625;.63;1" dur="8s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="translate" values="283 211;283 211;283 263;283 263;283 211" keyTimes="0;.375;.5;.625;.63;1" dur="8s" repeatCount="indefinite" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1;.42 0 .58 1"/></g><g transform="translate(283 246)" opacity="0"><text text-anchor="middle" font-family="ui-sans-serif,Arial" font-size="14" fill="#ff4d62">❤<animate attributeName="font-size" values="14;14;26;22;22" keyTimes="0;.625;.64;.70;1" dur="8s" repeatCount="indefinite" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1;.42 0 .58 1"/></text><animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;.625;.64;.70;.72;1" dur="8s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="translate" values="283 246;283 246;283 218;283 218;283 246" keyTimes="0;.625;.64;.70;.72;1" dur="8s" repeatCount="indefinite" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1;.42 0 .58 1"/></g>');
  body.push('<text x="16" y="347" fill="#d4f7ff" opacity=".65" font-family="ui-monospace,monospace" font-size="10">3 calm schools · 10 fish per school · cartoon coral palace</text>');
  body.push('</svg>');
  return body.join('');
}

async function getData(user) {
  try { return await fetchProfile(user); }
  catch (error) {
    console.error('warn: ' + error.message);
    return fallback(user);
  }
}

async function main() {
  const user = process.argv[2] || process.env.GH_USER || 'shaikowannasleep';
  const data = await getData(user);
  const svg = buildSvg(data);
  const appRoot = path.resolve(__dirname, '..');
  const projectRoot = path.resolve(appRoot, '../..');
  const targets = [
    path.join(appRoot, 'docs/aquarium.svg'),
    path.join(projectRoot, 'docs/aquarium.svg'),
    path.join(projectRoot, 'docs/apps/aquarium/aquarium.svg')
  ];
  for (const target of targets) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, svg);
    console.log(target + '  ' + (Buffer.byteLength(svg) / 1024).toFixed(1) + ' KB');
  }
  console.log('built directed SVG: ' + ROSTER.length + ' creatures');
}

if (require.main === module) main();
module.exports = { buildSvg, ROSTER, SCHOOLS };
