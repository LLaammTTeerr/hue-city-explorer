import { KIND, Buf, hex, shade, unflat, inRing } from '../../geo/buf.ts';
import { LAND_Y } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { lightMaterial, glowPoints } from '../../geo/materials.ts';

// Thương Bạc (商舶), the Nguyễn court's office for foreign trade and envoys, on the Hương's north bank by Trần Hưng
// Đạo street, in công viên Thương Bạc. First built 1870 (Tự Đức); rebuilt 1921 (Khải Định) as an octagonal pavilion
// (lầu bát giác). Sources, estimates and the photo audit: docs/places/thuongbac.md.
// Footprint: OSM way 239568223 (building, historic), a near-square 16.2 m × 17.0 m.
export const id = 'thuongbac';

const OUTLINE_RING = [[-362.7, 93.1], [-349.4, 83.8], [-339.6, 97.7], [-352.9, 107.0]];
const OUTLINE_CENTER = [
  OUTLINE_RING.reduce((sum, pt) => sum + pt[0], 0) / 4,
  OUTLINE_RING.reduce((sum, pt) => sum + pt[1], 0) / 4,
];
const AXIS_DIR = (() => {
  const dx = (OUTLINE_RING[2][0] + OUTLINE_RING[3][0] - OUTLINE_RING[0][0] - OUTLINE_RING[1][0]) / 2;
  const dz = (OUTLINE_RING[2][1] + OUTLINE_RING[3][1] - OUTLINE_RING[0][1] - OUTLINE_RING[1][1]) / 2;
  const len = Math.hypot(dx, dz);
  return [dx / len, dz / len];
})();
const PAVILION_SHIFT = [-2.0, 0.0];

const BASE_LENGTH = 14.4;
const BASE_WIDTH = 12.8;
const BASE_HEIGHT = 1.0;
const COURT_RISE = 0.12;
const STAIR_WIDTH = 5.6;
const STAIR_TREAD = 0.34;
const TERRACE_FAR_AXIS = BASE_LENGTH / 2 + 5.4;

const ROOF_COL = hex('#9a7658');
const RIDGE_COL = hex('#eee8dc');
const WHITE_COL = hex('#efece4');
const SHADOW_COL = hex('#3b3631');
const PLASTER_COL = hex('#ebe5d6');
const KERB_COL = hex('#7f8280');
const FLOOR_COL = hex('#c9bca0');
const PAVE_COL = hex('#c4bdb0');
const INLAY_COL = hex('#9c968c');
const SOFFIT_COL = hex('#d9cdb4');
const HEDGE_COL = hex('#3f6a34');
const COUPLET_COL = hex('#d8b24a');
const LANTERN_COL = [1.0, 0.74, 0.38];

function octCircumradius(apothem) {
  return apothem / Math.cos(Math.PI / 8);
}

function drawUpturnedTip(S, endPt, dx, dz, scale = 1) {
  const midPt = [endPt[0] + dx * 0.22 * scale, endPt[1] + 0.12 * scale, endPt[2] + dz * 0.22 * scale];
  const tipPt = [endPt[0] + dx * 0.36 * scale, endPt[1] + 0.3 * scale, endPt[2] + dz * 0.36 * scale];
  S.beam(endPt, midPt, 0.09 * scale, 0.09 * scale, RIDGE_COL);
  S.beam(midPt, tipPt, 0.07 * scale, 0.07 * scale, RIDGE_COL);
  S.box(tipPt[0] - dx * 0.06 * scale, tipPt[2] - dz * 0.06 * scale, tipPt[1] - 0.04 * scale, tipPt[1] + 0.13 * scale, 0.2 * scale, 0.035, Math.atan2(dz, dx), RIDGE_COL);
}

