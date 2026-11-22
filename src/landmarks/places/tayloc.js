import { Buf, KIND, hex, shade } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { lightMaterial } from '../../geo/materials.js';
import { offStreets } from '../enclosure.js';

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
//    at the middle of the block: the market gate. Before it, the flea market on tarpaulins (vinwonders.com).
// Estimated: roof forms (low gables of corrugated sheet, the oval hall's a low cone), colours, the gate's form and sign,
// stall bays, awnings, tarpaulins and umbrellas; the lit strips (the market keeps open to 22:00).
//
// Frame: the block's centre C; u along the side streets toward Nguyễn Trãi (east-north-east), v toward the street on
// the south-south-east side. hue.json's footprints, converted, are listed below in (u, v) metres.
export const id = 'tayloc';

const C = [-2304.25, -492.5];
const UL = Math.hypot(0.807, -0.586), U = [0.807 / UL, -0.586 / UL], V = [-U[1], U[0]];
const ANG = Math.atan2(U[1], U[0]);
const P = (u, v) => [C[0] + U[0] * u + V[0] * v, C[1] + U[1] * u + V[1] * v];

const WALL = hex('#ead7a2'), WALL2 = hex('#e4dccb'), PLINTH = hex('#9b968c');
const ROOF_HALL = hex('#9a4c3b'), ROOF_ZINC = hex('#8c9598'), ROOF_BLUE = hex('#5f7f97');
const PAVE = hex('#bdb6a8'), KERB = hex('#a29c90'), DARK = hex('#3a322c');
const SHUTTER = [hex('#a3a8a6'), hex('#8f9a9f'), hex('#6f8ca3'), hex('#b8b3a6')];
const GOODS = [hex('#c0392b'), hex('#e0a526'), hex('#2e7d9a'), hex('#5b8c3a'), hex('#d96f9a'), hex('#efe6d2'), hex('#7b4f9a')];
const TARP = [hex('#2f63b5'), hex('#3d7dd0'), hex('#d9502f'), hex('#3e8f5a')];
const W1 = [1, 1, 1];

// the yard: the block, at most this far out; build() trims it off the mapped streets (offStreets), which run a few
// metres inside these lines on three sides, so the kerb stands at the carriageway's edge
const YU0 = -67.5, YU1 = 64.5, YV0 = -54.5, YV1 = 55;

// the trees standing in the market, (u, v, scale), from the satellite: four down the lane between the E and the stall
// halls, one in the south court; along Lê Đại Hành by the north-west corner block and along Đạm Phương over the
// lean-tos (those whose pit would leave the trimmed yard are left out)
const TREES = [[15.2, -28.8, 1.1], [15.6, -9.9, 1.0], [15.2, 10.2, 1.0], [14.8, 30.2, 1.1], [-19.8, 23.1, 0.9],
  [-57.2, -52.8, 0.8], [-43.8, -51.6, 0.8], [-64.8, -32.6, 0.8], [-64.8, -16.8, 0.8], [-65.0, 1.5, 0.8], [-64.8, 20.2, 0.8]];

let Y0 = 0; // the yard's top: every building stands on it
const rnd = (i, s) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

function boxUV(S, u0, u1, v0, v1, a, b, col, opt) {
  const p = P((u0 + u1) / 2, (v0 + v1) / 2);
  S.box(p[0], p[1], Y0 + a, Y0 + b, u1 - u0, v1 - v0, ANG, col, opt);
}
const W3 = (u, v, y) => { const p = P(u, v); return [p[0], Y0 + y, p[1]]; };

