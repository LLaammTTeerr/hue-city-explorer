import { KIND, hex, shade } from '../../geo/buf.ts';
import { rectRing } from '../../geo/gates.ts';
import { LAND_Y, PAL } from '../../config.ts';

// Cửa Hiển Nhơn (顯仁門), the east gate of the Imperial City (Hoàng thành), Huế. Notes and sources:
// docs/places/hiennhon.md.
//
// Built 1804-05 under Gia Long and named Hiển Nhơn by Minh Mạng (1833), it was rebuilt in brick under Khải Định and
// clad in porcelain mosaic (khảm sành sứ). It was damaged in 1968 and restored after 1975. Today it is the visitors'
// exit from Đại Nội. It is a masonry gate: a long block pierced by three arched passages (the middle one higher),
// and on it a two-storey masonry tower with three arched openings on each long face of the lower storey, both
// storeys under yellow glazed tiles (hoàng lưu ly). Mosaic pilasters, a name plaque over the middle arch, dragons and
// a fire pearl on the top ridge.
//
// Plan: the OSM outline (way 264099611), 14.0 m along the wall × 7.9 m through it. The block is drawn 14.3 m long so
// it closes the 0.15 m that places/dainoi.js leaves between its wall ends and the gate's footprint.
// Local frame: s along the wall (the outline's long axis), t through it, + out of the Imperial City (east-south-east).
//
// Checked against Google satellite and Street View (Nov 2026, scratch only): the OSM centre and axis sit within about
// 1 m and 2° of the gate on the satellite, and its 14 m length matches, so they are kept. A Street View photosphere
// on the outer face shows the face itself: weathered grey porcelain-encrusted masonry (not cream lime-wash), arches
// ringed in blue and white bands, ochre-yellow passage reveals, red door leaves standing open inside, tall
// pedestals and framed relief panels on the piers, and the upper storey's arched openings set over the side passages.
export const id = 'hiennhon';

const ORIGIN = [-886.0, -206.3]; // centre of the OSM outline, metres in the model frame
const WALL_ANGLE = -2.21; // direction of s (the outline's long axis, along the Imperial City wall)
const AXIS_X = Math.cos(WALL_ANGLE);
const AXIS_Z = Math.sin(WALL_ANGLE);
const toWorld = (s, t): [number, number] => [ORIGIN[0] + s * AXIS_X - t * AXIS_Z, ORIGIN[1] + s * AXIS_Z + t * AXIS_X];
const vertex = (s, t, y?) => {
  const pos = toWorld(s, t);
  return [pos[0], y, pos[1]];
};
const normal = (ds, dt, dy = 0): [number, number, number] => [ds * AXIS_X - dt * AXIS_Z, dy, ds * AXIS_Z + dt * AXIS_X]; // a direction in the local frame

const BLOCK_LEN = 14.3;
const BLOCK_DEPTH = 7.9; // the block
const BLOCK_H = 4.8; // block height to the cornice (estimate, ~1 m above the 3.75 m wall)
// the three passages: middle for the emperor's party, the side two for mandarins (sizes estimated from photos)
const PASSAGES = [{ s: 0, w: 3.0, h: 4.0 }, { s: -4.4, w: 2.0, h: 3.1 }, { s: 4.4, w: 2.0, h: 3.1 }];
// The tower's lower storey runs nearly the block's length, its side openings over the side passages (Street View);
// on the satellite the gate's lit top is a long narrow strip, the full 14 m long and about 5 m across.
const LOWER_TOWER = { w: 11.2, d: 4.8, h: 3.0 }; // tower, lower storey
const UPPER_TOWER = { w: 6.6, d: 2.8, h: 1.8 }; // tower, upper storey

