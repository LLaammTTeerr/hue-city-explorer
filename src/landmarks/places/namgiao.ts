import { KIND, hex, shade } from '../../geo/buf.ts';
import { LAND_Y, PAL, roadWidth } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { pavilion } from '../citadel.ts';

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
//  - Satellite (Google, 2026) and Street View, as visual reference only: a closed wood of tall pines with a hedge of
//    undergrowth at the verge; the Phương đàn's quarters, the ring round it and the band inside the red railing are
//    pine groves on a dark needle floor; young pines in two rows flank the axial walks over the lowest tier; the walks
//    are bare earth, about 5 m; a dark stone wall about 1.5 m along Lê Ngọ Cát (north) and a pale one on the west.
// Estimated: stair widths, railing posts, the layout of the 28 tent-post stones and the incense blocks, Trai Cung's
// building sizes other than the main hall, the screens' and Trai Cung gate's detail.

export const id = 'namgiao';

// the frame: centre between the round top's OSM centroid and the lawns' centre; u runs east-north-east, v
// south-south-east (the altar's front)
const C = [-676.2, 3455.6], TURN = (13.1 * Math.PI) / 180;
const EU = [Math.cos(TURN), -Math.sin(TURN)], EV = [Math.sin(TURN), Math.cos(TURN)];
const ANG = Math.atan2(EU[1], EU[0]);
const P = (u, v): [number, number] => [C[0] + u * EU[0] + v * EV[0], C[1] + u * EU[1] + v * EV[1]];
const gy = (u, v) => { const p = P(u, v); return LAND_Y + rise(p[0], p[1]); };

const A1 = 82.5, H1 = 0.84; // lowest tier: half side, height
const A2 = 41.5, H2 = 1.1; // Phương đàn
const R3 = 20.25, H3 = 2.8; // Viên đàn
const LAWN_OUT = 75, LAWN_IN = 47, WALK_NS = 18.6, WALK_EW = 6.1; // the OSM lawns, made symmetric
const WALK_W = 5; // the axial walks, bare earth
const G = { n: -138, s: 252, e: 130, w: -130 }; // precinct edges (the wood, squared to 265 x 390 m)
const UV = (x, z) => { const dx = x - C[0], dz = z - C[1]; return [dx * EU[0] + dz * EU[1], dx * EV[0] + dz * EV[1]]; };

const LAWN = hex('#85955a'), LAWN2 = hex('#8d9d62'), BANK = hex('#7f8f55'); // olive, a little dry (satellite)
const GROVE = hex('#4f4a38'), GROVE2 = hex('#544e3b'), HEDGE = hex('#34492e'); // needle floor under the pines; the verge's undergrowth
const LATERITE = hex('#8a7663'), BRICK = hex('#7a6a5c'), STONE = hex('#bdb39e'), STEP = hex('#b0a690');
const WALK = hex('#94796a'), THANH = hex('#9d9c92'), COPE = hex('#c9bfa9');
const RED = hex('#9e3a2c'), YELLOW = hex('#d4ac45'), BLUE = hex('#3f6f9e');
const TC_WALL = hex('#6e675c'), TC_COPE = hex('#4f5a50'), TC_ROOF = hex('#3d7d68'), TC_RIDGE = hex('#d9c88f');
const COURT = hex('#b8ae96'), WOOD = hex('#8a4a30'), DARK = hex('#2b2422');

