import { KIND, hex, shade, mix, rand } from '../../geo/buf.ts';
import { LAND_Y, WALL_H, PAL } from '../../config.ts';

// the deck over the street the ramp starts from: Street View from Tôn Thất Thiệp and Ông Ích Khiêm puts the ramp's
// head about 9.5 m over the pavement (the sourced 5.9 m is the platform over the bastion's terreplein)
const DECK_HEIGHT = 9.5;

// Quan Tượng Đài (觀象臺, "Nam Đài"), the Nguyễn observatory, built 1827 (Minh Mạng 8) on the Nam Minh bastion at the
// Citadel's south-west corner (the corner over Bạch Hổ bridge). Restored Oct 2012 - Sep 2013. Sources and estimates:
// docs/places/quantuong.md.
//
// Sourced: a solid brick platform (nền đài) faced with gạch vồ under a lime render, about 5.9 m high, reading as a
// truncated pyramid; a brick-paved deck with a railing (lan can) round it and posts at the four corners; in the middle
// the Bát Phong pavilion, octagonal, open, with 12 columns and two roof tiers (8 slopes below, 4 above) in green
// glazed tiles. The approach is from inside the Citadel: a solid stepped ramp 8.2 m wide, 51 steps of 75-80 cm,
// đá gan gà treads in the middle and brick-paved slopes either side. A stone plaque "Quan Tượng Đài" on the outward
// (south-west) face. War-time bunkers still stand on the bastion.
// Placed from OSM and aligned to the Google satellite (see RAMP_AXIS below): node 11212153237 (the platform), the footway 39414010 (the ramp, from the corner of Ông Ích Khiêm
// and Tôn Thất Thiệp into the bastion) and the bunker node 13673950594 at the bastion's tip. The bastion itself
// (rampart, walk, parapet) is the kinhthanh replica's and is not drawn here.
export const id = 'quantuong';

// the ramp's axis, from its foot at Tôn Thất Thiệp toward the bastion's tip: bearing 199° (the ramp climbs SSW; seen
// from the platform it runs NNE). The OSM footway 39414010 averaged with the bastion's bisector gave this axis and the
// Google satellite agrees to within 1°. The OSM node and footway's end put the platform ~10 m too far south: the
// satellite puts the platform's centre at x -1931.7, z 740.8 (corrected for the lean of its 6 m faces) and the ramp's
// foot at the street, x -1917.2, z 698.0. RAMP_HEAD is set from those, the whole 1.1 m further up the axis so the first
// steps stop at the mapped street's kerb instead of standing in the carriageway (check:overlap).
const RAMP_AXIS = (() => {
  const dx = -0.33;
  const dz = 0.944;
  const len = Math.hypot(dx, dz);
  return [dx / len, dz / len];
})();
const DECK_LEN_A = 14.5;
const DECK_LEN_B = 16.5; // deck along the ramp axis x across it (satellite; the deck is not square)
const RAMP_HEAD = [-1931.7 + RAMP_AXIS[0] * (1.1 - DECK_LEN_A / 2), 740.8 + RAMP_AXIS[1] * (1.1 - DECK_LEN_A / 2)]; // the head of the ramp, at the deck's inner edge
const BUNKER_POS = [-1946.9, 788.0];
const BASTION_INTERIOR = [[-1955.0, 706.0], [-1962.7, 709.7], [-1937.6, 761.4], [-1887.6, 737.1], [-1890.0, 715.0], [-1919.5, 707.5]];

const BATTER_RATIO = 0.88; // the faces lean in: deck / foot (satellite: about 1.1 m of face shows outside the deck)
const DECK_Y = LAND_Y + DECK_HEIGHT;
const STEP_COUNT = 51;
const STEP_TREAD = 0.75;
const RAMP_WIDTH = 8.2;
const MIDDLE_STEP_WIDTH = 6.4; // sourced: 51 steps, 75-80 cm, ramp 8.2 m wide; the satellite's 38 m ramp asks for the short end of the tread; Street View shows narrow sloping bands beside the steps
const FORECOURT_DEPTH = 1.2; // depth of the paved forecourt in front of the first step, as far as the street's kerb allows

const COLORS = {
  brick: hex('#4f4b44'), // gạch vồ under a worn lime render, dark grey and mossy as Street View shows it
  render: hex('#6e695f'), // patches of the 2013 lime render
  damp: hex('#35342f'),
  floor: hex('#7d6a5a'), // gạch bát, the deck's square floor bricks
  ganga: hex('#5e564d'), // đá gan gà: pitted laterite-like stone, weathered dark grey-brown
  slope: hex('#a08766'), // the side slopes and copings, pale ochre render
  rail: hex('#7b7468'),
  railTop: hex('#b0a998'),
  roof: hex('#5d6c5f'), // ngói thanh lưu ly: green glaze, weathered grey-green as Street View shows it
  ridge: hex('#bccbb3'),
  lacquer: hex('#7a7468'), // the columns read grey in Street View, not red lacquer
  stone: shade(PAL.stone, 0.9),
  concrete: hex('#8e8c84'),
  iron: hex('#26282a'),
  plaqueFace: hex('#3f4342'),
  creeperDark: hex('#3f5a2e'),
  creeperLight: hex('#5f7a3a'),
  forecourtPave: hex('#7a7268'),
  lampGlobe: hex('#e8e2cc'),
  lightningRod: hex('#3a3a38'),
  bunkerSlit: hex('#1d1d1b'),
};

