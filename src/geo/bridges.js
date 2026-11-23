import { LAND_Y, ROAD_MAX, ROAD_W } from '../config.js';
import { rise, waterY } from './terrain.js';
import { inRing, pathLength, unflat } from './buf.js';

// The vertical profile of every generic road bridge: the deck rises from each bank to a crown at mid-span, as the
// small bridges of Huế do, instead of lying as a flat slab. Shared by geo/city.js (the slab, piers, parapets,
// lamps) and landmarks/life.js (traffic and lamp posts ride on the same curve).
//
// Facts used:
//  - The Ngự Hà bridges inside the Citadel are brick-and-stone vaulted bridges, rise to span about 1/6 (Khánh Ninh
//    and Vĩnh Lợi, 1825); Đông Thành Thủy Quan is the vaulted sluice where Ngự Hà leaves through the east wall
//    (Trương Hồng Trường, Tạp chí Khoa học ĐH Khoa học Huế; Đại Nam nhất thống chí via laodong.vn).
//  - Cầu Trung Đạo (Gia Long; over hồ Thái Dịch between Ngọ Môn and Thái Hòa) is a brick bridge on several vaults
//    (mia.vn); it is drawn with Thái Hòa (src/landmarks/places/thaihoa.js), so it gets no profile here (`own`) and
//    city.js leaves its generic deck out.
//  - Every other bridge of the Kinh thành (bridge = 2 from scripts/build-data.mjs: inside the walls, or over the moat
//    before a gate) is one shared brick bridge on round vaults: weathered brick, a lime-plastered ring round each arch,
//    a solid parapet with plastered coping and round medallions (the reference photo in issue #19). Its rise and
//    vaults come from the `citadel` rule below and src/geo/citadel-bridge.js draws it.
// Illustrative: the crown rises (no surveyed long sections were found), the number of vaults, the default rule.
// Big modern river bridges keep a level deck: any run over 150 m; Phú Xuân is graded gently off its ends and Dã Viên
// climbs (below).
// Trường Tiền and Nguyễn Hoàng are hand models elsewhere; the Bạch Hổ rail bridge is not a road.

