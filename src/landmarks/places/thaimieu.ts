import { KIND, hex, shade, inRing, hipShape } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { glowPoints } from '../../geo/materials.ts';
import { pavilion } from '../citadel.ts';
import { fence, roadsNear, FENCE } from '../enclosure.ts';

// Thái Miếu (Thái Tổ Miếu), the temple of the nine Nguyễn lords in the south-east of the Imperial City, built 1804
// under Gia Long. Sources and estimates: docs/places/thaimieu.md.
//
// Drawn complete, as before 1947 (the project's rule for places being rebuilt): the great double hall (tiền điện
// 15 bays + 2 wings, chính điện 13 + 2, 71 x 27 m, the largest timber building of the Imperial City) burned in 1947
// and in 2026 is its restored foundation, with the timber hall to follow in phase 2 (from 2027, yellow glazed tiles,
// red lacquer and gilt); Mục Tư điện, Thổ Công từ and the Tả / Hữu Tùng tự, today bases only, are drawn standing too.
// Round them: Thái Miếu Môn in the front wall, the bình phong and Tuy Thành Các with its flanking gates Quang Hy and
// Diên Hy, Chiêu Kính điện and Long Đức điện on the east. Triệu Miếu, behind the back wall, is its own place.
//
// Frame: centre COMPOUND_CENTER on the mapped hall (OSM way 172657566), u along the facade (toward the east end), v out of the front
// (south-south-east, toward the Imperial City's south wall). Positions below are OSM outlines in that frame.
export const id = 'thaimieu';

const COMPOUND_CENTER = [-910.9, -111.3];
const COMPOUND_ANGLE = Math.atan2(-0.6, 0.8);
const AXIS_COS = Math.cos(COMPOUND_ANGLE);
const AXIS_SIN = Math.sin(COMPOUND_ANGLE);
const ACROSS_ANGLE = COMPOUND_ANGLE + Math.PI / 2; // halls whose long side runs along v
const HALL_OFFSET_U = -0.5;

const toWorld = (localU, localV): [number, number] => [
  COMPOUND_CENTER[0] + localU * AXIS_COS - localV * AXIS_SIN,
  COMPOUND_CENTER[1] + localU * AXIS_SIN + localV * AXIS_COS,
];
const toPoint3 = (localU, localV, y) => {
  const pos = toWorld(localU, localV);
  return [pos[0], y, pos[1]];
};
const hallWorld = (localU, localV) => toWorld(localU + HALL_OFFSET_U, localV);
const hallPoint3 = (localU, localV, y) => toPoint3(localU + HALL_OFFSET_U, localV, y);
const groundY = (pos) => LAND_Y + rise(pos[0], pos[1]);

// the compound wall (OSM barrier=wall 695810745 + 695810746) and the cross wall to the back yard (1346838355)
const OUTER_WALL_LOCAL = [[-63.1, 101.9], [-64.9, -15.1], [-65.9, -58.2], [-28, -57], [26.1, -55.2], [63.9, -54], [64, -12.9], [64.3, 101.7]];
const CROSS_WALL_LOCAL = [[-64.9, -15.1], [-40.8, -14.5], [64, -12.9]];
const FRONT_WALL_LOCAL = [[64, -12.9], [64.3, 101.7], [-63.1, 101.9], [-64.9, -15.1]];
const TUY_THANH_WALLS = [
  [[-64.6, 67.4], [-31.9, 67.4]],
  [[-24, 67.4], [-8.6, 66.2]],
  [[12.8, 66.2], [26.4, 68.5]],
  [[34.3, 68.5], [64.2, 68.5]],
];

// ground kept clear of the mapped trees: [u, v, size u, size v] (the bases, halls, gates and the walk, with margin)
const TREE_CLEAR_BOXES = [
  [-0.4, 4.3, 78, 32], [-0.4, 28, 80, 18], [0, 50, 6, 28], [2.5, 83, 6, 32], [2.9, 100.6, 17, 7], [2.7, 89, 11, 3], [2.1, 65.7, 25, 8],
  [51, 43.8, 16, 17], [51.3, 1.4, 16, 17], [-51, 43.8, 15, 17], [-53.5, 0.4, 11, 14], [31, 37, 10, 15], [-31, 37, 10, 15],
  [54.4, -34.2, 15, 20], [-55.1, -36, 13, 21],
];

