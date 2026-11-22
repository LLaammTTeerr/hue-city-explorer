import { KIND, hex, shade } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { glowPoints } from '../../geo/materials.js';

// Đồi Vọng Cảnh: the pine hill (about 43 m above sea level) on the right bank of the Hương in Thủy Xuân / Thủy Biều,
// standing over the bend opposite điện Hòn Chén. Sources and estimates: docs/places/vongcanh.md.
//
// Where it is: OSM maps the hill as the forest way 1075018793 "Vong Canh Hill", its viewpoint as the node 4603986390
// (tourism=attraction), the forest rangers' lookout tower as node 13516013279 (man_made=tower, observation) and the
// stone-paved walks and steps up the hill (ways 1075018785…1075018790, 1200924922…26, 1473264464…68). Everything
// below is hard-coded from those, in model metres, and checked against Google's satellite imagery (November 2026): the
// garden, the round court, the east-flank walk, the river walk and the road agree with it to a metre or two; the main
// stair and the west stair are drawn where the imagery shows them (see WALKS). The place record comes from the
// viewpoint node, moved onto the highest ground near it (scripts/build-data.mjs); the terrain grid already has this hill
// (about 34 m above the city floor at the brow), so no local ground is modelled.
//
// What stands there today (after the 13-billion-đồng clean-up finished in 2024, tuoitre.vn): stone-paved walks and
// steps up through the pines, a flower garden near the top (sim, tường vi, ngũ sắc), the rangers' fire-watch tower
// (iron frame, wooden floor, over 15 m, repainted Huế purple) used as a lookout, new lamps, and the bunkers and gun pits
// left from before 1975. The viewing terrace's size, the bunkers' places and the tower's exact form are estimated.

export const id = 'vongcanh';
// how far from the place point this builder reads data.trees (the pine wood's box below reaches about 500 m from the
// record's point on the brow); build-data.mjs keeps every record within it in hue.json, out of the tiles (default 520 m)
export const dataReach = 540;

const VIEW = [-2641.6, 4524.1]; // OSM node 4603986390: the lookout over the river bend
const TOWER = [-2782.0, 4347.3]; // OSM node 13516013279: the rangers' observation tower
const GARDEN = [-2772.4, 4383.4]; // the round garden the walks 1075018785/86 ring (centre of the inner ring)
const RIVER = [-2735, 4645]; // a point on the bend the terrace looks toward
// the rest stop (trạm dừng) by the garden's north gate, built after the 2024 works: a dark hip roof about 9.5 × 7 m in
// the imagery, its long side about 20° south of east [centre, length, depth, angle]
const REST = [[-2725.4, 4356.6], 9.5, 7.0, 0.35];
// the two wartime pillboxes on the brow under the lookout, river side (positions estimated, clear of the walks)
const BUNKERS = [[-2669, 4553], [-2690, 4531]];

// the hill's forest outline (OSM way 1075018793)
const FOREST = [[-2863.3, 4456.3], [-2935.7, 4392.5], [-2940.8, 4379.9], [-2937.1, 4364.9], [-2919.5, 4344.0], [-2898.4, 4314.5], [-2896.6, 4305.2], [-2899.3, 4294.9], [-2916.3, 4275.5], [-2935.7, 4260.0], [-2940.1, 4251.4], [-2939.5, 4234.9], [-2928.5, 4215.1], [-2913.7, 4198.2], [-2880.6, 4171.4], [-2850.6, 4166.6], [-2826.3, 4168.8], [-2787.9, 4195.9], [-2757.4, 4249.6], [-2707.9, 4326.2], [-2657.9, 4397.8], [-2627.6, 4431.6], [-2603.0, 4457.0], [-2577.8, 4468.8], [-2551.1, 4468.6], [-2536.3, 4464.0], [-2516.5, 4461.4], [-2493.8, 4465.8], [-2482.4, 4475.1], [-2477.6, 4491.9], [-2476.2, 4505.6], [-2474.8, 4526.1], [-2467.4, 4542.5], [-2447.6, 4563.8], [-2422.9, 4581.9], [-2416.5, 4591.6], [-2409.6, 4615.1], [-2402.1, 4636.4], [-2383.9, 4665.0], [-2369.2, 4683.4], [-2360.9, 4696.0], [-2354.5, 4712.4], [-2352.6, 4741.9], [-2355.8, 4758.4], [-2364.3, 4769.5], [-2379.6, 4783.0], [-2396.3, 4797.1], [-2409.4, 4805.2], [-2422.4, 4804.3], [-2436.4, 4802.5], [-2445.7, 4798.9], [-2453.9, 4790.1], [-2455.3, 4780.8], [-2456.6, 4769.0], [-2465.1, 4758.9], [-2479.2, 4756.9], [-2491.9, 4762.0], [-2504.8, 4758.8], [-2515.6, 4751.5], [-2525.4, 4741.6], [-2539.9, 4733.8], [-2557.2, 4730.6], [-2570.2, 4726.2], [-2585.6, 4710.7], [-2598.7, 4685.5], [-2637.7, 4643.3], [-2661.5, 4622.3], [-2683.1, 4608.7], [-2717.4, 4580.8], [-2741.8, 4560.3], [-2779.6, 4533.6], [-2832.1, 4489.0]];

