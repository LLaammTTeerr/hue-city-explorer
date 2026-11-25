import { KIND, hex, shade, inRing, rand } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { fence, roadsNear, buildingsNear } from '../enclosure.ts';
import { glowPoints } from '../../geo/materials.ts';

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

const TILE = hex('#7d4a36'), RIDGE = hex('#6b3a2b'), HTILE = hex('#9a8676'), HRIDGE = hex('#7e6c5e'), WALL = hex('#d9b45a'), WOOD = hex('#4a3226');
const BRICK = hex('#8e4a3a'), PAVE = hex('#b6a08a'), STONE = PAL.stone, GREY = hex('#8f8c82');
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
  const W = (u, v): [number, number] => [A[0] + u * U[0] + v * V[0], A[1] + u * U[1] + v * V[1]];
  const T = (u, v) => rise(...W(u, v));
  const ang = Math.atan2(V[1], V[0]), angU = ang + Math.PI / 2; // box local x along v / along u
  const AX = 45.2;
  const c0 = W(50, 40);
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
  const box = (u, v, ya, yb, w, d, col, o?) => { const q = W(u, v); S.box(q[0], q[1], ya, yb, w, d, ang, col, o); };
  const roof = (u, v, w, d, ya, h, o?) => { const q = W(u, v); S.hip(q[0], q[1], w, d, ang, ya, h, o?.col ?? TILE, { flare: 0.4, over: 0.9, fascia: 0.22, fasciaCol: shade(TILE, 0.7), ridgeCol: RIDGE, hips: true, segs: 3, ...o }); };
  const roofU = (u, v, len, wid, ya, h, o) => { const q = W(u, v); S.hip(q[0], q[1], len, wid, angU, ya, h, o?.col ?? TILE, { flare: 0.35, over: 0.8, fascia: 0.2, fasciaCol: shade(TILE, 0.7), ridgeCol: RIDGE, hips: true, segs: 3, ...o }); };
  // a straight gabled roof along u (one ridge, gable ends in the wall colour): u0..u1, v0..v1 the walls
  const gableU = (u0, u1, v0, v1, ya, h, col, over = 0.8, endCol = WALL) => {
    const v = (v0 + v1) / 2, hw = (v1 - v0) / 2 + over, drop = over * (h / ((v1 - v0) / 2)), ua = u0 - over * 0.6, ub = u1 + over * 0.6;
    const keep = S.kind;
    S.kind = KIND.TILE;
    for (const s of [-1, 1]) {
      const e0 = V3(ua, v + s * hw, ya - drop), e1 = V3(ub, v + s * hw, ya - drop), r1 = V3(ub, v, ya + h), r0 = V3(ua, v, ya + h);
      const up = [V[0] * s * 0.5, 1, V[1] * s * 0.5];
      S.quad(e0, e1, r1, r0, shade(col, s < 0 ? 0.96 : 1.04), up);
      S.quad(e0, e1, r1, r0, shade(col, 0.6), [-up[0], -1, -up[2]]); // underside of the overhang
      S.beam(V3(ua, v + s * hw, ya - drop - 0.1), V3(ub, v + s * hw, ya - drop - 0.1), 0.18, 0.22, shade(col, 0.7));
    }
    S.beam(V3(ua, v, ya + h + 0.08), V3(ub, v, ya + h + 0.08), 0.35, 0.3, RIDGE);
    S.kind = KIND.MASONRY;
    for (const [u, s] of ([[u0, -1], [u1, 1]] as any[])) {
      const n = [U[0] * s, 0, U[1] * s];
      S.tri(V3(u, v0, ya), V3(u, v1, ya), V3(u, v, ya + h - 0.05), endCol, n);
    }
    S.kind = keep;
  };
  const cyl = (u, v, ya, yb, r0, r1, n, col, o?) => { const q = W(u, v); S.cyl(q[0], q[1], ya, yb, r0, r1, n, col, { rot: ang, ...o }); };
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
  // gate body: three arched openings in weathered grey-mossy masonry with red wooden double doors, carved pilasters,
  // inscribed friezes and a two-tier curved mossy roof over the central bay (matching the 2024 reference photo)
  const gH = 5.4;
  box(gU, AX, gLo - 0.5, Yg, gW + 1.4, gD + 0.8, shade(GATE, 0.95)); // its plinth
  S.kind = KIND.MASONRY;
  for (const [v, w] of ([[-5.3, 1.3], [-2.2, 2.1], [2.2, 2.1], [5.3, 1.3]] as any[])) box(gU, AX + v, Yg, Yg + gH, w, gD, GATE, { top: shade(GATE, 0.8) });
  // the three openings, round-headed: the middle 2.5 m wide and 3.8 m to its crown, the side ones 1.5 m and 3.0 m
  const arches = [[-3.85, 1.5, 3.0], [3.85, 1.5, 3.0], [0, 2.5, 3.8]];
  for (const [v, w, h] of arches) {
    box(gU, AX + v, Yg + h, Yg + gH, w, gD, GATE2); // wall over the crown
    // the head: a semicircle of radius w/2 springing at h - w/2, filled in at its corners in thin bands
    const r = w / 2, y0 = Yg + h - r, n = 8;
    for (let k = 0; k < n; k++) {
      const ya = y0 + (r * k) / n, yb = y0 + (r * (k + 1)) / n, open = r * Math.sqrt(Math.max(0, 1 - ((yb - y0) / r) ** 2));
      const side = r - open;
      if (side < 0.02) continue;
      for (const s of [-1, 1]) box(gU, AX + v + s * (r - side / 2), ya, yb, side, gD + 0.02, GATE2);
    }
    // red-lacquered wooden doors with upper lattice bars (center & left doors closed/ajar as in photo)
    S.kind = KIND.PLAIN;
    if (v <= 0) {
      box(gU, AX + v, Yg + 0.12, y0 + 0.15, w - 0.16, 0.14, shade(LAC, 0.78));
      box(gU, AX + v, Yg + 0.12, y0 + 0.15, 0.08, 0.18, hex('#2e1a14')); // center seam
    } else {
      for (const s of [-1, 1]) box(gU - 0.2, AX + v + s * (r - 0.06), Yg, y0, 0.1, Math.min(w / 2, 1.1), shade(LAC, 0.75));
    }
    S.kind = KIND.MASONRY;
    box(gU, AX + v, Yg, Yg + 0.14, w, 0.4, hex('#4a4842'));
  }
  // relief pilasters, cornice mouldings and inscribed panels on both faces
  for (const sd of [-1, 1]) {
    for (const v of [-5.5, -2.2, 2.2, 5.5]) box(gU + sd * (gD / 2 + 0.12), AX + v, Yg, Yg + gH + 0.35, 0.62, 0.28, shade(GATE, 1.14), { top: MOSS });
    box(gU + sd * (gD / 2 + 0.08), AX, Yg + 4.1, Yg + 4.95, 2.8, 0.14, hex('#3d3d37'));
    for (const v of [-3.85, 3.85]) box(gU + sd * (gD / 2 + 0.08), AX + v, Yg + 3.4, Yg + 4.3, 1.7, 0.12, hex('#474740'));
  }
  // stepped cornice and curled parapet ends over the side bays
  box(gU, AX, Yg + gH, Yg + gH + 0.45, gW + 1.2, gD + 0.5, shade(GATE, 0.86), { top: MOSS });
  for (const s of [-1, 1]) {
    const e = V3(gU + gD / 2 + 0.1, AX + s * 6.0, Yg + gH + 0.45);
    S.beam(e, [e[0] + V[0] * s * 0.55, e[1] + 0.75, e[2] + V[1] * s * 0.55], 0.32, 0.32, shade(GATE, 0.92));
  }
  // the upper storey over the middle bay and its two-tier curved mossy roof + carved ridge dragons & dharma finial
  box(gU, AX, Yg + gH + 0.45, Yg + gH + 1.7, 5.2, 2.7, GATE2);
  const gr = { flare: 0.48, over: 0.65, fascia: 0.16, fasciaCol: shade(GATE, 0.72), ridgeCol: shade(GATE, 0.95), segs: 3 };
  { const q = W(gU, AX); S.hip(q[0], q[1], 6.4, 3.6, ang, Yg + gH + 0.3, 0.75, hex('#685c4e'), gr); S.hip(q[0], q[1], 5.2, 2.7, ang, Yg + gH + 1.7, 1.5, hex('#685c4e'), gr); }
  S.kind = KIND.PLAIN;
  {
    const ryG = Yg + gH + 3.2;
    box(gU, AX, ryG, ryG + 0.72, 0.7, 0.16, hex('#d4b45c'));
    for (const s of [-1, 1]) {
      const a0 = V3(gU, AX + s * 1.4, ryG + 0.08), a1 = V3(gU, AX + s * 0.9, ryG + 0.55), a2 = V3(gU, AX + s * 0.45, ryG + 0.32);
      S.beam(a0, a1, 0.18, 0.22, hex('#5f8a78'));
      S.beam(a1, a2, 0.16, 0.18, hex('#5f8a78'));
    }
    // flanking stone trụ biểu lotus pillars at the stair head
    for (const s of [-1, 1]) {
      const pv = AX + s * 6.8;
      S.kind = KIND.MASONRY;
      box(gU + 1.2, pv, gLo - 0.3, Yg + 0.6, 1.15, 1.15, shade(GATE, 1.05));
      box(gU + 1.2, pv, Yg + 0.6, Yg + 4.4, 0.65, 0.65, shade(GATE2, 1.08), { top: MOSS });
      S.kind = KIND.PLAIN;
      box(gU + 1.2, pv, Yg + 4.4, Yg + 4.68, 0.88, 0.88, STONE);
      cyl(gU + 1.2, pv, Yg + 4.68, Yg + 5.15, 0.32, 0.42, 8, hex('#d8be74'));
      cyl(gU + 1.2, pv, Yg + 5.15, Yg + 5.65, 0.36, 0.05, 8, hex('#d8be74'));
      glow(gU + 1.2, pv, Yg + 4.95);
    }
  }
  glow(gU + gD / 2 + 0.6, AX, Yg + 3.4);

  // ---- the forecourt: weathered terracotta tiles (pale tan from above) climbing from the gate to the terrace, following the hill ----
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
  box(34.9, 45, tLo - 0.5, Yt, 28, 22.2, BRICK, { top: PAVE, topKind: KIND.ROAD }); // round the hall to its back
  for (let k = 0; k < 5; k++) box(tU + 0.35 * (k + 0.5), AX, Fy - 0.3, Yt - ((Yt - Fy) / 5) * (k + 1) + (Yt - Fy) / 5, 9, 0.35, shade(BRICK, 1.08), { topKind: KIND.ROAD });
  // stone balustrade along the front edge, small lanterns on its posts
  for (const [v0, v1] of ([[31.2, AX - 4.6], [AX + 4.6, 58.8]] as any[])) {
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

  // ---- main hall (chánh điện) and the front hall (tiền đường) before it, under parallel roofs ----
  // The satellite shows a cluster of parallel roofs in weathered tan tile: a narrow front hall with its ridge across the
  // axis (eaves u 42-46), a narrow roof behind it (u 38.8-42) and the larger main roof (u 23.6-38.8), about 19-20 m
  // across (v 35.2-55.2). mia.vn's "trùng lương trùng thiềm" (double roof) is drawn as the parallel front and main roofs,
  // the main roof with a small upper tier. Four dragon pillars stand on the front verandah.
  const hB = 24.6, hF = 45.4, hW = 18; // walls: back, verandah edge, width
  const Yp = Yt + 1.0;
  box((hB + hF) / 2 - 0.2, AX, Yt - 0.2, Yp, hW + 1.2, hF - hB + 0.4, shade(GREY, 0.95), { top: shade(PAVE, 0.95), topKind: KIND.ROAD });
  for (let k = 0; k < 6; k++) box(hF + 0.3 * (k + 0.5), AX, Yt - 0.2, Yp - (1.0 / 6) * k, 9, 0.3, shade(GREY, 1.02), { topKind: KIND.ROAD });
  (S.paved = S.paved || []).push([paved0, S.n]);
  S.kind = KIND.MASONRY;
  const front = hF;
  // body walls: ochre, dark wooden door panels in the three bays set back behind the verandah
  box((hB + front - 2.6) / 2, AX, Yp, Yp + 3.8, hW, front - 2.6 - hB, WALL, { top: shade(HTILE, 0.8) });
  box(front - 2.5, AX, Yp, Yp + 3.2, 9.6, 0.25, WOOD);
  for (const s of [-1, 1]) {
    box(front - 2.5, AX + s * 7.0, Yp, Yp + 3.6, 4.0, 0.3, WALL);
    // round 壽 windows in the chái walls
    box(front - 2.3, AX + s * 7.0, Yp + 1.2, Yp + 2.6, 1.3, 0.12, shade(WOOD, 1.3));
    box(front - 2.25, AX + s * 7.0, Yp + 1.6, Yp + 2.2, 0.6, 0.1, hex('#c99a3e'));
  }
  // verandah pillars: grey, wrapped in dragons (a darker spiral band)
  for (const dv of [-5.4, -1.9, 1.9, 5.4]) {
    cyl(front - 0.5, AX + dv, Yp, Yp + 3.4, 0.28, 0.25, 8, shade(GREY, 1.08), { cap: false });
    for (let k = 0; k < 3; k++) cyl(front - 0.5, AX + dv, Yp + 0.6 + k * 0.95, Yp + 0.92 + k * 0.95, 0.34, 0.34, 8, hex('#5f7a6a'), { cap: false });
  }
  for (const dv of [-8.6, 8.6]) cyl(front - 0.5, AX + dv, Yp, Yp + 3.4, 0.24, 0.22, 8, shade(LAC, 0.75), { cap: false });
  const hr = { col: HTILE, fasciaCol: shade(HTILE, 0.7), ridgeCol: HRIDGE };
  // front hall: eaves u 42-46, v 36-54.4, ridge across the axis
  roof(44.0, AX, 17.2, 2.8, Yp + 3.4, 1.3, { ...hr, over: 0.6, flare: 0.3 });
  // the narrow roof between (u 38.8-42)
  roof(40.4, AX, 17.6, 2.0, Yp + 3.7, 1.2, { ...hr, over: 0.6, flare: 0.25, ridgeCol: null });
  // main roof: eaves u 23.6-38.8, v 35.2-55.2, a frieze band and a small upper tier
  const mU = 31.2;
  roof(mU, AX, 18, 13.2, Yp + 3.9, 1.5, { ...hr, over: 1.0, ridgeCol: null });
  box(mU, AX, Yp + 4.8, Yp + 5.8, 11, 7, shade(WALL, 0.85));
  for (let k = -2; k <= 2; k++) box(mU + 3.55, AX + k * 2.0, Yp + 4.95, Yp + 5.6, 1.4, 0.08, hex('#e3c25a'));
  roof(mU, AX, 11, 7, Yp + 5.7, 1.8, { ...hr, over: 0.9, flare: 0.5 });
  // ridge: a dharma wheel in the middle, dragons rising at the ends
  const ry = Yp + 7.45;
  box(mU, AX, ry, ry + 0.9, 0.9, 0.14, hex('#b9a46a'));
  box(mU, AX, ry + 0.2, ry + 0.7, 0.5, 0.2, hex('#d8c27a'));
  for (const s of [-1, 1]) {
    const e = V3(mU, AX + s * 3.0, ry);
    const m = V3(mU, AX + s * 2.4, ry + 0.8), t = V3(mU, AX + s * 1.9, ry + 0.5);
    S.beam(e, m, 0.25, 0.3, hex('#8a9b88'));
    S.beam(m, t, 0.2, 0.22, hex('#8a9b88'));
  }
  // six white lanterns hung under the front eave
  for (const dv of [-7.8, -5.4, -3.6, 3.6, 5.4, 7.8]) {
    cyl(front + 0.1, AX + dv, Yp + 2.4, Yp + 2.95, 0.22, 0.22, 6, hex('#f2ece0'));
    glow(front + 0.1, AX + dv, Yp + 2.7, [1, 0.9, 0.7]);
  }

  // ---- the ranges round the inner court (tăng xá, nhà khách, nhà hậu), the rear hall, the side halls ----
  const hall = (u0, u1, v0, v1, alongU, wallH = 3.3, roofH = 1.8, ro?) => {
    const [lo, hi] = span(u0, u1, v0, v1);
    const y = hi + 0.35, u = (u0 + u1) / 2, v = (v0 + v1) / 2;
    S.kind = KIND.MASONRY;
    box(u, v, lo - 0.4, y, v1 - v0 + 0.4, u1 - u0 + 0.4, shade(GREY, 0.9));
    S.kind = KIND.MASONRY;
    box(u, v, y, y + wallH, v1 - v0 - 1.0, u1 - u0 - 1.0, WALL, { top: shade(TILE, 0.8) });
    // openings: dark timber doors and shuttered windows at a steady bay rhythm on both long faces
    const len = (alongU ? u1 - u0 : v1 - v0) - 1.0, nb = Math.max(2, Math.round(len / 3.2)), pitch = len / nb;
    for (let k = 0; k < nb; k++) {
      const t = -len / 2 + pitch * (k + 0.5), door = k % 2 === 0;
      for (const s of [-1, 1]) {
        const dU = alongU ? u + t : u + s * ((u1 - u0 - 1.0) / 2 + 0.03), dV = alongU ? v + s * ((v1 - v0 - 1.0) / 2 + 0.03) : v + t;
        const yb = y + (door ? 0 : 1.0), yt = y + (door ? 2.5 : 2.4);
        box(dU, dV, yb, yt, alongU ? 0.14 : 1.5, alongU ? 1.5 : 0.14, door ? WOOD : shade(WOOD, 0.8));
        if (!door) box(dU, dV, yb - 0.12, yb, alongU ? 0.18 : 1.7, alongU ? 1.7 : 0.18, shade(GREY, 1.05));
      }
    }
    if (ro?.gable) gableU(u0 + 0.5, u1 - 0.5, v0 + 0.5, v1 - 0.5, y + wallH, roofH, ro.col ?? TILE);
    else if (alongU) roofU(u, v, u1 - u0 - 1.0, v1 - v0 - 1.0, y + wallH, roofH, ro);
    else roof(u, v, v1 - v0 - 1.0, u1 - u0 - 1.0, y + wallH, roofH, ro);
    // ridge finials at the two ends
    for (const s of [-1, 1]) {
      const eu = alongU ? u + s * (len / 2 - 0.4) : u, ev = alongU ? v : v + s * (len / 2 - 0.4), q = W(eu, ev);
      S.box(q[0], q[1], y + wallH + roofH - 0.05, y + wallH + roofH + 0.55, 0.3, 0.3, ang, shade(ro?.ridgeCol ?? RIDGE, 1.15));
    }
    return y;
  };
  hall(0, 22.4, 0, 11, true);
  hall(0, 14.8, 11, 28.1, false);
  hall(0, 22.6, 28.1, 38.7, true);
  hall(0, 9.8, 38.7, 56.1, false, 3.6, 2.0);
  hall(0, 22.7, 56.1, 63.7, true);
  // nhà hậu tổ: the satellite puts it 5.7 m further south-east than OSM (v 34.3-54.8), its roof a lighter, oranger tile
  hall(-8.8, -1, 34.3, 54.8, false, 3.6, 2.0, { col: hex('#a5603f'), ridgeCol: hex('#8a4c33') });
  // the small hall north-west of the long range: the satellite shows a roof about 7 x 11 m, eaves u 44.5-55.7, v 6-13.1
  hall(44.8, 55.4, 6.3, 12.8, true);
  // the long range beside the court: one roof about 49 m long and 7.4 m eave to eave (satellite u 44.7-94.1,
  // v 18.3-25.7), a single straight ridge and gabled ends
  hall(45.0, 93.8, 18.6, 25.4, true, 3.1, 1.9, { gable: true });
  // the inner court, paved (up to the main hall's back wall)
  {
    const p0 = S.n;
    const [lo, hi] = span(10, 23.8, 39, 56);
    S.kind = KIND.MASONRY;
    box(16.9, 47.5, lo - 0.3, hi + 0.12, 17, 13.8, shade(GREY, 0.95), { top: shade(PAVE, 0.92), topKind: KIND.ROAD });
    (S.paved = S.paved || []).push([p0, S.n]);
  }

  // ---- the stupa garden: 19 patriarchs' stupas on the visitor's left, multi-tier, lotus-topped ----
  S.kind = KIND.MASONRY;
  const spots = [];
  for (const [u, n] of ([[64, 5], [71.5, 5], [79, 5], [86.5, 4]] as any[])) for (let i = 0; i < n; i++) spots.push([u + ((i * 7) % 3) * 0.6, 70 + i * 5.6 + (n === 4 ? 2.8 : 0)]);
  spots.forEach(([u, v], i) => {
    const founder = i === 7;
    const tiers = founder ? 3 : 3 + ((i * 5) % 3), base = founder ? 2.2 : 1.6 + ((i * 3) % 4) * 0.15;
    const col = STUPA[i % STUPA.length];
    const [lo, hi] = span(u - 1.5, u + 1.5, v - 1.5, v + 1.5);
    let y = hi + 0.3;
    if (founder) {
      box(u, v, lo - 0.3, hi + 0.15, 5.2, 5.2, shade(GREY, 0.9));
      for (const [du, dv, w, d] of ([[2.5, 0, 0.25, 5.2], [-2.5, 0, 0.25, 5.2], [0, -2.5, 5.2, 0.25], [0, 2.5, 5.2, 0.25]] as any[])) if (du !== 2.5) box(u + du, v + dv, hi + 0.15, hi + 0.8, w, d, shade(GATE, 1.1), { top: MOSS });
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

  // ---- the round lotus pond south-east of the 口, a white Quan Âm on a rock in it (satellite: centre u 27.5, v 75) ----
  const PU = 27.5, PV = 75, PR = 3.3;
  {
    const [lo, hi] = span(PU - PR, PU + PR, PV - PR, PV + PR);
    const yr = hi + 0.45;
    S.kind = KIND.MASONRY;
    const n = 16;
    for (let k = 0; k < n; k++) {
      const a = (k + 0.5) / n * Math.PI * 2, cu = PU + Math.cos(a) * PR, cv = PV + Math.sin(a) * PR;
      const q = W(cu, cv);
      S.box(q[0], q[1], lo - 0.3, yr, 2 * PR * Math.sin(Math.PI / n) + 0.15, 0.45, ang + a, shade(GREY, k % 2 ? 0.95 : 1.02), { top: shade(MOSS, 1.2) });
    }
    cyl(PU, PV, lo - 0.3, yr - 0.2, PR - 0.1, PR - 0.1, 16, hex('#3d5248'), { cap: true }); // water
    cyl(PU + 0.6, PV, yr - 0.25, yr + 0.5, 0.9, 0.55, 7, hex('#7b786c'), { cap: true }); // the rock
    cyl(PU + 0.6, PV, yr + 0.5, yr + 1.75, 0.32, 0.2, 8, hex('#efede6'), { cap: true }); // the statue
    cyl(PU + 0.6, PV, yr + 1.75, yr + 2.0, 0.13, 0.11, 8, hex('#efede6'), { cap: true });
  }

  // ---- the forest on Hàm Long hill: the satellite shows closed canopy over the precinct, only the roofs, the courts
  // and the paths showing. Trees planted on the open ground of the precinct, clear of the halls, courts and paths. ----
  if (Array.isArray(data.trees)) {
    const rects = [[-10, 24, -1.5, 65], [23, 65.5, 30, 60], [63, 97, 34.5, 56.5], [88, 101, 37, 54], [43, 96, 16.3, 27.8], [43, 57.5, 4.3, 15]];
    const rel = [OPEN[0] - A[0], OPEN[1] - A[1]], oU = rel[0] * U[0] + rel[1] * U[1], oV = rel[0] * V[0] + rel[1] * V[1];
    const nearPath = (u, v) => {
      const du = oU - footU, dv = oV - AX, L = du * du + dv * dv, t = Math.max(0, Math.min(1, ((u - footU) * du + (v - AX) * dv) / L));
      return Math.hypot(u - footU - du * t, v - AX - dv * t) < 3.2;
    };
    const roads = roadsNear(data, c0, 170);
    const onRoad = (x, z) => roads.some(([ax, az, bx, bz, w]) => {
      const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L));
      return Math.hypot(x - ax - dx * t, z - az - dz * t) < w / 2 + 3;
    });
    const deep = (x, z) => [[0, 0], [2.5, 0], [-2.5, 0], [0, 2.5], [0, -2.5]].every(([a, b]) => inRing(x + a, z + b, RING));
    for (let u = -60; u <= 140; u += 5.6) for (let v = -60; v <= 120; v += 5.6) {
      const i = Math.round(u * 37 + v * 101);
      const ju = u + (rand(i, 11) - 0.5) * 4, jv = v + (rand(i, 12) - 0.5) * 4;
      if (rects.some(([u0, u1, v0, v1]) => ju > u0 && ju < u1 && jv > v0 && jv < v1)) continue;
      if (nearPath(ju, jv) || Math.hypot(ju - PU, jv - PV) < PR + 2.5) continue;
      if (spots.some(([su, sv]) => Math.hypot(ju - su, jv - sv) < 1.4)) continue;
      const [x, z] = W(ju, jv);
      if (!deep(x, z) || onRoad(x, z)) continue;
      // tall, broad crowns (scale 1.1-1.5), a share of them dark, upright evergreens
      data.trees.push(Math.round(x * 10), Math.round(z * 10), 11 + Math.floor(rand(i, 13) * 5), rand(i, 14) < 0.35 ? 1 : 0);

    }
  }

  // ---- the precinct wall: low, dark, moss-capped, open at the gate and the alley on the north corner ----
  const c = c0;
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
