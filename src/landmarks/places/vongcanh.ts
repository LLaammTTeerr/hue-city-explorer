import { KIND, hex, shade } from '../../geo/buf.ts';
import { LAND_Y } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { glowPoints } from '../../geo/materials.ts';

// Đồi Vọng Cảnh: the pine hill (about 43 m above sea level) on the right bank of the Hương in Thủy Xuân / Thủy Biều,
// standing over the bend opposite điện Hòn Chén. Sources and estimates: docs/places/vongcanh.md.
//
// Where it is: OSM maps the hill as the forest way 1075018793 "Vong Canh Hill", its viewpoint as the node 4603986390
// (tourism=attraction), the forest rangers' lookout tower as node 13516013279 (man_made=tower, observation) and the
// stone-paved walks and steps up the hill (ways 1075018785…91, 1200924922…33, 1473264464…68). This file draws every
// one of those walks itself, where and as wide as Google's satellite imagery (November 2026) shows them, and
// scripts/build-data.mjs leaves the OSM ways out (HAND_WAYS), so each walk exists once. The place record comes from the
// viewpoint node, moved onto the highest ground near it (build-data.mjs); the terrain grid already has the hill.
//
// What stands there today (after the 13-billion-đồng clean-up finished in 2024, tuoitre.vn), as the imagery places it:
// - at the foot by the road, a paved teardrop court (about 65 × 35 m) round a 29 m labyrinth of concentric lawn rings
//   edged with box hedge on red-brick kerbs, slate flag paths between (Street View photosphere taken in the court);
// - near the top, the flower garden: eight lobed beds round a small round bed, flag paths between the lobes;
// - beside it the "Sunset View Point": the rangers' fire-watch tower (repainted Huế purple, used as a lookout) and a low
//   flat-topped block 10 × 5 m at its foot, both seen only from above;
// - a 5 m paved lane with a parking apron from Huyền Trân Công Chúa down to the garden, and the rest stop beside it;
// - stone stairs and walks down through the pines to the court, the river and the east road.
// Not modelled: a separate river terrace and the pillboxes (the imagery shows unbroken canopy where they were guessed).

export const id = 'vongcanh';
// how far from the place point this builder reads data.trees (the pine wood's box below reaches about 500 m from the
// record's point on the brow); build-data.mjs keeps every record within it in hue.json, out of the tiles (default 520 m)
export const dataReach = 540;

// the Sunset View Point (Google's marker): the tower's top seen from above as nested squares about 6 × 3.5 m, the
// long axis about 48° off east; its foot is taken under that centre (the OSM node 13516013279 is 6 m north-east)
const TOWER = [-2783.8, 4354.3];
const TOWER_ANG = 0.84;
// the brown flat-topped block against the tower's south-west side: 10.3 × 5.1 m, long side along TOWER_ANG; height and
// use unknown (a low deck or platform: its shadow is under 1 m wide at a high sun) [centre, length, depth]
const DECK: [[number, number], number, number] = [[-2791.8, 4356.0], 10.3, 5.1];
// the rest stop (trạm dừng) beside the lane, built after the 2024 works: a dark hip roof about 9.5 × 7 m in the
// imagery, its long side about 20° south of east; cream walls under it (a car-roof photosphere from the lane)
const REST: [[number, number], number, number, number] = [[-2725.4, 4356.6], 9.5, 7.0, 0.35];
// the round court at the foot: centre of the rings, and its paved teardrop (a round end about 16.5 m in radius,
// tapering north-west to where the east-flank walk comes in)
const COURT = [-2465.8, 4665.5];
const COURT_R = 16.5, COURT_C = [-2466.5, 4667.0], COURT_TIP = [-2503.0, 4635.0];
// rings from the centre out (m): lawn disc, then bed / path bands; labyrinth gaps (angle, rad, from +x toward +z)
const RINGS: { lawn: number; beds: [number, number, number[]][] } = { lawn: 6.0, beds: [[7.6, 9.1, [-2.86]], [10.3, 11.9, [-0.82, 2.29]], [13.1, 14.6, [0.58]]] };
// the garden's lobed beds [cx, cz, rx, rz, rot (rx along rot from +x), fill]: measured on the z20 satellite
const LOBES: [number, number, number, number, number, string][] = [
  [-2771.6, 4382.8, 3.0, 3.0, 0, 'shrub'], // the small round bed in the middle
  [-2782.6, 4379.0, 5.8, 5.9, 0, 'shrub'],
  [-2772.4, 4371.6, 4.8, 3.2, 0.1, 'lawn'],
  [-2762.0, 4379.6, 8.3, 4.4, 1.25, 'lawn'],
  [-2765.6, 4396.6, 9.6, 6.0, 0.17, 'lawn'],
  [-2781.0, 4392.4, 4.4, 5.6, 0, 'dry'],
  [-2751.8, 4390.0, 6.6, 4.8, 1.4, 'dry'],
  [-2752.0, 4403.6, 4.3, 3.3, 1.4, 'dry'],
];
const GARDEN = [-2770.0, 4388.0];
const GARDEN_PATH = 1.7; // flag path round each lobe
// the parking apron where the lane meets the garden's north-east corner [centre, length, depth, angle]
const APRON: [[number, number], number, number, number] = [[-2736.5, 4344.0], 15.0, 11.0, 0.9];