function buildTerrepleinAndPlatform(S, frame, baseY, footA, footB) {
  const { center, centerAt, rampAngle } = frame;
  // ---- Nam Minh bastion terreplein: fill the hollow interior of the OSM rampart ring up to the bastion's
  // terreplein (LAND_Y + 3.6 m, so the 5.9 m observatory platform stands on solid earth rather than a sunken pit),
  // with a paved stone perimeter walkway and low brick retaining wall along the inner gorge facing Tôn Thất Thiệp ----
  const terreY = LAND_Y + 4.8;
  S.kind = KIND.MASONRY;
  S.prism(BASTION_INTERIOR, LAND_Y - 0.5, terreY, shade(COLORS.brick, 1.05), PAL.moss, { topKind: KIND.GROUND });
  // stepped stone walkways crossing the terreplein around the observatory, as seen in the satellite & photo
  S.kind = KIND.ROAD;
  for (const side of [-1, 1]) {
    const walkPos = centerAt(0, side * (DECK_LEN_B / 2 + 5.0));
    S.box(walkPos[0], walkPos[1], terreY - 0.1, terreY + 0.08, DECK_LEN_A + 14, 2.2, rampAngle, COLORS.stone, { topKind: KIND.ROAD });
  }
  const outerWalk = centerAt(DECK_LEN_A / 2 + 5.5, 0);
  S.box(outerWalk[0], outerWalk[1], terreY - 0.1, terreY + 0.08, 2.4, DECK_LEN_B + 12, rampAngle, COLORS.stone, { topKind: KIND.ROAD });
  // low stone curb/parapet flanking the bastion's outer terreplein edges (keep the gorge open at the ramp)
  S.kind = KIND.MASONRY;
  for (let i = 0; i < 4; i++) {
    const ptA = BASTION_INTERIOR[i];
    const ptB = BASTION_INTERIOR[i + 1];
    const dx = ptB[0] - ptA[0];
    const dz = ptB[1] - ptA[1];
    const len = Math.hypot(dx, dz);
    S.box((ptA[0] + ptB[0]) / 2, (ptA[1] + ptB[1]) / 2, terreY, terreY + 0.45, len, 0.5, Math.atan2(dz, dx), shade(COLORS.stone, 0.88), { top: COLORS.railTop });
  }

  // ---- the platform: a truncated pyramid of brick, a damp foot, render patches, a stone cornice under the deck ----
  S.kind = KIND.MASONRY;
  S.box(center[0], center[1], baseY, DECK_Y - 0.35, footA, footB, rampAngle, COLORS.brick, { taper: BATTER_RATIO * (1 - 0.1 / DECK_LEN_B), top: COLORS.floor });
  S.box(center[0], center[1], DECK_Y - 0.35, DECK_Y, DECK_LEN_A + 0.25, DECK_LEN_B + 0.25, rampAngle, shade(COLORS.stone, 0.85), { top: COLORS.floor, topKind: KIND.ROAD });
  // the faces as they read: dark damp foot, lighter render patches high up (thin plates just proud of the batter)
  for (let sideIdx = 0; sideIdx < 4; sideIdx++) {
    const faceAngle = rampAngle + sideIdx * Math.PI / 2;
    const outX = Math.cos(faceAngle);
    const outZ = Math.sin(faceAngle);
    const tanX = -outZ;
    const tanZ = outX;
    const footDepth = sideIdx % 2 ? footB : footA;
    const faceWidth = sideIdx % 2 ? DECK_LEN_A : DECK_LEN_B; // depth to this face; the face's own width
    const batterSlope = (footDepth - footDepth * BATTER_RATIO) / 2 / (DECK_Y - 0.35 - baseY); // horizontal in-step per metre of height
    const addFacePatch = (s0, s1, y0, y1, color) => {
      const dist0 = footDepth / 2 - batterSlope * (y0 - baseY) + 0.04;
      const dist1 = footDepth / 2 - batterSlope * (y1 - baseY) + 0.04;
      const ptAt = (along, dist, y): [number, number, number] => [center[0] + outX * dist + tanX * along, y, center[1] + outZ * dist + tanZ * along];
      S.quad(ptAt(s0, dist0, y0), ptAt(s1, dist0, y0), ptAt(s1, dist1, y1), ptAt(s0, dist1, y1), color, [outX, 0.15, outZ]);
    };
    const halfSpanAt = (y) => (faceWidth / BATTER_RATIO) / 2 - (faceWidth / BATTER_RATIO) * (1 - BATTER_RATIO) / 2 * (y - baseY) / (DECK_Y - 0.35 - baseY) - 0.3;
    addFacePatch(-halfSpanAt(LAND_Y + 0.9), halfSpanAt(LAND_Y + 0.9), baseY + 0.4, LAND_Y + 0.6 + rand(sideIdx, 1) * 0.4, COLORS.damp);
    for (let k = 0; k < 4; k++) {
      const patchCenter = (rand(sideIdx * 7 + k, 2) - 0.5) * (faceWidth - 6);
      const patchW = 2 + rand(sideIdx * 7 + k, 3) * 3.5;
      const patchY = LAND_Y + 2 + rand(sideIdx * 7 + k, 4) * (DECK_HEIGHT - 4.5);
      addFacePatch(patchCenter - patchW / 2, patchCenter + patchW / 2, patchY, Math.min(DECK_Y - 0.6, patchY + 1 + rand(sideIdx, k + 5) * 1.5), mix(COLORS.render, COLORS.brick, rand(sideIdx, k) * 0.4));
    }
  }
  // the plaque "Quan Tượng Đài" on the outward face, under the cornice
  const plaquePos = centerAt(DECK_LEN_A / 2 + 0.2, 0);
  S.box(plaquePos[0], plaquePos[1], DECK_Y - 0.8, DECK_Y - 0.4, 0.14, 2.0, rampAngle, COLORS.plaqueFace);
  S.box(plaquePos[0], plaquePos[1], DECK_Y - 0.85, DECK_Y - 0.36, 0.08, 2.24, rampAngle, COLORS.stone);
}

