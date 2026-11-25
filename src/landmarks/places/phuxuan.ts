import { KIND, hex, unflat, inRing } from '../../geo/buf.ts';
import { bridgeProfiles, bridgeLamps } from '../../geo/bridges.ts';
import { rise } from '../../geo/terrain.ts';
import { LAND_Y, ROAD_W } from '../../config.ts';

// Cầu Phú Xuân ("cầu Mới"; built 1970–71 as cầu Sông Hương, renamed after 1975), the reinforced-concrete girder
// bridge just upstream of Trường Tiền on the old Quốc lộ 1 (Lê Lợi ↔ Trần Hưng Đạo).
//
// Confirmed (docs/places/phuxuan.md has the URLs):
//  - length 374.65 m, 18 t rating (vi.wikipedia Cầu Phú Xuân; khamphahue.com.vn; tuoitre.vn 2024).
//  - position and axis: the OSM carriageway (class 0 road in hue.json) and the OSM bridge outline; checked against
//    Google satellite (axis 139.3° vs the model's 139.2°) and four Google-car Street View panoramas, whose lane
//    positions put the road's centre on the OSM axis within ~1 m.
//  - cross-section, from the satellite (two zooms) and the car panoramas, not the published 17 m: about 20 m over the
//    railings, a four-lane carriageway about 15 m wide (the class 0 road width the traffic already drives on) and a
//    tiled walkway about 2.6 m wide each side. The OSM outline is 20.9 m wide. docs/places/phuxuan.md has the
//    measurements; the 17 m / 12 m of the sources is the original 1971 figure or a misreport (owner question).
//  - markings: a double solid yellow centre line and dashed white lane lines (Street View).
//  - railing: grey steel posts with ball finials and rails, a fine grey fretwork panel with a small medallion in each
//    bay, on a low concrete kerb (Street View).
//  - lamps: pale grey posts about 10 m tall on the railing line, in pairs every ~30 m, each with a curved arm over the
//    carriageway (Street View, all four car panoramas on the deck); layout in geo/bridges.js NAMED (bridgeLamps).
// Estimated (no published drawing found):
//  - 10 equal spans of ~35 m on round-nosed wall piers with a crosshead, 5 precast girders 1.6 m deep under a
//    0.25 m slab; at the Lê Lợi (south) end two short spans on shallow 0.55 m beams over the bank and the lim
//    boardwalk that passes under the deck there; abutments at both ends.
//  - the long section: a long, nearly level deck (geo/bridges.js NAMED, shared with traffic and the lamp glows):
//    level at both streets, 5% off the south end for ~30 m (the least that leaves ~2 m over the boardwalk, whose deck
//    is 1.2 m up while the model's bank is 2.6 m), about 2% off the north end, a low crown ~4.8 m above the river.
//  - railing: post spacing 2.5 m and the fretwork simplified (a framed panel with diagonal lattice and a medallion,
//    bars either side); lamp design (pole, arm, flat lantern) simplified.
export const id = 'phuxuan';

const BRIDGE_LEN = 374.65;
const CARRIAGEWAY_W = ROAD_W[0];
const WALKWAY_W = 2.6;
const TOTAL_W = CARRIAGEWAY_W + 2 * WALKWAY_W;
const MAIN_SPANS = 10; // main spans; plus the two short ones at the south end (SHORT_SPANS)
const SHORT_SPANS = [16.3, 28.8]; // m from the south abutment: piers either side of the lim boardwalk (places/golim.js, ~29 m off the road's end)
const SLAB_H = 0.25;
const GIRDER_H = 1.6;
const SHALLOW_H = 0.55;
const KERB_H = 0.2;
const BRIDGE_TOP = LAND_Y + 0.42; // as landmarks/life.js rides it
const DECK_STEP = 2; // deck sampling (m)
const GIRDER_OFFSETS = [-8, -4.8, -1.6, 1.6, 4.8, 8];
const PIER_NOSE_SEGS = 8;
const PIER_W = 1.5;
const PIER_LEN = 12;
const RAIL_PLINTH_H = 0.22;
const RAIL_H = 1.0;
const RAIL_BAY = 2.5;

