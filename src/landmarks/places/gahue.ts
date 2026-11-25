import { addEmissiveStripMesh } from '../helpers.ts';
import { KIND, Buf, hex, shade } from '../../geo/buf.ts';
import { LAND_Y } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { glowPoints } from '../../geo/materials.ts';
import { fence, roadsNear, streetTest, FENCE } from '../enclosure.ts';

// ---- Ga Huế (1906–1908), 1 Bùi Thị Xuân: the passenger building as it stands in 2026 ----
// Sources: docs/places/gahue.md, OSM way 175063593, annexes 1332014349/1332014347, platforms 866800535/866800536.
export const id = 'gahue';

export function ownsMapped(ring) {
  let x = 0, z = 0;
  for (const pt of ring) { x += pt[0] / ring.length; z += pt[1] / ring.length; }
  return x >= -1196 && x <= -1104 && z >= 1366 && z <= 1384;
}

export function clearings() {
  return [[[-1196, 1337], [-1112, 1337], [-1112, 1366], [-1196, 1366]]];
}

const COLORS = {
  red: hex('#c97268'),
  redDark: hex('#ad5a51'),
  white: hex('#f4f0e8'),
  grey: hex('#889199'),
  roofTop: hex('#9a635b'),
  tile: hex('#985045'),
  slab: hex('#928e88'),
  glass: hex('#2c2f36'),
  pane: hex('#5a626c'),
  column: hex('#de9b92'),
  pave: hex('#aea9a0'),
  asphalt: hex('#5d5d5f'),
  green: hex('#3f6a50'),
  steel: hex('#d6d2c8'),
  blue: hex('#24489a'),
  letterRed: hex('#d42a24'),
  dial: hex('#fbfaf5'),
  clockRim: hex('#3b2522'),
};

const CENTER_BLK = { x0: -1165.2, x1: -1145.8, z0: 1368.8, z1: 1380.1 };
const WEST_WING = { x0: -1179.3, x1: -1165.2, z0: 1372.0, z1: 1380.9 };
const WEST_END = { x0: -1183.9, x1: -1179.3, z0: 1369.5, z1: 1380.8 };
const EAST_WING = { x0: -1145.8, x1: -1131.0, z0: 1372.2, z1: 1380.7 };
const EAST_END = { x0: -1131.0, x1: -1126.6, z0: 1370.1, z1: 1380.8 };
const WEST_ANNEX = { x0: -1193.6, x1: -1183.9, z0: 1369.5, z1: 1380.6 };
const EAST_ANNEX = { x0: -1126.6, x1: -1120.0, z0: 1370.8, z1: 1380.9 };
const EAST_LOW = { x0: -1120.0, x1: -1112.4, z0: 1371.0, z1: 1380.9 };
const EAST_BOX = { x0: -1112.4, x1: -1106.8, z0: 1372.4, z1: 1380.9 };
const CENTER_X = (CENTER_BLK.x0 + CENTER_BLK.x1) / 2;

const railZ = (x) => (x > -1162.5 ? 1386.6 + ((x + 1162.5) * 1.8) / 167.4 : 1386.6 + ((x + 1162.5) * 1.1) / 109.4);
const islandNorthZ = (x) => 1390.5 + ((x + 1247.2) * 3.6) / 180.6;
const islandSouthZ = (x) => 1395.3 + ((x + 1247.3) * 3.5) / 180.7;

