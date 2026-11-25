import * as THREE from 'three';
import { KIND, Buf, hex, shade, inRing } from '../../geo/buf.ts';
import { LAND_Y } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { glowPoints, lightMaterial } from '../../geo/materials.ts';
import { fence, roadsNear, FENCE } from '../enclosure.ts';

// Quốc tự Diệu Đế, 102 Bạch Đằng, on the east bank of the Đông Ba canal facing the Citadel (founded 1844 by Thiệu Trị
// on his birthplace; most rows pulled down 1887; rebuilt smaller 1953; restoration from 2018, when the 350 m² main
// hall was moved back about 19 m). See docs/places/dieude.md for sources and what is estimated.
export const id = 'dieude';

const AXIS_ANGLE = Math.atan2(-0.57775, 0.81621); // axis, gate → hall (bearing about 55°, the gate faces south-west)
const ACROSS_ANGLE = AXIS_ANGLE + Math.PI / 2;
const FWD: [number, number] = [Math.cos(AXIS_ANGLE), Math.sin(AXIS_ANGLE)];
const PERP: [number, number] = [-FWD[1], FWD[0]];
const ORIGIN: [number, number] = [-213.3, -948.3];

const COLORS = {
  yellow: hex('#e2c271'),
  yellowDark: hex('#c9a65a'),
  tile: hex('#9d4a33'),
  tileDark: hex('#7f3a28'),
  trim: hex('#ece0c2'),
  lacquer: hex('#9e3426'),
  door: hex('#5b2a1d'),
  dark: hex('#2a211d'),
  stone: hex('#a49d8e'),
  stoneLight: hex('#c2baa8'),
  pave: hex('#c6bba3'),
  walk: hex('#ad9c80'),
  lawn: hex('#7f9752'),
  bronze: hex('#5d4a2c'),
  leaf: hex('#4f7337'),
  mosaic: hex('#5f9a8a'),
  mosaicTeal: hex('#2e6f78'),
  brown: hex('#6b4535'),
  brownDark: hex('#553729'),
  redTile: hex('#a9503a'),
  lime: hex('#d8ccb2'),
  iron: hex('#80796e'),
  moss: hex('#56603f'),
  verge: hex('#6c8a47'),
  grey: hex('#9b988f'),
  greyLight: hex('#b3afa5'),
  screen: hex('#9b3a2c'),
  pot: hex('#6f5b4a'),
  boardBg: hex('#3a2a1c'),
  gold: hex('#d8b14a'),
  lotusGold: hex('#e5c158'),
  stele: hex('#6f6a61'),
  postTimber: hex('#5b4a3a'),
  flameRed: hex('#c9442c'),
};

const WALL_STYLE = { ...FENCE.pagoda, h: 2.4, plinth: 2.4, every: 5.0, postW: 0.44, postUp: -0.1, wall: hex('#6a4a3c'), cap: hex('#5e564c'), pierW: 1.0, pierUp: 1.3, t: 0.42 };
const BACK_WALL_STYLE = { ...WALL_STYLE, rail: true, plinth: 1.25, h: 2.45, iron: COLORS.screen, postW: 0.45 };

const FRONT_A = 1;
const LEFT_B = -41.5;
const RIGHT_B = 42;
const BACKLINE: [number, number][] = [[119.7, LEFT_B], [121.54, -15], [122.1, -6.9], [122.52, 15], [122.9, 34.5]];
const PRECINCT_RING: [number, number][] = [[FRONT_A, LEFT_B], ...BACKLINE, [117, RIGHT_B], [FRONT_A, RIGHT_B]];
const ROOF_BOXES: [number, number, number, number][] = [
  [-1.6, 3.6, -8.4, 8.4], [61.0, 88.6, -14.6, 14.6], [83.9, 100.2, -41.2, -27.8],
  [83.9, 102.7, 25.8, 40.8], [101.4, 121.0, -22.5, 21.9],
];
const ROOF_DISCS: [number, number, number][] = [
  [8.1, -12.4, 3.9], [8.1, 12.4, 3.9], [30, -15, 3.9], [30, 15, 3.9],
  [66.5, -19.5, 4.0], [35, -36.6, 4.0], [1, -25, 2.6], [122.2, 0, 3.2],
];

const toWorld = (along: number, across = 0): [number, number] => [
  ORIGIN[0] + FWD[0] * along + PERP[0] * across,
  ORIGIN[1] + FWD[1] * along + PERP[1] * across,
];
const groundY = (x: number, z: number) => LAND_Y + rise(x, z);

function backWallA(across: number) {
  for (let i = 0; i + 1 < BACKLINE.length; i++) {
    const p0 = BACKLINE[i];
    const p1 = BACKLINE[i + 1];
    if (across <= p1[1]) return p0[0] + ((p1[0] - p0[0]) * (across - p0[1])) / (p1[1] - p0[1]);
  }
  return 122.9;
}

function distToSeg2D(along: number, across: number, p0: [number, number], p1: [number, number]) {
  const dx = p1[0] - p0[0];
  const db = p1[1] - p0[1];
  const frac = Math.max(0, Math.min(1, ((along - p0[0]) * dx + (across - p0[1]) * db) / (dx * dx + db * db)));
  return Math.hypot(along - p0[0] - dx * frac, across - p0[1] - db * frac);
}

const distToRing = (along: number, across: number) =>
  Math.min(...PRECINCT_RING.map((pt, i) => distToSeg2D(along, across, pt, PRECINCT_RING[(i + 1) % PRECINCT_RING.length])));

const isInsidePrecinct = (along: number, across: number, margin = 0) =>
  inRing(along, across, PRECINCT_RING) && distToRing(along, across) >= margin;

const isClearOfRoofs = (along: number, across: number, radius: number) =>
  ROOF_BOXES.every(([a0, a1, b0, b1]) => Math.hypot(Math.max(a0 - along, 0, along - a1), Math.max(b0 - across, 0, across - b1)) > radius)
  && ROOF_DISCS.every(([da, db, discR]) => Math.hypot(along - da, across - db) > radius + discR);

