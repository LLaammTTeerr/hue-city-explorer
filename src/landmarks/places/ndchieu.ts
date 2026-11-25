import { KIND, Buf, hex, shade, inRing, unflat } from '../../geo/buf.ts';
import { rise } from '../../geo/terrain.ts';
import { glowPoints, lightMaterial } from '../../geo/materials.ts';
import { LAND_Y, PAL } from '../../config.ts';

// Phố đi bộ Nguyễn Đình Chiểu — the riverside walking street on the south bank of the Hương, running upstream from
// the foot of cầu Trường Tiền to the head of the ironwood boardwalk, with the park strip between it and Lê Lợi.
// docs/places/ndchieu.md has the sources.
export const id = 'ndchieu';

const BANK_START: [number, number] = [104.4, 128.2];
const BANK_END: [number, number] = [-59.6, 274.3];
const BANK_LEN = Math.hypot(BANK_END[0] - BANK_START[0], BANK_END[1] - BANK_START[1]);
const AXIS_UP: [number, number] = [(BANK_END[0] - BANK_START[0]) / BANK_LEN, (BANK_END[1] - BANK_START[1]) / BANK_LEN];
const AXIS_INLAND: [number, number] = [AXIS_UP[1], -AXIS_UP[0]];
const WALK_ANGLE = Math.atan2(AXIS_UP[1], AXIS_UP[0]);

const EDGE_INSET = 0.55;
const WALK_START = 0;
const WALK_END = BANK_LEN + 2.5;
const DPT_END_S = 66;
const PAVE_Y = 0.1;
const ROUND_W = { center: [-62.15, 294.55] as [number, number], radius: 8.45 };
const ROUND_E = { center: [56.45, 237.7] as [number, number], radius: 6.5 };
const SPURS: [number, number][][] = [[[23.5, 204.5], [52.2, 232.7]], [[60.5, 242.8], [74.6, 257.8]]];
const WEST_PATH: [number, number][] = [[-67.8, 300.9], [-154.4, 394.3], [-161.1, 401.5]];
const CANNONS: [number, number][] = [[14.9, 301.3], [32.2, 285.6]];
const CAFE_RANGE: [number, number] = [138, 168];

const BRIDGE_BANK: [number, number] = [125.3, 100.8];
const BRIDGE_SEG_LEN = Math.hypot(BRIDGE_BANK[0] - BANK_START[0], BRIDGE_BANK[1] - BANK_START[1]);
const BRIDGE_DIR: [number, number] = [(BRIDGE_BANK[0] - BANK_START[0]) / BRIDGE_SEG_LEN, (BRIDGE_BANK[1] - BANK_START[1]) / BRIDGE_SEG_LEN];
const BRIDGE_INLAND: [number, number] = [-BRIDGE_DIR[1], BRIDGE_DIR[0]];
const TT_AXIS: [number, number] = [0.7311, 0.6823];
const TT_KEEP = 6.6;
const APRON_LEN = (() => {
  const offset = (pt: [number, number]) => -TT_AXIS[1] * pt[0] + TT_AXIS[0] * pt[1];
  return ((offset(BANK_START) - TT_KEEP) / (offset(BANK_START) - offset(BRIDGE_BANK))) * BRIDGE_SEG_LEN;
})();
const DPT_GARDEN: [number, number][] = [[63.5, 180.9], [84.1, 162.3], [113.4, 135.7], [154.6, 180.6], [104.7, 225.8]];

const COLORS = {
  pave: hex('#cdc2b0'),
  band: hex('#a89e8f'),
  kerb: hex('#cdc6b8'),
  granite: hex('#a9a39a'),
  graniteTop: hex('#c4bfb5'),
  balus: hex('#bdb9af'),
  pole: hex('#8c9196'),
  disc: hex('#e9e6dc'),
  trunk: hex('#7d6e5d'),
  frond: hex('#577a3e'),
  path: hex('#c2b5a2'),
  lawn: hex(PAL.green.park),
  bed: hex('#5f7d45'),
  flower: hex('#c8564a'),
  wood: hex('#8a5a34'),
  bronze: hex('#5d4a35'),
  plinth: hex('#d2ccc0'),
  canopy: hex('#ece5d3'),
  counter: hex('#9a6b45'),
  cannon: hex('#3a3a36'),
  brick: hex('#8e4a34'),
  brickTop: hex('#a35a40'),
  terrace: hex('#c9bba6'),
  joint: hex('#a69c8d'),
  steel: hex('#c9ccce'),
  crownshaft: hex('#6f7d4a'),
  dead: hex('#8a7550'),
};

