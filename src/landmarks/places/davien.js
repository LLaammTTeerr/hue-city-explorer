import { KIND, hex, shade, mix, rand, inRing, unflat } from '../../geo/buf.js';
import { LAND_Y } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { buildingsNear } from '../enclosure.js';

// ---- Cồn Dã Viên, the islet in the Hương River south-west of the Citadel (docs/places/davien.md) ----
//
// Sources:
//  - english.vov.vn (Da Vien Islet in central Hue City): silt islet over 100,000 m², about 890 m long and 185 m wide;
//    Gia Long's "White Tiger" guardian of the Citadel; Tự Đức's garden (stele of July 1868); abandoned after 1883,
//    ruined by the 1904 storm; crossed by the 1908 railway (Bạch Hổ and Dã Viên bridges); water tower and water
//    plant with workers' housing in the middle of the islet; one concrete road.
//  - vietnamnews.vn (Tranquil Dã Viên Islet in Huế renovated, Feb 2023): water plant built 1953 west of the railway
//    bridge with a 40 m water tower; east part renovated 2021 (VNĐ11 bn): a 1,100 m stone-paved winding path round
//    the east bank, passing under the road and rail bridges to the eastern tip; new lawns and flower gardens in the
//    middle; a yellow ochna (mai vàng) garden beside the eastern tip; about 3,000 trees planted in 2004.
//  - huengaynay / vietnamtourism (via search): tower 40 m high, 1,500 m³ tank. vi.wikipedia "Tháp nước": "thân tháp
//    đồ sộ" (a massive body) mirrored in the river.
//  - news.laodong.vn (2025): the west part was tidied but is overgrown again, used for grazing cattle.
//  - OpenStreetMap: the islet outline (natural=water hole), "Công viên Cồn Dã Viên" (way 174746316), the footways
//    (1167517129 loop, 1167517134 round lawn ring), the tower's round outline 19.4 m across; the city height
//    survey reads it at 41.8 m.
// Drawn here: the water tower, the ochna garden at the eastern tip and the flower beds of the renovated park.
// The islet ground, park lawn, footways, trees and the mapped plant buildings stay the generic layers of geo/city.js;
// the bridges and their piers on the islet belong to bachho.js.
// Estimated: the tower's form (shaft and overhanging tank, the usual 1950s reinforced-concrete type; the 19.4 m
// mapped outline is taken as the tank), shaft diameter, rib count, tank depth (1,500 m³ in a 19 m drum ≈ 6.5 m),
// colours; the beds' size and planting.
export const id = 'daVien';

const TOWER = [-1854.1, 1227.9]; // centre of the OSM outline
const TANK_R = 9.7, TOP = 41.8;
const LAWN = [-1705.2, 1146.4]; // centre of the round lawn inside footway 1167517134 (radius ≈ 32 m)
const TIP = [-1528, 1058]; // the eastern tip

const CONC = hex('#cfc9bb'), CONC_D = hex('#9f998c'), STAIN = hex('#8e8a80'), DARK = hex('#2f2e2c');
const LEAF = hex('#4f6a34'), OCHNA = hex('#e8c01c'), OCHNA2 = hex('#d9a514');
const BLOOMS = ['#c8324a', '#e2709a', '#f0c23a', '#e8e2d2', '#b04ac0'].map(hex);
const gY = (x, z) => LAND_Y + rise(x, z);