const COLORS = {
  body: hex('#b8b6ac'), // bright porcelain-mosaic masonry (khảm sành sứ)
  plinth: hex('#888379'),
  trim: hex('#e0dcd0'),
  frame: hex('#2c66a8'), // rich cobalt ceramic band round each arch
  white: hex('#f2eee4'), // crisp porcelain white band inside it
  reveal: hex('#daa942'), // warm ochre-yellow plaster in the passages
  door: hex('#9a2c22'), // red-lacquered door leaves
  panel: hex('#3a7a68'), // turquoise-jade porcelain mosaic fields on the piers
  relief: hex('#a89f8c'), // the relief, pale on the dark field
  plaqueField: hex('#2d3b45'),
  dark: hex('#1f1a18'),
  tower: hex('#b2b0a6'),
  roof: hex('#c9943c'),
  ridge: hex('#f1d77a'),
  mosaic: [hex('#2d72b5'), hex('#3d9a72'), hex('#f2eee2'), hex('#c8452f'), hex('#e5b43c')],
  glaze: hex('#3d8f6e'), // vivid jade-green glazed openwork tiles in the balustrades
  gold: hex('#e0b64e'),
  pearl: hex('#d8573a'),
  flame: hex('#e8a23a'),
};

// every box gets its underside: the cornice, frieze, caps and bands all overhang what they stand on, and an open
// bottom let a visitor looking up see through the overhang to the tower behind (thin dark slits under the cornice)
function placeBox(S, s, t, y0, y1, sizeS, sizeT, color, opts?) {
  const pos = toWorld(s, t);
  S.box(pos[0], pos[1], y0, y1, sizeS, sizeT, WALL_ANGLE, color, { bottom: true, ...opts });
}

function drawMosaicPilaster(S, s, t, y0, y1, width, dt) {
  // dt: the face's outward sign along t (0 for an end face: then s is the face)
  const along = dt !== 0;
  const ps = along ? s : s + Math.sign(s) * 0.08;
  const pt = along ? t + dt * 0.08 : t;
  S.kind = KIND.PLAIN;
  placeBox(S, ps, pt, y0, y1, along ? width : 0.16, along ? 0.16 : width, COLORS.trim);
  placeBox(S, along ? ps : ps + Math.sign(s) * 0.05, along ? pt + dt * 0.05 : pt, y0 + 0.5, y1 - 0.45, along ? width * 0.5 : 0.08, along ? 0.08 : width * 0.5, COLORS.mosaic[Math.abs(Math.round(s * 3 + t)) % 2]);
  for (let k = 0; k < 3; k++) { // little coloured medallions up the shaft
    const yy = y0 + 0.9 + ((y1 - y0 - 1.8) * k) / 2;
    placeBox(S, along ? ps : ps + Math.sign(s) * 0.09, along ? pt + dt * 0.09 : pt, yy, yy + 0.32, along ? width * 0.36 : 0.06, along ? 0.06 : width * 0.36, COLORS.mosaic[(k + 2) % COLORS.mosaic.length]);
  }
  placeBox(S, ps, pt, y1 - 0.3, y1, along ? width + 0.2 : 0.26, along ? 0.26 : width + 0.2, shade(COLORS.trim, 0.95)); // capital
}

