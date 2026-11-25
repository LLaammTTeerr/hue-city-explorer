import { KIND, hex, shade, mix } from '../../geo/buf.ts';
import { rectRing } from '../../geo/gates.ts';
import { LAND_Y, PAL } from '../../config.ts';

// Cửa Hữu (右門), the Tây Nam (south-west) gate of the Huế Citadel (Kinh thành). Notes and sources:
// docs/places/gate-cua-huu.md.
//
// The gate's arch was built in 1809 with the other Kinh thành gates; its watch tower (vọng lâu) in 1829. It stands on
// the citadel's west front near the south-west corner, on the axis of Yết Kiêu street, and cầu Cửa Hữu crosses the moat
// in front of it (drawn by city.js as a generic road bridge, with its parapets). As it stands (photo, Commons
// "Cửa Hữu.jpg", 2018): a bare red-brick block a little higher than the rampart, its ends stepped out as pilasters with
// cap blocks, one round-headed passage with a deep brick arch ring inside a framed panel, a stone moulding sitting on the ring
// and above it the grey stone name tablet (西南門); a cornice and a grey rendered balustrade with posts round its flat
// top. On it a masonry tower of two storeys, lime-rendered and weathered grey-ochre: the lower one with three arched
// openings on the long faces (the middle one larger) under a short skirt of terracotta tiles with up-turned corners,
// a balustraded terrace, and the small upper storey with one arched opening under a low tiled hip roof with ridge
// ornaments. The text source gives each gate "3 tầng, cao chừng 16m" (nghiencuulichsu); the car Street View panos
// measure this one lower, and the model follows them: block 6.9 m, ridge about 14 m above the ground (see the notes).
// The outer face is two-stepped (a wider arch in a shallow recess before the passage); the inner face has the
// lime-rendered band and raised panel above the moulding, and a projecting pier with a stepped stone cap on its
// south-east side.
//
// Plan: the OSM outline (way 367959068) is 19.7 m along the wall; through the wall the block is drawn from just
// inside the rampart's inner notch (t -7.35) to 0.4 m beyond its outer face in data.wall (t +9.4), so the passage
// runs the whole thickness and the slot kinhthanh.js cuts is closed at both ends. Local frame: s along the wall, t
// through it, + out towards the moat (west-south-west).
export const id = 'gate:Cửa Hữu';

const WALL_ANGLE = Math.atan2(0.80662, 0.59107); // direction of s (along the rampart); t = (-sin A, cos A) points out of the city
const AXIS_X = Math.cos(WALL_ANGLE);
const AXIS_Z = Math.sin(WALL_ANGLE);
// The gate's centre: the OSM outline's (data.gates, x -2235.1 z 293.3) moved 0.8 m along the wall to the north-west.
// On Google's satellite the moat bridge and Yết Kiêu meet the face about 1.8 m north-west of the outline's centre,
// and the car Street View panos on the bridge and in Yết Kiêu put the passage 1-2 m that way too; the model's own
// road runs about 1 m north-west of the outline's centre. 0.8 m is as far as the move can go with the 3.8 m passage
// still inside the 5.6 m slot city.js cuts at the outline's centre. The outline's outer face (t +7.1) matches the
// satellite; the block runs on to t +9.4 only because the rampart in data.wall stands 1.8 m proud of the real one.
const SHIFT = -0.8;
const ORIGIN = [-2235.1 + SHIFT * AXIS_X, 293.3 + SHIFT * AXIS_Z];
const toWorld = (s, t): [number, number] => [ORIGIN[0] + s * AXIS_X - t * AXIS_Z, ORIGIN[1] + s * AXIS_Z + t * AXIS_X];
const vertex = (s, t, y?) => {
  const pos = toWorld(s, t);
  return [pos[0], y, pos[1]];
};
const normal = (ds, dt, dy = 0): [number, number, number] => [ds * AXIS_X - dt * AXIS_Z, dy, ds * AXIS_Z + dt * AXIS_X];

