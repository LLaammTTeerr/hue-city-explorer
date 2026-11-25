import { KIND, hex, shade, obb, hipShape } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { fence, FENCE } from '../enclosure.ts';

// ---- Duyệt Thị Đường, the royal theatre in the south-east corner of the Forbidden Purple City ----
//
// Sources (docs/places/duyetthi.md has the full list):
//  - vi.wikipedia.org/wiki/Duyệt_Thị_đường_(Hoàng_thành_Huế): built 1826 (Minh Mạng 7) on the site of Thanh Phong
//    Đường, repaired 1829, turned into the national music school in 1962, restored 1995-2002, in use since 2003;
//    building 1,182 m² on a 11,740 m² site; a wide rectangular hall with curved gable ridges (bờ quyết); two rows
//    of lacquered ironwood columns 12 m tall; two storeys inside (the royal box upstairs facing the stage); a
//    covered gallery links it to the palace halls; Ngự Y on its right and Thượng Thiện on its left, walled off.
//  - baophapluat.vn (Nhã nhạc ... nhìn từ nhà hát Duyệt Thị Đường): ironwood hall, glazed tiles, "bốn gian hai
//    chái" (4 bays + 2 end bays), 12 m high, two storeys, in a walled square yard.
//  - vietnamtourism.vn: restored to the original form, glazed tile roof, columns red lacquer with gilding.
//  - OpenStreetMap: the hall (way 172657563, 38.4 x 22.4 m, long axis east-north-east), Duyệt Thị Môn (way
//    619851666) and the yard wall either side of it (ways 1570130373, 1570130266). The city height survey reads
//    the hall at 12.0 m to the top.
// The hall faces east-north-east along its long axis: with that front, Ngự Y (OSM 695949060) stands on its right
// and Thượng Thiện (695810763) on its left, as the wiki says, and the gallery Tả Trường Lang joins its back end.
//  - Google satellite (2026) and a photosphere taken on the hall's axis in front of the entrance: the roof plan (a
//    hipped skirt all round, ~5.6 m deep; over it a gabled upper roof ~27 x 10 m whose ridge runs out to the gable
//    ends), the grey-brown tiles, the yellow stucco walls with white pilasters, blue-framed medallion windows and a
//    grey frieze, the open three-bay portico at the front, the paved forecourt with a bronze cauldron on the axis.
//    The photo puts the gable's apex lower than the 12 m the sources give (~9 m, the gable foot ~7 m); the height
//    follows the sources until the owner settles it (GABLE_FOOT_H and RIDGE_TOP_H below; docs/places/duyetthi.md).
//  - The photosphere is taken in the gate on the hall's axis in the Tử Cấm Thành's east wall, whose plaque reads
//    閱是門: OSM maps it as a second Duyệt Thị Môn (way 695949056), drawn here from that outline.
// Estimated: the heights inside the 12 m (eave 4.6 m, upper eave 7.6 m, ridge 11.8 m), the plinth, the bay widths,
// the side and back walls (not in any capture: drawn like the front), the finials, the gates' form.

// OSM outlines, metres in the model frame (from the raw extract, data/raw)
const HALL_OUTLINE = [[-1116.2, -135.3], [-1085.3, -158.1], [-1098.7, -176.0], [-1129.6, -153.2]]; // roof outline
const NORTH_GATE_RING = [[-1105.4, -199.2], [-1107.8, -197.3], [-1107.2, -196.6], [-1104.3, -197.8]]; // Duyệt Thị Môn (619851666)
// the axial gate in the Tử Cấm Thành's east wall (OSM 695949056, also named Duyệt Thị Môn): the photosphere's gate.
// Corners in order along the wall (a0 -> a1 on the yard side... b on the outside); the wall itself is places/dainoi.js's
const AXIAL_GATE_RING = [[-1062.6, -190.3], [-1059.9, -186.6], [-1058.8, -187.4], [-1061.6, -191.1]];
const YARD_WALLS = [
  [[-1107.2, -196.6], [-1142.6, -170.8]],
  [[-1104.8, -198.4], [-1080.8, -216.0], [-1080.4, -215.4]],
];
// the Tử Cấm Thành's east wall crosses the hall's axis this far in front of the hall's centre (places/dainoi.js,
// INNER_ADD east side), and its cap is this wide (hoangthanh.js INNER.capW)
const EAST_WALL_U = 57.3;
const EAST_WALL_CAP = 1.05;

// The heights. The sources and the city survey give 12 m; the one photo of the front measures the gable's foot at
// ~7.0 m and its apex at ~9 m above the forecourt (docs/places/duyetthi.md). Until the owner chooses, the sources
// stand: GABLE_FOOT_H is the upper roof's eave (the gable's foot), RIDGE_TOP_H its ridge, both above the forecourt.
const EAVE_HEIGHT = 4.6;
const GABLE_FOOT_H = 7.6;
const RIDGE_TOP_H = 11.8;

