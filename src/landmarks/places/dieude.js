import * as THREE from 'three';
import { KIND, Buf, hex, shade, inRing } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { glowPoints, lightMaterial } from '../../geo/materials.js';
import { fence, roadsNear, FENCE } from '../enclosure.js';

// Quốc tự Diệu Đế, 102 Bạch Đằng, on the east bank of the Đông Ba canal facing the Citadel (founded 1844 by Thiệu Trị
// on his birthplace; most rows pulled down 1887; rebuilt smaller 1953; restoration from 2018, when the 350 m² main
// hall was moved back about 19 m). See docs/places/dieude.md for sources and what is estimated.
//
//
// The plan is read in a frame on the axis: a = metres from the entrance (OSM node 7199615582, where the axis footway
// 257257955 from Bạch Đằng meets the gate) back toward the hall (north-east), b = metres across (+b south-east,
// toward Diệu Đế). The precinct is the whole block between Bạch Đằng (a ≈ -10.6), Ngự Viên (b ≈ -50), Diệu Đế
// (b ≈ +46) and Tô Hiến Thành (a ≈ 123-127): about 1.1 ha, the "over 10,000 m²" of the sources. OSM maps the hall
// block (way 771244228: a 61-86, b ±14) and three roofs at the back of the block (the pagoda's own ranges: a
// double-roofed house in the north corner, a house in the south-east corner and a long range on Tô Hiến Thành),
// which this file draws itself, with the brown tiles the satellite and street views show. The gate with its upper
// storey, the octagonal bell and drum towers either side of it, the hexagonal bell and stele pavilions in the court,
// and the Đại Giác hall (three bays and two lean-to bays, five doors, ngói liệt tiles, twin dragons facing the moon on
// the ridge) follow the written descriptions; the hall's roof plan, the two small pavilions, the grove and the brick
// wall with its second entrance on Bạch Đằng follow the satellite and street views.
export const id = 'dieude';

const ANG = Math.atan2(-0.57775, 0.81621); // axis, gate → hall (bearing about 55°, the gate faces south-west)
const F = [Math.cos(ANG), Math.sin(ANG)], P = [-F[1], F[0]];
const O = [-213.3, -948.3]; // a = 0, b = 0
const W = (a, b) => [O[0] + F[0] * a + P[0] * b, O[1] + F[1] * a + P[1] * b];
const gY = (x, z) => LAND_Y + rise(x, z);
const ACROSS = ANG + Math.PI / 2; // a roof ridge running across the axis

const yellow = hex('#e2c271'), yellowD = hex('#c9a65a'), tile = hex('#9d4a33'), tileD = hex('#7f3a28'), trim = hex('#ece0c2');
const lacq = hex('#9e3426'), door = hex('#5b2a1d'), dark = hex('#2a211d'), stone = hex('#a49d8e'), stoneL = hex('#c2baa8');
const pave = hex('#c6bba3'), walk = hex('#ad9c80'), lawn = hex('#7f9752'), bronze = hex('#5d4a2c'), leaf = hex('#4f7337'), leafD = hex('#3f5f2d');
const bark = hex('#5a4634'), mosaic = hex('#5f9a8a');
const brown = hex('#6b4535'), brownD = hex('#553729'), redTile = hex('#a9503a'), lime = hex('#d8ccb2'), iron = hex('#80796e');
const moss = hex('#56603f'), verge = hex('#6c8a47'), grey = hex('#9b988f'), greyL = hex('#b3afa5'), screen = hex('#9b3a2c');
// the precinct wall: old brick, weathered, under a low coping (Street View)
const WALL = { ...FENCE.pagoda, h: 2.4, plinth: 2.4, every: 5.0, postW: 0.44, postUp: -0.1, wall: hex('#6a4a3c'), cap: hex('#5e564c'), pierW: 1.0, pierUp: 1.3, t: 0.42 };
// on Tô Hiến Thành, in front of the long range, the wall is lower brick under a red-painted screen (Street View)
const BACK = { ...WALL, rail: true, plinth: 1.25, h: 2.45, iron: screen, postW: 0.45 };

// the wall line in the frame, set from the satellite and the street views: along Bạch Đằng about 7 m in from the kerb
// (a footpath and a grass verge before it), along Ngự Viên about 5.5 m in, along Diệu Đế 1-2 m in, and along Tô
// Hiến Thành about 4 m in from the centre line, following the street's slight bend; the east corner is cut back
// where Tô Hiến Thành turns into Diệu Đế
const A0 = 1, B0 = -41.5, B1 = 42;
const BACKLINE = [[119.7, B0], [121.54, -15], [122.1, -6.9], [122.52, 15], [122.9, 34.5]];
const RING = [[A0, B0], ...BACKLINE, [117, B1], [A0, B1]];
const aBack = (b) => { for (let i = 0; i + 1 < BACKLINE.length; i++) { const [p, q] = [BACKLINE[i], BACKLINE[i + 1]]; if (b <= q[1]) return p[0] + ((q[0] - p[0]) * (b - p[1])) / (q[1] - p[1]); } return 122.9; };
const segD = (a, b, p, q) => { const dx = q[0] - p[0], db = q[1] - p[1], t = Math.max(0, Math.min(1, ((a - p[0]) * dx + (b - p[1]) * db) / (dx * dx + db * db))); return Math.hypot(a - p[0] - dx * t, b - p[1] - db * t); };
const ringD = (a, b) => Math.min(...RING.map((p, i) => segD(a, b, p, RING[(i + 1) % RING.length])));
const inside = (a, b, m = 0) => inRing(a, b, RING) && ringD(a, b) >= m;

