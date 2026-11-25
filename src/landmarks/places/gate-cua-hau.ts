import { KIND, hex, shade } from '../../geo/buf.ts';
import { LAND_Y } from '../../config.ts';

// Cửa Hậu (Chánh Bắc Môn), the north gate of the Huế Citadel (Kinh thành). Notes and sources: docs/places/gate-cua-hau.md.
//
// The arched gate was built in 1809 under Gia Long and the watch tower (vọng lâu) on it in 1831 under Minh Mạng. It was
// walled up after 1885 when the French set up the Mang Cá post, opened again in 2004, and since 2012 Đinh Tiên Hoàng runs
// through it to Cầu Cửa Hậu over the moat. As it stands (Commons, Cửa_Chánh_Bắc.jpg): a single arched passage through a
// block of near-black weathered brick and stucco that stands a little proud of the rampart, a framed name tablet over
// the arch inside a raised central bay, a cornice and a low balustrade with posts round the flat top; on it a masonry
// tower in two storeys — the lower one with an arch between two round oculi on its outer face and two large blind
// medallions on its pale inner face, the upper one with one arch — each under a short, nearly straight skirt of
// terracotta tiles (edged in yellow in 2008, dark in Street View today), small finials at the corners, beasts on top.
//
// Checked against Google satellite and Street View (2026): Google's road line through the gate runs at bearing 322.8°
// and passes within 0.5 m of ORIGIN, so plan and axis stand. From the car pano on Cầu Cửa Hậu the block, arch and lower
// storey match; the tower's storeys were re-proportioned to it (the lower storey taller, short skirts with little
// overhang, the upper storey taller, side openings round), which puts the ornaments at about 17.6 m, near the sourced
// 17.4 m.
//
// Plan: the OSM outline (way 367959063), 18.1 × 12.2 m, centred on ORIGIN. Its inner face (t −6.1) is where OSM's wall band
// is notched for the inner approach (−6.05), and the inner pano shows the block face at the back of that notch, between
// the brick piers. The 12.2 m is the block above the rampart: Google's satellite shows the balustraded terrace about
// 17.5 × 11-12 m, so the terrace and the tower stand on the outline's centre. The rampart band in hue.json is 14.4 m
// thick here and reaches 2.2 m past the outline's outer face, and the car pano shows the arch, the pilasters and the
// damp foot of the outer face down at the moat side, standing proud of the rampart. So the arch casing runs through the
// whole band as a front apron up to the cornice band under the tablet; the tablet and the upper face stand back on the
// outline. The road (OSM 367959074) runs along the passage axis.
// Local frame: s along the wall, t through it, + out of the Citadel (north-west, towards the moat and the bridge).
export const id = 'gate:Cửa Hậu';

const ORIGIN = [-1910.8, -1980.5]; // centre of the OSM outline, metres in the model frame
const PASSAGE_ANGLE = -2.2137; // passage direction (outward), the bearing of Đinh Tiên Hoàng through the gate
const WALL_ANGLE = PASSAGE_ANGLE - Math.PI / 2; // direction of s
const AXIS_X = Math.cos(WALL_ANGLE);
const AXIS_Z = Math.sin(WALL_ANGLE);
const toWorld = (s, t): [number, number] => [ORIGIN[0] + s * AXIS_X - t * AXIS_Z, ORIGIN[1] + s * AXIS_Z + t * AXIS_X];
const vertex = (s, t, y?) => {
  const pos = toWorld(s, t);
  return [pos[0], y, pos[1]];
};
const normal = (ds, dt, dy = 0): [number, number, number] => [ds * AXIS_X - dt * AXIS_Z, dy, ds * AXIS_Z + dt * AXIS_X];