// the hill's forest outline (OSM way 1075018793)
const FOREST = [[-2863.3, 4456.3], [-2935.7, 4392.5], [-2940.8, 4379.9], [-2937.1, 4364.9], [-2919.5, 4344.0], [-2898.4, 4314.5], [-2896.6, 4305.2], [-2899.3, 4294.9], [-2916.3, 4275.5], [-2935.7, 4260.0], [-2940.1, 4251.4], [-2939.5, 4234.9], [-2928.5, 4215.1], [-2913.7, 4198.2], [-2880.6, 4171.4], [-2850.6, 4166.6], [-2826.3, 4168.8], [-2787.9, 4195.9], [-2757.4, 4249.6], [-2707.9, 4326.2], [-2657.9, 4397.8], [-2627.6, 4431.6], [-2603.0, 4457.0], [-2577.8, 4468.8], [-2551.1, 4468.6], [-2536.3, 4464.0], [-2516.5, 4461.4], [-2493.8, 4465.8], [-2482.4, 4475.1], [-2477.6, 4491.9], [-2476.2, 4505.6], [-2474.8, 4526.1], [-2467.4, 4542.5], [-2447.6, 4563.8], [-2422.9, 4581.9], [-2416.5, 4591.6], [-2409.6, 4615.1], [-2402.1, 4636.4], [-2383.9, 4665.0], [-2369.2, 4683.4], [-2360.9, 4696.0], [-2354.5, 4712.4], [-2352.6, 4741.9], [-2355.8, 4758.4], [-2364.3, 4769.5], [-2379.6, 4783.0], [-2396.3, 4797.1], [-2409.4, 4805.2], [-2422.4, 4804.3], [-2436.4, 4802.5], [-2445.7, 4798.9], [-2453.9, 4790.1], [-2455.3, 4780.8], [-2456.6, 4769.0], [-2465.1, 4758.9], [-2479.2, 4756.9], [-2491.9, 4762.0], [-2504.8, 4758.8], [-2515.6, 4751.5], [-2525.4, 4741.6], [-2539.9, 4733.8], [-2557.2, 4730.6], [-2570.2, 4726.2], [-2585.6, 4710.7], [-2598.7, 4685.5], [-2637.7, 4643.3], [-2661.5, 4622.3], [-2683.1, 4608.7], [-2717.4, 4580.8], [-2741.8, 4560.3], [-2779.6, 4533.6], [-2832.1, 4489.0]];

