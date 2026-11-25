import { KIND, hex, shade, obb, inRing } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { rise, pondY } from '../../geo/terrain.ts';
import { fence, FENCE } from '../enclosure.ts';

// ---- Cung Trường Sanh (Trường Ninh 1821, rebuilt 1846, renamed 1923), north-west corner of the Imperial City ----
//
// Sources (docs/places/truongsanh.md has the full list):
//  - vi.wikipedia.org/wiki/Cung_Trường_Sanh: about 11,400 m², faces east; north hồ Nội Kim Thủy, south cung Diên
//    Thọ. Since 1846 a 王 plan on one axis: Ngũ Đại Đồng Đường in front, điện Thọ Khang in the middle, lầu Vạn Phước
//    behind, linked by corridors; a phương môn screen before the front hall; rockeries (núi Bảo Sơn, Kình Ngư, Hổ
//    Tôn) behind as the "hậu chẩm". Lạch Đào Nguyên, an artificial channel round the palace with red bridges, opens
//    to Nội Kim Thủy; hồ Tân Nguyệt restored 2005–07. Gates: Trường An môn (the main gate, a tam quan with floral
//    and five-colour decoration) on the east, Thụy môn west, Hữu Hòa south, Thanh Minh north. Pulled down 1945,
//    lived in from 1954, restored 2005–2007 (halls, rockeries, walls, gate).
//  - vietnamnews.vn gallery (2024): the main gate, the screen wall behind it, Ngũ Đại Đồng Đường, Thọ Khang, the Đào
//    Nguyên channel and Tân Nguyệt lake as they stand; nomads-travel-guide: mustard-yellow halls, red bridges.
//  - OpenStreetMap: the hall outline (way 172763427), the two side halls (172763422, 172763425), Trường An Môn
//    (618267901), the south gate (695810773), the precinct wall (695810771/772), the rear court wall (695814169)
//    and its screen (695814168). The channel and lake are hue.json's pond and are not drawn here.
//  - The city height survey reads the hall at 8.5 m to the ridge and the side halls at 6.0 m.
//  - Google satellite and a Street View photosphere from the lawn north-east of the island (checked 2026-11,
//    scratch only): the halls and side halls are roofed in dark grey-green unglazed tile with grey ridges (on the
//    satellite they read dark beside Điện Thọ Ninh's yellow roof), their walls are solid mustard masonry with
//    red-framed windows and doors, the court before the hall is paved tan brick, the island is edged with a low
//    grey pierced balustrade, and the precinct wall by Trường An Môn is weathered grey plaster.
//    Review (same imagery): walls plain plaster with small windows, doors only where the photo shows them; Thọ
//    Khang ends in a mustard masonry gable with an ornament panel; roof corners barely lift; the court is broad tan
//    paving about 20 m deep with more south-west of the hall; the channel is narrow, rock-lined and full of lotus;
//    old shade trees (foliage kind 4, never palms or willows) stand on the island and the lawns.
// Estimated: the split of the hall outline into front house, main house and rear house, bay counts, platform and
// eave heights, the window rhythm, the gate's height and roofs (its yellow tile is not visible in the imagery), the
// positions of Thụy môn and Thanh Minh môn (not mapped), and the rockeries' form.

// The palace frame: u across the front, v toward the front (east-north-east, to Trường An Môn), metres.
const PALACE_CENTER = [-1505.05, -97.15];
const AXIS_U = [0.61394, 0.78935];
const AXIS_FORWARD = [AXIS_U[1], -AXIS_U[0]];
const PALACE_ANGLE = Math.atan2(AXIS_U[1], AXIS_U[0]);
const toWorld = (localU, localV): [number, number] => [
  PALACE_CENTER[0] + localU * AXIS_U[0] + localV * AXIS_FORWARD[0],
  PALACE_CENTER[1] + localU * AXIS_U[1] + localV * AXIS_FORWARD[1],
];
const groundY = (x, z) => LAND_Y + rise(x, z);

// OSM outlines, metres in the model frame (from the raw extract, data/raw)
const SIDE_HALLS = [
  [[-1518.9, -114.6], [-1507.4, -123.0], [-1501.8, -115.5], [-1513.3, -107.1]], // north (left) hall
  [[-1497.2, -86.3], [-1486.5, -94.5], [-1481.5, -88.0], [-1492.2, -79.9]], // south (right) hall
];
const MAIN_GATE_RING = [[-1457.9, -136.3], [-1460.1, -134.7], [-1453.9, -126.6], [-1451.8, -128.2]]; // Trường An Môn
const SOUTH_GATE_POS = [-1482.9, -60.3]; // Hữu Hòa (the gap in the wall toward Diên Thọ, way 695810773)
const PRECINCT_WALL = [
  [-1484.7, -58.7], [-1533.5, -22.8], [-1584.4, -93.2], [-1484.1, -167.1],
  [-1460.1, -134.7], [-1453.9, -126.6], [-1432.7, -96.9], [-1481.2, -61.1],
];
const REAR_COURT_WALL = [[-1530.0, -93.7], [-1545.6, -81.8], [-1529.6, -61.2], [-1514.2, -73.1]];

// [u, v, scale] in the palace frame
const BIG_TREES: [number, number, number][] = [
  [-17.5, -6.0, 1.5], [6.0, -37.5, 1.2], [20.0, 52.0, 1.7], [6.0, 52.0, 1.5], [29.0, 50.0, 1.6], [38.0, 36.0, 1.5],
  [37.0, 8.0, 1.5], [37.0, -10.0, 1.4], [-40.0, 14.0, 1.5], [-40.0, 34.0, 1.4], [-40.0, -8.0, 1.3],
];