// the roofs the court must leave alone, in the frame: [a0, a1, b0, b1] boxes and [a, b, r] discs (eaves included)
const BOXES = [[-1.6, 3.6, -8.4, 8.4], [61.0, 88.6, -14.6, 14.6], [83.9, 100.2, -41.2, -27.8], [83.9, 102.7, 25.8, 40.8], [101.4, 121.0, -22.5, 21.9]];
const DISCS = [[8.1, -12.4, 3.9], [8.1, 12.4, 3.9], [30, -15, 3.9], [30, 15, 3.9], [66.5, -19.5, 4.0], [35, -36.6, 4.0], [1, -25, 2.6], [122.2, 0, 3.2]];
const clearOf = (a, b, r) => BOXES.every(([a0, a1, b0, b1]) => Math.hypot(Math.max(a0 - a, 0, a - a1), Math.max(b0 - b, 0, b - b1)) > r)
  && DISCS.every(([u, v, R]) => Math.hypot(a - u, b - v) > r + R);

export function build({ data, S, group }) {
  const box = (a, b, y0, y1, la, lb, col, o = {}) => { const q = W(a, b); S.box(q[0], q[1], y0, y1, la, lb, ANG + (o.rot || 0), col, o); };
  const y0 = gY(...W(30, 0));
  S.base = y0 - LAND_Y;
  const lamps = [];
  const L = new Buf(128); // eave light strips after dark

  // ---- the walls round the block. Street View (Google, all four streets) shows old brick (gạch vồ) about 2.4 m high,
  // weathered dark red-brown, with trees leaning over it everywhere, running unbroken along Ngự Viên and Diệu Đế to the
  // corners; a second entrance between slim grey stone piers with ball finials on Bạch Đằng some 25 m north-west of
  // the main gate; on Tô Hiến Thành a low brick wall under a red screen and a small gate on the axis, its brick piers
  // green with moss. The gate itself and the piers drawn below stand in the wall line (solid), so the wall stops at them.
  const roads = roadsNear(data, W(55, 0), 200);
  const sq = (a, b, la, lb) => [W(a - la / 2, b - lb / 2), W(a + la / 2, b - lb / 2), W(a + la / 2, b + lb / 2), W(a - la / 2, b + lb / 2)];
  const sideP = [[A0, -26.75], [A0, -23.25]], backP = [[aBack(-2.1), -2.1], [aBack(2.1), 2.1]];
  const solid = [sq(1.0, 0, 3.4, 15.2), ...sideP.map(([a, b]) => sq(a, b, 0.7, 0.7)), ...backP.map(([a, b]) => sq(a, b, 1.1, 1.1))];
  const front = [[122.52, 15], [122.9, 34.5], [117, B1], [A0, B1], [A0, B0], [119.7, B0], [121.54, -15]];
  fence(S, front.map(([a, b]) => W(a, b)), WALL, { closed: false, roads, solid, openings: [[...W(A0, -25), 1.75]] });
  fence(S, [[121.54, -15], [122.1, -6.9], [122.52, 15]].map(([a, b]) => W(a, b)), BACK, { closed: false, roads, solid, openings: [[...W(aBack(0), 0), 2.1]] });
  for (const [a, b] of sideP) stonePier(S, W(a, b));
  for (const [a, b] of backP) mossPier(S, W(a, b));

  // ---- the court: under the trees almost everywhere, so mostly beaten earth and lawn; paved only along the axis and
  // before the hall. Laid in 4 m cells inside the wall that keep off the buildings at the back, raised a little and
  // marked paved so no infill house or stray tree lands in the court
  const p0 = S.n;
  const STEP = 4;
  const onB = (a, b) => BOXES.slice(2).some(([a0, a1, b0, b1]) => a > a0 + 0.5 && a < a1 - 0.5 && b > b0 + 0.5 && b < b1 - 0.5);
  for (let a = A0 + 0.3; a < 122.6; a += STEP) for (let b = B0 + 0.3; b < B1 - 0.3; b += STEP) {
    const a1 = a + STEP, b1 = Math.min(b + STEP, B1 - 0.3);
    const corners = [[a, b], [a1, b], [a1, b1], [a, b1]];
    if (!corners.every(([u, v]) => inside(u, v, 0.3)) || corners.some(([u, v]) => onB(u, v)) || onB((a + a1) / 2, (b + b1) / 2)) continue;
    const am = (a + a1) / 2, bm = Math.abs((b + b1) / 2);
    const paved = (am < 59 && bm < 7) || (am > 45 && am < 59 && bm < 15);
    S.kind = paved ? KIND.ROAD : KIND.GROUND;
    const v = corners.map(([u, w]) => { const q = W(u, w); return [q[0], gY(q[0], q[1]) + 0.24, q[1]]; });
    S.quad(v[0], v[3], v[2], v[1], paved ? pave : lawn, [0, 1, 0]);
  }
  // the axis walk from the gate to the hall steps, a shade darker
  S.kind = KIND.ROAD;
  box(31, 0, y0 - 0.2, y0 + 0.3, 56, 4.2, walk, { topKind: KIND.ROAD });
  // outside on Bạch Đằng: a grass verge along the foot of the wall between the footpath and the wall (Street View),
  // a paved path in to the second entrance
  S.kind = KIND.GROUND;
  for (const [b0, b1, col] of [[B0 + 0.3, -27.4, verge], [-27.4, -22.6, pave], [-22.6, -8.2, verge], [8.2, B1 - 0.3, verge]]) {
    const v = [[-2.4, b0], [A0 - 0.3, b0], [A0 - 0.3, b1], [-2.4, b1]].map(([u, w]) => { const q = W(u, w); return [q[0], gY(q[0], q[1]) + 0.16, q[1]]; });
    S.quad(v[0], v[3], v[2], v[1], col, [0, 1, 0]);
  }
  S.paved = [...(S.paved || []), [p0, S.n]];

  gate(S, box, lamps, L);
  for (const s of [-1, 1]) tower(S, W(8.1, s * 12.4), lamps);
  // the hexagonal pavilions of the court: the great bell (cast 1846) on the left, the stele of 1846 (1.9 m by 1.07 m)
  // on the right, as one faces the hall
  hexPavilion(S, W(30, 15), 'bell', lamps);
  hexPavilion(S, W(30, -15), 'stele', lamps);
  mainHall(S, box, lamps, L);
  backRanges(S, box, lamps);
  // two small roofed pavilions the satellite shows under the trees: one by the wall on Ngự Viên, one at the hall's
  // west corner, set askew to it
  smallPavilion(S, box, 35, -36.6, 4.6, 0, true);
  smallPavilion(S, box, 66.5, -19.5, 4.4, 0.56, false);
  // the bronze incense urn on the axis in front of the hall, and two rows of potted bonsai along the walk
  {
    const q = W(55, 0), g = gY(...q);
    S.kind = KIND.MASONRY;
    S.box(q[0], q[1], g, g + 0.7, 1.4, 1.4, ANG, stone, { top: stoneL });
    S.kind = KIND.PLAIN;
    S.cyl(q[0], q[1], g + 0.7, g + 1.5, 0.45, 0.6, 8, bronze);
    S.cyl(q[0], q[1], g + 1.5, g + 2.1, 0.5, 0.22, 8, bronze);
    for (let a = 14; a <= 50; a += 6) for (const s of [-1, 1]) {
      const p = W(a, s * 3.2), h = gY(...p);
      S.cyl(p[0], p[1], h + 0.2, h + 0.75, 0.35, 0.42, 6, hex('#6f5b4a'), { cap: false });
      S.cyl(p[0], p[1], h + 0.75, h + 1.55, 0.6, 0.15, 6, leaf);
    }
  }
  // the grove: from the air (Google satellite) old trees frame the precinct while keeping the main hall, gate,
  // bell/drum towers and central walk legible; planted via data.trees so foliage.js renders real instanced leafy
  // crowns instead of static low-poly blobs.
  if (Array.isArray(data.trees)) {
    const rnd = (i, j, k) => { const v = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453; return v - Math.floor(v); };
    const plant = (c, sc, kind = 1) => { data.trees.push(Math.round(c[0] * 10), Math.round(c[1] * 10), Math.max(7, Math.min(16, Math.round(sc * 10))), kind); };
    const G = 9.5;
    for (let i = 0; A0 + 3 + i * G < 121; i++) for (let j = 0; B0 + 3 + j * G < B1 - 2; j++) {
      const a = A0 + 3.5 + i * G + (rnd(i, j, 1) - 0.5) * 4.5;
      const b = B0 + 3.5 + j * G + (rnd(i, j, 2) - 0.5) * 4.5;
      // keep the front gate forecourt and central walk open so Phượng Môn and Đại Giác Hall read clearly
      if (!inside(a, b, 3.0) || (a < 62 && Math.abs(b) < 7.0) || (a < 14 && Math.abs(b) < 16)) continue;
      let r = 3.8 + rnd(i, j, 3) * 1.4;
      while (r > 2.6 && !clearOf(a, b, r)) r -= 0.4;
      if (!clearOf(a, b, r)) continue;
      const sc = 0.85 + rnd(i, j, 4) * 0.4;
      plant(W(a, b), sc, rnd(i, j, 5) < 0.55 ? 1 : 0);
    }
    // avenue shade trees flanking the central walk
    for (let a = 18; a <= 48; a += 10) for (const sb of [-1, 1]) {
      const b = sb * (7.2 + rnd(a, sb, 6) * 1.2);
      if (clearOf(a, b, 3.2)) plant(W(a, b), 1.0 + rnd(a, sb, 7) * 0.25, 4);
    }
    // banyan on the Bạch Đằng verge north-west of the gate
    plant(W(-1.7, -16.5), 1.35, 5);
  }
  S.kind = KIND.PLAIN;
  S.base = 0;

  // ---- after dark: red lanterns under the gate and tower eaves, the hall's eaves lit warm, lamps on the court
  const strip = lightMeshFrom(L, lightMaterial(0xffc987, 1.1));
  const pos = [], col = [];
  for (const [p, h, c] of lamps) { pos.push(p[0], h, p[1]); col.push(...c); }
  const pts = glowPoints(pos, col, 4);
  pts.userData.glow = true;
  for (const m of [strip, pts]) { m.userData.landmark = id; group.add(m); }
}

