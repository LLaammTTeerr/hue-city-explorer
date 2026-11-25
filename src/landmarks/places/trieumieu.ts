import { KIND, hex, shade } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { glowPoints } from '../../geo/materials.ts';
import { fence, roadsNear, buildingsNear, FENCE } from '../enclosure.ts';

// Triệu Miếu (Triệu Tổ miếu), the temple of Nguyễn Kim, father of lord Nguyễn Hoàng: built 1804 (the first building of
// the Imperial City), in the south-east corner of the Hoàng Thành behind (north-west of) Thái Miếu, restored 2014-16.
// Sources and estimates: docs/places/trieumieu.md.
//
// The hall is a trùng thiềm điệp ốc like Hưng Miếu's: a front hall (tiền điện) of 5 bays and 2 single wings joined
// under a valley to the main hall (chính điện) of 3 bays and 2 wings, about 540 m² (vi.wikipedia), yellow glazed
// tiles (hoàng lưu ly), ridges and gable ends inlaid with porcelain, columns lacquered red and the ornament gilt. Before
// it a court of about 300 m² of Bát Tràng brick. The precinct (0.541 ha) is closed on its four sides by walls (vi.wikipedia
// says about 1.2 m; the street photo at the west corner shows a plain plastered wall of about 3 m, which the model
// follows), with the gates where OSM maps them; Thần Khố stands to the east, Thần Trù to the west.
//
// Frame: the mapped hall (OSM way 172657570, 24.05 x 23.6 m with its base) at RAW_ORIGIN, u along the facade (toward the
// north-east end), v out of the front (south-east, toward Thái Miếu). The roof on the satellite (24.2 x 22.5 m, its
// long eaves on a bearing of 53-56°, the same as the OSM walls) sits 1.9 m behind and 0.6 m north-east of the OSM
// outline, and the court's row of planters 2.5 m behind where the outline put it; the precinct walls, gates and side
// halls from OSM match the imagery, so only the hall and its court are re-framed: ORIGIN is RAW_ORIGIN moved 0.6 m along u and
// 1.9 m back along v. Everything below is measured from ORIGIN. docs/places/trieumieu.md.
export const id = 'trieumieu';

const ANGLE = Math.atan2(-0.574, 0.819);
const AXIS_X = Math.cos(ANGLE);
const AXIS_Z = Math.sin(ANGLE);
const RAW_ORIGIN = [-935.675, -144.1];
const ORIGIN = [RAW_ORIGIN[0] + 0.6 * AXIS_X + 1.9 * AXIS_Z, RAW_ORIGIN[1] + 0.6 * AXIS_Z - 1.9 * AXIS_X];
const toWorld = (u, v): [number, number] => [ORIGIN[0] + u * AXIS_X - v * AXIS_Z, ORIGIN[1] + u * AXIS_Z + v * AXIS_X];

// the precinct wall: OSM barrier=wall 695810745 from the corner by Thần Trù round the back to its east corner, the
// east side 695810746, and the wall shared with Thái Miếu's court (1346838355), in metres
const PRECINCT_RING = [[-971.9, -84.4], [-998.6, -118.3], [-967.5, -140.1], [-923.1, -171.2], [-892.2, -192.8], [-867.4, -160.0], [-952.3, -98.4]];
// the gates OSM maps (barrier=gate): two in the back wall, one in the wall to Thái Miếu
const WALL_GATES = [[-967.5, -140.1, 0], [-923.1, -171.2, 0], [-952.3, -98.4, 1]];
// the grounds as the z20 satellite shows them: large old trees over the precinct's west half and the garden outside
// its back wall, and hedged beds north-east of the hall (positions read off the satellite, in metres)
const GARDEN_TREES = [
  [-964.3, -138.4, 16], [-957.2, -131.9, 14], [-969.4, -129.0, 15], [-974.4, -121.2, 13], [-962.9, -122.6, 12],
  [-955.7, -175.6, 18], [-942.9, -177.7, 17], [-967.2, -167.0, 16], [-980.1, -161.3, 15],
];

const HALL = { width: 22.0, vFront: 9.9, vBack: -9.9, vValley: 1.2, vDoor: 8.1, baseH: 0.7, verandahH: 3.0 };

