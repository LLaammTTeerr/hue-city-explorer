import * as THREE from 'three';
import { KIND, Buf, hex, shade } from '../../geo/buf.ts';
import { LAND_Y } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { lightMaterial } from '../../geo/materials.ts';

// Vincom Plaza Huế + Meliá Vinpearl Huế, 50A Hùng Vương (ngã sáu Hùng Vương, south bank). See docs/places/vincom.md.
//
// One block on one lot: a cream-stone shopping podium (Vincom Plaza, opened 2018) under a dark-blue glass hotel
// tower whose plan is a shallow V (Vinpearl Hotel Huế, now Meliá Vinpearl; 33 floors above ground, 213 rooms; 160 m
// and 39 levels in OSM and Wikipedia's list of the tallest buildings in Huế).
// Footprint: OSM way 749331141 (building=commercial, building:levels=39, height=160 m), in model metres.

export const id = 'vincom';

const LOT_RING = [[543.8, 622.8], [601.7, 627.4], [611.4, 655.8], [574.1, 690.3], [541.0, 655.7]];
const MELIA_WIDTH = 24.6; // hotel entrance bay: west end of the Hà Nội front, its first three bays

const PODIUM_GRANITE_H = 10.2;
const PODIUM_CREAM_H = 23.2;
const PODIUM_BAND_H = 24.6;
const PODIUM_EAVE_H = 26.2;

const TOWER_BASE_H = 30.0;
const TOWER_SHAFT_TOP_H = 151.0;
const TOWER_TOTAL_H = 160.0;

const COLORS = {
  granite: hex('#b3a284'), stone: hex('#d8cebb'), pilaster: hex('#e2dac9'), band: hex('#3a3b3d'),
  eave: hex('#2f3235'), roof: hex('#9a978f'), panel: hex('#24292f'), grille: hex('#8d8a84'),
  glass: hex('#4f6c88'), lobby: hex('#5d7a90'), mullion: hex('#a9b8c4'), endClad: hex('#a89a80'),
  red: hex('#c4122f'), pave: hex('#c3bcae'), green: hex('#4d6b35'), rail: hex('#cfdde4'),
  lattice: hex('#3b3e41'), chevron: hex('#a9a69e'),
  mgranite: hex('#ccb791'), paleGlass: hex('#a7b8b0'), paleMull: hex('#dfe5e1'), upGlass: hex('#55625f'), letters: hex('#a9c2b6'),
  grey: hex('#79828c'), louvre: hex('#5f676f'), clad: hex('#c9b996'),
};
const POSTER_COLORS = ['#3b5f86', '#9b3a3c', '#4d7a5a', '#b48a3c', '#5d4a78', '#8a8478'].map(hex);

// offset a convex ring outward (dist > 0) or inward, edge by edge
function offsetRing(ring, dist) {
  const count = ring.length;
  const winding = signedArea(ring) > 0 ? 1 : -1;
  const lines = [];
  for (let i = 0; i < count; i++) {
    const ptA = ring[i], ptB = ring[(i + 1) % count];
    const edgeLen = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
    const nx = ((ptB[1] - ptA[1]) / edgeLen) * winding;
    const nz = (-(ptB[0] - ptA[0]) / edgeLen) * winding;
    lines.push([[ptA[0] + nx * dist, ptA[1] + nz * dist], [ptB[0] + nx * dist, ptB[1] + nz * dist]]);
  }
  return lines.map((line, i) => intersectLines(lines[(i + count - 1) % count], line));
}

function intersectLines([p1, p2], [p3, p4]) {
  const d1 = [p2[0] - p1[0], p2[1] - p1[1]], d2 = [p4[0] - p3[0], p4[1] - p3[1]];
  const denom = d1[0] * d2[1] - d1[1] * d2[0];
  if (Math.abs(denom) < 1e-9) return p3;
  const t = ((p3[0] - p1[0]) * d2[1] - (p3[1] - p1[1]) * d2[0]) / denom;
  return [p1[0] + d1[0] * t, p1[1] + d1[1] * t];
}

function signedArea(ring) {
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const ptA = ring[i], ptB = ring[(i + 1) % ring.length];
    area += ptA[0] * ptB[1] - ptB[0] * ptA[1];
  }
  return area / 2;
}

function ringCentroid(ring) {
  let sumX = 0, sumZ = 0, area2 = 0;
  for (let i = 0; i < ring.length; i++) {
    const ptA = ring[i], ptB = ring[(i + 1) % ring.length];
    const cross = ptA[0] * ptB[1] - ptB[0] * ptA[1];
    area2 += cross;
    sumX += (ptA[0] + ptB[0]) * cross;
    sumZ += (ptA[1] + ptB[1]) * cross;
  }
  return [sumX / (3 * area2), sumZ / (3 * area2)];
}

function windingSign(ring) { return signedArea(ring) > 0 ? 1 : -1; }
function frac(val) { return val - Math.floor(val); }

