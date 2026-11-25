import { KIND, hex, shade } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { offStreets } from '../enclosure.ts';
import { flag } from '../anim.ts';

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
// Street View (car panos, 2024-25) settled the front gate: an open post-and-lintel gate of four cream square pillars,
// the inner pair taller, joined by thin beams, a flag on the west inner pillar, nothing solid between them (the stele
// shelter and the hall are seen through it from đường 23 Tháng 8). Estimated: the split between front and main
// house, eave and storey heights, the gate's exact spacing and heights, the side halls' roofs and verandahs, which outbuilding is which, the wall's height. The site is being restored (2025-2029, parts
// taken down in 2026); the model shows the buildings whole, as the restoration rebuilds them.

// Di Luân Đường's frame: centre, u across the front (north-east), v toward the front (south-east)
const C = [-684.7, -193.2], U = [0.8006, -0.5992];
const P = (u, v): [number, number] => [C[0] + u * U[0] - v * U[1], C[1] + u * U[1] + v * U[0]];
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
// not in OSM, placed from the satellite (sat-z19/z20): a red-tiled house on the Lê Trực side north of the Giám sinh
// hall and a pale-roofed hall north-west of Di Luân Đường, both against the Lê Trực balustrade. The pale hall's east
// end is set by the car pano on Lê Trực (sv-lt-nw: lawn up to u -15; the satellite's roof reads 5 m further east)
const UNMAPPED = [[10.0, 23.5, -30.5, -20.5], [-26.0, -15.0, -31.5, -22.0]];
// and the row of low old houses, tile and sheet roofs, standing a metre behind the Đoàn Thị Điểm balustrade north of
// the corner hall (sv-dtd-n): [u0, u1, v0, v1, eave, roof colour]
const ROW = [[-84.2, -78.4, -33.0, -24.6, 2.0, hex('#5d5f5c')], [-84.2, -77.8, -24.4, -17.4, 2.3, hex('#523c32')], [-84.2, -78.6, -17.2, -10.6, 2.1, hex('#686a66')]];
// the precinct (way 531031518), drawn 2.5 m inside the mapped line so the wall keeps off the pavements
const PARK = [[-631.4, -272.4], [-583.9, -205.7], [-661.1, -151.9], [-727.9, -103.9], [-776.5, -170.4]];
const GATE_V = 46.0;

const TILE = hex('#a85b3e'), RIDGE = hex('#dfd2b4'), LAC = PAL.lacquer, GOLD = hex('#d9b04a');
const STONE = PAL.stone, BRICK = hex('#b26c52'), DARK = hex('#3a2420');
const TERRA = hex('#6e4e40'), LIME = hex('#f1ead8'), YLIME = hex('#ecd38c'), WOOD = hex('#5e3b26');
// the boundary (Street View, 2024-25): a low cement balustrade, a row of oval piercings between a plinth and a coping,
// piers with caps every few metres, all grey and dark-stained; on Lê Trực a scrolled iron railing stands on it with an
// open round thọ (壽) roundel in each bay. Plain cement (KIND.PLAIN): the masonry shader's brick courses and green-
// yellow moss turned the grey tan under the scene's warm light.
const BAL = { h: 1.1, every: 3.4, pierW: 0.42, pierUp: 0.22, col: hex('#8f9aa0'), cap: hex('#78828a'), foot: hex('#687176'), hole: hex('#363c40') };
const IRON = { h: 1.05, col: hex('#23262a') };
const GATE = hex('#ebe3cc'); // the cream lime of the gate pillars
const gY = (x, z) => LAND_Y + rise(x, z);

export const id = 'quoctugiam';

