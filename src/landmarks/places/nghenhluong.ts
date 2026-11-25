import { Buf, KIND, hex, shade, hipShape, unflat } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { lightMaterial, glowPoints } from '../../geo/materials.ts';

// Nghênh Lương Đình (迎涼亭), the royal river pavilion on the Kỳ Đài – Phu Văn Lâu axis, at the Hương River bank.
// Built 1852 (Tự Đức 5), restored 1903 (Thành Thái 15) after storm damage, rebuilt 1918 (Khải Định 3) and joined
// to the boat landing. Sources and estimates: docs/places/nghenhluong.md.
//
// Plan (sourced): a "phương đình 1 gian 4 chái" (a square open pavilion, one central bay ringed by four aisles) on
// 16 wooden columns, open on all four sides, with a "nhà vỏ cua" (crab-shell porch) before and behind joined to it
// by gutters. Main roof two-tiered (chồng diêm) in yellow glazed tubular tiles, the porch roofs in yellow glazed
// flat tiles; on the main ridge two dragons facing the sun. Platform 0.9 m, brick and bluestone kerbs; on the river
// side 13 steps down to a corridor at the water.
// Footprint: OSM way 239568224, 14.7 m along the axis × 11.1 m across, is the pavilion under its roofs (the satellite
// roof measures 15.0 × 11.9 m). The pavilion stands on a square terrace about 17.7 × 18 m (satellite), reached from
// the plaza by a flight about 8 m wide between low ochre parapets (Street View from Lê Duẩn), with a brick-paved
// apron about 9 m deep and 28 m wide before it. The column grid, tier heights and the porch depth are estimates from
// photos, scaled to the OSM outline.
export const id = 'nghenhluong';

// the centre and long axis (metres, model frame: x east, z south), the axis pointing to the river. OSM's outline
// centre is (-796.33, 453.15); on the satellite (z20, measured on the terrace and on the roof, which agree) the
// pavilion stands 1.8 m north-east of it across the axis and 0.4 m toward the river, so the outline is re-framed here.
// The axis (145.4°) matches the satellite to within a degree.
const PAVILION_CENTER = [-794.62, 452.46];
const RIVER_AXIS = (() => {
  const dx = 8.3 + 8.4;
  const dz = 12.1 + 12.1;
  const len = Math.hypot(dx, dz);
  return [dx / len, dz / len];
})();

const TERRACE_LEN = 17.7;
const TERRACE_WIDTH = 18.0;
const TERRACE_HEIGHT = 0.9;
const TERRACE_STEPS = 5;
const TERRACE_TREAD = 0.3;
const COLUMN_GRID = [-4.0, -1.6, 1.6, 4.0]; // column lines, both ways (estimated: 8 m square at the outer columns)
const PORCH_DEPTH = 2.4; // depth of each crab-shell porch
const OUTER_COL_HEIGHT = 3.2;
const INNER_COL_HEIGHT = 4.6;
const PORCH_COL_HEIGHT = 3.0;
const BANK_DIST = 18.0;
const WATER_LANDING_Y = 0.45;
const RIVER_STEPS = 13;
const RIVER_STEP_TREAD = 0.3;
const RIVER_STAIR_W = 3.6;

// the glazed yellow tiles have weathered to a dull ochre-brown (Street View) that reads tan from above (satellite)
const COLORS = {
  roof: hex('#a98252'),
  ridge: hex('#4f453c'), // the ridges and crest: dark, almost charcoal (Street View)
  crest: hex('#3f3a33'),
  lacquer: PAL.lacquer, // red lacquered columns and beams
  gold: hex('#c9a13b'),
  kerb: hex('#7d817f'), // đá thanh, the grey-blue bluestone of the kerbs and steps
  ochre: hex('#c4a067'), // the terrace's plastered face and parapets, a weathered ochre (Street View)
  panel: hex('#c9a65a'), // the yellow panels on the porch piers
  pave: hex('#a3735c'), // the brick-paved apron toward the plaza (satellite)
  floor: hex('#b8ab95'),
  friezeBand: hex('#3d2a22'),
  dragonBody: hex('#4a5442'),
  pearlTop: hex('#8a6a3a'),
  jettyDeck: hex('#a59d90'),
  jettyPile: hex('#6d6a64'),
  lampPost: hex('#3a3633'),
  lanternRgb: [1.0, 0.72, 0.34],
  lightTint: 0xffae42,
};

