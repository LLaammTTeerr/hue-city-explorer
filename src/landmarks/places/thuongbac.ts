import { KIND, Buf, hex, shade, unflat } from '../../geo/buf.ts';
import { LAND_Y } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { lightMaterial, glowPoints } from '../../geo/materials.ts';

// Thương Bạc (商舶), the Nguyễn court's office for foreign trade and envoys, on the Hương's north bank by Trần Hưng
// Đạo street, in công viên Thương Bạc. First built 1870 (Tự Đức); rebuilt 1921 (Khải Định) as an octagonal pavilion
// (lầu bát giác) of cement and reinforced concrete on a square base 1.3 m high, ringed by solid railings with the
// name "Thương Bạc" in relief on the front and back. Sources, estimates and the photo audit: docs/places/thuongbac.md.
//
// What stands there now (satellite and Street View, 2024-2026): an open two-tier pavilion, white columns and white
// railings of crossed lattice under weathered brown-ochre tiles and white ridges, on a low railed base with a wide
// flight front and back. The lower roof is octagonal; above a lattice band the upper storey is a small panelled
// rectangle under a hipped roof whose straight ridge runs across the axis, with a dragon at each end and an ornament
// in the middle. The front faces north-west, over clipped hedges either side of the flight, up a pale stone court with
// a darker inlaid panel on the axis to the road, where two pairs of lotus-topped gate pillars stand on the pavement.
// Behind, toward the river: a terrace, a short flight between two cheek blocks, and a paved disc. The 1921 ponds,
// rockeries and dragons are not there any more and are not drawn.
//
// Footprint: OSM way 239568223 (building, historic), a near-square 16.2 m × 17.0 m. It gives the axis (it agrees with
// the satellite to within 2°), but the outline is larger than the railed base the satellite shows and its centre
// sits about 2 m east of the pavilion; both are re-framed here (SHIFT, BL, BW), the outline is only used to find and
// drop the mapped building.
export const id = 'thuongbac';

// OSM outline corners (metres, model frame), and from them the centre and the axis toward the river (south-east)
const RING = [[-362.7, 93.1], [-349.4, 83.8], [-339.6, 97.7], [-352.9, 107.0]];
const C0 = [RING.reduce((s, p) => s + p[0], 0) / 4, RING.reduce((s, p) => s + p[1], 0) / 4];
const AX = (() => { const dx = (RING[2][0] + RING[3][0] - RING[0][0] - RING[1][0]) / 2, dz = (RING[2][1] + RING[3][1] - RING[0][1] - RING[1][1]) / 2, l = Math.hypot(dx, dz); return [dx / l, dz / l]; })();
const SHIFT = [-2.0, 0.0]; // the pavilion on the satellite, from the outline's centre (metres)
// the base: along the axis, across it (satellite, 0.14 m/px), and its height above the court. The 1921 sources give
// 1.3 m; the court photo shows about 1.0 m standing above today's paving (the court was re-laid since), so 1.0 m shows.
const BL = 14.4, BW = 12.8, BH = 1.0;
const COURT = 0.12; // the stone court stands this far above the city's ground, over the park's mapped footpaths

const ROOF = hex('#9a7658'); // glazed tiles weathered to a brown ochre (satellite and night photo)
const RIDGE = hex('#eee8dc'); // white stucco ridges and crests
const WHITE = hex('#efece4'); // columns, railings, gate pillars
const SHADOW = hex('#3b3631'); // the dark behind pierced work
const PLASTER = hex('#ebe5d6'); // the base's faces: white-washed, creamy under the night lamps
const KERB = hex('#7f8280'); // bluestone kerbs and steps
const FLOOR = hex('#c9bca0');
const PAVE = hex('#c4bdb0'); // the court: pale grey granite slabs
const INLAY = hex('#9c968c'); // the darker stone of the panel on the axis and the small squares
const SOFFIT = hex('#d9cdb4');
const HEDGE = hex('#3f6a34'); // clipped hedges in the planters
const COUPLET = hex('#d8b24a'); // the yellow couplet panels on the gate pillars
const LANTERN = [1.0, 0.74, 0.38];

const inside = (r, x, z) => { let k = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) k = !k; } return k; };

