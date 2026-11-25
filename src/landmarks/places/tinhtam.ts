import { KIND, Buf, hex, shade, unflat, inRing, pathLength } from '../../geo/buf.ts';
import { LAND_Y, POND_Y, quality, roadWidth } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { bridgeProfiles } from '../../geo/bridges.ts';
import { cityMaterial, enc } from '../../geo/materials.ts';

// ---- Hồ Tịnh Tâm: the Nguyễn court's lotus lake inside the Kinh Thành (Thuận Thành ward), as it stands in 2026 ----
//
// Sources (fetched Nov 2026; notes in docs/places/tinhtam.md):
//  - OSM (data/raw extract): relation 1843591 "Hồ Tịnh Tâm" (south basin, two holes: Bồng Lai and Doanh Châu) and
//    relation 7102838 (north basin, hole: Phương Trượng); the Kim Oanh dyke between them is now đường Lê Văn Hưu.
//    Footbridges 1489091245 (concrete) to Bồng Lai and 1489091232 (wood) to Phương Trượng, outlines
//    1432251331/1432251332; the octagonal roof 1568327411 (amenity=shelter, building=roof) on Bồng Lai.
//  - vi.wikipedia.org/wiki/Hồ_Tịnh_Tâm: area 107,553 m², perimeter nearly 1,500 m, rectangular, white lotus,
//    willows and bamboo; Bồng Lai (south) with điện Bồng Doanh, Phương Trượng (north), Doanh Châu (south-west);
//    Kim Oanh dyke east–west across the lake; the wall pulled down in 1946. The two OSM basins add up to 102.5k m²
//    plus the dyke, which matches.
//  - baophapluat.vn (4 Sep 2020), news.huengaynay.vn (Sep 2020), baovanhoa.vn (27 May 2020): 2020 restoration — a
//    concrete bridge (1960) joins Bồng Lai to the Kim Oanh dyke; the small octagonal house (first built 1960 on the
//    Bồng Doanh site) rebuilt "modelled on the original"; a bamboo-and-timber bridge to Phương Trượng; bamboo
//    revetment and bamboo planted along the Kim Oanh dyke; rockeries, flowers and ornamental trees on both islands;
//    the bridge to Bồng Lai has bamboo railings.
// Estimated: the pavilion's sizes beyond the OSM roof outline (≈6.7 m eave radius), roof colour, column count,
// the bridges' widths and pier spacing, the stone facing of the banks, where the lotus drifts are.
// Nothing of the old halls, corridors or the four gates stands today, so none is drawn.

export const id = 'tinhtam';

const COLORS = {
  face: hex('#7f7a6d'), // weathered stone revetment
  moss: hex('#5a5e48'),
  coping: hex('#b4ab98'),
  timber: hex('#7b5a3e'),
  timberDark: hex('#4f3b2a'),
  bamboo: hex('#b7a465'),
  bambooOld: hex('#8f8150'),
  concrete: hex('#b3ada0'),
  lacquer: hex('#8e3424'),
  roof: hex('#8c4a36'),
  roofDark: hex('#6e3a2c'),
  ridge: hex('#d8cdb4'),
  plinth: hex('#a8a090'),
  rock: hex('#6e6c66'),
  leaf: hex('#4f7a3c'),
  leafAlt: hex('#6b8f45'),
  lawnOuterSide: hex('#55613a'),
  lawnOuterTop: hex('#5d6c3c'),
  lawnInnerSide: hex('#6f7446'),
  lawnInnerTop: hex('#757b49'),
};

const LOTUS_GREENS = ['#4f8a4a', '#5f9a52', '#6a9e58', '#47804a', '#7aa660'].map(hex);
const LOTUS_WHITES = ['#fbfaf2', '#f6f2e4', '#fffdf6', '#f3e9e4'].map(hex);

// the Kim Oanh dyke (Lê Văn Hưu): OSM way 39416158 + 1489626239, model metres
const DYKE: [number, number][] = [[-1584, -903.6], [-1435.1, -1016.8], [-1350.8, -1079.2], [-1275.4, -1136]];
// the two bridges, OSM footways (model metres): to Bồng Lai (concrete, 1960) and to Phương Trượng (bamboo and timber, 2020)
const BR_BONGLAI: [number, number][] = [[-1346.4, -1073.5], [-1312.9, -1030.4]];
const BR_PHUONG: [number, number][] = [[-1382.7, -1120.5], [-1360.7, -1092.1]];
const PAVILION: [number, number] = [-1291.2, -1001.6];
const SW_PATH_END: [number, number] = [-1316.5, -979];
const ISLAND_TREES: [number, number][] = [
  [-1325.2, -1016], [-1318, -1004.6], [-1298, -1030.3], [-1286.5, -1026.9], [-1265, -996],
  [-1255.9, -987.4], [-1296.5, -970.2], [-1269.3, -973.6], [-1284.5, -1043], [-1275.9, -1031.8],
];
const TINHTAM_RD: [number, number][] = [
  [-1212, -946], [-1262, -909], [-1275, -899], [-1288, -890], [-1312, -872], [-1337, -853], [-1359, -837], [-1372, -828],
];
const DTH_RD: [number, number][] = [[-1275, -1136], [-1217, -1058], [-1167, -991]];
const BASIN_PROBES: [number, number][] = [[-1400, -950], [-1500, -1240]];
const OPEN_STREAK: [number, number][] = [[-1430.4, -896.2], [-1366.2, -930.6], [-1352.5, -962.7]];

const groundY = (x: number, z: number) => LAND_Y + rise(x, z);

function distToSeg(x: number, z: number, ptA: [number, number], ptB: [number, number]) {
  const dx = ptB[0] - ptA[0];
  const dz = ptB[1] - ptA[1];
  const lenSq = dx * dx + dz * dz || 1;
  const frac = Math.max(0, Math.min(1, ((x - ptA[0]) * dx + (z - ptA[1]) * dz) / lenSq));
  return Math.hypot(x - ptA[0] - dx * frac, z - ptA[1] - dz * frac);
}

