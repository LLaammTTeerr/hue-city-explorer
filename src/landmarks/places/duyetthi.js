import { KIND, hex, shade, obb, hipShape } from '../../geo/buf.js';
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
//  - Google satellite (2026) and a photosphere taken on the hall's axis in front of the entrance: the roof plan (a
//    hipped skirt all round, ~5.6 m deep; over it a gabled upper roof ~27 x 10 m whose ridge runs out to the gable
//    ends), the grey-brown tiles, the yellow stucco walls with white pilasters, blue-framed medallion windows and a
//    grey frieze, the open three-bay portico at the front, the paved forecourt with a bronze cauldron on the axis.
//    The photo puts the gable's apex lower than the 12 m the sources give; the height follows the sources.
// Estimated: the heights inside the 12 m (eave 4.6 m, upper eave 7.6 m, ridge 11.8 m), the plinth, the bay widths,
// the side and back walls (not in any capture: drawn like the front), the ridge ornament, the gate's form.

// OSM outlines, metres in the model frame (from the raw extract, data/raw)
const HALL = [[-1116.2, -135.3], [-1085.3, -158.1], [-1098.7, -176.0], [-1129.6, -153.2]]; // roof outline
const GATE = [[-1105.4, -199.2], [-1107.8, -197.3], [-1107.2, -196.6], [-1104.3, -197.8]]; // Duyệt Thị Môn
const WALLS = [
  [[-1107.2, -196.6], [-1142.6, -170.8]],
  [[-1104.8, -198.4], [-1080.8, -216.0], [-1080.4, -215.4]],
];

// Colours from Google imagery (satellite and a photosphere taken on the axis in front of the hall, 2024): the roof
// reads dark grey-brown from above and grey in the photo, not the yellow glaze of the palace halls round it; the
// walls are yellow stucco with white pilasters, a grey frieze under the eave and a red-brown plinth.
const TILE = hex('#6c6358'), RIDGE = hex('#d6cfbd'), LAC = PAL.lacquer, GOLD = hex('#d9b04a');
const STONE = PAL.stone, PAVE = hex('#c9c3b6'), PLINTH = hex('#8c5040'), DARK = hex('#3a2420'), OCHRE = hex('#cfa65a');
const WALL = hex('#dcc57f'), PIL = hex('#ece5d2'), FRIEZE = hex('#a9aaa2'), BLUE = hex('#3f5f9c'), GABLE = hex('#5d4b44');
const gY = (x, z) => LAND_Y + rise(x, z);

export const id = 'duyetthi';

