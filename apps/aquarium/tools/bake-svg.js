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
  // 30 fish existed before; 120 x 3 adds 330 fish, for 360 total.
  // Every fish reuses one embedded sprite definition through <use>.
  { key: 'blue_tang',      label: 'azure school',   y: 72,  size: 12, count: 120, seconds: 26, start: 0.19, seed: 11, depth: 'far' },
  { key: 'yellow_tang_v2', label: 'sunbeam school', y: 116, size: 12, count: 120, seconds: 30, start: 0.26, seed: 23, depth: 'mid' },
  { key: 'clownfish_v2',   label: 'coral school',   y: 158, size: 12, count: 120, seconds: 34, start: 0.38, seed: 37, depth: 'near' }
];

const SPECIAL_SPRITES = [
  { id: 'mantaSprite', key: 'manta_ray', w: 42 },
  { id: 'sharkSprite', key: 'blue_shark', w: 46 },
  { id: 'turtleSprite', key: 'green_turtle_v2', w: 34 }
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
  }).join('') + SPECIAL_SPRITES.map((sprite) => {
    const source = path.join(__dirname, '../docs/assets/sprites', sprite.key + '.png');
    if (!fs.existsSync(source)) throw new Error('Missing special sprite: ' + source);
    const meta = SPRITE_META[sprite.key] || [sprite.w, sprite.w];
    const h = Math.round(sprite.w * meta[1] / meta[0]);
    return '<image id="' + sprite.id + '" href="data:image/png;base64,' +
      fs.readFileSync(source).toString('base64') + '" x="-' + (sprite.w / 2) + '" y="-' +
      (h / 2) + '" width="' + sprite.w + '" height="' + h + '" preserveAspectRatio="xMidYMid meet"/>';
  }).join('');
}

