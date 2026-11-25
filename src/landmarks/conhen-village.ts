import { KIND, hex, shade, rand } from '../geo/buf.ts';
import { LAND_Y } from '../config.ts';
import { rise } from '../geo/terrain.ts';

// Cồn Hến's village, drawn by landmarks/places/conhen.js (its generic infill houses are set aside there).
// Every lane is left clear: nothing stands inside a carriageway.

export const G = 0.5; // occupancy grid cell (m)
const GRID_X0 = 330;
const GRID_Z0 = -2200;
const GRID_NX = Math.ceil(280 / G);
const GRID_NZ = Math.ceil(1660 / G);
// cell values
export const FREE = 0, OUT = 1, ROAD = 2, MAPPED = 3, BUILT = 4, WOOD = 5, KEEP = 6;

const WEST_BANK_WOOD = 12;
const EAST_BANK_WOOD_WIDE = 34;
const EAST_BANK_WOOD_BASE = 22;
const MAPPED_BLD_PAD = 1.5;
const INFILL_ATTEMPTS = 26000;

const groundY = (x, z) => LAND_Y + rise(x, z);

const PAL = {
  walls: ['#e7d39a', '#d8e3c8', '#ece7da', '#c9dbe0', '#e8c39e', '#d7cde3', '#f1e6b8', '#bcd3c0', '#e3e0d6', '#8fc7bd', '#efe9dc', '#e9d8b0'].map(hex),
  tin: ['#8c9196', '#6d7d88', '#8e5f45', '#a9adb0', '#7a8a92', '#9b6b4c'].map(hex),
  tile: ['#a9553a', '#b86a45', '#9a4c33'].map(hex),
  conc: ['#a8a499', '#9a968c', '#b4afa3'].map(hex),
  fence: ['#e6e1d3', '#e2c46a', '#6fb3ad', '#c7c1b2', '#e9e4d8'].map(hex),
  hedge: hex('#4d6b33'), hedgeD: hex('#3f5a2b'), iron: hex('#2c2f33'), wood: hex('#5a4636'), steel: hex('#3d4a52'),
  post: hex('#8c8a84'), scrub: hex('#5b7337'), scrubD: hex('#4a612d'), weeds: hex('#6f7a45'), white: hex('#efebe2'),
  yellow: hex('#ecd27c'), cap: hex('#e9d27e'), glass: hex('#3a4a55'), pole: hex('#9a978f'), wire: hex('#2a2a2a'),
  turq: hex('#5fb0a8'), signR: hex('#b8352b'), signB: hex('#2f6b9a'), signY: hex('#e0b83c'), stoolR: hex('#c0392b'), stoolB: hex('#2e6fa8'),
  table: hex('#6e8fa8'), pale: hex('#d9d4c7'), trunk: hex('#8a8170'), frond: hex('#5f7f38'), frondD: hex('#4a6a2e'),
};
const pickItem = (arr, seed, salt) => arr[Math.floor(rand(seed, salt) * arr.length) % arr.length];

// Scanline fill of a ring into the grid rows: calls fn(ix0, ix1, iz, xa, xb) for each inside span.
function scanlineSpans(ring, fn) {
  for (let iz = 0; iz < GRID_NZ; iz++) {
    const z = GRID_Z0 + (iz + 0.5) * G;
    const xs = [];
    for (let i = 0; i < ring.length; i++) {
      const ptA = ring[i], ptB = ring[(i + 1) % ring.length];
      if ((ptA[1] <= z) !== (ptB[1] <= z)) xs.push(ptA[0] + ((z - ptA[1]) / (ptB[1] - ptA[1])) * (ptB[0] - ptA[0]));
    }
    xs.sort((valA, valB) => valA - valB);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const ix0 = Math.max(0, Math.ceil((xs[k] - GRID_X0) / G - 0.5));
      const ix1 = Math.min(GRID_NX - 1, Math.floor((xs[k + 1] - GRID_X0) / G - 0.5));
      if (ix1 >= ix0) fn(ix0, ix1, iz, xs[k], xs[k + 1]);
    }
  }
}

