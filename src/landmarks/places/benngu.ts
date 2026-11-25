import { KIND, Buf, hex, shade } from '../../geo/buf.ts';
import { LAND_Y } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { lightMaterial } from '../../geo/materials.ts';

// Chợ Bến Ngự, 47 Phan Bội Châu, on the corner of Phan Đình Phùng by cầu Bến Ngự and the An Cựu canal. Sources and
// estimates: docs/places/benngu.md.
//
// The market as the 2020s aerial imagery and street-level photos show it:
//   hall     a 35.8 x 30.8 m roof (the satellite's roof edges; OSM way 513649271 reads 38.9 x 34 m) under three
//            parallel grey sheet-steel gables whose ridges run east-south-east, the middle one wider and taller.
//            The front on Phan Bội Châu is three red-brown gable walls trimmed in pale yellow, a pentagonal glazed
//            clerestory in each, a projecting entrance porch with the market's name, and stall awnings either side.
//            The other sides are cream, two storeys of stall bays with a band of white louvres above.
//   sheds    a single-storey stall shed (survey 6 m) along the hall's east side behind a strip of translucent
//            sheeting, ridge along its length and hipped at the canal end; at its north end it turns west, and
//            lower roofs fill the corner north-east of the hall
//   yards    the front yard on Phan Bội Châu, and beige stall awnings along the south wall toward the canal road
//            (the canal itself, its embankment and the bridge are not drawn here)
//
// Frame: origin ORIGIN, 0.1 m outside the hall roof's north-west corner; u along the north side (bearing 111, east-south-
// east), v at right angles to it (south-south-west, toward the canal). Box angle ANGLE makes a box's local x run along u
// and local z along v. ORIGIN and the 21 degree axis are fitted to the satellite roof edges.
export const id = 'benngu';

const ORIGIN = [-536.22, 1488.87];
const TANGENT = [0.93358, 0.35837];
const NORMAL = [-0.35837, 0.93358];
const ANGLE = Math.atan2(TANGENT[1], TANGENT[0]);
const toWorld = (u, v): [number, number] => [ORIGIN[0] + TANGENT[0] * u + NORMAL[0] * v, ORIGIN[1] + TANGENT[1] * u + NORMAL[1] * v];
const BASE_Y = LAND_Y + rise(...toWorld(18, 16)); // one floor level for the whole market (the site is flat)

const HALL = { u0: 0.6, u1: 35.0, v0: 1.0, v1: 30.6, eave: 7.0 };
const HALL_GABLES = [
  { v0: 0.4, v1: 9.7, eave: 7.0, height: 1.8 },
  { v0: 9.7, v1: 20.8, eave: 7.4, height: 2.4 },
  { v0: 20.8, v1: 31.2, eave: 7.0, height: 1.8 },
];
const GRILLE_Y0 = 3.95;
const GRILLE_Y1 = 5.35;
const CLERESTORY_Y0 = 5.75;
const CLERESTORY_Y1 = 6.55;
const PORCH_HALF_W = 2.5;
const PORCH_DEPTH = 1.1;
const SHED_EAVE = 4.4;
const SHED_RIDGE = 1.4;
const SOUTH_AWNING = { v0: HALL.v1 + 0.14, v1: 38.9, y0: 3.8, y1: 2.35 };
const SIGN_WIDTH = 4.4;
const SIGN_HEIGHT = SIGN_WIDTH * 64 / 512;
const NIGHT_LIGHT_HEX = 0xffc068;

