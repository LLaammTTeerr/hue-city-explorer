import { KIND, hex, shade, unflat, obb } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { rise, pondY } from '../../geo/terrain.ts';
import { pavilion } from '../citadel.ts';
import * as props from '../props.ts';

// ---- Lăng Đồng Khánh (Tư Lăng), tomb of Emperor Đồng Khánh, Thủy Xuân, Huế ----
//
// Sources (docs/places/dongkhanh.md has the full list):
//  - vi.wikipedia.org/wiki/Lăng_Đồng_Khánh: temple zone (khu tẩm điện) facing south-east with a half-moon pond,
//    Điện Ngưng Hy (three joined houses on a 25 x 24 m base), Cung Môn, side halls; tomb zone facing east-south-east
//    with three square Bửu Thành walls, Bái Đình, Bi Đình (neo-classical, slate roof) and two trụ biểu.
export const id = 'dongkhanh';

const COLORS = {
  brick: hex('#6c6656'),
  brickMoss: hex('#5f6350'),
  cap: hex('#7e7a70'),
  stone: PAL.stone,
  blueStone: hex('#6f7472'),
  paving: hex('#a39d8c'),
  lacquer: hex('#8a3529'),
  lacquerOld: hex('#73392e'),
  gold: hex('#c9a246'),
  roofY: hex('#c89a3a'),
  roofYOld: hex('#ad8a44'),
  ridge: hex('#e3cf86'),
  stucco: hex('#827f78'),
  stuccoDark: hex('#5e5c58'),
  lawn: hex('#a1a574'),
  retain: hex('#8a8474'),
  slate: hex('#4f4f4e'),
  mandarin: hex('#6e6c66'),
  door: hex('#2b2422'),
  roofGrey: hex('#5d5c57'),
  roofTerra: hex('#a4573b'),
  render: hex('#7a756a'),
  foot: hex('#4f5148'),
  court: hex('#66594d'),
  courtPale: hex('#ada593'),
  panel: hex('#97938a'),
  pathPale: hex('#b9b5aa'),
  bank: hex('#8c8a82'),
  stele: hex('#454848'),
  stelePale: hex('#b3b0a6'),
  steleTrim: hex('#5b5e5d'),
  innerGateDoor: hex('#3a3a30'),
  truBieuBody: hex('#8d8c86'),
  familyRoof: hex('#7a6552'),
};

const TEMPLE_ORIGIN: [number, number] = [-2049.8, 4261.7];
const TEMPLE_FWD: [number, number] = [0.57696, 0.81678];
const TOMB_ORIGIN: [number, number] = [-2195.1, 4335.9];
const TOMB_FWD: [number, number] = [0.99337, 0.11496];
const TEMPLE_BOUNDS = { s0: -22, s1: 50, halfT: 28, break1: 26.9, break2: 43.8 };
const OWNED_OSM_IDS = new Set([264285403, 264285404, 264285405, 264285407, 627391948]);

const groundY = (x: number, z: number) => LAND_Y + rise(x, z);
const clamp = (val: number, minVal: number, maxVal: number) => Math.max(minVal, Math.min(maxVal, val));

interface AxisFrame {
  angle: number;
  at: (along: number, across?: number) => [number, number];
}

function createAxis(origin: [number, number], fwd: [number, number]): AxisFrame {
  const len = Math.hypot(fwd[0], fwd[1]);
  const ux = fwd[0] / len;
  const uz = fwd[1] / len;
  return {
    angle: Math.atan2(uz, ux),
    at: (along, across = 0) => [origin[0] + ux * along - uz * across, origin[1] + uz * along + ux * across],
  };
}

function groundSpan(axisFrame: AxisFrame, s0: number, s1: number, t0: number, t1: number) {
  let lo = Infinity;
  let hi = -Infinity;
  const ns = Math.max(2, Math.ceil((s1 - s0) / 4));
  const nt = Math.max(2, Math.ceil((t1 - t0) / 4));
  for (let i = 0; i <= ns; i++) {
    for (let j = 0; j <= nt; j++) {
      const pt = axisFrame.at(s0 + ((s1 - s0) * i) / ns, t0 + ((t1 - t0) * j) / nt);
      const gy = groundY(pt[0], pt[1]);
      lo = Math.min(lo, gy);
      hi = Math.max(hi, gy);
    }
  }
  return { lo, hi };
}

function templeLevels(axisFrame: AxisFrame) {
  const { s0, s1, halfT, break1, break2 } = TEMPLE_BOUNDS;
  const hallY = groundSpan(axisFrame, s0, break1, -halfT, halfT).hi + 0.1;
  const courtY = Math.min(hallY - 0.3, groundSpan(axisFrame, break1, break2, -halfT, halfT).hi + 0.1);
  const forecourtY = Math.min(courtY - 0.3, groundSpan(axisFrame, break2, s1, -halfT, halfT).hi + 0.1);
  return { hallY, courtY, forecourtY, at: (along: number) => (along > break2 ? forecourtY : along > break1 ? courtY : hallY) };
}