export function makeGrid({ shore, village, roads, mapped, reserved }) {
  const cells = new Uint8Array(GRID_NX * GRID_NZ).fill(OUT);
  const westX = new Float32Array(GRID_NZ).fill(NaN);
  const eastX = new Float32Array(GRID_NZ).fill(NaN);

  scanlineSpans(shore, (ix0, ix1, iz, xa, xb) => {
    for (let i = ix0; i <= ix1; i++) cells[iz * GRID_NX + i] = WOOD;
    if (isNaN(westX[iz]) || xa < westX[iz]) westX[iz] = xa;
    if (isNaN(eastX[iz]) || xb > eastX[iz]) eastX[iz] = xb;
  });
  scanlineSpans(village, (ix0, ix1, iz) => {
    for (let i = ix0; i <= ix1; i++) if (cells[iz * GRID_NX + i] === WOOD) cells[iz * GRID_NX + i] = FREE;
  });

  // the bank wood: a 10-14 m belt on the west bank; on the east bank a deeper wood
  for (let iz = 0; iz < GRID_NZ; iz++) {
    if (isNaN(westX[iz])) continue;
    const z = GRID_Z0 + (iz + 0.5) * G;
    const eastBelt = z > -1460 && z < -1205 ? EAST_BANK_WOOD_WIDE : EAST_BANK_WOOD_BASE;
    for (let i = 0; i < GRID_NX; i++) {
      const idx = iz * GRID_NX + i;
      if (cells[idx] !== FREE) continue;
      const x = GRID_X0 + (i + 0.5) * G;
      if (x > eastX[iz] - eastBelt || x < westX[iz] + WEST_BANK_WOOD) cells[idx] = WOOD;
    }
  }

  const api = {
    g: cells, NX: GRID_NX, NZ: GRID_NZ, westX, eastX,
    at(x, z) {
      const ix = Math.floor((x - GRID_X0) / G), iz = Math.floor((z - GRID_Z0) / G);
      return ix < 0 || iz < 0 || ix >= GRID_NX || iz >= GRID_NZ ? OUT : cells[iz * GRID_NX + ix];
    },
    set(x, z, val, only = null) {
      const ix = Math.floor((x - GRID_X0) / G), iz = Math.floor((z - GRID_Z0) / G);
      if (ix < 0 || iz < 0 || ix >= GRID_NX || iz >= GRID_NZ) return;
      if (only === null || only.includes(cells[iz * GRID_NX + ix])) cells[iz * GRID_NX + ix] = val;
    },
    rect(cx, cz, width, depth, ang, margin, fn) {
      const ux = Math.cos(ang), uz = Math.sin(ang);
      const halfW = width / 2 + margin, halfD = depth / 2 + margin;
      for (let u = -halfW; u <= halfW + 1e-6; u += G * 0.7) {
        for (let v = -halfD; v <= halfD + 1e-6; v += G * 0.7) {
          if (fn(cx + u * ux - v * uz, cz + u * uz + v * ux) === false) return false;
        }
      }
      return true;
    },
    free(cx, cz, width, depth, ang, margin, ok = [FREE]) {
      return api.rect(cx, cz, width, depth, ang, margin, (x, z) => ok.includes(api.at(x, z)));
    },
    mark(cx, cz, width, depth, ang, margin, val = BUILT) {
      api.rect(cx, cz, width, depth, ang, margin, (x, z) => { api.set(x, z, val, [FREE, WOOD, KEEP]); });
    },
    box(x0, z0, x1, z1, val) {
      for (let x = x0; x <= x1; x += G * 0.7) for (let z = z0; z <= z1; z += G * 0.7) api.set(x, z, val, [FREE, WOOD]);
    },
  };

  for (const { w, pts } of roads) {
    for (let i = 0; i + 3 < pts.length; i += 2) {
      const ax = pts[i] / 10, az = pts[i + 1] / 10, bx = pts[i + 2] / 10, bz = pts[i + 3] / 10;
      const segLen = Math.hypot(bx - ax, bz - az);
      if (segLen < 0.01) continue;
      api.rect((ax + bx) / 2, (az + bz) / 2, segLen + w + 0.8, w + 0.8, Math.atan2(bz - az, bx - ax), 0, (x, z) => {
        api.set(x, z, ROAD, [FREE, WOOD, KEEP, OUT]);
      });
    }
  }
  for (const ring of mapped) {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [x, z] of ring) {
      x0 = Math.min(x0, x); x1 = Math.max(x1, x);
      z0 = Math.min(z0, z); z1 = Math.max(z1, z);
    }
    for (let x = x0 - MAPPED_BLD_PAD; x <= x1 + MAPPED_BLD_PAD; x += G) {
      for (let z = z0 - MAPPED_BLD_PAD; z <= z1 + MAPPED_BLD_PAD; z += G) {
        if (inOrNear(x, z, ring, MAPPED_BLD_PAD)) api.set(x, z, MAPPED, [FREE, WOOD, KEEP]);
      }
    }
  }
  for (const [x0, z0, x1, z1] of reserved) api.box(x0 - 1, z0 - 1, x1 + 1, z1 + 1, KEEP);
  return api;
}

function inOrNear(x, z, ring, margin) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
    const tx = xi - xj, tz = zi - zj, lenSq = tx * tx + tz * tz || 1;
    const param = Math.max(0, Math.min(1, ((x - xj) * tx + (z - zj) * tz) / lenSq));
    if (Math.hypot(xj + tx * param - x, zj + tz * param - z) < margin) return true;
  }
  return inside;
}

// ---- drawing ----