const BLOCK_LEN = 18.1; // block along the wall (OSM)
const T_INNER = -6.3; // inner face: the OSM outline (−6.1) lapping the wall band's notch (−6.05)
const T_UPPER = 6.1; // outer face of the block above the apron: the OSM outline (12.2 m through the wall)
const T_OUTER = 8.84; // outer face of the apron: 0.5 m proud of the rampart's outer face (+8.34 in hue.json)
const T_CENTER = (T_INNER + T_UPPER) / 2;
const BLOCK_DEPTH = T_UPPER - T_INNER; // the block as OSM maps it: terrace, balustrade and tower centre on it
const BLOCK_H = 8.4; // block to the top of its frieze (estimate: in the photo the block stands ~1.3× the rampart beside it)
const APRON_H = 6.45; // top of the front apron: the cornice band under the tablet (car pano)
const ARCH = { s: 0, w: 4.0, h: 4.8 }; // the passage (estimate from the photo: ~4 m wide)
const BAY_HALF_W = 3.3; // half-width of the raised central bay, between its pilasters
const LOWER_TOWER = { w: 8.6, d: 6.2, h: 3.7 }; // tower, lower storey (estimates; height from the car pano)
const UPPER_TOWER = { w: 4.0, d: 3.0, h: 2.7 }; // tower, upper storey (walls above the band; height from the car pano)
const LOWER_OVER = 0.45;
const UPPER_OVER = 0.45; // the tile skirts stand out only a little past the walls (car pano)

const COLORS = {
  body: hex('#5b5953'), // brick and stucco gone near-black with damp and lichen
  bodyUp: hex('#706e67'), // the tower's stucco is a lighter, patchier grey than the block
  stuccoIn: hex('#8f8c85'), // the tower's inner face: pale patchy stucco (inner pano)
  medal: hex('#a9a69e'), // its blind round medallions, paler still
  patchIn: hex('#7a645a'), // relaid brick showing pinkish on the inner face over the arch
  damp: hex('#3f3d38'),
  trim: hex('#77746b'), // cornices, pilasters and frames, slightly lighter where the stucco has held
  band: hex('#525c60'), // the blue-grey band between the two storeys
  archIn: hex('#7e5442'), // the passage lining: bare red brick
  dark: hex('#1c1917'),
  tile: hex('#b4653f'), // terracotta tiles
  edge: hex('#4a3a30'), // the skirts' edge reads dark in Street View (2026); the 2008 photo shows it yellow
  crest: hex('#8f8c84'),
  tablet: hex('#9a958a'),
  field: hex('#2c2a27'),
  char: hex('#b9b1a0'),
  road: hex('#55534f'),
};

function placeBox(S, s, t, y0, y1, sizeS, sizeT, color, opts?) {
  const pos = toWorld(s, t);
  S.box(pos[0], pos[1], y0, y1, sizeS, sizeT, WALL_ANGLE, color, opts);
}

