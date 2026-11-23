import { KIND, hex, shade, unflat, obb } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { rise, pondY } from '../../geo/terrain.js';
import { pavilion } from '../citadel.js';
import * as props from '../props.js';

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
//  - Google satellite and Street View (2026, looked at only, nothing kept): both zones' frames and courts, the annex
//    behind Ngưng Hy, the rear and front side halls' places, the grey side-hall roofs and the terracotta Cung Môn tile,
//    the tomb's three courts with the statue rows between the Bửu Thành and the stele house, and the stele house,
//    trụ biểu and terrace as seen from the lane east of them.
// Estimated: the levels of the courts (from the terrain), bay heights and roof pitches, the side gates' places, the
// statue count (3 mandarins, a horse and an elephant a side), the stele house's and trụ biểu's heights (from the image), the
// inner Bửu Thành walls' sizes.

const C = {
  brick: hex('#6c6656'), brickMoss: hex('#5f6350'), cap: hex('#7e7a70'),
  stone: PAL.stone, blueStone: hex('#6f7472'), paving: hex('#a39d8c'),
  lacquer: hex('#8a3529'), lacquerOld: hex('#73392e'), gold: hex('#c9a246'),
  roofY: hex('#c89a3a'), roofYOld: hex('#ad8a44'), ridge: hex('#e3cf86'),
  stucco: hex('#827f78'), stuccoDark: hex('#5e5c58'), lawn: hex('#a1a574'), retain: hex('#8a8474'), slate: hex('#4f4f4e'),
  mandarin: hex('#6e6c66'), door: hex('#2b2422'),
  roofGrey: hex('#5d5c57'), roofTerra: hex('#a4573b'), render: hex('#7a756a'),
  foot: hex('#4f5148'), court: hex('#66594d'), courtPale: hex('#ada593'), panel: hex('#97938a'),
  pathPale: hex('#b9b5aa'), bank: hex('#8c8a82'), stele: hex('#454848'), stelePale: hex('#b3b0a6'), steleTrim: hex('#5b5e5d'),
};
const gY = (x, z) => LAND_Y + rise(x, z);
// The two zones' frames, set on the Google satellite (2026, checked with scripts' matched top views; imagery is not
// kept in the repo). Temple: the axis of Ngưng Hy and Cung Môn (OSM), bearing 144.8°, which the side walls on the
// satellite confirm to about a degree. Tomb: the middle of the Bửu Thành, facing east by 6.6° south through the
// stele house (the OSM path round the Bửu Thành put it 3 m too far south and 2° too far north).
const TEMPLE_O = [-2049.8, 4261.7], TEMPLE_F = [0.57696, 0.81678];
const TOMB_O = [-2195.1, 4335.9], TOMB_F = [0.99337, 0.11496];
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
  berm(S, data, false); // the low edge of the bank: trees may stand on it
  const P0 = S.n;
  berm(S, data, true);
  temple(S);
  tomb(S);
  embankment(S, data);
  family(S, data);
  (S.paved = S.paved || []).push([P0, S.n]);
  S.kind = KIND.PLAIN; S.base = 0;
}

// ---------- the temple's court levels, shared by the courts, the wall and the bank outside it ----------
// the wall on the satellite: about 72 x 56 m (the wiki's 262 m round is a little more than the 256 m drawn); court
// levels down the slope: hall precinct (to B1), upper court with the side halls (to B2), forecourt behind the gate
const TS0 = -22, TS1 = 50, TT = 28, TB1 = 26.9, TB2 = 43.8;
function templeLevels(F) {
  const lvH = span(F, TS0, TB1, -TT, TT).hi + 0.1;
  const lvC = Math.min(lvH - 0.3, span(F, TB1, TB2, -TT, TT).hi + 0.1);
  const lvF = Math.min(lvC - 0.3, span(F, TB2, TS1, -TT, TT).hi + 0.1);
  return { lvH, lvC, lvF, at: (s) => (s > TB2 ? lvF : s > TB1 ? lvC : lvH) };
}

