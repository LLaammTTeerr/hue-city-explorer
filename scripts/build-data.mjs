// Turns the raw Overpass extract (data/raw/hue-osm.json) into the compact scene
// bundle the app ships with (public/data/hue.json).
//
// Everything positional comes from OpenStreetMap. Two things are generated and
// flagged as illustration: infill houses along streets where OSM has no
// footprints yet, and trees.
import fs from 'node:fs';
import pc from 'polygon-clipping';
import zlib from 'node:zlib';

const RAW = 'data/raw/hue-osm.json';
const OUT = 'public/data/hue.json';

// Local frame: metres east (x) and south (z) of the middle of cầu Trường Tiền.
const ORIGIN = { lat: 16.468896, lon: 107.588858 };
const BBOX = { s: 16.382, w: 107.5385, n: 16.4965, e: 107.613 }; // west edge reaches chùa Thiên Mụ; south edge takes in the royal tombs down to lăng Minh Mạng
const CITY_S = 16.4455; // south of this line lie the hills: sparser houses and trees, real relief
const KX = Math.cos((ORIGIN.lat * Math.PI) / 180) * 111319.49;
const KZ = 110574;
const proj = (p) => [(p.lon - ORIGIN.lon) * KX, -(p.lat - ORIGIN.lat) * KZ];

const raw = JSON.parse(fs.readFileSync(RAW, 'utf8'));
const els = raw.elements;
// extra strips fetched with scripts/fetch-osm-strip.sh (data/raw/hue-osm-<name>.json) are merged in
{
  const have = new Set(els.map((e) => e.type + e.id));
  for (const f of fs.readdirSync('data/raw').filter((n) => /^hue-osm-.+\.json$/.test(n))) {
    const extra = JSON.parse(fs.readFileSync('data/raw/' + f, 'utf8')).elements;
    let added = 0;
    for (const e of extra) if (!have.has(e.type + e.id)) { have.add(e.type + e.id); els.push(e); added++; }
    console.log('merged', f, '+' + added, 'elements');
  }
}
const byId = new Map(els.map((e) => [e.type + e.id, e]));
const get = (type, id) => byId.get(type + id);

const [MINX, MAXZ] = proj({ lat: BBOX.s, lon: BBOX.w });
const [MAXX, MINZ] = proj({ lat: BBOX.n, lon: BBOX.e });
const CITY_MAXZ = proj({ lat: CITY_S, lon: BBOX.w })[1];
const inHills = (p) => p[1] > CITY_MAXZ;

// ---------- small geometry kit ----------
let seed = 20261119;
const rnd = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const rr = (a, b) => a + (b - a) * rnd();

const ringArea = (r) => {
  let a = 0;
  for (let i = 0, n = r.length; i < n; i++) {
    const p = r[i], q = r[(i + 1) % n];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
};
const centroid = (r) => {
  let x = 0, z = 0;
  for (const p of r) { x += p[0]; z += p[1]; }
  return [x / r.length, z / r.length];
};
const openRing = (r) => {
  const o = r.slice();
  const a = o[0], b = o[o.length - 1];
  if (o.length > 1 && Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6) o.pop();
  return o;
};
const pip = (pt, ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if (a[1] > pt[1] !== b[1] > pt[1] && pt[0] < ((b[0] - a[0]) * (pt[1] - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
};
const pipPoly = (pt, poly) => {
  let c = false;
  for (const ring of poly) if (pip(pt, ring)) c = !c;
  return c;
};
const pipMulti = (pt, multi) => multi.some((poly) => pipPoly(pt, poly));

function hull(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  const up = [];
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
// minimum-area oriented bounding box: { c:[x,z], w (long side), d (short side), a (angle of long side) }
function obb(points) {
  const h = hull(points);
  let best = null;
  for (let i = 0; i < h.length; i++) {
    const a = h[i], b = h[(i + 1) % h.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 1e-6) continue;
    const ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len;
    let mnU = Infinity, mxU = -Infinity, mnV = Infinity, mxV = -Infinity;
    for (const q of h) {
      const u = q[0] * ux + q[1] * uz, v = -q[0] * uz + q[1] * ux;
      if (u < mnU) mnU = u; if (u > mxU) mxU = u; if (v < mnV) mnV = v; if (v > mxV) mxV = v;
    }
    const area = (mxU - mnU) * (mxV - mnV);
    if (!best || area < best.area) {
      const cu = (mnU + mxU) / 2, cv = (mnV + mxV) / 2;
      let w = mxU - mnU, d = mxV - mnV, ang = Math.atan2(uz, ux);
      if (d > w) { [w, d] = [d, w]; ang += Math.PI / 2; }
      best = { area, c: [cu * ux - cv * uz, cu * uz + cv * ux], w, d, a: ang };
    }
  }
  return best;
}

// Stitch relation member ways into closed rings (roles in OSM are often wrong; nesting is resolved even-odd).
function stitch(ways) {
  const key = (p) => p.lat.toFixed(7) + ',' + p.lon.toFixed(7);
  const pool = ways.filter((g) => g && g.length > 1).map((g) => g.slice());
  const rings = [];
  while (pool.length) {
    let cur = pool.pop();
    let guard = 0;
    while (key(cur[0]) !== key(cur[cur.length - 1]) && guard++ < 5000) {
      const end = key(cur[cur.length - 1]);
      const i = pool.findIndex((g) => key(g[0]) === end || key(g[g.length - 1]) === end);
      if (i < 0) break;
      let nxt = pool.splice(i, 1)[0];
      if (key(nxt[0]) !== end) nxt = nxt.reverse();
      cur = cur.concat(nxt.slice(1));
    }
    if (key(cur[0]) === key(cur[cur.length - 1]) && cur.length >= 4) rings.push(cur.map(proj));
  }
  return rings;
}
function elementRings(e) {
  if (e.type === 'way') {
    const g = e.geometry;
    if (!g || g.length < 4) return [];
    const a = g[0], b = g[g.length - 1];
    if (a.lat !== b.lat || a.lon !== b.lon) return [];
    return [g.map(proj)];
  }
  if (e.type === 'relation') return stitch(e.members.filter((m) => m.type === 'way').map((m) => m.geometry));
  return [];
}
// even-odd polygon(s) from a bag of rings
function evenOdd(rings) {
  const polys = rings.filter((r) => Math.abs(ringArea(r)) > 1).map((r) => [[r]]);
  if (!polys.length) return [];
  try { return polys.length === 1 ? polys[0] : pc.xor(...polys); } catch (e) { console.warn('xor failed', e.message); return polys.flat(); }
}
const rect = (x0, z0, x1, z1) => [[[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]]];

// ---------- occupancy raster (2 m cells) ----------
const CELL = 2;
const GW = Math.ceil((MAXX - MINX) / CELL), GH = Math.ceil((MAXZ - MINZ) / CELL);
const mask = new Uint8Array(GW * GH);
const WATER = 1, GREEN = 2, ROAD = 4, BLD = 8, NOBUILD = 16, TREE = 32, PARK = 64;
function fillPoly(poly, bit) {
  let z0 = Infinity, z1 = -Infinity;
  for (const r of poly) for (const p of r) { if (p[1] < z0) z0 = p[1]; if (p[1] > z1) z1 = p[1]; }
  const r0 = Math.max(0, Math.floor((z0 - MINZ) / CELL)), r1 = Math.min(GH - 1, Math.ceil((z1 - MINZ) / CELL));
  for (let row = r0; row <= r1; row++) {
    const z = MINZ + (row + 0.5) * CELL;
    const xs = [];
    for (const r of poly) for (let i = 0, n = r.length; i < n; i++) {
      const a = r[i], b = r[(i + 1) % n];
      if (a[1] > z !== b[1] > z) xs.push(a[0] + ((z - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const c0 = Math.max(0, Math.round((xs[k] - MINX) / CELL)), c1 = Math.min(GW - 1, Math.round((xs[k + 1] - MINX) / CELL) - 1);
      for (let c = c0; c <= c1; c++) mask[row * GW + c] |= bit;
    }
  }
}
function stamp(x, z, radius, bit) {
  const c0 = Math.floor((x - radius - MINX) / CELL), c1 = Math.floor((x + radius - MINX) / CELL);
  const r0 = Math.floor((z - radius - MINZ) / CELL), r1 = Math.floor((z + radius - MINZ) / CELL);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    if (r < 0 || c < 0 || r >= GH || c >= GW) continue;
    const dx = MINX + (c + 0.5) * CELL - x, dz = MINZ + (r + 0.5) * CELL - z;
    if (dx * dx + dz * dz <= radius * radius) mask[r * GW + c] |= bit;
  }
}
function stampLine(pts, radius, bit) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (CELL * 0.75)));
    for (let k = 0; k <= n; k++) stamp(a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n, radius, bit);
  }
}
const at = (x, z) => {
  const c = Math.floor((x - MINX) / CELL), r = Math.floor((z - MINZ) / CELL);
  if (r < 0 || c < 0 || r >= GH || c >= GW) return 255;
  return mask[r * GW + c];
};
function rectCorners(cx, cz, w, d, ang) {
  const ux = Math.cos(ang), uz = Math.sin(ang);
  const hw = w / 2, hd = d / 2;
  return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([u, v]) => [cx + u * ux - v * uz, cz + u * uz + v * ux]);
}
function rectFree(cx, cz, w, d, ang, bits) {
  const ux = Math.cos(ang), uz = Math.sin(ang);
  for (let u = -w / 2; u <= w / 2 + 0.01; u += Math.min(1.6, w / 2)) for (let v = -d / 2; v <= d / 2 + 0.01; v += Math.min(1.6, d / 2)) {
    if (at(cx + u * ux - v * uz, cz + u * uz + v * ux) & bits) return false;
  }
  return true;
}

// ---------- output helpers ----------
const q = (v) => Math.round(v * 10); // decimetres
const flat = (pts) => { const o = []; for (const p of pts) o.push(q(p[0]), q(p[1])); return o; };
const flatPoly = (poly) => poly.map((r) => flat(openRing(r)));
// Clip a polyline to the slab; returns the pieces that lie inside (Liang–Barsky per segment).
function clipLine(pts) {
  const out = [];
  let cur = null;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    let t0 = 0, t1 = 1, ok = true;
    for (const [p, q] of [[-dx, a[0] - MINX], [dx, MAXX - a[0]], [-dz, a[1] - MINZ], [dz, MAXZ - a[1]]]) {
      if (p === 0) { if (q < 0) { ok = false; break; } continue; }
      const r = q / p;
      if (p < 0) { if (r > t1) { ok = false; break; } if (r > t0) t0 = r; } else { if (r < t0) { ok = false; break; } if (r < t1) t1 = r; }
    }
    if (!ok) { cur = null; continue; }
    const p0 = [a[0] + dx * t0, a[1] + dz * t0], p1 = [a[0] + dx * t1, a[1] + dz * t1];
    if (!cur || t0 > 0) { cur = [p0]; out.push(cur); }
    cur.push(p1);
    if (t1 < 1) cur = null;
  }
  return out.filter((l) => l.length > 1);
}
const inBox = (p, m = 0) => p[0] >= MINX - m && p[0] <= MAXX + m && p[1] >= MINZ - m && p[1] <= MAXZ + m;

// =====================================================================
// 1. Water → land
// =====================================================================
const waterPolys = [];
for (const e of els) {
  const t = e.tags || {};
  if (t.natural !== 'water' && t.waterway !== 'riverbank' && t.landuse !== 'basin' && t.landuse !== 'reservoir') continue;
  const rings = elementRings(e);
  if (!rings.length) { if (e.type === 'relation') console.warn('unclosed water relation', e.id, t.name); continue; }
  for (const poly of evenOdd(rings)) waterPolys.push(poly);
}
// The scene is a diorama: one rectangular slab of city, cut clean at the edge of the bundled data.
const MARGIN = 0;
const slabRect = rect(MINX, MINZ, MAXX, MAXZ);
let water = pc.union(...waterPolys.map((p) => [p]));
water = pc.intersection(water, [slabRect]);
const land = pc.difference([slabRect], water);
// Two water levels: the river system (anything that reaches the slab edge, or is large) sits low between
// its banks; enclosed lakes, ponds and the moat stand close to ground level.
const touchesEdge = (poly) => poly[0].some((p) => p[0] < MINX + 1 || p[0] > MAXX - 1 || p[1] < MINZ + 1 || p[1] > MAXZ - 1);
const ponds = water.filter((poly) => !touchesEdge(poly) && Math.abs(ringArea(poly[0])) < 400000);
console.log('river polygons', water.length - ponds.length, '| still-water polygons', ponds.length);
for (const poly of water) fillPoly(poly, WATER);
console.log('water polygons', waterPolys.length, '→ merged', water.length, '| land polygons', land.length, 'rings', land.reduce((s, p) => s + p.length, 0));

// Coarse "is there water within ~80 m" grid. Things near water are drawn into the water's
// reflection; everything else is skipped there, which keeps the mirror pass cheap.
const NC = 26, NGW = Math.ceil((MAXX - MINX) / NC), NGH = Math.ceil((MAXZ - MINZ) / NC);
let nearGrid = new Uint8Array(NGW * NGH);
for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) if (mask[r * GW + c] & WATER) nearGrid[Math.min(NGH - 1, Math.floor((r * CELL) / NC)) * NGW + Math.min(NGW - 1, Math.floor((c * CELL) / NC))] = 1;
for (let pass = 0; pass < 3; pass++) {
  const next = nearGrid.slice();
  for (let r = 0; r < NGH; r++) for (let c = 0; c < NGW; c++) {
    if (nearGrid[r * NGW + c]) continue;
    if ((r > 0 && nearGrid[(r - 1) * NGW + c]) || (r < NGH - 1 && nearGrid[(r + 1) * NGW + c]) || (c > 0 && nearGrid[r * NGW + c - 1]) || (c < NGW - 1 && nearGrid[r * NGW + c + 1])) next[r * NGW + c] = 1;
  }
  nearGrid = next;
}
const nearWater = (x, z) => { const c = Math.floor((x - MINX) / NC), r = Math.floor((z - MINZ) / NC); return r >= 0 && c >= 0 && r < NGH && c < NGW && nearGrid[r * NGW + c] === 1; };
// reorder a flat record array so near-water records come first; returns [array, nearCount]
function nearFirst(arr, stride) {
  const near = [], far = [];
  for (let i = 0; i < arr.length; i += stride) (nearWater(arr[i] / 10, arr[i + 1] / 10) ? near : far).push(...arr.slice(i, i + stride));
  return [near.concat(far), near.length / stride];
}

