import { KIND, hex, shade } from '../../geo/buf.ts';
import { LAND_Y } from '../../config.ts';
import { OUTER, BAC_KHUYET_DAI, wallRun } from '../hoangthanh.ts';

// Lầu Tứ Phương Vô Sự (1923, Khải Định; wrecked in 1968, restored 2008–2010) on Bắc Khuyết Đài, the raised bastion at
// the middle of the Imperial City's north wall, just west of Cửa Hòa Bình. Sources and estimates: docs/places/tuphuong.md.
//   - Bắc Khuyết Đài: a rectangular platform 64.6 × 28.5 m on top of the wall, jutting out past its line. This
//     model owns the bastion's three outer sides of the Imperial City wall (hoangthanh.js; dainoi.js draws the rest
//     of the ring and skips them), so the wall, its cap and the brick parapet on it are one model's: the platform's
//     fill stops at the wall's inner face. Also the lawn and terracotta walks, the two flights up from inside, the turtle-shaped
//     flower beds east and west of the pavilion and the frangipani (cây sứ) along the inner edge
//   - the pavilion: brick and cement, two storeys on a 14 × 13 m (182 m²) plan, OSM way 172802373. Ground floor
//     ringed by an arcaded verandah (hàng hiên) under a skirt roof; upper floor smaller, with a balcony all round
//     (ban công vòng quanh); each face of each storey has one door and two windows; walls washed pale yellow,
//     piers and arches cream, joinery dark red-brown, the upper balcony's balusters grey-blue
//   - roofs: sources say yellow glazed tile, but Street View shows them uniformly dark and matte, and so are they
//     drawn; on the ridge a sun disc between two dragons (hồi long), openwork dragons at all eight corners, dark
// Geometry is hard-coded in the bastion's frame: u along its outer face (west → east), v inward (towards the
// Imperial City's centre), metres from the middle of the outer face. Points from OSM (ways 531016856, 172802373).
export const id = 'tuphuong';

// the wall's centre line round the bastion: where the main wall line turns out (J0, J1, west and east) and the outer
// face's corners (A, B)
const [BASTION_J0, BASTION_A, BASTION_B, BASTION_J1] = BAC_KHUYET_DAI;

const COLORS = {
  wall: hex('#e8cf92'), // pale yellow wash
  pier: hex('#f1e7cf'), // cream piers, arches and cornices
  joinery: hex('#5c2f22'), // dark red-brown doors, shutters and rails
  roof: hex('#504640'), // weathered tile, matte: Street View reads the roofs uniformly dark, not yellow
  ridge: shade(hex('#504640'), 0.82), // ridges and hips a shade darker than the tile
  ornament: hex('#2f2b29'), // the openwork dragons and ornaments: dark, as the panoramas show them
  upperWall: hex('#4a3426'), // the upper storey's dark timber walls
  pave: hex('#b8b0a0'), // stone steps and plinth
  plinthTop: hex('#cfc6b4'),
  lawn: hex('#7f9a52'),
  terra: hex('#9c624e'),
  bed: hex('#5f7d3a'), // the platform's lawn, terracotta walks, planting
  masonry: OUTER.body, // the Imperial City wall's weathered brick
  balustrade: shade(OUTER.body, 0.92), // the inner edge's dark stone rail and the stair copings
  relief: hex('#e3cf98'), // the arcade's openwork relief panels, washed like the walls
  baluster: hex('#7f8b93'), // the upper balcony's grey-blue balusters (visitor's photo sphere)
  leaf: hex('#5f7f3c'),
  bark: hex('#7d7466'),
  turtleBed: hex('#5b7a37'),
  turtleShellSide: hex('#6f8c3d'),
  turtleShellTop: hex('#b24a5a'),
  umbrellaCanopy: hex('#7a7975'),
  umbrellaPole: hex('#4a4a48'),
  umbrellaTable: hex('#4f4740'),
};

// the pavilion's centre in the bastion's frame (u, v), from the satellite (see the pavilion below)
const PAVILION_CENTER = [-0.6, 10.2];
const PLATFORM_DEPTH = 28.5;
const STAIR_U_OFFSET = 24.4;
const FRANGIPANI_US = [-28, -17, -10.5, 10.5, 17, 28];
const BROADLEAF_TREES: [number, number, number][] = [
  [-15, 2.5, 11], [15.6, 2.2, 9], [21.7, 8.5, 9], [30, 18.5, 10],
];
const VERANDAH_PIER_US = [-6.7, -4.6, -1.5, 1.5, 4.6, 6.7];
const VERANDAH_PIER_VS = [-6.2, -4.1, -1.35, 1.35, 4.1, 6.2];
const DRAGON_SPINE: [number, number][] = [[0, 0], [0.3, 0.35], [0.55, 0.75], [0.5, 1.15], [0.28, 1.4], [0.02, 1.32], [0.08, 1.1]];
const DRAGON_FINS: [number, [number, number]][] = [
  [1, [0.65, 0.42]], [2, [0.92, 0.92]], [3, [0.85, 1.45]], [4, [0.35, 1.78]],
  [5, [-0.22, 1.6]], [0, [-0.3, 0.15]], [6, [0.3, 0.35]], [2, [0.3, 0.9]],
];

