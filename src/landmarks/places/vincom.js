import * as THREE from 'three';
import { KIND, Buf, hex, shade } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { lightMaterial } from '../../geo/materials.js';

// Vincom Plaza Huế + Meliá Vinpearl Huế, 50A Hùng Vương (ngã sáu Hùng Vương, south bank). See docs/places/vincom.md.
//
// One block on one lot: a cream-stone shopping podium (Vincom Plaza, opened 2018) under a dark-blue glass hotel
// tower whose plan is a shallow V (Vinpearl Hotel Huế, now Meliá Vinpearl; 33 floors above ground, 213 rooms; 160 m
// and 39 levels in OSM and Wikipedia's list of the tallest buildings in Huế).
// What the photos show (Wikimedia Commons "Vincom Plaza Hue.jpg", 2018; "Huế 2024 - Vincom Plaza - img 01.jpg"):
//   podium   a dark brown granite ground storey; above it cream stone in tall bays between flat pilasters, each bay a
//            recessed dark panel (glazing or a poster banner) under a gold chevron grille that is lit at dusk;
//            a dark band, then a deep dark eave with a glass balustrade and planting on the roof terrace
//   entrance a projecting pavilion on the corner facing the Hùng Vương roundabout, its top above the cornice with
//            the red VINCOM PLAZA letters, a tall glass portal in a granite frame; a paved forecourt in front
//   tower    set back on a glazed storey; two broad glass faces ribbed with light mullions meeting in a blunt prow
//            towards the roundabout, the narrow ends clad dark; an open frame round the roof
// Footprint: OSM way 749331141 (building=commercial, building:levels=39, height=160 m), in model metres.

export const id = 'vincom';

const RING = [[543.8, 622.8], [601.7, 627.4], [611.4, 655.8], [574.1, 690.3], [541.0, 655.7]];
const MELIA_W = 24.6; // the hotel entrance bay: the west end of the Hà Nội front, its first three bays

const C = {
  granite: hex('#b3a284'), stone: hex('#d8cebb'), pilaster: hex('#e2dac9'), band: hex('#3a3b3d'),
  eave: hex('#2f3235'), roof: hex('#9a978f'), panel: hex('#24292f'), grille: hex('#8d8a84'),
  glass: hex('#4f6c88'), lobby: hex('#5d7a90'), mullion: hex('#a9b8c4'), endClad: hex('#a89a80'),
  red: hex('#c4122f'), pave: hex('#c3bcae'), green: hex('#4d6b35'), rail: hex('#cfdde4'),
  lattice: hex('#3b3e41'), chevron: hex('#a9a69e'),
  mgranite: hex('#ccb791'), paleGlass: hex('#a7b8b0'), paleMull: hex('#dfe5e1'), upGlass: hex('#55625f'), letters: hex('#a9c2b6'),
  grey: hex('#79828c'), louvre: hex('#5f676f'), clad: hex('#c9b996'),
};
const POSTERS = ['#3b5f86', '#9b3a3c', '#4d7a5a', '#b48a3c', '#5d4a78', '#8a8478'].map(hex); // banners, toned to read at distance

// offset a convex ring outward (d > 0) or inward, edge by edge
function offset(ring, d) {
  const n = ring.length, s = signed(ring) > 0 ? 1 : -1, lines = [];
  for (let i = 0; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const nx = ((b[1] - a[1]) / L) * s, nz = (-(b[0] - a[0]) / L) * s; // outward normal
    lines.push([[a[0] + nx * d, a[1] + nz * d], [b[0] + nx * d, b[1] + nz * d]]);
  }
  return lines.map((l, i) => meet(lines[(i + n - 1) % n], l));
}
function meet([p1, p2], [p3, p4]) {
  const d1 = [p2[0] - p1[0], p2[1] - p1[1]], d2 = [p4[0] - p3[0], p4[1] - p3[1]];
  const den = d1[0] * d2[1] - d1[1] * d2[0];
  if (Math.abs(den) < 1e-9) return p3;
  const t = ((p3[0] - p1[0]) * d2[1] - (p3[1] - p1[1]) * d2[0]) / den;
  return [p1[0] + d1[0] * t, p1[1] + d1[1] * t];
}
function signed(r) { let a = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }
function centroid(r) {
  let x = 0, z = 0, A = 0;
  for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length], k = a[0] * b[1] - b[0] * a[1]; A += k; x += (a[0] + b[0]) * k; z += (a[1] + b[1]) * k; }
  return [x / (3 * A), z / (3 * A)];
}

