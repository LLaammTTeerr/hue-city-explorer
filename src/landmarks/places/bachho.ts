import * as THREE from 'three';
import { Buf, KIND, hex, shade } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { bridgeProfiles } from '../../geo/bridges.ts';
import { lightMaterial, glowPoints } from '../../geo/materials.ts';
import { landTest } from '../boats.ts';

// Cầu Dã Viên and the 1908 Bạch Hổ / Dã Viên railway bridges beside it (docs/places/bachho.md).
export const id = 'bachho';

const ownedRoadsCache = new WeakMap();
export function ownRoads(data) {
  if (ownedRoadsCache.has(data)) return ownedRoadsCache.get(data);
  const out = new Set();
  ownedRoadsCache.set(data, out);
  for (const road of data.roads || []) {
    if (!Array.isArray(road) || !road[1] || !Array.isArray(road[2]) || road[2].length < 4 || (road[0] | 0) > 1) continue;
    const flat = road[2], count = flat.length;
    if (Math.hypot((flat[0] + flat[count - 2]) / 20 + 1896, (flat[1] + flat[count - 1]) / 20 - 1019) < 40) out.add(flat);
  }
  return out;
}

const ROAD_A = [-1958, 895], ROAD_B = [-1834, 1142.5];
const ROAD_WIDTH = 24.5;
const RAIL_NORTH = [[-1983, 906], [-1964, 942], [-1931, 1009], [-1875, 1122], [-1848, 1176]];
const RAIL_SOUTH = [[-1767, 1275], [-1692, 1350]];
const RAIL_SOUTH_TRUSS = [-11, 94];
const RAIL_SOUTH_GIRDER = [[-1692, 1350], [-1674, 1365]];

const PAV_STATIONS = [55.5, 237.3];
const PIER_STATIONS = [19.1, ...Array.from({ length: 6 }, (_, i) => PAV_STATIONS[0] + (i * (PAV_STATIONS[1] - PAV_STATIONS[0])) / 5)];
const PAV_OFFSET = 15.8;
const PAV_AXIS_SHIFT = 1.8;
const DECK_THICK = 1.3;
const CARRIAGEWAY_W = 15.5;
const PAVEMENT_RISE = 0.22;
const HAUNCH_DEPTH = 1.2;
const PAV3 = { x: -1760.5, z: 1239.2, ang: Math.atan2(0.699, 0.715) };

const COLORS = {
  white: hex('#e4e6e2'),
  whiteDark: hex('#c3c8c6'),
  conc: hex('#c9c3b6'),
  concDark: hex('#a69f92'),
  yellow: hex('#dba52a'),
  ridge: hex('#f1d77a'),
  post: hex('#9c2f22'),
  asphalt: hex('#6f6b68'),
  pavement: hex('#bdb9b0'),
  kerb: hex('#a9a59c'),
  paint: hex('#f1eee4'),
  yellowLine: hex('#e0b43c'),
  lamp: hex('#dcdedb'),
  lampDark: hex('#5d625f'),
  glass: hex('#f4f0e2'),
  truss: hex('#d8d4c6'),
  trussDark: hex('#b7b3a6'),
};

