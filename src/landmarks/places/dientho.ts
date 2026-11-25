import { KIND, hex, shade } from '../../geo/buf.ts';
import { LAND_Y, POND_Y, PAL } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { fence } from '../enclosure.ts';

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

// roof colours checked against the satellite: the hall's yellow glaze reads a weathered ochre from above, and the
// green glaze of the corridors and the tạ has weathered to a dark grey-green (the source's green glazed tiles)
const TILE = hex('#c9a65f'), GREEN = hex('#66695b'), RIDGE = hex('#dccb93'), LAC = PAL.lacquer, DARKLAC = hex('#4a1f19');
const GOLD = hex('#d9b04a'), STONE = PAL.stone, BRICK = hex('#8f6b57'), WALL = hex('#b48a58'), DARK = hex('#2e211c');
const CREAM = hex('#e8d49a'), WHITE = hex('#f1ece0'), RED_TILE = hex('#8e3f2c'), SHUTTER = hex('#4f6f55');
const GLASS = hex('#9fb4b8'), WATER = hex('#4f6d5c'), ROCK = hex('#7c776c');
// from the Google satellite and Street View check (docs/places/dientho.md, "Changed"): the precinct wall is dark,
// moss-stained brick with a plain coping; Tả Trà, Khương Ninh Các and its back hall wear dark unglazed tiles; the
// gates are painted masonry (ochre, red panels round the arches, blue-and-gold mosaic panels on Thọ Chỉ)
const OLD_WALL = PAL.brick, OLD_CAP = shade(PAL.brick, 0.8), DARK_TILE = hex('#6e5f52'), GREY_TILE = hex('#6c6861');
const OCHRE = hex('#c79a45'), OCHRE_OLD = hex('#a08a5c'), ARCH_RED = hex('#94473a'), MOSAIC = hex('#6f86b8');
const DOOR = hex('#6b2c22'), WOOD = hex('#5a4436');
const PALE = hex('#d9d2c2'), FRAME = hex('#8d8a82'), CREAM_M = hex('#e9dfc4'), LAWN = hex('#7f9a55');
const MOSS = { glazed: false, ridgeCol: shade(GREEN, 0.75) };
const gY = (x, z) => LAND_Y + rise(x, z);
const ANG = Math.atan2(UZ, UX);
const P = (u, v): [number, number] => [C[0] + u * UX - v * UZ, C[1] + u * UZ + v * UX];

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
  [-25.9, -11.4, -36.2, -32.0], [-25.9, -21.2, -36.0, -9.6], // west, to Khương Ninh: round a small court with a tree
  [-35.3, -32.8, -18.4, -6.6], [-32.8, -25.9, -18.4, -15.4], [-32.8, -18.4, -9.6, -6.6],
  [18.4, 28.3, 9.0, 12.0], [-33.0, -18.4, 9.6, 12.6], // the hall to Tả Trà and to Tịnh Minh Lâu
];
const COURT_TREE = [-29.35, -12.5];
// the half-moon lawn inside the curved path between Tiền Bình Phong and Thọ Chỉ, either side of the stone way
// (OSM way 2927 for the curve, drawn 9% in toward the screen so the path stays clear)
const MOON = [[-19.98, 36.36], [-19.98, 43.64], [-16.34, 47.28], [-11.79, 50.92], [-8.14, 52.74], [-4.5, 54.56], [-2.69, 55.47],
  [0.96, 55.47], [4.59, 54.56], [8.23, 53.65], [12.79, 50.92], [15.52, 47.28], [17.34, 44.55], [20.07, 38.18], [20.98, 32.72]];
const LAWNS = [
  [[-19.02, 44.6], [-0.7, 44.6], [-0.7, 55.47], [-2.69, 55.47], [-4.5, 54.56], [-8.14, 52.74], [-11.79, 50.92], [-16.34, 47.28]],
  [[2.7, 44.6], [17.31, 44.6], [15.52, 47.28], [12.79, 50.92], [8.23, 53.65], [4.59, 54.56], [2.7, 55.03]],
];
// trees, (u, v, crown radius), from the canopy on the satellite: the rear court, the north and west gardens,
// round the half-moon lawn and along the front wall
const TREES = [
  [-40, -59, 3.5], [-30, -60, 3.5], [-20, -59, 3.5], [-12, -56, 3], [-58, -52, 3.5], [36, -62, 3], [58, -62, 3],
  [46, -48, 3.5], [54, -42, 3.5], [50, -37, 3], [-60, -37, 3.5], [-50, -40, 3], [-42, -38, 3], [-9, -27, 2.5],
  [4, -24, 2.5], [-48, -3.5, 3], [58, -8, 2.5], [-56, 8, 3], [-54, 15.5, 3.5], [-56, 23, 3], [-50, 30, 3], [-48, 36, 3],
  [-32, 35, 3.5], [-16, 28, 2.5], [14, 19.5, 2.5], [12, 32, 2.5], [26, 37, 2], [48, 15, 3], [48, 24, 2.5], [-58, 50, 3.5],
  [-18, 52, 3], [-18, 62, 3], [24, 54, 3], [26, 63, 3], [46, 65, 2.5], [-40, 56, 3], [-50, 64, 3], [40, 50, 3],
];
const POND = [[56.7, -16.2], [56.6, 1.1], [55.1, 2.6], [30.8, 3.0], [29.0, 1.2], [28.6, -16.5], [29.9, -17.4], [55.5, -17.3]];

