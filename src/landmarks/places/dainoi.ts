// Hoàng thành · Đại Nội: the Imperial City as a whole, as it stands in 2026. This file draws its two rings of
// wall (Hoàng thành outside, Tử Cấm Thành inside), the Đông and Tây Khuyết Đài, Cửa Hòa Bình, the Tả Vu and
// Hữu Vu halls, the covered galleries that are left around the Forbidden City, and Đại Cung Môn.
import { KIND, hex, shade, unflat, obb } from '../../geo/buf.ts';
import { gateAxis, rectRing, inRing } from '../../geo/gates.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { pavilion } from '../citadel.ts';
import { OUTER, INNER, BAC_KHUYET_DAI, wallRun } from '../hoangthanh.ts';

export const id = 'dainoi';

// Tử Cấm Thành wall lines OSM leaves out (u, v)
const INNER_ADD: [number, number][][] = [
  [[170, -23], [170.5, 41], [172, 100]],
  [[67, 99], [172, 100]],
  [[-175, -202], [-174.4, -175], [-174.2, -159], [-171, -47]],
];

const TAY_AN = { u: -174.3, v: -167, w: 8.6, d: 2.6 };

const GALLERIES: [number[][], number, { over?: number; butt?: boolean; glaze?: boolean }?][] = [
  [[[-41, 100.5], [-13.5, 100.5]], 5, { glaze: true }],
  [[[13.5, 99.5], [40, 99.5]], 5, { glaze: true }],
  [[[-51, 63.5], [-23, 63.5]], 4.5, { glaze: true }],
  [[[22.6, 62], [40, 62]], 4.5, { butt: true, glaze: true }],
  [[[-33.5, -90], [-33.5, 40]], 6],
  [[[28.5, -14], [30.5, 29]], 6],
  [[[22.6, 33], [34, 33]], 8, { butt: true }],
  [[[28, -91], [28, -14]], 6],
  [[[31.3, -51], [90.5, -51], [91.85, 22.2]], 2.4, { over: 0.45 }],
  [[[80, -53], [80, -61]], 4],
  [[[-171, -46], [-38, -46]], 6],
  [[[-169, -32], [-169, -6]], 5],
];

const VU_HALLS: [number, number, number, number][] = [[35, 54, 66, 95], [-52, -33, 67.5, 97.5]];
const KNUCKLES: [number, number][] = [[-33.5, -89], [-33.5, -46], [-33.5, -11], [-33.5, 37], [28, -89], [28, -50], [28.4, -13]];
const KNUCKLE_SIZE = { along: 9, across: 8.5 };

const COLORS = {
  tileOld: hex('#57574f'),
  glazeOld: hex('#3f5e50'),
  tayAnPlaster: hex('#7c888d'),
  tayAnDark: hex('#5a656a'),
  tayAnMould: hex('#30373a'),
  grille: hex('#2b2a28'),
  hoaBinhPlaster: hex('#878c8c'),
  hoaBinhDark: hex('#62696a'),
  hoaBinhMould: hex('#383d3e'),
  dcmRed: hex('#9a2a1e'),
  dcmRedDark: hex('#6e1f17'),
  dcmGold: hex('#d2a43c'),
  dcmStone: hex('#9b998f'),
  dcmWall: hex('#c9a36a'),
  dcmIvory: hex('#e6dcc4'),
  dcmRidge: hex('#f1d77a'),
};
const DCM_ENAMEL = [hex('#2f6aa3'), hex('#3d8a5c'), hex('#d8b23a'), hex('#e6dcc4')];

interface ImperialFrame {
  center: [number, number];
  angle: number;
  cosA: number;
  sinA: number;
  toWorld: (uPos: number, vPos: number) => [number, number];
  toLocal: (pt: [number, number]) => [number, number];
}

let activeFrame: ImperialFrame | null = null;

// True for a mapped building this model draws itself (a gallery or a Vu hall)
export function owns(ring: [number, number][]) {
  if (!activeFrame) return false;
  const { center, cosA, sinA } = activeFrame;
  const inOwnedArea = ([uPos, vPos]: [number, number]) =>
    GALLERIES.some(([line, width]) => line.slice(1).some(([ub, vb], idx) => {
      const [ua, va] = line[idx];
      const lu = ub - ua;
      const lv = vb - va;
      const len = Math.hypot(lu, lv);
      const along = ((uPos - ua) * lu + (vPos - va) * lv) / len;
      const across = Math.abs((uPos - ua) * lv - (vPos - va) * lu) / len;
      return along > -3.5 && along < len + 3.5 && across < width / 2 + 2.5;
    }))
    || VU_HALLS.some(([u0, u1, v0, v1]) => uPos > u0 - 2 && uPos < u1 + 2 && vPos > v0 - 2 && vPos < v1 + 2);
  return ring.every(([x, z]) => {
    const dx = x - center[0];
    const dz = z - center[1];
    return inOwnedArea([dx * cosA + dz * sinA, -dx * sinA + dz * cosA]);
  });
}

type GatePointFn = (thru: number, y: number, across: number) => [number, number, number];

