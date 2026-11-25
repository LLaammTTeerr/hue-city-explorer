import { KIND, Buf, hex, shade, unflat, signedArea, inRing } from '../../geo/buf.ts';
import { LAND_Y } from '../../config.ts';
import { groundHeightAt, addEmissiveStripMesh } from '../helpers.ts';

// AEON MALL Huế, 8 Võ Nguyên Giáp (An Vân Dương), opened 16 September 2024 (ceremony 21 September), issue #71.
// See docs/places/aeon.md.
//
// AEON Mall Vietnam's press release (21 Sept 2024) gives: RC building, 4 floors and a basement, floor area about
// 138,000 m² on a site of 86,000 m²; a sunken "Moon Garden" on the south side under a "terrace street" of roof
// gardens on the 3rd and 4th floors; exterior concept "Culture Stream", a flowing white "stream line" motif. Its
// concept and night renders (both marked tentative) and an opening-day drone photo show what is modelled here:
//   hub      the main entrance on the rounded outer corner of the L (the arc in the OSM outline), facing north-west
//            over the forecourt to the Võ Nguyên Giáp / Văn Tiến Dũng junction: a dark glass front through the
//            floors, the atrium behind it, framed by a sweeping white band carrying AEON MALL in magenta.
//   wings    either side of it, screens of vertical bronze fins over the upper floors, rising above the roof;
//            taupe walls with a strip of shopfronts below; an orange box standing forward right of the entrance.
//   ends     white blocks at the two ends of the L with magenta AEON sign boxes at the top corners.
//   roof     tree terraces on the inner (south) side, solar panels and plant beyond.
// No height is published (the 2022 plan only capped it at 60 m); four mall storeys of about 5.5 m give a roof near
// 22 m, the fin screens and end blocks 25-27 m, read off the renders against the storeys.
// Footprint: OSM way 1575540652 (building=retail, shop=mall), from data.special.aeon.

export const id = 'aeon';

const ROOF_HEIGHT = 22.0;
const PARAPET_HEIGHT = 1.2;
const LONG_END_HEIGHT = 27.0;
const SHORT_END_HEIGHT = 25.0;
const FIN_TOP_HEIGHT = 25.5;

const COLORS = {
  wall: hex('#6c625a'),
  wallLow: hex('#4c4a49'),
  grey: hex('#bdb9b2'),
  white: hex('#efeeea'),
  roof: hex('#a7a49d'),
  slat: hex('#b48a55'),
  slatDark: hex('#8a6440'),
  orange: hex('#c4682c'),
  glass: hex('#34424d'),
  atrium: hex('#5d7f6a'),
  magenta: hex('#c0187a'),
  solar: hex('#3d5168'),
  green: hex('#4f7136'),
  greenDark: hex('#3d5a2b'),
  deck: hex('#9b8f80'),
  steel: hex('#6f7378'),
  stripe: hex('#d9cfc6'),
  trunk: hex('#5a4634'),
  fountainWater: hex('#4f8494'),
  cars: [hex('#e8e6e0'), hex('#323842'), hex('#a8322d'), hex('#345c8a'), hex('#c7c4bc'), hex('#6e7478')],
};