const COLORS = {
  asphalt: hex('#7c7a74'),
  walk: hex('#b9b7b0'),
  kerb: hex('#9d9f9b'), // grey concrete kerb face
  fascia: hex('#c3beb3'),
  girder: hex('#aaa59b'),
  under: hex('#9c978e'),
  pier: hex('#aea89c'),
  pierWet: hex('#7d7a72'),
  cap: hex('#b8b3a8'),
  post: hex('#a3a8a6'),
  rail: hex('#b7bcb9'),
  panel: hex('#a9aeac'),
  plinth: hex('#bdbdb8'),
  lamp: hex('#c5c9c7'),
  lantern: hex('#8f9593'),
  line: hex('#ecebe4'),
  yellow: hex('#d9b544'),
  joint: hex('#4d4b48'),
};

// the deck's two end lines (places/index.js placeDeckEnds): square to the chord, at the road's two ends
export function deckEnds(data) {
  const road = (data.roads || []).find((entry) => entry[1] && (entry[0] | 0) <= 1 && isPhuXuanRoad(data, entry));
  if (!road) return [];
  const pts = unflat(road[2]);
  const startPt = pts[0];
  const endPt = pts[pts.length - 1];
  const roadLen = Math.hypot(endPt[0] - startPt[0], endPt[1] - startPt[1]);
  const dir = [(endPt[0] - startPt[0]) / roadLen, (endPt[1] - startPt[1]) / roadLen];
  return [{ p: startPt, u: [-dir[0], -dir[1]], hw: TOTAL_W / 2, reach: 4 }, { p: endPt, u: dir, hw: TOTAL_W / 2, reach: 4 }];
}

function isPhuXuanRoad(data, road) {
  const bridge = (data.bridges || []).find((entry) => entry.n === 'Cầu Phú Xuân');
  if (!bridge) return false;
  const ring = unflat(bridge.ring);
  const pts = unflat(road[2]);
  const startPt = pts[0];
  const endPt = pts[pts.length - 1];
  return inRing((startPt[0] + endPt[0]) / 2, (startPt[1] + endPt[1]) / 2, ring) && !!bridgeProfiles(data).get(road[2]);
}