const BLOCK_LEN = 19.8; // block length along the wall (OSM 19.7)
// Through the wall: from 0.25 m inside the notch the rampart band leaves for the gate on the city side (t -7.1, the
// OSM outline's inner face) to 0.4 m beyond the band's outer face (t +9.0; the real face is at +7.1, see above).
const T_INNER = -7.35;
const T_OUTER = 9.4;
const T_CENTER = (T_INNER + T_OUTER) / 2;
const BLOCK_DEPTH = T_OUTER - T_INNER;
const BLOCK_H = 6.9; // block to the cornice (car Street View from Tôn Thất Thiệp: the inner face's top ~1.4 × the arch crown)
const ARCH = { w: 3.8, h: 4.8 }; // the passage (Street View from the bridge, scaled by the riders in it)
const ARCH_RING = 0.6; // the passage's brick ring, radially
// The outer face is two-stepped (bridge pano): a wider, higher arch in a shallow recess, and the passage behind it.
// The recess can only be as deep as the block stands proud of the rampart band (0.4 m) without opening onto it.
const OUTER_ARCH = { w: 4.8, h: 5.1, d: 0.4, ring: 0.5 };
const T_RECESS = T_OUTER - OUTER_ARCH.d;
const INNER_MOULDING_Y = ARCH.h + ARCH_RING; // the inner face's moulding foot
const OUTER_MOULDING_Y = OUTER_ARCH.h + OUTER_ARCH.ring; // the outer face's moulding foot
// The tower as the car panos and the satellite measure it (see the notes): smaller than scaling the Commons photo by
// the block's length gave (9.0 m wide, 16 m high).
const LOWER_TOWER = { w: 7.0, d: 5.6, h: 3.0 }; // tower, lower storey
const UPPER_TOWER = { w: 3.6, d: 2.8, h: 2.0 }; // tower, upper storey
// The tower's centre in the block frame: over the passage's axis in s, about the OSM outline's centre in t (the car
// panos from Tôn Thất Thiệp and Yết Kiêu put it there; see the notes for the satellite's roof offset).
const TOWER_S = 0.3;
const TOWER_T = -0.2;
const ARCH_SEGS = 24;

const COLORS = {
  brick: hex('#76625b'), // bare, weathered red-brown brick (mid tone, as it reads in shade on the Street View)
  brick2: hex('#7f665c'), // the arch rings and frame, a shade brighter
  brickDark: hex('#5e4a40'), // damp and soot streaks
  relaid: hex('#8f6f5f'), // relaid patches
  stone: hex('#9c988a'), // grey rendered mouldings and balustrade
  render: hex('#a19e8b'), // lime render, weathered grey-ochre
  topCap: hex('#6b6a5e'), // the flat top, dark and weathered from above
  moss: hex('#7e7c68'),
  dark: hex('#211c19'),
  tile: hex('#b0603d'), // terracotta tiles
  tileDark: hex('#7d4a33'),
  tabletFrame: hex('#8f8b7f'),
  tabletFace: hex('#a8a496'),
  tabletInk: hex('#3a3430'),
  ridge: hex('#c99060'),
  ornament: hex('#d8d2c0'),
  lightningRod: hex('#4a4a48'),
};

function placeBox(S, s, t, y0, y1, sizeS, sizeT, color, opts?) {
  const pos = toWorld(s, t);
  S.box(pos[0], pos[1], y0, y1, sizeS, sizeT, WALL_ANGLE, color, opts);
}

function placeBoxRange(S, s0, s1, t0, t1, y0, y1, color, opts?) {
  placeBox(S, (s0 + s1) / 2, (t0 + t1) / 2, y0, y1, s1 - s0, t1 - t0, color, opts);
}

function makeRing(s, t, width, depth?) {
  const pos = toWorld(s, t);
  return rectRing(pos[0], pos[1], width, depth, WALL_ANGLE);
}

const archAngle = (k) => Math.PI - (Math.PI * k) / ARCH_SEGS;