function buildCourtAndBase(data, S, center, at, frontAng, groundY, courtY, baseTopY, terraceY) {
  // Paved court square from OSM
  const courtProbe = at(-25, 0);
  const courtPoly = (data?.green || [])
    .filter(([kind]) => kind === 'paved')
    .map(([, poly]) => unflat(poly[0]))
    .find((ring) => inRing(courtProbe[0], courtProbe[1], ring));
  if (courtPoly) {
    const courtTop = Math.max(...courtPoly.map(([x, z]) => LAND_Y + rise(x, z))) + COURT_RISE;
    S.kind = KIND.MASONRY;
    S.prism(courtPoly, courtTop - COURT_RISE - 0.3, courtTop, KERB_COL, PAVE_COL, { topKind: KIND.ROAD });
    const inlaySlab = (a0, a1, b0, b1) => S.prism([at(a0, b0), at(a1, b0), at(a1, b1), at(a0, b1)], courtTop - 0.05, courtTop + 0.02, INLAY_COL, INLAY_COL, { topKind: KIND.ROAD });
    inlaySlab(-33.4, -10.6, -9.2, 10.2);
    for (const [a, b] of ([[-23.4, -19.8], [-14.5, -20.0], [-32.3, 21.4], [-23.1, 21.6], [-13.7, 21.2], [-5.6, 20.3]] as any[])) {
      inlaySlab(a - 1.45, a + 1.45, b - 1.45, b + 1.45);
    }
  }

  // Base, rear terrace, flights, planters, and crossed-lattice railing
  S.kind = KIND.MASONRY;
  S.box(center[0], center[1], groundY - 0.4, courtY + 0.1, BASE_LENGTH + 0.3, BASE_WIDTH + 0.3, frontAng, KERB_COL, { topKind: KIND.ROAD });
  S.box(center[0], center[1], courtY + 0.1, baseTopY - 0.12, BASE_LENGTH, BASE_WIDTH, frontAng, PLASTER_COL);
  S.box(center[0], center[1], baseTopY - 0.12, baseTopY, BASE_LENGTH + 0.16, BASE_WIDTH + 0.16, frontAng, shade(PLASTER_COL, 1.08), { top: FLOOR_COL, topKind: KIND.ROAD });

  S.box(...at((BASE_LENGTH / 2 + TERRACE_FAR_AXIS) / 2 - 0.2, 0), groundY - 0.3, terraceY, TERRACE_FAR_AXIS - BASE_LENGTH / 2 + 0.4, BASE_WIDTH + 2.4, frontAng, KERB_COL, { top: PAVE_COL, topKind: KIND.ROAD });

  const buildFlight = (axisSign, footY, stepCount) => {
    const riser = (baseTopY - footY) / stepCount;
    const runLen = STAIR_TREAD * (stepCount - 1);
    S.kind = KIND.MASONRY;
    for (let k = 1; k < stepCount; k++) {
      const pt = at(axisSign * (BASE_LENGTH / 2 + STAIR_TREAD * (k - 0.5)), 0);
      S.box(pt[0], pt[1], footY - 0.2, baseTopY - riser * k, STAIR_TREAD, STAIR_WIDTH, frontAng, shade(KERB_COL, k % 2 ? 1.06 : 1.0), { topKind: KIND.ROAD });
    }
    S.kind = KIND.PLAIN;
    for (const side of [-1, 1]) {
      const topPt = at(axisSign * (BASE_LENGTH / 2 - 0.1), side * (STAIR_WIDTH / 2 + 0.18));
      const botPt = at(axisSign * (BASE_LENGTH / 2 + runLen + 0.1), side * (STAIR_WIDTH / 2 + 0.18));
      S.beam([topPt[0], baseTopY + 0.12, topPt[1]], [botPt[0], footY + 0.3, botPt[1]], 0.3, 0.3, WHITE_COL);
      S.box(botPt[0], botPt[1], footY, footY + 0.5, 0.4, 0.4, frontAng, WHITE_COL);
    }
    return runLen;
  };
  const frontRun = buildFlight(-1, courtY, 5);
  const backRun = buildFlight(1, terraceY, 4);

  for (const side of [-1, 1]) {
    const b0 = STAIR_WIDTH / 2 + 0.45, b1 = BASE_WIDTH / 2 + 0.3;
    const a0 = -BASE_LENGTH / 2 - 1.7, a1 = -BASE_LENGTH / 2 - 0.15;
    const pt = at((a0 + a1) / 2, side * (b0 + b1) / 2);
    S.kind = KIND.MASONRY;
    S.box(pt[0], pt[1], courtY - 0.1, courtY + 0.42, a1 - a0, b1 - b0, frontAng, shade(KERB_COL, 1.12), { top: hex('#5a4a38') });
    S.kind = KIND.GROUND;
    S.box(pt[0], pt[1], courtY + 0.42, courtY + 0.82, a1 - a0 - 0.25, b1 - b0 - 0.25, frontAng, HEDGE_COL, { taper: 0.92 });
  }

  const drawRail = (a0, b0, a1, b1) => {
    const ptA = at(a0, b0), ptB = at(a1, b1);
    const len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
    const ang = Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]);
    const ux = Math.cos(ang), uz = Math.sin(ang);
    const mid = [(ptA[0] + ptB[0]) / 2, (ptA[1] + ptB[1]) / 2];
    S.box(mid[0], mid[1], baseTopY, baseTopY + 0.14, len, 0.2, ang, WHITE_COL);
    S.box(mid[0], mid[1], baseTopY + 0.64, baseTopY + 0.76, len + 0.06, 0.22, ang, WHITE_COL);
    const bayCount = Math.max(1, Math.round(len / 1.5));
    for (let i = 0; i <= bayCount; i++) {
      const frac = i / bayCount;
      S.box(ptA[0] + (ptB[0] - ptA[0]) * frac, ptA[1] + (ptB[1] - ptA[1]) * frac, baseTopY, baseTopY + 0.86, 0.24, 0.24, ang, WHITE_COL);
    }
    for (let i = 0; i < bayCount; i++) {
      const bayLen = len / bayCount - 0.24;
      const frac = (i + 0.5) / bayCount;
      const x = ptA[0] + (ptB[0] - ptA[0]) * frac, z = ptA[1] + (ptB[1] - ptA[1]) * frac;
      for (const side of [-1, 1]) {
        const end0 = [x - ux * bayLen / 2, z - uz * bayLen / 2];
        const end1 = [x + ux * bayLen / 2, z + uz * bayLen / 2];
        const lo = baseTopY + 0.16, hi = baseTopY + 0.62;
        S.beam([end0[0], side < 0 ? lo : hi, end0[1]], [end1[0], side < 0 ? hi : lo, end1[1]], 0.05, 0.07, WHITE_COL);
        const halfPt = [x + ux * side * bayLen / 4, z + uz * side * bayLen / 4];
        S.beam([x, lo, z], [halfPt[0], (lo + hi) / 2, halfPt[1]], 0.04, 0.06, WHITE_COL);
        S.beam([x, hi, z], [halfPt[0], (lo + hi) / 2, halfPt[1]], 0.04, 0.06, WHITE_COL);
      }
    }
  };
  S.kind = KIND.PLAIN;
  const halfA = BASE_LENGTH / 2 - 0.15, halfB = BASE_WIDTH / 2 - 0.15, stairGap = STAIR_WIDTH / 2 + 0.2;
  for (const axisSign of [-1, 1]) {
    drawRail(axisSign * halfA, -halfB, axisSign * halfA, -stairGap);
    drawRail(axisSign * halfA, stairGap, axisSign * halfA, halfB);
    drawRail(-halfA, axisSign * halfB, halfA, axisSign * halfB);
  }
  for (const axisSign of [-1, 1]) {
    for (const side of [-1, 1]) {
      const tabletPt = at(axisSign * (BASE_LENGTH / 2 + 0.03), side * (stairGap + 1.3));
      S.box(tabletPt[0], tabletPt[1], courtY + 0.35, baseTopY - 0.2, 0.08, 1.6, frontAng, WHITE_COL);
      const insetPt = at(axisSign * (BASE_LENGTH / 2 + 0.08), side * (stairGap + 1.3));
      S.box(insetPt[0], insetPt[1], courtY + 0.42, baseTopY - 0.27, 0.04, 1.3, frontAng, hex('#8a5a2c'));
    }
  }
  return { frontRun, backRun, halfA, halfB };
}

