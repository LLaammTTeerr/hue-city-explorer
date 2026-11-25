import { KIND, hex, shade } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';

// Điện Cần Chánh, Tử Cấm Thành: the hall of daily audience, built 1804, razed in February 1947, rebuilt on its old
// foundation since April 2025 (finish due 2027-2028). Drawn finished, as it stood before 1947 and as the restoration
// aims to complete it (in the decorative style of the Khải Định years): yellow glazed tile roofs with enamelled
// ridges, red lacquer and gilt on the lim frame, board walls and glazed door leaves; and the paved court (sân bái
// mạng) between the Tả Vu and Hữu Vu halls. Sources and estimates: docs/places/canchanh.md.
//
// Plan (trùng thiềm điệp ốc, the same type as Thái Hòa): front hall 7 gian 2 chái đơn, main hall 5 gian 2 chái kép,
// a rear lean-to (mái lưa) of 9 bays; 90 lim columns, 80 in the main building and 10 under the mái lưa: here
// 10 across (9 bays) by 8 deep, plus the row of 10 at the back.
//
// Frame: u across the hall (toward Tả Vu, north-east), v toward Thái Hòa (south-east); origin at the centre of the
// OSM outline, way 285990343 (historic=ruins, 44.5 × 35.3 m). The front flights from OSM steps 619851677/79/78.
// The court: between the inner faces of Tả Vu (way 172657574, u = 34.4) and Hữu Vu (172657572, u = -33.8), from
// the platform to the back of Đại Cung Môn's foundation (drawn in dainoi.js, v ≈ 46).
export const id = 'canchanh';

const ORIGIN = [-1180.85, -64.2];
const FWD = [0.5978, 0.8016]; // toward Thái Hòa (its axis: places/thaihoa.js)
const ACROSS = [0.8016, -0.5978];
const ANGLE = Math.atan2(ACROSS[1], ACROSS[0]);
const toWorld = (u, v): [number, number] => [ORIGIN[0] + ACROSS[0] * u + FWD[0] * v, ORIGIN[1] + ACROSS[1] * u + FWD[1] * v];
const pt3 = (u, y, v) => {
  const pos = toWorld(u, v);
  return [pos[0], y, pos[1]];
};

const PLATFORM_W = 44.5;
const PLATFORM_D = 35.3; // platform, OSM
const COURT_H = 0.22;
const FLOOR_H = 1.15; // court and floor above the ground: floor "nearly 1 m" above the court
const COL_H = 4.3; // outer columns, floor to the eave plate
const HALL_SPAN = 41;
const BAY_WEIGHTS = [3.4, 3.8, 4.8, 5.4, 6.2, 5.4, 4.8, 3.8, 3.4];
const COL_VS = [14.4, 11.4, 6.8, 3.0, -1.4, -6.2, -10.6, -13.4];
const LEAN_TO_V = -16.0;

const COLORS = {
  stone: hex('#9b998f'), // Thanh Hóa stone, blue-grey
  brick: hex('#6f665c'), // gạch vồ facing
  // the court: red-brown brick (gạch Bát Tràng) with a pale blue-grey stone ngự đạo, as the court is paved today
  pave: hex('#7e5f4a'), // warm red-brown: the scene light cools a greyer brick to mauve
  paveStone: hex('#a3a9a8'),
  floor: hex('#b8b0a0'),
  red: hex('#9a2a1e'),
  redDark: hex('#6e1f17'),
  gold: hex('#d2a43c'),
  glass: hex('#3b4a50'), // the glazed upper panels of the door leaves (cửa pano kính)
  enamel: [hex('#2f6aa3'), hex('#3d8a5c'), hex('#d8b23a'), hex('#e6dcc4')],
  roof: PAL.imperialRoof,
  ridge: hex('#f1d77a'),
};

function placeBox(S, u, v, y0, y1, w, d, color, opt?) {
  const pos = toWorld(u, v);
  S.box(pos[0], pos[1], y0, y1, w, d, ANGLE, color, opt);
}