function buildForecourtAndSteps(data, S, y0, floorY) {
  const pavedStart = S.n;
  S.kind = KIND.ROAD;
  S.box(-1154, 1351, y0 - 0.5, y0 + 0.04, 84, 26, 0, COLORS.asphalt, { topKind: KIND.ROAD });
  S.kind = KIND.MASONRY;
  S.box(-1153.5, 1375.3, y0 - 0.5, y0 + 0.12, 77, 13.6, 0, COLORS.pave, { topKind: KIND.ROAD });

  const isStreet = streetTest(data, [CENTER_X, 1364], 60);
  let zKerb = CENTER_BLK.z0 - 5.6;
  for (let z = CENTER_BLK.z0 - 1; z > CENTER_BLK.z0 - 5.6; z -= 0.1) {
    if ([-14, -12, -9, -6, -3, 0, 3, 6, 9, 12, 14].some((u) => isStreet(CENTER_X + u, z, 0.3))) {
      zKerb = z;
      break;
    }
  }
  S.box(CENTER_X, (zKerb + CENTER_BLK.z0) / 2, y0 - 0.4, y0 + 0.16, 30, CENTER_BLK.z0 - zKerb, 0, COLORS.pave, { topKind: KIND.ROAD });
  (S.paved = S.paved || []).push([pavedStart, S.n]);

  const zStep = Math.max(CENTER_BLK.z0 - 4.8, zKerb + 0.6);
  for (let k = 0; k < 3; k++) {
    S.box(CENTER_X, (zStep + k * 0.4 + CENTER_BLK.z0) / 2, y0, y0 + 0.17 * (k + 1), 17.6 - k * 0.4, CENTER_BLK.z0 - zStep - k * 0.4, 0, shade(COLORS.pave, 1.05 - k * 0.04));
  }
  S.box(CENTER_X, CENTER_BLK.z0 - 0.3, y0, floorY, 20.2, 0.6, 0, COLORS.pave);

  for (const side of [-1, 1]) {
    S.kind = KIND.PLAIN;
    S.box(CENTER_X + side * 10.8, zStep + 0.3, y0, y0 + 0.9, 4.0, 1.4, 0, COLORS.white);
    S.kind = KIND.TIMBER;
    for (const dx of [-1.1, 0, 1.1]) S.cyl(CENTER_X + side * 10.8 + dx, zStep + 0.3, y0 + 0.9, y0 + 1.7, 0.45, 0.6, 6, hex('#4f7a3c'));
  }

  S.kind = KIND.PLAIN;
  for (let x = -1188; x <= -1112; x += 2.6) S.box(x, 1349, y0 + 0.04, y0 + 0.06, 0.12, 5, 0, hex('#d9d6cf'));
  S.box(-1150, 1346.5, y0 + 0.04, y0 + 0.06, 78, 0.12, 0, hex('#d9d6cf'));
  S.box(-1150, 1351.5, y0 + 0.04, y0 + 0.06, 78, 0.12, 0, hex('#d9d6cf'));

  if (Array.isArray(data.trees)) {
    for (const x of [-1181, -1174, -1138, -1131]) data.trees.push(Math.round(x * 10), Math.round(1367.5 * 10), 8, 0);
  }
  S.kind = KIND.PLAIN;
}

