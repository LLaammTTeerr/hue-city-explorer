import * as THREE from 'three';
import { KIND, Buf, hex, shade, inRing } from '../../geo/buf.ts';
import { LAND_Y } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { glowPoints, lightMaterial } from '../../geo/materials.ts';
import { fence, roadsNear, buildingsNear, offStreets, FENCE } from '../enclosure.ts';

// Nhà thờ chính tòa Phủ Cam (Ngô Viết Thụ; begun 1963, finished May 2000) on Phước Quả hill. See docs/places/phucam.md.
export const id = 'phucam';

const AXIS_ANG = (71 * Math.PI) / 180;
const DIR_FWD = [Math.cos(AXIS_ANG), Math.sin(AXIS_ANG)];
const DIR_PERP = [-DIR_FWD[1], DIR_FWD[0]];
const ORIGIN = [-128.168, 1763.405];
const toWorld2 = (a, b): [number, number] => [ORIGIN[0] + DIR_FWD[0] * a + DIR_PERP[0] * b, ORIGIN[1] + DIR_FWD[1] * a + DIR_PERP[1] * b];
const toWorld3 = (a, b, h) => { const pt = toWorld2(a, b); return [pt[0], h, pt[1]]; };
const groundY = (x, z) => LAND_Y + rise(x, z);

const PRECINCT = [
  [-205.3, 1752.1], [-197.4, 1776.8], [-179.9, 1830.1], [-94.4, 1838], [-55.6, 1840], [-49.8, 1786.1], [-83.5, 1782.6],
  [-88.1, 1740.8], [-117, 1732.1], [-122.8, 1709.4], [-144.3, 1715.3], [-159.6, 1719], [-167.8, 1721.1],
];
const GATES = [[-145.0, 1713.4, 2.6], [-159.8, 1717.6, 1.4], [-198.6, 1773.2, 3.0], [-89.3, 1838.3, 3.0]];
const YARD = [[-23.5, 16], [-23.5, -14], [-20, -26], [-6, -32], [6, -30], [10, -14], [10, 14], [8, 38], [-8, 34], [-18, 16]];
const CHURCH_OUTLINE = [
  [-0.8, 11], [4.5, 16.6], [10.6, 11.6], [39.6, 11.6], [39.6, 21.3], [60.3, 21.3], [60.3, 10.4], [70.8, 10.4],
  [74.4, 6.2], [75.7, 0], [74.4, -6.2], [70.8, -10.4], [60.3, -10.4], [60.3, -21.3], [39.6, -21.3], [39.6, -11.6],
  [10.6, -11.6], [4.5, -16.6], [-0.8, -11],
];

const COLORS = {
  stone: hex('#858480'),
  stoneLight: hex('#a3a19b'),
  stoneDark: hex('#64625e'),
  tile: hex('#985440'),
  tileDark: hex('#7a4333'),
  lattice: hex('#c9c8bd'),
  cream: hex('#e9dcb4'),
  conc: hex('#bdbcb5'),
  concLight: hex('#cfcdc5'),
  slab: hex('#c6c5bf'),
  glass: hex('#4b5a68'),
  door: hex('#3a2c24'),
  white: hex('#efeae0'),
  pave: hex('#c4bba9'),
  lawn: hex('#86a05e'),
  panel: hex('#d6d3ca'),
  asphalt: hex('#7b7873'),
};

function buildPlinthAndForecourt(data, S, box, yardY, floorY) {
  S.kind = KIND.MASONRY;
  S.prism(offStreets(data, CHURCH_OUTLINE.map(([a, b]) => toWorld2(a, b)), 0), floorY - 4, floorY, COLORS.stoneDark, COLORS.pave, { topKind: KIND.ROAD });

  let minYardG = yardY;
  for (const [a, b] of YARD) minYardG = Math.min(minYardG, groundY(...toWorld2(a, b)));
  const pavedStart = S.n;
  S.prism(YARD.map(([a, b]) => toWorld2(a, b)), minYardG - 0.5, yardY, COLORS.stoneDark, COLORS.asphalt, { topKind: KIND.ROAD });
  (S.paved = S.paved || []).push([pavedStart, S.n]);

  S.kind = KIND.ROAD;
  for (let i = 0; i < 3; i++) box(-1.2 + i * 0.5, 0, yardY - 0.2, yardY + 0.3 * (i + 1), 1.2, 11.2 - i * 0.6, COLORS.pave);

  const northFootY = groundY(...toWorld2(-27, 0));
  const upperSteps = Math.max(4, Math.round((yardY - northFootY) / 0.17));
  for (let i = 0; i < upperSteps; i++) {
    const frac = (i + 1) / upperSteps;
    box(-27 + (3.5 * (i + 0.5)) / upperSteps, 0, northFootY - 0.6, northFootY + (yardY - northFootY) * frac, 3.5 / upperSteps + 0.02, 6.4, COLORS.pave);
  }
  S.kind = KIND.MASONRY;
  for (const side of [-1, 1]) {
    const ptA = toWorld2(-27, side * 3.5), ptB = toWorld2(-23.5, side * 3.5);
    S.beam([ptA[0], northFootY + 0.3, ptA[1]], [ptB[0], yardY + 0.6, ptB[1]], 0.5, 1.0, COLORS.stoneLight);
    const p0 = toWorld2(-23.3, side * 3.75), p1 = toWorld2(-23.3, side * (side > 0 ? 16 : 14));
    S.beam([p0[0], yardY + 0.45, p0[1]], [p1[0], yardY + 0.45, p1[1]], 0.35, 0.9, COLORS.stoneLight);
  }

  const drapeStrip = (aStart, aEnd, b, width, col, lift) => {
    for (let a = aStart; a < aEnd - 0.01; a += 2.5) {
      const aNext = Math.min(aEnd, a + 2.5);
      const q0 = toWorld2(a, b), q1 = toWorld2(aNext, b);
      const h0 = groundY(q0[0], q0[1]), h1 = groundY(q1[0], q1[1]);
      box((a + aNext) / 2, b, Math.min(h0, h1) - 0.4, (h0 + h1) / 2 + lift, aNext - a + 0.02, width, col);
    }
  };
  S.kind = KIND.ROAD;
  drapeStrip(-48.4, -27, 0, 3.6, COLORS.pave, 0.14);
  S.kind = KIND.PLAIN;
  for (const side of [-1, 1]) drapeStrip(-47, -27.5, side * 5.4, 7.2, COLORS.panel, 0.08);
  S.kind = KIND.ROAD;
  const gateFootY = groundY(...toWorld2(-52.4, 0)), pathTopY = groundY(...toWorld2(-48.4, 0)) + 0.14;
  for (let i = 0; i < 5; i++) box(-52.4 + i * 0.8 + 0.4, 0, gateFootY - 0.6, gateFootY + ((pathTopY - gateFootY) * (i + 1)) / 5 + 0.15, 0.82, 4.4, COLORS.pave);
}

