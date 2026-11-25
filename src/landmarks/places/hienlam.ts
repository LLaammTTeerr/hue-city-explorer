import { KIND, hex, shade } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { glowPoints } from '../../geo/materials.ts';
import { fence, roadsNear, FENCE } from '../enclosure.ts';
import { dinh } from '../props.ts';

// Hiển Lâm Các, the three-storey timber pavilion on the axis of Thế Miếu in the south-west of the Imperial City
// (1821-22, Minh Mạng; restored 2001), the cross wall it stands in with the gate towers Tuấn Liệt môn and Sùng Công
// môn (bell and drum lofts over the gates), and before it, in Thế Miếu's court, the nine dynastic urns (Cửu Đỉnh,
// cast 1835-37). Sources and estimates: docs/places/hienlam.md.
//
// Hiển Lâm Các: about 300 m² on a brick-and-lime base paved with Bát Tràng brick, two flights of 9 Thanh-stone steps
// (front and back) with dragon cheeks and the king's way between; 24 columns, the 4 middle ones running the full
// height; storeys of 5, 3 and 1 bays under 12 roof slopes of yellow glazed tile; a gourd finial; 17 m high.
// The urns stand in one row facing Thế Miếu, Cao đỉnh (2.50 m) in the middle on the axis and set forward, the others
// (2.25-2.35 m, mouths about 1.37 m) four either side, each on stone; three legs and two upright loop handles.
//
// Frame: the mapped outline (OSM way 172657564, 23.6 x 13.6 m) centred at ORIGIN; u along the facade toward Tuấn Liệt
// môn (north-east), v out of the back toward Miếu Môn (south-east), so Thế Miếu lies at -v. The cross wall (OSM
// 695810847-850) runs along the front face, v = -6.8.
// The OSM group (outline, steps, apron, walls, gates) sits about 1 m east of where Google's satellite shows the
// steps and urns, so the frame is re-centred 1.0 m west and 0.4 m north of the outline's centre (-1259.15, 238.65);
// the axis already matches. Google Street View (a photosphere in Thế Miếu's court, looking south-west along the
// urns) shows the ground storey's yellow end walls, a fretwork railing round the verandah, dark worn lacquer, and
// the gate towers as plastered gates of three doors under one roof with a plastered loft over the middle.
export const id = 'hienlam';

const ORIGIN = [-1260.15, 238.25];
const ANGLE = Math.atan2(-0.605, 0.796);
const AXIS_X = Math.cos(ANGLE);
const AXIS_Z = Math.sin(ANGLE);
const toWorld = (u, v): [number, number] => [ORIGIN[0] + u * AXIS_X - v * AXIS_Z, ORIGIN[1] + u * AXIS_Z + v * AXIS_X];

// The yellow glaze has weathered to a dull orange-brown with dark lichen (Google's satellite and the court
// photosphere): the tile is drawn in that colour, not PAL.imperialRoof's fresh yellow. Ridges, hips and the small
// corner curls are dark ceramic; the finial keeps a worn gilt.
const COLORS = {
  roof: hex('#a8692f'),
  ridge: hex('#5a4234'),
  finial: hex('#a88a45'),
  gold: hex('#a67c34'),
  lacquer: hex('#66281f'), // the pavilion's lacquer reads dark and worn in the photographs, not fresh vermilion
  rail: hex('#8a3226'),
  door: hex('#7c2a22'),
  grass: hex(PAL.green.grass),
  flower: hex('#c8683a'),
  flowerRed: hex('#b8323a'),
  base: hex('#a99d86'),
  brick: hex('#9c7a64'),
  thanh: hex('#8e9396'),
  stone: PAL.stone,
  wall: hex('#b8945e'), // the imperial compound walls (FENCE.imperial)
  bronze: hex('#4c4d3f'),
  tablet: hex('#24382d'),
  grilleGold: hex('#c9a54e'),
  grilleBar: hex('#6b5634'),
  loftOpening: hex('#3a2a22'),
};
const LAMP_COLOR: [number, number, number] = [1, 0.62, 0.3];

