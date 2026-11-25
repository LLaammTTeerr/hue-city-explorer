import { KIND, hex, shade, mix, unflat, hipShape } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';

// Cửa Nhà Đồ, officially Chánh Nam môn (正南門), a south gate of the Kinh thành (Huế Citadel), west of Kỳ Đài.
// Notes and sources: docs/places/gate-cua-nha-do.md.
//
// The arched passage dates from 1809 (Gia Long), the watch tower (vọng lâu) on top from Minh Mạng's reign (1829).
// Arch and tower fell in the 1953 flood and were rebuilt later. The popular name comes from the Gia Long-era
// arsenal and workshop (Võ khố, Đồ gia) that stood by it. Today Nguyễn Trãi street runs one way through the single
// passage, out over the moat on Cầu Nhà Đồ (drawn as the shared citadel bridge, geo/citadel-bridge.js).
//
// Form, as the gate stands today (street-level photographs from the causeway, docs/places/gate-cua-nha-do.md):
// a bare red-brown brick block the full thickness of the rampart, rising about 1.4 m over the wall top, with
// shallow pilasters at its corners and a raised brick frame round one round-arched passage (brick voussoirs, no
// plaster surround). Over the frame a grey lime cornice, the name panel above it, a grey cornice round the top of
// the block and a low plastered parapet with panels and posts (not crenellated). On the terrace the vọng lâu is
// masonry, not timber: a lime-plastered storey with three brick-ringed arches on the front (a tall one between two
// smaller), a skirt of tiled roof round a flat deck with a balustrade, a small upper storey with one arch, and a
// small tiled hip roof on top, white ridges ending in upturned horns.
// Plan: OSM way 617748935 (17.7 m along the wall × 12.5 m), centre and axis below; the satellite agrees with both
// (within about 2 m and 1°). The block reaches the rampart's mapped faces: outer face 8.1 m out of the centre,
// inner face 6.3 m in (the wall band's inner notch at the gate).
// Heights are photogrammetric estimates from the matched causeway photographs (no published drawing): cornice 8.0 m
// over the ground, parapet 8.8 m, tower cornice 12.5 m, top ridge about 17.2 m. Passage 4.0 m wide, crown 4.8 m.
// Local frame: s along the wall (the outline's long axis), t through it, + out of the Citadel (south-south-east).
export const id = 'gate:Cửa Nhà Đồ';

const ORIGIN = [-1428.75, 535.6]; // centre of the OSM outline, metres in the model frame
const WALL_ANGLE = -0.473; // direction of s (the outline's long axis, along the rampart)
const AXIS_X = Math.cos(WALL_ANGLE);
const AXIS_Z = Math.sin(WALL_ANGLE);
const toWorld = (s, t): [number, number] => [ORIGIN[0] + s * AXIS_X - t * AXIS_Z, ORIGIN[1] + s * AXIS_Z + t * AXIS_X];
const vertex = (s, t, y?) => {
  const pos = toWorld(s, t);
  return [pos[0], y, pos[1]];
};
const normal = (ds, dt, dy = 0): [number, number, number] => [ds * AXIS_X - dt * AXIS_Z, dy, ds * AXIS_Z + dt * AXIS_X];

const BLOCK_LEN = 17.7; // the block along the wall (OSM)
const T_INNER = -6.45;
const T_OUTER = 8.25; // its inner and outer faces, a hand's breadth proud of the rampart's
const T_CENTER = (T_INNER + T_OUTER) / 2;
const BLOCK_DEPTH = T_OUTER - T_INNER;
const CORNICE_H = 8.0; // top of the block's cornice = the terrace, above LAND_Y
const PASSAGE_W = 4.0;
const PASSAGE_H = 4.8; // the passage (narrower and lower than the shared CITADEL_PASSAGE, as photographed)
const ARCH_FRAME = { w: 6.4, h: 6.2 }; // the raised brick frame round the arch
const LOWER_TOWER = { w: 9.6, d: 7.0, h: 4.2 }; // vọng lâu, lower storey (front width from the photographs, depth estimated)
const UPPER_TOWER = { w: 4.6, d: 3.6, h: 2.5 }; // upper storey
const TOWER_DECK = { w: 7.2, d: 5.0 }; // flat deck over the lower storey, inside the tiled skirt
const PARAPET_H = 0.6;
const PARAPET_THICK = 0.25;

