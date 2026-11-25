import { KIND, hex, shade, inRing, rand } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { fence, roadsNear, buildingsNear } from '../enclosure.ts';
import { glowPoints } from '../../geo/materials.ts';

// ---- Chùa Báo Quốc, the pagoda on Hàm Long hill (Báo Quốc street, south bank) ----
// Sources (docs/places/baoquoc.md has the full list).
export const id = 'baoquoc';

const PRECINCT_RING: [number, number][] = [
  [-950.8, 1535.2], [-974.9, 1567.1], [-994.3, 1587.5], [-1001.3, 1593.6], [-1017.8, 1592], [-1037, 1589.7],
  [-1050, 1592.9], [-1060, 1603.2], [-1063.4, 1607.3], [-1065.3, 1613.9], [-1064.5, 1621.1], [-1061.2, 1628.7],
  [-1054, 1636.2], [-1050.2, 1644.1], [-1052.9, 1659.5], [-1050.8, 1671.2], [-1043.6, 1687], [-1038, 1693.4],
  [-1024.1, 1695.9], [-1009.2, 1696], [-997.9, 1698.7], [-980.6, 1705.1], [-970.6, 1706.4], [-947.8, 1697.3],
  [-934, 1685.4], [-910.1, 1665], [-899.5, 1650.6], [-893.8, 1640.6], [-894.2, 1625.3], [-903.2, 1609.1],
  [-911, 1593.1], [-919, 1581.5], [-915.7, 1556.3], [-914.6, 1540.8],
];

const ORIGIN: [number, number] = [-1036.9, 1618.9];
const AXIS_U: [number, number] = [0.766, -0.643];
const AXIS_V: [number, number] = [0.643, 0.766];
const ANGLE_V = Math.atan2(AXIS_V[1], AXIS_V[0]);
const ANGLE_U = ANGLE_V + Math.PI / 2;
const AXIS_CENTER_V = 45.2;
const GATE_OPENING: [number, number] = [-917.7, 1584.6];
const GATE_U = 92.5;
const GATE_D = 3;
const GATE_W = 11;
const POND_U = 27.5;
const POND_V = 75;
const POND_R = 3.3;

const COLORS = {
  tile: hex('#7d4a36'),
  ridge: hex('#6b3a2b'),
  hallTile: hex('#9a8676'),
  hallRidge: hex('#7e6c5e'),
  wall: hex('#d9b45a'),
  wood: hex('#4a3226'),
  brick: hex('#8e4a3a'),
  pave: hex('#b6a08a'),
  stone: PAL.stone,
  grey: hex('#8f8c82'),
  gate: hex('#55554b'),
  gateAlt: hex('#64635a'),
  moss: PAL.moss,
  lacquer: PAL.lacquer,
  doorSeam: hex('#2e1a14'),
  threshold: hex('#4a4842'),
  panelDark: hex('#3d3d37'),
  panelMid: hex('#474740'),
  gateRoof: hex('#685c4e'),
  finialGold: hex('#d4b45c'),
  dragonTeal: hex('#5f8a78'),
  lotusGold: hex('#d8be74'),
  lionWhite: hex('#e8e4da'),
  potRed: hex('#a5452f'),
  windowGold: hex('#c99a3e'),
  pillarDragon: hex('#5f7a6a'),
  friezeGold: hex('#e3c25a'),
  wheelGold: hex('#b9a46a'),
  wheelLight: hex('#d8c27a'),
  ridgeDragon: hex('#8a9b88'),
  lanternWhite: hex('#f2ece0'),
  rearTile: hex('#a5603f'),
  rearRidge: hex('#8a4c33'),
  pondWater: hex('#3d5248'),
  pondRock: hex('#7b786c'),
  statueWhite: hex('#efede6'),
};
const STUPA_COLORS = [hex('#9a978a'), hex('#a89a7a'), hex('#8a887c'), hex('#b2a483')];

const toWorld = (uPos: number, vPos: number): [number, number] => [
  ORIGIN[0] + uPos * AXIS_U[0] + vPos * AXIS_V[0],
  ORIGIN[1] + uPos * AXIS_U[1] + vPos * AXIS_V[1],
];
const toWorld3 = (uPos: number, vPos: number, y: number): [number, number, number] => {
  const pt = toWorld(uPos, vPos);
  return [pt[0], y, pt[1]];
};
const terrainRise = (uPos: number, vPos: number) => rise(...toWorld(uPos, vPos));

function terrainSpan(u0: number, u1: number, v0: number, v1: number): [number, number] {
  let lo = 1e9;
  let hi = -1e9;
  for (let i = 0; i <= 4; i++) {
    for (let j = 0; j <= 4; j++) {
      const val = terrainRise(u0 + ((u1 - u0) * i) / 4, v0 + ((v1 - v0) * j) / 4);
      lo = Math.min(lo, val);
      hi = Math.max(hi, val);
    }
  }
  return [LAND_Y + lo, LAND_Y + hi];
}

function frameBox(S, uPos: number, vPos: number, y0: number, y1: number, widthV: number, depthU: number, col: number[], opts?) {
  const pt = toWorld(uPos, vPos);
  S.box(pt[0], pt[1], y0, y1, widthV, depthU, ANGLE_V, col, opts);
}

function frameCyl(S, uPos: number, vPos: number, y0: number, y1: number, r0: number, r1: number, segs: number, col: number[], opts?) {
  const pt = toWorld(uPos, vPos);
  S.cyl(pt[0], pt[1], y0, y1, r0, r1, segs, col, { rot: ANGLE_V, ...opts });
}

