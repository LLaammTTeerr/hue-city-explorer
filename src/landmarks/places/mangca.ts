import { KIND, hex, shade, mix, inRing, rand } from '../../geo/buf.ts';
import { LAND_Y, WALL_H, PAL } from '../../config.ts';
import { streetTest } from '../enclosure.ts';

// Trấn Bình Đài (đồn Mang Cá), the outwork at the Citadel's north-east corner, and Trấn Bình Môn, the gate in the
// Citadel's own wall that leads out to it over the common moat.
//
// Sourced (see docs/places/mangca.md): an earth ring from 1805 (đài Thái Bình), rebuilt in brick in 1836 under Minh
// Mạng and renamed Trấn Bình Đài; Vauban-style, the Citadel's 25th bastion, cut off from the main wall by a shared
// moat. Perimeter 1,048 m; wall 5.10 m high and nearly 15 m thick; a 7.5 m path along the outer foot; moat 32 m wide.
// Six flights of steps, each 3.35 m wide, up the inner face. Its own gate, Trường Định môn, sits in the middle of the
// south flank: a plain passage through the wall 2 m wide under a 3 m arch, with no tower, and stands as a ruin today.
// Trấn Bình Môn is a plain passage through the Citadel wall, likewise without a watch tower; on top of it stands an
// old, abandoned building roofed with cement tiles, its wooden doors rotting and the masonry overgrown. A PAVN
// barracks since 1975, closed to the public.
//
// Plan: the wall band as OSM maps it (relation 8541343's two smaller pieces, hard-coded below in model metres). The
// mapped band runs round the north, east and south; the gorge facing the Citadel across the shared moat carries no
// mapped wall, and the mapped band alone (about 1,000 m on its outer line) already makes up the sourced 1,048 m, so
// none is drawn there. The gap in the south flank is Trường Định môn. Trấn Bình Môn is OSM way 367959083 (footprint
// below), against the inner face of the Citadel wall, on the axis of cầu Mang Cá (way 367959081).
export const id = 'mangca';

// the fort's wall band (from data.wall[1] and data.wall[2]; metres, x east, z south)
const BAND_NE = [
  [-1444.1, -2341.8], [-1291.1, -2533.8], [-1255.3, -2457.3], [-1094.5, -2452.4], [-1092.0, -2451.9],
  [-1089.9, -2450.6], [-1088.3, -2448.6], [-1087.5, -2446.3], [-1087.6, -2443.8], [-1128.1, -2288.1],
  [-1064.2, -2239.1], [-1061.4, -2236.0], [-1059.9, -2232.0], [-1059.8, -2227.9], [-1061.2, -2223.9],
  [-1064.0, -2220.7], [-1067.6, -2218.7], [-1174.7, -2182.2], [-1180.1, -2197.7], [-1081.2, -2231.4],
  [-1146.8, -2281.7], [-1106.6, -2436.3], [-1248.4, -2440.7], [-1253.6, -2441.3], [-1258.6, -2442.9],
  [-1263.3, -2445.3], [-1267.4, -2448.6], [-1270.8, -2452.5], [-1273.4, -2457.1], [-1294.8, -2502.8],
  [-1431.1, -2331.7],
];
const BAND_SW = [[-1299.9, -2156.9], [-1190.8, -2194.1], [-1185.5, -2178.6], [-1294.5, -2141.4]];
const FORT_INTERIOR = [-1250, -2330]; // a point inside the fort, to tell the outer faces from the inner

const FORT_HEIGHT = 5.10; // wall walk above the ground
const PARAPET_H = 1.0;
const PARAPET_T = 1.2; // estimates, a little lower than the Citadel's
const EMBRASURE_COUNT = 21; // the 21 gun emplacements
const EMBRASURE_W = 0.9;
const EMBRASURE_SILL = 0.4;
const STAIR_WIDTH = 3.35;
const STAIR_COUNT = 6;