function buildRoadDeckAndLamps(S, lightBuf, warmPos, warmCol, ctx) {
  const { ang, ux, uz, sA, sB, axisPt, deckY, deckBot } = ctx;
  const halfW = ROAD_WIDTH / 2;
  const stations = [];
  for (let count = Math.max(2, Math.ceil((sB - sA) / 2)), i = 0; i <= count; i++) stations.push(sA + ((sB - sA) * i) / count);
  const deckPt3 = (s, v, dy) => { const [x, z] = axisPt(s, v); return [x, deckY(s) + dy, z]; };

  const drawStrip = (v0, v1, dy, col, from = sA, to = sB) => {
    for (let i = 0; i + 1 < stations.length; i++) {
      const a = Math.max(stations[i], from), b = Math.min(stations[i + 1], to);
      if (b - a < 0.01) continue;
      S.quad(deckPt3(a, v0, dy), deckPt3(a, v1, dy), deckPt3(b, v1, dy), deckPt3(b, v0, dy), col, [0, 1, 0]);
    }
  };
  const drawWall = (v, dy0, dy1, col, outSign) => {
    const norm = [-uz * outSign, 0, ux * outSign];
    for (let i = 0; i + 1 < stations.length; i++) {
      const a = stations[i], b = stations[i + 1];
      S.quad(deckPt3(a, v, dy0), deckPt3(b, v, dy0), deckPt3(b, v, dy1), deckPt3(a, v, dy1), col, norm);
    }
  };

  S.kind = KIND.ROAD;
  drawStrip(-CARRIAGEWAY_W / 2, CARRIAGEWAY_W / 2, 0, COLORS.asphalt);
  drawStrip(-halfW, -CARRIAGEWAY_W / 2, PAVEMENT_RISE, COLORS.pavement);
  drawStrip(CARRIAGEWAY_W / 2, halfW, PAVEMENT_RISE, COLORS.pavement);
  drawStrip(-0.27, -0.12, 0.012, COLORS.yellowLine);
  drawStrip(0.12, 0.27, 0.012, COLORS.yellowLine);
  for (const v of [-CARRIAGEWAY_W / 2 + 0.35, CARRIAGEWAY_W / 2 - 0.35]) drawStrip(v - 0.08, v + 0.08, 0.012, COLORS.paint);
  for (let s = sA + 6; s + 3 < sB - 4; s += 9) {
    for (const v of [-CARRIAGEWAY_W / 4, CARRIAGEWAY_W / 4]) drawStrip(v - 0.08, v + 0.08, 0.012, COLORS.paint, s, s + 3);
  }

  S.kind = KIND.PLAIN;
  drawWall(-CARRIAGEWAY_W / 2, 0, PAVEMENT_RISE, COLORS.kerb, 1);
  drawWall(CARRIAGEWAY_W / 2, 0, PAVEMENT_RISE, COLORS.kerb, -1);
  drawWall(-halfW, -DECK_THICK, -0.35, COLORS.conc, -1);
  drawWall(halfW, -DECK_THICK, -0.35, COLORS.conc, 1);
  drawWall(-halfW, -0.35, PAVEMENT_RISE, COLORS.whiteDark, -1);
  drawWall(halfW, -0.35, PAVEMENT_RISE, COLORS.whiteDark, 1);

  for (let i = 0; i + 1 < stations.length; i++) {
    const a = stations[i], b = stations[i + 1];
    if (Math.min(deckBot(a), deckBot(b)) < LAND_Y - 0.5) continue;
    S.quad(deckPt3(a, -halfW, -DECK_THICK), deckPt3(a, halfW, -DECK_THICK), deckPt3(b, halfW, -DECK_THICK), deckPt3(b, -halfW, -DECK_THICK), COLORS.concDark, [0, -1, 0]);
  }
  for (const [s, dir] of ([[sA, -1], [sB, 1]] as any[])) {
    S.quad(deckPt3(s, -halfW, -DECK_THICK), deckPt3(s, halfW, -DECK_THICK), deckPt3(s, halfW, PAVEMENT_RISE), deckPt3(s, -halfW, PAVEMENT_RISE), COLORS.conc, [ux * dir, 0, uz * dir]);
  }

  const inBalconyGap = (s) => PAV_STATIONS.some((station) => Math.abs(s - station) < 3.2);
  for (const side of [-1, 1]) {
    const v = side * (halfW - 0.2);
    const postCount = Math.round((sB - sA - 1) / 3);
    const posts = Array.from({ length: postCount + 1 }, (_, i) => sA + 0.5 + ((sB - sA - 1) * i) / postCount);
    for (let i = 0; i < posts.length; i++) {
      const s = posts[i];
      if (!inBalconyGap(s)) S.box(...axisPt(s, v), deckY(s) + PAVEMENT_RISE, deckY(s) + PAVEMENT_RISE + 1.15, 0.34, 0.34, ang, COLORS.white, { top: COLORS.white });
      if (i + 1 === posts.length) break;
      const sNext = posts[i + 1];
      if (inBalconyGap(s) || inBalconyGap(sNext)) continue;
      const ptA = deckPt3(s, v, PAVEMENT_RISE), ptB = deckPt3(sNext, v, PAVEMENT_RISE);
      S.beam([ptA[0], ptA[1] + 0.15, ptA[2]], [ptB[0], ptB[1] + 0.15, ptB[2]], 0.3, 0.3, COLORS.whiteDark);
      S.beam([ptA[0], ptA[1] + 1.02, ptA[2]], [ptB[0], ptB[1] + 1.02, ptB[2]], 0.26, 0.14, COLORS.white);
      for (let k = 1; k < 6; k++) {
        const frac = k / 6;
        const bx = ptA[0] + (ptB[0] - ptA[0]) * frac, by = ptA[1] + (ptB[1] - ptA[1]) * frac, bz = ptA[2] + (ptB[2] - ptA[2]) * frac;
        S.beam([bx, by + 0.3, bz], [bx, by + 0.95, bz], 0.09, 0.09, COLORS.white);
      }
    }
  }

  for (let k = -2; k < 9; k++) {
    const s = PAV_STATIONS[0] + (k + 0.5) * ((PAV_STATIONS[1] - PAV_STATIONS[0]) / 6);
    if (s < sA + 8 || s > sB - 8 || PAV_STATIONS.some((station) => Math.abs(s - station) < 6)) continue;
    for (const side of [-1, 1]) drawDeckLamp(S, axisPt(s, side * (CARRIAGEWAY_W / 2 + 0.7)), deckY(s) + PAVEMENT_RISE, [-uz * side, ux * side], lightBuf, warmPos, warmCol);
  }
}

