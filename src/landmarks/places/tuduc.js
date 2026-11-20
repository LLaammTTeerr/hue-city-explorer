import { KIND, hex, shade, obb, inRing } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { pavilion } from '../citadel.js';

// ---- Lăng Tự Đức (Khiêm Lăng), the tomb of Emperor Tự Đức, built 1864–67 in a pine valley at Dương Xuân Thượng ----
//
// Sources (docs/places/tuduc.md has the full list):
//  - vi.wikipedia.org/wiki/Lăng_Tự_Đức: La Thành of brick and stone about 2.5 m high and over 1,800 m round, gates
//    Vụ Khiêm, Thượng Khiêm and Tự Khiêm; Lưu Khiêm lake with Xung Khiêm and Dũ Khiêm tạ on its bank; Khiêm Cung Môn,
//    a three-bay gate with an upper storey (cổ lâu) reached by three flights of steps from the lake; behind it the
//    double-roofed Hòa Khiêm điện between the Pháp Khiêm and Lễ Khiêm vu, Lương Khiêm behind, Minh Khiêm đường (the
//    theatre) on the left, Ôn Khiêm on the right, Chí Khiêm đường further right; the tomb axis to the left of the
//    temple axis: Bái Đình with two rows of mandarins, the Bi Đình with the 20-tonne Khiêm Cung Ký stele, two trụ
//    biểu, the crescent Tiểu Khiêm Trì, the Bửu Thành (bửu phong 2.96 × 1.58 × 2.47 m); Khiêm Thọ Lăng (Empress Lệ
//    Thiên Anh) with four tiers of courts, outer wall 31.5 × 21.3 m, inner wall 19 × 14.55 m, a mosaic screen; and
//    Bồi Lăng of Emperor Kiến Phúc with his temple Chấp Khiêm.
//  - baovanhoa.vn (2024, 2026): the restoration (2023–27) re-roofs Hòa Khiêm in yellow glazed tiles; Minh Khiêm is
//    nearly done; Ôn Khiêm's frame is in the workshop.
//  - OpenStreetMap (cached raw extract, data/raw): every hall's outline below, the trụ biểu node, the steps and
//    footways of both axes, the crescent pond, the sepulchre platform, Vụ Khiêm Môn.
// Estimated: heights and the split of each double hall, the gate storeys, the statue count and order, the stele and
// pillar sizes, the Bửu Thành walls, the tiers and walls of Khiêm Thọ and Bồi Lăng, the run of the La Thành.
// The lake, the crescent pond and the lake bridges are drawn by the water and bridge builders, not here.

export const id = 'tuduc';

// ---- OSM outlines, metres in the model frame ----
const KHIEM_CUNG_MON = [[-2417.5, 4015.8], [-2406.7, 4015.3], [-2406, 4027.8], [-2417, 4028.3]];
const HOA_KHIEM = [[-2464, 4010.6], [-2439.9, 4008.9], [-2437.8, 4039], [-2461.9, 4040.7]];
const LUONG_KHIEM = [[-2498.3, 4015.4], [-2479.1, 4013.9], [-2477.1, 4040.2], [-2496.3, 4041.6]];
const MINH_KHIEM = [[-2487.2, 3992.2], [-2457.2, 3990.1], [-2455.8, 4009.1], [-2485.8, 4011.2]];
const ON_KHIEM = [[-2480.1, 4043.1], [-2458.8, 4041.4], [-2457.6, 4056.2], [-2478.9, 4057.8]];
const PHAP_KHIEM = [[-2434, 3985.5], [-2419.8, 3984.6], [-2418.9, 3998.5], [-2433.1, 3999.4]];
const LE_KHIEM = [[-2432.3, 4046.4], [-2417.8, 4045.3], [-2416.9, 4057.4], [-2431.4, 4058.5]];
const LINKS = [[-2480.7, 4012.5], [-2478.3, 4041.6]];
// Chí Khiêm đường: a U, the hall across the back and two wings forward
const CHI_KHIEM = [[[-2409.2, 4100.6], [-2393.4, 4100.2], [-2393.2, 4111.5], [-2408.8, 4112]], [[-2413, 4084.1], [-2407.3, 4083.9], [-2406.9, 4100.6], [-2412.5, 4100.8]], [[-2397.2, 4083.3], [-2391.5, 4083.1], [-2391.1, 4100.2], [-2396.8, 4100.3]]];
const XUNG_KHIEM = [[-2349.4, 3987.3], [-2330, 3986.3], [-2329.2, 3998.9], [-2348.8, 3999.8]];
const DU_KHIEM = [[-2370.5, 4016], [-2358.9, 4015.4], [-2358.5, 4022.2], [-2370.2, 4022.7]];
const BI_DINH = [[-2512.4, 3943.5], [-2499.8, 3942.3], [-2498.6, 3954.1], [-2511.2, 3955.4]];
const BUU_THANH_GATE = [[-2573.2, 3954.6], [-2567.6, 3954], [-2566.8, 3962.3], [-2572.3, 3962.8]];
const SEPULCHRE = [[-2601.8, 3960.1], [-2601.2, 3964.6], [-2595.1, 3963.7], [-2595.7, 3959.3]];
const CRESCENT = [[-2538.4, 3964.4], [-2536.5, 3958.8], [-2535.9, 3952.5], [-2537.5, 3945.4], [-2540.1, 3940.4], [-2544.3, 3938.3], [-2547.6, 3937.9], [-2551, 3939.4], [-2552.4, 3942], [-2551.8, 3944.8], [-2549.6, 3948.6], [-2548.6, 3952.4], [-2548.3, 3955.7], [-2547.7, 3962.7], [-2548.3, 3967.1], [-2548.1, 3969.7], [-2545.7, 3971.7], [-2543.5, 3971.6], [-2541.4, 3970.5], [-2539.6, 3967.2]];
const CHAP_KHIEM = [[-2412.4, 3833.4], [-2400, 3833], [-2399.6, 3851.4], [-2412, 3851.7]];
const CHAP_WINGS = [[[-2434.9, 3842.9], [-2418.4, 3842.6], [-2418.3, 3847.7], [-2434.8, 3848.1]], [[-2418.4, 3842.6], [-2412.2, 3842.4], [-2412, 3849.5], [-2418.2, 3849.6]]];
const BOI_LANG = [[-2373.4, 3828.3], [-2369.9, 3828.1], [-2369.6, 3834.1], [-2373, 3834.3]];
const KHIEM_THO = [-2534.6, 3818.6]; // the empress's bửu phong (way 205805278)
const VU_KHIEM_MON = [[-2287.6, 3888.6], [-2283.1, 3888], [-2281.8, 3898.3], [-2286.3, 3898.9]];
const PILLAR = [-2522.3, 3931.8]; // the mapped trụ biểu; its twin is mirrored across the tomb axis
// the La Thành, estimated from the tracks and lanes that run round it outside
const LA_THANH = [[-2600, 3790], [-2525, 3786], [-2444, 3783], [-2385, 3786], [-2352, 3812], [-2296, 3889], [-2289, 3947], [-2279, 4016], [-2279, 4049], [-2310, 4084], [-2363, 4118], [-2380, 4148], [-2410, 4162], [-2560, 4166], [-2612, 4168], [-2690, 4090], [-2712, 4000], [-2705, 3880], [-2660, 3810]];
// the two height-checked halls: their centres as check-heights takes them (the mapped ring's vertex mean)
const HK_C = [-2449.5, 4022.8], XK_C = [-2339.4, 3992.6];
const LAKE_Y = LAND_Y + 4.2 + 0.08; // Lưu Khiêm's surface (pond level 4.2 m, as terrain.js pondY draws it)

