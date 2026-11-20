import { KIND, hex, shade } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { rise } from '../../geo/terrain.js';

// Lăng Khải Định (Ứng Lăng), the tomb of Emperor Khải Định on the slope of Châu Chữ hill, built 1920-1931 in
// reinforced concrete, now weathered grey-black. Notes and sources: docs/places/khaidinh.md.
//
// Plan (vi.wikipedia.org/wiki/Lăng_Khải_Định): a rectangle 117 × 48.5 m on one axis climbing the hill in seven
// levels and 127 steps. From the road 37 steps in three lanes between four dragon balustrades lead to the main
// gate; the court of Tả/Hữu Tòng Tự (47 × 24.5 m, two three-bay houses); 29 steps up to Bái Đình, the salutation
// court, with two rows of stone mandarins, soldiers, horses and elephants each side; the two-tier octagonal stele
// pavilion (Bi Đình) at the back of it between two trụ biểu (obelisks); three narrow courts 13 steps apart, each
// flight between four dragons, two concrete flagpoles on the middle one; Cung Thiên Định (34.5 × 26.4 m) on top.
// Placed on the OSM outlines (hue.json sites.khaidinh, converted to the local frame below): the precinct (way
// 175035807, 109.6 × 47.1 m: the first stair lies outside it, which makes up the 117 m), Cung Thiên Định
// (242940960), the two Tòng Tự (242940962/3, 17 × 8.6 m, long side along the axis) and the stele pavilion
// (242940961). Riser heights, the depth of the upper courts, every height above the floors: estimated from photos.
//
// Local frame: s up the axis from the precinct's front edge (south-west, at the head of the first stair) to its back
// (north-east), t across it, + to the south-east.
export const id = 'khaidinh';

const O = [120.35, 7766.5]; // middle of the precinct's front edge, model metres
const UX = 0.6889, UZ = -0.7249; // the axis, up the hill
const A = Math.atan2(UZ, UX), AV = A + Math.PI / 2;
const P = (s, t = 0) => [O[0] + UX * s - UZ * t, O[1] + UZ * s + UX * t];
const V = (s, t, y) => { const p = P(s, t); return [p[0], y, p[1]]; };
const gY = (s, t = 0) => { const p = P(s, t); return LAND_Y + rise(p[0], p[1]); };
const W2 = 24.25; // half the precinct's width (48.5 m)

// weathered concrete: dark grey walls streaked black, darker ardoise roofs, paler mouldings, cornices and statues
const WALL = hex('#5e5c59'), DARKW = hex('#4c4a47'), ROOF = hex('#3f3e3c'), TRIM = hex('#a19d94'), PAVE = hex('#77746d');
const STAT = hex('#8a867e'), IRON = hex('#1f1e1d'), VOID = hex('#1b1918'), PALW = hex('#8d8a84');
// the concrete is drawn as KIND.FLAT (mottled render), not KIND.MASONRY, whose shader lays brick courses on it

// the levels: [front s, back s]; each flight stands on the level below, against the front wall of the next one
const LV = { L2: [0, 31], L3: [31, 57], L4: [57, 64], L5: [64, 71], L6: [71, 81], L7: [81, 110] };
// flights: steps, from s, to s, the level they climb from, lane layout
const STEPS = [37, 29, 13, 13, 13, 22]; // 127 in all; the split of the last 61 into 13 + 13 + 13 + 22 is estimated

