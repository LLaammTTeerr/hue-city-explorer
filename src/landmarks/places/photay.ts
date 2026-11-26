import { addGlowPointCloud } from '../helpers.ts';
import * as THREE from 'three';
import { KIND, Buf, hex, shade, rand, pick, inRing } from '../../geo/buf.ts';
import { LAND_Y, ROAD_W, roadWidth } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { lightMaterial } from '../../geo/materials.ts';

// Phố Tây, Huế's backpackers' quarter in phường Phú Hội on the south bank: the three streets Võ Thị Sáu, Phạm Ngũ Lão
// and Chu Văn An, which close to traffic for the walking street on Friday to Sunday evenings (18:00 to 02:00).
// See docs/places/photay.md.

export const id = 'photay';

const QUARTER_RADIUS = 165;
const STREETS = {
  vts: [[804.6, -309.4], [802.8, -298.5], [793.6, -268.5], [786, -243.6], [780.8, -226.8], [769.3, -187.5], [768.2, -183.3], [763.1, -164.1], [760.5, -154.9], [758.9, -149.6], [750.6, -119.2], [743.2, -90.7], [739.5, -75.6], [734.4, -55.1], [726.8, -31.8], [716.3, -16.4], [702.2, -3.6], [665.9, 33.9], [632.6, 65.7], [617.4, 80.5], [591.4, 105.3]],
  pnl: [[665.9, 33.9], [556.8, -100.4], [547.8, -110.9], [537.3, -123.6], [530.1, -131.9]],
  cva: [[826.8, 69.4], [815.3, 48.3], [776.3, 0.4], [762.6, -16.1], [745.1, -40.4], [734.4, -55.1], [730.6, -59.9], [720.9, -71.7], [718.9, -74.1], [677.4, -124.9], [662.2, -143.5], [655.2, -152.1], [619.2, -197.1], [611.8, -207.1]],
};
const STREET_KEYS = Object.keys(STREETS);
const LANE = [[796.1, -51.8], [790.2, -11], [776.3, 0.4]];
const LANE_HALF = 2;
const LANE_SET = LANE_HALF + 0.25;
const HALF_STREET = ROAD_W[3] / 2;
const STREET_SETBACK = HALF_STREET + 2.3;
const FLOOR_HEIGHT = 3.4;
const REPLACE_MARKS = { corner: [752, -54], jasmine: [645, -148], laneEnd: [797, 1] };

const PAL = {
  shop: hex('#2b2522'), shopLit: hex('#4a3a2c'), pole: hex('#6c716f'), wire: hex('#2a2a2a'), paper: hex('#efe9dc'),
  lantern: hex('#c8352a'), lanternY: hex('#d9a236'), table: hex('#d8d4cc'), tableS: hex('#8e9aa3'), shutter: hex('#8d8f8c'),
  glass: hex('#3f4c55'), canopy: hex('#d9d6cf'), pot: hex('#6b4a3a'), leaf: hex('#4f7a3a'), leafD: hex('#3b6431'),
  creeper: hex('#55803f'), trunk: hex('#5a4a3c'), white: hex('#efece4'), rail: hex('#e4e0d6'), iron: hex('#2a2c2e'),
  rust: hex('#7b4a2c'), timber: hex('#5a3a24'), granite: hex('#8a8a86'), slabA: hex('#cfc9bc'), slabB: hex('#b2ab9c'),
  joint: hex('#6f6a62'), ac: hex('#b9bab5'), wood: hex('#7a5a3e'),
};
const SIGNS = ['#a8453b', '#3d6a94', '#cdb06a', '#4a7a58', '#222426', '#e2ddd0', '#6a4a62', '#b8734a', '#4a8585'].map(hex);
const SIGN_INK = ['#f4f1e8', '#f4f1e8', '#1d1d1f', '#f4f1e8', '#e1b52d', '#c62f2a', '#f4f1e8', '#f4f1e8', '#f4f1e8'].map(hex);
const SIGN_GLOW = [0xff4a3a, 0x58a8ff, 0xffd060, 0x60ff98, 0xfff2d0, 0xffe8b0, 0xff70d8, 0xffa040, 0x60fff0];
const ROOFS = ['#b8b4ac', '#a09d97', '#cfcbc3', '#7f7b76', '#9a6a55'].map(hex);
const BULB_COLS = [[1, 0.86, 0.6], [1, 0.8, 0.5], [1, 0.9, 0.7]];

const STREET_STYLE = {
  vts: {
    types: [['bar', 0.55], ['shop', 0.15], ['cafe', 0.12], ['hotel', 0.18]],
    walls: ['#e4d8bd', '#dcc684', '#c98f78', '#e6d3b4', '#c8a190', '#b8785f', '#e6e2d8'].map(hex),
    signs: [0, 2, 7, 4, 6],
    canvas: ['#9a4038', '#44614a', '#b89a50', '#6a3a44'].map(hex),
    awn: 0.7, stripe: true, lanterns: true,
    stools: ['#6b5a48', '#3a3532', '#8a7860', '#5f4a3a'].map(hex),
    pave: ['#a4a29b', '#b4b1a9'].map(hex),
  },
  cva: {
    types: [['cafe', 0.35], ['bar', 0.25], ['hotel', 0.22], ['shop', 0.18]],
    walls: ['#e6e2d8', '#b5c3c6', '#c98f78', '#eceae4', '#bccfbf', '#a9bfcc'].map(hex),
    signs: [4, 5, 1, 8],
    canvas: ['#3b3b3b', '#4a6a85'].map(hex),
    awn: 0.35, stripe: false, lanterns: false,
    stools: ['#5f4a3a', '#3a3532', '#7a5a3e'].map(hex),
    pave: ['#8f8e8a', '#9c9a95'].map(hex),
  },
  pnl: {
    types: [['bar', 0.45], ['shop', 0.3], ['hotel', 0.25]],
    walls: ['#e7b9b2', '#e9a25a', '#ece2c8', '#dcc684', '#e6e2d8', '#c9c4b8'].map(hex),
    signs: [6, 1, 8, 3, 0],
    canvas: ['#4a7a58', '#3d6a94', '#2f5f7a'].map(hex),
    awn: 0.8, stripe: false, lanterns: true,
    stools: ['#c8352a', '#2f5fa8', '#c8352a', '#e0b030', '#2f5fa8'].map(hex),
    pave: ['#b9a892', '#c8b9a4'].map(hex),
  },
};
const SIDE_WALLS = ['#e4d8bd', '#c9c4b8', '#e6e2d8', '#d6cbb5', '#bfc6c4'].map(hex);

// ---------------- pure 2D geometry helpers ----------------

// [x0, z0, x1, z1] of a point list, and whether (x, z) lies within pad of it: a cheap test before an exact one
function boxOf(pts) {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const pt of pts) { x0 = Math.min(x0, pt[0]); z0 = Math.min(z0, pt[1]); x1 = Math.max(x1, pt[0]); z1 = Math.max(z1, pt[1]); }
  return [x0, z0, x1, z1];
}
const inBox = (box, x, z, pad) => x >= box[0] - pad && x <= box[2] + pad && z >= box[1] - pad && z <= box[3] + pad;

function nearestOnPolyline(pts, x, z) {
  let best = null;
  for (let i = 0; i + 1 < pts.length; i++) {
    const ptA = pts[i], ptB = pts[i + 1];
    const dx = ptB[0] - ptA[0], dz = ptB[1] - ptA[1], lenSq = dx * dx + dz * dz;
    const param = Math.max(0, Math.min(1, ((x - ptA[0]) * dx + (z - ptA[1]) * dz) / lenSq));
    const px = ptA[0] + dx * param, pz = ptA[1] + dz * param;
    const dist = Math.hypot(x - px, z - pz);
    if (!best || dist < best.d) {
      const len = Math.sqrt(lenSq);
      best = { d: dist, p: [px, pz], t: [dx / len, dz / len] };
    }
  }
  return best;
}

function makePolyline(pts) {
  const segs = [];
  let acc = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const ptA = pts[i], ptB = pts[i + 1];
    const len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
    const tan = [(ptB[0] - ptA[0]) / len, (ptB[1] - ptA[1]) / len];
    segs.push({ a: ptA, L: len, t: tan, n: [-tan[1], tan[0]], s0: acc });
    acc += len;
  }
  const at = (arcPos, lateral = 0) => {
    let seg = segs[segs.length - 1];
    for (const cand of segs) if (arcPos <= cand.s0 + cand.L) { seg = cand; break; }
    const along = arcPos - seg.s0;
    return [seg.a[0] + seg.t[0] * along + seg.n[0] * lateral, seg.a[1] + seg.t[1] * along + seg.n[1] * lateral];
  };
  return { pts, seg: segs, len: acc, at };
}

const chooseWeighted = (list, roll) => {
  let acc = 0;
  for (const [key, prob] of list) { acc += prob; if (roll < acc) return key; }
  return list[list.length - 1][0];
};
const unit2 = (vec) => { const len = Math.hypot(vec[0], vec[1]); return [vec[0] / len, vec[1] / len]; };
const dot2 = (vecA, vecB) => vecA[0] * vecB[0] + vecA[1] * vecB[1];
const groundY = (x, z) => LAND_Y + rise(x, z);
const offsetPt = (origin, tan, fwd, along, out): [number, number] => [origin[0] + tan[0] * along + fwd[0] * out, origin[1] + tan[1] * along + fwd[1] * out];

function walkPolyline(pts, startIdx, dir, dist) {
  let pt = pts[startIdx], remaining = dist;
  for (let j = startIdx + dir; j >= 0 && j < pts.length; j += dir) {
    const nextPt = pts[j];
    const segLen = Math.hypot(nextPt[0] - pt[0], nextPt[1] - pt[1]);
    if (segLen >= remaining) return [pt[0] + ((nextPt[0] - pt[0]) * remaining) / segLen, pt[1] + ((nextPt[1] - pt[1]) * remaining) / segLen];
    remaining -= segLen;
    pt = nextPt;
  }
  return dist - remaining > 3 ? pt : null;
}

// ---------------- shared dressing & architectural primitives ----------------

function buildBalustrade(S, ptA, ptB, y0, height, col = PAL.rail) {
  const len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
  const ang = Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]);
  const mid = [(ptA[0] + ptB[0]) / 2, (ptA[1] + ptB[1]) / 2];
  S.box(mid[0], mid[1], y0, y0 + 0.12, len, 0.28, ang, col);
  S.box(mid[0], mid[1], y0 + height - 0.1, y0 + height, len, 0.24, ang, col);
  const count = Math.max(2, Math.round(len / 0.32));
  for (let i = 0; i <= count; i++) {
    const frac = i / count;
    S.box(ptA[0] + (ptB[0] - ptA[0]) * frac, ptA[1] + (ptB[1] - ptA[1]) * frac, y0 + 0.12, y0 + height - 0.1, 0.1, 0.1, ang, col);
  }
}