function buildNaveTranseptAndRoofs(data, S, box, floorY) {
  const lowerH = 4.2, slabH = 0.45, eaveH = 14, ridgeNave = 21.2, ridgeChoir = 20.4;
  const naveHalf = 6.8, transA0 = 41.9, transA1 = 57.9, transHalf = 20.2, choirHalf = 6.2, choirEnd = 67.5;
  const slabTopY = floorY + lowerH + slabH;

  const lowerRing = CHURCH_OUTLINE.slice(3, -3);
  lowerRing.unshift([10.6, 11.6]);
  lowerRing.push([10.6, -11.6]);
  const area = lowerRing.reduce((sum, pt, i) => { const next = lowerRing[(i + 1) % lowerRing.length]; return sum + pt[0] * next[1] - next[0] * pt[1]; }, 0);
  const sgn = area > 0 ? -1 : 1;
  const offsetPoly = (ring, dist) => ring.map((pt, i) => {
    const prev = ring[(i + ring.length - 1) % ring.length], next = ring[(i + 1) % ring.length];
    const edgeNorm = (u, v) => { const len = Math.hypot(v[0] - u[0], v[1] - u[1]); return [sgn * (v[1] - u[1]) / len, -sgn * (v[0] - u[0]) / len]; };
    const n0 = edgeNorm(prev, pt), n1 = edgeNorm(pt, next);
    const miter = [n0[0] + n1[0], n0[1] + n1[1]];
    const scale = dist / Math.max(0.35, miter[0] * n0[0] + miter[1] * n0[1]);
    return [pt[0] + miter[0] * scale, pt[1] + miter[1] * scale];
  });

  const recessedRing = offsetPoly(lowerRing, 1.0);
  S.kind = KIND.MASONRY;
  S.prism(recessedRing.map(([a, b]) => toWorld2(a, b)), floorY, floorY + lowerH, COLORS.stoneDark, COLORS.slab);
  S.prism(offStreets(data, offsetPoly(lowerRing, -0.9).map(([a, b]) => toWorld2(a, b)), 0), floorY + lowerH, slabTopY, COLORS.slab, COLORS.slab);

  S.kind = KIND.PLAIN;
  for (let i = 0; i < recessedRing.length; i++) {
    const ptA = recessedRing[i], ptB = recessedRing[(i + 1) % recessedRing.length];
    const edgeLen = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
    if (edgeLen < 3 || (ptA[0] < 11 && ptB[0] < 11)) continue;
    const tan = [(ptB[0] - ptA[0]) / edgeLen, (ptB[1] - ptA[1]) / edgeLen], norm = [sgn * tan[1], -sgn * tan[0]];
    for (let k = 1, count = Math.floor(edgeLen / 4); k < count; k++) {
      const dist = (k * edgeLen) / count;
      const worldPt = toWorld2(ptA[0] + tan[0] * dist + norm[0] * 0.06, ptA[1] + tan[1] * dist + norm[1] * 0.06);
      const isDoor = (k + i) % 2 === 0;
      S.box(worldPt[0], worldPt[1], isDoor ? floorY + 0.1 : floorY + 1.0, isDoor ? floorY + 2.6 : floorY + 3.0, isDoor ? 1.2 : 1.6, 0.14, AXIS_ANG + Math.atan2(tan[1], tan[0]), isDoor ? COLORS.door : COLORS.stoneDark);
    }
  }

  // Upper church body & five-sided apse
  box((9.4 + transA0) / 2, 0, slabTopY, floorY + eaveH, transA0 - 9.4, 2 * naveHalf, COLORS.conc, { top: COLORS.tileDark });
  box((transA0 + transA1) / 2, 0, slabTopY, floorY + eaveH, transA1 - transA0, 2 * transHalf, COLORS.conc, { top: COLORS.tileDark });
  box((transA1 + choirEnd) / 2, 0, slabTopY, floorY + eaveH, choirEnd - transA1, 2 * choirHalf, COLORS.conc, { top: COLORS.tileDark });

  const apsePts = [];
  for (let i = 0; i <= 5; i++) {
    const theta = -Math.PI / 2 + (i * Math.PI) / 5;
    apsePts.push([choirEnd + 6.4 * Math.cos(theta), choirHalf * Math.sin(theta)]);
  }
  for (let i = 0; i + 1 < apsePts.length; i++) {
    const [a0, b0] = apsePts[i], [a1, b1] = apsePts[i + 1];
    const mid = toWorld2((a0 + a1) / 2, (b0 + b1) / 2), centerPt = toWorld2(choirEnd, 0);
    S.quad(toWorld3(a0, b0, slabTopY), toWorld3(a1, b1, slabTopY), toWorld3(a1, b1, floorY + eaveH), toWorld3(a0, b0, floorY + eaveH), COLORS.conc, [mid[0] - centerPt[0], 0, mid[1] - centerPt[1]]);
  }
  S.prism(apsePts.map(([a, b]) => toWorld2(a, b)), floorY + eaveH - 0.3, floorY + eaveH, COLORS.conc, COLORS.tileDark);
  S.kind = KIND.PLAIN;
  for (const [a, la, lb] of ([[(9.4 + transA0) / 2, transA0 - 9.4 + 0.2, 2 * naveHalf + 0.3], [(transA0 + transA1) / 2, transA1 - transA0 + 0.3, 2 * transHalf + 0.3], [(transA1 + choirEnd) / 2, choirEnd - transA1 + 0.2, 2 * choirHalf + 0.3]] as any[])) {
    box(a, 0, floorY + eaveH - 0.6, floorY + eaveH, la, lb, COLORS.concLight);
  }

  // Pitched terracotta roofs & apse hip
  const over = 0.9;
  S.kind = KIND.TILE;
  const drawPitch = (alongA, p0, p1, centerPos, halfW, ridgeY, col, gables = [true, true]) => {
    const ptAt = (u, v, h) => (alongA ? toWorld3(u, centerPos + v, h) : toWorld3(centerPos + v, u, h));
    const slope = (ridgeY - floorY - eaveH) / halfW, eaveOutY = floorY + eaveH - slope * over;
    for (const side of [-1, 1]) {
      S.quad(ptAt(p0, side * (halfW + over), eaveOutY), ptAt(p1, side * (halfW + over), eaveOutY), ptAt(p1, 0, ridgeY), ptAt(p0, 0, ridgeY), col, alongA ? [DIR_PERP[0] * side, 1.2, DIR_PERP[1] * side] : [DIR_FWD[0] * side, 1.2, DIR_FWD[1] * side]);
    }
    S.kind = KIND.MASONRY;
    [p0, p1].forEach((u, i) => {
      if (gables[i]) S.tri(ptAt(u, -halfW, floorY + eaveH), ptAt(u, halfW, floorY + eaveH), ptAt(u, 0, ridgeY - 0.2), COLORS.conc, alongA ? [DIR_FWD[0] * (i ? 1 : -1), 0, DIR_FWD[1] * (i ? 1 : -1)] : [DIR_PERP[0] * (i ? 1 : -1), 0, DIR_PERP[1] * (i ? 1 : -1)]);
    });
    S.kind = KIND.TILE;
    S.beam(ptAt(p0, 0, ridgeY + 0.1), ptAt(p1, 0, ridgeY + 0.1), 0.45, 0.35, shade(col, 0.82));
  };
  drawPitch(true, 9.5, transA0 + 3, 0, naveHalf, floorY + ridgeNave, COLORS.tile, [true, false]);
  drawPitch(false, -transHalf - over, transHalf + over, (transA0 + transA1) / 2, (transA1 - transA0) / 2, floorY + ridgeNave, COLORS.tile);
  drawPitch(true, transA1 - 2, choirEnd, 0, choirHalf, floorY + ridgeChoir, COLORS.tile, [false, false]);

  const apseSlope = (ridgeChoir - eaveH) / choirHalf, apseEaveY = floorY + eaveH - apseSlope * over, apseApex = toWorld3(choirEnd, 0, floorY + ridgeChoir);
  const apseExt = apsePts.map(([a, b]) => { const dist = Math.hypot(a - choirEnd, b) || 1; return toWorld3(a + ((a - choirEnd) / dist) * over, b + (b / dist) * over, apseEaveY); });
  for (let i = 0; i + 1 < apseExt.length; i++) {
    S.tri(apseExt[i], apseExt[i + 1], apseApex, COLORS.tile, [apseExt[i][0] + apseExt[i + 1][0] - 2 * apseApex[0], 2, apseExt[i][2] + apseExt[i + 1][2] - 2 * apseApex[2]]);
  }

  // Upper pilasters and parabolic-headed windows
  const drawWindow = (a, b, na, nb, width, y0, y1) => {
    const pos = toWorld2(a + na * 0.04, b + nb * 0.04);
    const norm = [DIR_FWD[0] * na + DIR_PERP[0] * nb, DIR_FWD[1] * na + DIR_PERP[1] * nb], tan = [-norm[1], norm[0]];
    const archH = width * 0.72, halfW = width / 2;
    const headY = (u) => y1 + archH * (1 - (u / halfW) ** 2);
    S.kind = KIND.PLAIN;
    S.box(pos[0], pos[1], y0, y1, width, 0.1, Math.atan2(tan[1], tan[0]), COLORS.glass);
    const ptAt = (u, h, d = 0.1): [number, number, number] => [pos[0] + tan[0] * u + norm[0] * d, h, pos[1] + tan[1] * u + norm[1] * d];
    const segs = 8;
    for (let i = 0; i < segs; i++) {
      const u0 = -halfW + (width * i) / segs, u1 = -halfW + (width * (i + 1)) / segs;
      S.quad(ptAt(u0, y1), ptAt(u1, y1), ptAt(u1, headY(u1)), ptAt(u0, headY(u0)), COLORS.glass, [norm[0], 0, norm[1]]);
    }
    const trimCol = shade(COLORS.concLight, 1.05), frameW = 0.32;
    for (const side of [-1, 1]) S.beam(ptAt(side * (halfW + frameW / 2), y0, 0.18), ptAt(side * (halfW + frameW / 2), y1, 0.18), frameW, 0.3, trimCol);
    for (let i = 0; i < segs; i++) {
      const u0 = -halfW + (width * i) / segs, u1 = -halfW + (width * (i + 1)) / segs;
      const outerHead = (u) => y1 + (archH + frameW) * (1 - (u / (halfW + frameW / 2)) ** 2);
      const v0 = u0 * (1 + frameW / width), v1 = u1 * (1 + frameW / width);
      S.beam(ptAt(v0, outerHead(v0), 0.18), ptAt(v1, outerHead(v1), 0.18), frameW, 0.3, trimCol);
    }
    S.beam(ptAt(0, y0, 0.16), ptAt(0, headY(0), 0.16), 0.18, 0.18, trimCol);
    S.beam(ptAt(-halfW, y0 + (y1 - y0) * 0.62, 0.16), ptAt(halfW, y0 + (y1 - y0) * 0.62, 0.16), 0.18, 0.18, trimCol);
    S.beam(ptAt(-halfW - frameW, y0, 0.22), ptAt(halfW + frameW, y0, 0.22), 0.3, 0.3, trimCol);
  };
  const drawPilaster = (a, b, na, nb) => {
    S.kind = KIND.PLAIN;
    const pos = toWorld2(a + na * 0.25, b + nb * 0.25);
    S.box(pos[0], pos[1], slabTopY, floorY + eaveH - 0.3, 0.9, 0.5, AXIS_ANG + Math.atan2(nb, na) + Math.PI / 2, COLORS.concLight);
  };

  const winSill = slabTopY + 1.0, winSpring = floorY + eaveH - 3.2;
  for (const side of [-1, 1]) {
    const bay = (transA0 - 9.9) / 6;
    for (let i = 0; i <= 6; i++) drawPilaster(9.9 + i * bay, side * naveHalf, 0, side);
    for (let i = 0; i < 6; i++) drawWindow(9.9 + (i + 0.5) * bay, side * naveHalf, 0, side, 2.6, winSill, winSpring);
    for (let i = 0; i <= 2; i++) drawPilaster(transA1 + (i * (choirEnd - transA1)) / 2, side * choirHalf, 0, side);
    for (let i = 0; i < 2; i++) drawWindow(transA1 + ((i + 0.5) * (choirEnd - transA1)) / 2, side * choirHalf, 0, side, 2.1, winSill, winSpring);
    for (const a of [transA0 + 0.4, transA1 - 0.4]) drawPilaster(a, side * transHalf, 0, side);
    for (const a of [45.2, 49.9, 54.6]) drawWindow(a, side * transHalf, 0, side, 2.2, winSill, winSpring);
    for (const [faceA, na] of ([[transA0, -1], [transA1, 1]] as any[])) {
      for (const frac of [1 / 3, 2 / 3]) drawWindow(faceA, side * (naveHalf + (transHalf - naveHalf) * frac), na, 0, 2.0, winSill, winSpring);
      drawPilaster(faceA, side * (naveHalf + (transHalf - naveHalf) / 2), na, 0);
    }
    const gableWinPt = toWorld2((transA0 + transA1) / 2, side * (transHalf + 0.1));
    S.kind = KIND.PLAIN;
    S.cyl(gableWinPt[0], gableWinPt[1], floorY + eaveH + 3.0, floorY + eaveH + 6.0, 0.1, 0.1, 4, COLORS.glass, { cap: false });
    box((transA0 + transA1) / 2, side * (transHalf + 0.15), floorY + eaveH + 2.4, floorY + eaveH + 6.8, 2.4, 0.14, COLORS.glass);
  }
  for (let i = 0; i + 1 < apsePts.length; i++) {
    const [a0, b0] = apsePts[i], [a1, b1] = apsePts[i + 1], da = a1 - a0, db = b1 - b0, len = Math.hypot(da, db);
    let na = db / len, nb = -da / len;
    if (na * ((a0 + a1) / 2 - choirEnd) + nb * ((b0 + b1) / 2) < 0) { na = -na; nb = -nb; }
    drawWindow((a0 + a1) / 2, (b0 + b1) / 2, na, nb, 1.8, winSill, winSpring);
  }
  for (let i = 1; i + 1 < apsePts.length; i++) {
    const [a, b] = apsePts[i], dist = Math.hypot(a - choirEnd, b) || 1;
    const ang = AXIS_ANG + Math.atan2(b / dist, (a - choirEnd) / dist) + Math.PI / 2;
    const p1 = toWorld2(a + ((a - choirEnd) / dist) * 0.2, b + (b / dist) * 0.2);
    S.kind = KIND.PLAIN;
    S.box(p1[0], p1[1], slabTopY, floorY + eaveH - 0.3, 0.9, 0.5, ang, COLORS.concLight);
    const p2 = toWorld2(a + ((a - choirEnd) / dist) * 0.42, b + (b / dist) * 0.42);
    S.box(p2[0], p2[1], slabTopY, floorY + eaveH - 1.2, 0.5, 0.3, ang, shade(COLORS.concLight, 1.04));
  }
}