export function build({ S }) {
  const keep = S.kind;
  const box = (s, t, y0, y1, ss, st, col, o) => { const p = P(s, t); S.box(p[0], p[1], y0, y1, ss, st, A, col, o); };

  // ---- levels: the riser is set so the palace floor sits just under the hill behind it ----
  const y0 = gY(-10);
  const r = Math.max(0.15, Math.min(0.2, (gY(105) - 0.8 - y0) / 127));
  const Y = {};
  let y = y0;
  ['L2', 'L3', 'L4', 'L5', 'L6', 'L7'].forEach((k, i) => { y += STEPS[i] * r; Y[k] = y; });

  const n0 = S.n;
  S.kind = KIND.FLAT;
  // each level a block of concrete from below the lowest ground under it, full width, paved top; a parapet along
  // the sides makes the 3 m fence of the precinct (the fronts of the levels are the retaining walls)
  for (const k of Object.keys(LV)) {
    const [a, b] = LV[k], top = Y[k];
    let lo = Infinity;
    for (let s = a; s <= b; s += 3) for (const t of [-W2, 0, W2]) lo = Math.min(lo, gY(s, t));
    S.base = lo - 1 - LAND_Y;
    box((a + b) / 2, 0, lo - 1, top, b - a, 2 * W2, WALL, { top: PAVE, topKind: KIND.ROAD });
    // coping of the retaining wall at the front edge, either side of the flight
    if (k !== 'L2') for (const sd of [-1, 1]) box(a + 0.3, sd * (W2 + 7) / 2, top - 0.4, top + 0.15, 0.7, W2 - 7, TRIM);
    for (const sd of [-1, 1]) {
      box((a + b) / 2, sd * (W2 - 0.3), top, top + 1.6, b - a, 0.6, WALL, { top: TRIM });
      for (let s = a + 0.3; s <= b; s += Math.max(3, (b - a) / Math.round((b - a) / 5))) box(s, sd * (W2 - 0.3), top, top + 2.1, 0.9, 0.9, DARKW, { top: TRIM });
    }
  }
  // front wall of the Tòng Tự court, with the gate in it, and the back wall behind the palace
  for (const sd of [-1, 1]) box(0.3, sd * (W2 + 8.4) / 2, Y.L2, Y.L2 + 1.6, 0.6, W2 - 8.4, WALL, { top: TRIM });
  box(LV.L7[1] - 0.3, 0, Y.L7, Math.max(Y.L7 + 2.2, gY(110) + 1.6), 0.6, 2 * W2, WALL, { top: TRIM });

  // ---- the flights ----
  // the first: 37 steps from the road, three lanes between four dragon balustrades
  flight(S, -10, 0, y0, Y.L2, STEPS[0], [[-5.1, 3.2], [0, 6], [5.1, 3.2]], [-8.1, -3.4, 3.4, 8.1], true);
  // to Bái Đình: 29 steps, one wide flight between plain balustrades
  flight(S, 23.8, 31, Y.L2, Y.L3, STEPS[1], [[0, 10]], [-5.4, 5.4], false);
  // the three upper flights of 13 steps, each between four dragons
  const lanes3 = [[-3.4, 2.2], [0, 3.6], [3.4, 2.2]], rails3 = [-5.0, -2.2, 2.2, 5.0];
  flight(S, 53.6, 57, Y.L3, Y.L4, STEPS[2], lanes3, rails3, true);
  flight(S, 60.6, 64, Y.L4, Y.L5, STEPS[3], lanes3, rails3, true);
  flight(S, 67.6, 71, Y.L5, Y.L6, STEPS[4], lanes3, rails3, true);
  // up to the palace terrace
  flight(S, 75.3, 81, Y.L6, Y.L7, STEPS[5], [[0, 9]], [-4.9, 4.9], false);

  // ---- the main gate at the head of the first stair: four tower-capped piers, wrought-iron gates (made in France) ----
  S.kind = KIND.FLAT; S.base = Y.L2 - LAND_Y;
  for (const t of [-8.4, -3.6, 3.6, 8.4]) {
    const big = Math.abs(t) < 5;
    box(0.4, t, Y.L2, Y.L2 + (big ? 5.6 : 4.8), 1.3, 1.3, WALL, { top: TRIM });
    box(0.4, t, Y.L2 + (big ? 5.6 : 4.8), Y.L2 + (big ? 6.0 : 5.2), 1.6, 1.6, TRIM);
    // the stepped, Indian-looking tower cap
    box(0.4, t, Y.L2 + (big ? 6.0 : 5.2), Y.L2 + (big ? 7.0 : 6.0), 1.1, 1.1, WALL, { taper: 0.7 });
    box(0.4, t, Y.L2 + (big ? 7.0 : 6.0), Y.L2 + (big ? 8.0 : 6.8), 0.7, 0.7, TRIM, { taper: 0.15 });
  }
  box(0.4, 0, Y.L2 + 4.4, Y.L2 + 5.0, 0.8, 6.6, WALL, { top: TRIM }); // the lintel over the middle way
  S.kind = KIND.PLAIN;
  for (const [t, w, h] of [[-6, 3.5, 3.2], [0, 5.9, 4.3], [6, 3.5, 3.2]]) box(0.4, t, Y.L2, Y.L2 + h, 0.12, w, IRON);

  // ---- Tả / Hữu Tòng Tự: three bays, walled, roofs of flat tiles, an open front to the court ----
  for (const sd of [-1, 1]) {
    const s = 14.3, t = sd * 17.1, f = Y.L2 + 0.6;
    S.kind = KIND.FLAT; S.base = Y.L2 - LAND_Y;
    box(s, t, Y.L2, f, 17.6, 9.2, TRIM, { topKind: KIND.ROAD });
    box(s, t + sd * 1.0, f, f + 3.6, 17, 6.6, WALL, { top: ROOF }); // the walled back of the hall
    for (let k = 0; k < 4; k++) box(s - 8.1 + k * 5.4, t - sd * 3.6, f, f + 3.6, 0.5, 0.5, TRIM); // front pillars
    box(s, t - sd * 3.6, f + 3.3, f + 3.8, 17, 0.6, TRIM);
    const p = P(s, t);
    S.hip(p[0], p[1], 17, 8.6, A, f + 3.7, 2.0, ROOF, { flare: 0.25, over: 0.8, fascia: 0.25, fasciaCol: TRIM, ridgeCol: TRIM, hips: true });
  }

  // ---- Bái Đình: two rows of statues each side, facing the axis: elephant and horse at the front, then mandarins
  // in the inner row, soldiers in the outer ----
  for (const sd of [-1, 1]) {
    const face = sd > 0 ? -1 : 1;
    beast(S, 33.5, sd * 10.8, Y.L3, true);
    beast(S, 33.5, sd * 7.4, Y.L3, false);
    for (let k = 0; k < 4; k++) {
      figure(S, 36.2 + k * 1.8, sd * 7.4, Y.L3, face, 1);
      figure(S, 36.2 + k * 1.8, sd * 10.8, Y.L3, face, 0.82);
    }
  }
  // the axis walk
  S.kind = KIND.FLAT; S.base = Y.L3 - LAND_Y;
  box(36, 0, Y.L3, Y.L3 + 0.08, 9.5, 4, TRIM, { topKind: KIND.ROAD });

  // ---- Bi Đình: octagonal, two roofs of ardoise, an arched opening in each face; the 3.1 m stele inside ----
  {
    const sp = 45.5, p = P(sp), rot = A + Math.PI / 8;
    let fy = Y.L3;
    S.kind = KIND.FLAT; S.base = fy - LAND_Y;
    for (const [rr, h] of [[6.0, 0.4], [5.4, 0.4], [4.8, 0.4]]) { S.cyl(p[0], p[1], fy - 0.05, fy + h, rr, rr, 8, TRIM, { rot }); fy += h; }
    // eight piers at the corners and a low drum; the openings dark
    S.cyl(p[0], p[1], fy, fy + 4.3, 4.0, 4.0, 8, VOID, { rot, cap: false });
    for (let i = 0; i < 8; i++) {
      const a = rot + (i / 8) * Math.PI * 2, x = p[0] + Math.cos(a) * 4.1, z = p[1] + Math.sin(a) * 4.1;
      S.box(x, z, fy, fy + 4.3, 1.0, 1.0, a, WALL, { top: TRIM });
      // the arch heads between the piers
      const b = a + Math.PI / 8, xm = p[0] + Math.cos(b) * 3.85, zm = p[1] + Math.sin(b) * 3.85;
      S.box(xm, zm, fy + 3.2, fy + 4.3, 0.5, 2.6, b, WALL);
    }
    S.box(p[0], p[1], fy, fy + 0.76, 0.85, 2.1, AV, TRIM); // the stele's plinth and the stele (3.1 × 1.2 m)
    S.box(p[0], p[1], fy + 0.76, fy + 3.86, 0.3, 1.2, AV, STAT);
    let ry = fy + 4.3;
    S.cyl(p[0], p[1], ry, ry + 0.4, 4.6, 4.6, 8, TRIM, { rot }); ry += 0.4;
    S.kind = KIND.TILE;
    S.cyl(p[0], p[1], ry, ry + 1.2, 5.6, 3.0, 8, ROOF, { rot }); ry += 1.2;
    S.kind = KIND.FLAT;
    S.cyl(p[0], p[1], ry, ry + 2.0, 2.8, 2.8, 8, WALL, { rot, cap: false });
    for (let i = 0; i < 8; i++) { const a = rot + ((i + 0.5) / 8) * Math.PI * 2; S.box(p[0] + Math.cos(a) * 2.62, p[1] + Math.sin(a) * 2.62, ry + 0.5, ry + 1.6, 0.12, 1.0, a, VOID); }
    ry += 2.0;
    S.cyl(p[0], p[1], ry, ry + 0.3, 3.3, 3.3, 8, TRIM, { rot }); ry += 0.3;
    S.kind = KIND.TILE;
    S.cyl(p[0], p[1], ry, ry + 2.2, 4.3, 0.3, 8, ROOF, { rot }); ry += 2.2;
    S.kind = KIND.FLAT;
    S.cyl(p[0], p[1], ry - 0.1, ry + 0.9, 0.35, 0.05, 6, TRIM);
    // the trụ biểu either side: square shafts on stepped bases, a stupa finial
    for (const sd of [-1, 1]) obelisk(S, sp, sd * 16, Y.L3);
  }

  // ---- the two concrete flagpoles on the middle of the three upper courts ----
  S.kind = KIND.FLAT; S.base = Y.L5 - LAND_Y;
  for (const sd of [-1, 1]) {
    box(66.4, sd * 8, Y.L5, Y.L5 + 1.2, 1.8, 1.8, TRIM);
    box(66.4, sd * 8, Y.L5 + 1.2, Y.L5 + 12, 0.5, 0.5, WALL, { taper: 0.55 });
  }

  palace(S, Y.L7);
  (S.paved = S.paved || []).push([n0, S.n]); // courts, terraces and stairs: no trees, no houses

  // the mapped outbuildings of the site, outside the precinct (ticket office and stalls at the foot): plain halls
  for (const ring of OUT) house(S, ring);
  S.kind = keep; S.base = 0;
}