// The block is the same weathered red-brown brick as the rampart either side of it (one material in the photographs),
// so it takes the rampart's own brick colour (kinhthanh.js, matched to Street View) and the same MASONRY shading.
const BASE_BRICK = mix(PAL.brick, hex('#8a6a58'), 0.75);
const COLORS = {
  brick: BASE_BRICK,
  brick2: mix(BASE_BRICK, hex('#8c5e4a'), 0.2), // the pilasters, arch voussoirs and frame, a shade redder
  damp: shade(BASE_BRICK, 0.78),
  streak: shade(BASE_BRICK, 0.88),
  relaid: mix(BASE_BRICK, hex('#9a8070'), 0.4),
  lime: hex('#66645d'), // dark grey weathered lime: cornices, parapet, lintel (it reads dark in the photographs)
  limeDark: hex('#53524c'), // the parapet's recessed panels, the stains
  slab: hex('#76736c'),
  rim: hex('#97938a'),
  ink: hex('#4e4b45'), // the name tablet: grey stone, thin pale border
  dark: hex('#1f1a18'),
  tower: hex('#837d6f'), // the tower's weathered lime plaster
  tile: hex('#a39a84'), // the tower's tiles, weathered to a pale yellow-grey
  ridge: hex('#c9c2b2'), // lime-mortared ridges and the small curled ends
  fascia: hex('#8e8879'), // the eave's edge and its underside, light lime as photographed (no dark soffit)
  lampPost: hex('#3b3a38'),
  bollardRed: hex('#b8352e'),
  bollardWhite: hex('#e8e4da'),
  flagstaff: hex('#5a5753'),
};

function placeBox(S, s, t, y0, y1, sizeS, sizeT, color, opts?) {
  const pos = toWorld(s, t);
  S.box(pos[0], pos[1], y0, y1, sizeS, sizeT, WALL_ANGLE, color, opts);
}