function buildDeckRailing(S, frame) {
  const { centerAt, rampAngle } = frame;
  // ---- the railing (lan can): a low brick balustrade with pierced panels, posts at the corners, open at the ramp ----
  S.kind = KIND.MASONRY;
  const railH = 0.85;
  const railT = 0.32;
  const edgeInset = 0.25;
  const buildRailRun = (a0, b0, a1, b1) => {
    const ptA = centerAt(a0, b0);
    const ptB = centerAt(a1, b1);
    const len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
    if (len < 0.2) return;
    const midPt = [(ptA[0] + ptB[0]) / 2, (ptA[1] + ptB[1]) / 2];
    const angle = Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]);
    S.box(midPt[0], midPt[1], DECK_Y, DECK_Y + 0.32, len, railT, angle, COLORS.rail);
    S.box(midPt[0], midPt[1], DECK_Y + 0.32, DECK_Y + railH - 0.1, len, railT * 0.55, angle, shade(COLORS.railTop, 0.82)); // the pierced band
    S.box(midPt[0], midPt[1], DECK_Y + railH - 0.1, DECK_Y + railH, len + 0.05, railT + 0.06, angle, COLORS.rail, { top: COLORS.railTop });
    const postCount = Math.max(1, Math.round(len / 2.2));
    for (let i = 1; i < postCount; i++) {
      const frac = i / postCount;
      S.box(ptA[0] + (ptB[0] - ptA[0]) * frac, ptA[1] + (ptB[1] - ptA[1]) * frac, DECK_Y, DECK_Y + railH + 0.05, 0.34, 0.34, angle, COLORS.rail, { top: COLORS.railTop });
    }
  };
  const halfA = DECK_LEN_A / 2 - edgeInset;
  const halfB = DECK_LEN_B / 2 - edgeInset;
  buildRailRun(halfA, -halfB, halfA, halfB); // outward face
  buildRailRun(-halfA, halfB, halfA, halfB);
  buildRailRun(-halfA, -halfB, halfA, -halfB); // the two sides
  buildRailRun(-halfA, -halfB, -halfA, -RAMP_WIDTH / 2);
  buildRailRun(-halfA, RAMP_WIDTH / 2, -halfA, halfB); // the ramp face, open in the middle
  for (const posA of [-halfA, halfA]) {
    for (const posB of [-halfB, halfB]) { // bổ trụ: the four corner posts
      const pos = centerAt(posA, posB);
      S.box(pos[0], pos[1], DECK_Y, DECK_Y + 1.25, 0.6, 0.6, rampAngle, COLORS.rail, { top: COLORS.railTop });
      S.box(pos[0], pos[1], DECK_Y + 1.25, DECK_Y + 1.45, 0.42, 0.42, rampAngle, COLORS.railTop, { taper: 0.4 });
    }
  }
  for (const posB of [-RAMP_WIDTH / 2, RAMP_WIDTH / 2]) { // and the posts flanking the ramp's head
    const pos = centerAt(-halfA, posB);
    S.box(pos[0], pos[1], DECK_Y, DECK_Y + 1.1, 0.5, 0.5, rampAngle, COLORS.rail, { top: COLORS.railTop });
  }
}

