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
// A missing input (height rasters, terrain grid, lidar points) stops the build: without it the bundle comes out
// materially different (rule heights, a flat or uncalibrated ground). `--allow-missing` builds anyway, with a warning.
const ALLOW_MISSING = process.argv.includes('--allow-missing');
const missing = (msg) => {
  if (!ALLOW_MISSING) { console.error('missing input:', msg, '\n(pass --allow-missing to build without it)'); process.exit(1); }
  console.warn(msg);
};
const quality = {}; // calibration errors, checked at the end

// Local frame: metres east (x) and south (z) of the middle of cầu Trường Tiền. Shared with the raw-data fetchers
// through scripts/frame.json. The west edge reaches chùa Thiên Mụ; the south edge takes in the royal tombs down to
// lăng Minh Mạng; the north edge reaches làng Sình at the Hương–Bồ fork. South of citySouth lie the hills (sparser
// houses and trees, real relief); north of cityNorth the riverside villages (Hương Sơ, Hương Vinh, Sình): looser houses
// on the flat plain.
const FRAME = JSON.parse(fs.readFileSync(new URL('./frame.json', import.meta.url), 'utf8'));
const ORIGIN = FRAME.origin;
const BBOX = FRAME.bbox;
const CITY_S = FRAME.citySouth;
const CITY_N = FRAME.cityNorth;
const KX = Math.cos((ORIGIN.lat * Math.PI) / 180) * 111319.49;
const KZ = FRAME.kz; // the equatorial degree of latitude, about 0.08 % short at 16.5 N: kept, see scripts/frame.json
const proj = (p) => [(p.lon - ORIGIN.lon) * KX, -(p.lat - ORIGIN.lat) * KZ];

const raw = JSON.parse(fs.readFileSync(RAW, 'utf8'));
const els = raw.elements;
// Extra strips (data/raw/hue-osm-<name>.json, see scripts/fetch-osm-all.sh) are merged in. An element present in
// several extracts keeps its newest copy: by its own `version` where the extract carries it (`out meta`), otherwise
// by the extract's timestamp (osm3s.timestamp_osm_base). It keeps the place of its first appearance in the list.
const osmExtracts = { 'hue-osm.json': (raw.osm3s && raw.osm3s.timestamp_osm_base) || null };
{
  const stamp = (j) => (j.osm3s && j.osm3s.timestamp_osm_base) || '';
  const at = new Map(els.map((e, i) => [e.type + e.id, { i, ts: stamp(raw) }]));
  for (const f of fs.readdirSync('data/raw').filter((n) => /^hue-osm-.+\.json$/.test(n))) {
    const j = JSON.parse(fs.readFileSync('data/raw/' + f, 'utf8'));
    const ts = stamp(j);
    osmExtracts[f] = ts || null;
    let added = 0, replaced = 0;
    for (const e of j.elements) {
      const k = e.type + e.id, prev = at.get(k);
      if (!prev) { at.set(k, { i: els.length, ts }); els.push(e); added++; continue; }
      const old = els[prev.i];
      const newer = old.version != null && e.version != null ? e.version > old.version : ts > prev.ts;
      if (newer) { els[prev.i] = e; prev.ts = ts; replaced++; }
    }
    console.log('merged', f, '+' + added, 'elements', replaced ? `(${replaced} replaced by this newer copy)` : '');
  }
}
const byId = new Map(els.map((e) => [e.type + e.id, e]));
const get = (type, id) => byId.get(type + id);

