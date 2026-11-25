import { KIND, hex, shade } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { fence, offStreets } from '../enclosure.ts';
import { ridgeDragons, ridgeGourd } from '../ornaments.ts';

// ---- Bảo tàng Cổ vật Cung đình Huế (Huế Museum of Royal Antiquities): điện Long An, 3 Lê Trực ----
//
// Sources (fetched Nov 2026; notes in docs/places/baotangcovat.md):
//  - vi.wikipedia.org/wiki/Điện_Long_An: built 1845 (Thiệu Trị) in cung Bảo Định, moved here 1909 as Tân Thơ Viện,
//    Musée Khải Định from 1923; rectangular, 35.70 m long and 28 m wide on a 1.1 m stone-faced platform; a double
//    house (trùng thiềm điệp ốc) on 128 lim columns; roof area 1,750 m²; front house 7 bays (8 trusses), rear house
//    5 bays (6 trusses); the timber left bare, not lacquered or gilded.
//  - mia.vn (Điện Long An Huế): yellow-glazed yin-yang tiles (ngói âm dương tráng men vàng); front house 7 bays +
//    2 single chái, rear house 5 bays + 2 double chái; platform 1.1 m; eave columns run down toward the court.
//  - baotanglichsu.vn: "3 layers of tiles" (three roof tiers), 128 ironwood columns.
//  - OpenStreetMap: the hall way 695810710 (its 40 x 30 m outline takes in the eaves), the museum grounds way
//    695810697 between Lê Trực (front, south-east) and Đinh Công Tráng (back); the annexes 695810708/09 are left to
//    the mapped-building pass.
//  - The city height survey reads the hall at 9.0 m to the ridge.
//  - Google satellite and Street View (Nov 2026 check, captures kept out of the repo): the hall's roof reaches about
//    39.5 x 30 m at the eaves, matching the OSM outline, so the hip ends overhang the 35.7 m platform by about 1.9 m;
//    behind the hall (annex 695810709) stands a long ochre hall under a two-tier red corrugated-metal roof with dragon
//    finials, a pair of small brown-tiled pavilions beyond its north-east end and one beyond its south-west end;
//    north-east of the hall (695810708) a long shed under a green metal gable roof. The street fronts (Lê Trực, Đinh
//    Tiên Hoàng) are a weathered grey balustrade under an iron railing between ochre piers; the gate piers carry a
//    lotus finial and a small tiled ticket house with a two-tier roof stands beside the gate; on Đinh Công Tráng the
//    grounds are closed by a grey concrete wall (about 2.6 m) with a wire fence on Y-posts above it behind the annex,
//    and by the street balustrade from the north-east pavilions to the Đinh Tiên Hoàng corner.
// Estimated: the depth split between the two houses, eave and tier heights, the gate's form, the fence, the
// outdoor exhibits (two bronze cauldrons and stone pieces in the front court) and the path.

export const id = 'baotangcovat';

// the hall's mapped outline (OSM 695810710, main rectangle only), model metres
const HALL_OUTLINE = [[-731.0, -290.6], [-713.0, -266.3], [-745.2, -242.7], [-763.5, -267.3]];
// the museum grounds (OSM 695810697); the back (Đinh Công Tráng) runs from GROUNDS_RING[3] to GROUNDS_RING[0]
const GROUNDS_RING = [[-689.2, -347.4], [-642.3, -282.0], [-741.5, -209.5], [-792.9, -270.2]];
const PLATFORM_LEN = 35.7;
const PLATFORM_DEPTH = 28;
const PLATFORM_HEIGHT = 1.1;
const GATE_WIDTH = 6.0;
const ANNEX_PAVILIONS: [number, number, number][] = [[29.5, -24.8, 9.6], [41.4, -24.8, 9.6], [-29.0, -24.8, 10.2]];

const COLORS = {
  tile: hex('#c28e3c'),
  tileDark: hex('#a87832'),
  ridge: hex('#e5cc7e'),
  wood: hex('#6f4a2e'),
  woodDark: hex('#4a3020'),
  woodLight: hex('#8a6240'),
  stone: PAL.stone,
  brick: hex('#a5715a'),
  ochre: hex('#d6ae5e'),
  cream: hex('#efe4c8'),
  iron: hex('#2c2a26'),
  bronze: hex('#4f5446'),
  glass: hex('#2c3a40'),
  render: hex('#c9a55a'),
  redTin: hex('#8a3b33'),
  greenTin: hex('#6f8a6a'),
  brownTile: hex('#7a4a36'),
  moss: hex('#8c8a72'),
  concrete: hex('#6c6e66'),
  wire: hex('#3a3c3a'),
  finial: hex('#4a4a44'),
};

const groundY = (x, z) => LAND_Y + rise(x, z);

