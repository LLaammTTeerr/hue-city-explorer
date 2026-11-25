import { KIND, hex, shade, obb, unflat, inRing } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { waterY } from '../../geo/terrain.ts';
import { TOMB_COL, gY, groundSpan, rectPts, terrace, levelTop, pav, hallAt, flight, wallLine, gate, bridge, statueCourt } from '../tombs.ts';

// ---- Lăng Minh Mạng (Hiếu Lăng), built 1840–43 on Cẩm Kê hill ----
// Sources: docs/places/minhmang.md.
export const id = 'minhmang';

const SITE_OFFSET = [0, -2.9];
const shiftPt = (pt): [number, number] => [pt[0] + SITE_OFFSET[0], pt[1] + SITE_OFFSET[1]];
const DAI_HONG_MON = shiftPt([-1936.5, 9005]);
const AXIS_AIM = shiftPt([-2312, 8960]);
const TRU_BIEU = [[-2207, 8937], [-2216, 9014]].map(shiftPt);
const NECK = { s0: 216.5, s1: 239.5, t0: -21, t1: 19 };
const TAN_NGUYET_BRIDGE = [[300.5, -2.06], [358.2, -3.55]];

const COLORS = {
  lacquer: PAL.lacquer || TOMB_COL.lacquer,
  tile: hex('#c28f3e'),
  ridge: hex('#e2ca7c'),
  wall: hex('#7d7465'),
  wallDark: hex('#625b4f'),
  stucco: hex('#cfc6b0'),
  biBrick: hex('#7a7166'),
  biRoof: hex('#9d6236'),
  sideRoof: hex('#5f5c57'),
  steleWall: hex('#dcc272'),
  brickCourt: hex('#a37a62'),
  pine: hex('#355230'),
  moss: hex('#4f6a3e'),
};

function makeFrame(origin, target) {
  const len = Math.hypot(target[0] - origin[0], target[1] - origin[1]);
  const ux = (target[0] - origin[0]) / len, uz = (target[1] - origin[1]) / len;
  return {
    ux, uz,
    ang: Math.atan2(uz, ux),
    angPerp: Math.atan2(ux, -uz),
    at: (s, t = 0) => [origin[0] + ux * s - uz * t, origin[1] + uz * s + ux * t],
    sOf: (pt) => (pt[0] - origin[0]) * ux + (pt[1] - origin[1]) * uz,
  };
}

const ownedRoadsCache = new WeakMap();
export function ownRoads(data) {
  if (ownedRoadsCache.has(data)) return ownedRoadsCache.get(data);
  const out = new Set();
  ownedRoadsCache.set(data, out);
  const axis = makeFrame(DAI_HONG_MON, AXIS_AIM);
  const bridgeMids = [axis.at(228, 0), axis.at(330, 0)];
  const rings = (data.bridges || []).map((b) => unflat(b.ring)).filter((ring) => {
    const center = ring.reduce((acc, pt) => [acc[0] + pt[0] / ring.length, acc[1] + pt[1] / ring.length], [0, 0]);
    return bridgeMids.some((mid) => Math.hypot(center[0] - mid[0], center[1] - mid[1]) < 40);
  });
  for (const road of data.roads || []) {
    if (!Array.isArray(road) || !road[1] || !Array.isArray(road[2]) || road[2].length < 4) continue;
    const pts = unflat(road[2]), first = pts[0], last = pts[pts.length - 1];
    if (rings.some((ring) => inRing((first[0] + last[0]) / 2, (first[1] + last[1]) / 2, ring))) out.add(road[2]);
  }
  return out;
}

