import * as THREE from 'three';
import { KIND, Buf, hex, shade, inRing } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { glowPoints, lightMaterial } from '../../geo/materials.js';
import { fence, roadsNear, buildingsNear, offStreets, FENCE } from '../enclosure.js';

// Nhà thờ chính tòa Phủ Cam (Ngô Viết Thụ; begun 1963, finished May 2000) on Phước Quả hill. See docs/places/phucam.md.
//
// The plan is the OSM outline (way 118792054) read in a frame along its axis: a = metres from the front tips of the
// towers back toward the apse (south-south-east), b = metres across. The outline gives two bell towers set as
// squares turned 45° (front tips at a 0, inner corners at b ±5.6), the narthex between them, a nave 21 m wide
// (a 10-40.6), a transept 40.4 m across (a 40.6-59.2), a choir 19 m wide (a 59.2-70.3) ending in a three-sided apse
// at a 74.6. Sources: two bell towers of 43.5 m flanking a shorter curved centre with a tall coloured-glass strip and
// curved stone wings at the door ("an open Bible in perspective"); raw grey stone, terracotta roof tiles, tall arched
// blue windows; a vault of 21.5 m inside, its concrete ribs bent toward each other like hands in prayer; statues of
// St Peter and St Paul in front. The grounds are OSM way 1173741401 (the archdiocese precinct), with the stair up
// the hill from Đoàn Hữu Trưng on the axis.

export const id = 'phucam';

const DEG = Math.PI / 180;
const ANG = 71 * DEG; // axis, front → apse
const F = [Math.cos(ANG), Math.sin(ANG)], P = [-F[1], F[0]];
const O = [-131.668, 1763.405]; // a = 0, b = 0: the line of the tower tips, on the axis
const W = (a, b) => [O[0] + F[0] * a + P[0] * b, O[1] + F[1] * a + P[1] * b];
const gY = (x, z) => LAND_Y + rise(x, z);

// the precinct (OSM way 1173741401), model metres
const PRECINCT = [[-205.3, 1752.1], [-197.4, 1776.8], [-179.9, 1830.1], [-94.4, 1838], [-55.6, 1840], [-49.8, 1786.1], [-83.5, 1782.6],
  [-88.1, 1740.8], [-117, 1732.1], [-122.8, 1709.4], [-144.3, 1715.3], [-159.6, 1719], [-167.8, 1721.1]];
// where paths and the service lanes pass the fence (OSM steps 1173741385 / 1473287309, service way 1173741398)
const GATES = [[-145.0, 1713.4, 2.6], [-159.8, 1717.6, 1.4], [-198.6, 1773.2, 3.0], [-89.3, 1838.3, 3.0]];

const stoneC = hex('#9d988d'), stoneL = hex('#bdb8ac'), stoneD = hex('#7d796f'), tile = hex('#985440'), tileD = hex('#7a4333');
const glass = hex('#35537e'), glassW = hex('#c9a24a'), door = hex('#3a2c24'), white = hex('#efeae0'), pave = hex('#c4bba9');
const lawn = hex('#86a05e');

