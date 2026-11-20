import { KIND, Buf, hex, shade, obb, unflat } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { glowPoints, lightMaterial } from '../../geo/materials.js';
import * as THREE from 'three';

// Đan viện Thiên An, the Benedictine abbey on đồi Thiên An (founded 1940 from La Pierre-qui-Vire). See docs/places/thienan.md.
//
// The plan is the OSM outline (way 493381029) read in a frame turned 152° from east: u runs along the church from its
// east-north-east front (u -44.5) to its apse (u 14.8), v across it, positive to the north-north-west. In that frame
// the outline is a grid of straight wings: the church on the north (a nave 20.8 m wide, a wider choir 25.7 m, a
// three-sided apse and a north arm), and south of it the monastery: an east wing, a middle wing and the long south
// range round a narrow cloister garth, the garden court west of the middle wing, a west wing running south to an end
// block. Sources give: the 1965 church half sunk into the hill (nhà thờ hầm), the chapel, guest/retreat house and the
// bell tower built over it in 1994-98, the tower "seven storeys" with the look of tháp Phước Duyên at Thiên Mụ, standing
// to the right of the chapel (OSM node 14351300803, 13 m north of the nave); red-tiled roofs, stone walls,
// stained glass; a stone stair with lamp posts up the hill (OSM steps 1580312663). Storey counts of the wings, the
// heights, the porch and the grotto's place are estimates.

export const id = 'thienan';

const A = (151.98 * Math.PI) / 180; // the u axis, front → apse
const U = [Math.cos(A), Math.sin(A)], V = [-U[1], U[0]];
const O = [-714, 6440];
const W = (u, v) => [O[0] + U[0] * u + V[0] * v, O[1] + U[1] * u + V[1] * v];
const gY = (x, z) => LAND_Y + rise(x, z);

const cream = hex('#e4d9c0'), cream2 = hex('#d8ccb1'), base = hex('#a39a86'), tile = hex('#8e4733'), tileD = hex('#7b3c2b');
const ridge = hex('#ddd2ba'), dark = hex('#2f2824'), glass = hex('#3e4f73'), white = hex('#f1ece0'), pave = hex('#c6bca7');
const lawn = hex('#86a05e'), rock = hex('#77706a'), pier = hex('#efe7d6');

// highest ground under a u/v rectangle
function hiG(u0, u1, v0, v1) {
  let hi = -1e9, lo = 1e9;
  for (let i = 0; i <= 8; i++) for (let j = 0; j <= 8; j++) { const q = W(u0 + ((u1 - u0) * i) / 8, v0 + ((v1 - v0) * j) / 8), g = gY(q[0], q[1]); hi = Math.max(hi, g); lo = Math.min(lo, g); }
  return [lo, hi];
}

