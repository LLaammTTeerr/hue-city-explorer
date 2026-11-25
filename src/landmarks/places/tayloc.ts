import * as T3 from 'three';
import polygonClipping from 'polygon-clipping';
import { Buf, KIND, hex, shade } from '../../geo/buf.ts';
import { LAND_Y } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { lightMaterial } from '../../geo/materials.ts';
import { offStreets } from '../enclosure.ts';

// Chợ Tây Lộc (209 Nguyễn Trãi, the north-west of the Citadel; once chợ Phú Xuân), as it stands today. Sources and
// estimates: docs/places/tayloc.md.
//
// The market fills a whole block between four streets ("one-storey houses built on the open land between four roads",
// vietnamdrive.com), its long east side on Nguyễn Trãi. The plan is the mapped one (OSM marketplace way 372292672 and
// the eleven building footprints inside it, as they stand in hue.json, here in the block's own frame):
//  - the main hall on the west half, an E in plan: a long wing down the back street, two arms running east along the
//    two side streets, corner blocks and a porch on the back, and a middle bar ending in a rounded (oval) hall; the
//    city survey reads 3.5 m to the top, so one storey under a low sheet roof;
//  - a two-storey block (survey 7.7 m) and a low hall in the two courts of the E, two small sheds in the courts;
//  - six long stall halls (3.0-4.5 m, survey) on the east half, either side of the lane that comes in from Nguyễn Trãi
//    at the middle of the block. In the gap between the two front halls, at the lane's mouth, stands the market gate:
//    yellow pillars under a two-tier red roof, the name board between the tiers and a flag on top (Street View on
//    Nguyễn Trãi). Before it an open paved forecourt where cars and motorbikes park, a planting strip with a row of
//    small street trees along the kerb (Street View; the flea market on tarpaulins of older accounts is gone).
// Estimated: roof forms (low gables of corrugated sheet, the oval hall's a low cone), colours, the gate's sizes,
// stall bays, sign boards, tarps and awnings, umbrellas; the lit strips (the market keeps open to 22:00).
//
// Frame: the block's centre C; u along the side streets toward Nguyễn Trãi (east-north-east), v toward the street on
// the south-south-east side. hue.json's footprints, converted, are listed below in (u, v) metres.
export const id = 'tayloc';

const C = [-2304.25, -492.5];
const UL = Math.hypot(0.807, -0.586), U = [0.807 / UL, -0.586 / UL], V = [-U[1], U[0]];
const ANG = Math.atan2(U[1], U[0]);
const P = (u, v): [number, number] => [C[0] + U[0] * u + V[0] * v, C[1] + U[1] * u + V[1] * v];

const WALL = hex('#ead7a2'), WALL2 = hex('#e4dccb'), PLINTH = hex('#9b968c'), WALL_PAV = hex('#f2e7bb');
const ROOF_HALL = hex('#9a4c3b'), ROOF_ZINC = hex('#8c9598'), ROOF_BLUE = hex('#5f7f97');
const PAVE = hex('#bdb6a8'), KERB = hex('#a29c90'), DARK = hex('#3a322c');
const SHUTTER = [hex('#a3a8a6'), hex('#8f9a9f'), hex('#6f8ca3'), hex('#b8b3a6')];
const GOODS = [hex('#c0392b'), hex('#e0a526'), hex('#2e7d9a'), hex('#5b8c3a'), hex('#d96f9a'), hex('#efe6d2'), hex('#7b4f9a')];
const W1 = [1, 1, 1];

// the yard: the block, at most this far out; build() trims it off the mapped streets (offStreets), which run a few
// metres inside these lines on three sides, so the kerb stands at the carriageway's edge (on Nguyễn Trãi, u ~66.8)
const YU0 = -67.5, YU1 = 70, YV0 = -54.5, YV1 = 55;

// the trees standing in the market, (u, v, scale), from the satellite: four down the lane between the E and the stall
// halls, one in the south court; along Lê Đại Hành by the north-west corner block and along Đạm Phương by the kerb
// (sv-tvtrong-north shows the west side under heavy tree cover)
const TREES = [[15.2, -28.8, 1.1], [15.6, -9.9, 1.0], [15.2, 10.2, 1.0], [14.8, 30.2, 1.1], [-19.8, 23.1, 0.9],
  [-57.2, -53.3, 0.8], [-43.8, -52.6, 0.8], [-65.3, -32.6, 0.8], [-65.3, -16.8, 0.8], [-65.3, 1.5, 0.8], [-65.3, 20.2, 0.8],
  [-65.3, 44.5, 0.8]];
// the forecourt on Nguyễn Trãi: a planting strip just inside the pavement, either side of the way in, with a row of
// small street trees (Street View from Nguyễn Trãi); u from the hall fronts (53.9) to the kerb (66.8)
const STRIP_U = [62.3, 64.0], STRIPS = [[-50.5, -4.0], [10.0, 51.0]];
const KERB_TREES = [-46, -36.5, -27, -17.5, -8, 14, 23.5, 33, 42.5].map((v) => [63.15, v, 0.6]);

let Y0 = 0; // the yard's top: every building stands on it
const rnd = (i, s) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

function boxUV(S, u0, u1, v0, v1, a, b, col, opt?) {
  const p = P((u0 + u1) / 2, (v0 + v1) / 2);
  S.box(p[0], p[1], Y0 + a, Y0 + b, u1 - u0, v1 - v0, ANG, col, opt);
}
const W3 = (u, v, y) => { const p = P(u, v); return [p[0], Y0 + y, p[1]]; };

