import { KIND, Buf, hex, shade } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { glowPoints, lightMaterial } from '../../geo/materials.js';
import { fence, roadsNear, streetTest, FENCE } from '../enclosure.js';

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
//    HUE RAILWAY STATION" on its fascia); a white sign board across the upper floor (2026, not in the 2024 panos; left out). The wings carry a
//    balustrade, arched openings between banded pilasters and a grey dado. Platform side: a cantilevered flat
//    canopy along the building; the island platform under a long green roof on single columns with iron brackets.
//  - vnexpress.net/ga-tau-hoa-hon-100-tuoi-o-hue-4588681.html: two-storey main building, single-storey wings,
//    painted the colour of Quốc Học, a clock over 100 years old on the front. The 2026 photo shows it a deep crimson
//    with white trim and a blue-grey dado.
// Heights (estimates, from the photos and the Street View pano on the satellite's 19.4 m width): floor +0.5 m on three
// steps, cornice 9.55 m, parapet 10.35 m, clock plate top 12 m above the floor; wings 5 m to the cornice, 6.2 m to the
// balustrade. (The first estimates, scaled on OSM's 21.8 m, were 10 / 11.6 / 13.5 and 5.6 / 6.9.)

export const id = 'gahue';

// Nov 2026 rebuild against Google satellite (z18-z20) and a car Street View pano on the forecourt
// (scratch/rebuild/gahue, not in the repo). The OSM outline's total span (west pavilion to east annex) matches the
// satellite, but its division does not: the two-storey block's roof measures about 19 m by 11 m between its parapet
// piers (OSM 21.8 x 14.7), its clock axis sits about 1.3 m west of the OSM centre, and the wings run longer. The pano
// confirms the width (the block subtends the same angle as a 19.4 m front at the front's distance) and the axis, and
// gives the heights: with the block 19.4 m wide, parapet 10.35 m, clock plate 12 m above the floor; the photo
// estimates below were scaled on the OSM 21.8 m and came out about 12 % tall. The satellite also shows a low hipped
// roof (red tile) behind the middle block's parapet, red-brown flat roofs on the wings, and a narrower street canopy
// (about 23 m, six columns at +-2.1, +-6.2, +-9.3 m) standing just behind three steps. Colour from the pano: a brick red.
const red = hex('#b0473b'), redD = hex('#963a31'), white = hex('#f1ece4'), grey = hex('#7f8890'), roofTop = hex('#8a5650');
const tile = hex('#8e4a40'), slab = hex('#8e8a84'); // tile roof; the concrete canopies and the annexes' flat roofs
const glass = hex('#2c2f36'), column = hex('#d4857c'), pave = hex('#a9a49b'), asphalt = hex('#5d5d5f');
const green = hex('#3f6a50'), steel = hex('#d6d2c8'), blue = hex('#24489a'), letterRed = hex('#d42a24');
const dial = hex('#fbfaf5'), clockRim = hex('#3b2522');