function buildGateBlock(S, baseY) {
  // Below the apron's top the piers run through the whole wall band (T_INNER..T_OUTER); above it, the block is the OSM outline.
  S.kind = KIND.MASONRY;
  const radius = ARCH.w / 2;
  const lowerDepth = T_OUTER - T_INNER;
  const lowerCenterT = (T_INNER + T_OUTER) / 2;
  for (const sign of [-1, 1]) {
    const innerEdge = radius;
    const outerEdge = BLOCK_LEN / 2;
    placeBox(S, sign * (innerEdge + outerEdge) / 2, lowerCenterT, baseY - 0.5, baseY + APRON_H, outerEdge - innerEdge, lowerDepth, COLORS.body, { top: COLORS.body });
    placeBox(S, sign * (innerEdge + outerEdge) / 2, lowerCenterT, baseY - 0.5, baseY + 0.7, outerEdge - innerEdge + 0.12, lowerDepth + 0.12, COLORS.damp, { top: COLORS.damp }); // damp band at the foot
  }
  buildArchPassage(S, ARCH, baseY, baseY + APRON_H, T_INNER, T_OUTER);
  placeBox(S, 0, T_CENTER, baseY + APRON_H, baseY + BLOCK_H, BLOCK_LEN, BLOCK_DEPTH, COLORS.body, { top: COLORS.body });
  // the apron's top: a cornice ledge along the outer face, under the tablet
  placeBox(S, 0, (T_UPPER + T_OUTER) / 2 + 0.06, baseY + APRON_H, baseY + APRON_H + 0.2, BLOCK_LEN + 0.3, T_OUTER - T_UPPER + 0.12, COLORS.trim, { top: shade(COLORS.trim, 0.85) });

  // the outer face: raised central bay with pilasters on the apron, the cornice band, the name tablet on the face above
  S.kind = KIND.PLAIN;
  const upperFaceY = baseY + APRON_H + 0.2; // foot of the upper face
  for (const sign of [-1, 1]) {
    placeBox(S, sign * (BAY_HALF_W + 0.35), T_OUTER + 0.1, baseY + 0.7, baseY + APRON_H - 0.35, 0.7, 0.2, COLORS.trim); // pilasters framing the bay
    placeBox(S, sign * (BLOCK_LEN / 2 - 0.35), T_OUTER + 0.06, baseY + 0.7, baseY + APRON_H, 0.7, 0.12, shade(COLORS.trim, 0.92)); // corner pilasters
    placeBox(S, sign * (BAY_HALF_W + radius) / 2 + sign * 0.15, T_OUTER + 0.04, baseY + 0.7, baseY + APRON_H - 0.35, BAY_HALF_W - radius - 0.4, 0.08, shade(COLORS.body, 1.06)); // the bay stands proud
    placeBox(S, sign * (BAY_HALF_W + 0.35), T_UPPER + 0.1, upperFaceY, baseY + BLOCK_H - 0.1, 0.7, 0.2, COLORS.trim); // the bay's pilasters carry on above
    placeBox(S, sign * (BLOCK_LEN / 2 - 0.35), T_UPPER + 0.06, upperFaceY, baseY + BLOCK_H - 0.1, 0.7, 0.12, shade(COLORS.trim, 0.92));
  }
  placeBox(S, 0, T_OUTER + 0.12, baseY + APRON_H - 0.35, baseY + APRON_H, 2 * BAY_HALF_W + 1.2, 0.26, COLORS.trim); // cornice band under the tablet
  placeBox(S, 0, T_UPPER + 0.08, upperFaceY, baseY + BLOCK_H - 0.1, 2 * BAY_HALF_W, 0.1, shade(COLORS.body, 1.06)); // the bay's upper panel
  // the tablet: a moulded frame, a dark field, three characters
  placeBox(S, 0, T_UPPER + 0.16, upperFaceY + 0.1, baseY + 7.95, 3.3, 0.14, COLORS.tablet);
  placeBox(S, 0, T_UPPER + 0.22, upperFaceY + 0.25, baseY + 7.8, 2.8, 0.06, COLORS.field);
  for (const k of [-1, 0, 1]) placeBox(S, k * 0.8, T_UPPER + 0.26, upperFaceY + 0.4, baseY + 7.65, 0.5, 0.04, COLORS.char);

  // the inner face is plain weathered masonry (inner pano): no bay or tablet, a few relaid patches round the arch
  const innerPatches: [number, number, number, number, any][] = [
    [3.4, 3.6, 2.6, 2.4, COLORS.patchIn],
    [-4.6, 5.2, 1.8, 1.4, shade(COLORS.body, 1.12)],
    [1.2, 6.6, 2.2, 1.0, shade(COLORS.body, 1.1)],
    [-6.8, 2.2, 1.4, 1.8, shade(COLORS.body, 1.08)],
  ];
  for (const [ps, py, pw, ph, color] of innerPatches) {
    placeBox(S, ps, T_INNER - 0.03, baseY + py, baseY + py + ph, pw, 0.04, color);
  }

  // cornice and the balustrade round the flat top
  S.kind = KIND.MASONRY;
  placeBox(S, 0, T_CENTER, baseY + BLOCK_H, baseY + BLOCK_H + 0.35, BLOCK_LEN + 0.3, BLOCK_DEPTH + 0.3, COLORS.trim, { top: shade(COLORS.trim, 0.85), topKind: KIND.ROAD });
  const deckY = baseY + BLOCK_H + 0.35;
  S.kind = KIND.PLAIN;
  for (const sign of [-1, 1]) { // a solid low wall, posts along it, a bigger post with a finial at each corner
    placeBox(S, 0, T_CENTER + sign * (BLOCK_DEPTH / 2 - 0.1), deckY, deckY + 0.55, BLOCK_LEN + 0.1, 0.3, COLORS.bodyUp, { top: COLORS.trim });
    placeBox(S, sign * (BLOCK_LEN / 2 - 0.1), T_CENTER, deckY, deckY + 0.55, 0.3, BLOCK_DEPTH - 0.3, COLORS.bodyUp, { top: COLORS.trim });
    for (let k = 1; k < 8; k++) placeBox(S, -BLOCK_LEN / 2 + (BLOCK_LEN * k) / 8, T_CENTER + sign * (BLOCK_DEPTH / 2 - 0.1), deckY, deckY + 0.8, 0.38, 0.38, COLORS.trim);
    for (let k = 1; k < 6; k++) placeBox(S, sign * (BLOCK_LEN / 2 - 0.1), T_INNER + (BLOCK_DEPTH * k) / 6, deckY, deckY + 0.8, 0.38, 0.38, COLORS.trim);
  }
  for (const signS of [-1, 1]) {
    for (const signT of [-1, 1]) {
      const s = signS * (BLOCK_LEN / 2 - 0.1);
      const t = T_CENTER + signT * (BLOCK_DEPTH / 2 - 0.1);
      const pos = toWorld(s, t);
      placeBox(S, s, t, deckY, deckY + 1.05, 0.6, 0.6, COLORS.trim);
      S.cyl(pos[0], pos[1], deckY + 1.05, deckY + 1.45, 0.22, 0.08, 6, COLORS.trim);
    }
  }
  return deckY;
}

