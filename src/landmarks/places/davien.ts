import { KIND, hex, shade, mix, rand, inRing, unflat } from '../../geo/buf.ts';
import { LAND_Y } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { buildingsNear } from '../enclosure.ts';

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
const TOWER_POS = [-1853.3, 1227.9];
const TANK_RADIUS = 8.8;
const TOWER_TOP_H = 41.8; // drum 17.6 m across (photos and the satellite roof disc; the OSM outline's 19.4 m is generous)
const LAWN_CENTER = [-1705.2, 1146.4]; // centre of the round lawn inside footway 1167517134 (radius ≈ 32 m)
const EAST_TIP = [-1528, 1058]; // the eastern tip
const PATH_BED_CENTERS: [number, number][] = [[-1629.7, 1079.9], [-1605.5, 1127.8], [-1783.8, 1115.5], [-1722.5, 1228.6]];

// ---- the water plant: positions and sizes measured on the satellite (scene metres), axis 22° north of east ----
const PLANT_ANGLE = -0.384; // the plant's long axis: u = (cos A, sin A), v = (-sin A, cos A)
const FILTER_POS = [-1879.2, 1238.4]; // the filter house, 13.6 m (u) by 20.5 m (v)
const CLARIFIER_CENTERS = [[-1888.0, 1220.4], [-1870.8, 1255.2]]; // open, 12.9 m across
const RESERVOIR_CENTERS = [[-1913.8, 1228.7], [-1892.3, 1272.4]]; // covered, 20 m across

// pale grey concrete with dark run-off streaks (both car panoramas), the roof a lighter grey on the satellite
const PLANT_WALL = hex('#c9c2b0');
const COLORS = {
  conc: hex('#b9b8b2'),
  concDark: hex('#9a9994'),
  stain: hex('#6f6f6b'),
  dark: hex('#262523'),
  roof: hex('#b3afa6'),
  water: hex('#3d4a40'),
  tile: hex('#7d6f62'),
  leaf: hex('#4f6a34'),
  ochna: hex('#e8c01c'),
  ochna2: hex('#d9a514'),
  blooms: ['#c8324a', '#e2709a', '#f0c23a', '#e8e2d2', '#b04ac0'].map(hex),
  gatePavilion: hex('#c9a65a'),
  plantWall: PLANT_WALL,
  plantWallDark: shade(PLANT_WALL, 0.82),
  plantFlat: hex('#a49d8f'),
};

const groundY = (x, z) => LAND_Y + rise(x, z);

