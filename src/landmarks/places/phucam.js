import * as THREE from 'three';
import { KIND, Buf, hex, shade, inRing } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { glowPoints, lightMaterial } from '../../geo/materials.js';
import { fence, roadsNear, buildingsNear, offStreets, FENCE } from '../enclosure.js';

// Nhà thờ chính tòa Phủ Cam (Ngô Viết Thụ; begun 1963, finished May 2000) on Phước Quả hill. See docs/places/phucam.md.
//
// The plan is the OSM outline (way 118792054) read in a frame along its axis: a = metres from the front tips of the
// towers back toward the apse (south-south-east), b = metres across (b > 0 west). The frame sits 3.5 m east of OSM,
// where the satellite puts the walls (2026-11 Google check, see the doc). OSM's outline is the ground storey: two
// bell towers set as squares turned 45 deg, a stone storey 23 m wide under the whole church, with a pale slab over
// it; on the slab stands a narrower rendered upper church: nave 13.6 m wide, transept 40.4 m across, choir 12.4 m,
// a five-sided apse, wide round-topped windows between flat pilasters, tiled roofs (eave 15 m, ridges 21.2 / 20.4 m,
// est.). Sources: two bell towers of 43.5 m flanking a shorter stone centre with a tall coloured-glass strip ("an
// open Bible in perspective"); a vault of 21.5 m inside; statues of St Peter and St Paul on an asphalt
// yard that ends 23 m out above a lower garden; stairs from the yard to a porch slab at the doors. The grounds are
// OSM way 1173741401 (the archdiocese precinct), with the stair up the hill from Doan Huu Trung on the axis.

export const id = 'phucam';

const DEG = Math.PI / 180;
const ANG = 71 * DEG; // axis, front → apse
const F = [Math.cos(ANG), Math.sin(ANG)], P = [-F[1], F[0]];
// a = 0, b = 0: the line of the tower tips, on the axis. OSM's outline (-131.668, 1763.405) moved 3.5 m east: Google's
// satellite puts the walls, the slab edges and the towers 3-6 m east of it (and the apse 2 m), while the streets round
// the precinct line up with OSM to a metre (2026-11 check, docs/places/phucam.md)
const O = [-128.168, 1763.405];
const W = (a, b) => [O[0] + F[0] * a + P[0] * b, O[1] + F[1] * a + P[1] * b];
const gY = (x, z) => LAND_Y + rise(x, z);

// the precinct (OSM way 1173741401), model metres
const PRECINCT = [[-205.3, 1752.1], [-197.4, 1776.8], [-179.9, 1830.1], [-94.4, 1838], [-55.6, 1840], [-49.8, 1786.1], [-83.5, 1782.6],
  [-88.1, 1740.8], [-117, 1732.1], [-122.8, 1709.4], [-144.3, 1715.3], [-159.6, 1719], [-167.8, 1721.1]];
// where paths and the service lanes pass the fence (OSM steps 1173741385 / 1473287309, service way 1173741398)
const GATES = [[-145.0, 1713.4, 2.6], [-159.8, 1717.6, 1.4], [-198.6, 1773.2, 3.0], [-89.3, 1838.3, 3.0]];

const stoneC = hex('#858480'), stoneL = hex('#a3a19b'), stoneD = hex('#64625e'), tile = hex('#985440'), tileD = hex('#7a4333');
const lattice = hex('#c9c8bd'), cream = hex('#e9dcb4'), conc = hex('#bdbcb5'), concL = hex('#cfcdc5'), slabC = hex('#c6c5bf');
const glass = hex('#4b5a68'), door = hex('#3a2c24'), white = hex('#efeae0'), pave = hex('#c4bba9');
const lawn = hex('#86a05e'), panel = hex('#d6d3ca'), asphalt = hex('#7b7873');
// the asphalt yard in front of the church, measured on the satellite (frame a, b): its north edge 23.5 m before the
// tower tips, 75 m across where it runs along the towers to the service drive on the west and the lane on the east
const YARD = [[-23.5, 16], [-23.5, -14], [-20, -26], [-6, -32], [6, -30], [10, -14], [10, 14], [8, 38], [-8, 34], [-18, 16]];

