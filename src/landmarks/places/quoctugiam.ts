import { KIND, hex, shade } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { offStreets } from '../enclosure.ts';
import { flag } from '../anim.ts';

// ---- Quốc Tử Giám, the Nguyễn imperial academy, inside the Citadel (moved here in 1908) ----
//
// The block between Lê Trực (north-west), Đinh Tiên Hoàng (north-east), Đoàn Thị Điểm (south-west) and the lawns
// along đường 23 Tháng 8 (south-east, the address: 1 đường 23 Tháng 8). Sources (docs/places/quoctugiam.md):
//  - vi.wikipedia.org/wiki/Quốc_Tử_Giám_(Huế): moved into the Citadel 1908; wall from 1848 with two small side gates.
//  - kienthuc.net.vn (truong-quoc-tu-giam-cua-co-do-hue-gio-ra-sao-987623): Di Luân Đường has two storeys; the
//    lower a double house (3 gian 2 chái joined to a 1-gian house), the upper a square 1 gian 4 chái, in the
//    "đường + các" manner of Thái Bình Lâu; two-tier roof of yellow-glazed yin-yang tiles; each of the four faces
//    has three flights of five steps, the middle flight on the front and back wider, with dragon strings; a tam quan
//    at the foot of a wide court; two long side halls (Học tả, Học hữu) built after the move, colonial with
//    Vietnamese decoration.
//  - baovanhoa.vn (ha-giai-de-tu-bo-di-tich-truong-hoc-duoi-trieu-nguyen-222443, song-lai-khong-gian-khoa-cu-xua-
//    122172): Di Luân Đường > 574 m²; Học halls > 1,190 m² together, lime-washed with timber doors; Giám sinh halls
//    309.6 / 308.5 m², light-yellow lime; kitchen, Kiều gia houses, a guard house, the shelter over the Huỳnh Tự Thư
//    Thanh stele in front of Di Luân Đường; court > 4,153 m².
//  - OpenStreetMap: precinct (way 531031518), Di Luân Đường (239445966), the Học halls (617523830, 239448810), the
//    other halls (239448809/11/12, 239448806, 239448804/05/07/08). The city survey reads the hall at 9.5 m.
// Street View (car panos, 2024-25) settled the front gate: an open post-and-lintel gate of four cream square pillars,
// the inner pair taller, joined by thin beams, a flag on the west inner pillar, nothing solid between them (the stele
// shelter and the hall are seen through it from đường 23 Tháng 8). Estimated: the split between front and main
// house, eave and storey heights, the gate's exact spacing and heights, the side halls' roofs and verandahs, which outbuilding is which, the wall's height. The site is being restored (2025-2029, parts
// taken down in 2026); the model shows the buildings whole, as the restoration rebuilds them.

// Di Luân Đường's frame: centre, u across the front (north-east), v toward the front (south-east)
const HALL_CENTER = [-684.7, -193.2];
const HALL_AXIS_U = [0.8006, -0.5992];
const HALL_ANGLE = Math.atan2(HALL_AXIS_U[1], HALL_AXIS_U[0]);
const toWorld = (localU, localV): [number, number] => [
  HALL_CENTER[0] + localU * HALL_AXIS_U[0] - localV * HALL_AXIS_U[1],
  HALL_CENTER[1] + localU * HALL_AXIS_U[1] + localV * HALL_AXIS_U[0],
];
const groundY = (x, z) => LAND_Y + rise(x, z);

// OSM outlines in the hall frame [u0, u1, v0, v1] (all are rectangles square to the hall)
const HOC_HALLS = [[38.4, 53.9, -2.7, 39.3], [-50.4, -38.2, -1.0, 41.4]]; // Học tả (east), Học hữu (west)
const GIAM_SINH_HALLS = [[24.3, 52.7, -23.4, -11.7], [54.0, 84.7, -22.6, -11.4]];
const OTHER_HALLS = [
  [73.1, 84.7, -9.9, 38.0], // long hall along Đinh Tiên Hoàng
  [-72.0, -51.9, 2.2, 14.6], [-75.3, -51.8, -10.0, -2.5], [-83.0, -75.3, 0.9, 10.9], [-83.3, -74.4, 15.0, 40.4],
];
// the L-shaped hall behind the west Học hall (way 239448812), as two rectangles
const ELL_HALLS = [[-49.5, -24.2, -21.7, -9.9], [-48.0, -40.3, -10.0, -2.0]];
// not in OSM, placed from the satellite (sat-z19/z20): a red-tiled house on the Lê Trực side north of the Giám sinh
// hall and a pale-roofed hall north-west of Di Luân Đường, both against the Lê Trực balustrade. The pale hall's east
// end is set by the car pano on Lê Trực (sv-lt-nw: lawn up to u -15; the satellite's roof reads 5 m further east)
const UNMAPPED_HALLS = [[10.0, 23.5, -30.5, -20.5], [-26.0, -15.0, -31.5, -22.0]];
// and the row of low old houses, tile and sheet roofs, standing a metre behind the Đoàn Thị Điểm balustrade north of
// the corner hall (sv-dtd-n): [u0, u1, v0, v1, eave, roof colour]
const ROW_HOUSES = [
  [-84.2, -78.4, -33.0, -24.6, 2.0, hex('#5d5f5c')],
  [-84.2, -77.8, -24.4, -17.4, 2.3, hex('#523c32')],
  [-84.2, -78.6, -17.2, -10.6, 2.1, hex('#686a66')],
];
// the precinct (way 531031518), drawn 2.5 m inside the mapped line so the wall keeps off the pavements
const PRECINCT_RING = [[-631.4, -272.4], [-583.9, -205.7], [-661.1, -151.9], [-727.9, -103.9], [-776.5, -170.4]];
const GATE_V = 46.0;
const PRECINCT_INSET = 2.5;
const GATE_OUTER_OFFSET = 4.4;
const GATE_INNER_OFFSET = 1.6;