function buildDeckAndMarkings(S, ctx, stations, supports, s0, s1) {
  const { normal, deckTop, ptAt, groundAt } = ctx;
  const halfCarr = CARRIAGEWAY_W / 2;
  const halfTotal = TOTAL_W / 2;
  for (let i = 0; i + 1 < stations.length; i++) {
    const sa = stations[i];
    const sb = stations[i + 1];
    const ya = deckTop(sa);
    const yb = deckTop(sb);
    const onSpan = sa >= s0 - 1e-6 && sb <= s1 + 1e-6;
    S.quad(ptAt(sa, -halfCarr, ya), ptAt(sa, halfCarr, ya), ptAt(sb, halfCarr, yb), ptAt(sb, -halfCarr, yb), COLORS.asphalt, [0, 1, 0]);
    for (const side of [-1, 1]) {
      const innerV = side * halfCarr;
      const outerV = side * halfTotal;
      const walkYa = ya + KERB_H;
      const walkYb = yb + KERB_H;
      S.quad(ptAt(sa, innerV, walkYa), ptAt(sa, outerV, walkYa), ptAt(sb, outerV, walkYb), ptAt(sb, innerV, walkYb), COLORS.walk, [0, 1, 0]);
      S.quad(ptAt(sa, innerV, ya), ptAt(sb, innerV, yb), ptAt(sb, innerV, walkYb), ptAt(sa, innerV, walkYa), COLORS.kerb, [-side * normal[0], 0, -side * normal[1]]);
      // outer face: the edge girder on the spans; on the approaches a retaining wall down to the ground
      const botYa = onSpan ? ya - SLAB_H - 0.55 : Math.min(ya - SLAB_H, groundAt(sa, outerV) - 0.3);
      const botYb = onSpan ? yb - SLAB_H - 0.55 : Math.min(yb - SLAB_H, groundAt(sb, outerV) - 0.3);
      S.quad(ptAt(sa, outerV, botYa), ptAt(sb, outerV, botYb), ptAt(sb, outerV, walkYb), ptAt(sa, outerV, walkYa), onSpan ? COLORS.fascia : COLORS.pier, [side * normal[0], 0, side * normal[1]]);
      // a drip groove under the cantilever: a slightly darker band reads as the shadow line of the real deck edge
      if (onSpan) S.quad(ptAt(sa, outerV - side * 0.6, botYa), ptAt(sb, outerV - side * 0.6, botYb), ptAt(sb, outerV, botYb), ptAt(sa, outerV, botYa), COLORS.under, [0, -1, 0]);
    }
    if (onSpan) S.quad(ptAt(sa, -halfTotal + 0.6, ya - SLAB_H), ptAt(sb, -halfTotal + 0.6, yb - SLAB_H), ptAt(sb, halfTotal - 0.6, yb - SLAB_H), ptAt(sa, halfTotal - 0.6, ya - SLAB_H), COLORS.under, [0, -1, 0]);
  }
  // markings (Street View): a double solid yellow centre line, dashed white lines between the two lanes each way;
  // expansion joints across the deck over each support
  for (let i = 0; i + 1 < stations.length; i++) {
    const sa = stations[i];
    const sb = stations[i + 1];
    const ya = deckTop(sa) + 0.015;
    const yb = deckTop(sb) + 0.015;
    for (const v of [-0.2, 0.2]) S.quad(ptAt(sa, v - 0.075, ya), ptAt(sa, v + 0.075, ya), ptAt(sb, v + 0.075, yb), ptAt(sb, v - 0.075, yb), COLORS.yellow, [0, 1, 0]);
  }
  for (let s = s0 + 2; s < s1 - 4; s += 9) {
    for (const v of [-CARRIAGEWAY_W / 4, CARRIAGEWAY_W / 4]) {
      const y0 = deckTop(s) + 0.015;
      const y1 = deckTop(s + 3) + 0.015;
      S.quad(ptAt(s, v - 0.07, y0), ptAt(s, v + 0.07, y0), ptAt(s + 3, v + 0.07, y1), ptAt(s + 3, v - 0.07, y1), COLORS.line, [0, 1, 0]);
    }
  }
  for (const s of supports) {
    const y = deckTop(s) + 0.012;
    S.quad(ptAt(s - 0.08, -halfCarr, y), ptAt(s - 0.08, halfCarr, y), ptAt(s + 0.08, halfCarr, y), ptAt(s + 0.08, -halfCarr, y), COLORS.joint, [0, 1, 0]);
  }
}