// a plain wall: the posts are flush with it, so only the coping shows
const STYLE = { h: 2.5, plinth: 2.5, rail: false, t: 0.55, every: 8.0, postW: 0.55, postUp: 0, wall: OLD_WALL, cap: OLD_CAP, iron: null, pierW: 0.8, pierUp: 0.3 };
const INNER = { ...STYLE, h: 2.2, plinth: 2.2, t: 0.45, postW: 0.45 };

export const id = 'dientho';

const L = ([x, z]) => { const dx = x - C[0], dz = z - C[1]; return [dx * UX + dz * UZ, -dx * UZ + dz * UX]; };
// every mapped outline inside the precinct wall (halls, screens, gates, corridors) is drawn here, so geo/city.js
// leaves them out (a generic house stood on Tiền Bình Phong, whose low cap does not cover its outline)
export function ownsMapped(ring) {
  return ring.every((p) => { const [u, v] = L(p); return u > -65 && u < 64 && v > -68 && v < 74; });
}

export function build({ data, S }) {
  const y0 = gY(C[0], C[1]);
  const box = (u, v, ya, yb, w, d, col, o?) => { const q = P(u, v); S.box(q[0], q[1], ya, yb, w, d, ANG, col, o); };
  const boxR = (u, v, ya, yb, w, d, col, o?) => { const q = P(u, v); S.box(q[0], q[1], ya, yb, w, d, ANG + Math.PI / 2, col, o); }; // w along v
  const hip = (u, v, w, d, ya, h, col, o?) => { const q = P(u, v); S.hip(q[0], q[1], w, d, ANG, ya, h, col, { flare: 0.45, fascia: 0.25, fasciaCol: shade(LAC, 0.7), hips: true, glazed: true, segs: 3, ridgeCol: RIDGE, ...o }); };
  const hipR = (u, v, w, d, ya, h, col, o) => { const q = P(u, v); S.hip(q[0], q[1], w, d, ANG + Math.PI / 2, ya, h, col, { flare: 0.45, fascia: 0.25, fasciaCol: shade(LAC, 0.7), hips: true, glazed: true, segs: 3, ridgeCol: RIDGE, ...o }); };
  const cyl = (u, v, ya, yb, r0, r1, n, col, o?) => { const q = P(u, v); S.cyl(q[0], q[1], ya, yb, r0, r1, n, col, { rot: ANG, ...o }); };
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
    box(u0 + 0.9, v0, yp, yp + 3.3, 9.6, 22.4, DARKLAC, { top: shade(DARK_TILE, 0.8) });
    hipR(u0, v0, 22.4, 11.2, yp + 3.3, 3.3, DARK_TILE, { over: 1.2, glazed: false, ridgeCol: shade(DARK_TILE, 0.8) });
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
    // Street View (the west court): a ground storey walled in dark brown timber leaves, a grey-tiled pent roof with
    // pale rafter ends, a full-width gallery on it behind an open baluster railing, a red upper storey nearly as deep
    // and as wide as the ground storey, and a nearly straight main roof with a low eave; no verandah columns
    const grey = { glazed: false, ridgeCol: shade(GREY_TILE, 0.6), horns: false };
    const yg = yp + 3.0, yu = yp + 3.5, yr = yp + 6.4, front = u0 - 4.6;
    box(u0 + 0.6, v0, yp, yg, 10.4, 15.2, WOOD, { top: shade(GREY_TILE, 0.8) });
    hipR(u0 + 0.6, v0, 15.2, 10.4, yg, 0.9, GREY_TILE, { over: 1.5, flare: 0, hips: false, fascia: 0.12, fasciaCol: shade(WOOD, 0.6), ...grey });
    boxR(front + 0.55, v0, yg - 0.1, yu, 15.2, 1.3, shade(WOOD, 0.7), { top: shade(WOOD, 0.85) }); // the gallery floor
    box(u0 + 1.2, v0, yu, yr, 9.2, 15.2, shade(LAC, 0.72), { top: shade(GREY_TILE, 0.8) });
    hipR(u0 + 1.2, v0, 15.2, 9.2, yr, 2.3, GREY_TILE, { over: 1.2, flare: 0, hips: false, fascia: 0.14, fasciaCol: shade(WOOD, 0.6), ...grey });
    S.kind = KIND.PLAIN;
    boxR(u0 - 3.42, v0, yp + 4.5, yp + 6.0, 13.0, 0.08, hex('#3b3a33')); // the upper windows
    for (let k = -3; k <= 3; k++) boxR(u0 - 3.45, v0 + k * 2.2, yp + 4.4, yp + 6.1, 0.18, 0.08, shade(LAC, 0.8));
    for (let k = -10; k <= 10; k++) boxR(u0 - 3.47, v0 + k * 0.62, yp + 4.5, yp + 6.0, 0.05, 0.05, CREAM);
    boxR(u0 - 3.47, v0, yp + 5.25, yp + 5.3, 13.0, 0.05, CREAM);
    // the open railing along the gallery's edge: red balusters with gaps, a green hand rail, posts at the bays
    const RAIL = shade(LAC, 0.7), RG = hex('#4e7a52');
    boxR(front, v0, yu, yu + 0.1, 15.2, 0.1, RAIL);
    boxR(front, v0, yu + 0.85, yu + 0.95, 15.3, 0.14, RG);
    for (let k = -23; k <= 23; k++) boxR(front, v0 + k * 0.32, yu + 0.1, yu + 0.85, 0.05, 0.05, k % 4 ? RAIL : RG);
    for (let k = -3; k <= 3; k++) boxR(front, v0 + k * 2.5, yu, yu + 1.0, 0.14, 0.14, RAIL);
    // pale rafter ends under the pent roof's eave
    for (let k = -18; k <= 18; k++) boxR(front - 1.1, v0 + k * 0.42, yg - 0.16, yg - 0.03, 0.1, 0.45, PALE);
    // the ground storey: rows of narrow folding leaves, a lattice band above and a lower panel, dark posts
    for (let i = -2; i <= 2; i++) {
      boxR(u0 - 4.62, v0 + i * 2.95, yp, yp + 2.8, 2.6, 0.08, shade(WOOD, 0.85));
      boxR(u0 - 4.66, v0 + i * 2.95, yp + 2.15, yp + 2.75, 2.5, 0.06, shade(WOOD, 0.55));
      for (let k = -3; k <= 3; k++) boxR(u0 - 4.68, v0 + i * 2.95 + k * 0.37, yp + 0.1, yp + 2.1, 0.05, 0.05, shade(WOOD, 0.5));
      boxR(u0 - 4.66, v0 + i * 2.95, yp + 0.1, yp + 0.55, 2.5, 0.06, shade(WOOD, 0.7));
    }
    for (let i = -3; i <= 3; i++) boxR(u0 - 4.64, v0 + i * 2.18, yp, yg, 0.3, 0.14, shade(WOOD, 0.6));
    cyl(u0 + 1.2, v0, yr + 2.2, yr + 2.75, 0.28, 0.1, 8, GOLD);
    // the back hall (OSM 695810779)
    S.kind = KIND.TIMBER;
    box(-31.2, -30.55, y0, y0 + 3.0, 9.0, 8.8, DARKLAC, { top: shade(GREY_TILE, 0.8) });
    hip(-31.2, -30.55, 9.0, 8.8, y0 + 3.0, 2.2, GREY_TILE, { over: 0.9, glazed: false, ridgeCol: shade(GREY_TILE, 0.6) });
    // the court: bát tràng brick, a shallow basin with a rockery, two small kiosks by its walls
    S.kind = KIND.MASONRY;
    box(-56.1, -17.6, y0 - 0.25, y0 + 0.06, 14.0, 19.0, BRICK, { topKind: KIND.ROAD });
    box(-55.5, -17.6, y0 - 0.2, y0 + 0.35, 4.0, 6.0, STONE);
    S.kind = KIND.PLAIN;
    box(-55.5, -17.6, y0 + 0.35, y0 + 0.37, 3.4, 5.4, WATER);
    S.kind = KIND.MASONRY;
    cyl(-55.5, -17.6, y0 + 0.3, y0 + 1.6, 0.8, 0.3, 6, ROCK);
    for (const v of [-9.4, -25.95]) {
      box(-57.8, v, y0, y0 + 2.4, 3.7, 2.4, PALE, { top: GREY_TILE });
      hip(-57.8, v, 3.7, 2.4, y0 + 2.4, 0.9, GREY_TILE, { over: 0.4, segs: 2, flare: 0, ...grey });
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
    hip(u0, v0, 8.6, 8.6, yp + 2.85, 1.0, GREEN, { over: 0.9, flare: 0.3, ...MOSS });
    box(u0, v0, yp + 3.1, yp + 4.05, 3.4, 3.4, GLASS, { top: shade(GREEN, 0.8) });
    hip(u0, v0, 3.4, 3.4, yp + 4.05, 1.7, GREEN, { over: 0.8, ...MOSS });
    cyl(u0, v0, yp + 5.7, yp + 6.3, 0.22, 0.08, 8, hex('#3d7fb0')); // the cloisonné gourd
    // Lương Phong: the porch on the south side
    for (const s of [-1, 1]) col(u0 + s * 2.6, v0 + 7.8, yp, yp + 2.5, 0.15);
    hip(u0, v0 + 6.4, 6.0, 3.2, yp + 2.5, 1.0, GREEN, { over: 0.6, segs: 2, ...MOSS });
    // the bridge to the south bank
    S.kind = KIND.MASONRY;
    box(u0, (v0 + 8.2 + 3.4) / 2, POND_Y - 0.3, yp - 0.05, 2.2, 3.4 - (v0 + 8.2) + 0.4, STONE, { topKind: KIND.ROAD });
    S.kind = KIND.PLAIN;
    for (const s of [-1, 1]) box(u0 + s * 1.05, (v0 + 8.2 + 3.4) / 2, yp - 0.05, yp + 0.55, 0.12, 3.4 - (v0 + 8.2), shade(STONE, 0.85));
    // two rockeries (non bộ) in the water, each with small shrines on it
    S.kind = KIND.MASONRY;
    for (const [ru, rv] of ([[33.0, -4.0], [51.5, -4.5]] as any[])) {
      box(ru, rv, POND_Y - 0.3, POND_Y + 0.5, 3.2, 2.4, shade(ROCK, 0.9));
      cyl(ru - 0.5, rv, POND_Y + 0.4, y0 + 1.5, 1.1, 0.35, 6, ROCK);
      cyl(ru + 0.8, rv + 0.3, POND_Y + 0.4, y0 + 0.9, 0.8, 0.3, 5, shade(ROCK, 1.1));
      S.kind = KIND.PLAIN;
      box(ru + 0.3, rv - 0.6, y0 + 0.5, y0 + 0.8, 0.35, 0.35, WALL, { top: TILE });
      S.kind = KIND.MASONRY;
    }
  }

  // ---- covered corridors: low stone floor, red posts, weathered green glazed roofs ----
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
    hip(cu, cv, Math.max(0.5, w - 0.4), Math.max(0.5, d - 0.4), y0 + 2.9, 1.2, GREEN, { over: 0.55, flare: 0.25, segs: 2, hips: false, horns: false, ...MOSS });
  }
  {
    // the small court in the west corridor, with its tree
    S.kind = KIND.MASONRY;
    box(COURT_TREE[0], COURT_TREE[1], y0 - 0.2, y0 + 0.05, 6.9, 5.8, BRICK, { topKind: KIND.ROAD });
  }

  // ---- the screens: Tiền Bình Phong inside Thọ Chỉ, Hậu Bình Phong inside Diễn Trạch ----
  for (const [u0, v0, w, h] of ([[0.55, 43.15, 21.7, 2.7], [-1.35, -62.35, 5.9, 2.4]] as any[])) {
    S.kind = KIND.MASONRY;
    box(u0, v0, y0 - 0.2, y0 + 0.35, w + 0.6, 1.6, STONE);
    box(u0, v0, y0 + 0.35, y0 + h, w, 0.7, WALL, { top: TILE });
    S.kind = KIND.TILE;
    box(u0, v0, y0 + h, y0 + h + 0.3, w + 0.3, 1.0, TILE, { taper: 0.5 });
    S.kind = KIND.PLAIN;
    box(u0, v0, y0 + 0.9, y0 + h - 0.4, Math.min(w * 0.3, 4.0), 0.76, shade(WALL, 0.82)); // the panel in the middle
  }

  // ---- the gates: painted masonry with real round-headed passages (Street View, docs/places/dientho.md) ----
  // a gate's own frame: s across the opening, t through it
  const gate = (u0, v0, rot?) => {
    const o = P(u0, v0), sd = rot ? [-UZ, UX] : [UX, UZ], td = rot ? [UX, UZ] : [-UZ, UX], a = Math.atan2(sd[1], sd[0]);
    const V = (s, t, y?): [number, number, number] => [o[0] + s * sd[0] + t * td[0], y, o[1] + s * sd[1] + t * td[1]];
    const N = (ns, nt, ny?): [number, number, number] => [ns * sd[0] + nt * td[0], ny, ns * sd[1] + nt * td[1]];
    const B = (s, t, ya, yb, ws, wt, c, opt?) => { const q = V(s, t, 0); S.box(q[0], q[2], ya, yb, ws, wt, a, c, opt); };
    const H = (s, t, ws, wt, ya, h, c, opt?) => { const q = V(s, t, 0); S.hip(q[0], q[2], ws, wt, a, ya, h, c, opt); };
    return { V, N, B, H };
  };
  // a round-headed passage of width w, crown yc, through masonry of depth d whose piers stop at s0 ± w/2 and whose
  // mass over the opening starts at the crown: the field colour in the spandrels and round the arch on both faces,
  // a band round the arch, the vault and the reveals in shade, paving through it
  const K = 10;
  const passage = (G, s0, w, ya, yc, d, field, band) => {
    const r = w / 2, ys = yc - r, h = d / 2, bw = 0.16, fw = 0.3;
    const arc = [];
    for (let k = 0; k <= K; k++) { const a = (Math.PI * k) / K; arc.push([Math.cos(a), Math.sin(a), a]); }
    S.kind = KIND.PLAIN;
    for (let k = 0; k < K; k++) {
      const [c1, n1, a1] = arc[k], [c2, n2, a2] = arc[k + 1], am = (a1 + a2) / 2, ri = r - 0.01;
      const s1 = s0 + ri * c1, s2 = s0 + ri * c2, y1 = ys + ri * n1, y2 = ys + ri * n2;
      S.quad(G.V(s1, -h, y1), G.V(s2, -h, y2), G.V(s2, h, y2), G.V(s1, h, y1), DARK, G.N(-Math.cos(am), 0, -Math.sin(am))); // the vault
      for (const f of [-1, 1]) {
        const t = f * h, tb = f * (h + 0.04), ro = r + bw;
        S.quad(G.V(s1, t, y1), G.V(s2, t, y2), G.V(s2, t, yc + 0.02), G.V(s1, t, yc + 0.02), field, G.N(0, f, 0)); // a spandrel
        S.quad(G.V(s0 + r * c1, tb, ys + r * n1), G.V(s0 + r * c2, tb, ys + r * n2), G.V(s0 + ro * c2, tb, ys + ro * n2), G.V(s0 + ro * c1, tb, ys + ro * n1), band, G.N(0, f, 0));
      }
    }
    for (const sg of [-1, 1]) {
      const s = s0 + sg * (r - 0.01);
      S.quad(G.V(s, -h, ya), G.V(s, h, ya), G.V(s, h, ys), G.V(s, -h, ys), shade(DARK, 1.4), G.N(-sg, 0, 0)); // a reveal
      for (const f of [-1, 1]) {
        G.B(s0 + sg * (r + bw / 2), f * (h + 0.025), ya, ys, bw, 0.05, band); // the band down the jamb
        G.B(s0 + sg * (r + bw + fw / 2), f * (h + 0.015), ya, yc + bw + fw, fw, 0.03, field); // the field beside it
      }
    }
    for (const f of [-1, 1]) G.B(s0, f * (h + 0.015), yc + bw, yc + bw + fw, w + 2 * bw, 0.03, field); // and over it
    S.kind = KIND.ROAD;
    const yf = ya + 0.02;
    S.quad(G.V(s0 - r, -h, yf), G.V(s0 + r, -h, yf), G.V(s0 + r, h, yf), G.V(s0 - r, h, yf), shade(STONE, 1.05), [0, 1, 0]);
    S.kind = KIND.PLAIN;
  };
  // timber leaves folded back against the reveals, on the inner side (inT: the sign of t into the precinct)
  const leaves = (G, s0, r, ya, ys, inT, h) => {
    const len = Math.min(r, h - 0.05);
    S.kind = KIND.PLAIN;
    for (const sg of [-1, 1]) {
      G.B(s0 + sg * (r - 0.06), inT * len / 2, ya + 0.03, ys + 0.25, 0.08, len, DOOR);
      G.B(s0 + sg * (r - 0.11), inT * len / 2, ya + 0.9, ya + 1.0, 0.03, len - 0.15, shade(DOOR, 0.7)); // a rail
    }
  };
  // a closed pair of panelled leaves filling the opening, the fan over them included
  const doors = (G, s0, r, ya, ys) => {
    S.kind = KIND.PLAIN;
    G.B(s0, 0, ya + 0.03, ys, 2 * r - 0.04, 0.1, DOOR);
    for (const f of [-1, 1]) {
      const t = f * 0.05;
      for (let k = 0; k < K; k++) {
        const a1 = (Math.PI * k) / K, a2 = (Math.PI * (k + 1)) / K, rr = r - 0.03;
        S.tri(G.V(s0, t, ys), G.V(s0 + rr * Math.cos(a1), t, ys + rr * Math.sin(a1)), G.V(s0 + rr * Math.cos(a2), t, ys + rr * Math.sin(a2)), DOOR, G.N(0, f, 0));
      }
    }
    const dk = shade(DOOR, 0.7);
    G.B(s0, 0, ya + 0.1, ys - 0.05, 0.05, 0.14, dk); // the meeting stiles
    for (const y of [ya + 0.5, ya + 1.1, ys - 0.12]) G.B(s0, 0, y, y + 0.07, 2 * r - 0.12, 0.14, dk); // the rails
  };

  // Thọ Chỉ Môn (Street View from the front court): one painted masonry front with three round-headed openings,
  // the middle one larger with red leaves folded back, the side doors Trinh Ứng and Thụy Quang shut with red
  // panelled leaves; mosaic panels (blue figures on a cream ground) in grey frames on the piers, a red panel in a
  // grey frame under each; a frieze of small framed panels; plain tiled eaves over the side bays; a raised middle
  // storey of framed panels under the top roof, with dragons and a centre ornament on its ridge
  {
    const u0 = 1.05, v0 = 71.5, yb = y0 + 0.2, H = 4.3, D = 3.4, h = D / 2, G = gate(u0, v0, false), top = { top: shade(TILE, 0.8) };
    const OPEN = [[0, 2.4, 3.4], [-5.0, 1.9, 2.9], [5.0, 1.9, 2.9]];
    const PIERS = [[-6.625, 1.35], [-2.625, 2.85], [2.625, 2.85], [6.625, 1.35]];
    S.kind = KIND.MASONRY;
    G.B(0, 0, y0 - 0.3, yb, 15.3, 4.4, STONE, { topKind: KIND.ROAD });
    for (const [s0, w] of PIERS) {
      G.B(s0, 0, yb, yb + H, w, D, OCHRE, top);
      G.B(s0, 0, y0, yb + 0.5, w, D + 0.3, shade(STONE, 1.05)); // the plinth
    }
    for (const [s0, w, c] of OPEN) G.B(s0, 0, yb + c, yb + H, w, D, OCHRE, top);
    G.B(0, 0, yb + 3.6, yb + 3.78, 14.9, D + 0.2, shade(STONE, 1.1)); // the grey string course over the openings
    for (const [s0, w, c] of OPEN) passage(G, s0, w, yb, yb + c, D, ARCH_RED, shade(STONE, 1.15));
    leaves(G, 0, 1.2, yb, yb + 2.2, -1, h);
    for (const s of [-1, 1]) doors(G, s * 5.0, 0.95, yb, yb + 1.95);
    S.kind = KIND.PLAIN;
    for (const f of [-1, 1]) {
      const t1 = f * (h + 0.015), t2 = f * (h + 0.03), t3 = f * (h + 0.045);
      for (const [s0, w] of PIERS) {
        const wide = w > 2, fw = wide ? 1.7 : 0.74, cw = wide ? 1.44 : 0.56;
        G.B(s0, t1, yb + 0.95, yb + 3.3, fw, 0.03, FRAME); // the mosaic panel's grey frame
        G.B(s0, t2, yb + 1.08, yb + 3.17, cw, 0.03, CREAM_M); // its cream ground
        for (const y of [1.25, 1.9, 2.55]) for (const ds of wide ? [-0.36, 0.36] : [0]) G.B(s0 + ds, t3, yb + y, yb + y + 0.45, wide ? 0.4 : 0.34, 0.03, MOSAIC); // the blue figures
        G.B(s0, t1, yb + 0.55, yb + 0.88, fw, 0.03, FRAME); // the red panel under it, framed
        G.B(s0, t2, yb + 0.6, yb + 0.83, cw, 0.03, ARCH_RED);
      }
      // the frieze: small framed panels, red and cream by turns
      for (let k = -6; k <= 6; k++) {
        G.B(k * 1.1, t1, yb + 3.84, yb + 4.24, 0.84, 0.03, shade(OCHRE, 0.78));
        G.B(k * 1.1, t2, yb + 3.9, yb + 4.18, 0.64, 0.03, k % 2 ? ARCH_RED : CREAM_M);
      }
    }
    for (const s of [-1, 1]) G.H(s * 4.9, 0, 5.2, D, yb + H, 0.8, TILE, { over: 0.55, segs: 2, flare: 0.08, fascia: 0.15, fasciaCol: shade(LAC, 0.7), hips: false, horns: false, glazed: true, ridgeCol: shade(TILE, 0.85) });
    // the middle storey: a row of framed panels and a gilt board
    const ym = yb + H, yr = ym + 1.6 + 1.2;
    S.kind = KIND.MASONRY;
    G.B(0, 0, ym, ym + 1.6, 6.4, 3.0, OCHRE, top);
    S.kind = KIND.PLAIN;
    for (const f of [-1, 1]) {
      const t1 = f * 1.515, t2 = f * 1.53;
      for (let k = -2; k <= 2; k++) {
        G.B(k * 1.18, t1, ym + 0.3, ym + 1.3, 0.98, 0.03, FRAME);
        G.B(k * 1.18, t2, ym + 0.38, ym + 1.22, 0.78, 0.03, k % 2 ? ARCH_RED : CREAM_M);
        if (k % 2 === 0) G.B(k * 1.18, t2 + f * 0.015, ym + 0.55, ym + 1.05, 0.4, 0.03, k ? MOSAIC : GOLD);
      }
    }
    G.H(0, 0, 6.4, 3.0, ym + 1.6, 1.2, TILE, { over: 0.7, flare: 0.3, fascia: 0.2, fasciaCol: shade(LAC, 0.7), hips: true, glazed: true, segs: 3, ridgeCol: RIDGE });
    // the ridge: a dragon at each end, an ornament in the middle; small finials at the outer ends of the side eaves
    for (const sg of [-1, 1]) {
      G.B(sg * 1.35, 0, yr - 0.05, yr + 0.3, 0.6, 0.14, RIDGE);
      G.B(sg * 1.6, 0, yr + 0.3, yr + 0.6, 0.18, 0.14, RIDGE);
      G.B(sg * 5.85, 0, ym + 0.7, ym + 1.1, 0.22, 0.14, RIDGE);
    }
    G.B(0, 0, yr - 0.05, yr + 0.2, 0.36, 0.3, RIDGE);
    G.B(0, 0, yr + 0.2, yr + 0.75, 0.5, 0.1, GOLD);
  }
  // Diễn Trạch (rear), Thiện Khánh (east) and Địch Tường (west), as Thiện Khánh from the east road: panelled piers
  // either side of a red arch field, a projecting cornice, a stepped attic with a row of framed panels, a low tiled
  // cap with small finials; timber leaves folded back inside
  for (const [u0, v0, rot, inT] of ([[-1.35, -66.25, false, 1], [62.4, 35.7, true, -1], [-63.35, -17.5, true, 1]] as any[])) {
    const G = gate(u0, v0, rot), D = 1.6, h = D / 2, ya = y0, r = 0.95, yc = ya + 2.75, frame = shade(OCHRE_OLD, 0.8), light = shade(OCHRE_OLD, 1.12);
    S.kind = KIND.MASONRY;
    for (const sg of [-1, 1]) G.B(sg * 1.775, 0, y0 - 0.3, y0 + 3.2, 1.65, D, OCHRE_OLD);
    G.B(0, 0, yc, y0 + 3.2, 2 * r, D, OCHRE_OLD);
    G.B(0, 0, y0 + 3.2, y0 + 3.75, 5.2, D, OCHRE_OLD); // the entablature
    G.B(0, 0, y0 + 3.75, y0 + 3.95, 5.7, D + 0.35, shade(OCHRE_OLD, 0.85), { bottom: true }); // the projecting cornice
    G.B(0, 0, y0 + 3.95, y0 + 4.4, 4.8, D - 0.2, OCHRE_OLD, { top: OLD_CAP }); // the attic's shoulders
    G.B(0, 0, y0 + 4.4, y0 + 4.85, 3.4, D - 0.2, OCHRE_OLD); // and its raised middle
    passage(G, 0, 2 * r, ya, yc, D, ARCH_RED, light);
    leaves(G, 0, r, ya, yc - r, inT, h);
    S.kind = KIND.PLAIN;
    for (const f of [-1, 1]) {
      const t1 = f * (h + 0.015), t2 = f * (h + 0.03), a1 = f * (h - 0.1 + 0.015), a2 = f * (h - 0.1 + 0.03);
      for (const sg of [-1, 1]) {
        G.B(sg * 1.85, t1, ya + 0.35, ya + 2.85, 1.0, 0.03, frame); // the panelled piers
        G.B(sg * 1.85, t2, ya + 0.48, ya + 2.72, 0.76, 0.03, light);
      }
      for (let k = -2; k <= 2; k++) {
        G.B(k * 0.98, t1, ya + 3.28, ya + 3.67, 0.8, 0.03, frame); // panels in the entablature
        G.B(k * 0.98, t2, ya + 3.33, ya + 3.62, 0.6, 0.03, k % 2 ? ARCH_RED : light);
        G.B(k * 0.9, a1, ya + 4.0, ya + 4.35, 0.7, 0.03, frame); // and in the attic
        G.B(k * 0.9, a2, ya + 4.05, ya + 4.3, 0.52, 0.03, light);
      }
    }
    G.H(0, 0, 3.4, D - 0.2, y0 + 4.85, 0.45, GREY_TILE, { over: 0.25, segs: 2, flare: 0, fascia: 0.08, fasciaCol: OLD_CAP, hips: false, horns: false, glazed: false, ridgeCol: shade(GREY_TILE, 0.6) });
    S.kind = KIND.MASONRY;
    for (const sg of [-1, 1]) {
      G.B(sg * 2.2, 0, y0 + 4.4, y0 + 4.72, 0.2, 0.2, OCHRE_OLD); // finials on the shoulders
      G.B(sg * 1.1, 0, y0 + 5.2, y0 + 5.45, 0.13, 0.13, shade(GREY_TILE, 0.6)); // and at the ends of the cap's ridge
    }
  }

  // ---- the half-moon lawn and its stone kerb, between Tiền Bình Phong and Thọ Chỉ ----
  S.kind = KIND.PLAIN;
  for (const ring of LAWNS) S.prism(ring.map(([u, v]) => P(u, v)), y0 - 0.05, y0 + 0.1, shade(LAWN, 0.8), LAWN, { topKind: KIND.GROUND });
  S.kind = KIND.MASONRY;
  for (let i = 0; i + 1 < MOON.length; i++) {
    const a = MOON[i], b = MOON[i + 1];
    if (a[1] < 41.8 && b[1] < 41.8) continue; // on the brick court
    if (a[0] > -0.6 && a[0] < 2.6 || b[0] > -0.6 && b[0] < 2.6) {
      // the stone way crosses here: stop the kerb at its edges
      const e = a[0] < b[0] ? [-0.6, 2.6] : [2.6, -0.6];
      const cutAt = (x): [number, number] => [x, a[1] + ((x - a[0]) / (b[0] - a[0])) * (b[1] - a[1])];
      const parts = [];
      if ((a[0] - e[0]) * (b[0] - e[0]) < 0) parts.push([a, cutAt(e[0])]);
      if ((a[0] - e[1]) * (b[0] - e[1]) < 0) parts.push([cutAt(e[1]), b]);
      for (const [p, q] of parts) kerb(p, q);
      continue;
    }
    kerb(a, b);
  }
  function kerb(a, b) {
    const m = P((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    S.box(m[0], m[1], y0 - 0.1, y0 + 0.22, len + 0.2, 0.25, ANG + Math.atan2(b[1] - a[1], b[0] - a[0]), shade(STONE, 1.05));
  }

  // ---- trees, handed to the shared tree builder (data.trees: x, z in decimetres, size in tenths, kind) ----
  if (Array.isArray(data.trees)) {
    for (const [u, v, r] of [...TREES, [...COURT_TREE, 2.2]]) {
      const q = P(u, v);
      data.trees.push(Math.round(q[0] * 10), Math.round(q[1] * 10), Math.max(8, Math.min(15, Math.round((r / 2.4) * 10))), 0);
    }
  }

  // ---- the walls ----
  S.base = 0;
  for (const w of WALLS) fence(S, w.map(([u, v]) => P(u, v)), STYLE, { closed: false });
  for (const w of INNER_WALLS) fence(S, w.map(([u, v]) => P(u, v)), INNER, { closed: false });
  S.kind = KIND.PLAIN;
  S.base = 0;
}