// ---- the gate on Bạch Đằng (Phượng Môn): three openings in a yellow masonry front, the middle one under a gate
// storey with its own two-tier roof, small tiled roofs over the side openings
function gate(S, box, lamps, L) {
  const a = 1.0, g = gY(...W(a, 0)), y1 = g + 0.3, D = 3.4, Wd = 15.2;
  S.base = g - LAND_Y;
  S.kind = KIND.MASONRY;
  box(a, 0, g - 0.3, y1, D + 1.2, Wd + 0.6, stone, { topKind: KIND.ROAD });
  S.kind = KIND.CIVIC;
  box(a, 0, y1, y1 + 4.4, D, Wd, yellow, { top: tileD });
  S.kind = KIND.PLAIN;
  box(a, 0, y1 + 4.1, y1 + 4.5, D + 0.4, Wd + 0.4, trim);
  // the openings (dark, seen through to the court) on both faces, with arched heads read as a lighter band
  for (const s of [-1, 1]) for (const [b, w, h] of [[0, 3.0, 3.6], [-4.8, 2.0, 2.8], [4.8, 2.0, 2.8]]) {
    box(a + s * (D / 2 + 0.01), b, y1, y1 + h, 0.06, w, dark);
    box(a + s * (D / 2 + 0.02), b, y1 + h, y1 + h + 0.25, 0.06, w + 0.4, trim);
  }
  // lacquered columns standing proud of the front, polychrome khảm sành sứ frieze panels, and the gold name board "Diệu Đế Quốc Tự"
  for (const b of [-6.6, -3.0, 3.0, 6.6]) { box(a - D / 2 - 0.25, b, y1, y1 + 4.1, 0.42, 0.42, lacq); }
  for (const s of [-1, 1]) {
    for (const b of [-4.8, 4.8]) box(a + s * (D / 2 + 0.05), b, y1 + 3.25, y1 + 3.85, 0.06, 2.2, mosaic);
    box(a + s * (D / 2 + 0.05), 0, y1 + 4.18, y1 + 4.42, 0.06, Wd - 1.2, hex('#2e6f78'));
  }
  box(a - D / 2 - 0.06, 0, y1 + 3.75, y1 + 4.1, 0.08, 2.6, hex('#3a2a1c'));
  box(a - D / 2 - 0.08, 0, y1 + 3.8, y1 + 4.05, 0.06, 2.2, hex('#d8b14a'));
  // twin carved trụ biểu lotus pillars flanking the Bạch Đằng entrance forecourt
  for (const s of [-1, 1]) {
    const pq = W(a - 3.0, s * 8.6), pg = gY(...pq);
    S.kind = KIND.MASONRY;
    S.box(pq[0], pq[1], pg - 0.2, pg + 0.6, 1.05, 1.05, ANG, stone, { top: stoneL });
    S.box(pq[0], pq[1], pg + 0.6, pg + 4.5, 0.68, 0.68, ANG, yellow, { top: trim });
    S.kind = KIND.PLAIN;
    S.box(pq[0], pq[1], pg + 1.2, pg + 3.9, 0.72, 0.36, ANG, mosaic);
    S.box(pq[0], pq[1], pg + 4.5, pg + 4.78, 0.88, 0.88, ANG, trim);
    S.cyl(pq[0], pq[1], pg + 4.78, pg + 5.18, 0.32, 0.42, 8, hex('#e5c158'));
    S.cyl(pq[0], pq[1], pg + 5.18, pg + 5.65, 0.38, 0.06, 8, hex('#e5c158'));
  }
  // small roofs over the side openings
  for (const s of [-1, 1]) {
    const q = W(a, s * 5.0);
    S.hip(q[0], q[1], 5.0, D + 0.4, ACROSS, y1 + 4.5, 1.0, tile, { flare: 0.35, over: 0.6, fascia: 0.16, fasciaCol: trim, ridgeCol: trim, hips: true, segs: 2 });
  }
  // the gate storey: a lacquered upper room with a gallery, under a two-tier roof
  const yu = y1 + 4.5, q = W(a, 0);
  S.kind = KIND.TIMBER;
  S.box(q[0], q[1], yu, yu + 2.3, 3.0, 6.0, ANG, yellowD, { top: tileD });
  S.kind = KIND.PLAIN;
  for (const s of [-1, 1]) { box(a + s * 1.52, 0, yu + 0.4, yu + 1.9, 0.06, 4.2, dark); box(a + s * 1.6, 0, yu, yu + 0.7, 0.1, 6.2, lacq); }
  S.hip(q[0], q[1], 6.6, 3.6, ACROSS, yu + 2.3, 0.9, tile, { flare: 0.4, over: 0.8, fascia: 0.18, fasciaCol: trim, hips: true, segs: 2 });
  S.kind = KIND.TIMBER;
  S.box(q[0], q[1], yu + 2.7, yu + 3.5, 2.2, 4.6, ANG, yellowD, { top: tileD });
  S.kind = KIND.PLAIN;
  S.hip(q[0], q[1], 5.0, 2.6, ACROSS, yu + 3.5, 1.4, tile, { flare: 0.45, over: 0.8, fascia: 0.18, fasciaCol: trim, ridgeCol: trim, hips: true, segs: 3 });
  ridgeOrnament(S, W(a, 0), yu + 4.9, 2.2, 0.45);
  // red silk lanterns under the eaves, front and back; the gate's eave line lit
  for (const s of [-1, 1]) for (const b of [-4.8, 0, 4.8]) lamps.push([W(a + s * (D / 2 + 0.6), b), y1 + 3.9, [1, 0.38, 0.2]]);
  for (const s of [-1, 1]) { const p = W(a + s * (D / 2 + 0.75), -Wd / 2), r = W(a + s * (D / 2 + 0.75), Wd / 2); L.beam([p[0], y1 + 4.3, p[1]], [r[0], y1 + 4.3, r[1]], 0.12, 0.12, [1, 1, 1]); }
}