function buildGirdersAndPiers(S, ctx, spans, supports, s0, s1) {
  const { angle, deckTop, xzAt, ptAt, onLand, groundAt } = ctx;
  // ---- girders: 5 precast beams per span, following the deck between supports ----
  for (const span of spans) {
    const sa = span.a + 0.4;
    const sb = span.b - 0.4;
    const girderDepth = span.depth;
    const isSunk = (u, v) => onLand(xzAt(u, v)) && deckTop(u) - SLAB_H - girderDepth < groundAt(u, v) - 0.5;
    const segCount = 4;
    for (let j = 0; j < segCount; j++) {
      const u0 = sa + ((sb - sa) * j) / segCount;
      const u1 = sa + ((sb - sa) * (j + 1)) / segCount;
      for (const v of GIRDER_OFFSETS) {
        let g0 = u0;
        let g1 = u1;
        while (g0 < g1 && isSunk(g0, v)) g0 += 0.25;
        while (g1 > g0 && isSunk(g1, v)) g1 -= 0.25;
        if (g1 - g0 > 0.3) S.beam(ptAt(g0, v, deckTop(g0) - SLAB_H - girderDepth / 2), ptAt(g1, v, deckTop(g1) - SLAB_H - girderDepth / 2), 0.45, girderDepth, COLORS.girder);
      }
    }
  }

  // ---- piers: round-nosed walls standing in the river (or the north bank), a crosshead under the girders ----
  const makePierRing = (s, halfLen, halfW) => {
    const out = [];
    for (const end of [1, -1]) {
      for (let i = 0; i <= PIER_NOSE_SEGS; i++) {
        const theta = -Math.PI / 2 + (Math.PI * i) / PIER_NOSE_SEGS;
        const v = end * (halfLen - halfW + Math.cos(theta) * halfW);
        const u = end * Math.sin(theta) * halfW;
        out.push(xzAt(s + u, v));
      }
    }
    return out;
  };
  for (let k = 1; k + 1 < supports.length; k++) {
    // the crosshead's top under the shallower of the two spans it carries (a deep girder ends against its face)
    const s = supports[k];
    const minDepth = Math.min(spans[k - 1].depth, spans[k].depth);
    const capTopY = deckTop(s) - SLAB_H - minDepth;
    const capBotY = deckTop(s) - SLAB_H - GIRDER_H - 1.3 + (minDepth < GIRDER_H ? 0.6 : 0);
    const wetY = onLand(xzAt(s, 0)) ? null : 0.9; // river piers: a darker band below the flood line
    const footY = -3;
    if (wetY === null) { // a pier on the bank: what stands above the ground (the low deck buries its seat and wall)
      const gY = groundAt(s, 0);
      if (capTopY > gY + 0.2) S.box(...xzAt(s, 0), Math.max(capBotY + 0.45, gY - 0.3), capTopY, 1.8, TOTAL_W - 2.2, angle, COLORS.cap, { bottom: true });
      if (capBotY + 0.45 > gY) {
        S.prism(makePierRing(s, PIER_LEN / 2, PIER_W / 2), footY, capBotY, COLORS.pier, COLORS.pier, { top: false });
        S.box(...xzAt(s, 0), capBotY, capBotY + 0.45, 1.8, PIER_LEN - 0.8, angle, COLORS.cap);
      }
      continue;
    }
    if (wetY !== null && capBotY > wetY) {
      S.prism(makePierRing(s, PIER_LEN / 2, PIER_W / 2), footY, wetY, COLORS.pierWet, COLORS.pierWet, { top: false });
      S.prism(makePierRing(s, PIER_LEN / 2, PIER_W / 2), wetY, capBotY, COLORS.pier, COLORS.pier, { top: false, scaleTop: 0.97 });
    } else {
      S.prism(makePierRing(s, PIER_LEN / 2, PIER_W / 2), footY, capBotY, COLORS.pier, COLORS.pier, { top: false });
    }
    // crosshead: the full width of the girders, on a narrower seat
    S.box(...xzAt(s, 0), capBotY + 0.45, capTopY, 1.8, TOTAL_W - 2.2, angle, COLORS.cap, { bottom: true });
    S.box(...xzAt(s, 0), capBotY, capBotY + 0.45, 1.8, PIER_LEN - 0.8, angle, COLORS.cap);
  }

  // ---- abutments: a wall under each deck end, down into the bank, with short wing walls ----
  for (const [s, dirSign] of ([[s0, -1], [s1, 1]] as any[])) {
    const pos = xzAt(s + dirSign * 1.2, 0);
    const topY = deckTop(s) - SLAB_H;
    S.box(pos[0], pos[1], LAND_Y - 3, topY, 2.4, TOTAL_W + 0.6, angle, COLORS.pier);
  }
}