const COLORS = {
  roof: PAL.imperialRoof,
  ridge: hex('#f1d77a'),
  lacquer: hex('#b0291c'),
  gold: hex('#e0b03c'),
  wall: hex('#d8c48e'),
  wood: hex('#7a4a2c'),
  stone: PAL.stone,
  brick: hex('#a89c8a'), // the court's worn brick reads pale grey-brown from the air
  clay: hex('#8a5a48'),
  lime: hex('#ddd6c6'), // Thần Trù's unglazed tiles and lime-pointed ridges
  mosaic: [hex('#2f7d8c'), hex('#3f8f4f'), hex('#e8e2d0')], // sành sứ inlay: blues, greens and white
  gable: hex('#d9cfb4'), // Thần Trù's cream lime-plastered walls and gable ends
  planterPot: hex('#3e6f8c'),
  planterTree: hex('#3c5a2e'),
  urnBronze: hex('#4f5446'),
  ruinFloor: hex('#8c7c6c'),
  columnBase: hex('#e4ddcc'),
  hedge: hex('#3d5a2c'),
  bed: hex('#4f6b38'),
};
const LAMP_COLOR: [number, number, number] = [1, 0.62, 0.3];

// the precinct wall as the west-corner street photo shows it: about 3 m (six times the bench before it) of plain,
// weathered grey-ochre lime plaster under a dark unglazed tile coping, no piers
const LOW_WALL_STYLE = { ...FENCE.imperial, h: 3.0, plinth: 3.0, t: 0.5, every: 6.0, postW: 0, wall: hex('#968f7c'), cap: hex('#4a433d'), pierW: 0.8, pierUp: 0.3 };

const groundY = (pos) => LAND_Y + rise(pos[0], pos[1]);
function frameBox(S, u, v, y0, y1, sizeU, sizeV, color, opts?) {
  const pos = toWorld(u, v);
  S.box(pos[0], pos[1], y0, y1, sizeU, sizeV, ANGLE, color, opts);
}

