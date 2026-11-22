import * as THREE from 'three';
import { KIND, Buf, hex, shade } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { glowPoints, lightMaterial } from '../../geo/materials.js';
import { fence, roadsNear, offStreets, leaves } from '../enclosure.js';
import { flag } from '../anim.js';

// ---- Bảo tàng Hồ Chí Minh (Hồ Chí Minh Museum), 7 Lê Lợi, Huế: the building rebuilt 1998–2000, as it stands in 2026 ----
//
// Sources (fetched Nov 2026; see docs/places/baotanghcm.md):
//  - OSM way 240266284 (tourism=museum): the footprint, a near-square set on a diamond (corners to N, E, S, W), its
//    front facing south-east across a paved forecourt toward Lê Lợi. The mapped outline (32.5 x 31.4 m) is the roof's
//    eave line seen from above; the walls stand about 2 m inside it under the deep eave (satellite, street views).
//  - bthcm.hue.gov.vn (Giới thiệu chung), baotanghochiminh.vn: rebuilt from 19 May 1998, opened 19 May 2000.
//    ivivu.com (2022): a three-storey building of 2,500 m², with four alike faces.
//  - Photos: vinwonders.com "bao-tang-ho-chi-minh-hue-02.jpg" (front, 2023), the ivivu.com aerial (2022), and street
//    views from Lê Lợi, Trần Thúc Nhẫn and Điện Biên Phủ (visual reference only). They show: three storeys on a stone
//    plinth with steps; a ground floor of dark glazing behind round white columns; a white first floor whose face
//    carries a projecting strip of windows behind dark fretwork grilles (a lattice in the Huế manner) and, higher, a
//    solid white parapet; the top floor a loggia, pink back wall behind thin white columns, under the deep eave of
//    one big salmon-red hip roof with white hip ridges; on the roof a square lantern; grey-green corner blocks, about
//    4 m square, the south one glazed full height on both faces, the north-east faces of the east and north blocks
//    plain. A lotus relief, the name and a red banner over the door on the Lê Lợi front.
//  - Grounds (satellite, street views): the forecourt and the drive round the building paved in pale stone; a row of
//    palms, a hedge and a crescent bed with a fountain along the railing on Lê Lợi; the main gate at the west end of
//    that front, beside a stone sign wall ("BẢO TÀNG HỒ CHÍ MINH") and a white flat-roofed gatehouse; a red-roofed
//    kiosk by the west corner; tall Norfolk pines on the east side; along Điện Biên Phủ a rubble-stone wall under an
//    iron railing, with dense trees behind it.
// Heights are scaled from the street views on the mapped front (estimates): plinth 1.0 m, ground floor to 4.4 m,
// lattice strip 6.3–8.6 m, parapet to 11.4 m, loggia to the soffit at 13.6 m, eave 14.0 m, main ridge 18.8 m,
// lantern to 21.6 m, all above the ground.

export const id = 'baotanghcm';

// footprint (OSM way 240266284, the eave line), model metres: west, north, east (front-right), south (front-left)
const RING = [[-849.9, 1023.1], [-826.0, 1002.7], [-804.7, 1027.2], [-828.6, 1047.6]];

const pink = hex('#e6bfcf'), pinkD = hex('#d3aebf'), white = hex('#f4f1ec'), sage = hex('#a3ab9c'), sageD = hex('#8d968a');
const glass = hex('#2b343a'), fret = hex('#26292c'), roofC = hex('#c8665a'), stone = hex('#b9b3aa'), pave = hex('#c9c4ba');
const lawn = hex('#5f8a45'), hedge = hex('#3f6a34'), palmC = hex('#4c7a38'), trunk = hex('#8a7a66'), pine = hex('#2f5a33');
const red = hex('#b8262b'), gold = hex('#d8b24a'), pot = hex('#9c5a48'), blueRoof = hex('#3d6fa8'), cream = hex('#ece4d2');
const rubble = hex('#8a877e'), render = hex('#cdb76a'), iron = hex('#2c3032');

