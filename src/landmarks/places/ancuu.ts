import { KIND, Buf, hex, shade, inRing } from '../../geo/buf.ts';
import { LAND_Y } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { lightMaterial } from '../../geo/materials.ts';

// Chợ An Cựu, 89 Hùng Vương (Phú Nhuận), on the south bank a block north of sông An Cựu. See docs/places/ancuu.md.
export const id = 'ancuu';

const ORIGIN: [number, number] = [1230.4, 1246.2];
const AXIS_U: [number, number] = [0.976, -0.218];
const AXIS_V: [number, number] = [0.218, 0.976];
const FRAME_ANGLE = Math.atan2(AXIS_U[1], AXIS_U[0]);
const WHITE_RGB = [1, 1, 1];

const RING: [number, number][] = [
  [1230.4, 1246.2], [1279.2, 1235.3], [1285.4, 1239.1], [1289.6, 1244.1],
  [1284.0, 1292.7], [1253.3, 1287.5], [1238.2, 1272.7],
];
const CORNER_C: [number, number] = [1250.6, 1287.05];
const LOT: [number, number][] = [RING[0], RING[1], RING[2], RING[3], RING[4], CORNER_C, RING[6]];
const LOT_MID: [number, number] = [0.5 * (RING[0][0] + RING[4][0]), 0.5 * (RING[0][1] + RING[4][1])];

const COLORS = {
  white: hex('#ebe8df'),
  slab: hex('#dcd9d0'),
  conc: hex('#b9b6ad'),
  lattice: hex('#8c9090'),
  blueWall: hex('#8b9fd9'),
  blueDark: hex('#6d84c4'),
  ceil: hex('#d6d3cb'),
  fascia: hex('#a9a69d'),
  cream: hex('#e6dfcc'),
  dark: hex('#2c2825'),
  shutter: hex('#8d8f8c'),
  glass: hex('#5a6870'),
  glassTop: hex('#9fb0b6'),
  sheet: hex('#d3d0c6'),
  sheetDark: hex('#c3c0b6'),
  louvre: hex('#4a4e50'),
  roofLight: hex('#c9c8c2'),
  pave: hex('#a8a49b'),
  post: hex('#5b6062'),
  awningBlue: hex('#3f63a3'),
  awningWhite: hex('#dfe1e4'),
  red: hex('#c3161c'),
  gold: hex('#e3c047'),
  wood: hex('#7a5a3e'),
  board: hex('#b4362b'),
  acUnit: hex('#d9dadb'),
  bannerWhite: hex('#f2f2ee'),
  bannerBlue: hex('#2f5fa8'),
  muralBg: hex('#a9bce8'),
  muralLight: hex('#e9ecf2'),
  muralDark: hex('#6f7fb8'),
  hoardFrame: hex('#d8d8d4'),
  hoardText: hex('#f1ede2'),
  lampHousing: hex('#cfd3d6'),
};
const CANVAS_COLS = ['#c8352b', '#2f6db0', '#e0a526', '#3f8f4f', '#e8e2d2', '#d0612b'].map(hex);
const TARP_COLS = ['#2f8f86', '#4f9a45', '#3a7fa8', '#7d6aa8'].map(hex);

// perimeter block dimensions
const PERIM_DEPTH = 7.0;
const GROUND_TOP = 4.0;
const FLOOR1_TOP = 4.6;
const UPPER_TOP = 9.4;
const ROOF_TOP = 10.2;
const ROOF_OVER = 1.4;
const CHAMFER_DIST = 3.5;
const NORTH_BLUE_LEN = 11.5;
const SE_BLUE_LEN = 12.0;
const SE_SETBACK = 1.4;
const PASSAGE_A = 12.0;
const PASSAGE_B = 16.0;
const SIGN_S0 = 3.6;
const SIGN_S1 = 15.1;
const SIGN_DEPTH = 2.0;

let lotBaseY = LAND_Y;

const toWorld = (uPos: number, vPos: number): [number, number] => [
  ORIGIN[0] + AXIS_U[0] * uPos + AXIS_V[0] * vPos,
  ORIGIN[1] + AXIS_U[1] * uPos + AXIS_V[1] * vPos,
];

function boxUV(S, u0: number, u1: number, v0: number, v1: number, yRel0: number, yRel1: number, col: number[], opt?) {
  const pt = toWorld((u0 + u1) / 2, (v0 + v1) / 2);
  S.box(pt[0], pt[1], lotBaseY + yRel0, lotBaseY + yRel1, u1 - u0, v1 - v0, FRAME_ANGLE, col, opt);
}

function inwardFrame(p0: [number, number], p1: [number, number]) {
  const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
  const tang: [number, number] = [(p1[0] - p0[0]) / len, (p1[1] - p0[1]) / len];
  const mid = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
  let normal: [number, number] = [-tang[1], tang[0]];
  if ((LOT_MID[0] - mid[0]) * normal[0] + (LOT_MID[1] - mid[1]) * normal[1] < 0) normal = [-normal[0], -normal[1]];
  return { len, tang, normal };
}

interface FrontStrip {
  len: number;
  tang: [number, number];
  normal: [number, number];
  at: (along: number, inward: number) => [number, number];
  angle: number;
  box: (S, s0: number, s1: number, d0: number, d1: number, y0: number, y1: number, col: number[], opt?) => void;
}

