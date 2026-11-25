import { KIND, hex, shade } from '../../geo/buf.ts';
import { LAND_Y, PAL, roadWidth } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { pavilion } from '../citadel.ts';

// ---- Đàn Nam Giao, the Nguyễn esplanade of sacrifice to Heaven and Earth (1806), south of Huế ----
//
// Sources (docs/places/namgiao.md has the full list):
//  - vi.wikipedia.org/wiki/Đàn_Nam_Giao_(triều_Nguyễn): precinct about 265 x 390 m with a gate on each side,
//    stone screens 12.5 x 3.2 x 0.8 m; Viên đàn round 40.5 m across, 2.8 m high; Phương đàn square 83 m, 1.1 m high;
//    lowest tier square 165 m, 0.84 m high; Trai Cung at the south-west in a brick wall of 85 x 65 m.
export const id = 'namgiao';

const CENTER: [number, number] = [-676.2, 3455.6];
const TURN_RAD = (13.1 * Math.PI) / 180;
const AXIS_U: [number, number] = [Math.cos(TURN_RAD), -Math.sin(TURN_RAD)];
const AXIS_V: [number, number] = [Math.sin(TURN_RAD), Math.cos(TURN_RAD)];
const FRAME_ANGLE = Math.atan2(AXIS_U[1], AXIS_U[0]);

const TIER1_HALF = 82.5;
const TIER1_H = 0.84;
const TIER2_HALF = 41.5;
const TIER2_H = 1.1;
const TIER3_R = 20.25;
const TIER3_H = 2.8;
const LAWN_OUT = 75;
const LAWN_IN = 47;
const WALK_NS = 18.6;
const WALK_EW = 6.1;
const WALK_W = 5;
const PRECINCT_BOUNDS = { north: -138, south: 252, east: 130, west: -130 };
const CARDINAL_DIRS: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const STAIR_WIDTHS_T1 = [9, 6, 9, 6];
const STAIR_WIDTHS_T2 = [8, 6, 8, 6];
const STAIR_WIDTHS_T3 = [5, 5, 7.5, 5];

const COLORS = {
  lawn: hex('#85955a'),
  lawnLight: hex('#8d9d62'),
  bank: hex('#7f8f55'),
  grove: hex('#4f4a38'),
  groveLight: hex('#544e3b'),
  hedge: hex('#34492e'),
  laterite: hex('#8a7663'),
  brick: hex('#7a6a5c'),
  stone: hex('#bdb39e'),
  step: hex('#b0a690'),
  walk: hex('#94796a'),
  thanh: hex('#9d9c92'),
  cope: hex('#c9bfa9'),
  roundWall: hex('#a0957f'),
  red: hex('#9e3a2c'),
  yellow: hex('#d4ac45'),
  blue: hex('#3f6f9e'),
  tcWall: hex('#6e675c'),
  tcCope: hex('#4f5a50'),
  tcRoof: hex('#3d7d68'),
  tcRidge: hex('#d9c88f'),
  court: hex('#b8ae96'),
  courtSlab: hex('#a59c88'),
  wood: hex('#8a4a30'),
  dark: hex('#2b2422'),
  northWall: hex('#4a4842'),
  westWall: hex('#cfc8b6'),
  screenBody: hex('#8f8a7e'),
  screenPanel: hex('#a29c8e'),
  guardWall: hex('#e0d2ae'),
  pineDark: hex('#2f4a2c'),
  pineLight: hex('#3a5530'),
  smallWall: hex('#cfc4ad'),
  smallRoof: hex('#8d8a82'),
};

const toWorld = (uPos: number, vPos: number): [number, number] => [
  CENTER[0] + uPos * AXIS_U[0] + vPos * AXIS_V[0],
  CENTER[1] + uPos * AXIS_U[1] + vPos * AXIS_V[1],
];
const toLocal = (x: number, z: number): [number, number] => {
  const dx = x - CENTER[0];
  const dz = z - CENTER[1];
  return [dx * AXIS_U[0] + dz * AXIS_U[1], dx * AXIS_V[0] + dz * AXIS_V[1]];
};
const groundY = (uPos: number, vPos: number) => {
  const pt = toWorld(uPos, vPos);
  return LAND_Y + rise(pt[0], pt[1]);
};

function frameBox(S, uPos: number, vPos: number, y0: number, y1: number, width: number, depth: number, col: number[], opts?) {
  const pt = toWorld(uPos, vPos);
  S.box(pt[0], pt[1], y0, y1, width, depth, FRAME_ANGLE, col, opts);
}

function frameSpan(S, u0: number, u1: number, v0: number, v1: number, y0: number, y1: number, col: number[], opts?) {
  frameBox(S, (u0 + u1) / 2, (v0 + v1) / 2, y0, y1, u1 - u0, v1 - v0, col, opts);
}

function groundExtreme(u0: number, u1: number, v0: number, v1: number, reduceFn: (a: number, b: number) => number) {
  let acc = reduceFn === Math.max ? -Infinity : Infinity;
  for (let uPos = u0; uPos <= u1 + 0.01; uPos += (u1 - u0) / 12) {
    for (let vPos = v0; vPos <= v1 + 0.01; vPos += (v1 - v0) / 12) acc = reduceFn(acc, groundY(uPos, vPos));
  }
  return acc;
}

