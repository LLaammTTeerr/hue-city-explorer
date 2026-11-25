import * as THREE from 'three';
import { KIND, Buf, hex, shade, inRing } from '../../geo/buf.ts';
import { LAND_Y } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { glowPoints, lightMaterial } from '../../geo/materials.ts';
import { fence, leaves, roadsNear, buildingsNear, offStreets, FENCE } from '../enclosure.ts';

// Nhà thờ Dòng Chúa Cứu Thế Huế (Đức Mẹ Hằng Cứu Giúp; Nguyễn Mỹ Lộc, 1959-62). See docs/places/dcct.md.
export const id = 'dcct';

const DEG = Math.PI / 180;
const AXIS_ANGLE = 177.96 * DEG; // axis, front -> sanctuary
const FWD: [number, number] = [Math.cos(AXIS_ANGLE), Math.sin(AXIS_ANGLE)];
const PERP: [number, number] = [-FWD[1], FWD[0]];
const ORIGIN: [number, number] = [733.94, 1203.56]; // a = 0, b = 0: middle of the front wall

const PLAN: [number, number][] = [
  [0, -13.7], [31.9, -13.6], [32, -19.4], [37, -19.3], [37.1, -25.1], [54.1, -24.7], [54, -19.6], [58, -19.5], [58, -14.5],
  [63.3, -13.3], [68.5, -10.3], [71.4, -6.5], [77, -6.2], [80.6, -1.6], [80.4, 4.3], [76.5, 8.1], [70.6, 8.2], [67, 11.6], [62.3, 14.2],
  [57.1, 14.8], [57.1, 19.8], [53.3, 19.9], [53.3, 25], [36.3, 25], [36.3, 19.1], [31.3, 19.1], [31.2, 13.6], [0, 13.7],
];
const PRECINCT: [number, number][] = [
  [590.7, 1149], [659.9, 1161.4], [742.6, 1176.3], [785.7, 1184.1], [822, 1189.6], [817.7, 1195.6], [730.4, 1236.2],
  [612.5, 1290.9], [586, 1302], [588, 1250],
];
const GATES: [number, number, number][] = [[819.8, 1192.6, 3.4], [757, 1223.9, 2.6], [700, 1168.6, 2.6]];

const COLORS = {
  render: hex('#d3dbe1'),
  renderLight: hex('#e4e9ec'),
  stoneDark: hex('#8f8a7f'),
  trim: hex('#f1f0ea'),
  tile: hex('#b0573c'),
  tileDark: hex('#86412f'),
  slate: hex('#5d6870'),
  glass: hex('#2e4f86'),
  door: hex('#2c2722'),
  doorFrame: hex('#3d5f99'),
  white: hex('#efeae0'),
  pave: hex('#a9a69e'),
  asphalt: hex('#7e7d79'),
  cream: hex('#f3e8d2'),
  band: hex('#d9b9a6'),
  glassSide: hex('#6a7177'),
  plaque: hex('#cfdbe8'),
  plaqueGreen: hex('#6fa05a'),
  soffit: hex('#7a4a3a'),
  pier: hex('#bdbcb4'),
  spire: hex('#5b5650'),
  baseRender: hex('#8b8781'),
  podium: hex('#cfc9b8'),
  glassLattice: hex('#5f666c'),
  barLattice: hex('#c3c7c8'),
  skirt: hex('#93492f'),
  grottoRock: hex('#7d7a70'),
  grottoRockAlt: hex('#8a867a'),
  gateIron: hex('#3a3d3f'),
};

const RAIL_STYLE = { ...FENCE.church, plinth: 0.6, postW: 0.55, postUp: 0.25, wall: hex('#8e8a80'), cap: hex('#b4b0a6'), iron: hex('#b9bdbc'), bars: 0.16 };

const GABLE_HALF_W = 7.15;
const SHOULDER_HALF_W = 8.85;
const GABLE_DEPTH = 8.4;
const FRONT_WIN_W = 5.6;
const FRONT_WIN_SILL = 7.4;
const FRONT_WIN_SPRING = 12.4;
const NAVE_EAVE = 15;
const NAVE_RIDGE = 25;
const TRANSEPT_CENTER_A = 45.4;
const TRANSEPT_HALF_W = 8.3;
const TRANSEPT_EAVE = 11;
const TRANSEPT_RIDGE = 17;
const TOWER_A = 44.95;

const toWorld = (along: number, across = 0): [number, number] => [
  ORIGIN[0] + FWD[0] * along + PERP[0] * across,
  ORIGIN[1] + FWD[1] * along + PERP[1] * across,
];
const toWorld3 = (along: number, across: number, y: number): [number, number, number] => {
  const pt = toWorld(along, across);
  return [pt[0], y, pt[1]];
};
const groundY = (x: number, z: number) => LAND_Y + rise(x, z);

function frameBox(S, along: number, across: number, y0: number, y1: number, lenA: number, lenB: number, col: number[], opts: Record<string, any> = {}) {
  const pt = toWorld(along, across);
  S.box(pt[0], pt[1], y0, y1, lenA, lenB, AXIS_ANGLE + (opts.rot || 0), col, opts);
}

function frameHip(S, along: number, across: number, lenA: number, lenB: number, y0: number, height: number, col: number[], opts?) {
  const pt = toWorld(along, across);
  if (lenA >= lenB) S.hip(pt[0], pt[1], lenA, lenB, AXIS_ANGLE, y0, height, col, opts);
  else S.hip(pt[0], pt[1], lenB, lenA, AXIS_ANGLE + Math.PI / 2, y0, height, col, opts);
}

function frameOct(S, along: number, across: number, y0: number, y1: number, r0: number, r1: number, col: number[], kind = KIND.PLAIN) {
  const pt = toWorld(along, across);
  S.kind = kind;
  S.cyl(pt[0], pt[1], y0, y1, r0, r1, 8, col, { cap: false, rot: AXIS_ANGLE + Math.PI / 8 });
}

function drawFrontDisc(S, along: number, across: number, y: number, radius: number, col: number[], segs = 12) {
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * 2 * Math.PI;
    const a1 = ((i + 1) / segs) * 2 * Math.PI;
    S.tri(toWorld3(along, across, y), toWorld3(along, across + Math.cos(a0) * radius, y + Math.sin(a0) * radius), toWorld3(along, across + Math.cos(a1) * radius, y + Math.sin(a1) * radius), col, [-FWD[0], 0, -FWD[1]]);
  }
}

function drawPointedWindowB(S, along: number, across: number, sign: number, width: number, y0: number, y1: number, col = COLORS.glass) {
  const offset = 0.09 * sign;
  frameBox(S, along, across + offset, y0, y1, width, 0.14, col);
  S.kind = KIND.PLAIN;
  S.tri(toWorld3(along - width / 2, across + offset * 1.6, y1), toWorld3(along + width / 2, across + offset * 1.6, y1), toWorld3(along, across + offset * 1.6, y1 + width * 0.75), col, [PERP[0] * sign, 0, PERP[1] * sign]);
}

type FaceMapper = (uPos: number, height: number, depth?: number) => [number, number, number];