const COURTYARD_TREES: [number, number, number][] = [
  [-12, 26, 12], [12, 26, 12], [-13, 35, 13], [13, 35, 13],
  [-24, 18, 12], [24, 18, 12], [-24, 34, 11], [24, 34, 11],
  [-22, -16, 12], [22, -16, 12],
];

const COLORS = {
  tile: hex('#a85b3e'),
  ridge: hex('#dfd2b4'),
  lacquer: PAL.lacquer,
  gold: hex('#d9b04a'),
  stone: PAL.stone,
  brick: hex('#b26c52'),
  terra: hex('#6e4e40'),
  lime: hex('#f1ead8'),
  yellowLime: hex('#ecd38c'),
  wood: hex('#5e3b26'),
  gate: hex('#ebe3cc'), // the cream lime of the gate pillars
  unmappedRedRoof: hex('#7a4634'),
  unmappedPaleRoof: hex('#a7a59c'),
  flagPole: hex('#cfcfc8'),
  timber: hex('#4a2a20'),
  friezeCream: hex('#e8dcc0'),
  mosaicPanels: [hex('#3f7a6a'), hex('#c8a24a'), hex('#4f6fa0')],
};

// the boundary (Street View, 2024-25): a low cement balustrade, a row of oval piercings between a plinth and a coping,
// piers with caps every few metres, all grey and dark-stained; on Lê Trực a scrolled iron railing stands on it with an
// open round thọ (壽) roundel in each bay. Plain cement (KIND.PLAIN): the masonry shader's brick courses and green-
// yellow moss turned the grey tan under the scene's warm light.
const BALUSTRADE_SPEC = {
  height: 1.1,
  every: 3.4,
  pierWidth: 0.42,
  pierUp: 0.22,
  color: hex('#8f9aa0'),
  cap: hex('#78828a'),
  foot: hex('#687176'),
  hole: hex('#363c40'),
};
const IRON_RAIL_SPEC = { height: 1.05, color: hex('#23262a') };

export const id = 'quoctugiam';

function createFrameHelpers(S) {
  const box = (localU, localV, yMin, yMax, width, depth, color, opts?) => {
    const pos = toWorld(localU, localV);
    S.box(pos[0], pos[1], yMin, yMax, width, depth, HALL_ANGLE, color, opts);
  };
  // (the ridge runs along the longer side: a deep plan is handed over turned a quarter)
  const hip = (localU, localV, width, depth, yBase, riseH, color, opts?) => {
    const pos = toWorld(localU, localV);
    const turned = depth > width;
    S.hip(
      pos[0],
      pos[1],
      turned ? depth : width,
      turned ? width : depth,
      turned ? HALL_ANGLE + Math.PI / 2 : HALL_ANGLE,
      yBase,
      riseH,
      color,
      { flare: 0.5, fascia: 0.26, fasciaCol: shade(COLORS.lacquer, 0.7), hips: true, glazed: false, segs: 4, ...opts },
    );
  };
  const cyl = (localU, localV, yMin, yMax, radius0, radius1, sides, color, opts?) => {
    const pos = toWorld(localU, localV);
    S.cyl(pos[0], pos[1], yMin, yMax, radius0, radius1, sides, color, { rot: HALL_ANGLE, ...opts });
  };
  return { box, hip, cyl };
}

function buildCourtyard(data, S, helpers, baseY) {
  const { box } = helpers;
  // ---- court: wide Bát Tràng brick apron round the hall and broad red-brick approach to the gate (as in the photo) ----
  S.kind = KIND.MASONRY;
  const pavedStart = S.n;
  box(0, 0, baseY - 0.2, baseY + 0.22, 32, 36, shade(COLORS.brick, 0.94), { topKind: KIND.ROAD });
  box(0, (18.0 + GATE_V) / 2, baseY - 0.2, baseY + 0.25, 11.0, GATE_V - 18.0, COLORS.brick, { topKind: KIND.ROAD });
  (S.paved = S.paved || []).push([pavedStart, S.n]); // brick paving: no trees, no houses (src/geo/city.js coverOf)
  // shady courtyard trees flanking the broad brick walk, framing Di Luân Đường as in the reference photo
  if (Array.isArray(data.trees)) {
    for (const [treeU, treeV, scale] of COURTYARD_TREES) {
      const pos = toWorld(treeU, treeV);
      data.trees.push(Math.round(pos[0] * 10), Math.round(pos[1] * 10), scale, 4);
    }
  }
  box(-38.2 + 3.0, 20, baseY - 0.2, baseY + 0.08, 1.6, 40, shade(COLORS.brick, 0.95)); // walks along the side halls' fronts
  box(38.4 - 3.0, 20, baseY - 0.2, baseY + 0.08, 1.6, 40, shade(COLORS.brick, 0.95));
  box(0, 39.5, baseY - 0.2, baseY + 0.08, 72, 1.6, shade(COLORS.brick, 0.95));
}

