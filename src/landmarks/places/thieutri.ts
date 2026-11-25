import { KIND, hex, shade, obb } from '../../geo/buf.ts';
import { LAND_Y, POND_Y, PAL } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { pavilion } from '../citadel.ts';

// Lăng Thiệu Trị (Xương Lăng), the tomb of Emperor Thiệu Trị, built 1847-48 at Cư Chánh, drawn complete.
// Sources and estimates: docs/places/thieutri.md.
export const id = 'thieutri';

const SITE_ORIGIN = [-1740, 5750];
const toScene = (pt): [number, number] => [SITE_ORIGIN[0] + pt[0], SITE_ORIGIN[1] + pt[1]];

const RING = {
  bieuDuc: [[-74.2, 44.1], [-57.7, 25.5], [-40.8, 40.3], [-57.3, 58.9]],
  hongTrach: [[-81.8, 14.7], [-89, 22.8], [-95.2, 17.3], [-88.1, 9.2]],
  phoiA: [[-60.6, 19.6], [-74.5, 7.5], [-66.7, -1.4], [-52.8, 10.8]],
  phoiB: [[-94.7, 29.5], [-80.7, 41.7], [-88.1, 50], [-102.1, 37.8]],
  tongA: [[-35, 27.2], [-24.1, 36.7], [-31.7, 45.3], [-42.6, 35.7]].map(([x, z]) => [x + 2.4, z + 1.2]),
  tongB: [[-51, 69.6], [-57.4, 76.8], [-69.6, 66.1], [-63.2, 59]],
  biDinh: [[-11.4, -106.3], [-4.2, -116.3], [6.6, -108.9], [-0.5, -99.5]],
  ducHinh: [[15.2, -83.3], [24.4, -97.2], [40.4, -87.3], [30.7, -73.9]],
};
const obbOf = (ring) => obb(ring.map(toScene));

const BRIDGES: [[number, number], [number, number], number][] = [
  [[54.5, -67.6], [92.3, -42.6], 3.8],
  [[70.5, -85.9], [106.6, -59.7], 3.2],
  [[47.6, -48.2], [83.8, -25.9], 3.2],
];
const BUU_THANH_CENTER = [139, -12.5];
const BUU_THANH_RADIUS = 260 / (2 * Math.PI);
const BI_DINH_CENTER = [2.7, -113.0];
const COURT_OFFSET_T = -3.6;
const TEMPLE_AXIS_RAD = (42 * Math.PI) / 180;
const TOMB_AXIS_RAD = (33.5 * Math.PI) / 180;

const COL = {
  roof: PAL.imperialRoof, roofOld: hex('#b8913f'), lac: hex('#8e3628'), lacOld: hex('#74402f'),
  stone: PAL.stone, stoneGrey: hex('#9d998f'), stoneDark: hex('#7b776e'), thanh: hex('#6c7377'), marble: hex('#ddd8cc'),
  brick: hex('#6b6152'), brickMoss: hex('#5c6049'), cap: hex('#6a675f'),
  bat: hex('#7f7062'), batDark: hex('#635b51'), slab: hex('#88857c'), slabDark: hex('#6f6c65'),
  roofSide: hex('#93714a'), gateWall: hex('#b89a58'), roofGrey: hex('#6f6a60'),
  bronze: hex('#4d3f2c'), bronzeHi: hex('#8a7040'), door: hex('#2b2422'), statue: hex('#a29d92'),
  enamel: [hex('#2f7d8c'), hex('#3f8f4f'), hex('#e0b23a')], moss: PAL.moss, pine: hex('#3d5734'), earth: hex('#6f6a4b'),
  bare: hex('#857659'), tileOld: hex('#76654f'),
};
const RIDGE = hex('#f1d77a');
const RIDGE_OLD = hex('#a58a52');

// ---------- helpers ----------
const clamp = (val, lo, hi) => Math.max(lo, Math.min(hi, val));
const groundY = (x, z) => LAND_Y + rise(x, z);

function makeFrame(origin, ang) {
  const ux = Math.cos(ang), uz = Math.sin(ang);
  return {
    o: origin, ux, uz, a: ang, av: ang + Math.PI / 2,
    at: (along, across = 0): [number, number] => [origin[0] + ux * along - uz * across, origin[1] + uz * along + ux * across],
    s: (pt) => (pt[0] - origin[0]) * ux + (pt[1] - origin[1]) * uz,
    t: (pt) => -(pt[0] - origin[0]) * uz + (pt[1] - origin[1]) * ux,
  };
}

function groundSpan(frame, along, across, lenAlong, lenAcross) {
  let lo = Infinity, hi = -Infinity;
  const ns = clamp(Math.ceil(lenAlong / 4), 1, 24), nt = clamp(Math.ceil(lenAcross / 4), 1, 24);
  for (let i = 0; i <= ns; i++) {
    for (let j = 0; j <= nt; j++) {
      const pt = frame.at(along - lenAlong / 2 + (lenAlong * i) / ns, across - lenAcross / 2 + (lenAcross * j) / nt);
      const y = groundY(pt[0], pt[1]);
      lo = Math.min(lo, y); hi = Math.max(hi, y);
    }
  }
  return { lo, hi };
}

function buildTerrace(S, frame, along, across, lenAlong, lenAcross, topY, col = COL.stone, topCol = null) {
  const { lo } = groundSpan(frame, along, across, lenAlong, lenAcross);
  const pt = frame.at(along, across);
  S.kind = KIND.MASONRY; S.base = lo - 0.8 - LAND_Y;
  S.box(pt[0], pt[1], lo - 0.8, Math.max(topY, lo - 0.5), lenAlong, lenAcross, frame.a, col, { top: topCol || shade(col, 1.06), topKind: KIND.ROAD });
  return topY;
}

