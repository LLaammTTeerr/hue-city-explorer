import { addGlowPointCloud } from '../helpers.js';
import * as THREE from 'three';
import { KIND, Buf, hex, shade, rand, pick, inRing } from '../../geo/buf.js';
import { LAND_Y, ROAD_W, roadWidth } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { lightMaterial, glowPoints } from '../../geo/materials.js';

// Phố Tây, Huế's backpackers' quarter in phường Phú Hội on the south bank: the three streets Võ Thị Sáu, Phạm Ngũ Lão
// and Chu Văn An, which close to traffic for the walking street on Friday to Sunday evenings (18:00 to 02:00; opened
// 29 September 2017). See docs/places/photay.md.
//
// There is no single building here: the place is the street scene, built up wall to wall (satellite, Street View
// 2024-25 in scratch/rebuild/photay). In the order it is laid:
//   landmarks   the fronts Street View shows at the matched viewpoints, drawn as they stand (see SIGNATURES in the
//               notes): the steel-and-timber bar on Võ Thị Sáu, the cream colonial corner house across Chu Văn An
//               (it replaces the mapped block there), Burger Ngon and the salmon balconied hotel, the red-brown
//               timber café behind its white gate, the black-glass block and the tiled corner shop at the Lê Lợi end,
//               the Jasmine Hotel tower with its roof sign, the pink balconied corner and the orange restaurant at
//               Phạm Ngũ Lão and Võ Thị Sáu
//   the lane    Chu Văn An's paved branch (OSM way 39419045, paving_stones): the hotel and creeper wall on its east
//               side, the picket fence, iron gate and white villa on its west side, trees over it, the cream hotel
//               with arched windows closing it, light concrete slabs underfoot
//   corners     a house on every corner where a side road or the lane meets one of the three streets, fronting both
//   rows        tube houses 4-5.6 m wide, 2-5 storeys, along both sides of the three streets with up to two rows
//               behind them, and a row along the side roads inside the quarter, wherever no mapped building, road
//               or landmark stands (the city's generic infill under them gives way, as populate drops it)
//   dressing    every front on the three streets: an open ground floor that glows after dark, a sign board, blade
//               signs, awnings; each street in its own manner (STYLE): Võ Thị Sáu bars with red lanterns, striped
//               awnings and wooden stools; Chu Văn An cafés and hotels with flat canopies, planters and creepers,
//               white paper lanterns slung across the street; Phạm Ngũ Lão restaurants under plain tarps with
//               plastic stools; pavements in each street's own stone, lamp posts clear of the side-road mouths
// Street centrelines: OSM ways 39416766 (Võ Thị Sáu), 39419092 (Phạm Ngũ Lão), 39413149 (Chu Văn An), in model
// metres (scripts/frame.json). The carriageways stay asphalt, as OSM tags them.

export const id = 'photay';

const R = 165; // reach from the place's centre: the triangle of the three streets, to Lê Lợi on the river side
const STREETS = {
  vts: [[804.6, -309.4], [802.8, -298.5], [793.6, -268.5], [786, -243.6], [780.8, -226.8], [769.3, -187.5], [768.2, -183.3], [763.1, -164.1], [760.5, -154.9], [758.9, -149.6], [750.6, -119.2], [743.2, -90.7], [739.5, -75.6], [734.4, -55.1], [726.8, -31.8], [716.3, -16.4], [702.2, -3.6], [665.9, 33.9], [632.6, 65.7], [617.4, 80.5], [591.4, 105.3]],
  pnl: [[665.9, 33.9], [556.8, -100.4], [547.8, -110.9], [537.3, -123.6], [530.1, -131.9]],
  cva: [[826.8, 69.4], [815.3, 48.3], [776.3, 0.4], [762.6, -16.1], [745.1, -40.4], [734.4, -55.1], [730.6, -59.9], [720.9, -71.7], [718.9, -74.1], [677.4, -124.9], [662.2, -143.5], [655.2, -152.1], [619.2, -197.1], [611.8, -207.1]],
};
const LANE = [[796.1, -51.8], [790.2, -11], [776.3, 0.4]]; // Chu Văn An's paved branch (OSM 39419045), 4 m between walls
const LANE_HALF = 2;
const LANE_SET = LANE_HALF + 0.25; // a house front on it: clear of the carriageway the city keeps open (half + 0.4)
const HALF = ROAD_W[3] / 2; // the three are residential streets (class 3)
const SET = HALF + 2.3; // a house front on them: kerb plus a 2 m pavement
// mapped buildings the landmarks below replace, each named by a point inside its outline (the order of data.bld is
// not fixed): the white block on the corner of Chu Văn An and Võ Thị Sáu (the cream colonial corner house), the
// Jasmine Hotel, the hotel closing the lane
const REPLACE = { corner: [752, -54], jasmine: [645, -148], laneEnd: [797, 1] };

const C = {
  shop: hex('#2b2522'), shopLit: hex('#4a3a2c'), pole: hex('#6c716f'), wire: hex('#2a2a2a'), paper: hex('#efe9dc'),
  lantern: hex('#c8352a'), lanternY: hex('#d9a236'), table: hex('#d8d4cc'), tableS: hex('#8e9aa3'), shutter: hex('#8d8f8c'),
  glass: hex('#3f4c55'), canopy: hex('#d9d6cf'), pot: hex('#6b4a3a'), leaf: hex('#4f7a3a'), leafD: hex('#3b6431'),
  creeper: hex('#55803f'), trunk: hex('#5a4a3c'), white: hex('#efece4'), rail: hex('#e4e0d6'), iron: hex('#2a2c2e'),
  rust: hex('#7b4a2c'), timber: hex('#5a3a24'), granite: hex('#8a8a86'), slabA: hex('#cfc9bc'), slabB: hex('#b2ab9c'),
  joint: hex('#6f6a62'), ac: hex('#b9bab5'), wood: hex('#7a5a3e'),
};
const SIGNS = ['#a8453b', '#3d6a94', '#cdb06a', '#4a7a58', '#222426', '#e2ddd0', '#6a4a62', '#b8734a', '#4a8585'].map(hex);
const INK = ['#f4f1e8', '#f4f1e8', '#1d1d1f', '#f4f1e8', '#e1b52d', '#c62f2a', '#f4f1e8', '#f4f1e8', '#f4f1e8'].map(hex); // lettering against each sign
const GLOW = [0xff4a3a, 0x58a8ff, 0xffd060, 0x60ff98, 0xfff2d0, 0xffe8b0, 0xff70d8, 0xffa040, 0x60fff0]; // the sign's light at night
const ROOF = ['#b8b4ac', '#a09d97', '#cfcbc3', '#7f7b76', '#9a6a55'].map(hex); // concrete trays, grey sheet, a few rusty tin roofs (satellite)
const BULBS = [[1, 0.86, 0.6], [1, 0.8, 0.5], [1, 0.9, 0.7]]; // paper lanterns lit from inside
// each street's own manner (Street View 2024-25): what its fronts are, their plaster, signs (index into SIGNS),
// awnings, seats, pavement stone
const STYLE = {
  vts: { // bars: striped canvas, red silk lanterns, low wooden stools; warm plaster
    types: [['bar', 0.55], ['shop', 0.15], ['cafe', 0.12], ['hotel', 0.18]],
    walls: ['#e4d8bd', '#dcc684', '#c98f78', '#e6d3b4', '#c8a190', '#b8785f', '#e6e2d8'], signs: [0, 2, 7, 4, 6],
    canvas: ['#9a4038', '#44614a', '#b89a50', '#6a3a44'], awn: 0.7, stripe: true, lanterns: true,
    stools: ['#6b5a48', '#3a3532', '#8a7860', '#5f4a3a'], pave: ['#a4a29b', '#b4b1a9'],
  },
  cva: { // cafés and hotels: flat canopies, planters and creepers, black and white boards; pale plaster
    types: [['cafe', 0.35], ['bar', 0.25], ['hotel', 0.22], ['shop', 0.18]],
    walls: ['#e6e2d8', '#b5c3c6', '#c98f78', '#eceae4', '#bccfbf', '#a9bfcc'], signs: [4, 5, 1, 8],
    canvas: ['#3b3b3b', '#4a6a85'], awn: 0.35, stripe: false, lanterns: false,
    stools: ['#5f4a3a', '#3a3532', '#7a5a3e'], pave: ['#8f8e8a', '#9c9a95'],
  },
  pnl: { // restaurants: plain tarps, blue and red plastic stools, pink and orange plaster
    types: [['bar', 0.45], ['shop', 0.3], ['hotel', 0.25]],
    walls: ['#e7b9b2', '#e9a25a', '#ece2c8', '#dcc684', '#e6e2d8', '#c9c4b8'], signs: [6, 1, 8, 3, 0],
    canvas: ['#4a7a58', '#3d6a94', '#2f5f7a'], awn: 0.8, stripe: false, lanterns: true,
    stools: ['#c8352a', '#2f5fa8', '#c8352a', '#e0b030', '#2f5fa8'], pave: ['#b9a892', '#c8b9a4'],
  },
};
const SIDE_WALLS = ['#e4d8bd', '#c9c4b8', '#e6e2d8', '#d6cbb5', '#bfc6c4'].map(hex);
for (const s of Object.values(STYLE)) { s.walls = s.walls.map(hex); s.canvas = s.canvas.map(hex); s.stools = s.stools.map(hex); s.pave = s.pave.map(hex); }

// nearest point of a polyline: distance, the point, the unit tangent there
function nearest(pts, x, z) {
  let best = null;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz;
    const s = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2));
    const px = a[0] + dx * s, pz = a[1] + dz * s, d = Math.hypot(x - px, z - pz);
    if (!best || d < best.d) { const L = Math.sqrt(L2); best = { d, p: [px, pz], t: [dx / L, dz / L] }; }
  }
  return best;
}
// a polyline with arc length: at(s, v) is the point s along it, v to its right (v > 0: the side of n = (-tz, tx))
function line(pts) {
  const seg = [];
  let s = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), t = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
    seg.push({ a, L, t, n: [-t[1], t[0]], s0: s });
    s += L;
  }
  const at = (q, v = 0) => {
    let g = seg[seg.length - 1];
    for (const h of seg) if (q <= h.s0 + h.L) { g = h; break; }
    const u = q - g.s0;
    return [g.a[0] + g.t[0] * u + g.n[0] * v, g.a[1] + g.t[1] * u + g.n[1] * v];
  };
  return { pts, seg, len: s, at };
}
const choose = (list, r) => { let acc = 0; for (const [k, p] of list) { acc += p; if (r < acc) return k; } return list[list.length - 1][0]; };
const unit = (v) => { const L = Math.hypot(v[0], v[1]); return [v[0] / L, v[1] / L]; };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];

