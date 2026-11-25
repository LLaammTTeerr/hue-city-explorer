import { KIND, hex, shade, unflat, inRing, obb } from '../../geo/buf.ts';
import { LAND_Y, POND_Y, PAL } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { bridgeProfiles } from '../../geo/bridges.ts';
import { glowPoints } from '../../geo/materials.ts';

// ---- Tàng Thư Lâu: the Nguyễn archive of land registers on its island in hồ Học Hải (Thuận Lộc) ----
// Built 1825–26 under Minh Mạng; restored 2014–2021. Sources: docs/places/tangthulau.md.
export const id = 'tangthulau';

const REFRAME = { dx: -0.4, dz: -2.4, rot: (-2.3 * Math.PI) / 180 };
const OUTLINE = [[-1326.1, -1324.5], [-1323.2, -1326.4], [-1292.9, -1346.6], [-1288.8, -1340.6], [-1284.4, -1334.1], [-1314.7, -1313.9], [-1317.6, -1311.9]];
const BRIDGE_ENDS = [[-1364.3, -1288], [-1331, -1311.8]];
const STELE_POS = [-1318.5, -1301];
const SHED_RING = [[-1315, -1346.5], [-1312.5, -1343], [-1320.6, -1337.5], [-1323.1, -1341.1]];
const ISLAND_PROBE = [-1306.8, -1328.3];

const ISLAND_TREES = [
  [-28, -14.5, 1.5], [-18, -15, 1.4], [0, -13.5, 1.3], [9, -14, 1.5], [18, -13, 1.4], [26, -12, 1.6],
  [-30, -6, 0.9], [29, 4, 0.9], [27, 15, 1.1], [17, 15, 0.8],
  [-26, 17, 1.3], [-14, 19, 1.0], [-29, 7, 0.8],
];

const COLORS = {
  wall: hex('#e9c87c'),
  wallLow: hex('#d9b56a'),
  trim: hex('#f1e2b8'),
  door: hex('#6b2f22'),
  doorDark: hex('#3e1f18'),
  roof: hex('#6f4a3b'),
  roofDark: hex('#4c3229'),
  ridge: hex('#ddd2b8'),
  stone: PAL.stone,
  face: hex('#7f7a6d'),
  moss: hex('#5a5e48'),
  coping: hex('#b4ab98'),
  plaster: hex('#cfc6b2'),
  court: hex('#a39278'),
  brick: hex('#8a6f5c'),
};

function segmentDist(x, z, ptA, ptB) {
  const dx = ptB[0] - ptA[0], dz = ptB[1] - ptA[1], lenSq = dx * dx + dz * dz || 1;
  const proj = Math.max(0, Math.min(1, ((x - ptA[0]) * dx + (z - ptA[1]) * dz) / lenSq));
  return Math.hypot(x - ptA[0] - dx * proj, z - ptA[1] - dz * proj);
}

function collapseGenericBridge(S, vertCount, ptA, ptB, halfW, maxY) {
  const pos = S.pos, len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
  const ux = (ptB[0] - ptA[0]) / len, uz = (ptB[1] - ptA[1]) / len;
  const inBox = (idx) => {
    const x = pos[idx] - ptA[0], y = pos[idx + 1], z = pos[idx + 2] - ptA[1];
    const s = x * ux + z * uz, t = -x * uz + z * ux;
    return s > -0.8 && s < len + 0.8 && Math.abs(t) < halfW && y > -6 && y < maxY;
  };
  for (let i = 0; i < vertCount; i += 3) {
    const idx = i * 3;
    if (!inBox(idx) || !inBox(idx + 3) || !inBox(idx + 6)) continue;
    for (const j of [idx + 3, idx + 6]) { pos[j] = pos[idx]; pos[j + 1] = pos[idx + 1]; pos[j + 2] = pos[idx + 2]; }
  }
}

