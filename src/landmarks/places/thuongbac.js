import { KIND, Buf, hex, shade } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { lightMaterial, glowPoints } from '../../geo/materials.js';

// Thương Bạc (商舶), the Nguyễn court's office for foreign trade and envoys, on the Hương's north bank by Trần Hưng
// Đạo street, in công viên Thương Bạc. First built 1870 (Tự Đức); rebuilt 1921 (Khải Định) as an octagonal pavilion
// (lầu bát giác) of cement and reinforced concrete on a square base 1.3 m high, ringed by solid railings with the
// name "Thương Bạc" in relief on the front and back. Sources, estimates and the photo audit: docs/places/thuongbac.md.
//
// What stands there now (satellite and Street View, 2024-2026): an open two-tier pavilion, white columns and white
// pierced railings under weathered brown-ochre tiles and white ridges, on a railed base with a flight front and back.
// Its front faces north-west, up a long paved court to the road, where two pairs of lotus-topped gate pillars stand
// on the pavement; behind it, toward the river, a paved half-disc. The 1921 ponds, rockeries and dragons are not
// there any more and are not drawn.
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
// the base: along the axis, across it (satellite, 0.14 m/px), height (sourced, 1921)
const BL = 14.4, BW = 12.8, BH = 1.3;

const ROOF = hex('#9a7658'); // glazed tiles weathered to a brown ochre (satellite and night photo)
const RIDGE = hex('#eee8dc'); // white stucco ridges and crests
const WHITE = hex('#efece4'); // columns, railings, gate pillars
const SHADOW = hex('#3b3631'); // the dark behind pierced work
const PLASTER = hex('#ebe5d6'); // the base's faces: white-washed, creamy under the night lamps
const KERB = hex('#7f8280'); // bluestone kerbs and steps
const FLOOR = hex('#c9bca0');
const PAVE = hex('#b9b2a6'); // pale grey stone slabs
const SOFFIT = hex('#d9cdb4');
const COUPLET = hex('#d8b24a'); // the yellow couplet panels on the gate pillars
const LANTERN = [1.0, 0.74, 0.38];

