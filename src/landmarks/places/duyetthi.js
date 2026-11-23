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
//    The photo puts the gable's apex lower than the 12 m the sources give (~9 m, the gable foot ~7 m); the height
//    follows the sources until the owner settles it (FOOT and TOP below; docs/places/duyetthi.md).
//  - The photosphere is taken in the gate on the hall's axis in the Tử Cấm Thành's east wall, whose plaque reads
//    閱是門: OSM maps it as a second Duyệt Thị Môn (way 695949056), drawn here from that outline.
// Estimated: the heights inside the 12 m (eave 4.6 m, upper eave 7.6 m, ridge 11.8 m), the plinth, the bay widths,
// the side and back walls (not in any capture: drawn like the front), the finials, the gates' form.

// OSM outlines, metres in the model frame (from the raw extract, data/raw)
const HALL = [[-1116.2, -135.3], [-1085.3, -158.1], [-1098.7, -176.0], [-1129.6, -153.2]]; // roof outline
const GATE = [[-1105.4, -199.2], [-1107.8, -197.3], [-1107.2, -196.6], [-1104.3, -197.8]]; // Duyệt Thị Môn (619851666)
// the axial gate in the Tử Cấm Thành's east wall (OSM 695949056, also named Duyệt Thị Môn): the photosphere's gate.
// Corners in order along the wall (a0 -> a1 on the yard side... b on the outside); the wall itself is places/dainoi.js's
const AXGATE = [[-1062.6, -190.3], [-1059.9, -186.6], [-1058.8, -187.4], [-1061.6, -191.1]];
const WALLS = [
  [[-1107.2, -196.6], [-1142.6, -170.8]],
  [[-1104.8, -198.4], [-1080.8, -216.0], [-1080.4, -215.4]],
];
// the Tử Cấm Thành's east wall crosses the hall's axis this far in front of the hall's centre (places/dainoi.js,
// INNER_ADD east side), and its cap is this wide (hoangthanh.js INNER.capW)
const WALL_U = 57.3, WALL_CAP = 1.05;

// Colours from Google imagery (satellite and a photosphere taken on the axis in front of the hall, 2024): the roof
// reads dark grey-brown from above and grey in the photo, not the yellow glaze of the palace halls round it; the
// walls are yellow stucco with white pilasters, a grey frieze under the eave and a red-brown plinth.
const TILE = hex('#6c6358'), RIDGE = hex('#d6cfbd'), GOLD = hex('#d9b04a');
const STONE = PAL.stone, PAVE = hex('#c9c3b6'), PLINTH = hex('#8c5040'), OCHRE = hex('#d9b45a');
const WALL = hex('#dcc57f'), PIL = hex('#ece5d2'), FRIEZE = hex('#a9aaa2'), BLUE = hex('#3f5f9c'), GABLE = hex('#9c9280');
const MOSAIC = hex('#b8453a'), WHITE = hex('#eeeae0'), CELADON = hex('#6f8f7a'), RECESS = hex('#3b2c26');
const BRONZE = hex('#3f3a33'), DOOR = hex('#7a3426'), COLUMN = hex('#b3ab95');
const gY = (x, z) => LAND_Y + rise(x, z);