// walks: [width, steps?, points]
const WALKS = [
  // The walks as the satellite shows them after the 2024 works (checked against Google's imagery, November 2026): OSM's
  // ways 1075018785…90 and 1473264464…68 give the garden, the east flank, the river walk and the tower path, which
  // match it; the stone stair down the middle of the hill and the west stair to the river are drawn where the imagery
  // shows them (OSM still has older, winding trails there: way 1075018788 and the upper part of 1473264466).
  // the main stone stair: from the garden's south-east corner straight down the crest, past the lookout, to the round
  // court at the foot of the hill
  [2.4, true, [[-2748.6, 4406.5], [-2737.0, 4420.5], [-2725.7, 4432.7], [-2712.5, 4446.5], [-2699.8, 4459.9], [-2676.9, 4475.7], [-2655.1, 4491.2], [-2645.5, 4503.0], [-2636.6, 4514.8], [-2620.5, 4541.8], [-2604.6, 4568.7], [-2589.5, 4587.0], [-2580.5, 4614.0], [-2573.5, 4639.2], [-2561.5, 4656.0], [-2539.8, 4654.7], [-2522.1, 4672.9], [-2511.0, 4662.0], [-2500.2, 4647.0]]],
  // its branch down to the lane past the cafés on the south side
  [2.0, true, [[-2522.1, 4672.9], [-2538.1, 4679.6], [-2544.0, 4694.8], [-2546.5, 4705.0]]],
  // the walk from Huyền Trân Công Chúa (north gate) down to the stair (way 1075018789; a narrow trail under the pines)
  [1.4, false, [[-2642.3, 4411.3], [-2646.3, 4443.7], [-2647.4, 4458.5], [-2648.0, 4475.9], [-2650.3, 4489.8], [-2653.6, 4492.6]]],
  // the paved walk along the east flank, from the round court by the road to the north gate (way 1075018790)
  [2.0, false, [[-2476.4, 4658.9], [-2500.2, 4645.1], [-2511.1, 4630.9], [-2518.0, 4618.7], [-2535.5, 4595.9], [-2550.1, 4571.2], [-2566.1, 4546.4], [-2589.6, 4512.9], [-2600.2, 4487.8], [-2612.8, 4468.2], [-2624.5, 4446.9], [-2633.7, 4430.4], [-2642.3, 4411.3], [-2645.0, 4398.0]]],
  // the garden's outer walk from the road (way 1075018785), its inner ring and spokes (1075018786/87, 1200924922…26)
  [1.8, false, [[-2707.0, 4309.7], [-2714.0, 4311.7], [-2722.4, 4317.2], [-2730.0, 4326.6], [-2736.3, 4335.1], [-2742.6, 4343.1], [-2747.9, 4350.0], [-2749.7, 4352.5], [-2754.1, 4358.4], [-2758.0, 4364.0], [-2760.8, 4368.6], [-2767.7, 4367.7], [-2774.9, 4369.2], [-2779.8, 4371.2], [-2785.9, 4373.9], [-2790.0, 4377.7], [-2789.8, 4383.5], [-2786.4, 4386.7], [-2783.6, 4398.3], [-2778.3, 4401.2], [-2767.7, 4406.8], [-2758.2, 4405.2], [-2755.7, 4410.7], [-2750.3, 4410.3], [-2748.6, 4405.0], [-2748.1, 4399.2], [-2747.8, 4392.7], [-2749.1, 4387.6], [-2752.1, 4383.2], [-2755.3, 4382.7], [-2760.8, 4368.6]]],
  [1.4, false, [[-2760.8, 4368.6], [-2766.6, 4373.1], [-2769.4, 4378.5], [-2772.2, 4377.8], [-2775.1, 4378.8], [-2776.7, 4385.4], [-2772.9, 4389.5], [-2768.6, 4387.4], [-2768.3, 4384.1], [-2769.4, 4378.5]]],
  [1.4, false, [[-2768.6, 4387.4], [-2762.1, 4391.2], [-2753.6, 4396.0], [-2748.1, 4399.2]]],
  [1.2, false, [[-2755.3, 4382.7], [-2762.1, 4391.2]]],
  [1.2, false, [[-2775.1, 4378.8], [-2779.8, 4371.2]]],
  [1.2, false, [[-2776.7, 4385.4], [-2786.4, 4386.7]]],
  [1.2, false, [[-2772.9, 4389.5], [-2778.3, 4401.2]]],
  [1.2, false, [[-2758.2, 4405.2], [-2753.6, 4396.0]]],
  // the walk past the tower (way 1473264467)
  [1.6, false, [[-2804.4, 4359.1], [-2797.5, 4355.9], [-2782.0, 4347.3], [-2749.7, 4352.5]]],
  // the west stair: from the garden's south gate down the river flank to the walk along the bank
  [1.8, true, [[-2767.7, 4406.8], [-2765.1, 4422.7], [-2758.5, 4434.2], [-2745.7, 4452.8], [-2725.6, 4481.4], [-2724.3, 4511.4], [-2712.0, 4537.0], [-2700.6, 4560.1], [-2700.8, 4563.5]]],
  // the walk along the bank (1473264465/68) and on up the north-west flank to the garden (1473264464, its top as imaged)
  [1.5, true, [[-2802.2, 4501.4], [-2816.3, 4485.9], [-2829.5, 4473.2], [-2844.4, 4461.4], [-2865.7, 4436.6], [-2877.6, 4415.8], [-2880.3, 4398.0], [-2863.0, 4387.5], [-2845.9, 4378.3], [-2825.0, 4368.6], [-2804.4, 4359.1], [-2795.8, 4359.7], [-2787.2, 4364.0], [-2785.9, 4373.9]]],
  [1.5, false, [[-2700.8, 4563.5], [-2715.1, 4558.8], [-2727.8, 4552.2], [-2737.5, 4546.3], [-2748.8, 4535.3], [-2761.6, 4529.4], [-2777.7, 4522.7], [-2786.2, 4514.4], [-2791.1, 4509.7], [-2802.2, 4501.4]]],
  [1.5, true, [[-2786.2, 4514.4], [-2797.4, 4527.6]]],
];

