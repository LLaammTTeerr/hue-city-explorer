import { KIND, hex, shade } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { pavilion } from '../citadel.js';

// ---- Đàn Nam Giao, the Nguyễn esplanade of sacrifice to Heaven and Earth (1806), south of Huế ----
//
// Sources (docs/places/namgiao.md has the full list):
//  - vi.wikipedia.org/wiki/Đàn_Nam_Giao_(triều_Nguyễn): precinct about 265 x 390 m with a gate on each side (south the
//    main one), a stone screen (bình phong) 12.5 x 3.2 x 0.8 m before each gate, of which the east, south and west
//    survive; the 1.6 m basalt precinct wall is long gone. The altar (Giao đàn), nearly 4.7 m high, faces south:
//    top Viên đàn round, 40.5 m across, 2.8 m high, railing 0.8+ m x 0.3 m painted blue, stairs of 15 steps on the
//    south and 9 on the other sides; Phương đàn square, 83 m, 1.1 m high, railing 0.9 m yellow, 5 steps a side;
//    lowest tier square, 165 m, 0.84 m high, railing 0.93 m red, 4 steps a side; two rows of six stone incense-stand
//    blocks on the front, the burner (Liệu sở) at the south-east corner and the pit for hair and blood (Ế khảm) at
//    the north-west. Trai Cung at the south-west, facing south, in a brick wall of 85 x 65 m with gates south and
//    north: chính điện, Tả Túc, Hữu Túc, Thượng Trà, Thượng Thiện. Pines planted round the altar since Gia Long.
//  - tapchisonghuong.com.vn (Những đàn tế ở Bắc Kinh và đàn Nam Giao Huế), dulichhue.biz: the same figures.
//  - tienphong.vn (2025): Trai Cung restored 2024-26 (Tả/Hữu Túc, Thượng Trà, Thượng Thiện rebuilt) with timber
//    frames, glazed green-blue liệt tiles (ngói liệt thanh lưu ly) and brick walls.
//  - OpenStreetMap: the round top (way 1174199427), the four L-shaped lawns of the lowest tier (1174199421-24,
//    which give the 13° turn of the whole esplanade off the compass, its centre, and the walks across it), the
//    pine wood that is the precinct (1174199415, with the Trai Cung notch at its south-west), Trai Cung's main hall
//    (1174199428) and the guard house by the north gate (1473250838).
// Estimated: stair widths, railing posts, the layout of the 28 tent-post stones and the incense blocks, Trai Cung's
// building sizes other than the main hall, the screens' and Trai Cung gate's detail.

export const id = 'namgiao';

// the frame: centre between the round top's OSM centroid and the lawns' centre; u runs east-north-east, v
// south-south-east (the altar's front)
const C = [-676.2, 3455.6], TURN = (13.1 * Math.PI) / 180;
const EU = [Math.cos(TURN), -Math.sin(TURN)], EV = [Math.sin(TURN), Math.cos(TURN)];
const ANG = Math.atan2(EU[1], EU[0]);
const P = (u, v) => [C[0] + u * EU[0] + v * EV[0], C[1] + u * EU[1] + v * EV[1]];
const gy = (u, v) => { const p = P(u, v); return LAND_Y + rise(p[0], p[1]); };

const A1 = 82.5, H1 = 0.84; // lowest tier: half side, height
const A2 = 41.5, H2 = 1.1; // Phương đàn
const R3 = 20.25, H3 = 2.8; // Viên đàn
const LAWN_OUT = 75, LAWN_IN = 47, WALK_NS = 18.6, WALK_EW = 6.1; // the OSM lawns, made symmetric

const LAWN = hex('#8ea35e'), LAWN2 = hex('#97ab66'), BANK = hex('#86985a');
const LATERITE = hex('#8a7663'), BRICK = hex('#7a6a5c'), STONE = hex('#bdb39e'), STEP = hex('#b0a690');
const WALK = hex('#c2b49a'), THANH = hex('#9d9c92'), COPE = hex('#c9bfa9');
const RED = hex('#9e3a2c'), YELLOW = hex('#d4ac45'), BLUE = hex('#3f6f9e');
const TC_WALL = hex('#6e675c'), TC_COPE = hex('#4f5a50'), TC_ROOF = hex('#3d7d68'), TC_RIDGE = hex('#d9c88f');
const COURT = hex('#b8ae96'), WOOD = hex('#8a4a30'), DARK = hex('#2b2422');