// sloped grass bank against the temple wall
function buildBerm(S, data, highPart: boolean) {
  const axisFrame = createAxis(TEMPLE_ORIGIN, TEMPLE_FWD);
  const levels = templeLevels(axisFrame);
  const { s0, s1, halfT } = TEMPLE_BOUNDS;
  const wallHalf = 0.28;
  const bankReach = 15;
  const gridStep = 2;

  const roads: [[number, number], [number, number], number][] = [];
  for (const road of data?.roads || []) {
    const coords = road[2];
    if (!Array.isArray(coords)) continue;
    for (let i = 0; i + 3 < coords.length; i += 2) {
      const p0: [number, number] = [coords[i] / 10, coords[i + 1] / 10];
      const p1: [number, number] = [coords[i + 2] / 10, coords[i + 3] / 10];
      if (Math.max(p0[0], p1[0]) < -2140 || Math.min(p0[0], p1[0]) > -1960 || Math.max(p0[1], p1[1]) < 4190 || Math.min(p0[1], p1[1]) > 4350) continue;
      roads.push([p0, p1, road[0] === 5 ? 2.4 : 4.6]);
    }
  }
  const nearRoad = (x: number, z: number) => roads.some(([p0, p1, clearW]) => {
    const dx = p1[0] - p0[0], dz = p1[1] - p0[1];
    const frac = clamp(((x - p0[0]) * dx + (z - p0[1]) * dz) / (dx * dx + dz * dz || 1), 0, 1);
    return Math.hypot(x - p0[0] - frac * dx, z - p0[1] - frac * dz) < clearW;
  });
  const liftedGround = (x: number, z: number) => {
    const gx = groundY(x + 1, z) - groundY(x - 1, z);
    const gz = groundY(x, z + 1) - groundY(x, z - 1);
    return groundY(x, z) + 0.06 + 0.4 * Math.hypot(gx, gz);
  };
  const bankExcess = (along: number, across: number) => {
    const dist = Math.hypot(Math.max(s0 - wallHalf - along, 0, along - s1 - wallHalf), Math.max(Math.abs(across) - halfT - wallHalf, 0));
    if (dist > bankReach) return 0;
    const fade = along > s1 ? clamp((Math.abs(across) - 9) / 5, 0, 1) : 1;
    const pt = axisFrame.at(along, across);
    return fade * Math.max(0, levels.at(clamp(along, s0, s1)) - 0.6 - dist / 3 - liftedGround(pt[0], pt[1]));
  };
  const linspace = (a0: number, a1: number, count: number) => Array.from({ length: count + 1 }, (_, i) => a0 + ((a1 - a0) * i) / count);
  const sVals = [...linspace(s0 - wallHalf - bankReach, s0 - wallHalf, bankReach / gridStep), ...linspace(s0 - wallHalf, s1 + wallHalf, 36).slice(1), ...linspace(s1 + wallHalf, s1 + wallHalf + bankReach, bankReach / gridStep).slice(1)];
  const tVals = [...linspace(-halfT - wallHalf - bankReach, -halfT - wallHalf, bankReach / gridStep), ...linspace(-halfT - wallHalf, halfT + wallHalf, 28).slice(1), ...linspace(halfT + wallHalf, halfT + wallHalf + bankReach, bankReach / gridStep).slice(1)];

  S.kind = KIND.GROUND;
  for (let i = 0; i + 1 < sVals.length; i++) {
    for (let j = 0; j + 1 < tVals.length; j++) {
      const midS = (sVals[i] + sVals[i + 1]) / 2;
      const midT = (tVals[j] + tVals[j + 1]) / 2;
      if (midS > s0 - wallHalf && midS < s1 + wallHalf && Math.abs(midT) < halfT + wallHalf) continue;
      const midPt = axisFrame.at(midS, midT);
      if (nearRoad(midPt[0], midPt[1])) continue;
      const corners: [number, number][] = [[sVals[i], tVals[j]], [sVals[i + 1], tVals[j]], [sVals[i + 1], tVals[j + 1]], [sVals[i], tVals[j + 1]]];
      const excesses = corners.map(([cs, ct]) => bankExcess(cs, ct));
      if (Math.max(...excesses) < 0.02 || (bankExcess(midS, midT) > 1.2) !== highPart) continue;
      const verts = corners.map(([cs, ct], idx) => {
        const pt = axisFrame.at(cs, ct);
        return [pt[0], liftedGround(pt[0], pt[1]) + excesses[idx], pt[1]];
      });
      S.base = groundY(midPt[0], midPt[1]) - LAND_Y;
      S.quad(verts[0], verts[3], verts[2], verts[1], COLORS.lawn, [0, 1, 0]);
    }
  }
}

// stone-faced embankment round the half-moon pond
function buildPondEmbankment(S, data) {
  const ponds = data?.ponds || [];
  let pondRing: [number, number][] | null = null;
  let pondIdx = -1;
  ponds.forEach((pondPoly, idx) => {
    const raw = Array.isArray(pondPoly[0]) ? pondPoly[0] : pondPoly;
    if (!raw || raw.length < 8) return;
    let cx = 0, cz = 0;
    for (let k = 0; k < raw.length; k += 2) { cx += raw[k]; cz += raw[k + 1]; }
    cx /= raw.length * 5;
    cz /= raw.length * 5;
    if (Math.hypot(cx + 1990, cz - 4363) < 30) {
      pondRing = unflat(raw);
      pondIdx = idx;
    }
  });
  if (!pondRing) return;
  const waterY = pondY(data, pondIdx);
  S.kind = KIND.MASONRY;
  for (let i = 0; i < pondRing.length; i++) {
    const p0 = pondRing[i];
    const p1 = pondRing[(i + 1) % pondRing.length];
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    if (len < 0.3) continue;
    const subCount = Math.ceil(len / 6);
    const angle = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
    for (let k = 0; k < subCount; k++) {
      const segA: [number, number] = [p0[0] + ((p1[0] - p0[0]) * k) / subCount, p0[1] + ((p1[1] - p0[1]) * k) / subCount];
      const segB: [number, number] = [p0[0] + ((p1[0] - p0[0]) * (k + 1)) / subCount, p0[1] + ((p1[1] - p0[1]) * (k + 1)) / subCount];
      const mid: [number, number] = [(segA[0] + segB[0]) / 2, (segA[1] + segB[1]) / 2];
      const topY = Math.max(groundY(segA[0], segA[1]), groundY(segB[0], segB[1]), groundY(mid[0], mid[1]), waterY + 0.5) + 0.12;
      S.base = topY - LAND_Y;
      S.box(mid[0], mid[1], waterY - 0.6, topY, len / subCount + 0.35, 0.5, angle, COLORS.bank, { top: COLORS.cap });
    }
  }
}

function drawSlab(S, axisFrame: AxisFrame, s0: number, s1: number, t0: number, t1: number, topY: number, col = COLORS.paving, sideCol = COLORS.stone) {
  const { lo } = groundSpan(axisFrame, s0, s1, t0, t1);
  const pt = axisFrame.at((s0 + s1) / 2, (t0 + t1) / 2);
  S.kind = KIND.MASONRY;
  S.base = topY - LAND_Y;
  S.box(pt[0], pt[1], Math.min(lo - 0.8, topY - 0.3), topY, s1 - s0, t1 - t0, axisFrame.angle, sideCol, { top: col, topKind: KIND.ROAD });
}