function buildSteleShelter(S, helpers, baseY) {
  const { box, hip, cyl } = helpers;
  // ---- the Huỳnh Tự Thư Thanh stele (Thiệu Trị's poem) under its small shelter, in front of the hall ----
  const shelterV = 21.5;
  S.kind = KIND.MASONRY;
  box(0, shelterV, baseY, baseY + 0.35, 4.0, 4.0, COLORS.stone, { topKind: KIND.ROAD });
  box(0, shelterV, baseY + 0.35, baseY + 0.75, 1.5, 0.9, shade(COLORS.stone, 0.9));
  box(0, shelterV, baseY + 0.75, baseY + 2.45, 1.1, 0.26, shade(COLORS.stone, 0.78), { top: shade(COLORS.stone, 0.7) });
  S.kind = KIND.PLAIN;
  box(0, shelterV, baseY + 2.45, baseY + 2.7, 1.25, 0.34, shade(COLORS.stone, 0.75), { taper: 0.7 });
  for (const colU of [-1.6, 1.6]) {
    for (const colV of [-1.6, 1.6]) {
      cyl(colU, shelterV + colV, baseY + 0.35, baseY + 3.0, 0.14, 0.13, 6, COLORS.lacquer, { cap: false });
    }
  }
  S.kind = KIND.TIMBER;
  box(0, shelterV, baseY + 2.9, baseY + 3.15, 3.6, 3.6, shade(COLORS.lacquer, 0.75));
  hip(0, shelterV, 3.4, 3.4, baseY + 3.15, 1.5, COLORS.tile, { over: 0.7, ridgeCol: COLORS.ridge, segs: 3 });
}

// a straight gable roof along the longer side, verges 0.4 m past the end walls, the gable triangles in the wall colour
function buildGableRoof(S, centerU, centerV, width, depth, yBase, riseH, roofColor, wallColor) {
  const turned = depth > width;
  const halfLen = (turned ? depth : width) / 2;
  const halfBreadth = (turned ? width : depth) / 2;
  const overhang = 0.4;
  // (along, across): along the ridge, across it, in the hall frame
  const toPoint = (along, across, y) => {
    const [localU, localV] = turned ? [centerU + across, centerV + along] : [centerU + along, centerV + across];
    const pos = toWorld(localU, localV);
    return [pos[0], y, pos[1]];
  };
  const ridgeAxis = turned ? [-HALL_AXIS_U[1], HALL_AXIS_U[0]] : HALL_AXIS_U;
  const slopeAxis = turned ? HALL_AXIS_U : [-HALL_AXIS_U[1], HALL_AXIS_U[0]];
  for (const side of [-1, 1]) {
    S.kind = KIND.TILE;
    S.quad(
      toPoint(-halfLen - overhang, side * (halfBreadth + overhang), yBase - 0.15),
      toPoint(halfLen + overhang, side * (halfBreadth + overhang), yBase - 0.15),
      toPoint(halfLen + overhang, 0, yBase + riseH),
      toPoint(-halfLen - overhang, 0, yBase + riseH),
      roofColor,
      [slopeAxis[0] * side, 1, slopeAxis[1] * side],
    );
    S.kind = KIND.PLAIN;
    S.quad(
      toPoint(-halfLen - overhang, side * (halfBreadth + overhang), yBase - 0.15),
      toPoint(halfLen + overhang, side * (halfBreadth + overhang), yBase - 0.15),
      toPoint(halfLen + overhang, side * (halfBreadth + overhang), yBase - 0.35),
      toPoint(-halfLen - overhang, side * (halfBreadth + overhang), yBase - 0.35),
      shade(roofColor, 0.6),
      [slopeAxis[0] * side, 0, slopeAxis[1] * side],
    );
    S.quad(
      toPoint(-halfLen - overhang, side * (halfBreadth + overhang), yBase - 0.35),
      toPoint(halfLen + overhang, side * (halfBreadth + overhang), yBase - 0.35),
      toPoint(halfLen + overhang, 0, yBase - 0.35),
      toPoint(-halfLen - overhang, 0, yBase - 0.35),
      shade(roofColor, 0.45),
      [0, -1, 0],
    );
    // the gable end wall up to the roof
    S.kind = KIND.CIVIC;
    S.tri(
      toPoint(side * (halfLen - 0.8), -(halfBreadth - 0.8), yBase),
      toPoint(side * (halfLen - 0.8), halfBreadth - 0.8, yBase),
      toPoint(side * (halfLen - 0.8), 0, yBase + riseH - 0.05),
      wallColor,
      [ridgeAxis[0] * side, 0, ridgeAxis[1] * side],
    );
  }
  S.kind = KIND.PLAIN;
  S.beam(
    toPoint(-halfLen - overhang, 0, yBase + riseH + 0.08),
    toPoint(halfLen + overhang, 0, yBase + riseH + 0.08),
    0.3,
    0.22,
    shade(roofColor, 1.1),
  );
}