// the cross wall in the frame: Hiển Lâm Các to the gates, the gates to the compound wall
const CROSS_WALLS = [[[-11.84, -6.8], [-20.12, -6.82]], [[11.77, -6.81], [20.21, -6.68]], [[-33.78, -7.03], [-61.65, -7.36]], [[34.07, -6.57], [61.98, -6.45]]];
const GATE_TOWERS: [number, number, number, number][] = [[27.1, -4.62, 13.9, 4.0], [-27.0, -4.95, 13.6, 3.9]]; // Tuấn Liệt, Sùng Công: centre u, v, length, depth
const AXIS_U = -0.44; // the mapped steps and Cao đỉnh's apron sit 0.4 m off the outline's middle
const WEST_URN_HEIGHTS = [2.31, 2.25, 2.325, 2.337];
const EAST_URN_HEIGHTS = [2.27, 2.31, 2.35, 2.31];
const TREE_CLEAR_BOXES = [[0, 0, 25, 19], [0, -12, 46, 12], [27.1, -4.6, 15, 5], [-27, -4.9, 15, 5], [0, 16.6, 6, 16]];

const groundY = (pos) => LAND_Y + rise(pos[0], pos[1]);
function frameBox(S, u, v, y0, y1, sizeU, sizeV, color, opts?) {
  const pos = toWorld(u, v);
  S.box(pos[0], pos[1], y0, y1, sizeU, sizeV, ANGLE, color, opts);
}
// nearly straight eaves ending in small dark curls (horns: false), not long upswept gilt horns
const eaveOpts = (over, extra = {}) => ({ flare: 0.2, over, fascia: 0.22, fasciaCol: shade(COLORS.lacquer, 0.7), ridgeCol: COLORS.ridge, hips: true, glazed: true, segs: 3, horns: false, ...extra });

// a frieze of dark worn lacquer carrying a row of small panels, alternately red and gilt (the đố bản and ô hộc of the
// photograph), instead of one bright strip: along the face at v, from y0 to y1, length len, centred on centerU
function buildFrieze(S, centerU, v, y0, y1, len, sign) {
  frameBox(S, centerU, v, y0, y1, len, 0.1, shade(COLORS.lacquer, 0.75));
  const panelCount = Math.max(2, Math.round(len / 0.9));
  const panelW = len / panelCount;
  for (let k = 0; k < panelCount; k++) {
    frameBox(S, centerU - len / 2 + panelW * (k + 0.5), v + sign * 0.03, y0 + 0.07, y1 - 0.07, panelW * 0.72, 0.06, k & 1 ? shade(COLORS.gold, 0.9) : shade(COLORS.rail, 0.85));
  }
}

// a fretwork railing: top and bottom rails with close balusters, open between (along u at v)
function buildRailing(S, u0, u1, v, y0, height) {
  const midU = (u0 + u1) / 2;
  const len = u1 - u0;
  frameBox(S, midU, v, y0 + height - 0.1, y0 + height, len, 0.12, COLORS.rail);
  frameBox(S, midU, v, y0 + 0.06, y0 + 0.14, len, 0.08, shade(COLORS.rail, 0.8));
  frameBox(S, midU, v, y0 + height * 0.5 - 0.03, y0 + height * 0.5 + 0.03, len, 0.05, shade(COLORS.rail, 0.8));
  const balusterCount = Math.max(2, Math.round(len / 0.32));
  for (let k = 0; k <= balusterCount; k++) {
    frameBox(S, u0 + (len * k) / balusterCount, v, y0 + 0.14, y0 + height - 0.1, 0.05, 0.05, shade(COLORS.rail, 0.7));
  }
}