function drawProfileWall(S, mapFn: FaceMapper, normal: [number, number, number], u0: number, u1: number, depth: number, baseY: number, heightAt: (uPos: number) => number, col: number[], topCol: number[], segs = 8) {
  const backNormal: [number, number, number] = [-normal[0], 0, -normal[2]];
  for (let i = 0; i < segs; i++) {
    const p0 = u0 + ((u1 - u0) * i) / segs;
    const p1 = u0 + ((u1 - u0) * (i + 1)) / segs;
    const h0 = heightAt(p0);
    const h1 = heightAt(p1);
    S.kind = KIND.PLAIN;
    S.quad(mapFn(p0, baseY, 0), mapFn(p1, baseY, 0), mapFn(p1, h1, 0), mapFn(p0, h0, 0), col, normal);
    S.quad(mapFn(p1, baseY, depth), mapFn(p0, baseY, depth), mapFn(p0, h0, depth), mapFn(p1, h1, depth), col, backNormal);
    S.quad(mapFn(p0, h0 - 0.4, -0.12), mapFn(p1, h1 - 0.4, -0.12), mapFn(p1, h1 - 0.05, -0.12), mapFn(p0, h0 - 0.05, -0.12), COLORS.trim, normal);
    S.kind = KIND.TILE;
    S.quad(mapFn(p0, h0 + 0.05, -0.35), mapFn(p1, h1 + 0.05, -0.35), mapFn(p1, h1 + 0.05, depth + 0.2), mapFn(p0, h0 + 0.05, depth + 0.2), topCol, [0, 1, 0]);
    S.quad(mapFn(p0, h0 - 0.08, -0.36), mapFn(p1, h1 - 0.08, -0.36), mapFn(p1, h1 + 0.06, -0.36), mapFn(p0, h0 + 0.06, -0.36), topCol, normal);
  }
}

const sweepCoping = (frac: number, lo: number, hi: number) => lo + (hi - lo) * frac ** 3.2 + 0.55 * Math.max(0, 1 - frac / 0.13) ** 2;

function drawCornerFinial(S, mapFn: FaceMapper, uPos: number, height: number, outSign: number) {
  S.kind = KIND.TILE;
  S.beam(mapFn(uPos - outSign * 0.25, height + 0.4, -0.3), mapFn(uPos + outSign * 0.25, height + 1.0, -0.3), 0.22, 0.22, COLORS.tile);
  S.beam(mapFn(uPos - outSign * 0.25, height + 0.4, 0.4), mapFn(uPos + outSign * 0.25, height + 1.0, 0.4), 0.18, 0.18, COLORS.tile);
}

function drawGableBracket(S, mapFn: FaceMapper, uPos: number, height: number, outSign: number) {
  S.kind = KIND.PLAIN;
  S.beam(mapFn(uPos, height - 0.3, -0.2), mapFn(uPos, height + 0.9, -0.2), 0.55, 0.5, COLORS.trim);
  S.beam(mapFn(uPos - outSign * 0.3, height + 0.9, -0.15), mapFn(uPos, height + 1.3, -0.15), 0.35, 0.4, COLORS.trim);
}

function drawConvexFan(S, mapFn: (uPos: number, height: number) => [number, number, number], pts: [number, number][], col: number[], normal: [number, number, number]) {
  const center = pts.reduce<[number, number]>((acc, pt) => [acc[0] + pt[0] / pts.length, acc[1] + pt[1] / pts.length], [0, 0]);
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[i];
    const p1 = pts[(i + 1) % pts.length];
    S.tri(mapFn(center[0], center[1]), mapFn(p0[0], p0[1]), mapFn(p1[0], p1[1]), col, normal);
  }
}

function archHead(topW: number, archRise = topW / 2) {
  const halfW = topW / 2;
  const radius = (archRise * archRise + halfW * halfW) / (2 * halfW);
  const offset = radius - halfW;
  return {
    up: (uPos: number) => Math.sqrt(Math.max(0, radius * radius - (Math.abs(uPos) + offset) ** 2)),
    half: (dh: number) => Math.max(0, Math.sqrt(Math.max(0, radius * radius - dh * dh)) - offset),
  };
}

function archOutline(botW: number, topW: number, sillY: number, springY: number, archRise: number): [number, number][] {
  const curve = archHead(topW, archRise);
  const pts: [number, number][] = [[-botW / 2, sillY], [botW / 2, sillY]];
  for (let i = 0; i <= 16; i++) {
    const uPos = (topW / 2) * (1 - (2 * i) / 16);
    pts.push([uPos, springY + curve.up(uPos)]);
  }
  return pts;
}

function archHalfWidthAt(botW: number, topW: number, sillY: number, springY: number, y: number, archRise: number) {
  if (y <= springY) return botW / 2 + ((topW - botW) / 2) * ((y - sillY) / (springY - sillY));
  return archHead(topW, archRise).half(y - springY);
}

function drawArchWindow(S, mapFn: FaceMapper, normal: [number, number, number], botW: number, topW: number, sillY: number, springY: number, opts: Record<string, any> = {}) {
  const { frame = 0.6, grid = [0.8, 0.9], bar = 0.08, cross = null, rise: archRise = topW / 2, lattice = false, glassC = COLORS.glass, barC = COLORS.trim } = opts;
  S.kind = KIND.PLAIN;
  drawConvexFan(S, (uPos, height) => mapFn(uPos, height, 0.05), archOutline(botW + 2 * frame, topW + 2 * frame, sillY - frame * 0.6, springY, archRise + frame), COLORS.trim, normal);
  drawConvexFan(S, (uPos, height) => mapFn(uPos, height, 0.1), archOutline(botW, topW, sillY, springY, archRise), glassC, normal);
  const curve = archHead(topW, archRise);
  const peakY = springY + archRise;
  for (let uPos = 0; uPos < botW / 2 - 0.1; uPos += grid[0]) {
    for (const side of uPos ? [-1, 1] : [1]) {
      const topH = uPos <= topW / 2 ? springY + curve.up(uPos) : sillY + ((springY - sillY) * (botW / 2 - uPos)) / ((botW - topW) / 2);
      S.beam(mapFn(side * uPos, sillY, 0.16), mapFn(side * uPos, topH, 0.16), bar, bar, barC);
    }
  }
  for (let y = sillY + grid[1]; y < peakY - 0.25; y += grid[1]) {
    const halfW = archHalfWidthAt(botW, topW, sillY, springY, y, archRise);
    S.beam(mapFn(-halfW, y, 0.16), mapFn(halfW, y, 0.16), bar, bar, barC);
  }
  if (cross) {
    const [c0, c1, crossY, armHalf] = cross;
    S.beam(mapFn(0, c0, 0.2), mapFn(0, c1, 0.2), 0.4, 0.16, COLORS.trim);
    S.beam(mapFn(-armHalf, crossY, 0.2), mapFn(armHalf, crossY, 0.2), 0.4, 0.16, COLORS.trim);
  }
  if (lattice) {
    const ring = archOutline(botW + frame, topW + frame, sillY, springY, archRise + frame / 2).slice(2);
    const path: [number, number][] = [[(botW + frame) / 2, sillY], ...ring, [-(botW + frame) / 2, sillY]];
    const halfSq = (0.13 * frame) / 0.6;
    for (let i = 0; i + 1 < path.length; i++) {
      const [u0, v0] = path[i];
      const [u1, v1] = path[i + 1];
      const segLen = Math.hypot(u1 - u0, v1 - v0);
      const count = Math.max(1, Math.round(segLen / 0.5));
      for (let j = 0; j < count; j++) {
        const frac = (j + 0.5) / count;
        const uPos = u0 + (u1 - u0) * frac;
        const vPos = v0 + (v1 - v0) * frac;
        S.quad(mapFn(uPos - halfSq, vPos - halfSq, 0.08), mapFn(uPos + halfSq, vPos - halfSq, 0.08), mapFn(uPos + halfSq, vPos + halfSq, 0.08), mapFn(uPos - halfSq, vPos + halfSq, 0.08), COLORS.slate, normal);
      }
    }
  }
}

