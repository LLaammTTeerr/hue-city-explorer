import * as THREE from 'three';
import { KIND, Buf, hex, shade, inRing } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { glowPoints, lightMaterial } from '../../geo/materials.js';
import { fence, leaves, roadsNear, buildingsNear, offStreets, FENCE } from '../enclosure.js';

// Nhà thờ Dòng Chúa Cứu Thế Huế (Đức Mẹ Hằng Cứu Giúp; Nguyễn Mỹ Lộc, 1959-62). See docs/places/dcct.md.
//
// The plan is the OSM outline (way 1172894102) read in a frame along its axis: a = metres from the front wall back
// toward the sanctuary (west), b = metres across (+b north). The church faces east, toward the apex of its
// triangular grounds where Nguyễn Huệ and Nguyễn Khuyến meet (vi.wikipedia). Outline: front 27.4 m wide (a 0), the
// nave to a 31, a wider crossing a 31-58 stepping out to b ±19 and ±25, then the choir narrowing to the
// polygonal sanctuary at a 80.6. Sources: plan 70 m deep and 15-37 m wide, side corridors 26 x 4.2 m, sanctuary
// 8.5 m deep, roof 32 m high, a central three-tier bell tower with a spire to 53 m (four electric bells), reinforced
// concrete and blue-grey stone (đá xanh), fired-clay tiles, tiered roofs drawn from Huế's đình and pagodas, a wide open
// porch, a great arched door with a round window, a clock and the cross on the axis, a statue of Christ in front and
// the grotto of Our Lady at the rear left. The audit of 2026-11 (photographs, see the doc) moved the tower from the door
// to the crossing, where it stands, and gave the front its stepped gable. The rebuild of 2026-11-22 (Google satellite
// and Street View, see the doc) re-proportioned the front to the photo (summit 24.4 m, round-headed window), paved the
// forecourt without the axis statue, and gave the transept ends their own entrance fronts.

export const id = 'dcct';

const DEG = Math.PI / 180;
// The OSM outline is drawn about 2-4 m south of the church and turned 1.5 degrees off it: on the satellite (2026-11
// review) the front stands 2-2.5 m and the sanctuary 4.5 m further north, the axis bearing 88.5 degrees, not 86.5. The
// outline keeps its shape; the frame is moved onto the building.
const ANG = 177.96 * DEG; // axis, front -> sanctuary
const F = [Math.cos(ANG), Math.sin(ANG)], P = [-F[1], F[0]];
const O = [733.94, 1203.56]; // a = 0, b = 0: the middle of the front wall
const W = (a, b) => [O[0] + F[0] * a + P[0] * b, O[1] + F[1] * a + P[1] * b];
const gY = (x, z) => LAND_Y + rise(x, z);

// the OSM outline in the frame (a, b)
const PLAN = [[0, -13.7], [31.9, -13.6], [32, -19.4], [37, -19.3], [37.1, -25.1], [54.1, -24.7], [54, -19.6], [58, -19.5], [58, -14.5],
  [63.3, -13.3], [68.5, -10.3], [71.4, -6.5], [77, -6.2], [80.6, -1.6], [80.4, 4.3], [76.5, 8.1], [70.6, 8.2], [67, 11.6], [62.3, 14.2],
  [57.1, 14.8], [57.1, 19.8], [53.3, 19.9], [53.3, 25], [36.3, 25], [36.3, 19.1], [31.3, 19.1], [31.2, 13.6], [0, 13.7]];
// the grounds: the triangle between Nguyễn Huệ (north), Nguyễn Khuyến (south-east) and the service lane on the west,
// set in from the carriageways (model metres; the streets from OSM ways 39419487 and 35926988)
const PRECINCT = [[590.7, 1149], [659.9, 1161.4], [742.6, 1176.3], [785.7, 1184.1], [822, 1189.6], [817.7, 1195.6], [730.4, 1236.2],
  [612.5, 1290.9], [586, 1302], [588, 1250]];
// gates: the main gate at the apex facing the crossroads, a side gate on Nguyễn Khuyến (estimated)
const GATE_MAIN = [819.8, 1192.6, 3.4], GATE_SIDE = [757, 1223.9, 2.6], GATE_NH = [700, 1168.6, 2.6];

// smooth white render with a blue cast over a grey-brown stone base (đá xanh), white trim, red-orange tiles
// (Street View, 2026-11 rebuild); the render is drawn plain, only the stone base takes the masonry joints
const st = hex('#d3dbe1'), stL = hex('#e4e9ec'), stD = hex('#8f8a7f'), trim = hex('#f1f0ea'), tile = hex('#b0573c'), tileD = hex('#86412f');
const slate = hex('#5d6870'), glass = hex('#2e4f86'), door = hex('#2c2722'), doorF = hex('#3d5f99'), white = hex('#efeae0'), pave = hex('#a9a69e');
const cream = hex('#f3e8d2'), band = hex('#d9b9a6'), glassS = hex('#7f93ad'), plaque = hex('#cfdbe8'), plaqueG = hex('#6fa05a');
const soffit = hex('#7a4a3a'), pier = hex('#bdbcb4'), spireC = hex('#5b5650'); // dressed pale-grey stone piers; the spire reads dark in the satellite and from Nguyễn Huệ

