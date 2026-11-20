import { hex } from './geo/buf.js';

export const LAND_Y = 4.6; // bank height above the river surface (river is y = 0)
export const POND_Y = LAND_Y - 1.3; // lakes, ponds and the moat stand just below ground level
export const WALL_H = 6.6; // Citadel wall height, from the OSM tag on the wall relation

export const isCoarse = () => matchMedia('(pointer: coarse)').matches;
export const quality = (() => {
  const side = Math.min(innerWidth, innerHeight);
  const small = side > 0 && side < 560; // a zero-sized (hidden) window says nothing about the device
  const low = isCoarse() || small;
  return {
    low,
    pixelRatio: Math.min(devicePixelRatio || 1, low ? 1.6 : 2),
    shadowSize: low ? 2048 : 4096,
    reflection: !low,
    treeShare: low ? 0.5 : 1,
    rainCount: low ? 3500 : 8000,
  };
})();

// Colours are authored in sRGB and converted to linear once.
export const PAL = {
  land: '#d2c6a2',
  bank: '#a39a86',
  base: '#5e554c',
  green: { park: '#a4b678', wood: '#8ba566', grass: '#b3bf86', farm: '#c3c58c', cemetery: '#bcb89c', pitch: '#9bb776', sacred: '#cdbf96' },
  road: ['#dcd4c6', '#ddd5c7', '#ded6c8', '#dfd7c9', '#ddd4c2', '#e9dfc9'],
  casing: '#f0e8d6',
  rail: '#544c58',
  ballast: '#b9ad9a',
  // weathered clay rather than new tile: old roofs in Huế have had a century of rain
  roofs: ['#9e4a36', '#8c4232', '#a65c43', '#93503c', '#84453a', '#9a5540', '#8a4b3a', '#a05a44', '#96503c', '#7a4a3c', '#6f5a50', '#8a8378', '#77604f', '#7f8a8c', '#863f35'].map(hex),
  walls: ['#ead9b4', '#efe2c4', '#e3cc98', '#ecd9ae', '#dfd9c4', '#e6cdb8', '#e4d0a2', '#f0e4c8', '#e2c98c', '#d3d8c4', '#cfd8dc', '#e3c7b4', '#d6c092', '#c9cfba', '#dcbc92', '#e0c27e', '#d9b874'].map(hex),
  concrete: ['#ddd6c8', '#e4ded2', '#d6cfc1', '#e0d9cb'].map(hex),
  // the three building families (see scripts/build-data.mjs §4b)
  indochine: ['#e6c676', '#ddb863', '#ecd391', '#e2c06c', '#efdcab', '#dfb65e', '#e8caa0'].map(hex), // lime-wash ochres
  indochineRoof: ['#a9523c', '#a04c38', '#ae5a42', '#994834'].map(hex), // Marseille tile
  tradWall: ['#6a4737', '#5c3e31', '#74503c', '#7d4335', '#654a3c'].map(hex), // jackfruit-wood panels
  tradRoof: ['#6d5a4d', '#77604f', '#62564c', '#7a6654', '#5f5f52'].map(hex), // old liệt tiles, weathered
  thatch: ['#b9a56c', '#ad9860', '#c2ae78', '#a38f5c'].map(hex), // rice-straw roofs
  thatchWall: ['#b9a07a', '#a98f6c', '#c4ab86', '#8f755a'].map(hex), // earth and bamboo walls
  pastel: ['#eef0ea', '#e4ebe6', '#dfe9ee', '#f1e9d8', '#e9dfd9', '#e6edd9', '#f3efe6', '#d9e4e6', '#efe0c9', '#e7e7e7'].map(hex),
  metalRoof: ['#5c7f9c', '#4f6f8c', '#8c3f3a', '#6c8f86', '#9aa3a8'].map(hex), // painted sheet roofs
  modernWall: ['#e6e1d6', '#dcd9d2', '#e9e2d0', '#d5dbe0'].map(hex),
  imperialRoof: hex('#d69a26'),
  imperialRoof2: hex('#c2861f'),
  jadeRoof: hex('#3c8a68'),
  lacquer: hex('#9d3024'),
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
export const MOODS = {
  // Morning: clear light from the east, so the faces that look down-river toward the opening view are lit.
  day: {
    skyTop: '#a9bbcf', skyHorizon: '#ece9e1', skyBelow: '#c3c6c6', sunGlow: '#fff0d2', fog: '#e6e4dc', fogDensity: 0.00004,
    sunColor: '#fff0da', sunI: 2.75, hemiSky: '#dde7f5', hemiGround: '#b8a88f', hemiI: 1.5, shadow: 0.62,
    waterDeep: '#1e6a60', waterShallow: '#62a78f', glow: 0, rain: 0, exposure: 1.02, sunDisk: 1,
  },
  // Golden hour, the opening mood: a low amber sun up-river and a rose-violet haze (tím Huế) in the shade and the
  // distance; the Hương carries the light through the spans of Trường Tiền.
  afternoon: {
    skyTop: '#8a9aca', skyHorizon: '#eccbac', skyBelow: '#cfb6a8', sunGlow: '#ffc47c', fog: '#e6d6da', fogDensity: 0.00012,
    sunColor: '#ffd29d', sunI: 2.65, hemiSky: '#d8c7e8', hemiGround: '#9a8672', hemiI: 1.52, shadow: 0.72,
    waterDeep: '#2e5b5e', waterShallow: '#4e7d78', glow: 0, rain: 0, exposure: 1.04, sunDisk: 1,
  },
  night: {
    skyTop: '#161a3e', skyHorizon: '#74598f', skyBelow: '#2b2749', sunGlow: '#e08a8c', fog: '#4a3f70', fogDensity: 0.00011,
    sunColor: '#a9b0ea', sunI: 0.8, hemiSky: '#7a84c8', hemiGround: '#453a58', hemiI: 1.32, shadow: 0.5,
    waterDeep: '#161d48', waterShallow: '#343c78', glow: 1, rain: 0, exposure: 1.05, sunDisk: 0.25,
  },
  // Mưa rào: the light goes slate-violet, the far bank sinks into the rain
  rain: {
    skyTop: '#7f8799', skyHorizon: '#b3b8c4', skyBelow: '#959cab', sunGlow: '#b9bcc6', fog: '#8e95a5', fogDensity: 0.00046,
    sunColor: '#b6c2d9', sunI: 0.8, hemiSky: '#8a94ad', hemiGround: '#4c5057', hemiI: 1.36, shadow: 0.22,
    waterDeep: '#3f5560', waterShallow: '#6f8590', glow: 0.8, rain: 1, exposure: 1.0, sunDisk: 0,
  },
  nightRain: {
    skyTop: '#1a1c39', skyHorizon: '#46426b', skyBelow: '#2a2a48', sunGlow: '#55507a', fog: '#3a3860', fogDensity: 0.00038,
    sunColor: '#8f9ad0', sunI: 0.5, hemiSky: '#7480ba', hemiGround: '#423a56', hemiI: 1.34, shadow: 0.2,
    waterDeep: '#181e44', waterShallow: '#30386a', glow: 1, rain: 1, exposure: 1.05, sunDisk: 0,
  },
};
export const SUN_DIRS = { day: [0.74, 0.6, 0.3], afternoon: [-0.667, 0.375, 0.64], night: [-0.667, 0.375, 0.64] };
