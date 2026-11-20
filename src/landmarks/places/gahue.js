import { KIND, Buf, hex, shade } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { glowPoints, lightMaterial } from '../../geo/materials.js';
import { fence, roadsNear, FENCE } from '../enclosure.js';

// ---- Ga Huế (1906–1908), 1 Bùi Thị Xuân: the passenger building as it stands in 2026 ----
//
// Sources (fetched Nov 2026; see docs/places/gahue.md):
//  - OSM way 175063593 (building=train_station, french_colonial): the stepped plan hard-coded below. A two-storey
//    middle block 21.8 x 14.7 m, single-storey wings 12.5 / 14.1 m long and 8.9 m deep, end pavilions 5.6 / 5.4 m
//    standing 2.5 / 2.1 m forward of the wings. Annexes: ways 1332014349 (west) and 1332014347 (east). Platforms:
//    ways 866800536 (along the building) and 866800535 (the island, 180 m). Main line: way 1135136989.
//  - Wikimedia Commons photos "Ga Huế (06h39 - 02.09.2026).jpg", "Hue Vietnam Hue-Railway-Station-01.jpg",
//    "Hue Railway Station.jpg" (panorama), "Hue railway station of Vietnam railway (May 30, 2018).jpg",
//    "HUE GA VIETNAM OCT 2010": the form. Flat roofs behind parapets (no pitched roof anywhere); the middle block
//    has 5 bays upstairs, banded (rusticated) pilasters at the corners and at the outer bays, a frieze of white
//    panels, parapet piers, and a curved clock gable on the axis with a small "HUE" plate on top; three arched
//    doors on the ground floor behind a long flat canopy on six round columns ("KÍNH CHÀO QUÝ KHÁCH - WELCOME TO
//    HUE RAILWAY STATION" on its fascia); a white sign board across the upper floor (2026). The wings carry a
//    balustrade, arched openings between banded pilasters and a grey dado. Platform side: a cantilevered flat
//    canopy along the building; the island platform under a long green roof on single columns with iron brackets.
//  - vnexpress.net/ga-tau-hoa-hon-100-tuoi-o-hue-4588681.html: two-storey main building, single-storey wings,
//    painted the colour of Quốc Học, a clock over 100 years old on the front. The 2026 photo shows it a deep crimson
//    with white trim and a blue-grey dado.
// Heights are scaled from the photos on the mapped 21.8 m width (estimates): floor +0.5 m on three steps, cornice
// 10 m, parapet 11.6 m, clock plate top 13.5 m above the floor; wings 5.6 m to the cornice, 6.9 m to the balustrade.

export const id = 'gahue';

const red = hex('#b3343c'), redD = hex('#9c2a33'), white = hex('#f1ece4'), grey = hex('#7f8890'), roofTop = hex('#8e8a84');
const glass = hex('#2c2f36'), door = hex('#c9ccc8'), column = hex('#d4857c'), pave = hex('#a9a49b'), asphalt = hex('#5d5d5f');
const green = hex('#3f6a50'), steel = hex('#d6d2c8'), gold = hex('#c79a2e'), blue = hex('#24489a');

// plan (metres, x east, z south); the front looks north toward the forecourt and Bùi Thị Xuân
const C = { x0: -1165.1, x1: -1143.3, z0: 1368.2, z1: 1382.9 }; // the middle block
const WW = { x0: -1177.6, x1: -1165.1, z0: 1372.0, z1: 1380.9 }; // west wing
const WE = { x0: -1183.2, x1: -1177.6, z0: 1369.5, z1: 1380.8 }; // west end pavilion
const EW = { x0: -1143.3, x1: -1129.2, z0: 1372.2, z1: 1380.7 }; // east wing
const EE = { x0: -1129.2, x1: -1123.8, z0: 1370.1, z1: 1380.8 }; // east end pavilion
const AW = { x0: -1193.6, x1: -1183.2, z0: 1369.5, z1: 1380.6 }; // west annex
const AE = { x0: -1123.8, x1: -1106.8, z0: 1370.2, z1: 1381.0 }; // east annex
const CX = (C.x0 + C.x1) / 2;
// main line through the station (way 1135136989): z at x
const railZ = (x) => (x > -1162.5 ? 1386.6 + ((x + 1162.5) * 1.8) / 167.4 : 1386.6 + ((x + 1162.5) * 1.1) / 109.4);
// island platform (way 866800535): its north and south edges at x
const islN = (x) => 1390.5 + ((x + 1247.2) * 3.6) / 180.6, islS = (x) => 1395.3 + ((x + 1247.3) * 3.5) / 180.7;