function buildPassageBlock(S, baseY) {
  // the passage, and on the outer face the wider recessed arch in front of it
  const innerRadius = ARCH.w / 2;
  const innerCrown = baseY + ARCH.h;
  const innerSpring = innerCrown - innerRadius;
  const outerRadius = OUTER_ARCH.w / 2;
  const outerCrown = baseY + OUTER_ARCH.h;
  const outerSpring = outerCrown - outerRadius;

  S.kind = KIND.MASONRY;
  for (const sign of [-1, 1]) {
    const outerEdge = sign * outerRadius;
    const blockEnd = (sign * BLOCK_LEN) / 2;
    placeBoxRange(S, Math.min(outerEdge, blockEnd), Math.max(outerEdge, blockEnd), T_INNER, T_OUTER, baseY - 0.5, baseY + BLOCK_H, COLORS.brick, { top: COLORS.topCap });
    const innerEdge = sign * innerRadius;
    placeBoxRange(S, Math.min(outerEdge, innerEdge), Math.max(outerEdge, innerEdge), T_INNER, T_RECESS, baseY - 0.5, outerCrown, COLORS.brick); // the passage's cheeks behind the recess
  }
  placeBoxRange(S, -outerRadius, outerRadius, T_INNER, T_OUTER, outerCrown, baseY + BLOCK_H, COLORS.brick, { top: COLORS.topCap });
  placeBoxRange(S, -innerRadius, innerRadius, T_INNER, T_RECESS, innerCrown, outerCrown, COLORS.brick);

  // spandrels between each arch and the course above it: the passage at the inner face and at the recess's back,
  // the recess arch at the outer face
  const drawSpandrel = (t, dt, radius, springY, topY) => {
    for (let k = 0; k < ARCH_SEGS; k++) {
      const a0 = archAngle(k);
      const a1 = archAngle(k + 1);
      S.quad(
        vertex(radius * Math.cos(a0), t, springY + radius * Math.sin(a0)),
        vertex(radius * Math.cos(a1), t, springY + radius * Math.sin(a1)),
        vertex(radius * Math.cos(a1), t, topY),
        vertex(radius * Math.cos(a0), t, topY),
        COLORS.brick,
        normal(0, dt),
      );
    }
  };
  drawSpandrel(T_INNER, -1, innerRadius, innerSpring, innerCrown);
  drawSpandrel(T_RECESS, 1, innerRadius, innerSpring, innerCrown);
  drawSpandrel(T_OUTER, 1, outerRadius, outerSpring, outerCrown);

  // vaults and jambs, dark inside
  S.kind = KIND.PLAIN;
  const drawVault = (t0, t1, radius, springY, color) => {
    for (let k = 0; k < ARCH_SEGS; k++) {
      const a0 = archAngle(k);
      const a1 = archAngle(k + 1);
      const sa = radius * Math.cos(a0);
      const sb = radius * Math.cos(a1);
      const ya = springY + radius * Math.sin(a0);
      const yb = springY + radius * Math.sin(a1);
      S.quad(vertex(sa, t0, ya), vertex(sb, t0, yb), vertex(sb, t1, yb), vertex(sa, t1, ya), color, normal(-(sa + sb) / 2, 0, springY - (ya + yb) / 2));
    }
    for (const sign of [-1, 1]) {
      const s = sign * radius;
      S.quad(vertex(s, t0, baseY), vertex(s, t1, baseY), vertex(s, t1, springY), vertex(s, t0, springY), shade(color, 0.9), normal(-sign, 0));
    }
  };
  drawVault(T_INNER + 0.01, T_RECESS + 0.01, innerRadius, innerSpring, shade(COLORS.brick, 0.4));
  S.kind = KIND.MASONRY;
  drawVault(T_RECESS, T_OUTER - 0.01, outerRadius, outerSpring, shade(COLORS.brick2, 0.85));
  S.kind = KIND.PLAIN;
  S.kind = KIND.ROAD;
  const roadColor = shade(PAL.stone, 0.62);
  S.quad(vertex(-innerRadius, T_INNER - 0.3, baseY + 0.02), vertex(innerRadius, T_INNER - 0.3, baseY + 0.02), vertex(innerRadius, T_OUTER + 0.3, baseY + 0.02), vertex(-innerRadius, T_OUTER + 0.3, baseY + 0.02), roadColor, [0, 1, 0]);
  S.quad(vertex(-outerRadius, T_RECESS, baseY + 0.025), vertex(-innerRadius, T_RECESS, baseY + 0.025), vertex(-innerRadius, T_OUTER + 0.3, baseY + 0.025), vertex(-outerRadius, T_OUTER + 0.3, baseY + 0.025), roadColor, [0, 1, 0]);
  S.quad(vertex(innerRadius, T_RECESS, baseY + 0.025), vertex(outerRadius, T_RECESS, baseY + 0.025), vertex(outerRadius, T_OUTER + 0.3, baseY + 0.025), vertex(innerRadius, T_OUTER + 0.3, baseY + 0.025), roadColor, [0, 1, 0]);
}