function buildRoadPiersAndPavilions(data, S, lightBuf, warmPos, warmCol, ctx) {
  const { ang, spanLen, axisPt, deckY, deckBot, isLand, prof } = ctx;
  const pierW = ROAD_WIDTH - 3.5;
  const supports = [0, ...PIER_STATIONS, spanLen];

  S.kind = KIND.MASONRY;
  for (const sp of PIER_STATIONS) {
    const [x, z] = axisPt(sp, 0);
    if (isLand(x, z)) continue;
    const capTopY = deckBot(sp) - HAUNCH_DEPTH;
    S.box(x, z, -3, capTopY + 0.05, 1.8, pierW, ang, COLORS.conc, { taper: 0.96 });
    S.box(x, z, capTopY - 0.4, capTopY + 0.05, 2.4, pierW + 0.8, ang, COLORS.concDark);
    for (const sgn of [-1, 1]) {
      const floodPt = axisPt(sp + sgn * 1.0, 0);
      lightBuf.box(floodPt[0], floodPt[1], 0.05, 0.25, 0.25, pierW * 0.9, ang, [1, 1, 1]);
    }
  }

  S.kind = KIND.PLAIN;
  const haunchSegs = 10, girderW = ROAD_WIDTH - 1.2;
  for (let k = 0; k + 1 < supports.length; k++) {
    const segSpan = supports[k + 1] - supports[k];
    for (let i = 0; i < haunchSegs; i++) {
      const frac = (i + 0.5) / haunchSegs, normT = 2 * frac - 1;
      const depth = HAUNCH_DEPTH * (1 - Math.sqrt(Math.max(0, 1 - normT * normT)));
      if (depth < 0.05) continue;
      const s = supports[k] + frac * segSpan;
      if ([-girderW / 2, 0, girderW / 2].some((v) => isLand(...axisPt(s, v)))) continue;
      const [x, z] = axisPt(s, 0);
      S.box(x, z, deckBot(s) - depth, deckBot(s) + 0.02, segSpan / haunchSegs + 0.02, girderW, ang, COLORS.conc, { bottom: true });
    }
  }

  let pav3TopY = LAND_Y + 0.42;
  for (const road of data.roads || []) {
    const profile = road[1] && prof.get(road[2]);
    if (!profile) continue;
    const flat = road[2], lastIdx = flat.length - 2;
    for (const [idx, sPos] of ([[0, 0], [lastIdx, profile.len]] as any[])) {
      const dist = Math.hypot(flat[idx] / 10 - PAV3.x, flat[idx + 1] / 10 - PAV3.z);
      if (dist < 12) pav3TopY = Math.max(LAND_Y + 0.42, profile.y(Math.abs(sPos - Math.min(profile.len, dist))));
    }
  }

  const pavilions = [];
  for (const s of PAV_STATIONS) for (const side of [-1, 1]) pavilions.push({ center: axisPt(s, 0), ang, side, topY: deckY(s) + PAVEMENT_RISE, inner: ROAD_WIDTH / 2 });
  for (const side of [-1, 1]) pavilions.push({ center: [PAV3.x, PAV3.z], ang: PAV3.ang, side, topY: pav3TopY, inner: PAV_OFFSET - 3.2 });

  for (const { center, ang: pAng, side, topY, inner } of pavilions) {
    const vx = -Math.sin(pAng), vz = Math.cos(pAng), ax = Math.cos(pAng), az = Math.sin(pAng);
    const localPt = (s, v): [number, number] => [center[0] + ax * s + vx * v, center[1] + az * s + vz * v];
    const off = side * PAV_OFFSET;
    const [x, z] = localPt(0, off);
    const outer = PAV_OFFSET + 3.2, depth = outer - inner, [bx, bz] = localPt(0, side * (inner + outer) / 2);

    S.kind = KIND.MASONRY;
    S.box(x, z, -3, topY - 0.9, 3.2, 3.4, pAng, COLORS.conc, { taper: 0.94 });
    S.kind = KIND.PLAIN;
    S.box(bx, bz, topY - 1.0, topY, 6.4, depth, pAng, COLORS.concDark, { top: hex('#b9b2a4'), bottom: true });
    S.box(bx, bz, topY - 1.0, topY - 0.8, 6.7, depth + 0.3, pAng, COLORS.whiteDark, { bottom: true });

    const balPt = (a, b) => localPt(a, off + side * b);
    const b0 = inner - PAV_OFFSET + 0.2, b1 = 2.95;
    for (const [a0, c0, a1, c1] of ([[-3.05, b1, 3.05, b1], [-3.05, b0, -3.05, b1], [3.05, b0, 3.05, b1]] as any[])) {
      const p0 = balPt(a0, c0), p1 = balPt(a1, c1);
      S.beam([p0[0], topY + 1.0, p0[1]], [p1[0], topY + 1.0, p1[1]], 0.2, 0.12, COLORS.white);
      S.beam([p0[0], topY + 0.3, p0[1]], [p1[0], topY + 0.3, p1[1]], 0.14, 0.4, COLORS.whiteDark);
      const count = Math.max(1, Math.round(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / 1.2));
      for (let i = 0; i <= count; i++) {
        const pt = [p0[0] + ((p1[0] - p0[0]) * i) / count, p0[1] + ((p1[1] - p0[1]) * i) / count];
        S.cyl(pt[0], pt[1], topY, topY + 1.0, 0.09, 0.08, 6, COLORS.white, { cap: false });
      }
    }
    drawLookoutPavilion(S, x, z, pAng, topY, lightBuf);
    warmPos.push(x, topY + 3.4, z);
    warmCol.push(1.0, 0.75, 0.4);
  }
}