function buildPodium(S, goldLightBuf, y0, sgn) {
  S.kind = KIND.PLAIN;
  S.prism(LOT_RING, y0 - 0.3, y0 + PODIUM_GRANITE_H, COLORS.granite, COLORS.granite, { top: false });
  S.prism(LOT_RING, y0 + PODIUM_GRANITE_H, y0 + PODIUM_CREAM_H, COLORS.stone, COLORS.stone, { top: false });
  S.prism(offsetRing(LOT_RING, 0.25), y0 + PODIUM_CREAM_H, y0 + PODIUM_BAND_H, COLORS.band, COLORS.band, { top: false });
  S.prism(offsetRing(LOT_RING, 1.6), y0 + PODIUM_BAND_H, y0 + PODIUM_EAVE_H, COLORS.eave, COLORS.roof, { topKind: KIND.FLAT });
  S.prism(offsetRing(LOT_RING, 1.6), y0 + PODIUM_BAND_H - 0.01, y0 + PODIUM_BAND_H, COLORS.eave, shade(COLORS.eave, 0.6), { top: false });

  const eaveRing = offsetRing(LOT_RING, 1.35);
  const planterRing = offsetRing(LOT_RING, 0.2);

  for (let i = 0; i < LOT_RING.length; i++) {
    const ptA = LOT_RING[i], ptB = LOT_RING[(i + 1) % LOT_RING.length];
    const edgeLen = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
    const tangent = [(ptB[0] - ptA[0]) / edgeLen, (ptB[1] - ptA[1]) / edgeLen];
    const normal = [tangent[1] * sgn, -tangent[0] * sgn];
    const ang = Math.atan2(tangent[1], tangent[0]);
    const at = (along, out): [number, number] => [
      ptA[0] + tangent[0] * along + normal[0] * out,
      ptA[1] + tangent[1] * along + normal[1] * out,
    ];
    const isEntrance = i === 1;
    if (i === 4) continue; // west flank is the hotel's grey stone block, not shop bays
    const isBlank = i === 3;
    const bayCount = Math.max(2, Math.round(edgeLen / 7.6));
    const bayWidth = edgeLen / bayCount;
    const normal3 = [normal[0], 0, normal[1]];

    for (let k = 0; k <= bayCount; k++) {
      const pt = at(k * bayWidth, 0.18);
      S.box(pt[0], pt[1], y0 + PODIUM_GRANITE_H, y0 + PODIUM_CREAM_H, isBlank ? 2.0 : 1.2, 0.36, ang, COLORS.pilaster);
      if (isBlank) {
        const outerPt = at(k * bayWidth, 0.42);
        S.box(outerPt[0], outerPt[1], y0 + PODIUM_GRANITE_H, y0 + PODIUM_CREAM_H - 0.6, 1.1, 0.3, ang, shade(COLORS.pilaster, 1.04));
      }
      S.box(pt[0], pt[1], y0, y0 + PODIUM_GRANITE_H, 1.3, 0.4, ang, shade(COLORS.granite, 0.85));
    }
    if (isBlank) {
      const midPt = at(edgeLen / 2, 0.06);
      S.box(midPt[0], midPt[1], y0 + PODIUM_GRANITE_H - 0.35, y0 + PODIUM_GRANITE_H + 0.15, edgeLen - 1, 0.3, ang, shade(COLORS.granite, 1.1));
    }

    for (let k = 0; k < bayCount; k++) {
      const along = (k + 0.5) * bayWidth;
      if (isBlank) continue;
      if (isEntrance && Math.abs(along - edgeLen / 2) < 9.5) continue;
      if (i === 0 && along < MELIA_WIDTH) continue;
      const bayPt = at(along, 0.07);
      const panelW = bayWidth - 2.0;

      if (i === 2 && k === bayCount - 1) {
        S.box(bayPt[0], bayPt[1], y0 + PODIUM_GRANITE_H + 0.8, y0 + 21.8, panelW, 0.1, ang, shade(COLORS.stone, 1.03));
        const doorPt = at(along + 0.8, 0.1), canopyPt = at(along + 0.8, 1.0);
        S.box(doorPt[0], doorPt[1], y0 + 0.75, y0 + 4.3, 3.0, 0.14, ang, hex('#2a2e31'));
        S.box(doorPt[0], doorPt[1], y0 + 2.45, y0 + 2.6, 3.0, 0.2, ang, shade(COLORS.mullion, 0.7));
        S.box(doorPt[0], doorPt[1], y0 + 0.75, y0 + 4.3, 0.12, 0.2, ang, shade(COLORS.mullion, 0.7));
        S.box(canopyPt[0], canopyPt[1], y0 + 4.6, y0 + 4.95, 4.6, 2.0, ang, COLORS.eave, { bottom: true });
        for (let step = 0; step < 4; step++) {
          const stepPt = at(along + 0.8, 0.5 + (3 - step) * 0.35);
          S.box(stepPt[0], stepPt[1], y0, y0 + 0.2 + step * 0.18, 4.2, 0.36 + 0.02 * step, ang, shade(COLORS.granite, 1.05 - step * 0.03));
        }
        continue;
      }

      S.box(bayPt[0], bayPt[1], y0 + 0.3, y0 + 5.0, panelW + 0.4, 0.12, ang, hex('#2c2f31'));
      for (let m = 1; m < 4; m++) {
        const mullPt = at(along + (m - 2) * (panelW / 4), 0.14);
        S.box(mullPt[0], mullPt[1], y0 + 0.3, y0 + 5.0, 0.1, 0.08, ang, shade(COLORS.grille, 0.9));
      }
      S.box(bayPt[0], bayPt[1], y0 + 5.8, y0 + 9.3, panelW, 0.12, ang, COLORS.lattice);
      drawChevrons(S, (uu, yy, out) => { const pt = at(uu, out); return [pt[0], yy, pt[1]]; }, normal3, along, panelW, y0 + 6.0, y0 + 9.1, 4, 0.14, COLORS.chevron);

      const hasPoster = i === 0 ? along < MELIA_WIDTH + 3 * bayWidth : (k * 2 + i) % 5 === 0;
      if (hasPoster) {
        const posterCol = POSTER_COLORS[(k * 3 + i) % POSTER_COLORS.length];
        S.box(bayPt[0], bayPt[1], y0 + PODIUM_GRANITE_H + 0.8, y0 + 20.4, panelW, 0.12, ang, shade(posterCol, 0.7));
        const frontPt = at(along, 0.1);
        S.box(frontPt[0], frontPt[1], y0 + 15.8, y0 + 19.9, panelW - 0.6, 0.12, ang, posterCol);
        S.box(frontPt[0], frontPt[1], y0 + 13.6, y0 + 15.4, panelW - 0.6, 0.12, ang, hex('#e4dccb'));
        S.box(frontPt[0], frontPt[1], y0 + PODIUM_GRANITE_H + 1.3, y0 + 13.2, panelW - 0.6, 0.12, ang, shade(POSTER_COLORS[(k * 3 + i + 2) % POSTER_COLORS.length], 1.1));
        S.box(bayPt[0], bayPt[1], y0 + PODIUM_GRANITE_H + 0.6, y0 + PODIUM_GRANITE_H + 0.8, panelW + 0.1, 0.16, ang, COLORS.panel);
      } else {
        S.box(bayPt[0], bayPt[1], y0 + PODIUM_GRANITE_H + 0.8, y0 + 20.4, panelW, 0.12, ang, COLORS.panel);
        for (let m = 1; m < 5; m++) {
          const mullPt = at(along + (m - 2.5) * (panelW / 5), 0.15);
          S.box(mullPt[0], mullPt[1], y0 + PODIUM_GRANITE_H + 0.8, y0 + 20.4, 0.1, 0.08, ang, shade(COLORS.grille, 1.1));
        }
        S.box(bayPt[0], bayPt[1], y0 + 15.4, y0 + 15.7, panelW, 0.16, ang, shade(COLORS.grille, 1.1));
      }

      S.box(bayPt[0], bayPt[1], y0 + 20.7, y0 + 22.7, panelW, 0.14, ang, COLORS.lattice);
      drawChevrons(S, (uu, yy, out) => { const pt = at(uu, out); return [pt[0], yy, pt[1]]; }, normal3, along, panelW, y0 + 20.8, y0 + 22.6, 3, 0.16, COLORS.chevron);
      const glowPt = at(along, 0.2);
      goldLightBuf.box(glowPt[0], glowPt[1], y0 + 20.75, y0 + 22.65, panelW - 0.2, 0.05, ang, [1, 1, 1], { top: [1, 1, 1] });
    }

    const railA = eaveRing[i], railB = eaveRing[(i + 1) % LOT_RING.length];
    S.beam([railA[0], y0 + PODIUM_EAVE_H + 0.55, railA[1]], [railB[0], y0 + PODIUM_EAVE_H + 0.55, railB[1]], 0.06, 1.1, COLORS.rail);
    S.beam([railA[0], y0 + PODIUM_EAVE_H + 1.12, railA[1]], [railB[0], y0 + PODIUM_EAVE_H + 1.12, railB[1]], 0.1, 0.06, shade(COLORS.rail, 0.7));
    const plantA = planterRing[i], plantB = planterRing[(i + 1) % LOT_RING.length];
    S.beam([plantA[0], y0 + PODIUM_EAVE_H + 0.3, plantA[1]], [plantB[0], y0 + PODIUM_EAVE_H + 0.3, plantB[1]], 1.1, 0.6, COLORS.green);
  }
}