// ---------- the bank against the temple wall ----------
// The courts are level and the hill falls across them by up to 4 m (most toward Đoàn Như Hài), so on its low sides
// the wall would stand on a tall retaining face. Street View from the road shows the wall and its dark stone foot
// about 3-3.5 m over the grass: the ground is banked up against it, to 0.6 m under the court, and runs out at 1:3.
// Only that bank is drawn here; the rest of the precinct is the terrain's own ground with its trees (the satellite
// shows forest between the temple and the tomb, and planted trees on grass east of the wall). `high`: the part
// raised over 1.2 m, kept clear of trees (planted trees stand on the lower slope, as in the photos); the rest is drawn before the paved range.
function berm(S, data, high) {
  const F = axis(TEMPLE_O, TEMPLE_F), L = templeLevels(F);
  const W = 0.28, R = 15, G = 2;
  const roads = [];
  for (const r of data?.roads || []) {
    const p = r[2]; if (!Array.isArray(p)) continue;
    for (let i = 0; i + 3 < p.length; i += 2) {
      const a = [p[i] / 10, p[i + 1] / 10], b = [p[i + 2] / 10, p[i + 3] / 10];
      if (Math.max(a[0], b[0]) < -2140 || Math.min(a[0], b[0]) > -1960 || Math.max(a[1], b[1]) < 4190 || Math.min(a[1], b[1]) > 4350) continue;
      roads.push([a, b, r[0] === 5 ? 2.4 : 4.6]);
    }
  }
  const nearRoad = (x, z) => roads.some(([a, b, w]) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1), 0, 1); return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz) < w; });
  const lift = (x, z) => { const gx = gY(x + 1, z) - gY(x - 1, z), gz = gY(x, z + 1) - gY(x, z - 1); return gY(x, z) + 0.06 + 0.4 * Math.hypot(gx, gz); };
  // the bank's height over the lifted ground at (s, t) of the frame; it fades out beside Cung Môn's stair
  const excess = (s, t) => {
    const d = Math.hypot(Math.max(TS0 - W - s, 0, s - TS1 - W), Math.max(Math.abs(t) - TT - W, 0));
    if (d > R) return 0;
    const f = s > TS1 ? clamp((Math.abs(t) - 9) / 5, 0, 1) : 1;
    const p = F.P(s, t);
    return f * Math.max(0, L.at(clamp(s, TS0, TS1)) - 0.6 - d / 3 - lift(p[0], p[1]));
  };
  const lin = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
  const sv = [...lin(TS0 - W - R, TS0 - W, R / G), ...lin(TS0 - W, TS1 + W, 36).slice(1), ...lin(TS1 + W, TS1 + W + R, R / G).slice(1)];
  const tv = [...lin(-TT - W - R, -TT - W, R / G), ...lin(-TT - W, TT + W, 28).slice(1), ...lin(TT + W, TT + W + R, R / G).slice(1)];
  S.kind = KIND.GROUND;
  for (let i = 0; i + 1 < sv.length; i++) for (let j = 0; j + 1 < tv.length; j++) {
    const sc = (sv[i] + sv[i + 1]) / 2, tc = (tv[j] + tv[j + 1]) / 2;
    if (sc > TS0 - W && sc < TS1 + W && Math.abs(tc) < TT + W) continue; // inside the wall
    const c = F.P(sc, tc);
    if (nearRoad(c[0], c[1])) continue;
    const corners = [[sv[i], tv[j]], [sv[i + 1], tv[j]], [sv[i + 1], tv[j + 1]], [sv[i], tv[j + 1]]];
    const ex = corners.map(([s, t]) => excess(s, t));
    if (Math.max(...ex) < 0.02 || (excess(sc, tc) > 1.2) !== high) continue;
    const v = corners.map(([s, t], k) => { const p = F.P(s, t); return [p[0], lift(p[0], p[1]) + ex[k], p[1]]; });
    S.base = gY(c[0], c[1]) - LAND_Y;
    S.quad(v[0], v[3], v[2], v[1], C.lawn, [0, 1, 0]);
  }
}

