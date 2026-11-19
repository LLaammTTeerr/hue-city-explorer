import { hex } from './geo/buf.js';

export const LAND_Y = 3.2; // bank height above the river surface (river is y = 0)
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
  land: '#c9bb93',
  bank: '#9a917d',
  green: { park: '#a4b678', wood: '#8ba566', grass: '#b3bf86', farm: '#c3c58c', cemetery: '#bcb89c', pitch: '#9bb776', sacred: '#cdbf96' },
  road: ['#dcd4c6', '#ddd5c7', '#ded6c8', '#dfd7c9', '#ddd4c2', '#e9dfc9'],
  casing: '#f0e8d6',
  rail: '#544c58',
  ballast: '#b9ad9a',
  roofs: ['#a8563b', '#b0603f', '#9c4e39', '#b86a48', '#8f4a3a', '#a65a44', '#9a5540', '#b2674a', '#a8563b', '#7f8f9c', '#8d9890', '#6f5a50', '#a39a8e', '#8a3f33'].map(hex),
  walls: ['#efe3c8', '#f3e9d2', '#e9d7b0', '#f0e0c0', '#e3e6d6', '#f0d9cb', '#ecdcb8', '#f5ecd9', '#e8d9a8', '#d9e2d0', '#d6e0e6', '#ecd2c4', '#dcc9a0', '#cfd6c4', '#e6c9a6'].map(hex),
  concrete: ['#ddd6c8', '#e4ded2', '#d6cfc1', '#e0d9cb'].map(hex),
  modernWall: ['#e6e1d6', '#dcd9d2', '#e9e2d0', '#d5dbe0'].map(hex),
  imperialRoof: hex('#e3a322'),
  imperialRoof2: hex('#d18f1c'),
  jadeRoof: hex('#3c8a68'),
  lacquer: hex('#9d3024'),
  stone: hex('#b9ae99'),
  brick: hex('#63564c'),
  brickLight: hex('#7a6a5b'),
  moss: hex('#72764f'),
  templeWall: hex('#e8c66e'),
  templeRoof: hex('#8f4634'),
  church: hex('#b9b3a8'),
  slate: hex('#5f5a60'),
  glass: hex('#a9bccb'),
  steel: hex('#e4e7e8'),
  steelDark: hex('#b9c0c4'),
  pier: hex('#b3a792'),
  deck: hex('#6f6a68'),
  marketWall: hex('#efd9a0'),
  marketRoof: hex('#b24f36'),
};

// Lighting / atmosphere presets. `sun` points from the scene toward the light.
// The afternoon sun sits up-river (south-west), so the Hương carries its reflection through the spans of Trường Tiền.
export const MOODS = {
  day: {
    skyTop: '#5d8fc2', skyHorizon: '#f5d5a6', sunGlow: '#ffc67a', fog: '#e8cfae', fogDensity: 0.000105,
    sunColor: '#ffd3a0', sunI: 2.6, hemiSky: '#d6e2f5', hemiGround: '#b49a78', hemiI: 1.6, shadow: 0.7,
    waterDeep: '#24666a', waterShallow: '#5c968a', glow: 0, rain: 0, exposure: 1.0, sunDisk: 1,
  },
  night: {
    skyTop: '#1b2150', skyHorizon: '#8a629c', sunGlow: '#e08a8c', fog: '#4a3f70', fogDensity: 0.00013,
    sunColor: '#a9b0ea', sunI: 0.95, hemiSky: '#8088cc', hemiGround: '#4a3d5c', hemiI: 1.55, shadow: 0.5,
    waterDeep: '#161d48', waterShallow: '#343c78', glow: 1, rain: 0, exposure: 1.05, sunDisk: 0.25,
  },
  rain: {
    skyTop: '#858fa2', skyHorizon: '#b9bec6', sunGlow: '#c2c4c8', fog: '#b2b8c1', fogDensity: 0.00046,
    sunColor: '#cdd5e2', sunI: 0.75, hemiSky: '#c3ccda', hemiGround: '#7d7a73', hemiI: 1.3, shadow: 0.22,
    waterDeep: '#465c64', waterShallow: '#7b9094', glow: 0.8, rain: 1, exposure: 0.98, sunDisk: 0,
  },
  nightRain: {
    skyTop: '#1c1e3c', skyHorizon: '#4a4670', sunGlow: '#55507a', fog: '#3a3860', fogDensity: 0.0004,
    sunColor: '#8f9ad0', sunI: 0.55, hemiSky: '#7a82bc', hemiGround: '#453d58', hemiI: 1.5, shadow: 0.2,
    waterDeep: '#181e44', waterShallow: '#30386a', glow: 1, rain: 1, exposure: 1.05, sunDisk: 0,
  },
};
export const SUN_DIR = [-0.667, 0.375, 0.64];
