import { KIND, hex, shade } from '../../geo/buf.ts';
import { LAND_Y } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { glowPoints } from '../../geo/materials.ts';
import { fence, roadsNear, buildingsNear } from '../enclosure.ts';

// Cung An Định, the palace of Khải Định and Bảo Đại on the north bank of the An Cựu, 179B Phan Đình Phùng.
// Sources and estimates: docs/places/andinh.md.
//
// Three structures survive in the walled grounds (23,463 m²): Khải Tường Lâu (1917-18, three storeys, 22 rooms,
// 745 m²), a European palace in pale lemon stucco with white trim and quoins, pedimented towers, a pillared porch
// under a balcony, a balustraded terrace along the front and a hipped roof of dark tiles (restored 2019-22); in front
// of it on the axis the octagonal Đình Trung Lập on a high base, slender columns under lattice and one broad
// eight-sided roof with a small raised cap, twelve dragons on its hips; and on the river the gate, a tam quan of
// three red arched doors between blue ceramic pilasters, a tiled eave and an upper tier with the pearl on its crest.
// A plain stucco wall under a tiled coping closes the grounds, which are thick with shade trees and fan palms;
// across the street a stone stair (bến) runs down to the river on the axis.
//
// Frame: the mapped palace (OSM way 1172897446, 28.8 x 16.6 m) centred at C, u along the facade (toward the east
// end), v out of the front (SSE, toward the pavilion, the gate and the river).
export const id = 'andinh';

const C = [1008.95, 1355.83];
const ANG = Math.atan2(-0.4375, 0.8993);
const UX = Math.cos(ANG), UZ = Math.sin(ANG);
const P = (u, v): [number, number] => [C[0] + u * UX - v * UZ, C[1] + u * UZ + v * UX];
const W = 28.8, D = 16.6, W2 = W / 2, D2 = D / 2;
const PAV = [-0.3, 17.7]; // Trung Lập (mapped round building, r ~3.6)
const GATE = [0, 25.8]; // where the axis meets the river wall

const STUCCO = hex('#e6d48e'), STUCCO2 = hex('#ecdc9e'), WHITE = hex('#f1ead8'), SHUT = hex('#5a3b2a');
const ROOF = hex('#6e4a3c'), STONE = hex('#8f8a80'), STONE2 = hex('#b3ab9a');
const PAVW = hex('#dbb04c'), PAVROOF = hex('#4a443f'), LATTICE = hex('#4a3a2a'), DRAGON = hex('#7c8f80');
const RED = hex('#a3302a'), GOLD = hex('#d9a93a');
const GRAVEL = hex('#c9bfae');
const BAL = hex('#8e918e'); // weathered grey balusters of the pavilion terrace

const gy = (p) => LAND_Y + rise(p[0], p[1]);
const vec = (u, v): [number, number] => [u * UX - v * UZ, u * UZ + v * UX]; // a frame direction in world x/z