const inRing = (x, z, r) => {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) if (r[i][1] > z !== r[j][1] > z && x < ((r[j][0] - r[i][0]) * (z - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) c = !c;
  return c;
};

export function build({ data, S, group }) {
  // the building's frame: centre C, f the front normal (toward Lê Lợi, south-east), u along the front (toward the
  // west end); a along f, b along u
  const C = [RING.reduce((s, p) => s + p[0], 0) / 4, RING.reduce((s, p) => s + p[1], 0) / 4];
  const fl = Math.hypot(RING[3][0] - RING[0][0], RING[3][1] - RING[0][1]);
  const f = [(RING[3][0] - RING[0][0]) / fl, (RING[3][1] - RING[0][1]) / fl]; // west corner -> south corner: the depth
  const u = [-f[1], f[0]];
  const OV = 2.05; // the eave's overhang: the walls stand this far inside the mapped outline
  const HA = 32.5 / 2 - OV, HB = 31.4 / 2 - OV; // half depth (along f), half front (along u), of the walls
  const P = (a, b) => [C[0] + a * f[0] + b * u[0], C[1] + a * f[1] + b * u[1]];
  const ANG = Math.atan2(f[1], f[0]);
  const bx = (a, b, ya, yb, da, db, col, o) => { const p = P(a, b); S.box(p[0], p[1], ya, yb, da, db, ANG, col, o); };
  const ring = (a0, a1, b0, b1) => [P(a0, b0), P(a1, b0), P(a1, b1), P(a0, b1)];

  const y0 = LAND_Y + rise(C[0], C[1]);
  const F = y0 + 1.0; // museum floor, on the plinth
  const G1 = y0 + 4.4; // head of the ground floor
  const LT0 = y0 + 6.3, LT1 = y0 + 8.6; // the lattice strip on the first floor
  const PT = y0 + 11.4; // top of the white parapet in front of the top floor (its floor at +10.0)
  const E = y0 + 14.0; // eave of the main roof (soffit at E - 0.4)
  S.base = y0 - LAND_Y;
  const L = new Buf(1024), lamps = [], lampCol = [];
  const lamp = (p, y, c = [1, 0.85, 0.6]) => { lamps.push(p[0], y, p[1]); lampCol.push(...c); };
  const roads = roadsNear(data, C, 150);

  // ---------------- grounds ----------------
  // the forecourt and the drive round the building, pale stone, up to the front garden, the west gate and the
  // service lane on the east; cut off the streets, marked so trees and houses keep off
  const PLAZA = [[-46, -1], [-20, -32], [23, -27], [23, 30], [31, 30], [31, 40], [15, 43], [-9, 26]].map(([a, b]) => P(a, b));
  const plaza = offStreets(data, PLAZA, 0.3);
  const paved0 = S.n;
  S.kind = KIND.MASONRY;
  S.prism(plaza, y0 - 0.3, y0 + 0.05, pave, pave, { topKind: KIND.ROAD });
  S.prism(ring(HA + 0.6, HA + 8.0, -HB - 1, HB + 1), y0 - 0.2, y0 + 0.08, shade(pave, 0.94), shade(pave, 0.94), { topKind: KIND.ROAD }); // the darker apron before the steps
  (S.paved = S.paved || []).push([paved0, S.n]);

  // the front garden between the forecourt and the railing: kerbed lawn, hedge, a crescent bed round the fountain,
  // palms, cycads in pots
  S.kind = KIND.PLAIN;
  const GA0 = 23.2, GA1 = 30.5; // its depth along f
  for (const [b0, b1] of [[-27, -4.2], [4.2, 29.8]]) S.prism(ring(GA0, GA1, b0, b1), y0 - 0.2, y0 + 0.35, white, lawn);
  S.prism(ring(GA0, GA1, -4.2, 4.2), y0 - 0.2, y0 + 0.3, white, lawn);
  S.kind = KIND.TIMBER;
  S.prism(ring(GA1 - 1.1, GA1 - 0.3, -26.5, 29.4), y0 + 0.35, y0 + 1.05, hedge, shade(hedge, 1.1)); // hedge along the railing
  {
    const fc = P(25.6, 0);
    S.kind = KIND.TIMBER;
    S.cyl(fc[0], fc[1], y0 + 0.3, y0 + 0.9, 3.2, 2.9, 20, hedge, { cap: false }); // the crescent of clipped shrubs
    S.kind = KIND.MASONRY;
    S.cyl(fc[0], fc[1], y0 + 0.3, y0 + 0.8, 2.2, 2.2, 16, white);
    S.cyl(fc[0], fc[1], y0 + 0.8, y0 + 0.82, 2.0, 2.0, 16, hex('#6d8fa0'));
    S.cyl(fc[0], fc[1], y0 + 0.8, y0 + 1.6, 0.2, 0.25, 8, cream);
    S.cyl(fc[0], fc[1], y0 + 1.6, y0 + 1.8, 0.7, 0.75, 10, cream);
    S.cyl(fc[0], fc[1], y0 + 1.8, y0 + 2.3, 0.12, 0.1, 6, cream);
  }
  // royal palms in a row through the garden
  for (const b of [-24, -18.5, -13, -7.5, 7.5, 13, 18.5, 24, 28.6]) palm(S, P(26.8, b), y0 + 0.35, 10 + ((b * 7) % 3 + 3) % 3);
  for (let b = -25.5; b <= 28.5; b += 3.2) {
    if (Math.abs(b) < 4.6) continue;
    const p = P(GA1 - 2.0, b);
    S.kind = KIND.MASONRY;
    S.cyl(p[0], p[1], y0 + 0.35, y0 + 0.9, 0.4, 0.5, 8, pot);
    S.kind = KIND.TIMBER;
    S.cyl(p[0], p[1], y0 + 0.9, y0 + 1.6, 0.85, 0.15, 7, palmC, { cap: false });
  }
  // topiary pines in big pots on the apron either side of the steps
  for (const b of [-9.0, -6.5, 6.5, 9.0]) topiary(S, P(HA + 3.6, b), y0 + 0.08, Math.abs(b) > 8 ? 3.4 : 2.6);
  for (const b of [-HB - 1.5, HB + 1.5]) topiary(S, P(HA + 1.4, b), y0 + 0.08, 3.0);
  // two flagpoles left of the steps (seen from the street), red flags
  for (const b of [10.8, 12.4]) {
    const p = P(HA + 6.2, b);
    S.kind = KIND.PLAIN;
    S.box(p[0], p[1], y0, y0 + 0.4, 0.8, 0.8, ANG, stone);
    S.cyl(p[0], p[1], y0 + 0.4, y0 + 10.5, 0.07, 0.05, 6, white, { cap: false });
    flag(group, { at: [p[0], y0 + 10.2, p[1]], w: 1.9, h: 1.3, look: red, landmark: id }); // waves down-wind (anim.js)
  }
  // Norfolk pines on the east side of the forecourt, by the service lane
  if (Array.isArray(data.trees)) { const p = P(10, -29.5); data.trees.push(Math.round(p[0] * 10), Math.round(p[1] * 10), 13, 0); }
  for (const [a, b, h] of [[-12, -27.5, 20], [-19, -27, 22], [-2, -26.5, 9]]) norfolk(S, P(a, b), y0, h);

  // the railing on Lê Lợi: a low white wall with dark bars; the main gate at its west end, open, between stone piers
  const rail = { h: 1.6, plinth: 0.55, rail: true, t: 0.3, every: 3.0, postW: 0.42, postUp: 0.15, wall: hex('#ece8df'), cap: hex('#c9c3b8'), iron, pierW: 1.0, pierUp: 1.0 };
  const fA = 30.85, gate = P(fA, 34.75);
  const piers = fence(S, [P(fA, -30), P(fA, 39.5)], rail, { closed: false, roads, openings: [[gate[0], gate[1], 9.5]] });
  // the sign wall beside the gate (the museum's name on a dark plaque), a bed behind it, the gatehouse
  S.kind = KIND.MASONRY;
  bx(fA - 0.3, 44, y0, y0 + 1.6, 0.8, 6.0, white, { top: shade(white, 0.95) });
  bx(fA + 0.12, 44.4, y0 + 0.35, y0 + 1.3, 0.06, 4.6, hex('#3c3a3a'));
  S.kind = KIND.TIMBER;
  { const p = P(26.6, 43.5); S.cyl(p[0], p[1], y0, y0 + 0.9, 2.2, 1.9, 14, hedge); }
  {
    S.kind = KIND.PLAIN;
    const ga = 17, gb = 46, gd = 6, gw = 8;
    bx(ga - 0.6, gb, y0, y0 + 3.2, gd - 1.8, gw - 1.2, cream);
    for (const sb of [-1, 1]) for (const k of [0, 1, 2]) { const p = P(ga + gd / 2 - 0.4, gb + sb * (gw / 2 - 0.4 - k * 1.6)); S.box(p[0], p[1], y0, y0 + 3.2, 0.36, 0.36, ANG, white); }
    bx(ga - 0.6, gb, y0 + 1.0, y0 + 2.6, gd - 1.75, gw - 3.4, glass);
    bx(ga, gb, y0 + 3.2, y0 + 3.75, gd + 0.4, gw + 0.4, white, { top: shade(white, 0.92) }); // flat roof slab
  }

  // the boundary on Điện Biên Phủ: a rubble-stone wall under a rendered coping and an iron railing
  {
    const W = (s) => P(36.36 - 0.794 * s, 72.55 - 0.608 * s); // 7.5 m off the street's centre line, behind a wide pavement
    const st = { h: 2.6, plinth: 1.8, rail: true, t: 0.5, every: 3.2, postW: 0.55, postUp: 0.2, wall: rubble, cap: render, iron, pierW: 0.8, pierUp: 0.9 };
    fence(S, [W(5), W(60), W(120)], st, { closed: false, roads });
    // the trees behind the wall
    if (Array.isArray(data.trees)) for (let s = 12, k = 0; s <= 114; s += 5.5, k++) {
      const p = W(s), d = k % 2 ? 3.5 : 8, q = [p[0] + d * (0.608 * f[0] - 0.794 * u[0]), p[1] + d * (0.608 * f[1] - 0.794 * u[1])];
      if (inRing(q[0], q[1], plaza)) continue;
      data.trees.push(Math.round(q[0] * 10), Math.round(q[1] * 10), 11 + (k % 4), k % 2);
    }
  }
  // no generated houses inside the museum's grounds (between the railing, the wall and the forecourt)
  if (Array.isArray(data.infill)) {
    const G = [[31.5, -31], [31.5, 72], [36.36 - 0.794 * 120, 72.55 - 0.608 * 120], [-46, -1], [-20, -33]].map(([a, b]) => P(a, b));
    const a = data.infill, R = 8, keep = [];
    const near = data.meta?.counts?.infillNear ?? a.length / R;
    let nearKept = 0;
    for (let i = 0; i < a.length / R; i++) {
      if (inRing(a[i * R] / 10, a[i * R + 1] / 10, G)) continue;
      if (i < near) nearKept++;
      for (let j = 0; j < R; j++) keep.push(a[i * R + j]);
    }
    if (keep.length !== a.length) {
      a.length = 0;
      for (const v of keep) a.push(v);
      if (data.meta?.counts && data.meta.counts.infillNear != null) data.meta.counts.infillNear = nearKept;
    }
  }

  // the kiosk by the west corner (red tiled hip roof) and the low blue-roofed outbuilding along the west drive
  {
    const k = P(-14, 22.3);
    S.kind = KIND.PLAIN;
    S.box(k[0], k[1], y0, y0 + 2.7, 3.4, 3.4, ANG, cream);
    S.hip(k[0], k[1], 3.4, 3.4, ANG, y0 + 2.7, 1.4, roofC, { over: 0.6, fascia: 0.15, fasciaCol: white });
    const o = P(-4, 29.7);
    S.box(o[0], o[1], y0, y0 + 3.0, 14, 4.6, ANG, cream);
    S.hip(o[0], o[1], 14, 4.6, ANG, y0 + 3.0, 1.2, blueRoof, { over: 0.5 });
  }

  // ---------------- the museum ----------------
  // plinth and steps on all four faces (the widest on the Lê Lợi front)
  S.kind = KIND.MASONRY;
  S.prism(ring(-HA - 0.6, HA + 0.6, -HB - 0.6, HB + 0.6), y0 - 0.3, F, stone, shade(stone, 1.06));
  const faces = [
    { n: f, t: u, h: HA, w: HB, front: true, steps: 12.6 },
    { n: u, t: [-f[0], -f[1]], h: HB, w: HA, steps: 7.0 },
    { n: [-f[0], -f[1]], t: [-u[0], -u[1]], h: HA, w: HB, steps: 7.0 },
    { n: [-u[0], -u[1]], t: f, h: HB, w: HA, steps: 7.0, plain: true }, // the north-east face (Trần Thúc Nhẫn)
  ];
  for (const fc of faces) {
    const ang = Math.atan2(fc.n[1], fc.n[0]);
    for (let k = 0; k < 6; k++) {
      const d = (6 - k) * 0.45, s = fc.h + 0.6 + d / 2;
      S.box(C[0] + s * fc.n[0], C[1] + s * fc.n[1], y0, y0 + ((F - y0) * (k + 1)) / 6, d, fc.steps, ang, shade(stone, 1.08 - k * 0.02));
    }
  }
  for (const s of [-1, 1]) bx(HA + 2.0, s * (12.6 / 2 + 0.25), y0, F + 0.35, 3.4, 0.4, white); // cheek walls of the front steps

  const CB = 4.0; // corner blocks: 4 m square, standing 0.35 m proud of both faces, up to the parapet
  S.kind = KIND.PLAIN;
  // ground floor recessed 2.2 m; the white first floor and parapet as one block; the loggia's back wall 2.0 m in
  S.prism(ring(-HA + 2.2, HA - 2.2, -HB + 2.2, HB - 2.2), F, G1, pinkD, pinkD, { top: false });
  S.prism(ring(-HA, HA, -HB, HB), G1, PT, white, white, { top: false });
  S.prism(ring(-HA - 0.08, HA + 0.08, -HB - 0.08, HB + 0.08), PT - 0.25, PT, shade(white, 0.92), white, { top: false }); // parapet coping
  S.prism(ring(-HA + 2.0, HA - 2.0, -HB + 2.0, HB - 2.0), PT, E, pink, pink, { top: false });
  S.prism(ring(-HA - 0.1, HA + 0.1, -HB - 0.1, HB + 0.1), E - 0.4, E, white, white, { top: false }); // soffit and eave slab
  S.prism(ring(-HA + 0.05, HA - 0.05, -HB + 0.05, HB - 0.05), PT - 0.02, PT + 0.02, white, white); // the loggia floor
  for (const fc of faces) {
    const Q = (s, t) => [C[0] + s * fc.n[0] + t * fc.t[0], C[1] + s * fc.n[1] + t * fc.t[1]];
    const ang = Math.atan2(fc.n[1], fc.n[0]);
    const q = (s, t, ya, yb, ds, dt, col, o) => { const p = Q(s, t); S.box(p[0], p[1], ya, yb, ds, dt, ang, col, o); };
    const ql = (s, t, ya, yb, ds, dt) => { const p = Q(s, t); L.box(p[0], p[1], ya, yb, ds, dt, ang, [1, 1, 1]); };
    const span = fc.w - CB + 0.35; // half the span between the corner blocks
    // ground floor: dark glazing on the recessed wall with white mullions, round white columns along the face
    q(fc.h - 2.2 + 0.05, 0, F + 0.15, G1 - 0.3, 0.1, span * 2 - 0.6, glass);
    for (let t = -span + 1.3; t <= span - 1.29; t += 1.9) q(fc.h - 2.2 + 0.12, t, F + 0.15, G1 - 0.3, 0.06, 0.12, white);
    ql(fc.h - 2.2 + 0.16, 0, F + 0.4, G1 - 0.6, 0.04, span * 2 - 1.2);
    const nc = 6, cs = (span * 2 - 2.0) / (nc - 1);
    for (let i = 0; i < nc; i++) {
      const t = -span + 1.0 + i * cs;
      if (fc.front && Math.abs(t) < 1.8) continue;
      const p = Q(fc.h - 0.45, t);
      S.cyl(p[0], p[1], F, G1, 0.28, 0.28, 10, white, { cap: false });
    }
    // first floor: the projecting strip of fretwork windows (dark lattice in white frames) on the white band
    const strips = fc.front ? [[-span + 0.4, -3.1], [3.1, span - 0.4]] : [[-span + 0.4, span - 0.4]];
    for (const [t0, t1] of strips) {
      const tm = (t0 + t1) / 2, tw = t1 - t0;
      q(fc.h + 0.25, tm, LT0 - 0.15, LT1 + 0.15, 0.5, tw + 0.3, white);
      q(fc.h + 0.52, tm, LT0, LT1, 0.06, tw, fret);
      ql(fc.h + 0.56, tm, LT0 + 0.1, LT1 - 0.1, 0.02, tw - 0.2);
      const np = Math.round(tw / 1.15);
      for (let i = 0; i <= np; i++) q(fc.h + 0.56, t0 + (tw * i) / np, LT0, LT1, 0.04, 0.09, white);
      for (const yy of [LT0 + 0.5, LT1 - 0.55]) q(fc.h + 0.56, tm, yy, yy + 0.05, 0.04, tw, shade(white, 0.85));
      for (let i = 0; i < np; i++) { const tc = t0 + (tw * (i + 0.5)) / np; q(fc.h + 0.57, tc, LT0 + 0.5, LT1 - 0.5, 0.04, 0.05, shade(white, 0.85)); }
    }
    q(fc.h + 0.04, 0, G1 - 0.05, G1 + 0.3, 0.1, span * 2 + 0.6, shade(white, 0.9)); // the slab edge over the ground floor
    if (fc.front) {
      // lotus relief panel between the strips, the name in dark letters and the red banner under it
      q(fc.h + 0.12, 0, LT0 - 0.4, PT - 0.6, 0.25, 5.6, white);
      for (const [t, w, hh] of [[0, 0.9, 2.3], [-0.85, 0.7, 1.7], [0.85, 0.7, 1.7], [-1.6, 0.55, 1.1], [1.6, 0.55, 1.1]]) q(fc.h + 0.27, t, LT0 + 0.2, LT0 + 0.2 + hh, 0.08, w, shade(white, 0.88));
      q(fc.h + 0.04, 0, G1 + 1.1, G1 + 1.5, 0.06, 6.4, hex('#5a4a52'));
      q(fc.h + 0.04, 0, G1 + 0.85, G1 + 1.0, 0.06, 3.8, hex('#5a4a52'));
      q(fc.h + 0.04, 0, G1 + 0.35, G1 + 0.7, 0.06, 7.0, red);
      q(fc.h + 0.07, 0, G1 + 0.44, G1 + 0.6, 0.04, 6.0, gold);
      // the entrance: double glass doors in a dark frame at the back of the porch
      q(fc.h - 2.2 + 0.14, 0, F, F + 3.0, 0.1, 3.6, hex('#1d2226'));
      ql(fc.h - 2.2 + 0.2, 0, F + 0.1, F + 2.8, 0.03, 3.2);
    }
    // top floor: the loggia, dark windows on its pink back wall, thin white columns under the soffit
    const lw = fc.w * 2 - 2.0; // the loggia runs the full face (the corner blocks stop at the parapet)
    for (let i = 0; i < 8; i++) {
      const t = -lw / 2 + (lw * (i + 0.5)) / 8;
      q(fc.h - 2.0 + 0.05, t, PT + 0.5, E - 0.9, 0.08, lw / 8 - 1.4, glass);
      ql(fc.h - 2.0 + 0.1, t, PT + 0.7, E - 1.1, 0.03, lw / 8 - 1.8);
    }
    for (let i = 0; i <= 8; i++) {
      const p = Q(fc.h - 0.3, -fc.w + 0.3 + ((fc.w * 2 - 0.6) * i) / 8);
      S.cyl(p[0], p[1], PT, E - 0.4, 0.14, 0.14, 8, white, { cap: false });
    }
  }
  // the grey-green corner blocks; tall glazing on both faces except the north-east ones (plain), a sage panel above
  for (const sa of [-1, 1]) for (const sb of [-1, 1]) {
    const a = sa * (HA - CB / 2 + 0.35), b = sb * (HB - CB / 2 + 0.35);
    bx(a, b, F - 0.05, PT, CB, CB, sage, { top: sageD });
    bx(a, b, PT - 0.3, PT, CB + 0.15, CB + 0.15, white);
    const gTop = PT - 1.6;
    const pf = P(sa * (HA + 0.36), b);
    S.box(pf[0], pf[1], F + 0.4, gTop, 0.06, CB - 0.8, ANG, glass);
    L.box(pf[0] + f[0] * sa * 0.04, pf[1] + f[1] * sa * 0.04, F + 0.6, gTop - 0.2, 0.02, CB - 1.2, ANG, [1, 1, 1]);
    for (const k of [-1, 0, 1]) { const m = P(sa * (HA + 0.4), b + k * ((CB - 0.8) / 3)); S.box(m[0], m[1], F + 0.4, gTop, 0.05, 0.1, ANG, sageD); }
    for (let y = F + 2.2; y < gTop - 0.3; y += 2.2) S.box(pf[0], pf[1], y, y + 0.1, 0.1, CB - 0.8, ANG, sageD);
    if (sb > 0) { // the south-west face of the south and west blocks
      const ps = P(a, sb * (HB + 0.36));
      S.box(ps[0], ps[1], F + 0.4, gTop, CB - 0.8, 0.06, ANG, glass);
      for (const k of [-1, 0, 1]) { const m = P(a + k * ((CB - 0.8) / 3), sb * (HB + 0.4)); S.box(m[0], m[1], F + 0.4, gTop, 0.1, 0.05, ANG, sageD); }
      for (let y = F + 2.2; y < gTop - 0.3; y += 2.2) S.box(ps[0], ps[1], y, y + 0.1, CB - 0.8, 0.1, ANG, sageD);
    }
  }

  // the roofs: one big hip roof, its eave on the mapped outline, white hip ridges; the lantern on top
  S.kind = KIND.TILE;
  const RH = 4.8;
  S.hip(C[0], C[1], HA * 2, HB * 2, ANG, E, RH, roofC, { over: OV, fascia: 0.45, fasciaCol: white, ridgeCol: white, hips: false });
  {
    const hw = HA + OV, hd = HB + OV, rl = Math.max(0, hw - hd * 0.92);
    const at = (a, b, y) => { const p = P(a, b); return [p[0], y, p[1]]; };
    for (const sa of [-1, 1]) for (const sb of [-1, 1]) S.beam(at(sa * hw, sb * hd, E + 0.12), at(sa * rl, 0, E + RH + 0.12), 0.35, 0.25, white);
  }
  const LW = 11.0, LH = y0 + 16.8; // lantern: 11 m square, its walls from inside the roof
  S.kind = KIND.PLAIN;
  bx(0, 0, E + 1.6, LH + 2.2, LW, LW, pink);
  for (const sa of [-1, 1]) for (const sb of [-1, 1]) bx(sa * (LW / 2 - 0.2), sb * (LW / 2 - 0.2), LH, LH + 2.2, 0.5, 0.5, white);
  for (const s of [-1, 1]) {
    bx(s * (LW / 2 + 0.03), 0, LH + 0.5, LH + 1.7, 0.06, LW - 1.4, glass);
    bx(0, s * (LW / 2 + 0.03), LH + 0.5, LH + 1.7, LW - 1.4, 0.06, glass);
  }
  S.kind = KIND.TILE;
  S.hip(C[0], C[1], LW, LW, ANG, LH + 2.2, 2.6, roofC, { over: 1.3, fascia: 0.3, fasciaCol: white, ridgeCol: white });

  // night: lamps round the forecourt and at the gate, the glazing warm
  S.kind = KIND.PLAIN;
  for (const [a, b] of [[HA + 7.6, -HB - 6], [HA + 7.6, HB + 6], [-HA - 7, -HB - 7], [-HA - 7, HB + 7], [0, -HB - 8], [0, HB + 8], [26, 33], [26, 38]]) {
    const p = P(a, b);
    S.cyl(p[0], p[1], y0, y0 + 4.6, 0.08, 0.06, 6, hex('#3a3d40'), { cap: false });
    S.cyl(p[0], p[1], y0 + 4.5, y0 + 4.9, 0.22, 0.22, 8, white);
    lamp(p, y0 + 4.7);
  }
  for (const p of piers) lamp([p[0], p[1]], p[2] + 0.2, [1, 0.9, 0.7]);
  const pts = glowPoints(lamps, lampCol, 5);
  pts.userData.glow = true;
  pts.userData.landmark = id;
  group.add(pts);
  if (L.n) {
    const m = new THREE.Mesh(L.geometry(), lightMaterial(0xffd9a0, 0.9));
    m.renderOrder = 19;
    m.userData.landmark = id;
    group.add(m);
  }
  S.kind = KIND.PLAIN;
  S.base = 0;
}

// a palm: a slightly leaning trunk and a crown of drooping fronds
function palm(S, p, y, h) {
  S.kind = KIND.TIMBER;
  const lean = 0.25;
  S.cyl(p[0], p[1], y, y + h, 0.22, 0.16, 6, trunk, { cap: false });
  const top = [p[0] + lean, y + h, p[1]];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2, dx = Math.cos(a), dz = Math.sin(a);
    const mid = [top[0] + dx * 1.5, top[1] + 0.45, top[2] + dz * 1.5], tip = [top[0] + dx * 3.0, top[1] - 0.9, top[2] + dz * 3.0];
    S.beam(top, mid, 0.7, 0.08, palmC);
    S.beam(mid, tip, 0.55, 0.06, shade(palmC, 0.9));
  }
}