const NAMED = {
  'Cầu Trung Đạo': { own: true },
  // one 8.4 m vault in a 71.7 m masonry dam, 8.05 m high; the deck crowns over the vault (landmarks/places/thuyquan.js)
  'Đông Thành Thủy Quan': { rise: 4.3, ramp: 0.45 },
  // a girder bridge over sông Đông Ba, carried at street level on the ~2.6 m quay walls with only a slight crown
  // (Street View from Chi Lăng and Bạch Đằng: a long level deck line over a dark void); it lands at grade on both
  // banks and the mapped ways run on as street past the abutments. It carries its own lamps (`lit`: drawn by
  // landmarks/places/giahoi.js), so the generic posts and glows keep 5 m clear of it.
  'Cầu Gia Hội': { rise: 0.5, water: true, lit: 5 },
  'Cầu Cửa Ngăn': { rise: 1.0 }, // its own causeway with balustrades (landmarks/places/gate-cua-ngan.js)
  // 1971 girder bridge (landmarks/places/phuxuan.js): a long, nearly level deck (Street View from the Lê Lợi end sees
  // the whole deck and both lamp rows to the far bank). It lands at street level and climbs at a steady grade off each
  // end (`ends`: [grade, metres], south and north end), then crowns gently to `rise` at mid-span. The south grade is
  // the least that keeps ~2 m of headroom over the lim boardwalk that passes under the deck ~29 m off the Lê Lợi end
  // (deck 1.2 m, places/golim.js; the end span over it is a shallow one, phuxuan.js). The model's bank is lower over
  // the boardwalk than the real one, so the real deck can be level there; the north end has no such constraint.
  // lamps (Street View): pale grey ~10 m posts on the railing line, `at` m off the axis, in pairs every `step` m, each
  // with a curved arm carrying its lantern over the carriageway to `head` m off the axis, `h` m over the deck; drawn
  // by the place file `own` (bridgeLamps below), the night glow in its lantern (geo/city.js)
  'Cầu Phú Xuân': { rise: 2.1, ends: { south: [0.05, 30], north: [0.022, 50] }, lamps: { step: 30, at: 9.9, head: 7.4, h: 9.3, own: 'phuxuan' } },
  // 2012 girder bridge: its deck stands ~2 m above the 1908 rail deck beside it (Street View, the truss's top chord
  // against the parapet; landmarks/places/bachho.js), climbing off each bank within ~30 m
  'Cầu Dã Viên': { rise: 2.0, ramp: 0.12 },
  'Cầu Trường Tiền': { rise: 0 },
  'Cầu Nguyễn Hoàng': { rise: 0 },
};
// Bridges that carry their own lamps (NAMED `lit`: m around the mapped outline): a generic street lamp (geo/city.js
// glow, landmarks/life.js post, an embankment post of landmarks/riverlights.js) whose lantern would stand on the deck or within that distance of it is left out, so
// it does not stand beside the bridge's own lamp standards. True at (x, z) for such a lantern.
const litCache = new WeakMap();
export function ownLit(data, x, z) {
  let rings = litCache.get(data);
  if (!rings) {
    rings = (data.bridges || []).filter((q) => q.n && NAMED[q.n] && NAMED[q.n].lit).map((q) => ({ ring: unflat(q.ring), pad: NAMED[q.n].lit }));
    litCache.set(data, rings);
  }
  for (const { ring, pad } of rings) {
    if (inRing(x, z, ring)) return true;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz;
      const t = l2 ? clamp(((x - a[0]) * dx + (z - a[1]) * dz) / l2, 0, 1) : 0;
      if (Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z) < pad) return true;
    }
  }
  return false;
}
// Unnamed bridges, by a point on the way's middle (within 4 m): the deck rise their OSM structure calls for.
const AT = [
  // Tàng Thư Lâu's bridge (OSM 1431132265, bridge:structure=beam): a level deck on piers, as the satellite shows it,
  // not the footbridge hump (landmarks/places/tangthulau.js)
  { p: [-1347.6, -1299.9], rise: 0.15 },
];
const RUN_FLAT = 150; // a bridge run longer than this keeps its level deck
// the street surface over the flat floor (geo/city.js lays carriageways at LAND_Y + 0.05 + 0.01) and the deck's
// default top at the banks (BRIDGE_TOP in landmarks/life.js): a deck that lands at grade comes down by the difference
export const STREET = 0.06;
const DECK = 0.42;
export const LAND_RAMP = 6; // m: a deck's last stretch, where it comes down from DECK to the street
export const ABUT = 1.8; // a `water` bridge's abutment: the deck lands this far past the water's edge

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// 0 at both banks, 1 at mid-span; level where it meets the road, round at the crown
export const hump = (t) => (1 - Math.cos(2 * Math.PI * clamp(t, 0, 1))) / 2;