// halls: dark grey-green unglazed tile, grey ridges (satellite, Street View); the gate keeps its yellow glaze
const COLORS = {
  tile: hex('#4f5a52'),
  ridge: hex('#9a9b92'),
  gateTile: PAL.imperialRoof,
  gateRidge: hex('#f1d77a'),
  lacquer: PAL.lacquer,
  gold: hex('#d9b04a'),
  red: hex('#8a3324'),
  shutter: hex('#9c3b2b'),
  grey: hex('#a9a79e'),
  stone: PAL.stone,
  pave: hex('#c9b38e'),
  mustard: hex('#d4a845'),
  dark: hex('#3a2420'),
  rock: hex('#7d7a70'),
  gablePanel: hex('#5d8f6a'),
  screenPanel: hex('#4f7a5c'),
  basinWater: hex('#4e6f6a'),
  bonsaiLeaf: hex('#4f7a3c'),
  shardTeal: hex('#3f7f8a'),
  shardRed: hex('#c4463a'),
  shardGold: hex('#e6d27a'),
  lotusLeaves: [hex('#5f9a58'), hex('#6aa460'), hex('#4f8a52'), hex('#79a965')],
  lotusBloom: hex('#f2a7bd'),
};

export const id = 'truongsanh';

function createPalaceHelpers(S) {
  const box = (localU, localV, yMin, yMax, width, depth, color, opts?) => {
    const pos = toWorld(localU, localV);
    S.box(pos[0], pos[1], yMin, yMax, width, depth, PALACE_ANGLE, color, opts);
  };
  const hip = (localU, localV, width, depth, yBase, riseH, opts?) => {
    const pos = toWorld(localU, localV);
    S.hip(pos[0], pos[1], width, depth, PALACE_ANGLE, yBase, riseH, COLORS.tile, {
      flare: 0.12, horns: false, fascia: 0.26, fasciaCol: shade(COLORS.lacquer, 0.7), hips: true, ridgeCol: COLORS.ridge, segs: 3, ...opts,
    });
  };
  const cyl = (localU, localV, yMin, yMax, radius0, radius1, sides, color, opts?) => {
    const pos = toWorld(localU, localV);
    S.cyl(pos[0], pos[1], yMin, yMax, radius0, radius1, sides, color, { rot: PALACE_ANGLE, ...opts });
  };
  return { box, hip, cyl };
}

// a window or door on a wall face: a red frame round a pair of red shutters (a window) or dark leaves (a door)
function buildWallOpening(S, box, localU, localV, alongU, yMin, yMax, openW, isDoor) {
  S.kind = KIND.PLAIN;
  const frameSize = alongU ? [openW, 0.07] : [0.07, openW];
  const leafSize = alongU ? [openW - 0.24, 0.09] : [0.09, openW - 0.24];
  box(localU, localV, yMin, yMax, frameSize[0], frameSize[1], COLORS.red);
  box(localU, localV, yMin + 0.12, yMax - 0.12, leafSize[0], leafSize[1], isDoor ? shade(COLORS.lacquer, 0.6) : COLORS.shutter);
  if (!isDoor) box(localU, localV, yMin + 0.12, yMax - 0.12, alongU ? 0.05 : 0.11, alongU ? 0.11 : 0.05, shade(COLORS.red, 0.45)); // the meeting stile
}

// the upper roof of a hip-and-gable (the main hall, Street View): above the hip skirt a gabled roof whose ends are
// mustard masonry triangles (đầu hồi) with a framed ornament panel. roofW, roofD: the hip roof's plan with its overhang;
// the gable walls stand where the hip's end slopes reach the gable's foot, at |u| = gableAt.
function buildHipAndGable(S, centerV, roofD, yBase, riseH, gableAt) {
  const halfD = roofD / 2;
  const gableHalfD = 0.56 * halfD;
  const footY = yBase + riseH * 0.4 + 0.28;
  const ridgeY = yBase + riseH + 0.25;
  const eaveU = gableAt + 0.35;
  const point3 = (localU, offsetV, y) => {
    const pos = toWorld(localU, centerV + offsetV);
    return [pos[0], y, pos[1]];
  };
  S.kind = KIND.TILE;
  for (const side of [-1, 1]) {
    S.quad(point3(-eaveU, side * gableHalfD, footY), point3(eaveU, side * gableHalfD, footY), point3(eaveU, 0, ridgeY), point3(-eaveU, 0, ridgeY), COLORS.tile, [AXIS_FORWARD[0] * side, 2, AXIS_FORWARD[1] * side]);
    S.kind = KIND.PLAIN;
    S.quad(point3(-eaveU, side * gableHalfD, footY - 0.05), point3(eaveU, side * gableHalfD, footY - 0.05), point3(eaveU, 0, ridgeY - 0.05), point3(-eaveU, 0, ridgeY - 0.05), shade(COLORS.tile, 0.45), [0, -1, 0]);
    S.kind = KIND.TILE;
  }
  S.kind = KIND.PLAIN;
  S.beam(point3(-eaveU - 0.2, 0, ridgeY + 0.05), point3(eaveU + 0.2, 0, ridgeY + 0.05), 0.42, 0.3, COLORS.ridge);
  for (const side of [-1, 1]) {
    const outNormal = [AXIS_U[0] * side, 0.05, AXIS_U[1] * side];
    S.tri(point3(side * gableAt, -gableHalfD + 0.1, footY), point3(side * gableAt, gableHalfD - 0.1, footY), point3(side * gableAt, 0, ridgeY - 0.08), COLORS.mustard, outNormal);
    S.tri(point3(side * gableAt, -gableHalfD + 0.1, footY), point3(side * gableAt, gableHalfD - 0.1, footY), point3(side * gableAt, 0, ridgeY - 0.08), COLORS.mustard, [-outNormal[0], 0.05, -outNormal[2]]);
    const panelU = side * (gableAt + 0.04);
    const panelH = (ridgeY - footY) * 0.42;
    S.box(...toWorld(panelU, 0), footY + 0.25, footY + 0.25 + panelH, 0.06, gableHalfD * 0.8, PALACE_ANGLE, shade(COLORS.mustard, 0.8));
    S.box(...toWorld(panelU + side * 0.02, 0), footY + 0.35, footY + 0.15 + panelH, 0.06, gableHalfD * 0.62, PALACE_ANGLE, COLORS.gablePanel);
    // the roof's verge along the gable's rakes
    for (const rakeSide of [-1, 1]) S.beam(point3(side * eaveU, rakeSide * gableHalfD, footY - 0.02), point3(side * eaveU, 0, ridgeY), 0.22, 0.2, COLORS.ridge);
  }
}

