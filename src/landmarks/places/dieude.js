import * as THREE from 'three';
import { KIND, Buf, hex, shade, inRing } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { glowPoints, lightMaterial } from '../../geo/materials.js';
import { fence, yard, roadsNear, buildingsNear, FENCE } from '../enclosure.js';

// Quốc tự Diệu Đế, 102 Bạch Đằng, on the east bank of the Đông Ba canal facing the Citadel (founded 1844 by Thiệu Trị
// on his birthplace; most rows pulled down 1887; rebuilt smaller 1953; restoration from 2018, when the 350 m² main
// hall was moved back about 19 m). See docs/places/dieude.md for sources and what is estimated.
//
// The plan is read in a frame on the axis: a = metres from the entrance (OSM node 7199615582, where the axis footway
// 257257955 from Bạch Đằng meets the gate) back toward the hall (north-east), b = metres across (+b south-east,
// toward the lane Chùa Ông). The precinct is the whole block between Bạch Đằng (a ≈ -10.6), the lanes Diệu Đế
// (b ≈ -50) and Chùa Ông (b ≈ +46) and Tô Hiến Thành (a ≈ 123): about 1.1 ha, the "over 10,000 m²" of the sources.
// OSM maps the hall block (way 771244228: a 61-86, b ±14) and a long range on the north-west side of the court
// (way 771244225: a 6-43, b -32 … -42). The gate with its upper storey, the octagonal bell and drum towers either
// side of it, the hexagonal bell and stele pavilions in the court, and the Đại Giác hall (three bays and two lean-to
// bays, five doors, ngói liệt tiles, twin dragons facing the moon on the ridge) follow the written descriptions.

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

