import { KIND, hex, shade } from '../../geo/buf.ts';
import { LAND_Y } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { glowPoints } from '../../geo/materials.ts';
import { fence, roadsNear, buildingsNear } from '../enclosure.ts';

// Cung An Định, the palace of Khải Định and Bảo Đại on the north bank of the An Cựu, 179B Phan Đình Phùng.
// Sources and estimates: docs/places/andinh.md.
export const id = 'andinh';

const CENTER: [number, number] = [1008.95, 1355.83];
const FRAME_ANGLE = Math.atan2(-0.4375, 0.8993);
const AXIS_X = Math.cos(FRAME_ANGLE);
const AXIS_Z = Math.sin(FRAME_ANGLE);

const PALACE_W = 28.8;
const PALACE_HALF_W = PALACE_W / 2;
const WING_W = 6.8;
const CENTER_HALF_W = PALACE_HALF_W - WING_W;
const WING_FRONT = 6.3;
const WING_HIP_FRONT = 2.8;
const WING_REAR = -8.3;
const CENTER_REAR = -10.4;
const CENTER_UPPER_FRONT = 2.3;
const CENTER_GROUND_FRONT = 4.3;
const PORCH_FRONT = 7.0;
const ANNEX_REAR = -14.8;
const PAVILION_POS: [number, number] = [-0.3, 17.7];
const GATE_POS: [number, number] = [0, 25.8];

const COLORS = {
  stucco: hex('#e6d48e'),
  stuccoLight: hex('#ecdc9e'),
  white: hex('#f1ead8'),
  shutter: hex('#5a3b2a'),
  roof: hex('#6e4a3c'),
  stone: hex('#8f8a80'),
  stoneLight: hex('#b3ab9a'),
  pavWall: hex('#dbb04c'),
  pavRoof: hex('#4a443f'),
  lattice: hex('#4a3a2a'),
  dragon: hex('#7c8f80'),
  red: hex('#a3302a'),
  gold: hex('#d9a93a'),
  gravel: hex('#c9bfae'),
  baluster: hex('#8e918e'),
  gateCream: hex('#ddc98f'),
  gateBlue: hex('#5b7f9a'),
  gateBlueLight: hex('#9fbccb'),
  gateTile: hex('#5a4a40'),
  palmTrunk: hex('#7d7262'),
  palmFrond: hex('#4e6b33'),
  palmFrondAlt: hex('#5d7a3a'),
  palmCrown: hex('#6b5a44'),
  fenceCap: hex('#a8875c'),
  fenceIron: hex('#2f2b26'),
};

const toWorld = (uPos: number, vPos: number): [number, number] => [
  CENTER[0] + uPos * AXIS_X - vPos * AXIS_Z,
  CENTER[1] + uPos * AXIS_Z + vPos * AXIS_X,
];
const groundY = (pt: [number, number]) => LAND_Y + rise(pt[0], pt[1]);
const frameVec = (du: number, dv: number): [number, number] => [du * AXIS_X - dv * AXIS_Z, du * AXIS_Z + dv * AXIS_X];

function frameBox(S, uPos: number, vPos: number, y0: number, y1: number, sizeU: number, sizeV: number, col: number[], opts?) {
  const pt = toWorld(uPos, vPos);
  S.box(pt[0], pt[1], y0, y1, sizeU, sizeV, FRAME_ANGLE, col, opts);
}

interface WallFace {
  at: (along: number, out: number) => [number, number];
  angle: number;
  normal: [number, number];
}

function createWallFace(uPos: number, vPos: number, tangent: [number, number], normalDir: [number, number]): WallFace {
  const origin = toWorld(uPos, vPos);
  const tangW = frameVec(tangent[0], tangent[1]);
  const normW = frameVec(normalDir[0], normalDir[1]);
  return {
    at: (along, out) => [origin[0] + tangW[0] * along + normW[0] * out, origin[1] + tangW[1] * along + normW[1] * out],
    angle: Math.atan2(tangW[1], tangW[0]),
    normal: normW,
  };
}

function boxOnFace(S, wallFace: WallFace, along: number, out: number, y0: number, y1: number, width: number, thick: number, col: number[]) {
  const pt = wallFace.at(along, out);
  S.box(pt[0], pt[1], y0, y1, width, thick, wallFace.angle, col);
}

function drawFaceDisc(S, wallFace: WallFace, along: number, out: number, centerY: number, radius: number, col: number[], segs = 6, full = false) {
  const arcPt = (idx: number): [number, number, number] => {
    const ang = (idx / segs) * Math.PI * (full ? 2 : 1);
    const pt = wallFace.at(along + radius * Math.cos(ang), out);
    return [pt[0], centerY + radius * Math.sin(ang), pt[1]];
  };
  const center = wallFace.at(along, out);
  const center3: [number, number, number] = [center[0], centerY, center[1]];
  const hint: [number, number, number] = [wallFace.normal[0], 0, wallFace.normal[1]];
  for (let k = 0; k < segs; k++) S.tri(center3, arcPt(k), arcPt(k + 1), col, hint);
}

function drawWindow(S, wallFace: WallFace, along: number, out: number, sillY: number, height: number, width: number, arched: boolean) {
  boxOnFace(S, wallFace, along, out + 0.05, sillY - 0.12, sillY + height + 0.12, width + 0.3, 0.14, COLORS.white);
  boxOnFace(S, wallFace, along, out + 0.09, sillY, sillY + height + (arched ? 0.04 : 0), width, 0.1, COLORS.shutter);
  if (arched) {
    drawFaceDisc(S, wallFace, along, out + 0.125, sillY + height, width / 2 + 0.15, COLORS.white, 8);
    drawFaceDisc(S, wallFace, along, out + 0.145, sillY + height, width / 2, COLORS.shutter, 8);
    boxOnFace(S, wallFace, along, out + 0.1, sillY + height + width / 2, sillY + height + width / 2 + 0.3, 0.3, 0.18, COLORS.white);
  } else {
    boxOnFace(S, wallFace, along, out + 0.08, sillY + height + 0.12, sillY + height + 0.32, width + 0.5, 0.2, COLORS.white);
  }
}