function frameBox(S, along: number, across: number, y0: number, y1: number, lenA: number, lenB: number, col: number[], opts: Record<string, any> = {}) {
  const pt = toWorld(along, across);
  S.box(pt[0], pt[1], y0, y1, lenA, lenB, AXIS_ANGLE + (opts.rot || 0), col, opts);
}

function buildWallsAndCourt(S, data, baseY: number) {
  const roads = roadsNear(data, toWorld(55, 0), 200);
  const footprint = (along: number, across: number, lenA: number, lenB: number) => [
    toWorld(along - lenA / 2, across - lenB / 2),
    toWorld(along + lenA / 2, across - lenB / 2),
    toWorld(along + lenA / 2, across + lenB / 2),
    toWorld(along - lenA / 2, across + lenB / 2),
  ];
  const sidePiers: [number, number][] = [[FRONT_A, -26.75], [FRONT_A, -23.25]];
  const backPiers: [number, number][] = [[backWallA(-2.1), -2.1], [backWallA(2.1), 2.1]];
  const solid = [
    footprint(1.0, 0, 3.4, 15.2),
    ...sidePiers.map(([along, across]) => footprint(along, across, 0.7, 0.7)),
    ...backPiers.map(([along, across]) => footprint(along, across, 1.1, 1.1)),
  ];
  const frontWallPts: [number, number][] = [[122.52, 15], [122.9, 34.5], [117, RIGHT_B], [FRONT_A, RIGHT_B], [FRONT_A, LEFT_B], [119.7, LEFT_B], [121.54, -15]];
  fence(S, frontWallPts.map(([along, across]) => toWorld(along, across)), WALL_STYLE, { closed: false, roads, solid, openings: [[...toWorld(FRONT_A, -25), 1.75]] });
  fence(S, [[121.54, -15], [122.1, -6.9], [122.52, 15]].map(([along, across]) => toWorld(along, across)), BACK_WALL_STYLE, { closed: false, roads, solid, openings: [[...toWorld(backWallA(0), 0), 2.1]] });
  for (const [along, across] of sidePiers) drawStonePier(S, toWorld(along, across));
  for (const [along, across] of backPiers) drawMossPier(S, toWorld(along, across));

  const pavedStart = S.n;
  const cellStep = 4;
  const onBackBuilding = (along: number, across: number) =>
    ROOF_BOXES.slice(2).some(([a0, a1, b0, b1]) => along > a0 + 0.5 && along < a1 - 0.5 && across > b0 + 0.5 && across < b1 - 0.5);
  for (let a0 = FRONT_A + 0.3; a0 < 122.6; a0 += cellStep) {
    for (let b0 = LEFT_B + 0.3; b0 < RIGHT_B - 0.3; b0 += cellStep) {
      const a1 = a0 + cellStep;
      const b1 = Math.min(b0 + cellStep, RIGHT_B - 0.3);
      const cellCorners: [number, number][] = [[a0, b0], [a1, b0], [a1, b1], [a0, b1]];
      if (!cellCorners.every(([ca, cb]) => isInsidePrecinct(ca, cb, 0.3)) || cellCorners.some(([ca, cb]) => onBackBuilding(ca, cb)) || onBackBuilding((a0 + a1) / 2, (b0 + b1) / 2)) continue;
      const midA = (a0 + a1) / 2;
      const absMidB = Math.abs((b0 + b1) / 2);
      const isPaved = (midA < 59 && absMidB < 7) || (midA > 45 && midA < 59 && absMidB < 15);
      S.kind = isPaved ? KIND.ROAD : KIND.GROUND;
      const verts = cellCorners.map(([ca, cb]) => {
        const pt = toWorld(ca, cb);
        return [pt[0], groundY(pt[0], pt[1]) + 0.24, pt[1]];
      });
      S.quad(verts[0], verts[3], verts[2], verts[1], isPaved ? COLORS.pave : COLORS.lawn, [0, 1, 0]);
    }
  }
  S.kind = KIND.ROAD;
  frameBox(S, 31, 0, baseY - 0.2, baseY + 0.3, 56, 4.2, COLORS.walk, { topKind: KIND.ROAD });
  S.kind = KIND.GROUND;
  for (const [b0, b1, col] of [[LEFT_B + 0.3, -27.4, COLORS.verge], [-27.4, -22.6, COLORS.pave], [-22.6, -8.2, COLORS.verge], [8.2, RIGHT_B - 0.3, COLORS.verge]] as [number, number, number[]][]) {
    const verts = [[-2.4, b0], [FRONT_A - 0.3, b0], [FRONT_A - 0.3, b1], [-2.4, b1]].map(([ca, cb]) => {
      const pt = toWorld(ca, cb);
      return [pt[0], groundY(pt[0], pt[1]) + 0.16, pt[1]];
    });
    S.quad(verts[0], verts[3], verts[2], verts[1], col, [0, 1, 0]);
  }
  S.paved = [...(S.paved || []), [pavedStart, S.n]];
}