function drawSteps(S, axisFrame: AxisFrame, s0: number, y0: number, s1: number, y1: number, width: number, across = 0, opts: { col?: number[]; cheeks?: number; n?: number } = {}) {
  const { col = COLORS.blueStone, cheeks = 0, n: stepCountOverride = 0 } = opts;
  const count = stepCountOverride || clamp(Math.round(Math.abs(y1 - y0) / 0.16), 1, 30);
  const len = s1 - s0;
  S.kind = KIND.MASONRY;
  for (let k = 0; k < count; k++) {
    const sa = s0 + (len * k) / count;
    const sb = s0 + (len * (k + 1)) / count;
    const topY = y0 + ((y1 - y0) * (k + 1)) / count;
    const pt = axisFrame.at((sa + sb) / 2, across);
    S.base = topY - LAND_Y;
    S.box(pt[0], pt[1], Math.min(y0, y1) - 0.8, topY, Math.abs(sb - sa) + 0.02, width, axisFrame.angle, col, { top: shade(col, 1.12), topKind: KIND.ROAD });
  }
  if (cheeks) {
    for (const side of [-1, 1]) {
      const p0 = axisFrame.at(s0, across + side * (width / 2 + cheeks / 2));
      const p1 = axisFrame.at(s1, across + side * (width / 2 + cheeks / 2));
      S.beam([p0[0], y0 + 0.35, p0[1]], [p1[0], y1 + 0.35, p1[1]], cheeks, 0.9, shade(col, 0.9));
      S.box(p0[0], p0[1], y0 - 0.5, y0 + 1.1, cheeks + 0.15, cheeks + 0.15, axisFrame.angle, shade(col, 0.85), { taper: 0.8 });
    }
  }
}

function drawWallPolyline(S, axisFrame: AxisFrame, pts: [number, number][], heightOrFn: number | ((onY: number, minG: number) => number), thick: number, opts: Record<string, any> = {}) {
  const { col = COLORS.brickMoss, cap = COLORS.cap, base = null, gaps = [], maxSeg = 8, kind = KIND.MASONRY, open = false } = opts;
  S.kind = kind;
  for (let i = 0; i + 1 < pts.length; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const runs: [number, number][] = [];
    let cursor = 0;
    for (const [gapCenter, gapW] of (gaps[i] || []).slice().sort((a0, b0) => a0[0] - b0[0])) {
      const g0 = gapCenter / len - gapW / 2 / len;
      const g1 = gapCenter / len + gapW / 2 / len;
      if (g0 > cursor) runs.push([cursor, g0]);
      cursor = Math.max(cursor, g1);
    }
    if (cursor < 1) runs.push([cursor, 1]);
    for (const [r0, r1] of runs) {
      const runLen = (r1 - r0) * len;
      const subCount = Math.max(1, Math.ceil(runLen / maxSeg));
      for (let k = 0; k < subCount; k++) {
        const fa = r0 + ((r1 - r0) * k) / subCount;
        const fb = r0 + ((r1 - r0) * (k + 1)) / subCount;
        const localA: [number, number] = [p0[0] + (p1[0] - p0[0]) * fa, p0[1] + (p1[1] - p0[1]) * fa];
        const localB: [number, number] = [p0[0] + (p1[0] - p0[0]) * fb, p0[1] + (p1[1] - p0[1]) * fb];
        const worldA = axisFrame.at(localA[0], localA[1]);
        const worldB = axisFrame.at(localB[0], localB[1]);
        const worldMid = axisFrame.at((localA[0] + localB[0]) / 2, (localA[1] + localB[1]) / 2);
        const gs = [groundY(worldA[0], worldA[1]), groundY(worldB[0], worldB[1]), groundY(worldMid[0], worldMid[1])];
        const lo = Math.min(...gs) - 0.6;
        const onY = base != null ? base(localA, localB) : Math.max(...gs);
        const wallH = typeof heightOrFn === 'function' ? heightOrFn(onY, lo + 0.6) : heightOrFn;
        S.base = onY - LAND_Y;
        const segAng = Math.atan2(worldB[1] - worldA[1], worldB[0] - worldA[0]);
        const segLen = runLen / subCount + (k === subCount - 1 ? thick * 0.5 : 0);
        if (open) {
          S.box(worldMid[0], worldMid[1], lo, onY + 0.16, segLen, thick, segAng, col, { top: cap });
          const balCount = Math.max(1, Math.round(segLen / 0.55));
          for (let m = 0; m < balCount; m++) {
            const offset = -segLen / 2 + (segLen * (m + 0.5)) / balCount;
            S.box(worldMid[0] + Math.cos(segAng) * offset, worldMid[1] + Math.sin(segAng) * offset, onY + 0.16, onY + wallH, 0.13, 0.13, segAng, col);
          }
          for (const offset of [-segLen / 2 + 0.12, segLen / 2 - 0.12]) {
            S.box(worldMid[0] + Math.cos(segAng) * offset, worldMid[1] + Math.sin(segAng) * offset, onY + 0.16, onY + wallH, 0.26, thick + 0.04, segAng, col);
          }
          S.box(worldMid[0], worldMid[1], onY + wallH - 0.12, onY + wallH, segLen, thick, segAng, col, { top: cap });
        } else {
          S.box(worldMid[0], worldMid[1], lo, onY + wallH, segLen, thick, segAng, col, { top: cap });
        }
        S.box(worldMid[0], worldMid[1], onY + wallH, onY + wallH + 0.12, runLen / subCount, thick + 0.14, segAng, cap);
      }
    }
  }
}