function buildCourtAndPlatform(S, groundY, courtY, floorY) {
  const pavedStart = S.n;
  // ======== the court (sân bái mạng) ========
  S.kind = KIND.MASONRY;
  const cu0 = -33.2;
  const cu1 = 33.8;
  const cv0 = 18.3;
  const cv1 = 46;
  placeBox(S, (cu0 + cu1) / 2, (cv0 + cv1) / 2, groundY - 0.3, courtY, cu1 - cu0, cv1 - cv0, COLORS.pave, { topKind: KIND.ROAD });
  placeBox(S, 0, (PLATFORM_D / 2 + cv0) / 2, groundY - 0.3, courtY, PLATFORM_W, cv0 - PLATFORM_D / 2 + 0.05, COLORS.pave, { topKind: KIND.ROAD });
  placeBox(S, 0, (PLATFORM_D / 2 + cv1) / 2, courtY, courtY + 0.06, 3.3, cv1 - PLATFORM_D / 2, COLORS.paveStone, { topKind: KIND.ROAD }); // ngự đạo
  // stone kerbs along the open edges toward the Vu halls
  for (const u of [cu0 + 0.2, cu1 - 0.2]) placeBox(S, u, (cv0 + cv1) / 2, courtY, courtY + 0.18, 0.35, cv1 - cv0, COLORS.stone);

  // ======== the platform ========
  // gạch vồ facing on a stone plinth, Thanh stone coping, the floor
  placeBox(S, 0, 0, groundY - 0.3, courtY + 0.15, PLATFORM_W + 0.4, PLATFORM_D + 0.4, shade(COLORS.stone, 0.85), { topKind: KIND.ROAD });
  placeBox(S, 0, 0, groundY, floorY - 0.16, PLATFORM_W, PLATFORM_D, COLORS.brick, { topKind: KIND.ROAD });
  placeBox(S, 0, 0, floorY - 0.18, floorY + 0.01, PLATFORM_W + 0.25, PLATFORM_D + 0.25, shade(COLORS.stone, 1.08), { topKind: KIND.ROAD });
  placeBox(S, 0, 0, floorY + 0.01, floorY + 0.03, PLATFORM_W - 0.6, PLATFORM_D - 0.6, COLORS.floor, { topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;

  // ======== three flights at the front (OSM), 5 steps, with stone cheeks ========
  const buildFlight = (u, width, steps) => {
    const stepH = (floorY - courtY) / steps;
    const tread = 0.4;
    const v0 = PLATFORM_D / 2;
    S.kind = KIND.MASONRY;
    for (let k = 1; k <= steps; k++) {
      placeBox(S, u, v0 + tread * (k - 0.5), courtY - 0.1, floorY - stepH * k + 0.001, width, tread, shade(COLORS.stone, 1.06), { topKind: KIND.ROAD });
    }
    S.kind = KIND.PLAIN;
    for (const side of [-1, 1]) {
      const cheekU = u + side * (width / 2 + 0.22);
      placeBox(S, cheekU, v0 + 0.2, courtY, floorY + 0.3, 0.44, 0.5, COLORS.stone);
      S.beam(pt3(cheekU, floorY + 0.18, v0 + 0.2), pt3(cheekU, courtY + 0.2, v0 + tread * steps + 0.1), 0.4, 0.4, COLORS.stone);
    }
  };
  // at the OSM ways' u (619851677, 619851679, 619851678): not quite symmetric about the outline's centre
  buildFlight(-0.5, 4.2, 5);
  buildFlight(-15.8, 3.2, 5);
  buildFlight(14.0, 3.2, 5);
  (S.paved = S.paved || []).push([pavedStart, S.n]); // stone paving and platform: no trees, no houses (geo/city.js coverOf)
}

function buildColumnsAndWalls(S, floorY) {
  // 9 bays across, widest in the middle (the proportions of Thái Hòa, its twin in plan), 41 m between end columns
  const scaleW = HALL_SPAN / BAY_WEIGHTS.reduce((acc, w) => acc + w, 0);
  const colUs = [-20.5];
  for (const weight of BAY_WEIGHTS) colUs.push(colUs[colUs.length - 1] + weight * scaleW);

  const columnTopY = (i, j) => {
    const isInner = i > 0 && i < 9;
    if (j === 3) return floorY + 5.2; // under the valley between the two roofs
    if (j >= 4 && j <= 6 && isInner && i > 1 && i < 8) return floorY + 6.4; // the main hall's tall columns, up into the cổ diêm
    if ((j === 1 || j === 2) && isInner) return floorY + 5.0;
    return floorY + COL_H;
  };

  S.kind = KIND.TIMBER;
  const placeColumn = (u, v, topY, radius, withBand) => {
    const pos = toWorld(u, v);
    S.box(pos[0], pos[1], floorY, floorY + 0.28, 0.9, 0.9, ANGLE, shade(COLORS.stone, 1.05)); // chân tảng
    S.cyl(pos[0], pos[1], floorY + 0.28, topY, radius, radius * 0.93, 8, COLORS.red, { cap: false });
    if (withBand) S.cyl(pos[0], pos[1], floorY + 2.2, floorY + 2.5, radius + 0.005, radius * 0.95, 8, COLORS.gold, { cap: false });
  };
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 8; j++) placeColumn(colUs[i], COL_VS[j], columnTopY(i, j), 0.29, true);
  }
  for (let i = 0; i < 10; i++) placeColumn(colUs[i], LEAN_TO_V, floorY + 2.95, 0.2, false);

  // eave plates round the outer columns, and the mái lưa plate
  const eavePlateY = floorY + COL_H - 0.15;
  for (const j of [0, 7]) S.beam(pt3(colUs[0], eavePlateY, COL_VS[j]), pt3(colUs[9], eavePlateY, COL_VS[j]), 0.34, 0.4, COLORS.redDark);
  for (const i of [0, 9]) S.beam(pt3(colUs[i], eavePlateY, COL_VS[0]), pt3(colUs[i], eavePlateY, COL_VS[7]), 0.34, 0.4, COLORS.redDark);
  S.beam(pt3(colUs[0], floorY + 2.8, LEAN_TO_V), pt3(colUs[9], floorY + 2.8, LEAN_TO_V), 0.24, 0.3, COLORS.redDark);
  for (let i = 0; i < 10; i++) S.beam(pt3(colUs[i], floorY + 2.8, LEAN_TO_V), pt3(colUs[i], floorY + 2.8, COL_VS[7]), 0.2, 0.26, COLORS.redDark);

  // ======== walls and doors ========
  const buildDoorRow = (v, fromIdx, toIdx, height) => {
    const outSign = Math.sign(v);
    for (let i = fromIdx; i < toIdx; i++) {
      const u0 = colUs[i] + 0.3;
      const u1 = colUs[i + 1] - 0.3;
      const bayW = u1 - u0;
      const midU = (u0 + u1) / 2;
      placeBox(S, midU, v, floorY, floorY + height, bayW, 0.14, shade(COLORS.red, 0.8));
      placeBox(S, midU, v + outSign * 0.08, floorY + height - 1.5, floorY + height - 0.75, bayW, 0.03, COLORS.glass);
      placeBox(S, midU, v + outSign * 0.08, floorY + height - 0.7, floorY + height - 0.5, bayW, 0.04, COLORS.gold); // the gilt rail above the leaves
      const leafCount = Math.max(2, Math.round(bayW / 0.85));
      for (let k = 1; k < leafCount; k++) placeBox(S, u0 + (bayW * k) / leafCount, v + outSign * 0.09, floorY, floorY + height - 0.7, 0.06, 0.04, COLORS.redDark);
      placeBox(S, midU, v, floorY + height, floorY + COL_H - 0.3, bayW, 0.12, COLORS.redDark); // the transom
      placeBox(S, midU, v + outSign * 0.07, floorY + height + 0.15, floorY + COL_H - 0.45, bayW * 0.8, 0.04, shade(COLORS.gold, 0.8));
    }
  };
  const buildBoardWall = (u, v, width, depth, height) => {
    placeBox(S, u, v, floorY, floorY + height, width, depth, shade(COLORS.red, 0.85));
    placeBox(S, u, v, floorY + 0.9, floorY + 1.0, width + 0.02, depth + 0.02, COLORS.gold); // gilt rails framing the panels
    placeBox(S, u, v, floorY + height - 0.5, floorY + height - 0.4, width + 0.02, depth + 0.02, COLORS.gold);
  };
  buildDoorRow(COL_VS[1], 1, 8, 3.1);
  buildDoorRow(COL_VS[7] + 0.1, 2, 7, 3.1);
  for (const side of [-1, 1]) {
    const frontWingIdx = side < 0 ? 0 : 8;
    buildBoardWall((colUs[frontWingIdx] + colUs[frontWingIdx + 1]) / 2, COL_VS[1], colUs[frontWingIdx + 1] - colUs[frontWingIdx] - 0.5, 0.2, COL_H - 0.3);
    for (const i of side < 0 ? [0, 1] : [7, 8]) {
      buildBoardWall((colUs[i] + colUs[i + 1]) / 2, COL_VS[7] + 0.1, colUs[i + 1] - colUs[i] - 0.5, 0.2, COL_H - 0.3);
    }
    buildBoardWall(side * 20.5, (COL_VS[1] + COL_VS[7]) / 2, 0.22, COL_VS[1] - COL_VS[7], COL_H - 0.3);
  }
  // the interior: a dark lid under the roofs (seen through the doors and from below the eaves)
  placeBox(S, 0, 0, floorY + COL_H - 0.3, floorY + COL_H - 0.1, 40.6, 28.4, shade(COLORS.redDark, 0.6), { bottom: true });
}