function drawBalustrade(S, p0: [number, number], p1: [number, number], y: number, height: number, col = COLORS.white, step = 0.42) {
  const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
  const angle = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
  const mid = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
  S.box(mid[0], mid[1], y, y + 0.14, len, 0.3, angle, col);
  S.box(mid[0], mid[1], y + height - 0.12, y + height, len + 0.1, 0.3, angle, col);
  const count = Math.max(1, Math.round(len / step));
  for (let k = 0; k < count; k++) {
    const frac = (k + 0.5) / count;
    S.box(p0[0] + (p1[0] - p0[0]) * frac, p0[1] + (p1[1] - p0[1]) * frac, y + 0.14, y + height - 0.12, 0.13, 0.13, angle, col);
  }
}

function drawFinial(S, pt: [number, number], y0: number, height: number, col = COLORS.white) {
  S.cyl(pt[0], pt[1], y0, y0 + height * 0.35, 0.22, 0.22, 6, col);
  S.cyl(pt[0], pt[1], y0 + height * 0.35, y0 + height, 0.24, 0.02, 6, col);
}

// Khải Tường Lâu palace: plinth, centre, wings, rear annexes, corner towers, windows, porch and crest
function buildPalace(S, lamps: [number, number, number][]) {
  const ground = groundY(CENTER);
  const floorY = ground + 1.2;
  const storey1Y = floorY + 4.8;
  const storey2Y = storey1Y + 4.4;
  const corniceY = storey2Y + 0.4;
  S.base = ground - LAND_Y;

  S.kind = KIND.MASONRY;
  frameBox(S, 0, (WING_FRONT + WING_REAR) / 2, ground - 0.4, floorY, PALACE_W + 1.0, WING_FRONT - WING_REAR + 1.0, COLORS.stone, { top: COLORS.stoneLight });
  frameBox(S, 0, (CENTER_REAR + WING_REAR) / 2 - 0.2, ground - 0.4, floorY, 2 * CENTER_HALF_W + 0.6, WING_REAR - CENTER_REAR + 1.0, COLORS.stone, { top: COLORS.stoneLight });
  frameBox(S, -(PALACE_HALF_W + 0.8) / 2, (ANNEX_REAR + WING_REAR) / 2, ground - 0.4, floorY - 0.6, PALACE_HALF_W - 0.2, WING_REAR - ANNEX_REAR + 0.6, COLORS.stone, { top: COLORS.stoneLight });
  frameBox(S, 0, (CENTER_GROUND_FRONT + PORCH_FRONT) / 2 + 0.2, ground - 0.4, floorY, 8.4, PORCH_FRONT - CENTER_GROUND_FRONT + 0.4, COLORS.stone, { top: COLORS.stoneLight });
  S.kind = KIND.PLAIN;
  for (let k = 0; k < 4; k++) frameBox(S, 0, PORCH_FRONT + 0.2 + 0.35 * (k + 0.5), ground - 0.2, floorY - ((k + 1) * (floorY - ground)) / 4 + 0.02, 5.2, 0.35, COLORS.stoneLight);
  for (let k = 0; k < 4; k++) frameBox(S, 0, CENTER_REAR - 0.5 - 0.36 * (k + 0.5), ground - 0.2, floorY - ((k + 1) * (floorY - ground)) / 4 + 0.02, 3.6, 0.36, COLORS.stoneLight);

  // centre block
  frameBox(S, 0, (CENTER_REAR + CENTER_GROUND_FRONT) / 2, floorY, storey1Y, 2 * CENTER_HALF_W, CENTER_GROUND_FRONT - CENTER_REAR, COLORS.stucco);
  frameBox(S, 0, (CENTER_REAR + CENTER_GROUND_FRONT) / 2, storey1Y - 0.1, storey1Y + 0.2, 2 * CENTER_HALF_W + 0.3, CENTER_GROUND_FRONT - CENTER_REAR + 0.3, COLORS.white);
  frameBox(S, 0, (CENTER_REAR + CENTER_UPPER_FRONT) / 2, storey1Y + 0.2, corniceY, 2 * CENTER_HALF_W, CENTER_UPPER_FRONT - CENTER_REAR, COLORS.stucco);
  frameBox(S, 0, CENTER_UPPER_FRONT + 0.3, storey1Y + 0.2, corniceY, 7.2, 0.6, COLORS.stuccoLight);
  frameBox(S, 0, CENTER_REAR - 0.3, floorY, corniceY, 7.2, 0.6, COLORS.stuccoLight);
  frameBox(S, 0, (CENTER_REAR + CENTER_UPPER_FRONT) / 2, storey2Y, corniceY, 2 * CENTER_HALF_W + 0.8, CENTER_UPPER_FRONT - CENTER_REAR + 0.8, COLORS.white);
  for (const side of [-1, 1]) drawBalustrade(S, toWorld(side * CENTER_HALF_W, CENTER_GROUND_FRONT + 0.05), toWorld(side * 3.9, CENTER_GROUND_FRONT + 0.05), storey1Y + 0.2, 0.85);
  drawBalustrade(S, toWorld(-CENTER_HALF_W, CENTER_UPPER_FRONT + 0.65), toWorld(CENTER_HALF_W, CENTER_UPPER_FRONT + 0.65), corniceY, 0.85);
  drawBalustrade(S, toWorld(CENTER_HALF_W, CENTER_REAR - 0.35), toWorld(-CENTER_HALF_W, CENTER_REAR - 0.35), corniceY, 0.85);
  S.hip(...toWorld(0, (CENTER_REAR + CENTER_UPPER_FRONT) / 2), 2 * CENTER_HALF_W - 0.6, CENTER_UPPER_FRONT - CENTER_REAR - 0.6, FRAME_ANGLE, corniceY, 2.6, COLORS.roof, { over: 0.2 });

  // wings, rear annexes, and corner towers
  const towerSize = 3.6;
  const towerTopY = corniceY + 3.8;
  for (const side of [-1, 1]) {
    const wingU = side * (CENTER_HALF_W + WING_W / 2);
    const wingV = (WING_FRONT + WING_REAR) / 2;
    const wingD = WING_FRONT - WING_REAR;
    frameBox(S, wingU, wingV, floorY, corniceY, WING_W, wingD, COLORS.stucco);
    frameBox(S, wingU, wingV, storey1Y - 0.1, storey1Y + 0.2, WING_W + 0.3, wingD + 0.3, COLORS.white);
    frameBox(S, wingU, wingV, storey2Y, corniceY, WING_W + 0.8, wingD + 0.8, COLORS.white);
    frameBox(S, wingU, (WING_FRONT + WING_HIP_FRONT) / 2, corniceY, corniceY + 0.12, WING_W + 0.6, WING_FRONT - WING_HIP_FRONT + 0.4, COLORS.stoneLight);
    drawBalustrade(S, toWorld(side * (PALACE_HALF_W + 0.15), WING_HIP_FRONT), toWorld(side * (PALACE_HALF_W + 0.15), WING_FRONT + 0.15), corniceY, 0.85);
    drawBalustrade(S, toWorld(side * (PALACE_HALF_W + 0.15), WING_FRONT + 0.15), toWorld(side * (CENTER_HALF_W + towerSize - 0.3), WING_FRONT + 0.15), corniceY, 0.85);
    S.hip(...toWorld(wingU, (WING_HIP_FRONT + WING_REAR) / 2), WING_W + 0.2, WING_HIP_FRONT - WING_REAR + 0.2, FRAME_ANGLE, corniceY, 2.4, COLORS.roof, { over: 0.2 });
  }

  for (const [u0, u1, v1, topY] of [[-PALACE_HALF_W, -CENTER_HALF_W - 0.2, WING_REAR, storey2Y + 0.3], [-CENTER_HALF_W + 0.6, -0.8, CENTER_REAR, storey2Y - 0.6]] as [number, number, number, number][]) {
    const midU = (u0 + u1) / 2;
    const widthU = u1 - u0;
    const midV = (ANNEX_REAR + v1) / 2;
    const depthV = v1 - ANNEX_REAR;
    frameBox(S, midU, midV, floorY - 0.6, topY, widthU, depthV, COLORS.stuccoLight);
    frameBox(S, midU, midV, storey1Y - 0.1, storey1Y + 0.2, widthU + 0.3, depthV + 0.3, COLORS.white);
    frameBox(S, midU, midV, topY - 0.3, topY, widthU + 0.5, depthV + 0.5, COLORS.white);
    drawBalustrade(S, toWorld(u0 + 0.1, ANNEX_REAR - 0.1), toWorld(u1 - 0.1, ANNEX_REAR - 0.1), topY, 0.8);
    drawBalustrade(S, toWorld(u0 + 0.1, ANNEX_REAR - 0.1), toWorld(u0 + 0.1, v1), topY, 0.8);
    drawBalustrade(S, toWorld(u1 - 0.1, ANNEX_REAR - 0.1), toWorld(u1 - 0.1, v1), topY, 0.8);
    const rearFace = createWallFace(midU, ANNEX_REAR, [-1, 0], [0, -1]);
    for (let pos = -widthU / 2 + 1.4; pos < widthU / 2 - 0.8; pos += 2.2) {
      drawWindow(S, rearFace, pos, 0, floorY + 0.6, 2.4, 1.0, true);
      drawWindow(S, rearFace, pos, 0, storey1Y + 0.9, 2.0, 1.0, true);
    }
  }

  const cardinalFaces: [[number, number], [number, number]][] = [[[1, 0], [0, 1]], [[-1, 0], [0, -1]], [[0, -1], [1, 0]], [[0, 1], [-1, 0]]];
  for (const side of [-1, 1]) {
    const towerU = side * (CENTER_HALF_W + towerSize / 2 - 0.3);
    const towerV = WING_FRONT - towerSize / 2 + 0.3;
    frameBox(S, towerU, towerV, floorY, towerTopY, towerSize, towerSize, COLORS.stuccoLight);
    frameBox(S, towerU, towerV, storey1Y - 0.1, storey1Y + 0.2, towerSize + 0.2, towerSize + 0.2, COLORS.white);
    frameBox(S, towerU, towerV, storey2Y, corniceY, towerSize + 0.5, towerSize + 0.5, COLORS.white);
    frameBox(S, towerU, towerV, towerTopY, towerTopY + 0.35, towerSize + 0.5, towerSize + 0.5, COLORS.white);
    frameBox(S, towerU, towerV, towerTopY + 0.35, towerTopY + 1.15, towerSize - 0.5, towerSize - 0.5, COLORS.stuccoLight);
    for (const [tang, norm] of cardinalFaces) {
      const atticFace = createWallFace(towerU + (norm[0] * (towerSize - 0.5)) / 2, towerV + (norm[1] * (towerSize - 0.5)) / 2, tang, norm);
      boxOnFace(S, atticFace, 0, 0.05, towerTopY + 1.15, towerTopY + 1.35, towerSize - 0.3, 0.3, COLORS.white);
      boxOnFace(S, atticFace, 0, 0.05, towerTopY + 1.35, towerTopY + 1.65, 2.2, 0.26, COLORS.stuccoLight);
      boxOnFace(S, atticFace, 0, 0.05, towerTopY + 1.65, towerTopY + 1.95, 1.4, 0.26, COLORS.stuccoLight);
      boxOnFace(S, atticFace, 0, 0.05, towerTopY + 1.95, towerTopY + 2.15, 0.7, 0.3, COLORS.white);
      drawFaceDisc(S, atticFace, 0, 0.2, towerTopY + 0.55, 0.32, COLORS.white, 8, true);
    }
    frameBox(S, towerU, towerV, towerTopY + 1.15, towerTopY + 1.75, towerSize - 1.4, towerSize - 1.4, COLORS.white);
    S.cyl(...toWorld(towerU, towerV), towerTopY + 1.75, towerTopY + 2.35, 0.8, 0.25, 8, COLORS.stuccoLight);
    drawFinial(S, toWorld(towerU, towerV), towerTopY + 2.35, 1.0);
    for (const [du, dv] of [[1, 1], [-1, 1], [1, -1], [-1, -1]] as [number, number][]) drawFinial(S, toWorld(towerU + (du * towerSize) / 2, towerV + (dv * towerSize) / 2), towerTopY + 0.35, 0.7);
    for (const [quoinU, quoinV, quoinTop] of [[side * PALACE_HALF_W, WING_FRONT, corniceY - 0.4], [towerU + (side * towerSize) / 2, towerV + towerSize / 2, towerTopY - 0.2], [towerU - (side * towerSize) / 2, towerV + towerSize / 2, towerTopY - 0.2]] as [number, number, number][]) {
      for (let y = floorY, idx = 0; y < quoinTop; y += 0.55, idx++) {
        const size = idx % 2 === 0 ? 0.62 : 0.4;
        frameBox(S, quoinU, quoinV, y, y + 0.45, size, size, COLORS.white);
      }
    }
    const balU0 = side * PALACE_HALF_W;
    const balU1 = side * (CENTER_HALF_W + towerSize - 0.3);
    frameBox(S, (balU0 + balU1) / 2, WING_FRONT + 0.45, storey1Y - 0.15, storey1Y + 0.2, Math.abs(balU1 - balU0), 0.9, COLORS.white);
    drawBalustrade(S, toWorld(balU0, WING_FRONT + 0.8), toWorld(balU1, WING_FRONT + 0.8), storey1Y + 0.2, 0.85);
  }

  // windows across all elevations
  const lowerFace = createWallFace(0, CENTER_GROUND_FRONT, [1, 0], [0, 1]);
  const upperFace = createWallFace(0, CENTER_UPPER_FRONT, [1, 0], [0, 1]);
  const backFace = createWallFace(0, CENTER_REAR, [-1, 0], [0, -1]);
  for (const pos of [-6.2, -4.6, 4.6, 6.2]) drawWindow(S, lowerFace, pos, 0, floorY + 0.5, 2.9, 1.0, true);
  for (const pos of [-2.4, 0, 2.4]) drawWindow(S, lowerFace, pos, 0, floorY + 0.3, 3.0, 1.2, true);
  for (const [pos, out] of [[-6.2, 0], [-4.4, 0], [-2.2, 0.6], [0, 0.6], [2.2, 0.6], [4.4, 0], [6.2, 0]] as [number, number][]) drawWindow(S, upperFace, pos, out, storey1Y + 0.9, 2.3, 1.0, true);
  for (const pos of [-5.8, -2.4, 0, 2.4, 5.8]) {
    const out = Math.abs(pos) < 3.6 ? 0.6 : 0;
    drawWindow(S, backFace, pos, out, floorY + 1.0, 2.3, 1.1, true);
    drawWindow(S, backFace, pos, out, storey1Y + 1.0, 2.2, 1.1, true);
  }
  const eastBackFace = createWallFace(CENTER_HALF_W + WING_W / 2, WING_REAR, [-1, 0], [0, -1]);
  for (const pos of [-2.2, 0, 2.2]) {
    drawWindow(S, eastBackFace, pos, 0, floorY + 1.0, 2.3, 1.1, true);
    drawWindow(S, eastBackFace, pos, 0, storey1Y + 1.0, 2.2, 1.1, true);
  }
  for (const side of [-1, 1]) {
    const wingFrontFace = createWallFace(side * (CENTER_HALF_W + WING_W / 2), WING_FRONT, [1, 0], [0, 1]);
    const outerPos = side * (WING_W / 2 - 1.6);
    const towerPos = side * (-WING_W / 2 + towerSize / 2 - 0.3);
    drawWindow(S, wingFrontFace, outerPos, 0, floorY + 0.6, 2.8, 1.2, true);
    drawWindow(S, wingFrontFace, outerPos, 0, storey1Y + 0.9, 2.4, 1.2, true);
    drawWindow(S, wingFrontFace, towerPos, 0.3, floorY + 0.6, 2.8, 1.1, true);
    drawWindow(S, wingFrontFace, towerPos, 0.3, storey1Y + 1.0, 2.2, 1.0, true);
    drawWindow(S, wingFrontFace, towerPos, 0.3, corniceY + 0.6, 1.8, 0.9, false);

    const innerFace = createWallFace(side * CENTER_HALF_W, (CENTER_GROUND_FRONT + WING_FRONT - towerSize + 0.3) / 2, [0, side], [-side, 0]);
    drawWindow(S, innerFace, 0, 0, storey1Y + 1.0, 2.2, 0.9, true);

    const sideFace = createWallFace(side * PALACE_HALF_W, (WING_FRONT + WING_REAR) / 2, [0, -side], [side, 0]);
    for (const pos of [-5.6, -3.2, -0.8, 1.6, 4.0, 6.2]) {
      const signedPos = side > 0 ? -pos : pos;
      drawWindow(S, sideFace, signedPos, 0, floorY + 1.0, 2.3, 1.1, true);
      drawWindow(S, sideFace, signedPos, 0, storey1Y + 1.0, 2.2, 1.05, true);
    }
  }

  // porch, name board, and stepped frontispiece crest
  const porchDepth = PORCH_FRONT - CENTER_GROUND_FRONT;
  for (const colU of [-3.4, -2.7, 2.7, 3.4]) {
    for (const colV of [PORCH_FRONT - 0.35, CENTER_GROUND_FRONT + 0.35]) {
      if (colV < PORCH_FRONT - 1 && Math.abs(colU) < 3) continue;
      const pt = toWorld(colU, colV);
      S.box(pt[0], pt[1], floorY, floorY + 0.35, 0.6, 0.6, FRAME_ANGLE, COLORS.white);
      S.cyl(pt[0], pt[1], floorY + 0.35, storey1Y - 0.5, 0.25, 0.22, 8, COLORS.white);
      S.box(pt[0], pt[1], storey1Y - 0.5, storey1Y - 0.2, 0.58, 0.58, FRAME_ANGLE, COLORS.white);
    }
  }
  frameBox(S, 0, CENTER_GROUND_FRONT + porchDepth / 2, storey1Y - 0.2, storey1Y + 0.25, 7.8, porchDepth + 0.2, COLORS.white);
  drawBalustrade(S, toWorld(-3.9, PORCH_FRONT), toWorld(3.9, PORCH_FRONT), storey1Y + 0.25, 0.9);
  for (const side of [-1, 1]) drawBalustrade(S, toWorld(side * 3.9, CENTER_GROUND_FRONT + 0.1), toWorld(side * 3.9, PORCH_FRONT), storey1Y + 0.25, 0.9);

  boxOnFace(S, upperFace, 0, 0.75, storey2Y - 0.75, storey2Y - 0.15, 2.4, 0.12, shade(COLORS.shutter, 0.8));
  boxOnFace(S, upperFace, 0, 0.8, storey2Y - 0.65, storey2Y - 0.25, 2.0, 0.1, COLORS.gold);
  boxOnFace(S, upperFace, 0, 0.45, corniceY, corniceY + 1.6, 6.4, 0.5, COLORS.stuccoLight);
  boxOnFace(S, upperFace, 0, 0.45, corniceY + 1.6, corniceY + 2.4, 3.2, 0.5, COLORS.stuccoLight);
  boxOnFace(S, upperFace, 0, 0.45, corniceY + 2.4, corniceY + 2.65, 3.6, 0.6, COLORS.white);
  boxOnFace(S, upperFace, 0, 0.45, corniceY + 1.5, corniceY + 1.65, 6.8, 0.6, COLORS.white);
  drawFaceDisc(S, upperFace, 0, 0.72, corniceY + 1.0, 0.6, COLORS.white, 10, true);
  drawFaceDisc(S, upperFace, 0, 0.74, corniceY + 1.0, 0.4, COLORS.gold, 10, true);
  for (const pos of [-3.1, 3.1]) drawFinial(S, upperFace.at(pos, 0.45), corniceY + 1.65, 0.9);
  drawFinial(S, upperFace.at(0, 0.45), corniceY + 2.65, 1.0);
  for (const lampU of [-2.6, 2.6]) {
    const pt = toWorld(lampU, PORCH_FRONT + 1.6);
    lamps.push([pt[0], floorY + 0.5, pt[1]]);
  }
  const porchCenter = toWorld(0, CENTER_GROUND_FRONT + porchDepth / 2);
  lamps.push([porchCenter[0], storey1Y - 0.6, porchCenter[1]]);
}