function buildEntranceAndForecourt(S, goldLightBuf, redLightBuf, y0, edgeA, edgeB, edgeLen, edgeTan, edgeNorm) {
  const mid = [(edgeA[0] + edgeB[0]) / 2, (edgeA[1] + edgeB[1]) / 2];
  const atPav = (along, out): [number, number] => [
    mid[0] + edgeTan[0] * along + edgeNorm[0] * out,
    mid[1] + edgeTan[1] * along + edgeNorm[1] * out,
  ];
  const pavW = 18, pavD = 3.0, pavTop = PODIUM_EAVE_H + 2.6;
  const ang = Math.atan2(edgeTan[1], edgeTan[0]);
  const pavCenter = atPav(0, pavD / 2 - 0.5);

  S.box(pavCenter[0], pavCenter[1], y0, y0 + PODIUM_GRANITE_H, pavW, pavD + 1, ang, COLORS.granite);
  S.box(pavCenter[0], pavCenter[1], y0 + PODIUM_GRANITE_H, y0 + pavTop, pavW, pavD + 1, ang, COLORS.stone, { top: COLORS.roof, topKind: KIND.FLAT });
  S.box(pavCenter[0], pavCenter[1], y0 + pavTop, y0 + pavTop + 0.5, pavW + 0.6, pavD + 1.6, ang, COLORS.band);
  for (const side of [-1, 1]) {
    const pilPt = atPav(side * (pavW / 2 - 0.9), pavD);
    S.box(pilPt[0], pilPt[1], y0 + PODIUM_GRANITE_H, y0 + pavTop, 1.8, 0.4, ang, COLORS.pilaster);
  }

  const front = (out) => atPav(0, pavD + out);
  const framePt = front(0.05);
  S.box(framePt[0], framePt[1], y0, y0 + 15.5, 11.0, 0.3, ang, shade(COLORS.granite, 0.8));
  const glassPt = front(0.22);
  S.box(glassPt[0], glassPt[1], y0 + 0.2, y0 + 14.8, 9.4, 0.12, ang, COLORS.lobby);
  for (let k = -3; k <= 3; k++) {
    const mullPt = atPav(k * 1.34, pavD + 0.32);
    S.box(mullPt[0], mullPt[1], y0 + 0.2, y0 + 14.8, 0.12, 0.1, ang, shade(COLORS.mullion, 0.8));
  }
  for (const height of [5.2, 10.0]) S.box(glassPt[0], glassPt[1], y0 + height, y0 + height + 0.2, 9.4, 0.18, ang, shade(COLORS.mullion, 0.8));

  const canopyPt = atPav(0, pavD + 2.4);
  S.box(canopyPt[0], canopyPt[1], y0 + 5.0, y0 + 5.45, 12.0, 4.8, ang, COLORS.eave, { bottom: true });
  for (const side of [-1, 1]) {
    const postPt = atPav(side * 5.4, pavD + 4.4);
    S.cyl(postPt[0], postPt[1], y0, y0 + 5.0, 0.16, 0.16, 6, COLORS.band);
  }
  goldLightBuf.box(canopyPt[0], canopyPt[1], y0 + 4.98, y0 + 5.0, 11.4, 4.2, ang, [1, 1, 1], { bottom: true });

  const signPanelPt = front(0.25);
  S.box(signPanelPt[0], signPanelPt[1], y0 + PODIUM_BAND_H - 0.2, y0 + pavTop - 0.4, 15.5, 0.16, ang, COLORS.pilaster);
  const signText = 'VINCOM PLAZA', letterPitch = 1.05;
  for (let k = 0; k < signText.length; k++) {
    if (signText[k] === ' ') continue;
    const chPt = atPav((k - (signText.length - 1) / 2) * letterPitch, pavD + 0.4);
    S.box(chPt[0], chPt[1], y0 + PODIUM_BAND_H + 0.25, y0 + PODIUM_BAND_H + 2.15, letterPitch * 0.78, 0.12, ang, COLORS.red);
    redLightBuf.box(chPt[0], chPt[1], y0 + PODIUM_BAND_H + 0.25, y0 + PODIUM_BAND_H + 2.15, letterPitch * 0.78, 0.16, ang, [1, 1, 1]);
  }
  for (const side of [-1, 1]) {
    const bannerPt = atPav(side * 7.0, pavD + 0.25);
    S.box(bannerPt[0], bannerPt[1], y0 + 6.0, y0 + 21.5, 2.4, 0.12, ang, side < 0 ? POSTER_COLORS[1] : POSTER_COLORS[0]);
  }

  // Forecourt paving, steps, and kerb planters
  const outStart = 13.5, outEnd = 4.0;
  const paveA = [edgeA[0] - edgeTan[0] * 6, edgeA[1] - edgeTan[1] * 6];
  const paveB = [edgeB[0], edgeB[1]];
  const forecourtRing = [
    paveA, paveB,
    [paveB[0] + edgeNorm[0] * outEnd, paveB[1] + edgeNorm[1] * outEnd],
    [edgeA[0] + edgeNorm[0] * outStart, edgeA[1] + edgeNorm[1] * outStart],
    [paveA[0] + edgeNorm[0] * 9, paveA[1] + edgeNorm[1] * 9],
  ];
  S.kind = KIND.PLAIN;
  S.prism(forecourtRing, y0 - 0.2, y0 + 0.12, shade(COLORS.pave, 0.9), COLORS.pave);
  for (let k = 0; k < 2; k++) {
    const stepPt = [mid[0] + edgeNorm[0] * (3.4 + 2.2 - k * 0.6), mid[1] + edgeNorm[1] * (3.4 + 2.2 - k * 0.6)];
    S.box(stepPt[0], stepPt[1], y0 + 0.12, y0 + 0.28 + k * 0.16, 14 - k, 2.4 - k * 0.6, ang, shade(COLORS.pave, 1.05 - k * 0.05));
  }
  for (let k = 0; k < 5; k++) {
    const along = 1.5 + k * 6.4;
    const outDist = outStart - 1.4 - (outStart - outEnd) * (along / edgeLen);
    if (outDist < 2.6) continue;
    const planterPt = [edgeA[0] + edgeTan[0] * along + edgeNorm[0] * outDist, edgeA[1] + edgeTan[1] * along + edgeNorm[1] * outDist];
    S.box(planterPt[0], planterPt[1], y0 + 0.12, y0 + 0.7, 2.6, 1.0, ang, shade(COLORS.granite, 1.2));
    S.box(planterPt[0], planterPt[1], y0 + 0.7, y0 + 1.15, 2.3, 0.8, ang, COLORS.green);
  }
}

