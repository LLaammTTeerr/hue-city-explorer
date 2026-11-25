import { KIND, hex, shade } from '../../geo/buf.ts';
import { LAND_Y } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { glowPoints } from '../../geo/materials.ts';

// Đồi Vọng Cảnh: the pine hill (~43 m ASL) on the right bank of the Hương in Thủy Xuân / Thủy Biều.
// Sources and estimates: docs/places/vongcanh.md.
export const id = 'vongcanh';
export const dataReach = 540;

const TOWER_POS = [-2783.8, 4354.3];
const TOWER_ANG = 0.84;
const DECK_SPEC: [[number, number], number, number] = [[-2791.8, 4356.0], 10.3, 5.1];
const REST_SPEC: [[number, number], number, number, number] = [[-2725.4, 4356.6], 9.5, 7.0, 0.35];
const COURT_CENTER = [-2465.8, 4665.5];
const COURT_RADIUS = 16.5;
const COURT_DISC_CENTER = [-2466.5, 4667.0];
const COURT_TIP = [-2503.0, 4635.0];

const LABYRINTH_RINGS: { lawn: number; beds: [number, number, number[]][] } = {
  lawn: 6.0,
  beds: [[7.6, 9.1, [-2.86]], [10.3, 11.9, [-0.82, 2.29]], [13.1, 14.6, [0.58]]],
};

const GARDEN_LOBES: [number, number, number, number, number, string][] = [
  [-2771.6, 4382.8, 3.0, 3.0, 0, 'shrub'],
  [-2782.6, 4379.0, 5.8, 5.9, 0, 'shrub'],
  [-2772.4, 4371.6, 4.8, 3.2, 0.1, 'lawn'],
  [-2762.0, 4379.6, 8.3, 4.4, 1.25, 'lawn'],
  [-2765.6, 4396.6, 9.6, 6.0, 0.17, 'lawn'],
  [-2781.0, 4392.4, 4.4, 5.6, 0, 'dry'],
  [-2751.8, 4390.0, 6.6, 4.8, 1.4, 'dry'],
  [-2752.0, 4403.6, 4.3, 3.3, 1.4, 'dry'],
];
const GARDEN_CENTER = [-2770.0, 4388.0];
const GARDEN_PATH_W = 1.7;
const APRON_SPEC: [[number, number], number, number, number] = [[-2736.5, 4344.0], 15.0, 11.0, 0.9];

const FOREST_RING = [
  [-2863.3, 4456.3], [-2935.7, 4392.5], [-2940.8, 4379.9], [-2937.1, 4364.9], [-2919.5, 4344.0], [-2898.4, 4314.5],
  [-2896.6, 4305.2], [-2899.3, 4294.9], [-2916.3, 4275.5], [-2935.7, 4260.0], [-2940.1, 4251.4], [-2939.5, 4234.9],
  [-2928.5, 4215.1], [-2913.7, 4198.2], [-2880.6, 4171.4], [-2850.6, 4166.6], [-2826.3, 4168.8], [-2787.9, 4195.9],
  [-2757.4, 4249.6], [-2707.9, 4326.2], [-2657.9, 4397.8], [-2627.6, 4431.6], [-2603.0, 4457.0], [-2577.8, 4468.8],
  [-2551.1, 4468.6], [-2536.3, 4464.0], [-2516.5, 4461.4], [-2493.8, 4465.8], [-2482.4, 4475.1], [-2477.6, 4491.9],
  [-2476.2, 4505.6], [-2474.8, 4526.1], [-2467.4, 4542.5], [-2447.6, 4563.8], [-2422.9, 4581.9], [-2416.5, 4591.6],
  [-2409.6, 4615.1], [-2402.1, 4636.4], [-2383.9, 4665.0], [-2369.2, 4683.4], [-2360.9, 4696.0], [-2354.5, 4712.4],
  [-2352.6, 4741.9], [-2355.8, 4758.4], [-2364.3, 4769.5], [-2379.6, 4783.0], [-2396.3, 4797.1], [-2409.4, 4805.2],
  [-2422.4, 4804.3], [-2436.4, 4802.5], [-2445.7, 4798.9], [-2453.9, 4790.1], [-2455.3, 4780.8], [-2456.6, 4769.0],
  [-2465.1, 4758.9], [-2479.2, 4756.9], [-2491.9, 4762.0], [-2504.8, 4758.8], [-2515.6, 4751.5], [-2525.4, 4741.6],
  [-2539.9, 4733.8], [-2557.2, 4730.6], [-2570.2, 4726.2], [-2585.6, 4710.7], [-2598.7, 4685.5], [-2637.7, 4643.3],
  [-2661.5, 4622.3], [-2683.1, 4608.7], [-2717.4, 4580.8], [-2741.8, 4560.3], [-2779.6, 4533.6], [-2832.1, 4489.0],
];