function buildPicketFence(S, ptA, ptB, { y = 1.8, base = 0.5, step = 3, col = PAL.granite, picket = hex('#9a9c98'), pillar = col, gap = 0.14 }: Record<string, any> = {}) {
  const len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
  const ang = Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]);
  const tan = [(ptB[0] - ptA[0]) / len, (ptB[1] - ptA[1]) / len];
  for (let dist = 0; dist < len - 0.05; dist += step) {
    const endDist = Math.min(len, dist + step);
    const mid = [ptA[0] + tan[0] * (dist + endDist) / 2, ptA[1] + tan[1] * (dist + endDist) / 2];
    const baseG = groundY(mid[0], mid[1]);
    S.box(mid[0], mid[1], baseG - 0.1, baseG + base, endDist - dist, 0.3, ang, col);
    S.box(mid[0], mid[1], baseG + y - 0.25, baseG + y - 0.18, endDist - dist, 0.05, ang, picket);
    for (let cursor = dist + gap; cursor < endDist - 0.05; cursor += gap) {
      S.box(ptA[0] + tan[0] * cursor, ptA[1] + tan[1] * cursor, baseG + base, baseG + y - 0.1, 0.05, 0.04, ang, picket);
    }
    S.box(ptA[0] + tan[0] * dist, ptA[1] + tan[1] * dist, baseG - 0.1, baseG + y + 0.15, 0.36, 0.36, ang, pillar);
  }
  const endG = groundY(ptB[0], ptB[1]);
  S.box(ptB[0], ptB[1], endG - 0.1, endG + y + 0.15, 0.36, 0.36, ang, pillar);
}

function buildGardenWall(S, ptA, ptB, height, col, creepProb = 0) {
  const len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
  const ang = Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]);
  const mid = [(ptA[0] + ptB[0]) / 2, (ptA[1] + ptB[1]) / 2];
  const baseG = Math.max(groundY(ptA[0], ptA[1]), groundY(ptB[0], ptB[1]));
  S.box(mid[0], mid[1], baseG - 0.15, baseG + height, len, 0.25, ang, col, { top: shade(col, 0.9) });
  if (!creepProb) return;
  for (let dist = 0.4; dist < len - 0.4; dist += 1.1) {
    const seed = Math.round(mid[0] * 31 + dist * 17);
    if (rand(seed, 1) > creepProb) continue;
    const pt = [ptA[0] + ((ptB[0] - ptA[0]) * dist) / len, ptA[1] + ((ptB[1] - ptA[1]) * dist) / len];
    S.box(pt[0], pt[1], baseG + height * (0.15 + rand(seed, 2) * 0.4), baseG + height + 0.35, 1.2, 0.45, ang, rand(seed, 3) < 0.5 ? PAL.creeper : PAL.leafD);
  }
}

function dressShopfront(ctx, origin, tan, fwd, width, height, floorY, key, { awning = false, balcony = false, gap = 2, st = 'vts', type = null, sign = true }) {
  const { S, lights, glowPos, glowCol } = ctx;
  const style = STREET_STYLE[st];
  const shopType = type || chooseWeighted(style.types, rand(key, 3));
  const ang = Math.atan2(tan[1], tan[0]);
  const ptAt = (u, v): [number, number] => offsetPt(origin, tan, fwd, u, v);
  const box = (u, v, y0, y1, sx, sz, col, opt?) => { const pt = ptAt(u, v); S.box(pt[0], pt[1], floorY + y0, floorY + y1, sx, sz, ang, col, opt); };
  const addLit = (list, u, v, y0, y1, sx, sz) => { const pt = ptAt(u, v); list.push([pt[0], pt[1], floorY + y0, floorY + y1, sx, sz, ang]); };
  const isBar = shopType === 'bar';

  const openW = width * 0.84, openY = Math.min(2.75, height - 1.0);
  box(0, 0.04, 0.08, openY, openW, 0.08, isBar ? PAL.shopLit : PAL.shop);
  if (shopType === 'shop') {
    box(0, 0.1, openY - 0.9 - rand(key, 17) * 0.8, openY, openW, 0.06, PAL.shutter);
    if (rand(key, 4) < 0.4) addLit(lights.warm, 0, 0.1, 0.15, 1.4, openW - 0.2, 0.02);
  } else if (shopType === 'hotel') {
    const doorW = Math.min(2, openW * 0.5);
    box(0, 0.09, 0.1, 2.6, doorW, 0.04, PAL.glass);
    addLit(lights.warm, 0, 0.12, 0.15, 2.5, doorW - 0.1, 0.02);
    box(0, 0.95, 2.85, 3.0, Math.min(2.6, width - 0.4), 1.8, PAL.canopy);
    for (const side of [-0.75, 0.75]) {
      const potU = side * Math.min(1.3, width / 2 - 0.3);
      box(potU, 0.35, 0, 0.45, 0.42, 0.42, PAL.pot);
      box(potU, 0.35, 0.45, 1.1, 0.5, 0.5, PAL.leaf);
    }
  } else if (isBar || rand(key, 4) < 0.5) {
    addLit(lights.warm, 0, 0.1, 0.15, openY - 0.1, openW - 0.2, 0.02);
  }

  if (sign && rand(key, 5) < 0.92) {
    const signIdx = pick(style.signs, key, 6);
    const signW = Math.min(width * 0.94, width - 0.15);
    const [y0, y1] = balcony ? [3.0, 3.38] : height < 4.7 ? [2.98, Math.min(3.6, height - 0.08)] : [3.05, 3.9];
    box(0, 0.12, y0, y1, signW, 0.16, SIGNS[signIdx]);
    const midY = (y0 + y1) / 2, letterH = (y1 - y0) * 0.36;
    box((rand(key, 7) - 0.5) * signW * 0.2, 0.215, midY - letterH / 2, midY + letterH / 2, signW * (0.45 + rand(key, 8) * 0.25), 0.03, SIGN_INK[signIdx]);
    if (isBar || shopType === 'hotel' || rand(key, 9) < 0.45) addLit(lights.sign[signIdx], 0, 0.235, y0 + 0.04, y1 - 0.04, signW - 0.1, 0.01);
  }

  if (sign && height >= 7.2 && rand(key, 10) < (shopType === 'hotel' ? 0.95 : st === 'pnl' ? 0.6 : 0.4)) {
    const signIdx = pick(style.signs, key, 11);
    const bladeU = (rand(key, 12) < 0.5 ? -1 : 1) * (width / 2 - 0.25);
    const top = Math.min(height - 0.4, shopType === 'hotel' ? 10.2 : 6.9);
    box(bladeU, 0.55, 4.55, top, 0.12, 0.85, SIGNS[signIdx], { bottom: true });
    box(bladeU, 0.55, 4.9, top - 0.35, 0.15, 0.3, SIGN_INK[signIdx]);
    if (isBar || shopType === 'hotel' || rand(key, 13) < 0.5) addLit(lights.sign[signIdx], bladeU, 0.55, 4.6, top - 0.05, 0.17, 0.78);
  }

  let edgeDepth = awning ? 1.4 : 0, edgeY = awning ? 2.82 : 0;
  if (!awning && shopType !== 'hotel' && rand(key, 14) < style.awn) {
    const dep = Math.min(1.8, Math.max(1.0, gap - 0.2)), awnW = width * 0.94;
    if (st === 'cva') {
      box(0, dep / 2, 2.9, 3.02, awnW, dep, pick(style.canvas, key, 15));
      edgeDepth = dep; edgeY = 2.9;
    } else {
      const topY = 2.93, botY = 2.45;
      const col1 = pick(style.canvas, key, 15);
      const col2 = style.stripe && rand(key, 16) < 0.6 ? hex('#e9e4d8') : col1;
      const stripes = style.stripe ? Math.max(2, Math.round(awnW / 0.55)) : 1;
      for (let j = 0; j < stripes; j++) {
        const u0 = -awnW / 2 + (awnW * j) / stripes, u1 = u0 + awnW / stripes;
        const stripeCol = j % 2 ? col2 : col1;
        const p0 = ptAt(u0, 0.05), p1 = ptAt(u1, 0.05), p2 = ptAt(u1, dep), p3 = ptAt(u0, dep);
        S.quad([p0[0], floorY + topY, p0[1]], [p1[0], floorY + topY, p1[1]], [p2[0], floorY + botY, p2[1]], [p3[0], floorY + botY, p3[1]], stripeCol, [fwd[0] * 0.3, 1, fwd[1] * 0.3]);
        S.quad([p0[0], floorY + topY - 0.03, p0[1]], [p1[0], floorY + topY - 0.03, p1[1]], [p2[0], floorY + botY - 0.03, p2[1]], [p3[0], floorY + botY - 0.03, p3[1]], shade(stripeCol, 0.7), [0, -1, 0]);
        S.quad([p3[0], floorY + botY, p3[1]], [p2[0], floorY + botY, p2[1]], [p2[0], floorY + botY - 0.24, p2[1]], [p3[0], floorY + botY - 0.24, p3[1]], shade(stripeCol, 0.92), [fwd[0], 0, fwd[1]]);
      }
      edgeDepth = dep; edgeY = botY - 0.24;
    }
  }

  if (shopType === 'cafe') {
    for (let u = -width * 0.42; u <= width * 0.42 + 1e-6; u += (width * 0.84) / 2) {
      box(u, 0.3, 0, 0.5, 0.5, 0.5, PAL.pot);
      box(u, 0.3, 0.5, 1.0 + rand(key, 50 + u) * 0.5, 0.6, 0.6, rand(key, 51 + u) < 0.5 ? PAL.leaf : PAL.leafD);
    }
    if (rand(key, 52) < 0.7) {
      const creepU = (rand(key, 53) - 0.5) * width * 0.7;
      box(creepU, 0.06, 0.4, Math.min(height - 0.3, 3 + rand(key, 54) * 4), 0.9 + rand(key, 55) * 1.2, 0.1, PAL.creeper);
    }
    if (gap >= 1.6) {
      for (const tableU of [-width * 0.22, width * 0.22]) {
        box(tableU, gap * 0.55, 0, 0.72, 0.6, 0.6, PAL.wood);
        box(tableU + 0.5, gap * 0.55, 0, 0.45, 0.35, 0.35, pick(style.stools, key, 56));
      }
    }
  }
  if (!isBar) return;

  if (edgeDepth) {
    for (let u = -width * 0.44; u <= width * 0.44; u += 0.6) {
      const pt = ptAt(u, edgeDepth + 0.02);
      glowPos.push(pt[0], floorY + edgeY - 0.03, pt[1]);
      glowCol.push(1, 0.8, 0.5);
    }
    if (style.lanterns) {
      const lanternCount = width > 5.5 ? 3 : 2;
      for (let j = 0; j < lanternCount; j++) {
        const lanternU = -width * 0.38 + (width * 0.76 * j) / (lanternCount - 1);
        const pt = ptAt(lanternU, edgeDepth - 0.25);
        const lanY = floorY + edgeY - 0.55;
        const isRed = rand(key, 20 + j) < (st === 'vts' ? 0.85 : 0.5);
        const lanCol = isRed ? PAL.lantern : PAL.lanternY;
        S.cyl(pt[0], pt[1], lanY, lanY + 0.22, 0.13, 0.19, 6, lanCol, { cap: false });
        S.cyl(pt[0], pt[1], lanY + 0.22, lanY + 0.42, 0.19, 0.12, 6, lanCol);
        S.box(pt[0], pt[1], lanY + 0.42, floorY + edgeY, 0.02, 0.02, 0, PAL.wire);
        glowPos.push(pt[0], lanY + 0.21, pt[1]);
        glowCol.push(1, isRed ? 0.32 : 0.72, isRed ? 0.18 : 0.28);
      }
    }
  }
  if (gap >= 1.2) {
    const seatV = Math.min(gap * 0.55, 1.7);
    const tableCount = Math.max(1, Math.min(3, Math.floor((width * 0.9) / 1.75)));
    const isSteel = rand(key, 30) < 0.5;
    for (let j = 0; j < tableCount; j++) {
      const tableU = tableCount === 1 ? 0 : -width * 0.32 + (width * 0.64 * j) / (tableCount - 1);
      box(tableU, seatV, 0, 0.42, 0.55, 0.55, isSteel ? PAL.tableS : PAL.table);
      for (const [du, dv] of ([[-0.48, 0], [0.48, 0], [0, -0.45], [0, 0.45]] as [number, number][])) {
        if (dv < 0 && seatV < 0.85) continue;
        box(tableU + du, seatV + dv, 0, 0.3, 0.27, 0.27, pick(style.stools, key * 7 + j * 4 + Math.round(du * 3 + dv * 5), 31));
      }
    }
  }
}

