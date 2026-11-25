// The bronze objects of the Imperial City's courts that no place model draws itself: the nine holy cannons (Cửu vị
// thần công, cast 1803-04) in their two houses inside Cửa Quảng Đức and Cửa Thể Nhơn, and the great cauldrons (vạc
// đồng, cast 1659-1684 under the Nguyễn lords) of the Cần Chánh court and before the ruin of Càn Thành. Objects that
// belong to one place's court and whose model is not shared work (Thái Hòa, Thế Miếu, Hưng Miếu, Kiến Trung, the
// Cửu Đỉnh) are drawn by that place's file with the same builders (src/landmarks/props.js). Sources and estimates:
// docs/places/courtyard-objects.md.
//
// The Cần Chánh and Càn Thành courts are modelled by places/canchanh.js and places/dainoi.js, which change on their
// own; so each object here finds its floor in the static buffer at build time (the highest upward face under it,
// below the eaves) and is skipped, with a warning, if anything of a model stands where it would go.
import { KIND, hex, shade, unflat, obb } from '../geo/buf.ts';
import { LAND_Y, PAL } from '../config.ts';
import { rise } from '../geo/terrain.ts';
import { vac, cannon, PROP_COL } from './props.ts';

const gY = (x, z) => LAND_Y + rise(x, z);

// the Cần Chánh / Thái Hòa frame (places/canchanh.js): u toward Tả Vu (the king's left), v toward Ngọ Môn
const CC = [-1180.85, -64.2], FV = [0.5978, 0.8016], FU = [0.8016, -0.5978];
const CCA = Math.atan2(FU[1], FU[0]);
const ccP = (u, v) => [CC[0] + FU[0] * u + FV[0] * v, CC[1] + FU[1] * u + FV[1] * v];

// The vạc: [name, u, v] in the Cần Chánh frame, with fallbacks tried in order if the first spot is taken.
// Before Tả Vu (1660) and Hữu Vu (1662), in the court behind Đại Cung Môn; either side of the front of Càn Thành
// (1684, and its pair), the palace now a ruin.
const VAC = [
  ['vạc before Tả Vu', [[27, 31], [25, 28], [24, 31], [22, 31], [20, 31]]],
  ['vạc before Hữu Vu', [[-27, 31], [-25, 28], [-24, 31], [-22, 31], [-20, 31]]],
  ['vạc left of Càn Thành', [[20, -55], [22, -53], [18, -52], [16, -55]]],
  ['vạc right of Càn Thành', [[-20, -55], [-22, -53], [-18, -52], [-16, -55]]],
];
const VAC_D = 2.0; // rim diameter, m (the Tả Vu vạc: mouth 2.2 m)

// The two cannon houses, found in the mapped buildings by their middle; the Ngũ hành five inside Quảng Đức, the Tứ
// thời four inside Thể Nhơn. Their mapped outlines are taken out of data.bld (the plain-box city building) and the
// open houses drawn here instead.
const HOUSES = [
  { name: 'Quảng Đức cannon house', c: [-1118.8, 329.3], n: 5 },
  { name: 'Thể Nhơn cannon house', c: [-813.4, 108.1], n: 4 },
];
const ROOF = hex('#7a5a46'), COL = PAL.lacquer, PLINTH = hex('#a69e8e'), FLOOR = hex('#b2a996');

