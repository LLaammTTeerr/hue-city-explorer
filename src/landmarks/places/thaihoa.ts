import { Buf, KIND, hex, shade } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { lightMaterial, glowPoints } from '../../geo/materials.ts';
import { vac, crane, kylan } from '../props.ts';

// Điện Thái Hòa (Throne Palace) with sân Đại Triều Nghi and cầu Trung Đạo over hồ Thái Dịch, as restored in
// 2021-2024 (reopened 23 Nov 2024). Sources and estimates: docs/places/thaihoa.md.
//
// Plan (trùng thiềm điệp ốc): a front hall (tiền điện, 7 gian 2 chái) and a deeper main hall (chính điện,
// 5 gian 2 chái kép) under joined roofs of yellow glazed tiles, with a bronze valley gutter between them. 80 lim
// columns, red lacquered: 10 across (9 bays) by 8 deep. The main hall has a double roof: a lower skirt, the cổ diêm
// band of enamelled poem panels, the upper hip roof with "two dragons facing the sun" on its ridge.
// The hall floor is 2.35 m above the ground and 1 m above the first terrace (khamphahue.com.vn); from the back,
// 9 steps up the lower base and 5 up the upper one; the esplanade's two terraces (Long Trì, Đan Bệ) together 9.
// Ridge 11.8 m (docs/heights-reference.json).
//
// Frame: u across the hall (north-east), v from the hall toward Ngọ Môn (south-east); origin on the axis at the
// hall's centre. From OSM: way 531031566 (hall, 44.8 × 32.1 m), 285990342 (sân Đại Triều Nghi, 41 × 41 m),
// 619851682 (cầu Trung Đạo, 51 × 8.9 m), 173640276 (hồ Thái Dịch). The hall outline sits 1.4 m off the axis that
// the esplanade, the bridge and Ngọ Môn share; the axis here splits the difference.
export const id = 'thaihoa';

const HALL_ORIGIN = [-1118.6, 17.4];
const AXIS_FORWARD = [0.5978, 0.8016]; // toward Ngọ Môn
const AXIS_RIGHT = [0.8016, -0.5978];
const HALL_ANGLE = Math.atan2(AXIS_RIGHT[1], AXIS_RIGHT[0]);
const toWorld = (localU, localV): [number, number] => [
  HALL_ORIGIN[0] + AXIS_RIGHT[0] * localU + AXIS_FORWARD[0] * localV,
  HALL_ORIGIN[1] + AXIS_RIGHT[1] * localU + AXIS_FORWARD[1] * localV,
];
const toPoint3 = (localU, y, localV) => {
  const pos = toWorld(localU, localV);
  return [pos[0], y, pos[1]];
};

const COLORS = {
  stone: hex('#9b998f'), // Thanh Hóa stone, blue-grey
  pave: hex('#a8a296'),
  paveLower: hex('#b4ad9f'),
  red: hex('#9a2a1e'),
  redDark: hex('#6e1f17'),
  gold: hex('#d2a43c'),
  bronze: hex('#5d4a31'),
  enamel: [hex('#2f6aa3'), hex('#3d8a5c'), hex('#d8b23a'), hex('#e6dcc4')],
  roof: shade(PAL.imperialRoof, 0.92), // warm golden imperial glaze
  ridge: hex('#f1d77a'),
  wall: hex('#dfd6c2'), // cream-white plastered masonry of the gable and back walls (2024 restoration)
  brick: hex('#b8a490'), // the brick paving round the hall and beside the stone esplanade (satellite)
  steleFace: hex('#c7c1b2'),
  bridgeRail: hex('#d8cdb5'),
  lightTint: 0xffae42,
};

// levels above the ground: Long Trì 0.6, Đan Bệ and the hall's lower base 1.35, hall floor 2.35
const LEVEL_LONG_TRI = 0.6;
const LEVEL_DAN_BE = 1.35;
const LEVEL_FLOOR = 2.35;
// The hall stands 2.5 m back (toward -v) from the place origin, behind a deeper Đan Bệ: Google's satellite view (2026,
// z19 and z20) puts the roof's centre 2.8 m behind the OSM outline's, and the brick base round it 2.5-3.5 m further
// out than the outline implied, while the sân and the bridge match OSM within 1 m. The esplanade and bridge stay put.
const HALL_OFFSET_V = -2.5;
// the hall's lower base (Đan Bệ's level), brick-paved: its edges as the satellite shows them, in the hall's frame
const LOWER_BASE_U0 = -29.6;
const LOWER_BASE_U1 = 28.4;
const LOWER_BASE_V0 = -22.8;
const PLATFORM_WIDTH = 46.5;
const PLATFORM_DEPTH = 34; // the stone platform, 1 m above it
const ESPLANADE_WIDTH = 41;
const DAN_BE_V0 = 20;
const DAN_BE_V1 = 33;
const LONG_TRI_V1 = 57.5;
const DAN_BE_STONE_V0 = PLATFORM_DEPTH / 2 + HALL_OFFSET_V;

const HALF_COLUMN_SPAN = 20.1;
const BAY_WEIGHTS = [3.4, 3.8, 4.8, 5.4, 6.2, 5.4, 4.8, 3.8, 3.4];
const COLUMN_V_OFFSETS = [13.7, 10.82, 6.33, 2.74, -1.57, -6.42, -10.73, -13.7];
const OUTER_COLUMN_HEIGHT = 3.9; // outer columns, floor to the eave plate: about the height of the upper roof, as the front reads from the esplanade
const BRIDGE_V0 = 68.7;
const BRIDGE_V1 = 119.8;
const BRIDGE_WIDTH = 8.9;