const C = {
  brick: hex('#6e6253'), brickMoss: hex('#5e6249'), stone: PAL.stone, stoneGrey: hex('#9b978d'), stoneDark: hex('#7c786f'),
  stucco: hex('#d6cdb6'), lacquer: hex('#86362a'), lacquerOld: hex('#6f3c30'), roofY: PAL.imperialRoof, roofYOld: hex('#b48b3e'),
  roofTile: hex('#7a6552'), door: hex('#2b2422'), moss: PAL.moss, mandarin: hex('#a29d92'), timber: hex('#5a3d2c'), mosaic: hex('#8fa6a0'),
};
const RIDGE = hex('#e9d27e');

const gY = (x, z) => LAND_Y + rise(x, z);
const centre = (r) => r.reduce((a, p) => [a[0] + p[0] / r.length, a[1] + p[1] / r.length], [0, 0]);
const corners = (o, pad = 0) => { const ux = Math.cos(o.a), uz = Math.sin(o.a), hw = o.w / 2 + pad, hd = o.d / 2 + pad; return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([s, t]) => [o.c[0] + ux * hw * s - uz * hd * t, o.c[1] + uz * hw * s + ux * hd * t]); };
const gMax = (pts) => Math.max(...pts.map((p) => gY(p[0], p[1])));
const gMin = (pts) => Math.min(...pts.map((p) => gY(p[0], p[1])));
const boxPts = (cx, cz, w, d, a) => corners({ c: [cx, cz], w, d, a }).concat([[cx, cz]]);
// an axis frame: P(s, t) = o + s·u + t·v, v a quarter turn from u
function frame(o, dir) {
  const l = Math.hypot(dir[0], dir[1]), u = [dir[0] / l, dir[1] / l], v = [-u[1], u[0]];
  return { o, u, v, a: Math.atan2(u[1], u[0]), P: (s, t) => [o[0] + u[0] * s + v[0] * t, o[1] + u[1] * s + v[1] * t] };
}

