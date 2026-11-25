import * as T3 from 'three';
import polygonClipping from 'polygon-clipping';
import { Buf, KIND, hex, shade } from '../../geo/buf.ts';
import { LAND_Y } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { lightMaterial } from '../../geo/materials.ts';
import { offStreets } from '../enclosure.ts';

// Chợ Tây Lộc (209 Nguyễn Trãi, the north-west of the Citadel; once chợ Phú Xuân), as it stands today. Sources and
// estimates: docs/places/tayloc.md.
export const id = 'tayloc';

const CENTER: [number, number] = [-2304.25, -492.5];
const AXIS_LEN = Math.hypot(0.807, -0.586);
const AXIS_U: [number, number] = [0.807 / AXIS_LEN, -0.586 / AXIS_LEN];
const AXIS_V: [number, number] = [-AXIS_U[1], AXIS_U[0]];
const FRAME_ANGLE = Math.atan2(AXIS_U[1], AXIS_U[0]);
const WHITE_RGB = [1, 1, 1];

const COLORS = {
  wall: hex('#ead7a2'),
  wallAlt: hex('#e4dccb'),
  plinth: hex('#9b968c'),
  wallPav: hex('#f2e7bb'),
  roofHall: hex('#9a4c3b'),
  roofZinc: hex('#8c9598'),
  roofBlue: hex('#5f7f97'),
  pave: hex('#bdb6a8'),
  kerb: hex('#a29c90'),
  dark: hex('#3a322c'),
  lunetteGlass: hex('#aab4b5'),
  canopySlab: hex('#b4b2ab'),
  rustSheet: hex('#7a5a3c'),
  blueEdge: hex('#2e5fa8'),
  soil: hex('#7d6a52'),
  stripGrass: hex('#6f7a4c'),
  maroonSheet: hex('#5d3c35'),
  cornerSheet: hex('#8e4a3a'),
  twoStoreyRoof: hex('#5f463b'),
  tileRed: hex('#a8442f'),
  gold: hex('#d8b448'),
  boardRed: hex('#8e1c18'),
  flagRed: hex('#d42a1e'),
  signWhite: hex('#f2efe6'),
  signRed: hex('#c8352a'),
  signBlue: hex('#2f5fa8'),
  inkRed: hex('#b3201c'),
  inkWhite: hex('#f4f1e6'),
};

const SHUTTER_COLS = [hex('#a3a8a6'), hex('#8f9a9f'), hex('#6f8ca3'), hex('#b8b3a6')];
const GOODS_COLS = [hex('#c0392b'), hex('#e0a526'), hex('#2e7d9a'), hex('#5b8c3a'), hex('#d96f9a'), hex('#efe6d2'), hex('#7b4f9a')];
const SIGN_COLS = [hex('#f1efe8'), hex('#2f5fa8'), hex('#c8352a'), hex('#e9c23c'), hex('#e8e2d0'), hex('#3f7fbf'), hex('#d9822b')];
const TARP_COLS = [hex('#3256a8'), hex('#5a4c9c'), hex('#2a3f7a'), hex('#4f7fc4'), hex('#6c5aa8')];
const LEAN_GREENS = [hex('#3f5a3c'), hex('#5a6038'), hex('#4c5b47'), hex('#6b6a48')];
const LEAN_GREYS = [hex('#9aa0a0'), hex('#8d9496'), hex('#a7aaa6')];
const COURT_TARPS = [hex('#d8d8d2'), hex('#a9adab'), hex('#7d8384'), hex('#3b3f42'), hex('#2f5e9e'), hex('#c9c3b2'), hex('#4f6a50')];
const BIKE_COLS = [hex('#2b2b2e'), hex('#b8b9bb'), hex('#8e1c18'), hex('#e8e6df'), hex('#1f3f7a'), hex('#4a4a4d')];
const BROLLY_COLS = [hex('#2f63b5'), hex('#d9502f'), hex('#f0c419')];

const YARD_U0 = -67.5;
const YARD_U1 = 70;
const YARD_V0 = -54.5;
const YARD_V1 = 55;
const GATE_U = 54.6;
const GATE_V = 2.75;

const TREES: [number, number, number][] = [
  [15.2, -28.8, 1.1], [15.6, -9.9, 1.0], [15.2, 10.2, 1.0], [14.8, 30.2, 1.1], [-19.8, 23.1, 0.9],
  [-57.2, -53.3, 0.8], [-43.8, -52.6, 0.8], [-65.3, -32.6, 0.8], [-65.3, -16.8, 0.8], [-65.3, 1.5, 0.8], [-65.3, 20.2, 0.8],
  [-65.3, 44.5, 0.8],
];
const STRIP_U: [number, number] = [62.3, 64.0];
const STRIPS: [number, number][] = [[-50.5, -4.0], [10.0, 51.0]];
const KERB_TREES: [number, number, number][] = [-46, -36.5, -27, -17.5, -8, 14, 23.5, 33, 42.5].map((vPos) => [63.15, vPos, 0.6]);
const OVAL_OUTLINE: [number, number][] = [
  [-37.8, -11.6], [-36.0, -14.7], [-32.5, -15.7], [-27.9, -15.9], [-24.5, -14.1], [-22.7, -11.3],
  [-22.8, 14.0], [-24.4, 16.6], [-27.3, 18.7], [-32.5, 18.8], [-36.0, 17.2], [-37.5, 14.7],
];

const toWorld = (uPos: number, vPos: number): [number, number] => [
  CENTER[0] + AXIS_U[0] * uPos + AXIS_V[0] * vPos,
  CENTER[1] + AXIS_U[1] * uPos + AXIS_V[1] * vPos,
];
const hash2 = (idx: number, salt: number) => {
  const val = Math.sin(idx * 127.1 + salt * 311.7) * 43758.5453;
  return val - Math.floor(val);
};

let yardY = 0;

function boxUV(S, u0: number, u1: number, v0: number, v1: number, yRel0: number, yRel1: number, col: number[], opt?) {
  const pt = toWorld((u0 + u1) / 2, (v0 + v1) / 2);
  S.box(pt[0], pt[1], yardY + yRel0, yardY + yRel1, u1 - u0, v1 - v0, FRAME_ANGLE, col, opt);
}

const toWorld3 = (uPos: number, vPos: number, yRel: number): [number, number, number] => {
  const pt = toWorld(uPos, vPos);
  return [pt[0], yardY + yRel, pt[1]];
};