function findIslandRing(data) {
  const poly = (data.ponds || []).find((pl) => pl.length > 1 && pl.slice(1).some((hole) => inRing(ISLAND_PROBE[0], ISLAND_PROBE[1], unflat(hole))));
  return poly && poly.map(unflat).find((ring, i) => i > 0 && inRing(ISLAND_PROBE[0], ISLAND_PROBE[1], ring));
}

export function ownWays(data) {
  const island = findIslandRing(data);
  if (!island) return () => false;
  return (road) => !road[1] && (road[0] | 0) >= 4 && unflat(road[2]).every((pt) => inRing(pt[0], pt[1], island));
}

function buildArchiveBuilding(S, lamps) {
  const rawBox = obb(OUTLINE);
  let ang = rawBox.a;
  if (Math.cos(ang) < 0) ang += Math.PI;
  ang += REFRAME.rot;
  const center = [rawBox.c[0] + REFRAME.dx, rawBox.c[1] + REFRAME.dz];
  const ux = Math.cos(ang), uz = Math.sin(ang);
  const localPt = (u, v): [number, number] => [center[0] + u * ux - v * uz, center[1] + u * uz + v * ux];
  const localBox = (u, v, y0, y1, su, sv, col, opts?) => { const pt = localPt(u, v); S.box(pt[0], pt[1], y0, y1, su, sv, ang, col, opts); };
  const width = rawBox.w, depth = rawBox.d;

  let baseG = Infinity;
  for (const [u, v] of ([[-width / 2, -depth / 2], [width / 2, -depth / 2], [width / 2, depth / 2], [-width / 2, depth / 2]] as any[])) {
    const pt = localPt(u, v);
    baseG = Math.min(baseG, LAND_Y + rise(pt[0], pt[1]));
  }
  S.base = baseG - LAND_Y;

  const floor1 = baseG + 0.6, floor2 = floor1 + 4.2;
  const lowerW = width - 1.0, lowerD = depth - 1.0;
  const upperW = 31.8, upperD = 8.8;
  const eaveY = floor2 + 3.0, ridgeTopY = baseG + 11.5;

  // Stone base and 11-bay lower storey
  S.kind = KIND.MASONRY;
  localBox(0, 0, baseG - 0.3, floor1, width, depth, shade(COLORS.stone, 0.95), { taper: 0.99, topKind: KIND.ROAD });
  localBox(0, 0, floor1, floor2 - 0.35, lowerW, lowerD, COLORS.wall, { top: shade(COLORS.wall, 0.8) });
  localBox(0, 0, floor1, floor1 + 0.35, lowerW + 0.12, lowerD + 0.12, COLORS.wallLow);
  const bayW = lowerW / 11;
  S.kind = KIND.PLAIN;
  for (const side of [-1, 1]) {
    for (let i = 0; i <= 11; i++) localBox(-lowerW / 2 + i * bayW, side * (lowerD / 2 + 0.06), floor1, floor2 - 0.35, 0.5, 0.14, COLORS.trim);
    for (let i = 0; i < 11; i++) {
      const u = -lowerW / 2 + (i + 0.5) * bayW;
      localBox(u, side * (lowerD / 2 + 0.03), floor1 + 0.1, floor1 + 2.6, 1.5, 0.08, i === 5 ? COLORS.doorDark : COLORS.door);
      localBox(u, side * (lowerD / 2 + 0.05), floor1 + 2.6, floor1 + 2.8, 1.8, 0.1, COLORS.trim);
      localBox(u, side * (lowerD / 2 + 0.2), floor1 - 0.05, floor1 + 0.12, 1.7, 0.4, shade(COLORS.stone, 1.0));
      localBox(u, side * (lowerD / 2 + 0.03), floor1 + 3.0, floor1 + 3.55, 1.1, 0.08, COLORS.doorDark);
    }
    const endBay = lowerD / 3;
    for (let i = 0; i < 3; i++) {
      const pt = localPt(side * (lowerW / 2 + 0.03), -lowerD / 2 + (i + 0.5) * endBay);
      S.box(pt[0], pt[1], floor1 + 0.9, floor1 + 2.6, 0.08, 1.3, ang, COLORS.door);
    }
  }
  S.kind = KIND.MASONRY;
  localBox(0, 0, floor2 - 0.35, floor2, lowerW + 0.5, lowerD + 0.5, COLORS.trim, { topKind: KIND.ROAD });

  // Upper gallery railing
  const railH = 0.85;
  const drawRailRun = (u0, v0, u1, v1) => {
    const runLen = Math.hypot(u1 - u0, v1 - v0), postCount = Math.max(1, Math.round(runLen / 2.4));
    const ptA = localPt(u0, v0), ptB = localPt(u1, v1);
    for (let k = 0; k <= postCount; k++) {
      const pt = localPt(u0 + ((u1 - u0) * k) / postCount, v0 + ((v1 - v0) * k) / postCount);
      S.box(pt[0], pt[1], floor2, floor2 + railH + 0.1, 0.32, 0.32, ang, COLORS.trim);
    }
    S.kind = KIND.PLAIN;
    S.beam([ptA[0], floor2 + railH, ptA[1]], [ptB[0], floor2 + railH, ptB[1]], 0.22, 0.12, COLORS.trim);
    S.beam([ptA[0], floor2 + 0.12, ptA[1]], [ptB[0], floor2 + 0.12, ptB[1]], 0.22, 0.14, COLORS.trim);
    for (let k = 0; k < postCount * 4; k++) {
      if (k % 4 === 0) continue;
      const pt = localPt(u0 + ((u1 - u0) * k) / (postCount * 4), v0 + ((v1 - v0) * k) / (postCount * 4));
      S.box(pt[0], pt[1], floor2 + 0.19, floor2 + railH - 0.06, 0.08, 0.08, ang, shade(COLORS.trim, 0.92));
    }
    S.kind = KIND.MASONRY;
  };
  const edgeU = lowerW / 2 + 0.1, edgeV = lowerD / 2 + 0.1;
  drawRailRun(-edgeU, -edgeV, edgeU, -edgeV);
  drawRailRun(-edgeU, edgeV, edgeU, edgeV);
  drawRailRun(-edgeU, -edgeV, -edgeU, edgeV);
  drawRailRun(edgeU, -edgeV, edgeU, -1.3);
  drawRailRun(edgeU, 1.3, edgeU, edgeV);

  // Upper 9-bay body & hipped roof
  localBox(0, 0, floor2, eaveY - 0.1, upperW, upperD, COLORS.wall, { top: shade(COLORS.roof, 0.6) });
  const bayWeights = [1, ...Array(7).fill(1.25), 1];
  const weightSum = bayWeights.reduce((sum, val) => sum + val, 0);
  const colU = [-upperW / 2];
  for (const w of bayWeights) colU.push(colU[colU.length - 1] + (w / weightSum) * upperW);
  S.kind = KIND.PLAIN;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const u = (colU[i] + colU[i + 1]) / 2, w = colU[i + 1] - colU[i], isChai = i === 0 || i === 8;
      localBox(u, side * (upperD / 2 + 0.03), floor2 + (isChai ? 0.8 : 0.05), floor2 + 2.3, w * (isChai ? 0.45 : 0.62), 0.08, COLORS.door);
      localBox(u, side * (upperD / 2 + 0.04), floor2 + 2.3, floor2 + 2.42, w * 0.7, 0.08, COLORS.trim);
    }
    for (let i = 0; i < 2; i++) {
      const pt = localPt(side * (upperW / 2 + 0.03), (i - 0.5) * upperD * 0.45);
      S.box(pt[0], pt[1], floor2 + 0.8, floor2 + 2.3, 0.08, 1.2, ang, COLORS.door);
    }
  }
  S.kind = KIND.MASONRY;
  for (const side of [-1, 1]) for (const u of colU) localBox(u, side * (upperD / 2 + 0.05), floor2, eaveY - 0.1, 0.4, 0.12, COLORS.trim);
  localBox(0, 0, eaveY - 0.35, eaveY - 0.1, upperW + 0.25, upperD + 0.25, COLORS.trim);

  S.kind = KIND.TIMBER;
  const over = 0.8;
  S.hip(center[0], center[1], upperW, upperD, ang, eaveY, ridgeTopY - 0.35 - eaveY, COLORS.roof, { flare: 0.18, over, ridgeCol: COLORS.ridge, fascia: 0.25, fasciaCol: COLORS.roofDark, hips: true, horns: false, segs: 4 });
  S.kind = KIND.PLAIN;
  const ridgeHalf = Math.max(0, (upperW + 2 * over) / 2 - ((upperD + 2 * over) / 2) * 0.92);
  const ridgeBaseY = ridgeTopY - 0.35;
  for (const side of [-1, 1]) {
    const pt = localPt(side * ridgeHalf, 0);
    S.box(pt[0], pt[1], ridgeBaseY, ridgeBaseY + 0.75, 0.6, 0.35, ang, COLORS.ridge);
    S.box(pt[0], pt[1], ridgeBaseY + 0.75, ridgeBaseY + 0.95, 0.4, 0.25, ang, shade(COLORS.ridge, 1.1));
  }
  const midPt = localPt(0, 0);
  S.cyl(midPt[0], midPt[1], ridgeBaseY, ridgeBaseY + 0.3, 0.35, 0.3, 6, COLORS.ridge);
  S.cyl(midPt[0], midPt[1], ridgeBaseY + 0.3, ridgeBaseY + 0.6, 0.22, 0.05, 6, COLORS.ridge);

  // Exterior stairs wrapping the east end
  S.kind = KIND.MASONRY;
  const stairW = 1.3, stairV = depth / 2 + stairW / 2, midY = floor1 + (floor2 - floor1) * 0.5;
  for (const side of [-1, 1]) {
    const u0 = width / 2 - 7.6, u1 = width / 2, stepsA = 12;
    for (let k = 0; k < stepsA; k++) {
      const u = u0 + ((k + 0.5) * (u1 - u0)) / stepsA, y = baseG + ((midY - baseG) * (k + 1)) / stepsA;
      localBox(u, side * stairV, baseG - 0.2, y, (u1 - u0) / stepsA + 0.02, stairW, COLORS.wallLow, { top: shade(COLORS.stone, 1.04), topKind: KIND.ROAD });
    }
    localBox(width / 2 + stairW / 2, side * stairV, baseG - 0.2, midY, stairW, stairW, COLORS.wallLow, { top: COLORS.stone, topKind: KIND.ROAD });
    const v0 = depth / 2, v1 = 1.3, stepsB = 12;
    for (let k = 0; k < stepsB; k++) {
      const v = v0 - ((k + 0.5) * (v0 - v1)) / stepsB, y = midY + ((floor2 - midY) * (k + 1)) / stepsB;
      localBox(width / 2 + stairW / 2, side * v, baseG - 0.2, y, stairW, (v0 - v1) / stepsB + 0.02, COLORS.wallLow, { top: shade(COLORS.stone, 1.04), topKind: KIND.ROAD });
    }
    S.kind = KIND.PLAIN;
    const a0 = localPt(u0, side * (stairV + stairW / 2)), a1 = localPt(u1 + stairW, side * (stairV + stairW / 2));
    S.beam([a0[0], baseG + 0.9, a0[1]], [a1[0], midY + 0.9, a1[1]], 0.2, 0.2, COLORS.trim);
    const b0 = localPt(width / 2 + stairW, side * (stairV + stairW / 2)), b1 = localPt(width / 2 + stairW, side * v1);
    S.beam([b0[0], midY + 0.9, b0[1]], [b1[0], floor2 + 0.9, b1[1]], 0.2, 0.2, COLORS.trim);
    S.kind = KIND.MASONRY;
  }
  localBox(width / 2 + stairW / 2, 0, baseG - 0.2, floor2, stairW, 2.6, COLORS.wallLow, { top: COLORS.stone, topKind: KIND.ROAD });
  localBox(width / 2 + 0.25, 0, floor1, floor2 - 0.35, 0.5, 2.6, COLORS.wall);

  for (const side of [-1, 1]) {
    for (let i = 1; i < 9; i += 2) {
      const pt = localPt(colU[i], side * (upperD / 2 + 0.5));
      lamps.push([pt[0], eaveY - 0.6, pt[1]]);
    }
  }
  return localPt;
}