function buildTerraceAndParapets(S, frame, floorY) {
  const { centerX, centerZ, axisAt, fwdAngle, perpAngle } = frame;
  const stepRise = TERRACE_HEIGHT / TERRACE_STEPS;

  // ---- the brick-paved apron between the plaza and the terrace (satellite: about 9 m deep, 28 m wide) ----
  S.kind = KIND.MASONRY;
  const apronEndA = -(TERRACE_LEN / 2 + TERRACE_TREAD * (TERRACE_STEPS - 1));
  const apronStartA = -18.0;
  const apronPos = axisAt((apronEndA + apronStartA) / 2, 0);
  S.box(apronPos[0], apronPos[1], LAND_Y - 0.2, LAND_Y + 0.05, apronEndA - apronStartA, 28.0, fwdAngle, COLORS.pave, { topKind: KIND.ROAD });

  // ---- the terrace (0.9 m): an ochre plastered face on a bluestone plinth, a bluestone kerb round the floor ----
  S.box(centerX, centerZ, LAND_Y - 0.3, LAND_Y + 0.18, TERRACE_LEN + 0.2, TERRACE_WIDTH + 0.2, fwdAngle, COLORS.kerb, { topKind: KIND.ROAD });
  S.box(centerX, centerZ, LAND_Y + 0.18, floorY - 0.14, TERRACE_LEN, TERRACE_WIDTH, fwdAngle, COLORS.ochre);
  S.box(centerX, centerZ, floorY - 0.14, floorY, TERRACE_LEN + 0.12, TERRACE_WIDTH + 0.12, fwdAngle, COLORS.kerb, { top: COLORS.floor, topKind: KIND.ROAD });

  // a flight up the middle of the plaza (front) face, about 8 m wide (Street View), and a narrower one on the
  // river face (not visible in the imagery; kept from the earlier estimate)
  for (const faceSign of [-1, 1]) {
    const stairW = faceSign < 0 ? 8.0 : 3.4;
    S.kind = KIND.MASONRY;
    for (let k = 1; k < TERRACE_STEPS; k++) {
      const stepPos = axisAt(faceSign * (TERRACE_LEN / 2 + TERRACE_TREAD * (k - 0.5)), 0);
      S.box(stepPos[0], stepPos[1], LAND_Y - 0.2, floorY - stepRise * k, TERRACE_TREAD, stairW, fwdAngle, shade(COLORS.kerb, 1.08), { topKind: KIND.ROAD });
    }
    S.kind = KIND.PLAIN;
    for (const side of [-1, 1]) {
      const ptA = axisAt(faceSign * (TERRACE_LEN / 2 - 0.2), side * (stairW / 2 + 0.2));
      const ptB = axisAt(faceSign * (TERRACE_LEN / 2 + TERRACE_TREAD * (TERRACE_STEPS - 1) + 0.1), side * (stairW / 2 + 0.2));
      S.beam([ptA[0], floorY + 0.1, ptA[1]], [ptB[0], LAND_Y + 0.12, ptB[1]], 0.36, 0.34, COLORS.kerb);
    }
  }

  // the low parapets round the terrace, broken by the two flights: ochre balustrades with a band of sunk panels on
  // both faces and a dark coping (Street View from the plaza; the satellite shows the rim on all four sides)
  const buildParapet = (a0, b0, a1, b1) => {
    const len = Math.hypot(a1 - a0, b1 - b0);
    const alongA = Math.abs(a1 - a0) > Math.abs(b1 - b0);
    const angle = alongA ? fwdAngle : perpAngle;
    const pos = axisAt((a0 + a1) / 2, (b0 + b1) / 2);
    S.kind = KIND.MASONRY;
    S.box(pos[0], pos[1], floorY, floorY + 0.08, len, 0.46, angle, shade(COLORS.ochre, 0.9)); // the plinth
    S.box(pos[0], pos[1], floorY + 0.08, floorY + 0.52, len, 0.4, angle, COLORS.ochre);
    S.box(pos[0], pos[1], floorY + 0.52, floorY + 0.64, len + 0.06, 0.5, angle, shade(COLORS.kerb, 0.62)); // the coping
    S.kind = KIND.PLAIN;
    const panelCount = Math.max(1, Math.round(len / 0.75));
    const panelLen = len / panelCount;
    for (let k = 0; k < panelCount; k++) {
      const frac = (k + 0.5) / panelCount;
      const midPos = axisAt(a0 + (a1 - a0) * frac, b0 + (b1 - b0) * frac);
      S.box(midPos[0], midPos[1], floorY + 0.17, floorY + 0.43, panelLen - 0.2, 0.43, angle, shade(COLORS.ochre, 0.58)); // sunk panels, both faces
    }
  };
  const edgeA = TERRACE_LEN / 2 - 0.2;
  const edgeB = TERRACE_WIDTH / 2 - 0.2;
  for (const side of [-1, 1]) {
    buildParapet(-edgeA, side * 4.3, -edgeA, side * (edgeB - 0.2)); // plaza front, either side of the 8 m flight
    buildParapet(edgeA, side * 1.95, edgeA, side * (edgeB - 0.2)); // river front, either side of the 3.4 m flight
    buildParapet(-edgeA, side * edgeB, edgeA, side * edgeB); // the two sides
  }
}

