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
  // a broad tree standing at height y: a trunk and a crown of three or four overlapping, uneven masses
  const shadeTree = (c, y, r, h, seed) => {
    const rnd = (k) => { const t = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453; return t - Math.floor(t); };
    S.kind = KIND.PLAIN;
    S.cyl(c[0], c[1], y, y + h * 0.5, 0.3, 0.2, 6, hex('#5a4634'));
    const greens = ['#3f5a2c', '#4a6631', '#365026', '#55703a'];
    const n = 3 + Math.floor(rnd(1) * 2);
    for (let k = 0; k < n; k++) {
      const a = rnd(k + 2) * Math.PI * 2, d = k ? r * (0.35 + rnd(k + 7) * 0.35) : 0, rr = r * (k ? 0.55 + rnd(k + 11) * 0.3 : 0.8);
      const x = c[0] + Math.cos(a) * d, z = c[1] + Math.sin(a) * d, yb = y + h * (0.42 + rnd(k + 5) * 0.2), ht = rr * (1.1 + rnd(k + 3) * 0.5);
      const g = hex(greens[Math.floor(rnd(k + 13) * 4)]);
      S.cyl(x, z, yb, yb + ht * 0.45, rr * 0.7, rr, 7, g, { rot: rnd(k + 17) * 2 });
      S.cyl(x, z, yb + ht * 0.45, yb + ht, rr, rr * 0.25, 7, g, { rot: rnd(k + 17) * 2 });
    }
  };
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
    S.kind = KIND.PLAIN; // rendered and limewashed walls, not the chapel's stone
    rbox(u0, u1, v0, v1, y, top, o.wall || cream, { top: shade(tile, 0.8) });
    for (let f = 1; f < storeys; f++) rbox(u0 - 0.08, u1 + 0.08, v0 - 0.08, v1 + 0.08, y + f * sh - 0.1, y + f * sh + 0.15, cream2);
    windows(u0, u1, v0, v1, y, storeys, sh, { faces: o.faces || 'all', from: o.from || 0 });
    roof(u0, u1, v0, v1, top, Math.min(4.2, Math.min(u1 - u0, v1 - v0) * 0.36), o.roof || tile);
    S.kind = KIND.PLAIN;
    return top;
  };

  // ================================================================ the chapel, the long range and the crypt church's terrace
  // Read from the satellite (the OSM outline gives the plan, not the roofs): the 1994-98 chapel is a nave roofed along
  // u, its ridge at v 41, 4 m north of the outline's middle, with a lower flat-roofed aisle and an outer tiled lean-to
  // on its south side; its west end butts into the long range (u -17.6..-5), which carries one gabled roof along v
  // from the middle wing to the north end; beyond the range, on the chapel's axis, the 1965 crypt church stands out
  // of the slope as a three-sided apse whose roof is a paved terrace inside a tiled skirt. The front (Street View,
  // user photosphere) is grey stone: a portico of four white pillars, a yellow-glazed eave across the full width, an
  // upper storey with the statue of Christ in a niche, the central gable with its rose window and cross, and a small
  // pavilion with a hipped cap and a cross at each end.
  const NV = 40.8; // the chapel's axis
  const yC = Math.max(hiG(-48.8, -17.6, 25.5, 50.4)[1], hiG(-17.6, 7.6, 24.2, 49.9)[1], hiG(-17.6, -5, 15.5, 63.5)[1]) + 0.25;
  const stone = hex('#a3a6a6'), stone2 = hex('#b2b4b1'), glaze = hex('#c9a45a'), frame = hex('#8a3a2e'), panel = hex('#b67a70');
  // the forecourt's level (paved over the gentle slope before the front) and the chapel's floor, 1.5 m above it
  const yF = hiG(-62, -50, NV - 12, NV + 11)[1] - 0.3, yCh = yF + 1.5;
  const P3 = (u, v, y) => { const q = W(u, v); return [q[0], y, q[1]]; };
  const vn = (s) => [V[0] * s, 0, V[1] * s], un = (s) => [U[0] * s, 0, U[1] * s];
  // a flat disc in the plane of the front (facing out of it, -u), whole or the upper half
  const disc = (u, v, y, r, col, half = false) => {
    const n = half ? 8 : 16, c = P3(u, v, y);
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * (half ? Math.PI : Math.PI * 2), a1 = ((i + 1) / n) * (half ? Math.PI : Math.PI * 2);
      S.tri(c, P3(u, v + Math.cos(a0) * r, y + Math.sin(a0) * r), P3(u, v + Math.cos(a1) * r, y + Math.sin(a1) * r), col, un(-1));
    }
  };
  {
    const [lo] = hiG(-48.8, 14.8, 24.2, 50.4);
    S.base = yC - LAND_Y;
    S.kind = KIND.MASONRY;
    // the stone podium, tall at the apse end where the hill falls away: the half-sunk crypt church inside it
    rbox(-17.9, 7.9, 23.9, 50.2, lo - 0.6, yC, base, { topKind: KIND.ROAD });
    const apse = [[7.6, 24.2], [14.8, 32.1], [14.7, 42.5], [7.6, 49.9]];
    S.prism([[7.4, 23.9], [15.1, 32], [15, 42.6], [7.4, 50.2]].map(([u, v]) => W(u, v)), lo - 0.6, yC, base, base);
    // the crypt church's windows in the base, where it stands clear of the ground
    S.kind = KIND.PLAIN;
    for (const sd of [-1, 1]) for (let u = -3; u <= 5; u += 4) {
      const v = sd > 0 ? 50.25 : 23.85, q = W(u, v), g = gY(q[0], q[1]);
      if (yC - g > 2.6) rbox(u - 0.6, u + 0.6, v - 0.07, v + 0.07, yC - 2.2, yC - 0.6, dark);
    }
    for (let k = 0; k < 3; k++) {
      const a = apse[k], b = apse[k + 1], q = W((a[0] + b[0]) / 2 + 0.22, (a[1] + b[1]) / 2), g = gY(q[0], q[1]);
      if (yC - g > 2.6) S.box(q[0], q[1], yC - 2.4, yC - 0.4, 1.2, 0.16, A + Math.atan2(b[1] - a[1], b[0] - a[0]), dark);
    }
    // the terrace over the crypt church: a parapet storey, a tiled skirt round the outer edges, paving inside
    const yT = yC + 1.1;
    const oct = [[-5, 24.2], ...apse, [-5, 49.9]];
    S.kind = KIND.MASONRY;
    S.prism(oct.map(([u, v]) => W(u, v)), yC, yT, base, pave, { topKind: KIND.ROAD });
    S.kind = KIND.TILE;
    const cu = 3, cv = 37.05;
    for (let k = 0; k < oct.length - 1; k++) {
      const a = oct[k], b = oct[k + 1], out = (p, d) => { const du = p[0] - cu, dv = p[1] - cv, l = Math.hypot(du, dv); return [p[0] + (du / l) * d, p[1] + (dv / l) * d]; };
      const a0 = out(a, 0.7), b0 = out(b, 0.7), a1 = out(a, -1.3), b1 = out(b, -1.3);
      if (a[0] === -5 && b[0] === -5) continue;
      S.quad(P3(a0[0], a0[1], yT - 0.35), P3(b0[0], b0[1], yT - 0.35), P3(b1[0], b1[1], yT + 0.55), P3(a1[0], a1[1], yT + 0.55), tileD, [0, 1, 0]);
    }
    S.kind = KIND.PLAIN;
    for (const [u, v] of [[0, 30], [0, 44], [7, 34], [7, 40]]) { const q = W(u, v); S.cyl(q[0], q[1], yT, yT + 0.6, 0.55, 0.6, 8, base); S.cyl(q[0], q[1], yT + 0.6, yT + 1.3, 0.5, 0.2, 6, hex('#5f7f45')); }

    // the long range over the chapel's west end, on to the north end (the outline's north arm)
    range(-17.6, -5, 15.5, 63.5, 2, yC, { faces: 'nw' });
    // the strip between the range and the garden court
    S.kind = KIND.MASONRY;
    rbox(-5, -2.9, 15.5, 24.2, lo - 0.6, yC, base, { top: pave, topKind: KIND.ROAD });

    // the chapel stands on its own floor, 1.5 m over the level forecourt (the photos: a near-level paved court and a
    // broad low stair), not on the hilltop the range and the crypt terrace take their level from; its west end is cut
    // into the rising ground, so its walls go down to the lowest ground and no podium is drawn under it
    const [loC] = hiG(-49.1, -17.6, 25.2, 50.7);
    // the nave, in grey stone: one broad tiled roof, ridge on the axis (the satellite: v 32.6..49.2)
    const yN = yCh + 7.6;
    S.base = yCh - LAND_Y;
    S.kind = KIND.MASONRY;
    rbox(-46, -17.6, 32.6, 49.2, loC - 0.6, yN, stone, { top: shade(tile, 0.8) });
    // the inner south aisle under a flat grey roof, the outer one under a tiled lean-to, a low passage on the north
    rbox(-46, -17.6, 28.8, 32.6, loC - 0.6, yCh + 5.0, stone2, { top: hex('#a8a49b') });
    rbox(-46, -17.6, 25.5, 28.8, loC - 0.6, yCh + 3.4, stone2, { top: shade(tile, 0.8) });
    rbox(-46, -17.6, 49.2, 50.4, loC - 0.6, yCh + 3.0, stone2, { top: hex('#a8a49b') });
    S.kind = KIND.TILE;
    S.quad(P3(-46.5, 25.0, yCh + 3.25), P3(-17.6, 25.0, yCh + 3.25), P3(-17.6, 28.9, yCh + 4.6), P3(-46.5, 28.9, yCh + 4.6), tile, [0, 1, 0]);
    S.kind = KIND.PLAIN;
    for (const u of [-46, -17.6]) S.tri(P3(u, 25.5, yCh + 3.4), P3(u, 28.8, yCh + 3.4), P3(u, 28.8, yCh + 4.5), stone2, un(u < -30 ? 1 : -1));
    roof(-46, -17.6, 32.6, 49.2, yN, 4.6, tile, { over: 0.8, flare: 0.2 });
    // windows: high in the nave walls over the aisle roofs, low in the aisle walls where they stand clear of the ground
    for (let u = -42.5; u <= -21; u += 3.6) {
      rbox(u - 0.45, u + 0.45, 32.52, 32.68, yCh + 5.4, yCh + 7.0, glass);
      rbox(u - 0.45, u + 0.45, 49.12, 49.28, yCh + 3.6, yCh + 7.0, glass);
      const q = W(u, 25.5);
      if (gY(q[0], q[1]) < yCh + 0.7) rbox(u - 0.45, u + 0.45, 25.42, 25.58, yCh + 0.9, yCh + 2.8, glass);
    }

    // a round window: a white ring, the coloured glass, white tracery
    const oculus = (u, v, y, r) => {
      S.kind = KIND.PLAIN;
      disc(u, v, y, r, white);
      disc(u - 0.03, v, y, r * 0.74, hex('#5d6f8a'));
      disc(u - 0.06, v, y, r * 0.22, white);
      for (const a of [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4]) {
        const dv = Math.cos(a) * r * 0.72, dy = Math.sin(a) * r * 0.72;
        S.beam(P3(u - 0.06, v - dv, y - dy), P3(u - 0.06, v + dv, y + dy), 0.06, 0.06, white);
      }
    };
    // an arched window: white frame, red shutters
    const archWin = (u, v, y0, y1, w) => {
      S.kind = KIND.PLAIN;
      rbox(u - 0.06, u + 0.06, v - w / 2 - 0.18, v + w / 2 + 0.18, y0 - 0.2, y1, white);
      disc(u - 0.07, v, y1, w / 2 + 0.18, white, true);
      rbox(u - 0.1, u - 0.02, v - w / 2, v + w / 2, y0, y1, frame);
      disc(u - 0.11, v, y1, w / 2, frame, true);
      rbox(u - 0.12, u - 0.04, v - 0.04, v + 0.04, y0, y1 + w / 2 - 0.05, shade(frame, 0.7));
    };
    // a yellow-glazed tiled eave along the front: the slope, a glazed fascia board at its edge, the soffit under it
    const eave = (u0, v0, v1, y, d) => {
      const yl = y - 0.2, yh = y + d * 0.75;
      S.kind = KIND.GLAZED;
      S.quad(P3(u0 - d, v0 - 0.5, yl), P3(u0 - d, v1 + 0.5, yl), P3(u0 + 0.3, v1 + 0.5, yh), P3(u0 + 0.3, v0 - 0.5, yh), glaze, [-U[0], 1, -U[1]]);
      for (const [v, s] of [[v0 - 0.5, -1], [v1 + 0.5, 1]]) S.tri(P3(u0 - d, v, yl), P3(u0 + 0.3, v, yh), P3(u0 + 0.3, v, yl), glaze, vn(s));
      S.kind = KIND.PLAIN;
      rbox(u0 - d - 0.08, u0 - d + 0.14, v0 - 0.5, v1 + 0.5, yl - 0.32, yl + 0.06, shade(glaze, 0.82));
      S.quad(P3(u0 - d, v0 - 0.5, yl - 0.02), P3(u0 - d, v1 + 0.5, yl - 0.02), P3(u0 + 0.3, v1 + 0.5, yl - 0.02), P3(u0 + 0.3, v0 - 0.5, yl - 0.02), hex('#8b7a5c'), [0, -1, 0]);
    };

    // the front
    S.kind = KIND.MASONRY;
    for (const s of [-1, 1]) rbox(-48.8, -46, s > 0 ? NV + 3.4 : NV - 9.6, s > 0 ? NV + 9.6 : NV - 3.4, yCh, yCh + 5.6, stone);
    rbox(-47.3, -46, NV - 3.4, NV + 3.4, yCh, yCh + 5.6, stone2); // the portico's back wall
    rbox(-48.8, -47.3, NV - 3.4, NV + 3.4, yCh + 4.6, yCh + 5.6, stone); // its lintel
    S.kind = KIND.PLAIN;
    for (const dv of [-2.7, -0.9, 0.9, 2.7]) { const q = W(-48.35, NV + dv); S.cyl(q[0], q[1], yCh, yCh + 4.6, 0.27, 0.25, 8, white); }
    for (const dv of [-2.0, 0, 2.0]) rbox(-47.38, -47.26, NV + dv - (dv ? 0.55 : 0.8), NV + dv + (dv ? 0.55 : 0.8), yCh, yCh + (dv ? 2.6 : 3.4), dark);
    // the ground-floor windows either side of the portico: white-framed arches with red shutters
    for (const s of [-1, 1]) for (const dv of [5.0, 8.0]) archWin(-48.8, NV + s * dv, yCh + 1.2, yCh + 3.3, 1.2);
    // the wide glazed eave across the front at the top of the lower storey
    eave(-48.8, NV - 9.6, NV + 9.6, yCh + 5.6, 1.6);
    // the upper storey: the white niche with the statue of Christ between two rose-coloured panels, a balustraded
    // balcony in front, round windows beyond the panels
    S.kind = KIND.MASONRY;
    rbox(-48.6, -46, NV - 4.2, NV + 4.2, yCh + 5.6, yCh + 9.6, stone);
    S.kind = KIND.PLAIN;
    rbox(-48.66, -48.56, NV - 1.05, NV + 1.05, yCh + 6.0, yCh + 8.4, white);
    disc(-48.67, NV, yCh + 8.4, 1.05, white, true);
    rbox(-48.7, -48.64, NV - 0.75, NV + 0.75, yCh + 6.2, yCh + 8.4, hex('#d8d1c2'));
    disc(-48.71, NV, yCh + 8.4, 0.75, hex('#d8d1c2'), true);
    {
      const q = W(-48.95, NV);
      S.cyl(q[0], q[1], yCh + 6.3, yCh + 8.1, 0.32, 0.22, 8, white);
      S.cyl(q[0], q[1], yCh + 8.1, yCh + 8.5, 0.16, 0.13, 6, white);
      S.beam([q[0] - V[0] * 0.6, yCh + 7.85, q[1] - V[1] * 0.6], [q[0] + V[0] * 0.6, yCh + 7.85, q[1] + V[1] * 0.6], 0.14, 0.12, white);
    }
    for (const s of [-1, 1]) {
      rbox(-48.68, -48.56, NV + s * 2.25 - 0.75, NV + s * 2.25 + 0.75, yCh + 6.2, yCh + 9.0, panel);
      oculus(-48.62, NV + s * 3.55, yCh + 7.9, 0.42);
    }
    // the balcony: its slab over the portico eave, white balusters and a rail
    rbox(-49.4, -48.6, NV - 3.6, NV + 3.6, yCh + 6.05, yCh + 6.25, white);
    for (let v = NV - 3.45; v <= NV + 3.46; v += 0.3) rbox(-49.3, -49.18, v - 0.05, v + 0.05, yCh + 6.25, yCh + 6.95, white);
    rbox(-49.36, -49.12, NV - 3.6, NV + 3.6, yCh + 6.95, yCh + 7.08, white);
    for (const s of [-1, 1]) rbox(-49.4, -48.6, NV + s * 3.6 - 0.06, NV + s * 3.6 + 0.06, yCh + 6.25, yCh + 7.08, white);
    eave(-48.6, NV - 4.2, NV + 4.2, yCh + 9.6, 1.0);
    // the central gable: a pale face with its rose window, tiled slopes with thick glazed verges, the cross
    const yG0 = yCh + 10.0, yG1 = yCh + 13.0;
    S.kind = KIND.MASONRY;
    rbox(-48.4, -46, NV - 4.0, NV + 4.0, yCh + 9.6, yG0, stone);
    S.kind = KIND.PLAIN;
    S.tri(P3(-48.4, NV - 4.0, yG0), P3(-48.4, NV + 4.0, yG0), P3(-48.4, NV, yG1), hex('#dcd6c8'), un(-1));
    S.tri(P3(-46, NV + 4.0, yG0), P3(-46, NV - 4.0, yG0), P3(-46, NV, yG1), stone, un(1));
    S.kind = KIND.GLAZED;
    for (const s of [-1, 1]) S.quad(P3(-49.0, NV + s * 4.6, yG0 - 0.3), P3(-45.6, NV + s * 4.6, yG0 - 0.3), P3(-45.6, NV, yG1 + 0.35), P3(-49.0, NV, yG1 + 0.35), glaze, [V[0] * s, 1.2, V[1] * s]);
    S.kind = KIND.PLAIN;
    for (const s of [-1, 1]) S.beam(P3(-49.05, NV + s * 4.75, yG0 - 0.45), P3(-49.05, NV, yG1 + 0.2), 0.5, 0.42, shade(glaze, 0.85));
    rbox(-49.25, -48.4, NV - 0.25, NV + 0.25, yG1 + 0.1, yG1 + 0.55, shade(glaze, 0.85));
    oculus(-48.45, NV, yG0 + 1.15, 0.85);
    { const q = W(-48.6, NV); S.beam([q[0], yG1 + 0.4, q[1]], [q[0], yG1 + 2.4, q[1]], 0.2, 0.2, white); S.beam([q[0] - V[0] * 0.6, yG1 + 1.8, q[1] - V[1] * 0.6], [q[0] + V[0] * 0.6, yG1 + 1.8, q[1] + V[1] * 0.6], 0.18, 0.18, white); }
    // the two end pavilions: round windows, glazed hipped roofs with upturned corners, crosses
    for (const s of [-1, 1]) {
      const v = NV + s * 7.7;
      S.kind = KIND.MASONRY;
      rbox(-48.8, -46.4, v - 1.9, v + 1.9, yCh + 5.6, yCh + 8.6, stone);
      oculus(-48.85, v, yCh + 7.3, 0.6);
      roof(-48.8, -46.4, v - 1.9, v + 1.9, yCh + 8.6, 2.0, glaze, { over: 0.6, flare: 0.2, hips: true, glazed: true, ridgeCol: shade(glaze, 0.85), fascia: 0.3, fasciaCol: shade(glaze, 0.82) });
      const q = W(-47.6, v); S.beam([q[0], yCh + 10.5, q[1]], [q[0], yCh + 12.0, q[1]], 0.15, 0.15, white); S.beam([q[0] - V[0] * 0.4, yCh + 11.5, q[1] - V[1] * 0.4], [q[0] + V[0] * 0.4, yCh + 11.5, q[1] + V[1] * 0.4], 0.13, 0.13, white);
    }
  }

  // ================================================================ the forecourt, the front terrace and its stair
  // the photos: a near-level court paved in stone setts, a broad low stair of nine risers across most of the front,
  // and the terrace the front stands on, its base pierced by small arches, a balustrade along its edges
  const paved0 = S.n;
  {
    const [lo] = hiG(-67, -46, NV - 14, NV + 13);
    S.base = yF - LAND_Y;
    S.kind = KIND.MASONRY;
    rbox(-62, -56.5, NV - 14, NV + 13, lo - 0.6, yF, base, { top: pave, topKind: KIND.ROAD });
    // the paved court out to the road follows the falling ground (the photos are taken standing on it), rising
    // steeply over its last few metres to meet the level strip at the stair foot
    {
      const top = (u, v) => { const q = W(u, v); return Math.max(gY(q[0], q[1]) + 0.12, yF - 0.35 * (-62 - u)); };
      const foot = (u, v) => { const q = W(u, v); return gY(q[0], q[1]) - 0.4; };
      const us = [], vs = [];
      for (let u = -84; u < -62 - 1e-6; u += 1.5) us.push(u); us.push(-62);
      for (let v = NV - 14; v < NV + 13 - 1e-6; v += 1.5) vs.push(v); vs.push(NV + 13);
      S.kind = KIND.ROAD;
      for (let i = 0; i + 1 < us.length; i++) for (let j = 0; j + 1 < vs.length; j++) {
        const a = us[i], b = us[i + 1], c = vs[j], d = vs[j + 1];
        S.quad(P3(a, c, top(a, c)), P3(b, c, top(b, c)), P3(b, d, top(b, d)), P3(a, d, top(a, d)), pave, [0, 1, 0]);
      }
      S.kind = KIND.MASONRY;
      for (let i = 0; i + 1 < us.length; i++) for (const [v, s] of [[NV - 14, -1], [NV + 13, 1]]) {
        const a = us[i], b = us[i + 1];
        S.quad(P3(a, v, foot(a, v)), P3(b, v, foot(b, v)), P3(b, v, top(b, v)), P3(a, v, top(a, v)), base, vn(s));
      }
      for (let j = 0; j + 1 < vs.length; j++) {
        const c = vs[j], d = vs[j + 1];
        S.quad(P3(-84, c, foot(-84, c)), P3(-84, d, foot(-84, d)), P3(-84, d, top(-84, d)), P3(-84, c, top(-84, c)), base, un(-1));
      }
    }
    // the terrace before the front, and the strip under the front itself
    rbox(-52.5, -46, NV - 13, NV + 13, lo - 0.6, yCh, base, { top: pave, topKind: KIND.ROAD });
    // the stair
    const n = 9, run = 4.0 / n;
    S.kind = KIND.ROAD;
    for (let i = 0; i < n; i++) { const u = -56.5 + run * i; rbox(u, u + run + 0.02, NV - 8.5, NV + 8.5, lo - 0.6, yF + ((yCh - yF) * (i + 1)) / n, pave); }
    S.kind = KIND.MASONRY;
    for (const s of [-1, 1]) rbox(-56.6, -52.5, NV + s * 8.8 - 0.3, NV + s * 8.8 + 0.3, lo - 0.6, yF + 0.25 + (yCh - yF) * 0.5, base);
    // small dark arches in the terrace's base, either side of the stair and along its ends
    S.kind = KIND.PLAIN;
    for (const s of [-1, 1]) for (const dv of [10.0, 11.8]) {
      const v = NV + s * dv;
      rbox(-52.58, -52.5, v - 0.35, v + 0.35, yF, yF + 0.7, dark);
      disc(-52.6, v, yF + 0.7, 0.35, dark, true);
    }
    for (const s of [-1, 1]) for (let u = -51.3; u <= -47; u += 1.4) {
      const v = NV + s * 13.04, q = W(u, v);
      if (gY(q[0], q[1]) < yF + 0.3) rbox(u - 0.35, u + 0.35, v - 0.04, v + 0.04, yF, yF + 0.75, dark);
    }
    // the balustrade along the terrace's edges, beyond the stair
    for (const s of [-1, 1]) {
      const v0 = NV + s * 8.8, v1 = NV + s * 12.95;
      rbox(-52.5, -52.25, Math.min(v0, v1), Math.max(v0, v1), yCh + 0.85, yCh + 0.97, white);
      for (let k = 0; k <= 12; k++) { const v = v0 + ((v1 - v0) * k) / 12; rbox(-52.43, -52.33, v - 0.05, v + 0.05, yCh, yCh + 0.85, white); }
      const vv = NV + s * 12.9;
      rbox(-52.5, -48.8, vv - 0.12, vv + 0.12, yCh + 0.85, yCh + 0.97, white);
      for (let u = -52.4; u <= -48.9; u += 0.32) rbox(u - 0.05, u + 0.05, vv - 0.05, vv + 0.05, yCh, yCh + 0.85, white);
    }
  }
  // ================================================================ the bell tower (OSM node 14351300803)
  // octagonal, seven storeys narrowing upward, each under a tiled skirt roof, an eight-sided cap and the cross:
  // the outline of tháp Phước Duyên; in Street View (user photosphere) grey stone with white-framed openings and yellow-glazed skirts
  let towerTop;
  {
    const tc = [-708.0, 6369.2], g0 = gY(tc[0], tc[1]), rot = A + Math.PI / 8;
    let lo = 1e9; for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; lo = Math.min(lo, gY(tc[0] + Math.cos(a) * 6.4, tc[1] + Math.sin(a) * 6.4)); }
    const yT = Math.max(g0, lo) + 0.5;
    S.base = yT - LAND_Y;
    S.kind = KIND.MASONRY;
    S.cyl(tc[0], tc[1], lo - 0.6, yT, 6.4, 6.4, 8, base, { rot });
    S.cyl(tc[0], tc[1], yT, yT + 1.0, 5.4, 5.4, 8, base, { rot });
    // storeys broad and tall enough to match the front in the photos: the lowest tier's skirt about 12 m across,
    // the cross some 36 m over the forecourt, far above the front's own cross
    let y = yT + 1.0;
    const hs = [4.4, 3.9, 3.7, 3.5, 3.4, 3.3, 3.2];
    const ring = (r, yy, col, hint) => { // a flat octagonal ring facing up or down, r = [inner, outer]
      for (let k = 0; k < 8; k++) {
        const a0 = rot + (k * Math.PI) / 4, a1 = rot + ((k + 1) * Math.PI) / 4, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
        S.quad([tc[0] + c0 * r[0], yy, tc[1] + s0 * r[0]], [tc[0] + c1 * r[0], yy, tc[1] + s1 * r[0]], [tc[0] + c1 * r[1], yy, tc[1] + s1 * r[1]], [tc[0] + c0 * r[1], yy, tc[1] + s0 * r[1]], col, hint);
      }
    };
    hs.forEach((h, i) => {
      const r = 4.4 - i * 0.22;
      S.kind = KIND.MASONRY;
      S.cyl(tc[0], tc[1], y, y + h, r, r, 8, i % 2 ? stone : stone2, { rot });
      S.kind = KIND.PLAIN;
      // white-framed arched openings on the four cardinal faces, round windows on the diagonals
      const rr = r * Math.cos(Math.PI / 8);
      for (let k = 0; k < 8; k++) {
        const a = A + (k * Math.PI) / 4, ca = Math.cos(a), sa = Math.sin(a);
        const x = tc[0] + ca * (rr + 0.03), z = tc[1] + sa * (rr + 0.03), ym = y + h * 0.45;
        if (k % 2 === 0) {
          const ow = i === 0 ? 1.5 : 1.0, oh = Math.min(h - 1.3, 2.2);
          S.box(x, z, ym - oh / 2 - 0.15, ym + oh / 2 + 0.15, 0.1, ow + 0.36, a, white);
          S.box(tc[0] + ca * (rr + 0.06), tc[1] + sa * (rr + 0.06), ym - oh / 2, ym + oh / 2, 0.1, ow, a, dark);
        } else if (i > 0) {
          S.box(x, z, ym - 0.4, ym + 0.4, 0.1, 0.8, a, white);
          S.box(tc[0] + ca * (rr + 0.06), tc[1] + sa * (rr + 0.06), ym - 0.26, ym + 0.26, 0.1, 0.52, a, dark);
        }
      }
      // the skirt: a deep glazed roof with a fascia board and a soffit, upturned corners, a balustrade above it
      const yr = y + h, R = r + 1.75, rt = r + 0.1, sh = 1.15;
      S.cyl(tc[0], tc[1], yr - 0.42, yr, R, R, 8, shade(glaze, 0.8), { rot, cap: false });
      ring([r, R], yr - 0.42, hex('#8b7a5c'), [0, -1, 0]);
      S.kind = KIND.GLAZED;
      S.cyl(tc[0], tc[1], yr, yr + sh, R, rt, 8, glaze, { rot });
      for (let k = 0; k < 8; k++) {
        const a = rot + (k * Math.PI) / 4, ca = Math.cos(a), sa = Math.sin(a);
        S.beam([tc[0] + ca * (R - 0.6), yr + 0.3, tc[1] + sa * (R - 0.6)], [tc[0] + ca * (R + 0.35), yr + 0.62, tc[1] + sa * (R + 0.35)], 0.22, 0.22, shade(glaze, 0.9));
      }
      S.kind = KIND.PLAIN;
      if (i < hs.length - 1) {
        const rb = r + 0.55, yb = yr + sh * (R - rb) / (R - rt);
        S.cyl(tc[0], tc[1], yb - 0.1, yb + 0.85, rb, rb, 8, stone2, { rot, cap: false });
        ring([rb - 0.12, rb + 0.06], yb + 0.85, white, [0, 1, 0]);
      }
      y = yr + 0.55;
    });
    S.kind = KIND.GLAZED;
    S.cyl(tc[0], tc[1], y, y + 3.2, 2.6, 0.14, 8, glaze, { rot });
    S.kind = KIND.PLAIN;
    y += 0.3;
    S.cyl(tc[0], tc[1], y + 2.4, y + 2.9, 0.4, 0.4, 6, ridge);
    towerTop = [tc, y + 2.9];
    S.beam([tc[0], y + 2.9, tc[1]], [tc[0], y + 5.4, tc[1]], 0.26, 0.26, white);
    S.beam([tc[0] - V[0] * 0.8, y + 4.6, tc[1] - V[1] * 0.8], [tc[0] + V[0] * 0.8, y + 4.6, tc[1] + V[1] * 0.8], 0.22, 0.22, white);
    // a paved path from the tower's terrace to the forecourt
    S.kind = KIND.MASONRY;
  }

  // ================================================================ the monastery ranges round the courts
  const lev = (u0, u1, v0, v1) => hiG(u0, u1, v0, v1)[1] + 0.25;
  // Read from the satellite where it differs from the OSM outline: south of the cross wing only a small hipped block
  // round a light-well and a flat grey terrace; the south range stops short of it as its own block; the south-west arm
  // is a narrow range and, beyond a gap, a separate end block.
  const yE = lev(-42.2, -28.9, -14, 20.5), yM = lev(-18.4, -2.9, -14, 15.5), yS = lev(-42.2, -5, -24.4, -14);
  const yK = lev(-5, 8, -27, -14), ySc = lev(8, 35.8, -26, -14), yWw = lev(38.5, 46, -40, -15), yWe = lev(34, 45, -62, -43);
  // the east wing (the 1943 house of 28 cells): two storeys as it shows over the trees beside the front
  range(-42.2, -28.9, -14, 20.5, 2, yE);
  range(-18.4, -2.9, -14, 15.5, 2, yM); // the middle wing, up to where the long range's roof takes over
  range(-42.2, -5, -24.4, -14, 2, yS); // the cross wing south of the garth
  range(-5, 8, -27, -14, 1, yK, { faces: 'sw' }); // the small hipped block
  { // the flat grey terrace beside it
    const [lo] = hiG(-14, -5, -28.5, -24.4), y = lev(-14, -5, -28.5, -24.4);
    S.base = y - LAND_Y;
    S.kind = KIND.MASONRY;
    rbox(-14, -5, -28.5, -24.4, lo - 0.6, y + 3.2, cream2, { top: hex('#a8a49b'), topKind: KIND.FLAT });
    S.kind = KIND.PLAIN;
    windows(-14, -5, -28.5, -24.4, y, 1, 3.2, { faces: 's' });
  }
  range(8, 35.8, -26, -14, 2, ySc, { faces: 'sw' }); // the south block
  range(38.5, 46, -40, -15, 1, yWw); // the narrow south-west arm
  range(34, 45, -62, -43, 2, yWe); // its separate end block
  // cloister walks: arcades on the ground floors facing the garth and the garden court
  arcade('u', -28.9, -13.6, 20.5, yE, 2.6, 1);
  arcade('u', -18.4, -13.6, 15.1, yM, 2.6, -1);
  arcade('u', -17.6, 15.9, 25.1, yC, 2.6, -1);
  arcade('u', -2.9, -13.6, 15.1, yM, 2.6, 1);
  arcade('u', -5, 15.9, 23.8, yC, 2.6, 1);
  arcade('v', -14, -4.6, 7.6, yK, 2.6, 1);
  arcade('v', -14, 8.4, 35.4, ySc, 2.6, 1);
  arcade('u', 38.5, -39.5, -15.5, yWw, 2.6, -1);
  // the narrow cloister garth: a lawn on its own level with a cross of paths and a well-head at the crossing
  {
    const yG = lev(-28.9, -18.4, -14, 24.2) - 0.1, [lo] = hiG(-28.9, -18.4, -14, 26);
    S.base = yG - LAND_Y;
    S.kind = KIND.MASONRY;
    rbox(-28.9, -18.4, -14, 26, lo - 0.6, yG, base, { top: lawn, topKind: KIND.GROUND });
    rbox(-18.4, -17.6, 15.5, 25.5, lo - 0.6, yG, base, { top: pave, topKind: KIND.ROAD });
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
      S.kind = KIND.PLAIN;
      // a closed, irregular canopy over the terraces (the satellite sees the court under one mass of crowns), the
      // trees jittered off any grid, of mixed size, up to the walls of the range and the crypt terrace
      for (let k = 0; k < 16; k++) {
        const h1 = Math.sin((u0 + 7) * 3.1 + k * 17.23) * 9973.1, h2 = Math.sin((u0 + 3) * 5.7 + k * 29.71) * 7919.3;
        const fu = h1 - Math.floor(h1), fv = h2 - Math.floor(h2);
        const uu = u0 + 1.6 + fu * (u1 - u0 - 3.2), vv = -12.4 + fv * 35;
        if (u0 === 10 && Math.hypot(uu - 16.5, vv - 5.2) < 3.5) continue;
        shadeTree(W(uu, vv), y, 2.6 + fu * 2.2, 7 + fv * 5, u0 * 31 + k);
      }
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
    // the long block south-east of the cloister: its OSM outline lies 6 m south of the building on the satellite
    if (Math.hypot(o.c[0] + 660.4, o.c[1] - 6471.0) < 3) o.c = [o.c[0] + 0.5, o.c[1] - 6.0];
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
  // a square one-storey house under a weathered hip roof east of the east wing, on the satellite but not in OSM
  {
    const [lo, hi] = hiG(-54, -45.4, 8.1, 16.7), y = hi + 0.2;
    S.base = y - LAND_Y;
    S.kind = KIND.MASONRY;
    rbox(-54, -45.4, 8.1, 16.7, lo - 0.5, y + 3.4, cream2, { top: shade(tile, 0.8) });
    S.kind = KIND.PLAIN;
    for (const v of [10.4, 14.4]) rbox(-54.08, -53.95, v - 0.5, v + 0.5, y + 0.9, y + 2.4, dark);
    roof(-54, -45.4, 8.1, 16.7, y + 3.4, 2.6, hex('#6e5a50'), { over: 0.7, flare: 0.2, ridgeCol: null, fascia: 0 });
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
  for (const v of [NV - 5, NV + 5]) { const q = W(-57.2, v); pos.push(q[0], yF + 1.4, q[1]); col.push(1, 0.82, 0.52); }
  { const q = W(-47.6, NV); pos.push(q[0], yCh + 4.0, q[1]); col.push(1, 0.85, 0.6); }
  for (let u = -38; u <= -22; u += 7.6) { const q = W(u, 25.2); pos.push(q[0], yCh + 2.0, q[1]); col.push(0.7, 0.75, 1); }
  const pts = glowPoints(pos, col, 4);
  pts.userData.glow = true;
  for (const m of [cross, pts]) { m.userData.landmark = id; group.add(m); }
}