function buildGableRoof(S, cx, cz, frontage, depth, ang, y0, yEave, wallCol, opts, toPt) {
  const { roof, i: seed } = opts;
  const ux = Math.cos(ang), uz = Math.sin(ang);
  S.box(cx, cz, y0 - 0.3, yEave, frontage, depth, ang, wallCol, { top: shade(wallCol, 0.8) });
  const roofCol = roof === 'tile'
    ? shade(pickItem(PAL.tile, seed, 8), 0.9 + rand(seed, 9) * 0.15)
    : shade(pickItem(PAL.tin, seed, 8), 0.9 + rand(seed, 9) * 0.18);
  const along = opts.ridge !== 'across';
  const ridgeLen = along ? frontage : depth;
  const spanW = along ? depth : frontage;
  const roofRise = (roof === 'tile' ? 0.42 : 0.24) * spanW;
  const roofPt = (alongPos, acrossPos, y) => (along ? toPt(alongPos, acrossPos, y) : toPt(acrossPos, alongPos, y));
  const eaveOver = 0.45, gableOver = 0.3;
  const yRidge = yEave + roofRise;
  const yEaveDrop = yEave - eaveOver * (roofRise / (spanW / 2));

  S.kind = roof === 'tile' ? KIND.TILE : KIND.FLAT;
  for (const side of [-1, 1]) {
    const p0 = roofPt(-ridgeLen / 2 - gableOver, side * (spanW / 2 + eaveOver), yEaveDrop);
    const p1 = roofPt(ridgeLen / 2 + gableOver, side * (spanW / 2 + eaveOver), yEaveDrop);
    const p2 = roofPt(ridgeLen / 2 + gableOver, 0, yRidge);
    const p3 = roofPt(-ridgeLen / 2 - gableOver, 0, yRidge);
    S.quad(p0, p1, p2, p3, roofCol, [0, 1, 0]);
    S.quad(p0, p1, p2, p3, shade(roofCol, 0.55), [0, -1, 0]);
  }
  S.kind = opts.colonial ? KIND.COLONIAL : KIND.FACADE;
  for (const side of [-1, 1]) {
    const p0 = roofPt(side * ridgeLen / 2, -spanW / 2, yEave);
    const p1 = roofPt(side * ridgeLen / 2, spanW / 2, yEave);
    const p2 = roofPt(side * ridgeLen / 2, 0, yRidge);
    const hint = along ? [side * ux, 0, side * uz] : [-side * uz, 0, side * ux];
    S.tri(p0, p1, p2, wallCol, hint);
  }
}

// A house on an oriented plot: centre (cx, cz), frontage along local x, depth along local z, front face toward
// local -z * frontSign (frontSign = 1: the lane lies at -z).
export function house(S, cx, cz, frontage, depth, ang, frontSign, opts) {
  const { h: height, roof, i: seed } = opts;
  const ux = Math.cos(ang), uz = Math.sin(ang);
  const toPt = (u, v, y) => [cx + u * ux - v * uz, y, cz + u * uz + v * ux];
  const y0 = groundY(cx, cz), yEave = y0 + height;
  const wallCol = opts.wall || shade(pickItem(PAL.walls, seed, 1), 0.92 + rand(seed, 2) * 0.14);
  S.base = y0 - LAND_Y;
  S.kind = opts.colonial ? KIND.COLONIAL : KIND.FACADE;

  if (roof === 'flat') {
    const ring = [toPt(-frontage / 2, -depth / 2, 0), toPt(frontage / 2, -depth / 2, 0), toPt(frontage / 2, depth / 2, 0), toPt(-frontage / 2, depth / 2, 0)].map((pt) => [pt[0], pt[2]]);
    S.prism(ring, y0 - 0.3, yEave, wallCol, shade(pickItem(PAL.conc, seed, 3), 0.95 + rand(seed, 4) * 0.1), { parapet: opts.parapet ?? 0.8, topKind: KIND.FLAT });
    if (rand(seed, 5) < 0.35 && frontage > 4.5) {
      const su = (rand(seed, 6) - 0.5) * (frontage - 3), sv = depth / 2 - 2.2;
      const roomPt = toPt(su, sv * frontSign, 0);
      S.box(roomPt[0], roomPt[2], yEave, yEave + 2.6, 2.6, 3.2, ang, shade(wallCol, 0.95), { top: pickItem(PAL.conc, seed, 7), topKind: KIND.FLAT });
    }
  } else {
    buildGableRoof(S, cx, cz, frontage, depth, ang, y0, yEave, wallCol, opts, toPt);
  }

  S.kind = KIND.PLAIN;
  const frontV = -frontSign * (depth / 2 + 0.04);
  const doorW = Math.min(frontage - 1.2, 1.5 + rand(seed, 10) * 1.4);
  const doorU = (rand(seed, 11) - 0.5) * Math.max(0, frontage - doorW - 1.4);
  const doorPt = toPt(doorU, frontV, 0);
  S.box(doorPt[0], doorPt[2], y0, y0 + 2.5, doorW, 0.08, ang, rand(seed, 12) < 0.5 ? PAL.steel : PAL.wood);

  const porchD = opts.porch || 0;
  if (porchD > 0.8) {
    const yWall = y0 + Math.min(height - 0.2, 3.1 + rand(seed, 13) * 0.5);
    const yOut = yWall - 0.18 * porchD - 0.2;
    const porchW = frontage - 0.3;
    const tinCol = shade(pickItem(PAL.tin, seed, 14), 0.9 + rand(seed, 15) * 0.2);
    const p0 = toPt(-porchW / 2, -frontSign * depth / 2, yWall);
    const p1 = toPt(porchW / 2, -frontSign * depth / 2, yWall);
    const p2 = toPt(porchW / 2, -frontSign * (depth / 2 + porchD), yOut);
    const p3 = toPt(-porchW / 2, -frontSign * (depth / 2 + porchD), yOut);
    S.kind = KIND.FLAT;
    S.quad(p0, p1, p2, p3, tinCol, [0, 1, 0]);
    S.quad(p0, p1, p2, p3, shade(tinCol, 1.05), [0, -1, 0]);
    S.kind = KIND.PLAIN;
    for (const side of [-1, 1]) {
      const postPt = toPt(side * (porchW / 2 - 0.15), -frontSign * (depth / 2 + porchD - 0.15), 0);
      S.box(postPt[0], postPt[2], y0, yOut, 0.1, 0.1, ang, PAL.steel);
    }
  }
  if (roof === 'flat' && height > 6 && opts.balcony) {
    const balcD = opts.balcony, yBalc = y0 + 3.3;
    const slabPt = toPt(0, -frontSign * (depth / 2 + balcD / 2), 0);
    S.box(slabPt[0], slabPt[2], yBalc, yBalc + 0.18, frontage - 0.4, balcD, ang, PAL.pale, { bottom: true });
    const railPt = toPt(0, -frontSign * (depth / 2 + balcD - 0.05), 0);
    S.box(railPt[0], railPt[2], yBalc + 0.18, yBalc + 1.05, frontage - 0.4, 0.06, ang, opts.rail || PAL.iron);
  }
  S.base = 0;
}

