// Turns the raw Overpass extract (data/raw/hue-osm.json) into the compact scene
// bundle the app ships with (public/data/hue.json).
//
// Everything positional comes from OpenStreetMap. Two things are generated and
// flagged as illustration: infill houses along streets where OSM has no
// footprints yet, and trees.
import fs from 'node:fs';
import pc from 'polygon-clipping';

const RAW = 'data/raw/hue-osm.json';
const OUT = 'public/data/hue.json';

// Local frame: metres east (x) and south (z) of the middle of cầu Trường Tiền.
const ORIGIN = { lat: 16.468896, lon: 107.588858 };
const BBOX = { s: 16.4455, w: 107.5385, n: 16.4965, e: 107.613 }; // west edge reaches chùa Thiên Mụ
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
// 5. Buildings
// =====================================================================
const SPECIAL = { 205795043: 'phuocduyen', 172657562: 'ngomon', 218427614: 'kydai', 531031566: 'thaihoa', 531031520: 'phuvanlau', 239568224: 'nghenhluong', 172641246: 'markethall' };
const special = {};
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
  if (h > 30) kind = 7;

  const b = [flat(ring), q(h), kind, t.name || 0];
  // mapped over the water (floating restaurants, boat houses): drawn on a piled deck rather than rising from the river
  if (at(c[0], c[1]) & WATER) { b.push(1); console.log('over water:', t.name || '(unnamed)', Math.round(area) + ' m²'); }
  buildings.push(b);
  fillPoly([ring], BLD);
}
console.log('buildings', buildings.length, 'gates', gates.length, gates.map((g) => g.n + ':' + g.k).join(', '));
console.log('special', Object.keys(special));

// =====================================================================
// 6. Illustrated infill houses where OSM has streets but no footprints
// =====================================================================
const infill = [];
const BLOCK = WATER | GREEN | ROAD | BLD | NOBUILD;
for (const road of roads) {
  if (road.bridge || road.c > 4) continue;
  const density = road.c === 4 ? 0.3 : road.c === 3 ? 0.78 : 0.86;
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
        const gap = main ? rr(0.2, 1.2) : cit ? rr(2, 12) : rr(0.6, 5);
        if (s + w > len + 3) break;
        const cx = px + tx * (w / 2) + nx * (half + sb + d / 2), cz = pz + tz * (w / 2) + nz * (half + sb + d / 2);
        const ang = Math.atan2(tz, tx);
        if (inBox([cx, cz], -10) && rnd() < density * (cit ? 0.8 : 1) && rectFree(cx, cz, w + 1.2, d + 1.2, ang, BLOCK)) {
          const r = rnd();
          let h;
          if (cit) h = r < 0.6 ? rr(3.8, 4.8) : r < 0.96 ? rr(7.2, 8.2) : 11;
          else if (main) h = r < 0.15 ? 4.5 : r < 0.6 ? rr(7.4, 8.4) : r < 0.9 ? rr(10.8, 11.8) : rr(14, 15.5);
          else h = r < 0.42 ? rr(3.8, 4.8) : r < 0.86 ? rr(7.2, 8.2) : rr(10.6, 11.6);
          infill.push(q(cx), q(cz), q(w), q(d), Math.round(ang * 1000), q(h), main ? 1 : 0);
          fillPoly([rectCorners(cx, cz, w, d, ang)], BLD);
        }
        s += w + gap;
      }
      carry = s - len;
    }
  }
}
console.log('infill houses', infill.length / 7);

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
const treeKind = (riverish) => { const r = rnd(); return r < (riverish ? 0.09 : 0.035) ? 2 : r < 0.3 ? 1 : 0; };
for (const g of green) {
  const spacing = g.k === 'wood' ? 9 : g.k === 'park' ? 13 : g.k === 'cemetery' ? 22 : g.k === 'sacred' ? 16 : g.k === 'grass' ? 24 : 0;
  if (!spacing) continue;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const p of g.p[0]) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
  const n = Math.min(2500, Math.round(((x1 - x0) * (z1 - z0)) / (spacing * spacing)));
  for (let i = 0; i < n; i++) {
    const p = [rr(x0, x1), rr(z0, z1)];
    if (pipPoly(p, g.p)) plant(p[0], p[1], rr(0.8, 1.5), treeKind(g.k === 'park'));
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
    if (rnd() > (imp ? 0.75 : cit ? 0.7 : 0.26)) continue;
    plant(p[0], p[1], rr(0.7, 1.35), treeKind(false));
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
  if (cath && cath.geometry) addPlace('phucam', cath.tags.name || 'Nhà thờ Phủ Cam', centroid(openRing(cath.geometry.map(proj))), 3, 'place', 30);
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
  ['dcct', 'Nhà thờ Dòng Chúa Cứu Thế', 'way', 1172894102, 3, 'place', 30],
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

// =====================================================================
// write
// =====================================================================
const [infillOut, infillNear] = nearFirst(infill, 7);
const [treesOut, treesNear] = nearFirst(trees, 4);
console.log('near water: infill', infillNear, 'of', infill.length / 7, '| trees', treesNear, 'of', trees.length / 4);
const out = {
  meta: {
    origin: ORIGIN,
    bounds: [q(MINX), q(MINZ), q(MAXX), q(MAXZ)],
    osmTimestamp: raw.osm3s && raw.osm3s.timestamp_osm_base,
    counts: { buildings: buildings.length, infill: infill.length / 7, roads: roads.length, trees: trees.length / 4, infillNear, treesNear },
  },
  land: land.map(flatPoly),
  ponds: ponds.map(flatPoly),
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
  market: flat(openRing(marketArea)),
  truongtien: { a: flat([tt[0]]), b: flat([tt[tt.length - 1]]), box: { c: [q(ttBox.c[0]), q(ttBox.c[1])], w: q(ttBox.w), d: q(ttBox.d), a: Math.round(ttBox.a * 1000) } },
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