function buildPavilionBodyAndRoofs(S, center, at, fx, fz, px, pz, frontAng, baseTopY) {
  const octRot = frontAng + Math.PI / 8;
  const colApothem = 3.9, colHeight = 3.0;
  S.kind = KIND.MASONRY;
  S.cyl(center[0], center[1], baseTopY, baseTopY + 0.15, octCircumradius(colApothem + 0.5), octCircumradius(colApothem + 0.45), 8, shade(FLOOR_COL, 1.05), { rot: octRot });
  const floorY = baseTopY + 0.15;

  S.kind = KIND.PLAIN;
  const colRadius = octCircumradius(colApothem);
  const cols = [];
  for (let k = 0; k < 8; k++) {
    const theta = octRot + (k / 8) * Math.PI * 2;
    const pt = [center[0] + Math.cos(theta) * colRadius, center[1] + Math.sin(theta) * colRadius];
    cols.push(pt);
    S.box(pt[0], pt[1], floorY, floorY + 0.25, 0.5, 0.5, theta, WHITE_COL);
    S.cyl(pt[0], pt[1], floorY + 0.25, floorY + colHeight, 0.2, 0.19, 10, WHITE_COL);
    S.box(pt[0], pt[1], floorY + colHeight - 0.22, floorY + colHeight, 0.46, 0.46, theta, WHITE_COL);
  }
  for (let k = 0; k < 8; k++) {
    const ptA = cols[k], ptB = cols[(k + 1) % 8];
    S.beam([ptA[0], floorY + colHeight - 0.1, ptA[1]], [ptB[0], floorY + colHeight - 0.1, ptB[1]], 0.3, 0.3, WHITE_COL);
    const mid = [(ptA[0] + ptB[0]) / 2, (ptA[1] + ptB[1]) / 2];
    const ang = Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]);
    const bayLen = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]) - 0.4;
    S.box(mid[0], mid[1], floorY + colHeight - 0.5, floorY + colHeight - 0.25, bayLen, 0.04, ang, SHADOW_COL);
    S.box(mid[0], mid[1], floorY + colHeight - 0.56, floorY + colHeight - 0.48, bayLen, 0.1, ang, WHITE_COL);
    for (const side of [-1, 1]) {
      const brkPt = [mid[0] + Math.cos(ang) * side * (bayLen / 2 - 0.2), mid[1] + Math.sin(ang) * side * (bayLen / 2 - 0.2)];
      S.box(brkPt[0], brkPt[1], floorY + colHeight - 0.85, floorY + colHeight - 0.25, 0.4, 0.1, ang, WHITE_COL);
    }
  }

  // Inner 4-column frame
  const innerHalf = 1.2, innerHeight = 2.8;
  for (const sa of [-1, 1]) for (const sb of [-1, 1]) {
    const pt = at(sa * innerHalf, sb * innerHalf);
    S.box(pt[0], pt[1], floorY, floorY + innerHeight, 0.3, 0.3, frontAng, WHITE_COL);
  }
  for (let k = 0; k < 4; k++) {
    const theta = frontAng + (k * Math.PI) / 2, ct = Math.cos(theta), sn = Math.sin(theta);
    const mid = [center[0] + ct * innerHalf, center[1] + sn * innerHalf];
    S.box(mid[0], mid[1], floorY + innerHeight - 0.3, floorY + innerHeight, 0.2, 2.7, theta, WHITE_COL);
    for (const side of [-1, 1]) {
      const along = (offset): [number, number] => [mid[0] - sn * side * offset, mid[1] + ct * side * offset];
      let pt = along(0.85);
      S.box(pt[0], pt[1], floorY + innerHeight - 0.75, floorY + innerHeight - 0.3, 0.12, 0.5, theta, WHITE_COL);
      pt = along(0.97);
      S.box(pt[0], pt[1], floorY + innerHeight - 1.15, floorY + innerHeight - 0.75, 0.12, 0.26, theta, WHITE_COL);
    }
  }

  // Lower octagonal roof
  const lowerRoofY = floorY + colHeight, eaveApothem = colApothem + 0.7, bandApothem = 2.8;
  S.kind = KIND.PLAIN;
  S.cyl(center[0], center[1], lowerRoofY, lowerRoofY + 0.22, octCircumradius(colApothem + 0.2), octCircumradius(colApothem + 0.2), 8, WHITE_COL, { rot: octRot, cap: false });
  const octRing = (apothem) => {
    const pts = [];
    for (let k = 0; k < 8; k++) {
      const theta = octRot + (k / 8) * Math.PI * 2;
      pts.push([center[0] + Math.cos(theta) * octCircumradius(apothem), center[1] + Math.sin(theta) * octCircumradius(apothem)]);
    }
    return pts;
  };
  S.kind = KIND.TIMBER;
  const soffitRing = octRing(eaveApothem - 0.05);
  const soffitY = lowerRoofY + 0.13;
  for (let k = 0; k < 8; k++) {
    S.tri([center[0], soffitY, center[1]], [soffitRing[k][0], soffitY, soffitRing[k][1]], [soffitRing[(k + 1) % 8][0], soffitY, soffitRing[(k + 1) % 8][1]], SOFFIT_COL, [0, -1, 0]);
  }
  S.kind = KIND.TILE;
  S.cyl(center[0], center[1], lowerRoofY + 0.1, lowerRoofY + 0.42, octCircumradius(eaveApothem), octCircumradius(colApothem + 0.1), 8, ROOF_COL, { rot: octRot, cap: false });
  S.cyl(center[0], center[1], lowerRoofY + 0.42, lowerRoofY + 1.12, octCircumradius(colApothem + 0.1), octCircumradius(bandApothem), 8, ROOF_COL, { rot: octRot, cap: false });

  S.kind = KIND.PLAIN;
  for (let k = 0; k < 8; k++) {
    const theta = octRot + (k / 8) * Math.PI * 2, ct = Math.cos(theta), sn = Math.sin(theta);
    const ptAt = (rad, y): [number, number, number] => [center[0] + ct * rad, y, center[1] + sn * rad];
    S.beam(ptAt(octCircumradius(bandApothem), lowerRoofY + 1.14), ptAt(octCircumradius(colApothem + 0.1), lowerRoofY + 0.47), 0.12, 0.14, RIDGE_COL);
    S.beam(ptAt(octCircumradius(colApothem + 0.1), lowerRoofY + 0.47), ptAt(octCircumradius(eaveApothem), lowerRoofY + 0.15), 0.12, 0.14, RIDGE_COL);
    drawUpturnedTip(S, ptAt(octCircumradius(eaveApothem) - 0.04, lowerRoofY + 0.15), ct, sn);
  }

  // Lattice band around lower roof top
  const bandY0 = lowerRoofY + 1.05, bandY1 = bandY0 + 0.5;
  S.cyl(center[0], center[1], bandY0, bandY0 + 0.1, octCircumradius(bandApothem + 0.02), octCircumradius(bandApothem + 0.02), 8, WHITE_COL, { rot: octRot });
  S.cyl(center[0], center[1], bandY1 - 0.08, bandY1, octCircumradius(bandApothem + 0.06), octCircumradius(bandApothem + 0.06), 8, WHITE_COL, { rot: octRot, cap: false });
  S.kind = KIND.CIVIC;
  S.cyl(center[0], center[1], bandY0 + 0.1, bandY1 - 0.08, octCircumradius(bandApothem - 0.12), octCircumradius(bandApothem - 0.12), 8, SHADOW_COL, { rot: octRot, cap: false });
  S.kind = KIND.PLAIN;
  const bandRad = octCircumradius(bandApothem);
  for (let k = 0; k < 8; k++) {
    const t0 = octRot + (k / 8) * Math.PI * 2, t1 = octRot + ((k + 1) / 8) * Math.PI * 2;
    const ptA = [center[0] + Math.cos(t0) * bandRad, center[1] + Math.sin(t0) * bandRad];
    const ptB = [center[0] + Math.cos(t1) * bandRad, center[1] + Math.sin(t1) * bandRad];
    S.box(ptA[0], ptA[1], bandY0, bandY1, 0.16, 0.16, t0, WHITE_COL);
    for (let i = 0; i < 2; i++) {
      const u0 = i / 2, u1 = (i + 1) / 2;
      const segA = [ptA[0] + (ptB[0] - ptA[0]) * u0, ptA[1] + (ptB[1] - ptA[1]) * u0];
      const segB = [ptA[0] + (ptB[0] - ptA[0]) * u1, ptA[1] + (ptB[1] - ptA[1]) * u1];
      S.beam([segA[0], bandY0 + 0.1, segA[1]], [segB[0], bandY1 - 0.08, segB[1]], 0.04, 0.06, WHITE_COL);
      S.beam([segA[0], bandY1 - 0.08, segA[1]], [segB[0], bandY0 + 0.1, segB[1]], 0.04, 0.06, WHITE_COL);
    }
  }

  // Upper rectangular storey + hipped roof
  const upperW = 3.0, upperD = 2.4, upperY0 = bandY0 + 0.1, upperY1 = upperY0 + 1.35;
  S.kind = KIND.CIVIC;
  S.box(center[0], center[1], upperY0, upperY1, upperD - 0.3, upperW - 0.3, frontAng, SHADOW_COL);
  S.kind = KIND.PLAIN;
  for (const sa of [-1, 1]) for (const sb of [-1, -0.33, 0.33, 1]) {
    const pt = at(sa * upperD / 2, sb * upperW / 2);
    S.box(pt[0], pt[1], upperY0, upperY1, 0.2, 0.2, frontAng, WHITE_COL);
  }
  for (const sb of [-1, 1]) { const pt = at(0, sb * upperW / 2); S.box(pt[0], pt[1], upperY0, upperY1, 0.2, 0.2, frontAng, WHITE_COL); }
  S.box(center[0], center[1], upperY0, upperY0 + 0.4, upperD + 0.04, upperW + 0.04, frontAng, WHITE_COL);
  for (const sa of [-1, 1]) for (const sb of [-0.66, 0, 0.66]) {
    const pt = at(sa * (upperD / 2 + 0.03), sb * upperW / 2);
    S.box(pt[0], pt[1], upperY0 + 0.08, upperY0 + 0.32, 0.02, 0.8, frontAng, shade(WHITE_COL, 0.86));
  }
  S.box(center[0], center[1], upperY1 - 0.32, upperY1, upperD + 0.06, upperW + 0.06, frontAng, WHITE_COL);
  for (const sa of [-1, 1]) for (const sb of [-0.3, 0.3]) {
    const pt = at(sa * (upperD / 2 + 0.04), sb * upperW / 2);
    S.box(pt[0], pt[1], upperY1 - 0.62, upperY1 - 0.36, 0.03, 0.62, frontAng, hex('#6e5a3a'));
  }

  const halfW = upperW / 2 + 0.75, halfD = upperD / 2 + 0.7, ridgeHalf = 1.3;
  const eaveY = upperY1, ridgeY = upperY1 + 0.78, cornerLift = 0.16;
  const upperPt = (across, along, y) => { const pt = at(along, across); return [pt[0], y, pt[1]]; };
  const corners = [
    upperPt(-halfW, -halfD, eaveY + cornerLift), upperPt(halfW, -halfD, eaveY + cornerLift),
    upperPt(halfW, halfD, eaveY + cornerLift), upperPt(-halfW, halfD, eaveY + cornerLift),
  ];
  const midEaves = [upperPt(0, -halfD, eaveY), upperPt(0, halfD, eaveY)];
  const ridgeEnds = [upperPt(-ridgeHalf, 0, ridgeY), upperPt(ridgeHalf, 0, ridgeY)];
  const ridgeMid = [(ridgeEnds[0][0] + ridgeEnds[1][0]) / 2, ridgeY, (ridgeEnds[0][2] + ridgeEnds[1][2]) / 2];

  S.kind = KIND.TIMBER;
  S.quad(...corners.map((pt) => [pt[0], pt[1] - 0.02, pt[2]]), SOFFIT_COL, [0, -1, 0]);
  S.kind = KIND.TILE;
  const slopeNorm = (dx, dz): [number, number, number] => [dx, 1.4, dz];
  S.quad(corners[0], midEaves[0], ridgeMid, ridgeEnds[0], ROOF_COL, slopeNorm(-fx, -fz));
  S.quad(midEaves[0], corners[1], ridgeEnds[1], ridgeMid, ROOF_COL, slopeNorm(-fx, -fz));
  S.quad(corners[2], midEaves[1], ridgeMid, ridgeEnds[1], ROOF_COL, slopeNorm(fx, fz));
  S.quad(midEaves[1], corners[3], ridgeEnds[0], ridgeMid, ROOF_COL, slopeNorm(fx, fz));
  S.tri(corners[3], corners[0], ridgeEnds[0], ROOF_COL, slopeNorm(-px, -pz));
  S.tri(corners[1], corners[2], ridgeEnds[1], ROOF_COL, slopeNorm(px, pz));

  S.kind = KIND.PLAIN;
  for (const [ptA, ptB] of ([[corners[0], midEaves[0]], [midEaves[0], corners[1]], [corners[1], corners[2]], [corners[2], midEaves[1]], [midEaves[1], corners[3]], [corners[3], corners[0]]] as any[])) {
    S.beam([ptA[0], ptA[1] - 0.05, ptA[2]], [ptB[0], ptB[1] - 0.05, ptB[2]], 0.08, 0.12, WHITE_COL);
  }
  S.beam([ridgeEnds[0][0], ridgeY + 0.06, ridgeEnds[0][2]], [ridgeEnds[1][0], ridgeY + 0.06, ridgeEnds[1][2]], 0.16, 0.2, RIDGE_COL);
  for (let i = 0; i < 4; i++) {
    const ridgePt = ridgeEnds[i === 0 || i === 3 ? 0 : 1], cornerPt = corners[i];
    S.beam([ridgePt[0], ridgeY + 0.04, ridgePt[2]], [cornerPt[0], cornerPt[1] + 0.05, cornerPt[2]], 0.1, 0.12, RIDGE_COL);
    const dx = cornerPt[0] - ridgePt[0], dz = cornerPt[2] - ridgePt[2], hipLen = Math.hypot(dx, dz);
    drawUpturnedTip(S, [cornerPt[0], cornerPt[1] + 0.05, cornerPt[2]], dx / hipLen, dz / hipLen, 0.8);
  }
  for (const side of [-1, 1]) {
    const ridgePtAt = (across, dy) => upperPt(side * across, 0, ridgeY + dy);
    S.beam(ridgePtAt(ridgeHalf + 0.05, 0.12), ridgePtAt(ridgeHalf - 0.15, 0.48), 0.1, 0.14, RIDGE_COL);
    S.beam(ridgePtAt(ridgeHalf - 0.15, 0.48), ridgePtAt(ridgeHalf - 0.45, 0.42), 0.09, 0.12, RIDGE_COL);
    const head = ridgePtAt(ridgeHalf - 0.55, 0.36);
    S.box(head[0], head[2], head[1] - 0.06, head[1] + 0.1, 0.07, 0.2, frontAng, RIDGE_COL);
    S.beam(ridgePtAt(ridgeHalf + 0.05, 0.12), ridgePtAt(ridgeHalf + 0.18, 0.32), 0.06, 0.08, RIDGE_COL);
  }
  const pearlPt = at(0, 0);
  S.box(pearlPt[0], pearlPt[1], ridgeY + 0.12, ridgeY + 0.24, 0.22, 0.5, frontAng, RIDGE_COL);
  S.cyl(pearlPt[0], pearlPt[1], ridgeY + 0.24, ridgeY + 0.56, 0.17, 0.12, 8, RIDGE_COL, { rot: frontAng });
  S.cyl(pearlPt[0], pearlPt[1], ridgeY + 0.56, ridgeY + 0.72, 0.12, 0.02, 6, RIDGE_COL, { rot: frontAng });
  for (const side of [-1, 1]) {
    const flamePt = at(0, side * 0.3);
    S.box(flamePt[0], flamePt[1], ridgeY + 0.2, ridgeY + 0.46, 0.03, 0.16, frontAng, RIDGE_COL);
  }

  return { lowerRoofY, colApothem, octRot };
}

