import { KIND, hex, shade, obb } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { fence, FENCE } from '../enclosure.js';
import { rectRing } from '../../geo/gates.js';
import { planter, dinh } from '../props.js';

// ---- Hưng Miếu (Hưng Tổ Miếu), the temple of Gia Long's parents, behind Thế Miếu in the Imperial City ----
//
// Sources (docs/places/hungmieu.md has the full list):
//  - vi.wikipedia.org/wiki/Hưng_Miếu: plan near square, 19 m x 19.20 m; a double house (nhà kép, trùng thiềm
//    điệp ốc) of about 400 m²; platform 0.68 m faced with Thanh Hóa stone; yellow-glazed yin-yang tiles; 9 rows of
//    columns front to back, 8 across; main house 3 bays + 2 kép, front house 5 bays + 2 single chái; a stylised 壽
//    on the front wall of each wing; six columns standing on the court in front, with lotus capitals; court
//    20 m x 18.45 m in bát tràng brick, a 2.15 m stone thần đạo down its middle to the Miếu Môn; six porcelain
//    planters on stone stands along the eave, an incense burner; brick walls, side gates Dục Khánh and Chương
//    Khánh leading to Thần Trù (kitchen) and Thần Khố (store), symmetrical rear gates Trí Tường and Ứng Tường; two
//    stone steles (1804, 1821) on the left. Burnt 1947, rebuilt 1951 from the An Khánh Vương từ, restored 1995
//    (red lacquer and gilding).
//  - OpenStreetMap: the hall (way 172657565), Miếu Môn (695810836), the four gates (695810831/32/34/35), Thần
//    Khố (696058130), Thần Trù (690838605) and the compound's side walls (695810826/27/28/29). The outer wall and
//    the wall between this court and Thế Miếu's are drawn by civic.js (templeWalls).
//  - The city height survey reads the hall at 7.0 m to the ridge.
// Estimated: the split between the front and main house, eave heights, the gates' height and roofs, the steles'
// side and size, and the two service halls' form.

// OSM outlines, metres in the model frame (from the raw extract, data/raw)
const HALL = [[-1340.4, 146.8], [-1325.0, 135.7], [-1313.3, 151.8], [-1328.7, 162.9]];
const MIEU_MON = [[-1305.2, 164.8], [-1303.3, 167.3], [-1313.6, 175.0], [-1315.4, 172.5]];
// the rear two stand in Thế Miếu's outer wall (themieu.js), which stops clear of their roofs (REAR_GATE_CUTS)
const REAR_GATES = [
  [[-1314.5, 116.5], [-1313.0, 118.4], [-1308.0, 114.8], [-1309.5, 112.8]], // Ứng Tường Môn (rear, east)
  [[-1365.4, 154.6], [-1363.9, 156.5], [-1359.0, 152.7], [-1360.5, 150.8]], // Trí Tường Môn (rear, west)
];
const GATES = [
  [[-1301.9, 135.9], [-1303.6, 137.1], [-1299.7, 142.2], [-1298.1, 141.0]], // Chương Khánh Môn (east side)
  [[-1343.1, 166.1], [-1344.9, 167.4], [-1341.1, 172.6], [-1339.3, 171.3]], // Dục Khánh Môn (west side)
  ...REAR_GATES,
];
const GATE_OVER = 0.5; // the gates' roofs run this far past the mapped outline
// a wall that runs into a gate along its length stops this far past the outline's end: clear of the roof's eave by
// 0.1 m with the wall's end post and its cap; the gate model bridges the gap with a stub of wall under its eave
const GATE_STUB = GATE_OVER + (FENCE.imperial.postW + 0.12) / 2 + 0.1;
// the rear gates' outlines grown along the wall by that much: themieu.js passes them to its outer wall as solid
export const REAR_GATE_CUTS = REAR_GATES.map((ring) => { const o = obb(ring); return rectRing(o.c[0], o.c[1], o.w + 2 * GATE_STUB, o.d, o.a); });
const SERVICE = [
  [[-1267.6, 129.0], [-1277.9, 136.6], [-1288.1, 122.9], [-1277.8, 115.3]], // Thần Khố
  [[-1356.1, 186.5], [-1366.4, 194.2], [-1376.7, 180.5], [-1366.4, 172.9]], // Thần Trù
];
// each from where it meets Thế Miếu's outer or cross wall (themieu.js) to a side gate
const WALLS = [
  [[-1316.0, 119.1], [-1302.9, 136.6]],
  [[-1283.5, 161.5], [-1298.9, 141.6]],
  [[-1356.9, 149.4], [-1344.0, 166.8]],
  [[-1325.1, 192.3], [-1340.2, 172.0]],
];