function buildMainHallComplex(S, helpers, baseY) {
  const { box, hip, cyl } = helpers;
  // ---- the main hall, a 王 on one axis: Ngũ Đại Đồng Đường (front), Thọ Khang (middle), the rear house ----
  // OSM: front block 21.6 m across x 14.2 m deep (v -14.3..0), rear block 17.1 x 9.4 (v -23.5..-14.1)
  const plinthH = 0.6;
  const plinthY = baseY + plinthH;
  S.kind = KIND.MASONRY;
  // the court: tan flagstones from the hall's steps to the island's north-east edge, about 22 m (satellite), between
  // the side halls, and round the hall to the rear court
  box(0, 11.0, baseY - 0.2, baseY + 0.1, 25.0, 22.0, COLORS.pave, { topKind: KIND.ROAD });
  box(0, -13.0, baseY - 0.2, baseY + 0.08, 26.4, 26.0, shade(COLORS.pave, 0.97), { topKind: KIND.ROAD });
  box(0, -7.1, baseY - 0.3, plinthY, 22.6, 15.6, COLORS.stone, { taper: 0.985, topKind: KIND.ROAD });
  box(0, -18.8, baseY - 0.3, plinthY, 18.0, 9.8, COLORS.stone, { taper: 0.985, topKind: KIND.ROAD });
  for (let k = 1; k <= 3; k++) {
    box(0, 0.6 + 0.3 * (k - 0.5), baseY - 0.2, plinthY - (plinthH / 3) * (k - 0.5), 5.0, 0.3, shade(COLORS.stone, 1.04), { topKind: KIND.ROAD });
  }

  // a house: plain mustard plaster out to the column line, small red-shuttered windows, red doors only in the middle
  // (Street View), an open verandah across the front of the front house only
  const buildHallBlock = (centerV, width, depth, eaveH, roofH, bayCount, chaiCount, hasPorch?, gableAt?) => {
    S.kind = KIND.PLAIN;
    const wallW = width - 1.0;
    const porchD = hasPorch ? 1.6 : 0;
    const wallD = depth - 1.0 - porchD;
    const wallCenterV = centerV - porchD / 2;
    box(0, wallCenterV, plinthY, plinthY + eaveH, wallW, wallD, COLORS.mustard, { top: shade(COLORS.tile, 0.8) });
    const totalBays = bayCount + 2 * chaiCount;
    const bayW = wallW / totalBays;
    if (hasPorch) {
      for (let i = 0; i <= totalBays; i++) {
        cyl(-wallW / 2 + i * bayW, centerV + depth / 2 - 0.5, plinthY, plinthY + eaveH, 0.17, 0.15, 6, COLORS.lacquer, { cap: false });
      }
    }
    const frontFaceV = wallCenterV + wallD / 2 + 0.03;
    const backFaceV = wallCenterV - wallD / 2 - 0.03;
    const midBay = (totalBays - 1) / 2;
    const winW = Math.min(1.1, bayW - 1.4);
    const winY0 = plinthY + 1.1;
    const winY1 = plinthY + Math.min(eaveH - 0.8, 2.4);
    for (let i = 0; i < totalBays; i++) {
      const bayU = -wallW / 2 + (i + 0.5) * bayW;
      if (hasPorch && Math.abs(i - midBay) <= 1) {
        buildWallOpening(S, box, bayU, frontFaceV, true, plinthY, plinthY + eaveH - 0.6, bayW - 1.2, true); // the three middle doors behind the verandah
        S.kind = KIND.PLAIN;
        box(bayU, frontFaceV + 0.02, plinthY + eaveH - 0.5, plinthY + eaveH - 0.25, bayW - 1.0, 0.06, COLORS.gold);
      } else if (!hasPorch && i === midBay) {
        buildWallOpening(S, box, bayU, frontFaceV, true, plinthY, plinthY + eaveH - 0.8, Math.min(1.8, bayW - 1.2), true);
      } else {
        buildWallOpening(S, box, bayU, frontFaceV, true, winY0, winY1, winW, false);
      }
      if (!hasPorch) buildWallOpening(S, box, bayU, backFaceV, true, winY0, winY1, winW, false);
    }
    for (const side of [-1, 1]) {
      for (const frac of [-0.25, 0.25]) {
        buildWallOpening(S, box, side * (wallW / 2 + 0.03), wallCenterV + frac * wallD, false, winY0, winY1, 0.9, false);
      }
    }
    hip(0, centerV, width - 1.0, depth - 0.6, plinthY + eaveH, roofH, { over: 0.9 });
    if (gableAt) buildHipAndGable(S, centerV, depth - 0.6 + 1.8, plinthY + eaveH, roofH, gableAt);
  };

  buildHallBlock(-3.0, 21.6, 6.0, 3.0, 2.9, 5, 1, true); // Ngũ Đại Đồng Đường, ridge about 6.5 m
  buildHallBlock(-10.0, 21.6, 8.4, 3.4, 4.25, 5, 1, false, 8.4); // Thọ Khang, hip-and-gable, the gable's ridge at 8.5 m (the survey's)
  buildHallBlock(-19.0, 17.1, 9.4, 3.2, 3.9, 3, 1); // the rear house on Vạn Phước lâu's site, ridge about 7.7 m
  // the links (the stem of the 王): a covered passage under a low roof between the three houses
  S.kind = KIND.TIMBER;
  box(0, -6.4, plinthY, plinthY + 2.6, 3.4, 1.4, shade(COLORS.mustard, 0.92));
  box(0, -14.6, plinthY, plinthY + 2.6, 3.4, 1.6, shade(COLORS.mustard, 0.92));
  // flaming pearl and two dragons on the Thọ Khang ridge
  S.kind = KIND.PLAIN;
  const ridgeY = plinthY + 3.4 + 4.5 + 0.1; // on the gable roof's ridge
  cyl(0, -10.0, ridgeY + 0.2, ridgeY + 0.85, 0.3, 0.1, 8, COLORS.ridge);
  for (const side of [-1, 1]) {
    const startPos = toWorld(side * 0.6, -10.0);
    const endPos = toWorld(side * 2.4, -10.0);
    S.beam([startPos[0], ridgeY + 0.7, startPos[1]], [endPos[0], ridgeY + 0.3, endPos[1]], 0.2, 0.3, COLORS.ridge);
  }

  // ---- the phương môn before the front hall: a free-standing screen with a tiled coping ----
  S.kind = KIND.MASONRY;
  box(0, 9.0, baseY - 0.2, baseY + 2.4, 5.2, 0.5, COLORS.mustard, { top: COLORS.tile });
  S.kind = KIND.PLAIN;
  box(0, 9.0, baseY + 0.9, baseY + 2.0, 2.2, 0.56, COLORS.screenPanel);
  box(0, 9.0, baseY + 2.4, baseY + 2.62, 5.6, 0.8, COLORS.tile, { taper: 0.6 });
}

