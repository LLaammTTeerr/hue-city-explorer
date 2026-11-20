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

const C = {
  granite: hex('#54453c'), stone: hex('#e4d9c5'), pilaster: hex('#ece3d2'), band: hex('#3a3b3d'),
  eave: hex('#2f3235'), roof: hex('#9a978f'), panel: hex('#24292f'), grille: hex('#a98a52'),
  glass: hex('#3f5a74'), lobby: hex('#5d7a90'), mullion: hex('#a9b8c4'), endClad: hex('#555b63'),
  red: hex('#c4122f'), pave: hex('#c3bcae'), green: hex('#4d6b35'), rail: hex('#cfdde4'),
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
  const H1 = 5.6, H2 = 21.0, H3 = 22.4, H4 = 23.6; // granite storey, cream top, dark band, eave slab
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
    const nb = Math.max(2, Math.round(L / 7.6)), bw = L / nb;
    for (let k = 0; k <= nb; k++) {
      const p = at(k * bw, 0.18);
      // pilaster up the cream storeys, a granite pier below
      S.box(p[0], p[1], y0 + H1, y0 + H2, 1.2, 0.36, ang, C.pilaster);
      S.box(p[0], p[1], y0, y0 + H1, 1.3, 0.4, ang, shade(C.granite, 0.85));
    }
    for (let k = 0; k < nb; k++) {
      const u = (k + 0.5) * bw;
      if (entrance && Math.abs(u - L / 2) < 9.5) continue; // the pavilion takes the middle of this front
      const p = at(u, 0.07), w = bw - 2.0;
      // ground-floor shopfront glass
      S.box(p[0], p[1], y0 + 0.3, y0 + H1 - 0.9, w + 0.4, 0.12, ang, shade(C.lobby, 0.7));
      // the tall recessed bay: dark glass, or a poster banner on every other bay
      const poster = (k * 2 + i) % 5 === 0;
      S.box(p[0], p[1], y0 + H1 + 1.0, y0 + 17.6, w, 0.12, ang, poster ? POSTERS[(k * 3 + i) % POSTERS.length] : C.panel);
      if (poster) S.box(p[0], p[1], y0 + H1 + 0.8, y0 + H1 + 1.0, w + 0.1, 0.16, ang, C.panel);
      // gold chevron grille above, lit at dusk
      S.box(p[0], p[1], y0 + 17.9, y0 + 20.2, w, 0.14, ang, C.grille);
      const g = at(u, 0.2);
      GB.box(g[0], g[1], y0 + 17.95, y0 + 20.15, w - 0.2, 0.05, ang, [1, 1, 1], { top: [1, 1, 1] });
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
    for (const s of [-1, 1]) { const q = P(s * 7.0, D + 0.25); S.box(q[0], q[1], y0 + H1 + 1.0, y0 + 19.5, 2.4, 0.12, a, s < 0 ? POSTERS[1] : POSTERS[0]); }
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

  // ---------------- glazed setback storey and the hotel tower ----------------
  const tc = [c[0] + eN[0] * 1.5, c[1] + eN[1] * 1.5];
  const TW = 44, TD = 22, PROW = 3.2, BACK = 0.86, T0 = H4 + 5.8, T1 = 151.0, TOP = 160.0;
  const L2W = (f, p) => [tc[0] + eN[0] * f + eT[0] * p, tc[1] + eN[1] * f + eT[1] * p];
  // shallow V in plan: two glass faces meeting in a blunt prow towards the roundabout; the back a little narrower
  const plan = [L2W(TD / 2 + PROW, -1.2), L2W(TD / 2, -TW / 2), L2W(-TD / 2, -TW / 2 * BACK), L2W(-TD / 2, TW / 2 * BACK), L2W(TD / 2, TW / 2), L2W(TD / 2 + PROW, 1.2)];
  // the storey between podium and tower: lobby / pool deck glazing under a dark slab
  S.kind = KIND.MODERN;
  S.prism(offset(plan, 6), y0 + H4, y0 + T0 - 0.8, C.lobby, C.roof, { top: false });
  S.kind = KIND.PLAIN;
  S.prism(offset(plan, 6.6), y0 + T0 - 0.8, y0 + T0, C.eave, C.roof, { topKind: KIND.FLAT });
  S.kind = KIND.PLAIN; // a smooth curtain wall: the mullions below give it its ribbing, not a punched-window facade
  S.prism(plan, y0 + T0, y0 + T1, C.glass, C.roof, { topKind: KIND.FLAT });
  for (let y = T0 + 4.2; y < T1 - 1; y += 4.2) S.prism(offset(plan, 0.04), y0 + y, y0 + y + 0.12, shade(C.glass, 0.8), C.glass, { top: false }); // floor lines
  S.kind = KIND.PLAIN;
  // dark cladding on the two narrow ends
  for (const s of [-1, 1]) {
    const a = plan[s < 0 ? 1 : 4], b = plan[s < 0 ? 2 : 3];
    const m = [(a[0] + b[0]) / 2 + eT[0] * s * 0.12, (a[1] + b[1]) / 2 + eT[1] * s * 0.12];
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    S.box(m[0], m[1], y0 + T0, y0 + T1 + 0.6, Math.hypot(b[0] - a[0], b[1] - a[1]) + 0.3, 0.3, ang, C.endClad);
  }
  // light vertical mullions on the glass faces (front pair and back)
  const faces = [[0, 1], [4, 5], [2, 3]];
  for (const [i, j] of faces) {
    const a = plan[i], b = plan[j], L = Math.hypot(b[0] - a[0], b[1] - a[1]), t = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], n = [t[1] * sgnOf(plan), -t[0] * sgnOf(plan)];
    const nm = Math.max(1, Math.round(L / 2.4));
    for (let k = 1; k < nm; k++) {
      const p = [a[0] + t[0] * (L * k) / nm + n[0] * 0.12, a[1] + t[1] * (L * k) / nm + n[1] * 0.12];
      S.beam([p[0], y0 + T0, p[1]], [p[0], y0 + T1, p[1]], 0.22, 0.22, C.mullion);
    }
    // after dark: a scatter of lit hotel rooms behind the glass (deterministic, about one pane in eight)
    const ang = Math.atan2(t[1], t[0]);
    for (let fl = 0, y = T0 + 0.6; y < T1 - 4; fl++, y += 4.2) for (let k = 0; k < nm; k++) {
      const h = Math.sin(fl * 12.9898 + k * 78.233 + i * 37.719) * 43758.5453;
      if (h - Math.floor(h) > 0.13) continue;
      const p = [a[0] + t[0] * (L * (k + 0.5)) / nm + n[0] * 0.3, a[1] + t[1] * (L * (k + 0.5)) / nm + n[1] * 0.3];
      WB.box(p[0], p[1], y0 + y, y0 + y + 2.6, (L / nm) - 0.5, 0.08, ang, [1, 1, 1]);
    }
  }
  // the prow edge and the crown
  S.box(L2W(TD / 2 + PROW, 0)[0], L2W(TD / 2 + PROW, 0)[1], y0 + T0, y0 + T1 + 0.6, 2.4, 0.4, Math.atan2(eT[1], eT[0]), C.mullion);
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
  S.box(tc[0], tc[1], y0 + T1 + 1.4, y0 + TOP - 3.4, TW * 0.45, TD * 0.5, Math.atan2(eT[1], eT[0]), hex('#c9cdd0'), { top: C.roof, topKind: KIND.FLAT });
  S.cyl(tc[0], tc[1], y0 + TOP - 3.4, y0 + TOP - 0.3, 0.25, 0.06, 5, hex('#d8dadb'));
  AB.box(tc[0], tc[1], y0 + TOP - 0.4, y0 + TOP, 0.35, 0.35, 0, [1, 1, 1]);
  // the two vertical prow lines lit
  for (const s of [-1, 1]) { const p = plan[s < 0 ? 0 : 5]; LB.beam([p[0], y0 + T0, p[1]], [p[0], y0 + T1, p[1]], 0.14, 0.14, [1, 1, 1]); }

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