function buildWaterTower(S) {
  // Massing from the two car panoramas on Cầu Dã Viên (NE and E of it) and the satellite roof disc: a tall,
  // slightly tapering sixteen-sided shaft nearly as wide as the tank, two ring bands, rows of small square windows,
  // a steel ladder up the side facing the bridge, a short corbel of radial brackets, a plain drum and a flat roof
  // ringed by a thin railing. Proportions measured on the photos (shaft 70 %, corbel 10 %, drum 20 % of the height;
  // drum 17.6 m, shaft 13.3 m at the foot and 12.0 m under the corbel), scaled to the surveyed 41.8 m.
  const [cx, cz] = TOWER_POS;
  const baseY = groundY(cx, cz);
  S.kind = KIND.PLAIN;
  S.cyl(cx, cz, baseY - 0.4, baseY + 0.5, 7.3, 7.2, 16, COLORS.concDark, { rot: Math.PI / 16 }); // plinth
  const shaftSegs = 16;
  const rBot = 6.65;
  const rTop = 6.0;
  const shaftY0 = baseY + 0.5;
  const shaftY1 = baseY + 28.5;
  const radiusAt = (y) => rBot + ((rTop - rBot) * (y - shaftY0)) / (shaftY1 - shaftY0);
  for (let i = 0; i < shaftSegs; i++) {
    const a0 = (i / shaftSegs) * Math.PI * 2;
    const a1 = ((i + 1) / shaftSegs) * Math.PI * 2;
    const faceCol = mix(COLORS.conc, COLORS.stain, 0.08 + 0.4 * rand(i, 7) ** 2);
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    S.quad([cx + c0 * rBot, shaftY0, cz + s0 * rBot], [cx + c1 * rBot, shaftY0, cz + s1 * rBot], [cx + c1 * rTop, shaftY1, cz + s1 * rTop], [cx + c0 * rTop, shaftY1, cz + s0 * rTop], faceCol, [c0 + c1, 0.05, s0 + s1]);
    // a shallow pilaster strip at each corner of the sixteen faces
    S.box(cx + c0 * (rBot + 0.05), cz + s0 * (rBot + 0.05), shaftY0, shaftY1, 0.3, 0.5, a0, shade(COLORS.conc, 0.92), { taper: 1 });
  }
  for (const bandH of [8.3, 19.2]) {
    const bandR = radiusAt(baseY + bandH) + 0.3;
    S.cyl(cx, cz, baseY + bandH, baseY + bandH + 0.6, bandR, bandR, shaftSegs, COLORS.concDark, { rot: 0 }); // ring bands
  }

  // the ladder on the face toward the bridge (bearing about 70°), and the windows
  const ladderAngle = -0.349;
  const ladderPt = (y): [number, number, number] => [cx + Math.cos(ladderAngle) * (radiusAt(y) + 0.45), y, cz + Math.sin(ladderAngle) * (radiusAt(y) + 0.45)];
  const ladderSide = [-Math.sin(ladderAngle), Math.cos(ladderAngle)];
  for (const side of [-0.3, 0.3]) {
    const bot = ladderPt(baseY + 1);
    const top = ladderPt(shaftY1);
    S.beam([bot[0] + ladderSide[0] * side, bot[1], bot[2] + ladderSide[1] * side], [top[0] + ladderSide[0] * side, top[1], top[2] + ladderSide[1] * side], 0.12, 0.12, COLORS.dark);
  }
  for (let y = baseY + 1.5; y < shaftY1; y += 0.9) {
    const pos = ladderPt(y);
    S.beam([pos[0] - ladderSide[0] * 0.3, y, pos[2] - ladderSide[1] * 0.3], [pos[0] + ladderSide[0] * 0.3, y, pos[2] + ladderSide[1] * 0.3], 0.06, 0.06, COLORS.dark);
  }
  for (let y = baseY + 3; y < shaftY1 - 1; y += 2.4) {
    const pos = ladderPt(y);
    S.box(pos[0] + Math.cos(ladderAngle) * 0.35, pos[2] + Math.sin(ladderAngle) * 0.35, y, y + 0.1, 0.12, 0.9, ladderAngle, COLORS.dark); // cage hoops, side on
  }
  const addWindow = (angle, y0, y1, width) => {
    const radius = radiusAt(y0) + 0.02;
    S.box(cx + Math.cos(angle) * radius, cz + Math.sin(angle) * radius, y0, y1, 0.25, width, angle, COLORS.dark);
  };
  for (const rowH of [10.7, 17.0]) {
    for (let k = 0; k < 12; k++) {
      addWindow(ladderAngle + ((k + 0.5) / 12) * Math.PI * 2, baseY + rowH, baseY + rowH + 1.5, 1.1); // the ladder runs up between two of them
    }
  }
  for (const angle of [ladderAngle - 0.55, ladderAngle + 2.2, ladderAngle - 2.6]) {
    addWindow(angle, baseY + 4.4, baseY + 5.9, 1.0);
  }

  // the small ochre gate pavilion at the tower's foot (north-west, right of the tower from the bridge)
  {
    const px = cx - 9;
    const pz = cz - 8;
    const pavY = groundY(px, pz);
    const pavAngle = -0.6;
    const cosA = Math.cos(pavAngle);
    const sinA = Math.sin(pavAngle);
    S.box(px, pz, pavY - 0.2, pavY + 2.8, 5.0, 3.4, pavAngle, COLORS.gatePavilion);
    const pavPt = (a, b, h): [number, number, number] => [px + a * cosA - b * sinA, pavY + h, pz + a * sinA + b * cosA];
    S.quad(pavPt(-2.8, -2.1, 2.8), pavPt(-2.8, 2.1, 2.8), pavPt(0, 1.9, 4.0), pavPt(0, -1.9, 4.0), COLORS.tile, [-cosA, 1.5, -sinA]);
    S.quad(pavPt(2.8, 2.1, 2.8), pavPt(2.8, -2.1, 2.8), pavPt(0, -1.9, 4.0), pavPt(0, 1.9, 4.0), COLORS.tile, [cosA, 1.5, sinA]);
    S.box(px + 2.51 * cosA, pz + 2.51 * sinA, pavY, pavY + 2.0, 0.1, 1.2, pavAngle, COLORS.dark);
  }
  // door at the foot (south-west side, not visible in the photos; kept from the earlier estimate)
  const doorAngle = Math.PI / 2 + 0.3;
  S.box(cx + Math.cos(doorAngle) * (rBot + 0.05), cz + Math.sin(doorAngle) * (rBot + 0.05), shaftY0, shaftY0 + 2.4, 0.4, 1.4, doorAngle, COLORS.dark);

  buildTowerTankAndRoof(S, cx, cz, baseY, shaftY1, rTop);
}