function buildSideHalls(S, baseY) {
  // ---- the two side halls on the island, flanking the court: plastered walls under a grey tile hip roof ----
  for (const ring of SIDE_HALLS) {
    const boxFit = obb(ring);
    const hallGroundY = groundY(boxFit.c[0], boxFit.c[1]);
    // the hall's long side runs along v; build in the hall's own frame with doors facing the court
    S.base = hallGroundY - LAND_Y;
    const width = Math.max(boxFit.w, boxFit.d);
    const depth = Math.min(boxFit.w, boxFit.d);
    const angle = PALACE_ANGLE + Math.PI / 2;
    S.kind = KIND.MASONRY;
    S.box(boxFit.c[0], boxFit.c[1], hallGroundY - 0.3, hallGroundY + 0.4, width, depth, angle, COLORS.stone, { topKind: KIND.ROAD });
    S.kind = KIND.PLAIN;
    S.box(boxFit.c[0], boxFit.c[1], hallGroundY + 0.4, hallGroundY + 2.9, width - 1.0, depth - 1.0, angle, COLORS.mustard, { top: shade(COLORS.tile, 0.8) });
    // plain plaster; one red door in the middle of the face toward the court, small red-shuttered windows along the
    // rest of it, a row of five along the back and two on each end (Street View: a long, low range of windows)
    const cosAng = Math.cos(angle);
    const sinAng = Math.sin(angle);
    const courtSide = Math.sign((boxFit.c[0] - PALACE_CENTER[0]) * AXIS_U[0] + (boxFit.c[1] - PALACE_CENTER[1]) * AXIS_U[1]) || 1;
    const buildOpening = (along, normal, isLongFace, yMin, yMax, openW, isDoor) => {
      const x = boxFit.c[0] + cosAng * along - sinAng * normal;
      const z = boxFit.c[1] + sinAng * along + cosAng * normal;
      const frameSize = isLongFace ? [openW, 0.07] : [0.07, openW];
      const leafSize = isLongFace ? [openW - 0.24, 0.09] : [0.09, openW - 0.24];
      S.kind = KIND.PLAIN;
      S.box(x, z, yMin, yMax, frameSize[0], frameSize[1], angle, COLORS.red);
      S.box(x, z, yMin + 0.12, yMax - 0.12, leafSize[0], leafSize[1], angle, isDoor ? shade(COLORS.lacquer, 0.6) : COLORS.shutter);
    };
    const wallLen = width - 1.0;
    const faceOffset = (depth - 1.0) / 2 + 0.03;
    for (let i = 0; i < 5; i++) {
      const alongPos = -wallLen / 2 + (i + 0.5) * (wallLen / 5);
      if (i === 2) buildOpening(alongPos, courtSide * faceOffset, true, hallGroundY + 0.4, hallGroundY + 2.4, 1.6, true);
      else buildOpening(alongPos, courtSide * faceOffset, true, hallGroundY + 1.2, hallGroundY + 2.3, 0.9, false);
      buildOpening(alongPos, -courtSide * faceOffset, true, hallGroundY + 1.2, hallGroundY + 2.3, 0.9, false);
    }
    for (const side of [-1, 1]) {
      for (const frac of [-0.25, 0.25]) buildOpening(side * (wallLen / 2 + 0.03), frac * (depth - 1.0), false, hallGroundY + 1.2, hallGroundY + 2.3, 0.9, false);
    }
    S.hip(boxFit.c[0], boxFit.c[1], width - 0.8, depth - 0.6, angle, hallGroundY + 2.9, 2.7, COLORS.tile, {
      flare: 0.12, horns: false, over: 0.8, fascia: 0.22, fasciaCol: shade(COLORS.lacquer, 0.7), ridgeCol: COLORS.ridge, hips: true, segs: 3,
    });
  }
  S.base = baseY - LAND_Y;
}