// The heights. The sources and the city survey give 12 m; the one photo of the front measures the gable's foot at
// ~7.0 m and its apex at ~9 m above the forecourt (docs/places/duyetthi.md). Until the owner chooses, the sources
// stand: FOOT is the upper roof's eave (the gable's foot), TOP its ridge, both above the forecourt.
const EAVE = 4.6, FOOT = 7.6, TOP = 11.8;

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
  const hip = (u, v, w, d, ya, h, o) => { const q = P(u, v); S.hip(q[0], q[1], w, d, ang, ya, h, TILE, { flare: 0.5, fascia: 0.28, fasciaCol: shade(TILE, 0.6), hips: true, glazed: false, segs: 4, ...o }); };
  const cyl = (u, v, ya, yb, r0, r1, n, col, o) => { const q = P(u, v); S.cyl(q[0], q[1], ya, yb, r0, r1, n, col, { rot: ang, ...o }); };
  // a flat panel on a wall face: n 'u' (front/back, the face at u = off) or 'v' (sides, at v = off), s its outward
  // sign; pts are (a, y) with a along the face (v for 'u' faces, u for 'v' faces)
  const face = (n, s, off) => {
    const at = n === 'u' ? (a, y) => P3(off, a, y) : (a, y) => P3(a, off, y);
    const nrm = n === 'u' ? [s * ux, 0, s * uz] : [-s * uz, 0, s * ux];
    return { at, fan: (pts, col) => { const q = pts.map(([a, y]) => at(a, y)); for (let k = 1; k + 1 < q.length; k++) S.tri(q[0], q[k], q[k + 1], col, nrm); } };
  };
  const ring = (a, y, r, n, rot = 0) => Array.from({ length: n }, (_, k) => [a + r * Math.cos(rot + (k * 2 * Math.PI) / n), y + r * Math.sin(rot + (k * 2 * Math.PI) / n)]);
  // a delicate upturned finial (the little dragons on the ridge ends): a thin S-curve from p, out along (dx, dz)
  const finial = (p, dx, dz, k = 1) => {
    const a = [p[0] + dx * 0.3 * k, p[1] + 0.12 * k, p[2] + dz * 0.3 * k];
    const b = [a[0] + dx * 0.16 * k, a[1] + 0.42 * k, a[2] + dz * 0.16 * k];
    const t = [b[0] - dx * 0.14 * k, b[1] + 0.26 * k, b[2] - dz * 0.14 * k];
    S.beam(p, a, 0.12 * k, 0.12 * k, RIDGE);
    S.beam(a, b, 0.1 * k, 0.1 * k, RIDGE);
    S.beam(b, t, 0.07 * k, 0.07 * k, RIDGE);
    S.beam(a, [a[0] - dx * 0.22 * k, a[1] + 0.28 * k, a[2] - dz * 0.22 * k], 0.05 * k, 0.05 * k, RIDGE); // the fin
  };
  S.base = y0 - LAND_Y;

  // ---- the ground: a stone apron round the hall (the satellite shows garden close up to it on three sides) and
  // the paved forecourt, which runs from the hall's front to the Tử Cấm Thành's east wall and its gate; the bronze
  // cauldron on the axis before a low hedge, a tall lamp post behind it, two bronze figures ----
  const n0 = S.n;
  S.kind = KIND.MASONRY;
  box(0, 0, y0 - 0.25, y0 + 0.07, L + 1.6, W + 1.6, shade(STONE, 0.95));
  const fu0 = L / 2 + 0.8, fu1 = WALL_U - WALL_CAP / 2 - 0.05, fl = fu1 - fu0, fc = (fu0 + fu1) / 2, fw = 28;
  box(fc, 0, y0 - 0.25, y0 + 0.06, fl, fw, PAVE, { topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;
  for (let k = -5; k <= 5; k++) box(fc, k * 2.4, y0 + 0.062, y0 + 0.07, fl, 0.05, shade(PAVE, 0.82)); // paving joints
  for (let u = fu0 + 2.4; u < fu1 - 0.5; u += 2.4) box(u, 0, y0 + 0.062, y0 + 0.07, 0.05, fw, shade(PAVE, 0.82));
  (S.paved = S.paved || []).push([n0, S.n]); // keep trees and houses off the forecourt
  box(L / 2 + 4.2, 0, y0 + 0.06, y0 + 0.75, 1.0, 7.5, hex('#4d6b3a'));
  cyl(L / 2 + 5.6, 0, y0 + 0.06, y0 + 0.5, 0.9, 0.9, 8, shade(STONE, 0.9));
  cyl(L / 2 + 5.6, 0, y0 + 0.5, y0 + 1.5, 0.55, 0.75, 10, BRONZE);
  for (const s of [-1, 1]) { cyl(L / 2 + 6.0, s * 7.2, y0 + 0.06, y0 + 0.75, 0.45, 0.45, 6, shade(STONE, 0.9)); cyl(L / 2 + 6.0, s * 7.2, y0 + 0.75, y0 + 1.7, 0.32, 0.22, 6, BRONZE); }
  // the lamp post on the axis, rising out of the hedge to the gable's height with three lanterns
  const lp = L / 2 + 4.2, lpTop = y0 + 7.3;
  cyl(lp, 0, y0 + 0.75, lpTop, 0.16, 0.11, 8, BRONZE);
  for (let k = 0; k < 4; k++) cyl(lp, 0, y0 + 1.6 + k * 1.4, y0 + 1.8 + k * 1.4, 0.2, 0.2, 8, shade(BRONZE, 1.3)); // carved collars
  for (const v of [-0.75, 0, 0.75]) {
    const q = P(lp, v), top = v ? lpTop - 0.35 : lpTop + 0.1;
    if (v) S.beam(P3(lp, 0, top - 0.1), [q[0], top - 0.1, q[1]], 0.06, 0.06, BRONZE);
    S.cyl(q[0], q[1], top, top + 0.4, 0.17, 0.17, 8, hex('#f1d27a'));
  }

  // ---- the plinth: a low red-brown base, two steps up to the entrance ----
  const pt = 0.4, yp = y0 + pt;
  const wl = L - 2.4, ww = W - 2.4; // the outer walls stand 1.2 m inside the eave line
  S.kind = KIND.MASONRY;
  box(0, 0, y0 - 0.3, yp, wl + 0.8, ww + 0.8, PLINTH, { topKind: KIND.ROAD });
  for (let k = 1; k <= 2; k++) box(wl / 2 + 0.4 + 0.34 * (k - 0.5), 0, y0 - 0.2, yp - (pt / 2.4) * k, 0.34, 8.4, shade(STONE, 1.04), { topKind: KIND.ROAD });

  // ---- the walls: yellow stucco to the eave; at the front a deep open portico three openings wide ----
  const yE = y0 + EAVE;
  const pw = 8.6, pd = 3.2, sideW = ww / 2 - pw / 2;
  S.kind = KIND.PLAIN; // smooth stucco
  box(-pd / 2, 0, yp, yE, wl - pd, ww, WALL, { top: shade(TILE, 0.8) });
  for (const s of [-1, 1]) box(wl / 2 - pd / 2, s * (pw / 2 + sideW / 2), yp, yE, pd, sideW, WALL, { top: shade(TILE, 0.8) });
  box(wl / 2 - pd / 2, 0, yE - 0.95, yE, pd, pw, FRIEZE, { bottom: true }); // the lintel over the portico, its soffit the recess's ceiling
  box(0, 0, yE - 0.95, yE - 0.15, wl + 0.08, ww + 0.08, FRIEZE); // the frieze band under the eave
  // the portico: a dark back wall (the doors stand open) with display boards before it, two slim carved columns
  // between the openings (the middle opening about twice the side ones), white pilasters either side
  box(wl / 2 - pd + 0.03, 0, yp + 0.02, yE - 0.95, 0.06, pw, RECESS);
  for (const [v, w] of [[-3.3, 0.9], [-2.3, 0.9], [2.4, 0.9], [3.4, 0.7]]) box(wl / 2 - pd + 0.5, v, yp + 0.25, yp + 1.75, 0.05, w, WHITE);
  for (const s of [-1, 1]) {
    cyl(wl / 2 - 0.4, s * 1.9, yp, yE - 0.95, 0.19, 0.17, 10, COLUMN, { cap: false });
    for (let k = 0; k < 5; k++) cyl(wl / 2 - 0.4, s * 1.9, yp + 0.5 + k * 0.62, yp + 0.62 + k * 0.62, 0.205, 0.205, 10, shade(COLUMN, 0.62), { cap: false }); // the carved coils
    cyl(wl / 2 - 0.4, s * 1.9, yp, yp + 0.3, 0.27, 0.27, 10, shade(STONE, 0.9));
  }
  // the bay lines: four bays and two end bays (chái) down each side
  const chai = 5.6, gian = (wl - 2 * chai) / 4;
  const xs = [-wl / 2, -wl / 2 + chai]; for (let i = 1; i <= 4; i++) xs.push(-wl / 2 + chai + i * gian);
  // a square window: a white frame round a blue field, a white lattice (a square and a diamond) and a white roundel
  // with a blue heart, as the photo shows; n the face axis, s its outward sign, off the wall face, a along the face
  const medal = (n, s, off, a) => {
    const dims = (w, t) => (n === 'v' ? [w, t] : [t, w]);
    const q = n === 'v' ? [a, off + s * 0.02] : [off + s * 0.02, a];
    const [fu, fv] = dims(1.95, 0.1), [bu, bv] = dims(1.7, 0.14);
    box(q[0], q[1], yp + 1.05, yp + 2.95, fu, fv, PIL);
    box(q[0], q[1], yp + 1.15, yp + 2.85, bu, bv, BLUE);
    const F = face(n, s, off + s * 0.1), yc = yp + 2.0, bar = (pts) => F.fan(pts, WHITE);
    for (const [r, k] of [[0.6, 0], [0.82, 1]]) { // the square ring, then the diamond
      const o = ring(a, yc, r * (k ? 1 : Math.SQRT2), 4, k ? 0 : Math.PI / 4), i = ring(a, yc, (r - 0.06) * (k ? 1 : Math.SQRT2), 4, k ? 0 : Math.PI / 4);
      for (let m = 0; m < 4; m++) bar([o[m], o[(m + 1) % 4], i[(m + 1) % 4], i[m]]);
    }
    F.fan(ring(a, yc, 0.34, 10), WHITE);
    face(n, s, off + s * 0.105).fan(ring(a, yc, 0.2, 10), shade(BLUE, 0.85));
  };
  for (let i = 0; i + 1 < xs.length; i++) for (const s of [-1, 1]) medal('v', s, s * ww / 2, (xs[i] + xs[i + 1]) / 2);
  for (const x of xs) for (const s of [-1, 1]) box(x, s * (ww / 2 + 0.06), yp, yE - 0.95, 0.6, 0.14, PIL);
  for (const s of [-1, 1]) {
    medal('u', 1, wl / 2, s * (pw / 2 + sideW / 2));
    medal('u', -1, -wl / 2, s * (pw / 2 + sideW / 2));
    for (const v of [ww / 2 - 0.3, pw / 2 + 0.3]) box(wl / 2 + 0.06, s * v, yp, yE - 0.95, 0.14, 0.6, PIL);
    box(-wl / 2 - 0.06, s * (ww / 2 - 0.3), yp, yE - 0.95, 0.14, 0.6, PIL);
  }
  box(-wl / 2 - 0.03, 0, yp + 0.05, yp + 2.9, 0.08, 2.2, shade(DOOR, 0.7)); // the back door, where the gallery joins
  // framed panels in the frieze across the front
  for (let i = -3; i <= 3; i++) box(wl / 2 + 0.06, i * 2.6, yE - 0.8, yE - 0.3, 0.06, 2.0, shade(FRIEZE, 0.6));

  // ---- lower roof: the skirt round the whole hall, rising to meet the upper roof's eave (the photo shows no
  // clerestory band between them at the front: the gable stands straight on the skirt). Its hip ridges are thin and
  // end at the corners in small upturned dragon finials, drawn here rather than the roof's own heavy horns ----
  const so = 1.2, sf = 0.35, sh0 = 4.8;
  hip(0, 0, wl, ww, yE, sh0, { fasciaCol: shade(BLUE, 0.75), over: so, flare: sf, hips: false, ridgeCol: null, segs: 3 });
  const bl = 26, bw2 = 8, uo = 1.0, cut = bl / 2 + 0.55;
  {
    const sk = hipShape(wl + 2 * so, ww + 2 * so, sf, false, null, 3);
    const hipAt = (su, sv, t) => P3(su * (sk.hw + (sk.rl - sk.hw) * t), sv * sk.hd * (1 - t), yE + sh0 * t ** sk.gamma + sf * (1 - t) ** 2 + 0.1);
    const tEnd = (sk.hw - bl / 2) / (sk.hw - sk.rl); // where the hip ridge meets the gable's foot
    for (const su of [-1, 1]) for (const sv of [-1, 1]) {
      let prev = null;
      for (let k = 0; k <= 6; k++) { const q = hipAt(su, sv, (tEnd * k) / 6); if (prev) S.beam(prev, q, 0.16, 0.2, RIDGE); prev = q; }
      const e = hipAt(su, sv, 0), dl = Math.hypot(su * sk.hw, sv * sk.hd);
      const du = (su * sk.hw) / dl, dv = (sv * sk.hd) / dl;
      finial(e, du * ux - dv * uz, du * uz + dv * ux);
    }
  }

  // ---- upper storey: the inner hall's walls (hidden by the skirt), then the main roof, gabled at both ends ----
  // From above the upper roof runs ~27 m between its gable ends and ~10 m across its eaves, set ~5.6 m inside
  // the skirt's eave all round; its ridge runs to the gables (no hips), and the front gable faces the entrance.
  // The slope is nearly straight (the photo shows a plain low pediment, not a swept, peaked one).
  const yU = y0 + FOOT, uh = TOP - FOOT, uf = 0.15;
  S.kind = KIND.TIMBER;
  box(0, 0, yE, yU - 0.4, bl, bw2 - 0.8, shade(WALL, 0.9), { top: shade(TILE, 0.8) }); // kept under the skirt where it meets the gables
  S.kind = KIND.PLAIN;
  // a long hip cut back to the gables (the clip keeps its ridge running out to the cut)
  const Lh = 36;
  hip(0, 0, Lh, bw2, yU, uh, { over: uo, flare: uf, ridgeCol: RIDGE, hips: false, clip: { u0: -cut, u1: cut } });
  // the gables: the tympanum under the roof's slope, faced in porcelain mosaic (shards of white, blue, red, gold and
  // celadon set in a grey ground) inside a blue border; a decorated blue band along the foot, down to the skirt;
  // slim barge ridges (bờ quyết) with a small finial at each foot
  const sh = hipShape(Lh + 2 * uo, bw2 + 2 * uo, uf, false, RIDGE, 4), hd = sh.hd;
  const gableY = (v) => uh * Math.max(0, 1 - Math.abs(v) / hd) ** sh.gamma;
  const SHARDS = [WHITE, BLUE, MOSAIC, GOLD, CELADON, WHITE, shade(BLUE, 1.3)];
  for (const s of [-1, 1]) {
    const nrm = [s * ux, 0, s * uz], u = s * (bl / 2 + 0.02), n = 8;
    for (let k = 0; k < n; k++) {
      const va = -bw2 / 2 + (bw2 * k) / n, vb = -bw2 / 2 + (bw2 * (k + 1)) / n;
      S.quad(P3(u, va, yU), P3(u, vb, yU), P3(u, vb, yU + gableY(vb) - 0.08), P3(u, va, yU + gableY(va) - 0.08), GABLE, nrm);
    }
    const F = face('u', s, u + s * 0.03), G = face('u', s, u + s * 0.05);
    // the blue border along the rakes
    for (const side of [-1, 1]) for (let k = 0; k < 6; k++) {
      const va = side * (bw2 / 2) * (k / 6), vb = side * (bw2 / 2) * ((k + 1) / 6);
      F.fan([[va, yU + gableY(va) - 0.1], [vb, yU + gableY(vb) - 0.1], [vb, yU + gableY(vb) - 0.38], [va, yU + gableY(va) - 0.38]], BLUE);
    }
    // the mosaic: small lozenges on a 0.45 m grid, kept inside the border
    let h = 7;
    for (let y = yU + 0.6; y < yU + uh - 0.5; y += 0.45) for (let v = -bw2 / 2 + 0.4; v <= bw2 / 2 - 0.4; v += 0.45) {
      const vv = v + (Math.round((y - yU) / 0.45) % 2) * 0.225;
      if (y + 0.25 > yU + gableY(Math.abs(vv) + 0.2) - 0.45) continue;
      h = (h * 1103515245 + 12345) & 0x7fffffff;
      G.fan([[vv, y - 0.17], [vv + 0.17, y], [vv, y + 0.17], [vv - 0.17, y]], SHARDS[h % SHARDS.length]);
    }
    // the medallion at the tympanum's heart
    face('u', s, u + s * 0.06).fan(ring(0, yU + uh * 0.42, 0.62, 12), GOLD);
    face('u', s, u + s * 0.07).fan(ring(0, yU + uh * 0.42, 0.42, 12), MOSAIC);
    // the band at the gable's foot, from the skirt up to the tympanum: blue, with light panels
    box(u, 0, yE + 1.6, yU, 0.06, bw2, shade(BLUE, 0.8));
    for (let k = -3; k <= 3; k++) box(u + s * 0.02, k * 1.05, yU - 0.5, yU - 0.12, 0.04, 0.8, k % 2 ? WHITE : GOLD);
    box(u + s * 0.02, 0, yU + 0.02, yU + 0.3, 0.05, bw2 * 0.95, BLUE);
    // the barge ridge follows the roof's edge at the cut (the clip takes the corners away, so the roof has no eave
    // lift there: the ridge just follows the slope), and ends at the foot in a small finial
    const edgeAt = (t, side) => P3(s * cut, side * hd * (1 - t), yU + uh * t ** sh.gamma + 0.1);
    for (const side of [-1, 1]) {
      let prev = null;
      for (let k = 0; k <= 6; k++) { const q = edgeAt(k / 6, side); if (prev) S.beam(prev, q, 0.16, 0.2, RIDGE); prev = q; }
      const e = edgeAt(0, side), dl = Math.SQRT2;
      finial(e, (s * ux - side * uz) / dl, (s * uz + side * ux) / dl, 0.8);
    }
  }

  // the main ridge: a flaming pearl between two small dragons
  const ridgeY = yU + uh;
  cyl(0, 0, ridgeY + 0.15, ridgeY + 0.5, 0.2, 0.08, 8, GOLD);
  for (const s of [-1, 1]) { const a = P(s * 0.5, 0); finial([a[0], ridgeY + 0.15, a[1]], s * ux, s * uz, 0.9); }
  // the ridge ends at the gables carry a small figure each
  for (const s of [-1, 1]) { const a = P(s * (cut - 0.3), 0); finial([a[0], ridgeY + 0.15, a[1]], -s * ux, -s * uz, 0.7); }

  // ---- Duyệt Thị Môn, the small gate in the yard's north wall: one doorway under a yellow-tiled roof ----
  {
    const o = obb(GATE), yg = gY(o.c[0], o.c[1]);
    S.base = yg - LAND_Y;
    S.kind = KIND.MASONRY;
    S.box(o.c[0], o.c[1], yg - 0.3, yg + 3.4, o.w + 0.4, o.d + 0.4, o.a, OCHRE, { top: shade(TILE, 0.8) });
    S.kind = KIND.PLAIN;
    const across = o.w >= o.d; // the doorway runs through the gate's short side
    S.box(o.c[0], o.c[1], yg, yg + 2.5, across ? 1.5 : o.w + 0.5, across ? o.d + 0.5 : 1.5, o.a, hex('#3a2420'));
    S.hip(o.c[0], o.c[1], o.w + 0.4, o.d + 0.4, o.a, yg + 3.4, 1.0, TILE, { flare: 0.3, over: 0.55, fascia: 0.2, fasciaCol: shade(PAL.lacquer, 0.7), ridgeCol: RIDGE, hips: true, glazed: true, segs: 3 });
  }

  // ---- the axial gate in the Tử Cấm Thành's east wall (OSM 695949056), as the photosphere shows its outer face:
  // two yellow pillars trimmed in blue either side of a 3 m opening, a lintel with the gate's name on a grey plaque,
  // a blue-tiled crest on top; red-brown leaves. The wall it stands in is places/dainoi.js's and still runs through
  // the opening, so the leaves are drawn shut on both faces of it (the photo has them open); the pillars stand
  // through the wall and everything above the wall's cap keeps off it, one half on each face ----
  {
    const [a0, a1, b1] = AXGATE, len = Math.hypot(a1[0] - a0[0], a1[1] - a0[1]);
    const tx = (a1[0] - a0[0]) / len, tz = (a1[1] - a0[1]) / len, dep = Math.hypot(b1[0] - a1[0], b1[1] - a1[1]);
    const gc = AXGATE.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4], [0, 0]);
    const ga = Math.atan2(tz, tx), nx = -tz, nz = tx; // s along the wall, r across it
    const G = (s, r) => [gc[0] + s * tx + r * nx, gc[1] + s * tz + r * nz];
    const gbox = (s, r, ya, yb, w, d, col, o) => { const q = G(s, r); S.box(q[0], q[1], ya, yb, w, d, ga, col, o); };
    const yg = gY(gc[0], gc[1]), pwid = 0.7, open = len - 2 * pwid, ps = len / 2 - pwid / 2;
    // the wall's centre line runs WALL_R off the outline's (measured in the built scene: the cap spans r -0.82..0.22),
    // so the yard-side half of the gate is carried a little past the mapped outline, clear of the cap
    const WALL_R = -0.3, half = WALL_CAP / 2 + 0.02;
    const side = (rs) => { const ri = WALL_R + rs * half, ro = rs * Math.max(dep / 2, Math.abs(ri) + 0.3); return { ri, ro, d: Math.abs(ro - ri), m: (ri + ro) / 2 }; };
    S.base = yg - LAND_Y;
    S.kind = KIND.MASONRY;
    for (const sg of [-1, 1]) {
      gbox(sg * ps, WALL_R, yg - 0.2, yg + 4.9, pwid, dep, OCHRE, { top: shade(OCHRE, 0.9) });
      for (const rs of [-1, 1]) for (const e of [-1, 1]) gbox(sg * ps + e * (pwid / 2 - 0.08), WALL_R + rs * (dep / 2 + 0.01), yg + 0.4, yg + 4.6, 0.1, 0.03, BLUE);
    }
    S.kind = KIND.PLAIN;
    for (const rs of [-1, 1]) {
      const { ro, d, m } = side(rs), wf = WALL_R + rs * 0.36; // wf: the wall's face
      gbox(0, wf + rs * 0.03, yg, yg + 3.25, open, 0.05, DOOR); // the shut leaves on the wall's face
      for (const k of [-1, 1]) gbox(k * open * 0.25, wf + rs * 0.065, yg + 0.3, yg + 3.0, open * 0.4, 0.02, shade(DOOR, 0.82));
      gbox(0, m, yg + 3.3, yg + 4.5, open, d, OCHRE); // the lintel
      gbox(0, ro + rs * 0.015, yg + 3.55, yg + 4.25, open * 0.62, 0.03, hex('#8d8f8a')); // the plaque
      gbox(0, m + rs * 0.125, yg + 4.5, yg + 4.75, len + 0.3, d + 0.25, BLUE); // the blue-tiled band
      gbox(0, m + rs * 0.2, yg + 4.75, yg + 4.95, len + 0.5, d + 0.4, shade(TILE, 0.9));
    }
    for (const sg of [-1, 1]) for (const rs of [-1, 1]) { // a small finial on each corner of the crest
      const q = G(sg * (len / 2 + 0.2), side(rs).ro + rs * 0.15);
      finial([q[0], yg + 4.95, q[1]], sg * tx + rs * nx * 0.3, sg * tz + rs * nz * 0.3, 0.6);
    }
  }

  // ---- the yard wall either side of the north gate ----
  S.base = 0;
  for (const w of WALLS) fence(S, w, FENCE.imperial, { closed: false });
  S.kind = KIND.PLAIN;
  S.base = 0;
}