// a low gable of corrugated sheet over [u0,u1] x [v0,v1], ridge along the long side, eave at a, ridge at b
// (along: 'u' or 'v' forces the ridge's direction)
function gable(S, u0, u1, v0, v1, a, b, col, over = 0.6, along = null) {
  const keep = S.kind;
  S.kind = KIND.PLAIN; // sheet, not tile: flat colour, with a ridge cap
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

// a single-storey hall: rendered walls on a low plinth, a gable roof, stall bays on its long sides (or all four)
function hall(S, u0, u1, v0, v1, top, roof, seed, { all = false, eave = null, awnings = true, awn = ROOF_ZINC } = {}) {
  const e = eave ?? top - Math.min(1.2, Math.max(0.6, Math.min(u1 - u0, v1 - v0) * 0.065));
  S.kind = KIND.PLAIN;
  boxUV(S, u0 - 0.1, u1 + 0.1, v0 - 0.1, v1 + 0.1, 0, 0.3, PLINTH);
  boxUV(S, u0, u1, v0, v1, 0.3, e, shade(WALL, 0.94 + rnd(seed, 1) * 0.1));
  gable(S, u0, u1, v0, v1, e, top, shade(roof, 0.92 + rnd(seed, 2) * 0.14));
  const alongU = u1 - u0 >= v1 - v0;
  const sides = all ? ['v0', 'v1', 'u0', 'u1'] : alongU ? ['v0', 'v1'] : ['u0', 'u1'];
  sides.forEach((sd, k) => bays(S, sd, u0, u1, v0, v1, e, seed * 13 + k * 101, awnings ? 1.3 : 0, typeof awn === 'function' ? awn(sd) : awn));
}

// a corner block or porch: the same walls, shutters all round, its gable across the hall's. A corner block (face set)
// turns its gable end to the street, as the north-west one shows on Lê Đại Hành (Street View): a cream gable with an
// arched lunette in a fan of glazing bars, a concrete canopy slab across it, and a sheet lean-to out over the
// pavement under the trees
function pavilion(S, u0, u1, v0, v1, top, roof, seed, face = null, eave = top - 0.9, lean = 3.0) {
  const e = eave;
  S.kind = KIND.PLAIN;
  boxUV(S, u0 - 0.1, u1 + 0.1, v0 - 0.1, v1 + 0.1, 0, 0.3, PLINTH);
  boxUV(S, u0, u1, v0, v1, 0.3, e, shade(WALL, 0.97));
  gable(S, u0, u1, v0, v1, e, top, roof, 0.6, face ? 'v' : null);
  for (const sd of ['v0', 'v1', 'u0', 'u1']) bays(S, sd, u0, u1, v0, v1, Math.min(e, 3.0), seed * 7 + sd.charCodeAt(1), 0);
  if (!face) return;
  const out = face === 'v0' ? -1 : 1, vf = face === 'v0' ? v0 : v1, um = (u0 + u1) / 2, hw = (u1 - u0) / 2;
  // the gable end in the cream render, a moulded verge, the lunette over the canopy
  const g = (du, y, d = 0) => W3(um + du, vf + out * (0.04 + d), y);
  const hint = [V[0] * out, 0.1, V[1] * out];
  S.tri(g(-hw, e), g(hw, e), g(0, top - 0.05), WALL, hint);
  boxUV(S, u0 - 0.2, u1 + 0.2, vf + out * 0.02 - 0.25, vf + out * 0.02 + 0.25, e - 0.25, e, shade(WALL, 0.9)); // the cornice
  const R = Math.min(1.5, (top - e) * 0.9), yc = e + 0.05, segs = 12;
  for (let i = 0; i < segs; i++) {
    const t0 = (Math.PI * i) / segs, t1 = (Math.PI * (i + 1)) / segs;
    const p0 = g(R * Math.cos(t0), yc + R * Math.sin(t0), 0.03), p1 = g(R * Math.cos(t1), yc + R * Math.sin(t1), 0.03), c = g(0, yc, 0.03);
    const q0 = g(R * 1.18 * Math.cos(t0), yc + R * 1.18 * Math.sin(t0), 0.02), q1 = g(R * 1.18 * Math.cos(t1), yc + R * 1.18 * Math.sin(t1), 0.02);
    const glass = i % 3 === 1 ? shade(DARK, 1.6) : DARK;
    S.tri(c, p0, p1, glass, hint);
    S.quad(p0, q0, q1, p1, shade(WALL, 1.06), hint);
  }
  // the canopy slab, grey concrete, a metre out
  boxUV(S, u0 + 0.6, u1 - 0.6, Math.min(vf, vf + out * 1.1), Math.max(vf, vf + out * 1.1), e - 0.55, e - 0.4, shade(PLINTH, 0.95));
  // the lean-to: one brown sheet from under the slab out over the pavement, on a few thin posts
  if (lean > 0) {
    const w0 = vf, w1 = vf + out * lean, ya = e - 0.6, yb = 2.25, col = hex('#6f5139');
    const k = S.kind;
    S.kind = KIND.PLAIN;
    const c0 = W3(u0 - 1.5, w0, ya), c1 = W3(u1 + 1.5, w0, ya), c2 = W3(u1 + 1.5, w1, yb), c3 = W3(u0 - 1.5, w1, yb);
    S.quad(c0, c1, c2, c3, col, [0, 1, 0]);
    S.quad(c1, c0, c3, c2, shade(col, 0.5), [0, -1, 0]);
    for (let u = u0 - 1.2; u <= u1 + 1.3; u += (u1 - u0 + 2.4) / 4) { const p = P(u, w1 - out * 0.15); S.cyl(p[0], p[1], Y0, Y0 + yb, 0.05, 0.05, 4, DARK, { cap: false }); }
    S.kind = k;
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
  // stall halls, one in the south court, and a line along Lê Đại Hành and Đạm Phương over the stall lean-tos (Street
  // View). Each stands in an unpaved pit cut in the yard, so the shared tree builder may plant it (data.trees).
  const ring = offStreets(data, [P(YU0, YV0), P(YU1, YV0), P(YU1, YV1), P(YU0, YV1)]);
  const inRing = (x, z) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, zi] = ring[i], [xj, zj] = ring[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
  // A pit is cut in a 16 m square of its own (the coverage test reads a big triangle a little past its edges, so the
  // yard's long triangles must not reach the pit), and the square is cut out of the yard.
  const pits = [];
  for (const [u, v, sc] of TREES) {
    const r = 2.2 * sc + 1.9, c = P(u, v), H = 8;
    const circ = Array.from({ length: 12 }, (_, k) => { const a = (k / 12) * Math.PI * 2; return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]; });
    const sq = [P(u - H, v - H), P(u + H, v - H), P(u + H, v + H), P(u - H, v + H)];
    if (!sq.every(([x, z]) => inRing(x, z))) continue; // the square would run off the yard: leave the tree out
    pits.push({ u, v, sc, r, c, circ, sq });
  }
  const n0 = S.n;
  S.kind = KIND.PLAIN;
  S.prism(ring, Y0 - 1.0, Y0, KERB, PAVE, { topKind: KIND.ROAD, holes: pits.map((p) => p.sq) });
  for (const p of pits) S.prism(p.sq, Y0 - 0.3, Y0, PAVE, PAVE, { topKind: KIND.ROAD, holes: [p.circ] });
  (S.paved = S.paved || []).push([n0, S.n]);
  for (const p of pits) {
    S.prism(p.circ, Y0 - 1.0, Y0 - 0.12, KERB, hex('#7d6a52'), { topKind: KIND.GROUND });
    if (Array.isArray(data.trees)) data.trees.push(Math.round(p.c[0] * 10), Math.round(p.c[1] * 10), Math.round(p.sc * 10), 0);
  }
  const nearPit = (u, v, m) => pits.some((p) => Math.hypot(u - p.u, v - p.v) < p.r + m);

  // ---- the main hall: the E on the west half (survey 3.5 m to the top) ----
  const HT = 3.5;
  hall(S, -57.3, -45.3, -34.3, 37.8, HT, ROOF_HALL, 1, { all: false, awnings: false }); // the back wing, on the back street
  hall(S, -45.3, 7.2, 36.7, 50.3, HT, ROOF_HALL, 2); // the arm on the south-south-east street
  hall(S, -44.7, 8.5, -45.9, -33.4, HT, ROOF_HALL, 3); // the arm on the north-north-west street
  hall(S, -22.8, 1.2, -6.0, 9.4, HT, ROOF_HALL, 4, { all: true }); // the middle bar
  hall(S, -45.3, -37.7, -3.0, 5.5, HT - 0.3, ROOF_HALL, 5, { awnings: false }); // its link to the back wing
  // the corner blocks, gable ends to the side streets (the north-west one on Street View: about 5 m to the apex, above
  // the survey's 3.5 m for the whole hall), and the back porch
  pavilion(S, -61.6, -45.3, 37.8, 52.2, 5.0, ROOF_HALL, 6, 'v1', 3.3, 2.2);
  pavilion(S, -60.6, -45.3, -49.3, -34.3, 5.0, ROOF_HALL, 7, 'v0', 3.3, 2.6);
  pavilion(S, -61.0, -57.3, -6.6, 8.5, HT, ROOF_HALL, 8); // the back porch
  // the stall-holders' lean-tos: dark green and olive sheet out over the pavement of Đạm Phương (Street View), and grey
  // corrugated sheet down the inner side of the back wing, in the courts (satellite)
  const GREENS = [hex('#3f5a3c'), hex('#5a6038'), hex('#4c5b47'), hex('#6b6a48')], GREYS = [hex('#9aa0a0'), hex('#8d9496'), hex('#a7aaa6')];
  leanTo(S, 'u0', -34.3, -6.6, -57.3, 3.7, 2.55, 2.15, GREENS, 71);
  leanTo(S, 'u0', 8.5, 37.8, -57.3, 3.7, 2.55, 2.15, GREENS, 72);
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
  // roofs: rust-red and dark brown corrugated sheet, as the satellite shows them; blue tarpaulin awnings along the
  // street front (Street View)
  const front = (sd) => (sd === 'u1' ? ROOF_BLUE : ROOF_ZINC);
  hall(S, 21.8, 41.0, -29.4, 0.6, 4.5, hex('#8f4f3c'), 12, { all: true });
  hall(S, 21.3, 40.5, 6.6, 34.8, 3.5, hex('#6e4c40'), 13, { all: true });
  hall(S, 12.85, 39.6, -45.6, -34.9, 3.0, hex('#5e4a42'), 14);
  hall(S, 13.45, 40.15, 38.8, 49.5, 4.0, hex('#5f5550'), 15);
  hall(S, 43.6, 53.9, -45.6, -1.5, 4.0, hex('#94503d'), 16, { all: true, awn: front });
  hall(S, 43.4, 53.5, 7.0, 50.5, 3.0, hex('#8a5040'), 17, { all: true, awn: front });

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

  // ---- the street front on Nguyễn Trãi: no gateway stands at the lane's mouth (Street View shows an open forecourt
  // where cars and motorbikes park); the market's name is a board on the roof edge of the front hall by the lane ----
  const GU = 54.05, GV0 = -12.2, GV1 = -2.2, GH = 3.0;
  S.kind = KIND.PLAIN;
  boxUV(S, GU - 0.05, GU + 0.12, GV0 - 0.15, GV1 + 0.15, GH - 0.1, GH + 1.25, hex('#8e1c18'));
  // the flea market before the market: goods on tarpaulins either side of the way in, a few umbrellas
  const LV0 = -2.4, LV1 = 8.4;
  for (let i = 0; i < 14; i++) {
    const side = i % 2 ? 1 : -1, v = side > 0 ? LV1 + 2 + Math.floor(i / 2) * 3.1 : LV0 - 2 - Math.floor(i / 2) * 3.1;
    const u = 58.5 + rnd(i, 9) * 3, w = 2.2 + rnd(i, 10) * 0.8;
    boxUV(S, u - w / 2, u + w / 2, v - 1.2, v + 1.2, 0.0, 0.05, TARP[i % TARP.length]);
    boxUV(S, u - w / 3, u + w / 3, v - 0.7, v + 0.7, 0.05, 0.3, GOODS[(i * 3) % GOODS.length]);
  }
  const brolly = (u, v, col, r = 1.3) => { const p = P(u, v); S.cyl(p[0], p[1], Y0, Y0 + 2.2, 0.03, 0.03, 4, DARK, { cap: false }); S.cyl(p[0], p[1], Y0 + 1.9, Y0 + 2.45, r, 0.05, 8, col); };
  [[56, -6], [56.5, 12], [59, -16], [59.5, 20], [16, 3], [5, -0.5], [18.5, -1]].forEach(([u, v], i) => { if (!nearPit(u, v, 1.5)) brolly(u, v, [hex('#2f63b5'), hex('#d9502f'), hex('#f0c419'), hex('#efe6d2')][i % 4]); });
  S.kind = KIND.PLAIN;

  if (!group) return null;
  // the name on the board, facing the street
  const tex = signTexture(THREE);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0 });
  {
    const p = P(GU + 0.135, (GV0 + GV1) / 2);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(GV1 - GV0, 1.15), mat);
    m.position.set(p[0], Y0 + GH + 0.575, p[1]);
    m.rotation.y = Math.atan2(U[0], U[1]);
    m.userData.landmark = 'tayloc';
    group.add(m);
  }
  // after dark: warm strips under the awnings along the lane and the yard, and under the name board
  const L = new Buf(400);
  const line = (u0, v0, u1, v1, y) => L.beam(W3(u0, v0, y), W3(u1, v1, y), 0.1, 0.1, W1);
  line(GU + 0.4, GV0, GU + 0.4, GV1, GH - 0.25);
  for (const [u0, u1, v] of [[43.6, 53.9, -2.9], [43.4, 53.5, 8.4], [21.8, 41.0, 2.0], [21.3, 40.5, 5.2], [-22.8, 1.2, -7.4], [-22.8, 1.2, 10.8], [-44.7, 8.5, -32.0], [-45.3, 7.2, 35.3]]) line(u0, v, u1, v, 2.45);
  for (const [u, v0, v1, y = 2.45] of [[-44.6, -32, 35.3, 2.3], [42.2, -45.6, 50.5], [20.0, -29.4, 34.8]]) line(u, v0, u, v1, y);
  const m = new THREE.Mesh(L.geometry(), lightMaterial(0xffc274, 1.2));
  m.renderOrder = 19;
  m.userData.landmark = 'tayloc';
  group.add(m);
  return null;
}
