import { KIND, hex, shade } from '../../geo/buf.ts';
import { LAND_Y, POND_Y, PAL } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { fence } from '../enclosure.ts';

// ---- Cung Diên Thọ, the queen mothers' residence in the north-west of the Imperial City ----
//
// Sources (docs/places/dientho.md has the full list):
//  - vi.wikipedia.org/wiki/Cung_Diên_Thọ: precinct 138.5 m x 126.4 m (about 17,500 m²), brick wall over 2 m
//    high with four gates: Thọ Chỉ (front, a two-storey gate, stone-paved, flanked by the side doors Trinh Ứng and
//    Thụy Quang), Diễn Trạch (rear), Địch Tường (west), Thiện Khánh (east); long brick screens inside Thọ Chỉ and
//    inside Diễn Trạch. Main hall 34.7 x 27.5 m, platform 1 thước 4 tấc (about 0.56 m), three stone steps in
//    front, two at the back on each side; a double house (trùng thiềm điệp ốc): front house 7 bays + 2 chái, main
//    house 5 bays + 2 double chái; front verandah 2 m, rear verandah 4.5 m; yellow glazed tiles, a gourd on the
//    ridge. Điện Thọ Ninh about 20 m behind, half the hall's area, 3 bays + 2 chái since 1930. Tạ Trường Du
//    (1849) east of the hall on a pond 28 x 20 m, half the pond's area, facing south: a square pavilion of one bay
//    and four chái on 16 columns, green glazed tiles, glass walls, a cloisonné gourd on the ridge, two rockeries
//    in the pond. Khương Ninh Các / Phước Thọ Am (1830): a two-storey timber hall facing west in its own walled
//    court. Tịnh Minh Lâu (1927, enlarged 1950, restored 2005): a two-storey Western house. Tả Trà: 3 bays + 2
//    chái, rebuilt 2011-2014. Covered corridors with green glazed tiles join the halls.
//  - vinwonders.com (Cung Diên Thọ): Phước Thọ Am has 3 bays and two storeys, a bát tràng brick court with a
//    shallow pond and rockwork; the tạ has a bridge to the south bank.
//  - OpenStreetMap: every outline below (the hall 172763420, Thọ Ninh 172763421, Trường Du Tạ 531031538, the pond
//    695810794, Tịnh Minh Lâu 531031540 and its annex 695810800, Khương Ninh Các 531031542, Tả Trà 617437911,
//    the screens 617991230 / 695810776, the gates Thọ Chỉ 695810806 / Diễn Trạch 695810777, the corridors
//    617991231/32/33, 695810779/99, and the walls 695810801/02/74/75/96/97).

export const id = 'dientho';

// Frame: u across the front (east-north-east), v toward the front (south-south-east, to Thọ Chỉ), metres from
// the middle of the main hall's OSM outline.
const CENTER: [number, number] = [-1436.575, 0.5];
const AXIS_X = 0.80967;
const AXIS_Z = -0.58688;
const FRAME_ANGLE = Math.atan2(AXIS_Z, AXIS_X);
const ARCH_SEGMENTS = 10;

const COLORS = {
  tile: hex('#c9a65f'),
  green: hex('#66695b'),
  ridge: hex('#dccb93'),
  lacquer: PAL.lacquer,
  darkLacquer: hex('#4a1f19'),
  gold: hex('#d9b04a'),
  stone: PAL.stone,
  brick: hex('#8f6b57'),
  wall: hex('#b48a58'),
  dark: hex('#2e211c'),
  cream: hex('#e8d49a'),
  white: hex('#f1ece0'),
  redTile: hex('#8e3f2c'),
  shutter: hex('#4f6f55'),
  glass: hex('#9fb4b8'),
  water: hex('#4f6d5c'),
  rock: hex('#7c776c'),
  oldWall: PAL.brick,
  oldCap: shade(PAL.brick, 0.8),
  darkTile: hex('#6e5f52'),
  greyTile: hex('#6c6861'),
  ochre: hex('#c79a45'),
  ochreOld: hex('#a08a5c'),
  archRed: hex('#94473a'),
  mosaic: hex('#6f86b8'),
  door: hex('#6b2c22'),
  wood: hex('#5a4436'),
  pale: hex('#d9d2c2'),
  frame: hex('#8d8a82'),
  creamMosaic: hex('#e9dfc4'),
  lawn: hex('#7f9a55'),
  upperWindow: hex('#3b3a33'),
  railGreen: hex('#4e7a52'),
  cloisonne: hex('#3d7fb0'),
};

const MOSS_ROOF_OPTS = { glazed: false, ridgeCol: shade(COLORS.green, 0.75) };

const WALLS: [number, number][][] = [
  [[8.3, 71.3], [62.5, 70.7], [62.4, 38.45]], // front, east of Thọ Chỉ, to Thiện Khánh
  [[62.4, 32.95], [62.4, 8.1], [62.0, -27.1], [61.9, -66.3], [1.4, -66.6]], // east, rear to Diễn Trạch
  [[-4.1, -65.8], [-64.1, -66.1], [-64.1, -31.1], [-63.6, -27.6], [-63.4, -20.25]], // rear, west to Địch Tường
  [[-63.3, -14.75], [-63.1, -8.1], [-61.2, 72.3], [-6.2, 71.6]], // west, front to Thọ Chỉ
];
const INNER_WALLS: [number, number][][] = [
  [[-63.6, -27.6], [-48.4, -27.9]], // Khương Ninh Các's court
  [[-48.9, -7.0], [-56.0, -7.7], [-63.1, -8.1]],
  [[58.5, 30.5], [41.7, 31.1]], // the lane from Tả Trà to Thiện Khánh
  [[35.3, 36.1], [35.4, 40.5], [54.5, 40.5]],
];
const CORRIDORS: [number, number, number, number][] = [
  [10.5, 25.8, -36.9, -31.8], [21.2, 26.7, -36.9, -4.6], [18.3, 21.2, -11.8, -4.7],
  [26.7, 45.8, -25.2, -19.5], [40.5, 45.9, -19.5, -17.3],
  [-25.9, -11.4, -36.2, -32.0], [-25.9, -21.2, -36.0, -9.6],
  [-35.3, -32.8, -18.4, -6.6], [-32.8, -25.9, -18.4, -15.4], [-32.8, -18.4, -9.6, -6.6],
  [18.4, 28.3, 9.0, 12.0], [-33.0, -18.4, 9.6, 12.6],
];
const COURT_TREE: [number, number] = [-29.35, -12.5];
const MOON: [number, number][] = [
  [-19.98, 36.36], [-19.98, 43.64], [-16.34, 47.28], [-11.79, 50.92], [-8.14, 52.74], [-4.5, 54.56], [-2.69, 55.47],
  [0.96, 55.47], [4.59, 54.56], [8.23, 53.65], [12.79, 50.92], [15.52, 47.28], [17.34, 44.55], [20.07, 38.18], [20.98, 32.72],
];
const LAWNS: [number, number][][] = [
  [[-19.02, 44.6], [-0.7, 44.6], [-0.7, 55.47], [-2.69, 55.47], [-4.5, 54.56], [-8.14, 52.74], [-11.79, 50.92], [-16.34, 47.28]],
  [[2.7, 44.6], [17.31, 44.6], [15.52, 47.28], [12.79, 50.92], [8.23, 53.65], [4.59, 54.56], [2.7, 55.03]],
];
const TREES: [number, number, number][] = [
  [-40, -59, 3.5], [-30, -60, 3.5], [-20, -59, 3.5], [-12, -56, 3], [-58, -52, 3.5], [36, -62, 3], [58, -62, 3],
  [46, -48, 3.5], [54, -42, 3.5], [50, -37, 3], [-60, -37, 3.5], [-50, -40, 3], [-42, -38, 3], [-9, -27, 2.5],
  [4, -24, 2.5], [-48, -3.5, 3], [58, -8, 2.5], [-56, 8, 3], [-54, 15.5, 3.5], [-56, 23, 3], [-50, 30, 3], [-48, 36, 3],
  [-32, 35, 3.5], [-16, 28, 2.5], [14, 19.5, 2.5], [12, 32, 2.5], [26, 37, 2], [48, 15, 3], [48, 24, 2.5], [-58, 50, 3.5],
  [-18, 52, 3], [-18, 62, 3], [24, 54, 3], [26, 63, 3], [46, 65, 2.5], [-40, 56, 3], [-50, 64, 3], [40, 50, 3],
];
const POND: [number, number][] = [[56.7, -16.2], [56.6, 1.1], [55.1, 2.6], [30.8, 3.0], [29.0, 1.2], [28.6, -16.5], [29.9, -17.4], [55.5, -17.3]];