const COLORS = {
  wall: hex('#e0cf98'),
  front: hex('#8a6a60'),
  trim: hex('#e6d58c'),
  rake: hex('#ddd3b2'),
  plinth: hex('#8c8679'),
  shutter: hex('#6f7f86'),
  dark: hex('#2e2a26'),
  glass: hex('#3a4448'),
  vent: hex('#e8e4d8'),
  roof: hex('#8f9597'),
  roofLight: hex('#b8bcbb'),
  rust: hex('#8a6a55'),
  clear: hex('#9fb8c2'),
  pave: hex('#a9a294'),
  signBrown: hex('#6e2c22'),
  signRed: hex('#c0261f'),
  awning: [hex('#d6cbb0'), hex('#c9bb98'), hex('#e0dccf'), hex('#cdbf9f')],
  post: hex('#5d5f5f'),
  table: hex('#7a6248'),
  board: [hex('#2f7a4a'), hex('#e6e2d6'), hex('#d9a82c'), hex('#3a5f9e')],
  ink: [hex('#f0d64a'), hex('#c0261f'), hex('#b5221c'), hex('#f2f0e8')], // lettering on each board colour
  signTextDay: '#f2c64a',
  signTextGlow: '#ffd870',
};

function boxUV(S, u0, u1, v0, v1, y0, y1, color, opt?) {
  const pos = toWorld((u0 + u1) / 2, (v0 + v1) / 2);
  S.box(pos[0], pos[1], BASE_Y + y0, BASE_Y + y1, u1 - u0, v1 - v0, ANGLE, color, opt);
}

const world3 = (u, v, y) => {
  const pos = toWorld(u, v);
  return [pos[0], BASE_Y + y, pos[1]];
};
const uvPoint = (u, v, y, swap) => (swap ? world3(v, u, y) : world3(u, v, y));

// a gable roof over a0..a1 (along the ridge) x b0..b1 (across it, eaves included), eave at eaveY, ridge at eaveY + ridgeH.
// alongV runs the ridge along v instead of u. hip1 hips the a1 end (the ridge stops half a span short of it).
function buildGable(S, a0, a1, b0, b1, eaveY, ridgeH, color, { alongV = false, hip1 = false }: Record<string, any> = {}) {
  const savedKind = S.kind;
  const midB = (b0 + b1) / 2;
  const halfSpan = (b1 - b0) / 2;
  const ridgeEnd = hip1 ? a1 - halfSpan : a1;
  const axisAlong = alongV ? NORMAL : TANGENT;
  const axisAcross = alongV ? TANGENT : NORMAL;
  const norm0 = [-axisAcross[0], 0.8, -axisAcross[1]];
  const norm1 = [axisAcross[0], 0.8, axisAcross[1]];
  const normEnd = [axisAlong[0], 0.8, axisAlong[1]];
  const pt = (along, across, y) => uvPoint(along, across, y, alongV);
  S.kind = KIND.TILE; // corrugated steel sheet ribs & weathering
  S.quad(pt(a0, b0, eaveY), pt(a1, b0, eaveY), pt(ridgeEnd, midB, eaveY + ridgeH), pt(a0, midB, eaveY + ridgeH), color, norm0);
  S.quad(pt(a1, b1, eaveY), pt(a0, b1, eaveY), pt(a0, midB, eaveY + ridgeH), pt(ridgeEnd, midB, eaveY + ridgeH), color, norm1);
  if (hip1) S.tri(pt(a1, b0, eaveY), pt(a1, b1, eaveY), pt(ridgeEnd, midB, eaveY + ridgeH), color, normEnd);
  // ridge cap beam & sheet thickness at the eaves
  S.kind = KIND.PLAIN;
  S.beam(pt(a0, midB, eaveY + ridgeH + 0.05), pt(ridgeEnd, midB, eaveY + ridgeH + 0.05), 0.32, 0.12, shade(color, 0.72));
  S.quad(pt(a0, b0, eaveY - 0.12), pt(a1, b0, eaveY - 0.12), pt(a1, b0, eaveY), pt(a0, b0, eaveY), shade(color, 0.6), norm0);
  S.quad(pt(a1, b1, eaveY - 0.12), pt(a0, b1, eaveY - 0.12), pt(a0, b1, eaveY), pt(a1, b1, eaveY), shade(color, 0.6), norm1);
  S.kind = savedKind;
}