function buildRearCourtRockeries(S, helpers, baseY) {
  const { box, cyl } = helpers;
  // ---- the rear court (hậu chẩm): rockeries Bảo Sơn, Kình Ngư and Hổ Tôn in a walled garden, a screen at its foot ----
  const buildRockery = (localU, localV, radius, peakH, seedInit) => {
    const pos = toWorld(localU, localV);
    const rockGroundY = groundY(pos[0], pos[1]);
    S.kind = KIND.MASONRY;
    box(localU, localV, rockGroundY - 0.2, rockGroundY + 0.35, radius * 2.6, radius * 2.2, COLORS.stone, { taper: 0.92 }); // the basin's kerb
    S.kind = KIND.PLAIN;
    box(localU, localV, rockGroundY + 0.35, rockGroundY + 0.4, radius * 2.3, radius * 1.9, COLORS.basinWater);
    let seed = seedInit;
    const nextRand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    S.kind = KIND.MASONRY;
    for (let k = 0; k < 6; k++) {
      const offsetU = (nextRand() - 0.5) * radius * 1.4;
      const offsetV = (nextRand() - 0.5) * radius * 1.0;
      const cragH = peakH * (k === 0 ? 1 : 0.35 + nextRand() * 0.45);
      const cragR = radius * (k === 0 ? 0.45 : 0.22 + nextRand() * 0.2);
      cyl(localU + offsetU, localV + offsetV, rockGroundY + 0.3, rockGroundY + 0.3 + cragH, cragR, cragR * 0.35, 5, shade(COLORS.rock, 0.85 + nextRand() * 0.3));
    }
    S.kind = KIND.PLAIN;
    cyl(localU + radius * 0.3, localV, rockGroundY + 0.3 + peakH * 0.7, rockGroundY + 0.3 + peakH * 1.0, 0.45, 0.1, 5, COLORS.bonsaiLeaf); // a bonsai on the crag
  };
  buildRockery(-6.5, -31.5, 2.4, 3.6, 11); // Bảo Sơn
  buildRockery(0.5, -33.5, 2.0, 2.8, 23); // Kình Ngư
  buildRockery(7.0, -31.0, 2.2, 3.2, 37); // Hổ Tôn
  buildRockery(-13.0, 24.0, 1.6, 2.2, 51); // two smaller non bộ at the front of the island, by the water (estimated)
  buildRockery(10.0, 25.0, 1.5, 2.0, 67);
  S.kind = KIND.MASONRY;
  box(-0.4, -39.6, baseY - 0.2, baseY + 2.2, 7.6, 0.5, COLORS.mustard, { top: COLORS.tile }); // the screen (way 695814168)
  S.base = 0;
  fence(S, REAR_COURT_WALL, { ...FENCE.imperial, h: 2.2, plinth: 2.2, wall: COLORS.mustard }, { closed: false });
}

