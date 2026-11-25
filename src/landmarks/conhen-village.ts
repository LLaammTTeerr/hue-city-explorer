import { KIND, hex, shade, rand } from '../geo/buf.ts';
import { LAND_Y } from '../config.ts';
import { rise } from '../geo/terrain.ts';

// Cồn Hến's village, drawn by landmarks/places/conhen.js (its generic infill houses are set aside there). What the
// satellite (2025-26) and the street-level panoramas show, and what this draws:
//   - a dense village: houses shoulder to shoulder on the 3-4 m concrete kiệt, 4.5-7.5 m frontages, a second row behind
//     with small courts, roof cover over most of the village between the gardens;
//   - one-storey houses under grey or rust corrugated tin and orange tile gables, two- and three-storey concrete houses
//     with flat roofs and parapets, tin lean-to porches out to the lane;
//   - lane edges of low lime, yellow and turquoise walls with gate piers and iron gates, and clipped hedges;
//   - vacant overgrown plots, and the wood along the banks.
// The houses are typical of the village, not surveys of particular houses, except the set pieces seen from the street
// (setPieces below). Every lane is left clear: nothing stands inside a carriageway.

export const G = 0.5; // occupancy grid cell (m)
const X0 = 330, Z0 = -2200, NX = Math.ceil(280 / G), NZ = Math.ceil(1660 / G);
// cell values
export const FREE = 0, OUT = 1, ROAD = 2, MAPPED = 3, BUILT = 4, WOOD = 5, KEEP = 6;

