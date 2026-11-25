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
  land: '#ccc09d',
  bank: '#8d8574',
  base: '#5e554c',
  green: { park: '#9cb070', wood: '#829e5e', grass: '#acb97f', farm: '#bcc086', cemetery: '#b8b498', pitch: '#94b26f', sacred: '#c9bc93', paved: '#b9b4aa' },
  // carriageways in the asphalt grey of the cầu Trường Tiền deck (PAL.deck), minor streets a shade lighter; footways
  // stay pale paving (issue #15)
  road: ['#76716e', '#787370', '#7b7673', '#807b77', '#8f8a84', '#e5dbc4'],
  casing: '#ede4d0',
  // a divided road's median (issue #15): turf inside a pale grey stone kerb, low clipped shrubs on it
  median: '#8fa865',
  medianKerb: '#d2d0cb',
  shrubs: ['#5d7f45', '#53763f', '#68894b', '#4c6c3a'],
  rail: '#544c58',
  ballast: '#b9ad9a',
  // weathered clay rather than new tile: old roofs in Huế have had a century of rain
  roofs: ['#9e4a36', '#8c4232', '#a65c43', '#93503c', '#84453a', '#9a5540', '#8a4b3a', '#a05a44', '#96503c', '#7a4a3c', '#6f5a50', '#8a8378', '#77604f', '#7f8a8c', '#863f35'].map(hex),
  walls: ['#ead9b4', '#efe2c4', '#e3cc98', '#ecd9ae', '#dfd9c4', '#e6cdb8', '#e4d0a2', '#f0e4c8', '#e2c98c', '#d3d8c4', '#cfd8dc', '#e3c7b4', '#d6c092', '#c9cfba', '#dcbc92', '#e0c27e', '#d9b874'].map(hex),
  concrete: ['#dad3c5', '#e1dbd0', '#d4cdbf', '#ddd6c8'].map(hex),
  // the three building families (see scripts/build-data.mjs §4b)
  indochine: ['#e6c676', '#ddb863', '#ecd391', '#e2c06c', '#efdcab', '#dfb65e', '#e8caa0'].map(hex), // lime-wash ochres
  indochineRoof: ['#a9523c', '#a04c38', '#ae5a42', '#994834'].map(hex), // Marseille tile
  tradWall: ['#6a4737', '#5c3e31', '#74503c', '#7d4335', '#654a3c'].map(hex), // jackfruit-wood panels
  tradRoof: ['#6d5a4d', '#77604f', '#62564c', '#7a6654', '#5f5f52'].map(hex), // old liệt tiles, weathered
  thatch: ['#b9a56c', '#ad9860', '#c2ae78', '#a38f5c'].map(hex), // rice-straw roofs
  thatchWall: ['#b9a07a', '#a98f6c', '#c4ab86', '#8f755a'].map(hex), // earth and bamboo walls
  pastel: ['#eef0ea', '#e4ebe6', '#dfe9ee', '#f1e9d8', '#e9dfd9', '#e6edd9', '#f3efe6', '#d9e4e6', '#efe0c9', '#e7e7e7'].map(hex),
  metalRoof: ['#5c7f9c', '#4f6f8c', '#8c3f3a', '#6c8f86', '#9aa3a8'].map(hex), // painted sheet roofs
  // roof families read from the satellite scene (scripts/fetch-roofs.py; index = family: 1 red tile, 2 blue sheet,
  // 3 pale concrete or light sheet, 4 grey concrete or weathered tile)
  roofFamily: [null,
    ['#a14d38', '#93463a', '#a8583f', '#8c4434', '#9b5240', '#b05f44'],
    ['#5c7f9c', '#4f6f8c', '#6a8aa3', '#58788f'],
    ['#dcd8cf', '#e3e0d8', '#d4d0c6', '#e8e4da'],
    ['#9a958c', '#8a867f', '#a5a097', '#7f7b74', '#77706a']].map((f) => f && f.map(hex)),
  whitewash: ['#f3f1ea', '#eeece4', '#f6f3ec', '#ebe9e2', '#f1eee5', '#e9e7e0'].map(hex), // the Lê Lợi ward (issue #5)
  modernWall: ['#e2ddd1', '#d9d5cd', '#e5decb', '#d3d8dc'].map(hex),
  imperialRoof: hex('#dca024'),
  imperialRoof2: hex('#c68a1e'),
  jadeRoof: hex('#378a68'),
  lacquer: hex('#a13124'),
  stone: hex('#b9ae99'),
  brick: hex('#625e57'), // the Citadel's aged brick and stone: grey with the warmth gone out of it
  brickLight: hex('#7a746b'),
  moss: hex('#72764f'),
  templeWall: hex('#deb85e'),
  templeRoof: hex('#8f4634'),
  church: hex('#b9b3a8'),
  slate: hex('#5f5a60'),
  glass: hex('#a9bccb'),
  steel: hex('#e4e7e8'),
  steelDark: hex('#b9c0c4'),
  pier: hex('#b3a792'),
  deck: hex('#6f6a68'),
  marketWall: hex('#efd9a0'),
  marketRoof: hex('#a34e3a'),
};

// Lighting / atmosphere presets. SUN_DIR points from the scene toward the light.
// hemiI is the hemisphere fill on its own (phones); where the sky is an environment light (src/env/ibl.js) the fill
// drops to hemiEnv and the sky adds envI, so shade is modelled by the sky rather than lifted flat.
export const MOODS = {
  // Morning: soft humid Huế dawn light from the east, emerald-jade Perfume River, warm mist on the hills.
  day: {
    skyTop: '#9cb3cb', skyHorizon: '#f1e8d9', skyBelow: '#c8c3ba', sunGlow: '#ffebd0', fog: '#eae3d6', fogDensity: 0.000048,
    sunColor: '#ffeed2', sunI: 2.7, hemiSky: '#dce6f4', hemiGround: '#b6a389', hemiI: 1.48, shadow: 0.64,
    waterDeep: '#195f58', waterShallow: '#549b87', glow: 0, rain: 0, hemiEnv: 0.5, envI: 0.85, exposure: 1.02, sunDisk: 1,
  },
  // Golden hour, the opening mood: a low amber sun up-river and a rose-violet haze (tím Huế) in the shade and the
  // distance; the Hương carries the light through the spans of Trường Tiền.
  afternoon: {
    skyTop: '#8a9aca', skyHorizon: '#eccbac', skyBelow: '#cfb6a8', sunGlow: '#ffc47c', fog: '#e6d6da', fogDensity: 0.00011,
    sunColor: '#ffd29d', sunI: 2.85, hemiSky: '#d4c8ea', hemiGround: '#968370', hemiI: 1.5, shadow: 0.78,
    waterDeep: '#22585c', waterShallow: '#47827c', glow: 0, rain: 0, hemiEnv: 0.48, envI: 0.98, exposure: 1.06, sunDisk: 1,
  },
  // Lights on (Lên đèn): imperial Tím Huế twilight — deep indigo-violet river and plum-rose horizon glow.
  night: {
    skyTop: '#141536', skyHorizon: '#7c548c', skyBelow: '#282144', sunGlow: '#dc8094', fog: '#48386a', fogDensity: 0.000115,
    sunColor: '#abaee8', sunI: 0.78, hemiSky: '#7d82c6', hemiGround: '#433554', hemiI: 1.32, shadow: 0.5,
    waterDeep: '#141a43', waterShallow: '#333772', glow: 1, rain: 0, hemiEnv: 0.95, envI: 0.6, exposure: 1.06, sunDisk: 0.25,
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