function buildTowerTankAndRoof(S, cx, cz, baseY, shaftY1, rTop) {
  // corbel: radial brackets under a conical soffit, out to the drum
  const tankBotY = baseY + 32.4;
  const tankTopY = baseY + 40.7;
  S.cyl(cx, cz, shaftY1 - 0.2, tankBotY, rTop, TANK_RADIUS - 0.1, 32, shade(COLORS.concDark, 0.9), { cap: false });
  for (let k = 0; k < 16; k++) {
    const angle = ((k + 0.5) / 16) * Math.PI * 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    S.beam([cx + cosA * (rTop + 0.1), shaftY1 - 0.3, cz + sinA * (rTop + 0.1)], [cx + cosA * (TANK_RADIUS - 0.25), tankBotY - 0.4, cz + sinA * (TANK_RADIUS - 0.25)], 0.4, 0.7, shade(COLORS.conc, 0.95));
  }
  // the drum, streaked by run-off, with a small lip at the top
  for (let i = 0; i < 32; i++) {
    const a0 = (i / 32) * Math.PI * 2;
    const a1 = ((i + 1) / 32) * Math.PI * 2;
    const faceCol = mix(COLORS.conc, COLORS.stain, 0.06 + 0.42 * rand(i, 11) ** 2);
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    S.quad([cx + c0 * TANK_RADIUS, tankBotY, cz + s0 * TANK_RADIUS], [cx + c1 * TANK_RADIUS, tankBotY, cz + s1 * TANK_RADIUS], [cx + c1 * TANK_RADIUS, tankTopY, cz + s1 * TANK_RADIUS], [cx + c0 * TANK_RADIUS, tankTopY, cz + s0 * TANK_RADIUS], faceCol, [c0 + c1, 0.05, s0 + s1]);
  }
  S.cyl(cx, cz, tankBotY - 0.3, tankBotY, TANK_RADIUS + 0.1, TANK_RADIUS + 0.1, 32, COLORS.concDark, { cap: false }); // drum's lower edge
  S.cyl(cx, cz, tankTopY - 0.25, tankTopY + 0.1, TANK_RADIUS + 0.12, TANK_RADIUS + 0.12, 32, shade(COLORS.conc, 1.04)); // lip
  // the roof: a shallow cone (0.8 m rise) with radial ribs and a round hatch in the middle, as on the satellite, and
  // the railing round the edge
  const roofY0 = tankTopY + 0.1;
  const roofPeakY = tankTopY + 0.9;
  const hatchR = 0.8;
  S.cyl(cx, cz, roofY0, roofPeakY, TANK_RADIUS, hatchR, 32, COLORS.roof);
  for (let k = 0; k < 24; k++) {
    const angle = ((k + 0.5) / 24) * Math.PI * 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const r0 = TANK_RADIUS - 0.3;
    const r1 = hatchR + 0.1;
    const y0 = roofY0 + ((TANK_RADIUS - r0) / (TANK_RADIUS - hatchR)) * (roofPeakY - roofY0);
    const y1 = roofY0 + ((TANK_RADIUS - r1) / (TANK_RADIUS - hatchR)) * (roofPeakY - roofY0);
    S.beam([cx + cosA * r0, y0 + 0.04, cz + sinA * r0], [cx + cosA * r1, y1 + 0.04, cz + sinA * r1], 0.12, 0.08, shade(COLORS.roof, 0.86));
  }
  S.cyl(cx, cz, roofPeakY, roofPeakY + 0.15, hatchR, hatchR, 16, COLORS.dark);
  for (let k = 0; k < 36; k++) {
    const angle = (k / 36) * Math.PI * 2;
    S.box(cx + Math.cos(angle) * (TANK_RADIUS - 0.15), cz + Math.sin(angle) * (TANK_RADIUS - 0.15), tankTopY + 0.1, baseY + TOWER_TOP_H, 0.06, 0.06, angle, COLORS.dark);
  }
  S.cyl(cx, cz, baseY + TOWER_TOP_H - 0.06, baseY + TOWER_TOP_H, TANK_RADIUS - 0.12, TANK_RADIUS - 0.12, 36, COLORS.dark, { cap: false });
  S.cyl(cx, cz, baseY + TOWER_TOP_H - 0.06, baseY + TOWER_TOP_H, TANK_RADIUS - 0.18, TANK_RADIUS - 0.18, 36, COLORS.dark, { cap: false }); // the rail's inner face
}