// build the three altar tiers, railings, stairs, incense stands, burner and pit
function buildAltarTiers(S, footY: number, minG: number, tier1Y: number, tier2Y: number, tier3Y: number) {
  const startVert = S.n;
  S.base = tier1Y - LAND_Y;
  S.kind = KIND.GROUND;

  if (footY > minG + 0.15) {
    const skirtHalf = TIER1_HALF + 0.6;
    const slope = 2.2;
    const rows = 8;
    const step = 3;
    const ring: [number, number][] = [];
    for (const [u0, v0, du, dv] of [[-skirtHalf, -skirtHalf, 1, 0], [skirtHalf, -skirtHalf, 0, 1], [skirtHalf, skirtHalf, -1, 0], [-skirtHalf, skirtHalf, 0, -1]] as [number, number, number, number][]) {
      const segLen = (2 * skirtHalf) / Math.round((2 * skirtHalf) / step);
      for (let dist = 0; dist < 2 * skirtHalf - 0.01; dist += segLen) ring.push([u0 + du * dist, v0 + dv * dist]);
    }
    const profiles = ring.map(([uPos, vPos]) => {
      const scaleOut = (dist: number): [number, number] => {
        const factor = (skirtHalf + dist) / skirtHalf;
        return [uPos * factor, vPos * factor];
      };
      let run = 0;
      while (run < 60 && footY - run / slope > groundY(...scaleOut(run)) - 0.3) run += 0.25;
      return Array.from({ length: rows + 1 }, (_, rowIdx) => {
        const dist = (run * rowIdx) / rows;
        const uv = scaleOut(dist);
        const pt = toWorld(uv[0], uv[1]);
        const gy = groundY(uv[0], uv[1]) - 0.3;
        const y = rowIdx === rows ? Math.min(footY, gy) : Math.max(footY - dist / slope, gy);
        return [pt[0], Math.min(footY, y), pt[1]];
      });
    });
    for (let i = 0; i < profiles.length; i++) {
      const pA = profiles[i];
      const pB = profiles[(i + 1) % profiles.length];
      for (let j = 0; j < rows; j++) S.quad(pA[j], pB[j], pB[j + 1], pA[j + 1], COLORS.bank, [0, 1, 0]);
    }
  }

  // lowest tier (ground + four L-shaped lawns + axial walks)
  S.kind = KIND.MASONRY;
  const tier1Start = S.n;
  frameSpan(S, -TIER1_HALF, TIER1_HALF, -TIER1_HALF, TIER1_HALF, footY - 0.2, tier1Y, COLORS.laterite, { top: COLORS.grove, topKind: KIND.GROUND });
  frameSpan(S, -TIER1_HALF - 0.25, TIER1_HALF + 0.25, -TIER1_HALF - 0.25, TIER1_HALF + 0.25, footY - 0.25, footY + 0.12, shade(COLORS.stone, 0.9));
  S.kind = KIND.GROUND;
  for (const su of [-1, 1]) {
    for (const sv of [-1, 1]) {
      const uRange = (a0: number, a1: number): [number, number] => [Math.min(su * a0, su * a1), Math.max(su * a0, su * a1)];
      const vRange = (b0: number, b1: number): [number, number] => [Math.min(sv * b0, sv * b1), Math.max(sv * b0, sv * b1)];
      frameSpan(S, ...uRange(LAWN_IN, LAWN_OUT), ...vRange(WALK_EW, LAWN_OUT), tier1Y, tier1Y + 0.05, COLORS.lawn);
      frameSpan(S, ...uRange(WALK_NS, LAWN_IN), ...vRange(LAWN_IN, LAWN_OUT), tier1Y, tier1Y + 0.05, COLORS.lawn);
    }
  }
  for (const side of [-1, 1]) {
    frameSpan(S, -WALK_NS, WALK_NS, Math.min(side * LAWN_IN, side * (TIER1_HALF - 0.4)), Math.max(side * LAWN_IN, side * (TIER1_HALF - 0.4)), tier1Y, tier1Y + 0.05, shade(COLORS.lawn, 0.96));
    frameSpan(S, Math.min(side * LAWN_IN, side * (TIER1_HALF - 0.4)), Math.max(side * LAWN_IN, side * (TIER1_HALF - 0.4)), -WALK_EW, WALK_EW, tier1Y, tier1Y + 0.05, shade(COLORS.lawn, 0.96));
  }
  (S.noCover = S.noCover || []).push([tier1Start, S.n]);

  S.kind = KIND.ROAD;
  const halfWalk = WALK_W / 2;
  frameSpan(S, -halfWalk, halfWalk, -TIER1_HALF + 0.4, -TIER2_HALF, tier1Y, tier1Y + 0.07, COLORS.walk);
  frameSpan(S, -halfWalk, halfWalk, TIER2_HALF, TIER1_HALF - 0.4, tier1Y, tier1Y + 0.07, COLORS.walk);
  frameSpan(S, -TIER1_HALF + 0.4, -TIER2_HALF, -halfWalk, halfWalk, tier1Y, tier1Y + 0.07, COLORS.walk);
  frameSpan(S, TIER2_HALF, TIER1_HALF - 0.4, -halfWalk, halfWalk, tier1Y, tier1Y + 0.07, COLORS.walk);

  // Phương đàn (middle tier)
  S.kind = KIND.MASONRY;
  const tier2Start = S.n;
  frameSpan(S, -TIER2_HALF, TIER2_HALF, -TIER2_HALF, TIER2_HALF, tier1Y - 0.1, tier2Y, COLORS.brick, { top: COLORS.groveLight, topKind: KIND.GROUND });
  frameSpan(S, -TIER2_HALF - 0.2, TIER2_HALF + 0.2, -TIER2_HALF - 0.2, TIER2_HALF + 0.2, tier1Y - 0.1, tier1Y + 0.14, shade(COLORS.stone, 0.9));
  S.kind = KIND.GROUND;
  for (const su of [-1, 1]) {
    for (const sv of [-1, 1]) frameSpan(S, Math.min(su * 17, su * 34), Math.max(su * 17, su * 34), Math.min(sv * 17, sv * 34), Math.max(sv * 17, sv * 34), tier2Y, tier2Y + 0.03, COLORS.lawnLight);
  }
  S.noCover.push([tier2Start, S.n]);
  S.kind = KIND.ROAD;
  frameSpan(S, -TIER2_HALF + 0.4, TIER2_HALF - 0.4, -halfWalk, halfWalk, tier2Y, tier2Y + 0.06, COLORS.walk);
  frameSpan(S, -halfWalk, halfWalk, -TIER2_HALF + 0.4, TIER2_HALF - 0.4, tier2Y, tier2Y + 0.06, COLORS.walk);

  // Viên đàn (round top tier)
  const centerPt = toWorld(0, 0);
  S.kind = KIND.MASONRY;
  S.cyl(centerPt[0], centerPt[1], tier2Y - 0.1, tier3Y, TIER3_R, TIER3_R, 48, COLORS.roundWall, { cap: false });
  S.cyl(centerPt[0], centerPt[1], tier2Y - 0.1, tier2Y + 0.2, TIER3_R + 0.25, TIER3_R + 0.25, 48, shade(COLORS.stone, 0.9), { cap: false });
  S.cyl(centerPt[0], centerPt[1], tier3Y - 0.22, tier3Y - 0.05, TIER3_R + 0.12, TIER3_R + 0.12, 48, COLORS.cope, { cap: false });
  S.kind = KIND.ROAD;
  S.cyl(centerPt[0], centerPt[1], tier3Y - 0.02, tier3Y, TIER3_R, TIER3_R, 48, COLORS.thanh);
  S.cyl(centerPt[0], centerPt[1], tier3Y, tier3Y + 0.12, 6.5, 6.5, 24, shade(COLORS.thanh, 1.08));
  S.kind = KIND.PLAIN;
  for (const [count, radius, startAng] of [[8, 4.5, 0.39], [20, 9.5, 0.16]] as [number, number, number][]) {
    for (let i = 0; i < count; i++) {
      const angle = startAng + (i / count) * Math.PI * 2;
      frameBox(S, Math.cos(angle) * radius, Math.sin(angle) * radius, tier3Y - 0.05, tier3Y + 0.22, 0.7, 0.7, shade(COLORS.stone, 1.05));
    }
  }

  // railings on all three tiers
  const drawPost = (uPos: number, vPos: number, y: number, height: number, col: number[]) => {
    S.kind = KIND.MASONRY;
    frameBox(S, uPos, vPos, y, y + height, 0.62, 0.62, col);
    frameBox(S, uPos, vPos, y + height, y + height + 0.12, 0.78, 0.78, shade(col, 1.1));
    frameBox(S, uPos, vPos, y + height + 0.12, y + height + 0.42, 0.42, 0.42, shade(col, 1.05), { taper: 0.35 });
  };
  const drawSquareRail = (halfSide: number, y: number, height: number, col: number[], widths: number[]) => {
    const thick = 0.3;
    const edge = halfSide - thick / 2;
    for (const [dirIdx, [du, dv]] of CARDINAL_DIRS.entries()) {
      const gapHalf = widths[dirIdx] / 2 + 0.6;
      for (const side of [-1, 1]) {
        const spanLen = halfSide - gapHalf;
        const midPos = ((gapHalf + halfSide) / 2) * side;
        const uPos = du ? du * edge : midPos;
        const vPos = dv ? dv * edge : midPos;
        S.kind = KIND.MASONRY;
        frameBox(S, uPos, vPos, y - 0.05, y + height, du ? thick : spanLen, du ? spanLen : thick, col);
        frameBox(S, uPos, vPos, y + height, y + height + 0.1, du ? thick + 0.14 : spanLen, du ? spanLen : thick + 0.14, shade(col, 1.12));
        const pilCount = Math.max(1, Math.round(spanLen / 4.2));
        for (let j = 1; j < pilCount; j++) {
          const along = side * (gapHalf + (spanLen * j) / pilCount);
          frameBox(S, du ? du * edge : along, dv ? dv * edge : along, y - 0.05, y + height + 0.06, du ? thick + 0.12 : 0.4, du ? 0.4 : thick + 0.12, shade(col, 0.94));
        }
        drawPost(du ? du * edge : side * gapHalf, dv ? dv * edge : side * gapHalf, y, height + 0.35, col);
      }
    }
  };
  drawSquareRail(TIER1_HALF, tier1Y, 0.93, COLORS.red, STAIR_WIDTHS_T1);
  drawSquareRail(TIER2_HALF, tier2Y, 0.9, COLORS.yellow, STAIR_WIDTHS_T2);

  const railThick = 0.3;
  const railH = 0.82;
  const railR = TIER3_R - railThick / 2;
  const segCount = 72;
  const railGaps = CARDINAL_DIRS.map(([du, dv], idx) => [Math.atan2(dv, du), (STAIR_WIDTHS_T3[idx] / 2 + 0.6) / railR]);
  for (let i = 0; i < segCount; i++) {
    const a0 = (i / segCount) * Math.PI * 2;
    const a1 = ((i + 1) / segCount) * Math.PI * 2;
    const midA = (a0 + a1) / 2;
    if (railGaps.some(([gapAng, halfAng]) => Math.abs(Math.atan2(Math.sin(midA - gapAng), Math.cos(midA - gapAng))) < halfAng)) continue;
    const segLen = 2 * railR * Math.sin((a1 - a0) / 2) + 0.03;
    const pt = toWorld(Math.cos(midA) * railR, Math.sin(midA) * railR);
    const boxAng = FRAME_ANGLE + midA + Math.PI / 2;
    S.kind = KIND.MASONRY;
    S.box(pt[0], pt[1], tier3Y - 0.05, tier3Y + railH, segLen, railThick, boxAng, COLORS.blue);
    S.box(pt[0], pt[1], tier3Y + railH, tier3Y + railH + 0.1, segLen, railThick + 0.14, boxAng, shade(COLORS.blue, 1.12));
    if (i % 3 === 0) S.box(pt[0], pt[1], tier3Y - 0.05, tier3Y + railH + 0.06, 0.4, railThick + 0.12, boxAng, shade(COLORS.blue, 0.94));
  }
  for (const [dirIdx, [du, dv]] of CARDINAL_DIRS.entries()) {
    for (const side of [-1, 1]) {
      const gapHalf = STAIR_WIDTHS_T3[dirIdx] / 2 + 0.6;
      const postAng = Math.atan2(dv, du) + side * Math.asin(gapHalf / railR);
      drawPost(Math.cos(postAng) * railR, Math.sin(postAng) * railR, tier3Y, railH + 0.35, COLORS.blue);
    }
  }

  // cardinal stairs on all three tiers
  const drawFlight = (du: number, dv: number, faceDist: number, yBot: number, yTop: number, steps: number, width: number, cheekCol: number[]) => {
    const riser = (yTop - yBot) / steps;
    const tread = 0.36;
    const run = tread * steps;
    S.kind = KIND.MASONRY;
    for (let k = 0; k < steps; k++) {
      const dist = faceDist + run - tread * (k + 0.5);
      frameBox(S, du * dist, dv * dist, yBot - 0.4, yBot + riser * (k + 1), du ? tread : width, du ? width : tread, COLORS.step, { topKind: KIND.ROAD });
    }
    for (const side of [-1, 1]) {
      const cheekU = du ? 0 : side * (width / 2 + 0.3);
      const cheekV = du ? side * (width / 2 + 0.3) : 0;
      for (let k = 0; k < steps; k++) {
        const dist = faceDist + run - tread * (k + 0.5);
        frameBox(S, du * dist + cheekU, dv * dist + cheekV, yBot - 0.4, yBot + riser * (k + 1) + 0.3, du ? tread + 0.02 : 0.6, du ? 0.6 : tread + 0.02, cheekCol, { top: COLORS.cope });
      }
    }
  };
  for (const [dirIdx, [du, dv]] of CARDINAL_DIRS.entries()) {
    drawFlight(du, dv, TIER3_R - 0.2, tier2Y, tier3Y, dirIdx === 2 ? 15 : 9, STAIR_WIDTHS_T3[dirIdx], COLORS.roundWall);
    drawFlight(du, dv, TIER2_HALF, tier1Y, tier2Y, 5, STAIR_WIDTHS_T2[dirIdx], COLORS.brick);
    drawFlight(du, dv, TIER1_HALF, footY, tier1Y, 4, STAIR_WIDTHS_T1[dirIdx], COLORS.laterite);
  }

  // incense stands, Liệu sở burner, Ế khảm pit
  S.kind = KIND.MASONRY;
  for (const side of [-1, 1]) {
    for (let k = 0; k < 6; k++) frameBox(S, side * 10, 50 + k * 4.4, tier1Y, tier1Y + 0.55, 1.1, 1.1, COLORS.stone, { top: shade(COLORS.stone, 1.08) });
  }
  frameBox(S, 68, 68, tier1Y, tier1Y + 1.9, 3.2, 3.2, COLORS.brick, { top: shade(COLORS.brick, 0.9) });
  frameBox(S, 68, 68, tier1Y + 1.9, tier1Y + 2.15, 3.6, 3.6, COLORS.cope);
  frameBox(S, 68, 68, tier1Y + 2.15, tier1Y + 3.3, 0.9, 0.9, COLORS.brick, { top: COLORS.dark, taper: 0.8 });
  frameBox(S, 68, 68 - 1.62, tier1Y + 0.3, tier1Y + 1.1, 0.9, 0.06, COLORS.dark);

  for (const [du, dv, width, depth] of [[0, -1.1, 2.6, 0.4], [0, 1.1, 2.6, 0.4], [-1.1, 0, 0.4, 1.8], [1.1, 0, 0.4, 1.8]] as [number, number, number, number][]) {
    frameBox(S, -68 + du, -68 + dv, tier1Y, tier1Y + 0.35, width, depth, COLORS.stone);
  }
  frameBox(S, -68, -68, tier1Y, tier1Y + 0.07, 1.8, 1.8, COLORS.dark);
  (S.paved = S.paved || []).push([startVert, S.n]);
}

