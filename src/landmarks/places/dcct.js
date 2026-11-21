import * as THREE from 'three';
import { KIND, Buf, hex, shade, inRing } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { glowPoints, lightMaterial } from '../../geo/materials.js';
import { fence, leaves, roadsNear, buildingsNear, offStreets, FENCE } from '../enclosure.js';

// Nhà thờ Dòng Chúa Cứu Thế Huế (Đức Mẹ Hằng Cứu Giúp; Nguyễn Mỹ Lộc, 1959-62). See docs/places/dcct.md.
//
// The plan is the OSM outline (way 1172894102) read in a frame along its axis: a = metres from the front wall back
// toward the sanctuary (west), b = metres across (+b north). The church faces east, toward the apex of its
// triangular grounds where Nguyễn Huệ and Nguyễn Khuyến meet (vi.wikipedia). Outline: front 27.4 m wide (a 0), the
// nave to a 31, a wider crossing a 31-58 stepping out to b ±19 and ±25, then the choir narrowing to the
// polygonal sanctuary at a 80.6. Sources: plan 70 m deep and 15-37 m wide, side corridors 26 x 4.2 m, sanctuary
// 8.5 m deep, roof 32 m high, a central three-tier bell tower with a spire to 53 m (four electric bells), reinforced
// concrete and blue-grey stone (đá xanh), fired-clay tiles, tiered roofs drawn from Huế's đình and pagodas, a wide open
// porch, a great arched door with a round window, a clock and the cross on the axis, a statue of Christ in front and
// the grotto of Our Lady at the rear left.

export const id = 'dcct';

const DEG = Math.PI / 180;
const ANG = 176.46 * DEG; // axis, front -> sanctuary
const F = [Math.cos(ANG), Math.sin(ANG)], P = [-F[1], F[0]];
const O = [733.94, 1205.86]; // a = 0, b = 0: the middle of the front wall
const W = (a, b) => [O[0] + F[0] * a + P[0] * b, O[1] + F[1] * a + P[1] * b];
const gY = (x, z) => LAND_Y + rise(x, z);

// the OSM outline in the frame (a, b)
const PLAN = [[0, -13.7], [31.9, -13.6], [32, -19.4], [37, -19.3], [37.1, -25.1], [54.1, -24.7], [54, -19.6], [58, -19.5], [58, -14.5],
  [63.3, -13.3], [68.5, -10.3], [71.4, -6.5], [77, -6.2], [80.6, -1.6], [80.4, 4.3], [76.5, 8.1], [70.6, 8.2], [67, 11.6], [62.3, 14.2],
  [57.1, 14.8], [57.1, 19.8], [53.3, 19.9], [53.3, 25], [36.3, 25], [36.3, 19.1], [31.3, 19.1], [31.2, 13.6], [0, 13.7]];
// the grounds: the triangle between Nguyễn Huệ (north), Nguyễn Khuyến (south-east) and the service lane on the west,
// set in from the carriageways (model metres; the streets from OSM ways 39419487 and 35926988)
const PRECINCT = [[590.7, 1149], [659.9, 1161.4], [742.6, 1176.3], [785.7, 1184.1], [822, 1189.6], [817.7, 1195.6], [730.4, 1236.2],
  [612.5, 1290.9], [586, 1302], [588, 1250]];
// gates: the main gate at the apex facing the crossroads, a side gate on Nguyễn Khuyến (estimated)
const GATE_MAIN = [819.8, 1192.6, 3.4], GATE_SIDE = [757, 1223.9, 2.6], GATE_NH = [700, 1168.6, 2.6];

const st = hex('#8f9ca3'), stL = hex('#aeb7ba'), stD = hex('#6f7b82'), trim = hex('#dedbd2'), tile = hex('#9c4d3a'), tileD = hex('#7c3d2f');
const slate = hex('#56626b'), glass = hex('#34506f'), glassW = hex('#c7a24c'), door = hex('#3a2c24'), white = hex('#efeae0'), pave = hex('#c8c0ae');
const lawn = hex('#879a62'), cream = hex('#f3e8d2');