export function build({ data, S, group }) {
  const railDeckY = LAND_Y + 0.5;
  const lightBuf = new Buf(8192);
  const warmPos = [], warmCol = [];

  const ang = Math.atan2(ROAD_B[1] - ROAD_A[1], ROAD_B[0] - ROAD_A[0]);
  const ux = Math.cos(ang), uz = Math.sin(ang);
  const spanLen = Math.hypot(ROAD_B[0] - ROAD_A[0], ROAD_B[1] - ROAD_A[1]);
  const roadPt = (s, v): [number, number] => [ROAD_A[0] + ux * s - uz * v, ROAD_A[1] + uz * s + ux * v];
  const axisPt = (s, v) => roadPt(s, v - PAV_AXIS_SHIFT);

  const prof = bridgeProfiles(data);
  const project = (pt) => (pt[0] - ROAD_A[0]) * ux + (pt[1] - ROAD_A[1]) * uz;
  let deckProfile = null;
  for (const flat of ownRoads(data)) {
    const profile = prof.get(flat);
    if (!profile) continue;
    const s0 = project([flat[0] / 10, flat[1] / 10]), s1 = project([flat[flat.length - 2] / 10, flat[flat.length - 1] / 10]);
    if (s1 > s0) { deckProfile = { profile, s0, s1 }; break; }
  }
  if (!deckProfile) throw new Error('Dã Viên carriageways not found');

  const deckY = (s) => deckProfile.profile.y(Math.max(0, Math.min(deckProfile.profile.len, s - deckProfile.s0)));
  const deckBot = (s) => deckY(s) - DECK_THICK;
  const isLand = landTest(data);
  const ctx = { ang, ux, uz, spanLen, sA: deckProfile.s0, sB: deckProfile.s1, axisPt, deckY, deckBot, isLand, prof };

  buildRoadDeckAndLamps(S, lightBuf, warmPos, warmCol, ctx);
  buildRoadPiersAndPavilions(data, S, lightBuf, warmPos, warmCol, ctx);

  // Railway bridges: Warren through trusses
  S.kind = KIND.PLAIN;
  drawWarrenTruss(S, RAIL_NORTH, 5, railDeckY);
  const railSouthStart = sampleAlong(RAIL_SOUTH, RAIL_SOUTH_TRUSS[0], true).p;
  const railSouthEnd = sampleAlong(RAIL_SOUTH, RAIL_SOUTH_TRUSS[1], true).p;
  drawWarrenTruss(S, [railSouthStart, railSouthEnd], 2, railDeckY);
  drawPlateGirder(S, [railSouthEnd, RAIL_SOUTH[1]], railDeckY);

  const isNear = (flat, k, pt) => Math.hypot(flat[k] / 10 - pt[0], flat[k + 1] / 10 - pt[1]) < 3;
  const hasSouthGirder = (data.rails || []).some(([, isBridge, flat]) =>
    isBridge && flat.length === 4 && ((isNear(flat, 0, RAIL_SOUTH_GIRDER[0]) && isNear(flat, 2, RAIL_SOUTH_GIRDER[1])) || (isNear(flat, 0, RAIL_SOUTH_GIRDER[1]) && isNear(flat, 2, RAIL_SOUTH_GIRDER[0]))),
  );
  if (hasSouthGirder) drawPlateGirder(S, RAIL_SOUTH_GIRDER, railDeckY);

  if (lightBuf.n) {
    const mesh = new THREE.Mesh(lightBuf.geometry(), lightMaterial(0xfff4e0, 1.5));
    mesh.renderOrder = 19;
    mesh.userData.landmark = id;
    group.add(mesh);
  }
  if (warmPos.length) {
    const pts = glowPoints(warmPos, warmCol, 7);
    pts.userData.glow = true;
    pts.userData.landmark = id;
    group.add(pts);
  }
  S.kind = KIND.PLAIN;
}