export function build({ data, S, group, place }) {
  const cx = place ? place.x : 673.2, cz = place ? place.z : -89.6;
  const inside = (x, z) => Math.hypot(x - cx, z - cz) < R;
  S.kind = KIND.PLAIN;
  S.base = 0;
  const L = { warm: [], sign: GLOW.map(() => []) }; // night light boxes: [cx, cz, y0, y1, sx, sz, ang]
  const gp = [], gc = []; // glow points: bulbs and lanterns
  const later = []; // the dressing, drawn after every house as one stretch that is not cover (S.noCover)
  const LN = { lane: line(LANE) };
  for (const k of Object.keys(STREETS)) LN[k] = line(STREETS[k]);
  const ground = (x, z) => LAND_Y + rise(x, z);

  // the street a point fronts: which street, how far from its centreline, the point on it, the tangent
  const streetOf = (x, z) => {
    let best = null;
    for (const [k, pts] of Object.entries(STREETS)) { const r = nearest(pts, x, z); if (!best || r.d < best.d) best = { ...r, k }; }
    return best;
  };
  // the roads around: every carriageway stays open
  const allRoads = [];
  for (const r of data.roads || []) {
    if (r[1]) continue;
    const pts = [];
    for (let i = 0; i < r[2].length; i += 2) pts.push([r[2][i] / 10, r[2][i + 1] / 10]);
    if (pts.some((p) => Math.hypot(p[0] - cx, p[1] - cz) < R + 60)) allRoads.push({ c: r[0], half: roadWidth(r) / 2, pts });
  }
  const onRoad = (x, z, pad = 0.3) => allRoads.some((r) => r.c <= 4 && nearest(r.pts, x, z).d < r.half + pad);
  // the mapped buildings that stay, and the ones replaced here
  const rings = [], replaced = {};
  (data.bld || []).forEach((rec, bi) => {
    const ring = [];
    for (let k = 0; k < rec[0].length; k += 2) ring.push([rec[0][k] / 10, rec[0][k + 1] / 10]);
    const role = Object.keys(REPLACE).find((k) => !replaced[k] && inRing(REPLACE[k][0], REPLACE[k][1], ring));
    if (role) replaced[role] = ring;
    else if (ring.some((p) => Math.hypot(p[0] - cx, p[1] - cz) < R + 30)) rings.push({ ring, bi });
  });
  // ground taken by what is built here: lots (rectangles) and polygons
  const rects = [], polys = [];
  const inRect = (r, x, z) => { const dx = x - r.c[0], dz = z - r.c[1]; return Math.abs(dx * r.t[0] + dz * r.t[1]) < r.hw && Math.abs(-dx * r.t[1] + dz * r.t[0]) < r.hd; };
  const blocked = (x, z) => !inside(x, z) || rects.some((r) => inRect(r, x, z)) || polys.some((g) => inRing(x, z, g)) ||
    rings.some((g) => inRing(x, z, g.ring)) || allRoads.some((r) => nearest(r.pts, x, z).d < r.half + 0.4) ||
    streetOf(x, z).d < SET - 0.1 || nearest(LANE, x, z).d < LANE_HALF - 0.05; // the pavements of all three stay open

  // ---------------- lots ----------------
  // a lot: o the middle of its front at the street, t along the street, f out to the street, w wide, d deep
  const lot = (o, t, f, w, d) => ({ o, t, f, w, d, c: [o[0] - f[0] * d / 2, o[1] - f[1] * d / 2], ang: Math.atan2(t[1], t[0]) });
  const LP = (l, u, v) => [l.o[0] + l.t[0] * u - l.f[0] * v, l.o[1] + l.t[1] * u - l.f[1] * v]; // v into the lot
  const fits = (l) => {
    const nu = Math.max(4, Math.ceil(l.w - 0.4)), nv = Math.max(2, Math.ceil(l.d - 0.4));
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
      const p = LP(l, -l.w / 2 + 0.2 + ((l.w - 0.4) * i) / nu, 0.2 + ((l.d - 0.4) * j) / nv);
      if (blocked(p[0], p[1])) return false;
    }
    return true;
  };
  const deepest = (l, ds) => { for (const d of ds) { const m = lot(l.o, l.t, l.f, l.w, d); if (fits(m)) return m; } return null; };
  // the lot on street k from s0 to s1, side sg (+1: the side of the line's n), its front set back `set`
  const lotAt = (k, s0, s1, sg, set, d) => {
    const A = LN[k].at(s0, sg * set), B = LN[k].at(s1, sg * set), w = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const t = [(B[0] - A[0]) / w, (B[1] - A[1]) / w], f = sg > 0 ? [t[1], -t[0]] : [-t[1], t[0]];
    return lot([(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], t, f, w, d);
  };
  // a landmark's lot: the deepest that fits, narrowed half a metre at a time from both ends if it must
  const sig = (k, s0, s1, sg, set, ds) => {
    for (let i = 0; i < 6; i++, s0 += 0.5, s1 -= 0.5) { const l = deepest(lotAt(k, s0, s1, sg, set, ds[0]), ds); if (l) return l; }
    console.warn('photay: no room on', k, 'at', s0);
    return null;
  };
  const level = (pts) => { let lo = Infinity, hi = -Infinity; for (const p of pts) { const r = rise(p[0], p[1]); lo = Math.min(lo, r); hi = Math.max(hi, r); } return { lo, hi, gy: LAND_Y + hi }; };
  const corners = (l) => [LP(l, -l.w / 2, 0), LP(l, l.w / 2, 0), LP(l, l.w / 2, l.d), LP(l, -l.w / 2, l.d)];
  const take = (l) => rects.push({ c: l.c, t: l.t, hw: l.w / 2, hd: l.d / 2 });
  // a plain block on a lot (the house body): returns its floor level
  const body = (l, h, col, { kind = KIND.FACADE, roof = null, key = 0 } = {}) => {
    const { lo, gy } = level(corners(l));
    S.kind = kind;
    S.base = gy;
    S.box(l.c[0], l.c[1], LAND_Y + lo - 0.15, gy + h, l.w - 0.08, l.d, l.ang, col, { top: roof || pick(ROOF, key, 44), topKind: KIND.FLAT });
    S.kind = KIND.PLAIN;
    S.base = 0;
    take(l);
    return gy;
  };
  // a block on a polygon
  const block = (ring, h, col, { kind = KIND.FACADE, roof = ROOF[0], parapet = 0 } = {}) => {
    const { lo, gy } = level(ring);
    S.kind = kind;
    S.base = gy;
    S.prism(ring, LAND_Y + lo - 0.15, gy + h, col, roof, { topKind: KIND.FLAT, parapet });
    S.kind = KIND.PLAIN;
    S.base = 0;
    polys.push(ring);
    return gy;
  };
  // a tube house: body, parapet, and on a street front floor ledges, balconies and a cornice; a stair head on most
  const tube = (l, key, walls, floors, front) => {
    const h = floors * 3.4, col = pick(walls, key, 43), gy = body(l, h, col, { key });
    const P = (u, v) => LP(l, u, v), ang = l.ang;
    const pa = P(0, 0.1);
    S.box(pa[0], pa[1], gy + h, gy + h + 0.75, l.w - 0.08, 0.2, ang, shade(col, 0.95));
    if (front) {
      for (let fl = 1; fl < floors; fl++) {
        const yy = gy + fl * 3.4, p = P(0, 0.05);
        S.box(p[0], p[1], yy - 0.12, yy + 0.08, l.w - 0.02, 0.3, ang, shade(col, 0.9));
        if (fl >= 2 && rand(key, 60 + fl) < 0.45) {
          const bc = P(0, -0.45), br = P(0, -0.91), bw = Math.min(l.w - 0.9, 3);
          S.box(bc[0], bc[1], yy - 0.1, yy + 0.08, bw, 1.0, ang, shade(col, 0.85));
          S.box(br[0], br[1], yy + 0.08, yy + 1.0, bw, 0.06, ang, C.rail);
        }
      }
      const pc = P(0, -0.08);
      S.box(pc[0], pc[1], gy + h - 0.25, gy + h, l.w - 0.02, 0.4, ang, shade(col, 0.88));
    }
    if (rand(key, 45) < 0.6 && l.d > 5) {
      const sc = P(0, l.d - 1.8);
      S.box(sc[0], sc[1], gy + h, gy + h + 2.7, Math.min(3, l.w - 1), 3, ang, shade(col, 0.92), { top: pick(ROOF, key, 46) });
    }
    return { gy, h };
  };

  // ---------------- shop fronts (deferred into `later`) ----------------
  // o: the middle of the facade at ground, t: along it, f: out to the street, w: its width, h: the house's height,
  // gy: its floor, key: a number for the dice; st: the street (STYLE), type: bar, cafe, shop or hotel (else the
  // street's dice), awning/balcony: what already hangs on this front, gap: pavement depth between facade and kerb
  const front = (...a) => later.push(() => dress(...a));
  const dress = (o, t, f, w, h, gy, key, { awning = false, balcony = false, gap = 2, st = 'vts', type = null, sign = true }) => {
    const sty = STYLE[st];
    type = type || choose(sty.types, rand(key, 3));
    const ang = Math.atan2(t[1], t[0]);
    const P = (u, v) => [o[0] + t[0] * u + f[0] * v, o[1] + t[1] * u + f[1] * v];
    const B = (u, v, y0, y1, sx, sz, col, opt) => { const p = P(u, v); S.box(p[0], p[1], gy + y0, gy + y1, sx, sz, ang, col, opt); };
    const lit = (list, u, v, y0, y1, sx, sz) => { const p = P(u, v); list.push([p[0], p[1], gy + y0, gy + y1, sx, sz, ang]); };
    const isBar = type === 'bar';
    // the open shopfront
    const ow = w * 0.84, oy = Math.min(2.75, h - 1.0);
    B(0, 0.04, 0.08, oy, ow, 0.08, isBar ? C.shopLit : C.shop);
    if (type === 'shop') { // a roller shutter half down
      B(0, 0.1, oy - 0.9 - rand(key, 17) * 0.8, oy, ow, 0.06, C.shutter);
      if (rand(key, 4) < 0.4) lit(L.warm, 0, 0.1, 0.15, 1.4, ow - 0.2, 0.02);
    } else if (type === 'hotel') { // a glazed door under a small canopy, a lit lobby
      B(0, 0.09, 0.1, 2.6, Math.min(2, ow * 0.5), 0.04, C.glass);
      lit(L.warm, 0, 0.12, 0.15, 2.5, Math.min(2, ow * 0.5) - 0.1, 0.02);
      B(0, 0.95, 2.85, 3.0, Math.min(2.6, w - 0.4), 1.8, C.canopy);
      for (const u of [-0.75, 0.75]) { B(u * Math.min(1.3, w / 2 - 0.3), 0.35, 0, 0.45, 0.42, 0.42, C.pot); B(u * Math.min(1.3, w / 2 - 0.3), 0.35, 0.45, 1.1, 0.5, 0.5, C.leaf); }
    } else if (isBar || rand(key, 4) < 0.5) lit(L.warm, 0, 0.1, 0.15, oy - 0.1, ow - 0.2, 0.02);
    // the sign board over it, with a band of lettering
    if (sign && rand(key, 5) < 0.92) {
      const si = pick(sty.signs, key, 6);
      const sw = Math.min(w * 0.94, w - 0.15);
      const [y0, y1] = balcony ? [3.0, 3.38] : h < 4.7 ? [2.98, Math.min(3.6, h - 0.08)] : [3.05, 3.9];
      B(0, 0.12, y0, y1, sw, 0.16, SIGNS[si]);
      const ym = (y0 + y1) / 2, lh = (y1 - y0) * 0.36;
      B((rand(key, 7) - 0.5) * sw * 0.2, 0.215, ym - lh / 2, ym + lh / 2, sw * (0.45 + rand(key, 8) * 0.25), 0.03, INK[si]);
      if (isBar || type === 'hotel' || rand(key, 9) < 0.45) lit(L.sign[si], 0, 0.235, y0 + 0.04, y1 - 0.04, sw - 0.1, 0.01);
    }
    // a vertical blade sign up the facade of the taller houses (always on a hotel)
    if (sign && h >= 7.2 && rand(key, 10) < (type === 'hotel' ? 0.95 : st === 'pnl' ? 0.6 : 0.4)) {
      const si = pick(sty.signs, key, 11), u = (rand(key, 12) < 0.5 ? -1 : 1) * (w / 2 - 0.25);
      const top = Math.min(h - 0.4, type === 'hotel' ? 10.2 : 6.9);
      B(u, 0.55, 4.55, top, 0.12, 0.85, SIGNS[si], { bottom: true });
      B(u, 0.55, 4.55 + 0.35, top - 0.35, 0.15, 0.3, INK[si]);
      if (isBar || type === 'hotel' || rand(key, 13) < 0.5) lit(L.sign[si], u, 0.55, 4.6, top - 0.05, 0.17, 0.78);
    }
    // an awning where the house has none: striped canvas (Võ Thị Sáu), a plain tarp (Phạm Ngũ Lão), a flat canopy
    // (Chu Văn An)
    let edge = awning ? 1.4 : 0, edgeY = awning ? 2.82 : 0;
    if (!awning && type !== 'hotel' && rand(key, 14) < sty.awn) {
      const dep = Math.min(1.8, Math.max(1.0, gap - 0.2)), aw = w * 0.94;
      if (st === 'cva') {
        B(0, dep / 2, 2.9, 3.02, aw, dep, pick(sty.canvas, key, 15));
        edge = dep; edgeY = 2.9;
      } else {
        const yT = 2.93, yB = 2.45;
        const c1 = pick(sty.canvas, key, 15), c2 = sty.stripe && rand(key, 16) < 0.6 ? hex('#e9e4d8') : c1;
        const k = sty.stripe ? Math.max(2, Math.round(aw / 0.55)) : 1;
        for (let j = 0; j < k; j++) {
          const u0 = -aw / 2 + (aw * j) / k, u1 = u0 + aw / k, col = j % 2 ? c2 : c1;
          const a = P(u0, 0.05), b = P(u1, 0.05), c = P(u1, dep), d = P(u0, dep);
          S.quad([a[0], gy + yT, a[1]], [b[0], gy + yT, b[1]], [c[0], gy + yB, c[1]], [d[0], gy + yB, d[1]], col, [f[0] * 0.3, 1, f[1] * 0.3]);
          S.quad([a[0], gy + yT - 0.03, a[1]], [b[0], gy + yT - 0.03, b[1]], [c[0], gy + yB - 0.03, c[1]], [d[0], gy + yB - 0.03, d[1]], shade(col, 0.7), [0, -1, 0]);
          S.quad([d[0], gy + yB, d[1]], [c[0], gy + yB, c[1]], [c[0], gy + yB - 0.24, c[1]], [d[0], gy + yB - 0.24, d[1]], shade(col, 0.92), [f[0], 0, f[1]]);
        }
        edge = dep; edgeY = yB - 0.24;
      }
    }
    if (type === 'cafe') { // pots along the front, a creeper up the facade, a couple of small tables
      for (let u = -w * 0.42; u <= w * 0.42 + 1e-6; u += w * 0.84 / 2) { B(u, 0.3, 0, 0.5, 0.5, 0.5, C.pot); B(u, 0.3, 0.5, 1.0 + rand(key, 50 + u) * 0.5, 0.6, 0.6, rand(key, 51 + u) < 0.5 ? C.leaf : C.leafD); }
      if (rand(key, 52) < 0.7) { const u = (rand(key, 53) - 0.5) * w * 0.7; B(u, 0.06, 0.4, Math.min(h - 0.3, 3 + rand(key, 54) * 4), 0.9 + rand(key, 55) * 1.2, 0.1, C.creeper); }
      if (gap >= 1.6) for (const u of [-w * 0.22, w * 0.22]) { B(u, gap * 0.55, 0, 0.72, 0.6, 0.6, C.wood); B(u + 0.5, gap * 0.55, 0, 0.45, 0.35, 0.35, pick(sty.stools, key, 56)); }
    }
    if (!isBar) return;
    // bulbs along the awning's edge, silk lanterns under it (not on Chu Văn An, whose lanterns hang across the street)
    if (edge) {
      for (let u = -w * 0.44; u <= w * 0.44; u += 0.6) { const p = P(u, edge + 0.02); gp.push(p[0], gy + edgeY - 0.03, p[1]); gc.push(1, 0.8, 0.5); }
      if (sty.lanterns) {
        const nl = w > 5.5 ? 3 : 2;
        for (let j = 0; j < nl; j++) {
          const u = -w * 0.38 + (w * 0.76 * j) / (nl - 1), p = P(u, edge - 0.25), yl = gy + edgeY - 0.55;
          const red = rand(key, 20 + j) < (st === 'vts' ? 0.85 : 0.5), col = red ? C.lantern : C.lanternY;
          S.cyl(p[0], p[1], yl, yl + 0.22, 0.13, 0.19, 6, col, { cap: false });
          S.cyl(p[0], p[1], yl + 0.22, yl + 0.42, 0.19, 0.12, 6, col);
          S.box(p[0], p[1], yl + 0.42, gy + edgeY, 0.02, 0.02, 0, C.wire);
          gp.push(p[0], yl + 0.21, p[1]); gc.push(1, red ? 0.32 : 0.72, red ? 0.18 : 0.28);
        }
      }
    }
    // low tables and stools on the pavement
    if (gap >= 1.2) {
      const v = Math.min(gap * 0.55, 1.7), nt = Math.max(1, Math.min(3, Math.floor((w * 0.9) / 1.75)));
      const steel = rand(key, 30) < 0.5;
      for (let j = 0; j < nt; j++) {
        const u = nt === 1 ? 0 : -w * 0.32 + (w * 0.64 * j) / (nt - 1);
        B(u, v, 0, 0.42, 0.55, 0.55, steel ? C.tableS : C.table);
        for (const [du, dv] of [[-0.48, 0], [0.48, 0], [0, -0.45], [0, 0.45]]) {
          if (dv < 0 && v < 0.85) continue;
          B(u + du, v + dv, 0, 0.3, 0.27, 0.27, pick(sty.stools, key * 7 + j * 4 + Math.round(du * 3 + dv * 5), 31));
        }
      }
    }
  };
  const lotFront = (l, h, gy, key, opt) => front(l.o, l.t, l.f, l.w - 0.1, h, gy, key, { gap: SET - HALF - 0.3, ...opt });

  // ---------------- dressing helpers (all drawn in `later`) ----------------
  const trees = []; // planted here: lamp posts keep clear
  const tree = (x, z, r, hTrunk, hTop, lean = [0, 0]) => {
    trees.push([x, z]);
    later.push(() => {
      const g = ground(x, z), tx = x + lean[0], tz = z + lean[1];
      S.cyl(x, z, g, g + hTrunk + 0.4, 0.2, 0.14, 6, C.trunk);
      S.beam([x, g + hTrunk * 0.6, z], [tx, g + hTrunk + 0.4, tz], 0.18, 0.18, C.trunk);
      const k = Math.round(x * 13 + z * 7);
      for (let j = 0; j < 4; j++) {
        const a = rand(k, j) * 6.28, rr = r * (0.3 + rand(k, j + 9) * 0.35), y0 = g + hTrunk + rand(k, j + 3) * 0.8;
        const px = tx + Math.cos(a) * rr * 0.8, pz = tz + Math.sin(a) * rr * 0.8, cr = r * (0.55 + rand(k, j + 5) * 0.25);
        const col = j % 2 ? C.leaf : C.leafD;
        S.cyl(px, pz, y0, y0 + (hTop - hTrunk) * 0.45, cr * 0.6, cr, 7, col, { cap: false });
        S.cyl(px, pz, y0 + (hTop - hTrunk) * 0.45, y0 + (hTop - hTrunk) * 0.9, cr, cr * 0.35, 7, col);
      }
    });
  };
  // a row of balusters on a rail: from a to b at height y0 (absolute), h tall
  const balustrade = (a, b, y0, h, col = C.rail) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    S.box(m[0], m[1], y0, y0 + 0.12, len, 0.28, ang, col);
    S.box(m[0], m[1], y0 + h - 0.1, y0 + h, len, 0.24, ang, col);
    const n = Math.max(2, Math.round(len / 0.32));
    for (let i = 0; i <= n; i++) { const s = i / n, x = a[0] + (b[0] - a[0]) * s, z = a[1] + (b[1] - a[1]) * s; S.box(x, z, y0 + 0.12, y0 + h - 0.1, 0.1, 0.1, ang, col); }
  };
  // a fence along a to b: base wall, pillars every `step`, pickets (or bars for iron)
  const fence = (a, b, { y = 1.8, base = 0.5, step = 3, col = C.granite, picket = hex('#9a9c98'), pillar = col, gap = 0.14 } = {}) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]), t = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
    for (let s = 0; s < len - 0.05; s += step) {
      const s1 = Math.min(len, s + step), m = [a[0] + t[0] * (s + s1) / 2, a[1] + t[1] * (s + s1) / 2], g = ground(m[0], m[1]);
      S.box(m[0], m[1], g - 0.1, g + base, s1 - s, 0.3, ang, col);
      S.box(m[0], m[1], g + y - 0.25, g + y - 0.18, s1 - s, 0.05, ang, picket);
      for (let q = s + gap; q < s1 - 0.05; q += gap) { const p = [a[0] + t[0] * q, a[1] + t[1] * q]; S.box(p[0], p[1], g + base, g + y - 0.1, 0.05, 0.04, ang, picket); }
      const p = [a[0] + t[0] * s, a[1] + t[1] * s];
      S.box(p[0], p[1], g - 0.1, g + y + 0.15, 0.36, 0.36, ang, pillar);
    }
    const g = ground(b[0], b[1]);
    S.box(b[0], b[1], g - 0.1, g + y + 0.15, 0.36, 0.36, ang, pillar);
  };
  const wall = (a, b, h, col, creep = 0) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const g = Math.max(ground(a[0], a[1]), ground(b[0], b[1]));
    S.box(m[0], m[1], g - 0.15, g + h, len, 0.25, ang, col, { top: shade(col, 0.9) });
    if (creep) for (let s = 0.4; s < len - 0.4; s += 1.1) {
      const k = Math.round(m[0] * 31 + s * 17), p = [a[0] + (b[0] - a[0]) * s / len, a[1] + (b[1] - a[1]) * s / len];
      if (rand(k, 1) > creep) continue;
      S.box(p[0], p[1], g + h * (0.15 + rand(k, 2) * 0.4), g + h + 0.35, 1.2, 0.45, ang, rand(k, 3) < 0.5 ? C.creeper : C.leafD);
    }
  };
  const P2 = (o, t, f, u, v) => [o[0] + t[0] * u + f[0] * v, o[1] + t[1] * u + f[1] * v];

  // ================= the landmarks =================
  // ---- Võ Thị Sáu, west side north of Chu Văn An: the steel-and-timber bar (Street View vts-n, left) ----
  {
    const l = sig('vts', 274, 289, 1, SET, [12, 10, 8, 7]);
    if (l) {
      const h = 10.2, gy = body(l, h, hex('#3a2f28'), { kind: KIND.TIMBER, roof: hex('#4a4440') });
      later.push(() => {
        const { o, t, f, w } = l, ang = l.ang;
        const B = (u, v, y0, y1, sx, sz, col, opt) => { const p = P2(o, t, f, u, v); S.box(p[0], p[1], gy + y0, gy + y1, sx, sz, ang, col, opt); };
        const lit = (u, v, y0, y1, sx) => { const p = P2(o, t, f, u, v); L.warm.push([p[0], p[1], gy + y0, gy + y1, sx, 0.02, ang]); };
        // the steel frame on the front: posts and floor beams in rusted steel
        const np = Math.max(3, Math.round(w / 3.2));
        for (let i = 0; i <= np; i++) B(-w / 2 + 0.12 + ((w - 0.24) * i) / np, 0.12, 0, h + 0.3, 0.22, 0.22, C.rust);
        for (const y of [3.3, 6.7, h]) B(0, 0.12, y - 0.1, y + 0.2, w, 0.26, C.rust);
        // the open ground floor, lit, and timber slat screens on the floors above with light between them
        B(0, 0.04, 0.05, 3.2, w - 0.3, 0.06, C.shopLit);
        lit(0, 0.08, 0.1, 3.1, w - 0.5);
        for (const y of [3.5, 6.9]) {
          B(0, 0.02, y, y + 2.9, w - 0.3, 0.04, C.shopLit);
          lit(0, 0.05, y + 0.2, y + 2.6, w - 0.6);
          for (let u = -w / 2 + 0.4; u < w / 2 - 0.3; u += 0.32) B(u, 0.1, y + 0.1, y + 3.0, 0.09, 0.12, C.timber);
        }
        // the steel canopy over the pavement, planters along its edge and along each floor, creepers hanging down
        B(0, 1.15, 3.15, 3.35, w, 2.3, C.rust, { top: shade(C.rust, 0.8) });
        for (const [y, v] of [[3.35, 2.05], [6.8, 0.45]]) for (let u = -w / 2 + 0.6; u < w / 2 - 0.4; u += 1.2) {
          B(u, v, y, y + 0.45, 1.0, 0.45, hex('#3a3a36'));
          B(u, v, y + 0.45, y + 0.8 + rand(Math.round(u * 10), y) * 0.4, 1.05, 0.5, rand(Math.round(u * 7), y) < 0.5 ? C.leaf : C.leafD);
          if (rand(Math.round(u * 13), y) < 0.45) B(u, v + 0.2, y - 1.6, y, 0.5, 0.08, C.creeper);
        }
        for (let u = -w / 2 + 0.8; u < w / 2 - 0.5; u += 2.2) { B(u, 2.0, 0, 0.6, 0.9, 0.5, hex('#3a3a36')); B(u, 2.0, 0.6, 1.3, 0.95, 0.55, C.leaf); }
        // a dark board with warm lettering over the canopy
        B(0, 0.3, 3.45, 4.1, w * 0.5, 0.1, hex('#1f1c1a'));
        B(0, 0.36, 3.6, 3.95, w * 0.34, 0.03, hex('#e1b52d'));
        L.sign[2].push([...P2(o, t, f, 0, 0.38), gy + 3.62, gy + 3.93, w * 0.34, 0.01, ang]);
        // low wooden stools and tables under the canopy
        for (let u = -w / 2 + 1.5; u < w / 2 - 1; u += 2.4) {
          B(u, 1.0, 0, 0.7, 0.7, 0.7, C.wood);
          for (const du of [-0.55, 0.55]) B(u + du, 1.0, 0, 0.45, 0.35, 0.35, C.timber);
        }
      });
    }
  }

  // ---- the corner of Chu Văn An and Võ Thị Sáu: the cream two-storey colonial house (vts-n, right) ----
  // It replaces the mapped block there (a 14 m white slab in the city's data): two storeys of arched windows and
  // shutters with a balustrade along the roof, shops in the ground floor.
  const facesOf = (ring, gyOf) => { // the edges of a ring that face one of the three streets
    let sx = 0, sz = 0;
    for (const p of ring) { sx += p[0]; sz += p[1]; }
    const c = [sx / ring.length, sz / ring.length], out = [];
    for (let k = 0; k < ring.length; k++) {
      const p = ring[k], q = ring[(k + 1) % ring.length], len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (len < 3.5) continue;
      const t = [(q[0] - p[0]) / len, (q[1] - p[1]) / len], o = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      let f = [t[1], -t[0]];
      if ((o[0] - c[0]) * f[0] + (o[1] - c[1]) * f[1] < 0) f = [-f[0], -f[1]];
      const st = streetOf(o[0], o[1]);
      const street = st.d < 12 && st.d > HALF + 0.3 && Math.abs(dot(st.t, t)) > 0.85 && (st.p[0] - o[0]) * f[0] + (st.p[1] - o[1]) * f[1] > 0;
      out.push({ p, q, t, f, o, len, st, street, gy: gyOf ? gyOf(p, q) : 0 });
    }
    return out;
  };
  if (replaced.corner) {
    const ring = replaced.corner, h = 7.4, col = hex('#e8dcc0');
    const gy = block(ring, h, col, { kind: KIND.COLONIAL, roof: hex('#cfc9b8') });
    later.push(() => {
      for (const e of facesOf(ring)) {
        // the roof balustrade on every edge, a cornice under it
        const a = [e.p[0] + e.f[0] * 0.05, e.p[1] + e.f[1] * 0.05], b = [e.q[0] + e.f[0] * 0.05, e.q[1] + e.f[1] * 0.05];
        balustrade(a, b, gy + h, 0.95, hex('#f1ebdc'));
        const m = P2(e.o, e.t, e.f, 0, 0.12);
        S.box(m[0], m[1], gy + h - 0.3, gy + h, e.len, 0.3, Math.atan2(e.t[1], e.t[0]), hex('#f4efe2'));
        if (!e.street) continue;
        const ns = Math.max(1, Math.round(e.len / 6)), sw = e.len / ns;
        for (let j = 0; j < ns; j++) {
          const o = P2(e.o, e.t, e.f, -e.len / 2 + sw * (j + 0.5), 0.02);
          dress(o, e.t, e.f, sw - 0.1, h, gy, 910000 + j * 7 + Math.round(e.o[0]), { gap: e.st.d - HALF - 0.3, st: e.st.k, type: j % 2 ? 'cafe' : 'shop' });
        }
      }
    });
  }

  // ---- the Jasmine Hotel on Chu Văn An near Lê Lợi: nine storeys, a sign frame on its roof (cva-se) ----
  if (replaced.jasmine) {
    const ring = replaced.jasmine, h = 30.6, col = hex('#ece6da');
    const gy = block(ring, h, col, { roof: hex('#bdb9b0'), parapet: 0.8 });
    later.push(() => {
      // the lift head, and the roof sign facing up the street toward Lê Lợi
      const e = facesOf(ring);
      const tN = LN.cva.seg[LN.cva.seg.length - 2].t; // up the street, toward Lê Lợi
      const face = e.reduce((b, x) => (dot(x.f, tN) > dot(b.f, tN) ? x : b), e[0]);
      const ang = Math.atan2(face.t[1], face.t[0]), top = gy + h;
      const m = P2(face.o, face.t, face.f, 0, -2.5);
      S.box(m[0], m[1], top, top + 3.0, 4, 3.5, ang, shade(col, 0.92), { top: ROOF[1] });
      const sgn = P2(face.o, face.t, face.f, 0, -0.6), sw = Math.min(face.len - 1, 9);
      for (const u of [-sw / 2 + 0.4, 0, sw / 2 - 0.4]) { const p = P2(sgn, face.t, face.f, u, -0.3); S.box(p[0], p[1], top, top + 1.4, 0.15, 0.15, ang, C.iron); }
      S.box(sgn[0], sgn[1], top + 1.3, top + 3.2, sw, 0.18, ang, hex('#f2efe6'));
      const lt = P2(sgn, face.t, face.f, 0, 0.1);
      S.box(lt[0], lt[1], top + 1.75, top + 2.75, sw * 0.8, 0.05, ang, hex('#2c5a9a'));
      L.sign[1].push([lt[0], lt[1], top + 1.78, top + 2.72, sw * 0.8, 0.07, ang]);
      for (const x of e) if (x.street) dress(x.o, x.t, x.f, x.len - 0.2, h, gy, 920000, { gap: x.st.d - HALF - 0.3, st: 'cva', type: 'hotel' });
    });
  }

  // ---- the hotel closing the lane: cream, arched windows, balconies on its face toward the lane ----
  if (replaced.laneEnd) {
    const ring = replaced.laneEnd, h = 13.6, col = hex('#ebe3cf');
    const gy = block(ring, h, col, { kind: KIND.COLONIAL, roof: hex('#c9c4b8'), parapet: 0.8 });
    later.push(() => {
      for (const e of facesOf(ring)) {
        if (e.f[1] > -0.4 || e.len < 5) continue; // the faces looking north, up the lane
        const ang = Math.atan2(e.t[1], e.t[0]), bw = Math.min(e.len - 1.5, 6);
        for (let fl = 1; fl < 4; fl++) {
          const y = gy + fl * 3.4, p = P2(e.o, e.t, e.f, 0, 0.5), r = P2(e.o, e.t, e.f, 0, 0.97);
          S.box(p[0], p[1], y - 0.12, y + 0.06, bw, 1.0, ang, hex('#f2ede2'));
          S.box(r[0], r[1], y + 0.06, y + 1.0, bw, 0.06, ang, C.rail);
        }
      }
    });
  }

  // ---- Chu Văn An north of the lane mouth (cva-nw) ----
  {
    // SW side, past the side road's mouth: the salmon six-storey hotel, stacked balconies and air conditioners, with
    // Burger Ngon in its ground floor under a deep white fascia with mustard lettering, tables under cream umbrellas
    const sh = sig('cva', 106.5, 119, -1, SET, [12, 10, 8]);
    if (sh) {
      const floors = 6, h = floors * 3.4, col = hex('#c4826a'), gy = body(sh, h, col, { key: 2, roof: ROOF[3] });
      later.push(() => {
        const { o, t, f, w } = sh, ang = sh.ang;
        const B = (u, v, y0, y1, sx, sz, c, opt) => { const p = P2(o, t, f, u, v); S.box(p[0], p[1], gy + y0, gy + y1, sx, sz, ang, c, opt); };
        for (let fl = 2; fl < floors; fl++) {
          const y = fl * 3.4;
          B(0, 0.05, y - 0.15, y + 0.1, w, 0.35, shade(col, 0.88));
          for (const u of [-w * 0.27, w * 0.24]) {
            B(u, 0.5, y - 0.1, y + 0.06, w * 0.38, 1.0, shade(col, 0.82));
            B(u, 0.97, y + 0.06, y + 1.0, w * 0.38, 0.06, C.rail);
            if (rand(fl * 3 + Math.round(u), 7) < 0.7) B(u + w * 0.12, 0.35, y + 1.6, y + 2.15, 0.8, 0.3, C.ac);
          }
        }
        // a small gable over the top floor, white quoins at the edges
        const a = P2(o, t, f, -2, 0.02), b = P2(o, t, f, 2, 0.02), m = P2(o, t, f, 0, 0.02);
        S.tri([a[0], gy + h, a[1]], [b[0], gy + h, b[1]], [m[0], gy + h + 1.8, m[1]], shade(col, 0.95), [f[0], 0.1, f[1]]);
        for (const u of [-w / 2 + 0.15, w / 2 - 0.15]) B(u, 0.05, 4.4, h, 0.3, 0.12, hex('#e9e2d4'));
        // Burger Ngon
        B(0, 0.04, 0.05, 2.9, w - 0.4, 0.06, C.shopLit);
        L.warm.push([...P2(o, t, f, 0, 0.08), gy + 0.1, gy + 2.8, w - 0.6, 0.02, ang]);
        B(0, 0.6, 2.95, 4.3, w, 1.2, hex('#e9e6df'), { bottom: true });
        B(0, 1.22, 3.3, 3.95, w * 0.55, 0.04, hex('#c99a2e'));
        L.sign[2].push([...P2(o, t, f, 0, 1.25), gy + 3.32, gy + 3.93, w * 0.55, 0.02, ang]);
        B(w / 2 - 0.4, 0.55, 4.55, 8.6, 0.12, 0.85, hex('#2a2a2a'), { bottom: true });
        B(w / 2 - 0.4, 0.55, 4.9, 8.2, 0.15, 0.3, hex('#c99a2e'));
        for (let u = -w / 2 + 1.2; u < w / 2 - 0.8; u += 2.6) {
          const p = P2(o, t, f, u, 1.5);
          S.box(p[0], p[1], gy, gy + 0.75, 0.8, 0.8, ang, C.wood);
          S.cyl(p[0], p[1], gy + 0.75, gy + 2.2, 0.03, 0.03, 4, C.wire);
          S.cyl(p[0], p[1], gy + 1.7, gy + 2.3, 1.1, 0.05, 8, hex('#e8e0cc'));
        }
      });
    }
    // NE side, just past the lane mouth: a white two-storey café box
    const wb = sig('cva', 89.5, 94.5, 1, SET, [8, 7, 6, 5]);
    if (wb) {
      const gy = body(wb, 6.8, C.white, { kind: KIND.PLAIN, key: 4 });
      later.push(() => {
        const { o, t, f, w } = wb, ang = wb.ang;
        const B = (u, v, y0, y1, sx, sz, c) => { const p = P2(o, t, f, u, v); S.box(p[0], p[1], gy + y0, gy + y1, sx, sz, ang, c); };
        B(0, 0.04, 3.9, 5.6, w * 0.7, 0.05, C.glass);
        B(0, 0.7, 3.2, 3.4, w, 1.4, C.white);
        B(w * 0.2, 0.1, 1.8, 3.0, 1.4, 0.06, hex('#8fc8b8'));
      });
      lotFront(wb, 6.8, gy, 5, { st: 'cva', type: 'cafe', sign: false });
    }
    // the white gate and fence, and behind them the red-brown timber café under a rusty tin roof and creepers
    const tc = sig('cva', 98, 108.5, 1, SET + 3.5, [9, 8, 7]);
    const yard = lotAt('cva', 94.6, 108.5, 1, SET, 3.5);
    if (tc) {
      take(yard);
      const gy0 = body(tc, 3.2, hex('#4a3a30'), { kind: KIND.PLAIN, key: 6 });
      const up = lot(LP(tc, 0, 0), tc.t, tc.f, tc.w, tc.d); // the timber upper floor over it
      S.kind = KIND.TIMBER;
      S.base = gy0 + 3.2;
      S.box(up.c[0], up.c[1], gy0 + 3.2, gy0 + 6.4, up.w - 0.08, up.d, up.ang, hex('#9a4a32'), { top: hex('#7a3e2c') });
      S.kind = KIND.PLAIN;
      S.base = 0;
      later.push(() => {
        const { o, t, f, w, d } = tc, ang = tc.ang, gy = gy0;
        const B = (u, v, y0, y1, sx, sz, c, opt) => { const p = P2(o, t, f, u, v); S.box(p[0], p[1], gy + y0, gy + y1, sx, sz, ang, c, opt); };
        // a mono-pitch tin roof overhanging the front, a timber balcony rail, creepers over the front
        const q = (u, v, y) => { const p = P2(o, t, f, u, v); return [p[0], gy + y, p[1]]; };
        const rc = hex('#8a5a3e');
        S.quad(q(-w / 2 - 0.4, 2.2, 6.6), q(w / 2 + 0.4, 2.2, 6.6), q(w / 2 + 0.4, -d - 0.3, 8.2), q(-w / 2 - 0.4, -d - 0.3, 8.2), rc, [f[0] * 0.2, 1, f[1] * 0.2]);
        S.quad(q(-w / 2 - 0.4, -d - 0.3, 8.15), q(w / 2 + 0.4, -d - 0.3, 8.15), q(w / 2 + 0.4, 2.2, 6.55), q(-w / 2 - 0.4, 2.2, 6.55), shade(rc, 0.6), [0, -1, 0]);
        for (const u of [-w / 2 + 0.2, w / 2 - 0.2]) B(u, 2.0, 0, 6.6, 0.18, 0.18, C.timber);
        B(0, 2.0, 3.2, 3.4, w, 0.2, C.timber);
        B(0, 2.0, 3.4, 4.4, w, 0.08, hex('#7a3e2c'));
        B(0, 1.0, 3.15, 3.35, w, 2.0, C.timber);
        L.warm.push([...P2(o, t, f, 0, 0.06), gy + 0.2, gy + 2.9, w - 0.6, 0.02, ang]);
        for (let u = -w / 2 + 0.5; u < w / 2; u += 1.3) {
          const k = Math.round(u * 17 + o[0]);
          if (rand(k, 1) < 0.6) B(u, 2.1, 1.0 + rand(k, 2) * 2, 4.4 + rand(k, 3) * 2.4, 1.0 + rand(k, 4), 0.5, rand(k, 5) < 0.5 ? C.creeper : C.leaf);
        }
        // pots and café tables in the yard
        for (let u = -w / 2 + 1; u < w / 2 - 0.5; u += 2.2) { B(u, 2.6, 0, 0.5, 0.5, 0.5, C.pot); B(u, 2.6, 0.5, 1.2, 0.6, 0.6, C.leafD); }
      });
      later.push(() => {
        // the fence: white base and ornate white pickets, white pillars, the double gate
        const y0 = yard, A = LP(y0, -y0.w / 2, -0.05), Bq = LP(y0, y0.w / 2, -0.05);
        fence(A, Bq, { y: 1.9, base: 0.6, step: 2.6, col: C.white, picket: hex('#e8e6e0'), pillar: hex('#f2f0ea'), gap: 0.16 });
        const gm = LP(y0, -y0.w / 2 + 4.0, -0.05), g = ground(gm[0], gm[1]);
        S.box(gm[0], gm[1], g, g + 2.0, 2.6, 0.08, y0.ang, hex('#ecebe6'));
        for (const u of [-0.7, 0, 0.7]) { const p = P2(gm, y0.t, y0.f, u, 0.06); S.box(p[0], p[1], g + 0.6, g + 1.5, 0.4, 0.02, y0.ang, C.iron); }
        for (const u of [-1.45, 1.45]) { const p = P2(gm, y0.t, y0.f, u, 0); S.box(p[0], p[1], g, g + 2.5, 0.5, 0.5, y0.ang, hex('#f2f0ea')); }
      });
    }
    // the tree at the kerb up the street
    const tp = LN.cva.at(114, 4.4);
    tree(tp[0], tp[1], 4.2, 4.6, 10, [0, 0]);
  }

  // ---- Chu Văn An at the Lê Lợi end (cva-se) ----
  {
    // NE side: the tall black-glass and grey-panel front at the corner, then a green-and-white block
    const bg = sig('cva', 333.5, 345.5, 1, SET, [12, 10, 8]);
    if (bg) {
      const h = 23.8, gy = body(bg, h, hex('#23272b'), { kind: KIND.GLAZED, roof: ROOF[1], key: 7 });
      later.push(() => {
        const { o, t, f, w } = bg, ang = bg.ang;
        const B = (u, v, y0, y1, sx, sz, c) => { const p = P2(o, t, f, u, v); S.box(p[0], p[1], gy + y0, gy + y1, sx, sz, ang, c); };
        for (let u = -w / 2 + 0.25; u <= w / 2; u += w / 4 - 0.12) B(u, 0.15, 3.4, h + 0.4, 0.5, 0.3, hex('#8d9196'));
        for (let fl = 1; fl <= 7; fl++) B(0, 0.1, fl * 3.4 - 0.35, fl * 3.4, w, 0.2, hex('#7d8186'));
        B(0, 0.6, 3.1, 3.35, w, 1.2, hex('#7d8186'));
      });
      lotFront(bg, h, gy, 8, { st: 'cva', type: 'shop' });
    }
    const gw = sig('cva', 322, 333.3, 1, SET, [12, 10, 8]);
    if (gw) { const r = tube(gw, 9, [hex('#cfe0d0')], 5, true); lotFront(gw, r.h, r.gy, 9, { st: 'cva', type: 'cafe' }); }
    // SW side: the single-storey tiled corner shop with its green sign, the white block standing behind it
    const cs = sig('cva', 332.5, 341.2, -1, SET, [7, 6, 5]);
    if (cs) {
      const gy = body(cs, 3.6, hex('#e7e1d2'), { kind: KIND.PLAIN, key: 10 });
      S.hip(cs.c[0], cs.c[1], cs.w + 0.6, cs.d + 0.6, cs.ang, gy + 3.6, 1.8, hex('#9a4a32'));
      later.push(() => {
        const { o, t, f, w } = cs, ang = cs.ang;
        const B = (u, v, y0, y1, sx, sz, c) => { const p = P2(o, t, f, u, v); S.box(p[0], p[1], gy + y0, gy + y1, sx, sz, ang, c); };
        B(0, 0.04, 0.05, 2.5, w * 0.8, 0.06, C.shopLit);
        L.warm.push([...P2(o, t, f, 0, 0.08), gy + 0.1, gy + 2.4, w * 0.8 - 0.2, 0.02, ang]);
        B(0, 0.4, 2.55, 3.4, w * 0.9, 0.12, hex('#2f7a3e'));
        B(0, 0.47, 2.8, 3.15, w * 0.55, 0.03, hex('#f4f1e8'));
        L.sign[3].push([...P2(o, t, f, 0, 0.5), gy + 2.6, gy + 3.35, w * 0.85, 0.01, ang]);
      });
    }
    const wbk = sig('cva', 330, 340.6, -1, SET + 7.5, [10, 8, 6]);
    if (wbk) tube(wbk, 11, [hex('#eceae4')], 5, false);
  }

  // ================= the lane =================
  // Street View (lane, 2024): the Trường Tiền hotel, grey-green under a creeper, and a yellow colonial house on the
  // east side; on the west a grey picket fence between granite pillars, a dark iron gate, a white villa back in its
  // garden and trees whose crowns meet over the lane; the cream hotel closes the end where the lane turns.
  const LL = LN.lane;
  const laneLot = (s0, s1, sg, set, ds) => { const l = lotAt('lane', s0, s1, sg, set, ds[0]); const r = deepest(l, ds); if (!r) console.warn("photay: no room on the lane at", s0); return r; };
  {
    const hot = laneLot(3, 14.5, -1, LANE_SET, [12, 10, 8, 6]);
    if (hot) {
      const h = 13.6, gy = body(hot, h, hex('#9fb2ad'), { key: 20 });
      later.push(() => {
        const { o, t, f, w } = hot, ang = hot.ang;
        const B = (u, v, y0, y1, sx, sz, c) => { const p = P2(o, t, f, u, v); S.box(p[0], p[1], gy + y0, gy + y1, sx, sz, ang, c); };
        for (let fl = 1; fl < 4; fl++) { B(0, 0.4, fl * 3.4 - 0.1, fl * 3.4 + 0.06, w - 1, 0.8, hex('#8a9c97')); B(0, 0.77, fl * 3.4 + 0.06, fl * 3.4 + 0.95, w - 1, 0.05, C.rail); }
        for (let u = -w / 2 + 0.6; u < w / 2; u += 0.9) { // the creeper over its lower floors
          const k = Math.round(u * 19 + 7);
          B(u, 0.12, 0.3 + rand(k, 1), 3.0 + rand(k, 2) * 5.5, 0.8 + rand(k, 3) * 0.5, 0.25, rand(k, 4) < 0.5 ? C.creeper : C.leafD);
        }
      });
      front(hot.o, hot.t, hot.f, hot.w - 0.1, h, gy, 21, { gap: 0.3, st: 'cva', type: 'hotel' });
    }
    const yc = laneLot(17.5, 27, -1, LANE_SET, [10, 8, 6]);
    if (yc) {
      const gy = body(yc, 7.2, hex('#dcc684'), { kind: KIND.COLONIAL, key: 22 });
      later.push(() => { const p = LP(yc, 0, -0.1); S.box(p[0], p[1], gy + 7.0, gy + 7.4, yc.w, 0.35, yc.ang, hex('#efe6c8')); });
    }
    const vil = laneLot(8, 21, 1, LANE_HALF + 4.5, [10, 9, 8, 7]);
    if (vil) {
      const h = 10.2, gy = body(vil, h, hex('#eeeae2'), { kind: KIND.COLONIAL, key: 23 });
      take(lotAt('lane', 2, 40, 1, LANE_HALF, 4.4)); // its garden: nothing built between fence and villa
      later.push(() => {
        const { o, t, f, w } = vil, ang = vil.ang;
        const B = (u, v, y0, y1, sx, sz, c) => { const p = P2(o, t, f, u, v); S.box(p[0], p[1], gy + y0, gy + y1, sx, sz, ang, c); };
        for (const fl of [1, 2]) { B(0, 0.6, fl * 3.4 - 0.12, fl * 3.4 + 0.06, w * 0.6, 1.2, hex('#f4f1ea')); B(0, 1.17, fl * 3.4 + 0.06, fl * 3.4 + 1.0, w * 0.6, 0.06, C.rail); }
        B(0, 0.1, h - 0.3, h + 0.6, w, 0.3, hex('#f4f1ea'));
      });
    }
    later.push(() => {
      // west: the picket fence with granite pillars, the iron gate at 15-17 m
      const W = (s) => LL.at(s, LANE_HALF);
      fence(W(2), W(15), { y: 1.7, base: 0.45, step: 3 });
      fence(W(17), W(40.5), { y: 1.7, base: 0.45, step: 3 });
      const g0 = W(15), g1 = W(17), gm = [(g0[0] + g1[0]) / 2, (g0[1] + g1[1]) / 2], ang = Math.atan2(g1[1] - g0[1], g1[0] - g0[0]), g = ground(gm[0], gm[1]);
      S.box(gm[0], gm[1], g + 1.95, g + 2.05, 2, 0.06, ang, C.iron);
      S.box(gm[0], gm[1], g + 0.05, g + 0.15, 2, 0.06, ang, C.iron);
      for (let q = 0.1; q < 2; q += 0.12) { const p = [g0[0] + (g1[0] - g0[0]) * q / 2, g0[1] + (g1[1] - g0[1]) * q / 2]; S.box(p[0], p[1], g + 0.1, g + 2.0, 0.04, 0.04, ang, C.iron); }
      // east: a creeper-hung wall between the hotel and the yellow house, then the garden wall with gate pillars
      const E = (s) => LL.at(s, -LANE_SET - 0.13);
      wall(E(14.6), E(17.4), 2.6, hex('#c9c4b8'), 0.9);
      wall(E(27.2), E(32), 2.2, hex('#d6cbb5'), 0.5);
      wall(E(35), E(40.6), 2.2, hex('#d6cbb5'), 0.5);
      for (const s of [32, 35]) { const p = E(s), gg = ground(p[0], p[1]); S.box(p[0], p[1], gg - 0.1, gg + 2.7, 0.55, 0.55, 0, hex('#e2dccd')); }
      wall(E(42.5), E(57), 2.4, hex('#e2dccd'), 0.6);
    });
    // trees in the villa's garden leaning over the lane
    for (const [s, v, r] of [[5, 4.0, 3.4], [19.5, 4.4, 3.8], [31, 3.9, 3.2]]) {
      const p = LL.at(s, v), q = LL.at(s, 2.2);
      tree(p[0], p[1], r, 4.4, 8.2, [q[0] - p[0], q[1] - p[1]]);
    }
    // the slabs: light concrete, a metre square, two tones, dark joints, wall to wall; laid 0.3 m up, above the
    // overlay the city draws the lane with (polygon offset), which otherwise wins at a grazing angle
    later.push(() => {
      S.kind = KIND.GROUND;
      for (const g of LL.seg) {
        const nu = Math.max(1, Math.round(g.L / 1.0)), du = g.L / nu;
        const Q = (u, v, y) => { const x = g.a[0] + g.t[0] * u + g.n[0] * v, z = g.a[1] + g.t[1] * u + g.n[1] * v; return [x, LAND_Y + rise(x, z) + y, z]; };
        S.quad(Q(0, -LANE_HALF, 0.3), Q(g.L, -LANE_HALF, 0.3), Q(g.L, LANE_HALF, 0.3), Q(0, LANE_HALF, 0.3), C.joint, [0, 1, 0]);
        for (let j = 0; j < nu; j++) for (let r = 0; r < 4; r++) {
          const u0 = j * du + 0.05, u1 = (j + 1) * du - 0.05, v0 = -LANE_HALF + r + 0.05, v1 = v0 + 0.9;
          const k = Math.round(g.s0 + j) * 4 + r, col = (j + r) % 2 ? C.slabA : C.slabB;
          S.quad(Q(u0, v0, 0.33), Q(u1, v0, 0.33), Q(u1, v1, 0.33), Q(u0, v1, 0.33), rand(k, 1) < 0.15 ? shade(col, 0.95) : col, [0, 1, 0]);
        }
      }
      S.kind = KIND.PLAIN;
    });
  }

  // ================= corners =================
  // wherever a road meets one of the three streets (or the lane), a house on each corner fronting both
  const STREETK = Object.keys(STREETS);
  const keyOf = (p) => {
    for (const k of STREETK) if (nearest(STREETS[k], p[0], p[1]).d < 1.2) return k;
    if (nearest(LANE, p[0], p[1]).d < 0.8) return 'lane';
    return null;
  };
  const junctions = [];
  for (const r of allRoads) {
    if (r.c > 5) continue;
    for (const p of r.pts) {
      if (!inside(p[0], p[1]) || junctions.some((j) => Math.hypot(j[0] - p[0], j[1] - p[1]) < 3)) continue;
      if (allRoads.some((q) => q !== r && q.c <= 5 && q.pts.some((s) => Math.hypot(s[0] - p[0], s[1] - p[1]) < 0.6))) junctions.push(p);
    }
  }
  const walk = (pts, i, dir, dist) => { // the point `dist` along a polyline from vertex i, toward dir
    let p = pts[i], left = dist;
    for (let j = i + dir; j >= 0 && j < pts.length; j += dir) {
      const q = pts[j], L0 = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (L0 >= left) return [p[0] + (q[0] - p[0]) * left / L0, p[1] + (q[1] - p[1]) * left / L0];
      left -= L0; p = q;
    }
    return dist - left > 3 ? p : null;
  };
  for (const J of junctions) {
    const arms = [];
    for (const r of allRoads) {
      if (r.c > 5) continue;
      r.pts.forEach((p, i) => {
        if (Math.hypot(p[0] - J[0], p[1] - J[1]) > 0.6) return;
        for (const dir of [-1, 1]) {
          const q = walk(r.pts, i, dir, 8);
          if (!q) continue;
          const a = unit([q[0] - J[0], q[1] - J[1]]);
          if (arms.some((b) => dot(a, b.a) > 0.966)) continue;
          const k = keyOf([J[0] + a[0] * 6, J[1] + a[1] * 6]);
          arms.push({ a, k, set: STREETK.includes(k) ? SET : k === 'lane' ? LANE_SET : r.half + 0.6, ang: Math.atan2(a[1], a[0]) });
        }
      });
    }
    if (!arms.some((x) => x.k)) continue;
    arms.sort((p, q) => p.ang - q.ang);
    for (let i = 0; i < arms.length && arms.length > 1; i++) {
      const A = arms[i], Bm = arms[(i + 1) % arms.length];
      let gap = Bm.ang - A.ang;
      if (gap <= 0) gap += Math.PI * 2;
      if (gap < 0.96 || gap > 2.18 || !(A.k || Bm.k)) continue; // 55 to 125 degrees
      const a1 = A.a, a2 = Bm.a;
      const n1 = unit([a2[0] - dot(a1, a2) * a1[0], a2[1] - dot(a1, a2) * a1[1]]), n2 = unit([a1[0] - dot(a1, a2) * a2[0], a1[1] - dot(a1, a2) * a2[1]]);
      // a1*u - a2*w = n2*s2 - n1*s1
      const rx = n2[0] * Bm.set - n1[0] * A.set, rz = n2[1] * Bm.set - n1[1] * A.set, det = -a1[0] * a2[1] + a2[0] * a1[1];
      const u = (-rx * a2[1] + a2[0] * rz) / det;
      const Cc = [J[0] + n1[0] * A.set + a1[0] * u, J[1] + n1[1] * A.set + a1[1] * u];
      const bis = unit([a1[0] + a2[0], a1[1] + a2[1]]);
      const pnlVts = [A.k, Bm.k].includes('pnl') && [A.k, Bm.k].includes('vts');
      const pink = pnlVts && bis[1] < -0.5, orange = pnlVts && bis[0] < -0.5;
      const sizes = pink ? [[12, 10], [10, 9], [9, 8], [8, 7]] : orange ? [[11, 10], [10, 9], [9, 8], [8, 7]] : [[9, 9], [8, 8], [8, 6], [6, 8], [6, 6], [5, 5]];
      let ring = null, L1 = 0, L2 = 0;
      for (const [l1, l2] of sizes) {
        const pts = [Cc, [Cc[0] + a1[0] * l1, Cc[1] + a1[1] * l1], [Cc[0] + a1[0] * l1 + a2[0] * l2, Cc[1] + a1[1] * l1 + a2[1] * l2], [Cc[0] + a2[0] * l2, Cc[1] + a2[1] * l2]];
        let ok = true;
        for (let x = 0.3; x <= l1 - 0.3 && ok; x += Math.min(1, (l1 - 0.6) / 4)) for (let y = 0.3; y <= l2 - 0.3 && ok; y += Math.min(1, (l2 - 0.6) / 4)) {
          const p = [Cc[0] + a1[0] * x + a2[0] * y, Cc[1] + a1[1] * x + a2[1] * y];
          if (blocked(p[0], p[1])) ok = false;
        }
        if (ok) { ring = pts; L1 = l1; L2 = l2; break; }
      }
      if (!ring) continue;
      const key = 400000 + Math.round(Cc[0] * 3 + Cc[1] * 7);
      const st = STREETK.includes(A.k) ? A.k : STREETK.includes(Bm.k) ? Bm.k : 'cva';
      const floors = pink ? 2 : orange ? 4 : 3 + (rand(key, 1) < 0.45 ? 1 : 0);
      const col = pink ? hex('#e3b4ad') : orange ? hex('#ece0c4') : pick(STYLE[st].walls, key, 2);
      const h = floors * 3.4 + (pink ? 0.6 : 0);
      const gy = block(ring, h, col, { kind: pink ? KIND.COLONIAL : KIND.FACADE, roof: pick(ROOF, key, 3), parapet: 0.6 });
      const faces = [[A, a1, n1, L1, Cc], [Bm, a2, n2, L2, Cc]];
      later.push(() => {
        for (const [arm, a, n, len] of faces) {
          const f = [-n[0], -n[1]], o = [Cc[0] + a[0] * len / 2, Cc[1] + a[1] * len / 2], ang = Math.atan2(a[1], a[0]);
          const B = (uu, v, y0, y1, sx, sz, c, opt) => { const p = P2(o, a, f, uu, v); S.box(p[0], p[1], gy + y0, gy + y1, sx, sz, ang, c, opt); };
          if (pink) { // the wrap-around balcony on columns, its balustrade, the eave over it
            B(0, 0.65, 3.3, 3.5, len + 1.3, 1.3, hex('#efe6dc'));
            const r0 = P2(o, a, f, -len / 2, 1.22), r1 = P2(o, a, f, len / 2 + 1.22, 1.22);
            balustrade(r0, r1, gy + 3.5, 0.9, hex('#f3eee4'));
            for (let x = -len / 2 + 0.3; x <= len / 2 + 1.1; x += (len + 0.8) / 3) B(x, 1.15, 3.5, 6.9, 0.28, 0.28, hex('#e9c4be'));
            B(0, 0.75, 6.9, 7.1, len + 1.5, 1.5, hex('#e3b4ad'));
            B(0, 1.5, 6.2, 6.9, len * 0.6, 0.05, hex('#3f7a5a'));
          }
          if (orange) { // the orange restaurant in the ground floor, its long pink sign, red lanterns
            B(0, 0.06, 0.05, 3.0, len, 0.12, hex('#dd7a2c'));
            B(0, 0.13, 0.1, 2.6, len * 0.7, 0.04, C.shopLit);
            L.warm.push([...P2(o, a, f, 0, 0.16), gy + 0.15, gy + 2.5, len * 0.7 - 0.2, 0.02, ang]);
            B(0, 0.3, 3.0, 3.7, len, 0.2, hex('#c55a8a'));
            B(0, 0.41, 3.15, 3.55, len * 0.6, 0.03, hex('#f4f1e8'));
            L.sign[6].push([...P2(o, a, f, 0, 0.43), gy + 3.17, gy + 3.53, len * 0.6, 0.01, ang]);
            B(0, 0.25, 2.6, 3.0, len, 0.3, hex('#2f5fa8'));
            for (let x = -len / 2 + 1; x < len / 2; x += 1.8) { const p = P2(o, a, f, x, 0.9); S.cyl(p[0], p[1], gy + 2.0, gy + 2.4, 0.18, 0.18, 6, C.lantern); gp.push(p[0], gy + 2.2, p[1]); gc.push(1, 0.32, 0.18); }
          }
          if (!STREETK.includes(arm.k)) continue;
          if (orange) continue;
          const gapS = arm.set - HALF - 0.3;
          dress(o, a, f, len - 0.4, h, gy, key + (arm === A ? 0 : 1), { gap: gapS, st: arm.k, balcony: pink, sign: !pink || arm === A, type: pink ? 'shop' : null });
        }
      });
    }
  }

  // ================= the rows =================
  // along both sides of the three streets, tube houses one after another where the ground is free, with up to two
  // more rows behind; along the side roads inside the quarter, one row of plainer houses
  const fill = (pts, { set, st = null, back = 0, keyBase }) => {
    const walls = st ? STYLE[st].walls : SIDE_WALLS;
    for (let i = 0; i + 1 < pts.length; i++) {
      const A = pts[i], Bp = pts[i + 1], len = Math.hypot(Bp[0] - A[0], Bp[1] - A[1]);
      const t = [(Bp[0] - A[0]) / len, (Bp[1] - A[1]) / len];
      for (const sg of [-1, 1]) {
        const f = [t[1] * sg, -t[0] * sg]; // from the house out to the street
        let u = 0.4, n = 0;
        while (u < len - 3.8) {
          const key = keyBase + Math.round(A[0] * 7 + A[1] * 13) * 4 + (sg > 0 ? 1 : 0) + n * 9973;
          n++;
          const w = 4 + rand(key, 40) * 1.6;
          if (u + w > len - 0.4) break;
          const um = u + w / 2, o = [A[0] + t[0] * um - f[0] * set, A[1] + t[1] * um - f[1] * set];
          const l = deepest(lot(o, t, f, w, 1), st ? [8 + rand(key, 41) * 6, 10, 8, 6, 4.5] : [10, 8, 6, 4.5]);
          if (!l) { u += 1.0; continue; }
          const r = rand(key, 42), floors = st ? (r < 0.15 ? 2 : r < 0.5 ? 3 : r < 0.82 ? 4 : 5) : (r < 0.35 ? 2 : r < 0.8 ? 3 : 4);
          const hs = tube(l, key, walls, floors, !!st);
          if (st) lotFront(l, hs.h, hs.gy, key, { st });
          let depth = l.d;
          for (let b = 0; b < back; b++) {
            const ob = [o[0] - f[0] * depth, o[1] - f[1] * depth];
            const lb = deepest(lot(ob, t, f, w, 1), [10, 8, 6, 4.5]);
            if (!lb) break;
            tube(lb, key + 17 * (b + 1), walls, 2 + Math.floor(rand(key, 80 + b) * 3), false);
            depth += lb.d;
          }
          u += w;
        }
      }
    }
  };
  for (const k of STREETK) fill(STREETS[k], { set: SET, st: k, back: 2, keyBase: 300000 });
  for (const r of allRoads) {
    if (r.c < 3 || r.c > 4 || !r.pts.some((p) => inside(p[0], p[1]))) continue;
    if (keyOf(r.pts[Math.floor(r.pts.length / 2)]) || nearest(LANE, ...r.pts[0]).d < 0.8 && nearest(LANE, ...r.pts[r.pts.length - 1]).d < 0.8) continue;
    fill(r.pts, { set: r.half + 0.6, back: 1, keyBase: 500000 });
  }

  // the mapped buildings that stay: the edges of their outline that face one of the streets get shopfronts
  rings.forEach(({ ring, bi }) => {
    if (!ring.some((p) => inside(p[0], p[1]))) return;
    const rec = data.bld[bi], h = (rec[5] || rec[1] || 70) / 10;
    for (const e of facesOf(ring)) {
      if (!e.street || !inside(e.o[0], e.o[1]) || e.st.d > 10) continue;
      const gy = LAND_Y + Math.max(rise(e.p[0], e.p[1]), rise(e.q[0], e.q[1]));
      const ns = Math.max(1, Math.round(e.len / 6.5)), sw = e.len / ns;
      for (let j = 0; j < ns; j++) {
        const u = -e.len / 2 + sw * (j + 0.5);
        front(P2(e.o, e.t, e.f, u, 0.02), e.t, e.f, sw - 0.1, h, gy, 200000 + bi * 16 + j, { gap: e.st.d - HALF - 0.3, st: e.st.k });
      }
    }
  });

  // ================= the street (dressing) =================
  const nD = S.n;
  for (const fn of later) fn();
  // kerbside lamp posts every 16 m, grey with a flat dome head (Street View, all three streets), none in a side road's
  // mouth or under a tree; on Chu Văn An a string of white paper lanterns across the street between each pair
  const ownStreet = (k, p) => nearest(STREETS[k], p[0], p[1]).d < 1.0;
  const nearSide = (k, e) => allRoads.some((r) => { const q = nearest(r.pts, e[0], e[1]); return q.d < r.half + 2.5 && !ownStreet(k, q.p); }) ||
    nearest(LANE, e[0], e[1]).d < LANE_HALF + 2.5 || trees.some((tq) => Math.hypot(tq[0] - e[0], tq[1] - e[1]) < 3);
  for (const k of STREETK) {
    const pts = STREETS[k];
    for (let i = 0; i + 1 < pts.length; i++) {
      const A = pts[i], Bp = pts[i + 1], len = Math.hypot(Bp[0] - A[0], Bp[1] - A[1]);
      const t = [(Bp[0] - A[0]) / len, (Bp[1] - A[1]) / len], n = [-t[1], t[0]];
      for (let u = 6; u < len - 6; u += 16) {
        const m = [A[0] + t[0] * u, A[1] + t[1] * u];
        if (!inside(m[0], m[1])) continue;
        const ends = [-1, 1].map((sg) => [m[0] + n[0] * sg * (HALF + 0.35), m[1] + n[1] * sg * (HALF + 0.35)]);
        if (ends.some((e) => nearSide(k, e))) continue;
        const yTop = ends.map((e) => ground(e[0], e[1]) + 4.7);
        for (let j = 0; j < 2; j++) {
          const [ex, ez] = ends[j], y = yTop[j];
          S.cyl(ex, ez, y - 4.7, y - 4.2, 0.16, 0.12, 6, C.pole);
          S.cyl(ex, ez, y - 4.2, y + 0.3, 0.085, 0.065, 6, C.pole);
          S.cyl(ex, ez, y + 0.3, y + 0.42, 0.06, 0.4, 8, C.pole, { cap: false });
          S.cyl(ex, ez, y + 0.42, y + 0.5, 0.4, 0.3, 8, C.pole);
          gp.push(ex, y + 0.27, ez); gc.push(1, 0.92, 0.75);
        }
        const seg = 8, Y = (s0) => yTop[0] + (yTop[1] - yTop[0]) * s0 - 0.55 * 4 * s0 * (1 - s0);
        const W = (s0) => [ends[0][0] + (ends[1][0] - ends[0][0]) * s0, ends[0][1] + (ends[1][1] - ends[0][1]) * s0];
        for (let j = 0; j < seg; j++) {
          const p0 = W(j / seg), p1 = W((j + 1) / seg);
          S.beam([p0[0], Y(j / seg), p0[1]], [p1[0], Y((j + 1) / seg), p1[1]], 0.03, 0.03, C.wire);
        }
        const nb = Math.round((2 * HALF + 0.7) / 0.85);
        for (let j = 1; j < nb; j++) {
          const s0 = j / nb, p = W(s0), y = Y(s0) - 0.1;
          const col = k === 'cva' ? C.paper : k === 'vts' ? ((j + i) % 2 ? C.lantern : C.lanternY) : ((j + i) % 3 === 0 ? C.lantern : (j + i) % 3 === 1 ? C.lanternY : C.paper);
          S.box(p[0], p[1], y - 0.38, y, 0.28, 0.28, Math.atan2(t[1], t[0]), col);
          gp.push(p[0], y - 0.18, p[1]);
          gc.push(...(k === 'vts' && (j + i) % 2 ? [1, 0.35, 0.2] : BULBS[(j + i) % BULBS.length]));
        }
      }
    }
  }
  // pedestrian walking-street welcome arches over Võ Thị Sáu and Phạm Ngũ Lão (clear of carriageway, on the kerbs)
  for (const [k, sAt] of [['vts', 165], ['pnl', 22]]) {
    const c = LN[k].at(sAt, 0), a2 = LN[k].at(sAt + 1, 0);
    const tx = a2[0] - c[0], tz = a2[1] - c[1], tl = Math.hypot(tx, tz) || 1;
    const ux = tx / tl, uz = tz / tl, nx = -uz, nz = ux, ang = Math.atan2(nz, nx);
    const span = HALF + 0.55, y0 = ground(c[0], c[1]);
    S.kind = KIND.PLAIN;
    for (const sg of [-1, 1]) {
      const px = c[0] + nx * sg * span, pz = c[1] + nz * sg * span;
      S.box(px, pz, y0, y0 + 5.6, 0.42, 0.42, ang, hex('#9e2e24'));
      S.box(px, pz, y0, y0 + 0.7, 0.62, 0.62, ang, hex('#c9a248'));
    }
    S.box(c[0], c[1], y0 + 5.2, y0 + 5.85, span * 2 + 0.8, 0.42, ang, hex('#9e2e24'));
    S.box(c[0], c[1], y0 + 5.42, y0 + 5.66, span * 1.4, 0.48, ang, hex('#e5be4c'));
    L.sign[2].push([c[0], c[1], y0 + 5.4, y0 + 5.68, span * 1.35, 0.52, ang]);
  }
  // pavements: slabs in two tones of each street's stone, from the kerb back to the house fronts
  S.kind = KIND.GROUND;
  for (const k of STREETK) {
    const pts = STREETS[k], pave = STYLE[k].pave;
    for (let i = 0; i + 1 < pts.length; i++) {
      const A = pts[i], Bp = pts[i + 1], len = Math.hypot(Bp[0] - A[0], Bp[1] - A[1]);
      const t = [(Bp[0] - A[0]) / len, (Bp[1] - A[1]) / len], n = [-t[1], t[0]];
      const nu = Math.max(1, Math.round(len / 1.2)), du = len / nu;
      for (const sg of [-1, 1]) for (let j = 0; j < nu; j++) for (let r = 0; r < 2; r++) {
        const v0 = HALF + 0.25 + r * 1.0, v1 = v0 + 1.0, u0 = j * du, u1 = u0 + du;
        const Q = (uu, v) => [A[0] + t[0] * uu + n[0] * v * sg, A[1] + t[1] * uu + n[1] * v * sg];
        const mid = Q((u0 + u1) / 2, (v0 + v1) / 2);
        if (!inside(mid[0], mid[1]) || onRoad(mid[0], mid[1], 0.6)) continue;
        if (streetOf(mid[0], mid[1]).d < HALF + 0.2) continue; // another of the three
        const col = (j + r) % 2 ? pave[0] : pave[1];
        const q4 = [Q(u0, v0), Q(u1, v0), Q(u1, v1), Q(u0, v1)].map((q) => [q[0], LAND_Y + rise(q[0], q[1]) + 0.085, q[1]]);
        S.quad(q4[0], q4[1], q4[2], q4[3], col, [0, 1, 0]);
      }
    }
  }
  S.kind = KIND.PLAIN;
  // none of the dressing is ground the city's houses must keep off: it hangs on the houses or lies under them
  (S.noCover = S.noCover || []).push([nD, S.n]);

  // ---------------- night ----------------
  const addLit = (list, color, boost) => {
    if (!list.length) return;
    const LB = new Buf(list.length * 12);
    for (const [x, z, y0, y1, sx, sz, ang] of list) LB.box(x, z, y0, y1, sx, sz, ang, [1, 1, 1]);
    const m = new THREE.Mesh(LB.geometry(), lightMaterial(color, boost));
    m.renderOrder = 19;
    m.userData.landmark = id;
    group.add(m);
  };
  addLit(L.warm, 0xffb060, 0.5);
  GLOW.forEach((col, k) => addLit(L.sign[k], col, 1.15));
  addGlowPointCloud(group, gp, gc, 2.2, id);
  S.kind = KIND.PLAIN;
  S.base = 0;
}