// Đình Trung Lập: octagonal pavilion with 12 hip dragons
function buildTrungLapPavilion(S, lamps: [number, number, number][]) {
  const center = toWorld(PAVILION_POS[0], PAVILION_POS[1]);
  const ground = groundY(center);
  const terraceY = ground + 1.6;
  const baseTopY = ground + 2.5;
  const fwdAng = Math.atan2(AXIS_X, -AXIS_Z);
  const rot = fwdAng + Math.PI / 8;
  const lowerR = 4.3;
  const upperR = 3.0;
  const cosOct = Math.cos(Math.PI / 8);

  S.base = ground - LAND_Y;
  S.kind = KIND.MASONRY;
  S.cyl(center[0], center[1], ground - 0.3, terraceY, lowerR, lowerR, 8, COLORS.stone, { rot });
  S.kind = KIND.PLAIN;
  S.cyl(center[0], center[1], terraceY - 0.12, terraceY + 0.04, lowerR + 0.08, lowerR + 0.08, 8, COLORS.stoneLight, { rot });
  S.cyl(center[0], center[1], terraceY, baseTopY, upperR, upperR, 8, COLORS.stoneLight, { rot });
  S.cyl(center[0], center[1], baseTopY - 0.15, baseTopY + 0.05, upperR + 0.1, upperR + 0.1, 8, COLORS.white, { rot });

  for (let i = 0; i < 8; i++) {
    const a0 = rot + (i * Math.PI) / 4;
    const a1 = a0 + Math.PI / 4;
    const midA = (a0 + a1) / 2;
    if (Math.abs(Math.sin(midA - fwdAng)) > 0.95) continue;
    const rad = lowerR - 0.2;
    drawBalustrade(S, [center[0] + Math.cos(a0) * rad, center[1] + Math.sin(a0) * rad], [center[0] + Math.cos(a1) * rad, center[1] + Math.sin(a1) * rad], terraceY, 0.8, COLORS.baluster, 0.4);
  }

  const lowerSteps = 7;
  const stepRun = 0.3;
  const apoLower = lowerR * cosOct;
  const apoUpper = upperR * cosOct;
  for (const side of [-1, 1]) {
    for (let k = 0; k < lowerSteps; k++) {
      frameBox(S, PAVILION_POS[0] + side * (apoLower + stepRun * (k + 0.5)), PAVILION_POS[1], ground - 0.2, terraceY - ((k + 1) * (terraceY - ground)) / lowerSteps + 0.02, stepRun, 2.0, COLORS.stoneLight);
    }
    for (const cheekSide of [-1, 1]) {
      const topPt = toWorld(PAVILION_POS[0] + side * (apoLower - 0.1), PAVILION_POS[1] + cheekSide * 1.2);
      const footPt = toWorld(PAVILION_POS[0] + side * (apoLower + stepRun * lowerSteps + 0.2), PAVILION_POS[1] + cheekSide * 1.2);
      S.beam([topPt[0], terraceY, topPt[1]], [footPt[0], ground, footPt[1]], 0.4, 1.6, COLORS.stone);
    }
    for (let k = 0; k < 3; k++) {
      frameBox(S, PAVILION_POS[0] + side * (apoUpper + 0.3 * (k + 0.5)), PAVILION_POS[1], terraceY - 0.1, baseTopY - ((k + 1) * (baseTopY - terraceY)) / 3 + 0.02, 0.3, 1.8, COLORS.stoneLight);
    }
  }

  for (let i = 0; i < 8; i++) {
    const midA = rot + ((i + 0.5) * Math.PI) / 4;
    if (Math.abs(Math.sin(midA - fwdAng)) > 0.95) continue;
    const apothem = upperR * cosOct + 0.02;
    S.box(center[0] + Math.cos(midA) * apothem, center[1] + Math.sin(midA) * apothem, terraceY + 0.2, baseTopY - 0.25, 1.5, 0.06, midA + Math.PI / 2, COLORS.white);
    S.box(center[0] + Math.cos(midA) * (apothem + 0.03), center[1] + Math.sin(midA) * (apothem + 0.03), terraceY + 0.32, baseTopY - 0.37, 1.24, 0.06, midA + Math.PI / 2, COLORS.pavWall);
  }

  const colTopY = baseTopY + 3.3;
  const colR = 2.4;
  const cornerAt = (idx: number, rad: number): [number, number] => {
    const ang = rot + (idx * Math.PI) / 4;
    return [center[0] + Math.cos(ang) * rad, center[1] + Math.sin(ang) * rad];
  };
  for (let i = 0; i < 8; i++) {
    const p0 = cornerAt(i, colR);
    const p1 = cornerAt(i + 1, colR);
    S.box(p0[0], p0[1], baseTopY, baseTopY + 0.3, 0.38, 0.38, rot + (i * Math.PI) / 4, COLORS.white);
    S.cyl(p0[0], p0[1], baseTopY + 0.3, colTopY, 0.15, 0.13, 8, COLORS.pavWall);
    const mid = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
    const segAng = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
    const segLen = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const midA = rot + ((i + 0.5) * Math.PI) / 4;
    const isStairFace = Math.abs(Math.cos(midA) * Math.sin(fwdAng) - Math.sin(midA) * Math.cos(fwdAng)) > 0.95;
    if (!isStairFace) {
      const trim = 0.2 / segLen;
      drawBalustrade(S, [p0[0] + (p1[0] - p0[0]) * trim, p0[1] + (p1[1] - p0[1]) * trim], [p1[0] + (p0[0] - p1[0]) * trim, p1[1] + (p0[1] - p1[1]) * trim], baseTopY, 0.7, COLORS.white, 0.3);
    }
    S.box(mid[0], mid[1], colTopY - 0.85, colTopY - 0.12, segLen - 0.3, 0.08, segAng, COLORS.lattice);
    S.box(mid[0], mid[1], colTopY - 0.12, colTopY + 0.15, segLen + 0.1, 0.24, segAng, COLORS.pavWall);
    const eavePt = cornerAt(i, colR + 1.0);
    S.beam([p0[0], colTopY - 0.9, p0[1]], [eavePt[0], colTopY + 0.15, eavePt[1]], 0.1, 0.16, COLORS.lattice);
  }

  // octagonal roof, soffit, drum, cap, pearl finial, and 12 dragons
  const roofBotY = colTopY + 0.15;
  const roofMidY = roofBotY + 1.55;
  S.kind = KIND.TILE;
  S.cyl(center[0], center[1], roofBotY, roofMidY, 4.4, 1.25, 8, COLORS.pavRoof, { cap: false, rot });
  S.kind = KIND.PLAIN;
  S.cyl(center[0], center[1], roofBotY - 0.22, roofBotY + 0.02, 4.42, 4.42, 8, shade(COLORS.pavRoof, 0.85), { rot, cap: false });
  for (let i = 0; i < 8; i++) {
    const e0 = cornerAt(i, 4.42), e1 = cornerAt(i + 1, 4.42), c0 = cornerAt(i, colR), c1 = cornerAt(i + 1, colR);
    S.quad([e0[0], roofBotY - 0.22, e0[1]], [c0[0], roofBotY - 0.22, c0[1]], [c1[0], roofBotY - 0.22, c1[1]], [e1[0], roofBotY - 0.22, e1[1]], shade(COLORS.lattice, 0.8), [0, -1, 0]);
    S.quad([e0[0], roofBotY - 0.22, e0[1]], [e1[0], roofBotY - 0.22, e1[1]], [c1[0], roofBotY - 0.22, c1[1]], [c0[0], roofBotY - 0.22, c0[1]], shade(COLORS.lattice, 0.8), [0, -1, 0]);
  }
  const lowerRoofY = (rad: number) => roofBotY + ((4.4 - rad) / (4.4 - 1.25)) * (roofMidY - roofBotY);
  for (let i = 0; i < 8; i++) {
    const outer = cornerAt(i, 4.35);
    const inner = cornerAt(i, 1.3);
    S.beam([outer[0], lowerRoofY(4.35) + 0.06, outer[1]], [inner[0], roofMidY + 0.04, inner[1]], 0.16, 0.14, COLORS.dragon);
  }
  S.cyl(center[0], center[1], roofMidY - 0.05, roofMidY + 0.45, 1.1, 1.1, 8, COLORS.pavWall, { rot });
  S.cyl(center[0], center[1], roofMidY + 0.1, roofMidY + 0.35, 1.13, 1.13, 8, COLORS.lattice, { rot });
  const capBotY = roofMidY + 0.45;
  S.kind = KIND.TILE;
  S.cyl(center[0], center[1], capBotY, capBotY + 0.75, 1.5, 0.15, 8, COLORS.pavRoof, { rot });
  S.kind = KIND.PLAIN;
  S.cyl(center[0], center[1], capBotY + 0.7, capBotY + 0.95, 0.16, 0.16, 6, COLORS.dragon);
  S.cyl(center[0], center[1], capBotY + 0.95, capBotY + 1.25, 0.24, 0.24, 8, COLORS.gold);
  S.cyl(center[0], center[1], capBotY + 1.25, capBotY + 1.45, 0.24, 0.0, 8, COLORS.gold);

  const drawHipDragon = (dir: [number, number], r0: number, r1: number, yAt: (rad: number) => number, scale: number) => {
    const ptAt = (rad: number, up: number): [number, number, number] => [center[0] + dir[0] * rad, yAt(rad) + up, center[1] + dir[1] * rad];
    const span = r1 - r0;
    const body = [ptAt(r0, 0.2 * scale), ptAt(r0 + span * 0.3, 0.5 * scale), ptAt(r0 + span * 0.6, 0.32 * scale), ptAt(r0 + span * 0.88, 0.45 * scale)];
    for (let k = 0; k < 3; k++) S.beam(body[k], body[k + 1], 0.32 * scale, 0.36 * scale, COLORS.dragon);
    const head = ptAt(r1, 0.95 * scale);
    S.beam(body[3], head, 0.36 * scale, 0.42 * scale, COLORS.dragon);
    S.beam(head, ptAt(r1 + 0.25 * scale, 0.8 * scale), 0.28 * scale, 0.24 * scale, COLORS.dragon);
    S.beam(head, ptAt(r1 - 0.15 * scale, 1.25 * scale), 0.12 * scale, 0.12 * scale, COLORS.dragon);
    S.beam(body[0], ptAt(r0 - 0.25 * scale, 0.65 * scale), 0.22 * scale, 0.22 * scale, COLORS.dragon);
  };
  for (let i = 0; i < 8; i++) {
    const ang = rot + (i * Math.PI) / 4;
    drawHipDragon([Math.cos(ang), Math.sin(ang)], 2.5, 4.2, lowerRoofY, 1.0);
  }
  const capRoofY = (rad: number) => capBotY + 0.75 * (1 - (rad - 0.15) / 1.35);
  for (let i = 0; i < 4; i++) {
    const ang = rot + (i * Math.PI) / 2;
    drawHipDragon([Math.cos(ang), Math.sin(ang)], 0.55, 1.35, capRoofY, 0.5);
  }
  lamps.push([center[0], colTopY - 0.4, center[1]]);
}

