'use strict';
/* =====================================================================
 * ABYSSAL DIVE :: Oceanography
 * ---------------------------------------------------------------------
 * The depth model behind the readout panel.
 *
 * ON ACCURACY. These are TYPICAL open-ocean values, not measurements of
 * any one place. Real temperature and light vary enormously with
 * latitude, season and water clarity: a winter North Atlantic surface is
 * near 4 C while an equatorial one is near 30 C. Figures here are chosen
 * to be defensible as "mid-latitude open ocean, no particular season",
 * and anything shakier is marked approximate in the text itself.
 *
 * Before quoting any of this in a portfolio write-up, check it against
 * NOAA, MBARI or WoRMS. Web sources on deep-sea fauna are unusually full
 * of copied-and-garbled numbers.
 *
 * The design rule for this file: every fact on the panel must explain a
 * rule the player has already felt. Facts that do not touch a mechanic
 * are trivia, and trivia gets skipped.
 * ===================================================================== */

/* Pressure: seawater is ~1.025 g/cm3, so roughly one atmosphere per 10 m
 * of depth, plus the one atmosphere of air already sitting on top. */
function pressureBar(depth) {
  return 1 + depth / 9.95;
}

/* Temperature: a smooth stand-in for the real profile - warm mixed layer,
 * steep thermocline between roughly 200 m and 1000 m, then the cold and
 * almost unchanging deep. Below ~2000 m the ocean is 0-4 C essentially
 * everywhere on Earth, which is the part that matters here. */
function temperatureC(depth) {
  if (depth <= 100) return 18 - depth * 0.02;
  if (depth <= 1000) {
    const t = (depth - 100) / 900;
    return 16 - 12 * Math.pow(t, 0.65);          // thermocline
  }
  if (depth <= 4000) {
    const t = (depth - 1000) / 3000;
    return 4 - 2.2 * t;
  }
  // slight rise with depth in the deepest water: adiabatic compression
  return 1.8 + (depth - 4000) * 0.00012;
}

/* Fraction of surface daylight remaining. Attenuation is exponential;
 * the coefficient here gives the textbook landmarks - about 1% left near
 * 150 m, and nothing a human eye could register past roughly 1000 m. */
function lightFraction(depth) {
  return Math.exp(-depth / 32.5);
}

function lightLabel(depth) {
  const f = lightFraction(depth);
  if (depth < 200) return (f * 100).toFixed(f > 0.01 ? 1 : 3) + '% of surface light';
  if (depth < 1000) return 'trace daylight, far below vision';
  return 'no sunlight at all';
}

/* ---------------------------------------------------------------------
 * The five layers. Each carries the cover types that can grow there,
 * which is what keeps the level generator honest.
 * ------------------------------------------------------------------- */