function createHelpers(S) {
  const box = (localU, localV, yMin, yMax, width, depth, color, opts?) => {
    const pos = toWorld(localU, localV);
    S.box(pos[0], pos[1], yMin, yMax, width, depth, HALL_ANGLE, color, opts);
  };
  const beam = (startPt, endPt, width, height, color?) => S.beam(startPt, endPt, width, height, color);
  // flight of stepCount steps rising toward -dir (dir = +1: the flight comes down toward +v), centred at localU,
  // from level yBottom to yTop, the top edge at v = vEdge; with stone cheek walls either side
  const flight = (localU, vEdge, dir, yBottom, yTop, stepCount, width, { cheeks = true, dragons = false }: Record<string, any> = {}) => {
    const stepH = (yTop - yBottom) / stepCount;
    const tread = 0.36;
    S.kind = KIND.MASONRY;
    for (let k = 1; k < stepCount + 1; k++) {
      box(localU, vEdge + dir * tread * (k - 0.5), yBottom - 0.2, yTop - stepH * k + 0.001, width, tread, shade(COLORS.stone, 1.06), { topKind: KIND.ROAD });
    }
    S.kind = KIND.PLAIN;
    if (!cheeks) return;
    const runLen = tread * stepCount;
    for (const side of [-1, 1]) {
      const cheekU = localU + side * (width / 2 + 0.22);
      box(cheekU, vEdge + dir * 0.2, yBottom - 0.2, yTop + 0.3, 0.44, 0.5, COLORS.stone);
      beam(toPoint3(cheekU, yTop + 0.18, vEdge + dir * 0.2), toPoint3(cheekU, yBottom + 0.2, vEdge + dir * (runLen + 0.1)), 0.4, 0.4, COLORS.stone);
      if (dragons) {
        beam(toPoint3(cheekU, yTop + 0.5, vEdge + dir * 0.3), toPoint3(cheekU, yBottom + 0.55, vEdge + dir * (runLen - 0.1)), 0.26, 0.3, shade(COLORS.stone, 1.12)); // the stone dragon on the balustrade
      }
    }
  };
  return { box, beam, flight };
}