function buildPavilionBase(S, baseY, floorY) {
  S.base = baseY - LAND_Y;
  // the base: brick and lime (sành-shard reliefs read as a pale render), Bát Tràng brick on top
  S.kind = KIND.MASONRY;
  frameBox(S, 0, 0, baseY - 0.3, floorY - 0.14, 23.6, 13.6, COLORS.base, { taper: 0.99, top: COLORS.brick, topKind: KIND.ROAD });
  frameBox(S, 0, 0, floorY - 0.14, floorY, 23.8, 13.8, shade(COLORS.stone, 1.02), { top: COLORS.brick, topKind: KIND.ROAD });
  // two flights of 9 steps, front and back: steps either side of the carved king's way, dragon cheek walls
  for (const sign of [-1, 1]) {
    S.kind = KIND.MASONRY;
    for (let k = 1; k <= 8; k++) {
      frameBox(S, AXIS_U, sign * (6.8 + 0.27 * (k - 0.5)), baseY - 0.3, floorY - 0.15 * k, 4.4, 0.27, COLORS.thanh, { topKind: KIND.ROAD });
    }
    S.kind = KIND.PLAIN;
    const rampTop = toWorld(AXIS_U, sign * 6.7);
    const rampBot = toWorld(AXIS_U, sign * 9.0);
    S.beam([rampTop[0], floorY + 0.06, rampTop[1]], [rampBot[0], baseY + 0.1, rampBot[1]], 1.3, 0.22, shade(COLORS.thanh, 1.12));
    for (const side of [-1, 1]) {
      const cheekTop = toWorld(AXIS_U + side * 2.4, sign * 6.7);
      const cheekBot = toWorld(AXIS_U + side * 2.4, sign * 9.1);
      S.beam([cheekTop[0], floorY + 0.35, cheekTop[1]], [cheekBot[0], baseY + 0.25, cheekBot[1]], 0.42, 0.5, shade(COLORS.thanh, 0.92));
    }
  }
}

function buildPavilionGroundStorey(S, baseY, floorY) {
  // ground storey: 5 x 3 bays, the outer ring of 16 columns an open verandah round a closed core of 3 x 1 bays
  const colUs = [-10, -6.2, -2.3, 2.3, 6.2, 10];
  const colVs = [-5.1, -2.1, 2.1, 5.1];
  const h1 = 3.6;
  const coreW = 12.4;
  const coreD = 6.4;
  S.kind = KIND.TIMBER;
  frameBox(S, 0, 0, floorY, floorY + h1, coreW, coreD, COLORS.lacquer, { top: shade(COLORS.roof, 0.8) });
  S.kind = KIND.PLAIN;
  for (const sign of [-1, 1]) {
    // door leaves in the three bays, the arched đố bản over them gilt, and the name board over the middle door
    for (const u of [-4.25, 0, 4.25]) {
      frameBox(S, u, sign * (coreD / 2 + 0.04), floorY, floorY + 2.6, 3.2, 0.08, shade(COLORS.lacquer, 0.55));
      buildFrieze(S, u, sign * (coreD / 2 + 0.06), floorY + 2.6, floorY + 3.05, 3.4, sign);
    }
    if (sign < 0) {
      frameBox(S, 0, -coreD / 2 - 0.14, floorY + 2.75, floorY + 3.35, 1.9, 0.08, COLORS.tablet);
      frameBox(S, 0, -coreD / 2 - 0.12, floorY + 2.7, floorY + 3.4, 2.04, 0.06, COLORS.gold);
    }
  }
  for (const side of [-1, 1]) {
    frameBox(S, side * (coreW / 2 + 0.04), 0, floorY + 0.4, floorY + 2.9, 0.08, 3.4, shade(COLORS.lacquer, 0.6));
  }
  // the end bays: yellow-plastered walls between the corner columns closing the verandah at either end
  S.kind = KIND.MASONRY;
  for (const side of [-1, 1]) frameBox(S, side * 10, 0, floorY, floorY + h1 - 0.28, 0.4, 10.2, COLORS.wall);
  // a red fretwork railing along the front and back verandah edges, open in the middle bay over the steps
  S.kind = KIND.PLAIN;
  for (const sign of [-1, 1]) {
    for (const [u0, u1] of ([[-9.8, -2.5], [2.5, 9.8]] as any[])) buildRailing(S, u0, u1, sign * 5.1, floorY, 0.74);
  }
  // under the verandah, the base's long faces carry a yellow fretwork screen (glazed-tile grilles) either side of
  // the steps, framed in the pale render
  for (const sign of [-1, 1]) {
    for (const side of [-1, 1]) {
      const midU = AXIS_U + side * 7.2;
      const len = 7.6;
      const v = sign * 6.83;
      const y0 = baseY + 0.15;
      const y1 = floorY - 0.3;
      frameBox(S, midU, v, y0, y1, len, 0.06, COLORS.grilleGold);
      const barCount = Math.round(len / 0.35);
      for (let k = 1; k < barCount; k++) {
        frameBox(S, midU - len / 2 + (len * k) / barCount, v + sign * 0.02, y0, y1, 0.05, 0.04, COLORS.grilleBar);
      }
      for (const y of [y0 + (y1 - y0) / 3, y0 + (2 * (y1 - y0)) / 3]) {
        frameBox(S, midU, v + sign * 0.02, y - 0.025, y + 0.025, len, 0.04, COLORS.grilleBar);
      }
    }
  }
  // the verandah ceiling and the outer columns on stone bases
  frameBox(S, 0, 0, floorY + h1 - 0.28, floorY + h1, 20.0, 10.2, shade(COLORS.lacquer, 0.5), { top: shade(COLORS.roof, 0.8), bottom: true });
  for (const u of colUs) {
    for (const v of colVs) {
      if (Math.abs(u) < 9 && Math.abs(v) < 4) continue;
      const pos = toWorld(u, v);
      S.cyl(pos[0], pos[1], floorY, floorY + 0.25, 0.42, 0.36, 6, shade(COLORS.stone, 0.95), { cap: false, rot: ANGLE });
      S.cyl(pos[0], pos[1], floorY + 0.25, floorY + h1 - 0.28, 0.22, 0.2, 6, COLORS.lacquer, { cap: false, rot: ANGLE });
    }
  }
  // lower skirt roof: four slopes round the second storey
  S.hip(...toWorld(0, 0), 20.0, 10.2, ANGLE, floorY + h1, 3.4, COLORS.roof, eaveOpts(1.4));
  return floorY + h1;
}

