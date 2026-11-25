import polygonClipping from 'polygon-clipping';
import { KIND, hex, shade, rand, inRing, unflat } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { glowPoints } from '../../geo/materials.ts';
import { pavilion } from '../citadel.ts';
import { fence, roadsNear, buildingsNear, FENCE } from '../enclosure.ts';
import { REAR_GATE_CUTS } from './hungmieu.ts';
import { planter, kylan, kiosk } from '../props.ts';

// Thế Miếu (Thế Tổ Miếu), the dynastic temple of the Nguyễn emperors in the south-west of the Imperial City, built
// 1821-22 under Minh Mạng. Sources and estimates: docs/places/themieu.md.
//
// The hall is a trùng thiềm điệp ốc: a front hall (tiền điện) of 11 bays and 2 single wings and, joined to it under
// a valley, the main hall (chính điện) of 9 bays and 2 double wings, together 54.60 x 27.70 m on a base of nearly
// 1 m (vi.wikipedia), roofed in yellow glazed tiles (hoàng lưu ly) with a pháp lam disc on the ridge. Before it the
// court of Bát Tràng brick with a row of 14 stone stools carrying potted trees and a pair of bronze kỳ lân; Thổ Công
// từ stands to the west, Canh Y điện (a ruin, only its base) to the east; behind, the wall to Hưng Miếu's court with
// the gates Hiển Hựu and Đốc Hựu; in the side walls Khải Địch and Sùng Thành; in the front wall Miếu Môn; outside the
// cross wall the two shrines Tả and Hữu Tùng tự. Hiển Lâm Các, its towers, gates and cross wall, and the nine urns
// are modelled by places/hienlam (civic.js before); Hưng Miếu by its own place.
//
// Frame: the mapped hall (OSM way 172657567, 55.9 x 29.0 m with its base) centred at ORIGIN, u along the facade (toward
// the north-east end), v out of the front (toward Hiển Lâm Các, south-east).
export const id = 'themieu';

const ORIGIN = [-1293.6, 191.8];
const ANGLE = Math.atan2(-0.592, 0.806);
const AXIS_X = Math.cos(ANGLE);
const AXIS_Z = Math.sin(ANGLE);
const toWorld = (u, v): [number, number] => [ORIGIN[0] + u * AXIS_X - v * AXIS_Z, ORIGIN[1] + u * AXIS_Z + v * AXIS_X];

// the compound wall (OSM barrier=wall 695810851) and the wall between the courts of Thế Miếu and Hưng Miếu
// (695810842), in metres; drawn here instead of civic.js once this place is built
const OUTER_WALL = [[-1246.8, 263.2], [-1292.4, 297.1], [-1312.7, 270.1], [-1354.6, 214.3], [-1386.8, 171.6], [-1356.9, 149.4], [-1316.0, 119.1], [-1287.5, 97.9], [-1255.3, 140.7], [-1213.7, 196.0], [-1193.4, 223.0], [-1238.4, 256.4]];
const DIVIDE_WALL = [[-1335.2, 199.9], [-1325.1, 192.3], [-1283.5, 161.5], [-1272.8, 153.6]];

const HALL = { width: 52.6, vFront: 12.9, vBack: -12.9, vValley: 2.7, baseH: 1.0, wallH: 3.6, upperInset: 3.0 };

const COLORS = {
  tungRoof: hex('#5f5d58'), // the two Tùng tự: dark grey tile on the satellite
  roof: PAL.imperialRoof,
  ridge: hex('#f1d77a'),
  lacquer: PAL.lacquer,
  gold: hex('#d9a93a'),
  wall: hex('#d8c48e'), // lime-washed brick of the end and back walls
  stone: PAL.stone,
  brick: hex('#9c7a64'),
  bronze: hex('#4f5446'),
  enamel: [hex('#2f7d8c'), hex('#3f8f4f'), hex('#e0b23a')], // pháp lam blues, greens and yellow
  lawn: hex('#8a9a5a'),
  pineTrunk: hex('#5a4535'),
  pineCrown: hex('#2f4d2b'),
};
const LAMP_COLOR: [number, number, number] = [1, 0.62, 0.3];
const TREE_KEEP_OUT = [[-50.7, -1.7, 10], [50.7, -1.7, 9.5], [43.7, 67.0, 10], [-45.0, 69.2, 10], [0, 58.2, 14]]; // buildings (u, v, r) the trees keep off

