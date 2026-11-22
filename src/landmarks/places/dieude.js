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
// bays, five doors, ngói liệt tiles, twin dragons facing the moon on the ridge) follow the written descriptions; the
// hall's roof plan (a front hall and a main hall with a clerestory and an upper roof), the grove and the brick wall
// with its second entrance on Bạch Đằng follow the satellite and street views.

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
// the precinct wall: old brick, weathered, under a low coping (Street View); the piers in grey stone
const WALL = { ...FENCE.pagoda, h: 2.4, plinth: 2.4, every: 5.0, postW: 0.5, postUp: 0.05, wall: hex('#7f5242'), cap: hex('#6f6458'), pierW: 1.0, pierUp: 1.2 };

export function build({ data, S, group }) {
  const box = (a, b, y0, y1, la, lb, col, o = {}) => { const q = W(a, b); S.box(q[0], q[1], y0, y1, la, lb, ANG + (o.rot || 0), col, o); };
  const y0 = gY(...W(30, 0));
  S.base = y0 - LAND_Y;
  const lamps = [];
  const L = new Buf(128); // eave light strips after dark

  // ---- the walls round the block, set in from the streets; the gate stands in the front. Street View (Google, all
  // four streets) shows old brick (gạch vồ) about 2.4 m high, weathered dark red-brown, on a rubble-stone footing
  // along Ngự Viên, with trees leaning over it everywhere; a second entrance between grey stone piers stands on
  // Bạch Đằng some 25 m north-west of the main gate
  const roads = roadsNear(data, W(55, 0), 200), blds = buildingsNear(data, W(55, 0), 120);
  const Fr = { c: O, f: F, p: P, a: ANG, at: (a, b = 0) => W(a, b) };
  const Y = yard(Fr, roads, -2.5, 119, -46, 42.5, -2.5, 90, -43, 40, blds);
  const side = [[25, Y.b0], [25, Y.b1], [96, Y.b0], [96, Y.b1], [Y.a1, 0]]; // side gates onto the lanes and the back street
  fence(S, Y.ring, WALL, { roads, solid: blds, openings: [[...W(Y.a0, 0), 7.6], [...W(Y.a0, -25), 3.2], ...side.map(([a, b]) => [...W(a, b), 1.4])] });

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
  // the grove: from the air (Google satellite) old trees close over the whole court in front of the hall and the
  // garden round it, the axis walk and the hall the only gaps; from every street their crowns stand over the wall.
  // A jittered 8.5 m grid of broad crowns, kept off the axis walk, the gate and its towers, the two pavilions, the forecourt before
  // the hall, the hall itself, the side range and the mapped buildings
  {
    const rnd = (i, j, k) => { const v = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453; return v - Math.floor(v); };
    const clear = (a, b) => (a < 60 && Math.abs(b) < 6) || (a < 13 && Math.abs(b) < 20) || (a > 43 && a < 58 && Math.abs(b) < 14)
      || (a >= 58 && a < 93 && Math.abs(b) < 20.5) || Math.hypot(a - 30, Math.abs(b) - 15) < 8 || (a > 2 && a < 47 && b > -45 && b < -29.5);
    const G = 8.5;
    for (let i = 0; Y.a0 + 2 + i * G < Y.a1 - 2; i++) for (let j = 0; Y.b0 + 2 + j * G < Y.b1 - 2; j++) {
      const a = Math.min(Y.a1 - 2.2, Y.a0 + 2.5 + i * G + (rnd(i, j, 1) - 0.5) * 4.5);
      const b = Math.max(Y.b0 + 2.2, Math.min(Y.b1 - 2.2, Y.b0 + 2.5 + j * G + (rnd(i, j, 2) - 0.5) * 4.5));
      const r = 4.4 + rnd(i, j, 3) * 1.8, h = 11 + rnd(i, j, 4) * 5;
      if (clear(a, b) || rnd(i, j, 5) < 0.06) continue;
      const p = W(a, b);
      if (hitB(...p) || [0, 1, 2, 3, 4, 5, 6, 7].some((k) => hitB(...W(a + r * Math.cos(k * Math.PI / 4), b + r * Math.sin(k * Math.PI / 4))))) continue; // the crown clears the mapped roofs
      tree(S, p, r, h);
    }
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