function createStrip(p0: [number, number], p1: [number, number]): FrontStrip {
  const { len, tang, normal } = inwardFrame(p0, p1);
  const at = (along: number, inward: number): [number, number] => [p0[0] + tang[0] * along + normal[0] * inward, p0[1] + tang[1] * along + normal[1] * inward];
  const angle = Math.atan2(tang[1], tang[0]);
  return {
    len,
    tang,
    normal,
    at,
    angle,
    box(S, s0, s1, d0, d1, y0, y1, col, opt?) {
      const pt = at((s0 + s1) / 2, (d0 + d1) / 2);
      S.box(pt[0], pt[1], lotBaseY + y0, lotBaseY + y1, s1 - s0, d1 - d0, angle, col, opt);
    },
  };
}

function offsetPolyline(pts: [number, number][], dist: number | number[]): [number, number][] {
  const normals = pts.slice(1).map((p1, idx) => inwardFrame(pts[idx], p1).normal);
  return pts.map((pt, idx) => {
    const nA = normals[Math.max(0, idx - 1)];
    const nB = normals[Math.min(normals.length - 1, idx)];
    const scale = (Array.isArray(dist) ? dist[idx] : dist) / (1 + nA[0] * nB[0] + nA[1] * nB[1]);
    return [pt[0] + (nA[0] + nB[0]) * scale, pt[1] + (nA[1] + nB[1]) * scale];
  });
}

function buildBandQuads(pts: [number, number][], d0: number | number[], d1: number | number[]): [number, number][][] {
  const outer = offsetPolyline(pts, d0);
  const inner = offsetPolyline(pts, d1);
  return outer.slice(1).map((pt, idx) => [outer[idx], pt, inner[idx + 1], inner[idx]]);
}

function drawCeiling(S, quad: [number, number][], y: number, col = COLORS.ceil) {
  for (let i = 1; i + 1 < quad.length; i++) {
    const vertStart = S.n;
    S.tri([quad[0][0], y, quad[0][1]], [quad[i][0], y, quad[i][1]], [quad[i + 1][0], y, quad[i + 1][1]], col, [0, -1, 0]);
    if (S.n > vertStart) {
      for (let k = 0; k < 3; k++) {
        const idx = (vertStart + k) * 3;
        S.nrm[idx] = 0;
        S.nrm[idx + 1] = 127;
        S.nrm[idx + 2] = 0;
      }
    }
  }
}

function drawLiftedQuads(S, quads: [number, number][][], y0: number, y1: number, wallCol: number[], topCol: number[]) {
  for (const quad of quads) {
    S.prism(quad, lotBaseY + y0, lotBaseY + y1, wallCol, topCol);
    if (y0 > 1) drawCeiling(S, quad, lotBaseY + y0);
  }
}

function drawSheet(S, st: FrontStrip, s0: number, s1: number, d0: number, y0: number, d1: number, y1: number, col: number[], underCol: number[] | null = null) {
  const pA = st.at(s0, d0), pB = st.at(s1, d0), pC = st.at(s1, d1), pD = st.at(s0, d1);
  const vA = [pA[0], lotBaseY + y0, pA[1]], vB = [pB[0], lotBaseY + y0, pB[1]], vC = [pC[0], lotBaseY + y1, pC[1]], vD = [pD[0], lotBaseY + y1, pD[1]];
  S.quad(vA, vB, vC, vD, col, [0, 1, 0]);
  S.quad(vA, vB, vC, vD, underCol || shade(col, 0.9), [0, -1, 0]);
}

function drawHexahedron(S, bot: [number, number, number][], top: [number, number, number][], col: number[]) {
  const center = [0, 0, 0];
  for (const pt of [...bot, ...top]) {
    center[0] += pt[0] / 8;
    center[1] += pt[1] / 8;
    center[2] += pt[2] / 8;
  }
  const outNormal = (facePts: [number, number, number][]) => {
    const mid = [0, 0, 0];
    for (const pt of facePts) {
      mid[0] += pt[0] / facePts.length;
      mid[1] += pt[1] / facePts.length;
      mid[2] += pt[2] / facePts.length;
    }
    return [mid[0] - center[0], mid[1] - center[1], mid[2] - center[2]];
  };
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    const sideFace: [number, number, number][] = [bot[i], bot[j], top[j], top[i]];
    S.quad(...sideFace, col, outNormal(sideFace));
  }
  S.quad(top[0], top[1], top[2], top[3], col, outNormal(top));
  S.quad(bot[0], bot[1], bot[2], bot[3], col, outNormal(bot));
}