function buildBlockAndFaces(S, baseY, topY) {
  // two piers either side of the passage, the arch and the masonry over it
  S.kind = KIND.MASONRY;
  for (const sign of [-1, 1]) {
    const pierW = BLOCK_LEN / 2 - PASSAGE_W / 2;
    placeBox(S, sign * (PASSAGE_W / 2 + pierW / 2), T_CENTER, baseY - 0.5, topY - 0.4, pierW, BLOCK_DEPTH, COLORS.brick, { top: PAL.stone, topKind: KIND.ROAD });
  }
  buildArchPassage(S, baseY, topY - 0.4);

  // corner pilasters on both faces, and the raised frame round the arch with its lime lintel
  for (const dt of [-1, 1]) {
    const faceT = dt > 0 ? T_OUTER : T_INNER;
    for (const sign of [-1, 1]) {
      placeBox(S, sign * (BLOCK_LEN / 2 - 0.7), faceT + dt * 0.12, baseY - 0.5, topY - 0.75, 1.4, 0.24, COLORS.brick2);
      S.kind = KIND.PLAIN;
      placeBox(S, sign * (BLOCK_LEN / 2 - 0.7), faceT + dt * 0.16, topY - 0.75, topY - 0.4, 1.6, 0.32, COLORS.lime);
      S.kind = KIND.MASONRY;
    }
    // the frame stands 0.35 m proud: two piers from the ground to the lintel and the brick over the arch between them
    for (const sign of [-1, 1]) {
      placeBox(S, sign * (ARCH_FRAME.w / 2 - (ARCH_FRAME.w - PASSAGE_W) / 4), faceT + dt * 0.175, baseY - 0.5, baseY + ARCH_FRAME.h - 0.3, (ARCH_FRAME.w - PASSAGE_W) / 2, 0.35, COLORS.brick2);
    }
    placeBox(S, 0, faceT + dt * 0.175, baseY + PASSAGE_H + 0.05, baseY + ARCH_FRAME.h - 0.3, PASSAGE_W + 0.02, 0.35, COLORS.brick2);
    S.kind = KIND.PLAIN;
    placeBox(S, 0, faceT + dt * 0.22, baseY + ARCH_FRAME.h - 0.3, baseY + ARCH_FRAME.h, ARCH_FRAME.w + 0.3, 0.44, COLORS.lime);
    // the voussoir ring: a band of redder brick round the mouth
    const radius = PASSAGE_W / 2;
    const springY = baseY + PASSAGE_H - radius;
    const segs = 12;
    for (let k = 0; k < segs; k++) {
      const a0 = Math.PI - (Math.PI * k) / segs;
      const a1 = Math.PI - (Math.PI * (k + 1)) / segs;
      const ringRadius = radius + 0.3;
      S.beam(
        vertex(ringRadius * Math.cos(a0), faceT + dt * 0.36, springY + ringRadius * Math.sin(a0)),
        vertex(ringRadius * Math.cos(a1), faceT + dt * 0.36, springY + ringRadius * Math.sin(a1)),
        0.05,
        0.6,
        shade(COLORS.brick2, 1.08),
      );
    }
  }

  // weathering on both faces: a damp foot, grey streaks from the cornice down, relaid patches
  S.kind = KIND.PLAIN;
  const weatherPatches: [number, number, number, any][] = [
    [-7.0, 1.2, 2.4, COLORS.streak],
    [-4.6, 0.9, 4.0, COLORS.streak],
    [4.4, 1.4, 2.0, COLORS.streak],
    [6.9, 0.8, 3.4, COLORS.streak],
    [-5.9, 1.3, 1.2, COLORS.relaid],
    [5.6, 1.1, 4.4, COLORS.relaid],
  ];
  for (const dt of [-1, 1]) {
    const faceT = dt > 0 ? T_OUTER + 0.03 : T_INNER - 0.03;
    const faceNorm = normal(0, dt);
    const drawFaceQuad = (s0, s1, y0, y1, color) => S.quad(vertex(s0, faceT, y0), vertex(s1, faceT, y0), vertex(s1, faceT, y1), vertex(s0, faceT, y1), color, faceNorm);
    for (const [a, b] of ([[-BLOCK_LEN / 2 + 1.4, -ARCH_FRAME.w / 2], [ARCH_FRAME.w / 2, BLOCK_LEN / 2 - 1.4]] as any[])) {
      drawFaceQuad(a, b, baseY - 0.5, baseY + 0.8, COLORS.damp);
    }
    for (const [s, width, y0, color] of weatherPatches) {
      drawFaceQuad(s - width / 2, s + width / 2, baseY + y0, color === COLORS.relaid ? baseY + y0 + 1.5 : topY - 0.45, color);
    }
  }
}

function buildNameTablets(S, baseY) {
  // name tablet between the frame and the cornice: a grey stone set flush in the brick, a thin pale border,
  // 正南門 cut in three dark characters (drawn as a few strokes each, not blocks)
  const tabletY = baseY + ARCH_FRAME.h + 0.35;
  const charStrokes: [number, number, number, number][] = [
    [0, 0.68, 0.36, 0.035],
    [0, 0.48, 0.3, 0.035],
    [0, 0.26, 0.38, 0.035],
    [0, 0.47, 0.035, 0.42],
    [-0.13, 0.4, 0.035, 0.26],
    [0.13, 0.4, 0.035, 0.26],
  ];
  for (const dt of [-1, 1]) {
    const faceT = dt > 0 ? T_OUTER : T_INNER;
    placeBox(S, 0, faceT + dt * 0.02, tabletY, tabletY + 0.95, 2.4, 0.04, COLORS.rim);
    placeBox(S, 0, faceT + dt * 0.04, tabletY + 0.07, tabletY + 0.88, 2.26, 0.04, COLORS.slab);
    for (const k of [-1, 0, 1]) {
      const charS = k * 0.62 * -dt; // read left to right from either side
      for (const [ds, y, width, height] of charStrokes) {
        placeBox(S, charS + ds, faceT + dt * 0.065, tabletY + y - height / 2, tabletY + y + height / 2, width, 0.012, COLORS.ink);
      }
    }
  }
}

