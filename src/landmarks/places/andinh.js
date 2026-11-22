import { KIND, hex, shade } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { glowPoints } from '../../geo/materials.js';
import { fence, roadsNear, buildingsNear } from '../enclosure.js';

// Cung An Định, the palace of Khải Định and Bảo Đại on the north bank of the An Cựu, 179B Phan Đình Phùng.
// Sources and estimates: docs/places/andinh.md.
//
// Three structures survive in the walled grounds (23,463 m²): Khải Tường Lâu (1917-18, three storeys, 22 rooms,
// 745 m²), a European palace in ochre-yellow stucco with white trim and quoins, corner towers, a pillared porch
// under a balcony and a hipped roof of dark tiles (restored 2019-22); in front of it on the axis the octagonal Đình
// Trung Lập on a high base, with a two-tier roof (eight-sided below, a square hip above) and twelve dragons on the
// hips; and on the river the gate, two storeys, lime brick inlaid with porcelain and coloured glass, a pearl on its
// crest. A brick wall 0.5 m thick with an iron railing on top closes the grounds; across the street a stone stair
// (bến) runs down to the river on the axis.
//
// Frame: the mapped palace (OSM way 1172897446, 28.8 x 16.6 m) centred at C, u along the facade (toward the east
// end), v out of the front (SSE, toward the pavilion, the gate and the river).
export const id = 'andinh';

const C = [1008.95, 1355.83];
const ANG = Math.atan2(-0.4375, 0.8993);
const UX = Math.cos(ANG), UZ = Math.sin(ANG);
const P = (u, v) => [C[0] + u * UX - v * UZ, C[1] + u * UZ + v * UX];
const W = 28.8, D = 16.6, W2 = W / 2, D2 = D / 2;
const PAV = [-0.3, 17.7]; // Trung Lập (mapped round building, r ~3.6)
const GATE = [0, 25.8]; // where the axis meets the river wall

const STUCCO = hex('#e0c06e'), STUCCO2 = hex('#e8cb7e'), WHITE = hex('#f1ead8'), SHUT = hex('#5a3b2a');
const ROOF = hex('#6e4a3c'), STONE = hex('#8f8a80'), STONE2 = hex('#b3ab9a'), GLASS = hex('#2d3236');
const PAVW = hex('#dbb04c'), PAVROOF = hex('#4a443f'), LATTICE = hex('#4a3a2a'), DRAGON = hex('#7c8f80');
const GSTUC = hex('#b9b2a4'), RED = hex('#a3302a'), GOLD = hex('#d9a93a');
const MOSAIC = [hex('#6f8ea3'), hex('#e6dcc4'), hex('#c99a4a')];
const GRAVEL = hex('#c9bfae');
const BAL = hex('#8e918e'); // weathered grey balusters of the pavilion terrace

const gy = (p) => LAND_Y + rise(p[0], p[1]);
const vec = (u, v) => [u * UX - v * UZ, u * UZ + v * UX]; // a frame direction in world x/z

function fbox(S, u, v, y0, y1, su, sv, col, opts) { const p = P(u, v); S.box(p[0], p[1], y0, y1, su, sv, ANG, col, opts); }