// a low gable of corrugated sheet over [u0,u1] x [v0,v1], ridge along the long side, eave at a, ridge at b
// (along: 'u' or 'v' forces the ridge's direction)
function gable(S, u0, u1, v0, v1, a, b, col, over = 0.6, along = null) {
  const keep = S.kind;
  S.kind = KIND.TILE; // corrugated sheet ribs & weathering, with a ridge cap
  const alongU = along ? along === 'u' : u1 - u0 >= v1 - v0;
  const A = alongU ? [u0 - over, u1 + over] : [v0 - over, v1 + over]; // along the ridge
  const B = alongU ? [v0 - over, v1 + over] : [u0 - over, u1 + over]; // across
  const m = (B[0] + B[1]) / 2, drop = (over * (b - a)) / ((B[1] - B[0]) / 2 - over);
  const Q = (s, t, y) => (alongU ? W3(s, t, y) : W3(t, s, y));
  const ya = a - drop;
  const e0 = [Q(A[0], B[0], ya), Q(A[1], B[0], ya)], e1 = [Q(A[0], B[1], ya), Q(A[1], B[1], ya)], r = [Q(A[0], m, b), Q(A[1], m, b)];
  const hint = (t) => { const p = Q((A[0] + A[1]) / 2, t, 0), c = Q((A[0] + A[1]) / 2, m, 0); return [p[0] - c[0], 2, p[2] - c[2]]; };
  S.quad(e0[0], e0[1], r[1], r[0], col, hint(B[0]));
  S.quad(e1[1], e1[0], r[0], r[1], shade(col, 0.86), hint(B[1]));
  S.beam([r[0][0], r[0][1] + 0.04, r[0][2]], [r[1][0], r[1][1] + 0.04, r[1][2]], 0.45, 0.12, shade(col, 0.7));
  // fascia boards along both eaves, a darker band under the sheet's edge
  for (const eg of e0.concat([]).length ? [e0, e1] : []) S.beam([eg[0][0], eg[0][1] - 0.1, eg[0][2]], [eg[1][0], eg[1][1] - 0.1, eg[1][2]], 0.12, 0.2, shade(col, 0.55));
  // the undersides, so the eaves read dark from below, and the gable ends in the wall colour
  S.kind = KIND.PLAIN;
  S.quad(r[0], r[1], e0[1], e0[0], shade(col, 0.45), [0, -1, 0]);
  S.quad(r[1], r[0], e1[0], e1[1], shade(col, 0.45), [0, -1, 0]);
  for (const k of [0, 1]) {
    const s = alongU ? (k ? u1 : u0) : (k ? v1 : v0);
    const g0 = Q(s, B[0] + over, a), g1 = Q(s, B[1] - over, a), gr = Q(s, m, b - 0.05);
    const hc = Q(s + (k ? 1 : -1), m, 0), hc0 = Q(s, m, 0);
    S.tri(g0, g1, gr, shade(WALL2, 0.95), [hc[0] - hc0[0], 0.1, hc[2] - hc0[2]]);
    S.tri(g1, g0, gr, shade(WALL2, 0.95), [hc0[0] - hc[0], 0.1, hc0[2] - hc[2]]);
  }
  S.kind = keep;
}

// stall bays along one side of a hall: roll-up shutters, some open on a dark stall with its goods, under a sheet awning
function bays(S, side, u0, u1, v0, v1, eave, seed, awning = 1.3, awnCol = ROOF_ZINC) {
  const alongU = side === 'v0' || side === 'v1';
  const L0 = alongU ? u0 : v0, L1 = alongU ? u1 : v1, fixed = side === 'v0' ? v0 : side === 'v1' ? v1 : side === 'u0' ? u0 : u1;
  const out = side === 'v0' || side === 'u0' ? -1 : 1;
  const n = Math.max(1, Math.round((L1 - L0) / 3.3)), s = (L1 - L0) / n;
  const top = Math.min(2.4, eave - 0.3);
  const rect = (a0, a1, w0, w1, y0, y1, col) => (alongU ? boxUV(S, a0, a1, Math.min(w0, w1), Math.max(w0, w1), y0, y1, col) : boxUV(S, Math.min(w0, w1), Math.max(w0, w1), a0, a1, y0, y1, col));
  for (let i = 0; i < n; i++) {
    const a0 = L0 + i * s + 0.18, a1 = L0 + (i + 1) * s - 0.18, r = rnd(seed + i, 3);
    if (r < 0.55) {
      rect(a0, a1, fixed, fixed + out * 0.06, 0.12, top, DARK); // the open stall
      rect(a0 + 0.2, a1 - 0.2, fixed + out * 0.06, fixed + out * 0.5, 0.12, 0.9, GOODS[Math.floor(rnd(seed + i, 5) * GOODS.length)]); // its counter of goods
    } else rect(a0, a1, fixed, fixed + out * 0.08, 0.12, top, SHUTTER[Math.floor(rnd(seed + i, 7) * SHUTTER.length)]);
  }
  if (awning > 0) {
    // the awning, one sheet the length of the side, sloping out from just under the eave
    const w0 = fixed, w1 = fixed + out * awning, ya = top + 0.25, yb = top - 0.05;
    const q = (a, w, y) => (alongU ? W3(a, w, y) : W3(w, a, y));
    const k = S.kind;
    S.kind = KIND.PLAIN;
    const c0 = q(L0, w0, ya), c1 = q(L1, w0, ya), c2 = q(L1, w1, yb), c3 = q(L0, w1, yb);
    S.quad(c0, c1, c2, c3, awnCol, [0, 1, 0]);
    S.quad(c1, c0, c3, c2, shade(awnCol, 0.5), [0, -1, 0]);
    S.kind = k;
  }
}