// round-arched opening through a masonry wall: spandrels on both faces + soffit
function drawArchOpening(S, ptFn: GatePointFn, normA: [number, number, number], normB: [number, number, number], radius: number, springY: number, topY: number, depth: number, col: number[], segs = 24) {
  const arcPt = (idx: number, rad = radius): [number, number] => {
    const ang = (Math.PI * idx) / segs;
    return [rad * Math.cos(ang), springY + rad * Math.sin(ang)];
  };
  for (const face of [-1, 1]) {
    const faceA = (face * depth) / 2;
    const hint: [number, number, number] = [normA[0] * face, 0, normA[2] * face];
    for (const side of [-1, 1]) {
      const corner = ptFn(faceA, topY, side * radius);
      for (let k = 0; k < segs / 2; k++) {
        const [b0, y0] = arcPt(side > 0 ? k : segs - k);
        const [b1, y1] = arcPt(side > 0 ? k + 1 : segs - k - 1);
        S.tri(corner, ptFn(faceA, y0, b0), ptFn(faceA, y1, b1), col, hint);
      }
      if (topY > springY + radius + 1e-3) S.tri(corner, ptFn(faceA, springY + radius, 0), ptFn(faceA, topY, 0), col, hint);
    }
  }
  for (let k = 0; k < segs; k++) {
    const [b0, y0] = arcPt(k);
    const [b1, y1] = arcPt(k + 1);
    const midB = (b0 + b1) / 2;
    const midY = (y0 + y1) / 2 - springY;
    const hint: [number, number, number] = [-midB * normB[0], -midY, -midB * normB[2]];
    S.quad(ptFn(-depth / 2, y0, b0), ptFn(depth / 2, y0, b0), ptFn(depth / 2, y1, b1), ptFn(-depth / 2, y1, b1), col, hint);
  }
}

// moulded archivolt band round an arch head and down the jambs
function drawArchivolt(S, ptFn: GatePointFn, normA: [number, number, number], normB: [number, number, number], radius: number, bandW: number, springY: number, footY: number, faceA0: number, faceSign: number, proud: number, col: number[], segs = 24) {
  const faceA1 = faceA0 + faceSign * proud;
  const outHint: [number, number, number] = [normA[0] * faceSign, 0, normA[2] * faceSign];
  const arcPt = (idx: number, rad: number): [number, number] => {
    const ang = (Math.PI * idx) / segs;
    return [rad * Math.cos(ang), springY + rad * Math.sin(ang)];
  };
  for (let k = 0; k < segs; k++) {
    const [bi0, yi0] = arcPt(k, radius);
    const [bi1, yi1] = arcPt(k + 1, radius);
    const [bo0, yo0] = arcPt(k, radius + bandW);
    const [bo1, yo1] = arcPt(k + 1, radius + bandW);
    S.quad(ptFn(faceA1, yi0, bi0), ptFn(faceA1, yo0, bo0), ptFn(faceA1, yo1, bo1), ptFn(faceA1, yi1, bi1), col, outHint);
    const midAng = (Math.PI * (k + 0.5)) / segs;
    const radHint: [number, number, number] = [Math.cos(midAng) * normB[0], Math.sin(midAng), Math.cos(midAng) * normB[2]];
    S.quad(ptFn(faceA0, yo0, bo0), ptFn(faceA1, yo0, bo0), ptFn(faceA1, yo1, bo1), ptFn(faceA0, yo1, bo1), col, radHint);
    S.quad(ptFn(faceA0, yi0, bi0), ptFn(faceA1, yi0, bi0), ptFn(faceA1, yi1, bi1), ptFn(faceA0, yi1, bi1), col, radHint.map((val) => -val));
  }
  if (footY < springY) {
    for (const side of [-1, 1]) {
      const bi = side * radius;
      const bo = side * (radius + bandW);
      const sideHint: [number, number, number] = [normB[0] * side, 0, normB[2] * side];
      S.quad(ptFn(faceA1, footY, bi), ptFn(faceA1, footY, bo), ptFn(faceA1, springY, bo), ptFn(faceA1, springY, bi), col, outHint);
      S.quad(ptFn(faceA0, footY, bo), ptFn(faceA1, footY, bo), ptFn(faceA1, springY, bo), ptFn(faceA0, springY, bo), col, sideHint);
      S.quad(ptFn(faceA0, footY, bi), ptFn(faceA1, footY, bi), ptFn(faceA1, springY, bi), ptFn(faceA0, springY, bi), col, sideHint.map((val) => -val));
    }
  }
}