// Phượng Môn gate on Bạch Đằng
function buildGate(S, lamps: any[], eaveLights: Buf) {
  const gateA = 1.0;
  const gatePt = toWorld(gateA, 0);
  const gy = groundY(gatePt[0], gatePt[1]);
  const floorY = gy + 0.3;
  const depth = 3.4;
  const width = 15.2;
  S.base = gy - LAND_Y;
  S.kind = KIND.MASONRY;
  frameBox(S, gateA, 0, gy - 0.3, floorY, depth + 1.2, width + 0.6, COLORS.stone, { topKind: KIND.ROAD });
  S.kind = KIND.CIVIC;
  frameBox(S, gateA, 0, floorY, floorY + 4.4, depth, width, COLORS.yellow, { top: COLORS.tileDark });
  S.kind = KIND.PLAIN;
  frameBox(S, gateA, 0, floorY + 4.1, floorY + 4.5, depth + 0.4, width + 0.4, COLORS.trim);

  for (const side of [-1, 1]) {
    for (const [bPos, openW, openH] of [[0, 3.0, 3.6], [-4.8, 2.0, 2.8], [4.8, 2.0, 2.8]] as [number, number, number][]) {
      frameBox(S, gateA + side * (depth / 2 + 0.01), bPos, floorY, floorY + openH, 0.06, openW, COLORS.dark);
      frameBox(S, gateA + side * (depth / 2 + 0.02), bPos, floorY + openH, floorY + openH + 0.25, 0.06, openW + 0.4, COLORS.trim);
    }
  }
  for (const bPos of [-6.6, -3.0, 3.0, 6.6]) frameBox(S, gateA - depth / 2 - 0.25, bPos, floorY, floorY + 4.1, 0.42, 0.42, COLORS.lacquer);
  for (const side of [-1, 1]) {
    for (const bPos of [-4.8, 4.8]) frameBox(S, gateA + side * (depth / 2 + 0.05), bPos, floorY + 3.25, floorY + 3.85, 0.06, 2.2, COLORS.mosaic);
    frameBox(S, gateA + side * (depth / 2 + 0.05), 0, floorY + 4.18, floorY + 4.42, 0.06, width - 1.2, COLORS.mosaicTeal);
  }
  frameBox(S, gateA - depth / 2 - 0.06, 0, floorY + 3.75, floorY + 4.1, 0.08, 2.6, COLORS.boardBg);
  frameBox(S, gateA - depth / 2 - 0.08, 0, floorY + 3.8, floorY + 4.05, 0.06, 2.2, COLORS.gold);

  // twin trụ biểu lotus pillars flanking the forecourt
  for (const side of [-1, 1]) {
    const pt = toWorld(gateA - 3.0, side * 8.6);
    const pg = groundY(pt[0], pt[1]);
    S.kind = KIND.MASONRY;
    S.box(pt[0], pt[1], pg - 0.2, pg + 0.6, 1.05, 1.05, AXIS_ANGLE, COLORS.stone, { top: COLORS.stoneLight });
    S.box(pt[0], pt[1], pg + 0.6, pg + 4.5, 0.68, 0.68, AXIS_ANGLE, COLORS.yellow, { top: COLORS.trim });
    S.kind = KIND.PLAIN;
    S.box(pt[0], pt[1], pg + 1.2, pg + 3.9, 0.72, 0.36, AXIS_ANGLE, COLORS.mosaic);
    S.box(pt[0], pt[1], pg + 4.5, pg + 4.78, 0.88, 0.88, AXIS_ANGLE, COLORS.trim);
    S.cyl(pt[0], pt[1], pg + 4.78, pg + 5.18, 0.32, 0.42, 8, COLORS.lotusGold);
    S.cyl(pt[0], pt[1], pg + 5.18, pg + 5.65, 0.38, 0.06, 8, COLORS.lotusGold);
  }

  for (const side of [-1, 1]) {
    const sidePt = toWorld(gateA, side * 5.0);
    S.hip(sidePt[0], sidePt[1], 5.0, depth + 0.4, ACROSS_ANGLE, floorY + 4.5, 1.0, COLORS.tile, { flare: 0.35, over: 0.6, fascia: 0.16, fasciaCol: COLORS.trim, ridgeCol: COLORS.trim, hips: true, segs: 2 });
  }

  // gate upper storey under a two-tier roof
  const upperY = floorY + 4.5;
  S.kind = KIND.TIMBER;
  S.box(gatePt[0], gatePt[1], upperY, upperY + 2.3, 3.0, 6.0, AXIS_ANGLE, COLORS.yellowDark, { top: COLORS.tileDark });
  S.kind = KIND.PLAIN;
  for (const side of [-1, 1]) {
    frameBox(S, gateA + side * 1.52, 0, upperY + 0.4, upperY + 1.9, 0.06, 4.2, COLORS.dark);
    frameBox(S, gateA + side * 1.6, 0, upperY, upperY + 0.7, 0.1, 6.2, COLORS.lacquer);
  }
  S.hip(gatePt[0], gatePt[1], 6.6, 3.6, ACROSS_ANGLE, upperY + 2.3, 0.9, COLORS.tile, { flare: 0.4, over: 0.8, fascia: 0.18, fasciaCol: COLORS.trim, hips: true, segs: 2 });
  S.kind = KIND.TIMBER;
  S.box(gatePt[0], gatePt[1], upperY + 2.7, upperY + 3.5, 2.2, 4.6, AXIS_ANGLE, COLORS.yellowDark, { top: COLORS.tileDark });
  S.kind = KIND.PLAIN;
  S.hip(gatePt[0], gatePt[1], 5.0, 2.6, ACROSS_ANGLE, upperY + 3.5, 1.4, COLORS.tile, { flare: 0.45, over: 0.8, fascia: 0.18, fasciaCol: COLORS.trim, ridgeCol: COLORS.trim, hips: true, segs: 3 });
  drawRidgeOrnament(S, gatePt, upperY + 4.9, 2.2, 0.45);

  for (const side of [-1, 1]) {
    for (const bPos of [-4.8, 0, 4.8]) lamps.push([toWorld(gateA + side * (depth / 2 + 0.6), bPos), floorY + 3.9, [1, 0.38, 0.2]]);
    const p0 = toWorld(gateA + side * (depth / 2 + 0.75), -width / 2);
    const p1 = toWorld(gateA + side * (depth / 2 + 0.75), width / 2);
    eaveLights.beam([p0[0], floorY + 4.3, p0[1]], [p1[0], floorY + 4.3, p1[1]], 0.12, 0.12, [1, 1, 1]);
  }
}