function buildFrontGateAndBaiDinh(S, axis, box, hip, markPaved) {
  const { lo, hi } = groundSpan(rectPts(DAI_HONG_MON[0], DAI_HONG_MON[1], 13, 6, axis.ang));
  const gateY = hi;
  S.kind = KIND.MASONRY;
  S.base = gateY - LAND_Y;
  box(0, 0, lo - 0.8, gateY + 5.0, 5.2, 4.4, TOMB_COL.brickMoss, { top: shade(TOMB_COL.brickMoss, 0.9) });
  for (const side of [-1, 1]) box(0, side * 4.1, lo - 0.8, gateY + 4.0, 5.0, 3.6, shade(TOMB_COL.brickMoss, 1.04), { top: shade(TOMB_COL.brickMoss, 0.9) });
  S.kind = KIND.PLAIN;
  box(0, 0, gateY, gateY + 3.4, 4.6, 2.4, TOMB_COL.door);
  for (const side of [-1, 1]) box(0, side * 4.1, gateY, gateY + 2.8, 3.6, 2.0, TOMB_COL.door);
  for (const side of [-1, 1]) {
    hip(0, side * 4.1, 3.8, 4.4, gateY + 4.0, 1.1, COLORS.tile);
    hip(0, side * 4.6, 2.2, 3.0, gateY + 5.15, 0.8, COLORS.tile, { over: 0.4 });
  }
  hip(0, 0, 5.8, 5.4, gateY + 5.0, 1.0, COLORS.tile);
  S.kind = KIND.TIMBER;
  S.base = gateY + 5.6 - LAND_Y;
  box(0, 0, gateY + 5.6, gateY + 7.0, 2.6, 3.2, COLORS.lacquer);
  hip(0, 0, 4.2, 4.4, gateY + 7.0, 0.8, COLORS.tile);
  box(0, 0, gateY + 7.4, gateY + 8.1, 1.8, 2.2, COLORS.lacquer);
  hip(0, 0, 3.0, 3.2, gateY + 8.1, 1.15, COLORS.tile, { over: 0.5 });
  S.kind = KIND.PLAIN;

  for (const side of [-1, 1]) {
    wallLine(S, [axis.at(1, side * 8.6), axis.at(1, side * 23)], 3.0, 1.0, { closed: false, col: COLORS.wall });
    const sideGate = axis.at(1, side * 26);
    gate(S, sideGate[0], sideGate[1], axis.angPerp, 5.6, 3.4, { h: 4.2, openings: 1, col: COLORS.wall, roof: COLORS.tile, rh: 1.3 });
    wallLine(S, [axis.at(1, side * 29), axis.at(1, side * 58)], 3.0, 1.0, { closed: false, col: COLORS.wall });
  }

  markPaved(() => {
    const s0 = 3.5, s1 = 36, mid = axis.at((s0 + s1) / 2, 0);
    const topY = levelTop(mid[0], mid[1], s1 - s0, 45, axis.ang, 0.12);
    terrace(S, mid[0], mid[1], s1 - s0, 45, axis.ang, topY, COLORS.brickCourt);
    S.kind = KIND.MASONRY;
    box((s0 + s1) / 2, 0, topY - 0.2, topY + 0.06, s1 - s0, 4, TOMB_COL.stoneGrey, { topKind: KIND.ROAD });
  });
  statueCourt(S, { ...axis, a: axis.ang, av: axis.angPerp }, 9, 31, { inner: 7, outer: 11.5 });
}

