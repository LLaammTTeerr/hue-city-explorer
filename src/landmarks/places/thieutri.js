import { KIND, hex, shade, obb } from '../../geo/buf.js';
import { LAND_Y, POND_Y, PAL } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { pavilion } from '../citadel.js';

// Lăng Thiệu Trị (Xương Lăng), the tomb of Emperor Thiệu Trị, built 1847-48 at Cư Chánh, as it stands in 2026.
// Sources and estimates: docs/places/thieutri.md.
//
// Two parallel axes facing north-west, about 100-150 m apart, and no La Thành: the hills are the enclosure.
//  - Tẩm (temple, left axis): brick screen → hồ Điện (half-moon, 2,400 m²) → marble nghi môn with pháp lam enamel
//    → sân tế in three tiers with a stone walk → Hồng Trạch môn in a rectangular brick wall with gates on all four
//    sides → Đông / Tây Phối điện → điện Biểu Đức (23.4 x 21.5 m, a double hall, trùng thiềm roof) flanked behind by
//    Tả / Hữu Tòng viện → arched brick gate in the back wall.
//  - Lăng (tomb, right axis): hồ Nhuận Trạch (half-moon) → bronze nghi môn (long vân đồng trụ) → sân chầu (Bái
//    Đình) with elephants, horses and mandarins → Bi Đình on a 2.65 m platform → Đức Hinh lâu, a ruin: only its
//    18.5 x 18.5 m base on a low hill and the two brick trụ biểu either side → hồ Ngưng Thúy (half-moon) crossed by
//    three bridges (Tây Định, Chánh Trung, Đông Hòa) → the round Bửu Thành (260 m round) with its bronze gate, the
//    grave mound and pines inside.
// Plan positions are the OSM outlines (ways listed below) in metres from the site centre; the lakes themselves are
// water data, drawn elsewhere.
export const id = 'thieutri';

const C0 = [-1740, 5750]; // site centre (scripts/build-data.mjs SITE_DEFS), metres
const L = (p) => [C0[0] + p[0], C0[1] + p[1]];
// OSM building outlines (bing traced), metres from C0
const RING = {
  bieuDuc: [[-74.2, 44.1], [-57.7, 25.5], [-40.8, 40.3], [-57.3, 58.9]], // 264285105
  hongTrach: [[-81.8, 14.7], [-89, 22.8], [-95.2, 17.3], [-88.1, 9.2]], // 264285107
  phoiA: [[-60.6, 19.6], [-74.5, 7.5], [-66.7, -1.4], [-52.8, 10.8]], // 264285108
  phoiB: [[-94.7, 29.5], [-80.7, 41.7], [-88.1, 50], [-102.1, 37.8]], // 264285106
  tongA: [[-35, 27.2], [-24.1, 36.7], [-31.7, 45.3], [-42.6, 35.7]], // 264285104
  tongB: [[-51, 69.6], [-57.4, 76.8], [-69.6, 66.1], [-63.2, 59]], // 264285109
  biDinh: [[-11.4, -106.3], [-4.2, -116.3], [6.6, -108.9], [-0.5, -99.5]], // 1075011937
  ducHinh: [[15.2, -83.3], [24.4, -97.2], [40.4, -87.3], [30.7, -73.9]], // 1075011938
};
const box2 = (r) => obb(r.map(L));

const COL = {
  roof: PAL.imperialRoof, roofOld: hex('#b8913f'), lac: hex('#8e3628'), lacOld: hex('#74402f'),
  stone: PAL.stone, stoneGrey: hex('#9d998f'), stoneDark: hex('#7b776e'), thanh: hex('#6c7377'), marble: hex('#ddd8cc'),
  brick: hex('#6b6152'), brickMoss: hex('#5c6049'), cap: hex('#77746a'), bat: hex('#a5775c'), // Bát Tràng brick paving
  bronze: hex('#4d3f2c'), bronzeHi: hex('#8a7040'), door: hex('#2b2422'), statue: hex('#a29d92'),
  enamel: [hex('#2f7d8c'), hex('#3f8f4f'), hex('#e0b23a')], moss: PAL.moss, pine: hex('#3d5734'), earth: hex('#6f6a4b'),
};
const RIDGE = hex('#f1d77a');