// octagonal two-storey bell / drum tower either side of the gate
function buildBellOrDrumTower(S, center: [number, number], lamps: any[]) {
  const gy = groundY(center[0], center[1]);
  const radius = 2.7;
  const rot = AXIS_ANGLE + Math.PI / 8;
  S.base = gy - LAND_Y;
  S.kind = KIND.MASONRY;
  S.cyl(center[0], center[1], gy - 0.3, gy + 0.6, radius + 0.8, radius + 0.8, 8, COLORS.stone, { rot });
  S.kind = KIND.CIVIC;
  S.cyl(center[0], center[1], gy + 0.6, gy + 3.9, radius, radius, 8, COLORS.yellow, { rot });
  S.kind = KIND.PLAIN;
  const apothem = radius * Math.cos(Math.PI / 8) + 0.02;
  for (let i = 0; i < 8; i++) {
    const angle = AXIS_ANGLE + (i * Math.PI) / 4;
    S.box(center[0] + Math.cos(angle) * apothem, center[1] + Math.sin(angle) * apothem, gy + 0.6, gy + (i % 2 ? 2.4 : 3.0), 0.06, i % 2 ? 0.9 : 1.3, angle, COLORS.dark);
  }
  drawPolyRoof(S, center, 8, rot, gy + 3.9, radius + 1.0, 1.1, radius * 0.62, COLORS.tile, COLORS.trim);
  S.kind = KIND.TIMBER;
  S.cyl(center[0], center[1], gy + 4.6, gy + 6.4, radius * 0.66, radius * 0.66, 8, COLORS.yellowDark, { rot });
  S.kind = KIND.PLAIN;
  const upperApothem = radius * 0.66 * Math.cos(Math.PI / 8) + 0.02;
  for (let i = 0; i < 8; i += 2) {
    const angle = AXIS_ANGLE + (i * Math.PI) / 4;
    S.box(center[0] + Math.cos(angle) * upperApothem, center[1] + Math.sin(angle) * upperApothem, gy + 4.9, gy + 6.1, 0.06, 0.8, angle, COLORS.dark);
    lamps.push([[center[0] + Math.cos(angle) * (radius + 0.6), center[1] + Math.sin(angle) * (radius + 0.6)], gy + 3.5, [1, 0.42, 0.22]]);
  }
  drawPolyRoof(S, center, 8, rot, gy + 6.4, radius * 0.66 + 0.9, 1.8, 0.05, COLORS.tile, COLORS.trim);
  S.cyl(center[0], center[1], gy + 8.2, gy + 8.6, 0.18, 0.28, 6, COLORS.trim);
  S.cyl(center[0], center[1], gy + 8.6, gy + 9.1, 0.28, 0.05, 6, COLORS.gold);
}

// hexagonal open pavilion sheltering the great bell or the 1846 stele
function buildHexPavilion(S, center: [number, number], contents: 'bell' | 'stele', lamps: any[]) {
  const gy = groundY(center[0], center[1]);
  const radius = 2.6;
  const rot = AXIS_ANGLE;
  S.base = gy - LAND_Y;
  S.kind = KIND.MASONRY;
  S.cyl(center[0], center[1], gy - 0.2, gy + 0.6, radius + 0.7, radius + 0.6, 6, COLORS.stone, { rot });
  S.kind = KIND.TIMBER;
  for (let i = 0; i < 6; i++) {
    const angle = rot + (i * Math.PI) / 3;
    S.cyl(center[0] + Math.cos(angle) * radius, center[1] + Math.sin(angle) * radius, gy + 0.6, gy + 3.5, 0.17, 0.15, 6, COLORS.lacquer, { cap: false });
  }
  S.kind = KIND.PLAIN;
  for (let i = 0; i < 6; i++) {
    const a0 = rot + (i * Math.PI) / 3;
    const a1 = rot + ((i + 1) * Math.PI) / 3;
    S.beam([center[0] + Math.cos(a0) * radius, gy + 3.4, center[1] + Math.sin(a0) * radius], [center[0] + Math.cos(a1) * radius, gy + 3.4, center[1] + Math.sin(a1) * radius], 0.2, 0.3, COLORS.lacquer);
  }
  drawPolyRoof(S, center, 6, rot, gy + 3.5, radius + 1.0, 1.0, radius * 0.55, COLORS.tile, COLORS.trim);
  drawPolyRoof(S, center, 6, rot, gy + 4.3, radius * 0.55 + 0.6, 1.2, 0.05, COLORS.tile, COLORS.trim);
  S.cyl(center[0], center[1], gy + 5.5, gy + 6.0, 0.22, 0.05, 6, COLORS.gold);
  if (contents === 'bell') {
    S.beam([center[0], gy + 3.4, center[1]], [center[0], gy + 2.9, center[1]], 0.1, 0.1, COLORS.dark);
    S.cyl(center[0], center[1], gy + 1.3, gy + 2.6, 0.75, 0.55, 10, COLORS.bronze);
    S.cyl(center[0], center[1], gy + 2.6, gy + 2.95, 0.55, 0.2, 10, COLORS.bronze);
  } else {
    S.kind = KIND.MASONRY;
    S.box(center[0], center[1], gy + 0.6, gy + 1.0, 0.7, 1.6, AXIS_ANGLE, COLORS.stone);
    S.box(center[0], center[1], gy + 1.0, gy + 2.9, 0.26, 1.07, AXIS_ANGLE, COLORS.stele);
    S.cyl(center[0], center[1], gy + 2.9, gy + 3.1, 0.55, 0.3, 6, COLORS.stele, { rot });
  }
  lamps.push([center, gy + 3.2, [1, 0.5, 0.26]]);
}

