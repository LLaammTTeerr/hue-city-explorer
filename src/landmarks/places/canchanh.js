import { KIND, hex, shade } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { rise } from '../../geo/terrain.js';

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

const O = [-1180.85, -64.2];
const F = [0.5978, 0.8016]; // toward Thái Hòa (its axis: places/thaihoa.js)
const U = [0.8016, -0.5978];
const A = Math.atan2(U[1], U[0]);
const W = (u, v) => [O[0] + U[0] * u + F[0] * v, O[1] + U[1] * u + F[1] * v];
const P3 = (u, y, v) => { const p = W(u, v); return [p[0], y, p[1]]; };

const STONE = hex('#9b998f'); // Thanh Hóa stone, blue-grey
const BRICK = hex('#6f665c'); // gạch vồ facing
// the court: red-brown brick (gạch Bát Tràng) with a pale blue-grey stone ngự đạo, as the court is paved today
// (Street View, user photosphere from the platform's front edge, 2026)
const PAVE = hex('#7e695e');
const PAVE2 = hex('#aeaea6');
const FLOOR = hex('#b8b0a0');
const RED = hex('#9a2a1e');
const RED_DK = hex('#6e1f17');
const GOLD = hex('#d2a43c');
const GLASS = hex('#3b4a50'); // the glazed upper panels of the door leaves (cửa pano kính)
const ENAMEL = [hex('#2f6aa3'), hex('#3d8a5c'), hex('#d8b23a'), hex('#e6dcc4')];
const ROOF = PAL.imperialRoof;
const RIDGE = hex('#f1d77a');

const PW = 44.5, PD = 35.3; // platform, OSM
const H_CT = 0.22, H_FL = 1.15; // court and floor above the ground: floor "nearly 1 m" above the court