export function build({ S, group }) {
  const c = centroid(RING), y0 = LAND_Y + rise(c[0], c[1]);
  const sgn = signed(RING) > 0 ? 1 : -1;
  // the entrance front: the short NE edge, facing the roundabout
  const eA = RING[1], eB = RING[2], eL = Math.hypot(eB[0] - eA[0], eB[1] - eA[1]);
  const eT = [(eB[0] - eA[0]) / eL, (eB[1] - eA[1]) / eL], eN = [eT[1] * sgn, -eT[0] * sgn];
  const fA = Math.atan2(eN[1], eN[0]);

  const LB = new Buf(2048), GB = new Buf(512), RB = new Buf(256), AB = new Buf(32), WB = new Buf(2048); // night: white, gold, red, aviation
  S.base = y0 - LAND_Y;

  // ---------------- podium ----------------
  // heights from the matched Street View frames on Hà Nội: granite two storeys to ~10 m, cream bays to ~23 m, the
  // dark eave topping out near 26 m
  const H1 = 10.2, H2 = 23.2, H3 = 24.6, H4 = 26.2; // granite storeys, cream top, dark band, eave slab
  S.kind = KIND.PLAIN;
  S.prism(RING, y0 - 0.3, y0 + H1, C.granite, C.granite, { top: false });
  S.prism(RING, y0 + H1, y0 + H2, C.stone, C.stone, { top: false });
  S.prism(offset(RING, 0.25), y0 + H2, y0 + H3, C.band, C.band, { top: false });
  S.prism(offset(RING, 1.6), y0 + H3, y0 + H4, C.eave, C.roof, { topKind: KIND.FLAT });
  // a soffit under the eave so it reads as an overhang from the street
  S.prism(offset(RING, 1.6), y0 + H3 - 0.01, y0 + H3, C.eave, shade(C.eave, 0.6), { top: false });

  const eaveRing = offset(RING, 1.35);
  for (let i = 0; i < RING.length; i++) {
    const a = RING[i], b = RING[(i + 1) % RING.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const t = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], n = [t[1] * sgn, -t[0] * sgn], ang = Math.atan2(t[1], t[0]);
    const at = (u, out) => [a[0] + t[0] * u + n[0] * out, a[1] + t[1] * u + n[1] * out];
    const entrance = i === 1;
    if (i === 4) continue; // the west flank is the hotel's grey stone block (below), not shop bays
    // the south-west flank, on the lane, is a blank cream wall between stepped pilasters over the granite storeys
    // (user photosphere on Đống Đa by the south tip): no shop bays there
    const blank = i === 3;
    const nb = Math.max(2, Math.round(L / 7.6)), bw = L / nb;
    const n3 = [n[0], 0, n[1]];
    for (let k = 0; k <= nb; k++) {
      const p = at(k * bw, 0.18);
      // pilaster up the cream storeys, a granite pier below; on the blank flank a broad pilaster with a narrower one
      // standing proud of it
      S.box(p[0], p[1], y0 + H1, y0 + H2, blank ? 2.0 : 1.2, 0.36, ang, C.pilaster);
      if (blank) { const q = at(k * bw, 0.42); S.box(q[0], q[1], y0 + H1, y0 + H2 - 0.6, 1.1, 0.3, ang, shade(C.pilaster, 1.04)); }
      S.box(p[0], p[1], y0, y0 + H1, 1.3, 0.4, ang, shade(C.granite, 0.85));
    }
    if (blank) { const m = at(L / 2, 0.06); S.box(m[0], m[1], y0 + H1 - 0.35, y0 + H1 + 0.15, L - 1, 0.3, ang, shade(C.granite, 1.1)); } // the granite storey's capping
    for (let k = 0; k < nb; k++) {
      const u = (k + 0.5) * bw;
      if (blank) continue;
      if (entrance && Math.abs(u - L / 2) < 9.5) continue; // the pavilion takes the middle of this front
      if (i === 0 && u < MELIA_W) continue; // the hotel's projecting entrance bay (below) covers the west end of the Hà Nội front
      const p = at(u, 0.07), w = bw - 2.0;
      if (i === 2 && k === nb - 1) {
        // the south corner on Đống Đa: blank cream above, and in the granite a single door under a canopy, up steps
        S.box(p[0], p[1], y0 + H1 + 0.8, y0 + 21.8, w, 0.1, ang, shade(C.stone, 1.03));
        const d = at(u + 0.8, 0.1), cn = at(u + 0.8, 1.0);
        S.box(d[0], d[1], y0 + 0.75, y0 + 4.3, 3.0, 0.14, ang, hex('#2a2e31'));
        S.box(d[0], d[1], y0 + 2.45, y0 + 2.6, 3.0, 0.2, ang, shade(C.mullion, 0.7));
        S.box(d[0], d[1], y0 + 0.75, y0 + 4.3, 0.12, 0.2, ang, shade(C.mullion, 0.7));
        S.box(cn[0], cn[1], y0 + 4.6, y0 + 4.95, 4.6, 2.0, ang, C.eave, { bottom: true });
        for (let r = 0; r < 4; r++) { const q = at(u + 0.8, 0.5 + (3 - r) * 0.35); S.box(q[0], q[1], y0, y0 + 0.2 + r * 0.18, 4.2, 0.36 + 0.02 * r, ang, shade(C.granite, 1.05 - r * 0.03)); }
        continue;
      }
      // ground-floor shopfront glass, and a dark chevron lattice over the upper granite storey
      S.box(p[0], p[1], y0 + 0.3, y0 + 5.0, w + 0.4, 0.12, ang, hex('#2c2f31'));
      for (let m = 1; m < 4; m++) { const q = at(u + (m - 2) * (w / 4), 0.14); S.box(q[0], q[1], y0 + 0.3, y0 + 5.0, 0.1, 0.08, ang, shade(C.grille, 0.9)); }
      S.box(p[0], p[1], y0 + 5.8, y0 + 9.3, w, 0.12, ang, C.lattice);
      chevrons(S, (uu, yy, o) => { const q = at(uu, o); return [q[0], yy, q[1]]; }, n3, u, w, y0 + 6.0, y0 + 9.1, 4, 0.14, C.chevron);
      // the tall recessed bay: dark glass with mullions, or a poster banner (the three bays next to the hotel entrance
      // on Hà Nội carry the cinema's and restaurants' posters; elsewhere about one bay in five)
      const poster = i === 0 ? u < MELIA_W + 3 * bw : (k * 2 + i) % 5 === 0;
      if (poster) {
        const pc = POSTERS[(k * 3 + i) % POSTERS.length];
        S.box(p[0], p[1], y0 + H1 + 0.8, y0 + 20.4, w, 0.12, ang, shade(pc, 0.7));
        const q = at(u, 0.1);
        S.box(q[0], q[1], y0 + 15.8, y0 + 19.9, w - 0.6, 0.12, ang, pc); // the picture
        S.box(q[0], q[1], y0 + 13.6, y0 + 15.4, w - 0.6, 0.12, ang, hex('#e4dccb')); // a pale text panel
        S.box(q[0], q[1], y0 + H1 + 1.3, y0 + 13.2, w - 0.6, 0.12, ang, shade(POSTERS[(k * 3 + i + 2) % POSTERS.length], 1.1));
        S.box(p[0], p[1], y0 + H1 + 0.6, y0 + H1 + 0.8, w + 0.1, 0.16, ang, C.panel);
      } else {
        S.box(p[0], p[1], y0 + H1 + 0.8, y0 + 20.4, w, 0.12, ang, C.panel);
        for (let m = 1; m < 5; m++) { const q = at(u + (m - 2.5) * (w / 5), 0.15); S.box(q[0], q[1], y0 + H1 + 0.8, y0 + 20.4, 0.1, 0.08, ang, shade(C.grille, 1.1)); }
        S.box(p[0], p[1], y0 + 15.4, y0 + 15.7, w, 0.16, ang, shade(C.grille, 1.1));
      }
      // the chevron lattice over each bay, lit from behind at dusk
      S.box(p[0], p[1], y0 + 20.7, y0 + 22.7, w, 0.14, ang, C.lattice);
      chevrons(S, (uu, yy, o) => { const q = at(uu, o); return [q[0], yy, q[1]]; }, n3, u, w, y0 + 20.8, y0 + 22.6, 3, 0.16, C.chevron);
      const g = at(u, 0.2);
      GB.box(g[0], g[1], y0 + 20.75, y0 + 22.65, w - 0.2, 0.05, ang, [1, 1, 1], { top: [1, 1, 1] });
    }
    // glass balustrade and a strip of planting round the roof terrace
    const r0 = eaveRing[i], r1 = eaveRing[(i + 1) % RING.length];
    S.beam([r0[0], y0 + H4 + 0.55, r0[1]], [r1[0], y0 + H4 + 0.55, r1[1]], 0.06, 1.1, C.rail);
    S.beam([r0[0], y0 + H4 + 1.12, r0[1]], [r1[0], y0 + H4 + 1.12, r1[1]], 0.1, 0.06, shade(C.rail, 0.7));
    const q0 = offset(RING, 0.2)[i], q1 = offset(RING, 0.2)[(i + 1) % RING.length];
    S.beam([q0[0], y0 + H4 + 0.3, q0[1]], [q1[0], y0 + H4 + 0.3, q1[1]], 1.1, 0.6, C.green);
  }

  // ---------------- entrance pavilion on the roundabout front ----------------
  {
    const mid = [(eA[0] + eB[0]) / 2, (eA[1] + eB[1]) / 2];
    const P = (u, out) => [mid[0] + eT[0] * u + eN[0] * out, mid[1] + eT[1] * u + eN[1] * out];
    const W = 18, D = 3.0, top = H4 + 2.6, a = Math.atan2(eT[1], eT[0]);
    const pc = P(0, D / 2 - 0.5);
    S.box(pc[0], pc[1], y0, y0 + H1, W, D + 1, a, C.granite);
    S.box(pc[0], pc[1], y0 + H1, y0 + top, W, D + 1, a, C.stone, { top: C.roof, topKind: KIND.FLAT });
    S.box(pc[0], pc[1], y0 + top, y0 + top + 0.5, W + 0.6, D + 1.6, a, C.band);
    for (const s of [-1, 1]) { const q = P(s * (W / 2 - 0.9), D); S.box(q[0], q[1], y0 + H1, y0 + top, 1.8, 0.4, a, C.pilaster); }
    const front = (out) => P(0, D + out);
    // tall glass portal in a dark granite frame
    const f1 = front(0.05);
    S.box(f1[0], f1[1], y0, y0 + 15.5, 11.0, 0.3, a, shade(C.granite, 0.8));
    const f2 = front(0.22);
    S.box(f2[0], f2[1], y0 + 0.2, y0 + 14.8, 9.4, 0.12, a, C.lobby);
    for (let k = -3; k <= 3; k++) { const q = P(k * 1.34, D + 0.32); S.box(q[0], q[1], y0 + 0.2, y0 + 14.8, 0.12, 0.1, a, shade(C.mullion, 0.8)); }
    for (const h of [5.2, 10.0]) S.box(f2[0], f2[1], y0 + h, y0 + h + 0.2, 9.4, 0.18, a, shade(C.mullion, 0.8));
    // the entrance canopy: a thin dark slab out over the steps on two slim posts
    const cn = P(0, D + 2.4);
    S.box(cn[0], cn[1], y0 + 5.0, y0 + 5.45, 12.0, 4.8, a, C.eave, { bottom: true });
    for (const s of [-1, 1]) { const q = P(s * 5.4, D + 4.4); S.cyl(q[0], q[1], y0, y0 + 5.0, 0.16, 0.16, 6, C.band); }
    GB.box(cn[0], cn[1], y0 + 4.98, y0 + 5.0, 11.4, 4.2, a, [1, 1, 1], { bottom: true });
    // red VINCOM PLAZA letters on a light panel above the cornice line
    const sp = front(0.25);
    S.box(sp[0], sp[1], y0 + H3 - 0.2, y0 + top - 0.4, 15.5, 0.16, a, C.pilaster);
    const letters = 'VINCOM PLAZA', lw = 1.05;
    for (let k = 0; k < letters.length; k++) {
      if (letters[k] === ' ') continue;
      const q = P((k - (letters.length - 1) / 2) * lw, D + 0.4);
      S.box(q[0], q[1], y0 + H3 + 0.25, y0 + H3 + 2.15, lw * 0.78, 0.12, a, C.red);
      RB.box(q[0], q[1], y0 + H3 + 0.25, y0 + H3 + 2.15, lw * 0.78, 0.16, a, [1, 1, 1]);
    }
    // two long poster banners flanking the portal
    for (const s of [-1, 1]) { const q = P(s * 7.0, D + 0.25); S.box(q[0], q[1], y0 + 6.0, y0 + 21.5, 2.4, 0.12, a, s < 0 ? POSTERS[1] : POSTERS[0]); }
  }

  // ---------------- forecourt: paving between the front and the roundabout, low planters along the kerb ----------------
  {
    const out0 = 13.5, out1 = 4.0;
    const pa = [eA[0] - eT[0] * 6, eA[1] - eT[1] * 6], pb = [eB[0], eB[1]];
    const ring = [pa, pb, [pb[0] + eN[0] * out1, pb[1] + eN[1] * out1], [eA[0] + eN[0] * out0, eA[1] + eN[1] * out0], [pa[0] + eN[0] * 9, pa[1] + eN[1] * 9]];
    S.kind = KIND.PLAIN;
    S.prism(ring, y0 - 0.2, y0 + 0.12, shade(C.pave, 0.9), C.pave);
    // steps up to the canopy
    const mid = [(eA[0] + eB[0]) / 2, (eA[1] + eB[1]) / 2], a = Math.atan2(eT[1], eT[0]);
    for (let k = 0; k < 2; k++) { const q = [mid[0] + eN[0] * (3.4 + 2.2 - k * 0.6), mid[1] + eN[1] * (3.4 + 2.2 - k * 0.6)]; S.box(q[0], q[1], y0 + 0.12, y0 + 0.28 + k * 0.16, 14 - k, 2.4 - k * 0.6, a, shade(C.pave, 1.05 - k * 0.05)); }
    for (let k = 0; k < 5; k++) {
      const u = 1.5 + k * 6.4, o = out0 - 1.4 - (out0 - out1) * (u / eL);
      if (o < 2.6) continue;
      const q = [eA[0] + eT[0] * u + eN[0] * o, eA[1] + eT[1] * u + eN[1] * o];
      S.box(q[0], q[1], y0 + 0.12, y0 + 0.7, 2.6, 1.0, a, shade(C.granite, 1.2));
      S.box(q[0], q[1], y0 + 0.7, y0 + 1.15, 2.3, 0.8, a, C.green);
    }
  }

  // ---------------- the hotel: Meliá entrance bay, grey stone base block and the tower ----------------
  // Placed from the satellite (roof outline, the tower's west edge on x ≈ 546 and east edge on x ≈ 572) and two car
  // panoramas on Hà Nội (docs/places/vincom.md): the tower stands over the north-west of the lot, not its middle. Local
  // frame (u, v): u along the lot's north front (east, 4.5° south of due east), v along its west flank (south);
  // origin at the tower's north-west corner, 2 m in from the podium's north-west corner.
  const nA = RING[0], nB = RING[1], nL = Math.hypot(nB[0] - nA[0], nB[1] - nA[1]);
  const U = [(nB[0] - nA[0]) / nL, (nB[1] - nA[1]) / nL], V = [-U[1], U[0]];
  const P0 = [nA[0] + U[0] * 1.9 + V[0] * 1.4, nA[1] + U[1] * 1.9 + V[1] * 1.4];
  const W2 = (u, v) => [P0[0] + U[0] * u + V[0] * v, P0[1] + U[1] * u + V[1] * v];
  const uAng = Math.atan2(U[1], U[0]);
  const P3 = (u, v, y) => { const p = W2(u, v); return [p[0], y0 + y, p[1]]; };
  const lb = (u, v, y1, y2, su, sv, col, opt) => { const p = W2(u, v); S.box(p[0], p[1], y0 + y1, y0 + y2, su, sv, uAng, col, opt); };

  // Meliá Vinpearl entrance (car panorama on Hà Nội): a bay standing 1.9 m proud of the shop front, as wide as the
  // grey block behind it on the west. Speckled beige-gold granite to 15 m: below the canopy dark glazed doors either
  // side of the central entrance and its steps, above it three tall bays of pale grey-green glass. The canopy carries
  // the hotel's name in pale green letters. Over the granite, a cream storey of three windows under chevron lattices,
  // ending in a thin cornice with planting at the podium's eave line; the grey tower base shows behind it.
  {
    const vF = -3.3, uW = -3.75, uE = MELIA_W - 1.9, mid = (uW + uE) / 2, BW = uE - uW;
    const face = (u, y, o) => { const p = W2(u, vF - o); return [p[0], y0 + y, p[1]]; };
    const fn = [-V[0], 0, -V[1]];
    const fb = (u, o, y1, y2, su, so, col, opt) => lb(u, vF - o, y1, y2, su, so, col, opt);
    lb(mid, (vF - 0.9) / 2, -0.3, 15.0, BW, -0.9 - vF, C.mgranite, { top: shade(C.mgranite, 1.1) });
    lb(mid, (vF - 0.9) / 2, 15.0, 27.4, BW, -0.9 - vF, C.pilaster, { top: C.roof, topKind: KIND.FLAT });
    fb(mid, 0.12, 14.7, 15.2, BW + 0.2, 0.5, shade(C.mgranite, 1.15)); // the granite's capping
    fb(mid, 0.1, 27.4, 27.8, BW + 0.4, 0.6, shade(C.pilaster, 0.92), { top: C.roof }); // thin cornice
    lb(mid, vF + 0.9, 27.8, 28.5, BW - 1.2, 1.0, C.green); // roof planting behind it
    // speckle on the granite: small flecks lighter and darker than the stone, scattered deterministically
    const fleck = [shade(C.mgranite, 1.12), shade(C.mgranite, 0.88), hex('#dccb9f'), hex('#a8916b')];
    for (let k = 0; k < 900; k++) {
      const h1 = frac(Math.sin(k * 12.9898) * 43758.5453), h2 = frac(Math.sin(k * 78.233 + 1.3) * 24634.6345);
      const u = uW + 0.2 + h1 * (BW - 0.4), y = 0.3 + h2 * 14.3, s2 = 0.05 + 0.09 * frac(h1 * 7.1), a = 1.3 * (frac(h2 * 3.7) - 0.5);
      strip(S, face, fn, u - s2 * Math.cos(a), y - s2 * Math.sin(a), u + s2 * Math.cos(a), y + s2 * Math.sin(a), 0.06 + 0.08 * frac(h2 * 5.3), 0.02, fleck[k % 4]);
    }
    for (let k = -1; k <= 1; k++) {
      const u = mid + k * 7.6;
      // ground storey: dark glazed doors either side, the entrance in the middle
      fb(u, 0.05, 0.25, 5.2, 6.0, 0.14, shade(C.mgranite, 0.7)); // a darker reveal
      fb(u, 0.1, 0.35 + (k === 0 ? 0.55 : 0), 5.0, 5.4, 0.12, hex('#262b2f'));
      for (let m = -2; m <= 2; m++) fb(u + m * 1.08, 0.14, 0.35, 5.0, 0.1, 0.08, shade(C.mullion, 0.6));
      fb(u, 0.14, 2.9, 3.05, 5.4, 0.1, shade(C.mullion, 0.6));
      if (k === 0) fb(u, 0.12, 0.9, 3.4, 2.4, 0.14, hex('#4d5960')); // the lit revolving door
      // above the canopy: tall pale glass in a dark frame, mullioned, one transom
      fb(u, 0.05, 6.3, 13.6, 6.0, 0.14, shade(C.mgranite, 0.66));
      fb(u, 0.1, 6.5, 13.4, 5.6, 0.12, C.paleGlass);
      for (let m = -2; m <= 2; m++) fb(u + m * 1.12, 0.14, 6.5, 13.4, 0.12, 0.08, C.paleMull);
      fb(u, 0.14, 10.0, 10.15, 5.6, 0.1, C.paleMull);
      // the cream storey: a window under a chevron lattice, between pilasters
      fb(u, 0.06, 16.0, 25.6, 5.8, 0.12, shade(C.pilaster, 0.9));
      fb(u, 0.1, 16.2, 23.0, 5.4, 0.12, C.upGlass);
      for (let m = -1; m <= 1; m++) fb(u + m * 1.35, 0.14, 16.2, 23.0, 0.12, 0.08, shade(C.mullion, 0.75));
      fb(u, 0.14, 19.6, 19.75, 5.4, 0.1, shade(C.mullion, 0.75));
      fb(u, 0.1, 23.3, 25.4, 5.4, 0.12, C.lattice);
      chevrons(S, face, fn, u, 5.2, 23.4, 25.3, 3, 0.16, C.chevron);
      GB.box(...W2(u, vF - 0.2), y0 + 23.35, y0 + 25.35, 5.2, 0.05, uAng, [1, 1, 1], { top: [1, 1, 1] });
    }
    for (const u of [uW + 0.6, mid - 3.8, mid + 3.8, uE - 0.6]) fb(u, 0.2, 15.2, 27.4, 1.2, 0.4, shade(C.pilaster, 1.04));
    // the canopy: a thin dark slab hung from two ties, the name standing on its front edge
    fb(mid, 1.6, 5.4, 5.85, 19.0, 3.2, C.eave, { bottom: true });
    GB.box(...W2(mid, vF - 1.6), y0 + 5.38, y0 + 5.4, 18.4, 2.8, uAng, [1, 1, 1], { bottom: true });
    for (const s of [-1, 1]) S.beam(face(mid + s * 6.5, 5.85, 3.0), face(mid + s * 4.5, 11.8, 0.1), 0.1, 0.1, C.mullion);
    const faceR = (u, y, o) => face(-u, y, o); // along the face as a reader on Hà Nội sees it (west is to the right)
    lettering(S, faceR, fn, 'MELIÃ VINPEARL HUE', -mid, 5.9, 1.15, 0.92, 3.05, C.letters);
    lettering(LB, faceR, fn, 'MELIÃ VINPEARL HUE', -mid, 5.9, 1.15, 0.92, 3.1, [1, 1, 1]);
    // steps up to the entrance, and low clipped hedges either side
    for (let r = 0; r < 3; r++) fb(mid, 0.4 + (2 - r) * 0.45, 0, 0.2 + r * 0.2, 7.2 - r * 0.4, 0.9, shade(C.mgranite, 1.08 - r * 0.04));
    for (const [a0, a1] of [[uW + 0.4, mid - 4.4], [mid + 4.4, uE - 0.4]]) fb((a0 + a1) / 2, 0.85, 0, 1.0, a1 - a0, 1.5, C.green);
  }

  // the base block: plain grey stone from the street to 30 m on the west flank, two strips of windows high up, a
  // louvred plant storey on its west half, and the shaft rising out of it (Street View, Hà Nội looking east)
  // a cool grey: the scene's dusk light warms everything, and the stone must still read grey against the cream podium
  const GREY = C.grey, LOUVRE = C.louvre;
  const base = [W2(-3.75, -0.9), W2(-3.75, 26), W2(26.6, 39.0), W2(26.6, 16.8), W2(12.4, -0.9)];
  S.kind = KIND.PLAIN;
  S.prism(base, y0 - 0.3, y0 + 30.0, GREY, C.roof, { topKind: KIND.FLAT });
  for (const [v0, v1] of [[1.5, 11.5], [13.0, 23.5]]) lb(-3.82, (v0 + v1) / 2, 22.4, 24.1, 0.12, v1 - v0, C.panel);
  for (let y = 4; y < 29; y += 4.2) lb(-3.8, 12.6, y, y + 0.08, 0.06, 26.6, shade(GREY, 0.85)); // stone courses
  lb(1.5, 12.8, 30.0, 38.5, 9.5, 22.0, GREY, { top: C.roof, topKind: KIND.FLAT });
  for (let k = 0; k < 9; k++) {
    lb(-3.28, 3.0 + k * 2.4, 34.4, 38.0, 0.12, 1.9, LOUVRE);
    for (let y = 34.8; y < 38; y += 0.6) lb(-3.36, 3.0 + k * 2.4, y, y + 0.07, 0.06, 1.9, shade(LOUVRE, 0.8)); // the louvre blades
  }
  for (let k = 0; k < 3; k++) {
    lb(-1.5 + k * 3.0, 1.73, 34.4, 38.0, 2.4, 0.12, LOUVRE);
    for (let y = 34.8; y < 38; y += 0.6) lb(-1.5 + k * 3.0, 1.65, y, y + 0.07, 2.4, 0.06, shade(LOUVRE, 0.8));
  }
  // glass rail along the terrace on the block's north edge
  S.beam(P3(5, -0.75, 30.6), P3(12.2, -0.75, 30.6), 0.06, 1.1, C.rail);

  // the tower: a pentagon in plan; a narrow north end clad in pale bronze stone, the west face, the east face and the
  // blunt chamfer towards the roundabout in blue glass ribbed with light mullions, the long south-west face glass too
  const T0 = 30.0, T1 = 151.0, TOP = 160.0;
  const plan = [W2(0, 0), W2(0, 20), W2(26, 38), W2(26, 17), W2(12, 0)];
  const tc = W2(12.5, 18.5);
  S.prism(plan, y0 + T0, y0 + T1, C.glass, C.roof, { topKind: KIND.FLAT });
  for (let y = T0 + 4.2; y < T1 - 1; y += 4.2) S.prism(offset(plan, 0.04), y0 + y, y0 + y + 0.12, shade(C.glass, 0.8), C.glass, { top: false }); // floor lines
  // the clad north end: a narrow strip of light tan stone with its floors banded, on the west 8.6 m of the end; the
  // rest of the end is glass with mullions (Hà Nội car panorama)
  { const CW = 8.6;
    lb(CW / 2 - 0.15, -0.15, T0, T1 + 0.6, CW + 0.3, 0.3, C.clad);
    for (let y = T0 + 4.2; y < T1 - 1; y += 4.2) lb(CW / 2 - 0.15, -0.32, y - 0.1, y + 0.15, CW + 0.3, 0.06, shade(C.clad, 0.8));
    for (const u of [CW + 1.1, CW + 2.3]) S.beam(P3(u, -0.12, T0), P3(u, -0.12, T1), 0.18, 0.18, C.mullion); }
  // light vertical mullions on the glass faces
  const sg = sgnOf(plan);
  for (const [i, j] of [[0, 1], [1, 2], [2, 3], [3, 4]]) {
    const a = plan[i], b = plan[j], L = Math.hypot(b[0] - a[0], b[1] - a[1]), t = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], n = [t[1] * sg, -t[0] * sg];
    const nm = Math.max(1, Math.round(L / 1.6));
    for (let k = 1; k < nm; k++) {
      const p = [a[0] + t[0] * (L * k) / nm + n[0] * 0.12, a[1] + t[1] * (L * k) / nm + n[1] * 0.12];
      S.beam([p[0], y0 + T0, p[1]], [p[0], y0 + T1, p[1]], 0.18, 0.18, C.mullion);
    }
    // after dark: a scatter of lit hotel rooms behind the glass (deterministic, about one pane in eight)
    const ang = Math.atan2(t[1], t[0]);
    for (let fl = 0, y = T0 + 0.6; y < T1 - 4; fl++, y += 4.2) for (let k = 0; k < nm; k += 2) {
      const h = Math.sin(fl * 12.9898 + k * 78.233 + i * 37.719) * 43758.5453;
      if (h - Math.floor(h) > 0.13) continue;
      const p = [a[0] + t[0] * (L * (k + 1)) / nm + n[0] * 0.3, a[1] + t[1] * (L * (k + 1)) / nm + n[1] * 0.3];
      WB.box(p[0], p[1], y0 + y, y0 + y + 2.6, (2 * L / nm) - 0.5, 0.08, ang, [1, 1, 1]);
    }
  }
  // the chamfer's two edges, and the crown
  for (const p of [plan[3], plan[4]]) S.beam([p[0], y0 + T0, p[1]], [p[0], y0 + T1 + 0.6, p[1]], 0.5, 0.5, C.mullion);
  S.prism(offset(plan, 0.35), y0 + T1, y0 + T1 + 1.4, C.endClad, C.roof, { topKind: KIND.FLAT });
  // open frame round the roof: posts and rails on an outer ring
  const fr = offset(plan, 0.25), FY0 = y0 + T1 + 1.4, FY1 = y0 + TOP - 2.6;
  for (let i = 0; i < fr.length; i++) {
    const a = fr[i], b = fr[(i + 1) % fr.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), np = Math.max(1, Math.round(L / 2.4));
    for (let k = 0; k < np; k++) { const u = k / np, p = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; S.beam([p[0], FY0, p[1]], [p[0], FY1, p[1]], 0.2, 0.2, C.mullion); }
    for (const y of [FY1 - 0.1, (FY0 + FY1) / 2]) S.beam([a[0], y, a[1]], [b[0], y, b[1]], 0.25, 0.3, C.mullion);
    LB.beam([a[0], FY1 + 0.15, a[1]], [b[0], FY1 + 0.15, b[1]], 0.25, 0.25, [1, 1, 1]);
    LB.beam([a[0], y0 + T1 + 0.7, a[1]], [b[0], y0 + T1 + 0.7, b[1]], 0.2, 0.2, [1, 1, 1]);
  }
  // rooftop plant room (and the sky bar) inside the frame, a short mast at 160 m
  S.box(tc[0], tc[1], y0 + T1 + 1.4, y0 + TOP - 3.4, 11, 14, uAng, hex('#c9cdd0'), { top: C.roof, topKind: KIND.FLAT });
  S.cyl(tc[0], tc[1], y0 + TOP - 3.4, y0 + TOP - 0.3, 0.25, 0.06, 5, hex('#d8dadb'));
  AB.box(tc[0], tc[1], y0 + TOP - 0.4, y0 + TOP, 0.35, 0.35, 0, [1, 1, 1]);
  // the chamfer's edges lit
  for (const p of [plan[3], plan[4]]) LB.beam([p[0], y0 + T0, p[1]], [p[0], y0 + T1, p[1]], 0.14, 0.14, [1, 1, 1]);

  // ---------------- the yard west of the building, to Kiệt 26 Hà Nội ----------------
  // the basement car-park ramp under a grey steel canopy with its sign facing Hà Nội, a small grey plant house, palms,
  // all on paving (car panoramas on Hà Nội; scripts/build-data.mjs keeps generated houses and trees off this strip)
  {
    const yg = LAND_Y + rise(531, 628);
    S.kind = KIND.PLAIN;
    S.prism([[520.6, 614.6], [543.4, 616.4], [543.7, 622.9], [541.9, 643], [520.2, 643]], yg - 0.25, yg + 0.06, shade(C.pave, 0.9), shade(C.pave, 0.96));
    const rx = 530.5, rz0 = 621, rz1 = 640, rl = rz1 - rz0, rc = (rz0 + rz1) / 2;
    S.box(rx, rc, yg + 0.06, yg + 0.09, 6.2, rl, 0, hex('#55585a'));
    for (const sx of [-1, 1]) S.box(rx + sx * 3.25, rc, yg, yg + 1.0, 0.3, rl, 0, shade(C.grey, 1.1));
    S.box(rx, rc + 0.5, yg + 3.5, yg + 3.75, 7.8, rl + 1, 0, hex('#9ba2a7'), { bottom: true });
    for (const sx of [-1, 1]) for (let k = 0; k <= 3; k++) S.box(rx + sx * 3.6, rz0 + (rl * k) / 3, yg + 1.0, yg + 3.5, 0.2, 0.2, 0, hex('#7d858b'));
    S.box(rx, rz0 - 0.1, yg + 2.55, yg + 3.45, 7.2, 0.16, 0, hex('#2c3136'));
    for (let k = 0; k < 5; k++) S.box(rx - 2.6 + k * 1.3, rz0 - 0.22, yg + 2.75, yg + 3.25, 0.7, 0.04, 0, k === 0 ? C.red : k % 2 ? hex('#e9c94a') : hex('#e8ecee'));
    S.box(538.6, 625, yg, yg + 3.2, 4.0, 5.0, 0, C.grey, { top: C.roof });
    for (const [x, z, h] of [[523.6, 618.6, 9.2], [523.2, 628.4, 10.4], [524.2, 637.4, 8.6], [536.8, 634.2, 9.6]]) palm(S, [x, z], yg, h);
  }

  for (const [B, col, boost] of [[LB, 0xd6ecff, 1.3], [GB, 0xffc56a, 1.5], [RB, 0xff2a3a, 1.8], [AB, 0xff2a1a, 2.4], [WB, 0xffd9a0, 0.9]]) {
    if (!B.n) continue;
    const m = new THREE.Mesh(B.geometry(), lightMaterial(col, boost));
    m.renderOrder = 19;
    m.userData.landmark = id;
    group.add(m);
  }
  S.kind = KIND.PLAIN;
  S.base = 0;
}

