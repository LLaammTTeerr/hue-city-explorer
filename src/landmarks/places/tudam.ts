import { addEmissiveStripMesh, addGlowPointCloud } from '../helpers.ts';
import { KIND, Buf, hex, shade, obb, inRing } from '../../geo/buf.ts';
import { LAND_Y } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { leaves, offStreets, clipTo } from '../enclosure.ts';

// ---- Chùa Từ Đàm, 1 Sư Liễu Quán, Huế: the precinct as it stands today (see docs/places/tudam.md) ----
export const id = 'tudam';

const SITE = [
  [-795.1, 1958.7], [-803.1, 1853.6], [-742.9, 1850.0], [-739.8, 1879.9], [-738.3, 1886.7], [-729.7, 1905.3],
  [-713.5, 1901.1], [-710.8, 1903.8], [-710.7, 1931.2], [-713.6, 1936.3], [-784.8, 1965.2], [-790.0, 1964.9], [-793.9, 1962.0],
];
const EAST_HALL = [[-759.1, 1892.7], [-740.3, 1936.0], [-725.6, 1929.7], [-744.4, 1886.4]];
const QUARTERS = [[-741.8, 1880.9], [-752.3, 1862.7], [-766.8, 1870.9], [-756.4, 1889.1]];
const ANNEX_N = [[-799.1, 1871.0], [-795.6, 1879.5], [-776.2, 1871.7], [-779.7, 1863.2]];
const ANNEX_E = [[-729.9, 1907.4], [-727.6, 1916.2], [-712.3, 1912.3], [-714.6, 1903.4]];
const STUPA_POS = [-784.3, 1947.0];

// The hall's frame: u along the facade (ENE), v toward the front (SSE, the street).
const HALL_ORIGIN = [-778, 1900];
const HALL_ANG = Math.atan2(-0.376, 0.927);
const AXIS_UX = Math.cos(HALL_ANG);
const AXIS_UZ = Math.sin(HALL_ANG);
const toWorld = (u, v): [number, number] => [HALL_ORIGIN[0] + u * AXIS_UX - v * AXIS_UZ, HALL_ORIGIN[1] + u * AXIS_UZ + v * AXIS_UX];
const toLocal = (x, z): [number, number] => [(x - HALL_ORIGIN[0]) * AXIS_UX + (z - HALL_ORIGIN[1]) * AXIS_UZ, -(x - HALL_ORIGIN[0]) * AXIS_UZ + (z - HALL_ORIGIN[1]) * AXIS_UX];
const localQuad = (u0, u1, v0, v1) => [toWorld(u0, v0), toWorld(u1, v0), toWorld(u1, v1), toWorld(u0, v1)];

const SIDE_GATE = [29.4, 56.9];
const HALL_CENTER_U = -1.25;
const PODIUM_W = 24.1;
const PODIUM_H = 1.9;
const PODIUM_V0 = -18.9;
const PODIUM_V1 = 15.5;
const GATE_V = 56.9;

const PAL = {
  granite: hex('#9d9a92'), graniteDark: hex('#7c7a74'), step: hex('#b3afa6'),
  wall: hex('#e6cd84'), wallLight: hex('#efe1b8'), column: hex('#6e2a20'), door: hex('#5a2c1e'),
  tile: hex('#a04f38'), tileDark: hex('#7d3b29'), ceramic: hex('#ebe7dc'), crest: hex('#c9c3b2'), panel: hex('#5e6c68'), panelFrame: hex('#6b3a26'),
  brick: hex('#a45138'), brickDark: hex('#7e3b2a'), rail: hex('#eadbb6'),
  pier: hex('#bdbfba'), ochre: hex('#b9864f'), board: hex('#2f5c4c'), letters: hex('#efe4c2'), iron: hex('#24262a'),
  fenceWall: hex('#ead9a6'), fret: hex('#f2ecdc'), fretCut: hex('#4a4943'), coping: hex('#8a4a36'), base: hex('#a7a59b'),
  pave: hex('#aba69b'), redBrick: hex('#a4533f'), lawn: hex('#5f7f3c'),
  mosaic: hex('#7d9a9c'), bronze: hex('#5b4630'), lantern: hex('#f0dfb0'), rubble: hex('#77776f'), rubble2: hex('#45463f'),
  soffit: hex('#6b3a26'),
  leaf: hex('#4b7631'), leaf2: hex('#5f8a3a'), leafDark: hex('#3c6229'), trunk: hex('#6a5442'), gold: hex('#d9a93a'),
};
const EAVE_STYLE = { flare: 0.22, fascia: 0.3, fasciaCol: null, ridgeCol: null, hips: true, segs: 2, horns: false };

function insetRing(ring, dist) {
  const count = ring.length;
  let twiceArea = 0;
  for (let i = 0; i < count; i++) {
    const ptA = ring[i], ptB = ring[(i + 1) % count];
    twiceArea += ptA[0] * ptB[1] - ptB[0] * ptA[1];
  }
  const sign = twiceArea > 0 ? 1 : -1;
  const shifted = [];
  for (let i = 0; i < count; i++) {
    const ptA = ring[i], ptB = ring[(i + 1) % count];
    const len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]) || 1;
    const nx = (-(ptB[1] - ptA[1]) / len) * sign, nz = ((ptB[0] - ptA[0]) / len) * sign;
    shifted.push([[ptA[0] + nx * dist, ptA[1] + nz * dist], [ptB[0] + nx * dist, ptB[1] + nz * dist]]);
  }
  return shifted.map((edge, idx) => {
    const [p1, p2] = shifted[(idx + count - 1) % count], [p3, p4] = edge;
    const d1 = [p2[0] - p1[0], p2[1] - p1[1]], d2 = [p4[0] - p3[0], p4[1] - p3[1]];
    const den = d1[0] * d2[1] - d1[1] * d2[0];
    if (Math.abs(den) < 1e-6) return p3;
    const frac = ((p3[0] - p1[0]) * d2[1] - (p3[1] - p1[1]) * d2[0]) / den;
    return [p1[0] + d1[0] * frac, p1[1] + d1[1] * frac];
  });
}

const isLowCourt = (x, z) => {
  const [u, v] = toLocal(x, z);
  return (u > 37.6 && v > 0) || (u > 21 && v > 49);
};

// ---------------- main build sections ----------------

function buildTerracesAndLawns(S, site, yardY, lowY, footY, yAt) {
  const paveStart = S.n;
  S.kind = KIND.PLAIN;
  const terraceDefs: [number[][], number][] = [
    [localQuad(-90, 21, -90, 90), yardY],
    [localQuad(21, 90, -90, 0), yardY],
    [localQuad(21, 37.6, 0, 49), yardY],
    [localQuad(37.6, 90, 0, 90), lowY],
    [localQuad(21, 37.6, 49, 90), lowY],
  ];
  for (const [quad, levelY] of terraceDefs) {
    const clipped = clipTo(quad, site);
    if (clipped) S.prism(clipped, footY, levelY, PAL.base, PAL.pave, { topKind: KIND.ROAD });
  }
  buildRubbleFace(S, site, yAt);
  S.prism(localQuad(-14, 12, 19.4, 55.6), yardY, yardY + 0.03, PAL.redBrick, PAL.redBrick, { topKind: KIND.ROAD });
  (S.paved = S.paved || []).push([paveStart, S.n]);

  for (const [endA, endB] of ([[[21, 49.1], [26.7, 49.1]], [[32.1, 49.1], [37.6, 49.1]], [[21.1, 49.1], [21.1, 56.5]]] as [[number, number], [number, number]][])) {
    const ptA = toWorld(endA[0], endA[1]), ptB = toWorld(endB[0], endB[1]);
    const mid = [(ptA[0] + ptB[0]) / 2, (ptA[1] + ptB[1]) / 2];
    const ang = Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]);
    S.box(mid[0], mid[1], lowY - 0.05, yardY + 0.05, Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]), 0.3, ang, PAL.wallLight);
    S.beam([ptA[0], yardY + 0.45, ptA[1]], [ptB[0], yardY + 0.45, ptB[1]], 0.14, 0.8, PAL.rail);
    S.beam([ptA[0], yardY + 0.88, ptA[1]], [ptB[0], yardY + 0.88, ptB[1]], 0.24, 0.08, PAL.coping);
  }
  for (const quad of [localQuad(-33, -16, 30, 55), localQuad(-30, -16, -30, 14), localQuad(13, 19.5, 30, 50)]) {
    const bed = clipTo(quad, site);
    if (bed) S.prism(bed, yardY, yardY + 0.06, PAL.lawn, PAL.lawn, { topKind: KIND.GROUND });
  }
}