function buildFlight(S, pt0, y0, pt1, y1, width, col = COL.stone, cheeks = true, dragon = false) {
  if (y1 < y0) { [pt0, pt1] = [pt1, pt0]; [y0, y1] = [y1, y0]; }
  const dx = pt1[0] - pt0[0], dz = pt1[1] - pt0[1], len = Math.hypot(dx, dz);
  if (len < 0.3 || y1 - y0 < 0.05) return;
  const ang = Math.atan2(dz, dx), steps = clamp(Math.round((y1 - y0) / 0.17), 1, Math.max(1, Math.floor(len / 0.26)));
  S.kind = KIND.MASONRY;
  for (let k = 0; k < steps; k++) {
    const frac = (k + 0.5) / steps, cx = pt0[0] + dx * frac, cz = pt0[1] + dz * frac;
    const topY = y0 + ((y1 - y0) * (k + 1)) / steps, lo = groundY(cx, cz) - 0.6;
    S.base = lo - LAND_Y;
    S.box(cx, cz, Math.min(lo, topY - 0.3), topY, len / steps + 0.02, width, ang, shade(col, 1.04), { topKind: KIND.ROAD });
  }
  const ux = dx / len, uz = dz / len;
  if (cheeks && !dragon) {
    for (const side of [-1, 1]) {
      const ox = -uz * side * (width / 2 + 0.22), oz = ux * side * (width / 2 + 0.22);
      S.beam([pt0[0] + ox, y0 + 0.3, pt0[1] + oz], [pt1[0] + ox, y1 + 0.3, pt1[1] + oz], 0.44, 0.6, shade(col, 0.9));
    }
  }
  if (dragon) {
    const cheekCol = shade(col, 0.92);
    for (const side of [-1, 1]) {
      const ox = -uz * side * (width / 2 + 0.18), oz = ux * side * (width / 2 + 0.18);
      const footFrac = 0.55 / len, startPt = [pt0[0] + dx * footFrac + ox, pt0[1] + dz * footFrac + oz];
      S.beam([startPt[0], y0 + 0.75, startPt[1]], [pt1[0] + ox, y1 + 0.45, pt1[1] + oz], 0.32, 0.42, cheekCol);
      S.beam([startPt[0], y0 + 0.3, startPt[1]], [pt1[0] + ox, y1 + 0.05, pt1[1] + oz], 0.26, 0.5, shade(cheekCol, 0.94));
      const headPt = [pt0[0] + ox, pt0[1] + oz], baseG = Math.min(y0, groundY(headPt[0], headPt[1]));
      S.base = baseG - 0.4 - LAND_Y;
      S.box(headPt[0], headPt[1], baseG - 0.4, y0 + 0.95, 1.1, 0.4, ang, cheekCol, { taper: 0.8 });
      S.box(headPt[0] - ux * 0.5, headPt[1] - uz * 0.5, y0 + 0.55, y0 + 0.9, 0.35, 0.36, ang, shade(cheekCol, 0.88));
      S.box(pt1[0] + ox, pt1[1] + oz, y1 - 0.3, y1 + 0.85, 0.42, 0.42, ang, cheekCol, { top: shade(cheekCol, 1.05) });
      S.box(pt1[0] + ox, pt1[1] + oz, y1 + 0.85, y1 + 1.05, 0.3, 0.3, ang, shade(cheekCol, 1.05), { taper: 0.6 });
    }
  }
}

function buildBalustrade(S, ptA, ptB, y, col = COL.slab) {
  const len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
  if (len < 0.6) return;
  const ang = Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]), posts = Math.max(1, Math.round(len / 2.1));
  S.kind = KIND.MASONRY; S.base = y - LAND_Y;
  const mid = [(ptA[0] + ptB[0]) / 2, (ptA[1] + ptB[1]) / 2];
  S.box(mid[0], mid[1], y, y + 0.22, len, 0.3, ang, shade(col, 0.9));
  S.box(mid[0], mid[1], y + 0.62, y + 0.74, len, 0.2, ang, shade(col, 1.04));
  for (let k = 0; k <= posts; k++) {
    const frac = k / posts, x = ptA[0] + (ptB[0] - ptA[0]) * frac, z = ptA[1] + (ptB[1] - ptA[1]) * frac;
    S.box(x, z, y, y + 0.86, 0.3, 0.3, ang, col, { top: shade(col, 1.06) });
    S.box(x, z, y + 0.86, y + 1.08, 0.24, 0.24, ang, shade(col, 1.08), { taper: 0.45 });
  }
  for (let k = 0; k < posts; k++) {
    const frac = (k + 0.5) / posts, x = ptA[0] + (ptB[0] - ptA[0]) * frac, z = ptA[1] + (ptB[1] - ptA[1]) * frac;
    S.box(x, z, y + 0.22, y + 0.62, 0.16, 0.16, ang, shade(col, 0.96));
  }
}

function buildWallRun(S, ptA, ptB, height, thick, col = COL.brickMoss, cap = COL.cap, maxSeg = 7) {
  const len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
  if (len < 0.2) return;
  const ang = Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]), segs = Math.ceil(len / maxSeg);
  S.kind = KIND.MASONRY;
  for (let k = 0; k < segs; k++) {
    const segA = [ptA[0] + ((ptB[0] - ptA[0]) * k) / segs, ptA[1] + ((ptB[1] - ptA[1]) * k) / segs];
    const segB = [ptA[0] + ((ptB[0] - ptA[0]) * (k + 1)) / segs, ptA[1] + ((ptB[1] - ptA[1]) * (k + 1)) / segs];
    const samples = [groundY(segA[0], segA[1]), groundY(segB[0], segB[1]), groundY((segA[0] + segB[0]) / 2, (segA[1] + segB[1]) / 2)];
    const lo = Math.min(...samples) - 0.6, hi = Math.max(...samples) + height;
    S.base = lo - LAND_Y;
    const mid = [(segA[0] + segB[0]) / 2, (segA[1] + segB[1]) / 2];
    S.box(mid[0], mid[1], lo, hi, len / segs + thick * 0.5, thick, ang, col, { top: cap });
    S.box(mid[0], mid[1], hi, hi + 0.18, len / segs + thick * 0.5, thick + 0.2, ang, cap);
  }
}

function buildWallLine(S, frame, s0, t0, s1, t1, height, thick, gaps = [], col?) {
  let cursor = 0;
  for (const [g0, g1] of [...gaps, [1, 1]]) {
    if (g0 > cursor) buildWallRun(S, frame.at(s0 + (s1 - s0) * cursor, t0 + (t1 - t0) * cursor), frame.at(s0 + (s1 - s0) * g0, t0 + (t1 - t0) * g0), height, thick, col);
    cursor = g1;
  }
}

function buildArchGate(S, pt, ang, width, depth, height, roof = COL.tileOld) {
  const baseG = groundY(pt[0], pt[1]), plaster = COL.gateWall;
  S.kind = KIND.MASONRY; S.base = baseG - 0.6 - LAND_Y;
  S.box(pt[0], pt[1], baseG - 0.6, baseG + height, width, depth, ang, plaster, { top: COL.cap });
  S.box(pt[0], pt[1], baseG + height - 0.5, baseG + height - 0.3, width + 0.25, depth + 0.25, ang, shade(plaster, 0.88));
  S.box(pt[0], pt[1], baseG + height - 0.3, baseG + height, width + 0.4, depth + 0.4, ang, shade(plaster, 0.8));
  const ux = Math.cos(ang), uz = Math.sin(ang);
  for (const side of [-1, 1]) {
    S.box(pt[0] + ux * side * (width / 2 - 0.35), pt[1] + uz * side * (width / 2 - 0.35), baseG, baseG + height - 0.5, 0.5, depth + 0.16, ang, shade(plaster, 1.07));
  }
  S.kind = KIND.PLAIN;
  const openW = Math.min(1.9, width * 0.42), openH = height * 0.55;
  S.box(pt[0], pt[1], baseG, baseG + openH, openW, depth + 0.1, ang, COL.door);
  for (let k = 0; k < 3; k++) S.box(pt[0], pt[1], baseG + openH + k * openW * 0.12, baseG + openH + (k + 1) * openW * 0.12, openW * (0.92 - k * 0.24), depth + 0.1, ang, COL.door);
  S.box(pt[0], pt[1], baseG + openH + openW * 0.36 + 0.05, baseG + openH + openW * 0.36 + 0.2, openW + 0.5, depth + 0.14, ang, shade(plaster, 0.85));
  S.hip(pt[0], pt[1], width + 0.2, depth + 0.2, ang, baseG + height, 1.5, roof, { flare: 0.35, over: 0.6, fascia: 0.2, ridgeCol: RIDGE_OLD, hips: true, glazed: true });
}