// ---------- helpers ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const gY = (x, z) => LAND_Y + rise(x, z);
// an axis: s along u (toward the back of the axis), t to its side (u turned +90° in x/z)
function frame(o, ang) {
  const ux = Math.cos(ang), uz = Math.sin(ang);
  return { o, ux, uz, a: ang, av: ang + Math.PI / 2, at: (s, t = 0) => [o[0] + ux * s - uz * t, o[1] + uz * s + ux * t],
    s: (p) => (p[0] - o[0]) * ux + (p[1] - o[1]) * uz, t: (p) => -(p[0] - o[0]) * uz + (p[1] - o[1]) * ux };
}
// lowest / highest ground under an oriented rectangle (sampled every few metres)
function span(F, s, t, ls, lt) {
  let lo = Infinity, hi = -Infinity;
  const ns = clamp(Math.ceil(ls / 4), 1, 24), nt = clamp(Math.ceil(lt / 4), 1, 24);
  for (let i = 0; i <= ns; i++) for (let j = 0; j <= nt; j++) {
    const p = F.at(s - ls / 2 + (ls * i) / ns, t - lt / 2 + (lt * j) / nt), y = gY(p[0], p[1]);
    lo = Math.min(lo, y); hi = Math.max(hi, y);
  }
  return { lo, hi };
}
// a level platform (centre s, t in frame F; ls along the axis, lt across it) up to `top`
function terrace(S, F, s, t, ls, lt, top, col = COL.stone, topCol = null) {
  const { lo } = span(F, s, t, ls, lt), p = F.at(s, t);
  S.kind = KIND.MASONRY; S.base = lo - 0.8 - LAND_Y;
  S.box(p[0], p[1], lo - 0.8, Math.max(top, lo - 0.5), ls, lt, F.a, col, { top: topCol || shade(col, 1.06), topKind: KIND.ROAD });
  return top;
}
// a flight of steps from p0 (y0) up to p1 (y1), w wide, each step bedded on its own ground
function flight(S, p0, y0, p1, y1, w, col = COL.stone, cheeks = true) {
  if (y1 < y0) { [p0, p1] = [p1, p0]; [y0, y1] = [y1, y0]; }
  const dx = p1[0] - p0[0], dz = p1[1] - p0[1], len = Math.hypot(dx, dz);
  if (len < 0.3 || y1 - y0 < 0.05) return;
  const a = Math.atan2(dz, dx), n = clamp(Math.round((y1 - y0) / 0.17), 1, Math.max(1, Math.floor(len / 0.26)));
  S.kind = KIND.MASONRY;
  for (let k = 0; k < n; k++) {
    const f = (k + 0.5) / n, cx = p0[0] + dx * f, cz = p0[1] + dz * f, top = y0 + ((y1 - y0) * (k + 1)) / n;
    const lo = gY(cx, cz) - 0.6;
    S.base = lo - LAND_Y;
    S.box(cx, cz, Math.min(lo, top - 0.3), top, len / n + 0.02, w, a, shade(col, 1.04), { topKind: KIND.ROAD });
  }
  if (cheeks) {
    const ux = dx / len, uz = dz / len;
    for (const sd of [-1, 1]) {
      const ox = -uz * sd * (w / 2 + 0.22), oz = ux * sd * (w / 2 + 0.22);
      S.beam([p0[0] + ox, y0 + 0.3, p0[1] + oz], [p1[0] + ox, y1 + 0.3, p1[1] + oz], 0.44, 0.6, shade(col, 0.9));
    }
  }
}
// a wall from p to q, cut into short runs that each stand on their own ground
function wallRun(S, p, q, h, th, col = COL.brickMoss, cap = COL.cap, maxSeg = 7) {
  const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
  if (len < 0.2) return;
  const ang = Math.atan2(q[1] - p[1], q[0] - p[0]), n = Math.ceil(len / maxSeg);
  S.kind = KIND.MASONRY;
  for (let k = 0; k < n; k++) {
    const a = [p[0] + ((q[0] - p[0]) * k) / n, p[1] + ((q[1] - p[1]) * k) / n], b = [p[0] + ((q[0] - p[0]) * (k + 1)) / n, p[1] + ((q[1] - p[1]) * (k + 1)) / n];
    const g = [gY(a[0], a[1]), gY(b[0], b[1]), gY((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)];
    const lo = Math.min(...g) - 0.6, hi = Math.max(...g) + h;
    S.base = lo - LAND_Y;
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    S.box(m[0], m[1], lo, hi, len / n + th * 0.5, th, ang, col, { top: cap });
    S.box(m[0], m[1], hi, hi + 0.18, len / n + th * 0.5, th + 0.2, ang, cap); // the coping
  }
}
// a wall along a frame line from (s0, t0) to (s1, t1), leaving gaps given as [from, to] fractions
function wallLine(S, F, s0, t0, s1, t1, h, th, gaps = [], col) {
  let f = 0;
  for (const [g0, g1] of [...gaps, [1, 1]]) {
    if (g0 > f) wallRun(S, F.at(s0 + (s1 - s0) * f, t0 + (t1 - t0) * f), F.at(s0 + (s1 - s0) * g0, t0 + (t1 - t0) * g0), h, th, col);
    f = g1;
  }
}
// a small brick gate with one arched doorway (side and back gates of the temple wall); a = angle of the wall line
function archGate(S, p, a, w, d, h, roof = COL.roofOld) {
  const g = gY(p[0], p[1]);
  S.kind = KIND.MASONRY; S.base = g - 0.6 - LAND_Y;
  S.box(p[0], p[1], g - 0.6, g + h, w, d, a, COL.brickMoss, { top: COL.cap });
  S.kind = KIND.PLAIN;
  const ow = Math.min(1.8, w * 0.42), oh = h * 0.62;
  S.box(p[0], p[1], g, g + oh, ow, d + 0.1, a, COL.door);
  S.box(p[0], p[1], g + oh, g + oh + ow * 0.32, ow * 0.7, d + 0.1, a, COL.door, { taper: 0.6 });
  S.hip(p[0], p[1], w + 0.4, d + 0.3, a, g + h, 0.9, roof, { flare: 0.25, over: 0.5, fascia: 0.18, ridgeCol: RIDGE, hips: true, glazed: true });
}
// timber hall on a stone plinth (the mapped outline is the plinth), long side found from the outline
function hall(S, r, { plinth = 0.6, tiers = 1, wallH = 3.2, rh = 2.2, roof = COL.roofOld, wall = COL.lacOld, inset = 1.0, colonnade = true, floor = null } = {}) {
  let { c, w, d, a } = box2(r);
  if (w < d) { [w, d] = [d, w]; a += Math.PI / 2; }
  const F = frame(c, a), sp = span(F, 0, 0, w, d), top = floor ?? sp.hi + plinth;
  terrace(S, F, 0, 0, w, d, top);
  return { top: pavilion(S, c[0], c[1], w - inset * 2, d - inset * 2, a, top, { tiers, wallH, rh, roof, wall, over: 1.1, colonnade, segs: 3 }), F, w, d, floor: top };
}
// stone statues facing the axis: mandarins, elephants, horses
function mandarin(S, p, a, military = false) {
  const g = gY(p[0], p[1]), ux = Math.cos(a), uz = Math.sin(a), c = COL.statue;
  S.kind = KIND.MASONRY; S.base = g - LAND_Y;
  S.box(p[0], p[1], g - 0.3, g + 0.35, 0.95, 0.8, a, shade(c, 0.9));
  S.box(p[0], p[1], g + 0.35, g + 1.75, 0.62, 0.5, a, c, { taper: 0.82 }); // robe
  S.box(p[0] + ux * 0.18, p[1] + uz * 0.18, g + 1.15, g + 1.45, 0.25, 0.42, a, shade(c, 0.94)); // hands and hốt
  S.box(p[0], p[1], g + 1.75, g + 2.05, 0.3, 0.3, a, shade(c, 0.97)); // head
  S.box(p[0], p[1], g + 2.05, g + 2.22, military ? 0.42 : 0.34, military ? 0.42 : 0.52, a, shade(c, 0.85)); // hat
}
function beast(S, p, a, elephant) {
  const g = gY(p[0], p[1]), ux = Math.cos(a), uz = Math.sin(a), vx = -uz, vz = ux, c = COL.statue;
  S.kind = KIND.MASONRY; S.base = g - LAND_Y;
  S.box(p[0], p[1], g - 0.3, g + 0.25, elephant ? 2.9 : 2.2, elephant ? 1.5 : 0.9, a, shade(c, 0.9)); // plinth
  const L4 = elephant ? [0.85, 0.42] : [0.65, 0.22], lh = elephant ? 0.95 : 0.85;
  for (const i of [-1, 1]) for (const j of [-1, 1]) S.box(p[0] + ux * i * L4[0] + vx * j * L4[1], p[1] + uz * i * L4[0] + vz * j * L4[1], g + 0.25, g + 0.25 + lh, elephant ? 0.42 : 0.2, elephant ? 0.42 : 0.2, a, c);
  if (elephant) {
    S.box(p[0], p[1], g + 1.2, g + 2.3, 2.3, 1.25, a, c);
    S.box(p[0] + ux * 1.3, p[1] + uz * 1.3, g + 1.5, g + 2.45, 0.7, 1.05, a, shade(c, 0.96)); // head and ears
    S.beam([p[0] + ux * 1.65, g + 1.7, p[1] + uz * 1.65], [p[0] + ux * 1.8, g + 0.35, p[1] + uz * 1.8], 0.28, 0.28, shade(c, 0.94)); // trunk
    S.box(p[0], p[1], g + 2.3, g + 2.5, 1.2, 1.1, a, shade(c, 0.88)); // saddle cloth
  } else {
    S.box(p[0], p[1], g + 1.1, g + 1.65, 1.6, 0.5, a, c);
    S.beam([p[0] + ux * 0.7, g + 1.5, p[1] + uz * 0.7], [p[0] + ux * 1.05, g + 2.15, p[1] + uz * 1.05], 0.32, 0.4, shade(c, 0.95)); // neck
    S.box(p[0] + ux * 1.2, p[1] + uz * 1.2, g + 1.95, g + 2.25, 0.5, 0.26, a, shade(c, 0.95)); // head
    S.box(p[0], p[1], g + 1.65, g + 1.8, 0.6, 0.6, a, shade(c, 0.86)); // saddle
  }
}
// a cone pine
function pine(S, x, z, h = 7, y = null) {
  const g = y ?? gY(x, z);
  S.kind = KIND.PLAIN; S.base = g - LAND_Y;
  S.cyl(x, z, g - 0.2, g + h * 0.3, 0.18, 0.15, 5, hex('#4a3b2e'), { cap: false });
  S.cyl(x, z, g + h * 0.22, g + h * 0.72, h * 0.22, h * 0.1, 7, COL.pine, { cap: false });
  S.cyl(x, z, g + h * 0.55, g + h, h * 0.16, 0, 7, shade(COL.pine, 1.08), { cap: false });
}
// a bridge deck from p0 to p1 (each end on its bank), low arch, stone railings and piers in the water
function bridge(S, p0, p1, w, col = COL.stone, arch = 0.7) {
  const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
  if (len < 1) return;
  const y0 = gY(p0[0], p0[1]) + 0.2, y1 = gY(p1[0], p1[1]) + 0.2, ym = Math.max(y0, y1) + arch;
  const P = (f) => [p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f];
  const yAt = (f) => y0 + (y1 - y0) * f + (ym - (y0 + y1) / 2) * Math.pow(Math.sin(Math.PI * f), 0.6);
  const N = clamp(Math.round(len / 2.5), 4, 16), ux = (p1[0] - p0[0]) / len, uz = (p1[1] - p0[1]) / len, a = Math.atan2(uz, ux);
  S.kind = KIND.MASONRY; S.base = 0;
  for (let i = 0; i < N; i++) {
    const fa = i / N, fb = (i + 1) / N, A = P(fa), B = P(fb), ya = yAt(fa), yb = yAt(fb);
    S.beam([A[0], ya - 0.35, A[1]], [B[0], yb - 0.35, B[1]], w, 0.7, col);
    for (const sd of [-1, 1]) {
      const ox = -uz * sd * (w / 2 - 0.12), oz = ux * sd * (w / 2 - 0.12);
      S.beam([A[0] + ox, ya + 0.32, A[1] + oz], [B[0] + ox, yb + 0.32, B[1] + oz], 0.22, 0.6, shade(col, 0.9));
    }
  }
  const np = Math.max(1, Math.round(len / 7));
  for (let k = 1; k <= np; k++) { const f = k / (np + 1), p = P(f); S.box(p[0], p[1], POND_Y - 1, yAt(f) - 0.6, 1.0, w * 0.95, a, shade(col, 0.82)); }
  // newel posts at the four ends
  for (const f of [0, 1]) for (const sd of [-1, 1]) { const p = P(f), y = yAt(f); S.box(p[0] - uz * sd * (w / 2 - 0.12), p[1] + ux * sd * (w / 2 - 0.12), y - 0.4, y + 1.1, 0.4, 0.4, a, shade(col, 0.95)); }
}
// a paved walk along a frame line, laid on the ground
function walk(S, F, s0, s1, t, w, col = COL.thanh) {
  const n = Math.max(1, Math.ceil((s1 - s0) / 6));
  S.kind = KIND.ROAD;
  for (let k = 0; k < n; k++) {
    const sa = s0 + ((s1 - s0) * k) / n, sb = s0 + ((s1 - s0) * (k + 1)) / n, m = (sa + sb) / 2, { lo, hi } = span(F, m, t, sb - sa, w), p = F.at(m, t);
    S.base = lo - LAND_Y;
    S.box(p[0], p[1], lo - 0.4, hi + 0.08, sb - sa + 0.05, w, F.a, col, { topKind: KIND.ROAD });
  }
}

// =====================================================================================================
export function build({ S }) {
  (S.paved = S.paved || []);
  temple(S);
  tomb(S);
  S.kind = KIND.PLAIN; S.base = 0;
}

// ---------- Tẩm: the Biểu Đức temple axis ----------
function temple(S) {
  const htm = box2(RING.hongTrach), bd = box2(RING.bieuDuc);
  const Q = frame(htm.c, Math.atan2(bd.c[1] - htm.c[1], bd.c[0] - htm.c[0]));
  // the front: brick screen beyond the lake, the marble gate, the three-tier sân tế
  {
    const p = Q.at(-101), g = gY(p[0], p[1]);
    S.kind = KIND.MASONRY; S.base = g - 0.6 - LAND_Y;
    S.box(p[0], p[1], g - 0.6, g + 2.6, 0.8, 9.5, Q.a, COL.brickMoss, { top: COL.cap });
    S.box(p[0], p[1], g + 2.6, g + 2.85, 1.1, 10.1, Q.a, COL.cap);
    for (const sd of [-1, 1]) { const q = Q.at(-101 + sd * 0.42); S.box(q[0], q[1], g + 0.5, g + 2.2, 0.06, 6.0, Q.a, shade(COL.brickMoss, 0.75)); }
  }
  const n0 = S.n;
  const tiers = [[-50, -37], [-37, -22], [-22, -5.5]];
  let yPrev = null;
  for (let k = 0; k < tiers.length; k++) {
    const [a, b] = tiers[k], m = (a + b) / 2, { hi } = span(Q, m, 0, b - a, 30), top = Math.max(hi + 0.15, (yPrev ?? -Infinity) + 0.45);
    terrace(S, Q, m, 0, b - a, 30, top, COL.stone, COL.bat);
    // the Thanh stone walk up the middle
    const p = Q.at(m); S.kind = KIND.ROAD; S.box(p[0], p[1], top - 0.1, top + 0.04, b - a, 3.2, Q.a, COL.thanh, { topKind: KIND.ROAD });
    if (yPrev != null) flight(S, Q.at(a - 1.6), yPrev, Q.at(a + 0.2), top, 4.2);
    yPrev = top;
  }
  const yTe = yPrev;
  { const g = Q.at(-50); flight(S, Q.at(-52.6), gY(g[0], g[1]), Q.at(-50), span(Q, -43.5, 0, 13, 30).hi + 0.15, 5); }
  marbleGate(S, Q, -51.5);
  S.paved.push([n0, S.n]);

  // Hồng Trạch môn: a timber gate-tower of three bays and two roofs, in the front wall
  const n1 = S.n;
  const hg = span(Q, 0, 0, htm.d + 3, htm.w + 3), gFloor = Math.max(hg.hi + 0.5, yTe + 0.4);
  {
    let { w, d, a } = htm; if (w < d) { [w, d] = [d, w]; a += Math.PI / 2; }
    terrace(S, Q, 0, 0, d + 1.6, w + 1.6, gFloor);
    flight(S, Q.at(-d / 2 - 0.8 - 2.2), yTe, Q.at(-d / 2 - 0.8), gFloor, 4.4);
    pavilion(S, htm.c[0], htm.c[1], w - 1, d - 1, a, gFloor, { tiers: 2, wallH: 3.3, rh: 2.0, roof: COL.roof, wall: COL.lac, over: 1.1, colonnade: true, segs: 3 });
  }
  // the wall round the court: front line through the gate, gates on all four sides
  const all = [RING.bieuDuc, RING.phoiA, RING.phoiB, RING.tongA, RING.tongB].flatMap((r) => r.map(L));
  let s1 = -Infinity, t0 = Infinity, t1 = -Infinity;
  for (const p of all) { s1 = Math.max(s1, Q.s(p)); t0 = Math.min(t0, Q.t(p)); t1 = Math.max(t1, Q.t(p)); }
  s1 += 7; t0 -= 5; t1 += 5;
  const gh = 2.6, th = 0.7, fw = t1 - t0, sw = s1;
  const half = (htm.w > htm.d ? htm.w : htm.d) / 2 + 0.6;
  wallLine(S, Q, 0, t0, 0, t1, gh, th, [[(-half - t0) / fw, (half - t0) / fw]]);
  wallLine(S, Q, s1, t0, s1, t1, gh, th, [[(-2.2 - t0) / fw, (2.2 - t0) / fw]]);
  for (const t of [t0, t1]) wallLine(S, Q, 0, t, s1, t, gh, th, [[(sw / 2 - 2.2) / sw, (sw / 2 + 2.2) / sw]]);
  { const p = Q.at(s1); archGate(S, p, Q.av, 4.6, 1.4, 3.6); }
  for (const t of [t0, t1]) { const p = Q.at(sw / 2, t); archGate(S, p, Q.a, 4.4, 1.2, 3.2); }

  // the inner court: Bát Tràng paving and a stone walk from the gate to the hall
  const bdS = Q.s(bd.c), front = bdS - 11.8, n2 = S.n;
  {
    const m = (2 + front) / 2, { hi } = span(Q, m, 0, front - 2, 22);
    const top = Math.max(hi + 0.1, gFloor - 0.6);
    terrace(S, Q, m, 0, front - 2, 22, top, COL.stone, COL.bat);
    const p = Q.at(m); S.kind = KIND.ROAD; S.box(p[0], p[1], top - 0.1, top + 0.04, front - 2, 3.2, Q.a, COL.thanh, { topKind: KIND.ROAD });
    flight(S, Q.at(htm.d / 2 + 0.2), gFloor, Q.at(htm.d / 2 + 1.8), top, 4.4);
  }
  S.paved.push([n1, S.n], [n2, S.n]);
  // the side halls: Đông / Tây Phối điện in front, Tả / Hữu Tòng viện behind
  for (const r of [RING.phoiA, RING.phoiB]) hall(S, r, { plinth: 0.6, wallH: 3.2, rh: 2.2 });
  for (const r of [RING.tongA, RING.tongB]) hall(S, r, { plinth: 0.5, wallH: 3.0, rh: 2.0 });
  bieuDuc(S, bd);
}

// điện Biểu Đức: a double hall (nhà kép), the front hall under one roof and the main hall under two (trùng thiềm),
// on one stone plinth with a flight up the middle of the front
function bieuDuc(S, bd) {
  let { c, w, d, a } = bd;
  // the facade runs across the axis: w across, d along
  const F0 = frame(c, a);
  if (Math.abs(Math.cos(a) * 0.764 + Math.sin(a) * 0.645) > 0.7) { [w, d] = [d, w]; a += Math.PI / 2; } // a now along the facade
  const ax = a - Math.PI / 2; // along the axis, toward the back
  const F = frame(c, Math.cos(ax) * 0.764 + Math.sin(ax) * 0.645 > 0 ? ax : ax + Math.PI);
  void F0;
  const sp = span(F, 0, 0, d + 2, w + 2), floor = sp.hi + 1.0;
  terrace(S, F, 0, 0, d + 2, w + 2, floor);
  flight(S, F.at(-(d + 2) / 2 - 2.6), floor - 1.2, F.at(-(d + 2) / 2), floor, 6);
  const d1 = d * 0.4, d2 = d - d1;
  const pf = F.at(-d / 2 + d1 / 2), pr = F.at(d / 2 - d2 / 2);
  pavilion(S, pf[0], pf[1], w - 1.6, d1 - 0.6, F.av, floor, { tiers: 1, wallH: 3.3, rh: 2.2, roof: COL.roof, wall: COL.lac, over: 1.2, colonnade: true, segs: 3 });
  pavilion(S, pr[0], pr[1], w - 1.6, d2 - 0.8, F.av, floor, { tiers: 2, wallH: 3.4, rh: 2.3, roof: COL.roof, wall: COL.lac, over: 1.2, colonnade: true, segs: 3 });
}

// the marble nghi môn of the temple: four square pillars, enamel panels and small roofs over the three bays
function marbleGate(S, Q, s) {
  const p0 = Q.at(s), g = span(Q, s, 0, 2, 12).hi;
  const pill = [-5.2, -1.9, 1.9, 5.2];
  S.kind = KIND.MASONRY; S.base = g - LAND_Y;
  pill.forEach((t, i) => {
    const p = Q.at(s, t), h = i === 1 || i === 2 ? 5.6 : 4.6;
    S.box(p[0], p[1], g - 0.4, g + 0.5, 1.2, 1.2, Q.a, COL.stoneGrey);
    S.box(p[0], p[1], g + 0.5, g + h, 0.8, 0.8, Q.a, COL.marble);
    S.box(p[0], p[1], g + h - 1.2, g + h - 0.3, 0.84, 0.84, Q.a, COL.enamel[i % 2]);
    S.box(p[0], p[1], g + h, g + h + 0.5, 0.6, 0.6, Q.a, COL.enamel[2], { taper: 0.4 }); // the lotus finial
  });
  // lintels, plaque and a small roof over each bay
  for (const [ta, tb, y, big] of [[-5.2, -1.9, 3.5, false], [-1.9, 1.9, 4.3, true], [1.9, 5.2, 3.5, false]]) {
    const m = Q.at(s, (ta + tb) / 2), wd = tb - ta - 0.8;
    S.kind = KIND.MASONRY;
    S.box(m[0], m[1], g + y, g + y + 0.9, 0.5, wd, Q.a, COL.marble);
    S.box(m[0], m[1], g + y + 0.15, g + y + 0.75, 0.56, wd * 0.7, Q.a, big ? COL.enamel[0] : COL.enamel[1]);
    S.hip(m[0], m[1], wd + 0.4, 0.9, Q.av, g + y + 0.9, big ? 0.8 : 0.6, COL.roof, { flare: 0.25, over: 0.3, fascia: 0.12, ridgeCol: RIDGE, hips: true, glazed: true });
  }
  void p0;
}

// ---------- Lăng: the tomb axis ----------
function tomb(S) {
  const bi = box2(RING.biDinh), dh = box2(RING.ducHinh);
  const T = frame(bi.c, Math.atan2(dh.c[1] - bi.c[1], dh.c[0] - bi.c[0]));
  const sDH = T.s(dh.c);
  // bronze nghi môn between hồ Nhuận Trạch and the court
  bronzeGate(S, T, -71.5);
  // sân chầu (Bái Đình): two levels of Bát Tràng brick, statues in two rows a side
  const n0 = S.n;
  const lv = [[-70, -42], [-42, -13]];
  let yPrev = null;
  for (const [a, b] of lv) {
    const m = (a + b) / 2, { hi } = span(T, m, 0, b - a, 32), top = Math.max(hi + 0.15, (yPrev ?? -Infinity) + 0.35);
    terrace(S, T, m, 0, b - a, 32, top, COL.stone, COL.bat);
    const p = T.at(m); S.kind = KIND.ROAD; S.box(p[0], p[1], top - 0.1, top + 0.04, b - a, 3.4, T.a, COL.thanh, { topKind: KIND.ROAD });
    if (yPrev != null) flight(S, T.at(a - 1.2), yPrev, T.at(a + 0.2), top, 5);
    yPrev = top;
  }
  S.paved.push([n0, S.n]);
  for (const sd of [-1, 1]) {
    const face = T.a + Math.PI / 2 + (sd > 0 ? Math.PI : 0);
    // outer row from the gate: elephant, horse, then two mandarins; inner row: four mandarins
    beast(S, T.at(-62, sd * 11), T.a + Math.PI, true);
    beast(S, T.at(-55, sd * 11), T.a + Math.PI, false);
    for (let k = 0; k < 2; k++) mandarin(S, T.at(-34 + k * 9, sd * 11), face, true);
    for (let k = 0; k < 4; k++) mandarin(S, T.at(-38 + k * 6.5, sd * 6.5), face, false);
  }
  // Bi Đình on its 2.65 m platform, flights front and back
  const n1 = S.n;
  {
    const P = 17.5, { hi } = span(T, 0, 0, P, P), top = hi + 2.65;
    terrace(S, T, 0, 0, P, P, top, COL.stone);
    S.kind = KIND.MASONRY; // a moulded band round the top
    S.box(bi.c[0], bi.c[1], top - 0.35, top, P + 0.3, P + 0.3, T.a, shade(COL.stone, 0.92), { topKind: KIND.ROAD });
    flight(S, T.at(-P / 2 - 4.6), yPrev, T.at(-P / 2), top, 5.2);
    flight(S, T.at(P / 2 + 4.4), gY(...T.at(P / 2 + 4.4)), T.at(P / 2), top, 4);
    const W = Math.min(bi.w, bi.d);
    pavilion(S, bi.c[0], bi.c[1], W - 0.6, W - 0.6, T.av, top, { tiers: 2, wallH: 3.4, rh: 2.4, roof: COL.roof, wall: COL.lac, over: 1.3, colonnade: true, segs: 3 });
    walk(S, T, P / 2 + 4.4, sDH - 13.5, 0, 4.5);
  }
  // Đức Hinh lâu: only its base is left, on a low hill, with the two brick trụ biểu either side
  {
    const B = 18.5, { hi } = span(T, sDH, 0, B + 7, B + 7);
    const y1 = terrace(S, T, sDH, 0, B + 7, B + 7, hi + 0.3, COL.stoneGrey);
    const y2 = terrace(S, T, sDH, 0, B, B, y1 + 1.1, COL.stoneGrey, shade(COL.stoneGrey, 1.04));
    for (const sg of [-1, 1]) {
      const e1 = sDH + sg * (B + 7) / 2, e2 = sDH + sg * B / 2;
      flight(S, T.at(e1 + sg * 1.8), gY(...T.at(e1 + sg * 1.8)), T.at(e1), y1, 4.6);
      flight(S, T.at(e2 + sg * 1.6), y1, T.at(e2), y2, 4.6);
    }
    // the stone column bases of the lost hall, a 6 x 6 grid, a few missing
    S.kind = KIND.MASONRY;
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
      if ((i * 7 + j * 3) % 11 === 4) continue;
      const p = T.at(sDH - 7.5 + i * 3, -7.5 + j * 3);
      S.box(p[0], p[1], y2 - 0.05, y2 + 0.28, 0.62, 0.62, T.a, shade(COL.stoneGrey, 0.86));
    }
    // broken stubs of the brick back wall
    for (const [t, l, h] of [[-6, 3.5, 0.8], [-1.5, 2.2, 0.5], [5.5, 4, 0.9]]) { const p = T.at(sDH + 8.6, t); S.box(p[0], p[1], y2 - 0.1, y2 + h, 0.6, l, T.a, COL.brick, { top: shade(COL.brick, 0.9) }); }
    for (const sd of [-1, 1]) truBieu(S, T.at(sDH, sd * 15.5));
    walk(S, T, sDH + (B + 7) / 2 + 1.8, 71, 0, 4.5);
  }
  S.paved.push([n1, S.n]);
  // hồ Ngưng Thúy: three bridges, Tây Định, Chánh Trung (the middle, widest) and Đông Hòa, from the shore behind Đức
  // Hinh lâu to the apron before the Bửu Thành
  for (const [t, w] of [[-9, 3.0], [0, 4.2], [9, 3.0]]) bridge(S, T.at(70.5, t), T.at(113, t), w, t ? COL.stone : shade(COL.stone, 1.05));
  // Bửu Thành: a ring wall 260 m round (r 41.4 m), its bronze gate on the axis, grave mound and pines inside
  const n2 = S.n, R = 260 / (2 * Math.PI), sB = 115.6 + R, cB = T.at(sB);
  {
    walk(S, T, 111.5, 115.4, 0, 26, COL.stoneGrey);
    const N = 40, h = 3.0, th = 1.1;
    const gateHalf = 3.4 / R; // the gate opening, as an angle each side of the axis
    const front = Math.PI; // the axis front, in the frame's angle (s negative)
    const pt = (ang) => T.at(sB + R * Math.cos(ang), R * Math.sin(ang));
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
      const lo = Math.max(a0, front - gateHalf), hi = Math.min(a1, front + gateHalf);
      if (hi > lo) { // this segment holds the gate: build what is left either side
        if (lo > a0) wallRun(S, pt(a0), pt(lo), h, th, COL.brick);
        if (a1 > hi) wallRun(S, pt(hi), pt(a1), h, th, COL.brick);
      } else wallRun(S, pt(a0), pt(a1), h, th, COL.brick);
    }
    // the gate: two brick pylons, a lintel with a small roof, the bronze double door
    const gp = T.at(115.6), g = gY(gp[0], gp[1]);
    S.kind = KIND.MASONRY; S.base = g - LAND_Y;
    for (const sd of [-1, 1]) { const p = T.at(115.6, sd * 3.1); S.box(p[0], p[1], g - 0.6, g + 4.6, 1.6, 1.4, T.a, COL.brick, { top: COL.cap }); S.box(p[0], p[1], g + 4.6, g + 5.1, 1.0, 1.0, T.a, COL.cap, { taper: 0.5 }); }
    S.box(gp[0], gp[1], g + 3.4, g + 4.3, 1.5, 4.8, T.a, COL.brick, { top: COL.cap });
    S.hip(gp[0], gp[1], 6.6, 1.9, T.av, g + 4.3, 0.8, COL.roofOld, { flare: 0.25, over: 0.4, fascia: 0.15, ridgeCol: RIDGE, hips: true, glazed: true });
    S.kind = KIND.PLAIN;
    for (const sd of [-1, 1]) { const p = T.at(115.6, sd * 0.85); S.box(p[0], p[1], g, g + 3.3, 0.14, 1.6, T.a, COL.bronze); S.box(p[0], p[1], g + 1.4, g + 1.7, 0.18, 1.5, T.a, COL.bronzeHi); }
    flight(S, T.at(111.2), g - 0.4, T.at(114.6), g + 0.1, 5, COL.stoneGrey, false);
    // inside: the grave mound (a round earth tumulus in a stone kerb), pines round it
    // the kerb is set on the highest ground under it (the hill climbs ~2 m across it), bedded at the lowest
    const sp = span(T, sB, 0, 23, 23), gm = sp.hi;
    S.kind = KIND.MASONRY; S.base = gm - LAND_Y;
    S.cyl(cB[0], cB[1], sp.lo - 0.8, gm + 0.7, 11.5, 11.5, 24, COL.stoneGrey);
    S.kind = KIND.GROUND;
    S.cyl(cB[0], cB[1], gm + 0.7, gm + 3.6, 11, 3, 24, COL.moss);
    S.cyl(cB[0], cB[1], gm + 3.6, gm + 4.2, 3, 0.4, 12, shade(COL.moss, 0.95));
    for (let i = 0; i < 14; i++) {
      const ang = (i / 14) * Math.PI * 2 + 0.3, rr = R * (i % 2 ? 0.55 : 0.75);
      const p = T.at(sB + Math.cos(ang) * rr, Math.sin(ang) * rr);
      pine(S, p[0], p[1], 7 + (i % 3) * 1.5);
    }
  }
  S.paved.push([n2, S.n]);
}