function distToLine(x: number, z: number, pts: [number, number][]) {
  let minDist = Infinity;
  for (let i = 0; i + 1 < pts.length; i++) minDist = Math.min(minDist, distToSeg(x, z, pts[i], pts[i + 1]));
  return minDist;
}

function createRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

// collapse the generic road-bridge slab triangles so the hand-made bridge takes its place
function knockOutGenericBridge(S, vertCount: number, pts: [number, number][], halfWidth: number, yHi: number) {
  const pos = S.pos;
  const ptA = pts[0];
  const ptB = pts[pts.length - 1];
  const len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
  const ux = (ptB[0] - ptA[0]) / len;
  const uz = (ptB[1] - ptA[1]) / len;
  const isInside = (idx: number) => {
    const x = pos[idx] - ptA[0];
    const y = pos[idx + 1];
    const z = pos[idx + 2] - ptA[1];
    const along = x * ux + z * uz;
    const across = -x * uz + z * ux;
    return along > -0.6 && along < len + 0.6 && Math.abs(across) < halfWidth && y > -6 && y < yHi;
  };
  let removed = 0;
  for (let i = 0; i < vertCount; i += 3) {
    const base = i * 3;
    if (!isInside(base) || !isInside(base + 3) || !isInside(base + 6)) continue;
    for (const j of [base + 3, base + 6]) {
      pos[j] = pos[base];
      pos[j + 1] = pos[base + 1];
      pos[j + 2] = pos[base + 2];
    }
    removed++;
  }
  return removed;
}

function findBridgeRoad(data, seg: [number, number][]) {
  const [ptA, ptB] = seg;
  for (const road of data.roads || []) {
    if (!road || !road[1] || !Array.isArray(road[2])) continue;
    const pts = unflat(road[2]);
    const p0 = pts[0];
    const p1 = pts[pts.length - 1];
    const distFwd = Math.hypot(p0[0] - ptA[0], p0[1] - ptA[1]) + Math.hypot(p1[0] - ptB[0], p1[1] - ptB[1]);
    const distRev = Math.hypot(p0[0] - ptB[0], p0[1] - ptB[1]) + Math.hypot(p1[0] - ptA[0], p1[1] - ptA[1]);
    if (Math.min(distFwd, distRev) < 3) return { road, pts };
  }
  return null;
}

function createPathWalker(pts: [number, number][]) {
  const total = pathLength(pts);
  const along = (dist: number) => {
    let acc = 0;
    for (let i = 0; i + 1 < pts.length; i++) {
      const ptA = pts[i];
      const ptB = pts[i + 1];
      const segLen = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
      if (acc + segLen >= dist) {
        const frac = (dist - acc) / segLen;
        return {
          pt: [ptA[0] + (ptB[0] - ptA[0]) * frac, ptA[1] + (ptB[1] - ptA[1]) * frac] as [number, number],
          unit: [(ptB[0] - ptA[0]) / segLen, (ptB[1] - ptA[1]) / segLen] as [number, number],
          idx: i,
        };
      }
      acc += segLen;
    }
    return null;
  };
  return { total, along };
}

// square Bồng Lai's OSM hole to match the crisp square stone revetment on the satellite
function squareBongLai(basins: [number, number][][][]): [number, number][] | null {
  const rings = basins[0];
  const holeIdx = rings.findIndex((ring, idx) => idx > 0 && inRing(PAVILION[0], PAVILION[1], ring));
  if (holeIdx <= 0) return null;
  const ring = rings[holeIdx];
  const sides = ring
    .map((ptA, i) => {
      const ptB = ring[(i + 1) % ring.length];
      return { ptA, ptB, len: Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]) };
    })
    .sort((edgeA, edgeB) => edgeB.len - edgeA.len)
    .slice(0, 4)
    .sort((edgeA, edgeB) =>
      Math.atan2((edgeA.ptA[1] + edgeA.ptB[1]) / 2 - PAVILION[1], (edgeA.ptA[0] + edgeA.ptB[0]) / 2 - PAVILION[0])
      - Math.atan2((edgeB.ptA[1] + edgeB.ptB[1]) / 2 - PAVILION[1], (edgeB.ptA[0] + edgeB.ptB[0]) / 2 - PAVILION[0]),
    );
  const intersect = (edgeA, edgeB): [number, number] => {
    const d1 = [edgeA.ptB[0] - edgeA.ptA[0], edgeA.ptB[1] - edgeA.ptA[1]];
    const d2 = [edgeB.ptB[0] - edgeB.ptA[0], edgeB.ptB[1] - edgeB.ptA[1]];
    const den = d1[0] * d2[1] - d1[1] * d2[0];
    const frac = ((edgeB.ptA[0] - edgeA.ptA[0]) * d2[1] - (edgeB.ptA[1] - edgeA.ptA[1]) * d2[0]) / den;
    return [edgeA.ptA[0] + d1[0] * frac, edgeA.ptA[1] + d1[1] * frac];
  };
  const isle = sides.map((edge, i) => intersect(edge, sides[(i + 1) % 4]));
  rings[holeIdx] = isle;
  return isle;
}

