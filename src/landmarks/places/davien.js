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
//  - Street View from the Dã Viên road bridge and the satellite (visual reference only, nothing traced): the tower is
//    a squat 16-sided shaft nearly as wide as its drum (about 70 % shaft, 10 % corbel, 20 % drum of the height), two
//    ring bands, two rows of small windows, an outside ladder on the east-north-east, a flat roof inside a railing;
//    the drum reads about 17.6 m across. West of it the plant: a filter house of two rows of four gabled bays, a
//    taller tiled hall west of that, two round clarifiers with radial walls and two low covered reservoirs. No houses
//    stand on the islet (the generated infill is kept off it in scripts/build-data.mjs).
// Drawn here: the water tower, the water plant, the ochna garden at the eastern tip and the flower beds of the park.
// The islet ground, park lawn, footways and trees stay the generic layers of geo/city.js; the bridges and their piers
// on the islet belong to bachho.js.
// Estimated: the plant's heights, roof pitches and exact footprints (sized from the satellite), the tower's window
// and bracket counts, the depth of the drum (1,500 m³ in a 17.6 m drum is about 6.2 m, drawn 8.3 m with its skirt),
// colours; the beds' size and planting.
export const id = 'daVien';

// The OSM outline's centre is [-1854.1, 1227.9]. On the satellite (oblique: the roof disc leans ~15-20 m north of the
// foot, straight up the image) the roof disc and the shaft share one east-west centre 2.5 m east of the outline's;
// north-south the foot and the tank's shadow bracket the outline's centre, so only x is re-framed. Drawn 0.8 m east
// (1.9 m short of the satellite) so the drum still covers the outline and geo/city.js drops the mapped cylinder.
const TOWER = [-1853.3, 1227.9];
const TANK_R = 8.8, TOP = 41.8; // drum 17.6 m across (photos and the satellite roof disc; the OSM outline's 19.4 m is generous)
const LAWN = [-1705.2, 1146.4]; // centre of the round lawn inside footway 1167517134 (radius ≈ 32 m)
const TIP = [-1528, 1058]; // the eastern tip