function createBastionFrame(S) {
  const midPt = [(BASTION_A[0] + BASTION_B[0]) / 2, (BASTION_A[1] + BASTION_B[1]) / 2];
  const outerLen = Math.hypot(BASTION_B[0] - BASTION_A[0], BASTION_B[1] - BASTION_A[1]);
  const axisX = (BASTION_B[0] - BASTION_A[0]) / outerLen;
  const axisZ = (BASTION_B[1] - BASTION_A[1]) / outerLen;
  const angle = Math.atan2(axisZ, axisX);
  const toWorld = (localU, localV): [number, number] => [
    midPt[0] + localU * axisX - localV * axisZ,
    midPt[1] + localU * axisZ + localV * axisX,
  ];
  const toPoint3 = (localU, y, localV) => {
    const pos = toWorld(localU, localV);
    return [pos[0], y, pos[1]];
  };
  const box = (localU, localV, yMin, yMax, sizeU, sizeV, color, opts?) => {
    const pos = toWorld(localU, localV);
    S.box(pos[0], pos[1], yMin, yMax, sizeU, sizeV, angle, color, opts);
  };
  const toLocal = ([x, z]) => {
    const dx = x - midPt[0];
    const dz = z - midPt[1];
    return [dx * axisX + dz * axisZ, -dx * axisZ + dz * axisX];
  };
  return { outerLen, axisX, axisZ, angle, toWorld, toPoint3, box, toLocal };
}

function buildPlatformAndWalks(S, frame, platformY, halfLen) {
  const { toWorld, box, toLocal } = frame;
  // ---- the Imperial City wall round the bastion's three outer sides: laps its corners at A and B, ends at J0
  // against the face of the north wall coming in from the west (dainoi.js); at J1 the wall stops short of Cửa Hòa
  // Bình's gap, as dainoi.js ends it ----
  wallRun(S, BASTION_J0, BASTION_A, OUTER, [-1, 1]);
  wallRun(S, BASTION_A, BASTION_B, OUTER, [1, 1]);
  wallRun(S, BASTION_B, BASTION_J1, OUTER, [1, 1]);

  // ---- Bắc Khuyết Đài: the platform fill, from the wall's inner faces inward; lawn on top (the satellite shows it
  // mostly grass under trees) ----
  S.kind = KIND.MASONRY;
  const halfWallThick = OUTER.t / 2;
  const locJ0 = toLocal(BASTION_J0 as [number, number]);
  const locJ1 = toLocal(BASTION_J1 as [number, number]);
  const locA = toLocal(BASTION_A as [number, number]);
  const locB = toLocal(BASTION_B as [number, number]);
  // the side walls' inner faces, carried on to the platform's inner edge at v = PLATFORM_DEPTH
  const sideLine = (pt0, pt1, sign) => {
    const du = pt1[0] - pt0[0];
    const dv = pt1[1] - pt0[1];
    const norm = Math.hypot(du, dv);
    const origin = [pt0[0] - sign * dv / norm * halfWallThick, pt0[1] + sign * du / norm * halfWallThick];
    return (localV) => [origin[0] + (localV - origin[1]) * du / dv, localV];
  };
  const westLine = sideLine(locA, locJ0, -1);
  const eastLine = sideLine(locB, locJ1, 1);
  const fillRing = [westLine(halfWallThick), eastLine(halfWallThick), eastLine(PLATFORM_DEPTH), westLine(PLATFORM_DEPTH)].map(([localU, localV]) => toWorld(localU, localV));
  S.prism(fillRing, LAND_Y - 0.2, platformY, COLORS.masonry, COLORS.lawn, { topKind: KIND.GROUND });

  // the inner face's plinth and a stone coping along its edge
  box(0, PLATFORM_DEPTH + 0.05, LAND_Y - 0.2, LAND_Y + 0.5, 2 * halfLen, 0.3, shade(COLORS.masonry, 0.85));
  box(0, PLATFORM_DEPTH - 0.15, platformY - 0.05, platformY + 0.12, 2 * halfLen, 0.5, COLORS.balustrade);

  // terracotta walks (the visitor's photo sphere by the pavilion): round the pavilion outside a planted strip against
  // its plinth, along the inner side from one flight's head to the other, and up to each head
  S.kind = KIND.ROAD;
  const walkY = platformY + 0.03;
  const pavU = PAVILION_CENTER[0];
  const pavV = PAVILION_CENTER[1];
  const ringHalfU = 7.0 + 0.9 + 3.0;
  const ringHalfV = 6.5 + 0.9 + 3.0;
  const ringV0 = Math.max(1.4, pavV - ringHalfV);
  const ringV1 = pavV + ringHalfV;
  box(pavU, (ringV0 + ringV1) / 2, platformY, walkY, 2 * ringHalfU, ringV1 - ringV0, COLORS.terra, { topKind: KIND.ROAD });
  const innerWalkV0 = pavV + 6.5 + 0.9;
  const innerWalkV1 = innerWalkV0 + 3.6;
  box(0, (innerWalkV0 + innerWalkV1) / 2, platformY, walkY, 2 * 25.6, innerWalkV1 - innerWalkV0, COLORS.terra, { topKind: KIND.ROAD });
  for (const side of [-1, 1]) {
    box(side * STAIR_U_OFFSET, (innerWalkV1 + PLATFORM_DEPTH - 0.4) / 2, platformY, walkY, 2.6, PLATFORM_DEPTH - 0.4 - innerWalkV1, COLORS.terra, { topKind: KIND.ROAD });
  }
  // the planted strip against the plinth, open at the steps in the middle of each face
  S.kind = KIND.PLAIN;
  for (const [dirU, dirV] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const halfSpan = dirU ? 6.5 + 0.9 : 7.0 + 0.9;
    const stripOff = (dirU ? 7.0 : 6.5) + 0.45;
    for (const side of [-1, 1]) {
      const center = side * (1.35 + halfSpan) / 2;
      const segLen = halfSpan - 1.35;
      box(pavU + (dirU ? dirU * stripOff : center), pavV + (dirV ? dirV * stripOff : center), platformY + 0.03, platformY + 0.2, dirU ? 0.9 : segLen, dirU ? segLen : 0.9, COLORS.bed, { top: shade(COLORS.bed, 1.08) });
    }
  }
}