let cache = null;
// Map from a road's flat coordinate array (data.roads[i][2]) to its deck profile.
export function bridgeProfiles(data) {
  if (cache && cache.data === data) return cache.map;
  const map = new Map();
  const list = [];
  for (const r of data.roads || []) {
    if (!Array.isArray(r) || !r[1] || !Array.isArray(r[2]) || r[2].length < 4) continue;
    const pts = unflat(r[2]);
    list.push({ c: Math.max(0, Math.min(ROAD_MAX, r[0] | 0)), citadel: r[1] === 2, flat: r[2], pts, len: pathLength(pts) });
  }
  // bridges mapped in pieces (a river bridge and its approach spans) are one run: measure the whole of it
  const key = (p) => Math.round(p[0]) + ',' + Math.round(p[1]);
  const ends = new Map();
  list.forEach((b, i) => { for (const p of [b.pts[0], b.pts[b.pts.length - 1]]) { const k = key(p); if (!ends.has(k)) ends.set(k, []); ends.get(k).push(i); } });
  const runOf = new Array(list.length).fill(-1), runLen = [], runN = [];
  list.forEach((_, i0) => {
    if (runOf[i0] >= 0) return;
    const id = runLen.length, stack = [i0];
    let total = 0, pieces = 0;
    runOf[i0] = id;
    while (stack.length) {
      const i = stack.pop(), b = list[i];
      total += b.len; pieces++;
      for (const p of [b.pts[0], b.pts[b.pts.length - 1]]) for (const j of ends.get(key(p)) || []) if (runOf[j] < 0 && list[j].c >= 4 === b.c >= 4) { runOf[j] = id; stack.push(j); }
    }
    runLen.push(total); runN.push(pieces);
  });
  const bridges = data.bridges || [];
  const todo = [], water = new Map(); // a `water` bridge's ways, by name: their structure ends are made to agree
  list.forEach((b, i) => {
    const a = b.pts[0], e = b.pts[b.pts.length - 1], m = [(a[0] + e[0]) / 2, (a[1] + e[1]) / 2];
    let named = null;
    for (const q of bridges) if (q.n && NAMED[q.n] && inRing(m[0], m[1], unflat(q.ring))) { named = q.n; break; }
    if (named && NAMED[named].own) return;
    let r, arches = 0, ramp = 0, vaults = null, ends = null;
    if (named) ({ rise: r, arches = 0, ramp = 0, ends = null } = NAMED[named]);
    else if (AT.some((q) => Math.hypot(q.p[0] - m[0], q.p[1] - m[1]) < 4)) r = AT.find((q) => Math.hypot(q.p[0] - m[0], q.p[1] - m[1]) < 4).rise;
    else if (b.citadel) ({ r, arches, vaults } = citadelRule(data, b));
    else if (runLen[runOf[i]] > RUN_FLAT || b.len > RUN_FLAT || runN[runOf[i]] > 1) r = 0; // (a run in pieces would hump twice)
    // footbridges and lanes over canals hump noticeably; road bridges over the moat and the canals get a camber
    else if (b.c >= 4) r = clamp(b.len / 14, 0.5, 1.5);
    else r = clamp(b.len * 0.02, 0.4, 1.1);
    const t = { b, named, r, arches, ramp, span: null, vaults, shape: ends ? endGrades(b.pts, b.len, r, ends) : null };
    todo.push(t);
    if (named && NAMED[named].water) { if (!water.has(named)) water.set(named, []); water.get(named).push(t); }
  });
  for (const ways of water.values()) waterSpans(data, ways);
  for (const { b, named, r, arches, ramp, span, vaults, shape } of todo) {
    const P = makeProfile(b.pts, b.len, b.c, r, arches, ramp, span, vaults, shape);
    map.set(b.flat, Object.assign(P, { name: named, citadel: !!vaults && !named }, named && NAMED[named].lamps && b.c <= 2 ? { lamps: NAMED[named].lamps } : {}));
  }
  cache = { data, map };
  return map;
}

// The citadel's bridge: a hump of about a tenth of its length (rise to span ~1/6 over the water, as Khánh Ninh and
// Vĩnh Lợi), on one vault over a narrow crossing and three over a wide one, the vaults spread over the water it
// crosses (not the way's whole length: the gate causeways run on over the moat's banks), between solid abutments.
const CIT_DECK = 0.55; // the vault crown's masonry over the arch, under the road
function citadelRule(data, b) {
  const { pts, len } = b;
  let first = null, last = null;
  for (let s = 0; s <= len + 1e-6; s += 0.5) {
    const { x, z } = at(pts, s);
    if (rise(x, z) > 0.05 || onLand(data, x, z)) continue;
    if (first === null) first = s;
    last = s;
  }
  const r = clamp(len / 10, 1.2, 2.2);
  if (first === null || last - first < 2) return { r, arches: 0, vaults: [] }; // over no drawn water: the solid hump
  const wet = last - first, arches = wet > 22 ? 3 : 1;
  const a = clamp(first - 0.6, len * 0.12, len * 0.5 - 1), e = clamp(last + 0.6, len * 0.5 + 1, len * 0.88);
  return { r, arches, vaults: [a, e] };
}