// riverfront tam quan gate and stone stair down to the An Cựu canal
function buildRiverGateAndStair(S, lamps: [number, number, number][]) {
  const center = toWorld(GATE_POS[0], GATE_POS[1]);
  const ground = groundY(center);
  const floorY = ground + 0.3;
  const frontFace = createWallFace(GATE_POS[0], GATE_POS[1], [1, 0], [0, 1]);
  const backFace = createWallFace(GATE_POS[0], GATE_POS[1], [-1, 0], [0, -1]);
  const thick = 1.4;
  const gateW = 7.6;
  const lowerTopY = floorY + 3.0;

  S.base = ground - LAND_Y;
  S.kind = KIND.MASONRY;
  frameBox(S, GATE_POS[0], GATE_POS[1], ground - 0.3, floorY, gateW + 0.4, thick + 1.0, COLORS.stone, { top: COLORS.stoneLight });
  S.kind = KIND.PLAIN;
  frameBox(S, GATE_POS[0], GATE_POS[1], floorY, lowerTopY, gateW, thick, COLORS.gateCream);

  for (const wallFace of [frontFace, backFace]) {
    for (const [pos, doorW, doorH] of [[0, 1.7, 1.6], [-2.55, 1.3, 1.3], [2.55, 1.3, 1.3]] as [number, number, number][]) {
      boxOnFace(S, wallFace, pos, thick / 2, floorY, floorY + doorH, doorW + 0.24, 0.1, COLORS.white);
      drawFaceDisc(S, wallFace, pos, thick / 2 + 0.06, floorY + doorH, doorW / 2 + 0.12, COLORS.white, 8);
      boxOnFace(S, wallFace, pos, thick / 2 + 0.05, floorY, floorY + doorH + 0.04, doorW, 0.12, COLORS.red);
      drawFaceDisc(S, wallFace, pos, thick / 2 + 0.12, floorY + doorH, doorW / 2, COLORS.red, 8);
    }
    for (const pos of [-3.55, -1.55, 1.55, 3.55]) {
      boxOnFace(S, wallFace, pos, thick / 2 + 0.08, floorY, floorY + 0.5, 0.5, 0.18, COLORS.red);
      boxOnFace(S, wallFace, pos, thick / 2 + 0.06, floorY + 0.5, lowerTopY - 0.35, 0.4, 0.14, COLORS.gateBlue);
      boxOnFace(S, wallFace, pos, thick / 2 + 0.1, floorY + 0.9, lowerTopY - 0.75, 0.22, 0.08, COLORS.gateBlueLight);
    }
    boxOnFace(S, wallFace, 0, thick / 2 + 0.06, lowerTopY - 0.35, lowerTopY - 0.05, gateW, 0.14, COLORS.gateBlueLight);
    boxOnFace(S, wallFace, 0, thick / 2 + 0.1, floorY + 2.3, floorY + 2.6, 1.4, 0.08, COLORS.gold);
  }

  S.kind = KIND.TILE;
  S.hip(center[0], center[1], gateW, thick, FRAME_ANGLE, lowerTopY, 0.5, COLORS.gateTile, { over: 0.35, flare: 0.1 });
  S.kind = KIND.PLAIN;
  const upperBaseY = lowerTopY + 0.2;
  frameBox(S, GATE_POS[0], GATE_POS[1], lowerTopY, upperBaseY + 1.8, 3.0, thick - 0.3, COLORS.gateCream);
  for (const wallFace of [frontFace, backFace]) {
    for (const pos of [-1.35, 1.35]) boxOnFace(S, wallFace, pos, (thick - 0.3) / 2 + 0.05, upperBaseY, upperBaseY + 1.8, 0.3, 0.1, COLORS.gateBlue);
    drawFaceDisc(S, wallFace, 0, (thick - 0.3) / 2 + 0.05, upperBaseY + 0.9, 0.62, COLORS.gateBlue, 12, true);
    drawFaceDisc(S, wallFace, 0, (thick - 0.3) / 2 + 0.07, upperBaseY + 0.9, 0.48, COLORS.red, 12, true);
    drawFaceDisc(S, wallFace, 0, (thick - 0.3) / 2 + 0.09, upperBaseY + 0.9, 0.26, COLORS.gold, 12, true);
  }
  S.kind = KIND.TILE;
  S.hip(center[0], center[1], 3.0, thick - 0.3, FRAME_ANGLE, upperBaseY + 1.8, 0.4, COLORS.gateTile, { over: 0.35, flare: 0.1 });
  S.kind = KIND.PLAIN;
  frameBox(S, GATE_POS[0], GATE_POS[1], upperBaseY + 2.1, upperBaseY + 2.75, 1.9, thick - 0.6, COLORS.gateCream);
  S.kind = KIND.TILE;
  S.hip(center[0], center[1], 2.2, thick - 0.3, FRAME_ANGLE, upperBaseY + 2.75, 0.85, COLORS.gateTile, { over: 0.35, flare: 0.2, ridgeCol: shade(COLORS.gateTile, 0.75) });
  S.kind = KIND.PLAIN;
  const ridgeY = upperBaseY + 2.75 + 0.85;
  S.cyl(center[0], center[1], ridgeY - 0.05, ridgeY + 0.15, 0.18, 0.18, 6, COLORS.gateCream);
  S.cyl(center[0], center[1], ridgeY + 0.15, ridgeY + 0.5, 0.28, 0.28, 8, COLORS.gold);
  S.cyl(center[0], center[1], ridgeY + 0.5, ridgeY + 0.7, 0.28, 0.02, 8, COLORS.gold);

  for (const side of [-1, 1]) {
    const kioskU = GATE_POS[0] + side * 3.0;
    const kioskPt = toWorld(kioskU, GATE_POS[1]);
    frameBox(S, kioskU, GATE_POS[1], lowerTopY, lowerTopY + 1.1, 1.0, 1.0, COLORS.gateCream);
    for (const wallFace of [frontFace, backFace]) {
      const pos = wallFace === frontFace ? side * 3.0 : -side * 3.0;
      boxOnFace(S, wallFace, pos, 0.52, lowerTopY + 0.2, lowerTopY + 0.9, 0.5, 0.06, COLORS.gateBlue);
    }
    S.kind = KIND.TILE;
    S.hip(kioskPt[0], kioskPt[1], 1.1, 1.1, FRAME_ANGLE, lowerTopY + 1.1, 0.6, COLORS.gateTile, { over: 0.2, flare: 0.15, ridgeCol: shade(COLORS.gateTile, 0.75) });
    S.kind = KIND.PLAIN;
    drawFinial(S, kioskPt, lowerTopY + 1.65, 0.4, COLORS.gold);
    const lampPt = toWorld(GATE_POS[0] + side * 1.55, GATE_POS[1] + 1.0);
    lamps.push([lampPt[0], floorY + 2.4, lampPt[1]]);
  }

  // stone stair down to the An Cựu canal
  const stairV0 = GATE_POS[1] + 10.4;
  const stepCount = 8;
  const run = 0.5;
  const drop = 0.2;
  S.kind = KIND.MASONRY;
  S.base = ground - 2.0 - LAND_Y;
  for (let k = 0; k < stepCount; k++) frameBox(S, GATE_POS[0], stairV0 + run * (k + 0.5), ground - 2.2, ground - drop * (k + 1) + 0.02, 7.6, run, COLORS.stoneLight);
  for (const side of [-1, 1]) {
    frameBox(S, GATE_POS[0] + side * 4.05, stairV0 + (stepCount * run) / 2, ground - 2.2, ground + 0.25, 0.5, stepCount * run, COLORS.stone);
    frameBox(S, GATE_POS[0] + side * 4.05, stairV0 + 0.3, ground - 0.2, ground + 0.9, 0.7, 0.7, COLORS.stoneLight);
  }
  S.kind = KIND.PLAIN;
}

