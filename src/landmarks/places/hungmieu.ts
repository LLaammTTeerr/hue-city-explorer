import { KIND, hex, shade, obb } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { fence, FENCE } from '../enclosure.ts';
import { rectRing } from '../../geo/gates.ts';
import { planter, dinh } from '../props.ts';
import { archGate } from '../archgate.ts';
import { ridgeDragons } from '../ornaments.ts';

// ---- Hưng Miếu (Hưng Tổ Miếu), the temple of Gia Long's parents, behind Thế Miếu in the Imperial City ----
//
// Sources (docs/places/hungmieu.md has the full list):
//  - vi.wikipedia.org/wiki/Hưng_Miếu: plan near square, 19 m x 19.20 m; a double house (nhà kép, trùng thiềm
//    điệp ốc) of about 400 m²; platform 0.68 m faced with Thanh Hóa stone; yellow-glazed yin-yang tiles; 9 rows of
//    columns front to back, 8 across; main house 3 bays + 2 kép, front house 5 bays + 2 single chái; a stylised 壽
//    on the front wall of each wing; six columns standing on the court in front, with lotus capitals; court
//    20 m x 18.45 m in bát tràng brick, a 2.15 m stone thần đạo down its middle to the Miếu Môn; six porcelain
//    planters on stone stands along the eave, an incense burner; brick walls, side gates Dục Khánh and Chương
//    Khánh leading to Thần Trù (kitchen) and Thần Khố (store), symmetrical rear gates Trí Tường and Ứng Tường; two
//    stone steles (1804, 1821) on the left. Burnt 1947, rebuilt 1951 from the An Khánh Vương từ, restored 1995
//    (red lacquer and gilding).
//  - OpenStreetMap: the hall (way 172657565), Miếu Môn (695810836), the four gates (695810831/32/34/35), Thần
//    Khố (696058130), Thần Trù (690838605) and the compound's side walls (695810826/27/28/29). The outer wall and
//    the wall between this court and Thế Miếu's are drawn by civic.js (templeWalls).
//  - The city height survey reads the hall at 7.0 m to the ridge.
// Estimated: the split between the front and main house, eave heights, the gates' height and roofs, the steles'
// side and size, and the two service halls' form.

