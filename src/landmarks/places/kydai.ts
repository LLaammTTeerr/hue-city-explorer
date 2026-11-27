import * as THREE from 'three';
import polygonClipping from 'polygon-clipping';
import { KIND, KIND_FLOOD, Buf, hex, shade, signedArea, inRing, rand } from '../../geo/buf.ts';
import { LAND_Y, WALL_H } from '../../config.ts';
import { glowPoints, lightMaterial } from '../../geo/materials.ts';
import { flag } from '../anim.ts';

// Kỳ Đài, the flag tower of the Huế Citadel, on the Nam Chánh bastion in the middle of the south face (1807, rebuilt
// 1829-1840; concrete pole 1948). Sources and estimates: docs/places/kydai.md.
//
// Three stepped brick tiers, about 17.5 m in all (vi.wikipedia "Kỳ đài (Huế)"):
//   1. the bastion itself (>5.5 m): the rampart (kinhthanh.js) at WALL_H, with a hole where tier 2 stands. Its pentagon
//      point (W and N corners on the citadel side, faces running back to the two sunken courts OSM maps at its flanks,
//      ways 617748900 and 695817672, cut out of the band by rampartCuts) is dressed here in grey render with a moulded
//      cornice, a parapet and a cannon on each corner, its top paved in brown brick;
//   2. the middle tier (~6 m) on OSM way 218427614, the bastion-shaped pentagon (~80 × 60 m);
//   3. the top tier (>6 m) on OSM way 531031593 (35.3 × 17.8 m), carrying the 37 m pole, the two guard huts
//      (điếm canh, rebuilt 2018) at its ends.
// Each tier: a slight batter, a floor of square brick tiles and a 1 m parapet with a band of hollow patterned
// tiles. Stairs climb the north (citadel) faces, in slots cut into the tier, to a 4 m and a 2 m arched gate
// (the lower flight on OSM way 617748885). Cannons on the OSM `historic=cannon` nodes. At night: the 2018
// multicolour LED outline and floodlights at the foot of the pole.
export const id = 'kydai';

// OSM outlines, in model metres
const MID_OSM = [[-962.3, 289.9], [-897.4, 243.4], [-876.4, 272.6], [-898.6, 305.9], [-939.9, 318.0]];
const TOP_OSM = [[-933.9, 288.7], [-905.7, 267.7], [-894.9, 281.9], [-923.2, 302.9]];
// Re-framed against the satellite (docs/places/kydai.md, "Position"): the two OSM outlines have the right size and
// axis but sit east of the tiers seen from above (corrected for the image's lean, measured on the pole), by about
// 3 m (tier 2) and 4 m (tier 3), and 1 m south. The bastion and moat around them line up, so only these move.
const TIER2_OFFSET = [-3, -1];
const TIER3_OFFSET = [-4, -1];
const shiftRing = (ring, offset) => ring.map(([x, z]) => [x + offset[0], z + offset[1]]);
const MID_RING = shiftRing(MID_OSM, TIER2_OFFSET);
const TOP_RING = shiftRing(TOP_OSM, TIER3_OFFSET);
const CANNON_NODES = [
  [-861.2, 274.5], [-958.6, 341.0], [-932.1, 332.0], [-868.8, 285.8], [-952.2, 338.8], [-865.6, 281.0],
  [-853.7, 263.3], [-857.3, 268.7], [-938.0, 334.0], [-945.0, 336.3], [-898.0, 298.1], [-893.8, 292.4], [-918.6, 310.5],
  [-911.4, 308.3], [-889.4, 286.2], [-925.6, 312.6],
];

// the two lower courts at tier 1's flanks (OSM cobblestone areas): street side first, then the back
const COURTS = [
  [[-980.9, 287.1], [-959.3, 314.5], [-972.9, 325.2], [-994.6, 297.8]],
  [[-897.2, 224.3], [-874.8, 253.9], [-861.0, 243.6], [-883.4, 214.0]],
];
// tier 1 on the band: the bastion between the courts and the outer edge (band vertices, model metres)
const BASTION_RING = [
  [-994.6, 297.8], [-980.9, 287.1], [-897.2, 224.3], [-883.4, 214.0], [-858.6, 212.4], [-836.7, 244.8],
  [-889.5, 320.7], [-983.3, 349.3], [-1008.5, 320.1],
];
// the grassed curtain walks behind the courts, left green (satellite)
const CURTAIN_LAWNS = [
  [[-994.6, 297.8], [-976.2, 323.3], [-987.1, 332.2], [-1003.9, 312.7]],
  [[-883.4, 214.0], [-863.6, 241.8], [-852.0, 232.0], [-867.3, 213.0]],
];
// the two orange-roofed sheds at the north-west foot, on Ông Ích Khiêm (satellite): centre, length, width
const FOOT_SHEDS = [[-950.4, 255.9, 12.3, 5.4], [-941.6, 247.7, 12.9, 3.5]];