function buildParkPlantings(S, data, onLand) {
  // the island's mapped buildings (kiosks, the café): no bush grows into one
  const nearBuildings = buildingsNear(data, EAST_TIP, 120);
  const overlapsBuilding = (x, z, radius) => nearBuildings.some((ring) => inRing(x, z, ring) || [0, 1, 2, 3].some((k) => inRing(x + Math.cos(k * 1.571) * radius, z + Math.sin(k * 1.571) * radius, ring)));
  const placeShrub = (x, z, radius, height, color, seed) => {
    if (!onLand(x, z) || overlapsBuilding(x, z, radius + 0.5)) return;
    const y = groundY(x, z);
    S.cyl(x, z, y, y + height * 0.45, radius * 0.7, radius, 6, shade(COLORS.leaf, 0.85 + 0.3 * rand(seed, 3)), { cap: false, rot: rand(seed, 4) });
    S.cyl(x, z, y + height * 0.45, y + height, radius, radius * 0.35, 6, color, { rot: rand(seed, 5) });
  };
  S.kind = KIND.PLAIN;
  // the yellow ochna garden at the eastern tip: low mai vàng bushes in loose rows
  let seed = 0;
  for (let u = -26; u <= 10; u += 3.2) {
    for (let v = -6; v <= 6; v += 3) {
      const x = EAST_TIP[0] + u * 0.97 - v * 0.24 + (rand(seed, 1) - 0.5) * 1.2;
      const z = EAST_TIP[1] + u * 0.24 + v * 0.97 + (rand(seed, 2) - 0.5) * 1.2;
      placeShrub(x, z, 0.8 + 0.3 * rand(seed, 6), 1.3 + 0.5 * rand(seed, 8), rand(seed, 9) > 0.4 ? COLORS.ochna : COLORS.ochna2, seed);
      seed++;
    }
  }
  // flower beds on the round lawn: a ring bed, a centre bed, and beds where the cross paths meet the loop
  for (let k = 0; k < 28; k++) {
    const angle = (k / 28) * Math.PI * 2;
    placeShrub(LAWN_CENTER[0] + Math.cos(angle) * 14, LAWN_CENTER[1] + Math.sin(angle) * 14, 0.7, 0.9, COLORS.blooms[k % 3], 100 + k);
  }
  for (let k = 0; k < 9; k++) {
    const angle = (k / 9) * Math.PI * 2;
    const radius = k ? 3.2 : 0;
    placeShrub(LAWN_CENTER[0] + Math.cos(angle) * radius, LAWN_CENTER[1] + Math.sin(angle) * radius, 0.9, 1.1, COLORS.blooms[3 + (k % 2)], 140 + k);
  }
  for (const [bx, bz] of PATH_BED_CENTERS) {
    for (let k = 0; k < 7; k++) {
      const angle = (k / 7) * Math.PI * 2;
      placeShrub(bx + Math.cos(angle) * 4 + 3, bz + Math.sin(angle) * 4 + 3, 0.6, 0.8, COLORS.blooms[(k + seed) % COLORS.blooms.length], 200 + seed * 7 + k);
    }
    seed++;
  }
}

export function build({ data, S }) {
  // the islet's own ring, so planting stays on land
  let isleRing = null;
  for (const poly of data.land || []) {
    for (const flat of poly) {
      const ring = unflat(flat);
      if (ring.length > 10 && inRing(TOWER_POS[0], TOWER_POS[1], ring) && Math.abs(ring[0][0] - TOWER_POS[0]) < 1500) isleRing = ring;
    }
  }
  const onLand = (x, z) => !isleRing || inRing(x, z, isleRing);

  const pavedStart = S.n;
  buildWaterTower(S);
  buildWaterPlant(S);
  (S.paved = S.paved || []).push([pavedStart, S.n]);

  buildParkPlantings(S, data, onLand);

  // ---------- tree cover ----------
  // OSM maps only ~230 trees on the islet; photos and the press (3,000 planted in 2004, the west overgrown) show it
  // wooded round the water plant and in the west, with open lawns in the renovated east park. Extra trees join
  // data.trees (populate() plants them, off the models), clear of paths, bridges, buildings, the shore and the beds.
  if (isleRing && Array.isArray(data.trees)) addIsletTrees(data, isleRing);
}