function buildMeliaEntrance(S, whiteLightBuf, goldLightBuf, y0, localToWorld, localBox, dirV, uAng) {
  const faceV = -3.3, uWest = -3.75, uEast = MELIA_WIDTH - 1.9;
  const midU = (uWest + uEast) / 2, bayWidth = uEast - uWest;
  const face = (along, height, out) => { const pt = localToWorld(along, faceV - out); return [pt[0], y0 + height, pt[1]]; };
  const faceNorm = [-dirV[0], 0, -dirV[1]];
  const faceBox = (along, out, y1, y2, sizeU, sizeOut, col, opt?) => localBox(along, faceV - out, y1, y2, sizeU, sizeOut, col, opt);

  localBox(midU, (faceV - 0.9) / 2, -0.3, 15.0, bayWidth, -0.9 - faceV, COLORS.mgranite, { top: shade(COLORS.mgranite, 1.1) });
  localBox(midU, (faceV - 0.9) / 2, 15.0, 27.4, bayWidth, -0.9 - faceV, COLORS.pilaster, { top: COLORS.roof, topKind: KIND.FLAT });
  faceBox(midU, 0.12, 14.7, 15.2, bayWidth + 0.2, 0.5, shade(COLORS.mgranite, 1.15));
  faceBox(midU, 0.1, 27.4, 27.8, bayWidth + 0.4, 0.6, shade(COLORS.pilaster, 0.92), { top: COLORS.roof });
  localBox(midU, faceV + 0.9, 27.8, 28.5, bayWidth - 1.2, 1.0, COLORS.green);

  const flecks = [shade(COLORS.mgranite, 1.12), shade(COLORS.mgranite, 0.88), hex('#dccb9f'), hex('#a8916b')];
  for (let k = 0; k < 900; k++) {
    const hash1 = frac(Math.sin(k * 12.9898) * 43758.5453);
    const hash2 = frac(Math.sin(k * 78.233 + 1.3) * 24634.6345);
    const along = uWest + 0.2 + hash1 * (bayWidth - 0.4);
    const height = 0.3 + hash2 * 14.3;
    const halfLen = 0.05 + 0.09 * frac(hash1 * 7.1);
    const tilt = 1.3 * (frac(hash2 * 3.7) - 0.5);
    drawStrip(
      S, face, faceNorm,
      along - halfLen * Math.cos(tilt), height - halfLen * Math.sin(tilt),
      along + halfLen * Math.cos(tilt), height + halfLen * Math.sin(tilt),
      0.06 + 0.08 * frac(hash2 * 5.3), 0.02, flecks[k % 4],
    );
  }

  for (let k = -1; k <= 1; k++) {
    const along = midU + k * 7.6;
    faceBox(along, 0.05, 0.25, 5.2, 6.0, 0.14, shade(COLORS.mgranite, 0.7));
    faceBox(along, 0.1, 0.35 + (k === 0 ? 0.55 : 0), 5.0, 5.4, 0.12, hex('#262b2f'));
    for (let m = -2; m <= 2; m++) faceBox(along + m * 1.08, 0.14, 0.35, 5.0, 0.1, 0.08, shade(COLORS.mullion, 0.6));
    faceBox(along, 0.14, 2.9, 3.05, 5.4, 0.1, shade(COLORS.mullion, 0.6));
    if (k === 0) faceBox(along, 0.12, 0.9, 3.4, 2.4, 0.14, hex('#4d5960'));

    faceBox(along, 0.05, 6.3, 13.6, 6.0, 0.14, shade(COLORS.mgranite, 0.66));
    faceBox(along, 0.1, 6.5, 13.4, 5.6, 0.12, COLORS.paleGlass);
    for (let m = -2; m <= 2; m++) faceBox(along + m * 1.12, 0.14, 6.5, 13.4, 0.12, 0.08, COLORS.paleMull);
    faceBox(along, 0.14, 10.0, 10.15, 5.6, 0.1, COLORS.paleMull);

    faceBox(along, 0.06, 16.0, 25.6, 5.8, 0.12, shade(COLORS.pilaster, 0.9));
    faceBox(along, 0.1, 16.2, 23.0, 5.4, 0.12, COLORS.upGlass);
    for (let m = -1; m <= 1; m++) faceBox(along + m * 1.35, 0.14, 16.2, 23.0, 0.12, 0.08, shade(COLORS.mullion, 0.75));
    faceBox(along, 0.14, 19.6, 19.75, 5.4, 0.1, shade(COLORS.mullion, 0.75));
    faceBox(along, 0.1, 23.3, 25.4, 5.4, 0.12, COLORS.lattice);
    drawChevrons(S, face, faceNorm, along, 5.2, 23.4, 25.3, 3, 0.16, COLORS.chevron);
    goldLightBuf.box(...localToWorld(along, faceV - 0.2), y0 + 23.35, y0 + 25.35, 5.2, 0.05, uAng, [1, 1, 1], { top: [1, 1, 1] });
  }

  for (const along of [uWest + 0.6, midU - 3.8, midU + 3.8, uEast - 0.6]) {
    faceBox(along, 0.2, 15.2, 27.4, 1.2, 0.4, shade(COLORS.pilaster, 1.04));
  }
  faceBox(midU, 1.6, 5.4, 5.85, 19.0, 3.2, COLORS.eave, { bottom: true });
  goldLightBuf.box(...localToWorld(midU, faceV - 1.6), y0 + 5.38, y0 + 5.4, 18.4, 2.8, uAng, [1, 1, 1], { bottom: true });
  for (const side of [-1, 1]) S.beam(face(midU + side * 6.5, 5.85, 3.0), face(midU + side * 4.5, 11.8, 0.1), 0.1, 0.1, COLORS.mullion);

  const faceRev = (along, height, out) => face(-along, height, out);
  drawLettering(S, faceRev, faceNorm, 'MELIÃ VINPEARL HUE', -midU, 5.9, 1.15, 0.92, 3.05, COLORS.letters);
  drawLettering(whiteLightBuf, faceRev, faceNorm, 'MELIÃ VINPEARL HUE', -midU, 5.9, 1.15, 0.92, 3.1, [1, 1, 1]);

  for (let step = 0; step < 3; step++) {
    faceBox(midU, 0.4 + (2 - step) * 0.45, 0, 0.2 + step * 0.2, 7.2 - step * 0.4, 0.9, shade(COLORS.mgranite, 1.08 - step * 0.04));
  }
  for (const [uStart, uEnd] of ([[uWest + 0.4, midU - 4.4], [midU + 4.4, uEast - 0.4]] as any[])) {
    faceBox((uStart + uEnd) / 2, 0.85, 0, 1.0, uEnd - uStart, 1.5, COLORS.green);
  }
}