// ---------------- landmark sections ----------------

function buildVtsAndCornerSignatures(ctx) {
  const { S, lights, later, lines, replaced, sigLot, buildBody, buildBlock, facesOf } = ctx;

  // 1. Steel-and-timber bar on Võ Thị Sáu
  const barLot = sigLot('vts', 274, 289, 1, STREET_SETBACK, [12, 10, 8, 7]);
  if (barLot) {
    const height = 10.2, floorY = buildBody(barLot, height, hex('#3a2f28'), { kind: KIND.TIMBER, roof: hex('#4a4440') });
    later.push(() => {
      const { o, t, f, w, ang } = barLot;
      const box = (u, v, y0, y1, sx, sz, col, opt?) => { const pt = offsetPt(o, t, f, u, v); S.box(pt[0], pt[1], floorY + y0, floorY + y1, sx, sz, ang, col, opt); };
      const addWarm = (u, v, y0, y1, sx) => { const pt = offsetPt(o, t, f, u, v); lights.warm.push([pt[0], pt[1], floorY + y0, floorY + y1, sx, 0.02, ang]); };
      const posts = Math.max(3, Math.round(w / 3.2));
      for (let i = 0; i <= posts; i++) box(-w / 2 + 0.12 + ((w - 0.24) * i) / posts, 0.12, 0, height + 0.3, 0.22, 0.22, PAL.rust);
      for (const beamY of [3.3, 6.7, height]) box(0, 0.12, beamY - 0.1, beamY + 0.2, w, 0.26, PAL.rust);
      box(0, 0.04, 0.05, 3.2, w - 0.3, 0.06, PAL.shopLit);
      addWarm(0, 0.08, 0.1, 3.1, w - 0.5);
      for (const slatY of [3.5, 6.9]) {
        box(0, 0.02, slatY, slatY + 2.9, w - 0.3, 0.04, PAL.shopLit);
        addWarm(0, 0.05, slatY + 0.2, slatY + 2.6, w - 0.6);
        for (let u = -w / 2 + 0.4; u < w / 2 - 0.3; u += 0.32) box(u, 0.1, slatY + 0.1, slatY + 3.0, 0.09, 0.12, PAL.timber);
      }
      box(0, 1.15, 3.15, 3.35, w, 2.3, PAL.rust, { top: shade(PAL.rust, 0.8) });
      for (const [planterY, planterV] of ([[3.35, 2.05], [6.8, 0.45]] as [number, number][])) {
        for (let u = -w / 2 + 0.6; u < w / 2 - 0.4; u += 1.2) {
          box(u, planterV, planterY, planterY + 0.45, 1.0, 0.45, hex('#3a3a36'));
          box(u, planterV, planterY + 0.45, planterY + 0.8 + rand(Math.round(u * 10), planterY) * 0.4, 1.05, 0.5, rand(Math.round(u * 7), planterY) < 0.5 ? PAL.leaf : PAL.leafD);
          if (rand(Math.round(u * 13), planterY) < 0.45) box(u, planterV + 0.2, planterY - 1.6, planterY, 0.5, 0.08, PAL.creeper);
        }
      }
      for (let u = -w / 2 + 0.8; u < w / 2 - 0.5; u += 2.2) {
        box(u, 2.0, 0, 0.6, 0.9, 0.5, hex('#3a3a36'));
        box(u, 2.0, 0.6, 1.3, 0.95, 0.55, PAL.leaf);
      }
      box(0, 0.3, 3.45, 4.1, w * 0.5, 0.1, hex('#1f1c1a'));
      box(0, 0.36, 3.6, 3.95, w * 0.34, 0.03, hex('#e1b52d'));
      lights.sign[2].push([...offsetPt(o, t, f, 0, 0.38), floorY + 3.62, floorY + 3.93, w * 0.34, 0.01, ang]);
      for (let u = -w / 2 + 1.5; u < w / 2 - 1; u += 2.4) {
        box(u, 1.0, 0, 0.7, 0.7, 0.7, PAL.wood);
        for (const du of [-0.55, 0.55]) box(u + du, 1.0, 0, 0.45, 0.35, 0.35, PAL.timber);
      }
    });
  }

  // 2. Cream colonial corner house at Chu Văn An & Võ Thị Sáu
  if (replaced.corner) {
    const ring = replaced.corner, height = 7.4;
    const floorY = buildBlock(ring, height, hex('#e8dcc0'), { kind: KIND.COLONIAL, roof: hex('#cfc9b8') });
    later.push(() => {
      for (const edge of facesOf(ring)) {
        const ptA = [edge.p[0] + edge.f[0] * 0.05, edge.p[1] + edge.f[1] * 0.05];
        const ptB = [edge.q[0] + edge.f[0] * 0.05, edge.q[1] + edge.f[1] * 0.05];
        buildBalustrade(S, ptA, ptB, floorY + height, 0.95, hex('#f1ebdc'));
        const cornicePt = offsetPt(edge.o, edge.t, edge.f, 0, 0.12);
        S.box(cornicePt[0], cornicePt[1], floorY + height - 0.3, floorY + height, edge.len, 0.3, Math.atan2(edge.t[1], edge.t[0]), hex('#f4efe2'));
        if (!edge.street) continue;
        const shops = Math.max(1, Math.round(edge.len / 6)), shopW = edge.len / shops;
        for (let j = 0; j < shops; j++) {
          const shopOrigin = offsetPt(edge.o, edge.t, edge.f, -edge.len / 2 + shopW * (j + 0.5), 0.02);
          dressShopfront(ctx, shopOrigin, edge.t, edge.f, shopW - 0.1, height, floorY, 910000 + j * 7 + Math.round(edge.o[0]), { gap: edge.st.d - HALF_STREET - 0.3, st: edge.st.k, type: j % 2 ? 'cafe' : 'shop' });
        }
      }
    });
  }

  // 3. Jasmine Hotel tower on Chu Văn An
  if (replaced.jasmine) {
    const ring = replaced.jasmine, height = 30.6, col = hex('#ece6da');
    const floorY = buildBlock(ring, height, col, { roof: hex('#bdb9b0'), parapet: 0.8 });
    later.push(() => {
      const edges = facesOf(ring);
      const upStreet = lines.cva.seg[lines.cva.seg.length - 2].t;
      const face = edges.reduce((best, cand) => (dot2(cand.f, upStreet) > dot2(best.f, upStreet) ? cand : best), edges[0]);
      const ang = Math.atan2(face.t[1], face.t[0]), topY = floorY + height;
      const liftPt = offsetPt(face.o, face.t, face.f, 0, -2.5);
      S.box(liftPt[0], liftPt[1], topY, topY + 3.0, 4, 3.5, ang, shade(col, 0.92), { top: ROOFS[1] });
      const signPt = offsetPt(face.o, face.t, face.f, 0, -0.6), signW = Math.min(face.len - 1, 9);
      for (const u of [-signW / 2 + 0.4, 0, signW / 2 - 0.4]) {
        const postPt = offsetPt(signPt, face.t, face.f, u, -0.3);
        S.box(postPt[0], postPt[1], topY, topY + 1.4, 0.15, 0.15, ang, PAL.iron);
      }
      S.box(signPt[0], signPt[1], topY + 1.3, topY + 3.2, signW, 0.18, ang, hex('#f2efe6'));
      const letterPt = offsetPt(signPt, face.t, face.f, 0, 0.1);
      S.box(letterPt[0], letterPt[1], topY + 1.75, topY + 2.75, signW * 0.8, 0.05, ang, hex('#2c5a9a'));
      lights.sign[1].push([letterPt[0], letterPt[1], topY + 1.78, topY + 2.72, signW * 0.8, 0.07, ang]);
      for (const edge of edges) {
        if (edge.street) dressShopfront(ctx, edge.o, edge.t, edge.f, edge.len - 0.2, height, floorY, 920000, { gap: edge.st.d - HALF_STREET - 0.3, st: 'cva', type: 'hotel' });
      }
    });
  }

  // 4. Cream hotel closing the paved lane
  if (replaced.laneEnd) {
    const ring = replaced.laneEnd, height = 13.6;
    const floorY = buildBlock(ring, height, hex('#ebe3cf'), { kind: KIND.COLONIAL, roof: hex('#c9c4b8'), parapet: 0.8 });
    later.push(() => {
      for (const edge of facesOf(ring)) {
        if (edge.f[1] > -0.4 || edge.len < 5) continue;
        const ang = Math.atan2(edge.t[1], edge.t[0]), balcW = Math.min(edge.len - 1.5, 6);
        for (let fl = 1; fl < 4; fl++) {
          const y = floorY + fl * FLOOR_HEIGHT;
          const slabPt = offsetPt(edge.o, edge.t, edge.f, 0, 0.5);
          const railPt = offsetPt(edge.o, edge.t, edge.f, 0, 0.97);
          S.box(slabPt[0], slabPt[1], y - 0.12, y + 0.06, balcW, 1.0, ang, hex('#f2ede2'));
          S.box(railPt[0], railPt[1], y + 0.06, y + 1.0, balcW, 0.06, ang, PAL.rail);
        }
      }
    });
  }
}

