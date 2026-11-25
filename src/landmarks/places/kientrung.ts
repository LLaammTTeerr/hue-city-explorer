import { KIND, hex, shade } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { glowPoints } from '../../geo/materials.ts';
import { cannon, vac } from '../props.ts';

// Điện Kiến Trung, the last palace of the Forbidden Purple City (Tử Cấm Thành), at the north end of the Imperial
// City's axis behind Khôn Thái. Built 1921-23 under Khải Định, destroyed 1947 (only the base and its balustrade were
// left), rebuilt 2019-23 and opened to visitors in 2024. Sources and estimates: docs/places/kientrung.md.
//
// Confirmed: two storeys about 14 m high; a long south front of 13 openings on each floor (a projecting middle
// avant-corps of 5, recessed wings of 3, and a projecting end bay at each corner carrying a large door, a large window
// and an Asian-style gable); yellow glazed roof tiles with slightly raised edges and a Vietnamese-style parapet; the
// front faced in multicoloured porcelain mosaic (sành sứ); French balusters along the whole front; a raised terrace
// reached by three dragon-flanked stairs; a geometric (Art Deco) garden in front, with a fountain, cannons and brick
// stools in the precinct.
// OSM (hard-coded below, metres in the model frame): the hall way 285990348 (39.5 x 20.6 m, with a 21 x 3.8 m block
// out of the middle of the back), the terrace walk round it (1570130367), the stairs 695949052 (7 steps, hall to
// terrace), 619851645 (13, the middle flight), 619851643/619851644 (14 each, the end flights) and 1570130366 (14, the
// west end); the precinct lawn 619851627 and the service road 39415484 bound the forecourt.
// Estimated: storey heights, the terrace height (from the step counts, 0.15 m risers), the roof forms of the five
// blocks, the east-end stair (mapped only on the west), and the layout of the parterres, fountains and cannons in the
// narrow forecourt. Colours follow Street View, not OSM's building:colour=gold: the front reads grey-blue and white
// (relief and mosaic), yellow only in the upper band's panels and the towers' attics.
//
// Frame: u along the front (west to east), v out of the front (south-south-east), from the hall's centre CENTER.
export const id = 'kientrung';

const CENTER: [number, number] = [-1316.98, -243.15];
const FRAME_ANGLE = Math.atan2(-0.59674, 0.80243);
const AXIS_X = Math.cos(FRAME_ANGLE);
const AXIS_Z = Math.sin(FRAME_ANGLE);
const HALL_END_U = 22.0;
const WING_END_U = 16.4;
const END_BAY_MID_U = (HALL_END_U + WING_END_U) / 2;

const COLORS = {
  roof: PAL.imperialRoof,
  ridge: hex('#f1d77a'),
  wall: hex('#b8bdb9'),
  relief: hex('#7f8f99'),
  yellow: hex('#d6b25a'),
  trim: hex('#e6e2d6'),
  stone: PAL.stone,
  glass: hex('#2c3438'),
  wood: hex('#7a2f22'),
  gold: hex('#d9a93a'),
  shutter: hex('#a3302a'),
  render: hex('#e4ded0'),
  dragon: hex('#8b908c'),
  walkPave: hex('#c9b48e'),
  lawn: hex('#5f8a45'),
  shrub: hex('#7ea456'),
  paving: hex('#9a6a5a'),
  bronze: hex('#4a4a3c'),
  lacquer: hex('#5a2a22'),
  kiosk: hex('#d9b354'),
  square: hex('#a89c8a'),
  grey: hex('#8e8d86'),
};

const MOSAIC = [
  hex('#8e9ca6'), hex('#dfe3e4'), hex('#6f8594'), hex('#e9ecea'), hex('#3f6f8f'),
  hex('#a7b2b8'), hex('#4f8a62'), hex('#d4d9da'), hex('#b0433a'), hex('#7d8b94'),
];

const HALL_BLOCKS = [
  { u0: -HALL_END_U, u1: -WING_END_U, frontV: 10.3, end: true, mid: false },
  { u0: -WING_END_U, u1: -6.5, frontV: 9.5, end: false, mid: false },
  { u0: -6.5, u1: 6.5, frontV: 10.7, end: false, mid: true },
  { u0: 6.5, u1: WING_END_U, frontV: 9.5, end: false, mid: false },
  { u0: WING_END_U, u1: HALL_END_U, frontV: 10.3, end: true, mid: false },
];

const PAVILION_CENTERS: [number, number][] = [[-1265.8, -232.6], [-1318.9, -193.0]];

const toWorld = (uPos: number, vPos: number): [number, number] => [
  CENTER[0] + uPos * AXIS_X - vPos * AXIS_Z,
  CENTER[1] + uPos * AXIS_Z + vPos * AXIS_X,
];
const mosaicTile = (idx: number) => MOSAIC[((idx % MOSAIC.length) + MOSAIC.length) % MOSAIC.length];
const groundY = (uPos: number, vPos: number) => {
  const pt = toWorld(uPos, vPos);
  return LAND_Y + rise(pt[0], pt[1]);
};

function frameBox(S, uPos: number, vPos: number, y0: number, y1: number, sizeU: number, sizeV: number, col: number[], opts?) {
  const pt = toWorld(uPos, vPos);
  S.box(pt[0], pt[1], y0, y1, sizeU, sizeV, FRAME_ANGLE, col, opts);
}

function frameCyl(S, uPos: number, vPos: number, y0: number, y1: number, r0: number, r1: number, segs: number, col: number[], opts?) {
  const pt = toWorld(uPos, vPos);
  S.cyl(pt[0], pt[1], y0, y1, r0, r1, segs, col, { rot: FRAME_ANGLE, ...opts });
}

// a run of French balusters with a rail and plinth between two world points
function drawRailWorld(S, ptA: [number, number], ptB: [number, number], y: number, height = 0.9, col = COLORS.trim) {
  const len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
  const angle = Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]);
  const count = Math.max(2, Math.round(len / 0.45));
  const atFrac = (frac: number): [number, number] => [ptA[0] + (ptB[0] - ptA[0]) * frac, ptA[1] + (ptB[1] - ptA[1]) * frac];
  const mid = atFrac(0.5);
  S.kind = KIND.MASONRY;
  S.box(mid[0], mid[1], y, y + 0.14, len, 0.32, angle, col);
  S.box(mid[0], mid[1], y + height - 0.12, y + height, len + 0.1, 0.3, angle, col);
  S.kind = KIND.PLAIN;
  for (let i = 0; i <= count; i++) {
    const pt = atFrac(i / count);
    if (i % 8 === 0) {
      S.box(pt[0], pt[1], y, y + height - 0.12, 0.34, 0.34, angle, col);
      continue;
    }
    S.cyl(pt[0], pt[1], y + 0.14, y + height * 0.48, 0.06, 0.12, 5, col, { cap: false, rot: angle });
    S.cyl(pt[0], pt[1], y + height * 0.48, y + height - 0.12, 0.12, 0.06, 5, col, { cap: false, rot: angle });
  }
}

