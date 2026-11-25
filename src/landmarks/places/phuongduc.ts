import { KIND, Buf, hex, rand } from '../../geo/buf.ts';
import { LAND_Y } from '../../config.ts';
import { streetTest } from '../enclosure.ts';
import { groundHeightAt, isFootprintClearOfStreets, addEmissiveStripMesh, addGlowPointCloud } from '../helpers.ts';

// Làng đúc đồng Phường Đúc (Bùi Thị Xuân street, south bank of the Perfume River): Huế's 400-year-old
// royal bronze-casting village (casters of the Nine Dynastic Urns and Thiên Mụ's Great Bell). Features
// tiled open-sided foundry sheds (lò đúc đồng), brick melting furnaces with chimneys, drying clay molds,
// cast bronze bells (đại hồng chung) & tripod incense urns (đỉnh đồng), and the ancestral craft hall.
export const id = 'phuongduc';

// Bùi Thị Xuân road tangent near Phường Đúc ([-2690.5, 1735.6] -> [-2743.4, 1747.8])
const ORIGIN = [-2718.0, 1742.0];
const ROAD_DX = -2743.4 - (-2690.5);
const ROAD_DZ = 1747.8 - 1735.6;
const ROAD_LEN = Math.hypot(ROAD_DX, ROAD_DZ);
const TANGENT: [number, number] = [ROAD_DX / ROAD_LEN, ROAD_DZ / ROAD_LEN]; // west-southwest along Bùi Thị Xuân
const NORMAL: [number, number] = [-TANGENT[1], TANGENT[0]]; // +N south-southeast, -N north-northwest (toward river)
const ANGLE = Math.atan2(TANGENT[1], TANGENT[0]);
const FALLBACK_POS: [number, number] = [-2729.0, 1730.1];

const FOUNDRIES = [
  { u: 6, v: -16.5, w: 13.5, d: 8.5, kilnSide: 1 },
  { u: 22, v: -16.0, w: 11.5, d: 7.5, kilnSide: -1 },
  { u: -18, v: 14.5, w: 12.0, d: 8.0, kilnSide: 1 },
  { u: 2, v: 14.8, w: 13.0, d: 8.2, kilnSide: -1 },
];

const COLORS = {
  wall: hex('#dfd3b8'),
  wall2: hex('#e8d6a8'),
  brick: hex('#8c4c3a'),
  kiln: hex('#6e3d2e'),
  tile: hex('#8f4632'),
  tile2: hex('#733a2c'),
  ridge: hex('#d9cbb0'),
  tin: hex('#6a747a'),
  wood: hex('#513424'),
  dark: hex('#28201c'),
  pave: hex('#b5ae9f'),
  bronze: hex('#5e5132'),
  bronzeHi: hex('#8c7442'),
  patina: hex('#4e6b58'),
  clay: hex('#9e7454'),
  gold: hex('#cfa646'),
  ember: hex('#d96828'),
};

const toWorld = (u, v): [number, number] => [ORIGIN[0] + TANGENT[0] * u + NORMAL[0] * v, ORIGIN[1] + TANGENT[1] * u + NORMAL[1] * v];

function buildBronzeBell(S, x, z, y, scale = 1) {
  S.kind = KIND.PLAIN;
  S.cyl(x, z, y, y + 0.26 * scale, 0.68 * scale, 0.6 * scale, 8, COLORS.wood);
  S.cyl(x, z, y + 0.26 * scale, y + 1.18 * scale, 0.6 * scale, 0.44 * scale, 10, COLORS.bronze);
  S.cyl(x, z, y + 1.18 * scale, y + 1.72 * scale, 0.44 * scale, 0.24 * scale, 10, COLORS.bronzeHi);
  S.cyl(x, z, y + 1.72 * scale, y + 2.02 * scale, 0.18 * scale, 0.1 * scale, 6, COLORS.patina);
}

function buildBronzeUrn(S, x, z, y, scale = 1) {
  S.kind = KIND.PLAIN;
  S.box(x, z, y, y + 0.34 * scale, 1.05 * scale, 1.05 * scale, ANGLE, COLORS.pave);
  S.cyl(x, z, y + 0.34 * scale, y + 1.2 * scale, 0.42 * scale, 0.56 * scale, 8, COLORS.patina);
  S.cyl(x, z, y + 1.2 * scale, y + 1.56 * scale, 0.56 * scale, 0.34 * scale, 8, COLORS.bronzeHi);
  S.cyl(x, z, y + 1.56 * scale, y + 1.85 * scale, 0.2 * scale, 0.08 * scale, 8, COLORS.gold);
}