// the street face of a front stall hall: a band of shop sign boards hung at the eave, and blue and purple tarps
// slung from under it down over the stall fronts (Street View on Nguyễn Trãi); side as in bays(), L0..L1 along it,
// ya the roof's edge height, over its overhang
const SIGNS = [hex('#f1efe8'), hex('#2f5fa8'), hex('#c8352a'), hex('#e9c23c'), hex('#e8e2d0'), hex('#3f7fbf'), hex('#d9822b')];
const TARPS = [hex('#3256a8'), hex('#5a4c9c'), hex('#2a3f7a'), hex('#4f7fc4'), hex('#6c5aa8')];
function shopFront(S, side, L0, L1, fixed, ya, seed, over = 0.6) {
  const alongU = side === 'v0' || side === 'v1', out = side === 'v0' || side === 'u0' ? -1 : 1;
  const rect = (a0, a1, w0, w1, y0, y1, col) => (alongU ? boxUV(S, a0, a1, Math.min(w0, w1), Math.max(w0, w1), y0, y1, col) : boxUV(S, Math.min(w0, w1), Math.max(w0, w1), a0, a1, y0, y1, col));
  const q = (a, w, y) => (alongU ? W3(a, w, y) : W3(w, a, y));
  const y1 = ya - 0.12, y0 = Math.max(ya - 0.8, 2.42), wb = fixed + out * (over - 0.08);
  S.kind = KIND.PLAIN;
  for (let a = L0 + 0.15, i = 0; a < L1 - 0.6; i++) {
    const b = Math.min(L1 - 0.15, a + 2.8 + rnd(seed + i, 1) * 4.2), col = SIGNS[Math.floor(rnd(seed + i, 2) * SIGNS.length)];
    rect(a, b, wb, wb + out * 0.1, y0, y1, col);
    // a line of lettering in a contrasting colour
    const ink = col === SIGNS[0] || col === SIGNS[4] || col === SIGNS[3] ? hex('#b3201c') : hex('#f4f1e6');
    if (b - a > 1.6 && y1 - y0 > 0.35) rect(a + 0.35, b - 0.35, wb + out * 0.1, wb + out * 0.13, y0 + (y1 - y0) * 0.3, y0 + (y1 - y0) * 0.7, ink);
    a = b + 0.06;
  }
  // the tarps, in runs with gaps, slung steeply from under the boards
  for (let a = L0 + 0.3, i = 0; a < L1 - 1; i++) {
    const b = Math.min(L1 - 0.3, a + 2.5 + rnd(seed + i, 5) * 4), col = TARPS[Math.floor(rnd(seed + i, 6) * TARPS.length)];
    if (rnd(seed + i, 7) < 0.72) {
      const w0 = wb - out * 0.02, w1 = fixed + out * (over + 0.75), yb = 1.75 + rnd(seed + i, 8) * 0.25;
      const c0 = q(a, w0, y0 - 0.02), c1 = q(b, w0, y0 - 0.02), c2 = q(b, w1, yb), c3 = q(a, w1, yb);
      S.quad(c0, c1, c2, c3, col, alongU ? [0, 1, 0] : [0, 1, 0]);
      S.quad(c1, c0, c3, c2, shade(col, 0.55), [0, -1, 0]);
    }
    a = b + 0.4 + rnd(seed + i, 9) * 1.2;
  }
}

// a single-storey hall: rendered walls on a low plinth, a gable roof, stall bays on its long sides (or all four); the
// side named by front gets the street face (shopFront) instead of an awning
function hall(S, u0, u1, v0, v1, top, roof, seed, { all = false, eave = null, awnings = true, awn = ROOF_ZINC, front = null }: Record<string, any> = {}) {
  const e = eave ?? top - Math.min(1.2, Math.max(0.6, Math.min(u1 - u0, v1 - v0) * 0.065));
  S.kind = KIND.PLAIN;
  boxUV(S, u0 - 0.1, u1 + 0.1, v0 - 0.1, v1 + 0.1, 0, 0.3, PLINTH);
  boxUV(S, u0, u1, v0, v1, 0.3, e, shade(WALL, 0.94 + rnd(seed, 1) * 0.1));
  gable(S, u0, u1, v0, v1, e, top, shade(roof, 0.92 + rnd(seed, 2) * 0.14));
  const alongU = u1 - u0 >= v1 - v0;
  const sides = all ? ['v0', 'v1', 'u0', 'u1'] : alongU ? ['v0', 'v1'] : ['u0', 'u1'];
  sides.forEach((sd, k) => bays(S, sd, u0, u1, v0, v1, e, seed * 13 + k * 101, awnings && sd !== front ? 1.3 : 0, awn));
  if (front) {
    // the roof's edge on that side: the eave less the drop over the overhang (as gable() draws it)
    const half = (alongU ? v1 - v0 : u1 - u0) / 2, eaveSide = (front === 'u0' || front === 'u1') !== alongU;
    const ya = eaveSide ? e - (0.6 * (top - e)) / half : e;
    const fixed = front === 'v0' ? v0 : front === 'v1' ? v1 : front === 'u0' ? u0 : u1;
    const vs = front === 'u0' || front === 'u1';
    shopFront(S, front, vs ? v0 : u0, vs ? v1 : u1, fixed, ya, seed * 31);
  }
}