// A wall along the lane, from ptA to ptB (scene metres), with a gate gap of gateW at gateFrac (0..1) between two piers.
export function laneWall(S, ptA, ptB, height, col, seed, gateFrac = 0.5, gateW = 2.6) {
  const tx = ptB[0] - ptA[0], tz = ptB[1] - ptA[1];
  const len = Math.hypot(tx, tz);
  if (len < 0.5) return;
  const ang = Math.atan2(tz, tx), ux = tx / len, uz = tz / len;
  const pointAt = (dist) => [ptA[0] + ux * dist, ptA[1] + uz * dist];
  const wallSeg = (s0, s1) => {
    if (s1 - s0 < 0.2) return;
    const [x, z] = pointAt((s0 + s1) / 2), y = groundY(x, z);
    S.box(x, z, y - 0.2, y + height, s1 - s0, 0.22, ang, col, { top: shade(col, 1.06) });
  };
  S.kind = KIND.MASONRY;
  const gateStart = gateFrac === null || len < gateW + 1 ? len : Math.max(0.4, Math.min(len - gateW - 0.4, len * gateFrac - gateW / 2));
  wallSeg(0, gateStart);
  if (gateStart < len) {
    wallSeg(gateStart + gateW, len);
    for (const pierPos of [gateStart, gateStart + gateW]) {
      const [x, z] = pointAt(pierPos), y = groundY(x, z);
      S.box(x, z, y - 0.2, y + height + 0.45, 0.42, 0.42, ang, shade(col, 0.96), { top: shade(col, 1.1) });
      S.box(x, z, y + height + 0.45, y + height + 0.6, 0.56, 0.56, ang, shade(col, 1.1));
    }
    const [x, z] = pointAt(gateStart + gateW / 2), y = groundY(x, z);
    S.kind = KIND.PLAIN;
    S.box(x, z, y + 0.05, y + height + 0.1, gateW - 0.5, 0.06, ang, PAL.iron);
  }
  S.kind = KIND.PLAIN;
}

export function hedge(S, ptA, ptB, height, seed) {
  const tx = ptB[0] - ptA[0], tz = ptB[1] - ptA[1];
  const len = Math.hypot(tx, tz);
  if (len < 0.5) return;
  const x = (ptA[0] + ptB[0]) / 2, z = (ptA[1] + ptB[1]) / 2, y = groundY(x, z);
  S.kind = KIND.PLAIN;
  S.box(x, z, y - 0.1, y + height, len, 0.8, Math.atan2(tz, tx), rand(seed, 71) < 0.5 ? PAL.hedge : PAL.hedgeD, { top: shade(PAL.hedge, 1.12), taper: 0.94 });
}

// Scrub on a vacant plot: low lumps of weeds and shrubs.
export function scrub(S, x, z, seed, scale = 1) {
  const y = groundY(x, z);
  S.kind = KIND.PLAIN;
  const radius = (0.6 + rand(seed, 81) * 0.9) * scale;
  S.cyl(x, z, y - 0.1, y + (0.5 + rand(seed, 82) * 0.9) * scale, radius, radius * 0.45, 5, rand(seed, 83) < 0.5 ? PAL.scrub : PAL.scrubD, { rot: rand(seed, 84) * 6 });
}

// An areca palm (cau): a straight thin grey trunk, 12-15 m, and a small crown.
export function areca(S, x, z, seed) {
  const y0 = groundY(x, z);
  const height = 12 + rand(seed, 91) * 3;
  const lean = (rand(seed, 92) - 0.5) * 0.5;
  const top = [x + lean, y0 + height, z + lean * 0.6];
  S.kind = KIND.PLAIN;
  S.beam([x, y0, z], top, 0.2, 0.2, PAL.trunk);
  S.cyl(top[0], top[2], top[1] - 1.1, top[1] - 0.1, 0.17, 0.17, 5, hex('#6f8a3a'));
  const frondSpan = 2.3;
  for (let k = 0; k < 7; k++) {
    const angle = (k / 7) * Math.PI * 2 + rand(seed, 93);
    const dx = Math.cos(angle), dz = Math.sin(angle);
    const mid = [top[0] + dx * frondSpan * 0.5, top[1] + 0.5, top[2] + dz * frondSpan * 0.5];
    const tip = [top[0] + dx * frondSpan, top[1] - 0.9, top[2] + dz * frondSpan];
    const sx = -dz * 0.3, sz = dx * 0.3;
    const col = k % 2 ? PAL.frond : PAL.frondD;
    S.quad(top, [mid[0] + sx, mid[1], mid[2] + sz], tip, [mid[0] - sx, mid[1], mid[2] - sz], col, [0, 1, 0]);
    S.quad(top, [mid[0] - sx, mid[1], mid[2] - sz], tip, [mid[0] + sx, mid[1], mid[2] + sz], shade(col, 0.8), [0, -1, 0]);
  }
}