function drawClaustra(S, mapFn: FaceMapper, normal: [number, number, number], u0: number, u1: number, h0: number, h1: number, stepU = 0.42, stepH = 0.42) {
  S.kind = KIND.PLAIN;
  S.quad(mapFn(u0, h0, 0.04), mapFn(u1, h0, 0.04), mapFn(u1, h1, 0.04), mapFn(u0, h1, 0.04), COLORS.slate, normal);
  const cols = Math.max(1, Math.round((u1 - u0) / stepU));
  const rows = Math.max(1, Math.round((h1 - h0) / stepH));
  for (let i = 0; i <= cols; i++) {
    const uPos = u0 + ((u1 - u0) * i) / cols;
    S.beam(mapFn(uPos, h0, 0.1), mapFn(uPos, h1, 0.1), 0.09, 0.07, COLORS.trim);
  }
  for (let j = 0; j <= rows; j++) {
    const height = h0 + ((h1 - h0) * j) / rows;
    S.beam(mapFn(u0, height, 0.1), mapFn(u1, height, 0.1), 0.07, 0.09, COLORS.trim);
  }
}

// plinth, stepped podium, forecourt, and front facade
function buildFrontAndForecourt(S, data, floorY: number, forecourtY: number) {
  S.kind = KIND.MASONRY;
  S.prism(PLAN.map(([along, across]) => toWorld(along, across)), floorY - 1.6, floorY, COLORS.stoneDark, COLORS.podium, { topKind: KIND.ROAD });
  S.kind = KIND.ROAD;
  for (let i = 0; i < 3; i++) {
    const depth = 9.5 + 0.7 * i;
    frameBox(S, -depth / 2, 0, forecourtY - 0.6, floorY - 0.02 - ((floorY - forecourtY) * i) / 3, depth, 26.2 + 1.4 * i, i ? shade(COLORS.podium, 0.93) : COLORS.podium);
  }

  const pavedStart = S.n;
  S.kind = KIND.MASONRY;
  const forecourtRing = offStreets(data, [[645, 1158.7], [659.9, 1161.4], [742.6, 1176.3], [785.7, 1184.1], [822, 1189.6], [817.7, 1195.6], [730.4, 1236.2], [645, 1275.8]]);
  S.prism(forecourtRing, forecourtY - 1.0, forecourtY, COLORS.stoneDark, COLORS.asphalt, { topKind: KIND.ROAD });
  (S.paved = S.paved || []).push([pavedStart, S.n]);

  const frontNormal: [number, number, number] = [-FWD[0], 0, -FWD[1]];
  const mapFrontOut: FaceMapper = (uPos, height, depth = 0) => toWorld3(-depth, uPos, height);
  const mapFrontWall: FaceMapper = (uPos, height, depth = 0) => toWorld3(depth, uPos, height);

  for (const side of [-1, 1]) {
    drawProfileWall(S, mapFrontWall, frontNormal, side * 13.7, side * SHOULDER_HALF_W, 10, floorY, (bPos) => sweepCoping((13.7 - Math.abs(bPos)) / (13.7 - SHOULDER_HALF_W), floorY + 4.9, floorY + 6.3), COLORS.render, COLORS.tile, 12);
    drawCornerFinial(S, mapFrontWall, side * 13.55, floorY + 4.9, side);
    S.kind = KIND.PLAIN;
    frameBox(S, GABLE_DEPTH / 2, (side * (GABLE_HALF_W + SHOULDER_HALF_W)) / 2, floorY + 1.2, floorY + 7.6, GABLE_DEPTH, SHOULDER_HALF_W - GABLE_HALF_W, COLORS.render, { top: COLORS.renderLight });
    S.kind = KIND.TILE;
    frameBox(S, GABLE_DEPTH / 2 - 0.15, (side * (GABLE_HALF_W + SHOULDER_HALF_W)) / 2, floorY + 7.6, floorY + 7.85, GABLE_DEPTH + 0.3, SHOULDER_HALF_W - GABLE_HALF_W + 0.3, COLORS.tile);
    S.kind = KIND.PLAIN;
    frameBox(S, 0.2, side * (GABLE_HALF_W + 0.2), floorY + 7.85, floorY + 9.9, 0.35, 0.35, COLORS.trim);
    drawGableBracket(S, mapFrontWall, side * (SHOULDER_HALF_W - 0.15), floorY + 6.1, -side);
    S.kind = KIND.PLAIN;
    const sideNormal: [number, number, number] = [PERP[0] * side, 0, PERP[1] * side];
    S.quad(toWorld3(0, side * 13.7, floorY), toWorld3(10, side * 13.7, floorY), toWorld3(10, side * 13.7, floorY + 5.45), toWorld3(0, side * 13.7, floorY + 5.45), COLORS.render, sideNormal);
    S.kind = KIND.MASONRY;
    frameBox(S, 5, side * 13.4, floorY, floorY + 1.2, 10.2, 0.7, COLORS.stoneDark);
    drawClaustra(S, (uPos, height, depth = 0) => toWorld3(uPos, side * (13.75 + depth), height), sideNormal, 1.8, 8.2, floorY + 1.7, floorY + 5.0);
    drawClaustra(S, (uPos, height, depth = 0) => toWorld3(uPos, side * (GABLE_HALF_W + depth), height), sideNormal, 1.4, 7.0, floorY + 9.0, floorY + 16.9, 0.4, 0.45);
    frameBox(S, -0.04, side * 10.2, floorY + 2.4, floorY + 4.6, 0.1, 1.9, COLORS.plaque);
    frameBox(S, -0.07, side * 10.2, floorY + 2.7, floorY + 3.6, 0.1, 0.5, COLORS.plaqueGreen);
    frameBox(S, -0.04, side * 10.2, floorY + 1.2, floorY + 1.45, 0.14, 10.5, COLORS.trim);
  }

  S.kind = KIND.MASONRY;
  frameBox(S, 5, 0, floorY, floorY + 1.2, 10.2, 27.6, COLORS.stoneDark);
  S.kind = KIND.PLAIN;
  frameBox(S, GABLE_DEPTH / 2, 0, floorY + 1.2, floorY + 17.8, GABLE_DEPTH, 2 * GABLE_HALF_W, COLORS.render, { top: COLORS.renderLight });
  frameBox(S, GABLE_DEPTH / 2, 0, floorY + 17.8, floorY + 18.1, GABLE_DEPTH + 0.3, 2 * GABLE_HALF_W + 0.3, COLORS.trim);
  for (const [h0, h1, width] of [[18.1, 19.05, 10.4], [19.35, 20.2, 7.6], [20.5, 21.3, 4.8], [21.6, 24.3, 2.9]] as [number, number, number][]) {
    frameBox(S, GABLE_DEPTH / 2 - 0.4, 0, floorY + h0, floorY + h1, GABLE_DEPTH - 0.8, width, COLORS.render, { top: COLORS.renderLight });
    frameBox(S, GABLE_DEPTH / 2 - 0.4, 0, floorY + h1, floorY + h1 + 0.3, GABLE_DEPTH - 0.5, width + 0.5, COLORS.trim);
  }
  frameBox(S, -0.04, 0, floorY + 22.5, floorY + 23.9, 0.1, 0.9, COLORS.door);
  frameBox(S, -0.08, 0, floorY + 22.6, floorY + 23.7, 0.1, 0.34, COLORS.white);
  S.beam(toWorld3(-0.1, 0, floorY + 21.4), toWorld3(-0.1, 0, floorY + 22.4), 0.16, 0.12, COLORS.trim);
  S.beam(toWorld3(-0.1, -0.35, floorY + 22.1), toWorld3(-0.1, 0.35, floorY + 22.1), 0.12, 0.12, COLORS.trim);

  frameBox(S, -0.04, 0, floorY + 6.3, floorY + 6.9, 0.1, 7.8, COLORS.band);
  drawArchWindow(S, mapFrontOut, frontNormal, 6.2, 5.3, floorY + FRONT_WIN_SILL, floorY + FRONT_WIN_SPRING, { frame: 0.75, grid: [0.75, 0.9], rise: 4.3, lattice: true, cross: [floorY + 8.6, floorY + 16.0, floorY + 13.0, 1.6] });
  drawFrontDisc(S, -0.06, 0, floorY + 18.65, 0.58, COLORS.white, 16);
  S.beam(toWorld3(-0.1, 0, floorY + 18.65), toWorld3(-0.1, 0, floorY + 19.1), 0.08, 0.05, COLORS.door);
  S.beam(toWorld3(-0.1, 0, floorY + 18.65), toWorld3(-0.1, 0.32, floorY + 18.65), 0.08, 0.05, COLORS.door);
  for (const side of [-1, 1]) {
    for (let i = 0; i <= 16; i++) {
      const frac = i / 16;
      const bPos = side * (1.7 + 4.0 * (1 - (1 - frac) ** 2.2));
      const height = floorY + 19.2 - 11.3 * frac;
      if (i % 4 === 2) {
        drawFrontDisc(S, -0.06, bPos, height, 0.28, COLORS.white, 10);
        drawFrontDisc(S, -0.09, bPos, height, 0.2, COLORS.door, 10);
      } else {
        drawFrontDisc(S, -0.06, bPos, height, 0.1, COLORS.door, 6);
      }
    }
  }
  for (const bPos of [-3.35, 0, 3.35]) {
    frameBox(S, -0.05, bPos, floorY, floorY + 4.0, 0.1, 2.3, COLORS.doorFrame);
    frameBox(S, -0.09, bPos, floorY, floorY + 3.75, 0.1, 1.8, COLORS.door);
  }
  frameBox(S, -1.3, 0, floorY + 5.0, floorY + 5.4, 2.8, 13.8, COLORS.trim);
  frameHip(S, -1.3, 0, 2.8, 13.8, floorY + 5.4, 0.9, COLORS.tile, { over: 0.5, flare: 0.2, segs: 2 });
  S.kind = KIND.PLAIN;
  for (const bPos of [-5, -1.7, 1.7, 5]) frameBox(S, -2.3, bPos, forecourtY - 0.2, floorY + 5.0, 0.55, 0.55, COLORS.pier);
}