function buildParapetsAndRails(S, frame, platformY, halfLen) {
  const { toWorld } = frame;
  // ---- the parapet on the wall cap round the three outer sides: solid weathered brick in the wall's own colours,
  // with a coping and low piers (both car panoramas and the photo sphere show no balustrade and no ochre) ----
  const buildParapet = (ptA, ptB, yBase, lapA, lapB) => {
    const segLen = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
    if (segLen < 0.5) return;
    const segAngle = Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]);
    const dirX = (ptB[0] - ptA[0]) / segLen;
    const dirZ = (ptB[1] - ptA[1]) / segLen;
    const thick = 0.62;
    const ext0 = lapA ? thick / 2 : 0;
    const ext1 = lapB ? thick / 2 : 0;
    const fullLen = segLen + ext0 + ext1;
    const midX = ptA[0] + dirX * (fullLen / 2 - ext0);
    const midZ = ptA[1] + dirZ * (fullLen / 2 - ext0);
    S.kind = KIND.MASONRY;
    S.box(midX, midZ, yBase, yBase + 0.95, fullLen, thick, segAngle, shade(COLORS.masonry, 0.96), { top: OUTER.cap });
    S.box(midX, midZ, yBase + 0.95, yBase + 1.07, fullLen + 0.04, thick + 0.1, segAngle, OUTER.cap);
    const pierCount = Math.max(1, Math.round(segLen / 4.2));
    for (let i = 0; i <= pierCount; i++) {
      const x = ptA[0] + dirX * segLen * i / pierCount;
      const z = ptA[1] + dirZ * segLen * i / pierCount;
      S.box(x, z, yBase, yBase + 1.2, 0.72, 0.72, segAngle, shade(COLORS.masonry, 0.88), { top: OUTER.cap });
    }
  };
  const capY = LAND_Y + OUTER.h + OUTER.capH;
  const capEnd = OUTER.capW / 2;
  const j0Len = Math.hypot(BASTION_A[0] - BASTION_J0[0], BASTION_A[1] - BASTION_J0[1]);
  const j0Inner = [BASTION_J0[0] + (BASTION_A[0] - BASTION_J0[0]) * capEnd / j0Len, BASTION_J0[1] + (BASTION_A[1] - BASTION_J0[1]) * capEnd / j0Len]; // the cap's end at J0
  buildParapet(j0Inner, BASTION_A, capY, false, true);
  buildParapet(BASTION_A, BASTION_B, capY, true, true);
  buildParapet(BASTION_B, BASTION_J1, capY, true, false);

  // ---- the inner edge: a low dark stone rail (posts and a solid infill), open at the head of each flight ----
  const buildRail = (ptA, ptB, yBase) => {
    const segLen = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
    if (segLen < 0.5) return;
    const postCount = Math.max(1, Math.round(segLen / 2.4));
    const segAngle = Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]);
    S.kind = KIND.MASONRY;
    for (let i = 0; i <= postCount; i++) {
      const x = ptA[0] + (ptB[0] - ptA[0]) * i / postCount;
      const z = ptA[1] + (ptB[1] - ptA[1]) * i / postCount;
      S.box(x, z, yBase, yBase + 0.92, 0.32, 0.32, segAngle, COLORS.balustrade, { top: shade(COLORS.balustrade, 1.1) });
    }
    const midX = (ptA[0] + ptB[0]) / 2;
    const midZ = (ptA[1] + ptB[1]) / 2;
    S.box(midX, midZ, yBase, yBase + 0.66, segLen, 0.16, segAngle, shade(COLORS.masonry, 0.85));
    S.box(midX, midZ, yBase + 0.66, yBase + 0.8, segLen, 0.24, segAngle, COLORS.balustrade);
  };
  buildRail(toWorld(-halfLen, PLATFORM_DEPTH - 0.2), toWorld(-STAIR_U_OFFSET - 1.6, PLATFORM_DEPTH - 0.2), platformY);
  buildRail(toWorld(-STAIR_U_OFFSET + 0.6, PLATFORM_DEPTH - 0.2), toWorld(STAIR_U_OFFSET - 0.6, PLATFORM_DEPTH - 0.2), platformY);
  buildRail(toWorld(STAIR_U_OFFSET + 1.6, PLATFORM_DEPTH - 0.2), toWorld(halfLen, PLATFORM_DEPTH - 0.2), platformY);
}