function buildArchRings(S, baseY) {
  // smooth brick annuli flush on the face, running down into the jambs, two courses each
  const innerRadius = ARCH.w / 2;
  const innerSpring = baseY + ARCH.h - innerRadius;
  const outerRadius = OUTER_ARCH.w / 2;
  const outerSpring = baseY + OUTER_ARCH.h - outerRadius;

  S.kind = KIND.MASONRY;
  const drawAnnulus = (t, dt, r0, r1, springY, color) => {
    const faceT = t + dt * 0.03;
    for (let k = 0; k < ARCH_SEGS; k++) {
      const a0 = archAngle(k);
      const a1 = archAngle(k + 1);
      const c0 = Math.cos(a0);
      const c1 = Math.cos(a1);
      const s0 = Math.sin(a0);
      const s1 = Math.sin(a1);
      S.quad(
        vertex(r0 * c0, faceT, springY + r0 * s0),
        vertex(r1 * c0, faceT, springY + r1 * s0),
        vertex(r1 * c1, faceT, springY + r1 * s1),
        vertex(r0 * c1, faceT, springY + r0 * s1),
        color,
        normal(0, dt),
      );
    }
    for (const sign of [-1, 1]) {
      S.quad(vertex(sign * r0, faceT, baseY - 0.2), vertex(sign * r1, faceT, baseY - 0.2), vertex(sign * r1, faceT, springY), vertex(sign * r0, faceT, springY), color, normal(0, dt));
    }
  };
  const drawRingPair = (t, dt, radius, width, springY) => {
    drawAnnulus(t, dt, radius, radius + width * 0.55, springY, COLORS.brick2);
    drawAnnulus(t, dt, radius + width * 0.55, radius + width, springY, shade(COLORS.brick2, 0.9));
    S.kind = KIND.PLAIN; // a thin shadowed lip at the intrados
    drawAnnulus(t, dt, radius, radius + 0.07, springY, shade(COLORS.brick2, 0.7));
    S.kind = KIND.MASONRY;
  };
  drawRingPair(T_INNER, -1, innerRadius, ARCH_RING, innerSpring);
  drawRingPair(T_RECESS, 1, innerRadius, 0.35, innerSpring);
  drawRingPair(T_OUTER, 1, outerRadius, OUTER_ARCH.ring, outerSpring);
}

function buildOuterFace(S, baseY) {
  // pilasters, the frame, the moulding on the ring, the name tablet
  const frameInner = OUTER_ARCH.w / 2 + OUTER_ARCH.ring + 0.4;
  for (const sign of [-1, 1]) {
    placeBox(S, sign * (BLOCK_LEN / 2 - 1.0), T_OUTER + 0.12, baseY - 0.3, baseY + BLOCK_H - 0.5, 2.0, 0.24, COLORS.brick);
    placeBox(S, sign * (BLOCK_LEN / 2 - 1.0), T_OUTER + 0.2, baseY + BLOCK_H - 0.6, baseY + BLOCK_H, 2.25, 0.4, COLORS.stone);
    placeBox(S, sign * (frameInner + 0.35), T_OUTER + 0.05, baseY - 0.2, baseY + OUTER_MOULDING_Y, 0.7, 0.1, COLORS.brick2);
  }
  placeBox(S, 0, T_OUTER + 0.12, baseY + OUTER_MOULDING_Y, baseY + OUTER_MOULDING_Y + 0.28, 2 * frameInner + 1.0, 0.24, COLORS.stone);
  const tabletY0 = baseY + OUTER_MOULDING_Y + 0.36;
  const tabletY1 = baseY + BLOCK_H - 0.08; // the tablet, between the moulding and the cornice
  placeBox(S, 0, T_OUTER + 0.1, tabletY0, tabletY1, 2.75, 0.2, COLORS.tabletFrame);
  placeBox(S, 0, T_OUTER + 0.2, tabletY0 + 0.1, tabletY1 - 0.1, 2.45, 0.06, COLORS.tabletFace);
  for (const k of [-1, 0, 1]) {
    placeBox(S, k * 0.72, T_OUTER + 0.24, tabletY0 + 0.2, tabletY1 - 0.2, 0.56, 0.04, COLORS.tabletInk);
  }
  // weathering on the bare brick: a damp foot, soot and lichen streaks from the cornice down, relaid patches
  const drawPatch = (t, dt, s0, s1, y0, y1, color) => {
    S.quad(vertex(s0, t + dt * 0.02, y0), vertex(s1, t + dt * 0.02, y0), vertex(s1, t + dt * 0.02, y1), vertex(s0, t + dt * 0.02, y1), color, normal(0, dt));
  };
  for (const sign of [-1, 1]) {
    drawPatch(T_OUTER, 1, sign * (frameInner + 0.7), (sign * BLOCK_LEN) / 2, baseY + 0.4, baseY + 1.0 + 0.2 * sign, mix(COLORS.brick, COLORS.brickDark, 0.7));
  }
  const weatherPatches: [number, number, number, any][] = [
    [-8.6, -7.6, 3.4, COLORS.brickDark],
    [-6.4, -5.3, 4.8, mix(COLORS.brickDark, COLORS.moss, 0.4)],
    [-4.9, -4.2, 2.2, COLORS.relaid],
    [4.3, 5.4, 4.2, COLORS.brickDark],
    [5.9, 6.9, 1.8, COLORS.relaid],
    [7.4, 8.1, 3.0, mix(COLORS.brickDark, COLORS.moss, 0.5)],
  ];
  for (const [s0, s1, y0, color] of weatherPatches) {
    if (color === COLORS.relaid) drawPatch(T_OUTER, 1, s0, s1, baseY + y0, baseY + y0 + 1.6, color);
    else drawPatch(T_OUTER, 1, s0, s1, baseY + y0, baseY + BLOCK_H - 0.05, color);
  }
}