function buildBiDinhAndSanTrieuLe(S, axis, byId, box, markPaved) {
  const biDinh = byId(206627336);
  const center = biDinh ? biDinh.c : axis.at(52.1, 1.6), sCenter = axis.sOf(center);
  const localPt = (ds, dt): [number, number] => [center[0] + axis.ux * ds - axis.uz * dt, center[1] + axis.uz * ds + axis.ux * dt];

  const baseY = levelTop(center[0], center[1], 21.5, 21.5, axis.ang, 0.2);
  const tier1Y = terrace(S, center[0], center[1], 21.5, 21.5, axis.ang, baseY + 1.8, COLORS.biBrick);
  const topY = terrace(S, center[0], center[1], 16, 16, axis.ang, tier1Y + 1.6, shade(COLORS.biBrick, 1.08));

  const drawParapet = (halfW, floorY, gapW) => {
    const col = shade(COLORS.biBrick, 0.92), thick = 0.35, edge = halfW - thick / 2, h = 0.75;
    S.kind = KIND.MASONRY;
    S.base = floorY - LAND_Y;
    for (const side of [-1, 1]) {
      const sidePt = localPt(0, side * edge);
      S.box(sidePt[0], sidePt[1], floorY - 0.05, floorY + h, halfW * 2, thick, axis.ang, col);
      for (const ds of [-edge, edge]) {
        const endPt = localPt(ds, side * (gapW / 2 + halfW) / 2);
        S.box(endPt[0], endPt[1], floorY - 0.05, floorY + h, thick, halfW - gapW / 2 - thick, axis.ang, col);
      }
    }
  };
  drawParapet(10.75, tier1Y, 5.8);
  drawParapet(8, topY, 5.8);
  flight(S, axis.at(sCenter - 10.75 - 4.4), baseY - 0.1, axis.at(sCenter - 8), topY, 5, { rail: 1, dragon: true, railCol: TOMB_COL.stoneGrey });
  flight(S, axis.at(sCenter + 8), topY, axis.at(sCenter + 10.75), tier1Y, 4.4, { rail: 1 });
  flight(S, axis.at(sCenter + 10.75), tier1Y, axis.at(sCenter + 10.75 + 3.6), baseY - 0.1, 4.4);

  const hallW = 9.8, wallH = 4.4, inkCol = hex('#2a231e');
  S.kind = KIND.PLAIN;
  S.base = topY - LAND_Y;
  S.box(center[0], center[1], topY, topY + wallH, hallW, hallW, axis.ang, COLORS.steleWall, { top: shade(COLORS.steleWall, 0.8) });
  S.box(center[0], center[1], topY + wallH - 0.35, topY + wallH, hallW + 0.2, hallW + 0.2, axis.ang, shade(COLORS.steleWall, 0.88));

  const doorW = 3.6, doorH = 3.3, doorPt = localPt(-hallW / 2 - 0.02, 0), framePt = localPt(-hallW / 2 - 0.06, 0);
  S.box(doorPt[0], doorPt[1], topY, topY + doorH, 0.12, doorW, axis.ang, inkCol);
  S.kind = KIND.TIMBER;
  S.box(framePt[0], framePt[1], topY + doorH, topY + doorH + 0.32, 0.16, doorW + 0.5, axis.ang, COLORS.lacquer);
  for (const side of [-1, 1]) {
    const jambPt = localPt(-hallW / 2 - 0.06, side * (doorW / 2 + 0.12));
    S.box(jambPt[0], jambPt[1], topY, topY + doorH, 0.16, 0.24, axis.ang, COLORS.lacquer);
  }
  S.kind = KIND.PLAIN;

  const eaveOpt = { flare: 0.45, hips: true, glazed: true, fascia: 0.5, fasciaCol: shade(COLORS.biRoof, 0.62) };
  S.hip(center[0], center[1], hallW, hallW, axis.angPerp, topY + wallH, 1.5, COLORS.biRoof, { ...eaveOpt, over: 1.4, ridgeCol: null, horns: true });

  const friezeW = 7.0, friezeD = 5.8, f0 = topY + wallH + 0.3, f1 = topY + wallH + 2.0, panelCol = hex('#e6dcbc');
  S.box(center[0], center[1], f0, f1, friezeD, friezeW, axis.ang, COLORS.steleWall, { top: shade(COLORS.steleWall, 0.8) });
  for (const side of [-1, 1]) {
    for (const k of [-1, 0, 1]) {
      const pt = localPt(side * (friezeD / 2 + 0.02), k * 2.1);
      S.box(pt[0], pt[1], f1 - 0.95, f1 - 0.25, 0.05, 1.6, axis.ang, panelCol);
    }
    const sidePt = localPt(0, side * (friezeW / 2 + 0.02));
    S.box(sidePt[0], sidePt[1], f1 - 0.95, f1 - 0.25, 3.8, 0.05, axis.ang, panelCol);
  }
  const ridgeTopY = f1 + 1.9;
  S.hip(center[0], center[1], friezeW, friezeD, axis.angPerp, f1, 1.9, COLORS.biRoof, { ...eaveOpt, over: 1.1, flare: 0.55, ridgeCol: hex('#c8ae74'), horns: true });
  S.kind = KIND.MASONRY;
  S.base = ridgeTopY - LAND_Y;
  S.box(center[0], center[1], ridgeTopY - 0.2, ridgeTopY + 0.3, 0.7, 0.9, axis.ang, hex('#c8ae74'));
  S.cyl(center[0], center[1], ridgeTopY + 0.3, ridgeTopY + 0.95, 0.32, 0.06, 8, hex('#d1b77c'));
  S.box(center[0], center[1], topY, topY + 0.7, 1.6, 2.6, axis.ang, TOMB_COL.stoneDark);
  S.box(center[0], center[1], topY + 0.7, topY + 3.4, 0.5, 1.9, axis.ang, hex('#4a5048'));

  // Sân triều lễ: four rising terraces
  markPaved(() => {
    const s0 = 66, s1 = 126, stepLen = (s1 - s0) / 4, mid = axis.at((s0 + s1) / 2);
    let y = groundSpan(rectPts(mid[0], mid[1], s1 - s0, 38, axis.ang)).hi;
    for (let k = 0; k < 4; k++) {
      const s = s0 + stepLen * (k + 0.5), pt = axis.at(s);
      y += 0.38;
      const levelY = terrace(S, pt[0], pt[1], stepLen + 0.05, 38, axis.ang, Math.max(y, levelTop(pt[0], pt[1], stepLen, 38, axis.ang, 0.1)), COLORS.brickCourt);
      y = levelY;
      S.kind = KIND.MASONRY;
      box(s, 0, levelY - 0.2, levelY + 0.05, stepLen, 3.6, TOMB_COL.stoneGrey, { topKind: KIND.ROAD });
      flight(S, axis.at(s0 + stepLen * k - 0.9), levelY - 0.38, axis.at(s0 + stepLen * k + 0.6), levelY, 3.6);
    }
  });
}