// river islands (for labels)
const areaCentroid = (r) => { let a = 0, x = 0, z = 0; for (let i = 0, n = r.length; i < n; i++) { const p = r[i], q2 = r[(i + 1) % n]; const k = p[0] * q2[1] - q2[0] * p[1]; a += k; x += (p[0] + q2[0]) * k; z += (p[1] + q2[1]) * k; } return [x / (3 * a), z / (3 * a)]; };
const islands = land.filter((p) => Math.abs(ringArea(p[0])) < 5e6).map((p) => ({ c: areaCentroid(openRing(p[0])), area: Math.abs(ringArea(p[0])) })).filter((i) => i.area > 20000 && inBox(i.c));

// =====================================================================
// 2. Citadel: wall band, imperial enclosure, gates
// =====================================================================
const wallRel = get('relation', 8541343);
const wallRings = stitch(wallRel.members.filter((m) => m.type === 'way').map((m) => m.geometry));
const wall = evenOdd(wallRings);
console.log('citadel wall rings', wallRings.map((r) => Math.round(Math.abs(ringArea(r)))), '→ polys', wall.length);
const castle = evenOdd(elementRings(get('relation', 21657722)));
// the mapped wall is a 21 m band, so the enclosed city is taken as the hull of that band
const wallOuter = hull(wallRings.flat());
const citadelPoly = [[wallOuter]];
const inCitadel = (p) => pipMulti(p, citadelPoly);

const iwalls = [];
const iwallPts = [];
for (const e of els) {
  if (e.type === 'way' && e.tags && e.tags.barrier === 'city_wall') {
    const pts = e.geometry.map(proj);
    iwalls.push(pts);
    iwallPts.push(...pts);
  }
}
const imperial = obb(iwallPts);
const imperialRing = rectCorners(imperial.c[0], imperial.c[1], imperial.w + 30, imperial.d + 30, imperial.a);
const inImperial = (p) => pip(p, imperialRing);
console.log('imperial city obb', imperial.w.toFixed(0), 'x', imperial.d.toFixed(0), 'angle', ((imperial.a * 180) / Math.PI).toFixed(1));

for (const poly of wall) fillPoly(poly, NOBUILD);
for (const poly of wall) for (const r of poly) stampLine(r.concat([r[0]]), 30, NOBUILD);
fillPoly([imperialRing], NOBUILD);