function drawShedBand(S, pts: [number, number][], d0: number, d1: number, eaveH: number, ridgeRise: number, wallCol: number[], roofCol: number[]) {
  S.kind = KIND.PLAIN;
  for (const quad of buildBandQuads(pts, d0 + 0.3, d1 - 0.3)) S.prism(quad, lotBaseY + 0.12, lotBaseY + eaveH, wallCol, wallCol);
  const outer = offsetPolyline(pts, d0);
  const inner = offsetPolyline(pts, d1);
  const ridge = offsetPolyline(pts, (d0 + d1) / 2);
  const pt3 = (pt: [number, number], yRel: number): [number, number, number] => [pt[0], lotBaseY + yRel, pt[1]];
  S.kind = KIND.FLAT;
  for (let i = 0; i + 1 < pts.length; i++) {
    S.quad(pt3(outer[i], eaveH), pt3(outer[i + 1], eaveH), pt3(ridge[i + 1], eaveH + ridgeRise), pt3(ridge[i], eaveH + ridgeRise), roofCol, [0, 1, 0]);
    S.quad(pt3(ridge[i], eaveH + ridgeRise), pt3(ridge[i + 1], eaveH + ridgeRise), pt3(inner[i + 1], eaveH), pt3(inner[i], eaveH), shade(roofCol, 0.94), [0, 1, 0]);
    drawCeiling(S, [outer[i], outer[i + 1], inner[i + 1], inner[i]], lotBaseY + eaveH - 0.02, COLORS.sheetDark);
  }
  S.kind = KIND.PLAIN;
  for (const endIdx of [0, pts.length - 1]) {
    const outDir = endIdx ? [pts[endIdx][0] - pts[endIdx - 1][0], pts[endIdx][1] - pts[endIdx - 1][1]] : [pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]];
    S.tri(pt3(outer[endIdx], eaveH), pt3(ridge[endIdx], eaveH + ridgeRise), pt3(inner[endIdx], eaveH), wallCol, [outDir[0], 0, outDir[1]]);
  }
}

function drawPyramidRoof(S, quad: [number, number][], eaveH: number, riseH: number, col: number[]) {
  const center = [0, 0];
  for (const pt of quad) { center[0] += pt[0] / 4; center[1] += pt[1] / 4; }
  S.kind = KIND.FLAT;
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    S.tri([quad[i][0], lotBaseY + eaveH, quad[i][1]], [quad[j][0], lotBaseY + eaveH, quad[j][1]], [center[0], lotBaseY + eaveH + riseH, center[1]], i % 2 ? shade(col, 0.95) : col, [0, 1, 0]);
  }
  drawCeiling(S, quad, lotBaseY + eaveH - 0.02, COLORS.sheetDark);
  S.kind = KIND.PLAIN;
}

function drawShops(S, st: FrontStrip, s0: number, s1: number, seed: number, isJewel = false) {
  S.kind = KIND.PLAIN;
  const count = Math.max(1, Math.round((s1 - s0) / 3.3));
  const bayW = (s1 - s0) / count;
  for (let i = 0; i < count; i++) {
    const a0 = s0 + i * bayW + 0.2;
    const a1 = s0 + (i + 1) * bayW - 0.2;
    const isOpen = (i * 7 + seed) % 4 !== 0;
    st.box(S, a0, a1, -0.04, 0.02, 0.1, 2.9, isOpen ? COLORS.dark : COLORS.shutter);
    const signCol = (i + seed) % 3 === 0 ? COLORS.board : COLORS.gold;
    st.box(S, a0, a1, -0.3, -0.04, 3.2, 3.95, signCol, { top: COLORS.white });
    st.box(S, a0 + 0.1, a1 - 0.1, -0.33, -0.3, 3.35, 3.5, signCol === COLORS.gold ? COLORS.red : COLORS.gold);
    if ((i + seed) % 3 !== 1) st.box(S, a0 - 0.1, a1 + 0.1, -3.05, -3.0, 1.75, 2.3, TARP_COLS[(i * 3 + seed) % TARP_COLS.length]);
    if (!isOpen) continue;
    if (isJewel) {
      st.box(S, a0 + 0.15, a1 - 0.15, -1.5, -0.5, 0, 0.8, COLORS.board, { top: COLORS.gold });
      st.box(S, a0 + 0.4, a1 - 0.4, -1.53, -1.5, 0.3, 0.55, COLORS.gold);
      st.box(S, a0 + 0.2, a1 - 0.2, -1.45, -0.55, 0.8, 1.15, COLORS.glass, { top: COLORS.glassTop });
      continue;
    }
    st.box(S, a0 + 0.2, a1 - 0.2, -1.4, -0.3, 0.1, 0.8, COLORS.wood);
    for (let k = 0; k < 3; k++) {
      const g0 = a0 + 0.3 + (k * (a1 - a0 - 0.6)) / 3;
      const g1 = g0 + (a1 - a0 - 0.6) / 3 - 0.08;
      st.box(S, g0, g1, -1.3, -0.4, 0.8, 0.95 + 0.25 * ((i + k + seed) % 3), CANVAS_COLS[(i * 5 + k * 2 + seed) % CANVAS_COLS.length]);
    }
  }
  for (let pos = s0, idx = 0; pos < s1 - 0.05; pos += 1.0, idx++) {
    const endPos = Math.min(pos + 1.0, s1);
    const col = idx % 2 ? COLORS.awningWhite : COLORS.awningBlue;
    drawSheet(S, st, pos, endPos, -0.05, 3.15, -3.2, 2.3, col, shade(col, 0.8));
    st.box(S, pos, endPos, -3.25, -3.18, 2.0, 2.32, col);
  }
}

function drawLattice(S, st: FrontStrip, s0: number, s1: number) {
  const bays = Math.max(1, Math.round((s1 - s0) / 6));
  const bayW = (s1 - s0) / bays;
  const y0 = FLOOR1_TOP + 0.3;
  const y1 = UPPER_TOP - 0.2;
  for (let i = 0; i <= bays; i++) st.box(S, s0 + i * bayW - 0.25, s0 + i * bayW + 0.25, 0.1, 0.45, FLOOR1_TOP, UPPER_TOP, COLORS.white);
  for (let i = 0; i < bays; i++) {
    const a0 = s0 + i * bayW + 0.25;
    const a1 = s0 + (i + 1) * bayW - 0.25;
    st.box(S, a0, a1, 0.36, 0.42, y0, y1, COLORS.lattice);
    for (let y = y0; y <= y1 + 0.01; y += 0.55) st.box(S, a0, a1, 0.28, 0.36, y - 0.11, y + 0.11, COLORS.white);
    const cols = Math.round((a1 - a0) / 0.55);
    const step = (a1 - a0) / cols;
    for (let k = 0; k <= cols; k++) st.box(S, a0 + k * step - 0.11, a0 + k * step + 0.11, 0.28, 0.36, y0, y1, COLORS.white);
  }
}