function drawArchGate(S, cx: number, cz: number, angle: number, width: number, depth: number, baseY: number, height: number, opts: Record<string, any> = {}) {
  const { col = COLORS.brickMoss, roof = COLORS.roofYOld, open = 2.0 } = opts;
  S.kind = KIND.MASONRY;
  S.base = baseY - LAND_Y;
  S.box(cx, cz, baseY - 1, baseY + height, width, depth, angle, col, { top: shade(col, 0.9) });
  S.kind = KIND.PLAIN;
  S.box(cx, cz, baseY, baseY + height * 0.62, open, depth + 0.12, angle, COLORS.door);
  S.cyl(cx, cz, baseY + height * 0.62 - 0.01, baseY + height * 0.62 + 0.02, open / 2, open / 2, 8, COLORS.door, { rot: angle });
  const ux = Math.cos(angle);
  const uz = Math.sin(angle);
  for (const side of [-1, 1]) {
    S.box(cx - uz * side * (depth / 2 + 0.02), cz + ux * side * (depth / 2 + 0.02), baseY + height * 0.62, baseY + height * 0.62 + open * 0.42, open * 0.72, 0.06, angle, COLORS.door, { taper: 0.55 });
  }
  S.hip(cx, cz, width + 0.2, depth + 0.4, angle, baseY + height, 1.0, roof, { flare: 0.3, over: 0.45, fascia: 0.18, fasciaCol: shade(col, 0.8), ridgeCol: COLORS.ridge, hips: true, glazed: true, segs: 2 });
}

// temple zone: Điện Ngưng Hy, side halls, compound wall, and Cung Môn
function buildTemple(S) {
  const axisFrame = createAxis(TEMPLE_ORIGIN, TEMPLE_FWD);
  const acrossAngle = axisFrame.angle + Math.PI / 2;
  const { s0, s1, halfT, break1, break2 } = TEMPLE_BOUNDS;
  const { hallY, courtY, forecourtY } = templeLevels(axisFrame);

  drawSlab(S, axisFrame, s0, break1, -halfT, halfT, hallY, COLORS.court, COLORS.foot);
  drawSlab(S, axisFrame, break1, break2, -halfT, halfT, courtY, COLORS.court, COLORS.foot);
  drawSlab(S, axisFrame, break2, s1, -halfT, halfT, forecourtY, COLORS.court, COLORS.foot);
  drawSteps(S, axisFrame, break2 + 1.6, forecourtY, break2, courtY, 6);
  for (const across of [-14, 14]) drawSteps(S, axisFrame, break2 + 1.6, forecourtY, break2, courtY, 3, across);
  drawSteps(S, axisFrame, break1 + 1.6, courtY, break1, hallY, 7);

  const pathPt = axisFrame.at((break1 + 1.6 + break2) / 2);
  S.kind = KIND.MASONRY;
  S.box(pathPt[0], pathPt[1], courtY - 0.2, courtY + 0.06, break2 - break1 - 1.6, 3, axisFrame.angle, COLORS.pathPale, { topKind: KIND.ROAD });

  // Điện Ngưng Hy: three joined houses on one 25 x 24 m base
  const hallS0 = -0.3;
  const hallS1 = 23.7;
  const plinthY = hallY + 0.75;
  drawSlab(S, axisFrame, hallS0 - 1, hallS1 + 1, -13.5, 13.5, plinthY, shade(COLORS.paving, 1.04), COLORS.blueStone);
  for (const across of [-8, 0, 8]) drawSteps(S, axisFrame, hallS1 + 2.6, hallY, hallS1 + 1, plinthY, across ? 2.6 : 3.6, across, { cheeks: 0.4 });

  const hallGroundRef = axisFrame.at(9, 0);
  const refG = groundY(hallGroundRef[0], hallGroundRef[1]);
  const houseDepth = (hallS1 - hallS0) / 3;
  const houses = [
    { along: hallS1 - houseDepth / 2, width: 25, top: refG + 7.9, wallH: 3.5, open: true },
    { along: hallS1 - houseDepth * 1.5, width: 25, top: refG + 8.6, wallH: 3.9, open: false },
    { along: hallS0 + houseDepth / 2, width: 23, top: refG + 7.6, wallH: 3.5, open: false },
  ];
  for (const house of houses) {
    const pt = axisFrame.at(house.along);
    S.base = plinthY - LAND_Y;
    pavilion(S, pt[0], pt[1], house.width, houseDepth - 0.2, acrossAngle, plinthY, { wallH: house.wallH, rh: house.top - plinthY - house.wallH, roof: COLORS.roofY, wall: COLORS.lacquer, over: 1.0, colonnade: house.open, segs: 3 });
  }
  S.kind = KIND.PLAIN;
  for (let k = -3; k <= 3; k++) {
    const pt = axisFrame.at(hallS1 - 1.5, k * 3.3);
    S.box(pt[0], pt[1], plinthY, plinthY + 2.9, 0.08, 2.2, axisFrame.angle, k % 2 ? COLORS.lacquerOld : shade(COLORS.gold, 0.8));
  }

  // rear annex and four side halls
  const annexPt = axisFrame.at(-4.6);
  S.kind = KIND.MASONRY;
  S.base = hallY - LAND_Y;
  S.box(annexPt[0], annexPt[1], hallY - 0.4, hallY + 0.45, 7.2, 15, axisFrame.angle, COLORS.stone, { top: shade(COLORS.paving, 1.04), topKind: KIND.ROAD });
  pavilion(S, annexPt[0], annexPt[1], 13, 6, acrossAngle, hallY + 0.45, { wallH: 3.0, rh: 2.6, roof: COLORS.roofGrey, wall: COLORS.lacquerOld, over: 0.8, segs: 2 });

  for (const side of [-1, 1]) {
    const frontPt = axisFrame.at(35.3, side * 18.2);
    S.kind = KIND.MASONRY;
    S.base = courtY - LAND_Y;
    S.box(frontPt[0], frontPt[1], courtY - 0.4, courtY + 0.45, 16.6, 12, axisFrame.angle, COLORS.stone, { top: shade(COLORS.paving, 1.04), topKind: KIND.ROAD });
    pavilion(S, frontPt[0], frontPt[1], 15.5, 10, axisFrame.angle, courtY + 0.45, { wallH: 3.0, rh: 2.6, roof: COLORS.roofGrey, wall: COLORS.lacquerOld, over: 0.9, segs: 2 });

    const backPt = axisFrame.at(-5.3, side * 19.6);
    S.kind = KIND.MASONRY;
    S.base = hallY - LAND_Y;
    S.box(backPt[0], backPt[1], hallY - 0.4, hallY + 0.4, 17, 11, axisFrame.angle, COLORS.stone, { top: shade(COLORS.paving, 1.04), topKind: KIND.ROAD });
    pavilion(S, backPt[0], backPt[1], 15.5, 9.5, axisFrame.angle, hallY + 0.4, { wallH: 2.9, rh: 2.5, roof: COLORS.roofGrey, wall: COLORS.lacquerOld, over: 0.9, segs: 2 });
  }

  // compound wall and side/rear arched gates
  const levelAt = (p0: [number, number], p1: [number, number]) => {
    const along = Math.max(p0[0], p1[0]);
    return along > break2 ? forecourtY : along > break1 ? courtY : hallY;
  };
  const sideGateS = 22.8;
  const wallRing: [number, number][] = [[s1, -halfT], [s1, halfT], [s0, halfT], [s0, -halfT], [s1, -halfT]];
  drawWallPolyline(S, axisFrame, wallRing, (onY, minG) => Math.max(2.4, minG + 3.0 - onY), 0.55, {
    col: COLORS.render, kind: KIND.PLAIN, base: levelAt, gaps: [[[halfT, 13.4]], [[s1 - sideGateS, 3.6]], [[halfT, 3.6]], [[sideGateS - s0, 3.6]]],
  });
  for (const side of [-1, 1]) {
    const pt = axisFrame.at(sideGateS, side * halfT);
    drawArchGate(S, pt[0], pt[1], axisFrame.angle, 3.6, 1.4, hallY, 3.4, { col: COLORS.render, roof: COLORS.roofTerra });
    S.kind = KIND.MASONRY;
    S.box(pt[0], pt[1], hallY - 0.6, hallY + 0.9, 4.0, 1.7, axisFrame.angle, COLORS.foot);
  }
  const rearGatePt = axisFrame.at(s0, 0);
  drawArchGate(S, rearGatePt[0], rearGatePt[1], acrossAngle, 4.2, 1.4, hallY, 3.6, { col: COLORS.render, roof: COLORS.roofTerra });

  // Cung Môn two-storey timber gate on terrace with 15 blue-stone steps
  const gateTopY = forecourtY + 0.45;
  const gateS = s1 + 2.5;
  const gatePt = axisFrame.at(gateS);
  S.kind = KIND.MASONRY;
  S.base = gateTopY - LAND_Y;
  S.box(gatePt[0], gatePt[1], groundSpan(axisFrame, gateS - 4.5, gateS + 4.5, -8, 8).lo - 0.8, gateTopY, 9, 15, axisFrame.angle, COLORS.blueStone, { top: shade(COLORS.paving, 1.05), topKind: KIND.ROAD });
  drawSteps(S, axisFrame, gateS - 5, forecourtY, gateS - 4.4, gateTopY, 5);
  S.base = gateTopY - LAND_Y;
  pavilion(S, gatePt[0], gatePt[1], 12.6, 6.4, acrossAngle, gateTopY, { tiers: 2, wallH: 3.3, rh: 2.3, roof: COLORS.roofTerra, wall: COLORS.lacquer, over: 0.9, colonnade: true, segs: 3 });
  const stairFoot = axisFrame.at(gateS + 4.5 + 4.6);
  const stairFootY = Math.max(groundY(stairFoot[0], stairFoot[1]), gateTopY - 15 * 0.17);
  drawSteps(S, axisFrame, gateS + 4.5 + 4.6, stairFootY, gateS + 4.5, gateTopY, 5, 0, { cheeks: 0.5 });
}