function frameHipV(S, uPos: number, vPos: number, widthV: number, depthU: number, y0: number, height: number, opts: Record<string, any> = {}) {
  const pt = toWorld(uPos, vPos);
  S.hip(pt[0], pt[1], widthV, depthU, ANGLE_V, y0, height, opts.col ?? COLORS.tile, { flare: 0.4, over: 0.9, fascia: 0.22, fasciaCol: shade(COLORS.tile, 0.7), ridgeCol: COLORS.ridge, hips: true, segs: 3, ...opts });
}

function frameHipU(S, uPos: number, vPos: number, lenU: number, widthV: number, y0: number, height: number, opts: Record<string, any> = {}) {
  const pt = toWorld(uPos, vPos);
  S.hip(pt[0], pt[1], lenU, widthV, ANGLE_U, y0, height, opts.col ?? COLORS.tile, { flare: 0.35, over: 0.8, fascia: 0.2, fasciaCol: shade(COLORS.tile, 0.7), ridgeCol: COLORS.ridge, hips: true, segs: 3, ...opts });
}

function drawGableU(S, u0: number, u1: number, v0: number, v1: number, y0: number, height: number, col: number[], over = 0.8, endCol = COLORS.wall) {
  const midV = (v0 + v1) / 2;
  const halfW = (v1 - v0) / 2 + over;
  const drop = over * (height / ((v1 - v0) / 2));
  const ua = u0 - over * 0.6;
  const ub = u1 + over * 0.6;
  const prevKind = S.kind;
  S.kind = KIND.TILE;
  for (const side of [-1, 1]) {
    const e0 = toWorld3(ua, midV + side * halfW, y0 - drop);
    const e1 = toWorld3(ub, midV + side * halfW, y0 - drop);
    const r1 = toWorld3(ub, midV, y0 + height);
    const r0 = toWorld3(ua, midV, y0 + height);
    const upNorm = [AXIS_V[0] * side * 0.5, 1, AXIS_V[1] * side * 0.5];
    S.quad(e0, e1, r1, r0, shade(col, side < 0 ? 0.96 : 1.04), upNorm);
    S.quad(e0, e1, r1, r0, shade(col, 0.6), [-upNorm[0], -1, -upNorm[2]]);
    S.beam(toWorld3(ua, midV + side * halfW, y0 - drop - 0.1), toWorld3(ub, midV + side * halfW, y0 - drop - 0.1), 0.18, 0.22, shade(col, 0.7));
  }
  S.beam(toWorld3(ua, midV, y0 + height + 0.08), toWorld3(ub, midV, y0 + height + 0.08), 0.35, 0.3, COLORS.ridge);
  S.kind = KIND.MASONRY;
  for (const [uEnd, sign] of [[u0, -1], [u1, 1]] as [number, number][]) {
    S.tri(toWorld3(uEnd, v0, y0), toWorld3(uEnd, v1, y0), toWorld3(uEnd, midV, y0 + height - 0.05), endCol, [AXIS_U[0] * sign, 0, AXIS_U[1] * sign]);
  }
  S.kind = prevKind;
}

type GlowFn = (uPos: number, vPos: number, y: number, col?: number[]) => void;

