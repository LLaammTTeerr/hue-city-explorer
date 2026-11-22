import { KIND, hex, shade } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import * as props from '../props.js';

// Lăng Khải Định (Ứng Lăng), the tomb of Emperor Khải Định on the slope of Châu Chữ hill, built 1920-1931 in
// reinforced concrete, now weathered grey-black. Notes and sources: docs/places/khaidinh.md.
//
// Plan (vi.wikipedia.org/wiki/Lăng_Khải_Định): a rectangle 117 × 48.5 m on one axis climbing the hill in seven
// levels and 127 steps. From the road 37 steps in three lanes between four dragon balustrades lead to the main
// gate; the court of Tả/Hữu Tòng Tự (47 × 24.5 m, two three-bay houses); 29 steps up to Bái Đình, the salutation
// court, with two rows of stone mandarins, soldiers, horses and elephants each side; the two-tier octagonal stele
// pavilion (Bi Đình) at the back of it between two trụ biểu (obelisks); three narrow courts 13 steps apart, each
// flight between four dragons, two concrete flagpoles on the middle one; Cung Thiên Định (34.5 × 26.4 m) on top.
// Placed on the OSM outlines (hue.json sites.khaidinh, converted to the local frame below): the precinct's front and
// sides (way 175035807), the two Tòng Tự (242940962/3, 17 × 8.6 m, long side along the axis) and the stele pavilion
// (242940961) agree with the satellite to about a metre. Re-framed from the satellite (2026-11, docs/places/
// khaidinh.md): OSM's precinct stops at 109.6 m, but the palace roof reaches 113 m up the axis, so the precinct runs
// the 117 m of the plan from its front edge; Cung Thiên Định (OSM 242940960) stands about 5 m further up than its OSM
// ring; the wall lines between the courts, the flights, the statue rows and the obelisks are read off the satellite.
// Riser heights and every height above the floors: estimated from photos.
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
const STONE = hex('#5d5b55'), GRASS = hex('#6f8a45'), WOOD = hex('#5a3a26'), TILEB = hex('#6b4a3a');
// the concrete is drawn as KIND.FLAT (mottled render), not KIND.MASONRY, whose shader lays brick courses on it

// the levels: [front s, back s]; each flight stands on the level below, against the front wall of the next one
// (wall lines on the satellite at s 26.5, 51, 61, 70.7 and the palace terrace at 81)
const LV = { L2: [0, 26.5], L3: [26.5, 51], L4: [51, 61], L5: [61, 70.7], L6: [70.7, 81], L7: [81, 116.5] };
// flights: steps, from s, to s, the level they climb from, lane layout
const STEPS = [37, 29, 13, 13, 13, 22]; // 127 in all; the split of the last 61 into 13 + 13 + 13 + 22 is estimated