function buildPavilionFrameAndPorches(S, frame, floorY) {
  const { axisAt, fwdAngle, perpAngle } = frame;
  // ---- the open pavilion: 16 columns in a 4 × 4 grid (one bay and four aisles), porches before and behind ----
  const buildColumn = (alongA, acrossB, height, radius) => {
    const pos = axisAt(alongA, acrossB);
    S.cyl(pos[0], pos[1], floorY, floorY + 0.24, radius * 1.8, radius * 1.55, 6, shade(PAL.stone, 0.95), { cap: false, rot: fwdAngle });
    S.cyl(pos[0], pos[1], floorY + 0.24, floorY + height, radius, radius * 0.93, 8, COLORS.lacquer, { cap: false, rot: fwdAngle });
  };
  S.kind = KIND.TIMBER;
  for (const colA of COLUMN_GRID) {
    for (const colB of COLUMN_GRID) {
      const isInner = Math.abs(colA) < 2 && Math.abs(colB) < 2;
      buildColumn(colA, colB, isInner ? INNER_COL_HEIGHT : OUTER_COL_HEIGHT, isInner ? 0.2 : 0.17);
    }
  }

  // beams on the column heads, with the carved fretwork (liên ba) hung between the outer columns
  const addBeam = (a0, b0, a1, b1, y, width, height, color) => {
    const pt0 = axisAt(a0, b0);
    const pt1 = axisAt(a1, b1);
    S.beam([pt0[0], y, pt0[1]], [pt1[0], y, pt1[1]], width, height, color);
  };
  const beamCol = shade(COLORS.lacquer, 0.8);
  for (const side of [-1, 1]) {
    addBeam(-4, side * 4, 4, side * 4, floorY + OUTER_COL_HEIGHT - 0.12, 0.26, 0.3, beamCol); // the sides of the main square
    addBeam(side * 4, -4, side * 4, 4, floorY + OUTER_COL_HEIGHT - 0.12, 0.26, 0.3, beamCol);
    for (const porchB of [-4, 4]) addBeam(side * 4, porchB, side * (4 + PORCH_DEPTH), porchB, floorY + PORCH_COL_HEIGHT - 0.12, 0.2, 0.24, beamCol);
    addBeam(-1.6, side * 1.6, 1.6, side * 1.6, floorY + INNER_COL_HEIGHT - 0.15, 0.28, 0.34, beamCol); // the inner square
    addBeam(side * 1.6, -1.6, side * 1.6, 1.6, floorY + INNER_COL_HEIGHT - 0.15, 0.28, 0.34, beamCol);
    for (const gridB of COLUMN_GRID) addBeam(side * 1.6, Math.abs(gridB) < 2 ? gridB : gridB * 0.4, side * 4, gridB, floorY + OUTER_COL_HEIGHT - 0.35, 0.18, 0.22, beamCol); // tie beams out to the aisle
  }
  S.kind = KIND.PLAIN;
  const addFretwork = (alongA, acrossB, angle, len, topY, height) => {
    const pos = axisAt(alongA, acrossB);
    S.box(pos[0], pos[1], topY - height, topY, len, 0.07, angle, shade(COLORS.lacquer, 0.62));
    S.box(pos[0], pos[1], topY - 0.06, topY, len, 0.1, angle, COLORS.gold);
  };
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const midCoord = (COLUMN_GRID[i] + COLUMN_GRID[i + 1]) / 2;
      const bayLen = COLUMN_GRID[i + 1] - COLUMN_GRID[i] - 0.36;
      addFretwork(side * 4, midCoord, perpAngle, bayLen, floorY + OUTER_COL_HEIGHT - 0.27, 0.42); // main square, front/back faces (inside the porch)
      addFretwork(midCoord, side * 4, fwdAngle, bayLen, floorY + OUTER_COL_HEIGHT - 0.27, 0.42); // main square, the open sides
    }
  }
  // the porch fronts (Street View): solid red piers with yellow panels, a round-headed opening in each side bay, a
  // wide plain opening in the middle, and over all three a deep dark-red lintel band up to the eave
  for (const faceSign of [-1, 1]) {
    const porchA = faceSign * (4 + PORCH_DEPTH);
    const pierDepth = 0.55;
    const lintelBotY = floorY + PORCH_COL_HEIGHT - 0.82;
    const faceA = porchA + faceSign * (pierDepth / 2 + 0.02);
    S.kind = KIND.TIMBER;
    const lintelPos = axisAt(porchA, 0);
    S.box(lintelPos[0], lintelPos[1], lintelBotY, floorY + PORCH_COL_HEIGHT + 0.02, 8.6, pierDepth, perpAngle, shade(COLORS.lacquer, 0.62));
    S.kind = KIND.PLAIN;
    const frontPos = axisAt(faceA, 0);
    S.box(frontPos[0], frontPos[1], lintelBotY + 0.1, lintelBotY + 0.16, 8.4, 0.04, perpAngle, COLORS.gold); // a thin gilt line along it
    S.box(frontPos[0], frontPos[1], lintelBotY + 0.3, floorY + PORCH_COL_HEIGHT - 0.12, 7.6, 0.04, perpAngle, shade(COLORS.lacquer, 0.45)); // its sunk board
    for (const [pierB, pierW] of [[-3.85, 0.8], [-1.75, 0.7], [1.75, 0.7], [3.85, 0.8]]) {
      S.kind = KIND.TIMBER;
      const pierPos = axisAt(porchA, pierB);
      S.box(pierPos[0], pierPos[1], floorY, lintelBotY, pierW, pierDepth, perpAngle, COLORS.lacquer);
      S.kind = KIND.PLAIN;
      const panelPos = axisAt(faceA, pierB);
      S.box(panelPos[0], panelPos[1], floorY + 0.35, lintelBotY - 0.9, pierW - 0.28, 0.04, perpAngle, COLORS.panel); // a tall yellow panel
      S.box(panelPos[0], panelPos[1], lintelBotY - 0.75, lintelBotY - 0.2, pierW - 0.28, 0.04, perpAngle, COLORS.panel); // a short one above
    }
    // the side bays: a spandrel filled down to a round-headed arch between the piers
    for (const side of [-1, 1]) {
      const bayB0 = 2.1;
      const bayB1 = 3.45;
      const springY = floorY + 1.55;
      const crownY = lintelBotY - 0.12;
      const archSegs = 8;
      const archY = (frac) => springY + (crownY - springY) * Math.sin(Math.PI * frac);
      for (let k = 0; k < archSegs; k++) {
        const frac0 = k / archSegs;
        const frac1 = (k + 1) / archSegs;
        const midB = side * (bayB0 + (bayB1 - bayB0) * (frac0 + frac1) / 2);
        const segBotY = Math.min(archY(frac0), archY(frac1));
        const spandrelPos = axisAt(porchA, midB);
        S.kind = KIND.TIMBER;
        S.box(spandrelPos[0], spandrelPos[1], segBotY, lintelBotY, (bayB1 - bayB0) / archSegs + 0.01, pierDepth * 0.7, perpAngle, shade(COLORS.lacquer, 0.9));
        const pt0 = axisAt(faceA - faceSign * 0.1, side * (bayB0 + (bayB1 - bayB0) * frac0));
        const pt1 = axisAt(faceA - faceSign * 0.1, side * (bayB0 + (bayB1 - bayB0) * frac1));
        S.kind = KIND.PLAIN;
        S.beam([pt0[0], archY(frac0), pt0[1]], [pt1[0], archY(frac1), pt1[1]], 0.08, 0.07, COLORS.gold);
      }
    }
  }
}