// axial walks, young pines along tier 1 walks, stone screens, perimeter walls/hedges, and north guard house
function buildPrecinctFeatures(S, tier1Y: number) {
  const drawWalk = (u0: number, v0: number, u1: number, v1: number, width: number) => {
    const len = Math.hypot(u1 - u0, v1 - v0);
    const count = Math.max(1, Math.ceil(len / 6));
    const alongU = Math.abs(u1 - u0) > Math.abs(v1 - v0);
    S.kind = KIND.ROAD;
    for (let k = 0; k < count; k++) {
      const uPos = u0 + ((u1 - u0) * (k + 0.5)) / count;
      const vPos = v0 + ((v1 - v0) * (k + 0.5)) / count;
      const gy = groundY(uPos, vPos);
      frameBox(S, uPos, vPos, gy - 0.3, gy + 0.06, alongU ? len / count + 0.05 : width, alongU ? width : len / count + 0.05, COLORS.walk);
    }
  };
  const stairFoot = TIER1_HALF + 4 * 0.36 + 0.2;
  const walkStart = S.n;
  drawWalk(0, stairFoot, 0, PRECINCT_BOUNDS.south, WALK_W);
  drawWalk(0, -stairFoot, 0, PRECINCT_BOUNDS.north, WALK_W);
  drawWalk(stairFoot, 0, PRECINCT_BOUNDS.east, 0, WALK_W);
  drawWalk(-stairFoot, 0, PRECINCT_BOUNDS.west, 0, WALK_W);
  (S.paved = S.paved || []).push([walkStart, S.n]);

  // young pines flanking the axial walks on the lowest tier
  S.kind = KIND.PLAIN;
  const drawYoungPineRow = (u0: number, v0: number, u1: number, v1: number, offset: number) => {
    const len = Math.hypot(u1 - u0, v1 - v0);
    const count = Math.floor(len / 4.5);
    const nu = -(v1 - v0) / len;
    const nv = (u1 - u0) / len;
    for (const side of [-1, 1]) {
      for (let k = 0; k < count; k++) {
        const frac = (k + 0.5) / count;
        const pt = toWorld(u0 + (u1 - u0) * frac + nu * offset * side, v0 + (v1 - v0) * frac + nv * offset * side);
        const pineH = 4.5 + ((k * 7 + (side > 0 ? 3 : 0) + (offset > 10 ? 2 : 0)) % 5) * 0.5;
        S.cyl(pt[0], pt[1], tier1Y + 0.05, tier1Y + pineH, 1.0, 0.08, 6, k % 3 ? COLORS.pineDark : COLORS.pineLight, { cap: false });
      }
    }
  };
  const rowStart = LAWN_IN + 1.5;
  const rowEnd = TIER1_HALF - 2;
  for (const offset of [8.6, 13.6]) {
    for (const side of [-1, 1]) {
      drawYoungPineRow(0, side * rowStart, 0, side * rowEnd, offset);
      drawYoungPineRow(side * rowStart, 0, side * rowEnd, 0, offset);
    }
  }

  // stone screens before east, south and west gates
  const drawScreen = (uPos: number, vPos: number, acrossU: boolean) => {
    const baseY = Math.min(groundY(uPos - 6, vPos), groundY(uPos + 6, vPos), groundY(uPos, vPos - 6), groundY(uPos, vPos + 6));
    S.kind = KIND.MASONRY;
    frameBox(S, uPos, vPos, baseY - 0.5, baseY + 0.45, acrossU ? 13.3 : 1.4, acrossU ? 1.4 : 13.3, shade(COLORS.stone, 0.88));
    frameBox(S, uPos, vPos, baseY + 0.45, baseY + 3.0, acrossU ? 12.5 : 0.8, acrossU ? 0.8 : 12.5, COLORS.screenBody);
    frameBox(S, uPos, vPos, baseY + 3.0, baseY + 3.2, acrossU ? 13.0 : 1.05, acrossU ? 1.05 : 13.0, shade(COLORS.stone, 0.95), { taper: 0.92 });
    for (const side of [-1, 1]) frameBox(S, uPos + (acrossU ? side * 5.6 : 0), vPos + (acrossU ? 0 : side * 5.6), baseY + 0.45, baseY + 3.25, 1.0, 1.0, shade(COLORS.stone, 0.98));
    S.kind = KIND.PLAIN;
    for (const side of [-1, 1]) frameBox(S, uPos + (acrossU ? 0 : side * 0.42), vPos + (acrossU ? side * 0.42 : 0), baseY + 0.9, baseY + 2.6, acrossU ? 8.8 : 0.04, acrossU ? 0.04 : 8.8, COLORS.screenPanel);
  };
  drawScreen(0, PRECINCT_BOUNDS.south + 12, true);
  drawScreen(PRECINCT_BOUNDS.east + 12, 0, false);
  drawScreen(PRECINCT_BOUNDS.west - 12, 0, false);

  // modern perimeter walls (north & west) and undergrowth hedge
  const wallStart = S.n;
  const drawWallRun = (u0: number, v0: number, u1: number, v1: number, height: number, thick: number, col: number[], copeCol: number[]) => {
    const len = Math.hypot(u1 - u0, v1 - v0);
    const count = Math.max(1, Math.round(len / 6));
    const alongU = Math.abs(u1 - u0) > Math.abs(v1 - v0);
    const segLen = len / count + 0.04;
    for (let k = 0; k < count; k++) {
      const uPos = u0 + ((u1 - u0) * (k + 0.5)) / count;
      const vPos = v0 + ((v1 - v0) * (k + 0.5)) / count;
      const gy = groundY(uPos, vPos);
      S.kind = KIND.MASONRY;
      frameBox(S, uPos, vPos, gy - 0.4, gy + height, alongU ? segLen : thick, alongU ? thick : segLen, col, { top: copeCol });
    }
  };
  drawWallRun(-125, PRECINCT_BOUNDS.north - 0.4, -4, PRECINCT_BOUNDS.north - 0.4, 1.5, 0.5, COLORS.northWall, shade(COLORS.northWall, 1.15));
  drawWallRun(4, PRECINCT_BOUNDS.north - 0.4, 121, PRECINCT_BOUNDS.north - 0.4, 1.5, 0.5, COLORS.northWall, shade(COLORS.northWall, 1.15));
  drawWallRun(PRECINCT_BOUNDS.west, -134, PRECINCT_BOUNDS.west, -4, 1.6, 0.4, COLORS.westWall, shade(COLORS.westWall, 0.92));
  drawWallRun(PRECINCT_BOUNDS.west, 4, PRECINCT_BOUNDS.west, PRECINCT_BOUNDS.south - 1, 1.6, 0.4, COLORS.westWall, shade(COLORS.westWall, 0.92));

  let clumpIdx = 0;
  const drawHedge = (u0: number, v0: number, u1: number, v1: number) => {
    const len = Math.hypot(u1 - u0, v1 - v0);
    const count = Math.max(1, Math.round(len / 1.9));
    const nu = -(v1 - v0) / len;
    const nv = (u1 - u0) / len;
    S.kind = KIND.PLAIN;
    for (let j = 0; j < count; j++, clumpIdx++) {
      const frac = (j + 0.5) / count;
      const offset = (((clumpIdx * 7) % 5) - 2) * 0.3;
      const uPos = u0 + (u1 - u0) * frac + nu * offset;
      const vPos = v0 + (v1 - v0) * frac + nv * offset;
      const pt = toWorld(uPos, vPos);
      const gy = groundY(uPos, vPos);
      const clumpH = 2.2 + ((clumpIdx * 3) % 8) * 0.2;
      const clumpR = 1.25 + ((clumpIdx * 5) % 4) * 0.15;
      const col = shade(COLORS.hedge, 0.86 + ((clumpIdx * 5) % 7) * 0.04);
      S.cyl(pt[0], pt[1], gy - 0.2, gy + clumpH * 0.4, clumpR * 0.75, clumpR, 10, col, { cap: false });
      S.cyl(pt[0], pt[1], gy + clumpH * 0.4, gy + clumpH * 0.75, clumpR, clumpR * 0.8, 10, shade(col, 1.03), { cap: false });
      S.cyl(pt[0], pt[1], gy + clumpH * 0.75, gy + clumpH, clumpR * 0.8, clumpR * 0.3, 10, shade(col, 1.07));
    }
  };
  const eastH = 119.5;
  const southH = 250;
  const northH = PRECINCT_BOUNDS.north + 1.8;
  const westH = PRECINCT_BOUNDS.west + 1.8;
  drawHedge(-124, northH, -5, northH);
  drawHedge(5, northH, eastH, northH);
  drawHedge(westH, -134, westH, -5);
  drawHedge(westH, 5, westH, southH);
  drawHedge(eastH, -134, eastH, -5);
  drawHedge(eastH, 5, eastH, southH);
  drawHedge(westH + 1.5, southH, -5, southH);
  drawHedge(5, southH, eastH - 1.5, southH);
  (S.paved = S.paved || []).push([wallStart, S.n]);

  // guard house by the north gate (OSM 1473250838)
  const guardRing: [number, number][] = [[-719.7, 3341.1], [-708.0, 3337.9], [-705.6, 3346.3], [-717.4, 3349.5]];
  const center = guardRing.reduce<[number, number]>((acc, pt) => [acc[0] + pt[0] / 4, acc[1] + pt[1] / 4], [0, 0]);
  const ex = guardRing[1][0] - guardRing[0][0];
  const ez = guardRing[1][1] - guardRing[0][1];
  const width = Math.hypot(ex, ez);
  const depth = Math.hypot(guardRing[2][0] - guardRing[1][0], guardRing[2][1] - guardRing[1][1]);
  const angle = Math.atan2(ez, ex);
  let loG = Infinity;
  let hiG = -Infinity;
  for (const pt of guardRing) {
    const gy = LAND_Y + rise(pt[0], pt[1]);
    loG = Math.min(loG, gy);
    hiG = Math.max(hiG, gy);
  }
  S.kind = KIND.MASONRY;
  S.box(center[0], center[1], loG - 0.4, hiG + 3.2, width, depth, angle, COLORS.guardWall, { top: shade(COLORS.guardWall, 0.8) });
  S.kind = KIND.TIMBER;
  S.hip(center[0], center[1], width, depth, angle, hiG + 3.2, 2.0, PAL.templeRoof, { over: 0.6, flare: 0.25 });
}

