import { KIND, hex, shade } from '../../geo/buf.ts';
import { LAND_Y } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import * as props from '../props.ts';

// Lăng Khải Định (Ứng Lăng), built 1920–1931 on Châu Chữ hill in reinforced concrete.
// Notes and sources: docs/places/khaidinh.md.
// Local frame: s up the axis from the precinct's front edge (SW) to back (NE), t across (+SE).
export const id = 'khaidinh';

const ORIGIN = [120.35, 7766.5];
const AXIS_UX = 0.6889, AXIS_UZ = -0.7249;
const AXIS_ANG = Math.atan2(AXIS_UZ, AXIS_UX), PERP_ANG = AXIS_ANG + Math.PI / 2;
const toWorld2 = (s, t = 0): [number, number] => [ORIGIN[0] + AXIS_UX * s - AXIS_UZ * t, ORIGIN[1] + AXIS_UZ * s + AXIS_UX * t];
const toWorld3 = (s, t, y?) => { const pt = toWorld2(s, t); return [pt[0], y, pt[1]]; };
const groundAt = (s, t = 0) => { const pt = toWorld2(s, t); return LAND_Y + rise(pt[0], pt[1]); };
const HALF_WIDTH = 24.25;

const COLORS = {
  wall: hex('#5e5c59'),
  darkWall: hex('#4c4a47'),
  roof: hex('#3f3e3c'),
  trim: hex('#a19d94'),
  pave: hex('#77746d'),
  statue: hex('#8a867e'),
  iron: hex('#1f1e1d'),
  void: hex('#1b1918'),
  palaceWall: hex('#8d8a84'),
  stone: hex('#4f4f4a'),
  grass: hex('#6f8a45'),
  wood: hex('#5a3a26'),
  tileBrown: hex('#4a3b33'),
  terra: hex('#a35a3c'),
  cheek: hex('#7b7972'),
  ridge: hex('#2f2e2c'),
};

const LEVELS = { L2: [0, 26.5], L3: [26.5, 51], L4: [51, 61], L5: [61, 70.7], L6: [70.7, 81], L7: [81, 116.5] };
const STEP_COUNTS = [37, 29, 13, 13, 13, 22];

const OUTBUILDINGS = [
  [[-32.3, 85.4], [-22.1, 90.4], [-45.2, 140.4], [-55.4, 135.5]],
  [[9.4, 50.4], [9.5, 63.9], [2.9, 63.8], [2.7, 50.5]],
];