// 15-step stair, path from road, tam quan triple gate, forecourt, terrace, and main hall
function buildAxisComplex(S, addGlow: GlowFn) {
  const [gateLo, gateHi] = terrainSpan(GATE_U - GATE_D / 2, GATE_U + GATE_D / 2, AXIS_CENTER_V - GATE_W / 2, AXIS_CENTER_V + GATE_W / 2);
  const stepRise = 0.15;
  const stepTread = 0.35;
  const stepCount = 15;
  const footU = GATE_U + GATE_D / 2 + stepCount * stepTread;
  const footY = LAND_Y + terrainRise(footU, AXIS_CENTER_V);
  const gateY = Math.max(gateHi + 0.25, footY + stepCount * stepRise);
  S.base = gateY - LAND_Y;
  const pavedStart = S.n;
  S.kind = KIND.MASONRY;

  for (let k = 0; k < stepCount; k++) {
    const u0 = footU - (k + 1) * stepTread;
    const u1 = footU - k * stepTread;
    const stepY = footY + ((k + 1) * (gateY - footY)) / stepCount;
    frameBox(S, (u0 + u1) / 2, AXIS_CENTER_V, Math.min(gateLo, footY) - 0.4, stepY, 9.2, stepTread, shade(COLORS.stone, k % 2 ? 0.97 : 1.02), { topKind: KIND.ROAD });
  }
  for (const side of [-1, 1]) {
    for (let k = 0; k < stepCount; k += 3) {
      const u0 = footU - (k + 3) * stepTread;
      const u1 = footU - k * stepTread;
      const cheekY = footY + ((k + 3) * (gateY - footY)) / stepCount;
      frameBox(S, (u0 + u1) / 2, AXIS_CENTER_V + side * 5.0, Math.min(gateLo, footY) - 0.4, cheekY + 0.55, 0.8, u1 - u0, shade(COLORS.gate, 1.05), { top: COLORS.moss });
    }
  }

  const relOpen = [GATE_OPENING[0] - ORIGIN[0], GATE_OPENING[1] - ORIGIN[1]];
  const openU = relOpen[0] * AXIS_U[0] + relOpen[1] * AXIS_U[1];
  const openV = relOpen[0] * AXIS_V[0] + relOpen[1] * AXIS_V[1];
  const pathSegs = Math.max(2, Math.ceil(Math.hypot(openU - footU, openV - AXIS_CENTER_V) / 2));
  for (let k = 0; k < pathSegs; k++) {
    const f0 = k / pathSegs;
    const f1 = (k + 1) / pathSegs;
    const u0 = footU + (openU - footU) * f0, v0 = AXIS_CENTER_V + (openV - AXIS_CENTER_V) * f0;
    const u1 = footU + (openU - footU) * f1, v1 = AXIS_CENTER_V + (openV - AXIS_CENTER_V) * f1;
    S.beam(toWorld3(u0, v0, LAND_Y + terrainRise(u0, v0) + 0.06), toWorld3(u1, v1, LAND_Y + terrainRise(u1, v1) + 0.06), 3.0, 0.14, shade(COLORS.stone, k % 2 ? 0.95 : 1.0));
  }

  // tam quan gate body
  const gateH = 5.4;
  frameBox(S, GATE_U, AXIS_CENTER_V, gateLo - 0.5, gateY, GATE_W + 1.4, GATE_D + 0.8, shade(COLORS.gate, 0.95));
  S.kind = KIND.MASONRY;
  for (const [dv, pierW] of [[-5.3, 1.3], [-2.2, 2.1], [2.2, 2.1], [5.3, 1.3]] as [number, number][]) {
    frameBox(S, GATE_U, AXIS_CENTER_V + dv, gateY, gateY + gateH, pierW, GATE_D, COLORS.gate, { top: shade(COLORS.gate, 0.8) });
  }
  for (const [dv, archW, archH] of [[-3.85, 1.5, 3.0], [3.85, 1.5, 3.0], [0, 2.5, 3.8]] as [number, number, number][]) {
    frameBox(S, GATE_U, AXIS_CENTER_V + dv, gateY + archH, gateY + gateH, archW, GATE_D, COLORS.gateAlt);
    const radius = archW / 2;
    const springY = gateY + archH - radius;
    const slices = 8;
    for (let k = 0; k < slices; k++) {
      const ya = springY + (radius * k) / slices;
      const yb = springY + (radius * (k + 1)) / slices;
      const openHalf = radius * Math.sqrt(Math.max(0, 1 - ((yb - springY) / radius) ** 2));
      const fillW = radius - openHalf;
      if (fillW < 0.02) continue;
      for (const side of [-1, 1]) frameBox(S, GATE_U, AXIS_CENTER_V + dv + side * (radius - fillW / 2), ya, yb, fillW, GATE_D + 0.02, COLORS.gateAlt);
    }
    S.kind = KIND.PLAIN;
    if (dv <= 0) {
      frameBox(S, GATE_U, AXIS_CENTER_V + dv, gateY + 0.12, springY + 0.15, archW - 0.16, 0.14, shade(COLORS.lacquer, 0.78));
      frameBox(S, GATE_U, AXIS_CENTER_V + dv, gateY + 0.12, springY + 0.15, 0.08, 0.18, COLORS.doorSeam);
    } else {
      for (const side of [-1, 1]) frameBox(S, GATE_U - 0.2, AXIS_CENTER_V + dv + side * (radius - 0.06), gateY, springY, 0.1, Math.min(archW / 2, 1.1), shade(COLORS.lacquer, 0.75));
    }
    S.kind = KIND.MASONRY;
    frameBox(S, GATE_U, AXIS_CENTER_V + dv, gateY, gateY + 0.14, archW, 0.4, COLORS.threshold);
  }
  for (const face of [-1, 1]) {
    for (const dv of [-5.5, -2.2, 2.2, 5.5]) frameBox(S, GATE_U + face * (GATE_D / 2 + 0.12), AXIS_CENTER_V + dv, gateY, gateY + gateH + 0.35, 0.62, 0.28, shade(COLORS.gate, 1.14), { top: COLORS.moss });
    frameBox(S, GATE_U + face * (GATE_D / 2 + 0.08), AXIS_CENTER_V, gateY + 4.1, gateY + 4.95, 2.8, 0.14, COLORS.panelDark);
    for (const dv of [-3.85, 3.85]) frameBox(S, GATE_U + face * (GATE_D / 2 + 0.08), AXIS_CENTER_V + dv, gateY + 3.4, gateY + 4.3, 1.7, 0.12, COLORS.panelMid);
  }
  frameBox(S, GATE_U, AXIS_CENTER_V, gateY + gateH, gateY + gateH + 0.45, GATE_W + 1.2, GATE_D + 0.5, shade(COLORS.gate, 0.86), { top: COLORS.moss });
  for (const side of [-1, 1]) {
    const endPt = toWorld3(GATE_U + GATE_D / 2 + 0.1, AXIS_CENTER_V + side * 6.0, gateY + gateH + 0.45);
    S.beam(endPt, [endPt[0] + AXIS_V[0] * side * 0.55, endPt[1] + 0.75, endPt[2] + AXIS_V[1] * side * 0.55], 0.32, 0.32, shade(COLORS.gate, 0.92));
  }
  frameBox(S, GATE_U, AXIS_CENTER_V, gateY + gateH + 0.45, gateY + gateH + 1.7, 5.2, 2.7, COLORS.gateAlt);
  const gateRoofOpts = { flare: 0.48, over: 0.65, fascia: 0.16, fasciaCol: shade(COLORS.gate, 0.72), ridgeCol: shade(COLORS.gate, 0.95), segs: 3 };
  const gatePt = toWorld(GATE_U, AXIS_CENTER_V);
  S.hip(gatePt[0], gatePt[1], 6.4, 3.6, ANGLE_V, gateY + gateH + 0.3, 0.75, COLORS.gateRoof, gateRoofOpts);
  S.hip(gatePt[0], gatePt[1], 5.2, 2.7, ANGLE_V, gateY + gateH + 1.7, 1.5, COLORS.gateRoof, gateRoofOpts);
  S.kind = KIND.PLAIN;
  const gateRidgeY = gateY + gateH + 3.2;
  frameBox(S, GATE_U, AXIS_CENTER_V, gateRidgeY, gateRidgeY + 0.72, 0.7, 0.16, COLORS.finialGold);
  for (const side of [-1, 1]) {
    const p0 = toWorld3(GATE_U, AXIS_CENTER_V + side * 1.4, gateRidgeY + 0.08);
    const p1 = toWorld3(GATE_U, AXIS_CENTER_V + side * 0.9, gateRidgeY + 0.55);
    const p2 = toWorld3(GATE_U, AXIS_CENTER_V + side * 0.45, gateRidgeY + 0.32);
    S.beam(p0, p1, 0.18, 0.22, COLORS.dragonTeal);
    S.beam(p1, p2, 0.16, 0.18, COLORS.dragonTeal);
    const pillarV = AXIS_CENTER_V + side * 6.8;
    S.kind = KIND.MASONRY;
    frameBox(S, GATE_U + 1.2, pillarV, gateLo - 0.3, gateY + 0.6, 1.15, 1.15, shade(COLORS.gate, 1.05));
    frameBox(S, GATE_U + 1.2, pillarV, gateY + 0.6, gateY + 4.4, 0.65, 0.65, shade(COLORS.gateAlt, 1.08), { top: COLORS.moss });
    S.kind = KIND.PLAIN;
    frameBox(S, GATE_U + 1.2, pillarV, gateY + 4.4, gateY + 4.68, 0.88, 0.88, COLORS.stone);
    frameCyl(S, GATE_U + 1.2, pillarV, gateY + 4.68, gateY + 5.15, 0.32, 0.42, 8, COLORS.lotusGold);
    frameCyl(S, GATE_U + 1.2, pillarV, gateY + 5.15, gateY + 5.65, 0.36, 0.05, 8, COLORS.lotusGold);
    addGlow(GATE_U + 1.2, pillarV, gateY + 4.95);
  }
  addGlow(GATE_U + GATE_D / 2 + 0.6, AXIS_CENTER_V, gateY + 3.4);

  // sloping forecourt from gate to terrace
  const courtV0 = 36.5;
  const courtV1 = 54.5;
  const terraceEdgeU = 64;
  const courtUs: number[] = [];
  for (let uPos = GATE_U - GATE_D / 2; uPos > terraceEdgeU - 0.01; uPos -= 2.5) courtUs.push(Math.max(uPos, terraceEdgeU));
  if (courtUs[courtUs.length - 1] > terraceEdgeU) courtUs.push(terraceEdgeU);
  const courtYs: number[] = [];
  let prevCourtY = gateY;
  for (const uPos of courtUs) {
    prevCourtY = Math.max(prevCourtY, terrainSpan(uPos - 1, uPos + 1, courtV0, courtV1)[1] + 0.1);
    courtYs.push(prevCourtY);
  }
  S.kind = KIND.ROAD;
  for (let i = 0; i + 1 < courtUs.length; i++) {
    S.quad(toWorld3(courtUs[i], courtV0, courtYs[i]), toWorld3(courtUs[i], courtV1, courtYs[i]), toWorld3(courtUs[i + 1], courtV1, courtYs[i + 1]), toWorld3(courtUs[i + 1], courtV0, courtYs[i + 1]), shade(COLORS.pave, i % 2 ? 0.97 : 1.03), [0, 1, 0]);
    S.kind = KIND.MASONRY;
    for (const vEdge of [courtV0, courtV1]) {
      const topA = toWorld3(courtUs[i], vEdge, courtYs[i]);
      const topB = toWorld3(courtUs[i + 1], vEdge, courtYs[i + 1]);
      const botA = toWorld3(courtUs[i], vEdge, LAND_Y + terrainRise(courtUs[i], vEdge) - 0.4);
      const botB = toWorld3(courtUs[i + 1], vEdge, LAND_Y + terrainRise(courtUs[i + 1], vEdge) - 0.4);
      S.quad(botA, botB, topB, topA, shade(COLORS.gate, 1.1), [AXIS_V[0] * (vEdge - AXIS_CENTER_V), 0, AXIS_V[1] * (vEdge - AXIS_CENTER_V)]);
    }
    S.kind = KIND.ROAD;
  }
  S.kind = KIND.MASONRY;
  for (let i = 0; i + 1 < courtUs.length; i++) S.beam(toWorld3(courtUs[i], AXIS_CENTER_V, courtYs[i] + 0.02), toWorld3(courtUs[i + 1], AXIS_CENTER_V, courtYs[i + 1] + 0.02), 2.2, 0.06, shade(COLORS.stone, 1.05));

  // upper terrace, balustrade, lantern pillars, stone lions, and main hall
  const forecourtTopY = courtYs[courtYs.length - 1];
  const [terraceLo, terraceHi] = terrainSpan(31, terraceEdgeU, 31, 59);
  const terraceY = Math.max(forecourtTopY + 0.9, terraceHi + 0.1);
  frameBox(S, (46 + terraceEdgeU) / 2, 45, terraceLo - 0.5, terraceY, 28, terraceEdgeU - 46, COLORS.brick, { top: COLORS.pave, topKind: KIND.ROAD });
  frameBox(S, 34.9, 45, terraceLo - 0.5, terraceY, 28, 22.2, COLORS.brick, { top: COLORS.pave, topKind: KIND.ROAD });
  for (let k = 0; k < 5; k++) frameBox(S, terraceEdgeU + 0.35 * (k + 0.5), AXIS_CENTER_V, forecourtTopY - 0.3, terraceY - ((terraceY - forecourtTopY) / 5) * k, 9, 0.35, shade(COLORS.brick, 1.08), { topKind: KIND.ROAD });
  for (const [v0, v1] of [[31.2, AXIS_CENTER_V - 4.6], [AXIS_CENTER_V + 4.6, 58.8]] as [number, number][]) {
    frameBox(S, terraceEdgeU - 0.2, (v0 + v1) / 2, terraceY, terraceY + 0.65, v1 - v0, 0.25, COLORS.grey, { top: shade(COLORS.grey, 1.1) });
    for (let vPos = v0; vPos <= v1 + 0.01; vPos += (v1 - v0) / 4) {
      frameBox(S, terraceEdgeU - 0.2, vPos, terraceY, terraceY + 0.95, 0.35, 0.35, shade(COLORS.grey, 1.05));
      frameBox(S, terraceEdgeU - 0.2, vPos, terraceY + 0.95, terraceY + 1.2, 0.25, 0.25, shade(COLORS.stone, 1.1));
    }
  }
  for (const side of [-1, 1]) {
    const pillarV = AXIS_CENTER_V + side * 6.2;
    frameBox(S, terraceEdgeU - 0.8, pillarV, terraceY, terraceY + 0.5, 1.2, 1.2, COLORS.grey);
    frameBox(S, terraceEdgeU - 0.8, pillarV, terraceY + 0.5, terraceY + 5.0, 0.7, 0.7, shade(COLORS.grey, 1.05));
    frameBox(S, terraceEdgeU - 0.8, pillarV, terraceY + 5.0, terraceY + 5.6, 0.95, 0.95, shade(COLORS.stone, 1.05));
    const capPt = toWorld(terraceEdgeU - 0.8, pillarV);
    S.hip(capPt[0], capPt[1], 1.2, 1.2, ANGLE_V, terraceY + 5.6, 0.45, COLORS.grey, { flare: 0.3, over: 0.15, segs: 2 });
    addGlow(terraceEdgeU - 0.8, pillarV, terraceY + 5.3);
    frameBox(S, terraceEdgeU + 2.3, AXIS_CENTER_V + side * 5.4, forecourtTopY, forecourtTopY + 0.5, 0.9, 1.3, shade(COLORS.stone, 1.2));
    frameBox(S, terraceEdgeU + 2.2, AXIS_CENTER_V + side * 5.4, forecourtTopY + 0.5, forecourtTopY + 1.2, 0.6, 0.9, COLORS.lionWhite);
    for (const potV of [-14, -10, 10, 14]) if (Math.sign(potV) === side) frameCyl(S, terraceEdgeU - 1.6, AXIS_CENTER_V + potV, terraceY, terraceY + 0.5, 0.35, 0.45, 6, COLORS.potRed, { cap: true });
  }

  // main hall (chánh điện) and front hall (tiền đường)
  const hallBack = 24.6;
  const hallFront = 45.4;
  const hallW = 18;
  const plinthY = terraceY + 1.0;
  frameBox(S, (hallBack + hallFront) / 2 - 0.2, AXIS_CENTER_V, terraceY - 0.2, plinthY, hallW + 1.2, hallFront - hallBack + 0.4, shade(COLORS.grey, 0.95), { top: shade(COLORS.pave, 0.95), topKind: KIND.ROAD });
  for (let k = 0; k < 6; k++) frameBox(S, hallFront + 0.3 * (k + 0.5), AXIS_CENTER_V, terraceY - 0.2, plinthY - (1.0 / 6) * k, 9, 0.3, shade(COLORS.grey, 1.02), { topKind: KIND.ROAD });
  (S.paved = S.paved || []).push([pavedStart, S.n]);

  S.kind = KIND.MASONRY;
  frameBox(S, (hallBack + hallFront - 2.6) / 2, AXIS_CENTER_V, plinthY, plinthY + 3.8, hallW, hallFront - 2.6 - hallBack, COLORS.wall, { top: shade(COLORS.hallTile, 0.8) });
  frameBox(S, hallFront - 2.5, AXIS_CENTER_V, plinthY, plinthY + 3.2, 9.6, 0.25, COLORS.wood);
  for (const side of [-1, 1]) {
    frameBox(S, hallFront - 2.5, AXIS_CENTER_V + side * 7.0, plinthY, plinthY + 3.6, 4.0, 0.3, COLORS.wall);
    frameBox(S, hallFront - 2.3, AXIS_CENTER_V + side * 7.0, plinthY + 1.2, plinthY + 2.6, 1.3, 0.12, shade(COLORS.wood, 1.3));
    frameBox(S, hallFront - 2.25, AXIS_CENTER_V + side * 7.0, plinthY + 1.6, plinthY + 2.2, 0.6, 0.1, COLORS.windowGold);
  }
  for (const dv of [-5.4, -1.9, 1.9, 5.4]) {
    frameCyl(S, hallFront - 0.5, AXIS_CENTER_V + dv, plinthY, plinthY + 3.4, 0.28, 0.25, 8, shade(COLORS.grey, 1.08), { cap: false });
    for (let k = 0; k < 3; k++) frameCyl(S, hallFront - 0.5, AXIS_CENTER_V + dv, plinthY + 0.6 + k * 0.95, plinthY + 0.92 + k * 0.95, 0.34, 0.34, 8, COLORS.pillarDragon, { cap: false });
  }
  for (const dv of [-8.6, 8.6]) frameCyl(S, hallFront - 0.5, AXIS_CENTER_V + dv, plinthY, plinthY + 3.4, 0.24, 0.22, 8, shade(COLORS.lacquer, 0.75), { cap: false });

  const hallRoofOpts = { col: COLORS.hallTile, fasciaCol: shade(COLORS.hallTile, 0.7), ridgeCol: COLORS.hallRidge };
  frameHipV(S, 44.0, AXIS_CENTER_V, 17.2, 2.8, plinthY + 3.4, 1.3, { ...hallRoofOpts, over: 0.6, flare: 0.3 });
  frameHipV(S, 40.4, AXIS_CENTER_V, 17.6, 2.0, plinthY + 3.7, 1.2, { ...hallRoofOpts, over: 0.6, flare: 0.25, ridgeCol: null });
  const mainRoofU = 31.2;
  frameHipV(S, mainRoofU, AXIS_CENTER_V, 18, 13.2, plinthY + 3.9, 1.5, { ...hallRoofOpts, over: 1.0, ridgeCol: null });
  frameBox(S, mainRoofU, AXIS_CENTER_V, plinthY + 4.8, plinthY + 5.8, 11, 7, shade(COLORS.wall, 0.85));
  for (let k = -2; k <= 2; k++) frameBox(S, mainRoofU + 3.55, AXIS_CENTER_V + k * 2.0, plinthY + 4.95, plinthY + 5.6, 1.4, 0.08, COLORS.friezeGold);
  frameHipV(S, mainRoofU, AXIS_CENTER_V, 11, 7, plinthY + 5.7, 1.8, { ...hallRoofOpts, over: 0.9, flare: 0.5 });

  const ridgeY = plinthY + 7.45;
  frameBox(S, mainRoofU, AXIS_CENTER_V, ridgeY, ridgeY + 0.9, 0.9, 0.14, COLORS.wheelGold);
  frameBox(S, mainRoofU, AXIS_CENTER_V, ridgeY + 0.2, ridgeY + 0.7, 0.5, 0.2, COLORS.wheelLight);
  for (const side of [-1, 1]) {
    const p0 = toWorld3(mainRoofU, AXIS_CENTER_V + side * 3.0, ridgeY);
    const p1 = toWorld3(mainRoofU, AXIS_CENTER_V + side * 2.4, ridgeY + 0.8);
    const p2 = toWorld3(mainRoofU, AXIS_CENTER_V + side * 1.9, ridgeY + 0.5);
    S.beam(p0, p1, 0.25, 0.3, COLORS.ridgeDragon);
    S.beam(p1, p2, 0.2, 0.22, COLORS.ridgeDragon);
  }
  for (const dv of [-7.8, -5.4, -3.6, 3.6, 5.4, 7.8]) {
    frameCyl(S, hallFront + 0.1, AXIS_CENTER_V + dv, plinthY + 2.4, plinthY + 2.95, 0.22, 0.22, 6, COLORS.lanternWhite);
    addGlow(hallFront + 0.1, AXIS_CENTER_V + dv, plinthY + 2.7, [1, 0.9, 0.7]);
  }
  return { footU, openU, openV };
}