const [MINX, MAXZ] = proj({ lat: BBOX.s, lon: BBOX.w });
const [MAXX, MINZ] = proj({ lat: BBOX.n, lon: BBOX.e });
const CITY_MAXZ = proj({ lat: CITY_S, lon: BBOX.w })[1];
const inHills = (p) => p[1] > CITY_MAXZ;
const CITY_MINZ = proj({ lat: CITY_N, lon: BBOX.w })[1];
const inVillages = (p) => p[1] < CITY_MINZ;

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
  // sampled finer than a cell, so a corner cannot slip between two marked cells
  const su = w / Math.max(1, Math.ceil(w / 0.9)), sv = d / Math.max(1, Math.ceil(d / 0.9));
  for (let u = -w / 2; u <= w / 2 + 0.01; u += su) for (let v = -d / 2; v <= d / 2 + 0.01; v += sv) {
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
{ const tm = get('way', 205794912); if (tm) fillPoly([openRing(tm.geometry.map(proj))], NOBUILD); } // no generated houses inside chùa Thiên Mụ

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
let nDryBridges = 0;
function overWater(pts) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.5));
    for (let k = 0; k <= n; k++) if (at(a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n) & WATER) return true;
  }
  return false;
}
for (const e of els) {
  const t = e.tags || {};
  if (e.type !== 'way' || !(t.highway in ROAD_CLASS) || t.area === 'yes' || !e.geometry) continue;
  if (e.id === TT_WAY) continue;
  const c = ROAD_CLASS[t.highway];
  const tagged = t.bridge && t.bridge !== 'no' ? 1 : 0;
  for (const pts of clipLine(e.geometry.map(proj))) {
    // the bridge's own carriageways are not laid (nguyenhoang.js models the deck), but their ground stays road in
    // the mask, so no tree, garden or infill house is planted under the deck and its ramps
    if (tagged && inNH(pts[Math.floor(pts.length / 2)])) { stampLine(pts, ROAD_W[c] / 2 + 1.2, ROAD); continue; }
    // A way tagged as a bridge that crosses no drawn water is laid as ordinary road: the moat before cửa Chánh Tây
    // and several canals have been filled in, and a raised deck with piers there stands on dry land.
    const bridge = tagged && overWater(pts) ? 1 : 0;
    if (tagged && !bridge) nDryBridges++;
    roads.push({ c, bridge, name: t.name || '', pts });
    if (c < 5) stampLine(pts, ROAD_W[c] / 2 + 1.2, ROAD);
    else stampLine(pts, 1.2, ROAD);
  }
}
console.log('bridge ways over dry land laid as road:', nDryBridges);
// Is (x, z) on a carriageway (any road up to service class, bridges included), widened by pad? Exact against the road
// lines, not the 2 m mask: the avenue trees stand just off their own kerb, closer than a mask cell can tell apart.
const onCarriageway = (() => {
  const G = 20, grid = new Map();
  for (const r of roads) {
    if (r.c > 4) continue;
    const hw = ROAD_W[r.c] / 2;
    for (let i = 0; i + 1 < r.pts.length; i++) {
      const a = r.pts[i], b = r.pts[i + 1], s = [a, b, hw], m = hw + 2;
      for (let x = Math.floor((Math.min(a[0], b[0]) - m) / G); x <= Math.floor((Math.max(a[0], b[0]) + m) / G); x++)
        for (let z = Math.floor((Math.min(a[1], b[1]) - m) / G); z <= Math.floor((Math.max(a[1], b[1]) + m) / G); z++) {
          const k = x + ',' + z;
          if (!grid.has(k)) grid.set(k, []);
          grid.get(k).push(s);
        }
    }
  }
  return (x, z, pad = 0) => {
    for (const [a, b, hw] of grid.get(Math.floor(x / G) + ',' + Math.floor(z / G)) || []) {
      const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz;
      const t = L2 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)) : 0;
      if (Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz) < hw + pad) return true;
    }
    return false;
  };
})();
const rails = [];
for (const e of els) {
  const t = e.tags || {};
  if (e.type !== 'way' || t.railway !== 'rail') continue;
  for (const pts of clipLine(e.geometry.map(proj))) {
    // as for roads: a rail bridge that crosses no drawn water is laid at grade (where the line meets a street that is
    // a level crossing, not a girder standing on the carriageway)
    const tagged = t.bridge && t.bridge !== 'no';
    if (tagged && !overWater(pts)) console.log('rail bridge over dry land laid at grade:', e.id, pts.length);
    rails.push({ main: t.service ? 0 : 1, bridge: tagged && overWater(pts) ? 1 : 0, pts });
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
// Building heights, on 2 m grids in the model's frame. Two sources, the better one first:
//  1. the city's own 3D building survey (GISHue; scripts/fetch-gishue-heights.py): for every footprint, the height
//     of a surface model above the ground, flown by drone over the urban core. Against the heights that are
//     published it reads within half a metre (Phu Văn Lâu 11.7 for 11.8, điện Thái Hòa 11.7 for 11.8).
//  2. Google Open Buildings 2.5D Temporal, 2023 (scripts/fetch-heights.py): heights a network predicts from 10 m
//     satellite imagery. It reads the mass of a roof, not its ridge, and blurs narrow buildings: across the places
//     whose heights are known it comes out 10-20 % low, so a reading is raised by a tenth. Used where the survey
//     holds no footprint (it dates from 2022-23).
const raster = (name, script) => {
  const meta = `data/raw/heights/${name}.json`, bin = `data/raw/heights/${name}.u8.gz`;
  if (!fs.existsSync(meta) || !fs.existsSync(bin)) { missing(`no ${name} heights (run scripts/${script})`); return null; }
  const m = { ...JSON.parse(fs.readFileSync(meta, 'utf8')), g: zlib.gunzipSync(fs.readFileSync(bin)) };
  m.at = (x, z) => { const i = Math.floor((x - m.x0) / m.step), j = Math.floor((z - m.z0) / m.step); return i < 0 || j < 0 || i >= m.nx || j >= m.nz ? 0 : m.g[j * m.nx + i] * m.unit; };
  return m;
};
const SV = raster('gishue', 'fetch-gishue-heights.py'), HM = raster('open-buildings-2023', 'fetch-heights.py');
if (!SV && !HM) console.warn('no measured heights: building heights fall back to rules');
const cellS = (x, z) => (SV ? SV.at(x, z) : 0), cellH = (x, z) => (HM ? HM.at(x, z) : 0);
// height to the top of what stands on a footprint (0: neither source sees a building there); `measured.src` then
// says which source gave it (1 the survey, 2 the satellite prediction)
const measured = (ring, holes = []) => {
  measured.src = 0;
  if (!SV && !HM) return 0;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const p of ring) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
  const v = [], sv = [];
  let cells = 0;
  for (let z = Math.floor(z0 / 2) * 2 + 1; z <= z1; z += 2) for (let x = Math.floor(x0 / 2) * 2 + 1; x <= x1; x += 2) if (pip([x, z], ring) && !holes.some((hr) => pip([x, z], hr))) { cells++; v.push(cellH(x, z)); const a = cellS(x, z); if (a > 0) sv.push(a); }
  if (!cells) { cells = 1; v.push(cellH((x0 + x1) / 2, (z0 + z1) / 2)); const a = cellS((x0 + x1) / 2, (z0 + z1) / 2); if (a > 0) sv.push(a); }
  const area = Math.abs(ringArea(ring));
  // the survey, where its footprints cover at least half of this one: each of them carries one height, so the
  // footprint takes the height most of it stands at, leaning to the taller part
  if (sv.length >= cells * 0.5) {
    sv.sort((a, b) => a - b);
    const top = Math.min(sv[Math.min(sv.length - 1, Math.floor(sv.length * 0.6))], 4 * Math.sqrt(area));
    if (top >= 2.8) { measured.src = 1; return top; }
  }
  v.sort((a, b) => a - b);
  // a small footprint is read near its top; a large one (a hall, a market, a tower on its podium) by its bulk, so a
  // tower does not lift the whole block it stands on
  const pc = area < 600 ? 0.9 : area < 1500 ? 0.8 : 0.65;
  let top = v[Math.min(v.length - 1, Math.floor(v.length * pc))] * 1.1;
  // nothing stands more than four times as tall as it is wide: a taller reading is a neighbouring tower leaning
  // across the footprint in the satellite view
  top = Math.min(top, 4 * Math.sqrt(area));
  if (top >= 2.8) { measured.src = 2; return top; }
  return 0;
};
const measuredRect = (cx, cz, w, d, ang) => {
  const ux = Math.cos(ang), uz = Math.sin(ang);
  let m = 0;
  const sv = [];
  for (const [u, v] of [[0, 0], [-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) {
    const x = cx + ux * u * w - uz * v * d, z = cz + uz * u * w + ux * v * d, a = cellS(x, z);
    if (a > 0) sv.push(a);
    m = Math.max(m, cellH(x, z));
  }
  if (sv.length >= 2) { sv.sort((a, b) => a - b); const a = sv[sv.length >> 1]; if (a >= 2.8) return a; }
  return m * 1.1 >= 2.8 ? m * 1.1 : 0;
};
let nMeasured = 0, nSurvey = 0, nHouseMeasured = 0;
const PERIOD_CAP = { 1: 13, 2: 5.2 }, PERIOD_SLACK = 1.2; // tallest Indochine building / Nguyễn-period house, m
const periodKept = { 1: 0, 2: 0 }; // surveyed buildings too tall for their district's period
const gates = [];
const buildings = [];
const smeared = new Set(), surveyed = new Set(); // buildings whose height is the satellite prediction / the city survey's reading
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
  // only the outer ring is drawn; inner rings (courtyards) are at least kept out of the height reading
  const holes = rings.slice(1).map(openRing).filter((hr) => hr.length >= 3 && pip(centroid(hr), ring));
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
  // h is the eave; the tiled roof adds 2-6 m. A one-storey Nguyễn hall stands 8-11 m to the ridge (Thái Hòa: 11.8 m),
  // a pagoda hall 8-9 m (docs/reference/heights.md)
  else if (kind === 2) h = area > 900 ? 5.2 : area > 300 ? 4.4 : 3.6;
  else if (kind === 3) h = area > 300 ? 4.6 : 3.8;
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
  if (thienMu && pip(c, thienMu) && t.historic !== 'city_gate') { kind = 3; if (!hTag && !lv) h = area > 300 ? 4.6 : 3.8; }
  if (quocHoc && pip(c, quocHoc)) { flags |= 2; if (!hTag && !lv) h = area > 180 ? 7.8 : 4.6; } // two tall colonial storeys under the roof
  // what the building really measures, where the raster sees it and OSM gives no height of its own: h then runs to the
  // top of the building (sixth field), and the builder fits the eave under whatever roof it draws
  const mh = !hTag && !lv && kind !== 8 ? measured(ring, holes) : 0, src = mh ? measured.src : 0;
  if (mh) { h = mh; nMeasured++; if (src === 1) nSurvey++; }
  if (h > 30) kind = 7;
  // flags 4 = Indochine, 8 = Nguyễn-period timber house. The district only suggests a period: a building the survey
  // measures clearly taller than the period allows (over PERIOD_SLACK times its cap) is a later one, keeps its measured
  // height and takes no period styling. Within that, a period building is held to the period's range.
  if ((kind === 0 || kind === 1 || kind === 5) && h <= 30) {
    let era = eraOf(c, area);
    if (era && src === 1 && mh > PERIOD_CAP[era] * PERIOD_SLACK && (era === 1 || kind === 0)) { periodKept[era]++; era = 0; }
    if (era === 1) { flags |= 4; if (mh) h = Math.max(4.6, Math.min(mh, 13)); else if (!hTag && !lv && !(flags & 2)) h = area > 260 ? 9.8 : area > 70 ? 7.4 : 4.6; } // Quốc Học keeps its own
    else if (era === 2 && kind === 0) { flags |= 8; if (!hTag && !lv) h = mh ? Math.max(3.4, Math.min(mh, 5.2)) : 3.7 + r * 0.9; }
  }

  // flags: 1 = mapped over the water (drawn on a piled deck), 2 = Quốc Học campus
  if (at(c[0], c[1]) & WATER) flags |= 1;
  const b = [flat(ring), q(h), kind, t.name || 0, flags];
  if (mh && !(flags & 8)) b[5] = q(h);
  if (src === 2) smeared.add(b); else if (src === 1) surveyed.add(b);
  buildings.push(b);
  fillPoly([ring], BLD);
  stampLine([...ring, ring[0]], 1.2, BLD); // its eaves: generated houses keep clear of them
}
// A building mapped inside a landmark's own outline (Lầu Ngũ Phụng on Ngọ Môn, the block inside Kỳ Đài) belongs to
// that landmark's model: drawn as well, it would stand inside it.
{
  const rings = Object.entries(special).filter(([, sp]) => sp.ring && sp.ring.length >= 6).map(([k, sp]) => { const r = []; for (let i = 0; i < sp.ring.length; i += 2) r.push([sp.ring[i] / 10, sp.ring[i + 1] / 10]); return [k, r]; });
  for (let i = buildings.length - 1; i >= 0; i--) {
    const r = []; for (let k = 0; k < buildings[i][0].length; k += 2) r.push([buildings[i][0][k] / 10, buildings[i][0][k + 1] / 10]);
    const c = centroid(r), inside = rings.find(([, ring]) => pip(c, ring));
    if (inside) { console.log('inside landmark', inside[0], ':', buildings[i][3] || 'unnamed building', 'dropped'); buildings.splice(i, 1); }
  }
}
// Mapped buildings keep off the carriageways. OSM's footprints are older than many of its streets: houses pulled down
// when a street was cut or widened are still mapped, and stood on the asphalt. A building is trimmed back to the kerb
// (carriageway plus 0.3 m; the pavement may be built to); one the street runs through, keeping under half its plan or
// only a sliver, is gone. Bridges stand over what is under them, and footpaths are often mapped through buildings.
{
  const G = 40, grid = new Map(), strips = [];
  const strip = (a, b, hw) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L, nx = -uz, nz = ux;
    const p = [], N = 6; // a capsule: the segment with a half polygon round each end, so joints leave no notch
    for (const [e, sg] of [[b, 1], [a, -1]]) for (let k = 0; k <= N; k++) {
      const t = (k * Math.PI) / N, c = Math.cos(t) * sg, s = Math.sin(t) * sg;
      p.push([e[0] + hw * (c * nx + s * ux), e[1] + hw * (c * nz + s * uz)]);
    }
    return p;
  };
  for (const r of roads) {
    if (r.bridge || r.c > 4) continue;
    const hw = ROAD_W[r.c] / 2 + 0.3;
    for (let i = 0; i + 1 < r.pts.length; i++) {
      const a = r.pts[i], b = r.pts[i + 1], s = { a, b, hw, poly: null };
      const x0 = Math.floor((Math.min(a[0], b[0]) - hw) / G), x1 = Math.floor((Math.max(a[0], b[0]) + hw) / G);
      const z0 = Math.floor((Math.min(a[1], b[1]) - hw) / G), z1 = Math.floor((Math.max(a[1], b[1]) + hw) / G);
      for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) { const k = x + ',' + z; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(s); }
      strips.push(s);
    }
  }
  const segDist = (p, s) => {
    const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1], L2 = dx * dx + dz * dz;
    const t = L2 ? Math.max(0, Math.min(1, ((p[0] - s.a[0]) * dx + (p[1] - s.a[1]) * dz) / L2)) : 0;
    return Math.hypot(p[0] - s.a[0] - t * dx, p[1] - s.a[1] - t * dz);
  };
  let trimmed = 0, gone = 0;
  for (let i = buildings.length - 1; i >= 0; i--) {
    const b = buildings[i], ring = [];
    for (let k = 0; k < b[0].length; k += 2) ring.push([b[0][k] / 10, b[0][k + 1] / 10]);
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const p of ring) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
    const near = new Set();
    for (let x = Math.floor(x0 / G); x <= Math.floor(x1 / G); x++) for (let z = Math.floor(z0 / G); z <= Math.floor(z1 / G); z++) for (const s of grid.get(x + ',' + z) || []) near.add(s);
    // only the streets that reach the plan: a vertex inside the strip, or the strip's line inside the plan
    const hits = [...near].filter((s) => ring.some((p) => segDist(p, s) < s.hw) || pip(s.a, ring) || pip(s.b, ring) || pip([(s.a[0] + s.b[0]) / 2, (s.a[1] + s.b[1]) / 2], ring)
      || ring.some((p, k) => { const q2 = ring[(k + 1) % ring.length]; return segDist([(p[0] + q2[0]) / 2, (p[1] + q2[1]) / 2], s) < s.hw; }));
    if (!hits.length) continue;
    let rest;
    try { rest = pc.difference([ring], ...hits.map((s) => [(s.poly ||= strip(s.a, s.b, s.hw))])); } catch { continue; }
    const a0 = Math.abs(ringArea(ring));
    let best = null, ba = 0;
    for (const poly of rest) { const r = openRing(poly[0]), ar = Math.abs(ringArea(r)); if (ar > ba) { ba = ar; best = r; } }
    if (ba > a0 - 0.5) continue; // the street only grazed it
    const o = best && best.length >= 3 ? obb(best) : null;
    if (!o || ba < a0 * 0.5 || ba < 12 || Math.min(o.w, o.d) < 2.5) { buildings.splice(i, 1); gone++; continue; }
    if (ringArea(best) < 0) best.reverse();
    b[0] = flat(best);
    trimmed++;
  }
  console.log('buildings on the street: trimmed to the kerb', trimmed, '| standing in it, dropped', gone);
}
// Round the 160 m Vincom tower the satellite raster is smeared with its height: buildings it measured within 220 m
// keep to 20 m (the survey's own readings stand).
if (special.vincom) {
  const vr = []; for (let i = 0; i < special.vincom.ring.length; i += 2) vr.push([special.vincom.ring[i] / 10, special.vincom.ring[i + 1] / 10]);
  const vc = centroid(vr);
  let n = 0;
  for (const b of buildings) {
    if (!b[5] || b[1] <= 200 || !smeared.has(b)) continue;
    const r = []; for (let i = 0; i < b[0].length; i += 2) r.push([b[0][i] / 10, b[0][i + 1] / 10]);
    const c = centroid(r);
    if (Math.hypot(c[0] - vc[0], c[1] - vc[1]) > 220) continue;
    b[1] = b[5] = 200; if (b[2] === 7) b[2] = 1; n++;
  }
  console.log('capped beside Vincom:', n);
}
console.log('surveyed taller than the period: kept measured, not styled | Indochine (over', PERIOD_CAP[1] * PERIOD_SLACK, 'm)', periodKept[1], '| Nguyễn-period (over', +(PERIOD_CAP[2] * PERIOD_SLACK).toFixed(2), 'm)', periodKept[2]);
console.log('measured heights on', nMeasured, 'of', buildings.length, 'buildings |', nSurvey, 'from the city survey,', nMeasured - nSurvey, 'from the satellite prediction');
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
// a generated house stands as tall as what the raster measures on its plot (to the eave: its tiled roof comes on top);
// where the raster sees nothing it keeps the height the street rule gave it
const houseH = (cx, cz, w, d, ang, rule) => {
  const m = measuredRect(cx, cz, w, d, ang);
  if (!m) return rule;
  nHouseMeasured++;
  return Math.max(3.4, Math.min(m - 1.2, 18)) + (rule % 1) * 0.4;
};
const BLOCK = WATER | GREEN | ROAD | BLD | NOBUILD;
// Generated houses are drawn with roofs wider than their walls (src/geo/city.js, buildInfill: hip eaves 0.9 m modern,
// 1.8 m Indochine, 2.4 m timber, in total across). Each house reserves its walls plus half its eaves on every side and a
// small gap, and is tested exactly against every house already placed (separating axes on the two rectangles), not
// only on the 2 m grid, where two turned rectangles could overlap by a metre. INFILL_PAD is mirrored in city.js.
const INFILL_PAD = [0.55, 0.9, 1.2], INFILL_GAP = 0.3;
const placed = new Map(), PCELL = 24;
const obbCorners = (o) => rectCorners(o.cx, o.cz, o.w, o.d, o.a);
function obbOverlap(A, B) {
  const ca = obbCorners(A), cb = obbCorners(B);
  for (const o of [A, B]) for (const ax of [[Math.cos(o.a), Math.sin(o.a)], [-Math.sin(o.a), Math.cos(o.a)]]) {
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const p of ca) { const t = p[0] * ax[0] + p[1] * ax[1]; a0 = Math.min(a0, t); a1 = Math.max(a1, t); }
    for (const p of cb) { const t = p[0] * ax[0] + p[1] * ax[1]; b0 = Math.min(b0, t); b1 = Math.max(b1, t); }
    if (a1 <= b0 || b1 <= a0) return false;
  }
  return true;
}
function houseFits(cx, cz, w, d, ang, era) {
  const pad = INFILL_PAD[era] + INFILL_GAP / 2;
  const o = { cx, cz, w: w + pad * 2, d: d + pad * 2, a: ang };
  if (!rectFree(cx, cz, o.w, o.d, ang, BLOCK)) return null;
  const gx = Math.floor(cx / PCELL), gz = Math.floor(cz / PCELL);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const p of placed.get(gx + i + ',' + (gz + j)) || []) if (obbOverlap(o, p)) return null;
  return o;
}
function housePlace(o) {
  const k = Math.floor(o.cx / PCELL) + ',' + Math.floor(o.cz / PCELL);
  let l = placed.get(k);
  if (!l) placed.set(k, (l = []));
  l.push(o);
  fillPoly([obbCorners(o)], BLD);
}
for (const road of roads) {
  if (road.bridge || road.c > 4) continue;
  const hills = inHills(road.pts[0]);
  if (hills && road.c > 3) continue;
  const density = (road.c === 4 ? 0.3 : road.c === 3 ? 0.78 : 0.86) * (hills ? 0.42 : inVillages(road.pts[0]) ? 0.6 : 1);
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
            if (!inBox([bx, bz], -10) || rnd() > (cit ? 0.38 : row === 0 ? 0.6 : 0.3)) continue;
            const era2 = eraOf([bx, bz], w2 * d2);
            const o2 = houseFits(bx, bz, w2, d2, ang, era2);
            if (!o2) continue;
            const r2 = rnd();
            const h2 = cit ? (r2 < 0.7 ? rr(3.8, 4.8) : rr(7.2, 8.2)) : r2 < 0.5 ? rr(3.8, 4.8) : r2 < 0.9 ? rr(7.2, 8.2) : rr(10.6, 11.6);
            const m2 = houseH(bx, bz, w2, d2, ang, h2);
            infill.push(q(bx), q(bz), q(w2), q(d2), Math.round(ang * 1000), q(era2 === 2 ? Math.min(m2, 4.4) : m2), 0, 2 | (era2 << 2)); // 2 = no street face; era in the upper bits
            housePlace(o2);
          }
        }
        const era = inBox([cx, cz], -10) && rnd() < density * (cit ? 0.9 : 1) ? eraOf([cx, cz], w * d) : -1;
        const o1 = era >= 0 ? houseFits(cx, cz, w, d, ang, era) : null;
        if (o1) {
          const r = rnd();
          let h;
          if (cit) h = r < 0.6 ? rr(3.8, 4.8) : r < 0.96 ? rr(7.2, 8.2) : 11;
          else if (main) h = r < 0.15 ? 4.5 : r < 0.6 ? rr(7.4, 8.4) : r < 0.9 ? rr(10.8, 11.8) : rr(14, 15.5);
          else h = r < 0.42 ? rr(3.8, 4.8) : r < 0.86 ? rr(7.2, 8.2) : rr(10.6, 11.6);
          h = houseH(cx, cz, w, d, ang, h);
          if (era === 2) h = Math.min(h, 4.4); else if (era === 1) h = Math.min(Math.max(h, 7.2), 11.4);
          infill.push(q(cx), q(cz), q(w), q(d), Math.round(ang * 1000), q(h), main ? 1 : 0, (side > 0 ? 1 : 0) | (era << 2));
          housePlace(o1);
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
const TRUNK = 0.6; // a trunk's reach: no tree stands closer than this to a carriageway's edge
function plant(x, z, s, kind) {
  if (!inBox([x, z], -4) || at(x, z) & TBLOCK || onCarriageway(x, z, TRUNK)) return false;
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
        // each carriageway of a dual road is its own way, so one side's avenue lands on the other carriageway, and
        // at junctions and the bridge heads on the crossing roads: keep the trunk off every carriageway
        if (!(at(x, z) & (WATER | BLD | TREE)) && !onCarriageway(x, z, TRUNK)) { trees.push(q(x), q(z), Math.round(rr(0.75, 1.15) * 10), treeKind(false)); stamp(x, z, 3, TREE); }
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
    if (rnd() > (imp ? 0.75 : cit ? 0.7 : inHills(p) ? 0.06 : inVillages(p) ? 0.2 : 0.26)) continue;
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
// Real forest (issue #7): OSM maps almost none of the woods that close over the tombs and hills, so the forest is
// planted from ESA WorldCover's 10 m tree-cover map (scripts/fetch-landcover.py). Close planting in a ring round each
// heritage site, where people look; a looser stand over the rest of the wooded hills and villages.
const TC = (() => {
  const f = 'data/raw/dem/treecover.json';
  if (!fs.existsSync(f)) { console.warn('no tree cover (run scripts/fetch-landcover.py)'); return null; }
  const t = JSON.parse(fs.readFileSync(f, 'utf8'));
  return { ...t, b: Buffer.from(t.bits, 'base64') };
})();
const isWooded = (x, z) => {
  if (!TC) return false;
  const i = Math.floor((ORIGIN.lon + x / KX - TC.west) / TC.dlon), j = Math.floor((TC.north - (ORIGIN.lat - z / KZ)) / TC.dlat);
  if (i < 0 || j < 0 || i >= TC.nx || j >= TC.ny) return false;
  const k = j * TC.nx + i;
  return (TC.b[k >> 3] >> (7 - (k & 7))) & 1;
};
const heritage = SITE_DEFS.map(([, , x, z, r]) => [x, z, r + 250]);
heritage.push([-2784, 5161, 350], [770, 2990, 400]); // the pine-clad hills of Vọng Cảnh and Ngự Bình (places added in §8)
{
  const HER = new Set(['tomb', 'ruins', 'archaeological_site', 'memorial', 'monument', 'castle', 'heritage_building', 'manor']);
  for (const e of els) {
    const t = e.tags;
    if (!t || !t.name || !(HER.has(t.historic) || t.tourism === 'attraction' || t.amenity === 'place_of_worship')) continue;
    const c = e.type === 'node' ? proj(e) : e.geometry ? centroid(openRing(e.geometry.map(proj))) : e.bounds ? proj({ lat: (e.bounds.minlat + e.bounds.maxlat) / 2, lon: (e.bounds.minlon + e.bounds.maxlon) / 2 }) : null;
    if (c && inBox(c) && !inCitadel(c)) heritage.push([c[0], c[1], inHills(c) ? 200 : 170]);
  }
}
const nearHeritage = (x, z) => heritage.some(([hx, hz, r]) => (x - hx) ** 2 + (z - hz) ** 2 < r * r);
if (TC) {
  const before = trees.length / 4;
  let ring = 0;
  for (let z = MINZ; z < MAXZ; z += 10) for (let x = MINX; x < MAXX; x += 10) {
    const near = nearHeritage(x + 5, z + 5);
    const outside = inHills([x, z]) || inVillages([x, z]);
    if (!near && !outside) continue; // the city keeps its garden canopy
    if (!near && rnd() > 0.15) continue; // about one tree per 26 m away from the sites
    const px = x + rr(0, 10), pz = z + rr(0, 10);
    if (!isWooded(px, pz) || inCitadel([px, pz]) || at(px, pz) & (TBLOCK | NOBUILD)) continue;
    if (plant(px, pz, rr(0.85, 1.5), inHills([px, pz]) ? hillKind() : treeKind(false)) && near) ring++;
  }
  console.log('tree cover:', heritage.length, 'heritage rings,', trees.length / 4 - before, 'trees planted from WorldCover (', ring, 'in the rings )');
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
  // làng nghề (#14). Thanh Tiên's paper-flower village is not in OSM yet.
  ['thuyxuan', 'Làng hương Thủy Xuân', 'way', 1473275556, 2, 'craft', 6],
  ['phuongduc', 'Làng đúc đồng Phường Đúc', 'node', 9960090217, 2, 'craft', 8],
  ['sinh', 'Làng tranh Sình', 'node', 9960092017, 2, 'craft', 8],
];
for (const [id, n, type, osm, tier, kind, h] of EXTRA) addPlace(id, n, wayCentre(osm, type), tier, kind, h);
for (const [id, n, x, z, , tier, h] of SITE_DEFS) addPlace(id, n, [x, z], tier, id === 'thuytien' ? 'water' : 'monument', h);
addPlace('vongcanh', 'Đồi Vọng Cảnh', [-2784, 5161], 3, 'place', 12); // the 43 m hill standing straight over the river bend; moved onto its top in §9
addPlace('ngubinh', 'Núi Ngự Bình', [770, 2990], 2, 'place', 20); // the summit (16.4419 N, 107.5961 E); moved onto the highest ground in §9
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

// True heights: a named place drawn as an ordinary building takes its real height to the ridge (or parapet), in
// metres above its floor, as a sixth field the builder honours whatever roof it gives the footprint. Most of this
// table is estimated from storeys and type (docs/reference/heights.md), so where the city survey measured the
// building its reading stands and the table only marks the place as a monument. điện Kiến Trung was rebuilt in 2024,
// after the survey: its 14 m is the conservation centre's own figure (docs/reference/heights-sourced.md).
const AFTER_SURVEY = ['kientrung'];
const TRUE_H = {
  themieu: 10.5, hungmieu: 8.5, thaimieu: 10, trieumieu: 8, dientho: 9, truongsanh: 7.5, duyetthi: 12.5, kientrung: 14,
  quoctugiam: 10, baotangcovat: 11.5, tangthulau: 10.5, tudam: 13, baoquoc: 8, thuongbac: 6.5, hoquyen: 5.8,
  diemphungthi: 8.5, tayloc: 7.5, ancuu: 6.5, benngu: 8.5,
};
const OLD_HALL = ['quoctugiam', 'baotangcovat', 'tangthulau', 'thuongbac'];
for (const [id, top] of Object.entries(TRUE_H)) {
  const pl = places.find((p) => p.id === id);
  if (!pl) continue;
  const c = [pl.x / 10, pl.z / 10];
  let best = null, bd = 25, inside = false;
  for (const b of buildings) {
    const ring = [];
    for (let i = 0; i < b[0].length; i += 2) ring.push([b[0][i] / 10, b[0][i + 1] / 10]);
    if (pip(c, ring)) { best = b; inside = true; break; }
    const cc = centroid(ring), d = Math.hypot(cc[0] - c[0], cc[1] - c[1]);
    if (d < bd) { bd = d; best = b; }
  }
  if (!best) { console.warn('true height: no building at', id); continue; }
  // the place point stands in no footprint: the nearest one is taken, which may be a neighbour (check the name)
  if (!inside) console.warn('true height', id, ': place point in no footprint, nearest building', bd.toFixed(1), 'm away taken:', best[3] || 'unnamed');
  best[6] = 1; // 1: a monument (no stair heads or tanks on its roof)
  if (surveyed.has(best) && !AFTER_SURVEY.includes(id)) console.log('true height', id.padEnd(13), 'table', String(top).padStart(5), '| survey', (best[5] / 10).toFixed(1).padStart(5), '(kept)');
  else { best[1] = Math.min(best[1], q(top)); best[5] = q(top); console.log('true height', id.padEnd(13), 'table', String(top).padStart(5), '(used)'); }
  if (OLD_HALL.includes(id) && best[2] < 2) best[2] = 3; // a tiled timber hall, not a modern block
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
// a tag stands over the highest part of the model within this radius (default 14 m): these have towers off-centre
for (const [id, r] of [['phucam', 36], ['dcct', 36], ['thienan', 36]]) { const pl = places.find((p) => p.id === id); if (pl) pl.r = r; }
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
// 9. Terrain: height above the flat city floor, from a bare-earth elevation model
// =====================================================================
let terrain = null;
let hakhe = null; // the level ground of chùa Thiên Mụ: its outline and height above the city floor
let pondLv = ponds.map(() => 0); // metres above the city floor at which each still-water body stands (0: at city level)
{
  // Bare-earth heights (FABDEM: Copernicus GLO-30 with forests and buildings removed), written for the model's box by
  // scripts/fetch-terrain.py. A surface model reads roofs and canopy as ground: the flat city then carries several
  // metres of noise and every low hill has to be flattened along with it.
  const DEM = 'data/raw/dem/terrain.json';
  if (!fs.existsSync(DEM)) missing('no terrain grid (run scripts/fetch-terrain.py): terrain stays flat');
  else {
    const D = JSON.parse(fs.readFileSync(DEM, 'utf8'));
    const sample = (arr) => (x, z) => {
      const lon = ORIGIN.lon + x / KX, lat = ORIGIN.lat - z / KZ;
      const px = Math.max(0, Math.min(D.nx - 1.001, (lon - D.lon0) / D.dlon - 0.5)), py = Math.max(0, Math.min(D.ny - 1.001, (lat - D.lat0) / D.dlat - 0.5));
      const ix = Math.floor(px), iy = Math.floor(py), ax = px - ix, ay = py - iy;
      const g = (a, b) => arr[b * D.nx + a] / 10;
      return (g(ix, iy) * (1 - ax) + g(ix + 1, iy) * ax) * (1 - ay) + (g(ix, iy + 1) * (1 - ax) + g(ix + 1, iy + 1) * ax) * ay;
    };
    const bareAt = sample(D.h), surfAt = sample(D.s || D.h);
    // ceil, so the last row and column reach MAXX / MAXZ: with floor the grid stopped up to one step short of the
    // east and south edges, and land in that strip read as the flat city floor beside the hills (trees sunk 160 m)
    // The grid's nodes sit on a fixed 25 m lattice laid from frame.json's gridAnchor (the box's north-west corner when
    // the grid was first tuned), not from the current corner: widening the box adds rows and columns without moving a
    // node, so every height already fitted to the grid (replicas, the burial and height checks) keeps its ground.
    const STEP = 25, [AX, AZ] = proj(FRAME.gridAnchor);
    const GX0 = AX + Math.floor((MINX - AX) / STEP) * STEP, GZ0 = AZ + Math.floor((MINZ - AZ) / STEP) * STEP;
    const nx = Math.ceil((MAXX - GX0) / STEP) + 1, nz = Math.ceil((MAXZ - GZ0) / STEP) + 1;
    const sstep = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
    // ---- Calibration: the whole map against measured heights --------------------------------------------------
    // Two kinds of measurement exist. ICESat-2's laser gives the ground itself, to a few decimetres, every 10 m along
    // its tracks (scripts/fetch-lidar.py: thousands of points, most of the box within a few hundred metres of one).
    // The documented summits (data/control-points.json) cover the hilltops, which the tracks mostly miss.
    //
    // 1. Summits. On slopes the bare-earth model agrees with the laser (no bias from 10 to 40 m), so its forest
    //    removal is right there. On hilltops it is not: a 30 m grid rounds a crown off and the removal then takes a
    //    canopy's worth more, and it reads 2-10 m under every documented summit. The surface model with CROWN added
    //    matches those summits to about a metre. So the ground moves from bare earth to that as the land turns
    //    convex: `convex` is how far a cell stands above its surroundings (the bare model less itself blurred over
    //    about 120 m), none of it under CV0, all of it from CV1.
    const convex = (() => {
      const R = 16, k = [], tmp = new Float32Array(D.nx * D.ny), out = new Float32Array(D.nx * D.ny);
      for (let i = -R; i <= R; i++) k.push(Math.exp(-(i * i) / 32));
      const ks = k.reduce((a, b) => a + b, 0);
      for (let y = 0; y < D.ny; y++) for (let x = 0; x < D.nx; x++) { let a = 0; for (let i = -R; i <= R; i++) a += D.h[y * D.nx + Math.max(0, Math.min(D.nx - 1, x + i))] * k[i + R]; tmp[y * D.nx + x] = a / ks; }
      for (let y = 0; y < D.ny; y++) for (let x = 0; x < D.nx; x++) { let a = 0; for (let i = -R; i <= R; i++) a += tmp[Math.max(0, Math.min(D.ny - 1, y + i)) * D.nx + x] * k[i + R]; out[y * D.nx + x] = D.h[y * D.nx + x] - a / ks; }
      return out;
    })();
    const convexAt = sample(convex);
    const CV0 = 2, CV1 = 27, CROWN = 2;
    const baseAt = (x, z) => { const b = bareAt(x, z); return b + sstep((convexAt(x, z) - CV0) / (CV1 - CV0)) * (Math.max(0, surfAt(x, z) - b) + CROWN); };
    // 2. The laser. What is left between it and the model varies from place to place (the bare-earth model keeps
    //    about a metre of roofs inside the Citadel, and reads Hà Khê hill 3 m low), so the difference is spread from
    //    the tracks as a smooth field: each point weighs by a bell SIG wide, and away from any track the field falls
    //    back (by LAM points' worth) on the same average taken over a district (a bell WIDE wide), and that on
    //    nothing. Points on water, on steep ground (where a 10 m footprint error is metres of height) and wild
    //    returns are left out.
    let fieldAt = () => 0, river = null, lidar = null;
    const LIDAR = 'data/raw/lidar/icesat2-ground.json';
    if (!fs.existsSync(LIDAR)) missing('no lidar ground points (run scripts/fetch-lidar.py): terrain is not calibrated on the plain');
    else {
      const SIG = 150, LAM = 4, WIDE = 900, LAMW = 8, CELL = 300, land = [], wet = [];
      for (const [lat, lon, ele, pass] of JSON.parse(fs.readFileSync(LIDAR, 'utf8')).pts) {
        const [x, z] = proj({ lat, lon });
        if (x < MINX || x > MAXX || z < MINZ || z > MAXZ) continue;
        const b = bareAt(x, z);
        if (b <= 0.6 && surfAt(x, z) <= 0.6) { wet.push(ele); continue; } // both models hold open water flat at 0.5
        if (at(x, z) & WATER) continue;
        const slope = Math.hypot(bareAt(x + 15, z) - bareAt(x - 15, z), bareAt(x, z + 15) - bareAt(x, z - 15)) / 30;
        if (slope > 0.3 || Math.abs(ele - b) > 15) continue;
        land.push({ x, z, ele, pass, b, s: surfAt(x, z), r: ele - baseAt(x, z) });
      }
      wet.sort((a, b) => a - b);
      river = wet.length ? wet[wet.length >> 1] : null;
      const bins = new Map(), key = (x, z) => Math.floor(x / CELL) * 8192 + Math.floor(z / CELL);
      for (const p of land) { const k = key(p.x, p.z); if (!bins.has(k)) bins.set(k, []); bins.get(k).push(p); }
      const reach = Math.ceil(2.5 * WIDE / CELL), near = Math.ceil(3 * SIG / CELL);
      const field = (x, z, skip) => {
        let sum = 0, w = 0, sumW = 0, wW = 0;
        for (let dx = -reach; dx <= reach; dx++) for (let dz = -reach; dz <= reach; dz++) {
          const cell = bins.get(key(x + dx * CELL, z + dz * CELL));
          if (!cell) continue;
          const close = Math.abs(dx) <= near && Math.abs(dz) <= near;
          for (const p of cell) {
            if (p.pass === skip) continue;
            const d2 = (p.x - x) ** 2 + (p.z - z) ** 2, gw = Math.exp(-d2 / (2 * WIDE * WIDE));
            sumW += p.r * gw; wW += gw;
            if (close) { const g = Math.exp(-d2 / (2 * SIG * SIG)); sum += p.r * g; w += g; }
          }
        }
        return (sum + LAM * (sumW / (wW + LAMW))) / (w + LAM);
      };
      fieldAt = (x, z) => field(x, z, -1);
      // how good is it? Each overpass is predicted from the others, so no point tests itself.
      const rms = (a) => Math.sqrt(a.reduce((t, e) => t + e * e, 0) / (a.length || 1)).toFixed(2), med = (a) => { const c = [...a].sort((u, v) => u - v); return (c[c.length >> 1] || 0).toFixed(2); };
      const row = (name, sel) => {
        const pts = land.filter(sel);
        console.log('  ' + name.padEnd(22), String(pts.length).padStart(5), '| bare', rms(pts.map((p) => p.b - p.ele)), '(' + med(pts.map((p) => p.b - p.ele)) + ')', '| surface', rms(pts.map((p) => p.s - p.ele)), '(' + med(pts.map((p) => p.s - p.ele)) + ')',
          '| calibrated', rms(pts.map((p) => field(p.x, p.z, p.pass) - p.r)), '(' + med(pts.map((p) => field(p.x, p.z, p.pass) - p.r)) + ')');
      };
      console.log('lidar ground points:', land.length, 'on land,', wet.length, 'on open water (river level', river === null ? '-' : river.toFixed(2), 'm) | error in m rms (median), each overpass predicted from the others');
      row('plain, under 8 m', (p) => p.ele < 8); row('rising ground, 8-25 m', (p) => p.ele >= 8 && p.ele < 25); row('hills, over 25 m', (p) => p.ele >= 25); row('all', () => true);
      quality.lidarRms = +rms(land.map((p) => field(p.x, p.z, p.pass) - p.r));
      lidar = land;
    }
    const demAt = (x, z) => baseAt(x, z) + fieldAt(x, z);
    // the city's own ground: the median of the calibrated ground inside the Citadel
    const flatSamples = [];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const x = GX0 + i * STEP, z = GZ0 + j * STEP;
      if (inCitadel([x, z]) && !(at(x, z) & WATER)) flatSamples.push(demAt(x, z));
    }
    flatSamples.sort((a, b) => a - b);
    // ... or, better, what the laser itself measured inside the walls, where enough of its points fall there
    const inWalls = lidar ? lidar.filter((p) => inCitadel([p.x, p.z])).map((p) => p.ele).sort((a, b) => a - b) : [];
    const floor = inWalls.length >= 50 ? inWalls[inWalls.length >> 1] : flatSamples[Math.floor(flatSamples.length * 0.5)];
    console.log('city floor: laser inside the Citadel', inWalls.length, 'points, median', inWalls.length ? inWalls[inWalls.length >> 1].toFixed(2) : '-', '| calibrated model there', flatSamples[Math.floor(flatSamples.length * 0.5)].toFixed(2));
    let h = new Float32Array(nx * nz);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) h[j * nx + i] = demAt(GX0 + i * STEP, GZ0 + j * STEP);
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
    // The city floor still reads most of a metre of noise (0.8 m rms against the laser), and the model wants it flat.
    // A smoothed copy decides WHERE the ground really rises; the height itself comes from a lightly smoothed copy, so
    // hills keep their true height above the city floor. Ground under DEAD above the floor stays flat; from FULL up
    // it stands at its true height. (Against the laser the drawn ground then reads +0.3 m on the plain, -0.8 m on the
    // 5-8 m rises this squeezes, and within 0.2 m above them.)
    const DEAD = 1.2, FULL = 3.0;
    const gateOf = (up) => { const t = Math.max(0, Math.min(1, (up - DEAD) / (FULL - DEAD))); return t * t * (3 - 2 * t); };
    const raw = h;
    const broad = blur(raw), fine = (() => {
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
    // and hold the ground flat at that level under the water. The shore and the islands only stand no LOWER than it:
    // holding them flat at the water's level too cut every hill that rises from a lake (the Bửu Thành mound of lăng
    // Minh Mạng was sheared in half, its lake side dropped 10 m to the water and the ring wall left on a ramp).
    const nodeLv = new Float32Array(nx * nz), shoreLv = new Float32Array(nx * nz);
    ponds.forEach((poly, pi) => {
      const ring = poly[0], c = centroid(ring);
      if (inCitadel(c)) return;
      const vals = [demAt(c[0], c[1])];
      for (let i = 0; i < ring.length; i += Math.max(1, ring.length >> 4)) vals.push(demAt(ring[i][0], ring[i][1]));
      vals.sort((a, b) => a - b);
      // the same squeeze the ground around it gets, so a low lake is not left perched above its own shore
      const up = vals[Math.floor(vals.length * 0.3)] - floor, lv = up * gateOf(up) - 0.3;
      if (lv < 1.5) return;
      pondLv[pi] = lv;
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const q0 of ring) { x0 = Math.min(x0, q0[0]); x1 = Math.max(x1, q0[0]); z0 = Math.min(z0, q0[1]); z1 = Math.max(z1, q0[1]); }
      const near = (x, z) => { for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)); if (Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < 34) return true; } return false; };
      for (let j = Math.max(0, Math.floor((z0 - 40 - GZ0) / STEP)); j <= Math.min(nz - 1, Math.ceil((z1 + 40 - GZ0) / STEP)); j++) for (let i = Math.max(0, Math.floor((x0 - 40 - GX0) / STEP)); i <= Math.min(nx - 1, Math.ceil((x1 + 40 - GX0) / STEP)); i++) {
        const x = GX0 + i * STEP, z = GZ0 + j * STEP;
        // islands are holes in the water polygon: shore, not water
        const k = j * nx + i, wet = pip([x, z], ring) && !poly.slice(1).some((hole) => pip([x, z], hole));
        if (wet) nodeLv[k] = Math.max(nodeLv[k], lv);
        else if (pip([x, z], ring) || near(x, z)) shoreLv[k] = Math.max(shoreLv[k], lv);
      }
    });
    console.log('raised lakes', pondLv.filter((v) => v > 0).length, 'of', ponds.length, '| highest', Math.max(0, ...pondLv).toFixed(1), 'm');
    // Hà Khê hill: chùa Thiên Mụ's walled ground is one level. The model reads that level, stands the front of the
    // compound on a stone terrace and lays the stair down to the road (buildThienMu); a 25 m grid alone rounds the
    // hill's brow off under the tower.
    if (thienMu) {
      const inside = [];
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) if (pip([GX0 + i * STEP, GZ0 + j * STEP], thienMu)) inside.push(j * nx + i);
      const ups = inside.map((k) => fine[k] - floor).sort((a, b) => a - b);
      // the laser crossed the compound: its ground is then what was measured, not what a 25 m grid makes of the hill
      const shot = lidar ? lidar.filter((p) => pip([p.x, p.z], thienMu)).map((p) => p.ele - floor).sort((a, b) => a - b) : [];
      const top = shot.length >= 5 ? shot[shot.length >> 1] : ups.length ? ups[Math.floor(ups.length * 0.6)] : 0;
      console.log('Hà Khê: laser points inside the compound', shot.length, shot.length ? '| ' + (shot[0] + floor).toFixed(1) + ' to ' + (shot[shot.length - 1] + floor).toFixed(1) + ' m asl' : '', '| grid reading', ups.length ? (ups[Math.floor(ups.length * 0.6)] + floor).toFixed(1) : '-');
      if (top > 1.5) { for (const k of inside) nodeLv[k] = Math.max(nodeLv[k], top); hakhe = { ring: flat(thienMu), top: q(top) }; }
      console.log('Hà Khê plateau', top.toFixed(1), 'm above the city floor |', inside.length, 'nodes');
    }
    const nearWet = (x, z) => { for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (at(x + dx * STEP, z + dz * STEP) & WATER) return true; return false; };
    const lock = new Uint8Array(nx * nz);
    h = new Float32Array(nx * nz);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const x = GX0 + i * STEP, z = GZ0 + j * STEP, k = j * nx + i;
      // the slab's edge may stand high in the hills (it is cut like a model); only the city's own edges stay flat
      const edge = i === 0 || j === 0 || i === nx - 1 || j === nz - 1;
      if (nodeLv[k] > 0) { h[k] = nodeLv[k]; lock[k] = 2; continue; }
      // banks stay at street level, except where a hill stands straight over the water (đồi Vọng Cảnh's bluff)
      const bank = !shoreLv[k] && nearWet(x, z) && !(fine[k] - floor > 12 && !(at(x, z) & WATER));
      if ((edge && !inHills([x, z])) || bank || inCitadel([x, z]) || wallBandTest([x, z])) { lock[k] = 1; continue; }
      h[k] = Math.max(0, fine[k] - floor) * gateOf(broad[k] - floor);
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
    // the smoothing shaves narrow summits (đồi Vọng Cảnh is about 100 m across): well above the plain, where the
    // bare-earth reading needs no smoothing, a node stands no lower than what was measured there
    for (let k = 0; k < h.length; k++) if (!lock[k] && raw[k] - floor > FULL + 3) h[k] = Math.max(h[k], raw[k] - floor);
    // and a summit that falls between the grid's nodes is not lost: a node that tops its neighbours stands at the
    // highest ground within its own cell
    for (let j = 1; j < nz - 1; j++) for (let i = 1; i < nx - 1; i++) {
      const k = j * nx + i;
      if (lock[k] || raw[k] - floor <= FULL + 3) continue;
      let peak = true;
      for (let dj = -1; dj <= 1 && peak; dj++) for (let di = -1; di <= 1; di++) if ((di || dj) && raw[k + dj * nx + di] > raw[k]) { peak = false; break; }
      if (!peak) continue;
      let m = raw[k];
      for (let dz = -10; dz <= 10; dz += 5) for (let dx = -10; dx <= 10; dx += 5) m = Math.max(m, demAt(GX0 + i * STEP + dx, GZ0 + j * STEP + dz));
      h[k] = Math.max(h[k], m - floor);
    }
    // a lake's shore and islands stand no lower than its water
    let shoreHigh = 0;
    for (let k = 0; k < h.length; k++) if (shoreLv[k] && !lock[k]) { if (h[k] > shoreLv[k] + 2) shoreHigh++; h[k] = Math.max(h[k], shoreLv[k]); }
    console.log('lake shores:', shoreHigh, 'nodes stand over 2 m above their lake (they were held flat at its level)');
    for (let k = 0; k < h.length; k++) if (lock[k] === 1 || h[k] < 0.35) h[k] = 0;
    // ground cover on raised ground (flat land takes its colour from the polygon overlay instead)
    const COVER = { park: 1, wood: 2, grass: 3, farm: 4, cemetery: 5, pitch: 6, sacred: 7 };
    let cover = '', lifted = 0, peak = 0;
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      let c = 0;
      if (h[k] > 0) {
        lifted++; peak = Math.max(peak, h[k]);
        const p = [GX0 + i * STEP, GZ0 + j * STEP];
        for (const g of green) if (pipPoly(p, g.p)) { c = COVER[g.k] || 0; break; }
        if (!c && isWooded(p[0], p[1])) c = COVER.wood; // the forest floor under WorldCover's tree cover
      }
      cover += c;
    }
    terrain = { x0: q(GX0), z0: q(GZ0), step: STEP, nx, nz, h: Array.from(h, (v) => Math.round(v * 10)), cover };
    // A hill's tag stands on its summit: the highest ground near its given point.
    for (const [id, R] of [['ngubinh', 250], ['vongcanh', 80]]) {
      const pl = places.find((p) => p.id === id);
      if (!pl) continue;
      const px = pl.x / 10, pz = pl.z / 10;
      let best = -1, bx = px, bz = pz;
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
        const x = GX0 + i * STEP, z = GZ0 + j * STEP;
        if (Math.hypot(x - px, z - pz) <= R && h[j * nx + i] > best) { best = h[j * nx + i]; bx = x; bz = z; }
      }
      console.log('summit', id, [px, pz].map(Math.round), '->', [bx, bz].map(Math.round), best.toFixed(1), 'm');
      pl.x = q(bx); pl.z = q(bz);
    }
    // The control points: documented heights against the two source models, the calibrated ground, and what the
    // model finally stands there (its 25 m grid and the flat plain included).
    if (fs.existsSync('data/control-points.json')) {
      const pts = JSON.parse(fs.readFileSync('data/control-points.json', 'utf8'));
      const top = (f, x, z, R) => { let m = -Infinity; for (let dx = -R; dx <= R; dx += 10) for (let dz = -R; dz <= R; dz += 10) if (dx * dx + dz * dz <= R * R) m = Math.max(m, f(x + dx, z + dz)); return m; };
      const modelAt = (x, z, R) => {
        if (x < MINX || x > MAXX || z < MINZ || z > MAXZ) return NaN;
        let m = 0;
        for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) if (Math.hypot(GX0 + i * STEP - x, GZ0 + j * STEP - z) <= R + STEP / 2) m = Math.max(m, h[j * nx + i]);
        return floor + m;
      };
      const mean = (f, x, z, R) => { let s2 = 0, n = 0; for (let dx = -R; dx <= R; dx += 10) for (let dz = -R; dz <= R; dz += 10) if (dx * dx + dz * dz <= R * R) { s2 += f(x + dx, z + dz); n++; } return s2 / n; };
      const err = { bare: [], surface: [], calibrated: [], model: [] };
      console.log('control points (m above sea level): documented | bare earth | surface | calibrated | model');
      for (const c of pts) {
        const [x, z] = proj(c), R = c.r || 100, f = c.what === 'summit' ? top : mean;
        // the model's own ground: the city floor plus what the terrain rises there (water is drawn lower, by design)
        // a sample off the grid (a disc crossing the slab's edge) is left out rather than read from a neighbouring row
        const model = c.what === 'water' ? NaN : c.what === 'summit' ? modelAt(x, z, R) : (x < MINX || x > MAXX || z < MINZ || z > MAXZ ? NaN : floor + (() => { let s2 = 0, n = 0; for (let dx = -R; dx <= R; dx += 10) for (let dz = -R; dz <= R; dz += 10) if (dx * dx + dz * dz <= R * R) { const i = Math.round((x + dx - GX0) / STEP), k = Math.round((z + dz - GZ0) / STEP); if (i < 0 || k < 0 || i >= nx || k >= nz) continue; s2 += h[k * nx + i]; n++; } return n ? s2 / n : NaN; })());
        const v = { bare: f(bareAt, x, z, R), surface: f(surfAt, x, z, R), calibrated: f(demAt, x, z, R), model };
        if (!c.doubt) for (const k of Object.keys(err)) if (Number.isFinite(v[k])) err[k].push(v[k] - c.ele);
        console.log('  ' + (c.name + (c.doubt ? ' (doubtful)' : '')).padEnd(34), String(c.ele).padStart(5), '|', v.bare.toFixed(1).padStart(6), '|', v.surface.toFixed(1).padStart(6), '|', v.calibrated.toFixed(1).padStart(6), '|', Number.isFinite(v.model) ? v.model.toFixed(1).padStart(6) : '     -');
      }
      const stat = (a) => (a.reduce((s2, e) => s2 + e, 0) / a.length).toFixed(1) + ' mean, ' + Math.sqrt(a.reduce((s2, e) => s2 + e * e, 0) / a.length).toFixed(1) + ' rms';
      quality.peakRms = Math.sqrt(err.model.reduce((s2, e) => s2 + e * e, 0) / (err.model.length || 1));
      console.log('  error: bare', stat(err.bare), '| surface', stat(err.surface), '| calibrated', stat(err.calibrated), '| model', stat(err.model));
    }
    const probe = (x, z) => { const i = Math.round((x - GX0) / STEP), j = Math.round((z - GZ0) / STEP); return h[j * nx + i].toFixed(1); };
    // The river: the model draws the city LAND_Y above the water (src/config.js). The laser measures both.
    if (river !== null) {
      const drawn = +(/LAND_Y = ([\d.]+)/.exec(fs.readFileSync('src/config.js', 'utf8')) || [])[1];
      console.log('city floor', floor.toFixed(2), 'm asl, river', river.toFixed(2), 'm: the city stands', (floor - river).toFixed(2), 'm above the water | drawn', drawn, Math.abs(drawn - (floor - river)) > 0.3 ? '<-- set LAND_Y in src/config.js' : '(agrees)');
    }
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
    osmExtracts, // every extract merged, with its Overpass timestamp (null: fetched from the OSM API, no timestamp)
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
  hakhe,
  moorings,
  nguyenhoang: nhBox ? { c: [q(nhBox.c[0]), q(nhBox.c[1])], w: q(nhBox.w), d: q(nhBox.d), a: Math.round(nhBox.a * 1000) } : null,
  quocHocGate,
  bridges: bridgeOutlines,
  river: flat(riverLine),
  islands: islands.map((i) => [q(i.c[0]), q(i.c[1]), Math.round(i.area)]),
  places,
  waterLabels: water_labels,
};
const previous = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT)) : null;
fs.mkdirSync('public/data', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));
console.log('wrote', OUT, (fs.statSync(OUT).size / 1e6).toFixed(2), 'MB', '| extent m', Math.round(MAXX - MINX), 'x', Math.round(MAXZ - MINZ));
console.log('truong tien obb', ttBox.w.toFixed(1), 'x', ttBox.d.toFixed(1), 'centre', ttBox.c.map((v) => v.toFixed(1)), 'centreline', tt.map((p) => p.map((v) => v.toFixed(1))));

// ---- checks: the terrain must not get worse without anyone noticing (see scripts/check-data.mjs) ----
{
  const { checkData, diffData } = await import('./check-data.mjs');
  const { fails, notes } = checkData(JSON.parse(JSON.stringify(out)));
  // the calibration against the laser and the named summits, against the figures of November 2026 (1.31 and 1.2 m)
  const limit = { lidarRms: 1.5, peakRms: 1.5 };
  for (const [k, v] of Object.entries(limit)) {
    const got = quality[k];
    if (got == null) notes.push(`skip ${k}: not measured (raw data missing)`);
    else (got <= v ? notes : fails).push(`${got <= v ? 'ok  ' : 'FAIL'} terrain ${k === 'lidarRms' ? 'error against the laser ground points' : 'error at the named summits'}: ${got.toFixed(2)} m rms (limit ${v})`);
  }
  console.log('checks:');
  for (const l of [...notes, ...fails]) console.log('  ' + l);
  if (previous) { console.log('changes against the previous ' + OUT + ':'); for (const l of diffData(previous, out)) console.log('  ' + l); }
  if (fails.length) { console.error(`build-data: ${fails.length} check(s) failed; ${OUT} was written so it can be inspected, but do not ship it`); process.exit(1); }
}