// data.land is the dry ground (rings with holes, even-odd, in decimetres); the canals and rivers lie outside it
export function onLand(data, x, z) {
  let c = false;
  for (const poly of data.land || []) for (const r of poly) if (inRingFlat(x * 10, z * 10, r)) c = !c;
  return c;
}
function inRingFlat(x, z, ring) {
  let c = false;
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
    const xi = ring[i], zi = ring[i + 1], xj = ring[j], zj = ring[j + 1];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}
// Where a `water` bridge is structure: over the water and its abutments. OSM bridge ways often run on past the banks
// (Gia Hội's west ends overshoot the Huỳnh Thúc Kháng junction by ~20 m) and end staggered (its two carriageways' east
// ends are 4 m apart): the structure is only the stretch over the water, ABUT past each edge, with both ends square
// across the bridge (as the mapped outline is) and inside every way, so that each way runs on as street from the
// same line. Sets each way's span: [s0, s1] along it.
function waterSpans(data, ways) {
  // the bridge's axis: the first way's direction; u along it
  const p0 = ways[0].b.pts[0], p1 = ways[0].b.pts[ways[0].b.pts.length - 1], L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1;
  const t = [(p1[0] - p0[0]) / L, (p1[1] - p0[1]) / L], U = (x, z) => (x - p0[0]) * t[0] + (z - p0[1]) * t[1];
  let E = -Infinity, W = Infinity;
  for (const w of ways) {
    const { pts, len } = w.b;
    let first = null, last = null;
    w.u = [];
    for (let s = 0; s <= len + 1e-6; s += 0.25) {
      const { x, z } = at(pts, s), u = U(x, z);
      w.u.push([s, u]);
      if (rise(x, z) > 0.05 || onLand(data, x, z)) continue;
      if (first === null || u < first) first = u;
      if (last === null || u > last) last = u;
    }
    const ua = Math.min(...w.u.map((q) => q[1])), ub = Math.max(...w.u.map((q) => q[1]));
    if (first === null || last - first < 4) return; // not over water after all: a plain profile
    E = Math.max(E, ua, first - ABUT);
    W = Math.min(W, ub, last + ABUT);
  }
  if (!(W - E > 4)) return;
  // a street crossing at grade by the bank (Gia Hội's west end lands on Huỳnh Thúc Kháng, which runs along the quay
  // about a metre back from the water) is street, not abutment: the deck and its raised footways stop at its kerb
  // instead of standing on its carriageway. Streets that start where a bridge way ends are its approaches and meet
  // the deck edge to edge, so they are left out.
  const cross = crossingStreets(data, ways), mid = (E + W) / 2;
  for (const w of ways) {
    const { pts } = w.b, half = ROAD_W[w.b.c] / 2 + FOOTWAY;
    for (const [s, u] of w.u) {
      const { x, z } = at(pts, s), a = at(pts, Math.max(0, s - 0.5)), b = at(pts, s + 0.5);
      const l = Math.hypot(b.x - a.x, b.z - a.z) || 1, nx = -(b.z - a.z) / l, nz = (b.x - a.x) / l;
      if (![0, -half, half].some((o) => cross(x + nx * o, z + nz * o))) continue;
      if (u > mid) W = Math.min(W, u - 0.25);
      else E = Math.max(E, u + 0.25);
    }
  }
  if (!(W - E > 4)) return;
  for (const w of ways) {
    const sAt = (u0) => { let best = w.u[0]; for (const q of w.u) if (Math.abs(q[1] - u0) < Math.abs(best[1] - u0)) best = q; return best[0]; };
    const a = sAt(E), b = sAt(W), len = w.b.len, snap = (v) => (v < 0.3 ? 0 : v > len - 0.3 ? len : v);
    w.span = [snap(Math.min(a, b)), snap(Math.max(a, b))];
    delete w.u;
  }
}
const FOOTWAY = 2.1; // a road bridge's footway and parapet beyond its carriageway, each side
const CROSS_PAD = 0.3;
// (x, z) on a street (class 0-3, not a bridge) near the bridge that is not one of its approaches
function crossingStreets(data, ways) {
  const ends = ways.flatMap((w) => [w.b.pts[0], w.b.pts[w.b.pts.length - 1]]);
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const w of ways) for (const p of w.b.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
  const M = 30, segs = [];
  for (const r of data.roads || []) {
    if (!Array.isArray(r) || r[1] || !Array.isArray(r[2]) || r[2].length < 4 || (r[0] | 0) > 3) continue;
    const f = r[2], n = f.length;
    const touches = [[f[0] / 10, f[1] / 10], [f[n - 2] / 10, f[n - 1] / 10]].some((p) => ends.some((e) => Math.hypot(p[0] - e[0], p[1] - e[1]) < 1.5));
    if (touches) continue;
    for (let i = 0; i + 3 < n; i += 2) {
      const ax = f[i] / 10, az = f[i + 1] / 10, bx = f[i + 2] / 10, bz = f[i + 3] / 10;
      if (Math.max(ax, bx) < x0 - M || Math.min(ax, bx) > x1 + M || Math.max(az, bz) < z0 - M || Math.min(az, bz) > z1 + M) continue;
      segs.push([ax, az, bx, bz, ROAD_W[r[0] | 0] / 2 + CROSS_PAD]);
    }
  }
  return (x, z) => segs.some(([ax, az, bx, bz, hw]) => {
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
    const t = l2 ? clamp(((x - ax) * dx + (z - az) * dz) / l2, 0, 1) : 0;
    return Math.hypot(ax + dx * t - x, az + dz * t - z) < hw;
  });
}
function at(pts, s) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (s <= l || i + 2 === pts.length) { const t = l ? clamp(s / l, 0, 1) : 0; return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t }; }
    s -= l;
  }
  return { x: pts[0][0], z: pts[0][1] };
}