function buildHotelBaseAndTower(S, whiteLightBuf, aviationLightBuf, windowLightBuf, y0, localToWorld, localToWorld3, localBox, uAng) {
  const basePlan = [
    localToWorld(-3.75, -0.9), localToWorld(-3.75, 26), localToWorld(26.6, 39.0),
    localToWorld(26.6, 16.8), localToWorld(12.4, -0.9),
  ];
  S.kind = KIND.PLAIN;
  S.prism(basePlan, y0 - 0.3, y0 + TOWER_BASE_H, COLORS.grey, COLORS.roof, { topKind: KIND.FLAT });
  for (const [v0, v1] of ([[1.5, 11.5], [13.0, 23.5]] as any[])) localBox(-3.82, (v0 + v1) / 2, 22.4, 24.1, 0.12, v1 - v0, COLORS.panel);
  for (let y = 4; y < 29; y += 4.2) localBox(-3.8, 12.6, y, y + 0.08, 0.06, 26.6, shade(COLORS.grey, 0.85));

  localBox(1.5, 12.8, TOWER_BASE_H, 38.5, 9.5, 22.0, COLORS.grey, { top: COLORS.roof, topKind: KIND.FLAT });
  for (let k = 0; k < 9; k++) {
    localBox(-3.28, 3.0 + k * 2.4, 34.4, 38.0, 0.12, 1.9, COLORS.louvre);
    for (let y = 34.8; y < 38; y += 0.6) localBox(-3.36, 3.0 + k * 2.4, y, y + 0.07, 0.06, 1.9, shade(COLORS.louvre, 0.8));
  }
  for (let k = 0; k < 3; k++) {
    localBox(-1.5 + k * 3.0, 1.73, 34.4, 38.0, 2.4, 0.12, COLORS.louvre);
    for (let y = 34.8; y < 38; y += 0.6) localBox(-1.5 + k * 3.0, 1.65, y, y + 0.07, 2.4, 0.06, shade(COLORS.louvre, 0.8));
  }
  S.beam(localToWorld3(5, -0.75, 30.6), localToWorld3(12.2, -0.75, 30.6), 0.06, 1.1, COLORS.rail);

  const towerPlan = [localToWorld(0, 0), localToWorld(0, 20), localToWorld(26, 38), localToWorld(26, 17), localToWorld(12, 0)];
  const towerCenter = localToWorld(12.5, 18.5);
  S.prism(towerPlan, y0 + TOWER_BASE_H, y0 + TOWER_SHAFT_TOP_H, COLORS.glass, COLORS.roof, { topKind: KIND.FLAT });
  for (let y = TOWER_BASE_H + 4.2; y < TOWER_SHAFT_TOP_H - 1; y += 4.2) {
    S.prism(offsetRing(towerPlan, 0.04), y0 + y, y0 + y + 0.12, shade(COLORS.glass, 0.8), COLORS.glass, { top: false });
  }

  const cladW = 8.6;
  localBox(cladW / 2 - 0.15, -0.15, TOWER_BASE_H, TOWER_SHAFT_TOP_H + 0.6, cladW + 0.3, 0.3, COLORS.clad);
  for (let y = TOWER_BASE_H + 4.2; y < TOWER_SHAFT_TOP_H - 1; y += 4.2) {
    localBox(cladW / 2 - 0.15, -0.32, y - 0.1, y + 0.15, cladW + 0.3, 0.06, shade(COLORS.clad, 0.8));
  }
  for (const along of [cladW + 1.1, cladW + 2.3]) S.beam(localToWorld3(along, -0.12, TOWER_BASE_H), localToWorld3(along, -0.12, TOWER_SHAFT_TOP_H), 0.18, 0.18, COLORS.mullion);

  const planWinding = windingSign(towerPlan);
  for (const [idxA, idxB] of ([[0, 1], [1, 2], [2, 3], [3, 4]] as any[])) {
    const ptA = towerPlan[idxA], ptB = towerPlan[idxB];
    const edgeLen = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
    const tangent = [(ptB[0] - ptA[0]) / edgeLen, (ptB[1] - ptA[1]) / edgeLen];
    const normal = [tangent[1] * planWinding, -tangent[0] * planWinding];
    const mullionCount = Math.max(1, Math.round(edgeLen / 1.6));
    for (let k = 1; k < mullionCount; k++) {
      const pt = [ptA[0] + tangent[0] * (edgeLen * k) / mullionCount + normal[0] * 0.12, ptA[1] + tangent[1] * (edgeLen * k) / mullionCount + normal[1] * 0.12];
      S.beam([pt[0], y0 + TOWER_BASE_H, pt[1]], [pt[0], y0 + TOWER_SHAFT_TOP_H, pt[1]], 0.18, 0.18, COLORS.mullion);
    }
    const edgeAng = Math.atan2(tangent[1], tangent[0]);
    for (let floorIdx = 0, y = TOWER_BASE_H + 0.6; y < TOWER_SHAFT_TOP_H - 4; floorIdx++, y += 4.2) {
      for (let k = 0; k < mullionCount; k += 2) {
        const hash = Math.sin(floorIdx * 12.9898 + k * 78.233 + idxA * 37.719) * 43758.5453;
        if (hash - Math.floor(hash) > 0.13) continue;
        const winPt = [
          ptA[0] + tangent[0] * (edgeLen * (k + 1)) / mullionCount + normal[0] * 0.3,
          ptA[1] + tangent[1] * (edgeLen * (k + 1)) / mullionCount + normal[1] * 0.3,
        ];
        windowLightBuf.box(winPt[0], winPt[1], y0 + y, y0 + y + 2.6, (2 * edgeLen / mullionCount) - 0.5, 0.08, edgeAng, [1, 1, 1]);
      }
    }
  }

  for (const corner of [towerPlan[3], towerPlan[4]]) S.beam([corner[0], y0 + TOWER_BASE_H, corner[1]], [corner[0], y0 + TOWER_SHAFT_TOP_H + 0.6, corner[1]], 0.5, 0.5, COLORS.mullion);
  S.prism(offsetRing(towerPlan, 0.35), y0 + TOWER_SHAFT_TOP_H, y0 + TOWER_SHAFT_TOP_H + 1.4, COLORS.endClad, COLORS.roof, { topKind: KIND.FLAT });

  const frameRing = offsetRing(towerPlan, 0.25);
  const frameY0 = y0 + TOWER_SHAFT_TOP_H + 1.4, frameY1 = y0 + TOWER_TOTAL_H - 2.6;
  for (let i = 0; i < frameRing.length; i++) {
    const ptA = frameRing[i], ptB = frameRing[(i + 1) % frameRing.length];
    const edgeLen = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
    const postCount = Math.max(1, Math.round(edgeLen / 2.4));
    for (let k = 0; k < postCount; k++) {
      const fracPos = k / postCount;
      const postPt = [ptA[0] + (ptB[0] - ptA[0]) * fracPos, ptA[1] + (ptB[1] - ptA[1]) * fracPos];
      S.beam([postPt[0], frameY0, postPt[1]], [postPt[0], frameY1, postPt[1]], 0.2, 0.2, COLORS.mullion);
    }
    for (const y of [frameY1 - 0.1, (frameY0 + frameY1) / 2]) S.beam([ptA[0], y, ptA[1]], [ptB[0], y, ptB[1]], 0.25, 0.3, COLORS.mullion);
    whiteLightBuf.beam([ptA[0], frameY1 + 0.15, ptA[1]], [ptB[0], frameY1 + 0.15, ptB[1]], 0.25, 0.25, [1, 1, 1]);
    whiteLightBuf.beam([ptA[0], y0 + TOWER_SHAFT_TOP_H + 0.7, ptA[1]], [ptB[0], y0 + TOWER_SHAFT_TOP_H + 0.7, ptB[1]], 0.2, 0.2, [1, 1, 1]);
  }

  S.box(towerCenter[0], towerCenter[1], y0 + TOWER_SHAFT_TOP_H + 1.4, y0 + TOWER_TOTAL_H - 3.4, 11, 14, uAng, hex('#c9cdd0'), { top: COLORS.roof, topKind: KIND.FLAT });
  S.cyl(towerCenter[0], towerCenter[1], y0 + TOWER_TOTAL_H - 3.4, y0 + TOWER_TOTAL_H - 0.3, 0.25, 0.06, 5, hex('#d8dadb'));
  aviationLightBuf.box(towerCenter[0], towerCenter[1], y0 + TOWER_TOTAL_H - 0.4, y0 + TOWER_TOTAL_H, 0.35, 0.35, 0, [1, 1, 1]);
  for (const corner of [towerPlan[3], towerPlan[4]]) whiteLightBuf.beam([corner[0], y0 + TOWER_BASE_H, corner[1]], [corner[0], y0 + TOWER_SHAFT_TOP_H, corner[1]], 0.14, 0.14, [1, 1, 1]);
}