const OUTER_WALL_STYLE = { h: 2.5, plinth: 2.5, rail: false, t: 0.55, every: 8.0, postW: 0.55, postUp: 0, wall: COLORS.oldWall, cap: COLORS.oldCap, iron: null, pierW: 0.8, pierUp: 0.3 };
const INNER_WALL_STYLE = { ...OUTER_WALL_STYLE, h: 2.2, plinth: 2.2, t: 0.45, postW: 0.45 };

const groundY = (x: number, z: number) => LAND_Y + rise(x, z);
const toWorld = (uPos: number, vPos: number): [number, number] => [
  CENTER[0] + uPos * AXIS_X - vPos * AXIS_Z,
  CENTER[1] + uPos * AXIS_Z + vPos * AXIS_X,
];
const toLocal = ([x, z]: [number, number]): [number, number] => {
  const dx = x - CENTER[0];
  const dz = z - CENTER[1];
  return [dx * AXIS_X + dz * AXIS_Z, -dx * AXIS_Z + dz * AXIS_X];
};

// every mapped outline inside the precinct wall (halls, screens, gates, corridors) is drawn here
export function ownsMapped(ring: [number, number][]) {
  return ring.every((pt) => {
    const [uPos, vPos] = toLocal(pt);
    return uPos > -65 && uPos < 64 && vPos > -68 && vPos < 74;
  });
}

function makeFrameHelpers(S) {
  const defaultHip = { flare: 0.45, fascia: 0.25, fasciaCol: shade(COLORS.lacquer, 0.7), hips: true, glazed: true, segs: 3, ridgeCol: COLORS.ridge };
  const box = (uPos: number, vPos: number, y0: number, y1: number, width: number, depth: number, col: number[], opts?) => {
    const pt = toWorld(uPos, vPos);
    S.box(pt[0], pt[1], y0, y1, width, depth, FRAME_ANGLE, col, opts);
  };
  const boxRot = (uPos: number, vPos: number, y0: number, y1: number, width: number, depth: number, col: number[], opts?) => {
    const pt = toWorld(uPos, vPos);
    S.box(pt[0], pt[1], y0, y1, width, depth, FRAME_ANGLE + Math.PI / 2, col, opts);
  };
  const hip = (uPos: number, vPos: number, width: number, depth: number, y0: number, height: number, col: number[], opts?) => {
    const pt = toWorld(uPos, vPos);
    S.hip(pt[0], pt[1], width, depth, FRAME_ANGLE, y0, height, col, { ...defaultHip, ...opts });
  };
  const hipRot = (uPos: number, vPos: number, width: number, depth: number, y0: number, height: number, col: number[], opts?) => {
    const pt = toWorld(uPos, vPos);
    S.hip(pt[0], pt[1], width, depth, FRAME_ANGLE + Math.PI / 2, y0, height, col, { ...defaultHip, ...opts });
  };
  const cyl = (uPos: number, vPos: number, y0: number, y1: number, r0: number, r1: number, segs: number, col: number[], opts?) => {
    const pt = toWorld(uPos, vPos);
    S.cyl(pt[0], pt[1], y0, y1, r0, r1, segs, col, { rot: FRAME_ANGLE, ...opts });
  };
  const column = (uPos: number, vPos: number, y0: number, y1: number, radius = 0.2) => {
    S.kind = KIND.TIMBER;
    cyl(uPos, vPos, y0, y1, radius, radius * 0.92, 6, COLORS.lacquer, { cap: false });
  };
  return { box, boxRot, hip, hipRot, cyl, column };
}

type FrameHelpers = ReturnType<typeof makeFrameHelpers>;

function makeGateFrame(S, u0: number, v0: number, rotated = false) {
  const origin = toWorld(u0, v0);
  const acrossDir = rotated ? [-AXIS_Z, AXIS_X] : [AXIS_X, AXIS_Z];
  const thruDir = rotated ? [AXIS_X, AXIS_Z] : [-AXIS_Z, AXIS_X];
  const angle = Math.atan2(acrossDir[1], acrossDir[0]);
  const pt3 = (across: number, thru: number, y = 0): [number, number, number] => [
    origin[0] + across * acrossDir[0] + thru * thruDir[0],
    y,
    origin[1] + across * acrossDir[1] + thru * thruDir[1],
  ];
  const normal3 = (ns: number, nt: number, ny = 0): [number, number, number] => [
    ns * acrossDir[0] + nt * thruDir[0],
    ny,
    ns * acrossDir[1] + nt * thruDir[1],
  ];
  const box = (across: number, thru: number, y0: number, y1: number, width: number, depth: number, col: number[], opts?) => {
    const pt = pt3(across, thru, 0);
    S.box(pt[0], pt[2], y0, y1, width, depth, angle, col, opts);
  };
  const hip = (across: number, thru: number, width: number, depth: number, y0: number, height: number, col: number[], opts?) => {
    const pt = pt3(across, thru, 0);
    S.hip(pt[0], pt[2], width, depth, angle, y0, height, col, opts);
  };
  return { pt3, normal3, box, hip };
}

type GateFrame = ReturnType<typeof makeGateFrame>;

