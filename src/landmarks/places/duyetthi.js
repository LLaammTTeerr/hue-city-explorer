import { KIND, hex, shade, obb } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { fence, FENCE } from '../enclosure.js';

// ---- Duyệt Thị Đường, the royal theatre in the south-east corner of the Forbidden Purple City ----
//
// Sources (docs/places/duyetthi.md has the full list):
//  - vi.wikipedia.org/wiki/Duyệt_Thị_đường_(Hoàng_thành_Huế): built 1826 (Minh Mạng 7) on the site of Thanh Phong
//    Đường, repaired 1829, turned into the national music school in 1962, restored 1995-2002, in use since 2003;
//    building 1,182 m² on a 11,740 m² site; a wide rectangular hall with curved gable ridges (bờ quyết); two rows
//    of lacquered ironwood columns 12 m tall; two storeys inside (the royal box upstairs facing the stage); a
//    covered gallery links it to the palace halls; Ngự Y on its right and Thượng Thiện on its left, walled off.
//  - baophapluat.vn (Nhã nhạc ... nhìn từ nhà hát Duyệt Thị Đường): ironwood hall, glazed tiles, "bốn gian hai
//    chái" (4 bays + 2 end bays), 12 m high, two storeys, in a walled square yard.
//  - vietnamtourism.vn: restored to the original form, glazed tile roof, columns red lacquer with gilding.
//  - OpenStreetMap: the hall (way 172657563, 38.4 x 22.4 m, long axis east-north-east), Duyệt Thị Môn (way
//    619851666) and the yard wall either side of it (ways 1570130373, 1570130266). The city height survey reads
//    the hall at 12.0 m to the top.
// The hall faces east-north-east along its long axis: with that front, Ngự Y (OSM 695949060) stands on its right
// and Thượng Thiện (695810763) on its left, as the wiki says, and the gallery Tả Trường Lang joins its back end.
// Estimated: the two-tier roof split (eave 4.6 m, clerestory 5.9-7.6 m, ridge 11.8 m), the platform height, the
// bay widths, the panel and door pattern, the ridge ornament, the gate's form.

// OSM outlines, metres in the model frame (from the raw extract, data/raw)
const HALL = [[-1116.2, -135.3], [-1085.3, -158.1], [-1098.7, -176.0], [-1129.6, -153.2]]; // roof outline
const GATE = [[-1105.4, -199.2], [-1107.8, -197.3], [-1107.2, -196.6], [-1104.3, -197.8]]; // Duyệt Thị Môn
const WALLS = [
  [[-1107.2, -196.6], [-1142.6, -170.8]],
  [[-1104.8, -198.4], [-1080.8, -216.0], [-1080.4, -215.4]],
];

const TILE = PAL.imperialRoof, RIDGE = hex('#f1d77a'), LAC = PAL.lacquer, GOLD = hex('#d9b04a');
const STONE = PAL.stone, BRICK = hex('#9c6a56'), OCHRE = hex('#cfa65a'), DARK = hex('#3a2420');
const gY = (x, z) => LAND_Y + rise(x, z);

export const id = 'duyetthi';