// OSM outlines, metres in the model frame (from the raw extract, data/raw)
const HALL_RING = [[-1340.4, 146.8], [-1325.0, 135.7], [-1313.3, 151.8], [-1328.7, 162.9]];
// OSM's hall outline has the right size and axis (bearing 54°, checked on the satellite) but sits 2 m toward the
// court: on the 2026 satellite the roof's rear and front eaves both lie 2 m further back (NNW). The hall, its
// platform and court are framed from the outline moved back by HALL_BACK; the gates and walls stay where OSM has them.
const HALL_BACK = 2.0;
const MIEU_MON_RING = [[-1305.2, 164.8], [-1303.3, 167.3], [-1313.6, 175.0], [-1315.4, 172.5]];
// the rear two stand in Thế Miếu's outer wall (themieu.js), which stops clear of their roofs (REAR_GATE_CUTS)
const REAR_GATES = [
  [[-1314.5, 116.5], [-1313.0, 118.4], [-1308.0, 114.8], [-1309.5, 112.8]], // Ứng Tường Môn (rear, east)
  [[-1365.4, 154.6], [-1363.9, 156.5], [-1359.0, 152.7], [-1360.5, 150.8]], // Trí Tường Môn (rear, west)
];
const ALL_GATES = [
  [[-1301.9, 135.9], [-1303.6, 137.1], [-1299.7, 142.2], [-1298.1, 141.0]], // Chương Khánh Môn (east side)
  [[-1343.1, 166.1], [-1344.9, 167.4], [-1341.1, 172.6], [-1339.3, 171.3]], // Dục Khánh Môn (west side)
  ...REAR_GATES,
];
const GATE_OVER = 0.5; // walls stop this far past a gate's mapped outline (the gap the hip-roofed gates once had under their eaves)
// a wall that runs into a gate along its length stops this far past the outline's end: clear of the roof's eave by
// 0.1 m with the wall's end post and its cap; a stub of wall bridges the gap to the arched gate's side
const GATE_STUB = GATE_OVER + (FENCE.imperial.postW + 0.12) / 2 + 0.1;
// the rear gates' outlines grown along the wall by that much: themieu.js passes them to its outer wall as solid
export const REAR_GATE_CUTS = REAR_GATES.map((ring) => {
  const bounds = obb(ring);
  return rectRing(bounds.c[0], bounds.c[1], bounds.w + 2 * GATE_STUB, bounds.d, bounds.a);
});
const SERVICE_HALLS = [
  [[-1267.6, 129.0], [-1277.9, 136.6], [-1288.1, 122.9], [-1277.8, 115.3]], // Thần Khố
  [[-1356.1, 186.5], [-1366.4, 194.2], [-1376.7, 180.5], [-1366.4, 172.9]], // Thần Trù
];
// each from where it meets Thế Miếu's outer or cross wall (themieu.js) to a side gate
const SIDE_WALLS = [
  [[-1316.0, 119.1], [-1302.9, 136.6]],
  [[-1283.5, 161.5], [-1298.9, 141.6]],
  [[-1356.9, 149.4], [-1344.0, 166.8]],
  [[-1325.1, 192.3], [-1340.2, 172.0]],
];
const PIERCED_WALLS = [false, false, true, true]; // SIDE_WALLS: the two west walls, toward the garden, carry the band
const EXTRA_TREES = [
  [-12, -12.8, 1.2], [-2, -13, 1.3], [9, -12.6, 1.15], [18, -11, 1.25], [-21, -10, 1.1],
  [-17, -1, 1.2], [-21, 8, 1.3], [17, 1, 1.15], [21, 9, 1.25], [-24, -4, 1.0], [24, -5, 1.1],
  [-15, 14, 1.1], [-18, 22, 1.3], [15, 14.5, 1.2], [19, 22.5, 1.25], [-14, 30, 1.15], [15, 31, 1.2],
  [-34, 5, 1.2], [-36, 18, 1.3], [41, 25, 1.25], [33, -9, 1.2], [-31, -12, 1.1], [42, 6, 1.1],
];
const COURT_SHRUBS: [number, number][] = [
  [-11.2, 12], [-11.2, 16], [-11.2, 20], [11.2, 12], [11.2, 16], [11.2, 20], [-2.2, 23.5], [2.2, 23.5],
];

const COLORS = {
  // the 2026 satellite shows this hall's tiles weathered to a brown ochre, duller than Thế Miếu's (PAL.imperialRoof)
  tile: hex('#b98a4c'),
  ridge: hex('#d8c27e'),
  lacquer: PAL.lacquer,
  gold: hex('#d9b04a'),
  // the court reads pale grey on the satellite: worn bát tràng and stone, not fresh red brick
  stone: PAL.stone,
  pave: hex('#a7a296'),
  ochre: hex('#cfa65a'),
  darkWood: hex('#2a1814'),
  creamPlaster: hex('#e2dac8'),
  planterPot: hex('#dfe6ea'),
  planterBand: hex('#3c5a8a'),
  bronze: hex('#5b5a48'),
  eastHallWall: hex('#bdb3a0'),
  eastHallTop: hex('#6e5f4f'),
  eastHallRoof: hex('#7f6b55'),
  eastHallFascia: hex('#4e4136'),
  shrubBase: hex('#3d4a2c'),
  shrubTop: hex('#46612f'),
  piercedTile: hex('#a9a497'),
  piercedVoid: hex('#2b2723'),
};
// the compound's walls in the photospheres: lime plaster weathered dark grey-brown under a dark coping, and along
// the west a band of pierced tile panels under the coping (FENCE.imperial's proportions, its colours replaced)
const WALL_STYLE = { ...FENCE.imperial, wall: hex('#6f6557'), cap: hex('#463f38') };