const groundY = (pos) => LAND_Y + rise(pos[0], pos[1]);

// a box in the frame: centre (u, v), size along u and v
function frameBox(S, u, v, y0, y1, sizeU, sizeV, color, opts?) {
  const pos = toWorld(u, v);
  S.box(pos[0], pos[1], y0, y1, sizeU, sizeV, ANGLE, color, opts);
}

// a small brick gate with a tiled hip roof, standing across a wall: centre pos, opening along `angle` (the wall's angle)
function buildWallGate(S, pos, angle, len, thick, y) {
  const dirX = Math.cos(angle);
  const dirZ = Math.sin(angle);
  S.kind = KIND.MASONRY;
  for (const side of [-1, 1]) {
    S.box(pos[0] + dirX * side * (len / 2 - 0.55), pos[1] + dirZ * side * (len / 2 - 0.55), y - 0.3, y + 3.2, 1.1, thick, angle, COLORS.wall, { top: shade(COLORS.wall, 0.9) });
  }
  S.box(pos[0], pos[1], y + 2.7, y + 3.4, len, thick, angle, COLORS.wall);
  S.kind = KIND.PLAIN;
  S.box(pos[0], pos[1], y, y + 2.6, len - 2.2, 0.12, angle, shade(COLORS.lacquer, 0.8)); // the leaves, shut
  S.hip(pos[0], pos[1], len, thick, angle, y + 3.4, 1.2, COLORS.roof, { flare: 0.25, over: 0.5, ridgeCol: COLORS.ridge, fascia: 0.15, fasciaCol: shade(COLORS.lacquer, 0.7), hips: true, glazed: true });
}

