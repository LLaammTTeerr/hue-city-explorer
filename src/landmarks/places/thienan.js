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
  // a broad shade tree standing at height y: trunk and three stacked crowns
  const shadeTree = (c, y, r, h) => {
    S.kind = KIND.PLAIN;
    S.cyl(c[0], c[1], y, y + h * 0.45, 0.28, 0.2, 6, hex('#5a4634'));
    S.cyl(c[0], c[1], y + h * 0.35, y + h * 0.6, r * 0.75, r, 7, hex('#3f5a2c'));
    S.cyl(c[0], c[1], y + h * 0.6, y + h * 0.82, r, r * 0.7, 7, hex('#4d6b33'));
    S.cyl(c[0], c[1], y + h * 0.82, y + h, r * 0.7, r * 0.15, 7, hex('#4d6b33'));
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
    rbox(u0, u1, v0, v1, y, top, o.wall || cream, { top: shade(tile, 0.8) });
    S.kind = KIND.PLAIN;
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
  const stone = hex('#8c877e'), stone2 = hex('#99938a'), glaze = hex('#c99a45'), frame = hex('#8a3a2e'), panel = hex('#b67a70');
  const P3 = (u, v, y) => { const q = W(u, v); return [q[0], y, q[1]]; };
  const vn = (s) => [V[0] * s, 0, V[1] * s], un = (s) => [U[0] * s, 0, U[1] * s];
  {
    const [lo] = hiG(-48.8, 14.8, 24.2, 50.4);
    S.base = yC - LAND_Y;
    S.kind = KIND.MASONRY;
    // the stone podium, tall at the apse end where the hill falls away: the half-sunk crypt church inside it
    rbox(-49.1, -17.6, 25.2, 50.7, lo - 0.6, yC, base, { topKind: KIND.ROAD });
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

    // the nave, in grey stone
    const yN = yC + 8.2;
    S.base = yC - LAND_Y;
    S.kind = KIND.MASONRY;
    rbox(-46, -17.6, NV - 5.2, NV + 5.2, yC, yN, stone, { top: shade(tile, 0.8) });
    // the inner south aisle under a flat grey roof, the outer one under a tiled lean-to
    rbox(-46, -17.6, 30.8, NV - 5.2, yC, yC + 6.0, cream, { top: hex('#a8a49b') });
    rbox(-46, -17.6, 25.5, 30.8, yC, yC + 3.6, cream, { top: shade(tile, 0.8) });
    // a low passage along the north wall
    rbox(-46, -17.6, NV + 5.2, 47.8, yC, yC + 3.2, cream2, { top: hex('#a8a49b') });
    S.kind = KIND.TILE;
    S.quad(P3(-46.5, 25.0, yC + 3.45), P3(-17.6, 25.0, yC + 3.45), P3(-17.6, 30.9, yC + 5.0), P3(-46.5, 30.9, yC + 5.0), tile, [0, 1, 0]);
    S.kind = KIND.PLAIN;
    for (const u of [-46, -17.6]) S.tri(P3(u, 25.5, yC + 3.6), P3(u, 30.8, yC + 3.6), P3(u, 30.8, yC + 4.9), cream, un(u < -30 ? 1 : -1));
    roof(-46, -17.6, NV - 5.2, NV + 5.2, yN, 3.8, tile, { over: 0.8, flare: 0.25 });
    // windows: high in the nave walls over the aisle roofs, low in the aisle and passage walls
    for (let u = -42.5; u <= -21; u += 3.6) {
      rbox(u - 0.45, u + 0.45, NV - 5.28, NV - 5.12, yC + 6.4, yC + 7.7, glass);
      rbox(u - 0.45, u + 0.45, NV + 5.12, NV + 5.28, yC + 3.8, yC + 7.5, glass);
      rbox(u - 0.45, u + 0.45, 25.42, 25.58, yC + 0.9, yC + 3.0, glass);
      rbox(u - 0.4, u + 0.4, 47.72, 47.88, yC + 0.9, yC + 2.6, dark);
    }

    // the front
    S.kind = KIND.MASONRY;
    for (const s of [-1, 1]) rbox(-48.8, -46, s > 0 ? NV + 3.4 : NV - 9.6, s > 0 ? NV + 9.6 : NV - 3.4, yC, yC + 5.6, stone);
    rbox(-47.3, -46, NV - 3.4, NV + 3.4, yC, yC + 5.6, stone2); // the portico's back wall
    rbox(-48.8, -47.3, NV - 3.4, NV + 3.4, yC + 4.6, yC + 5.6, stone); // its lintel
    S.kind = KIND.PLAIN;
    for (const dv of [-2.7, -0.9, 0.9, 2.7]) { const q = W(-48.35, NV + dv); S.cyl(q[0], q[1], yC, yC + 4.6, 0.27, 0.25, 8, white); }
    for (const dv of [-2.0, 0, 2.0]) rbox(-47.38, -47.26, NV + dv - (dv ? 0.55 : 0.8), NV + dv + (dv ? 0.55 : 0.8), yC, yC + (dv ? 2.6 : 3.4), dark);
    for (const s of [-1, 1]) for (const dv of [5.0, 8.0]) {
      const v = NV + s * dv;
      rbox(-48.9, -48.78, v - 0.75, v + 0.75, yC + 1.2, yC + 3.9, frame);
      rbox(-48.95, -48.85, v - 0.5, v + 0.5, yC + 1.4, yC + 3.7, glass);
    }
    // the glazed eave across the front at the top of the lower storey
    const eave = (u0, v0, v1, y) => {
      S.kind = KIND.PLAIN;
      rbox(u0 - 0.15, u0 + 0.6, v0 - 0.5, v1 + 0.5, y - 0.25, y, white);
      S.kind = KIND.TILE;
      S.quad(P3(u0 - 1.0, v0 - 0.6, y - 0.1), P3(u0 - 1.0, v1 + 0.6, y - 0.1), P3(u0 + 0.3, v1 + 0.6, y + 0.65), P3(u0 + 0.3, v0 - 0.6, y + 0.65), glaze, [-U[0], 1, -U[1]]);
      S.kind = KIND.PLAIN;
    };
    eave(-48.8, NV - 9.6, NV + 9.6, yC + 5.6);
    // the upper storey: the niche with the statue of Christ between two rose-coloured panels
    S.kind = KIND.MASONRY;
    rbox(-48.6, -46, NV - 4.2, NV + 4.2, yC + 5.6, yC + 9.6, stone);
    S.kind = KIND.PLAIN;
    rbox(-48.7, -48.56, NV - 0.85, NV + 0.85, yC + 6.0, yC + 8.9, dark);
    { const q = W(-48.5, NV); S.cyl(q[0], q[1], yC + 6.2, yC + 8.0, 0.3, 0.22, 8, white); S.cyl(q[0], q[1], yC + 8.0, yC + 8.4, 0.16, 0.12, 6, white); }
    for (const s of [-1, 1]) {
      rbox(-48.68, -48.56, NV + s * 2.4 - 0.6, NV + s * 2.4 + 0.6, yC + 6.2, yC + 8.7, panel);
      rbox(-48.7, -48.58, NV + s * 3.6 - 0.35, NV + s * 3.6 + 0.35, yC + 7.4, yC + 8.1, white);
    }
    eave(-48.6, NV - 4.2, NV + 4.2, yC + 9.6);
    // the central gable, its rose window and the cross
    const yG0 = yC + 9.9, yG1 = yC + 13.0;
    S.kind = KIND.MASONRY;
    rbox(-48.4, -46, NV - 4.0, NV + 4.0, yC + 9.6, yG0, stone);
    S.tri(P3(-48.4, NV - 4.0, yG0), P3(-48.4, NV + 4.0, yG0), P3(-48.4, NV, yG1), stone, un(-1));
    S.tri(P3(-46, NV + 4.0, yG0), P3(-46, NV - 4.0, yG0), P3(-46, NV, yG1), stone, un(1));
    S.kind = KIND.TILE;
    for (const s of [-1, 1]) S.quad(P3(-48.8, NV + s * 4.5, yG0 - 0.25), P3(-45.6, NV + s * 4.5, yG0 - 0.25), P3(-45.6, NV, yG1 + 0.3), P3(-48.8, NV, yG1 + 0.3), glaze, [V[0] * s, 1.2, V[1] * s]);
    S.kind = KIND.PLAIN;
    rbox(-48.5, -48.38, NV - 0.75, NV + 0.75, yG0 + 0.3, yG0 + 1.8, glass);
    rbox(-48.48, -48.4, NV - 0.95, NV + 0.95, yG0 + 0.15, yG0 + 0.3, white);
    { const q = W(-48.0, NV); S.beam([q[0], yG1, q[1]], [q[0], yG1 + 2.1, q[1]], 0.2, 0.2, white); S.beam([q[0] - V[0] * 0.6, yG1 + 1.5, q[1] - V[1] * 0.6], [q[0] + V[0] * 0.6, yG1 + 1.5, q[1] + V[1] * 0.6], 0.18, 0.18, white); }
    // the two end pavilions
    for (const s of [-1, 1]) {
      const v = NV + s * 7.7;
      S.kind = KIND.MASONRY;
      rbox(-48.8, -45, v - 1.9, v + 1.9, yC + 5.6, yC + 8.3, stone);
      S.kind = KIND.PLAIN;
      rbox(-48.9, -48.78, v - 0.55, v + 0.55, yC + 6.4, yC + 7.5, white);
      rbox(-48.95, -48.85, v - 0.4, v + 0.4, yC + 6.55, yC + 7.35, glass);
      roof(-48.8, -45, v - 1.9, v + 1.9, yC + 8.3, 1.3, glaze, { over: 0.55, flare: 0.45, hips: true, glazed: true, ridgeCol: white });
      const q = W(-46.9, v); S.beam([q[0], yC + 9.5, q[1]], [q[0], yC + 11.0, q[1]], 0.15, 0.15, white); S.beam([q[0] - V[0] * 0.4, yC + 10.5, q[1] - V[1] * 0.4], [q[0] + V[0] * 0.4, yC + 10.5, q[1] + V[1] * 0.4], 0.13, 0.13, white);
    }
  }

  // ================================================================ the forecourt and the stair up to the portico
  const paved0 = S.n;
  const yF = hiG(-64, -55.5, NV - 12, NV + 11)[1] + 0.2;
  {
    const [lo] = hiG(-64, -48.8, NV - 12, NV + 11);
    S.base = yF - LAND_Y;
    S.kind = KIND.MASONRY;
    rbox(-64, -55.5, NV - 12, NV + 11, lo - 0.6, yF, base, { top: pave, topKind: KIND.ROAD });
    // the steps from the forecourt up to the portico (OSM way 1580312660), stone cheek walls either side
    const n = Math.max(3, Math.round((yC - yF) / 0.17)), run = (55.5 - 48.8) / n;
    S.kind = KIND.ROAD;
    for (let i = 0; i < n; i++) { const u = -55.5 + run * i; rbox(u, u + run + 0.02, NV - 4.5, NV + 4.5, lo - 0.6, yF + ((yC - yF) * (i + 1)) / n, pave); }
    S.kind = KIND.MASONRY;
    for (const s of [-1, 1]) rbox(-55.7, -48.8, NV + s * 5.0 - 0.5, NV + s * 5.0 + 0.5, lo - 0.6, yC + 0.6, base);
  }
  // ================================================================ the bell tower (OSM node 14351300803)
  // octagonal, seven storeys narrowing upward, each under a tiled skirt roof, an eight-sided cap and the cross:
  // the outline of tháp Phước Duyên; in Street View (user photosphere) grey stone with white-framed openings and yellow-glazed skirts
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
      S.cyl(tc[0], tc[1], y, y + h, r, r, 8, i % 2 ? stone : stone2, { rot });
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
      S.cyl(tc[0], tc[1], yr - 0.15, yr, r + 0.95, r + 0.95, 8, white, { rot, cap: false });
      S.kind = KIND.GLAZED; S.cyl(tc[0], tc[1], yr, yr + 0.75, r + 0.95, r - 0.05, 8, glaze, { rot });
      S.kind = KIND.PLAIN;
      y = yr + 0.3;
    });
    S.kind = KIND.TILE;
    S.cyl(tc[0], tc[1], y, y + 2.6, 1.9, 0.12, 8, glaze, { rot });
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
  const yE = lev(-42.2, -28.9, -14, 20.5), yM = lev(-18.4, -2.9, -14, 15.5), yS = lev(-42.2, 35.8, -24.4, -14);
  const yB = lev(-21.7, 8.3, -31.6, -24.4), yWw = lev(35.8, 48.2, -68.3, -14);
  // the three-storey east wing (the 1943 house of 28 cells, estimated), the middle wing and the long south range
  range(-42.2, -28.9, -14, 20.5, 3, yE);
  range(-18.4, -2.9, -14, 15.5, 2, yM); // the middle wing, up to where the long range's roof takes over
  range(-42.2, 35.8, -24.4, -14, 2, yS);
  range(-21.7, 8.3, -31.6, -24.4, 2, yB, { faces: 'sew' });
  range(35.8, 48.2, -55.9, -14.2, 2, yWw);
  range(35.5, 60.3, -68.3, -55.9, 2, yWw);
  // cloister walks: arcades on the ground floors facing the garth and the garden court
  arcade('u', -28.9, -13.6, 20.5, yE, 2.6, 1);
  arcade('u', -18.4, -13.6, 15.1, yM, 2.6, -1);
  arcade('u', -17.6, 15.9, 25.1, yC, 2.6, -1);
  arcade('u', -2.9, -13.6, 15.1, yM, 2.6, 1);
  arcade('u', -5, 15.9, 23.8, yC, 2.6, 1);
  arcade('v', -14, -2.5, 35.4, yS, 2.6, 1);
  arcade('u', 35.8, -55.5, -14.6, yWw, 2.6, -1);
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
      S.kind = KIND.ROAD;
      rbox(u0, u1, 4.2, 6.2, y, y + 0.06, pave);
      S.kind = KIND.PLAIN;
      // shade trees over the terraces (the satellite sees the court mostly under their crowns)
      for (const v of [-9, -1, 12, 19.5]) for (const uu of [u0 + 3.2, u1 - 3.2]) if (!(u0 === 10 && Math.abs(v - 5) < 8)) shadeTree(W(uu, v + (uu > u0 + 5 ? 1.5 : -1)), y, 2.8 + ((uu + v) % 3 + 3) % 3 * 0.3, 7.5 + ((uu * 7 + v) % 4 + 4) % 4 * 0.5);
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
  for (const v of [NV - 5, NV + 5]) { const q = W(-55.2, v); pos.push(q[0], yF + 1.4, q[1]); col.push(1, 0.82, 0.52); }
  { const q = W(-47.6, NV); pos.push(q[0], yC + 4.0, q[1]); col.push(1, 0.85, 0.6); }
  for (let u = -38; u <= -22; u += 7.6) { const q = W(u, 25.2); pos.push(q[0], yC + 2.0, q[1]); col.push(0.7, 0.75, 1); }
  const pts = glowPoints(pos, col, 4);
  pts.userData.glow = true;
  for (const m of [cross, pts]) { m.userData.landmark = id; group.add(m); }
}