// stone revetment, moss line, coping, and bamboo stakes along the Kim Oanh dyke
function buildBanks(S, basins: [number, number][][][]) {
  S.kind = KIND.MASONRY;
  for (const rings of basins) {
    rings.forEach((ring, ringIdx) => {
      for (let i = 0; i < ring.length; i++) {
        const ptA = ring[i];
        const ptB = ring[(i + 1) % ring.length];
        const edgeLen = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
        if (edgeLen < 0.3) continue;
        const ux = (ptB[0] - ptA[0]) / edgeLen;
        const uz = (ptB[1] - ptA[1]) / edgeLen;
        let nx = -uz;
        let nz = ux;
        const testX = (ptA[0] + ptB[0]) / 2 + nx * 0.8;
        const testZ = (ptA[1] + ptB[1]) / 2 + nz * 0.8;
        if (!(inRing(testX, testZ, rings[0]) && !rings.slice(1).some((hole) => inRing(testX, testZ, hole)))) {
          nx = -nx;
          nz = -nz;
        }
        const angle = Math.atan2(uz, ux);
        const isDyke = ringIdx === 0 && distToLine(ptA[0], ptA[1], DYKE) < 14 && distToLine(ptB[0], ptB[1], DYKE) < 14;
        const steps = Math.max(1, Math.ceil(edgeLen / 18));
        for (let k = 0; k < steps; k++) {
          const t0 = k / steps;
          const t1 = (k + 1) / steps;
          const segLen = edgeLen / steps + 0.25;
          const mx = ptA[0] + (ptB[0] - ptA[0]) * (t0 + t1) / 2;
          const mz = ptA[1] + (ptB[1] - ptA[1]) * (t0 + t1) / 2;
          const gy = groundY(mx - nx * 1.5, mz - nz * 1.5);
          const offsetPt = (dist: number): [number, number] => [mx + nx * dist, mz + nz * dist];
          let pt = offsetPt(0.12);
          S.box(pt[0], pt[1], POND_Y - 0.5, gy - 0.02, segLen, 0.32, angle, COLORS.face);
          pt = offsetPt(0.3);
          S.box(pt[0], pt[1], POND_Y - 0.2, POND_Y + 0.32, segLen, 0.06, angle, COLORS.moss);
          pt = offsetPt(-0.25);
          S.box(pt[0], pt[1], gy - 0.12, gy + 0.1, segLen, 0.85, angle, COLORS.coping, { topKind: KIND.ROAD });
          if (isDyke) {
            pt = offsetPt(0.42);
            S.kind = KIND.TIMBER;
            S.box(pt[0], pt[1], POND_Y - 0.3, POND_Y + 0.55, segLen, 0.1, angle, COLORS.bambooOld);
            S.kind = KIND.MASONRY;
          }
        }
      }
    });
  }
}

// footbridge on the deck profile of its mapped footway
function buildFootbridge(S, data, profiles, startVertCount: number, seg: [number, number][], opt: { width: number; thick: number; span: number; concrete: boolean }) {
  const found = findBridgeRoad(data, seg);
  const profile = found && profiles.get(found.road[2]);
  let pts = found ? found.pts : seg;
  if (found && Math.hypot(pts[0][0] - seg[0][0], pts[0][1] - seg[0][1]) > 3) pts = [...pts].reverse();
  const totalLen = pathLength(pts);
  const yAt = profile
    ? (dist: number) => profile.y(found.pts[0] === pts[0] ? dist : totalLen - dist)
    : (dist: number) => LAND_Y + 0.42 + 0.8 * Math.sin((Math.PI * dist) / totalLen);
  if (profile) knockOutGenericBridge(S, startVertCount, pts, 2.6, LAND_Y + 4);

  const ptA = pts[0];
  const ptB = pts[pts.length - 1];
  const ux = (ptB[0] - ptA[0]) / totalLen;
  const uz = (ptB[1] - ptA[1]) / totalLen;
  const angle = Math.atan2(uz, ux);
  const deckPt = (along: number, across: number): [number, number] => [ptA[0] + ux * along - uz * across, ptA[1] + uz * along + ux * across];
  const width = opt.width;
  const segCount = Math.ceil(totalLen / 1.5);

  for (let i = 0; i < segCount; i++) {
    const s0 = (i * totalLen) / segCount;
    const s1 = ((i + 1) * totalLen) / segCount;
    const y0 = yAt(s0);
    const y1 = yAt(s1);
    const p0 = deckPt(s0, 0);
    const p1 = deckPt(s1, 0);
    S.kind = opt.concrete ? KIND.PLAIN : KIND.TIMBER;
    S.beam([p0[0], y0 - opt.thick / 2, p0[1]], [p1[0], y1 - opt.thick / 2, p1[1]], width, opt.thick, opt.concrete ? COLORS.concrete : COLORS.timberDark);
    S.kind = KIND.TIMBER;
    S.beam([p0[0], y0 + 0.02, p0[1]], [p1[0], y1 + 0.02, p1[1]], width - 0.2, 0.05, COLORS.timber);
  }

  const pierCount = Math.max(2, Math.round(totalLen / opt.span));
  for (let i = 1; i < pierCount; i++) {
    const along = (i * totalLen) / pierCount;
    const deckBottom = yAt(along) - opt.thick;
    if (opt.concrete) {
      const pt = deckPt(along, 0);
      S.kind = KIND.PLAIN;
      S.box(pt[0], pt[1], POND_Y - 1.5, deckBottom + 0.02, 0.6, width - 0.4, angle, shade(COLORS.concrete, 0.9));
    } else {
      S.kind = KIND.TIMBER;
      for (const across of [-width / 2 + 0.2, width / 2 - 0.2]) {
        const pt = deckPt(along, across);
        S.box(pt[0], pt[1], POND_Y - 1.5, deckBottom + 0.02, 0.2, 0.2, angle, COLORS.timberDark);
      }
      const pt = deckPt(along, 0);
      S.box(pt[0], pt[1], deckBottom - 0.2, deckBottom + 0.02, 0.2, width, angle, COLORS.timberDark);
    }
  }

  // bamboo railings: posts every 1.5 m, top and mid rail
  S.kind = KIND.TIMBER;
  for (const across of [-width / 2 + 0.06, width / 2 - 0.06]) {
    for (let i = 0; i <= segCount; i++) {
      const along = (i * totalLen) / segCount;
      const pt = deckPt(along, across);
      const deckY = yAt(along);
      S.box(pt[0], pt[1], deckY, deckY + 0.95, 0.09, 0.09, angle, COLORS.bambooOld);
    }
    for (const railH of [0.9, 0.5]) {
      for (let i = 0; i < segCount; i++) {
        const s0 = (i * totalLen) / segCount;
        const s1 = ((i + 1) * totalLen) / segCount;
        const p0 = deckPt(s0, across);
        const p1 = deckPt(s1, across);
        S.beam([p0[0], yAt(s0) + railH, p0[1]], [p1[0], yAt(s1) + railH, p1[1]], 0.07, 0.07, COLORS.bamboo);
      }
    }
  }
}