// ---- side halls: lime walls, timber doors along the court side, a tiled hip roof ----
function buildSideHall(S, helpers, bounds, wallColor, roofColor, wallHeight, roofHeight, hasVerandah, isGabled = false) {
  const { box, hip, cyl } = helpers;
  const [u0, u1, v0, v1] = bounds;
  const centerU = (u0 + u1) / 2;
  const centerV = (v0 + v1) / 2;
  const width = u1 - u0;
  const depth = v1 - v0;
  const hallGroundY = groundY(...toWorld(centerU, centerV));
  S.base = hallGroundY - LAND_Y;
  const plinthY = hallGroundY + 0.45;
  const insetMargin = 0.9;
  const prevKind = S.kind;
  S.kind = KIND.MASONRY;
  box(centerU, centerV, hallGroundY - 0.3, plinthY, width - 0.3, depth - 0.3, shade(COLORS.stone, 0.95), { topKind: KIND.ROAD });
  S.kind = prevKind;
  const bodyW = width - 2 * insetMargin;
  const bodyD = depth - 2 * insetMargin;
  box(centerU, centerV, plinthY, plinthY + wallHeight, bodyW, bodyD, wallColor, { top: shade(roofColor, 0.8) });
  // openings: doors on the long sides, every ~3.6 m
  S.kind = KIND.PLAIN;
  const isLongU = bodyW >= bodyD;
  const longSpan = isLongU ? bodyW : bodyD;
  const doorCount = Math.max(2, Math.round(longSpan / 3.6));
  for (let k = 0; k < doorCount; k++) {
    const offset = -longSpan / 2 + (k + 0.5) * (longSpan / doorCount);
    for (const side of [-1, 1]) {
      if (isLongU) box(centerU + offset, centerV + side * (bodyD / 2 + 0.02), plinthY, plinthY + wallHeight * 0.62, 1.3, 0.06, COLORS.wood);
      else box(centerU + side * (bodyW / 2 + 0.02), centerV + offset, plinthY, plinthY + wallHeight * 0.62, 0.06, 1.3, COLORS.wood);
    }
  }
  // a band of moulding under the eave (the "Vietnamese decoration" on the colonial halls)
  box(centerU, centerV, plinthY + wallHeight - 0.45, plinthY + wallHeight - 0.2, bodyW + 0.08, bodyD + 0.08, shade(wallColor, 0.85));
  if (hasVerandah) {
    // the Học halls: a deep eave on columns along their court side
    const verandahU = u0 > 0 ? u0 + 0.4 : u1 - 0.4;
    for (let k = 0; k <= doorCount; k++) {
      cyl(verandahU, centerV - bodyD / 2 + (k * bodyD) / doorCount, plinthY, plinthY + wallHeight, 0.16, 0.16, 6, COLORS.lime, { cap: false });
    }
  }
  S.kind = KIND.TILE;
  if (isGabled) {
    buildGableRoof(S, centerU, centerV, width - 0.2, depth - 0.2, plinthY + wallHeight, roofHeight, roofColor, wallColor);
  } else {
    // straight colonial hips of dark weathered tile: no flare, no hip ridges, so no upturned corners
    hip(centerU, centerV, width - 0.2, depth - 0.2, plinthY + wallHeight, roofHeight, roofColor, {
      flare: 0, over: 0.35, fascia: 0.22, fasciaCol: shade(wallColor, 0.8), ridgeCol: shade(roofColor, 1.12), hips: false, glazed: false, segs: 1,
    });
  }
  S.kind = prevKind;
}

function buildSideHalls(S, helpers) {
  S.kind = KIND.CIVIC;
  for (const rect of HOC_HALLS) buildSideHall(S, helpers, rect, COLORS.lime, COLORS.terra, 4.3, 2.6, true);
  for (const rect of GIAM_SINH_HALLS) buildSideHall(S, helpers, rect, COLORS.yellowLime, COLORS.terra, 3.8, 2.3, false);
  // the halls along Đoàn Thị Điểm end in gables (sv-dtd-sw); the rest have plain hips
  for (const rect of OTHER_HALLS) buildSideHall(S, helpers, rect, COLORS.yellowLime, COLORS.terra, 3.4, 2.0, false, rect[1] < -74);
  for (const rect of ELL_HALLS) buildSideHall(S, helpers, rect, COLORS.yellowLime, COLORS.terra, 3.4, 2.0, false);
  buildSideHall(S, helpers, UNMAPPED_HALLS[0], COLORS.yellowLime, COLORS.unmappedRedRoof, 3.3, 2.0, false, true);
  buildSideHall(S, helpers, UNMAPPED_HALLS[1], COLORS.lime, COLORS.unmappedPaleRoof, 3.6, 1.9, false);
  for (const [u0, u1, v0, v1, eaveH, roofCol] of ROW_HOUSES) {
    buildSideHall(S, helpers, [u0, u1, v0, v1], shade(COLORS.yellowLime, 0.8), roofCol, eaveH, 1.0, false, true);
  }
}

function buildFrontGate(S, group, helpers) {
  const { box } = helpers;
  // ---- the gate at the foot of the court: four cream pillars and thin lintels, open between them ----
  // (sv-hmb-s, from đường 23 Tháng 8 on the axis: the inner pair about 3.6 m, the outer pair lower, an open drive
  // between the inner pillars, a low see-through iron railing in the side bays, a flag on the west inner pillar)
  const gateGroundY = groundY(...toWorld(0, GATE_V));
  S.base = gateGroundY - LAND_Y;
  const innerH = 3.6;
  const outerH = 2.7;
  const innerW = 0.46;
  const outerW = 0.4;
  S.kind = KIND.MASONRY;
  box(0, GATE_V, gateGroundY - 0.2, gateGroundY + 0.12, 2 * GATE_OUTER_OFFSET + 0.8, 1.2, COLORS.stone, { topKind: KIND.ROAD }); // the threshold
  const thresholdY = gateGroundY + 0.12;
  S.kind = KIND.PLAIN;
  for (const side of [-1, 1]) {
    for (const [offset, pillarH, pillarW] of [[GATE_INNER_OFFSET, innerH, innerW], [GATE_OUTER_OFFSET, outerH, outerW]]) {
      box(side * offset, GATE_V, thresholdY, thresholdY + 0.35, pillarW + 0.14, pillarW + 0.14, shade(COLORS.gate, 0.82)); // base
      box(side * offset, GATE_V, thresholdY + 0.35, thresholdY + pillarH, pillarW, pillarW, COLORS.gate);
      box(side * offset, GATE_V, thresholdY + pillarH, thresholdY + pillarH + 0.12, pillarW + 0.16, pillarW + 0.16, shade(COLORS.gate, 0.88)); // cap
      box(side * offset, GATE_V, thresholdY + pillarH + 0.12, thresholdY + pillarH + 0.42, pillarW * 0.55, pillarW * 0.55, shade(COLORS.gate, 0.9), { taper: 0.4 }); // finial
    }
    // the side bays: a thin beam near the outer pillar's top, a low open iron railing below it
    const midU = side * (GATE_INNER_OFFSET + GATE_OUTER_OFFSET) / 2;
    const bayW = GATE_OUTER_OFFSET - GATE_INNER_OFFSET - (innerW + outerW) / 2;
    box(midU, GATE_V, thresholdY + outerH - 0.32, thresholdY + outerH - 0.12, bayW, 0.18, shade(COLORS.gate, 0.9));
    box(midU, GATE_V, thresholdY + 1.05, thresholdY + 1.1, bayW, 0.05, IRON_RAIL_SPEC.color);
    box(midU, GATE_V, thresholdY + 0.12, thresholdY + 0.17, bayW, 0.05, IRON_RAIL_SPEC.color);
    for (let j = 1; j < 12; j++) {
      box(midU - bayW / 2 + (j * bayW) / 12, GATE_V, thresholdY, thresholdY + 1.1, 0.035, 0.035, IRON_RAIL_SPEC.color);
    }
  }
  // the lintels over the drive: two thin beams between the inner pillars
  for (const lintelY of [innerH - 0.3, innerH - 0.85]) {
    box(0, GATE_V, thresholdY + lintelY - 0.2, thresholdY + lintelY, 2 * GATE_INNER_OFFSET - innerW, 0.2, shade(COLORS.gate, 0.92));
  }
  // the flag on its pole over the west inner pillar
  const polePos = toWorld(-GATE_INNER_OFFSET, GATE_V);
  S.cyl(polePos[0], polePos[1], thresholdY + innerH + 0.42, thresholdY + innerH + 2.6, 0.035, 0.03, 5, COLORS.flagPole, { cap: false });
  flag(group, { at: [polePos[0], thresholdY + innerH + 2.5, polePos[1]], w: 0.9, h: 0.6, look: 'vn', landmark: id }); // waves down-wind (anim.js)
}