// nave, side corridors, clerestory gablets, crossing transept, apse, chapels and west hall
function buildNaveTranseptAndApse(S, floorY: number) {
  S.kind = KIND.PLAIN;
  frameBox(S, 20.5, 0, floorY, floorY + 5.2, 21, 27.4, COLORS.baseRender);
  frameBox(S, 20.5, 0, floorY + 5.2, floorY + 6.0, 21, 27.4, COLORS.render, { top: COLORS.tileDark });
  frameBox(S, 25.2, 0, floorY, floorY + NAVE_EAVE, 30.9, 19, COLORS.render, { top: COLORS.tileDark });

  S.kind = KIND.TILE;
  for (const side of [-1, 1]) {
    S.quad(toWorld3(10.2, side * 14.4, floorY + 5.8), toWorld3(31.4, side * 14.4, floorY + 5.8), toWorld3(31.4, side * 9.5, floorY + 8.0), toWorld3(10.2, side * 9.5, floorY + 8.0), COLORS.tile, [PERP[0] * side, 2.2, PERP[1] * side]);
  }
  const eaveY = floorY + NAVE_EAVE - 0.5;
  const roofHalfB = 10.05;
  const roofHeightAt = (absB: number) => eaveY + ((roofHalfB - Math.abs(absB)) * (NAVE_RIDGE - NAVE_EAVE + 0.5)) / roofHalfB;
  for (const side of [-1, 1]) S.quad(toWorld3(8.4, side * roofHalfB, eaveY), toWorld3(40.65, side * roofHalfB, eaveY), toWorld3(40.65, 0, floorY + NAVE_RIDGE), toWorld3(8.4, 0, floorY + NAVE_RIDGE), COLORS.tile, [PERP[0] * side, 1.0, PERP[1] * side]);
  S.kind = KIND.PLAIN;
  S.tri(toWorld3(40.6, -9.5, roofHeightAt(9.5) - 0.1), toWorld3(40.6, 9.5, roofHeightAt(9.5) - 0.1), toWorld3(40.6, 0, floorY + NAVE_RIDGE - 0.1), COLORS.render, [FWD[0], 0, FWD[1]]);
  S.kind = KIND.TILE;
  S.beam(toWorld3(8.4, 0, floorY + NAVE_RIDGE + 0.1), toWorld3(40.65, 0, floorY + NAVE_RIDGE + 0.1), 0.45, 0.35, COLORS.tileDark);

  for (const side of [-1, 1]) {
    const sideNormal: [number, number, number] = [PERP[0] * side, 0, PERP[1] * side];
    for (let i = 0; i < 5; i++) {
      const winA = 12.2 + i * 4.3;
      drawArchWindow(S, (uPos, height, depth = 0) => toWorld3(winA + uPos, side * (13.7 + depth), height), sideNormal, 2.0, 2.0, floorY + 1.4, floorY + 3.4, { frame: 0.25, grid: [0.5, 1.1], bar: 0.06 });
    }
    for (let i = 0; i < 8; i++) {
      const bayA = 11.3 + i * 2.7;
      const halfW = 1.15;
      const apexY = floorY + NAVE_EAVE + 2.1;
      const outerB = side * (roofHalfB + 0.02);
      S.kind = KIND.PLAIN;
      frameBox(S, bayA, side * 9.78, floorY + 8.2, eaveY, 2 * halfW, 0.56, COLORS.renderLight);
      S.tri(toWorld3(bayA - halfW, outerB, eaveY), toWorld3(bayA + halfW, outerB, eaveY), toWorld3(bayA, outerB, apexY), COLORS.renderLight, sideNormal);
      for (const endSide of [-1, 1]) S.tri(toWorld3(bayA + endSide * halfW, side * 9.5, eaveY), toWorld3(bayA + endSide * halfW, outerB, eaveY), toWorld3(bayA, side * 9.5, apexY), COLORS.renderLight, [FWD[0] * endSide, 0, FWD[1] * endSide]);
      S.beam(toWorld3(bayA - halfW - 0.1, side * (roofHalfB + 0.06), eaveY - 0.05), toWorld3(bayA, side * (roofHalfB + 0.06), apexY + 0.05), 0.16, 0.12, COLORS.trim);
      S.beam(toWorld3(bayA + halfW + 0.1, side * (roofHalfB + 0.06), eaveY - 0.05), toWorld3(bayA, side * (roofHalfB + 0.06), apexY + 0.05), 0.16, 0.12, COLORS.trim);
      drawArchWindow(S, (uPos, height, depth = 0) => toWorld3(bayA + uPos, side * (roofHalfB + 0.02 + depth), height), sideNormal, 1.45, 1.45, floorY + 8.8, floorY + 13.4, { frame: 0.18, grid: [0.36, 0.5], bar: 0.05, rise: 1.75, glassC: COLORS.glassLattice, barC: COLORS.barLattice });
      if (i < 7) frameBox(S, bayA + 1.35, side * 9.68, floorY + 8.0, eaveY, 0.5, 0.36, COLORS.trim);
      S.kind = KIND.TILE;
      S.quad(toWorld3(bayA - halfW - 0.2, side * (roofHalfB + 0.15), eaveY - 0.1), toWorld3(bayA, side * (roofHalfB + 0.15), apexY + 0.15), toWorld3(bayA, side * 7.6, apexY + 0.1), toWorld3(bayA - halfW - 0.2, side * 9.4, roofHeightAt(9.4) - 0.05), COLORS.tile, [-FWD[0], 1, -FWD[1]]);
      S.quad(toWorld3(bayA, side * (roofHalfB + 0.15), apexY + 0.15), toWorld3(bayA + halfW + 0.2, side * (roofHalfB + 0.15), eaveY - 0.1), toWorld3(bayA + halfW + 0.2, side * 9.4, roofHeightAt(9.4) - 0.05), toWorld3(bayA, side * 7.6, apexY + 0.1), COLORS.tile, [FWD[0], 1, FWD[1]]);
    }
  }

  // crossing transept and its two entrance fronts
  S.kind = KIND.PLAIN;
  frameBox(S, 44.95, 0, floorY, floorY + 8.2, 26.2, 38.6, COLORS.render, { top: COLORS.tileDark });
  frameHip(S, 44.95, 0, 26.2, 38.6, floorY + 8.2, 3.4, COLORS.tile, { over: 1.0, flare: 0.3, segs: 2 });
  frameBox(S, TRANSEPT_CENTER_A, 0, floorY, floorY + TRANSEPT_EAVE, 2 * TRANSEPT_HALF_W, 43.8, COLORS.render, { top: COLORS.tileDark });
  frameBox(S, TRANSEPT_CENTER_A, 0, floorY + TRANSEPT_EAVE - 0.5, floorY + TRANSEPT_EAVE - 0.15, 2 * TRANSEPT_HALF_W + 0.4, 44.2, COLORS.trim);
  S.kind = KIND.TILE;
  for (const endSide of [-1, 1]) {
    S.quad(toWorld3(TRANSEPT_CENTER_A + endSide * (TRANSEPT_HALF_W + 0.7), -22.3, floorY + TRANSEPT_EAVE - 0.5), toWorld3(TRANSEPT_CENTER_A + endSide * (TRANSEPT_HALF_W + 0.7), 22.3, floorY + TRANSEPT_EAVE - 0.5), toWorld3(TRANSEPT_CENTER_A, 22.3, floorY + TRANSEPT_RIDGE), toWorld3(TRANSEPT_CENTER_A, -22.3, floorY + TRANSEPT_RIDGE), COLORS.tile, [FWD[0] * endSide, 1.2, FWD[1] * endSide]);
  }
  S.beam(toWorld3(TRANSEPT_CENTER_A, -22.3, floorY + TRANSEPT_RIDGE + 0.1), toWorld3(TRANSEPT_CENTER_A, 22.3, floorY + TRANSEPT_RIDGE + 0.1), 0.45, 0.35, COLORS.tileDark);
  S.kind = KIND.PLAIN;
  for (const side of [-1, 1]) {
    const sideNormal: [number, number, number] = [PERP[0] * side, 0, PERP[1] * side];
    S.tri(toWorld3(TRANSEPT_CENTER_A - TRANSEPT_HALF_W, side * 21.9, floorY + TRANSEPT_EAVE), toWorld3(TRANSEPT_CENTER_A + TRANSEPT_HALF_W, side * 21.9, floorY + TRANSEPT_EAVE), toWorld3(TRANSEPT_CENTER_A, side * 21.9, floorY + TRANSEPT_RIDGE - 0.2), COLORS.render, sideNormal);
    for (const winA of [TRANSEPT_CENTER_A - 5, TRANSEPT_CENTER_A + 5]) drawPointedWindowB(S, winA, side * 21.9, side, 1.6, floorY + 8.6, floorY + 12.2, COLORS.glassSide);

    const mapWall: FaceMapper = (uPos, height, depth = 0) => toWorld3(TRANSEPT_CENTER_A + uPos, side * (25 - depth), height);
    const mapOut: FaceMapper = (uPos, height, depth = 0) => toWorld3(TRANSEPT_CENTER_A + uPos, side * (25 + depth), height);
    for (const endSide of [-1, 1]) {
      drawProfileWall(S, mapWall, sideNormal, endSide * 8.8, endSide * 4, 3.1, floorY, (uPos) => sweepCoping((8.8 - Math.abs(uPos)) / 4.8, floorY + 5.2, floorY + 8.0), COLORS.render, COLORS.tile, 10);
      drawCornerFinial(S, mapWall, endSide * 8.65, floorY + 5.2, endSide);
      drawGableBracket(S, mapWall, endSide * 4.3, floorY + 7.8, -endSide);
      S.kind = KIND.PLAIN;
      S.quad(toWorld3(TRANSEPT_CENTER_A + endSide * 8.8, side * 25, floorY), toWorld3(TRANSEPT_CENTER_A + endSide * 8.8, side * 21.9, floorY), toWorld3(TRANSEPT_CENTER_A + endSide * 8.8, side * 21.9, floorY + 5.75), toWorld3(TRANSEPT_CENTER_A + endSide * 8.8, side * 25, floorY + 5.75), COLORS.render, [FWD[0] * endSide, 0, FWD[1] * endSide]);
    }
    S.kind = KIND.MASONRY;
    frameBox(S, TRANSEPT_CENTER_A, side * 24.6, floorY, floorY + 1.0, 17.8, 0.9, COLORS.stoneDark);
    S.kind = KIND.PLAIN;
    frameBox(S, TRANSEPT_CENTER_A, side * 23.5, floorY + 1.0, floorY + 14.5, 8, 3, COLORS.render, { top: COLORS.renderLight });
    frameBox(S, TRANSEPT_CENTER_A, side * 23.5, floorY + 14.5, floorY + 14.8, 8.6, 3.3, COLORS.trim);
    frameBox(S, TRANSEPT_CENTER_A, side * 23.4, floorY + 14.8, floorY + 16.4, 4.6, 2.6, COLORS.render, { top: COLORS.renderLight });
    frameBox(S, TRANSEPT_CENTER_A, side * 23.4, floorY + 16.4, floorY + 16.65, 5.0, 2.8, COLORS.trim);
    frameBox(S, TRANSEPT_CENTER_A, side * 23.4, floorY + 16.65, floorY + 17.9, 2.2, 2.4, COLORS.render, { top: COLORS.renderLight });
    S.beam(toWorld3(TRANSEPT_CENTER_A, side * 24.2, floorY + 17.9), toWorld3(TRANSEPT_CENTER_A, side * 24.2, floorY + 19.1), 0.16, 0.16, COLORS.cream);
    S.beam(toWorld3(TRANSEPT_CENTER_A - 0.35, side * 24.2, floorY + 18.7), toWorld3(TRANSEPT_CENTER_A + 0.35, side * 24.2, floorY + 18.7), 0.14, 0.14, COLORS.cream);
    drawArchWindow(S, mapOut, sideNormal, 3.4, 3.0, floorY + 6.2, floorY + 11.6, { frame: 0.4, grid: [0.6, 0.8], bar: 0.07 });
    for (const endSide of [-1, 1]) drawClaustra(S, mapOut, sideNormal, endSide * 6.4 - 1.6, endSide * 6.4 + 1.6, floorY + 1.6, floorY + 4.8, 0.4, 0.4);
    for (const doorOff of [-2.3, 0, 2.3]) {
      frameBox(S, TRANSEPT_CENTER_A + doorOff, side * 25.05, floorY, floorY + 3.5, 1.6, 0.1, COLORS.doorFrame);
      frameBox(S, TRANSEPT_CENTER_A + doorOff, side * 25.09, floorY, floorY + 3.3, 1.2, 0.1, COLORS.door);
    }
    frameBox(S, TRANSEPT_CENTER_A, side * 26.3, floorY + 4.0, floorY + 4.4, 7.4, 2.6, COLORS.trim);
    frameHip(S, TRANSEPT_CENTER_A, side * 26.3, 7.4, 2.6, floorY + 4.4, 0.8, COLORS.tile, { over: 0.4, flare: 0.2, segs: 2 });
    S.kind = KIND.PLAIN;
    for (const pierOff of [-3.4, -1.15, 1.15, 3.4]) frameBox(S, TRANSEPT_CENTER_A + pierOff, side * 27.3, floorY - 1.6, floorY + 4.0, 0.42, 0.42, COLORS.pier);
    S.kind = KIND.ROAD;
    frameBox(S, TRANSEPT_CENTER_A, side * 26.5, floorY - 1.6, floorY - 0.05, 8.4, 3.0, COLORS.pave);
    for (const winA of [34.2, 55.8]) drawPointedWindowB(S, winA, side * 19.4, side, 1.8, floorY + 1.3, floorY + 5.8);
  }

  // west end: choir ambulatory, elliptical apse, four round chapels, and far west polygonal hall
  const choirRing: [number, number][] = [[58, -14.5], [63.3, -13.3], [68.5, -10.3], [71.4, -6.5], [70.6, 8.2], [67, 11.6], [62.3, 14.2], [57.1, 14.8]];
  S.kind = KIND.PLAIN;
  S.prism(choirRing.map(([along, across]) => toWorld(along, across)), floorY, floorY + 5.2, COLORS.render, COLORS.tileDark, { top: false });
  S.kind = KIND.TILE;
  S.prism(choirRing.map(([along, across]) => toWorld(along, across)), floorY + 5.0, floorY + 6.6, COLORS.tile, COLORS.tile, { scaleTop: 0.82, centre: toWorld(63, 0.6) });

  const apseCenter: [number, number] = [TRANSEPT_CENTER_A + TRANSEPT_HALF_W, 0.8];
  const apsePts: [number, number][] = [];
  for (let i = 0; i <= 8; i++) {
    const angle = -Math.PI / 2 + (i / 8) * Math.PI;
    apsePts.push([apseCenter[0] + 13.3 * Math.cos(angle), apseCenter[1] + 6.6 * Math.sin(angle)]);
  }
  S.kind = KIND.PLAIN;
  S.prism(apsePts.map(([along, across]) => toWorld(along, across)), floorY, floorY + 12, COLORS.render, COLORS.tileDark);
  frameBox(S, apseCenter[0] + 0.1, apseCenter[1], floorY + 11.5, floorY + 12.2, 0.2, 13.4, COLORS.trim);

  const apseApex = toWorld3(apseCenter[0] + 0.3, apseCenter[1], floorY + 17.5);
  const apseEaves = apsePts.map(([along, across]) => toWorld3(apseCenter[0] + (along - apseCenter[0]) * 1.07, apseCenter[1] + (across - apseCenter[1]) * 1.07, floorY + 11.4));
  S.kind = KIND.TILE;
  for (let i = 0; i + 1 < apseEaves.length; i++) {
    const e0 = apseEaves[i];
    const e1 = apseEaves[i + 1];
    const mid: [number, number, number] = [(e0[0] + e1[0]) / 2, floorY + 12.1, (e0[2] + e1[2]) / 2];
    const norm: [number, number, number] = [mid[0] - apseApex[0], 2.5, mid[2] - apseApex[2]];
    S.tri(e0, mid, apseApex, COLORS.tile, norm);
    S.tri(mid, e1, apseApex, COLORS.tile, norm);
    S.beam(e0, apseApex, 0.22, 0.18, COLORS.tileDark);
  }
  S.kind = KIND.PLAIN;
  S.tri(apseEaves[0], apseEaves[apseEaves.length - 1], apseApex, COLORS.render, [-FWD[0], 0, -FWD[1]]);

  for (let i = 0; i < 8; i++) {
    const angle = -Math.PI / 2 + ((i + 0.5) / 8) * Math.PI;
    const pt = toWorld(apseCenter[0] + 13.36 * Math.cos(angle), apseCenter[1] + 6.64 * Math.sin(angle));
    const tnA = Math.cos(angle) / 13.3;
    const tnB = Math.sin(angle) / 6.6;
    const nLen = Math.hypot(tnA, tnB);
    const nwX = (FWD[0] * tnA + PERP[0] * tnB) / nLen;
    const nwZ = (FWD[1] * tnA + PERP[1] * tnB) / nLen;
    const winAng = Math.atan2(nwZ, nwX);
    const winW = 1.3;
    S.box(pt[0], pt[1], floorY + 6.6, floorY + 10.2, 0.14, winW, winAng, COLORS.glass);
    S.tri([pt[0] - (Math.sin(winAng) * winW) / 2, floorY + 10.2, pt[1] + (Math.cos(winAng) * winW) / 2], [pt[0] + (Math.sin(winAng) * winW) / 2, floorY + 10.2, pt[1] - (Math.cos(winAng) * winW) / 2], [pt[0], floorY + 11.0, pt[1]], COLORS.glass, [nwX, 0, nwZ]);
  }

  for (const [chapA, chapB] of [[58.6, 11.4], [65.4, 9.6], [58.6, -10.4], [65.4, -8.4]] as [number, number][]) {
    const pt = toWorld(chapA, chapB);
    S.kind = KIND.MASONRY;
    S.cyl(pt[0], pt[1], floorY, floorY + 1.0, 3.35, 3.35, 12, COLORS.stoneDark, { cap: false });
    S.kind = KIND.PLAIN;
    S.cyl(pt[0], pt[1], floorY + 1.0, floorY + 6.8, 3.3, 3.3, 12, COLORS.render, { cap: false });
    S.cyl(pt[0], pt[1], floorY + 6.5, floorY + 6.9, 3.45, 3.45, 12, COLORS.trim, { cap: false });
    for (let k = 0; k < 6; k++) {
      const ang = (k * Math.PI) / 3 + 0.26;
      S.box(pt[0] + Math.cos(ang) * 3.33, pt[1] + Math.sin(ang) * 3.33, floorY + 2.0, floorY + 5.4, 0.1, 0.8, ang, COLORS.glass);
    }
    S.kind = KIND.TILE;
    S.cyl(pt[0], pt[1], floorY + 6.8, floorY + 10.0, 3.95, 0.15, 12, COLORS.tile, { cap: false });
  }

  const hallPts: [number, number][] = [[67.6, -6.5], [71.4, -6.5], [77, -6.2], [80.6, -1.6], [80.4, 4.3], [76.5, 8.1], [70.6, 8.2], [67.6, 8.2]];
  const hallRing = hallPts.map(([along, across]) => toWorld(along, across));
  const hallCenter = toWorld(74.3, 0.9);
  const hallApex: [number, number, number] = [hallCenter[0], floorY + 12.6, hallCenter[1]];
  S.kind = KIND.PLAIN;
  S.prism(hallRing, floorY, floorY + 7.6, COLORS.render, COLORS.tileDark);
  S.kind = KIND.MASONRY;
  S.prism(hallRing, floorY, floorY + 1.0, COLORS.stoneDark, COLORS.stoneDark, { top: false });
  S.kind = KIND.TILE;
  for (let i = 0; i < hallRing.length; i++) {
    const outPt = (pt: [number, number]): [number, number, number] => {
      const dx = pt[0] - hallCenter[0];
      const dz = pt[1] - hallCenter[1];
      const dist = Math.hypot(dx, dz) || 1;
      return [pt[0] + (dx / dist) * 1.0, floorY + 7.1, pt[1] + (dz / dist) * 1.0];
    };
    const e0 = outPt(hallRing[i]);
    const e1 = outPt(hallRing[(i + 1) % hallRing.length]);
    S.tri(e0, e1, hallApex, COLORS.tile, [e0[0] + e1[0] - 2 * hallApex[0], 3, e0[2] + e1[2] - 2 * hallApex[2]]);
  }
  for (let i = 1; i + 2 < hallPts.length; i++) {
    const [a0, b0] = hallPts[i];
    const [a1, b1] = hallPts[i + 1];
    const p0 = toWorld(a0, b0);
    const p1 = toWorld(a1, b1);
    const mid = toWorld((a0 + a1) / 2, (b0 + b1) / 2);
    const dx = mid[0] - hallCenter[0];
    const dz = mid[1] - hallCenter[1];
    const dist = Math.hypot(dx, dz);
    S.kind = KIND.PLAIN;
    S.box(mid[0] + (dx / dist) * 0.08, mid[1] + (dz / dist) * 0.08, floorY + 2.0, floorY + 5.6, 1.6, 0.14, Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), COLORS.glass);
  }
}