function buildRoofsAndCrest(S, frame, floorY) {
  const { centerX, centerZ, axisAt, fwdAngle, perpAngle } = frame;
  // ---- roofs ----
  // Nearly straight eaves (Street View): a slight sweep, small corner ornaments instead of upturned horns, dark ridges
  const eaveStyle = { flare: 0.12, fascia: 0.24, fasciaCol: shade(COLORS.lacquer, 0.62), glazed: true, segs: 3, horns: false, tip: 0.35 };
  const eaveLights: any[] = [];
  // the porches: a lower hip roof each, ridge across the axis, its inner slope running into the main roof's gutter
  for (const faceSign of [-1, 1]) {
    const pos = axisAt(faceSign * (4.0 + PORCH_DEPTH / 2), 0);
    S.kind = KIND.TIMBER;
    S.box(pos[0], pos[1], floorY + PORCH_COL_HEIGHT - 0.1, floorY + PORCH_COL_HEIGHT + 0.02, 8.0, PORCH_DEPTH, perpAngle, shade(COLORS.lacquer, 0.5), { top: shade(COLORS.roof, 0.8), bottom: true });
    S.hip(pos[0], pos[1], 8.0, PORCH_DEPTH, perpAngle, floorY + PORCH_COL_HEIGHT, 0.75, COLORS.roof, { ...eaveStyle, flare: 0.08, over: 0.9, ridgeCol: COLORS.ridge, hips: true, segs: 2 });
    eaveLights.push({ q: pos, w: 8.0, d: PORCH_DEPTH, ang: perpAngle, y: floorY + PORCH_COL_HEIGHT, over: 0.9, fascia: 0.24, sides: [faceSign > 0 ? 'v+' : 'v-', 'u-', 'u+'] });
  }
  // the main roof, first tier: a skirt of tiles all round the 8 m square from the outer column heads
  const lowerRoofH = 1.6;
  S.kind = KIND.TIMBER;
  S.box(centerX, centerZ, floorY + OUTER_COL_HEIGHT - 0.1, floorY + OUTER_COL_HEIGHT + 0.02, 8.0, 8.0, perpAngle, shade(COLORS.lacquer, 0.5), { top: shade(COLORS.roof, 0.8), bottom: true });
  S.hip(centerX, centerZ, 8.0, 8.0, perpAngle, floorY + OUTER_COL_HEIGHT, lowerRoofH, COLORS.roof, { ...eaveStyle, over: 1.15, hips: true, ridgeCol: COLORS.ridge });
  eaveLights.push({ q: [centerX, centerZ], w: 8.0, d: 8.0, ang: perpAngle, y: floorY + OUTER_COL_HEIGHT, over: 1.15, fascia: 0.24, sides: ['u-', 'u+', 'v-', 'v+'] });

  // the chồng diêm: a thin dark band over the inner columns between the two tiers; the upper roof sits almost on the
  // lower one (Street View: about 0.4 m of band shows above the lower tiles)
  const bandY0 = floorY + OUTER_COL_HEIGHT + 0.7;
  const bandY1 = floorY + INNER_COL_HEIGHT;
  S.kind = KIND.TIMBER;
  S.box(centerX, centerZ, bandY0, bandY1, 3.6, 3.4, perpAngle, COLORS.friezeBand, { top: shade(COLORS.roof, 0.8) });
  S.kind = KIND.PLAIN;
  for (const side of [-1, 1]) { // a fine gilt bead along its top
    const beadA = axisAt(side * 1.71, 0);
    S.box(beadA[0], beadA[1], bandY1 - 0.12, bandY1 - 0.07, 3.5, 0.03, perpAngle, COLORS.gold);
    const beadB = axisAt(0, side * 1.81);
    S.box(beadB[0], beadB[1], bandY1 - 0.12, bandY1 - 0.07, 3.3, 0.03, fwdAngle, COLORS.gold);
  }
  // second tier: the upper hip roof, its ridge across the axis (parallel to the river); its eave about 55% as wide as
  // the lower one's (Street View)
  const upperBaseY = bandY1;
  const upperRoofH = 1.6;
  const upperW = 4.0;
  const upperD = 3.4;
  const upperOver = 0.85;
  S.hip(centerX, centerZ, upperW, upperD, perpAngle, upperBaseY, upperRoofH, COLORS.roof, { ...eaveStyle, over: upperOver, ridgeCol: COLORS.ridge, hips: true });
  eaveLights.push({ q: [centerX, centerZ], w: upperW, d: upperD, ang: perpAngle, y: upperBaseY, over: upperOver, fascia: 0.24, sides: ['u-', 'u+', 'v-', 'v+'] });

  // the crest: a heavy dark ridge wall running on down the hips, tall curled ornaments at its ends and in the middle
  // the lưỡng long chầu nhật (two dragons rising to a flaming disc) (Street View: the crest dominates the silhouette)
  const shape = hipShape(upperW + upperOver * 2, upperD + upperOver * 2, eaveStyle.flare, true, COLORS.ridge, eaveStyle.segs);
  const surfYAt = (acrossB) => upperBaseY + upperRoofH * Math.min(1, Math.max(0, (shape.hw - Math.abs(acrossB)) / (shape.hw - shape.rl))) ** shape.gamma;
  const crestTopY = upperBaseY + upperRoofH + 0.45;
  const crestHalfL = 1.45;
  const crestSegs = 6;
  S.kind = KIND.GLAZED;
  for (let k = 0; k < crestSegs; k++) {
    const b0 = -crestHalfL + (2 * crestHalfL * k) / crestSegs;
    const b1 = b0 + (2 * crestHalfL) / crestSegs;
    const segPos = axisAt(0, (b0 + b1) / 2);
    S.box(segPos[0], segPos[1], Math.min(surfYAt(b0), surfYAt(b1)) - 0.05, crestTopY, b1 - b0 + 0.01, 0.34, perpAngle, COLORS.crest);
  }
  const midPos = axisAt(0, 0);
  S.box(midPos[0], midPos[1], crestTopY - 0.24, crestTopY - 0.14, 2 * crestHalfL - 0.3, 0.37, perpAngle, shade(COLORS.ridge, 1.35)); // a paler moulding along it
  for (const side of [-1, 1]) {
    // the end ornaments: a block rising off the crest and curling outward
    const pt0 = axisAt(0, side * (crestHalfL - 0.2));
    const pt1 = axisAt(0, side * (crestHalfL + 0.05));
    const pt2 = axisAt(0, side * (crestHalfL + 0.3));
    S.beam([pt0[0], crestTopY - 0.1, pt0[1]], [pt1[0], crestTopY + 0.42, pt1[1]], 0.34, 0.36, COLORS.crest);
    S.beam([pt1[0], crestTopY + 0.42, pt1[1]], [pt2[0], crestTopY + 0.5, pt2[1]], 0.26, 0.28, COLORS.crest);
    // a dragon either side of the middle, rising toward it
    const tailPos = axisAt(0, side * 1.0);
    const bodyPos = axisAt(0, side * 0.6);
    const headPos = axisAt(0, side * 0.32);
    S.beam([tailPos[0], crestTopY - 0.05, tailPos[1]], [bodyPos[0], crestTopY + 0.35, bodyPos[1]], 0.22, 0.24, COLORS.dragonBody);
    S.beam([bodyPos[0], crestTopY + 0.35, bodyPos[1]], [headPos[0], crestTopY + 0.45, headPos[1]], 0.18, 0.2, COLORS.dragonBody);
  }
  S.cyl(midPos[0], midPos[1], crestTopY, crestTopY + 0.25, 0.14, 0.22, 6, COLORS.crest, { cap: true, rot: fwdAngle });
  S.cyl(midPos[0], midPos[1], crestTopY + 0.25, crestTopY + 0.7, 0.26, 0.05, 8, COLORS.pearlTop, { cap: true, rot: fwdAngle });
  S.kind = KIND.PLAIN;
  return eaveLights;
}