// the end wall of a gable in the plane u = u, over v0..v1 of a gable spanning gableSpec.v0..gableSpec.v1, from height y0 up to the
// rake (a quad up to the eave line and the triangle above it); sideSign is the side it faces (-1 west, +1 east)
function buildGableFace(S, u, gableSpec, v0, v1, y0, color, sideSign, lift = 0) {
  const midV = (gableSpec.v0 + gableSpec.v1) / 2;
  const halfSpan = (gableSpec.v1 - gableSpec.v0) / 2;
  const rakeY = (v) => gableSpec.eave + lift + gableSpec.height * (1 - Math.abs(v - midV) / halfSpan);
  const normal = [TANGENT[0] * sideSign, 0, TANGENT[1] * sideSign];
  S.quad(world3(u, v0, y0), world3(u, v1, y0), world3(u, v1, rakeY(v1)), world3(u, v0, rakeY(v0)), color, normal);
  S.tri(world3(u, v0, rakeY(v0)), world3(u, v1, rakeY(v1)), world3(u, midV, rakeY(midV)), color, normal);
}

// a single-storey stall shed: low walls open in bays, a sheet roof (ridge along u, or along v with alongV)
function buildShed(S, u0, u1, v0, v1, eaveY, ridgeH, roofColor, opt: Record<string, any> = {}) {
  S.kind = KIND.PLAIN;
  boxUV(S, u0 + 0.4, u1 - 0.4, v0 + 0.4, v1 - 0.4, 0, eaveY, COLORS.wall, { top: shade(COLORS.wall, 0.7) });
  boxUV(S, u0 + 0.35, u1 - 0.35, v0 + 0.35, v1 - 0.35, 0, 2.6, COLORS.shutter); // roller shutters and open stall fronts
  boxUV(S, u0 + 0.3, u1 - 0.3, v0 + 0.3, v1 - 0.3, 2.6, 2.8, COLORS.trim);
  if (opt.alongV) buildGable(S, v0, v1, u0, u1, eaveY, ridgeH, roofColor, opt);
  else buildGable(S, u0, u1, v0, v1, eaveY, ridgeH, roofColor, opt);
}

// a shop sign's lettering, suggested: a row of large word blocks and a row of small ones in the board's ink colour.
// put(a, b, d0, d1, y0, y1, col) draws on the board's face; colorIdx picks the board colour
function drawSignText(put, startCoord, endCoord, y0, y1, colorIdx) {
  const inkColor = COLORS.ink[colorIdx % COLORS.ink.length];
  const height = y1 - y0;
  let seed = 0.37 + colorIdx * 0.17;
  const nextRand = () => (seed = (seed * 9301 + 0.4927) % 1);
  for (const [f0, f1, gap, minW, maxW] of ([[0.5, 0.8, 0.12, 0.3, 0.7], [0.18, 0.34, 0.06, 0.1, 0.3]] as any[])) {
    for (let x = startCoord + 0.15; x < endCoord - 0.25;) {
      const width = Math.min(minW + nextRand() * (maxW - minW), endCoord - 0.15 - x);
      put(x, x + width, 0, 0.02, y0 + height * f0, y0 + height * f1, inkColor);
      x += width + gap;
    }
  }
}

