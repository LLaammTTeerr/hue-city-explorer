import { KIND, Buf, hex, shade, rand } from '../../geo/buf.ts';
import { LAND_Y } from '../../config.ts';
import { streetTest } from '../enclosure.ts';
import { groundHeightAt, isFootprintClearOfStreets, addEmissiveStripMesh, addGlowPointCloud } from '../helpers.ts';

// Làng tranh Sình (Lại Ân village, Phú Mậu, near the Perfume River): Huế's 400-year-old woodblock
// folk-painting village. Features a traditional Huế nhà rường tiled-roof artisan workshop (like artisan
// Kỳ Hữu Phước's studio), walled courtyard with bình phong screen, wooden printing tables, and bamboo
// drying racks hung with colorful giấy điệp folk prints (red, ochre, indigo, emerald) in a lush garden setting.
export const id = 'sinh';

const FALLBACK_POS: [number, number] = [-1215.1, -5845.1];
const CLEARING_RADIUS = 24;
const FRAME_ANGLE = 0.08;
const AXIS_U: [number, number] = [Math.cos(FRAME_ANGLE), Math.sin(FRAME_ANGLE)];
const AXIS_V: [number, number] = [-AXIS_U[1], AXIS_U[0]];

const CANDIDATE_OFFSETS: [number, number][] = [
  [0, 0], [0, 12], [-10, 12], [10, 12], [0, -14], [-14, 0], [14, 0], [-14, 16], [14, -14],
  [-20, 10], [20, 10], [-20, -10], [20, -10], [0, 22], [0, -22], [-18, 22], [18, 22],
];
const NEIGHBOR_WORKSHOPS = [
  { u: -24, v: 6, w: 11, d: 7.5 },
  { u: 24, v: 5, w: 11.5, d: 7.5 },
  { u: -22, v: -18, w: 10.5, d: 7.0 },
  { u: 22, v: -18, w: 10.5, d: 7.0 },
];

const COLORS = {
  wall: hex('#e8ddc4'),
  wall2: hex('#dfd0ac'),
  brick: hex('#8a523e'),
  tile: hex('#924833'),
  tile2: hex('#7a3e2e'),
  ridge: hex('#dfd3b8'),
  wood: hex('#523322'),
  dark: hex('#281f1a'),
  pave: hex('#b9ae98'),
  lawn: hex('#738f4d'),
  bamboo: hex('#bda772'),
  screen: hex('#cfc2a4'),
  gold: hex('#d4a63a'),
  medallion: hex('#c45b33'),
  prints: ['#d43b2f', '#e5b13a', '#2e5d8c', '#3c8556', '#e8dfd0', '#c45b33'].map(hex),
};

// keep random infill houses & generic patches off the central Làng tranh Sình craft workshop garden
export function clearings() {
  const [cx, cz] = FALLBACK_POS;
  return [[[cx - CLEARING_RADIUS, cz - CLEARING_RADIUS], [cx + CLEARING_RADIUS, cz - CLEARING_RADIUS], [cx + CLEARING_RADIUS, cz + CLEARING_RADIUS], [cx - CLEARING_RADIUS, cz + CLEARING_RADIUS]]];
}