function drawLookoutPavilion(S, x, z, ang, y0, lightBuf) {
  const width = 4.4, ux = Math.cos(ang), uz = Math.sin(ang);
  const localPt = (u, v): [number, number] => [x + u * ux - v * uz, z + u * uz + v * ux];
  S.kind = KIND.MASONRY;
  S.box(x, z, y0, y0 + 0.15, width + 1.2, width + 1.2, ang, PAL.stone);
  S.box(x, z, y0 + 0.15, y0 + 0.3, width + 0.6, width + 0.6, ang, PAL.stone);
  S.kind = KIND.PLAIN;
  const floorY = y0 + 0.3, postH = 2.9;
  for (const [u, v] of ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as any[])) {
    const pt = localPt((u * width) / 2, (v * width) / 2);
    S.cyl(pt[0], pt[1], floorY, floorY + postH, 0.17, 0.15, 6, COLORS.post, { cap: false, rot: ang });
  }
  S.box(x, z, floorY + postH - 0.45, floorY + postH, width + 0.3, width + 0.3, ang, shade(COLORS.post, 0.8), { bottom: true });
  for (const [ptA, ptB] of ([[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]]] as any[])) {
    const p0 = localPt((ptA[0] * width) / 2, (ptA[1] * width) / 2);
    const p1 = localPt((ptB[0] * width) / 2, (ptB[1] * width) / 2);
    S.beam([p0[0], floorY + 0.5, p0[1]], [p1[0], floorY + 0.5, p1[1]], 0.14, 0.1, shade(COLORS.post, 0.85));
  }
  S.kind = KIND.TIMBER;
  const roofY = floorY + postH;
  const eaveOpt = { fascia: 0.25, fasciaCol: shade(COLORS.post, 0.75), ridgeCol: COLORS.ridge, hips: true, glazed: true, segs: 2 };
  S.hip(x, z, width, width, ang, roofY, 1.3, COLORS.yellow, { flare: 0.55, over: 1.0, ...eaveOpt, ridgeCol: null });
  const upperW = width * 0.62, upperY = roofY + 0.75;
  S.box(x, z, upperY, upperY + 1.1, upperW, upperW, ang, COLORS.post);
  S.hip(x, z, upperW, upperW, ang, upperY + 1.1, 1.5, COLORS.yellow, { flare: 0.55, over: 0.8, ...eaveOpt });
  S.kind = KIND.PLAIN;
  S.cyl(x, z, upperY + 2.5, upperY + 3.2, 0.22, 0.05, 6, COLORS.ridge);
  for (const [halfW, yy] of ([[width / 2 + 0.7, roofY - 0.3], [upperW / 2 + 0.5, upperY + 0.85]] as any[])) {
    const corners = [localPt(-halfW, -halfW), localPt(halfW, -halfW), localPt(halfW, halfW), localPt(-halfW, halfW)];
    for (let i = 0; i < 4; i++) {
      const a = corners[i], b = corners[(i + 1) % 4];
      lightBuf.beam([a[0], yy, a[1]], [b[0], yy, b[1]], 0.12, 0.1, [1, 0.78, 0.42]);
    }
  }
  S.kind = KIND.PLAIN;
}