function buildStationFacades(S, lightBuf, addLamp, y0, floorY) {
  const rectBox = (rect, ya, yb, col, opt?) => S.box((rect.x0 + rect.x1) / 2, (rect.z0 + rect.z1) / 2, ya, yb, rect.x1 - rect.x0, rect.z1 - rect.z0, 0, col, opt);
  const growRect = (rect, pad) => ({ x0: rect.x0 - pad, x1: rect.x1 + pad, z0: rect.z0 - pad, z1: rect.z1 + pad });

  S.kind = KIND.PLAIN;
  const redRoofOpt = { top: COLORS.roofTop };
  rectBox(CENTER_BLK, floorY, floorY + 9.4, COLORS.red, redRoofOpt);
  for (const rect of [WEST_WING, EAST_WING]) rectBox(rect, floorY, floorY + 5.0, COLORS.red, redRoofOpt);
  for (const rect of [WEST_END, EAST_END]) rectBox(rect, floorY, floorY + 5.4, COLORS.red, redRoofOpt);
  S.hip(CENTER_X, (CENTER_BLK.z0 + CENTER_BLK.z1) / 2, CENTER_BLK.x1 - CENTER_BLK.x0 - 1.0, CENTER_BLK.z1 - CENTER_BLK.z0 - 1.0, 0, floorY + 9.4, 1.4, COLORS.tile);
  S.kind = KIND.PLAIN;
  rectBox(WEST_ANNEX, y0 + 0.3, y0 + 4.8, COLORS.red, { top: COLORS.slab });
  rectBox(EAST_ANNEX, y0 + 0.3, y0 + 4.8, COLORS.red, redRoofOpt);
  rectBox(EAST_LOW, y0 + 0.3, y0 + 3.5, COLORS.red, { top: hex('#7d6a5c') });
  rectBox(EAST_BOX, y0 + 0.3, y0 + 4.2, COLORS.red, { top: COLORS.slab });

  for (const rect of [CENTER_BLK, WEST_WING, EAST_WING, WEST_END, EAST_END]) rectBox(growRect(rect, 0.04), floorY, floorY + 2.0, COLORS.grey);
  for (const rect of [WEST_ANNEX, EAST_ANNEX, EAST_LOW, EAST_BOX]) rectBox(growRect(rect, 0.04), y0 + 0.3, y0 + 1.6, COLORS.grey);

  const onZ = (zf, side) => (x, ya, yb, w, t, col) => S.box(x, zf + (side * t) / 2, ya, yb, w, t, 0, col);
  const onX = (xf, side) => (z, ya, yb, w, t, col) => S.box(xf + (side * t) / 2, z, ya, yb, t, w, 0, col);
  const drawDisc = (x, y, z, rad, col, segs = 20) => {
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * 2 * Math.PI, a1 = ((i + 1) / segs) * 2 * Math.PI;
      S.tri([x, y, z], [x + rad * Math.cos(a0), y + rad * Math.sin(a0), z], [x + rad * Math.cos(a1), y + rad * Math.sin(a1), z], col, [0, 0, -1]);
    }
  };
  const drawArch = (face, along, ya, width, hSpring, col = COLORS.glass, rim = COLORS.white) => {
    const segs = 8;
    const drawLayer = (w, yy, hh, layerCol, thick) => {
      face(along, yy, yy + hh, w, thick, layerCol);
      for (let i = 0; i < segs; i++) {
        const ang = ((i + 0.5) / segs) * (Math.PI / 2);
        const halfW = (w / 2) * Math.cos(ang), dy = (w / 2) * Math.sin(ang);
        face(along, yy + hh + (i ? (w / 2) * Math.sin((i / segs) * (Math.PI / 2)) : 0), yy + hh + dy, halfW * 2, thick, layerCol);
      }
    };
    drawLayer(width + 0.5, ya - 0.05, hSpring, rim, 0.06);
    drawLayer(width, ya, hSpring, col, 0.1);
  };
  const drawPilaster = (face, along, ya, yb, width, pitch = 0.55) => {
    face(along, ya, yb, width, 0.16, COLORS.redDark);
    for (let y = ya + pitch * 0.7; y < yb - 0.1; y += pitch) face(along, y, y + 0.09, width + 0.02, 0.2, COLORS.white);
  };
  const drawWindow = (face, along, ya, yb, width) => {
    face(along, ya - 0.15, yb + 0.25, width + 0.5, 0.07, COLORS.white);
    face(along, ya, yb, width, 0.12, COLORS.pane);
    face(along, ya + (yb - ya) * 0.48, ya + (yb - ya) * 0.52, width, 0.15, COLORS.white);
    face(along, ya, yb, 0.07, 0.15, COLORS.white);
    for (const frac of [0.25, 0.75]) face(along, ya + (yb - ya) * frac - 0.02, ya + (yb - ya) * frac + 0.02, width, 0.14, COLORS.white);
    face(along, ya - 0.2, ya - 0.1, width + 0.7, 0.2, COLORS.white);
  };

  // Middle block front & back
  const blockW = CENTER_BLK.x1 - CENTER_BLK.x0, blockD = CENTER_BLK.z1 - CENTER_BLK.z0;
  for (const [zf, side] of ([[CENTER_BLK.z0, -1], [CENTER_BLK.z1, 1]] as any[])) {
    const face = onZ(zf, side);
    face(CENTER_X, floorY + 5.55, floorY + 5.9, blockW + 0.2, 0.22, COLORS.white);
    face(CENTER_X, floorY + 8.8, floorY + 8.95, blockW + 0.1, 0.1, COLORS.white);
    face(CENTER_X, floorY + 9.1, floorY + 9.55, blockW + 0.6, 0.5, COLORS.white);
    S.box(CENTER_X, zf - side * 0.1, floorY + 9.4, floorY + 10.25, blockW, 0.35, 0, COLORS.red);
    face(CENTER_X, floorY + 10.2, floorY + 10.35, blockW + 0.2, 0.3, COLORS.white);
    for (const u of [-7.6, -3.9, 3.9, 7.6]) face(CENTER_X + u, floorY + 9.7, floorY + 10.05, 2.3, 0.14, COLORS.white);
    for (const sgn of [-1, 1]) {
      drawPilaster(face, CENTER_X + sgn * 9.15, floorY + 2.0, floorY + 9.1, 1.1);
      drawPilaster(face, CENTER_X + sgn * 6.05, floorY + 2.0, floorY + 9.1, 1.1);
      face(CENTER_X + sgn * 1.15, floorY + 5.9, floorY + 8.8, 0.35, 0.12, COLORS.white);
      for (const u of [9.15, 6.05]) {
        S.box(CENTER_X + sgn * u, zf - side * 0.1, floorY + 9.55, floorY + 10.6, 1.1, 0.8, 0, COLORS.red);
        S.box(CENTER_X + sgn * u, zf - side * 0.1, floorY + 10.6, floorY + 10.78, 1.3, 1.0, 0, COLORS.white);
      }
    }
    for (const u of [-7.5, -3.85, 0, 3.85, 7.5]) {
      drawWindow(face, CENTER_X + u, floorY + 6.3, floorY + 8.4, 1.15);
      if (Math.abs(u) === 3.85) {
        for (const edge of [-1, 1]) face(CENTER_X + u + edge * 1.0, floorY + 5.9, floorY + 8.75, 0.28, 0.1, COLORS.white);
        face(CENTER_X + u, floorY + 8.55, floorY + 8.75, 2.3, 0.14, COLORS.white);
      }
    }
    for (const u of [-4.0, 0, 4.0]) drawArch(face, CENTER_X + u, floorY + 0.05, 2.3, 2.6, COLORS.glass);
    for (const u of [-7.6, 7.6]) drawArch(face, CENTER_X + u, floorY + 0.05, 1.7, 2.5, COLORS.glass);
    if (side < 0) {
      for (const u of [-4.0, 0, 4.0]) lightBuf.box(CENTER_X + u, zf - 0.13, floorY + 0.3, floorY + 3.3, 1.8, 0.04, 0, [1, 1, 1]);
      for (const u of [-7.5, -3.85, 0, 3.85, 7.5]) lightBuf.box(CENTER_X + u, zf - 0.15, floorY + 6.4, floorY + 8.3, 1.0, 0.04, 0, [1, 1, 1]);
    }
  }

  // Clock gable
  const frontZ = CENTER_BLK.z0, gableZ = frontZ + 0.25;
  S.box(CENTER_X, gableZ, floorY + 9.55, floorY + 11.15, 4.0, 0.6, 0, COLORS.red);
  for (const sgn of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const ang = ((i + 1) / 4) * (Math.PI / 2);
      S.box(CENTER_X + sgn * (2.0 + 0.8 * Math.cos(ang) - 0.4), gableZ, floorY + 10.25, floorY + 10.25 + 0.8 * Math.sin(ang), 0.25, 0.5, 0, COLORS.red);
    }
  }
  S.box(CENTER_X, gableZ, floorY + 11.15, floorY + 11.35, 4.3, 0.8, 0, COLORS.white);
  S.box(CENTER_X, gableZ, floorY + 11.35, floorY + 11.7, 1.9, 0.6, 0, COLORS.red);
  S.box(CENTER_X, gableZ, floorY + 11.7, floorY + 12.0, 1.3, 0.7, 0, COLORS.white);
  S.box(CENTER_X, frontZ - 0.08, floorY + 11.75, floorY + 11.95, 0.9, 0.06, 0, COLORS.redDark);
  S.box(CENTER_X, frontZ - 0.02, floorY + 9.55, floorY + 11.1, 1.85, 0.14, 0, COLORS.white);
  drawDisc(CENTER_X, floorY + 10.32, frontZ - 0.11, 0.74, COLORS.clockRim);
  drawDisc(CENTER_X, floorY + 10.32, frontZ - 0.13, 0.64, COLORS.dial);
  for (let k = 0; k < 12; k++) {
    const ang = (k * Math.PI) / 6;
    S.box(CENTER_X + 0.54 * Math.sin(ang), frontZ - 0.16, floorY + 10.32 + 0.54 * Math.cos(ang) - 0.05, floorY + 10.32 + 0.54 * Math.cos(ang) + 0.05, 0.06, 0.03, 0, COLORS.glass);
  }
  S.beam([CENTER_X, floorY + 10.32, frontZ - 0.17], [CENTER_X, floorY + 10.8, frontZ - 0.17], 0.08, 0.04, COLORS.glass);
  S.beam([CENTER_X, floorY + 10.32, frontZ - 0.17], [CENTER_X + 0.34, floorY + 10.32, frontZ - 0.17], 0.08, 0.04, COLORS.glass);
  S.cyl(CENTER_X, gableZ, floorY + 12.0, floorY + 14.2, 0.04, 0.03, 5, COLORS.steel, { cap: false });
  S.box(CENTER_X - 0.6, gableZ, floorY + 13.4, floorY + 14.15, 1.2, 0.03, 0, hex('#d8262a'));
  lightBuf.box(CENTER_X, frontZ - 0.22, floorY + 9.85, floorY + 10.8, 0.95, 0.03, 0, [1, 1, 1]);
  addLamp(CENTER_X, floorY + 10.3, frontZ - 0.8, [1, 0.97, 0.86]);

  // Middle block sides
  for (const [xf, side] of ([[CENTER_BLK.x0, -1], [CENTER_BLK.x1, 1]] as any[])) {
    const face = onX(xf, side), zc = (CENTER_BLK.z0 + CENTER_BLK.z1) / 2;
    face(zc, floorY + 5.55, floorY + 5.9, blockD + 0.2, 0.22, COLORS.white);
    face(zc, floorY + 9.1, floorY + 9.55, blockD + 0.6, 0.5, COLORS.white);
    face(zc, floorY + 10.2, floorY + 10.35, blockD + 0.2, 0.3, COLORS.white);
    S.box(xf - side * 0.1, zc, floorY + 9.4, floorY + 10.25, 0.35, blockD, 0, COLORS.red);
    for (const sgn of [-1, 1]) drawPilaster(face, zc + sgn * (blockD / 2 - 0.55), floorY + 5.9, floorY + 9.1, 1.1);
    for (const dz of [-3.0, 0, 3.0]) drawWindow(face, zc + dz, floorY + 6.3, floorY + 8.4, 1.15);
  }

  // Wings, end pavilions, and annexes
  for (const rect of [WEST_WING, EAST_WING]) {
    const xc = (rect.x0 + rect.x1) / 2, bayCount = Math.max(2, Math.round((rect.x1 - rect.x0) / 3.4)), bayStep = (rect.x1 - rect.x0) / bayCount;
    for (const [zf, side] of ([[rect.z0, -1], [rect.z1, 1]] as any[])) {
      const face = onZ(zf, side);
      face(xc, floorY + 4.77, floorY + 5.31, rect.x1 - rect.x0 + 0.3, 0.4, COLORS.white);
      S.box(xc, zf - side * 0.2, floorY + 5.31, floorY + 5.58, rect.x1 - rect.x0, 0.35, 0, COLORS.red);
      for (let x = rect.x0 + 0.3; x < rect.x1 - 0.2; x += 0.55) S.box(x, zf - side * 0.2, floorY + 5.58, floorY + 6.08, 0.16, 0.18, 0, COLORS.white);
      S.box(xc, zf - side * 0.2, floorY + 6.08, floorY + 6.21, rect.x1 - rect.x0, 0.32, 0, COLORS.white);
      for (let i = 0; i <= bayCount; i++) drawPilaster(face, rect.x0 + i * bayStep, floorY + 2.0, floorY + 4.77, 0.7);
      for (let i = 0; i < bayCount; i++) {
        const u = rect.x0 + (i + 0.5) * bayStep;
        drawArch(face, u, floorY + 0.05, Math.min(2.2, bayStep - 1.0), 2.4, COLORS.glass);
        if (side < 0) lightBuf.box(u, zf - 0.13, floorY + 0.4, floorY + 2.9, 1.4, 0.04, 0, [1, 1, 1]);
      }
    }
  }

  for (const rect of [WEST_END, EAST_END]) {
    const xc = (rect.x1 + rect.x0) / 2, w = rect.x1 - rect.x0;
    for (const [zf, side] of ([[rect.z0, -1], [rect.z1, 1]] as any[])) {
      const face = onZ(zf, side);
      face(xc, floorY + 5.04, floorY + 5.54, w + 0.4, 0.45, COLORS.white);
      S.box(xc, zf - side * 0.15, floorY + 5.54, floorY + 6.39, w, 0.3, 0, COLORS.red);
      face(xc, floorY + 6.3, floorY + 6.48, w + 0.2, 0.1, COLORS.white);
      for (const sgn of [-1, 1]) {
        drawPilaster(face, xc + sgn * (w / 2 - 0.55), floorY + 2.0, floorY + 5.04, 1.1);
        S.box(xc + sgn * (w / 2 - 0.55), zf - side * 0.3, floorY + 5.54, floorY + 6.84, 1.0, 0.8, 0, COLORS.red);
        S.box(xc + sgn * (w / 2 - 0.55), zf - side * 0.3, floorY + 6.84, floorY + 6.98, 1.2, 1.0, 0, COLORS.white);
      }
      drawArch(face, xc, floorY + 0.05, 2.2, 2.9, COLORS.glass);
    }
    for (const [xf, side] of ([[rect.x0, -1], [rect.x1, 1]] as any[])) {
      const face = onX(xf, side), zc = (rect.z0 + rect.z1) / 2;
      face(zc, floorY + 5.04, floorY + 5.54, rect.z1 - rect.z0 + 0.4, 0.45, COLORS.white);
      drawArch(face, zc, floorY + 0.8, 1.7, 2.4);
    }
  }

  for (const [rect, height, parapetH] of ([[WEST_ANNEX, 4.8, 0.6], [EAST_ANNEX, 4.8, 0.6], [EAST_LOW, 3.5, 0.3], [EAST_BOX, 4.2, 0.55]] as any[])) {
    const xc = (rect.x0 + rect.x1) / 2, bayCount = Math.max(2, Math.round((rect.x1 - rect.x0) / 3.4)), bayStep = (rect.x1 - rect.x0) / bayCount;
    for (const [zf, side] of ([[rect.z0, -1], [rect.z1, 1]] as any[])) {
      const face = onZ(zf, side);
      face(xc, y0 + height - 0.5, y0 + height, rect.x1 - rect.x0 + 0.3, 0.3, COLORS.white);
      S.box(xc, zf - side * 0.12, y0 + height, y0 + height + parapetH, rect.x1 - rect.x0, 0.25, 0, rect === EAST_BOX ? COLORS.white : COLORS.red);
      const archW = Math.min(1.7, bayStep - 1.1), springH = Math.min(2.0, height - 1.3 - archW / 2);
      for (let i = 0; i < bayCount; i++) drawArch(face, rect.x0 + (i + 0.5) * bayStep, y0 + 0.4, archW, springH, COLORS.glass);
    }
  }
  for (const [xf, side] of ([[EAST_BOX.x0, -1], [EAST_BOX.x1, 1]] as any[])) {
    S.box(xf - side * 0.12, (EAST_BOX.z0 + EAST_BOX.z1) / 2, y0 + 4.2, y0 + 4.75, 0.25, EAST_BOX.z1 - EAST_BOX.z0, 0, COLORS.white);
  }
}