// ---- small helpers, self-contained (tombs.js keeps its own unexported) ----
// a block standing on the ground: from below the lowest corner to y1
function block(S, cx, cz, y1, w, d, a, col, top = col, kind = KIND.MASONRY) {
  S.kind = kind;
  S.box(cx, cz, gMin(boxPts(cx, cz, w, d, a)) - 0.4, y1, w, d, a, col, { top });
}
// a flight of steps from a (at yA) to b (at yB), each tread standing on the ground, with cheek walls
function flight(S, a, b, w, yA, yB, col = C.stoneGrey, cheeks = true) {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz), ang = Math.atan2(dz, dx);
  const n = Math.max(2, Math.min(40, Math.round(Math.abs(yA - yB) / 0.18)));
  S.kind = KIND.MASONRY;
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n, cx = a[0] + dx * f, cz = a[1] + dz * f, top = yA + (yB - yA) * f;
    S.box(cx, cz, gMin(boxPts(cx, cz, len / n + 0.02, w, ang)) - 0.3, top, len / n + 0.02, w, ang, shade(col, 0.92), { top: col, topKind: KIND.ROAD });
  }
  if (cheeks) {
    const ox = (-dz / len) * (w / 2 + 0.2), oz = (dx / len) * (w / 2 + 0.2);
    for (const sg of [-1, 1]) S.beam([a[0] + ox * sg, yA + 0.3, a[1] + oz * sg], [b[0] + ox * sg, yB + 0.3, b[1] + oz * sg], 0.4, 0.75, C.stoneDark);
  }
}
// a wall along a polyline, cut into short pieces that follow the ground, broken where `skip(x, z)` says
function wallLine(S, pts, h, th, col, { closed = false, skip = () => false, cap = C.stoneDark, piece = 6 } = {}) {
  S.kind = KIND.MASONRY;
  const n = pts.length, m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const a = pts[i], b = pts[(i + 1) % n], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
    if (len < 0.2) continue;
    const k = Math.max(1, Math.ceil(len / piece)), ang = Math.atan2(dz, dx), l = len / k;
    for (let j = 0; j < k; j++) {
      const p = [a[0] + dx * (j / k), a[1] + dz * (j / k)], q = [a[0] + dx * ((j + 1) / k), a[1] + dz * ((j + 1) / k)];
      const cx = (p[0] + q[0]) / 2, cz = (p[1] + q[1]) / 2;
      if (skip(cx, cz)) continue;
      const g0 = Math.min(gY(p[0], p[1]), gY(q[0], q[1])), g1 = Math.max(gY(p[0], p[1]), gY(q[0], q[1]));
      S.box(cx, cz, g0 - 0.5, g1 + h, l + 0.05, th, ang, col, { top: cap });
      S.box(cx, cz, g1 + h, g1 + h + 0.18, l + 0.05, th + 0.18, ang, cap);
    }
  }
}
// a rectangle in a frame as a closed point list
const rect = (F, s0, s1, t0, t1) => [F.P(s0, t0), F.P(s1, t0), F.P(s1, t1), F.P(s0, t1)];
// brick paving laid in tiles that follow the slope, over a rectangle of a frame (kept clear of trees and houses)
function paving(S, F, s0, s1, t0, t1, step = 5, col = shade(C.stone, 0.92)) {
  const n0 = S.n;
  S.kind = KIND.MASONRY;
  for (let s = s0; s < s1 - 0.01; s += step) for (let t = t0; t < t1 - 0.01; t += step) {
    const ls = Math.min(step, s1 - s), lt = Math.min(step, t1 - t), q = F.P(s + ls / 2, t + lt / 2), g = gY(q[0], q[1]);
    S.box(q[0], q[1], gMin(boxPts(q[0], q[1], ls, lt, F.a)) - 0.25, g + 0.3, ls + 0.04, lt + 0.04, F.a, C.stoneGrey, { top: col, topKind: KIND.ROAD });
  }
  (S.paved = S.paved || []).push([n0, S.n]);
}
// a flat paved terrace on a slope: stone faces down to the ground, the top a court (kept clear of trees and houses)
function terrace(S, cx, cz, w, d, a, y, col = C.stone, faceCol = C.stoneGrey) {
  const n0 = S.n;
  S.kind = KIND.MASONRY;
  S.box(cx, cz, gMin(boxPts(cx, cz, w, d, a)) - 0.5, y, w, d, a, faceCol, { top: col, topKind: KIND.ROAD });
  (S.paved = S.paved || []).push([n0, S.n]);
}
// a hall: plinth, lacquered body (a verandah of columns along the front when `front` is given) and a hipped roof;
// `double` makes the trùng thiềm điệp ốc form of the Nguyễn temples: a front house and a main house under two
// parallel roofs. front: the outward direction the hall faces. Returns the top.
function hall(S, ring, { front = null, plinth = 0.6, base = null, wallH = 3.6, rh = 2.6, roof = C.roofYOld, wall = C.lacquerOld, double = false, glazed = true, over = 1.2, top = null } = {}) {
  const o = obb(ring), [cx, cz] = o.c, a = o.a;
  const ux = Math.cos(a), uz = Math.sin(a), vx = -uz, vz = ux;
  const P = (u, v) => [cx + ux * u + vx * v, cz + uz * u + vz * v];
  const y0 = (base ?? gMax(corners(o))) + plinth;
  // plinth of stone
  S.kind = KIND.MASONRY;
  S.box(cx, cz, gMin(corners(o, 0.9)) - 0.4, y0, o.w + 1.8, o.d + 1.8, a, C.stoneGrey, { top: C.stone, topKind: KIND.ROAD });
  // which side of the short axis faces `front`
  const sg = front ? (front[0] * vx + front[1] * vz >= 0 ? 1 : -1) : 1;
  if (top != null) rh = top - y0 - wallH;
  // the body, set back from the front for a verandah
  const ver = front ? Math.min(1.8, o.d * 0.14) : 0;
  const bc = P(0, -sg * ver / 2);
  S.kind = KIND.TIMBER;
  S.box(bc[0], bc[1], y0, y0 + wallH, o.w - 0.6, o.d - ver - 0.4, a, wall, { top: shade(roof, 0.7) });
  if (front) {
    // red columns along the verandah, and the doors (dark leaves) in the front wall
    const n = Math.max(3, Math.round(o.w / 3.2));
    for (let i = 0; i <= n; i++) { const q = P(-o.w / 2 + 0.3 + ((o.w - 0.6) * i) / n, sg * (o.d / 2 - 0.3)); S.cyl(q[0], q[1], y0, y0 + wallH, 0.2, 0.18, 6, shade(wall, 1.12), { cap: false, rot: a }); }
    const nd = Math.max(1, Math.min(5, Math.round(o.w / 6)));
    for (let i = 0; i < nd; i++) {
      const q = P(-o.w / 2 + (o.w * (i + 0.5)) / nd, sg * (o.d / 2 - ver - 0.17));
      S.kind = KIND.PLAIN;
      S.box(q[0], q[1], y0, y0 + Math.min(2.9, wallH * 0.78), Math.min(2.2, o.w / nd - 0.8), 0.1, a, C.door);
    }
  }
  const yr = y0 + wallH;
  const eave = { flare: 0.45, over, fascia: 0.28, fasciaCol: shade(wall, 0.7), ridgeCol: RIDGE, hips: true, glazed, segs: 3 };
  if (double) {
    // front house (lower roof) and main house: depths about 2 : 3
    const d1 = o.d * 0.4, d2 = o.d - d1;
    const fq = P(0, sg * (o.d / 2 - d1 / 2)), mq = P(0, -sg * (o.d / 2 - d2 / 2));
    S.hip(fq[0], fq[1], o.w, d1, a, yr - 0.15, rh * 0.72, roof, eave);
    S.hip(mq[0], mq[1], o.w, d2, a, yr, rh, roof, eave);
    // the valley gutter between the two roofs
    const gq = P(0, sg * (o.d / 2 - d1));
    S.kind = KIND.TILE;
    S.box(gq[0], gq[1], yr - 0.3, yr + 0.45, o.w + over, 2.6, a, shade(roof, 0.8));
  } else {
    S.hip(cx, cz, o.w, o.d, a, yr, rh, roof, eave);
  }
  return yr + rh;
}
// a masonry gate of three openings (the middle one taller); `upper` adds a timber storey (lầu) on top
function gateHouse(S, ring, { base = null, h = 4.2, rh = 1.6, upper = false, roof = C.roofYOld, body = C.stoneGrey, openings = 3 } = {}) {
  const o = obb(ring), [cx, cz] = o.c, a = o.a, ux = Math.cos(a), uz = Math.sin(a), vx = -uz, vz = ux;
  const P = (u, v) => [cx + ux * u + vx * v, cz + uz * u + vz * v];
  const y0 = (base ?? gMax(corners(o))) + 0.3;
  S.kind = KIND.MASONRY;
  S.box(cx, cz, gMin(corners(o)) - 0.4, y0, o.w + 0.8, o.d + 0.8, a, C.stoneDark, { top: C.stone, topKind: KIND.ROAD });
  const d = o.d * 0.8;
  S.box(cx, cz, y0, y0 + h, o.w, d, a, body, { top: C.stoneDark });
  // the openings, dark, on both faces, with a raised moulding over each
  S.kind = KIND.PLAIN;
  const us = openings === 3 ? [-o.w * 0.3, 0, o.w * 0.3] : [0];
  for (const u of us) for (const sg of [-1, 1]) {
    const mid = u === 0, ow = mid ? Math.min(2.4, o.w * 0.2) : Math.min(1.7, o.w * 0.14), oh = mid ? h * 0.72 : h * 0.58;
    const q = P(u, sg * (d / 2 + 0.03));
    S.box(q[0], q[1], y0, y0 + oh, ow, 0.08, a, C.door);
    S.kind = KIND.MASONRY;
    S.box(q[0], q[1], y0 + oh, y0 + oh + 0.35, ow + 0.6, 0.14, a, C.stucco);
    S.kind = KIND.PLAIN;
  }
  const eave = { flare: 0.4, fascia: 0.24, fasciaCol: C.stoneDark, ridgeCol: RIDGE, hips: true, glazed: true, segs: 3 };
  if (!upper) { S.hip(cx, cz, o.w, d, a, y0 + h, rh, roof, { ...eave, over: 0.7 }); return y0 + h + rh; }
  // a skirt roof round the masonry, then the timber storey and its own roof
  S.hip(cx, cz, o.w, d, a, y0 + h, rh * 0.75, roof, { ...eave, over: 0.8, ridgeCol: null });
  const y2 = y0 + h + 0.45, w2 = o.w * 0.62, d2 = d * 0.55;
  S.kind = KIND.TIMBER;
  S.box(cx, cz, y2, y2 + 2.3, w2, d2, a, C.lacquer, { top: shade(roof, 0.7) });
  for (const sg of [-1, 1]) { const q = P(0, sg * (d2 / 2 + 0.03)); S.kind = KIND.PLAIN; S.box(q[0], q[1], y2 + 0.5, y2 + 1.9, w2 * 0.7, 0.06, a, C.door); }
  S.hip(cx, cz, w2, d2, a, y2 + 2.3, rh * 1.2, roof, { ...eave, over: 0.9 });
  return y2 + 2.3 + rh * 1.2;
}
// a water pavilion on piles: posts from the lake bed, a timber deck over the water, an open hall on it
function waterPavilion(S, ring, { deck, wallH, top, roof = C.roofTile }) {
  const o = obb(ring), [cx, cz] = o.c, a = o.a, ux = Math.cos(a), uz = Math.sin(a), vx = -uz, vz = ux;
  const P = (u, v) => [cx + ux * u + vx * v, cz + uz * u + vz * v];
  S.kind = KIND.MASONRY;
  const nu = Math.max(2, Math.round(o.w / 2.4)), nv = Math.max(2, Math.round(o.d / 2.4));
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
    const q = P(-o.w / 2 + (o.w * i) / nu, -o.d / 2 + (o.d * j) / nv);
    S.box(q[0], q[1], Math.min(gY(q[0], q[1]), LAKE_Y) - 1.2, deck - 0.3, 0.38, 0.38, a, C.stoneGrey);
  }
  S.kind = KIND.TIMBER;
  S.box(cx, cz, deck - 0.3, deck, o.w + 0.4, o.d + 0.4, a, C.timber, { top: shade(C.timber, 1.15) });
  // a low balustrade round the deck
  const Cn = corners(o, 0.15);
  for (let i = 0; i < 4; i++) { const p = Cn[i], q = Cn[(i + 1) % 4]; S.beam([p[0], deck + 0.55, p[1]], [q[0], deck + 0.55, q[1]], 0.12, 0.1, C.lacquerOld); }
  // the hall stands inset on the deck, an open colonnade round a closed core
  const iw = o.w - 1.0, id = o.d - 1.0;
  return pavilion(S, cx, cz, iw, id, a, deck, { wallH, rh: top - deck - wallH, roof, wall: C.lacquerOld, colonnade: true, over: 1.3, platform: 0, segs: 3 });
}
// statues of the salutation court, facing `a` (the direction they look)
function mandarin(S, x, z, y, a, military = false) {
  S.kind = KIND.MASONRY;
  S.box(x, z, y, y + 0.22, 0.75, 0.75, a, C.stoneDark);
  S.box(x, z, y + 0.22, y + 1.3, 0.48, 0.58, a, C.mandarin, { taper: 0.86 });
  S.box(x, z, y + 1.3, y + 1.62, 0.3, 0.3, a, shade(C.mandarin, 0.95));
  S.box(x, z, y + 1.62, y + (military ? 1.74 : 1.7), military ? 0.38 : 0.44, 0.34, a, shade(C.mandarin, 0.8));
}
function elephant(S, x, z, y, a) {
  const ux = Math.cos(a), uz = Math.sin(a), vx = -uz, vz = ux;
  S.kind = KIND.MASONRY;
  S.box(x, z, y, y + 0.2, 2.8, 1.5, a, C.stoneDark);
  for (const [u, v] of [[0.8, 0.4], [0.8, -0.4], [-0.8, 0.4], [-0.8, -0.4]]) S.box(x + ux * u + vx * v, z + uz * u + vz * v, y + 0.2, y + 1.0, 0.42, 0.42, a, C.mandarin);
  S.box(x, z, y + 0.9, y + 1.95, 2.3, 1.2, a, C.mandarin, { taper: 0.92 });
  S.box(x + ux * 1.3, z + uz * 1.3, y + 1.1, y + 2.05, 0.7, 0.95, a, shade(C.mandarin, 0.95));
  S.box(x + ux * 1.6, z + uz * 1.6, y + 0.35, y + 1.3, 0.24, 0.24, a, shade(C.mandarin, 0.9));
}
function horse(S, x, z, y, a) {
  const ux = Math.cos(a), uz = Math.sin(a), vx = -uz, vz = ux;
  S.kind = KIND.MASONRY;
  S.box(x, z, y, y + 0.2, 2.0, 0.9, a, C.stoneDark);
  for (const [u, v] of [[0.6, 0.2], [0.6, -0.2], [-0.6, 0.2], [-0.6, -0.2]]) S.box(x + ux * u + vx * v, z + uz * u + vz * v, y + 0.2, y + 0.95, 0.2, 0.2, a, C.mandarin);
  S.box(x, z, y + 0.9, y + 1.45, 1.6, 0.6, a, C.mandarin);
  S.box(x + ux * 0.85, z + uz * 0.85, y + 1.2, y + 2.0, 0.4, 0.34, a, shade(C.mandarin, 0.95), { taper: 0.8 });
}