function buildTruongAnGate(S) {
  // ---- Trường An Môn: a three-door masonry gate, the middle bay raised under a two-tier roof, ceramic panels ----
  const gateFit = obb(MAIN_GATE_RING);
  const gateGroundY = groundY(gateFit.c[0], gateFit.c[1]);
  const width = Math.max(gateFit.w, gateFit.d);
  const depth = Math.min(gateFit.w, gateFit.d);
  // its local frame matches the palace's: across = AXIS_U
  const gateWorld = (du, dv): [number, number] => [
    gateFit.c[0] + du * AXIS_U[0] + dv * AXIS_FORWARD[0],
    gateFit.c[1] + du * AXIS_U[1] + dv * AXIS_FORWARD[1],
  ];
  const gateBox = (du, dv, yMin, yMax, boxW, boxD, color, opts?) => {
    const pos = gateWorld(du, dv);
    S.box(pos[0], pos[1], yMin, yMax, boxW, boxD, PALACE_ANGLE, color, opts);
  };
  const gateHip = (du, dv, boxW, boxD, yBase, riseH, opts) => {
    const pos = gateWorld(du, dv);
    S.hip(pos[0], pos[1], boxW, boxD, PALACE_ANGLE, yBase, riseH, COLORS.gateTile, {
      flare: 0.35, fascia: 0.2, fasciaCol: shade(COLORS.lacquer, 0.7), hips: true, glazed: true, ridgeCol: COLORS.gateRidge, segs: 3, ...opts,
    });
  };
  S.base = gateGroundY - LAND_Y;
  S.kind = KIND.MASONRY;
  gateBox(0, 0, gateGroundY - 0.3, gateGroundY + 0.2, width + 1.0, depth + 1.6, COLORS.stone, { topKind: KIND.ROAD });
  const sideBayW = (width - 3.6) / 2;
  const plinthY = gateGroundY + 0.2;
  for (const side of [-1, 1]) {
    const offsetU = side * (1.8 + sideBayW / 2);
    S.kind = KIND.MASONRY;
    gateBox(offsetU, 0, plinthY, plinthY + 3.4, sideBayW, depth, COLORS.mustard, { top: shade(COLORS.gateTile, 0.8) });
    S.kind = KIND.PLAIN;
    for (const faceSign of [-1, 1]) {
      gateBox(offsetU, faceSign * (depth / 2 + 0.02), plinthY, plinthY + 2.4, 1.3, 0.06, COLORS.dark); // side door
      gateBox(offsetU, faceSign * (depth / 2 + 0.03), plinthY + 2.6, plinthY + 3.15, sideBayW - 0.6, 0.06, COLORS.shardTeal); // five-colour shard panel
      gateBox(offsetU + sideBayW * 0.3, faceSign * (depth / 2 + 0.04), plinthY + 2.7, plinthY + 3.05, 0.5, 0.06, COLORS.shardRed);
      gateBox(offsetU - sideBayW * 0.3, faceSign * (depth / 2 + 0.04), plinthY + 2.7, plinthY + 3.05, 0.5, 0.06, COLORS.shardGold);
    }
    gateHip(offsetU, 0, sideBayW, depth, plinthY + 3.4, 1.0, { over: 0.45 });
  }
  // middle bay: the king's door, a name board, an upper storey with its own roof
  S.kind = KIND.MASONRY;
  gateBox(0, 0, plinthY, plinthY + 4.4, 3.6, depth + 0.2, COLORS.mustard, { top: shade(COLORS.gateTile, 0.8) });
  S.kind = KIND.PLAIN;
  for (const faceSign of [-1, 1]) {
    gateBox(0, faceSign * (depth / 2 + 0.12), plinthY, plinthY + 3.0, 1.9, 0.06, COLORS.dark);
    gateBox(0, faceSign * (depth / 2 + 0.13), plinthY + 3.3, plinthY + 3.9, 1.7, 0.06, COLORS.gold);
    gateBox(0, faceSign * (depth / 2 + 0.13), plinthY + 3.1, plinthY + 4.2, 3.2, 0.04, COLORS.gablePanel);
  }
  gateHip(0, 0, 3.6, depth + 0.2, plinthY + 4.4, 0.7, { over: 0.6 });
  S.kind = KIND.MASONRY;
  gateBox(0, 0, plinthY + 4.9, plinthY + 6.0, 2.4, depth - 0.4, COLORS.mustard, { top: shade(COLORS.gateTile, 0.8) });
  S.kind = KIND.PLAIN;
  for (const faceSign of [-1, 1]) gateBox(0, faceSign * (depth / 2 - 0.18), plinthY + 5.1, plinthY + 5.8, 1.6, 0.06, COLORS.shardTeal);
  gateHip(0, 0, 2.4, depth - 0.4, plinthY + 6.0, 1.1, { over: 0.55 });
  // the screen wall standing just inside the gate
  const screenPos = gateWorld(0, -6.0);
  const screenGroundY = groundY(screenPos[0], screenPos[1]);
  S.base = screenGroundY - LAND_Y;
  S.kind = KIND.MASONRY;
  gateBox(0, -6.0, screenGroundY - 0.2, screenGroundY + 2.6, 6.0, 0.55, COLORS.mustard, { top: COLORS.gateTile });
  S.kind = KIND.PLAIN;
  for (const faceSign of [-1, 1]) gateBox(0, -6.0 + faceSign * 0.29, screenGroundY + 0.6, screenGroundY + 2.1, 2.6, 0.04, COLORS.shardTeal);
  gateBox(0, -6.0, screenGroundY + 2.6, screenGroundY + 2.85, 6.5, 0.9, COLORS.gateTile, { taper: 0.6 });
}

function buildSmallGate(S, x, z, angle) {
  const gateGroundY = groundY(x, z);
  S.base = gateGroundY - LAND_Y;
  S.kind = KIND.MASONRY;
  S.box(x, z, gateGroundY - 0.3, gateGroundY + 3.0, 3.6, 1.2, angle, COLORS.mustard, { top: shade(COLORS.gateTile, 0.8) });
  S.kind = KIND.PLAIN;
  S.box(x, z, gateGroundY, gateGroundY + 2.3, 1.5, 1.28, angle, COLORS.dark);
  S.hip(x, z, 3.6, 1.2, angle, gateGroundY + 3.0, 0.9, COLORS.gateTile, {
    flare: 0.3, over: 0.5, fascia: 0.2, fasciaCol: shade(COLORS.lacquer, 0.7), ridgeCol: COLORS.gateRidge, hips: true, glazed: true, segs: 3,
  });
}