// a cloud-pruned pine (cây thế) in a big glazed pot: stacked pads on a short trunk
function topiary(S, p, y, h) {
  S.kind = KIND.MASONRY;
  S.cyl(p[0], p[1], y, y + 0.7, 0.55, 0.7, 10, pot);
  S.kind = KIND.TIMBER;
  S.cyl(p[0], p[1], y + 0.7, y + h, 0.09, 0.07, 5, trunk, { cap: false });
  const n = Math.max(2, Math.round(h / 0.9));
  for (let i = 0; i < n; i++) {
    const yy = y + 1.1 + ((h - 0.9) * i) / n, r = 0.85 - (0.4 * i) / n;
    S.cyl(p[0], p[1], yy, yy + 0.45, r, r * 0.85, 8, hedge);
  }
}

// a Norfolk pine: a straight trunk with flat tiers of branches, narrowing to the top
function norfolk(S, p, y, h) {
  S.kind = KIND.TIMBER;
  S.cyl(p[0], p[1], y, y + h, 0.3, 0.08, 6, trunk, { cap: false });
  const y1 = y + Math.min(2.5, h * 0.15), n = Math.round((h - (y1 - y)) / 0.9);
  for (let i = 0; i < n; i++) {
    const t = i / n, yy = y1 + (h - (y1 - y) - 0.4) * t, r = (h / 6.5) * (1 - t) + 0.45;
    S.cyl(p[0], p[1], yy, yy + 1.0, r, r * 0.6, 8, shade(pine, 0.95 + 0.1 * (i % 2)));
  }
}