function drawFanPalm(S, pt: [number, number], height: number, seed: number) {
  const ground = groundY(pt);
  const top: [number, number, number] = [pt[0] + Math.cos(seed * 2.1) * 0.35, ground + height, pt[1] + Math.sin(seed * 2.1) * 0.35];
  S.base = ground - LAND_Y;
  S.kind = KIND.PLAIN;
  S.beam([pt[0], ground, pt[1]], top, 0.36, 0.36, COLORS.palmTrunk);
  const frondCount = 11;
  const frondR = 2.1;
  for (let k = 0; k < frondCount; k++) {
    const ang = (k / frondCount) * Math.PI * 2 + seed;
    const dx = Math.cos(ang);
    const dz = Math.sin(ang);
    const droop = k % 3 === 0 ? -0.9 : -0.2;
    const mid = [top[0] + dx * frondR * 0.55, top[1] + 0.35, top[2] + dz * frondR * 0.55];
    const tip = [top[0] + dx * frondR, top[1] + droop, top[2] + dz * frondR];
    const sx = -dz * 0.75;
    const sz = dx * 0.75;
    const col = k % 2 ? COLORS.palmFrond : COLORS.palmFrondAlt;
    S.quad(top, [mid[0] + sx, mid[1], mid[2] + sz], tip, [mid[0] - sx, mid[1], mid[2] - sz], col, [0, 1, 0]);
    S.quad(top, [mid[0] - sx, mid[1], mid[2] - sz], tip, [mid[0] + sx, mid[1], mid[2] + sz], shade(col, 0.8), [0, -1, 0]);
  }
  S.cyl(top[0], top[2], top[1] - 0.7, top[1] + 0.05, 0.4, 0.3, 6, COLORS.palmCrown);
}