// Bồng Lai's outer grass, paler inner lawn, and perimeter brick path
function buildBongLaiLawn(S, isle: [number, number][] | null) {
  if (!isle) return;
  const center = isle.reduce<[number, number]>((acc, pt) => [acc[0] + pt[0] / 4, acc[1] + pt[1] / 4], [0, 0]);
  const gy = groundY(center[0], center[1]);
  const inset = (scale: number): [number, number][] => isle.map((pt) => [center[0] + (pt[0] - center[0]) * scale, center[1] + (pt[1] - center[1]) * scale]);
  S.kind = KIND.GROUND;
  S.prism(isle, gy - 0.35, gy + 0.03, COLORS.lawnOuterSide, COLORS.lawnOuterTop, { topKind: KIND.GROUND });
  const inner = inset(0.6);
  S.prism(inner, gy + 0.02, gy + 0.05, COLORS.lawnInnerSide, COLORS.lawnInnerTop, { topKind: KIND.GROUND });
  S.kind = KIND.MASONRY;
  for (let i = 0; i < 4; i++) {
    const ptA = inner[i];
    const ptB = inner[(i + 1) % 4];
    const len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
    S.box((ptA[0] + ptB[0]) / 2, (ptA[1] + ptB[1]) / 2, gy, gy + 0.07, len + 1.2, 1.2, Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]), shade(COLORS.plinth, 0.92), { topKind: KIND.ROAD });
  }
}

// nhà bát giác on Bồng Lai (1960, rebuilt 2020), brick path to SW bank, and rockeries
function buildOctagonalPavilion(S) {
  const [cx, cz] = PAVILION;
  const baseY = groundY(cx, cz);
  const toBridge = Math.atan2(BR_BONGLAI[1][1] - cz, BR_BONGLAI[1][0] - cx);
  const rot = toBridge - Math.PI / 8;
  const octRing = (radius: number, offsetAngle = 0): [number, number][] =>
    Array.from({ length: 8 }, (_, i) => [cx + radius * Math.cos(rot + offsetAngle + (i * Math.PI) / 4), cz + radius * Math.sin(rot + offsetAngle + (i * Math.PI) / 4)]);

  S.base = baseY - LAND_Y;
  S.kind = KIND.MASONRY;
  S.prism(octRing(8.2), baseY - 0.3, baseY + 0.2, COLORS.plinth, shade(COLORS.plinth, 1.05), { topKind: KIND.ROAD });
  S.prism(octRing(4.9), baseY + 0.2, baseY + 0.55, COLORS.plinth, shade(COLORS.plinth, 1.1), { topKind: KIND.ROAD });
  const fwd = [Math.cos(toBridge), Math.sin(toBridge)];
  S.box(cx + fwd[0] * 8.05, cz + fwd[1] * 8.05, baseY - 0.3, baseY + 0.05, 0.6, 2.6, toBridge, shade(COLORS.plinth, 1.03), { topKind: KIND.ROAD });
  S.box(cx + fwd[0] * 4.95, cz + fwd[1] * 4.95, baseY + 0.1, baseY + 0.38, 0.5, 2.2, toBridge, shade(COLORS.plinth, 1.03), { topKind: KIND.ROAD });

  const floorY = baseY + 0.55;
  const colR = 3.7;
  const colH = 3.0;
  const colPts = octRing(colR);
  S.kind = KIND.TIMBER;
  for (const [x, z] of colPts) {
    S.box(x, z, floorY, floorY + 0.18, 0.42, 0.42, rot, COLORS.plinth);
    S.cyl(x, z, floorY + 0.18, floorY + colH, 0.15, 0.13, 6, COLORS.lacquer, { cap: false });
  }
  for (let i = 0; i < 8; i++) {
    const p0 = colPts[i];
    const p1 = colPts[(i + 1) % 8];
    const midAngle = Math.atan2((p0[1] + p1[1]) / 2 - cz, (p0[0] + p1[0]) / 2 - cx);
    const delta = Math.atan2(Math.sin(midAngle - toBridge), Math.cos(midAngle - toBridge));
    if (Math.abs(delta) >= 0.3) {
      S.beam([p0[0], floorY + 0.55, p0[1]], [p1[0], floorY + 0.55, p1[1]], 0.14, 0.1, COLORS.lacquer);
      S.beam([p0[0], floorY + 0.1, p0[1]], [p1[0], floorY + 0.1, p1[1]], 0.12, 0.12, COLORS.lacquer);
    }
    S.beam([p0[0], floorY + colH - 0.12, p0[1]], [p1[0], floorY + colH - 0.12, p1[1]], 0.2, 0.28, shade(COLORS.lacquer, 0.8));
  }

  const eaveY = floorY + colH;
  const roofR = 6.5;
  S.kind = KIND.TILE;
  S.cyl(cx, cz, eaveY - 0.18, eaveY, roofR, roofR - 0.05, 8, COLORS.roofDark, { cap: false, rot });
  S.cyl(cx, cz, eaveY, eaveY + 1.0, roofR - 0.05, 3.6, 8, COLORS.roof, { cap: false, rot });
  S.cyl(cx, cz, eaveY + 1.0, eaveY + 2.9, 3.6, 0.35, 8, COLORS.roof, { cap: false, rot });
  S.cyl(cx, cz, eaveY - 0.18, eaveY - 0.17, roofR, 0.01, 8, shade(COLORS.roofDark, 0.6), { cap: false, rot });

  S.kind = KIND.PLAIN;
  for (let i = 0; i < 8; i++) {
    const angle = rot + (i * Math.PI) / 4;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const p0 = [cx + cosA * 0.4, eaveY + 2.9, cz + sinA * 0.4];
    const p1 = [cx + cosA * 3.6, eaveY + 1.05, cz + sinA * 3.6];
    const p2 = [cx + cosA * (roofR + 0.1), eaveY + 0.08, cz + sinA * (roofR + 0.1)];
    S.beam(p0, p1, 0.2, 0.2, COLORS.ridge);
    S.beam(p1, p2, 0.2, 0.2, COLORS.ridge);
    S.beam(p2, [cx + cosA * (roofR + 0.75), eaveY + 0.75, cz + sinA * (roofR + 0.75)], 0.16, 0.16, COLORS.ridge);
  }
  S.cyl(cx, cz, eaveY + 2.85, eaveY + 3.15, 0.45, 0.3, 8, COLORS.ridge);
  S.cyl(cx, cz, eaveY + 3.15, eaveY + 3.55, 0.32, 0.22, 8, COLORS.ridge);
  S.cyl(cx, cz, eaveY + 3.55, eaveY + 3.95, 0.24, 0.02, 8, COLORS.ridge);
  S.base = 0;

  // brick path south-west to the island bank
  const dx = SW_PATH_END[0] - cx;
  const dz = SW_PATH_END[1] - cz;
  const pathLen = Math.hypot(dx, dz);
  const ux = dx / pathLen;
  const uz = dz / pathLen;
  const startS = 8.2;
  const steps = Math.ceil((pathLen - startS) / 3);
  S.kind = KIND.MASONRY;
  for (let k = 0; k < steps; k++) {
    const s0 = startS + ((pathLen - startS) * k) / steps;
    const s1 = startS + ((pathLen - startS) * (k + 1)) / steps;
    const midS = (s0 + s1) / 2;
    const x = cx + ux * midS;
    const z = cz + uz * midS;
    const gy = groundY(x, z);
    S.box(x, z, gy - 0.1, gy + 0.08, s1 - s0 + 0.05, 1.8, Math.atan2(uz, ux), shade(COLORS.plinth, 0.95), { topKind: KIND.ROAD });
  }

  // rockeries (hòn non bộ) either side of the path
  const randVal = createRng(1838);
  for (const [ox, oz] of [[9.5, 4], [-6, 10]] as [number, number][]) {
    const bx = cx + ox;
    const bz = cz + oz;
    const by = groundY(bx, bz);
    S.cyl(bx, bz, by - 0.1, by + 0.25, 1.8, 1.6, 7, shade(COLORS.plinth, 0.9));
    for (let k = 0; k < 5; k++) {
      const rockH = 0.6 + randVal() * 1.1;
      const rockR = 0.35 + randVal() * 0.45;
      S.box(bx + (randVal() - 0.5) * 1.8, bz + (randVal() - 0.5) * 1.8, by + 0.2, by + 0.2 + rockH, rockR * 2, rockR * 1.6, randVal() * 3, shade(COLORS.rock, 0.85 + randVal() * 0.3), { taper: 0.45 });
    }
  }
}

