import { KIND, hex, shade } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { fence } from '../enclosure.js';

// ---- Quốc Tử Giám, the Nguyễn imperial academy, inside the Citadel (moved here in 1908) ----
//
// The block between Lê Trực (north-west), Đinh Tiên Hoàng (north-east), Đoàn Thị Điểm (south-west) and the lawns
// along đường 23 Tháng 8 (south-east, the address: 1 đường 23 Tháng 8). Sources (docs/places/quoctugiam.md):
//  - vi.wikipedia.org/wiki/Quốc_Tử_Giám_(Huế): moved into the Citadel 1908; wall from 1848 with two small side gates.
//  - kienthuc.net.vn (truong-quoc-tu-giam-cua-co-do-hue-gio-ra-sao-987623): Di Luân Đường has two storeys; the
//    lower a double house (3 gian 2 chái joined to a 1-gian house), the upper a square 1 gian 4 chái, in the
//    "đường + các" manner of Thái Bình Lâu; two-tier roof of yellow-glazed yin-yang tiles; each of the four faces
//    has three flights of five steps, the middle flight on the front and back wider, with dragon strings; a tam quan
//    at the foot of a wide court; two long side halls (Học tả, Học hữu) built after the move, colonial with
//    Vietnamese decoration.
//  - baovanhoa.vn (ha-giai-de-tu-bo-di-tich-truong-hoc-duoi-trieu-nguyen-222443, song-lai-khong-gian-khoa-cu-xua-
//    122172): Di Luân Đường > 574 m²; Học halls > 1,190 m² together, lime-washed with timber doors; Giám sinh halls
//    309.6 / 308.5 m², light-yellow lime; kitchen, Kiều gia houses, a guard house, the shelter over the Huỳnh Tự Thư
//    Thanh stele in front of Di Luân Đường; court > 4,153 m².
//  - OpenStreetMap: precinct (way 531031518), Di Luân Đường (239445966), the Học halls (617523830, 239448810), the
//    other halls (239448809/11/12, 239448806, 239448804/05/07/08). The city survey reads the hall at 9.5 m.
// Estimated: the split between front and main house, eave and storey heights, the tam quan's form, the side halls'
// roofs and verandahs, which outbuilding is which, the wall's height. The site is being restored (2025-2029, parts
// taken down in 2026); the model shows the buildings whole, as the restoration rebuilds them.

// Di Luân Đường's frame: centre, u across the front (north-east), v toward the front (south-east)
const C = [-684.7, -193.2], U = [0.8006, -0.5992];
const P = (u, v) => [C[0] + u * U[0] - v * U[1], C[1] + u * U[1] + v * U[0]];
const ANG = Math.atan2(U[1], U[0]);

// OSM outlines in the hall frame [u0, u1, v0, v1] (all are rectangles square to the hall)
const HOC = [[38.4, 53.9, -2.7, 39.3], [-50.4, -38.2, -1.0, 41.4]]; // Học tả (east), Học hữu (west)
const GIAMSINH = [[24.3, 52.7, -23.4, -11.7], [54.0, 84.7, -22.6, -11.4]];
const OTHER = [
  [73.1, 84.7, -9.9, 38.0], // long hall along Đinh Tiên Hoàng
  [-72.0, -51.9, 2.2, 14.6], [-75.3, -51.8, -10.0, -2.5], [-83.0, -75.3, 0.9, 10.9], [-83.3, -74.4, 15.0, 40.4],
];
// the L-shaped hall behind the west Học hall (way 239448812), as two rectangles
const ELL = [[-49.5, -24.2, -21.7, -9.9], [-48.0, -40.3, -10.0, -2.0]];
// the precinct (way 531031518), drawn 2.5 m inside the mapped line so the wall keeps off the pavements
const PARK = [[-631.4, -272.4], [-583.9, -205.7], [-661.1, -151.9], [-727.9, -103.9], [-776.5, -170.4]];
const GATE_V = 46.0;

const TILE = PAL.imperialRoof, RIDGE = hex('#f1d77a'), LAC = PAL.lacquer, GOLD = hex('#d9b04a');
const STONE = PAL.stone, BRICK = hex('#a46e58'), DARK = hex('#3a2420');
const TERRA = hex('#9a5a3e'), LIME = hex('#f1ead8'), YLIME = hex('#ecd38c'), WOOD = hex('#5e3b26');
const WALL = { h: 2.4, plinth: 2.4, rail: false, t: 0.45, every: 5.0, postW: 0.7, postUp: 0.25, wall: hex('#d9bb72'), cap: hex('#b3712f'), iron: null, pierW: 1.1, pierUp: 1.2 };
const gY = (x, z) => LAND_Y + rise(x, z);