// walks: [width, steps?, points]. Widths as the imagery reads them (the main stair about 3.5 m across at z19).
const WALKS = [
  // the main stone stair: from the garden's south-east corner straight down the crest to the round court
  [3.4, true, [[-2748.6, 4406.5], [-2737.0, 4420.5], [-2725.7, 4432.7], [-2712.5, 4446.5], [-2699.8, 4459.9], [-2676.9, 4475.7], [-2655.1, 4491.2], [-2645.5, 4503.0], [-2636.6, 4514.8], [-2620.5, 4541.8], [-2604.6, 4568.7], [-2589.5, 4587.0], [-2580.5, 4614.0], [-2573.5, 4639.2], [-2561.5, 4656.0], [-2539.8, 4654.7], [-2522.1, 4672.9], [-2511.0, 4662.0], [-2497.0, 4648.5]]],
  // its branch down to the lane past the cafés on the south side
  [2.4, true, [[-2522.1, 4672.9], [-2538.1, 4679.6], [-2544.0, 4694.8], [-2546.5, 4705.0]]],
  // the trail from Huyền Trân Công Chúa down to the stair (way 1075018789; faint under the pines, kept narrow)
  [1.4, false, [[-2642.3, 4411.3], [-2646.3, 4443.7], [-2647.4, 4458.5], [-2648.0, 4475.9], [-2650.3, 4489.8], [-2653.6, 4492.6]]],
  // the paved walk along the east flank, from the court's tip to the north gate (way 1075018790)
  [2.8, false, [[-2503.0, 4635.0], [-2511.1, 4630.9], [-2518.0, 4618.7], [-2535.5, 4595.9], [-2550.1, 4571.2], [-2566.1, 4546.4], [-2589.6, 4512.9], [-2600.2, 4487.8], [-2612.8, 4468.2], [-2624.5, 4446.9], [-2633.7, 4430.4], [-2642.3, 4411.3], [-2645.0, 4398.0]]],
  // the paved lane from Huyền Trân Công Chúa down past the apron to the garden (about 5 m, cars park on it)
  [5.0, false, [[-2713.0, 4309.0], [-2723.1, 4316.8], [-2738.8, 4336.8], [-2748.9, 4349.7], [-2757.5, 4361.2], [-2762.5, 4368.5]]],
  // the walk from the apron to the rest stop's door
  [2.4, false, [[-2731.0, 4348.5], [-2729.5, 4352.0]]],
  // the walk past the tower: from the west, round the deck's south side, to the garden's north lobe
  [2.4, false, [[-2808.0, 4359.6], [-2798.5, 4362.0], [-2789.5, 4363.6], [-2781.0, 4367.4], [-2776.5, 4367.6]]],
  // the west stair: from the garden's south gate down the river flank to the walk along the bank
  [3.0, true, [[-2768.5, 4404.5], [-2765.1, 4422.7], [-2758.5, 4434.2], [-2745.7, 4452.8], [-2725.6, 4481.4], [-2724.3, 4511.4], [-2712.0, 4537.0], [-2700.6, 4560.1], [-2700.8, 4563.5]]],
  // the walk along the bank (1473264465/68) and on up the north-west flank to the garden (1473264464, its top as imaged)
  [3.2, true, [[-2802.2, 4501.4], [-2816.3, 4485.9], [-2829.5, 4473.2], [-2844.4, 4461.4], [-2865.7, 4436.6], [-2877.6, 4415.8], [-2880.3, 4398.0], [-2863.0, 4387.5], [-2845.9, 4378.3], [-2825.0, 4368.6], [-2808.0, 4359.6]]],
  [3.2, false, [[-2808.0, 4359.6], [-2798.0, 4365.5], [-2790.5, 4370.5], [-2787.0, 4374.5]]],
  [3.2, false, [[-2700.8, 4563.5], [-2715.1, 4558.8], [-2727.8, 4552.2], [-2737.5, 4546.3], [-2748.8, 4535.3], [-2761.6, 4529.4], [-2777.7, 4522.7], [-2786.2, 4514.4], [-2791.1, 4509.7], [-2802.2, 4501.4]]],
  [2.0, true, [[-2786.2, 4514.4], [-2797.4, 4527.6]]],
];

const PAVE = hex('#84858a'); // blue-grey slate flags (Street View, court)
const RISER = hex('#8d8676');
const PURPLE = hex('#5e3a6c'); // tím Huế, the tower's new paint
const TIMBER = hex('#8a6a48');
const LAWN = hex('#6f8a45'), SHRUB = hex('#4d6338'), DRY = hex('#8a8a5a');
const HEDGE = hex('#4f6a36'), BRICK = hex('#9c4b36');
const dark = hex('#2b2422');

const gy = (x, z) => LAND_Y + rise(x, z);
const inPoly = (r, x, z) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
const segDist = (x, z, a, b) => {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz;
  const t = L ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L)) : 0;
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
};
const hash = (i, k) => { const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); };

