import * as THREE from 'three';
import { hex, shade, chunked, rand, pick } from './buf.ts';
import { cityMaterial, enc, foliageDepthMaterial, patch } from './materials.ts';
import { rise } from './terrain.ts';
import { LAND_Y, quality } from '../config.ts';
import { lodAdd } from './lod.ts';
import { inCitadel, inHills } from './districts.ts';
import { createLeafAtlas, LEAF_UV, SOLID_UV } from './foliage-atlas.ts';

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
const TREE_TYPES = ['spreading', 'upright', 'flamboyant', 'willow', 'pine', 'palm', 'banyan'] as const;

const PART = { WOOD: 0, CORE: 1, LEAF: 2 } as const;
const BARK_TINT = [0.36, 0.27, 0.2];
const WHITEWASH_TINT = [1.45, 1.43, 1.36];
const FLAME_LEAF = [0.17, 0.33, 0.1];
const FLAME_FLOWER = [0.95, 0.13, 0.06];
const FLAME_FLOWER2 = [0.95, 0.27, 0.05];

const PALETTE = {
  greens: ['#4a6845', '#587450', '#3f5a3f', '#687a52', '#516d48', '#627849', '#466443'].map(hex),
  dark: ['#385a42', '#3d5f44', '#33523c', '#426247'].map(hex),
  palm: ['#526f42', '#4a683d', '#5e7846'].map(hex),
  pine: ['#2f5040', '#345644', '#3c5c42', '#2b4a3a', '#445f3c'].map(hex),
  willow: ['#7a9450', '#6f8b4a', '#86995a', '#6a8648'].map(hex),
  flameBase: ['#bdb8a8', '#c4bba4', '#b4b2a4'].map(hex),
  lilac: ['#8f6db8', '#a17ec8', '#7d5ca8'].map(hex),
  mai: ['#e3b53c', '#d8a632'].map(hex),
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

function addLeafCard(soup: TreeSoup, center: number[], normal: number[], roll: number, halfU: number, halfV: number, uvRect: readonly number[], lightFn: (pt: number[]) => [number[], number], tint?: number[], flip = false, upVec: number[] | null = null) {
  let tangent: number[];
  if (upVec) {
    tangent = norm3(cross3(upVec, normal));
  } else {
    tangent = cross3(normal, [0, 1, 0]);
    if (Math.hypot(tangent[0], tangent[1], tangent[2]) < 0.1) tangent = [1, 0, 0];
    tangent = norm3(tangent);
  }
  const bitangent = upVec ? norm3(cross3(normal, tangent)) : cross3(normal, tangent);
  const cosR = Math.cos(roll), sinR = Math.sin(roll);
  const axisU = [tangent[0] * cosR + bitangent[0] * sinR, tangent[1] * cosR + bitangent[1] * sinR, tangent[2] * cosR + bitangent[2] * sinR];
  const axisV = [bitangent[0] * cosR - tangent[0] * sinR, bitangent[1] * cosR - tangent[1] * sinR, bitangent[2] * cosR - tangent[2] * sinR];
  const corner = (su: number, sv: number) => add3(add3(center, axisU, su * halfU), axisV, sv * halfV);
  const pts = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)];
  const [u0, v0, u1, v1] = uvRect;
  const eps = 0.004;
  const ua = flip ? u1 - eps : u0 + eps;
  const ub = flip ? u0 + eps : u1 - eps;
  const uvs = [[ua, v0 + eps], [ub, v0 + eps], [ub, v1 - eps], [ua, v1 - eps]];
  const lit = pts.map(lightFn);
  soup.quad(pts[0], pts[1], pts[2], pts[3], lit.map((entry) => entry[0]), uvs, lit.map((entry) => entry[1]), tint);
}

function addCrownCore(soup: TreeSoup, center: number[], sx: number, sy: number, sz: number, lum = [0.36, 0.38, 0.34]) {
  const oct = new THREE.OctahedronGeometry(1, 0);
  const arr = oct.attributes.position.array;
  for (let i = 0; i < arr.length; i += 9) {
    const verts = [0, 1, 2].map((k) => [center[0] + arr[i + k * 3] * sx, center[1] + arr[i + k * 3 + 1] * sy, center[2] + arr[i + k * 3 + 2] * sz]);
    soup.tri(verts, verts.map((pt) => [pt[0] - center[0], pt[1] - center[1] + 0.3 * sy, pt[2] - center[2]]), [SOLID_UV, SOLID_UV, SOLID_UV], lum, undefined, PART.CORE);
  }
}