const walkPt = (along: number, inland: number): [number, number] => [
  BANK_START[0] + AXIS_UP[0] * along + AXIS_INLAND[0] * inland,
  BANK_START[1] + AXIS_UP[1] * along + AXIS_INLAND[1] * inland,
];
const apronPt = (along: number, inland: number): [number, number] => [
  BANK_START[0] + BRIDGE_DIR[0] * along + BRIDGE_INLAND[0] * inland,
  BANK_START[1] + BRIDGE_DIR[1] * along + BRIDGE_INLAND[1] * inland,
];
const inlandEdge = (along: number) => (along < DPT_END_S ? 12.0 : 13.8);
const groundY = (x: number, z: number) => LAND_Y + rise(x, z);

function apronCorner(inlandVal: number): [number, number] {
  const bankPt = apronPt(APRON_LEN, EDGE_INSET);
  const projRate = TT_AXIS[0] * AXIS_INLAND[0] + TT_AXIS[1] * AXIS_INLAND[1];
  const bankInland = (bankPt[0] - BANK_START[0]) * AXIS_INLAND[0] + (bankPt[1] - BANK_START[1]) * AXIS_INLAND[1];
  const dist = (inlandVal - bankInland) / projRate;
  return [bankPt[0] + TT_AXIS[0] * dist, bankPt[1] + TT_AXIS[1] * dist];
}

// generic riverside lamps stay off the walk: it has its own (places/index.js lightAreas)
export function lightAreas() {
  const vMax = 15.5;
  const walkArea = [walkPt(WALK_END + 12, -2), walkPt(-1, -2), apronPt(APRON_LEN + 1, -2), apronCorner(vMax), walkPt(-1, vMax), walkPt(WALK_END + 12, vMax)];
  const westAreas = WEST_PATH.slice(1).map((p1, idx) => {
    const p0 = WEST_PATH[idx];
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const ux = (p1[0] - p0[0]) / len;
    const uz = (p1[1] - p0[1]) / len;
    const half = 4;
    return [
      [p0[0] - ux * half - uz * half, p0[1] - uz * half + ux * half],
      [p1[0] + ux * half - uz * half, p1[1] + uz * half + ux * half],
      [p1[0] + ux * half + uz * half, p1[1] + uz * half - ux * half],
      [p0[0] - ux * half + uz * half, p0[1] - uz * half - ux * half],
    ];
  });
  const roundR = ROUND_W.radius + 4;
  const roundArea = Array.from({ length: 12 }, (_, k) => [
    ROUND_W.center[0] + Math.cos((k * Math.PI) / 6) * roundR,
    ROUND_W.center[1] + Math.sin((k * Math.PI) / 6) * roundR,
  ]);
  return [walkArea, roundArea, ...westAreas];
}

function distToSeg(pt: [number, number], p0: [number, number], p1: [number, number]) {
  const dx = p1[0] - p0[0];
  const dz = p1[1] - p0[1];
  const lenSq = dx * dx + dz * dz;
  const frac = lenSq > 0 ? Math.max(0, Math.min(1, ((pt[0] - p0[0]) * dx + (pt[1] - p0[1]) * dz) / lenSq)) : 0;
  return Math.hypot(pt[0] - p0[0] - dx * frac, pt[1] - p0[1] - dz * frac);
}

function createArcLookup(pts: [number, number][]) {
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return {
    total: acc[acc.length - 1],
    at(dist: number) {
      let idx = 1;
      while (idx < pts.length - 1 && acc[idx] < dist) idx++;
      const p0 = pts[idx - 1];
      const p1 = pts[idx];
      const frac = (dist - acc[idx - 1]) / (acc[idx] - acc[idx - 1] || 1);
      return {
        pt: [p0[0] + (p1[0] - p0[0]) * frac, p0[1] + (p1[1] - p0[1]) * frac] as [number, number],
        angle: Math.atan2(p1[1] - p0[1], p1[0] - p0[0]),
      };
    },
  };
}

function drawQuadSV(S, s0: number, s1: number, v0: number, v1: number, yOffset: number, col: number[]) {
  const corners = [walkPt(s0, v0), walkPt(s1, v0), walkPt(s1, v1), walkPt(s0, v1)].map((pt) => [pt[0], groundY(pt[0], pt[1]) + yOffset, pt[1]]);
  S.quad(corners[0], corners[3], corners[2], corners[1], col, [0, 1, 0]);
}

function drawPath(S, pts: [number, number][], width: number, yOffset: number) {
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const mid: [number, number] = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
    const gy = groundY(mid[0], mid[1]);
    S.box(mid[0], mid[1], gy - 0.2, gy + yOffset, len, width, Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), COLORS.path);
    if (i < pts.length - 1) {
      const jointY = groundY(p1[0], p1[1]);
      S.cyl(p1[0], p1[1], jointY - 0.2, jointY + yOffset, width / 2, width / 2, 10, COLORS.path);
    }
  }
}