const gY = (x, z) => LAND_Y + rise(x, z);
const C = {
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
const pick = (arr, i, s) => arr[Math.floor(rand(i, s) * arr.length) % arr.length];

// Scanline fill of a ring into the grid rows: calls fn(ix0, ix1, iz) for each inside span.
function spans(ring, fn) {
  for (let iz = 0; iz < NZ; iz++) {
    const z = Z0 + (iz + 0.5) * G, xs = [];
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      if ((a[1] <= z) !== (b[1] <= z)) xs.push(a[0] + ((z - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const i0 = Math.max(0, Math.ceil((xs[k] - X0) / G - 0.5)), i1 = Math.min(NX - 1, Math.floor((xs[k + 1] - X0) / G - 0.5));
      if (i1 >= i0) fn(i0, i1, iz, xs[k], xs[k + 1]);
    }
  }
}

export function makeGrid({ shore, village, roads, mapped, reserved }) {
  const g = new Uint8Array(NX * NZ).fill(OUT);
  const westX = new Float32Array(NZ).fill(NaN), eastX = new Float32Array(NZ).fill(NaN);
  // the island: free inside the village, wood elsewhere on land (the sandbar's trees and the banks)
  spans(shore, (i0, i1, iz, xa, xb) => {
    for (let i = i0; i <= i1; i++) g[iz * NX + i] = WOOD;
    if (isNaN(westX[iz]) || xa < westX[iz]) westX[iz] = xa;
    if (isNaN(eastX[iz]) || xb > eastX[iz]) eastX[iz] = xb;
  });
  spans(village, (i0, i1, iz) => { for (let i = i0; i <= i1; i++) if (g[iz * NX + i] === WOOD) g[iz * NX + i] = FREE; });
  // the bank wood: a 10-14 m belt on the west bank; on the east bank a deeper wood, 30-45 m from the water between Ưng
  // Bình and the bridge road (east of Ưng Bình tờ 19), about 22 m elsewhere
  for (let iz = 0; iz < NZ; iz++) {
    if (isNaN(westX[iz])) continue;
    const z = Z0 + (iz + 0.5) * G;
    const east = z > -1460 && z < -1205 ? 34 : 22, west = 12;
    for (let i = 0; i < NX; i++) {
      const k = iz * NX + i;
      if (g[k] !== FREE) continue;
      const x = X0 + (i + 0.5) * G;
      if (x > eastX[iz] - east || x < westX[iz] + west) g[k] = WOOD;
    }
  }
  const api = {
    g, NX, NZ, westX, eastX,
    at(x, z) {
      const i = Math.floor((x - X0) / G), k = Math.floor((z - Z0) / G);
      return i < 0 || k < 0 || i >= NX || k >= NZ ? OUT : g[k * NX + i];
    },
    set(x, z, v, only = null) {
      const i = Math.floor((x - X0) / G), k = Math.floor((z - Z0) / G);
      if (i < 0 || k < 0 || i >= NX || k >= NZ) return;
      if (only === null || only.includes(g[k * NX + i])) g[k * NX + i] = v;
    },
    // every cell of an oriented rectangle (centre, size along the local axes, margin), as a callback
    rect(cx, cz, w, d, ang, m, fn) {
      const ux = Math.cos(ang), uz = Math.sin(ang), W = w / 2 + m, D = d / 2 + m;
      for (let u = -W; u <= W + 1e-6; u += G * 0.7) for (let v = -D; v <= D + 1e-6; v += G * 0.7) if (fn(cx + u * ux - v * uz, cz + u * uz + v * ux) === false) return false;
      return true;
    },
    free(cx, cz, w, d, ang, m, ok = [FREE]) { return api.rect(cx, cz, w, d, ang, m, (x, z) => ok.includes(api.at(x, z))); },
    mark(cx, cz, w, d, ang, m, v = BUILT) { api.rect(cx, cz, w, d, ang, m, (x, z) => { api.set(x, z, v, [FREE, WOOD, KEEP]); }); },
    box(x0, z0, x1, z1, v) { for (let x = x0; x <= x1; x += G * 0.7) for (let z = z0; z <= z1; z += G * 0.7) api.set(x, z, v, [FREE, WOOD]); },
  };
  // lanes: each carriageway and 0.4 m either side
  for (const { w, pts } of roads) {
    for (let i = 0; i + 3 < pts.length; i += 2) {
      const ax = pts[i] / 10, az = pts[i + 1] / 10, bx = pts[i + 2] / 10, bz = pts[i + 3] / 10;
      const l = Math.hypot(bx - ax, bz - az);
      if (l < 0.01) continue;
      api.rect((ax + bx) / 2, (az + bz) / 2, l + w + 0.8, w + 0.8, Math.atan2(bz - az, bx - ax), 0, (x, z) => { api.set(x, z, ROAD, [FREE, WOOD, KEEP, OUT]); });
    }
  }
  // mapped buildings (their own houses, from data.bld) and 1.5 m round them
  for (const r of mapped) {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [x, z] of r) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    for (let x = x0 - 1.5; x <= x1 + 1.5; x += G) for (let z = z0 - 1.5; z <= z1 + 1.5; z += G) if (inOrNear(x, z, r, 1.5)) api.set(x, z, MAPPED, [FREE, WOOD, KEEP]);
  }
  for (const [x0, z0, x1, z1] of reserved) api.box(x0 - 1, z0 - 1, x1 + 1, z1 + 1, KEEP);
  return api;
}

function inOrNear(x, z, r, m) {
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, zi] = r[i], [xj, zj] = r[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
    const tx = xi - xj, tz = zi - zj, l2 = tx * tx + tz * tz || 1, t = Math.max(0, Math.min(1, ((x - xj) * tx + (z - zj) * tz) / l2));
    if (Math.hypot(xj + tx * t - x, zj + tz * t - z) < m) return true;
  }
  return inside;
}

// ---- drawing ----

// A house on an oriented plot: centre (cx, cz), frontage f along local x, depth d along local z, front face toward
// local -z * fs (fs = 1: the lane lies at -z). o: { h, roof: 'tin'|'tile'|'flat', ridge: 'along'|'across', porch, i }
export function house(S, cx, cz, f, d, ang, fs, o) {
  const { h, roof, i } = o;
  const ux = Math.cos(ang), uz = Math.sin(ang);
  const P = (u, v, y) => [cx + u * ux - v * uz, y, cz + u * uz + v * ux];
  const y0 = gY(cx, cz), yE = y0 + h;
  const wall = o.wall || shade(pick(C.walls, i, 1), 0.92 + rand(i, 2) * 0.14);
  S.base = y0 - LAND_Y;
  S.kind = o.colonial ? KIND.COLONIAL : KIND.FACADE;
  if (roof === 'flat') {
    const ring = [P(-f / 2, -d / 2, 0), P(f / 2, -d / 2, 0), P(f / 2, d / 2, 0), P(-f / 2, d / 2, 0)].map((p) => [p[0], p[2]]);
    S.prism(ring, y0 - 0.3, yE, wall, shade(pick(C.conc, i, 3), 0.95 + rand(i, 4) * 0.1), { parapet: o.parapet ?? 0.8, topKind: KIND.FLAT });
    // a stair head or a small room on part of the roof, on about a third of them
    if (rand(i, 5) < 0.35 && f > 4.5) {
      const su = (rand(i, 6) - 0.5) * (f - 3), sv = d / 2 - 2.2;
      const c = P(su, sv * fs, 0);
      S.box(c[0], c[2], yE, yE + 2.6, 2.6, 3.2, ang, shade(wall, 0.95), { top: pick(C.conc, i, 7), topKind: KIND.FLAT });
    }
  } else {
    S.box(cx, cz, y0 - 0.3, yE, f, d, ang, wall, { top: shade(wall, 0.8) });
    const col = roof === 'tile' ? shade(pick(C.tile, i, 8), 0.9 + rand(i, 9) * 0.15) : shade(pick(C.tin, i, 8), 0.9 + rand(i, 9) * 0.18);
    const along = o.ridge !== 'across';
    // gable roof, ridge along local x (along) or local z (across); 0.45 m eaves, 0.3 m over the gable ends
    const L = along ? f : d, Wd = along ? d : f, rise = (roof === 'tile' ? 0.42 : 0.24) * Wd;
    const Q = (a, b, y) => (along ? P(a, b, y) : P(b, a, y));
    const e = 0.45, g = 0.3, yr = yE + rise, ye = yE - e * (rise / (Wd / 2));
    S.kind = roof === 'tile' ? KIND.TILE : KIND.FLAT;
    for (const s of [-1, 1]) {
      const a = Q(-L / 2 - g, s * (Wd / 2 + e), ye), b = Q(L / 2 + g, s * (Wd / 2 + e), ye), c = Q(L / 2 + g, 0, yr), dd = Q(-L / 2 - g, 0, yr);
      const hint = [0, 1, 0];
      S.quad(a, b, c, dd, col, hint);
      S.quad(a, b, c, dd, shade(col, 0.55), [0, -1, 0]); // the underside, seen from the lane
    }
    S.kind = o.colonial ? KIND.COLONIAL : KIND.FACADE;
    for (const s of [-1, 1]) {
      const a = Q(s * L / 2, -Wd / 2, yE), b = Q(s * L / 2, Wd / 2, yE), c = Q(s * L / 2, 0, yr);
      const hint = along ? [s * ux, 0, s * uz] : [-s * uz, 0, s * ux];
      S.tri(a, b, c, wall, hint);
    }
  }
  S.kind = KIND.PLAIN;
  // the front door: folding steel shopfront or a pair of wooden leaves
  const fv = -fs * (d / 2 + 0.04), dw = Math.min(f - 1.2, 1.5 + rand(i, 10) * 1.4);
  const du = (rand(i, 11) - 0.5) * Math.max(0, f - dw - 1.4);
  const dp = P(du, fv, 0);
  S.box(dp[0], dp[2], y0, y0 + 2.5, dw, 0.08, ang, rand(i, 12) < 0.5 ? C.steel : C.wood);
  // the tin lean-to porch out over the front yard, on two posts
  const pd = o.porch || 0;
  if (pd > 0.8) {
    const yw = y0 + Math.min(h - 0.2, 3.1 + rand(i, 13) * 0.5), yo = yw - 0.18 * pd - 0.2, pw = f - 0.3;
    const tcol = shade(pick(C.tin, i, 14), 0.9 + rand(i, 15) * 0.2);
    const a = P(-pw / 2, -fs * d / 2, yw), b = P(pw / 2, -fs * d / 2, yw), c = P(pw / 2, -fs * (d / 2 + pd), yo), dd = P(-pw / 2, -fs * (d / 2 + pd), yo);
    S.kind = KIND.FLAT;
    S.quad(a, b, c, dd, tcol, [0, 1, 0]);
    S.quad(a, b, c, dd, shade(tcol, 1.05), [0, -1, 0]);
    S.kind = KIND.PLAIN;
    for (const s of [-1, 1]) {
      const q = P(s * (pw / 2 - 0.15), -fs * (d / 2 + pd - 0.15), 0);
      S.box(q[0], q[2], y0, yo, 0.1, 0.1, ang, C.steel);
    }
  }
  // a balcony slab with its railing across the upper floor, on deeper-set two-storey houses
  if (roof === 'flat' && h > 6 && o.balcony) {
    const bd = o.balcony, yb = y0 + 3.3, c = P(0, -fs * (d / 2 + bd / 2), 0);
    S.box(c[0], c[2], yb, yb + 0.18, f - 0.4, bd, ang, C.pale, { bottom: true });
    const r = P(0, -fs * (d / 2 + bd - 0.05), 0);
    S.box(r[0], r[2], yb + 0.18, yb + 1.05, f - 0.4, 0.06, ang, o.rail || C.iron);
  }
  S.base = 0;
}

// A wall along the lane, from a to b (scene metres), with a gate gap of gw at t (0..1) between two piers.
export function laneWall(S, a, b, h, col, i, gate = 0.5, gw = 2.6) {
  const tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz);
  if (l < 0.5) return;
  const ang = Math.atan2(tz, tx), ux = tx / l, uz = tz / l;
  const at = (s) => [a[0] + ux * s, a[1] + uz * s];
  const seg = (s0, s1) => {
    if (s1 - s0 < 0.2) return;
    const [x, z] = at((s0 + s1) / 2), y = gY(x, z);
    S.box(x, z, y - 0.2, y + h, s1 - s0, 0.22, ang, col, { top: shade(col, 1.06) });
  };
  S.kind = KIND.MASONRY;
  const g0 = gate === null || l < gw + 1 ? l : Math.max(0.4, Math.min(l - gw - 0.4, l * gate - gw / 2));
  seg(0, g0);
  if (g0 < l) {
    seg(g0 + gw, l);
    for (const s of [g0, g0 + gw]) {
      const [x, z] = at(s), y = gY(x, z);
      S.box(x, z, y - 0.2, y + h + 0.45, 0.42, 0.42, ang, shade(col, 0.96), { top: shade(col, 1.1) });
      S.box(x, z, y + h + 0.45, y + h + 0.6, 0.56, 0.56, ang, shade(col, 1.1));
    }
    const [x, z] = at(g0 + gw / 2), y = gY(x, z);
    S.kind = KIND.PLAIN;
    S.box(x, z, y + 0.05, y + h + 0.1, gw - 0.5, 0.06, ang, C.iron);
  }
  S.kind = KIND.PLAIN;
}