function buildRailings(S, ctx, stations, s0, s1) {
  const { normal, angle, deckTop, xzAt, ptAt } = ctx;
  // ---- railings (Street View): on a low concrete kerb at the deck edge, grey steel posts every 2.5 m, a top and a
  // bottom rail, and in each bay a pale framed panel with a square medallion between groups of vertical bars ----
  const railV = TOTAL_W / 2 - 0.2;
  for (const side of [-1, 1]) {
    const v = side * railV;
    for (let i = 0; i + 1 < stations.length; i++) {
      const sa = stations[i];
      const sb = stations[i + 1];
      if (sa < s0 - 1e-6 || sb > s1 + 1e-6) continue;
      const ya = deckTop(sa) + KERB_H;
      const yb = deckTop(sb) + KERB_H;
      for (const faceSign of [-1, 1]) {
        S.quad(ptAt(sa, v + faceSign * 0.17, ya), ptAt(sb, v + faceSign * 0.17, yb), ptAt(sb, v + faceSign * 0.17, yb + RAIL_PLINTH_H), ptAt(sa, v + faceSign * 0.17, ya + RAIL_PLINTH_H), COLORS.plinth, [faceSign * side * normal[0], 0, faceSign * side * normal[1]]);
      }
      S.quad(ptAt(sa, v - 0.17, ya + RAIL_PLINTH_H), ptAt(sa, v + 0.17, ya + RAIL_PLINTH_H), ptAt(sb, v + 0.17, yb + RAIL_PLINTH_H), ptAt(sb, v - 0.17, yb + RAIL_PLINTH_H), COLORS.plinth, [0, 1, 0]);
    }
    const bayCount = Math.round(BRIDGE_LEN / RAIL_BAY);
    const bayLen = BRIDGE_LEN / bayCount;
    for (let k = 0; k <= bayCount; k++) {
      const s = s0 + k * bayLen;
      const pos = xzAt(s, v);
      const y = deckTop(s) + KERB_H + RAIL_PLINTH_H;
      S.box(pos[0], pos[1], y, y + RAIL_H + 0.05, 0.09, 0.09, angle, COLORS.post);
      // ball finial (two cones)
      S.cyl(pos[0], pos[1], y + RAIL_H + 0.05, y + RAIL_H + 0.11, 0.03, 0.065, 6, COLORS.post, { cap: false });
      S.cyl(pos[0], pos[1], y + RAIL_H + 0.11, y + RAIL_H + 0.18, 0.065, 0.008, 6, COLORS.post, { cap: false });
      if (k === bayCount) break;
      const nextS = s + bayLen;
      const nextY = deckTop(nextS) + KERB_H + RAIL_PLINTH_H;
      const lerpY = (u) => y + ((nextY - y) * (u - s)) / bayLen;
      S.beam(ptAt(s, v, y + RAIL_H), ptAt(nextS, v, nextY + RAIL_H), 0.07, 0.06, COLORS.rail);
      S.beam(ptAt(s, v, y + 0.1), ptAt(nextS, v, nextY + 0.1), 0.05, 0.05, COLORS.rail);
      // the panel: a thin frame 1.1 m long in the middle of the bay holding a fine diagonal lattice, a small
      // medallion at its centre, bars either side
      const midS = s + bayLen / 2;
      const f0 = midS - 0.55;
      const f1 = midS + 0.55;
      const h0 = 0.22;
      const h1 = 0.88;
      for (const h of [h0, h1]) S.beam(ptAt(f0, v, lerpY(f0) + h), ptAt(f1, v, lerpY(f1) + h), 0.018, 0.025, COLORS.panel);
      for (const u of [f0, f1]) S.beam(ptAt(u, v, lerpY(u) + h0), ptAt(u, v, lerpY(u) + h1), 0.018, 0.025, COLORS.panel);
      for (const [u0, u1] of ([[f0, midS - 0.13], [midS + 0.13, f1]] as any[])) {
        S.beam(ptAt(u0, v, lerpY(u0) + h0), ptAt(u1, v, lerpY(u1) + h1), 0.012, 0.015, COLORS.panel);
        S.beam(ptAt(u0, v, lerpY(u0) + h1), ptAt(u1, v, lerpY(u1) + h0), 0.012, 0.015, COLORS.panel);
      }
      const medPos = xzAt(midS, v);
      const medY = lerpY(midS) + (h0 + h1) / 2;
      S.box(medPos[0], medPos[1], medY - 0.1, medY + 0.1, 0.2, 0.025, angle, COLORS.panel);
      for (const h of [h0, h1]) S.beam(ptAt(midS, v, lerpY(midS) + h), ptAt(midS, v, medY + (h > 0.5 ? 0.1 : -0.1)), 0.012, 0.015, COLORS.panel);
      for (let u = s + 0.2; u < nextS - 0.1; u += 0.15) {
        if (u > f0 - 0.05 && u < f1 + 0.05) continue;
        S.beam(ptAt(u, v, lerpY(u) + 0.1), ptAt(u, v, lerpY(u) + RAIL_H), 0.018, 0.018, COLORS.rail);
      }
    }
  }
}