// the half-moon pond's stone-faced bank (Street View from the road shows it all round the far side); the water
// itself is drawn by the water layer from OSM (way 251679817)
function embankment(S, data) {
  const ponds = data?.ponds || [];
  let ring = null, li = -1;
  ponds.forEach((pp, i) => {
    const r = Array.isArray(pp[0]) ? pp[0] : pp; if (!r || r.length < 8) return;
    let cx = 0, cz = 0; for (let k = 0; k < r.length; k += 2) { cx += r[k]; cz += r[k + 1]; }
    cx /= r.length * 5; cz /= r.length * 5;
    if (Math.hypot(cx + 1990, cz - 4363) < 30) { ring = unflat(r); li = i; }
  });
  if (!ring) return;
  const wy = pondY(data, li);
  S.kind = KIND.MASONRY;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 0.3) continue;
    const ns = Math.ceil(len / 6), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    for (let k = 0; k < ns; k++) {
      const pa = [a[0] + ((b[0] - a[0]) * k) / ns, a[1] + ((b[1] - a[1]) * k) / ns], pb = [a[0] + ((b[0] - a[0]) * (k + 1)) / ns, a[1] + ((b[1] - a[1]) * (k + 1)) / ns];
      const m = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2];
      const top = Math.max(gY(...pa), gY(...pb), gY(...m), wy + 0.5) + 0.12;
      S.base = top - LAND_Y;
      S.box(m[0], m[1], wy - 0.6, top, len / ns + 0.35, 0.5, ang, C.bank, { top: C.cap });
    }
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
function steps(S, F, s0, y0, s1, y1, w, t = 0, { col = C.blueStone, cheeks = 0, n: nn = 0 } = {}) {
  const n = nn || clamp(Math.round(Math.abs(y1 - y0) / 0.16), 1, 30), len = s1 - s0;
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
// [[s or t position along the run, width], ...] per run are left open; `h` may be a function (level it stands on,
// lowest ground under it) => height, for a wall whose height is set from the ground outside
// `open`: an openwork balustrade (a plinth rail, balusters and a coping rail) instead of a solid wall
function wall(S, F, pts, h, th, { col = C.brickMoss, cap = C.cap, base = null, gaps = [], maxSeg = 8, kind = KIND.MASONRY, open = false } = {}) {
  S.kind = kind;
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
        const hh = typeof h === 'function' ? h(on, lo + 0.6) : h;
        S.base = on - LAND_Y;
        const ang = Math.atan2(pb[1] - pa[1], pb[0] - pa[0]), sl = rl / ns + (k === ns - 1 ? th * 0.5 : 0);
        if (open) {
          S.box(pm[0], pm[1], lo, on + 0.16, sl, th, ang, col, { top: cap });
          const nb = Math.max(1, Math.round(sl / 0.55));
          for (let m = 0; m < nb; m++) { const u = -sl / 2 + (sl * (m + 0.5)) / nb; S.box(pm[0] + Math.cos(ang) * u, pm[1] + Math.sin(ang) * u, on + 0.16, on + hh, 0.13, 0.13, ang, col); }
          for (const u of [-sl / 2 + 0.12, sl / 2 - 0.12]) S.box(pm[0] + Math.cos(ang) * u, pm[1] + Math.sin(ang) * u, on + 0.16, on + hh, 0.26, th + 0.04, ang, col);
          S.box(pm[0], pm[1], on + hh - 0.12, on + hh, sl, th, ang, col, { top: cap });
        } else S.box(pm[0], pm[1], lo, on + hh, sl, th, ang, col, { top: cap });
        S.box(pm[0], pm[1], on + hh, on + hh + 0.12, rl / ns, th + 0.14, ang, cap);
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
  const F = axis(TEMPLE_O, TEMPLE_F);
  const at = F.a + Math.PI / 2; // an angle with the long side across the axis
  const S0 = TS0, S1 = TS1, T = TT, B1 = TB1, B2 = TB2;
  const { lvH, lvC, lvF } = templeLevels(F);
  // the courts are paved in dark weathered brick on the satellite, the path down the middle in pale stone
  slab(S, F, S0, B1, -T, T, lvH, C.court, C.foot);
  slab(S, F, B1, B2, -T, T, lvC, C.court, C.foot);
  slab(S, F, B2, S1, -T, T, lvF, C.court, C.foot);
  // the flights go down onto the lower court, clear of the hall's own steps
  steps(S, F, B2 + 1.6, lvF, B2, lvC, 6);
  for (const t of [-14, 14]) steps(S, F, B2 + 1.6, lvF, B2, lvC, 3, t);
  steps(S, F, B1 + 1.6, lvC, B1, lvH, 7);
  // a stone path (thần đạo) down the court
  { const p = F.P((B1 + 1.6 + B2) / 2); S.kind = KIND.MASONRY; S.box(p[0], p[1], lvC - 0.2, lvC + 0.06, B2 - B1 - 1.6, 3, F.a, C.pathPale, { topKind: KIND.ROAD }); }

  // Điện Ngưng Hy: a 25 x 24 m stone base, three houses joined under three roofs (front, main, rear); the yellow roofs
  // reach s 0.5-24.7 on the satellite
  const hb0 = -0.3, hb1 = 23.7, plinth = lvH + 0.75;
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

  // an annex behind the hall, narrower and roofed in grey tile (satellite; its name and use not documented)
  {
    const p = F.P(-4.6);
    S.kind = KIND.MASONRY; S.base = lvH - LAND_Y;
    S.box(p[0], p[1], lvH - 0.4, lvH + 0.45, 7.2, 15, F.a, C.stone, { top: shade(C.paving, 1.04), topKind: KIND.ROAD });
    pavilion(S, p[0], p[1], 13, 6, at, lvH + 0.45, { wallH: 3.0, rh: 2.6, roof: C.roofGrey, wall: C.lacquerOld, over: 0.8, segs: 2 });
  }

  // side halls: Công Nghĩa đường and Minh Ân viện at the front, the two tòng viện at the back (3 bays + 2 wings), set
  // where the satellite shows them, each about 17.5 x 11 m over its eaves and roofed in dark grey tile
  for (const sd of [-1, 1]) {
    const pf = F.P(35.3, sd * 18.2);
    S.kind = KIND.MASONRY; S.base = lvC - LAND_Y;
    S.box(pf[0], pf[1], lvC - 0.4, lvC + 0.45, 16.6, 12, F.a, C.stone, { top: shade(C.paving, 1.04), topKind: KIND.ROAD });
    pavilion(S, pf[0], pf[1], 15.5, 10, F.a, lvC + 0.45, { wallH: 3.0, rh: 2.6, roof: C.roofGrey, wall: C.lacquerOld, over: 0.9, segs: 2 });
    const pb = F.P(-5.3, sd * 19.6);
    S.kind = KIND.MASONRY; S.base = lvH - LAND_Y;
    S.box(pb[0], pb[1], lvH - 0.4, lvH + 0.4, 17, 11, F.a, C.stone, { top: shade(C.paving, 1.04), topKind: KIND.ROAD });
    pavilion(S, pb[0], pb[1], 15.5, 9.5, F.a, lvH + 0.4, { wallH: 2.9, rh: 2.5, roof: C.roofGrey, wall: C.lacquerOld, over: 0.9, segs: 2 });
  }

  // the wall, 0.55 m thick, on each court's level, grey render over a dark stone foot (Street View from the road):
  // about 3 m over the ground outside, where the bank (berm()) brings the ground to 0.6 m under the court, so never
  // under 2.4 m over the court;
  // Cung Môn in the front, arched gates in the others (the side ones where small gate roofs show on the satellite)
  const level = (sa, sb) => { const s = Math.max(sa[0], sb[0]); return s > B2 ? lvF : s > B1 ? lvC : lvH; };
  const ring = [[S1, -T], [S1, T], [S0, T], [S0, -T], [S1, -T]], SG = 22.8;
  wall(S, F, ring, (on, g) => Math.max(2.4, g + 3.0 - on), 0.55, { col: C.render, kind: KIND.PLAIN, base: level, gaps: [[[T, 13.4]], [[S1 - SG, 3.6]], [[T, 3.6]], [[SG - S0, 3.6]]] });
  for (const sd of [-1, 1]) { const p = F.P(SG, sd * T); { archGate(S, p[0], p[1], F.a, 3.6, 1.4, lvH, 3.4, { col: C.render, roof: C.roofTerra }); S.kind = KIND.MASONRY; S.box(p[0], p[1], lvH - 0.6, lvH + 0.9, 4.0, 1.7, F.a, C.foot); } }
  { const p = F.P(S0, 0); archGate(S, p[0], p[1], at, 4.2, 1.4, lvH, 3.6, { col: C.render, roof: C.roofTerra }); }

  // Cung Môn: three bays, two storeys of wood on its own terrace, three steps down to the forecourt behind it and
  // fifteen blue-stone steps with dragon cheeks down to the lane and the pond in front; its roofs are terracotta
  // tile (Street View from the pond), not glazed yellow
  const gTop = lvF + 0.45, GC = S1 + 2.5;
  { const p = F.P(GC); S.kind = KIND.MASONRY; S.base = gTop - LAND_Y; S.box(p[0], p[1], span(F, GC - 4.5, GC + 4.5, -8, 8).lo - 0.8, gTop, 9, 15, F.a, C.blueStone, { top: shade(C.paving, 1.05), topKind: KIND.ROAD }); }
  steps(S, F, GC - 5, lvF, GC - 4.4, gTop, 5);
  { const p = F.P(GC); S.base = gTop - LAND_Y; pavilion(S, p[0], p[1], 12.6, 6.4, at, gTop, { tiers: 2, wallH: 3.3, rh: 2.3, roof: C.roofTerra, wall: C.lacquer, over: 0.9, colonnade: true, segs: 3 }); }
  const foot = F.P(GC + 4.5 + 4.6), footY = Math.max(gY(...foot), gTop - 15 * 0.17);
  steps(S, F, GC + 4.5 + 4.6, footY, GC + 4.5, gTop, 5, 0, { cheeks: 0.5 });
}

// ---------- the tomb: Bửu Thành, the front court, Bái Đình, the stele court with Bi Đình and trụ biểu ----------
// Frame: from the middle of the Bửu Thành east through the stele house, facing east by 6.6° south. s = 0 at the
// grave. The satellite reads west to east: the Bửu Thành (s -12.5..12.5), a pale paved front court (to s 23), the
// Bái Đình, darker paving with rows of statues along both sides (to s 35.5), and the wider stele court (to s 61.5,
// 34 m across) with the stele house at s 44; nothing built east of it. mia.vn's "three-level court" is read as these
// three courts, each a step lower than the one behind it.
function tomb(S) {
  const F = axis(TOMB_O, TOMB_F);
  const at = F.a + Math.PI / 2;
  const M = (s, t, h, col = C.mandarin) => statue(S, F, s, t, h, col);
  const P1 = 23, A1 = 35.5, C1 = 61.5, WA = 13, WC = 16;

  // levels from the east up: stele court, Bái Đình, front court, Bửu Thành
  const cF = span(F, A1, C1, -WC, WC).hi + 0.3;
  const aF = Math.max(span(F, P1, A1, -WA, WA).hi + 0.25, cF + 0.35);
  const pF = Math.max(span(F, 12.5, P1, -WA, WA).hi + 0.25, aF + 0.35);
  const bF = Math.max(span(F, -13, 13, -13, 13).hi + 0.3, pF + 0.35);

  // Bửu Thành: three square walls round the grave, each with one gate in the front
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

  // the three courts, a stone path down the middle of all of them, and steps between
  slab(S, F, 12.5, P1, -WA, WA, pF, C.courtPale, C.retain);
  slab(S, F, P1, A1, -WA, WA, aF, C.court, C.retain);
  // the stele court; the lane from the north (OSM) comes in at grade at s 44.5-50, so the court is cut back there
  const LN0 = 44.5, LN1 = 50, LT = -11.2;
  slab(S, F, A1, LN0, -WC, WC, cF, C.court, C.retain);
  slab(S, F, LN0, LN1, LT, WC, cF, C.court, C.retain);
  slab(S, F, LN1, C1, -WC, WC, cF, C.court, C.retain);
  const path = (s0, s1, y) => { const p = F.P((s0 + s1) / 2); S.kind = KIND.MASONRY; S.box(p[0], p[1], y - 0.2, y + 0.05, s1 - s0, 2.4, F.a, C.pathPale, { topKind: KIND.ROAD }); };
  path(14.3, P1, pF); path(P1 + 1.2, A1, aF); path(A1 + 1.2, 37.4, cF); path(50.6, C1, cF);
  steps(S, F, 14.3, pF, 12.7, bF, 2.4);
  steps(S, F, P1 + 1.2, aF, P1, pF, 3);
  steps(S, F, A1 + 1.2, cF, A1, aF, 3);
  { const out = Math.max(gY(...F.P(C1 + 2.4)), cF - 2.4); steps(S, F, C1 + 2.4, out, C1, cF, 4); }

  // the stele house on a low terrace (about 0.85 m) with an openwork balustrade and three steps at each end, the
  // pavilion on its own plinth a step higher; a trụ biểu each side, level with it near the court's north and south
  // edges (satellite: the pillars and their long shadows at about t ±13.5; the photo from the court west of it: the
  // pillars right in front of the edge balustrades, about three pavilion widths apart)
  const sF = cF + 0.85, ts0 = 38.6, ts1 = 49.4, tw = 6.5;
  slab(S, F, ts0, ts1, -tw, tw, sF, C.court, C.steleTrim);
  wall(S, F, [[ts1, -tw], [ts1, tw], [ts0, tw], [ts0, -tw], [ts1, -tw]], 0.75, 0.24, { col: C.steleTrim, cap: shade(C.stelePale, 0.85), base: flat(sF), gaps: [[[tw, 3.4]], [], [[tw, 3.4]]], maxSeg: 4, open: true });
  steps(S, F, ts1 + 1.2, cF, ts1, sF, 3.2, 0, { col: C.steleTrim, n: 3 });
  steps(S, F, ts0 - 1.2, cF, ts0, sF, 3.2, 0, { col: C.steleTrim, n: 3 });
  biDinh(S, F, 44, sF);
  // (the north one half a metre west of the south one: the OSM lane drawn into the court at s 44.5-50 would run
  // through its plinth; reported, see the notes)
  for (const sd of [-1, 1]) truBieu(S, F, sd < 0 ? 43.5 : 44, sd * 13.5, cF);

  // statues on the Bái Đình (satellite): one row a side near the court's edges, at t ±11.5; the elephant and the horse
  // nearest the Bửu Thành, then three mandarins, about life size (the photo from s 22 shows only mandarins ahead on
  // the left); all of brick, lime and cement
  for (const sd of [-1, 1]) {
    props.elephant(S, ...((p) => [p[0], aF, p[1]])(F.P(24.8, sd * 11.5)), F.a + Math.PI, { s: 0.7, col: C.mandarin });
    props.horse(S, ...((p) => [p[0], aF, p[1]])(F.P(27.4, sd * 11.5)), F.a + Math.PI, { s: 0.85, col: C.mandarin });
    for (const s of [29.9, 32.3, 34.7]) M(s, sd * 11.5, aF);
  }
  // low balustrades round the courts' edges, open where the paths go out (the east steps; a path south at s 44)
  const edge = (sa, sb) => { const s = Math.max(sa[0], sb[0]); return s <= P1 + 0.01 ? pF : s <= A1 + 0.01 ? aF : cF; };
  for (const sd of [-1, 1]) {
    wall(S, F, [[12.6, sd * (WA - 0.2)], [A1, sd * (WA - 0.2)], [A1, sd * (WC - 0.2)], [C1 - 0.2, sd * (WC - 0.2)], [C1 - 0.2, sd * 2.4]], 0.8, 0.3,
      { col: C.stucco, cap: C.panel, base: edge, maxSeg: 5, gaps: [[], [], sd > 0 ? [[44 - A1, 3]] : [[(LN0 + LN1) / 2 - A1, LN1 - LN0]], []] });
  }
}

// the stele house (the photo from the court west of it): a square pavilion of dark grey-black weathered cement with
// pale panels, an arched door in a framed front between pilasters; at the top of the body a lower tiled roof with
// curled corners, then a panelled attic, then a small upper roof with curled corners, ridge ornaments and a finial; the
// stele inside. About 7.2 m square, its finial some 9.5 m over the terrace (estimated from the image).
function biDinh(S, F, s, y0) {
  const p = F.P(s), a = F.a, at = a + Math.PI / 2, w = 7.2, wallH = 5.0, body = C.stele, trim = C.steleTrim, pale = C.stelePale;
  S.kind = KIND.MASONRY; S.base = y0 - LAND_Y;
  S.box(p[0], p[1], y0 - 0.2, y0 + 0.3, w + 0.8, w + 0.8, a, trim, { top: shade(C.court, 1.05) }); // its plinth
  const y = y0 + 0.3;
  S.kind = KIND.PLAIN; S.base = y - LAND_Y;
  S.box(p[0], p[1], y, y + wallH, w, w, a, body);
  for (let i = 0; i < 4; i++) {
    const r = a + (i * Math.PI) / 2, ux = Math.cos(r), uz = Math.sin(r);
    const q = [p[0] + ux * (w / 2 + 0.02), p[1] + uz * (w / 2 + 0.02)], q2 = [p[0] + ux * (w / 2 + 0.08), p[1] + uz * (w / 2 + 0.08)];
    // the arched door: a dark opening with a round head, a moulded frame round it
    S.box(q[0], q[1], y, y + 2.7, 0.06, 2.1, r, C.door);
    S.box(q[0], q[1], y + 2.7, y + 3.4, 0.06, 2.1, r, C.door, { taper: 0.5 });
    for (const v of [-1.25, 1.25]) S.box(q2[0] - uz * v, q2[1] + ux * v, y, y + 2.8, 0.12, 0.35, r, trim);
    S.box(q2[0], q2[1], y + 3.3, y + 3.75, 0.12, 2.9, r, trim, { taper: 0.6 });
    // pilasters at the corners and either side of the door, pale panels between them
    for (const v of [-3.35, -1.75, 1.75, 3.35]) S.box(q2[0] - uz * v, q2[1] + ux * v, y, y + wallH, 0.14, 0.55, r, trim);
    for (const v of [-2.55, 2.55]) { S.box(q[0] - uz * v, q[1] + ux * v, y + 0.7, y + 3.3, 0.08, 1.0, r, pale); S.box(q[0] - uz * v, q[1] + ux * v, y + 3.6, y + 4.4, 0.08, 1.0, r, shade(pale, 0.9)); }
    S.box(q[0], q[1], y + 3.95, y + 4.55, 0.08, 2.4, r, shade(pale, 0.85)); // the carved panel over the door
  }
  // the cornice, then the lower roof: tiled, curled up at the corners (đầu đao), up to the attic
  const yc = y + wallH;
  S.box(p[0], p[1], yc, yc + 0.35, w + 0.5, w + 0.5, a, trim, { top: trim });
  S.hip(p[0], p[1], w + 0.2, w + 0.2, at, yc + 0.3, 1.1, C.slate, { flare: 0.45, over: 0.55, ridgeCol: trim, hips: true, segs: 3, horns: true, fascia: 0.16, fasciaCol: trim });
  // the attic: a smaller square with pale panels in a dark frame
  const ya = yc + 0.85, aw = 4.6, ah = 1.25;
  S.box(p[0], p[1], ya, ya + ah, aw, aw, a, body, { top: trim });
  for (let i = 0; i < 4; i++) {
    const r = a + (i * Math.PI) / 2, ux = Math.cos(r), uz = Math.sin(r), q = [p[0] + ux * (aw / 2 + 0.03), p[1] + uz * (aw / 2 + 0.03)];
    for (const v of [-1.35, 0, 1.35]) S.box(q[0] - uz * v, q[1] + ux * v, ya + 0.25, ya + ah - 0.25, 0.06, v ? 0.95 : 1.3, r, pale);
    for (const v of [-2.15, 2.15]) S.box(q[0] - uz * v, q[1] + ux * v, ya, ya + ah, 0.12, 0.3, r, trim);
  }
  // the upper roof, small, curled at the corners, a ridge with ornaments and a finial
  const yu = ya + ah;
  S.box(p[0], p[1], yu, yu + 0.2, aw + 0.4, aw + 0.4, a, trim);
  S.hip(p[0], p[1], aw, aw, at, yu + 0.15, 1.0, C.slate, { flare: 0.4, over: 0.5, ridgeCol: trim, hips: true, segs: 3, horns: true });
  S.kind = KIND.PLAIN;
  const yt = yu + 1.15;
  S.box(p[0], p[1], yt - 0.1, yt + 0.25, 0.7, 0.7, a, trim);
  S.cyl(p[0], p[1], yt + 0.25, yt + 0.6, 0.32, 0.22, 8, trim);
  S.cyl(p[0], p[1], yt + 0.6, yt + 1.2, 0.2, 0.03, 8, trim);
  // the stele (1917) on its plinth, seen through the doors
  S.box(p[0], p[1], y, y + 0.6, 1.4, 2.6, a, C.blueStone);
  S.box(p[0], p[1], y + 0.6, y + 3.2, 0.3, 1.8, a, shade(C.blueStone, 1.15));
}
// a trụ biểu: a square shaft of rendered brick on a stepped base, a lantern-like crown with small curled roofs and a
// finial; about 10 m, its top a little over the stele house's finial (Street View)
function truBieu(S, F, s, t, y) {
  const p = F.P(s, t), a = F.a, h = 10, tb = hex('#8d8c86');
  S.kind = KIND.PLAIN; S.base = y - LAND_Y;
  S.box(p[0], p[1], y - 0.3, y + 0.15, 2.4, 2.4, a, C.stuccoDark);
  S.box(p[0], p[1], y - 0.3, y + 0.35, 2.1, 2.1, a, C.stuccoDark);
  S.box(p[0], p[1], y + 0.35, y + 1.2, 1.8, 1.8, a, tb, { top: C.panel });
  S.box(p[0], p[1], y + 1.2, y + h - 2.2, 1.7, 1.7, a, tb, { taper: 0.9 });
  S.box(p[0], p[1], y + h - 2.2, y + h - 1.9, 1.8, 1.8, a, shade(tb, 1.1));
  S.box(p[0], p[1], y + h - 1.9, y + h - 1.0, 1.3, 1.3, a, C.panel);
  S.hip(p[0], p[1], 1.5, 1.5, a, y + h - 1.0, 0.45, C.stuccoDark, { flare: 0.15, over: 0.15, hips: true });
  S.cyl(p[0], p[1], y + h - 0.6, y + h, 0.22, 0.04, 6, C.stuccoDark);
}
// the cement statues of the salutation court (src/landmarks/props.js): mandarins facing the axis, beasts facing
// down it
function statue(S, F, s, t, y, col) {
  const p = F.P(s, t), face = t > 0 ? F.a - Math.PI / 2 : F.a + Math.PI / 2;
  props.mandarin(S, p[0], y, p[1], face, { h: 2.0, col });
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