// a lobe's normalised radius at (x, z), grown by pad metres (< 1 inside)
const lobeE = (L, x, z, pad = 0) => {
  const [cx, cz, rx, rz, a] = L, c = Math.cos(a), s = Math.sin(a), dx = x - cx, dz = z - cz;
  const u = (dx * c + dz * s) / (rx + pad), v = (-dx * s + dz * c) / (rz + pad);
  return u * u + v * v;
};
const lobePt = (L, t, inset = 0) => {
  const [cx, cz, rx, rz, a] = L, c = Math.cos(a), s = Math.sin(a), u = Math.cos(t) * (rx - inset), v = Math.sin(t) * (rz - inset);
  return [cx + u * c - v * s, cz + u * s + v * c];
};
// the court's paved teardrop: the round end, and the triangle from its tangents to the tip
const COURT_TAN = (() => {
  const dx = COURT_TIP[0] - COURT_C[0], dz = COURT_TIP[1] - COURT_C[1], d = Math.hypot(dx, dz), b = Math.atan2(dz, dx), h = Math.acos(COURT_R / d);
  return [b - h, b + h].map((t) => [COURT_C[0] + Math.cos(t) * COURT_R, COURT_C[1] + Math.sin(t) * COURT_R]);
})();
const inCourt = (x, z, pad = 0) => Math.hypot(x - COURT_C[0], z - COURT_C[1]) < COURT_R + pad || inPoly([COURT_TAN[0], COURT_TIP, COURT_TAN[1]], x, z);
const inGarden = (x, z, pad = 0) => LOBES.some((L) => lobeE(L, x, z, GARDEN_PATH + pad) < 1);
const apronAt = (u, v) => { const [[x, z], , , a] = APRON; return [x + Math.cos(a) * u - Math.sin(a) * v, z + Math.sin(a) * u + Math.cos(a) * v]; };
const inApron = (x, z, pad = 0) => {
  const [[cx, cz], l, d, a] = APRON, dx = x - cx, dz = z - cz;
  return Math.abs(dx * Math.cos(a) + dz * Math.sin(a)) < l / 2 + pad && Math.abs(-dx * Math.sin(a) + dz * Math.cos(a)) < d / 2 + pad;
};

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

// ground cover laid on the slope cell by cell: f(x, z) gives a colour (or null) for the cell's centre
function drape(S, x0, x1, z0, z1, cell, lift, f) {
  for (let z = z0; z < z1; z += cell) for (let x = x0; x < x1; x += cell) {
    const col = f(x + cell / 2, z + cell / 2);
    if (col == null) continue;
    const y = (px, pz) => gy(px, pz) + lift;
    S.quad([x, y(x, z), z], [x, y(x, z + cell), z + cell], [x + cell, y(x + cell, z + cell), z + cell], [x + cell, y(x + cell, z), z], col, [0, 1, 0]);
  }
}

// a bed edge along a closed or open curve: a red-brick kerb, and a low clipped box hedge just inside it
function edging(S, pts, inward, hedge = true) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
    if (L < 1e-3) continue;
    const ang = Math.atan2(dz, dx), nx = (-dz / L) * inward, nz = (dx / L) * inward;
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, g = Math.min(gy(a[0], a[1]), gy(b[0], b[1]));
    S.base = g - LAND_Y;
    S.box(mx, mz, g - 0.08, g + 0.16, L + 0.06, 0.24, ang, BRICK);
    if (hedge) S.box(mx + nx * 0.42, mz + nz * 0.42, g - 0.05, g + 0.55, L + 0.1, 0.55, ang, HEDGE);
  }
}