function createHallFrame(S) {
  const center = HALL_OUTLINE.reduce((acc, pt) => [acc[0] + pt[0] / 4, acc[1] + pt[1] / 4], [0, 0]);
  // u along the front (east-north-east), v toward the front (south-south-east, to Lê Trực)
  const edgeX = HALL_OUTLINE[1][0] - HALL_OUTLINE[2][0];
  const edgeZ = HALL_OUTLINE[1][1] - HALL_OUTLINE[2][1];
  const edgeLen = Math.hypot(edgeX, edgeZ);
  const axisX = edgeX / edgeLen;
  const axisZ = edgeZ / edgeLen;
  const angle = Math.atan2(axisZ, axisX);
  const toWorld = (localU, localV): [number, number] => [center[0] + localU * axisX - localV * axisZ, center[1] + localU * axisZ + localV * axisX];
  const box = (localU, localV, yMin, yMax, width, depth, color, opts?) => {
    const pos = toWorld(localU, localV);
    S.box(pos[0], pos[1], yMin, yMax, width, depth, angle, color, opts);
  };
  const hip = (localU, localV, width, depth, yBase, riseH, color, opts?) => {
    const pos = toWorld(localU, localV);
    S.hip(pos[0], pos[1], width, depth, angle, yBase, riseH, color, {
      flare: 0.45, fascia: 0.26, fasciaCol: COLORS.woodDark, hips: true, glazed: true, segs: 4, ridgeCol: COLORS.ridge, ...opts,
    });
  };
  const cyl = (localU, localV, yMin, yMax, r0, r1, sides, color, opts?) => {
    const pos = toWorld(localU, localV);
    S.cyl(pos[0], pos[1], yMin, yMax, r0, r1, sides, color, { rot: angle, ...opts });
  };
  return { center, axisX, axisZ, angle, toWorld, box, hip, cyl };
}

