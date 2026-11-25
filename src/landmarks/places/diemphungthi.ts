import * as THREE from 'three';
import { KIND, hex, shade, inRing } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { glowPoints } from '../../geo/materials.ts';

// ---- Trung tâm Nghệ thuật Điềm Phùng Thị (Điềm Phùng Thị Art Centre), 17 Lê Lợi ----
// Sources: docs/places/diemphungthi.md, OSM way 118540998 (re-fitted to Google satellite & Street View).
export const id = 'diemphungthi';

const ORIGIN = [67.33, 205.3];
const DIR_U = [0.7547, 0.6561], DIR_V = [0.6561, -0.7547];
const BODY_LEN = 18.15, BODY_WID = 7.7, WING_START_U = 11.0, WING_EXTRA_V = 1.2, WING_SW_V = -0.25, ANNEX_LEN = 4.2;
const SIDE_BAY_V0 = -5.0, CENTER_BAY_V0 = -3.0, CENTER_BAY_V1 = 1.95;

const OSM_RING = [[71.5, 202.0], [80.1, 211.6], [81.6, 210.4], [86.1, 215.5], [77.0, 223.6], [63.8, 208.8]];
const GARDEN_RING = [
  [25.0, 204.4], [54.4, 178.9], [66.4, 192.6], [76.2, 184.4], [95.6, 206.8], [105.6, 218.0], [99.0, 224.4],
  [94.6, 229.2], [99.2, 234.4], [75.2, 255.4], [62.0, 241.6], [63.6, 239.0], [63.8, 235.6], [62.4, 232.4],
  [59.6, 230.2], [56.2, 229.6], [53.0, 230.6],
];
const FORECOURT_RING = [
  [60.6, 205.1], [60.1, 190.5], [68.0, 179.4], [76.6, 177.9], [89.5, 180.8], [92.6, 190.5], [97.4, 198.0],
  [100.7, 203.1], [96.9, 207.7], [100.4, 222.0], [96.9, 228.6], [89.5, 228.6], [85.2, 222.0], [80.6, 223.4], [73.6, 214.2], [66.3, 206.6],
];

const COLORS = {
  wall: hex('#ece8dd'),
  trim: hex('#f6f3ea'),
  shutter: hex('#e2d6a0'),
  plinth: hex('#9d968a'),
  roof: PAL.indochineRoof[0],
  door: hex('#3b3631'),
  glass: hex('#80878a'),
  iron: hex('#2c2a27'),
  lawn: hex('#93ab66'),
  path: hex('#cfc4ae'),
  gravel: hex('#c9bfa8'),
  bench: hex('#3c4a3a'),
  white: hex('#e8e4da'),
  grey: hex('#a7a49c'),
  bronze: hex('#4e4a3c'),
  laterite: hex('#9a5a3e'),
  black: hex('#2f2e2c'),
};

const groundY = (x, z) => LAND_Y + rise(x, z);

