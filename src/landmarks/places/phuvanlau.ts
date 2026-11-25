import { Buf, KIND, hex, shade, unflat, obb } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { lightMaterial, glowPoints } from '../../geo/materials.ts';

// Phu Văn Lâu (1819, Gia Long; blown down 1904 and rebuilt as before under Thành Thái; restored 2014–2016), the
// riverside pavilion where royal edicts and exam results were posted, on the Citadel's axis between Kỳ Đài and
// Nghênh Lương Đình. Sources and estimates: docs/places/phuvanlau.md.
//   - a two-storey timber lầu on 16 dark-red ironwood columns (4 × 4); the four middle ones rise through both floors
//   - ground floor open all round on a tall grey stone platform (about 1.2 m), stairs in the middle of all four sides,
//     a 65 cm balustrade washed pale yellow round the platform's edge, open at the stairs
//   - eight roof slopes in two tiers (two hipped roofs), yellow glazed tubular tiles (hoàng lưu ly), the corners
//     turned up only a little; ceramic crests on the ridges, dragons on the upper ridge
//   - upper floor on the four inner columns, a wooden balcony rail round it on the lower roof; one wide window on the
//     front and back under the gilt red-lacquered "Phu Văn Lâu" board, round windows on the two sides
//   - about 11.2 m to the top of the pearl, 10.5 m to the crest (the car panoramas read 10-11 m;
//     docs/heights-reference.json has 11.8 m, vinwonders 11.67 m, both within the check's tolerance)
//   - in the yard: two small bronze cannons facing each other near the road, the two "khuynh cái hạ mã" stelae
//     farther out on either flank, and Thiệu Trị's 1843 stele house for the poem Hương Giang hiểu phiếm in the lawn
//     about 43 m to the right (south-west), on its own OSM footprint.
// Proportions and positions follow the 2026 satellite and Google's car Street View from Lê Duẩn (2026 rebuild,
// docs/places/phuvanlau.md). The OSM outline (way 531031520, 13.6 × 13.1 m) gives the axis; it lies about 1.6 m
// east and 0.8 m north of the building on the satellite and the car panoramas, so the centre is moved by that much.
export const id = 'phuvanlau';

// Thiệu Trị's 1843 stele house (~43 m SW of Phu Văn Lâu) is drawn here on its own OSM footprint
export function ownsMapped(ring) {
  return ring.every(([x, z]) => Math.hypot(x + 883, z - 403) < 9);
}

const CENTER_OFFSET = [-1.4, 0.8]; // scene x, z: from the OSM outline's centre to the building's (see above)
const YARD_HALF_U = 30; // half the yard's length along the road
const PLATFORM_HEIGHT = 1.2;
const PLATFORM_HALF_U = 6.0;
const PLATFORM_HALF_V = 5.8;
const COLUMN_US = [-4.75, -2.1, 2.1, 4.75]; // column lines (bays 2.65 / 4.2 / 2.65 m)
const COLUMN_VS = [-4.5, -2.0, 2.0, 4.5];
const STAIR_STEPS = 6;
const STAIR_TREAD = 0.32;

const COLORS = {
  red: hex('#8a2a1e'), // dark-red lacquered columns and timber
  nameBoardRed: hex('#a3241b'),
  cream: hex('#eadfc0'), // the upper floor's pale panels
  lime: hex('#e4d08f'), // the pale yellow balustrade
  baluster: hex('#efe6cc'),
  marble: hex('#d9d3c6'),
  plinth: hex('#a39c8e'), // the platform's weathered grey stone face
  yard: hex('#ad8a70'), // warm brick pavers, tan from above, pinkish-brown at street level
  brick: hex('#7a4a36'), // the planters' low brick walls
  bed: hex('#6f8a45'),
  roof: hex('#e6a23a'), // yellow-orange glazed tube tiles (hoàng lưu ly), as in the car panoramas
  ridge: hex('#ddd5c0'), // ceramic-clad ridges
  post: hex('#3d2b20'), // the stele house's dark timber
  oldTile: hex('#9a5e36'),
  greyRidge: hex('#8d887e'),
  gold: hex('#d8b04a'),
  glass: hex('#2c2a2c'), // the dark wide window
  lattice: hex('#4a3524'),
  bronze: hex('#5d4a2e'),
  lightTint: 0xffae42,
};