const drawBalustrade = (S, u0: number, v0: number, u1: number, v1: number, y: number, height = 0.9) =>
  drawRailWorld(S, toWorld(u0, v0), toWorld(u1, v1), y, height);

// a grey stone dragon lying along a stair cheek from tail at top to reared head at foot
function drawDragon(S, topPt: [number, number, number], footPt: [number, number, number]) {
  const prevKind = S.kind;
  S.kind = KIND.PLAIN;
  const segCount = 9;
  const spine: [number, number, number][] = [];
  for (let i = 0; i <= segCount; i++) {
    const frac = i / segCount;
    const lift = 0.22 + 0.2 * Math.abs(Math.sin(frac * Math.PI * 3));
    spine.push([
      topPt[0] + (footPt[0] - topPt[0]) * frac,
      topPt[1] + (footPt[1] - topPt[1]) * frac + lift,
      topPt[2] + (footPt[2] - topPt[2]) * frac,
    ]);
  }
  for (let i = 0; i < segCount; i++) S.beam(spine[i], spine[i + 1], 0.24, 0.26, COLORS.dragon);
  for (let i = 1; i < segCount; i += 2) {
    S.cyl(spine[i][0], spine[i][2], spine[i][1] + 0.1, spine[i][1] + 0.3, 0.1, 0.02, 4, shade(COLORS.dragon, 0.85));
  }
  const dx = footPt[0] - topPt[0];
  const dz = footPt[2] - topPt[2];
  const dist = Math.hypot(dx, dz);
  const fwdX = dx / dist;
  const fwdZ = dz / dist;
  const headBase: [number, number, number] = [footPt[0], footPt[1] + 0.95, footPt[2]];
  S.beam(spine[segCount], headBase, 0.3, 0.34, COLORS.dragon);
  S.box(headBase[0], headBase[2], headBase[1] - 0.2, headBase[1] + 0.3, 0.55, 0.42, Math.atan2(fwdZ, fwdX), COLORS.dragon);
  S.beam(headBase, [headBase[0] + fwdX * 0.6, headBase[1] - 0.12, headBase[2] + fwdZ * 0.6], 0.26, 0.22, shade(COLORS.dragon, 0.92));
  for (const side of [-1, 1]) {
    S.beam(
      [headBase[0], headBase[1] + 0.25, headBase[2]],
      [headBase[0] - fwdX * 0.35 - fwdZ * side * 0.18, headBase[1] + 0.6, headBase[2] - fwdZ * 0.35 + fwdX * side * 0.18],
      0.07, 0.07, shade(COLORS.dragon, 0.8),
    );
  }
  S.kind = prevKind;
}

// a straight flight of steps climbing along v, with optional dragon cheek walls
function drawFlightV(S, uPos: number, vStart: number, vEnd: number, y0: number, y1: number, steps: number, width: number, hasDragons: boolean) {
  const run = (vEnd - vStart) / steps;
  const riseStep = (y1 - y0) / steps;
  S.kind = KIND.MASONRY;
  for (let k = 0; k < steps; k++) {
    frameBox(S, uPos, vStart + run * (k + 0.5), y0 - 0.2, y0 + riseStep * (k + 1), width, Math.abs(run), shade(COLORS.stone, 1.06), { topKind: KIND.ROAD });
  }
  for (const side of [-1, 1]) {
    const cheekU = uPos + side * (width / 2 + 0.25);
    S.kind = KIND.PLAIN;
    const topPt = toWorld(cheekU, vEnd);
    const footPt = toWorld(cheekU, vStart);
    S.beam([topPt[0], y1 + 0.35, topPt[1]], [footPt[0], y0 + 0.35, footPt[1]], 0.5, 0.7, COLORS.render);
    if (!hasDragons) continue;
    const newelPt = toWorld(cheekU, vStart + Math.sign(vStart - vEnd) * -0.2);
    S.box(newelPt[0], newelPt[1], y0, y0 + 0.95, 0.6, 0.8, FRAME_ANGLE, COLORS.render);
    S.box(newelPt[0], newelPt[1], y0 + 0.95, y0 + 1.05, 0.7, 0.9, FRAME_ANGLE, shade(COLORS.render, 0.92));
    drawDragon(S, [topPt[0], y1 + 0.7, topPt[1]], [newelPt[0], y0 + 1.05, newelPt[1]]);
  }
}

// a straight flight of steps climbing along u (the end stairs)
function drawFlightU(S, vPos: number, uStart: number, uEnd: number, y0: number, y1: number, steps: number, width: number) {
  const run = (uEnd - uStart) / steps;
  const riseStep = (y1 - y0) / steps;
  S.kind = KIND.MASONRY;
  for (let k = 0; k < steps; k++) {
    frameBox(S, uStart + run * (k + 0.5), vPos, y0 - 0.2, y0 + riseStep * (k + 1), Math.abs(run), width, shade(COLORS.stone, 1.06), { topKind: KIND.ROAD });
  }
  S.kind = KIND.PLAIN;
  for (const side of [-1, 1]) {
    const topPt = toWorld(uEnd, vPos + side * (width / 2 + 0.25));
    const footPt = toWorld(uStart, vPos + side * (width / 2 + 0.25));
    S.beam([topPt[0], y1 + 0.35, topPt[1]], [footPt[0], y0 + 0.35, footPt[1]], 0.5, 0.7, COLORS.render);
  }
}

// a round head over an opening: half disc built of thin horizontal slabs
function drawRoundHead(S, uPos: number, vPos: number, y: number, radius: number, col: number[], slices = 7, depth = 0.08) {
  for (let k = 0; k < slices; k++) {
    const frac = (k + 0.5) / slices;
    frameBox(S, uPos, vPos, y + (radius * k) / slices, y + (radius * (k + 1)) / slices, 2 * radius * Math.sqrt(1 - frac * frac), depth, col);
  }
}