// the courts, cut out of the rampart band with their street sides carried 1 m past the band's edge
export function rampartCuts() {
  return COURTS.map(([ptA, ptB, ptC, ptD]) => {
    const extend = (pt0, pt1) => {
      const len = Math.hypot(pt0[0] - pt1[0], pt0[1] - pt1[1]);
      return [pt0[0] + (pt0[0] - pt1[0]) / len, pt0[1] + (pt0[1] - pt1[1]) / len];
    };
    return [extend(ptA, ptB), ptB, ptC, extend(ptD, ptC)];
  });
}

const RAMPART_Y = LAND_Y + WALL_H; // tier 1 (the bastion top, city.js)
// tier heights: "about 6 m" and "over 6 m" (vi.wikipedia); the Lê Duẩn street view shows the top two tiers that tall
// against the pole. With the rampart's 6.6 m (the bastion is "over 5.5 m") the whole is 18.6 m, against "about 17.5 m".
const TIER2_HEIGHT = 5.8;
const TIER3_HEIGHT = 6.2;
const POLE_HEIGHT = 37;

const COLORS = {
  render: hex('#77777a'),
  renderDark: hex('#53524d'),
  renderLight: hex('#9a978e'),
  brick: hex('#7a6155'),
  court: hex('#8f8c85'),
  pole: hex('#4f4f4c'),
  wall: hex('#5d5850'),
  parapet: hex('#847d70'),
  coping: hex('#a29b8b'),
  floor: hex('#8c7264'),
  step: hex('#8f8a80'),
  gateTile: hex('#6f4a3a'),
  iron: hex('#2a2a2a'),
  guyWire: hex('#2e2e2c'),
  poleFinial: hex('#c9b26a'),
  hutWall: hex('#c9bfa6'),
  hutOpening: hex('#3a2c24'),
  hutRoof: hex('#625952'),
  hutRidge: hex('#b9ac95'),
  shedWall: hex('#d6cbb2'),
  shedRoof: hex('#c0643a'),
  cannonMetal: hex('#3b3832'),
  cannonWood: hex('#5a4434'),
};

// offset a ring by dist (positive: inward), mitred
function insetRing(ring, dist) {
  const sign = signedArea(ring) > 0 ? 1 : -1;
  const count = ring.length;
  const edgeNormal = (ptA, ptB) => {
    const tx = ptB[0] - ptA[0];
    const tz = ptB[1] - ptA[1];
    const len = Math.hypot(tx, tz);
    return [(-tz * sign) / len, (tx * sign) / len];
  };
  return ring.map((pt, i) => {
    const prevPt = ring[(i - 1 + count) % count];
    const nextPt = ring[(i + 1) % count];
    const norm0 = edgeNormal(prevPt, pt);
    const norm1 = edgeNormal(pt, nextPt);
    const miter = [norm0[0] + norm1[0], norm0[1] + norm1[1]];
    const scale = dist / Math.max(0.35, miter[0] * norm0[0] + miter[1] * norm0[1]);
    return [pt[0] + miter[0] * scale, pt[1] + miter[1] * scale];
  });
}

// cut a rectangular slot into edge 0 of a ring, from t0 to t1 along it, depth inward
function cutNotch(ring, t0, t1, depth) {
  const ptA = ring[0];
  const ptB = ring[1];
  const len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
  const along = [(ptB[0] - ptA[0]) / len, (ptB[1] - ptA[1]) / len];
  const sign = signedArea(ring) > 0 ? 1 : -1;
  const inward = [-along[1] * sign, along[0] * sign];
  const toPoint = (alongDist, inDist): [number, number] => [ptA[0] + along[0] * alongDist + inward[0] * inDist, ptA[1] + along[1] * alongDist + inward[1] * inDist];
  return { ring: [ptA, toPoint(t0, 0), toPoint(t0, depth), toPoint(t1, depth), toPoint(t1, 0), ...ring.slice(1)], along, inward, toPoint };
}