export function hedge(S, a, b, h, i) {
  const tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz);
  if (l < 0.5) return;
  const x = (a[0] + b[0]) / 2, z = (a[1] + b[1]) / 2, y = gY(x, z);
  S.kind = KIND.PLAIN;
  S.box(x, z, y - 0.1, y + h, l, 0.8, Math.atan2(tz, tx), rand(i, 71) < 0.5 ? C.hedge : C.hedgeD, { top: shade(C.hedge, 1.12), taper: 0.94 });
}

// Scrub on a vacant plot: low lumps of weeds and shrubs.
export function scrub(S, x, z, i, s = 1) {
  const y = gY(x, z);
  S.kind = KIND.PLAIN;
  const r = (0.6 + rand(i, 81) * 0.9) * s;
  S.cyl(x, z, y - 0.1, y + (0.5 + rand(i, 82) * 0.9) * s, r, r * 0.45, 5, rand(i, 83) < 0.5 ? C.scrub : C.scrubD, { rot: rand(i, 84) * 6 });
}

// An areca palm (cau): a straight thin grey trunk, 12-15 m, and a small crown.
export function areca(S, x, z, i) {
  const y0 = gY(x, z), h = 12 + rand(i, 91) * 3, lean = (rand(i, 92) - 0.5) * 0.5;
  const top = [x + lean, y0 + h, z + lean * 0.6];
  S.kind = KIND.PLAIN;
  S.beam([x, y0, z], top, 0.2, 0.2, C.trunk);
  S.cyl(top[0], top[2], top[1] - 1.1, top[1] - 0.1, 0.17, 0.17, 5, hex('#6f8a3a')); // the green crownshaft
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + rand(i, 93), dx = Math.cos(a), dz = Math.sin(a), R = 2.3;
    const mid = [top[0] + dx * R * 0.5, top[1] + 0.5, top[2] + dz * R * 0.5], tip = [top[0] + dx * R, top[1] - 0.9, top[2] + dz * R];
    const sx = -dz * 0.3, sz = dx * 0.3, col = k % 2 ? C.frond : C.frondD;
    S.quad(top, [mid[0] + sx, mid[1], mid[2] + sz], tip, [mid[0] - sx, mid[1], mid[2] - sz], col, [0, 1, 0]);
    S.quad(top, [mid[0] - sx, mid[1], mid[2] - sz], tip, [mid[0] + sx, mid[1], mid[2] + sz], shade(col, 0.8), [0, -1, 0]);
  }
}