// a round-headed passage through masonry: vault, spandrels, arch band, reveals and stone paving
function drawPassage(S, gateFrame: GateFrame, centerS: number, width: number, yBase: number, yCrown: number, depth: number, fieldCol: number[], bandCol: number[]) {
  const radius = width / 2;
  const springY = yCrown - radius;
  const halfD = depth / 2;
  const bandW = 0.16;
  const fieldW = 0.3;
  const arc: [number, number, number][] = [];
  for (let k = 0; k <= ARCH_SEGMENTS; k++) {
    const angle = (Math.PI * k) / ARCH_SEGMENTS;
    arc.push([Math.cos(angle), Math.sin(angle), angle]);
  }
  S.kind = KIND.PLAIN;
  for (let k = 0; k < ARCH_SEGMENTS; k++) {
    const [c1, n1, a1] = arc[k];
    const [c2, n2, a2] = arc[k + 1];
    const midAngle = (a1 + a2) / 2;
    const innerR = radius - 0.01;
    const s1 = centerS + innerR * c1;
    const s2 = centerS + innerR * c2;
    const y1 = springY + innerR * n1;
    const y2 = springY + innerR * n2;
    S.quad(gateFrame.pt3(s1, -halfD, y1), gateFrame.pt3(s2, -halfD, y2), gateFrame.pt3(s2, halfD, y2), gateFrame.pt3(s1, halfD, y1), COLORS.dark, gateFrame.normal3(-Math.cos(midAngle), 0, -Math.sin(midAngle)));
    for (const face of [-1, 1]) {
      const faceT = face * halfD;
      const bandT = face * (halfD + 0.04);
      const outerR = radius + bandW;
      S.quad(gateFrame.pt3(s1, faceT, y1), gateFrame.pt3(s2, faceT, y2), gateFrame.pt3(s2, faceT, yCrown + 0.02), gateFrame.pt3(s1, faceT, yCrown + 0.02), fieldCol, gateFrame.normal3(0, face, 0));
      S.quad(gateFrame.pt3(centerS + radius * c1, bandT, springY + radius * n1), gateFrame.pt3(centerS + radius * c2, bandT, springY + radius * n2), gateFrame.pt3(centerS + outerR * c2, bandT, springY + outerR * n2), gateFrame.pt3(centerS + outerR * c1, bandT, springY + outerR * n1), bandCol, gateFrame.normal3(0, face, 0));
    }
  }
  for (const side of [-1, 1]) {
    const revealS = centerS + side * (radius - 0.01);
    S.quad(gateFrame.pt3(revealS, -halfD, yBase), gateFrame.pt3(revealS, halfD, yBase), gateFrame.pt3(revealS, halfD, springY), gateFrame.pt3(revealS, -halfD, springY), shade(COLORS.dark, 1.4), gateFrame.normal3(-side, 0, 0));
    for (const face of [-1, 1]) {
      gateFrame.box(centerS + side * (radius + bandW / 2), face * (halfD + 0.025), yBase, springY, bandW, 0.05, bandCol);
      gateFrame.box(centerS + side * (radius + bandW + fieldW / 2), face * (halfD + 0.015), yBase, yCrown + bandW + fieldW, fieldW, 0.03, fieldCol);
    }
  }
  for (const face of [-1, 1]) gateFrame.box(centerS, face * (halfD + 0.015), yCrown + bandW, yCrown + bandW + fieldW, width + 2 * bandW, 0.03, fieldCol);
  S.kind = KIND.ROAD;
  const floorY = yBase + 0.02;
  S.quad(gateFrame.pt3(centerS - radius, -halfD, floorY), gateFrame.pt3(centerS + radius, -halfD, floorY), gateFrame.pt3(centerS + radius, halfD, floorY), gateFrame.pt3(centerS - radius, halfD, floorY), shade(COLORS.stone, 1.05), [0, 1, 0]);
  S.kind = KIND.PLAIN;
}

// timber leaves folded back against the reveals, on the inner side
function drawFoldedLeaves(S, gateFrame: GateFrame, centerS: number, radius: number, yBase: number, springY: number, innerSign: number, halfD: number) {
  const leafLen = Math.min(radius, halfD - 0.05);
  S.kind = KIND.PLAIN;
  for (const side of [-1, 1]) {
    gateFrame.box(centerS + side * (radius - 0.06), (innerSign * leafLen) / 2, yBase + 0.03, springY + 0.25, 0.08, leafLen, COLORS.door);
    gateFrame.box(centerS + side * (radius - 0.11), (innerSign * leafLen) / 2, yBase + 0.9, yBase + 1.0, 0.03, leafLen - 0.15, shade(COLORS.door, 0.7));
  }
}

// a closed pair of panelled leaves filling an arched opening
function drawClosedDoors(S, gateFrame: GateFrame, centerS: number, radius: number, yBase: number, springY: number) {
  S.kind = KIND.PLAIN;
  gateFrame.box(centerS, 0, yBase + 0.03, springY, 2 * radius - 0.04, 0.1, COLORS.door);
  for (const face of [-1, 1]) {
    const faceT = face * 0.05;
    for (let k = 0; k < ARCH_SEGMENTS; k++) {
      const a1 = (Math.PI * k) / ARCH_SEGMENTS;
      const a2 = (Math.PI * (k + 1)) / ARCH_SEGMENTS;
      const fanR = radius - 0.03;
      S.tri(gateFrame.pt3(centerS, faceT, springY), gateFrame.pt3(centerS + fanR * Math.cos(a1), faceT, springY + fanR * Math.sin(a1)), gateFrame.pt3(centerS + fanR * Math.cos(a2), faceT, springY + fanR * Math.sin(a2)), COLORS.door, gateFrame.normal3(0, face, 0));
    }
  }
  const darkDoor = shade(COLORS.door, 0.7);
  gateFrame.box(centerS, 0, yBase + 0.1, springY - 0.05, 0.05, 0.14, darkDoor);
  for (const railY of [yBase + 0.5, yBase + 1.1, springY - 0.12]) gateFrame.box(centerS, 0, railY, railY + 0.07, 2 * radius - 0.12, 0.14, darkDoor);
}