// low gable of corrugated sheet over [u0,u1] x [v0,v1]
function drawGable(S, u0: number, u1: number, v0: number, v1: number, eaveH: number, ridgeH: number, col: number[], over = 0.6, along: string | null = null) {
  const prevKind = S.kind;
  S.kind = KIND.TILE;
  const alongU = along ? along === 'u' : u1 - u0 >= v1 - v0;
  const spanA: [number, number] = alongU ? [u0 - over, u1 + over] : [v0 - over, v1 + over];
  const spanB: [number, number] = alongU ? [v0 - over, v1 + over] : [u0 - over, u1 + over];
  const midB = (spanB[0] + spanB[1]) / 2;
  const drop = (over * (ridgeH - eaveH)) / ((spanB[1] - spanB[0]) / 2 - over);
  const ptOn = (alongPos: number, acrossPos: number, yRel: number) => (alongU ? toWorld3(alongPos, acrossPos, yRel) : toWorld3(acrossPos, alongPos, yRel));
  const eaveDropY = eaveH - drop;
  const eave0 = [ptOn(spanA[0], spanB[0], eaveDropY), ptOn(spanA[1], spanB[0], eaveDropY)];
  const eave1 = [ptOn(spanA[0], spanB[1], eaveDropY), ptOn(spanA[1], spanB[1], eaveDropY)];
  const ridge = [ptOn(spanA[0], midB, ridgeH), ptOn(spanA[1], midB, ridgeH)];
  const slopeHint = (acrossPos: number) => {
    const pt = ptOn((spanA[0] + spanA[1]) / 2, acrossPos, 0);
    const center = ptOn((spanA[0] + spanA[1]) / 2, midB, 0);
    return [pt[0] - center[0], 2, pt[2] - center[2]];
  };

  S.quad(eave0[0], eave0[1], ridge[1], ridge[0], col, slopeHint(spanB[0]));
  S.quad(eave1[1], eave1[0], ridge[0], ridge[1], shade(col, 0.86), slopeHint(spanB[1]));
  S.beam([ridge[0][0], ridge[0][1] + 0.04, ridge[0][2]], [ridge[1][0], ridge[1][1] + 0.04, ridge[1][2]], 0.45, 0.12, shade(col, 0.7));
  for (const edge of [eave0, eave1]) S.beam([edge[0][0], edge[0][1] - 0.1, edge[0][2]], [edge[1][0], edge[1][1] - 0.1, edge[1][2]], 0.12, 0.2, shade(col, 0.55));

  S.kind = KIND.PLAIN;
  S.quad(ridge[0], ridge[1], eave0[1], eave0[0], shade(col, 0.45), [0, -1, 0]);
  S.quad(ridge[1], ridge[0], eave1[0], eave1[1], shade(col, 0.45), [0, -1, 0]);
  for (const endIdx of [0, 1]) {
    const endCoord = alongU ? (endIdx ? u1 : u0) : (endIdx ? v1 : v0);
    const g0 = ptOn(endCoord, spanB[0] + over, eaveH);
    const g1 = ptOn(endCoord, spanB[1] - over, eaveH);
    const gr = ptOn(endCoord, midB, ridgeH - 0.05);
    const outRef = ptOn(endCoord + (endIdx ? 1 : -1), midB, 0);
    const baseRef = ptOn(endCoord, midB, 0);
    S.tri(g0, g1, gr, shade(COLORS.wallAlt, 0.95), [outRef[0] - baseRef[0], 0.1, outRef[2] - baseRef[2]]);
    S.tri(g1, g0, gr, shade(COLORS.wallAlt, 0.95), [baseRef[0] - outRef[0], 0.1, baseRef[2] - outRef[2]]);
  }
  S.kind = prevKind;
}

// stall bays along one side of a hall
function drawStallBays(S, side: string, u0: number, u1: number, v0: number, v1: number, eaveH: number, seed: number, awning = 1.3, awnCol = COLORS.roofZinc) {
  const alongU = side === 'v0' || side === 'v1';
  const start = alongU ? u0 : v0;
  const end = alongU ? u1 : v1;
  const fixed = side === 'v0' ? v0 : side === 'v1' ? v1 : side === 'u0' ? u0 : u1;
  const outSign = side === 'v0' || side === 'u0' ? -1 : 1;
  const count = Math.max(1, Math.round((end - start) / 3.3));
  const bayW = (end - start) / count;
  const openTop = Math.min(2.4, eaveH - 0.3);
  const sideRect = (a0: number, a1: number, w0: number, w1: number, y0: number, y1: number, col: number[]) =>
    (alongU ? boxUV(S, a0, a1, Math.min(w0, w1), Math.max(w0, w1), y0, y1, col) : boxUV(S, Math.min(w0, w1), Math.max(w0, w1), a0, a1, y0, y1, col));

  for (let i = 0; i < count; i++) {
    const a0 = start + i * bayW + 0.18;
    const a1 = start + (i + 1) * bayW - 0.18;
    if (hash2(seed + i, 3) < 0.55) {
      sideRect(a0, a1, fixed, fixed + outSign * 0.06, 0.12, openTop, COLORS.dark);
      sideRect(a0 + 0.2, a1 - 0.2, fixed + outSign * 0.06, fixed + outSign * 0.5, 0.12, 0.9, GOODS_COLS[Math.floor(hash2(seed + i, 5) * GOODS_COLS.length)]);
    } else {
      sideRect(a0, a1, fixed, fixed + outSign * 0.08, 0.12, openTop, SHUTTER_COLS[Math.floor(hash2(seed + i, 7) * SHUTTER_COLS.length)]);
    }
  }
  if (awning > 0) {
    const outer = fixed + outSign * awning;
    const yHigh = openTop + 0.25;
    const yLow = openTop - 0.05;
    const pt = (alongPos: number, acrossPos: number, yRel: number) => (alongU ? toWorld3(alongPos, acrossPos, yRel) : toWorld3(acrossPos, alongPos, yRel));
    const prevKind = S.kind;
    S.kind = KIND.PLAIN;
    const c0 = pt(start, fixed, yHigh), c1 = pt(end, fixed, yHigh), c2 = pt(end, outer, yLow), c3 = pt(start, outer, yLow);
    S.quad(c0, c1, c2, c3, awnCol, [0, 1, 0]);
    S.quad(c1, c0, c3, c2, shade(awnCol, 0.5), [0, -1, 0]);
    S.kind = prevKind;
  }
}