function buildMainCompound(S, toWorld, cx, cz, compL, compW, baseY, lightBuf, glowPos, glowCol) {
  const scaleX = compL / 22;
  const scaleY = compW / 18;
  // brick courtyard floor & garden lawn
  S.kind = KIND.ROAD;
  S.box(cx, cz, baseY - 0.5, baseY + 0.16, compL, compW, FRAME_ANGLE, COLORS.pave, { topKind: KIND.ROAD });
  // low weathered brick garden walls with an open front gate on the north (-V) side
  S.kind = KIND.MASONRY;
  const wallH = 1.65;
  for (const [u, v, w, d] of [
    [0, 8.7 * scaleY, compL, 0.45],
    [-10.7 * scaleX, 0, 0.45, compW - 0.2],
    [10.7 * scaleX, 0, 0.45, compW - 0.2],
    [-6.4 * scaleX, -8.7 * scaleY, 8.6 * scaleX, 0.45],
    [6.4 * scaleX, -8.7 * scaleY, 8.6 * scaleX, 0.45],
  ]) {
    const pos = toWorld(u, v);
    S.box(pos[0], pos[1], baseY - 0.2, baseY + wallH, w, d, FRAME_ANGLE, COLORS.brick, { top: COLORS.screen });
  }
  // traditional tam quan village gate piers + two-tier tiled gate roof & gilded village plaque (Cổng làng Sình)
  for (const side of [-1, 1]) {
    const innerPier = toWorld(side * 2.25, -8.7 * scaleY);
    S.box(innerPier[0], innerPier[1], baseY - 0.2, baseY + 3.25, 0.78, 0.78, FRAME_ANGLE, COLORS.wall2, { top: COLORS.ridge });
    const outerPier = toWorld(side * 4.4 * scaleX, -8.7 * scaleY);
    S.box(outerPier[0], outerPier[1], baseY - 0.2, baseY + 2.4, 0.6, 0.6, FRAME_ANGLE, COLORS.wall2, { top: COLORS.ridge });
    const sideRoofPos = toWorld(side * 3.3 * scaleX, -8.7 * scaleY);
    S.hip(sideRoofPos[0], sideRoofPos[1], 2.2, 1.35, FRAME_ANGLE, baseY + 2.4, 0.58, COLORS.tile, { over: 0.3, flare: 0.2, ridgeCol: COLORS.ridge, segs: 2 });
  }
  const gateMid = toWorld(0, -8.7 * scaleY);
  S.kind = KIND.PLAIN;
  S.box(gateMid[0], gateMid[1], baseY + 2.45, baseY + 3.25, 4.5, 0.5, FRAME_ANGLE, COLORS.brick);
  S.box(gateMid[0], gateMid[1], baseY + 2.62, baseY + 3.08, 2.8, 0.56, FRAME_ANGLE, COLORS.gold);
  S.hip(gateMid[0], gateMid[1], 5.6, 1.9, FRAME_ANGLE, baseY + 3.25, 1.0, COLORS.tile, { over: 0.48, flare: 0.34, ridgeCol: COLORS.ridge, segs: 3 });
  S.hip(gateMid[0], gateMid[1], 3.5, 1.35, FRAME_ANGLE, baseY + 4.15, 0.8, COLORS.tile, { over: 0.36, flare: 0.32, ridgeCol: COLORS.ridge, segs: 2 });
  S.cyl(gateMid[0], gateMid[1], baseY + 4.95, baseY + 5.5, 0.15, 0.04, 6, COLORS.gold);
  glowPos.push(gateMid[0], baseY + 2.7, gateMid[1]);
  glowCol.push(1, 0.8, 0.45);

  // bình phong spirit screen just inside the gate with ceramic relief medallion
  const screenPos = toWorld(0, -5.6 * scaleY);
  S.kind = KIND.MASONRY;
  S.box(screenPos[0], screenPos[1], baseY + 0.16, baseY + 2.35, 3.2, 0.44, FRAME_ANGLE, COLORS.screen, { top: COLORS.tile2 });
  S.kind = KIND.PLAIN;
  S.box(screenPos[0], screenPos[1], baseY + 0.85, baseY + 1.85, 1.25, 0.5, FRAME_ANGLE, COLORS.medallion);

  // main nhà rường workshop hall (3 gian 2 chái) on the south half of the courtyard
  const hallPos = toWorld(0, 3.6 * scaleY);
  S.kind = KIND.MASONRY;
  S.box(hallPos[0], hallPos[1], baseY + 0.16, baseY + 0.6, 15.2 * scaleX, 8.6 * scaleY, FRAME_ANGLE, shade(COLORS.pave, 0.92), { topKind: KIND.ROAD });
  S.kind = KIND.TIMBER;
  S.box(hallPos[0], hallPos[1], baseY + 0.6, baseY + 4.0, 13.8 * scaleX, 7.0 * scaleY, FRAME_ANGLE, COLORS.wall, { top: COLORS.tile2 });
  S.hip(hallPos[0], hallPos[1], 14.2 * scaleX, 7.4 * scaleY, FRAME_ANGLE, baseY + 4.0, 2.6, COLORS.tile, { over: 0.95, flare: 0.42, fascia: 0.22, fasciaCol: COLORS.wood, ridgeCol: COLORS.ridge, hips: true, segs: 3 });
  // open timber verandah facing the courtyard + folk-art hanging scroll banners
  S.kind = KIND.PLAIN;
  for (let i = -3; i <= 3; i++) {
    const colPos = toWorld(i * 2.1 * scaleX, -0.3 * scaleY);
    S.cyl(colPos[0], colPos[1], baseY + 0.6, baseY + 3.8, 0.14, 0.11, 6, COLORS.wood, { cap: false });
  }
  const facadePos = toWorld(0, 0.12 * scaleY);
  S.box(facadePos[0], facadePos[1], baseY + 0.6, baseY + 2.95, 9.8 * scaleX, 0.14, FRAME_ANGLE, COLORS.wood);
  S.box(facadePos[0], facadePos[1], baseY + 3.05, baseY + 3.58, 3.4, 0.18, FRAME_ANGLE, COLORS.gold);
  lightBuf.box(facadePos[0], facadePos[1], baseY + 0.85, baseY + 2.7, 9.0 * scaleX, 0.1, FRAME_ANGLE, [1, 1, 1]);
  glowPos.push(facadePos[0], baseY + 3.2, facadePos[1]);
  glowCol.push(1, 0.85, 0.52);

  // ---- signature bamboo drying racks hung with colorful Sình woodblock prints (giấy điệp) ----
  const rackPositions: [number, number][] = [
    [-6.2 * scaleX, -2.5 * scaleY], [6.2 * scaleX, -2.5 * scaleY],
    [-6.2 * scaleX, -5.2 * scaleY], [6.2 * scaleX, -5.2 * scaleY],
    [-8.4 * scaleX, 1.5 * scaleY], [8.4 * scaleX, 1.5 * scaleY],
  ];
  for (const [rackU, rackV] of rackPositions) {
    const end0 = toWorld(rackU - 2.3 * scaleX, rackV);
    const end1 = toWorld(rackU + 2.3 * scaleX, rackV);
    S.kind = KIND.PLAIN;
    for (const endPt of [end0, end1]) S.cyl(endPt[0], endPt[1], baseY + 0.16, baseY + 2.35, 0.07, 0.05, 5, COLORS.bamboo, { cap: false });
    S.beam([end0[0], baseY + 2.2, end0[1]], [end1[0], baseY + 2.2, end1[1]], 0.07, 0.07, COLORS.bamboo);
    S.beam([end0[0], baseY + 1.35, end0[1]], [end1[0], baseY + 1.35, end1[1]], 0.06, 0.06, COLORS.bamboo);
    // hanging painted sheets of giấy điệp paper (larger, vivid folk-print squares)
    for (let j = 0; j < 5; j++) {
      const sheetPos = toWorld(rackU + (-1.7 + j * 0.85) * scaleX, rackV);
      const printCol = COLORS.prints[(j + (rackU > 0 ? 2 : 0) + (rackV < -4 ? 1 : 0)) % COLORS.prints.length];
      S.box(sheetPos[0], sheetPos[1], baseY + 1.42, baseY + 2.15, 0.7, 0.08, FRAME_ANGLE, printCol);
      S.box(sheetPos[0], sheetPos[1], baseY + 0.65, baseY + 1.3, 0.7, 0.08, FRAME_ANGLE, COLORS.prints[(j + 3) % COLORS.prints.length]);
    }
  }

  // wooden woodblock printing table + natural pigment bowls (shell white, indigo, vermilion, turmeric)
  const tablePos = toWorld(0, -2.4 * scaleY);
  S.box(tablePos[0], tablePos[1], baseY + 0.16, baseY + 0.96, 3.4, 1.45, FRAME_ANGLE, COLORS.wood);
  S.box(tablePos[0], tablePos[1], baseY + 0.96, baseY + 1.04, 2.8, 1.05, FRAME_ANGLE, COLORS.prints[4]);
  for (let k = 0; k < 4; k++) {
    const bowlPos = toWorld(-1.05 + k * 0.7, -2.4 * scaleY);
    S.cyl(bowlPos[0], bowlPos[1], baseY + 1.04, baseY + 1.26, 0.18, 0.24, 7, COLORS.prints[k]);
  }
}