function buildTerracesAndFlights(S, box, y0, levelY) {
  S.kind = KIND.FLAT;
  for (const key of Object.keys(LEVELS)) {
    const [sStart, sEnd] = LEVELS[key], topY = levelY[key];
    let minG = Infinity;
    for (let s = sStart; s <= sEnd; s += 3) for (const t of [-HALF_WIDTH, 0, HALF_WIDTH]) minG = Math.min(minG, groundAt(s, t));
    S.base = minG - 1 - LAND_Y;
    box((sStart + sEnd) / 2, 0, minG - 1, topY, sEnd - sStart, 2 * HALF_WIDTH, COLORS.wall, { top: COLORS.pave, topKind: KIND.ROAD });
    if (key !== 'L2') for (const side of [-1, 1]) box(sStart + 0.3, side * (HALF_WIDTH + 7) / 2, topY - 0.4, topY + 0.15, 0.7, HALF_WIDTH - 7, COLORS.trim);
    for (const side of [-1, 1]) {
      box((sStart + sEnd) / 2, side * (HALF_WIDTH - 0.3), topY, topY + 1.6, sEnd - sStart, 0.6, COLORS.wall, { top: COLORS.trim });
      for (let s = sStart + 0.3; s <= sEnd; s += Math.max(3, (sEnd - sStart) / Math.round((sEnd - sStart) / 5))) {
        box(s, side * (HALF_WIDTH - 0.3), topY, topY + 2.1, 0.9, 0.9, COLORS.darkWall, { top: COLORS.trim });
      }
    }
  }

  // Front wall with iron railing, lower retaining walls, back wall, and upper balustrades
  for (const side of [-1, 1]) {
    box(0.3, side * (HALF_WIDTH + 8.4) / 2, levelY.L2, levelY.L2 + 1.0, 0.6, HALF_WIDTH - 8.4, COLORS.wall, { top: COLORS.trim });
    S.kind = KIND.PLAIN;
    for (const [ya, yb] of ([[levelY.L2 + 1.0, levelY.L2 + 1.08], [levelY.L2 + 1.86, levelY.L2 + 1.94]] as any[])) {
      box(0.3, side * (HALF_WIDTH + 8.4) / 2, ya, yb, 0.08, HALF_WIDTH - 8.4, COLORS.iron);
    }
    for (let t = 8.9; t < HALF_WIDTH - 0.3; t += 0.45) {
      box(0.3, side * t, levelY.L2 + 1.0, levelY.L2 + (Math.round(t / 0.45) % 4 ? 1.94 : 2.15), 0.05, 0.05, COLORS.iron);
    }
    S.kind = KIND.FLAT;
  }

  S.kind = KIND.MASONRY;
  for (const side of [-1, 1]) {
    const t0 = 10.4, t1 = side > 0 ? 21.2 : HALF_WIDTH;
    let wallTop = -Infinity;
    for (const [s0, s1] of ([[-8.4, -4.4], [-4.4, 0]] as any[])) {
      let maxFront = -Infinity, minG = Infinity;
      for (let t = t0; t <= t1; t += 2) maxFront = Math.max(maxFront, groundAt(s0, side * t));
      for (let s = s0; s <= s1; s += 1.15) for (let t = t0; t <= t1; t += 2) minG = Math.min(minG, groundAt(s, side * t));
      wallTop = Math.max(wallTop, maxFront) + 1.9;
      S.base = minG - 1 - LAND_Y;
      box((s0 + s1) / 2, side * (t0 + t1) / 2, minG - 1, wallTop, s1 - s0, t1 - t0, COLORS.stone, { top: COLORS.grass, topKind: KIND.GROUND });
    }
  }

  S.kind = KIND.FLAT;
  box(LEVELS.L7[1] - 0.3, 0, levelY.L7, Math.max(levelY.L7 + 2.2, groundAt(LEVELS.L7[1]) + 1.6), 0.6, 2 * HALF_WIDTH, COLORS.wall, { top: COLORS.trim });
  for (const key of ['L4', 'L5', 'L6', 'L7']) {
    const sStart = LEVELS[key][0], topY = levelY[key];
    for (const [t0, t1] of key === 'L4' ? [[-HALF_WIDTH + 0.6, HALF_WIDTH - 0.6]] : [[-HALF_WIDTH + 0.6, -5.6], [5.6, HALF_WIDTH - 0.6]]) {
      const cuts = key === 'L4' ? [[-14.6, -11.4], [11.4, 14.6]] : key === 'L7' ? [] : [[-21.4, -17.6], [17.6, 21.4]];
      let segs = [[t0, t1]];
      for (const [c0, c1] of cuts) segs = segs.flatMap(([u0, u1]) => (c1 <= u0 || c0 >= u1 ? [[u0, u1]] : [[u0, c0], [c1, u1]].filter(([lo, hi]) => hi - lo > 0.5)));
      for (const [u0, u1] of segs) box(sStart + 0.35, (u0 + u1) / 2, topY, topY + 0.95, 0.4, u1 - u0, COLORS.darkWall, { top: COLORS.trim });
    }
  }

  // Stair flights & top lamp standards
  drawFlight(S, -10, 0, y0, levelY.L2, STEP_COUNTS[0], [[-5.1, 3.2], [0, 6], [5.1, 3.2]], [-8.1, -3.4, 3.4, 8.1], true);
  drawFlight(S, 20, 26.5, levelY.L2, levelY.L3, STEP_COUNTS[1], [[-7.3, 6.6], [0, 7.4], [7.3, 6.6]], [-10.9, -3.7, 3.7, 10.9], false);
  const threeLanes = [[-3.4, 2.2], [0, 3.6], [3.4, 2.2]], fourRails = [-5.0, -2.2, 2.2, 5.0];
  for (const side of [-1, 1]) drawFlight(S, 47.4, 51, levelY.L3, levelY.L4, STEP_COUNTS[2], [[side * 13, 2.6]], [side * 11.5, side * 14.5], false);
  drawFlight(S, 57.6, 61, levelY.L4, levelY.L5, STEP_COUNTS[3], threeLanes, fourRails, true);
  drawFlight(S, 67.3, 70.7, levelY.L5, levelY.L6, STEP_COUNTS[4], threeLanes, fourRails, true);
  for (const side of [-1, 1]) {
    drawFlight(S, 57.6, 61, levelY.L4, levelY.L5, STEP_COUNTS[3], [[side * 19.5, 2.4]], [side * 18.1, side * 20.9], false);
    drawFlight(S, 67.3, 70.7, levelY.L5, levelY.L6, STEP_COUNTS[4], [[side * 19.5, 2.4]], [side * 18.1, side * 20.9], false);
  }
  drawFlight(S, 75.3, 81, levelY.L6, levelY.L7, STEP_COUNTS[5], [[0, 9]], [-4.9, 4.9], false);
  for (const [s, y, isBig] of ([[71.9, levelY.L6, false], [82.6, levelY.L7, true]] as any[])) {
    for (const side of [-1, 1]) drawLampStandard(S, s, side * (isBig ? 6.0 : 5.6), y, isBig);
  }
}