function buildRiverDiscAndRoadGate(S, at, frontAng, groundY, terraceY, markPaved, addLantern) {
  markPaved(() => {
    S.kind = KIND.MASONRY;
    for (const side of [-1, 1]) {
      const cheekPt = at(TERRACE_FAR_AXIS + 1.2, side * 3.9);
      S.box(cheekPt[0], cheekPt[1], groundY - 0.2, terraceY + 0.25, 3.2, 0.9, frontAng, WHITE_COL, { top: shade(WHITE_COL, 0.94) });
    }
    for (let k = 0; k < 2; k++) {
      const stepPt = at(TERRACE_FAR_AXIS + 0.3 + k * 0.4, 0);
      S.box(stepPt[0], stepPt[1], groundY - 0.2, terraceY - (terraceY - groundY - 0.22) * (k + 1) / 3, 0.4, 6.9, frontAng, shade(KERB_COL, k % 2 ? 1.0 : 1.06), { topKind: KIND.ROAD });
    }
  });

  const discStart = S.n;
  const discAxis = 19.5, discRadius = 11.0, cutAxis = TERRACE_FAR_AXIS + 1.1;
  const discPts = [];
  const halfAngle = Math.acos((cutAxis - discAxis) / discRadius);
  for (let k = 0; k <= 32; k++) {
    const theta = -halfAngle + (k / 32) * 2 * halfAngle;
    discPts.push(at(discAxis + Math.cos(theta) * discRadius, Math.sin(theta) * discRadius));
  }
  S.kind = KIND.MASONRY;
  S.prism(discPts, groundY - 0.2, groundY + 0.22, KERB_COL, PAVE_COL, { topKind: KIND.ROAD });
  const inlayPts = [];
  for (let k = 0; k <= 32; k++) {
    const theta = -halfAngle + 0.12 + (k / 32) * (2 * halfAngle - 0.24);
    inlayPts.push(at(discAxis + Math.cos(theta) * (discRadius - 2.6), Math.sin(theta) * (discRadius - 2.6)));
  }
  for (let k = 0; k < 32; k++) S.beam([inlayPts[k][0], groundY + 0.22, inlayPts[k][1]], [inlayPts[k + 1][0], groundY + 0.22, inlayPts[k + 1][1]], 0.25, 0.04, INLAY_COL);
  (S.paved = S.paved || []).push([discStart, S.n]);

  // Road gate: two pairs of lotus-topped pillars
  const gateAxis = -44.85, gateCenterB = 0.8;
  const innerOffset = 5.55, outerOffset = 10.48;
  const innerH = 6.95, outerH = 4.95;
  markPaved(() => {
    const pt = at(gateAxis, gateCenterB);
    const ptGround = LAND_Y + rise(pt[0], pt[1]);
    S.kind = KIND.MASONRY;
    S.box(pt[0], pt[1], ptGround - 0.3, ptGround + 0.22, 3.4, 2 * outerOffset + 2.6, frontAng, KERB_COL, { top: PAVE_COL, topKind: KIND.ROAD });
  });

  const buildPillar = (offsetB, width, height) => {
    const pt = at(gateAxis, offsetB);
    const baseY = LAND_Y + rise(pt[0], pt[1]) + 0.22;
    S.kind = KIND.PLAIN;
    S.box(pt[0], pt[1], baseY - 0.2, baseY + 0.4, width + 0.3, width + 0.3, frontAng, WHITE_COL);
    S.box(pt[0], pt[1], baseY + 0.4, baseY + height, width, width, frontAng, WHITE_COL);
    S.box(pt[0], pt[1], baseY + height, baseY + height + 0.2, width + 0.18, width + 0.18, frontAng, WHITE_COL);
    for (const axisSign of [-1, 1]) {
      const coupletPt = at(gateAxis + axisSign * (width / 2 + 0.01), offsetB);
      S.box(coupletPt[0], coupletPt[1], baseY + 0.9, baseY + height - 0.5, 0.03, width * 0.45, frontAng, COUPLET_COL);
    }
    S.kind = KIND.GLAZED;
    S.cyl(pt[0], pt[1], baseY + height + 0.2, baseY + height + 0.4, width * 0.25, width * 0.4, 8, WHITE_COL, { rot: frontAng });
    S.cyl(pt[0], pt[1], baseY + height + 0.4, baseY + height + 0.7, width * 0.4, width * 0.36, 8, WHITE_COL, { rot: frontAng });
    S.cyl(pt[0], pt[1], baseY + height + 0.7, baseY + height + 0.95, width * 0.36, 0.04, 8, WHITE_COL, { rot: frontAng });
    return baseY;
  };

  for (const side of [-1, 1]) {
    const innerB = gateCenterB + side * innerOffset, outerB = gateCenterB + side * outerOffset;
    const innerBaseY = buildPillar(innerB, 1.0, innerH);
    buildPillar(outerB, 0.8, outerH);

    const panelMid = at(gateAxis, (innerB + outerB) / 2);
    const panelLen = Math.abs(outerB - innerB) - 0.9;
    S.kind = KIND.PLAIN;
    S.box(panelMid[0], panelMid[1], innerBaseY + 4.4, innerBaseY + 5.3, 0.05, panelLen, frontAng, shade(WHITE_COL, 0.82));
    S.box(panelMid[0], panelMid[1], innerBaseY + 5.25, innerBaseY + 5.4, 0.2, panelLen, frontAng, WHITE_COL);
    S.box(panelMid[0], panelMid[1], innerBaseY + 4.3, innerBaseY + 4.44, 0.2, panelLen, frontAng, WHITE_COL);
    S.box(panelMid[0], panelMid[1], innerBaseY + 4.8, innerBaseY + 4.9, 0.12, panelLen, frontAng, WHITE_COL);
    for (let i = 0; i < 5; i++) {
      const ringPt = at(gateAxis, Math.min(innerB, outerB) + 0.45 + (i + 0.5) * (panelLen / 5));
      S.box(ringPt[0], ringPt[1], innerBaseY + 4.5, innerBaseY + 5.2, 0.1, 0.1, frontAng, WHITE_COL);
      S.box(ringPt[0], ringPt[1], innerBaseY + 4.74, innerBaseY + 4.96, 0.1, panelLen / 5 - 0.1, frontAng, WHITE_COL);
    }
    const crestPt = at(gateAxis, innerB - side * (0.5 + panelLen * 0.2));
    S.box(crestPt[0], crestPt[1], innerBaseY + 5.4, innerBaseY + 5.75, 0.1, panelLen * 0.4, frontAng, WHITE_COL);
    addLantern(at(gateAxis, innerB), innerBaseY + innerH + 1.25);
  }
}

