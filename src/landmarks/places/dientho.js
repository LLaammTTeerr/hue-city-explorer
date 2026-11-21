import { KIND, hex, shade } from '../../geo/buf.js';
import { LAND_Y, POND_Y, PAL } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { fence } from '../enclosure.js';

// ---- Cung Diên Thọ, the queen mothers' residence in the north-west of the Imperial City ----
//
// Sources (docs/places/dientho.md has the full list):
//  - vi.wikipedia.org/wiki/Cung_Diên_Thọ: precinct 138.5 m x 126.4 m (about 17,500 m²), brick wall over 2 m
//    high with four gates: Thọ Chỉ (front, a two-storey gate, stone-paved, flanked by the side doors Trinh Ứng and
//    Thụy Quang), Diễn Trạch (rear), Địch Tường (west), Thiện Khánh (east); long brick screens inside Thọ Chỉ and
//    inside Diễn Trạch. Main hall 34.7 x 27.5 m, platform 1 thước 4 tấc (about 0.56 m), three stone steps in
//    front, two at the back on each side; a double house (trùng thiềm điệp ốc): front house 7 bays + 2 chái, main
//    house 5 bays + 2 double chái; front verandah 2 m, rear verandah 4.5 m; yellow glazed tiles, a gourd on the
//    ridge. Điện Thọ Ninh about 20 m behind, half the hall's area, 3 bays + 2 chái since 1930. Tạ Trường Du
//    (1849) east of the hall on a pond 28 x 20 m, half the pond's area, facing south: a square pavilion of one bay
//    and four chái on 16 columns, green glazed tiles, glass walls, a cloisonné gourd on the ridge, two rockeries
//    in the pond. Khương Ninh Các / Phước Thọ Am (1830): a two-storey timber hall facing west in its own walled
//    court. Tịnh Minh Lâu (1927, enlarged 1950, restored 2005): a two-storey Western house. Tả Trà: 3 bays + 2
//    chái, rebuilt 2011-2014. Covered corridors with green glazed tiles join the halls.
//  - vinwonders.com (Cung Diên Thọ): Phước Thọ Am has 3 bays and two storeys, a bát tràng brick court with a
//    shallow pond and rockwork; the tạ has a bridge to the south bank.
//  - OpenStreetMap: every outline below (the hall 172763420, Thọ Ninh 172763421, Trường Du Tạ 531031538, the pond
//    695810794, Tịnh Minh Lâu 531031540 and its annex 695810800, Khương Ninh Các 531031542, Tả Trà 617437911,
//    the screens 617991230 / 695810776, the gates Thọ Chỉ 695810806 / Diễn Trạch 695810777, the corridors
//    617991231/32/33, 695810779/99, and the walls 695810801/02/74/75/96/97). The OSM outlines are square to the
//    hall within 0.5 m and match the sourced sizes (precinct 126.5 x 138.4 m, pond 28.1 x 20.4 m).
// Estimated: all heights (ridge of the main hall 8.6 m + gourd, Thọ Ninh ~7.5 m, Khương Ninh Các ~9.4 m, Tịnh
// Minh Lâu ~10.5 m, the gates), the places of the east and west gates, the split of the hall's two roofs, the
// colours of Tịnh Minh Lâu, Tả Trà and Khương Ninh Các, and the rockeries.

// Frame: u across the front (east-north-east), v toward the front (south-south-east, to Thọ Chỉ), metres from
// the middle of the main hall's OSM outline.
const C = [-1436.575, 0.5], UX = 0.80967, UZ = -0.58688;