function buildChanhDien(S, yardY, lamp, lightBuf) {
  S.kind = KIND.MASONRY;
  const podiumCenter = toWorld(HALL_CENTER_U, (PODIUM_V0 + PODIUM_V1) / 2);
  S.box(podiumCenter[0], podiumCenter[1], yardY - 0.1, yardY + PODIUM_H, PODIUM_W, PODIUM_V1 - PODIUM_V0, HALL_ANG, PAL.granite, { top: PAL.step, topKind: KIND.ROAD });
  S.box(podiumCenter[0], podiumCenter[1], yardY - 0.1, yardY + 0.35, PODIUM_W + 0.2, PODIUM_V1 - PODIUM_V0 + 0.2, HALL_ANG, PAL.graniteDark);

  const steps = 10, stepH = PODIUM_H / steps, tread = 0.4, stairW = 20;
  for (let k = 1; k <= steps; k++) {
    const pt = toWorld(HALL_CENTER_U, PODIUM_V1 + tread * (steps - k + 0.5));
    S.box(pt[0], pt[1], yardY - 0.1, yardY + stepH * k, stairW, tread, HALL_ANG, PAL.step, { topKind: KIND.ROAD });
  }
  const runTop = toWorld(HALL_CENTER_U, PODIUM_V1 + 0.1), runBot = toWorld(HALL_CENTER_U, PODIUM_V1 + tread * steps);
  S.kind = KIND.PLAIN;
  S.beam([runTop[0], yardY + PODIUM_H + 0.02, runTop[1]], [runBot[0], yardY + 0.06, runBot[1]], 3.2, 0.04, hex('#a3262a'));
  for (const side of [-1, 1]) {
    const ptA = toWorld(HALL_CENTER_U + side * (stairW / 2 + 0.3), PODIUM_V1 - 0.2);
    const ptB = toWorld(HALL_CENTER_U + side * (stairW / 2 + 0.3), PODIUM_V1 + tread * steps);
    S.beam([ptA[0], yardY + PODIUM_H + 0.4, ptA[1]], [ptB[0], yardY + 0.45, ptB[1]], 0.6, 0.9, PAL.granite);
    S.beam([ptA[0], yardY + PODIUM_H + 0.95, ptA[1]], [ptB[0], yardY + 0.95, ptB[1]], 0.3, 0.3, PAL.ceramic);
  }

  for (const [endA, endB] of ([
    [[HALL_CENTER_U - PODIUM_W / 2 + 0.2, PODIUM_V1], [HALL_CENTER_U - PODIUM_W / 2 + 0.2, PODIUM_V0 + 0.2]],
    [[HALL_CENTER_U - PODIUM_W / 2 + 0.2, PODIUM_V0 + 0.2], [HALL_CENTER_U + PODIUM_W / 2 - 0.2, PODIUM_V0 + 0.2]],
    [[HALL_CENTER_U + PODIUM_W / 2 - 0.2, PODIUM_V0 + 0.2], [HALL_CENTER_U + PODIUM_W / 2 - 0.2, PODIUM_V1]],
  ] as [[number, number], [number, number]][])) {
    const ptA = toWorld(endA[0], endA[1]), ptB = toWorld(endB[0], endB[1]);
    S.beam([ptA[0], yardY + PODIUM_H + 0.42, ptA[1]], [ptB[0], yardY + PODIUM_H + 0.42, ptB[1]], 0.16, 0.84, PAL.rail);
  }

  const floorY = yardY + PODIUM_H;
  buildHall(S, toWorld(HALL_CENTER_U, -12.6), 22.6, 11.0, floorY, { wallH: 4.8, rLow: 3.0, clere: 2.4, rTop: 3.0, doors: 'back', ped: 1, lamp, lightBuf });
  buildHall(S, toWorld(HALL_CENTER_U, 0), 22.6, 12.0, floorY, { wallH: 5.2, rLow: 3.2, clere: 2.8, rTop: 3.4, doors: 'none', ped: 2, lamp, lightBuf });
  buildHall(S, toWorld(HALL_CENTER_U, 11.25), 22.6, 7.5, floorY, { wallH: 4.5, rLow: 2.4, clere: 2.2, rTop: 2.4, doors: 'front', ped: 1, lamp, lightBuf });

  const flagCols = [hex('#2a4fa0'), hex('#e0b52c'), hex('#b8322a'), hex('#f1ece0'), hex('#dc7a2a')];
  for (const u of [-8.5, -3.6, 3.6, 8.5]) {
    const ptA = toWorld(HALL_CENTER_U + u, 15.0), ptB = toWorld(HALL_CENTER_U + u, 16.2);
    S.beam([ptA[0], floorY + 2.6, ptA[1]], [ptB[0], floorY + 4.0, ptB[1]], 0.05, 0.05, PAL.trunk);
    flagCols.forEach((col, idx) => {
      const flagPt = toWorld(HALL_CENTER_U + u - 0.28 + idx * 0.14, 16.0);
      S.box(flagPt[0], flagPt[1], floorY + 2.6, floorY + 3.85, 0.14, 0.03, HALL_ANG, col);
    });
  }
  for (const u of [13.6, -15.4]) buildCornerTower(S, u, 13.8, yardY, floorY);
}

function plantYardTreesAndProps(data, S, site, yardY, yAt) {
  if (Array.isArray(data.trees)) {
    const bodhi = toWorld(15.5, 42);
    data.trees.push(Math.round(bodhi[0] * 10), Math.round(bodhi[1] * 10), 14, 5);
    for (const [u, v, scale] of ([[-24, -22, 10], [-26, -8, 10], [-24, 6, 10], [-30, 24, 11], [-12, 52, 9], [9, 52, 9], [-18, -36, 12]] as [number, number, number][])) {
      const pt = toWorld(u, v);
      if (inRing(pt[0], pt[1], site)) data.trees.push(Math.round(pt[0] * 10), Math.round(pt[1] * 10), scale, 4);
    }
  }
  (S.stand = S.stand || []).push((x, z) => (inRing(x, z, site) ? Math.max(0, yAt(x, z) - (LAND_Y + rise(x, z))) : 0));

  for (const v of [8, 16, 24, 32]) {
    const pt = toWorld(17.6, v);
    S.kind = KIND.PLAIN;
    S.cyl(pt[0], pt[1], yardY, yardY + 0.3, 1.1, 1.1, 10, PAL.granite);
    S.cyl(pt[0], pt[1], yardY + 0.3, yardY + 0.45, 1.0, 0.95, 10, PAL.leafDark);
    if (Array.isArray(data.trees)) data.trees.push(Math.round(pt[0] * 10), Math.round(pt[1] * 10), 8, 1);
  }
  for (let k = 0; k < 8; k++) {
    const ang = (k / 8) * Math.PI * 2 + 0.3;
    if (Math.abs(Math.sin(ang - HALL_ANG) - 1) < 0.3) continue;
    const tx = STUPA_POS[0] + Math.cos(ang) * 7.2, tz = STUPA_POS[1] + Math.sin(ang) * 7.2;
    if (Array.isArray(data.trees)) data.trees.push(Math.round(tx * 10), Math.round(tz * 10), 9, 1);
  }

  S.kind = KIND.PLAIN;
  for (let u = -11; u <= 11; u += 4.4) {
    const pt = toWorld(HALL_CENTER_U + u, 20.4);
    S.cyl(pt[0], pt[1], yardY, yardY + 0.6, 0.35, 0.45, 6, hex('#7b5a46'));
    S.cyl(pt[0], pt[1], yardY + 0.6, yardY + 1.5, 0.55, 0.15, 6, PAL.leaf);
  }
  const urnPt = toWorld(HALL_CENTER_U + 3, 26);
  S.cyl(urnPt[0], urnPt[1], yardY, yardY + 0.45, 0.35, 0.3, 8, PAL.granite);
  S.cyl(urnPt[0], urnPt[1], yardY + 0.45, yardY + 0.95, 0.42, 0.6, 8, PAL.bronze);
  S.cyl(urnPt[0], urnPt[1], yardY + 0.95, yardY + 1.05, 0.62, 0.62, 8, PAL.bronze);
}