function buildAncestralHall(S, clearBox, glowPos, glowCol) {
  // Ancestral Bronze-Casters' Hall (Nhà thờ Tổ nghề đúc đồng) on the north side of Bùi Thị Xuân
  const center = toWorld(-14, -17.5);
  if (!clearBox(center[0], center[1], 16, 13)) return;
  const baseY = groundHeightAt(center[0], center[1]);
  S.base = baseY - LAND_Y;
  S.kind = KIND.MASONRY;
  S.box(center[0], center[1], baseY - 0.5, baseY + 0.35, 16, 13, ANGLE, COLORS.pave, { topKind: KIND.ROAD });
  // traditional 3-bay tiled hall
  S.kind = KIND.TIMBER;
  const hallPos = toWorld(-14, -19.2);
  S.box(hallPos[0], hallPos[1], baseY + 0.35, baseY + 3.9, 12.6, 7.6, ANGLE, COLORS.wall2, { top: COLORS.tile2 });
  S.hip(hallPos[0], hallPos[1], 12.6, 7.6, ANGLE, baseY + 3.9, 2.2, COLORS.tile, { over: 0.9, flare: 0.35, fascia: 0.2, fasciaCol: COLORS.wood, ridgeCol: COLORS.ridge, hips: true, segs: 3 });
  // front verandah columns & lacquered doors
  S.kind = KIND.PLAIN;
  for (let i = -2; i <= 2; i++) {
    const colPos = toWorld(-14 + i * 2.8, -15.0);
    S.cyl(colPos[0], colPos[1], baseY + 0.35, baseY + 3.7, 0.14, 0.12, 6, COLORS.wood, { cap: false });
  }
  const doorPos = toWorld(-14, -15.35);
  S.box(doorPos[0], doorPos[1], baseY + 0.35, baseY + 2.9, 7.2, 0.12, ANGLE, COLORS.wood);
  S.box(doorPos[0], doorPos[1], baseY + 3.05, baseY + 3.55, 2.6, 0.14, ANGLE, COLORS.gold);
  // courtyard monumental bronze cauldron (đỉnh đồng) + open timber bell-frame pavilions holding Đại Hồng Chung bells
  const urnPos = toWorld(-14, -12.6);
  buildBronzeUrn(S, urnPos[0], urnPos[1], baseY + 0.35, 1.35);
  for (const side of [-1, 1]) {
    const bellPos = toWorld(-14 + side * 4.4, -12.6);
    buildBronzeBell(S, bellPos[0], bellPos[1], baseY + 0.35, 1.25);
    // carved timber A-frame bell gantry over each bronze bell
    for (const ds of [-0.9, 0.9]) {
      const postPos = toWorld(-14 + side * 4.4 + ds, -12.6);
      S.cyl(postPos[0], postPos[1], baseY + 0.35, baseY + 2.85, 0.11, 0.09, 6, COLORS.wood, { cap: false });
    }
    S.box(bellPos[0], bellPos[1], baseY + 2.7, baseY + 2.95, 2.1, 0.22, ANGLE, COLORS.wood);
    S.hip(bellPos[0], bellPos[1], 2.4, 1.5, ANGLE, baseY + 2.95, 0.65, COLORS.tile, { over: 0.35, flare: 0.25, ridgeCol: COLORS.ridge, segs: 2 });
  }
  // village craft entrance gate (Cổng làng đúc đồng Phường Đúc) on the street edge of the hall courtyard
  for (const side of [-1, 1]) {
    const pierPos = toWorld(-14 + side * 2.5, -10.8);
    S.kind = KIND.MASONRY;
    S.box(pierPos[0], pierPos[1], baseY - 0.1, baseY + 3.4, 0.72, 0.72, ANGLE, COLORS.wall2, { top: COLORS.gold });
  }
  const gateMid = toWorld(-14, -10.8);
  S.kind = KIND.PLAIN;
  S.box(gateMid[0], gateMid[1], baseY + 2.65, baseY + 3.35, 5.2, 0.52, ANGLE, COLORS.brick);
  S.box(gateMid[0], gateMid[1], baseY + 2.8, baseY + 3.2, 3.0, 0.58, ANGLE, COLORS.gold);
  S.hip(gateMid[0], gateMid[1], 6.0, 1.8, ANGLE, baseY + 3.35, 1.0, COLORS.tile, { over: 0.4, flare: 0.3, ridgeCol: COLORS.ridge, segs: 2 });
  glowPos.push(doorPos[0], baseY + 3.1, doorPos[1]);
  glowCol.push(1, 0.8, 0.42);
}

