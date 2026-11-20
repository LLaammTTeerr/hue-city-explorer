import { KIND, hex, shade } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { rise } from '../../geo/terrain.js';

// ---- Hổ Quyền, the royal arena for elephant-and-tiger fights at Trường Đá, Thủy Biều (1830) ----
//
// Sources (docs/places/hoquyen.md has the full list):
//  - vi.wikipedia.org/wiki/Hổ_Quyền and e.vnexpress.net (roman-style gladiator arena under restoration, 4423067): an
//    open ring arena ("vành khăn") built 1830 (Minh Mạng 11); inner wall 5.8-5.9 m high, outer wall 4.75 m, both
//    about 4.5 m thick; outer circumference 140-145 m, the "basin" 44 m across; the outer wall leans 10-15°
//    (vtcnews.vn, vietnamnet.vn); the king's stand on the north side, raised above the rest, looking across at five
//    tiger cages built into the opposite wall; a 24-step stair to the left of the stand for the king and court, a
//    second for mandarins and soldiers on the right; an outer gate (two wooden leaves on bluestone, "Hổ Quyền" over
//    it) through which the elephants came in; a round lawn inside; tiger-face drain spouts in the outer wall;
//    restored by the Huế Monuments Conservation Centre from late 2019 to early 2022 (walls, stairs, cage pulleys).
//  - Wikimedia Commons, Category:Hổ_Quyền (photos "Hổ Quyền 1", "Hổ Quyền Huế" during the restoration, "Ho Quyen
//    2/3", the Flickr "No tigers left"): dark weathered brick, a moulded cornice and a pierced checkerboard parapet on
//    the outer wall, the plain taller inner wall showing behind it; the gate an arch between two square pillars
//    with lantern caps, an iron grille in it; the stair a straight projecting flight with sloping cheek walls and
//    capped posts at the foot, an iron railing at its head; from the stand, the opposite inner wall with five
//    arched cage doors at its foot, the left-most the largest; each cage a roofless brick pit open to the wall top.
//    The restoration renders the cornice, parapet, coping, pillars and stair cheeks in grey lime; the brick stays bare.
//  - OpenStreetMap relation 19381147 (building=historic): outer ring R 21.2 m, inner ring R 16.5 m about the same
//    centre; footways along the north side.
// No roof over the king's stand is reported or seen in any photo, so it is drawn as the raised open platform it is.
// Estimated: the exact radii (44 m outer diameter from the sources, 4.5 m thick), the split of the wall top into a
// lower outer ledge and the higher inner wall walk, the gate and stairs' bearing (on the north face either side of
// the stand), the cage door sizes and spacing, the paving round the foot.

const C = [-3661.4, 2250.1]; // ring centre (OSM fit)
const R_OUT = 22.0, R_IN = 17.5; // outer foot, inner face of the inner wall
const BRICK = hex('#5d5049'), BRICK_D = hex('#4a3f39'), TOPB = hex('#8a5c49'), LIME = hex('#a9a69d'), LIME_D = hex('#7d7a73');
const DARK = hex('#211d1a'), IRON = hex('#2c2a28'), LAWN = hex('#7e9c55'), PAVE = hex('#9a6250'), EARTH = hex('#a88d6c');
const SEG = 72;

export const id = 'hoquyen';