// a mosaic strip of alternating coloured tiles along u
function drawMosaicStrip(S, u0: number, u1: number, vPos: number, y0: number, y1: number, seed = 0) {
  const count = Math.max(1, Math.round((u1 - u0) / 0.7));
  const tileW = (u1 - u0) / count;
  for (let i = 0; i < count; i++) {
    frameBox(S, u0 + tileW * (i + 0.5), vPos, y0, y1, tileW * 0.86, 0.06, mosaicTile(i + seed));
  }
}

// the raised terrace, its balustrades, dragon stairs, end stairs, and hall plinth
function buildTerraceAndStairs(S, ground: number, terraceY: number, floorY: number) {
  S.kind = KIND.PLAIN;
  frameBox(S, 0, 0, ground - 0.4, terraceY, 47.5, 28.5, COLORS.render, { topKind: KIND.ROAD, taper: 0.995 });
  frameBox(S, 0.5, -16.1, ground - 0.4, terraceY, 29.2, 3.9, COLORS.render, { topKind: KIND.ROAD });
  frameBox(S, 0, 16.0, ground - 0.4, terraceY, 9.0, 3.4, COLORS.render, { topKind: KIND.ROAD });
  S.kind = KIND.MASONRY;
  frameBox(S, 0, 0, terraceY - 0.02, terraceY + 0.03, 46.5, 27.5, COLORS.walkPave);
  frameBox(S, 0, 14.26, ground - 0.2, ground + 0.5, 47.6, 0.1, shade(COLORS.stone, 0.75));

  const frontV = 14.1;
  for (const [uA, uB] of [[-23.6, -21.8], [-18.0, -4.6], [4.6, 18.0], [21.8, 23.6]] as [number, number][]) drawBalustrade(S, uA, frontV, uB, frontV, terraceY);
  for (const [uA, uB] of [[-4.4, -2.6], [2.6, 4.4]] as [number, number][]) drawBalustrade(S, uA, 17.55, uB, 17.55, terraceY);
  for (const side of [-1, 1]) {
    drawBalustrade(S, side * 4.4, 14.3, side * 4.4, 15.6, terraceY);
    drawBalustrade(S, side * 23.6, frontV, side * 23.6, 2.0, terraceY);
    drawBalustrade(S, side * 23.6, -1.2, side * 23.6, -14.0, terraceY);
  }
  drawBalustrade(S, -23.6, -14.0, -14.3, -14.0, terraceY);
  drawBalustrade(S, 14.9, -14.0, 23.6, -14.0, terraceY);
  drawBalustrade(S, -14.0, -17.9, 15.0, -17.9, terraceY);
  drawBalustrade(S, -14.0, -14.0, -14.0, -17.9, terraceY);
  drawBalustrade(S, 15.0, -14.0, 15.0, -17.9, terraceY);

  drawFlightV(S, 0, 21.5, 17.7, ground, terraceY, 13, 4.4, true);
  for (const side of [-1, 1]) drawFlightV(S, side * 19.9, 21.5, 14.3, ground, terraceY, 14, 3.4, true);
  drawFlightU(S, 0.4, -33.0, -23.75, ground, terraceY, 14, 2.8);
  drawFlightU(S, 0.4, 33.0, 23.75, ground, terraceY, 14, 2.8);

  S.kind = KIND.MASONRY;
  for (let k = 0; k < 7; k++) {
    frameBox(S, 0, 14.15 - 0.3 * k, terraceY - 0.05, terraceY + (0.9 / 7) * (k + 1), 7.4, 0.32, shade(COLORS.stone, 1.06), { topKind: KIND.ROAD });
  }
  frameBox(S, 0, 0.65, terraceY - 0.05, floorY, 45.0, 23.3, shade(COLORS.stone, 0.98), { topKind: KIND.ROAD });
  frameBox(S, 0.6, -12.4, terraceY - 0.05, floorY, 22.0, 4.4, shade(COLORS.stone, 0.98), { topKind: KIND.ROAD });
}