// ---- an octagonal two-storey tower (chung lâu / cổ lâu) either side of the gate
function tower(S, c, lamps) {
  const g = gY(...c), R = 2.7, rot = ANG + Math.PI / 8;
  S.base = g - LAND_Y;
  S.kind = KIND.MASONRY;
  S.cyl(c[0], c[1], g - 0.3, g + 0.6, R + 0.8, R + 0.8, 8, stone, { rot });
  S.kind = KIND.CIVIC;
  S.cyl(c[0], c[1], g + 0.6, g + 3.9, R, R, 8, yellow, { rot });
  // an arched opening on each face, dark
  S.kind = KIND.PLAIN;
  for (let i = 0; i < 8; i++) {
    const t = ANG + (i * Math.PI) / 4, n = [Math.cos(t), Math.sin(t)], ap = R * Math.cos(Math.PI / 8) + 0.02;
    S.box(c[0] + n[0] * ap, c[1] + n[1] * ap, g + 0.6, g + (i % 2 ? 2.4 : 3.0), 0.06, i % 2 ? 0.9 : 1.3, t, dark);
  }
  polyRoof(S, c, 8, rot, g + 3.9, R + 1.0, 1.1, R * 0.62, tile, trim);
  S.kind = KIND.TIMBER;
  S.cyl(c[0], c[1], g + 4.6, g + 6.4, R * 0.66, R * 0.66, 8, yellowD, { rot });
  S.kind = KIND.PLAIN;
  for (let i = 0; i < 8; i += 2) { const t = ANG + (i * Math.PI) / 4, n = [Math.cos(t), Math.sin(t)], ap = R * 0.66 * Math.cos(Math.PI / 8) + 0.02; S.box(c[0] + n[0] * ap, c[1] + n[1] * ap, g + 4.9, g + 6.1, 0.06, 0.8, t, dark); }
  polyRoof(S, c, 8, rot, g + 6.4, R * 0.66 + 0.9, 1.8, 0.05, tile, trim);
  S.cyl(c[0], c[1], g + 8.2, g + 8.6, 0.18, 0.28, 6, trim);
  S.cyl(c[0], c[1], g + 8.6, g + 9.1, 0.28, 0.05, 6, hex('#d8b14a'));
  for (let i = 0; i < 8; i += 2) { const t = ANG + (i * Math.PI) / 4; lamps.push([[c[0] + Math.cos(t) * (R + 0.6), c[1] + Math.sin(t) * (R + 0.6)], g + 3.5, [1, 0.42, 0.22]]); }
}