function createMallFrame(ring, S) {
  // the frame: v along the long arm of the L (its longest edge, + towards the arm's far end), u across it, + into the
  // L; the origin at the inner corner (the reflex vertex nearest the middle). The long arm then lies at u < 0, the
  // short arm at v < 0, and the rounded outer corner (the entrance) faces -u -v.
  let longestEdge = null;
  for (let i = 0; i < ring.length; i++) {
    const ptA = ring[i];
    const ptB = ring[(i + 1) % ring.length];
    const len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
    if (!longestEdge || len > longestEdge.len) longestEdge = { ptA, ptB, len };
  }
  const centroid = ring.reduce((acc, pt) => [acc[0] + pt[0] / ring.length, acc[1] + pt[1] / ring.length], [0, 0]);
  let reflexCorner = null;
  for (let i = 0; i < ring.length; i++) {
    const prevPt = ring[(i + ring.length - 1) % ring.length];
    const currPt = ring[i];
    const nextPt = ring[(i + 1) % ring.length];
    if ((currPt[0] - prevPt[0]) * (nextPt[1] - currPt[1]) - (currPt[1] - prevPt[1]) * (nextPt[0] - currPt[0]) >= 0) continue;
    const dist = Math.hypot(currPt[0] - centroid[0], currPt[1] - centroid[1]);
    if (!reflexCorner || dist < reflexCorner.dist) reflexCorner = { pt: currPt, dist };
  }
  if (!reflexCorner) return null;
  const origin = reflexCorner.pt;
  const distA = Math.hypot(longestEdge.ptA[0] - origin[0], longestEdge.ptA[1] - origin[1]);
  const distB = Math.hypot(longestEdge.ptB[0] - origin[0], longestEdge.ptB[1] - origin[1]);
  const farPt = distA > distB ? longestEdge.ptA : longestEdge.ptB;
  const nearPt = distA > distB ? longestEdge.ptB : longestEdge.ptA;
  const axisV = [(farPt[0] - nearPt[0]) / longestEdge.len, (farPt[1] - nearPt[1]) / longestEdge.len];
  let axisU = [axisV[1], -axisV[0]];
  // the long arm's body lies at u < 0: judged by the vertices well along it (a plain centroid leans towards the arc)
  const armSumU = ring
    .filter((pt) => (pt[0] - origin[0]) * axisV[0] + (pt[1] - origin[1]) * axisV[1] > longestEdge.len / 4)
    .reduce((acc, pt) => acc + (pt[0] - origin[0]) * axisU[0] + (pt[1] - origin[1]) * axisU[1], 0);
  if (armSumU > 0) axisU = [-axisU[0], -axisU[1]];

  const toWorld = (localU, localV): [number, number] => [origin[0] + axisU[0] * localU + axisV[0] * localV, origin[1] + axisU[1] * localU + axisV[1] * localV];
  const uvRing = ring.map((pt) => [(pt[0] - origin[0]) * axisU[0] + (pt[1] - origin[1]) * axisU[1], (pt[0] - origin[0]) * axisV[0] + (pt[1] - origin[1]) * axisV[1]]);
  const angleOf = (du, dv) => Math.atan2(axisU[1] * du + axisV[1] * dv, axisU[0] * du + axisV[0] * dv);
  const angleU = angleOf(1, 0);
  const baseY = groundHeightAt(origin[0], origin[1]);
  const box = (localU, localV, yMin, yMax, sizeU, sizeV, color, opts?) => {
    const pos = toWorld(localU, localV);
    S.box(pos[0], pos[1], yMin, yMax, sizeU, sizeV, angleU, color, opts);
  };
  const vMax = Math.max(...uvRing.map((pt) => pt[1]));
  const vMin = Math.min(...uvRing.map((pt) => pt[1]));
  const uMax = Math.max(...uvRing.map((pt) => pt[0]));
  // the two straight front faces either side of the arc: the long arm's (u = uWest) and the short arm's (v = vNorth)
  const uWest = Math.max(...uvRing.filter((pt) => pt[0] < -10 && pt[1] > -25 && pt[1] < 110).map((pt) => pt[0]));
  const vNorth = Math.min(...uvRing.filter((pt) => pt[0] > -15 && pt[0] < 35).map((pt) => pt[1]));
  // the arc: the run of short edges between the two faces; its centre is where the faces' normals through its two
  // ends meet, i.e. (largest u, largest v) of its points
  const arcSegs = [];
  for (let i = 0; i < uvRing.length; i++) {
    const ptA = uvRing[i];
    const ptB = uvRing[(i + 1) % uvRing.length];
    const segLen = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
    if (segLen >= 2 && segLen <= 14 && ptA[0] < uWest + 60 && ptA[1] < vNorth + 60 && ptA[0] <= 0 && ptA[1] <= 0 && Math.min(ptA[0], ptB[0]) < -3 && Math.min(ptA[1], ptB[1]) < -3) {
      arcSegs.push([ptA, ptB]);
    }
  }
  if (!arcSegs.length) return null;
  const arcCenter = [Math.max(...arcSegs.flat().map((pt) => pt[0])), Math.max(...arcSegs.flat().map((pt) => pt[1]))];
  return { ring, uvRing, toWorld, angleOf, angleU, baseY, box, vMax, vMin, uMax, uWest, vNorth, arcSegs, arcCenter };
}