// =====================================================================
// 3. Green / open land
// =====================================================================
const green = [];
const GREEN_KINDS = { park: 'park', garden: 'park', pitch: 'pitch', stadium: 'pitch', grass: 'grass', recreation_ground: 'grass', cemetery: 'cemetery', farmland: 'farm', forest: 'wood', wood: 'wood', scrub: 'wood', grassland: 'grass', plant_nursery: 'farm', greenfield: 'grass', wetland: 'grass', religious: 'sacred' };
for (const e of els) {
  const t = e.tags || {};
  const k = GREEN_KINDS[t.leisure] || GREEN_KINDS[t.landuse] || GREEN_KINDS[t.natural];
  if (!k || e.type === 'node') continue;
  if (t.building) continue;
  let polys = evenOdd(elementRings(e));
  if (!polys.length) continue;
  try { polys = pc.intersection(polys.map((p) => p), [slabRect]); } catch { continue; }
  for (const poly of polys) {
    if (!poly[0].some((p) => inBox(p))) continue;
    green.push({ k, p: poly });
    if (k !== 'sacred') fillPoly(poly, GREEN);
    if (k === 'park' || k === 'wood') fillPoly(poly, PARK);
    if (k === 'farm' || k === 'cemetery' || k === 'pitch') fillPoly(poly, NOBUILD);
  }
}
for (const e of els) {
  const t = e.tags || {};
  if (e.type === 'way' && (t.landuse === 'military' || t.aeroway || t.landuse === 'construction')) for (const poly of evenOdd(elementRings(e))) fillPoly(poly, NOBUILD);
}

// =====================================================================
// 4. Roads & rail
// =====================================================================
// cầu Nguyễn Hoàng: outline way → oriented box; its carriageway ways are dropped (modelled by hand)
const nhWay = get('way', 1431136610);
const nhBox = nhWay ? obb(openRing(nhWay.geometry.map(proj))) : null;
const inNH = (p) => {
  if (!nhBox) return false;
  const ux = Math.cos(nhBox.a), uz = Math.sin(nhBox.a), dx = p[0] - nhBox.c[0], dz = p[1] - nhBox.c[1];
  return Math.abs(dx * ux + dz * uz) < nhBox.w / 2 + 6 && Math.abs(-dx * uz + dz * ux) < nhBox.d / 2 + 6;
};
if (nhBox) console.log('nguyen hoang box', nhBox.w.toFixed(0), 'x', nhBox.d.toFixed(0));
const ROAD_CLASS = { trunk: 0, primary: 0, trunk_link: 0, primary_link: 0, secondary: 1, secondary_link: 1, tertiary: 2, tertiary_link: 2, residential: 3, unclassified: 3, living_street: 3, service: 4, pedestrian: 5, footway: 5, path: 5, cycleway: 5, steps: 5, track: 5 };
const ROAD_W = [15, 12, 9.5, 6.5, 4, 2.2];
const TT_WAY = 174759688; // the truss spans; modelled by hand
const roads = [];
for (const e of els) {
  const t = e.tags || {};
  if (e.type !== 'way' || !(t.highway in ROAD_CLASS) || t.area === 'yes' || !e.geometry) continue;
  if (e.id === TT_WAY) continue;
  const c = ROAD_CLASS[t.highway];
  const bridge = t.bridge && t.bridge !== 'no' ? 1 : 0;
  for (const pts of clipLine(e.geometry.map(proj))) {
    if (bridge && inNH(pts[Math.floor(pts.length / 2)])) continue;
    roads.push({ c, bridge, name: t.name || '', pts });
    if (c < 5) stampLine(pts, ROAD_W[c] / 2 + 1.2, ROAD);
    else stampLine(pts, 1.2, ROAD);
  }
}
const rails = [];
for (const e of els) {
  const t = e.tags || {};
  if (e.type !== 'way' || t.railway !== 'rail') continue;
  for (const pts of clipLine(e.geometry.map(proj))) {
    rails.push({ main: t.service ? 0 : 1, bridge: t.bridge ? 1 : 0, pts });
    stampLine(pts, 5, ROAD | NOBUILD);
  }
}