export function build({ data, S, group }) {
  const y0 = gY(C[0], C[1]);
  const box = (u, v, ya, yb, w, d, col, o?) => { const q = P(u, v); S.box(q[0], q[1], ya, yb, w, d, ANG, col, o); };
  // (the ridge runs along the longer side: a deep plan is handed over turned a quarter)
  const hip = (u, v, w, d, ya, h, col, o?) => { const q = P(u, v), t = d > w; S.hip(q[0], q[1], t ? d : w, t ? w : d, t ? ANG + Math.PI / 2 : ANG, ya, h, col, { flare: 0.5, fascia: 0.26, fasciaCol: shade(LAC, 0.7), hips: true, glazed: false, segs: 4, ...o }); };
  const cyl = (u, v, ya, yb, r0, r1, n, col, o?) => { const q = P(u, v); S.cyl(q[0], q[1], ya, yb, r0, r1, n, col, { rot: ANG, ...o }); };
  S.base = y0 - LAND_Y;

  // ---- court: wide Bát Tràng brick apron round the hall and broad red-brick approach to the gate (as in the photo) ----
  S.kind = KIND.MASONRY;
  const paved0 = S.n;
  box(0, 0, y0 - 0.2, y0 + 0.22, 32, 36, shade(BRICK, 0.94), { topKind: KIND.ROAD });
  box(0, (18.0 + GATE_V) / 2, y0 - 0.2, y0 + 0.25, 11.0, GATE_V - 18.0, BRICK, { topKind: KIND.ROAD });
  (S.paved = S.paved || []).push([paved0, S.n]); // brick paving: no trees, no houses (src/geo/city.js coverOf)
  // shady courtyard trees flanking the broad brick walk, framing Di Luân Đường as in the reference photo
  if (Array.isArray(data.trees)) {
    for (const [u, v, sc] of ([[-12, 26, 12], [12, 26, 12], [-13, 35, 13], [13, 35, 13], [-24, 18, 12], [24, 18, 12], [-24, 34, 11], [24, 34, 11], [-22, -16, 12], [22, -16, 12]] as any[])) {
      const q = P(u, v);
      data.trees.push(Math.round(q[0] * 10), Math.round(q[1] * 10), sc, 4);
    }
  }
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
  for (const r of HOC as any[]) hall(S, r, LIME, TERRA, 4.3, 2.6, true);
  for (const r of GIAMSINH as any[]) hall(S, r, YLIME, TERRA, 3.8, 2.3, false);
  // the halls along Đoàn Thị Điểm end in gables (sv-dtd-sw); the rest have plain hips
  for (const r of OTHER as any[]) hall(S, r, YLIME, TERRA, 3.4, 2.0, false, r[1] < -74);
  for (const r of ELL as any[]) hall(S, r, YLIME, TERRA, 3.4, 2.0, false);
  hall(S, UNMAPPED[0] as any, YLIME, hex('#7a4634'), 3.3, 2.0, false, true);
  hall(S, UNMAPPED[1] as any, LIME, hex('#a7a59c'), 3.6, 1.9, false);
  for (const [u0, u1, v0, v1, eave, roof] of ROW) hall(S, [u0, u1, v0, v1], shade(YLIME, 0.8), roof, eave, 1.0, false, true);

  // ---- the gate at the foot of the court: four cream pillars and thin lintels, open between them ----
  // (sv-hmb-s, from đường 23 Tháng 8 on the axis: the inner pair about 3.6 m, the outer pair lower, an open drive
  // between the inner pillars, a low see-through iron railing in the side bays, a flag on the west inner pillar)
  {
    const yg = gY(...P(0, GATE_V));
    S.base = yg - LAND_Y;
    const IN = 1.6, OUT = 4.4, hIn = 3.6, hOut = 2.7, wIn = 0.46, wOut = 0.4;
    S.kind = KIND.MASONRY;
    box(0, GATE_V, yg - 0.2, yg + 0.12, 2 * OUT + 0.8, 1.2, STONE, { topKind: KIND.ROAD }); // the threshold
    const yb = yg + 0.12;
    S.kind = KIND.PLAIN;
    for (const s of [-1, 1]) {
      for (const [o, h, w] of ([[IN, hIn, wIn], [OUT, hOut, wOut]] as any[])) {
        box(s * o, GATE_V, yb, yb + 0.35, w + 0.14, w + 0.14, shade(GATE, 0.82)); // base
        box(s * o, GATE_V, yb + 0.35, yb + h, w, w, GATE);
        box(s * o, GATE_V, yb + h, yb + h + 0.12, w + 0.16, w + 0.16, shade(GATE, 0.88)); // cap
        box(s * o, GATE_V, yb + h + 0.12, yb + h + 0.42, w * 0.55, w * 0.55, shade(GATE, 0.9), { taper: 0.4 }); // finial
      }
      // the side bays: a thin beam near the outer pillar's top, a low open iron railing below it
      const mu = s * (IN + OUT) / 2, bw = OUT - IN - (wIn + wOut) / 2;
      box(mu, GATE_V, yb + hOut - 0.32, yb + hOut - 0.12, bw, 0.18, shade(GATE, 0.9));
      box(mu, GATE_V, yb + 1.05, yb + 1.1, bw, 0.05, IRON.col);
      box(mu, GATE_V, yb + 0.12, yb + 0.17, bw, 0.05, IRON.col);
      for (let j = 1; j < 12; j++) box(mu - bw / 2 + (j * bw) / 12, GATE_V, yb, yb + 1.1, 0.035, 0.035, IRON.col);
    }
    // the lintels over the drive: two thin beams between the inner pillars
    for (const y of [hIn - 0.3, hIn - 0.85]) box(0, GATE_V, yb + y - 0.2, yb + y, 2 * IN - wIn, 0.2, shade(GATE, 0.92));
    // the flag on its pole over the west inner pillar
    const q = P(-IN, GATE_V);
    S.cyl(q[0], q[1], yb + hIn + 0.42, yb + hIn + 2.6, 0.035, 0.03, 5, hex('#cfcfc8'), { cap: false });
    flag(group, { at: [q[0], yb + hIn + 2.5, q[1]], w: 0.9, h: 0.6, look: 'vn', landmark: id }); // waves down-wind (anim.js)
  }

  // ---- the precinct boundary, open at the gate ----
  S.base = 0;
  const ring = offStreets(data, inset(PARK, 2.5)); // and off the street OSM draws along its east side
  balustrade(S, ring, P(0, GATE_V), 2 * 4.4 + 0.4); // the gap butts on the gate's outer pillars
  S.kind = KIND.PLAIN;
  S.base = 0;

  // ---- side halls: lime walls, timber doors along the court side, a tiled hip roof ----
  function hall(S, [u0, u1, v0, v1], wall, roof, wh, rh, verandah, gabled = false) {
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
    if (gabled) gable(u, v, w - 0.2, d - 0.2, yp + wh, rh, roof, wall);
    // straight colonial hips of dark weathered tile: no flare, no hip ridges, so no upturned corners
    else hip(u, v, w - 0.2, d - 0.2, yp + wh, rh, roof, { flare: 0, over: 0.35, fascia: 0.22, fasciaCol: shade(wall, 0.8), ridgeCol: shade(roof, 1.12), hips: false, glazed: false, segs: 1 });
    S.kind = kind;
  }

  // a straight gable roof along the longer side, verges 0.4 m past the end walls, the gable triangles in the wall colour
  function gable(u, v, w, d, ya, h, col, wall) {
    const t = d > w, L = (t ? d : w) / 2, B = (t ? w : d) / 2, o = 0.4;
    // (a, b): a along the ridge, b across it, in the hall frame
    const Q = (a, b, y) => { const [uu, vv] = t ? [u + b, v + a] : [u + a, v + b]; const q = P(uu, vv); return [q[0], y, q[1]]; };
    const ax = t ? [-U[1], U[0]] : U, bx = t ? U : [-U[1], U[0]];
    for (const s of [-1, 1]) {
      S.kind = KIND.TILE;
      S.quad(Q(-L - o, s * (B + o), ya - 0.15), Q(L + o, s * (B + o), ya - 0.15), Q(L + o, 0, ya + h), Q(-L - o, 0, ya + h), col, [bx[0] * s, 1, bx[1] * s]);
      S.kind = KIND.PLAIN;
      S.quad(Q(-L - o, s * (B + o), ya - 0.15), Q(L + o, s * (B + o), ya - 0.15), Q(L + o, s * (B + o), ya - 0.35), Q(-L - o, s * (B + o), ya - 0.35), shade(col, 0.6), [bx[0] * s, 0, bx[1] * s]);
      S.quad(Q(-L - o, s * (B + o), ya - 0.35), Q(L + o, s * (B + o), ya - 0.35), Q(L + o, 0, ya - 0.35), Q(-L - o, 0, ya - 0.35), shade(col, 0.45), [0, -1, 0]);
      // the gable end wall up to the roof
      S.kind = KIND.CIVIC;
      S.tri(Q(s * (L - 0.8), -(B - 0.8), ya), Q(s * (L - 0.8), B - 0.8, ya), Q(s * (L - 0.8), 0, ya + h - 0.05), wall, [ax[0] * s, 0, ax[1] * s]);
    }
    S.kind = KIND.PLAIN;
    S.beam(Q(-L - o, 0, ya + h + 0.08), Q(L + o, 0, ya + h + 0.08), 0.3, 0.22, shade(col, 1.1));
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
      const qa = P2(a as [number, number]), qb = P2(b as [number, number]);
      S.kind = KIND.MASONRY;
      S.beam([qa[0], yp + 0.25, qa[1]], [qb[0], y0 + 0.3, qb[1]], 0.36, 0.5, shade(STONE, 0.92));
    }
  };
  const P2 = ([u, v]): [number, number] => [C[0] + u * U[0] - v * U[1], C[1] + u * U[1] + v * U[0]];
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

  // lower storey: the rear main house (3 gian 2 chái) and the 1-gian front house, under one deep plan. The main
  // house's walls stand well inside its roof: an open verandah of dark timber columns runs round its back and sides
  // (sv-lt-nw, from Lê Trực), 2.3-2.6 m deep under the skirt roof's soffit.
  const yE = yp + 3.4; // lower eave
  const TIMB = hex('#4a2a20'), WALL = shade(LAC, 0.48);
  S.kind = KIND.TIMBER;
  box(0, -2.4, yp, yE, 12.0, 11.6, WALL, { top: shade(TILE, 0.8) }); // u ±6.0, v -8.2 .. 3.4
  box(0, 7.2, yp, yE - 0.3, 14.0, 7.6, WALL, { top: shade(TILE, 0.8) }); // the front house, v 3.4 .. 11.0
  // the verandah columns: a row along the back and one down each side, under the skirt roof's eave
  for (let i = 0; i <= 5; i++) cyl(-8.6 + i * 3.44, -11.4, yp, yE, 0.18, 0.16, 7, TIMB, { cap: false });
  for (const s of [-1, 1]) for (let j = 1; j <= 5; j++) cyl(s * 8.6, -11.4 + j * 3.2, yp, yE, 0.18, 0.16, 7, TIMB, { cap: false });
  // a tie beam over each row of columns
  box(0, -11.4, yE - 0.4, yE - 0.1, 17.6, 0.24, TIMB);
  for (const s of [-1, 1]) box(s * 8.6, -3.4, yE - 0.4, yE - 0.1, 0.24, 16.0, TIMB);
  // doors: five bays on the front house's face, gilt transoms
  S.kind = KIND.PLAIN;
  for (let i = -2; i <= 2; i++) {
    box(i * 2.7, 11.03, yp, yp + 2.3, 2.2, 0.08, shade(LAC, 0.4));
    box(i * 2.7, 11.04, yp + 2.35, yp + 2.75, 2.3, 0.08, GOLD);
  }
  for (let i = -1; i <= 1; i++) box(i * 3.4, -8.23, yp, yp + 2.3, 2.6, 0.08, shade(LAC, 0.4));
  for (const s of [-1, 1]) for (let j = -1; j <= 1; j++) box(s * 6.03, -2.4 + j * 3.4, yp, yp + 2.3, 0.08, 2.6, shade(LAC, 0.4));

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
  box(0, -2.8, yU, yU2, 10.4, 10.4, shade(LAC, 0.52), { top: shade(TILE, 0.8) });
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