function drawRoundel(S, roundelSpec: { center: [number, number]; radius: number }, width: number, yOffset: number) {
  const [cx, cz] = roundelSpec.center;
  const r0 = roundelSpec.radius - width / 2;
  const r1 = roundelSpec.radius + width / 2;
  const segs = 28;
  const topY = groundY(cx, cz) + yOffset;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const ringPt = (ang: number, rad: number): [number, number, number] => [cx + Math.cos(ang) * rad, topY, cz + Math.sin(ang) * rad];
    S.quad(ringPt(a0, r0), ringPt(a1, r0), ringPt(a1, r1), ringPt(a0, r1), COLORS.pave, [0, 1, 0]);
    S.quad(ringPt(a0, r1), ringPt(a1, r1), [cx + Math.cos(a1) * r1, topY - 0.25, cz + Math.sin(a1) * r1], [cx + Math.cos(a0) * r1, topY - 0.25, cz + Math.sin(a0) * r1], COLORS.kerb, [Math.cos(a0), 0, Math.sin(a0)]);
  }
}

function drawLampPost(S, x: number, z: number, y: number, addLamp: (x: number, y: number, z: number, col?: number[]) => void) {
  const prevKind = S.kind;
  S.kind = KIND.PLAIN;
  S.cyl(x, z, y, y + 0.6, 0.14, 0.12, 8, COLORS.pole);
  S.cyl(x, z, y + 0.6, y + 5.7, 0.085, 0.06, 8, COLORS.pole, { cap: false });
  S.cyl(x, z, y + 5.5, y + 5.68, 0.14, 0.62, 14, COLORS.disc);
  S.cyl(x, z, y + 5.68, y + 5.8, 0.62, 0.55, 14, COLORS.pole);
  S.cyl(x, z, y + 5.8, y + 5.9, 0.5, 0.2, 14, COLORS.disc);
  addLamp(x, y + 5.55, z, [1, 0.92, 0.78]);
  S.kind = prevKind;
}

function drawTallPole(S, x: number, z: number, y: number, angle: number, addLamp: (x: number, y: number, z: number, col?: number[]) => void) {
  const prevKind = S.kind;
  S.kind = KIND.PLAIN;
  S.cyl(x, z, y, y + 0.5, 0.2, 0.18, 8, COLORS.steel);
  S.cyl(x, z, y + 0.5, y + 12.5, 0.15, 0.09, 8, COLORS.steel, { cap: false });
  S.cyl(x, z, y + 12.5, y + 12.7, 0.12, 0.04, 8, COLORS.steel);
  const nx = -Math.sin(angle);
  const nz = Math.cos(angle);
  for (let k = 0; k < 12; k++) {
    const bracketY = y + 4 + k * 0.72;
    const side = k % 2 ? 1 : -1;
    const ux = Math.cos(angle) * side;
    const uz = Math.sin(angle) * side;
    S.beam([x, bracketY, z], [x + ux * 0.32 + nx * 0.05, bracketY + 0.08, z + uz * 0.32 + nz * 0.05], 0.05, 0.05, COLORS.pole);
    if (k % 2 === 0) addLamp(x + ux * 0.34, bracketY + 0.05, z + uz * 0.34, [0.9, 0.95, 1]);
  }
  S.kind = prevKind;
}

function drawPalm(S, x: number, z: number, y: number, height: number, seed: number) {
  const prevKind = S.kind;
  S.kind = KIND.TIMBER;
  const leanAng = seed * 2.4;
  const leanX = Math.cos(leanAng) * 0.35;
  const leanZ = Math.sin(leanAng) * 0.35;
  const ringCount = 6;
  for (let i = 0; i < ringCount; i++) {
    const t0 = i / ringCount;
    const t1 = (i + 1) / ringCount;
    S.cyl(x + leanX * t0 * t0, z + leanZ * t0 * t0, y + height * 0.9 * t0, y + height * 0.9 * t1, 0.34 - 0.1 * t0, 0.34 - 0.1 * t1, 7, shade(COLORS.trunk, i % 2 ? 0.92 : 1.05), { cap: false });
  }
  S.kind = KIND.PLAIN;
  const crownTop: [number, number, number] = [x + leanX, y + height, z + leanZ];
  S.cyl(crownTop[0], crownTop[2], y + height * 0.9, crownTop[1], 0.25, 0.2, 7, COLORS.crownshaft);
  const frondCount = 18;
  const tierLifts = [0.9, 0.45, 0.0];
  for (let i = 0; i < frondCount; i++) {
    const ang = (i / frondCount) * Math.PI * 2 + seed * 0.7;
    const dx = Math.cos(ang);
    const dz = Math.sin(ang);
    const tier = i % 3;
    const lift = tierLifts[tier];
    const frondLen = 3.1 + (tier === 1 ? 0.3 : 0);
    const p1 = [crownTop[0] + dx * frondLen * 0.35, crownTop[1] + lift + 0.25, crownTop[2] + dz * frondLen * 0.35];
    const p2 = [crownTop[0] + dx * frondLen * 0.7, crownTop[1] + lift * 0.6 - 0.35, crownTop[2] + dz * frondLen * 0.7];
    const p3 = [crownTop[0] + dx * frondLen, crownTop[1] - 0.6 - (2 - tier) * 0.35, crownTop[2] + dz * frondLen];
    S.beam(crownTop, p1, 0.75, 0.04, COLORS.frond);
    S.beam(p1, p2, 0.85, 0.04, shade(COLORS.frond, 0.94));
    S.beam(p2, p3, 0.5, 0.03, shade(COLORS.frond, 0.86));
  }
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2 + seed;
    const dx = Math.cos(ang);
    const dz = Math.sin(ang);
    S.beam([crownTop[0] + dx * 0.2, crownTop[1] - 0.2, crownTop[2] + dz * 0.2], [crownTop[0] + dx * 0.7, crownTop[1] - 2.2, crownTop[2] + dz * 0.7], 0.45, 0.03, COLORS.dead);
  }
  S.kind = prevKind;
}