function buildHallBody(S, baseY, floorY, lamps) {
  const { width, vFront, vBack, vDoor, verandahH } = HALL;
  S.base = baseY - LAND_Y;
  // the base: Thanh stone-faced, 0.7 m, the mapped outline's size
  S.kind = KIND.MASONRY;
  frameBox(S, 0, 0, baseY - 0.3, floorY, 24.05, 23.6, COLORS.stone, { taper: 0.985, topKind: KIND.ROAD });
  // three flights up the front (the middle between dragon balustrades), one at each end
  for (const [u, stairW] of ([[0, 3.6], [-7.5, 2.6], [7.5, 2.6]] as any[])) {
    for (let k = 1; k <= 3; k++) {
      frameBox(S, u, 11.8 + 0.32 * k - 0.16, baseY - 0.3, floorY - 0.18 * k, stairW, 0.32, shade(COLORS.stone, 1.05), { topKind: KIND.ROAD });
    }
    if (u) continue;
    S.kind = KIND.PLAIN;
    for (const side of [-1, 1]) {
      const top = toWorld(u + side * (stairW / 2 + 0.2), 11.6);
      const bot = toWorld(u + side * (stairW / 2 + 0.2), 12.9);
      S.beam([top[0], floorY + 0.3, top[1]], [bot[0], baseY + 0.2, bot[1]], 0.34, 0.38, shade(COLORS.stone, 0.9));
    }
    S.kind = KIND.MASONRY;
  }
  for (const side of [-1, 1]) {
    for (let k = 1; k <= 3; k++) {
      frameBox(S, side * (12.03 + 0.32 * k - 0.16), 0, baseY - 0.3, floorY - 0.18 * k, 0.32, 2.6, shade(COLORS.stone, 1.05), { topKind: KIND.ROAD });
    }
  }

  // walls: brick at the back and the two ends (the main hall's back stained wood-tone inside, brick outside)
  S.kind = KIND.MASONRY;
  frameBox(S, 0, vBack + 0.3, floorY, floorY + 4.0, width, 0.6, COLORS.wall);
  for (const side of [-1, 1]) frameBox(S, side * (width / 2 - 0.3), (vBack + vDoor) / 2, floorY, floorY + 3.9, 0.6, vDoor - vBack, COLORS.wall);
  S.kind = KIND.TIMBER;
  frameBox(S, 0, (vBack + vDoor) / 2, floorY, floorY + 3.8, width - 1.2, vDoor - vBack - 0.8, shade(COLORS.wood, 0.7), { top: shade(COLORS.roof, 0.7) });
  // the front: 5 bays of lacquered doors (the middle three the main doors), a gilt transom, the wings walled
  const spans = [2.25, 3.5, 3.5, 4.0, 3.5, 3.5, 2.25].map((span) => span * (width / 22.5));
  const colPositions = [-width / 2];
  for (const span of spans) colPositions.push(colPositions[colPositions.length - 1] + span);
  S.kind = KIND.PLAIN;
  for (let i = 0; i < 7; i++) {
    const u0 = colPositions[i];
    const u1 = colPositions[i + 1];
    const midU = (u0 + u1) / 2;
    const bayW = u1 - u0;
    if (i === 0 || i === 6) {
      S.kind = KIND.MASONRY;
      frameBox(S, midU, vDoor + 0.05, floorY, floorY + verandahH, bayW, 0.3, COLORS.wall);
      S.kind = KIND.PLAIN;
      continue;
    }
    frameBox(S, midU, vDoor + 0.02, floorY, floorY + 2.4, bayW - 0.45, 0.2, i >= 2 && i <= 4 ? shade(COLORS.lacquer, 0.62) : shade(COLORS.lacquer, 0.8));
    frameBox(S, midU, vDoor + 0.06, floorY + 2.4, floorY + 2.95, bayW - 0.3, 0.18, COLORS.gold); // the lattice transom, gilt
  }
  // verandah: 8 red columns on stone bases (six free-standing, as at Hưng Miếu), a beam along their heads, a dark ceiling
  const eaveY = floorY + verandahH;
  for (const u of colPositions) {
    const pos = toWorld(u, vFront);
    S.cyl(pos[0], pos[1], floorY, floorY + 0.28, 0.38, 0.33, 6, shade(COLORS.stone, 0.95), { cap: false, rot: ANGLE });
    S.cyl(pos[0], pos[1], floorY + 0.28, eaveY, 0.21, 0.19, 6, COLORS.lacquer, { cap: false, rot: ANGLE });
  }
  frameBox(S, 0, vFront, eaveY - 0.38, eaveY, width + 0.4, 0.3, shade(COLORS.lacquer, 0.8));
  frameBox(S, 0, vFront - 0.02, eaveY - 0.6, eaveY - 0.38, width - 0.4, 0.12, COLORS.gold); // the gilt liên ba frieze under it
  frameBox(S, 0, (vFront + vDoor) / 2, eaveY - 0.05, eaveY, width, vFront - vDoor, shade(COLORS.lacquer, 0.45), { bottom: true });

  // night: lanterns along the verandah
  for (let i = 1; i < 6; i++) {
    const pos = toWorld((colPositions[i] + colPositions[i + 1]) / 2, vFront - 0.4);
    lamps.push([pos[0], eaveY - 0.6, pos[1]]);
  }
}

