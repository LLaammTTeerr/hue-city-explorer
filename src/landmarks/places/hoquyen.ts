import { KIND, hex, shade, mix } from '../../geo/buf.ts';
import { LAND_Y } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';

// ---- Hổ Quyền, the royal arena for elephant-and-tiger fights at Trường Đá, Thủy Biều (1830) ----
//
// Sources (docs/places/hoquyen.md has the full list):
//  - vi.wikipedia.org/wiki/Hổ_Quyền and e.vnexpress.net (roman-style gladiator arena under restoration, 4423067): an
//    open ring arena ("vành khăn") built 1830 (Minh Mạng 11); inner wall 5.8-5.9 m high, outer wall 4.75 m, both
//    about 4.5 m thick; outer circumference 140-145 m, the "basin" 44 m across; the outer wall leans 10-15°
//    (vtcnews.vn, vietnamnet.vn); the king's stand on the north side, raised above the rest, looking across at five
//    tiger cages built into the opposite wall; a 24-step stair to the left of the stand for the king and court, a
//    second for mandarins and soldiers on the right; an outer gate through which the elephants came in; a round lawn
//    inside; tiger-face drain spouts in the outer wall; restored by the Huế Monuments Conservation Centre from late
//    2019 to early 2022 (walls, stairs, cage pulleys).
//  - Wikimedia Commons, Category:Hổ_Quyền: weathered grey-brown brick, a moulded cornice and a pierced checkerboard
//    parapet on the outer wall, the plain taller inner wall showing behind it; each cage a roofless brick pit open to
//    the wall top. The restoration renders the cornice, parapet, coping, pillars and stair cheeks in grey lime.
//  - Google satellite and car Street View from the north yard (2026, visual reference only; docs/places/hoquyen.md):
//    the stand is a block about 9 m wide on a bearing of about -10.5°, its face 24.4 m from the centre, its top a
//    grey lime chequer-lattice parapet with lotus-capped posts rising above the ring's own parapet, a small framed
//    plaque on its north face under the cornice. The east (left) flight climbs south along the stand's east flank,
//    lime cheeks on both sides and capped posts at its foot; the west (right) flight runs tangentially along the
//    ring wall from about -35° down to -52°, one sloping lime cheek over a solid brick side; between the stand and
//    the head of the west flight, at about -29.5°, a doorway in the ring wall between two grey lime pillars.
//  - OpenStreetMap relation 19381147 (building=historic): outer ring R 21.2 m, inner ring R 16.5 m about the same
//    centre; footways along the north side.
// No roof over the king's stand is reported or seen in any photo, so it is drawn as the raised open platform it is.
// Estimated: the exact radii (44 m outer diameter from the sources, 4.5 m thick), the split of the wall top into a
// lower outer ledge and the higher inner wall walk, the stand's floor level, the gate's inner passage, the cage door
// sizes, the paving round the foot.

const ARENA_CENTER = [-3661.4, 2250.1]; // ring centre (OSM fit)
const OUTER_RADIUS = 22.0;
const INNER_RADIUS = 17.5; // outer foot, inner face of the inner wall
const RING_SEGS = 72;
const TAU = Math.PI * 2;
const STAND_BEARING = -0.183; // bearing of the king's stand (radians, 0 = north, clockwise): satellite -10.5°, Street View -10.4°
const STAND_FACE_DIST = 24.4;
const STAND_HALF_WIDTH = 4.2; // the stand's outer face (distance along its axis from the centre) and half width
const GATE_BEARING = -0.515; // the pillared doorway in the ring wall west of the stand (-29.5°)
const WEST_FLIGHT_HEAD = -0.6;
const WEST_FLIGHT_LAND = 0.035;
const WEST_FLIGHT_STEP = 0.0116; // the west flight: head bearing, landing and step (radians)
const EAST_FLIGHT_HEAD_DIST = 20.2;
const TIGER_CAGES: [number, number, number][] = [
  [-0.6, 1.3, 1.9], [-0.3, 0.9, 1.3], [0, 0.9, 1.3], [0.3, 0.9, 1.3], [0.6, 1.1, 1.6],
]; // offset from due south (rad), door w, h

// weathered brick: grey-brown, stained ochre where lime has washed over it and black where water runs
const COLORS = {
  brick: hex('#575550'),
  ochre: hex('#716852'),
  soot: hex('#383633'),
  brickDark: hex('#4a4540'),
  topBrick: hex('#6a625a'),
  tread: hex('#6f675e'),
  lime: hex('#a9a69d'),
  limeDark: hex('#7d7a73'),
  standFloor: hex('#b4876a'), // the stand's tiled floor, pale terracotta from above
  dark: hex('#211d1a'),
  lawn: hex('#7e9c55'),
  pave: hex('#9d958a'),
  earth: hex('#a88d6c'),
};

export const id = 'hoquyen';

const groundY = (x, z) => LAND_Y + rise(x, z);
// a point at bearing angle (radians, 0 = north, clockwise) and radius from the centre
const polarPos = (bearing, radius): [number, number] => [ARENA_CENTER[0] + Math.sin(bearing) * radius, ARENA_CENTER[1] - Math.cos(bearing) * radius];
const radialAngle = (bearing) => Math.atan2(-Math.cos(bearing), Math.sin(bearing)); // a box angle whose local x points outward at bearing