function buildInnerStairs(S, frame, platformY) {
  const { toPoint3, box } = frame;
  // ---- the two flights up from inside the Imperial City, against the inner face, climbing toward the middle ----
  const stepCount = 22;
  const stepH = (platformY - LAND_Y) / stepCount;
  const tread = 0.3;
  const stairW = 2.2;
  for (const side of [-1, 1]) {
    S.kind = KIND.MASONRY;
    for (let k = 0; k < stepCount; k++) {
      const stepU = side * (STAIR_U_OFFSET + 1.0 + (stepCount - 1 - k) * tread);
      box(stepU, PLATFORM_DEPTH + stairW / 2, LAND_Y - 0.2, LAND_Y + stepH * (k + 1), tread + 0.02, stairW, shade(COLORS.pave, 0.96 + 0.04 * (k % 2)), { topKind: KIND.ROAD });
    }
    // top landing, then a cheek wall with a sloping coping on the open side
    box(side * (STAIR_U_OFFSET - 0.2), PLATFORM_DEPTH + stairW / 2, LAND_Y - 0.2, platformY, 2.4, stairW, shade(COLORS.pave, 0.98), { topKind: KIND.ROAD });
    const footU = side * (STAIR_U_OFFSET + 1.0 + stepCount * tread + 0.2);
    const headU = side * (STAIR_U_OFFSET - 1.4);
    box((footU + headU) / 2, PLATFORM_DEPTH + stairW + 0.15, LAND_Y - 0.2, LAND_Y + 0.5, Math.abs(footU - headU), 0.3, shade(COLORS.masonry, 0.9));
    S.beam(toPoint3(footU, LAND_Y + 0.7, PLATFORM_DEPTH + stairW + 0.15), toPoint3(side * (STAIR_U_OFFSET + 1.0), platformY + 0.75, PLATFORM_DEPTH + stairW + 0.15), 0.3, 0.3, COLORS.balustrade);
    S.beam(toPoint3(side * (STAIR_U_OFFSET + 1.0), platformY + 0.75, PLATFORM_DEPTH + stairW + 0.15), toPoint3(headU, platformY + 0.75, PLATFORM_DEPTH + stairW + 0.15), 0.3, 0.3, COLORS.balustrade);
    // the cheek wall's fill below the coping
    for (let k = 0; k < 6; k++) {
      const frac0 = k / 6;
      const frac1 = (k + 1) / 6;
      const segU0 = footU + (side * (STAIR_U_OFFSET + 1.0) - footU) * frac0;
      const segU1 = footU + (side * (STAIR_U_OFFSET + 1.0) - footU) * frac1;
      box((segU0 + segU1) / 2, PLATFORM_DEPTH + stairW + 0.15, LAND_Y + 0.4, LAND_Y + 0.6 + (platformY - LAND_Y) * (frac0 + frac1) / 2, Math.abs(segU1 - segU0), 0.22, shade(COLORS.masonry, 0.95));
    }
    box((side * (STAIR_U_OFFSET + 1.0) + headU) / 2, PLATFORM_DEPTH + stairW + 0.15, LAND_Y + 0.4, platformY + 0.6, Math.abs(side * (STAIR_U_OFFSET + 1.0) - headU), 0.22, shade(COLORS.masonry, 0.95));
  }
}

function buildTurtleBedsAndTrees(data, S, frame, platformY, halfLen) {
  const { toWorld, toPoint3, toLocal } = frame;
  // ---- turtle-shaped flower beds east and west of the pavilion ----
  const ellipseRing = (centerU, centerV, radU, radV, segCount = 14) => {
    const ring = [];
    for (let i = 0; i < segCount; i++) {
      const theta = (i / segCount) * Math.PI * 2;
      ring.push(toWorld(centerU + Math.cos(theta) * radU, centerV + Math.sin(theta) * radV));
    }
    return ring;
  };
  for (const side of [-1, 1]) {
    const bedU = side * 20.5;
    const bedV = 12;
    S.kind = KIND.MASONRY;
    S.prism(ellipseRing(bedU, bedV, 4.6, 3.4), platformY, platformY + 0.28, shade(COLORS.pave, 0.85), COLORS.turtleBed);
    S.prism(ellipseRing(bedU + side * 5.2, bedV, 1.1, 0.9, 8), platformY, platformY + 0.28, shade(COLORS.pave, 0.85), COLORS.turtleBed); // head, facing out
    for (const [legU, legV] of [[2.8, 3.1], [-2.8, 3.1], [2.8, -3.1], [-2.8, -3.1]]) {
      S.prism(ellipseRing(bedU + legU, bedV + legV, 0.9, 0.7, 6), platformY, platformY + 0.25, shade(COLORS.pave, 0.85), COLORS.turtleBed);
    }
    S.kind = KIND.PLAIN;
    S.prism(ellipseRing(bedU, bedV, 2.6, 1.9, 10), platformY + 0.28, platformY + 0.62, COLORS.turtleShellSide, COLORS.turtleShellTop); // the shell planted in flowers
  }

  // ---- frangipani along the inner edge: squat forked trunks, flat sparse crowns ----
  for (const treeU of FRANGIPANI_US) {
    const treeV = PLATFORM_DEPTH - 2.2;
    const trunkPos = toWorld(treeU, treeV);
    S.kind = KIND.PLAIN;
    S.cyl(trunkPos[0], trunkPos[1], platformY, platformY + 1.4, 0.2, 0.16, 5, COLORS.bark, { cap: false });
    for (const [branchU, branchV] of [[0.9, 0.3], [-0.8, 0.5], [0.1, -0.9]]) {
      S.beam(toPoint3(treeU, platformY + 1.3, treeV), toPoint3(treeU + branchU, platformY + 2.4, treeV + branchV), 0.14, 0.14, COLORS.bark);
      const crownPos = toWorld(treeU + branchU * 1.2, treeV + branchV * 1.2);
      S.cyl(crownPos[0], crownPos[1], platformY + 2.2, platformY + 2.9, 1.1, 0.7, 6, COLORS.leaf);
    }
  }

  // ---- broadleaf trees on the platform: real instanced foliage lifted onto Bắc Khuyết Đài via S.stand ----
  if (Array.isArray(data?.trees)) {
    for (const [treeU, treeV, scale] of BROADLEAF_TREES) {
      const pos = toWorld(treeU, treeV);
      data.trees.push(Math.round(pos[0] * 10), Math.round(pos[1] * 10), scale, 4);
    }
  }
  (S.stand = S.stand || []).push((x, z) => {
    const [localU, localV] = toLocal([x, z]);
    return Math.abs(localU) <= halfLen && localV >= 0 && localV <= PLATFORM_DEPTH ? OUTER.h : 0;
  });
}