// ---- the village ----

function pickHouseType(seed) {
  const roll = rand(seed, 20);
  if (roll < 0.47) return { roof: 'tin', h: 3.3 + rand(seed, 21) * 0.6 };
  if (roll < 0.62) return { roof: 'tile', h: 3.2 + rand(seed, 21) * 0.5 };
  if (roll < 0.94) return { roof: 'flat', h: 6.6 + rand(seed, 21) * 0.7 };
  return { roof: 'flat', h: 9.8 + rand(seed, 21) * 0.6 };
}

function placeVillageHouse(S, grid, built, cx, cz, frontage, depth, ang, frontSign, setback, seed, allowedCells) {
  const spec = pickHouseType(seed);
  let porch = setback > 1.6 && rand(seed, 22) < 0.65 ? Math.min(setback - 0.35, 1.8 + rand(seed, 23) * 1.2) : 0;
  let balcony = spec.roof === 'flat' && setback > 1.4 && !porch ? Math.min(setback - 0.3, 1.1) : 0;
  const reach = Math.max(porch, balcony);
  if (reach > 0) {
    const vx = Math.sin(ang) * frontSign, vz = -Math.cos(ang) * frontSign;
    const px = cx + vx * (depth / 2 + reach / 2 + 0.1);
    const pz = cz + vz * (depth / 2 + reach / 2 + 0.1);
    if (grid.free(px, pz, frontage - 0.3, reach, ang, 0.1, allowedCells)) grid.mark(px, pz, frontage - 0.3, reach, ang, 0);
    else porch = balcony = 0;
  }
  house(S, cx, cz, frontage, depth, ang, frontSign, { ...spec, i: seed, porch, balcony, ridge: rand(seed, 24) < 0.62 ? 'along' : 'across' });
  built.push([cx, cz, frontage, depth, ang]);
}