const TILE = PAL.imperialRoof, GREEN = PAL.jadeRoof, RIDGE = hex('#f1d77a'), LAC = PAL.lacquer, DARKLAC = hex('#4a1f19');
const GOLD = hex('#d9b04a'), STONE = PAL.stone, BRICK = hex('#9c6a56'), WALL = hex('#b48a58'), DARK = hex('#2e211c');
const CREAM = hex('#e8d49a'), WHITE = hex('#f1ece0'), RED_TILE = hex('#8e3f2c'), SHUTTER = hex('#4f6f55');
const GLASS = hex('#9fb4b8'), WATER = hex('#4f6d5c'), ROCK = hex('#7c776c');
const gY = (x, z) => LAND_Y + rise(x, z);
const ANG = Math.atan2(UZ, UX);
const P = (u, v) => [C[0] + u * UX - v * UZ, C[1] + u * UZ + v * UX];

// the precinct wall, in (u, v), split at the four gates
const WALLS = [
  [[8.3, 71.3], [62.5, 70.7], [62.4, 38.45]], // front, east of Thọ Chỉ, to Thiện Khánh
  [[62.4, 32.95], [62.4, 8.1], [62.0, -27.1], [61.9, -66.3], [1.4, -66.6]], // east, rear to Diễn Trạch
  [[-4.1, -65.8], [-64.1, -66.1], [-64.1, -31.1], [-63.6, -27.6], [-63.4, -20.25]], // rear, west to Địch Tường
  [[-63.3, -14.75], [-63.1, -8.1], [-61.2, 72.3], [-6.2, 71.6]], // west, front to Thọ Chỉ
];
const INNER_WALLS = [
  [[-63.6, -27.6], [-48.4, -27.9]], // Khương Ninh Các's court
  [[-48.9, -7.0], [-56.0, -7.7], [-63.1, -8.1]],
  [[58.5, 30.5], [41.7, 31.1]], // the lane from Tả Trà to Thiện Khánh
  [[35.3, 36.1], [35.4, 40.5], [54.5, 40.5]],
];
// covered corridors (u0, u1, v0, v1)
const CORRIDORS = [
  [10.5, 25.8, -36.9, -31.8], [21.2, 26.7, -36.9, -4.6], [18.3, 21.2, -11.8, -4.7], // Thọ Ninh - hall, east
  [26.7, 45.8, -25.2, -19.5], [40.5, 45.9, -19.5, -17.3], // to Trường Du Tạ
  [-25.9, -11.4, -36.2, -32.0], [-25.9, -21.2, -36.0, -11.8], [-35.3, -18.4, -18.4, -6.6], // west, to Khương Ninh
  [18.4, 28.3, 7.6, 13.4], [-33.0, -18.4, 8.6, 13.1], // the hall to Tả Trà and to Tịnh Minh Lâu
];
const POND = [[56.7, -16.2], [56.6, 1.1], [55.1, 2.6], [30.8, 3.0], [29.0, 1.2], [28.6, -16.5], [29.9, -17.4], [55.5, -17.3]];

const STYLE = { h: 2.5, plinth: 2.5, rail: false, t: 0.5, every: 6.0, postW: 0.7, postUp: 0.25, wall: WALL, cap: hex('#c79a3a'), iron: null, pierW: 1.1, pierUp: 1.2 };
const INNER = { ...STYLE, h: 2.2, plinth: 2.2, t: 0.4, postW: 0.55 };

export const id = 'dientho';