function buildInnerFaceAndFootings(S, baseY) {
  // the passage ring, a frame on its north-west side, the moulding, a lime-rendered band across the
  // whole face above with a long raised panel, and the massive capped brick pier south-east of the passage
  for (const sign of [-1, 1]) {
    placeBox(S, sign * (BLOCK_LEN / 2 - 1.0), T_INNER - 0.12, baseY - 0.3, baseY + BLOCK_H - 0.5, 2.0, 0.24, COLORS.brick);
    placeBox(S, sign * (BLOCK_LEN / 2 - 1.0), T_INNER - 0.2, baseY + BLOCK_H - 0.6, baseY + BLOCK_H, 2.25, 0.4, COLORS.stone);
  }
  placeBox(S, -2.95, T_INNER - 0.05, baseY - 0.2, baseY + INNER_MOULDING_Y, 0.7, 0.1, COLORS.brick2);
  S.kind = KIND.PLAIN;
  placeBox(S, 0, T_INNER - 0.04, baseY + INNER_MOULDING_Y + 0.2, baseY + BLOCK_H, BLOCK_LEN - 0.05, 0.08, COLORS.render);
  placeBox(S, 0, T_INNER - 0.12, baseY + INNER_MOULDING_Y, baseY + INNER_MOULDING_Y + 0.28, 7.2, 0.24, COLORS.stone);
  placeBox(S, 0, T_INNER - 0.14, baseY + INNER_MOULDING_Y + 0.62, baseY + INNER_MOULDING_Y + 1.3, 8.4, 0.2, COLORS.stone); // the long raised panel
  placeBox(S, 0, T_INNER - 0.26, baseY + INNER_MOULDING_Y + 0.74, baseY + INNER_MOULDING_Y + 1.18, 7.8, 0.06, shade(COLORS.render, 0.9));
  S.kind = KIND.MASONRY;
  { // the pier: brick shaft, then a stepped grey stone cap
    const s0 = 2.75;
    const s1 = 4.55;
    const pierFront = T_INNER - 1.1;
    placeBoxRange(S, s0, s1, pierFront, T_INNER, baseY - 0.3, baseY + 4.3, COLORS.brick);
    placeBoxRange(S, s0 - 0.15, s1 + 0.15, pierFront - 0.15, T_INNER, baseY + 4.3, baseY + 4.55, COLORS.stone);
    placeBoxRange(S, s0 - 0.05, s1 + 0.05, pierFront - 0.05, T_INNER, baseY + 4.55, baseY + 5.0, shade(COLORS.stone, 0.92));
    placeBoxRange(S, s0 + 0.1, s1 - 0.1, pierFront + 0.1, T_INNER, baseY + 5.0, baseY + 5.2, COLORS.stone);
    placeBoxRange(S, s0 + 0.35, s1 - 0.35, pierFront + 0.35, T_INNER - 0.25, baseY + 5.2, baseY + 5.75, shade(COLORS.stone, 0.95), { top: shade(COLORS.stone, 1.05) });
    placeBoxRange(S, s0, s1, pierFront - 0.01, T_INNER, baseY - 0.3, baseY + 0.45, shade(COLORS.stone, 0.85)); // its footing
  }

  // a low grey stone footing course under each face, as in the bridge Street View
  S.kind = KIND.MASONRY;
  for (const [t, dt, innerHalfW] of ([[T_INNER, -1, ARCH.w / 2], [T_OUTER, 1, OUTER_ARCH.w / 2]] as any[])) {
    for (const sign of [-1, 1]) {
      const a = sign * innerHalfW;
      const b = (sign * BLOCK_LEN) / 2;
      placeBox(S, (a + b) / 2, t + dt * 0.06, baseY - 0.3, baseY + 0.45, Math.abs(b - a) + 0.1, 0.14, shade(COLORS.stone, 0.85));
    }
  }
}