const WALKS: [number, boolean, [number, number][]][] = [
  [3.4, true, [[-2748.6, 4406.5], [-2737.0, 4420.5], [-2725.7, 4432.7], [-2712.5, 4446.5], [-2699.8, 4459.9], [-2676.9, 4475.7], [-2655.1, 4491.2], [-2645.5, 4503.0], [-2636.6, 4514.8], [-2620.5, 4541.8], [-2604.6, 4568.7], [-2589.5, 4587.0], [-2580.5, 4614.0], [-2573.5, 4639.2], [-2561.5, 4656.0], [-2539.8, 4654.7], [-2522.1, 4672.9], [-2511.0, 4662.0], [-2497.0, 4648.5]]],
  [2.4, true, [[-2522.1, 4672.9], [-2538.1, 4679.6], [-2544.0, 4694.8], [-2546.5, 4705.0]]],
  [1.4, false, [[-2642.3, 4411.3], [-2646.3, 4443.7], [-2647.4, 4458.5], [-2648.0, 4475.9], [-2650.3, 4489.8], [-2653.6, 4492.6]]],
  [2.8, false, [[-2503.0, 4635.0], [-2511.1, 4630.9], [-2518.0, 4618.7], [-2535.5, 4595.9], [-2550.1, 4571.2], [-2566.1, 4546.4], [-2589.6, 4512.9], [-2600.2, 4487.8], [-2612.8, 4468.2], [-2624.5, 4446.9], [-2633.7, 4430.4], [-2642.3, 4411.3], [-2645.0, 4398.0]]],
  [5.0, false, [[-2713.0, 4309.0], [-2723.1, 4316.8], [-2738.8, 4336.8], [-2748.9, 4349.7], [-2757.5, 4361.2], [-2762.5, 4368.5]]],
  [2.4, false, [[-2731.0, 4348.5], [-2729.5, 4352.0]]],
  [2.4, false, [[-2808.0, 4359.6], [-2798.5, 4362.0], [-2789.5, 4363.6], [-2781.0, 4367.4], [-2776.5, 4367.6]]],
  [3.0, true, [[-2768.5, 4404.5], [-2765.1, 4422.7], [-2758.5, 4434.2], [-2745.7, 4452.8], [-2725.6, 4481.4], [-2724.3, 4511.4], [-2712.0, 4537.0], [-2700.6, 4560.1], [-2700.8, 4563.5]]],
  [3.2, true, [[-2802.2, 4501.4], [-2816.3, 4485.9], [-2829.5, 4473.2], [-2844.4, 4461.4], [-2865.7, 4436.6], [-2877.6, 4415.8], [-2880.3, 4398.0], [-2863.0, 4387.5], [-2845.9, 4378.3], [-2825.0, 4368.6], [-2808.0, 4359.6]]],
  [3.2, false, [[-2808.0, 4359.6], [-2798.0, 4365.5], [-2790.5, 4370.5], [-2787.0, 4374.5]]],
  [3.2, false, [[-2700.8, 4563.5], [-2715.1, 4558.8], [-2727.8, 4552.2], [-2737.5, 4546.3], [-2748.8, 4535.3], [-2761.6, 4529.4], [-2777.7, 4522.7], [-2786.2, 4514.4], [-2791.1, 4509.7], [-2802.2, 4501.4]]],
  [2.0, true, [[-2786.2, 4514.4], [-2797.4, 4527.6]]],
];

const COLORS = {
  pave: hex('#84858a'),
  riser: hex('#8d8676'),
  purple: hex('#5e3a6c'),
  timber: hex('#8a6a48'),
  lawn: hex('#6f8a45'),
  shrub: hex('#4d6338'),
  dry: hex('#8a8a5a'),
  hedge: hex('#4f6a36'),
  brick: hex('#9c4b36'),
  dark: hex('#2b2422'),
};