// =====================================================================
// 4b. Eras. Three families of ordinary building, so a district reads as its period from the air:
//   2 = Nguyễn-period timber houses (the garden houses of the Citadel wards, Kim Long, Vỹ Dạ)
//   1 = Indochine (the French quarter along Lê Lợi; the old shophouse streets of Gia Hội and Đông Ba)
//   0 = modern
// Which streets carry which period is a judgement from the city's history, not an OSM tag; it is illustrative.
// =====================================================================
const streetPts = (re) => {
  const out = [];
  for (const e of els) {
    if (e.type !== 'way' || !e.tags || !e.tags.highway || !e.geometry || !re.test(e.tags.name || '')) continue;
    const g = e.geometry.map(proj);
    for (let i = 0; i + 1 < g.length; i++) {
      const n = Math.max(1, Math.ceil(Math.hypot(g[i + 1][0] - g[i][0], g[i + 1][1] - g[i][1]) / 20));
      for (let k = 0; k <= n; k++) out.push([g[i][0] + ((g[i + 1][0] - g[i][0]) * k) / n, g[i][1] + ((g[i + 1][1] - g[i][1]) * k) / n]);
    }
  }
  return out;
};
const nearPts = (pts, p, r) => { const r2 = r * r; for (const t of pts) { const dx = t[0] - p[0], dz = t[1] - p[1]; if (dx * dx + dz * dz < r2) return true; } return false; };
const FRENCH = streetPts(/^Lê Lợi$/), OLDTOWN = streetPts(/^(Chi Lăng|Trần Hưng Đạo|Bạch Đằng|Huỳnh Thúc Kháng|Phan Đăng Lưu)$/), GARDEN = streetPts(/^(Kim Long|Phú Mộng|Nguyễn Sinh Cung|Vạn Xuân|Nguyễn Phúc Nguyên)$/);
console.log('era streets: french', FRENCH.length, 'old town', OLDTOWN.length, 'garden', GARDEN.length);
const hash2 = (i, j) => { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const vnoise = (x, z) => { const i = Math.floor(x), j = Math.floor(z); let fx = x - i, fz = z - j; fx = fx * fx * (3 - 2 * fx); fz = fz * fz * (3 - 2 * fz); return (hash2(i, j) * (1 - fx) + hash2(i + 1, j) * fx) * (1 - fz) + (hash2(i, j + 1) * (1 - fx) + hash2(i + 1, j + 1) * fx) * fz; };
function eraOf(c, area) {
  // clumps of a period, with single houses breaking rank
  const k = vnoise(c[0] / 85 + 3.1, c[1] / 85 + 7.7) * 0.7 + hash2(Math.round(c[0] * 3), Math.round(c[1] * 3)) * 0.3;
  if (nearPts(FRENCH, c, 290)) return k < 0.7 ? 1 : 0;
  if (nearPts(OLDTOWN, c, 34)) return k < 0.56 ? 1 : 0;
  if (area < 330 && nearPts(GARDEN, c, 75)) return k < 0.5 ? 2 : 0;
  if (area < 330 && inCitadel(c) && !inImperial(c)) return k < 0.42 ? 2 : 0;
  return 0;
}

// =====================================================================
// 5. Buildings
// =====================================================================
// Quốc Học campus and the Thiên Mụ compound: buildings inside them are styled as a group
const ringOf = (id) => { const e = get('way', id); return e ? openRing(e.geometry.map(proj)) : null; };
const quocHoc = ringOf(695775622);
const thienMu = ringOf(205794912);
const towerC = (() => { const r = ringOf(205795043); return r ? centroid(r) : null; })();
const thienMuSmall = [];
const SPECIAL = { 205795043: 'phuocduyen', 172657562: 'ngomon', 218427614: 'kydai', 531031566: 'thaihoa', 531031520: 'phuvanlau', 239568224: 'nghenhluong', 172641246: 'markethall',
  // named places that get their own model instead of a generic extrusion (src/landmarks/civic.js)
  175063593: 'gahue', 118792054: 'phucam', 1172894102: 'dcct', 1172897446: 'andinh', 771244228: 'dieude', 771244225: 'dieudeGate',
  172657564: 'hienlam', 749331141: 'vincom', 172802373: 'tuphuong' };
const special = {};
// The southern sites (royal tombs, đàn Nam Giao, hồ Thủy Tiên, Thiên An): everything mapped inside each circle is
// handed to the site's own model (src/landmarks/tombs.js, south.js) instead of being extruded as an ordinary building.
const SITE_DEFS = [
  ['tuduc', 'Lăng Tự Đức', -2440, 3980, 330, 2, 16], ['dongkhanh', 'Lăng Đồng Khánh', -2045, 4360, 280, 3, 12],
  ['thieutri', 'Lăng Thiệu Trị', -1740, 5750, 380, 2, 14], ['minhmang', 'Lăng Minh Mạng', -2180, 8975, 480, 1, 18],
  ['khaidinh', 'Lăng Khải Định', 154, 7729, 300, 1, 30], ['namgiao', 'Đàn Nam Giao', -675, 3458, 190, 2, 10],
  ['thuytien', 'Hồ Thủy Tiên', -1335, 6558, 420, 2, 24], ['thienan', 'Đan viện Thiên An', -714, 6438, 170, 3, 24],
];
const sites = {};
// Bia Quốc Học stands in an open riverside court: keep generated trees and houses off it
{ const m = get('node', 5299153429); const c = m ? proj(m) : [-675, 879]; stamp(c[0], c[1], 26, TREE | NOBUILD); }
for (const [id, n, x, z, r] of SITE_DEFS) sites[id] = { n, c: [q(x), q(z)], r, items: [] };
const siteOf = (c) => { for (const [id, , x, z, r] of SITE_DEFS) if (Math.hypot(c[0] - x, c[1] - z) < r) return sites[id]; return null; };
const gates = [];
const buildings = [];
const marketArea = get('way', 161714451).geometry.map(proj);
const hash = (id) => { let h = (id * 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; return (h >>> 0) / 4294967296; };
const num = (s) => { const v = parseFloat(String(s || '').replace(',', '.')); return Number.isFinite(v) ? v : 0; };
const wallBandTest = (p) => { for (let a = 0; a < 8; a++) { const t = (a * Math.PI) / 4; if (pipMulti([p[0] + Math.cos(t) * 28, p[1] + Math.sin(t) * 28], wall)) return true; } return pipMulti(p, wall); };

for (const e of els) {
  const t = e.tags || {};
  if (!t.building || e.type === 'node') continue;
  let rings = elementRings(e);
  if (!rings.length) continue;
  rings.sort((a, b) => Math.abs(ringArea(b)) - Math.abs(ringArea(a)));
  const ring = openRing(rings[0]);
  const area = Math.abs(ringArea(ring));
  if (area < 7 || ring.length < 3) continue;
  const c = centroid(ring);
  if (!ring.every((p) => inBox(p, -1))) continue;
  if (ringArea(ring) < 0) ring.reverse();

  if (SPECIAL[e.id]) { special[SPECIAL[e.id]] = { ring: flat(ring), name: t.name || '' }; fillPoly([ring], BLD); continue; }
  { const st = siteOf(c); if (st) { st.items.push({ id: e.id, n: t.name || '', k: 'b', ring: flat(ring) }); fillPoly([ring], BLD); continue; } }
  // the small pavilions and gate standing with tháp Phước Duyên on its terrace are modelled with the tower
  if (towerC && Math.hypot(c[0] - towerC[0], c[1] - towerC[1]) < 27) { thienMuSmall.push(flat(ring)); fillPoly([ring], BLD); continue; }
  if (t.historic === 'city_gate') {
    const o = obb(ring);
    const onCitadel = wallBandTest(c);
    gates.push({ n: t.name || (e.id === 1568259450 ? 'Cửa Kẻ Trài' : ''), c: [q(o.c[0]), q(o.c[1])], w: q(o.w), d: q(o.d), a: Math.round(o.a * 1000), k: onCitadel ? 'citadel' : 'imperial' });
    fillPoly([ring], BLD);
    continue;
  }

  const hTag = num(t.height), lv = num(t['building:levels']);
  const r = hash(e.id);
  let kind = 0;
  const imp = inImperial(c);
  if (imp) kind = 2;
  else if (t.building === 'temple' || t.amenity === 'place_of_worship' && t.religion === 'buddhist' || t.building === 'pagoda' || t.building === 'shrine') kind = 3;
  else if (t.building === 'church' || t.building === 'cathedral' || t.building === 'chapel' || t.religion === 'christian') kind = 4;
  else if (['university', 'hospital', 'school', 'public', 'government', 'train_station', 'civic'].includes(t.building) || t.amenity === 'school' || t.office === 'government') kind = 5;
  else if (pip(c, marketArea)) kind = 6;
  else if (t.building === 'roof' || t.building === 'carport' || t.building === 'shed') kind = 8;
  else if (area > 700) kind = 1;

  let h;
  if (hTag) h = hTag;
  else if (lv) h = lv * 3.4 + 1.2;
  else if (kind === 2) h = area > 900 ? 9.5 : area > 300 ? 7 : 5;
  else if (kind === 3) h = area > 300 ? 8 : 5.5;
  else if (kind === 4) h = area > 400 ? 17 : 9;
  else if (kind === 5) h = 8 + Math.floor(r * 3) * 3.4;
  else if (kind === 6) h = area > 1500 ? 12 : 5;
  else if (kind === 8) h = 4;
  else if (t.tourism === 'hotel' || t.building === 'hotel') h = 20 + r * 22;
  else if (kind === 1) h = 9 + Math.floor(r * 3) * 3.4;
  else if (area < 55) h = 3.6 + r * 1.2;
  else if (area < 220) h = r < 0.45 ? 4.4 : r < 0.86 ? 7.8 : 11.2;
  else h = r < 0.3 ? 5 : r < 0.75 ? 8.2 : 11.6;
  if (inCitadel(c) && !hTag && !lv && kind !== 2) h = Math.min(h, 11.5);
  let flags = 0;
  if (thienMu && pip(c, thienMu) && t.historic !== 'city_gate') { kind = 3; if (!hTag && !lv) h = area > 300 ? 8 : 5.5; }
  if (quocHoc && pip(c, quocHoc)) { flags |= 2; if (!hTag && !lv) h = area > 180 ? 9.2 : 5.2; }
  if (h > 30) kind = 7;
  // flags 4 = Indochine, 8 = Nguyễn-period timber house
  if ((kind === 0 || kind === 1 || kind === 5) && h <= 30) {
    const era = eraOf(c, area);
    if (era === 1) { flags |= 4; if (!hTag && !lv) h = area > 260 ? 9.8 : area > 70 ? 7.4 : 4.6; }
    else if (era === 2 && kind === 0) { flags |= 8; if (!hTag && !lv) h = 3.7 + r * 0.9; }
  }

  // flags: 1 = mapped over the water (drawn on a piled deck), 2 = Quốc Học campus
  if (at(c[0], c[1]) & WATER) flags |= 1;
  const b = [flat(ring), q(h), kind, t.name || 0, flags];
  buildings.push(b);
  fillPoly([ring], BLD);
}
console.log('buildings', buildings.length, 'gates', gates.length, gates.map((g) => g.n + ':' + g.k).join(', '));
for (const e of els) {
  const t = e.tags || {};
  if (e.type === 'node') {
    // points of interest inside a site: sculptures, a slide, the entrance
    const pk = t.tourism === 'artwork' ? 'art' : t['abandoned:leisure'] ? 'slide' : t.barrier === 'entrance' ? 'gate' : null;
    const st = pk && e.lat != null ? siteOf(proj(e)) : null;
    if (st) (st.points ||= []).push({ k: pk, x: q(proj(e)[0]), z: q(proj(e)[1]) });
    continue;
  }
  const lk = t.leisure === 'bleachers' ? 's' : t.leisure === 'swimming_pool' ? 'p' : t.place === 'square' ? 'q' : null; // stands, pool, plaza
  if (t.building || !(lk || t.natural === 'water' || t.historic || t.tourism === 'attraction' || t.landuse === 'religious' || t.barrier === 'wall')) continue;
  const rings = elementRings(e);
  if (!rings.length) continue;
  rings.sort((a, b) => Math.abs(ringArea(b)) - Math.abs(ringArea(a)));
  const ring = openRing(rings[0]);
  if (ring.length < 3) continue;
  const st = siteOf(centroid(ring));
  if (st) st.items.push({ id: e.id, n: t.name || '', k: lk || (t.natural === 'water' ? 'w' : 'h'), ring: flat(ring) });
  if (st && lk) fillPoly([ring], BLD); // nothing grows or gets built on the stands, pools and plazas
}
for (const id in sites) console.log('site', id, sites[id].items.length, 'items:', sites[id].items.filter((i) => i.n).map((i) => i.n).join(', '));
console.log('special', Object.keys(special));

// =====================================================================
// 6. Illustrated infill houses where OSM has streets but no footprints
// =====================================================================
const infill = [];
const BLOCK = WATER | GREEN | ROAD | BLD | NOBUILD;
for (const road of roads) {
  if (road.bridge || road.c > 4) continue;
  const hills = inHills(road.pts[0]);
  if (hills && road.c > 3) continue;
  const density = (road.c === 4 ? 0.3 : road.c === 3 ? 0.78 : 0.86) * (hills ? 0.42 : 1);
  const half = ROAD_W[road.c] / 2;
  for (const side of [1, -1]) {
    let carry = rr(0, 6);
    for (let i = 0; i + 1 < road.pts.length; i++) {
      const a = road.pts[i], b = road.pts[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 0.5) continue;
      const tx = (b[0] - a[0]) / len, tz = (b[1] - a[1]) / len;
      const nx = -tz * side, nz = tx * side;
      let s = carry;
      while (s < len) {
        const px = a[0] + tx * s, pz = a[1] + tz * s;
        const cit = inCitadel([px, pz]);
        const main = road.c <= 2;
        const w = main ? rr(4.5, 7.5) : rr(5.5, 10);
        const d = main ? rr(11, 19) : rr(8, 14);
        const sb = main ? rr(1.2, 2.6) : rr(1.8, 6);
        const gap = main ? rr(0.2, 1.2) : cit ? rr(1.5, 8) : rr(0.5, 3.6);
        if (s + w > len + 3) break;
        const cx = px + tx * (w / 2) + nx * (half + sb + d / 2), cz = pz + tz * (w / 2) + nz * (half + sb + d / 2);
        const ang = Math.atan2(tz, tx);
        // rows behind the street front: Huế's blocks are built up well back from the road, along alleys OSM mostly lacks
        if (road.c <= 3 && !hills) {
          let back = half + sb + d;
          for (let row = 0; row < 2; row++) {
            const d2 = rr(7, 12), w2 = w * rr(0.82, 1.12), gap2 = rr(1.4, 4.5);
            const bx = px + tx * (w / 2) + nx * (back + gap2 + d2 / 2), bz = pz + tz * (w / 2) + nz * (back + gap2 + d2 / 2);
            back += gap2 + d2;
            if (!inBox([bx, bz], -10) || rnd() > (cit ? 0.38 : row === 0 ? 0.6 : 0.3) || !rectFree(bx, bz, w2 + 1.4, d2 + 1.4, ang, BLOCK)) continue;
            const r2 = rnd();
            const h2 = cit ? (r2 < 0.7 ? rr(3.8, 4.8) : rr(7.2, 8.2)) : r2 < 0.5 ? rr(3.8, 4.8) : r2 < 0.9 ? rr(7.2, 8.2) : rr(10.6, 11.6);
            const era2 = eraOf([bx, bz], w2 * d2);
            infill.push(q(bx), q(bz), q(w2), q(d2), Math.round(ang * 1000), q(era2 === 2 ? Math.min(h2, 4.4) : h2), 0, 2 | (era2 << 2)); // 2 = no street face; era in the upper bits
            fillPoly([rectCorners(bx, bz, w2, d2, ang)], BLD);
          }
        }
        if (inBox([cx, cz], -10) && rnd() < density * (cit ? 0.9 : 1) && rectFree(cx, cz, w + 1.2, d + 1.2, ang, BLOCK)) {
          const r = rnd();
          let h;
          if (cit) h = r < 0.6 ? rr(3.8, 4.8) : r < 0.96 ? rr(7.2, 8.2) : 11;
          else if (main) h = r < 0.15 ? 4.5 : r < 0.6 ? rr(7.4, 8.4) : r < 0.9 ? rr(10.8, 11.8) : rr(14, 15.5);
          else h = r < 0.42 ? rr(3.8, 4.8) : r < 0.86 ? rr(7.2, 8.2) : rr(10.6, 11.6);
          const era = eraOf([cx, cz], w * d);
          if (era === 2) h = Math.min(h, 4.4); else if (era === 1) h = Math.min(Math.max(h, 7.2), 11.4);
          infill.push(q(cx), q(cz), q(w), q(d), Math.round(ang * 1000), q(h), main ? 1 : 0, (side > 0 ? 1 : 0) | (era << 2));
          fillPoly([rectCorners(cx, cz, w, d, ang)], BLD);
        }
        s += w + gap;
      }
      carry = s - len;
    }
  }
}
console.log('infill houses', infill.length / 8);

// =====================================================================
// 7. Illustrated trees
// =====================================================================
const trees = [];
const TBLOCK = WATER | ROAD | BLD | TREE;
function plant(x, z, s, kind) {
  if (!inBox([x, z], -4) || at(x, z) & TBLOCK) return false;
  trees.push(q(x), q(z), Math.round(s * 10), kind);
  stamp(x, z, 3.2, TREE);
  return true;
}
// tree kinds: 0 broadleaf, 1 dark broadleaf, 2 flame tree, 3 hill pine
const hillKind = () => (rnd() < 0.72 ? 3 : rnd() < 0.3 ? 1 : 0);
const treeKind = (riverish) => { const r = rnd(); return r < (riverish ? 0.09 : 0.035) ? 2 : r < 0.3 ? 1 : 0; };
for (const g of green) {
  const far = inHills(g.p[0][0]);
  const spacing = g.k === 'wood' ? (far ? 19 : 9) : g.k === 'park' ? 13 : g.k === 'cemetery' ? 22 : g.k === 'sacred' ? 16 : g.k === 'grass' ? 24 : 0;
  if (!spacing) continue;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const p of g.p[0]) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
  const n = Math.min(far ? 900 : 2500, Math.round(((x1 - x0) * (z1 - z0)) / (spacing * spacing)));
  for (let i = 0; i < n; i++) {
    const p = [rr(x0, x1), rr(z0, z1)];
    if (pipPoly(p, g.p)) plant(p[0], p[1], rr(0.8, 1.5), far && g.k === 'wood' ? hillKind() : treeKind(g.k === 'park'));
  }
}
for (const road of roads) {
  if (road.c > 2 || road.bridge) continue;
  const half = ROAD_W[road.c] / 2 + 1.6;
  for (const side of [1, -1]) {
    let s = rr(0, 10);
    for (let i = 0; i + 1 < road.pts.length; i++) {
      const a = road.pts[i], b = road.pts[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 0.5) continue;
      const tx = (b[0] - a[0]) / len, tz = (b[1] - a[1]) / len;
      while (s < len) {
        const x = a[0] + tx * s - tz * side * half, z = a[1] + tz * s + tx * side * half;
        if (!(at(x, z) & (WATER | BLD | TREE))) { trees.push(q(x), q(z), Math.round(rr(0.75, 1.15) * 10), treeKind(false)); stamp(x, z, 3, TREE); }
        s += rr(13, 20);
      }
      s -= len;
    }
  }
}
// garden canopy: Huế is a city of garden houses; the Citadel most of all
{
  const n = Math.round(((MAXX - MINX) * (MAXZ - MINZ)) / 520);
  for (let i = 0; i < n; i++) {
    const p = [rr(MINX, MAXX), rr(MINZ, MAXZ)];
    const m = at(p[0], p[1]);
    if (m & (TBLOCK | GREEN)) continue;
    const cit = inCitadel(p);
    const imp = cit && inImperial(p);
    if (m & NOBUILD && !imp && !cit) continue;
    if (rnd() > (imp ? 0.75 : cit ? 0.7 : inHills(p) ? 0.06 : 0.26)) continue;
    plant(p[0], p[1], rr(0.7, 1.35), inHills(p) && rnd() < 0.5 ? 3 : treeKind(false));
  }
}
// the pine woods that have closed over hồ Thủy Tiên and cover Thiên An's hill
for (const [id, , x, z, r] of SITE_DEFS) {
  if (id !== 'thuytien' && id !== 'thienan') continue;
  const cell = 15, R = r + (id === 'thienan' ? 80 : 0);
  for (let i = -R; i <= R; i += cell) for (let j = -R; j <= R; j += cell) {
    if (rnd() > 0.5) continue;
    const px = x + i + rr(0, cell), pz = z + j + rr(0, cell);
    if (Math.hypot(px - x, pz - z) <= R) plant(px, pz, rr(0.9, 1.5), 3);
  }
}
console.log('trees', trees.length / 4);

// =====================================================================
// 8. Bridges, river line, places
// =====================================================================
const tt = get('way', TT_WAY).geometry.map(proj);
const ttOutline = openRing(get('way', 1431129413).geometry.map(proj));
const ttBox = obb(ttOutline);
const bridgeOutlines = [];
for (const e of els) {
  const t = e.tags || {};
  if (t.man_made === 'bridge' && e.type === 'way' && e.id !== 1431129413) {
    const ring = openRing(e.geometry.map(proj));
    if (ring.length >= 3 && inBox(centroid(ring))) bridgeOutlines.push({ n: t.name || '', ring: flat(ring) });
  }
}
const riverLine = [];
for (const id of [1263060877, 52736210]) {
  const w = get('way', id);
  if (w) for (const p of w.geometry.map(proj)) if (inBox(p, -20)) riverLine.push(p);
}

const wayCentre = (id, type = 'way') => {
  const e = get(type, id);
  if (!e) return null;
  if (e.type === 'node') return proj(e);
  if (e.geometry) return centroid(openRing(e.geometry.map(proj)));
  const b = e.bounds;
  return proj({ lat: (b.minlat + b.maxlat) / 2, lon: (b.minlon + b.maxlon) / 2 });
};
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const findByName = (re, pred = () => true) => els.find((e) => e.tags && re.test(e.tags.name || '') && pred(e));
const places = [];
const addPlace = (id, n, c, tier, kind, h = 0) => { if (c && inBox(c, -20)) places.push({ id, n, x: q(c[0]), z: q(c[1]), t: tier, k: kind, h }); else console.warn('place skipped', id); };

addPlace('truongtien', 'Cầu Trường Tiền', mid(tt[0], tt[tt.length - 1]), 1, 'bridge', 22);
addPlace('dongba', 'Chợ Đông Ba', wayCentre(172641246), 1, 'market', 30);
addPlace('kydai', 'Kỳ Đài', wayCentre(218427614), 1, 'monument', 58);
addPlace('ngomon', 'Ngọ Môn', wayCentre(172657562), 2, 'monument', 24);
addPlace('thaihoa', 'Điện Thái Hòa', wayCentre(531031566), 3, 'monument', 20);
addPlace('dainoi', 'Hoàng thành · Đại Nội', imperial.c, 2, 'area', 14);
addPlace('kinhthanh', 'Kinh thành Huế', centroid(openRing(wallOuter)), 1, 'area', 30);
addPlace('phuvanlau', 'Phu Văn Lâu', wayCentre(531031520), 3, 'monument', 14);
addPlace('tinhtam', 'Hồ Tịnh Tâm', wayCentre(1843591, 'relation'), 3, 'water', 6);
addPlace('phuxuan', 'Cầu Phú Xuân', wayCentre(1431129414), 2, 'bridge', 14);
addPlace('quochoc', 'Trường Quốc Học', wayCentre(695775622), 3, 'place', 16);
{
  const st = els.find((e) => e.tags && e.tags.building === 'train_station');
  if (st) addPlace('gahue', 'Ga Huế', centroid(openRing(st.geometry.map(proj))), 3, 'place', 14);
  const an = get('way', 1172897446);
  if (an) addPlace('andinh', 'Cung An Định', wayCentre(1172897446), 3, 'monument', 18);
  const dv = get('way', 1431136608);
  if (dv) addPlace('bachho', 'Cầu Dã Viên', wayCentre(1431132252), 3, 'bridge', 14);
  const gh = get('way', 1431132258);
  if (gh) addPlace('giahoi', 'Cầu Gia Hội', wayCentre(1431132258), 3, 'bridge', 12);
  const vin = findByName(/Vincom Plaza/);
  if (vin && vin.geometry) addPlace('vincom', 'Vincom Plaza Huế', centroid(openRing(vin.geometry.map(proj))), 3, 'place', 165);
  const cath = els.find((e) => e.tags && e.tags.building === 'cathedral');
  if (cath && cath.geometry) addPlace('phucam', 'Nhà thờ Phủ Cam', centroid(openRing(cath.geometry.map(proj))), 3, 'place', 46);
}
// More named places, each anchored on its OSM element (names given with full diacritics)
const EXTRA = [
  ['nghenhluong', 'Nghênh Lương Đình', 'way', 239568224, 2, 'monument', 12],
  ['themieu', 'Thế Miếu', 'way', 172657567, 4, 'monument', 14],
  ['hungmieu', 'Hưng Miếu', 'way', 172657565, 4, 'monument', 12],
  ['thaimieu', 'Thái Miếu', 'way', 172657566, 4, 'monument', 12],
  ['trieumieu', 'Triệu Miếu', 'way', 172657570, 4, 'monument', 12],
  ['dientho', 'Cung Diên Thọ', 'way', 172763420, 4, 'monument', 12],
  ['truongsanh', 'Cung Trường Sanh', 'way', 172763427, 4, 'monument', 12],
  ['duyetthi', 'Duyệt Thị Đường', 'way', 172657563, 4, 'monument', 14],
  ['kientrung', 'Điện Kiến Trung', 'way', 285990348, 4, 'monument', 16],
  ['canchanh', 'Nền điện Cần Chánh', 'way', 285990343, 4, 'monument', 8],
  ['hiennhon', 'Cửa Hiển Nhơn', 'way', 264099611, 4, 'gate', 14],
  ['chuongduc', 'Cửa Chương Đức', 'way', 531016858, 4, 'gate', 14],
  ['tuphuong', 'Lầu Tứ Phương Vô Sự', 'way', 172802373, 4, 'monument', 14],
  ['quoctugiam', 'Quốc Tử Giám', 'way', 531031518, 3, 'monument', 12],
  ['baotangcovat', 'Bảo tàng Cổ vật Cung đình', 'way', 695810710, 3, 'place', 12],
  ['tangthulau', 'Tàng Thư Lâu', 'way', 173151284, 3, 'monument', 12],
  ['xatac', 'Đàn Xã Tắc', 'node', 6533792207, 3, 'monument', 8],
  ['mangca', 'Trấn Bình Đài · Mang Cá', 'way', 367959083, 3, 'monument', 16],
  ['thuyquan', 'Đông Thành Thủy Quan', 'way', 619851621, 3, 'monument', 10],
  ['dieude', 'Chùa Diệu Đế', 'way', 771244228, 3, 'place', 14],
  ['dcct', 'Nhà thờ Dòng Chúa Cứu Thế', 'way', 1172894102, 3, 'place', 56],
  ['hienlam', 'Hiển Lâm Các', 'way', 172657564, 4, 'monument', 19],
  ['tudam', 'Chùa Từ Đàm', 'way', 631871502, 3, 'place', 14],
  ['baoquoc', 'Chùa Báo Quốc', 'way', 1170979640, 3, 'place', 14],
  ['baotanghcm', 'Bảo tàng Hồ Chí Minh', 'way', 240266284, 3, 'place', 14],
  ['thuongbac', 'Thương Bạc', 'way', 239568223, 3, 'monument', 10],
  ['hoquyen', 'Hổ Quyền', 'relation', 19381147, 3, 'monument', 10],
  ['diemphungthi', 'Trung tâm Nghệ thuật Điềm Phùng Thị', 'way', 118540998, 3, 'place', 12],
  ['quantuong', 'Quan Tượng Đài', 'node', 11212153237, 3, 'monument', 12],
  ['tayloc', 'Chợ Tây Lộc', 'way', 372292672, 3, 'market', 10],
  ['ancuu', 'Chợ An Cựu', 'way', 118541113, 3, 'market', 10],
  ['benngu', 'Chợ Bến Ngự', 'way', 513649271, 3, 'market', 10],
];
for (const [id, n, type, osm, tier, kind, h] of EXTRA) addPlace(id, n, wayCentre(osm, type), tier, kind, h);
for (const [id, n, x, z, , tier, h] of SITE_DEFS) addPlace(id, n, [x, z], tier, id === 'thuytien' ? 'water' : 'monument', h);
addPlace('vongcanh', 'Đồi Vọng Cảnh', [-3123, 4990], 3, 'place', 12);
addPlace('ngubinh', 'Núi Ngự Bình', [1221, 2974], 2, 'place', 20);
{ const m = get('node', 5299153429); const c = m ? proj(m) : [-675, 879]; special.biaquochoc = { c: [q(c[0]), q(c[1])], ring: [], name: 'Bia Quốc Học' }; addPlace('biaquochoc', 'Bia Quốc Học', c, 2, 'monument', 14); }
addPlace('golim', 'Cầu gỗ lim', [-168.5, 374.8], 3, 'bridge', 5); // the ironwood walkway (midpoint from src/landmarks/boardwalk.js)
addPlace('thienmu', 'Chùa Thiên Mụ', wayCentre(205795043), 1, 'monument', 26);
addPlace('ndchieu', 'Phố đi bộ Nguyễn Đình Chiểu', wayCentre(39418535), 2, 'place', 8);
addPlace('nguyenhoang', 'Cầu Nguyễn Hoàng', wayCentre(1431136610), 2, 'bridge', 14);
{
  // Phố Tây: the visitors' quarter on Phạm Ngũ Lão – Chu Văn An – Võ Thị Sáu
  const streets = [39419092, 39413149, 39416766].map((id) => wayCentre(id)).filter(Boolean);
  if (streets.length) addPlace('photay', 'Phố Tây', [streets.reduce((s, p) => s + p[0], 0) / streets.length, streets.reduce((s, p) => s + p[1], 0) / streets.length], 2, 'place', 14);
}

// Cồn Hến / Cồn Dã Viên: the two river islets (largest land islands inside the river)
for (const e of els) {
  const t = e.tags || {};
  if (e.type === 'node' && t.place && /Cồn Hến|Dã Viên/.test(t.name || '')) console.log('place node', t.name, t.place, proj(e).map(Math.round));
}
console.log('islands', islands.map((i) => [Math.round(i.c[0]), Math.round(i.c[1]), Math.round(i.area)]));
{
  const near = (x, z) => islands.slice().sort((a, b) => Math.hypot(a.c[0] - x, a.c[1] - z) - Math.hypot(b.c[0] - x, b.c[1] - z))[0];
  const hen = near(1150, -1650), dv = near(-1700, 1150);
  if (hen) addPlace('conhen', 'Cồn Hến', hen.c, 2, 'island', 10);
  if (dv) addPlace('daVien', 'Cồn Dã Viên', dv.c, 3, 'island', 10);
}
for (const g of gates) if (g.k === 'citadel' && g.n) places.push({ id: 'gate:' + g.n, n: g.n, x: g.c[0], z: g.c[1], t: 3, k: 'gate', h: 20 });

// river labels sit on the mapped centre line
const nearestOnRiver = (target) => riverLine.reduce((best, p) => (Math.hypot(p[0] - target[0], p[1] - target[1]) < Math.hypot(best[0] - target[0], best[1] - target[1]) ? p : best), riverLine[0]);
const water_labels = [];
{
  const ttMid = mid(tt[0], tt[tt.length - 1]);
  const up = nearestOnRiver([ttMid[0] - 900, ttMid[1] + 500]);
  water_labels.push({ n: 'Sông Hương', x: q(up[0]), z: q(up[1]), t: 1 });
  const db = get('way', 371992824);
  if (db) { const g = db.geometry.map(proj).filter((p) => inBox(p)); const p = g[Math.floor(g.length / 2)]; water_labels.push({ n: 'Sông Đông Ba', x: q(p[0]), z: q(p[1]), t: 3 }); }
  const nh = get('relation', 21657724);
  if (nh) { const c = wayCentre(21657724, 'relation'); water_labels.push({ n: 'Ngự Hà', x: q(c[0]), z: q(c[1]), t: 3 }); }
}

// Moorings: places along the central riverbanks where small sampans tie up (illustrative; positions on the real bank line)
const moorings = [];
for (const poly of water) {
  if (!touchesEdge(poly) && Math.abs(ringArea(poly[0])) < 400000) continue;
  for (const ring of poly) {
    let acc = rr(0, 60);
    for (let i = 0; i + 1 < ring.length; i++) {
      const a = ring[i], b = ring[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 1) continue;
      const tx = (b[0] - a[0]) / len, tz = (b[1] - a[1]) / len;
      while (acc < len) {
        const px = a[0] + tx * acc, pz = a[1] + tz * acc;
        acc += rr(45, 130);
        if (px < -2500 || px > 900 || pz < -1000 || pz > 1700 || rnd() < 0.35) continue;
        for (const sgn of [1, -1]) {
          const x = px - tz * sgn * 7, z = pz + tx * sgn * 7;
          if (at(x, z) & WATER && at(px - tz * sgn * 16, pz + tx * sgn * 16) & WATER) { moorings.push(q(x), q(z), Math.round(Math.atan2(tz, tx) * 1000)); break; }
        }
      }
      acc -= len;
    }
  }
}
console.log('moorings', moorings.length / 3);

let quocHocGate = null;
if (quocHoc) {
  let best = null;
  for (let i = 0; i < quocHoc.length; i++) {
    const a = quocHoc[i], b = quocHoc[(i + 1) % quocHoc.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 50) continue;
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const score = m[0] * -0.68 + m[1] * -0.73;
    if (!best || score > best.score) best = { score, m, a: Math.atan2(b[1] - a[1], b[0] - a[0]), len };
  }
  // the gate stands square opposite Bia Quốc Học across Lê Lợi: slide it along the frontage to face the memorial
  if (best) {
    const bia = get('node', 5299153429);
    if (bia) { const p = proj(bia), ux = Math.cos(best.a), uz = Math.sin(best.a), t = (p[0] - best.m[0]) * ux + (p[1] - best.m[1]) * uz; if (Math.abs(t) < 90) best.m = [best.m[0] + ux * t, best.m[1] + uz * t]; }
  }
  if (best) { quocHocGate = { c: [q(best.m[0]), q(best.m[1])], a: Math.round(best.a * 1000) }; console.log('quoc hoc gate at', best.m.map(Math.round), 'edge', Math.round(best.len), 'm'); }
}
special.thienmuSmall = thienMuSmall;
{ const r = ringOf(1172894104); if (r) special.andinhArea = { ring: flat(r), name: '' }; }
console.log('thien mu small buildings', thienMuSmall.length);

// =====================================================================
// 9. Terrain: height above the flat city floor, from public elevation tiles
// =====================================================================
// Minimal PNG reader (8-bit RGB/RGBA, non-interlaced) — enough for terrarium tiles.
function readPng(file) {
  const buf = fs.readFileSync(file);
  let pos = 8, w = 0, h = 0, ch = 3;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ch = data[9] === 6 ? 4 : 3; if (data[8] !== 8 || (data[9] !== 2 && data[9] !== 6) || data[12] !== 0) throw new Error('unsupported PNG ' + file); }
    if (type === 'IDAT') idat.push(data);
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const out = new Uint8Array(w * h * ch), stride = w * ch;
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x];
      const a = x >= ch ? out[y * stride + x - ch] : 0, b = y ? out[(y - 1) * stride + x] : 0, c = x >= ch && y ? out[(y - 1) * stride + x - ch] : 0;
      let r = v;
      if (f === 1) r = v + a; else if (f === 2) r = v + b; else if (f === 3) r = v + ((a + b) >> 1);
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pcc = Math.abs(p - c); r = v + (pa <= pb && pa <= pcc ? a : pb <= pcc ? b : c); }
      out[y * stride + x] = r & 255;
    }
  }
  return { w, h, ch, px: out };
}
let terrain = null;
let pondLv = ponds.map(() => 0); // metres above the city floor at which each still-water body stands (0: at city level)
{
  const Z = 13, X0 = 6543, Y0 = 3715, NXT = 2, NYT = 4;
  const have = [0, 1].every((i) => [0, 1, 2, 3].every((j) => fs.existsSync(`data/raw/elev/${Z}-${X0 + i}-${Y0 + j}.png`)));
  if (!have) console.warn('no elevation tiles (run scripts/fetch-elevation.sh): terrain stays flat');
  else {
    const M = 256 * NXT, MH = 256 * NYT, dem = new Float32Array(M * MH);
    for (let i = 0; i < NXT; i++) for (let j = 0; j < NYT; j++) {
      const t = readPng(`data/raw/elev/${Z}-${X0 + i}-${Y0 + j}.png`);
      for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const o = (y * 256 + x) * t.ch; dem[(j * 256 + y) * M + i * 256 + x] = t.px[o] * 256 + t.px[o + 1] + t.px[o + 2] / 256 - 32768; }
    }
    const demAt = (x, z) => {
      const lon = ORIGIN.lon + x / KX, lat = ORIGIN.lat - z / KZ;
      const n = 2 ** Z, fx = ((lon + 180) / 360) * n - X0, lr = (lat * Math.PI) / 180;
      const fy = ((1 - Math.asinh(Math.tan(lr)) / Math.PI) / 2) * n - Y0;
      const px = Math.max(0, Math.min(M - 1.001, fx * 256 - 0.5)), py = Math.max(0, Math.min(MH - 1.001, fy * 256 - 0.5));
      const ix = Math.floor(px), iy = Math.floor(py), ax = px - ix, ay = py - iy;
      const g = (a, b) => dem[b * M + a];
      return (g(ix, iy) * (1 - ax) + g(ix + 1, iy) * ax) * (1 - ay) + (g(ix, iy + 1) * (1 - ax) + g(ix + 1, iy + 1) * ax) * ay;
    };
    const STEP = 25, nx = Math.floor((MAXX - MINX) / STEP) + 1, nz = Math.floor((MAXZ - MINZ) / STEP) + 1;
    let h = new Float32Array(nx * nz);
    const flatSamples = [];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const x = MINX + i * STEP, z = MINZ + j * STEP;
      h[j * nx + i] = demAt(x, z);
      if (inCitadel([x, z]) && !(at(x, z) & WATER)) flatSamples.push(h[j * nx + i]);
    }
    flatSamples.sort((a, b) => a - b);
    const floor = flatSamples[Math.floor(flatSamples.length * 0.6)];
    const blur = (src) => {
      const out = new Float32Array(src.length);
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
        let s = 0, wsum = 0;
        for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
          const a = i + di, b = j + dj;
          if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
          const wgt = Math.exp(-(di * di + dj * dj) / 3);
          s += src[b * nx + a] * wgt; wsum += wgt;
        }
        out[j * nx + i] = s / wsum;
      }
      return out;
    };
    // Radar elevation picks up roofs and canopy, so the flat city floor reads a few metres of noise. A heavily
    // smoothed copy decides WHERE the ground really rises; the height itself comes from a lightly smoothed copy,
    // so hills keep their true height above the city floor instead of being shaved and flattened.
    const raw = h;
    const broad = blur(blur(raw)), fine = (() => {
      const out = new Float32Array(raw.length);
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
        let sum = 0, wsum = 0;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          const a = i + di, b = j + dj;
          if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
          const wgt = di === 0 && dj === 0 ? 2 : 1;
          sum += raw[b * nx + a] * wgt; wsum += wgt;
        }
        out[j * nx + i] = sum / wsum;
      }
      return out;
    })();
    // Lakes in the hills stand at their own height, not the city's: read each one's level off the elevation model
    // and hold the ground flat at that level inside it and along its shore.
    const nodeLv = new Float32Array(nx * nz);
    ponds.forEach((poly, pi) => {
      const ring = poly[0], c = centroid(ring);
      if (inCitadel(c)) return;
      const vals = [demAt(c[0], c[1])];
      for (let i = 0; i < ring.length; i += Math.max(1, ring.length >> 4)) vals.push(demAt(ring[i][0], ring[i][1]));
      vals.sort((a, b) => a - b);
      const lv = vals[Math.floor(vals.length * 0.3)] - floor - 1;
      if (lv < 2.5) return;
      pondLv[pi] = lv;
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const q0 of ring) { x0 = Math.min(x0, q0[0]); x1 = Math.max(x1, q0[0]); z0 = Math.min(z0, q0[1]); z1 = Math.max(z1, q0[1]); }
      const near = (x, z) => { for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)); if (Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < 34) return true; } return false; };
      for (let j = Math.max(0, Math.floor((z0 - 40 - MINZ) / STEP)); j <= Math.min(nz - 1, Math.ceil((z1 + 40 - MINZ) / STEP)); j++) for (let i = Math.max(0, Math.floor((x0 - 40 - MINX) / STEP)); i <= Math.min(nx - 1, Math.ceil((x1 + 40 - MINX) / STEP)); i++) {
        const x = MINX + i * STEP, z = MINZ + j * STEP;
        // islands inside the lake stand at its level too (they are holes in the water polygon)
        if (pip([x, z], ring) || near(x, z)) nodeLv[j * nx + i] = Math.max(nodeLv[j * nx + i], lv);
      }
    });
    console.log('raised lakes', pondLv.filter((v) => v > 0).length, 'of', ponds.length, '| highest', Math.max(0, ...pondLv).toFixed(1), 'm');
    const DEAD = 3.2, FULL = 9; // below DEAD above the floor: flat; from FULL up: the true height
    const nearWet = (x, z) => { for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (at(x + dx * STEP, z + dz * STEP) & WATER) return true; return false; };
    const lock = new Uint8Array(nx * nz);
    h = new Float32Array(nx * nz);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const x = MINX + i * STEP, z = MINZ + j * STEP, k = j * nx + i;
      // the slab's edge may stand high in the hills (it is cut like a model); only the city's own edges stay flat
      const edge = i === 0 || j === 0 || i === nx - 1 || j === nz - 1;
      if (nodeLv[k] > 0) { h[k] = nodeLv[k]; lock[k] = 2; continue; }
      if ((edge && !inHills([x, z])) || nearWet(x, z) || inCitadel([x, z]) || wallBandTest([x, z])) { lock[k] = 1; continue; }
      const up = broad[k] - floor;
      const t = Math.max(0, Math.min(1, (up - DEAD) / (FULL - DEAD))), gate = t * t * (3 - 2 * t);
      h[k] = Math.max(0, fine[k] - floor) * gate;
    }
    // one light pass to take the steps out of the gate; water and the Citadel stay at zero
    {
      const out = new Float32Array(h.length);
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
        const k = j * nx + i;
        if (lock[k]) { if (lock[k] === 2) out[k] = h[k]; continue; }
        let sum = 0, wsum = 0;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          const a = i + di, b = j + dj;
          if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
          const wgt = di === 0 && dj === 0 ? 4 : 1;
          sum += h[b * nx + a] * wgt; wsum += wgt;
        }
        out[k] = sum / wsum;
      }
      h = out;
    }
    for (let k = 0; k < h.length; k++) if (lock[k] === 1 || h[k] < 0.35) h[k] = 0;
    // Hà Khê hill, which carries chùa Thiên Mụ, is narrower than the smoothing above, so its crest is put back
    // from the unsmoothed samples, measured against the low end of the city floor (true ground, not rooftops).
    if (towerC) {
      const low = flatSamples[Math.floor(flatSamples.length * 0.15)];
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
        const x = MINX + i * STEP, z = MINZ + j * STEP, k = j * nx + i;
        const d = Math.hypot(x - towerC[0], z - towerC[1]);
        if (d > 130 || at(x, z) & WATER) continue;
        const t = Math.max(0, Math.min(1, (130 - d) / 80)), fall = t * t * (3 - 2 * t);
        // the bank itself stays at street level; the slope climbs from the riverside road
        const bank = nearWet(x, z) ? 0.25 : 1;
        h[k] = Math.max(h[k], Math.max(0, demAt(x, z) - low) * fall * bank);
      }
    }
    // ground cover on raised ground (flat land takes its colour from the polygon overlay instead)
    const COVER = { park: 1, wood: 2, grass: 3, farm: 4, cemetery: 5, pitch: 6, sacred: 7 };
    let cover = '', lifted = 0, peak = 0;
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      let c = 0;
      if (h[k] > 0) {
        lifted++; peak = Math.max(peak, h[k]);
        const p = [MINX + i * STEP, MINZ + j * STEP];
        for (const g of green) if (pipPoly(p, g.p)) { c = COVER[g.k] || 0; break; }
      }
      cover += c;
    }
    terrain = { x0: q(MINX), z0: q(MINZ), step: STEP, nx, nz, h: Array.from(h, (v) => Math.round(v * 10)), cover };
    const probe = (x, z) => { const i = Math.round((x - MINX) / STEP), j = Math.round((z - MINZ) / STEP); return h[j * nx + i].toFixed(1); };
    console.log('terrain', nx + 'x' + nz, 'floor', floor.toFixed(1), 'm asl | lifted nodes', lifted, '| peak rise', peak.toFixed(1), 'm | Thiên Mụ', towerC ? probe(towerC[0], towerC[1]) : '-', '| raw DEM there', towerC ? demAt(towerC[0], towerC[1]).toFixed(1) : '-');
  }
}