export function build({ data, S }) {
  // the islet's own ring, so planting stays on land
  let isle = null;
  for (const poly of data.land || []) for (const f of poly) {
    const r = unflat(f);
    if (r.length > 10 && inRing(TOWER[0], TOWER[1], r) && Math.abs(r[0][0] - TOWER[0]) < 1500) isle = r;
  }
  const onLand = (x, z) => !isle || inRing(x, z, isle);

  // ---------- the water tower (1953) ----------
  const [cx, cz] = TOWER, g = gY(cx, cz);
  const n0 = S.n;
  S.kind = KIND.PLAIN;
  S.cyl(cx, cz, g - 0.4, g + 0.7, 7.0, 6.8, 24, CONC_D); // plinth
  // shaft, weathered in vertical streaks
  const seg = 24, R0 = 5.4, R1 = 5.0, sh0 = g + 0.7, sh1 = g + 31;
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
    const col = mix(CONC, STAIN, 0.15 + 0.35 * rand(i, 7));
    const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
    S.quad([cx + c0 * R0, sh0, cz + s0 * R0], [cx + c1 * R0, sh0, cz + s1 * R0], [cx + c1 * R1, sh1, cz + s1 * R1], [cx + c0 * R1, sh1, cz + s0 * R1], col, [c0 + c1, 0.05, s0 + s1]);
  }
  // eight pilaster ribs up the shaft
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8, r = (R0 + R1) / 2 + 0.25;
    S.box(cx + Math.cos(a) * r, cz + Math.sin(a) * r, sh0, sh1, 0.7, 0.9, a, shade(CONC, 1.04));
  }
  // stair slits up the south face and the door at its foot
  const fa = Math.PI / 2 + 0.3, fx = Math.cos(fa), fz = Math.sin(fa);
  for (let y = 5; y < 29; y += 3.6) S.box(cx + fx * (R0 - 0.1), cz + fz * (R0 - 0.1), g + y, g + y + 1.6, 0.3, 0.55, fa, DARK);
  S.box(cx + fx * (R0 + 0.1), cz + fz * (R0 + 0.1), sh0, sh0 + 2.4, 0.4, 1.4, fa, DARK);
  S.box(cx + fx * (R0 + 0.6), cz + fz * (R0 + 0.6), sh0 + 2.5, sh0 + 2.75, 1.0, 2.2, fa, CONC_D); // canopy over it
  // corbel out to the tank, the tank drum with its rim band, the shallow conical roof and the vent lantern
  S.cyl(cx, cz, sh1 - 0.4, g + 33.2, R1, TANK_R - 0.2, 32, CONC_D, { cap: false });
  for (let i = 0; i < 32; i++) {
    const a0 = (i / 32) * Math.PI * 2, a1 = ((i + 1) / 32) * Math.PI * 2;
    const col = mix(CONC, STAIN, 0.1 + 0.3 * rand(i, 11));
    const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
    S.quad([cx + c0 * TANK_R, g + 33.2, cz + s0 * TANK_R], [cx + c1 * TANK_R, g + 33.2, cz + s1 * TANK_R], [cx + c1 * TANK_R, g + 39.4, cz + s1 * TANK_R], [cx + c0 * TANK_R, g + 39.4, cz + s0 * TANK_R], col, [c0 + c1, 0.05, s0 + s1]);
  }
  S.cyl(cx, cz, g + 33.0, g + 33.5, TANK_R + 0.25, TANK_R + 0.25, 32, CONC_D, { cap: false }); // lower band
  S.cyl(cx, cz, g + 39.4, g + 40.1, TANK_R + 0.3, TANK_R + 0.3, 32, shade(CONC, 1.05)); // cornice
  S.cyl(cx, cz, g + 40.1, g + 41.3, TANK_R, 1.3, 32, STAIN); // roof
  S.cyl(cx, cz, g + 41.3, g + TOP, 1.1, 0.9, 10, CONC_D); // vent
  // a ladder of small square openings round the tank under the cornice
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    S.box(cx + Math.cos(a) * (TANK_R + 0.02), cz + Math.sin(a) * (TANK_R + 0.02), g + 38.0, g + 38.8, 0.2, 0.8, a, DARK);
  }
  (S.paved = S.paved || []).push([n0, S.n]);

  // ---------- planting of the 2021 renovation ----------
  // the island's mapped buildings (kiosks, the café): no bush grows into one
  const blds = buildingsNear(data, TIP, 120);
  const onBld = (x, z, r) => blds.some((b) => inRing(x, z, b) || [0, 1, 2, 3].some((k) => inRing(x + Math.cos(k * 1.571) * r, z + Math.sin(k * 1.571) * r, b)));
  const shrub = (x, z, r, h, col, i) => {
    if (!onLand(x, z) || onBld(x, z, r + 0.5)) return;
    const y = gY(x, z);
    S.cyl(x, z, y, y + h * 0.45, r * 0.7, r, 6, shade(LEAF, 0.85 + 0.3 * rand(i, 3)), { cap: false, rot: rand(i, 4) });
    S.cyl(x, z, y + h * 0.45, y + h, r, r * 0.35, 6, col, { rot: rand(i, 5) });
  };
  S.kind = KIND.PLAIN;
  // the yellow ochna garden at the eastern tip: low mai vàng bushes in loose rows
  let i = 0;
  for (let u = -26; u <= 10; u += 3.2) for (let v = -6; v <= 6; v += 3) {
    const x = TIP[0] + u * 0.97 - v * 0.24 + (rand(i, 1) - 0.5) * 1.2, z = TIP[1] + u * 0.24 + v * 0.97 + (rand(i, 2) - 0.5) * 1.2;
    shrub(x, z, 0.8 + 0.3 * rand(i, 6), 1.3 + 0.5 * rand(i, 8), rand(i, 9) > 0.4 ? OCHNA : OCHNA2, i);
    i++;
  }
  // flower beds on the round lawn: a ring bed, a centre bed, and beds where the cross paths meet the loop
  for (let k = 0; k < 28; k++) {
    const a = (k / 28) * Math.PI * 2, r = 14;
    shrub(LAWN[0] + Math.cos(a) * r, LAWN[1] + Math.sin(a) * r, 0.7, 0.9, BLOOMS[k % 3], 100 + k);
  }
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2, r = k ? 3.2 : 0;
    shrub(LAWN[0] + Math.cos(a) * r, LAWN[1] + Math.sin(a) * r, 0.9, 1.1, BLOOMS[3 + (k % 2)], 140 + k);
  }
  for (const [bx, bz] of [[-1629.7, 1079.9], [-1605.5, 1127.8], [-1783.8, 1115.5], [-1722.5, 1228.6]]) {
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      shrub(bx + Math.cos(a) * 4 + 3, bz + Math.sin(a) * 4 + 3, 0.6, 0.8, BLOOMS[(k + i) % BLOOMS.length], 200 + i * 7 + k);
    }
    i++;
  }

  // ---------- tree cover ----------
  // OSM maps only ~230 trees on the islet; photos and the press (3,000 planted in 2004, the west overgrown) show it
  // wooded round the water plant and in the west, with open lawns in the renovated east park. Extra trees join
  // data.trees (populate() plants them, off the models), clear of paths, bridges, buildings, the shore and the beds.
  if (isle && Array.isArray(data.trees)) addTrees(data, isle);
}