function buildRoofsAndLeanTo(S, floorY) {
  // ======== roofs: yellow glazed cylinder tiles (ngói ống hoàng lưu ly) ========
  S.kind = KIND.PLAIN;
  const roofOpt = { flare: 0.55, fascia: 0.32, fasciaCol: COLORS.redDark, ridgeCol: COLORS.ridge, hips: true, glazed: true, segs: 4 };
  // front hall: one hip roof over the verandah and the 7 + 2 bays, its back slope dropping into the valley
  const frontV = (COL_VS[0] + COL_VS[3]) / 2;
  const frontD = COL_VS[0] - COL_VS[3];
  const frontRoofH = 2.9;
  {
    const pos = toWorld(0, frontV);
    S.hip(pos[0], pos[1], HALL_SPAN, frontD, ANGLE, floorY + COL_H, frontRoofH, COLORS.roof, { ...roofOpt, over: 1.9 });
  }
  // main hall: the lower skirt round the whole of it...
  const mainV = (COL_VS[3] + COL_VS[7]) / 2;
  const mainD = COL_VS[3] - COL_VS[7];
  {
    const pos = toWorld(0, mainV);
    S.hip(pos[0], pos[1], HALL_SPAN, mainD, ANGLE, floorY + COL_H, 1.9, COLORS.roof, { ...roofOpt, ridgeCol: null, over: 1.9 });
  }
  // ...the cổ diêm band above it, a brick band in dark red round enamelled poem panels...
  const upperU = 32;
  const upperV = COL_VS[4] - COL_VS[6] + 2.2;
  const upperCenterV = (COL_VS[4] + COL_VS[6]) / 2;
  const bandY0 = floorY + 5.6;
  const bandY1 = floorY + 6.5;
  S.kind = KIND.MASONRY;
  placeBox(S, 0, upperCenterV, floorY + 5.0, bandY1, upperU, upperV, COLORS.redDark, { top: shade(COLORS.roof, 0.8) });
  S.kind = KIND.PLAIN;
  {
    const longCount = 14;
    const endCount = 5;
    for (let k = 0; k < longCount; k++) {
      for (const side of [-1, 1]) {
        const u = -upperU / 2 + (upperU * (k + 0.5)) / longCount;
        placeBox(S, u, upperCenterV + side * (upperV / 2 + 0.03), bandY0 + 0.15, bandY1 - 0.15, upperU / longCount - 0.5, 0.05, COLORS.enamel[k % 3]);
      }
    }
    for (let k = 0; k < endCount; k++) {
      for (const side of [-1, 1]) {
        const v = upperCenterV - upperV / 2 + (upperV * (k + 0.5)) / endCount;
        placeBox(S, side * (upperU / 2 + 0.03), v, bandY0 + 0.15, bandY1 - 0.15, 0.05, upperV / endCount - 0.5, COLORS.enamel[(k + 1) % 3]);
      }
    }
  }
  // ...and the upper hip roof, a little steeper than Thái Hòa's: the main columns are up to 9.4 m long
  const upperRoofH = 3.2;
  {
    const pos = toWorld(0, upperCenterV);
    S.hip(pos[0], pos[1], upperU, upperV, ANGLE, bandY1, upperRoofH, COLORS.roof, { ...roofOpt, over: 1.6 });
  }
  const ridgeY = bandY1 + upperRoofH + 0.3;
  // the main ridge: a gilt flaming disc between two enamelled dragons (lưỡng long chầu nhật)
  {
    const discR = 0.55;
    const discCenterY = ridgeY + 0.55;
    const discSegs = 10;
    for (let k = 0; k < discSegs; k++) {
      const a0 = (k / discSegs) * Math.PI * 2;
      const a1 = ((k + 1) / discSegs) * Math.PI * 2;
      for (const side of [-1, 1]) {
        S.tri(pt3(0, discCenterY, upperCenterV + side * 0.06), pt3(Math.cos(a0) * discR, discCenterY + Math.sin(a0) * discR, upperCenterV + side * 0.06), pt3(Math.cos(a1) * discR, discCenterY + Math.sin(a1) * discR, upperCenterV + side * 0.06), COLORS.gold, [FWD[0] * side, 0, FWD[1] * side]);
      }
    }
    placeBox(S, 0, upperCenterV, ridgeY + 0.1, ridgeY + 0.3, 0.5, 0.3, COLORS.gold);
    for (const side of [-1, 1]) {
      let prev = null;
      for (let k = 0; k <= 8; k++) {
        const u = side * (0.9 + k * 0.42);
        const y = ridgeY + 0.25 + 0.28 * Math.sin(k * 1.2) + (k === 0 ? 0.35 : 0);
        const pt = pt3(u, y, upperCenterV);
        if (prev) S.beam(prev, pt, 0.22, 0.24, k < 2 ? COLORS.gold : COLORS.enamel[1]);
        prev = pt;
      }
    }
  }
  // the front hall's ridge: a row of enamelled ô hộc panels, the middle one yellow, and pháp lam on the front roof
  {
    const frontRidgeY = floorY + COL_H + frontRoofH + 0.3;
    const panelCount = 9;
    for (let k = 0; k < panelCount; k++) {
      const u = -9 + (18 * (k + 0.5)) / panelCount;
      for (const side of [-1, 1]) {
        placeBox(S, u, frontV + side * 0.33, frontRidgeY - 0.05, frontRidgeY + 0.3, 18 / panelCount - 0.35, 0.04, k === 4 ? COLORS.enamel[2] : COLORS.enamel[k % 2]);
      }
    }
  }

  // ======== the mái lưa: a glazed lean-to over the back row, tucked under the skirt's eave ========
  S.kind = KIND.GLAZED;
  const vh = COL_VS[7] + 0.1;
  const vl = LEAN_TO_V - 1.2;
  const yh = floorY + 3.65;
  const yl = floorY + 2.7;
  const uh = 20.5;
  const ul = 21.9;
  const upNorm: [number, number, number] = [0, 1, 0];
  const soffitColor = shade(COLORS.redDark, 0.6);
  S.quad(pt3(-uh, yh, vh), pt3(uh, yh, vh), pt3(ul, yl, vl), pt3(-ul, yl, vl), COLORS.roof, upNorm);
  S.quad(pt3(-uh, yh - 0.06, vh), pt3(-ul, yl - 0.06, vl), pt3(ul, yl - 0.06, vl), pt3(uh, yh - 0.06, vh), soffitColor, [0, -1, 0]);
  for (const side of [-1, 1]) S.tri(pt3(side * uh, yh, vh), pt3(side * ul, yl, vl), pt3(side * ul, yl, vh), COLORS.roof, upNorm); // the hipped ends
  S.kind = KIND.PLAIN;
  S.beam(pt3(-ul, yl - 0.12, vl), pt3(ul, yl - 0.12, vl), 0.16, 0.24, COLORS.redDark); // its fascia
}

export function build({ S }) {
  const groundY = LAND_Y + rise(ORIGIN[0], ORIGIN[1]);
  const courtY = groundY + COURT_H;
  const floorY = groundY + FLOOR_H;

  buildCourtAndPlatform(S, groundY, courtY, floorY);
  buildColumnsAndWalls(S, floorY);
  buildRoofsAndLeanTo(S, floorY);

  S.kind = KIND.PLAIN;
  return null;
}