// A long deck's rise over its street ends, h(s) (0 at both ends, riseM at mid-span), from the grade off each end:
// ends = { south: [grade, run], north: [grade, run] }, matched to the way's ends by which lies further south (+z), so
// a reversed OSM way keeps its profile. Off each end the slope eases in over EASE m (a vertical curve where the deck
// leaves the street), holds the grade for the run, eases over BLEND m to a lower one and falls off to level at
// mid-span (a parabolic crown); that lower grade is solved so both halves reach riseM. Tabulated every 0.5 m.
const EASE = 5, BLEND = 14;
function endGrades(pts, len, riseM, ends) {
  const M = len / 2, southFirst = pts[0][1] > pts[pts.length - 1][1];
  const half = ([g, run]) => {
    run = Math.min(run, M * 0.6);
    const b = Math.min(BLEND, M - run), tail = M - run - b;
    // rise of the fixed part, and of the blend + tail per unit of the lower grade g2
    const fixed = (g * EASE) / 2 + g * (run - EASE) + (g * b) / 2, per = b / 2 + tail / 2;
    const g2 = clamp((riseM - fixed) / (per || 1), 0, g);
    const slope = (d) => (d < EASE ? (g * d) / EASE : d < run ? g : d < run + b ? g + ((g2 - g) * (d - run)) / b : g2 * Math.max(0, 1 - (d - run - b) / (tail || 1)));
    const tab = [0];
    for (let d = 0.5; d <= M + 0.5; d += 0.5) tab.push(tab[tab.length - 1] + 0.25 * (slope(d - 0.5) + slope(d)));
    return (d) => { const i = clamp(d / 0.5, 0, tab.length - 1), k = Math.floor(i), f = i - k; return tab[k] + ((tab[Math.min(k + 1, tab.length - 1)] - tab[k]) * f); };
  };
  const hs = half(ends.south), hn = half(ends.north);
  const h0 = southFirst ? hs : hn, h1 = southFirst ? hn : hs;
  // the two halves meet at mid-span; any mismatch (a grade too steep for riseM) is spread over the whole length
  const m0 = h0(M), m1 = h1(M);
  return (s) => {
    s = clamp(s, 0, len);
    const h = s <= M ? h0(s) : h1(len - s), mismatch = s <= M ? m0 : m1;
    return h + (riseM - mismatch) * (s <= M ? s / M : (len - s) / M);
  };
}

