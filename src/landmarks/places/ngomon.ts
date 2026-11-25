import { Buf, KIND, hex, shade } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { lightMaterial, glowPoints } from '../../geo/materials.ts';
import { ridgeDragons, ridgeGourd } from '../ornaments.ts';
import polygonClipping from 'polygon-clipping';

// Ngọ Môn (Noon Gate, 1833), the south gate of the Imperial City. Notes and sources: docs/places/ngomon.md.
//
// Plan: the OSM outline (way 172657562), squared up and made symmetric, then brought to the published size (Phan
// Thanh Hải 2015, cited by vi.wikipedia: base 57.96 m along the front, each wing 27.50 m). OSM draws it 55.8 m wide
// and 24.75-25.3 m deep, 4 % and 9 % short; the back face stays on OSM's line (the Imperial City wall), the wings
// reach further toward Kỳ Đài and the ends grow outward. The whole outline then sits 2 m behind OSM's (BASE_SHIFT). The body's back face projects 4.3 m between u = ±21.1; the
// two ends behind the wings are set back.
// Local frame: u along the front (east-north-east), v out of the Imperial City (south-south-east, toward the flag).
export const id = 'ngomon';

// centre of the outline's bounding box, metres in the model frame: OSM's centre (-1033.95, 132.78) moved 2 m back
// (-v) into the Imperial City, where the 2026-11 z20 satellite puts the base once its lean is allowed for (the
// published 27.5 m wing then ends where the satellite shows the tips, not 3 m out toward Kỳ Đài)
const BASE_SHIFT = -2.0;
const AXIS_ANGLE = -0.633; // direction of u
const AXIS_COS = Math.cos(AXIS_ANGLE);
const AXIS_SIN = Math.sin(AXIS_ANGLE);
const GATE_CENTER = [-1033.95 - BASE_SHIFT * Math.sin(AXIS_ANGLE), 132.78 + BASE_SHIFT * Math.cos(AXIS_ANGLE)];
const toWorld = (localU, localV): [number, number] => [
  GATE_CENTER[0] + localU * AXIS_COS - localV * AXIS_SIN,
  GATE_CENTER[1] + localU * AXIS_SIN + localV * AXIS_COS,
];
const toPoint3 = (localU, localV, y) => {
  const pos = toWorld(localU, localV);
  return [pos[0], y, pos[1]];
};
const toRing = (pts) => pts.map(([localU, localV]) => toWorld(localU, localV));
const mirrorRing = (pts) => pts.map(([localU, localV]) => [-localU, localV]).reverse();

// the outline, local metres
const BACK_V = -12.7;
const BACK_END_V = -8.4;
const FRONT_V = 3.0;
const INNER_U = 13.5;
const PROJ_U = 21.1;
const HALF_WIDTH = 57.96 / 2;
const WING_V = BACK_V + 27.5; // published size; OSM has HALF 27.9, WING 12.05
const WING_EXT_V = WING_V - 12.05; // how far the wing tips moved out from the OSM outline
const BASE_OUTLINE = [
  [-PROJ_U, BACK_V], [PROJ_U, BACK_V], [PROJ_U, BACK_END_V], [HALF_WIDTH, BACK_END_V], [HALF_WIDTH, WING_V],
  [INNER_U, WING_V], [INNER_U, FRONT_V], [-INNER_U, FRONT_V], [-INNER_U, WING_V], [-HALF_WIDTH, WING_V],
  [-HALF_WIDTH, BACK_END_V], [-PROJ_U, BACK_END_V],
];

const BASE_HEIGHT = 5.0; // the base: "nearly 5 m" / "over 5 m"; 21 steps of 22 cm reach 4.62 m, plus the sill
const PARAPET_HEIGHT = 0.9; // the parapet (nữ tường) with its band of glazed openwork tiles
const PAVILION_PLINTH_H = 1.14; // the pavilion's own plinth on the base
const PAVILION_WALL_H = 3.1;
// the three gateways through the body (rectangular mouths under bronze-beam lintels): Ngọ Môn for the emperor,
// Tả / Hữu Giáp Môn for the mandarins. Sizes keep the ratios of the recorded thước figures (13.3 × 8.2 and
// 12.45 × 6.3 thước); the Dịch gates through the wings (7.6 × 6.3) are vaulted ("vòm cuốn") and bent ("lối đi gấp
// khúc trong lòng hai cánh"): in from the forecourt through the wing's inner face, a right-angle turn, out at the back.
const MAIN_GATES = [{ u: 0, w: 3.0, h: 4.1 }, { u: -6.1, w: 2.3, h: 3.85 }, { u: 6.1, w: 2.3, h: 3.85 }];
const DICH_GATE = { w: 2.3, h: 2.8, v: (FRONT_V + WING_V) / 2, uBack: (PROJ_U + HALF_WIDTH) / 2 };
const BACK_STAIR = { u0: 13.9, u1: 20.7, w: 2.62, steps: 21 }; // two open flights, 5.25 m together, 21 bluestone steps each
const EAVE_FLARE = 0.22; // low eave curl: Ngọ Môn's eaves run nearly straight, lifting only a little at the corners