function buildCorniceAndParapet(S, topY) {
  placeBox(S, 0, T_CENTER, topY - 0.4, topY, BLOCK_LEN + 0.5, BLOCK_DEPTH + 0.5, COLORS.lime, { top: PAL.stone, topKind: KIND.ROAD });
  const parapetSides: [number, boolean, number][] = [
    [BLOCK_LEN, true, T_OUTER + 0.05],
    [BLOCK_LEN, true, T_INNER - 0.05],
    [BLOCK_DEPTH, false, BLOCK_LEN / 2 + 0.05],
    [BLOCK_DEPTH, false, -BLOCK_LEN / 2 - 0.05],
  ];
  for (const [len, along, offset] of parapetSides) {
    const inset = Math.sign(offset - (along ? T_CENTER : 0)) * PARAPET_THICK / 2;
    const center = along ? [0, offset - inset] : [offset - inset, T_CENTER];
    placeBox(S, center[0], center[1], topY, topY + PARAPET_H, along ? len + 0.1 : PARAPET_THICK, along ? PARAPET_THICK : len + 0.1, COLORS.lime, { top: shade(COLORS.lime, 1.08) });
    // posts with a cap, at both ends and about every 2.6 m; recessed panels between them on the outer face
    const spanCount = Math.max(2, Math.round(len / 2.6));
    for (let k = 0; k <= spanCount; k++) {
      const alongCoord = -len / 2 + (len * k) / spanCount;
      const isEnd = k === 0 || k === spanCount;
      const s = along ? alongCoord : center[0];
      const t = along ? center[1] : T_CENTER + alongCoord;
      placeBox(S, s, t, topY, topY + PARAPET_H + 0.14, 0.36, 0.36, shade(COLORS.lime, 1.04), { top: shade(COLORS.lime, 1.1) });
      if (isEnd) S.cyl(...toWorld(s, t), topY + PARAPET_H + 0.14, topY + PARAPET_H + 0.34, 0.15, 0.09, 8, shade(COLORS.lime, 1.1));
      if (k < spanCount) {
        const midCoord = -len / 2 + (len * (k + 0.5)) / spanCount;
        const sideSign = Math.sign(offset - (along ? T_CENTER : 0));
        const panelS = along ? midCoord : center[0] + sideSign * (PARAPET_THICK / 2 + 0.01);
        const panelT = along ? center[1] + sideSign * (PARAPET_THICK / 2 + 0.01) : T_CENTER + midCoord;
        placeBox(S, panelS, panelT, topY + 0.12, topY + PARAPET_H - 0.12, along ? len / spanCount - 0.6 : 0.02, along ? 0.02 : len / spanCount - 0.6, COLORS.limeDark);
      }
    }
  }
}

function buildLampsAndBollards(S, baseY, topY) {
  // two small lamp standards on the parapet either side of the tower, and the red-and-white bollards at the passage mouth
  S.kind = KIND.PLAIN;
  for (const sign of [-1, 1]) {
    const pos = toWorld(sign * 6.6, T_CENTER + 3.0);
    S.cyl(pos[0], pos[1], topY + PARAPET_H, topY + PARAPET_H + 1.7, 0.05, 0.04, 6, COLORS.lampPost, { cap: false });
    S.cyl(pos[0], pos[1], topY + PARAPET_H + 1.7, topY + PARAPET_H + 1.95, 0.12, 0.08, 6, COLORS.lampPost);
  }
  for (const sign of [-1, 1]) {
    const pos = toWorld(sign * (PASSAGE_W / 2 + 0.5), T_OUTER + 1.6);
    S.cyl(pos[0], pos[1], baseY, baseY + 0.7, 0.07, 0.07, 6, COLORS.bollardRed, { cap: false });
    S.cyl(pos[0], pos[1], baseY + 0.25, baseY + 0.45, 0.075, 0.075, 6, COLORS.bollardWhite, { cap: false });
  }
}

export function build({ data, S }) {
  const baseY = LAND_Y;
  const savedKind = S.kind;
  const pavedStart = S.n;
  // the wall must be where this model expects it: the rampart band crosses the axis near both faces
  if (!(data.wall || []).length) throw new Error('no rampart in data.wall');
  if (!(data.wall[0] || []).some((ring) => unflat(ring).some(([x, z]) => Math.hypot(x - ORIGIN[0], z - ORIGIN[1]) < 60))) {
    throw new Error('rampart not near Cửa Nhà Đồ');
  }

  const topY = baseY + CORNICE_H;
  buildBlockAndFaces(S, baseY, topY);
  buildNameTablets(S, baseY);
  buildCorniceAndParapet(S, topY);
  buildTower(S, topY);
  buildLampsAndBollards(S, baseY, topY);

  // the terrace and the passage are built ground: trees and houses keep off it
  (S.paved = S.paved || []).push([pavedStart, S.n]);
  S.kind = savedKind;
}