const groundY = (x, z) => LAND_Y + rise(x, z);

function pointInPoly(ring, x, z) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function segmentDist(x, z, ptA, ptB) {
  const dx = ptB[0] - ptA[0], dz = ptB[1] - ptA[1], lenSq = dx * dx + dz * dz;
  const proj = lenSq ? Math.max(0, Math.min(1, ((x - ptA[0]) * dx + (z - ptA[1]) * dz) / lenSq)) : 0;
  return Math.hypot(x - ptA[0] - dx * proj, z - ptA[1] - dz * proj);
}

function hash2(i, k) {
  const val = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return val - Math.floor(val);
}

function lobeMetric(lobe, x, z, pad = 0) {
  const [cx, cz, rx, rz, ang] = lobe, ca = Math.cos(ang), sa = Math.sin(ang);
  const dx = x - cx, dz = z - cz;
  const u = (dx * ca + dz * sa) / (rx + pad), v = (-dx * sa + dz * ca) / (rz + pad);
  return u * u + v * v;
}

function lobePoint(lobe, theta, inset = 0) {
  const [cx, cz, rx, rz, ang] = lobe, ca = Math.cos(ang), sa = Math.sin(ang);
  const u = Math.cos(theta) * (rx - inset), v = Math.sin(theta) * (rz - inset);
  return [cx + u * ca - v * sa, cz + u * sa + v * ca];
}

const COURT_TANGENTS = (() => {
  const dx = COURT_TIP[0] - COURT_DISC_CENTER[0], dz = COURT_TIP[1] - COURT_DISC_CENTER[1];
  const dist = Math.hypot(dx, dz), baseAng = Math.atan2(dz, dx), halfAng = Math.acos(COURT_RADIUS / dist);
  return [baseAng - halfAng, baseAng + halfAng].map((theta) => [
    COURT_DISC_CENTER[0] + Math.cos(theta) * COURT_RADIUS,
    COURT_DISC_CENTER[1] + Math.sin(theta) * COURT_RADIUS,
  ]);
})();

const inCourt = (x, z, pad = 0) => Math.hypot(x - COURT_DISC_CENTER[0], z - COURT_DISC_CENTER[1]) < COURT_RADIUS + pad || pointInPoly([COURT_TANGENTS[0], COURT_TIP, COURT_TANGENTS[1]], x, z);
const inGarden = (x, z, pad = 0) => GARDEN_LOBES.some((lobe) => lobeMetric(lobe, x, z, GARDEN_PATH_W + pad) < 1);
const inApron = (x, z, pad = 0) => {
  const [[cx, cz], len, depth, ang] = APRON_SPEC, dx = x - cx, dz = z - cz;
  return Math.abs(dx * Math.cos(ang) + dz * Math.sin(ang)) < len / 2 + pad && Math.abs(-dx * Math.sin(ang) + dz * Math.cos(ang)) < depth / 2 + pad;
};

function drawWalk(S, width, hasSteps, pts) {
  const fine = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const ptA = pts[i], ptB = pts[i + 1];
    const segs = Math.max(1, Math.ceil(Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]) / 1.5));
    for (let k = 0; k < segs; k++) fine.push([ptA[0] + ((ptB[0] - ptA[0]) * k) / segs, ptA[1] + ((ptB[1] - ptA[1]) * k) / segs]);
  }
  fine.push(pts[pts.length - 1]);
  const halfW = width / 2, lift = 0.07;
  let lastStepY = groundY(fine[0][0], fine[0][1]);
  for (let i = 0; i + 1 < fine.length; i++) {
    const ptA = fine[i], ptB = fine[i + 1], dx = ptB[0] - ptA[0], dz = ptB[1] - ptA[1], segLen = Math.hypot(dx, dz);
    if (segLen < 1e-3) continue;
    const px = (-dz / segLen) * halfW, pz = (dx / segLen) * halfW;
    const yAt = (x, z) => groundY(x, z) + lift;
    S.quad(
      [ptA[0] + px, yAt(ptA[0] + px, ptA[1] + pz), ptA[1] + pz],
      [ptB[0] + px, yAt(ptB[0] + px, ptB[1] + pz), ptB[1] + pz],
      [ptB[0] - px, yAt(ptB[0] - px, ptB[1] - pz), ptB[1] - pz],
      [ptA[0] - px, yAt(ptA[0] - px, ptA[1] - pz), ptA[1] - pz],
      COLORS.pave, [0, 1, 0],
    );
    if (hasSteps) {
      const yB = groundY(ptB[0], ptB[1]);
      if (Math.abs(yB - lastStepY) > 0.45) {
        S.box(ptB[0], ptB[1], Math.min(yB, lastStepY) - 0.1, Math.max(yB, lastStepY) + lift + 0.02, width + 0.3, 0.32, Math.atan2(dz, dx) + Math.PI / 2, COLORS.riser);
        lastStepY = yB;
      }
    }
  }
}