function buildTier(S, ledBuf, bottomRing, topRing, y0, y1, skipEdges: number[] = [], parapetThick = 0.42) {
  // one tier: battered walls from bottomRing to topRing, floor, parapet (edges in `skipEdges` left open)
  S.kind = KIND.MASONRY;
  const sign = signedArea(bottomRing) > 0 ? 1 : -1;
  for (let i = 0, count = bottomRing.length; i < count; i++) {
    const j = (i + 1) % count;
    const ptA = bottomRing[i];
    const ptB = bottomRing[j];
    const tx = ptB[0] - ptA[0];
    const tz = ptB[1] - ptA[1];
    S.quad([ptA[0], y0, ptA[1]], [ptB[0], y0, ptB[1]], [topRing[j][0], y1, topRing[j][1]], [topRing[i][0], y1, topRing[i][1]], COLORS.wall, [tz * sign, 0.05, -tx * sign]);
  }
  S.kind = KIND.ROAD;
  const topVecs = topRing.map((pt) => new THREE.Vector2(pt[0], pt[1]));
  for (const tri of THREE.ShapeUtils.triangulateShape(topVecs, [])) {
    S.tri([topVecs[tri[0]].x, y1, topVecs[tri[0]].y], [topVecs[tri[1]].x, y1, topVecs[tri[1]].y], [topVecs[tri[2]].x, y1, topVecs[tri[2]].y], COLORS.floor, [0, 1, 0]);
  }
  // parapet: solid plinth, a band of hollow patterned tiles (piers), coping; LED strip on the coping's outer edge
  const paraRing = insetRing(topRing, parapetThick / 2 + 0.01);
  for (let i = 0, count = paraRing.length; i < count; i++) {
    if (skipEdges.includes(i)) continue;
    const ptA = paraRing[i];
    const ptB = paraRing[(i + 1) % count];
    const edgeLen = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
    if (edgeLen < 0.3) continue;
    const angle = Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]);
    const midX = (ptA[0] + ptB[0]) / 2;
    const midZ = (ptA[1] + ptB[1]) / 2;
    S.kind = KIND.MASONRY;
    S.box(midX, midZ, y1, y1 + 0.38, edgeLen + 0.4, parapetThick, angle, COLORS.parapet);
    S.kind = KIND.PLAIN;
    const pierCount = Math.max(1, Math.round(edgeLen / 0.75));
    for (let k = 0; k <= pierCount; k++) {
      const frac = k / pierCount;
      S.box(ptA[0] + (ptB[0] - ptA[0]) * frac, ptA[1] + (ptB[1] - ptA[1]) * frac, y1 + 0.38, y1 + 0.82, 0.26, frac * 0.8, angle, shade(COLORS.parapet, 0.96));
    }
    S.box(midX, midZ, y1 + 0.82, y1 + 1.0, edgeLen + 0.46, parapetThick + 0.08, angle, COLORS.coping);
    const outSign = signedArea(paraRing) > 0 ? -1 : 1;
    const outX = Math.sin(angle) * (parapetThick / 2 + 0.06);
    const outZ = -Math.cos(angle) * (parapetThick / 2 + 0.06);
    // a thick parapet has a seat step along its inner foot, which reads as a line inside the rim
    if (parapetThick > 0.6) {
      S.kind = KIND.MASONRY;
      S.box(midX - outX * outSign * 1.55, midZ - outZ * outSign * 1.55, y1, y1 + 0.42, edgeLen - 0.3, 0.4, angle, COLORS.step, { top: COLORS.coping });
    }
    ledBuf.beam([ptA[0] + outX * outSign, y1 + 0.97, ptA[1] + outZ * outSign], [ptB[0] + outX * outSign, y1 + 0.97, ptB[1] + outZ * outSign], 0.1, 0.1, [1, 1, 1]);
  }
}

// a straight flight filling a slot: from yBottom at startIn (along inward, from the mouth) up to yTop at the slot's back
function buildStairFlight(S, toPoint, t0, t1, startIn, depth, yBottom, yTop, yBase) {
  const stepCount = Math.max(4, Math.round((yTop - yBottom) / 0.19));
  const runLen = depth - startIn;
  const tread = runLen / stepCount;
  const ptA = toPoint(t0, 0);
  const ptB = toPoint(t1, 0);
  const angle = Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]);
  S.kind = KIND.MASONRY;
  for (let k = 1; k <= stepCount; k++) {
    const stepIn = startIn + (k - 1) * tread;
    const center = toPoint((t0 + t1) / 2, (stepIn + depth) / 2);
    S.box(center[0], center[1], yBase, yBottom + (yTop - yBottom) * (k / stepCount), t1 - t0 - 0.08, depth - stepIn, angle, COLORS.step, { top: shade(COLORS.step, 1.12), topKind: KIND.ROAD });
  }
  // low cheek walls where the flight stands out of the slot
  if (startIn < 0) {
    for (const cheekT of [t0 - 0.2, t1 + 0.2]) {
      const pos = toPoint(cheekT, startIn / 2);
      S.box(pos[0], pos[1], yBase, yBottom + 0.9, 0.4, -startIn, angle, COLORS.parapet, { top: COLORS.coping });
    }
  }
}