function crownLight(crownCenter: number[], crownRadii: number[], clumpCenter: number[], clumpWeight = 0.45) {
  return (pt: number[]): [number[], number] => {
    const fromCrown = sub3(pt, crownCenter);
    const fromClump = sub3(pt, clumpCenter);
    const crownNrm = norm3([fromCrown[0] / crownRadii[0], fromCrown[1] / crownRadii[1] + 0.45, fromCrown[2] / crownRadii[2]]);
    const clumpNrm = norm3([fromClump[0], fromClump[1] + 0.25, fromClump[2]]);
    const blendedNrm = norm3(lerp3(crownNrm, clumpNrm, clumpWeight));
    const heightGlow = smooth01((fromCrown[1] / crownRadii[1] + 0.75) / 1.6);
    const outerReach = Math.min(1, Math.hypot(fromCrown[0] / crownRadii[0], fromCrown[1] / crownRadii[1], fromCrown[2] / crownRadii[2]));
    return [blendedNrm, (0.52 + 0.5 * heightGlow) * (0.8 + 0.3 * outerReach)];
  };
}

function addClump(soup: TreeSoup, rnd: () => number, center: number[], radius: number, cardCount: number, uvRect: readonly number[], lightFn: (pt: number[]) => [number[], number], opts: Record<string, any> = {}) {
  const { tint, squash = 1, sizeK = 1.3, capTilt = 0.35 } = opts;
  const baseYaw = rnd() * Math.PI;
  for (let j = 0; j < cardCount; j++) {
    const isCap = j === cardCount - 1 && cardCount > 1;
    let normal: number[];
    if (isCap) {
      normal = norm3([Math.cos(baseYaw) * capTilt, 1, Math.sin(baseYaw) * capTilt]);
    } else {
      const ang = baseYaw + (j / Math.max(1, cardCount - 1)) * Math.PI + (rnd() - 0.5) * 0.3;
      normal = norm3([Math.cos(ang), (rnd() - 0.3) * 0.5, Math.sin(ang)]);
    }
    const offset = [(rnd() - 0.5) * radius * 0.35, (isCap ? 0.18 : (rnd() - 0.5) * 0.2) * radius * squash, (rnd() - 0.5) * radius * 0.35];
    const halfSize = radius * sizeK * (0.92 + rnd() * 0.2);
    const cardTint = typeof tint === 'function' ? tint(isCap, j) : tint;
    addLeafCard(soup, add3(center, offset), normal, rnd() * Math.PI * 2, halfSize, halfSize * (isCap ? 1 : squash), uvRect, lightFn, cardTint, rnd() < 0.5);
  }
}

function spreadingGeometry(low: boolean) {
  const soup = new TreeSoup();
  const rnd = makeRng(11);
  const fork = [0.03, -0.62, 0.02];
  addLimb(soup, [0, -1.78, 0], fork, 0.16, 0.085, 4);
  const origin = [0, 0.18, 0], radii = [1.05, 0.7, 1.05];
  const clumps: [number[], number][] = [];
  for (let k = 0; k < 3; k++) {
    const ang = (k / 3) * Math.PI * 2 + 0.4 + (rnd() - 0.5) * 0.5;
    const rad = 0.58 + rnd() * 0.14;
    const center = [Math.cos(ang) * rad, rnd() * 0.22, Math.sin(ang) * rad];
    addLimb(soup, fork, [center[0] * 0.72, center[1] - 0.24, center[2] * 0.72], 0.07, 0.035, 3);
    clumps.push([center, 0.52 + rnd() * 0.1]);
  }
  clumps.push([[0.05, 0.46, -0.04], 0.52]);
  addCrownCore(soup, [0, 0.12, 0], 0.5, 0.34, 0.5);
  for (const [center, rad] of clumps) addClump(soup, rnd, center, rad, low ? 2 : 3, LEAF_UV.broad, crownLight(origin, radii, center));
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
  const origin = [0, -0.02, 0], radii = [1.1, 0.5, 1.1];
  const clumps: [number[], number][] = [];
  const limbCount = low ? 5 : 6;
  for (let k = 0; k < limbCount; k++) {
    const ang = (k / limbCount) * Math.PI * 2 + (rnd() - 0.5) * 0.4;
    const rad = 0.6 + rnd() * 0.16;
    const center = [Math.cos(ang) * rad, -0.12 + rnd() * 0.16, Math.sin(ang) * rad];
    addLimb(soup, fork, [center[0] * 0.75, center[1] - 0.18, center[2] * 0.75], 0.05, 0.026, 3);
    clumps.push([center, 0.42 + rnd() * 0.08]);
  }
  clumps.push([[0.12, 0.26, -0.08], 0.46], [[-0.2, 0.2, 0.18], 0.42]);
  addCrownCore(soup, [0, -0.02, 0], 0.66, 0.28, 0.66);
  for (const [center, rad] of clumps) addClump(soup, rnd, center, rad, low ? 2 : 3, LEAF_UV.broad, crownLight(origin, radii, center), { squash: 0.85 });
  return soup.geometry();
}