const groundY = (x, z) => LAND_Y + rise(x, z);

export const id = 'hungmieu';

function makeHallFrame(S) {
  // the hall's frame: u across the front (east-north-east), v toward the front (south-south-east, to Thế Miếu)
  const center = HALL_RING.reduce((acc, pt) => [acc[0] + pt[0] / 4, acc[1] + pt[1] / 4], [0, 0]);
  const edgeX = HALL_RING[1][0] - HALL_RING[0][0];
  const edgeZ = HALL_RING[1][1] - HALL_RING[0][1];
  const edgeLen = Math.hypot(edgeX, edgeZ);
  const axisX = edgeX / edgeLen;
  const axisZ = edgeZ / edgeLen;
  const angle = Math.atan2(axisZ, axisX);
  center[0] += HALL_BACK * axisZ;
  center[1] -= HALL_BACK * axisX;
  const toWorld = (u, v): [number, number] => [center[0] + u * axisX - v * axisZ, center[1] + u * axisZ + v * axisX];
  const baseY = groundY(center[0], center[1]);
  const box = (u, v, y0, y1, w, d, color, opt?) => {
    const pos = toWorld(u, v);
    S.box(pos[0], pos[1], y0, y1, w, d, angle, color, opt);
  };
  const hip = (u, v, w, d, y0, h, opt?) => {
    const pos = toWorld(u, v);
    S.hip(pos[0], pos[1], w, d, angle, y0, h, COLORS.tile, { flare: 0.5, fascia: 0.28, fasciaCol: shade(COLORS.lacquer, 0.7), hips: true, glazed: true, segs: 4, ...opt });
  };
  const cyl = (u, v, y0, y1, r0, r1, segs, color, opt?) => {
    const pos = toWorld(u, v);
    S.cyl(pos[0], pos[1], y0, y1, r0, r1, segs, color, { rot: angle, ...opt });
  };
  return { center, axisX, axisZ, angle, baseY, toWorld, box, hip, cyl };
}