const COLORS = {
  wall: hex('#6f695f'), // weathered grey brick and bluestone, darker in the rain streaks
  wallTop: hex('#8f857a'),
  terrace: hex('#a3927b'),
  frame: hex('#c9bfab'),
  dark: hex('#211b19'),
  glaze: hex('#5d8a6a'), // the green glazed openwork tiles in the parapet
  gold: hex('#d8b25a'),
  emperorDoor: hex('#b8923c'),
  plaqueBg: hex('#2d3b45'),
  plinthTop: hex('#b5a58a'),
  ridgeGold: hex('#f1d77a'),
  corniceGold: hex('#c79a45'),
  finialGold: hex('#e5c46a'),
  // thanh lưu ly, the green glazed tiles: dark bottle-green, nearly black in shade, in every photograph and the satellite
  // (PAL.jadeRoof, the light jade of other halls, reads far too bright here)
  greenRoof: hex('#2a4c37'),
  whiteRgb: [1, 1, 1],
  nightTint: 0xffb64c,
};

function buildMasonryBase(S, box, baseY, topY) {
  // ---- the masonry base: solid blocks either side of the three gateways, lintels over them ----
  S.kind = KIND.MASONRY;
  const leftGate = MAIN_GATES[1];
  const centerGate = MAIN_GATES[0];
  const gateLeft = (gate) => gate.u - gate.w / 2;
  const gateRight = (gate) => gate.u + gate.w / 2;
  const leftWingPoly = [
    [gateLeft(leftGate), BACK_V], [gateLeft(leftGate), FRONT_V], [-INNER_U, FRONT_V], [-INNER_U, WING_V],
    [-HALF_WIDTH, WING_V], [-HALF_WIDTH, BACK_END_V], [-PROJ_U, BACK_END_V], [-PROJ_U, BACK_V],
  ];
  // the bent Dịch tunnel in plan, for side sign: in from the wing's inner face along u, then along v out the back
  const dichPlan = (side) => {
    const halfW = DICH_GATE.w / 2;
    const uInner = INNER_U - 0.01;
    const uBack = DICH_GATE.uBack;
    const midV = DICH_GATE.v;
    const vBack = BACK_END_V - 0.01;
    return [[uInner, midV - halfW], [uBack - halfW, midV - halfW], [uBack - halfW, vBack], [uBack + halfW, vBack], [uBack + halfW, midV + halfW], [uInner, midV + halfW]].map(([u, v]) => [side * u, v]);
  };
  // the wings are solid up to the Dịch tunnels' crown with the bent tunnel cut out of them, solid above it
  const dichCrownY = LAND_Y + DICH_GATE.h;
  for (const [side, halfPoly] of [[-1, leftWingPoly], [1, mirrorRing(leftWingPoly)]] as any[]) {
    const closeRing = (ring) => [...ring, ring[0]];
    let parts = [[halfPoly]];
    try {
      parts = polygonClipping.difference([closeRing(halfPoly)], [closeRing(dichPlan(side))]).map((poly) => poly.map((ring) => ring.slice(0, -1)));
    } catch { /* keep it whole */ }
    for (const poly of parts) S.prism(toRing(poly[0]), baseY, dichCrownY, COLORS.wall, COLORS.wall, { holes: poly.slice(1).map(toRing), top: false });
    S.prism(toRing(halfPoly), dichCrownY, topY, COLORS.wall, COLORS.terrace, { topKind: KIND.ROAD });
  }
  for (const side of [-1, 1]) { // the two piers between the centre gateway and the Giáp gates
    const u0 = side < 0 ? gateRight(leftGate) : gateRight(centerGate);
    const u1 = side < 0 ? gateLeft(centerGate) : gateLeft(MAIN_GATES[2]);
    box((u0 + u1) / 2, (BACK_V + FRONT_V) / 2, baseY, topY, u1 - u0, FRONT_V - BACK_V, COLORS.wall, { top: COLORS.terrace, topKind: KIND.ROAD });
  }
  const bodyDepth = FRONT_V - BACK_V;
  const bodyMidV = (BACK_V + FRONT_V) / 2;
  for (const gate of MAIN_GATES) {
    const lintelY = LAND_Y + gate.h;
    box(gate.u, bodyMidV, lintelY, topY, gate.w + 0.02, bodyDepth, COLORS.wall, { top: COLORS.terrace, topKind: KIND.ROAD });
    S.kind = KIND.PLAIN;
    // the dark tunnel: lining on both sides and the ceiling, set in from each mouth so the reveals stay light
    for (const side of [-1, 1]) box(gate.u + side * (gate.w / 2 - 0.03), bodyMidV, LAND_Y, lintelY, 0.04, bodyDepth - 0.8, COLORS.dark);
    box(gate.u, bodyMidV, lintelY - 0.06, lintelY - 0.02, gate.w, bodyDepth - 0.8, COLORS.dark, { bottom: true });
    box(gate.u, bodyMidV, LAND_Y - 0.1, LAND_Y + 0.04, gate.w, bodyDepth, shade(PAL.stone, 0.85));
    // a proud bluestone surround at each mouth
    for (const faceV of [BACK_V - 0.06, FRONT_V + 0.06]) {
      for (const side of [-1, 1]) box(gate.u + side * (gate.w / 2 + 0.2), faceV, LAND_Y, lintelY + 0.4, 0.4, 0.14, COLORS.frame);
      box(gate.u, faceV, lintelY, lintelY + 0.4, gate.w + 0.8, 0.14, COLORS.frame);
    }
    S.kind = KIND.MASONRY;
  }
  S.kind = KIND.PLAIN;
  // the leaves of the emperor's door, gilded timber set back in the mouth (yellow in Street View), with a dark stile
  box(0, FRONT_V - 0.9, LAND_Y, LAND_Y + 3.1, 2.9, 0.12, COLORS.emperorDoor);
  box(0, FRONT_V - 0.84, LAND_Y, LAND_Y + 3.1, 0.06, 0.06, COLORS.dark);
  // the plaque over the emperor's gateway, on the face toward the flag: two bronze characters, once gilded
  box(0, FRONT_V + 0.08, LAND_Y + 4.28, LAND_Y + 4.88, 2.2, 0.1, COLORS.plaqueBg);
  for (const side of [-1, 1]) box(side * 0.45, FRONT_V + 0.14, LAND_Y + 4.38, LAND_Y + 4.78, 0.42, 0.04, COLORS.gold);
}