function fbox(S, u, v, y0, y1, su, sv, col, opts?) { const p = P(u, v); S.box(p[0], p[1], y0, y1, su, sv, ANG, col, opts); }

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
  onFace(S, F, s, out + 0.09, y0, y0 + h + (arched ? 0.04 : 0), w, 0.1, SHUT); // overlap the arch so no seam shows at the spring
  if (arched) {
    fan(S, F, s, out + 0.125, y0 + h, w / 2 + 0.15, WHITE, 8);
    fan(S, F, s, out + 0.145, y0 + h, w / 2, SHUT, 8);
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
// Plan along v (the satellite at zoom 20 read with its parallax, about 0.19 m of northward shift per metre of height,
// measured on Trung Lập's roof against its plinth; the front and west panos for the elevations):
//   WF   front of the wings and towers          6.3      WH  front of the wings' hip roofs (flat-roofed bay ahead)  2.8
//   WR   rear of the wings                     -8.3      CR  rear of the centre (its roof's rear eave ~3 m past WR) -10.4
//   CUF  upper storey of the centre            2.3      CGF ground storey of the centre, with the terrace on it      4.3
//   PF   front of the porch                     7.0      AR  rear of the flat annexes behind the west half          -14.8
const WF = 6.3, WH = 2.8, WR = -8.3, CR = -10.4, CUF = 2.3, CGF = 4.3, PF = 7.0, AR = -14.8;
const WW = 6.8, CU = W2 - WW; // wing width; CU: half width of the centre

function palace(S, lamps) {
  const g = gy(C), fl = g + 1.2; // ground floor on a 1.2 m stone plinth
  const s1 = fl + 4.8, s2 = s1 + 4.4, cor = s2 + 0.4; // storey 1, storey 2, top of the main cornice
  S.base = g - LAND_Y;
  // plinth of rough stone under the house, and the porch platform with steps down the axis
  S.kind = KIND.MASONRY;
  fbox(S, 0, (WF + WR) / 2, g - 0.4, fl, W + 1.0, WF - WR + 1.0, STONE, { top: STONE2 });
  fbox(S, 0, (CR + WR) / 2 - 0.2, g - 0.4, fl, 2 * CU + 0.6, WR - CR + 1.0, STONE, { top: STONE2 });
  fbox(S, -(W2 + 0.8) / 2, (AR + WR) / 2, g - 0.4, fl - 0.6, W2 - 0.2, WR - AR + 0.6, STONE, { top: STONE2 });
  fbox(S, 0, (CGF + PF) / 2 + 0.2, g - 0.4, fl, 8.4, PF - CGF + 0.4, STONE, { top: STONE2 });
  S.kind = KIND.PLAIN;
  for (let k = 0; k < 4; k++) fbox(S, 0, PF + 0.2 + 0.35 * (k + 0.5), g - 0.2, fl - (k + 1) * (fl - g) / 4 + 0.02, 5.2, 0.35, STONE2);
  for (let k = 0; k < 4; k++) fbox(S, 0, CR - 0.5 - 0.36 * (k + 0.5), g - 0.2, fl - (k + 1) * (fl - g) / 4 + 0.02, 3.6, 0.36, STONE2);

  // the centre: the ground storey reaches CGF and carries a balustraded terrace along the whole front; the upper storey
  // stands back at CUF under the main hipped roof
  fbox(S, 0, (CR + CGF) / 2, fl, s1, 2 * CU, CGF - CR, STUCCO);
  fbox(S, 0, (CR + CGF) / 2, s1 - 0.1, s1 + 0.2, 2 * CU + 0.3, CGF - CR + 0.3, WHITE);
  fbox(S, 0, (CR + CUF) / 2, s1 + 0.2, cor, 2 * CU, CUF - CR, STUCCO);
  fbox(S, 0, CUF + 0.3, s1 + 0.2, cor, 7.2, 0.6, STUCCO2); // the frontispiece over the porch
  fbox(S, 0, CR - 0.3, fl, cor, 7.2, 0.6, STUCCO2);
  fbox(S, 0, (CR + CUF) / 2, s2, cor, 2 * CU + 0.8, CUF - CR + 0.8, WHITE);
  for (const sg of [-1, 1]) balustrade(S, P(sg * CU, CGF + 0.05), P(sg * 3.9, CGF + 0.05), s1 + 0.2, 0.85); // the terrace
  balustrade(S, P(-CU, CUF + 0.65), P(CU, CUF + 0.65), cor, 0.85);
  balustrade(S, P(CU, CR - 0.35), P(-CU, CR - 0.35), cor, 0.85);
  S.hip(...P(0, (CR + CUF) / 2), 2 * CU - 0.6, CUF - CR - 0.6, ANG, cor, 2.6, ROOF, { over: 0.2 });

  // the wings: two storeys; a hip roof from WR to WH, and ahead of it the flat-roofed front bay with its balustrade
  const TS = 3.6, twTop = cor + 3.8;
  for (const su of [-1, 1]) {
    const wu = su * (CU + WW / 2), wv = (WF + WR) / 2, wd = WF - WR;
    fbox(S, wu, wv, fl, cor, WW, wd, STUCCO);
    fbox(S, wu, wv, s1 - 0.1, s1 + 0.2, WW + 0.3, wd + 0.3, WHITE);
    fbox(S, wu, wv, s2, cor, WW + 0.8, wd + 0.8, WHITE);
    fbox(S, wu, (WF + WH) / 2, cor, cor + 0.12, WW + 0.6, WF - WH + 0.4, STONE2); // the bay's roof terrace
    balustrade(S, P(su * (W2 + 0.15), WH), P(su * (W2 + 0.15), WF + 0.15), cor, 0.85);
    balustrade(S, P(su * (W2 + 0.15), WF + 0.15), P(su * (CU + TS - 0.3), WF + 0.15), cor, 0.85);
    S.hip(...P(wu, (WH + WR) / 2), WW + 0.2, WH - WR + 0.2, ANG, cor, 2.4, ROOF, { over: 0.2 });
  }
  // the flat-roofed annexes behind the west half: a two-storey block behind the west wing and a lower one behind the
  // centre's west half, apart by a narrow light well (the satellite shows two flat roofs)
  for (const [u0, u1, v1, top] of ([[-W2, -CU - 0.2, WR, s2 + 0.3], [-CU + 0.6, -0.8, CR, s2 - 0.6]] as any[])) {
    const um = (u0 + u1) / 2, wu = u1 - u0, vm = (AR + v1) / 2, dv = v1 - AR;
    fbox(S, um, vm, fl - 0.6, top, wu, dv, STUCCO2);
    fbox(S, um, vm, s1 - 0.1, s1 + 0.2, wu + 0.3, dv + 0.3, WHITE);
    fbox(S, um, vm, top - 0.3, top, wu + 0.5, dv + 0.5, WHITE);
    balustrade(S, P(u0 + 0.1, AR - 0.1), P(u1 - 0.1, AR - 0.1), top, 0.8);
    balustrade(S, P(u0 + 0.1, AR - 0.1), P(u0 + 0.1, v1), top, 0.8);
    balustrade(S, P(u1 - 0.1, AR - 0.1), P(u1 - 0.1, v1), top, 0.8);
    const rear = face(um, AR, [-1, 0], [0, -1]);
    for (let s = -wu / 2 + 1.4; s < wu / 2 - 0.8; s += 2.2) { win(S, rear, s, 0, fl + 0.6, 2.4, 1.0, true); win(S, rear, s, 0, s1 + 0.9, 2.0, 1.0, true); }
  }

  // the towers over the wings' inner front corners, each with a crown: a pedimented attic on all four faces, corner
  // urns, a small stepped cap and a finial (sv-front-road)
  for (const su of [-1, 1]) {
    const tu = su * (CU + TS / 2 - 0.3), tv = WF - TS / 2 + 0.3;
    fbox(S, tu, tv, fl, twTop, TS, TS, STUCCO2);
    fbox(S, tu, tv, s1 - 0.1, s1 + 0.2, TS + 0.2, TS + 0.2, WHITE);
    fbox(S, tu, tv, s2, cor, TS + 0.5, TS + 0.5, WHITE);
    fbox(S, tu, tv, twTop, twTop + 0.35, TS + 0.5, TS + 0.5, WHITE);
    fbox(S, tu, tv, twTop + 0.35, twTop + 1.15, TS - 0.5, TS - 0.5, STUCCO2); // the crown's attic
    for (const [t, n] of ([[[1, 0], [0, 1]], [[-1, 0], [0, -1]], [[0, -1], [1, 0]], [[0, 1], [-1, 0]]] as any[])) {
      const F = face(tu + n[0] * (TS - 0.5) / 2, tv + n[1] * (TS - 0.5) / 2, t, n);
      onFace(S, F, 0, 0.05, twTop + 1.15, twTop + 1.35, TS - 0.3, 0.3, WHITE); // cornice of the attic
      onFace(S, F, 0, 0.05, twTop + 1.35, twTop + 1.65, 2.2, 0.26, STUCCO2); // the pediment, stepped
      onFace(S, F, 0, 0.05, twTop + 1.65, twTop + 1.95, 1.4, 0.26, STUCCO2);
      onFace(S, F, 0, 0.05, twTop + 1.95, twTop + 2.15, 0.7, 0.3, WHITE);
      fan(S, F, 0, 0.2, twTop + 0.55, 0.32, WHITE, 8, true); // oculus medallion
    }
    fbox(S, tu, tv, twTop + 1.15, twTop + 1.75, TS - 1.4, TS - 1.4, WHITE);
    S.cyl(...P(tu, tv), twTop + 1.75, twTop + 2.35, 0.8, 0.25, 8, STUCCO2);
    finial(S, P(tu, tv), twTop + 2.35, 1.0);
    for (const [a, b] of ([[1, 1], [-1, 1], [1, -1], [-1, -1]] as any[])) finial(S, P(tu + a * (TS / 2), tv + b * (TS / 2)), twTop + 0.35, 0.7);
    // rusticated quoins on the wing's outer front corner and on the tower's front corners
    for (const [cu, cv, top] of ([[su * W2, WF, cor - 0.4], [tu + su * TS / 2, tv + TS / 2, twTop - 0.2], [tu - su * TS / 2, tv + TS / 2, twTop - 0.2]] as any[])) {
      for (let y = fl, k = 0; y < top; y += 0.55, k++) { const big = k % 2 === 0 ? 0.62 : 0.4; fbox(S, cu, cv, y, y + 0.45, big, big, WHITE); }
    }
    // the wing front's balcony on storey 2, outside the tower
    const bu0 = su * W2, bu1 = su * (CU + TS - 0.3);
    fbox(S, (bu0 + bu1) / 2, WF + 0.45, s1 - 0.15, s1 + 0.2, Math.abs(bu1 - bu0), 0.9, WHITE);
    balustrade(S, P(bu0, WF + 0.8), P(bu1, WF + 0.8), s1 + 0.2, 0.85);
  }

  // windows: arched on both storeys
  const lower = face(0, CGF, [1, 0], [0, 1]), upper = face(0, CUF, [1, 0], [0, 1]), back = face(0, CR, [-1, 0], [0, -1]);
  for (const s of [-6.2, -4.6, 4.6, 6.2]) win(S, lower, s, 0, fl + 0.5, 2.9, 1.0, true);
  for (const s of [-2.4, 0, 2.4]) win(S, lower, s, 0, fl + 0.3, 3.0, 1.2, true); // porch doors
  for (const [s, out] of ([[-6.2, 0], [-4.4, 0], [-2.2, 0.6], [0, 0.6], [2.2, 0.6], [4.4, 0], [6.2, 0]] as any[])) win(S, upper, s, out, s1 + 0.9, 2.3, 1.0, true);
  for (const s of [-5.8, -2.4, 0, 2.4, 5.8]) {
    const out = Math.abs(s) < 3.6 ? 0.6 : 0;
    win(S, back, s, out, fl + 1.0, 2.3, 1.1, true);
    win(S, back, s, out, s1 + 1.0, 2.2, 1.1, true);
  }
  const eback = face(CU + WW / 2, WR, [-1, 0], [0, -1]);
  for (const s of [-2.2, 0, 2.2]) { win(S, eback, s, 0, fl + 1.0, 2.3, 1.1, true); win(S, eback, s, 0, s1 + 1.0, 2.2, 1.1, true); }
  for (const su of [-1, 1]) {
    const wf = face(su * (CU + WW / 2), WF, [1, 0], [0, 1]);
    const outer = su * (WW / 2 - 1.6), tow = su * (-WW / 2 + TS / 2 - 0.3);
    win(S, wf, outer, 0, fl + 0.6, 2.8, 1.2, true);
    win(S, wf, outer, 0, s1 + 0.9, 2.4, 1.2, true);
    win(S, wf, tow, 0.3, fl + 0.6, 2.8, 1.1, true);
    win(S, wf, tow, 0.3, s1 + 1.0, 2.2, 1.0, true);
    win(S, wf, tow, 0.3, cor + 0.6, 1.8, 0.9, false);
    // the wing's inner side, between the tower and the centre's terrace
    const inner = face(su * CU, (CGF + WF - TS + 0.3) / 2, [0, su], [-su, 0]);
    win(S, inner, 0, 0, s1 + 1.0, 2.2, 0.9, true);
    // the outer end
    const side = face(su * W2, (WF + WR) / 2, [0, -su], [su, 0]);
    for (const s of [-5.6, -3.2, -0.8, 1.6, 4.0, 6.2]) { const ss = su > 0 ? -s : s; win(S, side, ss, 0, fl + 1.0, 2.3, 1.1, true); win(S, side, ss, 0, s1 + 1.0, 2.2, 1.05, true); }
  }

  // the porch: paired columns carrying the balcony of storey 2, from the terrace front out to PF
  const pd = PF - CGF;
  for (const u of [-3.4, -2.7, 2.7, 3.4]) for (const v of [PF - 0.35, CGF + 0.35]) {
    if (v < PF - 1 && Math.abs(u) < 3) continue; // pilasters only at the back
    const p = P(u, v);
    S.box(p[0], p[1], fl, fl + 0.35, 0.6, 0.6, ANG, WHITE);
    S.cyl(p[0], p[1], fl + 0.35, s1 - 0.5, 0.25, 0.22, 8, WHITE);
    S.box(p[0], p[1], s1 - 0.5, s1 - 0.2, 0.58, 0.58, ANG, WHITE);
  }
  fbox(S, 0, CGF + pd / 2, s1 - 0.2, s1 + 0.25, 7.8, pd + 0.2, WHITE);
  balustrade(S, P(-3.9, PF), P(3.9, PF), s1 + 0.25, 0.9);
  for (const sg of [-1, 1]) balustrade(S, P(sg * 3.9, CGF + 0.1), P(sg * 3.9, PF), s1 + 0.25, 0.9);
  // name board 啓祥樓 over the balcony door
  onFace(S, upper, 0, 0.75, s2 - 0.75, s2 - 0.15, 2.4, 0.12, shade(SHUT, 0.8));
  onFace(S, upper, 0, 0.8, s2 - 0.65, s2 - 0.25, 2.0, 0.1, GOLD);
  // the crest over the centre bay: a stepped stucco frontispiece with a medallion and finials
  onFace(S, upper, 0, 0.45, cor, cor + 1.6, 6.4, 0.5, STUCCO2);
  onFace(S, upper, 0, 0.45, cor + 1.6, cor + 2.4, 3.2, 0.5, STUCCO2);
  onFace(S, upper, 0, 0.45, cor + 2.4, cor + 2.65, 3.6, 0.6, WHITE);
  onFace(S, upper, 0, 0.45, cor + 1.5, cor + 1.65, 6.8, 0.6, WHITE);
  fan(S, upper, 0, 0.72, cor + 1.0, 0.6, WHITE, 10, true);
  fan(S, upper, 0, 0.74, cor + 1.0, 0.4, GOLD, 10, true);
  for (const s of [-3.1, 3.1]) { const q = upper.at(s, 0.45); finial(S, q, cor + 1.65, 0.9); }
  finial(S, upper.at(0, 0.45), cor + 2.65, 1.0);
  for (const u of [-2.6, 2.6]) { const q = P(u, PF + 1.6); lamps.push([q[0], fl + 0.5, q[1]]); }
  const pc = P(0, CGF + pd / 2); lamps.push([pc[0], s1 - 0.6, pc[1]]);
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
  // the upper base: yellow, framed by white panels and a white cornice (sv-front-est)
  for (let i = 0; i < 8; i++) {
    const am = rot + (i + 0.5) * Math.PI / 4, ap = RU * cp + 0.02, q = [c[0] + Math.cos(am) * ap, c[1] + Math.sin(am) * ap];
    if (Math.abs(Math.sin(am - fAng)) > 0.95) continue; // the stair faces
    S.box(q[0], q[1], t1 + 0.2, b1 - 0.25, 1.5, 0.06, am + Math.PI / 2, WHITE);
    const q2 = [c[0] + Math.cos(am) * (ap + 0.03), c[1] + Math.sin(am) * (ap + 0.03)];
    S.box(q2[0], q2[1], t1 + 0.32, b1 - 0.37, 1.24, 0.06, am + Math.PI / 2, PAVW);
  }
  // eight slender round columns; a white balustrade between them, open on the stair faces; a dark lattice frieze
  // with corner brackets under a yellow beam
  const colTop = b1 + 3.3, rc = 2.4;
  const corner = (i, r) => { const a = rot + (i * Math.PI) / 4; return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]; };
  for (let i = 0; i < 8; i++) {
    const q = corner(i, rc);
    S.box(q[0], q[1], b1, b1 + 0.3, 0.38, 0.38, rot + (i * Math.PI) / 4, WHITE);
    S.cyl(q[0], q[1], b1 + 0.3, colTop, 0.15, 0.13, 8, PAVW);
    const r = corner(i + 1, rc), mid = [(q[0] + r[0]) / 2, (q[1] + r[1]) / 2];
    const ang = Math.atan2(r[1] - q[1], r[0] - q[0]), len = Math.hypot(r[0] - q[0], r[1] - q[1]);
    const nrm = [Math.cos(rot + (i + 0.5) * Math.PI / 4), Math.sin(rot + (i + 0.5) * Math.PI / 4)];
    const onStair = Math.abs(nrm[0] * Math.sin(fAng) - nrm[1] * Math.cos(fAng)) > 0.95;
    if (!onStair) {
      const sh = 0.2 / len, a2 = [q[0] + (r[0] - q[0]) * sh, q[1] + (r[1] - q[1]) * sh], b2 = [r[0] + (q[0] - r[0]) * sh, r[1] + (q[1] - r[1]) * sh];
      balustrade(S, a2, b2, b1, 0.7, WHITE, 0.3);
    }
    S.box(mid[0], mid[1], colTop - 0.85, colTop - 0.12, len - 0.3, 0.08, ang, LATTICE); // carved lattice frieze
    S.box(mid[0], mid[1], colTop - 0.12, colTop + 0.15, len + 0.1, 0.24, ang, PAVW); // the beam
    // brackets from the column out to the eave
    const o = corner(i, rc + 1.0);
    S.beam([q[0], colTop - 0.9, q[1]], [o[0], colTop + 0.15, o[1]], 0.1, 0.16, LATTICE);
  }
  // one broad eight-sided roof sweeping up from the columns to a small drum, a raised octagonal cap and the pearl
  const y1 = colTop + 0.15, y2 = y1 + 1.55;
  S.kind = KIND.TILE;
  S.cyl(c[0], c[1], y1, y2, 4.4, 1.25, 8, PAVROOF, { cap: false, rot });
  S.kind = KIND.PLAIN;
  // the eave's fascia and the dark soffit seen from the court
  S.cyl(c[0], c[1], y1 - 0.22, y1 + 0.02, 4.42, 4.42, 8, shade(PAVROOF, 0.85), { rot, cap: false });
  for (let i = 0; i < 8; i++) {
    const a = corner(i, 4.42), b = corner(i + 1, 4.42), q = corner(i, rc), r = corner(i + 1, rc);
    S.quad([a[0], y1 - 0.22, a[1]], [q[0], y1 - 0.22, q[1]], [r[0], y1 - 0.22, r[1]], [b[0], y1 - 0.22, b[1]], shade(LATTICE, 0.8), [0, -1, 0]);
    S.quad([a[0], y1 - 0.22, a[1]], [b[0], y1 - 0.22, b[1]], [r[0], y1 - 0.22, r[1]], [q[0], y1 - 0.22, q[1]], shade(LATTICE, 0.8), [0, -1, 0]);
  }
  const roofY = (r) => y1 + ((4.4 - r) / (4.4 - 1.25)) * (y2 - y1); // the height of a hip at radius r
  for (let i = 0; i < 8; i++) { // ridges on the eight hips
    const e = corner(i, 4.35), m = corner(i, 1.3);
    S.beam([e[0], roofY(4.35) + 0.06, e[1]], [m[0], y2 + 0.04, m[1]], 0.16, 0.14, DRAGON);
  }
  S.cyl(c[0], c[1], y2 - 0.05, y2 + 0.45, 1.1, 1.1, 8, PAVW, { rot });
  S.cyl(c[0], c[1], y2 + 0.1, y2 + 0.35, 1.13, 1.13, 8, LATTICE, { rot });
  const y3 = y2 + 0.45;
  S.kind = KIND.TILE;
  S.cyl(c[0], c[1], y3, y3 + 0.75, 1.5, 0.15, 8, PAVROOF, { rot });
  S.kind = KIND.PLAIN;
  // pearl finial
  S.cyl(c[0], c[1], y3 + 0.7, y3 + 0.95, 0.16, 0.16, 6, DRAGON);
  S.cyl(c[0], c[1], y3 + 0.95, y3 + 1.25, 0.24, 0.24, 8, GOLD);
  S.cyl(c[0], c[1], y3 + 1.25, y3 + 1.45, 0.24, 0.0, 8, GOLD);
  // dragons: eight on the lower hips, each a body arched along the hip with a raised head and a curled tail, and
  // four small ones on the cap (12)
  // the dragon: a body arched along the hip from radius r0 to r1, its head reared up at the eave, the tail curled
  const dragon = (dir, r0, r1, yAt, sc) => {
    const at = (r, up): [number, number, number] => [c[0] + dir[0] * r, yAt(r) + up, c[1] + dir[1] * r];
    const L = r1 - r0, body = [at(r0, 0.2 * sc), at(r0 + L * 0.3, 0.5 * sc), at(r0 + L * 0.6, 0.32 * sc), at(r0 + L * 0.88, 0.45 * sc)];
    for (let k = 0; k < 3; k++) S.beam(body[k], body[k + 1], 0.32 * sc, 0.36 * sc, DRAGON);
    const head = at(r1, 0.95 * sc);
    S.beam(body[3], head, 0.36 * sc, 0.42 * sc, DRAGON); // neck and head reared up
    S.beam(head, at(r1 + 0.25 * sc, 0.8 * sc), 0.28 * sc, 0.24 * sc, DRAGON); // the snout
    S.beam(head, at(r1 - 0.15 * sc, 1.25 * sc), 0.12 * sc, 0.12 * sc, DRAGON); // the mane
    S.beam(body[0], at(r0 - 0.25 * sc, 0.65 * sc), 0.22 * sc, 0.22 * sc, DRAGON); // the tail curling up
  };
  for (let i = 0; i < 8; i++) { const a = rot + (i * Math.PI) / 4; dragon([Math.cos(a), Math.sin(a)], 2.5, 4.2, roofY, 1.0); }
  const capY = (r) => y3 + 0.75 * (1 - (r - 0.15) / 1.35);
  for (let i = 0; i < 4; i++) { const a = rot + (i * Math.PI) / 2; dragon([Math.cos(a), Math.sin(a)], 0.55, 1.35, capY, 0.5); }
  lamps.push([c[0], colTop - 0.4, c[1]]);
}