function buildCourtAndHall(S, frame) {
  const { center, axisX, axisZ, angle, baseY, toWorld, box, hip, cyl } = frame;
  S.base = baseY - LAND_Y;

  // ---- court: bát tràng brick 20 x 18.45 m before the hall, the stone thần đạo down its middle ----
  // the Miếu Môn stands on the hall's axis (OSM has it 2.1 m off), at its mapped distance down the court
  const mieuCenter = obb(MIEU_MON_RING).c;
  const courtV = 7.9;
  const gateV = (mieuCenter[0] - center[0]) * -axisZ + (mieuCenter[1] - center[1]) * axisX;
  S.kind = KIND.MASONRY;
  box(0, (courtV + gateV - 1.6) / 2, baseY - 0.2, baseY + 0.14, 20, gateV - 1.6 - courtV, COLORS.pave);
  box(0, (courtV + gateV) / 2, baseY - 0.2, baseY + 0.2, 2.15, gateV - courtV, shade(COLORS.stone, 1.08));
  box(0, 7.6 - 18.4 / 2, baseY - 0.2, baseY + 0.14, 23, 19, shade(COLORS.pave, 0.93)); // paved apron round the platform

  // ---- the hall: platform 0.68 m, faced in stone, with a flight in the middle of the front ----
  const platformH = 0.68;
  const floorY = baseY + platformH;
  box(0, -0.7, baseY - 0.3, floorY, 18.4, 17.0, COLORS.stone, { taper: 0.985, topKind: KIND.ROAD });
  for (let k = 1; k <= 3; k++) {
    box(0, 7.8 + 0.3 * (k - 0.5), baseY - 0.2, floorY - (platformH / 4) * k, 4.2, 0.3, shade(COLORS.stone, 1.04), { topKind: KIND.ROAD });
  }

  // main house (chánh doanh): 3 bays + 2 kép, deep, under a two-tier roof
  S.kind = KIND.TIMBER;
  box(0, -4.0, floorY, floorY + 3.3, 17.0, 9.2, shade(COLORS.lacquer, 0.86), { top: shade(COLORS.tile, 0.8) });
  hip(0, -4.0, 17.0, 9.2, floorY + 3.3, 1.0, { over: 1.3, flare: 0.35 });
  box(0, -4.0, floorY + 3.6, floorY + 4.65, 12.6, 5.6, shade(COLORS.lacquer, 0.8));
  hip(0, -4.0, 12.6, 5.6, floorY + 4.6, 2.0, { over: 1.0, ridgeCol: COLORS.ridge });
  ridgeDragons(S, toWorld(0, -4.0), floorY + 6.68, angle, { span: 5.2, scale: 0.88 });
  // cream-white plastered side end walls on the main & front halls (matching restoration photos)
  S.kind = KIND.PLAIN;
  for (const side of [-1, 1]) {
    box(side * 8.54, -4.0, floorY, floorY + 3.15, 0.12, 8.8, COLORS.creamPlaster);
    box(side * 8.54, 3.8, floorY, floorY + 2.85, 0.12, 6.0, COLORS.creamPlaster);
  }
  S.kind = KIND.TIMBER;
  // front house (tiền doanh): 5 bays + 2 chái, its roof carried forward over the free columns on the court
  box(0, 3.8, floorY, floorY + 3.0, 17.0, 6.4, COLORS.lacquer, { top: shade(COLORS.tile, 0.8) });
  hip(0, 4.5, 17.0, 7.8, floorY + 3.0, 1.85, { over: 1.25, ridgeCol: COLORS.ridge });
  S.kind = KIND.PLAIN;
  box(0, 7.7, floorY + 2.75, floorY + 3.0, 17.0, 1.4, shade(COLORS.lacquer, 0.45), { bottom: true }); // the verandah ceiling

  buildHallFacadeAndOrnaments(S, frame, floorY);
  buildCourtFurnishings(S, frame);
  return gateV;
}