function addIsletTrees(data, isleRing) {
  const xs = isleRing.map((pt) => pt[0]);
  const zs = isleRing.map((pt) => pt[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const z0 = Math.min(...zs);
  const z1 = Math.max(...zs);
  const inBounds = (pt) => pt[0] > x0 - 30 && pt[0] < x1 + 30 && pt[1] > z0 - 30 && pt[1] < z1 + 30;
  // segments to keep clear of, with their half-width: footways 3 m, bridge decks and rails 16 m
  const clearSegs = [];
  const addLine = (pts, halfW) => {
    for (let k = 0; k + 1 < pts.length; k++) {
      if (inBounds(pts[k]) || inBounds(pts[k + 1])) clearSegs.push([pts[k], pts[k + 1], halfW]);
    }
  };
  for (const road of data.roads || []) addLine(unflat(road[2]), road[1] ? 16 : 3.2);
  for (const rail of data.rails || []) addLine(unflat(rail[2]), 9);
  const nearBuildings = [];
  for (const bld of data.bld || []) {
    const ring = unflat(bld[0]);
    if (ring.some(inBounds)) nearBuildings.push(ring);
  }
  const distToSeg = (x, z, a, b) => {
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const lenSq = dx * dx + dz * dz || 1;
    const frac = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / lenSq));
    return Math.hypot(x - a[0] - dx * frac, z - a[1] - dz * frac);
  };
  const shoreDist = (x, z) => {
    let minD = 1e9;
    for (let k = 0; k < isleRing.length; k++) minD = Math.min(minD, distToSeg(x, z, isleRing[k], isleRing[(k + 1) % isleRing.length]));
    return minD;
  };
  const trees = data.trees;
  const existing = [];
  for (let k = 0; k < trees.length; k += 4) {
    const x = trees[k] / 10;
    const z = trees[k + 1] / 10;
    if (inBounds([x, z])) existing.push([x, z]);
  }
  let seed = 0;
  for (let gx = x0; gx < x1; gx += 8.5) {
    for (let gz = z0; gz < z1; gz += 8.5) {
      seed++;
      const x = gx + (rand(seed, 21) - 0.5) * 6;
      const z = gz + (rand(seed, 22) - 0.5) * 6;
      if (!inRing(x, z, isleRing)) continue;
      // density: the renovated east park keeps its lawns; the plant grounds and the west are thick with trees
      const isEast = x > -1840;
      const prob = isEast ? 0.13 : x > -2000 ? 0.5 : 0.62;
      if (rand(seed, 23) > prob) continue;
      if (Math.hypot(x - TOWER_POS[0], z - TOWER_POS[1]) < 15) continue;
      if (Math.hypot(x - LAWN_CENTER[0], z - LAWN_CENTER[1]) < 36) continue;
      if (Math.hypot(x - EAST_TIP[0], z - EAST_TIP[1]) < 32) continue;
      if (shoreDist(x, z) < 4) continue;
      if (clearSegs.some(([a, b, halfW]) => distToSeg(x, z, a, b) < halfW)) continue;
      if (nearBuildings.some((ring) => inRing(x, z, ring) || ring.some((pt) => Math.hypot(pt[0] - x, pt[1] - z) < 4))) continue;
      if (existing.some((pt) => Math.hypot(pt[0] - x, pt[1] - z) < 5.5)) continue;
      const kind = rand(seed, 24) < 0.06 ? 2 : 0; // a few phượng (flamboyants) among the shade trees
      trees.push(Math.round(x * 10), Math.round(z * 10), Math.round((0.8 + 0.45 * rand(seed, 25)) * 10), kind);
      existing.push([x, z]);
    }
  }
}