// weathered brick: a cell's colour from a hash, ochre wash in broad patches, dark streaks running down
function cellHash(i, j) {
  const val = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return val - Math.floor(val);
}

function brickColorAt(i, j) {
  const hVal = cellHash(i, j);
  const streak = cellHash(i, 99) > 0.8 ? 0.45 : 0;
  const ochre = Math.max(0, Math.sin(i * 0.19) * Math.sin(j * 0.6 + i * 0.05)) * 0.45;
  return shade(mix(mix(COLORS.brick, COLORS.ochre, ochre), COLORS.soot, streak * (0.6 + 0.4 * hVal)), 0.94 + 0.12 * hVal);
}

// a lime post with a flared cap and a lotus knob (the stand's corners, stair heads and feet)
function buildLimePost(S, x, z, baseY, height, angle, width = 0.45) {
  S.box(x, z, baseY, baseY + height, width, width, angle, COLORS.lime);
  S.box(x, z, baseY + height, baseY + height + 0.08, width + 0.14, width + 0.14, angle, COLORS.limeDark);
  S.box(x, z, baseY + height + 0.08, baseY + height + 0.24, width * 0.75, width * 0.75, angle, COLORS.lime, { taper: 0.75 });
  S.box(x, z, baseY + height + 0.24, baseY + height + 0.36, width * 0.36, width * 0.36, angle, COLORS.limeDark, { taper: 0.5 });
}

// a pierced lime parapet from ptA to ptB ([x, z]): base, chequer of dark cells on both faces, coping
function buildLatticeParapet(S, ptA, ptB, baseY, height) {
  const dx = ptB[0] - ptA[0];
  const dz = ptB[1] - ptA[1];
  const len = Math.hypot(dx, dz);
  const angle = Math.atan2(dz, dx);
  const midPt = [(ptA[0] + ptB[0]) / 2, (ptA[1] + ptB[1]) / 2];
  const norm = [-dz / len, dx / len];
  const thick = 0.24;
  S.kind = KIND.MASONRY;
  S.box(midPt[0], midPt[1], baseY, baseY + height, len, thick, angle, COLORS.lime);
  S.box(midPt[0], midPt[1], baseY + height, baseY + height + 0.1, len + 0.1, thick + 0.12, angle, COLORS.limeDark);
  S.kind = KIND.PLAIN;
  const cellSize = 0.12;
  const colCount = Math.floor((len - 0.3) / cellSize);
  const rowCount = Math.floor((height - 0.3) / cellSize);
  for (const side of [-1, 1]) {
    const faceOff = side * (thick / 2 + 0.005);
    const faceNorm = [norm[0] * side, 0, norm[1] * side];
    for (let i = 0; i < colCount; i++) {
      for (let j = 0; j < rowCount; j++) {
        if ((i + j) % 2) continue;
        const along0 = (len - colCount * cellSize) / 2 + i * cellSize;
        const y0 = baseY + 0.15 + j * cellSize;
        const p0 = [ptA[0] + (dx / len) * along0 + norm[0] * faceOff, ptA[1] + (dz / len) * along0 + norm[1] * faceOff];
        const p1 = [p0[0] + (dx / len) * cellSize, p0[1] + (dz / len) * cellSize];
        S.quad([p0[0], y0, p0[1]], [p1[0], y0, p1[1]], [p1[0], y0 + cellSize, p1[1]], [p0[0], y0 + cellSize, p0[1]], COLORS.dark, faceNorm);
      }
    }
  }
}

// an annular band between bearings ang0..ang1: outer face from rOutBot (at yBot) to rOutTop (at yTop), inner face rInBot..rInTop, top
function buildAnnularBand(S, ang0, ang1, segCount, yBot, yTop, rOutBot, rOutTop, rInBot, rInTop, color, topColor = color, { outer = true, inner = true }: Record<string, any> = {}) {
  for (let i = 0; i < segCount; i++) {
    const startAng = ang0 + ((ang1 - ang0) * i) / segCount;
    const endAng = ang0 + ((ang1 - ang0) * (i + 1)) / segCount;
    const midAng = (startAng + endAng) / 2;
    const outNorm = [Math.sin(midAng), 0.05, -Math.cos(midAng)];
    const inNorm = [-Math.sin(midAng), 0.05, Math.cos(midAng)];
    const ptAt = (bearing, rad, y) => {
      const pos = polarPos(bearing, rad);
      return [pos[0], y, pos[1]];
    };
    const fillCol = typeof color === 'function' ? color(midAng) : color;
    if (outer) S.quad(ptAt(startAng, rOutBot, yBot), ptAt(endAng, rOutBot, yBot), ptAt(endAng, rOutTop, yTop), ptAt(startAng, rOutTop, yTop), fillCol, outNorm);
    if (inner) S.quad(ptAt(startAng, rInBot, yBot), ptAt(endAng, rInBot, yBot), ptAt(endAng, rInTop, yTop), ptAt(startAng, rInTop, yTop), shade(fillCol, 0.85), inNorm);
    if (topColor) S.quad(ptAt(startAng, rInTop, yTop), ptAt(endAng, rInTop, yTop), ptAt(endAng, rOutTop, yTop), ptAt(startAng, rOutTop, yTop), topColor, [0, 1, 0]);
  }
}