export function build({ S }) {
  const keep = S.kind;
  const box = (s, t, y0, y1, ss, st, col, o) => { const p = P(s, t); S.box(p[0], p[1], y0, y1, ss, st, A, col, o); };

  // ---- levels: the riser is set so the palace terrace sits no more than 0.8 m under the highest ground anywhere on
  // it (the hill climbs across the axis too, so the axis alone would leave its upper corner sunk) ----
  const y0 = gY(-10);
  let gTop = -Infinity;
  for (let s = LV.L7[0]; s <= LV.L7[1]; s += 1) for (let t = -W2; t <= W2; t += 2) gTop = Math.max(gTop, gY(s, t));
  const r = Math.max(0.15, Math.min(0.2, (gTop - 0.8 - y0) / 127));
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
  // front wall of the Tòng Tự court, with the gate in it and a wrought-iron railing on it, and the back wall behind
  // the palace
  for (const sd of [-1, 1]) {
    box(0.3, sd * (W2 + 8.4) / 2, Y.L2, Y.L2 + 1.0, 0.6, W2 - 8.4, WALL, { top: TRIM });
    S.kind = KIND.PLAIN;
    for (const [y0, y1] of [[Y.L2 + 1.0, Y.L2 + 1.08], [Y.L2 + 1.86, Y.L2 + 1.94]]) box(0.3, sd * (W2 + 8.4) / 2, y0, y1, 0.08, W2 - 8.4, IRON);
    for (let t = 8.9; t < W2 - 0.3; t += 0.45) box(0.3, sd * t, Y.L2 + 1.0, Y.L2 + (Math.round(t / 0.45) % 4 ? 1.94 : 2.15), 0.05, 0.05, IRON);
    S.kind = KIND.FLAT;
  }
  // the hill below the front wall either side of the first stair: terraces of grey rubble stone with grass on
  S.kind = KIND.MASONRY;
  // them, stepping down to the road (Street View from Đ. Đại Nam; the photo shows two, the model needs three for its
  // taller court), sharing the height from the foot of the hill to a metre under the court
  for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) {
    const t0 = 8.9, t1 = sd > 0 ? 21.2 : W2, s0 = -5.6 + k * 1.85, s1 = 0; // (the kiosk stands at the SE end)
    let gF = -Infinity;
    for (let t = t0; t <= t1; t += 3) gF = Math.max(gF, gY(-5.6, sd * t));
    const top = gF + (Y.L2 - 1.0 - gF) * (k + 1) / 3;
    let lo = Infinity;
    for (let s = s0; s <= s1; s += 1.4) for (let t = t0; t <= t1; t += 3) lo = Math.min(lo, gY(s, sd * t));
    if (top < lo + 0.4) continue;
    S.base = lo - 1 - LAND_Y;
    box((s0 + s1) / 2, sd * (t0 + t1) / 2, lo - 1, top, s1 - s0, t1 - t0, STONE, { top: GRASS, topKind: KIND.GROUND });
  }
  S.kind = KIND.FLAT;
  box(LV.L7[1] - 0.3, 0, Y.L7, Math.max(Y.L7 + 2.2, gY(LV.L7[1]) + 1.6), 0.6, 2 * W2, WALL, { top: TRIM });
  // a balustrade along the front edge of each upper court, either side of its flights (the parapet with lattice
  // panels the photos show at the head of the stairs)
  for (const k of ['L4', 'L5', 'L6', 'L7']) {
    const a = LV[k][0], top = Y[k];
    // (behind the stele pavilion there is no flight on the axis: the parapet runs through)
    for (const [t0, t1] of k === 'L4' ? [[-W2 + 0.6, W2 - 0.6]] : [[-W2 + 0.6, -5.6], [5.6, W2 - 0.6]]) {
      const cuts = k === 'L4' ? [[-14.6, -11.4], [11.4, 14.6]] : k === 'L7' ? [] : [[-21.4, -17.6], [17.6, 21.4]];
      let segs = [[t0, t1]];
      for (const [c0, c1] of cuts) segs = segs.flatMap(([u0, u1]) => (c1 <= u0 || c0 >= u1 ? [[u0, u1]] : [[u0, c0], [c1, u1]].filter(([x, y]) => y - x > 0.5)));
      for (const [u0, u1] of segs) box(a + 0.35, (u0 + u1) / 2, top, top + 0.95, 0.4, u1 - u0, DARKW, { top: TRIM });
    }
  }

  // ---- the flights ----
  // the first: 37 steps from the road, three lanes between four dragon balustrades
  flight(S, -10, 0, y0, Y.L2, STEPS[0], [[-5.1, 3.2], [0, 6], [5.1, 3.2]], [-8.1, -3.4, 3.4, 8.1], true);
  // to Bái Đình: 29 steps, the broad flight the satellite shows about 22 m wide, in three lanes
  flight(S, 20, 26.5, Y.L2, Y.L3, STEPS[1], [[-7.3, 6.6], [0, 7.4], [7.3, 6.6]], [-10.9, -3.7, 3.7, 10.9], false);
  // the upper flights of 13 steps. Behind Bái Đình the stele pavilion stands against the wall on the axis, and the
  // satellite shows the way up as two flights either side of it; the next two walls have a flight on the axis
  // between four dragons and a narrow one near either side
  const lanes3 = [[-3.4, 2.2], [0, 3.6], [3.4, 2.2]], rails3 = [-5.0, -2.2, 2.2, 5.0];
  for (const sd of [-1, 1]) flight(S, 47.4, 51, Y.L3, Y.L4, STEPS[2], [[sd * 13, 2.6]], [sd * 11.5, sd * 14.5], false);
  flight(S, 57.6, 61, Y.L4, Y.L5, STEPS[3], lanes3, rails3, true);
  flight(S, 67.3, 70.7, Y.L5, Y.L6, STEPS[4], lanes3, rails3, true);
  for (const sd of [-1, 1]) {
    flight(S, 57.6, 61, Y.L4, Y.L5, STEPS[3], [[sd * 19.5, 2.4]], [sd * 18.1, sd * 20.9], false);
    flight(S, 67.3, 70.7, Y.L5, Y.L6, STEPS[4], [[sd * 19.5, 2.4]], [sd * 18.1, sd * 20.9], false);
  }
  // up to the palace terrace
  flight(S, 75.3, 81, Y.L6, Y.L7, STEPS[5], [[0, 9]], [-4.9, 4.9], false);
  // cast lamp standards on pedestals at the head of the top two flights
  for (const [s, y, big] of [[71.9, Y.L6, false], [82.6, Y.L7, true]]) for (const sd of [-1, 1]) lamp(S, s, sd * (big ? 6.0 : 5.6), y, big);

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
    // rows read off the satellite: inner at t ±10.4, outer at ±15.2, from s 29.6 to 38.6
    beast(S, 29.6, sd * 15.2, Y.L3, true);
    beast(S, 29.6, sd * 10.4, Y.L3, false);
    for (let k = 0; k < 4; k++) {
      figure(S, 32.0 + k * 2.2, sd * 10.4, Y.L3, face, 1);
      figure(S, 32.0 + k * 2.2, sd * 15.2, Y.L3, face, 0.82);
    }
  }
  // the axis walk
  S.kind = KIND.FLAT; S.base = Y.L3 - LAND_Y;
  box(33, 0, Y.L3, Y.L3 + 0.08, 12.5, 4, TRIM, { topKind: KIND.ROAD });

  // ---- Bi Đình: octagonal, two roofs of ardoise, an arched opening in each face; the 3.1 m stele inside ----
  {
    const sp = 45, p = P(sp), rot = A + Math.PI / 8;
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
    for (const sd of [-1, 1]) obelisk(S, sp + 0.5, sd * 18.5, Y.L3); // the satellite puts them near t ±19
  }

  // ---- the two concrete flagpoles on the middle of the three upper courts ----
  S.kind = KIND.FLAT; S.base = Y.L5 - LAND_Y;
  for (const sd of [-1, 1]) {
    box(65.9, sd * 8, Y.L5, Y.L5 + 1.2, 1.8, 1.8, TRIM);
    box(65.9, sd * 8, Y.L5 + 1.2, Y.L5 + 12, 0.5, 0.5, WALL, { taper: 0.55 });
  }

  palace(S, Y.L7);
  (S.paved = S.paved || []).push([n0, S.n]); // courts, terraces and stairs: no trees, no houses

  // the mapped outbuildings of the site, outside the precinct (ticket office and stalls at the foot): plain halls
  for (const ring of OUT) house(S, ring);
  kiosk(S);
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