// Hoàng Thành & Tử Cấm Thành perimeter walls
function buildWalls(S, data, imp: ImperialFrame) {
  const clearRings: number[][][] = [];
  for (const gateRec of data.gates || []) {
    if (gateRec.k !== 'citadel') {
      const ax = gateAxis(gateRec, imp.center);
      clearRings.push(rectRing(ax.cx, ax.cz, ax.w + 0.3, Math.max(ax.d, 4) + 0.3, ax.a));
    }
  }
  const tayAnPt = imp.toWorld(TAY_AN.u, TAY_AN.v);
  clearRings.push(rectRing(tayAnPt[0], tayAnPt[1], TAY_AN.d + 0.2, TAY_AN.w + 0.2, imp.angle));
  if (data.special && data.special.ngomon) {
    const ngoMonBox = obb(unflat(data.special.ngomon.ring));
    clearRings.push(rectRing(ngoMonBox.c[0], ngoMonBox.c[1], ngoMonBox.w + 0.4, ngoMonBox.d + 0.4, ngoMonBox.a));
  }

  const onSide = (pt: number[], [qa, qb]: [number[], number[]]) => {
    const lx = qb[0] - qa[0], lz = qb[1] - qa[1], len = Math.hypot(lx, lz);
    const along = ((pt[0] - qa[0]) * lx + (pt[1] - qa[1]) * lz) / len;
    const across = ((pt[0] - qa[0]) * lz - (pt[1] - qa[1]) * lx) / len;
    return along > -1 && along < len + 1 && Math.abs(across) < 1;
  };
  const isBastionEdge = (p0: [number, number], p1: [number, number]) =>
    BAC_KHUYET_DAI.some((pt, idx) => idx > 0 && onSide(p0, [BAC_KHUYET_DAI[idx - 1], pt]) && onSide(p1, [BAC_KHUYET_DAI[idx - 1], pt]));

  const emitWallLine = (pts: [number, number][], style) => {
    for (let i = 0; i + 1 < pts.length; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      if (len < 0.3 || isBastionEdge(p0, p1)) continue;
      const samples = Math.max(1, Math.ceil(len / 0.4));
      const runs: [number, number][] = [];
      let startFrac: number | null = null;
      for (let j = 0; j <= samples; j++) {
        const frac = j / samples;
        const outside = !clearRings.some((ring) => inRing(p0[0] + (p1[0] - p0[0]) * frac, p0[1] + (p1[1] - p0[1]) * frac, ring));
        if (outside && startFrac === null) startFrac = frac;
        if ((!outside || j === samples) && startFrac !== null) {
          runs.push([startFrac, outside ? frac : (j - 1) / samples]);
          startFrac = null;
        }
      }
      for (const [t0, t1] of runs) {
        const isWhole = t0 === 0 && t1 === 1;
        if (!isWhole && len * (t1 - t0) < 0.6) continue;
        const ptAt = (frac: number): [number, number] => [p0[0] + (p1[0] - p0[0]) * frac, p0[1] + (p1[1] - p0[1]) * frac];
        wallRun(S, ptAt(t0), ptAt(t1), style, isWhole ? [1, 1] : [0, 0]);
      }
    }
  };

  for (const flat of data.iwalls || []) {
    const pts = unflat(flat);
    const localPts = pts.map(imp.toLocal);
    emitWallLine(pts, localPts.every(([uPos, vPos]) => Math.abs(uPos) < 200 && Math.abs(vPos) < 215) ? INNER : OUTER);
  }
  for (const line of INNER_ADD) emitWallLine(line.map(([uPos, vPos]) => imp.toWorld(uPos, vPos)), INNER);
}