function buildDichVaultsAndWingWindows(S, box) {
  // ---- the Dịch gates: a vaulted tunnel in from the forecourt through each wing's inner face, a right-angle turn,
  // and out through the back face of the set-back end behind it ----
  const dichCrownY = LAND_Y + DICH_GATE.h;
  const radius = DICH_GATE.w / 2;
  const springY = LAND_Y + DICH_GATE.h - radius;
  const archSegs = 8;
  const worldDir = (normU, normV, normY = 0): [number, number, number] => [normU * AXIS_COS - normV * AXIS_SIN, normY, normU * AXIS_SIN + normV * AXIS_COS];
  // the face of an opening: (centerU, centerV) the middle of its foot, (normU, normV) the outward normal, in local terms
  const buildOpeningFace = (centerU, centerV, normU, normV) => {
    const tanU = -normV;
    const tanV = normU;
    const normalHint = worldDir(normU, normV);
    const ptAt = (along, y, out = 0) => toPoint3(centerU + tanU * along + normU * out, centerV + tanV * along + normV * out, y);
    const arcPt = (theta, rad, out) => ptAt(Math.cos(theta) * rad, springY + Math.sin(theta) * rad, out);
    S.kind = KIND.MASONRY; // the spandrels between the vault and the square cut through the masonry
    for (let i = 0; i < archSegs; i++) {
      const ang0 = (Math.PI * i) / archSegs;
      const ang1 = (Math.PI * (i + 1)) / archSegs;
      const cornerPt = ptAt(i < archSegs / 2 ? radius : -radius, dichCrownY);
      S.tri(cornerPt, arcPt(ang0, radius, 0), arcPt(ang1, radius, 0), COLORS.wall, normalHint);
    }
    S.kind = KIND.PLAIN; // a proud bluestone surround: jambs and an arched band
    const outerR = radius + 0.35;
    const proud = 0.06;
    for (const side of [-1, 1]) S.quad(ptAt(side * radius, LAND_Y, proud), ptAt(side * outerR, LAND_Y, proud), ptAt(side * outerR, springY, proud), ptAt(side * radius, springY, proud), COLORS.frame, normalHint);
    for (let i = 0; i < archSegs; i++) {
      const ang0 = (Math.PI * i) / archSegs;
      const ang1 = (Math.PI * (i + 1)) / archSegs;
      S.quad(arcPt(ang0, radius, proud), arcPt(ang0, outerR, proud), arcPt(ang1, outerR, proud), arcPt(ang1, radius, proud), COLORS.frame, normalHint);
    }
    // the reveal of the surround (its thickness), so it reads proud from the side
    for (let i = 0; i < archSegs; i++) {
      const ang0 = (Math.PI * i) / archSegs;
      const ang1 = (Math.PI * (i + 1)) / archSegs;
      S.quad(arcPt(ang0, outerR, 0), arcPt(ang1, outerR, 0), arcPt(ang1, outerR, proud), arcPt(ang0, outerR, proud), COLORS.frame, worldDir(normU, normV, 1));
    }
  };
  // a run of vault from local (u0, v0) to (u1, v1) along one axis, spanning 2*radius across it; dark inside
  const buildVault = (u0, v0, u1, v1) => {
    const alongU = Math.abs(u1 - u0) > Math.abs(v1 - v0);
    const midU = (u0 + u1) / 2;
    const midV = (v0 + v1) / 2;
    const vaultPt = (theta, endIdx) => {
      const offset = Math.cos(theta) * radius;
      const y = springY + Math.sin(theta) * radius;
      return alongU ? toPoint3(endIdx ? u1 : u0, midV + offset, y) : toPoint3(midU + offset, endIdx ? v1 : v0, y);
    };
    for (let i = 0; i < archSegs; i++) {
      const ang0 = (Math.PI * i) / archSegs;
      const ang1 = (Math.PI * (i + 1)) / archSegs;
      const midAng = (ang0 + ang1) / 2;
      const normalHint = alongU ? worldDir(0, -Math.cos(midAng), -Math.sin(midAng)) : worldDir(-Math.cos(midAng), 0, -Math.sin(midAng));
      S.quad(vaultPt(ang0, 0), vaultPt(ang1, 0), vaultPt(ang1, 1), vaultPt(ang0, 1), COLORS.dark, normalHint);
    }
  };
  for (const side of [-1, 1]) {
    const uInner = side * INNER_U;
    const uBack = side * DICH_GATE.uBack;
    const dichV = DICH_GATE.v;
    buildOpeningFace(uInner, dichV, -side, 0); // into the forecourt
    buildOpeningFace(uBack, BACK_END_V, 0, -1); // out at the back, into the Imperial City
    S.kind = KIND.PLAIN;
    // leg 1 along u from the mouth to the turn, leg 2 along v from the turn to the back; the turn under a flat ceiling
    buildVault(uInner, dichV, uBack - side * radius, dichV);
    buildVault(uBack, BACK_END_V, uBack, dichV - radius);
    box(uBack, dichV, dichCrownY - 0.06, dichCrownY - 0.02, DICH_GATE.w, DICH_GATE.w, COLORS.dark, { bottom: true });
    // the ends of the two vaults where they open into the turn, closed up to the ceiling
    const buildEndFace = (centerU, centerV, normU, normV) => {
      const tanU = -normV;
      const tanV = normU;
      const normalHint = worldDir(normU, normV);
      const ptAt = (along, y) => toPoint3(centerU + tanU * along, centerV + tanV * along, y);
      for (let i = 0; i < archSegs; i++) {
        const ang0 = (Math.PI * i) / archSegs;
        const ang1 = (Math.PI * (i + 1)) / archSegs;
        S.tri(ptAt(i < archSegs / 2 ? radius : -radius, dichCrownY), ptAt(Math.cos(ang0) * radius, springY + Math.sin(ang0) * radius), ptAt(Math.cos(ang1) * radius, springY + Math.sin(ang1) * radius), COLORS.dark, normalHint);
      }
    };
    buildEndFace(uBack - side * radius, dichV, side, 0);
    buildEndFace(uBack, dichV - radius, 0, 1);
    // dark lining on the walls past the first 0.5 m in from each mouth (the reveals stay lit), and the stone floor
    const addLining = (u0, v0, u1, v1) => box((u0 + u1) / 2, (v0 + v1) / 2, LAND_Y, springY, Math.max(0.04, Math.abs(u1 - u0)), Math.max(0.04, Math.abs(v1 - v0)), COLORS.dark);
    const eps = 0.03;
    const insetMouth = 0.5;
    addLining(uInner + side * insetMouth, dichV - radius + eps, uBack - side * (radius - eps), dichV - radius + eps); // leg 1, toward the back
    addLining(uInner + side * insetMouth, dichV + radius - eps, uBack + side * (radius - eps), dichV + radius - eps); // leg 1, toward the front, on round the turn
    addLining(uBack + side * (radius - eps), dichV + radius - eps, uBack + side * (radius - eps), BACK_END_V + insetMouth); // the outer wall of the turn and leg 2
    addLining(uBack - side * (radius - eps), dichV - radius + eps, uBack - side * (radius - eps), BACK_END_V + insetMouth); // the inner wall of leg 2
    const floorCol = shade(PAL.stone, 0.85);
    box((uInner + uBack + side * radius) / 2, dichV, LAND_Y - 0.1, LAND_Y + 0.04, Math.abs(uBack + side * radius - uInner), DICH_GATE.w, floorCol);
    box(uBack, (BACK_END_V + dichV - radius) / 2, LAND_Y - 0.1, LAND_Y + 0.04, DICH_GATE.w, dichV - radius - BACK_END_V, floorCol);
    // the round window with a stylised Thọ, centred on each wing's front face toward the flag (Street View from the
    // plaza shows one in the middle of each wing tip, about halfway up the base)
    const winCenter = [side * (INNER_U + HALF_WIDTH) / 2, WING_V + 0.05];
    const winY = LAND_Y + 2.8;
    const winSegs = 10;
    const winRing = (rad, out) => Array.from({ length: winSegs }, (_, i) => {
      const theta = (i / winSegs) * Math.PI * 2;
      return toPoint3(winCenter[0] + Math.cos(theta) * rad, winCenter[1] + out, winY + Math.sin(theta) * rad);
    });
    const outerPts = winRing(0.62, 0.02);
    const innerPts = winRing(0.42, 0.06);
    const midPt = toPoint3(winCenter[0], winCenter[1] + 0.06, winY);
    const fwdWorld = toWorld(0, 1);
    const winNormal = [fwdWorld[0] - GATE_CENTER[0], 0, fwdWorld[1] - GATE_CENTER[1]];
    for (let i = 0; i < winSegs; i++) {
      const j = (i + 1) % winSegs;
      S.quad(outerPts[i], outerPts[j], innerPts[j], innerPts[i], COLORS.frame, winNormal);
      S.tri(midPt, innerPts[i], innerPts[j], COLORS.dark, winNormal);
    }
  }
}