function buildEsplanade(S, helpers, groundY) {
  const { box, flight } = helpers;
  // ======== sân Đại Triều Nghi ========
  // v from the hall's lower base (20) to the bridge apron (57.5); 41 m wide. Đan Bệ (ranks 1-3) above, Long Trì
  // (ranks 4-9) below, a raised imperial way (ngự đạo) up the middle.
  // Đan Bệ's stone runs back to the foot of the hall's platform (DAN_BE_STONE_V0); where its sides fall to the brick aprons the
  // lower base ends (DAN_BE_V0).
  const pavedStart = S.n;
  S.kind = KIND.MASONRY;
  box(0, (DAN_BE_STONE_V0 + DAN_BE_V1) / 2, groundY - 0.3, groundY + LEVEL_DAN_BE, ESPLANADE_WIDTH, DAN_BE_V1 - DAN_BE_STONE_V0, COLORS.pave, { topKind: KIND.ROAD });
  box(0, (DAN_BE_V1 + LONG_TRI_V1) / 2, groundY - 0.3, groundY + LEVEL_LONG_TRI, ESPLANADE_WIDTH, LONG_TRI_V1 - DAN_BE_V1, COLORS.paveLower, { topKind: KIND.ROAD });
  // the imperial way, a shade lighter and a hand higher
  box(0, (DAN_BE_STONE_V0 + DAN_BE_V1) / 2 + 0.9, groundY + LEVEL_DAN_BE, groundY + LEVEL_DAN_BE + 0.08, 3.4, DAN_BE_V1 - DAN_BE_STONE_V0 - 1.8, shade(COLORS.pave, 1.12), { topKind: KIND.ROAD });
  // the brick aprons either side of the stone esplanade, out to the low walls of the hall's court (satellite)
  for (const [uStart, uEnd] of [[LOWER_BASE_U0, -ESPLANADE_WIDTH / 2], [ESPLANADE_WIDTH / 2, LOWER_BASE_U1]]) {
    box((uStart + uEnd) / 2, (DAN_BE_V0 + LONG_TRI_V1) / 2, groundY - 0.3, groundY + 0.25, uEnd - uStart, LONG_TRI_V1 - DAN_BE_V0, COLORS.brick, { topKind: KIND.ROAD });
  }
  box(0, (DAN_BE_V1 + LONG_TRI_V1) / 2 - 0.6, groundY + LEVEL_LONG_TRI, groundY + LEVEL_LONG_TRI + 0.08, 3.4, LONG_TRI_V1 - DAN_BE_V1 - 1.2, shade(COLORS.paveLower, 1.1), { topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;
  // steps: Long Trì → Đan Bệ (5) in three flights, the middle one between dragon balustrades; ground → Long Trì (4)
  for (const flightU of [-12, 0, 12]) flight(flightU, DAN_BE_V1, 1, groundY + LEVEL_LONG_TRI, groundY + LEVEL_DAN_BE, 5, flightU === 0 ? 3.4 : 3.0, { dragons: flightU === 0 });
  for (const flightU of [-12, 0, 12]) flight(flightU, LONG_TRI_V1, 1, groundY, groundY + LEVEL_LONG_TRI, 4, flightU === 0 ? 3.4 : 3.0, { dragons: flightU === 0 });
  // low stone kerbs along the open sides of both terraces
  for (const side of [-1, 1]) {
    box(side * (ESPLANADE_WIDTH / 2 - 0.2), (DAN_BE_V0 + DAN_BE_V1) / 2, groundY + LEVEL_DAN_BE, groundY + LEVEL_DAN_BE + 0.45, 0.4, DAN_BE_V1 - DAN_BE_V0, COLORS.stone);
    box(side * (ESPLANADE_WIDTH / 2 - 0.2), (DAN_BE_V1 + LONG_TRI_V1) / 2, groundY + LEVEL_LONG_TRI, groundY + LEVEL_LONG_TRI + 0.3, 0.4, LONG_TRI_V1 - DAN_BE_V1, COLORS.stone);
  }
  for (const [uStart, uEnd] of [[-ESPLANADE_WIDTH / 2, -13.7], [-10.3, -1.9], [1.9, 10.3], [13.7, ESPLANADE_WIDTH / 2]]) {
    box((uStart + uEnd) / 2, DAN_BE_V1 - 0.2, groundY + LEVEL_DAN_BE, groundY + LEVEL_DAN_BE + 0.45, uEnd - uStart, 0.4, COLORS.stone);
  }
  // the rank stones (phẩm sơn): chánh and tòng for each rank, civil on one side of the way, military on the other —
  // 6 a side on Đan Bệ, 12 a side on Long Trì, 18 pairs in all
  // Each is a low stone, about knee high, on a small plinth (Street View from the esplanade).
  const buildStele = (localU, localV, y) => {
    box(localU, localV, y, y + 0.08, 0.5, 0.3, shade(COLORS.stone, 0.9));
    box(localU, localV, y + 0.08, y + 0.48, 0.38, 0.16, COLORS.steleFace);
    box(localU, localV, y + 0.48, y + 0.55, 0.28, 0.16, COLORS.steleFace);
  };
  for (const side of [-1, 1]) {
    for (let k = 0; k < 6; k++) buildStele(side * 4.6, DAN_BE_V0 + 1.6 + k * 1.95, groundY + LEVEL_DAN_BE);
    for (let k = 0; k < 12; k++) buildStele(side * 4.6, DAN_BE_V1 + 2.4 + k * 1.85, groundY + LEVEL_LONG_TRI);
  }
  (S.paved = S.paved || []).push([pavedStart, S.n]); // stone paving: no trees, no houses (src/geo/city.js coverOf)
  // one bronze cauldron (vạc đồng, cast under the Nguyễn lords) on the hall's left, the east (khamphahue: "on the left
  // side of the Thái Hòa Palace"); its spot on Đan Bệ is estimated. No source gives a second vạc or any censer here.
  const vacPos = toWorld(15, DAN_BE_V0 + 6.5);
  vac(S, vacPos[0], groundY + LEVEL_DAN_BE, vacPos[1], HALL_ANGLE, { d: 1.9, col: COLORS.bronze });
  // a pair of kỳ lân in front of the hall (Frommers: "In front are two mythical ky lin animals"), bronze, either side
  // of the foot of the middle flight, facing out toward Ngọ Môn; material, pose and spot are estimated.
  // src/landmarks/props.js; docs/places/courtyard-objects.md
  for (const side of [-1, 1]) {
    const kylanPos = toWorld(side * 4.3, PLATFORM_DEPTH / 2 + HALL_OFFSET_V + 2.4);
    kylan(S, kylanPos[0], groundY + LEVEL_DAN_BE, kylanPos[1], HALL_ANGLE + Math.PI / 2, { s: 1.0, col: COLORS.bronze, plinth: 0.55, plinthCol: COLORS.stone });
  }
}

function buildHallBase(S, helpers, groundY, floorY) {
  const { box, flight } = helpers;
  // ======== the hall's two-stage base ========
  // the lower base at Đan Bệ's level all round (9 steps up at the back), brick-paved, with stone sides; in front it
  // gives way to Đan Bệ's stone between its side strips. The stone platform 1 m above it.
  const baseStart = S.n;
  S.kind = KIND.MASONRY;
  box((LOWER_BASE_U0 + LOWER_BASE_U1) / 2, (LOWER_BASE_V0 + DAN_BE_STONE_V0) / 2, groundY - 0.3, groundY + LEVEL_DAN_BE, LOWER_BASE_U1 - LOWER_BASE_U0, DAN_BE_STONE_V0 - LOWER_BASE_V0, COLORS.stone, { top: COLORS.brick, topKind: KIND.ROAD });
  for (const [uStart, uEnd] of [[LOWER_BASE_U0, -ESPLANADE_WIDTH / 2], [ESPLANADE_WIDTH / 2, LOWER_BASE_U1]]) {
    box((uStart + uEnd) / 2, (DAN_BE_STONE_V0 + DAN_BE_V0) / 2, groundY - 0.3, groundY + LEVEL_DAN_BE, uEnd - uStart, DAN_BE_V0 - DAN_BE_STONE_V0, COLORS.stone, { top: COLORS.brick, topKind: KIND.ROAD });
  }
  box(0, HALL_OFFSET_V, groundY + LEVEL_DAN_BE, floorY, PLATFORM_WIDTH, PLATFORM_DEPTH, shade(COLORS.stone, 0.96), { topKind: KIND.ROAD });
  box(0, HALL_OFFSET_V, floorY - 0.18, floorY + 0.02, PLATFORM_WIDTH + 0.3, PLATFORM_DEPTH + 0.3, shade(COLORS.stone, 1.1), { topKind: KIND.ROAD }); // the coping
  S.kind = KIND.PLAIN;
  S.paved.push([baseStart, S.n]);
  // three flights front and back up the platform (5 steps), three down the back of the lower base (9)
  for (const flightU of [-13, 0, 13]) {
    flight(flightU, PLATFORM_DEPTH / 2 + HALL_OFFSET_V, 1, groundY + LEVEL_DAN_BE, floorY, 5, flightU === 0 ? 4.2 : 3.2, { dragons: flightU === 0 });
    flight(flightU, -PLATFORM_DEPTH / 2 + HALL_OFFSET_V, -1, groundY + LEVEL_DAN_BE, floorY, 5, flightU === 0 ? 4.2 : 3.2, { dragons: flightU === 0 });
    flight(flightU, LOWER_BASE_V0, -1, groundY, groundY + LEVEL_DAN_BE, 9, flightU === 0 ? 4.2 : 3.2);
  }
}

function buildThroneAndCanopy(box, floorY) {
  // the throne (ngai vàng) in the middle of the hall, between the cranes, facing Ngọ Môn. daidoanket.vn (2016):
  // "Ngai cao 101 cm, rộng 72 cm, dài 87 cm", its base "dài 118 cm, rộng 90 cm, cao 20 cm", carved and gilt; vtcnews
  // / baophapluat: a throne on three wooden tiers ("ba tầng bệ gỗ") under a gilt bửu tán. daidoanket.vn (2024): the
  // bửu tán is carved gilt wood (Khải Định, 1923), two dragons facing a Thọ on each face, a dragon head at each corner.
  // Tier sizes and heights and the canopy's size and height are estimated.
  const throneV = -4.0 + HALL_OFFSET_V; // the dais's centre, in the middle bay between the column rows at v -1.57 and -6.42
  let tierY = floorY;
  for (const [tierW, tierD, tierH, tierCol] of [
    [3.4, 3.0, 0.2, COLORS.redDark],
    [2.7, 2.4, 0.2, COLORS.red],
    [2.0, 1.8, 0.2, COLORS.redDark],
  ] as any[]) {
    box(0, throneV, tierY, tierY + tierH, tierW, tierD, tierCol);
    box(0, throneV, tierY + tierH - 0.04, tierY + tierH, tierW + 0.04, tierD + 0.04, COLORS.gold); // a gilt edge on each tier
    tierY += tierH;
  }
  box(0, throneV, tierY, tierY + 0.2, 1.18, 0.9, COLORS.gold); // the throne's base, 118 x 90 x 20 cm
  tierY += 0.2;
  const seatV = throneV - 0.05;
  const seatY = tierY + 0.45; // the seat
  box(0, seatV, tierY, seatY, 0.72, 0.87, shade(COLORS.gold, 0.9));
  box(0, seatV - 0.39, seatY, tierY + 1.01, 0.72, 0.09, COLORS.gold); // the back, to 101 cm
  box(0, seatV - 0.39, tierY + 0.95, tierY + 1.01, 0.82, 0.12, shade(COLORS.gold, 1.1)); // its carved crest
  for (const side of [-1, 1]) box(side * 0.33, seatV, seatY, seatY + 0.25, 0.07, 0.8, COLORS.gold); // the arms
  box(0, seatV - 0.34, seatY + 0.05, tierY + 0.92, 0.5, 0.02, COLORS.red); // the red lacquer panel of the back
  // the bửu tán: a square gilt canopy hung from the roof framing over the throne, a carved valance on each face and a
  // dragon head rising at each corner
  const canopyW = 2.4;
  const canopyY0 = floorY + 2.9;
  const canopyY1 = floorY + 3.3;
  box(0, throneV, canopyY1, canopyY1 + 0.08, canopyW + 0.2, canopyW + 0.2, shade(COLORS.gold, 0.85));
  for (const side of [-1, 1]) {
    box(0, throneV + side * canopyW / 2, canopyY0, canopyY1, canopyW, 0.06, COLORS.gold);
    box(side * canopyW / 2, throneV, canopyY0, canopyY1, 0.06, canopyW, COLORS.gold);
    box(0, throneV + side * (canopyW / 2 + 0.035), canopyY0 + 0.12, canopyY1 - 0.1, canopyW * 0.6, 0.02, COLORS.red);
    for (const cornerSide of [-1, 1]) {
      box(side * canopyW / 2, throneV + cornerSide * canopyW / 2, canopyY1, canopyY1 + 0.35, 0.14, 0.14, shade(COLORS.gold, 1.1)); // the corner dragon heads
      box(side * (canopyW / 2 - 0.1), throneV + cornerSide * (canopyW / 2 - 0.1), canopyY1 + 0.08, floorY + OUTER_COLUMN_HEIGHT - 0.3, 0.04, 0.04, COLORS.redDark); // the hangers
    }
  }
}

function buildColumnsAndInterior(S, helpers, floorY, colU, colV) {
  const { box, beam } = helpers;
  // ======== columns ========
  // 9 bays across, widest in the middle; 7 spaces deep: front verandah, front hall, the join, the main hall.
  // The outer columns stand 40.2 × 27.4 m apart, so that with the 1.9 m overhang the eaves cover about 44 × 31 m:
  // the roof outline on Google's satellite view (2026), which OSM's 44.8 × 32.1 m way also traces. (Until 2026 the
  // OSM outline was read as the column line, and the roof stood about 1.5 m too far out on every side.)
  const columnTopY = (i, j) => {
    const isInner = i > 0 && i < 9;
    if (j === 3) return floorY + OUTER_COLUMN_HEIGHT + 0.3; // under the valley between the two roofs
    if (j >= 4 && j <= 6 && isInner && i > 1 && i < 8) return floorY + 6.4; // the main hall's tall inner columns
    if ((j === 1 || j === 2) && isInner) return floorY + OUTER_COLUMN_HEIGHT + 0.6;
    return floorY + OUTER_COLUMN_HEIGHT;
  };
  S.kind = KIND.TIMBER;
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 8; j++) {
      const pos = toWorld(colU[i], colV[j]);
      const topY = columnTopY(i, j);
      S.cyl(pos[0], pos[1], floorY, floorY + 0.3, 0.46, 0.42, 8, shade(COLORS.stone, 1.05), { cap: false }); // the stone base
      S.cyl(pos[0], pos[1], floorY + 0.3, topY, 0.3, 0.28, 8, COLORS.red, { cap: false });
      if (j > 0 && j < 7) {
        S.cyl(pos[0], pos[1], floorY + 2.2, floorY + 2.5, 0.305, 0.3, 8, COLORS.gold, { cap: false }); // a gilded band on the inner columns only: the verandah row reads plain red in Street View
      }
    }
  }
  // the crane and tortoise statues inside the hall (Frommers: "the statues of the heron and turtle inside the palace's
  // ornate lacquered interior"): drawn as a bronze pair of cranes on tortoises either side of the throne in the main
  // hall's middle bay, facing out; count, material, size and spot are estimated
  for (const side of [-1, 1]) {
    const cranePos = toWorld(side * 2.3, -3.2 + HALL_OFFSET_V);
    crane(S, cranePos[0], floorY, cranePos[1], HALL_ANGLE + Math.PI / 2, { h: 1.8 });
  }
  buildThroneAndCanopy(box, floorY);
  S.kind = KIND.TIMBER;
  // the eave plates along the outer column lines
  for (const j of [0, 7]) beam(toPoint3(colU[0], floorY + OUTER_COLUMN_HEIGHT - 0.15, colV[j]), toPoint3(colU[9], floorY + OUTER_COLUMN_HEIGHT - 0.15, colV[j]), 0.34, 0.4, COLORS.redDark);
  for (const i of [0, 9]) beam(toPoint3(colU[i], floorY + OUTER_COLUMN_HEIGHT - 0.15, colV[0]), toPoint3(colU[i], floorY + OUTER_COLUMN_HEIGHT - 0.15, colV[7]), 0.34, 0.4, COLORS.redDark);
}