export function build({ data, S }) {
  const keep = S.kind;
  const box = (u, v, y0, y1, w, d, col, o?) => { const p = P(u, v); S.box(p[0], p[1], y0, y1, w, d, ANG, col, o); };
  const span = (u0, u1, v0, v1, y0, y1, col, o?) => box((u0 + u1) / 2, (v0 + v1) / 2, y0, y1, u1 - u0, v1 - v0, col, o);
  const ext = (u0, u1, v0, v1, f) => { let r = f === Math.max ? -Infinity : Infinity; for (let u = u0; u <= u1 + 0.01; u += (u1 - u0) / 12) for (let v = v0; v <= v1 + 0.01; v += (v1 - v0) / 12) r = f(r, gy(u, v)); return r; };
  const n0 = S.n;

  // ---- levels: the esplanade is a terrace on level ground (scripts/build-data.mjs holds the precinct's terrain at
  // one level), so the lowest tier rises its 0.84 m from the ground on every side
  const gMax = ext(-A1, A1, -A1, A1, Math.max), gMin = ext(-A1 - 15, A1 + 15, -A1 - 15, A1 + 15, Math.min);
  const yFoot = gMax, y1 = yFoot + H1, y2 = y1 + H2, y3 = y2 + H3;
  S.base = y1 - LAND_Y;
  S.kind = KIND.GROUND;
  if (yFoot > gMin + 0.15) { // only if the ground under it were ever to slope again
    // the bank is a skirt round the tier: from the plinth's foot it falls at 1 in 2.2 until it meets the ground
    // under each stretch of the wall, so it is wide on the low west and nothing where the knoll is high (one
    // frustum sized for the lowest ground would sink metres into the high side)
    const A = A1 + 0.6, SLOPE = 2.2, ROWS = 8, step = 3;
    const ring = []; // the tier's foot, corner to corner, counter-clockwise in (u, v)
    for (const [u0, v0, du, dv] of ([[-A, -A, 1, 0], [A, -A, 0, 1], [A, A, -1, 0], [-A, A, 0, -1]] as any[]))
      for (let t = 0; t < 2 * A - 0.01; t += (2 * A) / Math.round((2 * A) / step)) ring.push([u0 + du * t, v0 + dv * t]);
    const prof = ring.map(([u, v]) => { // run of the bank out from this point, along the frustum's scaling
      const out = (r) => { const k = (A + r) / A; return [u * k, v * k]; };
      let run = 0;
      while (run < 60 && yFoot - run / SLOPE > gy(...(out(run) as [number, number])) - 0.3) run += 0.25;
      return Array.from({ length: ROWS + 1 }, (_, j) => {
        const r = (run * j) / ROWS, q = out(r), p = P(...(q as [number, number]));
        const y = j === ROWS ? Math.min(yFoot, gy(...(q as [number, number])) - 0.3) : Math.max(yFoot - r / SLOPE, gy(...(q as [number, number])) - 0.3);
        return [p[0], Math.min(yFoot, y), p[1]];
      });
    });
    for (let i = 0; i < prof.length; i++) {
      const a = prof[i], b = prof[(i + 1) % prof.length];
      for (let j = 0; j < ROWS; j++) S.quad(a[j], b[j], b[j + 1], a[j + 1], BANK, [0, 1, 0]);
    }
  }

  // ---- the lowest tier: laterite walls, four lawns, young pines along the walks, the rest a pine grove ----
  // On the satellite the band inside the red railing and the ring between the lawns and the Phương đàn are pine
  // groves on a dark needle floor, the lawns open, and the walks across bare earth between two rows of young pines
  // each side, on grass. The tier's and the Phương đàn's bodies, their lawns and clearings are ground (S.noCover):
  // the precinct's pines are planted explicitly (plant() below) and stand on the tops (S.stand); the walks, railings,
  // stairs and young pines stay in the paved range, which keeps the pines' trunks and lower branches off them.
  S.kind = KIND.MASONRY;
  const t0 = S.n;
  span(-A1, A1, -A1, A1, yFoot - 0.2, y1, LATERITE, { top: GROVE, topKind: KIND.GROUND });
  span(-A1 - 0.25, A1 + 0.25, -A1 - 0.25, A1 + 0.25, yFoot - 0.25, yFoot + 0.12, shade(STONE, 0.9)); // plinth course
  S.kind = KIND.GROUND;
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    const lu = (a, b): [number, number] => [Math.min(su * a, su * b), Math.max(su * a, su * b)], lv = (a, b) => [Math.min(sv * a, sv * b), Math.max(sv * a, sv * b)];
    span(...lu(LAWN_IN, LAWN_OUT), ...(lv(WALK_EW, LAWN_OUT) as [number, number]), y1, y1 + 0.05, LAWN);
    span(...lu(WALK_NS, LAWN_IN), ...(lv(LAWN_IN, LAWN_OUT) as [number, number]), y1, y1 + 0.05, LAWN);
  }
  // the grass the young pines stand on, in the gaps between the lawns, from the railing in to the grove ring
  for (const s of [-1, 1]) {
    span(-WALK_NS, WALK_NS, Math.min(s * LAWN_IN, s * (A1 - 0.4)), Math.max(s * LAWN_IN, s * (A1 - 0.4)), y1, y1 + 0.05, shade(LAWN, 0.96));
    span(Math.min(s * LAWN_IN, s * (A1 - 0.4)), Math.max(s * LAWN_IN, s * (A1 - 0.4)), -WALK_EW, WALK_EW, y1, y1 + 0.05, shade(LAWN, 0.96));
  }
  (S.noCover = S.noCover || []).push([t0, S.n]);
  // the walks across, bare earth
  S.kind = KIND.ROAD;
  const hw = WALK_W / 2;
  span(-hw, hw, -A1 + 0.4, -A2, y1, y1 + 0.07, WALK); span(-hw, hw, A2, A1 - 0.4, y1, y1 + 0.07, WALK);
  span(-A1 + 0.4, -A2, -hw, hw, y1, y1 + 0.07, WALK); span(A2, A1 - 0.4, -hw, hw, y1, y1 + 0.07, WALK);

  // ---- Phương đàn: brick walls; a pine grove in each quarter round a small grassed clearing, walks across ----
  S.kind = KIND.MASONRY;
  const t1 = S.n;
  span(-A2, A2, -A2, A2, y1 - 0.1, y2, BRICK, { top: GROVE2, topKind: KIND.GROUND });
  span(-A2 - 0.2, A2 + 0.2, -A2 - 0.2, A2 + 0.2, y1 - 0.1, y1 + 0.14, shade(STONE, 0.9));
  // the clearing in each quarter's grove (satellite: about 18 m square); the pines come up to the round top's kerb
  S.kind = KIND.GROUND;
  for (const su of [-1, 1]) for (const sv of [-1, 1]) span(Math.min(su * 17, su * 34), Math.max(su * 17, su * 34), Math.min(sv * 17, sv * 34), Math.max(sv * 17, sv * 34), y2, y2 + 0.03, LAWN2);
  S.noCover.push([t1, S.n]);
  S.kind = KIND.ROAD;
  span(-A2 + 0.4, A2 - 0.4, -hw, hw, y2, y2 + 0.06, WALK);
  span(-hw, hw, -A2 + 0.4, A2 - 0.4, y2, y2 + 0.06, WALK);

  // ---- Viên đàn: round, laterite and stone, paved with Thanh stone; 28 stones that held the posts of the blue tent
  S.kind = KIND.MASONRY;
  S.cyl(...P(0, 0), y2 - 0.1, y3, R3, R3, 48, hex('#a0957f'), { cap: false });
  S.cyl(...P(0, 0), y2 - 0.1, y2 + 0.2, R3 + 0.25, R3 + 0.25, 48, shade(STONE, 0.9), { cap: false });
  S.cyl(...P(0, 0), y3 - 0.22, y3 - 0.05, R3 + 0.12, R3 + 0.12, 48, COPE, { cap: false });
  S.kind = KIND.ROAD;
  S.cyl(...P(0, 0), y3 - 0.02, y3, R3, R3, 48, THANH);
  S.cyl(...P(0, 0), y3, y3 + 0.12, 6.5, 6.5, 24, shade(THANH, 1.08));
  S.kind = KIND.PLAIN;
  for (const [n, r, a0] of ([[8, 4.5, 0.39], [20, 9.5, 0.16]] as any[])) for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * Math.PI * 2, u = Math.cos(a) * r, v = Math.sin(a) * r;
    box(u, v, y3 - 0.05, y3 + 0.22, 0.7, 0.7, shade(STONE, 1.05));
  }

  // ---- railings: solid parapets with a coping and pilasters, opened at the stairs between two posts ----
  // stair widths per tier and side (N E S W); the south and north flights are the ceremonial ones
  const W1 = [9, 6, 9, 6], W2 = [8, 6, 8, 6], W3 = [5, 5, 7.5, 5];
  const card = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const post = (u, v, y, h, col?) => {
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
    for (const [du, dv, w, d] of ([[0, -1.1, 2.6, 0.4], [0, 1.1, 2.6, 0.4], [-1.1, 0, 0.4, 1.8], [1.1, 0, 0.4, 1.8]] as any[])) box(u + du, v + dv, y1, y1 + 0.35, w, d, STONE);
    box(u, v, y1, y1 + 0.07, 1.8, 1.8, DARK);
  }
  (S.paved = S.paved || []).push([n0, S.n]); // the whole esplanade: no trees, no houses (geo/city.js coverOf)

  // ---- walks from the lowest stairs to the precinct gates, bare earth laid on the ground in pieces ----
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
  walk(0, foot, 0, G.s, WALK_W); walk(0, -foot, 0, G.n, WALK_W);
  walk(foot, 0, G.e, 0, WALK_W); walk(-foot, 0, G.w, 0, WALK_W);
  (S.paved = S.paved || []).push([w0, S.n]);

  // ---- young pines in two rows each side of the walks over the lowest tier (satellite: small dark conifers about
  // 4.5 m apart, the rows about 8.6 and 13.6 m off the walk's middle, from the railing in to the grove ring) ----
  {
    S.kind = KIND.PLAIN;
    const row = (u0, v0, u1, v1, off) => {
      const L = Math.hypot(u1 - u0, v1 - v0), n = Math.floor(L / 4.5), nu = -(v1 - v0) / L, nv = (u1 - u0) / L;
      for (const sd of [-1, 1]) for (let k = 0; k < n; k++) {
        const f = (k + 0.5) / n, u = u0 + (u1 - u0) * f + nu * off * sd, v = v0 + (v1 - v0) * f + nv * off * sd;
        const p = P(u, v), h = 4.5 + ((k * 7 + (sd > 0 ? 3 : 0) + (off > 10 ? 2 : 0)) % 5) * 0.5;
        S.cyl(p[0], p[1], y1 + 0.05, y1 + h, 1.0, 0.08, 6, hex(k % 3 ? '#2f4a2c' : '#3a5530'), { cap: false });
      }
    };
    const r0 = LAWN_IN + 1.5, r1 = A1 - 2;
    for (const off of [8.6, 13.6]) for (const s of [-1, 1]) { row(0, s * r0, 0, s * r1, off); row(s * r0, 0, s * r1, 0, off); }
  }

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

  // ---- the modern boundary: a dark stone wall along Lê Ngọ Cát, a pale one on the west, a hedge of undergrowth
  // inside the verge all round (Street View; heights estimated) ----
  {
    const w1 = S.n;
    const piece = (u0, v0, u1, v1, h, t, col, cope) => {
      const L = Math.hypot(u1 - u0, v1 - v0), n = Math.max(1, Math.round(L / 6)), along = Math.abs(u1 - u0) > Math.abs(v1 - v0);
      for (let k = 0; k < n; k++) {
        const u = u0 + ((u1 - u0) * (k + 0.5)) / n, v = v0 + ((v1 - v0) * (k + 0.5)) / n, g = gy(u, v), l = L / n + 0.04;
        S.kind = KIND.MASONRY;
        box(u, v, g - 0.4, g + h, along ? l : t, along ? t : l, col, { top: cope });
      }
    };
    const NW = hex('#4a4842'), WW = hex('#cfc8b6');
    // north wall: the path inside Lê Ngọ Cát runs along it; open at the north gate, and short of the north-west
    // corner where the path cuts across
    piece(-125, G.n - 0.4, -4, G.n - 0.4, 1.5, 0.5, NW, shade(NW, 1.15)); piece(4, G.n - 0.4, 121, G.n - 0.4, 1.5, 0.5, NW, shade(NW, 1.15));
    piece(G.w, -134, G.w, -4, 1.6, 0.4, WW, shade(WW, 0.92)); piece(G.w, 4, G.w, G.s - 1, 1.6, 0.4, WW, shade(WW, 0.92));
    // the hedge: bushy undergrowth (juniper and scrub, Street View) in overlapping clumps 2.2-3.6 m high, thick
    // enough to hide the esplanade from the streets; open at each gate
    let k = 0;
    const hedge = (u0, v0, u1, v1) => {
      const L = Math.hypot(u1 - u0, v1 - v0), n = Math.max(1, Math.round(L / 1.9)), nu = -(v1 - v0) / L, nv = (u1 - u0) / L;
      S.kind = KIND.PLAIN;
      for (let j = 0; j < n; j++, k++) {
        const f = (j + 0.5) / n, off = (((k * 7) % 5) - 2) * 0.3, u = u0 + (u1 - u0) * f + nu * off, v = v0 + (v1 - v0) * f + nv * off;
        const p = P(u, v), g = gy(u, v), h = 2.2 + ((k * 3) % 8) * 0.2, r = 1.25 + ((k * 5) % 4) * 0.15;
        const col = shade(HEDGE, 0.86 + ((k * 5) % 7) * 0.04);
        S.cyl(p[0], p[1], g - 0.2, g + h * 0.4, r * 0.75, r, 10, col, { cap: false });
        S.cyl(p[0], p[1], g + h * 0.4, g + h * 0.75, r, r * 0.8, 10, shade(col, 1.03), { cap: false });
        S.cyl(p[0], p[1], g + h * 0.75, g + h, r * 0.8, r * 0.3, 10, shade(col, 1.07));
      }
    };
    const E = 119.5, Sth = 250, Nh = G.n + 1.8, Wh = G.w + 1.8;
    hedge(-124, Nh, -5, Nh); hedge(5, Nh, E, Nh);
    hedge(Wh, -134, Wh, -5); hedge(Wh, 5, Wh, Sth);
    hedge(E, -134, E, -5); hedge(E, 5, E, Sth);
    hedge(Wh + 1.5, Sth, -5, Sth); hedge(5, Sth, E - 1.5, Sth);
    (S.paved = S.paved || []).push([w1, S.n]);
  }

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
  plant(data, S, y1, y2);
  S.kind = keep;
  S.base = 0;
}