function buildGardenAndForecourt(data, S, pt) {
  if (Array.isArray(data.infill)) {
    const infill = data.infill, stride = 8, kept = [];
    const nearCount = data.meta?.counts?.infillNear ?? infill.length / stride;
    let nearKept = 0;
    for (let i = 0; i < infill.length / stride; i++) {
      if (inRing(infill[i * stride] / 10, infill[i * stride + 1] / 10, GARDEN_RING)) continue;
      if (i < nearCount) nearKept++;
      for (let j = 0; j < stride; j++) kept.push(infill[i * stride + j]);
    }
    if (kept.length !== infill.length) {
      infill.length = 0;
      for (const val of kept) infill.push(val);
      if (data.meta?.counts && data.meta.counts.infillNear != null) data.meta.counts.infillNear = nearKept;
    }
  }

  if (Array.isArray(data.bld)) {
    for (let i = data.bld.length - 1; i >= 0; i--) {
      const flat = data.bld[i][0];
      let cx = 0, cz = 0;
      for (let k = 0; k < flat.length; k += 2) { cx += flat[k] / 10; cz += flat[k + 1] / 10; }
      cx /= flat.length / 2;
      cz /= flat.length / 2;
      if (inRing(cx, cz, OSM_RING)) data.bld.splice(i, 1);
    }
  }

  S.base = 0;
  S.kind = KIND.GROUND;
  const gardenVecs = GARDEN_RING.map((pos) => new THREE.Vector2(pos[0], pos[1]));
  for (const face of THREE.ShapeUtils.triangulateShape(gardenVecs, [])) {
    const tri = face.map((i) => { const pos = GARDEN_RING[i]; return [pos[0], groundY(pos[0], pos[1]) + 0.05, pos[1]]; });
    S.tri(tri[0], tri[1], tri[2], COLORS.lawn, [0, 1, 0]);
  }

  const pavedStart = S.n;
  S.kind = KIND.ROAD;
  const drawWalk = (ptA, ptB, width, col = COLORS.path) => {
    const dx = ptB[0] - ptA[0], dz = ptB[1] - ptA[1], len = Math.hypot(dx, dz);
    const yy = Math.max(groundY(ptA[0], ptA[1]), groundY(ptB[0], ptB[1]));
    S.box((ptA[0] + ptB[0]) / 2, (ptA[1] + ptB[1]) / 2, yy - 0.1, yy + 0.1, len, width, Math.atan2(dz, dx), col);
  };

  const forecourtVecs = FORECOURT_RING.map((pos) => new THREE.Vector2(pos[0], pos[1]));
  for (const face of THREE.ShapeUtils.triangulateShape(forecourtVecs, [])) {
    const clipped = clipConvex(GARDEN_RING, face.map((i) => FORECOURT_RING[i]));
    if (clipped.length < 3) continue;
    for (const sub of THREE.ShapeUtils.triangulateShape(clipped.map((pos) => new THREE.Vector2(pos[0], pos[1])), [])) {
      const tri = sub.map((i) => { const pos = clipped[i]; return [pos[0], groundY(pos[0], pos[1]) + 0.1, pos[1]]; });
      S.tri(tri[0], tri[1], tri[2], COLORS.gravel, [0, 1, 0]);
    }
  }

  drawWalk(pt(-ANNEX_LEN - 1.4, -1.6), pt(WING_START_U - 1.0, -1.6), 1.8);
  drawWalk(pt(WING_START_U - 1.0, -1.6), pt(WING_START_U - 1.0, SIDE_BAY_V0 - 1.2), 1.8);
  drawWalk(pt(WING_START_U - 1.0, SIDE_BAY_V0 - 1.2), pt(BODY_LEN + 1.6, SIDE_BAY_V0 - 1.2), 1.8);
  drawWalk(pt(-ANNEX_LEN - 1.4, BODY_WID / 2), [45.0, 190.0], 2.2);
  drawWalk([33.0, 205.5], [50.0, 220.5], 1.6);
  drawWalk([50.0, 220.5], pt(BODY_LEN * 0.55, -1.6), 1.6);
  drawWalk([52.0, 233.0], pt(BODY_LEN + 1.6, SIDE_BAY_V0 - 1.2), 1.6);
  (S.paved = S.paved || []).push([pavedStart, S.n]);
}

