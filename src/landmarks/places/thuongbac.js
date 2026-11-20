import { KIND, Buf, hex, shade } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { lightMaterial, glowPoints } from '../../geo/materials.js';

// Thương Bạc (商舶), the Nguyễn court's office for foreign trade and envoys, on the Hương's north bank by Trần Hưng
// Đạo street, in công viên Thương Bạc. First built 1870 (Tự Đức); rebuilt 1921 (Khải Định) as an octagonal pavilion
// (lầu bát giác) of cement and reinforced concrete on a square base 1.3 m high, ringed by solid railings with the
// name "Thương Bạc" in relief on the front and back; before it a court with two cement ponds and rockeries, four
// stone dragons guarding them, and four gate pillars crowned with lotus buds carrying porcelain couplets.
// Sources and estimates: docs/places/thuongbac.md.
//
// Footprint: OSM way 239568223 (building, historic), a near-square 16.2 m × 17.0 m, taken as the base. The court is
// laid on the river side (the side the envoys landed on); the octagon's size, column and roof heights, the court's
// size and the colours are estimates.
export const id = 'thuongbac';

// OSM outline corners (metres, model frame), and from them the centre and the axis toward the river (south-east)
const RING = [[-362.7, 93.1], [-349.4, 83.8], [-339.6, 97.7], [-352.9, 107.0]];
const C0 = [RING.reduce((s, p) => s + p[0], 0) / 4, RING.reduce((s, p) => s + p[1], 0) / 4];
const AX = (() => { const dx = (RING[2][0] + RING[3][0] - RING[0][0] - RING[1][0]) / 2, dz = (RING[2][1] + RING[3][1] - RING[0][1] - RING[1][1]) / 2, l = Math.hypot(dx, dz); return [dx / l, dz / l]; })();
const BL = 17.0, BW = 16.2, BH = 1.3; // the base: along the axis, across it, height (sourced)

const ROOF = PAL.imperialRoof2; // glazed yellow tubular tiles, weathered toward ochre
const RIDGE = hex('#efd58a');
const COL = PAL.lacquer; // red-painted concrete columns
const PLASTER = hex('#e2cf9c'); // the yellow lime wash of the base and railings
const TRIM = hex('#f2e6c4');
const KERB = hex('#7f8280'); // bluestone kerbs and steps
const FLOOR = hex('#c9bca0');
const COURT = hex('#bfb39b');
const WATER = hex('#3f5e5a');
const ROCK = hex('#6f6b63');
const DRAGON = hex('#8c8a80');
const LANTERN = [1.0, 0.74, 0.38];