// arched gate over a stair head: two piers, a round arch of short beams, a block and a small tiled cap
function buildStairGate(S, toPoint, t0, t1, depth, baseY, height) {
  const width = t1 - t0;
  const radius = width / 2;
  const ptA = toPoint(t0, depth);
  const ptB = toPoint(t1, depth);
  const angle = Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]);
  const springY = baseY + height - radius - 0.5;
  const topY = baseY + height;
  S.kind = KIND.MASONRY;
  for (const pierT of [t0 - 0.45, t1 + 0.45]) {
    const pos = toPoint(pierT, depth);
    S.box(pos[0], pos[1], baseY, topY, 0.9, 1.0, angle, COLORS.parapet, { top: COLORS.coping });
  }
  const midPt = toPoint((t0 + t1) / 2, depth);
  const cosAng = Math.cos(angle);
  const sinAng = Math.sin(angle);
  const archSegs = 7;
  for (let i = 0; i < archSegs; i++) {
    const ang0 = Math.PI * (i / archSegs);
    const ang1 = Math.PI * ((i + 1) / archSegs);
    const pt0 = [midPt[0] - cosAng * radius * Math.cos(ang0), springY + radius * Math.sin(ang0), midPt[1] - sinAng * radius * Math.cos(ang0)];
    const pt1 = [midPt[0] - cosAng * radius * Math.cos(ang1), springY + radius * Math.sin(ang1), midPt[1] - sinAng * radius * Math.cos(ang1)];
    // spandrel: from the arch up to the block
    S.quad([pt0[0], pt0[1], pt0[2]], [pt1[0], pt1[1], pt1[2]], [pt1[0], topY - 0.3, pt1[2]], [pt0[0], topY - 0.3, pt0[2]], COLORS.parapet, [sinAng, 0, -cosAng]);
    S.quad([pt0[0], pt0[1], pt0[2]], [pt1[0], pt1[1], pt1[2]], [pt1[0], topY - 0.3, pt1[2]], [pt0[0], topY - 0.3, pt0[2]], COLORS.parapet, [-sinAng, 0, cosAng]);
    S.beam(pt0, pt1, 0.95, 0.2, shade(COLORS.parapet, 0.8));
  }
  S.box(midPt[0], midPt[1], topY - 0.3, topY, width + 1.9, 1.1, angle, COLORS.coping);
  S.kind = KIND.TILE;
  S.box(midPt[0], midPt[1], topY, topY + 0.35, width + 2.2, 1.4, angle, COLORS.gateTile, { taper: 0.55 });
  S.kind = KIND.PLAIN;
}