// Diên Thọ chính điện (double house), Điện Thọ Ninh, and Tả Trà
function buildPrimaryHalls(S, helpers: FrameHelpers, baseY: number) {
  const { box, boxRot, hip, hipRot, cyl, column } = helpers;

  // courts: bát tràng brick and stone axial ways
  S.kind = KIND.MASONRY;
  box(0, 27.6, baseY - 0.25, baseY + 0.08, 46, 28, COLORS.brick, { topKind: KIND.ROAD });
  box(-0.4, -22.6, baseY - 0.25, baseY + 0.08, 34, 18.5, shade(COLORS.brick, 0.95), { topKind: KIND.ROAD });
  box(1.0, 57.1, baseY - 0.25, baseY + 0.1, 3.2, 25.5, shade(COLORS.stone, 1.05), { topKind: KIND.ROAD });
  box(0, 27.6, baseY - 0.25, baseY + 0.12, 3.2, 28, shade(COLORS.stone, 1.05), { topKind: KIND.ROAD });

  // Diên Thọ chính điện: double house on a 0.56 m platform
  const plinthH = 0.56;
  const plinthY = baseY + plinthH;
  S.kind = KIND.MASONRY;
  box(0, 0, baseY - 0.3, plinthY, 37.4, 27.4, COLORS.stone, { taper: 0.99, topKind: KIND.ROAD });
  for (let k = 1; k <= 3; k++) box(0, 13.7 + 0.32 * (k - 0.5), baseY - 0.25, plinthY - (plinthH / 3) * k, 7.0, 0.32, shade(COLORS.stone, 1.05), { topKind: KIND.ROAD });
  for (const side of [-1, 1]) {
    for (let k = 1; k <= 2; k++) box(side * 11, -13.7 - 0.32 * (k - 0.5), baseY - 0.25, plinthY - (plinthH / 2) * k, 4.0, 0.32, shade(COLORS.stone, 1.05), { topKind: KIND.ROAD });
  }
  S.kind = KIND.TIMBER;
  box(0, -3.3, plinthY, plinthY + 3.8, 31.0, 10.0, COLORS.darkLacquer, { top: shade(COLORS.tile, 0.8) });
  hip(0, -5.4, 33.8, 14.2, plinthY + 3.8, 4.2, COLORS.tile, { over: 1.5, flare: 0.5, segs: 4 });
  box(0, 6.8, plinthY, plinthY + 3.3, 31.0, 7.6, COLORS.darkLacquer, { top: shade(COLORS.tile, 0.8) });
  hip(0, 7.0, 33.8, 9.6, plinthY + 3.3, 3.3, COLORS.tile, { over: 1.5, flare: 0.5 });
  for (let i = 0; i <= 9; i++) {
    const colU = -16.6 + i * (33.2 / 9);
    column(colU, 11.6, plinthY, plinthY + 3.35, 0.22);
    column(colU, -12.0, plinthY, plinthY + 3.85, 0.24);
  }
  S.kind = KIND.PLAIN;
  const baySpan = 33.2 / 9;
  for (let i = -3; i <= 3; i++) {
    box(i * baySpan, 10.62, plinthY, plinthY + 2.45, baySpan - 0.55, 0.08, shade(COLORS.darkLacquer, 0.75));
    box(i * baySpan, 10.63, plinthY + 2.55, plinthY + 3.0, baySpan - 0.4, 0.08, COLORS.gold);
  }
  box(0, 11.0, plinthY + 3.1, plinthY + 3.3, 33.4, 1.2, shade(COLORS.lacquer, 0.45), { bottom: true });
  const ridgeY = plinthY + 3.8 + 4.2;
  cyl(0, -5.4, ridgeY - 0.1, ridgeY + 0.35, 0.42, 0.42, 8, COLORS.gold);
  cyl(0, -5.4, ridgeY + 0.35, ridgeY + 0.85, 0.3, 0.1, 8, COLORS.gold);
  for (const side of [-1, 1]) cyl(side * 9.6, -5.4, ridgeY - 0.1, ridgeY + 0.6, 0.28, 0.12, 6, COLORS.ridge);

  // Điện Thọ Ninh
  const tnU = -0.45, tnV = -39.55, tnY = baseY + 0.56;
  S.kind = KIND.MASONRY;
  box(tnU, tnV, baseY - 0.3, tnY, 21.9, 15.5, COLORS.stone, { taper: 0.99, topKind: KIND.ROAD });
  for (let k = 1; k <= 3; k++) box(tnU, 7.75 + tnV + 0.32 * (k - 0.5), baseY - 0.25, tnY - (0.56 / 3) * k, 5.0, 0.32, shade(COLORS.stone, 1.05), { topKind: KIND.ROAD });
  S.kind = KIND.TIMBER;
  box(tnU, tnV - 0.8, tnY, tnY + 3.4, 17.6, 10.0, COLORS.darkLacquer, { top: shade(COLORS.tile, 0.8) });
  hip(tnU, tnV, 19.4, 13.0, tnY + 3.4, 3.4, COLORS.tile, { over: 1.2 });
  for (let i = 0; i <= 5; i++) column(tnU - 9.5 + i * 3.8, tnV + 6.3, tnY, tnY + 3.45, 0.2);
  S.kind = KIND.PLAIN;
  for (let i = -2; i <= 2; i++) {
    box(tnU + i * 3.4, tnV + 4.22, tnY, tnY + 2.4, 2.8, 0.08, shade(COLORS.darkLacquer, 0.75));
    box(tnU + i * 3.4, tnV + 4.23, tnY + 2.5, tnY + 2.9, 3.0, 0.08, COLORS.gold);
  }
  cyl(tnU, tnV, tnY + 6.75, tnY + 7.35, 0.3, 0.1, 8, COLORS.gold);

  // Tả Trà
  const ttU = 35.0, ttV = 20.45, ttY = baseY + 0.45;
  S.kind = KIND.MASONRY;
  box(ttU, ttV, baseY - 0.3, ttY, 13.4, 25.9, COLORS.stone, { taper: 0.99, topKind: KIND.ROAD });
  for (let k = 1; k <= 3; k++) boxRot(ttU - 6.7 - 0.32 * (k - 0.5), ttV, baseY - 0.25, ttY - 0.15 * k, 4.5, 0.32, shade(COLORS.stone, 1.05), { topKind: KIND.ROAD });
  S.kind = KIND.TIMBER;
  box(ttU + 0.9, ttV, ttY, ttY + 3.3, 9.6, 22.4, COLORS.darkLacquer, { top: shade(COLORS.darkTile, 0.8) });
  hipRot(ttU, ttV, 22.4, 11.2, ttY + 3.3, 3.3, COLORS.darkTile, { over: 1.2, glazed: false, ridgeCol: shade(COLORS.darkTile, 0.8) });
  for (let i = 0; i <= 7; i++) column(ttU - 5.4, ttV - 11.0 + i * (22 / 7), ttY, ttY + 3.35, 0.19);
  S.kind = KIND.PLAIN;
  for (let i = -2; i <= 2; i++) {
    boxRot(ttU - 3.92, ttV + i * 3.1, ttY, ttY + 2.4, 2.6, 0.08, shade(COLORS.darkLacquer, 0.75));
    boxRot(ttU - 3.93, ttV + i * 3.1, ttY + 2.5, ttY + 2.9, 2.8, 0.08, COLORS.gold);
  }
}