// Đại Giác main hall: front house + two-tier main house
function buildMainHall(S, lamps: any[], eaveLights: Buf) {
  const frontA = 62.8;
  const backA = 86.8;
  const joinA = 72.0;
  const halfB = 12.9;
  let maxG = -1e9;
  for (const [along, across] of [[frontA, -halfB], [frontA, halfB], [backA, -halfB], [backA, halfB], [(frontA + backA) / 2, 0]] as [number, number][]) {
    const pt = toWorld(along, across);
    maxG = Math.max(maxG, groundY(pt[0], pt[1]));
  }
  const floorY = maxG + 0.8;
  S.base = maxG - LAND_Y;
  S.kind = KIND.MASONRY;
  frameBox(S, (frontA + backA) / 2, 0, maxG - 0.4, floorY, backA - frontA + 1.2, 2 * halfB + 1.2, COLORS.stone, { top: COLORS.stoneLight, topKind: KIND.ROAD });
  S.kind = KIND.ROAD;
  for (let i = 0; i < 4; i++) frameBox(S, frontA - 0.6 - 0.35 * (4 - i) + 0.175, 0, maxG - 0.2, maxG + 0.2 * (i + 1), 0.35, 12.4 - i * 0.2, COLORS.stoneLight);

  const doorWallA = frontA + 2.2;
  S.kind = KIND.CIVIC;
  frameBox(S, (doorWallA + backA) / 2, 0, floorY, floorY + 4.3, backA - doorWallA, 2 * halfB, COLORS.yellow, { top: COLORS.tileDark });
  S.kind = KIND.PLAIN;
  for (const [bPos, doorW] of [[-10.6, 2.0], [-5.6, 2.4], [0, 2.8], [5.6, 2.4], [10.6, 2.0]] as [number, number][]) {
    frameBox(S, doorWallA - 0.02, bPos, floorY, floorY + 3.0, 0.06, doorW, COLORS.door);
    frameBox(S, doorWallA - 0.04, bPos, floorY + 3.0, floorY + 3.2, 0.06, doorW + 0.3, COLORS.trim);
  }
  frameBox(S, doorWallA - 0.1, 0, floorY + 3.35, floorY + 3.95, 0.08, 3.4, COLORS.boardBg);
  frameBox(S, doorWallA - 0.14, 0, floorY + 3.42, floorY + 3.88, 0.06, 3.0, COLORS.gold);

  S.kind = KIND.TIMBER;
  for (const bPos of [-12.4, -8.4, -2.8, 2.8, 8.4, 12.4]) {
    const pt = toWorld(frontA + 0.4, bPos);
    S.cyl(pt[0], pt[1], floorY, floorY + 4.1, 0.24, 0.22, 8, COLORS.lacquer, { cap: false });
  }
  S.kind = KIND.PLAIN;
  const beamL = toWorld(frontA + 0.4, -12.7);
  const beamR = toWorld(frontA + 0.4, 12.7);
  S.beam([beamL[0], floorY + 4.1, beamL[1]], [beamR[0], floorY + 4.1, beamR[1]], 0.3, 0.36, COLORS.lacquer);
  frameBox(S, (frontA + doorWallA) / 2, 0, floorY + 4.0, floorY + 4.3, doorWallA - frontA, 2 * halfB, shade(COLORS.yellow, 0.5), { bottom: true });

  const roofBaseY = floorY + 4.3;
  const frontCenter = toWorld((frontA + joinA) / 2, 0);
  S.hip(frontCenter[0], frontCenter[1], 2 * halfB, joinA - frontA, ACROSS_ANGLE, roofBaseY, 2.6, COLORS.tile, { flare: 0.5, over: 1.1, fascia: 0.22, fasciaCol: COLORS.trim, ridgeCol: COLORS.trim, hips: true, segs: 3 });
  drawRidgeOrnament(S, frontCenter, roofBaseY + 2.65, 4.2, 0.55);

  const mainCenter = toWorld((joinA + backA) / 2, 0);
  S.hip(mainCenter[0], mainCenter[1], 2 * halfB, backA - joinA, ACROSS_ANGLE, roofBaseY, 1.4, COLORS.tile, { flare: 0.45, over: 1.1, fascia: 0.22, fasciaCol: COLORS.trim, hips: true, segs: 3 });
  const upperA0 = 72.3;
  const upperA1 = 81.5;
  const upperHalfB = 11.5;
  const upperMidA = (upperA0 + upperA1) / 2;
  const upperRoofY = roofBaseY + 1.6;
  S.kind = KIND.CIVIC;
  frameBox(S, upperMidA, 0, roofBaseY + 0.3, upperRoofY, upperA1 - upperA0, 2 * upperHalfB, COLORS.yellowDark, { top: COLORS.tileDark });
  S.kind = KIND.PLAIN;
  const upperCenter = toWorld(upperMidA, 0);
  S.hip(upperCenter[0], upperCenter[1], 2 * upperHalfB, upperA1 - upperA0, ACROSS_ANGLE, upperRoofY, 2.6, COLORS.tile, { flare: 0.55, over: 1.4, fascia: 0.2, fasciaCol: COLORS.trim, ridgeCol: COLORS.trim, hips: true, segs: 4 });
  drawRidgeOrnament(S, upperCenter, upperRoofY + 2.65, 5.4, 0.7);

  for (const [eaveA, spanB, eaveY] of [[frontA - 1.0, halfB + 1.0, roofBaseY - 0.35], [upperA0 - 1.3, upperHalfB + 1.2, upperRoofY - 0.15]] as [number, number, number][]) {
    const p0 = toWorld(eaveA, -spanB);
    const p1 = toWorld(eaveA, spanB);
    eaveLights.beam([p0[0], eaveY, p0[1]], [p1[0], eaveY, p1[1]], 0.12, 0.12, [1, 1, 1]);
  }
  for (const bPos of [-10.6, -5.6, 0, 5.6, 10.6]) lamps.push([toWorld(frontA + 0.2, bPos), floorY + 3.5, [1, 0.42, 0.22]]);
}