function buildBastionTier1(S) {
  // ---- tier 1: the bastion's point, dressed over the rampart (kinhthanh.js draws its core) ----
  S.kind = KIND.ROAD;
  const closeRing = (ring) => [...ring, ring[0]];
  const fillPoly = (rings, y, color) => {
    const [outer, ...holes] = rings.map((ring) => ring.slice(0, -1).map(([x, z]) => new THREE.Vector2(x, z)));
    const allVerts = [outer, ...holes].flat();
    for (const tri of THREE.ShapeUtils.triangulateShape(outer, holes)) {
      S.tri([allVerts[tri[0]].x, y, allVerts[tri[0]].y], [allVerts[tri[1]].x, y, allVerts[tri[1]].y], [allVerts[tri[2]].x, y, allVerts[tri[2]].y], color, [0, 1, 0]);
    }
  };
  // brick paving on top, from the tier's faces to inside the rampart's outer parapet (1.4 m), round tier 2, the
  // band's hole under it included; the curtain lawns stay green
  const nwStrip = [[-980.9, 287.1], [-897.2, 224.3], [-906, 236], [-972, 297]]; // up to the north-west face
  try {
    const basePoly = polygonClipping.union([closeRing(insetRing(BASTION_RING, 1.6))], [closeRing(nwStrip)]);
    const pavePoly = polygonClipping.difference(basePoly, ...COURTS.map((ring) => [closeRing(insetRing(ring, -0.05))]), ...CURTAIN_LAWNS.map((ring) => [closeRing(ring)]), [closeRing(MID_RING)]);
    for (const poly of pavePoly) fillPoly(poly, RAMPART_Y + 0.02, COLORS.brick);
  } catch (err) {
    console.warn('kydai paving:', err);
  }
  // the courts: grey paving at street level
  for (const ring of COURTS) fillPoly([closeRing(ring)], LAND_Y + 0.12, COLORS.court);

  // the faces: grey render over a battered skin (0.6 m proud at the foot, 0.12 m under the cornice), a moulded
  // cornice, then a parapet with piers and coping; each face with the point it looks toward
  const courtCenters = COURTS.map((ring) => [ring.reduce((acc, pt) => acc + pt[0], 0) / 4, ring.reduce((acc, pt) => acc + pt[1], 0) / 4]);
  const bastionFaces = [
    [COURTS[0][0], COURTS[1][0], [-930, 240]], // north-west, to the citadel
    [COURTS[0][0], COURTS[0][1], courtCenters[0]],
    [COURTS[0][1], COURTS[0][2], courtCenters[0]], // south-west court: tier face, back
    [COURTS[1][0], COURTS[1][1], courtCenters[1]],
    [COURTS[1][1], COURTS[1][2], courtCenters[1]], // north-east court
  ];
  bastionFaces.forEach(([ptA, ptB, refPt], faceIdx) => {
    const dx = ptB[0] - ptA[0];
    const dz = ptB[1] - ptA[1];
    const len = Math.hypot(dx, dz);
    const dirX = dx / len;
    const dirZ = dz / len;
    let normX = dirZ;
    let normZ = -dirX;
    const midX = (ptA[0] + ptB[0]) / 2;
    const midZ = (ptA[1] + ptB[1]) / 2;
    if ((refPt[0] - midX) * normX + (refPt[1] - midZ) * normZ < 0) {
      normX = -normX;
      normZ = -normZ;
    }
    const angle = Math.atan2(dz, dx);
    const facePt = (along, out, y): [number, number, number] => [ptA[0] + dirX * along + normX * out, y, ptA[1] + dirZ * along + normZ * out];
    const corniceY = RAMPART_Y - 0.55;
    const footY = LAND_Y - 0.3;
    // the skin, its ends lapped round the corners
    const ext0 = faceIdx === 0 || faceIdx === 1 || faceIdx === 3 ? -0.6 : 0;
    const ext1 = 0.6;
    S.kind = KIND.PLAIN;
    S.quad(facePt(ext0, 0.6, footY), facePt(len + ext1, 0.6, footY), facePt(len + ext1, 0.12, corniceY), facePt(ext0, 0.12, corniceY), COLORS.render, [normX, 0.08, normZ]);
    // weathering: dark streaks down from the cornice and a damp foot
    S.quad(facePt(ext0, 0.62, footY), facePt(len + ext1, 0.62, footY), facePt(len + ext1, 0.55, LAND_Y + 0.6), facePt(ext0, 0.55, LAND_Y + 0.6), COLORS.renderDark, [normX, 0.08, normZ]);
    for (let dist = 1 + rand(faceIdx, 1) * 3; dist < len - 1; dist += 2.5 + rand(faceIdx * 31 + dist, 2) * 5) {
      const streakW = 0.6 + rand(faceIdx * 17 + dist, 3) * 1.8;
      const botY = corniceY - 0.8 - rand(faceIdx * 7 + dist, 4) * (WALL_H - 2.5);
      const botOut = 0.6 - (botY - footY) / (corniceY - footY) * 0.48;
      S.quad(facePt(dist, botOut + 0.015, botY), facePt(Math.min(len, dist + streakW), botOut + 0.015, botY), facePt(Math.min(len, dist + streakW), 0.135, corniceY), facePt(dist, 0.135, corniceY), rand(dist, 6) < 0.3 ? COLORS.renderLight : shade(COLORS.renderDark, 0.9 + rand(dist, 5) * 0.3), [normX, 0.08, normZ]);
    }
    // cornice: a projecting moulded band, then a plain frieze up to the walk
    const band0 = facePt(len / 2, 0.25, 0);
    S.box(band0[0], band0[2], corniceY, corniceY + 0.12, len + 1.2, 0.5, angle, shade(COLORS.render, 1.1));
    const band1 = facePt(len / 2, 0.32, 0);
    S.box(band1[0], band1[2], corniceY + 0.12, corniceY + 0.35, len + 1.3, 0.64, angle, shade(COLORS.render, 1.18));
    const band2 = facePt(len / 2, 0.06, 0);
    S.box(band2[0], band2[2], corniceY + 0.35, RAMPART_Y, len + 0.4, 0.12 + 0.12, angle, COLORS.render);
    // parapet on the walk: plinth, piers with open panels between, coping
    const paraCenter = facePt(len / 2, -0.28, 0);
    S.box(paraCenter[0], paraCenter[2], RAMPART_Y, RAMPART_Y + 0.35, len + 0.5, 0.5, angle, COLORS.render);
    S.kind = KIND.PLAIN;
    const pierCount = Math.max(1, Math.round(len / 2.2));
    for (let k = 0; k <= pierCount; k++) {
      const pierPt = facePt(len * k / pierCount, -0.28, 0);
      S.box(pierPt[0], pierPt[2], RAMPART_Y + 0.35, RAMPART_Y + 0.85, 0.36, 0.44, angle, shade(COLORS.render, 0.95));
    }
    for (const railOut of [-0.12, -0.44]) {
      const railPt = facePt(len / 2, railOut, 0);
      S.box(railPt[0], railPt[2], RAMPART_Y + 0.5, RAMPART_Y + 0.6, len, 0.05, angle, COLORS.renderDark);
    }
    S.box(paraCenter[0], paraCenter[2], RAMPART_Y + 0.85, RAMPART_Y + 1.02, len + 0.6, 0.62, angle, shade(COLORS.render, 1.15));
  });
  // iron fences across the courts' mouths, on a low plinth
  for (const ring of COURTS) {
    const ptA = ring[0];
    const ptB = ring[3];
    const len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
    const angle = Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]);
    const lerpPt = (frac, y) => [ptA[0] + (ptB[0] - ptA[0]) * frac, y, ptA[1] + (ptB[1] - ptA[1]) * frac];
    const midPt = lerpPt(0.5, 0);
    S.box(midPt[0], midPt[2], LAND_Y - 0.1, LAND_Y + 0.4, len - 1.2, 0.4, angle, COLORS.renderLight);
    for (const y of [LAND_Y + 0.55, LAND_Y + 1.5]) S.beam(lerpPt(0.6 / len, y), lerpPt(1 - 0.6 / len, y), 0.05, 0.05, COLORS.iron);
    for (let dist = 0.6; dist <= len - 0.6; dist += 0.18) S.beam(lerpPt(dist / len, LAND_Y + 0.4), lerpPt(dist / len, LAND_Y + 1.6), 0.025, 0.025, COLORS.iron);
    for (let dist = 0.6; dist <= len - 0.6; dist += 2.5) {
      const postPt = lerpPt(dist / len, 0);
      S.box(postPt[0], postPt[2], LAND_Y + 0.4, LAND_Y + 1.75, 0.12, 0.12, angle, COLORS.iron);
    }
  }
  S.kind = KIND.PLAIN;
}