function uprightGeometry(low: boolean) {
  const soup = new TreeSoup();
  const rnd = makeRng(29);
  const fork = [0.02, -0.55, 0];
  addLimb(soup, [0, -1.78, 0], fork, 0.12, 0.08, 4);
  const origin = [0, 0.35, 0], radii = [0.8, 1.0, 0.8];
  const clumps: [number[], number][] = [[[0.26, -0.05, 0.08], 0.45], [[-0.24, 0.3, -0.1], 0.46], [[0.08, 0.68, 0.14], 0.42]];
  if (!low) clumps.push([[-0.06, 1.0, -0.06], 0.32]);
  addLimb(soup, fork, [0.2, -0.2, 0.06], 0.06, 0.035, 3);
  addLimb(soup, fork, [-0.12, 0.42, -0.05], 0.065, 0.03, 3);
  addCrownCore(soup, [0, 0.32, 0], 0.32, 0.5, 0.32);
  for (const [center, rad] of clumps) addClump(soup, rnd, center, rad, low ? 2 : 3, LEAF_UV.broad, crownLight(origin, radii, center));
  return soup.geometry();
}

function flamboyantGeometry(low: boolean) {
  const soup = new TreeSoup();
  const rnd = makeRng(53);
  const fork = [0, -0.85, 0];
  const flameBark = [0.4, 0.33, 0.27];
  addLimb(soup, [0, -1.78, 0], fork, 0.13, 0.1, 4, flameBark);
  const origin = [0, 0.05, 0], radii = [1.15, 0.55, 1.15];
  const count = low ? 4 : 5;
  const clumps: number[][] = [];
  for (let k = 0; k < count; k++) {
    const ang = (k / count) * Math.PI * 2 + (rnd() - 0.5) * 0.4;
    const rad = 0.62 + rnd() * 0.15;
    const center = [Math.cos(ang) * rad, -0.08 + rnd() * 0.16, Math.sin(ang) * rad];
    if (k < 3) addLimb(soup, fork, [center[0] * 0.8, center[1] - 0.12, center[2] * 0.8], 0.075, 0.035, 3, flameBark);
    clumps.push(center);
  }
  addCrownCore(soup, [0, -0.05, 0], 0.72, 0.24, 0.72, [0.22, 0.26, 0.2]);
  const pickTint = (isCap: boolean, j: number) => (isCap || (j === 0 && rnd() < 0.6) ? (rnd() < 0.5 ? FLAME_FLOWER : FLAME_FLOWER2) : FLAME_LEAF);
  for (const center of clumps) {
    addClump(soup, rnd, center, 0.48, low ? 2 : 3, LEAF_UV.frond, crownLight(origin, radii, center, 0.3), { tint: pickTint, squash: 0.72, sizeK: 1.25, capTilt: 0.3 });
  }
  addLeafCard(soup, [0, 0.24, 0], norm3([0.1, 1, -0.05]), rnd() * 6.28, 0.62, 0.62, LEAF_UV.broad, crownLight(origin, radii, [0, 0.2, 0], 0.2), FLAME_FLOWER);
  return soup.geometry();
}

