import * as THREE from 'three';
import { hex, shade, chunked, rand, pick } from './buf.ts';
import { cityMaterial, enc, foliageDepthMaterial } from './materials.ts';
import { rise } from './terrain.ts';
import { LAND_Y, quality } from '../config.ts';
import { lodAdd } from './lod.ts';
import { inCitadel, inHills } from './districts.ts';
import { SOLID_UV } from './foliage-atlas.ts';

// Trees are built from leaf-cluster cards gathered into clumps on forked limbs, lit with rounded "puffball" normals
// so each crown shades as one soft mass, cut out by an alpha texture.
// Seven kinds, after the trees in Huế: spreading, upright, flamboyant, willow, pine, palm, banyan.
// Local units: ground at y ≈ −1.7, crown radius ≈ 1.

const LCG_MULT = 16807;
const LCG_MOD = 2147483647;
const DECIMETRES_PER_METRE = 10;
const TREE_RECORD_STRIDE = 4;
const WATER_RASTER_STEP_M = 6;
const WATER_SEARCH_RADII_M = [10, 18, 26] as const;
const FORECOURT_DEFAULT_RADIUS_M = 46;
const FORECOURT_IDS = ['ngomon', 'thaihoa', 'kydai', 'phuvanlau', 'nghenhluong'];
const TREE_LOD_DIST_M = 3600;
const TREE_FAR_LOD_DIST_M = 850;
const TREE_TYPES = ['spreading', 'upright', 'flamboyant', 'willow', 'pine', 'palm', 'banyan'] as const;

const PART = { WOOD: 0, CORE: 1, LEAF: 2 } as const;
const BARK_TINT = [0.36, 0.27, 0.2];
const WHITEWASH_TINT = [1.45, 1.43, 1.36];
const FLAME_LEAF = [0.17, 0.33, 0.1];
const FLAME_FLOWER = [0.95, 0.13, 0.06];
const FLAME_FLOWER2 = [0.95, 0.27, 0.05];

const PALETTE = {
  greens: ['#4d7545', '#5d854e', '#3f6743', '#6f8e54', '#537c49', '#64844a', '#476c44'].map(hex),
  dark: ['#355d43', '#3b6346', '#30553e', '#41674a'].map(hex),
  palm: ['#557745', '#4c6f40', '#62804a'].map(hex),
  pine: ['#2e5342', '#345a47', '#3d6145', '#2a4d3d', '#45643f'].map(hex),
  willow: ['#7e9c54', '#72924c', '#8aa25e', '#6d8c4a'].map(hex),
  flameBase: ['#bdb8a8', '#c4bba4', '#b4b2a4'].map(hex),
  lilac: ['#8a74a8', '#9984b6', '#7d689b'].map(hex),
  mai: ['#e8bc42', '#dda936'].map(hex),
};

function makeRng(initialSeed: number) {
  let state = initialSeed;
  return () => { state = (state * LCG_MULT) % LCG_MOD; return state / LCG_MOD; };
}

class TreeSoup {
  pos: number[] = [];
  nrm: number[] = [];
  uv: number[] = [];
  col: number[] = [];
  kind: number[] = [];

  tri(verts: number[][], norms: number[][], uvs: readonly (readonly number[])[], lum: number[], tint = [1, 1, 1], part: number = PART.LEAF) {
    for (let k = 0; k < 3; k++) {
      this.pos.push(verts[k][0], verts[k][1], verts[k][2]);
      const len = Math.hypot(norms[k][0], norms[k][1], norms[k][2]) || 1;
      this.nrm.push(norms[k][0] / len, norms[k][1] / len, norms[k][2] / len);
      this.uv.push(uvs[k][0], uvs[k][1]);
      // colours are sqrt-encoded (the city shader squares them)
      this.col.push(Math.sqrt(lum[k] * tint[0]), Math.sqrt(lum[k] * tint[1]), Math.sqrt(lum[k] * tint[2]));
      this.kind.push(part);
    }
  }