function buildStreetCanopy(S, lightBuf, addLamp, floorY) {
  const zFront = CENTER_BLK.z0, zOuter = zFront - 4.1, zCenter = (zFront + zOuter) / 2;
  const canopyW = 22.7, zCol = zFront - 3.6;
  const mirrorX = (u) => 2 * CENTER_X - u;

  S.kind = KIND.PLAIN;
  S.box(CENTER_X, zCenter, floorY + 3.95, floorY + 4.55, canopyW, zFront - zOuter, 0, COLORS.white, { bottom: true, top: COLORS.slab });
  S.box(CENTER_X, zOuter + 0.15, floorY + 3.6, floorY + 4.75, canopyW, 0.3, 0, COLORS.white);

  const welcomeWords = ['KINH', 'CHAO', 'QUY', 'KHACH', '-', 'WELCOME', 'TO', 'HUE', 'RAILWAY', 'STATION'];
  const charPitch = 0.32, wordGap = 0.42, totalChars = welcomeWords.join('').length;
  let cursor = CENTER_X - (totalChars * charPitch + (welcomeWords.length - 1) * wordGap) / 2;
  for (const word of welcomeWords) {
    for (const ch of word) {
      if (ch === '-') S.box(mirrorX(cursor + charPitch / 2), zOuter - 0.02, floorY + 4.12, floorY + 4.2, 0.2, 0.04, 0, COLORS.blue);
      else S.box(mirrorX(cursor + charPitch / 2), zOuter - 0.02, floorY + 3.96, floorY + 4.38, charPitch - 0.08, 0.04, 0, COLORS.blue);
      cursor += charPitch;
    }
    cursor += wordGap;
  }

  // "GA HUẾ" red roof letters
  const letterH = 1.5, letterW = 1.0, strokeT = 0.22, baseY = floorY + 4.75, letterZ = zOuter + 0.5;
  S.box(CENTER_X, letterZ, floorY + 4.55, baseY, 7.2, 0.4, 0, COLORS.white);
  const drawBar = (u0, v0, u1, v1) => S.box(mirrorX((u0 + u1) / 2), letterZ, baseY + v0, baseY + v1, u1 - u0, 0.15, 0, COLORS.letterRed);
  const glyphs = {
    G: (u) => { drawBar(u, 0, u + strokeT, letterH); drawBar(u, letterH - strokeT, u + letterW, letterH); drawBar(u, 0, u + letterW, strokeT); drawBar(u + letterW - strokeT, 0, u + letterW, letterH * 0.5); drawBar(u + letterW * 0.5, letterH * 0.5 - strokeT, u + letterW, letterH * 0.5); },
    A: (u) => { drawBar(u, 0, u + strokeT, letterH); drawBar(u + letterW - strokeT, 0, u + letterW, letterH); drawBar(u, letterH - strokeT, u + letterW, letterH); drawBar(u, letterH * 0.45, u + letterW, letterH * 0.45 + strokeT); },
    H: (u) => { drawBar(u, 0, u + strokeT, letterH); drawBar(u + letterW - strokeT, 0, u + letterW, letterH); drawBar(u, letterH * 0.45, u + letterW, letterH * 0.45 + strokeT); },
    U: (u) => { drawBar(u, 0, u + strokeT, letterH); drawBar(u + letterW - strokeT, 0, u + letterW, letterH); drawBar(u, 0, u + letterW, strokeT); },
    E: (u) => {
      drawBar(u, 0, u + strokeT, letterH); drawBar(u, letterH - strokeT, u + letterW, letterH); drawBar(u, letterH * 0.45, u + letterW * 0.85, letterH * 0.45 + strokeT); drawBar(u, 0, u + letterW, strokeT);
      S.beam([mirrorX(u + 0.15), baseY + letterH + 0.1, letterZ], [mirrorX(u + letterW * 0.45), baseY + letterH + 0.38, letterZ], 0.13, 0.13, COLORS.letterRed);
      S.beam([mirrorX(u + letterW * 0.45), baseY + letterH + 0.38, letterZ], [mirrorX(u + letterW * 0.75), baseY + letterH + 0.1, letterZ], 0.13, 0.13, COLORS.letterRed);
      S.beam([mirrorX(u + letterW * 0.85), baseY + letterH + 0.32, letterZ], [mirrorX(u + letterW * 1.05), baseY + letterH + 0.55, letterZ], 0.12, 0.12, COLORS.letterRed);
    },
  };
  const sequence = ['G', 'A', null, 'H', 'U', 'E'], letterGap = 0.3, spaceGap = 0.9;
  let uPos = CENTER_X - (5 * letterW + 3 * letterGap + spaceGap) / 2;
  for (const ch of sequence) {
    if (!ch) { uPos += spaceGap - letterGap; continue; }
    glyphs[ch](uPos);
    uPos += letterW + letterGap;
  }
  lightBuf.box(CENTER_X, letterZ - 0.09, baseY + 0.05, baseY + letterH - 0.05, 6.8, 0.02, 0, [1, 0.35, 0.3]);

  const hungBoards: [number, number, number, number, any][] = [
    [-4.0, 2.2, 2.75, 3.95, hex('#3d8a4a')],
    [0, 3.6, 2.7, 3.95, COLORS.blue],
    [4.0, 2.4, 2.75, 3.95, hex('#c4332b')],
    [-6.2, 0.75, 1.9, 3.95, hex('#e0a52a')],
    [6.2, 0.75, 1.9, 3.95, COLORS.blue],
  ];
  for (const [u, w, ya, yb, col] of hungBoards) S.box(mirrorX(CENTER_X + u), zFront - 0.75, floorY + ya, floorY + yb, w, 0.05, 0, col);
  for (const sgn of [-1, 1]) S.box(CENTER_X + sgn * (canopyW / 2 - 0.15), zCenter, floorY + 3.8, floorY + 4.6, 0.3, zFront - zOuter, 0, COLORS.white);
  for (const u of [-9.3, -6.2, -2.1, 2.1, 6.2, 9.3]) {
    S.cyl(CENTER_X + u, zCol, floorY, floorY + 3.95, 0.26, 0.23, 10, COLORS.column);
    S.box(CENTER_X + u, zCol, floorY, floorY + 0.35, 0.7, 0.7, 0, COLORS.white);
    S.box(CENTER_X + u, zCol, floorY + 3.75, floorY + 3.95, 0.65, 0.65, 0, COLORS.white);
  }
  for (let u = -9; u <= 9.01; u += 3) addLamp(CENTER_X + u, floorY + 3.7, zCenter);
  lightBuf.box(CENTER_X, zOuter - 0.04, floorY + 3.97, floorY + 4.43, canopyW - 2.0, 0.02, 0, [1, 1, 1]);
}