function buildPavilionUpperStoreys(S, secondY, lamps) {
  // second storey: 3 bays, shutters behind a gilt frieze
  const h2 = 4.5;
  const w2 = 12.4;
  const d2 = 6.4;
  S.kind = KIND.TIMBER;
  frameBox(S, 0, 0, secondY, secondY + h2, w2, d2, COLORS.lacquer, { top: shade(COLORS.roof, 0.8) });
  S.kind = KIND.PLAIN;
  for (const sign of [-1, 1]) {
    for (const u of [-4.2, 0, 4.2]) frameBox(S, u, sign * (d2 / 2 + 0.04), secondY + 1.9, secondY + 3.7, 3.3, 0.08, shade(COLORS.lacquer, 0.6));
    buildFrieze(S, 0, sign * (d2 / 2 + 0.06), secondY + 3.85, secondY + 4.25, w2, sign);
    // fretwork balcony railing along the second storey, over the skirt roof
    buildRailing(S, -w2 / 2, w2 / 2, sign * (d2 / 2 + 0.3), secondY + 0.1, 0.9);
    for (const u of [-6.2, -2.1, 2.1, 6.2]) frameBox(S, u, sign * (d2 / 2 + 0.08), secondY + 1.4, secondY + h2, 0.32, 0.12, shade(COLORS.lacquer, 1.08));
  }
  for (const side of [-1, 1]) frameBox(S, side * (w2 / 2 + 0.04), 0, secondY + 1.9, secondY + 3.7, 0.08, 4.4, shade(COLORS.lacquer, 0.6));
  S.hip(...toWorld(0, 0), w2, d2, ANGLE, secondY + h2, 2.6, COLORS.roof, eaveOpts(1.3));

  // third storey: one bay between the four great columns, then the crowning hip roof and a gilt gourd finial
  const thirdY = secondY + h2;
  const h3 = 3.2;
  const w3 = 5.2;
  const d3 = 4.6;
  S.kind = KIND.TIMBER;
  frameBox(S, 0, 0, thirdY, thirdY + h3, w3, d3, COLORS.lacquer, { top: shade(COLORS.roof, 0.8) });
  S.kind = KIND.PLAIN;
  for (const sign of [-1, 1]) {
    frameBox(S, 0, sign * (d3 / 2 + 0.04), thirdY + 1.2, thirdY + 2.7, 3.2, 0.08, shade(COLORS.lacquer, 0.6));
    buildFrieze(S, 0, sign * (d3 / 2 + 0.06), thirdY + 2.75, thirdY + 3.05, w3, sign);
  }
  S.hip(...toWorld(0, 0), w3, d3, ANGLE, thirdY + h3, 2.7, COLORS.roof, eaveOpts(1.3));
  const roofTopY = thirdY + h3 + 2.7;
  const center = toWorld(0, 0);
  S.cyl(center[0], center[1], roofTopY - 0.1, roofTopY + 0.25, 0.42, 0.32, 8, COLORS.finial);
  S.cyl(center[0], center[1], roofTopY + 0.25, roofTopY + 0.75, 0.42, 0.24, 8, COLORS.finial);
  S.cyl(center[0], center[1], roofTopY + 0.75, roofTopY + 1.25, 0.15, 0.04, 6, COLORS.finial);

  // night: lanterns under the three eaves
  for (const sign of [-1, 1]) {
    for (const u of [-7.6, -2.3, 2.3, 7.6]) {
      const pos = toWorld(u, sign * 5.3);
      lamps.push([pos[0], secondY - 0.6, pos[1]]);
    }
  }
  for (const sign of [-1, 1]) {
    for (const u of [-4.2, 4.2]) {
      const pos = toWorld(u, sign * 3.6);
      lamps.push([pos[0], thirdY - 0.5, pos[1]]);
    }
  }
}