export function build({ S }) {
  // the hall's frame: u along the long axis toward the front (east-north-east), v across it (toward Ngự Y)
  const c = HALL.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4], [0, 0]);
  const ex = HALL[1][0] - HALL[0][0], ez = HALL[1][1] - HALL[0][1], L = Math.hypot(ex, ez);
  const W = Math.hypot(HALL[3][0] - HALL[0][0], HALL[3][1] - HALL[0][1]);
  const ux = ex / L, uz = ez / L, ang = Math.atan2(uz, ux);
  const P = (u, v) => [c[0] + u * ux - v * uz, c[1] + u * uz + v * ux];
  const y0 = gY(c[0], c[1]);
  const box = (u, v, ya, yb, w, d, col, o) => { const q = P(u, v); S.box(q[0], q[1], ya, yb, w, d, ang, col, o); };
  const hip = (u, v, w, d, ya, h, o) => { const q = P(u, v); S.hip(q[0], q[1], w, d, ang, ya, h, TILE, { flare: 0.5, fascia: 0.28, fasciaCol: shade(LAC, 0.7), hips: true, glazed: true, segs: 4, ...o }); };
  const cyl = (u, v, ya, yb, r0, r1, n, col, o) => { const q = P(u, v); S.cyl(q[0], q[1], ya, yb, r0, r1, n, col, { rot: ang, ...o }); };
  S.base = y0 - LAND_Y;

  // ---- the yard: brick paving round the hall, a stone walk from the front door to Duyệt Thị Môn ----
  S.kind = KIND.MASONRY;
  box(0, 0, y0 - 0.25, y0 + 0.08, L + 7, W + 7, shade(BRICK, 0.85));
  box(L / 2 + 5.5, -3.0, y0 - 0.25, y0 + 0.1, 4.5, 20, shade(STONE, 1.05));

  // ---- the platform: 0.6 m, stone-faced, with a flight of steps at the front door ----
  const pt = 0.6, yp = y0 + pt;
  const wl = L - 2.4, ww = W - 2.4; // the outer walls stand 1.2 m inside the eave line
  box(0, 0, y0 - 0.3, yp, wl + 1.4, ww + 1.4, STONE, { taper: 0.99, topKind: KIND.ROAD });
  for (let k = 1; k <= 3; k++) box(wl / 2 + 0.7 + 0.32 * (k - 0.5), 0, y0 - 0.2, yp - (pt / 3.2) * k, 0.32, 7.2, shade(STONE, 1.04), { topKind: KIND.ROAD });

  // ---- lower storey: the outer wall of lacquered timber panels, four bays and two end bays down each side ----
  const yE = yp + 4.0; // the lower eave
  S.kind = KIND.TIMBER;
  box(0, 0, yp, yE, wl, ww, shade(LAC, 0.86), { top: shade(TILE, 0.8) });
  S.kind = KIND.PLAIN;
  const chai = 5.6, gian = (wl - 2 * chai) / 4;
  const xs = [-wl / 2, -wl / 2 + chai]; for (let i = 1; i <= 4; i++) xs.push(-wl / 2 + chai + i * gian);
  for (let i = 0; i + 1 < xs.length; i++) {
    const m = (xs[i] + xs[i + 1]) / 2, bw = xs[i + 1] - xs[i];
    for (const s of [-1, 1]) {
      box(m, s * (ww / 2 + 0.02), yp + 0.15, yp + 2.9, bw - 1.1, 0.1, shade(LAC, 0.62)); // door leaves
      box(m, s * (ww / 2 + 0.03), yp + 3.05, yp + 3.65, bw - 0.9, 0.1, GOLD); // gilt liên ba
    }
  }
  // columns at the bay lines, proud of the wall
  for (const x of xs) for (const s of [-1, 1]) cyl(x, s * (ww / 2 + 0.05), yp, yE, 0.24, 0.22, 8, LAC, { cap: false });
  // the ends: three doors at the front (the public entrance), plain panels at the back where the gallery joins
  const eb = ww / 5;
  for (let i = -2; i <= 2; i++) {
    const front = Math.abs(i) <= 1;
    box(wl / 2 + 0.02, i * eb, yp + 0.15, yp + (front ? 3.0 : 2.9), 0.1, eb - (front ? 0.6 : 1.0), front ? DARK : shade(LAC, 0.62));
    box(wl / 2 + 0.03, i * eb, yp + 3.1, yp + 3.65, 0.1, eb - 0.6, GOLD);
    box(-wl / 2 - 0.02, i * eb, yp + 0.15, yp + 2.9, 0.1, eb - 1.0, shade(LAC, 0.62));
  }
  for (let i = -2.5; i <= 2.5; i++) for (const s of [-1, 1]) cyl(s * (wl / 2 + 0.05), i * eb, yp, yE, 0.24, 0.22, 8, LAC, { cap: false });
  S.kind = KIND.PLAIN;
  box(wl / 2 + 0.1, 0, yp + 3.7, yp + 4.0, 0.12, 4.2, shade(LAC, 0.5)); // the name board over the doors
  box(wl / 2 + 0.16, 0, yp + 3.75, yp + 3.95, 0.06, 3.8, GOLD);

  // ---- lower roof: the skirt round the whole hall, from the outer wall up to the clerestory ----
  const bl = 30.0, bw2 = 13.6; // the tall inner hall over the two rows of 12 m columns
  hip(0, 0, wl, ww, yE, 3.2, { over: 1.2, flare: 0.35, ridgeCol: RIDGE, horns: true, segs: 3 });

  // ---- upper storey: the clerestory over the inner hall, then the main roof ----
  const yC = yp + 5.3, yU = yp + 7.0;
  S.kind = KIND.TIMBER;
  box(0, 0, yE, yU, bl, bw2, shade(LAC, 0.8), { top: shade(TILE, 0.8) });
  S.kind = KIND.PLAIN;
  for (let i = -5; i <= 5; i++) for (const s of [-1, 1]) box(i * (bl / 11), s * (bw2 / 2 + 0.02), yC - 0.1, yU - 0.25, bl / 11 - 0.7, 0.08, i % 2 ? OCHRE : GOLD);
  for (let i = -2; i <= 2; i++) for (const s of [-1, 1]) box(s * (bl / 2 + 0.02), i * (bw2 / 5), yC - 0.1, yU - 0.25, 0.08, bw2 / 5 - 0.6, i % 2 ? OCHRE : GOLD);
  hip(0, 0, bl, bw2, yU, 4.2, { over: 1.3, ridgeCol: RIDGE });

  // the main ridge: a flaming pearl between two dragons; bờ quyết lifts at the ends
  const ridgeY = yU + 4.2;
  cyl(0, 0, ridgeY + 0.2, ridgeY + 0.75, 0.3, 0.12, 8, RIDGE);
  for (const s of [-1, 1]) {
    const a = P(s * 0.7, 0), b = P(s * 3.0, 0);
    S.beam([a[0], ridgeY + 0.7, a[1]], [b[0], ridgeY + 0.3, b[1]], 0.22, 0.32, RIDGE);
  }

  // ---- Duyệt Thị Môn, the small gate in the yard's north wall: one doorway under a yellow-tiled roof ----
  {
    const o = obb(GATE), yg = gY(o.c[0], o.c[1]);
    S.base = yg - LAND_Y;
    S.kind = KIND.MASONRY;
    S.box(o.c[0], o.c[1], yg - 0.3, yg + 3.4, o.w + 0.4, o.d + 0.4, o.a, OCHRE, { top: shade(TILE, 0.8) });
    S.kind = KIND.PLAIN;
    const across = o.w >= o.d; // the doorway runs through the gate's short side
    S.box(o.c[0], o.c[1], yg, yg + 2.5, across ? 1.5 : o.w + 0.5, across ? o.d + 0.5 : 1.5, o.a, DARK);
    S.hip(o.c[0], o.c[1], o.w + 0.4, o.d + 0.4, o.a, yg + 3.4, 1.0, TILE, { flare: 0.3, over: 0.55, fascia: 0.2, fasciaCol: shade(LAC, 0.7), ridgeCol: RIDGE, hips: true, glazed: true, segs: 3 });
  }

  // ---- the yard wall either side of the gate ----
  S.base = 0;
  for (const w of WALLS) fence(S, w, FENCE.imperial, { closed: false });
  S.kind = KIND.PLAIN;
  S.base = 0;
}