function buildWallsAndDoors(S, box, floorY, colU, colV) {
  // ======== walls and doors ========
  // the front: the outer row stands free along a verandah; behind it, the 7 middle bays are door leaves (52 in all),
  // the end bays solid. Gables and the back are walled, with doors in the middle bays at the back.
  S.kind = KIND.TIMBER;
  // `openBays`: bays whose leaves stand folded back against the jambs, swung into the hall, so the throne bay can be seen
  const buildDoorRow = (rowV, fromIdx, toIdx, doorH, openBays: number[] = []) => {
    for (let i = fromIdx; i < toIdx; i++) {
      const uStart = colU[i] + 0.3;
      const uEnd = colU[i + 1] - 0.3;
      const bayW = uEnd - uStart;
      const centerU = (uStart + uEnd) / 2;
      const leafCount = Math.max(2, Math.round(bayW / 0.85));
      if (openBays.includes(i)) {
        const leafW = bayW / leafCount;
        const stackThick = 0.07 * Math.ceil(leafCount / 2);
        const inwardSign = -Math.sign(rowV);
        for (const [edgeU, edgeSign] of [[uStart, 1], [uEnd, -1]]) {
          box(edgeU + edgeSign * stackThick / 2, rowV + inwardSign * leafW / 2, floorY, floorY + doorH - 0.7, stackThick, leafW, shade(COLORS.red, 0.8)); // the folded stack
          box(edgeU + edgeSign * (stackThick + 0.01), rowV + inwardSign * leafW / 2, floorY + 0.3, floorY + doorH - 1.0, 0.02, leafW * 0.7, shade(COLORS.gold, 0.8));
        }
        box(centerU, rowV, floorY + doorH - 0.7, floorY + doorH, bayW, 0.14, shade(COLORS.red, 0.8)); // the head over the opening
      } else {
        box(centerU, rowV, floorY, floorY + doorH, bayW, 0.14, shade(COLORS.red, 0.8));
        for (let k = 1; k < leafCount; k++) {
          box(uStart + (bayW * k) / leafCount, rowV + Math.sign(rowV) * 0.08, floorY, floorY + doorH - 0.7, 0.06, 0.04, COLORS.redDark);
        }
      }
      box(centerU, rowV + Math.sign(rowV) * 0.08, floorY + doorH - 0.7, floorY + doorH - 0.5, bayW, 0.04, COLORS.gold); // the gilt rail above the leaves
      box(centerU, rowV, floorY + doorH, floorY + OUTER_COLUMN_HEIGHT - 0.3, bayW, 0.12, COLORS.redDark); // the transom of carved, gilt panels
      box(centerU, rowV + Math.sign(rowV) * 0.07, floorY + doorH + 0.15, floorY + OUTER_COLUMN_HEIGHT - 0.45, bayW * 0.8, 0.04, shade(COLORS.gold, 0.8));
    }
  };
  buildDoorRow(colV[1], 1, 8, 3.1, [3, 4, 5]); // the three middle front bays open (owner's choice: show the cranes)
  buildDoorRow(colV[7] + 0.1, 2, 7, 3.1);
  // solid end bays at the front and back, and the gable walls
  for (const side of [-1, 1]) {
    const frontEndIdx = side < 0 ? 0 : 8;
    box((colU[frontEndIdx] + colU[frontEndIdx + 1]) / 2, colV[1], floorY, floorY + OUTER_COLUMN_HEIGHT - 0.3, colU[frontEndIdx + 1] - colU[frontEndIdx] - 0.5, 0.3, COLORS.wall);
    for (const i of side < 0 ? [0, 1] : [7, 8]) {
      box((colU[i] + colU[i + 1]) / 2, colV[7] + 0.1, floorY, floorY + OUTER_COLUMN_HEIGHT - 0.3, colU[i + 1] - colU[i] - 0.5, 0.3, COLORS.wall);
    }
    // the gable walls run out to the front column line, closing the ends of the verandah (Street View from the
    // esplanade: the west end is a plain wall flush with the front, a round window in it)
    box(side * HALF_COLUMN_SPAN, (colV[0] + colV[7]) / 2, floorY, floorY + OUTER_COLUMN_HEIGHT - 0.3, 0.34, colV[0] - colV[7], COLORS.wall);
    // the round windows with the character Thọ, 1.4 m across: one in each verandah end, one in each front-hall gable
    for (const windowV of [(colV[0] + colV[1]) / 2, (colV[1] + colV[3]) / 2]) {
      const winPos = toWorld(side * (HALF_COLUMN_SPAN + 0.18), windowV);
      S.cyl(winPos[0], winPos[1], floorY + 1.6, floorY + 1.62, 0.7, 0.7, 10, COLORS.gold, { cap: true });
    }
  }
  // the interior: a dark lid under the roofs (seen through the doors and from below the eaves)
  box(0, HALL_OFFSET_V, floorY + OUTER_COLUMN_HEIGHT - 0.3, floorY + OUTER_COLUMN_HEIGHT - 0.1, 2 * HALF_COLUMN_SPAN - 0.4, colV[0] - colV[7] - 0.4, shade(COLORS.redDark, 0.6), { bottom: true });
}