// Tịnh Minh Lâu (1927 Western house + 1950 wing) and Khương Ninh Các (Phước Thọ Am)
function buildWestPavilions(S, helpers: FrameHelpers, baseY: number) {
  const { box, boxRot, hip, hipRot, cyl } = helpers;

  // Tịnh Minh Lâu
  const tmU = -34.9, tmV = 22.2;
  const tmBase = baseY + 0.6;
  const tmFloor1 = tmBase + 3.9;
  const tmFloor2 = tmFloor1 + 3.7;
  S.kind = KIND.MASONRY;
  box(tmU, tmV, baseY - 0.3, tmBase, 16.4, 15.4, shade(COLORS.stone, 0.95), { topKind: KIND.ROAD });
  box(tmU, tmV, baseY - 0.3, tmBase, 20.0, 5.4, shade(COLORS.stone, 0.95), { topKind: KIND.ROAD });
  S.kind = KIND.COLONIAL;
  box(tmU, tmV, tmBase, tmFloor2, 15.4, 14.6, COLORS.cream, { top: shade(COLORS.cream, 0.8) });
  for (const side of [-1, 1]) box(tmU + side * 8.6, tmV, tmBase, tmFloor2 + 0.6, 1.8, 5.4, COLORS.cream, { top: COLORS.white });
  S.kind = KIND.PLAIN;
  for (const bandY of [tmFloor1, tmFloor2]) box(tmU, tmV, bandY - 0.18, bandY + 0.12, 15.7, 14.9, COLORS.white);
  for (const side of [-1, 1]) {
    box(tmU + side * 8.6, tmV, tmFloor1 - 0.18, tmFloor1 + 0.12, 2.1, 5.7, COLORS.white);
    box(tmU + side * 8.6, tmV, tmFloor2 + 0.45, tmFloor2 + 0.75, 2.1, 5.7, COLORS.white);
    boxRot(tmU + side * 9.52, tmV, tmBase, tmBase + 2.7, 1.6, 0.06, COLORS.dark);
    boxRot(tmU + side * 9.52, tmV, tmFloor1 + 0.5, tmFloor1 + 2.6, 1.4, 0.06, COLORS.dark);
    for (const k of [-1, 1]) boxRot(tmU + side * 9.53, tmV + k * 1.15, tmFloor1 + 0.5, tmFloor1 + 2.6, 0.5, 0.05, COLORS.shutter);
  }
  S.hip(...toWorld(tmU, tmV), 15.4, 14.6, FRAME_ANGLE, tmFloor2 + 0.1, 2.6, COLORS.redTile, { over: 0.7, fascia: 0.18, fasciaCol: COLORS.white });
  S.kind = KIND.COLONIAL;
  box(-41.0, 10.8, baseY, tmBase + 3.6, 15.8, 8.2, COLORS.cream, { top: shade(COLORS.cream, 0.8) });
  S.kind = KIND.PLAIN;
  box(-41.0, 10.8, tmBase + 3.4, tmBase + 3.75, 16.1, 8.5, COLORS.white);
  S.hip(...toWorld(-41.0, 10.8), 15.8, 8.2, FRAME_ANGLE, tmBase + 3.7, 1.6, COLORS.redTile, { over: 0.6 });

  // Khương Ninh Các (Phước Thọ Am)
  const knU = -42.1, knV = -16.15, knY = baseY + 0.6;
  S.kind = KIND.MASONRY;
  box(knU, knV, baseY - 0.3, knY, 13.6, 18.7, COLORS.stone, { taper: 0.99, topKind: KIND.ROAD });
  for (let k = 1; k <= 3; k++) boxRot(knU - 6.8 - 0.32 * (k - 0.5), knV, baseY - 0.25, knY - 0.2 * k, 4.0, 0.32, shade(COLORS.stone, 1.05), { topKind: KIND.ROAD });
  S.kind = KIND.TIMBER;
  const greyRoofOpts = { glazed: false, ridgeCol: shade(COLORS.greyTile, 0.6), horns: false };
  const groundTopY = knY + 3.0;
  const upperFloorY = knY + 3.5;
  const roofBaseY = knY + 6.4;
  const frontU = knU - 4.6;
  box(knU + 0.6, knV, knY, groundTopY, 10.4, 15.2, COLORS.wood, { top: shade(COLORS.greyTile, 0.8) });
  hipRot(knU + 0.6, knV, 15.2, 10.4, groundTopY, 0.9, COLORS.greyTile, { over: 1.5, flare: 0, hips: false, fascia: 0.12, fasciaCol: shade(COLORS.wood, 0.6), ...greyRoofOpts });
  boxRot(frontU + 0.55, knV, groundTopY - 0.1, upperFloorY, 15.2, 1.3, shade(COLORS.wood, 0.7), { top: shade(COLORS.wood, 0.85) });
  box(knU + 1.2, knV, upperFloorY, roofBaseY, 9.2, 15.2, shade(COLORS.lacquer, 0.72), { top: shade(COLORS.greyTile, 0.8) });
  hipRot(knU + 1.2, knV, 15.2, 9.2, roofBaseY, 2.3, COLORS.greyTile, { over: 1.2, flare: 0, hips: false, fascia: 0.14, fasciaCol: shade(COLORS.wood, 0.6), ...greyRoofOpts });

  S.kind = KIND.PLAIN;
  boxRot(knU - 3.42, knV, knY + 4.5, knY + 6.0, 13.0, 0.08, COLORS.upperWindow);
  for (let k = -3; k <= 3; k++) boxRot(knU - 3.45, knV + k * 2.2, knY + 4.4, knY + 6.1, 0.18, 0.08, shade(COLORS.lacquer, 0.8));
  for (let k = -10; k <= 10; k++) boxRot(knU - 3.47, knV + k * 0.62, knY + 4.5, knY + 6.0, 0.05, 0.05, COLORS.cream);
  boxRot(knU - 3.47, knV, knY + 5.25, knY + 5.3, 13.0, 0.05, COLORS.cream);

  const railRed = shade(COLORS.lacquer, 0.7);
  boxRot(frontU, knV, upperFloorY, upperFloorY + 0.1, 15.2, 0.1, railRed);
  boxRot(frontU, knV, upperFloorY + 0.85, upperFloorY + 0.95, 15.3, 0.14, COLORS.railGreen);
  for (let k = -23; k <= 23; k++) boxRot(frontU, knV + k * 0.32, upperFloorY + 0.1, upperFloorY + 0.85, 0.05, 0.05, k % 4 ? railRed : COLORS.railGreen);
  for (let k = -3; k <= 3; k++) boxRot(frontU, knV + k * 2.5, upperFloorY, upperFloorY + 1.0, 0.14, 0.14, railRed);
  for (let k = -18; k <= 18; k++) boxRot(frontU - 1.1, knV + k * 0.42, groundTopY - 0.16, groundTopY - 0.03, 0.1, 0.45, COLORS.pale);

  for (let i = -2; i <= 2; i++) {
    boxRot(knU - 4.62, knV + i * 2.95, knY, knY + 2.8, 2.6, 0.08, shade(COLORS.wood, 0.85));
    boxRot(knU - 4.66, knV + i * 2.95, knY + 2.15, knY + 2.75, 2.5, 0.06, shade(COLORS.wood, 0.55));
    for (let k = -3; k <= 3; k++) boxRot(knU - 4.68, knV + i * 2.95 + k * 0.37, knY + 0.1, knY + 2.1, 0.05, 0.05, shade(COLORS.wood, 0.5));
    boxRot(knU - 4.66, knV + i * 2.95, knY + 0.1, knY + 0.55, 2.5, 0.06, shade(COLORS.wood, 0.7));
  }
  for (let i = -3; i <= 3; i++) boxRot(knU - 4.64, knV + i * 2.18, knY, groundTopY, 0.3, 0.14, shade(COLORS.wood, 0.6));
  cyl(knU + 1.2, knV, roofBaseY + 2.2, roofBaseY + 2.75, 0.28, 0.1, 8, COLORS.gold);

  // back hall and brick court with shallow pond, rockery and two kiosks
  S.kind = KIND.TIMBER;
  box(-31.2, -30.55, baseY, baseY + 3.0, 9.0, 8.8, COLORS.darkLacquer, { top: shade(COLORS.greyTile, 0.8) });
  hip(-31.2, -30.55, 9.0, 8.8, baseY + 3.0, 2.2, COLORS.greyTile, { over: 0.9, glazed: false, ridgeCol: shade(COLORS.greyTile, 0.6) });
  S.kind = KIND.MASONRY;
  box(-56.1, -17.6, baseY - 0.25, baseY + 0.06, 14.0, 19.0, COLORS.brick, { topKind: KIND.ROAD });
  box(-55.5, -17.6, baseY - 0.2, baseY + 0.35, 4.0, 6.0, COLORS.stone);
  S.kind = KIND.PLAIN;
  box(-55.5, -17.6, baseY + 0.35, baseY + 0.37, 3.4, 5.4, COLORS.water);
  S.kind = KIND.MASONRY;
  cyl(-55.5, -17.6, baseY + 0.3, baseY + 1.6, 0.8, 0.3, 6, COLORS.rock);
  for (const kioskV of [-9.4, -25.95]) {
    box(-57.8, kioskV, baseY, baseY + 2.4, 3.7, 2.4, COLORS.pale, { top: COLORS.greyTile });
    hip(-57.8, kioskV, 3.7, 2.4, baseY + 2.4, 0.9, COLORS.greyTile, { over: 0.4, segs: 2, flare: 0, ...greyRoofOpts });
  }
}