function buildPlatformsAndFence(data, S, addLamp, y0, floorY) {
  const platformEdgeZ = (x) => railZ(x) - 1.45;
  S.kind = KIND.MASONRY;
  const platA = -1245.5, platB = -1107.0, platSegs = 12, platRing = [];
  for (let i = 0; i <= platSegs; i++) {
    const x = platA + ((platB - platA) * i) / platSegs;
    platRing.push([x, platformEdgeZ(x)]);
  }
  platRing.push([platB, 1380.9], [platA, 1380.4]);
  S.prism(platRing, y0 - 0.3, floorY - 0.05, shade(COLORS.pave, 0.85), COLORS.pave, { topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;
  for (let i = 0; i < platSegs; i++) {
    const ptA = platRing[i], ptB = platRing[i + 1];
    S.beam([ptA[0], floorY - 0.02, ptA[1] - 0.2], [ptB[0], floorY - 0.02, ptB[1] - 0.2], 0.4, 0.05, hex('#d8c25a'));
  }

  for (const [xa, xb, zw] of ([[-1193.6, CENTER_BLK.x0, 1380.8], [CENTER_BLK.x0, CENTER_BLK.x1, CENTER_BLK.z1], [CENTER_BLK.x1, -1106.8, 1381.0]] as any[])) {
    const xc = (xa + xb) / 2, zOut = platformEdgeZ(xc) - 0.7, depth = zOut - zw;
    S.box(xc, zw + depth / 2, floorY + 3.9, floorY + 4.25, xb - xa, depth, 0, COLORS.white, { bottom: true, top: COLORS.slab });
    S.box(xc, zOut - 0.1, floorY + 3.8, floorY + 4.5, xb - xa, 0.2, 0, COLORS.white);
    for (let x = xa + 2.5; x < xb - 1; x += 5.5) {
      S.cyl(x, zw + 1.4, floorY, floorY + 3.9, 0.22, 0.22, 8, COLORS.white, { cap: false });
      addLamp(x, floorY + 3.7, zw + depth * 0.6, [1, 0.9, 0.7]);
    }
  }

  // Island platform and green ridged canopy
  const islA = -1247.2, islB = -1066.6;
  S.kind = KIND.MASONRY;
  S.prism([[islA, islandNorthZ(islA)], [islB, islandNorthZ(islB)], [islB, islandSouthZ(islB)], [islA, islandSouthZ(islA)]], y0 - 0.3, floorY - 0.05, shade(COLORS.pave, 0.85), COLORS.pave, { topKind: KIND.ROAD });
  const roofA = -1214, roofB = -1094, colCount = 20, colStep = (roofB - roofA) / colCount;
  const islMidZ = (x) => (islandNorthZ(x) + islandSouthZ(x)) / 2;
  S.kind = KIND.PLAIN;
  for (let i = 0; i <= colCount; i++) {
    const x = roofA + i * colStep, z = islMidZ(x);
    S.cyl(x, z, floorY, floorY + 3.6, 0.2, 0.2, 8, COLORS.steel, { cap: false });
    for (const side of [-1, 1]) {
      S.beam([x, floorY + 3.6, z], [x, floorY + 4.05, z + side * 3.2], 0.16, 0.3, COLORS.steel);
      S.beam([x, floorY + 2.7, z], [x, floorY + 3.65, z + side * 1.4], 0.06, 0.06, COLORS.glass);
    }
    if (i < colCount) addLamp(x + colStep / 2, floorY + 3.7, z, [1, 0.9, 0.7]);
  }
  S.beam([roofA, floorY + 3.65, islMidZ(roofA)], [roofB, floorY + 3.65, islMidZ(roofB)], 0.25, 0.3, COLORS.steel);
  S.kind = KIND.TILE;
  const roofPt = (x, offsetZ, y): [number, number, number] => [x, y, islMidZ(x) + offsetZ];
  for (const side of [-1, 1]) S.quad(roofPt(roofA - 1, 0, floorY + 4.6), roofPt(roofB + 1, 0, floorY + 4.6), roofPt(roofB + 1, side * 3.5, floorY + 4.0), roofPt(roofA - 1, side * 3.5, floorY + 4.0), COLORS.green, [0, 0.9, side * 0.4]);
  S.kind = KIND.PLAIN;
  for (const side of [-1, 1]) S.beam(roofPt(roofA - 1, side * 3.5, floorY + 3.9), roofPt(roofB + 1, side * 3.5, floorY + 3.9), 0.12, 0.35, shade(COLORS.green, 0.85));

  const roads = roadsNear(data, [-1154, 1360], 140);
  fence(S, [[-1197.5, 1336.5], [-1197.5, 1369.0], [-1194.5, 1369.0]], FENCE.station, { closed: false, roads });
  fence(S, [[-1106.3, 1370.0], [-1100.0, 1370.0], [-1100.0, 1360.5]], FENCE.station, { closed: false, roads });
}

export function build({ data, S, group }) {
  const y0 = LAND_Y + rise(-1154, 1376);
  const floorY = y0 + 0.5;
  S.base = y0 - LAND_Y;
  const lightBuf = new Buf(512);
  const lampPos = [], lampCol = [];
  const addLamp = (x, y, z, col = [1, 0.84, 0.55]) => { lampPos.push(x, y, z); lampCol.push(...col); };

  buildForecourtAndSteps(data, S, y0, floorY);
  buildStationFacades(S, lightBuf, addLamp, y0, floorY);
  buildStreetCanopy(S, lightBuf, addLamp, floorY);
  buildPlatformsAndFence(data, S, addLamp, y0, floorY);

  S.kind = KIND.PLAIN;
  for (const x of [-1188, -1172, -1136, -1120]) {
    S.cyl(x, 1365.2, y0, y0 + 5.2, 0.09, 0.07, 6, COLORS.glass, { cap: false });
    S.box(x, 1365.2, y0 + 5.1, y0 + 5.35, 0.5, 0.3, 0, COLORS.glass);
    addLamp(x, y0 + 5.0, 1365.2, [1, 0.88, 0.62]);
  }
  const glowPts = glowPoints(lampPos, lampCol, 5);
  glowPts.userData.glow = true;
  glowPts.userData.landmark = id;
  group.add(glowPts);
  addEmissiveStripMesh(group, lightBuf, 0xffd08a, 0.9, id);
  S.kind = KIND.PLAIN;
  S.base = 0;
}