function buildShed(S) {
  const box = obb(SHED_RING);
  let baseG = Infinity;
  for (const [x, z] of SHED_RING) baseG = Math.min(baseG, LAND_Y + rise(x, z));
  S.base = baseG - LAND_Y;
  S.kind = KIND.MASONRY;
  S.box(box.c[0], box.c[1], baseG - 0.2, baseG + 0.3, box.w, box.d, box.a, shade(COLORS.stone, 0.9));
  S.box(box.c[0], box.c[1], baseG + 0.3, baseG + 2.6, box.w - 0.4, box.d - 0.4, box.a, shade(COLORS.wall, 0.92), { top: COLORS.roofDark });
  const ux = Math.cos(box.a), uz = Math.sin(box.a);
  S.kind = KIND.PLAIN;
  for (const side of [-1, 1]) {
    for (const u of [-2.6, 0, 2.6]) {
      const x = box.c[0] + u * ux - side * (box.d / 2 - 0.17) * uz;
      const z = box.c[1] + u * uz + side * (box.d / 2 - 0.17) * ux;
      S.box(x, z, baseG + (u === 0 ? 0.35 : 1.1), baseG + 2.2, u === 0 ? 1.0 : 0.9, 0.06, box.a, COLORS.door);
    }
  }
  S.kind = KIND.TIMBER;
  S.hip(box.c[0], box.c[1], box.w - 0.4, box.d - 0.4, box.a, baseG + 2.6, 1.5, COLORS.roof, { over: 0.5, ridgeCol: COLORS.ridge });
  S.base = 0;
}