// A hipped roof drawn here rather than with S.hip: the main ridge length is set (ridgeHalf) instead of
// following from the plan, which on a square plan gives a near-pyramid; the faces are cut finer, so the gently
// curved slopes do not break into facets of different tilt; and the hip ridges are thin bands ending in a small
// kick at each corner (the shared S.hip ends them in horns sized to the roof, far too big here).
// frameFn(u, y, v): the roof's own frame to the scene. width along u (the ridge), depth along v; y0 the wall-top line.
function buildCustomHipRoof(S, angle, frameFn, width, depth, y0, riseH, opts) {
  const { over, flare = 0.2, rl: ridgeHalf, rows = 8, cols = 16, col, glazed = true, fascia = 0.25, fasciaCol, ridgeCol, rw = 0.16, kick = 0.35, tube = 0.32 } = opts;
  const halfW = width / 2 + over;
  const halfD = depth / 2 + over;
  const gamma = 1 + Math.min(0.8, flare * 1.25);
  const eaveCorners = [[-halfW, -halfD], [halfW, -halfD], [halfW, halfD], [-halfW, halfD]];
  const ridgeEnds = [[-ridgeHalf, 0], [ridgeHalf, 0]];
  const ridgeMap = [0, 1, 1, 0];
  const origin3 = frameFn(0, 0, 0);
  const dirVec = (localU, localV, y) => {
    const pt = frameFn(localU, y, localV);
    return [pt[0] - origin3[0], pt[1] - origin3[1], pt[2] - origin3[2]];
  };
  const faceHints = [dirVec(0, -1, 0.9), dirVec(1, 0, 0.9), dirVec(0, 1, 0.9), dirVec(-1, 0, 0.9)];
  const surfaceAt = (sideIdx, alongFrac, upFrac) => {
    const nextIdx = (sideIdx + 1) % 4;
    const eaveA = eaveCorners[sideIdx];
    const eaveB = eaveCorners[nextIdx];
    const ridgeA = ridgeEnds[ridgeMap[sideIdx]];
    const ridgeB = ridgeEnds[ridgeMap[nextIdx]];
    const eaveU = eaveA[0] + (eaveB[0] - eaveA[0]) * alongFrac;
    const eaveV = eaveA[1] + (eaveB[1] - eaveA[1]) * alongFrac;
    const ridgeU = ridgeA[0] + (ridgeB[0] - ridgeA[0]) * alongFrac;
    const ridgeV = ridgeA[1] + (ridgeB[1] - ridgeA[1]) * alongFrac;
    return frameFn(
      eaveU + (ridgeU - eaveU) * upFrac,
      y0 + riseH * upFrac ** gamma + flare * Math.abs(2 * alongFrac - 1) ** 2.2 * (1 - upFrac) ** 2,
      eaveV + (ridgeV - eaveV) * upFrac,
    );
  };
  if (S.roofs) {
    const center3 = frameFn(0, 0, 0);
    S.roofs.push({ cx: center3[0], cz: center3[2], w: width, d: depth, ang: angle, y0, h: riseH, over });
  }
  const keepKind = S.kind;
  S.kind = glazed ? KIND.GLAZED : KIND.TILE;
  for (let i = 0; i < 4; i++) {
    for (let k = 0; k < rows; k++) {
      for (let colIdx = 0; colIdx < cols; colIdx++) {
        S.quad(surfaceAt(i, colIdx / cols, k / rows), surfaceAt(i, (colIdx + 1) / cols, k / rows), surfaceAt(i, (colIdx + 1) / cols, (k + 1) / rows), surfaceAt(i, colIdx / cols, (k + 1) / rows), col, faceHints[i]);
      }
    }
  }
  // the tube tiles: rows of round tiles straight down each slope, square to its eave, cut off where they meet a hip
  // (a low ridged strip per row; the slope between them a shade darker)
  if (tube) {
    const tubeCol = shade(col, 1.12);
    const tubeSurface = (sideIdx, distFromMid, upFrac) => { // side sideIdx, distFromMid metres across it from its middle, upFrac from the eave up: a point, or null
      const halfSpan = sideIdx % 2 === 0 ? halfW * (1 - upFrac) + ridgeHalf * upFrac : halfD * (1 - upFrac);
      if (Math.abs(distFromMid) > halfSpan - 0.06) return null;
      return surfaceAt(sideIdx, sideIdx < 2 ? (distFromMid / halfSpan + 1) / 2 : (1 - distFromMid / halfSpan) / 2, upFrac);
    };
    for (let i = 0; i < 4; i++) {
      const span = i % 2 === 0 ? halfW : halfD;
      const tileCount = Math.floor((2 * span) / tube);
      const crossDir = i % 2 === 0 ? dirVec(1, 0, 0) : dirVec(0, 1, 0);
      for (let tileIdx = 0; tileIdx < tileCount; tileIdx++) {
        const offset = -span + (tileIdx + 0.5) * ((2 * span) / tileCount);
        let prevPt = tubeSurface(i, offset, 0);
        for (let k = 1; k <= rows * 2 && prevPt; k++) {
          const currPt = tubeSurface(i, offset, k / (rows * 2));
          if (!currPt) break;
          const tubeH = 0.06;
          const tubeHalfW = tube * 0.3;
          const topA = [prevPt[0], prevPt[1] + tubeH, prevPt[2]];
          const topB = [currPt[0], currPt[1] + tubeH, currPt[2]];
          const leftA = [prevPt[0] - crossDir[0] * tubeHalfW, prevPt[1] + 0.005, prevPt[2] - crossDir[2] * tubeHalfW];
          const leftB = [currPt[0] - crossDir[0] * tubeHalfW, currPt[1] + 0.005, currPt[2] - crossDir[2] * tubeHalfW];
          const rightA = [prevPt[0] + crossDir[0] * tubeHalfW, prevPt[1] + 0.005, prevPt[2] + crossDir[2] * tubeHalfW];
          const rightB = [currPt[0] + crossDir[0] * tubeHalfW, currPt[1] + 0.005, currPt[2] + crossDir[2] * tubeHalfW];
          S.quad(leftA, leftB, topB, topA, tubeCol, [-crossDir[0], 1, -crossDir[2]]);
          S.quad(topA, topB, rightB, rightA, tubeCol, [crossDir[0], 1, crossDir[2]]);
          prevPt = currPt;
        }
      }
    }
  }
  S.kind = KIND.PLAIN;
  const innerCorners = [[-width / 2, -depth / 2], [width / 2, -depth / 2], [width / 2, depth / 2], [-width / 2, depth / 2]];
  for (let i = 0; i < 4; i++) {
    for (let colIdx = 0; colIdx < cols; colIdx++) { // fascia, and the dark soffit back to the wall line
      const nextIdx = (i + 1) % 4;
      const frac0 = colIdx / cols;
      const frac1 = (colIdx + 1) / cols;
      const ptA = surfaceAt(i, frac0, 0);
      const ptB = surfaceAt(i, frac1, 0);
      const lowA = [ptA[0], ptA[1] - fascia, ptA[2]];
      const lowB = [ptB[0], ptB[1] - fascia, ptB[2]];
      S.quad(lowA, lowB, ptB, ptA, fasciaCol, faceHints[i]);
      const wallA = frameFn(innerCorners[i][0] + (innerCorners[nextIdx][0] - innerCorners[i][0]) * frac0, y0, innerCorners[i][1] + (innerCorners[nextIdx][1] - innerCorners[i][1]) * frac0);
      const wallB = frameFn(innerCorners[i][0] + (innerCorners[nextIdx][0] - innerCorners[i][0]) * frac1, y0, innerCorners[i][1] + (innerCorners[nextIdx][1] - innerCorners[i][1]) * frac1);
      S.quad(lowA, lowB, wallB, wallA, shade(fasciaCol, 0.45), [0, -1, 0]);
    }
  }
  for (let i = 0; i < 4; i++) { // hip ridges: thin pale bands down the curve, a small upturned kick at the corner
    let prevPt = null;
    for (let k = rows; k >= 0; k--) {
      const surfPt = surfaceAt(i, 0, k / rows);
      const ridgePt = [surfPt[0], surfPt[1] + rw * 0.45, surfPt[2]];
      if (prevPt) S.beam(prevPt, ridgePt, rw * 0.8, rw, ridgeCol);
      prevPt = ridgePt;
    }
    const dx = prevPt[0] - origin3[0];
    const dz = prevPt[2] - origin3[2];
    const dist = Math.hypot(dx, dz) || 1;
    const tipPt = [prevPt[0] + (dx / dist) * kick, prevPt[1] + kick * 0.8, prevPt[2] + (dz / dist) * kick];
    S.beam(prevPt, tipPt, rw * 0.75, rw * 0.85, ridgeCol);
  }
  if (ridgeHalf > 0.05) {
    S.beam(frameFn(-ridgeHalf, y0 + riseH + rw * 0.3, 0), frameFn(ridgeHalf, y0 + riseH + rw * 0.3, 0), rw * 1.2, rw * 1.5, ridgeCol);
  }
  S.kind = keepKind;
}