// the hall's 5 front blocks, rear block, 13-bay mosaic facade, pilasters, name board, and end porches
function buildHallBodyAndFacade(S, floorY: number, storey1Y: number, entabY: number, corniceY: number, lamps: [number, number, number][]) {
  S.kind = KIND.PLAIN;
  for (const blk of HALL_BLOCKS) {
    const midU = (blk.u0 + blk.u1) / 2;
    const width = blk.u1 - blk.u0;
    const depth = blk.frontV + 10.3;
    frameBox(S, midU, blk.frontV - depth / 2, floorY, corniceY, width, depth, COLORS.wall, { top: shade(COLORS.wall, 0.7) });
    frameBox(S, midU, blk.frontV - depth / 2, storey1Y, entabY, width + 0.3, depth + 0.3, COLORS.trim);
    frameBox(S, midU, blk.frontV - depth / 2, corniceY - 0.1, corniceY + 0.45, width + 0.6, depth + 0.6, COLORS.trim);
    frameBox(S, midU, blk.frontV - depth / 2, floorY, floorY + 0.6, width + 0.12, depth + 0.12, shade(COLORS.trim, 0.85));
  }
  frameBox(S, 0.6, -12.2, floorY, corniceY, 21.2, 3.8, COLORS.wall, { top: shade(COLORS.wall, 0.7) });
  frameBox(S, 0.6, -12.2, corniceY - 0.1, corniceY + 0.45, 21.8, 4.4, COLORS.trim);
  frameBox(S, 0.6, -12.2, storey1Y, entabY, 21.5, 4.1, COLORS.trim);

  // 13 openings on each floor with relief surrounds, red shutters, mosaic panels, and avant-corps balconies
  const bays: [number, number, number, boolean, boolean][] = [];
  for (const blk of HALL_BLOCKS) {
    const count = blk.end ? 1 : blk.mid ? 5 : 3;
    const bayW = (blk.u1 - blk.u0) / count;
    for (let i = 0; i < count; i++) bays.push([blk.u0 + bayW * (i + 0.5), blk.frontV, bayW, blk.end, blk.mid]);
  }
  for (const [bayU, bayV, bayW, isEnd, isMid] of bays) {
    const openW = isEnd ? 2.3 : Math.min(1.5, bayW * 0.55);
    const faceV = bayV + 0.04;
    S.kind = KIND.PLAIN;
    const doorR = (openW - 0.4) / 2;
    const doorSpringY = storey1Y - 1.05 - doorR;
    frameBox(S, bayU, faceV - 0.01, floorY + 0.6, doorSpringY, openW + 0.4, 0.08, COLORS.relief);
    drawRoundHead(S, bayU, faceV - 0.01, doorSpringY, doorR + 0.4, COLORS.relief, 7, 0.08);
    frameBox(S, bayU, faceV + 0.02, floorY + 0.6, doorSpringY, openW, 0.08, COLORS.wood);
    drawRoundHead(S, bayU, faceV + 0.02, doorSpringY, doorR + 0.2, COLORS.wood, 7, 0.08);
    frameBox(S, bayU, faceV + 0.04, floorY + 0.8, doorSpringY, openW - 0.4, 0.08, COLORS.shutter);
    drawRoundHead(S, bayU, faceV + 0.04, doorSpringY, doorR, COLORS.shutter, 7, 0.08);
    frameCyl(S, bayU, faceV + 0.03, doorSpringY + doorR + 0.42, doorSpringY + doorR + 0.57, (openW / 2) * 0.4, (openW / 2) * 0.16, 6, COLORS.gold);

    const dadoSideW = (bayW - openW - 0.4) / 2 - 0.35;
    if (dadoSideW > 0.3) {
      for (const side of [-1, 1]) {
        const panelU = bayU + side * (openW / 2 + 0.35 + dadoSideW / 2);
        drawMosaicStrip(S, panelU - dadoSideW / 2, panelU + dadoSideW / 2, faceV + 0.02, floorY + 0.8, floorY + 1.5, Math.round(bayU * 7) + side);
        drawMosaicStrip(S, panelU - dadoSideW / 2, panelU + dadoSideW / 2, faceV + 0.02, floorY + 2.1, storey1Y - 1.2, Math.round(bayU * 11) + side + 3);
      }
    }

    const winR = (openW - 0.1) / 2;
    const winBotY = entabY + 0.75;
    const winSpringY = corniceY - 0.35 - winR - 0.18;
    frameBox(S, bayU, bayV + 0.02, entabY + 0.15, corniceY - 0.15, bayW - 0.55, 0.06, COLORS.yellow);
    frameBox(S, bayU, faceV, winBotY - 0.15, winSpringY, openW + 0.35, 0.1, COLORS.trim);
    drawRoundHead(S, bayU, faceV, winSpringY, winR + 0.18, COLORS.trim, 7, 0.1);
    frameBox(S, bayU, faceV + 0.03, winBotY, winSpringY, openW - 0.1, 0.08, COLORS.shutter);
    drawRoundHead(S, bayU, faceV + 0.03, winSpringY, winR, COLORS.shutter, 7, 0.08);
    frameBox(S, bayU - openW / 2 - 0.12, faceV + 0.03, winBotY - 0.15, winSpringY + 0.1, 0.22, 0.1, COLORS.relief);
    frameBox(S, bayU + openW / 2 + 0.12, faceV + 0.03, winBotY - 0.15, winSpringY + 0.1, 0.22, 0.1, COLORS.relief);
    frameCyl(S, bayU, faceV + 0.06, winSpringY + winR + 0.1, winSpringY + winR + 0.3, 0.16, 0.08, 6, COLORS.relief);

    drawMosaicStrip(S, bayU - openW / 2, bayU + openW / 2, faceV + 0.06, winBotY - 0.55, winBotY - 0.22, Math.round(bayU * 3));
    drawMosaicStrip(S, bayU - bayW / 2 + 0.25, bayU + bayW / 2 - 0.25, faceV + 0.12, storey1Y + 0.15, entabY - 0.15, Math.round(bayU * 5) + 1);

    if (isMid) {
      drawBalustrade(S, bayU - bayW / 2 + 0.1, bayV + 0.55, bayU + bayW / 2 - 0.1, bayV + 0.55, entabY - 0.05, 0.75);
      S.kind = KIND.MASONRY;
      frameBox(S, bayU, bayV + 0.35, entabY - 0.2, entabY, bayW, 0.8, COLORS.trim);
    }
    const lampPt = toWorld(bayU, bayV + (isEnd ? 3.0 : 0.9));
    lamps.push([lampPt[0], storey1Y - 0.2, lampPt[1]]);
  }

  // pilasters with coloured mosaic shafts
  S.kind = KIND.PLAIN;
  const pilasterEdges = new Set<string>();
  for (const blk of HALL_BLOCKS) {
    pilasterEdges.add(blk.u0.toFixed(2));
    pilasterEdges.add(blk.u1.toFixed(2));
  }
  for (const [bayU, , bayW] of bays) {
    for (const side of [-1, 1]) pilasterEdges.add((bayU + (side * bayW) / 2).toFixed(2));
  }
  for (const edgeKey of pilasterEdges) {
    const pilU = +edgeKey;
    const pilV = Math.max(...HALL_BLOCKS.filter((blk) => pilU >= blk.u0 - 0.01 && pilU <= blk.u1 + 0.01).map((blk) => blk.frontV));
    frameBox(S, pilU, pilV + 0.08, floorY + 0.6, corniceY - 0.1, 0.5, 0.18, COLORS.trim);
    frameBox(S, pilU, pilV + 0.14, floorY + 0.7, corniceY - 0.3, 0.34, 0.1, COLORS.relief);
    for (let k = 0; k < 4; k++) frameBox(S, pilU, pilV + 0.18, floorY + 1.2 + k * 2.2, floorY + 2.0 + k * 2.2, 0.28, 0.06, mosaicTile(k + Math.round(pilU)));
  }

  // name board over the middle door, plus back and end windows
  S.kind = KIND.PLAIN;
  frameBox(S, 0, 10.9, entabY + 0.2, entabY + 0.85, 3.0, 0.1, shade(COLORS.wood, 0.8));
  frameBox(S, 0, 10.96, entabY + 0.3, entabY + 0.75, 2.6, 0.06, COLORS.gold);
  const windowBands: [number, number][] = [[floorY + 1.4, storey1Y - 1.0], [entabY + 0.9, corniceY - 1.0]];
  for (let i = -7; i <= 7; i++) {
    const winU = i * 2.9;
    if (Math.abs(winU) < 11 || Math.abs(winU) > HALL_END_U - 0.8) continue;
    for (const [yBot, yTop] of windowBands) frameBox(S, winU, -10.34, yBot, yTop, 1.2, 0.08, COLORS.glass);
  }
  for (let i = -3; i <= 3; i++) {
    for (const [yBot, yTop] of windowBands) frameBox(S, i * 2.9 + 0.6, -14.14, yBot, yTop, 1.2, 0.08, COLORS.glass);
  }
  for (const side of [-1, 1]) {
    for (const winV of [-7.5, -3, 3, 7.5]) {
      for (const [yBot, yTop] of windowBands) frameBox(S, side * (HALL_END_U + 0.04), winV, yBot, yTop, 0.08, 1.2, COLORS.shutter);
    }
  }

  // porches before the end bays
  for (const side of [-1, 1]) {
    const porchU = side * END_BAY_MID_U;
    const porchV0 = 10.3;
    const porchV1 = 12.6;
    const porchW = 4.6;
    S.kind = KIND.PLAIN;
    for (const du of [-porchW / 2 + 0.3, -0.75, 0.75, porchW / 2 - 0.3]) {
      frameBox(S, porchU + du, porchV1 - 0.3, floorY, floorY + 0.5, 0.6, 0.6, COLORS.trim);
      frameBox(S, porchU + du, porchV1 - 0.3, floorY + 0.5, storey1Y - 0.3, 0.42, 0.42, shade(COLORS.trim, 0.95));
      for (let k = 0; k < 3; k++) frameBox(S, porchU + du, porchV1 - 0.08, floorY + 1.2 + k * 1.0, floorY + 1.6 + k * 1.0, 0.24, 0.06, mosaicTile(k + 3));
    }
    for (const colSide of [-1, 1]) frameBox(S, porchU + colSide * (porchW / 2 - 0.3), porchV0 + 0.3, floorY + 0.5, storey1Y - 0.3, 0.42, 0.42, shade(COLORS.trim, 0.95));
    S.kind = KIND.MASONRY;
    frameBox(S, porchU, (porchV0 + porchV1) / 2, storey1Y - 0.3, storey1Y + 0.25, porchW + 0.3, porchV1 - porchV0 + 0.2, COLORS.trim);
    drawMosaicStrip(S, porchU - porchW / 2, porchU + porchW / 2, porchV1 + 0.12, storey1Y - 0.25, storey1Y + 0.2, side > 0 ? 2 : 4);
    drawBalustrade(S, porchU - porchW / 2, porchV1 - 0.1, porchU + porchW / 2, porchV1 - 0.1, storey1Y + 0.25, 0.8);
    for (const colSide of [-1, 1]) drawBalustrade(S, porchU + (colSide * porchW) / 2, porchV1 - 0.1, porchU + (colSide * porchW) / 2, porchV0 + 0.2, storey1Y + 0.25, 0.8);
  }
}