export function build({ data, S, group }) {
  const c = W(40, 0);
  // floor of the church: just above the highest ground under it (the hill rises toward the apse)
  let gmax = -1e9;
  for (const [a, b] of [[0, 0], [10, -10], [10, 10], [40, -20], [40, 20], [59, -20], [59, 20], [74, 0], [40, 0]]) { const q = W(a, b); gmax = Math.max(gmax, gY(q[0], q[1])); }
  // the yard lies on the hilltop terrace (build-data levels the ground round the church): just above the ground at the doors
  const yc = gY(...W(-6, 0)) + 0.05, y = Math.max(gmax + 0.3, yc + 0.9); // forecourt, church floor
  const V = (a, b, h) => { const q = W(a, b); return [q[0], h, q[1]]; };
  const box = (a, b, y0, y1, la, lb, col, o = {}) => { const q = W(a, b); S.box(q[0], q[1], y0, y1, la, lb, ANG + (o.rot || 0), col, o); };
  S.base = y - LAND_Y;

  // ---- plinth under the church, and the forecourt terrace in front of it
  S.kind = KIND.MASONRY;
  const out = [[-0.8, 11], [4.5, 16.6], [10.6, 11.6], [39.6, 11.6], [39.6, 21.3], [60.3, 21.3], [60.3, 10.4], [70.8, 10.4], [74.4, 6.2], [75.7, 0],
    [74.4, -6.2], [70.8, -10.4], [60.3, -10.4], [60.3, -21.3], [39.6, -21.3], [39.6, -11.6], [10.6, -11.6], [4.5, -16.6], [-0.8, -11]];
  // the street OSM maps behind the apse passes 2.9 m from its south facet: the plinth stops
  // at the kerb there instead of running its metre-wide ledge out over the asphalt
  S.prism(offStreets(data, out.map(([a, b]) => W(a, b)), 0), y - 4, y, stoneD, pave, { topKind: KIND.ROAD });
  { let gl = yc; for (const [a, b] of YARD) gl = Math.min(gl, gY(...W(a, b))); // walls show only where the ground falls away
    // asphalt (Street View from the yard), marked as a paved court so the city plants no trees or houses on it
    const p0 = S.n;
    S.prism(YARD.map(([a, b]) => W(a, b)), gl - 0.5, yc, stoneD, asphalt, { topKind: KIND.ROAD });
    (S.paved = S.paved || []).push([p0, S.n]); }
  // three steps from the forecourt up to the doors
  S.kind = KIND.ROAD;
  for (let i = 0; i < 3; i++) box(-1.2 + i * 0.5, 0, yc - 0.2, yc + 0.3 * (i + 1), 1.2, 11.2 - i * 0.6, pave);
  // down the hill on the axis: a short flight off the yard's north edge, then a path between two pale paved panels laid
  // on the slope of the lower garden, and the lower flight at the gate
  const g27 = gY(...W(-27, 0)), n1 = Math.max(4, Math.round((yc - g27) / 0.17));
  for (let i = 0; i < n1; i++) { const t = (i + 1) / n1; box(-27 + 3.5 * (i + 0.5) / n1, 0, g27 - 0.6, g27 + (yc - g27) * t, 3.5 / n1 + 0.02, 6.4, pave); }
  S.kind = KIND.MASONRY;
  for (const s of [-1, 1]) { // cheek walls of the flight
    const a = W(-27, s * 3.5), b = W(-23.5, s * 3.5);
    S.beam([a[0], g27 + 0.3, a[1]], [b[0], yc + 0.6, b[1]], 0.5, 1.0, stoneL);
    // a low parapet along the yard's north edge, either side of the flight
    const p0 = W(-23.3, s * 3.75), p1 = W(-23.3, s * (s > 0 ? 16 : 14));
    S.beam([p0[0], yc + 0.45, p0[1]], [p1[0], yc + 0.45, p1[1]], 0.35, 0.9, stoneL);
  }
  const drape = (aa0, aa1, b, wb, col, lift) => { // a strip laid on the slope in 2.5 m lengths
    for (let a = aa0; a < aa1 - 0.01; a += 2.5) {
      const e = Math.min(aa1, a + 2.5), q0 = W(a, b), q1 = W(e, b), h0 = gY(q0[0], q0[1]), h1 = gY(q1[0], q1[1]);
      box((a + e) / 2, b, Math.min(h0, h1) - 0.4, (h0 + h1) / 2 + lift, e - a + 0.02, wb, col);
    }
  };
  S.kind = KIND.ROAD;
  drape(-48.4, -27, 0, 3.6, pave, 0.14);
  S.kind = KIND.PLAIN;
  for (const s of [-1, 1]) drape(-47, -27.5, s * 5.4, 7.2, panel, 0.08);
  S.kind = KIND.ROAD;
  const g54 = gY(...W(-52.4, 0)), g49 = gY(...W(-48.4, 0)) + 0.14;
  for (let i = 0; i < 5; i++) box(-52.4 + i * 0.8 + 0.4, 0, g54 - 0.6, g54 + ((g49 - g54) * (i + 1)) / 5 + 0.15, 0.82, 4.4, pave);

  // ---- two storeys, as the satellite and Street View show them (docs/places/phucam.md, 2026-11 Google check):
  //      a lower storey of grey stone on the whole OSM outline behind the narthex, roofed by a pale concrete slab that
  //      overhangs it; on that slab, set in from the outline, the church proper in pale rendered concrete: a nave and
  //      choir much narrower than the outline (the slab shows as a broad terrace beside them from above), a transept
  //      the full 40.4 m across, a five-sided apse. Wide round-topped windows, recessed, with a cross of mullions, between flat pilasters.
  const PH = 4.2, SL = 0.45, E = 14, RN = 21.2, RC = 20.4; // top of the lower storey, slab; eaves; ridge of nave and transept; ridge of the choir
  const NW = 6.8, T0 = 41.9, T1 = 57.9, TB = 20.2, CW = 6.2, C1 = 67.5; // nave half-width; transept a range, half-length; choir half-width, end
  const ys = y + PH + SL; // the slab's top, foot of the upper walls
  const low = out.slice(3, -3); // the outline behind the narthex (the front between the towers is drawn below)
  low.unshift([10.6, 11.6]); low.push([10.6, -11.6]);
  // the slab: the lower outline pushed out 0.9 m (mitred; grow takes d > 0 inward), kept off the street behind the apse
  const area = low.reduce((s, p, i) => { const q = low[(i + 1) % low.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0), sg = area > 0 ? -1 : 1;
  const grow = (ring, d) => ring.map((p, i) => {
    const p0 = ring[(i + ring.length - 1) % ring.length], p1 = ring[(i + 1) % ring.length];
    const n = (u, v) => { const l = Math.hypot(v[0] - u[0], v[1] - u[1]); return [sg * (v[1] - u[1]) / l, -sg * (v[0] - u[0]) / l]; };
    const n0 = n(p0, p), n1 = n(p, p1), m = [n0[0] + n1[0], n0[1] + n1[1]], k = d / Math.max(0.35, (m[0] * n0[0] + m[1] * n0[1]));
    return [p[0] + m[0] * k, p[1] + m[1] * k];
  });
  // the lower storey stands 1 m in from the outline, so the slab (0.9 m beyond it) reads as a deep canopy over a
  // recessed storey of doors and grilles, as the alley panos show it at the apse and the transept
  const lowIn = grow(low, 1.0); // grow: positive d moves the ring in, negative out
  S.kind = KIND.MASONRY;
  S.prism(lowIn.map(([a, b]) => W(a, b)), y, y + PH, stoneD, slabC);
  S.prism(offStreets(data, grow(low, -0.9).map(([a, b]) => W(a, b)), 0), y + PH, ys, slabC, slabC);
  // doors and barred openings in turn along its walls, about every 4 m
  S.kind = KIND.PLAIN;
  for (let i = 0; i < lowIn.length; i++) {
    const p = lowIn[i], q = lowIn[(i + 1) % lowIn.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (L < 3 || (p[0] < 11 && q[0] < 11)) continue;
    const t = [(q[0] - p[0]) / L, (q[1] - p[1]) / L], n = [sg * t[1], -sg * t[0]];
    for (let k = 1, m = Math.floor(L / 4); k < m; k++) {
      const u = (k * L) / m, a = p[0] + t[0] * u + n[0] * 0.06, b = p[1] + t[1] * u + n[1] * 0.06, w = W(a, b), dr = (k + i) % 2 === 0;
      S.box(w[0], w[1], dr ? y + 0.1 : y + 1.0, dr ? y + 2.6 : y + 3.0, dr ? 1.2 : 1.6, 0.14, ANG + Math.atan2(t[1], t[0]), dr ? door : stoneD);
    }
  }
  // the upper walls, smooth render
  S.kind = KIND.PLAIN;
  box((9.4 + T0) / 2, 0, ys, y + E, T0 - 9.4, 2 * NW, conc, { top: tileD });
  box((T0 + T1) / 2, 0, ys, y + E, T1 - T0, 2 * TB, conc, { top: tileD });
  box((T1 + C1) / 2, 0, ys, y + E, C1 - T1, 2 * CW, conc, { top: tileD });
  const apse = []; for (let i = 0; i <= 5; i++) { const th = -Math.PI / 2 + (i * Math.PI) / 5; apse.push([C1 + 6.4 * Math.cos(th), CW * Math.sin(th)]); }
  for (let i = 0; i + 1 < apse.length; i++) {
    const [a0, b0] = apse[i], [a1, b1] = apse[i + 1];
    const m = W((a0 + a1) / 2, (b0 + b1) / 2), k = W(C1, 0);
    S.quad(V(a0, b0, ys), V(a1, b1, ys), V(a1, b1, y + E), V(a0, b0, y + E), conc, [m[0] - k[0], 0, m[1] - k[1]]);
  }
  S.prism(apse.map(([a, b]) => W(a, b)), y + E - 0.3, y + E, conc, tileD);
  S.kind = KIND.PLAIN;
  for (const [a, la, lb] of [[(9.4 + T0) / 2, T0 - 9.4 + 0.2, 2 * NW + 0.3], [(T0 + T1) / 2, T1 - T0 + 0.3, 2 * TB + 0.3], [(T1 + C1) / 2, C1 - T1 + 0.2, 2 * CW + 0.3]]) box(a, 0, y + E - 0.6, y + E, la, lb, concL); // cornice

  // ---- roofs: steep terracotta pitches
  const OV = 0.9;
  S.kind = KIND.TILE;
  // a pitched roof with its ridge along a (alongA) or along b, over [p0,p1] along the ridge and ±hw across
  function pitch(alongA, p0, p1, cpos, hw, ridge, col, ends = [true, true]) {
    const at = (u, v, h) => (alongA ? V(u, cpos + v, h) : V(cpos + v, u, h));
    const k = (ridge - y - E) / hw, ye = y + E - k * OV;
    for (const s of [-1, 1]) S.quad(at(p0, s * (hw + OV), ye), at(p1, s * (hw + OV), ye), at(p1, 0, ridge), at(p0, 0, ridge), col, alongA ? [P[0] * s, 1.2, P[1] * s] : [F[0] * s, 1.2, F[1] * s]);
    S.kind = KIND.MASONRY;
    [p0, p1].forEach((u, i) => { if (ends[i]) S.tri(at(u, -hw, y + E), at(u, hw, y + E), at(u, 0, ridge - 0.2), conc, alongA ? [F[0] * (i ? 1 : -1), 0, F[1] * (i ? 1 : -1)] : [P[0] * (i ? 1 : -1), 0, P[1] * (i ? 1 : -1)]); });
    S.kind = KIND.TILE;
    const r0 = at(p0, 0, ridge + 0.1), r1 = at(p1, 0, ridge + 0.1);
    S.beam(r0, r1, 0.45, 0.35, shade(col, 0.82));
  }
  pitch(true, 9.5, T0 + 3, 0, NW, y + RN, tile, [true, false]);
  pitch(false, -TB - OV, TB + OV, (T0 + T1) / 2, (T1 - T0) / 2, y + RN, tile);
  pitch(true, T1 - 2, C1, 0, CW, y + RC, tile, [false, false]);
  // the apse: five hipped facets fanning from the end of the choir ridge
  {
    const k = (RC - E) / CW, ye = y + E - k * OV, top = V(C1, 0, y + RC);
    const ext = apse.map(([a, b]) => { const d = Math.hypot(a - C1, b) || 1; return V(a + ((a - C1) / d) * OV, b + (b / d) * OV, ye); });
    for (let i = 0; i + 1 < ext.length; i++) S.tri(ext[i], ext[i + 1], top, tile, [ext[i][0] + ext[i + 1][0] - 2 * top[0], 2, ext[i][2] + ext[i + 1][2] - 2 * top[2]]);
  }

  // ---- pilasters and windows on the upper walls
  // a tall window with a round-topped (parabolic) head at (a, b) on a wall whose outward normal is n (unit, along a/b),
  // w wide, sill y0, springing y1: glass set back in a recess framed by a raised surround, a cross of mullions
  const win = (a, b, na, nb, w, y0, y1) => {
    const q = W(a + na * 0.04, b + nb * 0.04), n = [F[0] * na + P[0] * nb, F[1] * na + P[1] * nb], t = [-n[1], n[0]];
    const H = w * 0.72, hw = w / 2, head = (u) => y1 + H * (1 - (u / hw) ** 2);
    S.kind = KIND.PLAIN;
    S.box(q[0], q[1], y0, y1, w, 0.1, Math.atan2(t[1], t[0]), glass);
    const o = (u, h, d = 0.1) => [q[0] + t[0] * u + n[0] * d, h, q[1] + t[1] * u + n[1] * d];
    const K = 8;
    for (let i = 0; i < K; i++) { const u0 = -hw + (w * i) / K, u1 = -hw + (w * (i + 1)) / K; S.quad(o(u0, y1), o(u1, y1), o(u1, head(u1)), o(u0, head(u0)), glass, [n[0], 0, n[1]]); }
    const m = shade(concL, 1.05), fr = 0.32; // the surround: jambs and the arched head, standing proud of the wall
    for (const sg of [-1, 1]) S.beam(o(sg * (hw + fr / 2), y0, 0.18), o(sg * (hw + fr / 2), y1, 0.18), fr, 0.3, m);
    for (let i = 0; i < K; i++) {
      const u0 = -hw + (w * i) / K, u1 = -hw + (w * (i + 1)) / K, e = (u) => y1 + (H + fr) * (1 - (u / (hw + fr / 2)) ** 2);
      const v0 = u0 * (1 + fr / w), v1 = u1 * (1 + fr / w);
      S.beam(o(v0, e(v0), 0.18), o(v1, e(v1), 0.18), fr, 0.3, m);
    }
    S.beam(o(0, y0, 0.16), o(0, head(0), 0.16), 0.18, 0.18, m);
    S.beam(o(-hw, y0 + (y1 - y0) * 0.62, 0.16), o(hw, y0 + (y1 - y0) * 0.62, 0.16), 0.18, 0.18, m);
    S.beam(o(-hw - fr, y0, 0.22), o(hw + fr, y0, 0.22), 0.3, 0.3, m);
  };
  const pil = (a, b, na, nb) => { S.kind = KIND.PLAIN; const q = W(a + na * 0.25, b + nb * 0.25); S.box(q[0], q[1], ys, y + E - 0.3, 0.9, 0.5, ANG + Math.atan2(nb, na) + Math.PI / 2, concL); };
  const W0 = ys + 1.0, W1 = y + E - 3.2; // sill and springing of the tall windows
  for (const s of [-1, 1]) {
    const nb = s;
    const bay = (T0 - 9.9) / 6;
    for (let i = 0; i <= 6; i++) pil(9.9 + i * bay, s * NW, 0, nb);
    for (let i = 0; i < 6; i++) win(9.9 + (i + 0.5) * bay, s * NW, 0, nb, 2.6, W0, W1);
    for (let i = 0; i <= 2; i++) pil(T1 + (i * (C1 - T1)) / 2, s * CW, 0, nb);
    for (let i = 0; i < 2; i++) win(T1 + ((i + 0.5) * (C1 - T1)) / 2, s * CW, 0, nb, 2.1, W0, W1);
    // the transept: its end gable with three windows and a round one above; two windows on each face of each arm
    for (const a of [T0 + 0.4, T1 - 0.4]) pil(a, s * TB, 0, nb);
    for (const a of [45.2, 49.9, 54.6]) win(a, s * TB, 0, nb, 2.2, W0, W1);
    for (const [fa, na] of [[T0, -1], [T1, 1]]) {
      for (const f of [1 / 3, 2 / 3]) win(fa, s * (NW + (TB - NW) * f), na, 0, 2.0, W0, W1);
      pil(fa, s * (NW + (TB - NW) / 2), na, 0);
    }
    const q = W((T0 + T1) / 2, s * (TB + 0.1)); S.kind = KIND.PLAIN;
    S.cyl(q[0], q[1], y + E + 3.0, y + E + 6.0, 0.1, 0.1, 4, glass, { cap: false });
    box((T0 + T1) / 2, s * (TB + 0.15), y + E + 2.4, y + E + 6.8, 2.4, 0.14, glass);
  }
  for (let i = 0; i + 1 < apse.length; i++) { // one tall window on each facet of the apse
    const [a0, b0] = apse[i], [a1, b1] = apse[i + 1], da = a1 - a0, db = b1 - b0, l = Math.hypot(da, db);
    let na = db / l, nb = -da / l; if (na * ((a0 + a1) / 2 - C1) + nb * ((b0 + b1) / 2) < 0) { na = -na; nb = -nb; }
    win((a0 + a1) / 2, (b0 + b1) / 2, na, nb, 1.8, W0, W1); // about half the facet: broad plain wall either side
  }
  for (let i = 1; i + 1 < apse.length; i++) { // a stepped pier at each angle of the apse
    const [a, b] = apse[i], d = Math.hypot(a - C1, b) || 1, q = W(a + ((a - C1) / d) * 0.2, b + (b / d) * 0.2);
    S.kind = KIND.PLAIN;
    S.box(q[0], q[1], ys, y + E - 0.3, 0.9, 0.5, ANG + Math.atan2(b / d, (a - C1) / d) + Math.PI / 2, concL);
    const q2 = W(a + ((a - C1) / d) * 0.42, b + (b / d) * 0.42);
    S.box(q2[0], q2[1], ys, y + E - 1.2, 0.5, 0.3, ANG + Math.atan2(b / d, (a - C1) / d) + Math.PI / 2, shade(concL, 1.04));
  }

  // ---- the front between the towers (photographs, docs/places/phucam.md; heights estimated): the narthex, low in the
  //      middle with a small gridded window; a stone shoulder beside each tower, highest (22 m) against it and falling
  //      along a concave curve to 15 m before dropping to the centre; a lattice strip where shoulder meets tower; over
  //      the glass strip the centre ends in a curved stone hood, bowed forward, with the cross on its crown
  S.kind = KIND.MASONRY;
  box(7.6, 0, y, y + 15, 5.2, 11.4, stoneC);
  const SH0 = 4.0, SH1 = 8.8, SA0 = 2.6, SA1 = 8.6; // shoulder: from b ±4 to inside the tower face; front and back along a
  const shH = (b) => { const t = (Math.abs(b) - SH0) / (SH1 - SH0); return y + 15 + 7 * t * t; };
  for (const s of [-1, 1]) {
    const n = 8;
    for (let i = 0; i < n; i++) {
      const b0 = s * (SH0 + ((SH1 - SH0) * i) / n), b1 = s * (SH0 + ((SH1 - SH0) * (i + 1)) / n), h0 = shH(b0), h1 = shH(b1);
      S.kind = KIND.MASONRY;
      S.quad(V(SA0, b0, yc), V(SA0, b1, yc), V(SA0, b1, h1), V(SA0, b0, h0), stoneC, [-F[0], 0, -F[1]]);
      S.quad(V(SA1, b1, y), V(SA1, b0, y), V(SA1, b0, h0), V(SA1, b1, h1), stoneC, [F[0], 0, F[1]]);
      S.kind = KIND.PLAIN;
      S.quad(V(SA0 - 0.1, b0, h0), V(SA0 - 0.1, b1, h1), V(SA1, b1, h1), V(SA1, b0, h0), stoneL, [0, 1, 0]);
    }
    S.kind = KIND.MASONRY; // the inner end, dropping to the centre
    S.quad(V(SA1, s * SH0, y), V(SA0, s * SH0, yc), V(SA0, s * SH0, y + 15), V(SA1, s * SH0, y + 15), stoneC, [-P[0] * s, 0, -P[1] * s]);
    S.kind = KIND.PLAIN;
    box(SA0 - 0.06, s * (SH1 - 0.75), y + 3, y + 25.5, 0.14, 1.3, lattice);
    for (let h = y + 3.4; h < y + 25.2; h += 0.9) for (const du of [-0.4, 0, 0.4]) box(SA0 - 0.16, s * (SH1 - 0.75) + du, h, h + 0.4, 0.04, 0.3, stoneD); // the square openings // the lattice strip against the tower
  }
  const HB = 4.6, HT = y + 21, HA = 10.0; // the hood: half-width, crown, back edge (inside the nave roof)
  // its face is a pale (cream) concave shell, dished back at the middle, set in a U of stone (Street View from the yard)
  { const n = 14, top = (b) => y + 14.6 + (HT - y - 14.6) * Math.sqrt(Math.max(0, 1 - (b / HB) ** 2)), fa = (b) => 4.0 + 0.9 * (b / HB) ** 2;
    const bot = (b) => Math.min(top(b), y + 15.4 + 3.2 * (b / HB) ** 2); // the shell's lower edge, rising to the sides
    for (let i = 0; i < n; i++) {
      const b0 = -HB + (2 * HB * i) / n, b1 = -HB + (2 * HB * (i + 1)) / n, t0 = top(b0), t1 = top(b1), f0 = fa(b0), f1 = fa(b1);
      const nn = [-F[0] + P[0] * ((b0 + b1) / 2) * 0.12, 0, -F[1] + P[1] * ((b0 + b1) / 2) * 0.12];
      S.kind = KIND.MASONRY;
      S.quad(V(f0, b0, y + 14.6), V(f1, b1, y + 14.6), V(f1, b1, bot(b1)), V(f0, b0, bot(b0)), stoneC, nn);
      S.kind = KIND.PLAIN;
      S.quad(V(f0 - 0.02, b0, bot(b0)), V(f1 - 0.02, b1, bot(b1)), V(f1, b1, t1), V(f0, b0, t0), cream, nn);
      S.kind = KIND.MASONRY;
      S.quad(V(HA, b1, y + 14.6), V(HA, b0, y + 14.6), V(HA, b0, t0), V(HA, b1, t1), stoneC, [F[0], 0, F[1]]);
      S.kind = KIND.PLAIN;
      S.quad(V(f0, b0, t0), V(f1, b1, t1), V(HA, b1, t1), V(HA, b0, t0), stoneC, [0, 1, 0]);
    }
    S.kind = KIND.MASONRY; // its soffit over the glass strip
    for (let i = 0; i < n; i++) { const b0 = -HB + (2 * HB * i) / n, b1 = -HB + (2 * HB * (i + 1)) / n; S.quad(V(fa(b1), b1, y + 14.6), V(fa(b0), b0, y + 14.6), V(HA, b0, y + 14.6), V(HA, b1, y + 14.6), stoneD, [0, -1, 0]); }
  }
  const gx = W(5.4, 0);
  S.kind = KIND.PLAIN;
  S.beam([gx[0], HT - 0.2, gx[1]], [gx[0], HT + 2.6, gx[1]], 0.28, 0.28, white);
  S.beam([gx[0] - P[0] * 0.8, HT + 1.8, gx[1] - P[1] * 0.8], [gx[0] + P[0] * 0.8, HT + 1.8, gx[1] + P[1] * 0.8], 0.26, 0.26, white);
  // on the axis under the shell, a small window of square panes in a pale grid (Street View from the yard)
  box(4.95, 0, y + 11.0, y + 13.6, 0.2, 2.0, glass);
  S.kind = KIND.PLAIN;
  for (const b of [-1.0, -0.5, 0, 0.5, 1.0]) box(4.88, b, y + 11.0, y + 13.6, 0.12, 0.09, lattice);
  for (let h = y + 11.0; h < y + 13.65; h += 0.52) box(4.88, 0, h - 0.045, h + 0.045, 0.12, 2.1, lattice);
  S.kind = KIND.MASONRY;
  box(4.92, 0, y, y + 4.2, 0.2, 5.6, door); // the doors, under the porch roof: three pairs of panels
  S.kind = KIND.PLAIN;
  for (const b of [-1.9, -0.0, 1.9]) box(4.82, b, y + 0.2, y + 4.0, 0.08, 0.14, stoneD);
  for (const b of [-0.95, 0.95]) box(4.82, b, y + 0.2, y + 4.0, 0.08, 0.05, hex('#5a4636'));
  box(4.82, 0, y + 4.0, y + 4.25, 0.1, 5.8, stoneD);
  S.kind = KIND.MASONRY;
  // the porch: a flat concrete roof on two columns over the doors, reached from both sides by an open stair that
  // climbs from out past each tower in along the front (Street View from the forecourt)
  S.kind = KIND.MASONRY;
  { // the slab's front edge bows outward (Street View: a curved canopy under the banner)
    const ring = [[5.0, 4.2], [5.0, -4.2]];
    for (let i = 0; i <= 8; i++) { const b = -4.2 + (8.4 * i) / 8; ring.push([-2.0 - 1.5 * (1 - (b / 4.2) ** 2), b]); }
    S.prism(ring.map(([a, b]) => W(a, b)), y + 4.5, y + 5.0, slabC, slabC);
  }
  // a low stone retaining wall along the terrace front, with planted beds behind it under the side stairs
  for (const s of [-1, 1]) {
    box(-2.0, s * 10.2, yc, yc + 0.7, 0.5, 8.8, stoneD, { top: stoneL });
    box(-0.4, s * 9.7, yc, yc + 0.6, 2.8, 7.8, stoneD, { top: lawn });
    S.kind = KIND.PLAIN;
    for (const [a, b] of [[-0.6, 6.6], [-0.9, 8.4], [0.9, 7.6], [0.6, 10.0]]) { const q = W(a, s * b); S.cyl(q[0], q[1], yc + 0.6, yc + 2.0, 1.0, 0.45, 6, hex('#4f7a3a')); }
    S.kind = KIND.MASONRY;
  }
  for (const s of [-1, 1]) box(-0.8, s * 3.6, yc, y + 4.5, 0.5, 0.5, slabC);
  for (const s of [-1, 1]) { // long shallow flights: the foot out past the tower's outer corner, the head at the porch roof
    const n = 28, A0 = [-0.6, s * 17.4], A1 = [-0.6, s * 4.4];
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n, p0 = [A0[0] + (A1[0] - A0[0]) * t0, A0[1] + (A1[1] - A0[1]) * t0], p1 = [A0[0] + (A1[0] - A0[0]) * t1, A0[1] + (A1[1] - A0[1]) * t1];
      const q0 = W(...p0), q1 = W(...p1), len = Math.hypot(q1[0] - q0[0], q1[1] - q0[1]);
      S.box((q0[0] + q1[0]) / 2, (q0[1] + q1[1]) / 2, yc + (y + 5.0 - yc) * t0 - 0.4, yc + (y + 5.0 - yc) * t1, len + 0.02, 1.6, Math.atan2(q1[1] - q0[1], q1[0] - q0[0]), stoneL);
    }
    S.kind = KIND.PLAIN; // its railing
    const r0 = W(A0[0] - 0.75, A0[1]), r1 = W(A1[0] - 0.75, A1[1]);
    S.beam([r0[0], yc + 1.0, r0[1]], [r1[0], y + 6.0, r1[1]], 0.08, 0.08, white);
    S.kind = KIND.MASONRY;
  }

  // ---- the two bell towers: squares turned 45° on the OSM footprint, rising unbroken (no stage cornices) with a slight
  //      taper; a dark slit the full height of the inner front face; near the top the inner side steps back twice
  //      before the point and the cross at 43.5 m (setback heights estimated from photographs)
  const crossTop = [];
  const RT = ANG + Math.PI / 4, cyl4 = (q, y0, y1, side0, side1, col, kind = KIND.MASONRY) => { S.kind = kind; S.cyl(q[0], q[1], y0, y1, side0 / Math.SQRT2, side1 / Math.SQRT2, 4, col, { cap: true, rot: ANG }); };
  for (const s of [-1, 1]) {
    const tc = W(5.2, s * 11.6), out = (d) => W(5.2, s * (11.6 + d)); // a point shifted outward across the axis
    cyl4(tc, yc - 0.3, y + 33.2, 7.4, 6.2, stoneC);
    cyl4(out(0.7), y + 33.2, y + 36.0, 4.6, 4.3, stoneC);
    cyl4(out(1.2), y + 36.0, y + 38.4, 3.4, 3.1, stoneC);
    cyl4(out(1.2), y + 38.4, y + 41.2, 3.1, 0.15, stoneD, KIND.TILE);
    // the slit, on the face looking forward and in toward the centre
    for (let k = 0; k < 4; k++) {
      const th2 = RT + (k * Math.PI) / 2, n = [Math.cos(th2), Math.sin(th2)];
      if (n[0] * -F[0] + n[1] * -F[1] <= 0 || (n[0] * -P[0] + n[1] * -P[1]) * s <= 0) continue;
      S.kind = KIND.PLAIN;
      for (let j = 0; j < 6; j++) { // in six lengths following the taper of the face
        const h0 = 2.5 + j * 5, h1 = h0 + 5, side = 7.4 - (1.2 * (h0 + 2.5 + 0.9)) / 34.1, r = side / 2 + 0.05;
        S.box(tc[0] + n[0] * r, tc[1] + n[1] * r, y + h0, y + h1, 0.14, 0.7, th2, door);
      }
    }
    const tp = out(1.2), top = y + 41.0;
    S.kind = KIND.PLAIN;
    S.beam([tp[0], top, tp[1]], [tp[0], top + 2.6, tp[1]], 0.26, 0.26, white);
    S.beam([tp[0] - P[0] * 0.8, top + 1.8, tp[1] - P[1] * 0.8], [tp[0] + P[0] * 0.8, top + 1.8, tp[1] + P[1] * 0.8], 0.24, 0.24, white);
    crossTop.push([tp, top]);
  }

  // ---- St Peter and St Paul on their pedestals in the forecourt
  for (const s of [-1, 1]) {
    const q = W(-19.5, s * 7);
    S.kind = KIND.MASONRY;
    S.box(q[0], q[1], yc, yc + 1.8, 1.5, 1.5, ANG, stoneL, { top: stoneL });
    S.kind = KIND.PLAIN;
    S.cyl(q[0], q[1], yc + 1.8, yc + 3.6, 0.42, 0.3, 7, white);
    S.cyl(q[0], q[1], yc + 3.6, yc + 4.0, 0.18, 0.16, 6, white);
  }

  // ---- the precinct: rendered wall with iron railing on the mapped outline, open at the gates and lanes
  const roads = roadsNear(data, c, 170), blds = buildingsNear(data, c, 130);
  // on the mapped outline less the street OSM draws along its south side (the wall stands at the kerb, not on it)
  fence(S, offStreets(data, PRECINCT), FENCE.church, { roads, openings: GATES, solid: blds });
  // raised garden beds where the generator's filler houses would otherwise stand inside the grounds
  const inChurch = (x, z) => inRing(x, z, out.map(([a, b]) => W(a, b))) || inRing(x, z, YARD.map(([a, b]) => W(a, b))) || inRing(x, z, [[-49, -10], [-49, 10], [-23, 10], [-23, -10]].map(([a, b]) => W(a, b)));
  const inf = data.infill || [];
  for (let i = 0; i + 7 < inf.length; i += 8) {
    const x = inf[i] / 10, z = inf[i + 1] / 10;
    if (Math.abs(x - c[0]) > 120 || Math.abs(z - c[1]) > 120 || !inRing(x, z, PRECINCT) || inChurch(x, z)) continue;
    const w = inf[i + 2] / 10 + 1.2, d = inf[i + 3] / 10 + 1.2, a = inf[i + 4] / 1000, g = gY(x, z);
    S.base = g - LAND_Y;
    S.kind = KIND.MASONRY;
    S.box(x, z, g - 0.4, g + 0.8, w, d, a, stoneL, { top: lawn });
    S.kind = KIND.PLAIN;
    for (const [u, v] of [[-0.25, -0.25], [0.25, 0.2], [0, 0]]) {
      const px = x + Math.cos(a) * u * w - Math.sin(a) * v * d, pz = z + Math.sin(a) * u * w + Math.cos(a) * v * d;
      S.cyl(px, pz, g + 0.8, g + 1.9, 0.9, 0.4, 6, hex('#5d7d3f'));
    }
  }
  S.kind = KIND.PLAIN;
  S.base = 0;

  // ---- after dark: the crosses lit white, the glass strip and the doors glowing, lamps on the forecourt and gates
  const L = new Buf(256);
  for (const [tc, top] of crossTop) {
    L.beam([tc[0], top - 0.05, tc[1]], [tc[0], top + 2.7, tc[1]], 0.34, 0.34, [1, 1, 1]);
    L.beam([tc[0] - P[0] * 0.85, top + 1.8, tc[1] - P[1] * 0.85], [tc[0] + P[0] * 0.85, top + 1.8, tc[1] + P[1] * 0.85], 0.32, 0.32, [1, 1, 1]);
  }
  { const q = gx; L.beam([q[0], HT - 0.3, q[1]], [q[0], HT + 2.7, q[1]], 0.36, 0.36, [1, 1, 1]); L.beam([q[0] - P[0] * 0.9, HT + 1.8, q[1] - P[1] * 0.9], [q[0] + P[0] * 0.9, HT + 1.8, q[1] + P[1] * 0.9], 0.34, 0.34, [1, 1, 1]); }
  const cross = lightMesh(L, lightMaterial(0xf4f1ff, 1.5));
  const L2 = new Buf(64);
  { const q = W(4.8, 0); L2.box(q[0], q[1], y + 11.05, y + 13.55, 0.16, 1.9, ANG, [1, 1, 1]); L2.box(q[0] - F[0] * 0.05, q[1] - F[1] * 0.05, y + 0.1, y + 5.4, 0.16, 3.0, ANG, [1, 1, 1]); }
  const strip = lightMesh(L2, lightMaterial(0xffc982, 1.1));
  const pos = [], col = [];
  const put = (q, h, cc = [1, 0.82, 0.52]) => { pos.push(q[0], h, q[1]); col.push(...cc); };
  for (const s of [-1, 1]) { put(W(-22.5, s * 13), yc + 3.6); put(W(-3.0, s * 19), yc + 3.6); put(W(-23.5, s * 3.8), yc + 1.4); }
  for (const [x, z] of GATES) put([x, z], gY(x, z) + 3.2);
  put(W(4.4, 0), y + 6.5, [1, 0.85, 0.6]);
  const pts = glowPoints(pos, col, 4);
  pts.userData.glow = true;
  for (const m of [cross, strip, pts]) { m.userData.landmark = id; group.add(m); }
}

// a night-light mesh from a Buf
function lightMesh(buf, mat) {
  const m = new THREE.Mesh(buf.geometry(), mat);
  m.renderOrder = 19;
  return m;
}