function buildParapetAndBackStairs(S, lightBuf, box, baseY, topY) {
  // ---- the parapet round the top, with its glazed band, broken at the two stair heads ----
  const stairGaps = (ptA, ptB) => { // the stair heads are on the back face, at the outer end of each flight
    if (Math.abs(ptA[1] - BACK_V) > 0.01 || Math.abs(ptB[1] - BACK_V) > 0.01) return null;
    return [[-PROJ_U, -(BACK_STAIR.u1 - 2.6)], [BACK_STAIR.u1 - 2.6, PROJ_U]].map(([startU, endU]) => [Math.min(startU, endU), Math.max(startU, endU)]);
  };
  for (let i = 0; i < BASE_OUTLINE.length; i++) {
    const ptA = BASE_OUTLINE[i];
    const ptB = BASE_OUTLINE[(i + 1) % BASE_OUTLINE.length];
    let spans = [[0, 1]];
    const gaps = stairGaps(ptA, ptB);
    if (gaps) {
      const minU = Math.min(ptA[0], ptB[0]);
      const spanU = Math.abs(ptB[0] - ptA[0]);
      const toFrac = (localU) => (ptA[0] < ptB[0] ? (localU - minU) / spanU : 1 - (localU - minU) / spanU);
      const cuts = gaps.map(([u0, u1]) => [toFrac(u0), toFrac(u1)].sort((a, b) => a - b));
      spans = [];
      let cursor = 0;
      for (const [cut0, cut1] of cuts.sort((a, b) => a[0] - b[0])) {
        if (cut0 > cursor) spans.push([cursor, cut0]);
        cursor = Math.max(cursor, cut1);
      }
      if (cursor < 1) spans.push([cursor, 1]);
    }
    const du = ptB[0] - ptA[0];
    const dv = ptB[1] - ptA[1];
    const edgeLen = Math.hypot(du, dv);
    const outU = dv / edgeLen;
    const outV = -du / edgeLen; // outward (ring is clockwise in u, v)
    for (const [frac0, frac1] of spans) {
      if ((frac1 - frac0) * edgeLen < 0.3) continue;
      const midLocal = [ptA[0] + du * (frac0 + frac1) / 2 - outU * 0.22, ptA[1] + dv * (frac0 + frac1) / 2 - outV * 0.22];
      const segAngle = AXIS_ANGLE + Math.atan2(dv, du);
      const worldMid = toWorld(midLocal[0], midLocal[1]);
      const segLen = (frac1 - frac0) * edgeLen;
      S.kind = KIND.MASONRY;
      S.box(worldMid[0], worldMid[1], topY, topY + PARAPET_HEIGHT, segLen + 0.44, 0.44, segAngle, COLORS.wallTop, { top: shade(COLORS.wallTop, 1.1) });
      S.kind = KIND.PLAIN;
      const glazeMid = toWorld(midLocal[0] + outU * 0.24, midLocal[1] + outV * 0.24);
      S.box(glazeMid[0], glazeMid[1], topY + 0.3, topY + 0.68, segLen - 0.3, 0.04, segAngle, COLORS.glaze);
      // night: a strip along the parapet's outer top edge, washing the face below
      const lightA = [ptA[0] + du * frac0 + outU * 0.14, ptA[1] + dv * frac0 + outV * 0.14];
      const lightB = [ptA[0] + du * frac1 + outU * 0.14, ptA[1] + dv * frac1 + outV * 0.14];
      lightBuf.beam(toPoint3(lightA[0], lightA[1], topY + PARAPET_HEIGHT - 0.14), toPoint3(lightB[0], lightB[1], topY + PARAPET_HEIGHT - 0.14), 0.18, 0.26, COLORS.whiteRgb);
    }
  }
  // a string course along the foot of the parapet
  for (let i = 0; i < BASE_OUTLINE.length; i++) {
    const ptA = BASE_OUTLINE[i];
    const ptB = BASE_OUTLINE[(i + 1) % BASE_OUTLINE.length];
    const du = ptB[0] - ptA[0];
    const dv = ptB[1] - ptA[1];
    const edgeLen = Math.hypot(du, dv);
    const outU = dv / edgeLen;
    const outV = -du / edgeLen;
    const pos = toWorld((ptA[0] + ptB[0]) / 2 + outU * 0.06, (ptA[1] + ptB[1]) / 2 + outV * 0.06);
    S.box(pos[0], pos[1], topY - 0.22, topY, edgeLen + 0.12, 0.12, AXIS_ANGLE + Math.atan2(dv, du), shade(COLORS.wallTop, 1.12));
  }

  // ---- the two open stairs against the back face, rising outward to the terrace ----
  for (const side of [-1, 1]) {
    const runLen = BACK_STAIR.u1 - BACK_STAIR.u0;
    const tread = runLen / BACK_STAIR.steps;
    const stepRise = BASE_HEIGHT / (BACK_STAIR.steps + 1);
    const stairV = BACK_V - BACK_STAIR.w / 2;
    S.kind = KIND.MASONRY;
    for (let k = 0; k < BACK_STAIR.steps; k++) {
      const stepU = side * (BACK_STAIR.u0 + tread * (k + 0.5));
      box(stepU, stairV, baseY, LAND_Y + stepRise * (k + 1), tread + 0.01, BACK_STAIR.w, shade(PAL.stone, 0.9), { topKind: KIND.ROAD });
    }
    box(side * (BACK_STAIR.u1 + 0.2), stairV, baseY, topY, 0.4, BACK_STAIR.w, shade(PAL.stone, 0.9), { topKind: KIND.ROAD }); // the landing
    // the stair's outer cheek wall and its balustrade
    S.kind = KIND.PLAIN;
    const cheekV = BACK_V - BACK_STAIR.w - 0.12;
    S.beam(toPoint3(side * (BACK_STAIR.u0 - 0.1), cheekV, LAND_Y + 0.5), toPoint3(side * (BACK_STAIR.u1 + 0.4), cheekV, topY + 0.75), 0.26, 0.22, shade(PAL.stone, 0.8));
    for (let k = 0; k <= 4; k++) {
      const frac = k / 4;
      const postU = side * (BACK_STAIR.u0 + (BACK_STAIR.u1 + 0.3 - BACK_STAIR.u0) * frac);
      const postY = LAND_Y + BASE_HEIGHT * frac;
      box(postU, cheekV, postY - 0.3, postY + 0.85, 0.3, 0.3, shade(PAL.stone, 0.85));
    }
  }
}