function buildWatchTower(S, deckY) {
  // ---- the tower, lower storey ----
  S.kind = KIND.MASONRY;
  placeBox(S, 0, T_CENTER, deckY, deckY + 0.2, LOWER_TOWER.w + 0.5, LOWER_TOWER.d + 0.5, COLORS.trim, { topKind: KIND.ROAD });
  const floor1Y = deckY + 0.2;
  placeBox(S, 0, T_CENTER, floor1Y, floor1Y + LOWER_TOWER.h, LOWER_TOWER.w, LOWER_TOWER.d, COLORS.bodyUp, { top: COLORS.tile });
  S.kind = KIND.PLAIN;
  // outer face (car pano): an arch between two round oculi, dark openings in light frames
  const tOut = T_CENTER + LOWER_TOWER.d / 2;
  const tIn = T_CENTER - LOWER_TOWER.d / 2;
  drawArchPanel(S, 0, tOut, 1, true, floor1Y, 1.9, 2.5);
  for (const s of [-2.8, 2.8]) drawOculus(S, s, tOut, 1, floor1Y + 1.5, 0.6);
  // inner face (inner pano): pale patchy stucco with two large blind round medallions, no opening
  placeBox(S, 0, tIn - 0.02, floor1Y, floor1Y + LOWER_TOWER.h - 0.35, LOWER_TOWER.w - 0.8, 0.04, COLORS.stuccoIn);
  for (const s of [-2.75, 2.75]) drawOculus(S, s, tIn - 0.02, -1, floor1Y + 1.55, 0.85, shade(COLORS.stuccoIn, 0.88), COLORS.medal);
  for (const [ps, py, pw] of ([[-0.6, 0.5, 1.6], [1.0, 2.4, 1.2], [-3.6, 2.9, 0.8]] as any[])) {
    placeBox(S, ps, tIn - 0.06, floor1Y + py, floor1Y + py + 0.6, pw, 0.04, shade(COLORS.stuccoIn, 0.8));
  }
  for (const dt of [-1, 1]) {
    for (const s of [-LOWER_TOWER.w / 2 + 0.2, LOWER_TOWER.w / 2 - 0.2]) placeBox(S, s, T_CENTER + dt * (LOWER_TOWER.d / 2 + 0.04), floor1Y, floor1Y + LOWER_TOWER.h, 0.4, 0.1, COLORS.trim);
  }
  for (const [ps, py] of ([[-3.3, 2.2], [3.1, 0.4], [-1.2, 2.9]] as any[])) {
    placeBox(S, ps, tOut + 0.02, floor1Y + py, floor1Y + py + 0.7, 1.1, 0.04, shade(COLORS.bodyUp, 1.1));
  }
  for (const sign of [-1, 1]) drawArchPanel(S, (sign * LOWER_TOWER.w) / 2, T_CENTER, sign, false, floor1Y, 1.3, 1.8);
  placeBox(S, 0, T_CENTER, floor1Y + LOWER_TOWER.h - 0.35, floor1Y + LOWER_TOWER.h, LOWER_TOWER.w + 0.12, LOWER_TOWER.d + 0.12, COLORS.trim); // frieze under the eave
  const roof1Y = floor1Y + LOWER_TOWER.h;
  S.kind = KIND.TILE;
  const center = toWorld(0, T_CENTER);
  // short, almost straight skirts (both panos): no flare, so no lifted corners or horns; a dark edge, a small finial at each corner
  S.hip(center[0], center[1], LOWER_TOWER.w, LOWER_TOWER.d, WALL_ANGLE, roof1Y, 0.8, COLORS.tile, { over: LOWER_OVER, fascia: 0.18, fasciaCol: COLORS.edge });
  drawCornerFinials(S, LOWER_TOWER, LOWER_OVER, roof1Y);

  // ---- the band and the upper storey, under its own tiled roof with the ridge beasts ----
  S.kind = KIND.MASONRY;
  placeBox(S, 0, T_CENTER, roof1Y + 0.1, roof1Y + 1.0, UPPER_TOWER.w + 1.0, UPPER_TOWER.d + 0.8, COLORS.band, { top: COLORS.trim });
  for (const signS of [-1, 1]) {
    for (const signT of [-1, 1]) { // corner posts with finials on the band
      const s = signS * (UPPER_TOWER.w / 2 + 0.5);
      const t = T_CENTER + signT * (UPPER_TOWER.d / 2 + 0.4);
      const pos = toWorld(s, t);
      placeBox(S, s, t, roof1Y + 0.1, roof1Y + 1.2, 0.32, 0.32, COLORS.trim);
      S.cyl(pos[0], pos[1], roof1Y + 1.2, roof1Y + 1.45, 0.13, 0.05, 5, COLORS.trim);
    }
  }
  // a low balustrade of pale posts along the band's edge, as in the pano
  S.kind = KIND.PLAIN;
  const balHalfW = (UPPER_TOWER.w + 1.0) / 2 - 0.12;
  for (const sign of [-1, 1]) {
    for (let k = 0; k <= 8; k++) placeBox(S, -balHalfW + (2 * balHalfW * k) / 8, T_CENTER + sign * ((UPPER_TOWER.d + 0.8) / 2 - 0.12), roof1Y + 1.0, roof1Y + 1.4, 0.16, 0.16, COLORS.char);
    for (let k = 1; k < 6; k++) placeBox(S, sign * balHalfW, T_CENTER - (UPPER_TOWER.d + 0.8) / 2 + 0.12 + ((UPPER_TOWER.d + 0.8 - 0.24) * k) / 6, roof1Y + 1.0, roof1Y + 1.4, 0.16, 0.16, COLORS.char);
    placeBox(S, 0, T_CENTER + sign * ((UPPER_TOWER.d + 0.8) / 2 - 0.12), roof1Y + 1.4, roof1Y + 1.5, 2 * balHalfW + 0.2, 0.22, COLORS.trim);
  }
  S.kind = KIND.MASONRY;
  const floor2Y = roof1Y + 1.0;
  placeBox(S, 0, T_CENTER, floor2Y, floor2Y + UPPER_TOWER.h, UPPER_TOWER.w, UPPER_TOWER.d, COLORS.bodyUp, { top: COLORS.tile });
  S.kind = KIND.PLAIN;
  for (const dt of [-1, 1]) drawArchPanel(S, 0, T_CENTER + (dt * UPPER_TOWER.d) / 2, dt, true, floor2Y + 0.1, 1.25, 1.55);
  for (const sign of [-1, 1]) drawArchPanel(S, (sign * UPPER_TOWER.w) / 2, T_CENTER, sign, false, floor2Y + 0.2, 0.8, 1.2);
  placeBox(S, 0, T_CENTER, floor2Y + UPPER_TOWER.h - 0.28, floor2Y + UPPER_TOWER.h, UPPER_TOWER.w + 0.1, UPPER_TOWER.d + 0.1, COLORS.trim);
  const roof2Y = floor2Y + UPPER_TOWER.h;
  const roof2H = 0.8;
  S.kind = KIND.TILE;
  S.hip(center[0], center[1], UPPER_TOWER.w, UPPER_TOWER.d, WALL_ANGLE, roof2Y, roof2H, COLORS.tile, { over: UPPER_OVER, fascia: 0.18, fasciaCol: COLORS.edge, ridgeCol: COLORS.crest });
  drawCornerFinials(S, UPPER_TOWER, UPPER_OVER, roof2Y);
  // on the short ridge: a beast at each end and a gourd between
  const ridgeHalfLen = Math.max(0.3, (UPPER_TOWER.w + 2 * UPPER_OVER) / 2 - ((UPPER_TOWER.d + 2 * UPPER_OVER) / 2) * 0.92);
  const ridgeTopY = roof2Y + roof2H;
  S.kind = KIND.PLAIN;
  for (const sign of [-1, 1]) {
    S.beam(vertex(sign * ridgeHalfLen, T_CENTER, ridgeTopY), vertex(sign * (ridgeHalfLen + 0.1), T_CENTER, ridgeTopY + 0.4), 0.18, 0.22, COLORS.crest);
    S.beam(vertex(sign * (ridgeHalfLen + 0.1), T_CENTER, ridgeTopY + 0.4), vertex(sign * (ridgeHalfLen - 0.25), T_CENTER, ridgeTopY + 0.52), 0.14, 0.18, COLORS.crest);
  }
  S.cyl(center[0], center[1], ridgeTopY, ridgeTopY + 0.25, 0.16, 0.2, 6, COLORS.crest);
  S.cyl(center[0], center[1], ridgeTopY + 0.25, ridgeTopY + 0.5, 0.2, 0.06, 6, COLORS.crest);
}