function buildHall(S, ring, { plinth = 0.6, tiers = 1, wallH = 3.2, rh = 2.2, roof = COL.roofOld, wall = COL.lacOld, inset = 1.0, colonnade = true, floor = null }: Record<string, any> = {}) {
  let { c, w, d, a } = obbOf(ring);
  if (w < d) { [w, d] = [d, w]; a += Math.PI / 2; }
  const frame = makeFrame(c, a), sp = groundSpan(frame, 0, 0, w, d), topY = floor ?? sp.hi + plinth;
  buildTerrace(S, frame, 0, 0, w, d, topY);
  return { top: pavilion(S, c[0], c[1], w - inset * 2, d - inset * 2, a, topY, { tiers, wallH, rh, roof, wall, over: 1.1, colonnade, segs: 3, ridge: roof === COL.roofSide ? RIDGE_OLD : RIDGE }), F: frame, w, d, floor: topY };
}

function buildMandarin(S, pt, ang, military = false) {
  const baseG = groundY(pt[0], pt[1]), ux = Math.cos(ang), uz = Math.sin(ang), col = COL.statue;
  S.kind = KIND.MASONRY; S.base = baseG - LAND_Y;
  S.box(pt[0], pt[1], baseG - 0.3, baseG + 0.35, 0.95, 0.8, ang, shade(col, 0.9));
  S.box(pt[0], pt[1], baseG + 0.35, baseG + 1.75, 0.62, 0.5, ang, col, { taper: 0.82 });
  S.box(pt[0] + ux * 0.18, pt[1] + uz * 0.18, baseG + 1.15, baseG + 1.45, 0.25, 0.42, ang, shade(col, 0.94));
  S.box(pt[0], pt[1], baseG + 1.75, baseG + 2.05, 0.3, 0.3, ang, shade(col, 0.97));
  S.box(pt[0], pt[1], baseG + 2.05, baseG + 2.22, military ? 0.42 : 0.34, military ? 0.42 : 0.52, ang, shade(col, 0.85));
}

function buildBeast(S, pt, ang, isElephant) {
  const baseG = groundY(pt[0], pt[1]), ux = Math.cos(ang), uz = Math.sin(ang), vx = -uz, vz = ux, col = COL.statue;
  S.kind = KIND.MASONRY; S.base = baseG - LAND_Y;
  S.box(pt[0], pt[1], baseG - 0.3, baseG + 0.25, isElephant ? 2.9 : 2.2, isElephant ? 1.5 : 0.9, ang, shade(col, 0.9));
  const legOff = isElephant ? [0.85, 0.42] : [0.65, 0.22], legH = isElephant ? 0.95 : 0.85;
  for (const i of [-1, 1]) for (const j of [-1, 1]) {
    S.box(pt[0] + ux * i * legOff[0] + vx * j * legOff[1], pt[1] + uz * i * legOff[0] + vz * j * legOff[1], baseG + 0.25, baseG + 0.25 + legH, isElephant ? 0.42 : 0.2, isElephant ? 0.42 : 0.2, ang, col);
  }
  if (isElephant) {
    S.box(pt[0], pt[1], baseG + 1.2, baseG + 2.3, 2.3, 1.25, ang, col);
    S.box(pt[0] + ux * 1.3, pt[1] + uz * 1.3, baseG + 1.5, baseG + 2.45, 0.7, 1.05, ang, shade(col, 0.96));
    S.beam([pt[0] + ux * 1.65, baseG + 1.7, pt[1] + uz * 1.65], [pt[0] + ux * 1.8, baseG + 0.35, pt[1] + uz * 1.8], 0.28, 0.28, shade(col, 0.94));
    S.box(pt[0], pt[1], baseG + 2.3, baseG + 2.5, 1.2, 1.1, ang, shade(col, 0.88));
  } else {
    S.box(pt[0], pt[1], baseG + 1.1, baseG + 1.65, 1.6, 0.5, ang, col);
    S.beam([pt[0] + ux * 0.7, baseG + 1.5, pt[1] + uz * 0.7], [pt[0] + ux * 1.05, baseG + 2.15, pt[1] + uz * 1.05], 0.32, 0.4, shade(col, 0.95));
    S.box(pt[0] + ux * 1.2, pt[1] + uz * 1.2, baseG + 1.95, baseG + 2.25, 0.5, 0.26, ang, shade(col, 0.95));
    S.box(pt[0], pt[1], baseG + 1.65, baseG + 1.8, 0.6, 0.6, ang, shade(col, 0.86));
  }
}

function buildPine(S, x, z, height = 7, y = null) {
  const baseG = y ?? groundY(x, z);
  S.kind = KIND.PLAIN; S.base = baseG - LAND_Y;
  S.cyl(x, z, baseG - 0.2, baseG + height * 0.3, 0.18, 0.15, 5, hex('#4a3b2e'), { cap: false });
  S.cyl(x, z, baseG + height * 0.22, baseG + height * 0.72, height * 0.22, height * 0.1, 7, COL.pine, { cap: false });
  S.cyl(x, z, baseG + height * 0.55, baseG + height, height * 0.16, 0, 7, shade(COL.pine, 1.08), { cap: false });
}