function drawDeckLamp(S, [x, z], y, outDir, lightBuf, warmPos, warmCol) {
  const [ox, oz] = outDir;
  const armPt = (dist, height) => [x + ox * dist, y + height, z + oz * dist];
  S.kind = KIND.PLAIN;
  S.cyl(x, z, y, y + 1.1, 0.26, 0.2, 8, COLORS.lamp);
  S.cyl(x, z, y + 1.1, y + 7.6, 0.13, 0.075, 6, COLORS.lamp, { cap: false });
  S.beam(armPt(-1.35, 6.95), armPt(0.45, 6.95), 0.08, 0.1, COLORS.lamp);
  S.beam(armPt(-0.75, 6.95), armPt(0, 6.3), 0.05, 0.05, COLORS.lamp);
  S.beam(armPt(0, 4.5), armPt(0.95, 4.5), 0.07, 0.08, COLORS.lamp);
  S.beam(armPt(0.55, 4.5), armPt(0, 4.0), 0.05, 0.05, COLORS.lamp);
  for (const [dist, height] of ([[-1.35, 6.95], [0.95, 4.5]] as any[])) {
    const [lx, , lz] = armPt(dist, 0);
    S.cyl(lx, lz, y + height - 0.35, y + height - 0.05, 0.36, 0.08, 8, COLORS.lampDark);
    S.cyl(lx, lz, y + height - 0.6, y + height - 0.35, 0.16, 0.2, 6, COLORS.glass);
    lightBuf.box(lx, lz, y + height - 0.6, y + height - 0.36, 0.3, 0.3, 0, [1, 0.86, 0.6]);
    warmPos.push(lx, y + height - 0.5, lz);
    warmCol.push(1.0, 0.8, 0.5);
  }
}