const COLORS = {
  roof: PAL.imperialRoof,
  ridge: hex('#f1d77a'),
  lacquer: PAL.lacquer,
  wall: hex('#d8c48e'),
  stone: PAL.stone,
  brick: hex('#b39c80'),
  gold: hex('#d9a93a'),
  bronze: hex('#4f5446'),
  enamel: [hex('#2f7d8c'), hex('#3f8f4f'), hex('#e0b23a')],
};

function frameBox(S, localU, localV, y0, y1, sizeU, sizeV, color, opts?) {
  const pos = toWorld(localU, localV);
  S.box(pos[0], pos[1], y0, y1, sizeU, sizeV, COMPOUND_ANGLE, color, opts);
}

function hallBox(S, localU, localV, y0, y1, sizeU, sizeV, color, opts?) {
  frameBox(S, localU + HALL_OFFSET_U, localV, y0, y1, sizeU, sizeV, color, opts);
}

// a brick gate across a wall: centre pos in world, `len` along the wall at angle
function buildWallGate(S, pos, angle, len, thick, baseY, { h: height = 3.2, doors = 1 }: Record<string, any> = {}) {
  const cosAng = Math.cos(angle);
  const sinAng = Math.sin(angle);
  S.kind = KIND.MASONRY;
  const pierW = 1.0;
  const openW = (len - pierW * (doors + 1)) / doors;
  for (let i = 0; i <= doors; i++) {
    const offset = -len / 2 + pierW / 2 + i * (openW + pierW);
    S.box(pos[0] + cosAng * offset, pos[1] + sinAng * offset, baseY - 0.3, baseY + height, pierW, thick, angle, COLORS.wall, { top: shade(COLORS.wall, 0.9) });
  }
  S.box(pos[0], pos[1], baseY + height - 0.5, baseY + height + 0.3, len, thick, angle, COLORS.wall);
  S.kind = KIND.PLAIN;
  for (let i = 0; i < doors; i++) {
    const offset = -len / 2 + pierW + openW / 2 + i * (openW + pierW);
    S.box(pos[0] + cosAng * offset, pos[1] + sinAng * offset, baseY, baseY + height - 0.6, openW, 0.12, angle, shade(COLORS.lacquer, i === (doors - 1) / 2 ? 0.7 : 0.8));
  }
  S.hip(pos[0], pos[1], len, thick, angle, baseY + height + 0.3, Math.min(1.6, thick * 0.55 + 0.3), COLORS.roof, {
    flare: 0.3, over: 0.6, ridgeCol: COLORS.ridge, fascia: 0.18, fasciaCol: shade(COLORS.lacquer, 0.7), hips: true, glazed: true, segs: 3,
  });
}