function addTrees(data, isle) {
  const xs = isle.map((p) => p[0]), zs = isle.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
  const box = (p) => p[0] > x0 - 30 && p[0] < x1 + 30 && p[1] > z0 - 30 && p[1] < z1 + 30;
  // segments to keep clear of, with their half-width: footways 3 m, bridge decks and rails 16 m
  const segs = [];
  const addLine = (pts, w) => { for (let k = 0; k + 1 < pts.length; k++) if (box(pts[k]) || box(pts[k + 1])) segs.push([pts[k], pts[k + 1], w]); };
  for (const r of data.roads || []) addLine(unflat(r[2]), r[1] ? 16 : 3.2);
  for (const r of data.rails || []) addLine(unflat(r[2]), 9);
  const blds = [];
  for (const b of data.bld || []) { const r = unflat(b[0]); if (r.some(box)) blds.push(r); }
  const dSeg = (x, z, a, b) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L));
    return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
  };
  const shore = (x, z) => { let d = 1e9; for (let k = 0; k < isle.length; k++) d = Math.min(d, dSeg(x, z, isle[k], isle[(k + 1) % isle.length])); return d; };
  const t = data.trees, have = [];
  for (let k = 0; k < t.length; k += 4) { const x = t[k] / 10, z = t[k + 1] / 10; if (box([x, z])) have.push([x, z]); }
  let i = 0;
  for (let gx = x0; gx < x1; gx += 8.5) for (let gz = z0; gz < z1; gz += 8.5) {
    i++;
    const x = gx + (rand(i, 21) - 0.5) * 6, z = gz + (rand(i, 22) - 0.5) * 6;
    if (!inRing(x, z, isle)) continue;
    // density: the renovated east park keeps its lawns; the plant grounds and the west are thick with trees
    const east = x > -1840, p = east ? 0.13 : x > -2000 ? 0.5 : 0.62;
    if (rand(i, 23) > p) continue;
    if (Math.hypot(x - TOWER[0], z - TOWER[1]) < 15) continue;
    if (Math.hypot(x - LAWN[0], z - LAWN[1]) < 36) continue;
    if (Math.hypot(x - TIP[0], z - TIP[1]) < 32) continue;
    if (shore(x, z) < 4) continue;
    if (segs.some(([a, b, w]) => dSeg(x, z, a, b) < w)) continue;
    if (blds.some((r) => inRing(x, z, r) || r.some((q) => Math.hypot(q[0] - x, q[1] - z) < 4))) continue;
    if (have.some((q) => Math.hypot(q[0] - x, q[1] - z) < 5.5)) continue;
    const kind = rand(i, 24) < 0.06 ? 2 : 0; // a few phượng (flamboyants) among the shade trees
    t.push(Math.round(x * 10), Math.round(z * 10), Math.round((0.8 + 0.45 * rand(i, 25)) * 10), kind);
    have.push([x, z]);
  }
}