function schoolRandom(seed, index) {
  const value = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function renderSchool(school, schoolIndex) {
  const formation = [];
  // Deterministic pseudo-random loose shoal: stable output, natural spacing,
  // and no runtime allocation. Shared <use> sprites keep the SVG compact.
  for (let i = 0; i < school.count; i++) {
    const angle = i * 2.399963 + school.seed;
    const radius = Math.sqrt((i + 0.5) / school.count);
    const jitterX = (schoolRandom(school.seed, i) - 0.5) * 22;
    const jitterY = (schoolRandom(school.seed + 17, i) - 0.5) * 13;
    let localX = Math.round(Math.cos(angle) * radius * 150 + jitterX);
    if (school.depth === 'mid') localX += localX >= 0 ? 168 : -168;
    const localY = Math.round(Math.sin(angle) * radius * 25 + jitterY);
    formation.push('<g transform="translate(' + localX + ' ' + localY + ')">' +
      '<use href="#schoolSprite' + schoolIndex + '"/></g>');
  }
  const shoal = formation.join('');
  const left = -300;
  const right = W + 180;
  const dur = school.seconds + 's';
  const begin = '-' + (school.seconds * school.start).toFixed(2) + 's';
  const restX = Math.round(left + (right - left) * (school.start / 0.5));
  const outbound = '<g opacity="1" transform="translate(' + restX + ' 0)">' +
    '<animate attributeName="opacity" values="1;0" keyTimes="0;.5" calcMode="discrete" dur="' +
    dur + '" begin="' + begin + '" repeatCount="indefinite"/>' +
    '<animateTransform attributeName="transform" type="translate" values="' + left + ' 0;' +
    right + ' 0;' + right + ' 0" keyTimes="0;.5;1" dur="' + dur + '" begin="' + begin +
    '" repeatCount="indefinite"/>' + '<g transform="scale(-1 1)">' + shoal + '</g></g>';
  const inbound = '<g opacity="0" transform="translate(' + right + ' 0)">' +
    '<animate attributeName="opacity" values="0;1" keyTimes="0;.5" calcMode="discrete" dur="' +
    dur + '" begin="' + begin + '" repeatCount="indefinite"/>' +
    '<animateTransform attributeName="transform" type="translate" values="' + right + ' 0;' +
    right + ' 0;' + left + ' 0" keyTimes="0;.5;1" dur="' + dur + '" begin="' + begin +
    '" repeatCount="indefinite"/>' + '<g transform="scale(1 1)">' + shoal + '</g></g>';
  return '<g transform="translate(0 ' + school.y + ')" filter="url(#spriteShadow)"><title>' +
    school.label + ' · ' + school.count + ' small fish · shared sprite atlas</title>' + outbound + inbound + '</g>';
}

function renderSpecialCreatures() {
  return '<g id="atlanticLargeCreatures" filter="url(#spriteShadow)">' +
    '<g transform="translate(238 58)"><animateTransform attributeName="transform" type="translate" values="-40 0;260 4;560 -2" dur="24s" repeatCount="indefinite"/><use href="#mantaSprite"/><title>Manta ray gliding over the Atlantis arch</title></g>' +
    '<g transform="translate(766 92)"><animateTransform attributeName="transform" type="translate" values="0 0;-72 3;0 0" dur="20s" repeatCount="indefinite"/><use href="#sharkSprite"/><title>Small distant shark silhouette</title></g>' +
    '<g transform="translate(590 62)"><animateTransform attributeName="transform" type="translate" values="0 0;28 -4;0 0" dur="18s" repeatCount="indefinite"/><use href="#turtleSprite"/><title>Sea turtle drifting above the ruins</title></g>' +
    '</g>';
}

function bubbleField() {
  const bubbles = [];
  for (let i = 0; i < 26; i++) {
    const x = 20 + ((i * 137) % 840);
    const y = 300 + ((i * 53) % 42);
    const r = 1.5 + (i % 4) * 0.8;
    const rise = 210 + (i % 5) * 28;
    const duration = (7 + (i % 6) * 1.4).toFixed(1);
    const delay = -((i * 1.37) % 9).toFixed(2);
    bubbles.push('<g opacity=".32"><circle cx="0" cy="0" r="' + r.toFixed(1) + '" fill="none" stroke="#bff7f4" stroke-width="1.2"/><animate attributeName="opacity" values=".32;.65;.35;0" keyTimes="0;.12;.75;1" dur="' + duration + 's" begin="' + delay + 's" repeatCount="indefinite"/><animateTransform attributeName="transform" type="translate" values="' + x + ' ' + y + ';' + (x - 8) + ' ' + (y - rise * .45).toFixed(1) + ';' + (x + 7) + ' ' + (y - rise).toFixed(1) + '" dur="' + duration + 's" begin="' + delay + 's" repeatCount="indefinite"/></g>');
  }
  return '<g id="continuousBubbles">' + bubbles.join('') + '</g>';
}

function seaLifeFrame() {
  return '<g id="seaLifeFrame">' +
    '<g fill="#102f43" stroke="#355e6d" stroke-width="2" opacity=".9"><path d="M0 333 L34 291 L72 307 L105 278 L142 321 L176 294 L222 334Z"/><path d="M658 334 L704 294 L738 321 L775 278 L808 307 L846 291 L880 333Z"/></g>' +
    '<g fill="none" stroke-linecap="round"><path d="M13 336 Q-4 281 24 238 Q45 285 33 334" stroke="#173f50" stroke-width="17" opacity=".9"/><path d="M13 336 Q-4 281 24 238 Q45 285 33 334" stroke="#4fbd88" stroke-width="7"/><path d="M69 339 Q44 291 76 251 Q102 292 91 338" stroke="#1d5e59" stroke-width="15"/><path d="M69 339 Q44 291 76 251 Q102 292 91 338" stroke="#58c88e" stroke-width="5"/><path d="M867 336 Q884 281 856 238 Q835 285 847 334" stroke="#173f50" stroke-width="17" opacity=".9"/><path d="M867 336 Q884 281 856 238 Q835 285 847 334" stroke="#4fbd88" stroke-width="7"/><path d="M811 339 Q836 291 804 251 Q778 292 789 338" stroke="#1d5e59" stroke-width="15"/><path d="M811 339 Q836 291 804 251 Q778 292 789 338" stroke="#58c88e" stroke-width="5"/></g>' +
    '<g fill="none" stroke-linecap="round"><path d="M116 344 Q91 304 112 267 M121 344 Q126 295 150 254 M126 344 Q153 310 168 283" stroke="#193d4b" stroke-width="12" opacity=".9"/><path d="M116 344 Q91 304 112 267 M121 344 Q126 295 150 254 M126 344 Q153 310 168 283" stroke="#62d096" stroke-width="4"/><path d="M764 344 Q789 304 768 267 M759 344 Q754 295 730 254 M754 344 Q727 310 712 283" stroke="#193d4b" stroke-width="12" opacity=".9"/><path d="M764 344 Q789 304 768 267 M759 344 Q754 295 730 254 M754 344 Q727 310 712 283" stroke="#62d096" stroke-width="4"/></g>' +
    '<g stroke="#f0b0a1" stroke-width="1.5"><path d="M0 350 Q12 300 27 350 Q39 302 55 350 Q70 310 86 350Z" fill="url(#coralPurple)"/><path d="M82 350 Q98 297 113 350 Q127 304 142 350 Q155 315 173 350Z" fill="url(#coralRed)"/><path d="M707 350 Q725 315 738 350 Q753 304 767 350 Q782 297 798 350Z" fill="url(#coralRed)"/><path d="M794 350 Q810 310 825 350 Q841 302 853 350 Q868 300 880 350Z" fill="url(#coralPurple)"/></g>' +
    '<g fill="#e4ad4e" stroke="#ffe6a1" stroke-width="1"><circle cx="46" cy="325" r="7"/><circle cx="154" cy="330" r="5"/><circle cx="834" cy="325" r="7"/><circle cx="726" cy="330" r="5"/></g>' +
    '<path d="M0 354 Q100 337 205 353 T440 350 T675 353 T880 350 V360 H0Z" fill="#17364a" stroke="none"/>' +
    '<path d="M300 356 L348 333 L391 347 L440 327 L489 347 L532 333 L580 356" fill="none" stroke="#79a59f" stroke-width="4" opacity=".65"/>' +
    '</g>';
}

function angelPalace() {
  // Original six-wing angelic ruin: architectural language and composition are
  // intentionally distinct from the supplied reference image.
  return '<g id="cartoonPalace" stroke="#80b8b6" stroke-width="2.2" stroke-linejoin="round">' +
    '<path d="M0 320 H880 V360 H0Z" fill="#102c40" stroke="none"/>' +
    '<path d="M0 306 L150 292 L270 306 L440 285 L610 306 L730 292 L880 306" fill="none" stroke="#8bb8b1" stroke-width="3" opacity=".7"/>' +
    '<g filter="url(#stoneShadow)"><path d="M-42 320 V48 Q20 8 82 48 V320Z" fill="url(#columnStone)" stroke="#83aaa9" stroke-width="3"/><path d="M798 320 V48 Q860 8 922 48 V320Z" fill="url(#columnStone)" stroke="#83aaa9" stroke-width="3"/></g>' +
    '<g fill="none" stroke="#b7d6c6" stroke-width="2" opacity=".5"><path d="M-24 92 Q20 62 64 92 M-30 128 Q20 98 70 128 M-34 164 Q20 134 74 164 M-38 200 Q20 170 78 200"/><path d="M904 92 Q860 62 816 92 M910 128 Q860 98 810 128 M914 164 Q860 134 806 164 M918 200 Q860 170 802 200"/></g>' +
    '<g fill="#315d6f" stroke="#8ac6c0"><path d="M54 320 V102 L101 65 L148 102 V320Z"/><path d="M732 320 V102 L779 65 L826 102 V320Z"/></g>' +
    '<g fill="#547f86" stroke="#b4d9ca"><path d="M146 320 V128 L198 88 L250 128 V320Z"/><path d="M630 320 V128 L682 88 L734 128 V320Z"/></g>' +
    '<path d="M242 320 V86 L440 18 L638 86 V320Z" fill="#477783" stroke="#b1d4c6"/>' +
    '<path d="M270 320 V125 Q440 8 610 125 V320Z" fill="#0c2f47" stroke="#a9d6ca" stroke-width="4"/>' +
    '<path d="M310 320 V166 Q440 72 570 166 V320Z" fill="#061e37" stroke="#83c1bd" stroke-width="3"/>' +
    '<path d="M350 320 V216 Q440 145 530 216 V320Z" fill="#031629" stroke="#d1e6ce" stroke-width="3"/>' +
    '<path d="M370 230 Q440 169 510 230" fill="none" stroke="#f3cf70" stroke-width="5"/>' +
    // Six-wing guardian crest above the gate.
    '<g transform="translate(440 91) scale(.62)" opacity=".62" fill="#86b7af" stroke="#c4e2cf"><circle cy="-8" r="13" fill="#e7cf88"/>' +
    '<path d="M-13 4 Q-64 -42 -104 -15 Q-67 8 -18 22Z"/><path d="M13 4 Q64 -42 104 -15 Q67 8 18 22Z"/>' +
    '<path d="M-14 13 Q-72 11 -92 51 Q-42 54 -8 30Z"/><path d="M14 13 Q72 11 92 51 Q42 54 8 30Z"/>' +
    '<path d="M-10 20 Q-35 58 -24 85 Q-3 62 0 31Z"/><path d="M10 20 Q35 58 24 85 Q3 62 0 31Z"/></g>' +
    '<g fill="#a7d9cf" stroke="#315d6f"><path d="M92 166 L122 137 L152 166 V200 H92Z"/><path d="M728 166 L758 137 L788 166 V200 H728Z"/><path d="M176 146 L198 125 L220 146 V174 H176Z"/><path d="M660 146 L682 125 L704 146 V174 H660Z"/></g>' +
    '<g fill="#f1d27b" stroke="none"><circle cx="122" cy="183" r="5"/><circle cx="758" cy="183" r="5"/><circle cx="198" cy="158" r="4"/><circle cx="682" cy="158" r="4"/></g>' +
    '<path d="M200 320 L270 287 L330 305 L385 273 L440 300 L495 273 L550 305 L610 287 L680 320" fill="#597b80" stroke="#9cc4bb"/>' +
    '<path d="M440 320 L440 270 M440 320 L383 292 M440 320 L497 292 M383 292 L335 306 M497 292 L545 306" fill="none" stroke="#bad4c9" stroke-width="4" opacity=".75"/>' +
    '<g fill="none" stroke="#b8d8c8" stroke-width="2" opacity=".6"><path d="M16 122 Q36 103 56 122 M16 158 Q36 139 56 158 M824 122 Q844 103 864 122 M824 158 Q844 139 864 158"/><path d="M74 118 l14 16 l-14 16 l14 16 M806 118 l-14 16 l14 16 l-14 16"/></g>' +
    '<g fill="none" stroke="#496f79" stroke-width="5" opacity=".75"><path d="M8 230 Q35 197 62 230"/><path d="M818 230 Q845 197 872 230"/></g>' +
    '<g fill="#254d60" stroke="#9ccbc3"><path d="M20 320 V100 Q45 76 70 100 V320Z"/><path d="M810 320 V100 Q835 76 860 100 V320Z"/></g>' +
    '<g fill="none" stroke="#d0e3c9" stroke-width="3" opacity=".7"><path d="M28 145 q17 -22 34 0 l-10 14 l10 14 l-17 16 l-17 -16 l10 -14Z"/><path d="M818 145 q17 -22 34 0 l-10 14 l10 14 l-17 16 l-17 -16 l10 -14Z"/></g>' +
    '<g fill="none" stroke-linecap="round"><path d="M8 104 Q28 119 17 151 M23 103 Q44 121 31 160 M854 104 Q834 119 845 151 M839 103 Q818 121 831 160" stroke="#153e39" stroke-width="9"/><path d="M8 104 Q28 119 17 151 M23 103 Q44 121 31 160 M854 104 Q834 119 845 151 M839 103 Q818 121 831 160" stroke="#4b9d70" stroke-width="3"/><path d="M304 126 Q326 142 315 166 M576 126 Q554 142 565 166" stroke="#245949" stroke-width="8"/><path d="M304 126 Q326 142 315 166 M576 126 Q554 142 565 166" stroke="#6bb583" stroke-width="2.5"/></g>' +
    '<g stroke="#799e9b" stroke-width="5" opacity=".65"><path d="M30 230 Q45 206 60 230"/><path d="M820 230 Q835 206 850 230"/></g>' +
    '</g>';
}

function atlantisBackdrop() {
  return '<g id="atlantisBackdrop"><path d="M0 0 H880 V360 H0Z" fill="#061b32" opacity=".25"/>' +
    '<g fill="#c7f6ef" opacity=".11"><path d="M75 0 H116 L250 310 H166Z"/><path d="M366 0 H408 L474 300 H397Z"/><path d="M642 0 H684 L758 310 H681Z"/></g>' +
    '<path d="M0 328 Q140 306 280 324 T440 322 T600 324 T880 328 V360 H0Z" fill="#0b2b43" opacity=".92"/>' +
    '</g>';
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
    '<linearGradient id="coralPurple" x1="0" y1="1" x2="0" y2="0"><stop stop-color="#4a236f"/><stop offset="1" stop-color="#c07bd2"/></linearGradient>' +
    '<linearGradient id="coralRed" x1="0" y1="1" x2="0" y2="0"><stop stop-color="#922e51"/><stop offset="1" stop-color="#f07a74"/></linearGradient>' +
    '<linearGradient id="columnStone" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#071c31"/><stop offset=".42" stop-color="#183d53"/><stop offset=".78" stop-color="#315d68"/><stop offset="1" stop-color="#071b2c"/></linearGradient>' +
    '<filter id="stoneShadow" x="-30%" y="-20%" width="160%" height="150%"><feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#020d19" flood-opacity=".8"/></filter>' +
    '<filter id="spriteShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="1.4" flood-color="#011426" flood-opacity=".5"/></filter>' +
    '<filter id="uiShadow"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity=".45"/></filter>' +
    creatureSpriteDefs() + schoolSpriteDefs() + '</defs>');
  body.push('<rect width="880" height="360" fill="url(#water)"/>');
  body.push('<path d="M0 14 Q55 5 110 14 T220 14 T330 14 T440 14 T550 14 T660 14 T770 14 T880 14" fill="none" stroke="#d5fbff" stroke-width="2.5" opacity=".55"><animate attributeName="d" dur="9s" repeatCount="indefinite" values="M0 14 Q55 5 110 14 T220 14 T330 14 T440 14 T550 14 T660 14 T770 14 T880 14;M0 14 Q55 23 110 14 T220 14 T330 14 T440 14 T550 14 T660 14 T770 14 T880 14;M0 14 Q55 5 110 14 T220 14 T330 14 T440 14 T550 14 T660 14 T770 14 T880 14"/></path>');
  body.push('<path d="M75 0 L145 0 L245 290 L-30 290Z M344 0 L404 0 L489 290 L286 290Z M671 0 L735 0 L805 290 L583 290Z" fill="#c4f4ff" opacity=".045"/>');
  body.push('<g fill="none" stroke="#bff5ef" opacity=".16"><path d="M0 42 Q110 27 220 42 T440 42 T660 42 T880 42"><animate attributeName="d" dur="11s" repeatCount="indefinite" values="M0 42 Q110 27 220 42 T440 42 T660 42 T880 42;M0 42 Q110 57 220 42 T440 42 T660 42 T880 42;M0 42 Q110 27 220 42 T440 42 T660 42 T880 42"/></path><path d="M0 70 Q110 55 220 70 T440 70 T660 70 T880 70"><animate attributeName="d" dur="14s" repeatCount="indefinite" values="M0 70 Q110 55 220 70 T440 70 T660 70 T880 70;M0 70 Q110 85 220 70 T440 70 T660 70 T880 70;M0 70 Q110 55 220 70 T440 70 T660 70 T880 70"/></path></g>');
  body.push(atlantisBackdrop());
  body.push(angelPalace());
  body.push(seaLifeFrame());
  body.push(bubbleField());
  body.push('<g fill="none" stroke="#d5f8ff" opacity=".45"><circle cx="305" cy="132" r="4"/><circle cx="316" cy="118" r="7"/><circle cx="325" cy="98" r="3"/><circle cx="548" cy="227" r="4"/><circle cx="561" cy="211" r="7"/><circle cx="573" cy="193" r="3"/></g>');
  SCHOOLS.forEach((school, index) => body.push(renderSchool(school, index)));
  body.push(renderSpecialCreatures());
  ROSTER.forEach((entry, index) => body.push(renderCreature(entry, data, index)));
  body.push('<g transform="translate(16 16)" filter="url(#uiShadow)"><rect width="172" height="42" rx="10" fill="#06233b" fill-opacity=".86" stroke="#6ed8f4" stroke-opacity=".5"/><text x="13" y="16" fill="#d9f7ff" font-family="ui-sans-serif,Arial" font-size="10" font-weight="700">AQUARIUM HAPPINESS</text><rect x="13" y="23" width="145" height="10" rx="5" fill="#123b56"/><rect x="13" y="23" width="113" height="10" rx="5" fill="#46dc87"><animate attributeName="width" values="113;113;121;121;113" keyTimes="0;.625;.65;.72;1" dur="8s" repeatCount="indefinite" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1;.42 0 .58 1"/></rect><text x="162" y="32" text-anchor="end" fill="#fff" font-family="ui-monospace,monospace" font-size="9">78%</text></g>');
  body.push('<g transform="translate(283 211)" opacity="0"><circle r="4" fill="#ffd45e"/><path d="M-7 0 L-13 -4 M-7 0 L-13 4" stroke="#ffd45e" stroke-width="1.7" stroke-linecap="round"/><animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;.375;.39;.625;.63;1" dur="8s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="translate" values="283 211;283 211;283 263;283 263;283 211" keyTimes="0;.375;.5;.625;.63;1" dur="8s" repeatCount="indefinite" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1;.42 0 .58 1"/></g><g transform="translate(283 246)" opacity="0"><text text-anchor="middle" font-family="ui-sans-serif,Arial" font-size="14" fill="#ff4d62">❤<animate attributeName="font-size" values="14;14;26;22;22" keyTimes="0;.625;.64;.70;1" dur="8s" repeatCount="indefinite" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1;.42 0 .58 1"/></text><animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;.625;.64;.70;.72;1" dur="8s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="translate" values="283 246;283 246;283 218;283 218;283 246" keyTimes="0;.625;.64;.70;.72;1" dur="8s" repeatCount="indefinite" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1;.42 0 .58 1"/></g>');
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