// a standing figure on level y facing across the axis (face: the sign along t): a civil mandarin (k = 1) or a
// smaller soldier in a helmet (src/landmarks/props.js)
function figure(S, s, t, y, face, k) {
  const p = P(s, t);
  props.mandarin(S, p[0], y, p[1], A + face * Math.PI / 2, { military: k < 1, h: 2.15 * k, col: STAT });
}
// an elephant (big) or a horse on level y, facing up the axis
function beast(S, s, t, y, big) {
  const p = P(s, t);
  if (big) props.elephant(S, p[0], y, p[1], A, { col: STAT });
  else props.horse(S, p[0], y, p[1], A, { col: STAT });
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
// three rooms of Khải Thành between), a portico of arched entrances under a lean-to roof the full width of the front,
// and the raised square tier over Khải Thành at the back of the middle, where the bronze statue stands over the grave.
// Placed from the satellite: the main roof spans s 87.5-113, t -18.2-18.7, the porch roof s 83-87.5 and the raised
// tier s 94.7-113, t -8.8-9.8 (ridge across at s 105.5). The OSM outline (242940960, s 81.5-107.6) is about 5 m short
// of that up the axis; the 34.5 × 26.4 m of the plan is kept for the body.
function palace(S, y) {
  const box = (s, t, y0, y1, ss, st, col, o) => { const p = P(s, t); S.box(p[0], p[1], y0, y1, ss, st, A, col, o); };
  const hip = (s, t, w, d, y0, h, o) => { const p = P(s, t); S.hip(p[0], p[1], w, d, AV, y0, h, ROOF, { flare: 0.3, fascia: 0.3, fasciaCol: TRIM, ridgeCol: TRIM, hips: true, ...o }); };
  const sc = 99.6, tc = 0, D = 26.4, Wd = 34.5; // body s 86.4-112.8
  const f = y + 0.9;
  S.kind = KIND.FLAT; S.base = y - LAND_Y;
  box(sc - 1.8, tc, y, f, D + 4.8, Wd + 1.2, TRIM, { topKind: KIND.ROAD });
  // the body: dark lower walls, a pale cornice band
  box(sc, tc, f, f + 5.2, D, Wd, PALW, { top: ROOF });
  box(sc, tc, f + 5.2, f + 5.7, D + 0.4, Wd + 0.4, TRIM);
  // windows and doors: dark recesses on the front and the sides
  S.kind = KIND.PLAIN;
  for (let i = 0; i < 9; i++) { const t = tc + (i - 4) * 3.7; box(sc - D / 2 - 0.02, t, f + 0.4, f + (Math.abs(i - 4) < 3 ? 3.8 : 3.0), 0.1, 1.5, VOID); }
  for (const sd of [-1, 1]) for (let i = 0; i < 6; i++) box(sc - 10 + i * 4, tc + sd * (Wd / 2 + 0.02), f + 1.0, f + 3.4, 1.4, 0.1, VOID);
  // the front portico: arched entrances between square pillars across the whole front, under a dark lean-to roof
  S.kind = KIND.FLAT;
  const ps = sc - D / 2 - 2.6;
  for (let i = 0; i < 9; i++) { const t = tc + (i - 4) * 4.25; box(ps, t, f, f + 4.0, 0.8, 0.8, TRIM); }
  for (let i = 0; i < 8; i++) { const t = tc + (i - 3.5) * 4.25; box(ps, t, f + 3.1, f + 4.0, 0.6, 3.45, WALL); }
  box(ps, tc, f + 4.0, f + 4.4, 1.0, Wd + 0.4, TRIM);
  hip(sc - D / 2 - 1.5, tc, Wd + 0.6, 4.4, f + 4.4, 0.9, { flare: 0.15, over: 0.4 });
  // the main roof over the five rooms, low-pitched ardoise
  hip(sc, tc, Wd, D, f + 5.7, 2.1, { over: 0.9 });
  // Khải Thành: the raised square tier, a clerestory with dark windows under its own hipped roof
  const ks = 103.9;
  box(ks, tc, f + 5.7, f + 8.6, 17.6, 17.6, WALL, { top: TRIM });
  S.kind = KIND.PLAIN;
  for (let i = 0; i < 5; i++) box(ks - 8.82, tc + (i - 2) * 3.3, f + 7.6, f + 8.3, 0.1, 1.6, VOID);
  S.kind = KIND.FLAT;
  hip(ks, tc, 19.0, 18.2, f + 8.6, 2.0, { flare: 0.25, over: 0.5 });
}

// a cast lamp standard on a pedestal at level y: a square pedestal with a cornice, a fluted post, four scrolled arms
// and a crown (the pair at the head of the palace stair is the larger)
function lamp(S, s, t, y, big) {
  const p = P(s, t), k = big ? 1 : 0.75;
  const bx = (y0, y1, w, col, o) => S.box(p[0], p[1], y0, y1, w, w, A, col, o);
  S.kind = KIND.FLAT; S.base = y - LAND_Y;
  bx(y, y + 0.3, 1.7 * k, TRIM);
  bx(y + 0.3, y + 2.0 * k, 1.4 * k, WALL, { top: TRIM });
  bx(y + 2.0 * k, y + 2.2 * k, 1.6 * k, TRIM);
  const y1 = y + 2.2 * k;
  S.cyl(p[0], p[1], y1, y1 + 3.2 * k, 0.2 * k, 0.12 * k, 8, IRON, { cap: true });
  const ya = y1 + 2.7 * k;
  for (const [ds, dt] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const q = V(s + ds * 0.7 * k, t + dt * 0.7 * k, ya + 0.25 * k);
    S.beam([p[0], ya, p[1]], q, 0.08, 0.08, IRON);
    S.cyl(q[0], q[2], q[1], q[1] + 0.45 * k, 0.16 * k, 0.2 * k, 6, TRIM, { cap: true });
  }
  S.cyl(p[0], p[1], y1 + 3.2 * k, y1 + 3.9 * k, 0.28 * k, 0.05, 8, IRON, { cap: true });
}

// the ticket kiosk at the foot of the first stair (OSM 1330598717, s -14.6..-8.3, t 21.7..28.6): a small timber
// house on a stepped plinth under a tiled hip roof (Street View from the south-east road). The OSM ring lies half on
// the model's Đ. Đại Nam, as it does on the satellite, while Street View shows the kiosk's steps at the road's edge:
// it is moved 5.6 m up the axis to stand off the carriageway (the road here is drawn wider than it is)
function kiosk(S) {
  const s = -11.45 + 5.6, t = 25.15, w = 6.3, d = 6.9; // d across the axis
  const p = P(s, t);
  let lo = Infinity;
  for (const ds of [-w / 2, w / 2]) for (const dt of [-d / 2, d / 2]) lo = Math.min(lo, gY(s + ds, t + dt));
  // the floor four steps above the road at its foot; the hill behind rises over its back
  const fl = lo + 0.7;
  S.kind = KIND.FLAT; S.base = lo - 0.4 - LAND_Y;
  S.box(p[0], p[1], lo - 0.4, fl, w + 0.8, d + 0.8, A, DARKW, { top: PAVE, topKind: KIND.ROAD });
  S.kind = KIND.TIMBER;
  S.box(p[0], p[1], fl, fl + 2.6, w - 1.2, d - 1.2, A, WOOD);
  S.kind = KIND.TILE;
  S.hip(p[0], p[1], d + 0.4, w + 0.4, AV, fl + 2.6, 1.6, TILEB, { flare: 0.4, over: 0.6, hips: true });
  S.kind = KIND.FLAT;
}

// the mapped outbuildings of the site, outside the precinct (OSM 1205438742, 1330598711), local frame
const OUT = [
  [[-32.3, 85.4], [-22.1, 90.4], [-45.2, 140.4], [-55.4, 135.5]],
  [[9.4, 50.4], [9.5, 63.9], [2.9, 63.8], [2.7, 50.5]],
]; // 1330598717, the ticket kiosk, is drawn by kiosk() below
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