// ---- the village ----

// roads: [{ w (m), pts (dm, flat) }] on the island; grid: makeGrid(...). Returns the houses drawn ([cx, cz] each).
export function village(S, grid, roads) {
  const built = [];
  let i = 1000;
  // true when (x, z) lies within m of a carriageway's edge
  const inLane = (x, z, m) => roads.some(({ w, pts }) => {
    for (let p = 0; p + 3 < pts.length; p += 2) {
      const ax = pts[p] / 10, az = pts[p + 1] / 10, tx = pts[p + 2] / 10 - ax, tz = pts[p + 3] / 10 - az;
      const l2 = tx * tx + tz * tz || 1, t = Math.max(0, Math.min(1, ((x - ax) * tx + (z - az) * tz) / l2));
      if (Math.hypot(ax + tx * t - x, az + tz * t - z) < w / 2 + m) return true;
    }
    return false;
  });
  // a house type for plot i: one-storey tin 40%, one-storey tile 22%, two-storey flat 32%, three-storey 6%
  const type = (k) => {
    const r = rand(k, 20);
    if (r < 0.47) return { roof: 'tin', h: 3.3 + rand(k, 21) * 0.6 };
    if (r < 0.62) return { roof: 'tile', h: 3.2 + rand(k, 21) * 0.5 };
    if (r < 0.94) return { roof: 'flat', h: 6.6 + rand(k, 21) * 0.7 };
    return { roof: 'flat', h: 9.8 + rand(k, 21) * 0.6 };
  };
  // ok: the cells a porch or balcony in front may reach over (the frontage's own margin, or only open ground)
  const place = (cx, cz, f, d, ang, fs, setback, k, ok) => {
    const t = type(k);
    let porch = setback > 1.6 && rand(k, 22) < 0.65 ? Math.min(setback - 0.35, 1.8 + rand(k, 23) * 1.2) : 0;
    let balcony = t.roof === 'flat' && setback > 1.4 && !porch ? Math.min(setback - 0.3, 1.1) : 0;
    const out = Math.max(porch, balcony);
    if (out > 0) {
      const vx = Math.sin(ang) * fs, vz = -Math.cos(ang) * fs; // local -z * fs: toward the front
      const px = cx + vx * (d / 2 + out / 2 + 0.1), pz = cz + vz * (d / 2 + out / 2 + 0.1);
      if (grid.free(px, pz, f - 0.3, out, ang, 0.1, ok)) grid.mark(px, pz, f - 0.3, out, ang, 0);
      else porch = balcony = 0;
    }
    house(S, cx, cz, f, d, ang, fs, { ...t, i: k, porch, balcony, ridge: rand(k, 24) < 0.62 ? 'along' : 'across' });
    built.push([cx, cz, f, d, ang]);
  };
  // 1. the frontage of every lane, both sides: plots side by side, 4.5-7.5 m wide, 8-14 m deep, then a second row
  for (const { w, pts } of roads) {
    for (let p = 0; p + 3 < pts.length; p += 2) {
      const ax = pts[p] / 10, az = pts[p + 1] / 10, bx = pts[p + 2] / 10, bz = pts[p + 3] / 10;
      const L = Math.hypot(bx - ax, bz - az);
      if (L < 6) continue;
      const tx = (bx - ax) / L, tz = (bz - az) / L, nx = -tz, nz = tx, ang = Math.atan2(tz, tx);
      for (const s of [-1, 1]) {
        let u = 1.5;
        while (u < L - 4) {
          i++;
          const f = 4.5 + rand(i, 1) * 3, yard = rand(i, 2) < 0.45, setback = yard ? 2.4 + rand(i, 3) * 2.6 : 0.5 + rand(i, 3) * 0.5;
          let placed = false;
          for (const d of [8 + rand(i, 4) * 6, 7, 5.5]) {
            const off = w / 2 + 0.4 + setback + d / 2;
            const cx = ax + tx * (u + f / 2) + nx * s * off, cz = az + tz * (u + f / 2) + nz * s * off;
            // the wood along the banks: a house there only now and then
            const inWood = grid.at(cx, cz) === WOOD;
            if (inWood && rand(i, 5) > 0.18) break;
            if (!grid.free(cx, cz, f, d, ang, 0.3, [FREE, WOOD])) continue;
            grid.mark(cx, cz, f, d, ang, 0.35);
            // fs: the lane lies on the plot's -n*s side, i.e. local -z when s = 1
            place(cx, cz, f, d, ang, s, setback, i, [FREE, WOOD, BUILT, ROAD]);
            // the lane edge: wall with a gate, or a hedge, in front of a yard
            const e0 = [ax + tx * u + nx * s * (w / 2 + 0.75), az + tz * u + nz * s * (w / 2 + 0.75)];
            const e1 = [ax + tx * (u + f + 0.6) + nx * s * (w / 2 + 0.75), az + tz * (u + f + 0.6) + nz * s * (w / 2 + 0.75)];
            if (yard && setback > 2.2) {
              const ex = (e0[0] + e1[0]) / 2, ez = (e0[1] + e1[1]) / 2;
              const clear = [0, 0.25, 0.5, 0.75, 1].every((t) => !inLane(e0[0] + (e1[0] - e0[0]) * t, e0[1] + (e1[1] - e0[1]) * t, 0.45));
              if (clear && grid.free(ex, ez, f + 0.6, 0.2, ang, 0, [FREE, WOOD, BUILT, ROAD])) {
                if (rand(i, 6) < 0.68) laneWall(S, e0, e1, 1.3 + rand(i, 7) * 0.5, pick(C.fence, i, 8), i, 0.3 + rand(i, 9) * 0.4);
                else hedge(S, e0, e1, 1.4 + rand(i, 7) * 0.8, i);
                grid.mark(ex, ez, f + 0.6, 0.3, ang, 0);
              }
            }
            // the second row behind, across a small court
            const court = 1.5 + rand(i, 10) * 3, f2 = f * (0.8 + rand(i, 11) * 0.4), d2 = 7 + rand(i, 12) * 5;
            const off2 = off + d / 2 + court + d2 / 2;
            const c2x = ax + tx * (u + f / 2) + nx * s * off2, c2z = az + tz * (u + f / 2) + nz * s * off2;
            if (rand(i, 13) < 0.8 && grid.at(c2x, c2z) === FREE && grid.free(c2x, c2z, f2, d2, ang, 0.35)) {
              grid.mark(c2x, c2z, f2, d2, ang, 0.4);
              place(c2x, c2z, f2, d2, ang, s, court, i + 50000, [FREE, WOOD]);
            }
            u += f + 0.3 + rand(i, 14) * 1.4;
            placed = true;
            break;
          }
          if (!placed) u += 1.5;
        }
      }
    }
  }
  // 2. the plots between, reached by footpaths: houses aligned with the nearest lane
  const segs = [];
  for (const { pts } of roads) for (let p = 0; p + 3 < pts.length; p += 2) segs.push([pts[p] / 10, pts[p + 1] / 10, pts[p + 2] / 10, pts[p + 3] / 10]);
  const lineAng = (x, z) => {
    let best = Infinity, ang = 0;
    for (const [ax, az, bx, bz] of segs) {
      const tx = bx - ax, tz = bz - az, l2 = tx * tx + tz * tz || 1, t = Math.max(0, Math.min(1, ((x - ax) * tx + (z - az) * tz) / l2));
      const dd = Math.hypot(ax + tx * t - x, az + tz * t - z);
      if (dd < best) { best = dd; ang = Math.atan2(tz, tx); }
    }
    return ang;
  };
  for (let n = 0; n < 26000; n++) {
    const x = 355 + rand(n, 41) * 225, z = -1900 + rand(n, 42) * 1260;
    if (grid.at(x, z) !== FREE) continue;
    i++;
    const ang = lineAng(x, z) + (rand(n, 43) < 0.15 ? Math.PI / 2 : 0), f = 5 + rand(n, 44) * 3.5, d = 7 + rand(n, 45) * 5;
    if (!grid.free(x, z, f, d, ang, 0.6)) continue;
    grid.mark(x, z, f, d, ang, 0.7);
    place(x, z, f, d, ang, rand(n, 46) < 0.5 ? 1 : -1, 1.2 + rand(n, 47) * 2, i + 100000, [FREE, WOOD]);
  }
  return built;
}