function buildYardAndPlatform(S, frame, baseY, platformY) {
  const { toPoint3, box } = frame;
  // ---- the yard: paved from the moat path out to the footway along Lê Duẩn, past the stelae on either side ----
  // (z20 satellite: about 60 m along Lê Duẩn, from the moat path to the footway; brick-walled planters on the flanks)
  S.kind = KIND.ROAD;
  // its top 15 cm up: the lawns are overlays pulled toward the camera (polygon offset), which at the low angle of a
  // street-level view win over a surface only a few cm above them
  box(0, -1.85, baseY - 0.3, baseY + 0.15, YARD_HALF_U * 2, 27.3, COLORS.yard, { topKind: KIND.ROAD });
  for (let i = -13; i <= 13; i++) box(i * 2.3, -1.85, baseY + 0.15, baseY + 0.16, 0.08, 27.3, shade(COLORS.yard, 0.9));
  // the two raised planters (plumeria in the panoramas) on the flanks, a low brick wall round a lawn
  S.kind = KIND.MASONRY;
  for (const signU of [-1, 1]) {
    const planterU = signU * 24;
    const planterV = -2.5;
    const planterW = 11;
    const planterD = 11.5;
    for (const signV of [-1, 1]) box(planterU, planterV + signV * (planterD / 2 - 0.15), baseY + 0.15, baseY + 0.5, planterW, 0.3, COLORS.brick, { top: shade(COLORS.brick, 1.15) });
    for (const sideW of [-1, 1]) box(planterU + sideW * (planterW / 2 - 0.15), planterV, baseY + 0.15, baseY + 0.5, 0.3, planterD - 0.6, COLORS.brick, { top: shade(COLORS.brick, 1.15) });
    S.kind = KIND.GROUND;
    box(planterU, planterV, baseY + 0.15, baseY + 0.42, planterW - 0.6, planterD - 0.6, COLORS.bed, { topKind: KIND.GROUND });
    S.kind = KIND.MASONRY;
  }

  // ---- platform: about 1.2 m of grey stone under a marble floor ----
  S.kind = KIND.MASONRY;
  box(0, 0, baseY - 0.3, platformY - 0.08, PLATFORM_HALF_U * 2, PLATFORM_HALF_V * 2, COLORS.plinth, { topKind: KIND.ROAD });
  box(0, 0, platformY - 0.08, platformY, PLATFORM_HALF_U * 2 + 0.1, PLATFORM_HALF_V * 2 + 0.1, COLORS.marble, { topKind: KIND.ROAD });
  // stairs in the middle of each side, six steps between low stone cheek walls: 4.4 m wide front and back, 2.6 m on
  // the sides (both sides show in the car panoramas; the back one is not seen and kept as before)
  const buildStair = (sideIdx, width) => { // sideIdx: 0 front (+v), 1 back (-v), 2 left (+u), 3 right (-u)
    const dirSign = sideIdx === 0 || sideIdx === 2 ? 1 : -1;
    const alongV = sideIdx < 2;
    const halfSpan = alongV ? PLATFORM_HALF_V : PLATFORM_HALF_U;
    const coordAt = (outDist, across) => (alongV ? [across, dirSign * outDist] : [dirSign * outDist, across]);
    for (let k = 1; k <= STAIR_STEPS; k++) {
      const dist = halfSpan + (k - 0.5) * STAIR_TREAD;
      const [localU, localV] = coordAt(dist, 0);
      box(localU, localV, baseY - 0.3, platformY - k * (PLATFORM_HEIGHT / (STAIR_STEPS + 1)), alongV ? width : STAIR_TREAD, alongV ? STAIR_TREAD : width, shade(COLORS.marble, 0.93), { topKind: KIND.ROAD });
    }
    for (const cheekSide of [-1, 1]) { // the cheeks: a sloping coping on a low wall
      const ptA = coordAt(halfSpan - 0.1, cheekSide * (width / 2 + 0.18));
      const ptB = coordAt(halfSpan + STAIR_STEPS * STAIR_TREAD + 0.15, cheekSide * (width / 2 + 0.18));
      const midPt = [(ptA[0] + ptB[0]) / 2, (ptA[1] + ptB[1]) / 2];
      const runLen = STAIR_STEPS * STAIR_TREAD + 0.25;
      // weathered grey stone like the platform, the coping running down into a low scrolled foot (the dragon's tail)
      box(midPt[0], midPt[1], baseY - 0.3, baseY + 0.35, alongV ? 0.36 : runLen, alongV ? runLen : 0.36, COLORS.plinth);
      S.beam(toPoint3(ptA[0], platformY + 0.62, ptA[1]), toPoint3(ptB[0], baseY + 0.5, ptB[1]), 0.34, 0.26, shade(COLORS.plinth, 1.06));
      box(ptB[0], ptB[1], baseY, baseY + 0.55, 0.4, 0.4, shade(COLORS.plinth, 0.96), { taper: 0.85 });
    }
  };
  buildStair(0, 4.0);
  buildStair(1, 4.0);
  buildStair(2, 2.4);
  buildStair(3, 2.4);
}