// an openwork dragon (the panoramas show dark, many-spined silhouettes at the ridge and all eight corners), drawn
// in the vertical plane through basePt along the plan direction dir (pavilion frame): the body leans out along dir
// and the head curls back over it; scale scales it (scale 1 ≈ 1.8 m tall)
function buildDragonOrnament(S, frame, basePt, dir, scale) {
  const { axisX, axisZ } = frame;
  const dirX = dir[0] * axisX - dir[1] * axisZ;
  const dirZ = dir[0] * axisZ + dir[1] * axisX;
  const pointAt = ([along, height]): [number, number, number] => [
    basePt[0] + dirX * along * scale,
    basePt[1] + height * scale,
    basePt[2] + dirZ * along * scale,
  ];
  const keepKind = S.kind;
  S.kind = KIND.PLAIN;
  for (let i = 1; i < DRAGON_SPINE.length; i++) {
    S.beam(pointAt(DRAGON_SPINE[i - 1]), pointAt(DRAGON_SPINE[i]), (i < 4 ? 0.34 : 0.24) * scale, (i < 4 ? 0.3 : 0.22) * scale, COLORS.ornament);
  }
  for (const [idx, tip] of DRAGON_FINS) {
    S.beam(pointAt(DRAGON_SPINE[idx]), pointAt(tip), 0.16 * scale, 0.17 * scale, COLORS.ornament);
  }
  // the body's openwork filled in as a solid fan, faced both ways, so the silhouette reads full from afar
  const hubPt = pointAt([0.32, 0.92]);
  const frontNormal = [-dirZ, 0, dirX];
  const backNormal = [dirZ, 0, -dirX];
  for (let i = 1; i < DRAGON_SPINE.length - 1; i++) {
    const pt0 = pointAt(DRAGON_SPINE[i]);
    const pt1 = pointAt(DRAGON_SPINE[i + 1]);
    S.tri(hubPt, pt0, pt1, COLORS.ornament, frontNormal);
    S.tri(hubPt, pt1, pt0, COLORS.ornament, backNormal);
  }
  S.kind = keepKind;
}

function buildPavilionOpenings(pavBox, halfU, halfV, baseY, doorH, winH) {
  // door in the middle, a louvred window either side
  for (const [dirU, dirV] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const faceHalf = dirU ? halfV : halfU;
    const faceOff = (dirU ? halfU : halfV) + 0.03;
    for (const frac of [-0.55, 0, 0.55]) {
      const isDoor = frac === 0;
      const openingW = isDoor ? 1.3 : 1.0;
      const topY = isDoor ? baseY + doorH : baseY + winH + 0.9;
      const botY = isDoor ? baseY : baseY + 0.9;
      const posAlong = frac * faceHalf;
      pavBox(dirU ? dirU * faceOff : posAlong, dirV ? dirV * faceOff : posAlong, botY - 0.08, topY + 0.22, dirU ? 0.06 : openingW + 0.3, dirU ? openingW + 0.3 : 0.06, COLORS.pier);
      pavBox(dirU ? dirU * (faceOff + 0.03) : posAlong, dirV ? dirV * (faceOff + 0.03) : posAlong, botY, topY, dirU ? 0.06 : openingW, dirU ? openingW : 0.06, COLORS.joinery);
    }
  }
}

function buildVerandahArcade(S, pavBox, halfU, halfV, floorY, lowerEaveY, woodColor) {
  // verandah arcade, after the photos: pale yellow piers with cream bases and capitals; at each end of a face a narrow
  // round-arched bay over an ochre relief panel, then wide flat-headed bays with a white baluster rail; the middle bay
  // open to the steps. A frieze over the piers and a dark timber ceiling.
  const pierW = 0.55;
  const friezeY = lowerEaveY - 0.75; // underside of the frieze
  const faces: [boolean, number, number[]][] = []; // [alongU, fixedCoord, pierPositions]
  for (const side of [-1, 1]) {
    faces.push([true, side * (halfV - 0.3), VERANDAH_PIER_US]);
    faces.push([false, side * (halfU - 0.3), VERANDAH_PIER_VS]);
  }
  const placeBox = (alongU, posAlong, fixedCoord, y0, y1, sizeAlong, sizeAcross, color) => (
    alongU ? pavBox(posAlong, fixedCoord, y0, y1, sizeAlong, sizeAcross, color) : pavBox(fixedCoord, posAlong, y0, y1, sizeAcross, sizeAlong, color)
  );
  S.kind = KIND.PLAIN;
  for (const [alongU, fixedCoord, pierPositions] of faces) {
    for (const pos of pierPositions) {
      placeBox(alongU, pos, fixedCoord, floorY, friezeY, pierW, pierW, COLORS.wall);
      placeBox(alongU, pos, fixedCoord, floorY, floorY + 0.35, pierW + 0.14, pierW + 0.14, COLORS.pier);
      placeBox(alongU, pos, fixedCoord, friezeY - 0.28, friezeY, pierW + 0.12, pierW + 0.12, COLORS.pier);
    }
    placeBox(alongU, 0, fixedCoord, friezeY, lowerEaveY - 0.1, 2 * Math.abs(pierPositions[0]) + pierW, pierW, COLORS.wall); // frieze
    placeBox(alongU, 0, fixedCoord, friezeY, friezeY + 0.12, 2 * Math.abs(pierPositions[0]) + pierW + 0.1, pierW + 0.08, COLORS.pier);
    placeBox(alongU, 0, fixedCoord, lowerEaveY - 0.28, lowerEaveY - 0.12, 2 * Math.abs(pierPositions[0]) + pierW + 0.1, pierW + 0.08, COLORS.pier);
    for (let i = 0; i < pierPositions.length - 1; i++) {
      const startPos = pierPositions[i];
      const endPos = pierPositions[i + 1];
      const span = endPos - startPos - pierW;
      const midPos = (startPos + endPos) / 2;
      if (i === 0 || i === pierPositions.length - 2) {
        // the narrow end bay: a round arch (stepped haunches) over a relief panel
        const radius = span / 2;
        const springY = friezeY - 0.28 - radius;
        for (const side of [-1, 1]) {
          for (let k = 0; k < 3; k++) {
            const sliceW = radius / 3;
            const dist = radius - sliceW * (k + 0.5);
            const archBotY = springY + Math.sqrt(Math.max(0, radius * radius - dist * dist));
            if (friezeY - 0.28 - archBotY > 0.04) placeBox(alongU, midPos + side * dist, fixedCoord, archBotY, friezeY - 0.28, sliceW, pierW - 0.1, COLORS.pier);
          }
        }
        placeBox(alongU, midPos, fixedCoord, floorY, floorY + 0.8, span, 0.2, COLORS.relief);
        placeBox(alongU, midPos, fixedCoord, floorY + 0.8, floorY + 0.9, span, 0.28, COLORS.pier);
      } else if (i !== 2) {
        // a wide bay: white balusters under a coping
        const balusterCount = Math.round(span / 0.3);
        for (let k = 0; k < balusterCount; k++) {
          placeBox(alongU, startPos + pierW / 2 + span * (k + 0.5) / balusterCount, fixedCoord, floorY, floorY + 0.75, 0.12, 0.12, COLORS.pier);
        }
        placeBox(alongU, midPos, fixedCoord, floorY + 0.75, floorY + 0.88, span, 0.26, COLORS.pier);
      }
    }
  }
  pavBox(0, 0, lowerEaveY - 0.14, lowerEaveY - 0.08, 2 * halfU - 0.4, 2 * halfV - 0.4, woodColor, { bottom: true }); // verandah ceiling
}