function buildVillaAndRoofs(S, pt, box, ang, y0, lamps) {
  const plinthY = y0 + 0.6;
  const corniceY = plinthY + 7.9;
  const stringY = plinthY + 3.8;
  const wingOuterV = BODY_WID + WING_EXTRA_V;
  const wingDepth = BODY_LEN - WING_START_U;
  const wingCenterV = (WING_SW_V + wingOuterV) / 2, wingWidth = wingOuterV - WING_SW_V;
  const sideCenterV = (SIDE_BAY_V0 + WING_SW_V) / 2, sideWidth = WING_SW_V - SIDE_BAY_V0;

  S.kind = KIND.MASONRY;
  box(BODY_LEN / 2, BODY_WID / 2, y0 - 0.3, plinthY, BODY_LEN + 0.3, BODY_WID + 0.3, COLORS.plinth);
  box((WING_START_U + BODY_LEN) / 2, (SIDE_BAY_V0 + wingOuterV) / 2, y0 - 0.3, plinthY, wingDepth + 0.3, wingOuterV - SIDE_BAY_V0 + 0.3, COLORS.plinth);
  box(-ANNEX_LEN / 2, BODY_WID / 2, y0 - 0.3, plinthY, ANNEX_LEN + 0.3, BODY_WID + 0.6, COLORS.plinth);

  S.base = plinthY - LAND_Y;
  S.kind = KIND.PLAIN;
  box(BODY_LEN / 2, BODY_WID / 2, plinthY, corniceY, BODY_LEN, BODY_WID, COLORS.wall);
  box((WING_START_U + BODY_LEN) / 2, wingCenterV, plinthY, corniceY, wingDepth, wingWidth, COLORS.wall);
  box((WING_START_U + BODY_LEN) / 2, sideCenterV, plinthY, corniceY, wingDepth, sideWidth + 0.02, COLORS.wall);

  // River-end annex & balustrade
  const annexTopY = plinthY + 3.9;
  box(-ANNEX_LEN / 2, BODY_WID / 2, plinthY, annexTopY, ANNEX_LEN, BODY_WID + 0.3, COLORS.wall, { top: shade(COLORS.trim, 0.85) });
  box(-ANNEX_LEN / 2, BODY_WID / 2, annexTopY, annexTopY + 0.2, ANNEX_LEN + 0.25, BODY_WID + 0.55, COLORS.trim);
  for (const [u0, v0, u1, v1] of ([[-ANNEX_LEN, -0.1, -ANNEX_LEN, BODY_WID + 0.4], [-ANNEX_LEN, -0.1, 0, -0.1], [-ANNEX_LEN, BODY_WID + 0.4, 0, BODY_WID + 0.4]] as any[])) {
    const segLen = Math.hypot(u1 - u0, v1 - v0), count = Math.max(2, Math.round(segLen / 0.32));
    const isAlongV = u0 === u1;
    box((u0 + u1) / 2, (v0 + v1) / 2, annexTopY + 0.85, annexTopY + 0.97, isAlongV ? 0.2 : segLen, isAlongV ? segLen : 0.2, COLORS.trim);
    for (let i = 0; i <= count; i++) {
      const frac = i / count;
      box(u0 + (u1 - u0) * frac, v0 + (v1 - v0) * frac, annexTopY + 0.2, annexTopY + 0.85, 0.11, 0.11, COLORS.trim);
    }
  }

  const drawBand = (y, h, grow, col) => {
    box(BODY_LEN / 2, BODY_WID / 2, y, y + h, BODY_LEN + grow, BODY_WID + grow, col);
    box((WING_START_U + BODY_LEN) / 2, (SIDE_BAY_V0 + wingOuterV) / 2, y, y + h, wingDepth + grow, wingOuterV - SIDE_BAY_V0 + grow, col);
  };
  drawBand(stringY, 0.22, 0.14, COLORS.trim);
  drawBand(corniceY - 0.15, 0.4, 0.36, COLORS.trim);
  for (const [u, v] of ([[0, 0], [0, BODY_WID], [WING_START_U, BODY_WID], [WING_START_U, wingOuterV], [BODY_LEN, wingOuterV], [BODY_LEN, SIDE_BAY_V0], [WING_START_U, SIDE_BAY_V0], [WING_START_U, 0]] as any[])) {
    box(u, v, plinthY, corniceY - 0.15, 0.45, 0.45, COLORS.trim);
  }
  for (const v of [CENTER_BAY_V0, CENTER_BAY_V1]) box(BODY_LEN, v, plinthY, corniceY - 0.15, 0.3, 0.5, COLORS.trim);

  const drawOpening = (face, posAlong, faceOffset, yBot, height, width = 0.9, isDoor = false) => {
    const out = 0.06, shutterW = width / 2;
    const faceUV = (depth, along) => (face === 'se' ? [BODY_LEN + depth, along] : face === 'nw' ? [faceOffset - depth, along] : face === 'sw' ? [along, faceOffset - depth] : [along, faceOffset + depth]);
    const put = (depth, along, span, y1, y2, col) => {
      const [u, v] = faceUV(depth, along), alongU = face === 'sw' || face === 'ne';
      box(u, v, y1, y2, alongU ? span : 0.1, alongU ? 0.1 : span, col);
    };
    put(out * 0.5, posAlong, width + 0.24, yBot - 0.1, yBot + height + 0.12, COLORS.trim);
    put(out, posAlong, width, yBot, yBot + height, isDoor ? COLORS.door : COLORS.glass);
    for (const side of [-1, 1]) put(out * 1.5, posAlong + side * (width / 2 + 0.12 + shutterW / 2), shutterW, yBot, yBot + height, COLORS.shutter);
    if (isDoor) put(out, posAlong, width + 0.1, yBot + height + 0.15, yBot + height + 0.7, COLORS.shutter);
    else put(out * 2, posAlong, width + 0.5, yBot + height + 0.18, yBot + height + 0.32, COLORS.trim);
  };

  const doorV = (CENTER_BAY_V0 + CENTER_BAY_V1) / 2, rightBayV = [3.9, 6.4];
  drawOpening('se', doorV, 0, plinthY, 1.85, 1.3, true);
  drawOpening('se', (SIDE_BAY_V0 + CENTER_BAY_V0) / 2, 0, plinthY + 0.5, 1.8, 0.8);
  drawOpening('se', (SIDE_BAY_V0 + CENTER_BAY_V0) / 2, 0, stringY + 1.3, 1.8, 0.8);
  for (const v of rightBayV) drawOpening('se', v, 0, plinthY + 0.5, 1.9);
  for (const v of [doorV, ...rightBayV]) drawOpening('se', v, 0, stringY + 1.3, 2.0);

  // Center bay shouldered gable, steps, and tiled door awning
  const centerBayW = CENTER_BAY_V1 - CENTER_BAY_V0, gableU = BODY_LEN + 0.12, gableD = 0.9;
  box(gableU, doorV, corniceY - 0.35, corniceY - 0.15, gableD - 0.1, centerBayW + 0.3, COLORS.trim);
  box(gableU, doorV, corniceY - 0.15, corniceY + 1.0, gableD, centerBayW, COLORS.wall);
  box(gableU, doorV, corniceY + 1.0, corniceY + 1.14, gableD + 0.12, centerBayW + 0.18, COLORS.trim);
  box(gableU, doorV, corniceY + 1.0, corniceY + 2.0, gableD, centerBayW * 0.56, COLORS.wall);
  box(gableU, doorV, corniceY + 2.0, corniceY + 2.16, gableD + 0.12, centerBayW * 0.56 + 0.18, COLORS.trim);
  box(gableU + gableD / 2, doorV, corniceY + 1.25, corniceY + 1.75, 0.06, 0.5, COLORS.glass);

  S.kind = KIND.MASONRY;
  box(BODY_LEN + 0.45, doorV, y0, plinthY + 0.05, 0.9, 2.2, COLORS.plinth);
  box(BODY_LEN + 0.95, doorV, y0, plinthY - 0.25, 0.7, 2.0, shade(COLORS.plinth, 1.06));
  S.kind = KIND.PLAIN;

  const awningPt = pt(BODY_LEN + 0.7, doorV);
  S.hip(awningPt[0], awningPt[1], 2.4, 1.3, ang + Math.PI / 2, plinthY + 3.45, 0.25, shade(COLORS.roof, 0.85), { over: 0.05 });
  for (const side of [-1, 1]) {
    const v = doorV + side * 1.05;
    box(BODY_LEN + 0.4, v, plinthY + 3.33, plinthY + 3.45, 0.7, 0.06, COLORS.shutter);
    box(BODY_LEN + 0.1, v, plinthY + 2.55, plinthY + 3.45, 0.12, 0.06, COLORS.shutter);
    for (let i = 1; i <= 3; i++) box(BODY_LEN + 0.1 + i * 0.14, v, plinthY + 2.55 + i * 0.22, plinthY + 2.75 + i * 0.22, 0.14, 0.05, COLORS.shutter);
  }

  for (const u of [1.6, 4.4, 7.2, 9.6]) {
    drawOpening('sw', u, 0, plinthY + 0.5, 1.9);
    drawOpening('sw', u, 0, stringY + 1.3, 2.0);
    drawOpening('ne', u, BODY_WID, plinthY + 0.5, 1.9);
    drawOpening('ne', u, BODY_WID, stringY + 1.3, 2.0);
  }
  for (const u of [12.9, 16.2]) {
    drawOpening('sw', u, SIDE_BAY_V0, plinthY + 0.5, 1.9);
    drawOpening('sw', u, SIDE_BAY_V0, stringY + 1.3, 2.0);
    drawOpening('ne', u, wingOuterV, plinthY + 0.5, 1.9);
    drawOpening('ne', u, wingOuterV, stringY + 1.3, 2.0);
  }
  for (const v of [1.6, BODY_WID / 2, BODY_WID - 1.6]) {
    drawOpening('nw', v, -ANNEX_LEN, plinthY + 0.05, 2.6, 1.2, v === BODY_WID / 2);
    drawOpening('nw', v, 0, stringY + 1.3, 2.0);
  }
  for (const v of [-0.1, BODY_WID + 0.4]) drawOpening(v < 0 ? 'sw' : 'ne', -ANNEX_LEN / 2, v, plinthY + 0.5, 1.9);
  for (const side of [-1, 1]) { const lampPt = pt(BODY_LEN + 0.3, doorV + side * 1.3); lamps.push([lampPt[0], plinthY + 3.2, lampPt[1]]); }

  // Hipped roofs & chimneys
  const eaveY = corniceY + 0.25, ridgeY = y0 + 12.0;
  const mainRoofPt = pt(WING_START_U / 2 + 0.6, BODY_WID / 2);
  S.hip(mainRoofPt[0], mainRoofPt[1], WING_START_U + 1.2, BODY_WID, ang, eaveY, ridgeY - eaveY, COLORS.roof, { over: 0.5 });
  const wingRoofPt = pt((WING_START_U + BODY_LEN) / 2, wingCenterV);
  S.hip(wingRoofPt[0], wingRoofPt[1], wingWidth, wingDepth, ang + Math.PI / 2, eaveY, ridgeY - eaveY - 0.1, shade(COLORS.roof, 0.97), { over: 0.5 });
  const sideRoofPt = pt((WING_START_U + BODY_LEN) / 2, sideCenterV - 0.1);
  S.hip(sideRoofPt[0], sideRoofPt[1], wingDepth, sideWidth + 0.2, ang, eaveY, 1.4, shade(COLORS.roof, 0.94), { over: 0.4 });

  S.kind = KIND.MASONRY;
  for (const [u, v] of ([[6.8, BODY_WID / 2 - 0.8], [14.6, wingOuterV - 2.4]] as any[])) {
    box(u, v, ridgeY - 2.2, ridgeY + 0.7, 0.7, 0.9, COLORS.trim, { top: shade(COLORS.plinth, 0.7) });
  }
  S.kind = KIND.PLAIN;

  return { doorV, rightBayV };
}