// pines: closed wood over the precinct, groves on the tiers, and pine screen along Minh Mạng
function plantPrecinctPines(data, S, tier1Y: number, tier2Y: number) {
  if (!Array.isArray(data.trees)) return;
  const trees = data.trees;
  const nearCount = data.meta?.counts?.treesNear;
  for (let i = trees.length / 4 - 1; i >= 0; i--) {
    const [uPos, vPos] = toLocal(trees[i * 4] / 10, trees[i * 4 + 1] / 10);
    if (uPos < PRECINCT_BOUNDS.west - 1 || uPos > PRECINCT_BOUNDS.east + 1 || vPos < PRECINCT_BOUNDS.north - 1 || vPos > PRECINCT_BOUNDS.south + 1) continue;
    trees.splice(i * 4, 4);
    if (nearCount != null && i < nearCount) data.meta.counts.treesNear--;
  }

  const roadSegs: [number, number, number, number, number][] = [];
  const minhMangSegs: [number, number, number, number, number][] = [];
  for (const road of data.roads || []) {
    const coords = road[2];
    const halfW = roadWidth(road) / 2 + 1.5;
    for (let i = 0; i + 3 < coords.length; i += 2) {
      const [u0, v0] = toLocal(coords[i] / 10, coords[i + 1] / 10);
      const [u1, v1] = toLocal(coords[i + 2] / 10, coords[i + 3] / 10);
      if ((road[0] | 0) === 0 && Math.max(u0, u1) < PRECINCT_BOUNDS.west - 15 && Math.min(u0, u1) > PRECINCT_BOUNDS.west - 130 && Math.max(v0, v1) > PRECINCT_BOUNDS.north && Math.min(v0, v1) < PRECINCT_BOUNDS.south) {
        minhMangSegs.push([u0, v0, u1, v1, halfW]);
      }
      if (Math.max(u0, u1) < PRECINCT_BOUNDS.west - 130 || Math.min(u0, u1) > PRECINCT_BOUNDS.east + 15 || Math.max(v0, v1) < PRECINCT_BOUNDS.north - 15 || Math.min(v0, v1) > PRECINCT_BOUNDS.south + 15) continue;
      if ((road[0] | 0) >= 5 && Math.max(Math.abs(u0), Math.abs(v0), Math.abs(u1), Math.abs(v1)) < TIER1_HALF + 5) continue;
      roadSegs.push([u0, v0, u1, v1, halfW]);
    }
  }
  const onRoad = (uPos: number, vPos: number) => roadSegs.some(([u0, v0, u1, v1, halfW]) => {
    const du = u1 - u0, dv = v1 - v0, lenSq = du * du + dv * dv;
    const frac = lenSq ? Math.max(0, Math.min(1, ((uPos - u0) * du + (vPos - v0) * dv) / lenSq)) : 0;
    return Math.hypot(uPos - u0 - frac * du, vPos - v0 - frac * dv) < halfW;
  });
  const hash = (aVal: number, bVal: number) => {
    const val = Math.sin(aVal * 127.1 + bVal * 311.7) * 43758.5453;
    return val - Math.floor(val);
  };
  const inBox = (absU: number, absV: number, u0: number, u1: number, v0: number, v1: number, margin: number) =>
    absU > u0 - margin && absU < u1 + margin && absV > v0 - margin && absV < v1 + margin;
  const onLawn = (absU: number, absV: number, margin: number) =>
    inBox(absU, absV, LAWN_IN, LAWN_OUT, WALK_EW, LAWN_OUT, margin)
    || inBox(absU, absV, WALK_NS, LAWN_IN, LAWN_IN, LAWN_OUT, margin)
    || inBox(absU, absV, 0, WALK_NS, LAWN_IN, TIER1_HALF, margin)
    || inBox(absU, absV, LAWN_IN, TIER1_HALF, 0, WALK_EW, margin);

  const seqStart = trees.length;
  const putPine = (uPos: number, vPos: number, scale: number) => {
    const pt = toWorld(uPos, vPos);
    trees.push(Math.round(pt[0] * 10), Math.round(pt[1] * 10), Math.round(scale * 10), 3);
  };
  const plantGrid = (spacing: number, testFn: (uPos: number, vPos: number) => boolean, minScale: number, maxScale: number, salt: number) => {
    for (let gu = Math.floor(PRECINCT_BOUNDS.west / spacing); gu <= Math.ceil(PRECINCT_BOUNDS.east / spacing); gu++) {
      for (let gv = Math.floor(PRECINCT_BOUNDS.north / spacing); gv <= Math.ceil(PRECINCT_BOUNDS.south / spacing); gv++) {
        const uPos = gu * spacing + (hash(gu, gv + salt) - 0.5) * spacing * 0.7;
        const vPos = gv * spacing + (hash(gv - salt, gu) - 0.5) * spacing * 0.7;
        if (testFn(uPos, vPos)) putPine(uPos, vPos, minScale + (maxScale - minScale) * hash(gu + salt, gv * 3));
      }
    }
  };

  const walkClear = WALK_W / 2 + 2.2;
  const inWood = (uPos: number, vPos: number) => {
    const absU = Math.abs(uPos);
    const absV = Math.abs(vPos);
    if (uPos < PRECINCT_BOUNDS.west + 3.5 || uPos > PRECINCT_BOUNDS.east - 3.5 || vPos < PRECINCT_BOUNDS.north + 4 || vPos > PRECINCT_BOUNDS.south - 3) return false;
    if (Math.max(absU, absV) < TIER1_HALF + 4) return false;
    if ((absU < walkClear && absV > TIER1_HALF) || (absV < walkClear && absU > TIER1_HALF)) return false;
    return !onRoad(uPos, vPos);
  };
  plantGrid(4.3, inWood, 1.15, 1.65, 0);
  plantGrid(4.6, (uPos, vPos) => inWood(uPos, vPos) && Math.min(uPos - PRECINCT_BOUNDS.west, PRECINCT_BOUNDS.east - uPos, vPos - PRECINCT_BOUNDS.north, PRECINCT_BOUNDS.south - vPos) < 14, 0.55, 0.8, 17);
  plantGrid(9, inWood, 0.6, 0.85, 29);

  plantGrid(3.3, (uPos, vPos) => {
    const absU = Math.abs(uPos), absV = Math.abs(vPos), maxCoord = Math.max(absU, absV);
    if (maxCoord > TIER1_HALF - 1.8 || maxCoord < TIER2_HALF + 1.8 || onLawn(absU, absV, 0.2)) return false;
    return absU > WALK_W / 2 + 3 && absV > WALK_W / 2 + 3;
  }, 1.0, 1.4, 41);

  plantGrid(3.3, (uPos, vPos) => {
    const absU = Math.abs(uPos), absV = Math.abs(vPos);
    if (Math.max(absU, absV) > TIER2_HALF - 1.8 || Math.hypot(uPos, vPos) < TIER3_R + 2.2 || inBox(absU, absV, 17, 34, 17, 34, 0.3)) return false;
    return absU > WALK_W / 2 + 2.6 && absV > WALK_W / 2 + 2.6 && !(vPos > 0 && absU < 7 && vPos < TIER3_R + 6.5);
  }, 1.0, 1.35, 53);

  const minhMangEdgeU = (vPos: number) => {
    let best = -Infinity;
    for (const [u0, v0, u1, v1, halfW] of minhMangSegs) {
      if ((vPos - v0) * (vPos - v1) > 0 || v0 === v1) continue;
      best = Math.max(best, u0 + ((u1 - u0) * (vPos - v0)) / (v1 - v0) + halfW);
    }
    return best;
  };
  const inTraiCung = (uPos: number, vPos: number) => uPos > -212 && uPos < -136 && vPos > 157 && vPos < 254;
  const inWestScreen = (uPos: number, vPos: number) => uPos < PRECINCT_BOUNDS.west - 1.5 && vPos > PRECINCT_BOUNDS.north && vPos < PRECINCT_BOUNDS.south && uPos > minhMangEdgeU(vPos) + 8 && !inTraiCung(uPos, vPos);
  for (let i = seqStart / 4 - 1; i >= 0; i--) {
    const [uPos, vPos] = toLocal(trees[i * 4] / 10, trees[i * 4 + 1] / 10);
    if (!inWestScreen(uPos, vPos)) continue;
    trees.splice(i * 4, 4);
    if (nearCount != null && i < nearCount) data.meta.counts.treesNear--;
  }
  for (let gu = Math.floor((PRECINCT_BOUNDS.west - 130) / 4.3); gu < Math.ceil(PRECINCT_BOUNDS.west / 4.3); gu++) {
    for (let gv = Math.floor(PRECINCT_BOUNDS.north / 4.3); gv <= Math.ceil(PRECINCT_BOUNDS.south / 4.3); gv++) {
      const uPos = gu * 4.3 + (hash(gu, gv + 61) - 0.5) * 3;
      const vPos = gv * 4.3 + (hash(gv - 61, gu) - 0.5) * 3;
      if (inWestScreen(uPos, vPos) && !onRoad(uPos, vPos)) putPine(uPos, vPos, 1.1 + 0.5 * hash(gu + 61, gv * 3));
    }
  }

  (S.stand = S.stand || []).push((x: number, z: number) => {
    const [uPos, vPos] = toLocal(x, z);
    const maxCoord = Math.max(Math.abs(uPos), Math.abs(vPos));
    if (maxCoord > TIER1_HALF + 0.3) return 0;
    const gy = LAND_Y + rise(x, z);
    return Math.max(0, (maxCoord < TIER2_HALF + 0.2 ? tier2Y : tier1Y) - gy);
  });
}