// street face of a front stall hall: shop sign boards + slung tarps
function drawShopFront(S, side: string, start: number, end: number, fixed: number, eaveEdgeY: number, seed: number, over = 0.6) {
  const alongU = side === 'v0' || side === 'v1';
  const outSign = side === 'v0' || side === 'u0' ? -1 : 1;
  const sideRect = (a0: number, a1: number, w0: number, w1: number, y0: number, y1: number, col: number[]) =>
    (alongU ? boxUV(S, a0, a1, Math.min(w0, w1), Math.max(w0, w1), y0, y1, col) : boxUV(S, Math.min(w0, w1), Math.max(w0, w1), a0, a1, y0, y1, col));
  const pt = (alongPos: number, acrossPos: number, yRel: number) => (alongU ? toWorld3(alongPos, acrossPos, yRel) : toWorld3(acrossPos, alongPos, yRel));
  const topY = eaveEdgeY - 0.12;
  const botY = Math.max(eaveEdgeY - 0.8, 2.42);
  const boardEdge = fixed + outSign * (over - 0.08);
  S.kind = KIND.PLAIN;

  for (let pos = start + 0.15, i = 0; pos < end - 0.6; i++) {
    const nextPos = Math.min(end - 0.15, pos + 2.8 + hash2(seed + i, 1) * 4.2);
    const col = SIGN_COLS[Math.floor(hash2(seed + i, 2) * SIGN_COLS.length)];
    sideRect(pos, nextPos, boardEdge, boardEdge + outSign * 0.1, botY, topY, col);
    const ink = col === SIGN_COLS[0] || col === SIGN_COLS[4] || col === SIGN_COLS[3] ? COLORS.inkRed : COLORS.inkWhite;
    if (nextPos - pos > 1.6 && topY - botY > 0.35) sideRect(pos + 0.35, nextPos - 0.35, boardEdge + outSign * 0.1, boardEdge + outSign * 0.13, botY + (topY - botY) * 0.3, botY + (topY - botY) * 0.7, ink);
    pos = nextPos + 0.06;
  }
  for (let pos = start + 0.3, i = 0; pos < end - 1; i++) {
    const nextPos = Math.min(end - 0.3, pos + 2.5 + hash2(seed + i, 5) * 4);
    const col = TARP_COLS[Math.floor(hash2(seed + i, 6) * TARP_COLS.length)];
    if (hash2(seed + i, 7) < 0.72) {
      const w0 = boardEdge - outSign * 0.02;
      const w1 = fixed + outSign * (over + 0.75);
      const lowY = 1.75 + hash2(seed + i, 8) * 0.25;
      const c0 = pt(pos, w0, botY - 0.02), c1 = pt(nextPos, w0, botY - 0.02), c2 = pt(nextPos, w1, lowY), c3 = pt(pos, w1, lowY);
      S.quad(c0, c1, c2, c3, col, [0, 1, 0]);
      S.quad(c1, c0, c3, c2, shade(col, 0.55), [0, -1, 0]);
    }
    pos = nextPos + 0.4 + hash2(seed + i, 9) * 1.2;
  }
}

function drawHall(S, u0: number, u1: number, v0: number, v1: number, topH: number, roofCol: number[], seed: number, opts: Record<string, any> = {}) {
  const { all = false, eave = null, awnings = true, awn = COLORS.roofZinc, front = null } = opts;
  const eaveH = eave ?? topH - Math.min(1.2, Math.max(0.6, Math.min(u1 - u0, v1 - v0) * 0.065));
  S.kind = KIND.PLAIN;
  boxUV(S, u0 - 0.1, u1 + 0.1, v0 - 0.1, v1 + 0.1, 0, 0.3, COLORS.plinth);
  boxUV(S, u0, u1, v0, v1, 0.3, eaveH, shade(COLORS.wall, 0.94 + hash2(seed, 1) * 0.1));
  drawGable(S, u0, u1, v0, v1, eaveH, topH, shade(roofCol, 0.92 + hash2(seed, 2) * 0.14));
  const alongU = u1 - u0 >= v1 - v0;
  const sides = all ? ['v0', 'v1', 'u0', 'u1'] : alongU ? ['v0', 'v1'] : ['u0', 'u1'];
  sides.forEach((side, idx) => drawStallBays(S, side, u0, u1, v0, v1, eaveH, seed * 13 + idx * 101, awnings && side !== front ? 1.3 : 0, awn));
  if (front) {
    const halfSpan = (alongU ? v1 - v0 : u1 - u0) / 2;
    const isEaveSide = (front === 'u0' || front === 'u1') !== alongU;
    const edgeY = isEaveSide ? eaveH - (0.6 * (topH - eaveH)) / halfSpan : eaveH;
    const fixed = front === 'v0' ? v0 : front === 'v1' ? v1 : front === 'u0' ? u0 : u1;
    const alongV = front === 'u0' || front === 'u1';
    drawShopFront(S, front, alongV ? v0 : u0, alongV ? v1 : u1, fixed, edgeY, seed * 31);
  }
}

function drawGrilles(S, side: string, u0: number, u1: number, v0: number, v1: number, y0: number, y1: number) {
  const alongU = side === 'v0' || side === 'v1';
  const start = alongU ? u0 : v0;
  const end = alongU ? u1 : v1;
  const fixed = side === 'v0' ? v0 : side === 'v1' ? v1 : side === 'u0' ? u0 : u1;
  const outSign = side === 'v0' || side === 'u0' ? -1 : 1;
  const sideRect = (a0: number, a1: number, w0: number, w1: number, b0: number, b1: number, col: number[]) =>
    (alongU ? boxUV(S, a0, a1, Math.min(w0, w1), Math.max(w0, w1), b0, b1, col) : boxUV(S, Math.min(w0, w1), Math.max(w0, w1), a0, a1, b0, b1, col));
  const pt = (alongPos: number, acrossPos: number, yRel: number) => (alongU ? toWorld3(alongPos, acrossPos, yRel) : toWorld3(acrossPos, alongPos, yRel));
  const count = Math.max(1, Math.round((end - start) / 2.6));
  const step = (end - start) / count;
  S.kind = KIND.PLAIN;
  for (let i = 0; i < count; i++) {
    const a0 = start + i * step + 0.45;
    const a1 = start + (i + 1) * step - 0.45;
    sideRect(a0, a1, fixed, fixed + outSign * 0.04, y0, y1, COLORS.dark);
    const facePos = fixed + outSign * 0.07;
    for (let k = 1; k < 3; k++) {
      const barY = y0 + ((y1 - y0) * k) / 3;
      S.beam(pt(a0, facePos, barY), pt(a1, facePos, barY), 0.05, 0.06, COLORS.wallPav);
    }
    const barCount = Math.max(2, Math.round((a1 - a0) / 0.3));
    for (let k = 1; k < barCount; k++) {
      const barPos = a0 + ((a1 - a0) * k) / barCount;
      S.beam(pt(barPos, facePos, y0), pt(barPos, facePos, y1), 0.05, 0.06, COLORS.wallPav);
    }
  }
}