// roads: [{ w (m), pts (dm, flat) }] on the island; grid: makeGrid(...). Returns the houses drawn.
export function village(S, grid, roads) {
  const built = [];
  let plotIdx = 1000;
  const inLane = (x, z, margin) => roads.some(({ w, pts }) => {
    for (let p = 0; p + 3 < pts.length; p += 2) {
      const ax = pts[p] / 10, az = pts[p + 1] / 10;
      const tx = pts[p + 2] / 10 - ax, tz = pts[p + 3] / 10 - az;
      const lenSq = tx * tx + tz * tz || 1;
      const param = Math.max(0, Math.min(1, ((x - ax) * tx + (z - az) * tz) / lenSq));
      if (Math.hypot(ax + tx * param - x, az + tz * param - z) < w / 2 + margin) return true;
    }
    return false;
  });

  // 1. the frontage of every lane, both sides, plus a second row behind
  for (const { w, pts } of roads) {
    for (let p = 0; p + 3 < pts.length; p += 2) {
      const ax = pts[p] / 10, az = pts[p + 1] / 10, bx = pts[p + 2] / 10, bz = pts[p + 3] / 10;
      const segLen = Math.hypot(bx - ax, bz - az);
      if (segLen < 6) continue;
      const tx = (bx - ax) / segLen, tz = (bz - az) / segLen;
      const nx = -tz, nz = tx, ang = Math.atan2(tz, tx);
      for (const side of [-1, 1]) {
        let cursor = 1.5;
        while (cursor < segLen - 4) {
          plotIdx++;
          const frontage = 4.5 + rand(plotIdx, 1) * 3;
          const hasYard = rand(plotIdx, 2) < 0.45;
          const setback = hasYard ? 2.4 + rand(plotIdx, 3) * 2.6 : 0.5 + rand(plotIdx, 3) * 0.5;
          let placed = false;
          for (const depth of [8 + rand(plotIdx, 4) * 6, 7, 5.5]) {
            const off = w / 2 + 0.4 + setback + depth / 2;
            const cx = ax + tx * (cursor + frontage / 2) + nx * side * off;
            const cz = az + tz * (cursor + frontage / 2) + nz * side * off;
            if (grid.at(cx, cz) === WOOD && rand(plotIdx, 5) > 0.18) break;
            if (!grid.free(cx, cz, frontage, depth, ang, 0.3, [FREE, WOOD])) continue;
            grid.mark(cx, cz, frontage, depth, ang, 0.35);
            placeVillageHouse(S, grid, built, cx, cz, frontage, depth, ang, side, setback, plotIdx, [FREE, WOOD, BUILT, ROAD]);

            const edge0 = [ax + tx * cursor + nx * side * (w / 2 + 0.75), az + tz * cursor + nz * side * (w / 2 + 0.75)];
            const edge1 = [ax + tx * (cursor + frontage + 0.6) + nx * side * (w / 2 + 0.75), az + tz * (cursor + frontage + 0.6) + nz * side * (w / 2 + 0.75)];
            if (hasYard && setback > 2.2) {
              const ex = (edge0[0] + edge1[0]) / 2, ez = (edge0[1] + edge1[1]) / 2;
              const clear = [0, 0.25, 0.5, 0.75, 1].every((frac) => !inLane(edge0[0] + (edge1[0] - edge0[0]) * frac, edge0[1] + (edge1[1] - edge0[1]) * frac, 0.45));
              if (clear && grid.free(ex, ez, frontage + 0.6, 0.2, ang, 0, [FREE, WOOD, BUILT, ROAD])) {
                if (rand(plotIdx, 6) < 0.68) laneWall(S, edge0, edge1, 1.3 + rand(plotIdx, 7) * 0.5, pickItem(PAL.fence, plotIdx, 8), plotIdx, 0.3 + rand(plotIdx, 9) * 0.4);
                else hedge(S, edge0, edge1, 1.4 + rand(plotIdx, 7) * 0.8, plotIdx);
                grid.mark(ex, ez, frontage + 0.6, 0.3, ang, 0);
              }
            }
            const court = 1.5 + rand(plotIdx, 10) * 3;
            const backF = frontage * (0.8 + rand(plotIdx, 11) * 0.4);
            const backD = 7 + rand(plotIdx, 12) * 5;
            const backOff = off + depth / 2 + court + backD / 2;
            const backCx = ax + tx * (cursor + frontage / 2) + nx * side * backOff;
            const backCz = az + tz * (cursor + frontage / 2) + nz * side * backOff;
            if (rand(plotIdx, 13) < 0.8 && grid.at(backCx, backCz) === FREE && grid.free(backCx, backCz, backF, backD, ang, 0.35)) {
              grid.mark(backCx, backCz, backF, backD, ang, 0.4);
              placeVillageHouse(S, grid, built, backCx, backCz, backF, backD, ang, side, court, plotIdx + 50000, [FREE, WOOD]);
            }
            cursor += frontage + 0.3 + rand(plotIdx, 14) * 1.4;
            placed = true;
            break;
          }
          if (!placed) cursor += 1.5;
        }
      }
    }
  }

  // 2. the plots between, reached by footpaths: houses aligned with the nearest lane
  const segs = [];
  for (const { pts } of roads) {
    for (let p = 0; p + 3 < pts.length; p += 2) segs.push([pts[p] / 10, pts[p + 1] / 10, pts[p + 2] / 10, pts[p + 3] / 10]);
  }
  const nearestLaneAngle = (x, z) => {
    let bestDist = Infinity, bestAng = 0;
    for (const [ax, az, bx, bz] of segs) {
      const tx = bx - ax, tz = bz - az, lenSq = tx * tx + tz * tz || 1;
      const param = Math.max(0, Math.min(1, ((x - ax) * tx + (z - az) * tz) / lenSq));
      const dist = Math.hypot(ax + tx * param - x, az + tz * param - z);
      if (dist < bestDist) { bestDist = dist; bestAng = Math.atan2(tz, tx); }
    }
    return bestAng;
  };
  for (let attempt = 0; attempt < INFILL_ATTEMPTS; attempt++) {
    const x = 355 + rand(attempt, 41) * 225, z = -1900 + rand(attempt, 42) * 1260;
    if (grid.at(x, z) !== FREE) continue;
    plotIdx++;
    const ang = nearestLaneAngle(x, z) + (rand(attempt, 43) < 0.15 ? Math.PI / 2 : 0);
    const frontage = 5 + rand(attempt, 44) * 3.5, depth = 7 + rand(attempt, 45) * 5;
    if (!grid.free(x, z, frontage, depth, ang, 0.6)) continue;
    grid.mark(x, z, frontage, depth, ang, 0.7);
    placeVillageHouse(S, grid, built, x, z, frontage, depth, ang, rand(attempt, 46) < 0.5 ? 1 : -1, 1.2 + rand(attempt, 47) * 2, plotIdx + 100000, [FREE, WOOD]);
  }
  return built;
}

// ---- the set pieces seen from the street (car panoramas, 2024-25) ----