function buildGroundFloorAndBalustrade(S, frame, platformY, lowerEaveY, upperDeckY) {
  const { toWorld, toPoint3, box, angle } = frame;
  // ---- ground floor: 16 columns, open all round ----
  S.kind = KIND.TIMBER;
  for (const colU of COLUMN_US) {
    for (const colV of COLUMN_VS) {
      const isInner = Math.abs(colU) < 3 && Math.abs(colV) < 3;
      const pos = toWorld(colU, colV);
      const radius = isInner ? 0.2 : 0.17;
      S.cyl(pos[0], pos[1], platformY, platformY + 0.22, radius * 1.7, radius * 1.5, 8, shade(PAL.stone, 0.95), { cap: false, rot: angle });
      S.cyl(pos[0], pos[1], platformY + 0.22, isInner ? upperDeckY : lowerEaveY - 0.1, radius, radius * 0.94, 8, COLORS.red, { cap: false, rot: angle });
    }
  }
  // tie beams round the outer column heads and from the outer to the inner columns
  const tieBeamY = lowerEaveY - 0.35;
  const outerCorners = [[COLUMN_US[0], COLUMN_VS[0]], [COLUMN_US[3], COLUMN_VS[0]], [COLUMN_US[3], COLUMN_VS[3]], [COLUMN_US[0], COLUMN_VS[3]]];
  for (let i = 0; i < 4; i++) {
    S.beam(toPoint3(outerCorners[i][0], tieBeamY, outerCorners[i][1]), toPoint3(outerCorners[(i + 1) % 4][0], tieBeamY, outerCorners[(i + 1) % 4][1]), 0.22, 0.32, shade(COLORS.red, 0.85));
  }
  for (const colU of COLUMN_US) {
    for (const colV of COLUMN_VS) {
      if (Math.abs(colU) < 3 && Math.abs(colV) < 3) continue;
      const innerU = Math.max(-2.1, Math.min(2.1, colU));
      const innerV = Math.max(-2.0, Math.min(2.0, colV));
      S.beam(toPoint3(colU, tieBeamY, colV), toPoint3(innerU, tieBeamY + 0.25, innerV), 0.18, 0.26, shade(COLORS.red, 0.8));
    }
  }
  // the ceiling of the ground floor, seen from below between the column lines
  box(0, 0, lowerEaveY - 0.12, lowerEaveY - 0.02, 9.7, 9.2, shade(COLORS.red, 0.5), { bottom: true });

  // ---- balustrade round the platform's edge: lime-washed piers, pale balusters, a coping; open at the stairs ----
  S.kind = KIND.MASONRY;
  const balHalfU = PLATFORM_HALF_U - 0.2;
  const balHalfV = PLATFORM_HALF_V - 0.2;
  const buildRail = (ptA, ptB) => { // ptA, ptB: (u, v) ends of a straight run
    const len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
    if (len < 0.3) return;
    const midPt = [(ptA[0] + ptB[0]) / 2, (ptA[1] + ptB[1]) / 2];
    const alongU = Math.abs(ptB[0] - ptA[0]) > Math.abs(ptB[1] - ptA[1]);
    const sizePair = (thick, segLen): [number, number] => (alongU ? [segLen, thick] : [thick, segLen]);
    box(midPt[0], midPt[1], platformY, platformY + 0.14, ...sizePair(0.26, len), COLORS.lime);
    box(midPt[0], midPt[1], platformY + 0.14, platformY + 0.55, ...sizePair(0.14, len), COLORS.baluster);
    box(midPt[0], midPt[1], platformY + 0.55, platformY + 0.65, ...sizePair(0.3, len + 0.04), shade(COLORS.lime, 0.95));
  };
  const buildPier = (localU, localV) => box(localU, localV, platformY, platformY + 0.85, 0.36, 0.36, COLORS.lime, { top: shade(COLORS.lime, 0.9) });
  for (const signV of [-1, 1]) {
    buildRail([-balHalfU, signV * balHalfV], [-2.2, signV * balHalfV]);
    buildRail([2.2, signV * balHalfV], [balHalfU, signV * balHalfV]);
    buildPier(-2.2, signV * balHalfV);
    buildPier(2.2, signV * balHalfV);
  }
  for (const signU of [-1, 1]) {
    buildRail([signU * balHalfU, -balHalfV], [signU * balHalfU, -1.4]);
    buildRail([signU * balHalfU, 1.4], [signU * balHalfU, balHalfV]);
    buildPier(signU * balHalfU, -1.4);
    buildPier(signU * balHalfU, 1.4);
  }
  for (const signU of [-1, 1]) {
    for (const signV of [-1, 1]) buildPier(signU * balHalfU, signV * balHalfV);
  }
  return { tieBeamY, outerCorners, balHalfV };
}