// ---------------------------------------------------------------- the river gate
// A tam quan, as it stands after the restoration (car pano across the river, 2025): three red arched doors, the middle
// one taller, in cream walls between blue ceramic pilasters; a pale blue frieze and a band of tiled eave; above it
// the upper tier, a centre block with a medallion between two little kiosks, under a tiled hip with the pearl.
const GCREAM = hex('#ddc98f'), GBLUE = hex('#5b7f9a'), GBLUE2 = hex('#9fbccb'), GTILE = hex('#5a4a40');
function gate(S, lamps) {
  const c = P(GATE[0], GATE[1]), g = gy(c), y = g + 0.3;
  const F = face(GATE[0], GATE[1], [1, 0], [0, 1]), B = face(GATE[0], GATE[1], [-1, 0], [0, -1]);
  const T = 1.4, GW = 7.6, L1 = y + 3.0; // wall thickness, width, top of the lower tier
  S.base = g - LAND_Y;
  S.kind = KIND.MASONRY;
  fbox(S, GATE[0], GATE[1], g - 0.3, y, GW + 0.4, T + 1.0, STONE, { top: STONE2 });
  S.kind = KIND.PLAIN;
  fbox(S, GATE[0], GATE[1], y, L1, GW, T, GCREAM);
  // the doors: red leaves under white-edged arches
  for (const X of [F, B]) {
    for (const [s, w, h] of ([[0, 1.7, 1.6], [-2.55, 1.3, 1.3], [2.55, 1.3, 1.3]] as any[])) {
      onFace(S, X, s, T / 2, y, y + h, w + 0.24, 0.1, WHITE);
      fan(S, X, s, T / 2 + 0.06, y + h, w / 2 + 0.12, WHITE, 8);
      onFace(S, X, s, T / 2 + 0.05, y, y + h + 0.04, w, 0.12, RED);
      fan(S, X, s, T / 2 + 0.12, y + h, w / 2, RED, 8);
    }
    // blue ceramic pilasters on red bases between and beside the doors
    for (const s of [-3.55, -1.55, 1.55, 3.55]) {
      onFace(S, X, s, T / 2 + 0.08, y, y + 0.5, 0.5, 0.18, RED);
      onFace(S, X, s, T / 2 + 0.06, y + 0.5, L1 - 0.35, 0.4, 0.14, GBLUE);
      onFace(S, X, s, T / 2 + 0.1, y + 0.9, L1 - 0.75, 0.22, 0.08, GBLUE2);
    }
    onFace(S, X, 0, T / 2 + 0.06, L1 - 0.35, L1 - 0.05, GW, 0.14, GBLUE2); // the frieze
    onFace(S, X, 0, T / 2 + 0.1, y + 2.3, y + 2.6, 1.4, 0.08, GOLD); // name board over the middle door
  }
  // the band of tiled eave over the lower tier
  S.kind = KIND.TILE;
  S.hip(c[0], c[1], GW, T, ANG, L1, 0.5, GTILE, { over: 0.35, flare: 0.1 });
  S.kind = KIND.PLAIN;
  // the upper tier: a centre block with a medallion, two kiosks over the outer bays
  const U0 = L1 + 0.2;
  fbox(S, GATE[0], GATE[1], L1, U0 + 1.8, 3.0, T - 0.3, GCREAM);
  for (const X of [F, B]) {
    for (const s of [-1.35, 1.35]) onFace(S, X, s, (T - 0.3) / 2 + 0.05, U0, U0 + 1.8, 0.3, 0.1, GBLUE);
    fan(S, X, 0, (T - 0.3) / 2 + 0.05, U0 + 0.9, 0.62, GBLUE, 12, true);
    fan(S, X, 0, (T - 0.3) / 2 + 0.07, U0 + 0.9, 0.48, RED, 12, true);
    fan(S, X, 0, (T - 0.3) / 2 + 0.09, U0 + 0.9, 0.26, GOLD, 12, true);
  }
  S.kind = KIND.TILE;
  S.hip(c[0], c[1], 3.0, T - 0.3, ANG, U0 + 1.8, 0.4, GTILE, { over: 0.35, flare: 0.1 }); // tile skirt
  S.kind = KIND.PLAIN;
  fbox(S, GATE[0], GATE[1], U0 + 2.1, U0 + 2.75, 1.9, T - 0.6, GCREAM);
  S.kind = KIND.TILE;
  S.hip(c[0], c[1], 2.2, T - 0.3, ANG, U0 + 2.75, 0.85, GTILE, { over: 0.35, flare: 0.2, ridgeCol: shade(GTILE, 0.75) });
  S.kind = KIND.PLAIN;
  const top = U0 + 2.75 + 0.85;
  S.cyl(c[0], c[1], top - 0.05, top + 0.15, 0.18, 0.18, 6, GCREAM);
  S.cyl(c[0], c[1], top + 0.15, top + 0.5, 0.28, 0.28, 8, GOLD);
  S.cyl(c[0], c[1], top + 0.5, top + 0.7, 0.28, 0.02, 8, GOLD);
  for (const sg of [-1, 1]) {
    const ku = GATE[0] + sg * 3.0, kp = P(ku, GATE[1]);
    fbox(S, ku, GATE[1], L1, L1 + 1.1, 1.0, 1.0, GCREAM);
    for (const X of [F, B]) { const s = X === F ? sg * 3.0 : -sg * 3.0; onFace(S, X, s, 0.52, L1 + 0.2, L1 + 0.9, 0.5, 0.06, GBLUE); }
    S.kind = KIND.TILE;
    S.hip(kp[0], kp[1], 1.1, 1.1, ANG, L1 + 1.1, 0.6, GTILE, { over: 0.2, flare: 0.15, ridgeCol: shade(GTILE, 0.75) });
    S.kind = KIND.PLAIN;
    finial(S, kp, L1 + 1.65, 0.4, GOLD);
    const lp = P(GATE[0] + sg * 1.55, GATE[1] + 1.0); lamps.push([lp[0], y + 2.4, lp[1]]);
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

// ---------------------------------------------------------------- fan palms of the garden
function fanPalm(S, p, h, i) {
  const g = gy(p), lean = [Math.cos(i * 2.1) * 0.35, Math.sin(i * 2.1) * 0.35], top = [p[0] + lean[0], g + h, p[1] + lean[1]];
  S.base = g - LAND_Y;
  S.kind = KIND.PLAIN;
  S.beam([p[0], g, p[1]], top, 0.36, 0.36, hex('#7d7262'));
  const N = 11, R = 2.1;
  for (let k = 0; k < N; k++) {
    const a = (k / N) * Math.PI * 2 + i, dx = Math.cos(a), dz = Math.sin(a), droop = k % 3 === 0 ? -0.9 : -0.2;
    const mid = [top[0] + dx * R * 0.55, top[1] + 0.35, top[2] + dz * R * 0.55], tip = [top[0] + dx * R, top[1] + droop, top[2] + dz * R];
    const sx = -dz * 0.75, sz = dx * 0.75, col = k % 2 ? hex('#4e6b33') : hex('#5d7a3a');
    S.quad(top, [mid[0] + sx, mid[1], mid[2] + sz], tip, [mid[0] - sx, mid[1], mid[2] - sz], col, [0, 1, 0]);
    S.quad(top, [mid[0] - sx, mid[1], mid[2] - sz], tip, [mid[0] + sx, mid[1], mid[2] + sz], shade(col, 0.8), [0, -1, 0]);
  }
  S.cyl(top[0], top[2], top[1] - 0.7, top[1] + 0.05, 0.4, 0.3, 6, hex('#6b5a44'));
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
  // the wall: plain yellow stucco under a tiled coping (the car pano across the river, 2025), open at the gate
  const area = data.special && data.special.andinhArea;
  if (area) {
    const ring = [];
    for (let i = 0; i + 1 < area.ring.length; i += 2) ring.push([area.ring[i] / 10, area.ring[i + 1] / 10]);
    const gc = P(GATE[0], GATE[1]);
    fence(S, ring, { h: 2.2, plinth: 1.8, rail: false, t: 0.5, every: 3.6, postW: 0.6, postUp: 0.15, wall: STUCCO, cap: hex('#a8875c'), iron: hex('#2f2b26'), pierW: 1.0, pierUp: 0.6 },
      { roads: roadsNear(data, C, 200), openings: [[gc[0], gc[1], 3.65]], solid: buildingsNear(data, C, 180) });
  }
  // the garden: tall shade trees inside the river wall and beside the court, and fan palms (sat-z20, the car pano:
  // seen from across the river the palace is half hidden behind them)
  if (Array.isArray(data.trees)) {
    for (const [u, v, s, k] of ([[-16, 22, 19, 1], [13.5, 20.8, 19, 2], [-19.5, 20.5, 18, 1], [19.5, 20.5, 18, 1], [14.5, 17.5, 17, 2], [-18.9, 7.3, 18, 1], [19.5, 12.5, 17, 1]] as any[])) {
      const p = P(u, v); data.trees.push(Math.round(p[0] * 10), Math.round(p[1] * 10), s, k);
    }
  }
  // (palms stand 5.5 m or more from the trees: the planter keeps a tree's branches off anything tall, palm crowns too)
  for (const [u, v, h, i] of ([[9.6, 13.6, 11, 0], [7.2, 19.6, 12.5, 1], [-15.5, 14.7, 10.5, 2], [-6.5, 22.8, 11.5, 3], [6.5, 22.8, 10, 4], [-10.5, 16.0, 9.5, 5]] as any[])) fanPalm(S, P(u, v), h, i);
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