// neo-classical cement stele house (Bi Đình)
function buildBiDinh(S, axisFrame: AxisFrame, along: number, baseY: number) {
  const pt = axisFrame.at(along);
  const angle = axisFrame.angle;
  const acrossAngle = angle + Math.PI / 2;
  const width = 7.2;
  const wallH = 5.0;

  S.kind = KIND.MASONRY;
  S.base = baseY - LAND_Y;
  S.box(pt[0], pt[1], baseY - 0.2, baseY + 0.3, width + 0.8, width + 0.8, angle, COLORS.steleTrim, { top: shade(COLORS.court, 1.05) });
  const floorY = baseY + 0.3;
  S.kind = KIND.PLAIN;
  S.base = floorY - LAND_Y;
  S.box(pt[0], pt[1], floorY, floorY + wallH, width, width, angle, COLORS.stele);

  for (let i = 0; i < 4; i++) {
    const faceAng = angle + (i * Math.PI) / 2;
    const ux = Math.cos(faceAng);
    const uz = Math.sin(faceAng);
    const facePt = [pt[0] + ux * (width / 2 + 0.02), pt[1] + uz * (width / 2 + 0.02)];
    const trimPt = [pt[0] + ux * (width / 2 + 0.08), pt[1] + uz * (width / 2 + 0.08)];
    S.box(facePt[0], facePt[1], floorY, floorY + 2.7, 0.06, 2.1, faceAng, COLORS.door);
    S.box(facePt[0], facePt[1], floorY + 2.7, floorY + 3.4, 0.06, 2.1, faceAng, COLORS.door, { taper: 0.5 });
    for (const offset of [-1.25, 1.25]) S.box(trimPt[0] - uz * offset, trimPt[1] + ux * offset, floorY, floorY + 2.8, 0.12, 0.35, faceAng, COLORS.steleTrim);
    S.box(trimPt[0], trimPt[1], floorY + 3.3, floorY + 3.75, 0.12, 2.9, faceAng, COLORS.steleTrim, { taper: 0.6 });
    for (const offset of [-3.35, -1.75, 1.75, 3.35]) S.box(trimPt[0] - uz * offset, trimPt[1] + ux * offset, floorY, floorY + wallH, 0.14, 0.55, faceAng, COLORS.steleTrim);
    for (const offset of [-2.55, 2.55]) {
      S.box(facePt[0] - uz * offset, facePt[1] + ux * offset, floorY + 0.7, floorY + 3.3, 0.08, 1.0, faceAng, COLORS.stelePale);
      S.box(facePt[0] - uz * offset, facePt[1] + ux * offset, floorY + 3.6, floorY + 4.4, 0.08, 1.0, faceAng, shade(COLORS.stelePale, 0.9));
    }
    S.box(facePt[0], facePt[1], floorY + 3.95, floorY + 4.55, 0.08, 2.4, faceAng, shade(COLORS.stelePale, 0.85));
  }

  const corniceY = floorY + wallH;
  S.box(pt[0], pt[1], corniceY, corniceY + 0.35, width + 0.5, width + 0.5, angle, COLORS.steleTrim, { top: COLORS.steleTrim });
  S.hip(pt[0], pt[1], width + 0.2, width + 0.2, acrossAngle, corniceY + 0.3, 1.1, COLORS.slate, { flare: 0.45, over: 0.55, ridgeCol: COLORS.steleTrim, hips: true, segs: 3, horns: true, fascia: 0.16, fasciaCol: COLORS.steleTrim });

  const atticY = corniceY + 0.85;
  const atticW = 4.6;
  const atticH = 1.25;
  S.box(pt[0], pt[1], atticY, atticY + atticH, atticW, atticW, angle, COLORS.stele, { top: COLORS.steleTrim });
  for (let i = 0; i < 4; i++) {
    const faceAng = angle + (i * Math.PI) / 2;
    const ux = Math.cos(faceAng);
    const uz = Math.sin(faceAng);
    const facePt = [pt[0] + ux * (atticW / 2 + 0.03), pt[1] + uz * (atticW / 2 + 0.03)];
    for (const offset of [-1.35, 0, 1.35]) S.box(facePt[0] - uz * offset, facePt[1] + ux * offset, atticY + 0.25, atticY + atticH - 0.25, 0.06, offset ? 0.95 : 1.3, faceAng, COLORS.stelePale);
    for (const offset of [-2.15, 2.15]) S.box(facePt[0] - uz * offset, facePt[1] + ux * offset, atticY, atticY + atticH, 0.12, 0.3, faceAng, COLORS.steleTrim);
  }

  const upperRoofY = atticY + atticH;
  S.box(pt[0], pt[1], upperRoofY, upperRoofY + 0.2, atticW + 0.4, atticW + 0.4, angle, COLORS.steleTrim);
  S.hip(pt[0], pt[1], atticW, atticW, acrossAngle, upperRoofY + 0.15, 1.0, COLORS.slate, { flare: 0.4, over: 0.5, ridgeCol: COLORS.steleTrim, hips: true, segs: 3, horns: true });
  S.kind = KIND.PLAIN;
  const finialY = upperRoofY + 1.15;
  S.box(pt[0], pt[1], finialY - 0.1, finialY + 0.25, 0.7, 0.7, angle, COLORS.steleTrim);
  S.cyl(pt[0], pt[1], finialY + 0.25, finialY + 0.6, 0.32, 0.22, 8, COLORS.steleTrim);
  S.cyl(pt[0], pt[1], finialY + 0.6, finialY + 1.2, 0.2, 0.03, 8, COLORS.steleTrim);

  // 1917 stele inside
  S.box(pt[0], pt[1], floorY, floorY + 0.6, 1.4, 2.6, angle, COLORS.blueStone);
  S.box(pt[0], pt[1], floorY + 0.6, floorY + 3.2, 0.3, 1.8, angle, shade(COLORS.blueStone, 1.15));
}