function buildWestFrontAndTowers(S, box, yardY, floorY) {
  // Narthex, concave stone shoulders, lattice strips, hood shell, porch & twin bell towers
  S.kind = KIND.MASONRY;
  box(7.6, 0, floorY, floorY + 15, 5.2, 11.4, COLORS.stone);
  const shB0 = 4.0, shB1 = 8.8, shA0 = 2.6, shA1 = 8.6;
  const shoulderY = (b) => { const frac = (Math.abs(b) - shB0) / (shB1 - shB0); return floorY + 15 + 7 * frac * frac; };

  for (const side of [-1, 1]) {
    const segs = 8;
    for (let i = 0; i < segs; i++) {
      const b0 = side * (shB0 + ((shB1 - shB0) * i) / segs), b1 = side * (shB0 + ((shB1 - shB0) * (i + 1)) / segs);
      const h0 = shoulderY(b0), h1 = shoulderY(b1);
      S.kind = KIND.MASONRY;
      S.quad(toWorld3(shA0, b0, yardY), toWorld3(shA0, b1, yardY), toWorld3(shA0, b1, h1), toWorld3(shA0, b0, h0), COLORS.stone, [-DIR_FWD[0], 0, -DIR_FWD[1]]);
      S.quad(toWorld3(shA1, b1, floorY), toWorld3(shA1, b0, floorY), toWorld3(shA1, b0, h0), toWorld3(shA1, b1, h1), COLORS.stone, [DIR_FWD[0], 0, DIR_FWD[1]]);
      S.kind = KIND.PLAIN;
      S.quad(toWorld3(shA0 - 0.1, b0, h0), toWorld3(shA0 - 0.1, b1, h1), toWorld3(shA1, b1, h1), toWorld3(shA1, b0, h0), COLORS.stoneLight, [0, 1, 0]);
    }
    S.kind = KIND.MASONRY;
    S.quad(toWorld3(shA1, side * shB0, floorY), toWorld3(shA0, side * shB0, yardY), toWorld3(shA0, side * shB0, floorY + 15), toWorld3(shA1, side * shB0, floorY + 15), COLORS.stone, [-DIR_PERP[0] * side, 0, -DIR_PERP[1] * side]);
    S.kind = KIND.PLAIN;
    box(shA0 - 0.06, side * (shB1 - 0.75), floorY + 3, floorY + 25.5, 0.14, 1.3, COLORS.lattice);
    for (let h = floorY + 3.4; h < floorY + 25.2; h += 0.9) {
      for (const du of [-0.4, 0, 0.4]) box(shA0 - 0.16, side * (shB1 - 0.75) + du, h, h + 0.4, 0.04, 0.3, COLORS.stoneDark);
    }
  }

  const hoodHalfB = 4.6, hoodTopY = floorY + 21, hoodBackA = 10.0;
  const hoodSegs = 14;
  const hoodTopAt = (b) => floorY + 14.6 + (hoodTopY - floorY - 14.6) * Math.sqrt(Math.max(0, 1 - (b / hoodHalfB) ** 2));
  const hoodFrontA = (b) => 4.0 + 0.9 * (b / hoodHalfB) ** 2;
  const hoodBotAt = (b) => Math.min(hoodTopAt(b), floorY + 15.4 + 3.2 * (b / hoodHalfB) ** 2);
  for (let i = 0; i < hoodSegs; i++) {
    const b0 = -hoodHalfB + (2 * hoodHalfB * i) / hoodSegs, b1 = -hoodHalfB + (2 * hoodHalfB * (i + 1)) / hoodSegs;
    const t0 = hoodTopAt(b0), t1 = hoodTopAt(b1), f0 = hoodFrontA(b0), f1 = hoodFrontA(b1);
    const norm = [-DIR_FWD[0] + DIR_PERP[0] * ((b0 + b1) / 2) * 0.12, 0, -DIR_FWD[1] + DIR_PERP[1] * ((b0 + b1) / 2) * 0.12];
    S.kind = KIND.MASONRY;
    S.quad(toWorld3(f0, b0, floorY + 14.6), toWorld3(f1, b1, floorY + 14.6), toWorld3(f1, b1, hoodBotAt(b1)), toWorld3(f0, b0, hoodBotAt(b0)), COLORS.stone, norm);
    S.kind = KIND.PLAIN;
    S.quad(toWorld3(f0 - 0.02, b0, hoodBotAt(b0)), toWorld3(f1 - 0.02, b1, hoodBotAt(b1)), toWorld3(f1, b1, t1), toWorld3(f0, b0, t0), COLORS.cream, norm);
    S.kind = KIND.MASONRY;
    S.quad(toWorld3(hoodBackA, b1, floorY + 14.6), toWorld3(hoodBackA, b0, floorY + 14.6), toWorld3(hoodBackA, b0, t0), toWorld3(hoodBackA, b1, t1), COLORS.stone, [DIR_FWD[0], 0, DIR_FWD[1]]);
    S.kind = KIND.PLAIN;
    S.quad(toWorld3(f0, b0, t0), toWorld3(f1, b1, t1), toWorld3(hoodBackA, b1, t1), toWorld3(hoodBackA, b0, t0), COLORS.stone, [0, 1, 0]);
    S.kind = KIND.MASONRY;
    S.quad(toWorld3(f1, b1, floorY + 14.6), toWorld3(f0, b0, floorY + 14.6), toWorld3(hoodBackA, b0, floorY + 14.6), toWorld3(hoodBackA, b1, floorY + 14.6), COLORS.stoneDark, [0, -1, 0]);
  }

  const gableCrossPt = toWorld2(5.4, 0);
  S.kind = KIND.PLAIN;
  S.beam([gableCrossPt[0], hoodTopY - 0.2, gableCrossPt[1]], [gableCrossPt[0], hoodTopY + 2.6, gableCrossPt[1]], 0.28, 0.28, COLORS.white);
  S.beam([gableCrossPt[0] - DIR_PERP[0] * 0.8, hoodTopY + 1.8, gableCrossPt[1] - DIR_PERP[1] * 0.8], [gableCrossPt[0] + DIR_PERP[0] * 0.8, hoodTopY + 1.8, gableCrossPt[1] + DIR_PERP[1] * 0.8], 0.26, 0.26, COLORS.white);

  box(4.95, 0, floorY + 11.0, floorY + 13.6, 0.2, 2.0, COLORS.glass);
  for (const b of [-1.0, -0.5, 0, 0.5, 1.0]) box(4.88, b, floorY + 11.0, floorY + 13.6, 0.12, 0.09, COLORS.lattice);
  for (let h = floorY + 11.0; h < floorY + 13.65; h += 0.52) box(4.88, 0, h - 0.045, h + 0.045, 0.12, 2.1, COLORS.lattice);
  S.kind = KIND.MASONRY;
  box(4.92, 0, floorY, floorY + 4.2, 0.2, 5.6, COLORS.door);
  S.kind = KIND.PLAIN;
  for (const b of [-1.9, 0, 1.9]) box(4.82, b, floorY + 0.2, floorY + 4.0, 0.08, 0.14, COLORS.stoneDark);
  for (const b of [-0.95, 0.95]) box(4.82, b, floorY + 0.2, floorY + 4.0, 0.08, 0.05, hex('#5a4636'));
  box(4.82, 0, floorY + 4.0, floorY + 4.25, 0.1, 5.8, COLORS.stoneDark);

  // Curved porch slab, planters, and side stairs
  S.kind = KIND.MASONRY;
  const porchRing = [[5.0, 4.2], [5.0, -4.2]];
  for (let i = 0; i <= 8; i++) { const b = -4.2 + (8.4 * i) / 8; porchRing.push([-2.0 - 1.5 * (1 - (b / 4.2) ** 2), b]); }
  S.prism(porchRing.map(([a, b]) => toWorld2(a, b)), floorY + 4.5, floorY + 5.0, COLORS.slab, COLORS.slab);
  for (const side of [-1, 1]) {
    box(-2.0, side * 10.2, yardY, yardY + 0.7, 0.5, 8.8, COLORS.stoneDark, { top: COLORS.stoneLight });
    box(-0.4, side * 9.7, yardY, yardY + 0.6, 2.8, 7.8, COLORS.stoneDark, { top: COLORS.lawn });
    S.kind = KIND.PLAIN;
    for (const [a, b] of ([[-0.6, 6.6], [-0.9, 8.4], [0.9, 7.6], [0.6, 10.0]] as any[])) {
      const shrubPt = toWorld2(a, side * b);
      S.cyl(shrubPt[0], shrubPt[1], yardY + 0.6, yardY + 2.0, 1.0, 0.45, 6, hex('#4f7a3a'));
    }
    S.kind = KIND.MASONRY;
    box(-0.8, side * 3.6, yardY, floorY + 4.5, 0.5, 0.5, COLORS.slab);

    const stairSteps = 28, pStart = [-0.6, side * 17.4], pEnd = [-0.6, side * 4.4];
    for (let i = 0; i < stairSteps; i++) {
      const t0 = i / stairSteps, t1 = (i + 1) / stairSteps;
      const q0 = toWorld2(pStart[0] + (pEnd[0] - pStart[0]) * t0, pStart[1] + (pEnd[1] - pStart[1]) * t0);
      const q1 = toWorld2(pStart[0] + (pEnd[0] - pStart[0]) * t1, pStart[1] + (pEnd[1] - pStart[1]) * t1);
      const segLen = Math.hypot(q1[0] - q0[0], q1[1] - q0[1]);
      S.box((q0[0] + q1[0]) / 2, (q0[1] + q1[1]) / 2, yardY + (floorY + 5.0 - yardY) * t0 - 0.4, yardY + (floorY + 5.0 - yardY) * t1, segLen + 0.02, 1.6, Math.atan2(q1[1] - q0[1], q1[0] - q0[0]), COLORS.stoneLight);
    }
    S.kind = KIND.PLAIN;
    const r0 = toWorld2(pStart[0] - 0.75, pStart[1]), r1 = toWorld2(pEnd[0] - 0.75, pEnd[1]);
    S.beam([r0[0], yardY + 1.0, r0[1]], [r1[0], floorY + 6.0, r1[1]], 0.08, 0.08, COLORS.white);
    S.kind = KIND.MASONRY;
  }

  // Twin bell towers
  const crossTops = [];
  const towerRot = AXIS_ANG + Math.PI / 4;
  const drawDiamond = (pos, y0, y1, side0, side1, col, kind = KIND.MASONRY) => {
    S.kind = kind;
    S.cyl(pos[0], pos[1], y0, y1, side0 / Math.SQRT2, side1 / Math.SQRT2, 4, col, { cap: true, rot: AXIS_ANG });
  };
  for (const side of [-1, 1]) {
    const basePt = toWorld2(5.2, side * 11.6), shifted = (dist) => toWorld2(5.2, side * (11.6 + dist));
    drawDiamond(basePt, yardY - 0.3, floorY + 33.2, 7.4, 6.2, COLORS.stone);
    drawDiamond(shifted(0.7), floorY + 33.2, floorY + 36.0, 4.6, 4.3, COLORS.stone);
    drawDiamond(shifted(1.2), floorY + 36.0, floorY + 38.4, 3.4, 3.1, COLORS.stone);
    drawDiamond(shifted(1.2), floorY + 38.4, floorY + 41.2, 3.1, 0.15, COLORS.stoneDark, KIND.TILE);
    for (let k = 0; k < 4; k++) {
      const faceAng = towerRot + (k * Math.PI) / 2, norm = [Math.cos(faceAng), Math.sin(faceAng)];
      if (norm[0] * -DIR_FWD[0] + norm[1] * -DIR_FWD[1] <= 0 || (norm[0] * -DIR_PERP[0] + norm[1] * -DIR_PERP[1]) * side <= 0) continue;
      S.kind = KIND.PLAIN;
      for (let j = 0; j < 6; j++) {
        const h0 = 2.5 + j * 5, h1 = h0 + 5, sideW = 7.4 - (1.2 * (h0 + 2.5 + 0.9)) / 34.1, rad = sideW / 2 + 0.05;
        S.box(basePt[0] + norm[0] * rad, basePt[1] + norm[1] * rad, floorY + h0, floorY + h1, 0.14, 0.7, faceAng, COLORS.door);
      }
    }
    const topPt = shifted(1.2), crossY = floorY + 41.0;
    S.kind = KIND.PLAIN;
    S.beam([topPt[0], crossY, topPt[1]], [topPt[0], crossY + 2.6, topPt[1]], 0.26, 0.26, COLORS.white);
    S.beam([topPt[0] - DIR_PERP[0] * 0.8, crossY + 1.8, topPt[1] - DIR_PERP[1] * 0.8], [topPt[0] + DIR_PERP[0] * 0.8, crossY + 1.8, topPt[1] + DIR_PERP[1] * 0.8], 0.24, 0.24, COLORS.white);
    crossTops.push([topPt, crossY]);
  }

  // St Peter & St Paul statues
  for (const side of [-1, 1]) {
    const pos = toWorld2(-19.5, side * 7);
    S.kind = KIND.MASONRY;
    S.box(pos[0], pos[1], yardY, yardY + 1.8, 1.5, 1.5, AXIS_ANG, COLORS.stoneLight, { top: COLORS.stoneLight });
    S.kind = KIND.PLAIN;
    S.cyl(pos[0], pos[1], yardY + 1.8, yardY + 3.6, 0.42, 0.3, 7, COLORS.white);
    S.cyl(pos[0], pos[1], yardY + 3.6, yardY + 4.0, 0.18, 0.16, 6, COLORS.white);
  }

  return { crossTops, gableCrossPt, hoodTopY };
}