function buildUpperFloorAndRoofs(S, frame, lowerEaveY, upperDeckY, upperEaveY) {
  const { toWorld, toPoint3, box, angle, centerX, centerZ } = frame;
  // ---- lower roof: the first tier of four slopes, its top hidden in the upper floor ----
  const eaveStyle = { fascia: 0.28, fasciaCol: shade(COLORS.red, 0.8), col: COLORS.roof, ridgeCol: COLORS.ridge };
  buildCustomHipRoof(S, angle, toPoint3, 9.5, 9.0, lowerEaveY, 3.0, { over: 1.4, flare: 0.2, rl: 1.4, rw: 0.17, kick: 0.3, ...eaveStyle, col: shade(COLORS.roof, 0.9) });

  // ---- upper floor: balcony deck and rail, the walls on the inner columns, windows, the name board ----
  // a painted frieze where the floor meets the lower roof
  box(0, 0, upperDeckY - 0.4, upperDeckY, 5.1, 4.9, shade(COLORS.red, 0.7), { top: shade(COLORS.red, 0.6) });
  box(0, 0, upperDeckY - 0.36, upperDeckY - 0.08, 5.14, 4.94, shade(COLORS.gold, 0.85));
  const railHalfU = 2.5;
  const railHalfV = 2.4;
  for (let i = 0; i <= 8; i++) { // rail posts and the top rail, all round
    const frac = (i / 8) * 2 - 1;
    for (const postPt of [[frac * railHalfU, -railHalfV], [frac * railHalfU, railHalfV], [-railHalfU, frac * railHalfV], [railHalfU, frac * railHalfV]]) {
      box(postPt[0], postPt[1], upperDeckY, upperDeckY + 0.68, 0.09, 0.09, COLORS.red);
    }
  }
  const railCorners = [[-railHalfU, -railHalfV], [railHalfU, -railHalfV], [railHalfU, railHalfV], [-railHalfU, railHalfV]];
  for (let i = 0; i < 4; i++) {
    for (const railY of [upperDeckY + 0.66, upperDeckY + 0.3]) {
      S.beam(toPoint3(railCorners[i][0], railY, railCorners[i][1]), toPoint3(railCorners[(i + 1) % 4][0], railY, railCorners[(i + 1) % 4][1]), 0.08, railY > upperDeckY + 0.5 ? 0.09 : 0.06, shade(COLORS.red, 1.1));
    }
  }
  S.kind = KIND.TIMBER;
  box(0, 0, upperDeckY, upperEaveY, 4.2, 4.0, COLORS.red, { top: shade(COLORS.roof, 0.8) });
  for (const colU of [-2.1, 2.1]) {
    for (const colV of [-2.0, 2.0]) box(colU, colV, upperDeckY, upperEaveY, 0.32, 0.32, COLORS.red); // the inner columns, proud of the walls
  }
  box(0, 2.02, upperEaveY - 0.45, upperEaveY - 0.15, 4.0, 0.04, shade(COLORS.red, 1.1));
  box(0, -2.02, upperEaveY - 0.45, upperEaveY - 0.15, 4.0, 0.04, shade(COLORS.red, 1.1));
  S.kind = KIND.PLAIN;
  // front and back: one wide dark window between pale panels, the name board above it on the front
  for (const faceSign of [-1, 1]) {
    box(0, faceSign * 2.02, upperDeckY + 0.15, upperDeckY + 1.62, 2.5, 0.04, COLORS.gold);
    box(0, faceSign * 2.04, upperDeckY + 0.2, upperDeckY + 1.57, 2.36, 0.04, COLORS.glass);
    for (const signU of [-1, 1]) box(signU * 1.55, faceSign * 2.03, upperDeckY + 0.15, upperEaveY - 0.5, 0.42, 0.04, COLORS.cream);
  }
  // the two sides: a round window each (a 16-gon of lattice in a gold ring) in a dark square, pale panels beside it
  for (const faceSign of [-1, 1]) {
    box(faceSign * 2.02, 0, upperDeckY + 0.45, upperDeckY + 1.95, 0.04, 1.6, COLORS.glass);
    for (const signV of [-1, 1]) box(faceSign * 2.03, signV * 1.35, upperDeckY + 0.15, upperEaveY - 0.5, 0.04, 0.8, COLORS.cream);
    for (const [rad, col, off] of [[0.62, COLORS.gold, 2.05], [0.52, COLORS.lattice, 2.07]] as any[]) {
      const winCenter = [faceSign * off, upperDeckY + 1.2, 0];
      for (let k = 0; k < 16; k++) {
        const ang0 = (k / 16) * Math.PI * 2;
        const ang1 = ((k + 1) / 16) * Math.PI * 2;
        const ptA = toPoint3(winCenter[0], winCenter[1] + Math.sin(ang0) * rad, Math.cos(ang0) * rad);
        const ptB = toPoint3(winCenter[0], winCenter[1] + Math.sin(ang1) * rad, Math.cos(ang1) * rad);
        const normPt = toWorld(faceSign, 0);
        S.tri(toPoint3(winCenter[0], winCenter[1], 0), ptA, ptB, col, [normPt[0] - centerX, 0, normPt[1] - centerZ]);
      }
    }
  }
  // the name board over the front window: red lacquer, a gilt frame
  box(0, 2.06, upperDeckY + 1.7, upperDeckY + 2.12, 1.45, 0.05, COLORS.gold);
  box(0, 2.1, upperDeckY + 1.74, upperDeckY + 2.08, 1.3, 0.04, COLORS.nameBoardRed);

  // ---- upper roof: the second tier, hipped on a long straight ridge (about two thirds of its width, as in the car
  // panoramas and the satellite's oblong top) with a ceramic dragon at each end facing a flaming pearl in the middle ----
  const upperRoofH = 1.8;
  const upperOver = 0.6;
  const upperRidgeHalf = 1.95;
  buildCustomHipRoof(S, angle, toPoint3, 4.2, 4.0, upperEaveY, upperRoofH, { over: upperOver, flare: 0.18, rl: upperRidgeHalf, rows: 6, cols: 12, rw: 0.15, kick: 0.25, tube: 0.28, ...eaveStyle, col: shade(COLORS.roof, 0.9) });
  const ridgeTopY = upperEaveY + upperRoofH;
  S.kind = KIND.PLAIN;
  // the crest: a low ceramic band along the ridge
  const crestY = ridgeTopY + 0.2;
  box(0, 0, crestY - 0.05, crestY + 0.26, upperRidgeHalf * 2 - 0.3, 0.14, shade(COLORS.ridge, 0.95));
  box(0, 0, crestY + 0.26, crestY + 0.3, upperRidgeHalf * 2 - 0.2, 0.2, COLORS.ridge);
  for (const side of [-1, 1]) { // the dragons: body low along the crest, head raised and turned in toward the pearl
    const tailPt = toPoint3(side * (upperRidgeHalf - 0.05), crestY + 0.05, 0);
    const neckPt = toPoint3(side * (upperRidgeHalf - 0.1), crestY + 0.5, 0);
    const headPt = toPoint3(side * (upperRidgeHalf - 0.45), crestY + 0.45, 0);
    const snoutPt = toPoint3(side * (upperRidgeHalf - 0.75), crestY + 0.22, 0);
    S.beam(snoutPt, headPt, 0.12, 0.14, COLORS.ridge);
    S.beam(tailPt, neckPt, 0.16, 0.2, COLORS.ridge);
    S.beam(neckPt, headPt, 0.13, 0.16, shade(COLORS.ridge, 0.9));
  }
  const pearlPos = toWorld(0, 0); // the pearl in a ring of flames on a small stand: the top of the building
  S.cyl(pearlPos[0], pearlPos[1], crestY + 0.18, crestY + 0.38, 0.1, 0.14, 8, COLORS.ridge);
  S.cyl(pearlPos[0], pearlPos[1], crestY + 0.38, crestY + 0.62, 0.2, 0.16, 8, shade(COLORS.gold, 0.95));
  S.cyl(pearlPos[0], pearlPos[1], crestY + 0.62, crestY + 0.85, 0.16, 0.03, 8, shade(COLORS.gold, 0.95));
  return upperOver;
}