function drawBalustrade(S, p0: [number, number], p1: [number, number]) {
  const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
  const ux = (p1[0] - p0[0]) / len;
  const uz = (p1[1] - p0[1]) / len;
  const angle = Math.atan2(uz, ux);
  const atDist = (dist: number): [number, number] => [p0[0] + ux * dist, p0[1] + uz * dist];
  for (let dist = 0; dist < len - 1e-6; dist += 6) {
    const endDist = Math.min(len, dist + 6);
    const mid = atDist((dist + endDist) / 2);
    const gy = groundY(mid[0], mid[1]);
    S.box(mid[0], mid[1], gy - 0.3, gy + 0.22, endDist - dist - 0.02, EDGE_INSET, angle, COLORS.granite, { top: COLORS.graniteTop });
  }
  const spanCount = Math.max(1, Math.round(len / 3));
  const step = len / spanCount;
  for (let k = 0; k <= spanCount; k++) {
    const [x, z] = atDist(k * step);
    const gy = groundY(x, z);
    S.box(x, z, gy + 0.22, gy + 1.02, 0.42, 0.42, angle, COLORS.balus, { top: COLORS.graniteTop });
    S.box(x, z, gy + 1.02, gy + 1.1, 0.5, 0.5, angle, COLORS.graniteTop);
    if (k === spanCount) break;
    const mid = atDist((k + 0.5) * step);
    const midY = groundY(mid[0], mid[1]);
    S.box(mid[0], mid[1], midY + 0.84, midY + 0.94, step - 0.42, 0.34, angle, COLORS.balus, { top: COLORS.graniteTop });
    for (let balOff = 0.45; balOff < step - 0.4; balOff += 0.32) {
      const [bx, bz] = atDist(k * step + balOff);
      const by = groundY(bx, bz);
      S.cyl(bx, bz, by + 0.22, by + 0.5, 0.05, 0.085, 6, COLORS.balus, { cap: false });
      S.cyl(bx, bz, by + 0.5, by + 0.84, 0.085, 0.045, 6, COLORS.balus, { cap: false });
    }
  }
}

function drawBench(S, x: number, z: number, y: number, angle: number) {
  const prevKind = S.kind;
  S.kind = KIND.PLAIN;
  const ux = Math.cos(angle);
  const uz = Math.sin(angle);
  const nx = -uz;
  const nz = ux;
  for (const offset of [-0.7, 0.7]) S.box(x + ux * offset, z + uz * offset, y, y + 0.42, 0.14, 0.5, angle, COLORS.granite);
  S.box(x, z, y + 0.42, y + 0.48, 1.8, 0.5, angle, COLORS.wood);
  S.box(x - nx * 0.24, z - nz * 0.24, y + 0.5, y + 0.85, 1.8, 0.06, angle, COLORS.wood);
  S.kind = prevKind;
}

function drawParasol(S, x: number, z: number, y: number, angle: number, addLamp: (x: number, y: number, z: number, col?: number[]) => void) {
  const prevKind = S.kind;
  S.kind = KIND.PLAIN;
  S.cyl(x, z, y, y + 2.75, 0.05, 0.05, 6, COLORS.wood);
  S.hip(x, z, 3.2, 3.2, angle, y + 2.3, 0.6, COLORS.canopy, { over: 0 });
  const ox = Math.cos(angle) * 0.9;
  const oz = Math.sin(angle) * 0.9;
  S.cyl(x + ox, z + oz, y, y + 0.7, 0.04, 0.04, 6, COLORS.pole, { cap: false });
  S.cyl(x + ox, z + oz, y + 0.7, y + 0.74, 0.35, 0.35, 10, shade(COLORS.counter, 1.1));
  addLamp(x, y + 2.1, z, [1, 0.78, 0.5]);
  S.kind = prevKind;
}

function drawFigure(S, x: number, z: number, y: number, scale: number) {
  const height = 1.7 * scale;
  S.cyl(x, z, y, y + height * 0.5, 0.3 * scale, 0.22 * scale, 8, COLORS.bronze);
  S.cyl(x, z, y + height * 0.5, y + height * 0.82, 0.2 * scale, 0.26 * scale, 8, COLORS.bronze);
  S.cyl(x, z, y + height * 0.84, y + height, 0.13 * scale, 0.1 * scale, 8, COLORS.bronze);
}