function buildSungAnCourt(S, axis, byId, box, markPaved) {
  const hdm = byId(206627337);
  const sHDM = hdm ? axis.sOf(hdm.c) : 131.1, sSA = 174.7, sHTM = 205.5;
  let courtY = 0;
  markPaved(() => {
    const mid = axis.at((sHDM + sHTM) / 2);
    courtY = terrace(S, mid[0], mid[1], sHTM - sHDM, 61, axis.ang, levelTop(mid[0], mid[1], sHTM - sHDM, 61, axis.ang, 0.15), COLORS.brickCourt);
    S.kind = KIND.MASONRY;
    box((sHDM + sHTM) / 2, 0, courtY - 0.2, courtY + 0.06, sHTM - sHDM, 3.6, TOMB_COL.stoneGrey, { topKind: KIND.ROAD });
  });
  wallLine(S, [axis.at(sHDM, 6.5), axis.at(sHDM, 30), axis.at(sHTM, 30), axis.at(sHTM, 6)], 2.6, 0.8, { closed: false, col: COLORS.wall });
  wallLine(S, [axis.at(sHDM, -6.5), axis.at(sHDM, -30), axis.at(sHTM, -30), axis.at(sHTM, -6)], 2.6, 0.8, { closed: false, col: COLORS.wall });

  const hdmPos = hdm ? hdm.c : axis.at(sHDM);
  S.kind = KIND.MASONRY;
  S.base = courtY - LAND_Y;
  S.box(hdmPos[0], hdmPos[1], courtY - 0.6, courtY + 0.45, 12.6, 8.2, axis.ang, TOMB_COL.stone, { topKind: KIND.ROAD });
  flight(S, axis.at(sHDM - 4.1 - 1.8), courtY - 0.5, axis.at(sHDM - 4.1), courtY + 0.45, 6);
  pav(S, hdmPos[0], hdmPos[1], 10.2, 6.2, axis.angPerp, courtY + 0.45, { tiers: 2, wallH: 3.6, roof: COLORS.tile, wall: COLORS.lacquer, h: 8.6, colonnade: true, over: 0.6 });

  const saCenter = axis.at(sSA), saGround = gY(saCenter[0], saCenter[1]);
  const saW = 23.45, saD = 22.05, floorY = courtY + 0.9;
  S.kind = KIND.MASONRY;
  S.base = courtY - LAND_Y;
  S.box(saCenter[0], saCenter[1], courtY - 0.3, floorY, saW + 2.4, saD + 2.4, axis.ang, TOMB_COL.stone, { topKind: KIND.ROAD });
  flight(S, axis.at(sSA - saD / 2 - 1.2 - 1.6), courtY, axis.at(sSA - saD / 2 - 1.2), floorY, 6, { rail: 1 });
  const frontD = 8.6, mainD = saD - frontD;
  const frontPos = axis.at(sSA - saD / 2 + frontD / 2), mainPos = axis.at(sSA + saD / 2 - mainD / 2);
  pav(S, frontPos[0], frontPos[1], saW, frontD, axis.angPerp, floorY, { wallH: 3.4, roof: COLORS.tile, wall: COLORS.lacquer, h: 6.4, colonnade: true, over: 1.0 });
  pav(S, mainPos[0], mainPos[1], saW - 1, mainD, axis.angPerp, floorY, { tiers: 2, wallH: 3.6, roof: COLORS.tile, wall: COLORS.lacquer, h: saGround + 10 - floorY, over: 1.0 });

  for (const itemId of [206627327, 206627334, 206627329, 771244246]) {
    if (!byId(itemId)) continue;
    const isFront = itemId === 206627327 || itemId === 206627334;
    const pos = axis.at(isFront ? 146.8 : 190.6, (itemId === 206627334 || itemId === 771244246 ? 1 : -1) * 22);
    hallAt(S, pos[0], pos[1], 17.0, 9.8, axis.ang, { plinth: 0.5, floor: courtY + 0.5, roof: COLORS.sideRoof, wall: TOMB_COL.lacquerOld, wallH: 3.2, over: 0.7, h: isFront ? 6.0 : 5.6 });
    S.kind = KIND.MASONRY;
    S.base = courtY - LAND_Y;
    S.box(pos[0], pos[1], courtY - 0.3, courtY + 0.5, 18.6, 11.4, axis.ang, TOMB_COL.stone, { topKind: KIND.ROAD });
  }

  const htmPos = axis.at(sHTM);
  gate(S, htmPos[0], htmPos[1], axis.angPerp, 11, 4, { h: 4.4, openings: 3, col: COLORS.wall, roof: COLORS.tile, rh: 1.5, floor: courtY });
}