// Trấn Bình Môn: OSM footprint (way 367959083), and the gate's axis (cầu Mang Cá starts at its outer mouth)
const GATE_TANGENT = [0.589, 0.808];
const GATE_NORMAL = [0.808, -0.589]; // along the wall (towards the south-east); out of the Citadel (north-east)
const GATE_RING_OSM = [[-1453.2, -2161.6], [-1442.4, -2169.5], [-1451.7, -2182.2], [-1463.1, -2197.9], [-1474.1, -2190.3], [-1462.5, -2174.4]];
const GATE_CENTER_OSM = [-1458.2, -2179.9];
// The satellite (zoom 20, 0.14 m/px) puts the block's long roof 6 m north-west of the OSM footprint along the wall, while
// across the wall they agree to about 1.5 m and cầu Mang Cá, the moat and the wall to 1-2 m in the same frame: the bridge
// axis meets the roof about 72% of the way from its north-west end, not near its middle. A lean of the image would
// shift the roof across the wall as much as along it, and it does not, so the block is moved, and the passage stays on
// the bridge's axis.
const GATE_SHIFT = 6.0;
const GATE_RING = GATE_RING_OSM.map(([x, z]) => [x - GATE_TANGENT[0] * GATE_SHIFT, z - GATE_TANGENT[1] * GATE_SHIFT]);
const GATE_CENTER = [GATE_CENTER_OSM[0] - GATE_TANGENT[0] * GATE_SHIFT, GATE_CENTER_OSM[1] - GATE_TANGENT[1] * GATE_SHIFT];
const GATE_HALF_DEPTH = 6.7;
const WALL_OUTER_DIST = 10.3;
const AXIS_OFFSET = 2.0 + GATE_SHIFT; // inner face, the Citadel wall's outer face, axis offset (m)

const FORT_TREES: [number, number, number][] = [
  [-1474, -2206, 12], [-1486, -2190, 11], [-1442, -2154, 12], [-1430, -2142, 13],
  [-1420, -2130, 11], [-1492, -2220, 12], [-1412, -2215, 13], [-1395, -2245, 12],
  [-1365, -2280, 14], [-1320, -2315, 13], [-1270, -2340, 12], [-1220, -2355, 13],
  [-1180, -2310, 12], [-1155, -2260, 13], [-1245, -2245, 12], [-1310, -2225, 11],
];

const FORT_BRICK = shade(PAL.brick, 0.86);
const BUILDING_WASH = hex('#cdc3ab');
const COLORS = {
  brick: FORT_BRICK,
  damp: hex('#3a3833'),
  dark: hex('#46443e'),
  relaid: hex('#655e57'),
  lichen: hex('#4a4d3e'),
  walk: PAL.moss,
  ivy: hex('#34482a'),
  ivyLight: hex('#4a5e34'),
  parapet: shade(FORT_BRICK, 0.92),
  parapetCap: shade(FORT_BRICK, 1.12),
  step: shade(PAL.brickLight, 0.9),
  jambLime: hex('#8d877a'),
  wash: BUILDING_WASH,
  roof: hex('#7a5948'),
  washStreak: mix(BUILDING_WASH, hex('#78705e'), 0.4),
  openingDark: hex('#2a2622'),
  archMouth: hex('#1d1b18'),
  doorWood: hex('#4a3524'),
};

// a wall face as it reads today: a damp foot, lichen and soot streaks from the top down, relaid patches
function buildWallWeathering(S, edge, y0, y1, seed) {
  const proud = 0.04;
  const { a: startPt, len, ux, uz, nx, nz } = edge;
  const addQuad = (s0, s1, h0, h1, color) => {
    const x0 = startPt[0] + ux * s0 + nx * proud;
    const z0 = startPt[1] + uz * s0 + nz * proud;
    const x1 = startPt[0] + ux * s1 + nx * proud;
    const z1 = startPt[1] + uz * s1 + nz * proud;
    S.quad([x0, h0, z0], [x1, h0, z1], [x1, h1, z1], [x0, h1, z0], color, [nx, 0.001, nz]);
  };
  const faceH = y1 - LAND_Y;
  addQuad(0, len, y0, LAND_Y + 0.6 + rand(seed, 1) * 0.5, COLORS.damp);
  for (let pos = rand(seed, 2) * 6; pos < len - 1; pos += 4 + rand(seed + pos, 3) * 7) {
    const patchW = Math.min(len - pos, 1.5 + rand(seed + pos, 4) * 4.5);
    const roll = rand(seed + pos, 5);
    if (roll < 0.55) {
      addQuad(pos, pos + patchW, LAND_Y + 0.6 + rand(seed + pos, 6) * (faceH - 2), y1, mix(COLORS.dark, COLORS.lichen, rand(seed + pos, 7) * 0.7));
    } else if (roll < 0.8) {
      const botY = LAND_Y + 1.0 + rand(seed + pos, 8) * (faceH - 3);
      addQuad(pos, Math.min(len, pos + patchW * 1.5), botY, botY + 1.0 + rand(seed + pos, 9) * 1.8, COLORS.relaid);
    }
  }
}