export function build({ data, S, group }) {
  const startIdx = S.n;
  const site = offStreets(data, insetRing(SITE, 1.0));
  let maxRise = -Infinity;
  for (let x = -803; x <= -710; x += 3) {
    for (let z = 1850; z <= 1966; z += 3) {
      if (inRing(x, z, site) && !isLowCourt(x, z)) maxRise = Math.max(maxRise, rise(x, z));
    }
  }
  for (const pt of site) if (!isLowCourt(pt[0], pt[1])) maxRise = Math.max(maxRise, rise(pt[0], pt[1]));
  const yardY = LAND_Y + maxRise + 1.4;
  const sideGateOut = toWorld(SIDE_GATE[0], SIDE_GATE[1] + 1.3);
  const streetY = LAND_Y + rise(sideGateOut[0], sideGateOut[1]);
  const lowY = streetY + 0.6;
  const yAt = (x, z) => (isLowCourt(x, z) ? lowY : yardY);
  const footY = LAND_Y + Math.min(...site.map((pt) => rise(pt[0], pt[1]))) - 0.4;
  S.base = yardY - LAND_Y;

  const lamps = [], lampCol = [];
  const lamp = (x, y, z, col = [1, 0.84, 0.55]) => { lamps.push(x, y, z); lampCol.push(...col); };
  const lightBuf = new Buf(512);

  buildTerracesAndLawns(S, site, yardY, lowY, footY, yAt);
  buildChanhDien(S, yardY, lamp, lightBuf);
  buildStupa(S, STUPA_POS[0], STUPA_POS[1], yardY, lamp);
  plantYardTreesAndProps(data, S, site, yardY, yAt);

  const eastMetrics = buildEastGallery(S, EAST_HALL, yardY, lowY, lamp);
  buildSouthPorch(S, lowY, eastMetrics, lamp);
  buildSideGate(S, lowY, streetY, lamp);
  buildMonasteryBlock(S, QUARTERS, yardY, 2, 3.2);
  buildMonasteryBlock(S, ANNEX_N, yardY, 2, 3.4);
  buildEastAnnex(S, ANNEX_E, lowY);

  buildTamQuan(S, HALL_CENTER_U, GATE_V, yardY, lamp, lightBuf);
  const frontG = rise(...toWorld(HALL_CENTER_U, GATE_V + 3.5)) + LAND_Y;
  const drop = yardY - frontG;
  if (drop > 0.12) {
    const steps = Math.max(1, Math.ceil(drop / 0.18)), stepH = drop / steps, tread = Math.min(0.34, 4.0 / steps);
    S.kind = KIND.MASONRY;
    for (let k = 0; k < steps; k++) {
      const pt = toWorld(HALL_CENTER_U, GATE_V + 0.35 + tread * (k + 0.5));
      S.box(pt[0], pt[1], frontG - 0.2, yardY - stepH * k, 12.4, tread, HALL_ANG, PAL.step, { topKind: KIND.ROAD });
    }
  }

  buildPrecinctWall(S, site, yAt, [
    [toWorld(HALL_CENTER_U - 6.6, GATE_V), toWorld(HALL_CENTER_U + 6.6, GATE_V)],
    [toWorld(SIDE_GATE[0] - 2.75, SIDE_GATE[1]), toWorld(SIDE_GATE[0] + 2.75, SIDE_GATE[1])],
  ], lamp);

  addGlowPointCloud(group, lamps, lampCol, 4.5, id);
  addEmissiveStripMesh(group, lightBuf, 0xffc879, 1.1, id);
  if (S.n - startIdx > 3 * 40000) console.warn('tudam: heavy model', (S.n - startIdx) / 3);
  S.kind = KIND.PLAIN;
  S.base = 0;
}

// ---------------- architectural sub-builders ----------------

function buildHall(S, center, width, depth, y0, { wallH, rLow, clere, rTop, doors, ped, lamp, lightBuf }) {
  const [cx, cz] = center;
  const hallPt = (u, v): [number, number] => [cx + u * AXIS_UX - v * AXIS_UZ, cz + u * AXIS_UZ + v * AXIS_UX];
  const coreW = width - 4.6, coreD = depth - 4.2;
  S.kind = KIND.PLAIN;
  S.box(cx, cz, y0, y0 + wallH, coreW, coreD, HALL_ANG, PAL.wall, { top: PAL.tileDark });

  const isFront = doors === 'front';
  if (doors !== 'none') {
    const bays = isFront ? 7 : 3;
    for (let i = 0; i < bays; i++) {
      const u = -coreW / 2 + (coreW * (i + 0.5)) / bays, side = isFront ? 1 : -1;
      const doorPt = hallPt(u, side * (coreD / 2 + 0.03));
      S.box(doorPt[0], doorPt[1], y0, y0 + 3.4, Math.min(2.0, coreW / bays - 0.6), 0.08, HALL_ANG, PAL.door);
      const transPt = hallPt(u, side * (coreD / 2 + 0.05));
      S.box(transPt[0], transPt[1], y0 + 3.7, y0 + Math.min(4.5, wallH - 0.2), Math.min(2.0, coreW / bays - 0.6), 0.06, HALL_ANG, PAL.panel);
      if (isFront) lamp(transPt[0], y0 + 2.2, transPt[1], [1, 0.78, 0.45]);
    }
  }
  const winCount = Math.max(1, Math.round(coreD / 2.6));
  for (const side of [-1, 1]) {
    for (let i = 0; i < winCount; i++) {
      const winPt = hallPt(side * (coreW / 2 + 0.03), -coreD / 2 + (coreD * (i + 0.5)) / winCount);
      S.box(winPt[0], winPt[1], y0 + 1.0, y0 + 3.4, 0.08, 1.5, HALL_ANG, PAL.door);
    }
  }

  const lidY = y0 + wallH;
  S.box(cx, cz, lidY - 0.25, lidY, width, depth, HALL_ANG, shade(PAL.column, 0.8), { top: PAL.tileDark, bottom: true });
  const colsU = Math.round(width / 3.2), colsV = Math.max(1, Math.round(depth / 3.4)), posts = [];
  for (let i = 0; i <= colsU; i++) for (const side of [-1, 1]) posts.push([-width / 2 + (width * i) / colsU, (side * depth) / 2]);
  for (let i = 1; i < colsV; i++) for (const side of [-1, 1]) posts.push([(side * width) / 2, -depth / 2 + (depth * i) / colsV]);
  for (const [u, v] of posts) {
    const pt = hallPt(u, v);
    S.cyl(pt[0], pt[1], y0, y0 + 0.3, 0.42, 0.36, 6, PAL.granite, { cap: false, rot: HALL_ANG });
    S.cyl(pt[0], pt[1], y0 + 0.3, lidY - 0.2, 0.25, 0.23, 6, PAL.column, { cap: false, rot: HALL_ANG });
  }
  const corners = [hallPt(-width / 2, -depth / 2), hallPt(width / 2, -depth / 2), hallPt(width / 2, depth / 2), hallPt(-width / 2, depth / 2)];
  for (let i = 0; i < 4; i++) {
    const ptA = corners[i], ptB = corners[(i + 1) % 4];
    S.beam([ptA[0], lidY - 0.35, ptA[1]], [ptB[0], lidY - 0.35, ptB[1]], 0.3, 0.4, PAL.column);
  }
  if (isFront) {
    const ptA = hallPt(-width / 2, depth / 2 + 0.05), ptB = hallPt(width / 2, depth / 2 + 0.05);
    S.beam([ptA[0], lidY - 0.75, ptA[1]], [ptB[0], lidY - 0.75, ptB[1]], 0.06, 0.35, PAL.gold);
  }

  S.hip(cx, cz, width, depth, HALL_ANG, lidY, rLow, PAL.tile, { ...EAVE_STYLE, over: 1.3, fasciaCol: PAL.tileDark });
  const upperW = width * 0.74, upperD = depth * 0.56, y2 = lidY + rLow * 0.45;
  S.kind = KIND.PLAIN;
  S.box(cx, cz, y2, y2 + clere, upperW, upperD, HALL_ANG, PAL.wallLight);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const pt = hallPt(-upperW / 2 + (upperW * (i + 0.5)) / 7, side * (upperD / 2 + 0.03));
      S.box(pt[0], pt[1], y2 + 0.35, y2 + clere - 0.3, upperW / 7 - 0.5, 0.06, HALL_ANG, PAL.panel);
    }
    const endPt = hallPt(side * (upperW / 2 + 0.03), 0);
    S.box(endPt[0], endPt[1], y2 + 0.35, y2 + clere - 0.3, 0.06, upperD - 1.0, HALL_ANG, PAL.panel);
    const ptA = hallPt(-upperW / 2, side * (upperD / 2 + 0.02)), ptB = hallPt(upperW / 2, side * (upperD / 2 + 0.02));
    S.beam([ptA[0], y2 + 0.18, ptA[1]], [ptB[0], y2 + 0.18, ptB[1]], 0.08, 0.3, PAL.panelFrame);
    S.beam([ptA[0], y2 + clere - 0.12, ptA[1]], [ptB[0], y2 + clere - 0.12, ptB[1]], 0.08, 0.24, PAL.panelFrame);
  }
  const y3 = y2 + clere;
  S.hip(cx, cz, upperW, upperD, HALL_ANG, y3, rTop, PAL.tile, { ...EAVE_STYLE, over: 1.2, fasciaCol: PAL.tileDark, ridgeCol: PAL.crest });
  S.kind = KIND.PLAIN;

  const ridgeY = y3 + rTop + 0.25, halfD = (upperD + 2.4) / 2, halfRidge = Math.max(0, (upperW + 2.4) / 2 - halfD * 0.92);
  S.box(cx, cz, ridgeY - 0.3, ridgeY + 0.45, 2 * halfRidge, 0.4, HALL_ANG, PAL.crest, { top: PAL.ceramic });
  for (let i = -2; i <= 2; i++) {
    const pt = hallPt((i * halfRidge) / 3, 0);
    S.box(pt[0], pt[1], ridgeY - 0.15, ridgeY + 0.3, Math.min(2.2, halfRidge / 2), 0.46, HALL_ANG, PAL.mosaic);
  }
  const isBig = ped === 2, slope = rTop / halfD, pedU = halfRidge + (isBig ? 1.2 : 0.6), pedW = isBig ? 5.0 : Math.min(3.4, upperD * 0.75);
  const pedBaseY = ridgeY - 0.25 - Math.max(pedU - halfRidge, pedW / 2) * slope - 0.4;
  const pedH = ridgeY + (isBig ? 2.4 : 1.3) - pedBaseY;
  for (const side of [-1, 1]) buildPediment(S, hallPt, side * pedU, side, pedBaseY, pedW, pedH, isBig);

  if (isFront) {
    const mid = hallPt(0, 0);
    S.cyl(mid[0], mid[1], ridgeY, ridgeY + 0.5, 0.5, 0.3, 6, PAL.ceramic);
    S.box(mid[0], mid[1], ridgeY + 0.5, ridgeY + 1.7, 1.2, 0.15, HALL_ANG, PAL.ceramic);
    S.box(mid[0], mid[1], ridgeY + 0.85, ridgeY + 1.35, 0.6, 0.18, HALL_ANG, PAL.gold);
    for (const side of [-1, 1]) {
      const ptA = hallPt(side * 0.9, 0), ptB = hallPt(side * 3.2, 0);
      S.beam([ptA[0], ridgeY + 0.6, ptA[1]], [ptB[0], ridgeY + 0.25, ptB[1]], 0.3, 0.45, PAL.ceramic);
    }
    const stripA = hallPt(-width / 2 - 0.8, depth / 2 + 1.0), stripB = hallPt(width / 2 + 0.8, depth / 2 + 1.0);
    lightBuf.beam([stripA[0], lidY - 0.15, stripA[1]], [stripB[0], lidY - 0.15, stripB[1]], 0.12, 0.1, [1, 1, 1]);
  }
}