export function build({ S }) {
  // a point at bearing a (radians, 0 = north, clockwise) and radius r from the centre
  const P = (a, r) => [C[0] + Math.sin(a) * r, C[1] - Math.cos(a) * r];
  // the ground falls about 2.5 m from south-west to north-east across the site (the foot of Long Thọ hill). The
  // walls are levelled on the front, the north side with the gate and stairs; the arena floor is level, just above
  // the highest ground inside, and the outer wall's foot runs down to the lowest point outside.
  const gr = (x, z) => LAND_Y + rise(x, z);
  const y0 = gr(...P(0, R_OUT + 1));
  let yLow = Infinity, yHi = -Infinity;
  for (let i = 0; i < 24; i++) { const p = P((i / 24) * Math.PI * 2, R_OUT + 3); yLow = Math.min(yLow, gr(p[0], p[1])); }
  for (let i = 0; i < 24; i++) for (const r of [0, 8, 13, R_IN]) { const p = P((i / 24) * Math.PI * 2, r); yHi = Math.max(yHi, gr(p[0], p[1])); }
  S.base = y0 - LAND_Y;
  const yF = Math.max(y0, yHi) + 0.25; // (so the mapped building under it is seen as covered, and dropped)

  // an annular band between bearings a0..a1: outer face from rOb (at ya) to rOt (at yb), inner face rIb..rIt, top
  const band = (a0, a1, n, ya, yb, rOb, rOt, rIb, rIt, col, top = col, { outer = true, inner = true } = {}) => {
    for (let i = 0; i < n; i++) {
      const s = a0 + ((a1 - a0) * i) / n, e = a0 + ((a1 - a0) * (i + 1)) / n, m = (s + e) / 2;
      const out = [Math.sin(m), 0.05, -Math.cos(m)], inw = [-Math.sin(m), 0.05, Math.cos(m)];
      const q = (a, r, y) => { const p = P(a, r); return [p[0], y, p[1]]; };
      if (outer) S.quad(q(s, rOb, ya), q(e, rOb, ya), q(e, rOt, yb), q(s, rOt, yb), col, out);
      if (inner) S.quad(q(s, rIb, ya), q(e, rIb, ya), q(e, rIt, yb), q(s, rIt, yb), shade(col, 0.85), inw);
      if (top) S.quad(q(s, rIt, yb), q(e, rIt, yb), q(e, rOt, yb), q(s, rOt, yb), top, [0, 1, 0]);
    }
  };
  const TAU = Math.PI * 2;

  // ---- ground: a brick-paved apron round the foot, an earth yard beyond it, the round lawn inside ----
  const paved0 = S.n;
  S.kind = KIND.GROUND;
  for (const [r0, r1, col] of [[R_OUT - 0.2, R_OUT + 3.2, PAVE], [R_OUT + 3.2, R_OUT + 9, EARTH]]) { // draped on the slope
    for (let i = 0; i < SEG; i++) {
      const q = (a, r) => { const p = P(a, r); return [p[0], gr(p[0], p[1]) + 0.06, p[1]]; };
      const s = (i / SEG) * TAU, e = ((i + 1) / SEG) * TAU;
      S.quad(q(s, r0), q(e, r0), q(e, r1), q(s, r1), col, [0, 1, 0]);
    }
  }
  S.kind = KIND.PLAIN;
  for (let i = 0; i < SEG; i++) { // the lawn: a fan from the centre
    const s = (i / SEG) * TAU, e = ((i + 1) / SEG) * TAU, a = P(s, R_IN + 0.1), b = P(e, R_IN + 0.1);
    S.tri([C[0], yF, C[1]], [a[0], yF, a[1]], [b[0], yF, b[1]], LAWN, [0, 1, 0]);
  }
  // the pale circle worn in the middle of the lawn (vtcnews: "never faded")
  band(0, TAU, 40, yF, yF + 0.02, 4.4, 4.4, 4.0, 4.0, shade(LAWN, 1.25), shade(LAWN, 1.25), { outer: false, inner: false });

  // ---- the outer wall: battered brick, a grey moulded cornice, the pierced checkerboard parapet, coping ----
  const yC = Math.max(y0, yF - 0.6) + 4.15, yP = yC + 0.3, yT = yP + 0.75;
  S.kind = KIND.MASONRY;
  band(0, TAU, SEG, yLow - 0.5, yC, R_OUT, R_OUT - 0.88, 20.6, 20.6, BRICK, TOPB, { inner: false }); // ~12° batter
  band(0, TAU, SEG, yC, yP, R_OUT - 0.62, R_OUT - 0.62, 20.6, 20.6, LIME, LIME, { inner: false });
  band(0, TAU, SEG, yP, yT, R_OUT - 0.85, R_OUT - 0.85, 20.75, 20.75, LIME, LIME);
  band(0, TAU, SEG, yT, yT + 0.1, R_OUT - 0.78, R_OUT - 0.78, 20.68, 20.68, LIME_D, LIME_D);
  // the open lattice: dark squares in a staggered double row (a chequer of hollow tiles) on the parapet's outer face
  S.kind = KIND.PLAIN;
  const rL = R_OUT - 0.79, nL = 240;
  for (let i = 0; i < nL; i++) for (let row = 0; row < 2; row++) {
    if ((i + row) % 2 || Math.abs(Math.sin((i / nL) * Math.PI)) < 0.18) continue; // not behind the stand
    const a = (i / nL) * TAU, w = (TAU / nL) * 0.3, ya = yP + 0.14 + row * 0.24;
    const p0 = P(a - w, rL), p1 = P(a + w, rL), o = [Math.sin(a), 0, -Math.cos(a)];
    S.quad([p0[0], ya, p0[1]], [p1[0], ya, p1[1]], [p1[0], ya + 0.2, p1[1]], [p0[0], ya + 0.2, p0[1]], DARK, o);
  }

  // ---- the wall walk between the walls, then the higher inner wall with its brick parapet over the arena ----
  S.kind = KIND.MASONRY;
  band(0, TAU, SEG, yC, yP, 20.6, 20.6, 19.3, 19.3, TOPB, TOPB, { outer: false, inner: false });
  const yW = yF + 5.45, yI = yF + 5.9; // the inner wall walk, its parapet top (5.9 m over the lawn)
  band(0, TAU, SEG, yLow - 0.5, yW, 19.3, 19.3, R_IN, R_IN, BRICK, TOPB);
  band(0, TAU, SEG, yW, yI, R_IN + 0.45, R_IN + 0.45, R_IN, R_IN, shade(BRICK, 1.12), shade(TOPB, 0.9));

  // ---- the five tiger cages in the south of the inner wall: arched doors at the lawn, roofless pits above ----
  // facing the king's stand; the left-most as seen from the stand (to the east) is the largest
  S.kind = KIND.PLAIN;
  const arch = (a, r, w, h, yb, inward) => { // a dark round-headed opening drawn on the wall face at radius r
    const o = inward ? [-Math.sin(a), 0, Math.cos(a)] : [Math.sin(a), 0, -Math.cos(a)];
    const t = [Math.cos(a), 0, Math.sin(a)], c = P(a, r), hs = h - w / 2;
    const at = (u, y) => [c[0] + t[0] * u, y, c[1] + t[2] * u];
    S.quad(at(-w / 2, yb), at(w / 2, yb), at(w / 2, yb + hs), at(-w / 2, yb + hs), DARK, o);
    for (let k = 0; k < 6; k++) {
      const b0 = (Math.PI * k) / 6, b1 = (Math.PI * (k + 1)) / 6;
      S.tri(at(0, yb + hs), at((Math.cos(b0) * w) / 2, yb + hs + (Math.sin(b0) * w) / 2), at((Math.cos(b1) * w) / 2, yb + hs + (Math.sin(b1) * w) / 2), DARK, o);
    }
  };
  const cages = [[-0.3, 1.3, 1.9], [-0.15, 0.9, 1.3], [0, 0.9, 1.3], [0.15, 0.9, 1.3], [0.3, 1.1, 1.6]]; // offset from due south (rad), door w, h
  for (const [da, w, h] of cages) {
    const a = Math.PI - da; // east of south when da < 0 (the stand's left)
    arch(a, R_IN - 0.03, w, h, yF, true);
    // the pit seen from the wall walk: a dark square sunk in the walk, with a lime lintel over the door
    const p = P(a, 18.4), t = Math.atan2(-Math.cos(a), Math.sin(a));
    S.box(p[0], p[1], yW + 0.01, yW + 0.03, 1.6, 1.6, t, DARK);
    S.box(P(a, R_IN - 0.05)[0], P(a, R_IN - 0.05)[1], yF + h + 0.05, yF + h + 0.25, 0.1, w + 0.5, t, LIME_D);
  }

  // ---- the elephant gate on the north face: an arch between two pillars with lantern caps, an iron grille ----
  {
    const a = 0, pr = R_OUT + 0.15, ang = Math.atan2(-Math.cos(a), Math.sin(a)); // box local x radial
    const g = P(a, R_OUT - 0.3);
    S.kind = KIND.MASONRY;
    S.box(g[0], g[1], y0 - 0.3, yP, 1.6, 4.6, ang, shade(BRICK, 0.92), { top: LIME }); // the gate block, proud of the wall
    S.box(g[0], g[1], yP, yP + 0.25, 1.75, 4.7, ang, LIME); // its cornice
    for (const s of [-1, 1]) {
      const q = P(a + (s * 2.75) / pr, pr);
      S.box(q[0], q[1], y0 - 0.3, yT + 0.45, 0.95, 0.95, ang, LIME);
      S.box(q[0], q[1], yT + 0.45, yT + 0.6, 1.15, 1.15, ang, LIME_D);
      S.box(q[0], q[1], yT + 0.6, yT + 1.05, 0.7, 0.7, ang, LIME, { taper: 0.8 }); // the lantern cap
      S.box(q[0], q[1], yT + 1.05, yT + 1.2, 0.9, 0.9, ang, LIME_D);
    }
    S.kind = KIND.PLAIN;
    arch(a, R_OUT + 0.52, 2.6, 3.6, y0, false);
    // the grille: vertical bars in front of the opening
    const t = [Math.cos(a), 0, Math.sin(a)], c = P(a, R_OUT + 0.55);
    for (let k = -5; k <= 5; k++) { const u = k * 0.22; S.box(c[0] + t[0] * u, c[1] + t[2] * u, y0, y0 + 2.7, 0.05, 0.05, 0, IRON); }
    S.box(c[0], c[1], y0 + 1.4, y0 + 1.47, 0.05, 2.4, ang, IRON);
    arch(a, R_IN - 0.03, 2.6, 3.6, yF, true); // the passage comes out on the lawn opposite the cages
  }

  // ---- the two stairs either side of the king's stand: 24 steps up the outer wall, sloping lime cheeks, posts ----
  const nSt = 24, run = 0.28, rise1 = (yP - y0) / nSt, sw = 3.0;
  for (const s of [-1, 1]) {
    const a = s * 0.44, ang = Math.atan2(-Math.cos(a), Math.sin(a)); // local x radial (outward)
    const rTop = R_OUT - 0.9;
    S.kind = KIND.MASONRY;
    for (let k = 0; k < nSt; k++) {
      const r0 = rTop + k * run, c = P(a, r0 + run / 2 + 0.4);
      S.box(c[0], c[1], y0 - 0.3, yP - k * rise1, run + 0.8, sw, ang, shade(TOPB, 0.95 + (k % 2) * 0.05), { topKind: KIND.ROAD });
    }
    const len = nSt * run + 0.8, foot = rTop + len;
    for (const e of [-1, 1]) { // cheek walls: a sloping lime coping over brick
      const off = e * (sw / 2 + 0.22), tq = [Math.cos(a), Math.sin(a)];
      const at = (r, y) => { const p = P(a, r); return [p[0] + tq[0] * off, y, p[1] + tq[1] * off]; };
      for (let k = 0; k < 6; k++) {
        const ra = rTop + (len * k) / 6, rb = rTop + (len * (k + 1)) / 6;
        const ya = yP + 0.45 - ((yP - y0) * k) / 6, yb = yP + 0.45 - ((yP - y0) * (k + 1)) / 6;
        const c = P(a, (ra + rb) / 2);
        S.box(c[0] + tq[0] * off, c[1] + tq[1] * off, y0 - 0.3, Math.min(ya, yb) + 0.05, rb - ra, 0.44, ang, BRICK_D);
        S.beam(at(ra, ya), at(rb, yb), 0.5, 0.18, LIME);
      }
      const pp = P(a, foot + 0.1); // the capped post at the foot
      S.box(pp[0] + tq[0] * off, pp[1] + tq[1] * off, y0, y0 + 1.25, 0.65, 0.65, ang, LIME);
      S.box(pp[0] + tq[0] * off, pp[1] + tq[1] * off, y0 + 1.25, y0 + 1.45, 0.8, 0.8, ang, LIME_D);
    }
  }

  // ---- the king's stand: a raised platform over the gate, on the north arc between the stairs ----
  {
    const yS = yW + 0.5;
    S.kind = KIND.MASONRY;
    band(-0.36, 0.36, 10, yP, yS, R_OUT - 0.85, R_OUT - 0.85, R_IN, R_IN, shade(BRICK, 1.05), shade(TOPB, 1.08));
    band(-0.36, 0.36, 10, yS, yS + 0.45, R_IN + 0.4, R_IN + 0.4, R_IN, R_IN, shade(BRICK, 1.12), LIME_D); // parapet to the arena
    // the iron railing along its outer edge and down its open sides
    S.kind = KIND.PLAIN;
    const rr = R_OUT - 1.0;
    for (let k = 0; k <= 28; k++) { const p = P(-0.36 + (0.72 * k) / 28, rr); S.box(p[0], p[1], yS, yS + 1.1, 0.05, 0.05, 0, IRON); }
    band(-0.36, 0.36, 10, yS + 1.0, yS + 1.08, rr + 0.03, rr + 0.03, rr - 0.03, rr - 0.03, IRON);
    for (const s of [-1, 1]) {
      const a = s * 0.36, p0 = P(a, rr), p1 = P(a, R_IN + 0.4);
      for (let k = 0; k <= 5; k++) { const t = k / 5; S.box(p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t, yS, yS + 1.1, 0.05, 0.05, 0, IRON); }
      S.beam([p0[0], yS + 1.04, p0[1]], [p1[0], yS + 1.04, p1[1]], 0.06, 0.06, IRON);
    }
  }

  // ---- the tiger-face drain spouts at the foot of the outer wall ----
  S.kind = KIND.PLAIN;
  for (let i = 0; i < 12; i++) {
    const a = ((i + 0.5) / 12) * TAU;
    if (Math.abs(Math.sin(a / 2)) < 0.28) continue; // not on the gate and stair front
    const p = P(a, R_OUT - 0.02), ang = Math.atan2(-Math.cos(a), Math.sin(a));
    S.box(p[0], p[1], y0 + 0.35, y0 + 0.85, 0.3, 0.55, ang, LIME_D);
    const q = P(a, R_OUT + 0.14);
    S.box(q[0], q[1], y0 + 0.5, y0 + 0.62, 0.06, 0.16, ang, DARK);
  }

  (S.paved = S.paved || []).push([paved0, S.n]); // arena, walls and apron: no trees, no houses
  S.kind = KIND.PLAIN;
  S.base = 0;
}