function buildGateBlockAndDeck(S, baseY) {
  // ---- the plinth and the block, with the three passages driven through it ----
  S.kind = KIND.MASONRY;
  placeBox(S, 0, 0, baseY - 0.5, baseY + 0.35, BLOCK_LEN + 0.3, BLOCK_DEPTH + 0.4, COLORS.plinth, { top: shade(PAL.stone, 0.9), topKind: KIND.ROAD });
  const sorted = PASSAGES.slice().sort((a, b) => a.s - b.s);
  let fromS = -BLOCK_LEN / 2;
  for (const opening of [...sorted, { s: BLOCK_LEN / 2, w: 0 }]) { // solid piers between the passages
    const toS = opening.s - opening.w / 2;
    placeBox(S, (fromS + toS) / 2, 0, baseY + 0.35, baseY + BLOCK_H, toS - fromS, BLOCK_DEPTH, COLORS.body, { top: COLORS.tower });
    fromS = opening.s + opening.w / 2;
  }
  for (const opening of PASSAGES) buildArchPassage(S, opening, baseY, baseY + BLOCK_H, BLOCK_DEPTH);

  // cornice and the balustrade round the block's flat top
  S.kind = KIND.MASONRY;
  placeBox(S, 0, 0, baseY + BLOCK_H, baseY + BLOCK_H + 0.3, BLOCK_LEN + 0.3, BLOCK_DEPTH + 0.3, COLORS.trim, { top: shade(PAL.stone, 0.95), topKind: KIND.ROAD });
  placeBox(S, 0, 0, baseY + BLOCK_H - 0.45, baseY + BLOCK_H, BLOCK_LEN + 0.12, BLOCK_DEPTH + 0.12, shade(COLORS.body, 0.92)); // frieze band
  const deckY = baseY + BLOCK_H + 0.3;
  const outerRing = rectRing(ORIGIN[0], ORIGIN[1], BLOCK_LEN + 0.1, BLOCK_DEPTH + 0.1, WALL_ANGLE);
  const innerRing = rectRing(ORIGIN[0], ORIGIN[1], BLOCK_LEN - 0.5, BLOCK_DEPTH - 0.5, WALL_ANGLE);
  S.kind = KIND.PLAIN;
  S.prism(outerRing, deckY, deckY + 0.3, COLORS.trim, COLORS.trim, { holes: [innerRing.slice().reverse()] });
  const midOuter = rectRing(ORIGIN[0], ORIGIN[1], BLOCK_LEN - 0.05, BLOCK_DEPTH - 0.05, WALL_ANGLE);
  const midInner = rectRing(ORIGIN[0], ORIGIN[1], BLOCK_LEN - 0.35, BLOCK_DEPTH - 0.35, WALL_ANGLE);
  S.prism(midOuter, deckY + 0.3, deckY + 0.68, COLORS.glaze, COLORS.glaze, { holes: [midInner.slice().reverse()] });
  S.prism(outerRing, deckY + 0.68, deckY + 0.82, COLORS.trim, COLORS.trim, { holes: [innerRing.slice().reverse()] });
  for (let k = 0; k <= 10; k++) {
    for (const sign of [-1, 1]) { // balustrade posts
      placeBox(S, -BLOCK_LEN / 2 + 0.15 + ((BLOCK_LEN - 0.3) * k) / 10, sign * (BLOCK_DEPTH / 2 - 0.15), deckY + 0.3, deckY + 0.95, 0.3, 0.3, COLORS.trim);
    }
  }
  for (let k = 1; k < 5; k++) {
    for (const sign of [-1, 1]) {
      placeBox(S, sign * (BLOCK_LEN / 2 - 0.15), -BLOCK_DEPTH / 2 + 0.15 + ((BLOCK_DEPTH - 0.3) * k) / 5, deckY + 0.3, deckY + 0.95, 0.3, 0.3, COLORS.trim);
    }
  }

  // cornice crests: a small scrolled finial over each pier on both faces and a taller one at each corner
  S.kind = KIND.PLAIN;
  for (const dt of [-1, 1]) {
    for (const s of [-6.45, -2.45, 2.45, 6.45]) {
      placeBox(S, s, dt * (BLOCK_DEPTH / 2 - 0.1), deckY + 0.82, deckY + 1.1, 0.5, 0.2, COLORS.trim);
      placeBox(S, s, dt * (BLOCK_DEPTH / 2 - 0.1), deckY + 1.1, deckY + 1.4, 0.2, 0.14, COLORS.mosaic[4]);
    }
    for (const sign of [-1, 1]) {
      placeBox(S, sign * (BLOCK_LEN / 2 - 0.2), dt * (BLOCK_DEPTH / 2 - 0.2), deckY + 0.82, deckY + 1.3, 0.34, 0.34, COLORS.trim);
      placeBox(S, sign * (BLOCK_LEN / 2 - 0.2), dt * (BLOCK_DEPTH / 2 - 0.2), deckY + 1.3, deckY + 1.75, 0.2, 0.2, COLORS.glaze);
    }
  }
  return deckY;
}

