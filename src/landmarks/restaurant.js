import * as THREE from 'three';
import { Buf, KIND, hex, mix, shade, span } from '../geo/buf.js';
import { lightMaterial } from '../geo/materials.js';

// ---- Nhà hàng nổi Sông Hương: the lotus-shaped floating restaurant beside cầu Trường Tiền, south bank ----
//
// What the sources say (searched Nov 2026):
//  - khamphahue.com.vn (Huế's tourism portal), "Song Huong Floating Restaurant": on the Perfume River next to
//    Trường Tiền bridge, at công viên 3/2; run by Huế Tourism JSC; architecture "a lotus flower symbolizing elegance
//    and grace"; "modern and harmonious"; over 350 seats; an open plan with a 360-degree view of the river and bridge.
//  - wanderlog.com/place/details/1411041 (reviews): a lotus-inspired look that people photograph; live music in
//    the evening.
//  - foody.vn, Tòa Khâm Cafe & Restaurant review: seen at night from across Lê Lợi as the "nhà hàng nổi hình hoa"
//    (the flower-shaped floating restaurant) beside the boat landing.
//  - OSM: the near-round footprint (about 30 m across) on the water, about 7 m off the south bank's park edge,
//    and two footbridges (gangways) from the park to its rim.
//
// NOT confirmed, filled in from the "lotus" description and the usual form of such buildings:
//  - the petal count and tiers (drawn as three rings: 12 low outer petals spread on the water, 12 taller ones
//    offset between them, 8 upright inner ones cupping the upper floor);
//  - the colours (white petals blushing pink toward the tips, as lotus are drawn in Huế), the glazed round
//    pavilion in two storeys, its tiered roof and the closed-bud finial;
//  - the night lighting (pink lines on the petal rims, warm light from the dining rooms);
// It is a modern building: it exists only in "today".

const NAME = 'Nhà hàng nổi Sông Hương';
export const isRestaurant = (b) => b && b[3] === NAME;

export function buildRestaurant(rec, data, S, group) {
  if (!rec) return null;
  try {
    return build(rec, data, S, group);
  } catch (e) {
    console.warn('Nhà hàng nổi not built:', e);
    return null;
  } finally {
    S.span = 0;
    S.kind = KIND.PLAIN;
    S.base = 0;
  }
}