function buildMainHallAndCourt(S, frame, baseY, gateV) {
  const { toWorld, box, hip, cyl, angle } = frame;
  const plinthY = baseY + PLATFORM_HEIGHT;

  // ---- the front court: a brick path on the axis from the gate to the steps (paved: no trees on it) ----
  const pavedStart = S.n;
  S.kind = KIND.MASONRY;
  box(0, (PLATFORM_DEPTH / 2 + 1.8 + gateV) / 2, baseY - 0.2, baseY + 0.24, 5.0, gateV - PLATFORM_DEPTH / 2 - 1.8, COLORS.brick, { topKind: KIND.ROAD });
  box(0, PLATFORM_DEPTH / 2 + 3.2, baseY - 0.2, baseY + 0.24, 22, 3.2, shade(COLORS.brick, 0.95), { topKind: KIND.ROAD }); // apron before the steps
  box(0, 0, baseY - 0.2, baseY + 0.22, PLATFORM_LEN + 3.0, PLATFORM_DEPTH + 2.6, shade(COLORS.stone, 0.9), { topKind: KIND.ROAD }); // pavement round the platform
  (S.paved = S.paved || []).push([pavedStart, S.n]);

  // ---- the platform: 35.7 x 28 m, 1.1 m, faced in stone; three flights on the front ----
  box(0, 0, baseY - 0.3, plinthY, PLATFORM_LEN, PLATFORM_DEPTH, COLORS.stone, { taper: 0.99, topKind: KIND.ROAD });
  box(0, 0, plinthY - 0.12, plinthY, PLATFORM_LEN + 0.2, PLATFORM_DEPTH + 0.2, shade(COLORS.stone, 1.08), { topKind: KIND.ROAD }); // the coping
  const stepCount = 6;
  const stepTread = 0.32;
  for (const [flightU, flightW] of [[0, 7.8], [-12.6, 3.4], [12.6, 3.4]]) {
    for (let k = 1; k <= stepCount; k++) {
      box(flightU, PLATFORM_DEPTH / 2 + stepTread * (k - 0.5), baseY - 0.2, plinthY - (PLATFORM_HEIGHT / (stepCount + 1)) * k, flightW, stepTread, shade(COLORS.stone, 1.04), { topKind: KIND.ROAD });
    }
    for (const side of [-1, 1]) {
      box(flightU + side * (flightW / 2 + 0.25), PLATFORM_DEPTH / 2 + (stepCount * stepTread) / 2, baseY - 0.2, plinthY - 0.1, 0.5, stepCount * stepTread, shade(COLORS.stone, 0.92)); // the cheek walls
    }
  }

  // ---- the double house: front house (tiền điện) 7 bays + 2 chái, rear house (chính điện) 5 bays + 2 double chái ----
  // both nine spans wide; the front house is the shallower, the rear house carries the high two-tier roof
  const baySpan = 3.7;
  const hallW = baySpan * 9; // 33.3 m between the corner columns
  const frontV = 7.9;
  const frontD = 10.6; // front house centre and depth (column lines)
  const rearV = -5.9;
  const rearD = 15.0; // rear house
  const frontEaveY = plinthY + 3.0;
  const rearEaveY = plinthY + 3.3;

  // the walls: bare lim panels (doors and lattice) between the columns, set in from the verandah on the front
  S.kind = KIND.TIMBER;
  box(0, frontV - 1.0, plinthY, frontEaveY, hallW - 1.2, frontD - 2.6, COLORS.wood, { top: COLORS.tileDark });
  box(0, rearV, plinthY, rearEaveY, hallW - 0.4, rearD - 0.6, shade(COLORS.wood, 0.92), { top: COLORS.tileDark });
  // the front: a door leaf in each of the seven bays, a glazed lattice transom over it; the chái closed
  S.kind = KIND.PLAIN;
  const frontFaceV = frontV - 1.0 + (frontD - 2.6) / 2 + 0.04;
  for (let i = -3; i <= 3; i++) {
    box(i * baySpan, frontFaceV, plinthY, plinthY + 2.35, baySpan - 0.7, 0.08, COLORS.woodDark);
    box(i * baySpan, frontFaceV + 0.01, plinthY + 2.45, plinthY + 2.85, baySpan - 0.6, 0.08, COLORS.woodLight);
    box(i * baySpan, frontFaceV + 0.02, plinthY + 2.52, plinthY + 2.78, baySpan - 1.0, 0.08, COLORS.glass);
  }
  // the verandah: ten free columns on stone bases along the front (the eave line), beam over them
  for (let i = 0; i <= 9; i++) {
    const colU = (i - 4.5) * baySpan;
    cyl(colU, frontV + frontD / 2 - 0.4, plinthY, plinthY + 0.22, 0.38, 0.34, 6, shade(COLORS.stone, 0.95), { cap: false });
    cyl(colU, frontV + frontD / 2 - 0.4, plinthY + 0.22, frontEaveY, 0.2, 0.18, 7, COLORS.wood, { cap: false });
  }
  S.kind = KIND.TIMBER;
  box(0, frontV + frontD / 2 - 0.4, frontEaveY - 0.32, frontEaveY, hallW + 0.4, 0.3, COLORS.woodDark);
  S.kind = KIND.PLAIN;
  box(0, frontV + frontD / 2 - 1.2, frontEaveY - 0.3, frontEaveY - 0.22, hallW, 1.9, shade(COLORS.wood, 0.55), { bottom: true }); // verandah ceiling

  // ---- the roofs: three tiers of yellow glazed tiles (front house; rear house skirt; rear house upper roof) ----
  const endOver = 3.7;
  const frontRoofW = hallW + 0.2 + endOver;
  const frontRoofD = frontD + 0.7;
  const frontInset = 2.2;
  hip(0, frontV + 0.35, frontRoofW, frontRoofD, frontEaveY, 1.7, COLORS.tile, { over: 1.25, ridgeCol: null });
  S.kind = KIND.MASONRY;
  box(0, frontV + 0.35, frontEaveY + 0.75, frontEaveY + 1.35, frontRoofW - 2 * frontInset, frontRoofD - 2 * frontInset, COLORS.cream, { top: COLORS.tileDark });
  S.kind = KIND.PLAIN;
  hip(0, frontV + 0.35, frontRoofW - 2 * frontInset, frontRoofD - 2 * frontInset, frontEaveY + 1.3, 1.0, COLORS.tile, { over: 0.6, flare: 0.35 });
  // rear house: the lower skirt round all four sides, a short upright wall, then the high hipped roof
  hip(0, rearV, hallW + 0.2 + endOver, rearD, rearEaveY, 1.2, COLORS.tileDark, { over: 1.3, flare: 0.3, ridgeCol: null });
  S.kind = KIND.TIMBER;
  box(0, rearV, rearEaveY + 1.05, rearEaveY + 2.0, hallW - 7.4, rearD - 5.2, COLORS.woodDark, { top: COLORS.tileDark });
  const upperBaseY = rearEaveY + 1.95;
  const upperRoofH = plinthY + 7.9 - upperBaseY; // ridge 9.0 m above the court (city survey)
  hip(0, rearV, hallW - 7.4, rearD - 5.2, upperBaseY, upperRoofH, COLORS.tile, { over: 1.15, flare: 0.5 });
  // the valley gutter between the two houses
  S.kind = KIND.PLAIN;
  box(0, rearV + rearD / 2 + 0.15, frontEaveY + 0.15, frontEaveY + 0.35, hallW + 0.6 + endOver, 0.5, shade(COLORS.tileDark, 0.7));
  // the main ridge: ornate lưỡng long chầu nhật (twin dragons facing the sun) + gourd on front ridge
  const ridgeY = upperBaseY + upperRoofH;
  ridgeDragons(S, toWorld(0, rearV), ridgeY + 0.08, angle, { span: 7.4, scale: 1.0 });
  const frontRidgeY = frontEaveY + 2.3;
  const frontCenter = toWorld(0, frontV + 0.35);
  ridgeGourd(S, frontCenter[0], frontCenter[1], frontRidgeY + 0.06, 0.9, COLORS.ridge);
}