function buildLampPosts(S, profile, pts) {
  // ---- lamp posts (Street View): pale grey, on the railing line, in pairs every 30 m; a tapered pole on a plinth, a
  // curved arm with a brace carrying a flat lantern over the carriageway. Positions from geo/bridges.js bridgeLamps,
  // which also places the night glow at the lantern (geo/city.js) ----
  const lampSpec = profile.lamps;
  for (const { y, sides } of bridgeLamps(profile, pts)) {
    for (const { n: outNorm, foot, head } of sides) {
      const baseY = y + KERB_H;
      const armTopY = y + lampSpec.h + 0.12;
      const outAngle = Math.atan2(outNorm[1], outNorm[0]);
      S.box(foot[0], foot[1], baseY, baseY + 0.5, 0.34, 0.34, outAngle, COLORS.lamp);
      S.cyl(foot[0], foot[1], baseY + 0.5, y + lampSpec.h + 0.45, 0.1, 0.06, 6, COLORS.lamp, { cap: true });
      // arm: a quadratic curve from the pole up and over to the lantern; a brace below it
      const reach = lampSpec.at - lampSpec.head;
      const armPt = (frac, yStart, yCtrl) => {
        const offset = reach * frac * frac;
        const yy = (1 - frac) * (1 - frac) * yStart + 2 * frac * (1 - frac) * yCtrl + frac * frac * armTopY;
        return [foot[0] - outNorm[0] * offset, yy, foot[1] - outNorm[1] * offset];
      };
      const drawCurve = (yStart, yCtrl, maxFrac) => {
        let prev = armPt(0, yStart, yCtrl);
        for (let i = 1; i <= 5; i++) {
          const next = armPt((maxFrac * i) / 5, yStart, yCtrl);
          S.beam(prev, next, 0.06, 0.06, COLORS.lamp);
          prev = next;
        }
      };
      drawCurve(y + lampSpec.h - 0.6, y + lampSpec.h + 0.35, 1);
      drawCurve(y + lampSpec.h - 1.3, y + lampSpec.h - 0.3, 0.55);
      S.box(head[0], head[1], armTopY - 0.1, armTopY + 0.02, 0.75, 0.3, outAngle, COLORS.lantern, { bottom: true });
    }
  }
}