function buildChannelAndBalustrade(data, S) {
  // ---- the island's edge: a low grey balustrade of pierced panels along the Đào Nguyên channel (Street View) ----
  // The island is the hole in hue.json's channel pond; the balustrade stands 0.6 m in from the water and breaks
  // where a path or bridge comes ashore.
  const pondIdx = (data.ponds || []).findIndex(
    (pond) => pond.length > 1 && pond[1].length > 8 && pond[1].some((val, i) => i % 2 === 0 && Math.hypot(val / 10 - PALACE_CENTER[0], pond[1][i + 1] / 10 - PALACE_CENTER[1]) < 50),
  );
  const pond = pondIdx >= 0 ? data.ponds[pondIdx] : null;
  const ringFromFlat = (flat) => {
    const ring = [];
    for (let i = 0; i < flat.length; i += 2) ring.push([flat[i] / 10, flat[i + 1] / 10]);
    return ring;
  };
  const outerRing0 = pond ? ringFromFlat(pond[0]) : [];
  const islandRing0 = pond ? ringFromFlat(pond[1]) : [];
  if (!pond) return { outerRing0, islandRing0 };

  const islandRing = [];
  for (let i = 0; i < pond[1].length; i += 2) islandRing.push([pond[1][i] / 10, pond[1][i + 1] / 10]);
  const centerX = islandRing.reduce((acc, pt) => acc + pt[0], 0) / islandRing.length;
  const centerZ = islandRing.reduce((acc, pt) => acc + pt[1], 0) / islandRing.length;
  const kerbRing = islandRing.map(([x, z]) => {
    const len = Math.hypot(centerX - x, centerZ - z) || 1;
    return [x + ((centerX - x) / len) * 0.6, z + ((centerZ - z) / len) * 0.6];
  });
  const nearbyPaths = [];
  for (const [, , flat] of data.roads || []) {
    for (let i = 0; i + 3 < flat.length; i += 2) {
      const ax = flat[i] / 10;
      const az = flat[i + 1] / 10;
      const bx = flat[i + 2] / 10;
      const bz = flat[i + 3] / 10;
      if (Math.hypot((ax + bx) / 2 - centerX, (az + bz) / 2 - centerZ) < 80 + Math.hypot(bx - ax, bz - az) / 2) {
        nearbyPaths.push([ax, az, bx, bz, 3.0]);
      }
    }
  }
  const balustradeSpec = {
    h: 0.95, plinth: 0.4, rail: true, t: 0.3, every: 2.4, postW: 0.34, postUp: 0.12,
    wall: shade(COLORS.grey, 0.85), cap: shade(COLORS.grey, 1.05), iron: shade(COLORS.grey, 0.55), pierW: 0.55, pierUp: 0.35,
  };
  // two levels as Street View shows: a low outer kerb wall at the water, the pierced balustrade 1.6 m behind it
  const innerRing = islandRing.map(([x, z]) => {
    const len = Math.hypot(centerX - x, centerZ - z) || 1;
    return [x + ((centerX - x) / len) * 2.2, z + ((centerZ - z) / len) * 2.2];
  });
  fence(S, kerbRing, { ...balustradeSpec, h: 0.55, plinth: 0.55, rail: false, wall: shade(COLORS.grey, 0.8), cap: shade(COLORS.grey, 1.1) }, { closed: true, roads: nearbyPaths });
  fence(S, innerRing, balustradeSpec, { closed: true, roads: nearbyPaths });

  // ---- the Đào Nguyên channel as the satellite shows it: rock-lined banks and lotus over most of the water, so only
  // a narrow lane of open water shows (the channel's outline is hue.json's pond, left as it is) ----
  const outerRing = [];
  for (let i = 0; i < pond[0].length; i += 2) outerRing.push([pond[0][i] / 10, pond[0][i + 1] / 10]);
  const waterY = pondY(data, pondIdx);
  const isWet = (x, z) => inRing(x, z, outerRing) && !inRing(x, z, islandRing);
  const distToSeg = (x, z, ptA, ptB) => {
    const dx = ptB[0] - ptA[0];
    const dz = ptB[1] - ptA[1];
    const lenSq = dx * dx + dz * dz || 1;
    const proj = Math.max(0, Math.min(1, ((x - ptA[0]) * dx + (z - ptA[1]) * dz) / lenSq));
    return Math.hypot(x - ptA[0] - dx * proj, z - ptA[1] - dz * proj);
  };
  const distToRing = (x, z, ring) => {
    let minDist = 1e9;
    for (let k = 0; k < ring.length; k++) minDist = Math.min(minDist, distToSeg(x, z, ring[k], ring[(k + 1) % ring.length]));
    return minDist;
  };
  const isNearPath = (x, z, pad) => nearbyPaths.some(([ax, az, bx, bz]) => distToSeg(x, z, [ax, az], [bx, bz]) < pad);
  let seed = 4242;
  const nextRand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  // boulders along both banks, standing in the water's edge
  S.kind = KIND.MASONRY;
  for (const ring of [outerRing, islandRing]) {
    for (let k = 0; k < ring.length; k++) {
      const ptA = ring[k];
      const ptB = ring[(k + 1) % ring.length];
      const segLen = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
      for (let dist = 0.6; dist < segLen; dist += 1.1 + nextRand() * 0.5) {
        const bankX = ptA[0] + ((ptB[0] - ptA[0]) * dist) / segLen;
        const bankZ = ptA[1] + ((ptB[1] - ptA[1]) * dist) / segLen;
        // step into the water, away from the bank
        const normX = -(ptB[1] - ptA[1]) / segLen;
        const normZ = (ptB[0] - ptA[0]) / segLen;
        const waterSign = isWet(bankX + normX * 1.0, bankZ + normZ * 1.0) ? 1 : -1;
        const boulderR = 0.45 + nextRand() * 0.35;
        const bankOff = boulderR + 0.15 + nextRand() * 0.3;
        const x = bankX + normX * waterSign * bankOff;
        const z = bankZ + normZ * waterSign * bankOff;
        if (!isWet(x, z) || distToRing(x, z, outerRing) < boulderR + 0.05 || distToRing(x, z, islandRing) < boulderR + 0.05 || isNearPath(x, z, 3.5)) continue;
        S.cyl(x, z, waterY - 0.5, waterY + 0.25 + nextRand() * 0.35, boulderR, boulderR * 0.55, 5, shade(COLORS.rock, 0.8 + nextRand() * 0.35), { rot: nextRand() * 6 });
      }
    }
  }
  // lotus: leaves crowding the water from both banks, a lane of open water left down the middle, a few blooms
  S.kind = KIND.PLAIN;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const [x, z] of outerRing) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  for (let gridX = minX; gridX < maxX; gridX += 1.3) {
    for (let gridZ = minZ; gridZ < maxZ; gridZ += 1.3) {
      const x = gridX + (nextRand() - 0.5) * 1.0;
      const z = gridZ + (nextRand() - 0.5) * 1.0;
      const leafR = 0.5 + nextRand() * 0.35;
      if (!isWet(x, z)) continue;
      const distIsland = distToRing(x, z, islandRing);
      const distOuter = distToRing(x, z, outerRing);
      const laneRatio = Math.abs(distIsland - distOuter) / (distIsland + distOuter);
      if (distIsland < leafR + 1.1 || distOuter < leafR + 1.1 || laneRatio < 0.16 + nextRand() * 0.1 || isNearPath(x, z, 3.0) || nextRand() < 0.12) continue;
      const segCount = 7;
      const startAng = nextRand() * 6.28;
      const leafCol = COLORS.lotusLeaves[Math.floor(nextRand() * COLORS.lotusLeaves.length)];
      const y = waterY + 0.04 + nextRand() * 0.04;
      for (let j = 0; j < segCount; j++) {
        const ang0 = startAng + (j / segCount) * 6.28;
        const ang1 = startAng + ((j + 1) / segCount) * 6.28;
        S.tri([x, y, z], [x + leafR * Math.cos(ang0), y + 0.03, z + leafR * Math.sin(ang0)], [x + leafR * Math.cos(ang1), y + 0.03, z + leafR * Math.sin(ang1)], j % 2 ? leafCol : shade(leafCol, 0.88), [0, 1, 0]);
      }
      if (nextRand() < 0.05) S.cyl(x, z, y + 0.05, y + 0.45, 0.12, 0.18, 5, COLORS.lotusBloom);
    }
  }
  return { outerRing0, islandRing0 };
}