// yellow glazed roofs, crested parapet, central flaming pearl, and four corner towers
function buildHallRoofsAndTowers(S, corniceY: number) {
  const eave = { fascia: 0.2, fasciaCol: COLORS.trim, hips: true, glazed: true, ridgeCol: COLORS.ridge, segs: 2, horns: false };
  const roofBaseY = corniceY + 0.45;
  const bodyCenter = toWorld(0, -0.4);
  S.hip(bodyCenter[0], bodyCenter[1], 2 * WING_END_U + 2.0, 19.8, FRAME_ANGLE, roofBaseY, 2.4, COLORS.roof, { flare: 0.1, over: 0.15, ...eave });
  const rearCenter = toWorld(0.6, -12.2);
  S.hip(rearCenter[0], rearCenter[1], 21.2, 3.8, FRAME_ANGLE, roofBaseY, 1.2, COLORS.roof, { flare: 0.1, over: 0.15, ...eave });

  const drawCrestRun = (u0: number, v0: number, u1: number, v1: number, y: number, height: number, seed: number) => {
    const len = Math.hypot(u1 - u0, v1 - v0);
    const angle = FRAME_ANGLE + Math.atan2(v1 - v0, u1 - u0);
    const mid = toWorld((u0 + u1) / 2, (v0 + v1) / 2);
    S.kind = KIND.MASONRY;
    S.box(mid[0], mid[1], y, y + height * 0.55, len, 0.35, angle, COLORS.trim);
    S.kind = KIND.PLAIN;
    const count = Math.max(1, Math.round(len / 1.1));
    for (let i = 0; i < count; i++) {
      const frac = (i + 0.5) / count;
      const pt = toWorld(u0 + (u1 - u0) * frac, v0 + (v1 - v0) * frac);
      S.box(pt[0], pt[1], y + height * 0.15, y + height * 0.42, 0.6, 0.38, angle, mosaicTile(i + seed));
      S.cyl(pt[0], pt[1], y + height * 0.55, y + height, 0.16, 0.04, 4, i % 2 ? shade(COLORS.trim, 0.85) : mosaicTile(i + seed + 2), { rot: angle });
    }
  };
  for (const blk of HALL_BLOCKS.filter((item) => !item.end)) drawCrestRun(blk.u0, blk.frontV + 0.1, blk.u1, blk.frontV + 0.1, roofBaseY, 1.2, Math.round(blk.u0));
  drawCrestRun(-WING_END_U, -10.2, WING_END_U, -10.2, roofBaseY, 1.2, 1);

  // central crest with flaming pearl (hỏa châu) and two dragons
  S.kind = KIND.MASONRY;
  frameBox(S, 0, 10.6, roofBaseY + 0.6, roofBaseY + 1.9, 4.4, 0.4, COLORS.trim);
  drawMosaicStrip(S, -2.0, 2.0, 10.84, roofBaseY + 0.85, roofBaseY + 1.6, 1);
  S.kind = KIND.PLAIN;
  const pearlCenter = toWorld(0, 10.6);
  S.cyl(pearlCenter[0], pearlCenter[1], roofBaseY + 1.9, roofBaseY + 2.6, 0.32, 0.1, 8, COLORS.gold);
  for (const side of [-1, 1]) {
    const p0 = toWorld(side * 0.5, 10.6);
    const p1 = toWorld(side * 2.0, 10.6);
    S.beam([p0[0], roofBaseY + 2.25, p0[1]], [p1[0], roofBaseY + 1.95, p1[1]], 0.16, 0.26, MOSAIC[3]);
  }

  // four corner towers
  const towerMidY = roofBaseY + 1.3;
  const towerTopY = towerMidY + 2.2;
  const towerEdges: [number, number, number, number][] = [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]];
  for (const side of [-1, 1]) {
    for (const towerV of [7.45, -7.45]) {
      const towerU = side * END_BAY_MID_U;
      const towerW = HALL_END_U - WING_END_U;
      const towerD = 5.7;
      const atticW = towerW - 1.0;
      const atticD = towerD - 1.0;
      S.kind = KIND.PLAIN;
      frameBox(S, towerU, towerV, corniceY - 0.1, towerMidY, towerW, towerD, COLORS.wall, { top: shade(COLORS.wall, 0.7) });
      frameBox(S, towerU, towerV, towerMidY - 0.1, towerMidY + 0.3, towerW + 0.5, towerD + 0.5, COLORS.trim);
      frameBox(S, towerU, towerV, towerMidY + 0.3, towerTopY, atticW, atticD, COLORS.yellow, { top: shade(COLORS.yellow, 0.7) });
      frameBox(S, towerU, towerV, towerTopY - 0.1, towerTopY + 0.3, towerW - 0.4, towerD - 0.4, COLORS.trim);

      const faceV = towerV + Math.sign(towerV) * (atticD / 2 + 0.03);
      frameBox(S, towerU, faceV, towerMidY + 0.6, towerTopY - 0.4, 2.2, 0.08, COLORS.relief);
      frameCyl(S, towerU, faceV + Math.sign(towerV) * 0.05, towerMidY + 0.9, towerTopY - 0.7, 0.45, 0.45, 8, COLORS.shutter);

      for (const [du0, dv0, du1, dv1] of towerEdges) {
        const halfU = (towerW - 0.5) / 2;
        const halfV = (towerD - 0.5) / 2;
        const edgeLen = Math.hypot((du1 - du0) * halfU, (dv1 - dv0) * halfV);
        const count = Math.round(edgeLen / 0.5);
        for (let i = 0; i < count; i++) {
          const frac = (i + 0.5) / count;
          const pt = toWorld(towerU + (du0 + (du1 - du0) * frac) * halfU, towerV + (dv0 + (dv1 - dv0) * frac) * halfV);
          S.box(pt[0], pt[1], towerTopY + 0.3, towerTopY + 0.55, 0.36, 0.36, FRAME_ANGLE, mosaicTile(i + side));
          S.cyl(pt[0], pt[1], towerTopY + 0.55, towerTopY + 0.85, 0.1, 0.03, 4, i % 2 ? COLORS.gold : shade(COLORS.trim, 0.85), { rot: FRAME_ANGLE });
        }
      }

      const towerPt = toWorld(towerU, towerV);
      S.hip(towerPt[0], towerPt[1], towerW - 0.9, towerD - 0.9, FRAME_ANGLE, towerTopY + 0.45, 0.95, COLORS.roof, { flare: 0, over: 0.08, ...eave });
      S.kind = KIND.PLAIN;
      const ridgeY = towerTopY + 1.4;
      for (const ridgeSide of [-1, 1]) {
        const r0 = toWorld(towerU, towerV + ridgeSide * 0.15);
        const r1 = toWorld(towerU, towerV + ridgeSide * 0.95);
        S.beam([r0[0], ridgeY + 0.35, r0[1]], [r1[0], ridgeY + 0.15, r1[1]], 0.12, 0.22, MOSAIC[6]);
        S.beam([r1[0], ridgeY + 0.15, r1[1]], [r1[0], ridgeY + 0.5, r1[1]], 0.1, 0.1, MOSAIC[6]);
      }
      S.cyl(towerPt[0], towerPt[1], ridgeY, ridgeY + 0.6, 0.2, 0.06, 6, COLORS.gold);
      for (const du of [-1, 1]) {
        for (const dv of [-1, 1]) {
          const cornerPt = toWorld(towerU + du * (towerW / 2 - 0.2), towerV + dv * (towerD / 2 - 0.2));
          S.cyl(cornerPt[0], cornerPt[1], towerMidY + 0.3, towerMidY + 1.0, 0.2, 0.06, 4, mosaicTile(du + dv + 3), { rot: FRAME_ANGLE });
        }
      }
    }
    const endMidPt = toWorld(side * END_BAY_MID_U, 0);
    S.hip(endMidPt[0], endMidPt[1], HALL_END_U - WING_END_U, 9.2, FRAME_ANGLE, roofBaseY, 1.2, COLORS.roof, { flare: 0.1, over: 0.15, ...eave });
  }
}