function buildWestYard(S) {
  const yardGroundY = LAND_Y + rise(531, 628);
  S.kind = KIND.PLAIN;
  S.prism([[520.6, 614.6], [543.4, 616.4], [543.7, 622.9], [541.9, 643], [520.2, 643]], yardGroundY - 0.25, yardGroundY + 0.06, shade(COLORS.pave, 0.9), shade(COLORS.pave, 0.96));
  const rampX = 530.5, rampZ0 = 621, rampZ1 = 640, rampLen = rampZ1 - rampZ0, rampCenterZ = (rampZ0 + rampZ1) / 2;
  S.box(rampX, rampCenterZ, yardGroundY + 0.06, yardGroundY + 0.09, 6.2, rampLen, 0, hex('#55585a'));
  for (const sideX of [-1, 1]) S.box(rampX + sideX * 3.25, rampCenterZ, yardGroundY, yardGroundY + 1.0, 0.3, rampLen, 0, shade(COLORS.grey, 1.1));
  S.box(rampX, rampCenterZ + 0.5, yardGroundY + 3.5, yardGroundY + 3.75, 7.8, rampLen + 1, 0, hex('#9ba2a7'), { bottom: true });
  for (const sideX of [-1, 1]) {
    for (let k = 0; k <= 3; k++) S.box(rampX + sideX * 3.6, rampZ0 + (rampLen * k) / 3, yardGroundY + 1.0, yardGroundY + 3.5, 0.2, 0.2, 0, hex('#7d858b'));
  }
  S.box(rampX, rampZ0 - 0.1, yardGroundY + 2.55, yardGroundY + 3.45, 7.2, 0.16, 0, hex('#2c3136'));
  for (let k = 0; k < 5; k++) {
    S.box(rampX - 2.6 + k * 1.3, rampZ0 - 0.22, yardGroundY + 2.75, yardGroundY + 3.25, 0.7, 0.04, 0, k === 0 ? COLORS.red : k % 2 ? hex('#e9c94a') : hex('#e8ecee'));
  }
  S.box(538.6, 625, yardGroundY, yardGroundY + 3.2, 4.0, 5.0, 0, COLORS.grey, { top: COLORS.roof });
  for (const [x, z, height] of ([[523.6, 618.6, 9.2], [523.2, 628.4, 10.4], [524.2, 637.4, 8.6], [536.8, 634.2, 9.6]] as any[])) {
    drawPalm(S, [x, z], yardGroundY, height);
  }
}