export function build({ data, S, group, place, THREE }) {
  // keep the re-framed centre unless the place record sits far from it
  const cR = [C0[0] + SHIFT[0], C0[1] + SHIFT[1]];
  const c = place && Math.hypot(place.x - cR[0], place.z - cR[1]) > 8 ? [place.x, place.z] : cR;
  const [fx, fz] = AX, px = -fz, pz = fx; // f: toward the river (the back); p: along the bank
  const fa = Math.atan2(fz, fx), pa = Math.atan2(pz, px);
  const at = (a, b): [number, number] => [c[0] + fx * a + px * b, c[1] + fz * a + pz * b];
  const g = LAND_Y + rise(c[0], c[1]), gc = g + COURT, y0 = gc + BH;
  const L = new Buf(600);
  const lan = [], lanC = [];
  const lantern = (q, y) => { lan.push(q[0], y, q[1]); lanC.push(...LANTERN); };
  const paved = (fn) => { const n = S.n; fn(); (S.paved = S.paved || []).push([n, S.n]); };

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

  // ---- the court: the park's mapped paved square (OSM), laid as one pale stone floor over its footpaths ----
  // with the darker inlaid panel on the axis and the small dark squares along its sides (satellite)
  {
    const q0 = at(-25, 0);
    const sq = (data?.green || []).filter(([k]) => k === 'paved').map(([, poly]) => unflat(poly[0])).find((r) => inside(r, q0[0], q0[1]));
    if (sq) {
      const top = Math.max(...sq.map(([x, z]) => LAND_Y + rise(x, z))) + COURT;
      S.kind = KIND.MASONRY;
      S.prism(sq, top - COURT - 0.3, top, KERB, PAVE, { topKind: KIND.ROAD });
      const slab = (a0, a1, b0, b1) => S.prism([at(a0, b0), at(a1, b0), at(a1, b1), at(a0, b1)], top - 0.05, top + 0.02, INLAY, INLAY, { topKind: KIND.ROAD });
      slab(-33.4, -10.6, -9.2, 10.2);
      for (const [a, b] of ([[-23.4, -19.8], [-14.5, -20.0], [-32.3, 21.4], [-23.1, 21.6], [-13.7, 21.2], [-5.6, 20.3]] as any[])) slab(a - 1.45, a + 1.45, b - 1.45, b + 1.45);
    }
  }

  const n0 = S.n;
  // ---- the base: 1.0 m above the court, white-washed above a bluestone plinth, a moulded coping, a railing round ----
  S.kind = KIND.MASONRY;
  S.box(c[0], c[1], g - 0.4, gc + 0.1, BL + 0.3, BW + 0.3, fa, KERB, { topKind: KIND.ROAD });
  S.box(c[0], c[1], gc + 0.1, y0 - 0.12, BL, BW, fa, PLASTER);
  S.box(c[0], c[1], y0 - 0.12, y0, BL + 0.16, BW + 0.16, fa, shade(PLASTER, 1.08), { top: FLOOR, topKind: KIND.ROAD });

  // behind, toward the river: a terrace a step above the ground, the width of the base, out to two cheek blocks
  const gt = g + 0.5, TA = BL / 2 + 5.4; // its level and its far edge along the axis
  S.box(...at((BL / 2 + TA) / 2 - 0.2, 0), g - 0.3, gt, TA - BL / 2 + 0.4, BW + 2.4, fa, KERB, { top: PAVE, topKind: KIND.ROAD });

  // wide flights up the front (court) and back (terrace) faces, each between low cheek blocks
  const sw = 5.6, st = 0.34;
  const flight = (sg, foot, ns) => {
    const sr = (y0 - foot) / ns, run = st * (ns - 1);
    S.kind = KIND.MASONRY;
    for (let k = 1; k < ns; k++) {
      const q = at(sg * (BL / 2 + st * (k - 0.5)), 0);
      S.box(q[0], q[1], foot - 0.2, y0 - sr * k, st, sw, fa, shade(KERB, k % 2 ? 1.06 : 1.0), { topKind: KIND.ROAD });
    }
    S.kind = KIND.PLAIN;
    for (const s2 of [-1, 1]) {
      const a = at(sg * (BL / 2 - 0.1), s2 * (sw / 2 + 0.18)), b = at(sg * (BL / 2 + run + 0.1), s2 * (sw / 2 + 0.18));
      S.beam([a[0], y0 + 0.12, a[1]], [b[0], foot + 0.3, b[1]], 0.3, 0.3, WHITE);
      S.box(b[0], b[1], foot, foot + 0.5, 0.4, 0.4, fa, WHITE);
    }
    return run;
  };
  const run = flight(-1, gc, 5);
  const runB = flight(1, gt, 4);

  // in front, either side of the flight: low planters of clipped hedge along the base's face
  for (const s2 of [-1, 1]) {
    const b0 = sw / 2 + 0.45, b1 = BW / 2 + 0.3, a0 = -BL / 2 - 1.7, a1 = -BL / 2 - 0.15;
    const q = at((a0 + a1) / 2, s2 * (b0 + b1) / 2);
    S.kind = KIND.MASONRY;
    S.box(q[0], q[1], gc - 0.1, gc + 0.42, a1 - a0, b1 - b0, fa, shade(KERB, 1.12), { top: hex('#5a4a38') });
    S.kind = KIND.GROUND;
    S.box(q[0], q[1], gc + 0.42, gc + 0.82, a1 - a0 - 0.25, b1 - b0 - 0.25, fa, HEDGE, { taper: 0.92 });
  }

  // the railing: white posts, a plinth course and a hand rail, and in each bay a crossed lattice (open, the floor and
  // the columns show through), broken at the stairs
  const rail = (a0, b0, a1, b1) => {
    const p = at(a0, b0), q = at(a1, b1), len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const ang = Math.atan2(q[1] - p[1], q[0] - p[0]), ux = Math.cos(ang), uz = Math.sin(ang);
    const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    S.box(m[0], m[1], y0, y0 + 0.14, len, 0.2, ang, WHITE); // the plinth course
    S.box(m[0], m[1], y0 + 0.64, y0 + 0.76, len + 0.06, 0.22, ang, WHITE); // the hand rail
    const nb = Math.max(1, Math.round(len / 1.5));
    for (let i = 0; i <= nb; i++) { // posts
      const t = i / nb, x = p[0] + (q[0] - p[0]) * t, z = p[1] + (q[1] - p[1]) * t;
      S.box(x, z, y0, y0 + 0.86, 0.24, 0.24, ang, WHITE);
    }
    for (let i = 0; i < nb; i++) { // two diamonds of crossed bars in each bay
      const bl = len / nb - 0.24, t = (i + 0.5) / nb, x = p[0] + (q[0] - p[0]) * t, z = p[1] + (q[1] - p[1]) * t;
      for (const s of [-1, 1]) {
        const e0 = [x - ux * bl / 2, z - uz * bl / 2], e1 = [x + ux * bl / 2, z + uz * bl / 2];
        const lo = y0 + 0.16, hi = y0 + 0.62, mid = [x, z];
        // an X across the bay, then a lozenge through its middle
        S.beam([e0[0], s < 0 ? lo : hi, e0[1]], [e1[0], s < 0 ? hi : lo, e1[1]], 0.05, 0.07, WHITE);
        const h0 = [x + ux * s * bl / 4, z + uz * s * bl / 4];
        S.beam([mid[0], lo, mid[1]], [h0[0], (lo + hi) / 2, h0[1]], 0.04, 0.06, WHITE);
        S.beam([mid[0], hi, mid[1]], [h0[0], (lo + hi) / 2, h0[1]], 0.04, 0.06, WHITE);
      }
    }
  };
  S.kind = KIND.PLAIN;
  const ha = BL / 2 - 0.15, hb = BW / 2 - 0.15, gap = sw / 2 + 0.2;
  for (const sg of [-1, 1]) {
    rail(sg * ha, -hb, sg * ha, -gap); rail(sg * ha, gap, sg * ha, hb); // front and back faces, each side of the stair
    rail(-ha, sg * hb, ha, sg * hb); // the two sides
  }
  // "Thương Bạc" cast in relief on the front and back: a raised tablet on the base's face beside each stair
  for (const sg of [-1, 1]) for (const s2 of [-1, 1]) {
    const q = at(sg * (BL / 2 + 0.03), s2 * (gap + 1.3));
    S.box(q[0], q[1], gc + 0.35, y0 - 0.2, 0.08, 1.6, fa, WHITE);
    const r = at(sg * (BL / 2 + 0.08), s2 * (gap + 1.3));
    S.box(r[0], r[1], gc + 0.42, y0 - 0.27, 0.04, 1.3, fa, hex('#8a5a2c'));
  }

  // ---- the pavilion: 8 white columns on an octagon 7.8 m across the flats, an open inner frame, two roofs ----
  const oct = (a) => a / Math.cos(Math.PI / 8); // circumradius of an octagon with apothem a
  const rot = fa + Math.PI / 8; // a flat face toward the front and the back
  const A1 = 3.9, H1 = 3.0; // column ring apothem; column height above the floor (from the night photo's proportions)
  S.kind = KIND.MASONRY;
  S.cyl(c[0], c[1], y0, y0 + 0.15, oct(A1 + 0.5), oct(A1 + 0.45), 8, shade(FLOOR, 1.05), { rot }); // the dais
  const yf = y0 + 0.15;
  S.kind = KIND.PLAIN;
  const R1 = oct(A1);
  const cols = [];
  for (let k = 0; k < 8; k++) {
    const t = rot + (k / 8) * Math.PI * 2, q = [c[0] + Math.cos(t) * R1, c[1] + Math.sin(t) * R1];
    cols.push(q);
    S.box(q[0], q[1], yf, yf + 0.25, 0.5, 0.5, t, WHITE); // the base block
    S.cyl(q[0], q[1], yf + 0.25, yf + H1, 0.2, 0.19, 10, WHITE); // a round concrete column
    S.box(q[0], q[1], yf + H1 - 0.22, yf + H1, 0.46, 0.46, t, WHITE); // the capital
  }
  // the architrave round the ring, and under it in every bay a pierced fretwork valance
  for (let k = 0; k < 8; k++) {
    const p = cols[k], q = cols[(k + 1) % 8];
    S.beam([p[0], yf + H1 - 0.1, p[1]], [q[0], yf + H1 - 0.1, q[1]], 0.3, 0.3, WHITE);
    const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], ang = Math.atan2(q[1] - p[1], q[0] - p[0]), len = Math.hypot(q[0] - p[0], q[1] - p[1]) - 0.4;
    S.box(m[0], m[1], yf + H1 - 0.5, yf + H1 - 0.25, len, 0.04, ang, SHADOW);
    S.box(m[0], m[1], yf + H1 - 0.56, yf + H1 - 0.48, len, 0.1, ang, WHITE);
    for (const s of [-1, 1]) { // corner brackets
      const e = [m[0] + Math.cos(ang) * s * (len / 2 - 0.2), m[1] + Math.sin(ang) * s * (len / 2 - 0.2)];
      S.box(e[0], e[1], yf + H1 - 0.85, yf + H1 - 0.25, 0.4, 0.1, ang, WHITE);
    }
  }
  // the inner frame: four columns on a 2.4 m square, a lintel on each face over a pierced arch (seen through to the river)
  const Q = 1.2, HQ = 2.8;
  for (const sa of [-1, 1]) for (const sb of [-1, 1]) {
    const q = at(sa * Q, sb * Q);
    S.box(q[0], q[1], yf, yf + HQ, 0.3, 0.3, fa, WHITE);
  }
  for (let k = 0; k < 4; k++) {
    const t = fa + (k * Math.PI) / 2, ct = Math.cos(t), sn = Math.sin(t);
    const m = [c[0] + ct * Q, c[1] + sn * Q], tang = t + Math.PI / 2;
    S.box(m[0], m[1], yf + HQ - 0.3, yf + HQ, 0.2, 2.7, tang - Math.PI / 2, WHITE);
    for (const s of [-1, 1]) { // the arch's stepped spandrels
      const along = (w): [number, number] => [m[0] - sn * s * w, m[1] + ct * s * w];
      let e = along(0.85); S.box(e[0], e[1], yf + HQ - 0.75, yf + HQ - 0.3, 0.12, 0.5, t, WHITE);
      e = along(0.97); S.box(e[0], e[1], yf + HQ - 1.15, yf + HQ - 0.75, 0.12, 0.26, t, WHITE);
    }
  }

  // a slim upturned tip where a ridge meets the eave: the ridge lifts a little past the corner and ends in a small
  // cloud scroll (a thin plate), as the photo shows; not a hook standing over the roof
  const tip = (e, dx, dz, s = 1) => {
    const m = [e[0] + dx * 0.22 * s, e[1] + 0.12 * s, e[2] + dz * 0.22 * s], t = [e[0] + dx * 0.36 * s, e[1] + 0.3 * s, e[2] + dz * 0.36 * s];
    S.beam(e, m, 0.09 * s, 0.09 * s, RIDGE);
    S.beam(m, t, 0.07 * s, 0.07 * s, RIDGE);
    S.box(t[0] - dx * 0.06 * s, t[2] - dz * 0.06 * s, t[1] - 0.04 * s, t[1] + 0.13 * s, 0.2 * s, 0.035, Math.atan2(dz, dx), RIDGE);
  };

  // first roof: from the column heads, curving out to lifted corners, up to the lattice band of the upper storey
  const yr1 = yf + H1, AE = A1 + 0.7, AB = 2.8; // eave and band apothems
  S.kind = KIND.PLAIN;
  S.cyl(c[0], c[1], yr1, yr1 + 0.22, oct(A1 + 0.2), oct(A1 + 0.2), 8, WHITE, { rot, cap: false }); // fascia
  const ring = (a, k0 = 0) => { const r = []; for (let k = 0; k < 8; k++) { const t = rot + ((k + k0) / 8) * Math.PI * 2; r.push([c[0] + Math.cos(t) * oct(a), c[1] + Math.sin(t) * oct(a)]); } return r; };
  S.kind = KIND.TIMBER;
  { const r = ring(AE - 0.05), y = yr1 + 0.13; for (let k = 0; k < 8; k++) S.tri([c[0], y, c[1]], [r[k][0], y, r[k][1]], [r[(k + 1) % 8][0], y, r[(k + 1) % 8][1]], SOFFIT, [0, -1, 0]); } // soffit, seen from below
  S.kind = KIND.TILE;
  S.cyl(c[0], c[1], yr1 + 0.1, yr1 + 0.42, oct(AE), oct(A1 + 0.1), 8, ROOF, { rot, cap: false });
  S.cyl(c[0], c[1], yr1 + 0.42, yr1 + 1.12, oct(A1 + 0.1), oct(AB), 8, ROOF, { rot, cap: false });
  // its hip ridges, white, ending in slim upturned tips (đầu đao)
  S.kind = KIND.PLAIN;
  for (let k = 0; k < 8; k++) {
    const t = rot + (k / 8) * Math.PI * 2, ct = Math.cos(t), sn = Math.sin(t);
    const P = (r, y): [number, number, number] => [c[0] + ct * r, y, c[1] + sn * r];
    S.beam(P(oct(AB), yr1 + 1.14), P(oct(A1 + 0.1), yr1 + 0.47), 0.12, 0.14, RIDGE);
    S.beam(P(oct(A1 + 0.1), yr1 + 0.47), P(oct(AE), yr1 + 0.15), 0.12, 0.14, RIDGE);
    tip(P(oct(AE) - 0.04, yr1 + 0.15), ct, sn);
  }

  // the upper storey's lattice band (a white railing of crossed bars round the lower roof's top)
  const yb0 = yr1 + 1.05, yb1 = yb0 + 0.5;
  S.kind = KIND.PLAIN;
  S.cyl(c[0], c[1], yb0, yb0 + 0.1, oct(AB + 0.02), oct(AB + 0.02), 8, WHITE, { rot });
  S.cyl(c[0], c[1], yb1 - 0.08, yb1, oct(AB + 0.06), oct(AB + 0.06), 8, WHITE, { rot, cap: false });
  S.kind = KIND.CIVIC;
  S.cyl(c[0], c[1], yb0 + 0.1, yb1 - 0.08, oct(AB - 0.12), oct(AB - 0.12), 8, SHADOW, { rot, cap: false }); // the dark behind
  S.kind = KIND.PLAIN;
  for (let k = 0; k < 8; k++) {
    const t0 = rot + (k / 8) * Math.PI * 2, t1 = rot + ((k + 1) / 8) * Math.PI * 2, R = oct(AB);
    const p = [c[0] + Math.cos(t0) * R, c[1] + Math.sin(t0) * R], q = [c[0] + Math.cos(t1) * R, c[1] + Math.sin(t1) * R];
    S.box(p[0], p[1], yb0, yb1, 0.16, 0.16, t0, WHITE); // a post at each corner
    for (let i = 0; i < 2; i++) { // two crosses in each face
      const u0 = i / 2, u1 = (i + 1) / 2, A = [p[0] + (q[0] - p[0]) * u0, p[1] + (q[1] - p[1]) * u0], B = [p[0] + (q[0] - p[0]) * u1, p[1] + (q[1] - p[1]) * u1];
      S.beam([A[0], yb0 + 0.1, A[1]], [B[0], yb1 - 0.08, B[1]], 0.04, 0.06, WHITE);
      S.beam([A[0], yb1 - 0.08, A[1]], [B[0], yb0 + 0.1, B[1]], 0.04, 0.06, WHITE);
    }
  }

  // the upper storey: a small rectangle, longer across the axis, white posts over a panelled dado, a frieze with the
  // name plaques front and back, the dark inside behind
  const WU = 3.0, DU = 2.4, yu0 = yb0 + 0.1, yu1 = yu0 + 1.35; // across, along, floor and eave
  const atU = (a, b) => at(a, b);
  S.kind = KIND.CIVIC;
  S.box(c[0], c[1], yu0, yu1, DU - 0.3, WU - 0.3, fa, SHADOW);
  S.kind = KIND.PLAIN;
  for (const sa of [-1, 1]) for (const sb of [-1, -0.33, 0.33, 1]) {
    const q = atU(sa * DU / 2, sb * WU / 2);
    S.box(q[0], q[1], yu0, yu1, 0.2, 0.2, fa, WHITE);
  }
  for (const sb of [-1, 1]) { const q = atU(0, sb * WU / 2); S.box(q[0], q[1], yu0, yu1, 0.2, 0.2, fa, WHITE); }
  S.box(c[0], c[1], yu0, yu0 + 0.4, DU + 0.04, WU + 0.04, fa, WHITE); // the panelled dado
  for (const sa of [-1, 1]) for (const sb of [-0.66, 0, 0.66]) { // its sunk panels
    const q = atU(sa * (DU / 2 + 0.03), sb * WU / 2);
    S.box(q[0], q[1], yu0 + 0.08, yu0 + 0.32, 0.02, 0.8, fa, shade(WHITE, 0.86));
  }
  S.box(c[0], c[1], yu1 - 0.32, yu1, DU + 0.06, WU + 0.06, fa, WHITE); // the frieze
  for (const sa of [-1, 1]) for (const sb of [-0.3, 0.3]) { // the name plaques
    const q = atU(sa * (DU / 2 + 0.04), sb * WU / 2);
    S.box(q[0], q[1], yu1 - 0.62, yu1 - 0.36, 0.03, 0.62, fa, hex('#6e5a3a'));
  }

  // second roof: a hipped roof over the rectangle, its straight ridge across the axis; a dragon at each end of the
  // ridge and a flaming pearl in the middle; the four corners slightly lifted, with slim tips
  {
    const hw = WU / 2 + 0.75, hd = DU / 2 + 0.7, rl = 1.3, yE = yu1, yR = yu1 + 0.78, lift = 0.16;
    const U = (b, a, y) => { const q = at(a, b); return [q[0], y, q[1]]; }; // b across (along the ridge), a along the axis
    const E = [U(-hw, -hd, yE + lift), U(hw, -hd, yE + lift), U(hw, hd, yE + lift), U(-hw, hd, yE + lift)];
    const Em = [U(0, -hd, yE), U(0, hd, yE)]; // the eave dips to the middle of each long side
    const R = [U(-rl, 0, yR), U(rl, 0, yR)];
    S.kind = KIND.TIMBER;
    S.quad(...E.map((p) => [p[0], p[1] - 0.02, p[2]]), SOFFIT, [0, -1, 0]); // the soffit, seen from below
    S.kind = KIND.TILE;
    const up = (dx, dz): [number, number, number] => [dx, 1.4, dz];
    // front and back slopes, each in two halves so the eave sags to the middle
    S.quad(E[0], Em[0], [ (R[0][0] + R[1][0]) / 2, yR, (R[0][2] + R[1][2]) / 2 ], R[0], ROOF, up(-fx, -fz));
    S.quad(Em[0], E[1], R[1], [(R[0][0] + R[1][0]) / 2, yR, (R[0][2] + R[1][2]) / 2], ROOF, up(-fx, -fz));
    S.quad(E[2], Em[1], [(R[0][0] + R[1][0]) / 2, yR, (R[0][2] + R[1][2]) / 2], R[1], ROOF, up(fx, fz));
    S.quad(Em[1], E[3], R[0], [(R[0][0] + R[1][0]) / 2, yR, (R[0][2] + R[1][2]) / 2], ROOF, up(fx, fz));
    S.tri(E[3], E[0], R[0], ROOF, up(-px, -pz)); // the two hipped ends
    S.tri(E[1], E[2], R[1], ROOF, up(px, pz));
    // the eave's white fascia
    S.kind = KIND.PLAIN;
    for (const [p, q] of ([[E[0], Em[0]], [Em[0], E[1]], [E[1], E[2]], [E[2], Em[1]], [Em[1], E[3]], [E[3], E[0]]] as any[])) {
      S.beam([p[0], p[1] - 0.05, p[2]], [q[0], q[1] - 0.05, q[2]], 0.08, 0.12, WHITE);
    }
    // ridge and hips, white
    S.beam([R[0][0], yR + 0.06, R[0][2]], [R[1][0], yR + 0.06, R[1][2]], 0.16, 0.2, RIDGE);
    for (let i = 0; i < 4; i++) {
      const r = R[i === 0 || i === 3 ? 0 : 1], e = E[i];
      S.beam([r[0], yR + 0.04, r[2]], [e[0], e[1] + 0.05, e[2]], 0.1, 0.12, RIDGE);
      const dx = e[0] - r[0], dz = e[2] - r[2], l = Math.hypot(dx, dz);
      tip([e[0], e[1] + 0.05, e[2]], dx / l, dz / l, 0.8);
    }
    // a dragon at each end of the ridge: a body arching up and in, the head turned toward the middle, a tail curl
    for (const s of [-1, 1]) {
      const B = (b, y?) => U(s * b, 0, yR + y);
      S.beam(B(rl + 0.05, 0.12), B(rl - 0.15, 0.48), 0.1, 0.14, RIDGE); // the tail rising from the ridge end
      S.beam(B(rl - 0.15, 0.48), B(rl - 0.45, 0.42), 0.09, 0.12, RIDGE); // the neck
      const h = B(rl - 0.55, 0.36);
      S.box(h[0], h[2], h[1] - 0.06, h[1] + 0.1, 0.07, 0.2, fa, RIDGE); // the head
      S.beam(B(rl + 0.05, 0.12), B(rl + 0.18, 0.32), 0.06, 0.08, RIDGE); // the tail's curl
    }
    // the flaming pearl in the middle of the ridge, on a small base
    const m = at(0, 0);
    S.box(m[0], m[1], yR + 0.12, yR + 0.24, 0.22, 0.5, fa, RIDGE);
    S.cyl(m[0], m[1], yR + 0.24, yR + 0.56, 0.17, 0.12, 8, RIDGE, { rot: fa });
    S.cyl(m[0], m[1], yR + 0.56, yR + 0.72, 0.12, 0.02, 6, RIDGE, { rot: fa });
    for (const s of [-1, 1]) { // its flames, thin plates either side
      const q = at(0, s * 0.3);
      S.box(q[0], q[1], yR + 0.2, yR + 0.46, 0.03, 0.16, fa, RIDGE);
    }
  }
  // the base, the terrace, their stairs and the pavilion's floor are paved: no trees or houses on them
  (S.paved = S.paved || []).push([n0, S.n]);

  // ---- toward the river: past the terrace, a short flight between two cheek blocks down to a paved disc ----
  // (satellite: a three-quarter disc about 11 m in radius, its centre about 19.5 m from the pavilion's)
  paved(() => {
    S.kind = KIND.MASONRY;
    for (const s2 of [-1, 1]) { // the cheek blocks
      const q = at(TA + 1.2, s2 * 3.9);
      S.box(q[0], q[1], g - 0.2, gt + 0.25, 3.2, 0.9, fa, WHITE, { top: shade(WHITE, 0.94) });
    }
    for (let k = 0; k < 2; k++) { // the steps down from the terrace
      const q = at(TA + 0.3 + k * 0.4, 0);
      S.box(q[0], q[1], g - 0.2, gt - (gt - g - 0.22) * (k + 1) / 3, 0.4, 6.9, fa, shade(KERB, k % 2 ? 1.0 : 1.06), { topKind: KIND.ROAD });
    }
  });
  {
    const np = S.n, AD = 19.5, RD = 11.0, cut = TA + 1.1, pts = [];
    // the disc, cut off on the terrace side where it meets the flight
    const t0 = Math.acos((cut - AD) / RD);
    for (let k = 0; k <= 32; k++) { const t = -t0 + (k / 32) * 2 * t0; pts.push(at(AD + Math.cos(t) * RD, Math.sin(t) * RD)); }
    S.kind = KIND.MASONRY;
    S.prism(pts, g - 0.2, g + 0.22, KERB, PAVE, { topKind: KIND.ROAD }); // a kerb's height: the park's trees keep off it
    const rr = []; // a ring of darker stone, as the satellite shows
    for (let k = 0; k <= 32; k++) { const t = -t0 + 0.12 + (k / 32) * (2 * t0 - 0.24); rr.push(at(AD + Math.cos(t) * (RD - 2.6), Math.sin(t) * (RD - 2.6))); }
    for (let k = 0; k < 32; k++) S.beam([rr[k][0], g + 0.22, rr[k][1]], [rr[k + 1][0], g + 0.22, rr[k + 1][1]], 0.25, 0.04, INLAY);
    (S.paved = S.paved || []).push([np, S.n]);
  }

  // ---- the gate on the pavement at the court's road end: two pairs of lotus-topped pillars ----
  // Laid from the satellite, where the four base blocks show at ground level (no parallax): 44.85 m up the axis, the
  // pairs' centres 16 m apart, the opening 11.1 m and each pair 4.9 m between centres. Heights from the pillars'
  // angular size in the Street View car panoramas at these distances: about 7.9 m overall for the inner pillars and
  // 5.9 m for the outer, the pierced panel joining each pair at 4.4–5.3 m. A low stone threshold carries the gate
  // (the street's trees stand outside the pairs, the opening is clear).
  {
    const aG = -44.85, bG = 0.8, BI = 5.55, BO = 10.48, HI = 6.95, HO = 4.95;
    paved(() => {
      const q = at(aG, bG);
      S.kind = KIND.MASONRY;
      S.box(q[0], q[1], LAND_Y + rise(q[0], q[1]) - 0.3, LAND_Y + rise(q[0], q[1]) + 0.22, 3.4, 2 * BO + 2.6, fa, KERB, { top: PAVE, topKind: KIND.ROAD });
    });
    const pillar = (b, w, h?) => {
      const q = at(aG, b), gq = LAND_Y + rise(q[0], q[1]) + 0.22;
      S.kind = KIND.PLAIN; // smooth white stucco, as in the photos (no block texture)
      S.box(q[0], q[1], gq - 0.2, gq + 0.4, w + 0.3, w + 0.3, fa, WHITE);
      S.box(q[0], q[1], gq + 0.4, gq + h, w, w, fa, WHITE);
      S.box(q[0], q[1], gq + h, gq + h + 0.2, w + 0.18, w + 0.18, fa, WHITE);
      for (const sg of [-1, 1]) { // the couplets on the road and court faces
        const r = at(aG + sg * (w / 2 + 0.01), b);
        S.box(r[0], r[1], gq + 0.9, gq + h - 0.5, 0.03, w * 0.45, fa, COUPLET);
      }
      S.kind = KIND.GLAZED;
      S.cyl(q[0], q[1], gq + h + 0.2, gq + h + 0.4, w * 0.25, w * 0.4, 8, WHITE, { rot: fa });
      S.cyl(q[0], q[1], gq + h + 0.4, gq + h + 0.7, w * 0.4, w * 0.36, 8, WHITE, { rot: fa });
      S.cyl(q[0], q[1], gq + h + 0.7, gq + h + 0.95, w * 0.36, 0.04, 8, WHITE, { rot: fa }); // the lotus bud
      return gq;
    };
    for (const s of [-1, 1]) {
      const bi = bG + s * BI, bo = bG + s * BO;
      const gi = pillar(bi, 1.0, HI);
      pillar(bo, 0.8, HO);
      // the pierced panel between the pair
      const m = at(aG, (bi + bo) / 2), len = Math.abs(bo - bi) - 0.9;
      S.kind = KIND.PLAIN;
      S.box(m[0], m[1], gi + 4.4, gi + 5.3, 0.05, len, fa, shade(WHITE, 0.82));
      S.box(m[0], m[1], gi + 5.25, gi + 5.4, 0.2, len, fa, WHITE);
      S.box(m[0], m[1], gi + 4.3, gi + 4.44, 0.2, len, fa, WHITE);
      // scrolled openwork: a run of white rings and a rail through them
      S.box(m[0], m[1], gi + 4.8, gi + 4.9, 0.12, len, fa, WHITE);
      for (let i = 0; i < 5; i++) {
        const r = at(aG, Math.min(bi, bo) + 0.45 + (i + 0.5) * (len / 5));
        S.box(r[0], r[1], gi + 4.5, gi + 5.2, 0.1, 0.1, fa, WHITE);
        S.box(r[0], r[1], gi + 4.74, gi + 4.96, 0.1, len / 5 - 0.1, fa, WHITE);
      }
      // the crest over the panel, stepping up toward the inner pillar
      const k = at(aG, bi - s * (0.5 + len * 0.2));
      S.box(k[0], k[1], gi + 5.4, gi + 5.75, 0.1, len * 0.4, fa, WHITE);
      lantern(at(aG, bi), gi + HI + 1.25);
    }
  }

  // ---- night: a strip under the lower eave, lamps on the base's corners and at the foot of the stairs ----
  {
    const y = yr1 - 0.04, r = oct(A1 + 0.5);
    for (let k = 0; k < 8; k++) {
      const t0 = rot + (k / 8) * Math.PI * 2, t1 = rot + ((k + 1) / 8) * Math.PI * 2;
      L.beam([c[0] + Math.cos(t0) * r, y, c[1] + Math.sin(t0) * r], [c[0] + Math.cos(t1) * r, y, c[1] + Math.sin(t1) * r], 0.12, 0.09, [1, 1, 1]);
    }
  }
  for (const sa of [-1, 1]) for (const sb of [-1, 1]) lantern(at(sa * ha, sb * hb), y0 + 1.0);
  for (const s2 of [-1, 1]) {
    lantern(at(-(BL / 2 + run + 0.1), s2 * (sw / 2 + 0.18)), gc + 0.75);
    lantern(at(BL / 2 + runB + 0.1, s2 * (sw / 2 + 0.18)), gt + 0.75);
  }

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