function buildForecourt(S) {
  const ground = groundY(0, 20);
  S.base = ground - LAND_Y;
  S.kind = KIND.ROAD;
  frameBox(S, 0, 22.4, ground - 0.15, ground + 0.04, 48, 6.2, COLORS.paving);
  const pavedStart = S.n;
  S.kind = KIND.ROAD;
  frameBox(S, 3.0, 30.45, ground - 0.15, ground + 0.24, 54, 8.1, COLORS.square);
  (S.paved = S.paved || []).push([pavedStart, S.n]);

  for (const side of [-1, 1]) {
    const lawnU = side * 11.0;
    const lawnW = 12.6;
    S.kind = KIND.GROUND;
    frameBox(S, lawnU, 16.8, ground - 0.15, ground + 0.06, lawnW, 5.0, COLORS.lawn);
    S.kind = KIND.MASONRY;
    frameBox(S, lawnU, 19.35, ground - 0.1, ground + 0.18, lawnW, 0.22, shade(COLORS.stone, 1.05));
    S.kind = KIND.PLAIN;
    for (const du of [-4.2, 1.4, 4.6]) {
      const pt = toWorld(lawnU + du * side, 17.6);
      S.cyl(pt[0], pt[1], ground + 0.05, ground + 0.35, 0.34, 0.38, 6, COLORS.shrub);
      S.cyl(pt[0], pt[1], ground + 0.35, ground + 0.65, 0.38, 0.12, 6, shade(COLORS.shrub, 1.08));
    }
    const cannonPt = toWorld(side * 4.6, 17.4);
    S.kind = KIND.MASONRY;
    S.box(cannonPt[0], cannonPt[1], ground, ground + 0.55, 1.3, 3.4, FRAME_ANGLE, shade(COLORS.stone, 0.92), { topKind: KIND.ROAD });
    S.box(cannonPt[0], cannonPt[1], ground + 0.55, ground + 0.65, 1.45, 3.55, FRAME_ANGLE, shade(COLORS.stone, 0.98));
    cannon(S, cannonPt[0], ground + 0.65, cannonPt[1], FRAME_ANGLE + Math.PI / 2, { len: 3.0, col: COLORS.bronze, wood: shade(COLORS.stone, 0.85) });
  }
  const cauldronPt = toWorld(0, 24.2);
  vac(S, cauldronPt[0], ground, cauldronPt[1], FRAME_ANGLE, { d: 1.9, col: COLORS.bronze });
}