function buildRiverStepsAndJetty(S, frame) {
  const { axisAt, fwdAngle } = frame;
  // ---- toward the river: a paved strip to the bank, 13 steps down it, a small landing at the water and a short jetty
  S.kind = KIND.MASONRY;
  const stripPos = axisAt((TERRACE_LEN / 2 + TERRACE_TREAD * (TERRACE_STEPS - 1) + BANK_DIST) / 2, 0);
  S.box(stripPos[0], stripPos[1], LAND_Y - 0.25, LAND_Y + 0.12, BANK_DIST - TERRACE_LEN / 2 - TERRACE_TREAD * (TERRACE_STEPS - 1), 5.0, fwdAngle, shade(COLORS.floor, 0.95), { topKind: KIND.ROAD });
  const stepRise = (LAND_Y + 0.12 - WATER_LANDING_Y) / RIVER_STEPS;
  for (let k = 1; k <= RIVER_STEPS; k++) {
    const stepPos = axisAt(BANK_DIST + RIVER_STEP_TREAD * (k - 0.5), 0);
    S.box(stepPos[0], stepPos[1], WATER_LANDING_Y - 0.6, LAND_Y + 0.12 - stepRise * k, RIVER_STEP_TREAD, RIVER_STAIR_W, fwdAngle, shade(COLORS.kerb, k % 2 ? 1.05 : 1.0), { topKind: KIND.ROAD });
  }
  const stairRun = RIVER_STEP_TREAD * RIVER_STEPS;
  const cheekOffB = RIVER_STAIR_W / 2 + 0.2;
  S.kind = KIND.PLAIN;
  for (const side of [-1, 1]) { // the cheek walls down the flight
    const ptA = axisAt(BANK_DIST - 0.3, side * cheekOffB);
    const ptB = axisAt(BANK_DIST + stairRun, side * cheekOffB);
    S.beam([ptA[0], LAND_Y + 0.3, ptA[1]], [ptB[0], WATER_LANDING_Y + 0.35, ptB[1]], 0.4, 0.45, COLORS.kerb);
    const wallPos = axisAt(BANK_DIST + stairRun / 2, side * cheekOffB);
    S.box(wallPos[0], wallPos[1], WATER_LANDING_Y - 0.6, WATER_LANDING_Y + 0.1, stairRun + 0.6, 0.4, fwdAngle, COLORS.kerb);
  }
  S.kind = KIND.MASONRY;
  const landingLen = 1.8; // the landing at the foot of the flight
  const landPos = axisAt(BANK_DIST + stairRun + landingLen / 2, 0);
  S.box(landPos[0], landPos[1], WATER_LANDING_Y - 0.9, WATER_LANDING_Y, landingLen, RIVER_STAIR_W + 1.2, fwdAngle, shade(COLORS.kerb, 0.95), { topKind: KIND.ROAD });
  // a short jetty, a deck on piles
  const jettyStart = BANK_DIST + stairRun + landingLen;
  const jettyEnd = jettyStart + 3.5;
  const jettyPos = axisAt((jettyStart + jettyEnd) / 2, 0);
  S.kind = KIND.PLAIN;
  S.box(jettyPos[0], jettyPos[1], WATER_LANDING_Y - 0.12, WATER_LANDING_Y, jettyEnd - jettyStart, 1.4, fwdAngle, COLORS.jettyDeck);
  for (let along = jettyStart + 1.0; along < jettyEnd; along += 2) {
    for (const pileB of [-0.55, 0.55]) {
      const pilePos = axisAt(along, pileB);
      S.box(pilePos[0], pilePos[1], -0.8, WATER_LANDING_Y - 0.12, 0.16, 0.16, fwdAngle, COLORS.jettyPile);
    }
  }
  return { stairRun, cheekOffB };
}