function buildBridge(S, pt0, pt1, width, col = COL.stone, arch = 0.7) {
  const len = Math.hypot(pt1[0] - pt0[0], pt1[1] - pt0[1]);
  if (len < 1) return;
  const y0 = groundY(pt0[0], pt0[1]) + 0.2, y1 = groundY(pt1[0], pt1[1]) + 0.2, crownY = Math.max(y0, y1) + arch;
  const ptAt = (frac): [number, number] => [pt0[0] + (pt1[0] - pt0[0]) * frac, pt0[1] + (pt1[1] - pt0[1]) * frac];
  const yAt = (frac) => y0 + (y1 - y0) * frac + (crownY - (y0 + y1) / 2) * Math.pow(Math.sin(Math.PI * frac), 0.6);
  const segs = clamp(Math.round(len / 2.5), 4, 16), ux = (pt1[0] - pt0[0]) / len, uz = (pt1[1] - pt0[1]) / len, ang = Math.atan2(uz, ux);
  S.kind = KIND.MASONRY; S.base = 0;
  for (let i = 0; i < segs; i++) {
    const fa = i / segs, fb = (i + 1) / segs, segA = ptAt(fa), segB = ptAt(fb), ya = yAt(fa), yb = yAt(fb);
    S.beam([segA[0], ya - 0.35, segA[1]], [segB[0], yb - 0.35, segB[1]], width, 0.7, col);
    for (const side of [-1, 1]) {
      const ox = -uz * side * (width / 2 - 0.12), oz = ux * side * (width / 2 - 0.12);
      S.beam([segA[0] + ox, ya + 0.32, segA[1] + oz], [segB[0] + ox, yb + 0.32, segB[1] + oz], 0.22, 0.6, shade(col, 0.9));
    }
  }
  const piers = Math.max(1, Math.round(len / 7));
  for (let k = 1; k <= piers; k++) {
    const frac = k / (piers + 1), pt = ptAt(frac);
    S.box(pt[0], pt[1], POND_Y - 1, yAt(frac) - 0.6, 1.0, width * 0.95, ang, shade(col, 0.82));
  }
  for (const frac of [0, 1]) {
    for (const side of [-1, 1]) {
      const pt = ptAt(frac), y = yAt(frac);
      S.box(pt[0] - uz * side * (width / 2 - 0.12), pt[1] + ux * side * (width / 2 - 0.12), y - 0.4, y + 1.1, 0.4, 0.4, ang, shade(col, 0.95));
    }
  }
}

function buildWalk(S, frame, s0, s1, across, width, col = COL.thanh) {
  const segs = Math.max(1, Math.ceil((s1 - s0) / 6));
  S.kind = KIND.ROAD;
  for (let k = 0; k < segs; k++) {
    const sa = s0 + ((s1 - s0) * k) / segs, sb = s0 + ((s1 - s0) * (k + 1)) / segs, mid = (sa + sb) / 2;
    const { lo, hi } = groundSpan(frame, mid, across, sb - sa, width), pt = frame.at(mid, across);
    S.base = lo - LAND_Y;
    S.box(pt[0], pt[1], lo - 0.4, hi + 0.08, sb - sa + 0.05, width, frame.a, col, { topKind: KIND.ROAD });
  }
}

// =====================================================================================================
export function build({ S }) {
  S.paved = S.paved || [];
  buildTempleAxis(S);
  buildTombAxis(S);
  S.kind = KIND.PLAIN;
  S.base = 0;
}

// ---------- Tẩm: the Biểu Đức temple axis ----------
function buildSanTe(S, templeFrame) {
  // front brick screen
  const scrPt = templeFrame.at(-101), scrG = groundY(scrPt[0], scrPt[1]);
  S.kind = KIND.MASONRY; S.base = scrG - 0.6 - LAND_Y;
  S.box(scrPt[0], scrPt[1], scrG - 0.6, scrG + 2.6, 0.8, 9.5, templeFrame.a, COL.brickMoss, { top: COL.cap });
  S.box(scrPt[0], scrPt[1], scrG + 2.6, scrG + 2.85, 1.1, 10.1, templeFrame.a, COL.cap);
  for (const side of [-1, 1]) {
    const pt = templeFrame.at(-101 + side * 0.42);
    S.box(pt[0], pt[1], scrG + 0.5, scrG + 2.2, 0.06, 6.0, templeFrame.a, shade(COL.brickMoss, 0.75));
  }

  const startIdx = S.n;
  const tiers = [[-57, -43], [-43, -24], [-24, -5.5]], totalW = 42, centerW = 14, pathW = 2.4, crossW = 2.2, flankRise = 0.8;
  const flankT0 = centerW / 2, flankT1 = totalW / 2 - pathW;
  let prevTop = null;
  for (let k = 0; k < tiers.length; k++) {
    const [s0, s1] = tiers[k], mid = (s0 + s1) / 2;
    const { hi } = groundSpan(templeFrame, mid, 0, s1 - s0, totalW);
    const topY = Math.max(hi + 0.15, (prevTop ?? -Infinity) + 1.0);
    buildTerrace(S, templeFrame, mid, 0, s1 - s0, totalW, topY, COL.slab, COL.bat);
    const walkPt = templeFrame.at(mid);
    S.kind = KIND.ROAD;
    S.box(walkPt[0], walkPt[1], topY - 0.1, topY + 0.04, s1 - s0, 3.2, templeFrame.a, COL.thanh, { topKind: KIND.ROAD });

    const fa = s0 + crossW + (k === 0 ? 0.8 : 0), fb = s1 - crossW, fm = (fa + fb) / 2;
    for (const side of [-1, 1]) {
      const flankPt = templeFrame.at(fm, (side * (flankT0 + flankT1)) / 2), flankW = flankT1 - flankT0;
      S.kind = KIND.MASONRY; S.base = topY - 0.3 - LAND_Y;
      S.box(flankPt[0], flankPt[1], topY - 0.3, topY + flankRise, fb - fa, flankW, templeFrame.a, COL.slabDark, { top: COL.batDark, topKind: KIND.ROAD });
      S.box(flankPt[0], flankPt[1], topY + flankRise - 0.12, topY + flankRise + 0.02, fb - fa + 0.25, flankW + 0.25, templeFrame.a, COL.slab, { top: COL.batDark, topKind: KIND.ROAD });
      const stepT = side * (flankT1 - 1.1);
      buildFlight(S, templeFrame.at(fa - 1.5, stepT), topY, templeFrame.at(fa, stepT), topY + flankRise, 1.5, COL.slab, false);
      const edgeT = side * (totalW / 2 - 0.2);
      buildBalustrade(S, templeFrame.at(s0 + 0.2, edgeT), templeFrame.at(s1 - 0.2, edgeT), topY);
      if (k > 0) buildBalustrade(S, templeFrame.at(s0 + 0.2, side * (centerW / 2 - 1.0)), templeFrame.at(s0 + 0.2, side * (flankT1 + 0.1)), topY);
      else buildBalustrade(S, templeFrame.at(s0 + 0.2, side * 3.6), templeFrame.at(s0 + 0.2, edgeT), topY);
      if (prevTop != null) buildFlight(S, templeFrame.at(s0 - 2.6, side * (totalW / 2 - pathW / 2 - 0.2)), prevTop, templeFrame.at(s0 + 0.2, side * (totalW / 2 - pathW / 2 - 0.2)), topY, pathW - 0.8, COL.slab, false);
    }
    if (prevTop != null) buildFlight(S, templeFrame.at(s0 - 3.2), prevTop, templeFrame.at(s0 + 0.2), topY, 5, COL.slab, true, true);
    prevTop = topY;
  }
  const frontPt = templeFrame.at(-57);
  buildFlight(S, templeFrame.at(-59.6), groundY(frontPt[0], frontPt[1]), frontPt, groundSpan(templeFrame, -50, 0, 14, totalW).hi + 0.15, 2.4, COL.slab, false);
  buildMarbleGate(S, templeFrame, -58.5);
  S.paved.push([startIdx, S.n]);
  return prevTop;
}