// a 2 m passage under a 3 m round arch, seen on a wall face: a lime-washed surround, the dark mouth, and the rotting
// wooden doors set back in it. (posX, posZ): foot of the opening on the face; normal: outward normal; tangent: along face.
function buildArchway(S, posX, posZ, normal, tangent) {
  const openW = 2;
  const openH = 3;
  const springH = openH - openW / 2;
  const archPoly = (halfW, topH, outOff) => { // rectangle up to the springing, then a half circle
    const pts = [[-halfW, 0], [halfW, 0], [halfW, springH]];
    for (let k = 1; k < 8; k++) {
      const theta = (k / 8) * Math.PI;
      pts.push([Math.cos(theta) * halfW, springH + Math.sin(theta) * (topH - springH)]);
    }
    pts.push([-halfW, springH]);
    return pts.map(([along, height]) => [posX + tangent[0] * along + normal[0] * outOff, LAND_Y + height, posZ + tangent[1] * along + normal[1] * outOff]);
  };
  const centerOf = (pts): [number, number, number] => [
    pts.reduce((acc, pt) => acc + pt[0], 0) / pts.length,
    LAND_Y + springH * 0.7,
    pts.reduce((acc, pt) => acc + pt[2], 0) / pts.length,
  ];
  const fillFan = (pts, color) => {
    const hub = centerOf(pts);
    for (let i = 0; i < pts.length; i++) S.tri(hub, pts[i], pts[(i + 1) % pts.length], color, [normal[0], 0, normal[1]]);
  };
  fillFan(archPoly(openW / 2 + 0.45, openH + 0.45, 0.02), COLORS.jambLime); // the surround
  fillFan(archPoly(openW / 2, openH, 0.05), COLORS.archMouth); // the mouth
  for (const side of [-1, 1]) { // two leaves, one sagging open
    const u0 = side * (openW / 2 - 0.08);
    const u1 = side * (side > 0 ? 0.15 : 0.02);
    const leafPt = (along, height, outOff): [number, number, number] => [posX + tangent[0] * along + normal[0] * outOff, LAND_Y + height, posZ + tangent[1] * along + normal[1] * outOff];
    S.quad(
      leafPt(u0, 0.05, 0.07),
      leafPt(u1, 0.05, side > 0 ? 0.35 : 0.07),
      leafPt(u1, springH - 0.1, side > 0 ? 0.35 : 0.07),
      leafPt(u0, springH - 0.1, 0.07),
      side > 0 ? shade(COLORS.doorWood, 0.8) : COLORS.doorWood,
      [normal[0], 0, normal[1]],
    );
  }
}

// a pitched roof with its ridge along angle over walls length x width, the gable ends closed in the wall colour
function buildGableRoof(S, center, length, width, angle, y0, riseH, roofCol, wallCol, overhang) {
  const cosAng = Math.cos(angle);
  const sinAng = Math.sin(angle);
  const ptAt = (localU, localV, y): [number, number, number] => [center[0] + localU * cosAng - localV * sinAng, y, center[1] + localU * sinAng + localV * cosAng];
  const halfL = length / 2 + overhang;
  const halfW = width / 2 + overhang;
  const eaveY = y0 - (riseH * overhang) / (width / 2);
  const keepKind = S.kind;
  S.kind = KIND.TILE;
  S.quad(ptAt(-halfL, -halfW, eaveY), ptAt(halfL, -halfW, eaveY), ptAt(halfL, 0, y0 + riseH), ptAt(-halfL, 0, y0 + riseH), roofCol, [sinAng, 0.9, -cosAng]);
  S.quad(ptAt(-halfL, halfW, eaveY), ptAt(halfL, halfW, eaveY), ptAt(halfL, 0, y0 + riseH), ptAt(-halfL, 0, y0 + riseH), roofCol, [-sinAng, 0.9, cosAng]);
  S.kind = KIND.PLAIN;
  for (const side of [-1, 1]) { // the roof's underside at the gable overhangs, and the gables
    S.tri(ptAt(side * (length / 2), -width / 2, y0), ptAt(side * (length / 2), width / 2, y0), ptAt(side * (length / 2), 0, y0 + riseH), wallCol, [side * cosAng, 0, side * sinAng]);
    S.quad(ptAt(side * halfL, -halfW, eaveY - 0.15), ptAt(side * halfL, 0, y0 + riseH - 0.15), ptAt(side * halfL, 0, y0 + riseH), ptAt(side * halfL, -halfW, eaveY), shade(roofCol, 0.8), [side * cosAng, 0, side * sinAng]);
    S.quad(ptAt(side * halfL, 0, y0 + riseH - 0.15), ptAt(side * halfL, halfW, eaveY - 0.15), ptAt(side * halfL, halfW, eaveY), ptAt(side * halfL, 0, y0 + riseH), shade(roofCol, 0.8), [side * cosAng, 0, side * sinAng]);
  }
  S.beam(ptAt(-halfL, 0, y0 + riseH + 0.05), ptAt(halfL, 0, y0 + riseH + 0.05), 0.35, 0.25, shade(roofCol, 0.85));
  S.kind = keepKind;
}