// a corner block or porch: the same walls, shutters all round, its gable across the hall's. A corner block (face set)
// turns its gable end to the street, as the north-west one shows on Lê Đại Hành (sv-ldhanh-se): a pale cream gable
// with a wide, low segmental lunette, glazed between mullions, over a grey concrete canopy, and a short sheet lean-to,
// its edge trimmed in blue, out over the steps. vents names a side with a band of breeze-block grilles over its stall
// openings (the Đạm Phương side, sv-tvtrong-north).
function pavilion(S, u0, u1, v0, v1, top, roof, seed, { face = null, eave = top - 0.9, lean = 0, vents = null }: Record<string, any> = {}) {
  const e = eave;
  S.kind = KIND.PLAIN;
  boxUV(S, u0 - 0.1, u1 + 0.1, v0 - 0.1, v1 + 0.1, 0, 0.3, PLINTH);
  boxUV(S, u0, u1, v0, v1, 0.3, e, WALL_PAV);
  gable(S, u0, u1, v0, v1, e, top, roof, 0.6, face ? 'v' : null);
  for (const sd of ['v0', 'v1', 'u0', 'u1']) bays(S, sd, u0, u1, v0, v1, Math.min(e, 3.0), seed * 7 + sd.charCodeAt(1), 0);
  if (vents) grilles(S, vents, u0, u1, v0, v1, 2.55, Math.min(e - 0.15, 3.25));
  if (!face) return;
  const out = face === 'v0' ? -1 : 1, vf = face === 'v0' ? v0 : v1, um = (u0 + u1) / 2, hw = (u1 - u0) / 2;
  // the gable end in the cream render, a moulded cornice, the lunette over it
  const g = (du, y, d = 0) => W3(um + du, vf + out * (0.04 + d), y);
  const hint = [V[0] * out, 0.1, V[1] * out];
  S.tri(g(-hw, e), g(hw, e), g(0, top - 0.05), WALL_PAV, hint);
  boxUV(S, u0 - 0.2, u1 + 0.2, vf + out * 0.02 - 0.25, vf + out * 0.02 + 0.25, e - 0.25, e, shade(WALL_PAV, 0.92)); // the cornice
  // a segment of a circle on the cornice: chord 2cw, rise h
  const cw = Math.min(1.3, hw * 0.42), h = Math.min(0.6, (top - e) * (1 - cw / hw) * 0.9), base = e + 0.04;
  const R = (cw * cw + h * h) / (2 * h), yc = base + h - R, a0 = Math.asin(cw / R), segs = 10;
  const arc = (k, s = 1) => { const t = -a0 + (2 * a0 * k) / segs; return [R * s * Math.sin(t), yc + R * s * Math.cos(t)]; };
  const GLASS = hex('#aab4b5'), RIM = shade(WALL_PAV, 1.08);
  for (let k = 0; k < segs; k++) {
    const [x0, y0] = arc(k), [x1, y1] = arc(k + 1);
    S.tri(g(0, base, 0.03), g(x0, y0, 0.03), g(x1, y1, 0.03), GLASS, hint);
    const [p0, q0] = arc(k, 1.1), [p1, q1] = arc(k + 1, 1.1);
    S.quad(g(x0, y0, 0.035), g(p0, Math.max(q0, base), 0.035), g(p1, Math.max(q1, base), 0.035), g(x1, y1, 0.035), RIM, hint);
  }
  for (let m = 1; m < 6; m++) {
    const x = -cw + (2 * cw * m) / 6, y = yc + Math.sqrt(R * R - x * x);
    S.beam(g(x, base, 0.06), g(x, y, 0.06), 0.06, 0.05, DARK);
  }
  // the canopy slab, grey concrete, a metre out
  boxUV(S, u0 + 0.3, u1 - 0.3, Math.min(vf, vf + out * 1.1), Math.max(vf, vf + out * 1.1), e - 0.55, e - 0.4, hex('#b4b2ab'));
  // the lean-to: one sheet (rusty, under fallen leaves) from under the slab out over the steps, a blue-painted edge,
  // a few thin posts
  if (lean > 0) {
    const w0 = vf, w1 = vf + out * lean, ya = e - 0.6, yb = 2.3, col = hex('#7a5a3c');
    const k = S.kind;
    S.kind = KIND.PLAIN;
    const c0 = W3(u0 - 0.3, w0, ya), c1 = W3(u1 + 0.3, w0, ya), c2 = W3(u1 + 0.3, w1, yb), c3 = W3(u0 - 0.3, w1, yb);
    S.quad(c0, c1, c2, c3, col, [0, 1, 0]);
    S.quad(c1, c0, c3, c2, shade(col, 0.5), [0, -1, 0]);
    S.beam(W3(u0 - 0.3, w1, yb - 0.08), W3(u1 + 0.3, w1, yb - 0.08), 0.06, 0.18, hex('#2e5fa8'));
    for (let u = u0; u <= u1 + 0.01; u += (u1 - u0) / 3) { const p = P(u, w1 - out * 0.15); S.cyl(p[0], p[1], Y0, Y0 + yb - 0.15, 0.05, 0.05, 4, DARK, { cap: false }); }
    S.kind = k;
  }
}

// breeze-block grilles in the wall over the stall openings of one side: dark panels behind a grid in the wall colour
function grilles(S, side, u0, u1, v0, v1, y0, y1) {
  const alongU = side === 'v0' || side === 'v1';
  const L0 = alongU ? u0 : v0, L1 = alongU ? u1 : v1, fixed = side === 'v0' ? v0 : side === 'v1' ? v1 : side === 'u0' ? u0 : u1;
  const out = side === 'v0' || side === 'u0' ? -1 : 1;
  const rect = (a0, a1, w0, w1, b0, b1, col) => (alongU ? boxUV(S, a0, a1, Math.min(w0, w1), Math.max(w0, w1), b0, b1, col) : boxUV(S, Math.min(w0, w1), Math.max(w0, w1), a0, a1, b0, b1, col));
  const pt = (a, w, y) => (alongU ? W3(a, w, y) : W3(w, a, y));
  const n = Math.max(1, Math.round((L1 - L0) / 2.6)), s = (L1 - L0) / n;
  S.kind = KIND.PLAIN;
  for (let i = 0; i < n; i++) {
    const a0 = L0 + i * s + 0.45, a1 = L0 + (i + 1) * s - 0.45;
    rect(a0, a1, fixed, fixed + out * 0.04, y0, y1, DARK);
    const w = fixed + out * 0.07;
    for (let k = 1; k < 3; k++) { const y = y0 + ((y1 - y0) * k) / 3; S.beam(pt(a0, w, y), pt(a1, w, y), 0.05, 0.06, WALL_PAV); }
    const m = Math.max(2, Math.round((a1 - a0) / 0.3));
    for (let k = 1; k < m; k++) { const a = a0 + ((a1 - a0) * k) / m; S.beam(pt(a, w, y0), pt(a, w, y1), 0.05, 0.06, WALL_PAV); }
  }
}