function buildGateCourtAndBiDinh(S, box, levelY) {
  // Main gate
  S.kind = KIND.FLAT;
  S.base = levelY.L2 - LAND_Y;
  for (const t of [-8.4, -3.6, 3.6, 8.4]) {
    const isInner = Math.abs(t) < 5;
    box(0.4, t, levelY.L2, levelY.L2 + (isInner ? 5.6 : 4.8), 1.3, 1.3, COLORS.wall, { top: COLORS.trim });
    box(0.4, t, levelY.L2 + (isInner ? 5.6 : 4.8), levelY.L2 + (isInner ? 6.0 : 5.2), 1.6, 1.6, COLORS.trim);
    box(0.4, t, levelY.L2 + (isInner ? 6.0 : 5.2), levelY.L2 + (isInner ? 7.0 : 6.0), 1.1, 1.1, COLORS.wall, { taper: 0.7 });
    box(0.4, t, levelY.L2 + (isInner ? 7.0 : 6.0), levelY.L2 + (isInner ? 8.0 : 6.8), 0.7, 0.7, COLORS.trim, { taper: 0.15 });
  }
  box(0.4, 0, levelY.L2 + 4.4, levelY.L2 + 5.0, 0.8, 6.6, COLORS.wall, { top: COLORS.trim });
  S.kind = KIND.PLAIN;
  for (const [t, width, height] of ([[-6, 3.5, 3.2], [0, 5.9, 4.3], [6, 3.5, 3.2]] as any[])) {
    box(0.4, t, levelY.L2, levelY.L2 + height, 0.12, width, COLORS.iron);
  }

  // Tả / Hữu Tòng Tự
  for (const side of [-1, 1]) {
    const s = 14.3, t = side * 17.1, floorY = levelY.L2 + 0.6;
    S.kind = KIND.FLAT;
    S.base = levelY.L2 - LAND_Y;
    box(s, t, levelY.L2, floorY, 17.6, 9.2, COLORS.trim, { topKind: KIND.ROAD });
    box(s, t + side * 1.0, floorY, floorY + 3.6, 17, 6.6, COLORS.wall, { top: COLORS.terra });
    for (let k = 0; k < 4; k++) box(s - 8.1 + k * 5.4, t - side * 3.6, floorY, floorY + 3.6, 0.5, 0.5, COLORS.trim);
    box(s, t - side * 3.6, floorY + 3.3, floorY + 3.8, 17, 0.6, COLORS.trim);
    const pt = toWorld2(s, t);
    S.hip(pt[0], pt[1], 17, 8.6, AXIS_ANG, floorY + 3.7, 2.0, COLORS.terra, { flare: 0.08, over: 0.8, fascia: 0.2, fasciaCol: shade(COLORS.terra, 0.7), ridgeCol: shade(COLORS.terra, 0.75), hips: true });
  }

  // Bái Đình statues
  for (const side of [-1, 1]) {
    const faceSign = side > 0 ? -1 : 1;
    drawBeast(S, 29.6, side * 15.2, levelY.L3, true);
    drawBeast(S, 29.6, side * 10.4, levelY.L3, false);
    for (let k = 0; k < 4; k++) {
      drawFigure(S, 32.0 + k * 2.2, side * 10.4, levelY.L3, faceSign, 1);
      drawFigure(S, 32.0 + k * 2.2, side * 15.2, levelY.L3, faceSign, 0.82);
    }
  }

  // Bi Đình octagonal stele pavilion & obelisks
  const steleS = 45, stelePt = toWorld2(steleS), octRot = AXIS_ANG + Math.PI / 8;
  const paleConc = hex('#94918a');
  let floorY = levelY.L3;
  S.kind = KIND.FLAT;
  S.base = floorY - LAND_Y;
  for (const [rad, h] of ([[6.0, 0.4], [5.4, 0.4], [4.8, 0.4]] as any[])) {
    S.cyl(stelePt[0], stelePt[1], floorY - 0.05, floorY + h, rad, rad, 8, COLORS.trim, { rot: octRot });
    floorY += h;
  }
  for (let i = 0; i < 8; i++) {
    const a0 = octRot + (i / 8) * Math.PI * 2, a1 = octRot + ((i + 1) / 8) * Math.PI * 2, aMid = (a0 + a1) / 2;
    if (Math.abs(Math.cos(aMid - AXIS_ANG)) > 0.9) continue;
    const balY = levelY.L3 + 0.4, balRad = 5.75;
    S.beam([stelePt[0] + Math.cos(a0) * balRad, balY + 0.35, stelePt[1] + Math.sin(a0) * balRad], [stelePt[0] + Math.cos(a1) * balRad, balY + 0.35, stelePt[1] + Math.sin(a1) * balRad], 0.25, 0.7, paleConc);
  }
  S.cyl(stelePt[0], stelePt[1], floorY, floorY + 4.3, 3.9, 3.9, 8, COLORS.void, { rot: octRot, cap: false });
  for (let i = 0; i < 8; i++) {
    const ang = octRot + (i / 8) * Math.PI * 2;
    S.box(stelePt[0] + Math.cos(ang) * 4.1, stelePt[1] + Math.sin(ang) * 4.1, floorY, floorY + 4.3, 0.8, 0.8, ang, paleConc, { top: COLORS.trim });
    const midAng = ang + Math.PI / 8;
    S.box(stelePt[0] + Math.cos(midAng) * 3.85, stelePt[1] + Math.sin(midAng) * 3.85, floorY + 3.5, floorY + 4.3, 0.4, 2.8, midAng, paleConc);
  }
  S.box(stelePt[0], stelePt[1], floorY, floorY + 0.76, 0.85, 2.1, PERP_ANG, COLORS.trim);
  S.box(stelePt[0], stelePt[1], floorY + 0.76, floorY + 3.86, 0.3, 1.2, PERP_ANG, COLORS.statue);
  let curY = floorY + 4.3;
  S.cyl(stelePt[0], stelePt[1], curY, curY + 0.4, 4.6, 4.6, 8, COLORS.trim, { rot: octRot }); curY += 0.4;
  S.kind = KIND.TILE;
  S.cyl(stelePt[0], stelePt[1], curY, curY + 1.2, 5.6, 3.0, 8, COLORS.roof, { rot: octRot }); curY += 1.2;
  S.kind = KIND.FLAT;
  S.cyl(stelePt[0], stelePt[1], curY, curY + 2.0, 2.8, 2.8, 8, paleConc, { rot: octRot, cap: false });
  for (let i = 0; i < 8; i++) {
    const ang = octRot + ((i + 0.5) / 8) * Math.PI * 2;
    S.box(stelePt[0] + Math.cos(ang) * 2.6, stelePt[1] + Math.sin(ang) * 2.6, curY + 0.25, curY + 1.75, 0.14, 1.6, ang, COLORS.void);
  }
  curY += 2.0;
  S.cyl(stelePt[0], stelePt[1], curY, curY + 0.3, 3.3, 3.3, 8, COLORS.trim, { rot: octRot }); curY += 0.3;
  S.kind = KIND.TILE;
  S.cyl(stelePt[0], stelePt[1], curY, curY + 2.2, 4.3, 0.3, 8, COLORS.roof, { rot: octRot }); curY += 2.2;
  S.kind = KIND.FLAT;
  S.cyl(stelePt[0], stelePt[1], curY - 0.1, curY + 0.9, 0.35, 0.05, 6, COLORS.trim);

  for (const side of [-1, 1]) drawObelisk(S, steleS + 0.5, side * 18.5, levelY.L3);

  // Concrete flagpoles on L5
  S.kind = KIND.FLAT;
  S.base = levelY.L5 - LAND_Y;
  for (const side of [-1, 1]) {
    box(65.9, side * 8, levelY.L5, levelY.L5 + 1.2, 1.8, 1.8, COLORS.trim);
    box(65.9, side * 8, levelY.L5 + 1.2, levelY.L5 + 12, 0.5, 0.5, COLORS.wall, { taper: 0.55 });
  }
}