// =====================================================================
// write
// =====================================================================
const [infillOut, infillNear] = nearFirst(infill, 8);
const [treesOut, treesNear] = nearFirst(trees, 4);
console.log('near water: infill', infillNear, 'of', infill.length / 8, '| trees', treesNear, 'of', trees.length / 4);
const out = {
  meta: {
    origin: ORIGIN,
    bounds: [q(MINX), q(MINZ), q(MAXX), q(MAXZ)],
    osmTimestamp: raw.osm3s && raw.osm3s.timestamp_osm_base,
    counts: { buildings: buildings.length, infill: infill.length / 8, roads: roads.length, trees: trees.length / 4, infillNear, treesNear },
  },
  land: land.map(flatPoly),
  ponds: ponds.map(flatPoly),
  pondLv: pondLv.map((v) => Math.round(v * 10)),
  green: green.map((g) => [g.k, flatPoly(g.p)]),
  roads: roads.map((r) => [r.c, r.bridge, flat(r.pts)]),
  rails: rails.map((r) => [r.main, r.bridge, flat(r.pts)]),
  bld: buildings,
  infill: infillOut,
  trees: treesOut,
  wall: wall.map(flatPoly),
  iwalls: iwalls.map(flat),
  imperial: { c: [q(imperial.c[0]), q(imperial.c[1])], w: q(imperial.w), d: q(imperial.d), a: Math.round(imperial.a * 1000) },
  gates,
  special,
  sites,
  market: flat(openRing(marketArea)),
  truongtien: { a: flat([tt[0]]), b: flat([tt[tt.length - 1]]), box: { c: [q(ttBox.c[0]), q(ttBox.c[1])], w: q(ttBox.w), d: q(ttBox.d), a: Math.round(ttBox.a * 1000) } },
  terrain,
  moorings,
  nguyenhoang: nhBox ? { c: [q(nhBox.c[0]), q(nhBox.c[1])], w: q(nhBox.w), d: q(nhBox.d), a: Math.round(nhBox.a * 1000) } : null,
  quocHocGate,
  bridges: bridgeOutlines,
  river: flat(riverLine),
  islands: islands.map((i) => [q(i.c[0]), q(i.c[1]), Math.round(i.area)]),
  places,
  waterLabels: water_labels,
};
fs.mkdirSync('public/data', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));
console.log('wrote', OUT, (fs.statSync(OUT).size / 1e6).toFixed(2), 'MB', '| extent m', Math.round(MAXX - MINX), 'x', Math.round(MAXZ - MINZ));
console.log('truong tien obb', ttBox.w.toFixed(1), 'x', ttBox.d.toFixed(1), 'centre', ttBox.c.map((v) => v.toFixed(1)), 'centreline', tt.map((p) => p.map((v) => v.toFixed(1))));