export function build({ data, S, group }) {
  const box = (a, b, y0, y1, la, lb, col, o = {}) => { const q = W(a, b); S.box(q[0], q[1], y0, y1, la, lb, ANG + (o.rot || 0), col, o); };
  const y0 = gY(...W(30, 0));
  S.base = y0 - LAND_Y;
  const lamps = [];
  const L = new Buf(128); // eave light strips after dark

  // ---- the walls round the block (yellow under a tile coping), set in from the streets; the gate stands in the front
  const roads = roadsNear(data, W(55, 0), 200), blds = buildingsNear(data, W(55, 0), 120);
  const Fr = { c: O, f: F, p: P, a: ANG, at: (a, b = 0) => W(a, b) };
  const Y = yard(Fr, roads, -2.5, 119, -46, 42.5, -2.5, 90, -43, 40, blds);
  const side = [[25, Y.b0], [25, Y.b1], [96, Y.b0], [96, Y.b1], [Y.a1, 0]]; // side gates onto the lanes and the back street
  fence(S, Y.ring, FENCE.pagoda, { roads, solid: blds, openings: [[...W(Y.a0, 0), 7.6], ...side.map(([a, b]) => [...W(a, b), 1.4])] });

  // ---- the court: paved in front of the hall, a garden round and behind it; laid in 4 m cells that keep off the
  // mapped buildings at the back (monks' quarters), raised a little and marked paved so no infill house or stray
  // tree lands in the court
  const p0 = S.n;
  const pad = blds.map((r) => r);
  const hitB = (x, z) => pad.some((r) => inRing(x, z, r));
  const STEP = 4;
  for (let a = Y.a0 + 0.3; a < Y.a1 - 0.3; a += STEP) for (let b = Y.b0 + 0.3; b < Y.b1 - 0.3; b += STEP) {
    const a1 = Math.min(a + STEP, Y.a1 - 0.3), b1 = Math.min(b + STEP, Y.b1 - 0.3);
    const corners = [[a, b], [a1, b], [a1, b1], [a, b1]];
    if (corners.some(([u, v]) => hitB(...W(u, v))) || hitB(...W((a + a1) / 2, (b + b1) / 2))) continue;
    const front = (a + a1) / 2 < 59 && Math.abs((b + b1) / 2) < 30;
    S.kind = front ? KIND.ROAD : KIND.GROUND;
    const v = corners.map(([u, w]) => { const q = W(u, w); return [q[0], gY(q[0], q[1]) + 0.24, q[1]]; });
    S.quad(v[0], v[3], v[2], v[1], front ? pave : lawn, [0, 1, 0]);
  }
  // the axis walk from the gate to the hall steps, a shade darker
  S.kind = KIND.ROAD;
  box(29.5, 0, y0 - 0.2, y0 + 0.3, 59, 4.2, walk, { topKind: KIND.ROAD });
  S.paved = [...(S.paved || []), [p0, S.n]];

  gate(S, box, lamps, L);
  for (const s of [-1, 1]) tower(S, W(4.6, s * 12.4), lamps);
  // the hexagonal pavilions of the court: the great bell (cast 1846) on the left, the stele of 1846 (1.9 m by 1.07 m)
  // on the right, as one faces the hall
  hexPavilion(S, W(30, 15), 'bell', lamps);
  hexPavilion(S, W(30, -15), 'stele', lamps);
  mainHall(S, box, lamps, L);
  sideRange(S, box, lamps);
  // the bronze incense urn on the axis in front of the hall, and two rows of potted bonsai along the walk
  {
    const q = W(55, 0), g = gY(...q);
    S.kind = KIND.MASONRY;
    S.box(q[0], q[1], g, g + 0.7, 1.4, 1.4, ANG, stone, { top: stoneL });
    S.kind = KIND.PLAIN;
    S.cyl(q[0], q[1], g + 0.7, g + 1.5, 0.45, 0.6, 8, bronze);
    S.cyl(q[0], q[1], g + 1.5, g + 2.1, 0.5, 0.22, 8, bronze);
    for (let a = 8; a <= 50; a += 6) for (const s of [-1, 1]) {
      const p = W(a, s * 3.2), h = gY(...p);
      S.cyl(p[0], p[1], h + 0.2, h + 0.75, 0.35, 0.42, 6, hex('#6f5b4a'), { cap: false });
      S.cyl(p[0], p[1], h + 0.75, h + 1.55, 0.6, 0.15, 6, leaf);
    }
  }
  // shade trees round the court and in the garden behind the hall
  for (const [a, b, r, h] of [[14, -27, 3.8, 9], [14, 28, 4.2, 10], [46, 30, 3.6, 8.5], [48, -26, 3.4, 8], [92, 0, 4.4, 10.5], [70, -30, 3.4, 8], [70, 31, 3.6, 8.5], [108, 30, 3.8, 9]]) {
    tree(S, W(a, b), r, h);
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
  const a = -2.5, g = gY(...W(a, 0)), y1 = g + 0.3, D = 3.4, Wd = 15.2;
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
  // lacquered columns standing proud of the front, and the name board "Diệu Đế Quốc Tự" over the middle opening
  for (const b of [-6.6, -3.0, 3.0, 6.6]) { box(a - D / 2 - 0.25, b, y1, y1 + 4.1, 0.42, 0.42, lacq); }
  box(a - D / 2 - 0.06, 0, y1 + 3.75, y1 + 4.1, 0.08, 2.6, hex('#3a2a1c'));
  box(a - D / 2 - 0.08, 0, y1 + 3.8, y1 + 4.05, 0.06, 2.2, hex('#d8b14a'));
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

// ---- Đại Giác hall: three bays and two lean-to bays (21 m by 16.5 m, about the 350 m² the sources give) on a stone
// base, a verandah of six lacquered columns before five doors, under a two-tier roof of ngói liệt with twin dragons
// facing the moon on the ridge; the meditation halls on both sides and a rear range fill the rest of the mapped block
function mainHall(S, box, lamps, L) {
  const a0 = 62, a1 = 78.5, Wd = 21, c = (a0 + a1) / 2, ac = W(c, 0);
  let gmax = -1e9;
  for (const [a, b] of [[a0, -10], [a0, 10], [a1, -10], [a1, 10], [c, 0]]) gmax = Math.max(gmax, gY(...W(a, b)));
  const g = gmax, yb = g + 0.8; // floor on its stone base
  S.base = g - LAND_Y;
  S.kind = KIND.MASONRY;
  box(c, 0, g - 0.4, yb, a1 - a0 + 1.6, Wd + 1.6, stone, { top: stoneL, topKind: KIND.ROAD });
  // steps up the front, the full width of the three middle bays
  S.kind = KIND.ROAD;
  for (let i = 0; i < 4; i++) box(a0 - 0.8 - 0.35 * (4 - i) + 0.175, 0, g - 0.2, g + 0.2 * (i + 1), 0.35, 12.4 - i * 0.2, stoneL);
  // the closed hall behind the verandah
  S.kind = KIND.CIVIC;
  box((a0 + 2.6 + a1) / 2, 0, yb, yb + 4.3, a1 - a0 - 2.6, Wd - 0.4, yellow, { top: tileD });
  S.kind = KIND.PLAIN;
  // five doors (lacquered leaves, the middle one wider) and the board "Diệu Đế Quốc Tự" over it
  for (const [b, w] of [[-8.0, 2.0], [-4.2, 2.2], [0, 2.8], [4.2, 2.2], [8.0, 2.0]]) {
    box(a0 + 2.58, b, yb, yb + 3.0, 0.06, w, door);
    box(a0 + 2.56, b, yb + 3.0, yb + 3.2, 0.06, w + 0.3, trim);
  }
  box(a0 + 2.5, 0, yb + 3.35, yb + 3.95, 0.08, 3.4, hex('#3a2a1c'));
  box(a0 + 2.46, 0, yb + 3.42, yb + 3.88, 0.06, 3.0, hex('#d8b14a'));
  // the verandah: six columns on the front, a beam along their heads
  S.kind = KIND.TIMBER;
  const cols = [-10, -6, -2.1, 2.1, 6, 10];
  for (const b of cols) { const q = W(a0 + 0.5, b); S.cyl(q[0], q[1], yb, yb + 4.1, 0.24, 0.22, 8, lacq, { cap: false }); }
  S.kind = KIND.PLAIN;
  { const p = W(a0 + 0.5, -10.3), q = W(a0 + 0.5, 10.3); S.beam([p[0], yb + 4.1, p[1]], [q[0], yb + 4.1, q[1]], 0.3, 0.36, lacq); }
  box(a0 + 1.55, 0, yb + 4.0, yb + 4.3, 2.1, Wd, shade(yellow, 0.5), { bottom: true }); // verandah ceiling
  // the roof: a broad lower tier over the whole hall, a short clerestory, and the upper tier
  const yr = yb + 4.3;
  S.hip(ac[0], ac[1], Wd, a1 - a0, ACROSS, yr, 1.7, tile, { flare: 0.5, over: 1.3, fascia: 0.22, fasciaCol: trim, hips: true, segs: 3 });
  S.kind = KIND.CIVIC;
  box(c + 0.4, 0, yr + 0.9, yr + 2.0, 9.6, 14.6, yellowD, { top: tileD });
  S.kind = KIND.PLAIN;
  S.hip(ac[0] + F[0] * 0.4, ac[1] + F[1] * 0.4, 15.4, 10.2, ACROSS, yr + 2.0, 2.4, tile, { flare: 0.55, over: 1.1, fascia: 0.2, fasciaCol: trim, ridgeCol: trim, hips: true, segs: 4 });
  ridgeOrnament(S, W(c + 0.4, 0), yr + 4.45, 5.4, 0.7);
  // eave lights and lanterns along the verandah
  for (const [a, hb, yy] of [[a0 - 0.9, 11.6, yr - 0.35], [c + 0.4 - 5.1 - 0.8, 8.0, yr + 1.85]]) {
    const p = W(a, -hb), q = W(a, hb);
    L.beam([p[0], yy, p[1]], [q[0], yy, q[1]], 0.12, 0.12, [1, 1, 1]);
  }
  for (const b of [-8, -4.1, 0, 4.1, 8]) lamps.push([W(a0 + 0.2, b), yb + 3.5, [1, 0.42, 0.22]]);

  // the meditation halls (thiền đường) on both sides and the rear range, lower, within the mapped outline
  for (const s of [-1, 1]) {
    const b = s * 12.6, q = W(73.5, b), gg = gY(...q);
    S.kind = KIND.MASONRY;
    box(73.5, b, gg - 0.3, gg + 0.5, 25, 3.4, stone, { topKind: KIND.ROAD });
    S.kind = KIND.CIVIC;
    box(73.5, b, gg + 0.5, gg + 3.6, 24, 2.6, yellow, { top: tileD });
    S.kind = KIND.PLAIN;
    for (let a = 64; a <= 84; a += 4) box(a, b + s * 1.31, gg + 0.5, gg + 2.6, 1.3, 0.06, door);
    S.hip(q[0], q[1], 24, 2.6, ANG, gg + 3.6, 1.2, tile, { flare: 0.3, over: 0.7, fascia: 0.16, fasciaCol: trim, ridgeCol: trim, hips: true, segs: 2 });
  }
  {
    const q = W(82.6, 0), gg = gY(...q);
    S.kind = KIND.CIVIC;
    box(82.6, 0, gg, gg + 3.8, 6.2, 20.4, yellow, { top: tileD });
    S.kind = KIND.PLAIN;
    S.hip(q[0], q[1], 20.4, 6.2, ACROSS, gg + 3.8, 1.6, tile, { flare: 0.3, over: 0.8, fascia: 0.16, fasciaCol: trim, ridgeCol: trim, hips: true, segs: 2 });
  }
}

// ---- the long range on the north-west side of the court (OSM way 771244225, 37.5 m by 9.4 m): one storey, a
// verandah toward the court
function sideRange(S, box, lamps) {
  const ac = 24.5, b = -37.1, q = W(ac, b), g = gY(...q);
  S.base = g - LAND_Y;
  S.kind = KIND.MASONRY;
  box(ac, b, g - 0.3, g + 0.45, 37.6, 9.4, stone, { topKind: KIND.ROAD });
  S.kind = KIND.CIVIC;
  box(ac, b - 0.8, g + 0.45, g + 3.5, 36.4, 6.6, yellow, { top: tileD });
  S.kind = KIND.PLAIN;
  for (let a = ac - 16; a <= ac + 16.1; a += 4) {
    box(a, b + 2.52, g + 0.45, g + 2.6, 1.4, 0.06, door);
    const c = W(a + 2, b + 4.1); S.cyl(c[0], c[1], g + 0.45, g + 3.4, 0.16, 0.15, 6, lacq, { cap: false });
  }
  S.hip(q[0], q[1], 37.6, 9.0, ANG, g + 3.5, 2.0, tile, { flare: 0.35, over: 0.6, fascia: 0.18, fasciaCol: trim, ridgeCol: trim, hips: true, segs: 2 });
  for (let a = ac - 14; a <= ac + 14.1; a += 7) lamps.push([W(a, b + 4.4), g + 3.0, [1, 0.62, 0.36]]);
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

// a broad shade tree: trunk and three stacked crowns
function tree(S, c, r, h) {
  const g = gY(...c);
  const keep = S.kind;
  S.kind = KIND.PLAIN;
  S.cyl(c[0], c[1], g, g + h * 0.45, 0.28, 0.2, 6, bark);
  S.cyl(c[0], c[1], g + h * 0.35, g + h * 0.6, r * 0.75, r, 7, leafD);
  S.cyl(c[0], c[1], g + h * 0.6, g + h * 0.82, r, r * 0.7, 7, leaf);
  S.cyl(c[0], c[1], g + h * 0.82, g + h, r * 0.7, r * 0.15, 7, leaf);
  S.kind = keep;
}

function lightMeshFrom(buf, mat) {
  const mesh = new THREE.Mesh(buf.geometry(), mat);
  mesh.renderOrder = 19;
  return mesh;
}