export function build({ S }) {
  const prevKind = S.kind;
  const box = (s, t, y0, y1, ss?, st?, col?, opt?) => { const pt = toWorld2(s, t); S.box(pt[0], pt[1], y0, y1, ss, st, AXIS_ANG, col, opt); };

  const y0 = groundAt(-10);
  let maxTopG = -Infinity;
  for (let s = LEVELS.L7[0]; s <= LEVELS.L7[1]; s += 1) for (let t = -HALF_WIDTH; t <= HALF_WIDTH; t += 2) maxTopG = Math.max(maxTopG, groundAt(s, t));
  const riser = Math.max(0.15, Math.min(0.2, (maxTopG - 0.8 - y0) / 127));
  const levelY: Record<string, number> = {};
  let curY = y0;
  ['L2', 'L3', 'L4', 'L5', 'L6', 'L7'].forEach((key, i) => { curY += STEP_COUNTS[i] * riser; levelY[key] = curY; });

  const pavedStart = S.n;
  buildTerracesAndFlights(S, box, y0, levelY);
  buildGateCourtAndBiDinh(S, box, levelY);
  drawPalace(S, levelY.L7);
  (S.paved = S.paved || []).push([pavedStart, S.n]);

  for (const ring of OUTBUILDINGS) drawOutbuilding(S, ring);
  drawTicketKiosk(S);
  S.kind = prevKind;
  S.base = 0;
}