function buildNguPhungPavilion(S, box, topY) {
  // ---- Lầu Ngũ Phụng: the U-shaped plinth, then nine roofs over a two-storey timber frame ----
  const plinthY = topY + PAVILION_PLINTH_H;
  const plinthEndU = 25.6;
  const plinthWingV = 10.5 + WING_EXT_V; // the plinth runs 1 m past the wing halls; the terrace beyond it is open (photo audit)
  const plinthPoly = [
    [-plinthEndU, -6.8], [-19.6, -6.8], [-19.6, -12.0], [19.6, -12.0], [19.6, -6.8], [plinthEndU, -6.8],
    [plinthEndU, plinthWingV], [15.1, plinthWingV], [15.1, 1.4], [-15.1, 1.4], [-15.1, plinthWingV], [-plinthEndU, plinthWingV],
  ];
  S.kind = KIND.MASONRY;
  S.prism(toRing(plinthPoly), topY - 0.1, plinthY, shade(PAL.stone, 0.92), COLORS.plinthTop, { topKind: KIND.ROAD });
  // three steps up the plinth before the centre hall, toward the flag
  for (let k = 0; k < 4; k++) {
    box(0, 1.4 + 0.3 * (k + 0.5), topY, plinthY - (PAVILION_PLINTH_H / 4) * (k + 1) + 0.02, 4.2, 0.3, shade(PAL.stone, 0.95), { topKind: KIND.ROAD });
  }
  S.kind = KIND.PLAIN;

  const eaves: any[] = [];
  // one two-storey (or one-storey) unit on the plinth; widthRatio / depthRatio: the upper storey's share of the lower's
  // width / depth, core: the closed core's share of the colonnade (0 for an open hall)
  const buildHallUnit = (width, depth, angle, centerX, centerZ, { roof, rh: roofH, tiers = 2, k: widthRatio = 0.68, kd: depthRatio = 0.62, core = 0.8, ridge = 0.6 }) => {
    const cosAng = Math.cos(angle);
    const sinAng = Math.sin(angle);
    const unitWorld = (u, v) => [centerX + u * cosAng - v * sinAng, centerZ + u * sinAng + v * cosAng];
    const wallCol = shade(PAL.lacquer, 0.82);
    const over = 1.05;
    const lidY = plinthY + PAVILION_WALL_H - 0.2;
    const eaveStyle = { fascia: 0.3, fasciaCol: shade(wallCol, 0.75), ridgeCol: COLORS.ridgeGold, hips: true, glazed: true, segs: 3, ridge, horns: false };
    S.kind = KIND.TIMBER;
    if (core > 0) {
      const coreW = width * core;
      const coreD = depth * core;
      S.box(centerX, centerZ, plinthY, lidY, coreW, coreD, angle, wallCol, { top: shade(roof, 0.8) });
      S.kind = KIND.PLAIN;
      const doorW = Math.min(coreW * 0.3, 3.2);
      const doorH = Math.min(PAVILION_WALL_H * 0.78, 2.2);
      for (const faceSign of [-1, 1]) {
        const doorPos = unitWorld(0, faceSign * (coreD / 2 + 0.04));
        S.box(doorPos[0], doorPos[1], plinthY, plinthY + doorH, doorW, 0.08, angle, shade(wallCol, 0.55));
      }
    }
    S.kind = KIND.TIMBER;
    S.box(centerX, centerZ, lidY, plinthY + PAVILION_WALL_H, width, depth, angle, shade(wallCol, 0.5), { top: shade(roof, 0.8), bottom: true }); // verandah ceiling
    S.kind = KIND.PLAIN;
    const colRad = 0.2;
    const countU = Math.max(2, Math.round(width / 3.0));
    const countV = Math.max(2, Math.round(depth / 3.0));
    const postCoords = [];
    for (let i = 0; i <= countU; i++) for (const side of [-1, 1]) postCoords.push([-width / 2 + (width * i) / countU, (side * depth) / 2]);
    for (let i = 1; i < countV; i++) for (const side of [-1, 1]) postCoords.push([(side * width) / 2, -depth / 2 + (depth * i) / countV]);
    for (const [postU, postV] of postCoords) {
      const pos = unitWorld(postU, postV);
      S.cyl(pos[0], pos[1], plinthY, plinthY + 0.22, colRad * 1.8, colRad * 1.55, 6, shade(PAL.stone, 0.95), { cap: false, rot: angle });
      S.cyl(pos[0], pos[1], plinthY + 0.22, lidY, colRad, colRad * 0.92, 6, shade(wallCol, 0.92), { cap: false, rot: angle });
    }
    const corners = [unitWorld(-width / 2, -depth / 2), unitWorld(width / 2, -depth / 2), unitWorld(width / 2, depth / 2), unitWorld(-width / 2, depth / 2)];
    const tieY = lidY - 0.3;
    for (let i = 0; i < 4; i++) {
      const ptA = corners[i];
      const ptB = corners[(i + 1) % 4];
      S.beam([ptA[0], tieY, ptA[1]], [ptB[0], tieY, ptB[1]], 0.26, 0.3, shade(wallCol, 0.7));
    }
    S.kind = KIND.TIMBER;
    const lowerEaveY = plinthY + PAVILION_WALL_H;
    if (tiers === 1) {
      S.hip(centerX, centerZ, width, depth, angle, lowerEaveY, roofH, roof, { flare: EAVE_FLARE, over, ...eaveStyle });
      eaves.push({ cx: centerX, cz: centerZ, w: width, d: depth, ang: angle, y: lowerEaveY, over, fascia: eaveStyle.fascia });
      return;
    }
    S.hip(centerX, centerZ, width, depth, angle, lowerEaveY, roofH * 0.5, roof, { flare: EAVE_FLARE, over, ...eaveStyle, ridgeCol: null, ridge: 0.75 });
    const polarWorld = (dist, theta): [number, number] => [centerX + dist * Math.cos(theta), centerZ + dist * Math.sin(theta)];
    const upperW = width * widthRatio;
    const upperD = depth * depthRatio;
    const upperBaseY = lowerEaveY + roofH * 0.34;
    const upperEaveY = upperBaseY + PAVILION_WALL_H * 0.85;
    S.box(centerX, centerZ, upperBaseY, upperEaveY, upperW, upperD, angle, wallCol);
    S.kind = KIND.PLAIN; // a gilded cornice band under the upper eave and the ridge finials
    S.box(centerX, centerZ, upperEaveY - 0.45, upperEaveY - 0.2, upperW + 0.1, upperD + 0.1, angle, COLORS.corniceGold);
    const ridgeHalf = (upperW / 2 + over * 0.9) * ridge; // at the two ends of the ridge, which runs along the front
    for (const side of [-1, 1]) {
      const pos = polarWorld(side * ridgeHalf, angle);
      ridgeGourd(S, pos[0], pos[1], upperEaveY + roofH * 0.92, 0.85, COLORS.finialGold);
    }
    if (width > 15) ridgeDragons(S, [centerX, centerZ], upperEaveY + roofH + 0.08, angle, { span: Math.min(8.0, upperW * 0.55), scale: 1.05 });
    else ridgeGourd(S, centerX, centerZ, upperEaveY + roofH + 0.04, 0.9, COLORS.finialGold);
    S.kind = KIND.TIMBER;
    S.hip(centerX, centerZ, upperW, upperD, angle, upperEaveY, roofH, roof, { flare: EAVE_FLARE, over: over * 0.9, ...eaveStyle });
    eaves.push(
      { cx: centerX, cz: centerZ, w: width, d: depth, ang: angle, y: lowerEaveY, over, fascia: eaveStyle.fascia },
      { cx: centerX, cz: centerZ, w: upperW, d: upperD, ang: angle, y: upperEaveY, over: over * 0.9, fascia: eaveStyle.fascia },
    );
  };
  const placeUnit = (u0, u1, v0, v1, opts) => {
    const pos = toWorld((u0 + u1) / 2, (v0 + v1) / 2);
    buildHallUnit(u1 - u0, v1 - v0, AXIS_ANGLE, pos[0], pos[1], opts); // every ridge runs along the front (u), as the front photographs show
  };
  const centerHalfU = 8.8;
  const wingU0 = 15.6;
  const wingU1 = 24.6;
  placeUnit(-centerHalfU, centerHalfU, -11.6, 0.8, { roof: PAL.imperialRoof, rh: 3.2, k: 0.9, kd: 0.8 }); // ridge about 16 m over the ground
  for (const side of [-1, 1]) {
    const spanU = (a, b): [number, number] => (side < 0 ? [-b, -a] : [a, b]);
    placeUnit(...spanU(centerHalfU - 0.3, 10.4), -9.7, 0.2, { roof: COLORS.greenRoof, rh: 1.3, tiers: 1, ridge: 0.8 }); // link, low between the halls
    placeUnit(...spanU(10.4, 15.9), -10.0, 0.5, { roof: COLORS.greenRoof, rh: 2.3, k: 0.88, kd: 0.78, ridge: 0.45 }); // side hall
    placeUnit(...spanU(15.9, wingU1), -6.3, 3.6, { roof: COLORS.greenRoof, rh: 1.8, core: 0, ridge: 0.5 }); // corner link over the wing's root
    placeUnit(...spanU(wingU0, wingU1), 3.6, 10.0 + WING_EXT_V, { roof: COLORS.greenRoof, rh: 2.8, core: 0 }); // wing hall on the arm of the U
  }
  return eaves;
}