// a wall face: centre (u, v) in the frame, tangent t and outward normal n as frame directions
function face(u, v, t, n) {
  const o = P(u, v), T = vec(t[0], t[1]), N = vec(n[0], n[1]);
  return { at: (s, out) => [o[0] + T[0] * s + N[0] * out, o[1] + T[1] * s + N[1] * out], ang: Math.atan2(T[1], T[0]), n: N };
}
function onFace(S, F, s, out, y0, y1, w, th, col) { const p = F.at(s, out); S.box(p[0], p[1], y0, y1, w, th, F.ang, col); }
// a half disc in the plane of a face (arched window heads, the gate's arch)
function fan(S, F, s, out, yc, r, col, seg = 6, full = false) {
  const p = (k) => { const a = (k / seg) * Math.PI * (full ? 2 : 1), q = F.at(s + r * Math.cos(a), out); return [q[0], yc + r * Math.sin(a), q[1]]; };
  const c = F.at(s, out), cc = [c[0], yc, c[1]], hint = [F.n[0], 0, F.n[1]];
  for (let k = 0; k < seg; k++) S.tri(cc, p(k), p(k + 1), col, hint);
}
// a window: white surround, dark shutters, arched or square head
function win(S, F, s, out, y0, h, w, arched) {
  onFace(S, F, s, out + 0.05, y0 - 0.12, y0 + h + 0.12, w + 0.3, 0.14, WHITE);
  onFace(S, F, s, out + 0.09, y0, y0 + h, w, 0.1, SHUT);
  if (arched) {
    fan(S, F, s, out + 0.125, y0 + h, w / 2 + 0.15, WHITE);
    fan(S, F, s, out + 0.145, y0 + h, w / 2, SHUT);
    onFace(S, F, s, out + 0.1, y0 + h + w / 2, y0 + h + w / 2 + 0.3, 0.3, 0.18, WHITE); // keystone
  } else onFace(S, F, s, out + 0.08, y0 + h + 0.12, y0 + h + 0.32, w + 0.5, 0.2, WHITE); // cornice head
}
// a balustrade between two world points: plinth, balusters, handrail
function balustrade(S, a, b, y, h, col = WHITE, step = 0.42) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  S.box(m[0], m[1], y, y + 0.14, len, 0.3, ang, col);
  S.box(m[0], m[1], y + h - 0.12, y + h, len + 0.1, 0.3, ang, col);
  const n = Math.max(1, Math.round(len / step));
  for (let k = 0; k < n; k++) {
    const f = (k + 0.5) / n, x = a[0] + (b[0] - a[0]) * f, z = a[1] + (b[1] - a[1]) * f;
    S.box(x, z, y + 0.14, y + h - 0.12, 0.13, 0.13, ang, col);
  }
}
const finial = (S, p, y0, h, col = WHITE) => { S.cyl(p[0], p[1], y0, y0 + h * 0.35, 0.22, 0.22, 6, col); S.cyl(p[0], p[1], y0 + h * 0.35, y0 + h, 0.24, 0.02, 6, col); };

