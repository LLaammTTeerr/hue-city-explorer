import { hex } from './geo/buf.ts';

// bank height above the river surface (river is y = 0): the city floor less the river's level, both as ICESat-2's
// laser measured them (3.5 m and 0.9 m above sea level; scripts/build-data.mjs prints the pair and checks this)
export const LAND_Y = 2.6;
export const POND_Y = LAND_Y - 1.3; // lakes, ponds and the moat stand just below ground level
// carriageway width in metres by road class, 0 (widest) … ROAD_MAX (narrowest); road data is clamped to that range on load
export const ROAD_W = [15, 12, 9.5, 6.5, 4, 2.2];
export const ROAD_MAX = ROAD_W.length - 1;
// a data.roads entry's carriageway width in metres: its own (4th element, dm) where it has one, e.g. each carriageway of
// a divided road (issue #15), otherwise its class width
export const roadWidth = (r) => (r[3] > 0 ? r[3] / 10 : ROAD_W[Math.max(0, Math.min(ROAD_MAX, r[0] | 0))]);
export const WALL_H = 6.6; // Citadel wall height, from the OSM tag on the wall relation

export const isCoarse = () => matchMedia('(pointer: coarse)').matches;
export const quality = (() => {
  const side = Math.min(innerWidth, innerHeight);
  const small = side > 0 && side < 560; // a zero-sized (hidden) window says nothing about the device
  const low = isCoarse() || small;
  return {
    low,
    pixelRatio: Math.min(devicePixelRatio || 1, low ? 1.5 : 2),
    shadowSize: low ? 1024 : 2048,
    reflection: !low,
    treeShare: low ? 0.5 : 1,
    rainCount: low ? 3500 : 8000,
  };
})();

// Colours are authored in sRGB and converted to linear once.
export const PAL = {
  land: '#d5cab0',
  bank: '#968d7a',
  base: '#5e554c',
  green: { park: '#92ae68', wood: '#729454', grass: '#a3b874', farm: '#b8be7e', cemetery: '#b8b498', pitch: '#8eb068', sacred: '#cfc198', paved: '#c3bdb1' },
  // carriageways in crisp slate-asphalt with clean pale stone kerbs so warm roofs pop
  road: ['#6d6a6c', '#706d6f', '#747173', '#7a7778', '#8a8682', '#ebe2ce'],
  casing: '#f2ead8',
  // a divided road's median (issue #15): turf inside a pale grey stone kerb, low clipped shrubs on it
  median: '#89a65e',
  medianKerb: '#dcd9d2',
  shrubs: ['#557c42', '#4c733c', '#638849', '#456838'],
  rail: '#544c58',
  ballast: '#bfb39f',
  // sun-baked terracotta & weathered clay tiles with warm hue separation against ivory walls
  roofs: ['#b8543a', '#a64a34', '#c26245', '#ae543c', '#9c4b39', '#b45c42', '#a2503b', '#bc6448', '#ad573e', '#8c5240', '#7a6256', '#928b80', '#866b58', '#839094', '#9e4638'].map(hex),
  walls: ['#f3e4c4', '#f7ecd4', '#ecd7a6', '#f2e1bc', '#e8e2ce', '#eed8c2', '#eddab0', '#f6ecd4', '#ebd49c', '#dde2ce', '#d8e1e4', '#ecd3bf', '#e2cca0', '#d5dbc6', '#e6c89e', '#e9cc8c', '#e2c282'].map(hex),
  concrete: ['#e2dcd0', '#e8e3d8', '#dcd5c8', '#e5dfd2'].map(hex),
  // the three building families (see scripts/build-data.mjs §4b)
  indochine: ['#f0d182', '#e7c36e', '#f4dc9e', '#eccb7a', '#f6e4b8', '#e8c16a', '#f0d4aa'].map(hex), // warm lime-wash ochres
  indochineRoof: ['#be5a3e', '#b25138', '#c66446', '#a84b34'].map(hex), // sunlit Marseille tile
  tradWall: ['#724d3b', '#634334', '#7c5640', '#86493a', '#6e5040'].map(hex), // jackfruit-wood panels
  tradRoof: ['#7a6354', '#846a58', '#6e5f54', '#88705c', '#6a6859'].map(hex), // old liệt tiles, weathered
  thatch: ['#c3af74', '#b8a368', '#ccb880', '#ae9962'].map(hex), // rice-straw roofs
  thatchWall: ['#c4aa84', '#b59a74', '#cfb690', '#997e62'].map(hex), // earth and bamboo walls
  pastel: ['#f2f4ee', '#eaf0ec', '#e5eef2', '#f6efe0', '#efe6e0', '#ecf2e0', '#f7f4ec', '#e1ebed', '#f4e6d0', '#ededed'].map(hex),
  metalRoof: ['#5a82a2', '#4c7191', '#98433c', '#699288', '#a0aaaf'].map(hex), // painted sheet roofs
  // roof families read from the satellite scene (scripts/fetch-roofs.py; index = family: 1 red tile, 2 blue sheet,
  // 3 pale concrete or light sheet, 4 grey concrete or weathered tile)
  roofFamily: [null,
    ['#b8543a', '#a84c3c', '#c26144', '#9e4836', '#b25942', '#c8684a'],
    ['#5a82a2', '#4c7191', '#698da8', '#567a94'],
    ['#e4e0d8', '#ebe8e0', '#dcd8ce', '#f0ece2'],
    ['#a39e95', '#938f88', '#aea9a0', '#88847d', '#807972']].map((f) => f && f.map(hex)),
  whitewash: ['#f7f5ee', '#f2f0e8', '#faf7f0', '#f0eee6', '#f5f2e9', '#eeece4'].map(hex), // the Lê Lợi ward (issue #5)
  modernWall: ['#e8e3d8', '#e0dcd4', '#ebe4d3', '#dae0e4'].map(hex),
  imperialRoof: hex('#e6a824'),
  imperialRoof2: hex('#cf911e'),
  jadeRoof: hex('#34946e'),
  lacquer: hex('#aa3325'),
  stone: hex('#c3b8a2'),
  brick: hex('#666159'), // the Citadel's aged brick and stone
  brickLight: hex('#827b72'),
  moss: hex('#767e52'),
  templeWall: hex('#e6c064'),
  templeRoof: hex('#a24e38'),
  church: hex('#c2bcb0'),
  slate: hex('#635e64'),
  glass: hex('#aac0d0'),
  steel: hex('#e9eced'),
  steelDark: hex('#bec5c9'),
  pier: hex('#bcb09a'),
  deck: hex('#6f6a68'),
  marketWall: hex('#f5e0a8'),
  marketRoof: hex('#b8563e'),
};