function buildBridgesMinhLauAndBuuThanh(S, axis, byId, items, box, hip, markPaved) {
  const tanNguyetT = (s) => TAN_NGUYET_BRIDGE[0][1] + ((TAN_NGUYET_BRIDGE[1][1] - TAN_NGUYET_BRIDGE[0][1]) * (s - TAN_NGUYET_BRIDGE[0][0])) / (TAN_NGUYET_BRIDGE[1][0] - TAN_NGUYET_BRIDGE[0][0]);

  // Trừng Minh neck kerbs & three bridges
  const lakeY = waterY(...(axis.at((NECK.s0 + NECK.s1) / 2, 0) as [number, number]));
  const neckMidT = (NECK.t0 + NECK.t1) / 2, neckLen = NECK.t1 - NECK.t0;
  S.kind = KIND.MASONRY;
  S.base = 0;
  for (const s of [NECK.s0, NECK.s1]) {
    const bankY = groundSpan(rectPts(...(axis.at(s, neckMidT) as [number, number]), 0.8, neckLen, axis.ang)).hi;
    box(s, neckMidT, lakeY - 0.7, Math.max(bankY, lakeY + 0.3) + 0.15, 0.8, neckLen, TOMB_COL.stoneDark, { topKind: KIND.ROAD });
  }
  for (const [t, width, col] of ([[-0.8, 5.2, COLORS.stucco], [15.8, 3.4, TOMB_COL.stone], [-17.6, 3.4, TOMB_COL.stone]] as any[])) {
    bridge(S, axis.at(NECK.s0 - 1.5, t), axis.at(NECK.s1 + 1.5, t), width, { col, arch: 0.7 });
  }

  // Minh Lâu on Tam Tài Sơn
  const ml = byId(206627339);
  const mlCenter = ml ? ml.c : axis.at(262.2, -0.8), tCenter = -0.8;
  const moundSpan = groundSpan(rectPts(...(axis.at(267, tCenter) as [number, number]), 48, 31, axis.ang));
  const tiers = [
    [243.5, 290, 14, moundSpan.hi + 0.95],
    [245.8, 284, 12.6, moundSpan.hi + 1.9],
    [248, 272, 11.2, moundSpan.hi + 2.85],
  ];
  markPaved(() => {
    tiers.forEach(([frontS, backS, halfW, topY], k) => {
      const pt = axis.at((frontS + backS) / 2, tCenter);
      S.kind = KIND.MASONRY;
      S.base = moundSpan.lo - LAND_Y;
      S.box(pt[0], pt[1], moundSpan.lo - 1, topY, backS - frontS, halfW * 2, axis.ang, k === 2 ? TOMB_COL.stoneGrey : COLORS.wall, k === 2 ? { top: shade(TOMB_COL.stone, 1.03), topKind: KIND.ROAD } : { top: COLORS.moss });
      if (k < 2) S.box(pt[0], pt[1], topY - 0.1, topY + 0.03, backS - frontS - 0.6, halfW * 2 - 0.6, axis.ang, shade(COLORS.moss, 1.12), { top: shade(COLORS.moss, 1.12) });
    });
    const walkPt = axis.at((tiers[0][0] + tiers[2][0]) / 2, tCenter);
    S.box(walkPt[0], walkPt[1], tiers[0][3] - 0.2, tiers[0][3] + 0.06, tiers[2][0] - tiers[0][0], 6.4, axis.ang, TOMB_COL.stone, { topKind: KIND.ROAD });
  });

  const bridgeLandY = gY(...(axis.at(NECK.s1 + 2, tCenter) as [number, number])) + 0.15;
  flight(S, axis.at(NECK.s1 + 1.5, tCenter), bridgeLandY, axis.at(tiers[0][0], tCenter), tiers[0][3], 7, { rail: 1, railCol: COLORS.stucco });
  flight(S, axis.at(tiers[0][0] + 0.3, tCenter), tiers[0][3], axis.at(tiers[1][0], tCenter), tiers[1][3], 6, { rail: 1, railCol: COLORS.stucco });
  flight(S, axis.at(tiers[1][0] + 0.3, tCenter), tiers[1][3], axis.at(tiers[2][0], tCenter), tiers[2][3], 5.4, { rail: 1, railCol: COLORS.stucco });
  flight(S, axis.at(tiers[2][1], tCenter), tiers[2][3], axis.at(tiers[2][1] + 3.2, tCenter), tiers[1][3], 5);
  flight(S, axis.at(tiers[1][1], tCenter), tiers[1][3], axis.at(tiers[1][1] + 3.2, tCenter), tiers[0][3], 5);
  const backGroundY = gY(...(axis.at(tiers[0][1] + 3.5, tCenter) as [number, number]));
  flight(S, axis.at(tiers[0][1], tCenter), tiers[0][3], axis.at(tiers[0][1] + 3.5, tCenter), backGroundY + 0.1, 5);

  const mlGround = gY(mlCenter[0], mlCenter[1]);
  pav(S, mlCenter[0], mlCenter[1], 11.8, 11.8, axis.angPerp, tiers[2][3], { tiers: 2, wallH: 3.6, roof: COLORS.tile, wall: COLORS.lacquer, h: mlGround + 13.5 - tiers[2][3], colonnade: true, over: 0.6 });

  for (const [x, z] of TRU_BIEU) {
    const g = gY(x, z);
    drawTumulus(S, x, z, 8, 1.6, COLORS.moss);
    S.kind = KIND.MASONRY;
    S.base = g + 1.6 - LAND_Y;
    drawObelisk(S, x, z, g + 1.6, 10.5);
  }

  // Cầu Thông Minh Chính Trực & 33 steps
  bridge(S, axis.at(TAN_NGUYET_BRIDGE[0][0], tanNguyetT(TAN_NGUYET_BRIDGE[0][0])), axis.at(TAN_NGUYET_BRIDGE[1][0], tanNguyetT(TAN_NGUYET_BRIDGE[1][0])), 5.0, { col: COLORS.stucco, arch: 0.9 });
  markPaved(() => {
    const ptA = axis.at(294, -0.8), ptB = axis.at(300.8, tanNguyetT(300.8)), ya = gY(ptA[0], ptA[1]), yb = gY(ptB[0], ptB[1]);
    S.kind = KIND.MASONRY;
    S.base = ya - LAND_Y;
    S.box((ptA[0] + ptB[0]) / 2, (ptA[1] + ptB[1]) / 2, Math.min(ya, yb) - 0.6, Math.max(ya, yb) + 0.12, 7, 5, axis.ang, TOMB_COL.stone, { topKind: KIND.ROAD });
  });
  const stepStart = axis.at(TAN_NGUYET_BRIDGE[1][0], tanNguyetT(TAN_NGUYET_BRIDGE[1][0]));
  const stepEnd = axis.at(377.2, tanNguyetT(377.2));
  const yStart = Math.max(gY(stepStart[0], stepStart[1]), LAND_Y + 4.5), yEnd = gY(stepEnd[0], stepEnd[1]) + 0.3;
  const s0 = TAN_NGUYET_BRIDGE[1][0], sKnee = 362.5, kneePt = axis.at(sKnee, tanNguyetT(sKnee));
  const kneeGroundY = groundSpan(rectPts(...(axis.at((s0 + sKnee) / 2, tanNguyetT(sKnee)) as [number, number]), sKnee - s0, 6, axis.ang)).hi + 0.2;
  if (kneeGroundY > yStart + ((yEnd - yStart) * (sKnee - s0)) / (377.2 - s0)) {
    flight(S, stepStart, yStart, kneePt, kneeGroundY, 6, { rail: 1, railCol: COLORS.stucco });
    flight(S, kneePt, kneeGroundY, stepEnd, yEnd, 6, { rail: 1, railCol: COLORS.stucco });
  } else {
    flight(S, stepStart, yStart, stepEnd, yEnd, 6, { rail: 1, railCol: COLORS.stucco });
  }

  // Bửu Thành and Khải Trạch Sơn
  const bt = byId(206627350);
  const btCenter = bt ? bt.c : axis.at(421, -2);
  if (bt?.ring) wallLine(S, bt.ring, 3.5, 1.3, { maxSeg: 8, col: COLORS.wallDark });
  const gateS = 378.2, gatePt = axis.at(gateS, tanNguyetT(gateS)), gateY = gY(gatePt[0], gatePt[1]) + 0.3;
  S.kind = KIND.MASONRY;
  S.base = gateY - LAND_Y;
  S.box(gatePt[0], gatePt[1], gateY - 1.2, gateY + 4.4, 2.4, 6.6, axis.ang, COLORS.stucco, { top: shade(COLORS.stucco, 0.9) });
  S.box(gatePt[0], gatePt[1], gateY + 4.4, gateY + 5.2, 1.6, 4.0, axis.ang, COLORS.stucco, { taper: 0.7 });
  S.kind = KIND.PLAIN;
  S.box(gatePt[0], gatePt[1], gateY, gateY + 3.0, 2.5, 3.0, axis.ang, hex('#5a4a2c'));
  hip(gateS, tanNguyetT(gateS), 6.8, 2.8, gateY + 4.4, 0.9, COLORS.tile, { over: 0.4 });

  drawTumulus(S, btCenter[0], btCenter[1], 26, 1.8, COLORS.moss);
  S.kind = KIND.PLAIN;
  for (let i = 0; i < 22; i++) {
    const ang = i * 2.399 + 0.3, rad = 6 + ((i * 37) % 31);
    const x = btCenter[0] + Math.cos(ang) * rad, z = btCenter[1] + Math.sin(ang) * rad;
    const yb = gY(x, z) + Math.max(0, 1.8 * (1 - (rad - 6) / 20)) - 0.4, treeH = 9 + (i % 4) * 1.5;
    S.cyl(x, z, yb, yb + 2.5, 0.25, 0.22, 5, hex('#4a3a2a'), { cap: false });
    S.cyl(x, z, yb + 2.2, yb + treeH, 2.4, 0, 7, shade(COLORS.pine, 0.9 + (i % 3) * 0.08), { cap: false });
  }

  // Remaining mapped visitor buildings
  const handledIds = new Set([206627327, 206627328, 206627329, 206627334, 206627336, 206627337, 206627338, 206627339, 206627350, 771244246, 1330598719]);
  for (const item of items) {
    if (item.k !== 'b' || handledIds.has(item.id) || !(item.w > 1)) continue;
    const isTiny = Math.max(item.w, item.d) < 8;
    hallAt(S, item.c[0], item.c[1], item.w, item.d, item.a, { plinth: 0.4, roof: isTiny ? TOMB_COL.roofTile : TOMB_COL.roofYOld, wall: TOMB_COL.lacquerOld, wallH: isTiny ? 2.8 : 3.2, over: 0.8 });
  }
}