// the rangers' fire-watch tower: four splayed steel legs braced at each storey, a zigzag stair inside, a timber-floored
// cabin with a rail and a pyramid roof on top (over 15 m in all)
function tower(S, c, ang) {
  const g0 = Math.min(gy(c[0] - 2.5, c[1] - 2.5), gy(c[0] + 2.5, c[1] - 2.5), gy(c[0] - 2.5, c[1] + 2.5), gy(c[0] + 2.5, c[1] + 2.5)) - 0.3;
  const H = 13.2, b0 = 2.4, b1 = 1.45; // half-width at the foot and at the cabin floor
  const ux = Math.cos(ang), uz = Math.sin(ang);
  const at = (u, v, y) => { const t = (y - g0) / H, b = b0 + (b1 - b0) * t; return [c[0] + (u * ux - v * uz) * b, y, c[1] + (u * uz + v * ux) * b]; };
  S.base = g0 - LAND_Y;
  S.kind = KIND.MASONRY;
  for (const [u, v] of ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as any[])) { const p = at(u, v, g0); S.box(p[0], p[2], g0 - 0.2, g0 + 0.5, 0.8, 0.8, ang, hex('#b6ad9a')); }
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
  const P = (u, v, y): [number, number, number] => [c[0] + u * ux - v * uz, y, c[1] + u * uz + v * ux];
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