function build(rec, data, S, group) {
  const flat = rec[0];
  const ring = [];
  for (let i = 0; i + 1 < flat.length; i += 2) ring.push([flat[i] / 10, flat[i + 1] / 10]);
  const c = ring.reduce((a, p) => [a[0] + p[0] / ring.length, a[1] + p[1] / ring.length], [0, 0]);
  const R = ring.reduce((a, p) => a + Math.hypot(p[0] - c[0], p[1] - c[1]), 0) / ring.length; // ~14.5 m

  S.span = span(2);
  S.kind = KIND.PLAIN;
  S.base = 0;

  const white = hex('#f4eee6'), cream = hex('#ece2d2'), pink = hex('#e58aac'), deep = hex('#c85f86');
  const hull = hex('#5d5853'), deck = hex('#b89e7f'), glass = hex('#27353b'), frame = hex('#ece6dc'), roof = hex('#a8434d');
  const rimPink = new Buf(1200), warm = new Buf(400); // night light strips

  // ---- pontoon and deck ----
  const Rp = R * 0.84;
  S.cyl(c[0], c[1], -0.9, 0.85, Rp + 0.15, Rp, 32, hull, { cap: false });
  S.cyl(c[0], c[1], 0.85, 0.95, Rp, Rp, 32, deck);
  for (let i = 0; i < 48; i++) {
    const a0 = (i / 48) * Math.PI * 2, a1 = ((i + 1) / 48) * Math.PI * 2;
    warm.beam([c[0] + Math.cos(a0) * (Rp + 0.08), 0.75, c[1] + Math.sin(a0) * (Rp + 0.08)], [c[0] + Math.cos(a1) * (Rp + 0.08), 0.75, c[1] + Math.sin(a1) * (Rp + 0.08)], 0.12, 0.12, [1, 1, 1]);
  }

  // ---- petals: three rings ----
  // ring: count, start radius, start height, length, angle at the base and at the tip (deg above horizontal,
  // > 90 curls inward), width factor, cup, angular offset, base and tip colour, light strip or not
  const rings = [
    { n: 12, r0: Rp - 1.2, y0: 0.7, L: R - Rp + 3.6, a0: 32, a1: -14, wk: 1.25, cup: 0.32, off: 0, c0: cream, c1: pink, lit: false },
    { n: 12, r0: Rp - 3.4, y0: 0.9, L: 7.6, a0: 66, a1: 6, wk: 1.18, cup: 0.38, off: 0.5, c0: white, c1: pink, lit: true },
    { n: 8, r0: 7.0, y0: 1.0, L: 8.4, a0: 82, a1: 34, wk: 1.12, cup: 0.42, off: 0.25, c0: white, c1: mix(pink, white, 0.25), lit: true },
  ];
  for (const g of rings) {
    for (let k = 0; k < g.n; k++) {
      const th = ((k + g.off) / g.n) * Math.PI * 2;
      petal(S, c, th, g, g.lit ? rimPink : null, deep);
    }
  }

  // ---- the pavilion: glazed ground floor, balcony slab, glazed upper floor ----
  const glassBand = (r, y0, y1, posts) => {
    S.cyl(c[0], c[1], y0, y1, r, r, 24, glass, { cap: false });
    for (let i = 0; i < posts; i++) {
      const a = (i / posts) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      S.beam([c[0] + ca * (r + 0.06), y0, c[1] + sa * (r + 0.06)], [c[0] + ca * (r + 0.06), y1, c[1] + sa * (r + 0.06)], 0.22, 0.22, frame);
    }
    S.cyl(c[0], c[1], y0, y0 + 0.5, r + 0.08, r + 0.08, 24, frame, { cap: false }); // a low parapet behind the glass
    warm.cyl(c[0], c[1], y0 + 0.6, y1 - 0.25, r + 0.03, r + 0.03, 24, [1, 1, 1], { cap: false });
  };
  glassBand(5.6, 0.95, 4.1, 16);
  S.cyl(c[0], c[1], 4.1, 4.5, 6.3, 6.3, 32, frame); // balcony slab (its top is the upper floor's terrace)
  soffit(S, c, 4.1, 6.3, 5.6, shade(frame, 0.6));
  for (let i = 0; i < 64; i++) {
    const a0 = (i / 64) * Math.PI * 2, a1 = ((i + 1) / 64) * Math.PI * 2;
    S.beam([c[0] + Math.cos(a0) * 6.2, 5.4, c[1] + Math.sin(a0) * 6.2], [c[0] + Math.cos(a1) * 6.2, 5.4, c[1] + Math.sin(a1) * 6.2], 0.08, 0.08, frame);
  }
  glassBand(4.5, 4.5, 7.3, 12);
  // the roof: a flared first tier on a white eave, a glazed lantern drum, a second tier, and a lotus bud on top
  S.cyl(c[0], c[1], 7.3, 7.65, 5.6, 5.6, 32, frame);
  soffit(S, c, 7.3, 5.6, 4.5, shade(frame, 0.6));
  S.kind = KIND.TILE;
  flaredCone(S, c, 7.65, 9.3, 6.0, 2.1, 0.45, roof);
  S.kind = KIND.PLAIN;
  S.cyl(c[0], c[1], 9.2, 10.0, 2.0, 2.0, 16, glass, { cap: false });
  warm.cyl(c[0], c[1], 9.3, 9.9, 2.03, 2.03, 16, [1, 1, 1], { cap: false });
  S.kind = KIND.TILE;
  flaredCone(S, c, 10.0, 10.9, 2.8, 0.7, 0.25, roof);
  S.kind = KIND.PLAIN;
  for (let k = 0; k < 6; k++) {
    petal(S, c, (k / 6) * Math.PI * 2, { r0: 0.25, y0: 10.75, L: 2.0, a0: 70, a1: 118, wk: 1.6, cup: 0.3, c0: white, c1: pink }, null, deep);
  }

  // (the two gangways to the bank are mapped in OSM as footbridges and drawn with the city's other bridges)

  const strips = [];
  for (const [B, colr, boost] of [[rimPink, 0xff86c8, 1.3], [warm, 0xffd49a, 0.7]]) {
    if (!B.n) continue;
    const m = new THREE.Mesh(B.geometry(), lightMaterial(colr, boost));
    m.renderOrder = 19;
    m.userData.minEra = 2;
    group.add(m);
    strips.push(m);
  }
  return { centre: c, radius: R, strips };
}