function buildPediment(S, hallPt, u, side, baseY, baseW, height, isBig) {
  const tiers = 4;
  for (let k = 0; k < tiers; k++) {
    const pt = hallPt(u, 0), tierW = baseW * (1 - (k / tiers) * 0.5);
    S.box(pt[0], pt[1], baseY + (height * k) / tiers, baseY + (height * (k + 1)) / tiers + 0.02, 0.42, tierW, HALL_ANG, k === tiers - 1 ? PAL.ceramic : PAL.crest, { top: PAL.ceramic });
  }
  const facePt = hallPt(u + side * 0.23, 0);
  S.box(facePt[0], facePt[1], baseY + height * 0.45, baseY + height * 0.86, 0.05, baseW * 0.5, HALL_ANG, PAL.mosaic);
  for (const sgn of [-1, 1]) {
    const ptA = hallPt(u, sgn * baseW * 0.2), ptB = hallPt(u, sgn * baseW * 0.36);
    S.beam([ptA[0], baseY + height, ptA[1]], [ptB[0], baseY + height + (isBig ? 0.8 : 0.6), ptB[1]], 0.26, 0.36, PAL.ceramic);
  }
  const topPt = hallPt(u, 0);
  if (isBig) {
    S.cyl(topPt[0], topPt[1], baseY + height, baseY + height + 0.95, 0.3, 0.18, 6, PAL.ceramic);
    S.cyl(topPt[0], topPt[1], baseY + height + 0.95, baseY + height + 1.3, 0.17, 0.1, 6, PAL.ceramic);
  } else {
    S.cyl(topPt[0], topPt[1], baseY + height, baseY + height + 0.5, 0.25, 0.08, 6, PAL.ceramic);
  }
}