function buildIslandCourt(S, island) {
  let lo = Infinity, hi = -Infinity;
  for (const [x, z] of island) { const g = LAND_Y + rise(x, z); lo = Math.min(lo, g); hi = Math.max(hi, g); }
  const center = island.reduce((acc, pt) => [acc[0] + pt[0] / island.length, acc[1] + pt[1] / island.length], [0, 0]);
  const insetRing = island.map(([x, z]) => {
    const dist = Math.hypot(x - center[0], z - center[1]) || 1, frac = Math.max(0, dist - 0.6) / dist;
    return [center[0] + (x - center[0]) * frac, center[1] + (z - center[1]) * frac];
  });
  S.base = lo - LAND_Y;
  S.kind = KIND.MASONRY;
  S.prism(insetRing, lo - 0.1, hi + 0.06, COLORS.coping, COLORS.court, { topKind: KIND.ROAD });
  S.base = 0;
}

function buildRevetmentAndBridge(data, S, startVerts, rings, island, isWet) {
  const groundY = (x, z) => LAND_Y + rise(x, z);

  S.kind = KIND.MASONRY;
  for (const ring of [rings[0], island]) {
    for (let i = 0; i < ring.length; i++) {
      const ptA = ring[i], ptB = ring[(i + 1) % ring.length], edgeLen = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
      if (edgeLen < 0.3) continue;
      const ux = (ptB[0] - ptA[0]) / edgeLen, uz = (ptB[1] - ptA[1]) / edgeLen, ang = Math.atan2(uz, ux);
      let nx = -uz, nz = ux;
      if (!isWet((ptA[0] + ptB[0]) / 2 + nx * 0.8, (ptA[1] + ptB[1]) / 2 + nz * 0.8)) { nx = -nx; nz = -nz; }
      const segs = Math.max(1, Math.ceil(edgeLen / 18));
      for (let k = 0; k < segs; k++) {
        const frac = (k + 0.5) / segs, segLen = edgeLen / segs + 0.25;
        const mx = ptA[0] + (ptB[0] - ptA[0]) * frac, mz = ptA[1] + (ptB[1] - ptA[1]) * frac;
        if (segmentDist(mx, mz, BRIDGE_ENDS[0], BRIDGE_ENDS[1]) < 3) continue;
        const g = groundY(mx - nx * 1.5, mz - nz * 1.5);
        const shift = (dist): [number, number] => [mx + nx * dist, mz + nz * dist];
        let pt = shift(0.12);
        S.box(pt[0], pt[1], POND_Y - 0.5, g - 0.02, segLen, 0.32, ang, COLORS.face);
        pt = shift(0.3);
        S.box(pt[0], pt[1], POND_Y - 0.2, POND_Y + 0.3, segLen, 0.06, ang, COLORS.moss);
        pt = shift(-0.25);
        S.box(pt[0], pt[1], g - 0.12, g + 0.1, segLen, 0.85, ang, COLORS.coping, { topKind: KIND.ROAD });
      }
    }
  }

  // Beam bridge over hồ Học Hải
  const bridgeRoad = (data.roads || []).find((road) => road && road[1] && Array.isArray(road[2]) && (() => {
    const pts = unflat(road[2]), p0 = pts[0], p1 = pts[pts.length - 1];
    return Math.hypot(p0[0] - BRIDGE_ENDS[0][0], p0[1] - BRIDGE_ENDS[0][1]) + Math.hypot(p1[0] - BRIDGE_ENDS[1][0], p1[1] - BRIDGE_ENDS[1][1]) < 3
      || Math.hypot(p1[0] - BRIDGE_ENDS[0][0], p1[1] - BRIDGE_ENDS[0][1]) + Math.hypot(p0[0] - BRIDGE_ENDS[1][0], p0[1] - BRIDGE_ENDS[1][1]) < 3;
  })());
  const prof = bridgeRoad && bridgeProfiles(data).get(bridgeRoad[2]);
  const ptA = BRIDGE_ENDS[0], ptB = BRIDGE_ENDS[1], bridgeLen = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
  const isFlipped = bridgeRoad && Math.hypot(bridgeRoad[2][0] / 10 - ptA[0], bridgeRoad[2][1] / 10 - ptA[1]) > 3;
  const deckYAt = prof ? (s) => prof.y(isFlipped ? bridgeLen - s : s) : (s) => LAND_Y + 0.42 + 1.2 * Math.sin((Math.PI * s) / bridgeLen);
  if (prof) collapseGenericBridge(S, startVerts, ptA, ptB, 3.4, LAND_Y + 5);

  const ux = (ptB[0] - ptA[0]) / bridgeLen, uz = (ptB[1] - ptA[1]) / bridgeLen, ang = Math.atan2(uz, ux);
  const bridgePt = (s, t): [number, number] => [ptA[0] + ux * s - uz * t, ptA[1] + uz * s + ux * t];
  const deckW = 4.6, deckThick = 0.55, segCount = Math.ceil(bridgeLen / 1.6);
  for (let i = 0; i < segCount; i++) {
    const s0 = (i * bridgeLen) / segCount, s1 = ((i + 1) * bridgeLen) / segCount;
    const p0 = bridgePt(s0, 0), p1 = bridgePt(s1, 0), y0 = deckYAt(s0), y1 = deckYAt(s1);
    S.kind = KIND.MASONRY;
    S.beam([p0[0], y0 - deckThick / 2, p0[1]], [p1[0], y1 - deckThick / 2, p1[1]], deckW, deckThick, COLORS.brick);
    S.kind = KIND.ROAD;
    S.beam([p0[0], y0 + 0.01, p0[1]], [p1[0], y1 + 0.01, p1[1]], deckW - 0.6, 0.04, shade(COLORS.stone, 1.02));
    S.kind = KIND.MASONRY;
    for (const t of [-deckW / 2 + 0.15, deckW / 2 - 0.15]) {
      const qa = bridgePt(s0, t), qb = bridgePt(s1, t);
      S.beam([qa[0], y0 + 0.35, qa[1]], [qb[0], y1 + 0.35, qb[1]], 0.3, 0.7, COLORS.plaster);
      S.beam([qa[0], y0 + 0.75, qa[1]], [qb[0], y1 + 0.75, qb[1]], 0.4, 0.1, COLORS.coping);
    }
  }
  S.kind = KIND.MASONRY;
  const spanCount = 6;
  for (let i = 1; i < spanCount; i++) {
    const s = (i * bridgeLen) / spanCount, pt = bridgePt(s, 0);
    if (!isWet(pt[0], pt[1])) continue;
    S.box(pt[0], pt[1], POND_Y - 1.5, deckYAt(s) - deckThick + 0.02, 0.9, deckW - 0.2, ang, shade(COLORS.face, 1.05));
  }
  for (const [s, dir] of ([[0, 1], [bridgeLen, -1]] as any[])) {
    const abutPt = bridgePt(s + dir * 1.2, 0), y = deckYAt(s);
    S.box(abutPt[0], abutPt[1], POND_Y - 1.5, y - deckThick + 0.02, 2.4, deckW + 0.4, ang, COLORS.face);
    for (const t of [-deckW / 2 - 0.1, deckW / 2 + 0.1]) {
      const postPt = bridgePt(s, t);
      S.box(postPt[0], postPt[1], y - 0.2, y + 1.5, 0.55, 0.55, ang, COLORS.plaster, { top: COLORS.coping });
      S.cyl(postPt[0], postPt[1], y + 1.5, y + 1.85, 0.22, 0.08, 6, COLORS.coping);
    }
  }
}