function buildHallSideWalls(S) {
  const { u0, u1, v0, v1, eave } = HALL;
  // plain plaster: the openings are drawn below, so the facade shader's window grid must not add its own
  S.kind = KIND.PLAIN;
  boxUV(S, u0, u1, v0, v1, 0, eave, COLORS.wall, { top: shade(COLORS.wall, 0.6) });
  boxUV(S, u0 - 0.15, u1 + 0.15, v0 - 0.15, v1 + 0.15, 0, 0.45, COLORS.plinth); // the step of the stall floor

  const computeBays = (len, step) => {
    const count = Math.max(1, Math.round(len / step));
    return { count, span: len / count };
  };
  // a box on one wall: a..b along it, d0..d1 out from its face, y0..y1 up
  const onWall = (side, a, b, d0, d1, y0, y1, color) => {
    if (side === 'n') boxUV(S, a, b, v0 - d1, v0 - d0, y0, y1, color);
    else if (side === 's') boxUV(S, a, b, v1 + d0, v1 + d1, y0, y1, color);
    else boxUV(S, u1 + d0, u1 + d1, a, b, y0, y1, color);
  };

  for (const [side, wallStart, wallEnd] of ([['n', u0, u1], ['s', u0, u1], ['e', v0, v1]] as any[])) {
    const { count, span } = computeBays(wallEnd - wallStart, 3.6);
    for (let i = 0; i < count; i++) {
      const bayA = wallStart + i * span + 0.3;
      const bayB = wallStart + (i + 1) * span - 0.3;
      onWall(side, bayA, bayB, 0, 0.06, 0.45, 3.2, COLORS.shutter);
      // the grille's dark opening, its frame, a middle stile and the slats across it
      onWall(side, bayA + 0.15, bayB - 0.15, 0, 0.02, GRILLE_Y0, GRILLE_Y1, COLORS.dark);
      for (const [p, q] of ([[bayA + 0.15, bayA + 0.25], [bayB - 0.25, bayB - 0.15], [(bayA + bayB) / 2 - 0.04, (bayA + bayB) / 2 + 0.04]] as any[])) {
        onWall(side, p, q, 0, 0.09, GRILLE_Y0, GRILLE_Y1, COLORS.vent);
      }
      for (const y of [GRILLE_Y0, GRILLE_Y1 - 0.08]) {
        onWall(side, bayA + 0.15, bayB - 0.15, 0, 0.09, y, y + 0.08, COLORS.vent);
      }
      for (let y = GRILLE_Y0 + 0.2; y < GRILLE_Y1 - 0.15; y += 0.19) {
        onWall(side, bayA + 0.25, bayB - 0.25, 0.01, 0.07, y, y + 0.09, COLORS.vent);
      }
      if (i % 3 === 1) {
        const boardIdx = (i + side.charCodeAt(0)) % COLORS.board.length;
        onWall(side, bayA + 0.05, bayB - 0.05, 0.1, 0.16, GRILLE_Y0 - 0.05, GRILLE_Y1 + 0.05, COLORS.board[boardIdx]);
        drawSignText(
          (p, q, d0, d1, y0, y1, color) => onWall(side, p, q, d0 + 0.16, d1 + 0.16, y0, y1, color),
          bayA + 0.05,
          bayB - 0.05,
          GRILLE_Y0 - 0.05,
          GRILLE_Y1 + 0.05,
          boardIdx,
        );
      }
    }
    // the clerestory strip under the eaves, glazing bars every 1.2 m
    onWall(side, wallStart + 0.25, wallEnd - 0.25, 0, 0.03, CLERESTORY_Y0, CLERESTORY_Y1, COLORS.glass);
    const barStep = (wallEnd - wallStart - 0.5) / Math.round((wallEnd - wallStart - 0.5) / 1.2);
    for (let x = wallStart + 0.25; x <= wallEnd - 0.2; x += barStep) {
      onWall(side, x - 0.05, x + 0.05, 0, 0.06, CLERESTORY_Y0, CLERESTORY_Y1, COLORS.wall);
    }
    for (const y of [CLERESTORY_Y0 - 0.06, CLERESTORY_Y1]) {
      onWall(side, wallStart + 0.25, wallEnd - 0.25, 0, 0.06, y, y + 0.06, COLORS.wall);
    }
  }
  for (const y of [3.6, 6.75]) {
    boxUV(S, u0 + 0.2, u1 + 0.12, v0 - 0.12, v0, y, y + 0.25, COLORS.trim);
    boxUV(S, u0 + 0.2, u1 + 0.12, v1, v1 + 0.12, y, y + 0.25, COLORS.trim);
    boxUV(S, u1, u1 + 0.12, v0, v1, y, y + 0.25, COLORS.trim);
  }
}