function buildSculptureGarden(S, pt, box, ang, doorV, rightBayV, lamps) {
  S.base = 0;
  const works: [number, number, string, number, number, any][] = [
    [44.0, 199.0, 'arch', 2.6, 0.75, COLORS.white],
    [37.5, 207.5, 'stack', 2.2, 0.2, COLORS.white],
    [52.5, 210.5, 'pair', 1.8, 1.4, COLORS.bronze],
    [46.5, 220.0, 'ring', 1.6, 0.75, COLORS.grey],
    [59.0, 222.0, 'kids', 1.1, 2.3, COLORS.laterite],
    [57.0, 197.0, 'stack', 1.6, 1.1, COLORS.grey],
    [66.0, 228.5, 'arch', 1.7, 2.3, COLORS.black],
    [70.8, 241.0, 'pair', 1.4, 0.2, COLORS.white],
    [88.0, 204.0, 'ring', 1.3, 2.4, COLORS.white],
    [97.0, 216.0, 'stack', 1.4, 0.75, COLORS.laterite],
    [69.0, 192.5, 'pair', 1.2, 2.0, COLORS.grey],
    [32.0, 203.0, 'kids', 0.9, 0.3, COLORS.grey],
  ];
  for (const [x, z, kind, size, heading, col] of works) drawSculpture(S, x, z, kind, size, heading, col);

  for (const [u, v, kind, size] of ([[BODY_LEN + 0.9, doorV - 1.6, 'stack', 0.75], [BODY_LEN + 0.9, rightBayV[0], 'pair', 0.8], [BODY_LEN + 2.2, (SIDE_BAY_V0 + CENTER_BAY_V0) / 2, 'stack', 0.7]] as any[])) {
    const pos = pt(u, v);
    drawSculpture(S, pos[0], pos[1], kind, size, ang + Math.PI / 2, COLORS.white);
  }
  for (const v of [doorV + 0.2, doorV + 2.8]) {
    const pos = pt(BODY_LEN + 4.8, v), yy = groundY(pos[0], pos[1]);
    S.kind = KIND.PLAIN;
    for (const k of [-0.7, 0.7]) box(BODY_LEN + 4.8, v + k, yy, yy + 0.42, 0.42, 0.06, COLORS.iron);
    box(BODY_LEN + 4.8, v, yy + 0.42, yy + 0.48, 0.45, 1.7, COLORS.bench);
    box(BODY_LEN + 5.0, v, yy + 0.55, yy + 0.85, 0.05, 1.7, COLORS.bench);
  }
  for (const [x, z, heading] of ([[41.0, 211.5, 0.75], [49.0, 203.0, 2.3], [62.0, 214.0, 2.3], [80.0, 238.0, 0.75], [92.0, 225.0, 2.3]] as any[])) {
    drawVerticalSlab(S, x, z, groundY(x, z), heading, halfDiscProfile(0.55, 7), 1.8, shade(COLORS.grey, 1.08));
  }
  for (const [u, v] of ([[BODY_LEN + 1.2, -2.0], [BODY_LEN + 1.2, BODY_WID + WING_EXTRA_V + 2.0], [-ANNEX_LEN - 1.4, -2.0], [-ANNEX_LEN - 1.4, BODY_WID + 2.0]] as any[])) {
    const pos = pt(u, v), yy = groundY(pos[0], pos[1]);
    S.cyl(pos[0], pos[1], yy, yy + 3.2, 0.07, 0.06, 6, COLORS.iron, { cap: false });
    S.cyl(pos[0], pos[1], yy + 3.2, yy + 3.55, 0.18, 0.14, 6, COLORS.trim);
    lamps.push([pos[0], yy + 3.4, pos[1]]);
  }
}