// An arched opening on a face of a box centred at s = centerS, face plane t, facing dn: a dark recess and a brick ring.
function drawArchOpening(S, along, centerS, faceT, dn, width, y0, crownY, withRing = true) {
  const radius = width / 2;
  const springY = crownY - radius;
  const segs = 8;
  const pointAt = (u, y) => (along ? vertex(centerS + u, faceT, y) : vertex(faceT, centerS + u, y));
  const faceNorm = along ? normal(0, dn) : normal(dn, 0);
  S.kind = KIND.PLAIN;
  S.quad(pointAt(-radius, y0), pointAt(radius, y0), pointAt(radius, springY), pointAt(-radius, springY), COLORS.dark, faceNorm);
  for (let k = 0; k < segs; k++) {
    const a0 = Math.PI - (Math.PI * k) / segs;
    const a1 = Math.PI - (Math.PI * (k + 1)) / segs;
    S.quad(
      pointAt(radius * Math.cos(a0), springY),
      pointAt(radius * Math.cos(a0), springY + radius * Math.sin(a0)),
      pointAt(radius * Math.cos(a1), springY + radius * Math.sin(a1)),
      pointAt(radius * Math.cos(a1), springY),
      COLORS.dark,
      faceNorm,
    );
  }
  if (!withRing) return;
  for (let k = 0; k < segs; k++) {
    const a0 = Math.PI - (Math.PI * k) / segs;
    const a1 = Math.PI - (Math.PI * (k + 1)) / segs;
    const ringRadius = radius + 0.17;
    const p0 = pointAt(ringRadius * Math.cos(a0), springY + ringRadius * Math.sin(a0));
    const p1 = pointAt(ringRadius * Math.cos(a1), springY + ringRadius * Math.sin(a1));
    S.beam(p0, p1, 0.04, 0.34, COLORS.brick2);
  }
  for (const sign of [-1, 1]) {
    S.beam(pointAt(sign * (radius + 0.17), y0), pointAt(sign * (radius + 0.17), springY), 0.04, 0.34, COLORS.brick2);
  }
}

