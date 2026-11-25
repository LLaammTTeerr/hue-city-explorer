import { addEmissiveStripMesh } from '../helpers.ts';
import * as THREE from 'three';
import { KIND, Buf, hex, shade } from '../../geo/buf.ts';
import { LAND_Y } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { glowPoints, lightMaterial } from '../../geo/materials.ts';
import { roadsNear, offStreets } from '../enclosure.ts';

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
const glass = hex('#2b343a'), fret = hex('#5c5e60'), roofC = hex('#c8665a'), stone = hex('#b9b3aa'), pave = hex('#c9c4ba');
const lawn = hex('#5f8a45'), hedge = hex('#3f6a34'), palmC = hex('#4c7a38'), trunk = hex('#8a7a66'), pine = hex('#3d6a3a');
const red = hex('#b8262b'), gold = hex('#d8b24a'), pot = hex('#9c5a48'), cream = hex('#ece4d2');
const rubble = hex('#8a877e'), render = hex('#d2b65a'), iron = hex('#26342c'), soffitC = hex('#fbfaf6');

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
  const P = (a, b): [number, number] => [C[0] + a * f[0] + b * u[0], C[1] + a * f[1] + b * u[1]];
  const ANG = Math.atan2(f[1], f[0]);
  const bx = (a, b, ya, yb, da, db, col, o?) => { const p = P(a, b); S.box(p[0], p[1], ya, yb, da, db, ANG, col, o); };
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
  const PLAZA = [[-46, -1], [-20, -32], [23, -27], [23, 4.2], [30.0, 4.2], [30.0, 40], [15, 43], [-9, 26]].map(([a, b]) => P(a, b));
  const plaza = offStreets(data, PLAZA, 0.3);
  const paved0 = S.n;
  S.kind = KIND.MASONRY;
  S.prism(plaza, y0 - 0.3, y0 + 0.05, pave, pave, { topKind: KIND.ROAD });
  S.prism(ring(HA + 0.6, HA + 8.0, -HB - 1, HB + 1), y0 - 0.2, y0 + 0.08, shade(pave, 0.94), shade(pave, 0.94), { topKind: KIND.ROAD }); // the darker apron before the steps
  (S.paved = S.paved || []).push([paved0, S.n]);

  // the Lê Lợi frontage has no railing: the forecourt opens straight onto the pavement. East of the axis a kerbed bed
  // of lawn and clipped hedge with a row of royal palms, curving round the fountain on the axis; west of it open
  // paving to the gate
  S.kind = KIND.PLAIN;
  const GA0 = 23.2, GA1 = 29.9; // the bed's depth along f, up to the pavement
  S.prism(ring(GA0, GA1, -27, -4.2), y0 - 0.2, y0 + 0.35, white, lawn);
  S.prism(ring(GA0, GA1 - 2.2, -4.2, 4.2), y0 - 0.2, y0 + 0.3, white, lawn);
  S.kind = KIND.TIMBER;
  S.prism(ring(GA1 - 1.0, GA1 - 0.25, -26.5, -4.6), y0 + 0.35, y0 + 0.95, hedge, shade(hedge, 1.1)); // hedge along the kerb
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
  // royal palms through the bed, the first ones curving round the fountain (the crescent seen from above)
  for (const [a, b] of ([[26.8, -24], [26.8, -18.5], [26.8, -13], [26.6, -8.6], [25.4, -5.6], [23.9, -3.8], [23.9, 3.8]] as any[])) palm(S, P(a, b), y0 + 0.35, 10 + ((b * 7) % 3 + 3) % 3);
  for (let b = -25.5; b <= -6; b += 3.2) {
    const p = P(GA1 - 2.0, b);
    S.kind = KIND.MASONRY;
    S.cyl(p[0], p[1], y0 + 0.35, y0 + 0.9, 0.4, 0.5, 8, pot);
    S.kind = KIND.TIMBER;
    S.cyl(p[0], p[1], y0 + 0.9, y0 + 1.6, 0.85, 0.15, 7, palmC, { cap: false });
  }
  // topiary pines in big pots on the apron either side of the steps
  for (const b of [-9.0, -6.5, 6.5, 9.0]) topiary(S, P(HA + 3.6, b), y0 + 0.08, Math.abs(b) > 8 ? 3.4 : 2.6);
  for (const b of [-HB - 1.5, HB + 1.5]) topiary(S, P(HA + 1.4, b), y0 + 0.08, 3.0);
  // Norfolk pines on the east side of the forecourt, by Trần Thúc Nhẫn (right of the north-east face from the street)
  if (Array.isArray(data.trees)) { const p = P(10, -29.5); data.trees.push(Math.round(p[0] * 10), Math.round(p[1] * 10), 13, 0); }
  for (const [a, b, h] of ([[-12, -27.5, 20], [-19, -27, 22]] as any[])) norfolk(S, P(a, b), y0, h);

  // the Trần Thúc Nhẫn edge of the forecourt, along the lane's kerb: a kerbed hedge toward Lê Lợi, the car entrance
  // closed by a red-and-white drop barrier, then a bed of shrubs
  {
    const kb = (a) => -42.1 + (a + 74.8) * 0.1275 + 2.5; // the kerb line, 2.5 m in from the lane's centre line
    const strip = (a0, a1, w, ya, yb, side, top) => S.prism([P(a0, kb(a0)), P(a1, kb(a1)), P(a1, kb(a1) + w), P(a0, kb(a0) + w)], ya, yb, side, top);
    S.kind = KIND.PLAIN;
    strip(0.5, 22.5, 1.4, y0 - 0.2, y0 + 0.3, white, lawn);
    strip(-14, -6.5, 2.4, y0 - 0.2, y0 + 0.3, white, lawn);
    S.kind = KIND.TIMBER;
    S.prism([P(0.8, kb(0.8) + 0.2), P(22.2, kb(22.2) + 0.2), P(22.2, kb(22.2) + 1.1), P(0.8, kb(0.8) + 1.1)], y0 + 0.3, y0 + 0.95, hedge, shade(hedge, 1.1));
    for (const [a, r, h] of ([[-7.4, 0.9, 1.5], [-8.9, 1.1, 2.2], [-10.6, 0.8, 1.3], [-12.0, 1.0, 1.9], [-13.3, 0.7, 1.2]] as any[])) {
      const p = P(a, kb(a) + 1.2);
      S.cyl(p[0], p[1], y0 + 0.3, y0 + 0.3 + h, r, r * 0.7, 8, shade(hedge, 1.0 + 0.08 * (a % 2)));
    }
    // the barrier: a striped pole on low red stands
    S.kind = KIND.PLAIN;
    const ba0 = -0.2, ba1 = -6.2;
    for (const a of [ba0, -2.2, -4.2, ba1]) { const p = P(a, kb(a) + 0.4); S.box(p[0], p[1], y0, y0 + 0.55, 0.12, 0.12, ANG, red); }
    for (let k = 0; k < 6; k++) {
      const a0 = ba0 + ((ba1 - ba0) * k) / 6, a1 = ba0 + ((ba1 - ba0) * (k + 1)) / 6;
      S.beam([P(a0, kb(a0) + 0.4)[0], y0 + 0.6, P(a0, kb(a0) + 0.4)[1]], [P(a1, kb(a1) + 0.4)[0], y0 + 0.6, P(a1, kb(a1) + 0.4)[1]], 0.08, 0.08, k % 2 ? white : red);
    }
  }

  // the sign wall at the west end of the frontage (the museum's name on a dark plaque), a bed behind it, the gatehouse
  const fA = 30.85;
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

  // the boundary on Điện Biên Phủ: a rubble-stone wall under a yellow rendered coping, a see-through iron railing of
  // thin bars on it, and behind it a dense screen of trees and bamboo that hides all but glimpses of the museum
  {
    const W = (s) => P(36.36 - 0.794 * s, 72.55 - 0.608 * s); // 7.5 m off the street's centre line, behind a wide pavement
    const inw = [0.608 * f[0] - 0.794 * u[0], 0.608 * f[1] - 0.794 * u[1]]; // toward the grounds
    const off = (p, d): [number, number] => [p[0] + d * inw[0], p[1] + d * inw[1]];
    const s0 = 5, s1 = 120, a0 = W(s0), a1 = W(s1), wang = Math.atan2(a1[1] - a0[1], a1[0] - a0[0]);
    const gy = (p) => LAND_Y + rise(p[0], p[1]);
    const HW = 1.8, HC = 0.28, HR = 1.25, BAY = 2.6; // wall, coping, railing heights; bay length
    const nb = Math.round((s1 - s0) / BAY), bl = (s1 - s0) / nb;
    for (let k = 0; k < nb; k++) {
      const m = W(s0 + (k + 0.5) * bl), y = gy(m);
      S.base = y - LAND_Y;
      S.kind = KIND.PLAIN;
      S.box(m[0], m[1], y - 0.4, y + HW, bl + 0.01, 0.5, wang, shade(rubble, 0.94 + 0.08 * ((k * 5) % 3) / 2));
      // stones in the face: a few lighter and darker patches proud of the wall
      for (let j = 0; j < 5; j++) {
        const t = ((k * 37 + j * 53) % 97) / 97 - 0.5, yy = 0.15 + (((k * 17 + j * 29) % 11) / 11) * (HW - 0.55);
        const p = off(W(s0 + (k + 0.5 + t * 0.85) * bl), -0.26);
        S.box(p[0], p[1], y + yy, y + yy + 0.22 + 0.1 * (j % 2), 0.35 + 0.15 * (j % 3), 0.04, wang, shade(rubble, j % 2 ? 1.18 : 0.78));
      }
      S.box(m[0], m[1], y + HW, y + HW + HC, bl + 0.01, 0.56, wang, render); // the coping band
      // the railing: posts at the bay ends, top and bottom rails, thin bars
      const p0 = W(s0 + k * bl);
      S.box(p0[0], p0[1], y + HW + HC, y + HW + HC + HR + 0.1, 0.1, 0.1, wang, iron);
      S.box(m[0], m[1], y + HW + HC + 0.08, y + HW + HC + 0.13, bl, 0.05, wang, iron);
      S.box(m[0], m[1], y + HW + HC + HR - 0.06, y + HW + HC + HR, bl, 0.06, wang, iron);
      const nbars = Math.round(bl / 0.32);
      for (let j = 1; j < nbars; j++) { const p = W(s0 + k * bl + (bl * j) / nbars); S.box(p[0], p[1], y + HW + HC + 0.13, y + HW + HC + HR - 0.06, 0.025, 0.025, wang, iron); }
    }
    { const p = a1, y = gy(p); S.box(p[0], p[1], y + HW + HC, y + HW + HC + HR + 0.1, 0.1, 0.1, wang, iron); }
    S.base = y0 - LAND_Y;
    // the screen behind the wall: bamboo clumps against it, then three rows of trees (broadleaf, upright, pine)
    for (let s = 9, k = 0; s <= 116; s += 6.5, k++) bamboo(S, off(W(s + (k % 3) - 1), 1.4), y0, 7 + (k % 3));
    if (Array.isArray(data.trees)) for (let s = 8, k = 0; s <= 116; s += 3.4, k++) {
      const d = [2.8, 5.6, 8.6][k % 3], q = off(W(s), d);
      if (inRing(q[0], q[1], plaza)) continue;
      data.trees.push(Math.round(q[0] * 10), Math.round(q[1] * 10), 11 + ((k * 7) % 5), [0, 1, 4][(k * 2) % 3]);
    }
  }
  // no generated houses inside the museum's grounds (between Lê Lợi, Điện Biên Phủ and Trần Thúc Nhẫn, north to where
  // the paving behind the building gives way to the trees by the lane); trees where the satellite shows them north of
  // the north corner
  if (Array.isArray(data.trees)) for (const [a, b, h] of ([[-44, -9, 12], [-50, -16, 13], [-38, -18, 11]] as any[])) { const p = P(a, b); data.trees.push(Math.round(p[0] * 10), Math.round(p[1] * 10), h, 0); }
  if (Array.isArray(data.infill)) {
    const G = [[31.5, -31], [31.5, 72], [36.36 - 0.794 * 120, 72.55 - 0.608 * 120], [-62, -22], [-35, -37], [-20, -33]].map(([a, b]) => P(a, b));
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

  // the kiosk by the west corner (red tiled hip roof); beyond it along the west drive, where older photos show a
  // blue-roofed shed, the 2026 imagery has a hedge, trees and motorbike parking
  {
    const k = P(-14, 22.3);
    S.kind = KIND.PLAIN;
    S.box(k[0], k[1], y0, y0 + 2.7, 3.4, 3.4, ANG, cream);
    S.hip(k[0], k[1], 3.4, 3.4, ANG, y0 + 2.7, 1.4, roofC, { over: 0.6, fascia: 0.15, fasciaCol: white });
    S.kind = KIND.TIMBER;
    const h0 = P(-9, 29.5), h1 = P(9, 41.5), hl = Math.hypot(h1[0] - h0[0], h1[1] - h0[1]);
    S.box((h0[0] + h1[0]) / 2, (h0[1] + h1[1]) / 2, y0, y0 + 0.9, hl, 0.9, Math.atan2(h1[1] - h0[1], h1[0] - h0[0]), hedge);
    if (Array.isArray(data.trees)) for (const [a, b, h] of ([[-6, 32.5, 11], [2.5, 38.5, 12]] as any[])) { const p = P(a, b); data.trees.push(Math.round(p[0] * 10), Math.round(p[1] * 10), h, 0); }
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
    const Q = (s, t): [number, number] => [C[0] + s * fc.n[0] + t * fc.t[0], C[1] + s * fc.n[1] + t * fc.t[1]];
    const ang = Math.atan2(fc.n[1], fc.n[0]);
    const q = (s, t, ya, yb, ds, dt, col, o?) => { const p = Q(s, t); S.box(p[0], p[1], ya, yb, ds, dt, ang, col, o); };
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
      for (const [t, w, hh] of ([[0, 0.9, 2.3], [-0.85, 0.7, 1.7], [0.85, 0.7, 1.7], [-1.6, 0.55, 1.1], [1.6, 0.55, 1.1]] as any[])) q(fc.h + 0.27, t, LT0 + 0.2, LT0 + 0.2 + hh, 0.08, w, shade(white, 0.88));
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

  // the roofs: one big hip roof, its eave on the mapped outline, white hip ridges; the lantern on top. The eave is a
  // thin white slab, its corners tilted up a little, with a white soffit running back to the walls (the building's
  // strongest line from the street)
  S.kind = KIND.TILE;
  const RH = 4.8, FL = 0.55, FA = 0.3; // ridge height, the corners' lift, the slab's thickness
  S.hip(C[0], C[1], HA * 2, HB * 2, ANG, E, RH, roofC, { over: OV, flare: FL, fascia: FA, fasciaCol: white, ridgeCol: white, hips: false });
  const hw = HA + OV, hd = HB + OV;
  const at = (a, b, y) => { const p = P(a, b); return [p[0], y, p[1]]; };
  {
    const rl = Math.max(0, hw - hd * 0.92);
    for (const sa of [-1, 1]) for (const sb of [-1, 1]) S.beam(at(sa * hw, sb * hd, E + FL + 0.12), at(sa * rl, 0, E + RH + 0.12), 0.35, 0.25, white);
  }
  // the soffit, just under the roof's own: from the eave (lifted toward the corners) back to the wall line
  S.kind = KIND.PLAIN;
  {
    const EO = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]], WI = [[-HA, -HB], [HA, -HB], [HA, HB], [-HA, HB]];
    const mix = (A, i, j, t): [number, number] => [A[i][0] + (A[j][0] - A[i][0]) * t, A[i][1] + (A[j][1] - A[i][1]) * t];
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      for (const [t0, t1] of ([[0, 0.5], [0.5, 1]] as any[])) {
        const e0 = mix(EO, i, j, t0), e1 = mix(EO, i, j, t1), w0 = mix(WI, i, j, t0), w1 = mix(WI, i, j, t1);
        const ly = (t) => E - FA - 0.04 + FL * Math.abs(2 * t - 1);
        S.quad(at(e0[0], e0[1], ly(t0)), at(e1[0], e1[1], ly(t1)), at(w1[0], w1[1], E - 0.04), at(w0[0], w0[1], E - 0.04), soffitC, [0, -1, 0]);
      }
    }
  }
  const LW = 11.0, LH = y0 + 16.8; // lantern: 11 m square, its walls from inside the roof
  S.kind = KIND.PLAIN;
  bx(0, 0, E + 1.6, LH + 2.2, LW, LW, pink);
  for (const sa of [-1, 1]) for (const sb of [-1, 1]) bx(sa * (LW / 2 - 0.2), sb * (LW / 2 - 0.2), LH, LH + 2.2, 0.5, 0.5, white);
  for (const s of [-1, 1]) {
    bx(s * (LW / 2 + 0.03), 0, LH + 0.5, LH + 1.7, 0.06, LW - 1.4, glass);
    bx(0, s * (LW / 2 + 0.03), LH + 0.5, LH + 1.7, LW - 1.4, 0.06, glass);
  }
  // the lantern's roof reads from above as its own square: a thicker white eave and white hip ridges
  S.kind = KIND.TILE;
  S.hip(C[0], C[1], LW, LW, ANG, LH + 2.2, 2.6, shade(roofC, 1.05), { over: 1.3, fascia: 0.45, fasciaCol: white, ridgeCol: white });
  {
    const lw = LW / 2 + 1.3;
    for (const sa of [-1, 1]) for (const sb of [-1, 1]) S.beam(at(sa * lw, sb * lw, LH + 2.2 + 0.1), at(0, 0, LH + 2.2 + 2.6 + 0.1), 0.3, 0.22, white);
  }

  // night: lamps round the forecourt and at the gate, the glazing warm
  S.kind = KIND.PLAIN;
  for (const [a, b] of ([[HA + 7.6, -HB - 6], [HA + 7.6, HB + 6], [-HA - 7, -HB - 7], [-HA - 7, HB + 7], [0, -HB - 8], [0, HB + 8], [26, 33], [26, 38]] as any[])) {
    const p = P(a, b);
    S.cyl(p[0], p[1], y0, y0 + 4.6, 0.08, 0.06, 6, hex('#3a3d40'), { cap: false });
    S.cyl(p[0], p[1], y0 + 4.5, y0 + 4.9, 0.22, 0.22, 8, white);
    lamp(p, y0 + 4.7);
  }
  const pts = glowPoints(lamps, lampCol, 5);
  pts.userData.glow = true;
  pts.userData.landmark = id;
  group.add(pts);
  addEmissiveStripMesh(group, L, 0xffd9a0, 0.9, id);
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
  const y1 = y + Math.min(2.5, h * 0.15), n = Math.round((h - (y1 - y)) / 0.6);
  for (let i = 0; i < n; i++) {
    const t = i / n, yy = y1 + (h - (y1 - y) - 0.4) * t, r = (h / 7.5) * Math.pow(1 - t, 0.8) + 0.4;
    S.cyl(p[0], p[1], yy, yy + 0.8, r, r * 0.55, 8, shade(pine, 0.95 + 0.1 * (i % 2)));
  }
}

// a clump of bamboo: a ring of thin culms leaning out, a crown of leaf tufts
function bamboo(S, p, y, h) {
  S.kind = KIND.TIMBER;
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + h, r = 0.35, lean = 1.1 + 0.4 * (i % 2);
    const b0 = [p[0] + Math.cos(a) * r, y, p[1] + Math.sin(a) * r], top = [p[0] + Math.cos(a) * (r + lean), y + h - (i % 3) * 0.6, p[1] + Math.sin(a) * (r + lean)];
    S.beam(b0, top, 0.08, 0.08, hex('#7d8f4a'));
    S.cyl(top[0], top[2], top[1] - 2.0, top[1] + 0.3, 0.9, 0.15, 6, shade(hedge, 1.15 + 0.05 * (i % 2)), { cap: false });
  }
}