export function build({ data, S, group, place, THREE }) {
  // keep the re-framed centre unless the place record sits far from it
  const cR = [C0[0] + SHIFT[0], C0[1] + SHIFT[1]];
  const c = place && Math.hypot(place.x - cR[0], place.z - cR[1]) > 8 ? [place.x, place.z] : cR;
  const [fx, fz] = AX, px = -fz, pz = fx; // f: toward the river (the back); p: along the bank
  const fa = Math.atan2(fz, fx);
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
  S.box(c[0], c[1], g - 0.4, g + 0.2, BL + 0.3, BW + 0.3, fa, KERB, { topKind: KIND.ROAD });
  S.box(c[0], c[1], g + 0.2, y0 - 0.15, BL, BW, fa, PLASTER);
  S.box(c[0], c[1], y0 - 0.15, y0, BL + 0.16, BW + 0.16, fa, shade(PLASTER, 1.08), { top: FLOOR, topKind: KIND.ROAD });

  // flights up the front (court) and back (river) faces between low cheek walls
  const ns = 5, sr = BH / ns, st = 0.36, sw = 3.4;
  const run = st * (ns - 1);
  for (const sg of [-1, 1]) {
    S.kind = KIND.MASONRY;
    for (let k = 1; k < ns; k++) {
      const q = at(sg * (BL / 2 + st * (k - 0.5)), 0);
      S.box(q[0], q[1], g - 0.2, y0 - sr * k, st, sw, fa, shade(KERB, k % 2 ? 1.06 : 1.0), { topKind: KIND.ROAD });
    }
    S.kind = KIND.PLAIN;
    for (const s2 of [-1, 1]) {
      const a = at(sg * (BL / 2 - 0.1), s2 * (sw / 2 + 0.2)), b = at(sg * (BL / 2 + run + 0.1), s2 * (sw / 2 + 0.2));
      S.beam([a[0], y0 + 0.2, a[1]], [b[0], g + 0.35, b[1]], 0.34, 0.5, WHITE);
      const q = at(sg * (BL / 2 + run + 0.1), s2 * (sw / 2 + 0.2));
      S.box(q[0], q[1], g, g + 0.75, 0.42, 0.42, fa, WHITE);
    }
  }

  // the railing: white posts, rails and pierced fret panels round the edge, broken at the stairs
  const rail = (a0, b0, a1, b1) => {
    const p = at(a0, b0), q = at(a1, b1), len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
    const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    S.box(m[0], m[1], y0, y0 + 0.16, len, 0.22, ang, WHITE); // the plinth course
    S.box(m[0], m[1], y0 + 0.66, y0 + 0.78, len + 0.06, 0.24, ang, WHITE); // the hand rail
    S.box(m[0], m[1], y0 + 0.16, y0 + 0.66, len, 0.05, ang, SHADOW); // the dark behind the fretwork
    const nb = Math.max(1, Math.round(len / 1.6));
    for (let i = 0; i <= nb; i++) { // posts
      const t = i / nb, x = p[0] + (q[0] - p[0]) * t, z = p[1] + (q[1] - p[1]) * t;
      S.box(x, z, y0, y0 + 0.9, 0.26, 0.26, ang, WHITE);
    }
    for (let i = 0; i < nb; i++) { // in each bay a fret: a frame with an inner lozenge of bars
      const t = (i + 0.5) / nb, x = p[0] + (q[0] - p[0]) * t, z = p[1] + (q[1] - p[1]) * t, bl = len / nb - 0.3;
      S.box(x, z, y0 + 0.38, y0 + 0.44, bl, 0.1, ang, WHITE);
      for (const s of [-1, 1]) {
        const u = [Math.cos(ang) * s * bl * 0.25, Math.sin(ang) * s * bl * 0.25];
        S.box(x + u[0], z + u[1], y0 + 0.16, y0 + 0.66, 0.07, 0.1, ang, WHITE);
      }
    }
  };
  S.kind = KIND.PLAIN;
  const ha = BL / 2 - 0.15, hb = BW / 2 - 0.15, gap = sw / 2 + 0.2;
  for (const sg of [-1, 1]) {
    rail(sg * ha, -hb, sg * ha, -gap); rail(sg * ha, gap, sg * ha, hb); // front and back faces, each side of the stair
    rail(-ha, sg * hb, ha, sg * hb); // the two sides
  }
  // "Thương Bạc" cast in relief on the front and back: a raised tablet in the railing beside each stair
  for (const sg of [-1, 1]) for (const s2 of [-1, 1]) {
    const q = at(sg * (ha + 0.02), s2 * (gap + 1.3));
    S.box(q[0], q[1], y0 + 0.18, y0 + 0.62, 0.14, 1.6, fa, WHITE);
    const r = at(sg * (ha + 0.1), s2 * (gap + 1.3));
    S.box(r[0], r[1], y0 + 0.26, y0 + 0.54, 0.04, 1.3, fa, hex('#8a5a2c'));
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
      const along = (w) => [m[0] - sn * s * w, m[1] + ct * s * w];
      let e = along(0.85); S.box(e[0], e[1], yf + HQ - 0.75, yf + HQ - 0.3, 0.12, 0.5, t, WHITE);
      e = along(0.97); S.box(e[0], e[1], yf + HQ - 1.15, yf + HQ - 0.75, 0.12, 0.26, t, WHITE);
    }
  }

  // first roof: from the column heads, curving out to lifted corners, up to the pierced band of the upper storey
  const yr1 = yf + H1, AE = A1 + 0.7, AB = 2.8; // eave and band apothems
  S.kind = KIND.PLAIN;
  S.cyl(c[0], c[1], yr1, yr1 + 0.22, oct(A1 + 0.2), oct(A1 + 0.2), 8, WHITE, { rot, cap: false }); // fascia
  const ring = (a, k0 = 0) => { const r = []; for (let k = 0; k < 8; k++) { const t = rot + ((k + k0) / 8) * Math.PI * 2; r.push([c[0] + Math.cos(t) * oct(a), c[1] + Math.sin(t) * oct(a)]); } return r; };
  S.kind = KIND.TIMBER;
  S.prism(ring(AE - 0.05), yr1 + 0.12, yr1 + 0.18, SOFFIT, SOFFIT); // soffit
  S.kind = KIND.TILE;
  S.cyl(c[0], c[1], yr1 + 0.1, yr1 + 0.42, oct(AE), oct(A1 + 0.1), 8, ROOF, { rot, cap: false });
  S.cyl(c[0], c[1], yr1 + 0.42, yr1 + 1.12, oct(A1 + 0.1), oct(AB), 8, ROOF, { rot, cap: false });
  // its hip ridges, white, ending in upturned curled tips (đầu đao)
  S.kind = KIND.PLAIN;
  for (let k = 0; k < 8; k++) {
    const t = rot + (k / 8) * Math.PI * 2, ct = Math.cos(t), sn = Math.sin(t);
    const P = (r, y) => [c[0] + ct * r, y, c[1] + sn * r];
    S.beam(P(oct(AB), yr1 + 1.16), P(oct(A1 + 0.1), yr1 + 0.48), 0.16, 0.18, RIDGE);
    S.beam(P(oct(A1 + 0.1), yr1 + 0.48), P(oct(AE), yr1 + 0.16), 0.16, 0.18, RIDGE);
    S.beam(P(oct(AE) - 0.05, yr1 + 0.16), P(oct(AE) + 0.35, yr1 + 0.75), 0.14, 0.14, RIDGE);
    const e = P(oct(AE) + 0.32, yr1 + 0.78);
    S.box(e[0], e[2], e[1] - 0.05, e[1] + 0.22, 0.3, 0.12, t, RIDGE); // the curl
  }

  // the upper storey's pierced band (a white railing round the lower roof's top), then a short open storey
  const yb0 = yr1 + 1.05, yb1 = yb0 + 0.45;
  S.kind = KIND.PLAIN;
  S.cyl(c[0], c[1], yb0, yb1, oct(AB + 0.02), oct(AB + 0.02), 8, WHITE, { rot });
  for (let k = 0; k < 8; k++) {
    const t = fa + (k / 8) * Math.PI * 2, q = [c[0] + Math.cos(t) * (AB + 0.04), c[1] + Math.sin(t) * (AB + 0.04)];
    S.box(q[0], q[1], yb0 + 0.1, yb1 - 0.1, 0.03, 1.6, t, SHADOW); // the fret's dark
    for (const s of [-0.5, 0, 0.5]) { const r = [q[0] - Math.sin(t) * s, q[1] + Math.cos(t) * s]; S.box(r[0], r[1], yb0 + 0.1, yb1 - 0.1, 0.05, 0.08, t, WHITE); }
  }
  const A2 = 1.6, yu0 = yb1, yu1 = yu0 + 0.75; // the upper storey's posts and its height
  S.kind = KIND.CIVIC;
  S.cyl(c[0], c[1], yu0, yu1, oct(A2 - 0.25), oct(A2 - 0.25), 8, SHADOW, { rot, cap: false }); // the dark inside
  S.kind = KIND.PLAIN;
  for (let k = 0; k < 8; k++) {
    const t = rot + (k / 8) * Math.PI * 2, q = [c[0] + Math.cos(t) * oct(A2), c[1] + Math.sin(t) * oct(A2)];
    S.box(q[0], q[1], yu0, yu1, 0.22, 0.22, t, WHITE);
  }
  S.cyl(c[0], c[1], yu1 - 0.2, yu1, oct(A2 + 0.1), oct(A2 + 0.1), 8, WHITE, { rot, cap: false }); // the frieze
  for (let k = 0; k < 8; k += 4) { // a name plaque front and back
    const t = fa + Math.PI + (k / 8) * Math.PI * 2, q = [c[0] + Math.cos(t) * (A2 + 0.13), c[1] + Math.sin(t) * (A2 + 0.13)];
    S.box(q[0], q[1], yu0 + 0.15, yu1 - 0.25, 0.04, 0.9, t, hex('#6e5a3a'));
  }

  // second roof: eaves from the upper storey, up to a flat top with a crest and a flaming pearl
  const yr2 = yu1, AE2 = 2.5, AT = 1.0;
  S.kind = KIND.TIMBER;
  S.prism(ring(AE2 - 0.05), yr2 - 0.06, yr2, SOFFIT, SOFFIT);
  S.kind = KIND.TILE;
  S.cyl(c[0], c[1], yr2 - 0.05, yr2 + 0.25, oct(AE2), oct(A2 + 0.25), 8, ROOF, { rot, cap: false });
  S.cyl(c[0], c[1], yr2 + 0.25, yr2 + 1.05, oct(A2 + 0.25), oct(AT), 8, ROOF, { rot });
  S.kind = KIND.PLAIN;
  for (let k = 0; k < 8; k++) {
    const t = rot + (k / 8) * Math.PI * 2, ct = Math.cos(t), sn = Math.sin(t);
    const P = (r, y) => [c[0] + ct * r, y, c[1] + sn * r];
    S.beam(P(oct(AT), yr2 + 1.1), P(oct(A2 + 0.25), yr2 + 0.3), 0.13, 0.15, RIDGE);
    S.beam(P(oct(A2 + 0.25), yr2 + 0.3), P(oct(AE2), yr2 + 0.02), 0.13, 0.15, RIDGE);
    S.beam(P(oct(AE2) - 0.05, yr2 + 0.02), P(oct(AE2) + 0.28, yr2 + 0.5), 0.12, 0.12, RIDGE);
    const e = P(oct(AT) + 0.05, yr2 + 1.2); // a small ornament where each hip meets the top
    S.box(e[0], e[2], yr2 + 1.05, yr2 + 1.4, 0.18, 0.12, t, RIDGE);
  }
  const yt = yr2 + 1.05;
  S.cyl(c[0], c[1], yt, yt + 0.2, oct(AT + 0.05), oct(AT), 8, RIDGE, { rot }); // the crest's base
  { // the flaming pearl, a disc on the crest facing the front and back
    const q = at(0, 0);
    S.box(q[0], q[1], yt + 0.2, yt + 0.32, 0.25, 0.5, fa, RIDGE);
    S.cyl(q[0], q[1], yt + 0.32, yt + 0.8, 0.28, 0.18, 8, RIDGE, { rot: fa });
    S.cyl(q[0], q[1], yt + 0.8, yt + 0.98, 0.18, 0.02, 6, RIDGE, { rot: fa });
  }
  // the base, its stairs and the pavilion's floor are paved: no trees or houses on them
  (S.paved = S.paved || []).push([n0, S.n]);

  // ---- behind, toward the river: a paved half-disc, 21 m across ----
  {
    const np = S.n, a0 = BL / 2 + run + 0.6, RD = 10.5, pts = [];
    for (let k = 0; k <= 16; k++) { const t = -Math.PI / 2 + (k / 16) * Math.PI; pts.push(at(a0 + Math.cos(t) * RD, Math.sin(t) * RD)); }
    S.kind = KIND.MASONRY;
    S.prism(pts, g - 0.2, g + 0.06, KERB, PAVE, { topKind: KIND.ROAD });
    (S.paved = S.paved || []).push([np, S.n]);
  }

  // ---- the gate at the court's road end, 38 m up the axis: two pairs of lotus-topped pillars ----
  // Placed by crossing the bearings to each pillar from two Street View car panoramas on Trần Hưng Đạo (they agree
  // to within 0.5 m along the axis; a third panorama agrees to about 2°); heights and the pierced panel joining each
  // pair from the same views. The satellite shows the slender pillars leaning with parallax, about 7 m nearer the road.
  {
    const aG = -38.0, bG = 0.45;
    const pillar = (b, w, h) => {
      const q = at(aG, b), gq = LAND_Y + rise(q[0], q[1]);
      S.kind = KIND.PLAIN; // smooth white stucco, as in the photos (no block texture)
      S.box(q[0], q[1], gq - 0.2, gq + 0.4, w + 0.3, w + 0.3, fa, WHITE);
      S.box(q[0], q[1], gq + 0.4, gq + h, w, w, fa, WHITE);
      S.box(q[0], q[1], gq + h, gq + h + 0.2, w + 0.18, w + 0.18, fa, WHITE);
      S.kind = KIND.PLAIN;
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
      const bi = bG + s * 4.4, bo = bG + s * 8.8;
      const gi = pillar(bi, 1.0, 8.45);
      pillar(bo, 0.8, 6.55);
      // the pierced panel between the pair, high up
      const m = at(aG, (bi + bo) / 2), len = Math.abs(bo - bi) - 0.7;
      S.kind = KIND.PLAIN;
      S.box(m[0], m[1], gi + 5.3, gi + 6.5, 0.05, len, fa, shade(WHITE, 0.82));
      S.box(m[0], m[1], gi + 6.45, gi + 6.62, 0.2, len, fa, WHITE);
      S.box(m[0], m[1], gi + 5.2, gi + 5.34, 0.2, len, fa, WHITE);
      // scrolled openwork: a run of white rings and a rail through them, the dark showing through the gaps
      S.box(m[0], m[1], gi + 5.85, gi + 5.95, 0.12, len, fa, WHITE);
      for (let i = 0; i < 5; i++) {
        const r = at(aG, Math.min(bi, bo) + 0.35 + (i + 0.5) * ((len - 0.0) / 5));
        S.box(r[0], r[1], gi + 5.5, gi + 6.3, 0.1, 0.1, fa, WHITE);
        S.box(r[0], r[1], gi + 5.78, gi + 6.02, 0.1, len / 5 - 0.1, fa, WHITE);
      }
      S.box(m[0], m[1], gi + 5.34, gi + 5.42, 0.06, len, fa, SHADOW);
      lantern(at(aG, bi), gi + 9.7);
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
  for (const sa of [-1, 1]) for (const sb of [-1, 1]) lantern(at(sa * ha, sb * hb), y0 + 1.05);
  for (const sg of [-1, 1]) for (const s2 of [-1, 1]) lantern(at(sg * (BL / 2 + run + 0.1), s2 * (sw / 2 + 0.2)), g + 1.0);

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