// Thái Tổ Miếu as it stood before 1947: a trùng thiềm điệp ốc of two halls under joined yellow glazed roofs on a
// 1 m stone base.
function buildMainTempleHall(S, lamps) {
  const centerV = 4.3;
  const baseW = 74;
  const baseD = 28;
  const baseH = 1.0;
  const hallGroundY = groundY(hallWorld(0, centerV));
  const floorY = hallGroundY + baseH;
  // outer column lines: frontV the verandah, doorV the front doors, valleyV the valley between the halls, backV the back wall
  const frontV = 15.0;
  const doorV = 10.5;
  const valleyV = 5.8;
  const backV = -7.5;
  const eaveY = floorY + 3.6; // the verandah's beam heads: the front roof's eave
  const baySpans = [2.9, ...Array(15).fill(4.2), 2.9];
  const hallW = baySpans.reduce((acc, span) => acc + span, 0); // 68.8
  const colUs = [-hallW / 2];
  for (const span of baySpans) colUs.push(colUs[colUs.length - 1] + span);
  S.base = hallGroundY - LAND_Y;

  // the base: stone-faced, a kerb round the top, three flights up the front and one at each end
  S.kind = KIND.MASONRY;
  hallBox(S, 0, centerV, hallGroundY - 0.3, floorY, baseW, baseD, COLORS.stone, { taper: 0.99, topKind: KIND.ROAD });
  hallBox(S, 0, centerV, floorY - 0.14, floorY + 0.02, baseW + 0.3, baseD + 0.3, shade(COLORS.stone, 1.1), { topKind: KIND.ROAD });
  for (const [flightU, flightW] of [[0, 5.0], [-21, 3.6], [21, 3.6]]) {
    for (let k = 1; k <= 5; k++) {
      hallBox(S, flightU, centerV + baseD / 2 + 0.32 * k - 0.16, hallGroundY - 0.3, floorY - 0.2 * k, flightW, 0.32, shade(COLORS.stone, 1.05), { topKind: KIND.ROAD });
    }
    S.kind = KIND.PLAIN;
    for (const side of [-1, 1]) {
      const ptA = hallWorld(flightU + side * (flightW / 2 + 0.22), centerV + baseD / 2 - 0.1);
      const ptB = hallWorld(flightU + side * (flightW / 2 + 0.22), centerV + baseD / 2 + 1.7);
      S.beam([ptA[0], floorY + 0.35, ptA[1]], [ptB[0], hallGroundY + 0.25, ptB[1]], 0.4, 0.42, shade(COLORS.stone, 0.9));
    }
    S.kind = KIND.MASONRY;
  }
  for (const side of [-1, 1]) {
    for (let k = 1; k <= 5; k++) {
      hallBox(S, side * (baseW / 2 + 0.32 * k - 0.16), centerV, hallGroundY - 0.3, floorY - 0.2 * k, 0.32, 3.6, shade(COLORS.stone, 1.05), { topKind: KIND.ROAD });
    }
  }

  // walls: lime-washed brick at the back and the two ends, carried up to the roofs' undersides; a dark closed core
  const mainRise = 5.4;
  const frontRise = 3.3; // rises: main ridge floorY + 10.0 (11 m over the ground), front ridge floorY + 6.9
  const roofOver = 1.6;
  const mainFlare = 0.5;
  const frontFlare = 0.45;
  const roofHeightAt = (y0, riseH, depth, flare, inU, inV) => {
    const { hw, hd, rl, gamma } = hipShape(hallW + roofOver * 2, depth + roofOver * 2, flare, true, COLORS.ridge, 4);
    const frac = Math.min(1, inU / Math.max(1e-6, hw - rl), inV / hd);
    return y0 + riseH * frac ** gamma;
  };
  const mainWallTopY = roofHeightAt(floorY + 4.6, mainRise, valleyV - backV, mainFlare, roofOver + 0.3, roofOver) - 0.05;
  const frontWallTopY = roofHeightAt(eaveY, frontRise, frontV - valleyV, frontFlare, roofOver + 0.3, frontV + roofOver - doorV) - 0.05;
  S.kind = KIND.MASONRY;
  hallBox(S, 0, backV + 0.3, floorY, mainWallTopY, hallW, 0.6, COLORS.wall);
  for (const side of [-1, 1]) {
    hallBox(S, side * (hallW / 2 - 0.3), (backV + valleyV) / 2, floorY, mainWallTopY, 0.6, valleyV - backV, COLORS.wall);
    hallBox(S, side * (hallW / 2 - 0.3), (valleyV + doorV) / 2, floorY, frontWallTopY, 0.6, doorV - valleyV, COLORS.wall);
  }
  S.kind = KIND.TIMBER;
  hallBox(S, 0, (backV + doorV) / 2, floorY, floorY + 4.3, hallW - 1.2, doorV - backV - 0.8, shade(COLORS.lacquer, 0.7), { top: shade(COLORS.roof, 0.7) });

  // the front: 15 bays of lacquered door panels (bức bàn), the middle one darker, a gilt lattice transom over each;
  // the wing bays walled. At the back, doors in the five middle bays.
  S.kind = KIND.PLAIN;
  for (let i = 0; i < baySpans.length; i++) {
    const u0 = colUs[i];
    const u1 = colUs[i + 1];
    const midU = (u0 + u1) / 2;
    const bayW = u1 - u0;
    if (i === 0 || i === baySpans.length - 1) {
      S.kind = KIND.MASONRY;
      hallBox(S, midU, doorV - 0.05, floorY, floorY + 3.6, bayW, 0.3, COLORS.wall);
      S.kind = KIND.PLAIN;
      continue;
    }
    hallBox(S, midU, doorV - 0.08, floorY, floorY + 2.85, bayW - 0.5, 0.2, i === 8 ? shade(COLORS.lacquer, 0.62) : shade(COLORS.lacquer, 0.78));
    const leafCount = 4;
    for (let k = 1; k < leafCount; k++) {
      hallBox(S, u0 + 0.25 + ((bayW - 0.5) * k) / leafCount, doorV + 0.04, floorY, floorY + 2.85, 0.06, 0.04, shade(COLORS.lacquer, 0.5));
    }
    hallBox(S, midU, doorV - 0.04, floorY + 2.85, floorY + 3.55, bayW - 0.3, 0.18, COLORS.gold);
    if (i >= 6 && i <= 10) hallBox(S, midU, backV - 0.04, floorY, floorY + 2.7, bayW - 0.8, 0.12, shade(COLORS.lacquer, 0.75));
  }
  // verandah: 18 red columns on stone bases with a gilt band, a beam along their heads, a dark ceiling over it
  for (const colU of colUs) {
    const pos = hallWorld(colU, frontV);
    S.cyl(pos[0], pos[1], floorY, floorY + 0.3, 0.44, 0.38, 6, shade(COLORS.stone, 0.95), { cap: false, rot: COMPOUND_ANGLE });
    S.cyl(pos[0], pos[1], floorY + 0.3, eaveY, 0.26, 0.24, 6, COLORS.lacquer, { cap: false, rot: COMPOUND_ANGLE });
    S.cyl(pos[0], pos[1], floorY + 2.0, floorY + 2.3, 0.27, 0.27, 6, COLORS.gold, { cap: false, rot: COMPOUND_ANGLE });
  }
  hallBox(S, 0, frontV, eaveY - 0.4, eaveY, hallW + 0.4, 0.34, shade(COLORS.lacquer, 0.75));
  hallBox(S, 0, frontV - 0.2, eaveY - 0.75, eaveY - 0.4, hallW, 0.08, shade(COLORS.gold, 0.85)); // the gilt frieze under the eave beam
  hallBox(S, 0, (frontV + doorV) / 2, eaveY - 0.05, eaveY, hallW, frontV - doorV, shade(COLORS.lacquer, 0.45), { bottom: true });

  // roofs: the main hall's high hip behind, the front hall's lower one before it, joined at the valley
  S.kind = KIND.TIMBER;
  const eaveStyle = { fascia: 0.32, fasciaCol: shade(COLORS.lacquer, 0.7), hips: true, glazed: true, ridgeCol: COLORS.ridge, segs: 4 };
  const frontRoofCenter = hallWorld(0, (valleyV + frontV) / 2);
  const mainRoofCenter = hallWorld(0, (backV + valleyV) / 2);
  S.hip(mainRoofCenter[0], mainRoofCenter[1], hallW, valleyV - backV, COMPOUND_ANGLE, floorY + 4.6, mainRise, COLORS.roof, { flare: mainFlare, over: roofOver, ...eaveStyle });
  S.hip(frontRoofCenter[0], frontRoofCenter[1], hallW, frontV - valleyV, COMPOUND_ANGLE, eaveY, frontRise, COLORS.roof, { flare: frontFlare, over: roofOver, ...eaveStyle });
  // the bronze valley gutter between them, spouting at the two ends
  S.kind = KIND.PLAIN;
  S.beam(hallPoint3(-hallW / 2 - 1.2, valleyV, eaveY + 0.7), hallPoint3(hallW / 2 + 1.2, valleyV, eaveY + 0.7), 0.6, 0.35, COLORS.bronze);

  // ridge ornament: a pháp lam sun disc on a flame base in the middle of each ridge, enamel panels along it, and
  // upturned dragon-tail finials (kìm) at the ends of the main ridge
  for (const [roofMid, ridgeTopY, roofDepth, scale] of [[mainRoofCenter, floorY + 4.6 + mainRise, valleyV - backV, 1], [frontRoofCenter, eaveY + frontRise, frontV - valleyV, 0.75]] as any[]) {
    const ridgeThick = Math.max(0.3, Math.min(0.6, (roofDepth + 3.2) * 0.035));
    const ornamentY = ridgeTopY + ridgeThick * 1.6;
    S.box(roofMid[0], roofMid[1], ornamentY - 0.2, ornamentY + 0.5 * scale, 1.6 * scale, 0.35, COMPOUND_ANGLE, COLORS.enamel[0]);
    S.cyl(roofMid[0], roofMid[1], ornamentY + 0.5 * scale, ornamentY + 1.0 * scale, 0.6 * scale, 0.28 * scale, 8, COLORS.enamel[2]);
    S.cyl(roofMid[0], roofMid[1], ornamentY + 1.0 * scale, ornamentY + 1.6 * scale, 0.28 * scale, 0.04, 6, COLORS.gold);
    const ridgeHalfL = hallW / 2 + 1.6 - ((roofDepth + 3.2) / 2) * 0.92;
    for (let k = -4; k <= 4; k++) {
      if (!k) continue;
      const panelPos = [roofMid[0] + AXIS_COS * (k * ridgeHalfL) / 4.6, roofMid[1] + AXIS_SIN * (k * ridgeHalfL) / 4.6];
      S.box(panelPos[0], panelPos[1], ridgeTopY + ridgeThick * 0.6, ridgeTopY + ridgeThick * 1.4, 1.0, ridgeThick * 1.05, COMPOUND_ANGLE, COLORS.enamel[Math.abs(k) % 2]);
    }
    if (scale === 1) {
      for (const side of [-1, 1]) {
        const ptA = [roofMid[0] + AXIS_COS * side * (ridgeHalfL - 0.3), roofMid[1] + AXIS_SIN * side * (ridgeHalfL - 0.3)];
        const ptB = [roofMid[0] + AXIS_COS * side * (ridgeHalfL + 0.3), roofMid[1] + AXIS_SIN * side * (ridgeHalfL + 0.3)];
        S.beam([ptA[0], ridgeTopY + ridgeThick * 1.2, ptA[1]], [ptB[0], ridgeTopY + ridgeThick * 1.2 + 1.0, ptB[1]], 0.35, 0.4, COLORS.enamel[1]);
      }
    }
  }
  // night: lanterns along the verandah
  for (let i = 2; i < baySpans.length - 1; i += 2) {
    const lampPos = hallWorld((colUs[i] + colUs[i + 1]) / 2, frontV - 0.4);
    lamps.push([lampPos[0], eaveY - 0.7, lampPos[1]]);
  }

  // the paved court before it, as on the satellite: a stone apron along the base's front (v 18.3-21.8) and a brick
  // court the base's width to v 36.5, then a stone walk on the axis to Tuy Thành Các
  const courtY = groundY(toWorld(0, 28));
  S.base = courtY - LAND_Y;
  S.kind = KIND.ROAD;
  frameBox(S, -0.4, 20.05, courtY - 0.2, courtY + 0.16, 80, 3.5, shade(COLORS.stone, 1.08));
  frameBox(S, -0.4, 29.15, courtY - 0.2, courtY + 0.14, 72, 14.7, COLORS.brick);
  frameBox(S, 0, 50.1, courtY, courtY + 0.16, 4.6, 27.2, shade(COLORS.stone, 1.08));
  frameBox(S, 2.5, 83, courtY - 0.2, courtY + 0.16, 4.6, 32, shade(COLORS.stone, 1.05));
}