// the floor under (x, z) within r of it and the highest face of a model in the column above it: one pass over the
// buffer for all the spots asked about
function survey(S, spots) {
  const P = S.pos, out = spots.map(() => ({ floor: -Infinity, top: -Infinity }));
  for (let i = 0; i < S.n; i += 3) {
    const k = i * 3;
    const ax = P[k], ay = P[k + 1], az = P[k + 2], bx = P[k + 3], by = P[k + 4], bz = P[k + 5], cx = P[k + 6], cy = P[k + 7], cz = P[k + 8];
    const x0 = Math.min(ax, bx, cx), x1 = Math.max(ax, bx, cx), z0 = Math.min(az, bz, cz), z1 = Math.max(az, bz, cz);
    const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az); // twice the footprint area, > 0 looking up
    const nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay), nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const level = ny > 1e-6 && ny > 0.95 * Math.hypot(nx, ny, nz); // a floor, near level, looking up
    spots.forEach((s, j) => {
      if (x1 < s.x - s.r || x0 > s.x + s.r || z1 < s.z - s.r || z0 > s.z + s.r) return;
      if (!overlaps(s, ax, az, bx, bz, cx, cz)) return;
      const o = out[j], g = gY(s.x, s.z);
      if (level) {
        // the floor: the face holding the spot's middle, its height there (the eaves are far higher)
        const w = bary(s.x, s.z, ax, az, bx, bz, cx, cz);
        if (w) { const y = w[0] * ay + w[1] * by + w[2] * cy; if (y < g + 3) o.floor = Math.max(o.floor, y); }
        (o.faces = o.faces || []).push([Math.min(ay, by, cy), Math.max(ay, by, cy), true]);
      } else (o.faces = o.faces || []).push([Math.min(ay, by, cy), Math.max(ay, by, cy), false]);
    });
  }
  return out.map((o, j) => {
    const g = gY(spots[j].x, spots[j].z), floor = o.floor > -Infinity ? o.floor : g;
    // anything of a model between the floor and the object's top
    // anything of a model between just above the floor and the object's top (a level face counts only clear of the
    // floor: a kerb or a step, not the paving's own joints)
    const block = (o.faces || []).filter(([lo, hi, lv]) => hi > floor + (lv ? 0.08 : 0.2) && lo < floor + spots[j].h);
    return { floor, hit: block.length > 0, block };
  });
}
// does the triangle's footprint reach the spot's square: a corner of it inside the square, or one of nine points of
// the square inside it (enough for the faces of a court, which are either small or large)
function overlaps(s, ax, az, bx, bz, cx, cz) {
  for (const [x, z] of [[ax, az], [bx, bz], [cx, cz]]) if (Math.abs(x - s.x) <= s.r && Math.abs(z - s.z) <= s.r) return true;
  for (const du of [-1, 0, 1]) for (const dv of [-1, 0, 1]) if (bary(s.x + du * s.r, s.z + dv * s.r, ax, az, bx, bz, cx, cz)) return true;
  return false;
}
function bary(px, pz, ax, az, bx, bz, cx, cz) {
  const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
  if (Math.abs(d) < 1e-9) return null;
  const l1 = ((bz - cz) * (px - cx) + (cx - bx) * (pz - cz)) / d, l2 = ((cz - az) * (px - cx) + (ax - cx) * (pz - cz)) / d, l3 = 1 - l1 - l2;
  return l1 >= -1e-6 && l2 >= -1e-6 && l3 >= -1e-6 ? [l1, l2, l3] : null;
}

function cauldrons(S, placed) {
  const tries = [];
  for (const [name, list] of VAC) for (const [u, v] of list) { const p = ccP(u, v); tries.push({ name, x: p[0], z: p[1], r: VAC_D * 0.62, h: 1.7 }); }
  const res = survey(S, tries), done = new Set();
  tries.forEach((t, i) => {
    if (done.has(t.name) || res[i].hit) return;
    done.add(t.name);
    vac(S, t.x, res[i].floor, t.z, CCA, { d: VAC_D });
    placed.push([t.name, t.x, res[i].floor, t.z]);
  });
  for (const [name] of VAC) if (!done.has(name)) console.warn(`courtyard: no clear floor for the ${name}; not drawn`);
}