function buildTruBieu(S, axisFrame: AxisFrame, along: number, across: number, baseY: number) {
  const pt = axisFrame.at(along, across);
  const angle = axisFrame.angle;
  const height = 10;
  S.kind = KIND.PLAIN;
  S.base = baseY - LAND_Y;
  S.box(pt[0], pt[1], baseY - 0.3, baseY + 0.15, 2.4, 2.4, angle, COLORS.stuccoDark);
  S.box(pt[0], pt[1], baseY - 0.3, baseY + 0.35, 2.1, 2.1, angle, COLORS.stuccoDark);
  S.box(pt[0], pt[1], baseY + 0.35, baseY + 1.2, 1.8, 1.8, angle, COLORS.truBieuBody, { top: COLORS.panel });
  S.box(pt[0], pt[1], baseY + 1.2, baseY + height - 2.2, 1.7, 1.7, angle, COLORS.truBieuBody, { taper: 0.9 });
  S.box(pt[0], pt[1], baseY + height - 2.2, baseY + height - 1.9, 1.8, 1.8, angle, shade(COLORS.truBieuBody, 1.1));
  S.box(pt[0], pt[1], baseY + height - 1.9, baseY + height - 1.0, 1.3, 1.3, angle, COLORS.panel);
  S.hip(pt[0], pt[1], 1.5, 1.5, angle, baseY + height - 1.0, 0.45, COLORS.stuccoDark, { flare: 0.15, over: 0.15, hips: true });
  S.cyl(pt[0], pt[1], baseY + height - 0.6, baseY + height, 0.22, 0.04, 6, COLORS.stuccoDark);
}