function willowGeometry(low: boolean) {
  const soup = new TreeSoup();
  const rnd = makeRng(71);
  const top = [0.32, -0.25, 0];
  addLimb(soup, [0, -1.78, 0], [0.12, -1.0, 0], 0.11, 0.09, 4);
  addLimb(soup, [0.12, -1.0, 0], top, 0.09, 0.07, 4);
  const origin = [0.32, 0.1, 0], radii = [0.9, 0.9, 0.9];
  addLimb(soup, top, [0.75, 0.25, 0.2], 0.05, 0.025, 3);
  addLimb(soup, top, [0.0, 0.32, -0.25], 0.05, 0.025, 3);
  addClump(soup, rnd, [0.34, 0.32, 0], 0.42, low ? 1 : 2, LEAF_UV.willow, crownLight(origin, radii, [0.34, 0.32, 0]), { capTilt: 0.6 });
  const curtainCount = low ? 6 : 9;
  for (let k = 0; k < curtainCount; k++) {
    const ang = (k / curtainCount) * Math.PI * 2 + (rnd() - 0.5) * 0.3;
    const rad = 0.5 + rnd() * 0.22;
    const hang = 0.62 + rnd() * 0.28;
    const yTop = 0.42 + rnd() * 0.12;
    const center = [origin[0] + Math.cos(ang) * rad, yTop - hang, origin[2] + Math.sin(ang) * rad];
    const normal = norm3([Math.cos(ang), 0.22, Math.sin(ang)]);
    const lightFn = (pt: number[]): [number[], number] => {
      const delta = sub3(pt, origin);
      const nrm = norm3([delta[0], 0.35 + (pt[1] - center[1]) * 0.3, delta[2]]);
      return [nrm, (0.5 + 0.5 * smooth01((pt[1] + 1.1) / 1.7)) * 0.95];
    };
    addLeafCard(soup, center, normal, 0, 0.36 + rnd() * 0.1, hang, LEAF_UV.willow, lightFn, [1, 1, 1], rnd() < 0.5, [0, 1, 0]);
  }
  return soup.geometry();
}

function pineGeometry(low: boolean) {
  const soup = new TreeSoup();
  const rnd = makeRng(47);
  const pineBark = [0.42, 0.31, 0.25];
  const mid = [0.09, -0.35, 0.02], top = [0.03, 0.95, -0.02];
  addLimb(soup, [0, -1.78, 0], mid, 0.08, 0.06, 4, pineBark);
  addLimb(soup, mid, top, 0.06, 0.03, 4, pineBark);
  const tiers = low ? [[0.3, 0.8], [0.72, 0.58]] : [[0.16, 0.86], [0.46, 0.78], [0.74, 0.62], [0.98, 0.4]];
  tiers.forEach(([y, rad], k) => {
    const ang = k * 2.3 + rnd() * 0.6;
    const ox = Math.cos(ang) * 0.2, oz = Math.sin(ang) * 0.2;
    const trunkPt = lerp3(mid, top, (y + 0.35) / 1.3);
    const center = [trunkPt[0] + ox, y, trunkPt[2] + oz];
    if (k < tiers.length - 2) addLimb(soup, [center[0] - ox, y - 0.06, center[2] - oz], [center[0] + ox * 2.2, y - 0.02, center[2] + oz * 2.2], 0.025, 0.012, 3, pineBark);
    const lightFn = (pt: number[]): [number[], number] => {
      const delta = sub3(pt, center);
      return [norm3([delta[0] * 0.8, 0.9, delta[2] * 0.8]), 0.5 + 0.5 * smooth01((pt[1] - center[1] + 0.12) / 0.24) * (0.75 + 0.25 * y)];
    };
    addLeafCard(soup, [center[0], center[1] + 0.03, center[2]], norm3([0.05, 1, 0.04]), rnd() * 6.28, rad, rad, LEAF_UV.pine, lightFn, [1, 1, 1]);
    for (let j = 0; j < (low ? 1 : 2); j++) {
      const crossAng = ang + (j * Math.PI) / 2;
      addLeafCard(soup, [center[0], center[1] - 0.04, center[2]], norm3([Math.cos(crossAng), 0.55, Math.sin(crossAng)]), 0, rad * 0.95, rad * 0.36, LEAF_UV.pine, lightFn, [0.9, 0.92, 0.9], false, [0, 1, 0]);
    }
  });
  return soup.geometry();
}

