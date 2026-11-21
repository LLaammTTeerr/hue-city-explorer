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
// Big modern river bridges keep a level deck: Dã Viên (and its approaches), any run over 150 m; Phú Xuân climbs (below).
// Trường Tiền and Nguyễn Hoàng are hand models elsewhere; the Bạch Hổ rail bridge is not a road.

const NAMED = {
  'Cầu Trung Đạo': { own: true },
  // one 8.4 m vault in a 71.7 m masonry dam, 8.05 m high; the deck crowns over the vault (landmarks/places/thuyquan.js)
  'Đông Thành Thủy Quan': { rise: 4.3, ramp: 0.45 },
  // a humped girder bridge over sông Đông Ba that lands at grade on both banks (landmarks/places/giahoi.js has the
  // sources and why 2 m): the crown stands over the water, the mapped ways run on at street level past the abutments
  'Cầu Gia Hội': { rise: 2.0, water: true },
  'Cầu Cửa Ngăn': { rise: 1.0 }, // its own causeway with balustrades (landmarks/places/gate-cua-ngan.js)
  // 1971 girder bridge: the deck climbs off each bank within ~40 m, then crowns gently (landmarks/places/phuxuan.js)
  'Cầu Phú Xuân': { rise: 4.2, ramp: 0.1 },
  'Cầu Dã Viên': { rise: 0 },
  'Cầu Trường Tiền': { rise: 0 },
  'Cầu Nguyễn Hoàng': { rise: 0 },
};
const RUN_FLAT = 150; // a bridge run longer than this keeps its level deck
// the street surface over the flat floor (geo/city.js lays carriageways at LAND_Y + 0.05 + 0.01) and the deck's
// default top at the banks (BRIDGE_TOP in landmarks/life.js): a deck that lands at grade comes down by the difference
export const STREET = 0.06;
const DECK = 0.42;
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
    let r, arches = 0, ramp = 0, vaults = null;
    if (named) ({ rise: r, arches = 0, ramp = 0 } = NAMED[named]);
    else if (b.citadel) ({ r, arches, vaults } = citadelRule(data, b));
    else if (runLen[runOf[i]] > RUN_FLAT || b.len > RUN_FLAT || runN[runOf[i]] > 1) r = 0; // (a run in pieces would hump twice)
    // footbridges and lanes over canals hump noticeably; road bridges over the moat and the canals get a camber
    else if (b.c >= 4) r = clamp(b.len / 14, 0.5, 1.5);
    else r = clamp(b.len * 0.02, 0.4, 1.1);
    const t = { b, named, r, arches, ramp, span: null, vaults };
    todo.push(t);
    if (named && NAMED[named].water) { if (!water.has(named)) water.set(named, []); water.get(named).push(t); }
  });
  for (const ways of water.values()) waterSpans(data, ways);
  for (const { b, named, r, arches, ramp, span, vaults } of todo) {
    const P = makeProfile(b.pts, b.len, b.c, r, arches, ramp, span, vaults);
    map.set(b.flat, Object.assign(P, { name: named, citadel: !!vaults && !named }));
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

function makeProfile(pts, len, c, riseM, arches, climb = 0, span = null, zone = null) {
  // the bank-to-bank deck as it was: level at the bank, or climbing between banks of different height, or at the
  // level of a lake in the hills
  const p0 = pts[0], pn = pts[pts.length - 1], mp = pts[pts.length >> 1];
  const lift = Math.min(rise(p0[0], p0[1]), rise(mp[0], mp[1]), rise(pn[0], pn[1]));
  const top = LAND_Y + lift + 0.42;
  const e0 = rise(p0[0], p0[1]), e1 = rise(pn[0], pn[1]);
  const ramp = Math.abs(e0 - e1) > 0.25;
  const lvl = Math.min(e0, e1) - lift < 0.25 ? LAND_Y + Math.min(e0, e1) + 0.42 : top;
  const base = ramp ? (s) => LAND_Y + e0 + 0.42 + ((e1 - e0) * s) / (len || 1) : () => lvl;
  // climb: reach most of the rise within that fraction of the length at each end, then a low crown (a long bridge)
  const ss = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
  // span: the deck is structure only over [a, b] (the water and its abutments), where it humps by riseM over the
  // street from street level at each abutment; outside it the way is street, flush with the roads it joins
  const G = STREET - DECK;
  const bump = span ? (s) => (s <= span[0] || s >= span[1] ? G : G + riseM * hump((s - span[0]) / (span[1] - span[0])))
    : climb ? (s) => { const t = s / (len || 1); return riseM * ss(t / climb) * ss((1 - t) / climb) * (0.82 + 0.18 * hump(t)); } : (s) => riseM * hump(s / (len || 1));
  const thick = zone ? CIT_DECK : c <= 2 ? 1.3 : 0.7;
  const prof = { len, c, rise: riseM, arches, top, lift, thick, base, bump, y: (s) => base(s) + bump(s), breaks: span ? [...span] : [], span };
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