// Tạ Trường Du water pavilion, pond kerb, Lương Phong porch, south bridge, and rockeries
function buildTruongDuTa(S, helpers: FrameHelpers, baseY: number) {
  const { box, hip, cyl, column } = helpers;
  const u0 = 42.15, v0 = -12.55, deckY = baseY + 0.4;

  S.kind = KIND.MASONRY;
  for (let i = 0; i < POND.length; i++) {
    const ptA = POND[i];
    const ptB = POND[(i + 1) % POND.length];
    const len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
    const mid = toWorld((ptA[0] + ptB[0]) / 2, (ptA[1] + ptB[1]) / 2);
    S.box(mid[0], mid[1], POND_Y - 0.2, baseY + 0.22, len + 0.4, 0.45, FRAME_ANGLE + Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]), COLORS.stone);
  }
  box(u0, v0 + 1.6, POND_Y - 0.3, deckY, 10.4, 13.6, COLORS.stone, { topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;
  for (const side of [-1, 1]) {
    box(u0 + side * 5.0, v0 + 1.6, deckY, deckY + 0.7, 0.14, 13.4, shade(COLORS.lacquer, 0.8));
    box(u0, v0 + 1.6 + side * 6.6, deckY, deckY + 0.7, 10.0, 0.14, shade(COLORS.lacquer, 0.8));
  }
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const du = -4.3 + i * (8.6 / 3);
      const dv = -4.3 + j * (8.6 / 3);
      const isInner = i > 0 && i < 3 && j > 0 && j < 3;
      column(u0 + du, v0 + dv, deckY, deckY + (isInner ? 4.05 : 2.85), 0.17);
    }
  }
  S.kind = KIND.PLAIN;
  box(u0, v0, deckY + 0.1, deckY + 2.6, 7.4, 7.4, COLORS.glass, { top: shade(COLORS.lacquer, 0.5) });
  for (let k = -1; k <= 1; k++) {
    box(u0 + k * 2.4, v0, deckY + 0.1, deckY + 2.6, 0.12, 7.5, COLORS.darkLacquer);
    box(u0, v0 + k * 2.4, deckY + 0.1, deckY + 2.6, 7.5, 0.12, COLORS.darkLacquer);
  }
  S.kind = KIND.TIMBER;
  hip(u0, v0, 8.6, 8.6, deckY + 2.85, 1.0, COLORS.green, { over: 0.9, flare: 0.3, ...MOSS_ROOF_OPTS });
  box(u0, v0, deckY + 3.1, deckY + 4.05, 3.4, 3.4, COLORS.glass, { top: shade(COLORS.green, 0.8) });
  hip(u0, v0, 3.4, 3.4, deckY + 4.05, 1.7, COLORS.green, { over: 0.8, ...MOSS_ROOF_OPTS });
  cyl(u0, v0, deckY + 5.7, deckY + 6.3, 0.22, 0.08, 8, COLORS.cloisonne);

  for (const side of [-1, 1]) column(u0 + side * 2.6, v0 + 7.8, deckY, deckY + 2.5, 0.15);
  hip(u0, v0 + 6.4, 6.0, 3.2, deckY + 2.5, 1.0, COLORS.green, { over: 0.6, segs: 2, ...MOSS_ROOF_OPTS });

  S.kind = KIND.MASONRY;
  const bridgeMidV = (v0 + 8.2 + 3.4) / 2;
  const bridgeLen = 3.4 - (v0 + 8.2);
  box(u0, bridgeMidV, POND_Y - 0.3, deckY - 0.05, 2.2, bridgeLen + 0.4, COLORS.stone, { topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;
  for (const side of [-1, 1]) box(u0 + side * 1.05, bridgeMidV, deckY - 0.05, deckY + 0.55, 0.12, bridgeLen, shade(COLORS.stone, 0.85));

  S.kind = KIND.MASONRY;
  for (const [rockU, rockV] of [[33.0, -4.0], [51.5, -4.5]] as [number, number][]) {
    box(rockU, rockV, POND_Y - 0.3, POND_Y + 0.5, 3.2, 2.4, shade(COLORS.rock, 0.9));
    cyl(rockU - 0.5, rockV, POND_Y + 0.4, baseY + 1.5, 1.1, 0.35, 6, COLORS.rock);
    cyl(rockU + 0.8, rockV + 0.3, POND_Y + 0.4, baseY + 0.9, 0.8, 0.3, 5, shade(COLORS.rock, 1.1));
    S.kind = KIND.PLAIN;
    box(rockU + 0.3, rockV - 0.6, baseY + 0.5, baseY + 0.8, 0.35, 0.35, COLORS.wall, { top: COLORS.tile });
    S.kind = KIND.MASONRY;
  }
}

// covered corridors and brick screens (Tiền Bình Phong, Hậu Bình Phong)
function buildCorridorsAndScreens(S, helpers: FrameHelpers, baseY: number) {
  const { box, hip, column } = helpers;
  for (const [u0, u1, v0, v1] of CORRIDORS) {
    const midU = (u0 + u1) / 2;
    const midV = (v0 + v1) / 2;
    const width = u1 - u0;
    const depth = v1 - v0;
    const alongU = width >= depth;
    S.kind = KIND.MASONRY;
    box(midU, midV, baseY - 0.25, baseY + 0.3, width, depth, COLORS.stone, { topKind: KIND.ROAD });
    const spanLen = alongU ? width : depth;
    const bayCount = Math.max(1, Math.round(spanLen / 3.2));
    for (let i = 0; i <= bayCount; i++) {
      const along = -spanLen / 2 + 0.3 + (i * (spanLen - 0.6)) / bayCount;
      for (const side of [-1, 1]) {
        const across = side * ((alongU ? depth : width) / 2 - 0.4);
        if (alongU) column(midU + along, midV + across, baseY + 0.3, baseY + 2.9, 0.13);
        else column(midU + across, midV + along, baseY + 0.3, baseY + 2.9, 0.13);
      }
    }
    hip(midU, midV, Math.max(0.5, width - 0.4), Math.max(0.5, depth - 0.4), baseY + 2.9, 1.2, COLORS.green, { over: 0.55, flare: 0.25, segs: 2, hips: false, horns: false, ...MOSS_ROOF_OPTS });
  }
  S.kind = KIND.MASONRY;
  box(COURT_TREE[0], COURT_TREE[1], baseY - 0.2, baseY + 0.05, 6.9, 5.8, COLORS.brick, { topKind: KIND.ROAD });

  for (const [u0, v0, width, height] of [[0.55, 43.15, 21.7, 2.7], [-1.35, -62.35, 5.9, 2.4]] as [number, number, number, number][]) {
    S.kind = KIND.MASONRY;
    box(u0, v0, baseY - 0.2, baseY + 0.35, width + 0.6, 1.6, COLORS.stone);
    box(u0, v0, baseY + 0.35, baseY + height, width, 0.7, COLORS.wall, { top: COLORS.tile });
    S.kind = KIND.TILE;
    box(u0, v0, baseY + height, baseY + height + 0.3, width + 0.3, 1.0, COLORS.tile, { taper: 0.5 });
    S.kind = KIND.PLAIN;
    box(u0, v0, baseY + 0.9, baseY + height - 0.4, Math.min(width * 0.3, 4.0), 0.76, shade(COLORS.wall, 0.82));
  }
}

// Thọ Chỉ Môn (front two-storey gate) and the three smaller gates (Diễn Trạch, Thiện Khánh, Địch Tường)
function buildGates(S, baseY: number) {
  // Thọ Chỉ Môn
  const gateBaseY = baseY + 0.2;
  const wallH = 4.3;
  const gateDepth = 3.4;
  const halfD = gateDepth / 2;
  const gateFrame = makeGateFrame(S, 1.05, 71.5, false);
  const tileTop = { top: shade(COLORS.tile, 0.8) };
  const openings: [number, number, number][] = [[0, 2.4, 3.4], [-5.0, 1.9, 2.9], [5.0, 1.9, 2.9]];
  const piers: [number, number][] = [[-6.625, 1.35], [-2.625, 2.85], [2.625, 2.85], [6.625, 1.35]];

  S.kind = KIND.MASONRY;
  gateFrame.box(0, 0, baseY - 0.3, gateBaseY, 15.3, 4.4, COLORS.stone, { topKind: KIND.ROAD });
  for (const [pierS, pierW] of piers) {
    gateFrame.box(pierS, 0, gateBaseY, gateBaseY + wallH, pierW, gateDepth, COLORS.ochre, tileTop);
    gateFrame.box(pierS, 0, baseY, gateBaseY + 0.5, pierW, gateDepth + 0.3, shade(COLORS.stone, 1.05));
  }
  for (const [openS, openW, crownH] of openings) gateFrame.box(openS, 0, gateBaseY + crownH, gateBaseY + wallH, openW, gateDepth, COLORS.ochre, tileTop);
  gateFrame.box(0, 0, gateBaseY + 3.6, gateBaseY + 3.78, 14.9, gateDepth + 0.2, shade(COLORS.stone, 1.1));
  for (const [openS, openW, crownH] of openings) drawPassage(S, gateFrame, openS, openW, gateBaseY, gateBaseY + crownH, gateDepth, COLORS.archRed, shade(COLORS.stone, 1.15));
  drawFoldedLeaves(S, gateFrame, 0, 1.2, gateBaseY, gateBaseY + 2.2, -1, halfD);
  for (const side of [-1, 1]) drawClosedDoors(S, gateFrame, side * 5.0, 0.95, gateBaseY, gateBaseY + 1.95);

  S.kind = KIND.PLAIN;
  for (const face of [-1, 1]) {
    const t1 = face * (halfD + 0.015);
    const t2 = face * (halfD + 0.03);
    const t3 = face * (halfD + 0.045);
    for (const [pierS, pierW] of piers) {
      const isWide = pierW > 2;
      const frameW = isWide ? 1.7 : 0.74;
      const innerW = isWide ? 1.44 : 0.56;
      gateFrame.box(pierS, t1, gateBaseY + 0.95, gateBaseY + 3.3, frameW, 0.03, COLORS.frame);
      gateFrame.box(pierS, t2, gateBaseY + 1.08, gateBaseY + 3.17, innerW, 0.03, COLORS.creamMosaic);
      for (const figY of [1.25, 1.9, 2.55]) {
        for (const ds of isWide ? [-0.36, 0.36] : [0]) gateFrame.box(pierS + ds, t3, gateBaseY + figY, gateBaseY + figY + 0.45, isWide ? 0.4 : 0.34, 0.03, COLORS.mosaic);
      }
      gateFrame.box(pierS, t1, gateBaseY + 0.55, gateBaseY + 0.88, frameW, 0.03, COLORS.frame);
      gateFrame.box(pierS, t2, gateBaseY + 0.6, gateBaseY + 0.83, innerW, 0.03, COLORS.archRed);
    }
    for (let k = -6; k <= 6; k++) {
      gateFrame.box(k * 1.1, t1, gateBaseY + 3.84, gateBaseY + 4.24, 0.84, 0.03, shade(COLORS.ochre, 0.78));
      gateFrame.box(k * 1.1, t2, gateBaseY + 3.9, gateBaseY + 4.18, 0.64, 0.03, k % 2 ? COLORS.archRed : COLORS.creamMosaic);
    }
  }
  for (const side of [-1, 1]) {
    gateFrame.hip(side * 4.9, 0, 5.2, gateDepth, gateBaseY + wallH, 0.8, COLORS.tile, { over: 0.55, segs: 2, flare: 0.08, fascia: 0.15, fasciaCol: shade(COLORS.lacquer, 0.7), hips: false, horns: false, glazed: true, ridgeCol: shade(COLORS.tile, 0.85) });
  }

  const midStoreyY = gateBaseY + wallH;
  const topRidgeY = midStoreyY + 1.6 + 1.2;
  S.kind = KIND.MASONRY;
  gateFrame.box(0, 0, midStoreyY, midStoreyY + 1.6, 6.4, 3.0, COLORS.ochre, tileTop);
  S.kind = KIND.PLAIN;
  for (const face of [-1, 1]) {
    const t1 = face * 1.515;
    const t2 = face * 1.53;
    for (let k = -2; k <= 2; k++) {
      gateFrame.box(k * 1.18, t1, midStoreyY + 0.3, midStoreyY + 1.3, 0.98, 0.03, COLORS.frame);
      gateFrame.box(k * 1.18, t2, midStoreyY + 0.38, midStoreyY + 1.22, 0.78, 0.03, k % 2 ? COLORS.archRed : COLORS.creamMosaic);
      if (k % 2 === 0) gateFrame.box(k * 1.18, t2 + face * 0.015, midStoreyY + 0.55, midStoreyY + 1.05, 0.4, 0.03, k ? COLORS.mosaic : COLORS.gold);
    }
  }
  gateFrame.hip(0, 0, 6.4, 3.0, midStoreyY + 1.6, 1.2, COLORS.tile, { over: 0.7, flare: 0.3, fascia: 0.2, fasciaCol: shade(COLORS.lacquer, 0.7), hips: true, glazed: true, segs: 3, ridgeCol: COLORS.ridge });
  for (const side of [-1, 1]) {
    gateFrame.box(side * 1.35, 0, topRidgeY - 0.05, topRidgeY + 0.3, 0.6, 0.14, COLORS.ridge);
    gateFrame.box(side * 1.6, 0, topRidgeY + 0.3, topRidgeY + 0.6, 0.18, 0.14, COLORS.ridge);
    gateFrame.box(side * 5.85, 0, midStoreyY + 0.7, midStoreyY + 1.1, 0.22, 0.14, COLORS.ridge);
  }
  gateFrame.box(0, 0, topRidgeY - 0.05, topRidgeY + 0.2, 0.36, 0.3, COLORS.ridge);
  gateFrame.box(0, 0, topRidgeY + 0.2, topRidgeY + 0.75, 0.5, 0.1, COLORS.gold);

  // Diễn Trạch (rear), Thiện Khánh (east) and Địch Tường (west)
  const sideGates: [number, number, boolean, number][] = [[-1.35, -66.25, false, 1], [62.4, 35.7, true, -1], [-63.35, -17.5, true, 1]];
  for (const [u0, v0, rotated, innerSign] of sideGates) {
    const sideFrame = makeGateFrame(S, u0, v0, rotated);
    const depth = 1.6;
    const half = depth / 2;
    const archR = 0.95;
    const crownY = baseY + 2.75;
    const frameCol = shade(COLORS.ochreOld, 0.8);
    const lightCol = shade(COLORS.ochreOld, 1.12);

    S.kind = KIND.MASONRY;
    for (const side of [-1, 1]) sideFrame.box(side * 1.775, 0, baseY - 0.3, baseY + 3.2, 1.65, depth, COLORS.ochreOld);
    sideFrame.box(0, 0, crownY, baseY + 3.2, 2 * archR, depth, COLORS.ochreOld);
    sideFrame.box(0, 0, baseY + 3.2, baseY + 3.75, 5.2, depth, COLORS.ochreOld);
    sideFrame.box(0, 0, baseY + 3.75, baseY + 3.95, 5.7, depth + 0.35, shade(COLORS.ochreOld, 0.85), { bottom: true });
    sideFrame.box(0, 0, baseY + 3.95, baseY + 4.4, 4.8, depth - 0.2, COLORS.ochreOld, { top: COLORS.oldCap });
    sideFrame.box(0, 0, baseY + 4.4, baseY + 4.85, 3.4, depth - 0.2, COLORS.ochreOld);
    drawPassage(S, sideFrame, 0, 2 * archR, baseY, crownY, depth, COLORS.archRed, lightCol);
    drawFoldedLeaves(S, sideFrame, 0, archR, baseY, crownY - archR, innerSign, half);

    S.kind = KIND.PLAIN;
    for (const face of [-1, 1]) {
      const t1 = face * (half + 0.015);
      const t2 = face * (half + 0.03);
      const atticT1 = face * (half - 0.1 + 0.015);
      const atticT2 = face * (half - 0.1 + 0.03);
      for (const side of [-1, 1]) {
        sideFrame.box(side * 1.85, t1, baseY + 0.35, baseY + 2.85, 1.0, 0.03, frameCol);
        sideFrame.box(side * 1.85, t2, baseY + 0.48, baseY + 2.72, 0.76, 0.03, lightCol);
      }
      for (let k = -2; k <= 2; k++) {
        sideFrame.box(k * 0.98, t1, baseY + 3.28, baseY + 3.67, 0.8, 0.03, frameCol);
        sideFrame.box(k * 0.98, t2, baseY + 3.33, baseY + 3.62, 0.6, 0.03, k % 2 ? COLORS.archRed : lightCol);
        sideFrame.box(k * 0.9, atticT1, baseY + 4.0, baseY + 4.35, 0.7, 0.03, frameCol);
        sideFrame.box(k * 0.9, atticT2, baseY + 4.05, baseY + 4.3, 0.52, 0.03, lightCol);
      }
    }
    sideFrame.hip(0, 0, 3.4, depth - 0.2, baseY + 4.85, 0.45, COLORS.greyTile, { over: 0.25, segs: 2, flare: 0, fascia: 0.08, fasciaCol: COLORS.oldCap, hips: false, horns: false, glazed: false, ridgeCol: shade(COLORS.greyTile, 0.6) });
    S.kind = KIND.MASONRY;
    for (const side of [-1, 1]) {
      sideFrame.box(side * 2.2, 0, baseY + 4.4, baseY + 4.72, 0.2, 0.2, COLORS.ochreOld);
      sideFrame.box(side * 1.1, 0, baseY + 5.2, baseY + 5.45, 0.13, 0.13, shade(COLORS.greyTile, 0.6));
    }
  }
}

// the half-moon lawn and its stone kerb between Tiền Bình Phong and Thọ Chỉ
function buildHalfMoonLawn(S, baseY: number) {
  const drawKerb = (ptA: [number, number], ptB: [number, number]) => {
    const mid = toWorld((ptA[0] + ptB[0]) / 2, (ptA[1] + ptB[1]) / 2);
    const len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
    S.box(mid[0], mid[1], baseY - 0.1, baseY + 0.22, len + 0.2, 0.25, FRAME_ANGLE + Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]), shade(COLORS.stone, 1.05));
  };

  S.kind = KIND.PLAIN;
  for (const ring of LAWNS) S.prism(ring.map(([uPos, vPos]) => toWorld(uPos, vPos)), baseY - 0.05, baseY + 0.1, shade(COLORS.lawn, 0.8), COLORS.lawn, { topKind: KIND.GROUND });
  S.kind = KIND.MASONRY;
  for (let i = 0; i + 1 < MOON.length; i++) {
    const ptA = MOON[i];
    const ptB = MOON[i + 1];
    if (ptA[1] < 41.8 && ptB[1] < 41.8) continue;
    if ((ptA[0] > -0.6 && ptA[0] < 2.6) || (ptB[0] > -0.6 && ptB[0] < 2.6)) {
      const edges = ptA[0] < ptB[0] ? [-0.6, 2.6] : [2.6, -0.6];
      const cutAt = (cutU: number): [number, number] => [cutU, ptA[1] + ((cutU - ptA[0]) / (ptB[0] - ptA[0])) * (ptB[1] - ptA[1])];
      const parts: [[number, number], [number, number]][] = [];
      if ((ptA[0] - edges[0]) * (ptB[0] - edges[0]) < 0) parts.push([ptA, cutAt(edges[0])]);
      if ((ptA[0] - edges[1]) * (ptB[0] - edges[1]) < 0) parts.push([cutAt(edges[1]), ptB]);
      for (const [p0, p1] of parts) drawKerb(p0, p1);
      continue;
    }
    drawKerb(ptA, ptB);
  }
}