function drawFlight(S, s0, s1, ya, yb, stepCount, lanes, rails, hasDragon) {
  const tread = (s1 - s0) / stepCount, stepRise = (yb - ya) / stepCount;
  S.kind = KIND.FLAT;
  for (const [t, width] of lanes) {
    for (let k = 0; k < stepCount; k++) {
      const s = s0 + tread * (k + 0.5), topY = ya + stepRise * (k + 1);
      const minG = Math.min(ya, groundAt(s, t - width / 2), groundAt(s, t + width / 2)) - 0.6;
      S.base = minG - LAND_Y;
      const pt = toWorld2(s, t);
      S.box(pt[0], pt[1], minG, topY, tread + 0.02, width, AXIS_ANG, k % 2 ? COLORS.pave : shade(COLORS.pave, 0.94), { topKind: KIND.ROAD });
    }
  }
  for (const t of rails) {
    const railW = hasDragon ? 0.75 : 0.45, railH = hasDragon ? 1.0 : 0.9;
    S.kind = KIND.FLAT;
    S.beam(toWorld3(s0, t, ya + railH / 2), toWorld3(s1, t, yb + railH / 2), railW, railH, hasDragon ? COLORS.cheek : COLORS.trim);
    const minG = Math.min(ya, groundAt(s0, t)) - 0.5;
    S.base = minG - LAND_Y;
    const midPt = toWorld2(s0 + (s1 - s0) * 0.5, t);
    S.box(midPt[0], midPt[1], minG, ya + (yb - ya) * 0.5, s1 - s0, railW, AXIS_ANG, COLORS.cheek);
    if (!hasDragon) {
      for (const [s, yy] of ([[s0, ya], [s1, yb]] as any[])) {
        const postPt = toWorld2(s, t);
        S.box(postPt[0], postPt[1], yy, yy + 1.4, 0.7, 0.7, AXIS_ANG, COLORS.trim, { top: shade(COLORS.trim, 1.1) });
      }
      continue;
    }
    const segs = Math.max(4, Math.round((s1 - s0) / 1.6)) * 2;
    let prev = null;
    for (let i = 0; i <= segs; i++) {
      const frac = i / segs, s = s0 + 0.9 + (s1 - s0 - 1.2) * frac;
      const yy = ya + (yb - ya) * ((s - s0) / (s1 - s0)) + railH + 0.15 + 0.55 * Math.abs(Math.sin(frac * Math.PI * (segs / 4)));
      const cur = toWorld3(s, t, yy);
      if (prev) S.beam(prev, cur, 0.42, 0.42, COLORS.trim);
      prev = cur;
    }
    const neckPt = toWorld2(s0 - 0.3, t), headPt = toWorld2(s0 - 1.1, t);
    S.box(neckPt[0], neckPt[1], ya - 0.1, ya + 2.0, 1.4, railW + 0.25, AXIS_ANG, COLORS.cheek, { taper: 0.8, top: COLORS.trim });
    S.box(headPt[0], headPt[1], ya + 1.5, ya + 2.3, 1.3, railW, AXIS_ANG, COLORS.trim);
    S.beam(toWorld3(s0 - 0.3, t, ya + 2.0), toWorld3(s0 + 0.4, t, ya + 2.8), 0.25, 0.4, COLORS.trim);
    const tailPt = toWorld2(s1 - 0.2, t);
    S.box(tailPt[0], tailPt[1], yb, yb + 1.9, 0.8, 0.8, AXIS_ANG, COLORS.cheek, { top: COLORS.trim, taper: 0.6 });
  }
}