// the pagoda's back ranges along Ngự Viên, Diệu Đế and Tô Hiến Thành
function buildBackRanges(S, lamps: any[]) {
  drawTiledHouse(S, 84.8, 99.3, -40.2, -28.7, { wallH: 2.9, roofH: 1.5, col: COLORS.brownDark, upper: { inset: 2.6, rise: 1.1, h: 1.7 } });
  drawTiledHouse(S, 84.8, 101.8, 26.7, 39.9, { wallH: 3.0, roofH: 2.1, col: COLORS.brown });

  const a0 = 102.4, a1 = 116.4, b0 = -12.8, b1 = 13.1, wallH = 3.0, roofH = 2.3;
  const { ground, wallTopY } = drawTiledHouse(S, a0, a1, b0, b1, { wallH, roofH, col: COLORS.brown, over: 0.6 });
  const midA = (a0 + a1) / 2;
  const ridgeY = wallTopY + roofH;
  drawRidgeOrnament(S, toWorld(midA, 0), ridgeY - 0.05, 3.2, 0.42);
  for (const side of [-1, 1]) drawRidgeOrnament(S, toWorld(midA, side * ((b1 - b0) / 2 - (a1 - a0) / 2 - 0.2) + (b0 + b1) / 2), ridgeY - 0.05, 1.6, 0.3);

  const pt3 = (along: number, across: number, y: number): [number, number, number] => {
    const pt = toWorld(along, across);
    return [pt[0], y, pt[1]];
  };
  const drawDoubleQuad = (p0, p1, p2, p3, col) => { S.quad(p0, p1, p2, p3, col); S.quad(p0, p3, p2, p1, col); };
  S.kind = KIND.PLAIN;
  const eaveA1 = a1 + 0.9;
  const eaveA2 = 120.3;
  const sheetB0 = b0 + 0.6;
  const sheetB1 = b1 - 0.6;
  drawDoubleQuad(pt3(midA + 0.3, sheetB0, ridgeY + 0.12), pt3(midA + 0.3, sheetB1, ridgeY + 0.12), pt3(eaveA1, sheetB1, wallTopY + 0.05), pt3(eaveA1, sheetB0, wallTopY + 0.05), COLORS.iron);
  drawDoubleQuad(pt3(eaveA1, sheetB0, wallTopY + 0.05), pt3(eaveA1, sheetB1, wallTopY + 0.05), pt3(eaveA2, sheetB1, wallTopY - 0.75), pt3(eaveA2, sheetB0, wallTopY - 0.75), shade(COLORS.iron, 0.85));
  S.kind = KIND.MASONRY;
  frameBox(S, (a1 + eaveA2) / 2 + 0.1, (b0 + b1) / 2, ground - 0.2, ground + 0.25, eaveA2 - a1 + 0.2, b1 - b0 - 1.2, COLORS.stone, { topKind: KIND.ROAD });
  S.kind = KIND.TIMBER;
  for (let bPos = sheetB0 + 0.4; bPos <= sheetB1 - 0.39; bPos += (sheetB1 - sheetB0 - 0.8) / 7) {
    const pt = toWorld(eaveA2 - 0.3, bPos);
    S.cyl(pt[0], pt[1], ground + 0.25, wallTopY - 0.68, 0.07, 0.07, 6, COLORS.postTimber, { cap: false });
  }
  S.kind = KIND.PLAIN;
  for (const bPos of [-8, -2.5, 3, 8.5]) frameBox(S, a1 + 0.02, bPos, ground + 0.35, ground + 2.5, 0.06, 1.4, COLORS.door);

  drawTiledHouse(S, 110.0, 117.0, -21.6, -14.2, { wallH: 2.8, roofH: 1.6, col: COLORS.redTile });
  drawTiledHouse(S, 109.0, 119.0, 14.6, 21.0, { wallH: 2.8, roofH: 1.6, col: COLORS.redTile });
  for (const bPos of [-6, 6]) lamps.push([toWorld(eaveA2 - 0.6, bPos), wallTopY - 1.0, [1, 0.62, 0.36]]);
}

function drawTiledHouse(S, a0: number, a1: number, b0: number, b1: number, opts: Record<string, any> = {}) {
  const { wallH = 3, roofH = 2, col = COLORS.brown, over = 0.7, upper = null } = opts;
  let ground = -1e9;
  for (const [along, across] of [[a0, b0], [a0, b1], [a1, b0], [a1, b1]] as [number, number][]) {
    const pt = toWorld(along, across);
    ground = Math.max(ground, groundY(pt[0], pt[1]));
  }
  const midA = (a0 + a1) / 2;
  const midB = (b0 + b1) / 2;
  const lenA = a1 - a0;
  const lenB = b1 - b0;
  const wallTopY = ground + 0.35 + wallH;
  const alongAxis = lenA >= lenB;
  const roofAngle = alongAxis ? AXIS_ANGLE : ACROSS_ANGLE;
  const longSpan = Math.max(lenA, lenB);
  const shortSpan = Math.min(lenA, lenB);

  S.base = ground - LAND_Y;
  S.kind = KIND.MASONRY;
  frameBox(S, midA, midB, ground - 0.3, ground + 0.35, lenA + 0.3, lenB + 0.3, COLORS.stone, { topKind: KIND.ROAD });
  S.kind = KIND.CIVIC;
  frameBox(S, midA, midB, ground + 0.35, wallTopY, lenA, lenB, COLORS.lime, { top: shade(col, 0.8) });
  S.kind = KIND.PLAIN;
  const openCount = Math.max(2, Math.round(longSpan / 4));
  for (let i = 0; i < openCount; i++) {
    const offset = -longSpan / 2 + (longSpan * (i + 0.5)) / openCount;
    for (const side of [-1, 1]) {
      const openH = i % 2 ? 1.3 : 2.1;
      if (alongAxis) frameBox(S, midA + offset, midB + side * (lenB / 2 + 0.02), ground + 0.45, ground + 0.45 + openH, 1.1, 0.06, COLORS.dark);
      else frameBox(S, midA + side * (lenA / 2 + 0.02), midB + offset, ground + 0.45, ground + 0.45 + openH, 0.06, 1.1, COLORS.dark);
    }
  }
  const center = toWorld(midA, midB);
  S.hip(center[0], center[1], longSpan, shortSpan, roofAngle, wallTopY, roofH, col, { flare: 0.3, over, fascia: 0.14, fasciaCol: shade(col, 0.75), ridgeCol: shade(col, 1.15), hips: true, segs: 2 });
  if (upper) {
    const upperW = longSpan - 2 * upper.inset;
    const upperD = shortSpan - 2 * upper.inset;
    const upperY = wallTopY + upper.rise;
    S.kind = KIND.CIVIC;
    S.box(center[0], center[1], wallTopY + 0.2, upperY, upperW, upperD, roofAngle, COLORS.lime, { top: shade(col, 0.8) });
    S.kind = KIND.PLAIN;
    S.hip(center[0], center[1], upperW, upperD, roofAngle, upperY, upper.h, col, { flare: 0.3, over: 0.6, fascia: 0.12, fasciaCol: shade(col, 0.75), ridgeCol: shade(col, 1.15), hips: true, segs: 2 });
  }
  return { ground, wallTopY };
}