function buildSteppedRampAndForecourt(S, frame, baseY) {
  const { rampAt, perpX, perpZ, rampAngle } = frame;
  // ---- the ramp: 51 solid steps of đá gan gà, brick-paved slopes either side, built up from the court ----
  const stepRise = (DECK_Y - LAND_Y) / STEP_COUNT;
  const rampRun = STEP_COUNT * STEP_TREAD;
  for (let k = 0; k < STEP_COUNT; k++) {
    const pos = rampAt(-rampRun + STEP_TREAD * (k + 0.5), 0);
    const stepCol = shade(COLORS.ganga, 0.92 + rand(k, 9) * 0.16);
    S.box(pos[0], pos[1], baseY, LAND_Y + stepRise * (k + 1), STEP_TREAD + 0.02, MIDDLE_STEP_WIDTH, rampAngle, stepCol, { topKind: KIND.ROAD });
  }
  const slopeWidth = (RAMP_WIDTH - MIDDLE_STEP_WIDTH) / 2;
  const point3 = (along, across, y) => {
    const pos = rampAt(along, across);
    return [pos[0], y, pos[1]];
  };
  for (const side of [-1, 1]) {
    const innerB = side * MIDDLE_STEP_WIDTH / 2;
    const outerB = side * RAMP_WIDTH / 2;
    const yTop = DECK_Y + 0.02;
    const yFoot = LAND_Y + 0.04;
    // the sloping brick top, the outer side wall and the end at the foot
    const ptA = point3(-rampRun, innerB, yFoot);
    const ptB = point3(-rampRun, outerB, yFoot);
    const ptC = point3(0.3, outerB, yTop);
    const ptD = point3(0.3, innerB, yTop);
    S.kind = KIND.ROAD;
    if (side > 0) S.quad(ptA, ptB, ptC, ptD, COLORS.slope, [0, 1, 0]);
    else S.quad(ptB, ptA, ptD, ptC, COLORS.slope, [0, 1, 0]);
    S.kind = KIND.MASONRY;
    const footLow = point3(-rampRun, outerB, baseY);
    const headLow = point3(0.3, outerB, baseY);
    S.quad(footLow, headLow, ptC, ptB, COLORS.brick, [perpX * side, 0.05, perpZ * side]);
    S.quad(ptB, ptC, headLow, footLow, COLORS.brick, [perpX * side, 0.05, perpZ * side]); // both windings: seen from either side of the edge
    // creeper on the outer wall's upper end and a few dark streaks lower down (Street View)
    S.kind = KIND.PLAIN;
    for (let k = 0; k < 7; k++) {
      const startAlong = -rampRun * (0.02 + rand(k + side * 9, 21) * 0.28);
      const patchW = 1.6 + rand(k, 22) * 2.4;
      const patchH = 1.2 + rand(k + side, 23) * 2.2;
      const slopeY = (along) => LAND_Y + (DECK_Y - LAND_Y) * (1 + along / rampRun);
      const greenCol = mix(COLORS.creeperDark, COLORS.creeperLight, rand(k, 24));
      const sideNorm = [perpX * side, 0.05, perpZ * side];
      const proud = 0.05;
      const wallPt = (along, y) => {
        const pos = rampAt(along, outerB);
        return [pos[0] + perpX * side * proud, y, pos[1] + perpZ * side * proud];
      };
      S.quad(wallPt(startAlong - patchW, slopeY(startAlong - patchW) - patchH), wallPt(startAlong, slopeY(startAlong) - patchH), wallPt(startAlong, slopeY(startAlong)), wallPt(startAlong - patchW, slopeY(startAlong - patchW)), greenCol, sideNorm);
      S.quad(wallPt(startAlong, slopeY(startAlong) - patchH), wallPt(startAlong - patchW, slopeY(startAlong - patchW) - patchH), wallPt(startAlong - patchW, slopeY(startAlong - patchW)), wallPt(startAlong, slopeY(startAlong)), greenCol, [-sideNorm[0], sideNorm[1], -sideNorm[2]]);
    }
    S.kind = KIND.MASONRY;
    // a brick kerb along the outer edge
    S.beam(point3(-rampRun, outerB - side * 0.18, yFoot + 0.18), point3(0.3, outerB - side * 0.18, yTop + 0.18), 0.36, 0.36, shade(COLORS.slope, 1.08));
    // the iron pipe railing along the steps' edge (Street View), on posts every ~2.5 m
    S.kind = KIND.PLAIN;
    const railStart = point3(-rampRun + 0.4, innerB + side * 0.12, yFoot);
    const railEnd = point3(-0.2, innerB + side * 0.12, yTop);
    const liftPt = (pt, dy): [number, number, number] => [pt[0], pt[1] + dy, pt[2]];
    S.beam(liftPt(railStart, 0.95), liftPt(railEnd, 0.95), 0.06, 0.06, COLORS.iron);
    S.beam(liftPt(railStart, 0.5), liftPt(railEnd, 0.5), 0.04, 0.04, COLORS.iron);
    for (let i = 0; i <= 15; i++) {
      const frac = i / 15;
      const postBase = [railStart[0] + (railEnd[0] - railStart[0]) * frac, railStart[1] + (railEnd[1] - railStart[1]) * frac, railStart[2] + (railEnd[2] - railStart[2]) * frac];
      S.beam(postBase, liftPt(postBase, 0.95), 0.06, 0.06, COLORS.iron);
    }
    S.kind = KIND.MASONRY;
    // the side slope's solid body under it, stepped like the treads
    for (let k = 0; k < STEP_COUNT; k += 3) {
      const pos = rampAt(-rampRun + STEP_TREAD * (k + 1.5), side * (MIDDLE_STEP_WIDTH / 2 + slopeWidth / 2));
      S.box(pos[0], pos[1], baseY, LAND_Y + stepRise * (k + 0.6), STEP_TREAD * 3, slopeWidth - 0.05, rampAngle, COLORS.brick);
    }
  }

  // the forecourt at the ramp's foot (Street View from Ông Ích Khiêm): a flat paved court before the first step,
  // wider on the side away from Ông Ích Khiêm, closed by a tall ornate iron fence (about 1.8 m: pickets with spear
  // tips, a lattice band, heavier posts) with a stone pier at its front corners carrying a lamp post
  const foreA0 = -rampRun - FORECOURT_DEPTH;
  const foreA1 = -rampRun + 2.0;
  const foreLeftB = -(RAMP_WIDTH / 2 + 0.4);
  const foreRightB = RAMP_WIDTH / 2 + 2.6;
  S.kind = KIND.ROAD; // the paving, a hair above the ground
  S.quad(point3(foreA0, foreLeftB, LAND_Y + 0.05), point3(foreA0, foreRightB, LAND_Y + 0.05), point3(-rampRun, foreRightB, LAND_Y + 0.05), point3(-rampRun, foreLeftB, LAND_Y + 0.05), COLORS.forecourtPave, [0, 1, 0]);
  S.quad(point3(-rampRun, foreRightB, LAND_Y + 0.05), point3(foreA0, foreRightB, LAND_Y + 0.05), point3(foreA0, foreLeftB, LAND_Y + 0.05), point3(-rampRun, foreLeftB, LAND_Y + 0.05), COLORS.forecourtPave, [0, 1, 0]);
  S.kind = KIND.PLAIN;
  const fenceH = 1.8;
  const buildIronFence = (ptA, ptB) => {
    const len = Math.hypot(ptA[0] - ptB[0], ptA[1] - ptB[1]);
    const lerpPt = (frac, height) => point3(ptA[0] + (ptB[0] - ptA[0]) * frac, ptA[1] + (ptB[1] - ptA[1]) * frac, LAND_Y + height);
    for (const railH of [0.12, 0.55, 1.35, fenceH - 0.12]) S.beam(lerpPt(0, railH), lerpPt(1, railH), 0.05, 0.05, COLORS.iron);
    const picketCount = Math.max(2, Math.round(len / 0.16));
    for (let i = 0; i <= picketCount; i++) {
      const frac = i / picketCount;
      S.beam(lerpPt(frac, 0), lerpPt(frac, fenceH), 0.025, 0.025, COLORS.iron);
      S.beam(lerpPt(frac, fenceH), lerpPt(frac, fenceH + 0.12), 0.05, 0.01, COLORS.iron);
    }
    const bayCount = Math.max(1, Math.round(len / 1.9));
    for (let j = 0; j < bayCount; j++) { // the post, and a lattice of crossing bars in the band between the rails
      const frac0 = j / bayCount;
      const frac1 = (j + 1) / bayCount;
      const latticeCount = 6;
      S.beam(lerpPt(frac0, 0), lerpPt(frac0, fenceH + 0.25), 0.1, 0.1, COLORS.iron);
      for (let i = 0; i < latticeCount; i++) {
        const sub0 = frac0 + (frac1 - frac0) * i / latticeCount;
        const sub1 = frac0 + (frac1 - frac0) * (i + 1) / latticeCount;
        S.beam(lerpPt(sub0, 0.55), lerpPt(sub1, 1.35), 0.02, 0.02, COLORS.iron);
        S.beam(lerpPt(sub1, 0.55), lerpPt(sub0, 1.35), 0.02, 0.02, COLORS.iron);
      }
    }
    S.beam(lerpPt(1, 0), lerpPt(1, fenceH + 0.25), 0.1, 0.1, COLORS.iron);
  };
  buildIronFence([foreA0, foreLeftB], [foreA0, foreRightB]);
  buildIronFence([foreA0, foreLeftB], [foreA1, foreLeftB]);
  buildIronFence([foreA0, foreRightB], [foreA1, foreRightB]);
  for (const cornerB of [foreLeftB, foreRightB]) { // the stone piers and their lamp posts
    const pos = rampAt(foreA0, cornerB);
    S.kind = KIND.MASONRY;
    S.box(pos[0], pos[1], LAND_Y - 0.1, LAND_Y + 1.2, 0.55, 0.55, rampAngle, shade(COLORS.stone, 0.8), { top: COLORS.stone });
    S.kind = KIND.PLAIN;
    S.cyl(pos[0], pos[1], LAND_Y + 1.2, LAND_Y + 3.6, 0.07, 0.05, 6, COLORS.iron);
    S.box(pos[0], pos[1], LAND_Y + 3.6, LAND_Y + 3.9, 0.2, 0.2, rampAngle, COLORS.lampGlobe, { taper: 1.25 });
    S.cyl(pos[0], pos[1], LAND_Y + 3.9, LAND_Y + 4.05, 0.17, 0.03, 6, COLORS.iron);
  }
}