function buildHallFacadeAndOrnaments(S, frame, floorY) {
  const { baseY, toWorld, box, cyl } = frame;
  // the front: lacquered door leaves in the five bays, the gilt liên ba above, a 壽 medallion on each chái
  const baySpan = 2.7;
  // each bay a set of four leaves: a lattice upper panel (dark behind a gilt grid) over a plain lower panel, set in a
  // frame between brighter lacquered posts, so the front reads as doors, not one red wall
  for (let i = -2; i <= 2; i++) {
    const centerU = i * baySpan;
    const leafW = (baySpan - 0.5) / 4;
    box(centerU, 7.03, floorY, floorY + 2.3, baySpan - 0.3, 0.08, shade(COLORS.lacquer, 0.5));
    for (let k = 0; k < 4; k++) {
      const leafU = centerU - (baySpan - 0.5) / 2 + leafW * (k + 0.5);
      box(leafU, 7.07, floorY + 0.12, floorY + 0.95, leafW - 0.08, 0.06, shade(COLORS.lacquer, 0.78));
      box(leafU, 7.07, floorY + 1.05, floorY + 2.2, leafW - 0.08, 0.06, shade(COLORS.darkWood, 1));
      for (const railY of [1.33, 1.62, 1.91]) box(leafU, 7.1, floorY + railY, floorY + railY + 0.04, leafW - 0.1, 0.04, COLORS.gold);
      box(leafU, 7.1, floorY + 1.05, floorY + 2.2, 0.04, 0.04, COLORS.gold);
    }
    for (const side of [-1, 1]) box(centerU + side * baySpan / 2, 7.06, floorY, floorY + 2.75, 0.24, 0.12, shade(COLORS.lacquer, 1.12));
    box(i * baySpan, 7.04, floorY + 2.35, floorY + 2.72, baySpan - 0.4, 0.08, COLORS.gold);
  }
  for (const side of [-1, 1]) {
    box(side * 7.6, 7.03, floorY + 0.3, floorY + 2.6, 1.5, 0.06, COLORS.ochre);
    cyl(side * 7.6, 7.08, floorY + 1.15, floorY + 1.85, 0.36, 0.36, 8, COLORS.gold);
  }
  // the flanks: a lattice window in each of the three rear bays of both side walls, a gilt band under the eave
  for (const side of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      box(side * 8.54, -2.0 - k * 3.0, floorY + 1.0, floorY + 2.3, 0.08, 1.5, shade(COLORS.lacquer, 0.55));
      box(side * 8.55, -2.0 - k * 3.0, floorY + 1.25, floorY + 2.05, 0.08, 1.1, COLORS.gold);
    }
    box(side * 8.54, 0.4, floorY + 2.55, floorY + 2.72, 0.08, 14.0, COLORS.gold);
  }
  // six columns standing on the court, lotus capitals under the eave beam
  for (let i = 0; i < 6; i++) {
    const u = (i - 2.5) * baySpan;
    cyl(u, 8.4, baseY + 0.05, baseY + 0.35, 0.42, 0.36, 6, shade(COLORS.stone, 0.95), { cap: false });
    cyl(u, 8.4, baseY + 0.35, floorY + 2.55, 0.22, 0.2, 7, COLORS.lacquer, { cap: false });
    cyl(u, 8.4, floorY + 2.5, floorY + 2.78, 0.2, 0.34, 7, COLORS.gold);
  }
  S.kind = KIND.TIMBER;
  box(0, 8.4, floorY + 2.72, floorY + 3.0, 16.0, 0.32, shade(COLORS.lacquer, 0.75));
  // the main ridge: a flaming pearl between two dragons
  S.kind = KIND.PLAIN;
  const ridgeY = floorY + 6.6;
  cyl(0, -4.0, ridgeY + 0.2, ridgeY + 0.9, 0.32, 0.12, 8, COLORS.ridge);
  for (const side of [-1, 1]) {
    const inner = toWorld(side * 0.7, -4.0);
    const outer = toWorld(side * 2.6, -4.0);
    S.beam([inner[0], ridgeY + 0.75, inner[1]], [outer[0], ridgeY + 0.35, outer[1]], 0.22, 0.32, COLORS.ridge);
  }
}

function buildCourtFurnishings(S, frame) {
  const { angle, baseY, toWorld, box } = frame;
  // in the court: six blue-and-white planters on stands, the bronze incense burner, two steles
  for (const u of [-8.6, -5.2, -1.8, 1.8, 5.2, 8.6]) {
    const pos = toWorld(u, 11.0);
    planter(S, pos[0], baseY, pos[1], angle, { r: 0.46, stand: 0.55, standCol: COLORS.stone, col: COLORS.planterPot, band: COLORS.planterBand, square: true });
  }
  { // the bronze incense burner (lư đỉnh) on its stone plinth, facing down the court
    const pos = toWorld(0, 19.0);
    dinh(S, pos[0], baseY, pos[1], angle + Math.PI / 2, { h: 1.95, col: COLORS.bronze, lid: true, stand: 0.4, standCol: COLORS.stone, standW: 1.6 });
  }
  for (const v of [13.5, 18.0]) {
    S.kind = KIND.MASONRY;
    box(12.5, v, baseY, baseY + 0.45, 1.6, 0.9, COLORS.stone);
    box(12.5, v, baseY + 0.45, baseY + 2.4, 1.1, 0.28, shade(COLORS.stone, 0.85), { top: shade(COLORS.stone, 0.7) });
    S.kind = KIND.PLAIN;
    box(12.5, v, baseY + 2.4, baseY + 2.65, 1.25, 0.36, shade(COLORS.stone, 0.8), { taper: 0.7 });
  }
}

