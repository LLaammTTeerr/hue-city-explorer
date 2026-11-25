import { KIND, hex, shade, mix } from '../../geo/buf.ts';
import { LAND_Y } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';

// ---- Hổ Quyền, the royal arena for elephant-and-tiger fights at Trường Đá, Thủy Biều (1830) ----
//
// Sources (docs/places/hoquyen.md has the full list):
//  - vi.wikipedia.org/wiki/Hổ_Quyền and e.vnexpress.net (roman-style gladiator arena under restoration, 4423067): an
//    open ring arena ("vành khăn") built 1830 (Minh Mạng 11); inner wall 5.8-5.9 m high, outer wall 4.75 m, both
//    about 4.5 m thick; outer circumference 140-145 m, the "basin" 44 m across; the outer wall leans 10-15°
//    (vtcnews.vn, vietnamnet.vn); the king's stand on the north side, raised above the rest, looking across at five
//    tiger cages built into the opposite wall; a 24-step stair to the left of the stand for the king and court, a
//    second for mandarins and soldiers on the right; an outer gate through which the elephants came in; a round lawn
//    inside; tiger-face drain spouts in the outer wall; restored by the Huế Monuments Conservation Centre from late
//    2019 to early 2022 (walls, stairs, cage pulleys).
//  - Wikimedia Commons, Category:Hổ_Quyền: weathered grey-brown brick, a moulded cornice and a pierced checkerboard
//    parapet on the outer wall, the plain taller inner wall showing behind it; each cage a roofless brick pit open to
//    the wall top. The restoration renders the cornice, parapet, coping, pillars and stair cheeks in grey lime.
//  - Google satellite and car Street View from the north yard (2026, visual reference only; docs/places/hoquyen.md):
//    the stand is a block about 9 m wide on a bearing of about -10.5°, its face 24.4 m from the centre, its top a
//    grey lime chequer-lattice parapet with lotus-capped posts rising above the ring's own parapet, a small framed
//    plaque on its north face under the cornice. The east (left) flight climbs south along the stand's east flank,
//    lime cheeks on both sides and capped posts at its foot; the west (right) flight runs tangentially along the
//    ring wall from about -35° down to -52°, one sloping lime cheek over a solid brick side; between the stand and
//    the head of the west flight, at about -29.5°, a doorway in the ring wall between two grey lime pillars.
//  - OpenStreetMap relation 19381147 (building=historic): outer ring R 21.2 m, inner ring R 16.5 m about the same
//    centre; footways along the north side.
// No roof over the king's stand is reported or seen in any photo, so it is drawn as the raised open platform it is.
// Estimated: the exact radii (44 m outer diameter from the sources, 4.5 m thick), the split of the wall top into a
// lower outer ledge and the higher inner wall walk, the stand's floor level, the gate's inner passage, the cage door
// sizes, the paving round the foot.

const C = [-3661.4, 2250.1]; // ring centre (OSM fit)
const R_OUT = 22.0, R_IN = 17.5; // outer foot, inner face of the inner wall
// weathered brick: grey-brown, stained ochre where lime has washed over it and black where water runs
const BRICK = hex('#575550'), OCHRE = hex('#716852'), SOOT = hex('#383633'), BRICK_D = hex('#4a4540');
const TOPB = hex('#6a625a'), TREAD = hex('#6f675e'), LIME = hex('#a9a69d'), LIME_D = hex('#7d7a73');
const STAND = hex('#b4876a'); // the stand's tiled floor, pale terracotta from above
const DARK = hex('#211d1a'), LAWN = hex('#7e9c55'), PAVE = hex('#9d958a'), EARTH = hex('#a88d6c');
const SEG = 72;
const FRONT = -0.183; // bearing of the king's stand (radians, 0 = north, clockwise): satellite -10.5°, Street View -10.4°
const RS = 24.4, HW = 4.2; // the stand's outer face (distance along its axis from the centre) and half width
const GATE = -0.515; // the pillared doorway in the ring wall west of the stand (-29.5°)
const W_HEAD = -0.6, W_LAND = 0.035, W_STEP = 0.0116; // the west flight: head bearing, landing and step (radians)

export const id = 'hoquyen';