// the bronze nghi môn of the tomb court: four bronze pillars wrapped with dragons and clouds, open frames between
function bronzeGate(S, T, s) {
  const g = span(T, s, 0, 2, 12).hi;
  const pill = [-5.4, -1.9, 1.9, 5.4];
  S.base = g - LAND_Y;
  pill.forEach((t, i) => {
    const p = T.at(s, t), h = i === 1 || i === 2 ? 5.4 : 4.4;
    S.kind = KIND.MASONRY;
    S.box(p[0], p[1], g - 0.4, g + 0.45, 1.1, 1.1, T.a, COL.stoneGrey);
    S.kind = KIND.PLAIN;
    S.cyl(p[0], p[1], g + 0.45, g + h, 0.3, 0.27, 8, COL.bronze);
    for (const f of [0.3, 0.55, 0.8]) S.cyl(p[0], p[1], g + 0.45 + (h - 0.45) * f, g + 0.6 + (h - 0.45) * f, 0.38, 0.38, 8, COL.bronzeHi, { cap: false }); // the coiling dragon
    S.cyl(p[0], p[1], g + h, g + h + 0.7, 0.42, 0.05, 8, COL.bronzeHi); // the finial
  });
  for (const [ta, tb, y] of [[-5.4, -1.9, 3.3], [-1.9, 1.9, 4.2], [1.9, 5.4, 3.3]]) {
    const m = T.at(s, (ta + tb) / 2), wd = tb - ta - 0.5;
    S.kind = KIND.PLAIN;
    S.box(m[0], m[1], g + y, g + y + 0.22, 0.24, wd, T.a, COL.bronze);
    S.box(m[0], m[1], g + y + 0.62, g + y + 0.84, 0.24, wd, T.a, COL.bronze);
    S.box(m[0], m[1], g + y + 0.22, g + y + 0.62, 0.12, wd * 0.8, T.a, COL.bronzeHi); // the openwork cloud panel
    S.hip(m[0], m[1], wd + 0.3, 0.6, T.av, g + y + 0.84, 0.45, COL.bronze, { flare: 0.2, over: 0.2, ridgeCol: COL.bronzeHi, hips: true });
  }
}

// a brick trụ biểu: square plinth, tall tapering shaft, lotus cap and a finial
function truBieu(S, p) {
  const g = gY(p[0], p[1]);
  S.kind = KIND.MASONRY; S.base = g - LAND_Y;
  S.box(p[0], p[1], g - 0.6, g + 1.2, 1.9, 1.9, 0.6, COL.brick, { top: COL.cap });
  S.box(p[0], p[1], g + 1.2, g + 6.6, 1.15, 1.15, 0.6, shade(COL.brick, 1.05), { taper: 0.72 });
  S.box(p[0], p[1], g + 6.6, g + 7.1, 1.15, 1.15, 0.6, COL.cap);
  S.box(p[0], p[1], g + 7.1, g + 7.9, 0.6, 0.6, 0.6, shade(COL.brick, 1.05), { taper: 0.2 });
}