export function build({ S, group }) {
  const center = ringCentroid(LOT_RING);
  const y0 = LAND_Y + rise(center[0], center[1]);
  const sgn = windingSign(LOT_RING);

  const edgeA = LOT_RING[1], edgeB = LOT_RING[2];
  const edgeLen = Math.hypot(edgeB[0] - edgeA[0], edgeB[1] - edgeA[1]);
  const edgeTan = [(edgeB[0] - edgeA[0]) / edgeLen, (edgeB[1] - edgeA[1]) / edgeLen];
  const edgeNorm = [edgeTan[1] * sgn, -edgeTan[0] * sgn];

  const whiteLightBuf = new Buf(2048);
  const goldLightBuf = new Buf(512);
  const redLightBuf = new Buf(256);
  const aviationLightBuf = new Buf(32);
  const windowLightBuf = new Buf(2048);
  S.base = y0 - LAND_Y;

  buildPodium(S, goldLightBuf, y0, sgn);
  buildEntranceAndForecourt(S, goldLightBuf, redLightBuf, y0, edgeA, edgeB, edgeLen, edgeTan, edgeNorm);

  const northA = LOT_RING[0], northB = LOT_RING[1];
  const northLen = Math.hypot(northB[0] - northA[0], northB[1] - northA[1]);
  const dirU = [(northB[0] - northA[0]) / northLen, (northB[1] - northA[1]) / northLen];
  const dirV = [-dirU[1], dirU[0]];
  const towerOrigin = [northA[0] + dirU[0] * 1.9 + dirV[0] * 1.4, northA[1] + dirU[1] * 1.9 + dirV[1] * 1.4];
  const localToWorld = (alongU, alongV): [number, number] => [
    towerOrigin[0] + dirU[0] * alongU + dirV[0] * alongV,
    towerOrigin[1] + dirU[1] * alongU + dirV[1] * alongV,
  ];
  const uAng = Math.atan2(dirU[1], dirU[0]);
  const localToWorld3 = (alongU, alongV, y) => { const pt = localToWorld(alongU, alongV); return [pt[0], y0 + y, pt[1]]; };
  const localBox = (alongU, alongV, y1, y2, sizeU, sizeV, col, opt?) => {
    const pt = localToWorld(alongU, alongV);
    S.box(pt[0], pt[1], y0 + y1, y0 + y2, sizeU, sizeV, uAng, col, opt);
  };

  buildMeliaEntrance(S, whiteLightBuf, goldLightBuf, y0, localToWorld, localBox, dirV, uAng);
  buildHotelBaseAndTower(S, whiteLightBuf, aviationLightBuf, windowLightBuf, y0, localToWorld, localToWorld3, localBox, uAng);
  buildWestYard(S);

  const lightLayers: [Buf, number, number][] = [
    [whiteLightBuf, 0xd6ecff, 1.3],
    [goldLightBuf, 0xffc56a, 1.5],
    [redLightBuf, 0xff2a3a, 1.8],
    [aviationLightBuf, 0xff2a1a, 2.4],
    [windowLightBuf, 0xffd9a0, 0.9],
  ];
  for (const [buf, col, boost] of lightLayers) {
    if (!buf.n) continue;
    const mesh = new THREE.Mesh(buf.geometry(), lightMaterial(col, boost));
    mesh.renderOrder = 19;
    mesh.userData.landmark = id;
    group.add(mesh);
  }
  S.kind = KIND.PLAIN;
  S.base = 0;
}