function buildYardPropsAndSteleHouse(data, S, frame, outlineCenter, baseY) {
  const { toPoint3, box, axisX, axisZ, angle } = frame;
  // ---- the yard: cannons near the road, the two dismount stelae ----
  for (const signU of [-1, 1]) { // small bronze cannons on carved stone carriages, facing each other across the axis
    const cannonU = signU * 6.5;
    const cannonV = 10.9;
    S.kind = KIND.MASONRY;
    box(cannonU, cannonV, baseY + 0.15, baseY + 0.5, 1.1, 0.5, shade(PAL.stone, 0.75));
    S.kind = KIND.PLAIN;
    S.beam(toPoint3(cannonU + signU * 0.6, baseY + 0.55, cannonV), toPoint3(cannonU - signU * 1.0, baseY + 0.68, cannonV), 0.24, 0.24, COLORS.bronze);
  }
  S.kind = KIND.MASONRY;
  for (const signU of [-1, 1]) { // "khuynh cái hạ mã": a slender stone post on a plinth under a small stone cap
    const steleU = signU * 13.4;
    const steleV = 9.6;
    box(steleU, steleV, baseY, baseY + 0.25, 0.75, 0.6, PAL.stone, { topKind: KIND.ROAD });
    box(steleU, steleV, baseY + 0.25, baseY + 1.25, 0.36, 0.22, shade(PAL.stone, 0.88));
    box(steleU, steleV, baseY + 1.25, baseY + 1.4, 0.46, 0.32, shade(PAL.stone, 0.8), { taper: 0.6 });
  }
  // ---- the stele house: four posts and a hipped roof over the poem stele, on OSM's footprint in the lawn ----
  // fallback: where OSM has it, 42.6 m to the right of the outline's centre and 4.3 m forward
  let steleCenter = [outlineCenter[0] - 42.6 * axisX - 4.3 * axisZ, outlineCenter[1] - 42.6 * axisZ + 4.3 * axisX];
  for (const bld of data.bld || []) { // the mapped footprint itself, when it is there
    const ringPts = bld[0];
    const vertCount = ringPts.length / 2;
    let x = 0;
    let z = 0;
    for (let i = 0; i < ringPts.length; i += 2) {
      x += ringPts[i] / 10 / vertCount;
      z += ringPts[i + 1] / 10 / vertCount;
    }
    if (Math.hypot(x - steleCenter[0], z - steleCenter[1]) < 4) {
      steleCenter = [x, z];
      break;
    }
  }
  const steleGroundY = LAND_Y + rise(steleCenter[0], steleCenter[1]);
  const steleWorld = (localU, localV): [number, number] => [steleCenter[0] + localU * axisX - localV * axisZ, steleCenter[1] + localU * axisZ + localV * axisX];
  const steleBox = (localU, localV, y0, y1, sizeU, sizeV, color, opts?) => {
    const pos = steleWorld(localU, localV);
    S.box(pos[0], pos[1], y0, y1, sizeU, sizeV, angle, color, opts);
  };
  S.kind = KIND.MASONRY;
  steleBox(0, 0, steleGroundY - 0.2, steleGroundY + 0.18, 5.4, 5.4, shade(PAL.stone, 0.85), { topKind: KIND.ROAD });
  steleBox(0, 0, steleGroundY + 0.18, steleGroundY + 0.36, 3.6, 3.6, PAL.stone, { topKind: KIND.ROAD });
  steleBox(0, 0, steleGroundY + 0.36, steleGroundY + 0.66, 1.2, 0.7, shade(PAL.stone, 0.9));
  steleBox(0, 0, steleGroundY + 0.66, steleGroundY + 2.1, 0.85, 0.2, shade(PAL.stone, 0.72));
  S.kind = KIND.TIMBER;
  // dark timber posts; a weathered brown-orange tiled roof with grey ridges and small kicks at the corners
  for (const offsetU of [-1.2, 1.2]) {
    for (const offsetV of [-1.2, 1.2]) {
      const pos = steleWorld(offsetU, offsetV);
      S.cyl(pos[0], pos[1], steleGroundY + 0.36, steleGroundY + 2.75, 0.12, 0.11, 8, COLORS.post, { cap: false, rot: angle });
    }
  }
  const stelePoint3 = (localU, y, localV) => {
    const pos = steleWorld(localU, localV);
    return [pos[0], y, pos[1]];
  };
  buildCustomHipRoof(S, angle, stelePoint3, 2.4, 2.4, steleGroundY + 2.75, 1.25, {
    over: 0.65, flare: 0.25, rl: 0.5, rows: 5, cols: 6, tube: 0.3, col: COLORS.oldTile, glazed: false, fascia: 0.18, fasciaCol: shade(COLORS.post, 1.2), ridgeCol: COLORS.greyRidge, rw: 0.13, kick: 0.25,
  });
  S.kind = KIND.PLAIN;
}