function drawBlueWindows(S, st: FrontStrip, centers: number[], depth: number, seed: number) {
  centers.forEach((centerS, idx) => {
    st.box(S, centerS - 0.75, centerS + 0.75, depth - 0.05, depth + 0.02, 5.7, 7.9, COLORS.white);
    st.box(S, centerS - 0.62, centerS + 0.62, depth - 0.08, depth - 0.05, 5.85, 7.75, COLORS.glass);
    st.box(S, centerS - 0.03, centerS + 0.03, depth - 0.1, depth - 0.08, 5.85, 7.75, COLORS.white);
    st.box(S, centerS - 0.62, centerS + 0.62, depth - 0.1, depth - 0.08, 6.95, 7.0, COLORS.white);
    st.box(S, centerS - 0.85, centerS + 0.85, depth - 0.45, depth, 7.95, 8.12, COLORS.blueDark);
    if ((idx + seed) % 2 === 0) st.box(S, centerS + 0.95, centerS + 1.75, depth - 0.32, depth, 7.3, 7.85, COLORS.acUnit);
  });
}

function drawCutWall(S, st: FrontStrip, s0: number, s1: number) {
  for (let pos = s0 + 1.0; pos < s1 - 0.6; pos += 2.3) {
    st.box(S, pos - 0.45, pos + 0.45, 0.33, 0.4, 7.35, 8.45, COLORS.white);
    st.box(S, pos - 0.36, pos + 0.36, 0.31, 0.33, 7.45, 8.35, COLORS.glass);
  }
  for (const [b0, b1] of [[s0 + 1.2, s0 + 5.8], [s0 + 8.0, s0 + 12.4]] as [number, number][]) {
    st.box(S, b0, b1, 0.3, 0.4, 5.3, 6.7, COLORS.bannerWhite);
    st.box(S, b0 + 0.3, b1 - 0.3, 0.28, 0.3, 5.75, 6.15, COLORS.bannerBlue);
  }
}