// monastery ranges, stupa garden, lotus pond, forest, precinct fence, and infill cleanup
function buildMonasteryRangesAndGrounds(S, data, axisInfo: { footU: number; openU: number; openV: number }) {
  const drawRangeHall = (u0: number, u1: number, v0: number, v1: number, alongU: boolean, wallH = 3.3, roofH = 1.8, roofOpts?: Record<string, any>) => {
    const [lo, hi] = terrainSpan(u0, u1, v0, v1);
    const baseY = hi + 0.35;
    const midU = (u0 + u1) / 2;
    const midV = (v0 + v1) / 2;
    S.kind = KIND.MASONRY;
    frameBox(S, midU, midV, lo - 0.4, baseY, v1 - v0 + 0.4, u1 - u0 + 0.4, shade(COLORS.grey, 0.9));
    frameBox(S, midU, midV, baseY, baseY + wallH, v1 - v0 - 1.0, u1 - u0 - 1.0, COLORS.wall, { top: shade(COLORS.tile, 0.8) });
    const spanLen = (alongU ? u1 - u0 : v1 - v0) - 1.0;
    const bayCount = Math.max(2, Math.round(spanLen / 3.2));
    const pitch = spanLen / bayCount;
    for (let k = 0; k < bayCount; k++) {
      const offset = -spanLen / 2 + pitch * (k + 0.5);
      const isDoor = k % 2 === 0;
      for (const side of [-1, 1]) {
        const dU = alongU ? midU + offset : midU + side * ((u1 - u0 - 1.0) / 2 + 0.03);
        const dV = alongU ? midV + side * ((v1 - v0 - 1.0) / 2 + 0.03) : midV + offset;
        const yBot = baseY + (isDoor ? 0 : 1.0);
        const yTop = baseY + (isDoor ? 2.5 : 2.4);
        frameBox(S, dU, dV, yBot, yTop, alongU ? 0.14 : 1.5, alongU ? 1.5 : 0.14, isDoor ? COLORS.wood : shade(COLORS.wood, 0.8));
        if (!isDoor) frameBox(S, dU, dV, yBot - 0.12, yBot, alongU ? 0.18 : 1.7, alongU ? 1.7 : 0.18, shade(COLORS.grey, 1.05));
      }
    }
    if (roofOpts?.gable) drawGableU(S, u0 + 0.5, u1 - 0.5, v0 + 0.5, v1 - 0.5, baseY + wallH, roofH, roofOpts.col ?? COLORS.tile);
    else if (alongU) frameHipU(S, midU, midV, u1 - u0 - 1.0, v1 - v0 - 1.0, baseY + wallH, roofH, roofOpts);
    else frameHipV(S, midU, midV, v1 - v0 - 1.0, u1 - u0 - 1.0, baseY + wallH, roofH, roofOpts);

    for (const side of [-1, 1]) {
      const endU = alongU ? midU + side * (spanLen / 2 - 0.4) : midU;
      const endV = alongU ? midV : midV + side * (spanLen / 2 - 0.4);
      const pt = toWorld(endU, endV);
      S.box(pt[0], pt[1], baseY + wallH + roofH - 0.05, baseY + wallH + roofH + 0.55, 0.3, 0.3, ANGLE_V, shade(roofOpts?.ridgeCol ?? COLORS.ridge, 1.15));
    }
  };

  drawRangeHall(0, 22.4, 0, 11, true);
  drawRangeHall(0, 14.8, 11, 28.1, false);
  drawRangeHall(0, 22.6, 28.1, 38.7, true);
  drawRangeHall(0, 9.8, 38.7, 56.1, false, 3.6, 2.0);
  drawRangeHall(0, 22.7, 56.1, 63.7, true);
  drawRangeHall(-8.8, -1, 34.3, 54.8, false, 3.6, 2.0, { col: COLORS.rearTile, ridgeCol: COLORS.rearRidge });
  drawRangeHall(44.8, 55.4, 6.3, 12.8, true);
  drawRangeHall(45.0, 93.8, 18.6, 25.4, true, 3.1, 1.9, { gable: true });

  const innerStart = S.n;
  const [innerLo, innerHi] = terrainSpan(10, 23.8, 39, 56);
  S.kind = KIND.MASONRY;
  frameBox(S, 16.9, 47.5, innerLo - 0.3, innerHi + 0.12, 17, 13.8, shade(COLORS.grey, 0.95), { top: shade(COLORS.pave, 0.92), topKind: KIND.ROAD });
  (S.paved = S.paved || []).push([innerStart, S.n]);

  // 19 patriarchs' stupas
  S.kind = KIND.MASONRY;
  const stupaSpots: [number, number][] = [];
  for (const [rowU, count] of [[64, 5], [71.5, 5], [79, 5], [86.5, 4]] as [number, number][]) {
    for (let i = 0; i < count; i++) stupaSpots.push([rowU + ((i * 7) % 3) * 0.6, 70 + i * 5.6 + (count === 4 ? 2.8 : 0)]);
  }
  stupaSpots.forEach(([uPos, vPos], idx) => {
    const isFounder = idx === 7;
    const tiers = isFounder ? 3 : 3 + ((idx * 5) % 3);
    const baseSize = isFounder ? 2.2 : 1.6 + ((idx * 3) % 4) * 0.15;
    const col = STUPA_COLORS[idx % STUPA_COLORS.length];
    const [lo, hi] = terrainSpan(uPos - 1.5, uPos + 1.5, vPos - 1.5, vPos + 1.5);
    let curY = hi + 0.3;
    if (isFounder) {
      frameBox(S, uPos, vPos, lo - 0.3, hi + 0.15, 5.2, 5.2, shade(COLORS.grey, 0.9));
      for (const [du, dv, width, depth] of [[-2.5, 0, 0.25, 5.2], [0, -2.5, 5.2, 0.25], [0, 2.5, 5.2, 0.25]] as [number, number, number, number][]) {
        frameBox(S, uPos + du, vPos + dv, hi + 0.15, hi + 0.8, width, depth, shade(COLORS.gate, 1.1), { top: COLORS.moss });
      }
    }
    frameBox(S, uPos, vPos, lo - 0.3, curY, baseSize + 0.5, baseSize + 0.5, shade(col, 0.85));
    let width = baseSize;
    let tierH = isFounder ? 0.75 : 0.9 + ((idx * 7) % 3) * 0.12;
    for (let k = 0; k < tiers; k++) {
      frameBox(S, uPos, vPos, curY, curY + tierH, width, width, col);
      frameBox(S, uPos, vPos, curY + tierH, curY + tierH + 0.14, width + 0.3, width + 0.3, shade(col, 0.8));
      curY += tierH + 0.14;
      width *= 0.8;
      tierH *= 0.85;
    }
    frameCyl(S, uPos, vPos, curY, curY + 0.35, width * 0.35, width * 0.5, 6, shade(col, 1.1));
    frameCyl(S, uPos, vPos, curY + 0.35, curY + 0.9, width * 0.3, 0.02, 6, shade(col, 1.15), { cap: false });
  });

  // round lotus pond with white Quan Âm statue
  const [pondLo, pondHi] = terrainSpan(POND_U - POND_R, POND_U + POND_R, POND_V - POND_R, POND_V + POND_R);
  const rimY = pondHi + 0.45;
  S.kind = KIND.MASONRY;
  const rimSegs = 16;
  for (let k = 0; k < rimSegs; k++) {
    const ang = ((k + 0.5) / rimSegs) * Math.PI * 2;
    const pt = toWorld(POND_U + Math.cos(ang) * POND_R, POND_V + Math.sin(ang) * POND_R);
    S.box(pt[0], pt[1], pondLo - 0.3, rimY, 2 * POND_R * Math.sin(Math.PI / rimSegs) + 0.15, 0.45, ANGLE_V + ang, shade(COLORS.grey, k % 2 ? 0.95 : 1.02), { top: shade(COLORS.moss, 1.2) });
  }
  frameCyl(S, POND_U, POND_V, pondLo - 0.3, rimY - 0.2, POND_R - 0.1, POND_R - 0.1, 16, COLORS.pondWater, { cap: true });
  frameCyl(S, POND_U + 0.6, POND_V, rimY - 0.25, rimY + 0.5, 0.9, 0.55, 7, COLORS.pondRock, { cap: true });
  frameCyl(S, POND_U + 0.6, POND_V, rimY + 0.5, rimY + 1.75, 0.32, 0.2, 8, COLORS.statueWhite, { cap: true });
  frameCyl(S, POND_U + 0.6, POND_V, rimY + 1.75, rimY + 2.0, 0.13, 0.11, 8, COLORS.statueWhite, { cap: true });

  // forest on Hàm Long hill
  const centerWorld = toWorld(50, 40);
  if (Array.isArray(data.trees)) {
    const clearRects: [number, number, number, number][] = [
      [-10, 24, -1.5, 65], [23, 65.5, 30, 60], [63, 97, 34.5, 56.5],
      [88, 101, 37, 54], [43, 96, 16.3, 27.8], [43, 57.5, 4.3, 15],
    ];
    const { footU, openU, openV } = axisInfo;
    const nearPath = (uPos: number, vPos: number) => {
      const du = openU - footU;
      const dv = openV - AXIS_CENTER_V;
      const lenSq = du * du + dv * dv;
      const frac = Math.max(0, Math.min(1, ((uPos - footU) * du + (vPos - AXIS_CENTER_V) * dv) / lenSq));
      return Math.hypot(uPos - footU - du * frac, vPos - AXIS_CENTER_V - dv * frac) < 3.2;
    };
    const roads = roadsNear(data, centerWorld, 170);
    const onRoad = (x: number, z: number) => roads.some(([ax, az, bx, bz, width]) => {
      const dx = bx - ax, dz = bz - az, lenSq = dx * dx + dz * dz || 1;
      const frac = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lenSq));
      return Math.hypot(x - ax - dx * frac, z - az - dz * frac) < width / 2 + 3;
    });
    const deepInside = (x: number, z: number) => [[0, 0], [2.5, 0], [-2.5, 0], [0, 2.5], [0, -2.5]].every(([dx, dz]) => inRing(x + dx, z + dz, PRECINCT_RING));
    for (let uPos = -60; uPos <= 140; uPos += 5.6) {
      for (let vPos = -60; vPos <= 120; vPos += 5.6) {
        const seed = Math.round(uPos * 37 + vPos * 101);
        const ju = uPos + (rand(seed, 11) - 0.5) * 4;
        const jv = vPos + (rand(seed, 12) - 0.5) * 4;
        if (clearRects.some(([u0, u1, v0, v1]) => ju > u0 && ju < u1 && jv > v0 && jv < v1)) continue;
        if (nearPath(ju, jv) || Math.hypot(ju - POND_U, jv - POND_V) < POND_R + 2.5) continue;
        if (stupaSpots.some(([su, sv]) => Math.hypot(ju - su, jv - sv) < 1.4)) continue;
        const [x, z] = toWorld(ju, jv);
        if (!deepInside(x, z) || onRoad(x, z)) continue;
        data.trees.push(Math.round(x * 10), Math.round(z * 10), 11 + Math.floor(rand(seed, 13) * 5), rand(seed, 14) < 0.35 ? 1 : 0);
      }
    }
  }

  // low moss-capped precinct wall
  const lowWallStyle = { h: 1.4, plinth: 1.4, rail: false, t: 0.35, every: 4.5, postW: 0.5, postUp: 0.25, wall: COLORS.gate, cap: COLORS.moss, iron: null, pierW: 0.9, pierUp: 0.8 };
  fence(S, PRECINCT_RING, lowWallStyle, {
    closed: true,
    roads: roadsNear(data, centerWorld, 160),
    openings: [[...GATE_OPENING, 2.2], [-950.4, 1531.4, 2.5]],
    solid: buildingsNear(data, centerWorld, 120),
  });

  // clear infill houses and re-framed mapped buildings inside the precinct
  if (Array.isArray(data.infill)) {
    const infill = data.infill;
    const stride = 8;
    const kept: number[] = [];
    const nearLimit = data.meta?.counts?.infillNear ?? infill.length / stride;
    let nearKept = 0;
    for (let i = 0; i < infill.length / stride; i++) {
      if (inRing(infill[i * stride] / 10, infill[i * stride + 1] / 10, PRECINCT_RING)) continue;
      if (i < nearLimit) nearKept++;
      for (let j = 0; j < stride; j++) kept.push(infill[i * stride + j]);
    }
    if (kept.length !== infill.length) {
      infill.length = 0;
      for (const val of kept) infill.push(val);
      if (data.meta?.counts && data.meta.counts.infillNear != null) data.meta.counts.infillNear = nearKept;
    }
  }
  if (Array.isArray(data.bld)) {
    const isInside = (bld) => {
      const ring = bld[0];
      let sumX = 0, sumZ = 0;
      for (let i = 0; i < ring.length; i += 2) { sumX += ring[i]; sumZ += ring[i + 1]; }
      return inRing(sumX / (ring.length / 2) / 10, sumZ / (ring.length / 2) / 10, PRECINCT_RING);
    };
    for (let i = data.bld.length - 1; i >= 0; i--) if (isInside(data.bld[i])) data.bld.splice(i, 1);
  }
}

export function build({ data, S, group }) {
  const glowPos: number[] = [];
  const glowCol: number[] = [];
  const addGlow: GlowFn = (uPos, vPos, y, col = [1, 0.84, 0.56]) => {
    const pt = toWorld(uPos, vPos);
    glowPos.push(pt[0], y, pt[1]);
    glowCol.push(...col);
  };

  const axisInfo = buildAxisComplex(S, addGlow);
  buildMonasteryRangesAndGrounds(S, data, axisInfo);

  const glow = glowPoints(glowPos, glowCol, 4);
  glow.userData.glow = true;
  glow.userData.landmark = id;
  group.add(glow);
}