function walkAlongFace(ua, va, ub, vb, step, callback) {
  const len = Math.hypot(ub - ua, vb - va);
  const count = Math.max(1, Math.floor(len / step));
  for (let i = 0; i < count; i++) {
    callback(ua + ((ub - ua) * (i + 0.5)) / count, va + ((vb - va) * (i + 0.5)) / count, len / count);
  }
}

function buildBodyAndWings(S, frame, addLit, warmBuf, magentaBuf) {
  const { ring, uvRing, baseY, box, vMax, vMin, uMax, uWest, vNorth } = frame;
  // ---------------- the body: the whole footprint to the roof, white slab bands, a dark base ----------------
  S.kind = KIND.MODERN;
  S.prism(ring, baseY - 0.5, baseY + ROOF_HEIGHT, COLORS.wall, COLORS.roof, { parapet: PARAPET_HEIGHT, topKind: KIND.FLAT });
  S.kind = KIND.PLAIN;
  const addPerimeterBand = (yMin, yMax, color, outDepth) => {
    for (let i = 0; i < ring.length; i++) {
      const ptA = ring[i];
      const ptB = ring[(i + 1) % ring.length];
      const len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
      if (len < 0.5) continue;
      const tan = [(ptB[0] - ptA[0]) / len, (ptB[1] - ptA[1]) / len];
      const mid = [(ptA[0] + ptB[0]) / 2, (ptA[1] + ptB[1]) / 2];
      let norm = [tan[1], -tan[0]];
      if (inRing(mid[0] + norm[0] * 0.5, mid[1] + norm[1] * 0.5, ring)) norm = [-norm[0], -norm[1]]; // outwards
      S.box(mid[0] + norm[0] * outDepth / 2, mid[1] + norm[1] * outDepth / 2, yMin, yMax, len + outDepth, outDepth, Math.atan2(tan[1], tan[0]), color, { bottom: true });
    }
  };
  addPerimeterBand(baseY - 0.5, baseY + 1.2, COLORS.wallLow, 0.3);
  addPerimeterBand(baseY + 10.6, baseY + 11.3, COLORS.white, 0.35);
  addPerimeterBand(baseY + ROOF_HEIGHT + PARAPET_HEIGHT - 0.6, baseY + ROOF_HEIGHT + PARAPET_HEIGHT + 0.15, COLORS.white, 0.4);

  const buildFins = (ua, va, ub, vb, norm, topY) => {
    const sizeU = Math.abs(ub - ua) + Math.abs(norm[0]) * 0.4;
    const sizeV = Math.abs(vb - va) + Math.abs(norm[1]) * 0.4;
    box((ua + ub) / 2 + norm[0] * 0.25, (va + vb) / 2 + norm[1] * 0.25, baseY + 11.3, topY - 0.4, sizeU, sizeV, COLORS.slatDark, { top: COLORS.slatDark });
    let finIdx = 0;
    walkAlongFace(ua, va, ub, vb, 1.4, (localU, localV) => {
      finIdx++;
      box(localU + norm[0] * 0.9, localV + norm[1] * 0.9, baseY + 11.3, topY + (finIdx % 6 === 0 ? 0.5 : 0), 0.3 + Math.abs(norm[0]) * 0.6, 0.3 + Math.abs(norm[1]) * 0.6, finIdx % 3 ? COLORS.slat : shade(COLORS.slat, 0.88));
    });
  };
  const buildShops = (ua, va, ub, vb, norm, litEvery) => {
    let shopIdx = 0;
    walkAlongFace(ua, va, ub, vb, 7, (localU, localV, segLen) => {
      const sizeU = Math.abs(norm[1]) * (segLen - 1) + Math.abs(norm[0]) * 0.3;
      const sizeV = Math.abs(norm[0]) * (segLen - 1) + Math.abs(norm[1]) * 0.3;
      box(localU + norm[0] * 0.15, localV + norm[1] * 0.15, baseY + 1.2, baseY + 4.8, sizeU, sizeV, COLORS.glass);
      if (shopIdx++ % litEvery === 0) {
        addLit(warmBuf, localU + norm[0] * 0.35, localV + norm[1] * 0.35, baseY + 1.4, baseY + 4.6, Math.max(0.06, sizeU - 0.6 * Math.abs(norm[1])), Math.max(0.06, sizeV - 0.6 * Math.abs(norm[0])));
      }
    });
  };

  // ---------------- the ends of the L: white blocks, the magenta AEON sign boxes ----------------
  const uLongEnd = Math.min(...uvRing.filter((pt) => pt[1] > vMax - 60).map((pt) => pt[0])); // the long arm widens at its far end
  const longEndV0 = vMax - 72;
  const longEndCenterU = uLongEnd / 2;
  const longEndSizeU = -uLongEnd - 0.6;
  S.kind = KIND.MODERN;
  box(longEndCenterU, (longEndV0 + vMax) / 2, baseY + ROOF_HEIGHT - 1, baseY + LONG_END_HEIGHT, longEndSizeU, vMax - longEndV0 - 0.6, COLORS.white, { top: COLORS.roof, topKind: KIND.FLAT });
  S.kind = KIND.PLAIN;
  for (const bandY of [12.5, 17, 21.5]) box(longEndCenterU, vMax + 0.1, baseY + bandY, baseY + bandY + 1.4, longEndSizeU * 0.8, 0.3, COLORS.grey); // window strips on the end face
  box(longEndCenterU, vMax + 0.2, baseY + 1.2, baseY + 9.5, longEndSizeU * 0.85, 0.3, COLORS.glass);
  for (let k = 0; k < 6; k++) addLit(warmBuf, longEndCenterU + (k - 2.5) * longEndSizeU * 0.14, vMax + 0.4, baseY + 1.6, baseY + 4.2, longEndSizeU * 0.11, 0.06);
  // sign boxes at the top corner towards the front: on the front face and on the end
  box(uLongEnd - 0.3, vMax - 6, baseY + LONG_END_HEIGHT - 6.5, baseY + LONG_END_HEIGHT - 1.0, 0.5, 7.0, COLORS.magenta);
  addLit(magentaBuf, uLongEnd - 0.6, vMax - 6, baseY + LONG_END_HEIGHT - 5.8, baseY + LONG_END_HEIGHT - 1.7, 0.08, 5.6);
  box(uLongEnd + 5, vMax + 0.35, baseY + LONG_END_HEIGHT - 6.5, baseY + LONG_END_HEIGHT - 1.0, 7.0, 0.5, COLORS.magenta);
  addLit(magentaBuf, uLongEnd + 5, vMax + 0.65, baseY + LONG_END_HEIGHT - 5.8, baseY + LONG_END_HEIGHT - 1.7, 5.6, 0.08);

  // the short arm's end: a white block with fine vertical striping on the front, a sign box at its corner
  const shortEndU0 = uMax - 34;
  const shortEndV0 = vMin;
  const shortEndV1 = Math.min(vMin + 56, -20);
  S.kind = KIND.MODERN;
  box((shortEndU0 + uMax) / 2, (shortEndV0 + shortEndV1) / 2, baseY + ROOF_HEIGHT - 1, baseY + SHORT_END_HEIGHT, uMax - shortEndU0 - 0.6, shortEndV1 - shortEndV0 - 0.6, COLORS.white, { top: COLORS.roof, topKind: KIND.FLAT });
  S.kind = KIND.PLAIN;
  walkAlongFace(shortEndU0 + 2, shortEndV0, uMax - 8, shortEndV0, 1.2, (localU, localV) => box(localU, localV - 0.2, baseY + 6, baseY + SHORT_END_HEIGHT - 1.5, 0.35, 0.4, COLORS.stripe));
  box(uMax - 4, shortEndV0 - 0.3, baseY + SHORT_END_HEIGHT - 6, baseY + SHORT_END_HEIGHT - 1, 6.0, 0.5, COLORS.magenta);
  addLit(magentaBuf, uMax - 4, shortEndV0 - 0.6, baseY + SHORT_END_HEIGHT - 5.4, baseY + SHORT_END_HEIGHT - 1.6, 4.8, 0.08);
  box(uMax + 0.3, shortEndV0 + 4, baseY + SHORT_END_HEIGHT - 6, baseY + SHORT_END_HEIGHT - 1, 0.5, 6.0, COLORS.magenta);
  addLit(magentaBuf, uMax + 0.6, shortEndV0 + 4, baseY + SHORT_END_HEIGHT - 5.4, baseY + SHORT_END_HEIGHT - 1.6, 0.08, 4.8);

  // ---------------- the front either side of the hub: fin screens, shopfronts, the orange box ----------------
  const longArmEndV = vMax - 74;
  buildFins(uWest, 4, uWest, 46, [-1, 0], baseY + FIN_TOP_HEIGHT); // right of the entrance, along the long arm
  buildShops(uWest, 4, uWest, longArmEndV, [-1, 0], 2);
  const shortStepV = Math.min(...uvRing.filter((pt) => pt[0] > 30 && pt[0] < uMax - 36).map((pt) => pt[1])); // the short arm's front, past its step
  buildFins(0, vNorth, 36, vNorth, [0, -1], baseY + FIN_TOP_HEIGHT); // left of the entrance, along the short arm
  buildShops(4, vNorth, 38, vNorth, [0, -1], 1);
  buildShops(42, shortStepV, uMax - 36, shortStepV, [0, -1], 2);
  // the orange box standing forward over the entrances right of the hub (on the long arm), slatted
  box(uWest - 4.2, 19, baseY + 5.6, baseY + 10.4, 8.4, 30, COLORS.orange, { top: COLORS.roof });
  walkAlongFace(uWest - 8.5, 4.5, uWest - 8.5, 33.5, 1.5, (localU, localV) => box(localU, localV, baseY + 5.7, baseY + 10.3, 0.4, 0.3, shade(COLORS.orange, 0.8)));
  for (const colV of [6, 19, 32]) box(uWest - 7.8, colV, baseY, baseY + 5.6, 0.6, 0.6, COLORS.white);

  return { longArmEndV, shortStepV };
}