function makeProfile(pts, len, c, riseM, arches, climb = 0, span = null, zone = null, shape = null) {
  // the bank-to-bank deck: its two ends stand on the approach roads' ground (the same `rise` the street is laid on),
  // and between them it follows its own profile, level or climbing straight from one bank to the other. The ground
  // under the span (water, a ravine, a lake held at its level) is never read: on a 25 m grid it would bend the deck.
  const p0 = pts[0], pn = pts[pts.length - 1], mp = pts[pts.length >> 1];
  const e0 = rise(p0[0], p0[1]), e1 = rise(pn[0], pn[1]);
  const lift = Math.min(e0, e1);
  const top = LAND_Y + lift + 0.42;
  const ramp = Math.abs(e0 - e1) > 0.25;
  const base = ramp ? (s) => LAND_Y + e0 + 0.42 + ((e1 - e0) * s) / (len || 1) : () => top;
  // climb: reach most of the rise within that fraction of the length at each end, then a low crown (a long bridge)
  const ss = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
  // span: the deck is structure only over [a, b] (the water and its abutments), where it humps by riseM over the
  // street from street level at each abutment; outside it the way is street, flush with the roads it joins
  const G = STREET - DECK;
  // shape: a long deck graded off its ends (endGrades), from the street's surface at both ends
  const bump0 = shape ? (s) => G + shape(s) : span ? (s) => (s <= span[0] || s >= span[1] ? G : G + riseM * hump((s - span[0]) / (span[1] - span[0])))
    : climb ? (s) => { const t = s / (len || 1); return riseM * ss(t / climb) * ss((1 - t) / climb) * (0.82 + 0.18 * hump(t)); } : (s) => riseM * hump(s / (len || 1));
  // A road deck lands on the street it joins: from DECK over the bank it comes down to the street's own surface
  // (STREET, and the 0.12 m a carriageway on raised ground is laid above it, geo/city.js ribbon) over the last
  // LAND_RAMP m at each end. Left at DECK, every generic deck ended in a 0.36 m lip across the carriageway.
  // A span profile already lands at street level at its abutments. The citadel's brick bridges (zone) land too: left
  // at DECK their ends stood 0.37 m over the street they join, a brick step across the carriageway; their vaults are
  // sized under the landed deck below. Named arched bridges keep their masonry.
  let bump = bump0;
  const breaks = span ? [...span] : [];
  if (c <= 3 && !span && (!arches || zone)) {
    const R = Math.min(LAND_RAMP, len * 0.2);
    const street = (p) => LAND_Y + STREET + rise(p[0], p[1]) + (rise(p[0], p[1]) > 0 ? 0.12 : 0);
    const d0 = street(p0) - base(0) - bump0(0), d1 = street(pn) - base(len) - bump0(len);
    const k0 = Math.abs(d0) < 0.8 ? d0 : 0, k1 = Math.abs(d1) < 0.8 ? d1 : 0;
    if (k0 || k1) {
      bump = (s) => bump0(s) + k0 * (1 - ss(s / R)) + k1 * (1 - ss((len - s) / R));
      for (const s of [R * 0.5, R, len - R, len - R * 0.5]) if (s > 0 && s < len) breaks.push(s);
    }
  }
  const thick = zone ? CIT_DECK : c <= 2 ? 1.3 : 0.7;
  const prof = { len, c, rise: riseM, arches, top, lift, thick, base, bump, y: (s) => base(s) + bump(s), breaks, span };
  if (arches) {
    // vaults springing just above the water, between solid abutments; each as high as the deck above lets it be
    const spring = waterY(mp[0], mp[1]) + 0.15;
    const z0 = zone && zone.length ? zone[0] : len * (arches === 1 ? 0.24 : 0.12), z1 = zone && zone.length ? zone[1] : len - z0;
    const pier = arches === 1 ? 0 : Math.max(0.9, ((z1 - z0) / arches) * 0.22);
    const span = (z1 - z0 - pier * (arches - 1)) / arches;
    const vaults = [];
    for (let k = 0; k < arches; k++) {
      const a = z0 + k * (span + pier), b = a + span, h = Math.min(span * 0.5, prof.y((a + b) / 2) - thick - (zone ? 0 : 0.3) - spring);
      if (h > 0.5) { vaults.push([a, b, h]); prof.breaks.push(a, a + 0.12, b - 0.12, b); }
    }
    prof.vaults = vaults.map(([a, b, h]) => ({ a, b, h, spring }));
    prof.spring = spring;
    prof.bottom = (s) => {
      const deckBot = prof.y(s) - thick;
      for (const [a, b, h] of vaults) if (s > a && s < b) { const u = (2 * (s - a)) / (b - a) - 1; return Math.min(deckBot, spring + h * Math.sqrt(Math.max(0, 1 - u * u))); }
      return spring - 2.2; // abutments and piers go down into the water
    };
  }
  return prof;
}

