import { KIND, hex, shade, unflat, obb } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { pavilion } from '../citadel.js';

// ---- Lăng Đồng Khánh (Tư Lăng), tomb of Emperor Đồng Khánh, Thủy Xuân, Huế ----
//
// Sources (docs/places/dongkhanh.md has the full list):
//  - vi.wikipedia.org/wiki/Lăng_Đồng_Khánh: two zones, the temple (khu tẩm điện) facing south-east with a half-moon
//    pond dug in front as its minh đường, and the tomb facing east-south-east. Temple wall: a rectangle of brick, 3 m
//    high, 0.55 m thick, 262 m round, gates on all four sides; Cung Môn, the main gate, of wood, three bays and two
//    storeys, fifteen blue-stone steps with dragon cheeks in front of it and three steps down behind it to the court;
//    the side and rear gates arched, with cast roofs imitating tile. Điện Ngưng Hy: three joined houses (三), each
//    seven bays and two wings, on a 25 m x 24 m base, glazed ridges and gables; in front Công Nghĩa đường (left) and
//    Minh Ân viện (right), three bays and two wings; at the back Tả / Hữu tòng viện, the same. Tomb: the grave in
//    three square brick walls, the outer 25 x 25 m and 1.6 m high (0.5 m thick), the middle 0.5 m high (0.7 m
//    thick), the inner 3.4 m high (0.6 m thick), each with one gate on the front, a screen with a tiger and the
//    character thọ behind the outer gate; the grave a blue-stone "house" 4.2 m x 2.6 m.
//  - khamphahue.com.vn: Bái Đình, Bi Đình, Bửu Thành and Huyền Cung built 1916-1923 under Khải Định in cement and
//    steel; the mandarins of brick and lime, tall and slender; the Bi Đình neo-classical with Asian touches, roofed
//    in ardoise (slate). mia.vn: a three-level court before the tomb; the Bái Đình court with two rows of elephants,
//    horses, civil and military mandarins in front of the stele house. vanhoanghean.vn: two trụ biểu of rendered
//    brick either side of the stele house. laodong.vn: the horses here are of cement.
//  - OpenStreetMap: Ngưng Hy (way 264285407), Cung Môn (264285403), the two front side halls (264285404 / 405), the
//    steps before the gate (1473253253), the half-moon pond (251679817, drawn by the water layer, not here); at the
//    tomb the stele house (627391948), the paved path round the stele court (1473256420), the path along the Bửu
//    Thành wall (1473256419) and the tomb node (4425212171).
// Estimated: the levels of the courts (from the terrain), bay heights and roof pitches, the rear halls' places, the
// side gates' places, the statue count (8 a side), the Bái Đình split into three levels down the slope east of the
// stele court, the trụ biểu height, the inner Bửu Thành walls' sizes.