function polyLen(pts) {
  let total = 0;
  for (let i = 0; i + 1 < pts.length; i++) total += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  return total;
}

function sampleAlong(pts, dist, extend = false) {
  const totalLen = polyLen(pts);
  if (extend && (dist < 0 || dist > totalLen)) {
    const [ptA, ptB] = dist < 0 ? [pts[0], pts[1]] : [pts[pts.length - 2], pts[pts.length - 1]];
    const segLen = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
    const ang = Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]);
    const origin = dist < 0 ? ptA : ptB, offset = dist < 0 ? dist : dist - totalLen;
    return { p: [origin[0] + Math.cos(ang) * offset, origin[1] + Math.sin(ang) * offset], a: ang, l: segLen };
  }
  let acc = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const ptA = pts[i], ptB = pts[i + 1], segLen = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
    if (acc + segLen >= dist && segLen > 0) {
      const frac = (dist - acc) / segLen;
      return { p: [ptA[0] + (ptB[0] - ptA[0]) * frac, ptA[1] + (ptB[1] - ptA[1]) * frac], a: Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]) };
    }
    acc += segLen;
  }
  const ptA = pts[pts.length - 2], ptB = pts[pts.length - 1];
  return { p: ptB, a: Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]) };
}

function drawWarrenTruss(S, pts, spanCount, deckY) {
  const totalLen = polyLen(pts), spanLen = totalLen / spanCount, halfW = 2.6, trussH = 6.0;
  const nodeAt = (s, side, y) => {
    const { p, a } = sampleAlong(pts, Math.min(totalLen - 0.01, Math.max(0.01, s)));
    return [p[0] - Math.sin(a) * side * halfW, y, p[1] + Math.cos(a) * side * halfW];
  };

  for (let i = 0; i + 1 < pts.length; i++) {
    const ptA = pts[i], ptB = pts[i + 1], segLen = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
    const ang = Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]);
    const cx = (ptA[0] + ptB[0]) / 2, cz = (ptA[1] + ptB[1]) / 2;
    S.box(cx, cz, deckY - 1.2, deckY, segLen + 0.1, 5.6, ang, hex(PAL.rail), { top: hex('#6d6670'), bottom: true });
    const ox = -Math.sin(ang) * 3.7, oz = Math.cos(ang) * 3.7;
    S.box(cx + ox, cz + oz, deckY - 0.5, deckY - 0.2, segLen + 0.1, 1.8, ang, COLORS.conc, { bottom: true });
    const rx = -Math.sin(ang) * 4.55, rz = Math.cos(ang) * 4.55;
    S.beam([ptA[0] + rx, deckY + 0.75, ptA[1] + rz], [ptB[0] + rx, deckY + 0.75, ptB[1] + rz], 0.08, 0.08, COLORS.whiteDark);
  }

  for (let k = 0; k <= spanCount; k++) {
    const { p, a } = sampleAlong(pts, Math.min(totalLen - 0.01, Math.max(0.01, k * spanLen)));
    S.kind = KIND.MASONRY;
    if (k > 0 && k < spanCount) {
      S.box(p[0], p[1], -3, deckY - 1.2, 3.2, 8.2, a, COLORS.conc, { taper: 0.9 });
      S.box(p[0], p[1], deckY - 1.6, deckY - 1.2, 3.8, 8.8, a, COLORS.concDark);
    }
    S.kind = KIND.PLAIN;
  }

  const panelCount = 2 * Math.max(3, Math.round(spanLen / 12));
  for (let k = 0; k < spanCount; k++) {
    const s0 = k * spanLen + 0.6, panelLen = (spanLen - 1.2) / panelCount;
    const yBot = deckY + 0.2, yTop = deckY + trussH;
    for (const side of [-1, 1]) {
      const botNodes = [], topNodes = [];
      for (let i = 0; i <= panelCount; i++) {
        botNodes.push(nodeAt(s0 + i * panelLen, side, yBot));
        topNodes.push(nodeAt(s0 + i * panelLen, side, yTop));
      }
      S.beam(botNodes[0], botNodes[panelCount], 0.5, 0.75, COLORS.trussDark);
      S.beam(topNodes[1], topNodes[panelCount - 1], 0.55, 0.65, COLORS.truss);
      drawLacedMember(S, botNodes[0], topNodes[1]);
      drawLacedMember(S, topNodes[panelCount - 1], botNodes[panelCount]);
      for (let i = 1; i < panelCount; i++) {
        S.beam(topNodes[i], botNodes[i], 0.34, 0.4, COLORS.trussDark);
        if (i < panelCount - 1) {
          if (i % 2) drawLacedMember(S, topNodes[i], botNodes[i + 1]);
          else drawLacedMember(S, botNodes[i], topNodes[i + 1]);
        }
      }
    }
    for (let i = 1; i < panelCount; i++) {
      const left = nodeAt(s0 + i * panelLen, -1, yTop), right = nodeAt(s0 + i * panelLen, 1, yTop);
      S.beam(left, right, 0.25, 0.35, COLORS.trussDark);
      if (i < panelCount - 1) {
        S.beam(left, nodeAt(s0 + (i + 1) * panelLen, 1, yTop), 0.18, 0.18, COLORS.trussDark);
        S.beam(right, nodeAt(s0 + (i + 1) * panelLen, -1, yTop), 0.18, 0.18, COLORS.trussDark);
      }
    }
    for (const i of [1, panelCount - 1]) {
      S.beam(nodeAt(s0 + i * panelLen, -1, yTop - 1.1), nodeAt(s0 + i * panelLen, 1, yTop - 1.1), 0.3, 0.6, COLORS.truss);
    }
  }
}