function buildUngBinhYellowHouse(S, grid) {
  const x0 = 529, x1 = 538, z0 = -1366.5, z1 = -1360.5;
  const y = groundY(533.5, -1363.5), height = 7.0, zc = (z0 + z1) / 2;
  grid.box(x0 - 0.5, z0 - 0.5, 543, z1 + 0.3, BUILT);
  house(S, (x0 + x1) / 2, zc, x1 - x0, z1 - z0, 0, 0, { h: height, roof: 'flat', i: 7, wall: PAL.yellow, colonial: true, parapet: 0.9 });
  S.kind = KIND.PLAIN;
  for (const z of [z0 + 0.2, z0 + 2.0, z1 - 2.0, z1 - 0.2]) S.box(x1 + 0.08, z, y, y + height, 0.2, 0.4, 0, PAL.white);
  for (const corniceY of [y + 3.3, y + height - 0.1]) S.box(x1 + 0.12, zc, corniceY, corniceY + 0.28, 0.32, z1 - z0 + 0.3, 0, PAL.white);
  S.box(x1 + 0.05, zc, y, y + 2.45, 0.1, 1.7, 0, PAL.wood);

  const buildFanlight = (radius, col, dx) => {
    for (let k = 0; k < 6; k++) {
      const a0 = (k / 6) * Math.PI, a1 = ((k + 1) / 6) * Math.PI;
      S.tri([x1 + dx, y + 2.45, zc], [x1 + dx, y + 2.45 + Math.sin(a0) * radius, zc + Math.cos(a0) * radius], [x1 + dx, y + 2.45 + Math.sin(a1) * radius, zc + Math.cos(a1) * radius], col, [1, 0, 0]);
    }
  };
  buildFanlight(1.0, PAL.white, 0.06);
  buildFanlight(0.82, PAL.glass, 0.08);
  for (const z of [zc - 1.75, zc + 1.75]) S.cyl(x1 + 1.3, z, y, y + 3.3, 0.17, 0.17, 8, PAL.yellow);
  S.box(x1 + 0.75, zc, y + 3.3, y + 3.75, 1.5, 4.2, 0, PAL.white, { bottom: true });

  S.kind = KIND.FLAT;
  const tin = hex('#8f969b'), ya = y + 4.6, yb = y + 3.4;
  S.quad([x1 + 1.5, ya, z0 - 0.1], [x1 + 1.5, ya, z1 + 0.1], [542.3, yb, z1 + 0.1], [542.3, yb, z0 - 0.1], tin, [0, 1, 0]);
  S.quad([x1 + 1.5, ya, z0 - 0.1], [x1 + 1.5, ya, z1 + 0.1], [542.3, yb, z1 + 0.1], [542.3, yb, z0 - 0.1], shade(tin, 1.15), [0, 1, 0]);
  S.kind = KIND.PLAIN;
  for (const z of [z0 + 0.1, z1 - 0.1]) S.box(542.1, z, y, yb, 0.09, 0.09, 0, PAL.steel);

  const gx = 541.6, gz = -1363.1, pierCol = hex('#a9aea4');
  for (const z of [gz - 1.75, gz + 1.75]) {
    S.box(gx, z, y - 0.2, y + 1.7, 0.8, 0.8, 0, pierCol);
    S.box(gx, z, y + 1.7, y + 1.95, 1.0, 1.0, 0, PAL.yellow, { top: PAL.cap, taper: 0.8 });
  }
  S.box(gx, gz, y + 0.05, y + 1.6, 0.06, 2.7, 0, PAL.iron);
  S.kind = KIND.MASONRY;
  S.box(gx, (z0 - 1 + gz - 2.15) / 2, y - 0.2, y + 1.2, 0.22, gz - 2.15 - z0 + 1, 0, pierCol, { top: PAL.cap });
  S.box(gx, (gz + 2.15 + z1 + 2.5) / 2, y - 0.2, y + 1.2, 0.22, z1 + 2.5 - gz - 2.15, 0, pierCol, { top: PAL.cap });

  const canopyY = y + 3.0;
  grid.box(530, -1375, 542, -1368, BUILT);
  S.kind = KIND.FLAT;
  S.quad([530, canopyY + 0.4, -1374.5], [542, canopyY, -1374.5], [542, canopyY, -1368], [530, canopyY + 0.4, -1368], hex('#7d878e'), [0, 1, 0]);
  S.quad([530, canopyY + 0.4, -1374.5], [542, canopyY, -1374.5], [542, canopyY, -1368], [530, canopyY + 0.4, -1368], hex('#9aa2a8'), [0, -1, 0]);
  S.kind = KIND.PLAIN;
  for (const [x, z] of [[530.3, -1374.2], [541.7, -1374.2], [530.3, -1368.3], [541.7, -1368.3]]) S.box(x, z, y, canopyY + 0.3, 0.1, 0.1, 0, PAL.steel);

  grid.box(530.5, -1353, 539.5, -1345, BUILT);
  house(S, 535, -1349, 8, 7, Math.PI / 2, 1, { h: 3.4, roof: 'tile', ridge: 'across', i: 8, wall: hex('#e9e2cf') });
}