function buildCorniceAndBalustrade(S, baseY) {
  S.kind = KIND.MASONRY;
  placeBox(S, 0, T_CENTER, baseY + BLOCK_H, baseY + BLOCK_H + 0.35, BLOCK_LEN + 0.35, BLOCK_DEPTH + 0.35, COLORS.stone, { top: COLORS.topCap, topKind: KIND.ROAD });
  const deckY = baseY + BLOCK_H + 0.35;
  S.kind = KIND.PLAIN;
  const outerRing = makeRing(0, T_CENTER, BLOCK_LEN + 0.1, BLOCK_DEPTH + 0.1);
  const innerRing = makeRing(0, T_CENTER, BLOCK_LEN - 0.4, BLOCK_DEPTH - 0.4);
  S.prism(outerRing, deckY, deckY + 0.25, COLORS.stone, COLORS.stone, { holes: [innerRing.slice().reverse()] }); // base course
  const midOuter = makeRing(0, T_CENTER, BLOCK_LEN - 0.05, BLOCK_DEPTH - 0.05);
  const midInner = makeRing(0, T_CENTER, BLOCK_LEN - 0.3, BLOCK_DEPTH - 0.3);
  S.prism(midOuter, deckY + 0.25, deckY + 0.62, shade(COLORS.stone, 0.72), shade(COLORS.stone, 0.72), { holes: [midInner.slice().reverse()] }); // pierced panels, shadowed
  S.prism(outerRing, deckY + 0.62, deckY + 0.8, COLORS.stone, shade(COLORS.stone, 1.08), { holes: [innerRing.slice().reverse()] }); // top rail
  const drawPost = (s, t, height = 0.95) => placeBox(S, s, t, deckY + 0.2, deckY + height, 0.34, 0.34, COLORS.stone);
  for (let k = 1; k < 8; k++) {
    for (const sign of [-1, 1]) drawPost(-BLOCK_LEN / 2 + 0.12 + ((BLOCK_LEN - 0.24) * k) / 8, T_CENTER + sign * (BLOCK_DEPTH / 2 - 0.12));
  }
  for (let k = 1; k < 7; k++) {
    for (const sign of [-1, 1]) drawPost(sign * (BLOCK_LEN / 2 - 0.12), T_CENTER - BLOCK_DEPTH / 2 + 0.12 + ((BLOCK_DEPTH - 0.24) * k) / 7);
  }
  for (const signS of [-1, 1]) {
    for (const signT of [-1, 1]) { // corner posts, taller, with a ball
      const s = signS * (BLOCK_LEN / 2 - 0.15);
      const t = T_CENTER + signT * (BLOCK_DEPTH / 2 - 0.15);
      const pos = toWorld(s, t);
      placeBox(S, s, t, deckY, deckY + 1.25, 0.5, 0.5, COLORS.stone);
      S.cyl(pos[0], pos[1], deckY + 1.25, deckY + 1.55, 0.2, 0.12, 6, COLORS.stone);
    }
  }
  return deckY;
}