// The precinct balustrade round a closed ring, with a gap of width gw at gate point g. The Lê Trực (north-west)
// side carries the iron railing seen from the street; the Đoàn Thị Điểm side is bare balustrade; the south-east and
// north-east sides are hidden behind trees in every view and drawn bare like the south-west.
function balustrade(S, ring, g, gw) {
  const keepKind = S.kind, keepBase = S.base;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n];
    const ex = b[0] - a[0], ez = b[1] - a[1], len = Math.hypot(ex, ez);
    if (len < 0.6) continue;
    const ang = Math.atan2(ez, ex), at = (f) => [a[0] + ex * f, a[1] + ez * f];
    // which side: the mid point in the hall frame (v < 0 behind the hall; a run along u is the north-west side)
    const m = at(0.5), du = (m[0] - C[0]) * U[0] + (m[1] - C[1]) * U[1], dv = -(m[0] - C[0]) * U[1] + (m[1] - C[1]) * U[0];
    const along = Math.abs(ex * U[0] + ez * U[1]) > Math.abs(-ex * U[1] + ez * U[0]);
    const rail = along && dv < 0 && Math.abs(du) < 120;
    // the gate gap
    const t = ((g[0] - a[0]) * ex + (g[1] - a[1]) * ez) / (len * len);
    const off = Math.abs((g[0] - a[0]) * ez - (g[1] - a[1]) * ex) / len;
    const runs = off < 3 && t > -0.1 && t < 1.1 ? [[0, t - gw / 2 / len], [t + gw / 2 / len, 1]] : [[0, 1]];
    for (const [r0, r1] of runs) {
      const rl = (r1 - r0) * len;
      if (rl < 0.6) continue;
      const nb = Math.max(1, Math.round(rl / BAL.every)), bl = rl / nb;
      for (let k = 0; k < nb; k++) {
        const p = at(r0 + ((r1 - r0) * k) / nb), q = at(r0 + ((r1 - r0) * (k + 1)) / nb);
        const mx = (p[0] + q[0]) / 2, mz = (p[1] + q[1]) / 2, y = Math.min(gY(...(p as [number, number])), gY(...(q as [number, number])));
        const w = bl - BAL.pierW;
        S.base = y - LAND_Y;
        S.kind = KIND.PLAIN;
        S.box(mx, mz, y - 0.3, y + 0.32, w + 0.02, 0.3, ang, BAL.foot, { top: BAL.cap }); // plinth, the darkest stain
        S.box(mx, mz, y + 0.32, y + BAL.h - 0.14, w, 0.12, ang, BAL.hole); // the pierced band, read as its shadow
        // the solid bits between piercings: three posts in each bay
        for (const f of [-0.42, -0.28, -0.14, 0, 0.14, 0.28, 0.42]) {
          const bx = mx + Math.cos(ang) * f * w, bz = mz + Math.sin(ang) * f * w;
          S.box(bx, bz, y + 0.32, y + BAL.h - 0.14, 0.08, 0.2, ang, BAL.col);
          S.box(bx, bz, y + 0.5, y + BAL.h - 0.32, 0.15, 0.2, ang, BAL.col); // the swell of a bottle baluster: oval piercings between
        }
        S.box(mx, mz, y + BAL.h - 0.14, y + BAL.h, w + 0.02, 0.32, ang, BAL.cap); // coping
        if (rail) {
          // see-through: a bottom and a top rail, upright bars every ~0.3 m, one open round thọ roundel mid-bay
          S.kind = KIND.PLAIN;
          const ca = Math.cos(ang), sa = Math.sin(ang), yb = y + BAL.h, yt = yb + IRON.h;
          S.box(mx, mz, yb + 0.08, yb + 0.14, w, 0.05, ang, IRON.col);
          S.box(mx, mz, yt - 0.07, yt, w, 0.07, ang, shade(IRON.col, 1.3));
          const nbar = Math.max(2, Math.round(w / 0.3));
          for (let j = 1; j < nbar; j++) {
            const f = -w / 2 + (j * w) / nbar;
            if (Math.abs(f) < 0.3) continue; // the roundel's place
            S.box(mx + ca * f, mz + sa * f, yb, yt - 0.04, 0.035, 0.035, ang, IRON.col);
          }
          // the roundel: an iron ring 0.5 m across, the stylised 壽 inside it as three bars and a stem, open between
          const R = 0.25, yc = yb + 0.52, pt = (a) => [mx + ca * R * Math.cos(a), yc + R * Math.sin(a), mz + sa * R * Math.cos(a)];
          for (let j = 0; j < 12; j++) S.beam(pt((j * Math.PI) / 6), pt(((j + 1) * Math.PI) / 6), 0.035, 0.04, IRON.col);
          for (const [dy, hw] of ([[0.12, 0.17], [0, 0.24], [-0.12, 0.17]] as any[])) S.box(mx, mz, yc + dy - 0.017, yc + dy + 0.017, 2 * hw, 0.035, ang, IRON.col);
          S.box(mx, mz, yc - R, yc + R, 0.035, 0.035, ang, IRON.col);
        }
        // a pier at the start of each bay and at the end of the run
        for (const o of k === nb - 1 ? [p, q] : [p]) {
          const yo = gY(...(o as [number, number])), top = yo + (rail ? BAL.h + IRON.h + 0.1 : BAL.h + BAL.pierUp);
          S.base = yo - LAND_Y;
          S.kind = KIND.PLAIN;
          S.box(o[0], o[1], yo - 0.3, top, BAL.pierW, BAL.pierW, ang, BAL.col, { top: BAL.cap });
          S.box(o[0], o[1], top, top + 0.12, BAL.pierW + 0.1, BAL.pierW + 0.1, ang, BAL.cap);
          S.box(o[0], o[1], top + 0.12, top + 0.32, BAL.pierW * 0.6, BAL.pierW * 0.6, ang, BAL.cap, { taper: 0.4 });
        }
      }
    }
  }
  S.kind = keepKind;
  S.base = keepBase;
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