function buildRoofs(S, helpers, floorY, colV) {
  const { box, beam } = helpers;
  // ======== roofs ========
  S.kind = KIND.PLAIN;
  const roofOpt = { flare: 0.3, fascia: 0.32, fasciaCol: COLORS.redDark, ridgeCol: COLORS.ridge, hips: true, glazed: true, segs: 4 };
  // front hall: one hip roof over the verandah and the 7 + 2 bays, its back slope dropping into the valley. It is
  // low: seen from sân Đại Triều Nghi its ridge stays under the main hall's cổ diêm band, so the front shows three
  // bands over the columns, the front roof, the poem panels and the upper roof (Google Street View from the
  // esplanade). Eaves run nearly straight, turning up only a little at the corners.
  const frontRoofH = 1.6;
  const frontHallV = (colV[0] + colV[3]) / 2;
  const frontHallD = colV[0] - colV[3];
  const frontPos = toWorld(0, frontHallV);
  S.hip(frontPos[0], frontPos[1], 2 * HALF_COLUMN_SPAN, frontHallD, HALL_ANGLE, floorY + OUTER_COLUMN_HEIGHT, frontRoofH, COLORS.roof, { ...roofOpt, over: 1.9 });
  // main hall: the lower skirt round the whole of it...
  const mainHallV = (colV[3] + colV[7]) / 2;
  const mainHallD = colV[3] - colV[7];
  const mainPos = toWorld(0, mainHallV);
  S.hip(mainPos[0], mainPos[1], 2 * HALF_COLUMN_SPAN, mainHallD, HALL_ANGLE, floorY + OUTER_COLUMN_HEIGHT, 1.9, COLORS.roof, { ...roofOpt, ridgeCol: null, over: 1.9 });
  // ...the cổ diêm band above it, dark red framing round enamelled poem panels...
  const upperW = 31.4;
  const upperD = colV[4] - colV[6] + 2.2;
  const upperCenterV = (colV[4] + colV[6]) / 2;
  const friezeY0 = floorY + 5.6;
  const friezeY1 = floorY + 6.4;
  S.kind = KIND.TIMBER;
  box(0, upperCenterV, floorY + OUTER_COLUMN_HEIGHT + 0.6, friezeY1, upperW, upperD, COLORS.redDark, { top: shade(COLORS.roof, 0.8) });
  S.kind = KIND.PLAIN;
  const frontPanelCount = 14;
  const sidePanelCount = 5;
  for (let k = 0; k < frontPanelCount; k++) {
    for (const side of [-1, 1]) {
      const panelU = -upperW / 2 + (upperW * (k + 0.5)) / frontPanelCount;
      box(panelU, upperCenterV + side * (upperD / 2 + 0.03), friezeY0 + 0.15, friezeY1 - 0.15, upperW / frontPanelCount - 0.5, 0.05, COLORS.enamel[k % 3]);
    }
  }
  for (let k = 0; k < sidePanelCount; k++) {
    for (const side of [-1, 1]) {
      const panelV = upperCenterV - upperD / 2 + (upperD * (k + 0.5)) / sidePanelCount;
      box(side * (upperW / 2 + 0.03), panelV, friezeY0 + 0.15, friezeY1 - 0.15, 0.05, upperD / sidePanelCount - 0.5, COLORS.enamel[(k + 1) % 3]);
    }
  }
  // ...and the upper hip roof. Ridge at about 11.8 m above the ground.
  const upperRoofH = 2.95;
  const upperPos = toWorld(0, upperCenterV);
  S.hip(upperPos[0], upperPos[1], upperW, upperD, HALL_ANGLE, friezeY1, upperRoofH, COLORS.roof, { ...roofOpt, over: 1.6 });
  const ridgeY = friezeY1 + upperRoofH + 0.3;
  // "two dragons facing the sun" (lưỡng long chầu nhật) on the main ridge: a flaming disc and two enamelled dragons
  const sunRadius = 0.55;
  const sunCenterY = ridgeY + 0.55;
  const sunSegs = 10;
  for (let k = 0; k < sunSegs; k++) {
    const ang0 = (k / sunSegs) * Math.PI * 2;
    const ang1 = ((k + 1) / sunSegs) * Math.PI * 2;
    for (const side of [-1, 1]) {
      S.tri(
        toPoint3(0, sunCenterY, upperCenterV + side * 0.06),
        toPoint3(Math.cos(ang0) * sunRadius, sunCenterY + Math.sin(ang0) * sunRadius, upperCenterV + side * 0.06),
        toPoint3(Math.cos(ang1) * sunRadius, sunCenterY + Math.sin(ang1) * sunRadius, upperCenterV + side * 0.06),
        COLORS.gold,
        [AXIS_FORWARD[0] * side, 0, AXIS_FORWARD[1] * side],
      );
    }
  }
  box(0, upperCenterV, ridgeY + 0.1, ridgeY + 0.3, 0.5, 0.3, COLORS.gold);
  for (const side of [-1, 1]) {
    let prevPt = null;
    for (let k = 0; k <= 8; k++) {
      const dragonU = side * (0.9 + k * 0.42);
      const dragonY = ridgeY + 0.25 + 0.28 * Math.sin(k * 1.2) + (k === 0 ? 0.35 : 0);
      const currPt = toPoint3(dragonU, dragonY, upperCenterV);
      if (prevPt) beam(prevPt, currPt, 0.22, 0.24, k < 2 ? COLORS.gold : COLORS.enamel[1]);
      prevPt = currPt;
    }
  }
  // the front hall's ridge: a row of enamelled panels, the middle one (Thổ) yellow
  const frontRidgeY = floorY + OUTER_COLUMN_HEIGHT + frontRoofH + 0.3;
  const frontRidgeCount = 9;
  for (let k = 0; k < frontRidgeCount; k++) {
    const panelU = -9 + (18 * (k + 0.5)) / frontRidgeCount;
    for (const side of [-1, 1]) {
      box(panelU, frontHallV + side * 0.33, frontRidgeY - 0.05, frontRidgeY + 0.3, 18 / frontRidgeCount - 0.35, 0.04, k === 4 ? COLORS.enamel[2] : COLORS.enamel[k % 2]);
    }
  }
  // the valley between the two roofs: S.joined lays its gutter, sunk between the tiles (places/index.js); it spouts
  // through two bronze dragon mouths at the gables
  const spoutY = floorY + OUTER_COLUMN_HEIGHT - 0.1;
  for (const side of [-1, 1]) {
    beam(toPoint3(side * (HALF_COLUMN_SPAN + 1.8), spoutY, colV[3]), toPoint3(side * (HALF_COLUMN_SPAN + 3.1), spoutY - 0.25, colV[3]), 0.45, 0.4, shade(COLORS.bronze, 1.25));
  }
  return { upperW, upperD, upperCenterV, friezeY1 };
}