function buildPavilionBody(S, lamps) {
  const baseY = groundY(ORIGIN);
  const floorY = baseY + 1.35;
  buildPavilionBase(S, baseY, floorY);
  const secondY = buildPavilionGroundStorey(S, baseY, floorY);
  buildPavilionUpperStoreys(S, secondY, lamps);
}

// a bronze tripod urn (src/landmarks/props.js dinh) of total height height on its stone slab, facing Thế Miếu (-v),
// so its two handles lie across u
function buildUrn(S, u, v, height) {
  const pos = toWorld(u, v);
  dinh(S, pos[0], groundY(pos) + 0.28, pos[1], ANGLE - Math.PI / 2, { h: height, col: COLORS.bronze, stand: 0.22, standCol: shade(COLORS.stone, 0.92) }); // on the raised bed
}

function buildCourt(S) {
  const baseY = groundY(toWorld(0, -10));
  S.base = baseY - LAND_Y;
  // the stone apron of the urns along the front of the cross wall, with Cao đỉnh's bay pushed forward on the axis
  // (OSM area 695810817)
  const apronPts = [[-21.2, -6.88], [-20.12, -6.82], [20.21, -6.68], [20.87, -6.7], [20.87, -12.83], [2.75, -12.79], [2.7, -17.85], [-4.79, -17.9], [-4.73, -12.7], [-21.15, -12.74]];
  S.kind = KIND.ROAD;
  // seen from the court it is a raised bed behind a low brick kerb wall, rendered and capped, round turf; the urns
  // stand on stone slabs, a clipped hedge of flowering shrubs runs along the kerb and between the urns
  S.kind = KIND.MASONRY;
  S.prism(apronPts.map(([u, v]) => toWorld(u, v)), baseY - 0.2, baseY + 0.5, shade(COLORS.brick, 0.95), COLORS.grass, { topKind: KIND.GROUND });
  S.kind = KIND.PLAIN;
  const drawHedge = (u, v, sizeU, sizeV, seed) => {
    frameBox(S, u, v, baseY + 0.5, baseY + 0.95, sizeU, sizeV, hex(PAL.shrubs[seed & 3]));
    // blooms scattered along the top, not one slab
    const bloomCount = Math.max(1, Math.round(Math.max(sizeU, sizeV) / 0.5));
    const alongU = sizeU >= sizeV;
    for (let j = 0; j < bloomCount; j++) {
      const frac = (j + 0.5) / bloomCount - 0.5;
      const bloomSize = (j * 7 + seed * 3) % 5 === 0 ? 0 : 0.28;
      if (bloomSize) {
        frameBox(S, u + (alongU ? frac * sizeU : 0), v + (alongU ? 0 : frac * sizeV), baseY + 0.93, baseY + 1.03, bloomSize, bloomSize, (j + seed) & 1 ? COLORS.flower : COLORS.flowerRed);
      }
    }
  };
  for (let i = -4; i <= 4; i++) {
    if (!i) continue;
    drawHedge(AXIS_U + 4.6 * i, -12.25, 3.0, 0.6, i + 4); // along the front kerb, in front of each urn
    for (const side of [-1, 1]) drawHedge(AXIS_U + 4.6 * i + side * 1.75, -9.6, 0.9, 1.6, i + 5 + side); // between the urns
  }
  for (const [u, seed] of ([[-4.2, 1], [2.15, 3]] as any[])) drawHedge(u, -15.3, 0.6, 4.2, seed); // along the sides of Cao đỉnh's bay
  // Cửu Đỉnh: Cao in the middle and forward, then outward Nhân, Anh, Thuần, Dụ (west) and Chương, Nghị, Tuyên,
  // Huyền (east); heights from the Huế - Xưa và Nay table
  buildUrn(S, AXIS_U, -14.6, 2.5);
  for (let i = 0; i < 4; i++) {
    buildUrn(S, AXIS_U - 4.6 * (i + 1), -10.2, WEST_URN_HEIGHTS[i]);
    buildUrn(S, AXIS_U + 4.6 * (i + 1), -10.2, EAST_URN_HEIGHTS[i]);
  }
  // two small mapped masonry pieces at the ends of the row (OSM 695810821/822), drawn as stone stands with burners
  for (const [u, v] of ([[-22.51, -17.55], [21.02, -16.99]] as any[])) {
    const pos = toWorld(u, v);
    const standY = groundY(pos);
    S.kind = KIND.MASONRY;
    frameBox(S, u, v, standY - 0.1, standY + 0.85, 1.4, 1.4, shade(COLORS.stone, 0.9), { taper: 0.92 });
    dinh(S, pos[0], standY + 0.85, pos[1], ANGLE - Math.PI / 2, { h: 0.75, col: COLORS.bronze, lid: true, stand: 0 });
  }
  // behind: the walk from the back steps to Miếu Môn, Bát Tràng brick with a stone middle
  const backY = groundY(toWorld(0, 16));
  S.base = backY - LAND_Y;
  S.kind = KIND.ROAD;
  frameBox(S, AXIS_U, 16.6, backY - 0.2, backY + 0.06, 4.4, 15.2, COLORS.brick, { topKind: KIND.ROAD });
  frameBox(S, AXIS_U, 16.6, backY + 0.06, backY + 0.1, 1.3, 15.2, shade(COLORS.stone, 1.08), { topKind: KIND.ROAD });
}