export const id = 'quoctugiam';

export function build({ S }) {
  const y0 = gY(C[0], C[1]);
  const box = (u, v, ya, yb, w, d, col, o) => { const q = P(u, v); S.box(q[0], q[1], ya, yb, w, d, ANG, col, o); };
  // (the ridge runs along the longer side: a deep plan is handed over turned a quarter)
  const hip = (u, v, w, d, ya, h, col, o) => { const q = P(u, v), t = d > w; S.hip(q[0], q[1], t ? d : w, t ? w : d, t ? ANG + Math.PI / 2 : ANG, ya, h, col, { flare: 0.5, fascia: 0.26, fasciaCol: shade(LAC, 0.7), hips: true, glazed: true, segs: 4, ...o }); };
  const cyl = (u, v, ya, yb, r0, r1, n, col, o) => { const q = P(u, v); S.cyl(q[0], q[1], ya, yb, r0, r1, n, col, { rot: ANG, ...o }); };
  S.base = y0 - LAND_Y;

  // ---- court: brick apron round the hall, a brick walk on the axis to the tam quan ----
  S.kind = KIND.MASONRY;
  const paved0 = S.n;
  box(0, 0, y0 - 0.2, y0 + 0.22, 26, 33, shade(BRICK, 0.92), { topKind: KIND.ROAD });
  box(0, (16.5 + GATE_V) / 2, y0 - 0.2, y0 + 0.25, 5.0, GATE_V - 16.5, BRICK, { topKind: KIND.ROAD });
  (S.paved = S.paved || []).push([paved0, S.n]); // brick paving: no trees, no houses (src/geo/city.js coverOf)
  box(-38.2 + 3.0, 20, y0 - 0.2, y0 + 0.08, 1.6, 40, shade(BRICK, 0.95)); // walks along the side halls' fronts
  box(38.4 - 3.0, 20, y0 - 0.2, y0 + 0.08, 1.6, 40, shade(BRICK, 0.95));
  box(0, 39.5, y0 - 0.2, y0 + 0.08, 72, 1.6, shade(BRICK, 0.95));

  diLuanDuong(S, box, hip, cyl, y0);

  // ---- the Huỳnh Tự Thư Thanh stele (Thiệu Trị's poem) under its small shelter, in front of the hall ----
  {
    const v = 21.5;
    S.kind = KIND.MASONRY;
    box(0, v, y0, y0 + 0.35, 4.0, 4.0, STONE, { topKind: KIND.ROAD });
    box(0, v, y0 + 0.35, y0 + 0.75, 1.5, 0.9, shade(STONE, 0.9));
    box(0, v, y0 + 0.75, y0 + 2.45, 1.1, 0.26, shade(STONE, 0.78), { top: shade(STONE, 0.7) });
    S.kind = KIND.PLAIN;
    box(0, v, y0 + 2.45, y0 + 2.7, 1.25, 0.34, shade(STONE, 0.75), { taper: 0.7 });
    for (const a of [-1.6, 1.6]) for (const b of [-1.6, 1.6]) cyl(a, v + b, y0 + 0.35, y0 + 3.0, 0.14, 0.13, 6, LAC, { cap: false });
    S.kind = KIND.TIMBER;
    box(0, v, y0 + 2.9, y0 + 3.15, 3.6, 3.6, shade(LAC, 0.75));
    hip(0, v, 3.4, 3.4, y0 + 3.15, 1.5, TILE, { over: 0.7, ridgeCol: RIDGE, segs: 3 });
  }

  // ---- the long side halls ----
  S.kind = KIND.CIVIC;
  for (const r of HOC) hall(S, r, LIME, TERRA, 4.3, 2.6, true);
  for (const r of GIAMSINH) hall(S, r, YLIME, TERRA, 3.8, 2.3, false);
  for (const r of OTHER) hall(S, r, YLIME, TERRA, 3.4, 2.0, false);
  for (const r of ELL) hall(S, r, YLIME, TERRA, 3.4, 2.0, false);

  // ---- the tam quan on the axis at the foot of the court ----
  {
    const yg = gY(...P(0, GATE_V));
    S.base = yg - LAND_Y;
    const OCH = hex('#e2c271');
    S.kind = KIND.MASONRY;
    box(0, GATE_V, yg - 0.3, yg + 0.25, 13.0, 4.2, STONE, { topKind: KIND.ROAD });
    const yb = yg + 0.25;
    for (const s of [-1, 1]) {
      S.kind = KIND.MASONRY;
      box(s * 4.3, GATE_V, yb, yb + 3.4, 3.6, 2.4, OCH, { top: shade(TILE, 0.8) });
      S.kind = KIND.PLAIN;
      box(s * 4.3, GATE_V, yb, yb + 2.3, 1.4, 2.48, DARK);
      hip(s * 4.3, GATE_V, 3.6, 2.4, yb + 3.4, 0.9, TILE, { over: 0.5, flare: 0.3, ridgeCol: RIDGE, segs: 3 });
      // a pillar at each end, a lantern finial on top
      S.kind = KIND.MASONRY;
      box(s * 6.4, GATE_V, yb, yb + 5.2, 0.8, 0.8, OCH, { top: GOLD });
      cyl(s * 6.4, GATE_V, yb + 5.2, yb + 5.8, 0.35, 0.15, 6, shade(OCH, 0.9));
    }
    S.kind = KIND.MASONRY;
    box(0, GATE_V, yb, yb + 4.6, 5.0, 2.6, OCH, { top: shade(TILE, 0.8) });
    S.kind = KIND.PLAIN;
    box(0, GATE_V, yb, yb + 3.0, 2.2, 2.68, DARK);
    box(0, GATE_V, yb + 3.3, yb + 4.0, 2.4, 2.7, GOLD); // name board 國子監
    S.kind = KIND.MASONRY;
    box(0, GATE_V, yb + 4.6, yb + 5.2, 3.4, 1.9, OCH);
    hip(0, GATE_V, 3.4, 1.9, yb + 5.2, 1.2, TILE, { over: 0.6, ridgeCol: RIDGE, segs: 3 });
    hip(0, GATE_V, 5.0, 2.6, yb + 4.6, 0.6, TILE, { over: 0.6, flare: 0.3, segs: 3 });
  }

  // ---- the precinct wall, open at the tam quan ----
  S.base = 0;
  const ring = inset(PARK, 2.5);
  const g = P(0, GATE_V);
  fence(S, ring, WALL, { closed: true, openings: [[g[0], g[1], 7.0]] });
  S.kind = KIND.PLAIN;
  S.base = 0;

  // ---- side halls: lime walls, timber doors along the court side, a tiled hip roof ----
  function hall(S, [u0, u1, v0, v1], wall, roof, wh, rh, verandah) {
    const u = (u0 + u1) / 2, v = (v0 + v1) / 2, w = u1 - u0, d = v1 - v0;
    const yg = gY(...P(u, v));
    S.base = yg - LAND_Y;
    const yp = yg + 0.45, ins = 0.9;
    const kind = S.kind;
    S.kind = KIND.MASONRY;
    box(u, v, yg - 0.3, yp, w - 0.3, d - 0.3, shade(STONE, 0.95), { topKind: KIND.ROAD });
    S.kind = kind;
    const bw = w - 2 * ins, bd = d - 2 * ins;
    box(u, v, yp, yp + wh, bw, bd, wall, { top: shade(roof, 0.8) });
    // openings: doors on the long sides, every ~3.6 m
    S.kind = KIND.PLAIN;
    const long = bw >= bd, L = long ? bw : bd, n = Math.max(2, Math.round(L / 3.6));
    for (let k = 0; k < n; k++) {
      const t = -L / 2 + (k + 0.5) * (L / n);
      for (const s of [-1, 1]) {
        if (long) box(u + t, v + s * (bd / 2 + 0.02), yp, yp + wh * 0.62, 1.3, 0.06, WOOD);
        else box(u + s * (bw / 2 + 0.02), v + t, yp, yp + wh * 0.62, 0.06, 1.3, WOOD);
      }
    }
    // a band of moulding under the eave (the "Vietnamese decoration" on the colonial halls)
    box(u, v, yp + wh - 0.45, yp + wh - 0.2, bw + 0.08, bd + 0.08, shade(wall, 0.85));
    if (verandah) {
      // the Học halls: a deep eave on columns along their court side
      const vu = u0 > 0 ? u0 + 0.4 : u1 - 0.4;
      for (let k = 0; k <= n; k++) cyl(vu, v - bd / 2 + (k * bd) / n, yp, yp + wh, 0.16, 0.16, 6, LIME, { cap: false });
    }
    S.kind = KIND.TILE;
    hip(u, v, w - 0.2, d - 0.2, yp + wh, rh, roof, { flare: 0.15, over: 0.3, fascia: 0.22, fasciaCol: shade(wall, 0.8), ridgeCol: shade(roof, 1.15), glazed: false, segs: 3 });
    S.kind = kind;
  }
}