function buildHallRoofs(S, floorY) {
  const { width, vFront, vBack, vValley, verandahH } = HALL;
  const eaveY = floorY + verandahH;
  // roofs: the front hall's lower roof and the main hall's higher one behind it, both hipped with curved eaves
  S.kind = KIND.TIMBER;
  const eaveOpts = { fascia: 0.28, fasciaCol: shade(COLORS.lacquer, 0.7), hips: true, glazed: true, ridgeCol: COLORS.ridge, segs: 4 };
  const frontMid = toWorld(0, (vValley + vFront) / 2);
  const backMid = toWorld(0, (vBack + vValley) / 2);
  S.hip(backMid[0], backMid[1], width, vValley - vBack, ANGLE, floorY + 4.0, 4.0, COLORS.roof, { flare: 0.45, over: 1.4, ...eaveOpts }); // ridge 8.0 m over the floor
  S.hip(frontMid[0], frontMid[1], width, vFront - vValley, ANGLE, eaveY, 2.6, COLORS.roof, { flare: 0.4, over: 1.3, ...eaveOpts });
  // ridge ornament: porcelain-inlaid panels along each ridge, a gourd (hồ lô) on a flaming base at the main ridge's middle
  S.kind = KIND.PLAIN;
  for (const [midPos, topY, depthZ, scale] of ([[backMid, floorY + 8.0, vValley - vBack, 1], [frontMid, eaveY + 2.6, vFront - vValley, 0.7]] as any[])) {
    const ridgeThick = Math.max(0.3, Math.min(0.55, (depthZ + 2.7) * 0.035));
    const gourdY = topY + ridgeThick * 1.5;
    S.box(midPos[0], midPos[1], gourdY - 0.2, gourdY + 0.45 * scale, 1.2 * scale, 0.32, ANGLE, COLORS.mosaic[0]);
    S.cyl(midPos[0], midPos[1], gourdY + 0.45 * scale, gourdY + 0.85 * scale, 0.42 * scale, 0.2 * scale, 8, COLORS.gold);
    S.cyl(midPos[0], midPos[1], gourdY + 0.85 * scale, gourdY + 1.3 * scale, 0.26 * scale, 0.04, 6, COLORS.mosaic[1]);
    const ridgeHalfLen = width / 2 + 1.4 - (depthZ + 2.8) / 2 * 0.92;
    for (let k = -2; k <= 2; k++) {
      if (!k) continue;
      const panelPos = [midPos[0] + AXIS_X * (k * ridgeHalfLen) / 2.6, midPos[1] + AXIS_Z * (k * ridgeHalfLen) / 2.6];
      S.box(panelPos[0], panelPos[1], topY + ridgeThick * 0.6, topY + ridgeThick * 1.35, 0.8, ridgeThick * 1.05, ANGLE, COLORS.mosaic[(Math.abs(k) + 1) % 3]);
    }
  }
}

function buildHall(S, lamps) {
  const baseY = groundY(ORIGIN);
  const floorY = baseY + HALL.baseH;
  buildHallBody(S, baseY, floorY, lamps);
  buildHallRoofs(S, floorY);
}

function buildCourt(S) {
  // the front court, about 300 m² of Bát Tràng brick from the steps toward the wall to Thái Miếu's court, a stone walk
  // on the axis
  let maxGroundY = -1e9; // the highest ground under the court, so the paving is not buried where the land rises
  for (const u of [-11, 0, 11]) for (const v of [12.3, 20, 27.6]) maxGroundY = Math.max(maxGroundY, groundY(toWorld(u, v)));
  S.base = maxGroundY - LAND_Y;
  S.kind = KIND.ROAD;
  frameBox(S, 0, 19.95, maxGroundY - 0.5, maxGroundY + 0.12, 22, 15.3, COLORS.brick);
  frameBox(S, 0, 19.65, maxGroundY + 0.12, maxGroundY + 0.16, 2.15, 14.7, shade(COLORS.stone, 1.08));
  // eight porcelain planters on stone stools in a row along the front (the satellite shows 7-8), as at Hưng Miếu, and a bronze urn to the right of the walk
  for (const u of [-10, -7.1, -4.2, -1.4, 1.4, 4.2, 7.1, 10]) {
    const pos = toWorld(u, 13.4); // the row the satellite shows just in front of the steps
    S.kind = KIND.MASONRY;
    S.cyl(pos[0], pos[1], maxGroundY, maxGroundY + 0.5, 0.3, 0.34, 6, shade(COLORS.stone, 0.95));
    S.kind = KIND.PLAIN;
    S.cyl(pos[0], pos[1], maxGroundY + 0.5, maxGroundY + 0.85, 0.34, 0.25, 6, COLORS.planterPot);
    S.cyl(pos[0], pos[1], maxGroundY + 0.85, maxGroundY + 1.35, 0.5, 0.32, 6, COLORS.planterTree);
  }
  const urnPos = toWorld(3.6, 20.5);
  S.kind = KIND.MASONRY;
  S.box(urnPos[0], urnPos[1], maxGroundY, maxGroundY + 0.5, 1.1, 1.1, ANGLE, COLORS.stone);
  S.kind = KIND.PLAIN;
  S.cyl(urnPos[0], urnPos[1], maxGroundY + 0.5, maxGroundY + 1.3, 0.42, 0.5, 8, COLORS.urnBronze);
}