// ---- the set pieces seen from the street (car panoramas, 2024-25; positions from the panoramas' depth and the
// satellite, sizes estimated) ----
export function setPieces(S, grid) {
  // 1. on Ưng Bình tờ 19 (the east lane, x ~547), west side, just north of the lane to the west: the yellow two-storey
  // house facing east, arched fanlight over a dark wooden door, white pilasters and cornices, two round porch columns,
  // a tin lean-to porch out to the lane, gate piers with yellow caps and an iron gate in a low wall
  {
    const x0 = 529, x1 = 538, z0 = -1366.5, z1 = -1360.5, y = gY(533.5, -1363.5), h = 7.0;
    grid.box(x0 - 0.5, z0 - 0.5, 543, z1 + 0.3, BUILT);
    house(S, (x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, 0, 0, { h, roof: 'flat', i: 7, wall: C.yellow, colonial: true, parapet: 0.9 });
    S.kind = KIND.PLAIN;
    // pilasters, cornices and the doorway on the east face (x = x1)
    for (const z of [z0 + 0.2, z0 + 2.0, z1 - 2.0, z1 - 0.2]) S.box(x1 + 0.08, z, y, y + h, 0.2, 0.4, 0, C.white);
    for (const yy of [y + 3.3, y + h - 0.1]) S.box(x1 + 0.12, (z0 + z1) / 2, yy, yy + 0.28, 0.32, z1 - z0 + 0.3, 0, C.white);
    const zc = (z0 + z1) / 2;
    S.box(x1 + 0.05, zc, y, y + 2.45, 0.1, 1.7, 0, C.wood);
    // the fanlight: a half disc over the door, white frame, dark glass
    const fan = (r, col, dx) => {
      for (let k = 0; k < 6; k++) {
        const a0 = (k / 6) * Math.PI, a1 = ((k + 1) / 6) * Math.PI;
        S.tri([x1 + dx, y + 2.45, zc], [x1 + dx, y + 2.45 + Math.sin(a0) * r, zc + Math.cos(a0) * r], [x1 + dx, y + 2.45 + Math.sin(a1) * r, zc + Math.cos(a1) * r], col, [1, 0, 0]);
      }
    };
    fan(1.0, C.white, 0.06);
    fan(0.82, C.glass, 0.08);
    // two round columns carrying the balcony over the door
    for (const z of [zc - 1.75, zc + 1.75]) S.cyl(x1 + 1.3, z, y, y + 3.3, 0.17, 0.17, 8, C.yellow);
    S.box(x1 + 0.75, zc, y + 3.3, y + 3.75, 1.5, 4.2, 0, C.white, { bottom: true });
    // the tin lean-to from the upper wall out to the gate line, on thin steel posts
    S.kind = KIND.FLAT;
    const tin = hex('#8f969b');
    const ya = y + 4.6, yb = y + 3.4;
    S.quad([x1 + 1.5, ya, z0 - 0.1], [x1 + 1.5, ya, z1 + 0.1], [542.3, yb, z1 + 0.1], [542.3, yb, z0 - 0.1], tin, [0, 1, 0]);
    S.quad([x1 + 1.5, ya, z0 - 0.1], [x1 + 1.5, ya, z1 + 0.1], [542.3, yb, z1 + 0.1], [542.3, yb, z0 - 0.1], shade(tin, 1.15), [0, 1, 0]);
    S.kind = KIND.PLAIN;
    for (const z of [z0 + 0.1, z1 - 0.1]) S.box(542.1, z, y, yb, 0.09, 0.09, 0, C.steel);
    // gate piers with yellow caps, iron gate between, a low wall on either side
    const gx = 541.6, gz = -1363.1, pier = hex('#a9aea4');
    for (const z of [gz - 1.75, gz + 1.75]) {
      S.box(gx, z, y - 0.2, y + 1.7, 0.8, 0.8, 0, pier);
      S.box(gx, z, y + 1.7, y + 1.95, 1.0, 1.0, 0, C.yellow, { top: C.cap, taper: 0.8 });
    }
    S.box(gx, gz, y + 0.05, y + 1.6, 0.06, 2.7, 0, C.iron);
    S.kind = KIND.MASONRY;
    S.box(gx, (z0 - 1 + gz - 2.15) / 2, y - 0.2, y + 1.2, 0.22, gz - 2.15 - z0 + 1, 0, pier, { top: C.cap });
    S.box(gx, (gz + 2.15 + z1 + 2.5) / 2, y - 0.2, y + 1.2, 0.22, z1 + 2.5 - gz - 2.15, 0, pier, { top: C.cap });
    S.kind = KIND.PLAIN;
    // the tin canopy over the garden to the north, on posts
    const cy = y + 3.0;
    grid.box(530, -1375, 542, -1368, BUILT);
    S.kind = KIND.FLAT;
    S.quad([530, cy + 0.4, -1374.5], [542, cy, -1374.5], [542, cy, -1368], [530, cy + 0.4, -1368], hex('#7d878e'), [0, 1, 0]);
    S.quad([530, cy + 0.4, -1374.5], [542, cy, -1374.5], [542, cy, -1368], [530, cy + 0.4, -1368], hex('#9aa2a8'), [0, -1, 0]);
    S.kind = KIND.PLAIN;
    for (const [x, z] of [[530.3, -1374.2], [541.7, -1374.2], [530.3, -1368.3], [541.7, -1368.3]]) S.box(x, z, y, cy + 0.3, 0.1, 0.1, 0, C.steel);
    // the tile-roofed neighbour across the little lane to the south
    grid.box(530.5, -1353, 539.5, -1345, BUILT);
    house(S, 535, -1349, 8, 7, Math.PI / 2, 1, { h: 3.4, roof: 'tile', ridge: 'across', i: 8, wall: hex('#e9e2cf') });
  }
  // 2. further south on the same lane, east side: the tin-roofed cơm hến stall on posts with its grey corrugated back
  // wall, tables and plastic stools; the turquoise wall along the lane beyond it with sign boards; on the west side
  // clipped hedges, a small tile-roofed shed, and the white two-storey villa with arched windows, a balcony and a
  // cornice, areca palms in front
  {
    const laneX = (z) => 543 - (11 * (z + 1301)) / 92; // the lane's centre line (OSM 39418352)
    const y = gY(549, -1297);
    grid.box(545.4, -1303.5, 553.5, -1291.5, BUILT);
    S.kind = KIND.FLAT;
    const tin = hex('#9aa0a4');
    S.quad([553, y + 3.3, -1303], [553, y + 3.3, -1292], [545.6, y + 2.7, -1292], [545.6, y + 2.7, -1303], tin, [0, 1, 0]);
    S.quad([553, y + 3.3, -1303], [553, y + 3.3, -1292], [545.6, y + 2.7, -1292], [545.6, y + 2.7, -1303], shade(tin, 1.1), [0, -1, 0]);
    S.kind = KIND.PLAIN;
    S.box(553.05, -1297.5, y, y + 3.3, 0.1, 11, 0, hex('#8a9095'));
    for (const z of [-1302.8, -1297.5, -1292.2]) S.box(545.8, z, y, y + 2.7, 0.1, 0.1, 0, C.steel);
    for (let k = 0; k < 4; k++) {
      const tz = -1301.5 + k * 2.8, tx = 549.5 + (k % 2) * 1.2;
      S.box(tx, tz, y + 0.7, y + 0.75, 1.2, 0.7, 0, C.table);
      S.box(tx, tz, y, y + 0.7, 0.08, 0.08, 0, C.steel);
      for (const [dx, dz] of [[-0.8, 0], [0.8, 0], [0, -0.6]]) S.box(tx + dx, tz + dz, y, y + 0.42, 0.32, 0.32, 0, k % 2 ? C.stoolR : C.stoolB);
    }
    // the turquoise wall along the lane's east edge, sign boards on it
    const zs = [-1293, -1281.5, -1270];
    for (let k = 0; k + 1 < zs.length; k++) {
      const a = [laneX(zs[k]) + 2.35, zs[k]], b = [laneX(zs[k + 1]) + 2.35, zs[k + 1]];
      laneWall(S, a, b, 1.6, C.turq, 9 + k, k === 0 ? 0.7 : null);
      grid.box(Math.min(a[0], b[0]) - 0.3, a[1], Math.max(a[0], b[0]) + 0.3, b[1], BUILT);
    }
    S.kind = KIND.PLAIN;
    for (const [z, col] of [[-1290.5, C.signR], [-1286, C.signY], [-1278, C.signB]]) S.box(laneX(z) + 2.2, z, y + 0.5, y + 1.4, 0.06, 1.4, Math.atan2(92, -11) - Math.PI / 2, col);
    // west side: clipped hedges along the lane from about z -1295 southward
    for (let z = -1295; z < -1272; z += 5.5) {
      const a = [laneX(z) - 2.35, z], b = [laneX(z + 5) - 2.35, z + 5];
      hedge(S, a, b, 1.6 + rand(z, 3) * 0.5, z | 0);
      grid.box(Math.min(a[0], b[0]) - 0.4, a[1], Math.max(a[0], b[0]) + 0.4, b[1], BUILT);
    }
    // the tile-roofed shed and the villa
    grid.box(528, -1290.5, 534, -1285.5, BUILT);
    house(S, 531, -1288, 5, 4, 0, 1, { h: 2.6, roof: 'tile', ridge: 'along', i: 11, wall: hex('#d9d0bc') });
    grid.box(514.5, -1290.5, 528, -1279.5, BUILT);
    house(S, 521, -1285, 10, 12, Math.PI / 2, 1, { h: 7.2, roof: 'flat', i: 12, wall: hex('#eeebe3'), colonial: true, parapet: 0.7, balcony: 1.2, rail: C.white });
    const vy = gY(521, -1285);
    S.kind = KIND.PLAIN;
    for (const yy of [vy + 3.2, vy + 7.0]) S.box(527.1, -1285, yy, yy + 0.3, 0.3, 10.3, 0, C.white);
    for (const [x, z] of [[528.5, -1283.5], [530.5, -1281.5], [532.6, -1283], [529.3, -1279.8], [533.4, -1280.5]]) areca(S, x, z, Math.round(x * 7 + z));
  }
  // 3. the west lane (OSM 39413998, x ~372) by the junction with Ưng Bình's west end: a vacant overgrown plot behind a
  // chain-link fence on concrete posts, the utility pole at its corner and a white gate pier with a black gate
  {
    const fx = 376.2;
    grid.box(fx - 0.6, -1378, 394, -1357, KEEP);
    S.kind = KIND.PLAIN;
    for (let z = -1377.5; z <= -1357.5; z += 2.5) {
      const y = gY(fx, z);
      S.box(fx, z, y - 0.2, y + 1.9, 0.14, 0.14, 0, hex('#b5b1a8'));
    }
    for (const yy of [0.25, 0.9, 1.5, 1.85]) {
      const y = gY(fx, -1367) + yy;
      S.beam([fx, y, -1377.5], [fx, y, -1357.5], 0.035, 0.035, hex('#6d7270'));
    }
    // the mesh itself: a dark grey band, so it reads as a fence rather than open ground
    S.box(fx + 0.02, -1367.5, gY(fx, -1367) + 0.2, gY(fx, -1367) + 1.85, 0.015, 20, 0, hex('#5d625f'));
    for (let k = 0; k < 40; k++) scrub(S, fx + 1.5 + rand(k, 1) * 16, -1376.5 + rand(k, 2) * 18.5, k + 300, 1.3);
    // the pole (concrete, 8.5 m) with a cross arm and wires running along the lane
    const py = gY(374.1, -1356.4);
    S.cyl(374.1, -1356.4, py - 0.3, py + 8.5, 0.16, 0.12, 6, C.pole);
    S.box(374.1, -1356.4, py + 7.6, py + 7.75, 0.12, 1.8, 0, C.pole);
    for (const dz of [-0.75, 0.75]) S.beam([374.1, py + 7.75, -1356.4 + dz], [374.4, py + 7.2, -1356.4 + dz - 30], 0.03, 0.03, C.wire);
    // the white gate pier and the black gate to its south
    const gy = gY(374.8, -1355);
    S.box(374.8, -1355, gy - 0.2, gy + 2.2, 0.5, 0.5, 0, C.white, { top: C.white });
    S.box(374.8, -1355, gy + 2.2, gy + 2.35, 0.65, 0.65, 0, C.white);
    S.box(374.85, -1352.8, gy + 0.05, gy + 1.8, 0.06, 4, 0, C.iron);
    grid.box(374.3, -1356.5, 378, -1350.5, BUILT);
  }
}

// Vacant plots seen on the satellite: overgrown, scrub and small trees, no houses.
export const VACANT = [[473, -1345, 510, -1291]];
export function vacant(S, grid) {
  for (const [x0, z0, x1, z1] of VACANT) {
    grid.box(x0, z0, x1, z1, KEEP);
    const n = Math.round(((x1 - x0) * (z1 - z0)) / 14);
    for (let k = 0; k < n; k++) {
      const x = x0 + rand(k, 5) * (x1 - x0), z = z0 + rand(k, 6) * (z1 - z0);
      if (grid.at(x, z) === KEEP) scrub(S, x, z, k + 500, 1.2);
    }
  }
}