const LAYERS = [
  {
    key: 'epipelagic',
    name: 'EPIPELAGIC',
    common: 'the sunlit zone',
    from: 0, to: 200,
    tint: '#2f7fd0',
    solid: ['rock', 'coral'],
    passable: ['kelp'],
    passableName: 'kelp',
    fauna: ['sardine', 'anchovy', 'moon jelly', 'mackerel'],
    facts: [
      {
        tag: 'why they follow you',
        text: 'Schooling fish steer by their neighbours, not by a leader. ' +
              'Reynolds showed in 1987 that separation, alignment and cohesion ' +
              'alone reproduce the whole shape of a school.',
      },
      {
        tag: 'why kelp grows here',
        text: 'Kelp is a photosynthesiser. It cannot live below the sunlit ' +
              'zone, which is why it is the only soft cover on this level.',
      },
    ],
  },
  {
    key: 'mesopelagic',
    name: 'MESOPELAGIC',
    common: 'the twilight zone',
    from: 200, to: 1000,
    tint: '#1d4f8c',
    solid: ['rock'],
    passable: ['siphonophore'],
    passableName: 'siphonophore curtain',
    fauna: ['lanternfish', 'hatchetfish', 'bristlemouth', 'krill'],
    facts: [
      {
        tag: 'the largest migration on Earth',
        text: 'Much of this layer swims toward the surface at dusk to feed ' +
              'and sinks again before dawn. It happens every night, ocean-wide.',
      },
      {
        tag: 'why your lamp works',
        text: 'Lanternfish carry rows of light organs and orient to light. ' +
              'A steady lamp gathers them; a harsh one scatters them.',
      },
      {
        tag: 'the most numerous vertebrate alive',
        text: 'Bristlemouths of the genus Cyclothone are thought to be the ' +
              'most abundant vertebrates on the planet, and almost nobody ' +
              'has heard of them.',
      },
    ],
  },
  {
    key: 'bathypelagic',
    name: 'BATHYPELAGIC',
    common: 'the midnight zone',
    from: 1000, to: 4000,
    tint: '#132e5c',
    solid: ['rock', 'deepcoral'],
    passable: ['glasssponge'],
    passableName: 'glass sponge garden',
    fauna: ['anglerfish', 'gulper eel', 'dragonfish', 'grenadier'],
    facts: [
      {
        tag: 'no sunlight reaches here',
        text: 'Every light you can see below 1000 m was made by something ' +
              'alive. Nothing filters down this far.',
      },
      {
        tag: 'why everything glows blue',
        text: 'Bioluminescence clusters around 470-490 nm because blue ' +
              'travels furthest through seawater. The palette of this game ' +
              'is set by physics, not by taste.',
      },
      {
        tag: 'the fish with a red searchlight',
        text: 'Malacosteus, a dragonfish, emits red light that most of its ' +
              'prey cannot see - a private searchlight in a blue world.',
      },
      {
        tag: 'the lure is a trap',
        text: 'An anglerfish hangs a lit esca in front of its mouth. Down ' +
              'here, a light in the dark is as often bait as it is company.',
      },
    ],
  },
  {
    key: 'abyssopelagic',
    name: 'ABYSSOPELAGIC',
    common: 'the abyss',
    from: 4000, to: 6000,
    tint: '#0b1c3d',
    solid: ['rock', 'nodule'],
    passable: ['xenophyophore'],
    passableName: 'xenophyophore field',
    fauna: ['sea pig', 'tripod fish', 'dumbo octopus', 'rattail'],
    facts: [
      {
        tag: 'roughly 400 atmospheres',
        text: 'At 4000 m the water presses with about four hundred times the ' +
              'weight of the air at the surface.',
      },
      {
        tag: 'everything here is falling',
        text: 'With no sunlight there is no plant life. Almost the entire ' +
              'food supply is marine snow drifting down from far above.',
      },
      {
        tag: 'the fish that stands still',
        text: 'The tripod fish props itself on three stiffened fins and waits, ' +
              'facing the current, for food to arrive. It barely swims at all.',
      },
      {
        tag: 'why the schools thin out',
        text: 'Shoaling needs food dense enough to be worth crowding for. ' +
              'Down here animals are mostly solitary, and the water goes quiet.',
      },
    ],
  },
  {
    key: 'hadal',
    name: 'HADAL',
    common: 'the trenches',
    from: 6000, to: 11000,
    tint: '#060f24',
    solid: ['rock', 'nodule'],
    passable: ['xenophyophore'],
    passableName: 'xenophyophore field',
    fauna: ['snailfish', 'amphipod', 'sea cucumber'],
    facts: [
      {
        tag: 'only in the trenches',
        text: 'The hadal zone is not an open layer but the inside of ocean ' +
              'trenches, so it is a scattering of deep pockets rather than ' +
              'one continuous world.',
      },
      {
        tag: 'a ceiling for fish',
        text: 'No fish has been confirmed below roughly 8300 m. Past that ' +
              'depth the chemistry that keeps their proteins working appears ' +
              'to give out.',
      },
    ],
  },
];

function layerAt(depth) {
  for (let i = 0; i < LAYERS.length; i++) {
    if (depth < LAYERS[i].to) return LAYERS[i];
  }
  return LAYERS[LAYERS.length - 1];
}

/* The descent ladder. Fixed rather than random so a player passes through
 * every layer in order and the panel has a story to tell. */
const DIVE_LADDER = [140, 620, 1500, 2600, 3600, 4600, 5600, 6800];

function depthForRun(runIndex) {
  const i = Math.min(runIndex, DIVE_LADDER.length - 1);
  return DIVE_LADDER[i];
}

/* Human-readable cover names, for the panel and for tooltips. */
const COVER_NAMES = {
  rock: 'rock',
  coral: 'reef coral',
  deepcoral: 'deep-sea coral',
  nodule: 'manganese nodule',
  kelp: 'kelp',
  siphonophore: 'siphonophore',
  glasssponge: 'glass sponge',
  xenophyophore: 'xenophyophore',
};

function readout(depth) {
  const L = layerAt(depth);
  return {
    layer: L,
    depth,
    tempC: temperatureC(depth),
    pressureBar: pressureBar(depth),
    light: lightLabel(depth),
    lightFraction: lightFraction(depth),
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LAYERS, DIVE_LADDER, COVER_NAMES,
    layerAt, depthForRun, readout,
    temperatureC, pressureBar, lightFraction, lightLabel,
  };
}
if (typeof window !== 'undefined') {
  window.OCEAN = {
    LAYERS, DIVE_LADDER, COVER_NAMES,
    layerAt, depthForRun, readout,
    temperatureC, pressureBar, lightFraction, lightLabel,
  };
}