// ---------------------------------------------------------------- Khải Tường Lâu
function palace(S, lamps) {
  const g = gy(C), fl = g + 1.2; // ground floor on a 1.2 m stone plinth
  const s1 = fl + 4.8, s2 = s1 + 4.4, cor = s2 + 0.4; // storey 1, storey 2, top of the main cornice
  // Plan (Street View and the satellite, 2025): two front wings at the ends of the mapped rectangle, WW wide and WD
  // deep, standing FR in front of the recessed centre; a tower over each wing's inner front corner; behind the wings
  // the satellite shows the east wing roofed to the back of the house, the west wing shorter with a two-storey block
  // behind it under a flat roof terrace; the centre carries the porch and the main hipped roof.
  const WW = 6.8, WD = 11.0, FR = 3.0, CU = W2 - WW, CV = D2 - FR; // CU: half width of the centre, CV: its front
  S.base = g - LAND_Y;
  // plinth of rough stone under the whole footprint, and the terrace before the porch with steps down the axis
  S.kind = KIND.MASONRY;
  fbox(S, 0, 0, g - 0.4, fl, W + 1.2, D + 1.2, STONE, { top: STONE2 });
  fbox(S, 0, CV + 1.6, g - 0.4, fl, 2 * CU - 1.0, 3.2, STONE, { top: STONE2 });
  S.kind = KIND.PLAIN;
  for (let k = 0; k < 5; k++) fbox(S, 0, CV + 3.2 + 0.36 * (k + 0.5), g - 0.2, fl - (k + 1) * (fl - g) / 5 + 0.02, 5.6, 0.36, STONE2);
  for (let k = 0; k < 4; k++) fbox(S, 0, -D2 - 0.6 - 0.36 * (k + 0.5), g - 0.2, fl - (k + 1) * (fl - g) / 4 + 0.02, 3.6, 0.36, STONE2);

  // the centre: two storeys, cornice, balustrade, hipped roof
  const cvc = (CV - D2) / 2, cd = CV + D2; // centre of the centre block along v, its depth
  fbox(S, 0, cvc, fl, cor, 2 * CU, cd, STUCCO);
  fbox(S, 0, CV + 0.3, fl, cor, 7.2, 0.6, STUCCO2); // the frontispiece behind the porch
  fbox(S, 0, -D2 - 0.3, fl, cor, 7.2, 0.6, STUCCO2);
  fbox(S, 0, cvc, s1 - 0.1, s1 + 0.2, 2 * CU + 0.3, cd + 0.3, WHITE);
  fbox(S, 0, cvc, s2, cor, 2 * CU + 0.8, cd + 0.8, WHITE);
  balustrade(S, P(-CU, CV + 0.65), P(CU, CV + 0.65), cor, 0.85);
  balustrade(S, P(CU, -D2 - 0.35), P(-CU, -D2 - 0.35), cor, 0.85);
  S.hip(...P(0, cvc), 2 * CU - 0.6, cd - 0.6, ANG, cor, 2.6, ROOF, { over: 0.2 });

  // the wings, the towers and the rear blocks
  const TS = 3.6, twTop = cor + 3.8;
  const wdOf = (su) => (su > 0 ? D : WD);
  for (const su of [-1, 1]) {
    const wd = wdOf(su), wu = su * (CU + WW / 2), wv = D2 - wd / 2;
    fbox(S, wu, wv, fl, cor, WW, wd, STUCCO);
    fbox(S, wu, wv, s1 - 0.1, s1 + 0.2, WW + 0.3, wd + 0.3, WHITE);
    fbox(S, wu, wv, s2, cor, WW + 0.8, wd + 0.8, WHITE);
    if (su > 0) continue;
    // rear block: two storeys, flat roof terrace with a balustrade
    fbox(S, wu, -WD / 2, fl, s2 + 0.3, WW, D - WD, STUCCO2);
    fbox(S, wu, -WD / 2, s2, s2 + 0.3, WW + 0.5, D - WD + 0.5, WHITE);
    balustrade(S, P(su * W2 + su * 0.1, -D2 - 0.1), P(su * CU, -D2 - 0.1), s2 + 0.3, 0.8);
    balustrade(S, P(su * W2 + su * 0.1, -D2 - 0.1), P(su * W2 + su * 0.1, D2 - WD), s2 + 0.3, 0.8);
  }
  for (const su of [-1, 1]) {
    const wd = wdOf(su), wu = su * (CU + WW / 2), wv = D2 - wd / 2;
    S.hip(...P(wu, wv), WW + 0.2, wd + 0.2, ANG, cor, 2.4, ROOF, { over: 0.2 });
    // tower over the wing's inner front corner, 0.3 m proud of the wing front and of its inner side
    const tu = su * (CU + TS / 2 - 0.3), tv = D2 - TS / 2 + 0.3;
    fbox(S, tu, tv, fl, twTop, TS, TS, STUCCO2);
    fbox(S, tu, tv, s1 - 0.1, s1 + 0.2, TS + 0.2, TS + 0.2, WHITE);
    fbox(S, tu, tv, s2, cor, TS + 0.5, TS + 0.5, WHITE);
    fbox(S, tu, tv, twTop, twTop + 0.35, TS + 0.5, TS + 0.5, WHITE);
    fbox(S, tu, tv, twTop + 0.35, twTop + 0.95, TS - 0.6, TS - 0.6, STUCCO2); // the crown's attic
    S.hip(...P(tu, tv), TS - 0.2, TS - 0.2, ANG, twTop + 0.95, 1.4, ROOF, { over: 0.15 });
    finial(S, P(tu, tv), twTop + 2.3, 1.1);
    for (const [a, b] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) finial(S, P(tu + a * (TS / 2), tv + b * (TS / 2)), twTop + 0.35, 0.7);
    // rusticated quoins on the wing's outer front corner and on the tower's front corners
    for (const [cu, cv, top] of [[su * W2, D2, cor - 0.4], [tu + su * TS / 2, tv + TS / 2, twTop - 0.2], [tu - su * TS / 2, tv + TS / 2, twTop - 0.2]]) {
      for (let y = fl, k = 0; y < top; y += 0.55, k++) { const big = k % 2 === 0 ? 0.62 : 0.4; fbox(S, cu, cv, y, y + 0.45, big, big, WHITE); }
    }
    // the wing front's balcony on storey 2, outside the tower
    const bu0 = su * W2, bu1 = su * (CU + TS - 0.3);
    fbox(S, (bu0 + bu1) / 2, D2 + 0.45, s1 - 0.15, s1 + 0.2, Math.abs(bu1 - bu0), 0.9, WHITE);
    balustrade(S, P(bu0, D2 + 0.8), P(bu1, D2 + 0.8), s1 + 0.2, 0.85);
    // the balustrade along the wing's outer end at the cornice
    balustrade(S, P(su * (W2 + 0.15), D2 - wd), P(su * (W2 + 0.15), D2), cor, 0.85);
  }

  // windows: arched on both storeys
  const front = face(0, CV, [1, 0], [0, 1]), back = face(0, -D2, [-1, 0], [0, -1]);
  for (const [s, out] of [[-2.4, 0.6], [0, 0.6], [2.4, 0.6], [-4.7, 0], [4.7, 0], [-6.6, 0], [6.6, 0]]) {
    if (Math.abs(s) < 3) win(S, front, s, out, fl + 0.3, 3.0, 1.2, true); // porch doors
    else win(S, front, s, out, fl + 0.6, 2.8, 1.0, true);
    win(S, front, s, out, s1 + 1.0, 2.2, 1.0, true);
  }
  for (const s of [-12.6, -10.4, -8.2, -5.8, -2.4, 0, 2.4, 5.8, 8.2, 10.4, 12.6]) {
    const out = Math.abs(s) < 3.6 ? 0.6 : 0;
    win(S, back, s, out, fl + 1.0, 2.3, 1.1, true);
    win(S, back, s, out, s1 + 1.0, 2.2, 1.1, true);
  }
  for (const su of [-1, 1]) {
    const wf = face(su * (CU + WW / 2), D2, [1, 0], [0, 1]);
    const outer = su * (WW / 2 - 1.6), tow = su * (-WW / 2 + TS / 2 - 0.3);
    win(S, wf, outer, 0, fl + 0.6, 2.8, 1.2, true);
    win(S, wf, outer, 0, s1 + 0.9, 2.4, 1.2, true);
    win(S, wf, tow, 0.3, fl + 0.6, 2.8, 1.1, true);
    win(S, wf, tow, 0.3, s1 + 1.0, 2.2, 1.0, true);
    win(S, wf, tow, 0.3, cor + 0.6, 1.8, 0.9, false);
    // the outer end: wing and rear block
    const side = face(su * W2, 0, [0, -su], [su, 0]);
    for (const s of [-6.0, -3.6, -1.2, 1.2, 4.6, 6.8]) { const ss = su > 0 ? -s : s; win(S, side, ss, 0, fl + 1.0, 2.3, 1.1, true); win(S, side, ss, 0, s1 + 1.0, 2.2, 1.05, true); }
  }

  // the porch: paired columns carrying the balcony of storey 2
  const pv = CV + 0.6, pd = 2.0;
  for (const u of [-3.2, -2.5, 2.5, 3.2]) {
    const p = P(u, pv + pd - 0.35);
    S.box(p[0], p[1], fl, fl + 0.35, 0.6, 0.6, ANG, WHITE);
    S.cyl(p[0], p[1], fl + 0.35, s1 - 0.5, 0.25, 0.22, 8, WHITE);
    S.box(p[0], p[1], s1 - 0.5, s1 - 0.2, 0.58, 0.58, ANG, WHITE);
  }
  fbox(S, 0, pv + pd / 2, s1 - 0.2, s1 + 0.25, 7.6, pd + 0.2, WHITE);
  balustrade(S, P(-3.7, pv + pd), P(3.7, pv + pd), s1 + 0.25, 0.9);
  for (const sg of [-1, 1]) balustrade(S, P(sg * 3.7, pv), P(sg * 3.7, pv + pd), s1 + 0.25, 0.9);
  // name board 啓祥樓 over the balcony door
  onFace(S, front, 0, 0.75, s2 - 0.75, s2 - 0.15, 2.4, 0.12, shade(SHUT, 0.8));
  onFace(S, front, 0, 0.8, s2 - 0.65, s2 - 0.25, 2.0, 0.1, GOLD);
  // the crest over the centre bay: a stepped stucco frontispiece with a medallion and finials
  onFace(S, front, 0, 0.45, cor, cor + 1.6, 6.4, 0.5, STUCCO2);
  onFace(S, front, 0, 0.45, cor + 1.6, cor + 2.4, 3.2, 0.5, STUCCO2);
  onFace(S, front, 0, 0.45, cor + 2.4, cor + 2.65, 3.6, 0.6, WHITE);
  onFace(S, front, 0, 0.45, cor + 1.5, cor + 1.65, 6.8, 0.6, WHITE);
  fan(S, front, 0, 0.72, cor + 1.0, 0.6, WHITE, 10, true);
  fan(S, front, 0, 0.74, cor + 1.0, 0.4, GOLD, 10, true);
  for (const s of [-3.1, 3.1]) { const q = front.at(s, 0.45); finial(S, q, cor + 1.65, 0.9); }
  finial(S, front.at(0, 0.45), cor + 2.65, 1.0);
  for (const u of [-2.6, 2.6]) { const q = P(u, CV + 3.0); lamps.push([q[0], fl + 0.5, q[1]]); }
  const pc = P(0, pv + 1.0); lamps.push([pc[0], s1 - 0.6, pc[1]]);
}