// One petal, lofted: a centre line that leaves the base at angle a0 and bends to a1 at the tip (in the vertical
// plane through the axis), a width that swells and comes to a point, and a cupped cross-section (edges lifted
// toward the inner face). Both faces are drawn, smooth-shaded, white at the base and blushing toward the tip.
function petal(S, c, th, g, rim, deep) {
  const NV = 12, NU = 6;
  const e = [Math.cos(th), Math.sin(th)], tg = [-e[1], e[0]];
  const d2r = Math.PI / 180;
  // centre line in (radial, up)
  const line = [[g.r0, g.y0]], ang = [g.a0 * d2r];
  for (let i = 1; i <= NV; i++) {
    const v = (i - 0.5) / NV;
    const a = (g.a0 + (g.a1 - g.a0) * Math.pow(v, 1.4)) * d2r;
    const p = line[i - 1];
    line.push([p[0] + Math.cos(a) * (g.L / NV), p[1] + Math.sin(a) * (g.L / NV)]);
    ang.push(a);
  }
  const front = [], nf = [], cols = [];
  for (let i = 0; i <= NV; i++) {
    const v = i / NV;
    const a = i === 0 ? ang[0] : i === NV ? ang[NV] : (ang[i] + ang[i + 1]) / 2;
    const inN = [-Math.sin(a), Math.cos(a)]; // toward the axis and up: the petal's inner side
    const rho = line[i][0];
    // half width: the ring's share of the circumference at this radius, shaped to a pointed tip
    const share = (Math.PI * Math.max(rho, g.r0 + 0.5)) / (g.n || 6);
    const hw = Math.min(share * g.wk, 3.4) * Math.pow(Math.sin(Math.PI * (0.14 + 0.86 * v) ** 0.85), 0.9);
    const row = [], col = mix(g.c0, g.c1, Math.pow(v, 1.7));
    for (let j = 0; j <= NU; j++) {
      const u = (j / NU) * 2 - 1;
      const off = g.cup * hw * u * u;
      const r = rho + inN[0] * off, y = line[i][1] + inN[1] * off;
      row.push([c[0] + e[0] * r + tg[0] * u * hw, y, c[1] + e[1] * r + tg[1] * u * hw]);
    }
    front.push(row);
    cols.push(col);
  }
  // inner-side reference direction per row, for orienting normals
  const inner = (i) => { const a = ang[Math.min(i, NV)]; return [-Math.sin(a) * e[0], Math.cos(a), -Math.sin(a) * e[1]]; };
  for (let i = 0; i <= NV; i++) {
    const row = [];
    for (let j = 0; j <= NU; j++) {
      const pu = front[i][Math.min(j + 1, NU)], mu = front[i][Math.max(j - 1, 0)];
      const pv = front[Math.min(i + 1, NV)][j], mv = front[Math.max(i - 1, 0)][j];
      const du = [pu[0] - mu[0], pu[1] - mu[1], pu[2] - mu[2]], dv = [pv[0] - mv[0], pv[1] - mv[1], pv[2] - mv[2]];
      let n = [du[1] * dv[2] - du[2] * dv[1], du[2] * dv[0] - du[0] * dv[2], du[0] * dv[1] - du[1] * dv[0]];
      const l = Math.hypot(n[0], n[1], n[2]);
      // at the pointed tip the row collapses to a point: borrow the row below (a zero normal turns into NaN in the
      // shader, and the bloom pass spreads one NaN pixel over the whole screen)
      if (l < 1e-6) { row.push(i > 0 ? nf[i - 1][j] : inner(i)); continue; }
      n = [n[0] / l, n[1] / l, n[2] / l];
      const ref = inner(i);
      if (n[0] * ref[0] + n[1] * ref[1] + n[2] * ref[2] < 0) n = [-n[0], -n[1], -n[2]];
      row.push(n);
    }
    nf.push(row);
  }
  const TH = 0.12;
  const back = front.map((row, i) => row.map((p, j) => [p[0] - nf[i][j][0] * TH, p[1] - nf[i][j][1] * TH, p[2] - nf[i][j][2] * TH]));
  const neg = (n) => [-n[0], -n[1], -n[2]];
  const tri = (P, N, C) => {
    // keep the winding in step with the normals (the city material draws front faces only)
    const u = [P[1][0] - P[0][0], P[1][1] - P[0][1], P[1][2] - P[0][2]], w = [P[2][0] - P[0][0], P[2][1] - P[0][1], P[2][2] - P[0][2]];
    const g0 = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const s = N[0][0] + N[1][0] + N[2][0], t = N[0][1] + N[1][1] + N[2][1], q = N[0][2] + N[1][2] + N[2][2];
    if (g0[0] * s + g0[1] * t + g0[2] * q < 0) S.smoothTri([P[0], P[2], P[1]], [N[0], N[2], N[1]], [C[0], C[2], C[1]]);
    else S.smoothTri(P, N, C);
  };
  const backCol = cols.map((cl) => shade(mix(cl, deep, 0.35), 0.92));
  for (let i = 0; i < NV; i++) {
    for (let j = 0; j < NU; j++) {
      const a = [i, j], b = [i, j + 1], cc = [i + 1, j + 1], dd = [i + 1, j];
      for (const [G, N, CC, flip] of [[front, nf, cols, false], [back, nf, backCol, true]]) {
        const P = (k) => G[k[0]][k[1]], Nn = (k) => (flip ? neg(N[k[0]][k[1]]) : N[k[0]][k[1]]), Cc = (k) => CC[k[0]];
        tri([P(a), P(b), P(cc)], [Nn(a), Nn(b), Nn(cc)], [Cc(a), Cc(b), Cc(cc)]);
        tri([P(a), P(cc), P(dd)], [Nn(a), Nn(cc), Nn(dd)], [Cc(a), Cc(cc), Cc(dd)]);
      }
    }
    // the two edges: a thin rim joining the faces
    for (const j of [0, NU]) {
      const out = [front[i][j][0] - front[i][NU / 2][0], 0, front[i][j][2] - front[i][NU / 2][2]];
      S.quad(front[i][j], front[i + 1][j], back[i + 1][j], back[i][j], shade(cols[i], 0.85), out);
    }
  }
  if (rim) {
    for (const j of [0, NU]) {
      for (let i = Math.floor(NV * 0.25); i < NV; i++) {
        const p = front[i][j], q = front[i + 1][j];
        rim.beam([p[0], p[1] + 0.04, p[2]], [q[0], q[1] + 0.04, q[2]], 0.1, 0.1, [1, 1, 1]);
      }
    }
  }
}