// bamboo clumps along the Kim Oanh dyke, parapet on đường Tịnh Tâm, and broadleaf trees on banks & islands
function buildDykeParapetAndTrees(S, data, basins: [number, number][][][], isle: [number, number][] | null) {
  const isWet = (x: number, z: number) => basins.some((rings) => inRing(x, z, rings[0]) && !rings.slice(1).some((hole) => inRing(x, z, hole)));
  const roadsNear: [[number, number][], number][] = [];
  for (const road of data.roads || []) {
    if (!road || !Array.isArray(road[2])) continue;
    const pts = unflat(road[2]);
    if (pts.some((pt) => pt[0] > -1650 && pt[0] < -1100 && pt[1] > -1250 && pt[1] < -750)) {
      roadsNear.push([pts, (roadWidth(road) + (road[0] <= 2 ? 3.6 : road[0] <= 3 ? 2.4 : 0)) / 2 + 0.4]);
    }
  }
  const onRoad = (x: number, z: number) => roadsNear.some(([pts, halfW]) => distToLine(x, z, pts) < halfW);
  const trees = Array.isArray(data.trees) ? data.trees : null;
  const existingTrees: [number, number][] = [];
  if (trees) {
    for (let k = 0; k < trees.length; k += 4) {
      const x = trees[k] / 10;
      const z = trees[k + 1] / 10;
      if (x > -1650 && x < -1100 && z > -1250 && z < -750) existingTrees.push([x, z]);
    }
  }

  const addTree = (x: number, z: number, scale: number, gap = 6) => {
    if (!trees || isWet(x, z) || onRoad(x, z) || existingTrees.some((pt) => Math.hypot(pt[0] - x, pt[1] - z) < gap)) return false;
    if (distToLine(x, z, BR_BONGLAI) < 4 || distToLine(x, z, BR_PHUONG) < 4) return false;
    trees.push(Math.round(x * 10), Math.round(z * 10), Math.round(scale * 10), 4);
    existingTrees.push([x, z]);
    return true;
  };

  const toBank = (sample: { pt: [number, number]; unit: [number, number] }, side: number, back: number, from = 3.5, to = 24): [number, number] | null => {
    for (let dist = from; dist < to; dist += 0.25) {
      const tx = sample.pt[0] - sample.unit[1] * side * dist;
      const tz = sample.pt[1] + sample.unit[0] * side * dist;
      if (isWet(tx, tz)) {
        const offset = side * Math.max(from - 0.5, dist - back);
        return [sample.pt[0] - sample.unit[1] * offset, sample.pt[1] + sample.unit[0] * offset];
      }
    }
    return null;
  };

  // Kim Oanh dyke bamboo hedge & south bank trees
  const dykeRng = createRng(2020);
  const dykeWalker = createPathWalker(DYKE);
  const nwLegLen = Math.hypot(DYKE[1][0] - DYKE[0][0], DYKE[1][1] - DYKE[0][1]);
  const banyanSample = dykeWalker.along(nwLegLen + 17);
  const banyanPt = banyanSample && toBank(banyanSample, 1, 1.2, 2.5, 12);
  if (banyanPt) addTree(banyanPt[0], banyanPt[1], 2.1, 3);

  for (let dist = nwLegLen + 3; dist < dykeWalker.total; dist += 6.5) {
    const sample = dykeWalker.along(dist);
    if (!sample) break;
    const bankPt = toBank(sample, -1, 0.9 + dykeRng() * 0.4, 2.5, 12);
    if (!bankPt) continue;
    const [x, z] = bankPt;
    if (distToLine(x, z, BR_BONGLAI) < 5 || distToLine(x, z, BR_PHUONG) < 5 || onRoad(x, z)) continue;
    const gy = groundY(x, z);
    const leanX = -sample.unit[1] * -1;
    const leanZ = sample.unit[0] * -1;
    const clumpH = 5.5 + dykeRng() * 2;
    const crownW = 1.1 + dykeRng() * 0.35;
    const leanAmt = 0.6 + dykeRng() * 0.3;
    S.kind = KIND.TIMBER;
    for (let k = 0; k < 9; k++) {
      const angle = (k / 9) * 6.28 + dykeRng() * 0.6;
      const rad = 0.12 + dykeRng() * 0.3;
      const frac = 0.55 + dykeRng() * 0.25;
      S.beam(
        [x + Math.cos(angle) * rad, gy - 0.1, z + Math.sin(angle) * rad],
        [x + Math.cos(angle) * (rad + 0.6) + leanX * leanAmt * frac, gy + clumpH * frac, z + Math.sin(angle) * (rad + 0.6) + leanZ * leanAmt * frac],
        0.07, 0.07, k % 3 ? COLORS.bambooOld : COLORS.bamboo,
      );
    }
    S.kind = KIND.PLAIN;
    const rot = dykeRng() * 6.28;
    for (let k = 0; k < 3; k++) {
      const angle = rot + k * 2.1;
      const offset = 0.5 + dykeRng() * 0.5;
      const frac = 0.55 + k * 0.18;
      const cx = x + Math.cos(angle) * offset + leanX * leanAmt * frac;
      const cz = z + Math.sin(angle) * offset + leanZ * leanAmt * frac;
      const yb = gy + clumpH * (0.42 + k * 0.12);
      const yt = gy + clumpH * (0.78 + k * 0.08);
      const tuftW = crownW * (0.65 + 0.15 * dykeRng());
      S.cyl(cx, cz, yb, yb + (yt - yb) * 0.45, 0.2, tuftW, 6, k % 2 ? COLORS.leaf : COLORS.leafAlt, { cap: false, rot: rot + k });
      S.cyl(cx, cz, yb + (yt - yb) * 0.45, yt, tuftW, 0.12, 6, k % 2 ? COLORS.leafAlt : COLORS.leaf, { cap: false, rot: rot + k + 0.5 });
    }
  }
  for (let dist = nwLegLen + 28; dist < dykeWalker.total; dist += 8 + dykeRng() * 3) {
    const sample = dykeWalker.along(dist);
    const pt = sample && toBank(sample, 1, 1.2, 2.5, 12);
    if (pt) addTree(pt[0], pt[1], 1.2 + dykeRng() * 0.4, 6);
  }
  for (let dist = 3; dist < nwLegLen - 2; dist += 5 + dykeRng() * 1.5) {
    const sample = dykeWalker.along(dist);
    const pt = sample && toBank(sample, 1, 1.3, 2.5, 14);
    if (pt) addTree(pt[0], pt[1], 1.1 + dykeRng() * 0.4, 4.5);
  }

  // parapet on đường Tịnh Tâm and tree rows on Tịnh Tâm & Đinh Tiên Hoàng banks
  const roadRng = createRng(1946);
  const ttWalker = createPathWalker(TINHTAM_RD);
  const ttMid = ttWalker.along(ttWalker.total / 2);
  const lakeSide = toBank(ttMid, 1, 0, 3.5, 30) ? 1 : -1;
  const parapetEdge = 6.5 / 2 + 2.4 / 2 + 0.35;
  S.kind = KIND.MASONRY;
  const step = 2.5;
  for (let dist = 0; dist < ttWalker.total - step; dist += step) {
    const sample = ttWalker.along(dist + step / 2);
    if (!sample || !toBank(sample, lakeSide, 0, 3.5, 26)) continue;
    const offset = lakeSide * parapetEdge;
    const x = sample.pt[0] - sample.unit[1] * offset;
    const z = sample.pt[1] + sample.unit[0] * offset;
    const gy = groundY(x, z);
    const angle = Math.atan2(sample.unit[1], sample.unit[0]);
    const wear = shade(COLORS.concrete, 0.78 + 0.1 * roadRng());
    S.box(x, z, gy - 0.2, gy + 0.3, step + 0.02, 0.3, angle, shade(wear, 0.85));
    S.box(x, z, gy + 0.3, gy + 0.62, step + 0.02, 0.28, angle, wear, { top: shade(wear, 1.05) });
    S.box(x, z, gy + 0.62, gy + 0.74, step + 0.02, 0.38, angle, shade(COLORS.concrete, 0.86));
    if (roadRng() < 0.25) {
      S.box(x - sample.unit[1] * lakeSide * 0.12, z + sample.unit[0] * lakeSide * 0.12, gy + 0.2, gy + 0.62, 0.5 + roadRng() * 0.8, 0.05, angle, COLORS.moss);
    }
    S.box(x - sample.unit[1] * lakeSide * 0.15, z + sample.unit[0] * lakeSide * 0.15, gy - 0.2, gy + 0.12, step + 0.02, 0.06, angle, COLORS.moss);
  }
  for (let dist = 5; dist < ttWalker.total; dist += 8 + roadRng() * 3) {
    const sample = ttWalker.along(dist);
    const pt = sample && toBank(sample, lakeSide, 2.8 + roadRng(), 3.5, 26);
    if (pt) addTree(pt[0], pt[1], 1.5 + roadRng() * 0.5, 6);
  }
  const dthWalker = createPathWalker(DTH_RD);
  const dthMid = dthWalker.along(dthWalker.total / 2);
  const dthSide = toBank(dthMid, 1, 0, 3.5, 30) ? 1 : -1;
  for (let dist = 4; dist < dthWalker.total; dist += 6 + roadRng() * 2) {
    const sample = dthWalker.along(dist);
    const pt = sample && toBank(sample, dthSide, 2.2 + roadRng(), 3.5, 26);
    if (pt) addTree(pt[0], pt[1], 1.4 + roadRng() * 0.5, 5.5);
  }

  // Bồng Lai and Doanh Châu island trees
  ISLAND_TREES.forEach(([x, z], idx) => addTree(x, z, 2.3 + ((idx * 7) % 5) * 0.1, 3));
  if (isle) {
    const center = isle.reduce<[number, number]>((acc, pt) => [acc[0] + pt[0] / 4, acc[1] + pt[1] / 4], [0, 0]);
    const isleRng = createRng(1960);
    for (let i = 0; i < 4; i++) {
      const ptA = isle[i];
      const ptB = isle[(i + 1) % 4];
      const edgeLen = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
      const midPt = [(ptA[0] + ptB[0]) / 2, (ptA[1] + ptB[1]) / 2];
      const facesTT = distToLine(midPt[0], midPt[1], TINHTAM_RD) < 75;
      for (let along = 5; along < edgeLen - 4; along += facesTT ? 7 : 10) {
        const frac = along / edgeLen;
        const edgePt = [ptA[0] + (ptB[0] - ptA[0]) * frac, ptA[1] + (ptB[1] - ptA[1]) * frac];
        const distCenter = Math.hypot(center[0] - edgePt[0], center[1] - edgePt[1]);
        const x = edgePt[0] + ((center[0] - edgePt[0]) / distCenter) * 4.5;
        const z = edgePt[1] + ((center[1] - edgePt[1]) / distCenter) * 4.5;
        if (Math.hypot(x - PAVILION[0], z - PAVILION[1]) < 15 || distToLine(x, z, [PAVILION, SW_PATH_END]) < 4) continue;
        addTree(x, z, (facesTT ? 1.9 : 1.6) + isleRng() * 0.4, 6.5);
      }
      const cornerDist = Math.hypot(center[0] - ptA[0], center[1] - ptA[1]);
      addTree(ptA[0] + ((center[0] - ptA[0]) / cornerDist) * 5, ptA[1] + ((center[1] - ptA[1]) / cornerDist) * 5, 1.7 + isleRng() * 0.3, 4);
      if (facesTT) {
        for (let along = 8.5; along < edgeLen - 4; along += 7) {
          const frac = along / edgeLen;
          const edgePt = [ptA[0] + (ptB[0] - ptA[0]) * frac, ptA[1] + (ptB[1] - ptA[1]) * frac];
          const distCenter = Math.hypot(center[0] - edgePt[0], center[1] - edgePt[1]);
          const x = edgePt[0] + ((center[0] - edgePt[0]) / distCenter) * 2.6;
          const z = edgePt[1] + ((center[1] - edgePt[1]) / distCenter) * 2.6;
          if (Math.hypot(x - PAVILION[0], z - PAVILION[1]) < 13 || distToLine(x, z, [PAVILION, SW_PATH_END]) < 3) continue;
          addTree(x, z, 0.9 + isleRng() * 0.25, 3.2);
        }
      }
    }
  }

  const doanhChau = basins[0].find((ring, idx) => idx > 0 && ring !== isle && inRing(-1444, -886, ring));
  if (doanhChau) {
    const center = doanhChau.reduce<[number, number]>((acc, pt) => [acc[0] + pt[0] / doanhChau.length, acc[1] + pt[1] / doanhChau.length], [0, 0]);
    for (const [ox, oz, scale] of [[0, 0, 1.6], [-6.5, -4, 1.2], [6, -5, 1.3], [-5, 6, 1.2], [6, 5.5, 1.1]] as [number, number, number][]) {
      if (distToLine(center[0] + ox, center[1] + oz, [...doanhChau, doanhChau[0]]) > 2.5) addTree(center[0] + ox, center[1] + oz, scale, 4);
    }
  }
}

