import { KIND, Buf, hex, shade, rand } from '../../geo/buf.ts';
import { LAND_Y } from '../../config.ts';
import { streetTest } from '../enclosure.ts';
import { groundHeightAt, isFootprintClearOfStreets, addEmissiveStripMesh, addGlowPointCloud } from '../helpers.ts';

// Làng hương Thủy Xuân (Huyền Trân Công Chúa street, on the way to Lăng Tự Đức): Huế's 700-year-old
// incense-making craft village, famous for roadside shophouses lined with fanned bouquets of brightly dyed
// bamboo incense sticks (đỏ, hồng, vàng, tím, xanh), drying racks, and hanging conical hats (nón lá).
export const id = 'thuyxuan';

// Huyền Trân Công Chúa axis through the village (from OSM road cls 2: [-2806.5, 3763.1] -> [-2797.1, 3851.5])
const AXIS_START = [-2806.5, 3763.1];
const AXIS_END = [-2797.1, 3851.5];
const AXIS_LEN = Math.hypot(AXIS_END[0] - AXIS_START[0], AXIS_END[1] - AXIS_START[1]);
const TANGENT: [number, number] = [(AXIS_END[0] - AXIS_START[0]) / AXIS_LEN, (AXIS_END[1] - AXIS_START[1]) / AXIS_LEN]; // south-east along Huyền Trân Công Chúa
const NORMAL: [number, number] = [-TANGENT[1], TANGENT[0]]; // across the road (+N west, -N east)
const ANGLE = Math.atan2(TANGENT[1], TANGENT[0]);
const FALLBACK_POS: [number, number] = [-2797.7, 3833.0];

const COLORS = {
  walls: ['#efe3c8', '#e8d09a', '#f2ece0', '#e5c4a8', '#d9e3d5'].map(hex),
  roofs: ['#9c4a34', '#824130', '#4f6e7a', '#6d787e', '#a8573c'].map(hex),
  incense: ['#d92638', '#e83e8c', '#f2b705', '#7e3ff2', '#17a589', '#f37021', '#2e86de'].map(hex),
  lanterns: ['#e03030', '#f2b705', '#e83e8c', '#17a589', '#7e3ff2', '#f37021'].map(hex),
  bamboo: hex('#c9b078'),
  wood: hex('#5c3d28'),
  dark: hex('#2c221d'),
  pave: hex('#b8b0a0'),
  hat: hex('#dfd0a6'),
  archPillar: hex('#d8c494'),
  archRed: hex('#9e3628'),
  archGold: hex('#f0c84b'),
  archTile: hex('#9c4a34'),
};

const toWorld = (s, v): [number, number] => [AXIS_START[0] + TANGENT[0] * s + NORMAL[0] * v, AXIS_START[1] + TANGENT[1] * s + NORMAL[1] * v];