function buildHallRoofsAndFront(S) {
  const { u0, u1, v0, v1, eave } = HALL;
  // the roofs, their gable walls (red-brown on the front, cream at the back) and the step where the middle gable's
  // higher eaves meet the side gables
  for (const gableSpec of HALL_GABLES) {
    buildGable(S, u0 - 0.2, u1 + 0.7, gableSpec.v0, gableSpec.v1, gableSpec.eave, gableSpec.height, COLORS.roof);
    const frontV0 = Math.max(gableSpec.v0, v0 - 0.08);
    const frontV1 = Math.min(gableSpec.v1, v1 + 0.08);
    buildGableFace(S, u0 - 0.08, gableSpec, frontV0, frontV1, eave - 0.01, COLORS.front, -1);
    buildGableFace(S, u1 + 0.01, gableSpec, Math.max(gableSpec.v0, v0), Math.min(gableSpec.v1, v1), eave - 0.01, COLORS.wall, 1);
    // a thin pale trim along the front rakes, ending flush with the wall's corners (the beam is inset by its
    // half-width so its end cap does not stand out past the side walls)
    const midV = (gableSpec.v0 + gableSpec.v1) / 2;
    const halfSpan = (gableSpec.v1 - gableSpec.v0) / 2;
    const rakeY = (v) => gableSpec.eave + gableSpec.height * (1 - Math.abs(v - midV) / halfSpan);
    for (const edgeV of [Math.max(gableSpec.v0, v0) + 0.08, Math.min(gableSpec.v1, v1) - 0.08]) {
      S.beam(world3(u0 - 0.15, edgeV, rakeY(edgeV) - 0.1), world3(u0 - 0.15, midV, gableSpec.eave + gableSpec.height - 0.1), 0.14, 0.14, COLORS.rake);
    }
  }
  for (const valleyV of [HALL_GABLES[1].v0, HALL_GABLES[1].v1]) {
    boxUV(S, u0 - 0.2, u1 + 0.7, valleyV - 0.15, valleyV + 0.15, eave - 0.15, HALL_GABLES[1].eave + 0.02, shade(COLORS.roof, 0.7)); // valley gutter
  }
  // the front cornice band and a plinth course under the gables
  boxUV(S, u0 - 0.16, u0 - 0.05, v0 - 0.08, v1 + 0.08, eave - 0.15, eave, COLORS.rake);
  boxUV(S, u0 - 0.12, u0, v0 - 0.1, v1 + 0.1, 0.45, 0.9, shade(COLORS.front, 0.75));
  // the red front wall below the gables
  boxUV(S, u0 - 0.08, u0, v0 - 0.08, v1 + 0.08, 0.45, eave, COLORS.front);

  // the clerestories: a pentagon of glazing in each front gable, framed in pale cream, with a grid of glazing bars
  const drawPentagon = (u, va, vb, yBot, yShoulder, yPeak, color, sideSign) => {
    const normal = [TANGENT[0] * sideSign, 0, TANGENT[1] * sideSign];
    const midV = (va + vb) / 2;
    S.quad(world3(u, va, yBot), world3(u, vb, yBot), world3(u, vb, yShoulder), world3(u, va, yShoulder), color, normal);
    S.tri(world3(u, va, yShoulder), world3(u, vb, yShoulder), world3(u, midV, yPeak), color, normal);
  };
  for (const [i, gableSpec] of HALL_GABLES.entries()) {
    const isMid = i === 1;
    const midV = (gableSpec.v0 + gableSpec.v1) / 2;
    const halfW = isMid ? 3.7 : 2.6;
    const yBot = isMid ? 4.2 : 4.6;
    const yShoulder = yBot + (isMid ? 1.4 : 1.0);
    const yPeak = gableSpec.eave + gableSpec.height * (isMid ? 0.1 : 0.0);
    drawPentagon(u0 - 0.12, midV - halfW - 0.15, midV + halfW + 0.15, yBot - 0.15, yShoulder + 0.03, yPeak + 0.18, COLORS.rake, -1);
    drawPentagon(u0 - 0.15, midV - halfW, midV + halfW, yBot, yShoulder, yPeak, COLORS.glass, -1);
    const barCount = isMid ? 8 : 5;
    for (let k = 1; k < barCount; k++) {
      const barV = midV - halfW + (2 * halfW * k) / barCount;
      const barTop = yShoulder + (yPeak - yShoulder) * (1 - Math.abs(barV - midV) / halfW);
      boxUV(S, u0 - 0.2, u0 - 0.15, barV - 0.035, barV + 0.035, yBot, barTop, COLORS.rake);
    }
    boxUV(S, u0 - 0.2, u0 - 0.15, midV - halfW, midV + halfW, yShoulder - 0.035, yShoulder + 0.035, COLORS.rake);
  }
}