function buildNghiMonGate(S, helpers, addLamp, gateV, baseY) {
  const { box, beam } = helpers;
  // nghi môn (Cổng Đồng / Đại Triều Nghi): iconic triple-bay gilded bronze ceremonial arch on Cầu Trung Đạo
  const innerOffset = 2.25;
  const outerOffset = 4.15;
  for (const side of [-1, 1]) {
    // tall inner bronze pillars flanking the emperor's lane
    const innerPos = toWorld(side * innerOffset, gateV);
    S.box(innerPos[0], innerPos[1], baseY, baseY + 0.48, 0.82, 0.82, HALL_ANGLE, COLORS.stone);
    S.box(innerPos[0], innerPos[1], baseY + 0.48, baseY + 4.9, 0.34, 0.34, HALL_ANGLE, COLORS.bronze);
    S.cyl(innerPos[0], innerPos[1], baseY + 4.9, baseY + 5.55, 0.3, 0.06, 7, COLORS.gold);
    // outer side pillars
    const outerPos = toWorld(side * outerOffset, gateV);
    S.box(outerPos[0], outerPos[1], baseY, baseY + 0.4, 0.68, 0.68, HALL_ANGLE, COLORS.stone);
    S.box(outerPos[0], outerPos[1], baseY + 0.4, baseY + 3.8, 0.28, 0.28, HALL_ANGLE, COLORS.bronze);
    S.cyl(outerPos[0], outerPos[1], baseY + 3.8, baseY + 4.35, 0.24, 0.05, 7, COLORS.gold);
    // side-bay lintel + gilded openwork frieze
    box(side * ((innerOffset + outerOffset) / 2), gateV, baseY + 3.15, baseY + 3.45, outerOffset - innerOffset, 0.22, COLORS.bronze);
    box(side * ((innerOffset + outerOffset) / 2), gateV, baseY + 2.75, baseY + 3.15, outerOffset - innerOffset - 0.3, 0.14, COLORS.gold);
    for (const braceSide of [-1, 1]) {
      beam(toPoint3(side * innerOffset, baseY + 4.3, gateV), toPoint3(side * innerOffset + braceSide * 0.65, baseY + 3.75, gateV), 0.12, 0.12, COLORS.gold);
    }
  }
  // central double lintel, gilded scroll frieze and imperial name plaque
  box(0, gateV, baseY + 4.25, baseY + 4.58, innerOffset * 2 + 0.5, 0.26, COLORS.bronze);
  box(0, gateV, baseY + 3.65, baseY + 3.92, innerOffset * 2 + 0.2, 0.22, COLORS.bronze);
  box(0, gateV, baseY + 3.92, baseY + 4.25, innerOffset * 2 - 0.5, 0.16, COLORS.gold);
  box(0, gateV, baseY + 3.1, baseY + 3.68, 1.85, 0.16, COLORS.gold);
  addLamp(-innerOffset, baseY + 4.8, gateV + 0.5);
  addLamp(innerOffset, baseY + 4.8, gateV + 0.5);
}