// The underside of a round slab: a downward-facing ring between radii r0 (outer) and r1.
function soffit(S, c, y, r0, r1, col) {
  const SEG = 32;
  for (let i = 0; i < SEG; i++) {
    const a0 = (i / SEG) * Math.PI * 2, a1 = ((i + 1) / SEG) * Math.PI * 2;
    const P = (a, r) => [c[0] + Math.cos(a) * r, y, c[1] + Math.sin(a) * r];
    S.quad(P(a0, r0), P(a1, r0), P(a1, r1), P(a0, r1), col, [0, -1, 0]);
  }
}

// A round roof tier whose eave turns up a little (the curve of a Huế roof, drawn in the round).
function flaredCone(S, c, y0, y1, r0, r1, flare, col) {
  const SEG = 32, ROWS = 4;
  const at = (a, t) => {
    const r = r0 + (r1 - r0) * t;
    const y = y0 + (y1 - y0) * Math.pow(t, 0.75) + flare * (1 - t) ** 3;
    return [c[0] + Math.cos(a) * r, y, c[1] + Math.sin(a) * r];
  };
  for (let i = 0; i < SEG; i++) {
    const a0 = (i / SEG) * Math.PI * 2, a1 = ((i + 1) / SEG) * Math.PI * 2, am = (a0 + a1) / 2;
    for (let k = 0; k < ROWS; k++) {
      const t0 = k / ROWS, t1 = (k + 1) / ROWS;
      S.quad(at(a0, t0), at(a1, t0), at(a1, t1), at(a0, t1), col, [Math.cos(am), 0.8, Math.sin(am)]);
    }
    // soffit under the eave
    S.quad(at(a0, 0), at(a1, 0), [c[0] + Math.cos(a1) * r1, y0, c[1] + Math.sin(a1) * r1], [c[0] + Math.cos(a0) * r1, y0, c[1] + Math.sin(a0) * r1], shade(col, 0.5), [0, -1, 0]);
  }
  S.cyl(c[0], c[1], y1, y1 + 0.01, r1, r1, SEG, col);
}