// a flight of n steps from s0 (level ya) to s1 (level yb); lanes [t, width], balustrades at t, dragon or plain
function flight(S, s0, s1, ya, yb, n, lanes, rails, dragon) {
  const run = (s1 - s0) / n, rise_ = (yb - ya) / n;
  S.kind = KIND.FLAT;
  for (const [t, w] of lanes) for (let k = 0; k < n; k++) {
    const s = s0 + run * (k + 0.5), top = ya + rise_ * (k + 1);
    const lo = Math.min(ya, gY(s, t - w / 2), gY(s, t + w / 2)) - 0.6;
    S.base = lo - LAND_Y;
    const p = P(s, t);
    S.box(p[0], p[1], lo, top, run + 0.02, w, A, k % 2 ? PAVE : shade(PAVE, 0.94), { topKind: KIND.ROAD });
  }
  for (const t of rails) {
    const rw = dragon ? 0.75 : 0.45, rh = dragon ? 1.0 : 0.9;
    // the solid balustrade, bedded to the level below
    const a = V(s0, t, ya + rh / 2), b = V(s1, t, yb + rh / 2);
    S.kind = KIND.FLAT;
    S.beam(a, b, rw, rh, dragon ? WALL : TRIM);
    const lo = Math.min(ya, gY(s0, t)) - 0.5;
    S.base = lo - LAND_Y;
    const p0 = P(s0 + (s1 - s0) * 0.5, t);
    S.box(p0[0], p0[1], lo, ya + (yb - ya) * 0.5, s1 - s0, rw, A, DARKW);
    if (!dragon) {
      for (const [s, yy] of [[s0, ya], [s1, yb]]) { const q = P(s, t); S.box(q[0], q[1], yy, yy + 1.4, 0.7, 0.7, A, TRIM, { top: shade(TRIM, 1.1) }); }
      continue;
    }
    // the dragon: its body coiling along the rail in humps, the head rearing at the foot, the tail curling at the top
    const N = Math.max(4, Math.round((s1 - s0) / 1.6)) * 2;
    let prev = null;
    for (let i = 0; i <= N; i++) {
      const f = i / N, s = s0 + 0.9 + (s1 - s0 - 1.2) * f;
      const yy = ya + (yb - ya) * ((s - s0) / (s1 - s0)) + rh + 0.15 + 0.55 * Math.abs(Math.sin(f * Math.PI * (N / 4)));
      const q = V(s, t, yy);
      if (prev) S.beam(prev, q, 0.42, 0.42, TRIM);
      prev = q;
    }
    const h = P(s0 - 0.3, t), hh = P(s0 - 1.1, t);
    S.box(h[0], h[1], ya - 0.1, ya + 2.0, 1.4, rw + 0.25, A, WALL, { taper: 0.8, top: TRIM });
    S.box(hh[0], hh[1], ya + 1.5, ya + 2.3, 1.3, rw, A, TRIM); // the head and jaws, looking down the stair
    S.beam(V(s0 - 0.3, t, ya + 2.0), V(s0 + 0.4, t, ya + 2.8), 0.25, 0.4, TRIM); // the mane
    const tl = P(s1 - 0.2, t);
    S.box(tl[0], tl[1], yb, yb + 1.9, 0.8, 0.8, A, WALL, { top: TRIM, taper: 0.6 });
  }
}