// plan (metres, x east, z south); the front looks north toward the forecourt and Bùi Thị Xuân
// x divisions from the satellite (OSM's were 21.8 / 12.5 / 14.1 / 5.6 / 5.4 m); z from OSM, except the middle block:
// the satellite measures it 11.3 m deep between its parapets (OSM 14.7, running over the platform canopy), and with
// the roofs' lean taken out (about 0.35 m per metre of height here, from the wings and pavilions, whose OSM fronts it
// then matches) its front stands at 1368.8 (OSM 1368.2); the car pano puts it a little further south, about 1370.5
const C = { x0: -1165.2, x1: -1145.8, z0: 1368.8, z1: 1380.1 }; // the middle block
const WW = { x0: -1179.3, x1: -1165.2, z0: 1372.0, z1: 1380.9 }; // west wing
const WE = { x0: -1183.9, x1: -1179.3, z0: 1369.5, z1: 1380.8 }; // west end pavilion
const EW = { x0: -1145.8, x1: -1131.0, z0: 1372.2, z1: 1380.7 }; // east wing
const EE = { x0: -1131.0, x1: -1126.6, z0: 1370.1, z1: 1380.8 }; // east end pavilion
const AW = { x0: -1193.6, x1: -1183.9, z0: 1369.5, z1: 1380.6 }; // west annex
// east of the east pavilion the satellite shows three parts, not one roof (OSM way 1332014347 spans them all): the red
// roof carried on for about 6.5 m, a lower strip of mixed roofing, then a small block with a white parapet
const AE = { x0: -1126.6, x1: -1120.0, z0: 1370.8, z1: 1380.9 }; // the red-roofed continuation
const AL = { x0: -1120.0, x1: -1112.4, z0: 1371.0, z1: 1380.9 }; // the lower strip
const AB = { x0: -1112.4, x1: -1106.8, z0: 1372.4, z1: 1380.9 }; // the small white-edged block
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
  S.box(-1154, 1351, y0 - 0.5, y0 + 0.04, 84, 26, 0, asphalt, { topKind: KIND.ROAD });
  S.kind = KIND.MASONRY;
  S.box(-1153.5, 1375.3, y0 - 0.5, y0 + 0.12, 77, 13.6, 0, pave, { topKind: KIND.ROAD });
  // in front of the steps: the pavement from the facade to the kerb of the mapped drive (OSM runs it 6.5 m off the front)
  const street = streetTest(data, [CX, 1364], 60);
  let zKerb = C.z0 - 5.6;
  for (let z = C.z0 - 1; z > C.z0 - 5.6; z -= 0.1) if ([-14, -12, -9, -6, -3, 0, 3, 6, 9, 12, 14].some((u) => street(CX + u, z, 0.3))) { zKerb = z; break; }
  S.box(CX, (zKerb + C.z0) / 2, y0 - 0.4, y0 + 0.16, 30, C.z0 - zKerb, 0, pave, { topKind: KIND.ROAD });
  // three steps up to a landing under the canopy; the columns stand on the landing's front edge (pano)
  const zStep = Math.max(C.z0 - 4.8, zKerb + 0.6); // kept off the mapped drive
  for (let k = 0; k < 3; k++) S.box(CX, (zStep + k * 0.4 + C.z0) / 2, y0, y0 + 0.17 * (k + 1), 17.6 - k * 0.4, C.z0 - zStep - k * 0.4, 0, shade(pave, 1.05 - k * 0.04));
  S.box(CX, C.z0 - 0.3, y0, F, 20.2, 0.6, 0, pave);
  // white planters either side of the steps
  for (const s of [-1, 1]) {
    S.kind = KIND.PLAIN;
    S.box(CX + s * 10.8, zStep + 0.3, y0, y0 + 0.9, 4.0, 1.4, 0, white);
    S.kind = KIND.TIMBER;
    for (const d of [-1.1, 0, 1.1]) S.cyl(CX + s * 10.8 + d, zStep + 0.3, y0 + 0.9, y0 + 1.7, 0.45, 0.6, 6, hex('#4f7a3c'));
  }
  // the square is open asphalt with rows of parking (satellite and pano; the earlier estimated garden island is gone)
  S.kind = KIND.PLAIN;
  for (let x = -1188; x <= -1112; x += 2.6) S.box(x, 1349, y0 + 0.04, y0 + 0.06, 0.12, 5, 0, hex('#d9d6cf'));
  S.box(-1150, 1346.5, y0 + 0.04, y0 + 0.06, 78, 0.12, 0, hex('#d9d6cf'));
  S.box(-1150, 1351.5, y0 + 0.04, y0 + 0.06, 78, 0.12, 0, hex('#d9d6cf'));
  // frangipani trees along the front of both wings (pano; a row of crowns on the satellite)
  S.kind = KIND.TIMBER;
  for (const x of [-1181, -1176.5, -1172, -1139.5, -1135, -1130.5]) {
    S.cyl(x, 1368.6, y0, y0 + 2.8, 0.18, 0.14, 6, hex('#6b5a48'), { cap: false });
    S.cyl(x, 1368.6, y0 + 2.6, y0 + 4.6, 1.9, 1.5, 7, hex('#4f7a3c'));
  }
  S.kind = KIND.PLAIN;

  // ---- walls ----
  S.kind = KIND.PLAIN;
  const top = { top: roofTop };
  B(C, F, F + 9.4, red, top);
  for (const r of [WW, EW]) B(r, F, F + 5.0, red, top);
  for (const r of [WE, EE]) B(r, F, F + 5.4, red, top);
  // the middle block's low hipped roof behind its parapet (satellite: hip lines from the corners, red tile)
  S.hip(CX, (C.z0 + C.z1) / 2, C.x1 - C.x0 - 1.0, C.z1 - C.z0 - 1.0, 0, F + 9.4, 1.4, tile);
  S.kind = KIND.PLAIN;
  B(AW, y0 + 0.3, y0 + 4.8, red, { top: slab });
  B(AE, y0 + 0.3, y0 + 4.8, red, top);
  B(AL, y0 + 0.3, y0 + 3.5, red, { top: hex('#7d6a5c') });
  B(AB, y0 + 0.3, y0 + 4.2, red, { top: slab });
  // grey dado round the ground floor
  const grow = (r, d) => ({ x0: r.x0 - d, x1: r.x1 + d, z0: r.z0 - d, z1: r.z1 + d });
  for (const r of [C, WW, EW, WE, EE]) B(grow(r, 0.04), F, F + 2.0, grey);
  for (const r of [AW, AE, AL, AB]) B(grow(r, 0.04), y0 + 0.3, y0 + 1.6, grey);

  // ---- detail helpers: on a face at z = zf looking s (-1 north, +1 south), or x = xf looking s (west/east) ----
  const onZ = (zf, s) => (x, ya, yb, w, t, col) => S.box(x, zf + (s * t) / 2, ya, yb, w, t, 0, col);
  const onX = (xf, s) => (z, ya, yb, w, t, col) => S.box(xf + (s * t) / 2, z, ya, yb, t, w, 0, col);
  // a flat disc facing north (-z) at z, centred on x, y
  const disc = (x, y, z, r, col, n = 20) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 2 * Math.PI, b = ((i + 1) / n) * 2 * Math.PI;
      S.tri([x, y, z], [x + r * Math.cos(a), y + r * Math.sin(a), z], [x + r * Math.cos(b), y + r * Math.sin(b), z], col, [0, 0, -1]);
    }
  };
  // an arched opening drawn flat on the wall: white surround, then the dark/grey filling
  const arch = (face, u, ya, w, hSpring, col = glass, rim = white) => {
    const seg = 8;
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
  const pane = hex('#5a626c');
  const win = (face, u, ya, yb, w) => { // white frame, glazing, transom and two mullions (pano: a 2 x 3 grid of panes)
    face(u, ya - 0.15, yb + 0.25, w + 0.5, 0.07, white); face(u, ya, yb, w, 0.12, pane);
    face(u, ya + (yb - ya) * 0.48, ya + (yb - ya) * 0.52, w, 0.15, white);
    face(u, ya, yb, 0.07, 0.15, white);
    for (const k of [0.25, 0.75]) face(u, ya + (yb - ya) * k - 0.02, ya + (yb - ya) * k + 0.02, w, 0.14, white);
    face(u, ya - 0.2, ya - 0.1, w + 0.7, 0.2, white); // sill
  };

  // ---- the middle block: front (north) and back (south) ----
  // Heights above the floor and bay positions measured on the car pano with the front 19.4 m wide: string course
  // 5.6, upstairs windows 6.3-8.4, a band 8.8, main cornice to 9.55, parapet 10.35 with one row of white panels,
  // banded pilasters at +-9.15 and +-6.05, windows at 0, +-3.85, +-7.5.
  const BW = C.x1 - C.x0, BD = C.z1 - C.z0;
  for (const [zf, s] of [[C.z0, -1], [C.z1, 1]]) {
    const f = onZ(zf, s);
    // string course, band over the windows, main cornice, parapet with its panels and coping
    f(CX, F + 5.55, F + 5.9, BW + 0.2, 0.22, white);
    f(CX, F + 8.8, F + 8.95, BW + 0.1, 0.1, white);
    f(CX, F + 9.1, F + 9.55, BW + 0.6, 0.5, white);
    S.box(CX, zf - s * 0.1, F + 9.4, F + 10.25, BW, 0.35, 0, red);
    f(CX, F + 10.2, F + 10.35, BW + 0.2, 0.3, white);
    for (const u of [-7.6, -3.9, 3.9, 7.6]) f(CX + u, F + 9.7, F + 10.05, 2.3, 0.14, white);
    // pilasters: banded at the corners and at the outer bays, plain white beside the middle window
    for (const sgn of [-1, 1]) {
      pilaster(f, CX + sgn * 9.15, F + 2.0, F + 9.1, 1.1);
      pilaster(f, CX + sgn * 6.05, F + 2.0, F + 9.1, 1.1);
      f(CX + sgn * 1.15, F + 5.9, F + 8.8, 0.35, 0.12, white);
      // parapet piers over the pilasters, with caps
      for (const u of [9.15, 6.05]) { S.box(CX + sgn * u, zf - s * 0.1, F + 9.55, F + 10.6, 1.1, 0.8, 0, red); S.box(CX + sgn * u, zf - s * 0.1, F + 10.6, F + 10.78, 1.3, 1.0, 0, white); }
    }
    // upstairs: five windows, the second and fourth in tall white frames under a lintel
    for (const u of [-7.5, -3.85, 0, 3.85, 7.5]) {
      win(f, CX + u, F + 6.3, F + 8.4, 1.15);
      if (Math.abs(u) === 3.85) { for (const e of [-1, 1]) f(CX + u + e * 1.0, F + 5.9, F + 8.75, 0.28, 0.1, white); f(CX + u, F + 8.55, F + 8.75, 2.3, 0.14, white); }
    }
    // ground floor: three open round-arched doorways on the axis and a narrower arched door in each outer bay, all
    // standing open and dark (2024 pano)
    for (const u of [-4.0, 0, 4.0]) arch(f, CX + u, F + 0.05, 2.3, 2.6, glass);
    for (const u of [-7.6, 7.6]) arch(f, CX + u, F + 0.05, 1.7, 2.5, glass);
    if (s < 0) { // night: the doors and windows warm
      for (const u of [-4.0, 0, 4.0]) L.box(CX + u, zf - 0.13, F + 0.3, F + 3.3, 1.8, 0.04, 0, [1, 1, 1]);
      for (const u of [-7.5, -3.85, 0, 3.85, 7.5]) L.box(CX + u, zf - 0.15, F + 6.4, F + 8.3, 1.0, 0.04, 0, [1, 1, 1]);
    }
  }
  // the clock gable on the front parapet: curved shoulders, the clock (face 9.7-10.95), cornice 11.3, the "HUE"
  // plate to 12.0, and the flagpole above it (pano)
  {
    const zf = C.z0, z = zf + 0.25;
    S.box(CX, z, F + 9.55, F + 11.15, 4.0, 0.6, 0, red);
    for (const sgn of [-1, 1]) for (let i = 0; i < 4; i++) { // the shoulders, stepping in as a quarter curve
      const a = ((i + 1) / 4) * (Math.PI / 2);
      S.box(CX + sgn * (2.0 + 0.8 * Math.cos(a) - 0.4), z, F + 10.25, F + 10.25 + 0.8 * Math.sin(a), 0.8 / 4 + 0.05, 0.5, 0, red);
    }
    S.box(CX, z, F + 11.15, F + 11.35, 4.3, 0.8, 0, white);
    S.box(CX, z, F + 11.35, F + 11.7, 1.9, 0.6, 0, red);
    S.box(CX, z, F + 11.7, F + 12.0, 1.3, 0.7, 0, white); // the plate with HUE on it
    S.box(CX, zf - 0.08, F + 11.75, F + 11.95, 0.9, 0.06, 0, redD);
    S.box(CX, zf - 0.02, F + 9.55, F + 11.1, 1.85, 0.14, 0, white); // the clock frame
    disc(CX, F + 10.32, zf - 0.11, 0.74, clockRim); // a dark rim, then the white dial (pano: white face, dark ring)
    disc(CX, F + 10.32, zf - 0.13, 0.64, dial);
    for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6; S.box(CX + 0.54 * Math.sin(a), zf - 0.16, F + 10.32 + 0.54 * Math.cos(a) - 0.05, F + 10.32 + 0.54 * Math.cos(a) + 0.05, 0.06, 0.03, 0, glass); }
    S.beam([CX, F + 10.32, zf - 0.17], [CX, F + 10.8, zf - 0.17], 0.08, 0.04, glass);
    S.beam([CX, F + 10.32, zf - 0.17], [CX + 0.34, F + 10.32, zf - 0.17], 0.08, 0.04, glass);
    S.cyl(CX, z, F + 12.0, F + 14.2, 0.04, 0.03, 5, steel, { cap: false }); // flagpole
    S.box(CX - 0.6, z, F + 13.4, F + 14.15, 1.2, 0.03, 0, hex('#d8262a')); // the flag
    L.box(CX, zf - 0.22, F + 9.85, F + 10.8, 0.95, 0.03, 0, [1, 1, 1]);
    lamp(CX, F + 10.3, zf - 0.8, [1, 0.97, 0.86]);
  }
  // The 2026 Commons photo shows a white sign board across the upper floor; both 2024 car panos show the five windows
  // open and no board, so it is left out (see docs/places/gahue.md).
  // sides of the middle block: three windows upstairs, corner pilasters
  for (const [xf, s] of [[C.x0, -1], [C.x1, 1]]) {
    const f = onX(xf, s), zc = (C.z0 + C.z1) / 2;
    f(zc, F + 5.55, F + 5.9, BD + 0.2, 0.22, white);
    f(zc, F + 9.1, F + 9.55, BD + 0.6, 0.5, white);
    f(zc, F + 10.2, F + 10.35, BD + 0.2, 0.3, white);
    S.box(xf - s * 0.1, zc, F + 9.4, F + 10.25, 0.35, BD, 0, red);
    for (const sg of [-1, 1]) pilaster(f, zc + sg * (BD / 2 - 0.55), F + 5.9, F + 9.1, 1.1);
    for (const v of [-3.0, 0, 3.0]) win(f, zc + v, F + 6.3, F + 8.4, 1.15);
  }

  // ---- the wings and the end pavilions ----
  // heights scaled by 0.9 from the first estimates, with the middle block (pano)
  const wing = (r, front) => {
    const xc = (r.x0 + r.x1) / 2, n = Math.max(2, Math.round((r.x1 - r.x0) / 3.4)), step = (r.x1 - r.x0) / n;
    for (const [zf, s] of [[r.z0, -1], [r.z1, 1]]) {
      const f = onZ(zf, s);
      f(xc, F + 4.77, F + 5.31, r.x1 - r.x0 + 0.3, 0.4, white);
      // balustrade: base, balusters, rail
      S.box(xc, zf - s * 0.2, F + 5.31, F + 5.58, r.x1 - r.x0, 0.35, 0, red);
      for (let x = r.x0 + 0.3; x < r.x1 - 0.2; x += 0.55) S.box(x, zf - s * 0.2, F + 5.58, F + 6.08, 0.16, 0.18, 0, white);
      S.box(xc, zf - s * 0.2, F + 6.08, F + 6.21, r.x1 - r.x0, 0.32, 0, white);
      for (let i = 0; i <= n; i++) pilaster(f, r.x0 + i * step, F + 2.0, F + 4.77, 0.7);
      for (let i = 0; i < n; i++) {
        const u = r.x0 + (i + 0.5) * step;
        // the arcade: a round-arched opening in every bay, open and dark (pano: behind the frangipani)
        arch(f, u, F + 0.05, Math.min(2.2, step - 1.0), 2.4, glass);
        if (s < 0) L.box(u, zf - 0.13, F + 0.4, F + 2.9, 1.4, 0.04, 0, [1, 1, 1]);
      }
    }
    void front;
  };
  wing(WW); wing(EW);
  const endPav = (r) => {
    const xc = (r.x1 + r.x0) / 2, w = r.x1 - r.x0;
    for (const [zf, s] of [[r.z0, -1], [r.z1, 1]]) {
      const f = onZ(zf, s);
      f(xc, F + 5.04, F + 5.54, w + 0.4, 0.45, white);
      S.box(xc, zf - s * 0.15, F + 5.54, F + 6.39, w, 0.3, 0, red);
      f(xc, F + 6.3, F + 6.48, w + 0.2, 0.1, white);
      for (const sg of [-1, 1]) { pilaster(f, xc + sg * (w / 2 - 0.55), F + 2.0, F + 5.04, 1.1); S.box(xc + sg * (w / 2 - 0.55), zf - s * 0.3, F + 5.54, F + 6.84, 1.0, 0.8, 0, red); S.box(xc + sg * (w / 2 - 0.55), zf - s * 0.3, F + 6.84, F + 6.98, 1.2, 1.0, 0, white); }
      arch(f, xc, F + 0.05, 2.2, 2.9, glass);
    }
    for (const [xf, s] of [[r.x0, -1], [r.x1, 1]]) { const f = onX(xf, s), zc = (r.z0 + r.z1) / 2; f(zc, F + 5.04, F + 5.54, r.z1 - r.z0 + 0.4, 0.45, white); arch(f, zc, F + 0.8, 1.7, 2.4); }
  };
  endPav(WE); endPav(EE);
  // the annexes: plainer single-storey offices, round-arched openings like the wings'
  for (const [r, h, hp] of [[AW, 4.8, 0.6], [AE, 4.8, 0.6], [AL, 3.5, 0.3], [AB, 4.2, 0.55]]) {
    const xc = (r.x0 + r.x1) / 2, n = Math.max(2, Math.round((r.x1 - r.x0) / 3.4)), step = (r.x1 - r.x0) / n;
    for (const [zf, s] of [[r.z0, -1], [r.z1, 1]]) {
      const f = onZ(zf, s);
      f(xc, y0 + h - 0.5, y0 + h, r.x1 - r.x0 + 0.3, 0.3, white);
      S.box(xc, zf - s * 0.12, y0 + h, y0 + h + hp, r.x1 - r.x0, 0.25, 0, r === AB ? white : red);
      const aw = Math.min(1.7, step - 1.1), sp = Math.min(2.0, h - 1.3 - aw / 2);
      for (let i = 0; i < n; i++) arch(f, r.x0 + (i + 0.5) * step, y0 + 0.4, aw, sp, glass);
    }
  }
  // the small block's white parapet runs round all four sides (satellite: a white-edged square)
  for (const [xf, s] of [[AB.x0, -1], [AB.x1, 1]]) S.box(xf - s * 0.12, (AB.z0 + AB.z1) / 2, y0 + 4.2, y0 + 4.75, 0.25, AB.z1 - AB.z0, 0, white);

  // ---- the street canopy: a flat concrete slab on six round columns, the welcome board on its fascia ----
  // pano: about 22.7 m wide, its fascia about 4.1 m out from the front, the columns on the landing's front edge
  {
    const zf = C.z0, zo = zf - 4.1, zc = (zf + zo) / 2, cw = 22.7, zCol = zf - 3.6;
    S.kind = KIND.PLAIN;
    S.box(CX, zc, F + 3.95, F + 4.55, cw, zf - zo, 0, white, { bottom: true, top: slab }); // top over 5 m: the drive passes under its edge
    S.box(CX, zo + 0.15, F + 3.6, F + 4.75, cw, 0.3, 0, white); // fascia, white
    // seen from the forecourt (looking south) east is on the left: M mirrors a left-to-right offset into scene x
    const M = (u) => 2 * CX - u;
    // the welcome line in blue capitals on the white fascia, one block per letter (pano: it runs about 17.5 m)
    {
      const words = ['KINH', 'CHAO', 'QUY', 'KHACH', '-', 'WELCOME', 'TO', 'HUE', 'RAILWAY', 'STATION'];
      const cp = 0.32, gap = 0.42, chars = words.join('').length;
      let u = CX - (chars * cp + (words.length - 1) * gap) / 2;
      for (const w of words) {
        for (const ch of w) {
          if (ch === '-') S.box(M(u + cp / 2), zo - 0.02, F + 4.12, F + 4.2, 0.2, 0.04, 0, blue);
          else S.box(M(u + cp / 2), zo - 0.02, F + 3.96, F + 4.38, cp - 0.08, 0.04, 0, blue);
          u += cp;
        }
        u += gap;
      }
    }
    // "GA HUẾ": free-standing red capitals, about 1.5 m tall, on the canopy slab near its front edge (2024 pano)
    {
      const h = 1.5, w = 1.0, t = 0.22, yb = F + 4.75, zl = zo + 0.5;
      S.box(CX, zl, F + 4.55, yb, 7.2, 0.4, 0, white); // a low white plinth lifts them clear of the fascia
      const bar = (u0, v0, u1, v1) => S.box(M((u0 + u1) / 2), zl, yb + v0, yb + v1, u1 - u0, 0.15, 0, letterRed);
      const glyph = {
        G: (u) => { bar(u, 0, u + t, h); bar(u, h - t, u + w, h); bar(u, 0, u + w, t); bar(u + w - t, 0, u + w, h * 0.5); bar(u + w * 0.5, h * 0.5 - t, u + w, h * 0.5); },
        A: (u) => { bar(u, 0, u + t, h); bar(u + w - t, 0, u + w, h); bar(u, h - t, u + w, h); bar(u, h * 0.45, u + w, h * 0.45 + t); },
        H: (u) => { bar(u, 0, u + t, h); bar(u + w - t, 0, u + w, h); bar(u, h * 0.45, u + w, h * 0.45 + t); },
        U: (u) => { bar(u, 0, u + t, h); bar(u + w - t, 0, u + w, h); bar(u, 0, u + w, t); },
        E: (u) => { // Ế: E with a circumflex and an acute above it
          bar(u, 0, u + t, h); bar(u, h - t, u + w, h); bar(u, h * 0.45, u + w * 0.85, h * 0.45 + t); bar(u, 0, u + w, t);
          S.beam([M(u + 0.15), yb + h + 0.1, zl], [M(u + w * 0.45), yb + h + 0.38, zl], 0.13, 0.13, letterRed);
          S.beam([M(u + w * 0.45), yb + h + 0.38, zl], [M(u + w * 0.75), yb + h + 0.1, zl], 0.13, 0.13, letterRed);
          S.beam([M(u + w * 0.85), yb + h + 0.32, zl], [M(u + w * 1.05), yb + h + 0.55, zl], 0.12, 0.12, letterRed);
        },
      };
      const seq = ['G', 'A', null, 'H', 'U', 'E'], lg = 0.3, wg = 0.9;
      let u = CX - (5 * w + 3 * lg + wg) / 2;
      for (let i = 0; i < seq.length; i++) {
        if (!seq[i]) { u += wg - lg; continue; }
        glyph[seq[i]](u);
        u += w + lg;
      }
      L.box(CX, zl - 0.09, yb + 0.05, yb + h - 0.05, 6.8, 0.02, 0, [1, 0.35, 0.3]);
    }
    // boards hung under the canopy between the columns (pano: green, blue "PHÒNG BÁN VÉ", red; two upright banners)
    for (const [u, w, ya, yb2, col] of [[-4.0, 2.2, 2.75, 3.95, hex('#3d8a4a')], [0, 3.6, 2.7, 3.95, blue], [4.0, 2.4, 2.75, 3.95, hex('#c4332b')], [-6.2, 0.75, 1.9, 3.95, hex('#e0a52a')], [6.2, 0.75, 1.9, 3.95, blue]]) {
      S.box(M(CX + u), zf - 0.75, F + ya, F + yb2, w, 0.05, 0, col); // u left to right as seen from the forecourt
    }
    for (const sg of [-1, 1]) S.box(CX + sg * (cw / 2 - 0.15), zc, F + 3.8, F + 4.6, 0.3, zf - zo, 0, white);
    for (const u of [-9.3, -6.2, -2.1, 2.1, 6.2, 9.3]) {
      S.cyl(CX + u, zCol, F, F + 3.95, 0.26, 0.23, 10, column);
      S.box(CX + u, zCol, F, F + 0.35, 0.7, 0.7, 0, white);
      S.box(CX + u, zCol, F + 3.75, F + 3.95, 0.65, 0.65, 0, white);
    }
    for (let u = -9; u <= 9.01; u += 3) lamp(CX + u, F + 3.7, zc);
    L.box(CX, zo - 0.04, F + 3.97, F + 4.43, cw - 2.0, 0.02, 0, [1, 1, 1]);
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
    S.box(xc, zw + d / 2, F + 3.9, F + 4.25, xb - xa, d, 0, white, { bottom: true, top: slab });
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