// a lean-to of sheet on posts against a wall: from the wall line (fixed, at height ya) out by depth (to yb), along
// [L0, L1]; side as in bays(). Built in runs of varied colour, as the stall-holders' roofs are.
function leanTo(S, side, L0, L1, fixed, depth, ya, yb, cols, seed, run = 7) {
  const alongU = side === 'v0' || side === 'v1';
  const out = side === 'v0' || side === 'u0' ? -1 : 1;
  const q = (a, w, y) => (alongU ? W3(a, w, y) : W3(w, a, y));
  const k = S.kind;
  S.kind = KIND.PLAIN;
  for (let a = L0, i = 0; a < L1 - 0.1; i++) {
    const b = Math.min(L1, a + run * (0.6 + rnd(seed + i, 2) * 0.8)), col = cols[Math.floor(rnd(seed + i, 4) * cols.length)];
    const dy = (rnd(seed + i, 6) - 0.5) * 0.12, w1 = fixed + out * depth;
    const c0 = q(a, fixed, ya + dy), c1 = q(b, fixed, ya + dy), c2 = q(b, w1, yb + dy), c3 = q(a, w1, yb + dy);
    S.quad(c0, c1, c2, c3, col, [0, 1, 0]);
    S.quad(c1, c0, c3, c2, shade(col, 0.5), [0, -1, 0]);
    const pp = alongU ? P(a + 0.2, w1 - out * 0.15) : P(w1 - out * 0.15, a + 0.2);
    S.cyl(pp[0], pp[1], Y0, Y0 + yb + dy, 0.04, 0.04, 4, DARK, { cap: false });
    a = b;
  }
  S.kind = k;
}

// the oval hall at the head of the middle bar (its mapped outline), under a low cone of sheet
const OVAL = [[-37.8, -11.6], [-36.0, -14.7], [-32.5, -15.7], [-27.9, -15.9], [-24.5, -14.1], [-22.7, -11.3], [-22.8, 14.0], [-24.4, 16.6], [-27.3, 18.7], [-32.5, 18.8], [-36.0, 17.2], [-37.5, 14.7]];