function buildFlagpoleAndGuardHuts(S, tier3Y, floodCoords, floodColors) {
  // ---- top: the pole on the middle of tier 3; the two guard huts near its ends, on the north-west (stair) side, as the
  //      satellite shows them: centres about 2.7 m in from the ends and 4.5 m in from the north-west edge ----
  const topCenter = [(TOP_RING[0][0] + TOP_RING[2][0]) / 2, (TOP_RING[0][1] + TOP_RING[2][1]) / 2];
  const topLen = Math.hypot(TOP_RING[1][0] - TOP_RING[0][0], TOP_RING[1][1] - TOP_RING[0][1]);
  const topAngle = Math.atan2(TOP_RING[1][1] - TOP_RING[0][1], TOP_RING[1][0] - TOP_RING[0][0]);
  const dirX = Math.cos(topAngle);
  const dirZ = Math.sin(topAngle);
  const keepBase = S.base;
  S.base = tier3Y;
  S.kind = KIND.MASONRY + KIND_FLOOD;
  S.box(topCenter[0], topCenter[1], tier3Y, tier3Y + 0.6, 4.2, 4.2, topAngle, COLORS.parapet, { top: COLORS.coping });
  S.box(topCenter[0], topCenter[1], tier3Y + 0.6, tier3Y + 1.5, 2.6, 2.6, topAngle, COLORS.parapet, { top: COLORS.coping, taper: 0.9 });
  // the pole: dark weathered concrete, two railed ring platforms, guy lines to the corners of tier 3
  const baseRad = 0.62;
  const topRad = 0.26;
  const poleY0 = tier3Y + 1.5;
  const poleY1 = tier3Y + POLE_HEIGHT - 0.6;
  const radiusAt = (y) => baseRad + (topRad - baseRad) * (y - poleY0) / (poleY1 - poleY0);
  S.kind = KIND.PLAIN + KIND_FLOOD;
  S.cyl(topCenter[0], topCenter[1], poleY0, poleY1, baseRad, topRad, 10, COLORS.pole);
  S.base = keepBase;
  S.kind = KIND.PLAIN;
  S.cyl(topCenter[0], topCenter[1], tier3Y + POLE_HEIGHT - 0.6, tier3Y + POLE_HEIGHT - 0.3, 0.42, 0.42, 10, COLORS.pole);
  for (const frac of [0.3, 0.62]) {
    const y = tier3Y + POLE_HEIGHT * frac;
    const platRad = radiusAt(y) + 0.75;
    S.cyl(topCenter[0], topCenter[1], y - 0.18, y, platRad, platRad, 14, shade(COLORS.pole, 0.9));
    S.cyl(topCenter[0], topCenter[1], y + 0.95, y + 1.03, platRad - 0.03, platRad - 0.03, 14, shade(COLORS.pole, 0.8), { cap: false });
    for (let i = 0; i < 8; i++) {
      const theta = (i / 8) * Math.PI * 2;
      const px = topCenter[0] + Math.cos(theta) * (platRad - 0.05);
      const pz = topCenter[1] + Math.sin(theta) * (platRad - 0.05);
      S.beam([px, y, pz], [px, y + 1.0, pz], 0.05, 0.05, shade(COLORS.pole, 0.8));
    }
  }
  const anchorPts = insetRing(TOP_RING, 1.2);
  for (const anchor of anchorPts) {
    for (const frac of [0.3, 0.78]) {
      const y = tier3Y + POLE_HEIGHT * frac;
      S.beam([topCenter[0] + (anchor[0] - topCenter[0]) * 0.02, y, topCenter[1] + (anchor[1] - topCenter[1]) * 0.02], [anchor[0], tier3Y + 1.1, anchor[1]], 0.05, 0.05, COLORS.guyWire);
    }
  }
  for (const anchor of anchorPts) S.box(anchor[0], anchor[1], tier3Y, tier3Y + 1.1, 0.5, 0.5, 0, COLORS.parapet, { top: COLORS.coping });
  S.cyl(topCenter[0], topCenter[1], tier3Y + POLE_HEIGHT - 0.3, tier3Y + POLE_HEIGHT, 0.3, 0.06, 10, COLORS.poleFinial);

  const topWidth = Math.hypot(TOP_RING[3][0] - TOP_RING[0][0], TOP_RING[3][1] - TOP_RING[0][1]);
  const crossX = (TOP_RING[3][0] - TOP_RING[0][0]) / topWidth;
  const crossZ = (TOP_RING[3][1] - TOP_RING[0][1]) / topWidth; // across, from the north-west edge
  for (const side of [-1, 1]) {
    const hutCenter = [
      topCenter[0] + dirX * side * (topLen / 2 - 2.7) + crossX * (4.5 - topWidth / 2),
      topCenter[1] + dirZ * side * (topLen / 2 - 2.7) + crossZ * (4.5 - topWidth / 2),
    ];
    S.kind = KIND.MASONRY;
    S.box(hutCenter[0], hutCenter[1], tier3Y, tier3Y + 0.25, 4.0, 4.2, topAngle, COLORS.step);
    S.kind = KIND.FACADE;
    S.box(hutCenter[0], hutCenter[1], tier3Y + 0.25, tier3Y + 2.75, 3.4, 3.6, topAngle, COLORS.hutWall);
    S.kind = KIND.PLAIN;
    // a dark door toward the pole and a window on each long side
    const doorPt = [hutCenter[0] - dirX * side * 1.72, hutCenter[1] - dirZ * side * 1.72];
    S.box(doorPt[0], doorPt[1], tier3Y + 0.25, tier3Y + 2.15, 0.06, 1.0, topAngle, COLORS.hutOpening);
    for (const sideV of [-1, 1]) {
      const winPt = [hutCenter[0] - dirZ * sideV * 1.82, hutCenter[1] + dirX * sideV * 1.82];
      S.box(winPt[0], winPt[1], tier3Y + 1.1, tier3Y + 2.0, 0.8, 0.06, topAngle, COLORS.hutOpening);
    }
    // roof in weathered grey tile, as the satellite shows it
    S.hip(hutCenter[0], hutCenter[1], 3.4, 3.6, topAngle, tier3Y + 2.75, 1.5, COLORS.hutRoof, { over: 0.5, hips: true, flare: 0.15, ridgeCol: COLORS.hutRidge });
    floodCoords.push(hutCenter[0] - dirX * side * 2.0, tier3Y + 2.5, hutCenter[1] - dirZ * side * 2.0);
    floodColors.push(1.0, 0.78, 0.48);
  }
  // subtle uplights round the foot of the pole (4 modest fixtures instead of 8 stacked flood blobs)
  for (let i = 0; i < 4; i++) {
    const theta = topAngle + (i / 4) * Math.PI * 2;
    floodCoords.push(topCenter[0] + Math.cos(theta) * 2.8, tier3Y + 0.75, topCenter[1] + Math.sin(theta) * 2.8);
    floodColors.push(1.0, 0.80, 0.50);
  }
  return topCenter;
}