function drawCornerPavilion(S, u0: number, u1: number, v0: number, v1: number, topH: number, roofCol: number[], seed: number, opts: Record<string, any> = {}) {
  const { face = null, eave = topH - 0.9, lean = 0, vents = null } = opts;
  S.kind = KIND.PLAIN;
  boxUV(S, u0 - 0.1, u1 + 0.1, v0 - 0.1, v1 + 0.1, 0, 0.3, COLORS.plinth);
  boxUV(S, u0, u1, v0, v1, 0.3, eave, COLORS.wallPav);
  drawGable(S, u0, u1, v0, v1, eave, topH, roofCol, 0.6, face ? 'v' : null);
  for (const side of ['v0', 'v1', 'u0', 'u1']) drawStallBays(S, side, u0, u1, v0, v1, Math.min(eave, 3.0), seed * 7 + side.charCodeAt(1), 0);
  if (vents) drawGrilles(S, vents, u0, u1, v0, v1, 2.55, Math.min(eave - 0.15, 3.25));
  if (!face) return;

  const outSign = face === 'v0' ? -1 : 1;
  const faceV = face === 'v0' ? v0 : v1;
  const midU = (u0 + u1) / 2;
  const halfW = (u1 - u0) / 2;
  const gablePt = (du: number, yRel: number, depth = 0) => toWorld3(midU + du, faceV + outSign * (0.04 + depth), yRel);
  const normalHint = [AXIS_V[0] * outSign, 0.1, AXIS_V[1] * outSign];
  S.tri(gablePt(-halfW, eave), gablePt(halfW, eave), gablePt(0, topH - 0.05), COLORS.wallPav, normalHint);
  boxUV(S, u0 - 0.2, u1 + 0.2, faceV + outSign * 0.02 - 0.25, faceV + outSign * 0.02 + 0.25, eave - 0.25, eave, shade(COLORS.wallPav, 0.92));

  const chordHalf = Math.min(1.3, halfW * 0.42);
  const archH = Math.min(0.6, (topH - eave) * (1 - chordHalf / halfW) * 0.9);
  const sillY = eave + 0.04;
  const radius = (chordHalf * chordHalf + archH * archH) / (2 * archH);
  const centerY = sillY + archH - radius;
  const halfAng = Math.asin(chordHalf / radius);
  const segs = 10;
  const arcPt = (idx: number, scale = 1): [number, number] => {
    const ang = -halfAng + (2 * halfAng * idx) / segs;
    return [radius * scale * Math.sin(ang), centerY + radius * scale * Math.cos(ang)];
  };
  const rimCol = shade(COLORS.wallPav, 1.08);
  for (let k = 0; k < segs; k++) {
    const [x0, y0] = arcPt(k);
    const [x1, y1] = arcPt(k + 1);
    S.tri(gablePt(0, sillY, 0.03), gablePt(x0, y0, 0.03), gablePt(x1, y1, 0.03), COLORS.lunetteGlass, normalHint);
    const [p0, q0] = arcPt(k, 1.1);
    const [p1, q1] = arcPt(k + 1, 1.1);
    S.quad(gablePt(x0, y0, 0.035), gablePt(p0, Math.max(q0, sillY), 0.035), gablePt(p1, Math.max(q1, sillY), 0.035), gablePt(x1, y1, 0.035), rimCol, normalHint);
  }
  for (let m = 1; m < 6; m++) {
    const mullionX = -chordHalf + (2 * chordHalf * m) / 6;
    const mullionY = centerY + Math.sqrt(radius * radius - mullionX * mullionX);
    S.beam(gablePt(mullionX, sillY, 0.06), gablePt(mullionX, mullionY, 0.06), 0.06, 0.05, COLORS.dark);
  }
  boxUV(S, u0 + 0.3, u1 - 0.3, Math.min(faceV, faceV + outSign * 1.1), Math.max(faceV, faceV + outSign * 1.1), eave - 0.55, eave - 0.4, COLORS.canopySlab);

  if (lean > 0) {
    const outerV = faceV + outSign * lean;
    const highY = eave - 0.6;
    const lowY = 2.3;
    const prevKind = S.kind;
    S.kind = KIND.PLAIN;
    const c0 = toWorld3(u0 - 0.3, faceV, highY), c1 = toWorld3(u1 + 0.3, faceV, highY), c2 = toWorld3(u1 + 0.3, outerV, lowY), c3 = toWorld3(u0 - 0.3, outerV, lowY);
    S.quad(c0, c1, c2, c3, COLORS.rustSheet, [0, 1, 0]);
    S.quad(c1, c0, c3, c2, shade(COLORS.rustSheet, 0.5), [0, -1, 0]);
    S.beam(toWorld3(u0 - 0.3, outerV, lowY - 0.08), toWorld3(u1 + 0.3, outerV, lowY - 0.08), 0.06, 0.18, COLORS.blueEdge);
    for (let uPos = u0; uPos <= u1 + 0.01; uPos += (u1 - u0) / 3) {
      const pt = toWorld(uPos, outerV - outSign * 0.15);
      S.cyl(pt[0], pt[1], yardY, yardY + lowY - 0.15, 0.05, 0.05, 4, COLORS.dark, { cap: false });
    }
    S.kind = prevKind;
  }
}