// The masonry tower: plastered lower storey with three arches front and back and one on each end, a tiled skirt round
// a flat deck with a balustrade, the upper storey with one arch on each side, and a small tiled hip on top.
function buildTower(S, y0) {
  const center = toWorld(0, T_CENTER);
  const savedKind = S.kind;
  const lowerTopY = y0 + LOWER_TOWER.h; // lower storey's cornice
  S.kind = KIND.PLAIN;
  placeBox(S, 0, T_CENTER, y0, lowerTopY, LOWER_TOWER.w, LOWER_TOWER.d, COLORS.tower, { top: shade(COLORS.tower, 0.8) });
  // stains down the plaster
  for (const dt of [-1, 1]) {
    const faceT = T_CENTER + dt * (LOWER_TOWER.d / 2 + 0.01);
    for (const [s, width] of ([[-4.1, 0.7], [-1.6, 0.4], [1.9, 0.5], [4.0, 0.8]] as any[])) {
      S.quad(vertex(s - width / 2, faceT, lowerTopY - 2.2), vertex(s + width / 2, faceT, lowerTopY - 2.2), vertex(s + width / 2, faceT, lowerTopY - 0.05), vertex(s - width / 2, faceT, lowerTopY - 0.05), shade(COLORS.tower, 0.78), normal(0, dt));
    }
  }
  for (const dt of [-1, 1]) {
    const faceT = T_CENTER + dt * (LOWER_TOWER.d / 2 + 0.02);
    drawArchOpening(S, true, 0, faceT, dt, 2.3, y0, y0 + 3.6);
    for (const sign of [-1, 1]) drawArchOpening(S, true, sign * 3.1, faceT, dt, 1.5, y0 + 0.9, y0 + 2.9);
  }
  for (const sign of [-1, 1]) {
    drawArchOpening(S, false, T_CENTER, sign * (LOWER_TOWER.w / 2 + 0.02), sign, 1.8, y0, y0 + 3.2);
  }
  // cornice: two lime courses, the upper one wider
  placeBox(S, 0, T_CENTER, lowerTopY - 0.35, lowerTopY, LOWER_TOWER.w + 0.3, LOWER_TOWER.d + 0.3, COLORS.lime);
  placeBox(S, 0, T_CENTER, lowerTopY, lowerTopY + 0.25, LOWER_TOWER.w + 0.6, LOWER_TOWER.d + 0.6, shade(COLORS.lime, 0.92));
  // the tiled skirt: a low hip whose middle the deck covers
  const skirtY = lowerTopY + 0.25;
  const skirtH = 0.7;
  buildShallowHip(S, center, LOWER_TOWER.w + 0.6, LOWER_TOWER.d + 0.6, skirtY, skirtH, 0.3);
  S.kind = KIND.PLAIN;
  const deckY = skirtY + skirtH + 0.3;
  placeBox(S, 0, T_CENTER, skirtY + 0.2, deckY, TOWER_DECK.w, TOWER_DECK.d, COLORS.lime, { top: shade(COLORS.lime, 0.9) });
  // balustrade round the deck: a low wall with posts
  const deckSides: [number, boolean, number][] = [
    [TOWER_DECK.w, true, T_CENTER + TOWER_DECK.d / 2 - 0.12],
    [TOWER_DECK.w, true, T_CENTER - TOWER_DECK.d / 2 + 0.12],
    [TOWER_DECK.d, false, TOWER_DECK.w / 2 - 0.12],
    [TOWER_DECK.d, false, -TOWER_DECK.w / 2 + 0.12],
  ];
  for (const [len, along, offset] of deckSides) {
    placeBox(S, along ? 0 : offset, along ? offset : T_CENTER, deckY, deckY + 0.45, along ? len : 0.22, along ? 0.22 : len, shade(COLORS.lime, 0.95));
    const spanCount = Math.max(2, Math.round(len / 1.8));
    for (let k = 0; k <= spanCount; k++) {
      const alongCoord = -len / 2 + (len * k) / spanCount;
      placeBox(S, along ? alongCoord : offset, along ? offset : T_CENTER + alongCoord, deckY, deckY + 0.75, 0.3, 0.3, COLORS.lime);
    }
  }
  // upper storey
  const upperTopY = deckY + UPPER_TOWER.h;
  placeBox(S, 0, T_CENTER, deckY, upperTopY, UPPER_TOWER.w, UPPER_TOWER.d, COLORS.tower, { top: shade(COLORS.tower, 0.8) });
  for (const dt of [-1, 1]) drawArchOpening(S, true, 0, T_CENTER + dt * (UPPER_TOWER.d / 2 + 0.02), dt, 1.5, deckY + 0.2, deckY + 2.1);
  for (const sign of [-1, 1]) drawArchOpening(S, false, T_CENTER, sign * (UPPER_TOWER.w / 2 + 0.02), sign, 1.0, deckY + 0.6, deckY + 1.9, false);
  placeBox(S, 0, T_CENTER, upperTopY - 0.25, upperTopY, UPPER_TOWER.w + 0.3, UPPER_TOWER.d + 0.3, COLORS.lime);
  // top roof
  const topRoofH = 0.75;
  buildShallowHip(S, center, UPPER_TOWER.w + 0.3, UPPER_TOWER.d + 0.3, upperTopY, topRoofH, 0.3);
  // a flagstaff on the ridge, as photographed
  S.kind = KIND.PLAIN;
  S.cyl(center[0], center[1], upperTopY + topRoofH - 0.1, upperTopY + topRoofH + 1.4, 0.035, 0.03, 5, COLORS.flagstaff, { cap: false });
  S.kind = savedKind;
}