const C = {
  brick: hex('#6c6656'), brickMoss: hex('#5f6350'), cap: hex('#7e7a70'),
  stone: PAL.stone, blueStone: hex('#6f7472'), paving: hex('#a39d8c'),
  lacquer: hex('#8a3529'), lacquerOld: hex('#73392e'), gold: hex('#c9a246'),
  roofY: hex('#c89a3a'), roofYOld: hex('#ad8a44'), ridge: hex('#e3cf86'),
  stucco: hex('#827f78'), stuccoDark: hex('#5e5c58'), lawn: hex('#a1a574'), retain: hex('#8a8474'), slate: hex('#4f4f4e'),
  mandarin: hex('#6e6c66'), door: hex('#2b2422'),
};
const gY = (x, z) => LAND_Y + rise(x, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// a frame along an axis: s forward (the way the place faces), t to the right of s (x east, z south)
function axis(o, f) {
  const l = Math.hypot(f[0], f[1]), ux = f[0] / l, uz = f[1] / l;
  return { a: Math.atan2(uz, ux), P: (s, t = 0) => [o[0] + ux * s - uz * t, o[1] + uz * s + ux * t] };
}
// lowest and highest ground over an (s, t) rectangle of a frame
function span(F, s0, s1, t0, t1) {
  let lo = Infinity, hi = -Infinity;
  const ns = Math.max(2, Math.ceil((s1 - s0) / 4)), nt = Math.max(2, Math.ceil((t1 - t0) / 4));
  for (let i = 0; i <= ns; i++) for (let j = 0; j <= nt; j++) {
    const p = F.P(s0 + ((s1 - s0) * i) / ns, t0 + ((t1 - t0) * j) / nt), y = gY(p[0], p[1]);
    lo = Math.min(lo, y); hi = Math.max(hi, y);
  }
  return { lo, hi };
}

export const id = 'dongkhanh';

export function build({ S, data }) {
  const P0 = S.n;
  grounds(S, data);
  temple(S);
  tomb(S);
  family(S, data);
  (S.paved = S.paved || []).push([P0, S.n]);
  S.kind = KIND.PLAIN; S.base = 0;
}

// ---------- the precinct's grounds ----------
// Lawn over the land between the temple, the pond and the tomb, a hand's breadth over the terrain and following it,
// so the precinct's open ground reads as kept grass and no village houses stand in it. The lanes (drawn by the road
// layer) and the pond are left open.
const POND = [[66.3, -40.1], [58.9, -40.6], [23.8, -18.4], [19.5, -13.2], [19.1, -7.4], [32.0, 20.8], [41.6, 29.7], [53.5, 35.5], [72.6, 35.1], [81.7, 30.8], [87.2, 23.1], [87.5, 15.2], [71.3, -34.2]]
  .map(([x, z]) => [x - 2045, z + 4360]);
function grounds(S, data) {
  const TF = axis([-2049.8, 4261.7], [0.57696, 0.81678]), BF = axis([-2193.9, 4338.8], [0.9965, 0.084]);
  const loc = (F, x, z) => { const dx = x - F.P(0)[0], dz = z - F.P(0)[1], c = Math.cos(F.a), sn = Math.sin(F.a); return [dx * c + dz * sn, -dx * sn + dz * c]; };
  const inside = (x, z, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
  const roads = [];
  for (const r of data?.roads || []) {
    const p = r[2]; if (!Array.isArray(p)) continue;
    for (let i = 0; i + 3 < p.length; i += 2) {
      const a = [p[i] / 10, p[i + 1] / 10], b = [p[i + 2] / 10, p[i + 3] / 10];
      if (Math.max(a[0], b[0]) < -2260 || Math.min(a[0], b[0]) > -1990 || Math.max(a[1], b[1]) < 4230 || Math.min(a[1], b[1]) > 4400) continue;
      roads.push([a, b, r[0] === 5 ? 2.2 : 4.2]);
    }
  }
  const nearRoad = (x, z) => roads.some(([a, b, w]) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1), 0, 1); return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz) < w; });
  const want = (x, z) => {
    const [ts, tt] = loc(TF, x, z), [bs, bt] = loc(BF, x, z);
    const inPrecinct = (x > -2145 && x < -2025 && z > 4248 && z < 4372) || (bs > -20 && bs < 92 && Math.abs(bt) < 26);
    if (!inPrecinct) return false;
    if ((ts > -26.6 && ts < 53.4 && Math.abs(tt) < 26.6) || (ts > 53 && ts < 63 && Math.abs(tt) < 7.6)) return false; // the temple's courts and its gate stair
    if ((bs > -13.4 && bs < 13.4 && Math.abs(bt) < 13.4) || (bs > 25.8 && bs < 84.5 && Math.abs(bt) < 11.6) || (bs > 13 && bs < 26 && Math.abs(bt) < 2.6)) return false; // the tomb
    return !inside(x, z, POND) && !nearRoad(x, z);
  };
  // the lift grows with the slope, so every face stays clear of the ground under its middle (a vertex's lift depends
  // only on where it is, so neighbouring faces still meet)
  const G = 2, y = (x, z) => { const gx = gY(x + 1, z) - gY(x - 1, z), gz = gY(x, z + 1) - gY(x, z - 1); return gY(x, z) + 0.3 + 0.75 * G * Math.hypot(gx, gz) / 2; };
  S.kind = KIND.GROUND;
  for (let x = -2200; x < -2020; x += G) for (let z = 4245; z < 4375; z += G) {
    if (!want(x + G / 2, z + G / 2)) continue;
    S.base = gY(x + G / 2, z + G / 2) - LAND_Y;
    S.quad([x, y(x, z), z], [x + G, y(x + G, z), z], [x + G, y(x + G, z + G), z + G], [x, y(x, z + G), z + G], C.lawn, [0, 1, 0]);
  }
}