function buildChuVanAnSignatures(ctx) {
  const { S, lights, later, lines, sigLot, lotAt, lotPt, takeLot, buildBody, buildTube, lotFront, plantTree } = ctx;

  // 5. Chu Văn An north of the lane mouth: Burger Ngon / salmon hotel, white café box, timber café & white gate
  const salmonLot = sigLot('cva', 106.5, 119, -1, STREET_SETBACK, [12, 10, 8]);
  if (salmonLot) {
    const floors = 6, height = floors * FLOOR_HEIGHT, col = hex('#c4826a');
    const floorY = buildBody(salmonLot, height, col, { key: 2, roof: ROOFS[3] });
    later.push(() => {
      const { o, t, f, w, ang } = salmonLot;
      const box = (u, v, y0, y1, sx, sz, boxCol, opt?) => { const pt = offsetPt(o, t, f, u, v); S.box(pt[0], pt[1], floorY + y0, floorY + y1, sx, sz, ang, boxCol, opt); };
      for (let fl = 2; fl < floors; fl++) {
        const y = fl * FLOOR_HEIGHT;
        box(0, 0.05, y - 0.15, y + 0.1, w, 0.35, shade(col, 0.88));
        for (const u of [-w * 0.27, w * 0.24]) {
          box(u, 0.5, y - 0.1, y + 0.06, w * 0.38, 1.0, shade(col, 0.82));
          box(u, 0.97, y + 0.06, y + 1.0, w * 0.38, 0.06, PAL.rail);
          if (rand(fl * 3 + Math.round(u), 7) < 0.7) box(u + w * 0.12, 0.35, y + 1.6, y + 2.15, 0.8, 0.3, PAL.ac);
        }
      }
      const gA = offsetPt(o, t, f, -2, 0.02), gB = offsetPt(o, t, f, 2, 0.02), gTop = offsetPt(o, t, f, 0, 0.02);
      S.tri([gA[0], floorY + height, gA[1]], [gB[0], floorY + height, gB[1]], [gTop[0], floorY + height + 1.8, gTop[1]], shade(col, 0.95), [f[0], 0.1, f[1]]);
      for (const u of [-w / 2 + 0.15, w / 2 - 0.15]) box(u, 0.05, 4.4, height, 0.3, 0.12, hex('#e9e2d4'));
      box(0, 0.04, 0.05, 2.9, w - 0.4, 0.06, PAL.shopLit);
      lights.warm.push([...offsetPt(o, t, f, 0, 0.08), floorY + 0.1, floorY + 2.8, w - 0.6, 0.02, ang]);
      box(0, 0.6, 2.95, 4.3, w, 1.2, hex('#e9e6df'), { bottom: true });
      box(0, 1.22, 3.3, 3.95, w * 0.55, 0.04, hex('#c99a2e'));
      lights.sign[2].push([...offsetPt(o, t, f, 0, 1.25), floorY + 3.32, floorY + 3.93, w * 0.55, 0.02, ang]);
      box(w / 2 - 0.4, 0.55, 4.55, 8.6, 0.12, 0.85, hex('#2a2a2a'), { bottom: true });
      box(w / 2 - 0.4, 0.55, 4.9, 8.2, 0.15, 0.3, hex('#c99a2e'));
      for (let u = -w / 2 + 1.2; u < w / 2 - 0.8; u += 2.6) {
        const pt = offsetPt(o, t, f, u, 1.5);
        S.box(pt[0], pt[1], floorY, floorY + 0.75, 0.8, 0.8, ang, PAL.wood);
        S.cyl(pt[0], pt[1], floorY + 0.75, floorY + 2.2, 0.03, 0.03, 4, PAL.wire);
        S.cyl(pt[0], pt[1], floorY + 1.7, floorY + 2.3, 1.1, 0.05, 8, hex('#e8e0cc'));
      }
    });
  }

  const whiteCafeLot = sigLot('cva', 89.5, 94.5, 1, STREET_SETBACK, [8, 7, 6, 5]);
  if (whiteCafeLot) {
    const floorY = buildBody(whiteCafeLot, 6.8, PAL.white, { kind: KIND.PLAIN, key: 4 });
    later.push(() => {
      const { o, t, f, w, ang } = whiteCafeLot;
      const box = (u, v, y0, y1, sx, sz, col?) => { const pt = offsetPt(o, t, f, u, v); S.box(pt[0], pt[1], floorY + y0, floorY + y1, sx, sz, ang, col); };
      box(0, 0.04, 3.9, 5.6, w * 0.7, 0.05, PAL.glass);
      box(0, 0.7, 3.2, 3.4, w, 1.4, PAL.white);
      box(w * 0.2, 0.1, 1.8, 3.0, 1.4, 0.06, hex('#8fc8b8'));
    });
    lotFront(whiteCafeLot, 6.8, floorY, 5, { st: 'cva', type: 'cafe', sign: false });
  }

  const timberCafeLot = sigLot('cva', 98, 108.5, 1, STREET_SETBACK + 3.5, [9, 8, 7]);
  const cafeYard = lotAt('cva', 94.6, 108.5, 1, STREET_SETBACK, 3.5);
  if (timberCafeLot) {
    takeLot(cafeYard);
    const floorY = buildBody(timberCafeLot, 3.2, hex('#4a3a30'), { kind: KIND.PLAIN, key: 6 });
    S.kind = KIND.TIMBER;
    S.base = floorY + 3.2;
    S.box(timberCafeLot.c[0], timberCafeLot.c[1], floorY + 3.2, floorY + 6.4, timberCafeLot.w - 0.08, timberCafeLot.d, timberCafeLot.ang, hex('#9a4a32'), { top: hex('#7a3e2c') });
    S.kind = KIND.PLAIN;
    S.base = 0;
    later.push(() => {
      const { o, t, f, w, d, ang } = timberCafeLot;
      const box = (u, v, y0, y1, sx, sz, col, opt?) => { const pt = offsetPt(o, t, f, u, v); S.box(pt[0], pt[1], floorY + y0, floorY + y1, sx, sz, ang, col, opt); };
      const pt3 = (u, v, y) => { const pt = offsetPt(o, t, f, u, v); return [pt[0], floorY + y, pt[1]]; };
      const roofCol = hex('#8a5a3e');
      S.quad(pt3(-w / 2 - 0.4, 2.2, 6.6), pt3(w / 2 + 0.4, 2.2, 6.6), pt3(w / 2 + 0.4, -d - 0.3, 8.2), pt3(-w / 2 - 0.4, -d - 0.3, 8.2), roofCol, [f[0] * 0.2, 1, f[1] * 0.2]);
      S.quad(pt3(-w / 2 - 0.4, -d - 0.3, 8.15), pt3(w / 2 + 0.4, -d - 0.3, 8.15), pt3(w / 2 + 0.4, 2.2, 6.55), pt3(-w / 2 - 0.4, 2.2, 6.55), shade(roofCol, 0.6), [0, -1, 0]);
      for (const u of [-w / 2 + 0.2, w / 2 - 0.2]) box(u, 2.0, 0, 6.6, 0.18, 0.18, PAL.timber);
      box(0, 2.0, 3.2, 3.4, w, 0.2, PAL.timber);
      box(0, 2.0, 3.4, 4.4, w, 0.08, hex('#7a3e2c'));
      box(0, 1.0, 3.15, 3.35, w, 2.0, PAL.timber);
      lights.warm.push([...offsetPt(o, t, f, 0, 0.06), floorY + 0.2, floorY + 2.9, w - 0.6, 0.02, ang]);
      for (let u = -w / 2 + 0.5; u < w / 2; u += 1.3) {
        const seed = Math.round(u * 17 + o[0]);
        if (rand(seed, 1) < 0.6) box(u, 2.1, 1.0 + rand(seed, 2) * 2, 4.4 + rand(seed, 3) * 2.4, 1.0 + rand(seed, 4), 0.5, rand(seed, 5) < 0.5 ? PAL.creeper : PAL.leaf);
      }
      for (let u = -w / 2 + 1; u < w / 2 - 0.5; u += 2.2) { box(u, 2.6, 0, 0.5, 0.5, 0.5, PAL.pot); box(u, 2.6, 0.5, 1.2, 0.6, 0.6, PAL.leafD); }

      const fenceA = lotPt(cafeYard, -cafeYard.w / 2, -0.05), fenceB = lotPt(cafeYard, cafeYard.w / 2, -0.05);
      buildPicketFence(S, fenceA, fenceB, { y: 1.9, base: 0.6, step: 2.6, col: PAL.white, picket: hex('#e8e6e0'), pillar: hex('#f2f0ea'), gap: 0.16 });
      const gateMid = lotPt(cafeYard, -cafeYard.w / 2 + 4.0, -0.05), gateG = groundY(gateMid[0], gateMid[1]);
      S.box(gateMid[0], gateMid[1], gateG, gateG + 2.0, 2.6, 0.08, cafeYard.ang, hex('#ecebe6'));
      for (const u of [-0.7, 0, 0.7]) { const pt = offsetPt(gateMid, cafeYard.t, cafeYard.f, u, 0.06); S.box(pt[0], pt[1], gateG + 0.6, gateG + 1.5, 0.4, 0.02, cafeYard.ang, PAL.iron); }
      for (const u of [-1.45, 1.45]) { const pt = offsetPt(gateMid, cafeYard.t, cafeYard.f, u, 0); S.box(pt[0], pt[1], gateG, gateG + 2.5, 0.5, 0.5, cafeYard.ang, hex('#f2f0ea')); }
    });
  }
  const treePt = lines.cva.at(114, 4.4);
  plantTree(treePt[0], treePt[1], 4.2, 4.6, 10, [0, 0]);

  // 6. Chu Văn An at the Lê Lợi end
  const glassLot = sigLot('cva', 333.5, 345.5, 1, STREET_SETBACK, [12, 10, 8]);
  if (glassLot) {
    const height = 23.8, floorY = buildBody(glassLot, height, hex('#23272b'), { kind: KIND.GLAZED, roof: ROOFS[1], key: 7 });
    later.push(() => {
      const { o, t, f, w, ang } = glassLot;
      const box = (u, v, y0, y1, sx, sz, col?) => { const pt = offsetPt(o, t, f, u, v); S.box(pt[0], pt[1], floorY + y0, floorY + y1, sx, sz, ang, col); };
      for (let u = -w / 2 + 0.25; u <= w / 2; u += w / 4 - 0.12) box(u, 0.15, 3.4, height + 0.4, 0.5, 0.3, hex('#8d9196'));
      for (let fl = 1; fl <= 7; fl++) box(0, 0.1, fl * FLOOR_HEIGHT - 0.35, fl * FLOOR_HEIGHT, w, 0.2, hex('#7d8186'));
      box(0, 0.6, 3.1, 3.35, w, 1.2, hex('#7d8186'));
    });
    lotFront(glassLot, height, floorY, 8, { st: 'cva', type: 'shop' });
  }
  const greenBlockLot = sigLot('cva', 322, 333.3, 1, STREET_SETBACK, [12, 10, 8]);
  if (greenBlockLot) { const built = buildTube(greenBlockLot, 9, [hex('#cfe0d0')], 5, true); lotFront(greenBlockLot, built.h, built.gy, 9, { st: 'cva', type: 'cafe' }); }
  const cornerShopLot = sigLot('cva', 332.5, 341.2, -1, STREET_SETBACK, [7, 6, 5]);
  if (cornerShopLot) {
    const floorY = buildBody(cornerShopLot, 3.6, hex('#e7e1d2'), { kind: KIND.PLAIN, key: 10 });
    S.hip(cornerShopLot.c[0], cornerShopLot.c[1], cornerShopLot.w + 0.6, cornerShopLot.d + 0.6, cornerShopLot.ang, floorY + 3.6, 1.8, hex('#9a4a32'));
    later.push(() => {
      const { o, t, f, w, ang } = cornerShopLot;
      const box = (u, v, y0, y1, sx, sz, col?) => { const pt = offsetPt(o, t, f, u, v); S.box(pt[0], pt[1], floorY + y0, floorY + y1, sx, sz, ang, col); };
      box(0, 0.04, 0.05, 2.5, w * 0.8, 0.06, PAL.shopLit);
      lights.warm.push([...offsetPt(o, t, f, 0, 0.08), floorY + 0.1, floorY + 2.4, w * 0.8 - 0.2, 0.02, ang]);
      box(0, 0.4, 2.55, 3.4, w * 0.9, 0.12, hex('#2f7a3e'));
      box(0, 0.47, 2.8, 3.15, w * 0.55, 0.03, hex('#f4f1e8'));
      lights.sign[3].push([...offsetPt(o, t, f, 0, 0.5), floorY + 2.6, floorY + 3.35, w * 0.85, 0.01, ang]);
    });
  }
  const backBlockLot = sigLot('cva', 330, 340.6, -1, STREET_SETBACK + 7.5, [10, 8, 6]);
  if (backBlockLot) buildTube(backBlockLot, 11, [hex('#eceae4')], 5, false);
}

function buildSignatureLandmarks(ctx) {
  buildVtsAndCornerSignatures(ctx);
  buildChuVanAnSignatures(ctx);
}