function buildPiersAndPlaque(S, baseY) {
  // the piers on both faces: a tall pedestal with a blue mosaic panel, and above it a framed relief panel
  const drawPier = (s, dt, width) => {
    const faceT = (dt * BLOCK_DEPTH) / 2;
    S.kind = KIND.PLAIN;
    placeBox(S, s, faceT + dt * 0.18, baseY + 0.35, baseY + 1.65, width + 0.3, 0.36, COLORS.trim);
    placeBox(S, s, faceT + dt * 0.37, baseY + 0.35, baseY + 0.6, width + 0.36, 0.06, shade(COLORS.trim, 0.85)); // Greek-key base band
    placeBox(S, s, faceT + dt * 0.37, baseY + 0.85, baseY + 1.35, width * 0.7, 0.04, COLORS.mosaic[0]);
    placeBox(S, s, faceT + dt * 0.18, baseY + 1.65, baseY + 1.85, width + 0.36, 0.4, shade(COLORS.trim, 0.95));
    placeBox(S, s, faceT + dt * 0.07, baseY + 1.85, baseY + BLOCK_H - 0.55, width, 0.14, COLORS.trim);
    placeBox(S, s, faceT + dt * 0.15, baseY + 2.0, baseY + BLOCK_H - 0.7, width - 0.3, 0.04, COLORS.panel);
    placeBox(S, s, faceT + dt * 0.17, baseY + 2.5, baseY + BLOCK_H - 1.2, (width - 0.3) * 0.5, 0.03, COLORS.relief); // the relief, pale on the dark field
  };
  for (const dt of [-1, 1]) {
    for (const [s, width] of ([[-6.45, 0.95], [-2.45, 0.95], [2.45, 0.95], [6.45, 0.95]] as any[])) drawPier(s, dt, width);
  }
  for (const sign of [-1, 1]) {
    for (const t of [-2.9, 2.9]) drawMosaicPilaster(S, (sign * BLOCK_LEN) / 2, t, baseY + 0.35, baseY + BLOCK_H, 0.7, 0);
  }

  // ---- name plaque over the middle passage, both faces: dark field, three gilt characters ----
  S.kind = KIND.PLAIN;
  for (const dt of [-1, 1]) {
    const faceT = (dt * BLOCK_DEPTH) / 2;
    placeBox(S, 0, faceT + dt * 0.08, baseY + 4.12, baseY + 4.72, 2.3, 0.14, COLORS.trim);
    placeBox(S, 0, faceT + dt * 0.14, baseY + 4.2, baseY + 4.64, 2.0, 0.06, COLORS.plaqueField);
    for (const k of [-1, 0, 1]) placeBox(S, k * 0.6, faceT + dt * 0.18, baseY + 4.27, baseY + 4.57, 0.32, 0.04, COLORS.gold);
  }
}