function drawLeanTo(S, side: string, start: number, end: number, fixed: number, depth: number, highY: number, lowY: number, cols: number[][], seed: number, run = 7) {
  const alongU = side === 'v0' || side === 'v1';
  const outSign = side === 'v0' || side === 'u0' ? -1 : 1;
  const pt = (alongPos: number, acrossPos: number, yRel: number) => (alongU ? toWorld3(alongPos, acrossPos, yRel) : toWorld3(acrossPos, alongPos, yRel));
  const prevKind = S.kind;
  S.kind = KIND.PLAIN;
  for (let pos = start, i = 0; pos < end - 0.1; i++) {
    const nextPos = Math.min(end, pos + run * (0.6 + hash2(seed + i, 2) * 0.8));
    const col = cols[Math.floor(hash2(seed + i, 4) * cols.length)];
    const jitterY = (hash2(seed + i, 6) - 0.5) * 0.12;
    const outer = fixed + outSign * depth;
    const c0 = pt(pos, fixed, highY + jitterY), c1 = pt(nextPos, fixed, highY + jitterY), c2 = pt(nextPos, outer, lowY + jitterY), c3 = pt(pos, outer, lowY + jitterY);
    S.quad(c0, c1, c2, c3, col, [0, 1, 0]);
    S.quad(c1, c0, c3, c2, shade(col, 0.5), [0, -1, 0]);
    const postPt = alongU ? toWorld(pos + 0.2, outer - outSign * 0.15) : toWorld(outer - outSign * 0.15, pos + 0.2);
    S.cyl(postPt[0], postPt[1], yardY, yardY + lowY + jitterY, 0.04, 0.04, 4, COLORS.dark, { cap: false });
    pos = nextPos;
  }
  S.kind = prevKind;
}