// Tây An Môn (west Forbidden City gate), Khuyết Đài bastions, and Cửa Hòa Bình (north gate)
function buildGatesAndBastions(S, data, imp: ImperialFrame) {
  const baseY = LAND_Y;

  // Tây An Môn
  const { u: gu, v: gv, w: gw, d: gd } = TAY_AN;
  const gateBox = (du: number, dv: number, y0: number, y1: number, su: number, sv: number, col: number[], opts?) => {
    const pt = imp.toWorld(gu + du, gv + dv);
    S.box(pt[0], pt[1], y0, y1, su, sv, imp.angle, col, opts);
  };
  const archW = 3.0, springH = 2.9, crownH = 4.4, wallH = 5.3, archR = archW / 2;
  const normA: [number, number, number] = [imp.cosA, 0, imp.sinA];
  const normB: [number, number, number] = [-imp.sinA, 0, imp.cosA];
  const tayAnPt: GatePointFn = (thru, y, across) => {
    const pt = imp.toWorld(gu + thru, gv + across);
    return [pt[0], y, pt[1]];
  };
  S.kind = KIND.FLAT;
  const pierW = (gw - archW) / 2;
  for (const side of [-1, 1]) gateBox(0, side * (archW / 2 + pierW / 2), baseY - 0.2, baseY + wallH, gd, pierW, COLORS.tayAnPlaster);
  gateBox(0, 0, baseY + crownH, baseY + wallH, gd, archW, COLORS.tayAnPlaster);
  drawArchOpening(S, tayAnPt, normA, normB, archR, baseY + springH, baseY + crownH, gd, COLORS.tayAnPlaster);

  for (const face of [-1, 1]) {
    drawArchivolt(S, tayAnPt, normA, normB, archR, 0.3, baseY + springH, baseY + springH - 0.25, face * (gd / 2), face, 0.1, COLORS.tayAnDark);
    for (const side of [-1, 1]) {
      gateBox(face * (gd / 2 + 0.07), side * (archR + 0.25), baseY + springH - 0.4, baseY + springH - 0.2, 0.14, 0.7, COLORS.tayAnDark);
      for (const [bPos, pilW] of [[gw / 2 - 0.3, 0.6], [archR + 0.75, 0.5]] as [number, number][]) {
        gateBox(face * (gd / 2 + 0.05), side * bPos, baseY + 0.5, baseY + wallH - 0.55, 0.1, pilW, COLORS.tayAnPlaster);
        gateBox(face * (gd / 2 + 0.1), side * bPos, baseY + 1.0, baseY + springH - 0.6, 0.02, pilW * 0.55, COLORS.tayAnDark);
      }
      gateBox(face * (gd / 2 + 0.13), side * (archW / 2 + pierW / 2), baseY + 0.5, baseY + 1.0, 0.02, pierW, shade(COLORS.tayAnMould, 1.2));
      gateBox(face * (gd / 2 + 0.06), side * (archW / 2 + pierW / 2), baseY - 0.2, baseY + 0.5, 0.12, pierW + 0.1, COLORS.tayAnDark);
      gateBox(face * (gd / 2 + 0.03), side * (archW / 2 + pierW / 2 + 0.2), baseY + 1.2, baseY + 3.4, 0.06, pierW * 0.45, COLORS.tayAnDark);
    }
    gateBox(face * (gd / 2 + 0.05), 0, baseY + wallH - 0.55, baseY + wallH - 0.3, 0.1, gw - 0.2, COLORS.tayAnDark);
    for (const [bPos, width, dy] of [[-3.9, 0.35, 2.2], [-2.6, 0.2, 1.4], [-1.05, 0.25, 0.9], [0.6, 0.3, 0.6], [2.3, 0.25, 1.8], [3.7, 0.4, 2.6]] as [number, number, number][]) {
      gateBox(face * (gd / 2 + 0.12), bPos * face, baseY + wallH - 0.3 - dy, baseY + wallH - 0.3, 0.02, width, COLORS.tayAnMould);
    }
    gateBox(face * (gd / 2 + 0.03), 0, baseY + crownH + 0.15, baseY + wallH - 0.6, 0.06, 2.4, shade(COLORS.tayAnPlaster, 0.62));
  }
  gateBox(0, 0, baseY + wallH, baseY + wallH + 0.25, gd + 0.5, gw + 0.4, COLORS.tayAnDark, { bottom: true });
  gateBox(0, 0, baseY + wallH + 0.25, baseY + wallH + 1.35, gd - 0.4, 3.6, COLORS.tayAnPlaster);
  gateBox(0, 0, baseY + wallH + 1.35, baseY + wallH + 1.55, gd, 4.2, COLORS.tayAnDark, { bottom: true });
  for (const side of [-1, 1]) {
    gateBox(0, side * 2.15, baseY + wallH + 0.25, baseY + wallH + 1.0, gd - 0.4, 0.7, COLORS.tayAnPlaster);
    gateBox(0, side * 2.15, baseY + wallH + 1.0, baseY + wallH + 1.12, gd - 0.2, 0.9, COLORS.tayAnDark, { bottom: true });
    gateBox(0, side * (gw / 2 - 1.1), baseY + wallH + 0.25, baseY + wallH + 0.62, gd - 0.4, 1.6, COLORS.tayAnPlaster);
    for (const [db, y0, y1, width] of [[0, 0.62, 0.8, 0.5], [0.12, 0.8, 0.95, 0.3], [0.05, 0.95, 1.05, 0.22]] as [number, number, number, number][]) {
      gateBox(0, side * (gw / 2 - 0.25 - db), baseY + wallH + y0, baseY + wallH + y1, gd - 0.5, width, COLORS.tayAnDark);
    }
  }
  for (const face of [-1, 1]) gateBox(face * ((gd - 0.4) / 2 + 0.03), 0, baseY + wallH + 0.45, baseY + wallH + 1.15, 0.06, 2.6, shade(COLORS.tayAnPlaster, 0.62));
  S.kind = KIND.TIMBER;
  for (let k = 0; k <= 8; k++) {
    const pt = imp.toWorld(gu, gv - archW / 2 + 0.15 + (k * (archW - 0.3)) / 8);
    S.cyl(pt[0], pt[1], baseY, baseY + springH + 0.4, 0.025, 0.025, 4, COLORS.grille);
  }
  for (const barY of [0.15, 1.6, springH + 0.35]) gateBox(0, 0, baseY + barY, baseY + barY + 0.06, 0.06, archW - 0.2, COLORS.grille);

  // trees along the lane outside the west wall
  if (Array.isArray(data.trees)) {
    let idx = 0;
    for (let vPos = -196; vPos < -50; vPos += 11) {
      if (Math.abs(vPos - TAY_AN.v) < 7) continue;
      const pt = imp.toWorld(-175 + ((vPos + 202) * 4) / 155 - 4.2, vPos);
      data.trees.push(Math.round(pt[0] * 10), Math.round(pt[1] * 10), 13 + (idx++ % 4), 1);
    }
  }

  // Đông and Tây Khuyết Đài bastions
  for (const side of [1, -1]) {
    const bastionPt = imp.toWorld(side * 330, 2);
    S.kind = KIND.MASONRY;
    S.box(bastionPt[0], bastionPt[1], baseY - 0.2, baseY + 3.6, 22, 76, imp.angle, shade(OUTER.body, 0.95), { topKind: KIND.ROAD });
    const rampPt = imp.toWorld(side * 312, 30);
    S.box(rampPt[0], rampPt[1], baseY - 0.2, baseY + 1.8, 5, 16, imp.angle, shade(PAL.stone, 0.9), { topKind: KIND.ROAD });
    if (side > 0) {
      const pavPt = imp.toWorld(331, -4);
      pavilion(S, pavPt[0], pavPt[1], 14, 14, imp.angle, baseY + 3.6, { tiers: 2, wallH: 2.8, roof: PAL.imperialRoof, platform: 0.5, colonnade: true });
    } else {
      const ruinPt = imp.toWorld(-330, 8);
      S.kind = KIND.MASONRY;
      S.box(ruinPt[0], ruinPt[1], baseY + 3.6, baseY + 4.2, 13, 13, imp.angle, shade(PAL.stone, 0.8), { topKind: KIND.ROAD });
    }
  }

  // Cửa Hòa Bình (north gate)
  const hbBox = (uPos: number, vPos: number, y0: number, y1: number, su: number, sv: number, col: number[], opts?) => {
    const pt = imp.toWorld(uPos, vPos);
    S.box(pt[0], pt[1], y0, y1, su, sv, imp.angle, col, opts);
  };
  const hbU = 37, hbV = -283, hbDepth = 8.4, hbWidth = 14.8, hbR = 1.8, hbSpringY = baseY + 2.3, hbTopY = baseY + 4.6;
  const hbPt: GatePointFn = (thru, y, across) => {
    const pt = imp.toWorld(hbU + across, hbV + thru);
    return [pt[0], y, pt[1]];
  };
  const hbNormA: [number, number, number] = [-imp.sinA, 0, imp.cosA];
  const hbNormB: [number, number, number] = [imp.cosA, 0, imp.sinA];
  S.kind = KIND.FLAT;
  const hbPierW = (hbWidth - 2 * hbR) / 2;
  for (const side of [-1, 1]) hbBox(hbU + side * (hbR + hbPierW / 2), hbV, baseY - 0.2, hbTopY, hbPierW, hbDepth, COLORS.hoaBinhPlaster);
  hbBox(hbU, hbV, hbSpringY + hbR, hbTopY, 2 * hbR, hbDepth, COLORS.hoaBinhPlaster);
  drawArchOpening(S, hbPt, hbNormA, hbNormB, hbR, hbSpringY, hbSpringY + hbR, hbDepth, COLORS.hoaBinhPlaster);
  for (const face of [-1, 1]) {
    const onFace = (du: number, dv: number, y0: number, y1: number, su: number, thick: number, col: number[]) =>
      hbBox(hbU + du, hbV + face * (hbDepth / 2 + dv), y0, y1, su, thick, col);
    drawArchivolt(S, hbPt, hbNormA, hbNormB, hbR, 0.35, hbSpringY, baseY + 0.4, face * (hbDepth / 2), face, 0.12, COLORS.hoaBinhDark);
    for (const side of [-1, 1]) {
      onFace(side * (hbR + hbPierW / 2), 0.06, baseY - 0.2, baseY + 0.4, hbPierW, 0.12, COLORS.hoaBinhDark);
      onFace(side * (hbWidth / 2 - 0.35), 0.06, baseY + 0.4, hbTopY - 0.5, 0.7, 0.12, COLORS.hoaBinhPlaster);
      onFace(side * (hbR + hbPierW / 2 + 0.2), 0.04, baseY + 1.0, baseY + 3.4, hbPierW * 0.42, 0.08, COLORS.hoaBinhDark);
      onFace(side * (hbR + hbPierW / 2 - 0.9), 0.14, hbTopY - 0.3 - 1.6, hbTopY - 0.3, 0.3, 0.02, COLORS.hoaBinhMould);
      onFace(side * (hbWidth / 2 - 0.9), 0.14, baseY + 0.4, baseY + 1.0, 1.0, 0.02, COLORS.hoaBinhMould);
    }
    onFace(0, 0.06, hbTopY - 0.5, hbTopY - 0.25, hbWidth, 0.12, COLORS.hoaBinhDark);
    onFace(0, 0.05, hbSpringY + hbR + 0.4, hbTopY - 0.6, 2.2, 0.08, shade(COLORS.hoaBinhPlaster, 0.6));
  }
  hbBox(hbU, hbV, hbTopY - 0.25, hbTopY, hbWidth + 0.4, hbDepth + 0.4, COLORS.hoaBinhDark);
  S.kind = KIND.TILE;
  hbBox(hbU, hbV, hbTopY, hbTopY + 0.3, hbWidth + 0.2, hbDepth + 0.8, OUTER.cap);
  const hbWorld = imp.toWorld(hbU, hbV);
  pavilion(S, hbWorld[0], hbWorld[1], 8, 5, imp.angle, hbTopY + 0.3, { wallH: 2.2, roof: PAL.imperialRoof, over: 1.1, steps: false });
}