export function build({ S }) {
  // the hall's frame: u along the long axis toward the front (east-north-east), v across it (toward Ngự Y)
  const c = HALL.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4], [0, 0]);
  const ex = HALL[1][0] - HALL[0][0], ez = HALL[1][1] - HALL[0][1], L = Math.hypot(ex, ez);
  const W = Math.hypot(HALL[3][0] - HALL[0][0], HALL[3][1] - HALL[0][1]);
  const ux = ex / L, uz = ez / L, ang = Math.atan2(uz, ux);
  const P = (u, v) => [c[0] + u * ux - v * uz, c[1] + u * uz + v * ux];
  const P3 = (u, v, y) => { const q = P(u, v); return [q[0], y, q[1]]; };
  const y0 = gY(c[0], c[1]);
  const box = (u, v, ya, yb, w, d, col, o) => { const q = P(u, v); S.box(q[0], q[1], ya, yb, w, d, ang, col, o); };
  const hip = (u, v, w, d, ya, h, o) => { const q = P(u, v); S.hip(q[0], q[1], w, d, ang, ya, h, TILE, { flare: 0.5, fascia: 0.28, fasciaCol: shade(TILE, 0.6), hips: true, glazed: true, segs: 4, ...o }); };
  const cyl = (u, v, ya, yb, r0, r1, n, col, o) => { const q = P(u, v); S.cyl(q[0], q[1], ya, yb, r0, r1, n, col, { rot: ang, ...o }); };
  S.base = y0 - LAND_Y;

  // ---- the ground: a stone apron round the hall (the satellite shows garden close up to it on three sides) and
  // the paved forecourt in front of the entrance, with the bronze cauldron on the axis and a low hedge behind it ----
  S.kind = KIND.MASONRY;
  box(0, 0, y0 - 0.25, y0 + 0.07, L + 1.6, W + 1.6, shade(STONE, 0.95));
  box(L / 2 + 13.8, 0, y0 - 0.25, y0 + 0.06, 26, 24, PAVE, { topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;
  box(L / 2 + 4.2, 0, y0 + 0.06, y0 + 0.75, 1.0, 7.5, hex('#4d6b3a'));
  cyl(L / 2 + 5.6, 0, y0 + 0.06, y0 + 0.5, 0.9, 0.9, 8, shade(STONE, 0.9));
  cyl(L / 2 + 5.6, 0, y0 + 0.5, y0 + 1.5, 0.55, 0.75, 10, hex('#3f3a33'));
  for (const s of [-1, 1]) { cyl(L / 2 + 6.0, s * 7.2, y0 + 0.06, y0 + 0.75, 0.45, 0.45, 6, shade(STONE, 0.9)); cyl(L / 2 + 6.0, s * 7.2, y0 + 0.75, y0 + 1.7, 0.32, 0.22, 6, hex('#3f3a33')); }

  // ---- the plinth: a low red-brown base, two steps up to the entrance ----
  const pt = 0.4, yp = y0 + pt;
  const wl = L - 2.4, ww = W - 2.4; // the outer walls stand 1.2 m inside the eave line
  S.kind = KIND.MASONRY;
  box(0, 0, y0 - 0.3, yp, wl + 0.8, ww + 0.8, PLINTH, { topKind: KIND.ROAD });
  for (let k = 1; k <= 2; k++) box(wl / 2 + 0.4 + 0.34 * (k - 0.5), 0, y0 - 0.2, yp - (pt / 2.4) * k, 0.34, 8.4, shade(STONE, 1.04), { topKind: KIND.ROAD });

  // ---- the walls: yellow stucco to a 4.6 m eave; at the front an open portico three openings wide, recessed 2 m ----
  const yE = yp + 4.2;
  const pw = 8.6, pd = 2.0, sideW = ww / 2 - pw / 2;
  S.kind = KIND.PLAIN; // smooth stucco
  box(-pd / 2, 0, yp, yE, wl - pd, ww, WALL, { top: shade(TILE, 0.8) });
  for (const s of [-1, 1]) box(wl / 2 - pd / 2, s * (pw / 2 + sideW / 2), yp, yE, pd, sideW, WALL, { top: shade(TILE, 0.8) });
  box(wl / 2 - pd / 2, 0, yE - 0.95, yE, pd, pw, FRIEZE); // the lintel over the portico
  box(0, 0, yE - 0.95, yE - 0.15, wl + 0.08, ww + 0.08, FRIEZE); // the frieze band under the eave
  // the portico: doors in its back wall, two columns between the openings, white pilasters either side
  for (let i = -1; i <= 1; i++) box(wl / 2 - pd + 0.03, i * 2.8, yp + 0.05, yE - 1.25, 0.08, 2.1, shade(DARK, i ? 1.3 : 1));
  for (const s of [-1, 1]) cyl(wl / 2 - 0.35, s * 1.9, yp, yE - 0.95, 0.2, 0.18, 8, shade(WALL, 1.05), { cap: false });
  // the bay lines: four bays and two end bays (chái) down each side
  const chai = 5.6, gian = (wl - 2 * chai) / 4;
  const xs = [-wl / 2, -wl / 2 + chai]; for (let i = 1; i <= 4; i++) xs.push(-wl / 2 + chai + i * gian);
  const medal = (u, v, n) => { // a square window framed in blue with a porcelain panel; n is the outward normal axis
    const q = n === 'v' ? [1.7, 0.12] : [0.12, 1.7], r = n === 'v' ? [1.3, 0.14] : [0.14, 1.3];
    box(u, v, yp + 1.15, yp + 2.85, q[0], q[1], BLUE);
    box(u, v, yp + 1.35, yp + 2.65, r[0], r[1], shade(BLUE, 0.6));
  };
  for (let i = 0; i + 1 < xs.length; i++) for (const s of [-1, 1]) medal((xs[i] + xs[i + 1]) / 2, s * (ww / 2 + 0.02), 'v');
  for (const x of xs) for (const s of [-1, 1]) box(x, s * (ww / 2 + 0.06), yp, yE - 0.95, 0.6, 0.14, PIL);
  for (const s of [-1, 1]) {
    medal(wl / 2 + 0.02, s * (pw / 2 + sideW / 2), 'u');
    medal(-wl / 2 - 0.02, s * (pw / 2 + sideW / 2), 'u');
    for (const v of [ww / 2 - 0.3, pw / 2 + 0.3]) box(wl / 2 + 0.06, s * v, yp, yE - 0.95, 0.14, 0.6, PIL);
    box(-wl / 2 - 0.06, s * (ww / 2 - 0.3), yp, yE - 0.95, 0.14, 0.6, PIL);
  }
  box(-wl / 2 - 0.03, 0, yp + 0.05, yp + 2.9, 0.08, 2.2, shade(LAC, 0.5)); // the back door, where the gallery joins
  // framed panels in the frieze across the front
  for (let i = -3; i <= 3; i++) box(wl / 2 + 0.06, i * 2.6, yE - 0.8, yE - 0.3, 0.06, 2.0, shade(FRIEZE, 0.6));

  // ---- lower roof: the skirt round the whole hall, rising to meet the upper roof's eave (the photo shows no
  // clerestory band between them at the front: the gable stands straight on the skirt) ----
  hip(0, 0, wl, ww, yE, 4.8, { over: 1.2, flare: 0.35, ridgeCol: RIDGE, horns: true, segs: 3 });

  // ---- upper storey: the inner hall's walls (hidden by the skirt), then the main roof, gabled at both ends ----
  // From above the upper roof runs ~27 m between its gable ends and ~10 m across its eaves, set ~5.6 m inside
  // the skirt's eave all round; its ridge runs to the gables (no hips), and the front gable faces the entrance.
  const bl = 26, bw2 = 8, uo = 1.0, cut = bl / 2 + 0.55, uh = 4.2;
  const yU = yp + 7.2; // ridge 11.8 m above the yard, as the sources and the height survey give (12 m)
  S.kind = KIND.TIMBER;
  box(0, 0, yE, yU, bl, bw2, shade(WALL, 0.9), { top: shade(TILE, 0.8) });
  S.kind = KIND.PLAIN;
  // a long hip cut back to the gables (the clip keeps its ridge running out to the cut)
  const Lh = 36;
  hip(0, 0, Lh, bw2, yU, uh, { over: uo, ridgeCol: RIDGE, hips: false, clip: { u0: -cut, u1: cut } });
  // the gables: the tympanum filled under the roof's curve, with a gilt medallion; curved barge ridges (bờ quyết)
  const sh = hipShape(Lh + 2 * uo, bw2 + 2 * uo, 0.5, false, RIDGE, 4), hd = sh.hd;
  const gableY = (v) => uh * Math.max(0, 1 - Math.abs(v) / hd) ** sh.gamma;
  for (const s of [-1, 1]) {
    const nrm = [s * ux, 0, s * uz], u = s * (bl / 2 + 0.02), n = 8;
    for (let k = 0; k < n; k++) {
      const va = -bw2 / 2 + (bw2 * k) / n, vb = -bw2 / 2 + (bw2 * (k + 1)) / n;
      S.quad(P3(u, va, yU), P3(u, vb, yU), P3(u, vb, yU + gableY(vb) - 0.08), P3(u, va, yU + gableY(va) - 0.08), GABLE, nrm);
    }
    box(u + s * 0.03, 0, yU + 1.1, yU + 2.1, 0.06, 1.3, GOLD);
    box(u, 0, yE + 1.6, yU, 0.06, bw2, GABLE); // the gable's foot, down to where the skirt meets it
    // the barge ridge follows the roof's edge at the cut, lifting toward the eave
    // (the clip takes the corners away, so the roof has no eave lift at the cut: the ridge just follows the curve)
    const edgeAt = (t, side) => P3(s * cut, side * hd * (1 - t), yU + uh * t ** sh.gamma + 0.12);
    for (const side of [-1, 1]) {
      let prev = null;
      for (let k = 0; k <= 6; k++) { const q = edgeAt(k / 6, side); if (prev) S.beam(prev, q, 0.26, 0.3, RIDGE); prev = q; }
      const e = edgeAt(0, side);
      S.beam(e, [e[0] + s * ux * 0.5, e[1] + 0.55, e[2] + s * uz * 0.5], 0.2, 0.24, RIDGE);
    }
  }

  // the main ridge: a flaming pearl between two dragons
  const ridgeY = yU + uh;
  cyl(0, 0, ridgeY + 0.2, ridgeY + 0.75, 0.3, 0.12, 8, GOLD);
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