// a dark round-headed opening drawn on the wall face at radius
function buildWallArch(S, bearing, radius, width, height, baseY, inward) {
  const faceNorm = inward ? [-Math.sin(bearing), 0, Math.cos(bearing)] : [Math.sin(bearing), 0, -Math.cos(bearing)];
  const tanVec = [Math.cos(bearing), 0, Math.sin(bearing)];
  const centerPos = polarPos(bearing, radius);
  const rectH = height - width / 2;
  const ptAt = (along, y): [number, number, number] => [centerPos[0] + tanVec[0] * along, y, centerPos[1] + tanVec[2] * along];
  S.quad(ptAt(-width / 2, baseY), ptAt(width / 2, baseY), ptAt(width / 2, baseY + rectH), ptAt(-width / 2, baseY + rectH), COLORS.dark, faceNorm);
  for (let k = 0; k < 6; k++) {
    const ang0 = (Math.PI * k) / 6;
    const ang1 = (Math.PI * (k + 1)) / 6;
    S.tri(ptAt(0, baseY + rectH), ptAt((Math.cos(ang0) * width) / 2, baseY + rectH + (Math.sin(ang0) * width) / 2), ptAt((Math.cos(ang1) * width) / 2, baseY + rectH + (Math.sin(ang1) * width) / 2), COLORS.dark, faceNorm);
  }
}

function buildArenaGroundAndWalls(S, levels, parapetArcs, isInBreak) {
  const { lowY, floorY, corniceY, paraFootY, paraTopY, innerWalkY, innerTopY } = levels;
  const buildRingBand = (...args: any[]) => {
    for (const [startAng, endAng] of parapetArcs) {
      (buildAnnularBand as any)(S, startAng, endAng, Math.max(1, Math.ceil(((endAng - startAng) / TAU) * RING_SEGS)), ...args);
    }
  };

  // ---- ground: a paved apron round the foot, an earth yard beyond it, the round lawn inside ----
  S.kind = KIND.GROUND;
  for (const [rad0, rad1, col] of [[OUTER_RADIUS - 0.2, OUTER_RADIUS + 3.2, COLORS.pave], [OUTER_RADIUS + 3.2, OUTER_RADIUS + 9, COLORS.earth]] as any[]) { // draped on the slope
    for (let i = 0; i < RING_SEGS; i++) {
      const groundPt = (bearing, rad) => {
        const pos = polarPos(bearing, rad);
        return [pos[0], groundY(pos[0], pos[1]) + 0.06, pos[1]];
      };
      const startAng = (i / RING_SEGS) * TAU;
      const endAng = ((i + 1) / RING_SEGS) * TAU;
      S.quad(groundPt(startAng, rad0), groundPt(endAng, rad0), groundPt(endAng, rad1), groundPt(startAng, rad1), col, [0, 1, 0]);
    }
  }
  S.kind = KIND.PLAIN;
  for (let i = 0; i < RING_SEGS; i++) { // the lawn: a fan from the centre
    const startAng = (i / RING_SEGS) * TAU;
    const endAng = ((i + 1) / RING_SEGS) * TAU;
    const ptA = polarPos(startAng, INNER_RADIUS + 0.1);
    const ptB = polarPos(endAng, INNER_RADIUS + 0.1);
    S.tri([ARENA_CENTER[0], floorY, ARENA_CENTER[1]], [ptA[0], floorY, ptA[1]], [ptB[0], floorY, ptB[1]], COLORS.lawn, [0, 1, 0]);
  }
  // the pale circle worn in the middle of the lawn (vtcnews: "never faded")
  buildAnnularBand(S, 0, TAU, 40, floorY, floorY + 0.02, 4.4, 4.4, 4.0, 4.0, shade(COLORS.lawn, 1.25), shade(COLORS.lawn, 1.25), { outer: false, inner: false });

  // ---- the outer wall: battered weathered brick, a grey moulded cornice, the pierced checkerboard parapet ----
  // The brick face is drawn in small cells, each its own weathered colour, rather than with the generic masonry
  // courses, which read far too large and uniform on this wall.
  S.kind = KIND.PLAIN;
  const colCount = RING_SEGS * 6;
  const rowCount = 12;
  const footY = lowY - 0.5;
  const topRad = OUTER_RADIUS - 0.88;
  for (let i = 0; i < colCount; i++) {
    for (let j = 0; j < rowCount; j++) {
      const startAng = (i / colCount) * TAU;
      const endAng = ((i + 1) / colCount) * TAU;
      const midAng = (startAng + endAng) / 2;
      const yA = footY + ((corniceY - footY) * j) / rowCount;
      const yB = footY + ((corniceY - footY) * (j + 1)) / rowCount;
      const rA = OUTER_RADIUS - ((OUTER_RADIUS - topRad) * j) / rowCount;
      const rB = OUTER_RADIUS - ((OUTER_RADIUS - topRad) * (j + 1)) / rowCount;
      const ptAt = (bearing, rad, y) => {
        const pos = polarPos(bearing, rad);
        return [pos[0], y, pos[1]];
      };
      S.quad(ptAt(startAng, rA, yA), ptAt(endAng, rA, yA), ptAt(endAng, rB, yB), ptAt(startAng, rB, yB), brickColorAt(i, j), [Math.sin(midAng), 0.2, -Math.cos(midAng)]);
    }
  }
  buildAnnularBand(S, 0, TAU, RING_SEGS, corniceY, corniceY, topRad, topRad, 20.6, 20.6, COLORS.topBrick, COLORS.topBrick, { outer: false, inner: false });
  S.kind = KIND.MASONRY;
  buildAnnularBand(S, 0, TAU, RING_SEGS, corniceY, paraFootY, OUTER_RADIUS - 0.62, OUTER_RADIUS - 0.62, 20.6, 20.6, COLORS.lime, COLORS.lime, { inner: false }); // cornice
  buildRingBand(paraFootY, paraTopY, OUTER_RADIUS - 0.85, OUTER_RADIUS - 0.85, 20.75, 20.75, COLORS.lime, COLORS.lime);
  buildRingBand(paraTopY, paraTopY + 0.1, OUTER_RADIUS - 0.78, OUTER_RADIUS - 0.78, 20.68, 20.68, COLORS.limeDark, COLORS.limeDark);
  // the open lattice: dark squares in a staggered double row (a chequer of hollow tiles) on the parapet's outer face
  S.kind = KIND.PLAIN;
  const latticeRad = OUTER_RADIUS - 0.79;
  const latticeCount = 240;
  for (let i = 0; i < latticeCount; i++) {
    for (let row = 0; row < 2; row++) {
      const bearing = (i / latticeCount) * TAU;
      if ((i + row) % 2 || isInBreak(bearing) || isInBreak(bearing - TAU)) continue;
      const halfSpan = (TAU / latticeCount) * 0.3;
      const cellY = paraFootY + 0.14 + row * 0.24;
      const pt0 = polarPos(bearing - halfSpan, latticeRad);
      const pt1 = polarPos(bearing + halfSpan, latticeRad);
      const outNorm = [Math.sin(bearing), 0, -Math.cos(bearing)];
      S.quad([pt0[0], cellY, pt0[1]], [pt1[0], cellY, pt1[1]], [pt1[0], cellY + 0.2, pt1[1]], [pt0[0], cellY + 0.2, pt0[1]], COLORS.dark, outNorm);
    }
  }

  // ---- the wall walk between the walls, then the higher inner wall with its brick parapet over the arena ----
  S.kind = KIND.MASONRY;
  buildAnnularBand(S, 0, TAU, RING_SEGS, corniceY, paraFootY, 20.6, 20.6, 19.3, 19.3, COLORS.topBrick, COLORS.topBrick, { outer: false, inner: false });
  buildAnnularBand(S, 0, TAU, RING_SEGS, lowY - 0.5, innerWalkY, 19.3, 19.3, INNER_RADIUS, INNER_RADIUS, COLORS.brick, COLORS.topBrick);
  const standInnerHalfAng = Math.asin(STAND_HALF_WIDTH / INNER_RADIUS); // the stand's own rail replaces the inner parapet over it
  buildAnnularBand(S, STAND_BEARING + standInnerHalfAng, STAND_BEARING - standInnerHalfAng + TAU, RING_SEGS - 4, innerWalkY, innerTopY, INNER_RADIUS + 0.45, INNER_RADIUS + 0.45, INNER_RADIUS, INNER_RADIUS, shade(COLORS.brick, 1.12), shade(COLORS.topBrick, 0.9));
  return standInnerHalfAng;
}