function drawLacedMember(S, ptA, ptB) {
  const dx = ptB[0] - ptA[0], dy = ptB[1] - ptA[1], dz = ptB[2] - ptA[2];
  const len = Math.hypot(dx, dy, dz), horizLen = Math.hypot(dx, dz) || 1;
  const norm = [(-dx / horizLen) * (dy / len), horizLen / len, (-dz / horizLen) * (dy / len)];
  const offset = 0.3;
  const shift = (pt, sign): [number, number, number] => [pt[0] + norm[0] * offset * sign, pt[1] + norm[1] * offset * sign, pt[2] + norm[2] * offset * sign];
  S.beam(shift(ptA, -1), shift(ptB, -1), 0.36, 0.12, COLORS.truss);
  S.beam(shift(ptA, 1), shift(ptB, 1), 0.36, 0.12, COLORS.truss);
  const segCount = Math.max(2, Math.round(len / 0.9));
  for (let i = 0; i < segCount; i++) {
    const lerp = (frac): [number, number, number] => [ptA[0] + dx * frac, ptA[1] + dy * frac, ptA[2] + dz * frac];
    S.beam(shift(lerp(i / segCount), i % 2 ? 1 : -1), shift(lerp((i + 1) / segCount), i % 2 ? -1 : 1), 0.07, 0.05, COLORS.trussDark);
  }
}

function drawPlateGirder(S, pts, deckY) {
  const ptA = pts[0], ptB = pts[1], segLen = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
  const ang = Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]);
  S.box((ptA[0] + ptB[0]) / 2, (ptA[1] + ptB[1]) / 2, deckY - 1.4, deckY, segLen, 5.6, ang, COLORS.whiteDark, { top: hex('#6d6670'), bottom: true });
  S.kind = KIND.MASONRY;
  S.box(ptA[0], ptA[1], -3, deckY - 1.4, 3.2, 8.2, ang, COLORS.conc, { taper: 0.9 });
  S.kind = KIND.PLAIN;
}