function buildComHenStallAndVilla(S, grid) {
  const laneX = (z) => 543 - (11 * (z + 1301)) / 92;
  const y = groundY(549, -1297);
  grid.box(545.4, -1303.5, 553.5, -1291.5, BUILT);
  S.kind = KIND.FLAT;
  const tin = hex('#9aa0a4');
  S.quad([553, y + 3.3, -1303], [553, y + 3.3, -1292], [545.6, y + 2.7, -1292], [545.6, y + 2.7, -1303], tin, [0, 1, 0]);
  S.quad([553, y + 3.3, -1303], [553, y + 3.3, -1292], [545.6, y + 2.7, -1292], [545.6, y + 2.7, -1303], shade(tin, 1.1), [0, -1, 0]);
  S.kind = KIND.PLAIN;
  S.box(553.05, -1297.5, y, y + 3.3, 0.1, 11, 0, hex('#8a9095'));
  for (const z of [-1302.8, -1297.5, -1292.2]) S.box(545.8, z, y, y + 2.7, 0.1, 0.1, 0, PAL.steel);
  for (let k = 0; k < 4; k++) {
    const tz = -1301.5 + k * 2.8, tx = 549.5 + (k % 2) * 1.2;
    S.box(tx, tz, y + 0.7, y + 0.75, 1.2, 0.7, 0, PAL.table);
    S.box(tx, tz, y, y + 0.7, 0.08, 0.08, 0, PAL.steel);
    for (const [dx, dz] of [[-0.8, 0], [0.8, 0], [0, -0.6]]) S.box(tx + dx, tz + dz, y, y + 0.42, 0.32, 0.32, 0, k % 2 ? PAL.stoolR : PAL.stoolB);
  }

  const wallZs = [-1293, -1281.5, -1270];
  for (let k = 0; k + 1 < wallZs.length; k++) {
    const ptA = [laneX(wallZs[k]) + 2.35, wallZs[k]], ptB = [laneX(wallZs[k + 1]) + 2.35, wallZs[k + 1]];
    laneWall(S, ptA, ptB, 1.6, PAL.turq, 9 + k, k === 0 ? 0.7 : null);
    grid.box(Math.min(ptA[0], ptB[0]) - 0.3, ptA[1], Math.max(ptA[0], ptB[0]) + 0.3, ptB[1], BUILT);
  }
  S.kind = KIND.PLAIN;
  for (const [z, col] of [[-1290.5, PAL.signR], [-1286, PAL.signY], [-1278, PAL.signB]]) {
    S.box(laneX(z) + 2.2, z, y + 0.5, y + 1.4, 0.06, 1.4, Math.atan2(92, -11) - Math.PI / 2, col);
  }
  for (let z = -1295; z < -1272; z += 5.5) {
    const ptA = [laneX(z) - 2.35, z], ptB = [laneX(z + 5) - 2.35, z + 5];
    hedge(S, ptA, ptB, 1.6 + rand(z, 3) * 0.5, z | 0);
    grid.box(Math.min(ptA[0], ptB[0]) - 0.4, ptA[1], Math.max(ptA[0], ptB[0]) + 0.4, ptB[1], BUILT);
  }

  grid.box(528, -1290.5, 534, -1285.5, BUILT);
  house(S, 531, -1288, 5, 4, 0, 1, { h: 2.6, roof: 'tile', ridge: 'along', i: 11, wall: hex('#d9d0bc') });
  grid.box(514.5, -1290.5, 528, -1279.5, BUILT);
  house(S, 521, -1285, 10, 12, Math.PI / 2, 1, { h: 7.2, roof: 'flat', i: 12, wall: hex('#eeebe3'), colonial: true, parapet: 0.7, balcony: 1.2, rail: PAL.white });
  const villaY = groundY(521, -1285);
  S.kind = KIND.PLAIN;
  for (const corniceY of [villaY + 3.2, villaY + 7.0]) S.box(527.1, -1285, corniceY, corniceY + 0.3, 0.3, 10.3, 0, PAL.white);
  for (const [x, z] of [[528.5, -1283.5], [530.5, -1281.5], [532.6, -1283], [529.3, -1279.8], [533.4, -1280.5]]) {
    areca(S, x, z, Math.round(x * 7 + z));
  }
}

function buildWestLaneVacantLot(S, grid) {
  const fenceX = 376.2;
  grid.box(fenceX - 0.6, -1378, 394, -1357, KEEP);
  S.kind = KIND.PLAIN;
  for (let z = -1377.5; z <= -1357.5; z += 2.5) {
    const y = groundY(fenceX, z);
    S.box(fenceX, z, y - 0.2, y + 1.9, 0.14, 0.14, 0, hex('#b5b1a8'));
  }
  const midY = groundY(fenceX, -1367);
  for (const wireH of [0.25, 0.9, 1.5, 1.85]) S.beam([fenceX, midY + wireH, -1377.5], [fenceX, midY + wireH, -1357.5], 0.035, 0.035, hex('#6d7270'));
  S.box(fenceX + 0.02, -1367.5, midY + 0.2, midY + 1.85, 0.015, 20, 0, hex('#5d625f'));
  for (let k = 0; k < 40; k++) scrub(S, fenceX + 1.5 + rand(k, 1) * 16, -1376.5 + rand(k, 2) * 18.5, k + 300, 1.3);

  const poleY = groundY(374.1, -1356.4);
  S.cyl(374.1, -1356.4, poleY - 0.3, poleY + 8.5, 0.16, 0.12, 6, PAL.pole);
  S.box(374.1, -1356.4, poleY + 7.6, poleY + 7.75, 0.12, 1.8, 0, PAL.pole);
  for (const dz of [-0.75, 0.75]) S.beam([374.1, poleY + 7.75, -1356.4 + dz], [374.4, poleY + 7.2, -1356.4 + dz - 30], 0.03, 0.03, PAL.wire);

  const gateY = groundY(374.8, -1355);
  S.box(374.8, -1355, gateY - 0.2, gateY + 2.2, 0.5, 0.5, 0, PAL.white, { top: PAL.white });
  S.box(374.8, -1355, gateY + 2.2, gateY + 2.35, 0.65, 0.65, 0, PAL.white);
  S.box(374.85, -1352.8, gateY + 0.05, gateY + 1.8, 0.06, 4, 0, PAL.iron);
  grid.box(374.3, -1356.5, 378, -1350.5, BUILT);
}

export function setPieces(S, grid) {
  buildUngBinhYellowHouse(S, grid);
  buildComHenStallAndVilla(S, grid);
  buildWestLaneVacantLot(S, grid);
}

// Vacant plots seen on the satellite: overgrown, scrub and small trees, no houses.
export const VACANT = [[473, -1345, 510, -1291]];
export function vacant(S, grid) {
  for (const [x0, z0, x1, z1] of VACANT) {
    grid.box(x0, z0, x1, z1, KEEP);
    const count = Math.round(((x1 - x0) * (z1 - z0)) / 14);
    for (let k = 0; k < count; k++) {
      const x = x0 + rand(k, 5) * (x1 - x0), z = z0 + rand(k, 6) * (z1 - z0);
      if (grid.at(x, z) === KEEP) scrub(S, x, z, k + 500, 1.2);
    }
  }
}