function buildPavedLane(ctx) {
  const { S, later, lines, lotAt, deepestLot, lotPt, takeLot, buildBody, deferFront, plantTree } = ctx;
  const laneLine = lines.lane;
  const laneLot = (s0, s1, side, setback, depths) => {
    const fitted = deepestLot(lotAt('lane', s0, s1, side, setback, depths[0]), depths);
    if (!fitted) console.warn('photay: no room on the lane at', s0);
    return fitted;
  };

  const hotelLot = laneLot(3, 14.5, -1, LANE_SET, [12, 10, 8, 6]);
  if (hotelLot) {
    const height = 13.6, floorY = buildBody(hotelLot, height, hex('#9fb2ad'), { key: 20 });
    later.push(() => {
      const { o, t, f, w, ang } = hotelLot;
      const box = (u, v, y0, y1, sx, sz, col?) => { const pt = offsetPt(o, t, f, u, v); S.box(pt[0], pt[1], floorY + y0, floorY + y1, sx, sz, ang, col); };
      for (let fl = 1; fl < 4; fl++) {
        box(0, 0.4, fl * FLOOR_HEIGHT - 0.1, fl * FLOOR_HEIGHT + 0.06, w - 1, 0.8, hex('#8a9c97'));
        box(0, 0.77, fl * FLOOR_HEIGHT + 0.06, fl * FLOOR_HEIGHT + 0.95, w - 1, 0.05, PAL.rail);
      }
      for (let u = -w / 2 + 0.6; u < w / 2; u += 0.9) {
        const seed = Math.round(u * 19 + 7);
        box(u, 0.12, 0.3 + rand(seed, 1), 3.0 + rand(seed, 2) * 5.5, 0.8 + rand(seed, 3) * 0.5, 0.25, rand(seed, 4) < 0.5 ? PAL.creeper : PAL.leafD);
      }
    });
    deferFront(hotelLot.o, hotelLot.t, hotelLot.f, hotelLot.w - 0.1, height, floorY, 21, { gap: 0.3, st: 'cva', type: 'hotel' });
  }

  const yellowLot = laneLot(17.5, 27, -1, LANE_SET, [10, 8, 6]);
  if (yellowLot) {
    const floorY = buildBody(yellowLot, 7.2, hex('#dcc684'), { kind: KIND.COLONIAL, key: 22 });
    later.push(() => { const pt = lotPt(yellowLot, 0, -0.1); S.box(pt[0], pt[1], floorY + 7.0, floorY + 7.4, yellowLot.w, 0.35, yellowLot.ang, hex('#efe6c8')); });
  }

  const villaLot = laneLot(8, 21, 1, LANE_HALF + 4.5, [10, 9, 8, 7]);
  if (villaLot) {
    const height = 10.2, floorY = buildBody(villaLot, height, hex('#eeeae2'), { kind: KIND.COLONIAL, key: 23 });
    takeLot(lotAt('lane', 2, 40, 1, LANE_HALF, 4.4));
    later.push(() => {
      const { o, t, f, w, ang } = villaLot;
      const box = (u, v, y0, y1, sx, sz, col?) => { const pt = offsetPt(o, t, f, u, v); S.box(pt[0], pt[1], floorY + y0, floorY + y1, sx, sz, ang, col); };
      for (const fl of [1, 2]) {
        box(0, 0.6, fl * FLOOR_HEIGHT - 0.12, fl * FLOOR_HEIGHT + 0.06, w * 0.6, 1.2, hex('#f4f1ea'));
        box(0, 1.17, fl * FLOOR_HEIGHT + 0.06, fl * FLOOR_HEIGHT + 1.0, w * 0.6, 0.06, PAL.rail);
      }
      box(0, 0.1, height - 0.3, height + 0.6, w, 0.3, hex('#f4f1ea'));
    });
  }

  later.push(() => {
    const westEdge = (dist) => laneLine.at(dist, LANE_HALF);
    buildPicketFence(S, westEdge(2), westEdge(15), { y: 1.7, base: 0.45, step: 3 });
    buildPicketFence(S, westEdge(17), westEdge(40.5), { y: 1.7, base: 0.45, step: 3 });
    const g0 = westEdge(15), g1 = westEdge(17);
    const gateMid = [(g0[0] + g1[0]) / 2, (g0[1] + g1[1]) / 2];
    const gateAng = Math.atan2(g1[1] - g0[1], g1[0] - g0[0]);
    const gateG = groundY(gateMid[0], gateMid[1]);
    S.box(gateMid[0], gateMid[1], gateG + 1.95, gateG + 2.05, 2, 0.06, gateAng, PAL.iron);
    S.box(gateMid[0], gateMid[1], gateG + 0.05, gateG + 0.15, 2, 0.06, gateAng, PAL.iron);
    for (let bar = 0.1; bar < 2; bar += 0.12) {
      const pt = [g0[0] + ((g1[0] - g0[0]) * bar) / 2, g0[1] + ((g1[1] - g0[1]) * bar) / 2];
      S.box(pt[0], pt[1], gateG + 0.1, gateG + 2.0, 0.04, 0.04, gateAng, PAL.iron);
    }

    const eastEdge = (dist) => laneLine.at(dist, -LANE_SET - 0.13);
    buildGardenWall(S, eastEdge(14.6), eastEdge(17.4), 2.6, hex('#c9c4b8'), 0.9);
    buildGardenWall(S, eastEdge(27.2), eastEdge(32), 2.2, hex('#d6cbb5'), 0.5);
    buildGardenWall(S, eastEdge(35), eastEdge(40.6), 2.2, hex('#d6cbb5'), 0.5);
    for (const dist of [32, 35]) {
      const pt = eastEdge(dist), postG = groundY(pt[0], pt[1]);
      S.box(pt[0], pt[1], postG - 0.1, postG + 2.7, 0.55, 0.55, 0, hex('#e2dccd'));
    }
    buildGardenWall(S, eastEdge(42.5), eastEdge(57), 2.4, hex('#e2dccd'), 0.6);
  });

  for (const [dist, lateral, radius] of ([[5, 4.0, 3.4], [19.5, 4.4, 3.8], [31, 3.9, 3.2]] as [number, number, number][])) {
    const trunkPt = laneLine.at(dist, lateral), crownPt = laneLine.at(dist, 2.2);
    plantTree(trunkPt[0], trunkPt[1], radius, 4.4, 8.2, [crownPt[0] - trunkPt[0], crownPt[1] - trunkPt[1]]);
  }

  later.push(() => {
    S.kind = KIND.GROUND;
    for (const seg of laneLine.seg) {
      const cols = Math.max(1, Math.round(seg.L / 1.0)), stepU = seg.L / cols;
      const slabPt = (u, v, lift) => {
        const x = seg.a[0] + seg.t[0] * u + seg.n[0] * v, z = seg.a[1] + seg.t[1] * u + seg.n[1] * v;
        return [x, LAND_Y + rise(x, z) + lift, z];
      };
      S.quad(slabPt(0, -LANE_HALF, 0.3), slabPt(seg.L, -LANE_HALF, 0.3), slabPt(seg.L, LANE_HALF, 0.3), slabPt(0, LANE_HALF, 0.3), PAL.joint, [0, 1, 0]);
      for (let j = 0; j < cols; j++) {
        for (let row = 0; row < 4; row++) {
          const u0 = j * stepU + 0.05, u1 = (j + 1) * stepU - 0.05;
          const v0 = -LANE_HALF + row + 0.05, v1 = v0 + 0.9;
          const seed = Math.round(seg.s0 + j) * 4 + row;
          const col = (j + row) % 2 ? PAL.slabA : PAL.slabB;
          S.quad(slabPt(u0, v0, 0.33), slabPt(u1, v0, 0.33), slabPt(u1, v1, 0.33), slabPt(u0, v1, 0.33), rand(seed, 1) < 0.15 ? shade(col, 0.95) : col, [0, 1, 0]);
        }
      }
    }
    S.kind = KIND.PLAIN;
  });
}