export function build({ data, S, group, place, THREE }) {
  // keep the outline's centre unless the place record sits far from it
  const c = place && Math.hypot(place.x - C0[0], place.z - C0[1]) > 8 ? [place.x, place.z] : C0;
  const [fx, fz] = AX, px = -fz, pz = fx; // f: toward the river; p: along the bank
  const fa = Math.atan2(fz, fx), pa = fa + Math.PI / 2;
  const at = (a, b) => [c[0] + fx * a + px * b, c[1] + fz * a + pz * b];
  const g = LAND_Y + rise(c[0], c[1]), y0 = g + BH;
  const L = new Buf(600);
  const lan = [], lanC = [];
  const lantern = (q, y) => { lan.push(q[0], y, q[1]); lanC.push(...LANTERN); };

  // the mapped outline is this model's base: leave it out of the city's buildings
  if (Array.isArray(data?.bld)) {
    for (let i = data.bld.length - 1; i >= 0; i--) {
      const f = data.bld[i][0];
      let sx = 0, sz = 0;
      for (let k = 0; k < f.length; k += 2) { sx += f[k]; sz += f[k + 1]; }
      const n = f.length / 2;
      if (Math.hypot(sx / n / 10 - C0[0], sz / n / 10 - C0[1]) < 4) data.bld.splice(i, 1);
    }
  }

  const n0 = S.n;
  // ---- the base: 1.3 m, washed yellow above a bluestone plinth, a moulded coping, a railing all round ----
  S.kind = KIND.MASONRY;
  S.box(c[0], c[1], g - 0.4, g + 0.25, BL + 0.3, BW + 0.3, fa, KERB, { topKind: KIND.ROAD });
  S.box(c[0], c[1], g + 0.25, y0 - 0.15, BL, BW, fa, PLASTER);
  S.box(c[0], c[1], y0 - 0.15, y0, BL + 0.16, BW + 0.16, fa, TRIM, { top: FLOOR, topKind: KIND.ROAD });
  // recessed panels in the base's faces
  S.kind = KIND.PLAIN;
  for (const sg of [-1, 1]) {
    for (let k = -2; k <= 2; k++) {
      if (k === 0) continue; // the stair stands there
      let q = at(sg * (BL / 2 + 0.02), k * 3.0);
      S.box(q[0], q[1], g + 0.45, y0 - 0.32, 0.04, 2.1, fa, shade(PLASTER, 0.86));
      q = at(k * 3.2, sg * (BW / 2 + 0.02));
      S.box(q[0], q[1], g + 0.45, y0 - 0.32, 2.3, 0.04, fa, shade(PLASTER, 0.86));
    }
  }

  // flights up the river face and the street face, 7 steps between cheek walls
  const ns = 7, sr = BH / ns, st = 0.32, sw = 3.6;
  for (const sg of [-1, 1]) {
    S.kind = KIND.MASONRY;
    for (let k = 1; k < ns; k++) {
      const q = at(sg * (BL / 2 + st * (k - 0.5)), 0);
      S.box(q[0], q[1], g - 0.2, y0 - sr * k, st, sw, fa, shade(KERB, k % 2 ? 1.06 : 1.0), { topKind: KIND.ROAD });
    }
    S.kind = KIND.PLAIN;
    const run = st * (ns - 1);
    for (const s2 of [-1, 1]) {
      const a = at(sg * (BL / 2 - 0.1), s2 * (sw / 2 + 0.22)), b = at(sg * (BL / 2 + run + 0.15), s2 * (sw / 2 + 0.22));
      S.beam([a[0], y0 + 0.45, a[1]], [b[0], g + 0.55, b[1]], 0.36, 0.5, PLASTER);
      const q = at(sg * (BL / 2 + run + 0.15), s2 * (sw / 2 + 0.22)); // a newel at the foot
      S.box(q[0], q[1], g, g + 0.9, 0.44, 0.44, fa, TRIM);
      S.cyl(q[0], q[1], g + 0.9, g + 1.15, 0.16, 0.04, 6, TRIM, { rot: fa });
    }
  }

  // the railing: posts and a pierced balustrade round the edge, broken at the stairs; the name panel either side
  const rail = (a0, b0, a1, b1) => {
    const p = at(a0, b0), q = at(a1, b1), len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
    const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    S.box(m[0], m[1], y0, y0 + 0.14, len, 0.24, ang, TRIM); // the plinth course
    S.box(m[0], m[1], y0 + 0.62, y0 + 0.74, len + 0.06, 0.26, ang, TRIM); // the hand rail
    const nb = Math.max(1, Math.round(len / 0.32));
    for (let i = 0; i < nb; i++) { // the balusters
      const t = (i + 0.5) / nb, x = p[0] + (q[0] - p[0]) * t, z = p[1] + (q[1] - p[1]) * t;
      S.box(x, z, y0 + 0.14, y0 + 0.62, 0.11, 0.11, ang, PLASTER);
    }
    for (const t of [0, 1]) { const x = p[0] + (q[0] - p[0]) * t, z = p[1] + (q[1] - p[1]) * t; S.box(x, z, y0, y0 + 0.86, 0.3, 0.3, ang, TRIM); }
  };
  S.kind = KIND.PLAIN;
  const ha = BL / 2 - 0.15, hb = BW / 2 - 0.15, gap = sw / 2 + 0.22;
  for (const sg of [-1, 1]) {
    rail(sg * ha, -hb, sg * ha, -gap); rail(sg * ha, gap, sg * ha, hb); // river and street faces, each side of the stair
    rail(-ha, sg * hb, ha, sg * hb); // the two ends
  }
  // "Thương Bạc" cast in relief on the river and street faces: a raised tablet in the railing beside each stair
  for (const sg of [-1, 1]) for (const s2 of [-1, 1]) {
    const q = at(sg * (ha + 0.02), s2 * (gap + 1.4));
    S.box(q[0], q[1], y0 + 0.16, y0 + 0.6, 0.16, 1.8, fa, TRIM);
    const r = at(sg * (ha + 0.11), s2 * (gap + 1.4));
    S.box(r[0], r[1], y0 + 0.24, y0 + 0.52, 0.04, 1.5, fa, hex('#8a5a2c'));
  }

  // ---- the octagonal pavilion: 8 columns on a ring 8.6 m across the flats, a low inner sanctum, a two-tier roof ----
  const oct = (a) => a / Math.cos(Math.PI / 8); // circumradius of an octagon with apothem a
  const rot = fa + Math.PI / 8; // a flat face toward the river
  const A1 = 4.3, H1 = 3.4; // column ring apothem; column height above the floor (estimated)
  S.kind = KIND.MASONRY;
  S.cyl(c[0], c[1], y0, y0 + 0.18, oct(A1 + 0.7), oct(A1 + 0.62), 8, shade(FLOOR, 1.05), { rot }); // the octagon's dais
  const yf = y0 + 0.18;
  S.kind = KIND.TIMBER;
  const R1 = oct(A1);
  const cols = [];
  for (let k = 0; k < 8; k++) {
    const t = rot + (k / 8) * Math.PI * 2, q = [c[0] + Math.cos(t) * R1, c[1] + Math.sin(t) * R1];
    cols.push(q);
    S.box(q[0], q[1], yf, yf + 0.3, 0.52, 0.52, t, TRIM); // the base block
    S.box(q[0], q[1], yf + 0.3, yf + H1, 0.34, 0.34, t, COL); // a square concrete column
    S.box(q[0], q[1], yf + H1 - 0.2, yf + H1, 0.44, 0.44, t, TRIM); // the capital
  }
  // architrave round the ring, and under it in every bay a fretwork valance (in cast concrete)
  for (let k = 0; k < 8; k++) {
    const p = cols[k], q = cols[(k + 1) % 8];
    S.beam([p[0], yf + H1 - 0.12, p[1]], [q[0], yf + H1 - 0.12, q[1]], 0.36, 0.34, shade(COL, 0.85));
    const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], ang = Math.atan2(q[1] - p[1], q[0] - p[0]), len = Math.hypot(q[0] - p[0], q[1] - p[1]) - 0.4;
    S.box(m[0], m[1], yf + H1 - 0.62, yf + H1 - 0.3, len, 0.06, ang, shade(COL, 0.62));
    S.box(m[0], m[1], yf + H1 - 0.68, yf + H1 - 0.62, len, 0.1, ang, hex('#c9a13b'));
    // a low parapet between the columns, open on the four axial faces
    if (k % 2 === 1) S.box(m[0], m[1], yf, yf + 0.55, len, 0.2, ang, PLASTER, { top: TRIM });
  }
  // the inner room: a smaller walled octagon with doors, as the court used it for audiences
  const A0 = 2.3, R0 = oct(A0), H0 = 3.2;
  S.kind = KIND.CIVIC;
  S.cyl(c[0], c[1], yf, yf + H0, R0, R0, 8, PLASTER, { rot, cap: false });
  S.kind = KIND.PLAIN;
  for (let k = 0; k < 8; k++) { // a door on the axial faces, a round window on the others
    const t = fa + (k / 8) * Math.PI * 2, q = [c[0] + Math.cos(t) * (A0 + 0.03), c[1] + Math.sin(t) * (A0 + 0.03)];
    if (k % 2 === 0) S.box(q[0], q[1], yf, yf + 2.3, 0.05, 1.05, t, hex('#6a2a1e'));
    else S.box(q[0], q[1], yf + 1.2, yf + 2.0, 0.05, 0.7, t, hex('#5b4a3a'));
  }

  // first roof tier: a skirt from the column heads, curving out to sharp lifted corners
  const yr1 = yf + H1;
  S.kind = KIND.TIMBER;
  S.cyl(c[0], c[1], yr1, yr1 + 0.18, oct(A1 + 0.3), oct(A1 + 0.3), 8, shade(COL, 0.6), { rot, cap: false }); // fascia
  const ceil = []; for (let k = 0; k < 8; k++) { const t = rot + (k / 8) * Math.PI * 2; ceil.push([c[0] + Math.cos(t) * oct(A1 + 1.25), c[1] + Math.sin(t) * oct(A1 + 1.25)]); }
  S.prism(ceil, yr1 + 0.12, yr1 + 0.18, shade(COL, 0.55), shade(ROOF, 0.8)); // soffit
  S.kind = KIND.TILE;
  S.cyl(c[0], c[1], yr1 + 0.05, yr1 + 0.5, oct(A1 + 1.3), oct(A1 + 0.5), 8, ROOF, { rot, cap: false });
  S.cyl(c[0], c[1], yr1 + 0.5, yr1 + 1.25, oct(A1 + 0.5), oct(A0 + 0.35), 8, ROOF, { rot, cap: false });
  // its hip ridges, ending in upturned dragon-tail tips (đầu đao)
  S.kind = KIND.GLAZED;
  for (let k = 0; k < 8; k++) {
    const t = rot + (k / 8) * Math.PI * 2, ct = Math.cos(t), sn = Math.sin(t);
    const P = (r, y) => [c[0] + ct * r, y, c[1] + sn * r];
    S.beam(P(oct(A0 + 0.35), yr1 + 1.32), P(oct(A1 + 0.5), yr1 + 0.6), 0.16, 0.16, RIDGE);
    S.beam(P(oct(A1 + 0.5), yr1 + 0.6), P(oct(A1 + 1.3), yr1 + 0.18), 0.15, 0.15, RIDGE);
    S.beam(P(oct(A1 + 1.25), yr1 + 0.18), P(oct(A1 + 1.6), yr1 + 0.7), 0.13, 0.12, RIDGE);
  }

  // the chồng diêm: a clerestory band of panels between the tiers
  const yb0 = yr1 + 1.2, yb1 = yb0 + 0.85;
  S.kind = KIND.TIMBER;
  S.cyl(c[0], c[1], yb0, yb1, oct(A0 + 0.2), oct(A0 + 0.2), 8, shade(COL, 0.75), { rot, cap: false });
  S.kind = KIND.PLAIN;
  for (let k = 0; k < 8; k++) {
    const t = fa + (k / 8) * Math.PI * 2, q = [c[0] + Math.cos(t) * (A0 + 0.23), c[1] + Math.sin(t) * (A0 + 0.23)];
    S.box(q[0], q[1], yb0 + 0.15, yb1 - 0.15, 0.04, 1.3, t, k % 2 ? hex('#c9a13b') : hex('#2f4e46')); // gilt and glazed-green panels
  }

  // second tier: the upper octagonal roof, steep, to a gourd finial
  const yr2 = yb1;
  S.kind = KIND.TIMBER;
  S.prism(ceil.map(([x, z]) => [c[0] + (x - c[0]) * (A0 + 1.2) / (A1 + 1.25), c[1] + (z - c[1]) * (A0 + 1.2) / (A1 + 1.25)]), yr2 - 0.08, yr2, shade(COL, 0.55), shade(ROOF, 0.8));
  S.kind = KIND.TILE;
  S.cyl(c[0], c[1], yr2, yr2 + 0.35, oct(A0 + 1.25), oct(A0 + 0.45), 8, ROOF, { rot, cap: false });
  S.cyl(c[0], c[1], yr2 + 0.35, yr2 + 1.75, oct(A0 + 0.45), 0.18, 8, ROOF, { rot });
  S.kind = KIND.GLAZED;
  for (let k = 0; k < 8; k++) {
    const t = rot + (k / 8) * Math.PI * 2, ct = Math.cos(t), sn = Math.sin(t);
    const P = (r, y) => [c[0] + ct * r, y, c[1] + sn * r];
    S.beam(P(0.25, yr2 + 1.75), P(oct(A0 + 0.45), yr2 + 0.42), 0.14, 0.14, RIDGE);
    S.beam(P(oct(A0 + 0.45), yr2 + 0.42), P(oct(A0 + 1.25), yr2 + 0.1), 0.13, 0.13, RIDGE);
    S.beam(P(oct(A0 + 1.2), yr2 + 0.1), P(oct(A0 + 1.5), yr2 + 0.5), 0.11, 0.1, RIDGE);
  }
  const yt = yr2 + 1.75;
  S.cyl(c[0], c[1], yt, yt + 0.25, 0.22, 0.3, 8, RIDGE, { rot });
  S.cyl(c[0], c[1], yt + 0.25, yt + 0.55, 0.3, 0.14, 8, hex('#e2b13a'), { rot });
  S.cyl(c[0], c[1], yt + 0.55, yt + 0.85, 0.14, 0.02, 6, hex('#e2b13a'), { rot });

  // ---- the court before it, on the river side: two cement ponds with rockeries, four stone dragons, four pillars ----
  const c0 = BL / 2 + st * (ns - 1) + 0.4, c1 = c0 + 13.0, CW = 15.0; // the court along the axis, and its width
  const np = S.n;
  S.kind = KIND.MASONRY;
  {
    const q = at((c0 + c1) / 2, 0);
    S.box(q[0], q[1], g - 0.2, g + 0.25, c1 - c0, CW, fa, COURT, { topKind: KIND.ROAD });
  }
  (S.paved = S.paved || []).push([np, S.n]);
  const yc = g + 0.25;
  for (const s2 of [-1, 1]) {
    const q = at((c0 + c1) / 2 - 0.5, s2 * 4.3), PWD = 4.6, PLN = 6.2;
    S.kind = KIND.MASONRY;
    S.box(q[0], q[1], yc, yc + 0.5, PLN + 0.5, PWD + 0.5, fa, TRIM, { top: TRIM }); // the pond's kerb
    S.kind = KIND.PLAIN;
    S.box(q[0], q[1], yc + 0.5, yc + 0.52, PLN - 0.1, PWD - 0.1, fa, WATER);
    // the rockery (non bộ) in the middle: a cluster of tapering stones
    const rocks = [[0, 0, 1.6, 0.7], [0.55, 0.3, 1.0, 0.5], [-0.5, -0.25, 1.15, 0.55], [0.2, -0.55, 0.7, 0.4]];
    for (const [a, b, h, r] of rocks) { const p = at((c0 + c1) / 2 - 0.5 + a, s2 * 4.3 + b); S.cyl(p[0], p[1], yc + 0.4, yc + 0.5 + h, r, r * 0.25, 5, ROCK, { rot: a * 3 + b }); }
    // two stone dragons guarding each pond, at its corners on the axis side
    for (const s3 of [-1, 1]) {
      const d = at((c0 + c1) / 2 - 0.5 + s3 * (PLN / 2 + 0.2), s2 * (4.3 - PWD / 2 - 0.1));
      S.box(d[0], d[1], yc, yc + 0.35, 0.9, 0.5, fa, shade(DRAGON, 0.9)); // plinth
      const h0 = at((c0 + c1) / 2 - 0.5 + s3 * (PLN / 2 + 0.55), s2 * (4.3 - PWD / 2 - 0.1)), h1 = at((c0 + c1) / 2 - 0.5 + s3 * (PLN / 2 - 0.15), s2 * (4.3 - PWD / 2 - 0.1));
      S.beam([h1[0], yc + 0.45, h1[1]], [h0[0], yc + 0.8, h0[1]], 0.26, 0.3, DRAGON); // the coiled body rising to the head
      S.beam([h0[0], yc + 0.8, h0[1]], [h0[0] + fx * 0.25 * s3, yc + 0.95, h0[1] + fz * 0.25 * s3], 0.22, 0.26, DRAGON);
    }
  }
  // four gate pillars across the court's river end, lotus buds on top, the couplet panels on their faces
  for (const b of [-5.6, -1.9, 1.9, 5.6]) {
    const q = at(c1 - 0.5, b), big = Math.abs(b) < 3, h = big ? 4.6 : 3.8;
    S.kind = KIND.MASONRY;
    S.box(q[0], q[1], yc, yc + 0.35, 0.95, 0.95, fa, KERB);
    S.box(q[0], q[1], yc + 0.35, yc + h, 0.62, 0.62, fa, PLASTER);
    S.box(q[0], q[1], yc + h, yc + h + 0.18, 0.8, 0.8, fa, TRIM);
    S.kind = KIND.PLAIN;
    for (const sg of [-1, 1]) { const r = at(c1 - 0.5 + sg * 0.32, b); S.box(r[0], r[1], yc + 0.9, yc + h - 0.5, 0.03, 0.36, fa, hex('#e8eef0')); } // porcelain couplets
    S.kind = KIND.GLAZED;
    S.cyl(q[0], q[1], yc + h + 0.18, yc + h + 0.42, 0.24, 0.34, 8, TRIM, { rot: fa });
    S.cyl(q[0], q[1], yc + h + 0.42, yc + h + 0.95, 0.34, 0.03, 8, hex('#d9b25a'), { rot: fa }); // the lotus bud
    if (big) lantern(q, yc + h + 1.05);
  }
  // a low wall either side of the gate pillars, closing the court's river side
  S.kind = KIND.MASONRY;
  for (const sg of [-1, 1]) {
    for (const [b0, b1] of [[5.9, CW / 2]]) {
      const q = at(c1 - 0.5, sg * (b0 + b1) / 2);
      S.box(q[0], q[1], yc, yc + 0.8, 0.36, b1 - b0, fa, PLASTER, { top: TRIM });
    }
    const q = at((c0 + c1) / 2, sg * (CW / 2 - 0.18)); // and down the court's sides
    S.box(q[0], q[1], yc, yc + 0.8, c1 - c0, 0.36, fa, PLASTER, { top: TRIM });
  }
  (S.paved = S.paved || []).push([n0, S.n]);

  // ---- night: a strip under the lower eave, lamps on the base's corners and at the foot of the stairs ----
  {
    const y = yr1 - 0.04, r = oct(A1 + 0.9);
    for (let k = 0; k < 8; k++) {
      const t0 = rot + (k / 8) * Math.PI * 2, t1 = rot + ((k + 1) / 8) * Math.PI * 2;
      L.beam([c[0] + Math.cos(t0) * r, y, c[1] + Math.sin(t0) * r], [c[0] + Math.cos(t1) * r, y, c[1] + Math.sin(t1) * r], 0.12, 0.09, [1, 1, 1]);
    }
  }
  for (const sa of [-1, 1]) for (const sb of [-1, 1]) lantern(at(sa * ha, sb * hb), y0 + 1.05);
  for (const sg of [-1, 1]) for (const s2 of [-1, 1]) lantern(at(sg * (BL / 2 + st * (ns - 1) + 0.15), s2 * (sw / 2 + 0.22)), g + 1.3);

  if (group && THREE) {
    const m = new THREE.Mesh(L.geometry(), lightMaterial(0xffb04a, 1.2));
    m.renderOrder = 19;
    m.userData.landmark = id;
    group.add(m);
    const pts = glowPoints(lan, lanC, 6);
    pts.userData.glow = true;
    pts.userData.landmark = id;
    group.add(pts);
  }
  S.kind = KIND.PLAIN;
  return null;
}