function buildTempleAxis(S) {
  const htm = obbOf(RING.hongTrach), bd = obbOf(RING.bieuDuc);
  const templeFrame = makeFrame(htm.c, TEMPLE_AXIS_RAD);
  const sanTeTop = buildSanTe(S, templeFrame);

  // Hồng Trạch môn
  const startIdx1 = S.n;
  const gateSpan = groundSpan(templeFrame, 0, 0, htm.d + 3, htm.w + 3);
  const gateFloor = Math.max(gateSpan.hi + 0.5, sanTeTop + 0.4);
  {
    let { w, d, a } = htm;
    if (w < d) { [w, d] = [d, w]; a += Math.PI / 2; }
    buildTerrace(S, templeFrame, 0, 0, d + 1.6, w + 1.6, gateFloor);
    buildFlight(S, templeFrame.at(-d / 2 - 3.0), sanTeTop, templeFrame.at(-d / 2 - 0.8), gateFloor, 4.4);
    pavilion(S, htm.c[0], htm.c[1], w - 1, d - 1, a, gateFloor, { tiers: 2, wallH: 3.3, rh: 2.0, roof: COL.roof, wall: COL.lac, over: 1.1, colonnade: true, segs: 3 });
  }

  // enclosure wall and four gates
  const allPts = [RING.bieuDuc, RING.phoiA, RING.phoiB, RING.tongA, RING.tongB].flatMap((ring) => ring.map(toScene));
  let maxS = -Infinity, minT = Infinity, maxT = -Infinity;
  for (const pt of allPts) {
    maxS = Math.max(maxS, templeFrame.s(pt));
    minT = Math.min(minT, templeFrame.t(pt));
    maxT = Math.max(maxT, templeFrame.t(pt));
  }
  maxS += 2.8; minT -= 0.8; maxT += 0.8;
  const wallH = 2.6, wallTh = 0.7, frontW = maxT - minT;
  const gateHalf = (htm.w > htm.d ? htm.w : htm.d) / 2 + 0.6;
  buildWallLine(S, templeFrame, 0, minT, 0, maxT, wallH, wallTh, [[(-gateHalf - minT) / frontW, (gateHalf - minT) / frontW]]);
  buildWallLine(S, templeFrame, maxS, minT, maxS, maxT, wallH, wallTh, [[(-2.2 - minT) / frontW, (2.2 - minT) / frontW]]);
  for (const sideT of [minT, maxT]) buildWallLine(S, templeFrame, 0, sideT, maxS, sideT, wallH, wallTh, [[(maxS / 2 - 2.2) / maxS, (maxS / 2 + 2.2) / maxS]]);
  buildArchGate(S, templeFrame.at(maxS), templeFrame.av, 4.6, 1.4, 3.6);
  for (const sideT of [minT, maxT]) buildArchGate(S, templeFrame.at(maxS / 2, sideT), templeFrame.a, 4.6, 1.2, 3.6);

  // inner court paving
  const bdS = templeFrame.s(bd.c), frontS = bdS - 11.8, startIdx2 = S.n;
  let innerT0 = -Infinity, innerT1 = Infinity;
  for (const pt of RING.phoiA.map(toScene)) innerT0 = Math.max(innerT0, templeFrame.t(pt));
  for (const pt of RING.phoiB.map(toScene)) innerT1 = Math.min(innerT1, templeFrame.t(pt));
  const courtW = innerT1 - innerT0 - 0.3, courtT = (innerT0 + innerT1) / 2, midS = (2 + frontS) / 2;
  const courtTop = Math.max(groundSpan(templeFrame, midS, courtT, frontS - 2, courtW).hi + 0.1, gateFloor - 0.6);
  buildTerrace(S, templeFrame, midS, courtT, frontS - 2, courtW, courtTop, COL.stone, COL.bat);
  const walkPt = templeFrame.at(midS);
  S.kind = KIND.ROAD;
  S.box(walkPt[0], walkPt[1], courtTop - 0.1, courtTop + 0.04, frontS - 2, 3.2, templeFrame.a, COL.thanh, { topKind: KIND.ROAD });
  buildFlight(S, templeFrame.at(htm.d / 2 + 0.2), gateFloor, templeFrame.at(htm.d / 2 + 1.8), courtTop, 4.4);
  S.paved.push([startIdx1, S.n], [startIdx2, S.n]);

  for (const ring of [RING.phoiA, RING.phoiB]) buildHall(S, ring, { plinth: 0.6, wallH: 3.2, rh: 2.2, roof: COL.roofSide });
  for (const ring of [RING.tongA, RING.tongB]) buildHall(S, ring, { plinth: 0.5, wallH: 3.0, rh: 2.0, roof: COL.roofSide });
  buildBieuDuc(S, bd);
}

function buildBieuDuc(S, bd) {
  let { c, w, d, a } = bd;
  if (Math.abs(Math.cos(a) * 0.764 + Math.sin(a) * 0.645) > 0.7) { [w, d] = [d, w]; a += Math.PI / 2; }
  const ax = a - Math.PI / 2;
  const hallFrame = makeFrame(c, Math.cos(ax) * 0.764 + Math.sin(ax) * 0.645 > 0 ? ax : ax + Math.PI);
  const floor = groundSpan(hallFrame, 0, 0, d + 2, w + 2).hi + 1.0;
  buildTerrace(S, hallFrame, 0, 0, d + 2, w + 2, floor);
  buildFlight(S, hallFrame.at(-(d + 2) / 2 - 2.6), floor - 1.2, hallFrame.at(-(d + 2) / 2), floor, 6);
  const frontD = d * 0.4, rearD = d - frontD;
  const frontPt = hallFrame.at(-d / 2 + frontD / 2), rearPt = hallFrame.at(d / 2 - rearD / 2);
  pavilion(S, frontPt[0], frontPt[1], w - 1.6, frontD - 0.6, hallFrame.av, floor, { tiers: 1, wallH: 3.3, rh: 2.2, roof: COL.roof, wall: COL.lac, over: 1.2, colonnade: true, segs: 3 });
  pavilion(S, rearPt[0], rearPt[1], w - 1.6, rearD - 0.8, hallFrame.av, floor, { tiers: 2, wallH: 3.4, rh: 2.3, roof: COL.roof, wall: COL.lac, over: 1.2, colonnade: true, segs: 3 });
}