function drawSmallPavilion(S, along: number, across: number, size: number, rotOffset: number, walled: boolean) {
  const pt = toWorld(along, across);
  const gy = groundY(pt[0], pt[1]);
  const angle = AXIS_ANGLE + rotOffset;
  const wallTopY = gy + 0.45 + 2.7;
  S.base = gy - LAND_Y;
  S.kind = KIND.MASONRY;
  S.box(pt[0], pt[1], gy - 0.25, gy + 0.45, size + 0.5, size + 0.5, angle, COLORS.stone, { top: COLORS.stoneLight, topKind: KIND.ROAD });
  const dirU = [Math.cos(angle), Math.sin(angle)];
  const dirV = [-dirU[1], dirU[0]];
  if (walled) {
    S.kind = KIND.CIVIC;
    S.box(pt[0], pt[1], gy + 0.45, wallTopY, size - 0.6, size - 0.6, angle, COLORS.yellow, { top: COLORS.tileDark });
    S.kind = KIND.PLAIN;
    const offset = (size - 0.6) / 2 + 0.02;
    S.box(pt[0] + dirV[0] * offset, pt[1] + dirV[1] * offset, gy + 0.45, gy + 2.4, 1.2, 0.06, angle, COLORS.door);
  } else {
    S.kind = KIND.TIMBER;
    const offset = size / 2 - 0.3;
    for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as [number, number][]) {
      S.cyl(pt[0] + (dirU[0] * su + dirV[0] * sv) * offset, pt[1] + (dirU[1] * su + dirV[1] * sv) * offset, gy + 0.45, wallTopY, 0.15, 0.13, 6, COLORS.lacquer, { cap: false });
    }
    S.kind = KIND.PLAIN;
  }
  S.hip(pt[0], pt[1], size, size, angle, wallTopY, 1.6, COLORS.tile, { flare: 0.4, over: 0.6, fascia: 0.14, fasciaCol: COLORS.trim, ridgeCol: COLORS.trim, hips: true, segs: 2 });
}

function drawStonePier(S, center: [number, number]) {
  const gy = groundY(center[0], center[1]);
  S.base = gy - LAND_Y;
  S.kind = KIND.MASONRY;
  S.box(center[0], center[1], gy - 0.3, gy + 0.5, 0.7, 0.7, AXIS_ANGLE, COLORS.grey, { top: COLORS.greyLight });
  S.box(center[0], center[1], gy + 0.5, gy + 2.9, 0.52, 0.52, AXIS_ANGLE, COLORS.grey, { top: COLORS.greyLight });
  S.kind = KIND.PLAIN;
  S.box(center[0], center[1], gy + 2.9, gy + 3.08, 0.72, 0.72, AXIS_ANGLE, COLORS.greyLight);
  S.box(center[0], center[1], gy + 3.08, gy + 3.2, 0.4, 0.4, AXIS_ANGLE, COLORS.grey);
  S.cyl(center[0], center[1], gy + 3.2, gy + 3.42, 0.12, 0.27, 8, COLORS.greyLight, { cap: false });
  S.cyl(center[0], center[1], gy + 3.42, gy + 3.7, 0.27, 0.06, 8, COLORS.greyLight);
}

function drawMossPier(S, center: [number, number]) {
  const gy = groundY(center[0], center[1]);
  S.base = gy - LAND_Y;
  S.kind = KIND.MASONRY;
  S.box(center[0], center[1], gy - 0.3, gy + 2.6, 1.0, 1.0, AXIS_ANGLE, shade(WALL_STYLE.wall, 0.9), { top: COLORS.moss });
  S.kind = KIND.PLAIN;
  S.box(center[0], center[1], gy + 2.6, gy + 2.85, 1.15, 1.15, AXIS_ANGLE, COLORS.moss);
  S.box(center[0], center[1], gy + 2.85, gy + 3.15, 0.6, 0.6, AXIS_ANGLE, COLORS.moss, { taper: 0.5 });
}

function drawPolyRoof(S, center: [number, number], sides: number, rot: number, y: number, botR: number, height: number, topR: number, col: number[], ridgeCol: number[]) {
  const prevKind = S.kind;
  S.kind = KIND.TILE;
  const midR = topR + (botR - topR) * 0.42;
  const midY = y + height * 0.62;
  S.cyl(center[0], center[1], y - 0.1, midY, botR, midR, sides, col, { rot, cap: false });
  S.cyl(center[0], center[1], midY, y + height, midR, topR, sides, col, { rot, cap: topR > 0.06 });
  S.kind = KIND.PLAIN;
  S.cyl(center[0], center[1], y - 0.3, y - 0.1, botR - 0.05, botR, sides, ridgeCol, { rot, cap: false });
  for (let i = 0; i < sides; i++) {
    const angle = rot + (i / sides) * Math.PI * 2;
    const dirX = Math.cos(angle);
    const dirZ = Math.sin(angle);
    const eavePt = [center[0] + dirX * botR, y, center[1] + dirZ * botR];
    const midPt = [center[0] + dirX * midR, midY + 0.05, center[1] + dirZ * midR];
    const peakPt = [center[0] + dirX * topR, y + height + 0.05, center[1] + dirZ * topR];
    S.beam(eavePt, midPt, 0.16, 0.16, ridgeCol);
    S.beam(midPt, peakPt, 0.14, 0.14, ridgeCol);
    S.beam(eavePt, [eavePt[0] + dirX * 0.45, y + 0.45, eavePt[2] + dirZ * 0.45], 0.14, 0.14, ridgeCol);
  }
  S.kind = prevKind;
}