function buildCagesAndWestDoorway(S, levels) {
  const { floorY, corniceY, paraTopY, innerWalkY } = levels;
  // ---- the five tiger cages in the south of the inner wall: arched doors at the lawn, roofless pits above ----
  // facing the king's stand, spread along about 23 m of the south wall walk (satellite); the left-most as seen from
  // the stand (to the east) is the largest
  S.kind = KIND.PLAIN;
  for (const [offsetAng, doorW, doorH] of TIGER_CAGES) {
    const bearing = STAND_BEARING + Math.PI - offsetAng; // round from the point opposite the stand; offsetAng < 0 is the stand's left
    buildWallArch(S, bearing, INNER_RADIUS - 0.03, doorW, doorH, floorY, true);
    // the pit seen from the wall walk: a dark square sunk in the walk, with a lime lintel over the door
    const pitPos = polarPos(bearing, 18.4);
    const angle = radialAngle(bearing);
    S.box(pitPos[0], pitPos[1], innerWalkY + 0.01, innerWalkY + 0.03, 1.6, 1.8, angle, COLORS.dark);
    const lintelPos = polarPos(bearing, INNER_RADIUS - 0.05);
    S.box(lintelPos[0], lintelPos[1], floorY + doorH + 0.05, floorY + doorH + 0.25, 0.1, doorW + 0.5, angle, COLORS.limeDark);
  }

  // ---- the doorway in the ring wall west of the stand: a dark opening between two grey lime pillars ----
  const gateAngle = radialAngle(GATE_BEARING);
  const gateGroundY = groundY(...polarPos(GATE_BEARING, OUTER_RADIUS + 1));
  S.kind = KIND.PLAIN;
  const facePos = polarPos(GATE_BEARING, 21.75); // a plumb brick face round the opening, standing out of the batter
  S.box(facePos[0], facePos[1], gateGroundY - 0.3, corniceY, 1.0, 2.8, gateAngle, brickColorAt(7, 3));
  S.kind = KIND.MASONRY;
  for (const side of [-1, 1]) {
    const pillarPos = polarPos(GATE_BEARING + (side * 1.25) / OUTER_RADIUS, 21.85);
    S.box(pillarPos[0], pillarPos[1], gateGroundY - 0.3, paraTopY + 0.2, 0.8, 0.5, gateAngle, COLORS.lime);
    buildLimePost(S, pillarPos[0], pillarPos[1], paraTopY + 0.2, 0.01, gateAngle, 0.5);
  }
  S.box(facePos[0], facePos[1], gateGroundY + 3.0, gateGroundY + 3.3, 1.1, 1.9, gateAngle, COLORS.limeDark); // lintel
  S.kind = KIND.PLAIN;
  const openPos = polarPos(GATE_BEARING, 22.27);
  const tanVec = [Math.cos(GATE_BEARING), Math.sin(GATE_BEARING)];
  const outNorm = [Math.sin(GATE_BEARING), 0, -Math.cos(GATE_BEARING)];
  const openPt = (along, y): [number, number, number] => [openPos[0] + tanVec[0] * along, y, openPos[1] + tanVec[1] * along];
  S.quad(openPt(-0.85, gateGroundY), openPt(0.85, gateGroundY), openPt(0.85, gateGroundY + 3.0), openPt(-0.85, gateGroundY + 3.0), COLORS.dark, outNorm);
  buildWallArch(S, GATE_BEARING, INNER_RADIUS - 0.03, 2.4, 3.4, floorY, true); // the passage comes out on the lawn
}