function buildSideHalls(S) {
  // Thần Trù (west, OSM 695810748, 10.3 x 18.7 m): a long hall facing the axis under a gable roof of brown clay tiles
  // with lime-white ridges, as the satellite and street photo show it (not glazed yellow)
  const thanTruPos = [-976.6, -107.0];
  const thanTruY = groundY(thanTruPos);
  S.base = thanTruY - LAND_Y;
  const hallLen = 15.6;
  const hallW = 8.4;
  const wallH = 2.6;
  const ridgeH = 2.5;
  const floorY = thanTruY + 0.35;
  const ridgeAngle = ANGLE + Math.PI / 2;
  const ridgeX = Math.cos(ridgeAngle);
  const ridgeZ = Math.sin(ridgeAngle); // along the ridge
  const roofPt = (along, across, y): [number, number, number] => [thanTruPos[0] + along * ridgeX + across * AXIS_X, y, thanTruPos[1] + along * ridgeZ + across * AXIS_Z]; // across toward the hall (+u)
  S.kind = KIND.MASONRY;
  S.box(thanTruPos[0], thanTruPos[1], thanTruY - 0.3, floorY, hallLen + 1.2, hallW + 1.2, ridgeAngle, COLORS.stone, { taper: 0.98, topKind: KIND.ROAD });
  S.box(thanTruPos[0], thanTruPos[1], floorY, floorY + wallH, hallLen, hallW, ridgeAngle, COLORS.gable, { top: shade(COLORS.clay, 0.8) });
  S.kind = KIND.PLAIN;
  for (const along of [-4.5, -1.5, 1.5, 4.5]) {
    const pos = roofPt(along, hallW / 2 + 0.04, 0);
    S.box(pos[0], pos[2], floorY, floorY + 2.3, 1.4, 0.08, ridgeAngle, COLORS.wood);
  }
  // the gable roof: two slopes with 0.8 m eaves and 0.4 m over the gable ends, the ends closed in plaster
  const eaveTopY = floorY + wallH;
  const eaveOver = 0.8;
  const halfLen = hallLen / 2 + 0.4;
  const halfW = hallW / 2 + eaveOver;
  const eaveEdgeY = eaveTopY - (ridgeH * eaveOver) / (hallW / 2);
  S.kind = KIND.TILE;
  S.quad(roofPt(-halfLen, -halfW, eaveEdgeY), roofPt(halfLen, -halfW, eaveEdgeY), roofPt(halfLen, 0, eaveTopY + ridgeH), roofPt(-halfLen, 0, eaveTopY + ridgeH), COLORS.clay, [-AXIS_X, 0.9, -AXIS_Z]);
  S.quad(roofPt(-halfLen, halfW, eaveEdgeY), roofPt(halfLen, halfW, eaveEdgeY), roofPt(halfLen, 0, eaveTopY + ridgeH), roofPt(-halfLen, 0, eaveTopY + ridgeH), COLORS.clay, [AXIS_X, 0.9, AXIS_Z]);
  S.kind = KIND.MASONRY;
  for (const side of [-1, 1]) {
    S.tri(roofPt(side * hallLen / 2, -hallW / 2, eaveTopY), roofPt(side * hallLen / 2, hallW / 2, eaveTopY), roofPt(side * hallLen / 2, 0, eaveTopY + ridgeH), COLORS.gable, [side * ridgeX, 0, side * ridgeZ]);
  }
  S.kind = KIND.PLAIN;
  S.beam(roofPt(-halfLen, 0, eaveTopY + ridgeH + 0.08), roofPt(halfLen, 0, eaveTopY + ridgeH + 0.08), 0.4, 0.3, COLORS.lime);
  for (const side of [-1, 1]) {
    for (const acrossSign of [-1, 1]) {
      S.beam(roofPt(side * halfLen, 0, eaveTopY + ridgeH + 0.05), roofPt(side * halfLen, acrossSign * halfW, eaveEdgeY + 0.05), 0.28, 0.2, COLORS.lime); // lime-pointed verges
    }
  }

  // Thần Khố (east, OSM 619851654, 12.6 x 17.2 m) is a ruin on the satellite: a bare brick-floored platform with a grid
  // of white column bases, a flight up its long side toward the hall, and a low kerb round it on the lawn
  // re-measured on the z20 satellite: about 13.4 x 18.8 m, centred 2.4 m west and 1.9 m south of the OSM centre
  const khoCenter = [-890.4, -169.4];
  const khoY = groundY(khoCenter);
  const khoTopY = khoY + 0.45;
  const khoW = 13.4;
  const khoLen = 18.8;
  const khoAt = (u, v): [number, number] => [khoCenter[0] + u * AXIS_X - v * AXIS_Z, khoCenter[1] + u * AXIS_Z + v * AXIS_X];
  S.base = khoY - LAND_Y;
  S.kind = KIND.MASONRY;
  for (const [u, v, su, sv] of ([[0, -khoLen / 2 - 0.6, khoW + 1.5, 0.3], [0, khoLen / 2 + 0.6, khoW + 1.5, 0.3], [-khoW / 2 - 0.6, 0, 0.3, khoLen + 1.5], [khoW / 2 + 0.6, 0, 0.3, khoLen + 1.5]] as any[])) {
    const pos = khoAt(u, v);
    S.box(pos[0], pos[1], khoY - 0.2, khoY + 0.15, su, sv, ANGLE, shade(COLORS.stone, 0.95));
  }
  S.box(khoCenter[0], khoCenter[1], khoY - 0.3, khoTopY, khoW, khoLen, ANGLE, shade(COLORS.stone, 0.9), { taper: 0.98, topKind: KIND.ROAD, top: COLORS.ruinFloor });
  for (let k = 1; k <= 2; k++) {
    const pos = khoAt(-khoW / 2 - 0.32 * k + 0.16, 0);
    S.box(pos[0], pos[1], khoY - 0.3, khoTopY - 0.15 * k, 0.32, 4.0, ANGLE, shade(COLORS.stone, 1.05), { topKind: KIND.ROAD });
  }
  S.kind = KIND.PLAIN;
  for (const u of [-4.5, -1.5, 1.5, 4.5]) {
    for (const v of [-7.2, -4.32, -1.44, 1.44, 4.32, 7.2]) {
      const pos = khoAt(u, v);
      S.cyl(pos[0], pos[1], khoTopY, khoTopY + 0.22, 0.32, 0.28, 6, COLORS.columnBase, { rot: ANGLE });
    }
  }
}