// a standing figure on level y facing across the axis: mandarin (k = 1) or soldier (smaller)
function figure(S, s, t, y, face, k) {
  const p = P(s, t), a = A;
  S.kind = KIND.FLAT; S.base = y - LAND_Y;
  S.box(p[0], p[1], y, y + 0.35, 0.8, 0.8, a, shade(STAT, 0.85));
  S.box(p[0], p[1], y + 0.35, y + 0.35 + 1.45 * k, 0.5 * k + 0.1, 0.62 * k, a, STAT, { taper: 0.85 });
  const q = P(s, t + face * 0.05);
  S.box(q[0], q[1], y + 0.35 + 1.45 * k, y + 0.35 + 1.8 * k, 0.3, 0.3, a, shade(STAT, 1.06));
}
// an elephant (big) or a horse on level y, facing up the axis
function beast(S, s, t, y, big) {
  const p = P(s, t), q = P(s + (big ? 1.4 : 1.0), t);
  S.kind = KIND.FLAT; S.base = y - LAND_Y;
  S.box(p[0], p[1], y, y + 0.3, big ? 3.0 : 2.2, big ? 1.6 : 0.9, A, shade(STAT, 0.85));
  if (big) {
    S.box(p[0], p[1], y + 0.3, y + 1.2, 2.0, 1.0, A, STAT);
    S.box(p[0], p[1], y + 1.2, y + 2.2, 2.5, 1.3, A, STAT);
    S.box(q[0], q[1], y + 0.6, y + 2.2, 0.8, 1.0, A, shade(STAT, 0.95));
  } else {
    S.box(p[0], p[1], y + 0.3, y + 1.1, 1.4, 0.45, A, STAT);
    S.box(p[0], p[1], y + 1.1, y + 1.7, 1.8, 0.6, A, STAT);
    S.box(q[0], q[1], y + 1.4, y + 2.3, 0.5, 0.42, A, shade(STAT, 0.95));
  }
}
// a trụ biểu: stepped base, a square shaft tapering, a lotus collar and a stupa-like finial
function obelisk(S, s, t, y) {
  const p = P(s, t), box = (y0, y1, w, col, o) => S.box(p[0], p[1], y0, y1, w, w, A, col, o);
  S.kind = KIND.FLAT; S.base = y - LAND_Y;
  box(y, y + 0.6, 3.0, TRIM);
  box(y + 0.6, y + 2.2, 2.2, WALL, { top: TRIM });
  box(y + 2.2, y + 11.5, 1.4, WALL, { taper: 0.7 });
  box(y + 11.5, y + 12.1, 1.5, TRIM);
  box(y + 12.1, y + 13.2, 1.0, WALL, { taper: 0.75 });
  S.cyl(p[0], p[1], y + 13.2, y + 15.0, 0.55, 0.04, 8, TRIM);
}