// an open house on a low plinth: columns round, a tiled hip roof; the cannons side by side across it, the muzzles
// out of the long side toward the middle of the Citadel's axis (the other house)
function cannonHouse(S, data, h, other, placed) {
  let idx = -1;
  (data.bld || []).forEach((b, i) => {
    const r = unflat(b[0]);
    const c = r.reduce((a, q) => [a[0] + q[0] / r.length, a[1] + q[1] / r.length], [0, 0]);
    if (Math.hypot(c[0] - h.c[0], c[1] - h.c[1]) < 4) idx = i;
  });
  if (idx < 0) { console.warn(`courtyard: ${h.name} not among the mapped buildings; not drawn`); return; }
  const ring = unflat(data.bld[idx][0]);
  data.bld.splice(idx, 1); // drawn here: the city leaves it out (populate runs after this step)
  const o = obb(ring);
  let a = o.a, W = o.w, D = o.d;
  if (D > W) { a += Math.PI / 2; [W, D] = [D, W]; }
  const ux = Math.cos(a), uz = Math.sin(a), vx = -uz, vz = ux;
  const P = (u, v) => [o.c[0] + ux * u + vx * v, o.c[1] + uz * u + vz * v];
  // the muzzles face the side nearer the other house
  const face = (other[0] - o.c[0]) * vx + (other[1] - o.c[1]) * vz > 0 ? 1 : -1;
  let g = Infinity;
  for (const q of ring) g = Math.min(g, gY(q[0], q[1]));
  const fl = g + 0.45, eave = g + 3.2;
  S.base = g - LAND_Y;
  S.kind = KIND.MASONRY;
  S.box(o.c[0], o.c[1], g - 0.3, fl, W + 0.6, D + 0.6, a, PLINTH, { top: FLOOR, topKind: KIND.ROAD });
  // steps down the open side
  { const q = P(0, face * (D / 2 + 0.55)); S.box(q[0], q[1], g - 0.2, g + 0.22, 3.0, 0.5, a, PLINTH, { topKind: KIND.ROAD }); }
  // columns on the outline, about 3.5 m apart along it
  S.kind = KIND.TIMBER;
  const nu = Math.max(2, Math.round(W / 3.6)), cu = W / 2 - 0.3, cv = D / 2 - 0.3;
  for (let i = 0; i <= nu; i++) for (const sv of [-1, 1]) { const q = P(-cu + (2 * cu * i) / nu, sv * cv); S.cyl(q[0], q[1], fl, eave, 0.16, 0.15, 6, COL, { cap: false }); }
  for (const su of [-1, 1]) { const q = P(su * cu, 0); S.cyl(q[0], q[1], fl, eave, 0.16, 0.15, 6, COL, { cap: false }); }
  // a low wall along the back, the side away from the muzzles
  S.kind = KIND.MASONRY;
  { const q = P(0, -face * cv); S.box(q[0], q[1], fl, fl + 0.9, 2 * cu, 0.25, a, shade(PLINTH, 1.05)); }
  // the eave plates and the roof
  S.kind = KIND.TIMBER;
  for (const sv of [-1, 1]) { const p0 = P(-cu, sv * cv), p1 = P(cu, sv * cv); S.beam([p0[0], eave - 0.12, p0[1]], [p1[0], eave - 0.12, p1[1]], 0.22, 0.26, shade(COL, 0.7)); }
  S.hip(o.c[0], o.c[1], W, D, a, eave, 2.0, ROOF, { flare: 0.35, over: 0.9, hips: true, fascia: 0.18, fasciaCol: shade(COL, 0.6), ridgeCol: shade(ROOF, 1.2), segs: 3 });
  // the cannons, side by side along the house; each about 5.1 m long with its carriage
  const sp = (2 * cu) / h.n, len = Math.min(5.1, D - 0.4);
  for (let i = 0; i < h.n; i++) {
    const q = P(-cu + sp * (i + 0.5), face * 0.15);
    cannon(S, q[0], fl, q[1], a + (face > 0 ? Math.PI / 2 : -Math.PI / 2), { len, col: PROP_COL.bronze });
    placed.push([`${h.name} cannon ${i + 1}`, q[0], fl, q[1]]);
  }
  S.kind = KIND.PLAIN;
}

export function buildCourtyard(data, S) {
  const placed = [], n0 = S.n;
  for (const h of HOUSES) cannonHouse(S, data, h, HOUSES.find((o) => o !== h).c, placed);
  cauldrons(S, placed);
  (S.paved = S.paved || []).push([n0, S.n]); // keep trees and houses off them (src/geo/city.js coverOf)
  S.courtyard = placed; // for the checks and the report
  return placed;
}