function drapeGrid(S, x0, x1, z0, z1, cell, lift, colorAt) {
  for (let z = z0; z < z1; z += cell) {
    for (let x = x0; x < x1; x += cell) {
      const col = colorAt(x + cell / 2, z + cell / 2);
      if (col == null) continue;
      const yAt = (px, pz) => groundY(px, pz) + lift;
      S.quad(
        [x, yAt(x, z), z], [x, yAt(x, z + cell), z + cell],
        [x + cell, yAt(x + cell, z + cell), z + cell], [x + cell, yAt(x + cell, z), z],
        col, [0, 1, 0],
      );
    }
  }
}

function drawEdging(S, pts, inwardSign, withHedge = true) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const ptA = pts[i], ptB = pts[i + 1], dx = ptB[0] - ptA[0], dz = ptB[1] - ptA[1], segLen = Math.hypot(dx, dz);
    if (segLen < 1e-3) continue;
    const ang = Math.atan2(dz, dx), nx = (-dz / segLen) * inwardSign, nz = (dx / segLen) * inwardSign;
    const mx = (ptA[0] + ptB[0]) / 2, mz = (ptA[1] + ptB[1]) / 2, gY = Math.min(groundY(ptA[0], ptA[1]), groundY(ptB[0], ptB[1]));
    S.base = gY - LAND_Y;
    S.box(mx, mz, gY - 0.08, gY + 0.16, segLen + 0.06, 0.24, ang, COLORS.brick);
    if (withHedge) S.box(mx + nx * 0.42, mz + nz * 0.42, gY - 0.05, gY + 0.55, segLen + 0.1, 0.55, ang, COLORS.hedge);
  }
}