function buildFortRampartsAndStairs(S, baseY, wallWalkY) {
  const bands = [BAND_NE, BAND_SW];
  const inBand = (x, z) => bands.some((ring) => inRing(x, z, ring));
  const countCrossings = (ax, az, bx, bz) => {
    let hits = 0;
    for (const ring of bands) {
      for (let i = 0; i < ring.length; i++) {
        const ptA = ring[i];
        const ptB = ring[(i + 1) % ring.length];
        const d1 = (bx - ax) * (ptA[1] - az) - (bz - az) * (ptA[0] - ax);
        const d2 = (bx - ax) * (ptB[1] - az) - (bz - az) * (ptB[0] - ax);
        if ((d1 > 0) === (d2 > 0)) continue;
        const d3 = (ptB[0] - ptA[0]) * (az - ptA[1]) - (ptB[1] - ptA[1]) * (ax - ptA[0]);
        const d4 = (ptB[0] - ptA[0]) * (bz - ptA[1]) - (ptB[1] - ptA[1]) * (bx - ptA[0]);
        if ((d3 > 0) !== (d4 > 0)) hits++;
      }
    }
    return hits;
  };

  // ---- the fort's walls ----
  const coverStart = S.n;
  S.kind = KIND.MASONRY;
  const edges = [];
  for (const ring of bands) {
    S.prism(ring, baseY, wallWalkY, COLORS.brick, COLORS.walk, { topKind: KIND.GROUND });
    for (let i = 0; i < ring.length; i++) {
      const ptA = ring[i];
      const ptB = ring[(i + 1) % ring.length];
      const dx = ptB[0] - ptA[0];
      const dz = ptB[1] - ptA[1];
      const len = Math.hypot(dx, dz);
      if (len < 0.4) continue;
      const ux = dx / len;
      const uz = dz / len;
      const mx = (ptA[0] + ptB[0]) / 2;
      const mz = (ptA[1] + ptB[1]) / 2;
      let nx = uz;
      let nz = -ux;
      if (inBand(mx + nx * 0.6, mz + nz * 0.6)) {
        nx = -nx;
        nz = -nz;
      }
      const outer = len > 17 || len < 6 ? countCrossings(mx + nx * 2, mz + nz * 2, FORT_INTERIOR[0], FORT_INTERIOR[1]) > 0 : null; // the band's ends (15-17 m) are neither
      edges.push({ a: ptA, b: ptB, len, ux, uz, nx, nz, outer, ang: Math.atan2(dz, dx) });
    }
  }
  for (const edge of edges) {
    if (edge.len >= 1.5) buildWallWeathering(S, edge, baseY, wallWalkY, Math.round(edge.a[0] * 7 + edge.a[1] * 13));
  }

  // parapet on the outer edges, with the 21 embrasures shared out over the long faces by length
  const outerLong = edges.filter((edge) => edge.outer && edge.len > 25);
  const totalOuterLen = outerLong.reduce((acc, edge) => acc + edge.len, 0);
  const exactShares = outerLong.map((edge) => (EMBRASURE_COUNT * edge.len) / totalOuterLen);
  const edgeCounts = exactShares.map(Math.floor);
  for (let remaining = EMBRASURE_COUNT - edgeCounts.reduce((acc, cnt) => acc + cnt, 0); remaining > 0; remaining--) {
    let bestIdx = 0;
    for (let j = 1; j < exactShares.length; j++) {
      if (exactShares[j] - edgeCounts[j] > exactShares[bestIdx] - edgeCounts[bestIdx]) bestIdx = j;
    }
    edgeCounts[bestIdx]++;
    exactShares[bestIdx] = edgeCounts[bestIdx];
  }
  for (const edge of edges) {
    if (!edge.outer) continue;
    const baseX = edge.a[0] - edge.nx * (PARAPET_T / 2);
    const baseZ = edge.a[1] - edge.nz * (PARAPET_T / 2);
    const addSeg = (s0, s1, topY) => {
      if (s1 - s0 > 0.05) {
        const midS = (s0 + s1) / 2;
        S.box(baseX + edge.ux * midS, baseZ + edge.uz * midS, wallWalkY - 0.05, topY, s1 - s0, PARAPET_T, edge.ang, COLORS.parapet, { top: COLORS.parapetCap });
      }
    };
    const embCount = edgeCounts[outerLong.indexOf(edge)] || 0;
    const cornerExt = edge.len < 3 ? 0.3 : 0.7;
    if (!embCount) {
      addSeg(-cornerExt, edge.len + cornerExt, wallWalkY + PARAPET_H);
      continue;
    }
    const step = edge.len / (embCount + 1);
    let cursor = -cornerExt;
    for (let j = 1; j <= embCount; j++) {
      const centerS = j * step;
      addSeg(cursor, centerS - EMBRASURE_W / 2, wallWalkY + PARAPET_H);
      addSeg(centerS - EMBRASURE_W / 2, centerS + EMBRASURE_W / 2, wallWalkY + EMBRASURE_SILL);
      cursor = centerS + EMBRASURE_W / 2;
    }
    addSeg(cursor, edge.len + cornerExt, wallWalkY + PARAPET_H);
  }
  S.kind = KIND.PLAIN;
  (S.noCover = S.noCover || []).push([coverStart, S.n]); // the walk is planted ground, as on the Citadel's rampart

  // six flights of steps up the inner face (positions estimated: the middle of the six longest inner faces)
  S.kind = KIND.MASONRY;
  const tread = 0.36;
  const stepRise = 0.3;
  const stepCount = Math.ceil(FORT_HEIGHT / stepRise);
  for (const edge of edges.filter((item) => item.outer === false && item.len > 40).sort((a, b) => b.len - a.len).slice(0, STAIR_COUNT)) {
    const runLen = stepCount * tread;
    const startS = edge.len / 2 - runLen / 2;
    const baseX = edge.a[0] + edge.nx * (STAIR_WIDTH / 2 + 0.02);
    const baseZ = edge.a[1] + edge.nz * (STAIR_WIDTH / 2 + 0.02);
    for (let j = 0; j < stepCount; j++) {
      const alongS = startS + (j + 0.5) * tread;
      const topY = Math.min(wallWalkY, LAND_Y + (j + 1) * stepRise);
      S.box(baseX + edge.ux * alongS, baseZ + edge.uz * alongS, LAND_Y - 0.2, topY, tread + 0.02, STAIR_WIDTH, edge.ang, j % 2 ? COLORS.step : shade(COLORS.step, 0.94), { top: shade(COLORS.step, 1.08) });
    }
    // a low side wall on the open side of the flight
    const cheekX = baseX + edge.nx * (STAIR_WIDTH / 2 + 0.2);
    const cheekZ = baseZ + edge.nz * (STAIR_WIDTH / 2 + 0.2);
    const midS = startS + runLen / 2;
    S.box(cheekX + edge.ux * midS, cheekZ + edge.uz * midS, LAND_Y - 0.2, LAND_Y + 0.5, runLen, 0.4, edge.ang, COLORS.dark, { top: shade(COLORS.dark, 1.2), taper: 1 });
  }
}