const CONC = hex('#a09d94'), CONC_D = hex('#82807a'), STAIN = hex('#5c5b55'), DARK = hex('#262523'), ROOF = hex('#9d978b');
const WATER = hex('#3d4a40'), TILE = hex('#7d6f62');
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
  // Massing from the two car panoramas on Cầu Dã Viên (NE and E of it) and the satellite roof disc: a tall,
  // slightly tapering sixteen-sided shaft nearly as wide as the tank, two ring bands, rows of small square windows,
  // a steel ladder up the side facing the bridge, a short corbel of radial brackets, a plain drum and a flat roof
  // ringed by a thin railing. Proportions measured on the photos (shaft 70 %, corbel 10 %, drum 20 % of the height;
  // drum 17.6 m, shaft 13.3 m at the foot and 12.0 m under the corbel), scaled to the surveyed 41.8 m.
  const [cx, cz] = TOWER, g = gY(cx, cz);
  const n0 = S.n;
  S.kind = KIND.PLAIN;
  S.cyl(cx, cz, g - 0.4, g + 0.5, 7.3, 7.2, 16, CONC_D, { rot: Math.PI / 16 }); // plinth
  const SEG = 16, R0 = 6.65, R1 = 6.0, sh0 = g + 0.5, sh1 = g + 28.5;
  const rAt = (y) => R0 + ((R1 - R0) * (y - sh0)) / (sh1 - sh0);
  for (let i = 0; i < SEG; i++) {
    const a0 = (i / SEG) * Math.PI * 2, a1 = ((i + 1) / SEG) * Math.PI * 2;
    const col = mix(CONC, STAIN, 0.2 + 0.45 * rand(i, 7));
    const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
    S.quad([cx + c0 * R0, sh0, cz + s0 * R0], [cx + c1 * R0, sh0, cz + s1 * R0], [cx + c1 * R1, sh1, cz + s1 * R1], [cx + c0 * R1, sh1, cz + s0 * R1], col, [c0 + c1, 0.05, s0 + s1]);
    // a shallow pilaster strip at each corner of the sixteen faces
    S.box(cx + c0 * (R0 + 0.05), cz + s0 * (R0 + 0.05), sh0, sh1, 0.3, 0.5, a0, shade(CONC, 0.92), { taper: 1 });
  }
  for (const y of [8.3, 19.2]) S.cyl(cx, cz, g + y, g + y + 0.6, rAt(g + y) + 0.3, rAt(g + y) + 0.3, SEG, CONC_D, { rot: 0 }); // ring bands
  // the ladder on the face toward the bridge (bearing about 70°), and the windows: two rows of eight, a few low ones
  const la = -0.349;
  const lad = (y) => [cx + Math.cos(la) * (rAt(y) + 0.45), y, cz + Math.sin(la) * (rAt(y) + 0.45)];
  const lu = [-Math.sin(la), Math.cos(la)];
  for (const side of [-0.3, 0.3]) {
    const a = lad(g + 1), b = lad(sh1);
    S.beam([a[0] + lu[0] * side, a[1], a[2] + lu[1] * side], [b[0] + lu[0] * side, b[1], b[2] + lu[1] * side], 0.12, 0.12, DARK);
  }
  for (let y = g + 1.5; y < sh1; y += 0.9) { const p = lad(y); S.beam([p[0] - lu[0] * 0.3, y, p[2] - lu[1] * 0.3], [p[0] + lu[0] * 0.3, y, p[2] + lu[1] * 0.3], 0.06, 0.06, DARK); }
  for (let y = g + 3; y < sh1 - 1; y += 2.4) { const p = lad(y); S.box(p[0] + Math.cos(la) * 0.35, p[2] + Math.sin(la) * 0.35, y, y + 0.1, 0.12, 0.9, la, DARK); } // cage hoops, side on
  const win = (a, y0, y1, w) => { const r = rAt(y0) + 0.02; S.box(cx + Math.cos(a) * r, cz + Math.sin(a) * r, y0, y1, 0.25, w, a, DARK); };
  for (const y of [10.2, 16.4]) for (let k = 0; k < 8; k++) {
    const a = ((k + 0.5) / 8) * Math.PI * 2;
    if (Math.abs(Math.atan2(Math.sin(a - la), Math.cos(a - la))) < 0.3) continue; // the ladder runs here
    win(a, g + y, g + y + 1.9, 0.85);
  }
  for (const a of [la + 0.45, la - 0.6]) win(a, g + 4.2, g + 5.6, 0.9);
  // third row of slits just under the corbel, as on the photos
  for (let k = 0; k < 8; k++) { const a = ((k + 0.1) / 8) * Math.PI * 2; if (Math.abs(Math.atan2(Math.sin(a - la), Math.cos(a - la))) < 0.3) continue; win(a, g + 23.4, g + 25.0, 0.8); }
  // the small ochre gate pavilion at the tower's foot (north-west, right of the tower from the bridge)
  { const px = cx - 9, pz = cz - 8, y = gY(px, pz), pa = -0.6, c = Math.cos(pa), sn = Math.sin(pa);
    S.box(px, pz, y - 0.2, y + 2.8, 5.0, 3.4, pa, hex('#c9a65a'));
    const P = (a, b, h) => [px + a * c - b * sn, y + h, pz + a * sn + b * c];
    S.quad(P(-2.8, -2.1, 2.8), P(-2.8, 2.1, 2.8), P(0, 1.9, 4.0), P(0, -1.9, 4.0), TILE, [-c, 1.5, -sn]);
    S.quad(P(2.8, 2.1, 2.8), P(2.8, -2.1, 2.8), P(0, -1.9, 4.0), P(0, 1.9, 4.0), TILE, [c, 1.5, sn]);
    S.box(px + 2.51 * c, pz + 2.51 * sn, y, y + 2.0, 0.1, 1.2, pa, DARK); }
  // door at the foot (south-west side, not visible in the photos; kept from the earlier estimate)
  const fa = Math.PI / 2 + 0.3, fx = Math.cos(fa), fz = Math.sin(fa);
  S.box(cx + fx * (R0 + 0.05), cz + fz * (R0 + 0.05), sh0, sh0 + 2.4, 0.4, 1.4, fa, DARK);
  // corbel: radial brackets under a conical soffit, out to the drum
  const TC = g + 32.4, TT = g + 40.7;
  S.cyl(cx, cz, sh1 - 0.2, TC, R1, TANK_R - 0.1, 32, shade(CONC_D, 0.9), { cap: false });
  for (let k = 0; k < 16; k++) {
    const a = ((k + 0.5) / 16) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    S.beam([cx + c * (R1 + 0.1), sh1 - 0.3, cz + s * (R1 + 0.1)], [cx + c * (TANK_R - 0.25), TC - 0.4, cz + s * (TANK_R - 0.25)], 0.4, 0.7, shade(CONC, 0.95));
  }
  // the drum, streaked by run-off, with a small lip at the top
  for (let i = 0; i < 32; i++) {
    const a0 = (i / 32) * Math.PI * 2, a1 = ((i + 1) / 32) * Math.PI * 2;
    const col = mix(CONC, STAIN, 0.15 + 0.45 * rand(i, 11));
    const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
    S.quad([cx + c0 * TANK_R, TC, cz + s0 * TANK_R], [cx + c1 * TANK_R, TC, cz + s1 * TANK_R], [cx + c1 * TANK_R, TT, cz + s1 * TANK_R], [cx + c0 * TANK_R, TT, cz + s0 * TANK_R], col, [c0 + c1, 0.05, s0 + s1]);
  }
  S.cyl(cx, cz, TC - 0.3, TC, TANK_R + 0.1, TANK_R + 0.1, 32, CONC_D, { cap: false }); // drum's lower edge
  S.cyl(cx, cz, TT - 0.25, TT + 0.1, TANK_R + 0.12, TANK_R + 0.12, 32, shade(CONC, 1.04)); // lip
  // flat roof (a faint cone with seams on the satellite), the manhole in the middle, and the railing round the edge
  S.cyl(cx, cz, TT + 0.1, TT + 0.45, TANK_R, 0.9, 32, ROOF);
  S.cyl(cx, cz, TT + 0.45, TT + 0.5, 0.9, 0.9, 10, DARK);
  for (let k = 0; k < 36; k++) {
    const a = (k / 36) * Math.PI * 2;
    S.box(cx + Math.cos(a) * (TANK_R - 0.15), cz + Math.sin(a) * (TANK_R - 0.15), TT + 0.1, g + TOP, 0.06, 0.06, a, DARK);
  }
  S.cyl(cx, cz, g + TOP - 0.06, g + TOP, TANK_R - 0.12, TANK_R - 0.12, 36, DARK, { cap: false });
  S.cyl(cx, cz, g + TOP - 0.06, g + TOP, TANK_R - 0.18, TANK_R - 0.18, 36, DARK, { cap: false }); // the rail's inner face

  // ---------- the water plant (1953) round it ----------
  // Placed and sized on the satellite (structures under the trees, not seen in the panoramas): a filter house of
  // two rows of four gabled bays, a taller hall west of it with a link and a small annex, two open clarifiers with
  // radial walls and a central hub, and two covered reservoirs with faint conical roofs. Heights are estimated.
  plant(S);
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