function buildFrontGatesAndScreen(S, lamps) {
  // Thái Miếu Môn in the front wall (OSM "Miếu Môn", ~54 m2): three doors under a yellow glazed roof
  const mainGatePos = toWorld(2.9, 100.6);
  const mainGateY = groundY(mainGatePos);
  S.base = mainGateY - LAND_Y;
  S.kind = KIND.MASONRY;
  S.box(mainGatePos[0], mainGatePos[1], mainGateY - 0.3, mainGateY + 0.35, 15.2, 5.6, COMPOUND_ANGLE, COLORS.stone, { topKind: KIND.ROAD });
  buildWallGate(S, mainGatePos, COMPOUND_ANGLE, 13.8, 4.0, mainGateY + 0.35, { h: 3.9, doors: 3 });
  // a second, smaller roof tier over the middle door, its eave clear of the gate roof's ridge (mainGateY + 5.8) under it
  S.kind = KIND.MASONRY;
  S.box(mainGatePos[0], mainGatePos[1], mainGateY + 4.5, mainGateY + 6.0, 5.0, 2.2, COMPOUND_ANGLE, COLORS.wall);
  S.hip(mainGatePos[0], mainGatePos[1], 5.0, 2.2, COMPOUND_ANGLE, mainGateY + 6.0, 1.3, COLORS.roof, {
    flare: 0.35, over: 0.6, ridgeCol: COLORS.ridge, fascia: 0.16, fasciaCol: shade(COLORS.lacquer, 0.7), hips: true, glazed: true, segs: 3,
  });
  S.kind = KIND.PLAIN;
  S.box(mainGatePos[0], mainGatePos[1], mainGateY + 7.5, mainGateY + 8.1, 0.9, 0.3, COMPOUND_ANGLE, COLORS.enamel[2]);
  lamps.push(toPoint3(2.9, 103.3, mainGateY + 3.6));

  // the bình phong (screen wall) inside the gate, restored 2025: plastered brick, tile coping, an enamel medallion
  const screenPos = toWorld(2.7, 89);
  const screenY = groundY(screenPos);
  S.base = screenY - LAND_Y;
  S.kind = KIND.MASONRY;
  S.box(screenPos[0], screenPos[1], screenY - 0.3, screenY + 0.4, 9.4, 1.4, COMPOUND_ANGLE, COLORS.stone, { topKind: KIND.ROAD });
  S.box(screenPos[0], screenPos[1], screenY + 0.4, screenY + 2.7, 8.6, 0.7, COMPOUND_ANGLE, COLORS.wall, { top: shade(COLORS.wall, 0.9) });
  for (const side of [-1, 1]) {
    const pierPos = toWorld(2.7 + side * 4.6, 89);
    S.box(pierPos[0], pierPos[1], screenY + 0.4, screenY + 3.3, 0.9, 0.9, COMPOUND_ANGLE, shade(COLORS.wall, 0.95));
  }
  S.kind = KIND.TILE;
  S.box(screenPos[0], screenPos[1], screenY + 2.7, screenY + 3.05, 8.8, 1.1, COMPOUND_ANGLE, COLORS.roof, { taper: 0.6 });
  S.kind = KIND.PLAIN;
  for (const side of [-1, 1]) {
    const medPos = toWorld(2.7, 89 + side * 0.37);
    S.cyl(medPos[0], medPos[1], screenY + 1.2, screenY + 1.21, 0.75, 0.75, 8, COLORS.enamel[0]);
  }

  // Tuy Thành Các (OSM 22.8 x 5.4 m, restored 2025): a two-storey gate pavilion on the court's front
  const tuyThanhPos = toWorld(2.1, 65.7);
  const tuyThanhY = groundY(tuyThanhPos);
  S.base = tuyThanhY - LAND_Y;
  pavilion(S, tuyThanhPos[0], tuyThanhPos[1], 20.6, 4.4, COMPOUND_ANGLE, tuyThanhY, {
    tiers: 2, wallH: 3.4, roof: COLORS.roof, wall: COLORS.lacquer, over: 1.3, rh: 2.6, platform: 0.5, ridge: COLORS.ridge, colonnade: false, segs: 3,
  });
  lamps.push([tuyThanhPos[0], tuyThanhY + 3.2, tuyThanhPos[1]]);
  // and the cross wall it stands in, with Quang Hy Môn (west) and Diên Hy Môn (east)
  for (const [gateU, gateV] of [[-27.95, 67.4], [30.35, 68.5]]) {
    const pos = toWorld(gateU, gateV);
    buildWallGate(S, pos, COMPOUND_ANGLE, 7.9, 2.5, groundY(pos), { h: 3.0 });
  }
}