function palmGeometry(low: boolean) {
  const soup = new TreeSoup();
  const palmBark = [0.5, 0.46, 0.4];
  const mid = [0.06, -0.55, 0], top = [0.02, 0.62, 0];
  addLimb(soup, [0, -1.78, 0], mid, 0.045, 0.038, 3, palmBark);
  addLimb(soup, mid, top, 0.038, 0.03, 3, palmBark);
  const frondCount = low ? 7 : 8;
  const segs = low ? 2 : 3;
  const [u0, v0, u1, v1] = LEAF_UV.palm;
  for (let i = 0; i < frondCount; i++) {
    const ang = (i / frondCount) * Math.PI * 2 + (i % 2) * 0.2;
    const lift = 0.55 - (i % 3) * 0.18;
    const dir = [Math.cos(ang), 0, Math.sin(ang)];
    const side = [-dir[2], 0, dir[0]];
    const pointAt = (t: number) => [top[0] + dir[0] * 0.98 * t, top[1] + lift * 0.9 * t - (0.55 + lift * 0.4) * t * t, top[2] + dir[2] * 0.98 * t];
    const widthAt = (t: number) => 0.06 + 0.24 * Math.sin(Math.PI * Math.min(1, t * 1.05));
    for (let k = 0; k < segs; k++) {
      const t0 = k / segs, t1 = (k + 1) / segs;
      const p0 = pointAt(t0), p1 = pointAt(t1);
      const w0 = widthAt(t0), w1 = widthAt(t1);
      const nrm = norm3([dir[0] * 0.35, 1, dir[2] * 0.35]);
      const va = v0 + (v1 - v0) * t0, vb = v0 + (v1 - v0) * t1;
      const droop = (pt: number[], w: number, sgn: number) => [pt[0] + side[0] * w * sgn, pt[1] - w * 0.25, pt[2] + side[2] * w * sgn];
      soup.quad(
        droop(p0, w0, -1), droop(p0, w0, 1), droop(p1, w1, 1), droop(p1, w1, -1),
        [nrm, nrm, nrm, nrm],
        [[u0 + 0.004, va], [u1 - 0.004, va], [u1 - 0.004, vb], [u0 + 0.004, vb]],
        [0.68 + 0.3 * t0, 0.68 + 0.3 * t0, 0.68 + 0.3 * t1, 0.68 + 0.3 * t1],
      );
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

function createFoliageMaterial(tex: THREE.CanvasTexture) {
  const mat = cityMaterial({ foliage: true, map: tex, alphaTest: 0.42, side: THREE.DoubleSide });
  mat.alphaToCoverage = true;
  const baseCompile = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader: any, ...rest: any[]) => {
    (baseCompile as any)(shader, ...rest);
    shader.fragmentShader = patch(shader.fragmentShader).replace(
      '#include <normal_fragment_begin>',
      'float faceDirection = 1.0;\nvec3 normal = normalize( vNormal );\nvec3 nonPerturbedNormal = normal;',
    ).src;
    shader.fragmentShader = patch(shader.fragmentShader).replace('#include <alphatest_fragment>', `
      #ifdef USE_MAP
      {
        vec2 hueTx = vMapUv * 1024.0;
        float hueMip = 0.5 * log2( max( 1.0, max( dot( dFdx( hueTx ), dFdx( hueTx ) ), dot( dFdy( hueTx ), dFdy( hueTx ) ) ) ) );
        diffuseColor.a *= 1.0 + hueMip * 0.3;
      }
      #endif
      #include <alphatest_fragment>`).src;
  };
  mat.customProgramCacheKey = () => 'hue-foliage-cards-3';
  return mat;
}

export function treePlanter(data: any, group: THREE.Group, off: any = null, lift: any = null) {
  const tex = createLeafAtlas();
  const mat = createFoliageMaterial(tex);
  const depthMat = foliageDepthMaterial({ map: tex, alphaTest: 0.4, side: THREE.DoubleSide });
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
        lodAdd(mesh, TREE_LOD_DIST_M);
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