function drawPalm(S, pos, y, height) {
  S.kind = KIND.TIMBER;
  const trunk = hex('#8a7a62'), frond = hex('#4f7a3a');
  S.cyl(pos[0], pos[1], y, y + height, 0.24, 0.17, 6, trunk, { cap: false });
  const top = [pos[0] + 0.25, y + height, pos[1]];
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + height, dx = Math.cos(ang), dz = Math.sin(ang);
    const mid = [top[0] + dx * 1.6, top[1] + 0.45, top[2] + dz * 1.6];
    const tip = [top[0] + dx * 3.2, top[1] - 0.9, top[2] + dz * 3.2];
    S.beam(top, mid, 0.7, 0.08, frond);
    S.beam(mid, tip, 0.55, 0.06, shade(frond, 0.9));
  }
  S.kind = KIND.PLAIN;
}

function drawStrip(buf, face, faceNorm, u1, y1, u2, y2, thickness, out, col) {
  const du = u2 - u1, dy = y2 - y1, segLen = Math.hypot(du, dy);
  if (segLen < 1e-6) return;
  const perpU = (-dy / segLen) * thickness / 2, perpY = (du / segLen) * thickness / 2;
  buf.quad(
    face(u1 - perpU, y1 - perpY, out), face(u2 - perpU, y2 - perpY, out),
    face(u2 + perpU, y2 + perpY, out), face(u1 + perpU, y1 + perpY, out),
    col, faceNorm,
  );
}

function drawChevrons(buf, face, faceNorm, centerU, width, yLo, yHi, rows, out, col) {
  const vCount = Math.max(3, Math.round(width / 0.75));
  const vWidth = width / vCount;
  const rowHeight = (yHi - yLo) / rows;
  for (let row = 0; row < rows; row++) {
    const lo = yLo + row * rowHeight + rowHeight * 0.2;
    const hi = yLo + (row + 1) * rowHeight - rowHeight * 0.2;
    for (let k = 0; k < vCount; k++) {
      const u0 = centerU - width / 2 + k * vWidth;
      drawStrip(buf, face, faceNorm, u0, hi, u0 + vWidth / 2, lo, 0.09, out, col);
      drawStrip(buf, face, faceNorm, u0 + vWidth / 2, lo, u0 + vWidth, hi, 0.09, out, col);
    }
  }
}

const GLYPHS = {
  M: [[0, 0, 0, 1], [0, 1, 0.5, 0.35], [0.5, 0.35, 1, 1], [1, 1, 1, 0]],
  E: [[0, 0, 0, 1], [0, 1, 1, 1], [0, 0.5, 0.8, 0.5], [0, 0, 1, 0]],
  L: [[0, 1, 0, 0], [0, 0, 1, 0]],
  I: [[0.5, 0, 0.5, 1]],
  A: [[0, 0, 0.5, 1], [0.5, 1, 1, 0], [0.24, 0.45, 0.76, 0.45]],
  Ã: [[0, 0, 0.5, 1], [0.5, 1, 1, 0], [0.24, 0.45, 0.76, 0.45], [0.2, 1.18, 0.45, 1.3], [0.45, 1.3, 0.55, 1.2], [0.55, 1.2, 0.8, 1.32]],
  V: [[0, 1, 0.5, 0], [0.5, 0, 1, 1]],
  N: [[0, 0, 0, 1], [0, 1, 1, 0], [1, 0, 1, 1]],
  P: [[0, 0, 0, 1], [0, 1, 0.8, 1], [0.8, 1, 1, 0.85], [1, 0.85, 1, 0.62], [1, 0.62, 0.8, 0.47], [0.8, 0.47, 0, 0.47]],
  R: [[0, 0, 0, 1], [0, 1, 0.8, 1], [0.8, 1, 1, 0.85], [1, 0.85, 1, 0.62], [1, 0.62, 0.8, 0.47], [0.8, 0.47, 0, 0.47], [0.45, 0.47, 1, 0]],
  H: [[0, 0, 0, 1], [1, 0, 1, 1], [0, 0.5, 1, 0.5]],
  U: [[0, 1, 0, 0.12], [0, 0.12, 0.15, 0], [0.15, 0, 0.85, 0], [0.85, 0, 1, 0.12], [1, 0.12, 1, 1]],
};

function drawLettering(buf, face, faceNorm, text, centerU, y, height, pitch, out, col) {
  const charW = pitch * 0.72, strokeW = height * 0.13;
  [...text].forEach((ch, k) => {
    const strokes = GLYPHS[ch];
    if (!strokes) return;
    const u0 = centerU + (k - (text.length - 1) / 2) * pitch - charW / 2;
    for (const [x0, y0s, x1, y1s] of strokes) {
      const extend = 0.5 * strokeW;
      const segLen = Math.hypot((x1 - x0) * charW, (y1s - y0s) * height);
      const tx = ((x1 - x0) * charW) / segLen, ty = ((y1s - y0s) * height) / segLen;
      drawStrip(buf, face, faceNorm, u0 + x0 * charW - tx * extend, y + y0s * height - ty * extend, u0 + x1 * charW + tx * extend, y + y1s * height + ty * extend, strokeW, out, col);
    }
  });
}