function buildTower(S, deckY) {
  // ---- the tower, lower storey: masonry hall, three arches on each long face, one on each end ----
  S.kind = KIND.MASONRY;
  placeBox(S, 0, 0, deckY, deckY + 0.3, LOWER_TOWER.w + 0.6, LOWER_TOWER.d + 0.6, shade(PAL.stone, 0.92), { topKind: KIND.ROAD }); // its plinth
  const floor1Y = deckY + 0.3;
  placeBox(S, 0, 0, floor1Y, floor1Y + LOWER_TOWER.h, LOWER_TOWER.w, LOWER_TOWER.d, COLORS.tower, { top: shade(COLORS.roof, 0.8) });
  S.kind = KIND.PLAIN;
  for (const dt of [-1, 1]) {
    for (const [s, width, height] of ([[0, 1.6, 2.3], [-4.4, 1.2, 1.95], [4.4, 1.2, 1.95]] as any[])) {
      drawArchPanel(S, s, (dt * LOWER_TOWER.d) / 2, dt, true, floor1Y, width, height);
    }
    for (const s of [-5.25, -2.3, 2.3, 5.25]) drawMosaicPilaster(S, s, (dt * LOWER_TOWER.d) / 2, floor1Y, floor1Y + LOWER_TOWER.h, 0.4, dt);
  }
  for (const sign of [-1, 1]) drawArchPanel(S, (sign * LOWER_TOWER.w) / 2, 0, sign, false, floor1Y, 1.1, 1.9);
  // a band of mosaic under the eave
  placeBox(S, 0, 0, floor1Y + LOWER_TOWER.h - 0.4, floor1Y + LOWER_TOWER.h - 0.1, LOWER_TOWER.w + 0.1, LOWER_TOWER.d + 0.1, COLORS.mosaic[0]);
  const roof1Y = floor1Y + LOWER_TOWER.h;
  S.kind = KIND.TIMBER;
  S.hip(ORIGIN[0], ORIGIN[1], LOWER_TOWER.w, LOWER_TOWER.d, WALL_ANGLE, roof1Y, 1.35, COLORS.roof, { flare: 0.45, over: 1.0, fascia: 0.28, fasciaCol: shade(COLORS.roof, 0.6), ridgeCol: COLORS.ridge, hips: true, glazed: true, segs: 3 });

  // ---- the upper storey and its roof, with dragons and the fire pearl on the ridge ----
  const floor2Y = roof1Y + 0.65;
  S.kind = KIND.MASONRY;
  placeBox(S, 0, 0, roof1Y + 0.3, floor2Y + UPPER_TOWER.h, UPPER_TOWER.w, UPPER_TOWER.d, COLORS.tower, { top: shade(COLORS.roof, 0.8) });
  S.kind = KIND.PLAIN;
  for (const dt of [-1, 1]) {
    for (const [s, width, height] of ([[0, 0.9, 1.3], [-2.2, 0.7, 1.1], [2.2, 0.7, 1.1]] as any[])) {
      drawArchPanel(S, s, (dt * UPPER_TOWER.d) / 2, dt, true, floor2Y + 0.15, width, height);
    }
    for (const s of [-3.15, 3.15]) drawMosaicPilaster(S, s, (dt * UPPER_TOWER.d) / 2, floor2Y - 0.3, floor2Y + UPPER_TOWER.h, 0.3, dt);
  }
  placeBox(S, 0, 0, floor2Y + UPPER_TOWER.h - 0.3, floor2Y + UPPER_TOWER.h - 0.05, UPPER_TOWER.w + 0.08, UPPER_TOWER.d + 0.08, COLORS.mosaic[1]);
  const roof2Y = floor2Y + UPPER_TOWER.h;
  const roof2H = 1.75;
  S.kind = KIND.TIMBER;
  S.hip(ORIGIN[0], ORIGIN[1], UPPER_TOWER.w, UPPER_TOWER.d, WALL_ANGLE, roof2Y, roof2H, COLORS.roof, { flare: 0.45, over: 0.95, fascia: 0.26, fasciaCol: shade(COLORS.roof, 0.6), ridgeCol: COLORS.ridge, hips: true, glazed: true, segs: 3 });
  // ridge ornament: the ridge runs ±ridgeHalfLen along s; "lưỡng long chầu nhật" (two dragons facing a fire pearl)
  const ridgeHalfLen = Math.max(0, (UPPER_TOWER.w + 1.9) / 2 - ((UPPER_TOWER.d + 1.9) / 2) * 0.92);
  const ridgeTopY = roof2Y + roof2H + 0.25;
  S.kind = KIND.PLAIN;
  for (const sign of [-1, 1]) { // each dragon a short sinuous chain of green-glazed segments, head toward the middle
    const pts = [[ridgeHalfLen * 0.95, 0.05], [ridgeHalfLen * 0.75, 0.45], [ridgeHalfLen * 0.55, 0.15], [ridgeHalfLen * 0.35, 0.55], [ridgeHalfLen * 0.18, 0.35]];
    for (let k = 0; k + 1 < pts.length; k++) {
      const p0 = vertex(sign * pts[k][0], 0, ridgeTopY + pts[k][1]);
      const p1 = vertex(sign * pts[k + 1][0], 0, ridgeTopY + pts[k + 1][1]);
      S.beam(p0, p1, 0.2, 0.2, k === pts.length - 2 ? COLORS.mosaic[4] : COLORS.glaze);
    }
    const tail = vertex(sign * ridgeHalfLen * 0.95, 0, ridgeTopY + 0.05);
    const tip = vertex(sign * (ridgeHalfLen * 0.95 + 0.25), 0, ridgeTopY + 0.55);
    S.beam(tail, tip, 0.12, 0.12, COLORS.glaze);
  }
  const center = toWorld(0, 0);
  S.cyl(center[0], center[1], ridgeTopY - 0.1, ridgeTopY + 0.25, 0.12, 0.2, 6, COLORS.mosaic[4], { cap: false });
  S.cyl(center[0], center[1], ridgeTopY + 0.25, ridgeTopY + 0.6, 0.22, 0.2, 8, COLORS.pearl); // the pearl
  S.cyl(center[0], center[1], ridgeTopY + 0.6, ridgeTopY + 1.05, 0.14, 0.02, 5, COLORS.flame); // its flame
}