export function build({ data, S, group }) {
  const center = toWorld2(40, 0);
  let maxGround = -1e9;
  for (const [a, b] of ([[0, 0], [10, -10], [10, 10], [40, -20], [40, 20], [59, -20], [59, 20], [74, 0], [40, 0]] as any[])) {
    const pt = toWorld2(a, b);
    maxGround = Math.max(maxGround, groundY(pt[0], pt[1]));
  }
  const yardY = groundY(...toWorld2(-6, 0)) + 0.05;
  const floorY = Math.max(maxGround + 0.3, yardY + 0.9);
  const box = (a, b, y0, y1, la, lb, col, opt: Record<string, any> = {}) => {
    const pt = toWorld2(a, b);
    S.box(pt[0], pt[1], y0, y1, la, lb, AXIS_ANG + (opt.rot || 0), col, opt);
  };
  S.base = floorY - LAND_Y;

  buildPlinthAndForecourt(data, S, box, yardY, floorY);
  buildNaveTranseptAndRoofs(data, S, box, floorY);
  const { crossTops, gableCrossPt, hoodTopY } = buildWestFrontAndTowers(S, box, yardY, floorY);

  // Precinct fence & raised garden beds
  const roads = roadsNear(data, center, 170), blds = buildingsNear(data, center, 130);
  fence(S, offStreets(data, PRECINCT), FENCE.church, { roads, openings: GATES, solid: blds });

  const churchWorld = CHURCH_OUTLINE.map(([a, b]) => toWorld2(a, b));
  const yardWorld = YARD.map(([a, b]) => toWorld2(a, b));
  const stairWorld = [[-49, -10], [-49, 10], [-23, 10], [-23, -10]].map(([a, b]) => toWorld2(a, b));
  const inChurchZone = (x, z) => inRing(x, z, churchWorld) || inRing(x, z, yardWorld) || inRing(x, z, stairWorld);
  const infill = data.infill || [];
  for (let i = 0; i + 7 < infill.length; i += 8) {
    const x = infill[i] / 10, z = infill[i + 1] / 10;
    if (Math.abs(x - center[0]) > 120 || Math.abs(z - center[1]) > 120 || !inRing(x, z, PRECINCT) || inChurchZone(x, z)) continue;
    const w = infill[i + 2] / 10 + 1.2, d = infill[i + 3] / 10 + 1.2, ang = infill[i + 4] / 1000, gY = groundY(x, z);
    S.base = gY - LAND_Y;
    S.kind = KIND.MASONRY;
    S.box(x, z, gY - 0.4, gY + 0.8, w, d, ang, COLORS.stoneLight, { top: COLORS.lawn });
    S.kind = KIND.PLAIN;
    for (const [u, v] of ([[-0.25, -0.25], [0.25, 0.2], [0, 0]] as any[])) {
      const px = x + Math.cos(ang) * u * w - Math.sin(ang) * v * d;
      const pz = z + Math.sin(ang) * u * w + Math.cos(ang) * v * d;
      S.cyl(px, pz, gY + 0.8, gY + 1.9, 0.9, 0.4, 6, hex('#5d7d3f'));
    }
  }
  S.kind = KIND.PLAIN;
  S.base = 0;

  // Night crosses, glass strip, and forecourt lamps
  const crossBuf = new Buf(256);
  for (const [topPt, crossY] of crossTops) {
    crossBuf.beam([topPt[0], crossY - 0.05, topPt[1]], [topPt[0], crossY + 2.7, topPt[1]], 0.34, 0.34, [1, 1, 1]);
    crossBuf.beam([topPt[0] - DIR_PERP[0] * 0.85, crossY + 1.8, topPt[1] - DIR_PERP[1] * 0.85], [topPt[0] + DIR_PERP[0] * 0.85, crossY + 1.8, topPt[1] + DIR_PERP[1] * 0.85], 0.32, 0.32, [1, 1, 1]);
  }
  crossBuf.beam([gableCrossPt[0], hoodTopY - 0.3, gableCrossPt[1]], [gableCrossPt[0], hoodTopY + 2.7, gableCrossPt[1]], 0.36, 0.36, [1, 1, 1]);
  crossBuf.beam([gableCrossPt[0] - DIR_PERP[0] * 0.9, hoodTopY + 1.8, gableCrossPt[1] - DIR_PERP[1] * 0.9], [gableCrossPt[0] + DIR_PERP[0] * 0.9, hoodTopY + 1.8, gableCrossPt[1] + DIR_PERP[1] * 0.9], 0.34, 0.34, [1, 1, 1]);
  const crossMesh = makeLightMesh(crossBuf, lightMaterial(0xf4f1ff, 1.5));

  const frontBuf = new Buf(64);
  const frontPt = toWorld2(4.8, 0);
  frontBuf.box(frontPt[0], frontPt[1], floorY + 11.05, floorY + 13.55, 0.16, 1.9, AXIS_ANG, [1, 1, 1]);
  frontBuf.box(frontPt[0] - DIR_FWD[0] * 0.05, frontPt[1] - DIR_FWD[1] * 0.05, floorY + 0.1, floorY + 5.4, 0.16, 3.0, AXIS_ANG, [1, 1, 1]);
  const stripMesh = makeLightMesh(frontBuf, lightMaterial(0xffc982, 1.1));

  const glowPos = [], glowCol = [];
  const addGlow = (pt, height, col = [1, 0.82, 0.52]) => { glowPos.push(pt[0], height, pt[1]); glowCol.push(...col); };
  for (const side of [-1, 1]) {
    addGlow(toWorld2(-22.5, side * 13), yardY + 3.6);
    addGlow(toWorld2(-3.0, side * 19), yardY + 3.6);
    addGlow(toWorld2(-23.5, side * 3.8), yardY + 1.4);
  }
  for (const [x, z] of GATES) addGlow([x, z], groundY(x, z) + 3.2);
  addGlow(toWorld2(4.4, 0), floorY + 6.5, [1, 0.85, 0.6]);
  const glowPts = glowPoints(glowPos, glowCol, 4);
  glowPts.userData.glow = true;
  for (const mesh of [crossMesh, stripMesh, glowPts]) { mesh.userData.landmark = id; group.add(mesh); }
}

function makeLightMesh(buf, mat) {
  const mesh = new THREE.Mesh(buf.geometry(), mat);
  mesh.renderOrder = 19;
  return mesh;
}