function registerCourtAndTrees(data, frame) {
  const { centerX, centerZ, fwdX, fwdZ, perpX, perpZ, axisAt } = frame;
  // ---- the trees that frame it: Nghênh Lương Đình stands closely flanked by big shade trees (satellite, Street View).
  if (!data) return;
  const toLocal = (x, z) => {
    const dx = x - centerX;
    const dz = z - centerZ;
    return [dx * fwdX + dz * fwdZ, dx * perpX + dz * perpZ];
  };
  (data.courts ||= {})[id] = (x, z) => {
    const [along, across] = toLocal(x, z);
    return (along > -TERRACE_LEN / 2 - 3 && along < 40 && Math.abs(across) < TERRACE_WIDTH / 2 + 1.5)
      || (along <= -TERRACE_LEN / 2 - 3 && along > -80 && Math.abs(across) < 22);
  };
  if (!Array.isArray(data.trees)) return;
  const nearbyRoadSegs = [];
  for (const roadRec of data.roads || []) {
    const pts = unflat(roadRec[2]);
    for (let k = 0; k + 1 < pts.length; k++) {
      if (Math.hypot(pts[k][0] - centerX, pts[k][1] - centerZ) < 90) nearbyRoadSegs.push([pts[k], pts[k + 1]]);
    }
  }
  const distToSeg = (x, z, pt0, pt1) => {
    const dx = pt1[0] - pt0[0];
    const dz = pt1[1] - pt0[1];
    const lenSq = dx * dx + dz * dz || 1;
    const proj = Math.max(0, Math.min(1, ((x - pt0[0]) * dx + (z - pt0[1]) * dz) / lenSq));
    return Math.hypot(x - pt0[0] - dx * proj, z - pt0[1] - dz * proj);
  };
  for (const [along, across, scale] of [[-6.5, 14.5, 1.3], [-6.0, -14.0, 1.25]]) {
    const [x, z] = axisAt(along, across);
    if (nearbyRoadSegs.some(([pt0, pt1]) => distToSeg(x, z, pt0, pt1) < 4)) continue;
    data.trees.push(Math.round(x * 10), Math.round(z * 10), Math.round(scale * 10), 0);
  }
}