function buildGateTicketHouseAndFence(data, S, frame, gateV) {
  const { center, axisX, axisZ, toWorld, box, hip, cyl } = frame;
  // ---- the gate on Lê Trực: two tall ochre piers with cream caps and a lotus finial, iron leaves folded back ----
  S.base = 0;
  const gatePos = toWorld(0, gateV);
  const gateGroundY = groundY(gatePos[0], gatePos[1]);
  S.base = gateGroundY - LAND_Y;
  for (const side of [-1, 1]) {
    S.kind = KIND.MASONRY;
    box(side * (GATE_WIDTH / 2 + 0.55), gateV, gateGroundY - 0.3, gateGroundY + 3.6, 1.1, 1.1, COLORS.ochre, { top: COLORS.cream });
    S.kind = KIND.PLAIN;
    box(side * (GATE_WIDTH / 2 + 0.55), gateV, gateGroundY + 3.6, gateGroundY + 3.85, 1.35, 1.35, COLORS.cream);
    cyl(side * (GATE_WIDTH / 2 + 0.55), gateV, gateGroundY + 3.85, gateGroundY + 4.15, 0.42, 0.5, 8, COLORS.finial, { cap: false }); // the lotus finial
    cyl(side * (GATE_WIDTH / 2 + 0.55), gateV, gateGroundY + 4.15, gateGroundY + 4.65, 0.5, 0.08, 8, COLORS.finial);
    // the open iron leaves folded back inside
    box(side * (GATE_WIDTH / 2 - 0.1), gateV - 1.4, gateGroundY, gateGroundY + 2.2, 0.08, 2.6, COLORS.iron);
  }

  // ---- the ticket house beside the gate (south-west of it, in the fence line): ochre walls, two tiers of brown tile ----
  const ticketHouse = { u: -(GATE_WIDTH / 2 + 1.1 + 0.9 + 1.9), v: gateV - 1.5, w: 3.8, d: 3.6 };
  const ticketPos = toWorld(ticketHouse.u, ticketHouse.v);
  const ticketY = groundY(ticketPos[0], ticketPos[1]);
  S.base = ticketY - LAND_Y;
  S.kind = KIND.MASONRY;
  box(ticketHouse.u, ticketHouse.v, ticketY - 0.3, ticketY + 0.3, ticketHouse.w + 0.4, ticketHouse.d + 0.4, COLORS.stone);
  box(ticketHouse.u, ticketHouse.v, ticketY + 0.3, ticketY + 3.1, ticketHouse.w, ticketHouse.d, COLORS.render, { top: COLORS.tileDark });
  for (const signU of [-1, 1]) {
    for (const signV of [-1, 1]) {
      box(ticketHouse.u + signU * (ticketHouse.w / 2 - 0.1), ticketHouse.v + signV * (ticketHouse.d / 2 - 0.1), ticketY + 0.3, ticketY + 3.1, 0.24, 0.24, COLORS.woodDark); // corner posts
    }
  }
  S.kind = KIND.PLAIN;
  box(ticketHouse.u + 0.7, ticketHouse.v + ticketHouse.d / 2 + 0.03, ticketY + 0.3, ticketY + 2.5, 1.2, 0.06, COLORS.woodDark); // the door, facing the street
  box(ticketHouse.u - 0.9, ticketHouse.v + ticketHouse.d / 2 + 0.03, ticketY + 1.0, ticketY + 2.3, 1.0, 0.06, COLORS.cream); // the notice board by the window
  S.kind = KIND.TILE;
  hip(ticketHouse.u, ticketHouse.v, ticketHouse.w, ticketHouse.d, ticketY + 3.1, 0.9, COLORS.brownTile, { over: 1.05, flare: 0.15, hips: false, glazed: false, ridgeCol: null, segs: 2 });
  S.kind = KIND.MASONRY;
  box(ticketHouse.u, ticketHouse.v, ticketY + 3.85, ticketY + 4.35, 2.3, 2.0, COLORS.render, { top: COLORS.tileDark });
  S.kind = KIND.TILE;
  hip(ticketHouse.u, ticketHouse.v, 2.3, 2.0, ticketY + 4.3, 0.7, COLORS.brownTile, { over: 0.4, flare: 0.2, hips: false, glazed: false, ridgeCol: null, segs: 2 });
  // small merlon blocks at the corners of the upper tier, as on the real roof
  S.kind = KIND.MASONRY;
  for (const signU of [-1, 1]) {
    for (const signV of [-1, 1]) box(ticketHouse.u + signU * 1.2, ticketHouse.v + signV * 1.05, ticketY + 4.3, ticketY + 4.75, 0.3, 0.3, COLORS.render, { top: COLORS.tileDark });
  }
  // a dark name board over the door, a cream notice panel beside it, and a low balustrade stub either side
  S.kind = KIND.PLAIN;
  box(ticketHouse.u + 0.7, ticketHouse.v + ticketHouse.d / 2 + 0.04, ticketY + 2.55, ticketY + 2.9, 1.3, 0.06, COLORS.woodDark);
  box(ticketHouse.u + 0.7, ticketHouse.v + ticketHouse.d / 2 + 0.07, ticketY + 2.62, ticketY + 2.82, 0.9, 0.04, COLORS.cream);
  S.kind = KIND.MASONRY;
  for (const side of [-1, 1]) box(ticketHouse.u + side * (ticketHouse.w / 2 + 0.9), ticketHouse.v + ticketHouse.d / 2 + 0.2, ticketY - 0.1, ticketY + 0.95, 1.2, 0.35, COLORS.stone, { top: shade(COLORS.stone, 1.15) });
  const ticketRing = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([signU, signV]) => toWorld(ticketHouse.u + signU * (ticketHouse.w / 2 + 0.3), ticketHouse.v + signV * (ticketHouse.d / 2 + 0.3)));

  // ---- the fence round the grounds ----
  S.base = 0;
  const frontFenceSpec = { h: 2.0, plinth: 1.15, rail: true, t: 0.34, every: 3.0, postW: 0.5, postUp: 0.25, wall: COLORS.moss, cap: shade(COLORS.moss, 1.12), postCol: COLORS.ochre, iron: COLORS.iron, pierW: 1.1, pierUp: 1.4 };
  const backWallH = 2.6;
  const backSplitU = 23.5; // wall height; the wall ends here along u (between the annex and the NE pavilions)
  const backWallSpec = { h: backWallH, rail: false, t: 0.3, every: 3.2, postW: 0.34, postUp: 0.04, wall: COLORS.concrete, cap: shade(COLORS.concrete, 1.12) };
  // OSM draws the back of the grounds to the kerb of Đinh Công Tráng; the wall stands behind a pavement about 2.5 m
  // wide (the street pano), 6 m from the street's middle, so the back edge is brought in 2.1 m toward the hall
  const insetBackPt = (pt): [number, number] => [pt[0] - axisZ * 2.1, pt[1] + axisX * 2.1];
  const yardPoly = [insetBackPt(GROUNDS_RING[0]), GROUNDS_RING[1], GROUNDS_RING[2], insetBackPt(GROUNDS_RING[3])];
  const fenceRing = offStreets(data, yardPoly);
  const backStart = yardPoly[3];
  const backEnd = yardPoly[0];
  const backLen = Math.hypot(backEnd[0] - backStart[0], backEnd[1] - backStart[1]);
  const backDirX = (backEnd[0] - backStart[0]) / backLen;
  const backDirZ = (backEnd[1] - backStart[1]) / backLen;
  const isBackEdge = (ptA, ptB) => Math.abs(((ptA[0] + ptB[0]) / 2 - backStart[0]) * backDirZ - ((ptA[1] + ptB[1]) / 2 - backStart[1]) * backDirX) < 5;
  // split the back edges where they cross u = backSplitU, so the wall stops there and the balustrade takes over
  const localUOf = (pt) => (pt[0] - center[0]) * axisX + (pt[1] - center[1]) * axisZ;
  const splitPts = [];
  for (let i = 0; i < fenceRing.length; i++) {
    const ptA = fenceRing[i];
    const ptB = fenceRing[(i + 1) % fenceRing.length];
    splitPts.push(ptA);
    const diffA = localUOf(ptA) - backSplitU;
    const diffB = localUOf(ptB) - backSplitU;
    if (isBackEdge(ptA, ptB) && diffA * diffB < 0) {
      const frac = diffA / (diffA - diffB);
      splitPts.push([ptA[0] + (ptB[0] - ptA[0]) * frac, ptA[1] + (ptB[1] - ptA[1]) * frac]);
    }
  }
  const splitCount = splitPts.length;
  const isConcreteWall = splitPts.map((pt, i) => {
    const nextPt = splitPts[(i + 1) % splitCount];
    return isBackEdge(pt, nextPt) && (localUOf(pt) + localUOf(nextPt)) / 2 < backSplitU;
  });
  const firstChange = isConcreteWall.findIndex((val, i) => val !== isConcreteWall[(i + splitCount - 1) % splitCount]);
  const fenceRuns = [];
  if (firstChange < 0) {
    fenceRuns.push({ back: isConcreteWall[0], pts: splitPts, closed: true });
  } else {
    for (let k = 0, currRun = null; k < splitCount; k++) {
      const i = (firstChange + k) % splitCount;
      if (!currRun || currRun.back !== isConcreteWall[i]) {
        currRun = { back: isConcreteWall[i], pts: [splitPts[i]], closed: false };
        fenceRuns.push(currRun);
      }
      currRun.pts.push(splitPts[(i + 1) % splitCount]);
    }
  }
  for (const run of fenceRuns) {
    if (!run.back) {
      fence(S, run.pts, frontFenceSpec, { closed: run.closed, openings: [[gatePos[0], gatePos[1], 4.1]], solid: [ticketRing] });
      continue;
    }
    fence(S, run.pts, backWallSpec, { closed: run.closed });
    // the wire fence on the wall: posts every 2.8 m leaning out at the top, four wires
    for (let i = 0; i + 1 < run.pts.length; i++) {
      const ptA = run.pts[i];
      const ptB = run.pts[i + 1];
      const segLen = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
      if (segLen < 0.5) continue;
      const segAngle = Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]);
      const normX = -(ptB[1] - ptA[1]) / segLen;
      const normZ = (ptB[0] - ptA[0]) / segLen;
      const outSign = (center[0] - ptA[0]) * normX + (center[1] - ptA[1]) * normZ > 0 ? -1 : 1; // away from the hall, toward the street
      const bayCount = Math.max(1, Math.round(segLen / 2.8));
      for (let k = 0; k <= bayCount; k++) {
        const postX = ptA[0] + ((ptB[0] - ptA[0]) * k) / bayCount;
        const postZ = ptA[1] + ((ptB[1] - ptA[1]) * k) / bayCount;
        const wallTopY = groundY(postX, postZ) + backWallH;
        S.base = wallTopY - backWallH - LAND_Y;
        S.kind = KIND.PLAIN;
        S.box(postX, postZ, wallTopY, wallTopY + 1.45, 0.07, 0.07, segAngle, COLORS.wire);
        S.beam([postX, wallTopY + 1.4, postZ], [postX + normX * outSign * 0.35, wallTopY + 1.85, postZ + normZ * outSign * 0.35], 0.05, 0.05, COLORS.wire);
      }
      const midX = (ptA[0] + ptB[0]) / 2;
      const midZ = (ptA[1] + ptB[1]) / 2;
      const midTopY = groundY(midX, midZ) + backWallH;
      for (const wireH of [0.45, 0.9, 1.35]) S.box(midX, midZ, midTopY + wireH, midTopY + wireH + 0.03, segLen, 0.03, segAngle, COLORS.wire);
      S.box(midX + normX * outSign * 0.3, midZ + normZ * outSign * 0.3, midTopY + 1.78, midTopY + 1.81, segLen, 0.03, segAngle, COLORS.wire);
    }
  }
}