function buildShedsAndCannons(S, topCenter, tier2Y, tier3Y) {
  // ---- the sheds at the north-west foot: single storey, low orange-tiled hip roofs ----
  for (const [x, z, length, width] of FOOT_SHEDS) {
    const shedAngle = Math.atan2(-0.59, 0.807);
    S.kind = KIND.FACADE;
    S.box(x, z, LAND_Y - 0.2, LAND_Y + 2.9, length, width, shedAngle, COLORS.shedWall);
    S.kind = KIND.PLAIN;
    S.hip(x, z, length, width, shedAngle, LAND_Y + 2.9, Math.min(1.4, width * 0.3), COLORS.shedRoof, { over: 0.45, hips: true });
  }

  // ---- cannons on the OSM nodes, muzzles outward; one on a raised mount at each corner of tier 1 ----
  for (const [cornerPt, adjA, adjB] of [[COURTS[0][0], COURTS[1][0], COURTS[0][1]], [COURTS[1][0], COURTS[0][0], COURTS[1][1]]]) {
    // bisector into the corner, from the two faces meeting there
    const unitTo = (pt) => {
      const len = Math.hypot(pt[0] - cornerPt[0], pt[1] - cornerPt[1]);
      return [(pt[0] - cornerPt[0]) / len, (pt[1] - cornerPt[1]) / len];
    };
    const dirA = unitTo(adjA);
    const dirB = unitTo(adjB);
    const sumVec = [dirA[0] + dirB[0], dirA[1] + dirB[1]];
    const sumLen = Math.hypot(sumVec[0], sumVec[1]);
    const outX = -sumVec[0] / sumLen;
    const outZ = -sumVec[1] / sumLen;
    const x = cornerPt[0] - outX * 2.4;
    const z = cornerPt[1] - outZ * 2.4;
    S.kind = KIND.MASONRY;
    S.box(x, z, RAMPART_Y, RAMPART_Y + 0.45, 2.0, 2.0, Math.atan2(outZ, outX), COLORS.render, { top: shade(COLORS.render, 1.15) });
    S.kind = KIND.PLAIN;
    S.box(x, z, RAMPART_Y + 0.45, RAMPART_Y + 0.85, 1.3, 0.75, Math.atan2(outZ, outX), COLORS.cannonWood);
    S.beam([x - outX * 0.9, RAMPART_Y + 1.05, z - outZ * 0.9], [x + outX * 0.2, RAMPART_Y + 1.05, z + outZ * 0.2], 0.5, 0.5, COLORS.cannonMetal);
    S.beam([x + outX * 0.2, RAMPART_Y + 1.05, z + outZ * 0.2], [x + outX * 1.7, RAMPART_Y + 1.12, z + outZ * 1.7], 0.34, 0.34, COLORS.cannonMetal);
  }
  for (const [rawX, rawZ] of CANNON_NODES) {
    // a cannon on a tier moves with that tier's outline; those on the bastion stay on their OSM nodes
    const offset = inRing(rawX, rawZ, TOP_OSM) ? TIER3_OFFSET : inRing(rawX, rawZ, MID_OSM) ? TIER2_OFFSET : [0, 0];
    const x = rawX + offset[0];
    const z = rawZ + offset[1];
    const y = inRing(x, z, TOP_RING) ? tier3Y : inRing(x, z, MID_RING) ? tier2Y : RAMPART_Y;
    const dx = x - topCenter[0];
    const dz = z - topCenter[1];
    const len = Math.hypot(dx, dz);
    const outX = dx / len;
    const outZ = dz / len;
    S.kind = KIND.PLAIN;
    S.box(x, z, y, y + 0.42, 1.3, 0.75, Math.atan2(outZ, outX), COLORS.cannonWood);
    S.beam([x - outX * 0.9, y + 0.62, z - outZ * 0.9], [x + outX * 0.2, y + 0.62, z + outZ * 0.2], 0.5, 0.5, COLORS.cannonMetal);
    S.beam([x + outX * 0.2, y + 0.62, z + outZ * 0.2], [x + outX * 1.5, y + 0.66, z + outZ * 1.5], 0.34, 0.34, COLORS.cannonMetal);
  }
}