// ---------------------------------------------------------------- Đình Trung Lập
function pavilionTL(S, lamps) {
  // Street View (2025): a broad octagonal stone terrace with a balustrade, and on it the pavilion's own higher base;
  // stairs with heavy cheeks run down the west and east faces, across the axis (the front and west panos both show
  // the flight coming down toward the west walk).
  const c = P(PAV[0], PAV[1]), g = gy(c), t1 = g + 1.6, b1 = g + 2.5;
  const fAng = Math.atan2(UX, -UZ); // world angle of +v
  const rot = fAng + Math.PI / 8; // a flat face toward the palace and toward the gate
  const RL = 4.3, RU = 3.0, cp = Math.cos(Math.PI / 8);
  S.base = g - LAND_Y;
  S.kind = KIND.MASONRY;
  S.cyl(c[0], c[1], g - 0.3, t1, RL, RL, 8, STONE, { rot });
  S.kind = KIND.PLAIN;
  S.cyl(c[0], c[1], t1 - 0.12, t1 + 0.04, RL + 0.08, RL + 0.08, 8, STONE2, { rot });
  S.cyl(c[0], c[1], t1, b1, RU, RU, 8, STONE2, { rot });
  S.cyl(c[0], c[1], b1 - 0.15, b1 + 0.05, RU + 0.1, RU + 0.1, 8, WHITE, { rot });
  // the terrace balustrade, open on the two stair faces
  for (let i = 0; i < 8; i++) {
    const a0 = rot + (i * Math.PI) / 4, a1 = a0 + Math.PI / 4, am = (a0 + a1) / 2, r = RL - 0.2;
    if (Math.abs(Math.sin(am - fAng)) > 0.95) continue;
    balustrade(S, [c[0] + Math.cos(a0) * r, c[1] + Math.sin(a0) * r], [c[0] + Math.cos(a1) * r, c[1] + Math.sin(a1) * r], t1, 0.8, BAL, 0.4);
  }
  // stairs on the west and east faces: the long flight down from the terrace with its cheeks, a short one up to the base
  const nL = 7, runL = 0.3, apoL = RL * cp, apoU = RU * cp;
  for (const sg of [-1, 1]) {
    for (let k = 0; k < nL; k++) fbox(S, PAV[0] + sg * (apoL + runL * (k + 0.5)), PAV[1], g - 0.2, t1 - (k + 1) * (t1 - g) / nL + 0.02, runL, 2.0, STONE2);
    for (const sv of [-1, 1]) {
      const a = P(PAV[0] + sg * (apoL - 0.1), PAV[1] + sv * 1.2), b = P(PAV[0] + sg * (apoL + runL * nL + 0.2), PAV[1] + sv * 1.2);
      S.beam([a[0], t1, a[1]], [b[0], g, b[1]], 0.4, 1.6, STONE); // cheek, 0.8 m above the nosings
    }
    for (let k = 0; k < 3; k++) fbox(S, PAV[0] + sg * (apoU + 0.3 * (k + 0.5)), PAV[1], t1 - 0.1, b1 - (k + 1) * (b1 - t1) / 3 + 0.02, 0.3, 1.8, STONE2);
  }
  // eight columns and a low rail between them, open on the stair faces
  const colTop = b1 + 3.3, rc = 2.4;
  const corner = (i, r) => { const a = rot + (i * Math.PI) / 4; return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]; };
  for (let i = 0; i < 8; i++) {
    const q = corner(i, rc);
    S.box(q[0], q[1], b1, colTop, 0.34, 0.34, rot + (i * Math.PI) / 4, PAVW);
    const r = corner(i + 1, rc), mid = [(q[0] + r[0]) / 2, (q[1] + r[1]) / 2];
    const ang = Math.atan2(r[1] - q[1], r[0] - q[0]), len = Math.hypot(r[0] - q[0], r[1] - q[1]);
    const nrm = [Math.cos(rot + (i + 0.5) * Math.PI / 4), Math.sin(rot + (i + 0.5) * Math.PI / 4)];
    const onStair = Math.abs(nrm[0] * Math.sin(fAng) - nrm[1] * Math.cos(fAng)) > 0.95;
    if (!onStair) S.box(mid[0], mid[1], b1, b1 + 0.65, len - 0.34, 0.12, ang, shade(PAVW, 0.8));
    S.box(mid[0], mid[1], colTop - 0.55, colTop - 0.05, len, 0.1, ang, LATTICE); // carved frieze
  }
  S.cyl(c[0], c[1], colTop - 0.05, colTop + 0.2, 2.9, 2.9, 8, shade(PAVW, 0.7), { rot });
  // lower roof: eight-sided, sweeping out over the columns
  const y1 = colTop + 0.2, y2 = y1 + 1.25;
  S.kind = KIND.TILE;
  S.cyl(c[0], c[1], y1, y2, 4.2, 1.7, 8, PAVROOF, { cap: false, rot });
  S.kind = KIND.PLAIN;
  S.cyl(c[0], c[1], y1 - 0.06, y1, 4.2, 4.2, 8, shade(LATTICE, 0.8), { rot }); // the dark soffit seen from the court
  // drum with lattice, then the square upper hip
  S.box(c[0], c[1], y2 - 0.1, y2 + 0.85, 2.3, 2.3, fAng - Math.PI / 2, PAVW);
  S.box(c[0], c[1], y2 + 0.15, y2 + 0.65, 2.36, 2.36, fAng - Math.PI / 2, LATTICE);
  const y3 = y2 + 0.85;
  S.hip(c[0], c[1], 2.4, 2.4, fAng - Math.PI / 2, y3, 1.5, PAVROOF, { over: 0.55, flare: 0.3, hips: true, ridgeCol: DRAGON });
  // pearl finial
  S.cyl(c[0], c[1], y3 + 1.45, y3 + 1.75, 0.18, 0.18, 6, DRAGON);
  S.cyl(c[0], c[1], y3 + 1.75, y3 + 2.05, 0.26, 0.26, 8, GOLD);
  S.cyl(c[0], c[1], y3 + 2.05, y3 + 2.25, 0.26, 0.0, 8, GOLD);
  // dragons: eight on the corners of the lower roof, four on the hips above (12)
  for (let i = 0; i < 8; i++) {
    const e = corner(i, 4.2), m = corner(i, 3.0);
    S.beam([m[0], y1 + 0.55, m[1]], [e[0], y1 + 0.05, e[1]], 0.16, 0.18, DRAGON);
    const t = corner(i, 4.55);
    S.beam([e[0], y1 + 0.05, e[1]], [t[0], y1 + 0.6, t[1]], 0.12, 0.14, DRAGON);
  }
  for (let i = 0; i < 4; i++) {
    const a = fAng + Math.PI / 4 + (i * Math.PI) / 2, r = (2.4 / 2 + 0.55) * Math.SQRT2;
    const e = [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r], t = [c[0] + Math.cos(a) * (r + 0.35), c[1] + Math.sin(a) * (r + 0.35)];
    S.beam([e[0], y3 + 0.25, e[1]], [t[0], y3 + 0.8, t[1]], 0.12, 0.14, DRAGON);
  }
  lamps.push([c[0], colTop - 0.4, c[1]]);
}

