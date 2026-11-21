import { Buf, KIND, hex, shade } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { lightMaterial, glowPoints } from '../../geo/materials.js';
import { vac, crane, kylan } from '../props.js';

// Điện Thái Hòa (Throne Palace) with sân Đại Triều Nghi and cầu Trung Đạo over hồ Thái Dịch, as restored in
// 2021-2024 (reopened 23 Nov 2024). Sources and estimates: docs/places/thaihoa.md.
//
// Plan (trùng thiềm điệp ốc): a front hall (tiền điện, 7 gian 2 chái) and a deeper main hall (chính điện,
// 5 gian 2 chái kép) under joined roofs of yellow glazed tiles, with a bronze valley gutter between them. 80 lim
// columns, red lacquered: 10 across (9 bays) by 8 deep. The main hall has a double roof: a lower skirt, the cổ diêm
// band of enamelled poem panels, the upper hip roof with "two dragons facing the sun" on its ridge.
// The hall floor is 2.35 m above the ground and 1 m above the first terrace (khamphahue.com.vn); from the back,
// 9 steps up the lower base and 5 up the upper one; the esplanade's two terraces (Long Trì, Đan Bệ) together 9.
// Ridge 11.8 m (docs/heights-reference.json).
//
// Frame: u across the hall (north-east), v from the hall toward Ngọ Môn (south-east); origin on the axis at the
// hall's centre. From OSM: way 531031566 (hall, 44.8 × 32.1 m), 285990342 (sân Đại Triều Nghi, 41 × 41 m),
// 619851682 (cầu Trung Đạo, 51 × 8.9 m), 173640276 (hồ Thái Dịch). The hall outline sits 1.4 m off the axis that
// the esplanade, the bridge and Ngọ Môn share; the axis here splits the difference.
export const id = 'thaihoa';

const O = [-1118.6, 17.4];
const F = [0.5978, 0.8016]; // toward Ngọ Môn
const U = [0.8016, -0.5978];
const A = Math.atan2(U[1], U[0]);
const W = (u, v) => [O[0] + U[0] * u + F[0] * v, O[1] + U[1] * u + F[1] * v];
const P3 = (u, y, v) => { const p = W(u, v); return [p[0], y, p[1]]; };

const STONE = hex('#9b998f'); // Thanh Hóa stone, blue-grey
const PAVE = hex('#a8a296');
const PAVE2 = hex('#b4ad9f');
const RED = hex('#9a2a1e');
const RED_DK = hex('#6e1f17');
const GOLD = hex('#d2a43c');
const BRONZE = hex('#5d4a31');
const ENAMEL = [hex('#2f6aa3'), hex('#3d8a5c'), hex('#d8b23a'), hex('#e6dcc4')];
const ROOF = PAL.imperialRoof;
const RIDGE = hex('#f1d77a');
const WALL = hex('#c9a36a'); // ochre-painted brick of the gable and back walls

// levels above the ground: Long Trì 0.6, Đan Bệ and the hall's lower base 1.35, hall floor 2.35
const H_LT = 0.6, H_DB = 1.35, H_FL = 2.35;