export function build({ S, group }) {
  const keepKind = S.kind;
  const ledBuf = new Buf(1200); // LED outline
  const floodCoords: number[] = [];
  const floodColors: number[] = [];

  buildBastionTier1(S);

  // ---- tier 2: the bastion-shaped pentagon, its walls reaching down into the rampart ----
  const tier2Y = RAMPART_Y + TIER2_HEIGHT;
  const tier3Y = tier2Y + TIER3_HEIGHT;
  const midBase = insetRing(MID_RING, -0.15);
  // the lower flight: OSM steps at 67.8 m along the north edge (A→B), climbing south; slot 4 m wide, 8.6 m deep
  const notch2 = cutNotch(midBase, 65.8, 69.8, 8.6);
  buildTier(S, ledBuf, notch2.ring, insetRing(notch2.ring, 0.45), LAND_Y - 0.5, tier2Y, [2], 0.75);
  buildStairFlight(S, notch2.toPoint, 65.8, 69.8, -1.8, 8.6, RAMPART_Y, tier2Y, LAND_Y - 0.5);
  buildStairGate(S, notch2.toPoint, 65.8, 69.8, 8.6 + 0.45 + 0.5, tier2Y, 3.6);

  // ---- tier 3: the OSM rectangle; its flight, 2.4 m wide, in the east half of the north face ----
  const notch3 = cutNotch(TOP_RING, 25.0, 27.4, 6.8);
  buildTier(S, ledBuf, notch3.ring, insetRing(notch3.ring, 0.4), tier2Y, tier3Y, [2]);
  buildStairFlight(S, notch3.toPoint, 25.0, 27.4, -1.2, 6.8, tier2Y, tier3Y, tier2Y);
  buildStairGate(S, notch3.toPoint, 25.0, 27.4, 6.8 + 0.4 + 0.5, tier3Y, 3.0);

  const topCenter = buildFlagpoleAndGuardHuts(S, tier3Y, floodCoords, floodColors);
  buildShedsAndCannons(S, topCenter, tier2Y, tier3Y);
  S.kind = keepKind;

  // ---- night: LED outline (colour-cycling) and floodlights ----
  const ledMat = lightMaterial(0xffffff, 1.05);
  const ledMesh = new THREE.Mesh(ledBuf.geometry(), ledMat);
  ledMesh.renderOrder = 19;
  ledMesh.userData.landmark = id;
  group.add(ledMesh);
  const glowMesh = glowPoints(floodCoords, floodColors, 5.8);
  glowMesh.userData.glow = true;
  glowMesh.userData.landmark = id;
  group.add(glowMesh);

  // ---- the flag, 12 × 8 m, at the masthead ----
  flag(group, { at: [topCenter[0], tier3Y + POLE_HEIGHT - 0.4, topCenter[1]], w: 12, h: 8, look: 'vn', landmark: id }); // waves down-wind (anim.js)

  const cycleColor = new THREE.Color();
  return {
    update(time) {
      // slow drift through the colours, with a warm-white pause each cycle
      const phase = (time / 40) % 1;
      if (phase < 0.2) cycleColor.setRGB(1, 0.86, 0.62);
      else cycleColor.setHSL((phase - 0.2) / 0.8, 0.85, 0.55);
      ledMat.uniforms.uColor.value.copy(cycleColor);
    },
  };
}