function buildAnnexesAndExhibits(S, frame, baseY) {
  const { center, toWorld, box, hip, cyl } = frame;
  // ---- the buildings behind and beside the hall (OSM 695810709 and 695810708, set on the satellite) ----
  S.base = baseY - LAND_Y;
  // the court between the hall and the rear annex: paved (no trees, no mapped house drawn over it)
  const rearPavedStart = S.n;
  S.kind = KIND.MASONRY;
  box(0, -17.3, baseY - 0.2, baseY + 0.24, 37.5, 4.2, shade(COLORS.stone, 0.9), { topKind: KIND.ROAD });
  S.paved.push([rearPavedStart, S.n]);

  // the rear annex: a long ochre hall, eaves about 36.7 x 12.5 m, under a two-tier red corrugated-metal roof: a broad
  // lean-to lower roof, a narrow vented clerestory band, a low upper roof (proportions from the Đinh Công Tráng pano)
  const annexV = -25.45;
  const annexW = 34.9;
  const annexD = 10.7;
  const annexEaveY = baseY + 3.6;
  const clerestoryW = annexW - 6;
  const clerestoryD = annexD - 5.4;
  S.kind = KIND.MASONRY;
  box(0, annexV, baseY - 0.2, baseY + 0.35, annexW + 0.4, annexD + 0.4, shade(COLORS.stone, 0.85));
  box(0, annexV, baseY + 0.35, annexEaveY, annexW, annexD, COLORS.render, { top: COLORS.tileDark });
  S.kind = KIND.PLAIN;
  for (let i = -6; i <= 6; i++) box(i * 2.6, annexV + annexD / 2 + 0.04, baseY + 0.9, baseY + 3.1, 1.3, 0.06, COLORS.woodDark); // doors on the court side
  S.kind = KIND.TILE;
  hip(0, annexV, annexW, annexD, annexEaveY, 2.15, COLORS.redTin, { over: 1.0, flare: 0.05, glazed: false, ridgeCol: null, fasciaCol: COLORS.cream, fascia: 0.2 });
  S.kind = KIND.MASONRY;
  box(0, annexV, annexEaveY + 1.0, annexEaveY + 1.95, clerestoryW, clerestoryD, COLORS.render, { top: COLORS.tileDark });
  S.kind = KIND.PLAIN;
  for (let i = -11; i <= 11; i++) {
    for (const faceSign of [-1, 1]) {
      box(i * 1.2, annexV + faceSign * (clerestoryD / 2 + 0.03), annexEaveY + 1.45, annexEaveY + 1.65, 0.5, 0.06, shade(COLORS.render, 0.45)); // the vents in the band
    }
  }
  S.kind = KIND.TILE;
  const upperRoofY = annexEaveY + 1.9;
  const upperRoofH = 1.2;
  hip(0, annexV, clerestoryW, clerestoryD, upperRoofY, upperRoofH, COLORS.redTin, { over: 0.7, flare: 0.05, glazed: false, ridgeCol: shade(COLORS.redTin, 0.8), fasciaCol: COLORS.cream, fascia: 0.2 });
  // the ridge: a sun disc at the middle, a dragon finial at each end
  S.kind = KIND.PLAIN;
  const annexRidgeY = upperRoofY + upperRoofH;
  const ridgeEndU = (clerestoryW - clerestoryD) / 2;
  cyl(0, annexV, annexRidgeY, annexRidgeY + 0.75, 0.35, 0.3, 8, COLORS.finial);
  for (const side of [-1, 1]) {
    const ptA = toWorld(side * ridgeEndU, annexV);
    const ptB = toWorld(side * (ridgeEndU - 0.6), annexV);
    const ptTip = toWorld(side * (ridgeEndU - 1.1), annexV);
    S.beam([ptA[0], annexRidgeY, ptA[1]], [ptB[0], annexRidgeY + 1.0, ptB[1]], 0.22, 0.3, COLORS.finial);
    S.beam([ptB[0], annexRidgeY + 1.0, ptB[1]], [ptTip[0], annexRidgeY + 0.75, ptTip[1]], 0.18, 0.26, COLORS.finial);
  }

  // the small brown-tiled pavilions beyond the annex's ends: two to the north-east, one to the south-west
  for (const [pavU, pavV, pavW] of ANNEX_PAVILIONS) {
    const pavEaveY = baseY + 3.6;
    S.kind = KIND.MASONRY;
    box(pavU, pavV, baseY - 0.2, baseY + 0.35, pavW + 0.4, pavW + 0.4, shade(COLORS.stone, 0.85));
    box(pavU, pavV, baseY + 0.35, pavEaveY, pavW, pavW, COLORS.render, { top: COLORS.tileDark });
    S.kind = KIND.TILE;
    hip(pavU, pavV, pavW, pavW, pavEaveY, 1.0, COLORS.brownTile, { over: 0.8, flare: 0.35, glazed: false, ridgeCol: null, segs: 3 });
    S.kind = KIND.MASONRY;
    box(pavU, pavV, pavEaveY + 0.85, pavEaveY + 1.4, pavW - 3.6, pavW - 3.6, COLORS.render, { top: COLORS.tileDark });
    S.kind = KIND.TILE;
    hip(pavU, pavV, pavW - 3.6, pavW - 3.6, pavEaveY + 1.35, 1.5, COLORS.brownTile, { over: 0.6, flare: 0.4, glazed: false, ridgeCol: shade(COLORS.brownTile, 0.8), segs: 3 });
  }

  // the long shed north-east of the hall, square to it: ochre walls under a green metal gable roof, about 34 x 11.3 m at the eaves
  const shedU = 37.6;
  const shedV = 2.1;
  const shedW = 10.3;
  const shedL = 33.0;
  const shedEaveY = baseY + 3.4;
  const shedRoofH = 2.4;
  const shedOver = 0.5;
  S.kind = KIND.MASONRY;
  box(shedU, shedV, baseY - 0.2, baseY + 0.3, shedW + 0.3, shedL + 0.3, shade(COLORS.stone, 0.85));
  box(shedU, shedV, baseY + 0.3, shedEaveY, shedW, shedL, COLORS.render, { top: COLORS.tileDark });
  S.kind = KIND.PLAIN;
  for (let i = -5; i <= 5; i++) box(shedU - shedW / 2 - 0.04, shedV + i * 2.9, baseY + 1.2, baseY + 2.6, 0.06, 1.4, COLORS.glass); // windows to the hall
  const shedPt3 = (localU, localV, y) => {
    const pos = toWorld(localU, localV);
    return [pos[0], y, pos[1]];
  };
  const shedV0 = shedV - shedL / 2 - shedOver;
  const shedV1 = shedV + shedL / 2 + shedOver;
  const shedLowY = shedEaveY - shedOver * (shedRoofH / (shedW / 2));
  S.kind = KIND.TILE;
  for (const side of [-1, 1]) {
    const normPt = toWorld(side, 0);
    const slopeNorm = [normPt[0] - center[0], 1.6, normPt[1] - center[1]];
    S.quad(shedPt3(shedU + side * (shedW / 2 + shedOver), shedV0, shedLowY), shedPt3(shedU + side * (shedW / 2 + shedOver), shedV1, shedLowY), shedPt3(shedU, shedV1, shedEaveY + shedRoofH), shedPt3(shedU, shedV0, shedEaveY + shedRoofH), shade(COLORS.greenTin, side < 0 ? 1 : 0.94), slopeNorm);
  }
  S.kind = KIND.MASONRY;
  for (const [endV, endSign] of [[shedV - shedL / 2, -1], [shedV + shedL / 2, 1]]) {
    const normPt = toWorld(0, endSign);
    S.tri(shedPt3(shedU - shedW / 2, endV, shedEaveY), shedPt3(shedU + shedW / 2, endV, shedEaveY), shedPt3(shedU, endV, shedEaveY + shedRoofH), COLORS.render, [normPt[0] - center[0], 0, normPt[1] - center[1]]);
  }

  // ---- outdoor exhibits in the front court: two bronze cauldrons on stone plinths flanking the path, and a row of
  //      stone pieces (mortars, a stele, column bases) on the lawn either side ----
  S.base = baseY - LAND_Y;
  for (const side of [-1, 1]) {
    const cauldronU = side * 6.5;
    const cauldronV = PLATFORM_DEPTH / 2 + 11;
    S.kind = KIND.MASONRY;
    box(cauldronU, cauldronV, baseY - 0.2, baseY + 0.55, 2.0, 2.0, COLORS.stone);
    S.kind = KIND.PLAIN;
    cyl(cauldronU, cauldronV, baseY + 0.55, baseY + 0.75, 0.55, 0.62, 10, COLORS.bronze, { cap: false });
    cyl(cauldronU, cauldronV, baseY + 0.75, baseY + 1.55, 0.95, 0.82, 12, COLORS.bronze);
    cyl(cauldronU, cauldronV, baseY + 1.5, baseY + 1.62, 1.0, 1.0, 12, shade(COLORS.bronze, 1.2));
    for (const handleSide of [-1, 1]) box(cauldronU + handleSide * 0.85, cauldronV, baseY + 1.55, baseY + 2.0, 0.12, 0.5, COLORS.bronze); // the ear handles
    // stone pieces on the lawn
    for (let j = 0; j < 3; j++) {
      const pieceU = side * (13 + j * 3.2);
      const pieceV = PLATFORM_DEPTH / 2 + 8.5;
      S.kind = KIND.MASONRY;
      box(pieceU, pieceV, baseY - 0.1, baseY + 0.35, 1.3, 1.3, shade(COLORS.stone, 0.95));
      S.kind = KIND.PLAIN;
      if (j === 1) box(pieceU, pieceV, baseY + 0.35, baseY + 1.9, 0.9, 0.25, shade(COLORS.stone, 0.78), { top: shade(COLORS.stone, 0.7) }); // a stele
      else cyl(pieceU, pieceV, baseY + 0.35, baseY + 0.95, 0.5, 0.42, 8, shade(COLORS.stone, 0.72)); // a stone mortar / column base
    }
  }
}

export function build({ data, S }) {
  const frame = createHallFrame(S);
  const baseY = groundY(frame.center[0], frame.center[1]);
  S.base = baseY - LAND_Y;

  // where the axis meets the front fence (the gate)
  let gateV = 44;
  const [frontA, frontB] = [GROUNDS_RING[1], GROUNDS_RING[2]];
  const frontDX = frontB[0] - frontA[0];
  const frontDZ = frontB[1] - frontA[1];
  const fwdX = -frame.axisZ;
  const fwdZ = frame.axisX;
  const denom = fwdX * frontDZ - fwdZ * frontDX;
  if (Math.abs(denom) > 1e-6) gateV = ((frontA[0] - frame.center[0]) * frontDZ - (frontA[1] - frame.center[1]) * frontDX) / denom;

  buildMainHallAndCourt(S, frame, baseY, gateV);
  buildGateTicketHouseAndFence(data, S, frame, gateV);
  buildAnnexesAndExhibits(S, frame, baseY);

  S.kind = KIND.PLAIN;
  S.base = 0;
}