function buildTrungDaoBridge(S, helpers, addLamp, groundY) {
  const { box, beam } = helpers;
  // ======== cầu Trung Đạo over hồ Thái Dịch ========
  // 51 × 8.9 m (OSM), a brick-and-stone deck on piers, the emperor's lane raised in the middle, low openwork
  // parapets, a bronze ceremonial gate (nghi môn) at each end.
  const bridgeLen = BRIDGE_V1 - BRIDGE_V0;
  const bridgeCenterV = (BRIDGE_V0 + BRIDGE_V1) / 2;
  const deckY = groundY + 0.55;
  const waterY = groundY - 1.3;
  S.kind = KIND.MASONRY;
  box(0, bridgeCenterV, deckY - 0.55, deckY, BRIDGE_WIDTH, bridgeLen, COLORS.pave, { topKind: KIND.ROAD, bottom: true });
  box(0, bridgeCenterV, deckY, deckY + 0.12, 3.6, bridgeLen, shade(COLORS.pave, 1.12), { topKind: KIND.ROAD }); // ngự đạo
  for (const side of [-1, 1]) box(side * 1.85, bridgeCenterV, deckY, deckY + 0.22, 0.12, bridgeLen, COLORS.stone);
  // abutments and piers down into the water
  box(0, BRIDGE_V0 + 2.5, waterY - 0.6, deckY - 0.5, BRIDGE_WIDTH, 5, shade(COLORS.stone, 0.85));
  box(0, BRIDGE_V1 - 2.5, waterY - 0.6, deckY - 0.5, BRIDGE_WIDTH, 5, shade(COLORS.stone, 0.85));
  for (let k = 1; k <= 6; k++) {
    box(0, BRIDGE_V0 + 5 + ((bridgeLen - 10) * k) / 7, waterY - 0.6, deckY - 0.5, BRIDGE_WIDTH - 0.6, 1.0, shade(COLORS.stone, 0.85));
  }
  // ground apron from the esplanade's foot to the bridge
  box(0, (LONG_TRI_V1 + BRIDGE_V0 + 1) / 2, groundY - 0.3, groundY + 0.04, 12, BRIDGE_V0 + 1 - LONG_TRI_V1 + 0.6, COLORS.pave, { topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;
  // parapets: posts every 2.5 m with a rail and an openwork panel between
  for (const side of [-1, 1]) {
    const railU = side * (BRIDGE_WIDTH / 2 - 0.15);
    const postCount = Math.round(bridgeLen / 2.5);
    for (let k = 0; k <= postCount; k++) box(railU, BRIDGE_V0 + (bridgeLen * k) / postCount, deckY, deckY + 0.95, 0.28, 0.28, COLORS.bridgeRail);
    beam(toPoint3(railU, deckY + 0.82, BRIDGE_V0), toPoint3(railU, deckY + 0.82, BRIDGE_V1), 0.2, 0.16, COLORS.bridgeRail);
    beam(toPoint3(railU, deckY + 0.18, BRIDGE_V0), toPoint3(railU, deckY + 0.18, BRIDGE_V1), 0.18, 0.16, COLORS.bridgeRail);
    box(railU, bridgeCenterV, deckY + 0.3, deckY + 0.7, 0.06, bridgeLen, shade(COLORS.bridgeRail, 0.8));
  }
  buildNghiMonGate(S, helpers, addLamp, BRIDGE_V0 + 0.8, deckY + 0.12);
  buildNghiMonGate(S, helpers, addLamp, BRIDGE_V1 - 0.8, deckY + 0.12);
  return deckY;
}

function buildNightLighting(group, THREE, floorY, colV, roofInfo, deckY, lampCoords, lampColors, addLamp) {
  // ======== night lighting ========
  // strips under the front eave of each roof and along the platform's coping; lanterns at the bridge, the steps
  const lightBuf = new Buf(1200);
  const addStrip = (u0, u1, localV, y) => lightBuf.beam(toPoint3(u0, y, localV), toPoint3(u1, y, localV), 0.14, 0.1, [1, 1, 1]);
  addStrip(-(HALF_COLUMN_SPAN + 1.3), HALF_COLUMN_SPAN + 1.3, colV[0] + 1.55, floorY + OUTER_COLUMN_HEIGHT - 0.42);
  addStrip(-(roofInfo.upperW / 2 - 0.9), roofInfo.upperW / 2 - 0.9, roofInfo.upperCenterV + roofInfo.upperD / 2 + 1.3, roofInfo.friezeY1 - 0.4);
  addStrip(-(roofInfo.upperW / 2 - 0.9), roofInfo.upperW / 2 - 0.9, roofInfo.upperCenterV - roofInfo.upperD / 2 - 1.3, roofInfo.friezeY1 - 0.4);
  addStrip(-(HALF_COLUMN_SPAN + 1.3), HALF_COLUMN_SPAN + 1.3, colV[7] - 1.55, floorY + OUTER_COLUMN_HEIGHT - 0.42);
  for (const side of [-1, 1]) {
    for (let k = 0; k < 6; k++) addLamp(side * (BRIDGE_WIDTH / 2 - 0.15), deckY + 1.15, BRIDGE_V0 + 6 + k * 8);
  }
  for (const lampU of [-13, 13]) addLamp(lampU, floorY + 1.0, PLATFORM_DEPTH / 2 + HALL_OFFSET_V + 2.4);
  if (!group) return;
  if (lightBuf.n) {
    const stripMesh = new THREE.Mesh(lightBuf.geometry(), lightMaterial(COLORS.lightTint, 1.2));
    stripMesh.renderOrder = 19;
    stripMesh.userData.landmark = true;
    group.add(stripMesh);
  }
  if (lampCoords.length) {
    const glowMesh = glowPoints(lampCoords, lampColors, 6);
    glowMesh.userData.glow = true;
    glowMesh.userData.landmark = true;
    group.add(glowMesh);
  }
}

export function build({ S, group, THREE }) {
  const groundY = LAND_Y + rise(HALL_ORIGIN[0], HALL_ORIGIN[1]);
  const floorY = groundY + LEVEL_FLOOR;
  const helpers = createHelpers(S);
  const lampCoords: number[] = [];
  const lampColors: number[] = [];
  const addLamp = (localU, y, localV) => {
    const pos = toWorld(localU, localV);
    lampCoords.push(pos[0], y, pos[1]);
    lampColors.push(1.0, 0.72, 0.36);
  };

  buildEsplanade(S, helpers, groundY);
  buildHallBase(S, helpers, groundY, floorY);

  const bayScale = (2 * HALF_COLUMN_SPAN) / BAY_WEIGHTS.reduce((acc, weight) => acc + weight, 0);
  const colU = [-HALF_COLUMN_SPAN];
  for (const weight of BAY_WEIGHTS) colU.push(colU[colU.length - 1] + weight * bayScale);
  const colV = COLUMN_V_OFFSETS.map((offsetV) => offsetV + HALL_OFFSET_V);

  buildColumnsAndInterior(S, helpers, floorY, colU, colV);
  buildWallsAndDoors(S, helpers.box, floorY, colU, colV);
  const roofInfo = buildRoofs(S, helpers, floorY, colV);
  const deckY = buildTrungDaoBridge(S, helpers, addLamp, groundY);
  buildNightLighting(group, THREE, floorY, colV, roofInfo, deckY, lampCoords, lampColors, addLamp);
  return null;
}