// Colours from Google imagery (satellite and a photosphere taken on the axis in front of the hall, 2024): the roof
// reads dark grey-brown from above and grey in the photo, not the yellow glaze of the palace halls round it; the
// walls are yellow stucco with white pilasters, a grey frieze under the eave and a red-brown plinth.
const COLORS = {
  tile: hex('#6c6358'),
  ridge: hex('#d6cfbd'),
  gold: hex('#d9b04a'),
  stone: PAL.stone,
  pave: hex('#c9c3b6'),
  plinth: hex('#8c5040'),
  ochre: hex('#d9b45a'),
  wall: hex('#dcc57f'),
  pilaster: hex('#ece5d2'),
  frieze: hex('#a9aaa2'),
  blue: hex('#3f5f9c'),
  gable: hex('#9c9280'),
  mosaic: hex('#b8453a'),
  white: hex('#eeeae0'),
  celadon: hex('#6f8f7a'),
  recess: hex('#3b2c26'),
  bronze: hex('#3f3a33'),
  door: hex('#7a3426'),
  column: hex('#b3ab95'),
  hedge: hex('#4d6b3a'),
  lantern: hex('#f1d27a'),
  gateDoorDark: hex('#3a2420'),
  plaqueGrey: hex('#8d8f8a'),
};

const groundY = (x, z) => LAND_Y + rise(x, z);

export const id = 'duyetthi';

function polygonRing(centerAlong, centerY, radius, sides, rot = 0) {
  return Array.from({ length: sides }, (_, k) => [
    centerAlong + radius * Math.cos(rot + (k * 2 * Math.PI) / sides),
    centerY + radius * Math.sin(rot + (k * 2 * Math.PI) / sides),
  ]);
}

// a delicate upturned finial (the little dragons on the ridge ends): a thin S-curve from basePt, out along (dx, dz)
function buildFinial(S, basePt, dx, dz, scale = 1) {
  const ptA = [basePt[0] + dx * 0.3 * scale, basePt[1] + 0.12 * scale, basePt[2] + dz * 0.3 * scale];
  const ptB = [ptA[0] + dx * 0.16 * scale, ptA[1] + 0.42 * scale, ptA[2] + dz * 0.16 * scale];
  const ptTip = [ptB[0] - dx * 0.14 * scale, ptB[1] + 0.26 * scale, ptB[2] - dz * 0.14 * scale];
  S.beam(basePt, ptA, 0.12 * scale, 0.12 * scale, COLORS.ridge);
  S.beam(ptA, ptB, 0.1 * scale, 0.1 * scale, COLORS.ridge);
  S.beam(ptB, ptTip, 0.07 * scale, 0.07 * scale, COLORS.ridge);
  S.beam(ptA, [ptA[0] - dx * 0.22 * scale, ptA[1] + 0.28 * scale, ptA[2] - dz * 0.22 * scale], 0.05 * scale, 0.05 * scale, COLORS.ridge); // the fin
}

function createTheatreFrame(S) {
  // the hall's frame: u along the long axis toward the front (east-north-east), v across it (toward Ngự Y)
  const center = HALL_OUTLINE.reduce((acc, pt) => [acc[0] + pt[0] / 4, acc[1] + pt[1] / 4], [0, 0]);
  const edgeX = HALL_OUTLINE[1][0] - HALL_OUTLINE[0][0];
  const edgeZ = HALL_OUTLINE[1][1] - HALL_OUTLINE[0][1];
  const hallLen = Math.hypot(edgeX, edgeZ);
  const hallWidth = Math.hypot(HALL_OUTLINE[3][0] - HALL_OUTLINE[0][0], HALL_OUTLINE[3][1] - HALL_OUTLINE[0][1]);
  const axisX = edgeX / hallLen;
  const axisZ = edgeZ / hallLen;
  const angle = Math.atan2(axisZ, axisX);
  const toWorld = (localU, localV): [number, number] => [center[0] + localU * axisX - localV * axisZ, center[1] + localU * axisZ + localV * axisX];
  const toPoint3 = (localU, localV, y) => {
    const pos = toWorld(localU, localV);
    return [pos[0], y, pos[1]];
  };
  const box = (localU, localV, yMin, yMax, width, depth, color, opts?) => {
    const pos = toWorld(localU, localV);
    S.box(pos[0], pos[1], yMin, yMax, width, depth, angle, color, opts);
  };
  const hip = (localU, localV, width, depth, yBase, riseH, opts?) => {
    const pos = toWorld(localU, localV);
    S.hip(pos[0], pos[1], width, depth, angle, yBase, riseH, COLORS.tile, {
      flare: 0.5, fascia: 0.28, fasciaCol: shade(COLORS.tile, 0.6), hips: true, glazed: false, segs: 4, ...opts,
    });
  };
  const cyl = (localU, localV, yMin, yMax, r0, r1, sides, color, opts?) => {
    const pos = toWorld(localU, localV);
    S.cyl(pos[0], pos[1], yMin, yMax, r0, r1, sides, color, { rot: angle, ...opts });
  };
  // a flat panel on a wall face: axisName 'u' (front/back, the face at u = offset) or 'v' (sides, at v = offset),
  // sign its outward sign; pts are (along, y) with along running down the face
  const facePanel = (axisName, sign, offset) => {
    const ptAt = axisName === 'u' ? (along, y) => toPoint3(offset, along, y) : (along, y) => toPoint3(along, offset, y);
    const norm = axisName === 'u' ? [sign * axisX, 0, sign * axisZ] : [-sign * axisZ, 0, sign * axisX];
    return {
      at: ptAt,
      fan: (pts, color) => {
        const verts = pts.map(([along, y]) => ptAt(along, y));
        for (let k = 1; k + 1 < verts.length; k++) S.tri(verts[0], verts[k], verts[k + 1], color, norm);
      },
    };
  };
  return { center, hallLen, hallWidth, axisX, axisZ, angle, toWorld, toPoint3, box, hip, cyl, facePanel };
}

