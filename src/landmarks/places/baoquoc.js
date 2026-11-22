import { KIND, hex, shade, inRing } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { fence, roadsNear, buildingsNear } from '../enclosure.js';
import { glowPoints } from '../../geo/materials.js';

// ---- Chùa Báo Quốc, the pagoda on Hàm Long hill (Báo Quốc street, south bank) ----
//
// Sources (docs/places/baoquoc.md has the full list):
//  - en.wikipedia (Báo Quốc Temple): a 2 ha site on Hàm Long hill; a triple gate at the head of a stair, a spacious
//    court, the stupas on the left; four dragon-wrapped pillars in the main hall; Giác Phong's stupa (1714), 3.30 m.
//  - vinwonders.com: the halls stand in a 口 (chánh điện, tăng xá, nhà khách, nhà hậu) round an inner court; the gate
//    is reached up 15 stone steps; main hall 3 bays + 2 chái; 19 patriarchs' stupas, several tiers, lotus tops.
//  - mia.vn: trùng lương trùng thiềm (double-roofed) main hall; ancestral hall at the back.
//  - Wikimedia Commons, "Báo Quốc Temple, Huế" (2024 photos): dark, moss-stained three-arch gate with a two-tier
//    roof over the middle, red-tiled court, red-brick terrace with two stone lantern pillars, brown-red tiled roofs.
//  - OpenStreetMap: precinct (way 1170979640), main hall (239977720), the comb-shaped range behind it (239977717),
//    rear hall (239977719), small hall (239977718), long range (239977721).
// Estimated: every height, the gate's size and form, the terrace level, the stupas' layout and sizes.

// precinct outline (OSM amenity=monastery), metres in the model frame
const RING = [[-950.8, 1535.2], [-974.9, 1567.1], [-994.3, 1587.5], [-1001.3, 1593.6], [-1017.8, 1592], [-1037, 1589.7], [-1050, 1592.9], [-1060, 1603.2], [-1063.4, 1607.3], [-1065.3, 1613.9], [-1064.5, 1621.1], [-1061.2, 1628.7], [-1054, 1636.2], [-1050.2, 1644.1], [-1052.9, 1659.5], [-1050.8, 1671.2], [-1043.6, 1687], [-1038, 1693.4], [-1024.1, 1695.9], [-1009.2, 1696], [-997.9, 1698.7], [-980.6, 1705.1], [-970.6, 1706.4], [-947.8, 1697.3], [-934, 1685.4], [-910.1, 1665], [-899.5, 1650.6], [-893.8, 1640.6], [-894.2, 1625.3], [-903.2, 1609.1], [-911, 1593.1], [-919, 1581.5], [-915.7, 1556.3], [-914.6, 1540.8]];

const TILE = hex('#7d4a36'), RIDGE = hex('#6b3a2b'), WALL = hex('#d9b45a'), WOOD = hex('#4a3226');
const BRICK = hex('#8e4a3a'), PAVE = hex('#ad7f72'), STONE = PAL.stone, GREY = hex('#8f8c82');
const GATE = hex('#55554b'), GATE2 = hex('#64635a'), MOSS = PAL.moss, LAC = PAL.lacquer;
const STUPA = [hex('#9a978a'), hex('#a89a7a'), hex('#8a887c'), hex('#b2a483')];

export const id = 'baoquoc';