function buildCorners(ctx) {
  const { S, lights, glowPos, glowCol, later, allRoads, inside, blocked, keyOf, buildBlock } = ctx;
  const junctions = [];
  for (const road of allRoads) {
    if (road.c > 5) continue;
    for (const pt of road.pts) {
      if (!inside(pt[0], pt[1]) || junctions.some((junc) => Math.hypot(junc[0] - pt[0], junc[1] - pt[1]) < 3)) continue;
      if (allRoads.some((other) => other !== road && other.c <= 5 && other.pts.some((opt) => Math.hypot(opt[0] - pt[0], opt[1] - pt[1]) < 0.6))) {
        junctions.push(pt);
      }
    }
  }

  for (const junc of junctions) {
    const arms = [];
    for (const road of allRoads) {
      if (road.c > 5) continue;
      road.pts.forEach((pt, idx) => {
        if (Math.hypot(pt[0] - junc[0], pt[1] - junc[1]) > 0.6) return;
        for (const dir of [-1, 1]) {
          const endPt = walkPolyline(road.pts, idx, dir, 8);
          if (!endPt) continue;
          const armDir = unit2([endPt[0] - junc[0], endPt[1] - junc[1]]);
          if (arms.some((other) => dot2(armDir, other.a) > 0.966)) continue;
          const streetKey = keyOf([junc[0] + armDir[0] * 6, junc[1] + armDir[1] * 6]);
          arms.push({ a: armDir, k: streetKey, set: STREET_KEYS.includes(streetKey) ? STREET_SETBACK : streetKey === 'lane' ? LANE_SET : road.half + 0.6, ang: Math.atan2(armDir[1], armDir[0]) });
        }
      });
    }
    if (!arms.some((arm) => arm.k)) continue;
    arms.sort((armA, armB) => armA.ang - armB.ang);

    for (let i = 0; i < arms.length && arms.length > 1; i++) {
      const armA = arms[i], armB = arms[(i + 1) % arms.length];
      let gapAng = armB.ang - armA.ang;
      if (gapAng <= 0) gapAng += Math.PI * 2;
      if (gapAng < 0.96 || gapAng > 2.18 || !(armA.k || armB.k)) continue;
      const a1 = armA.a, a2 = armB.a;
      const n1 = unit2([a2[0] - dot2(a1, a2) * a1[0], a2[1] - dot2(a1, a2) * a1[1]]);
      const n2 = unit2([a1[0] - dot2(a1, a2) * a2[0], a1[1] - dot2(a1, a2) * a2[1]]);
      const rx = n2[0] * armB.set - n1[0] * armA.set, rz = n2[1] * armB.set - n1[1] * armA.set;
      const det = -a1[0] * a2[1] + a2[0] * a1[1];
      const param = (-rx * a2[1] + a2[0] * rz) / det;
      const corner = [junc[0] + n1[0] * armA.set + a1[0] * param, junc[1] + n1[1] * armA.set + a1[1] * param];
      const bisector = unit2([a1[0] + a2[0], a1[1] + a2[1]]);
      const isPnlVts = [armA.k, armB.k].includes('pnl') && [armA.k, armB.k].includes('vts');
      const isPink = isPnlVts && bisector[1] < -0.5;
      const isOrange = isPnlVts && bisector[0] < -0.5;
      const candidateSizes = isPink ? [[12, 10], [10, 9], [9, 8], [8, 7]] : isOrange ? [[11, 10], [10, 9], [9, 8], [8, 7]] : [[9, 9], [8, 8], [8, 6], [6, 8], [6, 6], [5, 5]];

      let ring = null, len1 = 0, len2 = 0;
      for (const [l1, l2] of candidateSizes) {
        const pts = [corner, [corner[0] + a1[0] * l1, corner[1] + a1[1] * l1], [corner[0] + a1[0] * l1 + a2[0] * l2, corner[1] + a1[1] * l1 + a2[1] * l2], [corner[0] + a2[0] * l2, corner[1] + a2[1] * l2]];
        let fits = true;
        for (let sx = 0.3; sx <= l1 - 0.3 && fits; sx += Math.min(1, (l1 - 0.6) / 4)) {
          for (let sy = 0.3; sy <= l2 - 0.3 && fits; sy += Math.min(1, (l2 - 0.6) / 4)) {
            if (blocked(corner[0] + a1[0] * sx + a2[0] * sy, corner[1] + a1[1] * sx + a2[1] * sy)) fits = false;
          }
        }
        if (fits) { ring = pts; len1 = l1; len2 = l2; break; }
      }
      if (!ring) continue;

      const key = 400000 + Math.round(corner[0] * 3 + corner[1] * 7);
      const st = STREET_KEYS.includes(armA.k) ? armA.k : STREET_KEYS.includes(armB.k) ? armB.k : 'cva';
      const floors = isPink ? 2 : isOrange ? 4 : 3 + (rand(key, 1) < 0.45 ? 1 : 0);
      const col = isPink ? hex('#e3b4ad') : isOrange ? hex('#ece0c4') : pick(STREET_STYLE[st].walls, key, 2);
      const height = floors * FLOOR_HEIGHT + (isPink ? 0.6 : 0);
      const floorY = buildBlock(ring, height, col, { kind: isPink ? KIND.COLONIAL : KIND.FACADE, roof: pick(ROOFS, key, 3), parapet: 0.6 });
      const faces = [[armA, a1, n1, len1], [armB, a2, n2, len2]];
      later.push(() => {
        for (const [arm, armDir, inwardN, faceLen] of faces) {
          const fwd = [-inwardN[0], -inwardN[1]];
          const origin = [corner[0] + (armDir[0] * faceLen) / 2, corner[1] + (armDir[1] * faceLen) / 2];
          const ang = Math.atan2(armDir[1], armDir[0]);
          const box = (u, v, y0, y1, sx, sz, boxCol, opt?) => { const pt = offsetPt(origin, armDir, fwd, u, v); S.box(pt[0], pt[1], floorY + y0, floorY + y1, sx, sz, ang, boxCol, opt); };
          if (isPink) {
            box(0, 0.65, 3.3, 3.5, faceLen + 1.3, 1.3, hex('#efe6dc'));
            buildBalustrade(S, offsetPt(origin, armDir, fwd, -faceLen / 2, 1.22), offsetPt(origin, armDir, fwd, faceLen / 2 + 1.22, 1.22), floorY + 3.5, 0.9, hex('#f3eee4'));
            for (let u = -faceLen / 2 + 0.3; u <= faceLen / 2 + 1.1; u += (faceLen + 0.8) / 3) box(u, 1.15, 3.5, 6.9, 0.28, 0.28, hex('#e9c4be'));
            box(0, 0.75, 6.9, 7.1, faceLen + 1.5, 1.5, hex('#e3b4ad'));
            box(0, 1.5, 6.2, 6.9, faceLen * 0.6, 0.05, hex('#3f7a5a'));
          }
          if (isOrange) {
            box(0, 0.06, 0.05, 3.0, faceLen, 0.12, hex('#dd7a2c'));
            box(0, 0.13, 0.1, 2.6, faceLen * 0.7, 0.04, PAL.shopLit);
            lights.warm.push([...offsetPt(origin, armDir, fwd, 0, 0.16), floorY + 0.15, floorY + 2.5, faceLen * 0.7 - 0.2, 0.02, ang]);
            box(0, 0.3, 3.0, 3.7, faceLen, 0.2, hex('#c55a8a'));
            box(0, 0.41, 3.15, 3.55, faceLen * 0.6, 0.03, hex('#f4f1e8'));
            lights.sign[6].push([...offsetPt(origin, armDir, fwd, 0, 0.43), floorY + 3.17, floorY + 3.53, faceLen * 0.6, 0.01, ang]);
            box(0, 0.25, 2.6, 3.0, faceLen, 0.3, hex('#2f5fa8'));
            for (let u = -faceLen / 2 + 1; u < faceLen / 2; u += 1.8) {
              const pt = offsetPt(origin, armDir, fwd, u, 0.9);
              S.cyl(pt[0], pt[1], floorY + 2.0, floorY + 2.4, 0.18, 0.18, 6, PAL.lantern);
              glowPos.push(pt[0], floorY + 2.2, pt[1]);
              glowCol.push(1, 0.32, 0.18);
            }
          }
          if (!STREET_KEYS.includes(arm.k) || isOrange) continue;
          dressShopfront(ctx, origin, armDir, fwd, faceLen - 0.4, height, floorY, key + (arm === armA ? 0 : 1), { gap: arm.set - HALF_STREET - 0.3, st: arm.k, balcony: isPink, sign: !isPink || arm === armA, type: isPink ? 'shop' : null });
        }
      });
    }
  }
}

function buildStreetFurnitureAndPavements(ctx) {
  const { S, lights, glowPos, glowCol, lines, allRoads, trees, inside, onRoad, streetOf } = ctx;

  // kerbside lamp posts every 16 m + overhead lantern strings
  const ownStreet = (streetKey, pt) => nearestOnPolyline(STREETS[streetKey], pt[0], pt[1]).d < 1.0;
  const nearObstacle = (streetKey, pt) =>
    allRoads.some((road) => { const hit = nearestOnPolyline(road.pts, pt[0], pt[1]); return hit.d < road.half + 2.5 && !ownStreet(streetKey, hit.p); })
    || nearestOnPolyline(LANE, pt[0], pt[1]).d < LANE_HALF + 2.5
    || trees.some((treePt) => Math.hypot(treePt[0] - pt[0], treePt[1] - pt[1]) < 3);

  for (const streetKey of STREET_KEYS) {
    const pts = STREETS[streetKey];
    for (let i = 0; i + 1 < pts.length; i++) {
      const ptA = pts[i], ptB = pts[i + 1];
      const len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
      const tan = [(ptB[0] - ptA[0]) / len, (ptB[1] - ptA[1]) / len], nrm = [-tan[1], tan[0]];
      for (let dist = 6; dist < len - 6; dist += 16) {
        const mid = [ptA[0] + tan[0] * dist, ptA[1] + tan[1] * dist];
        if (!inside(mid[0], mid[1])) continue;
        const ends = [-1, 1].map((side) => [mid[0] + nrm[0] * side * (HALF_STREET + 0.35), mid[1] + nrm[1] * side * (HALF_STREET + 0.35)]);
        if (ends.some((end) => nearObstacle(streetKey, end))) continue;
        const topYs = ends.map((end) => groundY(end[0], end[1]) + 4.7);
        for (let j = 0; j < 2; j++) {
          const [ex, ez] = ends[j], y = topYs[j];
          S.cyl(ex, ez, y - 4.7, y - 4.2, 0.16, 0.12, 6, PAL.pole);
          S.cyl(ex, ez, y - 4.2, y + 0.3, 0.085, 0.065, 6, PAL.pole);
          S.cyl(ex, ez, y + 0.3, y + 0.42, 0.06, 0.4, 8, PAL.pole, { cap: false });
          S.cyl(ex, ez, y + 0.42, y + 0.5, 0.4, 0.3, 8, PAL.pole);
          glowPos.push(ex, y + 0.27, ez);
          glowCol.push(1, 0.92, 0.75);
        }
        const wireSegs = 8;
        const catenaryY = (frac) => topYs[0] + (topYs[1] - topYs[0]) * frac - 0.55 * 4 * frac * (1 - frac);
        const wirePt = (frac): [number, number] => [ends[0][0] + (ends[1][0] - ends[0][0]) * frac, ends[0][1] + (ends[1][1] - ends[0][1]) * frac];
        for (let j = 0; j < wireSegs; j++) {
          const p0 = wirePt(j / wireSegs), p1 = wirePt((j + 1) / wireSegs);
          S.beam([p0[0], catenaryY(j / wireSegs), p0[1]], [p1[0], catenaryY((j + 1) / wireSegs), p1[1]], 0.03, 0.03, PAL.wire);
        }
        const lanternCount = Math.round((2 * HALF_STREET + 0.7) / 0.85);
        for (let j = 1; j < lanternCount; j++) {
          const frac = j / lanternCount, pt = wirePt(frac), y = catenaryY(frac) - 0.1;
          const col = streetKey === 'cva' ? PAL.paper : streetKey === 'vts' ? ((j + i) % 2 ? PAL.lantern : PAL.lanternY) : ((j + i) % 3 === 0 ? PAL.lantern : (j + i) % 3 === 1 ? PAL.lanternY : PAL.paper);
          S.box(pt[0], pt[1], y - 0.38, y, 0.28, 0.28, Math.atan2(tan[1], tan[0]), col);
          glowPos.push(pt[0], y - 0.18, pt[1]);
          glowCol.push(...(streetKey === 'vts' && (j + i) % 2 ? [1, 0.35, 0.2] : BULB_COLS[(j + i) % BULB_COLS.length]));
        }
      }
    }
  }

  // walking-street welcome arches
  for (const [streetKey, arcPos] of ([['vts', 165], ['pnl', 22]] as [string, number][])) {
    const center = lines[streetKey].at(arcPos, 0), nextPt = lines[streetKey].at(arcPos + 1, 0);
    const tx = nextPt[0] - center[0], tz = nextPt[1] - center[1], len = Math.hypot(tx, tz) || 1;
    const nx = -tz / len, nz = tx / len, ang = Math.atan2(nz, nx);
    const span = HALF_STREET + 0.55, y0 = groundY(center[0], center[1]);
    S.kind = KIND.PLAIN;
    for (const side of [-1, 1]) {
      const px = center[0] + nx * side * span, pz = center[1] + nz * side * span;
      S.box(px, pz, y0, y0 + 5.6, 0.42, 0.42, ang, hex('#9e2e24'));
      S.box(px, pz, y0, y0 + 0.7, 0.62, 0.62, ang, hex('#c9a248'));
    }
    S.box(center[0], center[1], y0 + 5.2, y0 + 5.85, span * 2 + 0.8, 0.42, ang, hex('#9e2e24'));
    S.box(center[0], center[1], y0 + 5.42, y0 + 5.66, span * 1.4, 0.48, ang, hex('#e5be4c'));
    lights.sign[2].push([center[0], center[1], y0 + 5.4, y0 + 5.68, span * 1.35, 0.52, ang]);
  }

  // stone pavements
  S.kind = KIND.GROUND;
  for (const streetKey of STREET_KEYS) {
    const pts = STREETS[streetKey], pave = STREET_STYLE[streetKey].pave;
    for (let i = 0; i + 1 < pts.length; i++) {
      const ptA = pts[i], ptB = pts[i + 1], len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
      const tan = [(ptB[0] - ptA[0]) / len, (ptB[1] - ptA[1]) / len], nrm = [-tan[1], tan[0]];
      const cols = Math.max(1, Math.round(len / 1.2)), stepU = len / cols;
      for (const side of [-1, 1]) {
        for (let j = 0; j < cols; j++) {
          for (let row = 0; row < 2; row++) {
            const v0 = HALF_STREET + 0.25 + row * 1.0, v1 = v0 + 1.0, u0 = j * stepU, u1 = u0 + stepU;
            const slabPt = (along, across): [number, number] => [ptA[0] + tan[0] * along + nrm[0] * across * side, ptA[1] + tan[1] * along + nrm[1] * across * side];
            const mid = slabPt((u0 + u1) / 2, (v0 + v1) / 2);
            if (!inside(mid[0], mid[1]) || onRoad(mid[0], mid[1], 0.6)) continue;
            if (streetOf(mid[0], mid[1]).d < HALF_STREET + 0.2) continue;
            const col = (j + row) % 2 ? pave[0] : pave[1];
            const corners = [slabPt(u0, v0), slabPt(u1, v0), slabPt(u1, v1), slabPt(u0, v1)].map((pt) => [pt[0], LAND_Y + rise(pt[0], pt[1]) + 0.085, pt[1]]);
            S.quad(corners[0], corners[1], corners[2], corners[3], col, [0, 1, 0]);
          }
        }
      }
    }
  }
  S.kind = KIND.PLAIN;
}