// ---- a hexagonal open pavilion on a low platform, sheltering the great bell or the stele
function hexPavilion(S, c, what, lamps) {
  const g = gY(...c), R = 2.6, rot = ANG;
  S.base = g - LAND_Y;
  S.kind = KIND.MASONRY;
  S.cyl(c[0], c[1], g - 0.2, g + 0.6, R + 0.7, R + 0.6, 6, stone, { rot });
  S.kind = KIND.TIMBER;
  for (let i = 0; i < 6; i++) { const t = rot + (i * Math.PI) / 3; S.cyl(c[0] + Math.cos(t) * R, c[1] + Math.sin(t) * R, g + 0.6, g + 3.5, 0.17, 0.15, 6, lacq, { cap: false }); }
  S.kind = KIND.PLAIN;
  for (let i = 0; i < 6; i++) {
    const t0 = rot + (i * Math.PI) / 3, t1 = rot + ((i + 1) * Math.PI) / 3;
    S.beam([c[0] + Math.cos(t0) * R, g + 3.4, c[1] + Math.sin(t0) * R], [c[0] + Math.cos(t1) * R, g + 3.4, c[1] + Math.sin(t1) * R], 0.2, 0.3, lacq);
  }
  polyRoof(S, c, 6, rot, g + 3.5, R + 1.0, 1.0, R * 0.55, tile, trim);
  polyRoof(S, c, 6, rot, g + 4.3, R * 0.55 + 0.6, 1.2, 0.05, tile, trim);
  S.cyl(c[0], c[1], g + 5.5, g + 6.0, 0.22, 0.05, 6, hex('#d8b14a'));
  if (what === 'bell') {
    S.beam([c[0], g + 3.4, c[1]], [c[0], g + 2.9, c[1]], 0.1, 0.1, dark);
    S.cyl(c[0], c[1], g + 1.3, g + 2.6, 0.75, 0.55, 10, bronze);
    S.cyl(c[0], c[1], g + 2.6, g + 2.95, 0.55, 0.2, 10, bronze);
  } else {
    S.kind = KIND.MASONRY;
    S.box(c[0], c[1], g + 0.6, g + 1.0, 0.7, 1.6, ANG, stone);
    S.box(c[0], c[1], g + 1.0, g + 2.9, 0.26, 1.07, ANG, hex('#6f6a61'));
    S.cyl(c[0], c[1], g + 2.9, g + 3.1, 0.55, 0.3, 6, hex('#6f6a61'), { rot });
  }
  lamps.push([c, g + 3.2, [1, 0.5, 0.26]]);
}

// ---- Đại Giác hall: three bays and two lean-to bays (3 gian 2 chái) on a stone base. The plan follows the roof as
// the satellite shows it (Google, 2026): a front house (tiền đường) under its own hipped roof, ridge across the axis
// at a ≈ 67.4, joined in a valley gutter to the main house (chánh điện) behind, whose two-tier roof has its upper
// ridge at a ≈ 76.9 (about 14 m long, the hips running out to the corners) and a lower tier showing as a narrow band
// down both sides and a wider one across the back. The whole roof is about 26 m across and 26 m deep, eaves
// included; walls a 62.8-86.8, b ±12.9 (the OSM outline, way 771244228, is a 61-86: the roofs put it about 1 m
// further back). A verandah of six lacquered columns before five doors; ngói liệt tiles; twin dragons facing the
// moon on the upper ridge. No street view reaches the hall, so its heights, colours and fronts stay estimated.
function mainHall(S, box, lamps, L) {
  const a0 = 62.8, a1 = 86.8, aj = 72.0, hb = 12.9; // front, back, the line between front and main house, half width
  let gmax = -1e9;
  for (const [a, b] of [[a0, -hb], [a0, hb], [a1, -hb], [a1, hb], [(a0 + a1) / 2, 0]]) gmax = Math.max(gmax, gY(...W(a, b)));
  const g = gmax, yb = g + 0.8; // floor on its stone base
  S.base = g - LAND_Y;
  S.kind = KIND.MASONRY;
  box((a0 + a1) / 2, 0, g - 0.4, yb, a1 - a0 + 1.2, 2 * hb + 1.2, stone, { top: stoneL, topKind: KIND.ROAD });
  // steps up the front, the full width of the three middle bays
  S.kind = KIND.ROAD;
  for (let i = 0; i < 4; i++) box(a0 - 0.6 - 0.35 * (4 - i) + 0.175, 0, g - 0.2, g + 0.2 * (i + 1), 0.35, 12.4 - i * 0.2, stoneL);
  // the closed hall behind the verandah (front and main house are one room inside)
  const af = a0 + 2.2; // the door wall
  S.kind = KIND.CIVIC;
  box((af + a1) / 2, 0, yb, yb + 4.3, a1 - af, 2 * hb, yellow, { top: tileD });
  S.kind = KIND.PLAIN;
  // five doors, one to a bay (the middle one wider), and the board "Diệu Đế Quốc Tự" over the middle
  for (const [b, w] of [[-10.6, 2.0], [-5.6, 2.4], [0, 2.8], [5.6, 2.4], [10.6, 2.0]]) {
    box(af - 0.02, b, yb, yb + 3.0, 0.06, w, door);
    box(af - 0.04, b, yb + 3.0, yb + 3.2, 0.06, w + 0.3, trim);
  }
  box(af - 0.1, 0, yb + 3.35, yb + 3.95, 0.08, 3.4, hex('#3a2a1c'));
  box(af - 0.14, 0, yb + 3.42, yb + 3.88, 0.06, 3.0, hex('#d8b14a'));
  // the verandah: six columns on the front (bays of 4, 5.6, 5.6, 5.6, 4 m), a beam along their heads
  S.kind = KIND.TIMBER;
  const cols = [-12.4, -8.4, -2.8, 2.8, 8.4, 12.4];
  for (const b of cols) { const q = W(a0 + 0.4, b); S.cyl(q[0], q[1], yb, yb + 4.1, 0.24, 0.22, 8, lacq, { cap: false }); }
  S.kind = KIND.PLAIN;
  { const p = W(a0 + 0.4, -12.7), q = W(a0 + 0.4, 12.7); S.beam([p[0], yb + 4.1, p[1]], [q[0], yb + 4.1, q[1]], 0.3, 0.36, lacq); }
  box((a0 + af) / 2, 0, yb + 4.0, yb + 4.3, af - a0, 2 * hb, shade(yellow, 0.5), { bottom: true }); // verandah ceiling
  const yr = yb + 4.3;
  // the front house's roof, ridge across the axis
  const fc = W((a0 + aj) / 2, 0);
  S.hip(fc[0], fc[1], 2 * hb, aj - a0, ACROSS, yr, 2.6, tile, { flare: 0.5, over: 1.1, fascia: 0.22, fasciaCol: trim, ridgeCol: trim, hips: true, segs: 3 });
  ridgeOrnament(S, W((a0 + aj) / 2, 0), yr + 2.65, 4.2, 0.55);
  // the main house: the lower tier over its whole plan (meets the front roof in a valley), a short clerestory, the
  // upper tier
  const mc = W((aj + a1) / 2, 0);
  S.hip(mc[0], mc[1], 2 * hb, a1 - aj, ACROSS, yr, 1.4, tile, { flare: 0.45, over: 1.1, fascia: 0.22, fasciaCol: trim, hips: true, segs: 3 });
  const u0 = 72.3, u1 = 81.5, uh = 11.5, uc = (u0 + u1) / 2, yu = yr + 1.6;
  S.kind = KIND.CIVIC;
  box(uc, 0, yr + 0.3, yu, u1 - u0, 2 * uh, yellowD, { top: tileD });
  S.kind = KIND.PLAIN;
  const q = W(uc, 0);
  S.hip(q[0], q[1], 2 * uh, u1 - u0, ACROSS, yu, 2.6, tile, { flare: 0.55, over: 1.4, fascia: 0.2, fasciaCol: trim, ridgeCol: trim, hips: true, segs: 4 });
  ridgeOrnament(S, W(uc, 0), yu + 2.65, 5.4, 0.7);
  // eave lights and lanterns along the verandah
  for (const [a, h, yy] of [[a0 - 1.0, hb + 1.0, yr - 0.35], [u0 - 1.3, uh + 1.2, yu - 0.15]]) {
    const p = W(a, -h), r = W(a, h);
    L.beam([p[0], yy, p[1]], [r[0], yy, r[1]], 0.12, 0.12, [1, 1, 1]);
  }
  for (const b of [-10.6, -5.6, 0, 5.6, 10.6]) lamps.push([W(a0 + 0.2, b), yb + 3.5, [1, 0.42, 0.22]]);
}