export function build({ data, S, group, place, THREE }) {
  const reframedCenter = [OUTLINE_CENTER[0] + PAVILION_SHIFT[0], OUTLINE_CENTER[1] + PAVILION_SHIFT[1]];
  const center = place && Math.hypot(place.x - reframedCenter[0], place.z - reframedCenter[1]) > 8 ? [place.x, place.z] : reframedCenter;
  const [fx, fz] = AXIS_DIR, px = -fz, pz = fx;
  const frontAng = Math.atan2(fz, fx);
  const at = (along, across): [number, number] => [center[0] + fx * along + px * across, center[1] + fz * along + pz * across];
  const groundY = LAND_Y + rise(center[0], center[1]);
  const courtY = groundY + COURT_RISE;
  const baseTopY = courtY + BASE_HEIGHT;
  const terraceY = groundY + 0.5;

  const lightBuf = new Buf(600);
  const lanternPos = [], lanternCol = [];
  const addLantern = (pt, y) => { lanternPos.push(pt[0], y, pt[1]); lanternCol.push(...LANTERN_COL); };
  const markPaved = (fn) => { const start = S.n; fn(); (S.paved = S.paved || []).push([start, S.n]); };

  if (Array.isArray(data?.bld)) {
    for (let i = data.bld.length - 1; i >= 0; i--) {
      const footprint = data.bld[i][0];
      let sumX = 0, sumZ = 0;
      for (let k = 0; k < footprint.length; k += 2) { sumX += footprint[k]; sumZ += footprint[k + 1]; }
      const count = footprint.length / 2;
      if (Math.hypot(sumX / count / 10 - OUTLINE_CENTER[0], sumZ / count / 10 - OUTLINE_CENTER[1]) < 4) data.bld.splice(i, 1);
    }
  }

  const pavPavedStart = S.n;
  const { frontRun, backRun, halfA, halfB } = buildCourtAndBase(data, S, center, at, frontAng, groundY, courtY, baseTopY, terraceY);
  const { lowerRoofY, colApothem, octRot } = buildPavilionBodyAndRoofs(S, center, at, fx, fz, px, pz, frontAng, baseTopY);
  (S.paved = S.paved || []).push([pavPavedStart, S.n]);

  buildRiverDiscAndRoadGate(S, at, frontAng, groundY, terraceY, markPaved, addLantern);

  // Night lighting
  const eaveLightY = lowerRoofY - 0.04, eaveLightRad = octCircumradius(colApothem + 0.5);
  for (let k = 0; k < 8; k++) {
    const t0 = octRot + (k / 8) * Math.PI * 2, t1 = octRot + ((k + 1) / 8) * Math.PI * 2;
    lightBuf.beam(
      [center[0] + Math.cos(t0) * eaveLightRad, eaveLightY, center[1] + Math.sin(t0) * eaveLightRad],
      [center[0] + Math.cos(t1) * eaveLightRad, eaveLightY, center[1] + Math.sin(t1) * eaveLightRad],
      0.12, 0.09, [1, 1, 1],
    );
  }
  for (const sa of [-1, 1]) for (const sb of [-1, 1]) addLantern(at(sa * halfA, sb * halfB), baseTopY + 1.0);
  for (const side of [-1, 1]) {
    addLantern(at(-(BASE_LENGTH / 2 + frontRun + 0.1), side * (STAIR_WIDTH / 2 + 0.18)), courtY + 0.75);
    addLantern(at(BASE_LENGTH / 2 + backRun + 0.1, side * (STAIR_WIDTH / 2 + 0.18)), terraceY + 0.75);
  }

  if (group && THREE) {
    const stripMesh = new THREE.Mesh(lightBuf.geometry(), lightMaterial(0xffb04a, 1.2));
    stripMesh.renderOrder = 19;
    stripMesh.userData.landmark = id;
    group.add(stripMesh);
    const glowPts = glowPoints(lanternPos, lanternCol, 6);
    glowPts.userData.glow = true;
    glowPts.userData.landmark = id;
    group.add(glowPts);
  }
  S.kind = KIND.PLAIN;
  return null;
}