function drawFigure(S, s, t, y, faceSign, scale) {
  const pt = toWorld2(s, t);
  props.mandarin(S, pt[0], y, pt[1], AXIS_ANG + faceSign * Math.PI / 2, { military: scale < 1, h: 2.15 * scale, col: COLORS.statue });
}

function drawBeast(S, s, t, y, isElephant) {
  const pt = toWorld2(s, t);
  if (isElephant) props.elephant(S, pt[0], y, pt[1], AXIS_ANG, { col: COLORS.statue });
  else props.horse(S, pt[0], y, pt[1], AXIS_ANG, { col: COLORS.statue });
}

function drawObelisk(S, s, t, y) {
  const pt = toWorld2(s, t);
  const sq = (y0, y1, w, col, opt?) => S.box(pt[0], pt[1], y0, y1, w, w, AXIS_ANG, col, opt);
  S.kind = KIND.FLAT;
  S.base = y - LAND_Y;
  sq(y, y + 0.6, 3.0, COLORS.trim);
  sq(y + 0.6, y + 2.2, 2.2, COLORS.wall, { top: COLORS.trim });
  sq(y + 2.2, y + 11.5, 1.4, COLORS.wall, { taper: 0.7 });
  sq(y + 11.5, y + 12.1, 1.5, COLORS.trim);
  sq(y + 12.1, y + 13.2, 1.0, COLORS.wall, { taper: 0.75 });
  S.cyl(pt[0], pt[1], y + 13.2, y + 15.0, 0.55, 0.04, 8, COLORS.trim);
}