export function build({ S }) {
  const baseY = LAND_Y;
  const savedKind = S.kind;

  const deckY = buildGateBlockAndDeck(S, baseY);
  buildPiersAndPlaque(S, baseY);
  buildTower(S, deckY);

  S.kind = savedKind;
}

// An arched passage of opening through a block from t = -depth/2 to +depth/2: the masonry over the crown, the
// spandrels between arch and crown on both faces, a dark barrel vault and lining, a paved floor, and a proud
// stone surround on each mouth.
function buildArchPassage(S, opening, y0, y1, depth) {
  const radius = opening.w / 2;
  const floorY = y0 + 0.35;
  const crownY = y0 + opening.h;
  const springY = crownY - radius;
  const segs = 8;
  S.kind = KIND.MASONRY;
  placeBox(S, opening.s, 0, crownY, y1, opening.w + 0.02, depth, COLORS.body, { top: COLORS.tower });
  const arcPt = (k) => {
    const theta = Math.PI - (Math.PI * k) / segs;
    return [opening.s + radius * Math.cos(theta), springY + radius * Math.sin(theta)];
  };
  for (const dt of [-1, 1]) { // spandrels
    const faceT = (dt * depth) / 2;
    for (let k = 0; k < segs; k++) {
      const [sa, ya] = arcPt(k);
      const [sb, yb] = arcPt(k + 1);
      S.quad(vertex(sa, faceT, ya), vertex(sb, faceT, yb), vertex(sb, faceT, crownY), vertex(sa, faceT, crownY), COLORS.body, normal(0, dt));
    }
  }
  S.kind = KIND.PLAIN;
  const innerT = depth / 2 - 0.01; // the yellow reveal runs right out to the face, as in the photo
  for (let k = 0; k < segs; k++) { // vault
    const [sa, ya] = arcPt(k);
    const [sb, yb] = arcPt(k + 1);
    S.quad(vertex(sa, -depth / 2 + 0.01, ya), vertex(sb, -depth / 2 + 0.01, yb), vertex(sb, depth / 2 - 0.01, yb), vertex(sa, depth / 2 - 0.01, ya), shade(COLORS.reveal, 0.62), normal(opening.s - (sa + sb) / 2, 0, springY - (ya + yb) / 2));
  }
  // the doors hang about a metre in from the outer face; each leaf stands open against its reveal, as tall as the
  // vault allows there (its top follows the curve, so the leaf reaches above the springing without cutting the vault)
  const hingeT = depth / 2 - 1.0;
  const leafOff = 0.1;
  const leafThick = 0.08;
  const leafDist = radius - leafOff;
  const leafTopY = springY + Math.sqrt(Math.max(0, radius * radius - leafDist * leafDist)) - 0.04;
  for (const sign of [-1, 1]) { // yellow lining on the pier faces inside
    const s = opening.s + sign * (radius - 0.02);
    S.quad(vertex(s, -innerT, floorY), vertex(s, innerT, floorY), vertex(s, innerT, springY), vertex(s, -innerT, springY), COLORS.reveal, normal(-sign, 0));
    const leafPos = toWorld(opening.s + sign * (radius - leafOff - leafThick / 2), hingeT - radius / 2);
    S.box(leafPos[0], leafPos[1], floorY, leafTopY, leafThick, radius, WALL_ANGLE, COLORS.door, { bottom: true });
    const postPos = toWorld(opening.s + sign * (radius - 0.06), hingeT + 0.06); // the timber post of the door frame, against the reveal
    S.box(postPos[0], postPos[1], floorY, springY, 0.1, 0.12, WALL_ANGLE, shade(COLORS.door, 0.7));
  }
  S.kind = KIND.ROAD;
  S.quad(vertex(opening.s - radius, -depth / 2 - 0.2, floorY + 0.01), vertex(opening.s + radius, -depth / 2 - 0.2, floorY + 0.01), vertex(opening.s + radius, depth / 2 + 0.2, floorY + 0.01), vertex(opening.s - radius, depth / 2 + 0.2, floorY + 0.01), shade(PAL.stone, 0.7), [0, 1, 0]);
  S.kind = KIND.PLAIN;
  // the surround: jambs and an arched band standing 0.12 proud
  for (const dt of [-1, 1]) {
    const faceT = (dt * depth) / 2 + dt * 0.06;
    for (const sign of [-1, 1]) placeBox(S, opening.s + sign * (radius + 0.18), faceT, floorY, springY, 0.36, 0.12, COLORS.frame);
    for (let k = 0; k < segs; k++) {
      const th0 = Math.PI - (Math.PI * k) / segs;
      const th1 = Math.PI - (Math.PI * (k + 1)) / segs;
      const outerR = radius + 0.18;
      S.beam(vertex(opening.s + outerR * Math.cos(th0), faceT, springY + outerR * Math.sin(th0)), vertex(opening.s + outerR * Math.cos(th1), faceT, springY + outerR * Math.sin(th1)), 0.12, 0.36, COLORS.frame);
    }
    for (let k = 0; k < segs; k++) { // the white band inside the blue one
      const th0 = Math.PI - (Math.PI * k) / segs;
      const th1 = Math.PI - (Math.PI * (k + 1)) / segs;
      const innerR = radius + 0.03;
      S.beam(vertex(opening.s + innerR * Math.cos(th0), faceT + dt * 0.03, springY + innerR * Math.sin(th0)), vertex(opening.s + innerR * Math.cos(th1), faceT + dt * 0.03, springY + innerR * Math.sin(th1)), 0.1, 0.1, COLORS.white);
    }
    for (const sign of [-1, 1]) placeBox(S, opening.s + sign * (radius + 0.03), faceT + dt * 0.03, floorY, springY, 0.1, 0.1, COLORS.white);
    // keystone in mosaic
    placeBox(S, opening.s, faceT + dt * 0.04, crownY + 0.02, crownY + 0.42, 0.36, 0.12, COLORS.mosaic[3]);
  }
}

