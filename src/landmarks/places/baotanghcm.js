import * as THREE from 'three';
import { KIND, Buf, hex, shade } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { glowPoints, lightMaterial } from '../../geo/materials.js';
import { fence, roadsNear, leaves } from '../enclosure.js';
import { flag } from '../anim.js';

// ---- Bảo tàng Hồ Chí Minh (Hồ Chí Minh Museum), 7 Lê Lợi, Huế: the building rebuilt 1998–2000, as it stands in 2026 ----
//
// Sources (fetched Nov 2026; see docs/places/baotanghcm.md):
//  - OSM way 240266284 (tourism=museum, building:levels=2): the footprint, a near-square 31.4 m along Lê Lợi by
//    32.5 m deep, its front parallel to the street. The drive (ways 1473477097, 1473477098) enters from Lê Lợi at the
//    west end of the front, crosses the forecourt about 5 m in front of the steps and runs back along both sides.
//  - bthcm.hue.gov.vn (Giới thiệu chung), baotanghochiminh.vn: rebuilt from 19 May 1998, opened 19 May 2000.
//    ivivu.com (2022): a three-storey building of 2,500 m², with four alike faces.
//  - Photos: vinwonders.com "bao-tang-ho-chi-minh-hue-02.jpg" (front, 2023) and the ivivu.com aerial (2022). They
//    show the form modelled here: three storeys on a stone plinth reached by a flight of steps; pale pink walls with
//    white trim; the ground floor recessed behind slender round white columns; the first floor a solid band with a
//    projecting strip of windows behind dark fretwork grilles (a lattice in the Huế manner), a lotus relief panel
//    over the door and the name "BẢO TÀNG HỒ CHÍ MINH / THỪA THIÊN HUẾ" with a red banner under it; the top floor a
//    loggia of thin white columns under the deep eave of one big salmon-red tiled hip roof with white ridges; on the
//    roof a square lantern (a pink clerestory band under a small hip roof); grey-green corner blocks with tall
//    dark-framed glass. Forecourt: paving, topiary pines in pots, two flagpoles left of the steps, a round fountain
//    bed on the axis between a row of palms, potted cycads behind a hedge along a low railing on Lê Lợi, a small
//    red-roofed kiosk at the west corner and a low blue-roofed outbuilding along the west drive.
// Heights are scaled from the photos on the mapped 31.4 m front (estimates): plinth 1.0 m, storeys 4.3 / 4.0 /
// 3.9 m, eave 12.2 m above the floor, main roof 5.6 m, lantern to 20.6 m above the floor.

export const id = 'baotanghcm';

// footprint (OSM way 240266284), model metres: west, north, east (front-right), south (front-left) corners
const RING = [[-849.9, 1023.1], [-826.0, 1002.7], [-804.7, 1027.2], [-828.6, 1047.6]];

const pink = hex('#e6bfcf'), pinkD = hex('#d3aebf'), white = hex('#f4f1ec'), sage = hex('#a3ab9c'), sageD = hex('#8d968a');
const glass = hex('#2b343a'), fret = hex('#26292c'), roofC = hex('#c8665a'), stone = hex('#b9b3aa'), pave = hex('#bdb7ad');
const asphalt = hex('#77777a'), lawn = hex('#5f8a45'), hedge = hex('#3f6a34'), palmC = hex('#4c7a38'), trunk = hex('#8a7a66');
const red = hex('#b8262b'), gold = hex('#d8b24a'), pot = hex('#9c5a48'), blueRoof = hex('#3d6fa8'), cream = hex('#ece4d2');