function buildDiLuanBase(S, box, baseY, planW, planD, plinthH, plinthY) {
  S.kind = KIND.MASONRY;
  box(0, 0, baseY - 0.3, plinthY, planW - 0.8, planD - 0.8, COLORS.stone, { taper: 0.99, topKind: KIND.ROAD });
  // three flights of five steps on each face; the middle ones front and back wider, with dragon strings
  const buildFlight = (localU, localV, width, dirU, dirV, hasDragons) => {
    for (let k = 1; k <= 5; k++) {
      const stepOffset = 0.3 * (k - 0.5);
      const stepTopY = plinthY - (plinthH / 5) * k;
      if (dirV) box(localU, localV + dirV * stepOffset, baseY - 0.2, stepTopY, width, 0.3, shade(COLORS.stone, 1.05), { topKind: KIND.ROAD });
      else box(localU + dirU * stepOffset, localV, baseY - 0.2, stepTopY, 0.3, width, shade(COLORS.stone, 1.05), { topKind: KIND.ROAD });
    }
    if (hasDragons) {
      for (const side of [-1, 1]) {
        const startPt = dirV ? [localU + side * (width / 2 + 0.2), localV] : [localU, localV + side * (width / 2 + 0.2)];
        const endPt = dirV ? [startPt[0], localV + dirV * 1.6] : [localU + dirU * 1.6, startPt[1]];
        const startWorld = toWorld(startPt[0], startPt[1]);
        const endWorld = toWorld(endPt[0], endPt[1]);
        S.kind = KIND.MASONRY;
        S.beam([startWorld[0], plinthY + 0.25, startWorld[1]], [endWorld[0], baseY + 0.3, endWorld[1]], 0.36, 0.5, shade(COLORS.stone, 0.92));
      }
    }
  };
  for (const side of [-1, 1]) {
    const edgeV = side * (planD - 0.8) / 2;
    buildFlight(0, edgeV, 4.2, 0, side, true);
    buildFlight(-6.4, edgeV, 2.4, 0, side, false);
    buildFlight(6.4, edgeV, 2.4, 0, side, false);
    const edgeU = side * (planW - 0.8) / 2;
    buildFlight(edgeU, 0, 2.4, side, 0, false);
    buildFlight(edgeU, -7.5, 2.0, side, 0, false);
    buildFlight(edgeU, 7.5, 2.0, side, 0, false);
  }
}