function buildPavilion(S, frame, platformY) {
  // ---- the pavilion ----
  // OSM way 172802373 centres it at u 0.9, v 14.3, but on the satellite its lower eaves are centred near u 0.9, v 9.5
  // while the bastion's own outline (way 531016856), the Hòa Bình gate and the side walls all sit on the imagery: the
  // pavilion outline alone is drawn ~4.5 m inward. The two car panoramas on Đặng Thái Thân put it 1.5–2.5 m further
  // toward -u than the satellite does, which is the satellite's northward lean on a roof 7–14 m up; PAVILION_CENTER splits that.
  // It is re-framed here, keeping its plan and axis (the bastion's).
  const centerU = PAVILION_CENTER[0];
  const centerV = PAVILION_CENTER[1];
  const pavWorld = (localU, localV) => frame.toWorld(centerU + localU, centerV + localV);
  const pavPoint3 = (localU, y, localV) => frame.toPoint3(centerU + localU, y, centerV + localV);
  const pavBox = (localU, localV, y0, y1, sizeU, sizeV, color, opts?) => frame.box(centerU + localU, centerV + localV, y0, y1, sizeU, sizeV, color, opts);

  const halfU = 7.0;
  const halfV = 6.5; // half plan: 14 × 13 m
  // heights read off the Street View panoramas on Đặng Thái Thân (docs/places/tuphuong.md)
  const floorY = platformY + 0.45; // ground floor on a low plinth
  const lowerEaveY = platformY + 3.5; // lower eave edge
  const deckY = platformY + 5.3; // balcony deck, where the skirt roof ends
  const upperEaveY = platformY + 7.15; // upper eave edge
  const upperRoofH = 3.1; // upper roof rise: ridge 10.25 m over the platform
  const woodColor = shade(COLORS.joinery, 1.15);

  // plinth with three steps at the middle of each face
  S.kind = KIND.MASONRY;
  pavBox(0, 0, platformY - 0.05, floorY, 2 * halfU, 2 * halfV, shade(COLORS.pave, 0.92), { top: COLORS.plinthTop, topKind: KIND.ROAD });
  for (const [dirU, dirV] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    for (let k = 1; k <= 3; k++) {
      const stepOff = (dirU ? halfU : halfV) + 0.3 * k - 0.15;
      const stepW = 2.4;
      pavBox(dirU * stepOff, dirV * stepOff, platformY - 0.05, floorY - 0.15 * k, dirU ? 0.3 : stepW, dirU ? stepW : 0.3, shade(COLORS.pave, 0.95), { topKind: KIND.ROAD });
    }
  }

  // closed core: walls, a door and two windows on each face
  const coreHalfU = 4.9;
  const coreHalfV = 4.4;
  S.kind = KIND.PLAIN;
  pavBox(0, 0, floorY, deckY - 0.2, 2 * coreHalfU, 2 * coreHalfV, COLORS.wall, { top: shade(COLORS.wall, 0.8) });
  buildPavilionOpenings(pavBox, coreHalfU, coreHalfV, floorY, 2.5, 1.5);
  buildVerandahArcade(S, pavBox, halfU, halfV, floorY, lowerEaveY, woodColor);

  // skirt roof over the verandah: from the lower eave up to the balcony's edge (four trapezoids, hipped corners)
  const balcHalfU = 5.2;
  const balcHalfV = 4.7;
  const skirtOver = 0.55;
  const eaveHalfU = halfU + skirtOver;
  const eaveHalfV = halfV + skirtOver;
  const skirtLowY = lowerEaveY + 0.1;
  const lowCorners = [[-eaveHalfU, -eaveHalfV], [eaveHalfU, -eaveHalfV], [eaveHalfU, eaveHalfV], [-eaveHalfU, eaveHalfV]];
  const highCorners = [[-balcHalfU, -balcHalfV], [balcHalfU, -balcHalfV], [balcHalfU, balcHalfV], [-balcHalfU, balcHalfV]];
  S.kind = KIND.TILE;
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    const midU = (lowCorners[i][0] + lowCorners[j][0]) / 2;
    const midV = (lowCorners[i][1] + lowCorners[j][1]) / 2;
    const midWorld = pavWorld(midU, midV);
    const centerWorld = pavWorld(0, 0);
    const corner3 = (pt, y) => pavPoint3(pt[0], y, pt[1]);
    S.quad(corner3(lowCorners[i], skirtLowY), corner3(lowCorners[j], skirtLowY), corner3(highCorners[j], deckY - 0.2), corner3(highCorners[i], deckY - 0.2), COLORS.roof, [midWorld[0] - centerWorld[0], 1.6, midWorld[1] - centerWorld[1]]);
    S.kind = KIND.PLAIN;
    S.beam(corner3(lowCorners[i], skirtLowY - 0.05), corner3(lowCorners[j], skirtLowY - 0.05), 0.18, 0.22, shade(COLORS.roof, 0.6)); // fascia
    S.beam(corner3(lowCorners[i], skirtLowY + 0.1), corner3(highCorners[i], deckY - 0.1), 0.22, 0.2, COLORS.ridge); // hip ridge
    S.kind = KIND.TILE;
  }
  // openwork dragon ornaments at the four lower corners, rising off the hip ends
  for (const [signU, signV] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    buildDragonOrnament(S, frame, pavPoint3(signU * eaveHalfU, skirtLowY + 0.1, signV * eaveHalfV), [signU * Math.SQRT1_2, signV * Math.SQRT1_2], 0.85);
  }

  // upper floor: a gallery of four light pillars a face at the balcony's edge with a grey-blue baluster rail between them, round a
  // recessed wall with a door and two windows a side
  S.kind = KIND.PLAIN;
  pavBox(0, 0, deckY - 0.22, deckY, 2 * balcHalfU, 2 * balcHalfV, shade(COLORS.pier, 0.85), { bottom: true });
  const galHalfU = balcHalfU - 0.2;
  const galHalfV = balcHalfV - 0.2; // the pillar line
  const galCorners = [[-galHalfU, -galHalfV], [galHalfU, -galHalfV], [galHalfU, galHalfV], [-galHalfU, galHalfV]];
  for (let i = 0; i < 4; i++) {
    const cornerA = galCorners[i];
    const cornerB = galCorners[(i + 1) % 4];
    const sideLen = Math.hypot(cornerB[0] - cornerA[0], cornerB[1] - cornerA[1]);
    for (let bayIdx = 0; bayIdx < 3; bayIdx++) { // three bays a face, a rail of grey-blue balusters in each
      const frac0 = bayIdx / 3;
      const frac1 = (bayIdx + 1) / 3;
      const balusterCount = Math.round(sideLen / 3 / 0.4);
      for (let k = 1; k < balusterCount; k++) {
        const frac = frac0 + (frac1 - frac0) * k / balusterCount;
        pavBox(cornerA[0] + (cornerB[0] - cornerA[0]) * frac, cornerA[1] + (cornerB[1] - cornerA[1]) * frac, deckY, deckY + 0.9, 0.09, 0.09, COLORS.baluster);
      }
    }
    S.beam(pavPoint3(cornerA[0], deckY + 0.95, cornerA[1]), pavPoint3(cornerB[0], deckY + 0.95, cornerB[1]), 0.14, 0.12, shade(COLORS.baluster, 0.85));
    S.beam(pavPoint3(cornerA[0], deckY + 0.08, cornerA[1]), pavPoint3(cornerB[0], deckY + 0.08, cornerB[1]), 0.12, 0.12, shade(COLORS.baluster, 0.85));
    for (const frac of [0, 1 / 3, 2 / 3]) { // pillars: the corner one and the two between
      const pillarU = cornerA[0] + (cornerB[0] - cornerA[0]) * frac;
      const pillarV = cornerA[1] + (cornerB[1] - cornerA[1]) * frac;
      pavBox(pillarU, pillarV, deckY, upperEaveY + 0.4, 0.4, 0.4, COLORS.wall);
      pavBox(pillarU, pillarV, deckY, deckY + 0.25, 0.5, 0.5, COLORS.pier);
      pavBox(pillarU, pillarV, upperEaveY + 0.15, upperEaveY + 0.4, 0.5, 0.5, COLORS.pier);
    }
  }
  // the lintel round the pillar heads and the gallery's timber ceiling
  for (const side of [-1, 1]) {
    pavBox(0, side * galHalfV, upperEaveY + 0.4, upperEaveY + 0.65, 2 * galHalfU + 0.4, 0.4, COLORS.pier);
    pavBox(side * galHalfU, 0, upperEaveY + 0.4, upperEaveY + 0.65, 0.4, 2 * galHalfV - 0.4, COLORS.pier);
  }
  pavBox(0, 0, upperEaveY + 0.6, upperEaveY + 0.66, 2 * galHalfU, 2 * galHalfV, woodColor, { bottom: true });

  const upperWallHalfU = 3.9;
  const upperWallHalfV = 3.4;
  S.kind = KIND.PLAIN;
  pavBox(0, 0, deckY, upperEaveY + 0.62, 2 * upperWallHalfU, 2 * upperWallHalfV, COLORS.upperWall, { top: shade(COLORS.roof, 0.6) });
  buildPavilionOpenings(pavBox, upperWallHalfU, upperWallHalfV, deckY, 2.2, 1.2);

  // upper roof: steep, hipped, matte weathered tile, flared, with openwork dragons at the corners
  S.kind = KIND.TILE;
  const roofCenter = pavWorld(0, 0);
  S.hip(roofCenter[0], roofCenter[1], 2 * balcHalfU, 2 * balcHalfV, frame.angle, upperEaveY, upperRoofH, COLORS.roof, {
    flare: 0.5, over: 0.9, hips: true, glazed: false, segs: 3, fascia: 0.24, fasciaCol: shade(COLORS.roof, 0.6), ridgeCol: COLORS.ridge,
  });
  const upperOverU = balcHalfU + 0.9;
  const upperOverV = balcHalfV + 0.9;
  for (const [signU, signV] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    buildDragonOrnament(S, frame, pavPoint3(signU * (upperOverU - 0.3), upperEaveY + 0.55, signV * (upperOverV - 0.3)), [signU * Math.SQRT1_2, signV * Math.SQRT1_2], 1.15);
  }
  // ridge ornament: a disc with a flame tip in the middle between two dragons facing it, all dark like the roof
  const ridgeY = upperEaveY + upperRoofH + 0.15;
  const discRadius = 0.5;
  const discSegs = 12;
  const discCenter = pavPoint3(0, ridgeY + discRadius + 0.1, 0);
  S.kind = KIND.PLAIN;
  for (const side of [-1, 1]) {
    for (let k = 0; k < discSegs; k++) {
      const ang0 = (k / discSegs) * Math.PI * 2;
      const ang1 = ((k + 1) / discSegs) * Math.PI * 2;
      const ptA = pavPoint3(Math.cos(ang0) * discRadius, ridgeY + discRadius + 0.1 + Math.sin(ang0) * discRadius, side * 0.08);
      const ptB = pavPoint3(Math.cos(ang1) * discRadius, ridgeY + discRadius + 0.1 + Math.sin(ang1) * discRadius, side * 0.08);
      const normWorld = pavWorld(0, side);
      const centerWorld = pavWorld(0, 0);
      S.tri([discCenter[0] + (normWorld[0] - centerWorld[0]) * 0.08, discCenter[1], discCenter[2] + (normWorld[1] - centerWorld[1]) * 0.08], ptA, ptB, COLORS.ornament, [normWorld[0] - centerWorld[0], 0, normWorld[1] - centerWorld[1]]);
    }
  }
  S.beam(pavPoint3(0, ridgeY + 2 * discRadius, 0), pavPoint3(0, ridgeY + 2 * discRadius + 0.55, 0), 0.16, 0.16, COLORS.ornament); // the flame tip
  pavBox(0, 0, ridgeY - 0.2, ridgeY + 0.12, 0.5, 0.36, COLORS.ornament);
  for (const side of [-1, 1]) buildDragonOrnament(S, frame, pavPoint3(side * 1.5, ridgeY - 0.25, 0), [side, 0], 1.25);
}