function buildForecourt(S, frame, baseY) {
  const { hallLen, hallWidth, toWorld, toPoint3, box, cyl } = frame;
  // ---- the ground: a stone apron round the hall (the satellite shows garden close up to it on three sides) and
  // the paved forecourt, which runs from the hall's front to the Tử Cấm Thành's east wall and its gate; the bronze
  // cauldron on the axis before a low hedge, a tall lamp post behind it, two bronze figures ----
  const pavedStart = S.n;
  S.kind = KIND.MASONRY;
  box(0, 0, baseY - 0.25, baseY + 0.07, hallLen + 1.6, hallWidth + 1.6, shade(COLORS.stone, 0.95));
  const foreU0 = hallLen / 2 + 0.8;
  const foreU1 = EAST_WALL_U - EAST_WALL_CAP / 2 - 0.05;
  const foreLen = foreU1 - foreU0;
  const foreMidU = (foreU0 + foreU1) / 2;
  const foreW = 28;
  box(foreMidU, 0, baseY - 0.25, baseY + 0.06, foreLen, foreW, COLORS.pave, { topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;
  for (let k = -5; k <= 5; k++) box(foreMidU, k * 2.4, baseY + 0.062, baseY + 0.07, foreLen, 0.05, shade(COLORS.pave, 0.82)); // paving joints
  for (let jointU = foreU0 + 2.4; jointU < foreU1 - 0.5; jointU += 2.4) box(jointU, 0, baseY + 0.062, baseY + 0.07, 0.05, foreW, shade(COLORS.pave, 0.82));
  (S.paved = S.paved || []).push([pavedStart, S.n]); // keep trees and houses off the forecourt
  box(hallLen / 2 + 4.2, 0, baseY + 0.06, baseY + 0.75, 1.0, 7.5, COLORS.hedge);
  cyl(hallLen / 2 + 5.6, 0, baseY + 0.06, baseY + 0.5, 0.9, 0.9, 8, shade(COLORS.stone, 0.9));
  cyl(hallLen / 2 + 5.6, 0, baseY + 0.5, baseY + 1.5, 0.55, 0.75, 10, COLORS.bronze);
  for (const side of [-1, 1]) {
    cyl(hallLen / 2 + 6.0, side * 7.2, baseY + 0.06, baseY + 0.75, 0.45, 0.45, 6, shade(COLORS.stone, 0.9));
    cyl(hallLen / 2 + 6.0, side * 7.2, baseY + 0.75, baseY + 1.7, 0.32, 0.22, 6, COLORS.bronze);
  }
  // the lamp post on the axis, rising out of the hedge to the gable's height with three lanterns
  const lampU = hallLen / 2 + 4.2;
  const lampTopY = baseY + 7.3;
  cyl(lampU, 0, baseY + 0.75, lampTopY, 0.16, 0.11, 8, COLORS.bronze);
  for (let k = 0; k < 4; k++) cyl(lampU, 0, baseY + 1.6 + k * 1.4, baseY + 1.8 + k * 1.4, 0.2, 0.2, 8, shade(COLORS.bronze, 1.3)); // carved collars
  for (const armV of [-0.75, 0, 0.75]) {
    const pos = toWorld(lampU, armV);
    const lanternY = armV ? lampTopY - 0.35 : lampTopY + 0.1;
    if (armV) S.beam(toPoint3(lampU, 0, lanternY - 0.1), [pos[0], lanternY - 0.1, pos[1]], 0.06, 0.06, COLORS.bronze);
    S.cyl(pos[0], pos[1], lanternY, lanternY + 0.4, 0.17, 0.17, 8, COLORS.lantern);
  }
}

function buildWallsAndPortico(S, frame, baseY, wallL, wallW) {
  const { box, cyl, facePanel } = frame;
  // ---- the plinth: a low red-brown base, two steps up to the entrance ----
  const plinthH = 0.4;
  const plinthY = baseY + plinthH;
  S.kind = KIND.MASONRY;
  box(0, 0, baseY - 0.3, plinthY, wallL + 0.8, wallW + 0.8, COLORS.plinth, { topKind: KIND.ROAD });
  for (let k = 1; k <= 2; k++) {
    box(wallL / 2 + 0.4 + 0.34 * (k - 0.5), 0, baseY - 0.2, plinthY - (plinthH / 2.4) * k, 0.34, 8.4, shade(COLORS.stone, 1.04), { topKind: KIND.ROAD });
  }

  // ---- the walls: yellow stucco to the eave; at the front a deep open portico three openings wide ----
  const eaveY = baseY + EAVE_HEIGHT;
  const porticoW = 8.6;
  const porticoD = 3.2;
  const sideWallW = wallW / 2 - porticoW / 2;
  S.kind = KIND.PLAIN; // smooth stucco
  box(-porticoD / 2, 0, plinthY, eaveY, wallL - porticoD, wallW, COLORS.wall, { top: shade(COLORS.tile, 0.8) });
  for (const side of [-1, 1]) box(wallL / 2 - porticoD / 2, side * (porticoW / 2 + sideWallW / 2), plinthY, eaveY, porticoD, sideWallW, COLORS.wall, { top: shade(COLORS.tile, 0.8) });
  box(wallL / 2 - porticoD / 2, 0, eaveY - 0.95, eaveY, porticoD, porticoW, COLORS.frieze, { bottom: true }); // the lintel over the portico, its soffit the recess's ceiling
  box(0, 0, eaveY - 0.95, eaveY - 0.15, wallL + 0.08, wallW + 0.08, COLORS.frieze); // the frieze band under the eave
  // the portico: a dark back wall (the doors stand open) with display boards before it, two slim carved columns
  // between the openings (the middle opening about twice the side ones), white pilasters either side
  box(wallL / 2 - porticoD + 0.03, 0, plinthY + 0.02, eaveY - 0.95, 0.06, porticoW, COLORS.recess);
  for (const [boardV, boardW] of [[-3.3, 0.9], [-2.3, 0.9], [2.4, 0.9], [3.4, 0.7]]) {
    box(wallL / 2 - porticoD + 0.5, boardV, plinthY + 0.25, plinthY + 1.75, 0.05, boardW, COLORS.white);
  }
  for (const side of [-1, 1]) {
    cyl(wallL / 2 - 0.4, side * 1.9, plinthY, eaveY - 0.95, 0.19, 0.17, 10, COLORS.column, { cap: false });
    for (let k = 0; k < 5; k++) cyl(wallL / 2 - 0.4, side * 1.9, plinthY + 0.5 + k * 0.62, plinthY + 0.62 + k * 0.62, 0.205, 0.205, 10, shade(COLORS.column, 0.62), { cap: false }); // the carved coils
    cyl(wallL / 2 - 0.4, side * 1.9, plinthY, plinthY + 0.3, 0.27, 0.27, 10, shade(COLORS.stone, 0.9));
  }
  // the bay lines: four bays and two end bays (chái) down each side
  const chaiSpan = 5.6;
  const gianSpan = (wallL - 2 * chaiSpan) / 4;
  const pilasterUs = [-wallL / 2, -wallL / 2 + chaiSpan];
  for (let i = 1; i <= 4; i++) pilasterUs.push(-wallL / 2 + chaiSpan + i * gianSpan);

  // a square window: a white frame round a blue field, a white lattice (a square and a diamond) and a white roundel
  // with a blue heart, as the photo shows
  const buildMedallionWindow = (axisName, sign, faceOffset, alongPos) => {
    const orient = (w, t) => (axisName === 'v' ? [w, t] : [t, w]);
    const pos = axisName === 'v' ? [alongPos, faceOffset + sign * 0.02] : [faceOffset + sign * 0.02, alongPos];
    const [frameU, frameV] = orient(1.95, 0.1);
    const [blueU, blueV] = orient(1.7, 0.14);
    box(pos[0], pos[1], plinthY + 1.05, plinthY + 2.95, frameU, frameV, COLORS.pilaster);
    box(pos[0], pos[1], plinthY + 1.15, plinthY + 2.85, blueU, blueV, COLORS.blue);
    const panel = facePanel(axisName, sign, faceOffset + sign * 0.1);
    const centerY = plinthY + 2.0;
    for (const [rad, isDiamond] of [[0.6, 0], [0.82, 1]]) { // the square ring, then the diamond
      const outer = polygonRing(alongPos, centerY, rad * (isDiamond ? 1 : Math.SQRT2), 4, isDiamond ? 0 : Math.PI / 4);
      const inner = polygonRing(alongPos, centerY, (rad - 0.06) * (isDiamond ? 1 : Math.SQRT2), 4, isDiamond ? 0 : Math.PI / 4);
      for (let edgeIdx = 0; edgeIdx < 4; edgeIdx++) panel.fan([outer[edgeIdx], outer[(edgeIdx + 1) % 4], inner[(edgeIdx + 1) % 4], inner[edgeIdx]], COLORS.white);
    }
    panel.fan(polygonRing(alongPos, centerY, 0.34, 10), COLORS.white);
    facePanel(axisName, sign, faceOffset + sign * 0.105).fan(polygonRing(alongPos, centerY, 0.2, 10), shade(COLORS.blue, 0.85));
  };
  for (let i = 0; i + 1 < pilasterUs.length; i++) {
    for (const side of [-1, 1]) buildMedallionWindow('v', side, side * wallW / 2, (pilasterUs[i] + pilasterUs[i + 1]) / 2);
  }
  for (const posU of pilasterUs) {
    for (const side of [-1, 1]) box(posU, side * (wallW / 2 + 0.06), plinthY, eaveY - 0.95, 0.6, 0.14, COLORS.pilaster);
  }
  for (const side of [-1, 1]) {
    buildMedallionWindow('u', 1, wallL / 2, side * (porticoW / 2 + sideWallW / 2));
    buildMedallionWindow('u', -1, -wallL / 2, side * (porticoW / 2 + sideWallW / 2));
    for (const pilV of [wallW / 2 - 0.3, porticoW / 2 + 0.3]) box(wallL / 2 + 0.06, side * pilV, plinthY, eaveY - 0.95, 0.14, 0.6, COLORS.pilaster);
    box(-wallL / 2 - 0.06, side * (wallW / 2 - 0.3), plinthY, eaveY - 0.95, 0.14, 0.6, COLORS.pilaster);
  }
  box(-wallL / 2 - 0.03, 0, plinthY + 0.05, plinthY + 2.9, 0.08, 2.2, shade(COLORS.door, 0.7)); // the back door, where the gallery joins
  // framed panels in the frieze across the front
  for (let i = -3; i <= 3; i++) box(wallL / 2 + 0.06, i * 2.6, eaveY - 0.8, eaveY - 0.3, 0.06, 2.0, shade(COLORS.frieze, 0.6));
  return eaveY;
}

function buildRoofsAndGables(S, frame, baseY, eaveY, wallL, wallW) {
  const { axisX, axisZ, toWorld, toPoint3, box, hip, cyl, facePanel } = frame;
  // ---- lower roof: the skirt round the whole hall, rising to meet the upper roof's eave ----
  const skirtOver = 1.2;
  const skirtFlare = 0.35;
  const skirtH = 4.8;
  hip(0, 0, wallL, wallW, eaveY, skirtH, { fasciaCol: shade(COLORS.blue, 0.75), over: skirtOver, flare: skirtFlare, hips: false, ridgeCol: null, segs: 3 });
  const upperBodyL = 26;
  const upperBodyW = 8;
  const upperOver = 1.0;
  const gableCutU = upperBodyL / 2 + 0.55;

  const skirtShape = hipShape(wallL + 2 * skirtOver, wallW + 2 * skirtOver, skirtFlare, false, null, 3);
  const hipPtAt = (signU, signV, upFrac) => toPoint3(
    signU * (skirtShape.hw + (skirtShape.rl - skirtShape.hw) * upFrac),
    signV * skirtShape.hd * (1 - upFrac),
    eaveY + skirtH * upFrac ** skirtShape.gamma + skirtFlare * (1 - upFrac) ** 2 + 0.1,
  );
  const hipEndFrac = (skirtShape.hw - upperBodyL / 2) / (skirtShape.hw - skirtShape.rl); // where the hip ridge meets the gable's foot
  for (const signU of [-1, 1]) {
    for (const signV of [-1, 1]) {
      let prevPt = null;
      for (let k = 0; k <= 6; k++) {
        const pt = hipPtAt(signU, signV, (hipEndFrac * k) / 6);
        if (prevPt) S.beam(prevPt, pt, 0.16, 0.2, COLORS.ridge);
        prevPt = pt;
      }
      const cornerPt = hipPtAt(signU, signV, 0);
      const diagLen = Math.hypot(signU * skirtShape.hw, signV * skirtShape.hd);
      const dirU = (signU * skirtShape.hw) / diagLen;
      const dirV = (signV * skirtShape.hd) / diagLen;
      buildFinial(S, cornerPt, dirU * axisX - dirV * axisZ, dirU * axisZ + dirV * axisX);
    }
  }

  // ---- upper storey: the inner hall's walls (hidden by the skirt), then the main roof, gabled at both ends ----
  const upperFootY = baseY + GABLE_FOOT_H;
  const upperRoofH = RIDGE_TOP_H - GABLE_FOOT_H;
  const upperFlare = 0.15;
  S.kind = KIND.TIMBER;
  box(0, 0, eaveY, upperFootY - 0.4, upperBodyL, upperBodyW - 0.8, shade(COLORS.wall, 0.9), { top: shade(COLORS.tile, 0.8) }); // kept under the skirt where it meets the gables
  S.kind = KIND.PLAIN;
  // a long hip cut back to the gables (the clip keeps its ridge running out to the cut)
  const fullHipLen = 36;
  hip(0, 0, fullHipLen, upperBodyW, upperFootY, upperRoofH, { over: upperOver, flare: upperFlare, ridgeCol: COLORS.ridge, hips: false, clip: { u0: -gableCutU, u1: gableCutU } });
  // the gables: the tympanum under the roof's slope, faced in porcelain mosaic inside a blue border
  const upperShape = hipShape(fullHipLen + 2 * upperOver, upperBodyW + 2 * upperOver, upperFlare, false, COLORS.ridge, 4);
  const halfDepth = upperShape.hd;
  const gableHeightAt = (localV) => upperRoofH * Math.max(0, 1 - Math.abs(localV) / halfDepth) ** upperShape.gamma;
  const shardColors = [COLORS.white, COLORS.blue, COLORS.mosaic, COLORS.gold, COLORS.celadon, COLORS.white, shade(COLORS.blue, 1.3)];
  for (const endSign of [-1, 1]) {
    const faceNorm = [endSign * axisX, 0, endSign * axisZ];
    const gableU = endSign * (upperBodyL / 2 + 0.02);
    const sliceCount = 8;
    for (let k = 0; k < sliceCount; k++) {
      const vA = -upperBodyW / 2 + (upperBodyW * k) / sliceCount;
      const vB = -upperBodyW / 2 + (upperBodyW * (k + 1)) / sliceCount;
      S.quad(toPoint3(gableU, vA, upperFootY), toPoint3(gableU, vB, upperFootY), toPoint3(gableU, vB, upperFootY + gableHeightAt(vB) - 0.08), toPoint3(gableU, vA, upperFootY + gableHeightAt(vA) - 0.08), COLORS.gable, faceNorm);
    }
    const borderFace = facePanel('u', endSign, gableU + endSign * 0.03);
    const mosaicFace = facePanel('u', endSign, gableU + endSign * 0.05);
    // the blue border along the rakes
    for (const side of [-1, 1]) {
      for (let k = 0; k < 6; k++) {
        const vA = side * (upperBodyW / 2) * (k / 6);
        const vB = side * (upperBodyW / 2) * ((k + 1) / 6);
        borderFace.fan([[vA, upperFootY + gableHeightAt(vA) - 0.1], [vB, upperFootY + gableHeightAt(vB) - 0.1], [vB, upperFootY + gableHeightAt(vB) - 0.38], [vA, upperFootY + gableHeightAt(vA) - 0.38]], COLORS.blue);
      }
    }
    // the mosaic: small lozenges on a 0.45 m grid, kept inside the border
    let hashState = 7;
    for (let y = upperFootY + 0.6; y < upperFootY + upperRoofH - 0.5; y += 0.45) {
      for (let posV = -upperBodyW / 2 + 0.4; posV <= upperBodyW / 2 - 0.4; posV += 0.45) {
        const staggeredV = posV + (Math.round((y - upperFootY) / 0.45) % 2) * 0.225;
        if (y + 0.25 > upperFootY + gableHeightAt(Math.abs(staggeredV) + 0.2) - 0.45) continue;
        hashState = (hashState * 1103515245 + 12345) & 0x7fffffff;
        mosaicFace.fan([[staggeredV, y - 0.17], [staggeredV + 0.17, y], [staggeredV, y + 0.17], [staggeredV - 0.17, y]], shardColors[hashState % shardColors.length]);
      }
    }
    // the medallion at the tympanum's heart
    facePanel('u', endSign, gableU + endSign * 0.06).fan(polygonRing(0, upperFootY + upperRoofH * 0.42, 0.62, 12), COLORS.gold);
    facePanel('u', endSign, gableU + endSign * 0.07).fan(polygonRing(0, upperFootY + upperRoofH * 0.42, 0.42, 12), COLORS.mosaic);
    // the band at the gable's foot, from the skirt up to the tympanum: blue, with light panels
    box(gableU, 0, eaveY + 1.6, upperFootY, 0.06, upperBodyW, shade(COLORS.blue, 0.8));
    for (let k = -3; k <= 3; k++) box(gableU + endSign * 0.02, k * 1.05, upperFootY - 0.5, upperFootY - 0.12, 0.04, 0.8, k % 2 ? COLORS.white : COLORS.gold);
    box(gableU + endSign * 0.02, 0, upperFootY + 0.02, upperFootY + 0.3, 0.05, upperBodyW * 0.95, COLORS.blue);
    // the barge ridge follows the roof's edge at the cut, and ends at the foot in a small finial
    const bargePt = (upFrac, side) => toPoint3(endSign * gableCutU, side * halfDepth * (1 - upFrac), upperFootY + upperRoofH * upFrac ** upperShape.gamma + 0.1);
    for (const side of [-1, 1]) {
      let prevPt = null;
      for (let k = 0; k <= 6; k++) {
        const pt = bargePt(k / 6, side);
        if (prevPt) S.beam(prevPt, pt, 0.16, 0.2, COLORS.ridge);
        prevPt = pt;
      }
      const footPt = bargePt(0, side);
      buildFinial(S, footPt, (endSign * axisX - side * axisZ) / Math.SQRT2, (endSign * axisZ + side * axisX) / Math.SQRT2, 0.8);
    }
  }

  // the main ridge: a flaming pearl between two small dragons
  const ridgeY = upperFootY + upperRoofH;
  cyl(0, 0, ridgeY + 0.15, ridgeY + 0.5, 0.2, 0.08, 8, COLORS.gold);
  for (const side of [-1, 1]) {
    const pos = toWorld(side * 0.5, 0);
    buildFinial(S, [pos[0], ridgeY + 0.15, pos[1]], side * axisX, side * axisZ, 0.9);
  }
  // the ridge ends at the gables carry a small figure each
  for (const side of [-1, 1]) {
    const pos = toWorld(side * (gableCutU - 0.3), 0);
    buildFinial(S, [pos[0], ridgeY + 0.15, pos[1]], -side * axisX, -side * axisZ, 0.7);
  }
}

function buildGatesAndWalls(S) {
  // ---- Duyệt Thị Môn, the small gate in the yard's north wall: one doorway under a yellow-tiled roof ----
  const northFit = obb(NORTH_GATE_RING);
  const northGroundY = groundY(northFit.c[0], northFit.c[1]);
  S.base = northGroundY - LAND_Y;
  S.kind = KIND.MASONRY;
  S.box(northFit.c[0], northFit.c[1], northGroundY - 0.3, northGroundY + 3.4, northFit.w + 0.4, northFit.d + 0.4, northFit.a, COLORS.ochre, { top: shade(COLORS.tile, 0.8) });
  S.kind = KIND.PLAIN;
  const doorAcross = northFit.w >= northFit.d; // the doorway runs through the gate's short side
  S.box(northFit.c[0], northFit.c[1], northGroundY, northGroundY + 2.5, doorAcross ? 1.5 : northFit.w + 0.5, doorAcross ? northFit.d + 0.5 : 1.5, northFit.a, COLORS.gateDoorDark);
  S.hip(northFit.c[0], northFit.c[1], northFit.w + 0.4, northFit.d + 0.4, northFit.a, northGroundY + 3.4, 1.0, COLORS.tile, {
    flare: 0.3, over: 0.55, fascia: 0.2, fasciaCol: shade(PAL.lacquer, 0.7), ridgeCol: COLORS.ridge, hips: true, glazed: true, segs: 3,
  });

  // ---- the axial gate in the Tử Cấm Thành's east wall (OSM 695949056), as the photosphere shows its outer face ----
  const [cornerA0, cornerA1, cornerB1] = AXIAL_GATE_RING;
  const gateLen = Math.hypot(cornerA1[0] - cornerA0[0], cornerA1[1] - cornerA0[1]);
  const tanX = (cornerA1[0] - cornerA0[0]) / gateLen;
  const tanZ = (cornerA1[1] - cornerA0[1]) / gateLen;
  const gateDepth = Math.hypot(cornerB1[0] - cornerA1[0], cornerB1[1] - cornerA1[1]);
  const gateCenter = AXIAL_GATE_RING.reduce((acc, pt) => [acc[0] + pt[0] / 4, acc[1] + pt[1] / 4], [0, 0]);
  const gateAngle = Math.atan2(tanZ, tanX);
  const normX = -tanZ;
  const normZ = tanX; // along the wall, across it
  const gateWorld = (along, across): [number, number] => [gateCenter[0] + along * tanX + across * normX, gateCenter[1] + along * tanZ + across * normZ];
  const gateBox = (along, across, yMin, yMax, width, depth, color, opts?) => {
    const pos = gateWorld(along, across);
    S.box(pos[0], pos[1], yMin, yMax, width, depth, gateAngle, color, opts);
  };
  const axialGroundY = groundY(gateCenter[0], gateCenter[1]);
  const pillarW = 0.7;
  const openW = gateLen - 2 * pillarW;
  const pillarOffset = gateLen / 2 - pillarW / 2;
  // the wall's centre line runs wallOffsetR off the outline's (measured in the built scene: the cap spans r -0.82..0.22),
  // so the yard-side half of the gate is carried a little past the mapped outline, clear of the cap
  const wallOffsetR = -0.3;
  const capHalf = EAST_WALL_CAP / 2 + 0.02;
  const sideSpan = (sideSign) => {
    const innerR = wallOffsetR + sideSign * capHalf;
    const outerR = sideSign * Math.max(gateDepth / 2, Math.abs(innerR) + 0.3);
    return { innerR, outerR, depth: Math.abs(outerR - innerR), midR: (innerR + outerR) / 2 };
  };
  S.base = axialGroundY - LAND_Y;
  S.kind = KIND.MASONRY;
  for (const endSign of [-1, 1]) {
    gateBox(endSign * pillarOffset, wallOffsetR, axialGroundY - 0.2, axialGroundY + 4.9, pillarW, gateDepth, COLORS.ochre, { top: shade(COLORS.ochre, 0.9) });
    for (const faceSign of [-1, 1]) {
      for (const trimSide of [-1, 1]) {
        gateBox(endSign * pillarOffset + trimSide * (pillarW / 2 - 0.08), wallOffsetR + faceSign * (gateDepth / 2 + 0.01), axialGroundY + 0.4, axialGroundY + 4.6, 0.1, 0.03, COLORS.blue);
      }
    }
  }
  S.kind = KIND.PLAIN;
  for (const faceSign of [-1, 1]) {
    const { outerR, depth, midR } = sideSpan(faceSign);
    const wallFaceR = wallOffsetR + faceSign * 0.36;
    gateBox(0, wallFaceR + faceSign * 0.03, axialGroundY, axialGroundY + 3.25, openW, 0.05, COLORS.door); // the shut leaves on the wall's face
    for (const leafSide of [-1, 1]) gateBox(leafSide * openW * 0.25, wallFaceR + faceSign * 0.065, axialGroundY + 0.3, axialGroundY + 3.0, openW * 0.4, 0.02, shade(COLORS.door, 0.82));
    gateBox(0, midR, axialGroundY + 3.3, axialGroundY + 4.5, openW, depth, COLORS.ochre); // the lintel
    gateBox(0, outerR + faceSign * 0.015, axialGroundY + 3.55, axialGroundY + 4.25, openW * 0.62, 0.03, COLORS.plaqueGrey); // the plaque
    gateBox(0, midR + faceSign * 0.125, axialGroundY + 4.5, axialGroundY + 4.75, gateLen + 0.3, depth + 0.25, COLORS.blue); // the blue-tiled band
    gateBox(0, midR + faceSign * 0.2, axialGroundY + 4.75, axialGroundY + 4.95, gateLen + 0.5, depth + 0.4, shade(COLORS.tile, 0.9));
  }
  for (const endSign of [-1, 1]) {
    for (const faceSign of [-1, 1]) { // a small finial on each corner of the crest
      const pos = gateWorld(endSign * (gateLen / 2 + 0.2), sideSpan(faceSign).outerR + faceSign * 0.15);
      buildFinial(S, [pos[0], axialGroundY + 4.95, pos[1]], endSign * tanX + faceSign * normX * 0.3, endSign * tanZ + faceSign * normZ * 0.3, 0.6);
    }
  }

  // ---- the yard wall either side of the north gate ----
  S.base = 0;
  for (const wallLine of YARD_WALLS) fence(S, wallLine, FENCE.imperial, { closed: false });
}

export function build({ S }) {
  const frame = createTheatreFrame(S);
  const baseY = groundY(frame.center[0], frame.center[1]);
  const wallL = frame.hallLen - 2.4;
  const wallW = frame.hallWidth - 2.4; // the outer walls stand 1.2 m inside the eave line
  S.base = baseY - LAND_Y;

  buildForecourt(S, frame, baseY);
  const eaveY = buildWallsAndPortico(S, frame, baseY, wallL, wallW);
  buildRoofsAndGables(S, frame, baseY, eaveY, wallL, wallW);
  buildGatesAndWalls(S);

  S.kind = KIND.PLAIN;
  S.base = 0;
}
