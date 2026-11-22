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
// the grotto of Our Lady at the rear left. The audit of 2026-11 (photographs, see the doc) moved the tower from the door
// to the crossing, where it stands, and gave the front its stepped gable.

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

// pale blue-grey render over a tan stone base (photographs)
const st = hex('#bcc6cb'), stL = hex('#d3dadc'), stD = hex('#a8977a'), trim = hex('#eceae3'), tile = hex('#9c4d3a'), tileD = hex('#7c3d2f');
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

  // ---- the front block (a 0-10): low wings either side with curved tiled copings, the tall stepped gable in the middle
  //      with the great pointed window and its cross, the clock above, round portholes, and a low canopy on four
  //      pillars over three doors. Dimensions estimated from photographs (docs/places/dcct.md).
  const GW = 7; // half-width of the central gable
  // a wall across the front between b0 and b1 (a 0 to depth) whose top follows h(b): front, back and top faces
  const profileWall = (b0, b1, depth, hOf, col, topCol, n = 8) => {
    for (let i = 0; i < n; i++) {
      const p0 = b0 + ((b1 - b0) * i) / n, p1 = b0 + ((b1 - b0) * (i + 1)) / n, h0 = hOf(p0), h1 = hOf(p1);
      S.kind = KIND.MASONRY;
      S.quad(V(0, p0, y), V(0, p1, y), V(0, p1, h1), V(0, p0, h0), col, [-F[0], 0, -F[1]]);
      S.quad(V(depth, p1, y), V(depth, p0, y), V(depth, p0, h0), V(depth, p1, h1), col, [F[0], 0, F[1]]);
      S.kind = KIND.TILE;
      S.quad(V(-0.35, p0, h0 + 0.05), V(-0.35, p1, h1 + 0.05), V(depth + 0.2, p1, h1 + 0.05), V(depth + 0.2, p0, h0 + 0.05), topCol, [0, 1, 0]);
    }
  };
  for (const s of [-1, 1]) {
    // the wing rises from 5.6 m at the corner to 9.2 m against the gable along a concave curve
    profileWall(s * 13.7, s * GW, 10, (b) => { const t = (13.7 - Math.abs(b)) / (13.7 - GW); return y + 5.6 + 3.6 * t * t; }, st, tile);
    S.kind = KIND.MASONRY;
    S.quad(V(0, s * 13.7, y), V(10, s * 13.7, y), V(10, s * 13.7, y + 5.6), V(0, s * 13.7, y + 5.6), st, [P[0] * s, 0, P[1] * s]);
    box(5, s * 13.4, y, y + 1.2, 10.2, 0.7, stD); // the tan stone base
  }
  box(5, 0, y, y + 1.2, 10.2, 27.6, stD);
  // the gable: a shaft tapering slightly toward the top, then four steps with ledges, the summit block and the star
  S.kind = KIND.MASONRY;
  const GD = 8.4; // depth of the gable block
  const shaft = [[0, 12, 2 * GW], [12, 15.5, 13.4], [15.5, 18, 12.6], [18, 20, 11.6]];
  for (const [h0, h1, w] of shaft) box(GD / 2, 0, y + h0, y + h1, GD, w, st, { top: stL });
  const steps = [[20, 22.2, 9.4], [22.2, 24.2, 7.4], [24.2, 26.2, 5.4], [26.2, 29, 3.0]];
  for (const [h0, h1, w] of steps) {
    box(GD / 2 - 0.4, 0, y + h0, y + h1, GD - 0.8, w, st, { top: stL });
    S.kind = KIND.PLAIN; box(GD / 2 - 0.4, 0, y + h0 - 0.25, y + h0, GD - 0.4, w + 2.4, trim); S.kind = KIND.MASONRY;
  }
  S.kind = KIND.PLAIN;
  box(GD / 2 - 0.4, 0, y + 29, y + 29.3, GD - 0.4, 3.6, trim);
  S.beam(V(0.6, 0, y + 29.3), V(0.6, 0, y + 31.4), 0.22, 0.22, cream); // the star on its stem at the summit
  for (let k = 0; k < 4; k++) { const t = (k * Math.PI) / 4; S.beam(V(0.6, -Math.cos(t) * 0.7, y + 31.4 - Math.sin(t) * 0.7), V(0.6, Math.cos(t) * 0.7, y + 31.4 + Math.sin(t) * 0.7), 0.12, 0.12, cream); }
  // the great pointed window, its frame and the cross in it
  const WW = 7.4, W0 = 7.2, W1 = 15.2, WA = 4.6; // width, sill, springing, height of the pointed head
  const arch = (a, hw, h0, rise_, col) => { // a pointed head over a rectangle, facing the front
    const n = 6;
    for (const s of [-1, 1]) for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n, f = (t) => [s * hw * (1 - t) ** 0.8, h0 + rise_ * Math.sin((t * Math.PI) / 2)];
      const [b0, z0] = f(t0), [b1, z1] = f(t1);
      S.quad(V(a, 0, h0), V(a, b0, z0), V(a, b1, z1), V(a, 0, h0), col, [-F[0], 0, -F[1]]);
    }
  };
  S.kind = KIND.PLAIN;
  box(-0.06, 0, y + W0 - 0.4, y + W1, 0.12, WW + 0.9, trim);
  arch(-0.07, WW / 2 + 0.45, y + W1, WA + 0.45, trim);
  box(-0.12, 0, y + W0, y + W1, 0.12, WW, glass);
  arch(-0.13, WW / 2, y + W1, WA, glass);
  S.beam(V(-0.2, 0, y + W0 + 0.3), V(-0.2, 0, y + W1 + 3.4), 0.5, 0.18, trim);
  S.beam(V(-0.2, -2.1, y + W1 - 0.4), V(-0.2, 2.1, y + W1 - 0.4), 0.5, 0.18, trim);
  for (let k = 1; k < 4; k++) S.beam(V(-0.18, -WW / 2, y + W0 + k * 2), V(-0.18, WW / 2, y + W0 + k * 2), 0.08, 0.08, trim); // glazing bars
  disc(-0.06, 0, y + 22.2, 1.0, white, 12); // the clock
  S.beam(V(-0.1, 0, y + 22.2), V(-0.1, 0, y + 22.9), 0.08, 0.05, door);
  for (const s of [-1, 1]) for (const h of [9, 12, 15, 18]) disc(-0.06, s * (GW - 1.1 - (h - 9) * 0.08), y + h, 0.32, door, 8); // portholes
  // the canopy over the three doors, on four pillars at the head of the steps
  for (const b of [-4.4, 0, 4.4]) box(-0.08, b, y, y + 4.4, 0.16, 3.0, door);
  box(-1.3, 0, y + 5.0, y + 5.5, 2.8, 14.0, trim);
  hipAB(-1.3, 0, 2.8, 14.0, y + 5.5, 0.7, tile, { over: 0.5, flare: 0.2, segs: 2 });
  S.kind = KIND.MASONRY;
  for (const b of [-6.6, -2.2, 2.2, 6.6]) box(-2.3, b, yf - 0.2, y + 5.0, 0.6, 0.6, stD);

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
  { // the nave roof, a steep pitch, running back from behind the front gable
    const ye = y + NE - 1.1;
    for (const s of [-1, 1]) S.quad(V(8.4, s * 10.6, ye), V(31.2, s * 10.6, ye), V(31.2, 0, y + NR), V(8.4, 0, y + NR), tile, [P[0] * s, 1.2, P[1] * s]);
    S.kind = KIND.TILE;
    S.beam(V(8.4, 0, y + NR + 0.1), V(31.2, 0, y + NR + 0.1), 0.45, 0.35, tileD);
  }
  for (const s of [-1, 1]) for (let i = 0; i < 5; i++) { // arched windows in the aisle
    const a = 12.2 + i * 4.3;
    winB(a, s * 13.7, s, 1.8, y + 1.6, y + 5.2);
  }
  for (const s of [-1, 1]) for (let i = 0; i < 8; i++) { // the clerestory: tall slits under gabled dormer heads breaking the eave
    const a = 11.3 + i * 2.7, hw = 1.05, e = y + NE, ye = y + NE - 1.1, ap = e + 2.0, bo = s * 9.6, bi = s * 7.6;
    winB(a, s * 9.5, s, 0.7, y + 9.6, y + NE - 0.4);
    S.kind = KIND.MASONRY;
    S.tri(V(a - hw, bo, e - 0.6), V(a + hw, bo, e - 0.6), V(a, bo, ap), stL, [P[0] * s, 0, P[1] * s]);
    S.kind = KIND.TILE;
    S.quad(V(a - hw - 0.15, s * 9.8, e - 0.7), V(a, s * 9.8, ap + 0.15), V(a, bi, ap - 0.4), V(a - hw - 0.15, bi, ye + 1.5), tile, [-F[0], 1, -F[1]]);
    S.quad(V(a, s * 9.8, ap + 0.15), V(a + hw + 0.15, s * 9.8, e - 0.7), V(a + hw + 0.15, bi, ye + 1.5), V(a, bi, ap - 0.4), tile, [F[0], 1, F[1]]);
  }

  // ---- the crossing: the widest part of the plan, with the bell tower rising from its roof (below)
  S.kind = KIND.MASONRY;
  box(44.95, 0, y, y + 8.2, 26.2, 38.6, st, { top: tileD }); // b ±19.3
  box(45.4, 0, y, y + 7.0, 17.6, 50, st, { top: tileD }); // the arms to b ±25
  box(44.95, 0, y, y + 18, 26.6, 27.4, st, { top: tileD }); // the core
  S.kind = KIND.PLAIN;
  box(44.95, 0, y + 17.5, y + 18, 27.1, 27.9, trim);
  hipAB(45.4, 0, 17.6, 50, y + 7.0, 2.0, tile, { over: 1.0, flare: 0.3, segs: 2 });
  hipAB(44.95, 0, 26.2, 38.6, y + 8.2, 3.4, tile, { over: 1.2, flare: 0.35, segs: 2 });
  hipAB(44.95, 0, 26.6, 27.4, y + 18, 4.2, tile, { over: 1.4, flare: 0.4, fascia: 0.3, fasciaCol: trim, hips: true, segs: 3 });
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
  for (let i = 0; i + 1 < CH.length; i++) { // pointed arches round the choir walls
    const [a0, b0] = CH[i], [a1, b1] = CH[i + 1], len = Math.hypot(a1 - a0, b1 - b0);
    if (len < 3) continue;
    const q0 = W(a0, b0), q1 = W(a1, b1), m = [(q0[0] + q1[0]) / 2, (q0[1] + q1[1]) / 2], n = [m[0] - cc[0], m[1] - cc[1]], nl = Math.hypot(...n);
    const ang = Math.atan2(q1[1] - q0[1], q1[0] - q0[0]), x = m[0] + (n[0] / nl) * 0.09, z = m[1] + (n[1] / nl) * 0.09, w = Math.min(2.2, len * 0.4);
    S.kind = KIND.PLAIN;
    S.box(x, z, y + 1.4, y + 7.4, w, 0.14, ang, glass);
    S.tri([x - Math.cos(ang) * w / 2, y + 7.4, z - Math.sin(ang) * w / 2], [x + Math.cos(ang) * w / 2, y + 7.4, z + Math.sin(ang) * w / 2], [x, y + 7.4 + w * 0.8, z], glass, [n[0], 0, n[1]]);
  }

  // ---- the bell tower over the crossing (the octagonal lantern seen inside): a square lattice shaft out of the crossing
  //      roof, three eight-sided tiers each under a flared tiled skirt (the middle one an open gallery), the
  //      terracotta spire and the cross at 53 m. Tier heights estimated from photographs (docs/places/dcct.md).
  const TA = 44.95, yg = gY(...W(40, 0)); // tower centre; heights are measured from the ground mid-church
  const tc = W(TA, 0);
  S.kind = KIND.MASONRY;
  box(TA, 0, y + 17, yg + 25.2, 8.6, 8.6, stL);
  S.kind = KIND.PLAIN;
  for (let k = 0; k < 4; k++) { // lattice panels on the four faces of the shaft
    const t = ANG + (k * Math.PI) / 2, r = 4.36;
    S.box(tc[0] + Math.cos(t) * r, tc[1] + Math.sin(t) * r, y + 22.4, yg + 24.4, 0.12, 5.6, t + Math.PI / 2, slate);
  }
  box(TA, 0, yg + 24.9, yg + 25.4, 9.4, 9.4, trim);
  const ring = (y0, y1, r, col) => { const n = 8; for (let i = 0; i < n; i++) { const t = ANG + Math.PI / 8 + (i * Math.PI) / 4 + Math.PI / 8, rr = r * Math.cos(Math.PI / 8) + 0.06; S.kind = KIND.PLAIN; S.box(tc[0] + Math.cos(t) * rr, tc[1] + Math.sin(t) * rr, y0, y1, 0.14, r * 0.62, t + Math.PI / 2, col); } };
  // [body bottom, body top, body radius, skirt radius, opening colour]
  const tiers = [[25.2, 29.7, 4.9, 8.4, slate], [30.5, 34.0, 4.8, 6.6, door], [34.8, 38.3, 3.1, 4.8, door]];
  for (const [t0, t1, r, rs, oc] of tiers) {
    oct(TA, 0, yg + t0 - 0.8, yg + t1, r, r * 0.97, stL);
    ring(yg + t0 + 0.5, yg + t1 - 0.6, r * 0.97, oc);
    oct(TA, 0, yg + t1, yg + t1 + 1.1, rs, r * 0.7, tile, KIND.TILE);
  }
  oct(TA, 0, yg + 30.5, yg + 31.6, 5.3, 5.3, trim); // the gallery's balustrade
  const spire0 = yg + 38.5, crossY = yg + 50.0; // cross from 50 to 53 m above the ground
  oct(TA, 0, spire0, crossY + 0.2, 1.7, 0.1, tile, KIND.TILE);
  S.kind = KIND.PLAIN;
  S.beam([tc[0], crossY, tc[1]], [tc[0], yg + 53, tc[1]], 0.3, 0.3, cream);
  S.beam(V(TA, -0.9, crossY + 2.0), V(TA, 0.9, crossY + 2.0), 0.28, 0.28, cream);
  // four small square turrets with gabled caps at the corners of the crossing
  for (const ta of [36.2, 54.6]) for (const s of [-1, 1]) {
    const tb = s * 20.4, h1 = y + 15.5;
    S.kind = KIND.MASONRY;
    box(ta, tb, y, h1, 3.0, 3.0, stL);
    S.kind = KIND.PLAIN;
    box(ta, tb, h1 - 0.3, h1, 3.4, 3.4, trim);
    for (const [da, db] of [[-1.52, 0], [1.52, 0], [0, -1.52], [0, 1.52]]) box(ta + da, tb + db, y + 12.4, y + 14.8, da ? 0.1 : 1.6, da ? 1.6 : 0.1, door);
    S.kind = KIND.TILE;
    S.quad(V(ta - 1.8, tb - 1.8, h1), V(ta + 1.8, tb - 1.8, h1), V(ta + 1.8, tb, h1 + 1.8), V(ta - 1.8, tb, h1 + 1.8), tile, [P[0] * -1, 1, P[1] * -1]);
    S.quad(V(ta + 1.8, tb + 1.8, h1), V(ta - 1.8, tb + 1.8, h1), V(ta - 1.8, tb, h1 + 1.8), V(ta + 1.8, tb, h1 + 1.8), tile, [P[0], 1, P[1]]);
    S.kind = KIND.MASONRY;
    for (const sa of [-1, 1]) S.tri(V(ta + sa * 1.5, tb - 1.5, h1), V(ta + sa * 1.5, tb + 1.5, h1), V(ta + sa * 1.5, tb, h1 + 1.7), stL, [F[0] * sa, 0, F[1] * sa]);
  }

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
  { for (const b of [-4.4, 0, 4.4]) { const k = W(-0.18, b); L2.box(k[0], k[1], y + 0.1, y + 4.2, 0.12, 2.6, ANG, [1, 1, 1]); }
    const k = W(-0.2, 0); L2.box(k[0], k[1], y + W0 + 0.1, y + W1, 0.12, WW - 0.3, ANG, [1, 1, 1]); }
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