function drawPalace(S, y) {
  const box = (s, t, y0, y1, ss?, st?, col?, opt?) => { const pt = toWorld2(s, t); S.box(pt[0], pt[1], y0, y1, ss, st, AXIS_ANG, col, opt); };
  const hip = (s, t, w, d, y0, h, opt?) => {
    const pt = toWorld2(s, t);
    S.hip(pt[0], pt[1], w, d, PERP_ANG, y0, h, COLORS.roof, { flare: 0.3, fascia: 0.3, fasciaCol: COLORS.darkWall, ridgeCol: COLORS.ridge, hips: true, ...opt });
  };
  const roofCenterS = 100.5, roofW = 34.5, roofD = 23.0;
  const porticoS = roofCenterS - roofD / 2 + 0.6;
  const bodyFrontS = porticoS + 2.6, bodyBackS = roofCenterS + roofD / 2 - 0.3;
  const bodyCenterS = (bodyFrontS + bodyBackS) / 2, bodyDepth = bodyBackS - bodyFrontS;
  const floorY = y + 0.9;

  S.kind = KIND.FLAT;
  S.base = y - LAND_Y;
  box(roofCenterS - 0.8, 0, y, floorY, roofD + 3.6, roofW + 1.2, COLORS.trim, { topKind: KIND.ROAD });
  box(bodyCenterS, 0, floorY, floorY + 5.2, bodyDepth, roofW, COLORS.palaceWall, { top: COLORS.roof });
  box((porticoS - 0.5 + bodyBackS + 0.2) / 2, 0, floorY + 5.2, floorY + 5.7, bodyBackS + 0.2 - porticoS + 0.5, roofW + 0.4, COLORS.trim);

  S.kind = KIND.PLAIN;
  for (let i = 0; i < 9; i++) box(bodyFrontS - 0.02, (i - 4) * 3.7, floorY + 0.4, floorY + (Math.abs(i - 4) < 3 ? 3.8 : 3.0), 0.1, 1.5, COLORS.void);
  for (const side of [-1, 1]) for (let i = 0; i < 5; i++) box(bodyCenterS - 8 + i * 4, side * (roofW / 2 + 0.02), floorY + 1.0, floorY + 3.4, 1.4, 0.1, COLORS.void);

  S.kind = KIND.FLAT;
  for (let i = 0; i < 9; i++) box(porticoS, (i - 4) * 4.25, floorY, floorY + 5.2, 0.8, 0.8, COLORS.trim);
  for (let i = 0; i < 8; i++) box(porticoS, (i - 3.5) * 4.25, floorY + 3.9, floorY + 5.2, 0.6, 3.45, COLORS.wall);
  box((porticoS + bodyFrontS) / 2, 0, floorY + 5.0, floorY + 5.2, bodyFrontS - porticoS, roofW, COLORS.darkWall);
  hip(roofCenterS, 0, roofW, roofD, floorY + 5.7, 2.1, { over: 0.6 });

  const khCenterS = roofCenterS + 0.4, khW = 17.6;
  box(khCenterS, 0, floorY + 5.7, floorY + 8.6, khW, khW, COLORS.wall, { top: COLORS.trim });
  S.kind = KIND.PLAIN;
  for (let i = 0; i < 5; i++) box(khCenterS - khW / 2 - 0.02, (i - 2) * 3.3, floorY + 7.6, floorY + 8.3, 0.1, 1.6, COLORS.void);
  S.kind = KIND.FLAT;
  hip(khCenterS, 0, khW + 1.4, khW + 0.6, floorY + 8.6, 2.0, { flare: 0.25, over: 0.5, fasciaCol: COLORS.trim });
}