// the market's name on the gate, as a picture (red board, yellow letters)
function signTexture(THREE) {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 96;
  const g = cv.getContext('2d');
  g.fillStyle = '#b3201c'; g.fillRect(0, 0, 512, 96);
  g.strokeStyle = '#f2c94c'; g.lineWidth = 4; g.strokeRect(6, 6, 500, 84);
  const text = 'CHỢ TÂY LỘC'.normalize('NFC');
  let px = 58;
  const font = () => `800 ${px}px "Helvetica Neue", Arial, "Segoe UI", Roboto, "Noto Sans", sans-serif`;
  g.font = font();
  const tw = g.measureText(text).width;
  if (tw > 440) { px *= 440 / tw; g.font = font(); }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#f7d54a';
  g.fillText(text, 256, 52);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function build({ data, S, group, THREE }) {
  // the yard's level: the highest ground under the block, so no corner sinks into it
  let top = -Infinity;
  for (let u = YU0; u <= YU1 + 0.1; u += 11) for (let v = YV0; v <= YV1 + 0.1; v += 11) { const p = P(u, v); top = Math.max(top, rise(p[0], p[1])); }
  Y0 = LAND_Y + top + 0.22;

  // ---- the yard: concrete over the whole block, a kerb round it, open round the trees ----
  // The satellite shows big shade trees standing in the market: a row of four down the lane between the E and the
  // stall halls, one in the south court, and lines along Lê Đại Hành and Đạm Phương over the stall lean-tos (Street
  // View); along Nguyễn Trãi a planting strip at the kerb with a row of small street trees. The shared tree builder
  // plants them (data.trees) where no tall cover stands near, and a paved court counts as tall (S.paved); so the yard
  // is laid in small tiles (the coverage test reads a triangle a little past its edges, a few per cent of its size),
  // and round each tree an apron of the same paving is left out of S.paved, with a soil pit at the trunk.
  const ring = offStreets(data, [P(YU0, YV0), P(YU1, YV0), P(YU1, YV1), P(YU0, YV1)]);
  const inRing = (x, z) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, zi] = ring[i], [xj, zj] = ring[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
  const edgeDist = (x, z) => { let d = Infinity; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [ax, az] = ring[j], [bx, bz] = ring[i], dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))); d = Math.min(d, Math.hypot(x - ax - t * dx, z - az - t * dz)); } return d; };
  const disk = (c, r, n = 14) => Array.from({ length: n }, (_, k) => { const a = (k / n) * Math.PI * 2; return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]; });
  const rectUV = (u0, u1, v0, v1) => [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)];
  const pits = [];
  for (const [u, v, sc] of TREES) {
    const c = P(u, v);
    if (!inRing(c[0], c[1])) continue;
    const r = 2.2 * sc + 1.9, pr = Math.min(1.2 * sc + 0.3, edgeDist(c[0], c[1]) - 0.15);
    pits.push({ u, v, sc, r, c, pit: pr > 0.4 ? disk(c, pr, 10) : null });
  }
  const kerb = KERB_TREES.map(([u, v, sc]) => ({ u, v, sc, r: 2.2 * sc + 1.9, c: P(u, v), pit: null }));
  const strips = STRIPS.map(([v0, v1]) => rectUV(STRIP_U[0], STRIP_U[1], v0, v1));
  const aprons = pits.map((p) => [disk(p.c, p.r)]).concat(STRIPS.map(([v0, v1]) => [rectUV(59.8, 68, v0 - 2, v1 + 2)]));
  const ringP = [ring];
  const fill = (mp, y, col, kind) => {
    const keep = S.kind;
    S.kind = kind;
    for (const poly of mp) {
      const rs = poly.map((r) => r.slice(0, -1).map(([x, z]) => new T3.Vector2(x, z)));
      const faces = T3.ShapeUtils.triangulateShape(rs[0], rs.slice(1)), pts = [].concat(...rs);
      for (const f of faces) { const a = pts[f[0]], b = pts[f[1]], d = pts[f[2]]; S.tri([a.x, y, a.y], [b.x, y, b.y], [d.x, y, d.y], col, [0, 1, 0]); }
    }
    S.kind = keep;
  };
  // a low rim facing into a sunken bed
  const rim = (r, col) => { for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; S.quad([a[0], Y0 - 0.12, a[1]], [b[0], Y0 - 0.12, b[1]], [b[0], Y0, b[1]], [a[0], Y0, a[1]], col, [C[0] - m[0], 0.001, C[1] - m[1]]); } };
  S.kind = KIND.PLAIN;
  S.prism(ring, Y0 - 1.0, Y0, KERB, PAVE, { top: false });
  const n0 = S.n;
  for (let u = YU0 - 2; u < YU1 + 2; u += 12) for (let v = YV0 - 2; v < YV1 + 2; v += 12) {
    const cell = polygonClipping.intersection([rectUV(u, u + 12, v, v + 12)], ringP);
    if (cell.length) fill(polygonClipping.difference(cell, ...aprons), Y0, PAVE, KIND.ROAD);
  }
  (S.paved = S.paved || []).push([n0, S.n]);
  const beds = pits.filter((p) => p.pit).map((p) => [p.pit]).concat(strips.map((r) => [r]));
  fill(polygonClipping.difference(polygonClipping.intersection((polygonClipping.union as any)(...aprons), ringP), ...beds), Y0, PAVE, KIND.ROAD);
  S.kind = KIND.PLAIN;
  for (const p of pits) if (p.pit) { S.prism(p.pit, Y0 - 1.0, Y0 - 0.12, KERB, hex('#7d6a52'), { topKind: KIND.GROUND }); rim(p.pit, KERB); }
  for (const r of strips) { S.prism(r, Y0 - 1.0, Y0 - 0.12, KERB, hex('#6f7a4c'), { topKind: KIND.GROUND }); rim(r, KERB); }
  S.kind = KIND.PLAIN;
  if (Array.isArray(data.trees)) for (const p of pits.concat(kerb)) data.trees.push(Math.round(p.c[0] * 10), Math.round(p.c[1] * 10), Math.round(p.sc * 10), 0);
  const nearPit = (u, v, m) => pits.some((p) => Math.hypot(u - p.u, v - p.v) < p.r + m);

  // ---- the main hall: the E on the west half (survey 3.5 m to the top) ----
  const HT = 3.5;
  hall(S, -57.3, -45.3, -34.3, 37.8, HT, ROOF_HALL, 1, { all: false, awnings: false }); // the back wing, on the back street
  hall(S, -45.3, 7.2, 36.7, 50.3, HT, ROOF_HALL, 2); // the arm on the south-south-east street
  hall(S, -44.7, 8.5, -45.9, -33.4, HT, hex('#5d3c35'), 3); // the arm on Lê Đại Hành, its sheet dark maroon (Street View)
  hall(S, -22.8, 1.2, -6.0, 9.4, HT, ROOF_HALL, 4, { all: true }); // the middle bar
  hall(S, -45.3, -37.7, -3.0, 5.5, HT - 0.3, ROOF_HALL, 5, { awnings: false }); // its link to the back wing
  // the corner blocks and the back porch. The north-west corner on Lê Đại Hành (sv-ldhanh-se, sv-gate-lane-west): a
  // narrow pale gable bay at the corner (about 6 m wide, eave 3.4, apex 4.4), its end to the street, beside a plain
  // block under a darker sheet; the south-west one on Đạm Phương turns a wide gable to Thân Trọng Một, breeze-block
  // grilles over its stall openings (sv-tvtrong-north)
  pavilion(S, -60.6, -54.6, -48.6, -34.3, 4.4, ROOF_HALL, 7, { face: 'v0', eave: 3.4, lean: 1.8, vents: 'u0' });
  pavilion(S, -54.6, -45.3, -48.6, -34.3, 4.0, hex('#8e4a3a'), 17, { eave: 3.2 });
  pavilion(S, -61.6, -45.3, 37.8, 52.2, 4.4, ROOF_HALL, 6, { face: 'v1', eave: 3.4, lean: 1.2, vents: 'u0' });
  pavilion(S, -61.0, -57.3, -6.6, 8.5, HT, ROOF_HALL, 8); // the back porch
  // the stall-holders' lean-tos: dark green and olive sheet out over the pavement of Đạm Phương (Street View), and grey
  // corrugated sheet down the inner side of the back wing, in the courts (satellite)
  const GREENS = [hex('#3f5a3c'), hex('#5a6038'), hex('#4c5b47'), hex('#6b6a48')], GREYS = [hex('#9aa0a0'), hex('#8d9496'), hex('#a7aaa6')];
  leanTo(S, 'u0', -34.3, -6.6, -57.3, 3.7, 2.55, 2.15, GREENS, 71);
  leanTo(S, 'u0', 8.5, 37.8, -57.3, 3.7, 2.55, 2.15, GREENS, 72);
  leanTo(S, 'u0', 38.3, 51.7, -61.6, 1.2, 2.55, 2.25, GREENS, 75, 5);
  // and two square green stall canopies on poles at the kerb by the south-west corner
  for (const v of [38.5, 50.5]) { const p = P(-64.2, v); S.cyl(p[0], p[1], Y0, Y0 + 2.3, 0.04, 0.04, 4, DARK, { cap: false }); boxUV(S, -65.3, -63.1, v - 1.1, v + 1.1, 2.3, 2.38, GREENS[0]); }
  leanTo(S, 'u1', -32.0, -3.0, -45.3, 7.0, 2.55, 2.2, GREYS, 73, 9);
  leanTo(S, 'u1', 5.5, 35.3, -45.3, 7.0, 2.55, 2.2, GREYS, 74, 9);
  // the oval hall: walls on the mapped outline, a low cone of sheet, a small vent lantern
  {
    const ov = OVAL.map(([u, v]) => P(u, v)), ovOut = OVAL.map(([u, v]) => P(-30.2 + (u + 30.2) * 1.06, 1.5 + (v - 1.5) * 1.04));
    S.kind = KIND.PLAIN;
    S.prism(ov, Y0, Y0 + 0.3, PLINTH, PLINTH);
    S.prism(ov, Y0 + 0.3, Y0 + 2.8, shade(WALL, 0.98), WALL, { top: false });
    S.prism(ovOut, Y0 + 2.7, Y0 + 3.7, ROOF_HALL, shade(ROOF_HALL, 0.9), { scaleTop: 0.35, centre: P(-30.2, 1.5) });
    S.kind = KIND.PLAIN;
    boxUV(S, -31.5, -29, -2, 5, 3.7, 4.2, WALL2, { top: shade(ROOF_HALL, 0.85) });
    for (let i = 0; i < OVAL.length; i++) {
      const [u, v] = OVAL[i];
      if (Math.abs(v - 1.5) < 13) continue; // shutters round the two rounded ends
      const c = P(-30.2 + (u + 30.2) * 1.01, 1.5 + (v - 1.5) * 1.01), p = S;
      p.box(c[0], c[1], Y0 + 0.3, Y0 + 2.3, 1.6, 0.1, ANG + Math.atan2(v - 1.5, u + 30.2) + Math.PI / 2, i % 2 ? DARK : SHUTTER[i % 4]);
    }
    bays(S, 'u0', -37.8, -22.7, -11.3, 14.0, 2.8, 51, 1.2, ROOF_HALL);
    bays(S, 'u1', -37.8, -22.7, -11.3, 14.0, 2.8, 52, 1.2, ROOF_HALL);
  }

  // ---- in the courts of the E: the two-storey block (survey 7.7 m) under a dark brown gable (satellite), a low hall
  // and two sheds ----
  S.kind = KIND.FACADE;
  boxUV(S, -14.0, 9.0, 18.3, 31.1, 0, 6.2, WALL2, { top: shade(PAVE, 0.95), topKind: KIND.FLAT });
  S.kind = KIND.PLAIN;
  boxUV(S, -14.15, 9.15, 18.15, 31.25, 3.3, 3.5, shade(WALL2, 0.85));
  gable(S, -14.0, 9.0, 18.3, 31.1, 6.2, 7.7, hex('#5f463b'), 0.6, 'u');
  bays(S, 'v0', -14.0, 9.0, 18.3, 31.1, 3.0, 61, 1.4, ROOF_BLUE);
  bays(S, 'v1', -14.0, 9.0, 18.3, 31.1, 3.0, 62, 1.4, ROOF_BLUE);
  hall(S, -12.6, 10.2, -26.0, -13.3, 3.0, hex('#87513f'), 9);
  hall(S, -37.0, -30.7, 22.0, 35.3, 3.5, ROOF_ZINC, 10, { awnings: false });
  hall(S, -36.4, -30.2, -29.2, -19.0, 3.5, ROOF_ZINC, 11, { awnings: false });

  // ---- the stall halls on the east half, either side of the lane from Nguyễn Trãi (survey heights) ----
  // roofs: rust-red and dark brown corrugated sheet, as the satellite shows them; on the street front a band of shop
  // signs at the eave and blue and purple tarps under it (Street View). The south front hall reads about 3.8 m to the
  // ridge on Street View, above the survey's 3.0.
  hall(S, 21.8, 41.0, -29.4, 0.6, 4.5, hex('#8f4f3c'), 12, { all: true });
  hall(S, 21.3, 40.5, 6.6, 34.8, 3.5, hex('#6e4c40'), 13, { all: true });
  hall(S, 12.85, 39.6, -45.6, -34.9, 3.0, hex('#5e4a42'), 14);
  hall(S, 13.45, 40.15, 38.8, 49.5, 4.0, hex('#5f5550'), 15);
  hall(S, 43.6, 53.9, -45.6, -1.5, 4.0, hex('#94503d'), 16, { all: true, front: 'u1' });
  hall(S, 43.4, 53.5, 7.0, 50.5, 3.8, hex('#8a5040'), 17, { all: true, eave: 3.1, front: 'u1' });

  // ---- the courts and the lane under the stall-holders' tarpaulins and sheets: the mottled grey, white, black and
  // blue the satellite shows between the halls, clear of the trees and of the lane's middle ----
  const TCOL = [hex('#d8d8d2'), hex('#a9adab'), hex('#7d8384'), hex('#3b3f42'), hex('#2f5e9e'), hex('#c9c3b2'), hex('#4f6a50')];
  const COURTS = [[-37.0, 12.0, -32.6, -6.8], [-37.0, 9.0, 10.2, 35.8], [9.5, 20.6, -34.0, 37.8]];
  const KEEP = [[-13.4, 11.0, -26.8, -12.5], [-37.2, -29.4, -30.0, -18.2], [-37.8, -29.9, 21.2, 36.1], [-15.5, 10.5, 16.8, 32.6], [-24.3, 2.7, -7.5, 10.9], [-38.4, -22.0, -17.0, 20.0], [9.0, 21.0, -0.6, 7.6]];
  for (let i = 0, k = 0; i < 600 && k < 95; i++) {
    const [a0, a1, b0, b1] = COURTS[i % 3], u = a0 + rnd(i, 21) * (a1 - a0), v = b0 + rnd(i, 22) * (b1 - b0);
    const w = 2.2 + rnd(i, 23) * 2.4, d = 1.8 + rnd(i, 24) * 1.8;
    const box = [u - w / 2, u + w / 2, v - d / 2, v + d / 2];
    if (box[0] < a0 || box[1] > a1 || box[2] < b0 || box[3] > b1) continue;
    if (KEEP.some(([k0, k1, l0, l1]) => box[1] > k0 && box[0] < k1 && box[3] > l0 && box[2] < l1)) continue;
    if (nearPit(u, v, Math.hypot(w, d) / 2 + 0.6)) continue;
    const y = 2.3 + rnd(i, 25) * 0.45, tilt = 0.15 + rnd(i, 26) * 0.2, col = TCOL[Math.floor(rnd(i, 27) * TCOL.length)];
    const c0 = W3(box[0], box[2], y + tilt), c1 = W3(box[1], box[2], y + tilt), c2 = W3(box[1], box[3], y - tilt), c3 = W3(box[0], box[3], y - tilt);
    S.quad(c0, c1, c2, c3, col, [0, 1, 0]);
    S.quad(c1, c0, c3, c2, shade(col, 0.5), [0, -1, 0]);
    const pp = P(box[0] + 0.2, box[3] - 0.2);
    S.cyl(pp[0], pp[1], Y0, Y0 + y - tilt, 0.035, 0.035, 4, DARK, { cap: false });
    k++;
  }

  // ---- the gate at the lane's mouth on Nguyễn Trãi (Street View): two yellow pillars and a lintel under a red tiled
  // roof, a smaller roof over it, the market's name on a red board between the two, a flag on top ----
  const GU = 54.6, GC = 2.75, TILE_RED = hex('#a8442f'), GOLD = hex('#d8b448');
  S.kind = KIND.PLAIN;
  for (const v of [GC - 3, GC + 3]) boxUV(S, GU - 0.35, GU + 0.35, v - 0.35, v + 0.35, 0, 4.1, GOLD);
  boxUV(S, GU - 0.4, GU + 0.4, GC - 3.4, GC + 3.4, 3.6, 4.1, GOLD);
  gable(S, GU - 0.65, GU + 0.65, GC - 3.65, GC + 3.65, 4.1, 4.7, TILE_RED, 0.6, 'v');
  S.kind = KIND.PLAIN;
  boxUV(S, GU - 0.3, GU + 0.3, GC - 2.15, GC + 2.15, 4.35, 5.5, GOLD);
  boxUV(S, GU + 0.3, GU + 0.36, GC - 1.95, GC + 1.95, 4.5, 5.35, hex('#8e1c18'));
  gable(S, GU - 0.35, GU + 0.35, GC - 2.35, GC + 2.35, 5.5, 5.95, TILE_RED, 0.45, 'v');
  S.kind = KIND.PLAIN;
  {
    const p = P(GU, GC);
    S.cyl(p[0], p[1], Y0 + 5.9, Y0 + 7.6, 0.03, 0.03, 5, DARK, { cap: false });
    const f0 = W3(GU, GC + 0.03, 6.95), f1 = W3(GU, GC + 0.93, 6.95), f2 = W3(GU, GC + 0.93, 7.55), f3 = W3(GU, GC + 0.03, 7.55);
    S.quad(f0, f1, f2, f3, hex('#d42a1e'), [U[0], 0.1, U[1]]);
    S.quad(f1, f0, f3, f2, hex('#d42a1e'), [-U[0], 0.1, -U[1]]);
  }
  // a billboard on posts over the south front hall's street slope (Street View), plain panels
  S.kind = KIND.PLAIN;
  for (const v of [10.5, 15.5, 20.5]) { const p = P(52.3, v); S.cyl(p[0], p[1], Y0 + 3.2, Y0 + 4.0, 0.05, 0.05, 4, DARK, { cap: false }); }
  boxUV(S, 52.24, 52.36, 9.5, 21.5, 3.9, 5.5, hex('#f2efe6'));
  boxUV(S, 52.36, 52.4, 9.8, 15.3, 4.05, 5.35, hex('#c8352a'));
  boxUV(S, 52.36, 52.4, 15.7, 21.2, 4.05, 5.35, hex('#2f5fa8'));

  // ---- the forecourt: open paving where motorbikes stand in rows before the front halls and cars park nearer the
  // kerb (Street View) ----
  const BIKE = [hex('#2b2b2e'), hex('#b8b9bb'), hex('#8e1c18'), hex('#e8e6df'), hex('#1f3f7a'), hex('#4a4a4d')];
  for (const [v0, v1] of ([[-44, -4], [9.5, 49]] as any[])) for (let v = v0, i = 0; v < v1; v += 0.75, i++) {
    if (rnd(i + v0, 31) < 0.22) continue;
    const du = (rnd(i + v0, 32) - 0.5) * 0.4;
    boxUV(S, 55.4 + du, 57.2 + du, v - 0.15, v + 0.15, 0.25, 0.8, BIKE[Math.floor(rnd(i + v0, 33) * BIKE.length)]);
    boxUV(S, 55.9 + du, 56.7 + du, v - 0.13, v + 0.13, 0.8, 0.95, DARK);
  }
  for (const [v, col] of ([[18, hex('#d9dadb')], [-25, hex('#3a3d44')]] as any[])) {
    boxUV(S, 58.6, 60.4, v - 2.2, v + 2.2, 0.2, 0.95, col);
    boxUV(S, 58.75, 60.25, v - 1.2, v + 1.0, 0.95, 1.45, shade(col, 0.6));
  }
  const brolly = (u, v, col, r = 1.3) => { const p = P(u, v); S.cyl(p[0], p[1], Y0, Y0 + 2.2, 0.03, 0.03, 4, DARK, { cap: false }); S.cyl(p[0], p[1], Y0 + 1.9, Y0 + 2.45, r, 0.05, 8, col); };
  [[16, 3], [5, -0.5], [18.5, -1]].forEach(([u, v], i) => { if (!nearPit(u, v, 1.5)) brolly(u, v, [hex('#2f63b5'), hex('#d9502f'), hex('#f0c419')][i % 3]); });
  S.kind = KIND.PLAIN;

  if (!group) return null;
  // the name on the gate's board, facing the street
  const tex = signTexture(THREE);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0 });
  {
    const p = P(GU + 0.37, GC);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 0.75), mat);
    m.position.set(p[0], Y0 + 4.925, p[1]);
    m.rotation.y = Math.atan2(U[0], U[1]);
    m.userData.landmark = 'tayloc';
    group.add(m);
  }
  // after dark: warm strips under the awnings along the lane and the yard, and under the gate's lintel
  const L = new Buf(400);
  const line = (u0, v0, u1, v1, y) => L.beam(W3(u0, v0, y), W3(u1, v1, y), 0.1, 0.1, W1);
  line(GU + 0.45, GC - 2.9, GU + 0.45, GC + 2.9, 3.5);
  for (const [u0, u1, v] of ([[43.6, 53.9, -2.9], [43.4, 53.5, 8.4], [21.8, 41.0, 2.0], [21.3, 40.5, 5.2], [-22.8, 1.2, -7.4], [-22.8, 1.2, 10.8], [-44.7, 8.5, -32.0], [-45.3, 7.2, 35.3]] as any[])) line(u0, v, u1, v, 2.45);
  for (const [u, v0, v1, y = 2.45] of ([[-44.6, -32, 35.3, 2.3], [42.2, -45.6, 50.5], [20.0, -29.4, 34.8]] as any[])) line(u, v0, u, v1, y);
  const m = new THREE.Mesh(L.geometry(), lightMaterial(0xffc274, 1.2));
  m.renderOrder = 19;
  m.userData.landmark = 'tayloc';
  group.add(m);
  return null;
}