export function build({ S, group, THREE }) {
  const G = LAND_Y + rise(O[0], O[1]);
  const FL = G + H_FL;
  const box = (u, v, y0, y1, w, d, col, o) => { const p = W(u, v); S.box(p[0], p[1], y0, y1, w, d, A, col, o); };
  const beam = (a, b, w, h, col) => S.beam(a, b, w, h, col);
  const L = new Buf(1200); // night light strips
  const lamps = [], lampCol = [];
  const lamp = (u, y, v) => { const p = W(u, v); lamps.push(p[0], y, p[1]); lampCol.push(1.0, 0.72, 0.36); };

  // flight of n steps rising toward -dir (dir = +1: the flight comes down toward +v), centred at u, from level y0
  // (bottom) to y1 (top), the top edge at v = vEdge; with stone cheek walls either side
  const flight = (u, vEdge, dir, y0, y1, n, w, { cheeks = true, dragons = false } = {}) => {
    const stepH = (y1 - y0) / n, tread = 0.36;
    S.kind = KIND.MASONRY;
    for (let k = 1; k < n + 1; k++) box(u, vEdge + dir * tread * (k - 0.5), y0 - 0.2, y1 - stepH * k + 0.001, w, tread, shade(STONE, 1.06), { topKind: KIND.ROAD });
    S.kind = KIND.PLAIN;
    if (!cheeks) return;
    const run = tread * n;
    for (const s of [-1, 1]) {
      const uu = u + s * (w / 2 + 0.22);
      box(uu, vEdge + dir * 0.2, y0 - 0.2, y1 + 0.3, 0.44, 0.5, STONE);
      beam(P3(uu, y1 + 0.18, vEdge + dir * 0.2), P3(uu, y0 + 0.2, vEdge + dir * (run + 0.1)), 0.4, 0.4, STONE);
      if (dragons) beam(P3(uu, y1 + 0.5, vEdge + dir * 0.3), P3(uu, y0 + 0.55, vEdge + dir * (run - 0.1)), 0.26, 0.3, shade(STONE, 1.12)); // the stone dragon on the balustrade
    }
  };

  // ======== sân Đại Triều Nghi ========
  // v from the hall's lower base (20) to the bridge apron (57.5); 41 m wide. Đan Bệ (ranks 1-3) above, Long Trì
  // (ranks 4-9) below, a raised imperial way (ngự đạo) up the middle.
  const EW = 41;
  const vDB0 = 20, vDB1 = 33, vLT1 = 57.5;
  const paved0 = S.n;
  S.kind = KIND.MASONRY;
  box(0, (vDB0 + vDB1) / 2, G - 0.3, G + H_DB, EW, vDB1 - vDB0, PAVE, { topKind: KIND.ROAD });
  box(0, (vDB1 + vLT1) / 2, G - 0.3, G + H_LT, EW, vLT1 - vDB1, PAVE2, { topKind: KIND.ROAD });
  // the imperial way, a shade lighter and a hand higher
  box(0, (vDB0 + vDB1) / 2, G + H_DB, G + H_DB + 0.08, 3.4, vDB1 - vDB0, shade(PAVE, 1.12), { topKind: KIND.ROAD });
  box(0, (vDB1 + vLT1) / 2 - 0.6, G + H_LT, G + H_LT + 0.08, 3.4, vLT1 - vDB1 - 1.2, shade(PAVE2, 1.1), { topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;
  // steps: Long Trì → Đan Bệ (5) in three flights, the middle one between dragon balustrades; ground → Long Trì (4)
  for (const u of [-12, 0, 12]) flight(u, vDB1, 1, G + H_LT, G + H_DB, 5, u === 0 ? 3.4 : 3.0, { dragons: u === 0 });
  for (const u of [-12, 0, 12]) flight(u, vLT1, 1, G, G + H_LT, 4, u === 0 ? 3.4 : 3.0, { dragons: u === 0 });
  // low stone kerbs along the open sides of both terraces
  for (const s of [-1, 1]) {
    box(s * (EW / 2 - 0.2), (vDB0 + vDB1) / 2, G + H_DB, G + H_DB + 0.45, 0.4, vDB1 - vDB0, STONE);
    box(s * (EW / 2 - 0.2), (vDB1 + vLT1) / 2, G + H_LT, G + H_LT + 0.3, 0.4, vLT1 - vDB1, STONE);
  }
  for (const [a, b] of [[-EW / 2, -13.7], [-10.3, -1.9], [1.9, 10.3], [13.7, EW / 2]]) box((a + b) / 2, vDB1 - 0.2, G + H_DB, G + H_DB + 0.45, b - a, 0.4, STONE);
  // the rank stones (phẩm sơn): chánh and tòng for each rank, civil on one side of the way, military on the other —
  // 6 a side on Đan Bệ, 12 a side on Long Trì, 18 pairs in all
  const stele = (u, v, y) => {
    box(u, v, y, y + 0.12, 0.62, 0.36, shade(STONE, 0.9));
    box(u, v, y + 0.12, y + 0.95, 0.46, 0.2, hex('#c7c1b2'));
    box(u, v, y + 0.95, y + 1.05, 0.34, 0.2, hex('#c7c1b2'));
  };
  for (const s of [-1, 1]) {
    for (let k = 0; k < 6; k++) stele(s * 4.6, vDB0 + 1.6 + k * 1.95, G + H_DB);
    for (let k = 0; k < 12; k++) stele(s * 4.6, vDB1 + 2.4 + k * 1.85, G + H_LT);
  }
  (S.paved = S.paved || []).push([paved0, S.n]); // stone paving: no trees, no houses (src/geo/city.js coverOf)
  // one bronze cauldron (vạc đồng, cast under the Nguyễn lords) on the hall's left, the east (khamphahue: "on the left
  // side of the Thái Hòa Palace"); its spot on Đan Bệ is estimated. No source gives a second vạc or any censer here.
  { const p = W(15, vDB0 + 6.5); vac(S, p[0], G + H_DB, p[1], A, { d: 1.9, col: BRONZE }); }
  // a pair of kỳ lân in front of the hall (Frommers: "In front are two mythical ky lin animals"), bronze, either side
  // of the foot of the middle flight, facing out toward Ngọ Môn; material, pose and spot are estimated.
  // src/landmarks/props.js; docs/places/courtyard-objects.md
  for (const s of [-1, 1]) { const p = W(s * 4.3, 19.4); kylan(S, p[0], G + H_DB, p[1], A + Math.PI / 2, { s: 1.0, col: BRONZE, plinth: 0.55, plinthCol: STONE }); }

  // ======== the hall's two-stage base ========
  // the lower base at Đan Bệ's level all round (9 steps up at the back), the stone platform 1 m above it
  const PW = 46.5, PD = 34;
  S.kind = KIND.MASONRY;
  box(0, 0, G - 0.3, G + H_DB, PW + 7, 40, STONE, { topKind: KIND.ROAD, taper: 0.995 });
  box(0, 0, G + H_DB, FL, PW, PD, shade(STONE, 0.96), { topKind: KIND.ROAD });
  box(0, 0, FL - 0.18, FL + 0.02, PW + 0.3, PD + 0.3, shade(STONE, 1.1), { topKind: KIND.ROAD }); // the coping
  S.kind = KIND.PLAIN;
  // three flights front and back up the platform (5 steps), three down the back of the lower base (9)
  for (const u of [-13, 0, 13]) {
    flight(u, PD / 2, 1, G + H_DB, FL, 5, u === 0 ? 4.2 : 3.2, { dragons: u === 0 });
    flight(u, -PD / 2, -1, G + H_DB, FL, 5, u === 0 ? 4.2 : 3.2, { dragons: u === 0 });
    flight(u, -20, -1, G, G + H_DB, 9, u === 0 ? 4.2 : 3.2);
  }

  // ======== columns ========
  // 9 bays across, widest in the middle; 7 spaces deep: front verandah, front hall, the join, the main hall
  const bayW = [3.4, 3.8, 4.8, 5.4, 6.2, 5.4, 4.8, 3.8, 3.4];
  const kW = 43 / bayW.reduce((a, b) => a + b, 0);
  const cu = [-21.5];
  for (const b of bayW) cu.push(cu[cu.length - 1] + b * kW);
  const cv = [15.25, 12.05, 7.05, 3.05, -1.75, -7.15, -11.95, -15.25];
  const CH = 4.3; // outer columns, floor to the eave plate
  const colTop = (i, j) => {
    const inner = i > 0 && i < 9;
    if (j === 3) return FL + 5.2; // under the valley between the two roofs
    if (j >= 4 && j <= 6 && inner && i > 1 && i < 8) return FL + 6.4; // the main hall's tall inner columns
    if ((j === 1 || j === 2) && inner) return FL + 5.0;
    return FL + CH;
  };
  S.kind = KIND.TIMBER;
  for (let i = 0; i < 10; i++) for (let j = 0; j < 8; j++) {
    const p = W(cu[i], cv[j]), top = colTop(i, j);
    S.cyl(p[0], p[1], FL, FL + 0.3, 0.46, 0.42, 8, shade(STONE, 1.05), { cap: false }); // the stone base
    S.cyl(p[0], p[1], FL + 0.3, top, 0.3, 0.28, 8, RED, { cap: false });
    S.cyl(p[0], p[1], FL + 2.2, FL + 2.5, 0.305, 0.3, 8, GOLD, { cap: false }); // a gilded dragon band
  }
  // the crane and tortoise statues inside the hall (Frommers: "the statues of the heron and turtle inside the palace's
  // ornate lacquered interior"): drawn as a bronze pair of cranes on tortoises either side of the throne in the main
  // hall's middle bay, facing out; count, material, size and spot are estimated
  for (const s of [-1, 1]) { const p = W(s * 2.3, -3.2); crane(S, p[0], FL, p[1], A + Math.PI / 2, { h: 1.8 }); }
  S.kind = KIND.TIMBER;
  // the eave plates along the outer column lines
  for (const j of [0, 7]) beam(P3(cu[0], FL + CH - 0.15, cv[j]), P3(cu[9], FL + CH - 0.15, cv[j]), 0.34, 0.4, RED_DK);
  for (const i of [0, 9]) beam(P3(cu[i], FL + CH - 0.15, cv[0]), P3(cu[i], FL + CH - 0.15, cv[7]), 0.34, 0.4, RED_DK);

  // ======== walls and doors ========
  // the front: the outer row stands free along a verandah; behind it, the 7 middle bays are door leaves (52 in all),
  // the end bays solid. Gables and the back are walled, with doors in the middle bays at the back.
  S.kind = KIND.TIMBER;
  const doorRow = (v, from, to, h) => {
    for (let i = from; i < to; i++) {
      const u0 = cu[i] + 0.3, u1 = cu[i + 1] - 0.3, w = u1 - u0, uc = (u0 + u1) / 2;
      box(uc, v, FL, FL + h, w, 0.14, shade(RED, 0.8));
      box(uc, v + Math.sign(v) * 0.08, FL + h - 0.7, FL + h - 0.5, w, 0.04, GOLD); // the gilt rail above the leaves
      const leaves = Math.max(2, Math.round(w / 0.85));
      for (let k = 1; k < leaves; k++) box(u0 + (w * k) / leaves, v + Math.sign(v) * 0.08, FL, FL + h - 0.7, 0.06, 0.04, RED_DK);
      box(uc, v, FL + h, FL + CH - 0.3, w, 0.12, RED_DK); // the transom of carved, gilt panels
      box(uc, v + Math.sign(v) * 0.07, FL + h + 0.15, FL + CH - 0.45, w * 0.8, 0.04, shade(GOLD, 0.8));
    }
  };
  doorRow(cv[1], 1, 8, 3.1);
  doorRow(cv[7] + 0.1, 2, 7, 3.1);
  // solid end bays at the front and back, and the gable walls
  for (const s of [-1, 1]) {
    const i0 = s < 0 ? 0 : 8;
    box((cu[i0] + cu[i0 + 1]) / 2, cv[1], FL, FL + CH - 0.3, cu[i0 + 1] - cu[i0] - 0.5, 0.3, WALL);
    for (const i of s < 0 ? [0, 1] : [7, 8]) box((cu[i] + cu[i + 1]) / 2, cv[7] + 0.1, FL, FL + CH - 0.3, cu[i + 1] - cu[i] - 0.5, 0.3, WALL);
    box(s * 21.5, (cv[1] + cv[7]) / 2, FL, FL + CH - 0.3, 0.34, cv[1] - cv[7], WALL);
    // the round windows with the character Thọ, 1.4 m across, in the gable walls of the front hall
    const p = W(s * 21.68, (cv[1] + cv[3]) / 2);
    S.cyl(p[0], p[1], FL + 1.6, FL + 1.62, 0.7, 0.7, 10, GOLD, { cap: true });
  }
  // the interior: a dark lid under the roofs (seen through the doors and from below the eaves)
  box(0, 0, FL + CH - 0.3, FL + CH - 0.1, 42.6, 30, shade(RED_DK, 0.6), { bottom: true });

  // ======== roofs ========
  S.kind = KIND.PLAIN;
  const roofOpt = { flare: 0.55, fascia: 0.32, fasciaCol: RED_DK, ridgeCol: RIDGE, hips: true, glazed: true, segs: 4 };
  // front hall: one hip roof over the verandah and the 7 + 2 bays, its back slope dropping into the valley
  const fhV = (cv[0] + cv[3]) / 2, fhD = cv[0] - cv[3];
  { const p = W(0, fhV); S.hip(p[0], p[1], 43, fhD, A, FL + CH, 2.9, ROOF, { ...roofOpt, over: 1.9 }); }
  // main hall: the lower skirt round the whole of it...
  const mhV = (cv[3] + cv[7]) / 2, mhD = cv[3] - cv[7];
  { const p = W(0, mhV); S.hip(p[0], p[1], 43, mhD, A, FL + CH, 1.9, ROOF, { ...roofOpt, ridgeCol: null, over: 1.9 }); }
  // ...the cổ diêm band above it, dark red framing round enamelled poem panels...
  const iu = 33.6, iv = cv[4] - cv[6] + 2.2, iVc = (cv[4] + cv[6]) / 2, yd0 = FL + 5.6, yd1 = FL + 6.5;
  S.kind = KIND.TIMBER;
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
  // ...and the upper hip roof. Ridge at about 11.8 m above the ground.
  const upH = 2.85;
  { const p = W(0, iVc); S.hip(p[0], p[1], iu, iv, A, yd1, upH, ROOF, { ...roofOpt, over: 1.6 }); }
  const ridgeY = yd1 + upH + 0.3;
  // "two dragons facing the sun" (lưỡng long chầu nhật) on the main ridge: a flaming disc and two enamelled dragons
  {
    const sunU = 0, sv = iVc, r = 0.55, yc = ridgeY + 0.55, seg = 10;
    for (let k = 0; k < seg; k++) {
      const a0 = (k / seg) * Math.PI * 2, a1 = ((k + 1) / seg) * Math.PI * 2;
      for (const s of [-1, 1]) S.tri(P3(sunU, yc, sv + s * 0.06), P3(sunU + Math.cos(a0) * r, yc + Math.sin(a0) * r, sv + s * 0.06), P3(sunU + Math.cos(a1) * r, yc + Math.sin(a1) * r, sv + s * 0.06), GOLD, [F[0] * s, 0, F[1] * s]);
    }
    box(sunU, sv, ridgeY + 0.1, ridgeY + 0.3, 0.5, 0.3, GOLD);
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
  // the front hall's ridge: a row of enamelled panels, the middle one (Thổ) yellow
  {
    const fy = FL + CH + 2.9 + 0.3, n = 9;
    for (let k = 0; k < n; k++) {
      const u = -9 + (18 * (k + 0.5)) / n;
      for (const s of [-1, 1]) box(u, fhV + s * 0.33, fy - 0.05, fy + 0.3, 18 / n - 0.35, 0.04, k === 4 ? ENAMEL[2] : ENAMEL[k % 2]);
    }
  }
  // the bronze valley gutter between the two roofs, spouting through two dragon mouths at the gables
  {
    const y = FL + CH + 0.55;
    beam(P3(-23.5, y, cv[3]), P3(23.5, y, cv[3]), 0.7, 0.4, BRONZE);
    for (const s of [-1, 1]) beam(P3(s * 23.3, y, cv[3]), P3(s * 24.6, y - 0.25, cv[3]), 0.45, 0.4, shade(BRONZE, 1.25));
  }

  // ======== cầu Trung Đạo over hồ Thái Dịch ========
  // 51 × 8.9 m (OSM), a brick-and-stone deck on piers, the emperor's lane raised in the middle, low openwork
  // parapets, a bronze ceremonial gate (nghi môn) at each end.
  const B0 = 68.7, B1 = 119.8, BW = 8.9, BL = B1 - B0, Bc = (B0 + B1) / 2, deck = G + 0.55;
  const water = G - 1.3;
  S.kind = KIND.MASONRY;
  box(0, Bc, deck - 0.55, deck, BW, BL, PAVE, { topKind: KIND.ROAD, bottom: true });
  box(0, Bc, deck, deck + 0.12, 3.6, BL, shade(PAVE, 1.12), { topKind: KIND.ROAD }); // ngự đạo
  for (const s of [-1, 1]) box(s * 1.85, Bc, deck, deck + 0.22, 0.12, BL, STONE);
  // abutments and piers down into the water
  box(0, B0 + 2.5, water - 0.6, deck - 0.5, BW, 5, shade(STONE, 0.85));
  box(0, B1 - 2.5, water - 0.6, deck - 0.5, BW, 5, shade(STONE, 0.85));
  for (let k = 1; k <= 6; k++) box(0, B0 + 5 + ((BL - 10) * k) / 7, water - 0.6, deck - 0.5, BW - 0.6, 1.0, shade(STONE, 0.85));
  // ground apron from the esplanade's foot to the bridge
  box(0, (vLT1 + B0 + 1) / 2, G - 0.3, G + 0.04, 12, B0 + 1 - vLT1 + 0.6, PAVE, { topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;
  // parapets: posts every 2.5 m with a rail and an openwork panel between
  const RAIL = hex('#d8cdb5');
  for (const s of [-1, 1]) {
    const u = s * (BW / 2 - 0.15), n = Math.round(BL / 2.5);
    for (let k = 0; k <= n; k++) box(u, B0 + (BL * k) / n, deck, deck + 0.95, 0.28, 0.28, RAIL);
    beam(P3(u, deck + 0.82, B0), P3(u, deck + 0.82, B1), 0.2, 0.16, RAIL);
    beam(P3(u, deck + 0.18, B0), P3(u, deck + 0.18, B1), 0.18, 0.16, RAIL);
    box(u, Bc, deck + 0.3, deck + 0.7, 0.06, BL, shade(RAIL, 0.8));
  }
  // nghi môn: two bronze posts with lotus finials either side of the imperial lane, a lintel with a name plaque
  const nghiMon = (v, y) => {
    for (const s of [-1, 1]) {
      const p = W(s * 2.3, v);
      S.box(p[0], p[1], y, y + 0.4, 0.75, 0.75, A, STONE);
      S.box(p[0], p[1], y + 0.4, y + 4.2, 0.34, 0.34, A, BRONZE);
      S.cyl(p[0], p[1], y + 4.2, y + 4.75, 0.28, 0.06, 6, shade(BRONZE, 1.3));
      for (const t of [-1, 1]) beam(P3(s * 2.3, y + 3.9, v), P3(s * 2.3 + t * 0.6, y + 3.4, v), 0.12, 0.12, shade(BRONZE, 1.2)); // brackets
    }
    box(0, v, y + 3.55, y + 3.85, 5.0, 0.24, BRONZE);
    box(0, v, y + 2.95, y + 3.55, 1.6, 0.14, GOLD); // the plaque
    box(0, v, y + 3.85, y + 4.0, 5.6, 0.32, shade(BRONZE, 1.2));
    lamp(-2.3, y + 4.3, v + 0.5); lamp(2.3, y + 4.3, v + 0.5);
  };
  nghiMon(B0 + 0.8, deck + 0.12);
  nghiMon(B1 - 0.8, deck + 0.12);

  // ======== night lighting ========
  // strips under the front eave of each roof and along the platform's coping; lanterns at the bridge, the steps
  const strip = (u0, u1, v, y) => L.beam(P3(u0, y, v), P3(u1, y, v), 0.14, 0.1, [1, 1, 1]);
  strip(-22.8, 22.8, cv[0] + 1.55, FL + CH - 0.42);
  strip(-15.9, 15.9, iVc + iv / 2 + 1.3, yd1 - 0.4);
  strip(-15.9, 15.9, iVc - iv / 2 - 1.3, yd1 - 0.4);
  strip(-22.8, 22.8, cv[7] - 1.55, FL + CH - 0.42);
  for (const s of [-1, 1]) for (let k = 0; k < 6; k++) lamp(s * (BW / 2 - 0.15), deck + 1.15, B0 + 6 + k * 8);
  for (const u of [-13, 13]) lamp(u, FL + 1.0, PD / 2 + 2.4);
  if (!group) return null;
  if (L.n) {
    const m = new THREE.Mesh(L.geometry(), lightMaterial(0xffae42, 1.2));
    m.renderOrder = 19;
    m.userData.landmark = true;
    group.add(m);
  }
  if (lamps.length) {
    const p = glowPoints(lamps, lampCol, 6);
    p.userData.glow = true;
    p.userData.landmark = true;
    group.add(p);
  }
  return null;
}