function buildStairFlights(S, standAt, standAngle, paraFootY) {
  // ---- the east flight (the king's, on the left seen from the yard): 24 steps up the stand's east flank ----
  const stepCount = 24;
  const eastRun = 0.2;
  const eastCenterU = STAND_HALF_WIDTH + 1.02;
  const eastW = 1.7;
  const eastStartD = EAST_FLIGHT_HEAD_DIST + 0.6;
  const eastEndD = eastStartD + stepCount * eastRun;
  const eastFootPos = standAt(eastEndD, eastCenterU);
  const eastFootY = groundY(eastFootPos[0], eastFootPos[1]);
  const eastRise = (paraFootY - eastFootY) / stepCount;
  S.kind = KIND.MASONRY;
  const eastLandPos = standAt(EAST_FLIGHT_HEAD_DIST + 0.2, eastCenterU); // the landing on the wall top
  S.box(eastLandPos[0], eastLandPos[1], eastFootY - 0.3, paraFootY, 1.4, eastW + 0.7, standAngle, shade(COLORS.topBrick, 0.97), { topKind: KIND.ROAD });
  for (let k = 0; k < stepCount; k++) {
    const stepPos = standAt(eastStartD + (k + 0.5) * eastRun, eastCenterU);
    S.box(stepPos[0], stepPos[1], eastFootY - 0.3, paraFootY - k * eastRise, eastRun, eastW, standAngle, shade(COLORS.tread, 0.95 + (k % 2) * 0.05), { topKind: KIND.ROAD });
  }
  for (const side of [-1, 1]) { // cheeks: a sloping lime coping over brick, capped posts at both ends
    const cheekU = eastCenterU + side * (eastW / 2 + 0.15);
    for (let k = 0; k < 6; k++) {
      const distA = EAST_FLIGHT_HEAD_DIST + ((eastEndD - EAST_FLIGHT_HEAD_DIST) * k) / 6;
      const distB = EAST_FLIGHT_HEAD_DIST + ((eastEndD - EAST_FLIGHT_HEAD_DIST) * (k + 1)) / 6;
      const yA = paraFootY + 0.85 - ((paraFootY - eastFootY) * k) / 6;
      const yB = paraFootY + 0.85 - ((paraFootY - eastFootY) * (k + 1)) / 6;
      const midPos = standAt((distA + distB) / 2, cheekU);
      const ptA = standAt(distA, cheekU);
      const ptB = standAt(distB, cheekU);
      S.kind = KIND.PLAIN;
      S.box(midPos[0], midPos[1], eastFootY - 0.3, Math.min(yA, yB), distB - distA, 0.3, standAngle, brickColorAt(k + 40, side + 5));
      S.kind = KIND.MASONRY;
      S.beam([ptA[0], yA, ptA[1]], [ptB[0], yB, ptB[1]], 0.44, 0.16, COLORS.lime);
    }
    const footPost = standAt(eastEndD + 0.1, cheekU);
    buildLimePost(S, footPost[0], footPost[1], eastFootY, 1.0, standAngle, 0.5);
    if (side > 0) {
      const headPost = standAt(EAST_FLIGHT_HEAD_DIST, cheekU);
      buildLimePost(S, headPost[0], headPost[1], paraFootY, 0.9, standAngle, 0.45);
    }
  }

  // ---- the west flight (the officials'): 24 steps running down along the ring wall to the west ----
  const innerR = 21.2;
  const outerR = 24.15;
  const midR = (innerR + outerR) / 2;
  const cheekR = outerR + 0.17;
  const footBearing = WEST_FLIGHT_HEAD - WEST_FLIGHT_LAND - stepCount * WEST_FLIGHT_STEP;
  const westFootY = groundY(...polarPos(footBearing, OUTER_RADIUS + 3));
  const westRise = (paraFootY - westFootY) / stepCount;
  S.kind = KIND.MASONRY;
  const landBearing = WEST_FLIGHT_HEAD - WEST_FLIGHT_LAND / 2;
  const landPos = polarPos(landBearing, (innerR - 0.3 + outerR) / 2);
  S.box(landPos[0], landPos[1], westFootY - 0.3, paraFootY, outerR - innerR + 0.3, WEST_FLIGHT_LAND * midR + 0.05, radialAngle(landBearing), shade(COLORS.topBrick, 0.97), { topKind: KIND.ROAD });
  for (let k = 0; k < stepCount; k++) {
    const bearing = WEST_FLIGHT_HEAD - WEST_FLIGHT_LAND - (k + 0.5) * WEST_FLIGHT_STEP;
    const stepPos = polarPos(bearing, midR);
    S.box(stepPos[0], stepPos[1], westFootY - 0.3, paraFootY - k * westRise, outerR - innerR, WEST_FLIGHT_STEP * midR + 0.02, radialAngle(bearing), shade(COLORS.tread, 0.95 + (k % 2) * 0.05), { topKind: KIND.ROAD });
  }
  // the outer cheek: a solid brick side under a sloping lime coping
  const headBearing = WEST_FLIGHT_HEAD - WEST_FLIGHT_LAND;
  for (let k = 0; k < 8; k++) {
    const angA = headBearing - ((headBearing - footBearing) * k) / 8;
    const angB = headBearing - ((headBearing - footBearing) * (k + 1)) / 8;
    const yA = paraFootY + 0.85 - ((paraFootY - westFootY) * k) / 8;
    const yB = paraFootY + 0.85 - ((paraFootY - westFootY) * (k + 1)) / 8;
    const midAng = (angA + angB) / 2;
    const midPos = polarPos(midAng, cheekR);
    const ptA = polarPos(angA, cheekR);
    const ptB = polarPos(angB, cheekR);
    S.kind = KIND.PLAIN;
    S.box(midPos[0], midPos[1], westFootY - 0.3, Math.min(yA, yB), 0.34, Math.abs(angA - angB) * cheekR + 0.02, radialAngle(midAng), brickColorAt(k + 60, 2));
    S.kind = KIND.MASONRY;
    S.beam([ptA[0], yA, ptA[1]], [ptB[0], yB, ptB[1]], 0.44, 0.16, COLORS.lime);
  }
  // the landing's outer parapet, posts at the head and the foot
  const landEdge0 = polarPos(WEST_FLIGHT_HEAD + 0.005, cheekR);
  const landEdge1 = polarPos(headBearing, cheekR);
  S.beam([landEdge0[0], paraFootY + 0.85, landEdge0[1]], [landEdge1[0], paraFootY + 0.85, landEdge1[1]], 0.44, 0.16, COLORS.lime);
  S.box((landEdge0[0] + landEdge1[0]) / 2, (landEdge0[1] + landEdge1[1]) / 2, paraFootY, paraFootY + 0.8, 0.34, WEST_FLIGHT_LAND * cheekR, radialAngle(landBearing), COLORS.limeDark);
  const westHeadPost = polarPos(WEST_FLIGHT_HEAD + 0.005, cheekR);
  const westFootPost = polarPos(footBearing - 0.012, cheekR);
  buildLimePost(S, westHeadPost[0], westHeadPost[1], paraFootY, 0.9, radialAngle(WEST_FLIGHT_HEAD), 0.45);
  buildLimePost(S, westFootPost[0], westFootPost[1], groundY(westFootPost[0], westFootPost[1]), 1.0, radialAngle(footBearing), 0.5);
}