export function build({ S, group, THREE }) {
  const baseY = LAND_Y - 0.6;
  const topY = LAND_Y + BASE_HEIGHT;
  const lightBuf = new Buf(1200); // night uplighting: strips of additive light along stone and under the eaves
  const lampCoords: number[] = [];
  const box = (localU, localV, yMin, yMax, sizeU, sizeV, color, opts?) => {
    const pos = toWorld(localU, localV);
    S.box(pos[0], pos[1], yMin, yMax, sizeU, sizeV, AXIS_ANGLE, color, opts);
  };

  buildMasonryBase(S, box, baseY, topY);
  buildDichVaultsAndWingWindows(S, box);
  buildParapetAndBackStairs(S, lightBuf, box, baseY, topY);
  const eaves = buildNguPhungPavilion(S, box, topY);

  // upper-storey wall panels with their round windows, dark timber between the red columns (one per main hall face)
  for (const eave of eaves) {
    const cosAng = Math.cos(eave.ang);
    const sinAng = Math.sin(eave.ang);
    const stripY = eave.y - eave.fascia - 0.07;
    const eavePt = (u, v): [number, number, number] => [eave.cx + u * cosAng - v * sinAng, stripY, eave.cz + u * sinAng + v * cosAng];
    const halfU = eave.w / 2 + eave.over - 0.3;
    const halfV = eave.d / 2 + eave.over - 0.3;
    for (const side of [-1, 1]) {
      lightBuf.beam(eavePt(-halfU, side * halfV), eavePt(halfU, side * halfV), 0.14, 0.1, COLORS.whiteRgb);
      lightBuf.beam(eavePt(side * halfU, -halfV), eavePt(side * halfU, halfV), 0.14, 0.1, COLORS.whiteRgb);
    }
  }

  // lamps in the court and behind the gates, just outside each gateway
  for (const gate of MAIN_GATES) {
    for (const lampV of [FRONT_V + 5.0, BACK_V - 4.0]) lampCoords.push(...toPoint3(gate.u, lampV, LAND_Y + (gate.u === 0 ? 2.5 : 2.2)));
  }

  S.kind = KIND.PLAIN;
  if (!group) return null;
  // night: the warm wash along the parapet and under every eave (shared uGlow), and the lamps before the gateways
  const lightMesh = new THREE.Mesh(lightBuf.geometry(), lightMaterial(COLORS.nightTint, 1.4));
  lightMesh.renderOrder = 19;
  lightMesh.userData.landmark = id;
  group.add(lightMesh);
  const glowMesh = glowPoints(lampCoords, lampCoords.map((_, i) => [1.0, 0.72, 0.34][i % 3]), 7);
  glowMesh.userData.glow = true;
  glowMesh.userData.landmark = id;
  group.add(glowMesh);
  return null;
}