export function build({ data, S, group, THREE }) {
  const y0 = LAND_Y + rise(-1154, 1376);
  const F = y0 + 0.5; // floor of the station
  S.base = y0 - LAND_Y;
  const L = new Buf(512), lamps = [], lampCol = [];
  const lamp = (x, y, z, c = [1, 0.84, 0.55]) => { lamps.push(x, y, z); lampCol.push(...c); };
  const B = (r, ya, yb, col, o) => S.box((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2, ya, yb, r.x1 - r.x0, r.z1 - r.z0, 0, col, o);

  // ---- ground: the forecourt (an open paved square with parking, reaching the mapped drive), the plinth ----
  S.kind = KIND.ROAD;
  S.box(-1150, 1351, y0 - 0.5, y0 + 0.04, 92, 26, 0, asphalt, { topKind: KIND.ROAD });
  S.kind = KIND.MASONRY;
  S.box(-1153.5, 1375.3, y0 - 0.5, y0 + 0.12, 77, 13.6, 0, pave, { topKind: KIND.ROAD });
  S.box(CX, 1365.4, y0 - 0.4, y0 + 0.16, 30, 5.6, 0, pave, { topKind: KIND.ROAD }); // under the canopy
  for (let k = 0; k < 3; k++) S.box(CX, 1366.9 + k * 0.4, y0, y0 + 0.17 * (k + 1), 15 - k * 0.6, 2.6 - k * 0.8, 0, shade(pave, 1.05 - k * 0.04)); // three steps
  S.box(CX, 1368.0, y0, F, 22.6, 0.6, 0, pave);
  // white planters either side of the steps
  for (const s of [-1, 1]) {
    S.kind = KIND.PLAIN;
    S.box(CX + s * 9.4, 1366.6, y0, y0 + 0.9, 4.6, 1.6, 0, white);
    S.kind = KIND.TIMBER;
    for (const d of [-1.3, 0, 1.3]) S.cyl(CX + s * 9.4 + d, 1366.6, y0 + 0.9, y0 + 1.7, 0.45, 0.6, 6, hex('#4f7a3c'));
  }
  // parking bays painted on the square
  S.kind = KIND.PLAIN;
  for (let x = -1188; x <= -1112; x += 2.6) S.box(x, 1349, y0 + 0.04, y0 + 0.06, 0.12, 5, 0, hex('#d9d6cf'));
  S.box(-1150, 1346.5, y0 + 0.04, y0 + 0.06, 78, 0.12, 0, hex('#d9d6cf'));
  S.box(-1150, 1351.5, y0 + 0.04, y0 + 0.06, 78, 0.12, 0, hex('#d9d6cf'));

  // ---- walls ----
  S.kind = KIND.PLAIN;
  const top = { top: roofTop };
  B(C, F, F + 10.0, red, top);
  for (const r of [WW, EW]) B(r, F, F + 5.6, red, top);
  for (const r of [WE, EE]) B(r, F, F + 6.0, red, top);
  for (const r of [AW, AE]) B(r, y0 + 0.3, y0 + 4.8, red, top);
  // grey dado round the ground floor
  const grow = (r, d) => ({ x0: r.x0 - d, x1: r.x1 + d, z0: r.z0 - d, z1: r.z1 + d });
  for (const r of [C, WW, EW, WE, EE]) B(grow(r, 0.04), F, F + 2.0, grey);
  for (const r of [AW, AE]) B(grow(r, 0.04), y0 + 0.3, y0 + 1.6, grey);

  // ---- detail helpers: on a face at z = zf looking s (-1 north, +1 south), or x = xf looking s (west/east) ----
  const onZ = (zf, s) => (x, ya, yb, w, t, col) => S.box(x, zf + (s * t) / 2, ya, yb, w, t, 0, col);
  const onX = (xf, s) => (z, ya, yb, w, t, col) => S.box(xf + (s * t) / 2, z, ya, yb, t, w, 0, col);
  // an arched opening drawn flat on the wall: white surround, then the dark/grey filling
  const arch = (face, u, ya, w, hSpring, col = glass, rim = white) => {
    const seg = 5;
    const draw = (ww, yy, hh, cc, t) => {
      face(u, yy, yy + hh, ww, t, cc);
      for (let i = 0; i < seg; i++) { // the round head as stacked bars
        const a = ((i + 0.5) / seg) * (Math.PI / 2), hw = (ww / 2) * Math.cos(a), dy = (ww / 2) * Math.sin(a);
        face(u, yy + hh + (i ? (ww / 2) * Math.sin((i / seg) * (Math.PI / 2)) : 0), yy + hh + dy, hw * 2, t, cc);
      }
    };
    draw(w + 0.5, ya - 0.05, hSpring, rim, 0.06);
    draw(w, ya, hSpring, col, 0.1);
  };
  // a banded pilaster: a pier with white rustication lines
  const pilaster = (face, u, ya, yb, w, every = 0.55) => {
    face(u, ya, yb, w, 0.16, redD);
    for (let y = ya + every * 0.7; y < yb - 0.1; y += every) face(u, y, y + 0.09, w + 0.02, 0.2, white);
  };
  const win = (face, u, ya, yb, w) => { face(u, ya - 0.15, yb + 0.25, w + 0.5, 0.07, white); face(u, ya, yb, w, 0.12, glass); face(u, ya + (yb - ya) * 0.48, ya + (yb - ya) * 0.52, w, 0.15, white); };

  // ---- the middle block: front (north) and back (south) ----
  for (const [zf, s] of [[C.z0, -1], [C.z1, 1]]) {
    const f = onZ(zf, s);
    // string course, main cornice, frieze panels, top cornice, parapet
    f(CX, F + 5.0, F + 5.35, 22.0, 0.22, white);
    f(CX, F + 9.3, F + 10.0, 22.4, 0.5, white);
    S.box(CX, zf, F + 10.0, F + 10.7, 21.8, 0.4, 0, red);
    f(CX, F + 10.7, F + 10.95, 22.2, 0.4, white);
    S.box(CX, zf - s * 0.12, F + 10.95, F + 11.6, 21.6, 0.3, 0, red);
    f(CX, F + 11.5, F + 11.65, 21.8, 0.1, white);
    for (const u of [-8.5, -4.4, 0, 4.4, 8.5]) { f(CX + u, F + 10.12, F + 10.58, u === 0 ? 1.4 : 2.6, 0.06, white); f(CX + u, F + 11.05, F + 11.42, u === 0 ? 1.2 : 2.6, 0.18, white); }
    // pilasters: banded at the corners and at the outer bays, plain white beside the middle bay
    for (const sgn of [-1, 1]) {
      pilaster(f, CX + sgn * 10.25, F + 2.0, F + 9.3, 1.3);
      pilaster(f, CX + sgn * 6.4, F + 2.0, F + 9.3, 1.15);
      f(CX + sgn * 2.3, F + 5.35, F + 9.3, 0.55, 0.12, white);
      // parapet piers over the pilasters, with caps
      for (const u of [10.25, 6.4]) { S.box(CX + sgn * u, zf, F + 10.95, F + 12.0, 1.2, 0.9, 0, red); S.box(CX + sgn * u, zf, F + 12.0, F + 12.18, 1.4, 1.1, 0, white); }
    }
    // upstairs: five windows, the second and fourth under a pediment-like lintel
    for (const u of [-8.5, -4.4, 0, 4.4, 8.5]) {
      win(f, CX + u, F + 6.1, F + 8.6, 1.35);
      if (Math.abs(u) === 4.4) f(CX + u, F + 8.95, F + 9.15, 2.6, 0.16, white);
    }
    // ground floor: three arched doors on the axis, a square door in each outer bay
    for (const u of [-4.6, 0, 4.6]) arch(f, CX + u, F + 0.05, 2.5, 2.9, s < 0 ? door : glass);
    for (const u of [-8.5, 8.5]) { f(CX + u, F, F + 3.4, 2.4, 0.07, white); f(CX + u, F, F + 3.2, 2.0, 0.12, glass); }
    if (s < 0) { // night: the doors and windows warm
      for (const u of [-4.6, 0, 4.6]) L.box(CX + u, zf - 0.13, F + 0.3, F + 3.4, 2.1, 0.04, 0, [1, 1, 1]);
      for (const u of [-8.5, -4.4, 0, 4.4, 8.5]) L.box(CX + u, zf - 0.15, F + 6.2, F + 8.5, 1.2, 0.04, 0, [1, 1, 1]);
    }
  }
  // the clock gable on the front parapet: curved shoulders, the clock, the "HUE" plate
  {
    const zf = C.z0, z = zf + 0.25;
    S.box(CX, z, F + 10.95, F + 12.6, 4.6, 0.6, 0, red);
    for (const sgn of [-1, 1]) for (let i = 0; i < 4; i++) { // the shoulders, stepping in as a quarter curve
      const a = ((i + 1) / 4) * (Math.PI / 2);
      S.box(CX + sgn * (2.3 + 0.9 * Math.cos(a) - 0.45), z, F + 11.6, F + 11.6 + 0.9 * Math.sin(a), 0.9 / 4 + 0.05, 0.5, 0, red);
    }
    S.box(CX, z, F + 12.6, F + 12.85, 4.9, 0.8, 0, white);
    S.box(CX, z, F + 12.85, F + 13.2, 2.2, 0.6, 0, red);
    S.box(CX, z, F + 13.2, F + 13.5, 1.5, 0.7, 0, white); // the plate with HUE on it
    S.box(CX, zf - 0.08, F + 13.25, F + 13.45, 1.0, 0.06, 0, redD);
    S.box(CX, zf - 0.02, F + 10.9, F + 12.5, 2.2, 0.14, 0, white); // the clock frame
    S.cyl(CX, zf - 0.12, F + 11.05, F + 12.35, 0.65, 0.65, 10, hex('#f6f3ea'));
    S.beam([CX, F + 11.7, zf - 0.2], [CX, F + 12.2, zf - 0.2], 0.08, 0.05, glass);
    S.beam([CX, F + 11.7, zf - 0.2], [CX + 0.35, F + 11.7, zf - 0.2], 0.08, 0.05, glass);
    L.box(CX, zf - 0.22, F + 11.15, F + 12.25, 1.1, 0.03, 0, [1, 1, 1]);
    lamp(CX, F + 11.7, zf - 0.8, [1, 0.97, 0.86]);
  }
  // 2026: the white sign board across the upper floor (blue and gold lettering, the railway's logo)
  {
    const zf = C.z0 - 0.3;
    S.box(CX, zf, F + 5.6, F + 7.7, 13.6, 0.18, 0, white);
    S.box(CX, zf - 0.1, F + 6.3, F + 7.0, 7.4, 0.04, 0, gold);
    S.box(CX, zf - 0.1, F + 7.25, F + 7.45, 6.0, 0.04, 0, red);
    S.box(CX - 5.0, zf - 0.1, F + 6.3, F + 7.1, 2.0, 0.04, 0, gold);
    L.box(CX, zf - 0.14, F + 5.7, F + 7.6, 13.4, 0.03, 0, [1, 1, 1]);
  }
  // sides of the middle block: three windows upstairs, corner pilasters
  for (const [xf, s] of [[C.x0, -1], [C.x1, 1]]) {
    const f = onX(xf, s), zc = (C.z0 + C.z1) / 2;
    f(zc, F + 5.0, F + 5.35, 14.6, 0.22, white);
    f(zc, F + 9.3, F + 10.0, 15.0, 0.5, white);
    f(zc, F + 10.7, F + 10.95, 15.0, 0.4, white);
    S.box(xf - s * 0.12, zc, F + 10.95, F + 11.6, 0.3, 14.4, 0, red);
    for (const sg of [-1, 1]) pilaster(f, zc + sg * 6.7, F + 6.0, F + 9.3, 1.3);
    for (const v of [-3.4, 0, 3.4]) win(f, zc + v, F + 6.1, F + 8.6, 1.35);
  }

  // ---- the wings and the end pavilions ----
  const wing = (r, front) => {
    const xc = (r.x0 + r.x1) / 2, n = Math.max(2, Math.round((r.x1 - r.x0) / 3.4)), step = (r.x1 - r.x0) / n;
    for (const [zf, s] of [[r.z0, -1], [r.z1, 1]]) {
      const f = onZ(zf, s);
      f(xc, F + 5.3, F + 5.9, r.x1 - r.x0 + 0.3, 0.4, white);
      // balustrade: base, balusters, rail
      S.box(xc, zf - s * 0.2, F + 5.9, F + 6.2, r.x1 - r.x0, 0.35, 0, red);
      for (let x = r.x0 + 0.3; x < r.x1 - 0.2; x += 0.55) S.box(x, zf - s * 0.2, F + 6.2, F + 6.75, 0.16, 0.18, 0, white);
      S.box(xc, zf - s * 0.2, F + 6.75, F + 6.9, r.x1 - r.x0, 0.32, 0, white);
      for (let i = 0; i <= n; i++) pilaster(f, r.x0 + i * step, F + 2.0, F + 5.3, 0.7);
      for (let i = 0; i < n; i++) {
        const u = r.x0 + (i + 0.5) * step;
        arch(f, u, F + 0.6, Math.min(1.9, step - 1.2), 2.6, (s < 0) === (i % 2 === 0) ? glass : door);
        if (s < 0) L.box(u, zf - 0.13, F + 1.0, F + 3.0, 1.2, 0.04, 0, [1, 1, 1]);
      }
    }
    void front;
  };
  wing(WW); wing(EW);
  const endPav = (r) => {
    const xc = (r.x1 + r.x0) / 2, w = r.x1 - r.x0;
    for (const [zf, s] of [[r.z0, -1], [r.z1, 1]]) {
      const f = onZ(zf, s);
      f(xc, F + 5.6, F + 6.15, w + 0.4, 0.45, white);
      S.box(xc, zf - s * 0.15, F + 6.15, F + 7.1, w, 0.3, 0, red);
      f(xc, F + 7.0, F + 7.2, w + 0.2, 0.1, white);
      for (const sg of [-1, 1]) { pilaster(f, xc + sg * (w / 2 - 0.55), F + 2.0, F + 5.6, 1.1); S.box(xc + sg * (w / 2 - 0.55), zf - s * 0.3, F + 6.15, F + 7.6, 1.0, 0.8, 0, red); S.box(xc + sg * (w / 2 - 0.55), zf - s * 0.3, F + 7.6, F + 7.75, 1.2, 1.0, 0, white); }
      arch(f, xc, F + 0.05, 2.2, 2.9, s < 0 ? door : glass);
    }
    for (const [xf, s] of [[r.x0, -1], [r.x1, 1]]) { const f = onX(xf, s), zc = (r.z0 + r.z1) / 2; f(zc, F + 5.6, F + 6.15, r.z1 - r.z0 + 0.4, 0.45, white); arch(f, zc, F + 0.8, 1.7, 2.4); }
  };
  endPav(WE); endPav(EE);
  // the annexes: plainer single-storey offices under a flat roof
  for (const r of [AW, AE]) {
    const xc = (r.x0 + r.x1) / 2, n = Math.max(2, Math.round((r.x1 - r.x0) / 3.6)), step = (r.x1 - r.x0) / n;
    for (const [zf, s] of [[r.z0, -1], [r.z1, 1]]) {
      const f = onZ(zf, s);
      f(xc, y0 + 4.3, y0 + 4.8, r.x1 - r.x0 + 0.3, 0.3, white);
      S.box(xc, zf - s * 0.12, y0 + 4.8, y0 + 5.4, r.x1 - r.x0, 0.25, 0, red);
      for (let i = 0; i < n; i++) win(f, r.x0 + (i + 0.5) * step, y0 + 1.3, y0 + 3.4, 1.3);
    }
  }

  // ---- the street canopy: a flat concrete slab on six round columns, the welcome board on its fascia ----
  {
    const zf = C.z0, zo = zf - 5.6, zc = (zf + zo) / 2;
    S.kind = KIND.PLAIN;
    S.box(CX, zc, F + 4.4, F + 4.75, 29.6, 5.6, 0, white, { bottom: true, top: roofTop });
    S.box(CX, zo + 0.15, F + 4.3, F + 5.4, 29.6, 0.3, 0, white); // fascia
    S.box(CX, zo - 0.02, F + 4.65, F + 5.05, 25, 0.04, 0, blue); // the lettering
    for (const sg of [-1, 1]) S.box(CX + sg * 14.8, zc, F + 4.3, F + 5.4, 0.3, 5.6, 0, white);
    for (const u of [-12.2, -8.0, -2.6, 2.6, 8.0, 12.2]) {
      S.cyl(CX + u, zo + 0.6, y0 + 0.1, F + 4.4, 0.3, 0.27, 10, column);
      S.box(CX + u, zo + 0.6, y0 + 0.1, y0 + 0.5, 0.8, 0.8, 0, white);
      S.box(CX + u, zo + 0.6, F + 4.2, F + 4.4, 0.75, 0.75, 0, white);
    }
    for (let u = -12; u <= 12.01; u += 4) lamp(CX + u, F + 4.2, zc);
    L.box(CX, zo - 0.04, F + 4.62, F + 5.08, 25.4, 0.02, 0, [1, 1, 1]);
  }

  // ---- platform side ----
  const edge = (x) => railZ(x) - 1.45;
  // the platform along the building (way 866800536), trimmed back from the main line
  S.kind = KIND.MASONRY;
  {
    const xa = -1245.5, xb = -1107.0, n = 12, ring = [];
    for (let i = 0; i <= n; i++) { const x = xa + ((xb - xa) * i) / n; ring.push([x, edge(x)]); }
    ring.push([xb, 1380.9], [xa, 1380.4]);
    S.prism(ring, y0 - 0.3, F - 0.05, shade(pave, 0.85), pave, { topKind: KIND.ROAD });
    S.kind = KIND.PLAIN;
    for (let i = 0; i < n; i++) { const a = ring[i], b = ring[i + 1]; S.beam([a[0], F - 0.02, a[1] - 0.2], [b[0], F - 0.02, b[1] - 0.2], 0.4, 0.05, hex('#d8c25a')); } // yellow edge line
  }
  // cantilevered canopy along the building, round columns near the wall
  S.kind = KIND.PLAIN;
  for (const [xa, xb, zw] of [[-1193.6, C.x0, 1380.8], [C.x0, C.x1, C.z1], [C.x1, -1106.8, 1381.0]]) {
    const xc = (xa + xb) / 2, zo = edge(xc) - 0.7, d = zo - zw;
    S.box(xc, zw + d / 2, F + 3.9, F + 4.25, xb - xa, d, 0, white, { bottom: true, top: roofTop });
    S.box(xc, zo - 0.1, F + 3.8, F + 4.5, xb - xa, 0.2, 0, white);
    for (let x = xa + 2.5; x < xb - 1; x += 5.5) { S.cyl(x, zw + 1.4, F, F + 3.9, 0.22, 0.22, 8, white, { cap: false }); lamp(x, F + 3.7, zw + d * 0.6, [1, 0.9, 0.7]); }
  }
  // the island platform (way 866800535) and its long roof: single columns, iron brackets, a green ridged roof
  {
    const xa = -1247.2, xb = -1066.6;
    S.kind = KIND.MASONRY;
    S.prism([[xa, islN(xa)], [xb, islN(xb)], [xb, islS(xb)], [xa, islS(xa)]], y0 - 0.3, F - 0.05, shade(pave, 0.85), pave, { topKind: KIND.ROAD });
    const ca = -1214, cb = -1094, n = 20, step = (cb - ca) / n, mid = (x) => (islN(x) + islS(x)) / 2;
    S.kind = KIND.PLAIN;
    for (let i = 0; i <= n; i++) {
      const x = ca + i * step, z = mid(x);
      S.cyl(x, z, F, F + 3.6, 0.2, 0.2, 8, steel, { cap: false });
      for (const s of [-1, 1]) {
        S.beam([x, F + 3.6, z], [x, F + 4.05, z + s * 3.2], 0.16, 0.3, steel); // the arm out to the eave
        S.beam([x, F + 2.7, z], [x, F + 3.65, z + s * 1.4], 0.06, 0.06, glass); // the iron bracket
      }
      if (i < n) lamp(x + step / 2, F + 3.7, z, [1, 0.9, 0.7]);
    }
    S.beam([ca, F + 3.65, mid(ca)], [cb, F + 3.65, mid(cb)], 0.25, 0.3, steel);
    S.kind = KIND.TILE;
    const P = (x, v, y) => [x, y, mid(x) + v];
    for (const s of [-1, 1]) S.quad(P(ca - 1, 0, F + 4.6), P(cb + 1, 0, F + 4.6), P(cb + 1, s * 3.5, F + 4.0), P(ca - 1, s * 3.5, F + 4.0), green, [0, 0.9, s * 0.4]);
    S.kind = KIND.PLAIN;
    for (const s of [-1, 1]) S.beam(P(ca - 1, s * 3.5, F + 3.9), P(cb + 1, s * 3.5, F + 3.9), 0.12, 0.35, shade(green, 0.85));
  }

  // ---- the yard fence: a knee-high railing on the forecourt's west side (against the medical centre's grounds) and
  // along the platform ends, where the station's ground meets the street blocks; open toward the drive ----
  const roads = roadsNear(data, [-1154, 1360], 140);
  fence(S, [[-1197.5, 1336.5], [-1197.5, 1369.0], [-1194.5, 1369.0]], FENCE.station, { closed: false, roads });
  fence(S, [[-1106.3, 1370.0], [-1100.0, 1370.0], [-1100.0, 1360.5]], FENCE.station, { closed: false, roads });

  // ---- night: lamps, the clock face, warm doors and windows ----
  S.kind = KIND.PLAIN;
  for (const x of [-1188, -1172, -1136, -1120]) { // lamp posts along the drive
    S.cyl(x, 1365.2, y0, y0 + 5.2, 0.09, 0.07, 6, glass, { cap: false });
    S.box(x, 1365.2, y0 + 5.1, y0 + 5.35, 0.5, 0.3, 0, glass);
    lamp(x, y0 + 5.0, 1365.2, [1, 0.88, 0.62]);
  }
  const pts = glowPoints(lamps, lampCol, 5);
  pts.userData.glow = true;
  pts.userData.landmark = id;
  group.add(pts);
  if (L.n) {
    const m = new THREE.Mesh(L.geometry(), lightMaterial(0xffd08a, 0.9));
    m.renderOrder = 19;
    m.userData.landmark = id;
    group.add(m);
  }
  S.kind = KIND.PLAIN;
  S.base = 0;
}