// Cung Thiên Định on its terrace at level y: plinth, the long body of five rooms (Tả/Hữu trực phòng either end, the
// three rooms of Khải Thành between), a portico of arched entrances on the front, and the raised two-tier roof over
// the central room where the bronze statue stands over the grave
function palace(S, y) {
  const box = (s, t, y0, y1, ss, st, col, o) => { const p = P(s, t); S.box(p[0], p[1], y0, y1, ss, st, A, col, o); };
  const hip = (s, t, w, d, y0, h, o) => { const p = P(s, t); S.hip(p[0], p[1], w, d, AV, y0, h, ROOF, { flare: 0.3, fascia: 0.3, fasciaCol: TRIM, ridgeCol: TRIM, hips: true, ...o }); };
  const sc = 94.55, tc = -0.7, D = 26.4, Wd = 34.5; // the OSM outline: s 81.5-107.6, t -18.2-16.8
  const f = y + 0.9;
  S.kind = KIND.FLAT; S.base = y - LAND_Y;
  box(sc, tc, y, f, D + 1.2, Wd + 1.2, TRIM, { topKind: KIND.ROAD });
  // the body: dark lower walls, a pale cornice band
  box(sc, tc, f, f + 5.2, D, Wd, PALW, { top: ROOF });
  box(sc, tc, f + 5.2, f + 5.7, D + 0.4, Wd + 0.4, TRIM);
  // windows and doors: dark recesses on the front and the sides
  S.kind = KIND.PLAIN;
  for (let i = 0; i < 9; i++) { const t = tc + (i - 4) * 3.7; box(sc - D / 2 - 0.02, t, f + 0.4, f + (Math.abs(i - 4) < 3 ? 3.8 : 3.0), 0.1, 1.5, VOID); }
  for (const sd of [-1, 1]) for (let i = 0; i < 6; i++) box(sc - 10 + i * 4, tc + sd * (Wd / 2 + 0.02), f + 1.0, f + 3.4, 1.4, 0.1, VOID);
  // the front portico: five arched entrances between square pillars, a balustraded roof terrace over it
  S.kind = KIND.FLAT;
  const ps = sc - D / 2 - 2.2;
  for (let i = 0; i < 6; i++) { const t = tc + (i - 2.5) * 4.2; box(ps, t, f, f + 4.4, 0.8, 0.8, TRIM); }
  for (let i = 0; i < 5; i++) { const t = tc + (i - 2) * 4.2; box(ps, t, f + 3.4, f + 4.4, 0.6, 3.4, WALL); }
  box(ps + 0.9, tc, f + 4.4, f + 5.0, 5.2, 22.6, TRIM, { topKind: KIND.ROAD });
  box(ps - 0.8, tc, f + 5.0, f + 5.8, 0.4, 22.6, WALL, { top: TRIM });
  // the main roof over the five rooms, low-pitched ardoise
  hip(sc + 1.0, tc, Wd, D - 2, f + 5.7, 2.1, { over: 0.9 });
  // Khải Thành: the raised central block, its skirt roof and the upper tier
  box(sc, tc, f + 5.7, f + 8.2, 15, 12, WALL, { top: TRIM });
  hip(sc, tc, 13.6, 16.6, f + 8.2, 0.9, { flare: 0.25, over: 0.6 });
  box(sc, tc, f + 8.2, f + 9.0, 11, 8.6, PALW, { top: TRIM });
  hip(sc, tc, 9.2, 11.6, f + 9.0, 1.5, { flare: 0.3, over: 0.7 });
  // front gable-ends of the two end rooms rise as low pavilions over the corners
  for (const sd of [-1, 1]) {
    const t = tc + sd * (Wd / 2 - 3.6);
    box(sc - D / 2 + 3.6, t, f + 5.7, f + 6.9, 6.4, 6.4, WALL, { top: TRIM });
    hip(sc - D / 2 + 3.6, t, 6.4, 6.4, f + 6.9, 1.4, { over: 0.5 });
  }
}