// bell tower over the crossing (53 m with cross) and four crossing corner turrets
function buildBellTowerAndTurrets(S, floorY: number) {
  const midPt = toWorld(40, 0);
  const midGround = groundY(midPt[0], midPt[1]);
  const towerCenter = toWorld(TOWER_A, 0);
  S.kind = KIND.PLAIN;
  frameBox(S, TOWER_A, 0, floorY + 13, midGround + 25.2, 8.6, 8.6, COLORS.renderLight);
  for (let k = 0; k < 4; k++) {
    const angle = AXIS_ANGLE + (k * Math.PI) / 2;
    const h0 = k === 2 ? floorY + 22.4 : floorY + 18.2;
    const h1 = midGround + 24.4;
    const faceCenter = [towerCenter[0] + Math.cos(angle) * 4.3, towerCenter[1] + Math.sin(angle) * 4.3];
    const tangent = [-Math.sin(angle), Math.cos(angle)];
    drawClaustra(S, (uPos, height, depth = 0) => [faceCenter[0] + tangent[0] * uPos + Math.cos(angle) * depth, height, faceCenter[1] + tangent[1] * uPos + Math.sin(angle) * depth], [Math.cos(angle), 0, Math.sin(angle)], -2.8, 2.8, h0, h1, 0.56, 0.6);
  }
  frameBox(S, TOWER_A, 0, midGround + 24.9, midGround + 25.4, 9.4, 9.4, COLORS.trim);

  const drawTierOpenings = (y0: number, y1: number, radius: number, width: number, col: number[]) => {
    const apothem = radius * Math.cos(Math.PI / 8) + 0.04;
    for (let i = 0; i < 8; i++) {
      const angle = AXIS_ANGLE + Math.PI / 4 + (i * Math.PI) / 4;
      S.kind = KIND.PLAIN;
      S.box(towerCenter[0] + Math.cos(angle) * apothem, towerCenter[1] + Math.sin(angle) * apothem, y0, y1, 0.1, width, angle, col);
    }
  };
  const tiers: [number, number, number, number, number[]][] = [
    [25.2, 29.7, 4.9, 8.4, COLORS.slate],
    [30.5, 34.0, 4.8, 6.6, COLORS.door],
    [34.8, 38.3, 3.1, 4.8, COLORS.door],
  ];
  for (const [t0, t1, radius, skirtR, openCol] of tiers) {
    frameOct(S, TOWER_A, 0, midGround + t0 - 0.8, midGround + t1, radius, radius, COLORS.renderLight, KIND.PLAIN);
    drawTierOpenings(midGround + t0 + 0.5, midGround + t1 - 0.7, radius, radius * 0.42, openCol);
    const eaveY = midGround + t1 - 0.5;
    const midR = radius + (skirtR - radius) * 0.42;
    frameOct(S, TOWER_A, 0, eaveY - 0.3, eaveY, skirtR, skirtR, COLORS.trim, KIND.PLAIN);
    S.kind = KIND.PLAIN;
    for (let i = 0; i < 8; i++) {
      const a0 = AXIS_ANGLE + Math.PI / 8 + (i * Math.PI) / 4;
      const a1 = a0 + Math.PI / 4;
      const soffitY = eaveY - 0.3;
      const ringPt = (ang: number, rad: number): [number, number, number] => [towerCenter[0] + Math.cos(ang) * rad, soffitY, towerCenter[1] + Math.sin(ang) * rad];
      S.quad(ringPt(a0, radius), ringPt(a1, radius), ringPt(a1, skirtR), ringPt(a0, skirtR), COLORS.soffit, [0, -1, 0]);
    }
    frameOct(S, TOWER_A, 0, eaveY, eaveY + 0.55, skirtR + 0.05, midR, COLORS.skirt, KIND.TILE);
    frameOct(S, TOWER_A, 0, eaveY + 0.55, eaveY + 2.0, midR, radius * 0.72, COLORS.skirt, KIND.TILE);
  }
  frameOct(S, TOWER_A, 0, midGround + 30.6, midGround + 31.6, 5.0, 5.0, COLORS.trim, KIND.PLAIN);
  const spireBaseY = midGround + 38.5;
  const crossBaseY = midGround + 50.0;
  frameOct(S, TOWER_A, 0, spireBaseY, crossBaseY + 0.2, 1.7, 0.1, COLORS.spire, KIND.TILE);
  S.kind = KIND.PLAIN;
  S.beam([towerCenter[0], crossBaseY, towerCenter[1]], [towerCenter[0], midGround + 53, towerCenter[1]], 0.3, 0.3, COLORS.cream);
  S.beam(toWorld3(TOWER_A, -0.9, crossBaseY + 2.0), toWorld3(TOWER_A, 0.9, crossBaseY + 2.0), 0.28, 0.28, COLORS.cream);

  for (const turretA of [36.2, 54.6]) {
    for (const side of [-1, 1]) {
      const turretB = side * 20.4;
      const topY = floorY + 13.0;
      S.kind = KIND.PLAIN;
      frameBox(S, turretA, turretB, floorY, topY, 3.0, 3.0, COLORS.render);
      frameBox(S, turretA, turretB, topY - 0.3, topY, 3.4, 3.4, COLORS.trim);
      for (const [da, db] of [[-1.52, 0], [1.52, 0], [0, -1.52], [0, 1.52]] as [number, number][]) {
        frameBox(S, turretA + da, turretB + db, floorY + 10.3, floorY + 12.3, da ? 0.1 : 1.6, da ? 1.6 : 0.1, COLORS.door);
      }
      S.kind = KIND.TILE;
      S.quad(toWorld3(turretA - 1.8, turretB - 1.8, topY), toWorld3(turretA + 1.8, turretB - 1.8, topY), toWorld3(turretA + 1.8, turretB, topY + 1.8), toWorld3(turretA - 1.8, turretB, topY + 1.8), COLORS.tile, [-PERP[0], 1, -PERP[1]]);
      S.quad(toWorld3(turretA + 1.8, turretB + 1.8, topY), toWorld3(turretA - 1.8, turretB + 1.8, topY), toWorld3(turretA - 1.8, turretB, topY + 1.8), toWorld3(turretA + 1.8, turretB, topY + 1.8), COLORS.tile, [PERP[0], 1, PERP[1]]);
      S.kind = KIND.PLAIN;
      for (const endSide of [-1, 1]) S.tri(toWorld3(turretA + endSide * 1.5, turretB - 1.5, topY), toWorld3(turretA + endSide * 1.5, turretB + 1.5, topY), toWorld3(turretA + endSide * 1.5, turretB, topY + 1.7), COLORS.render, [FWD[0] * endSide, 0, FWD[1] * endSide]);
    }
  }
  return { towerCenter, midGround, spireBaseY, crossBaseY };
}