export function build({ S }) {
  const baseY = LAND_Y;
  const savedKind = S.kind;
  const pavedStart = S.n;

  const deckY = buildGateBlock(S, baseY);
  buildWatchTower(S, deckY);

  (S.paved = S.paved || []).push([pavedStart, S.n]); // the gate's top and the ground under it keep trees and houses off
  S.kind = savedKind;
}

// An arched passage through the block from t0 to t1: the mass over the crown, the spandrels on both faces, a vault and
// reveals of bare brick, the road floor, and a stucco surround on each mouth.
function buildArchPassage(S, archSpec, y0, y1, t0, t1) {
  const radius = archSpec.w / 2;
  const floorY = y0;
  const crownY = y0 + archSpec.h;
  const springY = crownY - radius;
  const segs = 8;
  const depth = t1 - t0;
  const centerT = (t0 + t1) / 2;
  S.kind = KIND.MASONRY;
  placeBox(S, archSpec.s, centerT, crownY, y1, archSpec.w + 0.02, depth, COLORS.body, { top: COLORS.body });
  const arcPt = (k) => {
    const theta = Math.PI - (Math.PI * k) / segs;
    return [archSpec.s + radius * Math.cos(theta), springY + radius * Math.sin(theta)];
  };
  for (const [t, dt] of ([[t0, -1], [t1, 1]] as any[])) {
    for (let k = 0; k < segs; k++) {
      const [sa, ya] = arcPt(k);
      const [sb, yb] = arcPt(k + 1);
      S.quad(vertex(sa, t, ya), vertex(sb, t, yb), vertex(sb, t, crownY), vertex(sa, t, crownY), COLORS.body, normal(0, dt));
    }
  }
  S.kind = KIND.PLAIN;
  for (let k = 0; k < segs; k++) {
    const [sa, ya] = arcPt(k);
    const [sb, yb] = arcPt(k + 1);
    S.quad(vertex(sa, t0 + 0.01, ya), vertex(sb, t0 + 0.01, yb), vertex(sb, t1 - 0.01, yb), vertex(sa, t1 - 0.01, ya), shade(COLORS.archIn, 0.55), normal(archSpec.s - (sa + sb) / 2, 0, springY - (ya + yb) / 2));
  }
  for (const sign of [-1, 1]) {
    const s = archSpec.s + sign * (radius - 0.02);
    S.quad(vertex(s, t0 + 0.01, floorY), vertex(s, t1 - 0.01, floorY), vertex(s, t1 - 0.01, springY), vertex(s, t0 + 0.01, springY), COLORS.archIn, normal(-sign, 0));
    S.quad(vertex(s, t0 + 0.01, floorY), vertex(s, t1 - 0.01, floorY), vertex(s, t1 - 0.01, floorY + 0.6), vertex(s, t0 + 0.01, floorY + 0.6), COLORS.damp, normal(-sign, 0, 0.01));
  }
  S.kind = KIND.ROAD;
  S.quad(vertex(archSpec.s - radius, t0 - 0.3, floorY + 0.02), vertex(archSpec.s + radius, t0 - 0.3, floorY + 0.02), vertex(archSpec.s + radius, t1 + 0.3, floorY + 0.02), vertex(archSpec.s - radius, t1 + 0.3, floorY + 0.02), COLORS.road, [0, 1, 0]);
  S.kind = KIND.PLAIN;
  for (const [t, dt] of ([[t0, -1], [t1, 1]] as any[])) {
    const faceT = t + dt * 0.07;
    for (const sign of [-1, 1]) {
      const jambPos = toWorld(archSpec.s + sign * (radius + 0.2), faceT);
      S.box(jambPos[0], jambPos[1], floorY, springY, 0.4, 0.14, WALL_ANGLE, COLORS.trim);
    }
    for (let k = 0; k < segs; k++) {
      const th0 = Math.PI - (Math.PI * k) / segs;
      const th1 = Math.PI - (Math.PI * (k + 1)) / segs;
      const ringR = radius + 0.2;
      S.beam(vertex(archSpec.s + ringR * Math.cos(th0), faceT, springY + ringR * Math.sin(th0)), vertex(archSpec.s + ringR * Math.cos(th1), faceT, springY + ringR * Math.sin(th1)), 0.14, 0.4, COLORS.trim);
    }
  }
}