function buildNightLighting(group, THREE, frame, baseY, platformY, lowerEaveY, upperEaveY, upperOver, groundInfo) {
  if (!group || !THREE) return;
  const { toWorld, toPoint3 } = frame;
  const lightBuf = new Buf(600);
  const lampCoords: number[] = [];
  const lampColors: number[] = [];
  const addEaveStrip = (eaveRect, y) => {
    const halfU = eaveRect.w / 2 + eaveRect.over - 0.3;
    const halfV = eaveRect.d / 2 + eaveRect.over - 0.3;
    const corners = [[-halfU, -halfV], [halfU, -halfV], [halfU, halfV], [-halfU, halfV]];
    for (let i = 0; i < 4; i++) {
      lightBuf.beam(toPoint3(corners[i][0], y, corners[i][1]), toPoint3(corners[(i + 1) % 4][0], y, corners[(i + 1) % 4][1]), 0.13, 0.09, [1, 1, 1]);
    }
  };
  addEaveStrip({ w: 9.5, d: 9.0, over: 1.4 }, lowerEaveY - 0.28 - 0.07);
  addEaveStrip({ w: 4.2, d: 4.0, over: upperOver }, upperEaveY - 0.28 - 0.07);
  // the column-head beam, washed from below
  for (let i = 0; i < 4; i++) {
    lightBuf.beam(toPoint3(groundInfo.outerCorners[i][0], groundInfo.tieBeamY - 0.2, groundInfo.outerCorners[i][1]), toPoint3(groundInfo.outerCorners[(i + 1) % 4][0], groundInfo.tieBeamY - 0.2, groundInfo.outerCorners[(i + 1) % 4][1]), 0.1, 0.08, [1, 1, 1]);
  }
  const mesh = new THREE.Mesh(lightBuf.geometry(), lightMaterial(COLORS.lightTint, 1.2));
  mesh.renderOrder = 19;
  mesh.userData.landmark = id;
  group.add(mesh);
  for (const signV of [-1, 1]) {
    for (const signU of [-1, 1]) {
      const pos = toWorld(signU * 2.2, signV * groundInfo.balHalfV);
      lampCoords.push(pos[0], platformY + 1.1, pos[1]);
      lampColors.push(1.0, 0.72, 0.34);
    }
  }
  for (const signU of [-1, 1]) {
    for (const signV of [-1, 1]) {
      const pos = toWorld(signU * (PLATFORM_HALF_U + 0.4), signV * (PLATFORM_HALF_V + 0.4));
      lampCoords.push(pos[0], baseY + 0.3, pos[1]);
      lampColors.push(1.0, 0.8, 0.45);
    }
  }
  const glowMesh = glowPoints(lampCoords, lampColors, 7);
  glowMesh.userData.glow = true;
  glowMesh.userData.landmark = id;
  group.add(glowMesh);
}