// ---------- shared pieces ----------
// a level slab over an (s, t) rectangle, from below the lowest ground to `top`
function slab(S, F, s0, s1, t0, t1, top, col = C.paving, side = C.stone) {
  const { lo } = span(F, s0, s1, t0, t1);
  const p = F.P((s0 + s1) / 2, (t0 + t1) / 2);
  S.kind = KIND.MASONRY; S.base = top - LAND_Y;
  S.box(p[0], p[1], Math.min(lo - 0.8, top - 0.3), top, s1 - s0, t1 - t0, F.a, side, { top: col, topKind: KIND.ROAD });
}
// a flight of steps up the axis line from (s0, y0) to (s1, y1), width w, at offset t
function steps(S, F, s0, y0, s1, y1, w, t = 0, { col = C.blueStone, cheeks = 0 } = {}) {
  const n = clamp(Math.round(Math.abs(y1 - y0) / 0.16), 1, 30), len = s1 - s0;
  S.kind = KIND.MASONRY;
  for (let k = 0; k < n; k++) {
    const sa = s0 + (len * k) / n, sb = s0 + (len * (k + 1)) / n, top = y0 + ((y1 - y0) * (k + 1)) / n;
    const p = F.P((sa + sb) / 2, t);
    S.base = top - LAND_Y;
    S.box(p[0], p[1], Math.min(y0, y1) - 0.8, top, Math.abs(sb - sa) + 0.02, w, F.a, col, { top: shade(col, 1.12), topKind: KIND.ROAD });
  }
  if (cheeks) for (const sd of [-1, 1]) { // the dragon cheek walls, a sloping coping
    const a = F.P(s0, t + sd * (w / 2 + cheeks / 2)), b = F.P(s1, t + sd * (w / 2 + cheeks / 2));
    S.beam([a[0], y0 + 0.35, a[1]], [b[0], y1 + 0.35, b[1]], cheeks, 0.9, shade(col, 0.9));
    S.box(a[0], a[1], y0 - 0.5, y0 + 1.1, cheeks + 0.15, cheeks + 0.15, F.a, shade(col, 0.85), { taper: 0.8 });
  }
}
// a wall along a polyline of (s, t) points; `top(p)` gives the level it stands on (defaults to the ground); gaps
// [[s or t position along the run, width], ...] per run are left open
function wall(S, F, pts, h, th, { col = C.brickMoss, cap = C.cap, base = null, gaps = [], maxSeg = 8 } = {}) {
  S.kind = KIND.MASONRY;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const runs = [];
    let f = 0;
    for (const [g, gw] of (gaps[i] || []).slice().sort((p, q) => p[0] - q[0])) { const g0 = g / len - gw / 2 / len, g1 = g / len + gw / 2 / len; if (g0 > f) runs.push([f, g0]); f = Math.max(f, g1); }
    if (f < 1) runs.push([f, 1]);
    for (const [r0, r1] of runs) {
      const rl = (r1 - r0) * len, ns = Math.max(1, Math.ceil(rl / maxSeg));
      for (let k = 0; k < ns; k++) {
        const fa = r0 + ((r1 - r0) * k) / ns, fb = r0 + ((r1 - r0) * (k + 1)) / ns;
        const sa = [a[0] + (b[0] - a[0]) * fa, a[1] + (b[1] - a[1]) * fa], sb = [a[0] + (b[0] - a[0]) * fb, a[1] + (b[1] - a[1]) * fb];
        const pa = F.P(...sa), pb = F.P(...sb), pm = F.P((sa[0] + sb[0]) / 2, (sa[1] + sb[1]) / 2);
        const gs = [gY(...pa), gY(...pb), gY(...pm)];
        const lo = Math.min(...gs) - 0.6, on = base != null ? base(sa, sb) : Math.max(...gs);
        S.base = on - LAND_Y;
        S.box(pm[0], pm[1], lo, on + h, rl / ns + (k === ns - 1 ? th * 0.5 : 0), th, Math.atan2(pb[1] - pa[1], pb[0] - pa[0]), col, { top: cap });
        S.box(pm[0], pm[1], on + h, on + h + 0.12, rl / ns, th + 0.14, Math.atan2(pb[1] - pa[1], pb[0] - pa[0]), cap);
      }
    }
  }
}
// an arched masonry gate on a wall: w along the wall, d through it; a cast roof imitating tiles
function archGate(S, cx, cz, a, w, d, y0, h, { col = C.brickMoss, roof = C.roofYOld, open = 2.0 } = {}) {
  S.kind = KIND.MASONRY; S.base = y0 - LAND_Y;
  S.box(cx, cz, y0 - 1, y0 + h, w, d, a, col, { top: shade(col, 0.9) });
  S.kind = KIND.PLAIN;
  S.box(cx, cz, y0, y0 + h * 0.62, open, d + 0.12, a, C.door);
  S.cyl(cx, cz, y0 + h * 0.62 - 0.01, y0 + h * 0.62 + 0.02, open / 2, open / 2, 8, C.door, { rot: a }); // flat stand-in for the arch head
  const ux = Math.cos(a), uz = Math.sin(a);
  for (const sd of [-1, 1]) S.box(cx - uz * sd * (d / 2 + 0.02), cz + ux * sd * (d / 2 + 0.02), y0 + h * 0.62, y0 + h * 0.62 + open * 0.42, open * 0.72, 0.06, a, C.door, { taper: 0.55 });
  S.hip(cx, cz, w + 0.2, d + 0.4, a, y0 + h, 1.0, roof, { flare: 0.3, over: 0.45, fascia: 0.18, fasciaCol: shade(col, 0.8), ridgeCol: C.ridge, hips: true, glazed: true, segs: 2 });
}