export function build({ data, S, group }) {
  let gmax = -1e9;
  for (const [a, b] of PLAN) { const q = W(a, b); gmax = Math.max(gmax, gY(q[0], q[1])); }
  const y = gmax + 0.6; // church floor
  const V = (a, b, h) => { const q = W(a, b); return [q[0], h, q[1]]; };
  const box = (a, b, y0, y1, la, lb, col, o = {}) => { const q = W(a, b); S.box(q[0], q[1], y0, y1, la, lb, ANG + (o.rot || 0), col, o); };
  const hipAB = (a, b, la, lb, y0, h, col, o) => { const q = W(a, b); if (la >= lb) S.hip(q[0], q[1], la, lb, ANG, y0, h, col, o); else S.hip(q[0], q[1], lb, la, ANG + Math.PI / 2, y0, h, col, o); };
  const oct = (a, b, y0, y1, r0, r1, col, kind = KIND.MASONRY) => { const q = W(a, b); S.kind = kind; S.cyl(q[0], q[1], y0, y1, r0, r1, 8, col, { cap: false, rot: ANG + Math.PI / 8 }); };
  // a disc facing the front (-F), e.g. the clock and the round window
  const disc = (a, b, h, r, col, n = 12) => { for (let i = 0; i < n; i++) { const t0 = (i / n) * 2 * Math.PI, t1 = ((i + 1) / n) * 2 * Math.PI; S.tri(V(a, b, h), V(a, b + Math.cos(t0) * r, h + Math.sin(t0) * r), V(a, b + Math.cos(t1) * r, h + Math.sin(t1) * r), col, [-F[0], 0, -F[1]]); } };
  // a tall window with a pointed head on a wall facing ±b (s = sign) at (a, b)
  const winB = (a, b, s, w, y0, y1, col = glass) => { const d = 0.09 * s; box(a, b + d, y0, y1, w, 0.14, col); S.kind = KIND.PLAIN; S.tri(V(a - w / 2, b + d * 1.6, y1), V(a + w / 2, b + d * 1.6, y1), V(a, b + d * 1.6, y1 + w * 0.75), col, [P[0] * s, 0, P[1] * s]); };
  const yf = Math.max(...[[-2, -16], [-2, 16], [-30, 16], [-30, -16], [-20, 0]].map(([a, b]) => gY(...W(a, b)))) + 0.3; // forecourt
  S.base = y - LAND_Y;

  // ---- plinth on the mapped outline, and the steps up to the porch
  S.kind = KIND.MASONRY;
  S.prism(PLAN.map(([a, b]) => W(a, b)), y - 1.6, y, stD, pave, { topKind: KIND.ROAD });
  S.kind = KIND.ROAD;
  for (let i = 0; i < 3; i++) box(-0.6 - i * 0.6, 0, yf - 0.6, yf + ((y - yf) * (3 - i)) / 4, 0.62, 27.4 + 1.2 * (2 - i), pave);

  // ---- the forecourt: paved from the porch to the statue of Christ, lawns either side, the drive to the main gate
  const paved0 = S.n;
  S.kind = KIND.MASONRY;
  const fc = [[-2.4, -16], [-2.4, 16], [-30, 16], [-30, -16]];
  S.prism(fc.map(([a, b]) => W(a, b)), yf - 1.0, yf, stD, pave, { topKind: KIND.ROAD });
  { // the drive on to the gate at the apex
    const g = [GATE_MAIN[0], GATE_MAIN[1]], s = W(-30, 0), len = Math.hypot(g[0] - s[0], g[1] - s[1]), ang = Math.atan2(g[1] - s[1], g[0] - s[0]);
    const m = [(g[0] + s[0]) / 2, (g[1] + s[1]) / 2], gy = Math.min(gY(...g), gY(...s));
    S.box(m[0], m[1], gy - 0.6, gy + 0.32, len, 7, ang, stD, { top: pave, topKind: KIND.ROAD });
  }
  (S.paved = S.paved || []).push([paved0, S.n]);
  for (const s of [-1, 1]) { // the lawns, kept off the street that cuts across the south one's outer corner
    const r = offStreets(data, [[-29, s * 17], [-3, s * 17], [-3, s * 27], [-29, s * 27]].map(([a, b]) => W(a, b)));
    S.kind = KIND.MASONRY;
    S.prism(r, yf - 1.0, yf - 0.05, stL, lawn);
  }
  // the statue of Christ on a stepped round pedestal, on the axis
  { const q = W(-20, 0); S.kind = KIND.MASONRY;
    S.cyl(q[0], q[1], yf - 0.2, yf + 0.5, 3.4, 3.4, 12, stL); S.cyl(q[0], q[1], yf + 0.5, y + 2.2, 1.2, 1.0, 8, trim);
    S.kind = KIND.PLAIN; S.cyl(q[0], q[1], y + 2.2, y + 4.2, 0.55, 0.42, 8, white); S.cyl(q[0], q[1], y + 4.2, y + 4.65, 0.22, 0.2, 6, white);
    S.beam(V(-20, -0.9, y + 3.7), V(-20, 0.9, y + 3.7), 0.24, 0.22, white); }

  // ---- the open porch across the front: an arcade under a two-tier tile roof, the tower in the middle
  const PE = 7.2; // porch eave
  S.kind = KIND.MASONRY;
  for (const s of [-1, 1]) {
    box(4.6, s * 9.6, y, y + PE, 9.2, 8.2, st, { top: tileD });
    // three arches on the front of each wing, one at the end
    S.kind = KIND.PLAIN;
    for (let k = 0; k < 3; k++) { const b = s * (6.4 + k * 2.6); box(-0.08, b, y, y + 4.6, 0.16, 2.0, door); S.tri(V(-0.1, b - 1, y + 4.6), V(-0.1, b + 1, y + 4.6), V(-0.1, b, y + 5.7), door, [-F[0], 0, -F[1]]); }
    winB(4.6, s * 13.7, s, 3.0, y, y + 4.6, door);
    S.kind = KIND.PLAIN;
    box(4.6, s * 9.6, y + PE - 0.4, y + PE, 9.6, 8.6, trim);
    hipAB(4.6, s * 9.8, 9.2, 8.6, y + PE, 2.6, tile, { over: 1.4, flare: 0.4, fascia: 0.25, fasciaCol: trim, hips: true, segs: 3 });
  }

  // ---- nave with its side corridors (26 x 4.2 m), the clerestory above, tiered roofs
  const NE = 15, NR = 25; // nave wall-head, nave ridge
  S.kind = KIND.MASONRY;
  box(20.5, 0, y, y + 7.4, 21, 27.4, st, { top: tileD }); // side corridors
  box(20.5, 0, y, y + NE, 21.4, 19, st, { top: tileD }); // nave
  S.kind = KIND.TILE;
  for (const s of [-1, 1]) { // corridor lean-to roofs, the lower tier
    const lo = s * 14.6, hi = s * 9.5;
    S.quad(V(9.6, lo, y + 6.6), V(31.4, lo, y + 6.6), V(31.4, hi, y + 9.6), V(9.6, hi, y + 9.6), tile, [P[0] * s, 1.4, P[1] * s]);
  }
  { // the nave roof, a steep pitch; its front gable stands behind the tower
    const ye = y + NE - 1.1;
    for (const s of [-1, 1]) S.quad(V(8.4, s * 10.6, ye), V(31.2, s * 10.6, ye), V(31.2, 0, y + NR), V(8.4, 0, y + NR), tile, [P[0] * s, 1.2, P[1] * s]);
    S.kind = KIND.MASONRY;
    S.tri(V(9.8, -9.5, y + NE), V(9.8, 9.5, y + NE), V(9.8, 0, y + NR - 0.3), stL, [-F[0], 0, -F[1]]);
    S.kind = KIND.TILE;
    S.beam(V(8.4, 0, y + NR + 0.1), V(31.2, 0, y + NR + 0.1), 0.45, 0.35, tileD);
  }
  for (const s of [-1, 1]) for (let i = 0; i < 5; i++) {
    const a = 12.2 + i * 4.3;
    winB(a, s * 13.7, s, 1.8, y + 1.6, y + 5.2);
    winB(a, s * 9.5, s, 1.6, y + 10.2, y + 13.2);
  }

  // ---- the crossing: the widest part of the plan under the highest roof (32 m), an eight-sided crown over it
  S.kind = KIND.MASONRY;
  box(44.95, 0, y, y + 8.2, 26.2, 38.6, st, { top: tileD }); // b ±19.3
  box(45.4, 0, y, y + 7.0, 17.6, 50, st, { top: tileD }); // the arms to b ±25
  box(44.95, 0, y, y + 18, 26.6, 27.4, st, { top: tileD }); // the core
  S.kind = KIND.PLAIN;
  box(44.95, 0, y + 17.5, y + 18, 27.1, 27.9, trim);
  hipAB(45.4, 0, 17.6, 50, y + 7.0, 2.0, tile, { over: 1.0, flare: 0.3, segs: 2 });
  hipAB(44.95, 0, 26.2, 38.6, y + 8.2, 3.4, tile, { over: 1.2, flare: 0.35, segs: 2 });
  hipAB(44.95, 0, 26.6, 27.4, y + 18, 4.2, tile, { over: 1.4, flare: 0.4, fascia: 0.3, fasciaCol: trim, hips: true, segs: 3 });
  oct(44.95, 0, y + 21.4, y + 26.4, 8.2, 7.9, stL);
  oct(44.95, 0, y + 26.4, y + 28.4, 10.4, 6.2, tile, KIND.TILE);
  oct(44.95, 0, y + 28.2, y + 30.0, 5.6, 5.4, stL);
  oct(44.95, 0, y + 30.0, y + 32.0, 6.8, 0.4, tile, KIND.TILE);
  for (let i = 0; i < 8; i++) { // windows round the crown
    const t = ANG + Math.PI / 8 + (i * Math.PI) / 4 + Math.PI / 8, r = 7.9 * Math.cos(Math.PI / 8) + 0.06, c = W(44.95, 0);
    S.kind = KIND.PLAIN; S.box(c[0] + Math.cos(t) * r, c[1] + Math.sin(t) * r, y + 22.4, y + 25.6, 0.14, 2.6, t, glass);
  }
  for (const s of [-1, 1]) {
    for (const a of [40, 45.4, 50.8]) winB(a, s * 25, s, 2.2, y + 1.3, y + 5.6);
    for (const a of [34.2, 55.8]) winB(a, s * 19.4, s, 1.8, y + 1.3, y + 5.8);
    for (const a of [37.4, 44.95, 52.5]) winB(a, s * 13.7, s, 2.6, y + 11.2, y + 15.8); // the great side windows
  }

  // ---- the choir narrowing to the sanctuary: an apse of pointed arches under a fanned roof
  const CH = [[58, -14.5], [63.3, -13.3], [68.5, -10.3], [71.4, -6.5], [77, -6.2], [80.6, -1.6], [80.4, 4.3], [76.5, 8.1], [70.6, 8.2], [67, 11.6], [62.3, 14.2], [57.1, 14.8]];
  const CE = 11, top = V(66, 0.5, y + 20);
  S.kind = KIND.MASONRY;
  S.prism(CH.map(([a, b]) => W(a, b)), y, y + CE, st, tileD);
  S.kind = KIND.TILE;
  const cc = W(66, 0.5);
  for (let i = 0; i + 1 < CH.length; i++) {
    const out = (p) => { const q = W(p[0], p[1]), dx = q[0] - cc[0], dz = q[1] - cc[1], d = Math.hypot(dx, dz) || 1; return [q[0] + (dx / d) * 1.1, y + CE - 0.7, q[1] + (dz / d) * 1.1]; };
    const e0 = out(CH[i]), e1 = out(CH[i + 1]);
    S.tri(e0, e1, top, tile, [e0[0] + e1[0] - 2 * top[0], 3, e0[2] + e1[2] - 2 * top[2]]);
  }
  // an upper tier over the sanctuary: an eight-sided lantern, rising behind the fan
  oct(73.5, 1, y + CE, y + 18, 6.2, 6.0, stL);
  oct(73.5, 1, y + 18, y + 22.5, 7.6, 0.4, tile, KIND.TILE);
  for (let i = 0; i + 1 < CH.length; i++) { // pointed arches round the choir walls
    const [a0, b0] = CH[i], [a1, b1] = CH[i + 1], len = Math.hypot(a1 - a0, b1 - b0);
    if (len < 3) continue;
    const q0 = W(a0, b0), q1 = W(a1, b1), m = [(q0[0] + q1[0]) / 2, (q0[1] + q1[1]) / 2], n = [m[0] - cc[0], m[1] - cc[1]], nl = Math.hypot(...n);
    const ang = Math.atan2(q1[1] - q0[1], q1[0] - q0[0]), x = m[0] + (n[0] / nl) * 0.09, z = m[1] + (n[1] / nl) * 0.09, w = Math.min(2.2, len * 0.4);
    S.kind = KIND.PLAIN;
    S.box(x, z, y + 1.4, y + 7.4, w, 0.14, ang, glass);
    S.tri([x - Math.cos(ang) * w / 2, y + 7.4, z - Math.sin(ang) * w / 2], [x + Math.cos(ang) * w / 2, y + 7.4, z + Math.sin(ang) * w / 2], [x, y + 7.4 + w * 0.8, z], glass, [n[0], 0, n[1]]);
  }

  // ---- the bell tower over the door: a square stone shaft with the great arch, the round window and the clock,
  //      then three eight-sided tiers under broad tiled skirts, the slate spire and the cross at 53 m
  const TA = 5.4, TS = 10.4, yg = gY(...W(40, 0)); // tower centre; heights are measured from the ground mid-church
  S.kind = KIND.MASONRY;
  box(TA, 0, y, y + 21, TS, TS, st, { top: tileD });
  S.kind = KIND.PLAIN;
  for (const h of [y + 9.8, y + 20.5]) box(TA, 0, h, h + 0.5, TS + 0.5, TS + 0.5, trim);
  // the great arched door on the front face, and the frame round it
  const fa = TA - TS / 2 - 0.1;
  box(fa + 0.05, 0, y, y + 7.4, 0.16, 5.8, trim);
  box(fa, 0, y, y + 6.4, 0.16, 4.6, door);
  disc(fa - 0.02, 0, y + 6.4, 2.3, door, 10);
  disc(fa - 0.05, 0, y + 13.2, 2.0, trim, 12); // the round window, its frame
  disc(fa - 0.08, 0, y + 13.2, 1.6, glass, 12);
  disc(fa - 0.05, 0, y + 17.6, 1.35, white, 12); // the clock
  S.beam(V(fa - 0.1, 0, y + 17.6), V(fa - 0.1, 0, y + 18.6), 0.1, 0.06, door);
  S.beam(V(fa - 0.1, 0, y + 17.6), V(fa - 0.1, 0.7, y + 17.6), 0.1, 0.06, door);
  for (const s of [-1, 1]) { // narrow slit windows on the sides of the shaft
    box(TA, s * (TS / 2 + 0.08), y + 11.5, y + 18.5, 0.9, 0.14, glass);
  }
  hipAB(TA, 0, TS, TS, y + 21, 2.4, tile, { over: 2.0, flare: 0.45, fascia: 0.3, fasciaCol: trim, hips: true, segs: 3 });
  const tiers = [[22.8, 30.0, 4.3, 6.4], [30.6, 37.0, 3.5, 5.4], [37.6, 42.6, 2.9, 4.4]]; // [y0, y1, radius, skirt radius]
  for (const [t0, t1, r, rs] of tiers) {
    oct(TA, 0, y + t0 - 1, y + t1, r, r * 0.97, stL);
    // openings on the eight faces: louvred belfry arches in the top tier, small arches below
    const c = W(TA, 0);
    for (let i = 0; i < 8; i++) {
      const t = ANG + (i * Math.PI) / 4, rr = r * 0.97 * Math.cos(Math.PI / 8) + 0.06;
      S.kind = KIND.PLAIN;
      S.box(c[0] + Math.cos(t) * rr, c[1] + Math.sin(t) * rr, y + t0 + 0.8, y + t1 - 1.0, 0.14, r * 0.42, t, door);
    }
    oct(TA, 0, y + t1, y + t1 + 1.5, rs, r * 0.82, tile, KIND.TILE);
  }
  const spire0 = y + 44.1, crossY = yg + 50.0; // cross from 50 to 53 m above the ground
  oct(TA, 0, spire0 - 0.1, crossY + 0.2, 2.4, 0.12, slate, KIND.TILE);
  S.kind = KIND.PLAIN;
  const tc = W(TA, 0);
  S.beam([tc[0], crossY, tc[1]], [tc[0], yg + 53, tc[1]], 0.3, 0.3, cream);
  S.beam(V(TA, -0.9, crossY + 2.0), V(TA, 0.9, crossY + 2.0), 0.28, 0.28, cream);

  // ---- the grotto of Our Lady at the rear left: a rough stone mound with a niche and the white statue
  { const q = W(80, -21), gy = gY(...q);
    S.base = gy - LAND_Y;
    S.kind = KIND.MASONRY;
    S.cyl(q[0], q[1], gy - 0.3, gy + 3.6, 3.4, 1.4, 7, hex('#7d7a70'), { rot: 0.3 });
    S.cyl(q[0] + 1.2, q[1] - 0.6, gy - 0.3, gy + 2.2, 2.4, 0.8, 6, hex('#8a867a'), { rot: 1.1 });
    S.kind = KIND.PLAIN;
    const n = W(78.5, -21);
    S.cyl(n[0], n[1], gy + 0.9, gy + 2.5, 0.32, 0.22, 6, white);
    S.cyl(n[0], n[1], gy + 2.5, gy + 2.8, 0.16, 0.14, 5, white);
    S.base = y - LAND_Y; }

  // ---- the grounds: rendered wall with railings round the triangle, open at the gates
  const c = W(40, 0), roads = roadsNear(data, c, 220), blds = buildingsNear(data, c, 220);
  fence(S, PRECINCT, FENCE.church, { roads, openings: [GATE_MAIN, GATE_SIDE, GATE_NH], solid: blds });
  for (const [gx, gz, hw] of [GATE_MAIN, GATE_SIDE, GATE_NH]) { // the iron leaves in each gate, across the fence line
    let best = null, bd = 1e9;
    for (let i = 0; i < PRECINCT.length; i++) {
      const a = PRECINCT[i], b = PRECINCT[(i + 1) % PRECINCT.length], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz;
      const t = Math.max(0, Math.min(1, ((gx - a[0]) * dx + (gz - a[1]) * dz) / L2)), d = Math.hypot(a[0] + dx * t - gx, a[1] + dz * t - gz);
      if (d < bd) { bd = d; best = [dx, dz, Math.sqrt(L2)]; }
    }
    const u = [best[0] / best[2], best[1] / best[2]];
    leaves(S, [gx - u[0] * hw, gz - u[1] * hw], [gx + u[0] * hw, gz + u[1] * hw], gY(gx, gz), 2.2, FENCE.church.iron);
  }
  S.kind = KIND.PLAIN;
  S.base = 0;

  // ---- no generated houses in the church grounds east of the monastery: the forecourt, lawns and the church
  if (Array.isArray(data.infill)) {
    const a = data.infill, R = 8, keep = [];
    let near = data.meta?.counts?.infillNear ?? a.length / R, nearKept = 0;
    for (let i = 0; i < a.length / R; i++) {
      const x = a[i * R] / 10, z = a[i * R + 1] / 10;
      if (x > 648 && inRing(x, z, PRECINCT)) continue;
      if (i < near) nearKept++;
      for (let j = 0; j < R; j++) keep.push(a[i * R + j]);
    }
    if (keep.length !== a.length) {
      a.length = 0;
      for (const v of keep) a.push(v);
      if (data.meta?.counts && data.meta.counts.infillNear != null) data.meta.counts.infillNear = nearKept;
    }
  }

  // ---- after dark: the cross and the spire's arrises lit white, the round window and the door glowing, lamps
  const L = new Buf(256);
  L.beam([tc[0], crossY - 0.05, tc[1]], [tc[0], yg + 53.1, tc[1]], 0.36, 0.36, [1, 1, 1]);
  L.beam(V(TA, -0.95, crossY + 2.0), V(TA, 0.95, crossY + 2.0), 0.34, 0.34, [1, 1, 1]);
  for (let i = 0; i < 4; i++) {
    const t = ANG + Math.PI / 8 + (i * Math.PI) / 2, r0 = 2.45;
    L.beam([tc[0] + Math.cos(t) * r0, spire0, tc[1] + Math.sin(t) * r0], [tc[0] + Math.cos(t) * 0.2, crossY, tc[1] + Math.sin(t) * 0.2], 0.12, 0.12, [1, 1, 1]);
  }
  const cross = lightMesh(L, lightMaterial(0xf4f1ff, 1.4));
  const L2 = new Buf(128);
  { const k = W(fa - 0.12, 0); L2.box(k[0], k[1], y + 0.1, y + 6.2, 0.12, 4.2, ANG, [1, 1, 1]);
    for (let i = 0; i < 12; i++) { const t0 = (i / 12) * 2 * Math.PI, t1 = ((i + 1) / 12) * 2 * Math.PI; L2.tri(V(fa - 0.14, 0, y + 13.2), V(fa - 0.14, Math.cos(t0) * 1.55, y + 13.2 + Math.sin(t0) * 1.55), V(fa - 0.14, Math.cos(t1) * 1.55, y + 13.2 + Math.sin(t1) * 1.55), [1, 1, 1], [-F[0], 0, -F[1]]); } }
  const warm = lightMesh(L2, lightMaterial(0xffc982, 1.1));
  const pos = [], col = [];
  const put = (q, h, cc2 = [1, 0.85, 0.6]) => { pos.push(q[0], h, q[1]); col.push(...cc2); };
  for (const s of [-1, 1]) { put(W(-2.8, s * 13), y + 0.4, [1, 0.92, 0.75]); put(W(-28, s * 15), yf + 3.2); put(W(-12, s * 15), yf + 3.2); }
  put(W(-21.5, 0), yf + 0.6, [1, 0.95, 0.85]); // the light on the statue
  for (const [gx, gz, hw] of [GATE_MAIN, GATE_SIDE, GATE_NH]) put([gx, gz], gY(gx, gz) + 3.6);
  const pts = glowPoints(pos, col, 4);
  pts.userData.glow = true;
  for (const m of [cross, warm, pts]) { m.userData.landmark = id; group.add(m); }
}

// a night-light mesh from a Buf
function lightMesh(buf, mat) {
  const m = new THREE.Mesh(buf.geometry(), mat);
  m.renderOrder = 19;
  return m;
}