export function build({ data, S, group }) {
  const lamps = [];
  S.kind = KIND.ROAD;
  for (const [w, steps, pts] of WALKS) walk(S, w, steps, pts);

  // ---- the round court at the foot: a paved teardrop, and on it a labyrinth of lawn rings edged with box hedge on
  // red-brick kerbs (Street View: lawn beds, kerbs, slate flags, benches under the pines) ----
  {
    const [cx, cz] = COURT, r = (x, z) => Math.hypot(x - cx, z - cz);
    const ringBed = (x, z) => {
      const d = r(x, z), t = Math.atan2(z - cz, x - cx);
      if (d < RINGS.lawn) return true;
      for (const [r0, r1, gaps] of RINGS.beds) {
        if (d < r0 || d > r1) continue;
        return !gaps.some((g) => Math.abs(Math.atan2(Math.sin(t - g), Math.cos(t - g))) * d < 1.1);
      }
      return false;
    };
    const n0 = S.n;
    S.kind = KIND.ROAD;
    S.base = 0;
    drape(S, COURT_TIP[0] - 1, COURT_C[0] + COURT_R + 1, COURT_TIP[1] - 1, COURT_C[1] + COURT_R + 1, 0.8, 0.07, (x, z) => (inCourt(x, z) && !ringBed(x, z) ? PAVE : null));
    S.kind = KIND.PLAIN;
    drape(S, cx - 15, cx + 15, cz - 15, cz + 15, 0.5, 0.1, (x, z) => (ringBed(x, z) ? LAWN : null));
    (S.paved = S.paved || []).push([n0, S.n]);
    // edging: the lawn disc, and both sides of every ring bed, broken at the gaps
    const arc = (R, t0, t1, inward) => {
      const n = Math.max(2, Math.ceil(((t1 - t0) * R) / 0.9)), pts = [];
      for (let k = 0; k <= n; k++) { const t = t0 + ((t1 - t0) * k) / n; pts.push([cx + Math.cos(t) * R, cz + Math.sin(t) * R]); }
      edging(S, pts, inward);
    };
    arc(RINGS.lawn, 0, Math.PI * 2, 1);
    for (const [r0, r1, gaps] of RINGS.beds) {
      const gs = gaps.slice().sort((a, b) => a - b);
      for (let i = 0; i < gs.length; i++) {
        const a = gs[i] + 1.1 / r1, b = (i + 1 < gs.length ? gs[i + 1] : gs[0] + Math.PI * 2) - 1.1 / r1;
        arc(r0, a, b, -1);
        arc(r1, a, b, 1);
      }
    }
    // benches round the paved apron, and lamps at the tip and round the rim
    for (let k = 0; k < 7; k++) {
      const t = -2.6 + k * 0.62, R = COURT_R - 0.9, x = COURT_C[0] + Math.cos(t) * R, z = COURT_C[1] + Math.sin(t) * R, g = gy(x, z);
      S.base = g - LAND_Y;
      S.box(x, z, g + 0.38, g + 0.45, 0.45, 1.6, t, hex('#9c9484'));
      S.box(x, z, g, g + 0.38, 0.3, 1.2, t, hex('#857d6e'));
    }
    for (const t of [-2.2, -0.6, 1.0, 2.6]) { const x = COURT_C[0] + Math.cos(t) * (COURT_R - 0.4), z = COURT_C[1] + Math.sin(t) * (COURT_R - 0.4); lamps.push([x, z, gy(x, z)]); }
  }

  // ---- the flower garden near the top (sim, tường vi, ngũ sắc): lobed beds on a slate-flagged ground, each bed
  // kerbed in brick, the paths running between the lobes ----
  {
    const n0 = S.n;
    S.kind = KIND.ROAD;
    S.base = 0;
    const B = [GARDEN[0] - 24, GARDEN[0] + 22, GARDEN[1] - 24, GARDEN[1] + 22];
    drape(S, B[0], B[1], B[2], B[3], 0.7, 0.07, (x, z) => (inGarden(x, z) && !LOBES.some((L) => lobeE(L, x, z) < 1) ? PAVE : null));
    S.kind = KIND.PLAIN;
    const FILL = { lawn: LAWN, shrub: SHRUB, dry: DRY };
    drape(S, B[0], B[1], B[2], B[3], 0.5, 0.1, (x, z) => { const L = LOBES.find((q) => lobeE(q, x, z) < 1); return L ? FILL[L[5]] : null; });
    (S.paved = S.paved || []).push([n0, S.n]);
    for (const L of LOBES) {
      const pts = [];
      for (let k = 0; k <= 36; k++) pts.push(lobePt(L, (k / 36) * Math.PI * 2));
      edging(S, pts, 1, false);
      // planting: vibrant sim, tường vi, ngũ sắc & marigold flowering clumps in the shrub beds, a few in the lawns
      const FLW = [hex('#56703f'), hex('#b84c8e'), hex('#d96846'), hex('#e6b83a'), hex('#8a52a8')];
      const n = L[5] === 'shrub' ? Math.round(L[2] * L[3] * 0.72) : L[5] === 'lawn' ? 5 : 2;
      for (let i = 0; i < n; i++) {
        const t = hash(i, L[0]) * Math.PI * 2, rr = Math.sqrt(hash(i, L[1])) * 0.82;
        const [x, z] = lobePt(L, t, 0), px = L[0] + (x - L[0]) * rr, pz = L[1] + (z - L[1]) * rr, g = gy(px, pz);
        const s = 0.7 + hash(i, 7) * 0.6;
        S.base = g - LAND_Y;
        S.cyl(px, pz, g, g + 0.68 * s, 0.68 * s, 0.46 * s, 6, FLW[i % FLW.length], { rot: hash(i, 4) });
      }
    }
    // the lane's parking apron
    S.kind = KIND.ROAD;
    S.base = 0;
    const [[ax, az], al, ad] = APRON, rr = Math.hypot(al, ad) / 2 + 1;
    drape(S, ax - rr, ax + rr, az - rr, az + rr, 0.8, 0.075, (x, z) => (inApron(x, z) ? PAVE : null));
    S.kind = KIND.PLAIN;
  }

  // ---- the Sunset View Point: the watch tower, and the low block at its foot ----
  tower(S, TOWER, TOWER_ANG);
  {
    const [[dx, dz], dl, dd] = DECK, ca = Math.cos(TOWER_ANG), sa = Math.sin(TOWER_ANG);
    const at = (u, v): [number, number] => [dx + ca * u - sa * v, dz + sa * u + ca * v];
    let g0 = Infinity, g1 = -Infinity;
    for (let u = -dl / 2; u <= dl / 2 + 1e-6; u += dl / 4) for (let v = -dd / 2; v <= dd / 2 + 1e-6; v += dd / 2) { const p = at(u, v), g = gy(p[0], p[1]); g0 = Math.min(g0, g); g1 = Math.max(g1, g); }
    const yt = g1 + 0.9;
    S.base = g0 - LAND_Y;
    S.kind = KIND.MASONRY;
    S.box(dx, dz, g0 - 1.2, yt, dl, dd, TOWER_ANG, hex('#8a7058'), { top: hex('#7a5f48') });
    S.kind = KIND.PLAIN;
    // a low rail round the top
    for (const [u0, v0, u1, v1] of ([[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]] as any[])) {
      const p = at((u0 * dl) / 2, (v0 * dd) / 2), q = at((u1 * dl) / 2, (v1 * dd) / 2);
      S.box((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, yt, yt + 0.9, Math.hypot(q[0] - p[0], q[1] - p[1]), 0.12, Math.atan2(q[1] - p[1], q[0] - p[0]), shade(TIMBER, 0.8));
    }
    S.base = 0;
  }

  // ---- the rest stop: one storey of cream walls on a low plinth, a dark hip roof (roof from the imagery, walls from a
  // photosphere taken from the lane) ----
  {
    const [[rx, rz], rl, rd, ra] = REST, cx = Math.cos(ra), cz = Math.sin(ra);
    const at = (u, v): [number, number] => [rx + cx * u - cz * v, rz + cz * u + cx * v];
    let g0 = Infinity, g1 = -Infinity;
    // the plinth's own footprint, sampled on a grid; its foot is bedded 1.6 m below the lowest sample because the
    // terrain mesh between its vertices dips below rise() on this slope
    for (let u = -(rl + 1.2) / 2; u <= (rl + 1.2) / 2 + 1e-6; u += (rl + 1.2) / 4) for (let v = -(rd + 1.2) / 2; v <= (rd + 1.2) / 2 + 1e-6; v += (rd + 1.2) / 4) { const p = at(u, v), g = gy(p[0], p[1]); g0 = Math.min(g0, g); g1 = Math.max(g1, g); }
    const yf = g1 + 0.35;
    S.base = g0 - LAND_Y;
    S.kind = KIND.MASONRY;
    S.box(rx, rz, g0 - 1.6, yf, rl + 1.2, rd + 1.2, ra, hex('#a49d8d'), { topKind: KIND.ROAD });
    S.kind = KIND.PLAIN;
    S.box(rx, rz, yf, yf + 3.1, rl - 0.6, rd - 0.6, ra, hex('#e2dccb'));
    // doors and windows on the long sides
    for (const s of [-1, 1]) {
      for (const u of [-2.6, 0, 2.6]) {
        const p = at(u, s * ((rd - 0.6) / 2 + 0.03));
        S.box(p[0], p[1], yf + 0.9, yf + 2.3, 1.5, 0.06, ra, dark);
      }
      const d = at(-rl / 2 + 1.3, s * ((rd - 0.6) / 2 + 0.04));
      S.box(d[0], d[1], yf, yf + 2.4, 1.0, 0.06, ra, shade(TIMBER, 0.7));
    }
    S.kind = KIND.TILE;
    S.hip(rx, rz, rl, rd, ra, yf + 3.1, 1.9, hex('#4a4f55'), { over: 0.6 });
    S.kind = KIND.PLAIN;
    S.base = 0;
  }

  // ---- lamps along the main stair (new in 2024): a post every ~30 m ----
  {
    const [w, , pts] = WALKS[0] as [number, boolean, [number, number][]];
    let acc = 0;
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      acc += L;
      if (acc < 30) continue;
      acc = 0;
      const x = b[0] + (-(b[1] - a[1]) / L) * (w / 2 + 0.6), z = b[1] + ((b[0] - a[0]) / L) * (w / 2 + 0.6);
      lamps.push([x, z, gy(x, z)]);
    }
  }
  for (const [x, z, g] of lamps) {
    S.base = g - LAND_Y;
    S.cyl(x, z, g, g + 3.0, 0.07, 0.06, 6, dark, { cap: false });
    S.box(x, z, g + 3.0, g + 3.35, 0.32, 0.32, 0, hex('#e9e2cf'));
  }
  S.kind = KIND.PLAIN;
  S.base = 0;

  // ---- the pines: the hill is a pine wood (replanted from the early 2000s); keep the court, the garden, the apron,
  // the tower's foot and the rest stop open and the walks clear of trunks ----
  const open = [[TOWER, 4.5], [DECK[0], 7], [REST[0], 7.5]];
  const clearOf = (x, z, pad) => inCourt(x, z, 1 + pad) || inGarden(x, z, 1 + pad) || inApron(x, z, 1.5 + pad)
    || open.some(([c, r]) => Math.hypot(x - c[0], z - c[1]) < r + pad)
    || (WALKS as [number, boolean, [number, number][]][]).some(([w, , pts]) => pts.some((p, k) => k + 1 < pts.length && segDist(x, z, p, pts[k + 1]) < w / 2 + 0.9 + pad));
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