export function build({ data, S }) {
  const claimed = []; // centres of the mapped buildings drawn here, so the generic pass leaves them alone
  const claim = (r) => claimed.push(centre(r));
  const keep = []; // footprints (padded) the La Thành must not run through

  // ================= the temple (Khiêm Cung), facing east over the lake =================
  // its axis runs from Khiêm Cung Môn west through Hòa Khiêm to Lương Khiêm, square to the mapped halls
  const TA = frame(centre(KHIEM_CUNG_MON), [-0.9975, 0.0704]);
  const east = [-TA.u[0], -TA.u[1]];

  // Khiêm Cung Môn: masonry, three openings, a timber upper storey
  const gB = gMax(KHIEM_CUNG_MON);
  gateHouse(S, KHIEM_CUNG_MON, { base: gB, h: 4.3, rh: 1.7, upper: true, roof: C.roofYOld });
  claim(KHIEM_CUNG_MON);
  // the three flights from the gate down toward the lake, a path, and the lower flight to Dũ Khiêm
  {
    const yTop = gB + 0.3;
    for (const t of [-3.9, 0, 3.9]) flight(S, TA.P(-5.6, t), TA.P(-11.5, t), t === 0 ? 2.8 : 2.2, yTop, gY(...TA.P(-11.5, t)) + 0.08);
    const a = TA.P(-22.5, 0), b = TA.P(-29.5, 0);
    flight(S, a, b, 5, gY(...a) + 0.12, gY(...b) + 0.05);
  }
  // the compound wall of the temple: the gate stands in its front side
  const kcWall = [TA.P(0, -6.6), TA.P(0, -41), TA.P(91, -41), TA.P(91, 41), TA.P(0, 41), TA.P(0, 6.6)];
  wallLine(S, kcWall, 2.3, 0.55, C.brickMoss, { cap: C.stoneDark });
  paving(S, TA, 0.6, 90.6, -40.6, 40.6, 6);
  // the front court between the gate and Hòa Khiêm, paved; the court behind it, to Lương Khiêm
  const yA = gY(...TA.P(26, 0)) + 0.15;
  { const c = TA.P(16, 0); terrace(S, c[0], c[1], 20.5, 44, TA.a, yA); }
  flight(S, TA.P(5.5, 0), TA.P(6.5, 0), 3.2, gB + 0.3, yA, C.stoneGrey, false);
  const yB = gY(...TA.P(62, 0)) + 0.15;
  { const c = TA.P(57.5, 0); terrace(S, c[0], c[1], 10, 34, TA.a, yB); }

  // Hòa Khiêm điện: the double hall, yellow glazed since the restoration; 8–9 m to the ridge
  const hkBase = Math.max(yA, gMax(HOA_KHIEM));
  hall(S, HOA_KHIEM, { front: east, base: hkBase, plinth: 0.55, wallH: 3.9, top: gY(...HK_C) + 7.6, roof: C.roofY, wall: C.lacquer, double: true });
  claim(HOA_KHIEM);
  flight(S, TA.P(26.4, 0), TA.P(25.2, 0), 4, hkBase + 0.55, yA, C.stoneGrey, false);
  // Lương Khiêm điện behind it, the same form
  hall(S, LUONG_KHIEM, { front: east, base: Math.max(yB, gMax(LUONG_KHIEM)), plinth: 0.5, wallH: 3.8, rh: 3.1, roof: C.roofY, wall: C.lacquer, double: true });
  claim(LUONG_KHIEM);
  // Minh Khiêm đường, the theatre, on the left (north), restored; Ôn Khiêm on the right (south), still old
  hall(S, MINH_KHIEM, { front: [TA.v[0], TA.v[1]], plinth: 0.5, wallH: 3.9, rh: 3.3, roof: C.roofY, wall: C.lacquer, double: true });
  claim(MINH_KHIEM);
  hall(S, ON_KHIEM, { front: [-TA.v[0], -TA.v[1]], plinth: 0.45, wallH: 3.4, rh: 2.6, roof: C.roofYOld, wall: C.lacquerOld, double: true });
  claim(ON_KHIEM);
  // Pháp Khiêm and Lễ Khiêm vu, the side halls facing across the front court
  hall(S, PHAP_KHIEM, { front: [TA.v[0], TA.v[1]], plinth: 0.45, wallH: 3.2, rh: 2.4, roof: C.roofYOld });
  hall(S, LE_KHIEM, { front: [-TA.v[0], -TA.v[1]], plinth: 0.45, wallH: 3.2, rh: 2.4, roof: C.roofYOld });
  claim(PHAP_KHIEM); claim(LE_KHIEM);
  // the two small links beside Lương Khiêm
  for (const [x, z] of LINKS) {
    const y = gY(x, z) + 0.4;
    block(S, x, z, y, 3.6, 3.6, TA.a, C.stoneGrey, C.stone);
    S.kind = KIND.TIMBER; S.box(x, z, y, y + 2.6, 2.8, 2.8, TA.a, C.lacquerOld);
    S.hip(x, z, 2.8, 2.8, TA.a, y + 2.6, 1.3, C.roofYOld, { flare: 0.25, over: 0.6, hips: true, glazed: true });
    claimed.push([x, z]);
  }
  // Chí Khiêm đường, further right: the hall across the back facing north, two wings facing in
  hall(S, CHI_KHIEM[0], { front: [0, -1], plinth: 0.45, wallH: 3.3, rh: 2.5, roof: C.roofYOld });
  hall(S, CHI_KHIEM[1], { front: [1, 0], plinth: 0.4, wallH: 3.0, rh: 2.0, roof: C.roofYOld });
  hall(S, CHI_KHIEM[2], { front: [-1, 0], plinth: 0.4, wallH: 3.0, rh: 2.0, roof: C.roofYOld });
  claimed.push([-2401.4, 4096.4]);
  { // its court, paved, in the U
    const y = gMax([[-2406, 4086], [-2398, 4086], [-2398, 4099], [-2406, 4099]]) + 0.1;
    terrace(S, -2402, 4092, 9, 15, Math.PI / 2, y);
  }

  // ================= Lưu Khiêm lake: the two tạ on piles =================
  // Xung Khiêm tạ, where the emperor composed and read: 5–6 m from the bank to the ridge
  waterPavilion(S, XUNG_KHIEM, { deck: LAKE_Y + 0.6, wallH: 2.8, top: gY(...XK_C) + 4.7 });
  claim(XUNG_KHIEM);
  // its landing: steps from the deck down to the bank on the north
  flight(S, [-2340, 3985.6], [-2340, 3981.2], 3.2, LAKE_Y + 0.6, gY(-2340, 3981.2) + 0.05);
  // Dũ Khiêm tạ, the landing at the foot of the temple axis
  waterPavilion(S, DU_KHIEM, { deck: LAKE_Y + 0.55, wallH: 2.6, top: LAKE_Y + 0.55 + 4.6 });
  claim(DU_KHIEM);

  // Vụ Khiêm Môn, the east entrance in the La Thành
  gateHouse(S, VU_KHIEM_MON, { h: 3.9, rh: 1.5, roof: C.roofYOld, body: C.stoneGrey });
  claim(VU_KHIEM_MON);

  // ================= the tomb (Khiêm Lăng proper), its axis running west up the hill =================
  const TB = frame(centre(BI_DINH), [-92.9, 13.1]);
  // Bái Đình: the salutation court, two rows of mandarins with an elephant and a horse on each side
  const yBD = gY(...TB.P(-24, 0)) + 0.3;
  { const c = TB.P(-35, 0); terrace(S, c[0], c[1], 22, 24, TB.a, yBD); }
  { const a = TB.P(-46, 0), b = TB.P(-56, 0); flight(S, a, b, 5, yBD, gY(...b) + 0.05); }
  for (const sg of [-1, 1]) {
    { const q = TB.P(-42.5, sg * 7.2); elephant(S, q[0], q[1], yBD, TB.a + Math.PI / 2 * -sg); }
    { const q = TB.P(-38.5, sg * 7.2); horse(S, q[0], q[1], yBD, TB.a + Math.PI / 2 * -sg); }
    for (let i = 0; i < 3; i++) for (const t of [4.2, 7.4]) { const q = TB.P(-34 + i * 3.4, sg * t); mandarin(S, q[0], q[1], yBD, TB.a + Math.PI / 2 * -sg, t > 5); }
  }
  // the stele platform, up a flight from the court
  const yST = gMax([TB.P(-13.5, -13), TB.P(-13.5, 13), TB.P(13.5, -13), TB.P(13.5, 13)]) + 0.35;
  { const c = TB.P(0, 0); terrace(S, c[0], c[1], 27, 26, TB.a, yST); }
  flight(S, TB.P(-24, 0), TB.P(-13.5, 0), 4.5, yBD, yST);
  // Bi Đình: four thick brick walls with an arch in each, roofless, round the stele
  {
    const o = obb(BI_DINH), a = o.a, ux = Math.cos(a), uz = Math.sin(a), vx = -uz, vz = ux;
    const P = (u, v) => [o.c[0] + ux * u + vx * v, o.c[1] + uz * u + vz * v];
    const hw = o.w / 2, hd = o.d / 2, th = 1.3, H = 6.2, dw = 2.6, dh = 4.1;
    S.kind = KIND.MASONRY;
    S.box(o.c[0], o.c[1], yST - 0.2, yST + 0.35, o.w + 1.2, o.d + 1.2, a, C.stoneGrey, { top: C.stone, topKind: KIND.ROAD });
    const y0 = yST + 0.35;
    const side = (p, q, along, len, ang) => {
      // two piers either side of the arch, and the wall over it
      const pl = (len - dw) / 2;
      for (const sg of [-1, 1]) { const c = [(p[0] + q[0]) / 2 + along[0] * sg * (dw / 2 + pl / 2), (p[1] + q[1]) / 2 + along[1] * sg * (dw / 2 + pl / 2)]; S.box(c[0], c[1], y0, y0 + H, pl, th, ang, C.brickMoss, { top: C.moss }); }
      const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      S.box(m[0], m[1], y0 + dh, y0 + H, dw, th, ang, C.brickMoss, { top: C.moss });
      S.box(m[0], m[1], y0 + H, y0 + H + 0.35, len + 0.3, th + 0.3, ang, C.stoneDark);
    };
    side(P(-hw, -hd + th / 2), P(hw, -hd + th / 2), [ux, uz], o.w, a);
    side(P(-hw, hd - th / 2), P(hw, hd - th / 2), [ux, uz], o.w, a);
    side(P(-hw + th / 2, -hd), P(-hw + th / 2, hd), [vx, vz], o.d - th * 2, a + Math.PI / 2);
    side(P(hw - th / 2, -hd), P(hw - th / 2, hd), [vx, vz], o.d - th * 2, a + Math.PI / 2);
    claim(BI_DINH);
    // the Khiêm Cung Ký stele on its pedestal, its face down the axis
    S.box(o.c[0], o.c[1], y0, y0 + 0.9, 1.4, 3.1, TB.a, C.stoneGrey, { top: C.stoneDark });
    S.box(o.c[0], o.c[1], y0 + 0.9, y0 + 4.9, 0.7, 2.3, TB.a, C.stoneDark);
    S.box(o.c[0], o.c[1], y0 + 4.9, y0 + 5.35, 0.85, 2.5, TB.a, shade(C.stoneDark, 0.9), { taper: 0.85 });
  }
  // the two trụ biểu behind the Bi Đình
  {
    const d = [PILLAR[0] - TB.o[0], PILLAR[1] - TB.o[1]], s = d[0] * TB.u[0] + d[1] * TB.u[1], t = d[0] * TB.v[0] + d[1] * TB.v[1];
    for (const sg of [1, -1]) {
      const [x, z] = TB.P(s, t * sg), y = gY(x, z);
      S.kind = KIND.MASONRY;
      S.box(x, z, y - 0.4, y + 0.9, 2.0, 2.0, TB.a, C.stoneGrey, { top: C.stoneDark });
      S.box(x, z, y + 0.9, y + 7.0, 1.05, 1.05, TB.a, C.brickMoss, { taper: 0.85 });
      S.box(x, z, y + 7.0, y + 7.5, 1.2, 1.2, TB.a, C.stoneDark);
      S.box(x, z, y + 7.5, y + 8.2, 0.7, 0.7, TB.a, C.stucco, { taper: 0.4 });
    }
  }
  // Tiểu Khiêm Trì: a low stone kerb round the crescent (the water is the pond builder's)
  wallLine(S, CRESCENT, 0.35, 0.35, C.stoneGrey, { closed: true, cap: C.stoneDark, piece: 4 });
  // Bửu Thành: the outer and inner walls, the gate in the outer wall, a screen, the sepulchre
  {
    const gs = 65.6; // the mapped gate's place on the axis
    const gate = obb(BUU_THANH_GATE);
    gateHouse(S, BUU_THANH_GATE, { h: 3.9, rh: 1.7, roof: C.roofYOld, body: C.brickMoss, openings: 1 });
    claim(BUU_THANH_GATE);
    const gb = gMax(corners(gate)) + 0.3;
    { const a = TB.P(gs - 3.4, 0), b = TB.P(gs - 8.2, 0); flight(S, a, b, 3.4, gb, gY(...b) + 0.05); }
    const outer = [TB.P(gs, -4.6), TB.P(gs, -15), TB.P(106, -15), TB.P(106, 15), TB.P(gs, 15), TB.P(gs, 4.6)];
    wallLine(S, outer, 2.5, 0.7, C.brickMoss);
    const inner = [TB.P(84, -1.6), TB.P(84, -8), TB.P(103, -8), TB.P(103, 8), TB.P(84, 8), TB.P(84, 1.6)];
    wallLine(S, inner, 1.9, 0.55, C.brickMoss);
    paving(S, TB, 84.4, 102.6, -7.6, 7.6, 4.6);
    // the screen (bình phong) behind the gate
    { const q = TB.P(73, 0); block(S, q[0], q[1], gY(...q) + 2.6, 0.6, 5.2, TB.a, C.stucco, C.stoneDark); }
    // a paved walk up the court to the inner wall
    { const n0 = S.n; for (let s = gs + 3; s < 84; s += 3) { const q = TB.P(s + 1.5, 0); S.kind = KIND.MASONRY; S.box(q[0], q[1], gY(...q) - 0.3, gY(...q) + 0.12, 3.05, 2.4, TB.a, C.stoneGrey, { top: C.stone, topKind: KIND.ROAD }); } (S.paved = S.paved || []).push([n0, S.n]); }
    // the sepulchre platform and the bửu phong on it (2.96 × 1.58 × 2.47 m)
    const o = obb(SEPULCHRE), yP = gMax(corners(o)) + 0.6;
    block(S, o.c[0], o.c[1], yP, o.w, o.d, o.a, C.stoneGrey, C.stone);
    S.kind = KIND.MASONRY;
    S.box(o.c[0], o.c[1], yP, yP + 2.1, 2.96, 1.58, TB.a, C.stoneDark);
    S.box(o.c[0], o.c[1], yP + 2.1, yP + 2.47, 3.1, 1.7, TB.a, shade(C.stoneDark, 0.9), { taper: 0.7 });
    claim(SEPULCHRE);
    keep.push(...[outer]);
  }

  // ================= Khiêm Thọ Lăng: Empress Lệ Thiên Anh, across the lake, facing south-east =================
  {
    const F = frame(KHIEM_THO, [0.62, 0.785]); // s runs forward, down the four tiers
    const tiers = [[-6, 9.5], [9.5, 15], [15, 20.2], [20.2, 25.5]];
    let prev = null;
    for (const [s0, s1] of tiers) {
      const y = gY(...F.P(s0, 0)) + 0.45;
      const c = F.P((s0 + s1) / 2, 0);
      terrace(S, c[0], c[1], s1 - s0, 21.3, F.a, y, C.stone, C.stoneGrey);
      if (prev != null && prev > y + 0.2) flight(S, F.P(s0 - 0.1, 0), F.P(s0 + 1.6, 0), 2.6, prev, y, C.stoneGrey, false);
      prev = y;
    }
    // the outer wall (31.5 × 21.3, open at the front) and the inner one round the bửu phong
    wallLine(S, [F.P(25.5, 2), F.P(25.5, 10.65), F.P(-6, 10.65), F.P(-6, -10.65), F.P(25.5, -10.65), F.P(25.5, -2)], 2.2, 0.55, C.brickMoss);
    wallLine(S, [F.P(9.5, 1.4), F.P(9.5, 7.3), F.P(-4.5, 7.3), F.P(-4.5, -7.3), F.P(9.5, -7.3), F.P(9.5, -1.4)], 1.8, 0.45, C.brickMoss);
    const yb = gY(...F.P(-6, 0)) + 0.45;
    S.kind = KIND.MASONRY;
    S.box(KHIEM_THO[0], KHIEM_THO[1], yb, yb + 0.5, 5.4, 3.2, F.a, C.stoneGrey, { top: C.stone });
    S.box(KHIEM_THO[0], KHIEM_THO[1], yb + 0.5, yb + 2.5, 2.96, 1.58, F.a, C.stoneDark);
    S.box(KHIEM_THO[0], KHIEM_THO[1], yb + 2.5, yb + 2.9, 3.1, 1.7, F.a, shade(C.stoneDark, 0.9), { taper: 0.7 });
    // the screen with its porcelain mosaic, in front of the gate
    { const q = F.P(28, 0); block(S, q[0], q[1], gY(...q) + 2.4, 5.4, 0.6, F.a, C.mosaic, C.stoneDark); }
    claimed.push(KHIEM_THO);
    keep.push(rect(F, -7, 29, -12, 12));
  }

  // ================= Bồi Lăng: Emperor Kiến Phúc, his temple Chấp Khiêm and the walled sepulchre =================
  hall(S, CHAP_KHIEM, { front: [1, 0], plinth: 0.5, wallH: 3.6, rh: 2.8, roof: C.roofYOld, double: true });
  claim(CHAP_KHIEM);
  for (const r of CHAP_WINGS) { hall(S, r, { plinth: 0.4, wallH: 3.0, rh: 1.9, roof: C.roofTile, glazed: false }); claim(r); }
  {
    const o = obb(BOI_LANG), y = gMax(corners(o, 2)) + 0.4;
    paving(S, frame([-2371.5, 3831.2], [1, 0]), -9.2, 9.2, -11, 11, 4.6);
    terrace(S, o.c[0], o.c[1], 9, 12, Math.PI / 2, y);
    S.kind = KIND.MASONRY;
    S.box(o.c[0], o.c[1], y, y + 0.4, o.w, o.d, o.a, C.stoneGrey, { top: C.stone });
    S.box(o.c[0], o.c[1], y + 0.4, y + 1.9, o.w * 0.7, o.d * 0.55, o.a, C.stoneDark, { taper: 0.8 });
    claim(BOI_LANG);
    wallLine(S, [[-2368.3, 3842.5], [-2362, 3842.5], [-2362, 3820], [-2381, 3820], [-2381, 3842.5], [-2374.7, 3842.5]], 1.9, 0.5, C.brickMoss);
  }

  // ================= the La Thành round the whole precinct =================
  const site = data && data.sites && data.sites.tuduc;
  const waters = site ? site.items.filter((i) => i.k === 'w' && i.ring && i.ring.length >= 6).map((i) => { const r = []; for (let k = 0; k + 1 < i.ring.length; k += 2) r.push([i.ring[k] / 10, i.ring[k + 1] / 10]); return r; }) : [];
  // footways and lanes crossing it open a gap; so do the mapped buildings standing on its line
  const paths = [];
  for (const [c, bridge, flat] of (data && data.roads) || []) {
    if (bridge) continue;
    for (let i = 0; i + 3 < flat.length; i += 2) {
      const ax = flat[i] / 10, az = flat[i + 1] / 10, bx = flat[i + 2] / 10, bz = flat[i + 3] / 10;
      if (Math.hypot((ax + bx) / 2 + 2490, (az + bz) / 2 - 3975) < 330) paths.push([ax, az, bx, bz, [15, 12, 9.5, 6.5, 4, 2.2][c] || 2.2]);
    }
  }
  const near = (x, z, [ax, az, bx, bz]) => { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - ax - t * dx, z - az - t * dz); };
  const items = site ? site.items.filter((i) => (i.k || 'b') === 'b' && i.ring && i.ring.length >= 6).map((i) => { const r = []; for (let k = 0; k + 1 < i.ring.length; k += 2) r.push([i.ring[k] / 10, i.ring[k + 1] / 10]); return r; }) : [];
  const vk = centre(VU_KHIEM_MON);
  wallLine(S, LA_THANH, 2.5, 0.75, C.brickMoss, {
    closed: true, piece: 6, cap: C.stoneDark,
    skip: (x, z) => waters.some((r) => inRing(x, z, r)) || Math.hypot(x - vk[0], z - vk[1]) < 6.5 ||
      paths.some((p) => near(x, z, p) < p[4] / 2 + 2.2) || items.some((r) => inRing(x, z, corners(obb(r), 2.5))) || keep.some((r) => inRing(x, z, r)),
  });

  // ================= the rest of the mapped buildings in the site (service houses, the village outside) =================
  for (const r of items) {
    const c = centre(r);
    if (claimed.some((p) => Math.hypot(p[0] - c[0], p[1] - c[1]) < 4)) continue;
    const o = obb(r), tiny = Math.max(o.w, o.d) < 8;
    hall(S, r, { plinth: 0.35, wallH: tiny ? 2.6 : 3.0, rh: tiny ? 1.5 : 2.0, roof: C.roofTile, wall: tiny ? C.stucco : C.lacquerOld, glazed: false, over: 0.7 });
  }
  S.kind = KIND.PLAIN;
  S.base = 0;
}