const PAVE = hex('#8e887a'); // weathered granite flags
const RISER = hex('#8d8676');
const PURPLE = hex('#5e3a6c'); // tím Huế, the tower's new paint
const TIMBER = hex('#8a6a48');
const CONCRETE = hex('#7c8170'); // mossy wartime concrete
const dark = hex('#2b2422');

const gy = (x, z) => LAND_Y + rise(x, z);
const inPoly = (r, x, z) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
const segDist = (x, z, a, b) => {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz;
  const t = L ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L)) : 0;
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
};
const hash = (i, k) => { const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); };

// a stone ribbon laid on the slope, sampled every ~1.5 m; on stairs a riser wherever it has climbed 0.45 m
function walk(S, w, steps, pts) {
  const fine = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.5));
    for (let k = 0; k < n; k++) fine.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  fine.push(pts[pts.length - 1]);
  const h = w / 2, lift = 0.07;
  let lastStep = gy(fine[0][0], fine[0][1]);
  for (let i = 0; i + 1 < fine.length; i++) {
    const a = fine[i], b = fine[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
    if (L < 1e-3) continue;
    const px = (-dz / L) * h, pz = (dx / L) * h;
    // both edges follow the ground across the slope too, so the ribbon does not hang out of a side cut
    const y = (x, z) => gy(x, z) + lift;
    S.quad([a[0] + px, y(a[0] + px, a[1] + pz), a[1] + pz], [b[0] + px, y(b[0] + px, b[1] + pz), b[1] + pz], [b[0] - px, y(b[0] - px, b[1] - pz), b[1] - pz], [a[0] - px, y(a[0] - px, a[1] - pz), a[1] - pz], PAVE, [0, 1, 0]);
    if (steps) {
      const yb = gy(b[0], b[1]);
      if (Math.abs(yb - lastStep) > 0.45) {
        S.box(b[0], b[1], Math.min(yb, lastStep) - 0.1, Math.max(yb, lastStep) + lift + 0.02, w + 0.3, 0.32, Math.atan2(dz, dx) + Math.PI / 2, RISER);
        lastStep = yb;
      }
    }
  }
}