function buildMarbleGate(S, frame, along) {
  const baseG = groundSpan(frame, along, 0, 2, 12).hi;
  const pillars = [-5.2, -1.9, 1.9, 5.2];
  S.kind = KIND.MASONRY; S.base = baseG - LAND_Y;
  pillars.forEach((t, idx) => {
    const pt = frame.at(along, t), h = idx === 1 || idx === 2 ? 5.6 : 4.6;
    S.box(pt[0], pt[1], baseG - 0.4, baseG + 0.5, 1.2, 1.2, frame.a, COL.stoneGrey);
    S.box(pt[0], pt[1], baseG + 0.5, baseG + h, 0.8, 0.8, frame.a, COL.marble);
    S.box(pt[0], pt[1], baseG + h - 1.2, baseG + h - 0.3, 0.84, 0.84, frame.a, COL.enamel[idx % 2]);
    S.box(pt[0], pt[1], baseG + h, baseG + h + 0.5, 0.6, 0.6, frame.a, COL.enamel[2], { taper: 0.4 });
  });
  for (const [ta, tb, lintelY, isBig] of ([[-5.2, -1.9, 3.5, false], [-1.9, 1.9, 4.3, true], [1.9, 5.2, 3.5, false]] as [number, number, number, boolean][])) {
    const mid = frame.at(along, (ta + tb) / 2), spanW = tb - ta - 0.8;
    S.kind = KIND.MASONRY;
    S.box(mid[0], mid[1], baseG + lintelY, baseG + lintelY + 0.9, 0.5, spanW, frame.a, COL.marble);
    S.box(mid[0], mid[1], baseG + lintelY + 0.15, baseG + lintelY + 0.75, 0.56, spanW * 0.7, frame.a, isBig ? COL.enamel[0] : COL.enamel[1]);
    S.hip(mid[0], mid[1], spanW + 0.4, 0.9, frame.av, baseG + lintelY + 0.9, isBig ? 0.8 : 0.6, COL.roof, { flare: 0.25, over: 0.3, fascia: 0.12, ridgeCol: RIDGE, hips: true, glazed: true });
  }
}

// ---------- Lăng: the tomb axis ----------
function buildBuuThanh(S, tombFrame) {
  const startIdx = S.n;
  const centerS = tombFrame.s(toScene(BUU_THANH_CENTER)), centerPt = tombFrame.at(centerS), gateS = centerS - BUU_THANH_RADIUS;
  buildWalk(S, tombFrame, gateS - 4.1, gateS - 0.2, 0, 26, COL.stoneGrey);

  const wallSegs = 40, wallH = 3.0, wallTh = 1.1;
  const gateHalfAng = 3.4 / BUU_THANH_RADIUS, frontAng = Math.PI;
  const ringPt = (ang) => tombFrame.at(centerS + BUU_THANH_RADIUS * Math.cos(ang), BUU_THANH_RADIUS * Math.sin(ang));
  for (let i = 0; i < wallSegs; i++) {
    const a0 = (i / wallSegs) * Math.PI * 2, a1 = ((i + 1) / wallSegs) * Math.PI * 2;
    const lo = Math.max(a0, frontAng - gateHalfAng), hi = Math.min(a1, frontAng + gateHalfAng);
    if (hi > lo) {
      if (lo > a0) buildWallRun(S, ringPt(a0), ringPt(lo), wallH, wallTh, COL.brick);
      if (a1 > hi) buildWallRun(S, ringPt(hi), ringPt(a1), wallH, wallTh, COL.brick);
    } else {
      buildWallRun(S, ringPt(a0), ringPt(a1), wallH, wallTh, COL.brick);
    }
  }

  const gatePt = tombFrame.at(gateS), gateG = groundY(gatePt[0], gatePt[1]);
  S.kind = KIND.MASONRY; S.base = gateG - LAND_Y;
  for (const side of [-1, 1]) {
    const pt = tombFrame.at(gateS, side * 3.1);
    S.box(pt[0], pt[1], gateG - 0.6, gateG + 4.6, 1.6, 1.4, tombFrame.a, COL.brick, { top: COL.cap });
    S.box(pt[0], pt[1], gateG + 4.6, gateG + 5.1, 1.0, 1.0, tombFrame.a, COL.cap, { taper: 0.5 });
  }
  S.box(gatePt[0], gatePt[1], gateG + 3.4, gateG + 4.3, 1.5, 4.8, tombFrame.a, COL.brick, { top: COL.cap });
  S.hip(gatePt[0], gatePt[1], 6.6, 1.9, tombFrame.av, gateG + 4.3, 0.8, COL.roofOld, { flare: 0.25, over: 0.4, fascia: 0.15, ridgeCol: RIDGE_OLD, hips: true, glazed: true });
  S.kind = KIND.PLAIN;
  for (const side of [-1, 1]) {
    const pt = tombFrame.at(gateS, side * 0.85);
    S.box(pt[0], pt[1], gateG, gateG + 3.3, 0.14, 1.6, tombFrame.a, COL.bronze);
    S.box(pt[0], pt[1], gateG + 1.4, gateG + 1.7, 0.18, 1.5, tombFrame.a, COL.bronzeHi);
  }
  buildFlight(S, tombFrame.at(gateS - 4.4), gateG - 0.4, tombFrame.at(gateS - 1), gateG + 0.1, 5, COL.stoneGrey, false);

  const moundR = BUU_THANH_RADIUS - 1.2, moundH = 2.0;
  const profile = (frac) => (frac <= 0.3 ? 1 : Math.cos(((frac - 0.3) / 0.7) * Math.PI * 0.5));
  const moundPt = (frac, ang) => {
    const x = centerPt[0] + Math.cos(ang) * moundR * frac, z = centerPt[1] + Math.sin(ang) * moundR * frac;
    return [x, groundY(x, z) + moundH * profile(frac) - (frac >= 1 ? 0.6 : 0), z];
  };
  const rings = [0, 0.15, 0.3, 0.5, 0.68, 0.84, 1], sectors = 28;
  S.kind = KIND.GROUND; S.base = 0;
  for (let j = 0; j < sectors; j++) {
    const a0 = (j / sectors) * Math.PI * 2, a1 = ((j + 1) / sectors) * Math.PI * 2, aMid = (a0 + a1) / 2;
    for (let k = 0; k + 1 < rings.length; k++) {
      const hint = [Math.cos(aMid) * rings[k + 1], 1, Math.sin(aMid) * rings[k + 1]];
      if (k === 0) S.tri(moundPt(0, 0), moundPt(rings[1], a0), moundPt(rings[1], a1), COL.bare, hint);
      else S.quad(moundPt(rings[k], a0), moundPt(rings[k], a1), moundPt(rings[k + 1], a1), moundPt(rings[k + 1], a0), COL.bare, hint);
    }
  }
  for (let i = 0; i < 14; i++) {
    const ang = (i / 14) * Math.PI * 2 + 0.3, frac = i % 2 ? 0.55 : 0.75;
    const x = centerPt[0] + Math.cos(ang) * moundR * frac, z = centerPt[1] + Math.sin(ang) * moundR * frac;
    buildPine(S, x, z, 7 + (i % 3) * 1.5, groundY(x, z) + moundH * profile(frac) - 0.15);
  }
  S.paved.push([startIdx, S.n]);
}