export function build({ S }) {
  const keep = S.kind;
  const box = (u, v, y0, y1, w, d, col, o) => { const p = P(u, v); S.box(p[0], p[1], y0, y1, w, d, ANG, col, o); };
  const span = (u0, u1, v0, v1, y0, y1, col, o) => box((u0 + u1) / 2, (v0 + v1) / 2, y0, y1, u1 - u0, v1 - v0, col, o);
  const ext = (u0, u1, v0, v1, f) => { let r = f === Math.max ? -Infinity : Infinity; for (let u = u0; u <= u1 + 0.01; u += (u1 - u0) / 12) for (let v = v0; v <= v1 + 0.01; v += (v1 - v0) / 12) r = f(r, gy(u, v)); return r; };
  const n0 = S.n;

  // ---- levels: the lowest tier stands just clear of the highest ground under it; the knoll below falls away as a
  // grassed bank (the DEM is a smoothed hill, 4 m lower on the west than under the altar)
  const gMax = ext(-A1, A1, -A1, A1, Math.max), gMin = ext(-A1 - 15, A1 + 15, -A1 - 15, A1 + 15, Math.min);
  const y1 = gMax + 0.3, y2 = y1 + H2, y3 = y2 + H3;
  const yFoot = y1 - H1;
  S.base = y1 - LAND_Y;
  S.kind = KIND.GROUND;
  if (yFoot > gMin) {
    const hb = yFoot - gMin + 0.4, run = hb * 2.2;
    box(0, 0, gMin - 0.4, yFoot, 2 * (A1 + 0.6 + run), 2 * (A1 + 0.6 + run), BANK, { taper: (A1 + 0.6) / (A1 + 0.6 + run) });
  }

  // ---- the lowest tier: laterite walls, a walk round the inside of the railing and across, four lawns ----
  S.kind = KIND.MASONRY;
  span(-A1, A1, -A1, A1, yFoot - 0.2, y1, LATERITE, { top: WALK, topKind: KIND.ROAD });
  span(-A1 - 0.25, A1 + 0.25, -A1 - 0.25, A1 + 0.25, yFoot - 0.25, yFoot + 0.12, shade(STONE, 0.9)); // plinth course
  S.kind = KIND.GROUND;
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    const lu = (a, b) => [Math.min(su * a, su * b), Math.max(su * a, su * b)], lv = (a, b) => [Math.min(sv * a, sv * b), Math.max(sv * a, sv * b)];
    span(...lu(LAWN_IN, LAWN_OUT), ...lv(WALK_EW, LAWN_OUT), y1, y1 + 0.05, LAWN);
    span(...lu(WALK_NS, LAWN_IN), ...lv(LAWN_IN, LAWN_OUT), y1, y1 + 0.05, LAWN);
  }

  // ---- Phương đàn: brick walls, a lawn with walks across and a paved ring round the top tier ----
  S.kind = KIND.MASONRY;
  span(-A2, A2, -A2, A2, y1 - 0.1, y2, BRICK, { top: LAWN2, topKind: KIND.GROUND });
  span(-A2 - 0.2, A2 + 0.2, -A2 - 0.2, A2 + 0.2, y1 - 0.1, y1 + 0.14, shade(STONE, 0.9));
  S.kind = KIND.ROAD;
  span(-A2 + 0.4, A2 - 0.4, -3.5, 3.5, y2, y2 + 0.04, WALK);
  span(-3.5, 3.5, -A2 + 0.4, A2 - 0.4, y2, y2 + 0.04, WALK);
  S.cyl(...P(0, 0), y2, y2 + 0.045, R3 + 3, R3 + 3, 40, WALK);

  // ---- Viên đàn: round, laterite and stone, paved with Thanh stone; 28 stones that held the posts of the blue tent
  S.kind = KIND.MASONRY;
  S.cyl(...P(0, 0), y2 - 0.1, y3, R3, R3, 48, hex('#a0957f'), { cap: false });
  S.cyl(...P(0, 0), y2 - 0.1, y2 + 0.2, R3 + 0.25, R3 + 0.25, 48, shade(STONE, 0.9), { cap: false });
  S.cyl(...P(0, 0), y3 - 0.22, y3 - 0.05, R3 + 0.12, R3 + 0.12, 48, COPE, { cap: false });
  S.kind = KIND.ROAD;
  S.cyl(...P(0, 0), y3 - 0.02, y3, R3, R3, 48, THANH);
  S.cyl(...P(0, 0), y3, y3 + 0.12, 6.5, 6.5, 24, shade(THANH, 1.08));
  S.kind = KIND.PLAIN;
  for (const [n, r, a0] of [[8, 4.5, 0.39], [20, 9.5, 0.16]]) for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * Math.PI * 2, u = Math.cos(a) * r, v = Math.sin(a) * r;
    box(u, v, y3 - 0.05, y3 + 0.22, 0.7, 0.7, shade(STONE, 1.05));
  }

  // ---- railings: solid parapets with a coping and pilasters, opened at the stairs between two posts ----
  // stair widths per tier and side (N E S W); the south and north flights are the ceremonial ones
  const W1 = [9, 6, 9, 6], W2 = [8, 6, 8, 6], W3 = [5, 5, 7.5, 5];
  const card = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const post = (u, v, y, h, col) => {
    S.kind = KIND.MASONRY;
    box(u, v, y, y + h, 0.62, 0.62, col);
    box(u, v, y + h, y + h + 0.12, 0.78, 0.78, shade(col, 1.1));
    box(u, v, y + h + 0.12, y + h + 0.42, 0.42, 0.42, shade(col, 1.05), { taper: 0.35 });
  };
  const sqRail = (A, y, h, col, widths) => {
    const t = 0.3, e = A - t / 2;
    for (const [i, [du, dv]] of card.entries()) {
      const g = widths[i] / 2 + 0.6;
      for (const sd of [-1, 1]) {
        const a0 = g, a1 = A; // along the side, from the opening to the corner
        const m = (a0 + a1) / 2 * sd, L = a1 - a0;
        const u = du ? du * e : m, v = dv ? dv * e : m;
        S.kind = KIND.MASONRY;
        box(u, v, y - 0.05, y + h, du ? t : L, du ? L : t, col);
        box(u, v, y + h, y + h + 0.1, du ? t + 0.14 : L, du ? L : t + 0.14, shade(col, 1.12));
        const k = Math.max(1, Math.round(L / 4.2));
        for (let j = 1; j < k; j++) {
          const s = sd * (a0 + (L * j) / k);
          box(du ? du * e : s, dv ? dv * e : s, y - 0.05, y + h + 0.06, du ? t + 0.12 : 0.4, du ? 0.4 : t + 0.12, shade(col, 0.94));
        }
        post(du ? du * e : sd * g, dv ? dv * e : sd * g, y, h + 0.35, col);
      }
    }
  };
  sqRail(A1, y1, 0.93, RED, W1);
  sqRail(A2, y2, 0.9, YELLOW, W2);
  // the round railing, in short straight pieces with a gap at each stair
  {
    const t = 0.3, h = 0.82, rm = R3 - t / 2, seg = 72;
    const gaps = card.map(([du, dv], i) => [Math.atan2(dv, du), (W3[i] / 2 + 0.6) / rm]);
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2, am = (a0 + a1) / 2;
      const off = (a) => gaps.some(([g, hw]) => Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) < hw);
      if (off(am)) continue;
      const len = 2 * rm * Math.sin((a1 - a0) / 2) + 0.03, u = Math.cos(am) * rm, v = Math.sin(am) * rm;
      const p = P(u, v), ang = ANG + am + Math.PI / 2;
      S.kind = KIND.MASONRY;
      S.box(p[0], p[1], y3 - 0.05, y3 + h, len, t, ang, BLUE);
      S.box(p[0], p[1], y3 + h, y3 + h + 0.1, len, t + 0.14, ang, shade(BLUE, 1.12));
      if (i % 3 === 0) S.box(p[0], p[1], y3 - 0.05, y3 + h + 0.06, 0.4, t + 0.12, ang, shade(BLUE, 0.94));
    }
    for (const [i, [du, dv]] of card.entries()) for (const sd of [-1, 1]) {
      const g = W3[i] / 2 + 0.6, a = Math.atan2(dv, du) + sd * Math.asin(g / rm);
      post(Math.cos(a) * rm, Math.sin(a) * rm, y3, h + 0.35, BLUE);
    }
  }

  // ---- stairs: a flight in the middle of each side of each tier between cheek walls ----
  // (du, dv) outward; foot of the tier face at distance A from the centre; n steps from ya up to yy
  const flight = (du, dv, A, ya, yy, n, width, cheek) => {
    const rz = (yy - ya) / n, tread = 0.36, run = tread * n;
    S.kind = KIND.MASONRY;
    for (let k = 0; k < n; k++) {
      const o = A + run - tread * (k + 0.5);
      box(du * o, dv * o, ya - 0.4, ya + rz * (k + 1), du ? tread : width, du ? width : tread, STEP, { topKind: KIND.ROAD });
    }
    for (const s of [-1, 1]) {
      const cu = du ? 0 : s * (width / 2 + 0.3), cv = du ? s * (width / 2 + 0.3) : 0;
      for (let k = 0; k < n; k++) {
        const o = A + run - tread * (k + 0.5);
        box(du * o + cu, dv * o + cv, ya - 0.4, ya + rz * (k + 1) + 0.3, du ? tread + 0.02 : 0.6, du ? 0.6 : tread + 0.02, cheek, { top: COPE });
      }
    }
  };
  for (const [i, [du, dv]] of card.entries()) {
    flight(du, dv, R3 - 0.2, y2, y3, i === 2 ? 15 : 9, W3[i], hex('#a0957f'));
    flight(du, dv, A2, y1, y2, 5, W2[i], BRICK);
    // the lowest flight meets the knoll's bank: its foot is the bank's top, then a ramp of walk down to the ground
    flight(du, dv, A1, yFoot, y1, 4, W1[i], LATERITE);
  }

  // ---- on the lowest tier: two rows of six incense-stand blocks on the front, the burner, the pit ----
  S.kind = KIND.MASONRY;
  for (const su of [-1, 1]) for (let k = 0; k < 6; k++) box(su * 10, 50 + k * 4.4, y1, y1 + 0.55, 1.1, 1.1, STONE, { top: shade(STONE, 1.08) });
  { // Liệu sở: a small brick furnace with its flue, south-east corner
    const u = 68, v = 68;
    box(u, v, y1, y1 + 1.9, 3.2, 3.2, BRICK, { top: shade(BRICK, 0.9) });
    box(u, v, y1 + 1.9, y1 + 2.15, 3.6, 3.6, COPE);
    box(u, v, y1 + 2.15, y1 + 3.3, 0.9, 0.9, BRICK, { top: DARK, taper: 0.8 });
    box(u, v - 1.62, y1 + 0.3, y1 + 1.1, 0.9, 0.06, DARK);
  }
  { // Ế khảm: a stone-rimmed pit, north-west corner
    const u = -68, v = -68;
    for (const [du, dv, w, d] of [[0, -1.1, 2.6, 0.4], [0, 1.1, 2.6, 0.4], [-1.1, 0, 0.4, 1.8], [1.1, 0, 0.4, 1.8]]) box(u + du, v + dv, y1, y1 + 0.35, w, d, STONE);
    box(u, v, y1, y1 + 0.07, 1.8, 1.8, DARK);
  }
  (S.paved = S.paved || []).push([n0, S.n]); // the whole esplanade: no trees, no houses (geo/city.js coverOf)

  // ---- walks from the lowest stairs to the precinct gates, laid on the ground in pieces ----
  const G = { n: -138, s: 252, e: 130, w: -130 }; // precinct edges (the wood, squared to 265 x 390 m)
  const walk = (u0, v0, u1, v1, w) => {
    const L = Math.hypot(u1 - u0, v1 - v0), n = Math.max(1, Math.ceil(L / 6));
    S.kind = KIND.ROAD;
    for (let k = 0; k < n; k++) {
      const u = u0 + ((u1 - u0) * (k + 0.5)) / n, v = v0 + ((v1 - v0) * (k + 0.5)) / n, y = gy(u, v);
      const along = Math.abs(u1 - u0) > Math.abs(v1 - v0);
      box(u, v, y - 0.3, y + 0.06, along ? L / n + 0.05 : w, along ? w : L / n + 0.05, WALK);
    }
  };
  const foot = A1 + 4 * 0.36 + 0.2;
  const w0 = S.n;
  walk(0, foot, 0, G.s, 6); walk(0, -foot, 0, G.n, 6);
  walk(foot, 0, G.e, 0, 4); walk(-foot, 0, G.w, 0, 4);
  (S.paved = S.paved || []).push([w0, S.n]);

  // ---- the stone screens before the east, south and west gates (the north one is lost) ----
  const screen = (u, v, across) => {
    const y = Math.min(gy(u - 6, v), gy(u + 6, v), gy(u, v - 6), gy(u, v + 6));
    const w = across ? 12.5 : 0.8, d = across ? 0.8 : 12.5;
    S.kind = KIND.MASONRY;
    box(u, v, y - 0.5, y + 0.45, across ? 13.3 : 1.4, across ? 1.4 : 13.3, shade(STONE, 0.88));
    box(u, v, y + 0.45, y + 3.0, w, d, hex('#8f8a7e'));
    box(u, v, y + 3.0, y + 3.2, across ? 13.0 : 1.05, across ? 1.05 : 13.0, shade(STONE, 0.95), { taper: 0.92 });
    for (const s of [-1, 1]) box(u + (across ? s * 5.6 : 0), v + (across ? 0 : s * 5.6), y + 0.45, y + 3.25, across ? 1.0 : 1.0, 1.0, shade(STONE, 0.98));
    S.kind = KIND.PLAIN;
    for (const s of [-1, 1]) box(u + (across ? 0 : s * 0.42), v + (across ? s * 0.42 : 0), y + 0.9, y + 2.6, across ? 8.8 : 0.04, across ? 0.04 : 8.8, hex('#a29c8e'));
  };
  screen(0, G.s + 12, true);
  screen(G.e + 12, 0, false);
  screen(G.w - 12, 0, false);

  // ---- the guard house by the north gate (OSM 1473250838) ----
  {
    const ring = [[-719.7, 3341.1], [-708.0, 3337.9], [-705.6, 3346.3], [-717.4, 3349.5]];
    const c = ring.reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4], [0, 0]);
    const ex = ring[1][0] - ring[0][0], ez = ring[1][1] - ring[0][1], w = Math.hypot(ex, ez), d = Math.hypot(ring[2][0] - ring[1][0], ring[2][1] - ring[1][1]);
    const a = Math.atan2(ez, ex);
    let g = Infinity, gt = -Infinity;
    for (const p of ring) { const h = LAND_Y + rise(p[0], p[1]); g = Math.min(g, h); gt = Math.max(gt, h); }
    S.kind = KIND.MASONRY;
    S.box(c[0], c[1], g - 0.4, gt + 3.2, w, d, a, hex('#e0d2ae'), { top: shade(hex('#e0d2ae'), 0.8) });
    S.kind = KIND.TIMBER;
    S.hip(c[0], c[1], w, d, a, gt + 3.2, 2.0, PAL.templeRoof, { over: 0.6, flare: 0.25 });
  }

  trai(S, box, span);
  S.kind = keep;
  S.base = 0;
}