export function build({ data, S, group }) {
  const pt = (u, v): [number, number] => [ORIGIN[0] + u * DIR_U[0] + v * DIR_V[0], ORIGIN[1] + u * DIR_U[1] + v * DIR_V[1]];
  const ang = Math.atan2(DIR_U[1], DIR_U[0]);
  const center = pt(BODY_LEN / 2, BODY_WID / 2);
  const y0 = groundY(center[0], center[1]);
  const box = (u, v, ya, yb, w, d, col, opt?) => { const pos = pt(u, v); S.box(pos[0], pos[1], ya, yb, w, d, ang, col, opt); };
  const lamps = [];

  buildGardenAndForecourt(data, S, pt);
  const { doorV, rightBayV } = buildVillaAndRoofs(S, pt, box, ang, y0, lamps);
  buildSculptureGarden(S, pt, box, ang, doorV, rightBayV, lamps);

  S.kind = KIND.PLAIN;
  S.base = 0;
  if (lamps.length) {
    const pos = [], col = [];
    for (const lampPos of lamps) { pos.push(...lampPos); col.push(1, 0.8, 0.52); }
    const pts = glowPoints(pos, col, 5);
    pts.userData.glow = true;
    pts.userData.landmark = id;
    group.add(pts);
  }
}

function clipConvex(subject, clip) {
  let area = 0;
  for (let i = 0; i < clip.length; i++) {
    const ptA = clip[i], ptB = clip[(i + 1) % clip.length];
    area += ptA[0] * ptB[1] - ptB[0] * ptA[1];
  }
  const sgn = Math.sign(area);
  let out = subject;
  for (let i = 0; i < clip.length && out.length; i++) {
    const ptA = clip[i], ptB = clip[(i + 1) % clip.length];
    const sideOf = (pt) => sgn * ((ptB[0] - ptA[0]) * (pt[1] - ptA[1]) - (ptB[1] - ptA[1]) * (pt[0] - ptA[0]));
    const input = out;
    out = [];
    for (let k = 0; k < input.length; k++) {
      const ptP = input[k], ptQ = input[(k + 1) % input.length], distP = sideOf(ptP), distQ = sideOf(ptQ);
      if (distP >= 0) out.push(ptP);
      if ((distP > 0 && distQ < 0) || (distP < 0 && distQ > 0)) {
        const frac = distP / (distP - distQ);
        out.push([ptP[0] + (ptQ[0] - ptP[0]) * frac, ptP[1] + (ptQ[1] - ptP[1]) * frac]);
      }
    }
  }
  return out;
}