// Tả Vu, Hữu Vu, covered galleries, and knuckle pavilions
function buildVuAndGalleries(S, imp: ImperialFrame) {
  const baseY = LAND_Y;
  for (const [u0, u1, v0, v1] of VU_HALLS) {
    const midU = (u0 + u1) / 2;
    const midV = (v0 + v1) / 2;
    const len = v1 - v0 - 3.4;
    const halfW = (u1 - u0 - 3.4) / 2;
    const basePt = imp.toWorld(midU, midV);
    S.kind = KIND.MASONRY;
    S.box(basePt[0], basePt[1], baseY - 0.2, baseY + 0.6, len + 3.4, u1 - u0, imp.angle + Math.PI / 2, PAL.stone, { topKind: KIND.ROAD });
    for (const side of [-0.5, 0.5]) {
      const pt = imp.toWorld(midU + side * halfW, midV);
      pavilion(S, pt[0], pt[1], len, halfW, imp.angle + Math.PI / 2, baseY + 0.6, { wallH: 3.6, roof: PAL.imperialRoof, over: 1.0, steps: false });
    }
  }

  const postCol = PAL.lacquer;
  const floorCol = shade(PAL.stone, 0.95);
  for (const [line, width, opts = {}] of GALLERIES) {
    const { over = 0.8, butt = false, glaze = false } = opts;
    for (let i = 0; i + 1 < line.length; i++) {
      const [ua, va] = line[i];
      const [ub, vb] = line[i + 1];
      const lu = ub - ua, lv = vb - va, len = Math.hypot(lu, lv);
      const du = lu / len, dv = lv / len;
      const worldA = imp.toWorld(ua, va);
      const worldB = imp.toWorld(ub, vb);
      const segAng = Math.atan2(worldB[1] - worldA[1], worldB[0] - worldA[0]);
      const mid = imp.toWorld((ua + ub) / 2, (va + vb) / 2);
      const ext = i + 2 < line.length || i > 0 ? width / 2 : 0;

      S.kind = KIND.MASONRY;
      S.box(mid[0], mid[1], baseY - 0.2, baseY + 0.45, len + ext, width + 0.6, segAng, floorCol, { topKind: KIND.ROAD });
      S.kind = KIND.TIMBER;
      const bayCount = Math.max(1, Math.round(len / 3.2));
      for (let k = 0; k <= bayCount; k++) {
        const frac = k / bayCount;
        const curU = ua + lu * frac;
        const curV = va + lv * frac;
        for (const side of [-1, 1]) {
          const postPt = imp.toWorld(curU - dv * side * (width / 2 - 0.3), curV + du * side * (width / 2 - 0.3));
          S.cyl(postPt[0], postPt[1], baseY + 0.45, baseY + 3.1, 0.16, 0.15, 6, postCol);
        }
      }
      for (const side of [-1, 1]) {
        const p0 = imp.toWorld(ua - dv * side * (width / 2 - 0.3), va + du * side * (width / 2 - 0.3));
        const p1 = imp.toWorld(ub - dv * side * (width / 2 - 0.3), vb + du * side * (width / 2 - 0.3));
        S.beam([p0[0], baseY + 3.0, p0[1]], [p1[0], baseY + 3.0, p1[1]], 0.22, 0.3, shade(postCol, 0.85));
      }
      const cut = butt && i === 0 ? over : 0;
      const roofMid = imp.toWorld((ua + ub) / 2 + (du * cut) / 2, (va + vb) / 2 + (dv * cut) / 2);
      S.hip(roofMid[0], roofMid[1], len + ext - cut, width, segAng, baseY + 3.1, Math.min(1.9, width * 0.32), glaze ? COLORS.glazeOld : COLORS.tileOld, { over, glazed: glaze });
    }
  }

  for (const [ku, kv] of KNUCKLES) {
    const center = imp.toWorld(ku, kv);
    const alongAng = imp.angle + Math.PI / 2;
    S.kind = KIND.MASONRY;
    S.box(center[0], center[1], baseY - 0.2, baseY + 0.47, KNUCKLE_SIZE.along + 0.6, KNUCKLE_SIZE.across + 0.6, alongAng, floorCol, { topKind: KIND.ROAD });
    S.kind = KIND.TIMBER;
    for (const su of [-1, 1]) {
      for (const sv of [-1, 1]) {
        const postPt = imp.toWorld(ku + su * (KNUCKLE_SIZE.across / 2 - 0.3), kv + sv * (KNUCKLE_SIZE.along / 2 - 0.3));
        S.cyl(postPt[0], postPt[1], baseY + 0.47, baseY + 3.4, 0.19, 0.18, 6, postCol);
      }
    }
    for (const side of [-1, 1]) {
      const p0 = imp.toWorld(ku + side * (KNUCKLE_SIZE.across / 2 - 0.3), kv - KNUCKLE_SIZE.along / 2 + 0.3);
      const p1 = imp.toWorld(ku + side * (KNUCKLE_SIZE.across / 2 - 0.3), kv + KNUCKLE_SIZE.along / 2 - 0.3);
      S.beam([p0[0], baseY + 3.3, p0[1]], [p1[0], baseY + 3.3, p1[1]], 0.24, 0.32, shade(postCol, 0.85));
    }
    S.hip(center[0], center[1], KNUCKLE_SIZE.along, KNUCKLE_SIZE.across, alongAng, baseY + 3.4, 2.3, COLORS.tileOld, { over: 0.9 });
    S.hip(center[0], center[1], KNUCKLE_SIZE.across, KNUCKLE_SIZE.along * 0.7, imp.angle, baseY + 3.4, 2.0, COLORS.tileOld, { over: 0.9 });
  }
}