function buildBatPhongPavilion(S, frame) {
  const { center, centerAt, rampAngle } = frame;
  // ---- đình Bát Phong: octagonal, open, 8 outer columns and 4 inner, two roof tiers in green glazed tile ----
  // sized from Street View against the 8.2 m ramp (eaves about 6.2 m across, nearly as tall as wide; the satellite's
  // dark octagon, about 7 m, includes its shadow); planScale scales the earlier plan (outer columns on a 3.4 m radius) down to
  // that, heightScale the heights
  const planScale = 0.66;
  const heightScale = 0.74;
  const plinthY = DECK_Y + 0.45 * planScale;
  const outerRad = 3.4 * planScale; // its own low octagonal plinth
  const octRot = rampAngle + Math.PI / 8; // a flat side faces the ramp
  S.kind = KIND.MASONRY;
  S.cyl(center[0], center[1], DECK_Y - 0.05, plinthY, 4.75 * planScale, 4.6 * planScale, 8, shade(COLORS.stone, 0.95), { rot: octRot });
  S.cyl(center[0], center[1], DECK_Y - 0.05, DECK_Y + 0.02, 5.2 * planScale, 5.2 * planScale, 8, shade(COLORS.floor, 0.9), { rot: octRot }); // a brick apron round it
  const stepPos = centerAt(-4.75 * planScale - 0.4, 0);
  S.box(stepPos[0], stepPos[1], DECK_Y - 0.05, plinthY - 0.15, 0.8, 2.2 * planScale, rampAngle, COLORS.stone);
  S.kind = KIND.TIMBER;
  const outerColH = 2.9 * heightScale;
  const innerColH = 4.6 * heightScale;
  const octCorner = (rad, idx) => {
    const theta = octRot + idx * Math.PI / 4;
    return [center[0] + Math.cos(theta) * rad, center[1] + Math.sin(theta) * rad];
  };
  for (let k = 0; k < 8; k++) {
    const pos = octCorner(outerRad, k);
    S.cyl(pos[0], pos[1], plinthY, plinthY + 0.22, 0.28, 0.24, 6, COLORS.stone, { cap: false });
    S.cyl(pos[0], pos[1], plinthY + 0.22, plinthY + outerColH, 0.15, 0.14, 8, COLORS.lacquer, { cap: false });
  }
  const innerOff = 1.6 * planScale;
  for (const offsetA of [-innerOff, innerOff]) {
    for (const offsetB of [-innerOff, innerOff]) {
      const pos = centerAt(offsetA, offsetB);
      S.cyl(pos[0], pos[1], plinthY, plinthY + 0.22, 0.3, 0.26, 6, COLORS.stone, { cap: false });
      S.cyl(pos[0], pos[1], plinthY + 0.22, plinthY + innerColH, 0.17, 0.16, 8, COLORS.lacquer, { cap: false });
    }
  }
  // the ring beam on the outer columns, with a carved valance under it, and tie beams to the inner columns
  const beamCol = shade(COLORS.lacquer, 0.78);
  for (let k = 0; k < 8; k++) {
    const ptA = octCorner(outerRad, k);
    const ptB = octCorner(outerRad, k + 1);
    S.beam([ptA[0], plinthY + outerColH - 0.12, ptA[1]], [ptB[0], plinthY + outerColH - 0.12, ptB[1]], 0.22, 0.26, beamCol);
    const midPt = [(ptA[0] + ptB[0]) / 2, (ptA[1] + ptB[1]) / 2];
    S.box(midPt[0], midPt[1], plinthY + outerColH - 0.6, plinthY + outerColH - 0.25, Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]) - 0.35, 0.06, Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]), shade(COLORS.lacquer, 0.6));
  }
  for (const offsetA of [-innerOff, innerOff]) {
    for (const offsetB of [-innerOff, innerOff]) {
      const innerPos = centerAt(offsetA, offsetB);
      const outerPos = centerAt(offsetA * outerRad / Math.hypot(innerOff, innerOff) * 0.98, offsetB * outerRad / Math.hypot(innerOff, innerOff) * 0.98);
      S.beam([innerPos[0], plinthY + outerColH - 0.3, innerPos[1]], [outerPos[0], plinthY + outerColH - 0.3, outerPos[1]], 0.16, 0.2, beamCol);
    }
  }
  for (const side of [-1, 1]) {
    const ptA0 = centerAt(-innerOff, side * innerOff);
    const ptB0 = centerAt(innerOff, side * innerOff);
    S.beam([ptA0[0], plinthY + innerColH - 0.15, ptA0[1]], [ptB0[0], plinthY + innerColH - 0.15, ptB0[1]], 0.24, 0.28, beamCol);
    const ptA1 = centerAt(side * innerOff, -innerOff);
    const ptB1 = centerAt(side * innerOff, innerOff);
    S.beam([ptA1[0], plinthY + innerColH - 0.15, ptA1[1]], [ptB1[0], plinthY + innerColH - 0.15, ptB1[1]], 0.24, 0.28, beamCol);
  }
  // lower tier: an eight-sloped skirt from the outer columns up to the inner square
  buildOctagonalRoof(S, center, octRot, outerRad + 1.25 * planScale, innerOff * 1.25, plinthY + outerColH, plinthY + outerColH + 1.35 * planScale, 0.1 * planScale, COLORS.roof, COLORS.ridge, shade(COLORS.lacquer, 0.6));
  // the chồng diêm: dark boards between the tiers
  S.kind = KIND.TIMBER;
  S.box(center[0], center[1], plinthY + outerColH + 1.05 * planScale, plinthY + innerColH, innerOff * 2 + 0.3, innerOff * 2 + 0.3, rampAngle, shade(COLORS.lacquer, 0.62), { top: shade(COLORS.roof, 0.8) });
  // upper tier: a steep four-sloped pyramid with straight, nearly flat eaves (Street View, close up: about half the
  // lower tier's width, its slopes meeting at a gourd finial; the corners end in small scrolls, not long horns), so a
  // plain hip without flare, its hip ridges and corner scrolls drawn here at the pavilion's own scale
  const upperW = innerOff * 2 + 0.3;
  const upperOver = 0.35 * planScale;
  const upperH = 1.9 * planScale;
  const upperBaseY = plinthY + innerColH;
  const upperAngle = rampAngle + Math.PI / 2;
  S.hip(center[0], center[1], upperW, upperW, upperAngle, upperBaseY, upperH, COLORS.roof, { over: upperOver, fascia: 0.16, fasciaCol: shade(COLORS.lacquer, 0.6), glazed: true, ridgeCol: COLORS.ridge });
  S.kind = KIND.PLAIN;
  const apexPt = [center[0], upperBaseY + upperH + 0.04, center[1]];
  for (const [signU, signV] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) {
    const cornerU = signU * (upperW / 2 + upperOver);
    const cornerV = signV * (upperW / 2 + upperOver);
    const eavePt = [center[0] + cornerU * Math.cos(upperAngle) - cornerV * Math.sin(upperAngle), upperBaseY + 0.06, center[1] + cornerU * Math.sin(upperAngle) + cornerV * Math.cos(upperAngle)];
    S.beam(eavePt, apexPt, 0.12, 0.14, COLORS.ridge);
    const dx = eavePt[0] - center[0];
    const dz = eavePt[2] - center[1];
    const dist = Math.hypot(dx, dz);
    S.beam(eavePt, [eavePt[0] + dx / dist * 0.25, eavePt[1] + 0.2, eavePt[2] + dz / dist * 0.25], 0.1, 0.12, COLORS.ridge);
  }
  // the gourd finial and a lightning rod
  const ridgeY = upperBaseY + upperH;
  S.cyl(center[0], center[1], ridgeY - 0.05, ridgeY + 0.25, 0.2, 0.12, 6, COLORS.ridge, { rot: octRot });
  S.cyl(center[0], center[1], ridgeY + 0.25, ridgeY + 0.55, 0.12, 0.03, 6, COLORS.ridge, { rot: octRot });
  S.box(center[0], center[1], ridgeY + 0.55, ridgeY + 1.4, 0.05, 0.05, rampAngle, COLORS.lightningRod);
}