function buildDiLuanLowerStorey(S, helpers, plinthY, eaveY) {
  const { box, hip, cyl } = helpers;
  // lower storey: the rear main house (3 gian 2 chái) and the 1-gian front house, under one deep plan. The main
  // house's walls stand well inside its roof: an open verandah of dark timber columns runs round its back and sides
  // (sv-lt-nw, from Lê Trực), 2.3-2.6 m deep under the skirt roof's soffit.
  const wallColor = shade(COLORS.lacquer, 0.48);
  S.kind = KIND.TIMBER;
  box(0, -2.4, plinthY, eaveY, 12.0, 11.6, wallColor, { top: shade(COLORS.tile, 0.8) }); // u ±6.0, v -8.2 .. 3.4
  box(0, 7.2, plinthY, eaveY - 0.3, 14.0, 7.6, wallColor, { top: shade(COLORS.tile, 0.8) }); // the front house, v 3.4 .. 11.0
  // the verandah columns: a row along the back and one down each side, under the skirt roof's eave
  for (let i = 0; i <= 5; i++) cyl(-8.6 + i * 3.44, -11.4, plinthY, eaveY, 0.18, 0.16, 7, COLORS.timber, { cap: false });
  for (const side of [-1, 1]) {
    for (let j = 1; j <= 5; j++) cyl(side * 8.6, -11.4 + j * 3.2, plinthY, eaveY, 0.18, 0.16, 7, COLORS.timber, { cap: false });
  }
  // a tie beam over each row of columns
  box(0, -11.4, eaveY - 0.4, eaveY - 0.1, 17.6, 0.24, COLORS.timber);
  for (const side of [-1, 1]) box(side * 8.6, -3.4, eaveY - 0.4, eaveY - 0.1, 0.24, 16.0, COLORS.timber);
  // doors: five bays on the front house's face, gilt transoms
  S.kind = KIND.PLAIN;
  for (let i = -2; i <= 2; i++) {
    box(i * 2.7, 11.03, plinthY, plinthY + 2.3, 2.2, 0.08, shade(COLORS.lacquer, 0.4));
    box(i * 2.7, 11.04, plinthY + 2.35, plinthY + 2.75, 2.3, 0.08, COLORS.gold);
  }
  for (let i = -1; i <= 1; i++) box(i * 3.4, -8.23, plinthY, plinthY + 2.3, 2.6, 0.08, shade(COLORS.lacquer, 0.4));
  for (const side of [-1, 1]) {
    for (let j = -1; j <= 1; j++) box(side * 6.03, -2.4 + j * 3.4, plinthY, plinthY + 2.3, 0.08, 2.6, shade(COLORS.lacquer, 0.4));
  }
  // lower roofs: the skirt over the main house (plain tiles on the east and west faces in the record; drawn in the
  // same yellow, a shade darker) and the front house's own roof
  S.kind = KIND.PLAIN;
  hip(0, -2.8, 16.6, 15.6, eaveY, 1.6, shade(COLORS.tile, 0.92), { over: 1.6, flare: 0.4 });
  hip(0, 8.2, 14.0, 6.4, eaveY - 0.3, 1.5, COLORS.tile, { over: 1.4, ridgeCol: COLORS.ridge });
  S.kind = KIND.PLAIN;
  box(0, 11.9, eaveY - 0.55, eaveY - 0.3, 14.0, 1.6, shade(COLORS.lacquer, 0.45), { bottom: true });
}

function buildDiLuanUpperStorey(S, helpers, baseY, eaveY) {
  const { box, hip, cyl } = helpers;
  // the cổ diêm: a frieze between the roofs with panels of glazed shard mosaic, then the upper storey
  const upperBaseY = eaveY + 1.2;
  const upperEaveY = upperBaseY + 1.9;
  S.kind = KIND.TIMBER;
  box(0, -2.8, eaveY + 0.6, upperBaseY, 11.6, 11.6, COLORS.friezeCream);
  S.kind = KIND.PLAIN;
  for (let i = -2; i <= 2; i++) {
    const panelColor = COLORS.mosaicPanels[(i + 3) % 3];
    box(i * 2.2, -2.8 + 5.83, eaveY + 0.75, upperBaseY - 0.12, 1.4, 0.06, panelColor);
    box(i * 2.2, -2.8 - 5.83, eaveY + 0.75, upperBaseY - 0.12, 1.4, 0.06, panelColor);
    box(5.83, -2.8 + i * 2.2, eaveY + 0.75, upperBaseY - 0.12, 0.06, 1.4, panelColor);
    box(-5.83, -2.8 + i * 2.2, eaveY + 0.75, upperBaseY - 0.12, 0.06, 1.4, panelColor);
  }
  // upper storey: square, one bay and four chái, windows on every face
  S.kind = KIND.TIMBER;
  box(0, -2.8, upperBaseY, upperEaveY, 10.4, 10.4, shade(COLORS.lacquer, 0.52), { top: shade(COLORS.tile, 0.8) });
  S.kind = KIND.PLAIN;
  for (let i = -1; i <= 1; i++) {
    box(i * 3.0, -2.8 + 5.22, upperBaseY + 0.3, upperEaveY - 0.35, 2.2, 0.06, shade(COLORS.lacquer, 0.58));
    box(i * 3.0, -2.8 - 5.22, upperBaseY + 0.3, upperEaveY - 0.35, 2.2, 0.06, shade(COLORS.lacquer, 0.58));
    box(5.22, -2.8 + i * 3.0, upperBaseY + 0.3, upperEaveY - 0.35, 0.06, 2.2, shade(COLORS.lacquer, 0.58));
    box(-5.22, -2.8 + i * 3.0, upperBaseY + 0.3, upperEaveY - 0.35, 0.06, 2.2, shade(COLORS.lacquer, 0.58));
  }
  box(0, -2.8 + 5.25, upperEaveY - 0.3, upperEaveY + 0.2, 1.8, 0.1, COLORS.gold); // the name board 彝倫堂
  // upper roof: hip in yellow-glazed yin-yang tiles, ridge 9.5 m over the court (city survey)
  const ridgeTopY = baseY + 9.5 - 0.5;
  hip(0, -2.8, 10.4, 10.4, upperEaveY, ridgeTopY - upperEaveY, COLORS.tile, { over: 1.5, ridgeCol: COLORS.ridge });
  // ridge ornament: a gourd on the peak
  cyl(0, -2.8, ridgeTopY - 0.1, ridgeTopY + 0.5, 0.3, 0.12, 8, COLORS.ridge);
}

// ---- Di Luân Đường: two storeys, a double house below and a square pavilion above, yellow-glazed roofs ----
function buildDiLuanDuong(S, helpers, baseY) {
  // OSM plan 20.4 m (front) x 26.9 m (deep); five steps up to the floor
  const planW = 20.4;
  const planD = 26.9;
  const plinthH = 0.8;
  const plinthY = baseY + plinthH;
  const lowerEaveY = plinthY + 3.4;
  buildDiLuanBase(S, helpers.box, baseY, planW, planD, plinthH, plinthY);
  buildDiLuanLowerStorey(S, helpers, plinthY, lowerEaveY);
  buildDiLuanUpperStorey(S, helpers, baseY, lowerEaveY);
}