// A blind or glazed arched opening drawn flat on a face: a dark rectangle up to the spring and a half-disc above,
// inside a light frame. along: the face is at constant t (the opening is centred at s); otherwise at constant s.
function drawArchPanel(S, s, t, sign, along, y0, width, height) {
  const radius = width / 2;
  const springY = y0 + height - radius;
  const segs = 7;
  const pointAt = (u, y, depth) => (along ? vertex(s + u, t + sign * depth, y) : vertex(s + sign * depth, t + u, y));
  const faceNorm = along ? normal(0, sign) : normal(sign, 0);
  for (const [ringR, depth, color] of ([[radius + 0.15, 0.03, COLORS.frame], [radius, 0.05, COLORS.dark]] as any[])) {
    S.quad(pointAt(-ringR, y0, depth), pointAt(ringR, y0, depth), pointAt(ringR, springY, depth), pointAt(-ringR, springY, depth), color, faceNorm);
    for (let k = 0; k < segs; k++) {
      const a0 = Math.PI - (Math.PI * k) / segs;
      const a1 = Math.PI - (Math.PI * (k + 1)) / segs;
      S.tri(pointAt(0, springY, depth), pointAt(ringR * Math.cos(a0), springY + ringR * Math.sin(a0), depth), pointAt(ringR * Math.cos(a1), springY + ringR * Math.sin(a1), depth), color, faceNorm);
    }
  }
}