// ---------------------------------------------------------------- the river gate
function gate(S, lamps) {
  const c = P(GATE[0], GATE[1]), g = gy(c), y = g + 0.3;
  const F = face(GATE[0], GATE[1], [1, 0], [0, 1]), B = face(GATE[0], GATE[1], [-1, 0], [0, -1]);
  S.base = g - LAND_Y;
  S.kind = KIND.MASONRY;
  fbox(S, GATE[0], GATE[1], g - 0.3, y, 7.6, 2.4, STONE, { top: STONE2 });
  S.kind = KIND.PLAIN;
  const T = 1.4; // wall thickness
  // the central bay with the arched door, its lintel band, and the upper storey
  fbox(S, GATE[0], GATE[1], y, y + 4.0, 3.1, T, GSTUC);
  fbox(S, GATE[0], GATE[1], y + 3.6, y + 4.0, 4.9, T + 0.2, WHITE);
  for (const X of [F, B]) {
    onFace(S, X, 0, T / 2, y, y + 2.0, 2.4, 0.1, WHITE);
    fan(S, X, 0, T / 2 + 0.06, y + 2.0, 1.2, WHITE, 8);
    onFace(S, X, 0, T / 2 + 0.05, y, y + 2.0, 2.1, 0.12, RED);
    fan(S, X, 0, T / 2 + 0.12, y + 2.0, 1.05, RED, 8);
    onFace(S, X, 0, T / 2 + 0.1, y + 3.62, y + 3.98, 1.8, 0.1, GOLD); // name board
  }
  // upper storey with an oculus, a little eave, the crest and the pearl
  fbox(S, GATE[0], GATE[1], y + 4.0, y + 6.1, 2.7, 1.2, GSTUC);
  for (const X of [F, B]) {
    fan(S, X, 0, 0.62, y + 5.05, 0.55, MOSAIC[1], 10, true);
    fan(S, X, 0, 0.64, y + 5.05, 0.38, MOSAIC[0], 10, true);
    for (const s of [-1.05, 1.05]) onFace(S, X, s, 0.6, y + 4.2, y + 5.9, 0.35, 0.1, MOSAIC[2]);
  }
  fbox(S, GATE[0], GATE[1], y + 6.1, y + 6.35, 3.3, 1.7, WHITE);
  fbox(S, GATE[0], GATE[1], y + 6.35, y + 6.9, 2.0, 0.7, GSTUC);
  fbox(S, GATE[0], GATE[1], y + 6.9, y + 7.05, 2.3, 0.8, WHITE);
  S.cyl(c[0], c[1], y + 7.05, y + 7.2, 0.2, 0.2, 6, GSTUC);
  S.cyl(c[0], c[1], y + 7.2, y + 7.55, 0.3, 0.3, 8, MOSAIC[1]);
  S.cyl(c[0], c[1], y + 7.55, y + 7.7, 0.3, 0.05, 8, MOSAIC[1]);
  // inner piers with turrets, outer wings lower with their own turrets; porcelain panels on both faces
  for (const sg of [-1, 1]) {
    const u1 = GATE[0] + sg * 1.98, u2 = GATE[0] + sg * 3.0, u3 = GATE[0] + sg * 3.35;
    fbox(S, u1, GATE[1], y, y + 5.4, 0.85, T + 0.3, GSTUC);
    fbox(S, u1, GATE[1], y + 5.4, y + 5.6, 1.05, T + 0.5, WHITE);
    fbox(S, u1, GATE[1], y + 5.6, y + 6.1, 0.6, 0.9, GSTUC);
    finial(S, P(u1, GATE[1]), y + 6.1, 0.55, MOSAIC[1]);
    fbox(S, u2, GATE[1], y, y + 3.2, 1.2, T, GSTUC);
    fbox(S, u2, GATE[1], y + 3.2, y + 3.4, 1.3, T + 0.2, WHITE);
    fbox(S, u3, GATE[1], y + 3.4, y + 3.9, 0.5, 0.8, GSTUC);
    finial(S, P(u3, GATE[1]), y + 3.9, 0.5, MOSAIC[1]);
    for (const X of [F, B]) {
      const s1 = X === F ? sg * 1.98 : -sg * 1.98, s2 = X === F ? sg * 2.85 : -sg * 2.85;
      const o1 = (T + 0.3) / 2, o2 = T / 2;
      onFace(S, X, s1, o1 + 0.03, y + 0.6, y + 2.6, 0.55, 0.06, MOSAIC[0]);
      onFace(S, X, s1, o1 + 0.03, y + 2.8, y + 3.4, 0.55, 0.06, MOSAIC[2]);
      onFace(S, X, s1, o1 + 0.03, y + 4.1, y + 5.2, 0.55, 0.06, MOSAIC[1]);
      onFace(S, X, s2, o2 + 0.03, y + 0.6, y + 2.0, 0.75, 0.06, MOSAIC[1]);
      onFace(S, X, s2, o2 + 0.03, y + 2.2, y + 2.9, 0.75, 0.06, MOSAIC[0]);
    }
    const lp = P(u1, GATE[1] + 0.9); lamps.push([lp[0], y + 3.2, lp[1]]);
  }
  return g;
}