function buildSideHalls(S, lamps) {
  // Chiêu Kính điện (OSM 13.1 x 14.6 m) on the east of the court, facing it; Long Đức điện (13.0 x 14.4 m) east
  // of the main base. Both restored, yellow glazed roofs, red lacquered timber.
  const chieuKinhPos = toWorld(51, 43.8);
  const chieuKinhY = groundY(chieuKinhPos);
  S.base = chieuKinhY - LAND_Y;
  pavilion(S, chieuKinhPos[0], chieuKinhPos[1], 13.4, 11.4, ACROSS_ANGLE, chieuKinhY, {
    wallH: 3.0, roof: COLORS.roof, wall: COLORS.lacquer, over: 1.2, rh: 2.4, platform: 0.6, colonnade: true, segs: 3,
  });
  const longDucPos = toWorld(51.3, 1.4);
  const longDucY = groundY(longDucPos);
  S.base = longDucY - LAND_Y;
  pavilion(S, longDucPos[0], longDucPos[1], 11.4, 11.6, COMPOUND_ANGLE, longDucY, {
    wallH: 2.9, roof: COLORS.roof, wall: COLORS.lacquer, over: 1.2, rh: 2.3, platform: 0.6, colonnade: true, segs: 3,
  });
  lamps.push(toPoint3(51.3, 8.2, longDucY + 3.0));
  lamps.push(toPoint3(44.6, 43.8, chieuKinhY + 3.1));

  // as they stood before 1947 (today their bases only): Mục Tư điện on the west of the court, mirroring Chiêu Kính;
  // Thổ Công từ west of the main hall (OSM 9 x 12 m with its terrace), facing the hall; Tả and Hữu Tùng tự facing
  // each other across the court. Each is drawn within the outline of its restored base.
  const mucTuPos = toWorld(-51, 43.8);
  const mucTuY = groundY(mucTuPos);
  S.base = mucTuY - LAND_Y;
  pavilion(S, mucTuPos[0], mucTuPos[1], 13.4, 11.4, ACROSS_ANGLE, mucTuY, {
    wallH: 3.0, roof: COLORS.roof, wall: COLORS.lacquer, over: 1.2, rh: 2.4, platform: 0.6, colonnade: true, segs: 3,
  });
  lamps.push(toPoint3(-44.6, 43.8, mucTuY + 3.1));
  const thoCongPos = toWorld(-53.5, 0.4);
  const thoCongY = groundY(thoCongPos);
  S.base = thoCongY - LAND_Y;
  pavilion(S, thoCongPos[0], thoCongPos[1], 8.6, 5.6, ACROSS_ANGLE, thoCongY, {
    wallH: 2.7, roof: COLORS.roof, wall: COLORS.lacquer, over: 1.0, rh: 2.0, platform: 0.5, colonnade: true, segs: 3,
  });
  for (const side of [-1, 1]) {
    const tungTuPos = toWorld(side * 31, 37);
    const tungTuY = groundY(tungTuPos);
    S.base = tungTuY - LAND_Y;
    pavilion(S, tungTuPos[0], tungTuPos[1], 9.6, 5.2, ACROSS_ANGLE, tungTuY, {
      wallH: 2.8, roof: COLORS.roof, wall: COLORS.lacquer, over: 1.0, rh: 2.0, platform: 0.4, colonnade: true, segs: 3,
    });
  }
}