function drawCannon(S, x: number, z: number, y: number, angle: number) {
  const prevKind = S.kind;
  S.kind = KIND.MASONRY;
  S.box(x, z, y, y + 0.4, 3.0, 1.2, angle, COLORS.plinth);
  S.kind = KIND.PLAIN;
  S.box(x, z, y + 0.4, y + 0.75, 1.6, 0.7, angle, shade(COLORS.cannon, 1.2));
  const ux = Math.cos(angle);
  const uz = Math.sin(angle);
  S.beam([x - ux * 1.3, y + 0.95, z - uz * 1.3], [x + ux * 1.4, y + 1.0, z + uz * 1.4], 0.42, 0.42, COLORS.cannon);
  S.kind = prevKind;
}

function buildPavingAndBalustrade(S) {
  S.kind = KIND.GROUND;
  const fillLawn = (sStart: number, sEnd: number, vStart: number, vEnd: number) => {
    for (let s0 = sStart; s0 < sEnd - 1e-6; s0 += 10) {
      for (let v0 = vStart; v0 < vEnd - 1e-6; v0 += 10) {
        drawQuadSV(S, s0, Math.min(sEnd, s0 + 10), v0, Math.min(vEnd, v0 + 10), 0.03, COLORS.lawn);
      }
    }
  };
  fillLawn(WALK_START, DPT_END_S, inlandEdge(0), 15);
  fillLawn(DPT_END_S, WALK_END + 14, inlandEdge(WALK_END), 73);

  const pavedStart = S.n;
  S.kind = KIND.ROAD;
  for (let s0 = WALK_START; s0 < WALK_END - 1e-6; s0 += 6) {
    const sEnd = Math.min(WALK_END, s0 + 6, s0 < DPT_END_S && s0 + 6 > DPT_END_S ? DPT_END_S : Infinity);
    const bandEnd = Math.min(sEnd, s0 + 0.3);
    const vMax = inlandEdge(s0);
    drawQuadSV(S, s0, bandEnd, EDGE_INSET, vMax, PAVE_Y + 0.004, COLORS.band);
    if (sEnd > bandEnd) drawQuadSV(S, bandEnd, sEnd, EDGE_INSET, vMax, PAVE_Y, COLORS.pave);
    for (let vPos = EDGE_INSET + 1.2; vPos < vMax - 0.3; vPos += 1.2) drawQuadSV(S, bandEnd, sEnd, vPos - 0.03, vPos + 0.03, PAVE_Y + 0.003, COLORS.joint);
    for (let sPos = bandEnd + 1.2; sPos < sEnd - 0.3; sPos += 1.2) drawQuadSV(S, sPos - 0.03, sPos + 0.03, EDGE_INSET, vMax, PAVE_Y + 0.003, COLORS.joint);
    if (sEnd < s0 + 6) s0 = sEnd - 6;
  }

  // bridge-end apron
  const cornerA = walkPt(WALK_START, EDGE_INSET);
  const cornerB = apronPt(APRON_LEN, EDGE_INSET);
  const cornerC = apronCorner(inlandEdge(0));
  const cornerD = walkPt(WALK_START, inlandEdge(0));
  const apronVerts = [cornerA, cornerB, cornerC, cornerD].map((pt) => [pt[0], groundY(pt[0], pt[1]) + PAVE_Y, pt[1]]);
  S.quad(apronVerts[0], apronVerts[1], apronVerts[2], apronVerts[3], COLORS.pave, [0, 1, 0]);
  if (Math.hypot(cornerC[0] - cornerB[0], cornerC[1] - cornerB[1]) > 0) {
    const ux = BRIDGE_DIR[0] * 0.03;
    const uz = BRIDGE_DIR[1] * 0.03;
    for (let dist = 1.2; dist < APRON_LEN - 0.3; dist += 1.2) {
      const p0 = apronPt(dist, EDGE_INSET);
      const p1 = [p0[0] + (cornerD[0] - cornerA[0]), p0[1] + (cornerD[1] - cornerA[1])];
      const jointVerts = [[p0[0] - ux, p0[1] - uz], [p0[0] + ux, p0[1] + uz], [p1[0] + ux, p1[1] + uz], [p1[0] - ux, p1[1] - uz]].map((pt) => [pt[0], groundY(pt[0], pt[1]) + PAVE_Y + 0.003, pt[1]]);
      S.quad(jointVerts[0], jointVerts[1], jointVerts[2], jointVerts[3], COLORS.joint, [0, 1, 0]);
    }
  }

  // inland kerb, bank balustrade, stepped quay, roundels and park paths
  S.kind = KIND.MASONRY;
  for (const [sStart, sEnd] of [[WALK_START, DPT_END_S], [DPT_END_S, WALK_END]] as [number, number][]) {
    for (let s0 = sStart; s0 < sEnd - 1e-6; s0 += 12) {
      const segEnd = Math.min(sEnd, s0 + 12);
      const mid = walkPt((s0 + segEnd) / 2, inlandEdge(s0) + 0.15);
      const gy = groundY(mid[0], mid[1]);
      S.box(mid[0], mid[1], gy, gy + PAVE_Y + 0.09, segEnd - s0, 0.3, WALK_ANGLE, COLORS.kerb);
    }
  }
  const stepA = walkPt(DPT_END_S, inlandEdge(0));
  const stepB = walkPt(DPT_END_S, inlandEdge(WALK_END));
  const stepMid = [(stepA[0] + stepB[0]) / 2, (stepA[1] + stepB[1]) / 2];
  const stepY = groundY(stepMid[0], stepMid[1]);
  S.box(stepMid[0], stepMid[1], stepY, stepY + PAVE_Y + 0.09, 0.3, inlandEdge(WALK_END) - inlandEdge(0) + 0.3, WALK_ANGLE, COLORS.kerb);

  drawBalustrade(S, apronPt(APRON_LEN, EDGE_INSET / 2), apronPt(0, EDGE_INSET / 2));
  drawBalustrade(S, walkPt(0, EDGE_INSET / 2), walkPt(BANK_LEN, EDGE_INSET / 2));
  for (let k = 1; k <= 3; k++) {
    const pt = apronPt(APRON_LEN / 2, -0.45 * k + 0.2);
    const gy = groundY(pt[0], pt[1]);
    S.box(pt[0], pt[1], gy - 0.3 - 0.5 * k - 0.4, gy - 0.3 - 0.5 * (k - 1), APRON_LEN, 0.45, Math.atan2(BRIDGE_DIR[1], BRIDGE_DIR[0]), COLORS.granite, { top: COLORS.graniteTop });
  }

  S.kind = KIND.ROAD;
  const linkStart = walkPt(WALK_END - 4, EDGE_INSET + 4);
  const linkEnd = ROUND_W.center;
  const linkLen = Math.hypot(linkEnd[0] - linkStart[0], linkEnd[1] - linkStart[1]);
  const linkMid = [(linkStart[0] + linkEnd[0]) / 2, (linkStart[1] + linkEnd[1]) / 2];
  const linkY = groundY(linkMid[0], linkMid[1]);
  S.box(linkMid[0], linkMid[1], linkY - 0.2, linkY + PAVE_Y, linkLen, 6, Math.atan2(linkEnd[1] - linkStart[1], linkEnd[0] - linkStart[0]), COLORS.pave);

  drawRoundel(S, ROUND_W, 2.6, PAVE_Y + 0.01);
  for (const spur of SPURS) drawPath(S, spur, 3, PAVE_Y - 0.02);
  drawRoundel(S, ROUND_E, 2.2, PAVE_Y - 0.01);
  drawPath(S, WEST_PATH, 3, PAVE_Y - 0.02);
  (S.paved = S.paved || []).push([pavedStart, S.n]);
}