export function build({ data, S, group }) {
  // the building's frame: centre C, f the front normal (toward Lê Lợi), u along the front (toward the west end)
  const C = [RING.reduce((s, p) => s + p[0], 0) / 4, RING.reduce((s, p) => s + p[1], 0) / 4];
  const fl = Math.hypot(RING[3][0] - RING[0][0], RING[3][1] - RING[0][1]);
  const f = [(RING[3][0] - RING[0][0]) / fl, (RING[3][1] - RING[0][1]) / fl]; // west corner -> south corner: the depth
  const u = [-f[1], f[0]];
  const HA = 32.5 / 2, HB = 31.4 / 2; // half depth (along f), half front (along u)
  const P = (a, b) => [C[0] + a * f[0] + b * u[0], C[1] + a * f[1] + b * u[1]];
  const ANG = Math.atan2(f[1], f[0]);
  const bx = (a, b, ya, yb, da, db, col, o) => { const p = P(a, b); S.box(p[0], p[1], ya, yb, da, db, ANG, col, o); };
  const ring = (a0, a1, b0, b1) => [P(a0, b0), P(a1, b0), P(a1, b1), P(a0, b1)];

  const y0 = LAND_Y + rise(C[0], C[1]);
  const F = y0 + 1.0; // museum floor, on the plinth
  const E = F + 12.2; // eave of the main roof
  S.base = y0 - LAND_Y;
  const L = new Buf(1024), lamps = [], lampCol = [];
  const lamp = (p, y, c = [1, 0.85, 0.6]) => { lamps.push(p[0], y, p[1]); lampCol.push(...c); };

  // ---------------- grounds ----------------
  // the drive round the building and the forecourt in front of the steps, paved; marked so trees and houses keep off
  const paved0 = S.n;
  S.kind = KIND.ROAD;
  S.prism(ring(-HA - 9, HA + 8.2, -HB - 9.5, HB + 9.5), y0 - 0.3, y0 + 0.05, asphalt, asphalt, { topKind: KIND.ROAD });
  S.kind = KIND.MASONRY;
  S.prism(ring(HA - 1, HA + 8.0, -HB - 2, HB + 2), y0 - 0.2, y0 + 0.09, pave, pave, { topKind: KIND.ROAD }); // stone paving before the steps
  S.prism(ring(HA + 8.2, HA + 14.4, HB + 9.5, HB + 22), y0 - 0.3, y0 + 0.05, asphalt, asphalt, { topKind: KIND.ROAD }); // the entry from Lê Lợi
  (S.paved = S.paved || []).push([paved0, S.n]);

  // the front garden between the drive and the street: kerbed lawn, hedge, fountain, palms, cycads in pots
  S.kind = KIND.PLAIN;
  const GA0 = HA + 8.2, GA1 = HA + 14.4; // its depth along f
  for (const [b0, b1] of [[-HB - 14, -3.4], [3.4, HB + 9.5]]) S.prism(ring(GA0, GA1, b0, b1), y0 - 0.2, y0 + 0.35, white, lawn);
  S.prism(ring(GA0, GA1, -3.4, 3.4), y0 - 0.2, y0 + 0.1, pave, pave); // the walk to the fountain
  S.kind = KIND.TIMBER;
  S.prism(ring(GA1 - 1.2, GA1 - 0.3, -HB - 13.5, HB + 9), y0 + 0.35, y0 + 1.05, hedge, shade(hedge, 1.1)); // hedge along the railing
  // round fountain bed on the axis: a low kerb, a ring of shrubs, a tiered bowl
  {
    const fc = P(GA0 + 3.1, 0);
    S.kind = KIND.MASONRY;
    S.cyl(fc[0], fc[1], y0, y0 + 0.5, 3.0, 3.0, 20, white);
    S.kind = KIND.TIMBER;
    S.cyl(fc[0], fc[1], y0 + 0.5, y0 + 1.0, 2.7, 2.4, 20, hedge, { cap: false });
    S.kind = KIND.PLAIN;
    S.cyl(fc[0], fc[1], y0 + 0.5, y0 + 0.55, 2.4, 2.4, 20, lawn);
    S.cyl(fc[0], fc[1], y0 + 0.5, y0 + 1.1, 1.4, 1.5, 12, cream);
    S.cyl(fc[0], fc[1], y0 + 1.1, y0 + 1.12, 1.3, 1.3, 12, hex('#6d8fa0'));
    S.cyl(fc[0], fc[1], y0 + 1.1, y0 + 1.9, 0.2, 0.25, 8, cream);
    S.cyl(fc[0], fc[1], y0 + 1.9, y0 + 2.1, 0.7, 0.75, 10, cream);
    S.cyl(fc[0], fc[1], y0 + 2.1, y0 + 2.6, 0.12, 0.1, 6, cream);
  }
  // palms in a row through the garden (coconut-like: curved crowns), two either side of the walk and a few beyond
  for (const b of [-22, -16.5, -11, -5.4, 5.4, 11, 16.5, 22]) palm(S, P(GA0 + 3.0 + (Math.abs(b) > 12 ? 0.6 : 0), b), y0 + 0.35, 9 + ((b * 7) % 3 + 3) % 3);
  // potted cycads along the hedge
  for (let b = -HB - 12; b <= HB + 8; b += 3.2) {
    if (Math.abs(b) < 3.6) continue;
    const p = P(GA1 - 2.2, b);
    S.kind = KIND.MASONRY;
    S.cyl(p[0], p[1], y0 + 0.35, y0 + 0.9, 0.4, 0.5, 8, pot);
    S.kind = KIND.TIMBER;
    S.cyl(p[0], p[1], y0 + 0.9, y0 + 1.6, 0.85, 0.15, 7, palmC, { cap: false });
  }
  // topiary pines in big pots on the paving either side of the steps
  for (const b of [-9.5, -6.5, 6.5, 9.5]) topiary(S, P(HA + 3.6, b), y0 + 0.09, Math.abs(b) > 8 ? 3.4 : 2.6);
  for (const b of [-HB - 1.5, HB + 1.5]) topiary(S, P(HA + 1.2, b), y0 + 0.09, 3.0);
  // two flagpoles left of the steps (seen from the street), red flags
  for (const b of [10.8, 12.4]) {
    const p = P(HA + 6.2, b);
    S.kind = KIND.PLAIN;
    S.box(p[0], p[1], y0, y0 + 0.4, 0.8, 0.8, ANG, stone);
    S.cyl(p[0], p[1], y0 + 0.4, y0 + 10.5, 0.07, 0.05, 6, white, { cap: false });
    flag(group, { at: [p[0], y0 + 10.2, p[1]], w: 1.9, h: 1.3, look: red, landmark: id }); // waves down-wind (anim.js)
  }

  // the railing on Lê Lợi: a low white wall with dark bars, stone gate piers where the drive comes in
  const roads = roadsNear(data, C, 120);
  const rail = { h: 1.6, plinth: 0.55, rail: true, t: 0.3, every: 3.0, postW: 0.42, postUp: 0.15, wall: hex('#ece8df'), cap: hex('#c9c3b8'), iron: hex('#2c3032'), pierW: 1.0, pierUp: 1.0 };
  const fA = HA + 14.6, gate1 = P(fA, HB + 15.8), gate2 = P(fA, -HB - 9.6);
  const piers = fence(S, [P(fA, -HB - 14.5), P(fA, HB + 23)], rail, { closed: false, roads, openings: [[gate1[0], gate1[1], 3.4], [gate2[0], gate2[1], 3.0]] });
  for (let i = 0; i + 1 < piers.length; i += 2) leaves(S, piers[i], piers[i + 1], y0, 1.5, rail.iron);

  // the kiosk at the west corner of the garden (red tiled hip roof) and the low outbuilding along the west drive
  {
    const k = P(GA0 + 2.6, HB + 11.5);
    S.kind = KIND.PLAIN;
    S.box(k[0], k[1], y0, y0 + 2.7, 3.4, 3.4, ANG, cream);
    S.hip(k[0], k[1], 3.4, 3.4, ANG, y0 + 2.7, 1.4, roofC, { over: 0.6, fascia: 0.15, fasciaCol: white });
    const o = P(-4, HB + 14);
    S.box(o[0], o[1], y0, y0 + 3.0, 14, 4.6, ANG, cream);
    S.hip(o[0], o[1], 14, 4.6, ANG, y0 + 3.0, 1.2, blueRoof, { over: 0.5 });
  }

  // ---------------- the museum ----------------
  // plinth and the front steps
  S.kind = KIND.MASONRY;
  S.prism(ring(-HA - 0.6, HA + 0.6, -HB - 0.6, HB + 0.6), y0 - 0.3, F, stone, shade(stone, 1.06));
  for (let k = 0; k < 6; k++) { const d = (6 - k) * 0.45; bx(HA + 0.6 + d / 2, 0, y0, y0 + ((F - y0) * (k + 1)) / 6, d, 12.6, shade(stone, 1.08 - k * 0.02)); }
  // low cheek walls either side of the steps
  for (const s of [-1, 1]) bx(HA + 2.0, s * 6.55, y0, F + 0.35, 3.4, 0.4, white);

  // four faces; face k has outward normal n and tangent t, half depth h and half span w
  const faces = [
    { n: f, t: u, h: HA, w: HB, front: true },
    { n: u, t: [-f[0], -f[1]], h: HB, w: HA },
    { n: [-f[0], -f[1]], t: [-u[0], -u[1]], h: HA, w: HB },
    { n: [-u[0], -u[1]], t: f, h: HB, w: HA },
  ];
  const CB = 6.8; // corner blocks: 6.8 m square, standing 0.35 m proud of both faces
  const Y1 = F + 4.3, Y2 = Y1 + 4.0, Y3 = Y2 + 3.9; // floors: ground, first, top (Y3 = E)
  S.kind = KIND.PLAIN;
  // the core (inner walls of the ground floor and loggia stand on it), floors and the eave slab
  S.prism(ring(-HA + 2.6, HA - 2.6, -HB + 2.6, HB - 2.6), F, Y1, pinkD, pinkD, { top: false });
  S.prism(ring(-HA, HA, -HB, HB), Y1, Y2, pink, pink, { top: false });
  S.prism(ring(-HA - 0.2, HA + 0.2, -HB - 0.2, HB + 0.2), Y2, Y2 + 0.35, white, white, { top: false }); // floor slab edge
  S.prism(ring(-HA + 2.2, HA - 2.2, -HB + 2.2, HB - 2.2), Y2 + 0.35, E, pinkD, pinkD, { top: false });
  S.prism(ring(-HA - 0.1, HA + 0.1, -HB - 0.1, HB + 0.1), E - 0.4, E, white, white, { top: false });
  S.prism(ring(-HA + 0.1, HA - 0.1, -HB + 0.1, HB - 0.1), Y1 - 0.05, Y1 + 0.02, white, white, { top: false }); // soffit line over the ground floor
  for (const fc of faces) {
    const Q = (s, t) => [C[0] + s * fc.n[0] + t * fc.t[0], C[1] + s * fc.n[1] + t * fc.t[1]];
    const ang = Math.atan2(fc.n[1], fc.n[0]);
    const q = (s, t, ya, yb, ds, dt, col, o) => { const p = Q(s, t); S.box(p[0], p[1], ya, yb, ds, dt, ang, col, o); };
    const ql = (s, t, ya, yb, ds, dt) => { const p = Q(s, t); L.box(p[0], p[1], ya, yb, ds, dt, ang, [1, 1, 1]); };
    const span = fc.w - CB + 0.35; // half the span between the corner blocks
    // ground floor: dark glazing on the recessed wall, the round white columns along the face, white ceiling
    q(fc.h - 2.6 + 0.05, 0, F + 0.2, Y1 - 0.4, 0.1, span * 2 - 1, glass);
    for (let t = -span + 1.4; t <= span - 1.39; t += 2.0) q(fc.h - 2.6 + 0.12, t, F + 0.2, Y1 - 0.4, 0.06, 0.12, white);
    ql(fc.h - 2.6 + 0.16, 0, F + 0.4, Y1 - 0.6, 0.04, span * 2 - 1.4);
    const cols = fc.front ? [-8.3, -5.2, -2.1, 2.1, 5.2, 8.3] : [-8.3, -5.0, -1.7, 1.7, 5.0, 8.3];
    for (const t of cols) {
      if (Math.abs(t) > span - 0.4) continue;
      const p = Q(fc.h - 0.55, t);
      S.cyl(p[0], p[1], F, Y1, 0.3, 0.3, 10, white, { cap: false });
    }
    // first floor: the projecting strip of fretwork windows (dark lattice in white frames), a lotus relief on the front
    const strips = fc.front ? [[-span + 0.6, -3.0], [3.0, span - 0.6]] : [[-span + 0.6, span - 0.6]];
    for (const [t0, t1] of strips) {
      const tm = (t0 + t1) / 2, tw = t1 - t0;
      q(fc.h + 0.3, tm, Y1 + 0.95, Y2 - 0.5, 0.6, tw + 0.3, white);
      q(fc.h + 0.62, tm, Y1 + 1.1, Y2 - 0.65, 0.06, tw, fret);
      ql(fc.h + 0.66, tm, Y1 + 1.2, Y2 - 0.75, 0.02, tw - 0.2);
      // the lattice: a frame every 1.15 m, each pane crossed by a fret of thin light bars
      const np = Math.round(tw / 1.15);
      for (let i = 0; i <= np; i++) q(fc.h + 0.66, t0 + (tw * i) / np, Y1 + 1.1, Y2 - 0.65, 0.04, 0.09, white);
      for (const yy of [Y1 + 1.6, Y2 - 1.15]) q(fc.h + 0.66, tm, yy, yy + 0.05, 0.04, tw, shade(white, 0.85));
      for (let i = 0; i < np; i++) { const tc = t0 + (tw * (i + 0.5)) / np; q(fc.h + 0.67, tc, Y1 + 1.6, Y2 - 1.1, 0.04, 0.05, shade(white, 0.85)); }
    }
    if (fc.front) {
      // lotus relief panel over the door, the name in dark letters, the red banner under it
      q(fc.h + 0.12, 0, Y1 + 0.9, Y2 - 0.3, 0.25, 5.6, white);
      for (const [t, w, hh] of [[0, 0.9, 2.3], [-0.85, 0.7, 1.7], [0.85, 0.7, 1.7], [-1.6, 0.55, 1.1], [1.6, 0.55, 1.1]]) q(fc.h + 0.27, t, Y1 + 1.3, Y1 + 1.3 + hh, 0.08, w, shade(white, 0.88));
      q(fc.h + 0.04, 0, Y1 + 0.35, Y1 + 0.75, 0.06, 6.4, hex('#5a4a52'));
      q(fc.h + 0.04, 0, Y1 + 0.15, Y1 + 0.3, 0.06, 3.8, hex('#5a4a52'));
      q(fc.h + 0.04, 0, Y1 - 0.45, Y1 - 0.1, 0.06, 7.0, red);
      q(fc.h + 0.07, 0, Y1 - 0.36, Y1 - 0.2, 0.04, 6.0, gold);
      // the entrance: double glass doors in a dark frame at the back of the porch
      q(fc.h - 2.6 + 0.14, 0, F, F + 3.2, 0.1, 3.6, hex('#1d2226'));
      ql(fc.h - 2.6 + 0.2, 0, F + 0.1, F + 3.0, 0.03, 3.2);
    } else {
      q(fc.h + 0.04, 0, Y1 + 0.3, Y1 + 0.75, 0.04, span * 2 - 1, pinkD); // a plain string course
    }
    // top floor: the loggia, windows on its back wall, thin white columns under the eave
    q(fc.h - 2.2 + 0.05, 0, Y2 + 1.0, E - 0.9, 0.1, span * 2 - 2.4, glass);
    ql(fc.h - 2.2 + 0.1, 0, Y2 + 1.2, E - 1.1, 0.03, span * 2 - 2.8);
    for (let t = -span + 1.2; t <= span - 1.19; t += (span * 2 - 2.4) / 6) {
      const p = Q(fc.h - 0.45, t);
      S.cyl(p[0], p[1], Y2 + 0.35, E - 0.4, 0.18, 0.18, 8, white, { cap: false });
    }
    q(fc.h - 0.45, 0, Y2 + 0.35, Y2 + 1.1, 0.12, span * 2 - 0.4, white); // balustrade
  }
  // the grey-green corner blocks with their tall glazing, two faces each
  for (const sa of [-1, 1]) for (const sb of [-1, 1]) {
    const a = sa * (HA - CB / 2 + 0.35), b = sb * (HB - CB / 2 + 0.35);
    bx(a, b, F - 0.05, E - 0.25, CB, CB, sage, { top: sageD });
    bx(a, b, E - 0.6, E - 0.25, CB + 0.2, CB + 0.2, white);
    // glazing on the face along the front/back (normal ±f) and on the side face (normal ±u)
    const pf = P(sa * (HA + 0.36), b), ps = P(a, sb * (HB + 0.36));
    S.box(pf[0], pf[1], F + 0.6, E - 1.2, 0.06, 4.2, ANG, glass);
    S.box(ps[0], ps[1], F + 0.6, E - 1.2, 4.2, 0.06, ANG, glass);
    L.box(pf[0] + f[0] * sa * 0.04, pf[1] + f[1] * sa * 0.04, F + 0.8, E - 1.4, 0.02, 3.8, ANG, [1, 1, 1]);
    for (const k of [-2, -1, 0, 1, 2]) { // mullions
      const m1 = P(sa * (HA + 0.4), b + k * 1.05), m2 = P(a + k * 1.05, sb * (HB + 0.4));
      S.box(m1[0], m1[1], F + 0.6, E - 1.2, 0.05, 0.1, ANG, sageD);
      S.box(m2[0], m2[1], F + 0.6, E - 1.2, 0.1, 0.05, ANG, sageD);
    }
    for (let y = F + 2.4; y < E - 1.3; y += 2.0) {
      S.box(pf[0], pf[1], y, y + 0.1, 0.1, 4.2, ANG, sageD);
      S.box(ps[0], ps[1], y, y + 0.1, 4.2, 0.1, ANG, sageD);
    }
  }

  // the roofs: one big hip roof with white ridges, and the lantern on top (pink clerestory, small hip roof)
  S.kind = KIND.TILE;
  S.hip(C[0], C[1], HA * 2 + 0.4, HB * 2 + 0.4, ANG, E, 5.6, roofC, { over: 1.8, fascia: 0.45, fasciaCol: white, ridgeCol: white, hips: true });
  const LW = 11.0, LH = E + 3.6; // lantern: 11 m square, its walls from inside the roof
  S.kind = KIND.PLAIN;
  bx(0, 0, E + 2.4, LH + 2.2, LW, LW, pink);
  for (const sa of [-1, 1]) for (const sb of [-1, 1]) bx(sa * (LW / 2 - 0.2), sb * (LW / 2 - 0.2), LH, LH + 2.2, 0.5, 0.5, white);
  for (const s of [-1, 1]) {
    bx(s * (LW / 2 + 0.03), 0, LH + 0.5, LH + 1.7, 0.06, LW - 1.4, glass);
    bx(0, s * (LW / 2 + 0.03), LH + 0.5, LH + 1.7, LW - 1.4, 0.06, glass);
  }
  S.kind = KIND.TILE;
  S.hip(C[0], C[1], LW, LW, ANG, LH + 2.2, 2.6, roofC, { over: 1.3, fascia: 0.3, fasciaCol: white, ridgeCol: white, hips: true });

  // night: lamps along the drive and at the gate, the glazing warm
  S.kind = KIND.PLAIN;
  for (const [a, b] of [[HA + 7.6, -HB - 6], [HA + 7.6, HB + 6], [-HA - 7, -HB - 7], [-HA - 7, HB + 7], [0, -HB - 8], [0, HB + 8]]) {
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