// a gate in the cross wall: a plastered gate of three doors under one tiled roof, with a plastered loft (bell or
// drum) over the middle door, a railed balcony and a round opening on each face (Street View, Thế Miếu's court)
function buildGateTower(S, lamps, [u, v, len, depth]: [number, number, number, number]) {
  const baseY = groundY(toWorld(u, v));
  const gateH = 4.0;
  S.base = baseY - LAND_Y;
  S.kind = KIND.MASONRY;
  frameBox(S, u, v, baseY - 0.3, baseY + gateH, len, depth, COLORS.wall, { top: shade(COLORS.wall, 0.9) });
  frameBox(S, u, v, baseY + gateH - 0.35, baseY + gateH, len + 0.3, depth + 0.3, shade(COLORS.wall, 1.08));
  S.kind = KIND.PLAIN;
  for (const [du, doorW, doorH] of ([[0, 1.9, 2.9], [-3.6, 1.6, 2.5], [3.6, 1.6, 2.5]] as any[])) {
    frameBox(S, u + du, v, baseY, baseY + doorH, doorW, depth + 0.06, COLORS.door); // red door leaves on both faces
    frameBox(S, u + du, v, baseY + doorH, baseY + doorH + 0.3, doorW + 0.6, depth + 0.1, shade(COLORS.wall, 0.8));
  }
  for (const du of [-5.6, -1.65, 1.65, 5.6]) {
    frameBox(S, u + du, v, baseY, baseY + gateH - 0.4, 0.5, depth + 0.12, shade(COLORS.wall, 1.1)); // pilasters
  }
  // one tiled roof over the whole gate, the loft rising through it
  S.hip(...toWorld(u, v), len, depth, ANGLE, baseY + gateH, 1.2, COLORS.roof, { flare: 0.3, over: 0.6, ridgeCol: COLORS.ridge, fascia: 0.15, fasciaCol: shade(COLORS.lacquer, 0.7), hips: true, glazed: true });
  const loftY = baseY + gateH + 0.6;
  const loftH = 2.8;
  S.kind = KIND.MASONRY;
  frameBox(S, u, v, baseY + gateH, loftY + loftH, 4.6, 3.2, COLORS.wall, { top: shade(COLORS.wall, 0.9) });
  S.kind = KIND.PLAIN;
  for (const sign of [-1, 1]) {
    for (const side of [-1, 1]) frameBox(S, u + side * 2.05, v + sign * 1.64, loftY, loftY + loftH, 0.5, 0.1, shade(COLORS.wall, 1.1));
    frameBox(S, u, v + sign * 1.64, loftY + 1.0, loftY + 2.2, 1.2, 0.08, COLORS.loftOpening); // the round opening, drawn square-cut
    frameBox(S, u, v + sign * 1.7, loftY, loftY + 0.1, 3.4, 0.5, shade(COLORS.wall, 0.85)); // balcony floor
    frameBox(S, u, v + sign * 1.92, loftY + 0.55, loftY + 0.65, 3.4, 0.08, COLORS.rail);
    frameBox(S, u, v + sign * 1.92, loftY + 0.1, loftY + 0.55, 3.4, 0.04, shade(COLORS.rail, 0.6));
  }
  S.hip(...toWorld(u, v), 4.6, 3.2, ANGLE, loftY + loftH, 1.8, COLORS.roof, eaveOpts(1.0));
  for (const sign of [-1, 1]) {
    const pos = toWorld(u, v + sign * 2.3);
    lamps.push([pos[0], loftY + 2.0, pos[1]]);
  }
}