function buildTubeHouseRows(ctx, makeLot) {
  const { allRoads, inside, keyOf, deepestLot, buildTube } = ctx;
  const fillRow = (pts, { set, st = null, back = 0, keyBase }) => {
    const walls = st ? STREET_STYLE[st].walls : SIDE_WALLS;
    for (let i = 0; i + 1 < pts.length; i++) {
      const ptA = pts[i], ptB = pts[i + 1], len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
      const tan = [(ptB[0] - ptA[0]) / len, (ptB[1] - ptA[1]) / len];
      for (const side of [-1, 1]) {
        const fwd = [tan[1] * side, -tan[0] * side];
        let cursor = 0.4, lotIdx = 0;
        while (cursor < len - 3.8) {
          const key = keyBase + Math.round(ptA[0] * 7 + ptA[1] * 13) * 4 + (side > 0 ? 1 : 0) + lotIdx * 9973;
          lotIdx++;
          const width = 4 + rand(key, 40) * 1.6;
          if (cursor + width > len - 0.4) break;
          const midU = cursor + width / 2;
          const origin = [ptA[0] + tan[0] * midU - fwd[0] * set, ptA[1] + tan[1] * midU - fwd[1] * set];
          const fitted = deepestLot(makeLot(origin, tan, fwd, width, 1), st ? [8 + rand(key, 41) * 6, 10, 8, 6, 4.5] : [10, 8, 6, 4.5]);
          if (!fitted) { cursor += 1.0; continue; }
          const roll = rand(key, 42);
          const floors = st ? (roll < 0.15 ? 2 : roll < 0.5 ? 3 : roll < 0.82 ? 4 : 5) : (roll < 0.35 ? 2 : roll < 0.8 ? 3 : 4);
          const built = buildTube(fitted, key, walls, floors, !!st);
          if (st) ctx.lotFront(fitted, built.h, built.gy, key, { st });
          let depthAcc = fitted.d;
          for (let backIdx = 0; backIdx < back; backIdx++) {
            const backOrigin = [origin[0] - fwd[0] * depthAcc, origin[1] - fwd[1] * depthAcc];
            const backLot = deepestLot(makeLot(backOrigin, tan, fwd, width, 1), [10, 8, 6, 4.5]);
            if (!backLot) break;
            buildTube(backLot, key + 17 * (backIdx + 1), walls, 2 + Math.floor(rand(key, 80 + backIdx) * 3), false);
            depthAcc += backLot.d;
          }
          cursor += width;
        }
      }
    }
  };
  for (const key of STREET_KEYS) fillRow(STREETS[key], { set: STREET_SETBACK, st: key, back: 2, keyBase: 300000 });
  for (const road of allRoads) {
    if (road.c < 3 || road.c > 4 || !road.pts.some((pt) => inside(pt[0], pt[1]))) continue;
    const isLane = nearestOnPolyline(LANE, ...(road.pts[0] as [number, number])).d < 0.8 && nearestOnPolyline(LANE, ...(road.pts[road.pts.length - 1] as [number, number])).d < 0.8;
    if (keyOf(road.pts[Math.floor(road.pts.length / 2)]) || isLane) continue;
    fillRow(road.pts, { set: road.half + 0.6, back: 1, keyBase: 500000 });
  }
}

function buildMappedShopfronts(ctx, data, rings) {
  const { inside, facesOf } = ctx;
  rings.forEach(({ ring, bi }) => {
    if (!ring.some((pt) => inside(pt[0], pt[1]))) return;
    const rec = data.bld[bi], height = (rec[5] || rec[1] || 70) / 10;
    for (const edge of facesOf(ring)) {
      if (!edge.street || !inside(edge.o[0], edge.o[1]) || edge.st.d > 10) continue;
      const floorY = LAND_Y + Math.max(rise(edge.p[0], edge.p[1]), rise(edge.q[0], edge.q[1]));
      const shops = Math.max(1, Math.round(edge.len / 6.5)), shopW = edge.len / shops;
      for (let j = 0; j < shops; j++) {
        const shopU = -edge.len / 2 + shopW * (j + 0.5);
        ctx.deferFront(offsetPt(edge.o, edge.t, edge.f, shopU, 0.02), edge.t, edge.f, shopW - 0.1, height, floorY, 200000 + bi * 16 + j, { gap: edge.st.d - HALF_STREET - 0.3, st: edge.st.k });
      }
    }
  });
}