function buildStreetFurnitureAndPark(S, data, nearBld: (x: number, z: number, margin: number) => boolean, addLamp: (x: number, y: number, z: number, col?: number[]) => void) {
  for (const roundelSpec of [ROUND_W, ROUND_E]) {
    const innerR = roundelSpec.radius - (roundelSpec === ROUND_W ? 2.6 : 2.2) / 2 - 0.15;
    const [cx, cz] = roundelSpec.center;
    const gy = groundY(cx, cz);
    S.kind = KIND.MASONRY;
    S.cyl(cx, cz, gy, gy + 0.32, innerR, innerR, 20, COLORS.kerb);
    S.kind = KIND.GROUND;
    S.cyl(cx, cz, gy + 0.32, gy + 0.38, innerR - 0.15, innerR - 0.25, 20, COLORS.bed);
    for (let k = 0; k < 10; k++) {
      const ang = (k / 10) * Math.PI * 2;
      const flowerR = innerR * 0.62;
      S.cyl(cx + Math.cos(ang) * flowerR, cz + Math.sin(ang) * flowerR, gy + 0.38, gy + 0.7, 0.45, 0.2, 6, COLORS.flower);
    }
  }
  S.kind = KIND.PLAIN;
  drawFigure(S, ROUND_E.center[0], ROUND_E.center[1], groundY(ROUND_E.center[0], ROUND_E.center[1]) + 0.38, 1.1);

  for (let along = WALK_START + 6, idx = 0; along < WALK_END - 2; along += 18, idx++) {
    const [x, z] = walkPt(along, EDGE_INSET + 1.0);
    drawLampPost(S, x, z, groundY(x, z) + PAVE_Y, addLamp);
    if (idx % 3 === 1) {
      const [tx, tz] = walkPt(along + 2.2, EDGE_INSET + 1.0);
      drawTallPole(S, tx, tz, groundY(tx, tz) + PAVE_Y, WALK_ANGLE, addLamp);
    }
    if (along + 9 < WALK_END - 2) {
      const [bx, bz] = walkPt(along + 9, EDGE_INSET + 1.4);
      drawBench(S, bx, bz, groundY(bx, bz) + PAVE_Y, WALK_ANGLE + Math.PI);
    }
    const innerS = along + 9;
    if (innerS < WALK_END - 3) {
      const [ix, iz] = walkPt(innerS, inlandEdge(innerS) - 0.9);
      drawLampPost(S, ix, iz, groundY(ix, iz) + PAVE_Y, addLamp);
    }
  }
  for (let along = WALK_START + 2.5, idx = 0; along < WALK_END - 3; along += 9, idx++) {
    const [x, z] = walkPt(along, EDGE_INSET + 2.6);
    const baseY = groundY(x, z) + PAVE_Y;
    S.kind = KIND.MASONRY;
    S.box(x, z, baseY - 0.05, baseY + 0.12, 1.5, 1.5, WALK_ANGLE, COLORS.kerb);
    S.kind = KIND.GROUND;
    S.box(x, z, baseY + 0.12, baseY + 0.14, 1.26, 1.26, WALK_ANGLE, COLORS.lawn);
    drawPalm(S, x, z, baseY + 0.12, 11.5 + ((idx * 7) % 5) * 0.7, idx);
  }
  for (let k = 0; k < 4; k++) {
    const ang = WALK_ANGLE + Math.PI / 4 + (k * Math.PI) / 2;
    const rad = ROUND_W.radius + 0.7;
    const x = ROUND_W.center[0] + Math.cos(ang) * rad;
    const z = ROUND_W.center[1] + Math.sin(ang) * rad;
    drawLampPost(S, x, z, groundY(x, z), addLamp);
  }
  const westLookup = createArcLookup(WEST_PATH);
  for (let dist = 10; dist < westLookup.total - 4; dist += 20) {
    const { pt, angle } = westLookup.at(dist);
    const lx = pt[0] - Math.sin(angle) * 2.1;
    const lz = pt[1] + Math.cos(angle) * 2.1;
    drawLampPost(S, lx, lz, groundY(lx, lz), addLamp);
    const benchSample = westLookup.at(Math.min(westLookup.total - 2, dist + 10));
    const bx = benchSample.pt[0] + Math.sin(benchSample.angle) * 2.0;
    const bz = benchSample.pt[1] - Math.cos(benchSample.angle) * 2.0;
    drawBench(S, bx, bz, groundY(bx, bz), benchSample.angle);
  }

  // café terrace and parasols
  const [cafeStart, cafeEnd] = CAFE_RANGE;
  const cafeV0 = inlandEdge(cafeStart) + 0.3;
  const cafeV1 = 20.5;
  S.kind = KIND.ROAD;
  const terraceStart = S.n;
  drawQuadSV(S, cafeStart, cafeEnd, cafeV0, cafeV1, 0.06, COLORS.terrace);
  (S.paved = S.paved || []).push([terraceStart, S.n]);
  S.kind = KIND.MASONRY;
  const drawEdgeWall = (p0: [number, number], p1: [number, number]) => {
    const mid = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
    const gy = groundY(mid[0], mid[1]);
    S.box(mid[0], mid[1], gy - 0.1, gy + 0.45, Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), 0.3, Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), COLORS.brick, { top: COLORS.brickTop });
  };
  drawEdgeWall(walkPt(cafeStart, cafeV1), walkPt(cafeEnd, cafeV1));
  drawEdgeWall(walkPt(cafeStart, cafeV0 + 1.5), walkPt(cafeStart, cafeV1));
  drawEdgeWall(walkPt(cafeEnd, cafeV0 + 1.5), walkPt(cafeEnd, cafeV1));
  S.kind = KIND.PLAIN;
  const parasolSpots: [number, number][] = [
    [144.5, 12.9], [156.5, 12.9], [141, 16.4], [146, 17.8], [152, 16.6], [157, 18.2], [162.5, 16.6], [149.5, 19.4], [165, 19.2],
  ];
  for (const [along, inland] of parasolSpots) {
    const [x, z] = walkPt(along, inland);
    if (!nearBld(x, z, 2)) drawParasol(S, x, z, groundY(x, z) + (inland > inlandEdge(along) ? 0.06 : PAVE_Y), WALK_ANGLE + along, addLamp);
  }

  for (const along of [92, 216]) {
    const [x, z] = walkPt(along, inlandEdge(along) + 3.5);
    const gy = groundY(x, z);
    S.kind = KIND.MASONRY;
    S.box(x, z, gy, gy + 1.1, 1.3, 1.3, WALK_ANGLE, COLORS.plinth);
    S.kind = KIND.PLAIN;
    drawFigure(S, x, z, gy + 1.1, along > 150 ? 1.2 : 1.0);
  }
  for (const [x, z] of CANNONS) drawCannon(S, x, z, groundY(x, z), WALK_ANGLE + Math.PI / 2);

  // shade trees in data.trees
  if (Array.isArray(data.trees)) {
    const trees = data.trees;
    const origLen = trees.length;
    for (let i = 0; i < origLen; i += 4) {
      const dx = trees[i] / 10 - BANK_START[0];
      const dz = trees[i + 1] / 10 - BANK_START[1];
      const along = dx * AXIS_UP[0] + dz * AXIS_UP[1];
      const inland = dx * AXIS_INLAND[0] + dz * AXIS_INLAND[1];
      if (along < -24 || along > WALK_END + 4 || inland < -3 || inland > 30) continue;
      if (inland < inlandEdge(along) + 1 || (along > CAFE_RANGE[0] - 1 && along < CAFE_RANGE[1] + 1 && inland < 21.5)) trees[i + 2] = 0;
      else if (trees[i + 3] === 0 || trees[i + 3] === 1) trees[i + 3] = 4;
    }
    const roads = (data.roads || []).filter((road) => !road[1]).map((road) => unflat(road[2]));
    const onRoad = (x: number, z: number) => roads.some((poly) => poly.some((pt, idx) => idx > 0 && distToSeg([x, z], poly[idx - 1], pt) < 3.2));
    for (let along = 7, idx = 0; along < WALK_END - 2; along += 12, idx++) {
      const [x, z] = walkPt(along, inlandEdge(along) - 1.6);
      if (!nearBld(x, z, 6.5) && !onRoad(x, z)) trees.push(Math.round(x * 10), Math.round(z * 10), 17 + (idx % 3) * 2, 5);
    }
    let parkIdx = 0;
    for (let along = 70; along < WALK_END + 10; along += 14) {
      for (let inland = 22; inland < 70; inland += 13) {
        const hashVal = Math.sin(along * 12.9898 + inland * 78.233) * 43758.5453;
        const frac = hashVal - Math.floor(hashVal);
        const [x, z] = walkPt(along + (frac - 0.5) * 8, inland + (frac - 0.5) * 6);
        if (inRing(x, z, DPT_GARDEN) || nearBld(x, z, 6.5) || onRoad(x, z)) continue;
        if (Math.hypot(x - ROUND_E.center[0], z - ROUND_E.center[1]) < ROUND_E.radius + 3) continue;
        trees.push(Math.round(x * 10), Math.round(z * 10), 11 + (parkIdx % 4), parkIdx % 3 === 0 ? 2 : 4);
        parkIdx++;
      }
    }
  }
}