function buildPorchAndFrontAwnings(S) {
  const { u0, v0, v1 } = HALL;
  // the entrance porch under the middle gable: a projecting red-brown block with pale pilasters, the market's name in
  // gold on a brown band and a red banner above it
  const midV = (HALL_GABLES[1].v0 + HALL_GABLES[1].v1) / 2;
  S.kind = KIND.CIVIC;
  boxUV(S, u0 - PORCH_DEPTH, u0, midV - PORCH_HALF_W, midV + PORCH_HALF_W, 0.45, 5.0, COLORS.front, { top: shade(COLORS.front, 0.7) });
  S.kind = KIND.PLAIN;
  boxUV(S, u0 - PORCH_DEPTH - 0.02, u0 - PORCH_DEPTH + 0.3, midV - 1.7, midV + 1.7, 0.08, 3.3, COLORS.dark); // the open entrance
  for (const side of [-1, 1]) {
    boxUV(S, u0 - PORCH_DEPTH - 0.06, u0 - PORCH_DEPTH + 0.2, midV + side * 2.1 - 0.3, midV + side * 2.1 + 0.3, 0.08, 4.4, COLORS.trim);
  }
  boxUV(S, u0 - PORCH_DEPTH - 0.08, u0 - PORCH_DEPTH, midV - 2.4, midV + 2.4, 3.45, 4.3, COLORS.signBrown);
  boxUV(S, u0 - PORCH_DEPTH - 0.9, u0 - PORCH_DEPTH, midV - 2.0, midV + 2.0, 0.08, 0.3, COLORS.plinth); // entrance steps
  boxUV(S, u0 - PORCH_DEPTH - 0.5, u0 - PORCH_DEPTH, midV - 2.0, midV + 2.0, 0.3, 0.5, COLORS.plinth);
  for (const [offset, color] of ([[-1.6, COLORS.signRed], [-0.8, COLORS.board[2]], [0.8, COLORS.signRed], [1.6, COLORS.board[2]]] as any[])) {
    boxUV(S, u0 - PORCH_DEPTH - 0.1, u0 - PORCH_DEPTH, midV + offset - 0.3, midV + offset + 0.3, 5.05, 5.9, color); // flags over the porch
  }
  boxUV(S, u0 - PORCH_DEPTH - 0.08, u0 - PORCH_DEPTH, midV - 2.4, midV + 2.4, 4.4, 4.95, COLORS.signRed);

  // stall awnings along the front, either side of the porch, with the stalls' signboards above them
  let awningIdx = 0;
  const drawFrontAwningRow = (rowStart, rowEnd) => {
    for (let v = rowStart; v < rowEnd - 1; v += 4.2, awningIdx++) {
      const a = v;
      const b = Math.min(v + 4.0, rowEnd);
      const awningColor = COLORS.awning[awningIdx % COLORS.awning.length];
      S.quad(world3(u0 - 0.1, a, 3.2), world3(u0 - 0.1, b, 3.2), world3(u0 - 3.6, b, 2.5), world3(u0 - 3.6, a, 2.5), awningColor, [-0.2, 1, 0]);
      S.quad(world3(u0 - 0.1, b, 3.18), world3(u0 - 0.1, a, 3.18), world3(u0 - 3.6, a, 2.48), world3(u0 - 3.6, b, 2.48), shade(awningColor, 0.6), [0, -1, 0]);
      const boardIdx = awningIdx % COLORS.board.length;
      boxUV(S, u0 - 0.25, u0 - 0.08, a + 0.2, b - 0.2, 3.35, 4.1, COLORS.board[boardIdx]);
      drawSignText((p, q, d0, d1, y0, y1, color) => boxUV(S, u0 - 0.25 - d1, u0 - 0.25 - d0, p, q, y0, y1, color), a + 0.2, b - 0.2, 3.35, 4.1, boardIdx);
      boxUV(S, u0 - 0.3, u0 - 0.08, a + 0.2, b - 0.2, 0.45, 3.1, COLORS.dark);
      for (const postV of [a + 0.1, b - 0.1]) {
        boxUV(S, u0 - 3.55, u0 - 3.45, postV - 0.05, postV + 0.05, 0.08, 2.5, COLORS.post);
      }
    }
  };
  drawFrontAwningRow(v0 + 0.2, midV - PORCH_HALF_W - 0.2);
  drawFrontAwningRow(midV + PORCH_HALF_W + 0.2, v1 - 0.2);
  return awningIdx;
}