function buildLowerTower(S, deckY) {
  S.kind = KIND.MASONRY;
  placeBox(S, TOWER_S, TOWER_T, deckY, deckY + 0.25, LOWER_TOWER.w + 0.4, LOWER_TOWER.d + 0.4, COLORS.moss, { top: shade(PAL.stone, 0.85), topKind: KIND.ROAD }); // plinth
  const floorY = deckY + 0.25;
  const eaveY = floorY + LOWER_TOWER.h;
  placeBox(S, TOWER_S, TOWER_T, floorY, eaveY, LOWER_TOWER.w, LOWER_TOWER.d, COLORS.render, { top: COLORS.stone });
  placeBox(S, TOWER_S, TOWER_T, floorY, floorY + 0.7, LOWER_TOWER.w + 0.02, LOWER_TOWER.d + 0.02, COLORS.moss); // damp, darkened foot
  S.kind = KIND.PLAIN;
  for (const dt of [-1, 1]) {
    for (const [offsetS, width, height] of ([[0, 1.6, 2.4], [-2.3, 1.05, 1.8], [2.3, 1.05, 1.8]] as any[])) {
      drawArchedOpening(S, TOWER_S + offsetS, TOWER_T + (dt * LOWER_TOWER.d) / 2, dt, true, floorY, width, height);
    }
  }
  for (const sign of [-1, 1]) {
    drawArchedOpening(S, TOWER_S + (sign * LOWER_TOWER.w) / 2, TOWER_T, sign, false, floorY, 1.05, 1.75);
  }
  // the cornice and the skirt of tiles with up-turned corners
  S.kind = KIND.MASONRY;
  placeBox(S, TOWER_S, TOWER_T, eaveY - 0.05, eaveY + 0.22, LOWER_TOWER.w + 0.35, LOWER_TOWER.d + 0.35, COLORS.stone);
  const skirtY = eaveY + 0.22;
  S.kind = KIND.TILE;
  S.prism(makeRing(TOWER_S, TOWER_T, LOWER_TOWER.w + 1.5, LOWER_TOWER.d + 1.5), skirtY - 0.12, skirtY + 0.42, COLORS.tile, COLORS.tile, { scaleTop: 0.86, top: false });
  S.kind = KIND.PLAIN;
  placeBox(S, TOWER_S, TOWER_T, skirtY - 0.3, skirtY - 0.12, LOWER_TOWER.w + 1.5, LOWER_TOWER.d + 1.5, COLORS.tileDark); // the eave board under the tile edge
  for (const signS of [-1, 1]) {
    for (const signT of [-1, 1]) { // corner horns
      const s = TOWER_S + signS * (LOWER_TOWER.w / 2 + 0.75);
      const t = TOWER_T + signT * (LOWER_TOWER.d / 2 + 0.75);
      const p0 = vertex(s, t, skirtY - 0.05);
      const p1 = vertex(s + signS * 0.3, t + signT * 0.3, skirtY + 0.45);
      S.beam(p0, p1, 0.22, 0.22, COLORS.tileDark);
    }
  }
  // the terrace on it, and its balustrade
  S.kind = KIND.MASONRY;
  placeBox(S, TOWER_S, TOWER_T, skirtY, skirtY + 0.42, LOWER_TOWER.w - 0.05, LOWER_TOWER.d - 0.05, COLORS.stone, { top: shade(PAL.stone, 0.85), topKind: KIND.ROAD });
  const terraceY = skirtY + 0.42;
  S.kind = KIND.PLAIN;
  const balOuter = makeRing(TOWER_S, TOWER_T, LOWER_TOWER.w - 0.2, LOWER_TOWER.d - 0.2);
  const balInner = makeRing(TOWER_S, TOWER_T, LOWER_TOWER.w - 0.5, LOWER_TOWER.d - 0.5);
  S.prism(balOuter, terraceY, terraceY + 0.5, shade(COLORS.stone, 0.95), shade(COLORS.stone, 1.05), { holes: [balInner.slice().reverse()] });
  for (const signS of [-1, 1]) {
    for (const signT of [-1, 1]) {
      placeBox(S, TOWER_S + signS * (LOWER_TOWER.w / 2 - 0.25), TOWER_T + signT * (LOWER_TOWER.d / 2 - 0.25), terraceY, terraceY + 0.8, 0.36, 0.36, COLORS.stone);
    }
  }
  for (const sign of [-1, 1]) {
    for (const s of [-1.2, 1.2]) {
      placeBox(S, TOWER_S + s, TOWER_T + sign * (LOWER_TOWER.d / 2 - 0.25), terraceY, terraceY + 0.7, 0.3, 0.3, COLORS.stone);
    }
  }
  return terraceY;
}