// ---- the pines: a closed wood over the precinct, groves on the tiers ----
// The generic wood (build-data.mjs plants OSM woods at random) is taken out inside the precinct and the pines are
// planted here on a jittered grid: tall old pines about 4.3 m apart through the wood (a closed canopy from above),
// 3.3 m apart in the tiers' groves, a lower storey of young pines in the verge, all off the lawns, clearings, walks,
// roads and the round top. Trees on the tiers stand on their tops (S.stand, read by geo/city.js populate).
function plant(data, S, y1, y2) {
  if (!Array.isArray(data.trees)) return;
  const t = data.trees, near = data.meta?.counts?.treesNear;
  for (let i = t.length / 4 - 1; i >= 0; i--) {
    const [u, v] = UV(t[i * 4] / 10, t[i * 4 + 1] / 10);
    if (u < G.w - 1 || u > G.e + 1 || v < G.n - 1 || v > G.s + 1) continue;
    t.splice(i * 4, 4);
    if (near != null && i < near) data.meta.counts.treesNear--;
  }
  // carriageways and the paths through the wood (not the OSM paths drawn over the esplanade)
  const segs = [], mm = []; // mm: the carriageways west of the precinct (Minh Mạng), the far side of its pine screen
  for (const r of data.roads || []) {
    const a = r[2], hw = roadWidth(r) / 2 + 1.5;
    for (let i = 0; i + 3 < a.length; i += 2) {
      const [u0, v0] = UV(a[i] / 10, a[i + 1] / 10), [u1, v1] = UV(a[i + 2] / 10, a[i + 3] / 10);
      if ((r[0] | 0) === 0 && Math.max(u0, u1) < G.w - 15 && Math.min(u0, u1) > G.w - 130 && Math.max(v0, v1) > G.n && Math.min(v0, v1) < G.s) mm.push([u0, v0, u1, v1, hw]);
      if (Math.max(u0, u1) < G.w - 130 || Math.min(u0, u1) > G.e + 15 || Math.max(v0, v1) < G.n - 15 || Math.min(v0, v1) > G.s + 15) continue;
      if ((r[0] | 0) >= 5 && Math.max(Math.abs(u0), Math.abs(v0), Math.abs(u1), Math.abs(v1)) < A1 + 5) continue;
      segs.push([u0, v0, u1, v1, hw]);
    }
  }
  const onRoad = (u, v) => segs.some(([u0, v0, u1, v1, hw]) => {
    const du = u1 - u0, dv = v1 - v0, L2 = du * du + dv * dv, f = L2 ? Math.max(0, Math.min(1, ((u - u0) * du + (v - v0) * dv) / L2)) : 0;
    return Math.hypot(u - u0 - f * du, v - v0 - f * dv) < hw;
  });
  const hash = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
  const inBox = (au, av, u0, u1, v0, v1, m) => au > u0 - m && au < u1 + m && av > v0 - m && av < v1 + m;
  const lawn = (au, av, m) => inBox(au, av, LAWN_IN, LAWN_OUT, WALK_EW, LAWN_OUT, m) || inBox(au, av, WALK_NS, LAWN_IN, LAWN_IN, LAWN_OUT, m)
    || inBox(au, av, 0, WALK_NS, LAWN_IN, A1, m) || inBox(au, av, LAWN_IN, A1, 0, WALK_EW, m); // the lawns and the young pines' grass
  let seq = 0;
  const seqStart = t.length; // our pines go after this
  const put = (u, v, sc) => { const p = P(u, v); t.push(Math.round(p[0] * 10), Math.round(p[1] * 10), Math.round(sc * 10), 3); seq++; };
  const grid = (sp, test, sc0, sc1, salt) => {
    for (let gu = Math.floor(G.w / sp); gu <= Math.ceil(G.e / sp); gu++) for (let gv = Math.floor(G.n / sp); gv <= Math.ceil(G.s / sp); gv++) {
      const u = gu * sp + (hash(gu, gv + salt) - 0.5) * sp * 0.7, v = gv * sp + (hash(gv - salt, gu) - 0.5) * sp * 0.7;
      if (test(u, v)) put(u, v, sc0 + (sc1 - sc0) * hash(gu + salt, gv * 3));
    }
  };
  // the wood, and its lower storey of young pines near the verge
  const hw0 = WALK_W / 2 + 2.2;
  const wood = (u, v) => {
    const au = Math.abs(u), av = Math.abs(v);
    if (u < G.w + 3.5 || u > G.e - 3.5 || v < G.n + 4 || v > G.s - 3) return false;
    if (Math.max(au, av) < A1 + 4) return false; // the esplanade and its stair feet
    if ((au < hw0 && av > A1) || (av < hw0 && au > A1)) return false; // the walks to the gates
    return !onRoad(u, v);
  };
  grid(4.3, wood, 1.15, 1.65, 0);
  grid(4.6, (u, v) => wood(u, v) && Math.min(u - G.w, G.e - u, v - G.n, G.s - v) < 14, 0.55, 0.8, 17);
  grid(9, wood, 0.6, 0.85, 29);
  // the lowest tier's groves: the band inside the red railing and the ring round the Phương đàn
  grid(3.3, (u, v) => {
    const au = Math.abs(u), av = Math.abs(v), m = Math.max(au, av);
    if (m > A1 - 1.8 || m < A2 + 1.8 || lawn(au, av, 0.2)) return false;
    return au > WALK_W / 2 + 3 && av > WALK_W / 2 + 3; // the walks and the Phương đàn's stairs
  }, 1.0, 1.4, 41);
  // the Phương đàn's groves round their clearings, up to the round top's kerb
  grid(3.3, (u, v) => {
    const au = Math.abs(u), av = Math.abs(v);
    if (Math.max(au, av) > A2 - 1.8 || Math.hypot(u, v) < R3 + 2.2 || inBox(au, av, 17, 34, 17, 34, 0.3)) return false;
    return au > WALK_W / 2 + 2.6 && av > WALK_W / 2 + 2.6 && !(v > 0 && au < 7 && v < R3 + 6.5); // the walks; the south flight
  }, 1.0, 1.35, 53);
  // the pine screen between Minh Mạng and the west wall (Street View on Minh Mạng: a pine wood in front of the wall),
  // clear of the carriageway and of Trai Cung's compound; it replaces the generic trees drawn there
  const mmU = (v) => { let b = -Infinity; for (const [u0, v0, u1, v1, hw] of mm) { if ((v - v0) * (v - v1) > 0 || v0 === v1) continue; b = Math.max(b, u0 + (u1 - u0) * (v - v0) / (v1 - v0) + hw); } return b; };
  const inTrai = (u, v) => u > -212 && u < -136 && v > 157 && v < 254;
  const west = (u, v) => u < G.w - 1.5 && v > G.n && v < G.s && u > mmU(v) + 8 && !inTrai(u, v);
  for (let i = seqStart / 4 - 1; i >= 0; i--) {
    const [u, v] = UV(t[i * 4] / 10, t[i * 4 + 1] / 10);
    if (!west(u, v)) continue;
    t.splice(i * 4, 4);
    if (near != null && i < near) data.meta.counts.treesNear--;
  }
  for (let gu = Math.floor((G.w - 130) / 4.3); gu < Math.ceil(G.w / 4.3); gu++) for (let gv = Math.floor(G.n / 4.3); gv <= Math.ceil(G.s / 4.3); gv++) {
    const u = gu * 4.3 + (hash(gu, gv + 61) - 0.5) * 3, v = gv * 4.3 + (hash(gv - 61, gu) - 0.5) * 3;
    if (west(u, v) && !onRoad(u, v)) put(u, v, 1.1 + 0.5 * hash(gu + 61, gv * 3));
  }
  // trees on the tiers stand on their tops
  (S.stand = S.stand || []).push((x, z) => {
    const [u, v] = UV(x, z), m = Math.max(Math.abs(u), Math.abs(v));
    if (m > A1 + 0.3) return 0;
    const g = LAND_Y + rise(x, z);
    return Math.max(0, (m < A2 + 0.2 ? y2 : y1) - g);
  });
  return seq;
}