function buildCompoundWalls(S, data) {
  const nearbyRoads = roadsNear(data, COMPOUND_CENTER, 200);
  const crossWallPts = CROSS_WALL_LOCAL.map(([u, v]) => toWorld(u, v));
  const mainGatePos = toWorld(2.9, 100.6);
  // gates in the cross wall to the back yard: Hiển Thừa Môn (east) and Túc Tướng Môn (west), positions estimated
  const backGates = [toWorld(40, -13.3), toWorld(-40, -14.5)];
  // the back yard's walls (OUTER_WALL_LOCAL between the two ends of CROSS_WALL_LOCAL) are Triệu Miếu's, drawn by trieumieu.js with its gates
  const frontWallPts = FRONT_WALL_LOCAL.map(([u, v]) => toWorld(u, v));
  fence(S, frontWallPts, FENCE.imperial, { closed: false, roads: nearbyRoads, openings: [[mainGatePos[0], mainGatePos[1], 13.6]] });
  fence(S, crossWallPts, FENCE.imperial, { closed: false, roads: nearbyRoads, openings: backGates.map((pos) => [pos[0], pos[1], 4.6]) });
  for (const gatePos of backGates) buildWallGate(S, gatePos, COMPOUND_ANGLE, 5.0, 1.6, groundY(gatePos));
  // the cross wall of Tuy Thành Các, between the gates
  for (const [ptA, ptB] of TUY_THANH_WALLS) {
    fence(S, [toWorld(ptA[0], ptA[1]), toWorld(ptB[0], ptB[1])], FENCE.imperial, { closed: false, roads: nearbyRoads });
  }
}