export function build({ data, S, group }) {
  const c = W(40, 0);
  // floor of the church: just above the highest ground under it (the hill rises toward the apse)
  let gmax = -1e9;
  for (const [a, b] of [[0, 0], [10, -10], [10, 10], [40, -20], [40, 20], [59, -20], [59, 20], [74, 0], [40, 0]]) { const q = W(a, b); gmax = Math.max(gmax, gY(q[0], q[1])); }
  const y = gmax + 0.3, yc = y - 0.9; // church floor, forecourt
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
  S.prism([[-19, -16], [-19, 16], [0, 16], [0, -16]].map(([a, b]) => W(a, b)), yc - 4.5, yc, stoneD, pave, { topKind: KIND.ROAD });
  // three steps from the forecourt up to the doors
  S.kind = KIND.ROAD;
  for (let i = 0; i < 3; i++) box(-1.2 + i * 0.5, 0, yc - 0.2, yc + 0.3 * (i + 1), 1.2, 11.2 - i * 0.6, pave);
  // the stair down the hill on the axis: the upper flight to the forecourt, a paved walk, the lower flight at the gate
  const g26 = gY(...W(-26, 0)), n1 = Math.max(4, Math.round((yc - g26) / 0.17));
  for (let i = 0; i < n1; i++) { const t = (i + 1) / n1; box(-26 + 7 * (i + 0.5) / n1, 0, g26 - 1, g26 + (yc - g26) * t, 7 / n1 + 0.02, 6.4, pave); }
  S.kind = KIND.MASONRY;
  for (const s of [-1, 1]) { // cheek walls of the upper flight
    const a = W(-26, s * 3.5), b = W(-19, s * 3.5);
    S.beam([a[0], g26 + 0.3, a[1]], [b[0], yc + 0.6, b[1]], 0.5, 1.2, stoneL);
  }
  S.kind = KIND.ROAD;
  for (let a = -49.6; a < -26; a += 2.95) { // the walk, laid on the slope
    const q0 = W(a, 0), q1 = W(a + 2.95, 0), h0 = gY(q0[0], q0[1]), h1 = gY(q1[0], q1[1]);
    box(a + 1.475, 0, Math.min(h0, h1) - 0.5, (h0 + h1) / 2 + 0.12, 3.0, 3.6, pave);
  }
  const g54 = gY(...W(-54, 0)), g49 = gY(...W(-49.6, 0)) + 0.12;
  for (let i = 0; i < 5; i++) box(-53.6 + i * 0.8 + 0.4, 0, g54 - 0.6, g54 + ((g49 - g54) * (i + 1)) / 5 + 0.15, 0.82, 4.4, pave);

  // ---- the walls: grey stone, wall-head at 10 m
  const E = 10, RN = 26, RC = 23.5; // eaves; ridge of nave and transept; ridge of the choir
  S.kind = KIND.MASONRY;
  box(25.3, 0, y, y + E, 30.6, 21, stoneC, { top: tileD });
  box(49.9, 0, y, y + E, 18.6, 40.4, stoneC, { top: tileD });
  box(64.75, 0, y, y + E, 11.1, 18.8, stoneC, { top: tileD });
  const apse = [[70.3, -9.3], [73.6, -5.5], [74.6, 0], [73.6, 5.5], [70.3, 9.3]];
  for (let i = 0; i + 1 < apse.length; i++) {
    const [a0, b0] = apse[i], [a1, b1] = apse[i + 1];
    const m = W((a0 + a1) / 2, (b0 + b1) / 2), k = W(66, 0);
    S.quad(V(a0, b0, y), V(a1, b1, y), V(a1, b1, y + E), V(a0, b0, y + E), stoneC, [m[0] - k[0], 0, m[1] - k[1]]);
  }
  S.prism(apse.map(([a, b]) => W(a, b)).concat([W(66, 9.3), W(66, -9.3)]), y + E - 0.3, y + E, stoneC, tileD);
  S.kind = KIND.PLAIN;
  for (const [a, la, lb] of [[25.3, 30.8, 21.3], [49.9, 18.8, 40.7], [64.75, 11.3, 19.1]]) box(a, 0, y + E - 0.6, y + E, la, lb, stoneL); // cornice

  // ---- roofs: steep terracotta pitches on the A-frame of ribs
  const OV = 0.9;
  S.kind = KIND.TILE;
  // a pitched roof with its ridge along a (alongA) or along b, over [p0,p1] along the ridge and ±hw across
  function pitch(alongA, p0, p1, cpos, hw, ridge, col, ends = [true, true]) {
    const at = (u, v, h) => (alongA ? V(u, cpos + v, h) : V(cpos + v, u, h));
    const k = (ridge - y - E) / hw, ye = y + E - k * OV;
    for (const s of [-1, 1]) S.quad(at(p0, s * (hw + OV), ye), at(p1, s * (hw + OV), ye), at(p1, 0, ridge), at(p0, 0, ridge), col, alongA ? [P[0] * s, 1.2, P[1] * s] : [F[0] * s, 1.2, F[1] * s]);
    S.kind = KIND.MASONRY;
    [p0, p1].forEach((u, i) => { if (ends[i]) S.tri(at(u, -hw, y + E), at(u, hw, y + E), at(u, 0, ridge - 0.2), stoneC, alongA ? [F[0] * (i ? 1 : -1), 0, F[1] * (i ? 1 : -1)] : [P[0] * (i ? 1 : -1), 0, P[1] * (i ? 1 : -1)]); });
    S.kind = KIND.TILE;
    const r0 = at(p0, 0, ridge + 0.1), r1 = at(p1, 0, ridge + 0.1);
    S.beam(r0, r1, 0.45, 0.35, shade(col, 0.82));
  }
  pitch(true, 9.5, 41.5, 0, 10.5, y + RN, tile, [true, false]);
  pitch(false, -20.2 - OV, 20.2 + OV, 49.9, 9.3, y + RN, tile);
  pitch(true, 58.6, 70.3, 0, 9.4, y + RC, tile, [false, false]);
  // the apse: three hipped facets fanning from the end of the choir ridge
  {
    const k = (RC - E) / 9.4, ye = y + E - k * OV, top = V(70.3, 0, y + RC);
    const ext = apse.map(([a, b]) => { const d = Math.hypot(a - 66.5, b) || 1; return V(a + ((a - 66.5) / d) * OV, b + (b / d) * OV, ye); });
    for (let i = 0; i + 1 < ext.length; i++) S.tri(ext[i], ext[i + 1], top, tile, [ext[i][0] + ext[i + 1][0] - 2 * top[0], 2, ext[i][2] + ext[i + 1][2] - 2 * top[2]]);
  }

  // ---- ribs and windows on the long walls: concrete ribs leaning in to the wall-head, tall arched blue windows between
  S.kind = KIND.PLAIN;
  const rib = stoneL;
  const ribsAt = (a, b, s, dirA) => { // a rib standing out from the wall at (a, b), leaning toward it; s = outward sign
    const lo = dirA ? V(a + s * 2.4, b, y - 0.2) : V(a, b + s * 2.4, y - 0.2), hi = dirA ? V(a + s * 0.3, b, y + E + 0.4) : V(a, b + s * 0.3, y + E + 0.4);
    S.beam(lo, hi, 0.6, 0.9, rib);
  };
  const arched = (a, b, s, dirA, w, y0, y1) => { // a window on a wall facing ±b (dirA false) or ±a (dirA true)
    const d = 0.08 * s;
    if (dirA) { box(a + d, b, y0, y1, 0.14, w, glass); S.tri(V(a + d * 1.8, b - w / 2, y1), V(a + d * 1.8, b + w / 2, y1), V(a + d * 1.8, b, y1 + w * 0.8), glass, [F[0] * s, 0, F[1] * s]); }
    else { box(a, b + d, y0, y1, w, 0.14, glass); S.tri(V(a - w / 2, b + d * 1.8, y1), V(a + w / 2, b + d * 1.8, y1), V(a, b + d * 1.8, y1 + w * 0.8), glass, [P[0] * s, 0, P[1] * s]); }
  };
  for (const s of [-1, 1]) {
    for (let i = 0; i <= 6; i++) ribsAt(10.4 + i * 5.03, s * 10.5, s, false);
    for (let i = 0; i < 6; i++) arched(10.4 + (i + 0.5) * 5.03, s * 10.5, s, false, 1.9, y + 1.8, y + 7.8);
    for (let i = 0; i <= 2; i++) ribsAt(59.4 + i * 5.3, s * 9.4, s, false);
    for (let i = 0; i < 2; i++) arched(59.4 + (i + 0.5) * 5.3, s * 9.4, s, false, 1.7, y + 1.8, y + 7.6);
    // transept ends: a rib at each corner and three tall windows; its front and back faces outside the nave
    for (const b of [-18.8, -6.3, 6.3, 18.8]) ribsAt(49.9 + b * 0.46, s * 20.2, s, false);
    for (const a of [44.2, 49.9, 55.6]) arched(a, s * 20.2, s, false, 2.2, y + 1.8, y + 8.0);
    for (const fa of [40.6, 59.2]) { const sa = fa < 50 ? -1 : 1; arched(fa, s * 15.4, sa, true, 2.0, y + 1.8, y + 7.8); }
  }
  // round windows high in the transept gables
  for (const s of [-1, 1]) { const q = W(49.9, s * 20.3); S.cyl(q[0], q[1], y + E + 3.5, y + E + 6.5, 0.1, 0.1, 4, glass, { cap: false }); box(49.9, s * 20.35, y + E + 3, y + E + 7.4, 2.4, 0.14, glass); }

  // ---- the narthex between the towers and its curved centre screen with the glass strip
  S.kind = KIND.MASONRY;
  box(7.6, 0, y, y + 15, 5.2, 11.4, stoneC);
  // the centre screen: concave in plan (deepest at the axis), its head an arch rising to 27.5 m, above the nave gable
  const NS = 8;
  for (let i = 0; i < NS; i++) {
    const b0 = -5.6 + (11.2 * i) / NS, b1 = -5.6 + (11.2 * (i + 1)) / NS;
    const h0 = 21.5 + 6 * (1 - (b0 / 5.6) ** 2), h1 = 21.5 + 6 * (1 - (b1 / 5.6) ** 2);
    const a0 = 4.8 + 1.5 * (1 - (b0 / 5.6) ** 2), a1 = 4.8 + 1.5 * (1 - (b1 / 5.6) ** 2);
    S.quad(V(a0, b0, y), V(a1, b1, y), V(a1, b1, y + h1), V(a0, b0, y + h0), stoneL, [-F[0], 0, -F[1]]);
    S.quad(V(a0 + 1.2, b0, y + 14), V(a1 + 1.2, b1, y + 14), V(a1 + 1.2, b1, y + h1), V(a0 + 1.2, b0, y + h0), stoneC, [F[0], 0, F[1]]);
    S.quad(V(a0, b0, y + h0), V(a1, b1, y + h1), V(a1 + 1.2, b1, y + h1), V(a0 + 1.2, b0, y + h0), stoneL, [0, 1, 0]);
  }
  S.kind = KIND.PLAIN;
  box(6.2, 0, y + 6.8, y + 24.5, 0.2, 1.7, glass); // the tall strip of coloured glass on the axis
  box(6.15, 0, y + 9, y + 21, 0.22, 0.5, glassW);
  box(6.1, 0, y, y + 5.6, 0.2, 3.4, door);
  for (const s of [-1, 1]) box(5.6, s * 3.6, y, y + 4.2, 0.2, 1.5, door);
  // the curved stone wings either side of the door, sweeping out and down like the pages of an open book
  S.kind = KIND.MASONRY;
  for (const s of [-1, 1]) {
    let prev = null;
    for (let i = 0; i <= 6; i++) {
      const t = i / 6, ang = t * Math.PI / 2;
      const a = 5.4 - Math.sin(ang) * 4.6, b = s * (2.6 + (1 - Math.cos(ang)) * 4.4), h = 7.5 - t * 4.8;
      if (prev) {
        const [pa, pb, ph] = prev, q0 = W(pa, pb), q1 = W(a, b), len = Math.hypot(q1[0] - q0[0], q1[1] - q0[1]);
        S.box((q0[0] + q1[0]) / 2, (q0[1] + q1[1]) / 2, yc - 0.3, y + (ph + h) / 2, len + 0.05, 0.7, Math.atan2(q1[1] - q0[1], q1[0] - q0[0]), stoneL);
      }
      prev = [a, b, h];
    }
  }

  // ---- the two bell towers: squares turned 45°, seven stages tapering to 43.5 m at the cross
  const tiers = [[7.0, 8.0], [6.6, 6.5], [6.2, 5.6], [5.8, 5.0], [5.4, 4.4], [5.0, 4.0], [4.4, 3.5]];
  const crossTop = [];
  for (const s of [-1, 1]) {
    const tc = W(5.0, s * 10.6);
    let h = y;
    tiers.forEach(([side, th], i) => {
      S.kind = KIND.MASONRY;
      S.box(tc[0], tc[1], h, h + th, side, side, ANG + Math.PI / 4, i % 2 ? stoneC : shade(stoneC, 0.95), { top: stoneL });
      S.kind = KIND.PLAIN;
      S.box(tc[0], tc[1], h + th - 0.35, h + th, side + 0.35, side + 0.35, ANG + Math.PI / 4, stoneL);
      // openings on the four faces: narrow slits low, tall louvred belfry openings in the top two stages
      const ow = i >= 5 ? 1.5 : 0.45, o0 = h + (i >= 5 ? 0.6 : 1.4), o1 = h + th - (i >= 5 ? 0.8 : 1.3);
      for (let k = 0; k < 4; k++) {
        const th2 = ANG + Math.PI / 4 + (k * Math.PI) / 2, n = [Math.cos(th2), Math.sin(th2)], r = side / 2 + 0.05;
        S.box(tc[0] + n[0] * r, tc[1] + n[1] * r, o0, o1, 0.12, ow, th2, door);
      }
      h += th;
    });
    S.kind = KIND.TILE;
    S.cyl(tc[0], tc[1], h, h + 4.6, 4.6 / Math.SQRT2, 0.12, 4, stoneD, { cap: false, rot: ANG });
    const top = h + 4.4;
    S.kind = KIND.PLAIN;
    S.beam([tc[0], top, tc[1]], [tc[0], top + 2.6, tc[1]], 0.26, 0.26, white);
    S.beam([tc[0] - P[0] * 0.8, top + 1.8, tc[1] - P[1] * 0.8], [tc[0] + P[0] * 0.8, top + 1.8, tc[1] + P[1] * 0.8], 0.24, 0.24, white);
    crossTop.push([tc, top]);
  }
  // the cross on the centre screen
  { const q = W(5.6, 0); S.beam([q[0], y + 27.4, q[1]], [q[0], y + 30.2, q[1]], 0.3, 0.3, white); S.beam([q[0] - P[0] * 0.85, y + 29.3, q[1] - P[1] * 0.85], [q[0] + P[0] * 0.85, y + 29.3, q[1] + P[1] * 0.85], 0.28, 0.28, white); }

  // ---- St Peter and St Paul on their pedestals in the forecourt
  for (const s of [-1, 1]) {
    const q = W(-8, s * 9);
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
  const inChurch = (x, z) => inRing(x, z, out.map(([a, b]) => W(a, b))) || inRing(x, z, [[-30, -18], [-30, 18], [0, 18], [0, -18]].map(([a, b]) => W(a, b)));
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
  { const q = W(5.45, 0); L.beam([q[0], y + 27.3, q[1]], [q[0], y + 30.3, q[1]], 0.36, 0.36, [1, 1, 1]); L.beam([q[0] - P[0] * 0.9, y + 29.3, q[1] - P[1] * 0.9], [q[0] + P[0] * 0.9, y + 29.3, q[1] + P[1] * 0.9], 0.34, 0.34, [1, 1, 1]); }
  const cross = lightMesh(L, lightMaterial(0xf4f1ff, 1.5));
  const L2 = new Buf(64);
  { const q = W(6.05, 0); L2.box(q[0], q[1], y + 6.8, y + 24.5, 0.16, 1.5, ANG, [1, 1, 1]); L2.box(q[0] - F[0] * 0.05, q[1] - F[1] * 0.05, y + 0.1, y + 5.4, 0.16, 3.0, ANG, [1, 1, 1]); }
  const strip = lightMesh(L2, lightMaterial(0xffc982, 1.1));
  const pos = [], col = [];
  const put = (q, h, cc = [1, 0.82, 0.52]) => { pos.push(q[0], h, q[1]); col.push(...cc); };
  for (const s of [-1, 1]) { put(W(-18.5, s * 15.5), yc + 3.6); put(W(-1.5, s * 15.5), yc + 3.6); put(W(-19, s * 3.8), yc + 1.4); }
  for (const [x, z] of GATES) put([x, z], gY(x, z) + 3.2);
  put(W(5.2, 0), y + 6.5, [1, 0.85, 0.6]);
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