export function build({ data, S, group }) {
  const startVerts = S.n;
  const lamps = [];

  const poly = (data.ponds || []).find((pl) => pl.length > 1 && pl.slice(1).some((hole) => inRing(ISLAND_PROBE[0], ISLAND_PROBE[1], unflat(hole))));
  if (!poly) throw new Error('hồ Học Hải not found in data.ponds');
  const rings = poly.map(unflat);
  const island = rings.find((ring, i) => i > 0 && inRing(ISLAND_PROBE[0], ISLAND_PROBE[1], ring));
  const isWet = (x, z) => inRing(x, z, rings[0]) && !rings.slice(1).some((hole) => inRing(x, z, hole));

  buildRevetmentAndBridge(data, S, startVerts, rings, island, isWet);
  buildIslandCourt(S, island);
  const localPt = buildArchiveBuilding(S, lamps);
  buildShed(S);

  if (Array.isArray(data.trees)) {
    const shoreDist = (x, z) => Math.min(...island.map((pt, k) => segmentDist(x, z, pt, island[(k + 1) % island.length])));
    ISLAND_TREES.forEach(([u, v, scale], k) => {
      const [x, z] = localPt(u, v);
      if (!inRing(x, z, island) || shoreDist(x, z) < 1.8) return;
      data.trees.push(Math.round(x * 10), Math.round(z * 10), Math.round(scale * 10), k % 3 === 1 ? 1 : 0);
    });
  }

  // Memorial stele on the north tip
  const [steleX, steleZ] = STELE_POS, steleY = LAND_Y + rise(steleX, steleZ);
  S.base = steleY - LAND_Y;
  S.kind = KIND.MASONRY;
  S.box(steleX, steleZ, steleY - 0.1, steleY + 0.45, 1.6, 1.0, -0.59, COLORS.stone, { topKind: KIND.ROAD });
  S.box(steleX, steleZ, steleY + 0.45, steleY + 2.0, 1.0, 0.22, -0.59, shade(COLORS.stone, 0.85));
  S.box(steleX, steleZ, steleY + 2.0, steleY + 2.2, 1.15, 0.3, -0.59, shade(COLORS.stone, 0.9));

  S.kind = KIND.PLAIN;
  S.base = 0;
  if (lamps.length) {
    const pos = [], col = [];
    for (const pt of lamps) { pos.push(...pt); col.push(1, 0.62, 0.3); }
    const pts = glowPoints(pos, col, 4);
    pts.userData.glow = true;
    pts.userData.landmark = id;
    group.add(pts);
  }
}