// An octagonal hip skirt: eave ring radius r0 at y0 rising to r1 at y1, a slight sag-and-lift at the corners, a
// fascia under the eave and hip ridges ending in small upturned horns. rot is the angle of the first corner.
function buildOctagonalRoof(S, center, rot, r0, r1, y0, y1, lift, roofColor, ridgeColor, fasciaColor) {
  const keepKind = S.kind;
  const octPt = (rad, idx, y) => {
    const theta = rot + idx * Math.PI / 4;
    return [center[0] + Math.cos(theta) * rad, y, center[1] + Math.sin(theta) * rad];
  };
  // three rows from eave to top, only slightly concave (Street View: a nearly straight skirt); the corners barely lifted
  const rows = 3;
  const cols = 2;
  const surfPt = (sideIdx, alongFrac, upFrac) => { // side sideIdx, alongFrac along it (0..1), upFrac eave -> top (0..1)
    const ptA = octPt(1, sideIdx, 0);
    const ptB = octPt(1, sideIdx + 1, 0);
    const dirX = ptA[0] - center[0] + (ptB[0] - ptA[0]) * alongFrac;
    const dirZ = ptA[2] - center[1] + (ptB[2] - ptA[2]) * alongFrac; // a point on the unit octagon
    const rad = r0 + (r1 - r0) * upFrac;
    const y = y0 + (y1 - y0) * upFrac ** 1.15 + lift * Math.abs(2 * alongFrac - 1) ** 2 * (1 - upFrac) ** 2;
    return [center[0] + dirX * rad, y, center[1] + dirZ * rad];
  };
  S.kind = KIND.GLAZED;
  for (let k = 0; k < 8; k++) {
    const midPt = octPt(1, k + 0.5, 0);
    const faceHint = [midPt[0] - center[0], 0.9, midPt[2] - center[1]];
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        S.quad(surfPt(k, j / cols, i / rows), surfPt(k, (j + 1) / cols, i / rows), surfPt(k, (j + 1) / cols, (i + 1) / rows), surfPt(k, j / cols, (i + 1) / rows), roofColor, faceHint);
      }
    }
  }
  S.kind = KIND.PLAIN;
  for (let k = 0; k < 8; k++) {
    const midPt = octPt(1, k + 0.5, 0);
    const faceHint = [midPt[0] - center[0], 0, midPt[2] - center[1]];
    for (let j = 0; j < cols; j++) {
      const ptA = surfPt(k, j / cols, 0);
      const ptB = surfPt(k, (j + 1) / cols, 0);
      S.quad([ptA[0], ptA[1] - 0.2, ptA[2]], [ptB[0], ptB[1] - 0.2, ptB[2]], ptB, ptA, fasciaColor, faceHint);
    }
    // hip ridge and horn
    let prevPt = null;
    for (let i = rows; i >= 0; i--) {
      const pt = surfPt(k, 0, i / rows);
      const ridgePt = [pt[0], pt[1] + 0.12, pt[2]];
      if (prevPt) S.beam(prevPt, ridgePt, 0.2, 0.22, ridgeColor);
      prevPt = ridgePt;
    }
    const dx = prevPt[0] - center[0];
    const dz = prevPt[2] - center[1];
    const dist = Math.hypot(dx, dz);
    S.beam(prevPt, [prevPt[0] + dx / dist * 0.35, prevPt[1] + 0.12, prevPt[2] + dz / dist * 0.35], 0.16, 0.18, ridgeColor); // a short, low horn: the real eaves are nearly flat
  }
  // the top ring where the skirt meets the chồng diêm
  for (let k = 0; k < 8; k++) {
    const ptA = surfPt(k, 0, 1);
    const ptB = surfPt(k + 1, 0, 1);
    S.beam([ptA[0], ptA[1] + 0.08, ptA[2]], [ptB[0], ptB[1] + 0.08, ptB[2]], 0.18, 0.18, ridgeColor);
  }
  S.kind = keepKind;
}