// white lotus (sen trắng) mat over both basins using InstancedMesh
function buildLotusMat(group, THREE, basins: [number, number][][][], isle: [number, number][] | null) {
  const rnd = createRng(1838_2020);
  const pads: [number, number, number, number, number][] = [];
  const blooms: [number, number, number, number][] = [];
  const floatTarget = quality.low ? 4500 : 9000;
  const emergeTarget = quality.low ? 3000 : 6000;
  const doanhChau = basins[0].find((ring, idx) => idx > 0 && ring !== isle && inRing(-1444, -886, ring));

  const isOpenWater = (x: number, z: number) => {
    const wobble = Math.sin(x * 0.11) * Math.cos(z * 0.09);
    if (doanhChau && distToLine(x, z, [...doanhChau, doanhChau[0]]) < 3.5 + wobble) return true;
    if (distToLine(x, z, OPEN_STREAK) < 7 + 2.5 * wobble) return true;
    if (((x + 1515) / 25) ** 2 + ((z + 874) / 45) ** 2 < 1 + 0.15 * wobble) return true;
    if (Math.hypot(x + 1420.6, z + 1003.3) < 8 + 2 * wobble) return true;
    return distToLine(x, z, [DYKE[0], DYKE[1]]) < 8.5 + wobble;
  };
  const ringArea = (ring: [number, number][]) => {
    let area = 0;
    for (let i = 0; i < ring.length; i++) {
      const p0 = ring[i];
      const p1 = ring[(i + 1) % ring.length];
      area += p0[0] * p1[1] - p1[0] * p0[1];
    }
    return Math.abs(area) / 2;
  };
  const areas = basins.map((rings) => ringArea(rings[0]) - rings.slice(1).reduce((acc, hole) => acc + ringArea(hole), 0));
  const totalArea = areas.reduce((acc, area) => acc + area, 0);

  basins.forEach((rings, basinIdx) => {
    const outer = rings[0];
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const pt of outer) {
      x0 = Math.min(x0, pt[0]); x1 = Math.max(x1, pt[0]);
      z0 = Math.min(z0, pt[1]); z1 = Math.max(z1, pt[1]);
    }
    const share = areas[basinIdx] / totalArea;
    const floatCount = Math.round(floatTarget * share);
    const totalWant = floatCount + Math.round(emergeTarget * share);
    for (let placed = 0, tries = 0; placed < totalWant && tries < totalWant * 12; tries++) {
      const x = x0 + rnd() * (x1 - x0);
      const z = z0 + rnd() * (z1 - z0);
      if (!inRing(x, z, outer) || rings.slice(1).some((hole) => inRing(x, z, hole)) || isOpenWater(x, z)) continue;
      const floating = placed < floatCount;
      const radius = floating ? 2.2 + rnd() * 1.6 : 0.75 + rnd() * 0.8;
      const height = floating ? 0.04 + rnd() * 0.05 : 0.2 + rnd() * 0.7;
      const gap = floating ? Math.min(1.2, radius * 0.5) : 1.2;
      if (distToLine(x, z, [...outer, outer[0]]) < gap) continue;
      if (rings.slice(1).some((ring) => distToLine(x, z, [...ring, ring[0]]) < gap)) continue;
      if (distToLine(x, z, BR_BONGLAI) < 1.8 + (floating ? radius * 0.6 : 0) || distToLine(x, z, BR_PHUONG) < 1.4 + (floating ? radius * 0.6 : 0)) continue;
      pads.push([x, z, radius, rnd() * 6.28, height]);
      if (!floating && rnd() < 0.08) blooms.push([x + (rnd() - 0.5), z + (rnd() - 0.5), 1.1 + rnd() * 0.6, height]);
      placed++;
    }
  });

  const mat = cityMaterial();
  const padGeo = new Buf(24);
  for (let i = 0; i < 7; i++) {
    const a0 = 0.35 + (i / 7) * (Math.PI * 2 - 0.7);
    const a1 = 0.35 + ((i + 1) / 7) * (Math.PI * 2 - 0.7);
    padGeo.tri([0, 0.96, 0], [Math.cos(a0), 1, Math.sin(a0)], [Math.cos(a1), 1, Math.sin(a1)], i % 2 ? [1, 1, 1] : [0.86, 0.86, 0.86], [0, 1, 0]);
  }
  padGeo.cyl(0, 0, 0, 0.97, 0.025, 0.025, 3, [0.55, 0.62, 0.45], { cap: false });

  const bloomGeo = new Buf(40);
  for (let i = 0; i < 6; i++) {
    const a0 = (i / 6) * Math.PI * 2;
    const a1 = a0 + 0.62;
    bloomGeo.tri([0, 0.55, 0], [Math.cos(a0) * 0.4, 1.05, Math.sin(a0) * 0.4], [Math.cos(a1) * 0.4, 1.05, Math.sin(a1) * 0.4], [1, 1, 1], [Math.cos(a0), 0.6, Math.sin(a0)]);
    bloomGeo.tri([0, 0.55, 0], [Math.cos(a1) * 0.4, 1.05, Math.sin(a1) * 0.4], [Math.cos(a0) * 0.4, 1.05, Math.sin(a0) * 0.4], [0.82, 0.82, 0.8], [-Math.cos(a0), 0.3, -Math.sin(a0)]);
  }
  bloomGeo.cyl(0, 0, 0, 0.58, 0.03, 0.03, 4, [0.35, 0.5, 0.3], { cap: false });

  const mat4 = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const scaleVec = new THREE.Vector3();
  const posVec = new THREE.Vector3();
  const upVec = new THREE.Vector3(0, 1, 0);
  const colorObj = new THREE.Color();

  const padMesh = new THREE.InstancedMesh(padGeo.geometry(), mat, Math.max(1, pads.length));
  padMesh.count = pads.length;
  pads.forEach(([x, z, radius, rotAngle, height], i) => {
    quat.setFromAxisAngle(upVec, rotAngle);
    posVec.set(x, POND_Y, z);
    scaleVec.set(radius, height, radius);
    padMesh.setMatrixAt(i, mat4.compose(posVec, quat, scaleVec));
    padMesh.setColorAt(i, enc(shade(LOTUS_GREENS[i % LOTUS_GREENS.length], 0.85 + ((i * 7) % 10) / 33), colorObj));
  });

  const bloomMesh = new THREE.InstancedMesh(bloomGeo.geometry(), mat, Math.max(1, blooms.length));
  bloomMesh.count = blooms.length;
  blooms.forEach(([x, z, radius, height], i) => {
    quat.setFromAxisAngle(upVec, i);
    posVec.set(x, POND_Y + Math.max(0.05, height - 0.35), z);
    scaleVec.set(radius, radius, radius);
    bloomMesh.setMatrixAt(i, mat4.compose(posVec, quat, scaleVec));
    bloomMesh.setColorAt(i, enc(LOTUS_WHITES[i % LOTUS_WHITES.length], colorObj));
  });

  for (const mesh of [padMesh, bloomMesh]) {
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.layers.set(1);
    mesh.userData.landmark = id;
    group.add(mesh);
  }
}

export function build({ data, S, group, THREE }) {
  const startVertCount = S.n;
  const basins: [number, number][][][] = [];
  for (const probe of BASIN_PROBES) {
    const poly = (data.ponds || []).find((pondPoly) => inRing(probe[0], probe[1], unflat(pondPoly[0])));
    if (poly) basins.push(poly.map(unflat));
  }
  if (!basins.length) throw new Error('Tịnh Tâm basins not found in data.ponds');

  const isle = squareBongLai(basins);
  buildBanks(S, basins);

  const profiles = bridgeProfiles(data);
  buildFootbridge(S, data, profiles, startVertCount, BR_BONGLAI, { width: 3.0, thick: 0.45, span: 6, concrete: true });
  buildFootbridge(S, data, profiles, startVertCount, BR_PHUONG, { width: 2.0, thick: 0.25, span: 3.2, concrete: false });

  buildBongLaiLawn(S, isle);
  buildOctagonalPavilion(S);
  buildDykeParapetAndTrees(S, data, basins, isle);
  S.kind = KIND.PLAIN;

  buildLotusMat(group, THREE, basins, isle);
  S.kind = KIND.PLAIN;
  S.base = 0;
}