// Đại Cung Môn (1833 gate into the Forbidden City)
function buildDaiCungMon(S, imp: ImperialFrame) {
  const baseY = LAND_Y;
  const box = (uPos: number, vPos: number, y0: number, y1: number, width: number, depth: number, col: number[], opts?) => {
    const pt = imp.toWorld(uPos, vPos);
    S.box(pt[0], pt[1], y0, y1, width, depth, imp.angle, col, opts);
  };
  const pt3 = (uPos: number, y: number, vPos: number): [number, number, number] => {
    const pt = imp.toWorld(uPos, vPos);
    return [pt[0], y, pt[1]];
  };

  const centerV = 100.5;
  const floorY = baseY + 0.7;
  S.kind = KIND.MASONRY;
  box(0, centerV, baseY - 0.2, floorY - 0.15, 27, 11.5, shade(PAL.stone, 0.85), { topKind: KIND.ROAD });
  box(0, centerV, floorY - 0.17, floorY, 27.3, 11.8, shade(COLORS.dcmStone, 1.08), { topKind: KIND.ROAD });
  for (const side of [1, -1]) {
    for (let k = 1; k <= 3; k++) box(0, centerV + side * (5.75 + 0.3 * k), baseY - 0.2, floorY - 0.2 * k, 8, 0.3, shade(PAL.stone, 0.9), { topKind: KIND.ROAD });
  }

  const colUs = [-11, -6.6, -2.2, 2.2, 6.6, 11];
  const colVs = [96.5, 99.2, 101.9, 104.6];
  const colH = 4.2;
  S.kind = KIND.TIMBER;
  for (const uPos of colUs) {
    for (const vPos of colVs) {
      const pt = imp.toWorld(uPos, vPos);
      const isInner = vPos > 97 && vPos < 104 && Math.abs(uPos) < 10;
      S.box(pt[0], pt[1], floorY, floorY + 0.25, 0.75, 0.75, imp.angle, shade(COLORS.dcmStone, 1.08));
      S.cyl(pt[0], pt[1], floorY + 0.25, floorY + colH + (isInner ? 0.9 : 0), 0.24, 0.22, 8, COLORS.dcmRed, { cap: false });
      S.cyl(pt[0], pt[1], floorY + 2.0, floorY + 2.25, 0.245, 0.24, 8, COLORS.dcmGold, { cap: false });
    }
  }
  const eavePlateY = floorY + colH - 0.15;
  for (const vPos of [colVs[0], colVs[3]]) S.beam(pt3(colUs[0], eavePlateY, vPos), pt3(colUs[5], eavePlateY, vPos), 0.3, 0.36, COLORS.dcmRedDark);
  for (const uPos of [colUs[0], colUs[5]]) S.beam(pt3(uPos, eavePlateY, colVs[0]), pt3(uPos, eavePlateY, colVs[3]), 0.3, 0.36, COLORS.dcmRedDark);
  for (const vPos of [colVs[1], colVs[2]]) S.beam(pt3(colUs[1], floorY + colH + 0.7, vPos), pt3(colUs[4], floorY + colH + 0.7, vPos), 0.28, 0.34, COLORS.dcmRedDark);

  const screenV = colVs[2];
  for (let i = 0; i < 5; i++) {
    const u0 = colUs[i] + 0.26;
    const u1 = colUs[i + 1] - 0.26;
    const bayW = u1 - u0;
    const midU = (u0 + u1) / 2;
    const hasDoor = i > 0 && i < 4;
    const doorH = i === 2 ? 3.2 : 2.9;
    if (hasDoor) {
      box(midU, screenV, floorY, floorY + doorH, bayW * 0.62, 0.16, shade(COLORS.dcmRed, 0.75));
      box(midU, screenV + 0.09, floorY, floorY + doorH, 0.05, 0.04, COLORS.dcmRedDark);
      for (const side of [-1, 1]) {
        for (const studY of [0.9, 1.6, 2.3]) box(midU + side * bayW * 0.155, screenV + 0.1, floorY + studY, floorY + studY + 0.12, bayW * 0.24, 0.03, COLORS.dcmGold);
        box(midU + side * bayW * 0.405, screenV, floorY, floorY + doorH, bayW * 0.19, 0.14, COLORS.dcmRed);
      }
      box(midU, screenV, floorY + doorH, floorY + colH - 0.25, bayW, 0.14, COLORS.dcmRedDark);
    } else {
      box(midU, screenV, floorY, floorY + colH - 0.25, bayW, 0.16, COLORS.dcmRed);
      for (const [y0, y1, col] of [[1.0, 1.9, DCM_ENAMEL[0]], [2.1, 3.0, COLORS.dcmGold]] as [number, number, number[]][]) {
        box(midU, screenV + 0.09, floorY + y0, floorY + y1, bayW * 0.7, 0.03, col);
      }
    }
    box(midU, screenV + 0.09, floorY + colH - 0.75, floorY + colH - 0.45, bayW, 0.04, COLORS.dcmGold);
  }
  for (const side of [-1, 1]) box(side * 11, (colVs[0] + colVs[3]) / 2, floorY, floorY + colH - 0.25, 0.3, colVs[3] - colVs[0], COLORS.dcmWall);

  box(0, colVs[3] + 0.2, eavePlateY - 1.0, eavePlateY - 0.25, 2.6, 0.12, COLORS.dcmRedDark);
  box(0, colVs[3] + 0.28, eavePlateY - 0.92, eavePlateY - 0.33, 2.3, 0.04, COLORS.dcmGold);
  box(0, colVs[0] - 0.2, eavePlateY - 1.0, eavePlateY - 0.25, 2.6, 0.12, COLORS.dcmRedDark);
  box(0, colVs[0] - 0.28, eavePlateY - 0.92, eavePlateY - 0.33, 2.3, 0.04, COLORS.dcmGold);
  box(0, centerV, floorY + colH - 0.3, floorY + colH - 0.1, 22, 8.1, shade(COLORS.dcmRedDark, 0.6), { bottom: true });

  // hip-and-gable yellow glazed roof with enamel ridge ornaments
  S.kind = KIND.PLAIN;
  const roofW = 22;
  const roofD = colVs[3] - colVs[0];
  const over = 1.6;
  const roofH = 3.1;
  const roofBaseY = floorY + colH;
  const roofCenter = imp.toWorld(0, centerV);
  S.hip(roofCenter[0], roofCenter[1], roofW, roofD, imp.angle, roofBaseY, roofH, PAL.imperialRoof, { flare: 0.5, fascia: 0.3, fasciaCol: COLORS.dcmRedDark, ridgeCol: COLORS.dcmRidge, hips: true, glazed: true, segs: 3, over });

  const halfW = roofW / 2 + over;
  const halfD = roofD / 2 + over;
  const ridgeHalf = Math.max(0, halfW - halfD * 0.92);
  const ridgeY = roofBaseY + roofH;
  const gableFrac = 0.38;
  const gableU = ridgeHalf + (halfW - ridgeHalf) * gableFrac;
  const gableV = halfD * gableFrac;
  const gableY = ridgeY - roofH * gableFrac;
  for (const side of [-1, 1]) {
    const normal: [number, number, number] = [side * imp.cosA, 0, side * imp.sinA];
    S.tri(pt3(side * gableU, gableY, centerV - gableV), pt3(side * gableU, gableY, centerV + gableV), pt3(side * gableU, ridgeY, centerV), COLORS.dcmIvory, normal);
    S.kind = KIND.GLAZED;
    for (const slopeSide of [-1, 1]) {
      const p0 = pt3(side * (ridgeHalf - 0.2), ridgeY + 0.05, centerV);
      const p1 = pt3(side * (gableU + 0.35), ridgeY + 0.05, centerV);
      const p2 = pt3(side * (gableU + 0.35), gableY - 0.02, centerV + slopeSide * (gableV + 0.1));
      const p3 = pt3(side * (ridgeHalf - 0.2), gableY - 0.02, centerV + slopeSide * (gableV + 0.1));
      S.quad(p0, p1, p2, p3, PAL.imperialRoof, [0, 1, 0]);
      S.beam(pt3(side * gableU, gableY + 0.02, centerV + slopeSide * gableV), pt3(side * (gableU + 0.35), ridgeY + 0.06, centerV), 0.18, 0.16, COLORS.dcmRidge);
    }
    S.kind = KIND.PLAIN;
    const medPt = imp.toWorld(side * (gableU + 0.04), centerV);
    S.box(medPt[0], medPt[1], gableY + 0.25, gableY + 0.85, 0.05, 0.6, imp.angle, DCM_ENAMEL[(side + 1) / 2]);
  }

  S.beam(pt3(-(gableU + 0.3), ridgeY + 0.18, centerV), pt3(gableU + 0.3, ridgeY + 0.18, centerV), 0.34, 0.36, COLORS.dcmRidge);
  const crestY = ridgeY + 0.36;
  S.cyl(...roofCenter, crestY, crestY + 0.22, 0.28, 0.2, 8, COLORS.dcmGold);
  S.cyl(...roofCenter, crestY + 0.22, crestY + 0.85, 0.3, 0.05, 8, COLORS.dcmGold);
  for (const side of [-1, 1]) {
    let prev: [number, number, number] | null = null;
    for (let k = 0; k <= 6; k++) {
      const cur = pt3(side * (0.7 + k * 0.4), crestY + 0.18 + 0.2 * Math.sin(k * 1.3) + (k === 0 ? 0.3 : 0), centerV);
      if (prev) S.beam(prev, cur, 0.18, 0.2, k < 2 ? COLORS.dcmGold : DCM_ENAMEL[1]);
      prev = cur;
    }
    S.beam(pt3(side * (gableU + 0.1), crestY - 0.1, centerV), pt3(side * (gableU + 0.45), crestY + 0.6, centerV), 0.24, 0.24, DCM_ENAMEL[1]);
    S.beam(pt3(side * (gableU + 0.45), crestY + 0.6, centerV), pt3(side * (gableU + 0.15), crestY + 0.95, centerV), 0.2, 0.2, DCM_ENAMEL[1]);
  }
}

export function build({ data, S }) {
  if (!data.imperial) return;
  const center: [number, number] = [data.imperial.c[0] / 10, data.imperial.c[1] / 10];
  const angle = data.imperial.a / 1000;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const imp: ImperialFrame = {
    center,
    angle,
    cosA,
    sinA,
    toWorld: (uPos, vPos) => [center[0] + uPos * cosA - vPos * sinA, center[1] + uPos * sinA + vPos * cosA],
    toLocal: ([x, z]) => {
      const dx = x - center[0];
      const dz = z - center[1];
      return [dx * cosA + dz * sinA, -dx * sinA + dz * cosA];
    },
  };
  activeFrame = imp;
  const prevKind = S.kind;

  buildWalls(S, data, imp);
  buildGatesAndBastions(S, data, imp);
  buildVuAndGalleries(S, imp);
  buildDaiCungMon(S, imp);

  S.kind = prevKind;
}