// ---------- the temple: Ngưng Hy Điện and its court ----------
// Frame: the axis of Ngưng Hy and Cung Môn (OSM), facing south-east (bearing 145°) toward the half-moon pond; s = 0
// at the back of the hall's 25 m base, t = 0 on the gate's centre line.
function temple(S) {
  const F = axis([-2049.8, 4261.7], [0.57696, 0.81678]);
  const at = F.a + Math.PI / 2; // an angle with the long side across the axis
  const S0 = -26, S1 = 53, T = 26; // the wall: 79 x 52 m, 262 m round
  // court levels down the slope: hall precinct, upper court (the side halls), forecourt behind the gate
  const lvH = span(F, S0, 26, -T, T).hi + 0.1;
  const lvC = Math.min(lvH - 0.3, span(F, 26, 43, -T, T).hi + 0.1);
  const lvF = Math.min(lvC - 0.3, span(F, 43, S1, -T, T).hi + 0.1);
  slab(S, F, S0, 26, -T, T, lvH, C.paving, C.retain);
  slab(S, F, 26, 43, -T, T, lvC, C.paving, C.retain);
  slab(S, F, 43, S1, -T, T, lvF, C.paving, C.retain);
  steps(S, F, 43.1, lvF, 41.5, lvC, 6);
  for (const t of [-14, 14]) steps(S, F, 43.1, lvF, 41.5, lvC, 3, t);
  steps(S, F, 26.1, lvC, 24.4, lvH, 7);
  // a stone path (thần đạo) down the court
  { const p = F.P(34.5); S.kind = KIND.MASONRY; S.box(p[0], p[1], lvC - 0.2, lvC + 0.06, 15, 3, F.a, C.blueStone, { topKind: KIND.ROAD }); }
  { const p = F.P(48); S.box(p[0], p[1], lvF - 0.2, lvF + 0.06, 10, 3, F.a, C.blueStone, { topKind: KIND.ROAD }); }

  // Điện Ngưng Hy: a 25 x 24 m stone base, three houses joined under three roofs (front, main, rear)
  const hb0 = -2.7, hb1 = 21.3, plinth = lvH + 0.75;
  slab(S, F, hb0 - 1, hb1 + 1, -13.5, 13.5, plinth, shade(C.paving, 1.04), C.blueStone);
  for (const t of [-8, 0, 8]) steps(S, F, hb1 + 2.6, lvH, hb1 + 1, plinth, t ? 2.6 : 3.6, t, { cheeks: 0.4 });
  // the ridge 8-9 m over the ground at the hall (docs/heights-reference.json): main house 8.6, the others lower
  const g0 = gY(...F.P(9, 0)), d3 = (hb1 - hb0) / 3;
  const houses = [
    { s: hb1 - d3 / 2, w: 25, top: g0 + 7.9, wallH: 3.5, open: true }, // tiền điện, the open verandah house
    { s: hb1 - d3 * 1.5, w: 25, top: g0 + 8.6, wallH: 3.9, open: false }, // chính điện
    { s: hb0 + d3 / 2, w: 23, top: g0 + 7.6, wallH: 3.5, open: false }, // hậu điện, added behind
  ];
  for (const hs of houses) {
    const p = F.P(hs.s), d = d3 - 0.2;
    S.base = plinth - LAND_Y;
    pavilion(S, p[0], p[1], hs.w, d, at, plinth, { wallH: hs.wallH, rh: hs.top - plinth - hs.wallH, roof: C.roofY, wall: C.lacquer, over: 1.0, colonnade: hs.open, segs: 3 });
  }
  // glazed gable panels (pháp lam) and the gilded door bays on the front
  {
    S.kind = KIND.PLAIN;
    for (let k = -3; k <= 3; k++) {
      const p = F.P(hb1 - 1.5, k * 3.3);
      S.box(p[0], p[1], plinth, plinth + 2.9, 0.08, 2.2, F.a, k % 2 ? C.lacquerOld : shade(C.gold, 0.8));
    }
  }

  // side halls: Công Nghĩa đường and Minh Ân viện at the front, the two tòng viện at the back (3 bays + 2 wings)
  for (const sd of [-1, 1]) {
    const pf = F.P(31, sd * 18.5);
    S.kind = KIND.MASONRY; S.base = lvC - LAND_Y;
    S.box(pf[0], pf[1], lvC - 0.4, lvC + 0.45, 17, 12, F.a, C.stone, { top: shade(C.paving, 1.04), topKind: KIND.ROAD });
    pavilion(S, pf[0], pf[1], 15.5, 10, F.a, lvC + 0.45, { wallH: 3.0, rh: 2.6, roof: C.roofYOld, wall: C.lacquerOld, over: 0.9, segs: 2 });
    const pb = F.P(-11.5, sd * 19.5);
    S.kind = KIND.MASONRY; S.base = lvH - LAND_Y;
    S.box(pb[0], pb[1], lvH - 0.4, lvH + 0.4, 17, 11, F.a, C.stone, { top: shade(C.paving, 1.04), topKind: KIND.ROAD });
    pavilion(S, pb[0], pb[1], 15.5, 9.5, F.a, lvH + 0.4, { wallH: 2.9, rh: 2.5, roof: C.roofYOld, wall: C.lacquerOld, over: 0.9, segs: 2 });
  }

  // the wall, 3 m high and 0.55 m thick, on each court's level; Cung Môn in the front, arched gates in the others
  const level = (sa, sb) => { const s = Math.max(sa[0], sb[0]); return s > 43 ? lvF : s > 26 ? lvC : lvH; };
  const ring = [[S1, -T], [S1, T], [S0, T], [S0, -T], [S1, -T]];
  wall(S, F, ring, 3, 0.55, { base: level, gaps: [[[T, 13.4]], [[S1 - 47, 3.6]], [[T, 3.6]], [[S1 - 47, 3.6]]] });
  for (const sd of [-1, 1]) { const p = F.P(47, sd * T); archGate(S, p[0], p[1], F.a, 3.6, 1.4, lvF, 3.4); }
  { const p = F.P(S0, 0); archGate(S, p[0], p[1], at, 4.2, 1.4, lvH, 3.6); }

  // Cung Môn: three bays, two storeys of wood on its own terrace, three steps down to the forecourt behind it and
  // fifteen blue-stone steps with dragon cheeks down to the lane and the pond in front
  const gTop = lvF + 0.45;
  { const p = F.P(S1 + 0.5); S.kind = KIND.MASONRY; S.base = gTop - LAND_Y; S.box(p[0], p[1], span(F, S1 - 4, S1 + 5, -8, 8).lo - 0.8, gTop, 9, 15, F.a, C.blueStone, { top: shade(C.paving, 1.05), topKind: KIND.ROAD }); }
  steps(S, F, S1 - 4.5, lvF, S1 - 3.9, gTop, 5);
  { const p = F.P(S1 + 0.5); S.base = gTop - LAND_Y; pavilion(S, p[0], p[1], 12.6, 6.4, at, gTop, { tiers: 2, wallH: 3.3, rh: 2.3, roof: C.roofY, wall: C.lacquer, over: 0.9, colonnade: true, segs: 3 }); }
  const foot = F.P(S1 + 5 + 4.6), footY = Math.max(gY(...foot), gTop - 15 * 0.17);
  steps(S, F, S1 + 5 + 4.6, footY, S1 + 5, gTop, 5, 0, { cheeks: 0.5 });
}