function buildPrecinct(S) {
  const ground = groundY(0, -20);
  S.base = ground - LAND_Y;
  S.kind = KIND.ROAD;
  const pavedStart = S.n;
  frameBox(S, 21.0, -23.2, ground - 0.15, ground + 0.22, 32.0, 9.6, shade(COLORS.paving, 1.1));
  frameBox(S, 30.6, -14.2, ground - 0.15, ground + 0.22, 12.8, 8.4, shade(COLORS.paving, 1.1));
  (S.paved = S.paved || []).push([pavedStart, S.n]);
  frameBox(S, -28.5, 0.4, ground - 0.15, ground + 0.05, 10.5, 13.0, shade(COLORS.paving, 1.1));

  const gardenBeds: [number, number, number, number][] = [
    [10.5, -23.6, 6.0, 4.6], [18.5, -23.6, 6.0, 4.6], [26.5, -23.6, 6.0, 4.6], [31.0, -14.6, 6.0, 4.0],
  ];
  for (const [bedU, bedV, bedW, bedD] of gardenBeds) {
    S.kind = KIND.MASONRY;
    frameBox(S, bedU, bedV, ground + 0.1, ground + 0.45, bedW, bedD, COLORS.render);
    S.kind = KIND.GROUND;
    frameBox(S, bedU, bedV, ground + 0.3, ground + 0.48, bedW - 0.4, bedD - 0.4, COLORS.lawn);
    S.kind = KIND.PLAIN;
    for (const du of [-1, 1]) {
      const pt = toWorld(bedU + du * bedW * 0.25, bedV);
      S.cyl(pt[0], pt[1], ground + 0.48, ground + 0.95, 0.4, 0.15, 6, COLORS.shrub);
    }
  }

  const kioskPositions: [number, number][] = [[-24.0, 19.2], [24.8, 18.8], [39.0, -24.0], [-33.0, -25.0]];
  for (const [kioskU, kioskV] of kioskPositions) {
    const kioskGround = groundY(kioskU, kioskV);
    const outSign = kioskV > 0 ? 1 : -1;
    S.base = kioskGround - LAND_Y;
    S.kind = KIND.MASONRY;
    frameBox(S, kioskU, kioskV, kioskGround - 0.2, kioskGround + 0.2, 2.8, 2.8, shade(COLORS.stone, 1.02), { topKind: KIND.ROAD });
    S.kind = KIND.PLAIN;
    frameBox(S, kioskU, kioskV, kioskGround + 0.2, kioskGround + 2.6, 2.3, 2.3, COLORS.kiosk, { top: shade(COLORS.kiosk, 0.7) });
    frameBox(S, kioskU, kioskV, kioskGround + 2.45, kioskGround + 2.7, 2.5, 2.5, COLORS.trim);
    frameBox(S, kioskU, kioskV + outSign * 1.17, kioskGround + 0.25, kioskGround + 2.0, 0.8, 0.06, COLORS.lacquer);
    for (const side of [-1, 1]) frameBox(S, kioskU + side * 1.17, kioskV, kioskGround + 1.1, kioskGround + 1.9, 0.06, 0.7, COLORS.shutter);
    const pt = toWorld(kioskU, kioskV);
    S.hip(pt[0], pt[1], 2.5, 2.5, FRAME_ANGLE, kioskGround + 2.7, 1.1, COLORS.roof, { flare: 0.25, over: 0.4, fascia: 0.12, fasciaCol: COLORS.trim, hips: true, glazed: true, ridgeCol: COLORS.ridge, segs: 2 });
    S.cyl(pt[0], pt[1], kioskGround + 3.75, kioskGround + 4.15, 0.14, 0.04, 6, COLORS.gold);
  }
}

// two-slope polygonal roof with ridges, upturned tips and dragon crests
function drawPolyRoof(S, center: [number, number], sides: number, rot: number, y: number, botR: number, height: number, topR: number) {
  const prevKind = S.kind;
  S.kind = KIND.TILE;
  const midR = topR + (botR - topR) * 0.42;
  const midY = y + height * 0.62;
  S.cyl(center[0], center[1], y - 0.1, midY, botR, midR, sides, COLORS.roof, { rot, cap: false });
  S.cyl(center[0], center[1], midY, y + height, midR, topR, sides, COLORS.roof, { rot, cap: topR > 0.06 });
  S.kind = KIND.PLAIN;
  S.cyl(center[0], center[1], y - 0.3, y - 0.1, botR - 0.05, botR, sides, COLORS.ridge, { rot, cap: false });
  for (let i = 0; i < sides; i++) {
    const angle = rot + (i / sides) * Math.PI * 2;
    const dirX = Math.cos(angle);
    const dirZ = Math.sin(angle);
    const eavePt = [center[0] + dirX * botR, y, center[1] + dirZ * botR];
    const midPt = [center[0] + dirX * midR, midY + 0.05, center[1] + dirZ * midR];
    const peakPt = [center[0] + dirX * topR, y + height + 0.05, center[1] + dirZ * topR];
    S.beam(eavePt, midPt, 0.16, 0.16, COLORS.ridge);
    S.beam(midPt, peakPt, 0.14, 0.14, COLORS.ridge);
    S.beam(eavePt, [eavePt[0] + dirX * 0.3, y + 0.38, eavePt[2] + dirZ * 0.3], 0.14, 0.12, COLORS.ridge);
    S.box(midPt[0], midPt[2], midPt[1] + 0.05, midPt[1] + 0.35, 0.18, 0.18, angle, MOSAIC[6]);
  }
  S.kind = prevKind;
}