// ---- Di Luân Đường: two storeys, a double house below and a square pavilion above, yellow-glazed roofs ----
function diLuanDuong(S, box, hip, cyl, y0) {
  // OSM plan 20.4 m (front) x 26.9 m (deep); five steps up to the floor
  const W = 20.4, D = 26.9, pt = 0.8, yp = y0 + pt;
  S.kind = KIND.MASONRY;
  box(0, 0, y0 - 0.3, yp, W - 0.8, D - 0.8, STONE, { taper: 0.99, topKind: KIND.ROAD });
  // three flights of five steps on each face; the middle ones front and back wider, with dragon strings
  const flight = (u, v, w, dirU, dirV, dragons) => {
    for (let k = 1; k <= 5; k++) {
      const o = 0.3 * (k - 0.5);
      const yt = yp - (pt / 5) * k;
      if (dirV) box(u, v + dirV * o, y0 - 0.2, yt, w, 0.3, shade(STONE, 1.05), { topKind: KIND.ROAD });
      else box(u + dirU * o, v, y0 - 0.2, yt, 0.3, w, shade(STONE, 1.05), { topKind: KIND.ROAD });
    }
    if (dragons) for (const s of [-1, 1]) {
      const a = dirV ? [u + s * (w / 2 + 0.2), v] : [u, v + s * (w / 2 + 0.2)];
      const b = dirV ? [a[0], v + dirV * 1.6] : [u + dirU * 1.6, a[1]];
      const qa = P2(a), qb = P2(b);
      S.kind = KIND.MASONRY;
      S.beam([qa[0], yp + 0.25, qa[1]], [qb[0], y0 + 0.3, qb[1]], 0.36, 0.5, shade(STONE, 0.92));
    }
  };
  const P2 = ([u, v]) => [C[0] + u * U[0] - v * U[1], C[1] + u * U[1] + v * U[0]];
  for (const s of [-1, 1]) {
    const ve = s * (D - 0.8) / 2;
    flight(0, ve, 4.2, 0, s, true);
    flight(-6.4, ve, 2.4, 0, s, false);
    flight(6.4, ve, 2.4, 0, s, false);
    const ue = s * (W - 0.8) / 2;
    flight(ue, 0, 2.4, s, 0, false);
    flight(ue, -7.5, 2.0, s, 0, false);
    flight(ue, 7.5, 2.0, s, 0, false);
  }

  // lower storey: the rear main house (3 gian 2 chái) and the 1-gian front house, under one deep plan
  const yE = yp + 3.4; // lower eave
  S.kind = KIND.TIMBER;
  box(0, -2.8, yp, yE, 16.6, 15.6, shade(LAC, 0.86), { top: shade(TILE, 0.8) });
  box(0, 8.0, yp, yE - 0.3, 14.0, 6.0, shade(LAC, 0.86), { top: shade(TILE, 0.8) });
  // the verandah columns all round the main house
  const bay = 16.6 / 5;
  for (let i = 0; i <= 5; i++) for (const v of [-11.6, 5.6]) cyl(-8.3 + i * bay + (i === 0 ? 0.6 : i === 5 ? -0.6 : 0), v, yp, yE, 0.2, 0.18, 7, LAC, { cap: false });
  // doors: five bays on the front house's face, gilt transoms
  S.kind = KIND.PLAIN;
  for (let i = -2; i <= 2; i++) {
    box(i * 2.7, 11.03, yp, yp + 2.3, 2.2, 0.08, shade(LAC, 0.6));
    box(i * 2.7, 11.04, yp + 2.35, yp + 2.75, 2.3, 0.08, GOLD);
  }
  for (let i = -2; i <= 2; i++) box(i * 3.2, -10.63, yp, yp + 2.3, 2.6, 0.08, shade(LAC, 0.6));
  for (const s of [-1, 1]) for (let j = -2; j <= 2; j++) box(s * 8.33, -2.8 + j * 3.0, yp, yp + 2.3, 0.08, 2.4, shade(LAC, 0.6));

  // lower roofs: the skirt over the main house (plain tiles on the east and west faces in the record; drawn in the
  // same yellow, a shade darker) and the front house's own roof
  S.kind = KIND.PLAIN;
  hip(0, -2.8, 16.6, 15.6, yE, 1.6, shade(TILE, 0.92), { over: 1.6, flare: 0.4 });
  hip(0, 8.2, 14.0, 6.4, yE - 0.3, 1.5, TILE, { over: 1.4, ridgeCol: RIDGE });
  S.kind = KIND.PLAIN;
  box(0, 11.9, yE - 0.55, yE - 0.3, 14.0, 1.6, shade(LAC, 0.45), { bottom: true });

  // the cổ diêm: a frieze between the roofs with panels of glazed shard mosaic, then the upper storey
  const yU = yE + 1.2, yU2 = yU + 1.9;
  S.kind = KIND.TIMBER;
  box(0, -2.8, yE + 0.6, yU, 11.6, 11.6, hex('#e8dcc0'));
  S.kind = KIND.PLAIN;
  const panels = [hex('#3f7a6a'), hex('#c8a24a'), hex('#4f6fa0')];
  for (let i = -2; i <= 2; i++) {
    box(i * 2.2, -2.8 + 5.83, yE + 0.75, yU - 0.12, 1.4, 0.06, panels[(i + 3) % 3]);
    box(i * 2.2, -2.8 - 5.83, yE + 0.75, yU - 0.12, 1.4, 0.06, panels[(i + 3) % 3]);
    box(5.83, -2.8 + i * 2.2, yE + 0.75, yU - 0.12, 0.06, 1.4, panels[(i + 3) % 3]);
    box(-5.83, -2.8 + i * 2.2, yE + 0.75, yU - 0.12, 0.06, 1.4, panels[(i + 3) % 3]);
  }
  // upper storey: square, one bay and four chái, windows on every face
  S.kind = KIND.TIMBER;
  box(0, -2.8, yU, yU2, 10.4, 10.4, shade(LAC, 0.86), { top: shade(TILE, 0.8) });
  S.kind = KIND.PLAIN;
  for (let i = -1; i <= 1; i++) {
    box(i * 3.0, -2.8 + 5.22, yU + 0.3, yU2 - 0.35, 2.2, 0.06, shade(LAC, 0.58));
    box(i * 3.0, -2.8 - 5.22, yU + 0.3, yU2 - 0.35, 2.2, 0.06, shade(LAC, 0.58));
    box(5.22, -2.8 + i * 3.0, yU + 0.3, yU2 - 0.35, 0.06, 2.2, shade(LAC, 0.58));
    box(-5.22, -2.8 + i * 3.0, yU + 0.3, yU2 - 0.35, 0.06, 2.2, shade(LAC, 0.58));
  }
  box(0, -2.8 + 5.25, yU2 - 0.3, yU2 + 0.2, 1.8, 0.1, GOLD); // the name board 彝倫堂
  // upper roof: hip in yellow-glazed yin-yang tiles, ridge 9.5 m over the court (city survey)
  const top = y0 + 9.5 - 0.5;
  hip(0, -2.8, 10.4, 10.4, yU2, top - yU2, TILE, { over: 1.5, ridgeCol: RIDGE });
  // ridge ornament: a gourd on the peak
  cyl(0, -2.8, top - 0.1, top + 0.5, 0.3, 0.12, 8, RIDGE);
}

// shrink a convex ring by d metres (edges moved in, corners re-intersected)
function inset(ring, d) {
  const n = ring.length, a = ring.reduce((s, p, i) => { const q = ring[(i + 1) % n]; return s + p[0] * q[1] - q[0] * p[1]; }, 0);
  const sg = a > 0 ? 1 : -1;
  const lines = ring.map((p, i) => {
    const q = ring[(i + 1) % n], ex = q[0] - p[0], ez = q[1] - p[1], l = Math.hypot(ex, ez);
    const nx = (-ez / l) * sg, nz = (ex / l) * sg; // inward normal
    return [[p[0] + nx * d, p[1] + nz * d], [ex, ez]];
  });
  return lines.map((L1, i) => {
    const L0 = lines[(i + n - 1) % n];
    const [[px, pz], [dx, dz]] = L0, [[qx, qz], [ex, ez]] = L1;
    const den = dx * ez - dz * ex;
    if (Math.abs(den) < 1e-9) return [qx, qz];
    const t = ((qx - px) * ez - (qz - pz) * ex) / den;
    return [px + dx * t, pz + dz * t];
  });
}