// ---- Trai Cung: the fasting palace at the south-west, facing south, in a brick wall of 85 x 65 m ----
// The main hall is OSM's footprint (15 m across, 25.6 m deep: a front and a rear hall under joined roofs); the
// compound is set round it to fill the notch the pine wood leaves at the precinct's south-west corner.
function trai(S, box, span) {
  const U = -173.9, V0 = 182, V1 = 247, HW = 42.5; // axis, north and south walls, half width
  const n0 = S.n;
  let cy = -Infinity, cmin = Infinity;
  for (let u = U - HW; u <= U + HW; u += 8.5) for (let v = V0; v <= V1; v += 6.5) { const g = gy(u, v); cy = Math.max(cy, g); cmin = Math.min(cmin, g); }
  cy += 0.12;
  S.base = cy - LAND_Y;
  S.kind = KIND.ROAD;
  span(U - HW + 0.4, U + HW - 0.4, V0 + 0.4, V1 - 0.4, cmin - 0.4, cy, COURT, { top: COURT });
  S.kind = KIND.GROUND; // lawns either side of the paved axis
  for (const s of [-1, 1]) span(Math.min(U + s * 4, U + s * 38), Math.max(U + s * 4, U + s * 38), 221, 242, cy, cy + 0.04, LAWN2);

  // the wall, gạch vồ brick under a tiled coping, in pieces that follow the ground outside it
  const wallH = 2.6, gate = 7;
  const wall = (u0, v0, u1, v1) => {
    const L = Math.hypot(u1 - u0, v1 - v0), n = Math.max(1, Math.round(L / 8.5));
    for (let k = 0; k < n; k++) {
      const u = u0 + ((u1 - u0) * (k + 0.5)) / n, v = v0 + ((v1 - v0) * (k + 0.5)) / n, g = Math.min(gy(u, v), cy);
      const along = Math.abs(u1 - u0) > Math.abs(v1 - v0), l = L / n + 0.04;
      S.kind = KIND.MASONRY;
      box(u, v, g - 0.6, cy + wallH, along ? l : 0.6, along ? 0.6 : l, TC_WALL);
      S.kind = KIND.TILE;
      box(u, v, cy + wallH, cy + wallH + 0.28, along ? l : 0.95, along ? 0.95 : l, TC_COPE, { taper: 0.6 });
    }
  };
  wall(U - HW, V0, U - 2.5, V0); wall(U + 2.5, V0, U + HW, V0);
  wall(U - HW, V1, U - gate - 2, V1); wall(U + gate + 2, V1, U + HW, V1);
  wall(U - HW, V0, U - HW, V1); wall(U + HW, V0, U + HW, V1);

  // the south gate: three openings, the middle one under a raised two-tier roof
  {
    const p = P(U, V1), g = cy;
    S.kind = KIND.MASONRY;
    for (const s of [-1, 1]) for (const k of [1, 2]) {
      box(U + s * (k === 1 ? 2.3 : 6.6), V1, g - 0.5, g + (k === 1 ? 4.6 : 3.6), 1.1, 1.3, TC_WALL, { top: TC_COPE });
    }
    for (const s of [-1, 1]) box(U + s * 4.45, V1, g + 2.9, g + 3.6, 3.2, 1.1, TC_WALL);
    for (const s of [-1, 1]) box(U + s * 8.3, V1, g - 0.5, g + 3.0, 1.0, 1.0, TC_WALL, { top: TC_COPE });
    S.kind = KIND.PLAIN;
    box(U, V1 + 0.66, g, g + 3.7, 3.4, 0.06, DARK);
    for (const s of [-1, 1]) box(U + s * 4.45, V1 + 0.6, g, g + 2.8, 3.0, 0.06, DARK);
    S.kind = KIND.TIMBER;
    S.hip(p[0], p[1], 5.2, 2.2, ANG, g + 4.6, 1.3, TC_ROOF, { over: 0.6, flare: 0.5, ridgeCol: TC_RIDGE, hips: true, glazed: true });
    S.box(p[0], p[1], g + 5.4, g + 6.2, 3.2, 1.4, ANG, PAL.lacquer);
    S.hip(p[0], p[1], 3.4, 1.6, ANG, g + 6.2, 1.1, TC_ROOF, { over: 0.55, flare: 0.5, ridgeCol: TC_RIDGE, hips: true, glazed: true });
    for (const s of [-1, 1]) { const q = P(U + s * 4.45, V1); S.hip(q[0], q[1], 3.6, 1.9, ANG, g + 3.6, 0.9, TC_ROOF, { over: 0.45, flare: 0.4, ridgeCol: TC_RIDGE }); }
  }
  // the north gate: a plain opening between two posts
  for (const s of [-1, 1]) {
    S.kind = KIND.MASONRY;
    box(U + s * 2.9, V0, cy - 0.5, cy + 3.4, 0.9, 0.9, TC_WALL, { top: TC_COPE });
  }

  // halls: green-blue glazed roofs, red-lacquered timber
  const hall = (u, v, w, d, faceSouth, o) => { const p = P(u, v); return pavilion(S, p[0], p[1], w, d, faceSouth ? ANG : ANG + Math.PI / 2, cy, { tiers: 1, roof: TC_ROOF, ridge: TC_RIDGE, ...o }); };
  // chính điện: rear hall (12.6 m deep) and front hall (11 m), on one platform
  {
    const p = P(U, 206.1);
    S.kind = KIND.MASONRY;
    S.box(p[0], p[1], cy - 0.2, cy + 0.75, 17.4, 28, ANG, STONE, { topKind: KIND.ROAD });
    for (let k = 1; k <= 4; k++) box(U, 220.1 + k * 0.34, cy - 0.2, cy + 0.75 - k * 0.17, 5, 0.34, shade(STONE, 1.05), { topKind: KIND.ROAD });
  }
  hall(U, 199.6, 14.4, 11.6, true, { wallH: 4.0, wall: PAL.lacquer, over: 1.3, rh: 3.6, platform: 0.75, steps: false, colonnade: true });
  hall(U, 212.4, 14.4, 10.6, true, { wallH: 3.6, wall: PAL.lacquer, over: 1.3, rh: 3.1, platform: 0.75, steps: false, colonnade: true });
  // Tả Túc and Hữu Túc either side of the court, facing it; Thượng Trà and Thượng Thiện behind them
  for (const s of [-1, 1]) {
    hall(U + s * 25, 229, 17, 7, false, { wallH: 3.1, wall: WOOD, over: 0.9, rh: 2.3, platform: 0.45 });
    hall(U + s * 28, 196, 11, 6.5, true, { wallH: 2.9, wall: WOOD, over: 0.8, rh: 2.1, platform: 0.35 });
  }
  (S.paved = S.paved || []).push([n0, S.n]);
}