function buildTruongDinhRuins(data, S, baseY) {
  // ---- Trường Định môn: the ruined gate in the south flank ----
  const endSW = [(BAND_SW[1][0] + BAND_SW[2][0]) / 2, (BAND_SW[1][1] + BAND_SW[2][1]) / 2];
  const endNE = [(BAND_NE[17][0] + BAND_NE[18][0]) / 2, (BAND_NE[17][1] + BAND_NE[18][1]) / 2];
  const gapX = endNE[0] - endSW[0];
  const gapZ = endNE[1] - endSW[1];
  const gapLen = Math.hypot(gapX, gapZ);
  const dirX = gapX / gapLen;
  const dirZ = gapZ / gapLen;
  const angle = Math.atan2(gapZ, gapX);
  const wallDepth = Math.hypot(BAND_SW[2][0] - BAND_SW[1][0], BAND_SW[2][1] - BAND_SW[1][1]);
  const normX = -dirZ;
  const normZ = dirX; // across the wall
  const ruinBrick = shade(COLORS.brick, 1.05);
  const isStreet = streetTest(data, endSW, 40);
  // a box (centre x, z; length len along the wall, width wid across it; turned by boxAngle) clear of the lane, 0.3 m to spare
  const isClearOfLane = (x, z, len, wid, boxAngle = angle) => {
    const cosA = Math.cos(boxAngle);
    const sinA = Math.sin(boxAngle);
    for (const [fx, fz] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5], [0, 0]]) {
      if (isStreet(x + cosA * fx * len - sinA * fz * wid, z + sinA * fx * len + cosA * fz * wid, 0.3)) return false;
    }
    return true;
  };
  S.kind = KIND.MASONRY;
  for (const [endPt, dirSign] of [[endSW, 1], [endNE, -1]] as any[]) {
    // the broken end: three steps of masonry reaching into the breach, each lower, in slices across the wall
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        const reach = 0.7 + j * 0.7;
        const offsetV = -wallDepth / 2 + (k + 0.5) * (wallDepth / 3);
        const topY = LAND_Y + FORT_HEIGHT * (0.78 - j * 0.22) - rand(j * 5 + k + dirSign * 11, 31) * 0.9;
        const offsetU = dirSign * (reach - 0.35);
        const bx = endPt[0] + dirX * offsetU + normX * offsetV;
        const bz = endPt[1] + dirZ * offsetU + normZ * offsetV;
        if (!isClearOfLane(bx, bz, 0.72, wallDepth / 3 + 0.04)) continue;
        S.box(bx, bz, baseY, topY, 0.72, wallDepth / 3 + 0.04, angle, j ? shade(ruinBrick, 0.95 - j * 0.04) : ruinBrick, { top: COLORS.walk });
      }
    }
    // the jamb's stump, lime-faced, where the passage once ran
    const jambU = dirSign * 2.4;
    if (isClearOfLane(endPt[0] + dirX * jambU, endPt[1] + dirZ * jambU, 0.8, 2.2)) {
      S.box(endPt[0] + dirX * jambU, endPt[1] + dirZ * jambU, baseY, LAND_Y + 1.1 + rand(dirSign + 3, 32) * 0.6, 0.8, 2.2, angle, COLORS.jambLime, { top: shade(COLORS.walk, 0.9) });
    }
  }
  S.kind = KIND.PLAIN;
  const breachCenter = [(endSW[0] + endNE[0]) / 2, (endSW[1] + endNE[1]) / 2];
  for (let k = 0; k < 9; k++) { // fallen brick along the foot of the breach, clear of the lane
    const side = k % 2 ? 1 : -1;
    const offsetU = side * (3.2 + rand(k, 13) * 1.6);
    const offsetV = (rand(k, 14) - 0.5) * (wallDepth + 2);
    const pieceL = 0.6 + rand(k, 16) * 0.8;
    const pieceW = 0.5 + rand(k, 17) * 0.6;
    const bx = breachCenter[0] + dirX * offsetU + normX * offsetV;
    const bz = breachCenter[1] + dirZ * offsetU + normZ * offsetV;
    if (!isClearOfLane(bx, bz, Math.hypot(pieceL, pieceW), Math.hypot(pieceL, pieceW))) continue;
    S.box(bx, bz, LAND_Y - 0.1, LAND_Y + 0.2 + rand(k, 15) * 0.4, pieceL, pieceW, angle + rand(k, 18), COLORS.dark);
  }
}