// A dark arched opening drawn flat on a face, inside a light frame. along: the face is at constant t (the opening is
// centred at s); otherwise at constant s.
function drawArchPanel(S, s, t, sign, along, y0, width, height) {
  const radius = width / 2;
  const springY = y0 + height - radius;
  const segs = 7;
  const pointAt = (u, y, depth) => (along ? vertex(s + u, t + sign * depth, y) : vertex(s + sign * depth, t + u, y));
  const faceNorm = along ? normal(0, sign) : normal(sign, 0);
  for (const [ringR, depth, color] of ([[radius + 0.16, 0.03, COLORS.trim], [radius, 0.05, COLORS.dark]] as any[])) {
    S.quad(pointAt(-ringR, y0, depth), pointAt(ringR, y0, depth), pointAt(ringR, springY, depth), pointAt(-ringR, springY, depth), color, faceNorm);
    for (let k = 0; k < segs; k++) {
      const a0 = Math.PI - (Math.PI * k) / segs;
      const a1 = Math.PI - (Math.PI * (k + 1)) / segs;
      S.tri(pointAt(0, springY, depth), pointAt(ringR * Math.cos(a0), springY + ringR * Math.sin(a0), depth), pointAt(ringR * Math.cos(a1), springY + ringR * Math.sin(a1), depth), color, faceNorm);
    }
  }
}