export function build({ data, S, group }) {
  // local frame: u toward the front (north-east, to the gate and the street), v across; the hall's axis is v = 45.2.
  // Re-framed from OSM: the mapped halls (ways 239977717-21) sit about 5.8 m south and 1.3 m east of where the
  // satellite shows them (the long range, the inner garden and the hall front all agree on the same shift), while the
  // precinct outline and the streets round it line up, so only the halls' frame moves (OSM had A = [-1035.6, 1624.6]).
  // The axis stays at 50 degrees east of north (OSM 49.9, satellite 48-50).
  const A = [-1036.9, 1618.9], U = [0.766, -0.643], V = [0.643, 0.766];
  const W = (u, v) => [A[0] + u * U[0] + v * V[0], A[1] + u * U[1] + v * V[1]];
  const T = (u, v) => rise(...W(u, v));
  const ang = Math.atan2(V[1], V[0]), angU = ang + Math.PI / 2; // box local x along v / along u
  const AX = 45.2;
  // terrain range under a rectangle
  const span = (u0, u1, v0, v1) => {
    let lo = 1e9, hi = -1e9;
    for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) {
      const t = T(u0 + ((u1 - u0) * i) / 4, v0 + ((v1 - v0) * j) / 4);
      lo = Math.min(lo, t); hi = Math.max(hi, t);
    }
    return [LAND_Y + lo, LAND_Y + hi];
  };
  // w across (along v), d along u
  const box = (u, v, ya, yb, w, d, col, o) => { const q = W(u, v); S.box(q[0], q[1], ya, yb, w, d, ang, col, o); };
  const roof = (u, v, w, d, ya, h, o) => { const q = W(u, v); S.hip(q[0], q[1], w, d, ang, ya, h, o?.col ?? TILE, { flare: 0.4, over: 0.9, fascia: 0.22, fasciaCol: shade(TILE, 0.7), ridgeCol: RIDGE, hips: true, segs: 3, ...o }); };
  const roofU = (u, v, len, wid, ya, h, o) => { const q = W(u, v); S.hip(q[0], q[1], len, wid, angU, ya, h, o?.col ?? TILE, { flare: 0.35, over: 0.8, fascia: 0.2, fasciaCol: shade(TILE, 0.7), ridgeCol: RIDGE, hips: true, segs: 3, ...o }); };
  const cyl = (u, v, ya, yb, r0, r1, n, col, o) => { const q = W(u, v); S.cyl(q[0], q[1], ya, yb, r0, r1, n, col, { rot: ang, ...o }); };
  const V3 = (u, v, y) => { const q = W(u, v); return [q[0], y, q[1]]; };
  const glowPos = [], glowCol = [];
  const glow = (u, v, y, c = [1, 0.84, 0.56]) => { const q = W(u, v); glowPos.push(q[0], y, q[1]); glowCol.push(...c); };

  // ---- the gate (tam quan) at the head of 15 stone steps, on the axis at the paved court's north-east end ----
  // The satellite shows the court ending at u = 89 with a pale structure on the axis just beyond it (u 94-96), in the
  // trees on the hill's edge; the stair goes down from there and a path runs on to where the service road meets the
  // precinct wall (OPEN, the gate's mapped place).
  const gU = 92.5, gD = 3, gW = 11;
  const OPEN = [-917.7, 1584.6];
  const [gLo, gHi] = span(gU - gD / 2, gU + gD / 2, AX - gW / 2, AX + gW / 2);
  const stepR = 0.15, stepT = 0.35, nSteps = 15;
  const footU = gU + gD / 2 + nSteps * stepT;
  const footY = LAND_Y + T(footU, AX);
  const Yg = Math.max(gHi + 0.25, footY + nSteps * stepR);
  S.base = Yg - LAND_Y;
  const paved0 = S.n;
  S.kind = KIND.MASONRY;
  // the stair, full gate width, its flanks walled
  for (let k = 0; k < nSteps; k++) {
    const u0 = footU - (k + 1) * stepT, u1 = footU - k * stepT, y = footY + (k + 1) * (Yg - footY) / nSteps;
    box((u0 + u1) / 2, AX, Math.min(gLo, footY) - 0.4, y, 9.2, stepT, shade(STONE, k % 2 ? 0.97 : 1.02), { topKind: KIND.ROAD });
  }
  for (const s of [-1, 1]) {
    // cheek walls of the stair, sloping with it
    for (let k = 0; k < nSteps; k += 3) {
      const u0 = footU - (k + 3) * stepT, u1 = footU - k * stepT, y = footY + (k + 3) * (Yg - footY) / nSteps;
      box((u0 + u1) / 2, AX + s * 5.0, Math.min(gLo, footY) - 0.4, y + 0.55, 0.8, u1 - u0, shade(GATE, 1.05), { top: MOSS });
    }
  }
  // the path on from the stair's foot, down the slope to the precinct wall where the service road arrives
  {
    const rel = [OPEN[0] - A[0], OPEN[1] - A[1]];
    const oU = rel[0] * U[0] + rel[1] * U[1], oV = rel[0] * V[0] + rel[1] * V[1];
    const n = Math.max(2, Math.ceil(Math.hypot(oU - footU, oV - AX) / 2));
    for (let k = 0; k < n; k++) {
      const pu = (f) => footU + (oU - footU) * f, pv = (f) => AX + (oV - AX) * f;
      const f0 = k / n, f1 = (k + 1) / n;
      S.beam(V3(pu(f0), pv(f0), LAND_Y + T(pu(f0), pv(f0)) + 0.06), V3(pu(f1), pv(f1), LAND_Y + T(pu(f1), pv(f1)) + 0.06), 3.0, 0.14, shade(STONE, k % 2 ? 0.95 : 1.0));
    }
  }
  // gate body: three arched openings, the middle one taller, dark weathered plaster with moss
  const gH = 4.6;
  box(gU, AX, gLo - 0.5, Yg, gW + 0.6, gD + 0.6, shade(GATE, 0.95)); // its plinth
  S.kind = KIND.MASONRY;
  for (const [v, w] of [[-5.0, 1.0], [-2.75, 1.1], [2.75, 1.1], [5.0, 1.0]]) box(gU, AX + v, Yg, Yg + gH, w, gD, GATE, { top: shade(GATE, 0.8) });
  // the walls above the side arches and the middle arch
  for (const [v, w, y0] of [[-3.9, 1.2, 2.6], [3.9, 1.2, 2.6], [0, 4.4, 3.4]]) box(gU, AX + v, Yg + y0, Yg + gH, w, gD, GATE2);
  // arch heads (stepped to read as arches) and the red doors set back inside
  for (const [v, w, h] of [[-3.9, 1.2, 2.6], [3.9, 1.2, 2.6], [0, 4.4, 3.4]]) {
    box(gU, AX + v, Yg + h - 0.35, Yg + h, w * 0.75, gD + 0.02, GATE2);
    box(gU - 0.4, AX + v, Yg, Yg + h - 0.1, w, 0.18, shade(LAC, 0.8));
  }
  // pilasters and inscribed panels on the face
  for (const v of [-5.5, -2.2, 2.2, 5.5]) box(gU + gD / 2 + 0.1, AX + v, Yg, Yg + gH + 0.4, 0.5, 0.25, shade(GATE, 1.15), { top: MOSS });
  box(gU + gD / 2 + 0.06, AX, Yg + 3.6, Yg + 4.3, 2.6, 0.12, hex('#2e2d29'));
  // parapet with curled ends over the side bays
  box(gU, AX, Yg + gH, Yg + gH + 0.35, gW + 0.4, gD + 0.4, shade(GATE, 0.85), { top: MOSS });
  for (const s of [-1, 1]) {
    const e = V3(gU + gD / 2 + 0.1, AX + s * 5.6, Yg + gH + 0.35);
    S.beam(e, [e[0] + V[0] * s * 0.4, e[1] + 0.6, e[2] + V[1] * s * 0.4], 0.3, 0.3, shade(GATE, 0.9));
  }
  // the upper storey over the middle bay and its two-tier roof
  box(gU, AX, Yg + gH + 0.35, Yg + gH + 1.4, 4.4, 2.4, GATE2);
  const gr = { flare: 0.45, over: 0.6, fascia: 0.15, fasciaCol: shade(GATE, 0.7), ridgeCol: shade(GATE, 0.9), segs: 3 };
  { const q = W(gU, AX); S.hip(q[0], q[1], 5.6, 3.4, ang, Yg + gH + 0.2, 0.6, hex('#6e5d4c'), gr); S.hip(q[0], q[1], 4.6, 2.4, ang, Yg + gH + 1.4, 1.3, hex('#6e5d4c'), gr); }
  glow(gU + gD / 2 + 0.6, AX, Yg + 3.0);

  // ---- the forecourt: red tiles climbing from the gate to the terrace, following the hill ----
  const cV0 = 36.5, cV1 = 54.5, tU = 64; // satellite: the lower court is about 18 m wide, the step to the terrace at u 64
  const fu = [];
  for (let u = gU - gD / 2; u > tU - 0.01; u -= 2.5) fu.push(Math.max(u, tU));
  if (fu[fu.length - 1] > tU) fu.push(tU);
  const fy = [];
  let prev = Yg;
  for (const u of fu) { prev = Math.max(prev, span(u - 1, u + 1, cV0, cV1)[1] + 0.1); fy.push(prev); }
  S.kind = KIND.ROAD;
  for (let i = 0; i + 1 < fu.length; i++) {
    const a0 = V3(fu[i], cV0, fy[i]), a1 = V3(fu[i], cV1, fy[i]), b1 = V3(fu[i + 1], cV1, fy[i + 1]), b0 = V3(fu[i + 1], cV0, fy[i + 1]);
    S.quad(a0, a1, b1, b0, shade(PAVE, i % 2 ? 0.97 : 1.03), [0, 1, 0]);
    // skirts down to the ground on each side
    S.kind = KIND.MASONRY;
    for (const v of [cV0, cV1]) {
      const ta = V3(fu[i], v, fy[i]), tb = V3(fu[i + 1], v, fy[i + 1]);
      const ba = V3(fu[i], v, LAND_Y + T(fu[i], v) - 0.4), bb = V3(fu[i + 1], v, LAND_Y + T(fu[i + 1], v) - 0.4);
      S.quad(ba, bb, tb, ta, shade(GATE, 1.1), [V[0] * (v - AX), 0, V[1] * (v - AX)]);
    }
    S.kind = KIND.ROAD;
  }
  // grey stone path down the middle
  S.kind = KIND.MASONRY;
  for (let i = 0; i + 1 < fu.length; i++) S.beam(V3(fu[i], AX, fy[i] + 0.02), V3(fu[i + 1], AX, fy[i + 1] + 0.02), 2.2, 0.06, shade(STONE, 1.05));

  // ---- the terrace before the hall: red-brick retaining wall, five steps, two stone lantern pillars ----
  const Fy = fy[fy.length - 1];
  const [tLo, tHi] = span(31, tU, 31, 59);
  const Yt = Math.max(Fy + 0.9, tHi + 0.1);
  // the upper court on the satellite: about 24 m across (v 32-56) between the long range's trees and the forest
  box((46 + tU) / 2, 45, tLo - 0.5, Yt, 28, tU - 46, BRICK, { top: PAVE, topKind: KIND.ROAD });
  box(36, 45, tLo - 0.5, Yt, 28, 20.6, BRICK, { top: PAVE, topKind: KIND.ROAD }); // round the hall to its back
  for (let k = 0; k < 5; k++) box(tU + 0.35 * (k + 0.5), AX, Fy - 0.3, Yt - ((Yt - Fy) / 5) * (k + 1) + (Yt - Fy) / 5, 9, 0.35, shade(BRICK, 1.08), { topKind: KIND.ROAD });
  // stone balustrade along the front edge, small lanterns on its posts
  for (const [v0, v1] of [[31.2, AX - 4.6], [AX + 4.6, 58.8]]) {
    box(tU - 0.2, (v0 + v1) / 2, Yt, Yt + 0.65, v1 - v0, 0.25, GREY, { top: shade(GREY, 1.1) });
    for (let v = v0; v <= v1 + 0.01; v += (v1 - v0) / 4) {
      box(tU - 0.2, v, Yt, Yt + 0.95, 0.35, 0.35, shade(GREY, 1.05));
      box(tU - 0.2, v, Yt + 0.95, Yt + 1.2, 0.25, 0.25, shade(STONE, 1.1));
    }
  }
  // the two tall pillars either side of the stair, lantern tops, and the stone lions
  for (const s of [-1, 1]) {
    const v = AX + s * 6.2;
    box(tU - 0.8, v, Yt, Yt + 0.5, 1.2, 1.2, GREY);
    box(tU - 0.8, v, Yt + 0.5, Yt + 5.0, 0.7, 0.7, shade(GREY, 1.05));
    box(tU - 0.8, v, Yt + 5.0, Yt + 5.6, 0.95, 0.95, shade(STONE, 1.05));
    { const q = W(tU - 0.8, v); S.hip(q[0], q[1], 1.2, 1.2, ang, Yt + 5.6, 0.45, GREY, { flare: 0.3, over: 0.15, segs: 2 }); }
    glow(tU - 0.8, v, Yt + 5.3);
    box(tU + 2.3, AX + s * 5.4, Fy, Fy + 0.5, 0.9, 1.3, shade(STONE, 1.2));
    box(tU + 2.2, AX + s * 5.4, Fy + 0.5, Fy + 1.2, 0.6, 0.9, hex('#e8e4da'));
    // potted plants on red pots along the terrace
    for (const pv of [-14, -10, 10, 14]) if (Math.sign(pv) === s) cyl(tU - 1.6, AX + pv, Yt, Yt + 0.5, 0.35, 0.45, 6, hex('#a5452f'), { cap: true });
  }

  // ---- main hall (chánh điện): 3 bays + 2 chái, four dragon pillars on the verandah, double roof ----
  const hU = 36.05, hD = 19.1, hW = 24.4;
  const Yp = Yt + 1.0;
  box(hU, AX, Yt - 0.2, Yp, hW + 0.6, hD + 0.6, shade(GREY, 0.95), { top: shade(PAVE, 0.95), topKind: KIND.ROAD });
  for (let k = 0; k < 6; k++) box(hU + hD / 2 + 0.3 + 0.3 * (k + 0.5), AX, Yt - 0.2, Yp - (1.0 / 6) * k, 13, 0.3, shade(GREY, 1.02), { topKind: KIND.ROAD });
  (S.paved = S.paved || []).push([paved0, S.n]);
  S.kind = KIND.MASONRY;
  const front = hU + hD / 2;
  // body walls: ochre chái, dark wooden door panels in the three bays set back behind the verandah
  box(hU - 1.2, AX, Yp, Yp + 3.8, hW - 1.6, hD - 3.6, WALL, { top: shade(TILE, 0.8) });
  box(front - 2.35, AX, Yp, Yp + 3.2, 12.0, 0.25, WOOD);
  for (const s of [-1, 1]) {
    box(front - 2.35, AX + s * 9.1, Yp, Yp + 3.6, 5.6, 0.3, WALL);
    // round 壽 windows in the chái walls
    box(front - 2.15, AX + s * 9.1, Yp + 1.2, Yp + 2.6, 1.3, 0.12, shade(WOOD, 1.3));
    box(front - 2.1, AX + s * 9.1, Yp + 1.6, Yp + 2.2, 0.6, 0.1, hex('#c99a3e'));
  }
  // verandah pillars: grey, wrapped in dragons (a darker spiral band)
  for (const dv of [-5.9, -2.1, 2.1, 5.9]) {
    cyl(front - 0.6, AX + dv, Yp, Yp + 3.8, 0.3, 0.27, 8, shade(GREY, 1.08), { cap: false });
    for (let k = 0; k < 3; k++) cyl(front - 0.6, AX + dv, Yp + 0.6 + k * 1.05, Yp + 0.95 + k * 1.05, 0.36, 0.36, 8, hex('#5f7a6a'), { cap: false });
  }
  for (const dv of [-11.2, 11.2]) cyl(front - 0.6, AX + dv, Yp, Yp + 3.8, 0.25, 0.23, 8, shade(LAC, 0.75), { cap: false });
  // lower eave over the whole footprint, a frieze band with yellow panels, then the upper roof
  roof(hU, AX, hW, hD, Yp + 3.8, 1.3, { over: 1.2, ridgeCol: null, hips: true });
  box(hU - 0.6, AX, Yp + 4.6, Yp + 5.8, 16, 11, shade(WALL, 0.85));
  for (let k = -3; k <= 3; k++) box(hU - 0.6 + 5.55, AX + k * 2.1, Yp + 4.85, Yp + 5.55, 1.5, 0.08, hex('#e3c25a'));
  roof(hU - 0.6, AX, 16, 11, Yp + 5.7, 2.0, { over: 1.0, flare: 0.5 });
  // ridge: a dharma wheel in the middle, dragons rising at the ends
  const ry = Yp + 7.85;
  box(hU - 0.6, AX, ry, ry + 0.9, 0.9, 0.14, hex('#b9a46a'));
  box(hU - 0.6, AX, ry + 0.2, ry + 0.7, 0.5, 0.2, hex('#d8c27a'));
  for (const s of [-1, 1]) {
    const e = V3(hU - 0.6, AX + s * 3.6, ry);
    const m = V3(hU - 0.6, AX + s * 2.9, ry + 0.8), t = V3(hU - 0.6, AX + s * 2.4, ry + 0.5);
    S.beam(e, m, 0.25, 0.3, hex('#8a9b88'));
    S.beam(m, t, 0.2, 0.22, hex('#8a9b88'));
  }
  // six white lanterns hung under the eave
  for (const dv of [-10, -7.8, -4, 4, 7.8, 10]) {
    cyl(front + 0.2, AX + dv, Yp + 2.7, Yp + 3.25, 0.22, 0.22, 6, hex('#f2ece0'));
    glow(front + 0.2, AX + dv, Yp + 3.0, [1, 0.9, 0.7]);
  }

  // ---- the ranges round the inner court (tăng xá, nhà khách, nhà hậu), the rear hall, the side halls ----
  const hall = (u0, u1, v0, v1, alongU, wallH = 3.3, roofH = 1.8, ro) => {
    const [lo, hi] = span(u0, u1, v0, v1);
    const y = hi + 0.35, u = (u0 + u1) / 2, v = (v0 + v1) / 2;
    S.kind = KIND.MASONRY;
    box(u, v, lo - 0.4, y, v1 - v0 + 0.4, u1 - u0 + 0.4, shade(GREY, 0.9));
    S.kind = KIND.MASONRY;
    box(u, v, y, y + wallH, v1 - v0 - 1.0, u1 - u0 - 1.0, WALL, { top: shade(TILE, 0.8) });
    if (alongU) roofU(u, v, u1 - u0 - 1.0, v1 - v0 - 1.0, y + wallH, roofH, ro);
    else roof(u, v, v1 - v0 - 1.0, u1 - u0 - 1.0, y + wallH, roofH, ro);
    return y;
  };
  hall(0, 22.4, 0, 11, true);
  hall(0, 14.8, 11, 28.1, false);
  hall(0, 22.6, 28.1, 38.7, true);
  hall(0, 9.8, 38.7, 56.1, false, 3.6, 2.0);
  hall(0, 22.7, 56.1, 63.7, true);
  // nhà hậu tổ: the satellite puts it 5.7 m further south-east than OSM (v 34.3-54.8), its roof a lighter, oranger tile
  hall(-8.8, -1, 34.3, 54.8, false, 3.6, 2.0, { col: hex('#a5603f'), ridgeCol: hex('#8a4c33') });
  hall(45.8, 56.2, 0, 11.5, true);
  for (const [u0, u1] of [[45.4, 61.6], [61.6, 77.8], [77.8, 94]]) hall(u0, u1, 17, 25.3, true, 3.1, 1.6);
  // the inner court, paved
  {
    const p0 = S.n;
    const [lo, hi] = span(10, 26.5, 39, 56);
    S.kind = KIND.MASONRY;
    box(18.2, 47.5, lo - 0.3, hi + 0.12, 17, 16.5, shade(GREY, 0.95), { top: shade(PAVE, 0.92), topKind: KIND.ROAD });
    (S.paved = S.paved || []).push([p0, S.n]);
  }

  // ---- the stupa garden: 19 patriarchs' stupas on the visitor's left, multi-tier, lotus-topped ----
  S.kind = KIND.MASONRY;
  const spots = [];
  for (const [u, n] of [[64, 5], [71.5, 5], [79, 5], [86.5, 4]]) for (let i = 0; i < n; i++) spots.push([u + ((i * 7) % 3) * 0.6, 70 + i * 5.6 + (n === 4 ? 2.8 : 0)]);
  spots.forEach(([u, v], i) => {
    const founder = i === 7;
    const tiers = founder ? 3 : 3 + ((i * 5) % 3), base = founder ? 2.2 : 1.6 + ((i * 3) % 4) * 0.15;
    const col = STUPA[i % STUPA.length];
    const [lo, hi] = span(u - 1.5, u + 1.5, v - 1.5, v + 1.5);
    let y = hi + 0.3;
    if (founder) {
      box(u, v, lo - 0.3, hi + 0.15, 5.2, 5.2, shade(GREY, 0.9));
      for (const [du, dv, w, d] of [[2.5, 0, 0.25, 5.2], [-2.5, 0, 0.25, 5.2], [0, -2.5, 5.2, 0.25], [0, 2.5, 5.2, 0.25]]) if (du !== 2.5) box(u + du, v + dv, hi + 0.15, hi + 0.8, w, d, shade(GATE, 1.1), { top: MOSS });
    }
    box(u, v, lo - 0.3, y, base + 0.5, base + 0.5, shade(col, 0.85));
    let w = base, h = founder ? 0.75 : 0.9 + ((i * 7) % 3) * 0.12;
    for (let k = 0; k < tiers; k++) {
      box(u, v, y, y + h, w, w, col);
      box(u, v, y + h, y + h + 0.14, w + 0.3, w + 0.3, shade(col, 0.8));
      y += h + 0.14; w *= 0.8; h *= 0.85;
    }
    cyl(u, v, y, y + 0.35, w * 0.35, w * 0.5, 6, shade(col, 1.1));
    cyl(u, v, y + 0.35, y + 0.9, w * 0.3, 0.02, 6, shade(col, 1.15), { cap: false });
  });

  // ---- the precinct wall: low, dark, moss-capped, open at the gate and the alley on the north corner ----
  const c = W(50, 40);
  const LOW = { h: 1.4, plinth: 1.4, rail: false, t: 0.35, every: 4.5, postW: 0.5, postUp: 0.25, wall: GATE, cap: MOSS, iron: null, pierW: 0.9, pierUp: 0.8 };
  fence(S, RING, LOW, {
    closed: true,
    roads: roadsNear(data, c, 160),
    openings: [[...OPEN, 2.2], [-950.4, 1531.4, 2.5]],
    solid: buildingsNear(data, c, 120),
  });

  // ---- no generated houses inside the precinct: the hill is halls, courts, stupas and trees (as quochoc.js) ----
  if (Array.isArray(data.infill)) {
    const a = data.infill, R = 8, keep = [];
    const near = data.meta?.counts?.infillNear ?? a.length / R;
    let nearKept = 0;
    for (let i = 0; i < a.length / R; i++) {
      if (inRing(a[i * R] / 10, a[i * R + 1] / 10, RING)) continue;
      if (i < near) nearKept++;
      for (let j = 0; j < R; j++) keep.push(a[i * R + j]);
    }
    if (keep.length !== a.length) {
      a.length = 0;
      for (const v of keep) a.push(v);
      if (data.meta?.counts && data.meta.counts.infillNear != null) data.meta.counts.infillNear = nearKept;
    }
  }

  // ---- the mapped halls come out: re-framed above, they no longer sit under the model, so populate would draw them ----
  if (Array.isArray(data.bld)) {
    const inside = (b) => {
      const r = b[0];
      let x = 0, z = 0;
      for (let i = 0; i < r.length; i += 2) { x += r[i]; z += r[i + 1]; }
      return inRing(x / (r.length / 2) / 10, z / (r.length / 2) / 10, RING);
    };
    for (let i = data.bld.length - 1; i >= 0; i--) if (inside(data.bld[i])) data.bld.splice(i, 1);
  }

  // ---- after dark: the hall's lanterns, the pillar lanterns, a lamp in the gate ----
  const pts = glowPoints(glowPos, glowCol, 4);
  pts.userData.glow = true;
  pts.userData.landmark = id;
  group.add(pts);
}