export function build({ S }) {
  // a point at bearing a (radians, 0 = north, clockwise) and radius r from the centre
  const P = (a, r): [number, number] => [C[0] + Math.sin(a) * r, C[1] - Math.cos(a) * r];
  const radial = (a) => Math.atan2(-Math.cos(a), Math.sin(a)); // a box angle whose local x points outward at a
  const TAU = Math.PI * 2;
  // the ground falls about 2.5 m from south-west to north-east across the site (the foot of Long Thọ hill). The
  // walls are levelled on the front, the north side with the stand; the arena floor is level, just above the
  // highest ground inside, and the outer wall's foot runs down to the lowest point outside.
  const gr = (x, z) => LAND_Y + rise(x, z);
  const y0 = gr(...P(FRONT, R_OUT + 1));
  let yLow = Infinity, yHi = -Infinity;
  for (let i = 0; i < 24; i++) { const p = P((i / 24) * TAU, R_OUT + 3); yLow = Math.min(yLow, gr(p[0], p[1])); }
  for (let i = 0; i < 24; i++) for (const r of [0, 8, 13, R_IN]) { const p = P((i / 24) * TAU, r); yHi = Math.max(yHi, gr(p[0], p[1])); }
  S.base = y0 - LAND_Y;
  const yF = Math.max(y0, yHi) + 0.25; // (so the mapped building under it is seen as covered, and dropped)
  const yC = Math.max(y0, yF - 0.6) + 4.15, yP = yC + 0.3, yT = yP + 0.75; // outer wall: cornice, parapet foot, top
  const yW = yF + 5.45, yI = yF + 5.9; // the inner wall walk, its parapet top (5.9 m over the lawn)

  // the stand's own frame: d along its axis from the centre, u across it (positive to the east)
  const o = [Math.sin(FRONT), -Math.cos(FRONT)], t = [Math.cos(FRONT), Math.sin(FRONT)];
  const A = (d, u): [number, number] => [C[0] + o[0] * d + t[0] * u, C[1] + o[1] * d + t[1] * u];
  const angF = radial(FRONT);
  // where the stand, the two flight heads and the gate break the ring's parapet (bearing intervals)
  const hs = Math.asin(HW / 21.2), ehd = 20.2; // the stand's half angle on the wall top; the east flight's head
  const breaks = [
    [FRONT - hs, FRONT + hs],
    [FRONT + Math.atan2(HW, ehd), FRONT + Math.atan2(HW + 2.4, ehd)],
    [W_HEAD - W_LAND, W_HEAD + 0.01],
  ];
  const inBreak = (a) => breaks.some(([s, e]) => a > s && a < e);
  const arcs = (() => { // [0, TAU) less the breaks
    const iv = breaks.map(([s, e]) => [(s + TAU) % TAU, (e + TAU) % TAU]).sort((p, q) => p[0] - q[0]);
    const out = []; let c = 0;
    for (const [s, e] of iv) { if (s > c) out.push([c, s]); c = Math.max(c, e); }
    if (c < TAU) out.push([c, TAU]);
    return out;
  })();

  // an annular band between bearings a0..a1: outer face from rOb (at ya) to rOt (at yb), inner face rIb..rIt, top
  const band = (a0, a1, n, ya, yb, rOb, rOt, rIb, rIt, col, top = col, { outer = true, inner = true }: Record<string, any> = {}) => {
    for (let i = 0; i < n; i++) {
      const s = a0 + ((a1 - a0) * i) / n, e = a0 + ((a1 - a0) * (i + 1)) / n, m = (s + e) / 2;
      const out = [Math.sin(m), 0.05, -Math.cos(m)], inw = [-Math.sin(m), 0.05, Math.cos(m)];
      const q = (a, r, y) => { const p = P(a, r); return [p[0], y, p[1]]; };
      const c = typeof col === 'function' ? col(m) : col;
      if (outer) S.quad(q(s, rOb, ya), q(e, rOb, ya), q(e, rOt, yb), q(s, rOt, yb), c, out);
      if (inner) S.quad(q(s, rIb, ya), q(e, rIb, ya), q(e, rIt, yb), q(s, rIt, yb), shade(c, 0.85), inw);
      if (top) S.quad(q(s, rIt, yb), q(e, rIt, yb), q(e, rOt, yb), q(s, rOt, yb), top, [0, 1, 0]);
    }
  };
  const ringBand = (...args: any[]) => { for (const [s, e] of arcs) (band as any)(s, e, Math.max(1, Math.ceil(((e - s) / TAU) * SEG)), ...args); };
  // weathered brick: a cell's colour from a hash, ochre wash in broad patches, dark streaks running down
  const hash = (i, j) => { const v = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return v - Math.floor(v); };
  const brickAt = (i, j) => {
    const h = hash(i, j), streak = hash(i, 99) > 0.8 ? 0.45 : 0;
    const ochre = Math.max(0, Math.sin(i * 0.19) * Math.sin(j * 0.6 + i * 0.05)) * 0.45;
    return shade(mix(mix(BRICK, OCHRE, ochre), SOOT, streak * (0.6 + 0.4 * h)), 0.94 + 0.12 * h);
  };
  // a lime post with a flared cap and a lotus knob (the stand's corners, stair heads and feet)
  const post = (x, z, yb, h, ang, w = 0.45) => {
    S.box(x, z, yb, yb + h, w, w, ang, LIME);
    S.box(x, z, yb + h, yb + h + 0.08, w + 0.14, w + 0.14, ang, LIME_D);
    S.box(x, z, yb + h + 0.08, yb + h + 0.24, w * 0.75, w * 0.75, ang, LIME, { taper: 0.75 });
    S.box(x, z, yb + h + 0.24, yb + h + 0.36, w * 0.36, w * 0.36, ang, LIME_D, { taper: 0.5 });
  };
  // a pierced lime parapet from a to b ([x, z]): base, chequer of dark cells on both faces, coping
  const lattice = (a, b, yb, h) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz), ang = Math.atan2(dz, dx);
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], n = [-dz / len, dx / len], th = 0.24;
    S.kind = KIND.MASONRY;
    S.box(m[0], m[1], yb, yb + h, len, th, ang, LIME);
    S.box(m[0], m[1], yb + h, yb + h + 0.1, len + 0.1, th + 0.12, ang, LIME_D);
    S.kind = KIND.PLAIN;
    const cell = 0.12, cols = Math.floor((len - 0.3) / cell), rows = Math.floor((h - 0.3) / cell);
    for (const side of [-1, 1]) {
      const off = side * (th / 2 + 0.005), nn = [n[0] * side, 0, n[1] * side];
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        if ((i + j) % 2) continue;
        const u0 = (len - cols * cell) / 2 + i * cell, ya = yb + 0.15 + j * cell;
        const p0 = [a[0] + (dx / len) * u0 + n[0] * off, a[1] + (dz / len) * u0 + n[1] * off];
        const p1 = [p0[0] + (dx / len) * cell, p0[1] + (dz / len) * cell];
        S.quad([p0[0], ya, p0[1]], [p1[0], ya, p1[1]], [p1[0], ya + cell, p1[1]], [p0[0], ya + cell, p0[1]], DARK, nn);
      }
    }
  };

  // ---- ground: a paved apron round the foot, an earth yard beyond it, the round lawn inside ----
  const paved0 = S.n;
  S.kind = KIND.GROUND;
  for (const [r0, r1, col] of ([[R_OUT - 0.2, R_OUT + 3.2, PAVE], [R_OUT + 3.2, R_OUT + 9, EARTH]] as any[])) { // draped on the slope
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

  // ---- the outer wall: battered weathered brick, a grey moulded cornice, the pierced checkerboard parapet ----
  // The brick face is drawn in small cells, each its own weathered colour, rather than with the generic masonry
  // courses, which read far too large and uniform on this wall.
  S.kind = KIND.PLAIN;
  {
    const nA = SEG * 6, rows = 12, yb = yLow - 0.5, rT = R_OUT - 0.88;
    for (let i = 0; i < nA; i++) for (let j = 0; j < rows; j++) {
      const s = (i / nA) * TAU, e = ((i + 1) / nA) * TAU, m = (s + e) / 2;
      const ya = yb + ((yC - yb) * j) / rows, yc = yb + ((yC - yb) * (j + 1)) / rows;
      const ra = R_OUT - ((R_OUT - rT) * j) / rows, rc = R_OUT - ((R_OUT - rT) * (j + 1)) / rows;
      const q = (a, r, y) => { const p = P(a, r); return [p[0], y, p[1]]; };
      S.quad(q(s, ra, ya), q(e, ra, ya), q(e, rc, yc), q(s, rc, yc), brickAt(i, j), [Math.sin(m), 0.2, -Math.cos(m)]);
    }
    band(0, TAU, SEG, yC, yC, rT, rT, 20.6, 20.6, TOPB, TOPB, { outer: false, inner: false });
  }
  S.kind = KIND.MASONRY;
  band(0, TAU, SEG, yC, yP, R_OUT - 0.62, R_OUT - 0.62, 20.6, 20.6, LIME, LIME, { inner: false }); // cornice
  ringBand(yP, yT, R_OUT - 0.85, R_OUT - 0.85, 20.75, 20.75, LIME, LIME);
  ringBand(yT, yT + 0.1, R_OUT - 0.78, R_OUT - 0.78, 20.68, 20.68, LIME_D, LIME_D);
  // the open lattice: dark squares in a staggered double row (a chequer of hollow tiles) on the parapet's outer face
  S.kind = KIND.PLAIN;
  const rL = R_OUT - 0.79, nL = 240;
  for (let i = 0; i < nL; i++) for (let row = 0; row < 2; row++) {
    const a = (i / nL) * TAU;
    if ((i + row) % 2 || inBreak(a) || inBreak(a - TAU)) continue;
    const w = (TAU / nL) * 0.3, ya = yP + 0.14 + row * 0.24;
    const p0 = P(a - w, rL), p1 = P(a + w, rL), on = [Math.sin(a), 0, -Math.cos(a)];
    S.quad([p0[0], ya, p0[1]], [p1[0], ya, p1[1]], [p1[0], ya + 0.2, p1[1]], [p0[0], ya + 0.2, p0[1]], DARK, on);
  }

  // ---- the wall walk between the walls, then the higher inner wall with its brick parapet over the arena ----
  S.kind = KIND.MASONRY;
  band(0, TAU, SEG, yC, yP, 20.6, 20.6, 19.3, 19.3, TOPB, TOPB, { outer: false, inner: false });
  band(0, TAU, SEG, yLow - 0.5, yW, 19.3, 19.3, R_IN, R_IN, BRICK, TOPB);
  const hsI = Math.asin(HW / R_IN); // the stand's own rail replaces the inner parapet over it
  band(FRONT + hsI, FRONT - hsI + TAU, SEG - 4, yW, yI, R_IN + 0.45, R_IN + 0.45, R_IN, R_IN, shade(BRICK, 1.12), shade(TOPB, 0.9));

  // ---- the five tiger cages in the south of the inner wall: arched doors at the lawn, roofless pits above ----
  // facing the king's stand, spread along about 23 m of the south wall walk (satellite); the left-most as seen from
  // the stand (to the east) is the largest
  S.kind = KIND.PLAIN;
  const arch = (a, r, w, h, yb, inward) => { // a dark round-headed opening drawn on the wall face at radius r
    const on = inward ? [-Math.sin(a), 0, Math.cos(a)] : [Math.sin(a), 0, -Math.cos(a)];
    const tt = [Math.cos(a), 0, Math.sin(a)], c = P(a, r), hh = h - w / 2;
    const at = (u, y): [number, number, number] => [c[0] + tt[0] * u, y, c[1] + tt[2] * u];
    S.quad(at(-w / 2, yb), at(w / 2, yb), at(w / 2, yb + hh), at(-w / 2, yb + hh), DARK, on);
    for (let k = 0; k < 6; k++) {
      const b0 = (Math.PI * k) / 6, b1 = (Math.PI * (k + 1)) / 6;
      S.tri(at(0, yb + hh), at((Math.cos(b0) * w) / 2, yb + hh + (Math.sin(b0) * w) / 2), at((Math.cos(b1) * w) / 2, yb + hh + (Math.sin(b1) * w) / 2), DARK, on);
    }
  };
  const cages = [[-0.6, 1.3, 1.9], [-0.3, 0.9, 1.3], [0, 0.9, 1.3], [0.3, 0.9, 1.3], [0.6, 1.1, 1.6]]; // offset from due south (rad), door w, h
  for (const [da, w, h] of cages) {
    const a = FRONT + Math.PI - da; // round from the point opposite the stand; da < 0 is the stand's left
    arch(a, R_IN - 0.03, w, h, yF, true);
    // the pit seen from the wall walk: a dark square sunk in the walk, with a lime lintel over the door
    const p = P(a, 18.4), ang = radial(a);
    S.box(p[0], p[1], yW + 0.01, yW + 0.03, 1.6, 1.8, ang, DARK);
    S.box(P(a, R_IN - 0.05)[0], P(a, R_IN - 0.05)[1], yF + h + 0.05, yF + h + 0.25, 0.1, w + 0.5, ang, LIME_D);
  }

  // ---- the doorway in the ring wall west of the stand: a dark opening between two grey lime pillars ----
  {
    const a = GATE, ang = radial(a), yg = gr(...P(a, R_OUT + 1)), pr = R_OUT;
    S.kind = KIND.PLAIN;
    const g = P(a, 21.75); // a plumb brick face round the opening, standing out of the batter
    S.box(g[0], g[1], yg - 0.3, yC, 1.0, 2.8, ang, brickAt(7, 3));
    S.kind = KIND.MASONRY;
    for (const s of [-1, 1]) {
      const q = P(a + (s * 1.25) / pr, 21.85);
      S.box(q[0], q[1], yg - 0.3, yT + 0.2, 0.8, 0.5, ang, LIME);
      post(q[0], q[1], yT + 0.2, 0.01, ang, 0.5);
    }
    S.box(g[0], g[1], yg + 3.0, yg + 3.3, 1.1, 1.9, ang, LIME_D); // lintel
    S.kind = KIND.PLAIN;
    const c = P(a, 22.27), tt = [Math.cos(a), Math.sin(a)], on = [Math.sin(a), 0, -Math.cos(a)];
    const at = (u, y): [number, number, number] => [c[0] + tt[0] * u, y, c[1] + tt[1] * u];
    S.quad(at(-0.85, yg), at(0.85, yg), at(0.85, yg + 3.0), at(-0.85, yg + 3.0), DARK, on);
    arch(a, R_IN - 0.03, 2.4, 3.4, yF, true); // the passage comes out on the lawn
  }

  // ---- the east flight (the king's, on the left seen from the yard): 24 steps up the stand's east flank ----
  {
    const nSt = 24, run = 0.2, uc = HW + 1.02, sw = 1.7, d0 = ehd + 0.6; // centre line, tread width, first step
    const yg = gr(...A(d0 + nSt * run, uc)), rise1 = (yP - yg) / nSt, dF = d0 + nSt * run;
    S.kind = KIND.MASONRY;
    const land = A(ehd + 0.2, uc); // the landing on the wall top
    S.box(land[0], land[1], yg - 0.3, yP, 1.4, sw + 0.7, angF, shade(TOPB, 0.97), { topKind: KIND.ROAD });
    for (let k = 0; k < nSt; k++) {
      const c = A(d0 + (k + 0.5) * run, uc);
      S.box(c[0], c[1], yg - 0.3, yP - k * rise1, run, sw, angF, shade(TREAD, 0.95 + (k % 2) * 0.05), { topKind: KIND.ROAD });
    }
    for (const e of [-1, 1]) { // cheeks: a sloping lime coping over brick, capped posts at both ends
      const u = uc + e * (sw / 2 + 0.15);
      for (let k = 0; k < 6; k++) {
        const da = ehd + ((dF - ehd) * k) / 6, db = ehd + ((dF - ehd) * (k + 1)) / 6;
        const ya = yP + 0.85 - ((yP - yg) * k) / 6, yb = yP + 0.85 - ((yP - yg) * (k + 1)) / 6;
        const c = A((da + db) / 2, u), pa = A(da, u), pb = A(db, u);
        S.kind = KIND.PLAIN;
        S.box(c[0], c[1], yg - 0.3, Math.min(ya, yb), db - da, 0.3, angF, brickAt(k + 40, e + 5));
        S.kind = KIND.MASONRY;
        S.beam([pa[0], ya, pa[1]], [pb[0], yb, pb[1]], 0.44, 0.16, LIME);
      }
      const pf = A(dF + 0.1, u);
      post(pf[0], pf[1], yg, 1.0, angF, 0.5);
      if (e > 0) { const ph = A(ehd, u); post(ph[0], ph[1], yP, 0.9, angF, 0.45); }
    }
  }

  // ---- the west flight (the officials'): 24 steps running down along the ring wall to the west ----
  {
    const nSt = 24, r0 = 21.2, r1 = 24.15, rc = (r0 + r1) / 2, rCh = r1 + 0.17;
    const aF = W_HEAD - W_LAND - nSt * W_STEP, yg = gr(...P(aF, R_OUT + 3)), rise1 = (yP - yg) / nSt;
    S.kind = KIND.MASONRY;
    const la = W_HEAD - W_LAND / 2, lp = P(la, (r0 - 0.3 + r1) / 2);
    S.box(lp[0], lp[1], yg - 0.3, yP, r1 - r0 + 0.3, W_LAND * rc + 0.05, radial(la), shade(TOPB, 0.97), { topKind: KIND.ROAD });
    for (let k = 0; k < nSt; k++) {
      const a = W_HEAD - W_LAND - (k + 0.5) * W_STEP, c = P(a, rc);
      S.box(c[0], c[1], yg - 0.3, yP - k * rise1, r1 - r0, W_STEP * rc + 0.02, radial(a), shade(TREAD, 0.95 + (k % 2) * 0.05), { topKind: KIND.ROAD });
    }
    // the outer cheek: a solid brick side under a sloping lime coping
    const aH = W_HEAD - W_LAND;
    for (let k = 0; k < 8; k++) {
      const sa = aH - ((aH - aF) * k) / 8, sb = aH - ((aH - aF) * (k + 1)) / 8;
      const ya = yP + 0.85 - ((yP - yg) * k) / 8, yb = yP + 0.85 - ((yP - yg) * (k + 1)) / 8;
      const m = (sa + sb) / 2, c = P(m, rCh), pa = P(sa, rCh), pb = P(sb, rCh);
      S.kind = KIND.PLAIN;
      S.box(c[0], c[1], yg - 0.3, Math.min(ya, yb), 0.34, Math.abs(sa - sb) * rCh + 0.02, radial(m), brickAt(k + 60, 2));
      S.kind = KIND.MASONRY;
      S.beam([pa[0], ya, pa[1]], [pb[0], yb, pb[1]], 0.44, 0.16, LIME);
    }
    // the landing's outer parapet, posts at the head and the foot
    const lb0 = P(W_HEAD + 0.005, rCh), lb1 = P(aH, rCh);
    S.beam([lb0[0], yP + 0.85, lb0[1]], [lb1[0], yP + 0.85, lb1[1]], 0.44, 0.16, LIME);
    S.box((lb0[0] + lb1[0]) / 2, (lb0[1] + lb1[1]) / 2, yP, yP + 0.8, 0.34, W_LAND * rCh, radial(la), LIME_D);
    const ph = P(W_HEAD + 0.005, rCh), pf = P(aF - 0.012, rCh);
    post(ph[0], ph[1], yP, 0.9, radial(W_HEAD), 0.45);
    post(pf[0], pf[1], gr(pf[0], pf[1]), 1.0, radial(aF), 0.5);
  }

  // ---- the king's stand: a raised block standing out from the front arc, a pierced lime parapet round its top ----
  {
    const dB = 19.3, yS = yP + 0.1; // its back (on the inner wall's outer face) and floor
    const cm = A((dB + RS) / 2, 0);
    S.kind = KIND.PLAIN;
    { // the brick block, its faces in weathered cells like the ring's
      const yb = y0 - 0.3, nU = 24, nY = 9;
      const fq = (d0, u0, d1, u1, ya, yb2, col, nrm) => { const p = A(d0, u0), q = A(d1, u1); S.quad([p[0], ya, p[1]], [q[0], ya, q[1]], [q[0], yb2, q[1]], [p[0], yb2, p[1]], col, nrm); };
      for (let i = 0; i < nU; i++) for (let j = 0; j < nY; j++) {
        const ua = -HW + (2 * HW * i) / nU, ub = -HW + (2 * HW * (i + 1)) / nU, ya = yb + ((yC - yb) * j) / nY, yc = yb + ((yC - yb) * (j + 1)) / nY;
        fq(RS, ua, RS, ub, ya, yc, brickAt(i + 200, j), [o[0], 0, o[1]]);
      }
      for (const s of [-1, 1]) for (let i = 0; i < 8; i++) for (let j = 0; j < nY; j++) {
        const da = 20.6 + ((RS - 20.6) * i) / 8, db = 20.6 + ((RS - 20.6) * (i + 1)) / 8, ya = yb + ((yC - yb) * j) / nY, yc = yb + ((yC - yb) * (j + 1)) / nY;
        fq(da, s * HW, db, s * HW, ya, yc, shade(brickAt(i + 220 + s, j), 0.95), [t[0] * s, 0, t[1] * s]);
      }
    }
    S.kind = KIND.MASONRY;
    S.box(cm[0], cm[1], yC, yC + 0.12, RS - dB + 0.3, 2 * HW + 0.3, angF, LIME_D); // the moulded cornice
    S.box(cm[0], cm[1], yC + 0.12, yS, RS - dB + 0.2, 2 * HW + 0.2, angF, LIME, { top: STAND });
    // the framed plaque under the cornice on the north face
    const pl = A(RS + 0.03, 0);
    S.box(pl[0], pl[1], yC - 1.05, yC - 0.25, 0.06, 1.15, angF, LIME_D);
    S.kind = KIND.PLAIN;
    const pl2 = A(RS + 0.065, 0);
    S.box(pl2[0], pl2[1], yC - 0.95, yC - 0.35, 0.01, 0.9, angF, BRICK_D);
    // the pierced parapet along the front and down both sides, lotus-capped posts at the corners and between
    const ph = 1.0, rf = RS - 0.12, ub = HW - 0.12, dS = 20.4;
    lattice(A(rf, -ub), A(rf, ub), yS, ph);
    for (const s of [-1, 1]) lattice(A(rf, s * ub), A(dS, s * ub), yS, ph);
    S.kind = KIND.MASONRY;
    for (let k = 0; k <= 4; k++) { const p = A(rf, -ub + (2 * ub * k) / 4); post(p[0], p[1], yS, ph + 0.25, angF, k % 4 ? 0.36 : 0.48); }
    for (const s of [-1, 1]) { const p = A(dS, s * ub); post(p[0], p[1], yS, ph + 0.25, angF, 0.4); }
    // a short flight up to the dais on the inner wall, and the dais's own rail along the arena edge
    const nD = Math.max(2, Math.round((yW - yS) / 0.18)), rd = (yW - yS) / nD;
    for (let k = 0; k < nD; k++) { const c = A(19.3 + (k + 0.5) * 0.28, 0); S.box(c[0], c[1], yS, yW - k * rd, 0.28, 2.0, angF, shade(TOPB, 1.02)); }
    band(FRONT - hsI, FRONT + hsI, 8, yW, yW, 19.3, 19.3, R_IN, R_IN, STAND, STAND, { outer: false, inner: false });
    band(FRONT - hsI, FRONT + hsI, 8, yW, yW + 0.85, R_IN + 0.25, R_IN + 0.25, R_IN, R_IN, LIME, LIME_D);
    for (let k = 0; k <= 4; k++) { const a = FRONT - hsI + (2 * hsI * k) / 4, p = P(a, R_IN + 0.12); post(p[0], p[1], yW, 1.05, radial(a), 0.34); }
  }

  // ---- the tiger-face drain spouts at the foot of the outer wall ----
  S.kind = KIND.PLAIN;
  for (let i = 0; i < 12; i++) {
    const a = ((i + 0.5) / 12) * TAU, aa = a > Math.PI ? a - TAU : a;
    if ((aa > FRONT - 0.32 && aa < FRONT + 0.55) || (aa > -1.0 && aa < GATE + 0.1)) continue; // not on the stand, stairs or gate
    const p = P(a, R_OUT - 0.02), ang = radial(a);
    S.box(p[0], p[1], y0 + 0.35, y0 + 0.85, 0.3, 0.55, ang, LIME_D);
    const q = P(a, R_OUT + 0.14);
    S.box(q[0], q[1], y0 + 0.5, y0 + 0.62, 0.06, 0.16, ang, DARK);
  }

  (S.paved = S.paved || []).push([paved0, S.n]); // arena, walls and apron: no trees, no houses
  S.kind = KIND.PLAIN;
  S.base = 0;
}