function halfDiscProfile(rad, segs) {
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const theta = Math.PI * (i / segs);
    pts.push([rad * Math.cos(theta), rad * Math.sin(theta)]);
  }
  return pts;
}

function drawVerticalSlab(S, x, z, y0, heading, profile, thick, col) {
  const ca = Math.cos(heading), sa = Math.sin(heading), nx = -sa, nz = ca;
  const toPt = (pt, offset): [number, number, number] => [x + pt[0] * ca + nx * offset, y0 + pt[1], z + pt[0] * sa + nz * offset];
  let cx = 0, cy = 0;
  for (const pt of profile) { cx += pt[0] / profile.length; cy += pt[1] / profile.length; }
  const count = profile.length;
  for (const offset of [-thick / 2, thick / 2]) {
    const center = toPt([cx, cy], offset), hint = [nx * Math.sign(offset), 0, nz * Math.sign(offset)];
    for (let i = 0; i < count; i++) S.tri(center, toPt(profile[i], offset), toPt(profile[(i + 1) % count], offset), col, hint);
  }
  for (let i = 0; i < count; i++) {
    const ptA = profile[i], ptB = profile[(i + 1) % count];
    const ox = (ptA[0] + ptB[0]) / 2 - cx, oy = (ptA[1] + ptB[1]) / 2 - cy;
    S.quad(toPt(ptA, -thick / 2), toPt(ptB, -thick / 2), toPt(ptB, thick / 2), toPt(ptA, thick / 2), shade(col, 0.94), [ox * ca, oy, ox * sa]);
  }
}