// the mapped outbuildings of the site, outside the precinct (OSM 1205438742, 1330598711), local frame
const OUT = [
  [[-32.3, 85.4], [-22.1, 90.4], [-45.2, 140.4], [-55.4, 135.5]],
  [[9.4, 50.4], [9.5, 63.9], [2.9, 63.8], [2.7, 50.5]],
]; // 1330598717 (s -14.6..-8.3, t 21.7..28.6) is left out: the road at the foot of the stair now runs over it
function house(S, ring) {
  const ps = ring.map(([s, t]) => P(s, t));
  const c = [ps.reduce((a, p) => a + p[0], 0) / 4, ps.reduce((a, p) => a + p[1], 0) / 4];
  const e0 = Math.hypot(ps[1][0] - ps[0][0], ps[1][1] - ps[0][1]), e1 = Math.hypot(ps[2][0] - ps[1][0], ps[2][1] - ps[1][1]);
  const a0 = Math.atan2(ps[1][1] - ps[0][1], ps[1][0] - ps[0][0]);
  const [w, d, a] = e0 >= e1 ? [e0, e1, a0] : [e1, e0, a0 + Math.PI / 2];
  let lo = Infinity, hi = -Infinity;
  for (const p of ps) { const g = LAND_Y + rise(p[0], p[1]); lo = Math.min(lo, g); hi = Math.max(hi, g); }
  S.kind = KIND.FLAT; S.base = lo - 0.5 - LAND_Y;
  S.box(c[0], c[1], lo - 0.5, hi + 0.4, w + 0.6, d + 0.6, a, DARKW, { topKind: KIND.ROAD });
  S.box(c[0], c[1], hi + 0.4, hi + 3.2, w, d, a, PALW);
  S.hip(c[0], c[1], w, d, a, hi + 3.2, Math.min(2.2, d * 0.3), ROOF, { over: 0.6 });
}