function createSignTexture(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 1024, 192);
  const text = 'CHỢ AN CỰU'.normalize('NFC');
  let fontSize = 150;
  const fontSpec = () => `900 ${fontSize}px "Helvetica Neue", Arial, "Segoe UI", Roboto, "Noto Sans", sans-serif`;
  ctx.font = fontSpec();
  const textW = ctx.measureText(text).width;
  if (textW > 980) {
    fontSize *= 980 / textW;
    ctx.font = fontSpec();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#f4ecd6';
  ctx.strokeText(text, 512, 104);
  ctx.fillStyle = '#c3161c';
  ctx.fillText(text, 512, 104);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function drawUmbrella(S, x: number, z: number, radius: number, col: number[], seed: number) {
  S.cyl(x, z, lotBaseY, lotBaseY + 2.5, 0.04, 0.04, 4, COLORS.post, { cap: false });
  S.cyl(x, z, lotBaseY + 2.05, lotBaseY + 2.65, radius, 0.05, 8, col, { rot: seed * 0.4 });
  S.box(x, z, lotBaseY + 0.7, lotBaseY + 0.8, 1.6, 0.9, FRAME_ANGLE + seed * 0.3, COLORS.wood);
  S.box(x, z, lotBaseY, lotBaseY + 0.7, 1.3, 0.6, FRAME_ANGLE + seed * 0.3, shade(COLORS.wood, 0.7));
}

function drawKiosks(S, st: FrontStrip, s0: number, s1: number, depth: number, height: number, seed: number) {
  S.kind = KIND.PLAIN;
  st.box(S, s0, s1, 0.1, depth, 0, height, COLORS.cream, { top: shade(COLORS.cream, 0.8) });
  const count = Math.max(1, Math.round((s1 - s0) / 3.4));
  const bayW = (s1 - s0) / count;
  for (let i = 0; i < count; i++) {
    const a0 = s0 + i * bayW + 0.25;
    const a1 = s0 + (i + 1) * bayW - 0.25;
    const isOpen = (i * 7 + seed) % 3 !== 0;
    st.box(S, a0, a1, 0.0, 0.12, 0.1, height - 0.9, isOpen ? COLORS.dark : COLORS.shutter);
    if (isOpen) st.box(S, a0 + 0.2, a1 - 0.2, -0.9, -0.1, 0.1, 0.85, COLORS.wood);
  }
  S.kind = KIND.FLAT;
  drawSheet(S, st, s0 - 0.2, s1 + 0.2, -1.4, height - 0.5, depth + 0.3, height + 0.5, COLORS.sheet, COLORS.sheetDark);
  S.kind = KIND.PLAIN;
}

// perimeter block, curved corner, shops, upper facades, and roof hoarding
function buildPerimeterAndHoarding(S, fronts: { west: FrontStrip; cut: FrontStrip; south: FrontStrip; east: FrontStrip; ret: FrontStrip; ch: FrontStrip; eastReturnPt: [number, number]; chamferCutPt: [number, number]; chamferSouthPt: [number, number]; northBluePt: [number, number]; southBluePt: [number, number] }) {
  const { west, cut, south, east, ret, ch, eastReturnPt, chamferCutPt, chamferSouthPt, northBluePt, southBluePt } = fronts;
  const wallLine = [RING[0], RING[6], chamferCutPt, chamferSouthPt, RING[4], eastReturnPt];
  const mainFront = [RING[0], RING[6], chamferCutPt, chamferSouthPt, southBluePt];
  const seCorner = [southBluePt, RING[4], eastReturnPt];

  S.kind = KIND.PLAIN;
  drawLiftedQuads(S, buildBandQuads(wallLine, 0, PERIM_DEPTH), 0.12, GROUND_TOP, COLORS.white, COLORS.conc);
  drawLiftedQuads(S, buildBandQuads(mainFront, -0.4, PERIM_DEPTH), GROUND_TOP, FLOOR1_TOP, COLORS.slab, COLORS.conc);
  drawLiftedQuads(S, buildBandQuads(seCorner, -1.6, PERIM_DEPTH), GROUND_TOP - 0.1, FLOOR1_TOP + 0.25, COLORS.fascia, COLORS.conc);
  drawLiftedQuads(S, buildBandQuads([northBluePt, RING[6], chamferCutPt, chamferSouthPt, southBluePt], 0.4, PERIM_DEPTH), FLOOR1_TOP, UPPER_TOP, COLORS.white, COLORS.conc);
  drawLiftedQuads(S, buildBandQuads([RING[0], northBluePt], 0.4, PERIM_DEPTH), FLOOR1_TOP, UPPER_TOP, COLORS.blueWall, COLORS.conc);
  drawLiftedQuads(S, buildBandQuads(seCorner, SE_SETBACK, PERIM_DEPTH), FLOOR1_TOP + 0.25, UPPER_TOP, COLORS.blueWall, COLORS.conc);

  const roofLine = [west.at(-1.2, 0), RING[6], chamferCutPt, chamferSouthPt, RING[4], eastReturnPt];
  drawLiftedQuads(S, buildBandQuads(roofLine, -ROOF_OVER, PERIM_DEPTH + 0.3), UPPER_TOP, ROOF_TOP, COLORS.slab, COLORS.roofLight);
  drawLiftedQuads(S, buildBandQuads(roofLine, -ROOF_OVER, -ROOF_OVER + 0.15), ROOF_TOP, ROOF_TOP + 0.25, COLORS.slab, COLORS.conc);

  // curved corner slabs
  const filletR = 5.0;
  const turn = Math.acos(Math.min(1, cut.tang[0] * south.tang[0] + cut.tang[1] * south.tang[1]));
  const tangDist = filletR * Math.tan(turn / 2);
  const tang1 = cut.at(cut.len - tangDist, 0);
  const arcCenter = cut.at(cut.len - tangDist, filletR);
  const a1 = Math.atan2(tang1[1] - arcCenter[1], tang1[0] - arcCenter[0]);
  const tang2 = south.at(tangDist, 0);
  let a2 = Math.atan2(tang2[1] - arcCenter[1], tang2[0] - arcCenter[0]);
  if (a2 - a1 > Math.PI) a2 -= 2 * Math.PI;
  else if (a1 - a2 > Math.PI) a2 += 2 * Math.PI;
  const cornerPath: [number, number][] = [cut.at(cut.len - 7, 0)];
  const edgeOffsets: number[] = [-ROOF_OVER];
  for (let i = 0; i <= 8; i++) {
    const ang = a1 + ((a2 - a1) * i) / 8;
    cornerPath.push([arcCenter[0] + filletR * Math.cos(ang), arcCenter[1] + filletR * Math.sin(ang)]);
    edgeOffsets.push(-(ROOF_OVER + 1.4 * Math.sin((Math.PI * i) / 8)));
  }
  cornerPath.push(south.at(7, 0));
  edgeOffsets.push(-ROOF_OVER);
  drawLiftedQuads(S, buildBandQuads(cornerPath, edgeOffsets.map((val) => val * 0.75), 2.6), GROUND_TOP + 0.3, GROUND_TOP + 0.52, COLORS.slab, COLORS.conc);
  drawLiftedQuads(S, buildBandQuads(cornerPath, edgeOffsets.map((val) => val * 0.9), 2.6), 6.9, 7.12, COLORS.slab, COLORS.conc);
  drawLiftedQuads(S, buildBandQuads(cornerPath, edgeOffsets, 2.6), UPPER_TOP, ROOF_TOP + 0.03, COLORS.slab, COLORS.roofLight);
  drawLiftedQuads(S, buildBandQuads(cornerPath, edgeOffsets, edgeOffsets.map((val) => val + 0.15)), ROOF_TOP + 0.03, ROOF_TOP + 0.7, COLORS.slab, COLORS.conc);

  // ground-floor shops & passages
  drawShops(S, west, 0.6, PASSAGE_A, 1);
  drawShops(S, west, PASSAGE_B, west.len - 0.4, 2);
  west.box(S, PASSAGE_A, PASSAGE_B, -0.04, PERIM_DEPTH + 0.1, 0.12, 3.6, COLORS.dark);
  drawShops(S, cut, 0.6, cut.len - CHAMFER_DIST - 0.3, 3);
  ch.box(S, 0.4, ch.len - 0.4, -0.04, PERIM_DEPTH + 0.1, 0.12, 3.6, COLORS.dark);
  drawShops(S, south, CHAMFER_DIST + 0.3, south.len - 0.4, 0, true);
  drawShops(S, ret, 0.4, ret.len, 5);

  // upper-floor breeze-block panels, cut wall, and blue corner blocks
  drawLattice(S, west, NORTH_BLUE_LEN + 0.3, west.len - 0.3);
  drawCutWall(S, cut, 0.3, cut.len - CHAMFER_DIST);
  ch.box(S, ch.len * 0.3, ch.len * 0.7, 0.3, 0.4, 7.6, 8.4, COLORS.bannerBlue);
  drawLattice(S, south, CHAMFER_DIST + 0.4, south.len - SE_BLUE_LEN);
  drawBlueWindows(S, west, [2.6, 6.0], 0.4, 1);
  west.box(S, 7.6, 11.0, 0.36, 0.4, 5.4, 8.6, COLORS.muralBg);
  west.box(S, 8.1, 9.4, 0.34, 0.36, 5.9, 8.1, COLORS.muralLight);
  west.box(S, 9.7, 10.6, 0.34, 0.36, 6.4, 7.8, COLORS.muralDark);
  drawBlueWindows(S, south, [south.len - SE_BLUE_LEN + 2.2, south.len - SE_BLUE_LEN + 5.6, south.len - SE_BLUE_LEN + 9.0], SE_SETBACK, 0);
  drawBlueWindows(S, ret, [3.2, 7.0], SE_SETBACK, 1);

  // tilted roof hoarding with lamps on south front
  const hS0 = 1.5, hS1 = 11.5, hDepth = 2.4, hY0 = ROOF_TOP + 1.4, hY1 = hY0 + 5.0, lean = 1.0;
  const southPt3 = (along: number, depth: number, yRel: number): [number, number, number] => {
    const pt = south.at(along, depth);
    return [pt[0], lotBaseY + yRel, pt[1]];
  };
  drawHexahedron(S, [southPt3(hS0, hDepth, hY0), southPt3(hS1, hDepth, hY0), southPt3(hS1, hDepth + 0.3, hY0), southPt3(hS0, hDepth + 0.3, hY0)], [southPt3(hS0, hDepth + lean, hY1), southPt3(hS1, hDepth + lean, hY1), southPt3(hS1, hDepth + lean + 0.3, hY1), southPt3(hS0, hDepth + lean + 0.3, hY1)], COLORS.hoardFrame);
  drawHexahedron(S, [southPt3(hS0 + 0.2, hDepth - 0.04, hY0 + 0.2), southPt3(hS1 - 0.2, hDepth - 0.04, hY0 + 0.2), southPt3(hS1 - 0.2, hDepth, hY0 + 0.2), southPt3(hS0 + 0.2, hDepth, hY0 + 0.2)], [southPt3(hS0 + 0.2, hDepth + lean - 0.04, hY1 - 0.2), southPt3(hS1 - 0.2, hDepth + lean - 0.04, hY1 - 0.2), southPt3(hS1 - 0.2, hDepth + lean, hY1 - 0.2), southPt3(hS0 + 0.2, hDepth + lean, hY1 - 0.2)], COLORS.board);
  const leanAt = (yRel: number) => ((yRel - hY0) / (hY1 - hY0)) * lean;
  drawHexahedron(S, [southPt3(hS0 + 0.6, hDepth - 0.07, hY0 + 0.8), southPt3(hS0 + 4.2, hDepth - 0.07, hY0 + 0.8), southPt3(hS0 + 4.2, hDepth - 0.04, hY0 + 0.8), southPt3(hS0 + 0.6, hDepth - 0.04, hY0 + 0.8)], [southPt3(hS0 + 0.6, hDepth + leanAt(hY1 - 0.8) - 0.07, hY1 - 0.8), southPt3(hS0 + 4.2, hDepth + leanAt(hY1 - 0.8) - 0.07, hY1 - 0.8), southPt3(hS0 + 4.2, hDepth + leanAt(hY1 - 0.8) - 0.04, hY1 - 0.8), southPt3(hS0 + 0.6, hDepth + leanAt(hY1 - 0.8) - 0.04, hY1 - 0.8)], COLORS.gold);
  drawHexahedron(S, [southPt3(hS0 + 5.0, hDepth - 0.07, hY0 + 0.6), southPt3(hS1 - 0.6, hDepth - 0.07, hY0 + 0.6), southPt3(hS1 - 0.6, hDepth - 0.04, hY0 + 0.6), southPt3(hS0 + 5.0, hDepth - 0.04, hY0 + 0.6)], [southPt3(hS0 + 5.0, hDepth + leanAt(hY0 + 1.6) - 0.07, hY0 + 1.6), southPt3(hS1 - 0.6, hDepth + leanAt(hY0 + 1.6) - 0.07, hY0 + 1.6), southPt3(hS1 - 0.6, hDepth + leanAt(hY0 + 1.6) - 0.04, hY0 + 1.6), southPt3(hS0 + 5.0, hDepth + leanAt(hY0 + 1.6) - 0.04, hY0 + 1.6)], COLORS.hoardText);

  for (let pos = hS0 + 0.6; pos <= hS1 - 0.5; pos += (hS1 - hS0 - 1.1) / 3) {
    south.box(S, pos - 0.1, pos + 0.1, hDepth + 0.3, hDepth + 0.5, ROOF_TOP + 0.25, hY0 + 0.1, COLORS.post);
    S.beam(southPt3(pos, hDepth + 3.2, ROOF_TOP + 0.25), southPt3(pos, hDepth + lean + 0.4, hY1 - 0.4), 0.12, 0.12, COLORS.post);
    S.beam(southPt3(pos, hDepth + 0.4, ROOF_TOP + 0.25), southPt3(pos, hDepth + 3.2, ROOF_TOP + 0.25), 0.1, 0.1, COLORS.post);
  }
  for (let i = 0; i < 6; i++) {
    const pos = hS0 + 0.9 + (i * (hS1 - hS0 - 1.8)) / 5;
    S.beam(southPt3(pos, hDepth + lean - 0.05, hY1 - 0.1), southPt3(pos, hDepth + lean - 1.3, hY1 + 0.35), 0.06, 0.06, COLORS.post);
    south.box(S, pos - 0.18, pos + 0.18, hDepth + lean - 1.5, hDepth + lean - 1.15, hY1 + 0.2, hY1 + 0.42, COLORS.lampHousing);
  }

  for (let pos = SIGN_S0; pos <= SIGN_S1 + 0.01; pos += (SIGN_S1 - SIGN_S0) / 4) cut.box(S, pos - 0.07, pos + 0.07, SIGN_DEPTH + 0.05, SIGN_DEPTH + 0.2, ROOF_TOP, 13.0, COLORS.post);
  cut.box(S, SIGN_S0, SIGN_S1, SIGN_DEPTH + 0.05, SIGN_DEPTH + 0.2, 11.0, 11.1, COLORS.post);

  // east lane two-level wing
  S.kind = KIND.PLAIN;
  east.box(S, 25.0, east.len - 10, 0, PERIM_DEPTH, 0.12, GROUND_TOP, COLORS.white, { top: COLORS.conc });
  drawLiftedQuads(S, buildBandQuads([east.at(25.0, 0), eastReturnPt], -1.6, PERIM_DEPTH), GROUND_TOP - 0.1, FLOOR1_TOP + 0.25, COLORS.fascia, COLORS.conc);
  east.box(S, 25.0, east.len - 10, 0.5, PERIM_DEPTH, FLOOR1_TOP + 0.25, 6.4, COLORS.conc, { top: COLORS.conc });
  drawLiftedQuads(S, buildBandQuads([east.at(25.0, 0), eastReturnPt], -0.8, PERIM_DEPTH), 6.4, 6.9, COLORS.slab, COLORS.conc);
  drawShops(S, east, 25.4, east.len - 10.2, 4);
  for (let pos = 26.0; pos < east.len - 11; pos += 2.6) east.box(S, pos, pos + 1.8, 0.44, 0.5, FLOOR1_TOP + 0.5, 6.1, COLORS.dark);
}

// inner sheds, central pyramid hall, flat block, north kiosks, and umbrella yard
function buildInteriorMarket(S, west: FrontStrip, south: FrontStrip) {
  const shedSpine = [west.at(4.0, 0), RING[6], CORNER_C, south.at(south.len - 10, 0)];
  drawShedBand(S, shedSpine, PERIM_DEPTH + 0.2, PERIM_DEPTH + 6.4, 6.2, 1.3, COLORS.cream, COLORS.sheet);
  drawShedBand(S, shedSpine, PERIM_DEPTH + 6.7, PERIM_DEPTH + 12.6, 5.8, 1.2, COLORS.cream, shade(COLORS.sheet, 0.97));

  const hallU0 = 26.0, hallU1 = 40.0, hallV0 = 12.0, hallV1 = 26.0, hallEave = 8.6;
  S.kind = KIND.PLAIN;
  boxUV(S, hallU0, hallU1, hallV0, hallV1, 0, hallEave, COLORS.cream, { top: COLORS.sheetDark });
  for (const [u0, u1, v0, v1] of [[hallU0 - 0.08, hallU0, hallV0 + 1, hallV1 - 1], [hallU1, hallU1 + 0.08, hallV0 + 1, hallV1 - 1], [hallU0 + 1, hallU1 - 1, hallV0 - 0.08, hallV0], [hallU0 + 1, hallU1 - 1, hallV1, hallV1 + 0.08]] as [number, number, number, number][]) {
    boxUV(S, u0, u1, v0, v1, 6.9, 8.1, COLORS.louvre);
  }
  drawPyramidRoof(S, [toWorld(hallU0 - 0.5, hallV0 - 0.5), toWorld(hallU1 + 0.5, hallV0 - 0.5), toWorld(hallU1 + 0.5, hallV1 + 0.5), toWorld(hallU0 - 0.5, hallV1 + 0.5)], hallEave, 4.0, COLORS.sheet);
  boxUV(S, 32.4, 33.6, 18.4, 19.6, hallEave + 3.3, hallEave + 4.3, COLORS.sheetDark);

  drawShedBand(S, [toWorld(25.0, 7.2), toWorld(41.0, 7.2)], -3.2, 3.2, 5.4, 1.1, COLORS.cream, COLORS.sheet);
  S.kind = KIND.PLAIN;
  boxUV(S, 41.8, 50.4, 14.0, 30.0, 0.12, 6.6, COLORS.cream, { top: COLORS.roofLight });
  boxUV(S, 41.6, 50.6, 13.8, 30.2, 6.6, 6.85, COLORS.slab, { top: COLORS.roofLight });

  const north = createStrip(RING[0], RING[1]);
  drawKiosks(S, north, PERIM_DEPTH + 1.0, 41.0, 3.4, 3.9, 1);

  const umbrellaSpots: [number, number][] = [[44.0, 5.5], [47.5, 3.2], [50.5, 6.2], [53.2, 9.0], [47.5, 9.5], [44.5, 11.0], [51.0, 12.0]];
  umbrellaSpots.forEach(([uPos, vPos], idx) => {
    const pt = toWorld(uPos, vPos);
    if (inRing(pt[0], pt[1], RING)) drawUmbrella(S, pt[0], pt[1], 1.25, CANVAS_COLS[idx % CANVAS_COLS.length], idx);
  });
}

export function build({ data, S, group, THREE }) {
  const refPt = toWorld(28, 28);
  lotBaseY = LAND_Y + rise(refPt[0], refPt[1]);

  if (Array.isArray(data.bld)) {
    for (let i = data.bld.length - 1; i >= 0; i--) {
      const flat = data.bld[i][0];
      let sumX = 0, sumZ = 0;
      for (let k = 0; k < flat.length; k += 2) { sumX += flat[k]; sumZ += flat[k + 1]; }
      if (inRing(sumX / (flat.length / 2) / 10, sumZ / (flat.length / 2) / 10, LOT)) data.bld.splice(i, 1);
    }
  }

  const pavedStart = S.n;
  S.kind = KIND.PLAIN;
  S.prism(LOT, lotBaseY - 1.2, lotBaseY + 0.12, shade(COLORS.pave, 0.85), COLORS.pave);

  const west = createStrip(RING[0], RING[6]);
  const cut = createStrip(RING[6], CORNER_C);
  const south = createStrip(CORNER_C, RING[4]);
  const east = createStrip(RING[3], RING[4]);
  const eastReturnPt = east.at(east.len - 10, 0);
  const ret = createStrip(RING[4], eastReturnPt);
  const chamferCutPt = cut.at(cut.len - CHAMFER_DIST, 0);
  const chamferSouthPt = south.at(CHAMFER_DIST, 0);
  const ch = createStrip(chamferCutPt, chamferSouthPt);
  const northBluePt = west.at(NORTH_BLUE_LEN, 0);
  const southBluePt = south.at(south.len - SE_BLUE_LEN, 0);

  buildPerimeterAndHoarding(S, { west, cut, south, east, ret, ch, eastReturnPt, chamferCutPt, chamferSouthPt, northBluePt, southBluePt });
  buildInteriorMarket(S, west, south);

  (S.paved = S.paved || []).push([pavedStart, S.n]);
  S.kind = KIND.PLAIN;

  if (!group) return null;

  const signTex = createSignTexture(THREE);
  const signPt = cut.at((SIGN_S0 + SIGN_S1) / 2, SIGN_DEPTH);
  const signW = SIGN_S1 - SIGN_S0;
  const signH = (signW * 192) / 1024;
  const signMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(signW, signH),
    new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.7, metalness: 0, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }),
  );
  signMesh.position.set(signPt[0], lotBaseY + 11.1 + signH / 2, signPt[1]);
  signMesh.rotation.y = Math.atan2(-cut.normal[0], -cut.normal[1]);
  signMesh.userData.landmark = id;
  group.add(signMesh);

  const lightBuf = new Buf(200);
  const addLine = (st: FrontStrip, s0: number, s1: number, depth: number, yRel: number) => {
    const p0 = st.at(s0, depth);
    const p1 = st.at(s1, depth);
    lightBuf.beam([p0[0], lotBaseY + yRel, p0[1]], [p1[0], lotBaseY + yRel, p1[1]], 0.1, 0.1, WHITE_RGB);
  };
  addLine(west, 1, PASSAGE_A - 0.5, -0.5, 3.0);
  addLine(west, PASSAGE_B + 0.5, west.len - 1, -0.5, 3.0);
  addLine(cut, 1, cut.len - CHAMFER_DIST - 0.5, -0.5, 3.0);
  addLine(south, CHAMFER_DIST + 0.5, south.len - 1, -0.5, 3.0);
  addLine(east, 26, east.len - 11, -0.5, 3.0);
  for (let i = 0; i < 6; i++) {
    const pt = south.at(1.5 + 0.9 + (i * 8.2) / 5, 2.4 + 1.0 - 1.33);
    lightBuf.box(pt[0], pt[1], lotBaseY + ROOF_TOP + 6.4 + 0.12, lotBaseY + ROOF_TOP + 6.4 + 0.22, 0.3, 0.3, south.angle, WHITE_RGB);
  }
  for (const [uPos, vPos] of [[47, 6], [50, 10], [45, 9]] as [number, number][]) {
    const pt = toWorld(uPos, vPos);
    lightBuf.box(pt[0], pt[1], lotBaseY + 2.9, lotBaseY + 3.1, 0.3, 0.3, 0, WHITE_RGB);
  }
  const lightMesh = new THREE.Mesh(lightBuf.geometry(), lightMaterial(0xfff0d0, 1.4));
  lightMesh.renderOrder = 19;
  lightMesh.userData.landmark = id;
  group.add(lightMesh);
  return null;
}