function buildIncenseWorkshops(S, clearBox, lightBuf, glowPos, glowCol) {
  // roadside incense workshops along both sides of Huyền Trân Công Chúa
  for (const side of [-1, 1]) {
    for (let k = 0; k < 8; k++) {
      const s = 10 + k * 10.2;
      const w = 7.4 + (k % 2) * 1.0;
      const d = 6.2 + ((k + 1) % 2) * 1.2;
      const frontV = side * 8.6; // well clear of class-2 road half-width + kerb
      const midV = side * (8.6 + d / 2);
      const center = toWorld(s, midV);
      if (!clearBox(center[0], center[1], w + 1.0, d + 2.4)) continue;
      const baseY = groundHeightAt(center[0], center[1]);
      const height = k % 3 === 0 ? 5.8 : 3.6;
      const wallCol = COLORS.walls[(k + (side > 0 ? 2 : 0)) % COLORS.walls.length];
      const roofCol = COLORS.roofs[(k + (side > 0 ? 1 : 0)) % COLORS.roofs.length];

      S.base = baseY - LAND_Y;
      // paved display apron in front of each shop
      S.kind = KIND.ROAD;
      const apronPos = toWorld(s, side * 6.8);
      S.box(apronPos[0], apronPos[1], baseY - 0.5, baseY + 0.14, w + 0.8, 3.8, ANGLE, COLORS.pave, { topKind: KIND.ROAD });

      // shophouse body & tiled/corrugated hip roof
      S.kind = KIND.CIVIC;
      S.box(center[0], center[1], baseY - 0.5, baseY + height, w, d, ANGLE, wallCol, { top: shade(roofCol, 0.85) });
      S.hip(center[0], center[1], w, d, ANGLE, baseY + height, 1.5, roofCol, { over: 0.6, flare: 0.18, fascia: 0.14, fasciaCol: COLORS.wood, segs: 2 });

      // open timber-framed shopfront facing the street + sloping awning
      S.kind = KIND.PLAIN;
      const frontPos = toWorld(s, frontV - side * 0.06);
      S.box(frontPos[0], frontPos[1], baseY + 0.15, baseY + 2.55, w * 0.78, 0.12, ANGLE, COLORS.dark);
      lightBuf.box(frontPos[0], frontPos[1], baseY + 0.3, baseY + 2.3, w * 0.72, 0.08, ANGLE, [1, 1, 1]);
      // signboard
      S.box(frontPos[0], frontPos[1], baseY + 2.65, baseY + 3.25, w * 0.84, 0.16, ANGLE, COLORS.incense[k % COLORS.incense.length]);
      // front verandah canopy on slender posts
      const awningPos = toWorld(s, side * 7.2);
      S.box(awningPos[0], awningPos[1], baseY + 2.75, baseY + 2.92, w + 0.2, 2.8, ANGLE, shade(roofCol, 1.05), { bottom: true });
      for (const du of [-w / 2 + 0.3, w / 2 - 0.3]) {
        const postPos = toWorld(s + du, side * 6.0);
        S.cyl(postPos[0], postPos[1], baseY + 0.14, baseY + 2.78, 0.08, 0.07, 6, COLORS.wood, { cap: false });
      }
      // hanging conical hats (nón lá) under the awning
      for (let hatIdx = -2; hatIdx <= 2; hatIdx++) {
        const hatPos = toWorld(s + hatIdx * 1.2, side * 6.3);
        S.cyl(hatPos[0], hatPos[1], baseY + 2.15, baseY + 2.48, 0.28, 0.03, 7, COLORS.hat);
      }

      // ---- signature fanned bouquets of dyed incense sticks (bó hương) on tiered bamboo displays ----
      for (let bouquetIdx = 0; bouquetIdx < 5; bouquetIdx++) {
        const bu = s - w * 0.42 + bouquetIdx * (w * 0.21);
        const bv = side * (5.65 + (bouquetIdx % 2) * 1.25);
        const bPos = toWorld(bu, bv);
        const bY = groundHeightAt(bPos[0], bPos[1]) + 0.14;
        const mainCol = COLORS.incense[(k * 3 + bouquetIdx + (side > 0 ? 2 : 0)) % COLORS.incense.length];
        const coreCol = COLORS.incense[(k * 3 + bouquetIdx + 3) % COLORS.incense.length];
        const tierLift = bouquetIdx % 2 === 0 ? 0.28 : 0.0;
        S.cyl(bPos[0], bPos[1], bY, bY + 0.48 + tierLift, 0.22, 0.26, 6, COLORS.wood);
        S.cyl(bPos[0], bPos[1], bY + 0.48 + tierLift, bY + 1.0 + tierLift, 0.16, 0.62, 10, COLORS.bamboo);
        S.cyl(bPos[0], bPos[1], bY + 0.96 + tierLift, bY + 1.48 + tierLift, 0.62, 1.05, 11, mainCol);
        S.cyl(bPos[0], bPos[1], bY + 1.48 + tierLift, bY + 1.68 + tierLift, 1.05, 0.72, 11, shade(mainCol, 1.14));
        S.cyl(bPos[0], bPos[1], bY + 1.66 + tierLift, bY + 1.78 + tierLift, 0.45, 0.2, 9, coreCol);
      }

      // warm lantern glow under the awning
      const lampPos = toWorld(s, side * 6.4);
      glowPos.push(lampPos[0], baseY + 2.6, lampPos[1]);
      glowCol.push(1, 0.84, 0.5);
    }
  }
}