// Lầu Bát Giác: open octagonal pavilion on the square in front of Điện Kiến Trung
function buildOctagonalPavilion(S, center: [number, number], lamps: [number, number, number][]) {
  const ground = LAND_Y + Math.max(...[[0, 0], [4, 0], [-4, 0], [0, 4], [0, -4]].map(([dx, dz]) => rise(center[0] + dx, center[1] + dz)));
  const baseTopY = ground + 1.4;
  const radius = 4.9;
  const sides = 8;
  const towardAngle = Math.atan2(-AXIS_X, AXIS_Z);
  const rot = towardAngle + Math.PI / sides;
  const dir: [number, number] = [Math.cos(towardAngle), Math.sin(towardAngle)];
  const perp: [number, number] = [-dir[1], dir[0]];

  S.base = ground - LAND_Y;
  S.kind = KIND.MASONRY;
  S.cyl(center[0], center[1], ground - 0.3, baseTopY - 0.15, radius, radius - 0.05, sides, COLORS.grey, { rot, cap: false });
  S.cyl(center[0], center[1], baseTopY - 0.15, baseTopY, radius + 0.12, radius + 0.12, sides, shade(COLORS.grey, 1.12), { rot });
  S.kind = KIND.PLAIN;

  const vertexAt = (idx: number, rad: number): [number, number] => {
    const angle = rot + (idx / sides) * Math.PI * 2;
    return [center[0] + Math.cos(angle) * rad, center[1] + Math.sin(angle) * rad];
  };
  const apothem = radius * Math.cos(Math.PI / sides);
  const stairW = 2.0;
  for (let i = 0; i < sides; i++) {
    const p0 = vertexAt(i, radius - 0.2);
    const p1 = vertexAt(i + 1, radius - 0.2);
    const mid = [(p0[0] + p1[0]) / 2 - center[0], (p0[1] + p1[1]) / 2 - center[1]];
    if (mid[0] * dir[0] + mid[1] * dir[1] > apothem * 0.9) {
      const edgeMid: [number, number] = [center[0] + dir[0] * (apothem - 0.2), center[1] + dir[1] * (apothem - 0.2)];
      for (const side of [-1, 1]) {
        const stopPt: [number, number] = [edgeMid[0] + perp[0] * side * (stairW / 2 + 0.15), edgeMid[1] + perp[1] * side * (stairW / 2 + 0.15)];
        drawRailWorld(S, side < 0 ? p0 : stopPt, side < 0 ? stopPt : p1, baseTopY, 0.85, shade(COLORS.grey, 1.25));
      }
      continue;
    }
    drawRailWorld(S, p0, p1, baseTopY, 0.85, shade(COLORS.grey, 1.25));
  }

  // nine-step stair with flaring cheeks
  const stepCount = 9;
  const run = 0.32;
  S.kind = KIND.MASONRY;
  for (let k = 0; k < stepCount; k++) {
    const dist = apothem + run * (stepCount - k - 0.5);
    const pt = [center[0] + dir[0] * dist, center[1] + dir[1] * dist];
    S.box(pt[0], pt[1], ground - 0.2, ground + (1.4 * (k + 1)) / stepCount, run, stairW + (0.2 * (stepCount - k)) / stepCount, towardAngle, shade(COLORS.grey, 1.15), { topKind: KIND.ROAD });
  }
  S.kind = KIND.PLAIN;
  for (const side of [-1, 1]) {
    const topPt = [center[0] + dir[0] * apothem + perp[0] * side * (stairW / 2 + 0.15), center[1] + dir[1] * apothem + perp[1] * side * (stairW / 2 + 0.15)];
    const midPt = [center[0] + dir[0] * (apothem + 1.6) + perp[0] * side * (stairW / 2 + 0.3), center[1] + dir[1] * (apothem + 1.6) + perp[1] * side * (stairW / 2 + 0.3)];
    const footPt = [center[0] + dir[0] * (apothem + run * stepCount + 0.2) + perp[0] * side * (stairW / 2 + 0.8), center[1] + dir[1] * (apothem + run * stepCount + 0.2) + perp[1] * side * (stairW / 2 + 0.8)];
    S.beam([topPt[0], baseTopY + 0.3, topPt[1]], [midPt[0], ground + 0.95, midPt[1]], 0.26, 0.6, COLORS.grey);
    S.beam([midPt[0], ground + 0.95, midPt[1]], [footPt[0], ground + 0.4, footPt[1]], 0.26, 0.6, COLORS.grey);
    S.beam([topPt[0], baseTopY + 0.85, topPt[1]], [midPt[0], ground + 1.65, midPt[1]], 0.24, 0.12, shade(COLORS.grey, 1.15));
    S.beam([midPt[0], ground + 1.65, midPt[1]], [footPt[0], ground + 1.05, footPt[1]], 0.24, 0.12, shade(COLORS.grey, 1.15));
    S.box(footPt[0], footPt[1], ground, ground + 1.2, 0.5, 0.5, towardAngle, shade(COLORS.grey, 0.95));
  }

  const colR = 3.2;
  const colTopY = baseTopY + 3.1;
  S.kind = KIND.TIMBER;
  for (let i = 0; i < sides; i++) {
    const pt = vertexAt(i, colR);
    S.cyl(pt[0], pt[1], baseTopY, colTopY, 0.17, 0.15, 6, COLORS.lacquer, { cap: false });
  }
  S.kind = KIND.PLAIN;
  for (let i = 0; i < sides; i++) {
    const p0 = vertexAt(i, colR);
    const p1 = vertexAt(i + 1, colR);
    S.beam([p0[0], colTopY - 0.1, p0[1]], [p1[0], colTopY - 0.1, p1[1]], 0.18, 0.35, COLORS.lacquer);
  }
  drawPolyRoof(S, center, sides, rot, colTopY, radius - 0.2, 1.5, colR * 0.62);
  S.kind = KIND.TIMBER;
  S.cyl(center[0], center[1], colTopY + 1.0, colTopY + 1.8, colR * 0.66, colR * 0.66, sides, shade(COLORS.lacquer, 1.3), { rot });
  drawPolyRoof(S, center, sides, rot, colTopY + 1.8, colR * 0.66 + 0.9, 2.0, 0.05);
  S.kind = KIND.PLAIN;
  S.cyl(center[0], center[1], colTopY + 3.8, colTopY + 4.1, 0.18, 0.28, 6, COLORS.trim);
  S.cyl(center[0], center[1], colTopY + 4.1, colTopY + 4.65, 0.28, 0.05, 6, COLORS.gold);
  lamps.push([center[0], baseTopY + 2.6, center[1]]);
}

export function build({ S, group }) {
  const lamps: [number, number, number][] = [];
  const ground = groundY(0, 0);
  const terraceY = ground + 2.0;
  const floorY = terraceY + 0.9;
  const storey1Y = floorY + 4.4;
  const entabY = storey1Y + 0.5;
  const corniceY = entabY + 3.6;

  S.base = ground - LAND_Y;
  buildTerraceAndStairs(S, ground, terraceY, floorY);
  buildHallBodyAndFacade(S, floorY, storey1Y, entabY, corniceY, lamps);
  buildHallRoofsAndTowers(S, corniceY);
  buildForecourt(S);
  buildPrecinct(S);
  for (const center of PAVILION_CENTERS) buildOctagonalPavilion(S, center, lamps);

  S.kind = KIND.PLAIN;
  S.base = 0;

  for (const lampU of [-21.0, -4.4, 4.4, 21.0]) {
    const pt = toWorld(lampU, 14.1);
    lamps.push([pt[0], ground + 3.1, pt[1]]);
  }
  if (lamps.length) {
    const positions: number[] = [];
    const colors: number[] = [];
    for (const lamp of lamps) {
      positions.push(...lamp);
      colors.push(1, 0.72, 0.38);
    }
    const glow = glowPoints(positions, colors, 4);
    glow.userData.glow = true;
    glow.userData.landmark = id;
    group.add(glow);
  }
}