export function build({ data, S, group }) {
  let gmax = -1e9;
  for (const [a, b] of PLAN) { const q = W(a, b); gmax = Math.max(gmax, gY(q[0], q[1])); }
  const y = gmax + 0.6; // church floor
  const V = (a, b, h) => { const q = W(a, b); return [q[0], h, q[1]]; };
  const box = (a, b, y0, y1, la, lb, col, o = {}) => { const q = W(a, b); S.box(q[0], q[1], y0, y1, la, lb, ANG + (o.rot || 0), col, o); };
  const hipAB = (a, b, la, lb, y0, h, col, o) => { const q = W(a, b); if (la >= lb) S.hip(q[0], q[1], la, lb, ANG, y0, h, col, o); else S.hip(q[0], q[1], lb, la, ANG + Math.PI / 2, y0, h, col, o); };
  const oct = (a, b, y0, y1, r0, r1, col, kind = KIND.PLAIN) => { const q = W(a, b); S.kind = kind; S.cyl(q[0], q[1], y0, y1, r0, r1, 8, col, { cap: false, rot: ANG + Math.PI / 8 }); };
  // a disc facing the front (-F), e.g. the clock and the round window
  const disc = (a, b, h, r, col, n = 12) => { for (let i = 0; i < n; i++) { const t0 = (i / n) * 2 * Math.PI, t1 = ((i + 1) / n) * 2 * Math.PI; S.tri(V(a, b, h), V(a, b + Math.cos(t0) * r, h + Math.sin(t0) * r), V(a, b + Math.cos(t1) * r, h + Math.sin(t1) * r), col, [-F[0], 0, -F[1]]); } };
  // a tall window with a pointed head on a wall facing ±b (s = sign) at (a, b)
  const winB = (a, b, s, w, y0, y1, col = glass) => { const d = 0.09 * s; box(a, b + d, y0, y1, w, 0.14, col); S.kind = KIND.PLAIN; S.tri(V(a - w / 2, b + d * 1.6, y1), V(a + w / 2, b + d * 1.6, y1), V(a, b + d * 1.6, y1 + w * 0.75), col, [P[0] * s, 0, P[1] * s]); };
  const yf = Math.max(...[[-2, -16], [-2, 16], [-30, 16], [-30, -16], [-20, 0]].map(([a, b]) => gY(...W(a, b)))) + 0.3; // forecourt
  S.base = y - LAND_Y;

  // ---- plinth on the mapped outline, and the steps up to the porch
  S.kind = KIND.MASONRY;
  S.prism(PLAN.map(([a, b]) => W(a, b)), y - 1.6, y, stD, pave, { topKind: KIND.ROAD });
  S.kind = KIND.ROAD;
  for (let i = 0; i < 3; i++) box(-0.6 - i * 0.6, 0, yf - 0.6, yf + ((y - yf) * (3 - i)) / 4, 0.62, 27.4 + 1.2 * (2 - i), pave);

  // ---- the forecourt: one open paved yard from the steps to the apex, as the satellite and Street View show it (no
  //      lawns, nothing standing on the axis); kept off the carriageways
  const paved0 = S.n;
  S.kind = KIND.MASONRY;
  const fc = offStreets(data, [W(-2.4, 26), [742.6, 1176.3], [785.7, 1184.1], [822, 1189.6], [817.7, 1195.6], W(-2.4, -26)]);
  S.prism(fc, yf - 1.0, yf, stD, pave, { topKind: KIND.ROAD });
  (S.paved = S.paved || []).push([paved0, S.n]);

  // ---- the front block (a 0-10), read off the head-on Street View from the forecourt and scaled by the mapped front
  //      width (27.4 m): low wings either side with curved tiled copings (5.8 m at the corners, 8.4 m at the gable), the
  //      gable shaft 13.8 m wide with straight sides to its cornice at 18 m, three small steps with corner pinnacles to
  //      the summit block at 24.4 m, the great round-headed window with its grid and cross, the clock on the first step,
  //      dotted bands down the shaft, and a tiled canopy on four pillars over three blue-framed doors.
  const GW = 6.9; // half-width of the central gable
  // a wall whose top follows h(u), between u0 and u1 along a facade: M(u, h, d) maps a point on it, d metres back from
  // the face (0) to its depth; n is the face's outward normal. Front, back and a tiled coping.
  const profileWall = (M, n, u0, u1, depth, hOf, col, topCol, k = 8) => {
    const back = [-n[0], 0, -n[2]];
    for (let i = 0; i < k; i++) {
      const p0 = u0 + ((u1 - u0) * i) / k, p1 = u0 + ((u1 - u0) * (i + 1)) / k, h0 = hOf(p0), h1 = hOf(p1);
      S.kind = KIND.PLAIN;
      S.quad(M(p0, y, 0), M(p1, y, 0), M(p1, h1, 0), M(p0, h0, 0), col, n);
      S.quad(M(p1, y, depth), M(p0, y, depth), M(p0, h0, depth), M(p1, h1, depth), col, back);
      S.kind = KIND.TILE;
      S.quad(M(p0, h0 + 0.05, -0.35), M(p1, h1 + 0.05, -0.35), M(p1, h1 + 0.05, depth + 0.2), M(p0, h0 + 0.05, depth + 0.2), topCol, [0, 1, 0]);
    }
  };
  // a convex outline [[u, h], ...] filled on a wall: M(u, h) gives the point, n the outward normal
  const fan = (M, pts, col, n) => {
    const c = pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length], [0, 0]);
    for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; S.tri(M(...c), M(...p), M(...q), col, n); }
  };
  // an opening whose sides lean in: width w0 at the sill h0, w1 at the springing hs, and a head rising `rise` above the
  // springing: a half circle when rise is w1 / 2, a pointed (two-centred) head when it is more
  const head = (w1, rise = w1 / 2) => {
    const hw = w1 / 2, R = (rise * rise + hw * hw) / (2 * hw), c = R - hw;
    return { up: (u) => Math.sqrt(Math.max(0, R * R - (Math.abs(u) + c) ** 2)), half: (dh) => Math.max(0, Math.sqrt(Math.max(0, R * R - dh * dh)) - c) };
  };
  const archPts = (w0, w1, h0, hs, rise) => { const H = head(w1, rise), p = [[-w0 / 2, h0], [w0 / 2, h0]]; for (let i = 0; i <= 16; i++) { const u = (w1 / 2) * (1 - (2 * i) / 16); p.push([u, hs + H.up(u)]); } return p; };
  const archHW = (w0, w1, h0, hs, h, rise) => (h <= hs ? w0 / 2 + ((w1 - w0) / 2) * ((h - h0) / (hs - h0)) : head(w1, rise).half(h - hs));
  // a window of that shape: white frame, glass, a grid of glazing bars, an optional cross [bottom, top, arm y, arm half]
  // and an optional band of pierced squares round the frame (the great front window)
  const archWin = (M, n, w0, w1, h0, hs, { frame = 0.6, grid = [0.8, 0.9], bar = 0.08, cross = null, rise = w1 / 2, lattice = false } = {}) => {
    S.kind = KIND.PLAIN;
    fan((u, h) => M(u, h, 0.05), archPts(w0 + 2 * frame, w1 + 2 * frame, h0 - frame * 0.6, hs, rise + frame), trim, n);
    fan((u, h) => M(u, h, 0.1), archPts(w0, w1, h0, hs, rise), glass, n);
    const H = head(w1, rise), top = hs + rise;
    for (let u = 0; u < w0 / 2 - 0.1; u += grid[0]) for (const s of u ? [-1, 1] : [1]) {
      const hi = u <= w1 / 2 ? hs + H.up(u) : h0 + ((hs - h0) * (w0 / 2 - u)) / ((w0 - w1) / 2);
      S.beam(M(s * u, h0, 0.16), M(s * u, hi, 0.16), bar, bar, trim);
    }
    for (let h = h0 + grid[1]; h < top - 0.25; h += grid[1]) { const hw = archHW(w0, w1, h0, hs, h, rise); S.beam(M(-hw, h, 0.16), M(hw, h, 0.16), bar, bar, trim); }
    if (cross) { const [c0, c1, cy, cw] = cross; S.beam(M(0, c0, 0.2), M(0, c1, 0.2), 0.4, 0.16, trim); S.beam(M(-cw, cy, 0.2), M(cw, cy, 0.2), 0.4, 0.16, trim); }
    if (lattice) { // squares along the middle of the frame, up both sides and over the head
      const ring = archPts(w0 + frame, w1 + frame, h0, hs, rise + frame / 2).slice(2), path = [[(w0 + frame) / 2, h0], ...ring, [-(w0 + frame) / 2, h0]];
      const q = 0.13 * frame / 0.6;
      for (let i = 0; i + 1 < path.length; i++) {
        const [u0, v0] = path[i], [u1, v1] = path[i + 1], L = Math.hypot(u1 - u0, v1 - v0), k = Math.max(1, Math.round(L / 0.5));
        for (let j = 0; j < k; j++) { const t = (j + 0.5) / k, u = u0 + (u1 - u0) * t, v = v0 + (v1 - v0) * t; S.quad(M(u - q, v - q, 0.08), M(u + q, v - q, 0.08), M(u + q, v + q, 0.08), M(u - q, v + q, 0.08), slate, n); }
      }
    }
  };
  // a claustra panel: a white grid of pierced blocks over a dark ground, on a wall mapped by M(u, h, d) (d out of it)
  const claustra = (M, n, u0, u1, h0, h1, cu = 0.42, ch = 0.42) => {
    S.kind = KIND.PLAIN;
    S.quad(M(u0, h0, 0.04), M(u1, h0, 0.04), M(u1, h1, 0.04), M(u0, h1, 0.04), slate, n);
    const nu = Math.max(1, Math.round((u1 - u0) / cu)), nh = Math.max(1, Math.round((h1 - h0) / ch));
    for (let i = 0; i <= nu; i++) { const u = u0 + ((u1 - u0) * i) / nu; S.beam(M(u, h0, 0.1), M(u, h1, 0.1), 0.09, 0.07, trim); }
    for (let j = 0; j <= nh; j++) { const h = h0 + ((h1 - h0) * j) / nh; S.beam(M(u0, h, 0.1), M(u1, h, 0.1), 0.07, 0.09, trim); }
  };
  const nF = [-F[0], 0, -F[1]];
  const MF = (u, h, d) => V(d === undefined ? 0 : -d, u, h); // the front face: u across (+b), d out in front
  const MFw = (u, h, d) => V(d, u, h); // the same face for walls, d back into the block

  for (const s of [-1, 1]) {
    // the wing rises from 5.8 m at the corner to 8.4 m against the gable along a concave curve
    profileWall(MFw, nF, s * 13.7, s * GW, 10, (b) => { const t = (13.7 - Math.abs(b)) / (13.7 - GW); return y + 5.8 + 2.6 * t * t; }, st, tile);
    S.kind = KIND.PLAIN;
    S.quad(V(0, s * 13.7, y), V(10, s * 13.7, y), V(10, s * 13.7, y + 5.8), V(0, s * 13.7, y + 5.8), st, [P[0] * s, 0, P[1] * s]);
    S.kind = KIND.MASONRY;
    box(5, s * 13.4, y, y + 1.2, 10.2, 0.7, stD); // the grey stone base
    // the claustra block in the wing's side under the coping, and the tall pierced panel up the gable's flank above
    // the wing (Street View from the north-east)
    const ns = [P[0] * s, 0, P[1] * s];
    claustra((u, h, d) => V(u, s * (13.75 + d), h), ns, 1.8, 8.2, y + 1.7, y + 5.0);
    claustra((u, h, d) => V(u, s * (GW + d), h), ns, 1.4, 7.0, y + 9.0, y + 16.9, 0.4, 0.45);
  }
  for (const s of [-1, 1]) { // the pale plaques on the wings, with a string course above the stone base
    box(-0.04, s * 10.2, y + 2.4, y + 4.6, 0.1, 1.9, plaque); box(-0.07, s * 10.2, y + 2.7, y + 3.6, 0.1, 0.5, plaqueG);
    box(-0.04, s * 10.2, y + 1.2, y + 1.45, 0.14, 10.5, trim);
  }
  S.kind = KIND.MASONRY;
  box(5, 0, y, y + 1.2, 10.2, 27.6, stD);
  // the gable: a straight shaft to its cornice at 17.8 m, then four narrow steps, each under a small moulded ledge, to
  // the summit block at 24.3 m with the niche and its figure over a small cross (the head-on pano, ~18 px/m)
  const GD = 8.4; // depth of the gable block
  S.kind = KIND.PLAIN;
  box(GD / 2, 0, y + 1.2, y + 17.8, GD, 2 * GW, st, { top: stL });
  box(GD / 2, 0, y + 17.8, y + 18.1, GD + 0.3, 2 * GW + 0.8, trim);
  const steps = [[18.1, 19.05, 10.7], [19.35, 20.2, 7.8], [20.5, 21.3, 5.0], [21.6, 24.3, 2.8]]; // bottom, top, width
  for (const [h0, h1, w] of steps) {
    box(GD / 2 - 0.4, 0, y + h0, y + h1, GD - 0.8, w, st, { top: stL });
    box(GD / 2 - 0.4, 0, y + h1, y + h1 + 0.3, GD - 0.5, w + 0.8, trim);
  }
  box(-0.04, 0, y + 22.5, y + 23.9, 0.1, 0.9, door); // the niche in the summit block and its white figure
  box(-0.08, 0, y + 22.6, y + 23.7, 0.1, 0.34, white);
  S.beam(V(-0.1, 0, y + 21.4), V(-0.1, 0, y + 22.4), 0.16, 0.12, trim); // the small cross under the niche
  S.beam(V(-0.1, -0.35, y + 22.1), V(-0.1, 0.35, y + 22.1), 0.12, 0.12, trim);
  // the great window: sides leaning in from 6.2 m at the sill to 5.3 m, a tall pointed head to 16.7 m (the frame to
  // 17.4), a band of pierced squares round the frame, the grid and the cross
  const WW = 5.6, W0 = 7.4, W1 = 12.4; // (for the night glow) width, sill, springing
  box(-0.04, 0, y + 6.3, y + 6.9, 0.1, 7.8, band); // the band under the sill
  archWin(MF, nF, 6.2, 5.3, y + W0, y + W1, { frame: 0.75, grid: [0.75, 0.9], rise: 4.3, lattice: true, cross: [y + 8.6, y + 16.0, y + 13.0, 1.6] });
  disc(-0.06, 0, y + 18.65, 0.58, white, 16); // the clock
  S.beam(V(-0.1, 0, y + 18.65), V(-0.1, 0, y + 19.1), 0.08, 0.05, door);
  S.beam(V(-0.1, 0, y + 18.65), V(-0.1, 0.32, y + 18.65), 0.08, 0.05, door);
  for (const s of [-1, 1]) for (let i = 0; i <= 16; i++) { // dotted bands curving down from beside the clock, with portholes
    const t = i / 16, b = s * (1.7 + 4.0 * (1 - (1 - t) ** 2.2)), h = y + 19.2 - 11.3 * t;
    if (i % 4 === 2) { disc(-0.06, b, h, 0.28, white, 10); disc(-0.09, b, h, 0.2, door, 10); } else disc(-0.06, b, h, 0.1, door, 6);
  }
  // three blue-framed doors under a tiled canopy on four stone pillars
  for (const b of [-3.35, 0, 3.35]) { box(-0.05, b, y, y + 4.0, 0.1, 2.3, doorF); box(-0.09, b, y, y + 3.75, 0.1, 1.8, door); }
  box(-1.3, 0, y + 5.0, y + 5.4, 2.8, 13.8, trim);
  hipAB(-1.3, 0, 2.8, 13.8, y + 5.4, 0.9, tile, { over: 0.5, flare: 0.2, segs: 2 });
  S.kind = KIND.PLAIN;
  for (const b of [-5, -1.7, 1.7, 5]) box(-2.3, b, yf - 0.2, y + 5.0, 0.55, 0.55, pier);

  // ---- nave with its side corridors (26 x 4.2 m), the clerestory above, tiered roofs. Street View from Nguyễn Huệ:
  //      the corridors are grey-brown stone with round-arched windows under a white band; the clerestory is white,
  //      with tall pointed windows with grey tracery, each under a gabled dormer head breaking the eave.
  const NE = 15, NR = 25; // nave wall-head, nave ridge
  S.kind = KIND.MASONRY;
  box(20.5, 0, y, y + 6.0, 21, 27.4, stD); // side corridors, the stone
  S.kind = KIND.PLAIN;
  box(20.5, 0, y + 6.0, y + 7.4, 21, 27.4, st, { top: tileD }); // and the white band
  box(25.2, 0, y, y + NE, 30.9, 19, st, { top: tileD }); // nave, on to the tower over the crossing
  S.kind = KIND.TILE;
  for (const s of [-1, 1]) { // corridor lean-to roofs, the lower tier
    const lo = s * 14.6, hi = s * 9.5;
    S.quad(V(9.6, lo, y + 6.6), V(31.4, lo, y + 6.6), V(31.4, hi, y + 9.6), V(9.6, hi, y + 9.6), tile, [P[0] * s, 1.4, P[1] * s]);
  }
  { // the nave roof, a steep pitch, running back from behind the front gable
    const ye = y + NE - 1.1;
    for (const s of [-1, 1]) S.quad(V(8.4, s * 10.6, ye), V(40.65, s * 10.6, ye), V(40.65, 0, y + NR), V(8.4, 0, y + NR), tile, [P[0] * s, 1.2, P[1] * s]);
    S.kind = KIND.PLAIN; // its west gable against the tower
    S.tri(V(40.6, -9.5, ye + 1.0), V(40.6, 9.5, ye + 1.0), V(40.6, 0, y + NR - 0.1), st, [F[0], 0, F[1]]);
    S.kind = KIND.TILE;
    S.beam(V(8.4, 0, y + NR + 0.1), V(40.65, 0, y + NR + 0.1), 0.45, 0.35, tileD);
  }
  for (const s of [-1, 1]) for (let i = 0; i < 5; i++) { // round-arched windows in the corridor's stone wall
    const a = 12.2 + i * 4.3, n = [P[0] * s, 0, P[1] * s];
    archWin((u, h, d = 0) => V(a + u, s * (13.7 + d), h), n, 2.0, 2.0, y + 1.6, y + 3.8, { frame: 0.25, grid: [0.5, 1.1], bar: 0.06 });
  }
  for (const s of [-1, 1]) box(20.5, s * 9.75, y + NE - 1.35, y + NE - 1.0, 21, 0.5, trim); // the cornice under the eave
  for (const s of [-1, 1]) for (let i = 0; i < 8; i++) { // the clerestory: tall windows under gabled dormer heads breaking the eave
    const a = 11.3 + i * 2.7, hw = 1.15, e = y + NE, ye = y + NE - 1.1, ap = e + 2.0, bo = s * 9.6, bi = s * 7.6;
    S.kind = KIND.PLAIN;
    box(a, s * 9.53, y + 9.3, y + NE - 1.0, 1.7, 0.08, trim);
    winB(a, s * 9.5, s, 1.4, y + 9.4, y + NE - 1.6, glassS);
    box(a + 1.35, s * 9.6, y + 8.0, y + NE - 0.9, 0.35, 0.3, trim); // pilaster between the windows
    if (i === 0) box(a - 1.35, s * 9.6, y + 8.0, y + NE - 0.9, 0.35, 0.3, trim);
    S.kind = KIND.PLAIN;
    S.beam(V(a, s * 9.72, y + 9.4), V(a, s * 9.72, y + NE - 0.7), 0.1, 0.06, slate); // the mullion
    S.beam(V(a - 0.7, s * 9.72, y + 11.7), V(a + 0.7, s * 9.72, y + 11.7), 0.08, 0.06, slate);
    S.tri(V(a - hw, bo, e - 0.6), V(a + hw, bo, e - 0.6), V(a, bo, ap), stL, [P[0] * s, 0, P[1] * s]);
    S.kind = KIND.TILE;
    S.quad(V(a - hw - 0.15, s * 9.8, e - 0.7), V(a, s * 9.8, ap + 0.15), V(a, bi, ap - 0.4), V(a - hw - 0.15, bi, ye + 1.5), tile, [-F[0], 1, -F[1]]);
    S.quad(V(a, s * 9.8, ap + 0.15), V(a + hw + 0.15, s * 9.8, e - 0.7), V(a + hw + 0.15, bi, ye + 1.5), V(a, bi, ap - 0.4), tile, [F[0], 1, F[1]]);
  }

  // ---- the crossing (2026-11 review against the satellite): a gabled transept, 16.6 m across, runs the full width
  //      from front to front with the bell tower rising out of its ridge; the nave roof runs on into the tower; the
  //      four corners between the arms, the nave and the choir step down under low hipped roofs. Each arm ends in an
  //      entrance front like the main one in small (Street View from Nguyễn Huệ; the satellite shows the steps at
  //      both ends): a white gable with a tall round-headed window, curved-coped wings with pierced claustra panels,
  //      and a tiled canopy on pillars over three doors.
  const TC = 45.4, TH = 8.3, TE = 11, TR = 17; // the arms' centre line (a), half-width, wall-head, ridge
  S.kind = KIND.PLAIN;
  box(44.95, 0, y, y + 8.2, 26.2, 38.6, st, { top: tileD }); // the low corners, b ±19.3
  hipAB(44.95, 0, 26.2, 38.6, y + 8.2, 3.4, tile, { over: 1.0, flare: 0.3, segs: 2 });
  box(TC, 0, y, y + TE, 2 * TH, 43.8, st, { top: tileD }); // the transept, b ±21.9
  box(TC, 0, y + TE - 0.5, y + TE - 0.15, 2 * TH + 0.4, 44.2, trim); // the cornice under its eave
  S.kind = KIND.TILE;
  for (const e of [-1, 1]) S.quad(V(TC + e * (TH + 0.7), -22.3, y + TE - 0.5), V(TC + e * (TH + 0.7), 22.3, y + TE - 0.5), V(TC, 22.3, y + TR), V(TC, -22.3, y + TR), tile, [F[0] * e, 1.2, F[1] * e]);
  S.beam(V(TC, -22.3, y + TR + 0.1), V(TC, 22.3, y + TR + 0.1), 0.45, 0.35, tileD);
  S.kind = KIND.PLAIN;
  for (const s of [-1, 1]) S.tri(V(TC - TH, s * 21.9, y + TE), V(TC + TH, s * 21.9, y + TE), V(TC, s * 21.9, y + TR - 0.2), st, [P[0] * s, 0, P[1] * s]);
  for (const s of [-1, 1]) for (const a of [TC - 5, TC + 5]) winB(a, s * 21.9, s, 1.6, y + 8.6, y + 12.2, glassS); // high windows in the arms' gables
  for (const s of [-1, 1]) {
    const n = [P[0] * s, 0, P[1] * s], Mw = (u, h, d) => V(TC + u, s * (25 - d), h), Mo = (u, h, d = 0) => V(TC + u, s * (25 + d), h);
    // the wings, 5.5 m at the corners rising to 8 m against the gable
    for (const e of [-1, 1]) profileWall(Mw, n, e * 8.8, e * 4, 3.1, (u) => { const t = (8.8 - Math.abs(u)) / 4.8; return y + 5.5 + 2.5 * t * t; }, st, tile, 6);
    for (const e of [-1, 1]) { S.kind = KIND.PLAIN; S.quad(V(TC + e * 8.8, s * 25, y), V(TC + e * 8.8, s * 21.9, y), V(TC + e * 8.8, s * 21.9, y + 5.5), V(TC + e * 8.8, s * 25, y + 5.5), st, [F[0] * e, 0, F[1] * e]); }
    S.kind = KIND.MASONRY;
    box(TC, s * 24.6, y, y + 1.0, 17.8, 0.9, stD);
    // the gable: shaft to 14.5 m, one step, the summit block and its cross
    S.kind = KIND.PLAIN;
    box(TC, s * 23.5, y + 1.0, y + 14.5, 8, 3, st, { top: stL });
    box(TC, s * 23.5, y + 14.5, y + 14.8, 8.6, 3.3, trim);
    box(TC, s * 23.4, y + 14.8, y + 16.4, 4.6, 2.6, st, { top: stL });
    box(TC, s * 23.4, y + 16.4, y + 16.65, 5.0, 2.8, trim);
    box(TC, s * 23.4, y + 16.65, y + 17.9, 2.2, 2.4, st, { top: stL });
    S.beam(V(TC, s * 24.2, y + 17.9), V(TC, s * 24.2, y + 19.1), 0.16, 0.16, cream);
    S.beam(V(TC - 0.35, s * 24.2, y + 18.7), V(TC + 0.35, s * 24.2, y + 18.7), 0.14, 0.14, cream);
    archWin(Mo, n, 3.4, 3.0, y + 6.2, y + 11.6, { frame: 0.4, grid: [0.6, 0.8], bar: 0.07 });
    for (const e of [-1, 1]) claustra(Mo, n, e * 6.4 - 1.6, e * 6.4 + 1.6, y + 1.6, y + 4.8, 0.4, 0.4); // on the wings
    // the doors, the canopy on four pillars, the steps
    for (const u of [-2.3, 0, 2.3]) { box(TC + u, s * 25.05, y, y + 3.5, 1.6, 0.1, doorF); box(TC + u, s * 25.09, y, y + 3.3, 1.2, 0.1, door); }
    box(TC, s * 26.3, y + 4.0, y + 4.4, 7.4, 2.6, trim);
    hipAB(TC, s * 26.3, 7.4, 2.6, y + 4.4, 0.8, tile, { over: 0.4, flare: 0.2, segs: 2 });
    S.kind = KIND.PLAIN;
    for (const u of [-3.4, -1.15, 1.15, 3.4]) box(TC + u, s * 27.3, y - 1.6, y + 4.0, 0.42, 0.42, pier);
    S.kind = KIND.ROAD;
    box(TC, s * 26.5, y - 1.6, y - 0.05, 8.4, 3.0, pave);
  }
  for (const s of [-1, 1]) for (const a of [34.2, 55.8]) winB(a, s * 19.4, s, 1.8, y + 1.3, y + 5.8);

  // ---- the west end, as the satellite shows it: a narrow apse under a fanned roof behind the transept, a ring of four
  //      round chapels with their own conical roofs round it, low lean-to roofs between, and at the far west a broad
  //      polygonal hall under a low hipped roof (its walls on the mapped outline).
  const CH = [[58, -14.5], [63.3, -13.3], [68.5, -10.3], [71.4, -6.5], [70.6, 8.2], [67, 11.6], [62.3, 14.2], [57.1, 14.8]];
  S.kind = KIND.PLAIN;
  S.prism(CH.map(([a, b]) => W(a, b)), y, y + 5.2, st, tileD, { top: false });
  S.kind = KIND.TILE;
  S.prism(CH.map(([a, b]) => W(a, b)), y + 5.0, y + 6.6, tile, tile, { scaleTop: 0.82, centre: W(63, 0.6) });
  // the apse: half an ellipse from the transept's west wall, 13.3 m deep and 13.2 m across, walls to 12 m
  const AC = [TC + TH, 0.8], AP = [];
  for (let i = 0; i <= 8; i++) { const t = -Math.PI / 2 + (i / 8) * Math.PI; AP.push([AC[0] + 13.3 * Math.cos(t), AC[1] + 6.6 * Math.sin(t)]); }
  S.kind = KIND.PLAIN;
  S.prism(AP.map(([a, b]) => W(a, b)), y, y + 12, st, tileD);
  box(AC[0] + 0.1, AC[1], y + 11.5, y + 12.2, 0.2, 13.4, trim);
  { // the fanned roof: pleated, a ridge rib on each facet, and its back closed against the transept roof
    const apex = V(AC[0] + 0.3, AC[1], y + 17.5), eave = AP.map(([a, b]) => V(AC[0] + (a - AC[0]) * 1.07, AC[1] + (b - AC[1]) * 1.07, y + 11.4));
    S.kind = KIND.TILE;
    for (let i = 0; i + 1 < eave.length; i++) {
      const e0 = eave[i], e1 = eave[i + 1], m = [(e0[0] + e1[0]) / 2, y + 12.1, (e0[2] + e1[2]) / 2];
      S.tri(e0, m, apex, tile, [m[0] - apex[0], 2.5, m[2] - apex[2]]); S.tri(m, e1, apex, tile, [m[0] - apex[0], 2.5, m[2] - apex[2]]);
      S.beam(e0, apex, 0.22, 0.18, tileD);
    }
    S.kind = KIND.PLAIN;
    S.tri(eave[0], eave[eave.length - 1], apex, st, [-F[0], 0, -F[1]]);
  }
  for (let i = 0; i < 8; i++) { // tall pointed windows round the apse
    const t = -Math.PI / 2 + ((i + 0.5) / 8) * Math.PI, a = AC[0] + 13.36 * Math.cos(t), b = AC[1] + 6.64 * Math.sin(t);
    const q = W(a, b), tn = [Math.cos(t) / 13.3, Math.sin(t) / 6.6], nl = Math.hypot(...tn), nw = [F[0] * tn[0] / nl + P[0] * tn[1] / nl, F[1] * tn[0] / nl + P[1] * tn[1] / nl];
    const ang = Math.atan2(nw[1], nw[0]), w = 1.3;
    S.box(q[0], q[1], y + 6.6, y + 10.2, 0.14, w, ang, glass);
    S.tri([q[0] - Math.sin(ang) * w / 2, y + 10.2, q[1] + Math.cos(ang) * w / 2], [q[0] + Math.sin(ang) * w / 2, y + 10.2, q[1] - Math.cos(ang) * w / 2], [q[0], y + 11.0, q[1]], glass, [nw[0], 0, nw[1]]);
  }
  // the four round chapels with conical roofs
  for (const [ca, cb] of [[58.6, 11.4], [65.4, 9.6], [58.6, -10.4], [65.4, -8.4]]) {
    const q = W(ca, cb);
    S.kind = KIND.MASONRY;
    S.cyl(q[0], q[1], y, y + 1.0, 3.35, 3.35, 12, stD, { cap: false });
    S.kind = KIND.PLAIN;
    S.cyl(q[0], q[1], y + 1.0, y + 6.8, 3.3, 3.3, 12, st, { cap: false });
    S.cyl(q[0], q[1], y + 6.5, y + 6.9, 3.45, 3.45, 12, trim, { cap: false });
    for (let k = 0; k < 6; k++) { const t = k * Math.PI / 3 + 0.26; S.box(q[0] + Math.cos(t) * 3.33, q[1] + Math.sin(t) * 3.33, y + 2.0, y + 5.4, 0.1, 0.8, t, glass); }
    S.kind = KIND.TILE;
    S.cyl(q[0], q[1], y + 6.8, y + 10.0, 3.95, 0.15, 12, tile, { cap: false });
  }
  { // the polygonal hall at the far west, on the mapped outline
    const HP = [[67.6, -6.5], [71.4, -6.5], [77, -6.2], [80.6, -1.6], [80.4, 4.3], [76.5, 8.1], [70.6, 8.2], [67.6, 8.2]];
    const ring = HP.map(([a, b]) => W(a, b)), hc = W(74.3, 0.9), apex = [hc[0], y + 12.6, hc[1]];
    S.kind = KIND.PLAIN;
    S.prism(ring, y, y + 7.6, st, tileD);
    S.kind = KIND.MASONRY;
    S.prism(ring, y, y + 1.0, stD, stD, { top: false });
    S.kind = KIND.TILE;
    for (let i = 0; i < ring.length; i++) {
      const out = (p) => { const dx = p[0] - hc[0], dz = p[1] - hc[1], d = Math.hypot(dx, dz) || 1; return [p[0] + (dx / d) * 1.0, y + 7.1, p[1] + (dz / d) * 1.0]; };
      const e0 = out(ring[i]), e1 = out(ring[(i + 1) % ring.length]);
      S.tri(e0, e1, apex, tile, [e0[0] + e1[0] - 2 * apex[0], 3, e0[2] + e1[2] - 2 * apex[2]]);
    }
    for (let i = 1; i + 2 < HP.length; i++) { // round-headed windows in its walls
      const [a0, b0] = HP[i], [a1, b1] = HP[i + 1], am = (a0 + a1) / 2, bm = (b0 + b1) / 2, q0 = W(a0, b0), q1 = W(a1, b1);
      const ang = Math.atan2(q1[1] - q0[1], q1[0] - q0[0]), qm = W(am, bm), d = [qm[0] - hc[0], qm[1] - hc[1]], dl = Math.hypot(...d);
      S.kind = KIND.PLAIN;
      S.box(qm[0] + d[0] / dl * 0.08, qm[1] + d[1] / dl * 0.08, y + 2.0, y + 5.6, 1.6, 0.14, ang, glass);
    }
  }

  // ---- the bell tower over the crossing (the octagonal lantern seen inside): a square lattice shaft out of the
  //      transept ridge, three eight-sided tiers each under a flared tiled skirt (the middle one an open gallery), the
  //      spire and the cross at 53 m. Tier heights estimated from photographs (docs/places/dcct.md).
  const TA = 44.95, yg = gY(...W(40, 0)); // tower centre; heights are measured from the ground mid-church
  const tc = W(TA, 0);
  S.kind = KIND.PLAIN;
  box(TA, 0, y + 13, yg + 25.2, 8.6, 8.6, stL);
  for (let k = 0; k < 4; k++) { // lattice panels on the four faces of the shaft, seated on the face
    const t = ANG + (k * Math.PI) / 2, h0 = k === 2 ? y + 22.4 : y + 18.2, h1 = yg + 24.4;
    const c = [tc[0] + Math.cos(t) * 4.3, tc[1] + Math.sin(t) * 4.3], u = [-Math.sin(t), Math.cos(t)];
    claustra((v, h, d) => [c[0] + u[0] * v + Math.cos(t) * d, h, c[1] + u[1] * v + Math.sin(t) * d], [Math.cos(t), 0, Math.sin(t)], -2.8, 2.8, h0, h1, 0.56, 0.6);
  }
  box(TA, 0, yg + 24.9, yg + 25.4, 9.4, 9.4, trim);
  // the openings, flat on the eight faces of a tier (a box thin along the face normal)
  const ring = (y0, y1, r, w, col) => { for (let i = 0; i < 8; i++) { const t = ANG + Math.PI / 4 + (i * Math.PI) / 4, rr = r * Math.cos(Math.PI / 8) + 0.04; S.kind = KIND.PLAIN; S.box(tc[0] + Math.cos(t) * rr, tc[1] + Math.sin(t) * rr, y0, y1, 0.1, w, t, col); } };
  // [body bottom, body top, body radius, skirt radius, opening colour]
  const tiers = [[25.2, 29.7, 4.9, 8.4, slate], [30.5, 34.0, 4.8, 6.6, door], [34.8, 38.3, 3.1, 4.8, door]];
  for (const [t0, t1, r, rs, oc] of tiers) {
    oct(TA, 0, yg + t0 - 0.8, yg + t1, r, r, stL, KIND.PLAIN);
    ring(yg + t0 + 0.5, yg + t1 - 0.7, r, r * 0.42, oc);
    // the skirt: a fascia under a concave tiled slope, shallow at the eave and steep into the tier above
    const e = yg + t1 - 0.5, rm = r + (rs - r) * 0.42;
    oct(TA, 0, e - 0.3, e, rs, rs, trim, KIND.PLAIN);
    S.kind = KIND.PLAIN; // the soffit, facing down: what a visitor below sees of the skirt
    for (let i = 0; i < 8; i++) {
      const t0 = ANG + Math.PI / 8 + (i * Math.PI) / 4, t1 = t0 + Math.PI / 4, hy = e - 0.3;
      const p = (t, rr) => [tc[0] + Math.cos(t) * rr, hy, tc[1] + Math.sin(t) * rr];
      S.quad(p(t0, r), p(t1, r), p(t1, rs), p(t0, rs), soffit, [0, -1, 0]);
    }
    oct(TA, 0, e, e + 0.55, rs + 0.05, rm, tile, KIND.TILE);
    oct(TA, 0, e + 0.55, e + 2.0, rm, r * 0.72, tile, KIND.TILE);
  }
  oct(TA, 0, yg + 30.6, yg + 31.6, 5.0, 5.0, trim, KIND.PLAIN); // the gallery's balustrade
  const spire0 = yg + 38.5, crossY = yg + 50.0; // cross from 50 to 53 m above the ground
  oct(TA, 0, spire0, crossY + 0.2, 1.7, 0.1, spireC, KIND.TILE);
  S.kind = KIND.PLAIN;
  S.beam([tc[0], crossY, tc[1]], [tc[0], yg + 53, tc[1]], 0.3, 0.3, cream);
  S.beam(V(TA, -0.9, crossY + 2.0), V(TA, 0.9, crossY + 2.0), 0.28, 0.28, cream);
  // four small square turrets with gabled caps at the corners of the crossing
  for (const ta of [36.2, 54.6]) for (const s of [-1, 1]) {
    const tb = s * 20.4, h1 = y + 15.5;
    S.kind = KIND.PLAIN;
    box(ta, tb, y, h1, 3.0, 3.0, st);
    box(ta, tb, h1 - 0.3, h1, 3.4, 3.4, trim);
    for (const [da, db] of [[-1.52, 0], [1.52, 0], [0, -1.52], [0, 1.52]]) box(ta + da, tb + db, y + 12.4, y + 14.8, da ? 0.1 : 1.6, da ? 1.6 : 0.1, door);
    S.kind = KIND.TILE;
    S.quad(V(ta - 1.8, tb - 1.8, h1), V(ta + 1.8, tb - 1.8, h1), V(ta + 1.8, tb, h1 + 1.8), V(ta - 1.8, tb, h1 + 1.8), tile, [P[0] * -1, 1, P[1] * -1]);
    S.quad(V(ta + 1.8, tb + 1.8, h1), V(ta - 1.8, tb + 1.8, h1), V(ta - 1.8, tb, h1 + 1.8), V(ta + 1.8, tb, h1 + 1.8), tile, [P[0], 1, P[1]]);
    S.kind = KIND.PLAIN;
    for (const sa of [-1, 1]) S.tri(V(ta + sa * 1.5, tb - 1.5, h1), V(ta + sa * 1.5, tb + 1.5, h1), V(ta + sa * 1.5, tb, h1 + 1.7), st, [F[0] * sa, 0, F[1] * sa]);
  }

  // ---- the grotto of Our Lady at the rear left: a rough stone mound with a niche and the white statue
  { const q = W(80, -21), gy = gY(...q);
    S.base = gy - LAND_Y;
    S.kind = KIND.MASONRY;
    S.cyl(q[0], q[1], gy - 0.3, gy + 3.6, 3.4, 1.4, 7, hex('#7d7a70'), { rot: 0.3 });
    S.cyl(q[0] + 1.2, q[1] - 0.6, gy - 0.3, gy + 2.2, 2.4, 0.8, 6, hex('#8a867a'), { rot: 1.1 });
    S.kind = KIND.PLAIN;
    const n = W(78.5, -21);
    S.cyl(n[0], n[1], gy + 0.9, gy + 2.5, 0.32, 0.22, 6, white);
    S.cyl(n[0], n[1], gy + 2.5, gy + 2.8, 0.16, 0.14, 5, white);
    S.base = y - LAND_Y; }

  // ---- the grounds: rendered wall with railings round the triangle, open at the gates
  const c = W(40, 0), roads = roadsNear(data, c, 220), blds = buildingsNear(data, c, 220);
  fence(S, PRECINCT, FENCE.church, { roads, openings: [GATE_MAIN, GATE_SIDE, GATE_NH], solid: blds });
  for (const [gx, gz, hw] of [GATE_MAIN, GATE_SIDE, GATE_NH]) { // the iron leaves in each gate, across the fence line
    let best = null, bd = 1e9;
    for (let i = 0; i < PRECINCT.length; i++) {
      const a = PRECINCT[i], b = PRECINCT[(i + 1) % PRECINCT.length], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz;
      const t = Math.max(0, Math.min(1, ((gx - a[0]) * dx + (gz - a[1]) * dz) / L2)), d = Math.hypot(a[0] + dx * t - gx, a[1] + dz * t - gz);
      if (d < bd) { bd = d; best = [dx, dz, Math.sqrt(L2)]; }
    }
    const u = [best[0] / best[2], best[1] / best[2]];
    leaves(S, [gx - u[0] * hw, gz - u[1] * hw], [gx + u[0] * hw, gz + u[1] * hw], gY(gx, gz), 2.2, FENCE.church.iron);
  }
  S.kind = KIND.PLAIN;
  S.base = 0;

  // ---- no generated houses in the church grounds east of the monastery: the forecourt and the church
  if (Array.isArray(data.infill)) {
    const a = data.infill, R = 8, keep = [];
    let near = data.meta?.counts?.infillNear ?? a.length / R, nearKept = 0;
    for (let i = 0; i < a.length / R; i++) {
      const x = a[i * R] / 10, z = a[i * R + 1] / 10;
      if (x > 648 && inRing(x, z, PRECINCT)) continue;
      if (i < near) nearKept++;
      for (let j = 0; j < R; j++) keep.push(a[i * R + j]);
    }
    if (keep.length !== a.length) {
      a.length = 0;
      for (const v of keep) a.push(v);
      if (data.meta?.counts && data.meta.counts.infillNear != null) data.meta.counts.infillNear = nearKept;
    }
  }

  // ---- after dark: the cross and the spire's arrises lit white, the round window and the door glowing, lamps
  const L = new Buf(256);
  L.beam([tc[0], crossY - 0.05, tc[1]], [tc[0], yg + 53.1, tc[1]], 0.36, 0.36, [1, 1, 1]);
  L.beam(V(TA, -0.95, crossY + 2.0), V(TA, 0.95, crossY + 2.0), 0.34, 0.34, [1, 1, 1]);
  for (let i = 0; i < 4; i++) {
    const t = ANG + Math.PI / 8 + (i * Math.PI) / 2, r0 = 2.45;
    L.beam([tc[0] + Math.cos(t) * r0, spire0, tc[1] + Math.sin(t) * r0], [tc[0] + Math.cos(t) * 0.2, crossY, tc[1] + Math.sin(t) * 0.2], 0.12, 0.12, [1, 1, 1]);
  }
  const cross = lightMesh(L, lightMaterial(0xf4f1ff, 1.4));
  const L2 = new Buf(128);
  { for (const b of [-3.35, 0, 3.35]) { const k = W(-0.18, b); L2.box(k[0], k[1], y + 0.1, y + 3.6, 0.12, 1.7, ANG, [1, 1, 1]); }
    const k = W(-0.2, 0); L2.box(k[0], k[1], y + W0 + 0.1, y + W1, 0.12, WW - 0.3, ANG, [1, 1, 1]); }
  const warm = lightMesh(L2, lightMaterial(0xffc982, 1.1));
  const pos = [], col = [];
  const put = (q, h, cc2 = [1, 0.85, 0.6]) => { pos.push(q[0], h, q[1]); col.push(...cc2); };
  for (const s of [-1, 1]) { put(W(-2.8, s * 13), y + 0.4, [1, 0.92, 0.75]); put(W(-12, s * 15), yf + 3.2); }
  for (const [gx, gz, hw] of [GATE_MAIN, GATE_SIDE, GATE_NH]) put([gx, gz], gY(gx, gz) + 3.6);
  const pts = glowPoints(pos, col, 4);
  pts.userData.glow = true;
  for (const m of [cross, warm, pts]) { m.userData.landmark = id; group.add(m); }
}

// a night-light mesh from a Buf
function lightMesh(buf, mat) {
  const m = new THREE.Mesh(buf.geometry(), mat);
  m.renderOrder = 19;
  return m;
}