function buildLanternStringsAndArch(S, onStreet, glowPos, glowCol) {
  // ---- overhead festive silk lantern strings crisscrossing Huyền Trân Công Chúa between the incense shops ----
  for (let k = 0; k < 5; k++) {
    const s = 16 + k * 14;
    const leftPt = toWorld(s, -6.2);
    const rightPt = toWorld(s, 6.2);
    const leftY = groundHeightAt(leftPt[0], leftPt[1]) + 6.4;
    const rightY = groundHeightAt(rightPt[0], rightPt[1]) + 6.4;
    S.kind = KIND.PLAIN;
    S.beam([leftPt[0], leftY, leftPt[1]], [rightPt[0], rightY, rightPt[1]], 0.04, 0.04, COLORS.dark);
    for (let j = 1; j <= 5; j++) {
      const frac = j / 6;
      const v = -6.2 + frac * 12.4;
      const sag = Math.sin(frac * Math.PI) * 0.45;
      const pos = toWorld(s, v);
      const lanternY = leftY + (rightY - leftY) * frac - sag;
      S.cyl(pos[0], pos[1], lanternY - 0.52, lanternY - 0.06, 0.24, 0.2, 8, COLORS.lanterns[(k * 2 + j) % COLORS.lanterns.length]);
      glowPos.push(pos[0], lanternY - 0.29, pos[1]);
      glowCol.push(1, 0.78, 0.42);
    }
  }

  // ---- village welcome arch (Làng hương Thủy Xuân) near the main junction ----
  const archS = 68;
  const leftPillar = toWorld(archS, -6.2);
  const rightPillar = toWorld(archS, 6.2);
  const midArch = toWorld(archS, 0);
  if (!onStreet(leftPillar[0], leftPillar[1], 0.4) && !onStreet(rightPillar[0], rightPillar[1], 0.4)) {
    const archY = Math.max(groundHeightAt(leftPillar[0], leftPillar[1]), groundHeightAt(rightPillar[0], rightPillar[1]));
    S.base = archY - LAND_Y;
    S.kind = KIND.MASONRY;
    for (const pos of [leftPillar, rightPillar]) {
      S.box(pos[0], pos[1], archY - 0.5, archY + 5.4, 0.75, 0.75, ANGLE, COLORS.archPillar);
      S.box(pos[0], pos[1], archY + 5.4, archY + 5.85, 0.95, 0.95, ANGLE, COLORS.archRed);
    }
    S.kind = KIND.PLAIN;
    S.box(midArch[0], midArch[1], archY + 4.9, archY + 5.7, 0.55, 12.8, ANGLE, COLORS.archRed);
    S.box(midArch[0], midArch[1], archY + 5.15, archY + 5.48, 0.62, 8.8, ANGLE, COLORS.archGold);
    S.hip(midArch[0], midArch[1], 1.6, 13.6, ANGLE, archY + 5.7, 0.95, COLORS.archTile, { over: 0.4, flare: 0.25, segs: 2 });
  }
}

export function build({ data, S, group, place }) {
  const cx = place ? place.x : FALLBACK_POS[0];
  const cz = place ? place.z : FALLBACK_POS[1];
  const onStreet = streetTest(data, [cx, cz], 120);
  const clearBox = (x, z, len, wid) => isFootprintClearOfStreets(onStreet, x, z, TANGENT, NORMAL, len, wid, 1.0);

  const lightBuf = new Buf(256);
  const glowPos = [];
  const glowCol = [];
  const pavedStart = S.n;

  buildIncenseWorkshops(S, clearBox, lightBuf, glowPos, glowCol);
  buildLanternStringsAndArch(S, onStreet, glowPos, glowCol);

  (S.paved = S.paved || []).push([pavedStart, S.n]);

  // ---- lush hillside garden trees behind the shophouses (matching Google Satellite) ----
  if (Array.isArray(data.trees)) {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 16; i++) {
        const s = -10 + i * 7.2 + (rand(i, side + 5) - 0.5) * 3;
        const v = side * (17 + rand(i, side + 9) * 18);
        const pos = toWorld(s, v);
        if (onStreet(pos[0], pos[1], 3.5)) continue;
        data.trees.push(Math.round(pos[0] * 10), Math.round(pos[1] * 10), 10 + Math.floor(rand(i, 12) * 5), i % 3 === 0 ? 1 : 0);
      }
    }
  }

  addEmissiveStripMesh(group, lightBuf, 0xffd088, 0.85, id);
  addGlowPointCloud(group, glowPos, glowCol, 3.0, id);
  S.kind = KIND.PLAIN;
  S.base = 0;
}