function buildEntranceHub(S, frame, addLit, warmBuf, magentaBuf, glassBuf) {
  const { arcSegs, arcCenter, toWorld, angleOf, baseY, box } = frame;
  // ---------------- the hub: glass round the arc, the sweeping white band, AEON MALL ----------------
  const avgRadius = arcSegs.reduce((acc, [ptA]) => acc + Math.hypot(ptA[0] - arcCenter[0], ptA[1] - arcCenter[1]), 0) / arcSegs.length;
  for (const [ptA, ptB] of arcSegs) {
    const segLen = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
    const tan = [(ptB[0] - ptA[0]) / segLen, (ptB[1] - ptA[1]) / segLen];
    const midU = (ptA[0] + ptB[0]) / 2;
    const midV = (ptA[1] + ptB[1]) / 2;
    let norm = [-tan[1], tan[0]];
    if ((midU - arcCenter[0]) * norm[0] + (midV - arcCenter[1]) * norm[1] < 0) norm = [-norm[0], -norm[1]];
    const segAngle = angleOf(tan[0], tan[1]);
    const placeArcBox = (outDist, yMin, yMax, color, targetBuf?) => {
      const pos = toWorld(midU + norm[0] * outDist, midV + norm[1] * outDist);
      if (targetBuf) targetBuf.box(pos[0], pos[1], yMin, yMax, segLen, 0.08, segAngle, [1, 1, 1], { top: [1, 1, 1], bottom: true });
      else S.box(pos[0], pos[1], yMin, yMax, segLen + 0.1, 0.2, segAngle, color);
    };
    placeArcBox(0.25, baseY + 0.2, baseY + ROOF_HEIGHT + 1.4, COLORS.atrium);
    placeArcBox(0.4, baseY + 0.4, baseY + ROOF_HEIGHT + 1.2, COLORS.glass);
    for (const slabY of [5.5, 11, 16.5]) placeArcBox(0.55, baseY + slabY - 0.25, baseY + slabY + 0.25, COLORS.grey); // the floor slabs behind the glass
    placeArcBox(0.6, baseY + 1.0, baseY + ROOF_HEIGHT - 1.0, null, glassBuf);
    const mullionPos = toWorld(ptA[0] + norm[0] * 0.6, ptA[1] + norm[1] * 0.6);
    S.box(mullionPos[0], mullionPos[1], baseY + 0.2, baseY + ROOF_HEIGHT + 1.4, 0.2, 0.3, segAngle, COLORS.steel); // a mullion at each kink
    // the white band, 3 m proud of the glass: a deep fascia at the roof line, a canopy over the doors
    const bandOut = 3.0;
    const bandLen = segLen * (avgRadius + bandOut) / avgRadius + 0.2;
    const outerPos = toWorld(midU + norm[0] * bandOut, midV + norm[1] * bandOut);
    const innerPos = toWorld(midU + norm[0] * bandOut / 2, midV + norm[1] * bandOut / 2);
    S.box(outerPos[0], outerPos[1], baseY + ROOF_HEIGHT - 3.0, baseY + ROOF_HEIGHT + 3.6, bandLen, 0.9, segAngle, COLORS.white, { bottom: true });
    S.box(innerPos[0], innerPos[1], baseY + ROOF_HEIGHT + 3.1, baseY + ROOF_HEIGHT + 3.6, bandLen, bandOut, segAngle, COLORS.white, { bottom: true });
    S.box(outerPos[0], outerPos[1], baseY + 5.2, baseY + 6.1, bandLen, 0.9, segAngle, COLORS.white, { bottom: true });
    S.box(innerPos[0], innerPos[1], baseY + 5.2, baseY + 5.5, bandLen, bandOut, segAngle, COLORS.white, { bottom: true });
    addLit(warmBuf, midU + norm[0] * bandOut / 2, midV + norm[1] * bandOut / 2, baseY + 5.12, baseY + 5.18, segLen * 0.5, 1.4);
  }
  // the band sweeps smoothly down into a crisp white portal pilaster at its long-arm end and curls cleanly at its short-arm end
  const arcPts = arcSegs.flat();
  const longArmEnd = arcPts.reduce((best, pt) => (pt[1] > best[1] ? pt : best));
  const shortArmEnd = arcPts.reduce((best, pt) => (pt[0] > best[0] ? pt : best));
  const sweepSteps = 10;
  for (let k = 0; k < sweepSteps; k++) {
    const midFrac = (k + 0.5) / sweepSteps;
    const botY = baseY + 5.2 + (ROOF_HEIGHT - 8.2) * (1 - Math.cos(midFrac * Math.PI * 0.5));
    const topY = baseY + ROOF_HEIGHT + 3.6 - 3.0 * midFrac * midFrac;
    box(longArmEnd[0] - 3.0 + midFrac * 1.4, longArmEnd[1] + 0.5 + midFrac * 16.0, botY, topY, 0.9, 1.85, COLORS.white, { bottom: true });
  }
  box(longArmEnd[0] - 1.6, longArmEnd[1] + 16.8, baseY, baseY + ROOF_HEIGHT + 0.6, 1.1, 2.2, COLORS.white);
  box(shortArmEnd[0] + 2.5, shortArmEnd[1] - 3.0, baseY, baseY + ROOF_HEIGHT + 3.6, 5.0, 0.9, COLORS.white);
  // AEON MALL on the band at its crown
  // centred by angle between the arc's two ends, not on its middle vertex (the OSM arc's vertices are uneven)
  const unitFromCenter = (pt) => {
    const dist = Math.hypot(pt[0] - arcCenter[0], pt[1] - arcCenter[1]);
    return [(pt[0] - arcCenter[0]) / dist, (pt[1] - arcCenter[1]) / dist];
  };
  const dir0 = unitFromCenter(longArmEnd);
  const dir1 = unitFromCenter(shortArmEnd);
  let crownNorm = [dir0[0] + dir1[0], dir0[1] + dir1[1]];
  const crownLen = Math.hypot(crownNorm[0], crownNorm[1]);
  crownNorm = [crownNorm[0] / crownLen, crownNorm[1] / crownLen];
  const crownMid = [arcCenter[0] + crownNorm[0] * avgRadius, arcCenter[1] + crownNorm[1] * avgRadius];
  const signAngle = angleOf(-crownNorm[1], crownNorm[0]);
  const signPos = toWorld(crownMid[0] + crownNorm[0] * 3.55, crownMid[1] + crownNorm[1] * 3.55);
  const glowPos = toWorld(crownMid[0] + crownNorm[0] * 3.7, crownMid[1] + crownNorm[1] * 3.7);
  S.box(signPos[0], signPos[1], baseY + ROOF_HEIGHT - 0.4, baseY + ROOF_HEIGHT + 2.9, 18, 0.25, signAngle, COLORS.magenta);
  magentaBuf.box(glowPos[0], glowPos[1], baseY + ROOF_HEIGHT, baseY + ROOF_HEIGHT + 2.5, 17, 0.08, signAngle, [1, 1, 1], { top: [1, 1, 1], bottom: true });
}