export function build({ data, S }) {
  const baseY = groundY(CENTER[0], CENTER[1]);
  const helpers = makeFrameHelpers(S);
  S.base = baseY - LAND_Y;

  buildPrimaryHalls(S, helpers, baseY);
  buildWestPavilions(S, helpers, baseY);
  buildTruongDuTa(S, helpers, baseY);
  buildCorridorsAndScreens(S, helpers, baseY);
  buildGates(S, baseY);
  buildHalfMoonLawn(S, baseY);

  if (Array.isArray(data.trees)) {
    for (const [uPos, vPos, radius] of [...TREES, [...COURT_TREE, 2.2] as [number, number, number]]) {
      const pt = toWorld(uPos, vPos);
      data.trees.push(Math.round(pt[0] * 10), Math.round(pt[1] * 10), Math.max(8, Math.min(15, Math.round((radius / 2.4) * 10))), 0);
    }
  }

  S.base = 0;
  for (const wall of WALLS) fence(S, wall.map(([uPos, vPos]) => toWorld(uPos, vPos)), OUTER_WALL_STYLE, { closed: false });
  for (const wall of INNER_WALLS) fence(S, wall.map(([uPos, vPos]) => toWorld(uPos, vPos)), INNER_WALL_STYLE, { closed: false });
  S.kind = KIND.PLAIN;
  S.base = 0;
}