function buildStallSheds(S) {
  // along the east side (hipped at the canal end), turning west at the north end; lower roofs
  // in the corner north-east of the hall (light, flat, and one light gable ridged north-south)
  buildShed(S, 38.9, 47.1, -12.1, 31.2, SHED_EAVE, SHED_RIDGE, COLORS.roof, { alongV: true, hip1: true });
  buildShed(S, 31.5, 38.9, -12.1, -7.1, SHED_EAVE, 1.0, COLORS.roof);
  buildShed(S, 31.5, 47.9, -17.5, -12.1, 4.6, 1.6, COLORS.roof); // the satellite shows it to v -23.6; cut back off the mapped lane
  buildShed(S, 20.7, 31.5, -16.8, -0.5, 5.0, 1.8, COLORS.roofLight, { alongV: true });
  S.kind = KIND.PLAIN;
  boxUV(S, 31.5, 38.9, -7.1, 0.3, 0, 4.0, COLORS.wall, { top: COLORS.roofLight }); // a flat-roofed stall block
  // the translucent sheeting over the passage between the hall and the east shed
  boxUV(S, HALL.u1, 39.1, -0.6, 31.2, 5.95, 6.05, COLORS.clear);
  for (let v = 2; v < 31; v += 6) {
    boxUV(S, HALL.u1 + 0.2, HALL.u1 + 0.45, v - 0.12, v + 0.12, 0, 5.95, COLORS.post);
  }
}

function buildSouthAwnings(S, startIdx) {
  // stalls under beige awnings sloping from the south wall toward the canal road
  const pavedStart = S.n;
  // each awning hangs from just under the louvre band (3.8 m) and falls steeply to a valance on posts 8.3 m out
  const { v0, v1, y0, y1 } = SOUTH_AWNING;
  let awningIdx = startIdx;
  for (let u = 1.0; u < 46.5; u += 4.4, awningIdx++) {
    const awningColor = COLORS.awning[awningIdx % COLORS.awning.length];
    const a = u;
    const b = Math.min(u + 4.2, 46.9);
    for (const postU of [a + 0.1, b - 0.1]) {
      boxUV(S, postU - 0.05, postU + 0.05, v1 - 0.2, v1 - 0.1, 0.08, y1, COLORS.post);
    }
    S.quad(world3(a, v0, y0), world3(b, v0, y0), world3(b, v1, y1), world3(a, v1, y1), awningColor, [0, 1, 0.35]);
    S.quad(world3(b, v0, y0 - 0.02), world3(a, v0, y0 - 0.02), world3(a, v1, y1 - 0.02), world3(b, v1, y1 - 0.02), shade(awningColor, 0.6), [0, -1, 0]);
    S.quad(world3(a, v1, y1), world3(b, v1, y1), world3(b, v1, y1 - 0.3), world3(a, v1, y1 - 0.3), shade(awningColor, 0.9), [NORMAL[0], 0, NORMAL[1]]); // valance
    S.quad(world3(b, v1 - 0.01, y1), world3(a, v1 - 0.01, y1), world3(a, v1 - 0.01, y1 - 0.3), world3(b, v1 - 0.01, y1 - 0.3), shade(awningColor, 0.6), [-NORMAL[0], 0, -NORMAL[1]]);
    boxUV(S, a + 0.4, b - 0.4, 34.3, 36.5, 0.08, 0.85, COLORS.table, { top: shade(COLORS.table, 1.2) });
  }
  (S.paved = S.paved || []).push([pavedStart, S.n]); // the stall row: no trees, no houses (src/geo/city.js coverOf)
  S.kind = KIND.PLAIN;
}