function buildCafeParasols(S, frame, platformY) {
  // café parasols, grey, tall market umbrellas whose canopies show over the parapet: a row of six between the pavilion and the outer parapet (seen over it from Đặng Thái
  // Thân) and a row along the inner edge east of the pavilion (the satellite)
  S.kind = KIND.PLAIN;
  const parasolCoords = [
    ...[-10, -6.2, -2.2, 2.2, 6.2, 10].map((offsetU) => [offsetU + PAVILION_CENTER[0], 2.4]),
    ...[-1, 2.8, 6.6, 13.75, 20.8].map((localU) => [localU, 24.4]),
  ];
  for (const [localU, localV] of parasolCoords) {
    const pos = frame.toWorld(localU, localV);
    S.cyl(pos[0], pos[1], platformY, platformY + 2.6, 0.05, 0.05, 5, COLORS.umbrellaPole, { cap: false });
    S.cyl(pos[0], pos[1], platformY + 2.6, platformY + 3.05, 1.6, 0.1, 10, COLORS.umbrellaCanopy, { rot: localU });
    S.cyl(pos[0], pos[1], platformY + 0.7, platformY + 0.74, 0.5, 0.5, 8, COLORS.umbrellaTable);
  }
}

export function build({ data, S }) {
  const frame = createBastionFrame(S);
  const keepKind = S.kind;
  const platformY = LAND_Y + OUTER.h; // platform floor, level with the top of the wall body (under its 0.42 m cap)
  const halfLen = frame.outerLen / 2 - 0.6; // half length inside the side walls

  buildPlatformAndWalks(S, frame, platformY, halfLen);
  buildParapetsAndRails(S, frame, platformY, halfLen);
  buildInnerStairs(S, frame, platformY);
  buildTurtleBedsAndTrees(data, S, frame, platformY, halfLen);
  buildPavilion(S, frame, platformY);
  buildCafeParasols(S, frame, platformY);

  S.kind = keepKind;
  return null;
}