// the rangers' fire-watch tower: four splayed steel legs braced at each storey, a zigzag stair inside, a timber-floored
// cabin with a rail and a pyramid roof on top (over 15 m in all)
function tower(S, c) {
  const g0 = Math.min(gy(c[0] - 2.5, c[1] - 2.5), gy(c[0] + 2.5, c[1] - 2.5), gy(c[0] - 2.5, c[1] + 2.5), gy(c[0] + 2.5, c[1] + 2.5)) - 0.3;
  const H = 13.2, b0 = 2.4, b1 = 1.45, ang = 0.62; // half-width at the foot and at the cabin floor
  const ux = Math.cos(ang), uz = Math.sin(ang);
  const at = (u, v, y) => { const t = (y - g0) / H, b = b0 + (b1 - b0) * t; return [c[0] + (u * ux - v * uz) * b, y, c[1] + (u * uz + v * ux) * b]; };
  S.base = g0 - LAND_Y;
  S.kind = KIND.MASONRY;
  for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const p = at(u, v, g0); S.box(p[0], p[2], g0 - 0.2, g0 + 0.5, 0.8, 0.8, ang, hex('#b6ad9a')); }
  S.kind = KIND.PLAIN;
  const C4 = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (const [u, v] of C4) S.beam(at(u, v, g0 + 0.4), at(u, v, g0 + H), 0.22, 0.22, PURPLE);
  const levels = [0.4, 3.6, 6.8, 10.0, H];
  for (let l = 0; l < levels.length; l++) {
    const y = g0 + levels[l];
    for (let k = 0; k < 4; k++) { const [u0, v0] = C4[k], [u1, v1] = C4[(k + 1) % 4]; S.beam(at(u0, v0, y), at(u1, v1, y), 0.12, 0.12, PURPLE); }
    if (l + 1 < levels.length) {
      const y1 = g0 + levels[l + 1];
      for (let k = 0; k < 4; k++) {
        const [u0, v0] = C4[k], [u1, v1] = C4[(k + 1) % 4];
        S.beam(at(u0, v0, y), at(u1, v1, y1), 0.07, 0.07, shade(PURPLE, 0.9));
        S.beam(at(u1, v1, y), at(u0, v0, y1), 0.07, 0.07, shade(PURPLE, 0.9));
      }
      // one stair flight per storey, alternating direction, with a small landing
      const s = l % 2 ? -1 : 1;
      S.beam(at(-0.55 * s, -0.2, y + 0.05), at(0.55 * s, -0.2, y1 - 0.05), 0.75, 0.1, TIMBER);
      const lp = at(0.55 * s, -0.2, y1);
      S.box(lp[0], lp[2], y1 - 0.12, y1, 0.9, 0.9, ang, TIMBER);
    }
  }
  // cabin: timber floor, half-height rail, four posts, pyramid roof
  const yf = g0 + H, cw = b1 * 2 + 0.9;
  S.box(c[0], c[1], yf - 0.18, yf, cw, cw, ang, TIMBER);
  const half = cw / 2 - 0.08;
  const P = (u, v, y) => [c[0] + u * ux - v * uz, y, c[1] + u * uz + v * ux];
  for (const [u, v] of C4) S.beam(P(u * half, v * half, yf), P(u * half, v * half, yf + 2.4), 0.14, 0.14, PURPLE);
  for (let k = 0; k < 4; k++) {
    const [u0, v0] = C4[k], [u1, v1] = C4[(k + 1) % 4];
    S.beam(P(u0 * half, v0 * half, yf + 1.0), P(u1 * half, v1 * half, yf + 1.0), 0.08, 0.1, PURPLE);
    // low timber apron under the rail
    const m = P((u0 + u1) * half / 2, (v0 + v1) * half / 2, 0);
    S.box(m[0], m[2], yf, yf + 0.55, k % 2 ? 0.06 : cw - 0.2, k % 2 ? cw - 0.2 : 0.06, ang, shade(TIMBER, 0.85));
  }
  S.kind = KIND.TILE;
  S.hip(c[0], c[1], cw, cw, ang, yf + 2.4, 1.5, hex('#6f5a6e'), { over: 0.45 });
  S.kind = KIND.PLAIN;
  S.base = 0;
  return yf + 4;
}