// ---- the pagoda's ranges at the back of the block, all mapped in OSM and all under old brown tiles from the air
// (Google satellite, 2026). Each is drawn on its outline, so the city leaves its generic house out (city.js drops a
// mapped building the landmark covers).
function backRanges(S, box, lamps) {
  // the north corner, on Ngự Viên: a low house under a double roof, a short upper tier riding on the lower one (from
  // the street a dark tiled roof behind the wall)
  tiledHouse(S, box, 84.8, 99.3, -40.2, -28.7, { wallH: 2.9, roofH: 1.5, col: brownD, upper: { inset: 2.6, rise: 1.1, h: 1.7 } });
  // the south-east corner, on Diệu Đế: one storey under a brown tiled hip
  tiledHouse(S, box, 84.8, 101.8, 26.7, 39.9, { wallH: 3.0, roofH: 2.1, col: brown });
  // the long range on Tô Hiến Thành (Street View from the street, satellite): one storey under old tiles with dragons at
  // the ends and the middle of the ridge; a corrugated-iron sheet laid over the slope toward the street, carried on
  // down as a lean-to verandah on thin posts; small red-tiled houses at both ends
  const a0 = 102.4, a1 = 116.4, b0 = -12.8, b1 = 13.1, wallH = 3.0, roofH = 2.3;
  const { g, yw } = tiledHouse(S, box, a0, a1, b0, b1, { wallH, roofH, col: brown, over: 0.6 });
  const ac = (a0 + a1) / 2, yr = yw + roofH;
  ridgeOrnament(S, W(ac, 0), yr - 0.05, 3.2, 0.42);
  for (const s of [-1, 1]) ridgeOrnament(S, W(ac, s * ((b1 - b0) / 2 - (a1 - a0) / 2 - 0.2) + (b0 + b1) / 2), yr - 0.05, 1.6, 0.3);
  const V = (a, b, y) => { const q = W(a, b); return [q[0], y, q[1]]; };
  const sheet = (p, q, r, s, c) => { S.quad(p, q, r, s, c); S.quad(p, s, r, q, c); };
  S.kind = KIND.PLAIN;
  const e1 = a1 + 0.9, e2 = 120.3, bs0 = b0 + 0.6, bs1 = b1 - 0.6;
  sheet(V(ac + 0.3, bs0, yr + 0.12), V(ac + 0.3, bs1, yr + 0.12), V(e1, bs1, yw + 0.05), V(e1, bs0, yw + 0.05), iron);
  sheet(V(e1, bs0, yw + 0.05), V(e1, bs1, yw + 0.05), V(e2, bs1, yw - 0.75), V(e2, bs0, yw - 0.75), shade(iron, 0.85));
  S.kind = KIND.MASONRY;
  box((a1 + e2) / 2 + 0.1, (b0 + b1) / 2, g - 0.2, g + 0.25, e2 - a1 + 0.2, b1 - b0 - 1.2, stone, { topKind: KIND.ROAD });
  S.kind = KIND.TIMBER;
  for (let b = bs0 + 0.4; b <= bs1 - 0.39; b += (bs1 - bs0 - 0.8) / 7) { const q = W(e2 - 0.3, b); S.cyl(q[0], q[1], g + 0.25, yw - 0.68, 0.07, 0.07, 6, hex('#5b4a3a'), { cap: false }); }
  S.kind = KIND.PLAIN;
  for (const b of [-8, -2.5, 3, 8.5]) box(a1 + 0.02, b, g + 0.35, g + 2.5, 0.06, 1.4, door);
  // the red-tiled houses at the two ends
  tiledHouse(S, box, 110.0, 117.0, -21.6, -14.2, { wallH: 2.8, roofH: 1.6, col: redTile });
  tiledHouse(S, box, 109.0, 119.0, 14.6, 21.0, { wallH: 2.8, roofH: 1.6, col: redTile });
  for (const b of [-6, 6]) lamps.push([W(e2 - 0.6, b), yw - 1.0, [1, 0.62, 0.36]]);
}