// twin dragons facing the moon on a ridge (lưỡng long triều nguyệt)
function drawRidgeOrnament(S, center: [number, number], y: number, span: number, scale: number) {
  const prevKind = S.kind;
  S.kind = KIND.PLAIN;
  const at = (across: number, dy: number): [number, number, number] => [center[0] + PERP[0] * across, y + dy, center[1] + PERP[1] * across];
  S.box(center[0], center[1], y, y + 0.9 * scale, 0.12, 0.85 * scale, AXIS_ANGLE, COLORS.gold);
  S.box(center[0], center[1], y + 0.9 * scale, y + 1.3 * scale, 0.1, 0.35 * scale, AXIS_ANGLE, COLORS.flameRed);
  const dragonCurve: [number, number][] = [[0.55, 0.2], [0.9, 0.85], [1.4, 0.5], [1.9, 0.9], [2.3, 0.3]];
  for (const side of [-1, 1]) {
    const pts = dragonCurve.map(([across, dy]) => at((side * across * scale * span) / 4.6, dy * scale));
    for (let i = 0; i + 1 < pts.length; i++) S.beam(pts[i], pts[i + 1], 0.16 * scale + 0.05, 0.22 * scale + 0.05, COLORS.mosaic);
  }
  S.kind = prevKind;
}

function buildCourtPropsAndGrove(S, data) {
  const urnPt = toWorld(55, 0);
  const urnY = groundY(urnPt[0], urnPt[1]);
  S.kind = KIND.MASONRY;
  S.box(urnPt[0], urnPt[1], urnY, urnY + 0.7, 1.4, 1.4, AXIS_ANGLE, COLORS.stone, { top: COLORS.stoneLight });
  S.kind = KIND.PLAIN;
  S.cyl(urnPt[0], urnPt[1], urnY + 0.7, urnY + 1.5, 0.45, 0.6, 8, COLORS.bronze);
  S.cyl(urnPt[0], urnPt[1], urnY + 1.5, urnY + 2.1, 0.5, 0.22, 8, COLORS.bronze);
  for (let along = 14; along <= 50; along += 6) {
    for (const side of [-1, 1]) {
      const potPt = toWorld(along, side * 3.2);
      const potY = groundY(potPt[0], potPt[1]);
      S.cyl(potPt[0], potPt[1], potY + 0.2, potY + 0.75, 0.35, 0.42, 6, COLORS.pot, { cap: false });
      S.cyl(potPt[0], potPt[1], potY + 0.75, potY + 1.55, 0.6, 0.15, 6, COLORS.leaf);
    }
  }

  if (!Array.isArray(data.trees)) return;
  const hash = (i: number, j: number, k: number) => {
    const val = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453;
    return val - Math.floor(val);
  };
  const plant = (pt: [number, number], scale: number, kind = 1) => {
    data.trees.push(Math.round(pt[0] * 10), Math.round(pt[1] * 10), Math.max(7, Math.min(16, Math.round(scale * 10))), kind);
  };
  const gridStep = 9.5;
  for (let i = 0; FRONT_A + 3 + i * gridStep < 121; i++) {
    for (let j = 0; LEFT_B + 3 + j * gridStep < RIGHT_B - 2; j++) {
      const along = FRONT_A + 3.5 + i * gridStep + (hash(i, j, 1) - 0.5) * 4.5;
      const across = LEFT_B + 3.5 + j * gridStep + (hash(i, j, 2) - 0.5) * 4.5;
      if (!isInsidePrecinct(along, across, 3.0) || (along < 62 && Math.abs(across) < 7.0) || (along < 14 && Math.abs(across) < 16)) continue;
      let clearR = 3.8 + hash(i, j, 3) * 1.4;
      while (clearR > 2.6 && !isClearOfRoofs(along, across, clearR)) clearR -= 0.4;
      if (!isClearOfRoofs(along, across, clearR)) continue;
      plant(toWorld(along, across), 0.85 + hash(i, j, 4) * 0.4, hash(i, j, 5) < 0.55 ? 1 : 0);
    }
  }
  for (let along = 18; along <= 48; along += 10) {
    for (const side of [-1, 1]) {
      const across = side * (7.2 + hash(along, side, 6) * 1.2);
      if (isClearOfRoofs(along, across, 3.2)) plant(toWorld(along, across), 1.0 + hash(along, side, 7) * 0.25, 4);
    }
  }
  plant(toWorld(-1.7, -16.5), 1.35, 5);
}

export function build({ data, S, group }) {
  const courtRef = toWorld(30, 0);
  const baseY = groundY(courtRef[0], courtRef[1]);
  S.base = baseY - LAND_Y;
  const lamps: any[] = [];
  const eaveLights = new Buf(128);

  buildWallsAndCourt(S, data, baseY);
  buildGate(S, lamps, eaveLights);
  for (const side of [-1, 1]) buildBellOrDrumTower(S, toWorld(8.1, side * 12.4), lamps);
  buildHexPavilion(S, toWorld(30, 15), 'bell', lamps);
  buildHexPavilion(S, toWorld(30, -15), 'stele', lamps);
  buildMainHall(S, lamps, eaveLights);
  buildBackRanges(S, lamps);
  drawSmallPavilion(S, 35, -36.6, 4.6, 0, true);
  drawSmallPavilion(S, 66.5, -19.5, 4.4, 0.56, false);
  buildCourtPropsAndGrove(S, data);
  S.kind = KIND.PLAIN;
  S.base = 0;

  const stripMesh = new THREE.Mesh(eaveLights.geometry(), lightMaterial(0xffc987, 1.1));
  stripMesh.renderOrder = 19;
  const positions: number[] = [];
  const colors: number[] = [];
  for (const [pt, height, col] of lamps) {
    positions.push(pt[0], height, pt[1]);
    colors.push(...col);
  }
  const glow = glowPoints(positions, colors, 4);
  glow.userData.glow = true;
  for (const mesh of [stripMesh, glow]) {
    mesh.userData.landmark = id;
    group.add(mesh);
  }
}