function buildTranBinhMonGate(data, S) {
  // ---- Trấn Bình Môn ----
  const gateTopY = LAND_Y + WALL_H;
  S.kind = KIND.MASONRY; // brick courses, as on the Citadel wall either side
  S.prism(GATE_RING, LAND_Y - 0.4, gateTopY, COLORS.brick, COLORS.walk, { topKind: KIND.GROUND });
  for (let i = 0; i < GATE_RING.length; i++) {
    const ptA = GATE_RING[i];
    const ptB = GATE_RING[(i + 1) % GATE_RING.length];
    const dx = ptB[0] - ptA[0];
    const dz = ptB[1] - ptA[1];
    const len = Math.hypot(dx, dz);
    let nx = dz / len;
    let nz = -dx / len;
    if (inRing(ptA[0] + dx / 2 + nx * 0.5, ptA[1] + dz / 2 + nz * 0.5, GATE_RING)) {
      nx = -nx;
      nz = -nz;
    }
    if (len > 1.5) buildWallWeathering(S, { a: ptA, len, ux: dx / len, uz: dz / len, nx, nz }, LAND_Y - 0.4, gateTopY, 31 + i);
  }
  S.kind = KIND.PLAIN;
  const axisX = GATE_CENTER[0] + GATE_TANGENT[0] * AXIS_OFFSET;
  const axisZ = GATE_CENTER[1] + GATE_TANGENT[1] * AXIS_OFFSET;
  // the passage's two mouths: on the gate block's city face, and on the Citadel wall's outer face over the bridge
  buildArchway(S, axisX - GATE_NORMAL[0] * (GATE_HALF_DEPTH + 0.03), axisZ - GATE_NORMAL[1] * (GATE_HALF_DEPTH + 0.03), [-GATE_NORMAL[0], -GATE_NORMAL[1]], GATE_TANGENT);
  buildArchway(S, axisX + GATE_NORMAL[0] * (WALL_OUTER_DIST + 0.03), axisZ + GATE_NORMAL[1] * (WALL_OUTER_DIST + 0.03), GATE_NORMAL, GATE_TANGENT);

  // the old building on top, abandoned: stained lime wash, empty window and door openings, a cement-tile roof.
  const bldW = 34.4;
  const bldD = 8.4;
  const bldH = 3.5;
  const bldAngle = Math.atan2(GATE_TANGENT[1], GATE_TANGENT[0]);
  const bldX = GATE_CENTER[0];
  const bldZ = GATE_CENTER[1];
  S.kind = KIND.COLONIAL;
  S.box(bldX, bldZ, gateTopY, gateTopY + bldH, bldW, bldD, bldAngle, COLORS.wash, { top: shade(COLORS.wash, 0.85) });
  S.kind = KIND.PLAIN;
  S.box(bldX, bldZ, gateTopY, gateTopY + 0.7, bldW + 0.08, bldD + 0.08, bldAngle, shade(COLORS.wash, 0.72)); // weathered plinth
  S.box(bldX, bldZ, gateTopY + bldH - 0.25, gateTopY + bldH, bldW + 0.24, bldD + 0.24, bldAngle, shade(COLORS.wash, 1.06)); // cornice band
  const bayCount = 11; // tall colonial window/door bays with pale frames
  for (const side of [-1, 1]) {
    for (let j = 0; j < bayCount; j++) {
      const alongS = -bldW / 2 + 1.5 + j * ((bldW - 3) / (bayCount - 1));
      const isDoor = j === (bayCount - 1) / 2;
      const openX = bldX + GATE_TANGENT[0] * alongS + GATE_NORMAL[0] * side * (bldD / 2 + 0.03);
      const openZ = bldZ + GATE_TANGENT[1] * alongS + GATE_NORMAL[1] * side * (bldD / 2 + 0.03);
      S.box(openX, openZ, gateTopY + (isDoor ? 0.05 : 0.85), gateTopY + (isDoor ? 2.65 : 2.55), isDoor ? 1.4 : 1.15, 0.08, bldAngle, COLORS.openingDark);
      S.box(openX + GATE_NORMAL[0] * side * 0.02, openZ + GATE_NORMAL[1] * side * 0.02, gateTopY + (isDoor ? 2.65 : 2.55), gateTopY + (isDoor ? 2.85 : 2.72), isDoor ? 1.65 : 1.35, 0.08, bldAngle, shade(COLORS.wash, 1.08));
      // rain streaks from the eaves down the wash between the openings
      if (j < bayCount - 1 && rand(j * 3 + side, 41) < 0.45) {
        const streakS = alongS + (bldW - 3) / (bayCount - 1) / 2 + (rand(j, 42) - 0.5);
        const streakW = 0.22 + rand(j + side, 43) * 0.35;
        const yTop = gateTopY + bldH - 0.25;
        const yBot = yTop - 0.5 - rand(j, 44) * 1.0;
        const px = bldX + GATE_TANGENT[0] * streakS + GATE_NORMAL[0] * side * (bldD / 2 + 0.04);
        const pz = bldZ + GATE_TANGENT[1] * streakS + GATE_NORMAL[1] * side * (bldD / 2 + 0.04);
        S.quad(
          [px - GATE_TANGENT[0] * streakW / 2, yBot, pz - GATE_TANGENT[1] * streakW / 2],
          [px + GATE_TANGENT[0] * streakW / 2, yBot, pz + GATE_TANGENT[1] * streakW / 2],
          [px + GATE_TANGENT[0] * streakW / 2, yTop, pz + GATE_TANGENT[1] * streakW / 2],
          [px - GATE_TANGENT[0] * streakW / 2, yTop, pz - GATE_TANGENT[1] * streakW / 2],
          COLORS.washStreak,
          [GATE_NORMAL[0] * side, 0, GATE_NORMAL[1] * side],
        );
      }
    }
  }
  buildGableRoof(S, [bldX, bldZ], bldW, bldD, bldAngle, gateTopY + bldH, 2.3, COLORS.roof, COLORS.wash, 0.75);

  // lush trees flanking Trấn Bình Môn and inside the fort compound (matching Google Satellite canopy)
  if (Array.isArray(data.trees)) {
    for (const [treeX, treeZ, scale] of FORT_TREES) data.trees.push(Math.round(treeX * 10), Math.round(treeZ * 10), scale, 1);
  }

  // overgrowth: shrubs along the gate's top and creepers down its city face
  S.kind = KIND.PLAIN;
  for (let k = 0; k < 14; k++) {
    const alongS = (rand(k, 21) - 0.5) * 32;
    const acrossV = (rand(k, 22) - 0.5) * 11;
    if (Math.abs(acrossV) < bldD / 2 + 1 && Math.abs(alongS) < bldW / 2 + 1) continue;
    const px = GATE_CENTER[0] + GATE_TANGENT[0] * alongS + GATE_NORMAL[0] * acrossV;
    const pz = GATE_CENTER[1] + GATE_TANGENT[1] * alongS + GATE_NORMAL[1] * acrossV;
    const shrubR = 0.9 + rand(k, 23) * 1.4;
    S.cyl(px, pz, gateTopY - 0.1, gateTopY + shrubR * 1.3, shrubR, shrubR * 0.45, 6, mix(COLORS.ivy, COLORS.ivyLight, rand(k, 24)), { rot: rand(k, 25) * 3 });
  }
  // creepers down the city face: clumps of hanging strands of uneven length, thinning out downwards
  for (let k = 0; k < 9; k++) {
    const clumpS = (rand(k, 26) - 0.5) * 32;
    const clumpW = 1.2 + rand(k, 27) * 2.5;
    if (Math.abs(clumpS - AXIS_OFFSET) < 2.5 + clumpW / 2) continue;
    const strandCount = 3 + Math.floor(clumpW / 0.6);
    for (let strandIdx = 0; strandIdx < strandCount; strandIdx++) {
      const alongS = clumpS - clumpW / 2 + (strandIdx + 0.5) * (clumpW / strandCount);
      const strandW = (clumpW / strandCount) * (0.7 + rand(k * 7 + strandIdx, 45) * 0.5);
      const strandLen = (1 - Math.abs((strandIdx + 0.5) / strandCount - 0.5) * 1.2) * (1.5 + rand(k, 28) * 4) * (0.6 + rand(k * 7 + strandIdx, 46) * 0.6);
      const px = GATE_CENTER[0] + GATE_TANGENT[0] * alongS - GATE_NORMAL[0] * (GATE_HALF_DEPTH + 0.08 + strandIdx * 0.002);
      const pz = GATE_CENTER[1] + GATE_TANGENT[1] * alongS - GATE_NORMAL[1] * (GATE_HALF_DEPTH + 0.08 + strandIdx * 0.002);
      const botY = gateTopY - strandLen;
      const tipHalf = strandW * 0.25;
      S.quad(
        [px - GATE_TANGENT[0] * tipHalf, botY, pz - GATE_TANGENT[1] * tipHalf],
        [px + GATE_TANGENT[0] * tipHalf, botY, pz + GATE_TANGENT[1] * tipHalf],
        [px + GATE_TANGENT[0] * strandW / 2, gateTopY + 0.1, pz + GATE_TANGENT[1] * strandW / 2],
        [px - GATE_TANGENT[0] * strandW / 2, gateTopY + 0.1, pz - GATE_TANGENT[1] * strandW / 2],
        mix(COLORS.ivy, COLORS.ivyLight, rand(k * 7 + strandIdx, 29)),
        [-GATE_NORMAL[0], 0, -GATE_NORMAL[1]],
      );
    }
  }
}

export function build({ S, data }) {
  const baseY = LAND_Y - 0.5;
  const wallWalkY = LAND_Y + FORT_HEIGHT;

  buildFortRampartsAndStairs(S, baseY, wallWalkY);
  buildTruongDinhRuins(data, S, baseY);
  buildTranBinhMonGate(data, S);

  S.kind = KIND.PLAIN;
}