function buildNightSignAndLights(group, THREE) {
  const { u0, v0, v1 } = HALL;
  const midV = (HALL_GABLES[1].v0 + HALL_GABLES[1].v1) / 2;
  const signRotY = Math.atan2(-TANGENT[0], -TANGENT[1]);
  const addSignPlane = (material, offset, renderOrder) => {
    const pos = toWorld(u0 - PORCH_DEPTH - 0.1 - offset, midV);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(SIGN_WIDTH, SIGN_HEIGHT), material);
    mesh.position.set(pos[0], BASE_Y + 3.88, pos[1]);
    mesh.rotation.y = signRotY;
    mesh.userData.landmark = 'benngu';
    if (renderOrder) mesh.renderOrder = renderOrder;
    group.add(mesh);
  };
  addSignPlane(new THREE.MeshStandardMaterial({ map: renderSignLetters(THREE, COLORS.signTextDay), transparent: true, alphaTest: 0.4, roughness: 0.6, metalness: 0 }), 0, 0);
  addSignPlane(new THREE.MeshBasicMaterial({ map: renderSignLetters(THREE, COLORS.signTextGlow), transparent: true, depthWrite: false, opacity: 0, toneMapped: false }), 0.03, 19);
  const glowMesh = group.children[group.children.length - 1];

  // warm light in the porch and along the awnings after dark
  const lightBuf = new Buf(120);
  const addStrip = (uStart, vStart, uEnd, vEnd, y) => lightBuf.beam(world3(uStart, vStart, y), world3(uEnd, vEnd, y), 0.12, 0.12, [1, 1, 1]);
  addStrip(u0 - PORCH_DEPTH - 0.1, midV - 1.6, u0 - PORCH_DEPTH - 0.1, midV + 1.6, 3.35);
  addStrip(u0 - 0.3, v0 + 0.4, u0 - 0.3, midV - PORCH_HALF_W - 0.3, 3.0);
  addStrip(u0 - 0.3, midV + PORCH_HALF_W + 0.3, u0 - 0.3, v1 - 0.4, 3.0);
  addStrip(1.2, v1 + 0.3, 46.5, v1 + 0.3, 3.0);
  const lightMesh = new THREE.Mesh(lightBuf.geometry(), lightMaterial(NIGHT_LIGHT_HEX, 1.3));
  lightMesh.renderOrder = 19;
  lightMesh.userData.landmark = 'benngu';
  group.add(lightMesh);
  return { update(time, glow) { glowMesh.material.opacity = Math.min(1, glow); } };
}

export function build({ S, group, THREE }) {
  // ---- ground: the market's paving, front yard to canal road (thin, so the street trees keep their place) ----
  S.kind = KIND.GROUND;
  const paveRing = [toWorld(-12.5, -1.5), toWorld(48, -1.5), toWorld(48, 39.5), toWorld(-14.5, 39.5)];
  S.prism(paveRing, BASE_Y - 0.3, BASE_Y + 0.08, COLORS.plinth, COLORS.pave);

  buildHallSideWalls(S);
  buildHallRoofsAndFront(S);
  const nextAwningIdx = buildPorchAndFrontAwnings(S);
  buildStallSheds(S);
  buildSouthAwnings(S, nextAwningIdx);

  if (!group) return null;
  return buildNightSignAndLights(group, THREE);
}

// the market's name in gold capitals on a clear background (512 x 64)
function renderSignLetters(THREE, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const text = 'CHỢ BẾN NGỰ'.normalize('NFC');
  let fontSize = 44;
  const makeFont = () => `900 ${fontSize}px "Helvetica Neue", Arial, "Segoe UI", Roboto, "Noto Sans", sans-serif`;
  ctx.font = makeFont();
  const textWidth = ctx.measureText(text).width;
  if (textWidth > 470) {
    fontSize *= 470 / textWidth;
    ctx.font = makeFont();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 256, 36);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