function buildRoofAndSiteGrounds(S, frame, longArmEndV, shortStepV) {
  const { ring, toWorld, baseY, box, uWest, uMax } = frame;
  // ---------------- the roof: tree terraces on the inner side, solar panels and plant beyond ----------------
  // Guard every rooftop element with inRing(p, ring) so nothing ever floats beyond the L-shaped roof slab.
  const roofY = baseY + ROOF_HEIGHT;
  const isOnRoof = (localU, localV, pad = 2.5) => {
    for (const [du, dv] of [[0, 0], [-pad, 0], [pad, 0], [0, -pad], [0, pad]]) {
      const pos = toWorld(localU + du, localV + dv);
      if (!inRing(pos[0], pos[1], ring)) return false;
    }
    return true;
  };
  for (const [centerU, centerV, sizeU, sizeV] of [[-14, 14, 20, 40], [30, -26, 30, 14], [-20, -14, 14, 14]]) {
    if (isOnRoof(centerU, centerV, Math.min(sizeU, sizeV) * 0.42)) {
      box(centerU, centerV, roofY, roofY + 0.35, sizeU, sizeV, COLORS.deck, { top: COLORS.deck, topKind: KIND.ROAD });
    }
    for (let k = 0; k < 7; k++) {
      const treeU = centerU + (((k * 37) % 10) / 10 - 0.45) * (sizeU - 6);
      const treeV = centerV + (((k * 53) % 10) / 10 - 0.45) * (sizeV - 6);
      if (!isOnRoof(treeU, treeV, 2.2)) continue;
      box(treeU, treeV, roofY + 0.35, roofY + 0.9, 3.6, 3.6, COLORS.greenDark, { top: COLORS.green });
      const pos = toWorld(treeU, treeV);
      S.cyl(pos[0], pos[1], roofY + 0.9, roofY + 3.0 + (k % 3) * 0.6, 1.5, 1.0, 7, k % 2 ? COLORS.green : COLORS.greenDark);
    }
  }
  S.kind = KIND.FLAT;
  for (let panelV = 44; panelV < longArmEndV - 4; panelV += 5) {
    if (isOnRoof(uWest / 2, panelV, 3)) box(uWest / 2, panelV, roofY + 0.3, roofY + 0.7, -uWest - 12, 3.2, COLORS.solar, { top: COLORS.solar });
  }
  for (let panelU = 40; panelU < uMax - 40; panelU += 5) {
    if (isOnRoof(panelU, (shortStepV - 20) / 2 - 6, 3)) box(panelU, (shortStepV - 20) / 2 - 6, roofY + 0.3, roofY + 0.7, 3.2, -20 - shortStepV - 22, COLORS.solar, { top: COLORS.solar });
  }
  S.kind = KIND.PLAIN;
  for (const [plantU, plantV] of [[uWest / 2, -40], [uWest / 2 - 12, -30], [30, (shortStepV - 20) / 2 + 12]]) {
    if (isOnRoof(plantU, plantV, 4.5)) box(plantU, plantV, roofY, roofY + 2.4, 8, 5, COLORS.grey);
  }

  // ---------------- landscaped forecourt parking bays, tree islands & parked cars ----------------
  for (let row = 0; row < 3; row++) {
    const laneU = uWest - 22 - row * 15;
    // landscaped green divider island with trees between parking aisles
    S.kind = KIND.MASONRY;
    box(laneU + 6.8, 42, baseY - 0.05, baseY + 0.3, 2.2, 54, COLORS.grey, { top: COLORS.green, topKind: KIND.GROUND });
    S.kind = KIND.PLAIN;
    for (let treeIdx = 0; treeIdx < 5; treeIdx++) {
      const treePos = toWorld(laneU + 6.8, 18 + treeIdx * 12);
      S.cyl(treePos[0], treePos[1], baseY + 0.3, baseY + 2.4, 0.16, 0.12, 6, COLORS.trunk);
      S.cyl(treePos[0], treePos[1], baseY + 2.2, baseY + 4.8, 1.5, 0.95, 7, treeIdx % 2 ? COLORS.green : COLORS.greenDark);
    }
    // white parking bay markings & parked cars
    for (let k = 0; k < 10; k++) {
      const bayV = 16 + k * 5.2;
      box(laneU, bayV - 2.6, baseY + 0.02, baseY + 0.06, 4.6, 0.14, COLORS.white);
      if ((k + row * 2) % 3 === 1) continue;
      const carCol = COLORS.cars[(k * 3 + row) % COLORS.cars.length];
      box(laneU, bayV, baseY + 0.25, baseY + 0.95, 4.2, 1.85, carCol, { top: carCol });
      box(laneU - 0.15, bayV, baseY + 0.95, baseY + 1.48, 2.3, 1.62, COLORS.glass, { top: carCol });
    }
  }
  // inner south-east Moon Garden plaza (documented landscaped court & lawn islands raised cleanly above paved slab)
  const gardenU = 46;
  const gardenV = 46;
  S.kind = KIND.MASONRY;
  box(gardenU, gardenV, baseY - 0.05, baseY + 0.28, 70, 58, COLORS.white, { top: COLORS.green, topKind: KIND.GROUND });
  S.kind = KIND.ROAD;
  box(gardenU, gardenV, baseY + 0.26, baseY + 0.34, 70, 7.5, COLORS.deck, { topKind: KIND.ROAD });
  box(gardenU, gardenV, baseY + 0.26, baseY + 0.34, 7.5, 58, COLORS.deck, { topKind: KIND.ROAD });
  // circular Moon Garden central amphitheater fountain & crescent pergola ring
  const fountainPos = toWorld(gardenU, gardenV);
  S.kind = KIND.MASONRY;
  S.cyl(fountainPos[0], fountainPos[1], baseY + 0.28, baseY + 0.72, 11.5, 11.2, 20, COLORS.white, { top: COLORS.deck, topKind: KIND.ROAD });
  S.cyl(fountainPos[0], fountainPos[1], baseY + 0.72, baseY + 0.88, 7.2, 7.0, 18, COLORS.fountainWater);
  S.cyl(fountainPos[0], fountainPos[1], baseY + 0.72, baseY + 1.65, 1.6, 1.2, 12, COLORS.white);
  // landscaped shade trees framing the Moon Garden lawns
  S.kind = KIND.PLAIN;
  for (const offsetU of [-24, -12, 12, 24]) {
    for (const offsetV of [-18, 18]) {
      const treePos = toWorld(gardenU + offsetU, gardenV + offsetV);
      S.cyl(treePos[0], treePos[1], baseY + 0.28, baseY + 2.55, 0.18, 0.13, 6, COLORS.trunk);
      S.cyl(treePos[0], treePos[1], baseY + 2.35, baseY + 5.35, 2.0, 1.25, 7, (offsetU + offsetV) % 24 === 0 ? COLORS.green : COLORS.greenDark);
    }
  }
}