function buildKingsStandAndSpouts(S, standAt, standAxes, standAngle, levels, standInnerHalfAng) {
  const { frontGroundY, corniceY, paraFootY, innerWalkY } = levels;
  const { outDir, tanDir } = standAxes;
  // ---- the king's stand: a raised block standing out from the front arc, a pierced lime parapet round its top ----
  const backDist = 19.3;
  const standY = paraFootY + 0.1; // its back (on the inner wall's outer face) and floor
  const standMid = standAt((backDist + STAND_FACE_DIST) / 2, 0);
  S.kind = KIND.PLAIN;
  // the brick block, its faces in weathered cells like the ring's
  const footY = frontGroundY - 0.3;
  const colsU = 24;
  const rowsY = 9;
  const faceQuad = (d0, u0, d1, u1, y0, y1, color, normal) => {
    const pt0 = standAt(d0, u0);
    const pt1 = standAt(d1, u1);
    S.quad([pt0[0], y0, pt0[1]], [pt1[0], y0, pt1[1]], [pt1[0], y1, pt1[1]], [pt0[0], y1, pt0[1]], color, normal);
  };
  for (let i = 0; i < colsU; i++) {
    for (let j = 0; j < rowsY; j++) {
      const uA = -STAND_HALF_WIDTH + (2 * STAND_HALF_WIDTH * i) / colsU;
      const uB = -STAND_HALF_WIDTH + (2 * STAND_HALF_WIDTH * (i + 1)) / colsU;
      const yA = footY + ((corniceY - footY) * j) / rowsY;
      const yB = footY + ((corniceY - footY) * (j + 1)) / rowsY;
      faceQuad(STAND_FACE_DIST, uA, STAND_FACE_DIST, uB, yA, yB, brickColorAt(i + 200, j), [outDir[0], 0, outDir[1]]);
    }
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < rowsY; j++) {
        const dA = 20.6 + ((STAND_FACE_DIST - 20.6) * i) / 8;
        const dB = 20.6 + ((STAND_FACE_DIST - 20.6) * (i + 1)) / 8;
        const yA = footY + ((corniceY - footY) * j) / rowsY;
        const yB = footY + ((corniceY - footY) * (j + 1)) / rowsY;
        faceQuad(dA, side * STAND_HALF_WIDTH, dB, side * STAND_HALF_WIDTH, yA, yB, shade(brickColorAt(i + 220 + side, j), 0.95), [tanDir[0] * side, 0, tanDir[1] * side]);
      }
    }
  }
  S.kind = KIND.MASONRY;
  S.box(standMid[0], standMid[1], corniceY, corniceY + 0.12, STAND_FACE_DIST - backDist + 0.3, 2 * STAND_HALF_WIDTH + 0.3, standAngle, COLORS.limeDark); // the moulded cornice
  S.box(standMid[0], standMid[1], corniceY + 0.12, standY, STAND_FACE_DIST - backDist + 0.2, 2 * STAND_HALF_WIDTH + 0.2, standAngle, COLORS.lime, { top: COLORS.standFloor });
  // the framed plaque under the cornice on the north face
  const plaqueOuter = standAt(STAND_FACE_DIST + 0.03, 0);
  S.box(plaqueOuter[0], plaqueOuter[1], corniceY - 1.05, corniceY - 0.25, 0.06, 1.15, standAngle, COLORS.limeDark);
  S.kind = KIND.PLAIN;
  const plaqueInner = standAt(STAND_FACE_DIST + 0.065, 0);
  S.box(plaqueInner[0], plaqueInner[1], corniceY - 0.95, corniceY - 0.35, 0.01, 0.9, standAngle, COLORS.brickDark);
  // the pierced parapet along the front and down both sides, lotus-capped posts at the corners and between
  const paraH = 1.0;
  const frontD = STAND_FACE_DIST - 0.12;
  const sideU = STAND_HALF_WIDTH - 0.12;
  const sideBackD = 20.4;
  buildLatticeParapet(S, standAt(frontD, -sideU), standAt(frontD, sideU), standY, paraH);
  for (const side of [-1, 1]) buildLatticeParapet(S, standAt(frontD, side * sideU), standAt(sideBackD, side * sideU), standY, paraH);
  S.kind = KIND.MASONRY;
  for (let k = 0; k <= 4; k++) {
    const pos = standAt(frontD, -sideU + (2 * sideU * k) / 4);
    buildLimePost(S, pos[0], pos[1], standY, paraH + 0.25, standAngle, k % 4 ? 0.36 : 0.48);
  }
  for (const side of [-1, 1]) {
    const pos = standAt(sideBackD, side * sideU);
    buildLimePost(S, pos[0], pos[1], standY, paraH + 0.25, standAngle, 0.4);
  }
  // a short flight up to the dais on the inner wall, and the dais's own rail along the arena edge
  const daisSteps = Math.max(2, Math.round((innerWalkY - standY) / 0.18));
  const daisRise = (innerWalkY - standY) / daisSteps;
  for (let k = 0; k < daisSteps; k++) {
    const stepPos = standAt(19.3 + (k + 0.5) * 0.28, 0);
    S.box(stepPos[0], stepPos[1], standY, innerWalkY - k * daisRise, 0.28, 2.0, standAngle, shade(COLORS.topBrick, 1.02));
  }
  buildAnnularBand(S, STAND_BEARING - standInnerHalfAng, STAND_BEARING + standInnerHalfAng, 8, innerWalkY, innerWalkY, 19.3, 19.3, INNER_RADIUS, INNER_RADIUS, COLORS.standFloor, COLORS.standFloor, { outer: false, inner: false });
  buildAnnularBand(S, STAND_BEARING - standInnerHalfAng, STAND_BEARING + standInnerHalfAng, 8, innerWalkY, innerWalkY + 0.85, INNER_RADIUS + 0.25, INNER_RADIUS + 0.25, INNER_RADIUS, INNER_RADIUS, COLORS.lime, COLORS.limeDark);
  for (let k = 0; k <= 4; k++) {
    const bearing = STAND_BEARING - standInnerHalfAng + (2 * standInnerHalfAng * k) / 4;
    const pos = polarPos(bearing, INNER_RADIUS + 0.12);
    buildLimePost(S, pos[0], pos[1], innerWalkY, 1.05, radialAngle(bearing), 0.34);
  }

  // ---- the tiger-face drain spouts at the foot of the outer wall ----
  S.kind = KIND.PLAIN;
  for (let i = 0; i < 12; i++) {
    const bearing = ((i + 0.5) / 12) * TAU;
    const signedBearing = bearing > Math.PI ? bearing - TAU : bearing;
    if ((signedBearing > STAND_BEARING - 0.32 && signedBearing < STAND_BEARING + 0.55) || (signedBearing > -1.0 && signedBearing < GATE_BEARING + 0.1)) continue; // not on the stand, stairs or gate
    const pos = polarPos(bearing, OUTER_RADIUS - 0.02);
    const angle = radialAngle(bearing);
    S.box(pos[0], pos[1], frontGroundY + 0.35, frontGroundY + 0.85, 0.3, 0.55, angle, COLORS.limeDark);
    const mouthPos = polarPos(bearing, OUTER_RADIUS + 0.14);
    S.box(mouthPos[0], mouthPos[1], frontGroundY + 0.5, frontGroundY + 0.62, 0.06, 0.16, angle, COLORS.dark);
  }
}