export function build({ S }) {
  const G = LAND_Y + rise(O[0], O[1]);
  const CT = G + H_CT, FL = G + H_FL;
  const box = (u, v, y0, y1, w, d, col, o) => { const p = W(u, v); S.box(p[0], p[1], y0, y1, w, d, A, col, o); };
  const beam = (a, b, w, h, col) => S.beam(a, b, w, h, col);
  const paved0 = S.n;

  // ======== the court (sân bái mạng) ========
  S.kind = KIND.MASONRY;
  const cu0 = -33.2, cu1 = 33.8, cv0 = 18.3, cv1 = 46;
  box((cu0 + cu1) / 2, (cv0 + cv1) / 2, G - 0.3, CT, cu1 - cu0, cv1 - cv0, PAVE, { topKind: KIND.ROAD });
  box(0, (PD / 2 + cv0) / 2, G - 0.3, CT, PW, cv0 - PD / 2 + 0.05, PAVE, { topKind: KIND.ROAD }); // up to the platform
  box(0, (PD / 2 + cv1) / 2, CT, CT + 0.06, 3.6, cv1 - PD / 2, PAVE2, { topKind: KIND.ROAD }); // ngự đạo
  // stone kerbs along the open edges toward the Vu halls
  for (const u of [cu0 + 0.2, cu1 - 0.2]) box(u, (cv0 + cv1) / 2, CT, CT + 0.18, 0.35, cv1 - cv0, STONE);

  // ======== the platform ========
  // gạch vồ facing on a stone plinth, Thanh stone coping, the floor
  box(0, 0, G - 0.3, CT + 0.15, PW + 0.4, PD + 0.4, shade(STONE, 0.85), { topKind: KIND.ROAD });
  box(0, 0, G, FL - 0.16, PW, PD, BRICK, { topKind: KIND.ROAD });
  box(0, 0, FL - 0.18, FL + 0.01, PW + 0.25, PD + 0.25, shade(STONE, 1.08), { topKind: KIND.ROAD });
  box(0, 0, FL + 0.01, FL + 0.03, PW - 0.6, PD - 0.6, FLOOR, { topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;

  // ======== three flights at the front (OSM), 5 steps, with stone cheeks ========
  const flight = (u, w, n) => {
    const y0 = CT, y1 = FL, stepH = (y1 - y0) / n, tread = 0.4, v0 = PD / 2;
    S.kind = KIND.MASONRY;
    for (let k = 1; k <= n; k++) box(u, v0 + tread * (k - 0.5), y0 - 0.1, y1 - stepH * k + 0.001, w, tread, shade(STONE, 1.06), { topKind: KIND.ROAD });
    S.kind = KIND.PLAIN;
    for (const s of [-1, 1]) {
      const uu = u + s * (w / 2 + 0.22);
      box(uu, v0 + 0.2, y0, y1 + 0.3, 0.44, 0.5, STONE);
      beam(P3(uu, y1 + 0.18, v0 + 0.2), P3(uu, y0 + 0.2, v0 + tread * n + 0.1), 0.4, 0.4, STONE);
    }
  };
  flight(0, 4.2, 5);
  flight(-14.9, 3.2, 5);
  flight(14.9, 3.2, 5);
  (S.paved = S.paved || []).push([paved0, S.n]); // stone paving and platform: no trees, no houses (geo/city.js coverOf)

  // ======== columns on their stone bases: red lacquer with a gilt dragon band ========
  // 9 bays across, widest in the middle (the proportions of Thái Hòa, its twin in plan), 41 m between end columns
  const bayW = [3.4, 3.8, 4.8, 5.4, 6.2, 5.4, 4.8, 3.8, 3.4];
  const kW = 41 / bayW.reduce((a, b) => a + b, 0);
  const cu = [-20.5];
  for (const b of bayW) cu.push(cu[cu.length - 1] + b * kW);
  // front verandah, front hall, the join, main hall; then the mái lưa row
  const cv = [14.4, 11.4, 6.8, 3.0, -1.4, -6.2, -10.6, -13.4];
  const vL = -16.0;
  const CH = 4.3; // outer columns, floor to the eave plate
  const colTop = (i, j) => {
    const inner = i > 0 && i < 9;
    if (j === 3) return FL + 5.2; // under the valley between the two roofs
    if (j >= 4 && j <= 6 && inner && i > 1 && i < 8) return FL + 6.4; // the main hall's tall columns, up into the cổ diêm
    if ((j === 1 || j === 2) && inner) return FL + 5.0;
    return FL + CH;
  };
  S.kind = KIND.TIMBER;
  const col = (u, v, top, r, band) => {
    const p = W(u, v);
    S.box(p[0], p[1], FL, FL + 0.28, 0.9, 0.9, A, shade(STONE, 1.05)); // chân tảng
    S.cyl(p[0], p[1], FL + 0.28, top, r, r * 0.93, 8, RED, { cap: false });
    if (band) S.cyl(p[0], p[1], FL + 2.2, FL + 2.5, r + 0.005, r * 0.95, 8, GOLD, { cap: false });
  };
  for (let i = 0; i < 10; i++) for (let j = 0; j < 8; j++) col(cu[i], cv[j], colTop(i, j), 0.29, true);
  for (let i = 0; i < 10; i++) col(cu[i], vL, FL + 2.95, 0.2, false);
  // eave plates round the outer columns, and the mái lưa plate
  const yE = FL + CH - 0.15;
  for (const j of [0, 7]) beam(P3(cu[0], yE, cv[j]), P3(cu[9], yE, cv[j]), 0.34, 0.4, RED_DK);
  for (const i of [0, 9]) beam(P3(cu[i], yE, cv[0]), P3(cu[i], yE, cv[7]), 0.34, 0.4, RED_DK);
  beam(P3(cu[0], FL + 2.8, vL), P3(cu[9], FL + 2.8, vL), 0.24, 0.3, RED_DK);
  for (let i = 0; i < 10; i++) beam(P3(cu[i], FL + 2.8, vL), P3(cu[i], FL + 2.8, cv[7]), 0.2, 0.26, RED_DK);

  // ======== walls and doors ========
  // Front: the outer row stands free along a verandah; behind it the 7 middle bays are door leaves with glazed
  // upper panels under carved, gilt transoms (liên ba); the chái at each end is a lacquered board wall. Back: doors
  // in the 5 middle bays, under the mái lưa. Sides: board walls (vách ván), red lacquer with gilt framing.
  const doorRow = (v, from, to, h) => {
    const out = Math.sign(v);
    for (let i = from; i < to; i++) {
      const u0 = cu[i] + 0.3, u1 = cu[i + 1] - 0.3, w = u1 - u0, uc = (u0 + u1) / 2;
      box(uc, v, FL, FL + h, w, 0.14, shade(RED, 0.8));
      box(uc, v + out * 0.08, FL + h - 1.5, FL + h - 0.75, w, 0.03, GLASS);
      box(uc, v + out * 0.08, FL + h - 0.7, FL + h - 0.5, w, 0.04, GOLD); // the gilt rail above the leaves
      const leaves = Math.max(2, Math.round(w / 0.85));
      for (let k = 1; k < leaves; k++) box(u0 + (w * k) / leaves, v + out * 0.09, FL, FL + h - 0.7, 0.06, 0.04, RED_DK);
      box(uc, v, FL + h, FL + CH - 0.3, w, 0.12, RED_DK); // the transom
      box(uc, v + out * 0.07, FL + h + 0.15, FL + CH - 0.45, w * 0.8, 0.04, shade(GOLD, 0.8));
    }
  };
  const board = (u, v, w, d, h) => {
    box(u, v, FL, FL + h, w, d, shade(RED, 0.85));
    box(u, v, FL + 0.9, FL + 1.0, w + 0.02, d + 0.02, GOLD); // gilt rails framing the panels
    box(u, v, FL + h - 0.5, FL + h - 0.4, w + 0.02, d + 0.02, GOLD);
  };
  doorRow(cv[1], 1, 8, 3.1);
  doorRow(cv[7] + 0.1, 2, 7, 3.1);
  for (const s of [-1, 1]) {
    const i0 = s < 0 ? 0 : 8;
    board((cu[i0] + cu[i0 + 1]) / 2, cv[1], cu[i0 + 1] - cu[i0] - 0.5, 0.2, CH - 0.3);
    for (const i of s < 0 ? [0, 1] : [7, 8]) board((cu[i] + cu[i + 1]) / 2, cv[7] + 0.1, cu[i + 1] - cu[i] - 0.5, 0.2, CH - 0.3);
    board(s * 20.5, (cv[1] + cv[7]) / 2, 0.22, cv[1] - cv[7], CH - 0.3);
  }
  // the interior: a dark lid under the roofs (seen through the doors and from below the eaves)
  box(0, 0, FL + CH - 0.3, FL + CH - 0.1, 40.6, 28.4, shade(RED_DK, 0.6), { bottom: true });

  // ======== roofs: yellow glazed cylinder tiles (ngói ống hoàng lưu ly) ========
  S.kind = KIND.PLAIN;
  const roofOpt = { flare: 0.55, fascia: 0.32, fasciaCol: RED_DK, ridgeCol: RIDGE, hips: true, glazed: true, segs: 4 };
  const SPAN = 41;
  // front hall: one hip roof over the verandah and the 7 + 2 bays, its back slope dropping into the valley
  const fhV = (cv[0] + cv[3]) / 2, fhD = cv[0] - cv[3], fhH = 2.9;
  { const p = W(0, fhV); S.hip(p[0], p[1], SPAN, fhD, A, FL + CH, fhH, ROOF, { ...roofOpt, over: 1.9 }); }
  // main hall: the lower skirt round the whole of it...
  const mhV = (cv[3] + cv[7]) / 2, mhD = cv[3] - cv[7];
  { const p = W(0, mhV); S.hip(p[0], p[1], SPAN, mhD, A, FL + CH, 1.9, ROOF, { ...roofOpt, ridgeCol: null, over: 1.9 }); }
  // ...the cổ diêm band above it, a brick band in dark red round enamelled poem panels...
  const iu = 32, iv = cv[4] - cv[6] + 2.2, iVc = (cv[4] + cv[6]) / 2, yd0 = FL + 5.6, yd1 = FL + 6.5;
  S.kind = KIND.MASONRY;
  box(0, iVc, FL + 5.0, yd1, iu, iv, RED_DK, { top: shade(ROOF, 0.8) });
  S.kind = KIND.PLAIN;
  {
    const n = 14, m = 5;
    for (let k = 0; k < n; k++) for (const s of [-1, 1]) {
      const u = -iu / 2 + (iu * (k + 0.5)) / n;
      box(u, iVc + s * (iv / 2 + 0.03), yd0 + 0.15, yd1 - 0.15, iu / n - 0.5, 0.05, ENAMEL[k % 3]);
    }
    for (let k = 0; k < m; k++) for (const s of [-1, 1]) {
      const v = iVc - iv / 2 + (iv * (k + 0.5)) / m;
      box(s * (iu / 2 + 0.03), v, yd0 + 0.15, yd1 - 0.15, 0.05, iv / m - 0.5, ENAMEL[(k + 1) % 3]);
    }
  }
  // ...and the upper hip roof, a little steeper than Thái Hòa's: the main columns are up to 9.4 m long
  const upH = 3.2;
  { const p = W(0, iVc); S.hip(p[0], p[1], iu, iv, A, yd1, upH, ROOF, { ...roofOpt, over: 1.6 }); }
  const ridgeY = yd1 + upH + 0.3;
  // the main ridge: a gilt flaming disc between two enamelled dragons (lưỡng long chầu nhật)
  {
    const sv = iVc, r = 0.55, yc = ridgeY + 0.55, seg = 10;
    for (let k = 0; k < seg; k++) {
      const a0 = (k / seg) * Math.PI * 2, a1 = ((k + 1) / seg) * Math.PI * 2;
      for (const s of [-1, 1]) S.tri(P3(0, yc, sv + s * 0.06), P3(Math.cos(a0) * r, yc + Math.sin(a0) * r, sv + s * 0.06), P3(Math.cos(a1) * r, yc + Math.sin(a1) * r, sv + s * 0.06), GOLD, [F[0] * s, 0, F[1] * s]);
    }
    box(0, sv, ridgeY + 0.1, ridgeY + 0.3, 0.5, 0.3, GOLD);
    for (const s of [-1, 1]) {
      let prev = null;
      for (let k = 0; k <= 8; k++) {
        const u = s * (0.9 + k * 0.42), y = ridgeY + 0.25 + 0.28 * Math.sin(k * 1.2) + (k === 0 ? 0.35 : 0);
        const q = P3(u, y, sv);
        if (prev) beam(prev, q, 0.22, 0.24, k < 2 ? GOLD : ENAMEL[1]);
        prev = q;
      }
    }
  }
  // the front hall's ridge: a row of enamelled ô hộc panels, the middle one yellow, and pháp lam on the front roof
  {
    const fy = FL + CH + fhH + 0.3, n = 9;
    for (let k = 0; k < n; k++) {
      const u = -9 + (18 * (k + 0.5)) / n;
      for (const s of [-1, 1]) box(u, fhV + s * 0.33, fy - 0.05, fy + 0.3, 18 / n - 0.35, 0.04, k === 4 ? ENAMEL[2] : ENAMEL[k % 2]);
    }
  }
  // the valley between the two roofs: S.joined lays its gutter (places/index.js)

  // ======== the mái lưa: a glazed lean-to over the back row, tucked under the skirt's eave ========
  {
    S.kind = KIND.GLAZED;
    const vh = cv[7] + 0.1, vl = vL - 1.2, yh = FL + 3.65, yl = FL + 2.7, uh = 20.5, ul = 21.9;
    const up = [0, 1, 0], SOFFIT = shade(RED_DK, 0.6);
    S.quad(P3(-uh, yh, vh), P3(uh, yh, vh), P3(ul, yl, vl), P3(-ul, yl, vl), ROOF, up);
    S.quad(P3(-uh, yh - 0.06, vh), P3(-ul, yl - 0.06, vl), P3(ul, yl - 0.06, vl), P3(uh, yh - 0.06, vh), SOFFIT, [0, -1, 0]);
    for (const s of [-1, 1]) S.tri(P3(s * uh, yh, vh), P3(s * ul, yl, vl), P3(s * ul, yl, vh), ROOF, up); // the hipped ends
    S.kind = KIND.PLAIN;
    beam(P3(-ul, yl - 0.12, vl), P3(ul, yl - 0.12, vl), 0.16, 0.24, RED_DK); // its fascia
  }
  S.kind = KIND.PLAIN;
  return null;
}