export function build({ data, S }) {
  const axis = makeFrame(DAI_HONG_MON, AXIS_AIM);
  const site = data.sites && data.sites.minhmang;
  const items = (site?.items || []).map((entry) => {
    const ring = unflat(entry.ring).map(shiftPt);
    return { id: entry.id, n: entry.n || '', k: entry.k, ring, ...obb(ring) };
  });
  const byId = (itemId) => items.find((entry) => entry.id === itemId);
  const markPaved = (fn) => { const start = S.n; fn(); (S.paved = S.paved || []).push([start, S.n]); };
  const box = (s, t, y0, y1, w, d, col, opt?) => { const pt = axis.at(s, t); S.box(pt[0], pt[1], y0, y1, w, d, axis.ang, col, opt); };
  const hip = (s, t, w, d, y0, h, col, opt?) => {
    const pt = axis.at(s, t);
    S.hip(pt[0], pt[1], w, d, axis.angPerp, y0, h, col, { flare: 0.4, over: 0.7, fascia: 0.22, fasciaCol: shade(COLORS.lacquer, 0.7), ridgeCol: COLORS.ridge, hips: true, glazed: true, ...opt });
  };

  buildFrontGateAndBaiDinh(S, axis, box, hip, markPaved);
  buildBiDinhAndSanTrieuLe(S, axis, byId, box, markPaved);
  buildSungAnCourt(S, axis, byId, box, markPaved);
  buildBridgesMinhLauAndBuuThanh(S, axis, byId, items, box, hip, markPaved);
  S.kind = KIND.PLAIN;
  S.base = 0;
}