function buildGatesAndServiceHalls(S, frame, gateV) {
  const { angle, baseY, toWorld, box } = frame;
  // ---- Miếu Môn and the four small gates: masonry arched gates under stepped mock roofs (../archgate.js) ----
  {
    const bounds = obb(MIEU_MON_RING);
    const pos = toWorld(0, gateV);
    archGate(S, { c: pos, a: angle, w: bounds.w, d: bounds.d, y: baseY, body: 4.0, tiers: 3, arches: 3 });
    S.kind = KIND.MASONRY;
    for (const side of [-1, 1]) box(side * (bounds.w / 2 + 0.9), gateV, baseY - 0.3, baseY + 2.3, 1.8, 0.6, WALL_STYLE.wall, { top: WALL_STYLE.cap }); // short screen walls either side
  }
  for (const ring of ALL_GATES) {
    const bounds = obb(ring);
    const gateY = groundY(bounds.c[0], bounds.c[1]);
    S.base = gateY - LAND_Y;
    archGate(S, { c: bounds.c, a: bounds.a, w: bounds.w, d: bounds.d + 0.3, y: gateY, body: 3.5, tiers: 3 });
  }

  // the stubs of Thế Miếu's outer wall each side of the rear gates, under their eaves, out to where that wall stops
  for (const ring of REAR_GATES) {
    const bounds = obb(ring);
    const gateY = groundY(bounds.c[0], bounds.c[1]);
    const dirX = Math.cos(bounds.a);
    const dirZ = Math.sin(bounds.a);
    const style = FENCE.imperial;
    const stubLen = GATE_STUB - (style.postW + 0.12) / 2;
    S.base = gateY - LAND_Y;
    S.kind = KIND.MASONRY;
    for (const side of [-1, 1]) {
      const offset = bounds.w / 2 + stubLen / 2;
      S.box(bounds.c[0] + dirX * side * offset, bounds.c[1] + dirZ * side * offset, gateY - 0.4, gateY + style.h - 0.18, stubLen, style.t, bounds.a, style.wall, { top: style.cap });
    }
  }

  // ---- Thần Khố and Thần Trù, the store and the kitchen beside the court: plain tiled halls ----
  for (const ring of SERVICE_HALLS) {
    const bounds = obb(ring);
    const hallY = groundY(bounds.c[0], bounds.c[1]);
    S.base = hallY - LAND_Y;
    S.kind = KIND.MASONRY;
    S.box(bounds.c[0], bounds.c[1], hallY - 0.3, hallY + 0.45, bounds.w - 0.6, bounds.d - 0.6, bounds.a, COLORS.stone, { topKind: KIND.ROAD });
    S.kind = KIND.TIMBER;
    S.box(bounds.c[0], bounds.c[1], hallY + 0.45, hallY + 3.1, bounds.w - 2.6, bounds.d - 2.6, bounds.a, shade(COLORS.lacquer, 0.85), { top: shade(COLORS.tile, 0.8) });
    S.hip(bounds.c[0], bounds.c[1], bounds.w - 2.6, bounds.d - 2.6, bounds.a, hallY + 3.1, 2.1, shade(COLORS.tile, 0.92), { flare: 0.45, over: 1.1, fascia: 0.25, fasciaCol: shade(COLORS.lacquer, 0.7), ridgeCol: COLORS.ridge, hips: true, glazed: true, segs: 3 });
  }

  // ---- an unmapped hall outside the east side wall, south of Chương Khánh Môn ----
  {
    const pos = toWorld(33.4, 15.9);
    const hallY = groundY(pos[0], pos[1]);
    S.base = hallY - LAND_Y;
    S.kind = KIND.MASONRY;
    S.box(pos[0], pos[1], hallY - 0.3, hallY + 0.35, 11.0, 6.4, angle, COLORS.stone, { topKind: KIND.ROAD });
    S.box(pos[0], pos[1], hallY + 0.35, hallY + 3.0, 10.4, 5.8, angle, COLORS.eastHallWall, { top: COLORS.eastHallTop });
    S.kind = KIND.TIMBER;
    S.hip(pos[0], pos[1], 10.4, 5.8, angle, hallY + 3.0, 1.9, COLORS.eastHallRoof, { flare: 0.3, over: 0.6, fascia: 0.2, fasciaCol: COLORS.eastHallFascia, hips: true, segs: 3 });
  }
}