export function build({ data, S, group, THREE }) {
  const lampPos: number[] = [];
  const lampCol: number[] = [];
  const addLamp = (x: number, y: number, z: number, col = [1, 0.84, 0.6]) => {
    lampPos.push(x, y, z);
    lampCol.push(...col);
  };
  S.kind = KIND.PLAIN;
  S.base = 0;

  const nearbyBlds: [number, number][][] = [];
  for (const bld of data.bld || []) {
    const ring = unflat(Array.isArray(bld[0]) ? bld[0] : bld);
    if (ring.length && Math.hypot(ring[0][0] - 20, ring[0][1] - 260) < 220) nearbyBlds.push(ring);
  }
  const nearBld = (x: number, z: number, margin: number) =>
    nearbyBlds.some((ring) => inRing(x, z, ring) || ring.some((pt, idx) => distToSeg([x, z], ring[(idx || ring.length) - 1], pt) < margin));

  buildPavingAndBalustrade(S);
  buildStreetFurnitureAndPark(S, data, nearBld, addLamp);

  const glow = glowPoints(lampPos, lampCol, 4);
  glow.userData.glow = true;
  glow.userData.landmark = id;
  group.add(glow);

  const ledBuf = new Buf(256);
  for (let along = 0; along < BANK_LEN - 1e-6; along += 12) {
    const segEnd = Math.min(BANK_LEN, along + 12);
    const p0 = walkPt(along, -0.02);
    const p1 = walkPt(segEnd, -0.02);
    const y0 = groundY(p0[0], p0[1]) + 0.3;
    const y1 = groundY(p1[0], p1[1]) + 0.3;
    ledBuf.quad([p0[0], y0 - 0.06, p0[1]], [p1[0], y1 - 0.06, p1[1]], [p1[0], y1 + 0.06, p1[1]], [p0[0], y0 + 0.06, p0[1]], [1, 1, 1], [-AXIS_INLAND[0], 0, -AXIS_INLAND[1]]);
  }
  const ledMat = lightMaterial(0x66ccff, 1.5);
  const ledMesh = new THREE.Mesh(ledBuf.geometry(), ledMat);
  ledMesh.renderOrder = 19;
  ledMesh.userData.landmark = id;
  group.add(ledMesh);
  S.kind = KIND.PLAIN;

  return {
    update(time: number) {
      ledMat.uniforms.uColor.value.setHSL((time * 0.02) % 1, 0.75, 0.6);
    },
  };
}