function clearMappedFeatures(data) {
  // the two gate towers are mapped as plain buildings; this model draws them
  if (Array.isArray(data.bld)) {
    for (let i = data.bld.length - 1; i >= 0; i--) {
      if (['Tuấn Liệt Môn', 'Sùng Công Môn'].includes(String(data.bld[i][3]).normalize('NFC'))) data.bld.splice(i, 1);
    }
  }
  // no mapped tree on the base, the steps, the urn apron, the gates or the back walk
  if (Array.isArray(data.trees)) {
    const trees = data.trees;
    const nearCount = data.meta?.counts?.treesNear;
    for (let i = trees.length / 4 - 1; i >= 0; i--) {
      const dx = trees[i * 4] / 10 - ORIGIN[0];
      const dz = trees[i * 4 + 1] / 10 - ORIGIN[1];
      const u = dx * AXIS_X + dz * AXIS_Z;
      const v = -dx * AXIS_Z + dz * AXIS_X;
      if (!TREE_CLEAR_BOXES.some(([cu, cv, su, sv]) => Math.abs(u - cu) < su / 2 && Math.abs(v - cv) < sv / 2)) continue;
      trees.splice(i * 4, 4);
      if (nearCount != null && i < nearCount) data.meta.counts.treesNear--;
    }
  }
}

export function build({ data, S, group }) {
  clearMappedFeatures(data);
  const lamps = [];
  buildPavilionBody(S, lamps);
  buildCourt(S);
  for (const gateSpec of GATE_TOWERS) buildGateTower(S, lamps, gateSpec);
  S.kind = KIND.PLAIN;
  S.base = 0;
  const roads = roadsNear(data, ORIGIN, 120);
  for (const wall of CROSS_WALLS) fence(S, wall.map(([u, v]) => toWorld(u, v)), FENCE.imperial, { closed: false, roads });
  S.kind = KIND.PLAIN;
  S.base = 0;
  const pos = [];
  const col = [];
  for (const lamp of lamps) {
    pos.push(...lamp);
    col.push(...LAMP_COLOR);
  }
  const pts = glowPoints(pos, col, 4);
  pts.userData.glow = true;
  pts.userData.landmark = id;
  group.add(pts);
}