// ---------------------------------------------------------------- the stair down to the An Cựu
function riverStair(S, g0) {
  const v0 = GATE[1] + 10.4, n = 8, run = 0.5, drop = 0.2;
  S.kind = KIND.MASONRY;
  S.base = g0 - 2.0 - LAND_Y;
  for (let k = 0; k < n; k++) fbox(S, GATE[0], v0 + run * (k + 0.5), g0 - 2.2, g0 - drop * (k + 1) + 0.02, 7.6, run, STONE2);
  for (const sg of [-1, 1]) {
    fbox(S, GATE[0] + sg * 4.05, v0 + (n * run) / 2, g0 - 2.2, g0 + 0.25, 0.5, n * run, STONE);
    fbox(S, GATE[0] + sg * 4.05, v0 + 0.3, g0 - 0.2, g0 + 0.9, 0.7, 0.7, STONE2);
  }
  S.kind = KIND.PLAIN;
}

export function build({ data, S, group }) {
  const lamps = [];
  palace(S, lamps);
  pavilionTL(S, lamps);
  const g0 = gate(S, lamps);
  riverStair(S, g0);
  // gravel court and the walk on the axis from the terrace to the gate
  S.kind = KIND.ROAD;
  S.base = 0;
  const cg = gy(P(0, 18));
  fbox(S, 0, 18.0, cg - 0.2, cg + 0.05, 16.0, 12.0, GRAVEL);
  fbox(S, 0, 23.6, cg - 0.2, gy(P(0, 23.6)) + 0.06, 3.0, 2.8, GRAVEL);
  S.kind = KIND.PLAIN;
  // the wall with its iron railing (0.5 m brick, 1.8 m high, railing on top), open at the gate
  const area = data.special && data.special.andinhArea;
  if (area) {
    const ring = [];
    for (let i = 0; i + 1 < area.ring.length; i += 2) ring.push([area.ring[i] / 10, area.ring[i + 1] / 10]);
    const gc = P(GATE[0], GATE[1]);
    fence(S, ring, { h: 2.5, plinth: 1.8, rail: true, t: 0.5, every: 3.6, postW: 0.6, postUp: 0.15, wall: STUCCO, cap: hex('#efe3c8'), iron: hex('#2f2b26'), pierW: 1.0, pierUp: 0.6 },
      { roads: roadsNear(data, C, 200), openings: [[gc[0], gc[1], 3.65]], solid: buildingsNear(data, C, 180) });
  }
  S.kind = KIND.PLAIN;
  S.base = 0;
  if (lamps.length) {
    const pos = [], col = [];
    for (const p of lamps) { pos.push(...p); col.push(1, 0.72, 0.4); }
    const pts = glowPoints(pos, col, 5);
    pts.userData.glow = true;
    pts.userData.landmark = id;
    group.add(pts);
  }
}