// tomb zone: Bửu Thành, front court, Bái Đình statues, Bi Đình and trụ biểu
function buildTomb(S) {
  const axisFrame = createAxis(TOMB_ORIGIN, TOMB_FWD);
  const acrossAngle = axisFrame.angle + Math.PI / 2;
  const frontEnd = 23;
  const baiDinhEnd = 35.5;
  const steleEnd = 61.5;
  const courtHalfW = 13;
  const steleHalfW = 16;

  const steleCourtY = groundSpan(axisFrame, baiDinhEnd, steleEnd, -steleHalfW, steleHalfW).hi + 0.3;
  const baiDinhY = Math.max(groundSpan(axisFrame, frontEnd, baiDinhEnd, -courtHalfW, courtHalfW).hi + 0.25, steleCourtY + 0.35);
  const frontCourtY = Math.max(groundSpan(axisFrame, 12.5, frontEnd, -courtHalfW, courtHalfW).hi + 0.25, baiDinhY + 0.35);
  const buuThanhY = Math.max(groundSpan(axisFrame, -13, 13, -13, 13).hi + 0.3, frontCourtY + 0.35);

  // Bửu Thành: three square walls round the blue-stone tomb house
  drawSlab(S, axisFrame, -13, 13, -13, 13, buuThanhY, shade(COLORS.paving, 0.95), COLORS.brick);
  const squareRing = (radius: number): [number, number][] => [[radius, -radius], [radius, radius], [-radius, radius], [-radius, -radius], [radius, -radius]];
  const flatLevel = (y: number) => () => y;
  drawWallPolyline(S, axisFrame, squareRing(12.5), 1.6, 0.5, { base: flatLevel(buuThanhY), gaps: [[[12.5, 2.4]]] });
  for (const side of [-1, 1]) {
    const pt = axisFrame.at(12.5, side * 1.5);
    S.kind = KIND.MASONRY;
    S.box(pt[0], pt[1], buuThanhY, buuThanhY + 2.3, 0.7, 0.7, axisFrame.angle, COLORS.brickMoss, { top: COLORS.cap });
  }
  const screenPt = axisFrame.at(10.6);
  S.kind = KIND.MASONRY;
  S.box(screenPt[0], screenPt[1], buuThanhY, buuThanhY + 2.3, 0.45, 4.2, axisFrame.angle, COLORS.stucco, { top: COLORS.cap });
  const screenPanelPt = axisFrame.at(10.85);
  S.kind = KIND.PLAIN;
  S.box(screenPanelPt[0], screenPanelPt[1], buuThanhY + 0.6, buuThanhY + 1.9, 0.06, 1.8, axisFrame.angle, COLORS.stuccoDark);

  drawWallPolyline(S, axisFrame, squareRing(8.6), 0.5, 0.7, { base: flatLevel(buuThanhY), gaps: [[[8.6, 2.0]]] });
  const innerY = buuThanhY + 0.35;
  drawSlab(S, axisFrame, -6.2, 6.2, -6.2, 6.2, innerY, shade(COLORS.paving, 0.9), COLORS.brick);
  drawWallPolyline(S, axisFrame, squareRing(6), 3.4, 0.6, { base: flatLevel(innerY), gaps: [[[6, 1.6]]] });
  const innerGatePt = axisFrame.at(6);
  S.kind = KIND.MASONRY;
  S.box(innerGatePt[0], innerGatePt[1], innerY, innerY + 3.9, 0.9, 2.8, axisFrame.angle, COLORS.brickMoss, { top: COLORS.cap });
  S.kind = KIND.PLAIN;
  S.box(innerGatePt[0], innerGatePt[1], innerY, innerY + 2.4, 0.95, 1.3, axisFrame.angle, COLORS.innerGateDoor);
  S.hip(innerGatePt[0], innerGatePt[1], 2.8, 1.2, acrossAngle, innerY + 3.9, 0.7, COLORS.slate, { flare: 0.2, over: 0.3, ridgeCol: COLORS.stuccoDark, hips: true });

  const gravePt = axisFrame.at(-0.5);
  S.kind = KIND.MASONRY;
  S.base = innerY - LAND_Y;
  S.box(gravePt[0], gravePt[1], innerY, innerY + 0.5, 5.0, 3.4, axisFrame.angle, shade(COLORS.blueStone, 0.9));
  S.box(gravePt[0], gravePt[1], innerY + 0.5, innerY + 1.5, 4.2, 2.6, axisFrame.angle, COLORS.blueStone);
  S.hip(gravePt[0], gravePt[1], 4.2, 2.6, axisFrame.angle, innerY + 1.5, 0.8, shade(COLORS.blueStone, 0.85), { flare: 0.15, over: 0.25, ridgeCol: shade(COLORS.blueStone, 1.1), hips: true });

  // three terraced courts, axial path, and stairs
  drawSlab(S, axisFrame, 12.5, frontEnd, -courtHalfW, courtHalfW, frontCourtY, COLORS.courtPale, COLORS.retain);
  drawSlab(S, axisFrame, frontEnd, baiDinhEnd, -courtHalfW, courtHalfW, baiDinhY, COLORS.court, COLORS.retain);
  const laneS0 = 44.5;
  const laneS1 = 50;
  const laneT = -11.2;
  drawSlab(S, axisFrame, baiDinhEnd, laneS0, -steleHalfW, steleHalfW, steleCourtY, COLORS.court, COLORS.retain);
  drawSlab(S, axisFrame, laneS0, laneS1, laneT, steleHalfW, steleCourtY, COLORS.court, COLORS.retain);
  drawSlab(S, axisFrame, laneS1, steleEnd, -steleHalfW, steleHalfW, steleCourtY, COLORS.court, COLORS.retain);

  const drawPath = (s0: number, s1: number, y: number) => {
    const pt = axisFrame.at((s0 + s1) / 2);
    S.kind = KIND.MASONRY;
    S.box(pt[0], pt[1], y - 0.2, y + 0.05, s1 - s0, 2.4, axisFrame.angle, COLORS.pathPale, { topKind: KIND.ROAD });
  };
  drawPath(14.3, frontEnd, frontCourtY);
  drawPath(frontEnd + 1.2, baiDinhEnd, baiDinhY);
  drawPath(baiDinhEnd + 1.2, 37.4, steleCourtY);
  drawPath(50.6, steleEnd, steleCourtY);
  drawSteps(S, axisFrame, 14.3, frontCourtY, 12.7, buuThanhY, 2.4);
  drawSteps(S, axisFrame, frontEnd + 1.2, baiDinhY, frontEnd, frontCourtY, 3);
  drawSteps(S, axisFrame, baiDinhEnd + 1.2, steleCourtY, baiDinhEnd, baiDinhY, 3);
  const eastFootPt = axisFrame.at(steleEnd + 2.4);
  const eastFootY = Math.max(groundY(eastFootPt[0], eastFootPt[1]), steleCourtY - 2.4);
  drawSteps(S, axisFrame, steleEnd + 2.4, eastFootY, steleEnd, steleCourtY, 4);

  // stele terrace, Bi Đình, and trụ biểu
  const steleTerraceY = steleCourtY + 0.85;
  const ts0 = 38.6;
  const ts1 = 49.4;
  const tHalf = 6.5;
  drawSlab(S, axisFrame, ts0, ts1, -tHalf, tHalf, steleTerraceY, COLORS.court, COLORS.steleTrim);
  drawWallPolyline(S, axisFrame, [[ts1, -tHalf], [ts1, tHalf], [ts0, tHalf], [ts0, -tHalf], [ts1, -tHalf]], 0.75, 0.24, {
    col: COLORS.steleTrim, cap: shade(COLORS.stelePale, 0.85), base: flatLevel(steleTerraceY), gaps: [[[tHalf, 3.4]], [], [[tHalf, 3.4]]], maxSeg: 4, open: true,
  });
  drawSteps(S, axisFrame, ts1 + 1.2, steleCourtY, ts1, steleTerraceY, 3.2, 0, { col: COLORS.steleTrim, n: 3 });
  drawSteps(S, axisFrame, ts0 - 1.2, steleCourtY, ts0, steleTerraceY, 3.2, 0, { col: COLORS.steleTrim, n: 3 });
  buildBiDinh(S, axisFrame, 44, steleTerraceY);
  for (const side of [-1, 1]) buildTruBieu(S, axisFrame, side < 0 ? 43.5 : 44, side * 13.5, steleCourtY);

  // Bái Đình statues and court edge balustrades
  for (const side of [-1, 1]) {
    const elePt = axisFrame.at(24.8, side * 11.5);
    props.elephant(S, elePt[0], baiDinhY, elePt[1], axisFrame.angle + Math.PI, { s: 0.7, col: COLORS.mandarin });
    const horsePt = axisFrame.at(27.4, side * 11.5);
    props.horse(S, horsePt[0], baiDinhY, horsePt[1], axisFrame.angle + Math.PI, { s: 0.85, col: COLORS.mandarin });
    const faceAngle = side > 0 ? axisFrame.angle - Math.PI / 2 : axisFrame.angle + Math.PI / 2;
    for (const along of [29.9, 32.3, 34.7]) {
      const pt = axisFrame.at(along, side * 11.5);
      props.mandarin(S, pt[0], baiDinhY, pt[1], faceAngle, { h: 2.0, col: COLORS.mandarin });
    }
  }
  const edgeLevel = (p0: [number, number], p1: [number, number]) => {
    const along = Math.max(p0[0], p1[0]);
    return along <= frontEnd + 0.01 ? frontCourtY : along <= baiDinhEnd + 0.01 ? baiDinhY : steleCourtY;
  };
  for (const side of [-1, 1]) {
    drawWallPolyline(S, axisFrame, [[12.6, side * (courtHalfW - 0.2)], [baiDinhEnd, side * (courtHalfW - 0.2)], [baiDinhEnd, side * (steleHalfW - 0.2)], [steleEnd - 0.2, side * (steleHalfW - 0.2)], [steleEnd - 0.2, side * 2.4]], 0.8, 0.3, {
      col: COLORS.stucco, cap: COLORS.panel, base: edgeLevel, maxSeg: 5,
      gaps: [[], [], side > 0 ? [[44 - baiDinhEnd, 3]] : [[(laneS0 + laneS1) / 2 - baiDinhEnd, laneS1 - laneS0]], []],
    });
  }
}