// a wartime pillbox: a squat mossy concrete drum with a thicker roof slab and a firing slit toward the river
function pillbox(S, x, z, face) {
  const gg = gy(x, z);
  S.base = gg - LAND_Y;
  S.kind = KIND.MASONRY;
  S.cyl(x, z, gg - 0.8, gg + 1.4, 2.4, 2.2, 8, CONCRETE, { cap: false });
  S.kind = KIND.PLAIN;
  S.cyl(x, z, gg + 1.4, gg + 1.85, 2.8, 2.6, 8, shade(CONCRETE, 0.92));
  S.box(x + Math.cos(face) * 2.3, z + Math.sin(face) * 2.3, gg + 0.6, gg + 0.95, 0.12, 1.8, face, dark);
  S.box(x - Math.cos(face) * 2.3, z - Math.sin(face) * 2.3, gg - 0.2, gg + 1.2, 0.12, 0.9, face, dark);
  S.base = 0;
}

export function build({ data, S, group }) {
  const lamps = [];
  S.kind = KIND.ROAD;
  for (const [w, steps, pts] of WALKS) walk(S, w, steps, pts);

  // ---- the lookout terrace at the brow, facing the bend: granite flags, a low stone parapet on the river side,
  // granite benches ----
  const fa = Math.atan2(RIVER[1] - VIEW[1], RIVER[0] - VIEW[0]);
  const fx = Math.cos(fa), fz = Math.sin(fa), qx = -fz, qz = fx;
  const T = (a, b) => [VIEW[0] + fx * a + qx * b, VIEW[1] + fz * a + qz * b];
  const TW = 7, TL = 13; // depth toward the river, width along the brow
  const corners = [T(-TW / 2, -TL / 2), T(TW / 2, -TL / 2), T(TW / 2, TL / 2), T(-TW / 2, TL / 2)];
  let lo = Infinity, hi = -Infinity;
  for (let a = -TW / 2; a <= TW / 2; a += 1.75) for (let b = -TL / 2; b <= TL / 2; b += 1.6) { const p = T(a, b), y = gy(p[0], p[1]); lo = Math.min(lo, y); hi = Math.max(hi, y); }
  const yt = hi + 0.25;
  const n0 = S.n;
  S.base = yt - LAND_Y;
  S.kind = KIND.MASONRY;
  S.prism(corners, lo - 0.4, yt, PAVE, PAVE, { topKind: KIND.ROAD });
  // parapet: a low wall along the front edge and returning down both ends, open at the back where the walks arrive
  const wall = (a0, b0, a1, b1) => {
    const p = T(a0, b0), q = T(a1, b1);
    S.box((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, yt, yt + 0.6, Math.hypot(q[0] - p[0], q[1] - p[1]), 0.35, Math.atan2(q[1] - p[1], q[0] - p[0]), hex('#b8af9c'));
  };
  wall(TW / 2 - 0.18, -TL / 2, TW / 2 - 0.18, TL / 2);
  wall(-TW / 2 + 1.5, -TL / 2 + 0.18, TW / 2, -TL / 2 + 0.18);
  wall(-TW / 2 + 1.5, TL / 2 - 0.18, TW / 2, TL / 2 - 0.18);
  S.kind = KIND.PLAIN;
  for (const b of [-4, 0, 4]) {
    const p = T(TW / 2 - 1.6, b);
    S.box(p[0], p[1], yt, yt + 0.42, 0.45, 1.8, fa, hex('#9c9484'));
  }
  (S.paved = S.paved || []).push([n0, S.n]);
  lamps.push([...T(-TW / 2 + 0.4, -TL / 2 + 0.4), yt], [...T(-TW / 2 + 0.4, TL / 2 - 0.4), yt]);
  for (const l of lamps) {
    S.base = l[2] - LAND_Y;
    S.cyl(l[0], l[1], l[2], l[2] + 3.0, 0.07, 0.06, 6, dark, { cap: false });
    S.box(l[0], l[1], l[2] + 3.0, l[2] + 3.35, 0.32, 0.32, 0, hex('#e9e2cf'));
  }

  // ---- the two pillboxes left from the war, on the brow below the lookout toward the river (positions estimated) ----
  for (const p of BUNKERS) pillbox(S, p[0], p[1], fa);

  // ---- the flower garden near the top (sim, tường vi, ngũ sắc): low flowering clumps round the round court ----
  S.kind = KIND.PLAIN;
  const blooms = [hex('#a0528f'), hex('#c46a9a'), hex('#8e4f9e'), hex('#d4889e'), hex('#e0a24a')];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + 0.2, r = 7.2 + (i % 3) * 1.2;
    const x = GARDEN[0] + Math.cos(a) * r, z = GARDEN[1] + Math.sin(a) * r, g = gy(x, z);
    const s = 0.7 + hash(i, 3) * 0.5;
    S.base = g - LAND_Y;
    S.cyl(x, z, g - 0.1, g + 0.55 * s, 0.75 * s, 0.45 * s, 6, blooms[i % blooms.length], { rot: hash(i, 4) });
  }
  // sim bushes along the main stair near the summit
  for (let i = 0; i < 14; i++) {
    const [w, , pts] = WALKS[0], k = i, a = pts[k], b = pts[k + 1];
    const side = i % 2 ? 1 : -1, dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
    const x = (a[0] + b[0]) / 2 + (-dz / L) * side * (w / 2 + 1.1), z = (a[1] + b[1]) / 2 + (dx / L) * side * (w / 2 + 1.1), g = gy(x, z);
    S.base = g - LAND_Y;
    S.cyl(x, z, g - 0.1, g + 0.6, 0.7, 0.4, 6, i % 3 ? hex('#5f7048') : blooms[0]);
  }

  // ---- the watch tower ----
  tower(S, TOWER);

  // ---- the rest stop: one storey on a low plinth, its walls and openings estimated (only the roof is seen) ----
  {
    const [[rx, rz], rl, rd, ra] = REST, cx = Math.cos(ra), cz = Math.sin(ra);
    const at = (u, v) => [rx + cx * u - cz * v, rz + cz * u + cx * v];
    let g0 = Infinity, g1 = -Infinity;
    for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const p = at((u * rl) / 2, (v * rd) / 2), g = gy(p[0], p[1]); g0 = Math.min(g0, g); g1 = Math.max(g1, g); }
    const yf = g1 + 0.35;
    S.base = g0 - LAND_Y;
    S.kind = KIND.MASONRY;
    S.box(rx, rz, g0 - 0.3, yf, rl + 1.2, rd + 1.2, ra, hex('#a49d8d'), { topKind: KIND.ROAD });
    S.box(rx, rz, yf, yf + 3.1, rl - 0.6, rd - 0.6, ra, hex('#ddd5c2'));
    S.kind = KIND.PLAIN;
    // doors and windows on the long sides, a dark band of glass
    for (const s of [-1, 1]) {
      const p = at(0, s * ((rd - 0.6) / 2 + 0.03));
      S.box(p[0], p[1], yf + 0.9, yf + 2.3, rl - 2.6, 0.06, ra, dark);
      const d = at(-rl / 2 + 2.0, s * ((rd - 0.6) / 2 + 0.04));
      S.box(d[0], d[1], yf, yf + 2.4, 1.2, 0.06, ra, shade(TIMBER, 0.7));
    }
    S.kind = KIND.TILE;
    S.hip(rx, rz, rl, rd, ra, yf + 3.1, 1.9, hex('#4a4f55'), { over: 0.6 });
    S.kind = KIND.PLAIN;
    S.base = 0;
  }

  // ---- lamps along the main stair (new in 2024): a post every ~30 m ----
  {
    const pts = WALKS[0][2];
    let acc = 0;
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      acc += L;
      if (acc < 30) continue;
      acc = 0;
      const x = b[0] + (-(b[1] - a[1]) / L) * 1.8, z = b[1] + ((b[0] - a[0]) / L) * 1.8, g = gy(x, z);
      S.base = g - LAND_Y;
      S.cyl(x, z, g, g + 3.0, 0.07, 0.06, 6, dark, { cap: false });
      S.box(x, z, g + 3.0, g + 3.35, 0.32, 0.32, 0, hex('#e9e2cf'));
      lamps.push([x, z, g]);
    }
  }
  S.kind = KIND.PLAIN;
  S.base = 0;

  // ---- the pines: the hill is a pine wood (replanted from the early 2000s); keep the lookout, the tower's foot and the
  // garden open and the walks clear of trunks ----
  const clearOf = (x, z, pad) => open.some(([c, r]) => Math.hypot(x - c[0], z - c[1]) < r + pad) || WALKS.some(([w, , pts]) => pts.some((p, k) => k + 1 < pts.length && segDist(x, z, p, pts[k + 1]) < w / 2 + 0.9 + pad));
  const open = [[VIEW, 15], [TOWER, 5], [GARDEN, 12], [REST[0], 8], ...BUNKERS.map((b) => [b, 4])];
  if (Array.isArray(data.trees)) {
    const t = data.trees, counts = data.meta && data.meta.counts;
    for (let i = t.length / 4 - 1; i >= 0; i--) {
      const x = t[i * 4] / 10, z = t[i * 4 + 1] / 10;
      if (x < -2960 || x > -2340 || z < 4150 || z > 4820) continue;
      if (clearOf(x, z, 0)) { t.splice(i * 4, 4); if (counts && counts.treesNear != null && i < counts.treesNear) counts.treesNear--; continue; }
      if (inPoly(FOREST, x, z) && hash(i, 9) < 0.9) t[i * 4 + 3] = 3; // pine
    }
    // the mapped trees are far sparser than the wood: fill it with pines on a jittered 8 m grid, kept off the walks
    // and the open ground, and off the mapped trees' own crowns
    const have = [];
    for (let i = 0; i < t.length / 4; i++) { const x = t[i * 4] / 10, z = t[i * 4 + 1] / 10; if (x > -2960 && x < -2340 && z > 4150 && z < 4820) have.push([x, z]); }
    const add = [];
    let k = 0;
    for (let z = 4166; z < 4806; z += 8) for (let x = -2942; x < -2350; x += 8) {
      k++;
      const px = x + (hash(k, 1) - 0.5) * 6, pz = z + (hash(k, 2) - 0.5) * 6;
      if (!inPoly(FOREST, px, pz) || rise(px, pz) < 1 || hash(k, 3) < 0.2 || clearOf(px, pz, 0.6)) continue;
      if (have.some(([hx, hz]) => Math.abs(hx - px) < 4 && Math.abs(hz - pz) < 4)) continue;
      add.push(Math.round(px * 10), Math.round(pz * 10), 9 + Math.floor(hash(k, 4) * 6), 3);
    }
    const near = counts && counts.treesNear != null ? counts.treesNear : t.length / 4;
    t.splice(near * 4, 0, ...add);
    if (counts && counts.treesNear != null) counts.treesNear += add.length / 4;
  }

  if (lamps.length) {
    const pos = [], col = [];
    for (const [x, z, g] of lamps) { pos.push(x, g + 3.2, z); col.push(1, 0.8, 0.52); }
    const pts = glowPoints(pos, col, 5);
    pts.userData.glow = true;
    pts.userData.landmark = id;
    group.add(pts);
  }
}