function buildTombAxis(S) {
  const bi = obbOf(RING.biDinh), dh = obbOf(RING.ducHinh);
  const distDH = Math.hypot(dh.c[0] - bi.c[0], dh.c[1] - bi.c[1]);
  const tombFrame = makeFrame([dh.c[0] - Math.cos(TOMB_AXIS_RAD) * distDH, dh.c[1] - Math.sin(TOMB_AXIS_RAD) * distDH], TOMB_AXIS_RAD);
  const courtFrame = makeFrame(tombFrame.at(0, COURT_OFFSET_T), TOMB_AXIS_RAD);
  const biCenter = toScene(BI_DINH_CENTER);
  const biFrame = makeFrame(biCenter, Math.atan2(dh.c[1] - biCenter[1], dh.c[0] - biCenter[0]));
  const biPlinthW = 17.5;

  buildBronzeGate(S, courtFrame, -71.5);

  // sân chầu (Bái Đình)
  const courtStart = S.n;
  const footS = courtFrame.s(biFrame.at(-biPlinthW / 2 - 4.6));
  let prevTop = null;
  for (const [s0, s1] of [[-70, -42], [-42, footS + 0.3]]) {
    const mid = (s0 + s1) / 2, topY = Math.max(groundSpan(courtFrame, mid, 0, s1 - s0, 32).hi + 0.15, (prevTop ?? -Infinity) + 0.35);
    buildTerrace(S, courtFrame, mid, 0, s1 - s0, 32, topY, COL.stone, COL.bat);
    const pt = courtFrame.at(mid);
    S.kind = KIND.ROAD;
    S.box(pt[0], pt[1], topY - 0.1, topY + 0.04, s1 - s0, 3.4, courtFrame.a, COL.thanh, { topKind: KIND.ROAD });
    if (prevTop != null) buildFlight(S, courtFrame.at(s0 - 1.2), prevTop, courtFrame.at(s0 + 0.2), topY, 5);
    prevTop = topY;
  }
  S.paved.push([courtStart, S.n]);

  for (const side of [-1, 1]) {
    const face = courtFrame.a + Math.PI / 2 + (side > 0 ? Math.PI : 0);
    buildBeast(S, courtFrame.at(-62, side * 11), courtFrame.a + Math.PI, true);
    buildBeast(S, courtFrame.at(-55, side * 11), courtFrame.a + Math.PI, false);
    for (let k = 0; k < 2; k++) buildMandarin(S, courtFrame.at(-34 + k * 9, side * 11), face, true);
    for (let k = 0; k < 4; k++) buildMandarin(S, courtFrame.at(-38 + k * 6.5, side * 6.5), face, false);
  }

  // Bi Đình & Đức Hinh lâu
  const pavStart = S.n;
  const biTop = groundSpan(biFrame, 0, 0, biPlinthW, biPlinthW).hi + 2.65;
  buildTerrace(S, biFrame, 0, 0, biPlinthW, biPlinthW, biTop, COL.stone);
  S.kind = KIND.MASONRY;
  S.box(biCenter[0], biCenter[1], biTop - 0.35, biTop, biPlinthW + 0.3, biPlinthW + 0.3, biFrame.a, shade(COL.stone, 0.92), { topKind: KIND.ROAD });
  buildFlight(S, biFrame.at(-biPlinthW / 2 - 4.6), prevTop, biFrame.at(-biPlinthW / 2), biTop, 5.2);
  buildFlight(S, biFrame.at(biPlinthW / 2 + 4.4), groundY(...biFrame.at(biPlinthW / 2 + 4.4)), biFrame.at(biPlinthW / 2), biTop, 4);
  const biSide = Math.min(bi.w, bi.d);
  pavilion(S, biCenter[0], biCenter[1], biSide - 0.6, biSide - 0.6, biFrame.av, biTop, { tiers: 2, wallH: 3.4, rh: 2.4, roof: COL.roof, wall: COL.lac, over: 1.3, colonnade: true, segs: 3 });

  const walkStart = biFrame.at(biPlinthW / 2 + 4.4), walkEnd = tombFrame.at(distDH - 12.75 - 1.8);
  const linkFrame = makeFrame(walkStart, Math.atan2(walkEnd[1] - walkStart[1], walkEnd[0] - walkStart[0]));
  buildWalk(S, linkFrame, 0, Math.hypot(walkEnd[0] - walkStart[0], walkEnd[1] - walkStart[1]), 0, 4.5);

  const baseW = 18.5;
  const y1 = buildTerrace(S, tombFrame, distDH, 0, baseW + 7, baseW + 7, groundSpan(tombFrame, distDH, 0, baseW + 7, baseW + 7).hi + 0.3, COL.stoneGrey);
  const y2 = buildTerrace(S, tombFrame, distDH, 0, baseW, baseW, y1 + 1.1, COL.stone, shade(COL.stone, 1.04));
  for (const side of [-1, 1]) {
    const e1 = distDH + (side * (baseW + 7)) / 2, e2 = distDH + (side * baseW) / 2;
    buildFlight(S, tombFrame.at(e1 + side * 1.8), groundY(...tombFrame.at(e1 + side * 1.8)), tombFrame.at(e1), y1, 4.6);
    buildFlight(S, tombFrame.at(e2 + side * 1.6), y1, tombFrame.at(e2), y2, 4.6);
  }
  buildDucHinhLau(S, tombFrame, distDH, y2);
  for (const side of [-1, 1]) buildTruBieu(S, tombFrame.at(distDH, side * 15.5));
  buildWalk(S, tombFrame, distDH + (baseW + 7) / 2 + 1.8, tombFrame.s(toScene(BRIDGES[0][0])) + 0.5, 0, 4.5);
  S.paved.push([pavStart, S.n]);

  BRIDGES.forEach(([ptA, ptB, width], idx) => buildBridge(S, toScene(ptA), toScene(ptB), width, idx ? COL.stone : shade(COL.stone, 1.05)));
  buildBuuThanh(S, tombFrame);
}

function buildBronzeGate(S, frame, along) {
  const baseG = groundSpan(frame, along, 0, 2, 12).hi;
  const pillars = [-5.4, -1.9, 1.9, 5.4];
  S.base = baseG - LAND_Y;
  pillars.forEach((t, idx) => {
    const pt = frame.at(along, t), h = idx === 1 || idx === 2 ? 5.4 : 4.4;
    S.kind = KIND.MASONRY;
    S.box(pt[0], pt[1], baseG - 0.4, baseG + 0.45, 1.1, 1.1, frame.a, COL.stoneGrey);
    S.kind = KIND.PLAIN;
    S.cyl(pt[0], pt[1], baseG + 0.45, baseG + h, 0.3, 0.27, 8, COL.bronze);
    for (const frac of [0.3, 0.55, 0.8]) S.cyl(pt[0], pt[1], baseG + 0.45 + (h - 0.45) * frac, baseG + 0.6 + (h - 0.45) * frac, 0.38, 0.38, 8, COL.bronzeHi, { cap: false });
    S.cyl(pt[0], pt[1], baseG + h, baseG + h + 0.7, 0.42, 0.05, 8, COL.bronzeHi);
  });
  for (const [ta, tb, lintelY] of ([[-5.4, -1.9, 3.3], [-1.9, 1.9, 4.2], [1.9, 5.4, 3.3]] as [number, number, number][])) {
    const mid = frame.at(along, (ta + tb) / 2), spanW = tb - ta - 0.5;
    S.kind = KIND.PLAIN;
    S.box(mid[0], mid[1], baseG + lintelY, baseG + lintelY + 0.22, 0.24, spanW, frame.a, COL.bronze);
    S.box(mid[0], mid[1], baseG + lintelY + 0.62, baseG + lintelY + 0.84, 0.24, spanW, frame.a, COL.bronze);
    S.box(mid[0], mid[1], baseG + lintelY + 0.22, baseG + lintelY + 0.62, 0.12, spanW * 0.8, frame.a, COL.bronzeHi);
    S.hip(mid[0], mid[1], spanW + 0.3, 0.6, frame.av, baseG + lintelY + 0.84, 0.45, COL.bronze, { flare: 0.2, over: 0.2, ridgeCol: COL.bronzeHi, hips: true });
  }
}