const TILE = PAL.imperialRoof, RIDGE = hex('#f1d77a'), LAC = PAL.lacquer, GOLD = hex('#d9b04a');
const STONE = PAL.stone, BRICK = hex('#9c6a56'), OCHRE = hex('#cfa65a'), DARK = hex('#3a2420');
const gY = (x, z) => LAND_Y + rise(x, z);

export const id = 'hungmieu';

export function build({ S }) {
  // the hall's frame: u across the front (east-north-east), v toward the front (south-south-east, to Thế Miếu)
  const c = HALL.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4], [0, 0]);
  const ex = HALL[1][0] - HALL[0][0], ez = HALL[1][1] - HALL[0][1], el = Math.hypot(ex, ez);
  const ux = ex / el, uz = ez / el, ang = Math.atan2(uz, ux);
  const P = (u, v) => [c[0] + u * ux - v * uz, c[1] + u * uz + v * ux];
  const y0 = gY(c[0], c[1]);
  const box = (u, v, ya, yb, w, d, col, o) => { const q = P(u, v); S.box(q[0], q[1], ya, yb, w, d, ang, col, o); };
  const hip = (u, v, w, d, ya, h, o) => { const q = P(u, v); S.hip(q[0], q[1], w, d, ang, ya, h, TILE, { flare: 0.5, fascia: 0.28, fasciaCol: shade(LAC, 0.7), hips: true, glazed: true, segs: 4, ...o }); };
  const cyl = (u, v, ya, yb, r0, r1, n, col, o) => { const q = P(u, v); S.cyl(q[0], q[1], ya, yb, r0, r1, n, col, { rot: ang, ...o }); };
  S.base = y0 - LAND_Y;

  // ---- court: bát tràng brick 20 x 18.45 m before the hall, the stone thần đạo down its middle ----
  const courtV = 7.9, gateV = 26.9;
  S.kind = KIND.MASONRY;
  box(0, (courtV + gateV - 1.6) / 2, y0 - 0.2, y0 + 0.14, 20, gateV - 1.6 - courtV, BRICK);
  box(0, (courtV + gateV) / 2, y0 - 0.2, y0 + 0.2, 2.15, gateV - courtV, shade(STONE, 1.08));
  box(0, 7.6 - 18.4 / 2, y0 - 0.2, y0 + 0.14, 23, 19, shade(BRICK, 0.92)); // brick apron round the platform

  // ---- the hall: platform 0.68 m, faced in stone, with a flight in the middle of the front ----
  const pt = 0.68, yp = y0 + pt;
  box(0, -0.7, y0 - 0.3, yp, 18.4, 17.0, STONE, { taper: 0.985, topKind: KIND.ROAD });
  for (let k = 1; k <= 3; k++) box(0, 7.8 + 0.3 * (k - 0.5), y0 - 0.2, yp - (pt / 4) * k, 4.2, 0.3, shade(STONE, 1.04), { topKind: KIND.ROAD });

  // main house (chánh doanh): 3 bays + 2 kép, deep, under a two-tier roof
  S.kind = KIND.TIMBER;
  box(0, -4.0, yp, yp + 3.3, 17.0, 9.2, shade(LAC, 0.86), { top: shade(TILE, 0.8) });
  hip(0, -4.0, 17.0, 9.2, yp + 3.3, 1.0, { over: 1.3, flare: 0.35 });
  box(0, -4.0, yp + 3.6, yp + 4.65, 12.6, 5.6, shade(LAC, 0.8));
  hip(0, -4.0, 12.6, 5.6, yp + 4.6, 2.0, { over: 1.0, ridgeCol: RIDGE });
  // front house (tiền doanh): 5 bays + 2 chái, its roof carried forward over the free columns on the court
  box(0, 3.8, yp, yp + 3.0, 17.0, 6.4, LAC, { top: shade(TILE, 0.8) });
  hip(0, 4.5, 17.0, 7.8, yp + 3.0, 1.85, { over: 1.25, ridgeCol: RIDGE });
  S.kind = KIND.PLAIN;
  box(0, 7.7, yp + 2.75, yp + 3.0, 17.0, 1.4, shade(LAC, 0.45), { bottom: true }); // the verandah ceiling

  // the front: lacquered door leaves in the five bays, the gilt liên ba above, a 壽 medallion on each chái
  const bay = 2.7;
  for (let i = -2; i <= 2; i++) {
    box(i * bay, 7.03, yp, yp + 2.3, bay - 0.5, 0.08, shade(LAC, 0.62));
    box(i * bay, 7.04, yp + 2.35, yp + 2.72, bay - 0.4, 0.08, GOLD);
  }
  for (const s of [-1, 1]) {
    box(s * 7.6, 7.03, yp + 0.3, yp + 2.6, 1.5, 0.06, OCHRE);
    cyl(s * 7.6, 7.08, yp + 1.15, yp + 1.85, 0.36, 0.36, 8, GOLD);
  }
  // six columns standing on the court, lotus capitals under the eave beam
  for (let i = 0; i < 6; i++) {
    const u = (i - 2.5) * bay;
    cyl(u, 8.4, y0 + 0.05, y0 + 0.35, 0.42, 0.36, 6, shade(STONE, 0.95), { cap: false });
    cyl(u, 8.4, y0 + 0.35, yp + 2.55, 0.22, 0.2, 7, LAC, { cap: false });
    cyl(u, 8.4, yp + 2.5, yp + 2.78, 0.2, 0.34, 7, GOLD);
  }
  S.kind = KIND.TIMBER;
  box(0, 8.4, yp + 2.72, yp + 3.0, 16.0, 0.32, shade(LAC, 0.75));
  // the main ridge: a flaming pearl between two dragons
  S.kind = KIND.PLAIN;
  const ridgeY = yp + 6.6;
  cyl(0, -4.0, ridgeY + 0.2, ridgeY + 0.9, 0.32, 0.12, 8, RIDGE);
  for (const s of [-1, 1]) {
    const a = P(s * 0.7, -4.0), b = P(s * 2.6, -4.0);
    S.beam([a[0], ridgeY + 0.75, a[1]], [b[0], ridgeY + 0.35, b[1]], 0.22, 0.32, RIDGE);
  }

  // ---- in the court: six blue-and-white planters on stands, the bronze incense burner, two steles ----
  for (const u of [-8.6, -5.2, -1.8, 1.8, 5.2, 8.6]) {
    const q = P(u, 11.0);
    planter(S, q[0], y0, q[1], ang, { r: 0.46, stand: 0.55, standCol: STONE, col: hex('#dfe6ea'), band: hex('#3c5a8a'), square: true });
  }
  { // the bronze incense burner (lư đỉnh) on its stone plinth, facing down the court
    const q = P(0, 19.0);
    dinh(S, q[0], y0, q[1], ang + Math.PI / 2, { h: 1.95, col: hex('#5b5a48'), lid: true, stand: 0.4, standCol: STONE, standW: 1.6 });
  }
  for (const v of [13.5, 18.0]) {
    S.kind = KIND.MASONRY;
    box(12.5, v, y0, y0 + 0.45, 1.6, 0.9, STONE);
    box(12.5, v, y0 + 0.45, y0 + 2.4, 1.1, 0.28, shade(STONE, 0.85), { top: shade(STONE, 0.7) });
    S.kind = KIND.PLAIN;
    box(12.5, v, y0 + 2.4, y0 + 2.65, 1.25, 0.36, shade(STONE, 0.8), { taper: 0.7 });
  }

  // ---- Miếu Môn: a three-door gate at the foot of the court, a higher roof over the middle door ----
  {
    const o = obb(MIEU_MON);
    const yg = y0, w = o.w, d = o.d;
    S.kind = KIND.MASONRY;
    box(0, gateV, yg - 0.3, yg + 0.25, w + 0.8, d + 1.2, STONE, { topKind: KIND.ROAD });
    const yb = yg + 0.25, side = (w - 4.2) / 2;
    for (const s of [-1, 1]) {
      const u = s * (2.1 + side / 2);
      box(u, gateV, yb, yb + 3.1, side, d, OCHRE, { top: shade(TILE, 0.8) });
      S.kind = KIND.PLAIN;
      box(u, gateV, yb, yb + 2.3, 1.4, d + 0.08, DARK);
      hip(u, gateV, side, d, yb + 3.1, 1.0, { over: 0.55, flare: 0.3, ridgeCol: RIDGE, segs: 3 });
      // short screen walls either side
      S.kind = KIND.MASONRY;
      box(s * (w / 2 + 0.9), gateV, yg - 0.3, yg + 2.3, 1.8, 0.6, OCHRE, { top: TILE });
    }
    S.kind = KIND.MASONRY;
    box(0, gateV, yb, yb + 4.1, 4.2, d + 0.2, OCHRE, { top: shade(TILE, 0.8) });
    S.kind = KIND.PLAIN;
    box(0, gateV, yb, yb + 3.0, 2.1, d + 0.3, DARK);
    box(0, gateV, yb + 3.25, yb + 3.8, 1.6, d + 0.32, GOLD); // the name board
    hip(0, gateV, 4.2, d + 0.2, yb + 4.1, 1.3, { over: 0.7, ridgeCol: RIDGE, segs: 3 });
  }

  // ---- the four small gates in the side and rear walls: one doorway under a yellow-tiled roof ----
  for (const ring of GATES) {
    const o = obb(ring), yg = gY(o.c[0], o.c[1]);
    S.base = yg - LAND_Y;
    S.kind = KIND.MASONRY;
    S.box(o.c[0], o.c[1], yg - 0.3, yg + 3.2, o.w, o.d + 0.3, o.a, OCHRE, { top: shade(TILE, 0.8) });
    S.kind = KIND.PLAIN;
    S.box(o.c[0], o.c[1], yg, yg + 2.4, 1.5, o.d + 0.38, o.a, DARK);
    S.hip(o.c[0], o.c[1], o.w, o.d + 0.3, o.a, yg + 3.2, 0.95, TILE, { flare: 0.3, over: GATE_OVER, fascia: 0.2, fasciaCol: shade(LAC, 0.7), ridgeCol: RIDGE, hips: true, glazed: true, segs: 3 });
  }

  // the stubs of Thế Miếu's outer wall each side of the rear gates, under their eaves, out to where that wall stops
  for (const ring of REAR_GATES) {
    const o = obb(ring), yg = gY(o.c[0], o.c[1]), ux = Math.cos(o.a), uz = Math.sin(o.a), st = FENCE.imperial, l = GATE_STUB - (st.postW + 0.12) / 2;
    S.base = yg - LAND_Y;
    S.kind = KIND.MASONRY;
    for (const s of [-1, 1]) {
      const m = o.w / 2 + l / 2;
      S.box(o.c[0] + ux * s * m, o.c[1] + uz * s * m, yg - 0.4, yg + st.h - 0.18, l, st.t, o.a, st.wall, { top: st.cap });
    }
  }

  // ---- Thần Khố and Thần Trù, the store and the kitchen beside the court: plain tiled halls ----
  for (const ring of SERVICE) {
    const o = obb(ring), yg = gY(o.c[0], o.c[1]);
    S.base = yg - LAND_Y;
    S.kind = KIND.MASONRY;
    S.box(o.c[0], o.c[1], yg - 0.3, yg + 0.45, o.w - 0.6, o.d - 0.6, o.a, STONE, { topKind: KIND.ROAD });
    S.kind = KIND.TIMBER;
    S.box(o.c[0], o.c[1], yg + 0.45, yg + 3.1, o.w - 2.6, o.d - 2.6, o.a, shade(LAC, 0.85), { top: shade(TILE, 0.8) });
    S.hip(o.c[0], o.c[1], o.w - 2.6, o.d - 2.6, o.a, yg + 3.1, 2.1, shade(TILE, 0.92), { flare: 0.45, over: 1.1, fascia: 0.25, fasciaCol: shade(LAC, 0.7), ridgeCol: RIDGE, hips: true, glazed: true, segs: 3 });
  }

  // ---- the compound's side walls (the rear and front walls are civic.js's) ----
  S.base = 0;
  // each runs from Thế Miếu's outer or cross wall (themieu.js): it starts clear of that wall's corner post (both end
  // posts' capped halves), and stops at the side gate's face as before
  const st = FENCE.imperial, butt0 = st.postW + 0.12 + 0.04, butt1 = st.t / 2 + 0.25;
  for (const [a, b] of WALLS) {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]), ex = (b[0] - a[0]) / l, ez = (b[1] - a[1]) / l;
    fence(S, [[a[0] + ex * butt0, a[1] + ez * butt0], [b[0] - ex * butt1, b[1] - ez * butt1]], st, { closed: false });
  }
  S.kind = KIND.PLAIN;
  S.base = 0;
}