// ---------- the tomb: Bái Đình, Bi Đình, trụ biểu, Bửu Thành ----------
// Frame: from the middle of the Bửu Thành (OSM path round its wall) east through the stele house (OSM), facing east
// by 5° south. s = 0 at the grave.
function tomb(S) {
  const F = axis([-2193.9, 4338.8], [0.9965, 0.084]);
  const at = F.a + Math.PI / 2;
  const M = (s, t, h, col = C.mandarin) => statue(S, F, s, t, h, col);

  // Bửu Thành: three square walls round the grave, each with one gate in the front
  const bF = span(F, -13, 13, -13, 13).hi + 0.3;
  slab(S, F, -13, 13, -13, 13, bF, shade(C.paving, 0.95), C.brick);
  const sq = (r) => [[r, -r], [r, r], [-r, r], [-r, -r], [r, -r]];
  const flat = (y) => () => y;
  wall(S, F, sq(12.5), 1.6, 0.5, { base: flat(bF), gaps: [[[12.5, 2.4]]] });
  for (const sd of [-1, 1]) { const p = F.P(12.5, sd * 1.5); S.kind = KIND.MASONRY; S.box(p[0], p[1], bF, bF + 2.3, 0.7, 0.7, F.a, C.brickMoss, { top: C.cap }); }
  // the screen behind the outer gate, a tiger and 壽 on its face
  { const p = F.P(10.6); S.kind = KIND.MASONRY; S.box(p[0], p[1], bF, bF + 2.3, 0.45, 4.2, F.a, C.stucco, { top: C.cap }); const q = F.P(10.85); S.kind = KIND.PLAIN; S.box(q[0], q[1], bF + 0.6, bF + 1.9, 0.06, 1.8, F.a, C.stuccoDark); }
  wall(S, F, sq(8.6), 0.5, 0.7, { base: flat(bF), gaps: [[[8.6, 2.0]]] });
  const iF = bF + 0.35;
  slab(S, F, -6.2, 6.2, -6.2, 6.2, iF, shade(C.paving, 0.9), C.brick);
  wall(S, F, sq(6), 3.4, 0.6, { base: flat(iF), gaps: [[[6, 1.6]]] });
  { const p = F.P(6); S.kind = KIND.MASONRY; S.box(p[0], p[1], iF, iF + 3.9, 0.9, 2.8, F.a, C.brickMoss, { top: C.cap }); S.kind = KIND.PLAIN; S.box(p[0], p[1], iF, iF + 2.4, 0.95, 1.3, F.a, hex('#3a3a30')); S.hip(p[0], p[1], 2.8, 1.2, at, iF + 3.9, 0.7, C.slate, { flare: 0.2, over: 0.3, ridgeCol: C.stuccoDark, hips: true }); }
  // the grave: a blue-stone house 4.2 x 2.6 m, its roof ridge with dragons
  {
    const p = F.P(-0.5);
    S.kind = KIND.MASONRY; S.base = iF - LAND_Y;
    S.box(p[0], p[1], iF, iF + 0.5, 5.0, 3.4, F.a, shade(C.blueStone, 0.9));
    S.box(p[0], p[1], iF + 0.5, iF + 1.5, 4.2, 2.6, F.a, C.blueStone);
    S.hip(p[0], p[1], 4.2, 2.6, F.a, iF + 1.5, 0.8, shade(C.blueStone, 0.85), { flare: 0.15, over: 0.25, ridgeCol: shade(C.blueStone, 1.1), hips: true });
  }

  // the paved way from the stele court to the Bửu Thành gate
  const cF = span(F, 26, 52, -10.5, 10.5).hi + 0.35;
  slab(S, F, 13, 26, -2.5, 2.5, Math.min(bF, cF), C.paving, C.brick);

  // the stele court (OSM path round it), the Bi Đình in it with a trụ biểu each side
  slab(S, F, 26, 52, -10.5, 10.5, cF);
  const sF = cF + 0.7;
  slab(S, F, 37, 48.6, -5.8, 5.8, sF, shade(C.paving, 1.05), C.stuccoDark);
  for (const s of [49.4, 36.2]) steps(S, F, s, cF, s + (s > 40 ? -0.8 : 0.8), sF, 3);
  biDinh(S, F, 42.8, sF);
  for (const sd of [-1, 1]) truBieu(S, F, 44, sd * 8.2, cF);

  // Bái Đình: three levels down the slope east of the stele house, two rows of statues a side on each
  let prev = cF;
  const lv = [];
  for (let k = 0; k < 3; k++) {
    const s0 = 52 + k * 10, s1 = s0 + 10, y = Math.min(prev - 0.35, span(F, s0, s1, -10.5, 10.5).hi + 0.2);
    slab(S, F, s0, s1, -10.5, 10.5, y);
    steps(S, F, s0 + 1.4, y, s0 - 0.1, prev, 4);
    lv.push(y); prev = y;
  }
  steps(S, F, 84.2, Math.max(gY(...F.P(84.2)), prev - 2), 82, prev, 4);
  // statues: civil and military mandarins (tall, slim, of brick and lime), horses and elephants of cement
  for (const sd of [-1, 1]) {
    for (const s of [54.5, 58.5]) { M(s, sd * 4.2, lv[0]); M(s, sd * 7.4, lv[0]); }
    for (const s of [64.5, 68.5]) { M(s, sd * 4.2, lv[1]); M(s, sd * 7.4, lv[1]); }
    beast(S, F, 76.5, sd * 7, lv[2], false);
    beast(S, F, 76.5, sd * 3.8, lv[2], true);
  }
  // low walls along the sides of the stele court and the Bái Đình
  for (const sd of [-1, 1]) wall(S, F, [[26, sd * 11], [82, sd * 11]], 0.9, 0.4, { base: (sa, sb) => { const s = Math.max(sa[0], sb[0]); return s <= 52.5 ? cF : lv[clamp(Math.floor((s - 52.01) / 10), 0, 2)]; }, maxSeg: 5 });
}