export function build({ S }) {
  const y0 = gY(C[0], C[1]);
  const box = (u, v, ya, yb, w, d, col, o) => { const q = P(u, v); S.box(q[0], q[1], ya, yb, w, d, ANG, col, o); };
  const boxR = (u, v, ya, yb, w, d, col, o) => { const q = P(u, v); S.box(q[0], q[1], ya, yb, w, d, ANG + Math.PI / 2, col, o); }; // w along v
  const hip = (u, v, w, d, ya, h, col, o) => { const q = P(u, v); S.hip(q[0], q[1], w, d, ANG, ya, h, col, { flare: 0.45, fascia: 0.25, fasciaCol: shade(LAC, 0.7), hips: true, glazed: true, segs: 3, ridgeCol: RIDGE, ...o }); };
  const hipR = (u, v, w, d, ya, h, col, o) => { const q = P(u, v); S.hip(q[0], q[1], w, d, ANG + Math.PI / 2, ya, h, col, { flare: 0.45, fascia: 0.25, fasciaCol: shade(LAC, 0.7), hips: true, glazed: true, segs: 3, ridgeCol: RIDGE, ...o }); };
  const cyl = (u, v, ya, yb, r0, r1, n, col, o) => { const q = P(u, v); S.cyl(q[0], q[1], ya, yb, r0, r1, n, col, { rot: ANG, ...o }); };
  const col = (u, v, ya, yb, r = 0.2) => { S.kind = KIND.TIMBER; cyl(u, v, ya, yb, r, r * 0.92, 6, LAC, { cap: false }); };
  S.base = y0 - LAND_Y;

  // ---- courts: bát tràng brick before and behind the hall, the stone way from the screen to Thọ Chỉ ----
  S.kind = KIND.MASONRY;
  box(0, 27.6, y0 - 0.25, y0 + 0.08, 46, 28, BRICK, { topKind: KIND.ROAD });
  box(-0.4, -22.6, y0 - 0.25, y0 + 0.08, 34, 18.5, shade(BRICK, 0.95), { topKind: KIND.ROAD });
  box(1.0, 57.1, y0 - 0.25, y0 + 0.1, 3.2, 25.5, shade(STONE, 1.05), { topKind: KIND.ROAD });
  box(0, 27.6, y0 - 0.25, y0 + 0.12, 3.2, 28, shade(STONE, 1.05), { topKind: KIND.ROAD });

  // ---- Diên Thọ chính điện: a double house on a 0.56 m platform ----
  {
    const pt = 0.56, yp = y0 + pt;
    S.kind = KIND.MASONRY;
    box(0, 0, y0 - 0.3, yp, 37.4, 27.4, STONE, { taper: 0.99, topKind: KIND.ROAD });
    for (let k = 1; k <= 3; k++) box(0, 13.7 + 0.32 * (k - 0.5), y0 - 0.25, yp - (pt / 3) * k, 7.0, 0.32, shade(STONE, 1.05), { topKind: KIND.ROAD });
    for (const s of [-1, 1]) for (let k = 1; k <= 2; k++) box(s * 11, -13.7 - 0.32 * (k - 0.5), y0 - 0.25, yp - (pt / 2) * k, 4.0, 0.32, shade(STONE, 1.05), { topKind: KIND.ROAD });
    // main house (chính điện): 5 bays + 2 double chái, the rear verandah 4.5 m deep
    S.kind = KIND.TIMBER;
    box(0, -3.3, yp, yp + 3.8, 31.0, 10.0, DARKLAC, { top: shade(TILE, 0.8) });
    hip(0, -5.4, 33.8, 14.2, yp + 3.8, 4.2, TILE, { over: 1.5, flare: 0.5, segs: 4 });
    // front house (tiền điện): 7 bays + 2 chái, the front verandah 2 m deep
    box(0, 6.8, yp, yp + 3.3, 31.0, 7.6, DARKLAC, { top: shade(TILE, 0.8) });
    hip(0, 7.0, 33.8, 9.6, yp + 3.3, 3.3, TILE, { over: 1.5, flare: 0.5 });
    // columns: the front row on the verandah edge (10, for 9 bays), the rear row on the 4.5 m verandah
    for (let i = 0; i <= 9; i++) {
      const u = -16.6 + i * (33.2 / 9);
      col(u, 11.6, yp, yp + 3.35, 0.22);
      col(u, -12.0, yp, yp + 3.85, 0.24);
    }
    // the front: dark lacquered doors in the seven bays, gilt liên ba panels over them
    S.kind = KIND.PLAIN;
    const bay = 33.2 / 9;
    for (let i = -3; i <= 3; i++) {
      box(i * bay, 10.62, yp, yp + 2.45, bay - 0.55, 0.08, shade(DARKLAC, 0.75));
      box(i * bay, 10.63, yp + 2.55, yp + 3.0, bay - 0.4, 0.08, GOLD);
    }
    box(0, 11.0, yp + 3.1, yp + 3.3, 33.4, 1.2, shade(LAC, 0.45), { bottom: true }); // verandah ceiling
    // the ridges: a gilt gourd (bầu báu) on the main ridge, short ridge ends on the front roof
    const ridgeY = yp + 3.8 + 4.2;
    cyl(0, -5.4, ridgeY - 0.1, ridgeY + 0.35, 0.42, 0.42, 8, GOLD);
    cyl(0, -5.4, ridgeY + 0.35, ridgeY + 0.85, 0.3, 0.1, 8, GOLD);
    for (const s of [-1, 1]) cyl(s * 9.6, -5.4, ridgeY - 0.1, ridgeY + 0.6, 0.28, 0.12, 6, RIDGE);
  }

  // ---- Điện Thọ Ninh: 3 bays + 2 chái behind the rear court ----
  {
    const u0 = -0.45, v0 = -39.55, yp = y0 + 0.56;
    S.kind = KIND.MASONRY;
    box(u0, v0, y0 - 0.3, yp, 21.9, 15.5, STONE, { taper: 0.99, topKind: KIND.ROAD });
    for (let k = 1; k <= 3; k++) box(u0, 7.75 + v0 + 0.32 * (k - 0.5), y0 - 0.25, yp - (0.56 / 3) * k, 5.0, 0.32, shade(STONE, 1.05), { topKind: KIND.ROAD });
    S.kind = KIND.TIMBER;
    box(u0, v0 - 0.8, yp, yp + 3.4, 17.6, 10.0, DARKLAC, { top: shade(TILE, 0.8) });
    hip(u0, v0, 19.4, 13.0, yp + 3.4, 3.4, TILE, { over: 1.2 });
    for (let i = 0; i <= 5; i++) col(u0 - 9.5 + i * 3.8, v0 + 6.3, yp, yp + 3.45, 0.2);
    S.kind = KIND.PLAIN;
    for (let i = -2; i <= 2; i++) {
      box(u0 + i * 3.4, v0 + 4.22, yp, yp + 2.4, 2.8, 0.08, shade(DARKLAC, 0.75));
      box(u0 + i * 3.4, v0 + 4.23, yp + 2.5, yp + 2.9, 3.0, 0.08, GOLD);
    }
    cyl(u0, v0, yp + 6.75, yp + 7.35, 0.3, 0.1, 8, GOLD);
  }

  // ---- Tả Trà: 3 bays + 2 chái facing the front court from the east (rebuilt 2014) ----
  {
    const u0 = 35.0, v0 = 20.45, yp = y0 + 0.45;
    S.kind = KIND.MASONRY;
    box(u0, v0, y0 - 0.3, yp, 13.4, 25.9, STONE, { taper: 0.99, topKind: KIND.ROAD });
    for (let k = 1; k <= 3; k++) boxR(u0 - 6.7 - 0.32 * (k - 0.5), v0, y0 - 0.25, yp - 0.15 * k, 4.5, 0.32, shade(STONE, 1.05), { topKind: KIND.ROAD });
    S.kind = KIND.TIMBER;
    box(u0 + 0.9, v0, yp, yp + 3.3, 9.6, 22.4, DARKLAC, { top: shade(TILE, 0.8) });
    hipR(u0, v0, 22.4, 11.2, yp + 3.3, 3.3, TILE, { over: 1.2 });
    for (let i = 0; i <= 7; i++) col(u0 - 5.4, v0 - 11.0 + i * (22 / 7), yp, yp + 3.35, 0.19);
    S.kind = KIND.PLAIN;
    for (let i = -2; i <= 2; i++) {
      boxR(u0 - 3.92, v0 + i * 3.1, yp, yp + 2.4, 2.6, 0.08, shade(DARKLAC, 0.75));
      boxR(u0 - 3.93, v0 + i * 3.1, yp + 2.5, yp + 2.9, 2.8, 0.08, GOLD);
    }
  }

  // ---- Tịnh Minh Lâu: the two-storey Western house of 1927 on the west of the court, and its 1950 wing ----
  {
    const u0 = -34.9, v0 = 22.2, yb = y0 + 0.6, f1 = yb + 3.9, f2 = f1 + 3.7;
    S.kind = KIND.MASONRY;
    box(u0, v0, y0 - 0.3, yb, 16.4, 15.4, shade(STONE, 0.95), { topKind: KIND.ROAD });
    box(u0, v0, y0 - 0.3, yb, 20.0, 5.4, shade(STONE, 0.95), { topKind: KIND.ROAD });
    S.kind = KIND.COLONIAL;
    box(u0, v0, yb, f2, 15.4, 14.6, CREAM, { top: shade(CREAM, 0.8) });
    for (const s of [-1, 1]) box(u0 + s * 8.6, v0, yb, f2 + 0.6, 1.8, 5.4, CREAM, { top: WHITE }); // the end bays, a storey's parapet higher
    S.kind = KIND.PLAIN;
    for (const y of [f1, f2]) box(u0, v0, y - 0.18, y + 0.12, 15.7, 14.9, WHITE); // string course and cornice
    for (const s of [-1, 1]) {
      box(u0 + s * 8.6, v0, f1 - 0.18, f1 + 0.12, 2.1, 5.7, WHITE);
      box(u0 + s * 8.6, v0, f2 + 0.45, f2 + 0.75, 2.1, 5.7, WHITE);
      // the porch: a door and an arched window above it in each end bay, shutters either side
      boxR(u0 + s * 9.52, v0, yb, yb + 2.7, 1.6, 0.06, DARK);
      boxR(u0 + s * 9.52, v0, f1 + 0.5, f1 + 2.6, 1.4, 0.06, DARK);
      for (const k of [-1, 1]) boxR(u0 + s * 9.53, v0 + k * 1.15, f1 + 0.5, f1 + 2.6, 0.5, 0.05, SHUTTER);
    }
    S.hip(...P(u0, v0), 15.4, 14.6, ANG, f2 + 0.1, 2.6, RED_TILE, { over: 0.7, fascia: 0.18, fasciaCol: WHITE });
    // the wing toward the hall (OSM 695810800)
    S.kind = KIND.COLONIAL;
    box(-41.0, 10.8, y0, yb + 3.6, 15.8, 8.2, CREAM, { top: shade(CREAM, 0.8) });
    S.kind = KIND.PLAIN;
    box(-41.0, 10.8, yb + 3.4, yb + 3.75, 16.1, 8.5, WHITE);
    S.hip(...P(-41.0, 10.8), 15.8, 8.2, ANG, yb + 3.7, 1.6, RED_TILE, { over: 0.6 });
  }

  // ---- Khương Ninh Các (Phước Thọ Am): two storeys of timber facing west into its own court ----
  {
    const u0 = -42.1, v0 = -16.15, yp = y0 + 0.6;
    S.kind = KIND.MASONRY;
    box(u0, v0, y0 - 0.3, yp, 13.6, 18.7, STONE, { taper: 0.99, topKind: KIND.ROAD });
    for (let k = 1; k <= 3; k++) boxR(u0 - 6.8 - 0.32 * (k - 0.5), v0, y0 - 0.25, yp - 0.2 * k, 4.0, 0.32, shade(STONE, 1.05), { topKind: KIND.ROAD });
    S.kind = KIND.TIMBER;
    box(u0 + 0.6, v0, yp, yp + 3.4, 10.4, 15.2, DARKLAC, { top: shade(TILE, 0.8) });
    hipR(u0, v0, 16.4, 11.8, yp + 3.4, 1.1, TILE, { over: 1.1, flare: 0.3 });
    box(u0 + 0.6, v0, yp + 3.6, yp + 6.4, 8.0, 12.4, LAC, { top: shade(TILE, 0.8) });
    S.kind = KIND.PLAIN;
    boxR(u0 - 3.42, v0, yp + 4.2, yp + 6.0, 9.6, 0.08, GOLD); // the upper doors
    hipR(u0 + 0.6, v0, 12.4, 8.0, yp + 6.4, 2.5, TILE, { over: 1.0 });
    for (let i = 0; i <= 5; i++) col(u0 - 5.7, v0 - 7.6 + i * (15.2 / 5), yp, yp + 3.45, 0.19);
    S.kind = KIND.PLAIN;
    for (let i = -1; i <= 1; i++) boxR(u0 - 4.62, v0 + i * 3.6, yp, yp + 2.4, 3.0, 0.08, shade(DARKLAC, 0.75));
    cyl(u0 + 0.6, v0, yp + 8.85, yp + 9.4, 0.28, 0.1, 8, GOLD);
    // the back hall (OSM 695810779)
    S.kind = KIND.TIMBER;
    box(-31.2, -30.55, y0, y0 + 3.0, 9.0, 8.8, DARKLAC, { top: shade(GREEN, 0.8) });
    hip(-31.2, -30.55, 9.0, 8.8, y0 + 3.0, 2.2, GREEN, { over: 0.9 });
    // the court: bát tràng brick, a shallow basin with a rockery, two small kiosks by its walls
    S.kind = KIND.MASONRY;
    box(-56.1, -17.6, y0 - 0.25, y0 + 0.06, 14.0, 19.0, BRICK, { topKind: KIND.ROAD });
    box(-55.5, -17.6, y0 - 0.2, y0 + 0.35, 4.0, 6.0, STONE);
    S.kind = KIND.PLAIN;
    box(-55.5, -17.6, y0 + 0.35, y0 + 0.37, 3.4, 5.4, WATER);
    S.kind = KIND.MASONRY;
    cyl(-55.5, -17.6, y0 + 0.3, y0 + 1.6, 0.8, 0.3, 6, ROCK);
    for (const v of [-9.4, -25.95]) {
      box(-57.8, v, y0, y0 + 2.4, 3.7, 2.4, WALL, { top: TILE });
      hip(-57.8, v, 3.7, 2.4, y0 + 2.4, 0.9, TILE, { over: 0.4, segs: 2 });
    }
  }

  // ---- Tạ Trường Du: the water pavilion on the north side of its pond, the Lương Phong porch, a bridge south ----
  {
    const u0 = 42.15, v0 = -12.55, yp = y0 + 0.4;
    // stone kerb round the pond
    S.kind = KIND.MASONRY;
    for (let i = 0; i < POND.length; i++) {
      const a = POND[i], b = POND[(i + 1) % POND.length], mu = (a[0] + b[0]) / 2, mv = (a[1] + b[1]) / 2;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]), q = P(mu, mv);
      S.box(q[0], q[1], POND_Y - 0.2, y0 + 0.22, len + 0.4, 0.45, ANG + Math.atan2(b[1] - a[1], b[0] - a[0]), STONE);
    }
    // the platform rising out of the water, with a low balustrade
    box(u0, v0 + 1.6, POND_Y - 0.3, yp, 10.4, 13.6, STONE, { topKind: KIND.ROAD });
    S.kind = KIND.PLAIN;
    for (const s of [-1, 1]) {
      box(u0 + s * 5.0, v0 + 1.6, yp, yp + 0.7, 0.14, 13.4, shade(LAC, 0.8));
      box(u0, v0 + 1.6 + s * 6.6, yp, yp + 0.7, 10.0, 0.14, shade(LAC, 0.8));
    }
    // 16 columns: 12 round the outside, 4 inside; glass walls between the inner columns
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const a = -4.3 + i * (8.6 / 3), b = -4.3 + j * (8.6 / 3);
      const inner = i > 0 && i < 3 && j > 0 && j < 3;
      col(u0 + a, v0 + b, yp, yp + (inner ? 4.05 : 2.85), 0.17);
    }
    S.kind = KIND.PLAIN;
    box(u0, v0, yp + 0.1, yp + 2.6, 7.4, 7.4, GLASS, { top: shade(LAC, 0.5) });
    for (let k = -1; k <= 1; k++) {
      box(u0 + k * 2.4, v0, yp + 0.1, yp + 2.6, 0.12, 7.5, DARKLAC);
      box(u0, v0 + k * 2.4, yp + 0.1, yp + 2.6, 7.5, 0.12, DARKLAC);
    }
    S.kind = KIND.TIMBER;
    hip(u0, v0, 8.6, 8.6, yp + 2.85, 1.0, GREEN, { over: 0.9, flare: 0.3 });
    box(u0, v0, yp + 3.1, yp + 4.05, 3.4, 3.4, GLASS, { top: shade(GREEN, 0.8) });
    hip(u0, v0, 3.4, 3.4, yp + 4.05, 1.7, GREEN, { over: 0.8 });
    cyl(u0, v0, yp + 5.7, yp + 6.3, 0.22, 0.08, 8, hex('#3d7fb0')); // the cloisonné gourd
    // Lương Phong: the porch on the south side
    for (const s of [-1, 1]) col(u0 + s * 2.6, v0 + 7.8, yp, yp + 2.5, 0.15);
    hip(u0, v0 + 6.4, 6.0, 3.2, yp + 2.5, 1.0, GREEN, { over: 0.6, segs: 2 });
    // the bridge to the south bank
    S.kind = KIND.MASONRY;
    box(u0, (v0 + 8.2 + 3.4) / 2, POND_Y - 0.3, yp - 0.05, 2.2, 3.4 - (v0 + 8.2) + 0.4, STONE, { topKind: KIND.ROAD });
    S.kind = KIND.PLAIN;
    for (const s of [-1, 1]) box(u0 + s * 1.05, (v0 + 8.2 + 3.4) / 2, yp - 0.05, yp + 0.55, 0.12, 3.4 - (v0 + 8.2), shade(STONE, 0.85));
    // two rockeries (non bộ) in the water, each with small shrines on it
    S.kind = KIND.MASONRY;
    for (const [ru, rv] of [[33.0, -4.0], [51.5, -4.5]]) {
      box(ru, rv, POND_Y - 0.3, POND_Y + 0.5, 3.2, 2.4, shade(ROCK, 0.9));
      cyl(ru - 0.5, rv, POND_Y + 0.4, y0 + 1.5, 1.1, 0.35, 6, ROCK);
      cyl(ru + 0.8, rv + 0.3, POND_Y + 0.4, y0 + 0.9, 0.8, 0.3, 5, shade(ROCK, 1.1));
      S.kind = KIND.PLAIN;
      box(ru + 0.3, rv - 0.6, y0 + 0.5, y0 + 0.8, 0.35, 0.35, WALL, { top: TILE });
      S.kind = KIND.MASONRY;
    }
  }

  // ---- covered corridors: low stone floor, red posts, green glazed roofs ----
  for (const [u0, u1, v0, v1] of CORRIDORS) {
    const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2, w = u1 - u0, d = v1 - v0, along = w >= d;
    S.kind = KIND.MASONRY;
    box(cu, cv, y0 - 0.25, y0 + 0.3, w, d, STONE, { topKind: KIND.ROAD });
    const L = along ? w : d, n = Math.max(1, Math.round(L / 3.2));
    for (let i = 0; i <= n; i++) {
      const t = -L / 2 + 0.3 + (i * (L - 0.6)) / n;
      for (const s of [-1, 1]) {
        const off = s * ((along ? d : w) / 2 - 0.4);
        if (along) col(cu + t, cv + off, y0 + 0.3, y0 + 2.9, 0.13);
        else col(cu + off, cv + t, y0 + 0.3, y0 + 2.9, 0.13);
      }
    }
    hip(cu, cv, Math.max(0.5, w - 0.4), Math.max(0.5, d - 0.4), y0 + 2.9, 1.2, GREEN, { over: 0.55, flare: 0.25, segs: 2, hips: false });
  }

  // ---- the screens: Tiền Bình Phong inside Thọ Chỉ, Hậu Bình Phong inside Diễn Trạch ----
  for (const [u0, v0, w, h] of [[0.55, 43.15, 21.7, 2.7], [-1.35, -62.35, 5.9, 2.4]]) {
    S.kind = KIND.MASONRY;
    box(u0, v0, y0 - 0.2, y0 + 0.35, w + 0.6, 1.6, STONE);
    box(u0, v0, y0 + 0.35, y0 + h, w, 0.7, WALL, { top: TILE });
    S.kind = KIND.TILE;
    box(u0, v0, y0 + h, y0 + h + 0.3, w + 0.3, 1.0, TILE, { taper: 0.5 });
    S.kind = KIND.PLAIN;
    box(u0, v0, y0 + 0.9, y0 + h - 0.4, Math.min(w * 0.3, 4.0), 0.76, shade(WALL, 0.82)); // the panel in the middle
  }

  // ---- the gates ----
  // Thọ Chỉ Môn: a two-storey gate (cửa lầu chồng), the main door with the side doors Trinh Ứng and Thụy Quang
  {
    const u0 = 1.05, v0 = 71.5, yb = y0 + 0.2;
    S.kind = KIND.MASONRY;
    box(u0, v0, y0 - 0.3, yb, 15.3, 4.4, STONE, { topKind: KIND.ROAD });
    box(u0, v0, yb, yb + 3.4, 7.0, 3.4, WALL, { top: shade(TILE, 0.8) });
    for (const s of [-1, 1]) box(u0 + s * 5.4, v0, yb, yb + 2.8, 3.8, 3.0, WALL, { top: shade(TILE, 0.8) });
    S.kind = KIND.PLAIN;
    box(u0, v0, yb, yb + 2.7, 2.6, 3.5, DARK);
    for (const s of [-1, 1]) {
      box(u0 + s * 5.4, v0, yb, yb + 2.1, 1.4, 3.1, DARK);
      hip(u0 + s * 5.4, v0, 3.8, 3.0, yb + 2.8, 0.9, TILE, { over: 0.45, segs: 2 });
    }
    hip(u0, v0, 7.0, 3.4, yb + 3.4, 0.8, TILE, { over: 0.6, flare: 0.3 });
    S.kind = KIND.TIMBER;
    box(u0, v0, yb + 3.6, yb + 5.4, 5.0, 2.6, LAC, { top: shade(TILE, 0.8) });
    S.kind = KIND.PLAIN;
    box(u0, v0 + 1.32, yb + 4.0, yb + 5.0, 2.2, 0.06, GOLD); // the name board
    hip(u0, v0, 5.0, 2.6, yb + 5.4, 1.4, TILE, { over: 0.7 });
  }
  // Diễn Trạch (rear), Thiện Khánh (east) and Địch Tường (west): one door under a yellow roof
  for (const [u0, v0, rot] of [[-1.35, -66.25, false], [62.4, 35.7, true], [-63.35, -17.5, true]]) {
    const B = rot ? boxR : box, Hh = rot ? hipR : hip;
    S.kind = KIND.MASONRY;
    B(u0, v0, y0 - 0.3, y0 + 3.0, 5.5, 2.5, WALL, { top: shade(TILE, 0.8) });
    S.kind = KIND.PLAIN;
    B(u0, v0, y0, y0 + 2.3, 1.8, 2.6, DARK);
    Hh(u0, v0, 5.5, 2.5, y0 + 3.0, 1.1, TILE, { over: 0.5, segs: 2 });
  }

  // ---- the walls ----
  S.base = 0;
  for (const w of WALLS) fence(S, w.map(([u, v]) => P(u, v)), STYLE, { closed: false });
  for (const w of INNER_WALLS) fence(S, w.map(([u, v]) => P(u, v)), INNER, { closed: false });
  S.kind = KIND.PLAIN;
  S.base = 0;
}