export function build({ data, S, group }) {
  // the mapped outlines inside the compound are all drawn here (or are gone: the 1972 hall, a site shed); take them
  // out of data.bld so the city builder leaves the ground to this model
  const outerRing = OUTER_WALL_LOCAL.map(([u, v]) => toWorld(u, v));
  if (Array.isArray(data.bld)) {
    for (let i = data.bld.length - 1; i >= 0; i--) {
      const flatPoly = data.bld[i][0];
      let sumX = 0;
      let sumZ = 0;
      const vertCount = flatPoly.length / 2;
      for (let k = 0; k < flatPoly.length; k += 2) {
        sumX += flatPoly[k];
        sumZ += flatPoly[k + 1];
      }
      if (inRing(sumX / vertCount / 10, sumZ / vertCount / 10, outerRing)) data.bld.splice(i, 1);
    }
  }
  // no tree grows out of a base, a hall or the paved walk: the mapped trees standing on one are taken out
  if (Array.isArray(data.trees)) {
    const trees = data.trees;
    const nearCount = data.meta?.counts?.treesNear;
    for (let i = trees.length / 4 - 1; i >= 0; i--) {
      const dx = trees[i * 4] / 10 - COMPOUND_CENTER[0];
      const dz = trees[i * 4 + 1] / 10 - COMPOUND_CENTER[1];
      const localU = dx * AXIS_COS + dz * AXIS_SIN;
      const localV = -dx * AXIS_SIN + dz * AXIS_COS;
      if (!TREE_CLEAR_BOXES.some(([cu, cv, su, sv]) => Math.abs(localU - cu) < su / 2 && Math.abs(localV - cv) < sv / 2)) continue;
      trees.splice(i * 4, 4);
      if (nearCount != null && i < nearCount) data.meta.counts.treesNear--;
    }
  }
  const lamps = [];
  buildMainTempleHall(S, lamps);
  buildFrontGatesAndScreen(S, lamps);
  buildSideHalls(S, lamps);
  buildCompoundWalls(S, data);

  S.kind = KIND.PLAIN;
  S.base = 0;
  const lampCoords = [];
  const lampColors = [];
  for (const lampPos of lamps) {
    lampCoords.push(...lampPos);
    lampColors.push(1, 0.62, 0.3);
  }
  const glowMesh = glowPoints(lampCoords, lampColors, 4);
  glowMesh.userData.glow = true;
  glowMesh.userData.landmark = id;
  group.add(glowMesh);
}