function buildDucHinhLau(S, frame, along, y) {
  const center = frame.at(along), lowW = 15, coreW = 10.2, lowH = 4.0, topW = 10.6, topH = 3.6, ang = frame.a;
  const ptAt = (u, v) => frame.at(along + u, v);
  const eave = { flare: 0.5, fascia: 0.3, fasciaCol: shade(COL.lac, 0.75), hips: true, glazed: true, segs: 3 };
  S.base = y - LAND_Y;
  S.kind = KIND.TIMBER;
  S.box(center[0], center[1], y, y + lowH - 0.2, coreW, coreW, ang, COL.lac, { top: shade(COL.roof, 0.8) });
  S.kind = KIND.PLAIN;
  for (const [u, v, doorAng] of ([[-coreW / 2 - 0.04, 0, ang], [coreW / 2 + 0.04, 0, ang], [0, -coreW / 2 - 0.04, ang + Math.PI / 2], [0, coreW / 2 + 0.04, ang + Math.PI / 2]] as [number, number, number][])) {
    const pt = ptAt(u, v);
    S.box(pt[0], pt[1], y, y + 3.1, 0.08, 3.2, doorAng, shade(COL.lac, 0.55));
    S.box(pt[0], pt[1], y + 3.1, y + 3.35, 0.12, 3.7, doorAng, shade(COL.lac, 0.75));
  }
  S.box(center[0], center[1], y + lowH - 0.2, y + lowH, lowW, lowW, ang, shade(COL.lac, 0.5), { top: shade(COL.roof, 0.8), bottom: true });

  const colR = 0.24, posts = [];
  for (let i = 0; i <= 5; i++) {
    for (const side of [-1, 1]) {
      posts.push([-lowW / 2 + i * 3, (side * lowW) / 2]);
      if (i > 0 && i < 5) posts.push([(side * lowW) / 2, -lowW / 2 + i * 3]);
    }
  }
  for (const [u, v] of posts) {
    const pt = ptAt(u, v);
    S.cyl(pt[0], pt[1], y, y + 0.28, colR * 1.8, colR * 1.55, 6, shade(COL.stone, 0.92), { cap: false, rot: ang });
    S.cyl(pt[0], pt[1], y + 0.28, y + lowH - 0.2, colR, colR * 0.92, 6, shade(COL.lac, 0.92), { cap: false, rot: ang });
  }
  const corners = [ptAt(-lowW / 2, -lowW / 2), ptAt(lowW / 2, -lowW / 2), ptAt(lowW / 2, lowW / 2), ptAt(-lowW / 2, lowW / 2)];
  for (let i = 0; i < 4; i++) {
    const ptA = corners[i], ptB = corners[(i + 1) % 4];
    S.beam([ptA[0], y + lowH - 0.55, ptA[1]], [ptB[0], y + lowH - 0.55, ptB[1]], colR * 1.3, 0.34, shade(COL.lac, 0.7));
  }
  S.kind = KIND.TIMBER;
  S.hip(center[0], center[1], lowW, lowW, frame.av, y + lowH, 2.6, COL.roof, { ...eave, over: 1.3 });

  const upperTopY = y + lowH + topH;
  S.box(center[0], center[1], y + lowH - 0.2, upperTopY, topW, topW, ang, COL.lac, { top: shade(COL.roof, 0.8) });
  S.kind = KIND.PLAIN;
  for (const [u, v, winAng, winLen] of ([[-topW / 2 - 0.04, 0, ang, topW - 1.2], [topW / 2 + 0.04, 0, ang, topW - 1.2], [0, -topW / 2 - 0.04, ang + Math.PI / 2, topW - 1.2], [0, topW / 2 + 0.04, ang + Math.PI / 2, topW - 1.2]] as [number, number, number, number][])) {
    const pt = ptAt(u, v);
    S.box(pt[0], pt[1], y + lowH + 1.5, y + lowH + 2.9, 0.08, winLen, winAng, shade(COL.lac, 0.5));
    S.box(pt[0], pt[1], y + lowH + 2.9, y + lowH + 3.1, 0.12, topW - 0.4, winAng, shade(COL.lac, 0.72));
  }
  const boardPt = ptAt(-topW / 2 - 0.1, 0);
  S.box(boardPt[0], boardPt[1], upperTopY - 1.25, upperTopY - 0.4, 0.12, 2.6, ang, COL.enamel[0]);
  S.box(boardPt[0], boardPt[1], upperTopY - 1.13, upperTopY - 0.52, 0.14, 2.2, ang, COL.enamel[2]);

  S.kind = KIND.TIMBER;
  S.hip(center[0], center[1], topW, topW, frame.av, upperTopY, 2.8, COL.roof, { ...eave, over: 1.2, ridgeCol: RIDGE });
  S.kind = KIND.PLAIN;
  S.cyl(center[0], center[1], upperTopY + 2.65, upperTopY + 3.15, 0.32, 0.18, 8, RIDGE);
  S.cyl(center[0], center[1], upperTopY + 3.15, upperTopY + 3.55, 0.24, 0.04, 8, RIDGE);
}

function buildTruBieu(S, pt) {
  const baseG = groundY(pt[0], pt[1]);
  S.kind = KIND.MASONRY; S.base = baseG - LAND_Y;
  S.box(pt[0], pt[1], baseG - 0.6, baseG + 1.2, 1.9, 1.9, 0.6, COL.brick, { top: COL.cap });
  S.box(pt[0], pt[1], baseG + 1.2, baseG + 6.6, 1.15, 1.15, 0.6, shade(COL.brick, 1.05), { taper: 0.72 });
  S.box(pt[0], pt[1], baseG + 6.6, baseG + 7.1, 1.15, 1.15, 0.6, COL.cap);
  S.box(pt[0], pt[1], baseG + 7.1, baseG + 7.9, 0.6, 0.6, 0.6, shade(COL.brick, 1.05), { taper: 0.2 });
}
