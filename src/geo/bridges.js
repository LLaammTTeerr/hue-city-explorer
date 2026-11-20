import { LAND_Y, ROAD_MAX } from '../config.js';
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
//    city.js leaves its generic deck out. The three Ngoại Kim Thủy bridges are small single-vault stone bridges in front of it.
// Illustrative: the crown rises (no surveyed long sections were found), the number of vaults, the default rule.
// Big modern river bridges keep a level deck: Dã Viên (and its approaches), any run over 150 m; Phú Xuân climbs (below).
// Trường Tiền and Nguyễn Hoàng are hand models elsewhere; the Bạch Hổ rail bridge is not a road.

const NAMED = {
  'Cầu Trung Đạo': { own: true },
  'Cầu Ngoại Kim Thuỷ': { rise: 1.4, arches: 1 },
  'Cầu Ngoại Kim Thủy': { rise: 1.4, arches: 1 },
  // one 8.4 m vault in a 71.7 m masonry dam, 8.05 m high; the deck crowns over the vault (landmarks/places/thuyquan.js)
  'Đông Thành Thủy Quan': { rise: 4.3, ramp: 0.45 },
  'Cầu Gia Hội': { rise: 1.1 },
  'Cầu Nhà Đồ': { rise: 1.0 },
  'Cầu Cửa Ngăn': { rise: 1.0 },
  'Cầu Cửa Thượng Tứ': { rise: 1.0 },
  // 1971 girder bridge: the deck climbs off each bank within ~40 m, then crowns gently (landmarks/places/phuxuan.js)
  'Cầu Phú Xuân': { rise: 4.2, ramp: 0.1 },
  'Cầu Dã Viên': { rise: 0 },
  'Cầu Trường Tiền': { rise: 0 },
  'Cầu Nguyễn Hoàng': { rise: 0 },
};
const RUN_FLAT = 150; // a bridge run longer than this keeps its level deck

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
    list.push({ c: Math.max(0, Math.min(ROAD_MAX, r[0] | 0)), flat: r[2], pts, len: pathLength(pts) });
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
  list.forEach((b, i) => {
    const a = b.pts[0], e = b.pts[b.pts.length - 1], m = [(a[0] + e[0]) / 2, (a[1] + e[1]) / 2];
    let named = null;
    for (const q of bridges) if (q.n && NAMED[q.n] && inRing(m[0], m[1], unflat(q.ring))) { named = q.n; break; }
    if (named && NAMED[named].own) return;
    let r, arches = 0, ramp = 0;
    if (named) ({ rise: r, arches = 0, ramp = 0 } = NAMED[named]);
    else if (runLen[runOf[i]] > RUN_FLAT || b.len > RUN_FLAT || runN[runOf[i]] > 1) r = 0; // (a run in pieces would hump twice)
    // footbridges and lanes over canals hump noticeably; road bridges over the moat and the canals get a camber
    else if (b.c >= 4) r = clamp(b.len / 14, 0.5, 1.5);
    else r = clamp(b.len * 0.02, 0.4, 1.1);
    map.set(b.flat, Object.assign(makeProfile(b.pts, b.len, b.c, r, arches, ramp), { name: named }));
  });
  cache = { data, map };
  return map;
}

function makeProfile(pts, len, c, riseM, arches, climb = 0) {
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
  const bump = climb ? (s) => { const t = s / (len || 1); return riseM * ss(t / climb) * ss((1 - t) / climb) * (0.82 + 0.18 * hump(t)); } : (s) => riseM * hump(s / (len || 1));
  const thick = c <= 2 ? 1.3 : 0.7;
  const prof = { len, c, rise: riseM, arches, top, lift, thick, base, bump, y: (s) => base(s) + bump(s), breaks: [] };
  if (arches) {
    // vaults springing just above the water, between solid abutments; each as high as the deck above lets it be
    const spring = waterY(mp[0], mp[1]) + 0.15;
    const z0 = len * (arches === 1 ? 0.24 : 0.12), z1 = len - z0, pier = arches === 1 ? 0 : Math.max(0.9, ((z1 - z0) / arches) * 0.22);
    const span = (z1 - z0 - pier * (arches - 1)) / arches;
    const vaults = [];
    for (let k = 0; k < arches; k++) {
      const a = z0 + k * (span + pier), b = a + span, h = Math.min(span * 0.5, prof.y((a + b) / 2) - thick - 0.3 - spring);
      if (h > 0.5) { vaults.push([a, b, h]); prof.breaks.push(a, a + 0.12, b - 0.12, b); }
    }
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