export function build({ data, S, group, place }) {
  const startX = place ? place.x : FALLBACK_POS[0];
  const startZ = place ? place.z : FALLBACK_POS[1];
  const onStreet = streetTest(data, [startX, startZ], 140);
  const clearBox = (x, z, len, wid) => isFootprintClearOfStreets(onStreet, x, z, AXIS_U, AXIS_V, len, wid, 0.8);

  // find the nearest clear courtyard site around the village center (keeping off the mapped lanes)
  let cx = startX;
  let cz = startZ;
  let found = false;
  let compL = 22;
  let compW = 18;
  for (const [len, wid] of ([[22, 18], [18, 14]] as any[])) {
    for (const [du, dv] of CANDIDATE_OFFSETS) {
      const candX = startX + AXIS_U[0] * du + AXIS_V[0] * dv;
      const candZ = startZ + AXIS_U[1] * du + AXIS_V[1] * dv;
      if (clearBox(candX, candZ, len, wid)) {
        cx = candX;
        cz = candZ;
        compL = len;
        compW = wid;
        found = true;
        break;
      }
    }
    if (found) break;
  }
  const toWorld = (u, v): [number, number] => [cx + AXIS_U[0] * u + AXIS_V[0] * v, cz + AXIS_U[1] * u + AXIS_V[1] * v];

  const lightBuf = new Buf(256);
  const glowPos = [];
  const glowCol = [];
  const pavedStart = S.n;
  const baseY = groundHeightAt(cx, cz);
  S.base = baseY - LAND_Y;

  if (found || !onStreet(cx, cz, 2.0)) {
    buildMainCompound(S, toWorld, cx, cz, compL, compW, baseY, lightBuf, glowPos, glowCol);
  }

  // ---- 2. Neighboring tiled garden-village workshops (matching satellite cluster) ----
  for (let i = 0; i < NEIGHBOR_WORKSHOPS.length; i++) {
    const nb = NEIGHBOR_WORKSHOPS[i];
    const pos = toWorld(nb.u, nb.v);
    if (!clearBox(pos[0], pos[1], nb.w + 2, nb.d + 2)) continue;
    const y = groundHeightAt(pos[0], pos[1]);
    S.base = y - LAND_Y;
    S.kind = KIND.CIVIC;
    S.box(pos[0], pos[1], y - 0.5, y + 3.4, nb.w, nb.d, FRAME_ANGLE, i % 2 ? COLORS.wall : COLORS.wall2, { top: COLORS.tile2 });
    S.hip(pos[0], pos[1], nb.w, nb.d, FRAME_ANGLE, y + 3.4, 1.8, i % 2 ? COLORS.tile : COLORS.tile2, { over: 0.7, flare: 0.2, ridgeCol: COLORS.ridge, segs: 2 });
  }

  (S.paved = S.paved || []).push([pavedStart, S.n]);

  // ---- lush village garden trees & areca palms (matching Google Satellite) ----
  if (Array.isArray(data.trees)) {
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2;
      const radius = 17 + rand(i, 4) * 20;
      const pos = toWorld(Math.cos(angle) * radius, Math.sin(angle) * radius);
      if (onStreet(pos[0], pos[1], 3.0)) continue;
      data.trees.push(Math.round(pos[0] * 10), Math.round(pos[1] * 10), 9 + Math.floor(rand(i, 9) * 5), i % 3 === 0 ? 1 : 0);
    }
  }

  addEmissiveStripMesh(group, lightBuf, 0xffd28c, 0.8, id);
  addGlowPointCloud(group, glowPos, glowCol, 3.0, id);
  S.kind = KIND.PLAIN;
  S.base = 0;
}