export function build({ data, S, group, place, THREE }) {
  const ring = data.special?.phuvanlau?.ring ? unflat(data.special.phuvanlau.ring) : null;
  if (!ring && !place) return null;
  const fit = ring ? obb(ring) : { c: [place.x, place.z], w: 13.6, d: 13.1, a: 0 };
  // the axis: from Kỳ Đài out to the river (fwdAxis); u runs across the front, v along fwdAxis
  let fwdAxis = [0.58, 0.817];
  if (data.special?.kydai) {
    const kydaiRing = unflat(data.special.kydai.ring);
    const kydaiCenter = kydaiRing.reduce((acc, pt) => [acc[0] + pt[0] / kydaiRing.length, acc[1] + pt[1] / kydaiRing.length], [0, 0]);
    const dist = Math.hypot(fit.c[0] - kydaiCenter[0], fit.c[1] - kydaiCenter[1]) || 1;
    fwdAxis = [(fit.c[0] - kydaiCenter[0]) / dist, (fit.c[1] - kydaiCenter[1]) / dist];
  }
  // square the axis to the mapped outline's nearer side
  const fitCos = Math.cos(fit.a);
  const fitSin = Math.sin(fit.a);
  const candidates = [[fitCos, fitSin], [-fitCos, -fitSin], [-fitSin, fitCos], [fitSin, -fitCos]];
  fwdAxis = candidates.sort((ptA, ptB) => (ptB[0] * fwdAxis[0] + ptB[1] * fwdAxis[1]) - (ptA[0] * fwdAxis[0] + ptA[1] * fwdAxis[1]))[0];

  const angle = Math.atan2(-fwdAxis[0], fwdAxis[1]); // so that toWorld(0, v) runs along fwdAxis
  const axisX = Math.cos(angle);
  const axisZ = Math.sin(angle);
  const centerX = fit.c[0] + (ring ? CENTER_OFFSET[0] : 0);
  const centerZ = fit.c[1] + (ring ? CENTER_OFFSET[1] : 0);
  const toWorld = (localU, localV): [number, number] => [centerX + localU * axisX - localV * axisZ, centerZ + localU * axisZ + localV * axisX];
  const toPoint3 = (localU, y, localV) => {
    const pos = toWorld(localU, localV);
    return [pos[0], y, pos[1]];
  };
  const box = (localU, localV, y0, y1, sizeU, sizeV, color, opts?) => {
    const pos = toWorld(localU, localV);
    S.box(pos[0], pos[1], y0, y1, sizeU, sizeV, angle, color, opts);
  };
  const frame = { centerX, centerZ, axisX, axisZ, angle, toWorld, toPoint3, box };
  const baseY = LAND_Y + rise(centerX, centerZ);
  const platformY = baseY + PLATFORM_HEIGHT;
  const lowerEaveY = baseY + 4.2;
  const upperDeckY = baseY + 6.0;
  const upperEaveY = baseY + 8.3;

  buildYardAndPlatform(S, frame, baseY, platformY);
  const groundInfo = buildGroundFloorAndBalustrade(S, frame, platformY, lowerEaveY, upperDeckY);
  const upperOver = buildUpperFloorAndRoofs(S, frame, lowerEaveY, upperDeckY, upperEaveY);
  buildYardPropsAndSteleHouse(data, S, frame, fit.c, baseY);
  buildNightLighting(group, THREE, frame, baseY, platformY, lowerEaveY, upperEaveY, upperOver, groundInfo);
  return null;
}