// a one-storey house on a low plinth under a tiled hip, on the rectangle [a0, a1] x [b0, b1] of the frame; with
// `upper`, a short clerestory and a second, smaller hip riding on the first
function tiledHouse(S, box, a0, a1, b0, b1, { wallH = 3, roofH = 2, col = brown, over = 0.7, upper = null } = {}) {
  let g = -1e9;
  for (const [a, b] of [[a0, b0], [a0, b1], [a1, b0], [a1, b1]]) g = Math.max(g, gY(...W(a, b)));
  const ac = (a0 + a1) / 2, bc = (b0 + b1) / 2, la = a1 - a0, lb = b1 - b0, yw = g + 0.35 + wallH;
  const along = la >= lb, ang = along ? ANG : ACROSS, w = Math.max(la, lb), d = Math.min(la, lb);
  S.base = g - LAND_Y;
  S.kind = KIND.MASONRY;
  box(ac, bc, g - 0.3, g + 0.35, la + 0.3, lb + 0.3, stone, { topKind: KIND.ROAD });
  S.kind = KIND.CIVIC;
  box(ac, bc, g + 0.35, yw, la, lb, lime, { top: shade(col, 0.8) });
  S.kind = KIND.PLAIN;
  // dark doors and windows along the long sides
  const n = Math.max(2, Math.round(w / 4));
  for (let i = 0; i < n; i++) {
    const t = -w / 2 + (w * (i + 0.5)) / n;
    for (const s of [-1, 1]) {
      if (along) box(ac + t, bc + s * (lb / 2 + 0.02), g + 0.45, g + 0.45 + (i % 2 ? 1.3 : 2.1), 1.1, 0.06, dark);
      else box(ac + s * (la / 2 + 0.02), bc + t, g + 0.45, g + 0.45 + (i % 2 ? 1.3 : 2.1), 0.06, 1.1, dark);
    }
  }
  const q = W(ac, bc);
  S.hip(q[0], q[1], w, d, ang, yw, roofH, col, { flare: 0.3, over, fascia: 0.14, fasciaCol: shade(col, 0.75), ridgeCol: shade(col, 1.15), hips: true, segs: 2 });
  if (upper) {
    const wu = w - 2 * upper.inset, du = d - 2 * upper.inset, yu = yw + upper.rise;
    S.kind = KIND.CIVIC;
    S.box(q[0], q[1], yw + 0.2, yu, wu, du, ang, lime, { top: shade(col, 0.8) });
    S.kind = KIND.PLAIN;
    S.hip(q[0], q[1], wu, du, ang, yu, upper.h, col, { flare: 0.3, over: 0.6, fascia: 0.12, fasciaCol: shade(col, 0.75), ridgeCol: shade(col, 1.15), hips: true, segs: 2 });
  }
  return { g, yw };
}

// a small square pavilion under a tiled hip: walled (a little shrine) or open on four columns
function smallPavilion(S, box, a, b, s, rot, walled) {
  const q = W(a, b), g = gY(...q), ang = ANG + rot, yw = g + 0.45 + 2.7;
  S.base = g - LAND_Y;
  S.kind = KIND.MASONRY;
  S.box(q[0], q[1], g - 0.25, g + 0.45, s + 0.5, s + 0.5, ang, stone, { top: stoneL, topKind: KIND.ROAD });
  if (walled) {
    S.kind = KIND.CIVIC;
    S.box(q[0], q[1], g + 0.45, yw, s - 0.6, s - 0.6, ang, yellow, { top: tileD });
    S.kind = KIND.PLAIN;
    const u = [Math.cos(ang), Math.sin(ang)], v = [-u[1], u[0]], o = (s - 0.6) / 2 + 0.02;
    S.box(q[0] + v[0] * o, q[1] + v[1] * o, g + 0.45, g + 2.4, 1.2, 0.06, ang, door);
  } else {
    S.kind = KIND.TIMBER;
    for (const [i, j] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const u = [Math.cos(ang), Math.sin(ang)], v = [-u[1], u[0]], o = s / 2 - 0.3;
      S.cyl(q[0] + (u[0] * i + v[0] * j) * o, q[1] + (u[1] * i + v[1] * j) * o, g + 0.45, yw, 0.15, 0.13, 6, lacq, { cap: false });
    }
    S.kind = KIND.PLAIN;
  }
  S.hip(q[0], q[1], s, s, ang, yw, 1.6, tile, { flare: 0.4, over: 0.6, fascia: 0.14, fasciaCol: trim, ridgeCol: trim, hips: true, segs: 2 });
}

// the second entrance on Bạch Đằng: a slim grey stone pier with a moulded cap and a ball finial (Street View)
function stonePier(S, c) {
  const g = gY(...c);
  S.base = g - LAND_Y;
  S.kind = KIND.MASONRY;
  S.box(c[0], c[1], g - 0.3, g + 0.5, 0.7, 0.7, ANG, grey, { top: greyL });
  S.box(c[0], c[1], g + 0.5, g + 2.9, 0.52, 0.52, ANG, grey, { top: greyL });
  S.kind = KIND.PLAIN;
  S.box(c[0], c[1], g + 2.9, g + 3.08, 0.72, 0.72, ANG, greyL);
  S.box(c[0], c[1], g + 3.08, g + 3.2, 0.4, 0.4, ANG, grey);
  S.cyl(c[0], c[1], g + 3.2, g + 3.42, 0.12, 0.27, 8, greyL, { cap: false });
  S.cyl(c[0], c[1], g + 3.42, g + 3.7, 0.27, 0.06, 8, greyL);
}