// the stele house: square, rendered concrete with pilasters and round-arched doors on all four sides, a cornice, a
// slate roof of two tiers; the stele inside
function biDinh(S, F, s, y) {
  const p = F.P(s), a = F.a, w = 10.4, wallH = 4.6;
  S.kind = KIND.PLAIN; S.base = y - LAND_Y;
  S.box(p[0], p[1], y, y + wallH, w, w, a, C.stucco);
  for (let i = 0; i < 4; i++) {
    const r = a + (i * Math.PI) / 2, ux = Math.cos(r), uz = Math.sin(r);
    // the arched door: a dark opening with a round head
    S.kind = KIND.PLAIN;
    const q = [p[0] + ux * (w / 2 + 0.02), p[1] + uz * (w / 2 + 0.02)];
    S.box(q[0], q[1], y, y + 2.9, 0.06, 2.4, r, C.door);
    S.box(q[0], q[1], y + 2.9, y + 3.6, 0.06, 2.4, r, C.door, { taper: 0.5 });
    // pilasters at the corners and either side of the door
    S.kind = KIND.PLAIN;
    for (const v of [-4.6, -1.9, 1.9, 4.6]) S.box(q[0] - uz * v, q[1] + ux * v, y, y + wallH, 0.3, 0.65, r, shade(C.stucco, 1.08));
  }
  S.box(p[0], p[1], y + wallH, y + wallH + 0.5, w + 0.7, w + 0.7, a, shade(C.stucco, 1.1), { top: C.stuccoDark });
  S.hip(p[0], p[1], w + 0.4, w + 0.4, a, y + wallH + 0.5, 1.5, C.slate, { flare: 0.3, over: 0.7, fascia: 0.22, fasciaCol: C.stuccoDark, ridgeCol: C.stuccoDark, hips: true, segs: 2 });
  S.box(p[0], p[1], y + wallH + 1.3, y + wallH + 2.9, 5.2, 5.2, a, C.stucco, { top: C.stuccoDark });
  S.hip(p[0], p[1], 5.2, 5.2, a, y + wallH + 2.9, 1.7, C.slate, { flare: 0.3, over: 0.6, fascia: 0.2, fasciaCol: C.stuccoDark, ridgeCol: C.stuccoDark, hips: true, segs: 2 });
  // the stele (1917) on its plinth, seen through the doors
  S.kind = KIND.PLAIN;
  S.box(p[0], p[1], y, y + 0.6, 1.4, 2.6, a, C.blueStone);
  S.box(p[0], p[1], y + 0.6, y + 3.2, 0.3, 1.8, a, shade(C.blueStone, 1.15));
}
// a trụ biểu: a square shaft of rendered brick on a stepped base, a capital and a pointed finial
function truBieu(S, F, s, t, y) {
  const p = F.P(s, t), a = F.a, h = 7.5;
  S.kind = KIND.PLAIN; S.base = y - LAND_Y;
  S.box(p[0], p[1], y - 0.3, y + 0.9, 1.7, 1.7, a, C.stuccoDark);
  S.box(p[0], p[1], y + 0.9, y + h - 1.4, 1.0, 1.0, a, C.stucco, { taper: 0.82 });
  S.box(p[0], p[1], y + h - 1.4, y + h - 0.9, 1.25, 1.25, a, shade(C.stucco, 1.1));
  S.box(p[0], p[1], y + h - 0.9, y + h, 0.7, 0.7, a, C.stuccoDark, { taper: 0.1 });
}
function statue(S, F, s, t, y, col) {
  const p = F.P(s, t), face = t > 0 ? F.a - Math.PI / 2 : F.a + Math.PI / 2;
  S.kind = KIND.PLAIN; S.base = y - LAND_Y;
  S.box(p[0], p[1], y, y + 0.35, 0.8, 0.7, face, shade(col, 0.9));
  S.box(p[0], p[1], y + 0.35, y + 2.15, 0.62, 0.42, face, col, { taper: 0.85 });
  S.box(p[0], p[1], y + 2.15, y + 2.55, 0.3, 0.3, face, shade(col, 0.95));
  S.box(p[0], p[1], y + 2.55, y + 2.7, 0.42, 0.36, face, shade(col, 0.8));
}
function beast(S, F, s, t, y, big, col = C.mandarin) {
  const a = F.a + Math.PI, P = (ds) => F.P(s - ds, t);
  S.kind = KIND.PLAIN; S.base = y - LAND_Y;
  const p = P(0);
  S.box(p[0], p[1], y, y + 0.25, big ? 3.2 : 2.4, big ? 1.6 : 1.0, a, shade(col, 0.9));
  if (big) { // elephant
    S.box(p[0], p[1], y + 0.25, y + 1.2, 2.0, 0.95, a, col);
    S.box(p[0], p[1], y + 1.2, y + 2.2, 2.5, 1.3, a, col);
    const h = P(1.45); S.box(h[0], h[1], y + 0.7, y + 2.3, 0.8, 1.0, a, shade(col, 0.95));
  } else { // horse
    S.box(p[0], p[1], y + 0.25, y + 1.0, 1.4, 0.5, a, col);
    S.box(p[0], p[1], y + 1.0, y + 1.6, 1.9, 0.6, a, col);
    const h = P(0.95); S.box(h[0], h[1], y + 1.4, y + 2.3, 0.5, 0.4, a, shade(col, 0.95));
  }
}