// a small gate in the wall, a little taller than it: two piers, a lintel and a tiled hip roof; `isBig` for the gate to Thái Miếu
function buildWallGate(S, pos, angle, isBig) {
  const len = isBig ? 4.2 : 3.4;
  const thick = isBig ? 1.6 : 1.3;
  const y = groundY(pos);
  const height = LOW_WALL_STYLE.h + (isBig ? 0.8 : 0.5);
  const dirX = Math.cos(angle);
  const dirZ = Math.sin(angle);
  S.base = y - LAND_Y;
  S.kind = KIND.MASONRY;
  for (const side of [-1, 1]) {
    S.box(pos[0] + dirX * side * (len / 2 - 0.4), pos[1] + dirZ * side * (len / 2 - 0.4), y - 0.3, y + height, 0.8, thick, angle, LOW_WALL_STYLE.wall, { top: shade(LOW_WALL_STYLE.wall, 0.9) });
  }
  S.box(pos[0], pos[1], y + height - 0.45, y + height + 0.25, len, thick, angle, LOW_WALL_STYLE.wall);
  S.kind = KIND.PLAIN;
  S.box(pos[0], pos[1], y, y + height - 0.5, len - 1.6, 0.1, angle, shade(COLORS.lacquer, 0.8)); // the leaves, shut
  S.hip(pos[0], pos[1], len, thick, angle, y + height + 0.25, isBig ? 1.0 : 0.8, COLORS.roof, { flare: 0.2, over: 0.45, ridgeCol: COLORS.ridge, fascia: 0.12, fasciaCol: shade(COLORS.lacquer, 0.7), hips: true, glazed: true });
}