export function build({ data, S, group }) {
  const rbox = (u0, u1, v0, v1, y0, y1, col, o) => { const q = W((u0 + u1) / 2, (v0 + v1) / 2); S.box(q[0], q[1], y0, y1, u1 - u0, v1 - v0, A, col, o); };
  // a hip roof over a u/v rectangle, its ridge along the longer side
  const roof = (u0, u1, v0, v1, y, h, col, o = {}) => {
    const q = W((u0 + u1) / 2, (v0 + v1) / 2), du = u1 - u0, dv = v1 - v0;
    const opt = { over: 0.9, flare: 0.35, fascia: 0.25, fasciaCol: ridge, ridgeCol: ridge, ...o };
    if (du >= dv) S.hip(q[0], q[1], du, dv, A, y, h, col, opt);
    else S.hip(q[0], q[1], dv, du, A + Math.PI / 2, y, h, col, opt);
  };
  // windows on the long faces of a block: per storey, a row of dark openings
  const windows = (u0, u1, v0, v1, y, storeys, sh, { faces = 'all', col = dark, w = 1.1, hh = 1.5, step = 3.2, from = 0 } = {}) => {
    S.kind = KIND.PLAIN;
    const sides = [];
    if (faces === 'all' || faces.includes('n')) sides.push(['v', v1, 1]);
    if (faces === 'all' || faces.includes('s')) sides.push(['v', v0, -1]);
    if (faces === 'all' || faces.includes('e')) sides.push(['u', u0, -1]);
    if (faces === 'all' || faces.includes('w')) sides.push(['u', u1, 1]);
    for (const [ax, at, sg] of sides) {
      const a0 = ax === 'v' ? u0 : v0, a1 = ax === 'v' ? u1 : v1, n = Math.max(1, Math.floor((a1 - a0 - 1) / step));
      for (let f = from; f < storeys; f++) for (let i = 0; i < n; i++) {
        const t = a0 + ((i + 0.5) * (a1 - a0)) / n, yb = y + f * sh + (sh - hh) * 0.55;
        if (ax === 'v') rbox(t - w / 2, t + w / 2, at + sg * 0.02 - 0.06, at + sg * 0.02 + 0.06, yb, yb + hh, col);
        else rbox(at + sg * 0.02 - 0.06, at + sg * 0.02 + 0.06, t - w / 2, t + w / 2, yb, yb + hh, col);
      }
    }
  };
  // a shaded arcade along one face of a ground floor: the dark walk behind, white piers in front
  const arcade = (ax, at, a0, a1, y, h, sg) => {
    S.kind = KIND.PLAIN;
    const n = Math.max(2, Math.round((a1 - a0) / 3));
    if (ax === 'v') rbox(a0 + 0.4, a1 - 0.4, at + sg * 0.03 - 0.06, at + sg * 0.03 + 0.06, y, y + h, hex('#4a3f38'));
    else rbox(at + sg * 0.03 - 0.06, at + sg * 0.03 + 0.06, a0 + 0.4, a1 - 0.4, y, y + h, hex('#4a3f38'));
    for (let i = 0; i <= n; i++) {
      const t = a0 + 0.4 + ((a1 - a0 - 0.8) * i) / n;
      if (ax === 'v') rbox(t - 0.25, t + 0.25, at + sg * 0.25 - 0.25, at + sg * 0.25 + 0.25, y, y + h + 0.3, pier);
      else rbox(at + sg * 0.25 - 0.25, at + sg * 0.25 + 0.25, t - 0.25, t + 0.25, y, y + h + 0.3, pier);
    }
    if (ax === 'v') rbox(a0, a1, at + sg * 0.3 - 0.3, at + sg * 0.3 + 0.3, y + h + 0.3, y + h + 0.7, pier);
    else rbox(at + sg * 0.3 - 0.3, at + sg * 0.3 + 0.3, a0, a1, y + h + 0.3, y + h + 0.7, pier);
  };
  // a monastery range: a stone base down to the lowest ground, cream walls, a tiled hip roof
  const range = (u0, u1, v0, v1, storeys, y, o = {}) => {
    const [lo] = hiG(u0, u1, v0, v1), sh = 3.5, top = y + storeys * sh + 0.4;
    S.base = y - LAND_Y;
    S.kind = KIND.MASONRY;
    rbox(u0 - 0.3, u1 + 0.3, v0 - 0.3, v1 + 0.3, lo - 0.6, y, base, { topKind: KIND.ROAD });
    rbox(u0, u1, v0, v1, y, top, o.wall || cream, { top: shade(tile, 0.8) });
    S.kind = KIND.PLAIN;
    for (let f = 1; f < storeys; f++) rbox(u0 - 0.08, u1 + 0.08, v0 - 0.08, v1 + 0.08, y + f * sh - 0.1, y + f * sh + 0.15, cream2);
    windows(u0, u1, v0, v1, y, storeys, sh, { faces: o.faces || 'all', from: o.from || 0 });
    roof(u0, u1, v0, v1, top, Math.min(4.2, Math.min(u1 - u0, v1 - v0) * 0.36), o.roof || tile);
    S.kind = KIND.PLAIN;
    return top;
  };

  // ================================================================ the church (over the 1965 crypt church)
  const yC = Math.max(hiG(-44.5, -18, 26, 46.8)[1], hiG(-18, 14.8, 24.2, 49.9)[1]) + 0.25;
  {
    const [lo] = hiG(-44.5, 14.8, 24.2, 62);
    S.base = yC - LAND_Y;
    S.kind = KIND.MASONRY;
    // the stone base, tall at the apse end where the hill falls away: the half-sunk crypt church inside it
    rbox(-44.8, -18, 25.7, 47.1, lo - 0.6, yC, base, { topKind: KIND.ROAD });
    rbox(-18.3, 7.9, 23.9, 50.2, lo - 0.6, yC, base, { topKind: KIND.ROAD });
    rbox(-18.2, -1.1, 49.9, 62.3, lo - 0.6, yC, base, { topKind: KIND.ROAD });
    const apse = [[7.6, 24.2], [14.8, 32.1], [14.7, 42.5], [7.6, 49.9]];
    S.prism([[7.4, 23.9], [15.1, 32], [15, 42.6], [7.4, 50.2]].map(([u, v]) => W(u, v)), lo - 0.6, yC, base, base);
    // the crypt church's windows in the base, where it stands clear of the ground
    S.kind = KIND.PLAIN;
    for (const sd of [-1, 1]) for (let u = -15; u <= 5; u += 4) {
      const v = sd > 0 ? 50.25 : 23.85, q = W(u, v), g = gY(q[0], q[1]);
      if (yC - g > 2.6) rbox(u - 0.6, u + 0.6, v - 0.07, v + 0.07, yC - 2.2, yC - 0.6, dark);
    }
    S.kind = KIND.MASONRY;
    // aisles and choir walls
    const yA = yC + 6.5;
    rbox(-44.5, -18, 26, 46.8, yC, yA, cream, { top: shade(tile, 0.8) });
    rbox(-18, 7.6, 24.2, 49.9, yC, yA + 0.6, cream, { top: shade(tile, 0.8) });
    S.prism(apse.map(([u, v]) => W(u, v)), yC, yA + 0.6, cream, shade(tile, 0.8));
    rbox(-17.9, -1.4, 49.9, 62, yC, yC + 5.6, cream, { top: shade(tile, 0.8) });
    // the clerestory over the nave and choir
    const yK = yC + 10.6;
    rbox(-44.5, 8.2, 30.4, 42.4, yA, yK, cream2, { top: shade(tile, 0.8) });
    S.kind = KIND.PLAIN;
    // lower roofs skirting the nave and choir, the north arm's own roof, the apse's half-cone
    roof(-44.5, -18, 26, 46.8, yA, 1.6, tileD, { over: 1.0, ridgeCol: null, flare: 0.3 });
    roof(-18, 7.6, 24.2, 49.9, yA + 0.6, 1.6, tileD, { over: 1.0, ridgeCol: null, flare: 0.3 });
    roof(-17.9, -1.4, 49.9, 62, yC + 5.6, 3.0, tile);
    S.kind = KIND.TILE;
    S.prism(apse.map(([u, v]) => W(u + 0.4 * (u > 8 ? 1 : 0), v)), yA + 0.6, yK - 0.4, tileD, tileD, { scaleTop: 0.35, centre: W(7.6, 37.05) });
    S.kind = KIND.PLAIN;
    // the high roof, Vietnamese double-roof fashion: steep, upturned at the corners, a pale ridge
    roof(-44.5, 8.2, 30.4, 42.4, yK, 5.2, tile, { over: 1.1, flare: 0.55, hips: true });
    // lancet windows of coloured glass in the aisle and choir walls, small ones in the clerestory
    for (const v of [26, 46.8]) for (let u = -41.5; u <= -20; u += 3.8) rbox(u - 0.45, u + 0.45, v - 0.08, v + 0.08, yC + 1.4, yC + 5.4, glass);
    for (const v of [24.2, 49.9]) for (let u = -14; u <= 4; u += 4.5) if (v < 40 || u > -1) rbox(u - 0.5, u + 0.5, v - 0.08, v + 0.08, yC + 1.4, yC + 5.8, glass);
    for (const v of [30.4, 42.4]) for (let u = -42; u <= 6; u += 3.2) rbox(u - 0.5, u + 0.5, v - 0.08, v + 0.08, yA + 1.2, yK - 1.0, glass);
    for (let k = 0; k < 3; k++) { // one window on each face of the apse
      const a = apse[k], b = apse[k + 1], q = W((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      S.box(q[0], q[1], yC + 1.4, yC + 5.4, 0.9, 0.2, A + Math.atan2(b[1] - a[1], b[0] - a[0]), glass);
    }
    for (let v = 52.5; v <= 59.5; v += 3.5) rbox(-17.98, -17.82, v - 0.5, v + 0.5, yC + 1.4, yC + 4.2, glass);
    // the front: a rose window in the gable wall, the doors, a tiled porch on four white columns
    rbox(-44.62, -44.48, 34.9, 37.9, yA + 0.8, yK - 0.9, glass);
    rbox(-44.62, -44.48, 34.4, 38.4, yC, yC + 4.0, dark);
    for (const v of [29, 43.8]) rbox(-44.62, -44.48, v - 0.8, v + 0.8, yC, yC + 3.0, dark);
    for (const v of [32.2, 34.9, 37.9, 40.6]) { const q = W(-47.6, v); S.kind = KIND.PLAIN; S.cyl(q[0], q[1], yC, yC + 4.3, 0.28, 0.26, 8, white); }
    rbox(-48.3, -44.5, 31.4, 41.4, yC + 4.3, yC + 4.7, ridge);
    roof(-48.3, -44.5, 31.4, 41.4, yC + 4.7, 1.6, tile, { over: 0.6, flare: 0.4 });
    // the cross over the front, on the high ridge's end
    { const q = W(-38.5, 36.4), yt = yK + 5.2; S.beam([q[0], yt - 0.2, q[1]], [q[0], yt + 2.4, q[1]], 0.22, 0.22, white); const p = V; S.beam([q[0] - p[0] * 0.7, yt + 1.7, q[1] - p[1] * 0.7], [q[0] + p[0] * 0.7, yt + 1.7, q[1] + p[1] * 0.7], 0.2, 0.2, white); }
  }

  // ================================================================ the forecourt and the stair up to the porch
  const paved0 = S.n;
  const yF = hiG(-62, -55, 26, 47)[1] + 0.2;
  {
    const [lo] = hiG(-62, -48.3, 26, 47);
    S.base = yF - LAND_Y;
    S.kind = KIND.MASONRY;
    rbox(-62, -55, 26, 47, lo - 0.6, yF, base, { top: pave, topKind: KIND.ROAD });
    // the steps from the forecourt up to the porch (OSM way 1580312660), stone cheek walls either side
    const n = Math.max(3, Math.round((yC - yF) / 0.17)), run = (55 - 48.3) / n;
    S.kind = KIND.ROAD;
    for (let i = 0; i < n; i++) { const u = -55 + run * i; rbox(u, u + run + 0.02, 32.4, 40.4, lo - 0.6, yF + ((yC - yF) * (i + 1)) / n, pave); }
    rbox(-48.3, -44.5, 30.9, 41.9, lo - 0.6, yC, pave);
    S.kind = KIND.MASONRY;
    for (const v of [31.9, 40.9]) rbox(-55.2, -48.3, v - 0.5, v + 0.5, lo - 0.6, yC + 0.6, base);
  }
  // ================================================================ the bell tower (OSM node 14351300803)
  // octagonal, seven storeys narrowing upward, each under a tiled skirt roof, an eight-sided cap and the cross:
  // the outline of tháp Phước Duyên, in the monastery's cream and red tile
  let towerTop;
  {
    const tc = [-708.0, 6369.2], g0 = gY(tc[0], tc[1]), rot = A + Math.PI / 8;
    let lo = 1e9; for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; lo = Math.min(lo, gY(tc[0] + Math.cos(a) * 5, tc[1] + Math.sin(a) * 5)); }
    const yT = Math.max(g0, lo) + 0.5;
    S.base = yT - LAND_Y;
    S.kind = KIND.MASONRY;
    S.cyl(tc[0], tc[1], lo - 0.6, yT, 5.0, 5.0, 8, base, { rot });
    S.cyl(tc[0], tc[1], yT, yT + 0.8, 3.9, 3.9, 8, base, { rot });
    let y = yT + 0.8;
    const hs = [3.6, 2.9, 2.7, 2.6, 2.5, 2.4, 2.3];
    hs.forEach((h, i) => {
      const r = 3.1 - i * 0.2;
      S.kind = KIND.MASONRY;
      S.cyl(tc[0], tc[1], y, y + h, r, r, 8, i % 2 ? cream : shade(cream, 0.97), { rot });
      S.kind = KIND.PLAIN;
      // arched openings on the four cardinal faces of the octagon (all eight in the top, belfry storey)
      const faces = i === hs.length - 1 ? 8 : 4, ow = i === 0 ? 1.4 : 0.8;
      for (let k = 0; k < faces; k++) {
        const a = A + (k * Math.PI * 2) / faces + (faces === 4 ? 0 : 0), rr = r * Math.cos(Math.PI / 8) + 0.03;
        const x = tc[0] + Math.cos(a) * rr, z = tc[1] + Math.sin(a) * rr;
        S.box(x, z, y + (i === 0 ? 0 : 0.5), y + h - 0.75, 0.12, ow, a, dark);
      }
      // the skirt roof: a flared tiled ring, with a pale fascia
      const yr = y + h;
      S.cyl(tc[0], tc[1], yr - 0.15, yr, r + 0.95, r + 0.95, 8, ridge, { rot, cap: false });
      S.kind = KIND.TILE;
      S.cyl(tc[0], tc[1], yr, yr + 0.75, r + 0.95, r - 0.05, 8, tile, { rot });
      S.kind = KIND.PLAIN;
      y = yr + 0.3;
    });
    S.kind = KIND.TILE;
    S.cyl(tc[0], tc[1], y, y + 2.6, 1.9, 0.12, 8, tile, { rot });
    S.kind = KIND.PLAIN;
    S.cyl(tc[0], tc[1], y + 2.4, y + 2.9, 0.35, 0.35, 6, ridge);
    towerTop = [tc, y + 2.9];
    S.beam([tc[0], y + 2.9, tc[1]], [tc[0], y + 5.0, tc[1]], 0.2, 0.2, white);
    S.beam([tc[0] - V[0] * 0.6, y + 4.3, tc[1] - V[1] * 0.6], [tc[0] + V[0] * 0.6, y + 4.3, tc[1] + V[1] * 0.6], 0.18, 0.18, white);
    // a paved path from the tower's terrace to the forecourt
    S.kind = KIND.MASONRY;
  }

  // ================================================================ the monastery ranges round the courts
  const lev = (u0, u1, v0, v1) => hiG(u0, u1, v0, v1)[1] + 0.25;
  const yE = lev(-42.2, -28.9, -14, 20.5), yM = lev(-18.4, -2.9, -14, 24.2), yS = lev(-42.2, 35.8, -24.4, -14);
  const yB = lev(-21.7, 8.3, -31.6, -24.4), yWw = lev(35.8, 48.2, -68.3, -14);
  // the three-storey east wing (the 1943 house of 28 cells, estimated), the middle wing and the long south range
  range(-42.2, -28.9, -14, 20.5, 3, yE);
  range(-18.4, -2.9, -14, 24.2, 2, yM);
  range(-42.2, 35.8, -24.4, -14, 2, yS);
  range(-21.7, 8.3, -31.6, -24.4, 2, yB, { faces: 'sew' });
  range(35.8, 48.2, -55.9, -14.2, 2, yWw);
  range(35.5, 60.3, -68.3, -55.9, 2, yWw);
  // cloister walks: arcades on the ground floors facing the garth and the garden court
  arcade('u', -28.9, -13.6, 20.5, yE, 2.6, 1);
  arcade('u', -18.4, -13.6, 23.8, yM, 2.6, -1);
  arcade('u', -2.9, -13.6, 23.8, yM, 2.6, 1);
  arcade('v', -14, -2.5, 35.4, yS, 2.6, 1);
  arcade('u', 35.8, -55.5, -14.6, yWw, 2.6, -1);
  // the narrow cloister garth: a lawn on its own level with a cross of paths and a well-head at the crossing
  {
    const yG = lev(-28.9, -18.4, -14, 24.2) - 0.1, [lo] = hiG(-28.9, -18.4, -14, 26);
    S.base = yG - LAND_Y;
    S.kind = KIND.MASONRY;
    rbox(-28.9, -18.4, -14, 26, lo - 0.6, yG, base, { top: lawn, topKind: KIND.GROUND });
    S.kind = KIND.ROAD;
    rbox(-28.9, -18.4, 5.0, 6.6, yG, yG + 0.06, pave);
    rbox(-24.4, -22.9, -14, 26, yG, yG + 0.06, pave);
    S.kind = KIND.MASONRY;
    const q = W(-23.65, 5.8); S.cyl(q[0], q[1], yG, yG + 0.9, 0.9, 0.9, 8, white);
    S.kind = KIND.PLAIN;
    // the passage between the church and the east wing, into the garth (OSM footway 1580312664)
    rbox(-44.5, -28.9, 20.5, 26, lo - 0.6, Math.min(yE, yC) - 0.05, pave, { topKind: KIND.ROAD });
  }
  // the garden court, open to the west-south-west: three lawn terraces stepping down the slope, gravel walks,
  // a white statue on the middle one (planted with trees and flowers, sources say; the terraces are estimated)
  {
    const steps = [[-2.9, 10], [10, 23], [23, 35.8]];
    let yPrev = null;
    for (const [u0, u1] of steps) {
      const [lo, hi] = hiG(u0, u1, -14, 24.2), y = Math.min(yPrev ?? 1e9, hi + 0.15);
      S.base = y - LAND_Y;
      S.kind = KIND.MASONRY;
      rbox(u0, u1, -14, 24.2, lo - 0.6, y, base, { top: lawn, topKind: KIND.GROUND });
      S.kind = KIND.ROAD;
      rbox(u0, u1, 4.2, 6.2, y, y + 0.06, pave);
      S.kind = KIND.PLAIN;
      for (const v of [-9, 18.5]) for (const uu of [u0 + 3, u1 - 3]) { const q = W(uu, v); S.cyl(q[0], q[1], y, y + 0.5, 1.3, 1.3, 8, hex('#7b5a3e')); S.cyl(q[0], q[1], y + 0.5, y + 0.9, 1.2, 1.0, 8, hex('#c26a6f')); }
      if (u0 === 10) { const q = W(16.5, 5.2); S.kind = KIND.MASONRY; S.cyl(q[0], q[1], y, y + 1.4, 0.8, 0.7, 8, base); S.kind = KIND.PLAIN; S.cyl(q[0], q[1], y + 1.4, y + 3.1, 0.38, 0.3, 8, white); S.cyl(q[0], q[1], y + 3.1, y + 3.5, 0.24, 0.12, 6, white); }
      yPrev = y - 0.9;
    }
  }
  (S.paved = S.paved || []).push([paved0, S.n]);

  // ================================================================ the stone stair up the hill, with its lamp posts
  // OSM steps 1580312663 from (-641.2, 6332.1) up to (-659.0, 6363.0), the footway on to the forecourt
  const lamps = [];
  {
    const p0 = [-641.2, 6332.1], p1 = [-659.0, 6363.0], d = [p1[0] - p0[0], p1[1] - p0[1]], L = Math.hypot(d[0], d[1]);
    const f = [d[0] / L, d[1] / L], ang = Math.atan2(f[1], f[0]), side = [-f[1], f[0]];
    const s0 = S.n;
    const n = Math.round(L / 0.42);
    let yPrev = -1e9;
    S.kind = KIND.ROAD;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, x = p0[0] + d[0] * t, z = p0[1] + d[1] * t, g = gY(x, z);
      const y = Math.max(yPrev, Math.round((g + 0.12) / 0.17) * 0.17);
      S.box(x, z, g - 1.0, y, L / n + 0.03, 3.2, ang, pave);
      yPrev = y;
      if (i % 14 === 7) for (const sd of [-1, 1]) lamps.push([x + side[0] * sd * 2.1, z + side[1] * sd * 2.1, y]);
    }
    // cheek walls along the flight
    S.kind = KIND.MASONRY;
    for (const sd of [-1, 1]) for (let i = 0; i < n; i += 6) {
      const t = (i + 3) / n, x = p0[0] + d[0] * t + side[0] * sd * 1.75, z = p0[1] + d[1] * t + side[1] * sd * 1.75, g = gY(x, z);
      S.box(x, z, g - 0.8, g + 0.45, (6 * L) / n + 0.05, 0.3, ang, base);
    }
    S.kind = KIND.PLAIN;
    for (const [x, z, y] of lamps) {
      S.cyl(x, z, y, y + 2.6, 0.08, 0.06, 6, hex('#3b3a38'));
      S.box(x, z, y + 2.6, y + 3.1, 0.34, 0.34, ang, hex('#efe2c4'));
      S.box(x, z, y + 3.1, y + 3.25, 0.5, 0.5, ang, hex('#3b3a38'));
    }
    (S.paved = S.paved || []).push([s0, S.n]);
  }

  // ================================================================ the grotto of Our Lady (place and size estimated)
  // a mound of dark rock beside the path below the forecourt, a niche, the white statue with its blue sash
  {
    const gc = [-671.5, 6359.0], g = gY(gc[0], gc[1]), toPath = Math.atan2(6371.0 - gc[1], -671.0 - gc[0]);
    const g0 = S.n;
    S.base = g - LAND_Y;
    S.kind = KIND.MASONRY;
    const bl = [[0, 0, 3.4, 3.0, 4.2], [-1.6, -1.4, 2.0, 1.8, 2.8], [1.7, -1.3, 2.1, 1.7, 3.1], [-2.8, 0.6, 1.4, 1.6, 1.8], [2.9, 0.4, 1.5, 1.5, 2.0], [0.2, -2.2, 1.6, 2.0, 3.4]];
    const fx = Math.cos(toPath), fz = Math.sin(toPath);
    for (const [a, b, sx, sz, h] of bl) {
      const x = gc[0] - fz * a - fx * b, z = gc[1] + fx * a - fz * b;
      S.box(x, z, g - 0.6, g + h, sx, sz, toPath + a * 0.3, shade(rock, 0.9 + 0.05 * (b + 2) / 2), { taper: 0.6 });
    }
    S.kind = KIND.PLAIN;
    const nx = gc[0] + fx * 1.55, nz = gc[1] + fz * 1.55;
    S.box(nx, nz, g + 0.6, g + 3.0, 0.15, 1.5, toPath, hex('#2a2522'));
    const sx = gc[0] + fx * 1.75, sz = gc[1] + fz * 1.75;
    S.cyl(sx, sz, g + 1.0, g + 2.2, 0.28, 0.2, 8, white);
    S.cyl(sx, sz, g + 1.55, g + 1.7, 0.27, 0.25, 8, hex('#6f93c8'));
    S.cyl(sx, sz, g + 2.2, g + 2.45, 0.13, 0.09, 6, white);
    // a kneeler's paving in front
    S.kind = KIND.ROAD;
    S.box(gc[0] + fx * 3.6, gc[1] + fz * 3.6, g - 0.4, g + 0.12, 3.2, 4.0, toPath, pave);
    (S.paved = S.paved || []).push([g0, S.n]);
  }

  // ================================================================ the three mapped outbuildings east of the cloister
  const site = data.sites && data.sites[id];
  for (const it of (site && site.items) || []) {
    if (it.k !== 'b' || !it.ring || it.ring.length < 6 || String(it.n || '').length) continue; // the main outline is drawn above
    const o = obb(unflat(it.ring));
    if (o.w < 1) continue;
    const ux = Math.cos(o.a), uz = Math.sin(o.a);
    const cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([s, t]) => [o.c[0] + ux * s * o.w / 2 - uz * t * o.d / 2, o.c[1] + uz * s * o.w / 2 + ux * t * o.d / 2]);
    const gs = cs.map((p) => gY(p[0], p[1])), y = Math.max(...gs) + 0.2, lo = Math.min(...gs) - 0.5;
    S.base = y - LAND_Y;
    S.kind = KIND.MASONRY;
    S.box(o.c[0], o.c[1], lo, y + 3.4, o.w, o.d, o.a, cream2, { top: shade(tile, 0.8) });
    S.kind = KIND.PLAIN;
    const n = Math.max(1, Math.floor(o.w / 3.2));
    for (const s of [-1, 1]) for (let i = 0; i < n; i++) {
      const u = (i + 0.5 - n / 2) * (o.w / n);
      S.box(o.c[0] + ux * u - uz * s * (o.d / 2 + 0.04), o.c[1] + uz * u + ux * s * (o.d / 2 + 0.04), y + 0.9, y + 2.4, 1.0, 0.1, o.a, dark);
    }
    S.hip(o.c[0], o.c[1], o.w, o.d, o.a, y + 3.4, Math.min(2.4, o.d * 0.34), tile, { over: 0.6, flare: 0.25, fascia: 0.2, fasciaCol: ridge });
  }
  S.kind = KIND.PLAIN; S.base = 0;

  // ================================================================ night: the tower's cross, the stair lamps, lit windows
  const Lb = new Buf(64);
  {
    const [tc, top] = towerTop;
    Lb.beam([tc[0], top - 0.05, tc[1]], [tc[0], top + 2.15, tc[1]], 0.3, 0.3, [1, 1, 1]);
    Lb.beam([tc[0] - V[0] * 0.65, top + 1.4, tc[1] - V[1] * 0.65], [tc[0] + V[0] * 0.65, top + 1.4, tc[1] + V[1] * 0.65], 0.28, 0.28, [1, 1, 1]);
  }
  const cross = new THREE.Mesh(Lb.geometry(), lightMaterial(0xf4f1ff, 1.4));
  cross.renderOrder = 19;
  const pos = [], col = [];
  for (const [x, z, y] of lamps) { pos.push(x, y + 2.85, z); col.push(1, 0.82, 0.52); }
  for (const v of [31.9, 40.9]) { const q = W(-55.2, v); pos.push(q[0], yF + 1.4, q[1]); col.push(1, 0.82, 0.52); }
  { const q = W(-46.5, 36.4); pos.push(q[0], yC + 4.0, q[1]); col.push(1, 0.85, 0.6); }
  for (const v of [26, 46.8]) for (let u = -38; u <= -22; u += 7.6) { const q = W(u, v + (v > 30 ? 0.3 : -0.3)); pos.push(q[0], yC + 3.4, q[1]); col.push(0.7, 0.75, 1); }
  const pts = glowPoints(pos, col, 4);
  pts.userData.glow = true;
  for (const m of [cross, pts]) { m.userData.landmark = id; group.add(m); }
}