// the back gate on Tô Hiến Thành: an old brick pier, its top green with moss
function mossPier(S, c) {
  const g = gY(...c);
  S.base = g - LAND_Y;
  S.kind = KIND.MASONRY;
  S.box(c[0], c[1], g - 0.3, g + 2.6, 1.0, 1.0, ANG, shade(WALL.wall, 0.9), { top: moss });
  S.kind = KIND.PLAIN;
  S.box(c[0], c[1], g + 2.6, g + 2.85, 1.15, 1.15, ANG, moss);
  S.box(c[0], c[1], g + 2.85, g + 3.15, 0.6, 0.6, ANG, moss, { taper: 0.5 });
}
// a cone-shaped roof over a regular n-gon (octagonal towers, hexagonal pavilions): a concave slope from the eave
// (radius r0 at y) to radius r1 at y + h, corner ridges in the trim colour ending in upturned tips
function polyRoof(S, c, n, rot, y, r0, h, r1, col, ridgeCol) {
  const keep = S.kind;
  S.kind = KIND.TILE;
  const rm = r1 + (r0 - r1) * 0.42, ym = y + h * 0.62;
  S.cyl(c[0], c[1], y - 0.1, ym, r0, rm, n, col, { rot, cap: false });
  S.cyl(c[0], c[1], ym, y + h, rm, r1, n, col, { rot, cap: r1 > 0.06 });
  S.kind = KIND.PLAIN;
  S.cyl(c[0], c[1], y - 0.3, y - 0.1, r0 - 0.05, r0, n, ridgeCol, { rot, cap: false }); // fascia
  for (let i = 0; i < n; i++) {
    const t = rot + (i / n) * Math.PI * 2, u = [Math.cos(t), Math.sin(t)];
    const pe = [c[0] + u[0] * r0, y, c[1] + u[1] * r0], pm = [c[0] + u[0] * rm, ym + 0.05, c[1] + u[1] * rm], pt = [c[0] + u[0] * r1, y + h + 0.05, c[1] + u[1] * r1];
    S.beam(pe, pm, 0.16, 0.16, ridgeCol);
    S.beam(pm, pt, 0.14, 0.14, ridgeCol);
    S.beam(pe, [pe[0] + u[0] * 0.45, y + 0.45, pe[2] + u[1] * 0.45], 0.14, 0.14, ridgeCol); // the upturned tip
  }
  S.kind = keep;
}

// twin dragons facing the moon on a ridge (lưỡng long triều nguyệt): a disc with a flame in the middle, a dragon
// each side reading as an arched, scaly body in glazed shards
function ridgeOrnament(S, c, y, span, k) {
  const keep = S.kind;
  S.kind = KIND.PLAIN;
  const at = (b, h) => { const q = [c[0] + P[0] * b, c[1] + P[1] * b]; return [q[0], y + h, q[1]]; };
  S.box(c[0], c[1], y, y + 0.9 * k, 0.12, 0.85 * k, ANG, hex('#d8b14a'));
  S.box(c[0], c[1], y + 0.9 * k, y + 1.3 * k, 0.1, 0.35 * k, ANG, hex('#c9442c'));
  for (const s of [-1, 1]) {
    const pts = [[0.55, 0.2], [0.9, 0.85], [1.4, 0.5], [1.9, 0.9], [2.3, 0.3]].map(([b, h]) => at(s * b * k * span / 4.6, h * k));
    for (let i = 0; i + 1 < pts.length; i++) S.beam(pts[i], pts[i + 1], 0.16 * k + 0.05, 0.22 * k + 0.05, mosaic);
  }
  S.kind = keep;
}

// a broad shade tree: trunk and three stacked crowns (lo: the crown's underside, above the ground)
function tree(S, c, r, h, lo = null) {
  const g = gY(...c), y1 = lo ?? h * 0.35;
  const keep = S.kind;
  S.kind = KIND.PLAIN;
  S.cyl(c[0], c[1], g, g + Math.max(y1 + 0.5, h * 0.45), 0.28, 0.2, 6, bark);
  S.cyl(c[0], c[1], g + y1, g + h * 0.6, r * 0.75, r, 7, leafD);
  S.cyl(c[0], c[1], g + h * 0.6, g + h * 0.82, r, r * 0.7, 7, leaf);
  S.cyl(c[0], c[1], g + h * 0.82, g + h, r * 0.7, r * 0.15, 7, leaf);
  S.kind = keep;
}

function lightMeshFrom(buf, mat) {
  const mesh = new THREE.Mesh(buf.geometry(), mat);
  mesh.renderOrder = 19;
  return mesh;
}

// a shrub or young tree under the big crowns: a short trunk and a low, round crown
function shrub(S, c, r, h) {
  const g = gY(...c), keep = S.kind;
  S.kind = KIND.PLAIN;
  S.cyl(c[0], c[1], g, g + h * 0.35, 0.12, 0.1, 5, bark);
  S.cyl(c[0], c[1], g + h * 0.25, g + h * 0.6, r * 0.7, r, 7, leafD);
  S.cyl(c[0], c[1], g + h * 0.6, g + h, r, r * 0.3, 7, leaf);
  S.kind = keep;
}

// a banyan (đa): a thick, fluted trunk and a wide, low-spreading crown
function banyan(S, c, r, h) {
  const g = gY(...c), keep = S.kind;
  S.kind = KIND.PLAIN;
  S.cyl(c[0], c[1], g, g + 1.2, 1.3, 0.8, 8, bark);
  S.cyl(c[0], c[1], g + 1.2, g + h * 0.42, 0.8, 0.55, 8, bark);
  S.cyl(c[0], c[1], g + h * 0.34, g + h * 0.58, r * 0.85, r, 9, leafD);
  S.cyl(c[0], c[1], g + h * 0.58, g + h * 0.82, r, r * 0.75, 9, leaf);
  S.cyl(c[0], c[1], g + h * 0.82, g + h, r * 0.75, r * 0.2, 9, leaf);
  S.kind = keep;
}