// ---------- the small family tombs and outbuildings mapped in the precinct ----------
function family(S, data) {
  const site = data?.sites?.dongkhanh;
  if (!site) return;
  const OWN = new Set([264285403, 264285404, 264285405, 264285407, 627391948]);
  for (const it of site.items || []) {
    if (!it || !Array.isArray(it.ring) || it.ring.length < 6 || OWN.has(it.id) || it.k === 'w') continue;
    const ring = unflat(it.ring), o = obb(ring);
    if (!o || !(o.w > 0.5)) continue;
    const g = gY(o.c[0], o.c[1]);
    if (it.k === 'h') { // a walled grave plot: low wall round its outline, a grave and a stele inside
      S.kind = KIND.MASONRY;
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i], b = ring[(i + 1) % ring.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (len < 0.3) continue;
        const ya = gY(...a), yb = gY(...b);
        S.base = Math.min(ya, yb) - LAND_Y;
        S.box((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.min(ya, yb) - 0.5, Math.max(ya, yb) + 1.3, len + 0.3, 0.45, Math.atan2(b[1] - a[1], b[0] - a[0]), C.brickMoss, { top: C.cap });
      }
      const s = clamp(Math.min(o.w, o.d) * 0.3, 1.4, 3.5);
      S.base = g - LAND_Y;
      S.box(o.c[0], o.c[1], g - 0.4, g + 0.8, s * 1.4, s, o.a, C.blueStone, { top: shade(C.blueStone, 0.85) });
      const sp = [o.c[0] + Math.cos(o.a) * s * 1.1, o.c[1] + Math.sin(o.a) * s * 1.1];
      S.box(sp[0], sp[1], g, g + 1.6, 0.3, 1.1, o.a, shade(C.blueStone, 0.85));
    } else { // a small tiled house
      let w = o.w, d = o.d, a = o.a;
      if (w < d) { [w, d] = [d, w]; a += Math.PI / 2; }
      const f = g + 0.3;
      S.kind = KIND.MASONRY; S.base = f - LAND_Y;
      S.box(o.c[0], o.c[1], g - 0.6, f, w + 0.8, d + 0.8, a, C.stone);
      pavilion(S, o.c[0], o.c[1], w, d, a, f, { wallH: 2.7, rh: clamp(d * 0.3, 1.3, 2.4), roof: hex('#7a6552'), wall: C.lacquerOld, over: 0.7, segs: 2 });
    }
  }
}