function drawTumulus(S, cx, cz, rad, height, col) {
  const profile = (frac) => (frac <= 0.23 ? 1 : Math.cos(((frac - 0.23) / 0.77) * Math.PI * 0.5));
  const ptAt = (frac, ang) => {
    const x = cx + Math.cos(ang) * rad * frac, z = cz + Math.sin(ang) * rad * frac;
    return [x, gY(x, z) + height * profile(frac) - (frac >= 1 ? 0.6 : 0), z];
  };
  const rings = [0, 0.23, 0.45, 0.65, 0.82, 1], segs = 18;
  S.kind = KIND.GROUND;
  S.base = 0;
  for (let j = 0; j < segs; j++) {
    const a0 = (j / segs) * Math.PI * 2, a1 = ((j + 1) / segs) * Math.PI * 2, aMid = (a0 + a1) / 2;
    for (let k = 0; k + 1 < rings.length; k++) {
      const hint = [Math.cos(aMid) * rings[k + 1], 1, Math.sin(aMid) * rings[k + 1]];
      if (k === 0) S.tri(ptAt(0, 0), ptAt(rings[1], a0), ptAt(rings[1], a1), col, hint);
      else S.quad(ptAt(rings[k], a0), ptAt(rings[k], a1), ptAt(rings[k + 1], a1), ptAt(rings[k + 1], a0), col, hint);
    }
  }
}

function drawObelisk(S, x, z, baseY, height) {
  S.box(x, z, baseY - 0.4, baseY + 1.0, 2.2, 2.2, 0, shade(TOMB_COL.stone, 0.88));
  S.box(x, z, baseY + 1.0, baseY + 1.5, 1.7, 1.7, 0, shade(TOMB_COL.stone, 0.95));
  S.box(x, z, baseY + 1.5, baseY + height - 1.6, 1.15, 1.15, 0, TOMB_COL.stucco || TOMB_COL.stone, { taper: 0.72 });
  S.box(x, z, baseY + height - 1.6, baseY + height - 1.1, 1.3, 1.3, 0, shade(TOMB_COL.stone, 0.9));
  S.cyl(x, z, baseY + height - 1.1, baseY + height, 0.55, 0.05, 8, shade(TOMB_COL.stone, 1.05));
}