// family tombs and outbuildings mapped in the precinct
function buildFamilyTombs(S, data) {
  const site = data?.sites?.dongkhanh;
  if (!site) return;
  for (const item of site.items || []) {
    if (!item || !Array.isArray(item.ring) || item.ring.length < 6 || OWNED_OSM_IDS.has(item.id) || item.k === 'w') continue;
    const ring = unflat(item.ring);
    const box = obb(ring);
    if (!box || !(box.w > 0.5)) continue;
    const gy = groundY(box.c[0], box.c[1]);
    if (item.k === 'h') {
      S.kind = KIND.MASONRY;
      for (let i = 0; i < ring.length; i++) {
        const p0 = ring[i];
        const p1 = ring[(i + 1) % ring.length];
        const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
        if (len < 0.3) continue;
        const yA = groundY(p0[0], p0[1]);
        const yB = groundY(p1[0], p1[1]);
        S.base = Math.min(yA, yB) - LAND_Y;
        S.box((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, Math.min(yA, yB) - 0.5, Math.max(yA, yB) + 1.3, len + 0.3, 0.45, Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), COLORS.brickMoss, { top: COLORS.cap });
      }
      const size = clamp(Math.min(box.w, box.d) * 0.3, 1.4, 3.5);
      S.base = gy - LAND_Y;
      S.box(box.c[0], box.c[1], gy - 0.4, gy + 0.8, size * 1.4, size, box.a, COLORS.blueStone, { top: shade(COLORS.blueStone, 0.85) });
      const stelePt = [box.c[0] + Math.cos(box.a) * size * 1.1, box.c[1] + Math.sin(box.a) * size * 1.1];
      S.box(stelePt[0], stelePt[1], gy, gy + 1.6, 0.3, 1.1, box.a, shade(COLORS.blueStone, 0.85));
    } else {
      let width = box.w;
      let depth = box.d;
      let angle = box.a;
      if (width < depth) {
        [width, depth] = [depth, width];
        angle += Math.PI / 2;
      }
      const floorY = gy + 0.3;
      S.kind = KIND.MASONRY;
      S.base = floorY - LAND_Y;
      S.box(box.c[0], box.c[1], gy - 0.6, floorY, width + 0.8, depth + 0.8, angle, COLORS.stone);
      pavilion(S, box.c[0], box.c[1], width, depth, angle, floorY, { wallH: 2.7, rh: clamp(depth * 0.3, 1.3, 2.4), roof: COLORS.familyRoof, wall: COLORS.lacquerOld, over: 0.7, segs: 2 });
    }
  }
}

export function build({ S, data }) {
  buildBerm(S, data, false);
  const pavedStart = S.n;
  buildBerm(S, data, true);
  buildTemple(S);
  buildTomb(S);
  buildPondEmbankment(S, data);
  buildFamilyTombs(S, data);
  (S.paved = S.paved || []).push([pavedStart, S.n]);
  S.kind = KIND.PLAIN;
  S.base = 0;
}