// grotto, precinct fence & gates, infill clearing, and night lights
function buildGroundsAndLights(S, data, group, floorY: number, forecourtY: number, towerInfo: { towerCenter: [number, number]; midGround: number; spireBaseY: number; crossBaseY: number }) {
  const grottoPt: [number, number] = [664.8, 1244.5];
  const grottoY = groundY(grottoPt[0], grottoPt[1]);
  S.base = grottoY - LAND_Y;
  S.kind = KIND.MASONRY;
  S.cyl(grottoPt[0], grottoPt[1], grottoY - 0.3, grottoY + 3.6, 3.4, 1.4, 7, COLORS.grottoRock, { rot: 0.3 });
  S.cyl(grottoPt[0] + 1.2, grottoPt[1] - 0.6, grottoY - 0.3, grottoY + 2.2, 2.4, 0.8, 6, COLORS.grottoRockAlt, { rot: 1.1 });
  S.kind = KIND.PLAIN;
  const statuePt = [grottoPt[0] - FWD[0] * 1.5, grottoPt[1] - FWD[1] * 1.5];
  S.cyl(statuePt[0], statuePt[1], grottoY + 0.9, grottoY + 2.5, 0.32, 0.22, 6, COLORS.white);
  S.cyl(statuePt[0], statuePt[1], grottoY + 2.5, grottoY + 2.8, 0.16, 0.14, 5, COLORS.white);
  S.base = floorY - LAND_Y;

  const centerRef = toWorld(40, 0);
  const roads = roadsNear(data, centerRef, 220);
  const blds = buildingsNear(data, centerRef, 220);
  fence(S, PRECINCT, RAIL_STYLE, { roads, openings: GATES, solid: blds });
  for (const [gx, gz, halfW] of GATES) {
    let bestEdge: [number, number, number] = [1, 0, 1];
    let bestDist = 1e9;
    for (let i = 0; i < PRECINCT.length; i++) {
      const p0 = PRECINCT[i];
      const p1 = PRECINCT[(i + 1) % PRECINCT.length];
      const dx = p1[0] - p0[0];
      const dz = p1[1] - p0[1];
      const lenSq = dx * dx + dz * dz;
      const frac = Math.max(0, Math.min(1, ((gx - p0[0]) * dx + (gz - p0[1]) * dz) / lenSq));
      const dist = Math.hypot(p0[0] + dx * frac - gx, p0[1] + dz * frac - gz);
      if (dist < bestDist) {
        bestDist = dist;
        bestEdge = [dx, dz, Math.sqrt(lenSq)];
      }
    }
    const dirX = bestEdge[0] / bestEdge[2];
    const dirZ = bestEdge[1] / bestEdge[2];
    leaves(S, [gx - dirX * halfW, gz - dirZ * halfW], [gx + dirX * halfW, gz + dirZ * halfW], groundY(gx, gz), 2.2, COLORS.gateIron);
  }
  S.kind = KIND.PLAIN;
  S.base = 0;

  if (Array.isArray(data.infill)) {
    const infill = data.infill;
    const stride = 8;
    const kept: number[] = [];
    const nearLimit = data.meta?.counts?.infillNear ?? infill.length / stride;
    let nearKept = 0;
    for (let i = 0; i < infill.length / stride; i++) {
      const x = infill[i * stride] / 10;
      const z = infill[i * stride + 1] / 10;
      if (x > 648 && inRing(x, z, PRECINCT)) continue;
      if (i < nearLimit) nearKept++;
      for (let j = 0; j < stride; j++) kept.push(infill[i * stride + j]);
    }
    if (kept.length !== infill.length) {
      infill.length = 0;
      for (const val of kept) infill.push(val);
      if (data.meta?.counts && data.meta.counts.infillNear != null) data.meta.counts.infillNear = nearKept;
    }
  }

  const { towerCenter, midGround, spireBaseY, crossBaseY } = towerInfo;
  const crossBuf = new Buf(256);
  crossBuf.beam([towerCenter[0], crossBaseY - 0.05, towerCenter[1]], [towerCenter[0], midGround + 53.1, towerCenter[1]], 0.36, 0.36, [1, 1, 1]);
  crossBuf.beam(toWorld3(TOWER_A, -0.95, crossBaseY + 2.0), toWorld3(TOWER_A, 0.95, crossBaseY + 2.0), 0.34, 0.34, [1, 1, 1]);
  for (let i = 0; i < 4; i++) {
    const ang = AXIS_ANGLE + Math.PI / 8 + (i * Math.PI) / 2;
    crossBuf.beam([towerCenter[0] + Math.cos(ang) * 2.45, spireBaseY, towerCenter[1] + Math.sin(ang) * 2.45], [towerCenter[0] + Math.cos(ang) * 0.2, crossBaseY, towerCenter[1] + Math.sin(ang) * 0.2], 0.12, 0.12, [1, 1, 1]);
  }
  const crossMesh = makeLightMesh(crossBuf, lightMaterial(0xf4f1ff, 1.4));

  const warmBuf = new Buf(128);
  for (const bPos of [-3.35, 0, 3.35]) {
    const pt = toWorld(-0.18, bPos);
    warmBuf.box(pt[0], pt[1], floorY + 0.1, floorY + 3.6, 0.12, 1.7, AXIS_ANGLE, [1, 1, 1]);
  }
  const winGlowPt = toWorld(-0.2, 0);
  warmBuf.box(winGlowPt[0], winGlowPt[1], floorY + FRONT_WIN_SILL + 0.1, floorY + FRONT_WIN_SPRING, 0.12, FRONT_WIN_W - 0.3, AXIS_ANGLE, [1, 1, 1]);
  const warmMesh = makeLightMesh(warmBuf, lightMaterial(0xffc982, 1.1));

  const positions: number[] = [];
  const colors: number[] = [];
  const addLamp = (pt: [number, number], height: number, col = [1, 0.85, 0.6]) => {
    positions.push(pt[0], height, pt[1]);
    colors.push(...col);
  };
  for (const side of [-1, 1]) {
    addLamp(toWorld(-2.8, side * 13), floorY + 0.4, [1, 0.92, 0.75]);
    addLamp(toWorld(-12, side * 15), forecourtY + 3.2);
  }
  for (const [gx, gz] of GATES) addLamp([gx, gz], groundY(gx, gz) + 3.6);
  const glow = glowPoints(positions, colors, 4);
  glow.userData.glow = true;
  for (const mesh of [crossMesh, warmMesh, glow]) {
    mesh.userData.landmark = id;
    group.add(mesh);
  }
}

function makeLightMesh(buf: Buf, mat) {
  const mesh = new THREE.Mesh(buf.geometry(), mat);
  mesh.renderOrder = 19;
  return mesh;
}

export function build({ data, S, group }) {
  let maxG = -1e9;
  for (const [along, across] of PLAN) {
    const pt = toWorld(along, across);
    maxG = Math.max(maxG, groundY(pt[0], pt[1]));
  }
  const floorY = maxG + 0.6;
  const forecourtY = Math.max(...[[-2, -16], [-2, 16], [-30, 16], [-30, -16], [-20, 0]].map(([along, across]) => {
    const pt = toWorld(along, across);
    return groundY(pt[0], pt[1]);
  })) + 0.3;
  S.base = floorY - LAND_Y;

  buildFrontAndForecourt(S, data, floorY, forecourtY);
  buildNaveTranseptAndApse(S, floorY);
  const towerInfo = buildBellTowerAndTurrets(S, floorY);
  buildGroundsAndLights(S, data, group, floorY, forecourtY, towerInfo);
}