// Lighting / atmosphere presets. SUN_DIR points from the scene toward the light.
// hemiI is the hemisphere fill on its own (phones); where the sky is an environment light (src/env/ibl.js) the fill
// drops to hemiEnv and the sky adds envI, so shade is modelled by the sky rather than lifted flat.
export const MOODS = {
  // Morning: crisp humid Huế dawn light from the east, luminous jade Perfume River, drifting morning mist.
  day: {
    skyTop: '#8da9cb', skyHorizon: '#f4ece0', skyBelow: '#cec8be', sunGlow: '#ffefd6', fog: '#ede8dd', fogDensity: 0.000042,
    sunColor: '#fff1d8', sunI: 2.95, hemiSky: '#d8e6f8', hemiGround: '#b29e84', hemiI: 1.38, shadow: 0.74,
    waterDeep: '#145a5c', waterShallow: '#48b09c', glow: 0, rain: 0, hemiEnv: 0.42, envI: 0.78, exposure: 1.03, sunDisk: 1,
  },
  // Golden hour, the opening mood: sunlit architectural maquette — warm low sun, crisp cool-tinted shadows, emerald-teal river.
  afternoon: {
    skyTop: '#8095ca', skyHorizon: '#f2d3b2', skyBelow: '#d6bea8', sunGlow: '#ffc982', fog: '#eadccf', fogDensity: 0.000082,
    sunColor: '#ffd6a2', sunI: 3.15, hemiSky: '#ced0ee', hemiGround: '#8e7c6a', hemiI: 1.36, shadow: 0.86,
    waterDeep: '#184e57', waterShallow: '#3f968e', glow: 0, rain: 0, hemiEnv: 0.40, envI: 0.86, exposure: 1.06, sunDisk: 1,
  },
  // Lights on (Lên đèn): imperial Tím Huế twilight — deep indigo-violet river and plum-rose horizon glow.
  night: {
    skyTop: '#141536', skyHorizon: '#7c548c', skyBelow: '#282144', sunGlow: '#dc8094', fog: '#48386a', fogDensity: 0.00011,
    sunColor: '#abaee8', sunI: 0.78, hemiSky: '#7d82c6', hemiGround: '#433554', hemiI: 1.32, shadow: 0.52,
    waterDeep: '#131942', waterShallow: '#313672', glow: 1, rain: 0, hemiEnv: 0.92, envI: 0.58, exposure: 1.06, sunDisk: 0.25,
  },
  // Mưa rào: the light goes slate-violet, the far bank sinks into the rain
  rain: {
    skyTop: '#7f8799', skyHorizon: '#b3b8c4', skyBelow: '#959cab', sunGlow: '#b9bcc6', fog: '#8e95a5', fogDensity: 0.00046,
    sunColor: '#b6c2d9', sunI: 0.8, hemiSky: '#8a94ad', hemiGround: '#4c5057', hemiI: 1.36, shadow: 0.22,
    waterDeep: '#3f5560', waterShallow: '#6f8590', glow: 0.8, rain: 1, hemiEnv: 0.55, envI: 0.75, exposure: 1.0, sunDisk: 0,
  },
  nightRain: {
    skyTop: '#171836', skyHorizon: '#483f6c', skyBelow: '#282645', sunGlow: '#5c5080', fog: '#3a345e', fogDensity: 0.00038,
    sunColor: '#8f9ad0', sunI: 0.5, hemiSky: '#747eb8', hemiGround: '#403654', hemiI: 1.34, shadow: 0.2,
    waterDeep: '#161b41', waterShallow: '#2e3467', glow: 1, rain: 1, hemiEnv: 0.95, envI: 0.6, exposure: 1.05, sunDisk: 0,
  },
};
export const SUN_DIRS = { day: [0.74, 0.6, 0.3], afternoon: [-0.667, 0.375, 0.64], night: [-0.667, 0.375, 0.64] };