export function build({ S }) {
  const [fwdX, fwdZ] = RAMP_AXIS;
  const perpX = -fwdZ;
  const perpZ = fwdX; // fwd: up the ramp toward the bastion's tip; perp: across it
  const rampAngle = Math.atan2(fwdZ, fwdX);
  const rampAt = (along, across): [number, number] => [RAMP_HEAD[0] + fwdX * along + perpX * across, RAMP_HEAD[1] + fwdZ * along + perpZ * across];
  const center = rampAt(DECK_LEN_A / 2, 0); // the platform's centre
  const centerAt = (along, across): [number, number] => [center[0] + fwdX * along + perpX * across, center[1] + fwdZ * along + perpZ * across];
  const frame = { fwdX, fwdZ, perpX, perpZ, rampAngle, rampAt, center, centerAt };

  const baseY = LAND_Y - 0.4;
  const footA = DECK_LEN_A / BATTER_RATIO;
  const footB = DECK_LEN_B / BATTER_RATIO;
  const pavedStart = S.n;

  buildTerrepleinAndPlatform(S, frame, baseY, footA, footB);
  buildDeckRailing(S, frame);
  buildSteppedRampAndForecourt(S, frame, baseY);
  buildBatPhongPavilion(S, frame);

  // ---- the war-time bunker on the bastion's tip (OSM 13673950594): squat concrete, a dark firing slit ----
  const bunkerY = LAND_Y + WALL_H - 0.05;
  S.kind = KIND.MASONRY;
  S.box(BUNKER_POS[0], BUNKER_POS[1], bunkerY, bunkerY + 1.5, 3.4, 3.0, rampAngle, COLORS.concrete, { top: shade(COLORS.concrete, 0.85), taper: 0.92 });
  const slitPos = [BUNKER_POS[0] + fwdX * 1.58, BUNKER_POS[1] + fwdZ * 1.58];
  S.box(slitPos[0], slitPos[1], bunkerY + 0.8, bunkerY + 1.05, 0.06, 1.6, rampAngle, COLORS.bunkerSlit);

  S.kind = KIND.PLAIN;
  S.base = 0;
  (S.paved = S.paved || []).push([pavedStart, S.n]); // the deck, the ramp and its landing: keep trees and houses off
  return null;
}