function buildFoundries(S, clearBox, lightBuf, glowPos, glowCol) {
  // Open-sided bronze foundry sheds (lò đúc đồng) & brick melting kilns
  for (let idx = 0; idx < FOUNDRIES.length; idx++) {
    const foundry = FOUNDRIES[idx];
    const center = toWorld(foundry.u, foundry.v);
    if (!clearBox(center[0], center[1], foundry.w + 2, foundry.d + 2)) continue;
    const baseY = groundHeightAt(center[0], center[1]);
    S.base = baseY - LAND_Y;
    // concrete work yard
    S.kind = KIND.ROAD;
    S.box(center[0], center[1], baseY - 0.5, baseY + 0.14, foundry.w + 2.4, foundry.d + 2.8, ANGLE, COLORS.pave, { topKind: KIND.ROAD });
    // low rear brick wall + timber posts supporting a high ventilated tiled/tin foundry roof
    S.kind = KIND.MASONRY;
    const rearPos = toWorld(foundry.u, foundry.v + Math.sign(foundry.v) * (foundry.d / 2 - 0.4));
    S.box(rearPos[0], rearPos[1], baseY + 0.14, baseY + 3.6, foundry.w, 0.6, ANGLE, COLORS.wall);
    S.kind = KIND.PLAIN;
    for (let i = -2; i <= 2; i++) {
      const postPos = toWorld(foundry.u + i * (foundry.w / 4 - 0.2), foundry.v - Math.sign(foundry.v) * (foundry.d / 2 - 0.4));
      S.cyl(postPos[0], postPos[1], baseY + 0.14, baseY + 3.8, 0.14, 0.12, 6, COLORS.wood, { cap: false });
    }
    S.hip(center[0], center[1], foundry.w + 0.6, foundry.d + 0.6, ANGLE, baseY + 3.8, 2.0, idx % 2 ? COLORS.tile : COLORS.tin, { over: 0.7, flare: 0.15, segs: 2 });

    // brick melting furnace + tapered chimney stack with brick cap ring (glowing warm ember at night)
    const kilnPos = toWorld(foundry.u + foundry.kilnSide * (foundry.w / 2 + 1.2), foundry.v + Math.sign(foundry.v) * 1.4);
    S.kind = KIND.MASONRY;
    S.cyl(kilnPos[0], kilnPos[1], baseY - 0.3, baseY + 2.6, 1.55, 1.28, 8, COLORS.kiln);
    S.cyl(kilnPos[0], kilnPos[1], baseY + 2.6, baseY + 7.8, 0.72, 0.42, 8, COLORS.brick);
    S.cyl(kilnPos[0], kilnPos[1], baseY + 7.6, baseY + 7.95, 0.54, 0.48, 8, COLORS.kiln);
    // glowing molten-bronze furnace mouth
    S.kind = KIND.PLAIN;
    const mouthPos = toWorld(foundry.u + foundry.kilnSide * (foundry.w / 2 + 1.2), foundry.v + Math.sign(foundry.v) * 0.1);
    S.box(mouthPos[0], mouthPos[1], baseY + 0.4, baseY + 1.5, 0.95, 0.25, ANGLE, COLORS.ember);
    glowPos.push(kilnPos[0], baseY + 1.4, kilnPos[1]);
    glowCol.push(1, 0.46, 0.18);

    // showroom display along the street side: cast bronze bells, urns & drying clay molds
    const showV = foundry.v - Math.sign(foundry.v) * (foundry.d / 2 + 0.5);
    for (let j = -1; j <= 1; j++) {
      const itemPos = toWorld(foundry.u + j * 3.1, showV);
      if (j === 0) buildBronzeBell(S, itemPos[0], itemPos[1], baseY + 0.14, 1.1);
      else if (j === -1) buildBronzeUrn(S, itemPos[0], itemPos[1], baseY + 0.14, 1.0);
      else {
        // terracotta clay casting mold drying in the sun
        S.kind = KIND.MASONRY;
        S.cyl(itemPos[0], itemPos[1], baseY + 0.14, baseY + 1.25, 0.52, 0.38, 8, COLORS.clay);
      }
    }
    // warm foundry interior glow
    lightBuf.box(center[0], center[1], baseY + 0.6, baseY + 2.2, foundry.w * 0.5, 0.4, ANGLE, [1, 1, 1]);
  }
}

export function build({ data, S, group, place }) {
  const cx = place ? place.x : FALLBACK_POS[0];
  const cz = place ? place.z : FALLBACK_POS[1];
  const onStreet = streetTest(data, [cx, cz], 120);
  const clearBox = (x, z, len, wid) => isFootprintClearOfStreets(onStreet, x, z, TANGENT, NORMAL, len, wid, 1.2);

  const lightBuf = new Buf(256);
  const glowPos = [];
  const glowCol = [];
  const pavedStart = S.n;

  buildAncestralHall(S, clearBox, glowPos, glowCol);
  buildFoundries(S, clearBox, lightBuf, glowPos, glowCol);

  (S.paved = S.paved || []).push([pavedStart, S.n]);

  // ---- lush village garden trees ----
  if (Array.isArray(data.trees)) {
    for (let i = 0; i < 14; i++) {
      const u = -32 + i * 5.2 + (rand(i, 3) - 0.5) * 3;
      const v = (i % 2 ? 1 : -1) * (26 + rand(i, 7) * 14);
      const pos = toWorld(u, v);
      if (onStreet(pos[0], pos[1], 3.5)) continue;
      data.trees.push(Math.round(pos[0] * 10), Math.round(pos[1] * 10), 10 + Math.floor(rand(i, 11) * 4), i % 3 === 0 ? 1 : 0);
    }
  }

  addEmissiveStripMesh(group, lightBuf, 0xff9c4a, 0.9, id);
  addGlowPointCloud(group, glowPos, glowCol, 3.2, id);
  S.kind = KIND.PLAIN;
  S.base = 0;
}