function buildCornerTower(S, u, v, yardY, floorY) {
  const center = toWorld(u, v);
  S.kind = KIND.MASONRY;
  S.box(center[0], center[1], yardY - 0.1, floorY, 5.4, 5.4, HALL_ANG, PAL.granite, { top: PAL.step, topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;
  const lowSize = 4.4, y1 = floorY + 3.4, topSize = 3.0, y3 = y1 + 2.0;
  S.box(center[0], center[1], floorY, y1, lowSize, lowSize, HALL_ANG, PAL.wall, { top: PAL.tileDark });
  for (const [du, dv, ang] of ([[0, lowSize / 2 + 0.03, HALL_ANG], [0, -lowSize / 2 - 0.03, HALL_ANG], [lowSize / 2 + 0.03, 0, HALL_ANG + Math.PI / 2], [-lowSize / 2 - 0.03, 0, HALL_ANG + Math.PI / 2]] as [number, number, number][])) {
    const winPt = toWorld(u + du, v + dv);
    S.box(winPt[0], winPt[1], floorY + 0.8, floorY + 2.9, 1.6, 0.06, ang, PAL.panelFrame);
    const glassPt = toWorld(u + du * 1.01, v + dv * 1.01);
    S.box(glassPt[0], glassPt[1], floorY + 0.95, floorY + 2.75, 1.3, 0.06, ang, PAL.panel);
  }
  S.hip(center[0], center[1], lowSize, lowSize, HALL_ANG, y1, 1.2, PAL.tile, { ...EAVE_STYLE, over: 0.8, fascia: 0.22, fasciaCol: PAL.tileDark, ridgeCol: PAL.crest });
  S.kind = KIND.PLAIN;
  S.box(center[0], center[1], y1 + 0.3, y3, topSize, topSize, HALL_ANG, PAL.wallLight, { top: PAL.tileDark });
  for (const [du, dv, ang] of ([[0, topSize / 2 + 0.03, HALL_ANG], [0, -topSize / 2 - 0.03, HALL_ANG], [topSize / 2 + 0.03, 0, HALL_ANG + Math.PI / 2], [-topSize / 2 - 0.03, 0, HALL_ANG + Math.PI / 2]] as [number, number, number][])) {
    const panPt = toWorld(u + du, v + dv);
    S.box(panPt[0], panPt[1], y1 + 0.9, y3 - 0.25, 1.8, 0.06, ang, PAL.panel);
  }
  S.hip(center[0], center[1], topSize, topSize, HALL_ANG, y3, 1.5, PAL.tile, { ...EAVE_STYLE, over: 0.8, fascia: 0.2, fasciaCol: PAL.tileDark, ridgeCol: PAL.crest });
  S.kind = KIND.PLAIN;
  const finialY = y3 + 1.5;
  S.cyl(center[0], center[1], finialY - 0.1, finialY + 0.35, 0.28, 0.12, 6, PAL.ceramic);
  S.cyl(center[0], center[1], finialY + 0.35, finialY + 0.6, 0.14, 0.04, 6, PAL.ceramic);
}

function buildStupa(S, x, z, y0, lamp) {
  const oct = (radius, rot = Math.PI / 8 + HALL_ANG) =>
    Array.from({ length: 8 }, (_, i) => [x + Math.cos(rot + (i * Math.PI) / 4) * radius, z + Math.sin(rot + (i * Math.PI) / 4) * radius]);
  S.kind = KIND.MASONRY;
  S.prism(oct(5.4), y0, y0 + 0.35, PAL.granite, PAL.step, { topKind: KIND.ROAD });
  S.prism(oct(4.5), y0 + 0.35, y0 + 0.9, PAL.step, PAL.step, { topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;
  S.prism(oct(5.25), y0 + 0.35, y0 + 1.0, PAL.rail, PAL.rail, { holes: [oct(5.05)] });

  let curY = y0 + 0.9;
  const radiusOf = (tier) => 3.8 - tier * 0.27;
  const heightOf = (tier) => 3.2 - tier * 0.1;
  for (let i = 0; i < 7; i++) {
    const tierR = radiusOf(i), tierH = heightOf(i);
    S.kind = KIND.MASONRY;
    S.prism(oct(tierR), curY, curY + tierH, PAL.brick, PAL.brick, { top: false });
    S.kind = KIND.PLAIN;
    for (let k = 0; k < 8; k++) {
      const ang = Math.PI / 8 + HALL_ANG + (k * Math.PI) / 4, faceAng = ang + Math.PI / 8, apothem = tierR * Math.cos(Math.PI / 8);
      S.box(x + Math.cos(ang) * (tierR + 0.02), z + Math.sin(ang) * (tierR + 0.02), curY, curY + tierH, 0.3, 0.3, ang, PAL.brickDark);
      S.box(x + Math.cos(faceAng) * (apothem + 0.03), z + Math.sin(faceAng) * (apothem + 0.03), curY + 0.5, curY + tierH * 0.72, tierR * 0.32, 0.06, faceAng + Math.PI / 2, k % 2 ? PAL.brickDark : hex('#3b2a22'));
    }
    const eaveY = curY + tierH;
    S.kind = KIND.TILE;
    S.prism(oct(tierR + 1.15), eaveY - 0.12, eaveY + 0.5, PAL.tileDark, PAL.tile, { scaleTop: (tierR + 0.35) / (tierR + 1.15), centre: [x, z], top: false });
    S.kind = KIND.PLAIN;
    S.prism(oct(tierR + 1.15), eaveY - 0.3, eaveY - 0.12, PAL.rail, PAL.rail, { top: false });
    for (let k = 0; k < 8; k += 2) {
      const ang = Math.PI / 8 + HALL_ANG + (k * Math.PI) / 4;
      lamp(x + Math.cos(ang) * (tierR + 1.2), eaveY - 0.2, z + Math.sin(ang) * (tierR + 1.2), [1, 0.86, 0.6]);
    }
    curY = eaveY + 0.5;
    if (i < 6) {
      const nextR = radiusOf(i + 1);
      S.prism(oct(nextR + 0.55), curY - 0.05, curY + 0.08, PAL.rail, PAL.rail);
      S.prism(oct(nextR + 0.55), curY + 0.08, curY + 0.75, PAL.rail, PAL.rail, { holes: [oct(nextR + 0.42)], top: true });
    }
  }
  S.kind = KIND.TILE;
  S.prism(oct(radiusOf(6) + 0.6), curY - 0.1, curY + 1.4, PAL.tile, PAL.tile, { scaleTop: 0.12, centre: [x, z] });
  S.kind = KIND.PLAIN;
  curY += 1.3;
  S.cyl(x, z, curY, curY + 0.5, 0.55, 0.45, 8, PAL.rail);
  S.cyl(x, z, curY + 0.5, curY + 1.1, 0.45, 0.6, 8, PAL.gold);
  S.cyl(x, z, curY + 1.1, curY + 3.4, 0.22, 0.04, 6, PAL.gold);
  for (let k = 0; k < 4; k++) S.cyl(x, z, curY + 1.4 + k * 0.42, curY + 1.55 + k * 0.42, 0.34 - k * 0.05, 0.34 - k * 0.05, 6, PAL.gold);
}

function buildTamQuan(S, centerU, v, y0, lamp, lightBuf) {
  const piers = [[-6.2, 0.8, 4.6], [-2.65, 0.95, 6.4], [2.65, 0.95, 6.4], [6.2, 0.8, 4.6]];
  for (const [u, pierW, pierH] of piers) {
    const pt = toWorld(centerU + u, v);
    S.kind = KIND.MASONRY;
    S.box(pt[0], pt[1], y0, y0 + pierH, pierW, 1.1, HALL_ANG, PAL.pier, { top: PAL.pier });
    S.kind = KIND.PLAIN;
    for (const side of [-1, 1]) {
      const edgePt = toWorld(centerU + u + side * (pierW / 2 - 0.08), v + 0.56);
      S.box(edgePt[0], edgePt[1], y0, y0 + pierH, 0.16, 0.04, HALL_ANG, PAL.ochre);
    }
    S.box(pt[0], pt[1], y0, y0 + 0.45, pierW + 0.15, 1.25, HALL_ANG, PAL.ochre);
  }
  S.kind = KIND.PLAIN;
  const mid = toWorld(centerU, v);
  S.box(mid[0], mid[1], y0 + 5.0, y0 + 6.4, 6.2, 0.8, HALL_ANG, PAL.pier);
  for (const side of [-1, 1]) {
    const boardPt = toWorld(centerU, v + side * 0.42);
    S.box(boardPt[0], boardPt[1], y0 + 5.15, y0 + 6.15, 4.2, 0.05, HALL_ANG, PAL.board);
    const textPt = toWorld(centerU, v + side * 0.45);
    S.box(textPt[0], textPt[1], y0 + 5.5, y0 + 5.8, 3.2, 0.03, HALL_ANG, PAL.letters);
  }
  for (const side of [-1, 1]) {
    const lintelPt = toWorld(centerU + side * 4.42, v);
    S.box(lintelPt[0], lintelPt[1], y0 + 3.4, y0 + 4.6, 2.75, 0.75, HALL_ANG, PAL.pier);
    for (const faceSide of [-1, 1]) {
      const fretPt = toWorld(centerU + side * 4.42, v + faceSide * 0.39);
      S.box(fretPt[0], fretPt[1], y0 + 3.6, y0 + 4.4, 1.6, 0.04, HALL_ANG, PAL.fret);
    }
  }
  S.kind = KIND.TIMBER;
  const roofOpts = { fascia: 0.18, fasciaCol: PAL.tileDark, ridgeCol: PAL.ceramic, hips: true, segs: 3 };
  S.hip(mid[0], mid[1], 6.6, 1.6, HALL_ANG, y0 + 6.4, 1.0, PAL.tile, { flare: 0.3, over: 0.7, ...roofOpts });
  for (const side of [-1, 1]) {
    const sidePt = toWorld(centerU + side * 4.6, v);
    S.hip(sidePt[0], sidePt[1], 3.6, 1.4, HALL_ANG, y0 + 4.6, 0.8, PAL.tile, { flare: 0.25, over: 0.6, ...roofOpts });
  }
  S.kind = KIND.PLAIN;
  for (const side of [-1, 1]) {
    for (const u of [-2.6, -1.3, 0, 1.3, 2.6]) {
      const ptA = toWorld(centerU + u, v + side * 0.4), ptB = toWorld(centerU + u, v + side * 1.1);
      S.beam([ptA[0], y0 + 6.0, ptA[1]], [ptB[0], y0 + 6.42, ptB[1]], 0.14, 0.16, PAL.tileDark);
    }
  }
  S.box(mid[0], mid[1], y0 + 7.4, y0 + 8.2, 0.7, 0.12, HALL_ANG, PAL.ceramic);
  leaves(S, toWorld(centerU - 2.17, v), toWorld(centerU + 2.17, v), y0, 3.4, PAL.iron);
  for (const side of [-1, 1]) leaves(S, toWorld(centerU + side * 3.13, v), toWorld(centerU + side * 5.8, v), y0, 2.6, PAL.iron);
  for (const [u] of piers) { const pt = toWorld(centerU + u, v + 0.7); lamp(pt[0], y0 + 4.2, pt[1], [1, 0.82, 0.5]); }
  const stripA = toWorld(centerU - 2.1, v + 0.5), stripB = toWorld(centerU + 2.1, v + 0.5);
  lightBuf.beam([stripA[0], y0 + 5.05, stripA[1]], [stripB[0], y0 + 5.05, stripB[1]], 0.1, 0.08, [1, 1, 1]);
}

function buildRubbleFace(S, ring, yAt) {
  let twiceArea = 0;
  for (let i = 0; i < ring.length; i++) {
    const ptA = ring[i], ptB = ring[(i + 1) % ring.length];
    twiceArea += ptA[0] * ptB[1] - ptB[0] * ptA[1];
  }
  const outSign = twiceArea > 0 ? -1 : 1;
  const hash2 = (a, b) => { const val = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return val - Math.floor(val); };
  S.kind = KIND.PLAIN;
  let rowSeed = 0;
  for (let i = 0; i < ring.length; i++) {
    const ptA = ring[i], ptB = ring[(i + 1) % ring.length], len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
    if (len < 0.5) continue;
    const dx = (ptB[0] - ptA[0]) / len, dz = (ptB[1] - ptA[1]) / len;
    const nx = -dz * outSign, nz = dx * outSign, hint = [nx, 0, nz];
    const facePt = (dist, y): [number, number, number] => [ptA[0] + dx * dist + nx * 0.03, y, ptA[1] + dz * dist + nz * 0.03];
    const spanAt = (dist) => { const x = ptA[0] + dx * dist, z = ptA[1] + dz * dist; return [LAND_Y + rise(x, z) - 0.1, yAt(x - nx * 0.6, z - nz * 0.6) - 0.02]; };
    let lo = Infinity, hi = -Infinity;
    for (let dist = 0; dist <= len; dist += 1) { const [g, y] = spanAt(dist); lo = Math.min(lo, g); hi = Math.max(hi, y); }
    const courseH = 0.36;
    for (let row = 0; lo + row * courseH < hi; row++, rowSeed++) {
      for (let cursor = 0, colIdx = 0; cursor < len; colIdx++) {
        const stoneLen = 0.3 + hash2(rowSeed, colIdx) * 0.55, nextCursor = Math.min(len, cursor + stoneLen);
        const [g, y] = spanAt((cursor + nextCursor) / 2);
        const y0 = Math.max(g, lo + row * courseH + 0.03 + hash2(colIdx, rowSeed) * 0.09);
        const y1 = Math.min(y, lo + (row + 1) * courseH - 0.03 - hash2(rowSeed + 3, colIdx) * 0.09);
        if (nextCursor - cursor > 0.14 && y1 - y0 > 0.08) {
          const tone = hash2(rowSeed * 5 + 1, colIdx);
          const col = shade(tone > 0.55 ? PAL.rubble2 : PAL.rubble, 0.7 + hash2(colIdx * 3, rowSeed) * 0.6);
          const pad0 = 0.04 + hash2(colIdx, rowSeed + 9) * 0.05, pad1 = 0.04 + hash2(colIdx + 9, rowSeed) * 0.05;
          S.quad(facePt(cursor + pad0, y0), facePt(nextCursor - pad1, y0 + (hash2(rowSeed, colIdx + 5) - 0.5) * 0.06), facePt(nextCursor - pad1 * 0.5, y1), facePt(cursor + pad0 * 0.5, y1 + (hash2(rowSeed + 5, colIdx) - 0.5) * 0.06), col, hint);
        }
        cursor = nextCursor;
      }
    }
  }
}

function buildSoffit(S, center, width, depth, ang, y, over) {
  S.kind = KIND.PLAIN;
  S.box(center[0], center[1], y - 0.12, y - 0.02, width + 2 * over - 0.2, depth + 2 * over - 0.2, ang, PAL.soffit, { bottom: true });
}

function buildEastGallery(S, ring, yardY, lowY, lamp) {
  const uv = ring.map((pt) => toLocal(pt[0], pt[1]));
  const u0 = Math.min(...uv.map((pt) => pt[0])), u1 = Math.max(...uv.map((pt) => pt[0]));
  const v0 = Math.min(...uv.map((pt) => pt[1])), v1 = Math.max(...uv.map((pt) => pt[1]));
  const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2, width = u1 - u0, depth = v1 - v0;
  const center = toWorld(cu, cv);
  const floor = yardY + 0.5, yMid = floor + 3.8, yEave = yMid + 3.6, balcW = 1.7;

  S.kind = KIND.MASONRY;
  S.box(center[0], center[1], lowY - 0.1, floor, width, depth, HALL_ANG, PAL.granite, { top: PAL.step, topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;
  const coreU = cu + balcW / 2, faceU = u0 + balcW;
  S.box(...toWorld(coreU, cv), floor, yEave, width - balcW, depth, HALL_ANG, PAL.wall, { top: PAL.tileDark });

  for (let i = 0; i < 10; i++) {
    const v = v0 + 0.6 + ((depth - 1.2) * (i + 0.5)) / 10;
    const frontPt = toWorld(faceU - 0.03, v);
    S.box(frontPt[0], frontPt[1], floor, floor + 2.5, 0.06, 1.3, HALL_ANG, PAL.door);
    S.box(frontPt[0], frontPt[1], floor + 2.7, floor + 3.3, 0.06, 1.3, HALL_ANG, PAL.panel);
    S.box(frontPt[0], frontPt[1], yMid + 0.5, yMid + 2.8, 0.06, 1.2, HALL_ANG, PAL.door);
    const backPt = toWorld(u1 + 0.03, v);
    for (const winY of [floor + 1.0, yMid + 0.9]) S.box(backPt[0], backPt[1], winY, winY + 1.5, 0.06, 1.2, HALL_ANG, PAL.door);
    if (i % 3 === 1) { const lampPt = toWorld(faceU - 0.6, v); lamp(lampPt[0], yMid - 0.4, lampPt[1], [1, 0.8, 0.5]); }
  }
  for (const sideV of [-1, 1]) {
    for (const du of [-4, 0, 4]) {
      const endPt = toWorld(coreU + (du * (width - balcW)) / 12, cv + sideV * (depth / 2 + 0.03));
      for (const winY of [floor + 1.0, yMid + 0.9]) S.box(endPt[0], endPt[1], winY, winY + 1.5, 1.2, 0.06, HALL_ANG, PAL.door);
    }
  }
  const slabPt = toWorld(u0 + balcW / 2, cv);
  S.box(slabPt[0], slabPt[1], yMid - 0.22, yMid, balcW, depth, HALL_ANG, PAL.wallLight, { bottom: true });
  const railA = toWorld(u0 + 0.1, v0), railB = toWorld(u0 + 0.1, v1);
  S.beam([railA[0], yMid + 0.5, railA[1]], [railB[0], yMid + 0.5, railB[1]], 0.12, 1.0, PAL.rail);
  for (let i = 0; i <= 12; i++) {
    const colPt = toWorld(u0 + 0.15, v0 + 0.2 + ((depth - 0.4) * i) / 12);
    S.cyl(colPt[0], colPt[1], floor, yEave, 0.17, 0.15, 6, PAL.column, { cap: false, rot: HALL_ANG });
  }
  const e0 = toWorld(faceU, v0), e1 = toWorld(faceU, v1), e2 = toWorld(u0 - 0.6, v1), e3 = toWorld(u0 - 0.6, v0);
  S.kind = KIND.TILE;
  S.quad([e0[0], yMid - 0.3, e0[1]], [e1[0], yMid - 0.3, e1[1]], [e2[0], yMid - 1.0, e2[1]], [e3[0], yMid - 1.0, e3[1]], PAL.tile, [0, 1, 0]);
  S.quad([e0[0], yMid - 0.34, e0[1]], [e1[0], yMid - 0.34, e1[1]], [e2[0], yMid - 1.04, e2[1]], [e3[0], yMid - 1.04, e3[1]], PAL.tileDark, [0, -1, 0]);
  buildSoffit(S, center, width, depth, HALL_ANG, yEave, 1.0);
  S.hip(center[0], center[1], depth, width, HALL_ANG + Math.PI / 2, yEave, 3.0, PAL.tile, { ...EAVE_STYLE, over: 1.0, fasciaCol: PAL.tileDark, ridgeCol: PAL.crest });
  return { floor, yS: yMid, yE: yEave, u0, u1, v1 };
}

function buildSouthPorch(S, lowY, galleryInfo, lamp) {
  const { floor, yS, yE, v1 } = galleryInfo, pu0 = 25.4, pu1 = 33.4, pv1 = 49.0, centerU = (pu0 + pu1) / 2;
  S.kind = KIND.MASONRY;
  const basePt = toWorld(centerU, (v1 + pv1) / 2);
  S.box(basePt[0], basePt[1], lowY - 0.1, floor, pu1 - pu0, pv1 - v1, HALL_ANG, PAL.granite, { top: PAL.step, topKind: KIND.ROAD });

  const drop = floor - lowY, steps = Math.max(2, Math.ceil(drop / 0.18)), stepH = drop / steps, tread = 0.27, stairW = 5.0;
  for (let k = 1; k <= steps; k++) {
    const pt = toWorld(centerU, pv1 + tread * (k - 0.5));
    S.box(pt[0], pt[1], lowY - 0.1, floor - stepH * k + 0.001, stairW, tread, HALL_ANG, PAL.step, { topKind: KIND.ROAD });
  }
  S.kind = KIND.PLAIN;
  for (const side of [-1, 1]) {
    const ptA = toWorld(centerU + side * (stairW / 2 + 0.2), pv1), ptB = toWorld(centerU + side * (stairW / 2 + 0.2), pv1 + tread * steps);
    S.beam([ptA[0], floor + 0.3, ptA[1]], [ptB[0], lowY + 0.3, ptB[1]], 0.4, 1.0, PAL.wallLight);
    S.beam([ptA[0], floor + 0.84, ptA[1]], [ptB[0], lowY + 0.84, ptB[1]], 0.5, 0.08, PAL.coping);
  }
  for (const u of [pu0 + 0.3, centerU - 1.4, centerU + 1.4, pu1 - 0.3]) {
    const colPt = toWorld(u, pv1 - 0.3);
    S.cyl(colPt[0], colPt[1], floor, yE - 0.1, 0.2, 0.18, 6, PAL.column, { cap: false, rot: HALL_ANG });
  }
  S.box(basePt[0], basePt[1], yS - 0.22, yS, pu1 - pu0, pv1 - v1, HALL_ANG, PAL.wallLight, { bottom: true });
  const railA = toWorld(pu0, pv1 - 0.15), railB = toWorld(pu1, pv1 - 0.15);
  S.beam([railA[0], yS + 0.5, railA[1]], [railB[0], yS + 0.5, railB[1]], 0.12, 1.0, PAL.rail);

  const e0 = toWorld(pu0 - 0.4, pv1 - 0.1), e1 = toWorld(pu1 + 0.4, pv1 - 0.1), e2 = toWorld(pu1 + 0.4, pv1 + 0.8), e3 = toWorld(pu0 - 0.4, pv1 + 0.8);
  S.kind = KIND.TILE;
  S.quad([e0[0], yS - 0.3, e0[1]], [e1[0], yS - 0.3, e1[1]], [e2[0], yS - 0.8, e2[1]], [e3[0], yS - 0.8, e3[1]], PAL.tile, [0, 1, 0]);
  S.quad([e0[0], yS - 0.34, e0[1]], [e1[0], yS - 0.34, e1[1]], [e2[0], yS - 0.84, e2[1]], [e3[0], yS - 0.84, e3[1]], PAL.tileDark, [0, -1, 0]);
  const roofPt = toWorld(centerU, (v1 + pv1) / 2 + 0.2);
  S.hip(roofPt[0], roofPt[1], pu1 - pu0 + 0.4, pv1 - v1 + 0.8, HALL_ANG, yE - 0.5, 1.4, PAL.tile, { ...EAVE_STYLE, over: 0.6, fascia: 0.22, fasciaCol: PAL.tileDark, ridgeCol: PAL.crest });
  S.kind = KIND.PLAIN;
  const lampPt = toWorld(centerU, pv1 - 0.5);
  lamp(lampPt[0], yS - 0.5, lampPt[1], [1, 0.8, 0.5]);
}

function buildSideGate(S, lowY, streetY, lamp) {
  const [gateU, gateV] = SIDE_GATE;
  S.kind = KIND.PLAIN;
  const rampOut = toWorld(gateU, gateV + 1.3), rampIn = toWorld(gateU, gateV);
  S.beam([rampOut[0], streetY - 0.15, rampOut[1]], [rampIn[0], lowY - 0.15, rampIn[1]], 5.2, 0.3, PAL.pave);
  for (const side of [-1, 1]) {
    const u = gateU + side * 3.25, pt = toWorld(u, gateV), pierH = 3.6;
    S.box(pt[0], pt[1], lowY - 0.4, lowY + pierH, 0.95, 0.95, HALL_ANG, PAL.fenceWall, { top: PAL.wallLight });
    for (const [du, dv, ang] of ([[0, 0.5, HALL_ANG], [0, -0.5, HALL_ANG], [0.5, 0, HALL_ANG + Math.PI / 2], [-0.5, 0, HALL_ANG + Math.PI / 2]] as [number, number, number][])) {
      const panPt = toWorld(u + du, gateV + dv);
      S.box(panPt[0], panPt[1], lowY + 0.6, lowY + pierH - 0.7, 0.55, 0.04, ang, PAL.wallLight);
    }
    S.box(pt[0], pt[1], lowY + pierH, lowY + pierH + 0.18, 1.15, 1.15, HALL_ANG, PAL.coping);
    S.box(pt[0], pt[1], lowY + pierH + 0.18, lowY + pierH + 0.65, 0.5, 0.5, HALL_ANG, PAL.lantern);
    S.cyl(pt[0], pt[1], lowY + pierH + 0.65, lowY + pierH + 0.95, 0.45, 0.05, 4, PAL.coping, { rot: HALL_ANG + Math.PI / 4 });
    lamp(pt[0], lowY + pierH + 0.42, pt[1], [1, 0.86, 0.6]);
    leaves(S, toWorld(u - side * 0.5, gateV - 0.1), toWorld(u - side * 0.5, gateV - 2.6), lowY, 2.4, PAL.iron);
  }
}

function buildMonasteryBlock(S, ring, y0, storeys, storeyH) {
  const rect = obb(ring), ux = Math.cos(rect.a), uz = Math.sin(rect.a);
  const ptAt = (u, v): [number, number] => [rect.c[0] + u * ux - v * uz, rect.c[1] + u * uz + v * ux];
  S.kind = KIND.MASONRY;
  S.box(rect.c[0], rect.c[1], y0 - 0.1, y0 + 0.4, rect.w + 0.4, rect.d + 0.4, rect.a, PAL.granite, { topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;
  const topY = y0 + 0.4 + storeys * storeyH;
  S.box(rect.c[0], rect.c[1], y0 + 0.4, topY, rect.w, rect.d, rect.a, PAL.wall, { top: PAL.tileDark });
  const winCount = Math.max(2, Math.round(rect.w / 3.2));
  for (let floor = 0; floor < storeys; floor++) {
    for (let i = 0; i < winCount; i++) {
      for (const side of [-1, 1]) {
        const pt = ptAt(-rect.w / 2 + (rect.w * (i + 0.5)) / winCount, side * (rect.d / 2 + 0.03));
        S.box(pt[0], pt[1], y0 + 0.4 + floor * storeyH + 0.9, y0 + 0.4 + floor * storeyH + 2.4, 1.1, 0.06, rect.a, PAL.door);
      }
    }
  }
  buildSoffit(S, rect.c, rect.w, rect.d, rect.a, topY, 0.9);
  S.hip(rect.c[0], rect.c[1], rect.w, rect.d, rect.a, topY, Math.min(2.6, rect.d * 0.25), PAL.tile, { ...EAVE_STYLE, flare: 0.15, over: 0.9, fascia: 0.25, fasciaCol: PAL.tileDark, ridgeCol: PAL.tileDark });
}

function buildEastAnnex(S, ring, y0) {
  const rect = obb(ring), ux = Math.cos(rect.a), uz = Math.sin(rect.a);
  const ptAt = (u, v): [number, number] => [rect.c[0] + u * ux - v * uz, rect.c[1] + u * uz + v * ux];
  const eastSign = ux > 0 ? 1 : -1;
  const width = rect.w, depth = rect.d, storeyH = 3.3, plinthH = 0.3, y1 = y0 + plinthH + storeyH, topY = y1 + storeyH, loggiaD = 1.8;

  S.kind = KIND.MASONRY;
  S.box(rect.c[0], rect.c[1], y0 - 0.3, y0 + plinthH, width, depth, rect.a, PAL.granite, { topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;
  S.box(rect.c[0], rect.c[1], y0 + plinthH, y1, width, depth, rect.a, PAL.wall, { top: PAL.wallLight });
  const upperPt = ptAt((-eastSign * loggiaD) / 2, 0);
  S.box(upperPt[0], upperPt[1], y1, topY, width - loggiaD, depth, rect.a, PAL.wall, { top: PAL.tileDark });

  for (const v of [-depth / 2 + 0.3, -depth / 6, depth / 6, depth / 2 - 0.3]) {
    const colPt = ptAt(eastSign * (width / 2 - 0.3), v);
    S.cyl(colPt[0], colPt[1], y1, topY, 0.2, 0.18, 6, PAL.wallLight, { cap: false, rot: rect.a });
  }
  const railA = ptAt(eastSign * (width / 2 - 0.2), -depth / 2), railB = ptAt(eastSign * (width / 2 - 0.2), depth / 2);
  S.beam([railA[0], y1 + 0.5, railA[1]], [railB[0], y1 + 0.5, railB[1]], 0.14, 1.0, PAL.rail);
  S.beam([railA[0], y1 + 1.04, railA[1]], [railB[0], y1 + 1.04, railB[1]], 0.24, 0.08, PAL.coping);
  for (const v of [-depth / 4, depth / 4]) {
    const doorPt = ptAt(eastSign * (width / 2 - loggiaD - 0.03), v);
    S.box(doorPt[0], doorPt[1], y1 + 0.2, y1 + 2.6, 0.06, 1.4, rect.a + Math.PI / 2, PAL.door);
  }
  const ventPt = ptAt(eastSign * (width / 2 + 0.03), 0);
  S.box(ventPt[0], ventPt[1], y0 + plinthH + 1.0, y0 + plinthH + 2.6, 0.06, 2.2, rect.a, PAL.fret);
  const barPt = ptAt(eastSign * (width / 2 + 0.05), 0);
  for (let i = -2; i <= 2; i++) {
    const pt = ptAt(eastSign * (width / 2 + 0.05), i * 0.4);
    S.box(pt[0], pt[1], y0 + plinthH + 1.05, y0 + plinthH + 2.55, 0.04, 0.06, rect.a, PAL.fretCut);
  }
  S.box(barPt[0], barPt[1], y0 + plinthH + 1.78, y0 + plinthH + 1.82, 0.04, 2.1, rect.a, PAL.fretCut);
  for (const v of [-depth / 2 + 1.6, depth / 2 - 1.6]) {
    const winPt = ptAt(eastSign * (width / 2 + 0.03), v);
    S.box(winPt[0], winPt[1], y0 + plinthH + 1.0, y0 + plinthH + 2.5, 0.06, 1.1, rect.a, PAL.door);
  }

  const winCount = Math.max(2, Math.round(width / 3.2));
  for (let floor = 0; floor < 2; floor++) {
    for (let i = 0; i < winCount; i++) {
      for (const side of [-1, 1]) {
        const u = -width / 2 + (width * (i + 0.5)) / winCount;
        if (floor === 1 && eastSign * u > width / 2 - loggiaD - 0.8) continue;
        const pt = ptAt(u, side * (depth / 2 + 0.03));
        S.box(pt[0], pt[1], y0 + plinthH + floor * storeyH + 0.9, y0 + plinthH + floor * storeyH + 2.4, 1.1, 0.06, rect.a, PAL.door);
      }
    }
  }
  buildSoffit(S, rect.c, width, depth, rect.a, topY, 0.7);
  S.hip(rect.c[0], rect.c[1], width, depth, rect.a, topY, Math.min(2.2, depth * 0.22), PAL.tile, { ...EAVE_STYLE, flare: 0.1, over: 0.7, fascia: 0.22, fasciaCol: PAL.tileDark, ridgeCol: PAL.tileDark, hips: false });
}

function buildPrecinctWall(S, ring, yAt, gates, lamp) {
  const wallH = 0.95, bayTarget = 3.4;
  const inGate = (x, z) => gates.some(([g0, g1]) => {
    const ax = g1[0] - g0[0], az = g1[1] - g0[1], lenSq = ax * ax + az * az;
    const param = ((x - g0[0]) * ax + (z - g0[1]) * az) / lenSq;
    return param > 0 && param < 1 && Math.hypot(x - (g0[0] + ax * param), z - (g0[1] + az * param)) < 2.5;
  });
  let postIdx = 0;
  for (let i = 0; i < ring.length; i++) {
    const ptA = ring[i], ptB = ring[(i + 1) % ring.length], len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
    if (len < 0.5) continue;
    const ang = Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]), bays = Math.max(1, Math.round(len / bayTarget));
    const ca = Math.cos(ang), sa = Math.sin(ang);
    for (let j = 0; j < bays; j++) {
      const bayA = [ptA[0] + ((ptB[0] - ptA[0]) * j) / bays, ptA[1] + ((ptB[1] - ptA[1]) * j) / bays];
      const bayB = [ptA[0] + ((ptB[0] - ptA[0]) * (j + 1)) / bays, ptA[1] + ((ptB[1] - ptA[1]) * (j + 1)) / bays];
      const mx = (bayA[0] + bayB[0]) / 2, mz = (bayA[1] + bayB[1]) / 2, bayLen = len / bays;
      const y0 = yAt(mx, mz);
      if (!inGate(mx, mz)) {
        S.kind = KIND.MASONRY;
        S.box(mx, mz, y0 - 0.05, y0 + 0.15, bayLen, 0.32, ang, PAL.fenceWall);
        S.kind = KIND.PLAIN;
        S.box(mx, mz, y0 + 0.15, y0 + 0.74, bayLen - 0.4, 0.1, ang, PAL.fret);
        const fretW = bayLen - 0.4, motifCount = Math.max(1, Math.round(fretW / 0.55)), motifW = fretW / motifCount, midY = y0 + 0.445, halfBar = 0.035;
        for (const side of [-1, 1]) {
          const nx = -sa * side * 0.056, nz = ca * side * 0.056, hint = [-sa * side, 0, ca * side];
          const fretQuad = (u0, u1, ya, yb) => {
            const pt3 = (u, y): [number, number, number] => [mx + u * ca + nx, y, mz + u * sa + nz];
            S.quad(pt3(u0, ya), pt3(u1, ya), pt3(u1, yb), pt3(u0, yb), PAL.fretCut, hint);
          };
          fretQuad(-fretW / 2 + 0.03, fretW / 2 - 0.03, midY - halfBar, midY + halfBar);
          for (let m = 0; m < motifCount; m++) {
            const centerU = -fretW / 2 + motifW * (m + 0.5), dirSign = m % 2 ? -1 : 1, endY = midY + dirSign * 0.2;
            fretQuad(centerU - halfBar, centerU + halfBar, Math.min(midY, endY), Math.max(midY, endY));
            fretQuad(centerU - halfBar, centerU + motifW * 0.3, Math.min(endY, endY - dirSign * 2 * halfBar), Math.max(endY, endY - dirSign * 2 * halfBar));
            fretQuad(centerU + motifW * 0.3 - 2 * halfBar, centerU + motifW * 0.3, Math.min(endY, endY - dirSign * 0.11), Math.max(endY, endY - dirSign * 0.11));
          }
        }
        S.box(mx, mz, y0 + 0.74, y0 + wallH - 0.1, bayLen, 0.26, ang, PAL.fenceWall);
        S.box(mx, mz, y0 + wallH - 0.1, y0 + wallH, bayLen + 0.05, 0.4, ang, PAL.coping, { top: PAL.coping });
      }
      if (!inGate(bayA[0], bayA[1])) {
        const ya = yAt(bayA[0] - ca * 0.6, bayA[1] - sa * 0.6), yb = yAt(bayA[0] + ca * 0.6, bayA[1] + sa * 0.6);
        const lo = Math.min(ya, yb), hi = Math.max(ya, yb);
        S.kind = KIND.MASONRY;
        S.box(bayA[0], bayA[1], lo - 0.05, hi + wallH + 0.25, 0.44, 0.44, ang, PAL.fenceWall, { top: PAL.wallLight });
        S.kind = KIND.PLAIN;
        S.box(bayA[0], bayA[1], hi + wallH + 0.15, hi + wallH + 0.3, 0.52, 0.52, ang, PAL.wallLight);
        S.cyl(bayA[0], bayA[1], hi + wallH + 0.3, hi + wallH + 0.4, 0.09, 0.07, 6, PAL.wallLight, { cap: false });
        S.cyl(bayA[0], bayA[1], hi + wallH + 0.4, hi + wallH + 0.53, 0.07, 0.15, 8, PAL.wallLight, { cap: false });
        S.cyl(bayA[0], bayA[1], hi + wallH + 0.53, hi + wallH + 0.68, 0.15, 0.03, 8, PAL.wallLight);
        if (postIdx++ % 4 === 0) lamp(bayA[0], hi + wallH + 0.5, bayA[1], [1, 0.84, 0.58]);
      }
    }
  }
}