export function build({ data, S }) {
  const bridge = (data.bridges || []).find((entry) => entry.n === 'Cầu Phú Xuân');
  if (!bridge) throw new Error('no Cầu Phú Xuân outline in data.bridges');
  const ring = unflat(bridge.ring);
  const profiles = bridgeProfiles(data);
  // the carriageway: the class 0–1 bridge road whose middle falls in the outline (what bridges.js names)
  let road = null;
  for (const entry of data.roads || []) {
    if (!entry[1] || (entry[0] | 0) > 1) continue;
    const pts = unflat(entry[2]);
    const startPt = pts[0];
    const endPt = pts[pts.length - 1];
    if (inRing((startPt[0] + endPt[0]) / 2, (startPt[1] + endPt[1]) / 2, ring) && profiles.get(entry[2])) {
      road = { pts, profile: profiles.get(entry[2]) };
      break;
    }
  }
  if (!road) throw new Error('Cầu Phú Xuân carriageway not found');
  const { pts, profile } = road;
  const startPt = pts[0];
  const endPt = pts[pts.length - 1];
  const roadLen = Math.hypot(endPt[0] - startPt[0], endPt[1] - startPt[1]);
  const dir = [(endPt[0] - startPt[0]) / roadLen, (endPt[1] - startPt[1]) / roadLen];
  const normal = [-dir[1], dir[0]];
  const angle = Math.atan2(dir[1], dir[0]);

  // along-axis extent of the outline: the 374.65 m bridge is centred in it
  let lo = Infinity;
  let hi = -Infinity;
  for (const pt of ring) {
    const s = (pt[0] - startPt[0]) * dir[0] + (pt[1] - startPt[1]) * dir[1];
    lo = Math.min(lo, s);
    hi = Math.max(hi, s);
  }
  const midS = (lo + hi) / 2;
  const s0 = midS - BRIDGE_LEN / 2;
  const s1 = midS + BRIDGE_LEN / 2;

  // supports along the road, south end first wherever the way starts: the two short spans, then MAIN_SPANS equal ones
  const southFirst = startPt[1] > endPt[1];
  const dirSign = southFirst ? 1 : -1;
  const southS = southFirst ? s0 : s1;
  const northS = southFirst ? s1 : s0;
  const supports = [southS, ...SHORT_SPANS.map((offset) => southS + dirSign * offset)];
  for (let k = 1; k <= MAIN_SPANS; k++) supports.push(supports[2] + ((northS - supports[2]) * k) / MAIN_SPANS);
  if (!southFirst) supports.reverse();
  const spans = supports.slice(1).map((endS, i) => {
    const startS = supports[i];
    const isShort = southFirst ? i < 2 : i >= supports.length - 3;
    return { a: startS, b: endS, depth: isShort ? SHALLOW_H : GIRDER_H };
  });

  const deckTop = (s) => Math.max(BRIDGE_TOP, profile.base(s)) + profile.bump(s); // carriageway surface, as the traffic rides it
  const xzAt = (s, v): [number, number] => [startPt[0] + dir[0] * s + normal[0] * v, startPt[1] + dir[1] * s + normal[1] * v];
  const ptAt = (s, v, y) => {
    const pos = xzAt(s, v);
    return [pos[0], y, pos[1]];
  };
  const landPolys = (data.land || []).map((entry) => (Array.isArray(entry[0]) ? entry.map(unflat) : [unflat(entry)]));
  const onLand = (pos) => landPolys.some(([outer, ...holes]) => inRing(pos[0], pos[1], outer) && !holes.some((hole) => inRing(pos[0], pos[1], hole)));
  const groundAt = (s, v) => {
    const pos = xzAt(s, v);
    return LAND_Y + rise(pos[0], pos[1]);
  };
  const ctx = { normal, angle, deckTop, xzAt, ptAt, onLand, groundAt };

  const stations = [];
  for (let s = 0; s < roadLen; s += DECK_STEP) stations.push(s);
  stations.push(roadLen);
  for (const s of [s0, s1]) if (!stations.includes(s)) stations.push(s);
  stations.sort((a, b) => a - b);

  S.kind = KIND.PLAIN;
  buildDeckAndMarkings(S, ctx, stations, supports, s0, s1);
  buildGirdersAndPiers(S, ctx, spans, supports, s0, s1);
  buildRailings(S, ctx, stations, s0, s1);
  buildLampPosts(S, profile, pts);
  S.kind = KIND.PLAIN;
}