export function build({ data, S, group }) {
  const special = data.special && data.special.aeon;
  if (!special) return;
  const ring = unflat(special.ring);
  if (ring.length < 6) return;
  if (signedArea(ring) < 0) ring.reverse(); // so convex turns have a positive cross product

  const frame = createMallFrame(ring, S);
  if (!frame) return;

  const warmBuf = new Buf(1024);
  const magentaBuf = new Buf(256);
  const glassBuf = new Buf(512); // night: warm shopfronts, magenta signs, the atrium
  const addLit = (buf, localU, localV, yMin, yMax, sizeU, sizeV) => {
    const pos = frame.toWorld(localU, localV);
    buf.box(pos[0], pos[1], yMin, yMax, sizeU, sizeV, frame.angleU, [1, 1, 1], { top: [1, 1, 1], bottom: true });
  };
  S.base = frame.baseY - LAND_Y;

  const { longArmEndV, shortStepV } = buildBodyAndWings(S, frame, addLit, warmBuf, magentaBuf);
  buildEntranceHub(S, frame, addLit, warmBuf, magentaBuf, glassBuf);
  buildRoofAndSiteGrounds(S, frame, longArmEndV, shortStepV);

  for (const [buf, colorHex, boost] of [[warmBuf, 0xffe2b0, 1.0], [magentaBuf, 0xff4fb0, 1.4], [glassBuf, 0xfff1c8, 0.85]] as any[]) {
    addEmissiveStripMesh(group, buf, colorHex, boost, id);
  }
  S.kind = KIND.PLAIN;
  S.base = 0;
}