function sgnOf(r) { return signed(r) > 0 ? 1 : -1; }
// a palm: a slightly leaning trunk and a crown of drooping fronds
function palm(S, p, y, h) {
  S.kind = KIND.TIMBER;
  const trunk = hex('#8a7a62'), frond = hex('#4f7a3a');
  S.cyl(p[0], p[1], y, y + h, 0.24, 0.17, 6, trunk, { cap: false });
  const top = [p[0] + 0.25, y + h, p[1]];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + h, dx = Math.cos(a), dz = Math.sin(a);
    const mid = [top[0] + dx * 1.6, top[1] + 0.45, top[2] + dz * 1.6], tip = [top[0] + dx * 3.2, top[1] - 0.9, top[2] + dz * 3.2];
    S.beam(top, mid, 0.7, 0.08, frond);
    S.beam(mid, tip, 0.55, 0.06, shade(frond, 0.9));
  }
  S.kind = KIND.PLAIN;
}
function frac(x) { return x - Math.floor(x); }

// a flat strip on a façade: from (u1, y1) to (u2, y2) in its own (along, up) coordinates, th wide, out off the face.
// face(u, y, out) gives the world point; fn is the face's outward normal.
function strip(B, face, fn, u1, y1, u2, y2, th, out, col) {
  const du = u2 - u1, dy = y2 - y1, L = Math.hypot(du, dy);
  if (L < 1e-6) return;
  const pu = (-dy / L) * th / 2, py = (du / L) * th / 2;
  B.quad(face(u1 - pu, y1 - py, out), face(u2 - pu, y2 - py, out), face(u2 + pu, y2 + py, out), face(u1 + pu, y1 + py, out), col, fn);
}
// a chevron lattice: rows of V's across a panel w wide centred on uc, from ya to yb (absolute heights)
function chevrons(B, face, fn, uc, w, ya, yb, rows, out, col) {
  const nv = Math.max(3, Math.round(w / 0.75)), vw = w / nv, rh = (yb - ya) / rows;
  for (let r = 0; r < rows; r++) {
    const lo = ya + r * rh + rh * 0.2, hi = ya + (r + 1) * rh - rh * 0.2;
    for (let k = 0; k < nv; k++) {
      const u0 = uc - w / 2 + k * vw;
      strip(B, face, fn, u0, hi, u0 + vw / 2, lo, 0.09, out, col);
      strip(B, face, fn, u0 + vw / 2, lo, u0 + vw, hi, 0.09, out, col);
    }
  }
}
// stroke letters, each in a unit cell (x 0..1 across, y 0..1 up)
const GLYPH = {
  M: [[0, 0, 0, 1], [0, 1, 0.5, 0.35], [0.5, 0.35, 1, 1], [1, 1, 1, 0]],
  E: [[0, 0, 0, 1], [0, 1, 1, 1], [0, 0.5, 0.8, 0.5], [0, 0, 1, 0]],
  L: [[0, 1, 0, 0], [0, 0, 1, 0]],
  I: [[0.5, 0, 0.5, 1]],
  A: [[0, 0, 0.5, 1], [0.5, 1, 1, 0], [0.24, 0.45, 0.76, 0.45]],
  Ã: [[0, 0, 0.5, 1], [0.5, 1, 1, 0], [0.24, 0.45, 0.76, 0.45], [0.2, 1.18, 0.45, 1.3], [0.45, 1.3, 0.55, 1.2], [0.55, 1.2, 0.8, 1.32]],
  V: [[0, 1, 0.5, 0], [0.5, 0, 1, 1]],
  N: [[0, 0, 0, 1], [0, 1, 1, 0], [1, 0, 1, 1]],
  P: [[0, 0, 0, 1], [0, 1, 0.8, 1], [0.8, 1, 1, 0.85], [1, 0.85, 1, 0.62], [1, 0.62, 0.8, 0.47], [0.8, 0.47, 0, 0.47]],
  R: [[0, 0, 0, 1], [0, 1, 0.8, 1], [0.8, 1, 1, 0.85], [1, 0.85, 1, 0.62], [1, 0.62, 0.8, 0.47], [0.8, 0.47, 0, 0.47], [0.45, 0.47, 1, 0]],
  H: [[0, 0, 0, 1], [1, 0, 1, 1], [0, 0.5, 1, 0.5]],
  U: [[0, 1, 0, 0.12], [0, 0.12, 0.15, 0], [0.15, 0, 0.85, 0], [0.85, 0, 1, 0.12], [1, 0.12, 1, 1]],
};
function lettering(B, face, fn, text, uc, y, h, pitch, out, col) {
  const cw = pitch * 0.72, th = h * 0.13;
  [...text].forEach((ch, k) => {
    const g = GLYPH[ch];
    if (!g) return;
    const u0 = uc + (k - (text.length - 1) / 2) * pitch - cw / 2;
    for (const [a, b, c, d] of g) {
      const ex = 0.5 * th; // run each stroke on past its ends so the joints close
      const L = Math.hypot((c - a) * cw, (d - b) * h), tx = ((c - a) * cw) / L, ty = ((d - b) * h) / L;
      strip(B, face, fn, u0 + a * cw - tx * ex, y + b * h - ty * ex, u0 + c * cw + tx * ex, y + d * h + ty * ex, th, out, col);
    }
  });
}