// ---- the water plant: positions and sizes measured on the satellite (scene metres), axis 22° north of east ----
const PA = -0.384; // the plant's long axis: u = (cos PA, sin PA), v = (-sin PA, cos PA)
const FILTERS = [-1879.2, 1238.4]; // the filter house, 13.6 m (u) by 20.5 m (v)
const CLARIFIERS = [[-1888.0, 1220.4], [-1870.8, 1255.2]]; // open, 12.9 m across
const RESERVOIRS = [[-1913.8, 1228.7], [-1892.3, 1272.4]]; // covered, 20 m across
function plant(S) {
  const ux = Math.cos(PA), uz = Math.sin(PA);
  const at = (u, v) => [FILTERS[0] + u * ux - v * uz, FILTERS[1] + u * uz + v * ux];
  // a gabled roof over a box: ridge along local v, w across (u), len along (v)
  const gable = (u, v, w, len, y0, rise, wall, roof) => {
    const [x, z] = at(u, v);
    const P = (a, b, y) => [x + a * ux - b * uz, y, z + a * uz + b * ux];
    const hw = w / 2, hl = len / 2;
    S.quad(P(-hw, -hl, y0), P(-hw, hl, y0), P(0, hl, y0 + rise), P(0, -hl, y0 + rise), roof, [-ux, 1.5, -uz]);
    S.quad(P(hw, hl, y0), P(hw, -hl, y0), P(0, -hl, y0 + rise), P(0, hl, y0 + rise), roof, [ux, 1.5, uz]);
    S.tri(P(-hw, -hl, y0), P(0, -hl, y0 + rise), P(hw, -hl, y0), wall, [uz, 0, -ux]);
    S.tri(P(hw, hl, y0), P(0, hl, y0 + rise), P(-hw, hl, y0), wall, [-uz, 0, ux]);
  };
  const block = (u, v, w, d, h, col, top = col) => { const [x, z] = at(u, v); const g = gY(x, z); S.box(x, z, g - 0.3, g + h, w, d, PA, col, { top }); return g; };
  S.kind = KIND.PLAIN;
  const WALL = hex('#c9c2b0'), WALL_D = shade(WALL, 0.82), FLAT = hex('#a49d8f');
  // filter house: a 3.2 m base, then two rows of four gabled bays
  let g = block(0, 0, 13.6, 20.5, 3.2, WALL, FLAT);
  for (const v of [-5.1, 5.1]) for (let k = 0; k < 4; k++) gable(-5.1 + k * 3.4, v, 3.3, 9.8, g + 3.2, 1.3, WALL, mix(TILE, FLAT, 0.4 + 0.2 * rand(k, v > 0 ? 31 : 32)));
  // the hall west of it, the low link between them, the annex on the north
  g = block(-18.9, 0.5, 18, 13, 6.2, WALL);
  gable(-18.9, 0.5, 18, 13, g + 6.2, 1.6, WALL, TILE); // low pitched roof, ridge across the hall
  block(-8.4, 0, 3.4, 9, 4.0, WALL_D, FLAT);
  block(-11.7, -9.0, 6.5, 5, 4.2, WALL, FLAT);
  for (let k = 0; k < 5; k++) { const [x, z] = at(-25.5 + k * 3.3, 0.5 + 6.55), y = gY(x, z); S.box(x, z, y + 2.6, y + 4.6, 1.3, 0.2, PA, DARK); } // hall windows, south side
  // clarifiers: a ring wall, water inside, eight radial walls and a hub with a small kiosk
  for (const [x, z] of CLARIFIERS) {
    const y = gY(x, z), R = 6.45;
    S.cyl(x, z, y - 0.3, y + 2.4, R, R, 32, WALL_D, { cap: false });
    S.cyl(x, z, y + 2.4, y + 2.4, R, R - 0.35, 32, WALL, { cap: false });
    S.cyl(x, z, y + 1.6, y + 1.6, R - 0.35, 0, 32, WATER);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + 0.2, r = (R + 1.8) / 2; S.box(x + Math.cos(a) * r, z + Math.sin(a) * r, y + 1.5, y + 2.3, R - 1.9, 0.3, a, WALL); }
    S.box(x, z, y + 1.5, y + 2.6, 3.6, 3.6, PA, WALL);
    S.box(x, z, y + 2.6, y + 4.0, 1.8, 1.8, PA, WALL_D, { top: FLAT });
  }
  // covered reservoirs: a low wall and a faint cone
  for (const [x, z] of RESERVOIRS) {
    const y = gY(x, z);
    S.cyl(x, z, y - 0.3, y + 1.8, 10, 10, 40, WALL_D, { cap: false });
    S.cyl(x, z, y + 1.8, y + 3.3, 10.1, 0.5, 40, mix(ROOF, TILE, 0.3));
    S.box(x, z, y + 3.2, y + 3.7, 0.9, 0.9, 0, DARK);
  }
}