function buildUpperTower(S, terraceY) {
  S.kind = KIND.MASONRY;
  const upperTopY = terraceY + UPPER_TOWER.h;
  placeBox(S, TOWER_S, TOWER_T, terraceY, upperTopY, UPPER_TOWER.w, UPPER_TOWER.d, COLORS.render, { top: COLORS.stone });
  S.kind = KIND.PLAIN;
  for (const dt of [-1, 1]) {
    drawArchedOpening(S, TOWER_S, TOWER_T + (dt * UPPER_TOWER.d) / 2, dt, true, terraceY + 0.15, 1.1, 1.45);
  }
  for (const sign of [-1, 1]) {
    drawArchedOpening(S, TOWER_S + (sign * UPPER_TOWER.w) / 2, TOWER_T, sign, false, terraceY + 0.25, 0.7, 1.0);
  }
  S.kind = KIND.MASONRY;
  placeBox(S, TOWER_S, TOWER_T, upperTopY - 0.05, upperTopY + 0.2, UPPER_TOWER.w + 0.3, UPPER_TOWER.d + 0.3, COLORS.stone);
  const center = toWorld(TOWER_S, TOWER_T);
  const roofH = 0.75;
  S.hip(center[0], center[1], UPPER_TOWER.w, UPPER_TOWER.d, WALL_ANGLE, upperTopY + 0.2, roofH, COLORS.tile, { flare: 0.3, over: 0.55, fascia: 0.18, fasciaCol: COLORS.tileDark, ridgeCol: COLORS.ridge, hips: true, segs: 2 });
  // ridge ornaments: curled ends on the ridge and the four hips, a small finial and the lightning rod
  S.kind = KIND.PLAIN;
  const ridgeY = upperTopY + 0.2 + roofH;
  const ridgeHalfLen = Math.max(0, (UPPER_TOWER.w + 1.1) / 2 - ((UPPER_TOWER.d + 1.1) / 2) * 0.92);
  for (const sign of [-1, 1]) {
    placeBox(S, TOWER_S + sign * ridgeHalfLen, TOWER_T, ridgeY, ridgeY + 0.45, 0.3, 0.25, COLORS.ornament);
  }
  for (const signS of [-1, 1]) {
    for (const signT of [-1, 1]) {
      placeBox(S, TOWER_S + signS * (UPPER_TOWER.w / 2 + 0.45), TOWER_T + signT * (UPPER_TOWER.d / 2 + 0.45), upperTopY + 0.3, upperTopY + 0.62, 0.22, 0.22, COLORS.ornament);
    }
  }
  placeBox(S, TOWER_S, TOWER_T, ridgeY, ridgeY + 0.35, 0.35, 0.3, COLORS.ornament);
  placeBox(S, TOWER_S, TOWER_T, ridgeY + 0.35, ridgeY + 1.6, 0.05, 0.05, COLORS.lightningRod);
}

export function build({ S }) {
  const baseY = LAND_Y;
  const savedKind = S.kind;
  const pavedStart = S.n;

  buildPassageBlock(S, baseY);
  buildArchRings(S, baseY);
  buildOuterFace(S, baseY);
  buildInnerFaceAndFootings(S, baseY);
  const deckY = buildCorniceAndBalustrade(S, baseY);
  (S.paved = S.paved || []).push([pavedStart, S.n]);

  const terraceY = buildLowerTower(S, deckY);
  buildUpperTower(S, terraceY);

  S.kind = savedKind;
  S.base = 0;
}

// An arched opening drawn on a face: a brick ring round a dark recess (a rectangle up to the spring and a half-disc
// above). along: the face is at constant t (the opening is centred at s); otherwise at constant s.
function drawArchedOpening(S, s, t, sign, along, y0, width, height) {
  const radius = width / 2;
  const springY = y0 + height - radius;
  const segs = 7;
  const pointAt = (u, y, depth) => (along ? vertex(s + u, t + sign * depth, y) : vertex(s + sign * depth, t + u, y));
  const faceNormal = along ? normal(0, sign) : normal(sign, 0);
  for (const [ringRadius, depth, color] of ([[radius + 0.22, 0.03, COLORS.brick2], [radius, 0.05, COLORS.dark]] as any[])) {
    S.quad(pointAt(-ringRadius, y0, depth), pointAt(ringRadius, y0, depth), pointAt(ringRadius, springY, depth), pointAt(-ringRadius, springY, depth), color, faceNormal);
    for (let k = 0; k < segs; k++) {
      const a0 = Math.PI - (Math.PI * k) / segs;
      const a1 = Math.PI - (Math.PI * (k + 1)) / segs;
      S.tri(
        pointAt(0, springY, depth),
        pointAt(ringRadius * Math.cos(a0), springY + ringRadius * Math.sin(a0), depth),
        pointAt(ringRadius * Math.cos(a1), springY + ringRadius * Math.sin(a1), depth),
        color,
        faceNormal,
      );
    }
  }
}