// a broad-leaved tree: a trunk and a few overlapping crowns (as in tudam.js)
function tree(S, x, z, baseY, height, radius, lumpCount, colors) {
  S.kind = KIND.PLAIN;
  S.cyl(x, z, baseY, baseY + height * 0.45, radius * 0.09, radius * 0.07, 6, COLORS.bark, { cap: false });
  const seed = Math.abs(Math.sin(x * 12.9898 + z * 78.233)) * 43758.5;
  for (let k = 0; k < lumpCount; k++) {
    const angle = (seed + k * 2.39996) % 6.283;
    const dist = k === 0 ? 0 : radius * 0.45;
    const lumpX = x + Math.cos(angle) * dist;
    const lumpZ = z + Math.sin(angle) * dist;
    const lumpR = radius * (k === 0 ? 0.8 : 0.6);
    const botY = baseY + height * (k === 0 ? 0.42 : 0.36);
    const topY = baseY + height * (k === 0 ? 1 : 0.85);
    const midY = botY + (topY - botY) * 0.45;
    const col = colors[k % colors.length];
    S.cyl(lumpX, lumpZ, botY, midY, lumpR * 0.55, lumpR, 8, shade(col, 0.85), { cap: false, rot: angle });
    S.cyl(lumpX, lumpZ, midY, topY, lumpR, lumpR * 0.25, 8, col, { rot: angle });
  }
}