function buildHallBody(S, baseY, floorY, lamps) {
  const { width, vFront, vBack, wallH } = HALL;
  S.base = baseY - LAND_Y;
  // the base: stone-faced, 1.0 m, the mapped outline
  S.kind = KIND.MASONRY;
  frameBox(S, 0, 0, baseY - 0.3, floorY, 55.9, 29.0, COLORS.stone, { taper: 0.985, topKind: KIND.ROAD });
  // three flights up the front (the middle one between dragon balustrades) and one at each end
  for (const [u, stairW] of ([[0, 4.3], [-17.2, 3.4], [17.2, 3.4]] as any[])) {
    for (let k = 1; k <= 4; k++) {
      frameBox(S, u, 14.5 + 0.32 * k - 0.16, baseY - 0.3, floorY - 0.2 * k, stairW, 0.32, shade(COLORS.stone, 1.05), { topKind: KIND.ROAD });
    }
    S.kind = KIND.PLAIN;
    for (const side of [-1, 1]) {
      const top = toWorld(u + side * (stairW / 2 + 0.2), 14.4);
      const bot = toWorld(u + side * (stairW / 2 + 0.2), 15.9);
      S.beam([top[0], floorY + 0.3, top[1]], [bot[0], baseY + 0.25, bot[1]], 0.36, 0.4, shade(COLORS.stone, 0.9));
    }
    S.kind = KIND.MASONRY;
  }
  for (const side of [-1, 1]) {
    for (let k = 1; k <= 4; k++) {
      frameBox(S, side * (27.95 + 0.32 * k - 0.16), 0, baseY - 0.3, floorY - 0.2 * k, 0.32, 3.4, shade(COLORS.stone, 1.05), { topKind: KIND.ROAD });
    }
  }

  // walls: brick at the back and the two ends, the front a row of lacquered door panels behind the verandah; all
  // stop under the lower eave, which runs round the whole hall at one height (satellite: an unbroken skirt band)
  S.kind = KIND.MASONRY;
  frameBox(S, 0, vBack + 0.3, floorY, floorY + wallH, width, 0.6, COLORS.wall);
  for (const side of [-1, 1]) {
    frameBox(S, side * (width / 2 - 0.3), (vBack + 10.8) / 2, floorY, floorY + wallH, 0.6, 10.8 - vBack, COLORS.wall);
  }
  // the dark interior seen through nothing: a closed core so the roofs have something under them
  S.kind = KIND.TIMBER;
  frameBox(S, 0, (vBack + 10.8) / 2, floorY, floorY + 3.5, width - 1.2, 10.8 - vBack - 0.8, shade(COLORS.lacquer, 0.7), { top: shade(COLORS.roof, 0.7) });
  // the front: 11 bays of doors (bức bàn) in the front hall, a gilt frieze over them, the wing bays walled
  const spans = [2.65, ...Array(11).fill(4.3), 2.65];
  const colPositions = [-width / 2];
  for (const span of spans) colPositions.push(colPositions[colPositions.length - 1] + span);
  S.kind = KIND.PLAIN;
  for (let i = 0; i < 13; i++) {
    const u0 = colPositions[i];
    const u1 = colPositions[i + 1];
    const midU = (u0 + u1) / 2;
    const bayW = u1 - u0;
    if (i === 0 || i === 12) {
      S.kind = KIND.MASONRY;
      frameBox(S, midU, 10.85, floorY, floorY + wallH, bayW, 0.3, COLORS.wall);
      S.kind = KIND.PLAIN;
      continue;
    }
    frameBox(S, midU, 10.82, floorY, floorY + 2.85, bayW - 0.5, 0.2, i === 6 ? shade(COLORS.lacquer, 0.62) : shade(COLORS.lacquer, 0.78));
    frameBox(S, midU, 10.86, floorY + 2.85, floorY + 3.55, bayW - 0.3, 0.18, COLORS.gold); // the lattice transom, gilt
  }
  // verandah: 14 red columns on stone bases, beams along their heads, a dark ceiling over the gallery
  const eaveY = floorY + wallH;
  for (const u of colPositions) {
    const pos = toWorld(u, vFront);
    S.cyl(pos[0], pos[1], floorY, floorY + 0.3, 0.42, 0.36, 6, shade(COLORS.stone, 0.95), { cap: false, rot: ANGLE });
    S.cyl(pos[0], pos[1], floorY + 0.3, eaveY, 0.24, 0.22, 6, COLORS.lacquer, { cap: false, rot: ANGLE });
  }
  frameBox(S, 0, vFront, eaveY - 0.4, eaveY, width + 0.4, 0.34, shade(COLORS.lacquer, 0.75));
  frameBox(S, 0, (vFront + 10.8) / 2, eaveY - 0.05, eaveY, width, vFront - 10.8, shade(COLORS.lacquer, 0.45), { bottom: true });

  // night: lanterns along the verandah
  for (let i = 1; i < 13; i += 2) {
    const pos = toWorld((colPositions[i] + colPositions[i + 1]) / 2, vFront - 0.4);
    lamps.push([pos[0], eaveY - 0.7, pos[1]]);
  }
}