function drawWatchTower(S, center, ang) {
  const baseY = Math.min(
    groundY(center[0] - 2.5, center[1] - 2.5), groundY(center[0] + 2.5, center[1] - 2.5),
    groundY(center[0] - 2.5, center[1] + 2.5), groundY(center[0] + 2.5, center[1] + 2.5),
  ) - 0.3;
  const towerH = 13.2, footHalf = 2.4, topHalf = 1.45;
  const ux = Math.cos(ang), uz = Math.sin(ang);
  const legPt = (u, v, y) => {
    const frac = (y - baseY) / towerH, half = footHalf + (topHalf - footHalf) * frac;
    return [center[0] + (u * ux - v * uz) * half, y, center[1] + (u * uz + v * ux) * half];
  };
  S.base = baseY - LAND_Y;
  S.kind = KIND.MASONRY;
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (const [u, v] of corners) {
    const pt = legPt(u, v, baseY);
    S.box(pt[0], pt[2], baseY - 0.2, baseY + 0.5, 0.8, 0.8, ang, hex('#b6ad9a'));
  }
  S.kind = KIND.PLAIN;
  for (const [u, v] of corners) S.beam(legPt(u, v, baseY + 0.4), legPt(u, v, baseY + towerH), 0.22, 0.22, COLORS.purple);
  const levels = [0.4, 3.6, 6.8, 10.0, towerH];
  for (let lv = 0; lv < levels.length; lv++) {
    const y = baseY + levels[lv];
    for (let k = 0; k < 4; k++) {
      const [u0, v0] = corners[k], [u1, v1] = corners[(k + 1) % 4];
      S.beam(legPt(u0, v0, y), legPt(u1, v1, y), 0.12, 0.12, COLORS.purple);
    }
    if (lv + 1 < levels.length) {
      const yNext = baseY + levels[lv + 1];
      for (let k = 0; k < 4; k++) {
        const [u0, v0] = corners[k], [u1, v1] = corners[(k + 1) % 4];
        S.beam(legPt(u0, v0, y), legPt(u1, v1, yNext), 0.07, 0.07, shade(COLORS.purple, 0.9));
        S.beam(legPt(u1, v1, y), legPt(u0, v0, yNext), 0.07, 0.07, shade(COLORS.purple, 0.9));
      }
      const dir = lv % 2 ? -1 : 1;
      S.beam(legPt(-0.55 * dir, -0.2, y + 0.05), legPt(0.55 * dir, -0.2, yNext - 0.05), 0.75, 0.1, COLORS.timber);
      const landingPt = legPt(0.55 * dir, -0.2, yNext);
      S.box(landingPt[0], landingPt[2], yNext - 0.12, yNext, 0.9, 0.9, ang, COLORS.timber);
    }
  }
  const floorY = baseY + towerH, cabinW = topHalf * 2 + 0.9, cabinHalf = cabinW / 2 - 0.08;
  S.box(center[0], center[1], floorY - 0.18, floorY, cabinW, cabinW, ang, COLORS.timber);
  const cabinPt = (u, v, y): [number, number, number] => [center[0] + u * ux - v * uz, y, center[1] + u * uz + v * ux];
  for (const [u, v] of corners) S.beam(cabinPt(u * cabinHalf, v * cabinHalf, floorY), cabinPt(u * cabinHalf, v * cabinHalf, floorY + 2.4), 0.14, 0.14, COLORS.purple);
  for (let k = 0; k < 4; k++) {
    const [u0, v0] = corners[k], [u1, v1] = corners[(k + 1) % 4];
    S.beam(cabinPt(u0 * cabinHalf, v0 * cabinHalf, floorY + 1.0), cabinPt(u1 * cabinHalf, v1 * cabinHalf, floorY + 1.0), 0.08, 0.1, COLORS.purple);
    const mid = cabinPt((u0 + u1) * cabinHalf / 2, (v0 + v1) * cabinHalf / 2, 0);
    S.box(mid[0], mid[2], floorY, floorY + 0.55, k % 2 ? 0.06 : cabinW - 0.2, k % 2 ? cabinW - 0.2 : 0.06, ang, shade(COLORS.timber, 0.85));
  }
  S.kind = KIND.TILE;
  S.hip(center[0], center[1], cabinW, cabinW, ang, floorY + 2.4, 1.5, hex('#6f5a6e'), { over: 0.45 });
  S.kind = KIND.PLAIN;
  S.base = 0;
}

function buildRoundCourt(S, lamps) {
  const [cx, cz] = COURT_CENTER;
  const inRingBed = (x, z) => {
    const dist = Math.hypot(x - cx, z - cz), ang = Math.atan2(z - cz, x - cx);
    if (dist < LABYRINTH_RINGS.lawn) return true;
    for (const [r0, r1, gaps] of LABYRINTH_RINGS.beds) {
      if (dist < r0 || dist > r1) continue;
      return !gaps.some((gapAng) => Math.abs(Math.atan2(Math.sin(ang - gapAng), Math.cos(ang - gapAng))) * dist < 1.1);
    }
    return false;
  };
  const pavedStart = S.n;
  S.kind = KIND.ROAD;
  S.base = 0;
  drapeGrid(S, COURT_TIP[0] - 1, COURT_DISC_CENTER[0] + COURT_RADIUS + 1, COURT_TIP[1] - 1, COURT_DISC_CENTER[1] + COURT_RADIUS + 1, 0.8, 0.07, (x, z) => (inCourt(x, z) && !inRingBed(x, z) ? COLORS.pave : null));
  S.kind = KIND.PLAIN;
  drapeGrid(S, cx - 15, cx + 15, cz - 15, cz + 15, 0.5, 0.1, (x, z) => (inRingBed(x, z) ? COLORS.lawn : null));
  (S.paved = S.paved || []).push([pavedStart, S.n]);

  const drawArcEdge = (rad, a0, a1, inward) => {
    const segs = Math.max(2, Math.ceil(((a1 - a0) * rad) / 0.9)), pts = [];
    for (let k = 0; k <= segs; k++) {
      const theta = a0 + ((a1 - a0) * k) / segs;
      pts.push([cx + Math.cos(theta) * rad, cz + Math.sin(theta) * rad]);
    }
    drawEdging(S, pts, inward);
  };
  drawArcEdge(LABYRINTH_RINGS.lawn, 0, Math.PI * 2, 1);
  for (const [r0, r1, gaps] of LABYRINTH_RINGS.beds) {
    const sorted = gaps.slice().sort((a, b) => a - b);
    for (let i = 0; i < sorted.length; i++) {
      const a0 = sorted[i] + 1.1 / r1;
      const a1 = (i + 1 < sorted.length ? sorted[i + 1] : sorted[0] + Math.PI * 2) - 1.1 / r1;
      drawArcEdge(r0, a0, a1, -1);
      drawArcEdge(r1, a0, a1, 1);
    }
  }
  for (let k = 0; k < 7; k++) {
    const theta = -2.6 + k * 0.62, rad = COURT_RADIUS - 0.9;
    const x = COURT_DISC_CENTER[0] + Math.cos(theta) * rad, z = COURT_DISC_CENTER[1] + Math.sin(theta) * rad, gY = groundY(x, z);
    S.base = gY - LAND_Y;
    S.box(x, z, gY + 0.38, gY + 0.45, 0.45, 1.6, theta, hex('#9c9484'));
    S.box(x, z, gY, gY + 0.38, 0.3, 1.2, theta, hex('#857d6e'));
  }
  for (const theta of [-2.2, -0.6, 1.0, 2.6]) {
    const x = COURT_DISC_CENTER[0] + Math.cos(theta) * (COURT_RADIUS - 0.4);
    const z = COURT_DISC_CENTER[1] + Math.sin(theta) * (COURT_RADIUS - 0.4);
    lamps.push([x, z, groundY(x, z)]);
  }
}