// The precinct balustrade round a closed ring, with a gap of width gateWidth at gatePoint. The Lê Trực (north-west)
// side carries the iron railing seen from the street; the Đoàn Thị Điểm side is bare balustrade; the south-east and
// north-east sides are hidden behind trees in every view and drawn bare like the south-west.
function buildBalustrade(S, ring, gatePoint, gateWidth) {
  const keepKind = S.kind;
  const keepBase = S.base;
  const ringCount = ring.length;
  for (let i = 0; i < ringCount; i++) {
    const startPt = ring[i];
    const endPt = ring[(i + 1) % ringCount];
    const edgeX = endPt[0] - startPt[0];
    const edgeZ = endPt[1] - startPt[1];
    const edgeLen = Math.hypot(edgeX, edgeZ);
    if (edgeLen < 0.6) continue;
    const edgeAngle = Math.atan2(edgeZ, edgeX);
    const pointAt = (frac) => [startPt[0] + edgeX * frac, startPt[1] + edgeZ * frac];
    // which side: the mid point in the hall frame (v < 0 behind the hall; a run along u is the north-west side)
    const midPt = pointAt(0.5);
    const midU = (midPt[0] - HALL_CENTER[0]) * HALL_AXIS_U[0] + (midPt[1] - HALL_CENTER[1]) * HALL_AXIS_U[1];
    const midV = -(midPt[0] - HALL_CENTER[0]) * HALL_AXIS_U[1] + (midPt[1] - HALL_CENTER[1]) * HALL_AXIS_U[0];
    const alongU = Math.abs(edgeX * HALL_AXIS_U[0] + edgeZ * HALL_AXIS_U[1]) > Math.abs(-edgeX * HALL_AXIS_U[1] + edgeZ * HALL_AXIS_U[0]);
    const hasIronRail = alongU && midV < 0 && Math.abs(midU) < 120;
    // the gate gap
    const projT = ((gatePoint[0] - startPt[0]) * edgeX + (gatePoint[1] - startPt[1]) * edgeZ) / (edgeLen * edgeLen);
    const perpDist = Math.abs((gatePoint[0] - startPt[0]) * edgeZ - (gatePoint[1] - startPt[1]) * edgeX) / edgeLen;
    const runs = perpDist < 3 && projT > -0.1 && projT < 1.1
      ? [[0, projT - gateWidth / 2 / edgeLen], [projT + gateWidth / 2 / edgeLen, 1]]
      : [[0, 1]];
    for (const [runStart, runEnd] of runs) {
      const runLen = (runEnd - runStart) * edgeLen;
      if (runLen < 0.6) continue;
      const bayCount = Math.max(1, Math.round(runLen / BALUSTRADE_SPEC.every));
      const bayLen = runLen / bayCount;
      for (let k = 0; k < bayCount; k++) {
        const bayStart = pointAt(runStart + ((runEnd - runStart) * k) / bayCount);
        const bayEnd = pointAt(runStart + ((runEnd - runStart) * (k + 1)) / bayCount);
        const midX = (bayStart[0] + bayEnd[0]) / 2;
        const midZ = (bayStart[1] + bayEnd[1]) / 2;
        const bayY = Math.min(groundY(bayStart[0], bayStart[1]), groundY(bayEnd[0], bayEnd[1]));
        const innerW = bayLen - BALUSTRADE_SPEC.pierWidth;
        S.base = bayY - LAND_Y;
        S.kind = KIND.PLAIN;
        S.box(midX, midZ, bayY - 0.3, bayY + 0.32, innerW + 0.02, 0.3, edgeAngle, BALUSTRADE_SPEC.foot, { top: BALUSTRADE_SPEC.cap }); // plinth, the darkest stain
        S.box(midX, midZ, bayY + 0.32, bayY + BALUSTRADE_SPEC.height - 0.14, innerW, 0.12, edgeAngle, BALUSTRADE_SPEC.hole); // the pierced band, read as its shadow
        // the solid bits between piercings: three posts in each bay
        for (const frac of [-0.42, -0.28, -0.14, 0, 0.14, 0.28, 0.42]) {
          const balX = midX + Math.cos(edgeAngle) * frac * innerW;
          const balZ = midZ + Math.sin(edgeAngle) * frac * innerW;
          S.box(balX, balZ, bayY + 0.32, bayY + BALUSTRADE_SPEC.height - 0.14, 0.08, 0.2, edgeAngle, BALUSTRADE_SPEC.color);
          S.box(balX, balZ, bayY + 0.5, bayY + BALUSTRADE_SPEC.height - 0.32, 0.15, 0.2, edgeAngle, BALUSTRADE_SPEC.color); // the swell of a bottle baluster: oval piercings between
        }
        S.box(midX, midZ, bayY + BALUSTRADE_SPEC.height - 0.14, bayY + BALUSTRADE_SPEC.height, innerW + 0.02, 0.32, edgeAngle, BALUSTRADE_SPEC.cap); // coping
        if (hasIronRail) {
          buildIronRailingBay(S, midX, midZ, bayY, innerW, edgeAngle);
        }
        // a pier at the start of each bay and at the end of the run
        for (const pierPt of k === bayCount - 1 ? [bayStart, bayEnd] : [bayStart]) {
          const pierY = groundY(pierPt[0], pierPt[1]);
          const pierTopY = pierY + (hasIronRail ? BALUSTRADE_SPEC.height + IRON_RAIL_SPEC.height + 0.1 : BALUSTRADE_SPEC.height + BALUSTRADE_SPEC.pierUp);
          S.base = pierY - LAND_Y;
          S.kind = KIND.PLAIN;
          S.box(pierPt[0], pierPt[1], pierY - 0.3, pierTopY, BALUSTRADE_SPEC.pierWidth, BALUSTRADE_SPEC.pierWidth, edgeAngle, BALUSTRADE_SPEC.color, { top: BALUSTRADE_SPEC.cap });
          S.box(pierPt[0], pierPt[1], pierTopY, pierTopY + 0.12, BALUSTRADE_SPEC.pierWidth + 0.1, BALUSTRADE_SPEC.pierWidth + 0.1, edgeAngle, BALUSTRADE_SPEC.cap);
          S.box(pierPt[0], pierPt[1], pierTopY + 0.12, pierTopY + 0.32, BALUSTRADE_SPEC.pierWidth * 0.6, BALUSTRADE_SPEC.pierWidth * 0.6, edgeAngle, BALUSTRADE_SPEC.cap, { taper: 0.4 });
        }
      }
    }
  }
  S.kind = keepKind;
  S.base = keepBase;
}