function buildHallRoofs(S, floorY) {
  const { width, vFront, vBack, vValley, wallH, upperInset } = HALL;
  const eaveY = floorY + wallH;
  // roofs: the front hall's single hip, and the main hall behind it under double eaves (as Điện Thái Hòa): a skirt
  // of tiles round its back and both ends at the front hall's eave height, a short lacquered clerestory, and the
  // upper hip set in 3 m from the skirt's column line. The satellite shows the skirt band on all sides with the
  // upper roofs inside it (refs in scratch, docs/places/themieu.md); heights stay the documented estimates.
  S.kind = KIND.TIMBER;
  const eaveOpts = { fascia: 0.32, fasciaCol: shade(COLORS.lacquer, 0.7), hips: true, glazed: true, ridgeCol: COLORS.ridge, segs: 4 };
  const upperW = width - 2 * upperInset;
  const upperBack = vBack + upperInset;
  const upperFront = vValley + 1.0;
  const upperEaveY = floorY + 6.0;
  const frontMid = toWorld(0, (vValley + vFront) / 2);
  const backMid = toWorld(0, (upperBack + upperFront) / 2);
  const skirtMid = toWorld(0, (vBack + vValley) / 2);
  S.hip(skirtMid[0], skirtMid[1], width, vValley - vBack, ANGLE, eaveY, 4.3, COLORS.roof, { flare: 0.5, over: 1.7, ...eaveOpts, ridgeCol: null }); // the skirt
  S.kind = KIND.PLAIN;
  frameBox(S, 0, (upperBack + upperFront) / 2, floorY + 4.9, upperEaveY, upperW, upperFront - upperBack, shade(COLORS.lacquer, 0.8));
  S.kind = KIND.TIMBER;
  S.hip(backMid[0], backMid[1], upperW, upperFront - upperBack, ANGLE, upperEaveY, 4.5, COLORS.roof, { flare: 0.5, over: 1.4, ...eaveOpts }); // ridge 10.5 m over the floor
  S.hip(frontMid[0], frontMid[1], width, vFront - vValley, ANGLE, eaveY, 3.3, COLORS.roof, { flare: 0.45, over: 1.6, ...eaveOpts });

  // ridge ornament: on each ridge a pháp lam disc (mặt nhật) on a flame-shaped base, and enamel panels along it
  S.kind = KIND.PLAIN;
  for (const [midPos, topY, depthZ, ridgeW] of ([[backMid, floorY + 10.5, upperFront - upperBack, upperW], [frontMid, eaveY + 3.3, vFront - vValley, width]] as any[])) {
    const ridgeThick = Math.max(0.3, Math.min(0.6, (depthZ + 3.3) * 0.035));
    const discY = topY + ridgeThick * 1.6;
    const scale = midPos === backMid ? 1 : 0.75;
    S.box(midPos[0], midPos[1], discY - 0.2, discY + 0.5 * scale, 1.4 * scale, 0.35, ANGLE, COLORS.enamel[0]);
    S.cyl(midPos[0], midPos[1], discY + 0.5 * scale, discY + 1.0 * scale, 0.55 * scale, 0.25 * scale, 8, COLORS.enamel[2]);
    S.cyl(midPos[0], midPos[1], discY + 1.0 * scale, discY + 1.5 * scale, 0.25 * scale, 0.04, 6, COLORS.enamel[1]);
    const ridgeHalfLen = ridgeW / 2 + 1.6 - (depthZ + 3.4) / 2 * 0.92;
    for (let k = -3; k <= 3; k++) {
      if (!k) continue;
      const panelPos = [midPos[0] + AXIS_X * (k * ridgeHalfLen) / 3.6, midPos[1] + AXIS_Z * (k * ridgeHalfLen) / 3.6];
      S.box(panelPos[0], panelPos[1], topY + ridgeThick * 0.6, topY + ridgeThick * 1.4, 0.9, ridgeThick * 1.05, ANGLE, COLORS.enamel[Math.abs(k) % 2]);
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
  const baseY = groundY(toWorld(0, 30));
  S.base = baseY - LAND_Y;
  // Bát Tràng brick from the hall to the cross wall of Hiển Lâm Các, and a stone walk on the axis
  S.kind = KIND.ROAD;
  // the paving ends in line with the hall's ends (satellite: lawn and trees either side), 56 m wide
  frameBox(S, 0, 32.5, baseY - 0.2, baseY + 0.06, 56, 36, COLORS.brick);
  frameBox(S, 0, 32.5, baseY + 0.06, baseY + 0.1, 4.3, 36, shade(COLORS.stone, 1.08));
  // the 14 stone stools (đôn) in a row before the hall, each carrying a pot with a clipped tree
  for (let i = 0; i < 14; i++) {
    const u = (i - 6.5) * 4.3;
    const pos = toWorld(u, 19.5);
    if (Math.abs(u) < 3) continue;
    planter(S, pos[0], baseY + 0.06, pos[1], ANGLE, { r: 0.4, stand: 0.55, standCol: shade(COLORS.stone, 0.95) });
  }
  // a pair of bronze kỳ lân, one on each side of the court, each in its metal kiosk (thiết đình, vi.wikipedia),
  // facing the walk; the kiosk's form and both positions are estimated (docs/places/courtyard-objects.md)
  for (const side of [-1, 1]) {
    const pos = toWorld(side * 25, 28);
    kiosk(S, pos[0], baseY + 0.06, pos[1], ANGLE, { w: 2.6, h: 3.3, slabCol: COLORS.stone });
    kylan(S, pos[0], baseY + 0.31, pos[1], ANGLE + (side > 0 ? Math.PI : 0), { s: 1.15, col: COLORS.bronze, plinth: 0.7, plinthCol: COLORS.stone });
  }
  // the old pine by the west end of the hall
  const pinePos = toWorld(-33, 4);
  const pineY = groundY(pinePos);
  S.kind = KIND.PLAIN;
  S.cyl(pinePos[0], pinePos[1], pineY, pineY + 9, 0.38, 0.22, 6, COLORS.pineTrunk);
  for (const [y0, y1, radius] of ([[5.5, 8.5, 3.6], [8, 11, 3.0], [10.5, 13, 2.3], [12.5, 14.5, 1.4]] as any[])) {
    S.cyl(pinePos[0], pinePos[1], pineY + y0, pineY + y1, radius, radius * 0.45, 7, COLORS.pineCrown);
  }
}

function buildSideShrines(S) {
  // Thổ Công từ to the west of the hall (OSM 16 x 16 m with its terrace); Canh Y điện to the east, now a ruined base
  const thoCong = toWorld(-50.7, -1.7);
  S.base = groundY(thoCong) - LAND_Y;
  pavilion(S, thoCong[0], thoCong[1], 11.0, 10.5, ANGLE, groundY(thoCong), { wallH: 3.0, roof: COLORS.roof, wall: COLORS.lacquer, over: 1.2, rh: 2.4, platform: 0.6, colonnade: true, segs: 3 });
  const canhY = toWorld(50.7, -1.7);
  const canhYY = groundY(canhY);
  S.base = canhYY - LAND_Y;
  S.kind = KIND.MASONRY;
  S.box(canhY[0], canhY[1], canhYY - 0.3, canhYY + 0.5, 12.4, 11.4, ANGLE, shade(COLORS.stone, 0.85), { taper: 0.98, topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (i % 3 && j % 3) continue;
      const basePos = toWorld(50.7 - 4.5 + i * 3, -1.7 - 4.5 + j * 3);
      S.cyl(basePos[0], basePos[1], canhYY + 0.5, canhYY + 0.72, 0.38, 0.32, 6, shade(COLORS.stone, 0.75));
    }
  }
  // Tả and Hữu Tùng tự, outside the cross wall, facing each other across the yard before Hiển Lâm Các. The
  // satellite shows each under two parallel roofs with their ridges along v (a front and a rear house, the front
  // toward the axis), about 13 x 15 m over the eaves, in dark grey tile, not yellow
  for (const [u, v] of ([[43.7, 67.0], [-45.0, 69.2]] as any[])) {
    const pos = toWorld(u, v);
    const shrineY = groundY(pos);
    const faceDir = -Math.sign(u); // toward the axis
    S.base = shrineY - LAND_Y;
    S.kind = KIND.MASONRY;
    frameBox(S, u, v, shrineY - 0.3, shrineY + 0.5, 12.6, 14.4, shade(COLORS.stone, 0.95), { taper: 0.98, topKind: KIND.ROAD });
    S.kind = KIND.TIMBER; // a lacquered timber-panelled body, not brick
    frameBox(S, u, v, shrineY + 0.5, shrineY + 3.4, 10.4, 12.4, COLORS.lacquer);
    // a door of three leaves and a short stair on the side toward the axis, a gilt lintel over it
    S.kind = KIND.PLAIN;
    frameBox(S, u + faceDir * 5.25, v, shrineY + 0.5, shrineY + 2.7, 0.14, 4.2, shade(COLORS.lacquer, 0.62));
    frameBox(S, u + faceDir * 5.27, v, shrineY + 2.7, shrineY + 3.2, 0.14, 4.6, COLORS.gold);
    S.kind = KIND.MASONRY;
    for (let k = 1; k <= 3; k++) {
      frameBox(S, u + faceDir * (6.3 + 0.3 * k - 0.15), v, shrineY - 0.3, shrineY + 0.5 - 0.17 * k, 0.3, 4.6, shade(COLORS.stone, 1.05), { topKind: KIND.ROAD });
    }
    S.kind = KIND.TIMBER;
    for (const [du, roofW, roofH] of ([[faceDir * 2.9, 5.6, 2.2], [-faceDir * 2.9, 5.6, 2.4]] as any[])) {
      const roofPos = toWorld(u + du, v);
      S.hip(roofPos[0], roofPos[1], 13.0, roofW, ANGLE + Math.PI / 2, shrineY + 3.4, roofH, COLORS.tungRoof, { flare: 0.45, over: 1.0, fascia: 0.25, fasciaCol: shade(COLORS.lacquer, 0.7), hips: true, ridgeCol: shade(COLORS.tungRoof, 1.25), segs: 3 });
    }
  }
}

function buildWalls(S, data) {
  const roads = roadsNear(data, ORIGIN, 220);
  const solid = buildingsNear(data, ORIGIN, 200);
  // gates: Khải Địch and Sùng Thành in the side walls on the axis of the court, Miếu Môn in the front wall,
  // Hiển Hựu and Đốc Hựu at the ends of the wall behind the hall
  const sideGates = [toWorld(62.1, 11.3), toWorld(-62.1, 11.5)];
  const frontGate = [-1243.2, 259.3];
  // Hưng Miếu's two rear gates stand in this wall (hungmieu.js draws them): it stops clear of their roofs
  fence(S, OUTER_WALL, FENCE.imperial, {
    closed: true,
    roads,
    solid: [...solid, ...REAR_GATE_CUTS],
    openings: [[sideGates[0][0], sideGates[0][1], 2.6], [sideGates[1][0], sideGates[1][1], 2.6], [frontGate[0], frontGate[1], 4.8]],
  });
  fence(S, DIVIDE_WALL, FENCE.imperial, { closed: false, roads, solid });
  const sideWallAngle = Math.atan2(AXIS_Z, AXIS_X) + Math.PI / 2; // the side walls run along v
  for (const pos of sideGates) buildWallGate(S, pos, sideWallAngle, 5.4, 2.4, groundY(pos));
  buildWallGate(S, frontGate, ANGLE, 10.0, 2.6, groundY(frontGate));
  for (const pos of [toWorld(41.8, -18.6), toWorld(-40.8, -18.4)]) buildWallGate(S, pos, ANGLE, 5.2, 1.6, groundY(pos));
}

// The ground inside the walls: lawn under trees, not bare sand (satellite: only the court before the hall is paved),
// with narrow brick walks round the hall, along the court and out to the side gates. The compound is mapped as
// landuse=religious, which the city draws as sand; this lays the lawn over it on Thế Miếu's side of the cross wall
// (Hưng Miếu's court behind it is that place's), leaving out the hall and court and the mapped paved yards
// (the forecourt of Hiển Lâm Các). Extra shade trees join data.trees on the lawn; populate plants them.
function buildGrounds(S, data) {
  const baseY = groundY(ORIGIN);
  const closeRing = (ring) => [...ring, ring[0]];
  const uvQuad = (u0, u1, v0, v1) => [toWorld(u0, v0), toWorld(u1, v0), toWorld(u1, v1), toWorld(u0, v1)];
  const hallAndCourt = [toWorld(-29.6, -15.2), toWorld(29.6, -15.2), toWorld(29.6, 14.5), toWorld(28.2, 14.5), toWorld(28.2, 50.6), toWorld(-28.2, 50.6), toWorld(-28.2, 14.5), toWorld(-29.6, 14.5)];
  const pavedPolys = (data.green || [])
    .filter(([kind]) => kind === 'paved')
    .map(([, poly]) => unflat(poly[0]))
    .filter((ring) => ring.some((pt) => inRing(pt[0], pt[1], OUTER_WALL)));
  let lawnPolys = [];
  try {
    const southSide = polygonClipping.intersection([closeRing(OUTER_WALL)], [closeRing(uvQuad(-200, 200, -17.6, 200))]);
    lawnPolys = polygonClipping.difference(southSide, [closeRing(hallAndCourt)], ...pavedPolys.map((ring) => [closeRing(ring)])).map((pg) => pg.map((ring) => ring.slice(0, -1)));
  } catch {
    lawnPolys = [];
  }
  // 14 cm thick: the city's ground overlay is drawn with a polygon offset that beats a thinner lawn at grazing angles
  S.base = baseY - LAND_Y;
  S.kind = KIND.GROUND;
  for (const [ring, ...holes] of lawnPolys) {
    if (ring.length > 2) S.prism(ring, baseY - 0.1, baseY + 0.14, COLORS.lawn, COLORS.lawn, { holes, topKind: KIND.GROUND });
  }
  // brick walks, a little proud of the lawn
  S.kind = KIND.ROAD;
  const drawWalk = (ring) => S.prism(ring, baseY - 0.05, baseY + 0.17, COLORS.brick, COLORS.brick, { topKind: KIND.ROAD });
  drawWalk(uvQuad(-31.1, 31.1, -16.7, -15.2)); // behind the hall
  for (const side of [-1, 1]) {
    drawWalk(uvQuad(side > 0 ? 29.6 : -31.1, side > 0 ? 31.1 : -29.6, -15.2, 14.5)); // along each end
    drawWalk(uvQuad(side > 0 ? 31.1 : -61.0, side > 0 ? 61.0 : -31.1, 10.6, 12.2)); // out to the side gate
    drawWalk(uvQuad(side > 0 ? 28.2 : -29.7, side > 0 ? 29.7 : -28.2, 14.5, 50.6)); // along the court's side
  }
  plantLawnTrees(data, lawnPolys);
}

function plantLawnTrees(data, lawnPolys) {
  // shade trees on the lawn, kept off the buildings, walks and walls and apart from the mapped ones
  if (!Array.isArray(data.trees)) return;
  const trees = data.trees;
  const existing = [];
  for (let k = 0; k < trees.length; k += 4) {
    const x = trees[k] / 10;
    const z = trees[k + 1] / 10;
    if (inRing(x, z, OUTER_WALL)) existing.push([x, z]);
  }
  const wallSegs = [OUTER_WALL.map((pt, i) => [pt, OUTER_WALL[(i + 1) % OUTER_WALL.length]]), DIVIDE_WALL.slice(1).map((pt, i) => [DIVIDE_WALL[i], pt])].flat();
  const distToSeg = (x, z, a, b) => {
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const lenSq = dx * dx + dz * dz || 1;
    const frac = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / lenSq));
    return Math.hypot(x - a[0] - dx * frac, z - a[1] - dz * frac);
  };
  let seedIdx = 0;
  for (let u = -90; u <= 90; u += 7.5) {
    for (let v = -16; v <= 110; v += 7.5) {
      seedIdx++;
      const jitterU = u + (rand(seedIdx, 31) - 0.5) * 5;
      const jitterV = v + (rand(seedIdx, 32) - 0.5) * 5;
      const [x, z] = toWorld(jitterU, jitterV);
      if (rand(seedIdx, 33) > 0.5) continue;
      if (!lawnPolys.some(([ring, ...holes]) => inRing(x, z, ring) && !holes.some((hole) => inRing(x, z, hole)))) continue;
      if (Math.abs(jitterU) < 34 && jitterV > -20 && jitterV < 54) continue; // the hall, its walks and the court
      if (Math.abs(jitterV - 11.4) < 3.5 || TREE_KEEP_OUT.some(([a, b, radius]) => Math.hypot(jitterU - a, jitterV - b) < radius)) continue;
      if (wallSegs.some(([a, b]) => distToSeg(x, z, a, b) < 3)) continue;
      if (existing.some((pt) => Math.hypot(pt[0] - x, pt[1] - z) < 5.5)) continue;
      trees.push(Math.round(x * 10), Math.round(z * 10), Math.round((0.85 + 0.4 * rand(seedIdx, 34)) * 10), 0);
      existing.push([x, z]);
    }
  }
}

export function build({ data, S, group }) {
  const lamps = [];
  buildGrounds(S, data);
  buildHall(S, lamps);
  buildCourt(S);
  buildSideShrines(S);
  buildWalls(S, data);
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