function buildGreeneryAndSideWalls(S, data, frame) {
  const { toWorld } = frame;
  // ---- shade trees: the satellite and every photosphere show the compound under a dense canopy ----
  if (Array.isArray(data.trees)) {
    for (const [u, v, scale] of EXTRA_TREES) {
      const pos = toWorld(u, v);
      data.trees.push(Math.round(pos[0] * 10), Math.round(pos[1] * 10), Math.round(scale * 10), 0);
    }
  }
  // clipped shrubs along the court's sides and either side of the thần đạo at its foot
  S.kind = KIND.PLAIN;
  for (const [u, v] of COURT_SHRUBS) {
    const pos = toWorld(u, v);
    const shrubY = groundY(pos[0], pos[1]);
    S.cyl(pos[0], pos[1], shrubY, shrubY + 0.25, 0.45, 0.5, 8, COLORS.shrubBase, { cap: false });
    S.cyl(pos[0], pos[1], shrubY + 0.25, shrubY + 1.3, 0.62, 0.15, 8, COLORS.shrubTop);
  }

  // ---- the compound's side walls (the rear and front walls are civic.js's) ----
  S.base = 0;
  // each runs from Thế Miếu's outer or cross wall (themieu.js): it starts clear of that wall's corner post (both end
  // posts' capped halves), and stops at the side gate's face as before
  const startTrim = WALL_STYLE.postW + 0.12 + 0.04;
  const endTrim = WALL_STYLE.t / 2 + 0.25;
  SIDE_WALLS.forEach(([startPt, endPt], wallIdx) => {
    const segLen = Math.hypot(endPt[0] - startPt[0], endPt[1] - startPt[1]);
    const dirX = (endPt[0] - startPt[0]) / segLen;
    const dirZ = (endPt[1] - startPt[1]) / segLen;
    const p0 = [startPt[0] + dirX * startTrim, startPt[1] + dirZ * startTrim];
    const p1 = [endPt[0] - dirX * endTrim, endPt[1] - dirZ * endTrim];
    fence(S, [p0, p1], WALL_STYLE, { closed: false });
    if (!PIERCED_WALLS[wallIdx]) return;
    // the pierced band: pale tile panels with dark openings, 0.5 m under the coping, on both faces
    const wallAngle = Math.atan2(dirZ, dirX);
    const runLen = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const panelCount = Math.floor(runLen / 0.9);
    S.kind = KIND.PLAIN;
    for (let k = 0; k < panelCount; k++) {
      const frac = (k + 0.5) / panelCount;
      const x = p0[0] + (p1[0] - p0[0]) * frac;
      const z = p0[1] + (p1[1] - p0[1]) * frac;
      const topY = groundY(x, z) + WALL_STYLE.h;
      S.box(x, z, topY - 0.78, topY - 0.3, 0.78, WALL_STYLE.t + 0.04, wallAngle, COLORS.piercedTile);
      S.box(x, z, topY - 0.7, topY - 0.38, 0.5, WALL_STYLE.t + 0.08, wallAngle, COLORS.piercedVoid);
    }
  });
}

export function build({ S, data }) {
  const frame = makeHallFrame(S);
  const gateV = buildCourtAndHall(S, frame);
  buildGatesAndServiceHalls(S, frame, gateV);
  buildGreeneryAndSideWalls(S, data, frame);
  S.kind = KIND.PLAIN;
  S.base = 0;
}