function buildIronRailingBay(S, midX, midZ, bayY, innerW, edgeAngle) {
  // see-through: a bottom and a top rail, upright bars every ~0.3 m, one open round thọ roundel mid-bay
  S.kind = KIND.PLAIN;
  const cosAng = Math.cos(edgeAngle);
  const sinAng = Math.sin(edgeAngle);
  const railBaseY = bayY + BALUSTRADE_SPEC.height;
  const railTopY = railBaseY + IRON_RAIL_SPEC.height;
  S.box(midX, midZ, railBaseY + 0.08, railBaseY + 0.14, innerW, 0.05, edgeAngle, IRON_RAIL_SPEC.color);
  S.box(midX, midZ, railTopY - 0.07, railTopY, innerW, 0.07, edgeAngle, shade(IRON_RAIL_SPEC.color, 1.3));
  const barCount = Math.max(2, Math.round(innerW / 0.3));
  for (let j = 1; j < barCount; j++) {
    const barOffset = -innerW / 2 + (j * innerW) / barCount;
    if (Math.abs(barOffset) < 0.3) continue; // the roundel's place
    S.box(midX + cosAng * barOffset, midZ + sinAng * barOffset, railBaseY, railTopY - 0.04, 0.035, 0.035, edgeAngle, IRON_RAIL_SPEC.color);
  }
  // the roundel: an iron ring 0.5 m across, the stylised 壽 inside it as three bars and a stem, open between
  const radius = 0.25;
  const centerY = railBaseY + 0.52;
  const ringPoint = (theta) => [midX + cosAng * radius * Math.cos(theta), centerY + radius * Math.sin(theta), midZ + sinAng * radius * Math.cos(theta)];
  for (let j = 0; j < 12; j++) S.beam(ringPoint((j * Math.PI) / 6), ringPoint(((j + 1) * Math.PI) / 6), 0.035, 0.04, IRON_RAIL_SPEC.color);
  for (const [offsetY, halfW] of [[0.12, 0.17], [0, 0.24], [-0.12, 0.17]]) {
    S.box(midX, midZ, centerY + offsetY - 0.017, centerY + offsetY + 0.017, 2 * halfW, 0.035, edgeAngle, IRON_RAIL_SPEC.color);
  }
  S.box(midX, midZ, centerY - radius, centerY + radius, 0.035, 0.035, edgeAngle, IRON_RAIL_SPEC.color);
}

// shrink a convex ring by distance metres (edges moved in, corners re-intersected)
function insetConvexRing(ring, distance) {
  const count = ring.length;
  const signedArea = ring.reduce((acc, pt, i) => {
    const nextPt = ring[(i + 1) % count];
    return acc + pt[0] * nextPt[1] - nextPt[0] * pt[1];
  }, 0);
  const windingSign = signedArea > 0 ? 1 : -1;
  const offsetLines = ring.map((pt, i) => {
    const nextPt = ring[(i + 1) % count];
    const edgeX = nextPt[0] - pt[0];
    const edgeZ = nextPt[1] - pt[1];
    const edgeLen = Math.hypot(edgeX, edgeZ);
    const normX = (-edgeZ / edgeLen) * windingSign;
    const normZ = (edgeX / edgeLen) * windingSign; // inward normal
    return [[pt[0] + normX * distance, pt[1] + normZ * distance], [edgeX, edgeZ]];
  });
  return offsetLines.map((currLine, i) => {
    const prevLine = offsetLines[(i + count - 1) % count];
    const [[px, pz], [dx, dz]] = prevLine;
    const [[qx, qz], [ex, ez]] = currLine;
    const denom = dx * ez - dz * ex;
    if (Math.abs(denom) < 1e-9) return [qx, qz];
    const paramT = ((qx - px) * ez - (qz - pz) * ex) / denom;
    return [px + dx * paramT, pz + dz * paramT];
  });
}

export function build({ data, S, group }) {
  const baseY = groundY(HALL_CENTER[0], HALL_CENTER[1]);
  const helpers = createFrameHelpers(S);
  S.base = baseY - LAND_Y;

  buildCourtyard(data, S, helpers, baseY);
  buildDiLuanDuong(S, helpers, baseY);
  buildSteleShelter(S, helpers, baseY);
  buildSideHalls(S, helpers);
  buildFrontGate(S, group, helpers);

  // ---- the precinct boundary, open at the gate ----
  S.base = 0;
  const boundaryRing = offStreets(data, insetConvexRing(PRECINCT_RING, PRECINCT_INSET)); // and off the street OSM draws along its east side
  buildBalustrade(S, boundaryRing, toWorld(0, GATE_V), 2 * GATE_OUTER_OFFSET + 0.4); // the gap butts on the gate's outer pillars
  S.kind = KIND.PLAIN;
  S.base = 0;
}