function createGateSignTexture(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#b3201c';
  ctx.fillRect(0, 0, 512, 96);
  ctx.strokeStyle = '#f2c94c';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 500, 84);
  const text = 'CHỢ TÂY LỘC'.normalize('NFC');
  let fontSize = 58;
  const fontSpec = () => `800 ${fontSize}px "Helvetica Neue", Arial, "Segoe UI", Roboto, "Noto Sans", sans-serif`;
  ctx.font = fontSpec();
  const textW = ctx.measureText(text).width;
  if (textW > 440) {
    fontSize *= 440 / textW;
    ctx.font = fontSpec();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f7d54a';
  ctx.fillText(text, 256, 52);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// paved yard with tree pits, planting strips along Nguyễn Trãi, and tree registration
function buildYardAndPlanting(S, data) {
  const yardRing = offStreets(data, [toWorld(YARD_U0, YARD_V0), toWorld(YARD_U1, YARD_V0), toWorld(YARD_U1, YARD_V1), toWorld(YARD_U0, YARD_V1)]);
  const inYard = (x: number, z: number) => {
    let inside = false;
    for (let i = 0, j = yardRing.length - 1; i < yardRing.length; j = i++) {
      const [xi, zi] = yardRing[i];
      const [xj, zj] = yardRing[j];
      if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
    }
    return inside;
  };
  const edgeDist = (x: number, z: number) => {
    let minDist = Infinity;
    for (let i = 0, j = yardRing.length - 1; i < yardRing.length; j = i++) {
      const [ax, az] = yardRing[j];
      const [bx, bz] = yardRing[i];
      const dx = bx - ax, dz = bz - az;
      const frac = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
      minDist = Math.min(minDist, Math.hypot(x - ax - frac * dx, z - az - frac * dz));
    }
    return minDist;
  };
  const disk = (center: [number, number], radius: number, segs = 14): [number, number][] =>
    Array.from({ length: segs }, (_, k) => {
      const ang = (k / segs) * Math.PI * 2;
      return [center[0] + Math.cos(ang) * radius, center[1] + Math.sin(ang) * radius];
    });
  const rectUV = (u0: number, u1: number, v0: number, v1: number) => [toWorld(u0, v0), toWorld(u1, v0), toWorld(u1, v1), toWorld(u0, v1)];

  const pits: { uPos: number; vPos: number; scale: number; radius: number; pt: [number, number]; pit: [number, number][] | null }[] = [];
  for (const [uPos, vPos, scale] of TREES) {
    const pt = toWorld(uPos, vPos);
    if (!inYard(pt[0], pt[1])) continue;
    const radius = 2.2 * scale + 1.9;
    const pitR = Math.min(1.2 * scale + 0.3, edgeDist(pt[0], pt[1]) - 0.15);
    pits.push({ uPos, vPos, scale, radius, pt, pit: pitR > 0.4 ? disk(pt, pitR, 10) : null });
  }
  const kerbTrees = KERB_TREES.map(([uPos, vPos, scale]) => ({ uPos, vPos, scale, radius: 2.2 * scale + 1.9, pt: toWorld(uPos, vPos), pit: null }));
  const stripRings = STRIPS.map(([v0, v1]) => rectUV(STRIP_U[0], STRIP_U[1], v0, v1));
  const aprons = pits.map((item) => [disk(item.pt, item.radius)]).concat(STRIPS.map(([v0, v1]) => [rectUV(59.8, 68, v0 - 2, v1 + 2)]));
  const yardPoly = [yardRing];

  const fillPolys = (multiPoly, y: number, col: number[], kind: number) => {
    const prevKind = S.kind;
    S.kind = kind;
    for (const poly of multiPoly) {
      const rings = poly.map((ring) => ring.slice(0, -1).map(([x, z]) => new T3.Vector2(x, z)));
      const faces = T3.ShapeUtils.triangulateShape(rings[0], rings.slice(1));
      const pts = [].concat(...rings);
      for (const face of faces) {
        const p0 = pts[face[0]], p1 = pts[face[1]], p2 = pts[face[2]];
        S.tri([p0.x, y, p0.y], [p1.x, y, p1.y], [p2.x, y, p2.y], col, [0, 1, 0]);
      }
    }
    S.kind = prevKind;
  };
  const drawRim = (ring: [number, number][], col: number[]) => {
    for (let i = 0; i < ring.length; i++) {
      const p0 = ring[i];
      const p1 = ring[(i + 1) % ring.length];
      const mid = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
      S.quad([p0[0], yardY - 0.12, p0[1]], [p1[0], yardY - 0.12, p1[1]], [p1[0], yardY, p1[1]], [p0[0], yardY, p0[1]], col, [CENTER[0] - mid[0], 0.001, CENTER[1] - mid[1]]);
    }
  };

  S.kind = KIND.PLAIN;
  S.prism(yardRing, yardY - 1.0, yardY, COLORS.kerb, COLORS.pave, { top: false });
  const pavedStart = S.n;
  for (let uPos = YARD_U0 - 2; uPos < YARD_U1 + 2; uPos += 12) {
    for (let vPos = YARD_V0 - 2; vPos < YARD_V1 + 2; vPos += 12) {
      const cell = polygonClipping.intersection([rectUV(uPos, uPos + 12, vPos, vPos + 12)], yardPoly);
      if (cell.length) fillPolys(polygonClipping.difference(cell, ...aprons), yardY, COLORS.pave, KIND.ROAD);
    }
  }
  (S.paved = S.paved || []).push([pavedStart, S.n]);

  const beds = pits.filter((item) => item.pit).map((item) => [item.pit]).concat(stripRings.map((ring) => [ring]));
  fillPolys(polygonClipping.difference(polygonClipping.intersection((polygonClipping.union as any)(...aprons), yardPoly), ...beds), yardY, COLORS.pave, KIND.ROAD);
  S.kind = KIND.PLAIN;
  for (const item of pits) {
    if (item.pit) {
      S.prism(item.pit, yardY - 1.0, yardY - 0.12, COLORS.kerb, COLORS.soil, { topKind: KIND.GROUND });
      drawRim(item.pit, COLORS.kerb);
    }
  }
  for (const ring of stripRings) {
    S.prism(ring, yardY - 1.0, yardY - 0.12, COLORS.kerb, COLORS.stripGrass, { topKind: KIND.GROUND });
    drawRim(ring, COLORS.kerb);
  }
  S.kind = KIND.PLAIN;
  if (Array.isArray(data.trees)) {
    for (const item of pits.concat(kerbTrees)) data.trees.push(Math.round(item.pt[0] * 10), Math.round(item.pt[1] * 10), Math.round(item.scale * 10), 0);
  }
  return (uPos: number, vPos: number, margin: number) => pits.some((item) => Math.hypot(uPos - item.uPos, vPos - item.vPos) < item.radius + margin);
}

// main E-plan hall, oval hall, inner court buildings, east stall halls, and tarpaulins
function buildMarketHallsAndTarps(S, nearPit: (uPos: number, vPos: number, margin: number) => boolean) {
  const hallTop = 3.5;
  drawHall(S, -57.3, -45.3, -34.3, 37.8, hallTop, COLORS.roofHall, 1, { all: false, awnings: false });
  drawHall(S, -45.3, 7.2, 36.7, 50.3, hallTop, COLORS.roofHall, 2);
  drawHall(S, -44.7, 8.5, -45.9, -33.4, hallTop, COLORS.maroonSheet, 3);
  drawHall(S, -22.8, 1.2, -6.0, 9.4, hallTop, COLORS.roofHall, 4, { all: true });
  drawHall(S, -45.3, -37.7, -3.0, 5.5, hallTop - 0.3, COLORS.roofHall, 5, { awnings: false });

  drawCornerPavilion(S, -60.6, -54.6, -48.6, -34.3, 4.4, COLORS.roofHall, 7, { face: 'v0', eave: 3.4, lean: 1.8, vents: 'u0' });
  drawCornerPavilion(S, -54.6, -45.3, -48.6, -34.3, 4.0, COLORS.cornerSheet, 17, { eave: 3.2 });
  drawCornerPavilion(S, -61.6, -45.3, 37.8, 52.2, 4.4, COLORS.roofHall, 6, { face: 'v1', eave: 3.4, lean: 1.2, vents: 'u0' });
  drawCornerPavilion(S, -61.0, -57.3, -6.6, 8.5, hallTop, COLORS.roofHall, 8);

  drawLeanTo(S, 'u0', -34.3, -6.6, -57.3, 3.7, 2.55, 2.15, LEAN_GREENS, 71);
  drawLeanTo(S, 'u0', 8.5, 37.8, -57.3, 3.7, 2.55, 2.15, LEAN_GREENS, 72);
  drawLeanTo(S, 'u0', 38.3, 51.7, -61.6, 1.2, 2.55, 2.25, LEAN_GREENS, 75, 5);
  for (const vPos of [38.5, 50.5]) {
    const pt = toWorld(-64.2, vPos);
    S.cyl(pt[0], pt[1], yardY, yardY + 2.3, 0.04, 0.04, 4, COLORS.dark, { cap: false });
    boxUV(S, -65.3, -63.1, vPos - 1.1, vPos + 1.1, 2.3, 2.38, LEAN_GREENS[0]);
  }
  drawLeanTo(S, 'u1', -32.0, -3.0, -45.3, 7.0, 2.55, 2.2, LEAN_GREYS, 73, 9);
  drawLeanTo(S, 'u1', 5.5, 35.3, -45.3, 7.0, 2.55, 2.2, LEAN_GREYS, 74, 9);

  // oval hall at the head of the middle bar
  const ovalWorld = OVAL_OUTLINE.map(([uPos, vPos]) => toWorld(uPos, vPos));
  const ovalRoof = OVAL_OUTLINE.map(([uPos, vPos]) => toWorld(-30.2 + (uPos + 30.2) * 1.06, 1.5 + (vPos - 1.5) * 1.04));
  S.kind = KIND.PLAIN;
  S.prism(ovalWorld, yardY, yardY + 0.3, COLORS.plinth, COLORS.plinth);
  S.prism(ovalWorld, yardY + 0.3, yardY + 2.8, shade(COLORS.wall, 0.98), COLORS.wall, { top: false });
  S.prism(ovalRoof, yardY + 2.7, yardY + 3.7, COLORS.roofHall, shade(COLORS.roofHall, 0.9), { scaleTop: 0.35, centre: toWorld(-30.2, 1.5) });
  S.kind = KIND.PLAIN;
  boxUV(S, -31.5, -29, -2, 5, 3.7, 4.2, COLORS.wallAlt, { top: shade(COLORS.roofHall, 0.85) });
  for (let i = 0; i < OVAL_OUTLINE.length; i++) {
    const [uPos, vPos] = OVAL_OUTLINE[i];
    if (Math.abs(vPos - 1.5) < 13) continue;
    const pt = toWorld(-30.2 + (uPos + 30.2) * 1.01, 1.5 + (vPos - 1.5) * 1.01);
    S.box(pt[0], pt[1], yardY + 0.3, yardY + 2.3, 1.6, 0.1, FRAME_ANGLE + Math.atan2(vPos - 1.5, uPos + 30.2) + Math.PI / 2, i % 2 ? COLORS.dark : SHUTTER_COLS[i % 4]);
  }
  drawStallBays(S, 'u0', -37.8, -22.7, -11.3, 14.0, 2.8, 51, 1.2, COLORS.roofHall);
  drawStallBays(S, 'u1', -37.8, -22.7, -11.3, 14.0, 2.8, 52, 1.2, COLORS.roofHall);

  // two-storey block and sheds in the courts of the E
  S.kind = KIND.FACADE;
  boxUV(S, -14.0, 9.0, 18.3, 31.1, 0, 6.2, COLORS.wallAlt, { top: shade(COLORS.pave, 0.95), topKind: KIND.FLAT });
  S.kind = KIND.PLAIN;
  boxUV(S, -14.15, 9.15, 18.15, 31.25, 3.3, 3.5, shade(COLORS.wallAlt, 0.85));
  drawGable(S, -14.0, 9.0, 18.3, 31.1, 6.2, 7.7, COLORS.twoStoreyRoof, 0.6, 'u');
  drawStallBays(S, 'v0', -14.0, 9.0, 18.3, 31.1, 3.0, 61, 1.4, COLORS.roofBlue);
  drawStallBays(S, 'v1', -14.0, 9.0, 18.3, 31.1, 3.0, 62, 1.4, COLORS.roofBlue);
  drawHall(S, -12.6, 10.2, -26.0, -13.3, 3.0, hex('#87513f'), 9);
  drawHall(S, -37.0, -30.7, 22.0, 35.3, 3.5, COLORS.roofZinc, 10, { awnings: false });
  drawHall(S, -36.4, -30.2, -29.2, -19.0, 3.5, COLORS.roofZinc, 11, { awnings: false });

  // east stall halls
  drawHall(S, 21.8, 41.0, -29.4, 0.6, 4.5, hex('#8f4f3c'), 12, { all: true });
  drawHall(S, 21.3, 40.5, 6.6, 34.8, 3.5, hex('#6e4c40'), 13, { all: true });
  drawHall(S, 12.85, 39.6, -45.6, -34.9, 3.0, hex('#5e4a42'), 14);
  drawHall(S, 13.45, 40.15, 38.8, 49.5, 4.0, hex('#5f5550'), 15);
  drawHall(S, 43.6, 53.9, -45.6, -1.5, 4.0, hex('#94503d'), 16, { all: true, front: 'u1' });
  drawHall(S, 43.4, 53.5, 7.0, 50.5, 3.8, hex('#8a5040'), 17, { all: true, eave: 3.1, front: 'u1' });

  // stall-holders' tarpaulins over the courts and lane
  const courtZones: [number, number, number, number][] = [[-37.0, 12.0, -32.6, -6.8], [-37.0, 9.0, 10.2, 35.8], [9.5, 20.6, -34.0, 37.8]];
  const keepOut: [number, number, number, number][] = [
    [-13.4, 11.0, -26.8, -12.5], [-37.2, -29.4, -30.0, -18.2], [-37.8, -29.9, 21.2, 36.1],
    [-15.5, 10.5, 16.8, 32.6], [-24.3, 2.7, -7.5, 10.9], [-38.4, -22.0, -17.0, 20.0], [9.0, 21.0, -0.6, 7.6],
  ];
  for (let i = 0, placed = 0; i < 600 && placed < 95; i++) {
    const [a0, a1, b0, b1] = courtZones[i % 3];
    const uPos = a0 + hash2(i, 21) * (a1 - a0);
    const vPos = b0 + hash2(i, 22) * (b1 - b0);
    const width = 2.2 + hash2(i, 23) * 2.4;
    const depth = 1.8 + hash2(i, 24) * 1.8;
    const bounds = [uPos - width / 2, uPos + width / 2, vPos - depth / 2, vPos + depth / 2];
    if (bounds[0] < a0 || bounds[1] > a1 || bounds[2] < b0 || bounds[3] > b1) continue;
    if (keepOut.some(([k0, k1, l0, l1]) => bounds[1] > k0 && bounds[0] < k1 && bounds[3] > l0 && bounds[2] < l1)) continue;
    if (nearPit(uPos, vPos, Math.hypot(width, depth) / 2 + 0.6)) continue;
    const tarpH = 2.3 + hash2(i, 25) * 0.45;
    const tilt = 0.15 + hash2(i, 26) * 0.2;
    const col = COURT_TARPS[Math.floor(hash2(i, 27) * COURT_TARPS.length)];
    const c0 = toWorld3(bounds[0], bounds[2], tarpH + tilt);
    const c1 = toWorld3(bounds[1], bounds[2], tarpH + tilt);
    const c2 = toWorld3(bounds[1], bounds[3], tarpH - tilt);
    const c3 = toWorld3(bounds[0], bounds[3], tarpH - tilt);
    S.quad(c0, c1, c2, c3, col, [0, 1, 0]);
    S.quad(c1, c0, c3, c2, shade(col, 0.5), [0, -1, 0]);
    const polePt = toWorld(bounds[0] + 0.2, bounds[3] - 0.2);
    S.cyl(polePt[0], polePt[1], yardY, yardY + tarpH - tilt, 0.035, 0.035, 4, COLORS.dark, { cap: false });
    placed++;
  }
}

// market gate on Nguyễn Trãi, billboard, forecourt motorbikes, cars, and umbrellas
function buildGateAndForecourt(S, nearPit: (uPos: number, vPos: number, margin: number) => boolean) {
  S.kind = KIND.PLAIN;
  for (const vPos of [GATE_V - 3, GATE_V + 3]) boxUV(S, GATE_U - 0.35, GATE_U + 0.35, vPos - 0.35, vPos + 0.35, 0, 4.1, COLORS.gold);
  boxUV(S, GATE_U - 0.4, GATE_U + 0.4, GATE_V - 3.4, GATE_V + 3.4, 3.6, 4.1, COLORS.gold);
  drawGable(S, GATE_U - 0.65, GATE_U + 0.65, GATE_V - 3.65, GATE_V + 3.65, 4.1, 4.7, COLORS.tileRed, 0.6, 'v');
  S.kind = KIND.PLAIN;
  boxUV(S, GATE_U - 0.3, GATE_U + 0.3, GATE_V - 2.15, GATE_V + 2.15, 4.35, 5.5, COLORS.gold);
  boxUV(S, GATE_U + 0.3, GATE_U + 0.36, GATE_V - 1.95, GATE_V + 1.95, 4.5, 5.35, COLORS.boardRed);
  drawGable(S, GATE_U - 0.35, GATE_U + 0.35, GATE_V - 2.35, GATE_V + 2.35, 5.5, 5.95, COLORS.tileRed, 0.45, 'v');
  S.kind = KIND.PLAIN;
  const gatePt = toWorld(GATE_U, GATE_V);
  S.cyl(gatePt[0], gatePt[1], yardY + 5.9, yardY + 7.6, 0.03, 0.03, 5, COLORS.dark, { cap: false });
  const f0 = toWorld3(GATE_U, GATE_V + 0.03, 6.95);
  const f1 = toWorld3(GATE_U, GATE_V + 0.93, 6.95);
  const f2 = toWorld3(GATE_U, GATE_V + 0.93, 7.55);
  const f3 = toWorld3(GATE_U, GATE_V + 0.03, 7.55);
  S.quad(f0, f1, f2, f3, COLORS.flagRed, [AXIS_U[0], 0.1, AXIS_U[1]]);
  S.quad(f1, f0, f3, f2, COLORS.flagRed, [-AXIS_U[0], 0.1, -AXIS_U[1]]);

  // billboard over south front hall
  for (const vPos of [10.5, 15.5, 20.5]) {
    const pt = toWorld(52.3, vPos);
    S.cyl(pt[0], pt[1], yardY + 3.2, yardY + 4.0, 0.05, 0.05, 4, COLORS.dark, { cap: false });
  }
  boxUV(S, 52.24, 52.36, 9.5, 21.5, 3.9, 5.5, COLORS.signWhite);
  boxUV(S, 52.36, 52.4, 9.8, 15.3, 4.05, 5.35, COLORS.signRed);
  boxUV(S, 52.36, 52.4, 15.7, 21.2, 4.05, 5.35, COLORS.signBlue);

  // parked motorbikes, cars, and umbrellas
  for (const [v0, v1] of [[-44, -4], [9.5, 49]] as [number, number][]) {
    for (let vPos = v0, i = 0; vPos < v1; vPos += 0.75, i++) {
      if (hash2(i + v0, 31) < 0.22) continue;
      const du = (hash2(i + v0, 32) - 0.5) * 0.4;
      boxUV(S, 55.4 + du, 57.2 + du, vPos - 0.15, vPos + 0.15, 0.25, 0.8, BIKE_COLS[Math.floor(hash2(i + v0, 33) * BIKE_COLS.length)]);
      boxUV(S, 55.9 + du, 56.7 + du, vPos - 0.13, vPos + 0.13, 0.8, 0.95, COLORS.dark);
    }
  }
  for (const [vPos, col] of [[18, hex('#d9dadb')], [-25, hex('#3a3d44')]] as [number, number[]][]) {
    boxUV(S, 58.6, 60.4, vPos - 2.2, vPos + 2.2, 0.2, 0.95, col);
    boxUV(S, 58.75, 60.25, vPos - 1.2, vPos + 1.0, 0.95, 1.45, shade(col, 0.6));
  }
  const drawUmbrella = (uPos: number, vPos: number, col: number[], radius = 1.3) => {
    const pt = toWorld(uPos, vPos);
    S.cyl(pt[0], pt[1], yardY, yardY + 2.2, 0.03, 0.03, 4, COLORS.dark, { cap: false });
    S.cyl(pt[0], pt[1], yardY + 1.9, yardY + 2.45, radius, 0.05, 8, col);
  };
  ([[16, 3], [5, -0.5], [18.5, -1]] as [number, number][]).forEach(([uPos, vPos], idx) => {
    if (!nearPit(uPos, vPos, 1.5)) drawUmbrella(uPos, vPos, BROLLY_COLS[idx % BROLLY_COLS.length]);
  });
  S.kind = KIND.PLAIN;
}

export function build({ data, S, group, THREE }) {
  let maxRise = -Infinity;
  for (let uPos = YARD_U0; uPos <= YARD_U1 + 0.1; uPos += 11) {
    for (let vPos = YARD_V0; vPos <= YARD_V1 + 0.1; vPos += 11) {
      const pt = toWorld(uPos, vPos);
      maxRise = Math.max(maxRise, rise(pt[0], pt[1]));
    }
  }
  yardY = LAND_Y + maxRise + 0.22;

  const nearPit = buildYardAndPlanting(S, data);
  buildMarketHallsAndTarps(S, nearPit);
  buildGateAndForecourt(S, nearPit);

  if (!group) return null;

  const signTex = createGateSignTexture(THREE);
  const signMat = new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.7, metalness: 0 });
  const signPt = toWorld(GATE_U + 0.37, GATE_V);
  const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 0.75), signMat);
  signMesh.position.set(signPt[0], yardY + 4.925, signPt[1]);
  signMesh.rotation.y = Math.atan2(AXIS_U[0], AXIS_U[1]);
  signMesh.userData.landmark = id;
  group.add(signMesh);

  const lightBuf = new Buf(400);
  const addStrip = (u0: number, v0: number, u1: number, v1: number, yRel: number) =>
    lightBuf.beam(toWorld3(u0, v0, yRel), toWorld3(u1, v1, yRel), 0.1, 0.1, WHITE_RGB);
  addStrip(GATE_U + 0.45, GATE_V - 2.9, GATE_U + 0.45, GATE_V + 2.9, 3.5);
  for (const [u0, u1, vPos] of [[43.6, 53.9, -2.9], [43.4, 53.5, 8.4], [21.8, 41.0, 2.0], [21.3, 40.5, 5.2], [-22.8, 1.2, -7.4], [-22.8, 1.2, 10.8], [-44.7, 8.5, -32.0], [-45.3, 7.2, 35.3]] as [number, number, number][]) {
    addStrip(u0, vPos, u1, vPos, 2.45);
  }
  for (const [uPos, v0, v1, yRel = 2.45] of [[-44.6, -32, 35.3, 2.3], [42.2, -45.6, 50.5], [20.0, -29.4, 34.8]] as [number, number, number, number?][]) {
    addStrip(uPos, v0, uPos, v1, yRel);
  }
  const lightMesh = new THREE.Mesh(lightBuf.geometry(), lightMaterial(0xffc274, 1.2));
  lightMesh.renderOrder = 19;
  lightMesh.userData.landmark = id;
  group.add(lightMesh);
  return null;
}