// a strip of light just under the soffit of a roof's eave, near its edge (sides: 'v-'/'v+' the long sides along
// the ridge, 'u-'/'u+' the ends), as citadel.js does for the other pavilions
function addEaveStrip(lightBuf, eave) {
  const cosAng = Math.cos(eave.ang);
  const sinAng = Math.sin(eave.ang);
  const y = eave.y - eave.fascia - 0.07;
  const eavePt = (localU, localV): [number, number, number] => [eave.q[0] + localU * cosAng - localV * sinAng, y, eave.q[1] + localU * sinAng + localV * cosAng];
  const halfU = eave.w / 2 + eave.over - 0.3;
  const halfV = eave.d / 2 + eave.over - 0.3;
  for (const sideCode of eave.sides) {
    const sign = sideCode[1] === '+' ? 1 : -1;
    if (sideCode[0] === 'v') lightBuf.beam(eavePt(-halfU, sign * halfV), eavePt(halfU, sign * halfV), 0.12, 0.09, [1, 1, 1]);
    else lightBuf.beam(eavePt(sign * halfU, -halfV), eavePt(sign * halfU, halfV), 0.12, 0.09, [1, 1, 1]);
  }
}

export function build({ data, S, group, place, THREE }) {
  const placePos = place ? [place.x, place.z] : PAVILION_CENTER;
  // keep the OSM outline's centre when the place record sits a little off it (its label point)
  const useFixedCenter = Math.hypot(placePos[0] - PAVILION_CENTER[0], placePos[1] - PAVILION_CENTER[1]) < 6;
  const centerX = useFixedCenter ? PAVILION_CENTER[0] : placePos[0];
  const centerZ = useFixedCenter ? PAVILION_CENTER[1] : placePos[1];
  const [fwdX, fwdZ] = RIVER_AXIS;
  const perpX = -fwdZ;
  const perpZ = fwdX; // fwd: along the axis toward the river; perp: across it
  const fwdAngle = Math.atan2(fwdZ, fwdX);
  const perpAngle = fwdAngle + Math.PI / 2;
  const axisAt = (along, across): [number, number] => [centerX + fwdX * along + perpX * across, centerZ + fwdZ * along + perpZ * across];
  const frame = { centerX, centerZ, fwdX, fwdZ, perpX, perpZ, fwdAngle, perpAngle, axisAt };

  const floorY = LAND_Y + TERRACE_HEIGHT;
  buildTerraceAndParapets(S, frame, floorY);
  buildPavilionFrameAndPorches(S, frame, floorY);
  const eaveLights = buildRoofsAndCrest(S, frame, floorY);
  const { stairRun, cheekOffB } = buildRiverStepsAndJetty(S, frame);
  registerCourtAndTrees(data, frame);

  // ---- night: light under every eave and lanterns at the four corners of the platform and the river steps ----
  const lightBuf = new Buf(400);
  const lanternCoords: number[] = [];
  const lanternColors: number[] = [];
  const addLantern = (pos, y) => {
    lanternCoords.push(pos[0], y, pos[1]);
    lanternColors.push(...COLORS.lanternRgb);
  };
  for (const eave of eaveLights) addEaveStrip(lightBuf, eave);
  // (low lamp posts: the floodlights that light the pavilion from its platform corners and the foot of the flight)
  S.kind = KIND.PLAIN;
  const addLampPost = (pos, baseY, height) => {
    S.box(pos[0], pos[1], baseY, baseY + height, 0.22, 0.22, fwdAngle, COLORS.lampPost);
    addLantern(pos, baseY + height + 0.12);
  };
  for (const signA of [-1, 1]) {
    for (const signB of [-1, 1]) addLampPost(axisAt(signA * (TERRACE_LEN / 2 - 0.85), signB * (TERRACE_WIDTH / 2 - 0.85)), floorY, 0.5);
  }
  for (const signB of [-1, 1]) addLampPost(axisAt(BANK_DIST + stairRun + 0.7, signB * (cheekOffB + 0.1)), WATER_LANDING_Y, 0.7);

  if (group && THREE) {
    const lightMesh = new THREE.Mesh(lightBuf.geometry(), lightMaterial(COLORS.lightTint, 1.2)); // the shared night glow drives it
    lightMesh.renderOrder = 19;
    lightMesh.userData.landmark = id;
    group.add(lightMesh);
    const glowMesh = glowPoints(lanternCoords, lanternColors, 6);
    glowMesh.userData.glow = true; // main.js sizes it and hides it by day
    glowMesh.userData.landmark = id;
    group.add(glowMesh);
  }
  return null;
}