function buildWaterPlant(S) {
  const axisX = Math.cos(PLANT_ANGLE);
  const axisZ = Math.sin(PLANT_ANGLE);
  const plantAt = (u, v): [number, number] => [FILTER_POS[0] + u * axisX - v * axisZ, FILTER_POS[1] + u * axisZ + v * axisX];
  // a gabled roof over a box: ridge along local v, width across (u), len along (v)
  const buildGable = (u, v, width, len, y0, roofRise, wallCol, roofCol) => {
    const [x, z] = plantAt(u, v);
    const pt = (a, b, y): [number, number, number] => [x + a * axisX - b * axisZ, y, z + a * axisZ + b * axisX];
    const halfW = width / 2;
    const halfL = len / 2;
    S.quad(pt(-halfW, -halfL, y0), pt(-halfW, halfL, y0), pt(0, halfL, y0 + roofRise), pt(0, -halfL, y0 + roofRise), roofCol, [-axisX, 1.5, -axisZ]);
    S.quad(pt(halfW, halfL, y0), pt(halfW, -halfL, y0), pt(0, -halfL, y0 + roofRise), pt(0, halfL, y0 + roofRise), roofCol, [axisX, 1.5, axisZ]);
    S.tri(pt(-halfW, -halfL, y0), pt(0, -halfL, y0 + roofRise), pt(halfW, -halfL, y0), wallCol, [axisZ, 0, -axisX]);
    S.tri(pt(halfW, halfL, y0), pt(0, halfL, y0 + roofRise), pt(-halfW, halfL, y0), wallCol, [-axisZ, 0, axisX]);
  };
  const placeBlock = (u, v, w, d, h, color, topColor = color) => {
    const [x, z] = plantAt(u, v);
    const y = groundY(x, z);
    S.box(x, z, y - 0.3, y + h, w, d, PLANT_ANGLE, color, { top: topColor });
    return y;
  };
  S.kind = KIND.PLAIN;
  // filter house: a 3.2 m base, then two rows of four gabled bays
  let baseY = placeBlock(0, 0, 13.6, 20.5, 3.2, COLORS.plantWall, COLORS.plantFlat);
  for (const v of [-5.1, 5.1]) {
    for (let k = 0; k < 4; k++) {
      buildGable(-5.1 + k * 3.4, v, 3.3, 9.8, baseY + 3.2, 1.3, COLORS.plantWall, mix(COLORS.tile, COLORS.plantFlat, 0.4 + 0.2 * rand(k, v > 0 ? 31 : 32)));
    }
  }
  // the hall west of it, the low link between them, the annex on the north
  baseY = placeBlock(-18.9, 0.5, 18, 13, 6.2, COLORS.plantWall);
  buildGable(-18.9, 0.5, 18, 13, baseY + 6.2, 1.6, COLORS.plantWall, COLORS.tile); // low pitched roof, ridge across the hall
  placeBlock(-8.4, 0, 3.4, 9, 4.0, COLORS.plantWallDark, COLORS.plantFlat);
  placeBlock(-11.7, -9.0, 6.5, 5, 4.2, COLORS.plantWall, COLORS.plantFlat);
  for (let k = 0; k < 5; k++) {
    const [x, z] = plantAt(-25.5 + k * 3.3, 0.5 + 6.55);
    const y = groundY(x, z);
    S.box(x, z, y + 2.6, y + 4.6, 1.3, 0.2, PLANT_ANGLE, COLORS.dark); // hall windows, south side
  }
  // clarifiers: a ring wall, water inside, eight radial walls and a hub with a small kiosk
  for (const [x, z] of CLARIFIER_CENTERS) {
    const y = groundY(x, z);
    const radius = 6.45;
    S.cyl(x, z, y - 0.3, y + 2.4, radius, radius, 32, COLORS.plantWallDark, { cap: false });
    S.cyl(x, z, y + 2.4, y + 2.4, radius, radius - 0.35, 32, COLORS.plantWall, { cap: false });
    S.cyl(x, z, y + 1.6, y + 1.6, radius - 0.35, 0, 32, COLORS.water);
    for (let k = 0; k < 8; k++) {
      const angle = (k / 8) * Math.PI * 2 + 0.2;
      const midR = (radius + 1.8) / 2;
      S.box(x + Math.cos(angle) * midR, z + Math.sin(angle) * midR, y + 1.5, y + 2.3, radius - 1.9, 0.3, angle, COLORS.plantWall);
    }
    S.box(x, z, y + 1.5, y + 2.6, 3.6, 3.6, PLANT_ANGLE, COLORS.plantWall);
    S.box(x, z, y + 2.6, y + 4.0, 1.8, 1.8, PLANT_ANGLE, COLORS.plantWallDark, { top: COLORS.plantFlat });
  }
  // covered reservoirs: a low wall and a faint cone
  for (const [x, z] of RESERVOIR_CENTERS) {
    const y = groundY(x, z);
    S.cyl(x, z, y - 0.3, y + 1.8, 10, 10, 40, COLORS.plantWallDark, { cap: false });
    S.cyl(x, z, y + 1.8, y + 3.3, 10.1, 0.5, 40, mix(COLORS.roof, COLORS.tile, 0.3));
    S.box(x, z, y + 3.2, y + 3.7, 0.9, 0.9, 0, COLORS.dark);
  }
}