function buildWalls(S, data) {
  const roads = roadsNear(data, ORIGIN, 160);
  const solid = buildingsNear(data, ORIGIN, 120);
  // the wall to Thái Miếu's court (PRECINCT_RING's last two legs) and its gate are drawn by thaimieu.js as its cross wall
  const ownGates = WALL_GATES.filter(([, , isBig]) => !isBig);
  fence(S, PRECINCT_RING.slice(0, 6), LOW_WALL_STYLE, { closed: false, roads, solid, openings: ownGates.map(([x, z]) => [x, z, 1.6]) });
  for (const [x, z, isBig] of ownGates) {
    // the wall segment through the gate gives its angle
    let gateAngle = 0;
    let bestDist = 1e9;
    for (let i = 0; i < PRECINCT_RING.length; i++) {
      const a = PRECINCT_RING[i];
      const b = PRECINCT_RING[(i + 1) % PRECINCT_RING.length];
      const dx = b[0] - a[0];
      const dz = b[1] - a[1];
      const frac = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
      const dist = Math.hypot(a[0] + dx * frac - x, a[1] + dz * frac - z);
      if (dist < bestDist) {
        bestDist = dist;
        gateAngle = Math.atan2(dz, dx);
      }
    }
    buildWallGate(S, [x, z], gateAngle, isBig);
  }
}

function buildGarden(S, data) {
  const roads = roadsNear(data, ORIGIN, 120);
  const nearPath = (x, z, pad) => roads.some(([ax, az, bx, bz, width]) => {
    const dx = bx - ax;
    const dz = bz - az;
    const lenSq = dx * dx + dz * dz;
    const frac = lenSq ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lenSq)) : 0;
    return Math.hypot(ax + dx * frac - x, az + dz * frac - z) < width / 2 + pad;
  });
  let addedCount = 0;
  for (const [x, z, scale] of GARDEN_TREES) {
    if (nearPath(x, z, 2.5)) continue;
    data.trees.push(Math.round(x * 10), Math.round(z * 10), scale, 1); // kind 1: dark broadleaf canopy
    addedCount++;
  }
  // two hedged beds: clipped borders 0.5 m wide and 0.8 m high round a planted bed
  S.kind = KIND.PLAIN;
  for (const [u0, v0] of ([[17.5, 23.0], [21.5, 16.5]] as any[])) { // beside the court, as the satellite shows them
    const bedW = 5.0;
    const bedD = 5.8;
    if (nearPath(...toWorld(u0, v0), 3)) continue;
    const baseY = groundY(toWorld(u0, v0));
    S.base = baseY - LAND_Y;
    frameBox(S, u0, v0, baseY - 0.1, baseY + 0.25, bedW - 1, bedD - 1, COLORS.bed);
    for (const [du, dv, su, sv] of ([[0, -bedD / 2, bedW, 0.5], [0, bedD / 2, bedW, 0.5], [-bedW / 2, 0, 0.5, bedD], [bedW / 2, 0, 0.5, bedD]] as any[])) {
      const pos = toWorld(u0 + du, v0 + dv);
      if (nearPath(pos[0], pos[1], 0.8)) continue;
      frameBox(S, u0 + du, v0 + dv, baseY - 0.1, baseY + 0.8, su, sv, COLORS.hedge);
    }
  }
  return addedCount;
}

export function build({ data, S, group }) {
  const lamps = [];
  buildHall(S, lamps);
  const pavedStart = S.n;
  buildCourt(S);
  (S.paved = S.paved || []).push([pavedStart, S.n]); // brick court: no trees, no houses (src/geo/city.js coverOf)
  buildSideHalls(S);
  buildWalls(S, data);
  buildGarden(S, data);
  S.kind = KIND.PLAIN;
  S.base = 0;
  if (lamps.length) {
    const pos = [];
    const col = [];
    for (const lamp of lamps) {
      pos.push(...lamp);
      col.push(...LAMP_COLOR);
    }
    const pts = glowPoints(pos, col, 4);
    pts.userData.glow = true;
    pts.userData.landmark = id;
    group.add(pts);
  }
}