function placePrecinctTrees(data, outerRing0, islandRing0) {
  // ---- trees (satellite): two great shade trees on the island, north of the hall and at its south corner, more on
  // the lawns inside the precinct wall. The generic trees inside the wall become shade trees too (kind 4: never a palm
  // or willow, see geo/foliage.js); the imagery shows none of either here. ----
  if (!Array.isArray(data.trees)) return;
  const trees = data.trees;
  const inWall = (x, z) => inRing(x, z, PRECINCT_WALL);
  const toLocal = (x, z): [number, number] => [
    (x - PALACE_CENTER[0]) * AXIS_U[0] + (z - PALACE_CENTER[1]) * AXIS_U[1],
    (x - PALACE_CENTER[0]) * AXIS_FORWARD[0] + (z - PALACE_CENTER[1]) * AXIS_FORWARD[1],
  ];
  // the court and the paving round the hall are open (satellite): a generic tree standing there moves to one of
  // the trees the imagery shows
  const isPaved = (localU, localV) => Math.abs(localU) < 13.5 && localV > -26.5 && localV < 23;
  const freeSlots = [];
  for (let k = 0; k < trees.length; k += 4) {
    const x = trees[k] / 10;
    const z = trees[k + 1] / 10;
    if (!inWall(x, z)) continue;
    trees[k + 3] = 4;
    if (isPaved(...toLocal(x, z))) freeSlots.push(k);
  }
  for (const [treeU, treeV, scale] of BIG_TREES) {
    const [x, z] = toWorld(treeU, treeV);
    if (!inWall(x, z) || (inRing(x, z, outerRing0) && !inRing(x, z, islandRing0))) continue; // not in the channel
    const entry = [Math.round(x * 10), Math.round(z * 10), Math.round(scale * 10), 4];
    if (freeSlots.length) {
      const slotIdx = freeSlots.shift();
      for (let j = 0; j < 4; j++) trees[slotIdx + j] = entry[j];
    } else {
      trees.push(...entry);
    }
  }
  // any left over stand back on the lawn behind the rear court
  freeSlots.forEach((slotIdx, j) => {
    const [x, z] = toWorld(-20 + j * 12, -56);
    trees[slotIdx] = Math.round(x * 10);
    trees[slotIdx + 1] = Math.round(z * 10);
  });
}

export function build({ data, S }) {
  const originPos = toWorld(0, -10);
  const baseY = groundY(originPos[0], originPos[1]);
  const helpers = createPalaceHelpers(S);
  S.base = baseY - LAND_Y;

  buildMainHallComplex(S, helpers, baseY);
  buildSideHalls(S, baseY);
  buildRearCourtRockeries(S, helpers, baseY);
  buildTruongAnGate(S);

  // ---- Hữu Hòa môn (south, toward Diên Thọ): one doorway under a yellow-tiled roof ----
  const wallAngle = (ptA, ptB) => Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]);
  buildSmallGate(S, SOUTH_GATE_POS[0], SOUTH_GATE_POS[1], wallAngle(PRECINCT_WALL[7], PRECINCT_WALL[0]));
  // Thụy môn (west, the rear wall) and Thanh Minh môn (north, toward the lake): not mapped, put on the axis / mid-wall
  const westGatePos = toWorld(0, -66.6);
  const northGatePos = toWorld(-44.0, -2.0);
  buildSmallGate(S, westGatePos[0], westGatePos[1], wallAngle(PRECINCT_WALL[1], PRECINCT_WALL[2]));
  buildSmallGate(S, northGatePos[0], northGatePos[1], wallAngle(PRECINCT_WALL[2], PRECINCT_WALL[3]));

  // ---- the precinct wall, with openings at the four gates ----
  S.base = 0;
  const gateFit = obb(MAIN_GATE_RING);
  // weathered grey plaster under a grey coping, as Street View shows it beside Trường An Môn
  fence(S, PRECINCT_WALL, { ...FENCE.imperial, kind: KIND.PLAIN, wall: COLORS.grey, cap: shade(COLORS.tile, 1.1) }, {
    closed: true,
    openings: [
      [gateFit.c[0], gateFit.c[1], 5.6],
      [SOUTH_GATE_POS[0], SOUTH_GATE_POS[1], 1.9],
      [westGatePos[0], westGatePos[1], 1.9],
      [northGatePos[0], northGatePos[1], 1.9],
    ],
  });

  const { outerRing0, islandRing0 } = buildChannelAndBalustrade(data, S);
  placePrecinctTrees(data, outerRing0, islandRing0);

  S.kind = KIND.PLAIN;
  S.base = 0;
}