function buildFlowerGardenAndStructures(S) {
  const pavedStart = S.n;
  S.kind = KIND.ROAD;
  S.base = 0;
  const bounds = [GARDEN_CENTER[0] - 24, GARDEN_CENTER[0] + 22, GARDEN_CENTER[1] - 24, GARDEN_CENTER[1] + 22];
  drapeGrid(S, bounds[0], bounds[1], bounds[2], bounds[3], 0.7, 0.07, (x, z) => (inGarden(x, z) && !GARDEN_LOBES.some((lobe) => lobeMetric(lobe, x, z) < 1) ? COLORS.pave : null));
  S.kind = KIND.PLAIN;
  const fillColors = { lawn: COLORS.lawn, shrub: COLORS.shrub, dry: COLORS.dry };
  drapeGrid(S, bounds[0], bounds[1], bounds[2], bounds[3], 0.5, 0.1, (x, z) => {
    const lobe = GARDEN_LOBES.find((entry) => lobeMetric(entry, x, z) < 1);
    return lobe ? fillColors[lobe[5]] : null;
  });
  (S.paved = S.paved || []).push([pavedStart, S.n]);

  const flowerCols = [hex('#56703f'), hex('#b84c8e'), hex('#d96846'), hex('#e6b83a'), hex('#8a52a8')];
  for (const lobe of GARDEN_LOBES) {
    const pts = [];
    for (let k = 0; k <= 36; k++) pts.push(lobePoint(lobe, (k / 36) * Math.PI * 2));
    drawEdging(S, pts, 1, false);
    const count = lobe[5] === 'shrub' ? Math.round(lobe[2] * lobe[3] * 0.72) : lobe[5] === 'lawn' ? 5 : 2;
    for (let i = 0; i < count; i++) {
      const theta = hash2(i, lobe[0]) * Math.PI * 2, radFrac = Math.sqrt(hash2(i, lobe[1])) * 0.82;
      const [x, z] = lobePoint(lobe, theta, 0);
      const px = lobe[0] + (x - lobe[0]) * radFrac, pz = lobe[1] + (z - lobe[1]) * radFrac, gY = groundY(px, pz);
      const scale = 0.7 + hash2(i, 7) * 0.6;
      S.base = gY - LAND_Y;
      S.cyl(px, pz, gY, gY + 0.68 * scale, 0.68 * scale, 0.46 * scale, 6, flowerCols[i % flowerCols.length], { rot: hash2(i, 4) });
    }
  }

  S.kind = KIND.ROAD;
  S.base = 0;
  const [[ax, az], aLen, aDepth] = APRON_SPEC, aRad = Math.hypot(aLen, aDepth) / 2 + 1;
  drapeGrid(S, ax - aRad, ax + aRad, az - aRad, az + aRad, 0.8, 0.075, (x, z) => (inApron(x, z) ? COLORS.pave : null));
  S.kind = KIND.PLAIN;

  // Sunset View Point tower and low deck
  drawWatchTower(S, TOWER_POS, TOWER_ANG);
  const [[dx, dz], dLen, dDepth] = DECK_SPEC, ca = Math.cos(TOWER_ANG), sa = Math.sin(TOWER_ANG);
  const deckPt = (u, v): [number, number] => [dx + ca * u - sa * v, dz + sa * u + ca * v];
  let gMin = Infinity, gMax = -Infinity;
  for (let u = -dLen / 2; u <= dLen / 2 + 1e-6; u += dLen / 4) {
    for (let v = -dDepth / 2; v <= dDepth / 2 + 1e-6; v += dDepth / 2) {
      const pt = deckPt(u, v), gY = groundY(pt[0], pt[1]);
      gMin = Math.min(gMin, gY);
      gMax = Math.max(gMax, gY);
    }
  }
  const deckTopY = gMax + 0.9;
  S.base = gMin - LAND_Y;
  S.kind = KIND.MASONRY;
  S.box(dx, dz, gMin - 1.2, deckTopY, dLen, dDepth, TOWER_ANG, hex('#8a7058'), { top: hex('#7a5f48') });
  S.kind = KIND.PLAIN;
  for (const [u0, v0, u1, v1] of ([[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]] as any[])) {
    const ptA = deckPt((u0 * dLen) / 2, (v0 * dDepth) / 2), ptB = deckPt((u1 * dLen) / 2, (v1 * dDepth) / 2);
    S.box((ptA[0] + ptB[0]) / 2, (ptA[1] + ptB[1]) / 2, deckTopY, deckTopY + 0.9, Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]), 0.12, Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]), shade(COLORS.timber, 0.8));
  }
  S.base = 0;

  // Rest stop
  const [[rx, rz], rLen, rDepth, rAng] = REST_SPEC, rCos = Math.cos(rAng), rSin = Math.sin(rAng);
  const restPt = (u, v): [number, number] => [rx + rCos * u - rSin * v, rz + rSin * u + rCos * v];
  let rMin = Infinity, rMax = -Infinity;
  for (let u = -(rLen + 1.2) / 2; u <= (rLen + 1.2) / 2 + 1e-6; u += (rLen + 1.2) / 4) {
    for (let v = -(rDepth + 1.2) / 2; v <= (rDepth + 1.2) / 2 + 1e-6; v += (rDepth + 1.2) / 4) {
      const pt = restPt(u, v), gY = groundY(pt[0], pt[1]);
      rMin = Math.min(rMin, gY);
      rMax = Math.max(rMax, gY);
    }
  }
  const restFloorY = rMax + 0.35;
  S.base = rMin - LAND_Y;
  S.kind = KIND.MASONRY;
  S.box(rx, rz, rMin - 1.6, restFloorY, rLen + 1.2, rDepth + 1.2, rAng, hex('#a49d8d'), { topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;
  S.box(rx, rz, restFloorY, restFloorY + 3.1, rLen - 0.6, rDepth - 0.6, rAng, hex('#e2dccb'));
  for (const side of [-1, 1]) {
    for (const u of [-2.6, 0, 2.6]) {
      const winPt = restPt(u, side * ((rDepth - 0.6) / 2 + 0.03));
      S.box(winPt[0], winPt[1], restFloorY + 0.9, restFloorY + 2.3, 1.5, 0.06, rAng, COLORS.dark);
    }
    const doorPt = restPt(-rLen / 2 + 1.3, side * ((rDepth - 0.6) / 2 + 0.04));
    S.box(doorPt[0], doorPt[1], restFloorY, restFloorY + 2.4, 1.0, 0.06, rAng, shade(COLORS.timber, 0.7));
  }
  S.kind = KIND.TILE;
  S.hip(rx, rz, rLen, rDepth, rAng, restFloorY + 3.1, 1.9, hex('#4a4f55'), { over: 0.6 });
  S.kind = KIND.PLAIN;
  S.base = 0;
}

function populatePineForest(data) {
  if (!Array.isArray(data.trees)) return;
  const openZones: [[number, number], number][] = [[TOWER_POS as [number, number], 4.5], [DECK_SPEC[0], 7], [REST_SPEC[0], 7.5]];
  const isClear = (x, z, pad) => inCourt(x, z, 1 + pad) || inGarden(x, z, 1 + pad) || inApron(x, z, 1.5 + pad)
    || openZones.some(([center, rad]) => Math.hypot(x - center[0], z - center[1]) < rad + pad)
    || WALKS.some(([w, , pts]) => pts.some((pt, k) => k + 1 < pts.length && segmentDist(x, z, pt, pts[k + 1]) < w / 2 + 0.9 + pad));

  const trees = data.trees, counts = data.meta && data.meta.counts;
  for (let i = trees.length / 4 - 1; i >= 0; i--) {
    const x = trees[i * 4] / 10, z = trees[i * 4 + 1] / 10;
    if (x < -2960 || x > -2340 || z < 4150 || z > 4820) continue;
    if (isClear(x, z, 0)) {
      trees.splice(i * 4, 4);
      if (counts && counts.treesNear != null && i < counts.treesNear) counts.treesNear--;
      continue;
    }
    if (pointInPoly(FOREST_RING, x, z) && hash2(i, 9) < 0.9) trees[i * 4 + 3] = 3;
  }

  const existing = [];
  for (let i = 0; i < trees.length / 4; i++) {
    const x = trees[i * 4] / 10, z = trees[i * 4 + 1] / 10;
    if (x > -2960 && x < -2340 && z > 4150 && z < 4820) existing.push([x, z]);
  }
  const added = [];
  let idx = 0;
  for (let z = 4166; z < 4806; z += 8) {
    for (let x = -2942; x < -2350; x += 8) {
      idx++;
      const px = x + (hash2(idx, 1) - 0.5) * 6, pz = z + (hash2(idx, 2) - 0.5) * 6;
      if (!pointInPoly(FOREST_RING, px, pz) || rise(px, pz) < 1 || hash2(idx, 3) < 0.2 || isClear(px, pz, 0.6)) continue;
      if (existing.some(([hx, hz]) => Math.abs(hx - px) < 4 && Math.abs(hz - pz) < 4)) continue;
      added.push(Math.round(px * 10), Math.round(pz * 10), 9 + Math.floor(hash2(idx, 4) * 6), 3);
    }
  }
  const nearCount = counts && counts.treesNear != null ? counts.treesNear : trees.length / 4;
  trees.splice(nearCount * 4, 0, ...added);
  if (counts && counts.treesNear != null) counts.treesNear += added.length / 4;
}

export function build({ data, S, group }) {
  const lamps = [];
  S.kind = KIND.ROAD;
  for (const [width, hasSteps, pts] of WALKS) drawWalk(S, width, hasSteps, pts);

  buildRoundCourt(S, lamps);
  buildFlowerGardenAndStructures(S);

  // Stair lamps
  const [stairW, , stairPts] = WALKS[0];
  let distAcc = 0;
  for (let i = 0; i + 1 < stairPts.length; i++) {
    const ptA = stairPts[i], ptB = stairPts[i + 1], segLen = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
    distAcc += segLen;
    if (distAcc < 30) continue;
    distAcc = 0;
    const x = ptB[0] + (-(ptB[1] - ptA[1]) / segLen) * (stairW / 2 + 0.6);
    const z = ptB[1] + ((ptB[0] - ptA[0]) / segLen) * (stairW / 2 + 0.6);
    lamps.push([x, z, groundY(x, z)]);
  }
  for (const [x, z, gY] of lamps) {
    S.base = gY - LAND_Y;
    S.cyl(x, z, gY, gY + 3.0, 0.07, 0.06, 6, COLORS.dark, { cap: false });
    S.box(x, z, gY + 3.0, gY + 3.35, 0.32, 0.32, 0, hex('#e9e2cf'));
  }
  S.kind = KIND.PLAIN;
  S.base = 0;

  populatePineForest(data);

  if (lamps.length) {
    const pos = [], col = [];
    for (const [x, z, gY] of lamps) { pos.push(x, gY + 3.2, z); col.push(1, 0.8, 0.52); }
    const pts = glowPoints(pos, col, 5);
    pts.userData.glow = true;
    pts.userData.landmark = id;
    group.add(pts);
  }
}