  quad(v0: number[], v1: number[], v2: number[], v3: number[], norms: number[][], uvs: readonly (readonly number[])[], lum: number[], tint?: number[], part?: number) {
    this.tri([v0, v1, v2], [norms[0], norms[1], norms[2]], [uvs[0], uvs[1], uvs[2]], [lum[0], lum[1], lum[2]], tint, part);
    this.tri([v0, v2, v3], [norms[0], norms[2], norms[3]], [uvs[0], uvs[2], uvs[3]], [lum[0], lum[2], lum[3]], tint, part);
  }

  geometry() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    geo.setAttribute('aKind', new THREE.Float32BufferAttribute(this.kind, 1));
    geo.setAttribute('aBase', new THREE.Float32BufferAttribute(new Float32Array(this.pos.length / 3), 1));
    geo.computeBoundingSphere();
    return geo;
  }
}

const cross3 = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm3 = (v: number[]) => { const len = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / len, v[1] / len, v[2] / len]; };
const add3 = (a: number[], b: number[], scale = 1) => [a[0] + b[0] * scale, a[1] + b[1] * scale, a[2] + b[2] * scale];
const sub3 = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const lerp3 = (a: number[], b: number[], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const smooth01 = (val: number) => { const c = Math.max(0, Math.min(1, val)); return c * c * (3 - 2 * c); };

function addLimb(soup: TreeSoup, start: number[], end: number[], r0: number, r1: number, sides: number, tint = BARK_TINT, lum0 = 0.5, lum1 = 0.62) {
  const axis = norm3(sub3(end, start));
  let sideU = cross3(axis, [0, 0, 1]);
  if (Math.hypot(sideU[0], sideU[1], sideU[2]) < 0.2) sideU = cross3(axis, [1, 0, 0]);
  sideU = norm3(sideU);
  const sideV = cross3(axis, sideU);
  const ringPt = (center: number[], radius: number, ang: number) => add3(add3(center, sideU, Math.cos(ang) * radius), sideV, Math.sin(ang) * radius);
  for (let i = 0; i < sides; i++) {
    const a0 = (i / sides) * Math.PI * 2;
    const a1 = ((i + 1) / sides) * Math.PI * 2;
    const n0 = add3(sideU.map((val) => val * Math.cos(a0)), sideV, Math.sin(a0));
    const n1 = add3(sideU.map((val) => val * Math.cos(a1)), sideV, Math.sin(a1));
    soup.quad(ringPt(start, r0, a0), ringPt(start, r0, a1), ringPt(end, r1, a1), ringPt(end, r1, a0), [n0, n1, n1, n0], [SOLID_UV, SOLID_UV, SOLID_UV, SOLID_UV], [lum0, lum0, lum1, lum1], tint, PART.WOOD);
  }
}

const LOBE_ICO_LO = new THREE.IcosahedronGeometry(1, 0); // 20 tris — crisp sculpted puffball lobe (smooth-shaded via analytical puffball normals)

// Sculpted organic puffball lobe: gently deformed icosahedron with blended crown+lobe puffball normals
// so every tree canopy reads as a crisp, smooth-shaded architectural maquette mass with zero alpha shimmer.
function addMaquetteLobe(
  soup: TreeSoup,
  center: number[],
  rx: number,
  ry: number,
  rz: number,
  lightFn: (pt: number[]) => [number[], number],
  opts: { tint?: number[]; detail?: number; seed?: number; flatBottom?: number } = {},
) {
  const { tint, seed = 1, flatBottom = 0.22 } = opts;
  const arr = LOBE_ICO_LO.attributes.position.array;
  const deform = (x: number, y: number, z: number) => {
    const bump = 1 + 0.09 * Math.sin(x * 3.7 + seed * 1.9) * Math.cos(z * 3.3 - seed * 2.3) + 0.06 * Math.sin(y * 4.1 + seed * 3.1);
    const yf = y < 0 ? y * (1 - flatBottom) : y;
    return [center[0] + x * rx * bump, center[1] + yf * ry * bump, center[2] + z * rz * bump];
  };
  for (let i = 0; i < arr.length; i += 9) {
    const verts = [0, 1, 2].map((k) => deform(arr[i + k * 3], arr[i + k * 3 + 1], arr[i + k * 3 + 2]));
    const lit = verts.map(lightFn);
    soup.tri(verts, lit.map((e) => e[0]), [SOLID_UV, SOLID_UV, SOLID_UV], lit.map((e) => e[1]), tint, PART.CORE);
  }
}

// Lightweight 20-triangle solid puffball crown for distant/zoomed-out trees (> 1.7 km).
function farCrownGeometry(center: number[], radii: number[], tint = [1, 1, 1]) {
  const soup = new TreeSoup();
  const arr = LOBE_ICO_LO.attributes.position.array;
  for (let i = 0; i < arr.length; i += 9) {
    const verts = [0, 1, 2].map((k) => [
      center[0] + arr[i + k * 3] * radii[0],
      center[1] + arr[i + k * 3 + 1] * radii[1],
      center[2] + arr[i + k * 3 + 2] * radii[2],
    ]);
    const norms = [0, 1, 2].map((k) => norm3([arr[i + k * 3], arr[i + k * 3 + 1] + 0.45, arr[i + k * 3 + 2]]));
    const lums = [0, 1, 2].map((k) => 0.56 + 0.44 * smooth01((arr[i + k * 3 + 1] + 0.75) / 1.6));
    soup.tri(verts, norms, [SOLID_UV, SOLID_UV, SOLID_UV], lums, tint, PART.CORE);
  }
  return soup.geometry();
}

function crownLight(crownCenter: number[], crownRadii: number[], clumpCenter: number[], clumpWeight = 0.48) {
  return (pt: number[]): [number[], number] => {
    const fromCrown = sub3(pt, crownCenter);
    const fromClump = sub3(pt, clumpCenter);
    const crownNrm = norm3([fromCrown[0] / crownRadii[0], fromCrown[1] / crownRadii[1] + 0.45, fromCrown[2] / crownRadii[2]]);
    const clumpNrm = norm3([fromClump[0], fromClump[1] + 0.28, fromClump[2]]);
    const blendedNrm = norm3(lerp3(crownNrm, clumpNrm, clumpWeight));
    const heightGlow = smooth01((fromCrown[1] / crownRadii[1] + 0.75) / 1.6);
    const outerReach = Math.min(1, Math.hypot(fromCrown[0] / crownRadii[0], fromCrown[1] / crownRadii[1], fromCrown[2] / crownRadii[2]));
    return [blendedNrm, (0.56 + 0.48 * heightGlow) * (0.82 + 0.24 * outerReach)];
  };
}

function spreadingGeometry(low: boolean) {
  const soup = new TreeSoup();
  const rnd = makeRng(11);
  const fork = [0.03, -0.64, 0.02];
  addLimb(soup, [0, -1.78, 0], fork, 0.16, 0.09, 5);
  const origin = [0, 0.18, 0], radii = [1.05, 0.72, 1.05];
  const d = low ? 0 : 1;
  const lobes: [number[], number, number][] = [];
  for (let k = 0; k < 4; k++) {
    const ang = (k / 4) * Math.PI * 2 + 0.35 + (rnd() - 0.5) * 0.42;
    const rad = 0.50 + rnd() * 0.14;
    const center = [Math.cos(ang) * rad, -0.02 + rnd() * 0.22, Math.sin(ang) * rad];
    if (k < 3) addLimb(soup, fork, [center[0] * 0.72, center[1] - 0.22, center[2] * 0.72], 0.07, 0.035, 4);
    const r = 0.52 + rnd() * 0.1;
    lobes.push([center, r, r * 0.78]);
  }
  lobes.push([[0.04, 0.42, -0.04], 0.58, 0.46]);
  lobes.forEach(([center, rx, ry], idx) => {
    addMaquetteLobe(soup, center, rx, ry, rx, crownLight(origin, radii, center), { detail: d, seed: idx + 1 });
  });
  return soup.geometry();
}

function banyanGeometry(low: boolean) {
  const soup = new TreeSoup();
  const rnd = makeRng(71);
  const fork = [0.02, -0.82, 0.01];
  addLimb(soup, [0, -1.79, 0], [0, -1.5, 0], 0.125, 0.118, 7, WHITEWASH_TINT, 0.62, 0.66);
  addLimb(soup, [0, -1.5, 0], fork, 0.118, 0.085, 7);
  const rootCount = low ? 2 : 4;
  for (let k = 0; k < rootCount; k++) {
    const ang = (k / rootCount) * Math.PI * 2 + 0.7;
    const rad = 0.1 + rnd() * 0.04;
    addLimb(soup, [Math.cos(ang) * rad, -1.79, Math.sin(ang) * rad], [Math.cos(ang) * 0.05, -0.95, Math.sin(ang) * 0.05], 0.022, 0.014, 3);
  }
  const origin = [0, -0.02, 0], radii = [1.12, 0.52, 1.12];
  const d = low ? 0 : 1;
  const limbCount = low ? 5 : 6;
  for (let k = 0; k < limbCount; k++) {
    const ang = (k / limbCount) * Math.PI * 2 + (rnd() - 0.5) * 0.35;
    const rad = 0.58 + rnd() * 0.14;
    const center = [Math.cos(ang) * rad, -0.1 + rnd() * 0.14, Math.sin(ang) * rad];
    addLimb(soup, fork, [center[0] * 0.75, center[1] - 0.18, center[2] * 0.75], 0.05, 0.026, 3);
    const r = 0.44 + rnd() * 0.08;
    addMaquetteLobe(soup, center, r, r * 0.64, r, crownLight(origin, radii, center), { detail: d, seed: k + 10, flatBottom: 0.32 });
  }
  addMaquetteLobe(soup, [0.1, 0.22, -0.06], 0.56, 0.36, 0.56, crownLight(origin, radii, [0.1, 0.22, -0.06]), { detail: d, seed: 21, flatBottom: 0.28 });
  addMaquetteLobe(soup, [-0.22, 0.16, 0.16], 0.48, 0.32, 0.48, crownLight(origin, radii, [-0.22, 0.16, 0.16]), { detail: d, seed: 22, flatBottom: 0.28 });
  return soup.geometry();
}

function uprightGeometry(low: boolean) {
  const soup = new TreeSoup();
  const fork = [0.02, -0.58, 0];
  addLimb(soup, [0, -1.78, 0], fork, 0.12, 0.08, 5);
  const origin = [0, 0.35, 0], radii = [0.78, 1.0, 0.78];
  const d = low ? 0 : 1;
  addLimb(soup, fork, [0.18, -0.2, 0.06], 0.06, 0.035, 3);
  addLimb(soup, fork, [-0.12, 0.38, -0.05], 0.065, 0.03, 3);
  const lobes: [number[], number, number][] = [
    [[0.22, -0.06, 0.1], 0.48, 0.44],
    [[-0.2, 0.24, -0.1], 0.5, 0.48],
    [[0.08, 0.64, 0.12], 0.45, 0.46],
    [[-0.04, 0.96, -0.04], 0.34, 0.38],
  ];
  lobes.forEach(([center, rx, ry], idx) => {
    addMaquetteLobe(soup, center, rx, ry, rx, crownLight(origin, radii, center), { detail: d, seed: idx + 30 });
  });
  return soup.geometry();
}

function flamboyantGeometry(low: boolean) {
  const soup = new TreeSoup();
  const rnd = makeRng(53);
  const fork = [0, -0.85, 0];
  const flameBark = [0.4, 0.33, 0.27];
  addLimb(soup, [0, -1.78, 0], fork, 0.13, 0.1, 5, flameBark);
  const origin = [0, 0.05, 0], radii = [1.14, 0.54, 1.14];
  const d = low ? 0 : 1;
  const count = low ? 4 : 5;
  for (let k = 0; k < count; k++) {
    const ang = (k / count) * Math.PI * 2 + (rnd() - 0.5) * 0.35;
    const rad = 0.58 + rnd() * 0.14;
    const center = [Math.cos(ang) * rad, -0.1 + rnd() * 0.12, Math.sin(ang) * rad];
    if (k < 3) addLimb(soup, fork, [center[0] * 0.8, center[1] - 0.12, center[2] * 0.8], 0.075, 0.035, 3, flameBark);
    // lower green foliage pad
    addMaquetteLobe(soup, center, 0.48, 0.24, 0.48, crownLight(origin, radii, center, 0.35), { detail: d, seed: k + 40, tint: FLAME_LEAF, flatBottom: 0.38 });
    // upper crimson-orange blossom dome
    const topC = [center[0] * 0.95, center[1] + 0.16, center[2] * 0.95];
    const bloomTint = k % 2 === 0 ? FLAME_FLOWER : FLAME_FLOWER2;
    addMaquetteLobe(soup, topC, 0.44, 0.22, 0.44, crownLight(origin, radii, topC, 0.3), { detail: d, seed: k + 50, tint: bloomTint, flatBottom: 0.35 });
  }
  addMaquetteLobe(soup, [0, 0.22, 0], 0.56, 0.26, 0.56, crownLight(origin, radii, [0, 0.22, 0], 0.25), { detail: d, seed: 60, tint: FLAME_FLOWER, flatBottom: 0.32 });
  return soup.geometry();
}

function willowGeometry(low: boolean) {
  const soup = new TreeSoup();
  const rnd = makeRng(71);
  const top = [0.3, -0.26, 0];
  addLimb(soup, [0, -1.78, 0], [0.12, -1.0, 0], 0.11, 0.09, 5);
  addLimb(soup, [0.12, -1.0, 0], top, 0.09, 0.07, 5);
  const origin = [0.32, 0.08, 0], radii = [0.9, 0.9, 0.9];
  const d = low ? 0 : 1;
  addLimb(soup, top, [0.7, 0.22, 0.18], 0.05, 0.025, 3);
  addLimb(soup, top, [0.02, 0.28, -0.22], 0.05, 0.025, 3);
  // Sculpted weeping dome + elongated drooping foliage curtains around the perimeter
  addMaquetteLobe(soup, [0.32, 0.36, 0], 0.62, 0.42, 0.62, crownLight(origin, radii, [0.32, 0.36, 0]), { detail: d, seed: 70 });
  const drapes = low ? 4 : 6;
  for (let k = 0; k < drapes; k++) {
    const ang = (k / drapes) * Math.PI * 2 + (rnd() - 0.5) * 0.28;
    const rad = 0.48 + rnd() * 0.16;
    const center = [origin[0] + Math.cos(ang) * rad, -0.14 - rnd() * 0.14, origin[2] + Math.sin(ang) * rad];
    addMaquetteLobe(soup, center, 0.26, 0.58 + rnd() * 0.14, 0.26, crownLight(origin, radii, center, 0.4), { detail: 0, seed: k + 75, flatBottom: 0.05 });
  }
  return soup.geometry();
}

function pineGeometry(low: boolean) {
  const soup = new TreeSoup();
  const rnd = makeRng(47);
  const pineBark = [0.42, 0.31, 0.25];
  const mid = [0.08, -0.35, 0.02], top = [0.03, 0.95, -0.02];
  addLimb(soup, [0, -1.78, 0], mid, 0.08, 0.06, 5, pineBark);
  addLimb(soup, mid, top, 0.06, 0.03, 4, pineBark);
  const origin = [0.05, 0.55, 0], radii = [0.88, 0.68, 0.88];
  const d = low ? 0 : 1;
  const tiers = low ? [[0.24, 0.78, 0.26], [0.7, 0.56, 0.24]] : [[0.14, 0.84, 0.24], [0.44, 0.72, 0.24], [0.72, 0.56, 0.22], [0.96, 0.36, 0.2]];
  tiers.forEach(([y, rad, h], k) => {
    const ang = k * 2.3 + rnd() * 0.5;
    const ox = Math.cos(ang) * 0.14, oz = Math.sin(ang) * 0.14;
    const trunkPt = lerp3(mid, top, (y + 0.35) / 1.3);
    const center = [trunkPt[0] + ox, y, trunkPt[2] + oz];
    if (k < tiers.length - 2) addLimb(soup, [center[0] - ox, y - 0.06, center[2] - oz], [center[0] + ox * 2.0, y - 0.02, center[2] + oz * 2.0], 0.025, 0.012, 3, pineBark);
    addMaquetteLobe(soup, center, rad, h, rad, crownLight(origin, radii, center, 0.42), { detail: d, seed: k + 90, flatBottom: 0.45 });
  });
  return soup.geometry();
}

function palmGeometry(low: boolean) {
  const soup = new TreeSoup();
  const palmBark = [0.5, 0.46, 0.4];
  const mid = [0.06, -0.55, 0], top = [0.02, 0.62, 0];
  addLimb(soup, [0, -1.78, 0], mid, 0.048, 0.04, 4, palmBark);
  addLimb(soup, mid, top, 0.04, 0.032, 4, palmBark);
  const frondCount = low ? 7 : 8;
  const segs = low ? 2 : 3;
  for (let i = 0; i < frondCount; i++) {
    const ang = (i / frondCount) * Math.PI * 2 + (i % 2) * 0.2;
    const lift = 0.55 - (i % 3) * 0.18;
    const dir = [Math.cos(ang), 0, Math.sin(ang)];
    const side = [-dir[2], 0, dir[0]];
    const pointAt = (t: number) => [top[0] + dir[0] * 0.98 * t, top[1] + lift * 0.9 * t - (0.55 + lift * 0.4) * t * t, top[2] + dir[2] * 0.98 * t];
    const widthAt = (t: number) => 0.05 + 0.18 * Math.sin(Math.PI * Math.min(1, t * 1.05));
    for (let k = 0; k < segs; k++) {
      const t0 = k / segs, t1 = (k + 1) / segs;
      const p0 = pointAt(t0), p1 = pointAt(t1);
      const w0 = widthAt(t0), w1 = widthAt(t1);
      const nrm = norm3([dir[0] * 0.35, 1, dir[2] * 0.35]);
      const droop = (pt: number[], w: number, sgn: number) => [pt[0] + side[0] * w * sgn, pt[1] - w * 0.28, pt[2] + side[2] * w * sgn];
      const q0 = droop(p0, w0, -1), q1 = droop(p0, w0, 1), q2 = droop(p1, w1, 1), q3 = droop(p1, w1, -1);
      const lums = [0.68 + 0.3 * t0, 0.68 + 0.3 * t0, 0.68 + 0.3 * t1, 0.68 + 0.3 * t1];
      soup.quad(q0, q1, q2, q3, [nrm, nrm, nrm, nrm], [SOLID_UV, SOLID_UV, SOLID_UV, SOLID_UV], lums, undefined, PART.CORE);
      soup.quad(q3, q2, q1, q0, [nrm, nrm, nrm, nrm], [SOLID_UV, SOLID_UV, SOLID_UV, SOLID_UV], lums.map((v) => v * 0.8), undefined, PART.CORE);
    }
  }
  return soup.geometry();
}

function buildWaterProximityLookup(data: any) {
  const bounds = data.meta && data.meta.bounds;
  if (!bounds || !Array.isArray(data.land)) return () => null;
  const x0 = bounds[0] / DECIMETRES_PER_METRE;
  const z0 = bounds[1] / DECIMETRES_PER_METRE;
  const width = Math.ceil((bounds[2] - bounds[0]) / DECIMETRES_PER_METRE / WATER_RASTER_STEP_M);
  const height = Math.ceil((bounds[3] - bounds[1]) / DECIMETRES_PER_METRE / WATER_RASTER_STEP_M);
  let pixels: Uint8ClampedArray;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    const traceRing = (ring: number[]) => {
      for (let i = 0; i < ring.length; i += 2) {
        const px = (ring[i] / DECIMETRES_PER_METRE - x0) / WATER_RASTER_STEP_M;
        const py = (ring[i + 1] / DECIMETRES_PER_METRE - z0) / WATER_RASTER_STEP_M;
        if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.closePath();
    };
    ctx.fillStyle = '#000';
    for (const poly of data.land) { ctx.beginPath(); for (const ring of poly) traceRing(ring); ctx.fill('evenodd'); }
    ctx.fillStyle = '#fff';
    for (const poly of data.ponds || []) { ctx.beginPath(); for (const ring of poly) traceRing(ring); ctx.fill('evenodd'); }
    pixels = ctx.getImageData(0, 0, width, height).data;
  } catch {
    return () => null;
  }
  const isWet = (x: number, z: number) => {
    const gx = Math.floor((x - x0) / WATER_RASTER_STEP_M);
    const gz = Math.floor((z - z0) / WATER_RASTER_STEP_M);
    return gx >= 0 && gz >= 0 && gx < width && gz < height && pixels[(gz * width + gx) * 4] > 127;
  };
  return (x: number, z: number) => {
    let sumX = 0, sumZ = 0, hits = 0;
    for (const rad of WATER_SEARCH_RADII_M) {
      for (let k = 0; k < 8; k++) {
        const ang = (k / 8) * Math.PI * 2;
        const dx = Math.cos(ang), dz = Math.sin(ang);
        if (isWet(x + dx * rad, z + dz * rad)) { sumX += dx / rad; sumZ += dz / rad; hits++; }
      }
      if (hits) break;
    }
    return hits ? Math.atan2(sumZ, sumX) : null;
  };
}

function createFoliageMaterial() {
  // Pure solid sculpted maquette canopies: zero alpha-cutout shimmer, zero alpha-test overdraw, crisp shadows.
  const mat = cityMaterial({ foliage: true, side: THREE.FrontSide });
  mat.customProgramCacheKey = () => 'hue-foliage-maquette-1';
  return mat;
}

export function treePlanter(data: any, group: THREE.Group, off: any = null, lift: any = null) {
  const mat = createFoliageMaterial();
  const depthMat = foliageDepthMaterial({});
  const low = quality.low;
  const geos: Record<string, THREE.BufferGeometry> = {
    spreading: spreadingGeometry(low),
    upright: uprightGeometry(low),
    flamboyant: flamboyantGeometry(low),
    willow: willowGeometry(low),
    pine: pineGeometry(low),
    palm: palmGeometry(low),
    banyan: banyanGeometry(low),
  };
  const farGeos: Record<string, THREE.BufferGeometry> = {
    spreading: farCrownGeometry([0, 0.18, 0], [1.05, 0.72, 1.05]),
    upright: farCrownGeometry([0, 0.35, 0], [0.78, 0.98, 0.78]),
    flamboyant: farCrownGeometry([0, 0.05, 0], [1.12, 0.56, 1.12], [0.64, 0.24, 0.09]),
    willow: farCrownGeometry([0.32, 0.05, 0], [0.88, 0.88, 0.88]),
    pine: farCrownGeometry([0.06, 0.5, 0], [0.82, 0.62, 0.82]),
    palm: farCrownGeometry([0.02, 0.58, 0], [0.85, 0.38, 0.85]),
    banyan: farCrownGeometry([0, -0.02, 0], [1.1, 0.52, 1.1]),
  };
  const nearWater = buildWaterProximityLookup(data);
  const courts = data.courts || {};
  const forecourts = (data.places || [])
    .filter((place: any) => FORECOURT_IDS.includes(place.id))
    .map((place: any) => courts[place.id] || ((x: number, z: number) => (x - place.x / DECIMETRES_PER_METRE) ** 2 + (z - place.z / DECIMETRES_PER_METRE) ** 2 < FORECOURT_DEFAULT_RADIUS_M ** 2));

  const mat4 = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const scaleVec = new THREE.Vector3();
  const posVec = new THREE.Vector3();
  const upAxis = new THREE.Vector3(0, 1, 0);
  const colorTmp = new THREE.Color();
  let meshes: THREE.InstancedMesh[] = [];

  function plantRange(records: number[], baseIdx: number, start: number, end: number, layer: number) {
    const span = end - start;
    const count = Math.floor(span * quality.treeShare);
    if (count <= 0) return;
    const stride = span / count;
    const items: any[] = [];
    for (let k = 0; k < count; k++) {
      const recIdx = start + Math.floor(k * stride);
      const seedIdx = baseIdx + recIdx;
      const base = recIdx * TREE_RECORD_STRIDE;
      const x = records[base] / DECIMETRES_PER_METRE;
      const z = records[base + 1] / DECIMETRES_PER_METRE;
      const scale = records[base + 2] / DECIMETRES_PER_METRE;
      const kind = records[base + 3];
      const crownRadius = (kind === 5 ? 1.5 : 1) * 3.3 * scale * (0.75 + rand(seedIdx, 41) * 0.5);
      if (off && off(x, z, 2.2 * scale, crownRadius)) continue;
      if (forecourts.some((inCourt: any) => inCourt(x, z))) continue;

      const roll = rand(seedIdx, 61);
      let species: string = kind === 5 ? 'banyan' : kind === 4 ? 'spreading' : kind === 3 ? 'pine' : kind === 2 ? 'flamboyant' : roll < 0.085 && scale < 1.25 ? 'palm' : roll < 0.42 ? 'upright' : 'spreading';
      let lean: number | null = null;
      if ((species === 'spreading' || species === 'upright') && kind !== 4) {
        const waterAng = rand(seedIdx, 71) < 0.5 ? nearWater(x, z) : null;
        if (waterAng !== null) { species = 'willow'; lean = waterAng; }
      }
      items.push({ i: seedIdx, x, z, sc: scale, kind, type: species, lean });
    }

    for (const chunk of chunked(items)) {
      for (const species of TREE_TYPES) {
        const groupItems = chunk.filter((item: any) => item.type === species);
        if (!groupItems.length) continue;
        const mesh = new THREE.InstancedMesh(geos[species], mat, groupItems.length);
        groupItems.forEach(({ i, x, z, sc, kind, lean }: any, instIdx: number) => {
          const baseRadius = 3.3 * sc * (0.75 + rand(i, 41) * 0.5);
          const heightScale = species === 'palm' ? 1.45 : species === 'pine' ? 1.42 : species === 'flamboyant' ? 0.82 : species === 'willow' ? 1.05 : species === 'banyan' ? 0.85 : 1;
          const height = baseRadius * (0.95 + rand(i, 42) * 0.45) * heightScale;
          const crownR = species === 'palm' ? baseRadius * 0.85 : species === 'flamboyant' ? baseRadius * 1.12 : species === 'banyan' ? baseRadius * 1.5 : baseRadius;
          const yaw = lean !== null ? -lean + (rand(i, 72) - 0.5) * 0.7 : rand(i, 43) * 6.28;
          quat.setFromAxisAngle(upAxis, yaw);
          posVec.set(x, LAND_Y + rise(x, z) + (lift ? lift(x, z) : 0) + height * 1.7, z);
          const aspect = 0.88 + rand(i, 73) * 0.24;
          scaleVec.set(crownR * aspect, height, crownR / aspect);
          mesh.setMatrixAt(instIdx, mat4.compose(posVec, quat, scaleVec));

          let col = species === 'pine' ? pick(PALETTE.pine, i, 49)
            : species === 'palm' ? pick(PALETTE.palm, i, 48)
              : species === 'flamboyant' ? pick(PALETTE.flameBase, i, 44)
                : species === 'willow' ? pick(PALETTE.willow, i, 50)
                  : kind === 1 || kind === 4 ? pick(PALETTE.dark, i, 45)
                    : pick(PALETTE.greens, i, 46);
          if ((species === 'spreading' || species === 'upright') && kind !== 4) {
            const blossomRoll = rand(i, 67);
            if (blossomRoll < 0.035 && !inHills(x, z)) col = pick(PALETTE.lilac, i, 68);
            else if (blossomRoll < 0.065 && inCitadel(x, z)) col = pick(PALETTE.mai, i, 69);
          }
          mesh.setColorAt(instIdx, enc(shade(col, 0.86 + rand(i, 47) * 0.28), colorTmp));
        });
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.customDepthMaterial = depthMat;
        mesh.castShadow = !quality.low;
        mesh.receiveShadow = true;
        mesh.computeBoundingSphere();
        mesh.layers.set(layer);
        mesh.name = 'trees';
        mesh.userData.species = species;
        lodAdd(mesh, TREE_LOD_DIST_M, { farGeo: farGeos[species], farDist: TREE_FAR_LOD_DIST_M });
        group.add(mesh);
        meshes.push(mesh);
      }
    }
  }

  return (records: number[], nearCount?: number, baseIdx = 0) => {
    const list = records || [];
    const resolvedNear = nearCount ?? list.length / TREE_RECORD_STRIDE;
    meshes = [];
    plantRange(list, baseIdx, 0, resolvedNear, 0);
    plantRange(list, baseIdx, resolvedNear, list.length / TREE_RECORD_STRIDE, 1);
    return meshes;
  };
}
