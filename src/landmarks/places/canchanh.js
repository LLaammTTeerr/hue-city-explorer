import { KIND, hex, shade } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { rise } from '../../geo/terrain.js';

// Điện Cần Chánh, Tử Cấm Thành: the hall of daily audience, razed in February 1947, rebuilt since April 2025 on
// its old foundation. Drawn as it stands in late 2026: the restored platform, its three front flights, the stone
// column bases and the lim timber frame standing on them (about 60 % up in mid-August 2026, roof framing from
// October), with no tiles yet; and the paved court (sân bái mạng) between the Tả Vu and Hữu Vu halls.
// Sources and estimates: docs/places/canchanh.md.
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
const BRICK = hex('#6f665c'); // gạch vồ facing, old and re-laid
const PAVE = hex('#a39c8e');
const PAVE2 = hex('#b2ab9c');
const FLOOR = hex('#b8b0a0'); // the new floor on the reinforced slab
const LIM = hex('#6a4430'); // raw lim (ironwood), not yet lacquered
const LIM_DK = hex('#4e3223');
const LIM_NEW = hex('#8a6244'); // freshly planed rafters and purlins

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
  // gạch vồ facing on a stone plinth, Thanh stone coping, the new floor
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

  // ======== columns on their stone bases ========
  // 9 bays across, widest in the middle (the proportions of Thái Hòa, its twin in plan), 41 m between end columns
  const bayW = [3.4, 3.8, 4.8, 5.4, 6.2, 5.4, 4.8, 3.8, 3.4];
  const kW = 41 / bayW.reduce((a, b) => a + b, 0);
  const cu = [-20.5];
  for (const b of bayW) cu.push(cu[cu.length - 1] + b * kW);
  // front verandah, front hall, the join, main hall; then the mái lưa row
  const cv = [14.4, 11.4, 6.8, 3.0, -1.4, -6.2, -10.6, -13.4];
  const vL = -16.0;
  const CH = 4.3;
  const colTop = (i, j) => {
    const inner = i > 0 && i < 9;
    if (j === 3) return FL + 5.2;
    if (j >= 4 && j <= 6 && inner && i > 1 && i < 8) return FL + 6.4;
    if ((j === 1 || j === 2) && inner) return FL + 5.0;
    return FL + CH;
  };
  S.kind = KIND.TIMBER;
  const col = (u, v, top, r) => {
    const p = W(u, v);
    S.box(p[0], p[1], FL, FL + 0.28, 0.9, 0.9, A, shade(STONE, 1.05)); // chân tảng
    S.cyl(p[0], p[1], FL + 0.28, top, r, r * 0.93, 8, LIM, { cap: false });
  };
  for (let i = 0; i < 10; i++) for (let j = 0; j < 8; j++) col(cu[i], cv[j], colTop(i, j), 0.29);
  for (let i = 0; i < 10; i++) col(cu[i], vL, FL + 3.2, 0.2);

  // ======== the frame: plates, tie beams and the trusses' king posts ========
  const yE = FL + CH - 0.15;
  // eave plates round the outer columns, and the mái lưa plate
  for (const j of [0, 7]) beam(P3(cu[0], yE, cv[j]), P3(cu[9], yE, cv[j]), 0.32, 0.4, LIM_DK);
  for (const i of [0, 9]) beam(P3(cu[i], yE, cv[0]), P3(cu[i], yE, cv[7]), 0.32, 0.4, LIM_DK);
  beam(P3(cu[0], FL + 3.05, vL), P3(cu[9], FL + 3.05, vL), 0.24, 0.3, LIM_DK);
  // plates along the inner rows at their tops
  for (const j of [1, 2]) beam(P3(cu[1], FL + 4.85, cv[j]), P3(cu[8], FL + 4.85, cv[j]), 0.3, 0.36, LIM_DK);
  beam(P3(cu[0], FL + 5.05, cv[3]), P3(cu[9], FL + 5.05, cv[3]), 0.34, 0.4, LIM_DK);
  for (const j of [4, 6]) beam(P3(cu[2], FL + 6.25, cv[j]), P3(cu[7], FL + 6.25, cv[j]), 0.3, 0.36, LIM_DK);
  // tie beams (xà) front to back on every column line
  for (let i = 0; i < 10; i++) {
    const inner = i > 0 && i < 9, tall = i > 1 && i < 8;
    beam(P3(cu[i], yE, cv[0]), P3(cu[i], yE, cv[1]), 0.26, 0.36, LIM);
    beam(P3(cu[i], yE, cv[7]), P3(cu[i], yE, cv[6]), 0.26, 0.36, LIM);
    beam(P3(cu[i], FL + 3.05, cv[7]), P3(cu[i], FL + 3.05, vL), 0.2, 0.26, LIM);
    if (inner) {
      beam(P3(cu[i], FL + 4.85, cv[1]), P3(cu[i], FL + 4.85, cv[3]), 0.28, 0.38, LIM);
      beam(P3(cu[i], FL + 5.05, cv[3]), P3(cu[i], FL + 5.05, cv[6]), 0.28, 0.38, LIM);
    }
    if (tall) beam(P3(cu[i], FL + 6.25, cv[4]), P3(cu[i], FL + 6.25, cv[6]), 0.28, 0.38, LIM);
  }

  // ======== roof framing, going up from October 2026: principal rafters and purlins, no battens or tiles ========
  // front hall: eave plate (cv0, cv3 side) to a ridge over the middle of the front hall
  const fhV = (cv[0] + cv[3]) / 2, ridgeF = FL + CH + 2.9;
  const over = 1.6; // eave overhang
  const rafterLine = (u, va, ya, vb, yb) => beam(P3(u, ya, va), P3(u, yb, vb), 0.16, 0.22, LIM_NEW);
  for (let i = 0; i < 10; i++) {
    rafterLine(cu[i], cv[0] + over, yE - 0.55, fhV, ridgeF);
    rafterLine(cu[i], cv[3] - 0.2, FL + 5.2, fhV, ridgeF);
  }
  // purlins (đòn tay) along the front slope and the ridge
  for (const t of [0, 0.33, 0.66, 1]) {
    const v = cv[0] + over + (fhV - cv[0] - over) * t, y = yE - 0.55 + (ridgeF - yE + 0.55) * t;
    beam(P3(cu[0] - 1.2, y + 0.15, v), P3(cu[9] + 1.2, y + 0.15, v), 0.14, 0.14, LIM_NEW);
  }
  // main hall: the lower skirt from the back eave up to the cổ diêm, its posts, and the upper roof's rafters
  const yD = FL + 6.5, iVc = (cv[4] + cv[6]) / 2, ridgeM = yD + 2.85;
  for (let i = 0; i < 10; i++) {
    rafterLine(cu[i], cv[7] - over, yE - 0.55, cv[6], FL + 5.6);
    if (i > 1 && i < 8) {
      rafterLine(cu[i], cv[4] + 1.1, yD, iVc, ridgeM);
      rafterLine(cu[i], cv[6] - 1.1, yD, iVc, ridgeM);
    }
  }
  beam(P3(cu[2] - 0.6, ridgeM + 0.12, iVc), P3(cu[7] + 0.6, ridgeM + 0.12, iVc), 0.24, 0.3, LIM_NEW); // main ridge beam
  beam(P3(cu[0] - 1.2, ridgeF + 0.12, fhV), P3(cu[9] + 1.2, ridgeF + 0.12, fhV), 0.24, 0.3, LIM_NEW); // front ridge beam
  for (const t of [0.4, 0.75]) {
    const v = cv[7] - over + (cv[6] - cv[7] + over) * t, y = yE - 0.55 + (FL + 5.6 - yE + 0.55) * t;
    beam(P3(cu[0] - 1.2, y + 0.15, v), P3(cu[9] + 1.2, y + 0.15, v), 0.14, 0.14, LIM_NEW);
  }
  // the cổ diêm frame: plates round the upper storey at its foot and head
  for (const y of [FL + 5.6, yD]) {
    beam(P3(cu[2], y, cv[4] + 1.1), P3(cu[7], y, cv[4] + 1.1), 0.22, 0.28, LIM_DK);
    beam(P3(cu[2], y, cv[6] - 1.1), P3(cu[7], y, cv[6] - 1.1), 0.22, 0.28, LIM_DK);
  }
  S.kind = KIND.PLAIN;
  return null;
}