// A small finial standing on each eave corner of a tile skirt over walls w × d.
function drawCornerFinials(S, boxSpec, overhang, y) {
  for (const signS of [-1, 1]) {
    for (const signT of [-1, 1]) {
      const pos = toWorld(signS * (boxSpec.w / 2 + overhang - 0.08), T_CENTER + signT * (boxSpec.d / 2 + overhang - 0.08));
      S.cyl(pos[0], pos[1], y - 0.05, y + 0.22, 0.09, 0.07, 5, COLORS.crest);
      S.cyl(pos[0], pos[1], y + 0.22, y + 0.42, 0.11, 0.02, 5, COLORS.crest);
    }
  }
}

// A round disc drawn flat on a long face (constant t), centred at s and height centerY, inside a ring: by default a dark
// opening in a light frame.
function drawOculus(S, s, t, sign, centerY, radius, ringColor = COLORS.trim, fillColor = COLORS.dark) {
  const segs = 14;
  const faceNorm = normal(0, sign);
  for (const [ringR, depth, color] of ([[radius + 0.16, 0.03, ringColor], [radius, 0.05, fillColor]] as any[])) {
    for (let k = 0; k < segs; k++) {
      const a0 = -(2 * Math.PI * k) / segs;
      const a1 = -(2 * Math.PI * (k + 1)) / segs; // same winding as drawArchPanel
      S.tri(vertex(s, t + sign * depth, centerY), vertex(s + ringR * Math.cos(a0), t + sign * depth, centerY + ringR * Math.sin(a0)), vertex(s + ringR * Math.cos(a1), t + sign * depth, centerY + ringR * Math.sin(a1)), color, faceNorm);
    }
  }
}