// Points along a path every `step` metres or closer, keeping the original vertices and the given arc lengths.
// Returns { pts, s } with s the arc length of each point.
export function resample(pts, step, breaks = []) {
  const out = [pts[0]], ss = [0], br = [...breaks].sort((a, b) => a - b);
  let acc = 0, bi = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l < 1e-6) continue;
    const cuts = [];
    const n = Math.max(1, Math.ceil(l / step));
    for (let k = 1; k < n; k++) cuts.push((l * k) / n);
    while (bi < br.length && br[bi] < acc + l) { if (br[bi] > acc + 0.02) cuts.push(br[bi] - acc); bi++; }
    cuts.sort((x, y) => x - y);
    let last = 0;
    for (const d of cuts) { if (d - last < 0.02 || l - d < 0.02) continue; out.push([a[0] + ((b[0] - a[0]) * d) / l, a[1] + ((b[1] - a[1]) * d) / l]); ss.push(acc + d); last = d; }
    acc += l;
    out.push(b); ss.push(acc);
  }
  return { pts: out, s: ss };
}

// The piece of a path between arc lengths s0 and s1.
export function subPath(pts, s0, s1) {
  const out = [];
  let acc = 0;
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (acc + l >= s0 && acc <= s1 && l > 1e-9) {
      if (!out.length) out.push(lerp(a, b, clamp((s0 - acc) / l, 0, 1)));
      if (acc + l <= s1) out.push(b);
      else { out.push(lerp(a, b, clamp((s1 - acc) / l, 0, 1))); break; }
    }
    acc += l;
  }
  return out;
}

// A named bridge's own lamp posts (NAMED lamps): for each pair, along the way's path at arc length s, its deck surface y
// and per side (-1, 1) the pole's foot, the lantern's point and the outward unit normal. geo/city.js puts the night
// glows in the lanterns and the place file (lamps.own) draws the posts; landmarks/life.js leaves this way to them.
export function bridgeLamps(P, pts) {
  const L = P && P.lamps;
  if (!L) return [];
  const out = [];
  for (let s = L.step / 2; s <= P.len - L.step / 2 + 1; s += L.step) { // none at the very ends, where the streets take over
    const a = at(pts, Math.max(0, s - 0.5)), b = at(pts, Math.min(P.len, s + 0.5)), c = at(pts, s);
    const l = Math.hypot(b.x - a.x, b.z - a.z) || 1, n = [-(b.z - a.z) / l, (b.x - a.x) / l];
    const y = Math.max(LAND_Y + DECK, P.base(s)) + P.bump(s);
    out.push({ s, y, sides: [-1, 1].map((k) => ({ k, n: [n[0] * k, n[1] * k], foot: [c.x + n[0] * k * L.at, c.z + n[1] * k * L.at], head: [c.x + n[0] * k * L.head, c.z + n[1] * k * L.head] })) });
  }
  return out;
}