export function build({ data, S, group }) {
  const lamps: [number, number, number][] = [];
  buildPalace(S, lamps);
  buildTrungLapPavilion(S, lamps);
  buildRiverGateAndStair(S, lamps);

  S.kind = KIND.ROAD;
  S.base = 0;
  const courtG = groundY(toWorld(0, 18));
  frameBox(S, 0, 18.0, courtG - 0.2, courtG + 0.05, 16.0, 12.0, COLORS.gravel);
  frameBox(S, 0, 23.6, courtG - 0.2, groundY(toWorld(0, 23.6)) + 0.06, 3.0, 2.8, COLORS.gravel);
  S.kind = KIND.PLAIN;

  const area = data.special && data.special.andinhArea;
  if (area) {
    const ring: [number, number][] = [];
    for (let i = 0; i + 1 < area.ring.length; i += 2) ring.push([area.ring[i] / 10, area.ring[i + 1] / 10]);
    const gateWorld = toWorld(GATE_POS[0], GATE_POS[1]);
    fence(
      S,
      ring,
      { h: 2.2, plinth: 1.8, rail: false, t: 0.5, every: 3.6, postW: 0.6, postUp: 0.15, wall: COLORS.stucco, cap: COLORS.fenceCap, iron: COLORS.fenceIron, pierW: 1.0, pierUp: 0.6 },
      { roads: roadsNear(data, CENTER, 200), openings: [[gateWorld[0], gateWorld[1], 3.65]], solid: buildingsNear(data, CENTER, 180) },
    );
  }

  if (Array.isArray(data.trees)) {
    const treeSpecs: [number, number, number, number][] = [
      [-16, 22, 19, 1], [13.5, 20.8, 19, 2], [-19.5, 20.5, 18, 1], [19.5, 20.5, 18, 1],
      [14.5, 17.5, 17, 2], [-18.9, 7.3, 18, 1], [19.5, 12.5, 17, 1],
    ];
    for (const [uPos, vPos, scale, kind] of treeSpecs) {
      const pt = toWorld(uPos, vPos);
      data.trees.push(Math.round(pt[0] * 10), Math.round(pt[1] * 10), scale, kind);
    }
  }
  for (const [uPos, vPos, height, idx] of [[9.6, 13.6, 11, 0], [7.2, 19.6, 12.5, 1], [-15.5, 14.7, 10.5, 2], [-6.5, 22.8, 11.5, 3], [6.5, 22.8, 10, 4], [-10.5, 16.0, 9.5, 5]] as [number, number, number, number][]) {
    drawFanPalm(S, toWorld(uPos, vPos), height, idx);
  }

  S.kind = KIND.PLAIN;
  S.base = 0;
  if (lamps.length) {
    const positions: number[] = [];
    const colors: number[] = [];
    for (const lamp of lamps) {
      positions.push(...lamp);
      colors.push(1, 0.72, 0.4);
    }
    const glow = glowPoints(positions, colors, 5);
    glow.userData.glow = true;
    glow.userData.landmark = id;
    group.add(glow);
  }
}