function drawArc(S, x, z, y0, heading, r0, r1, a0, a1, segs, thick, col) {
  for (let i = 0; i < segs; i++) {
    const t0 = a0 + (a1 - a0) * (i / segs), t1 = a0 + (a1 - a0) * ((i + 1) / segs);
    drawVerticalSlab(S, x, z, y0, heading, [
      [r0 * Math.cos(t0), r0 * Math.sin(t0)], [r1 * Math.cos(t0), r1 * Math.sin(t0)],
      [r1 * Math.cos(t1), r1 * Math.sin(t1)], [r0 * Math.cos(t1), r0 * Math.sin(t1)],
    ], thick, col);
  }
}

function drawSculpture(S, x, z, kind, size, heading, col) {
  const y0 = groundY(x, z), ca = Math.cos(heading), sa = Math.sin(heading);
  S.kind = KIND.MASONRY;
  S.box(x, z, y0 - 0.1, y0 + 0.3, size * 1.9, size * 1.0, heading, shade(COLORS.grey, 0.9));
  S.kind = KIND.PLAIN;
  const baseY = y0 + 0.3;
  const alongPt = (dist): [number, number] => [x + dist * ca, z + dist * sa];

  if (kind === 'arch') {
    for (const sgn of [-1, 1]) { const pos = alongPt(sgn * size * 0.62); S.box(pos[0], pos[1], baseY, baseY + size * 0.55, size * 0.24, size * 0.3, heading, col); }
    drawArc(S, x, z, baseY + size * 0.55, heading, size * 0.5, size * 0.74, 0, Math.PI, 7, size * 0.3, col);
  } else if (kind === 'stack') {
    S.box(x, z, baseY, baseY + size * 0.45, size * 1.2, size * 0.4, heading, col);
    drawVerticalSlab(S, x, z, baseY + size * 0.45, heading, halfDiscProfile(size * 0.55, 8), size * 0.36, col);
    const pos = alongPt(size * 0.1);
    drawVerticalSlab(S, pos[0], pos[1], baseY + size * 1.0, heading + Math.PI / 2, [[0, 0], ...halfDiscProfile(size * 0.45, 8).slice(0, 5)], size * 0.3, shade(col, 0.95));
  } else if (kind === 'pair') {
    const ptA = alongPt(-size * 0.4), ptB = alongPt(size * 0.55);
    drawVerticalSlab(S, ptA[0], ptA[1], baseY, heading, halfDiscProfile(size * 0.6, 9), size * 0.28, col);
    drawVerticalSlab(S, ptB[0], ptB[1], baseY, heading, halfDiscProfile(size * 0.3, 7), size * 0.28, col);
  } else if (kind === 'ring') {
    drawArc(S, x, z, baseY + size * 0.62, heading, size * 0.42, size * 0.62, 0, Math.PI * 2, 12, size * 0.3, col);
  } else if (kind === 'kids') {
    for (let i = 0; i < 5; i++) {
      const theta = heading + (i / 5) * Math.PI * 2, px = x + Math.cos(theta) * size * 0.6, pz = z + Math.sin(theta) * size * 0.3;
      S.cyl(px, pz, baseY, baseY + size * 0.7, size * 0.15, size * 0.12, 6, col, { cap: false });
      S.cyl(px, pz, baseY + size * 0.7, baseY + size * 0.95, size * 0.14, size * 0.06, 6, col);
    }
  }
}