// The vọng lâu's roofs as photographed: a shallow straight hip of pale tiles with a thin light eave (no flying eave,
// no dark soffit), white hip ridges and only a small curled end at each corner, drawn here rather than with hip()'s
// đầu đao horns, which are far larger than these.
function buildShallowHip(S, center, width, depth, y0, height, overhang) {
  S.hip(center[0], center[1], width, depth, WALL_ANGLE, y0, height, COLORS.tile, { flare: 0, over: overhang, ridgeCol: COLORS.ridge, fascia: 0.14, fasciaCol: COLORS.fascia });
  // the four hip ridges, straight from the ridge's ends down to the eave corners, each ending in a small curl
  const { hw, hd, rl } = hipShape(width + overhang * 2, depth + overhang * 2, 0, false, COLORS.ridge);
  const beamThick = 0.2;
  const savedKind = S.kind;
  const pointAt = (u, v, y): [number, number, number] => [center[0] + u * AXIS_X - v * AXIS_Z, y, center[1] + u * AXIS_Z + v * AXIS_X];
  S.kind = KIND.PLAIN;
  for (const signU of [-1, 1]) {
    for (const signV of [-1, 1]) {
      const ridgeEnd = pointAt(signU * rl, 0, y0 + height + beamThick * 0.4);
      const eaveCorner = pointAt(signU * hw, signV * hd, y0 + beamThick * 0.4);
      S.beam(ridgeEnd, eaveCorner, beamThick * 0.9, beamThick, COLORS.ridge);
      const dx = signU * AXIS_X - signV * AXIS_Z;
      const dz = signU * AXIS_Z + signV * AXIS_X;
      const diagLen = Math.hypot(dx, dz);
      const curlMid = [eaveCorner[0] + (dx / diagLen) * 0.18, eaveCorner[1] + 0.1, eaveCorner[2] + (dz / diagLen) * 0.18];
      S.beam(eaveCorner, curlMid, beamThick * 0.8, beamThick * 0.9, COLORS.ridge);
      S.beam(curlMid, [curlMid[0] + (dx / diagLen) * 0.06, curlMid[1] + 0.2, curlMid[2] + (dz / diagLen) * 0.06], beamThick * 0.6, beamThick * 0.7, COLORS.ridge);
    }
  }
  S.kind = savedKind;
}

// The arched passage through the block along t, centred at s = 0: masonry over the crown, the spandrels on both
// faces, a dark barrel vault, a paved floor.
function buildArchPassage(S, y0, y1) {
  const radius = PASSAGE_W / 2;
  const floorY = y0;
  const crownY = y0 + PASSAGE_H;
  const springY = crownY - radius;
  const segs = 10;
  S.kind = KIND.MASONRY;
  placeBox(S, 0, T_CENTER, crownY, y1, PASSAGE_W + 0.02, BLOCK_DEPTH, COLORS.brick, { top: PAL.stone, topKind: KIND.ROAD });
  const arcPoint = (k) => {
    const theta = Math.PI - (Math.PI * k) / segs;
    return [radius * Math.cos(theta), springY + radius * Math.sin(theta)];
  };
  for (const dt of [-1, 1]) {
    const faceT = dt > 0 ? T_OUTER : T_INNER;
    for (let k = 0; k < segs; k++) {
      const [sa, ya] = arcPoint(k);
      const [sb, yb] = arcPoint(k + 1);
      S.quad(vertex(sa, faceT, ya), vertex(sb, faceT, yb), vertex(sb, faceT, crownY), vertex(sa, faceT, crownY), COLORS.brick, normal(0, dt));
    }
  }
  S.kind = KIND.PLAIN;
  for (let k = 0; k < segs; k++) {
    const [sa, ya] = arcPoint(k);
    const [sb, yb] = arcPoint(k + 1);
    S.quad(vertex(sa, T_INNER + 0.01, ya), vertex(sb, T_INNER + 0.01, yb), vertex(sb, T_OUTER - 0.01, yb), vertex(sa, T_OUTER - 0.01, ya), shade(COLORS.brick, 0.5), normal(-(sa + sb) / 2, 0, springY - (ya + yb) / 2));
  }
  for (const sign of [-1, 1]) {
    const s = sign * (radius - 0.02);
    S.quad(vertex(s, T_INNER + 0.5, floorY), vertex(s, T_OUTER - 0.5, floorY), vertex(s, T_OUTER - 0.5, springY), vertex(s, T_INNER + 0.5, springY), COLORS.dark, normal(-sign, 0));
  }
  S.kind = KIND.ROAD;
  S.quad(vertex(-radius, T_INNER - 0.3, floorY + 0.01), vertex(radius, T_INNER - 0.3, floorY + 0.01), vertex(radius, T_OUTER + 0.3, floorY + 0.01), vertex(-radius, T_OUTER + 0.3, floorY + 0.01), shade(PAL.stone, 0.62), [0, 1, 0]);
  S.kind = KIND.PLAIN;
}