// ---- Trai Cung: the fasting palace at the south-west, facing south, in a brick wall of 85 x 65 m ----
// The source's 85 x 65 m is the depth by the width: on the satellite (Google, 2026 capture) the wall runs 64 m east
// to west and 83 m north to south, on the esplanade's 13° turn. Every building below is placed and sized from that
// image (roof outlines, in the frame's u, v): the main hall's hip roof 13.7 x 22 m on the axis; behind it a stone-paved
// court 28 x 29 m ringed with column bases (the ground of the lost rear buildings); Tả and Hữu Túc, long halls
// 25.5 x 9 m either side of the south court; two square halls (Thượng Trà, Thượng Thiện) in the north corners; a small
// house in the south-east corner and a smaller one west of the main hall. The OSM main hall (15 x 25.6 m) sits about
// 3.5 m south of the roof seen from above, so the image is followed.
function trai(S, box, span) {
  const U = -173.9, V0 = 164, V1 = 247, HW = 32; // axis, north and south walls, half width
  const n0 = S.n;
  let cy = -Infinity, cmin = Infinity;
  for (let u = U - HW; u <= U + HW; u += 8.5) for (let v = V0; v <= V1; v += 6.5) { const g = gy(u, v); cy = Math.max(cy, g); cmin = Math.min(cmin, g); }
  cy += 0.12;
  S.base = cy - LAND_Y;
  S.kind = KIND.ROAD; // the court is bare sandy ground and paving throughout (no lawns on the satellite)
  span(U - HW + 0.4, U + HW - 0.4, V0 + 0.4, V1 - 0.4, cmin - 0.4, cy, COURT, { top: COURT });
  { // the stone-paved court behind the main hall, a low platform ringed with the stone bases of lost columns
    const u0 = U - 14.15, u1 = U + 14.15, v0 = 171.1, v1 = 200.2;
    S.kind = KIND.MASONRY;
    span(u0, u1, v0, v1, cy - 0.2, cy + 0.3, shade(STONE, 0.92), { top: hex('#a59c88'), topKind: KIND.ROAD });
    S.kind = KIND.PLAIN;
    for (const [a, b, c, d] of ([[u0 + 1.6, u1 - 1.6, v0 + 1.6, v0 + 1.6], [u0 + 1.6, u1 - 1.6, v1 - 9, v1 - 9], [u0 + 1.6, u0 + 1.6, v0 + 1.6, v1 - 9], [u1 - 1.6, u1 - 1.6, v0 + 1.6, v1 - 9]] as any[])) {
      const n = Math.max(1, Math.round(Math.hypot(b - a, d - c) / 4.2));
      for (let k = 0; k <= n; k++) box(a + ((b - a) * k) / n, c + ((d - c) * k) / n, cy + 0.3, cy + 0.42, 0.75, 0.75, shade(STONE, 0.78));
    }
  }

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
  const hall = (u, v, w, d, faceSouth, o?) => { const p = P(u, v); return pavilion(S, p[0], p[1], w, d, faceSouth ? ANG : ANG + Math.PI / 2, cy, { tiers: 1, roof: TC_ROOF, ridge: TC_RIDGE, ...o }); };
  // chính điện: rear and front hall under joined roofs, on one platform; roofs together 13.7 x 22 m (v 191.6-213.6)
  {
    const p = P(U, 202.6);
    S.kind = KIND.MASONRY;
    S.box(p[0], p[1], cy - 0.2, cy + 0.75, 13.4, 21.2, ANG, STONE, { topKind: KIND.ROAD });
    for (let k = 1; k <= 4; k++) box(U, 213.2 + k * 0.34, cy - 0.2, cy + 0.75 - k * 0.17, 5, 0.34, shade(STONE, 1.05), { topKind: KIND.ROAD });
  }
  hall(U, 197.5, 11.9, 9.4, true, { wallH: 4.0, wall: PAL.lacquer, over: 0.9, rh: 3.4, platform: 0.75, steps: false, colonnade: true });
  hall(U, 207.7, 11.9, 9.4, true, { wallH: 3.6, wall: PAL.lacquer, over: 0.9, rh: 3.0, platform: 0.75, steps: false, colonnade: true });
  // Tả Túc and Hữu Túc either side of the south court, long sides facing it
  for (const u of [-196.8, -151.1]) hall(u, 229.2, 23.8, 7.3, false, { wallH: 3.1, wall: WOOD, over: 0.85, rh: 2.4, platform: 0.45 });
  // Thượng Trà and Thượng Thiện in the north-west and north-east corners, nearly square
  hall(-195.4, 175.9, 10.2, 9.4, true, { wallH: 2.9, wall: WOOD, over: 0.8, rh: 2.3, platform: 0.35 });
  hall(-150.2, 176.1, 8.2, 9.2, true, { wallH: 2.9, wall: WOOD, over: 0.8, rh: 2.3, platform: 0.35 });
  // the small house in the south-east corner, and the smaller one west of the main hall
  hall(-161.6, 240.6, 9.2, 7.1, true, { wallH: 2.7, wall: WOOD, over: 0.8, rh: 1.9, platform: 0.3 });
  hall(-193.4, 201, 6.4, 4.6, false, { wallH: 2.5, wall: hex('#cfc4ad'), roof: hex('#8d8a82'), over: 0.6, rh: 1.6, platform: 0.2 });
  (S.paved = S.paved || []).push([n0, S.n]);
}