export function build({ S }) {
  // the ground falls about 2.5 m from south-west to north-east across the site (the foot of Long Thọ hill). The
  // walls are levelled on the front, the north side with the stand; the arena floor is level, just above the
  // highest ground inside, and the outer wall's foot runs down to the lowest point outside.
  const frontGroundY = groundY(...polarPos(STAND_BEARING, OUTER_RADIUS + 1));
  let lowY = Infinity;
  let highY = -Infinity;
  for (let i = 0; i < 24; i++) {
    const pos = polarPos((i / 24) * TAU, OUTER_RADIUS + 3);
    lowY = Math.min(lowY, groundY(pos[0], pos[1]));
  }
  for (let i = 0; i < 24; i++) {
    for (const rad of [0, 8, 13, INNER_RADIUS]) {
      const pos = polarPos((i / 24) * TAU, rad);
      highY = Math.max(highY, groundY(pos[0], pos[1]));
    }
  }
  S.base = frontGroundY - LAND_Y;
  const floorY = Math.max(frontGroundY, highY) + 0.25; // (so the mapped building under it is seen as covered, and dropped)
  const corniceY = Math.max(frontGroundY, floorY - 0.6) + 4.15;
  const paraFootY = corniceY + 0.3;
  const paraTopY = paraFootY + 0.75; // outer wall: cornice, parapet foot, top
  const innerWalkY = floorY + 5.45;
  const innerTopY = floorY + 5.9; // the inner wall walk, its parapet top (5.9 m over the lawn)
  const levels = { frontGroundY, lowY, floorY, corniceY, paraFootY, paraTopY, innerWalkY, innerTopY };

  // the stand's own frame: dist along its axis from the centre, acrossU across it (positive to the east)
  const outDir = [Math.sin(STAND_BEARING), -Math.cos(STAND_BEARING)];
  const tanDir = [Math.cos(STAND_BEARING), Math.sin(STAND_BEARING)];
  const standAt = (dist, acrossU): [number, number] => [ARENA_CENTER[0] + outDir[0] * dist + tanDir[0] * acrossU, ARENA_CENTER[1] + outDir[1] * dist + tanDir[1] * acrossU];
  const standAngle = radialAngle(STAND_BEARING);

  // where the stand, the two flight heads and the gate break the ring's parapet (bearing intervals)
  const standHalfAng = Math.asin(STAND_HALF_WIDTH / 21.2);
  const parapetBreaks = [
    [STAND_BEARING - standHalfAng, STAND_BEARING + standHalfAng],
    [STAND_BEARING + Math.atan2(STAND_HALF_WIDTH, EAST_FLIGHT_HEAD_DIST), STAND_BEARING + Math.atan2(STAND_HALF_WIDTH + 2.4, EAST_FLIGHT_HEAD_DIST)],
    [WEST_FLIGHT_HEAD - WEST_FLIGHT_LAND, WEST_FLIGHT_HEAD + 0.01],
  ];
  const isInBreak = (bearing) => parapetBreaks.some(([startAng, endAng]) => bearing > startAng && bearing < endAng);
  const parapetArcs = (() => { // [0, TAU) less the breaks
    const intervals = parapetBreaks.map(([startAng, endAng]) => [(startAng + TAU) % TAU, (endAng + TAU) % TAU]).sort((a, b) => a[0] - b[0]);
    const arcs = [];
    let cursor = 0;
    for (const [startAng, endAng] of intervals) {
      if (startAng > cursor) arcs.push([cursor, startAng]);
      cursor = Math.max(cursor, endAng);
    }
    if (cursor < TAU) arcs.push([cursor, TAU]);
    return arcs;
  })();

  const pavedStart = S.n;
  const standInnerHalfAng = buildArenaGroundAndWalls(S, levels, parapetArcs, isInBreak);
  buildCagesAndWestDoorway(S, levels);
  buildStairFlights(S, standAt, standAngle, paraFootY);
  buildKingsStandAndSpouts(S, standAt, { outDir, tanDir }, standAngle, levels, standInnerHalfAng);

  (S.paved = S.paved || []).push([pavedStart, S.n]); // arena, walls and apron: no trees, no houses
  S.kind = KIND.PLAIN;
  S.base = 0;
}