export function build({ data, S, group, place }) {
  const cx = place ? place.x : 673.2, cz = place ? place.z : -89.6;
  const inside = (x, z) => Math.hypot(x - cx, z - cz) < QUARTER_RADIUS;
  S.kind = KIND.PLAIN;
  S.base = 0;

  const lights = { warm: [], sign: SIGN_GLOW.map(() => []) };
  const glowPos = [], glowCol = [];
  const later = [];
  const lines: Record<string, any> = { lane: makePolyline(LANE) };
  for (const key of STREET_KEYS) lines[key] = makePolyline(STREETS[key]);

  const streetOf = (x, z) => {
    let best = null;
    for (const [key, pts] of Object.entries(STREETS)) {
      const hit = nearestOnPolyline(pts, x, z);
      if (!best || hit.d < best.d) best = { ...hit, k: key };
    }
    return best;
  };

  const ROAD_GRID = 20;
  const roadBuckets = new Map<number, any[]>();
  const rCell = (gx: number, gz: number) => gx * 65536 + gz;
  const allRoads = [];
  for (const road of data.roads || []) {
    if (road[1]) continue;
    const raw = road[2];
    let near = false;
    for (let i = 0; i < raw.length; i += 2) {
      const rx = raw[i] / 10 - cx, rz = raw[i + 1] / 10 - cz;
      if (rx * rx + rz * rz < (QUARTER_RADIUS + 60) * (QUARTER_RADIUS + 60)) { near = true; break; }
    }
    if (!near) continue;
    const pts = [];
    for (let i = 0; i < raw.length; i += 2) pts.push([raw[i] / 10, raw[i + 1] / 10]);
    const entry = { c: road[0], half: roadWidth(road) / 2, pts, box: boxOf(pts) };
    allRoads.push(entry);
    const pad = entry.half + 3;
    for (let gx = Math.floor((entry.box[0] - pad) / ROAD_GRID); gx <= Math.floor((entry.box[2] + pad) / ROAD_GRID); gx++) {
      for (let gz = Math.floor((entry.box[1] - pad) / ROAD_GRID); gz <= Math.floor((entry.box[3] + pad) / ROAD_GRID); gz++) {
        const k = rCell(gx, gz);
        let b = roadBuckets.get(k);
        if (!b) { b = []; roadBuckets.set(k, b); }
        b.push(entry);
      }
    }
  }
  const onRoad = (x, z, pad = 0.3) => {
    const bucket = roadBuckets.get(rCell(Math.floor(x / ROAD_GRID), Math.floor(z / ROAD_GRID)));
    if (!bucket) return false;
    for (let i = 0; i < bucket.length; i++) {
      const road = bucket[i];
      if (road.c <= 4 && inBox(road.box, x, z, road.half + pad) && nearestOnPolyline(road.pts, x, z).d < road.half + pad) return true;
    }
    return false;
  };

  const rings = [], replaced: Record<string, any> = {};
  const ringBuckets = new Map<number, any[]>();
  const bldReachSq = (QUARTER_RADIUS + 30) * (QUARTER_RADIUS + 30);
  (data.bld || []).forEach((rec, bldIdx) => {
    const raw = rec[0];
    let near = false;
    for (let k = 0; k < raw.length; k += 2) {
      const bx = raw[k] / 10 - cx, bz = raw[k + 1] / 10 - cz;
      if (bx * bx + bz * bz < bldReachSq) { near = true; break; }
    }
    if (!near) return;
    const ring = [];
    for (let k = 0; k < raw.length; k += 2) ring.push([raw[k] / 10, raw[k + 1] / 10]);
    const role = Object.keys(REPLACE_MARKS).find((key) => !replaced[key] && inRing(REPLACE_MARKS[key][0], REPLACE_MARKS[key][1], ring));
    if (role) replaced[role] = ring;
    else {
      const entry = { ring, bi: bldIdx, box: boxOf(ring) };
      rings.push(entry);
      for (let gx = Math.floor(entry.box[0] / ROAD_GRID); gx <= Math.floor(entry.box[2] / ROAD_GRID); gx++) {
        for (let gz = Math.floor(entry.box[1] / ROAD_GRID); gz <= Math.floor(entry.box[3] / ROAD_GRID); gz++) {
          const k = rCell(gx, gz);
          let b = ringBuckets.get(k);
          if (!b) { b = []; ringBuckets.set(k, b); }
          b.push(entry);
        }
      }
    }
  });

  const rects = [], polys: { ring: any; box: number[] }[] = [];
  const rectBuckets = new Map<number, any[]>();
  const inRect = (rect, x, z) => {
    const dx = x - rect.c[0], dz = z - rect.c[1];
    if (dx > rect.span || dx < -rect.span || dz > rect.span || dz < -rect.span) return false;
    return Math.abs(dx * rect.t[0] + dz * rect.t[1]) < rect.hw && Math.abs(-dx * rect.t[1] + dz * rect.t[0]) < rect.hd;
  };
  const blocked = (x, z) => {
    if (!inside(x, z)) return true;
    const cellK = rCell(Math.floor(x / ROAD_GRID), Math.floor(z / ROAD_GRID));
    const rb = rectBuckets.get(cellK);
    if (rb) { for (let i = 0; i < rb.length; i++) if (inRect(rb[i], x, z)) return true; }
    for (let i = 0; i < polys.length; i++) if (inBox(polys[i].box, x, z, 0) && inRing(x, z, polys[i].ring)) return true;
    const mb = ringBuckets.get(cellK);
    if (mb) { for (let i = 0; i < mb.length; i++) if (inBox(mb[i].box, x, z, 0) && inRing(x, z, mb[i].ring)) return true; }
    const rds = roadBuckets.get(cellK);
    if (rds) { for (let i = 0; i < rds.length; i++) if (inBox(rds[i].box, x, z, rds[i].half + 0.4) && nearestOnPolyline(rds[i].pts, x, z).d < rds[i].half + 0.4) return true; }
    return streetOf(x, z).d < STREET_SETBACK - 0.1 || nearestOnPolyline(LANE, x, z).d < LANE_HALF - 0.05;
  };

  const makeLot = (origin, tan, fwd, width, depth) => ({ o: origin, t: tan, f: fwd, w: width, d: depth, c: [origin[0] - (fwd[0] * depth) / 2, origin[1] - (fwd[1] * depth) / 2], ang: Math.atan2(tan[1], tan[0]) });
  const lotPt = (lotObj, along, into): [number, number] => [lotObj.o[0] + lotObj.t[0] * along - lotObj.f[0] * into, lotObj.o[1] + lotObj.t[1] * along - lotObj.f[1] * into];
  const lotFits = (lotObj) => {
    const nu = Math.max(4, Math.ceil(lotObj.w - 0.4)), nv = Math.max(2, Math.ceil(lotObj.d - 0.4));
    for (let i = 0; i <= nu; i++) {
      for (let j = 0; j <= nv; j++) {
        const pt = lotPt(lotObj, -lotObj.w / 2 + 0.2 + ((lotObj.w - 0.4) * i) / nu, 0.2 + ((lotObj.d - 0.4) * j) / nv);
        if (blocked(pt[0], pt[1])) return false;
      }
    }
    return true;
  };
  const deepestLot = (lotObj, depths) => { for (const depth of depths) { const cand = makeLot(lotObj.o, lotObj.t, lotObj.f, lotObj.w, depth); if (lotFits(cand)) return cand; } return null; };
  const lotAt = (streetKey, s0, s1, side, setback, depth) => {
    const ptA = lines[streetKey].at(s0, side * setback), ptB = lines[streetKey].at(s1, side * setback);
    const width = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
    const tan = [(ptB[0] - ptA[0]) / width, (ptB[1] - ptA[1]) / width];
    const fwd = side > 0 ? [tan[1], -tan[0]] : [-tan[1], tan[0]];
    return makeLot([(ptA[0] + ptB[0]) / 2, (ptA[1] + ptB[1]) / 2], tan, fwd, width, depth);
  };
  const sigLot = (streetKey, s0, s1, side, setback, depths) => {
    for (let i = 0; i < 6; i++, s0 += 0.5, s1 -= 0.5) {
      const fitted = deepestLot(lotAt(streetKey, s0, s1, side, setback, depths[0]), depths);
      if (fitted) return fitted;
    }
    console.warn('photay: no room on', streetKey, 'at', s0);
    return null;
  };
  const levelSpan = (pts) => {
    let lo = Infinity, hi = -Infinity;
    for (const pt of pts) { const elev = rise(pt[0], pt[1]); lo = Math.min(lo, elev); hi = Math.max(hi, elev); }
    return { lo, hi, gy: LAND_Y + hi };
  };
  const lotCorners = (lotObj) => [lotPt(lotObj, -lotObj.w / 2, 0), lotPt(lotObj, lotObj.w / 2, 0), lotPt(lotObj, lotObj.w / 2, lotObj.d), lotPt(lotObj, -lotObj.w / 2, lotObj.d)];
  const takeLot = (lotObj) => {
    const span = Math.hypot(lotObj.w / 2, lotObj.d / 2);
    const rec = { c: lotObj.c, t: lotObj.t, hw: lotObj.w / 2, hd: lotObj.d / 2, span };
    rects.push(rec);
    for (let gx = Math.floor((lotObj.c[0] - span) / ROAD_GRID); gx <= Math.floor((lotObj.c[0] + span) / ROAD_GRID); gx++) {
      for (let gz = Math.floor((lotObj.c[1] - span) / ROAD_GRID); gz <= Math.floor((lotObj.c[1] + span) / ROAD_GRID); gz++) {
        const k = rCell(gx, gz);
        let b = rectBuckets.get(k);
        if (!b) { b = []; rectBuckets.set(k, b); }
        b.push(rec);
      }
    }
  };

  const buildBody = (lotObj, height, col, { kind = KIND.FACADE, roof = null, key = 0 }: Record<string, any> = {}) => {
    const { lo, gy } = levelSpan(lotCorners(lotObj));
    S.kind = kind; S.base = gy;
    S.box(lotObj.c[0], lotObj.c[1], LAND_Y + lo - 0.15, gy + height, lotObj.w - 0.08, lotObj.d, lotObj.ang, col, { top: roof || pick(ROOFS, key, 44), topKind: KIND.FLAT });
    S.kind = KIND.PLAIN; S.base = 0;
    takeLot(lotObj);
    return gy;
  };
  const buildBlock = (ring, height, col, { kind = KIND.FACADE, roof = ROOFS[0], parapet = 0 }: Record<string, any> = {}) => {
    const { lo, gy } = levelSpan(ring);
    S.kind = kind; S.base = gy;
    S.prism(ring, LAND_Y + lo - 0.15, gy + height, col, roof, { topKind: KIND.FLAT, parapet });
    S.kind = KIND.PLAIN; S.base = 0;
    polys.push({ ring, box: boxOf(ring) });
    return gy;
  };
  const buildTube = (lotObj, key, walls, floors, isFront) => {
    const height = floors * FLOOR_HEIGHT, col = pick(walls, key, 43);
    const floorY = buildBody(lotObj, height, col, { key });
    const ang = lotObj.ang;
    const parapetPt = lotPt(lotObj, 0, 0.1);
    S.box(parapetPt[0], parapetPt[1], floorY + height, floorY + height + 0.75, lotObj.w - 0.08, 0.2, ang, shade(col, 0.95));
    if (isFront) {
      for (let fl = 1; fl < floors; fl++) {
        const y = floorY + fl * FLOOR_HEIGHT, ledgePt = lotPt(lotObj, 0, 0.05);
        S.box(ledgePt[0], ledgePt[1], y - 0.12, y + 0.08, lotObj.w - 0.02, 0.3, ang, shade(col, 0.9));
        if (fl >= 2 && rand(key, 60 + fl) < 0.45) {
          const balcPt = lotPt(lotObj, 0, -0.45), railPt = lotPt(lotObj, 0, -0.91), balcW = Math.min(lotObj.w - 0.9, 3);
          S.box(balcPt[0], balcPt[1], y - 0.1, y + 0.08, balcW, 1.0, ang, shade(col, 0.85));
          S.box(railPt[0], railPt[1], y + 0.08, y + 1.0, balcW, 0.06, ang, PAL.rail);
        }
      }
      const cornicePt = lotPt(lotObj, 0, -0.08);
      S.box(cornicePt[0], cornicePt[1], floorY + height - 0.25, floorY + height, lotObj.w - 0.02, 0.4, ang, shade(col, 0.88));
    }
    if (rand(key, 45) < 0.6 && lotObj.d > 5) {
      const stairPt = lotPt(lotObj, 0, lotObj.d - 1.8);
      S.box(stairPt[0], stairPt[1], floorY + height, floorY + height + 2.7, Math.min(3, lotObj.w - 1), 3, ang, shade(col, 0.92), { top: pick(ROOFS, key, 46) });
    }
    return { gy: floorY, h: height };
  };

  const trees = [];
  const plantTree = (x, z, radius, trunkH, topH, lean = [0, 0]) => {
    trees.push([x, z]);
    later.push(() => {
      const baseG = groundY(x, z), topX = x + lean[0], topZ = z + lean[1];
      S.cyl(x, z, baseG, baseG + trunkH + 0.4, 0.2, 0.14, 6, PAL.trunk);
      S.beam([x, baseG + trunkH * 0.6, z], [topX, baseG + trunkH + 0.4, topZ], 0.18, 0.18, PAL.trunk);
      const seed = Math.round(x * 13 + z * 7);
      for (let j = 0; j < 4; j++) {
        const ang = rand(seed, j) * 6.28, radOff = radius * (0.3 + rand(seed, j + 9) * 0.35), y0 = baseG + trunkH + rand(seed, j + 3) * 0.8;
        const px = topX + Math.cos(ang) * radOff * 0.8, pz = topZ + Math.sin(ang) * radOff * 0.8;
        const crownR = radius * (0.55 + rand(seed, j + 5) * 0.25);
        const col = j % 2 ? PAL.leaf : PAL.leafD;
        S.cyl(px, pz, y0, y0 + (topH - trunkH) * 0.45, crownR * 0.6, crownR, 7, col, { cap: false });
        S.cyl(px, pz, y0 + (topH - trunkH) * 0.45, y0 + (topH - trunkH) * 0.9, crownR, crownR * 0.35, 7, col);
      }
    });
  };

  const facesOf = (ring, gyOf?) => {
    let sx = 0, sz = 0;
    for (const pt of ring) { sx += pt[0]; sz += pt[1]; }
    const center = [sx / ring.length, sz / ring.length], out = [];
    for (let k = 0; k < ring.length; k++) {
      const ptA = ring[k], ptB = ring[(k + 1) % ring.length];
      const len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
      if (len < 3.5) continue;
      const tan = [(ptB[0] - ptA[0]) / len, (ptB[1] - ptA[1]) / len];
      const mid = [(ptA[0] + ptB[0]) / 2, (ptA[1] + ptB[1]) / 2];
      let fwd = [tan[1], -tan[0]];
      if ((mid[0] - center[0]) * fwd[0] + (mid[1] - center[1]) * fwd[1] < 0) fwd = [-fwd[0], -fwd[1]];
      const st = streetOf(mid[0], mid[1]);
      const isStreet = st.d < 12 && st.d > HALF_STREET + 0.3 && Math.abs(dot2(st.t, tan)) > 0.85 && (st.p[0] - mid[0]) * fwd[0] + (st.p[1] - mid[1]) * fwd[1] > 0;
      out.push({ p: ptA, q: ptB, t: tan, f: fwd, o: mid, len, st, street: isStreet, gy: gyOf ? gyOf(ptA, ptB) : 0 });
    }
    return out;
  };

  const keyOf = (pt) => {
    for (const key of STREET_KEYS) if (nearestOnPolyline(STREETS[key], pt[0], pt[1]).d < 1.2) return key;
    if (nearestOnPolyline(LANE, pt[0], pt[1]).d < 0.8) return 'lane';
    return null;
  };

  const ctx: any = {
    S, lights, glowPos, glowCol, later, lines, allRoads, trees, replaced, inside, onRoad, streetOf, blocked, keyOf,
    lotAt, sigLot, deepestLot, lotPt, takeLot, buildBody, buildBlock, buildTube, facesOf, plantTree,
    deferFront: (...args: any[]) => later.push(() => (dressShopfront as any)(ctx, ...args)),
    lotFront: (lotObj, height, floorY, key, opt) => ctx.deferFront(lotObj.o, lotObj.t, lotObj.f, lotObj.w - 0.1, height, floorY, key, { gap: STREET_SETBACK - HALF_STREET - 0.3, ...opt }),
  };

  buildSignatureLandmarks(ctx);
  buildPavedLane(ctx);
  buildCorners(ctx);
  buildTubeHouseRows(ctx, makeLot);
  buildMappedShopfronts(ctx, data, rings);

  // deferred dressing + street furniture (excluded from S.noCover)
  const dressStart = S.n;
  for (const fn of later) fn();
  buildStreetFurnitureAndPavements(ctx);
  (S.noCover = S.noCover || []).push([dressStart, S.n]);

  // night lights
  const addLitMesh = (list, color, boost) => {
    if (!list.length) return;
    const lightBuf = new Buf(list.length * 12);
    for (const [x, z, y0, y1, sx, sz, ang] of list) lightBuf.box(x, z, y0, y1, sx, sz, ang, [1, 1, 1]);
    const mesh = new THREE.Mesh(lightBuf.geometry(), lightMaterial(color, boost));
    mesh.renderOrder = 19;
    mesh.userData.landmark = id;
    group.add(mesh);
  };
  addLitMesh(lights.warm, 0xffb060, 0.5);
  SIGN_GLOW.forEach((col, idx) => addLitMesh(lights.sign[idx], col, 1.15));
  addGlowPointCloud(group, glowPos, glowCol, 2.2, id);
  S.kind = KIND.PLAIN;
  S.base = 0;
}