function drawLampStandard(S, s, t, y, isBig) {
  const pt = toWorld2(s, t), scale = isBig ? 1 : 0.75;
  const sq = (y0, y1, w, col, opt?) => S.box(pt[0], pt[1], y0, y1, w, w, AXIS_ANG, col, opt);
  S.kind = KIND.FLAT;
  S.base = y - LAND_Y;
  sq(y, y + 0.3, 1.7 * scale, COLORS.trim);
  sq(y + 0.3, y + 2.0 * scale, 1.4 * scale, COLORS.wall, { top: COLORS.trim });
  sq(y + 2.0 * scale, y + 2.2 * scale, 1.6 * scale, COLORS.trim);
  const postBaseY = y + 2.2 * scale;
  S.cyl(pt[0], pt[1], postBaseY, postBaseY + 3.2 * scale, 0.2 * scale, 0.12 * scale, 8, COLORS.iron, { cap: true });
  const armY = postBaseY + 2.7 * scale;
  for (const [ds, dt] of ([[1, 0], [-1, 0], [0, 1], [0, -1]] as any[])) {
    const tip = toWorld3(s + ds * 0.7 * scale, t + dt * 0.7 * scale, armY + 0.25 * scale);
    S.beam([pt[0], armY, pt[1]], tip, 0.08, 0.08, COLORS.iron);
    S.cyl(tip[0], tip[2], tip[1], tip[1] + 0.45 * scale, 0.16 * scale, 0.2 * scale, 6, COLORS.trim, { cap: true });
  }
  S.cyl(pt[0], pt[1], postBaseY + 3.2 * scale, postBaseY + 3.9 * scale, 0.28 * scale, 0.05, 8, COLORS.iron, { cap: true });
}

function drawTicketKiosk(S) {
  const s = -11.45 + 5.6, t = 25.15, width = 6.3, depth = 6.9;
  const pt = toWorld2(s, t);
  let minG = Infinity;
  for (const ds of [-width / 2, width / 2]) for (const dt of [-depth / 2, depth / 2]) minG = Math.min(minG, groundAt(s + ds, t + dt));
  const floorY = minG + 0.7;
  S.kind = KIND.FLAT;
  S.base = minG - 0.4 - LAND_Y;
  S.box(pt[0], pt[1], minG - 0.4, floorY, width + 0.8, depth + 0.8, AXIS_ANG, COLORS.darkWall, { top: COLORS.pave, topKind: KIND.ROAD });
  S.kind = KIND.TIMBER;
  S.box(pt[0], pt[1], floorY, floorY + 2.6, width - 1.2, depth - 1.2, AXIS_ANG, COLORS.wood);
  S.kind = KIND.FLAT;
  S.box(pt[0], pt[1], floorY + 0.85, floorY + 1.0, width - 0.8, depth - 0.8, AXIS_ANG, COLORS.darkWall);
  S.kind = KIND.TILE;
  S.hip(pt[0], pt[1], depth + 0.4, width + 0.4, PERP_ANG, floorY + 2.6, 1.6, COLORS.tileBrown, { flare: 0.4, over: 0.6, hips: true });
  S.kind = KIND.FLAT;
}

function drawOutbuilding(S, ring) {
  const pts = ring.map(([s, t]) => toWorld2(s, t));
  const center = [pts.reduce((sum, pt) => sum + pt[0], 0) / 4, pts.reduce((sum, pt) => sum + pt[1], 0) / 4];
  const e0 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), e1 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
  const a0 = Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0]);
  const [w, d, ang] = e0 >= e1 ? [e0, e1, a0] : [e1, e0, a0 + Math.PI / 2];
  let minG = Infinity, maxG = -Infinity;
  for (const pt of pts) { const g = LAND_Y + rise(pt[0], pt[1]); minG = Math.min(minG, g); maxG = Math.max(maxG, g); }
  S.kind = KIND.FLAT;
  S.base = minG - 0.5 - LAND_Y;
  S.box(center[0], center[1], minG - 0.5, maxG + 0.4, w + 0.6, d + 0.6, ang, COLORS.darkWall, { topKind: KIND.ROAD });
  S.box(center[0], center[1], maxG + 0.4, maxG + 3.2, w, d, ang, COLORS.palaceWall);
  S.hip(center[0], center[1], w, d, ang, maxG + 3.2, Math.min(2.2, d * 0.3), COLORS.roof, { over: 0.6 });
}