// Trai Cung: the fasting palace at the south-west, facing south, in an 85 x 65 m brick wall
function buildTraiCung(S) {
  const axisU = -173.9;
  const northV = 164;
  const southV = 247;
  const halfW = 32;
  const startVert = S.n;
  let courtY = -Infinity;
  let minCourtG = Infinity;
  for (let uPos = axisU - halfW; uPos <= axisU + halfW; uPos += 8.5) {
    for (let vPos = northV; vPos <= southV; vPos += 6.5) {
      const gy = groundY(uPos, vPos);
      courtY = Math.max(courtY, gy);
      minCourtG = Math.min(minCourtG, gy);
    }
  }
  courtY += 0.12;
  S.base = courtY - LAND_Y;
  S.kind = KIND.ROAD;
  frameSpan(S, axisU - halfW + 0.4, axisU + halfW - 0.4, northV + 0.4, southV - 0.4, minCourtG - 0.4, courtY, COLORS.court, { top: COLORS.court });

  // stone-paved court behind main hall with column bases
  const ru0 = axisU - 14.15, ru1 = axisU + 14.15, rv0 = 171.1, rv1 = 200.2;
  S.kind = KIND.MASONRY;
  frameSpan(S, ru0, ru1, rv0, rv1, courtY - 0.2, courtY + 0.3, shade(COLORS.stone, 0.92), { top: COLORS.courtSlab, topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;
  for (const [x0, x1, z0, z1] of [[ru0 + 1.6, ru1 - 1.6, rv0 + 1.6, rv0 + 1.6], [ru0 + 1.6, ru1 - 1.6, rv1 - 9, rv1 - 9], [ru0 + 1.6, ru0 + 1.6, rv0 + 1.6, rv1 - 9], [ru1 - 1.6, ru1 - 1.6, rv0 + 1.6, rv1 - 9]] as [number, number, number, number][]) {
    const count = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / 4.2));
    for (let k = 0; k <= count; k++) frameBox(S, x0 + ((x1 - x0) * k) / count, z0 + ((z1 - z0) * k) / count, courtY + 0.3, courtY + 0.42, 0.75, 0.75, shade(COLORS.stone, 0.78));
  }

  // brick precinct wall
  const wallH = 2.6;
  const gateHalf = 7;
  const drawWall = (u0: number, v0: number, u1: number, v1: number) => {
    const len = Math.hypot(u1 - u0, v1 - v0);
    const count = Math.max(1, Math.round(len / 8.5));
    const alongU = Math.abs(u1 - u0) > Math.abs(v1 - v0);
    const segLen = len / count + 0.04;
    for (let k = 0; k < count; k++) {
      const uPos = u0 + ((u1 - u0) * (k + 0.5)) / count;
      const vPos = v0 + ((v1 - v0) * (k + 0.5)) / count;
      const gy = Math.min(groundY(uPos, vPos), courtY);
      S.kind = KIND.MASONRY;
      frameBox(S, uPos, vPos, gy - 0.6, courtY + wallH, alongU ? segLen : 0.6, alongU ? 0.6 : segLen, COLORS.tcWall);
      S.kind = KIND.TILE;
      frameBox(S, uPos, vPos, courtY + wallH, courtY + wallH + 0.28, alongU ? segLen : 0.95, alongU ? 0.95 : segLen, COLORS.tcCope, { taper: 0.6 });
    }
  };
  drawWall(axisU - halfW, northV, axisU - 2.5, northV);
  drawWall(axisU + 2.5, northV, axisU + halfW, northV);
  drawWall(axisU - halfW, southV, axisU - gateHalf - 2, southV);
  drawWall(axisU + gateHalf + 2, southV, axisU + halfW, southV);
  drawWall(axisU - halfW, northV, axisU - halfW, southV);
  drawWall(axisU + halfW, northV, axisU + halfW, southV);

  // south gate (three openings, two-tier middle roof) and north gate posts
  const southGatePt = toWorld(axisU, southV);
  S.kind = KIND.MASONRY;
  for (const side of [-1, 1]) {
    for (const pierIdx of [1, 2]) frameBox(S, axisU + side * (pierIdx === 1 ? 2.3 : 6.6), southV, courtY - 0.5, courtY + (pierIdx === 1 ? 4.6 : 3.6), 1.1, 1.3, COLORS.tcWall, { top: COLORS.tcCope });
    frameBox(S, axisU + side * 4.45, southV, courtY + 2.9, courtY + 3.6, 3.2, 1.1, COLORS.tcWall);
    frameBox(S, axisU + side * 8.3, southV, courtY - 0.5, courtY + 3.0, 1.0, 1.0, COLORS.tcWall, { top: COLORS.tcCope });
  }
  S.kind = KIND.PLAIN;
  frameBox(S, axisU, southV + 0.66, courtY, courtY + 3.7, 3.4, 0.06, COLORS.dark);
  for (const side of [-1, 1]) frameBox(S, axisU + side * 4.45, southV + 0.6, courtY, courtY + 2.8, 3.0, 0.06, COLORS.dark);
  S.kind = KIND.TIMBER;
  S.hip(southGatePt[0], southGatePt[1], 5.2, 2.2, FRAME_ANGLE, courtY + 4.6, 1.3, COLORS.tcRoof, { over: 0.6, flare: 0.5, ridgeCol: COLORS.tcRidge, hips: true, glazed: true });
  S.box(southGatePt[0], southGatePt[1], courtY + 5.4, courtY + 6.2, 3.2, 1.4, FRAME_ANGLE, PAL.lacquer);
  S.hip(southGatePt[0], southGatePt[1], 3.4, 1.6, FRAME_ANGLE, courtY + 6.2, 1.1, COLORS.tcRoof, { over: 0.55, flare: 0.5, ridgeCol: COLORS.tcRidge, hips: true, glazed: true });
  for (const side of [-1, 1]) {
    const sidePt = toWorld(axisU + side * 4.45, southV);
    S.hip(sidePt[0], sidePt[1], 3.6, 1.9, FRAME_ANGLE, courtY + 3.6, 0.9, COLORS.tcRoof, { over: 0.45, flare: 0.4, ridgeCol: COLORS.tcRidge });
  }
  for (const side of [-1, 1]) {
    S.kind = KIND.MASONRY;
    frameBox(S, axisU + side * 2.9, northV, courtY - 0.5, courtY + 3.4, 0.9, 0.9, COLORS.tcWall, { top: COLORS.tcCope });
  }

  // halls: chính điện, Tả/Hữu Túc, Thượng Trà, Thượng Thiện, service houses
  const drawHall = (uPos: number, vPos: number, width: number, depth: number, faceSouth: boolean, opts?) => {
    const pt = toWorld(uPos, vPos);
    return pavilion(S, pt[0], pt[1], width, depth, faceSouth ? FRAME_ANGLE : FRAME_ANGLE + Math.PI / 2, courtY, { tiers: 1, roof: COLORS.tcRoof, ridge: COLORS.tcRidge, ...opts });
  };
  const mainPlatformPt = toWorld(axisU, 202.6);
  S.kind = KIND.MASONRY;
  S.box(mainPlatformPt[0], mainPlatformPt[1], courtY - 0.2, courtY + 0.75, 13.4, 21.2, FRAME_ANGLE, COLORS.stone, { topKind: KIND.ROAD });
  for (let k = 1; k <= 4; k++) frameBox(S, axisU, 213.2 + k * 0.34, courtY - 0.2, courtY + 0.75 - k * 0.17, 5, 0.34, shade(COLORS.stone, 1.05), { topKind: KIND.ROAD });
  drawHall(axisU, 197.5, 11.9, 9.4, true, { wallH: 4.0, wall: PAL.lacquer, over: 0.9, rh: 3.4, platform: 0.75, steps: false, colonnade: true });
  drawHall(axisU, 207.7, 11.9, 9.4, true, { wallH: 3.6, wall: PAL.lacquer, over: 0.9, rh: 3.0, platform: 0.75, steps: false, colonnade: true });
  for (const sideU of [-196.8, -151.1]) drawHall(sideU, 229.2, 23.8, 7.3, false, { wallH: 3.1, wall: COLORS.wood, over: 0.85, rh: 2.4, platform: 0.45 });
  drawHall(-195.4, 175.9, 10.2, 9.4, true, { wallH: 2.9, wall: COLORS.wood, over: 0.8, rh: 2.3, platform: 0.35 });
  drawHall(-150.2, 176.1, 8.2, 9.2, true, { wallH: 2.9, wall: COLORS.wood, over: 0.8, rh: 2.3, platform: 0.35 });
  drawHall(-161.6, 240.6, 9.2, 7.1, true, { wallH: 2.7, wall: COLORS.wood, over: 0.8, rh: 1.9, platform: 0.3 });
  drawHall(-193.4, 201, 6.4, 4.6, false, { wallH: 2.5, wall: COLORS.smallWall, roof: COLORS.smallRoof, over: 0.6, rh: 1.6, platform: 0.2 });
  (S.paved = S.paved || []).push([startVert, S.n]);
}

export function build({ data, S }) {
  const prevKind = S.kind;
  const maxG = groundExtreme(-TIER1_HALF, TIER1_HALF, -TIER1_HALF, TIER1_HALF, Math.max);
  const minG = groundExtreme(-TIER1_HALF - 15, TIER1_HALF + 15, -TIER1_HALF - 15, TIER1_HALF + 15, Math.min);
  const footY = maxG;
  const tier1Y = footY + TIER1_H;
  const tier2Y = tier1Y + TIER2_H;
  const tier3Y = tier2Y + TIER3_H;

  buildAltarTiers(S, footY, minG, tier1Y, tier2Y, tier3Y);
  buildPrecinctFeatures(S, tier1Y);
  buildTraiCung(S);
  plantPrecinctPines(data, S, tier1Y, tier2Y);

  S.kind = prevKind;
  S.base = 0;
}
