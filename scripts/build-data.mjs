// Turns the raw Overpass extract (data/raw/hue-osm.json) into the compact scene
// bundle the app ships with (public/data/hue.json).
//
// Everything positional comes from OpenStreetMap. Two things are generated and
// flagged as illustration: infill houses along streets where OSM has no
// footprints yet, and trees.
import fs from 'node:fs';
import pc from 'polygon-clipping';
import zlib from 'node:zlib';
import { LANDINGS as CONHEN_LANDINGS } from '../src/landmarks/conhen-landings.js';

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
// Hộ Thành Hào along the citadel's west face, from Tây Thành Đài (the west corner) past cửa Chánh Tây to Tây Thành
// Thủy Quan (where the Ngự Hà enters), is not mapped as water in OSM: the moat on the other faces is, this stretch
// stops at the wall. It is open water today: the province's 2026 embankment project for it gives "lòng hồ Hộ thành
// hào có diện tích 56.319m2" behind a 1,257 m outer embankment, with houses along the outer bank (VNA, 24 July 2026),
// and the stretch beside it was dredged in March 2025 (Công Lý; Tiền Phong). Its outer bank is not mapped either, so
// it is drawn parallel to the wall's face out to the landing of the bridge that crosses it, and cut back to the
// wall's outer line (bastions included). Its ends run into the mapped moat at the corner and the Ngự Hà's water at the inlet.
{
  const MOAT_AREA = 56319;
  const A = [-3290, -1040], B = [-2480, -60]; // west corner, Ngự Hà inlet (scene metres, rough)
  const L = Math.hypot(B[0] - A[0], B[1] - A[1]), u = [(B[0] - A[0]) / L, (B[1] - A[1]) / L], n = [u[1], -u[0]];
  const loc = (p) => [(p[0] - A[0]) * u[0] + (p[1] - A[1]) * u[1], (p[0] - A[0]) * n[0] + (p[1] - A[1]) * n[1]];
  const glob = ([s, t]) => [A[0] + u[0] * s + n[0] * t, A[1] + u[1] * s + n[1] * t];
  const band = evenOdd(stitch(get('relation', 8541343).members.filter((m) => m.type === 'way').map((m) => m.geometry)));
  // the wall band's inner face: a line through its innermost points over this face
  let pts = band.flatMap((poly) => poly.flat()).map(loc).filter(([s, t]) => s > 100 && s < L - 20 && Math.abs(t) < 150);
  let fa = 0, fb = 0;
  for (let it = 0; it < 6; it++) {
    const ms = pts.reduce((q, p) => q + p[0], 0) / pts.length, mt = pts.reduce((q, p) => q + p[1], 0) / pts.length;
    fb = pts.reduce((q, p) => q + (p[0] - ms) * (p[1] - mt), 0) / pts.reduce((q, p) => q + (p[0] - ms) ** 2, 0);
    fa = mt - fb * ms;
    pts = pts.filter(([s, t]) => t >= fa + fb * s - 3);
  }
  const face = (s) => fa + fb * s;
  // from D outside the inner face to inside the (21 m) band, minus the band; only water reaching the outer
  // bank is kept, not the bastions' earth-filled insides behind that inner line
  const strip = (D, s0, s1) => {
    const q = [[s0, face(s0) - D], [s1, face(s1) - D], [s1, face(s1) - 8], [s0, face(s0) - 8]].map(glob);
    return pc.difference([[[...q, q[0]]]], ...band.map((p) => [p])).filter((poly) => poly[0].some((p) => { const [ps, pt] = loc(p); return Math.abs(pt - face(ps) + D) < 0.5; }));
  };
  const polyArea = (mp) => mp.reduce((s, p) => s + Math.abs(ringArea(p[0])) - p.slice(1).reduce((h, r) => h + Math.abs(ringArea(r)), 0), 0);
  // The outer bank is where Cầu Chánh Tây (way 39416352), the bridge over this moat before the gate, lands: the
  // bridge is mapped, its bank is not. That is also the width of the mapped moat south of the inlet (about 70 m from
  // the wall). The water it encloses comes to about 61,000 m², close to the embankment project's 56,319 m²; both
  // are logged.
  const bridgeOut = Math.min(...get('way', 39416352).geometry.map(proj).map(loc).map(([s, t]) => t - face(s)));
  const D = -bridgeOut;
  const S0 = -10, S1 = L + 30;
  const moat = strip(D, S0, S1);
  // where it meets the mapped water at each end, a hull of its end and that water's nearby outline closes the gap
  for (const s0 of [S0, S1]) {
    const near = waterPolys.flatMap((poly) => poly[0]).filter((p) => { const [ps, pt] = loc(p); return Math.abs(ps - s0) < 30 && pt > face(ps) - D - 5 && pt < face(ps) - 21; });
    if (near.length < 2) continue;
    const h = hull(near.concat([glob([s0, face(s0) - D]), glob([s0, face(s0) - 21])]));
    for (const poly of pc.difference([[[...h, h[0]]]], ...band.map((p) => [p]))) moat.push(poly);
  }
  for (const poly of moat) waterPolys.push(poly);
  console.log('west moat (unmapped in OSM): outer bank', (D - 21).toFixed(1), 'm off the wall at Cầu Chánh Tây\'s landing |', Math.round(polyArea(strip(D, 0, L))), 'm² over the face (embankment project: ' + MOAT_AREA + ') |', moat.length, 'piece(s)');
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
// Cồn Dã Viên is a park round the 1953 water plant, with no houses (satellite and Street View); its one service road
// would otherwise be lined with generated ones. The island is the land ring holding the water tower (way 1189213110).
{
  const wt = get('way', 1189213110);
  const c = wt && areaCentroid(openRing(wt.geometry.map(proj)));
  const dv = c && land.find((p) => Math.abs(ringArea(p[0])) < 5e5 && pip(c, p[0]));
  if (dv) fillPoly(dv, NOBUILD); else console.warn('Cồn Dã Viên: island ring not found, generated houses may stand on it');
}

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
// Unmarked road types (issue #67): a carriageway of 1, 2 or 3 lanes drawn plain, with no lane dashes and no lamps of
// its own, for the slip roads of junctions and roundabouts. Laid at its class width, a slip road (the turn from Hà Nội
// into Lê Lợi at the south end of cầu Phú Xuân, OSM primary_link, one lane) was a 15 m slab with a dashed centre line
// that merged with the roads either side into one shapeless apron. Every *_link way takes the type of its lane count
// (the lanes tag, else 1 one-way and 2 two-way); data/road-types.json assigns a type to any other way by its OSM id
// (a slip road mapped as an ordinary street), or `marked` to keep a link at its class width with its dashes.
const LANE_W = 3.5, UNMARKED_PAD = 0.5; // m per lane; a little shoulder
const ROAD_TYPES = JSON.parse(fs.readFileSync('data/road-types.json', 'utf8')).ways;
const UNMARKED = { 'unmarked-1': 1, 'unmarked-2': 2, 'unmarked-3': 3 };
for (const [id, k] of Object.entries(ROAD_TYPES)) if (!(k in UNMARKED) && k !== 'marked') throw new Error(`data/road-types.json: way ${id} has unknown type ${k}`);
// lanes of the unmarked type way e is laid as, or 0 (an ordinary, marked road of its class)
function unmarkedLanes(e) {
  const t = e.tags, k = ROAD_TYPES[e.id];
  if (k) return UNMARKED[k] || 0;
  if (!/_link$/.test(t.highway)) return 0;
  const n = parseInt(t.lanes, 10);
  return n > 0 ? Math.min(3, n) : t.oneway === 'yes' ? 1 : 2;
}
const TT_WAY = 174759688; // the truss spans; modelled by hand
const roads = [];
let nDryBridges = 0, nSidewalkBridges = 0;
function overWater(pts) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.5));
    for (let k = 0; k <= n; k++) if (at(a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n) & WATER) return true;
  }
  return false;
}
// Monuments whose walls a street is drawn along, on the wall foot. At Hổ Quyền (relation 19381147) the unnamed
// residential way 870617584 runs round the north-east of the arena on the same line as the footway mapped round its
// foot (OSM way 1075016119, 1-2 m off the outer wall), so a carriageway of the residential width centred there runs
// 2.5 m into a wall the sources put at 44 m across (140-145 m round). The way is moved out, point by point, until its
// carriageway clears the outline by CLEAR_PAD; its course round the arena is kept.
const CLEAR_OF = [19381147];
const CLEAR_PAD = 0.3;
const clearRings = CLEAR_OF.map((id) => { const e = get('relation', id); const rs = e ? elementRings(e) : []; return rs.sort((a, b) => Math.abs(ringArea(b)) - Math.abs(ringArea(a)))[0]; }) // the outer ring.filter(Boolean);
function clearMonuments(pts, c) {
  if (c > 3 || !clearRings.length) return pts;
  const need = ROAD_W[c] / 2 + CLEAR_PAD;
  let out = pts;
  for (const ring of clearRings) {
    const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length, cz = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    const far = Math.max(...ring.map((p) => Math.hypot(p[0] - cx, p[1] - cz))) + need + 2;
    if (!out.some((p) => Math.hypot(p[0] - cx, p[1] - cz) < far * 2)) continue;
    const dense = []; // every 2 m near the monument, so a long segment cannot cut the corner between moved points
    for (let i = 0; i < out.length; i++) {
      const a = out[i], b = out[i + 1];
      dense.push(a);
      if (!b || (Math.hypot(a[0] - cx, a[1] - cz) > far * 2 && Math.hypot(b[0] - cx, b[1] - cz) > far * 2)) continue;
      const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2);
      for (let k = 1; k < n; k++) dense.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
    }
    let moved = false;
    const next = dense.map((p) => {
      let best = Infinity, q = null;
      for (let i = 0; i + 1 < ring.length; i++) {
        const a = ring[i], b = ring[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz;
        const t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2)) : 0;
        const x = a[0] + t * dx, z = a[1] + t * dz, d = Math.hypot(p[0] - x, p[1] - z);
        if (d < best) { best = d; q = [x, z]; }
      }
      const inside = pip(p, ring);
      if (!inside && best >= need) return p;
      // outward: away from the nearest point of the outline (from the centre when on or inside it)
      let ux = p[0] - q[0], uz = p[1] - q[1], L = Math.hypot(ux, uz);
      if (inside || L < 1e-3) { ux = q[0] - cx; uz = q[1] - cz; L = Math.hypot(ux, uz) || 1; }
      moved = true;
      return [q[0] + (ux / L) * need, q[1] + (uz / L) * need];
    });
    if (moved) out = next;
  }
  return out;
}
let nCleared = 0;
for (const e of els) {
  const t = e.tags || {};
  if (e.type !== 'way' || !(t.highway in ROAD_CLASS) || t.area === 'yes' || !e.geometry) continue;
  if (e.id === TT_WAY) continue;
  const c = ROAD_CLASS[t.highway];
  const tagged = t.bridge && t.bridge !== 'no' ? 1 : 0;
  for (const line of clipLine(e.geometry.map(proj))) {
    const pts = clearMonuments(line, c);
    if (pts !== line) nCleared++;
    // the bridge's own carriageways are not laid (nguyenhoang.js models the deck), but their ground stays road in
    // the mask, so no tree, garden or infill house is planted under the deck and its ramps
    if (tagged && inNH(pts[Math.floor(pts.length / 2)])) { stampLine(pts, ROAD_W[c] / 2 + 1.2, ROAD); continue; }
    // A sidewalk mapped on a bridge (footway=sidewalk) is the walkway of the road bridge beside it, not a structure of
    // its own: laid as a bridge it became a second, flat deck with its own parapets and piers alongside the carriageway's
    // (under cầu Trường Tiền's trusses, beside cầu Dã Viên's and cầu Phú Xuân's decks). The carriageway's deck (or the
    // hand model) carries it; its ground stays road in the mask, as under the deck.
    if (tagged && t.footway === 'sidewalk') { stampLine(pts, ROAD_W[c] / 2 + 1.2, ROAD); nSidewalkBridges++; continue; }
    // A way tagged as a bridge that crosses no drawn water is laid as ordinary road: several canals have been filled
    // in, and a raised deck with piers there stands on dry land.
    const bridge = tagged && overWater(pts) ? 1 : 0;
    if (tagged && !bridge) nDryBridges++;
    const lanes = unmarkedLanes(e);
    roads.push({ c, bridge, name: t.name || '', ow: t.oneway === 'yes' && t.junction !== 'roundabout', w: lanes ? lanes * LANE_W + UNMARKED_PAD : ROAD_W[c], pts, id: e.id, ...(lanes ? { lanes } : {}) });
  }
}
console.log('bridge ways over dry land laid as road:', nDryBridges, '; bridge sidewalks left to their carriageway:', nSidewalkBridges, '| streets moved off monument walls:', nCleared);
// Divided roads (issue #15). Each carriageway of a dual road is its own one-way OSM way, its centreline 6-14 m from its
// twin's. Drawn at the class width (15 m for a primary) the two overlapped into one broad slab with the median trees
// standing in the middle of it. A one-way way with a twin of the same name running the other way alongside is laid at
// a one-way width instead: two lanes, narrowed where the twins run so close that no median would be left. The median
// between them is found again in section 5b, with these widths.
const marketArea = get('way', 161714451).geometry.map(proj);
// Exception: Trần Hưng Đạo in front of chợ Đông Ba is kept as it was, at its class width with its median trees.
const MEDIAN_KEEP = 90; // m from the market's outline
const nearMarket = (p) => marketArea.some((m) => Math.hypot(m[0] - p[0], m[1] - p[1]) < MEDIAN_KEEP);
const ONEWAY_W = [8, 7, 6]; // m, by class 0-2: two lanes and a little shoulder
const MEDIAN_MIN = 1.2, MEDIAN_MAX = 18, MEDIAN_STEP = 3; // m
// Twin bridge decks are narrowed with their streets: left at the class width (15-18 m slabs for a pair of 7 m
// one-way streets) the two decks merged into one broad slab that overhung the approach road at both ends.
const divided = roads.filter((r) => r.ow && r.c <= 2 && r.name && !r.lanes); // a slip road keeps its lane width
const twinAt = (() => {
  const G = 30, grid = new Map();
  divided.forEach((r, ri) => {
    for (let i = 0; i + 1 < r.pts.length; i++) {
      const a = r.pts[i], b = r.pts[i + 1], m = MEDIAN_MAX + 16;
      for (let x = Math.floor((Math.min(a[0], b[0]) - m) / G); x <= Math.floor((Math.max(a[0], b[0]) + m) / G); x++)
        for (let z = Math.floor((Math.min(a[1], b[1]) - m) / G); z <= Math.floor((Math.max(a[1], b[1]) + m) / G); z++) {
          const k = x + ',' + z;
          if (!grid.has(k)) grid.set(k, []);
          grid.get(k).push([ri, a, b]);
        }
    }
  });
  // the twin of divided[ai] at (px, pz), heading (tx, tz): the nearest point on another one-way way of the same name,
  // running the other way, straight across. { ri, dist, nx, nz } (n: the unit vector towards it) or null.
  return (ai, px, pz, tx, tz) => {
    let best = null;
    for (const [ri, c, d] of grid.get(Math.floor(px / G) + ',' + Math.floor(pz / G)) || []) {
      if (ri === ai || divided[ri].name !== divided[ai].name) continue;
      const dx = d[0] - c[0], dz = d[1] - c[1], L2 = dx * dx + dz * dz;
      if (!L2 || (dx * tx + dz * tz) / Math.sqrt(L2) > -0.9) continue;
      const t = Math.max(0, Math.min(1, ((px - c[0]) * dx + (pz - c[1]) * dz) / L2));
      const qx = c[0] + t * dx - px, qz = c[1] + t * dz - pz, dist = Math.hypot(qx, qz);
      if (!dist || dist > MEDIAN_MAX + 16 || Math.abs(qx * tx + qz * tz) / dist > 0.35) continue;
      if (!best || dist < best.dist) best = { ri, dist, nx: qx / dist, nz: qz / dist };
    }
    return best;
  };
})();
// walk a way in MEDIAN_STEP steps: fn(px, pz, tx, tz) at each, and fn(null) at a break in the line
function walkLine(pts, fn) {
  let carry = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 0.01) continue;
    const tx = (b[0] - a[0]) / len, tz = (b[1] - a[1]) / len;
    let s = carry;
    for (; s < len; s += MEDIAN_STEP) fn(a[0] + tx * s, a[1] + tz * s, tx, tz);
    carry = s - len;
  }
}
let nDivided = 0;
divided.forEach((r, ri) => {
  const D = [];
  walkLine(r.pts, (px, pz, tx, tz) => { const t = twinAt(ri, px, pz, tx, tz); if (t) D.push(t.dist); });
  if (D.length < 3 || r.pts.some(nearMarket)) return;
  D.sort((a, b) => a - b);
  r.w = Math.max(4.5, Math.min(ONEWAY_W[r.c], D[Math.floor(D.length * 0.3)] - MEDIAN_MIN));
  nDivided++;
});
console.log('divided roads:', nDivided, 'one-way carriageways laid at one-way width');
// Width steps. Where a carriageway carries straight on into one of another width (the twins in front of chợ Đông Ba,
// kept at the class width, meeting their narrowed continuations; a one-way way meeting a two-way street) the wide end
// stood square out past the narrow one's kerb, a pale pavement step across the road. The wider way now narrows over
// its last TAPER metres to the other's width at the joint (r.ws: one width per point; r.w stays the widest, for the
// clearances that only need an outer bound).
const TAPER = 30, TAPER_SIN = Math.sin((30 * Math.PI) / 180);
let nTaper = 0;
{
  const key = (p) => p[0].toFixed(2) + ',' + p[1].toFixed(2), ends = new Map();
  roads.forEach((r) => {
    if (r.bridge || r.c > 4 || r.pts.length < 2) return;
    for (const k of [0, 1]) {
      const n = r.pts.length, P = r.pts[k ? n - 1 : 0], Q = r.pts[k ? n - 2 : 1], l = Math.hypot(P[0] - Q[0], P[1] - Q[1]);
      if (!l) continue;
      const K = key(P);
      if (!ends.has(K)) ends.set(K, []);
      ends.get(K).push({ r, k, ox: (P[0] - Q[0]) / l, oz: (P[1] - Q[1]) / l }); // o: outward along the way
    }
  });
  const want = new Map(); // road -> [width wanted at its start, at its end]
  for (const E of ends.values()) {
    for (const a of E) {
      // the way a carries straight on into: the best-aligned other end here, outward directions opposite
      let best = null, bd = -1;
      for (const b of E) {
        if (b.r === a.r) continue;
        const dot = -(a.ox * b.ox + a.oz * b.oz);
        if (dot > bd) { bd = dot; best = b; }
      }
      if (!best || bd < Math.sqrt(1 - TAPER_SIN * TAPER_SIN) || a.r.w - best.r.w < 0.4) continue;
      if (best.r.lanes) continue; // a road does not narrow into a slip road that leaves it
      if (a.r.name && best.r.name && a.r.name !== best.r.name) continue;
      if (!want.has(a.r)) want.set(a.r, [null, null]);
      want.get(a.r)[a.k] = best.r.w;
    }
  }
  for (const [r, [w0, w1]] of want) {
    const len = pathLength(r.pts), T = Math.min(TAPER, len * (w0 != null && w1 != null ? 0.45 : 0.6));
    // points at T from each tapering end, so the narrowing starts there and not at the next mapped node
    let pts = r.pts;
    if (w0 != null) pts = insertAt(pts, T);
    if (w1 != null) pts = insertAt(pts, pathLength(pts) - T);
    const L = pathLength(pts);
    let s = 0;
    r.ws = pts.map((p, i) => {
      if (i) s += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
      let w = r.w;
      if (w0 != null && s < T) w = Math.min(w, w0 + ((r.w - w0) * s) / T);
      if (w1 != null && L - s < T) w = Math.min(w, w1 + ((r.w - w1) * (L - s)) / T);
      return w;
    });
    r.pts = pts;
    nTaper++;
  }
}
console.log('width steps tapered:', nTaper);
// the carriageway width of r at p (a point on or beside its line): r.ws interpolated along the nearest segment
function widthOn(r, p) {
  if (!r.ws) return r.w;
  let best = Infinity, w = r.w;
  for (let i = 0; i + 1 < r.pts.length; i++) {
    const a = r.pts[i], b = r.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz;
    const t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2)) : 0;
    const d = Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz);
    if (d < best) { best = d; w = r.ws[i] + (r.ws[i + 1] - r.ws[i]) * t; }
  }
  return w;
}
function pathLength(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
// pts with a point added at distance s along it (unless a node is already within 0.5 m)
function insertAt(pts, s) {
  let acc = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (acc + l >= s) {
      const u = s - acc;
      if (u < 0.5 || l - u < 0.5) return pts;
      return [...pts.slice(0, i + 1), [a[0] + ((b[0] - a[0]) * u) / l, a[1] + ((b[1] - a[1]) * u) / l], ...pts.slice(i + 1)];
    }
    acc += l;
  }
  return pts;
}
for (const r of roads) stampLine(r.pts, r.c < 5 ? r.w / 2 + 1.2 : 1.2, ROAD);
// Is (x, z) on a carriageway (any road up to service class, bridges included), widened by pad? Exact against the road
// lines, not the 2 m mask: the avenue trees stand just off their own kerb, closer than a mask cell can tell apart.
function carriagewayTest(maxC) {
  const G = 20, grid = new Map();
  for (const r of roads) {
    if (r.c > maxC) continue;
    const hw = r.w / 2;
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
}
const onCarriageway = carriagewayTest(4);
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
// Roof colour as seen from orbit (issue #5): OSM tags almost no roof colours, so each building's roof family is read
// from a cloud-free Sentinel-2 scene (scripts/fetch-roofs.py). 1 = red tile, 2 = blue sheet, 3 = pale (whitewashed
// concrete, light sheet), 4 = grey (weathered concrete, dark tile); 0 = not seen (trees over it, off the scene).
const ROOF = (() => {
  const f = 'data/raw/dem/roofrgb.json';
  if (!fs.existsSync(f)) { console.warn('no roof colours (run scripts/fetch-roofs.py)'); return null; }
  const t = JSON.parse(fs.readFileSync(f, 'utf8'));
  return { ...t, px: zlib.inflateSync(Buffer.from(t.rgb, 'base64')) };
})();
const roofPx = (x, z, acc) => {
  const i = Math.floor((ORIGIN.lon + x / KX - ROOF.west) / ROOF.dlon), j = Math.floor((ROOF.north - (ORIGIN.lat - z / KZ)) / ROOF.dlat);
  if (i < 0 || j < 0 || i >= ROOF.nx || j >= ROOF.ny) return;
  const k = (j * ROOF.nx + i) * 3;
  acc[0] += ROOF.px[k]; acc[1] += ROOF.px[k + 1]; acc[2] += ROOF.px[k + 2]; acc[3]++;
};
const roofClass = ([r, g, b, n]) => {
  if (!n) return 0;
  r /= n; g /= n; b /= n;
  if (r > g * 1.12 && r > b * 1.3) return 1;
  if (b > r * 1.03 && b >= g) return 2;
  if (g > r * 1.02 && g > b * 1.08) return 0; // canopy over the roof
  return (r + g + b) / 3 > 95 ? 3 : 4;
};
// the mean over the pixels whose 8 m sample lattice falls inside the footprint, or the pixel under its centre
function roofOf(ring, c) {
  if (!ROOF) return 0;
  const acc = [0, 0, 0, 0];
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const p of ring) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
  for (let x = x0 + 4; x < x1; x += 8) for (let z = z0 + 4; z < z1; z += 8) if (pip([x, z], ring)) roofPx(x, z, acc);
  if (!acc[3]) roofPx(c[0], c[1], acc);
  return roofClass(acc);
}
const roofAt = (x, z) => { if (!ROOF) return 0; const acc = [0, 0, 0, 0]; roofPx(x, z, acc); return roofClass(acc); };
const roofCount = [0, 0, 0, 0, 0];
// The Lê Lợi district on the south bank is whitewashed almost throughout (issue #5: everything but the two
// French-period schools, Quốc Học and Hai Bà Trưng, which keep their dark red).
const whiteWard = (c) => nearPts(FRENCH, c, 290);
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
const quocHoc = ringOf(695775622), haiBaTrung = ringOf(695770482); // the two French-period schools on Lê Lợi
const thienMu = ringOf(205794912);
const towerC = (() => { const r = ringOf(205795043); return r ? centroid(r) : null; })();
const thienMuSmall = [];
const SPECIAL = { 205795043: 'phuocduyen', 172657562: 'ngomon', 218427614: 'kydai', 531031566: 'thaihoa', 531031520: 'phuvanlau', 239568224: 'nghenhluong', 172641246: 'markethall',
  // named places that get their own model instead of a generic extrusion (src/landmarks/civic.js)
  175063593: 'gahue', 118792054: 'phucam', 1172894102: 'dcct', 1172897446: 'andinh', 771244228: 'dieude', 771244225: 'dieudeGate',
  172657564: 'hienlam', 749331141: 'vincom', 172802373: 'tuphuong',
  // the terminal halls of the two intercity bus stations (src/landmarks/places/benxebac.js, benxenam.js; issue #71)
  1435288831: 'benxebac', 260244336: 'benxenam',
  // AEON MALL Huế (src/landmarks/places/aeon.js; issue #71), past the old east edge at 107.613 E
  1575540652: 'aeon' };
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
// Bến xe phía Bắc (issue #71) is mapped only as its hall (way 1435288831) and a node, with no outline for its yard: keep
// generated houses and trees off the ground its own service roads (ways 656647882, 656647880) enclose and off its
// forecourt out to Lý Thái Tổ, the way the bus loop leaves from. That is about 0.6 ha of the station's 1.95 ha lot.
{
  const hall = get('way', 1435288831), loop = get('way', 656647882), exit = get('way', 656647880);
  if (hall && loop && exit) {
    const pts = [...hall.geometry, ...loop.geometry, ...exit.geometry].map(proj);
    const street = els.filter((e) => e.type === 'way' && e.tags && e.tags.name === 'Lý Thái Tổ' && e.nodes && e.nodes.includes(loop.nodes[0]) && e.geometry).map((e) => e.geometry.map(proj));
    const foot = (p, line) => { let b = null, bd = Infinity; for (let i = 1; i < line.length; i++) { const a = line[i - 1], c = line[i], dx = c[0] - a[0], dz = c[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz))), q = [a[0] + dx * t, a[1] + dz * t], d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; b = q; } } return b; };
    for (const line of street) for (const p of hall.geometry.map(proj)) pts.push(foot(p, line));
    fillPoly([hull(pts)], TREE | NOBUILD);
  }
}
for (const [id, n, x, z, r] of SITE_DEFS) sites[id] = { n, c: [q(x), q(z)], r, items: [] };
const siteOf = (c) => { for (const [id, , x, z, r] of SITE_DEFS) if (Math.hypot(c[0] - x, c[1] - z) < r) return sites[id]; return null; };

// ---------- paved yards and squares (issue #22) ----------
// The parks along the Hương are not lawn throughout: grey paved yards open before Nghênh Lương Đình, tiểu đình
// Thương Bạc and the other riverside pavilions. Planting every park as close woodland buried them. A paved yard is
// laid as its own ground ('paved' in green, drawn over the park) and nothing is grown or built on it. Two sources:
//  1. what OSM maps as paved ground: highway areas (area=yes: pedestrian squares, footway courts), area:highway,
//     place=square, surface car parks (amenity=parking, not multi-storey, underground or on a roof) and bus station yards. These were
//     dropped altogether before (the road pass skips area=yes). A hand-modelled site lays its own ground.
//  2. what OSM leaves inside a park: the Sentinel-2 scene (the roof-colour grid) shows bare paving as bright, grey to
//     buff 10 m pixels with no green in them, where lawn and canopy are green. Such cells inside a park or lawn
//     (not woods, farms, graves, pitches or the hand-modelled sites) are gathered into yards; a compact yard is laid
//     as a rectangle squared to the nearest street, as the city lays its squares, a ragged one as its cells.
const PAVED_HW = new Set(['pedestrian', 'footway', 'service', 'living_street', 'residential', 'unclassified', 'track', 'cycleway', 'path', 'platform']);
const pavedPx = (x, z) => {
  if (!ROOF) return false;
  const acc = [0, 0, 0, 0]; roofPx(x, z, acc);
  if (!acc[3]) return false;
  const [r, g, b] = acc, br = (r + g + b) / 3, exg = 2 * g - r - b;
  return br >= 80 && exg <= 12 && r - b <= 40; // bright, no green; warmer than this is bare earth or sand
};
const paved = [];
{
  let nOsm = 0;
  for (const e of els) {
    const t = e.tags || {};
    if (e.type === 'node' || t.building || t['building:part']) continue;
    // a bus station's yard (amenity=bus_station, from the paved extract) is paved ground as a car park is
    const lot = (t.amenity === 'parking' && !/multi-storey|underground|rooftop/.test(t.parking || '')) || t.amenity === 'bus_station';
    if (!((t.highway in ROAD_CLASS || PAVED_HW.has(t.highway)) && t.area === 'yes') && !t['area:highway'] && t.place !== 'square' && !lot) continue;
    let polys = evenOdd(elementRings(e));
    if (!polys.length || siteOf(centroid(openRing(polys[0][0])))) continue;
    try { polys = pc.intersection(polys, [slabRect]); } catch { continue; }
    for (const poly of polys) if (poly[0].some((p) => inBox(p))) { paved.push(poly); nOsm++; }
  }
  // the street directions near a point: the yard is squared to the nearest carriageway
  const streetAngle = (c) => {
    let best = Infinity, ang = 0;
    for (const r of roads) {
      if (r.c > 4) continue;
      for (let i = 0; i + 1 < r.pts.length; i++) {
        const a = r.pts[i], b = r.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz;
        if (!l2) continue;
        const s = Math.max(0, Math.min(1, ((c[0] - a[0]) * dx + (c[1] - a[1]) * dz) / l2));
        const d = Math.hypot(a[0] + dx * s - c[0], a[1] + dz * s - c[1]);
        if (d < best) { best = d; ang = Math.atan2(dz, dx); }
      }
    }
    return best < 150 ? ang : null;
  };
  const G = 10, cells = new Map(); // key "i,j" on a 10 m lattice -> the park it lies in
  for (const g of green) {
    if (g.k !== 'park' && g.k !== 'grass') continue;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const p of g.p[0]) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
    for (let i = Math.floor(x0 / G); i * G < x1; i++) for (let j = Math.floor(z0 / G); j * G < z1; j++) {
      const x = (i + 0.5) * G, z = (j + 0.5) * G;
      if (!pipPoly([x, z], g.p) || at(x, z) & WATER || inImperial([x, z]) || siteOf([x, z]) || onCarriageway(x, z, 1)) continue;
      if (pavedPx(x, z)) cells.set(i + ',' + j, g);
    }
  }
  // A path mapped as a closed loop in a park (round a pavilion, a fountain or a bed) is the edge of the paving the
  // satellite sees there. Its 10 m pixels straddle the ring, so the cells read as a block squared to the street that
  // sits askew of the round path (issue #69: the six-sided pavilion in the park on Trần Hưng Đạo, west of cầu Trường
  // Tiền). Where cells read paving inside such a loop, the yard is laid as the loop, and the cells it accounts for
  // (inside it or within a pixel of its ring) are spent.
  const ringDist = (p, ring) => {
    let d = Infinity;
    for (let i = 0; i + 1 < ring.length; i++) {
      const a = ring[i], b = ring[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz;
      const s = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2)) : 0;
      d = Math.min(d, Math.hypot(p[0] - a[0] - s * dx, p[1] - a[1] - s * dz));
    }
    return d;
  };
  let nLoop = 0;
  for (const r of roads) {
    if (r.c < 5 || r.pts.length < 5) continue;
    const ring = r.pts, a0 = ring[0], a1 = ring[ring.length - 1];
    if (Math.hypot(a0[0] - a1[0], a0[1] - a1[1]) > 0.5) continue;
    const area = Math.abs(ringArea(ring));
    if (area < 80 || area > 6000) continue;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const p of ring) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
    const near = [], inside = [];
    for (let i = Math.floor((x0 - G) / G); i * G < x1 + G; i++) for (let j = Math.floor((z0 - G) / G); j * G < z1 + G; j++) {
      const k = i + ',' + j;
      if (!cells.has(k)) continue;
      const c = [(i + 0.5) * G, (j + 0.5) * G];
      if (pip(c, ring)) inside.push(k); else if (ringDist(c, ring) < G * 0.75) near.push(k);
    }
    if (!inside.length || inside.length < 0.25 * area / (G * G)) continue;
    let shape;
    try { shape = pc.intersection([[ring]], cells.get(inside[0]).p); } catch { continue; }
    for (const poly of shape) paved.push(poly);
    for (const k of [...inside, ...near]) cells.delete(k);
    nLoop++;
  }
  // a cell whose centre lies on a mapped path or pavement reads bright for the path alone: it may belong to a yard, but
  // a yard must show at least three cells of paving off the paths (the top of the loop of paths east of that pavilion
  // read as a yard from the path and the pavement of Trần Hưng Đạo crossing its pixels)
  const onPath = carriagewayTest(5);
  // gather the cells into yards (4-neighbours); a yard of fewer than three cells is a path crossing or a bench
  const seen = new Set();
  let nSat = 0, nRect = 0, nPathOnly = 0;
  for (const k0 of cells.keys()) {
    if (seen.has(k0)) continue;
    const comp = [], stack = [k0]; seen.add(k0);
    while (stack.length) {
      const k = stack.pop(); comp.push(k.split(',').map(Number));
      const [i, j] = comp[comp.length - 1];
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = i + di + ',' + (j + dj); if (cells.has(n) && !seen.has(n)) { seen.add(n); stack.push(n); } }
    }
    if (comp.length < 3) continue;
    if (comp.filter(([i, j]) => !onPath((i + 0.5) * G, (j + 0.5) * G, 3)).length < 3) { nPathOnly++; continue; }
    const g = cells.get(k0);
    const c = [comp.reduce((s, [i]) => s + (i + 0.5) * G, 0) / comp.length, comp.reduce((s, [, j]) => s + (j + 0.5) * G, 0) / comp.length];
    const a = streetAngle(c);
    let shape = null;
    if (a != null) {
      // the cells' extent across and along the street, from cell centres (a 10 m pixel is mixed at a yard's edge)
      const ux = Math.cos(a), uz = Math.sin(a);
      let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
      for (const [i, j] of comp) {
        const dx = (i + 0.5) * G - c[0], dz = (j + 0.5) * G - c[1], u = dx * ux + dz * uz, v = -dx * uz + dz * ux;
        u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
      }
      u0 -= G / 2; u1 += G / 2; v0 -= G / 2; v1 += G / 2;
      if (comp.length * G * G >= 0.5 * (u1 - u0) * (v1 - v0)) {
        const P = (u, v) => [c[0] + u * ux - v * uz, c[1] + u * uz + v * ux];
        shape = [[[P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1), P(u0, v0)]]];
        nRect++;
      }
    }
    if (!shape) { try { shape = pc.union(...comp.map(([i, j]) => rect(i * G, j * G, (i + 1) * G, (j + 1) * G))); } catch { continue; } }
    try { shape = pc.intersection(shape, g.p); } catch { continue; }
    for (const poly of shape) { paved.push(poly); nSat++; }
  }
  for (const poly of paved) { green.push({ k: 'paved', p: poly }); fillPoly(poly, BLD | NOBUILD); }
  console.log('paved yards:', nOsm, 'mapped in OSM |', nLoop, 'laid as the ring path round them |', nSat, 'read from the satellite scene in parks (', nRect, 'squared to the street ) from', cells.size, 'cells |', nPathOnly, 'dropped as paths alone');
}
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
  if ((quocHoc && pip(c, quocHoc)) || (haiBaTrung && pip(c, haiBaTrung))) { flags |= 2; if (!hTag && !lv) h = area > 180 ? 7.8 : 4.6; } // two tall colonial storeys under the roof
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
  // flags 16-64 (bits 4-6): the roof family seen from orbit; 128: a whitewashed ward; 256: floodlit at night (riverside lights, below)
  const rc = roofOf(ring, c); roofCount[rc]++; flags |= rc << 4;
  if (whiteWard(c) && !(flags & 2)) flags |= 128;
  const b = [flat(ring), q(h), kind, t.name || 0, flags];
  if (mh && !(flags & 8)) b[5] = q(h);
  if (src === 2) smeared.add(b); else if (src === 1) surveyed.add(b);
  buildings.push(b);
  fillPoly([ring], BLD);
  stampLine([...ring, ring[0]], 1.2, BLD); // its eaves: generated houses keep clear of them
}
console.log("roof families (unseen, red, blue, pale, grey):", roofCount.join(" "));
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
    const hw = r.w / 2 + 0.3;
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
// 5b. Medians (issue #15)
// =====================================================================
// A divided road is two one-way OSM ways of the same name running opposite ways side by side; the ground between
// their inner kerbs is the median. It is a planted strip with a pale kerb, not a row of street trees: nothing is
// planted on it (plant() and the avenue rows below test inMedian), and the client draws it as a green strip with low
// shrubs. A strip stops where a road (up to residential) crosses it, so it ends at each junction and U-turn gap.
// Exception: the road in front of chợ Đông Ba (Trần Hưng Đạo) keeps its median trees as they are.
const MEDIAN_RUN = 10; // m: the shortest strip kept
const MEDIAN_OVER = 3; // m: how far a strip runs on under the carriageway of the road crossing it
const medians = [];
{
  const crossing = carriagewayTest(3);
  divided.forEach((A, ai) => {
    let run = [];
    const flush = () => {
      let L = 0;
      for (let i = 1; i < run.length; i++) L += Math.hypot(run[i].p[0] - run[i - 1].p[0], run[i].p[1] - run[i - 1].p[1]);
      // The gap between the twins widens or narrows (fanning out from a bridge head, tapering into a junction). A strip
      // of one width left bare ground beside the kerb at one end and ran under the carriageways at the other, and cut
      // into constant-width pieces it stepped, a pale kerb tick at every step: each point keeps its own gap instead,
      // lightly smoothed (the twin sampling is noisy by a few centimetres), and the client draws the strip tapering.
      if (run.length >= 2 && L >= MEDIAN_RUN) {
        const ws = run.map((_, i) => {
          let s = 0, n = 0;
          for (let j = Math.max(0, i - 2); j <= Math.min(run.length - 1, i + 2); j++) { s += run[j].w; n++; }
          return s / n;
        });
        medians.push({ pts: run.map((s) => s.p), w: Math.max(...ws), ws });
      }
      run = [];
    };
    // A strip used to stop at the last sample clear of a crossing road, up to a walk step and the 1.5 m pad short of
    // its kerb, and the pale pavement under the twins showed there as a square nose between the green and the junction.
    // Now a strip that meets a crossing road takes in the sample on it and runs MEDIAN_OVER on under that carriageway,
    // which is drawn over it, so the green reaches the junction's kerb line whatever angle the road crosses at.
    let cross = null; // the last sample on a crossing road, where a strip leaving the junction starts
    const over = (a, b) => { const dx = b.p[0] - a.p[0], dz = b.p[1] - a.p[1], l = Math.hypot(dx, dz) || 1; return { p: [b.p[0] + (dx / l) * MEDIAN_OVER, b.p[1] + (dz / l) * MEDIAN_OVER], w: b.w }; };
    walkLine(A.pts, (px, pz, tx, tz) => {
      const t = twinAt(ai, px, pz, tx, tz);
      // each strip once: from the twin with the lower index
      const wa = t ? widthOn(A, [px, pz]) : 0, gap = t && t.ri > ai ? t.dist - wa / 2 - widthOn(divided[t.ri], [px + t.nx * t.dist, pz + t.nz * t.dist]) / 2 : 0;
      // no planted strip between twin bridge decks: the gap there is open water (or the deck's own slab)
      if (gap < MEDIAN_MIN || gap > MEDIAN_MAX || A.bridge || divided[t.ri].bridge) { cross = null; return flush(); }
      const o = wa / 2 + gap / 2, s = { p: [px + t.nx * o, pz + t.nz * o], w: gap };
      if (nearMarket(s.p)) { cross = null; return flush(); }
      if (crossing(s.p[0], s.p[1], 1.5)) {
        if (run.length) { run.push(s); run.push(over(run.at(-2), s)); }
        cross = s;
        return flush();
      }
      if (!run.length && cross) { run.push(over(s, cross)); run.push(cross); }
      cross = null;
      run.push(s);
    });
    flush();
  });
}
// Is (x, z) on a median strip, widened by pad? Exact against the strip lines, as onCarriageway is.
const inMedian = (() => {
  const G = 20, grid = new Map();
  for (const m of medians) {
    for (let i = 0; i + 1 < m.pts.length; i++) {
      const hw = Math.max(m.ws[i], m.ws[i + 1]) / 2;
      const a = m.pts[i], b = m.pts[i + 1], s = [a, b, hw], r = hw + 2;
      for (let x = Math.floor((Math.min(a[0], b[0]) - r) / G); x <= Math.floor((Math.max(a[0], b[0]) + r) / G); x++)
        for (let z = Math.floor((Math.min(a[1], b[1]) - r) / G); z <= Math.floor((Math.max(a[1], b[1]) + r) / G); z++) {
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
console.log('medians:', medians.length, 'strips,', Math.round(medians.reduce((s, m) => s + m.pts.length - 1, 0) * MEDIAN_STEP), 'm');

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
  const half = road.w / 2;
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
            infill.push(q(bx), q(bz), q(w2), q(d2), Math.round(ang * 1000), q(era2 === 2 ? Math.min(m2, 4.4) : m2), 0, 2 | (era2 << 2) | (roofAt(bx, bz) << 4) | (whiteWard([bx, bz]) ? 128 : 0)); // 2 = no street face; era in bits 2-3, roof family 4-6, white ward 7
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
          infill.push(q(cx), q(cz), q(w), q(d), Math.round(ang * 1000), q(h), main ? 1 : 0, (side > 0 ? 1 : 0) | (era << 2) | (roofAt(cx, cz) << 4) | (whiteWard([cx, cz]) ? 128 : 0));
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
  if (!inBox([x, z], -4) || at(x, z) & TBLOCK || onCarriageway(x, z, TRUNK) || inMedian(x, z, TRUNK)) return false;
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
  const half = road.w / 2 + 1.6;
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
        if (!(at(x, z) & (WATER | BLD | TREE)) && !onCarriageway(x, z, TRUNK) && !inMedian(x, z, TRUNK)) { trees.push(q(x), q(z), Math.round(rr(0.75, 1.15) * 10), treeKind(false)); stamp(x, z, 3, TREE); }
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
// The bridges of the Kinh thành: every bridge way inside the citadel (over Ngự Hà, the lakes and the palace moats) or
// over the moat in front of one of its gates (the gate bridges stand 10-75 m out from the gate building) is marked
// bridge = 2, so that they are all drawn with the one masonry vaulted bridge of the citadel (src/geo/citadel-bridge.js)
// instead of the modern deck on piers. Bridges with their own model keep it (city.js leaves those out).
const GATE_BRIDGE_R = 90;
// footbridges drawn by hand on their own lakes, on the generic profile (landmarks/places/tangthulau.js, tinhtam.js): kept off
const HAND_BRIDGES = new Set([372295922, 1489091232, 1489091245]);
let nCitadelBridges = 0;
for (const r of roads) {
  if (!r.bridge || HAND_BRIDGES.has(r.id)) continue;
  const m = r.pts[r.pts.length >> 1];
  const atGate = gates.some((g) => g.k === 'citadel' && Math.hypot(g.c[0] / 10 - m[0], g.c[1] / 10 - m[1]) < GATE_BRIDGE_R);
  if (inCitadel(m) || atGate) { r.bridge = 2; nCitadelBridges++; }
}
console.log('citadel bridges (shared masonry model):', nCitadelBridges);
const tt = get('way', TT_WAY).geometry.map(proj);
const ttOutline = openRing(get('way', 1431129413).geometry.map(proj));
const ttBox = obb(ttOutline);
const bridgeOutlines = [];
const piers = []; // mapped piers and jetties (man_made=pier, as areas or as lines), kept clear of the moorings
for (const e of els) {
  const t = e.tags || {};
  if (t.man_made === 'bridge' && e.type === 'way' && e.id !== 1431129413) {
    const ring = openRing(e.geometry.map(proj));
    if (ring.length >= 3 && inBox(centroid(ring))) bridgeOutlines.push({ n: t.name || '', ring: flat(ring) });
  }
  if (t.man_made === 'pier' && e.type === 'way' && e.geometry) piers.push(e.geometry.map(proj));
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
  // the two intercity bus stations (issue #71): phía Nam is mapped as its yard, phía Bắc only as a node on Lý Thái Tổ
  const bxN = els.find((e) => e.tags && e.tags.amenity === 'bus_station' && /phía Nam/i.test(e.tags.name || '') && e.geometry);
  if (bxN) addPlace('benxenam', 'Bến xe phía Nam', centroid(openRing(bxN.geometry.map(proj))), 3, 'place', 12);
  const bxB = els.find((e) => e.tags && e.tags.amenity === 'bus_station' && /ph[íi]a B[ắăa]c/i.test(e.tags.name || ''));
  const aeon = get('way', 1575540652);
  if (aeon) addPlace('aeon', 'AEON MALL Huế', centroid(openRing(aeon.geometry.map(proj))), 3, 'place', 24);
  if (bxB) addPlace('benxebac', 'Bến xe phía Bắc', bxB.type === 'node' ? proj(bxB) : centroid(openRing(bxB.geometry.map(proj))), 3, 'place', 12);
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
  ['canchanh', 'Điện Cần Chánh', 'way', 285990343, 4, 'monument', 8],
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
// Not under a bridge: a sampan is tied up where nothing passes overhead, so every spot along the hull (±6 m, the
// longest sampan's half-length with room to spare) keeps 3 m from each bridge's deck (road, rail, mapped outline).
const bridgeSegs = [];
{
  const line = (pts, hw, closed) => { for (let i = 0; i + (closed ? 0 : 1) < pts.length; i++) bridgeSegs.push([pts[i], pts[(i + 1) % pts.length], hw]); };
  for (const r of roads) if (r.bridge) line(r.pts, r.w / 2, false);
  for (const r of rails) if (r.bridge) line(r.pts, 2, false);
  for (const b of bridgeOutlines) { const ring = []; for (let i = 0; i < b.ring.length; i += 2) ring.push([b.ring[i] / 10, b.ring[i + 1] / 10]); line(ring, 0, true); }
  line(ttOutline, 0, true);
}
const bridgeRings = [ttOutline, ...bridgeOutlines.map((b) => { const r = []; for (let i = 0; i < b.ring.length; i += 2) r.push([b.ring[i] / 10, b.ring[i + 1] / 10]); return r; })];
const nearBridge = (x, z, m) => {
  for (const [a, b, hw] of bridgeSegs) {
    const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz;
    const t = L2 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)) : 0;
    if (Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < hw + m) return true;
  }
  return bridgeRings.some((r) => pip([x, z], r));
};
// The moorings start from their own seed, so that a change upstream that draws more or fewer numbers (planting along a
// new median) does not move every sampan on the river: 579897935 is where the shared stream stood here before the
// tapering medians, so the moorings, and everything drawn after them, stay as they were.
// Nor off a pier or jetty (OSM man_made=pier: Nghênh Lương Đình's jetty, ...), nor at Cồn Hến's landings, where its own
// model ties up the clam boats (src/landmarks/conhen-landings.js): a generic sampan there ran into the steps or a boat.
const pierSegs = [];
for (const w of piers) for (let i = 0; i + 1 < w.length; i++) pierSegs.push([w[i], w[i + 1]]);
const nearPier = (x, z, m) => {
  for (const [a, b] of pierSegs) {
    const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz;
    const t = L2 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)) : 0;
    if (Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < m) return true;
  }
  return piers.some((r) => r.length >= 4 && pip([x, z], r)) || CONHEN_LANDINGS.some(([lx, lz]) => Math.hypot(x - lx, z - lz) < 25);
};
seed = 579897935;
const moorings = [];
let nUnderBridge = 0, nAtPier = 0;
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
          // water under the hull, bow to stern, and beyond it: at a bend in the bank the ends otherwise sit on land
          if (![[0, 0], [-7, 0], [7, 0], [-7, 3], [7, 3], [0, 9]].every(([d, o]) => at(x + tx * d - tz * sgn * o, z + tz * d + tx * sgn * o) & WATER)) continue;
          if ([-6, 0, 6].some((d) => nearBridge(x + tx * d, z + tz * d, 3))) { nUnderBridge++; break; }
          if ([-6, 0, 6].some((d) => nearPier(x + tx * d, z + tz * d, 4))) { nAtPier++; break; }
          moorings.push(q(x), q(z), Math.round(Math.atan2(tz, tx) * 1000));
          break;
        }
      }
      acc -= len;
    }
  }
}
console.log('moorings', moorings.length / 3, `(${nUnderBridge} left out under bridges, ${nAtPier} at piers and landings)`);

// Riverside lights (issue #21). After dark the Hương is lit along its city banks: lamp posts on the embankments,
// garden lights along the riverside walkways, and warm floodlight on the facades that face the water. All three are
// read from the data: the Hương's own bank (the river-system water near its centreline, between the villages and the
// hills), the OSM footways and paths along it, and the buildings in the front row facing it. The lamp design and
// spacing are illustrative.
const riverLamps = []; // [x, z, type] in decimetres; type 0 = embankment post, 1 = walkway light
let nFlood = 0;
{
  const segDist = (p, a, b) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2));
    return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dz * t);
  };
  const toCentre = (p) => { let d = Infinity; for (let i = 0; i + 1 < riverLine.length; i++) d = Math.min(d, segDist(p, riverLine[i], riverLine[i + 1])); return d; };
  const inTown = (p) => !inHills(p) && !inVillages(p);
  // the Hương's banks, sampled every 4 m, in a 40 m hash for nearest-bank queries
  const HC = 40, bankHash = new Map(), bankRuns = [];
  const hkey = (x, z) => Math.floor(x / HC) * 100003 + Math.floor(z / HC);
  for (const poly of water) {
    if (!touchesEdge(poly) && Math.abs(ringArea(poly[0])) < 400000) continue;
    for (const ring of poly) {
      let run = [];
      const cut = () => { if (run.length > 1) bankRuns.push(run); run = []; };
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i], b = ring[(i + 1) % ring.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        for (let s = 0; s < len; s += 4) {
          const p = [a[0] + ((b[0] - a[0]) * s) / len, a[1] + ((b[1] - a[1]) * s) / len];
          // the slab edge is a cut, not a bank
          if (!inBox(p, -3) || !inTown(p) || toCentre(p) > 380) { cut(); continue; }
          run.push(p);
          const k = hkey(p[0], p[1]);
          if (!bankHash.has(k)) bankHash.set(k, []);
          bankHash.get(k).push(p);
        }
      }
      cut();
    }
  }
  const nearestBank = (x, z, r) => {
    let best = null, bd = r;
    const c0 = Math.floor((x - r) / HC), c1 = Math.floor((x + r) / HC), r0 = Math.floor((z - r) / HC), r1 = Math.floor((z + r) / HC);
    for (let cx = c0; cx <= c1; cx++) for (let cz = r0; cz <= r1; cz++) {
      for (const p of bankHash.get(cx * 100003 + cz) || []) { const d = Math.hypot(p[0] - x, p[1] - z); if (d < bd) { bd = d; best = p; } }
    }
    return best ? { p: best, d: bd } : null;
  };
  // lamps keep a few metres from each other, whichever rule placed them first
  const lampHash = new Map();
  // and off the carriageways: the streets city.js gives kerbs (class 0-3, not bridges), their half width plus the
  // post's foot and a little more, so no part of a post stands in the traffic lane (check-overlap)
  const streetHash = new Map();
  for (const r of roads) {
    if (r.bridge || r.c > 3) continue;
    for (let i = 0; i + 1 < r.pts.length; i++) {
      const a = r.pts[i], b = r.pts[i + 1], m = r.w / 2 + 1;
      for (let cx = Math.floor((Math.min(a[0], b[0]) - m) / HC); cx <= Math.floor((Math.max(a[0], b[0]) + m) / HC); cx++)
        for (let cz = Math.floor((Math.min(a[1], b[1]) - m) / HC); cz <= Math.floor((Math.max(a[1], b[1]) + m) / HC); cz++) {
          const k = cx * 100003 + cz;
          if (!streetHash.has(k)) streetHash.set(k, []);
          streetHash.get(k).push([a, b, r.w / 2]);
        }
    }
  }
  const onCarriage = (x, z) => (streetHash.get(hkey(x, z)) || []).some(([a, b, hw]) => segDist([x, z], a, b) < hw + 0.3);
  const place = (x, z, type, gap) => {
    if (at(x, z) & (WATER | BLD) || onCarriage(x, z)) return false;
    const c0 = Math.floor((x - gap) / HC), c1 = Math.floor((x + gap) / HC), r0 = Math.floor((z - gap) / HC), r1 = Math.floor((z + gap) / HC);
    for (let cx = c0; cx <= c1; cx++) for (let cz = r0; cz <= r1; cz++) for (const p of lampHash.get(cx * 100003 + cz) || []) if (Math.hypot(p[0] - x, p[1] - z) < gap) return false;
    const k = hkey(x, z);
    if (!lampHash.has(k)) lampHash.set(k, []);
    lampHash.get(k).push([x, z]);
    riverLamps.push(q(x), q(z), type);
    return true;
  };
  // is there a street or path within r metres (an embankment people walk along, not a field running into the water)?
  const reached = (x, z, r) => {
    for (let dz = -r; dz <= r; dz += CELL) for (let dx = -r; dx <= r; dx += CELL) if (dx * dx + dz * dz <= r * r && at(x + dx, z + dz) & ROAD) return true;
    return false;
  };
  // 1. embankment posts every 24 m, 3 m in from the water's edge
  let nPost = 0;
  for (const run of bankRuns) {
    for (let i = 0; i + 1 < run.length; i += 6) {
      const a = run[i], b = run[Math.min(run.length - 1, i + 1)], len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const nx = -(b[1] - a[1]) / len, nz = (b[0] - a[0]) / len;
      for (const sgn of [1, -1]) {
        const x = a[0] + nx * 3 * sgn, z = a[1] + nz * 3 * sgn;
        if (at(x, z) & WATER || !(at(a[0] - nx * 3 * sgn, a[1] - nz * 3 * sgn) & WATER)) continue;
        if (reached(x, z, 28) && place(x, z, 0, 14)) nPost++;
        break;
      }
    }
  }
  // 2. walkway lights every 16 m along the OSM footways, paths and lanes within 70 m of the bank
  let nWalk = 0;
  for (const r of roads) {
    if (r.bridge || r.c < 3) continue; // the main streets are lit by the street lamps (src/geo/city.js)
    const reach = r.c === 5 ? 70 : 30;
    let s = 8, side = 1;
    for (let i = 0; i + 1 < r.pts.length; i++) {
      const a = r.pts[i], b = r.pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 0.01) continue;
      const nx = -(b[1] - a[1]) / len, nz = (b[0] - a[0]) / len, off = (r.c === 5 ? 1.4 : ROAD_W[r.c] / 2 + 0.6);
      for (; s < len; s += 16) {
        const x = a[0] + ((b[0] - a[0]) * s) / len, z = a[1] + ((b[1] - a[1]) * s) / len;
        if (!inTown([x, z]) || !nearestBank(x, z, reach)) continue;
        side = -side;
        if (place(x + nx * off * side, z + nz * off * side, 1, 9)) nWalk++;
      }
      s -= len;
    }
  }
  // 3. floodlit facades: buildings within 130 m of the bank with no other building between them and the water
  //    (flag 256). The test walks the mask from the footprint's nearest corner to the bank.
  const FLOOD_R = 130;
  for (const b of buildings) {
    const flags = b[4], kind = b[2];
    if (flags & 1 || kind === 8 || b[1] < 45) continue;
    const ring = []; for (let i = 0; i < b[0].length; i += 2) ring.push([b[0][i] / 10, b[0][i + 1] / 10]);
    if (Math.abs(ringArea(ring)) < 90 || !inTown(centroid(ring))) continue;
    let best = null;
    for (const p of ring) { const n = nearestBank(p[0], p[1], FLOOD_R); if (n && (!best || n.d < best.d)) best = { ...n, from: p }; }
    if (!best) continue;
    const [fx, fz] = best.from, [bx, bz] = best.p, steps = Math.ceil(best.d / CELL);
    let blocked = 0, out = false;
    for (let k = 1; k < steps; k++) {
      const x = fx + ((bx - fx) * k) / steps, z = fz + ((bz - fz) * k) / steps;
      if (!out) { if (pip([x, z], ring) || k * CELL < 3) continue; out = true; }
      if (at(x, z) & BLD) blocked++;
    }
    if (blocked > 3) continue;
    b[4] = flags | 256;
    nFlood++;
  }
  console.log('riverside lights: embankment posts', nPost, '| walkway lights', nWalk, '| floodlit facades', nFlood, '| bank samples', bankRuns.reduce((s, r) => s + r.length, 0));
}

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
    const bareAt = sample(D.h);
    // The surface heights come from the owner's elevation raster (issue #73): data/raw/dem/output_hh.tif, Band 1 in
    // metres above the WGS 84 ellipsoid, on the same 1 arc-second lattice as the grid above (it is the Copernicus
    // GLO-30 surface, roofs and canopy included, as exported by OpenTopography). Everything else here stands on
    // EGM2008 (the bare-earth grid, the laser points, the documented heights), so the raster is moved onto it: the
    // geoid's height over the ellipsoid, fitted as a plane where the raster and the Copernicus grid of terrain.json
    // overlap (about -14.0 m in the north-west to -13.3 m in the south-east; residual a few centimetres). NoData
    // cells (the file's NoData value, non-numbers, the 0.00 its export writes over open water, and the handful of
    // lagoon cells that read tens of metres under the sea) are skipped: there the surface falls back to bare earth.
    const TIF = 'data/raw/dem/output_hh.tif';
    let surfAt = sample(D.s || D.h);
    if (!fs.existsSync(TIF)) missing('no elevation raster ' + TIF + ': the surface comes from terrain.json');
    else {
      const { readGeoTiff } = await import('./lib/geotiff.mjs');
      const R = readGeoTiff(fs.readFileSync(TIF));
      const ok = (v) => Number.isFinite(v) && v !== R.nodata && v !== 0 && v > -20;
      const cellOf = (lon, lat) => [(lon - R.lon0) / R.dlon, (lat - R.lat0) / R.dlat]; // pixel centres at integers
      // the datum: least squares plane N = a + b·lon' + c·lat' over the overlap, outliers (> 0.5 m off a first fit) left out
      const pairs = [];
      for (let j = 0; j < D.ny; j++) for (let i = 0; i < D.nx; i++) {
        const lon = D.lon0 + (i + 0.5) * D.dlon, lat = D.lat0 + (j + 0.5) * D.dlat, [px, py] = cellOf(lon, lat);
        const v = R.data[Math.round(py) * R.width + Math.round(px)];
        if (ok(v) && D.s && D.s[j * D.nx + i] !== 0) pairs.push([lon - ORIGIN.lon, lat - ORIGIN.lat, v - D.s[j * D.nx + i] / 10]);
      }
      const fit = (pts) => {
        const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], y = [0, 0, 0];
        for (const [u, w, d] of pts) { const r = [1, u, w]; for (let a = 0; a < 3; a++) { y[a] += r[a] * d; for (let b = 0; b < 3; b++) A[a][b] += r[a] * r[b]; } }
        for (let c = 0; c < 3; c++) for (let r = c + 1; r < 3; r++) { const f = A[r][c] / A[c][c]; for (let k = c; k < 3; k++) A[r][k] -= f * A[c][k]; y[r] -= f * y[c]; }
        const s = [0, 0, 0];
        for (let r = 2; r >= 0; r--) { let t = y[r]; for (let k = r + 1; k < 3; k++) t -= A[r][k] * s[k]; s[r] = t / A[r][r]; }
        return s;
      };
      let N = pairs.length ? fit(pairs) : [0, 0, 0];
      const geoid = (lon, lat) => N[0] + N[1] * (lon - ORIGIN.lon) + N[2] * (lat - ORIGIN.lat);
      if (pairs.length) N = fit(pairs.filter(([u, w, d]) => Math.abs(d - geoid(u + ORIGIN.lon, w + ORIGIN.lat)) < 0.5));
      const res = pairs.map(([u, w, d]) => d - geoid(u + ORIGIN.lon, w + ORIGIN.lat)).sort((a, b) => a - b);
      // EGM2008 heights; NoData as NaN
      const E = new Float64Array(R.data.length);
      let nodata = 0;
      for (let j = 0; j < R.height; j++) for (let i = 0; i < R.width; i++) {
        const k = j * R.width + i, v = R.data[k];
        if (!ok(v)) { E[k] = NaN; nodata++; continue; }
        E[k] = v - geoid(R.lon0 + i * R.dlon, R.lat0 + j * R.dlat);
      }
      // bilinear over the four nearest cells, NoData corners left out; all four NoData: bare earth
      surfAt = (x, z) => {
        const [px, py] = cellOf(ORIGIN.lon + x / KX, ORIGIN.lat - z / KZ);
        const ix = Math.floor(px), iy = Math.floor(py), ax = px - ix, ay = py - iy;
        let s = 0, w = 0;
        for (const [di, dj, wt] of [[0, 0, (1 - ax) * (1 - ay)], [1, 0, ax * (1 - ay)], [0, 1, (1 - ax) * ay], [1, 1, ax * ay]]) {
          const a = ix + di, b = iy + dj;
          if (a < 0 || b < 0 || a >= R.width || b >= R.height) continue;
          const v = E[b * R.width + a];
          if (v === v && wt > 0) { s += v * wt; w += wt; }
        }
        return w > 1e-6 ? s / w : bareAt(x, z);
      };
      console.log('elevation raster', TIF, R.width + 'x' + R.height, '"' + R.description + '"', '| pixel', (R.dlon * 3600).toFixed(2) + '″', R.pixelIsPoint ? 'is point' : 'is area',
        '| NoData cells', nodata, '| geoid over the ellipsoid', geoid(107.5385, 16.53).toFixed(2), 'to', geoid(107.613, 16.382).toFixed(2), 'm, residual p05/p95',
        res.length ? res[res.length * 0.05 | 0].toFixed(2) + '/' + res[res.length * 0.95 | 0].toFixed(2) : '-', 'm over', res.length, 'cells');
    }
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
    // Heights stand 1:1 above the city floor (issue #73): nothing is squeezed or scaled. What varies is only how much
    // a node is smoothed. The plain still reads most of a metre of noise (0.8 m rms against the laser: roofs the
    // bare-earth model kept), so where the broadly smoothed ground stands under DEAD above the floor a node takes that
    // broad reading (a 5 × 5 node bell, about 30 m); from FULL up it takes the lightly smoothed one, so hills keep
    // their crests; between, it blends. Ground under the floor is drawn at the floor (the slab cannot go lower).
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
      // 0.3 m under the ground's own reading, so a low lake is not left perched above its own shore
      const up = vals[Math.floor(vals.length * 0.3)] - floor, lv = up - 0.3;
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
      { const g = gateOf(broad[k] - floor); h[k] = Math.max(0, broad[k] + g * (fine[k] - broad[k]) - floor); }
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
    // Carriageways on a 30 m grid (issue #73). The elevation raster is a surface model at about 30 m: beside a road it
    // reads a cutting's shoulders, an embankment's foot or roadside canopy as the ground, and a street drawn over it
    // then climbs 8 m and drops back within 50 m (Quốc lộ 49 on the way to the tombs) where the real road runs level.
    // Each carriageway (classes 0-3; tracks and footpaths climb the hills as they are) is read every STEP along its
    // length; where its grade changes by more than GRADE_BREAK from one stretch to the next, the grid nodes under the
    // middle are moved toward the line between its neighbours. The ground itself moves, so the road, the houses along
    // it (seated on the same ground) and the terrain stay one surface. Water, lakes, banks and the Citadel are locked;
    // bridges keep their own deck (src/geo/bridges.js).
    {
      const GRADE_BREAK = 0.08, SHARP = 0.15, PASSES = 40;
      const tri = (x, z) => {
        const gx = (x - GX0) / STEP, gz = (z - GZ0) / STEP, i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j;
        if (i < 0 || j < 0 || i >= nx - 1 || j >= nz - 1) return null;
        const k = j * nx + i;
        // the client's triangles (src/geo/terrain.js coarse): split along the 00-11 diagonal
        return fx > fz ? [[k, 1 - fx], [k + 1, fx - fz], [k + nx + 1, fz]] : [[k, 1 - fz], [k + nx, fz - fx], [k + nx + 1, fx]];
      };
      const yAt = (t) => t.reduce((s, [k, w]) => s + h[k] * w, 0);
      const lines = [];
      for (const r of roads) {
        if (r.bridge || r.c > 3) continue; // tracks and footpaths climb the hills as they are
        const pts = r.pts;
        let len = 0;
        for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        if (len < 3 * STEP) continue;
        const n = Math.floor(len / STEP), samples = [];
        for (let s = 0, i = 0, acc = 0; samples.length <= n; s += len / n) {
          while (i < pts.length - 2 && acc + Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) < s) { acc += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); i++; }
          const a = pts[i], b = pts[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, t = Math.min(1, Math.max(0, (s - acc) / l));
          const tr = tri(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t);
          if (!tr) break;
          samples.push(tr);
        }
        if (samples.length >= 3) lines.push({ samples, d: len / n });
      }
      const worst = () => {
        let n = 0, sharp = 0, m = 0;
        for (const { samples, d } of lines) for (let i = 1; i + 1 < samples.length; i++) {
          const b = Math.abs(yAt(samples[i + 1]) - 2 * yAt(samples[i]) + yAt(samples[i - 1])) / d;
          if (b > GRADE_BREAK) n++;
          if (b > SHARP) sharp++;
          m = Math.max(m, b);
        }
        return [n, m, sharp];
      };
      const [n0, m0, s0] = worst();
      // Jacobi passes: neighbouring samples share nodes, so each pass first gathers what every break asks of its nodes
      // (to bring its middle onto the line between its neighbours, give or take GRADE_BREAK), then moves each node by
      // half the mean of those asks. A node moves at most MAX_MOVE in all, so a summit the road climbs over keeps its height.
      const MAX_MOVE = 5, h0 = Float32Array.from(h), ask = new Float32Array(h.length), cnt = new Float32Array(h.length);
      for (let pass = 0; pass < PASSES; pass++) {
        ask.fill(0); cnt.fill(0);
        let any = false;
        for (const { samples, d } of lines) for (let i = 1; i + 1 < samples.length; i++) {
          const y0 = yAt(samples[i - 1]), y1 = yAt(samples[i]), y2 = yAt(samples[i + 1]), b = (y2 - 2 * y1 + y0) / d;
          if (Math.abs(b) <= GRADE_BREAK) continue;
          const want = ((b - Math.sign(b) * GRADE_BREAK) * d) / 2; // raise the middle by this (lower it if negative)
          for (const [k, w] of samples[i]) if (!lock[k] && w > 0.05) { ask[k] += want * w; cnt[k] += w; }
          any = true;
        }
        if (!any) break;
        for (let k = 0; k < h.length; k++) if (cnt[k] > 0) h[k] = Math.max(0, shoreLv[k], h0[k] - MAX_MOVE, Math.min(h0[k] + MAX_MOVE, h[k] + (0.5 * ask[k]) / cnt[k]));
      }
      let moved = 0;
      for (let k = 0; k < h.length; k++) if (Math.abs(h[k] - h0[k]) > 0.05) moved++;
      const [n1, m1, s1] = worst();
      console.log('carriageway grade breaks between neighbouring', STEP, 'm stretches: over', GRADE_BREAK * 100 + '%', n0, '->', n1, '| over', SHARP * 100 + '%', s0, '->', s1, '| worst', (m0 * 100).toFixed(1) + '% ->', (m1 * 100).toFixed(1) + '% |', moved, 'nodes moved over 5 cm, on', lines.length, 'roads');
    }
    // Designed landmarks keep their own geometry (issue #73). A model in src/landmarks/places/ is drawn on one level
    // (its floor, forecourt and steps read the ground at one point), and the plain under it now has the raster's
    // half-metre swells. So the ground comes to the model: the grid nodes within PAD_R of a designed place on the plain
    // are held at one level, the median of what they read, or the city floor where the pad meets a locked bank. Its
    // access roads and the houses round it are seated on the same ground. Places in the hills (any node over PAD_HILL)
    // are left as they are: those models are built on their slopes.
    // Bridges keep their own deck too: a road bridge's deck is level across (src/geo/bridges.js reads only the ground
    // at its two ends), so the nodes round each end are held level the same way and the street it lands on does not
    // tilt under it. Rail bridges carry their deck flat at LAND_Y + 0.5 (src/geo/city.js, places/bachho.js) with the
    // track at grade beyond, so the ground where a rail bridge lands stays at the city floor.
    {
      const PAD_R = 60, PAD_HILL = 3, LANDING = 25, RAIL_END = 35;
      const designed = new Set();
      for (const f of fs.readdirSync('src/landmarks/places')) {
        const m = /^export const id = '([^']+)'/m.exec(fs.readFileSync('src/landmarks/places/' + f, 'utf8'));
        if (m) designed.add(m[1]);
      }
      const near = (x, z, r, fn) => {
        for (let j = Math.max(0, Math.floor((z - r - GZ0) / STEP)); j <= Math.min(nz - 1, Math.ceil((z + r - GZ0) / STEP)); j++)
          for (let i = Math.max(0, Math.floor((x - r - GX0) / STEP)); i <= Math.min(nx - 1, Math.ceil((x + r - GX0) / STEP)); i++)
            if (Math.hypot(GX0 + i * STEP - x, GZ0 + j * STEP - z) <= r) fn(j * nx + i);
      };
      let pads = 0, padNodes = 0, landings = 0, railNodes = 0;
      // hold these nodes at one level; 0 (nothing done) on a hillside or where they all stand at the floor already
      const level = (ks) => {
        if (!ks.length || ks.some((k) => lock[k] === 2 || h[k] > PAD_HILL) || ks.every((k) => h[k] === 0)) return 0;
        const free = ks.filter((k) => !lock[k]), vals = free.map((k) => h[k]).sort((a, b) => a - b);
        const lv = ks.some((k) => lock[k] === 1) ? 0 : vals[vals.length >> 1];
        for (const k of free) h[k] = lv;
        return free.length;
      };
      for (const pl of places) {
        if (!designed.has(pl.id)) continue;
        const ks = [];
        near(pl.x / 10, pl.z / 10, PAD_R, (k) => ks.push(k));
        const n = level(ks);
        if (n) { pads++; padNodes += n; }
      }
      for (const r of roads) if (r.bridge) for (const e of [r.pts[0], r.pts[r.pts.length - 1]]) { const ks = []; near(e[0], e[1], LANDING, (k) => ks.push(k)); landings += level(ks); }
      for (const r of rails) if (r.bridge) for (const e of [r.pts[0], r.pts[r.pts.length - 1]]) near(e[0], e[1], RAIL_END, (k) => { if (h[k] > 0 && lock[k] !== 2) { h[k] = 0; railNodes++; } });
      console.log('landmark pads on the plain:', pads, 'places,', padNodes, 'nodes held level | road bridge landings:', landings, 'nodes | rail bridge landings:', railNodes, 'nodes at the floor');
    }
    // the drawn ground (city floor + grid, on the client's triangles) against the laser, the same bins as above
    if (lidar) {
      const drawn = (x, z) => {
        const gx = (x - GX0) / STEP, gz = (z - GZ0) / STEP, i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j;
        if (i < 0 || j < 0 || i >= nx - 1 || j >= nz - 1) return NaN;
        const k = j * nx + i, h00 = h[k], h10 = h[k + 1], h01 = h[k + nx], h11 = h[k + nx + 1];
        return floor + (fx > fz ? h00 + (h10 - h00) * fx + (h11 - h10) * fz : h00 + (h11 - h01) * fx + (h01 - h00) * fz);
      };
      const line = (name, sel) => {
        const e = lidar.filter(sel).map((p) => drawn(p.x, p.z) - p.ele).filter(Number.isFinite).sort((a, b) => a - b);
        return `${name} ${e.length} pts ${Math.sqrt(e.reduce((t, v) => t + v * v, 0) / (e.length || 1)).toFixed(2)} rms (median ${(e[e.length >> 1] || 0).toFixed(2)})`;
      };
      const out = (p) => !inCitadel([p.x, p.z]);
      console.log('drawn ground against the laser:', line('plain outside the Citadel, under 8 m', (p) => p.ele < 8 && out(p)), '|', line('8-25 m', (p) => p.ele >= 8 && p.ele < 25), '|', line('all', () => true));
    }
    // ground cover on raised ground (flat land takes its colour from the polygon overlay instead)
    const COVER = { park: 1, wood: 2, grass: 3, farm: 4, cemetery: 5, pitch: 6, sacred: 7, paved: 8 };
    let cover = '', lifted = 0, peak = 0;
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      let c = 0;
      if (h[k] > 0) {
        lifted++; peak = Math.max(peak, h[k]);
        const p = [GX0 + i * STEP, GZ0 + j * STEP];
        for (const g of green) if (g.k === 'paved' && pipPoly(p, g.p)) { c = COVER.paved; break; } // a yard is laid over its park
        if (!c) for (const g of green) if (pipPoly(p, g.p)) { c = COVER[g.k] || 0; break; }
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
// split: trees and infill houses for the first frame, the rest in tiles
// =====================================================================
// Trees and infill houses are two thirds of the bundle. hue.json keeps the ones the opening view shows (the ground in
// front of the home camera, src/main.js homeView, out to the trees' draw distance) and the ones a place builder reads
// or edits (any src/landmarks/places/*.js that mentions data.trees or data.infill: every record within PLACE_REACH, or
// the file's own `export const dataReach`, of that place's point, so the builder sees exactly what it saw with the whole
// set; check-tiles proves it). The rest go to coarse square tiles, public/data/tiles/<col>_<row>.json, which the app
// fetches after the first frame, nearest to the opening view first, and plants through the same builders (city.js addTile). Each tile is near-water first like
// the main arrays, and carries i0: the index its first record would have in one array of everything (the builders
// seed each record's dice with its index, so a tile's trees do not repeat the main set's).
const TILE = 4000, PLACE_REACH = 520;
const TILE_DIR = 'public/data/tiles';
const splitTest = (() => {
  const a = tt[0], b = tt[tt.length - 1], c = ttBox.c, dl = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const d = [(b[0] - a[0]) / dl, (b[1] - a[1]) / dl], upR = [-d[1], d[0]];
  // the two ends of homeView's range (wide window, tall phone): camera and target on the ground
  const views = [[790, 140, 90, 40], [1300, 110, 150, 55]].map(([back, side, ahead, north]) => {
    const cam = [c[0] - upR[0] * back - d[0] * side, c[1] - upR[1] * back - d[1] * side];
    const tg = [c[0] + upR[0] * ahead - d[0] * north, c[1] + upR[1] * ahead - d[1] * north];
    const L = Math.hypot(tg[0] - cam[0], tg[1] - cam[1]);
    return { cam, f: [(tg[0] - cam[0]) / L, (tg[1] - cam[1]) / L] };
  });
  // a wedge a little wider than the widest lens the opening uses (29 degrees tall on a 16:10 screen is 45 wide), out to
  // 3.6 km (city.js and foliage.js stop drawing tree chunks past about that), with 250 m to spare on each side
  const inView = (x, z) => views.some(({ cam, f }) => {
    const vx = x - cam[0], vz = z - cam[1], along = vx * f[0] + vz * f[1], across = Math.abs(-vx * f[1] + vz * f[0]);
    return along > -250 && along < 3600 && across < Math.max(0, along) * 0.5 + 250;
  });
  const dir = 'src/landmarks/places/';
  const readers = fs.readdirSync(dir).filter((f) => f.endsWith('.js') && f !== 'index.js').map((f) => fs.readFileSync(dir + f, 'utf8'))
    .filter((s) => /data\.(trees|infill)\b/.test(s))
    .map((s) => [(s.match(/export const id = '([^']+)'/) || [])[1], +(s.match(/export const dataReach = (\d+)/) || [])[1] || PLACE_REACH]).filter(([id]) => id);
  const spots = readers.map(([id, r]) => [places.find((p) => p.id.normalize('NFC') === id.normalize('NFC')), r]).filter(([p]) => p).map(([p, r]) => [p.x / 10, p.z / 10, r]);
  console.log('tiles: places that read trees or infill', readers.length, '(' + spots.length + ' placed):', readers.map(([id, r]) => id + (r !== PLACE_REACH ? ` (${r} m)` : '')).join(' '));
  if (spots.length < readers.length) console.warn('tiles: a place that reads trees or infill has no place point; its records may land in a tile');
  return (x, z) => inView(x, z) || spots.some((s) => (x - s[0]) ** 2 + (z - s[1]) ** 2 < s[2] * s[2]);
})();
function split(arr, stride) {
  const first = [], tiles = new Map();
  for (let i = 0; i < arr.length; i += stride) {
    const x = arr[i] / 10, z = arr[i + 1] / 10, rec = arr.slice(i, i + stride);
    if (splitTest(x, z)) { first.push(...rec); continue; }
    const key = Math.floor((x - MINX) / TILE) + '_' + Math.floor((z - MINZ) / TILE);
    if (!tiles.has(key)) tiles.set(key, []);
    tiles.get(key).push(...rec);
  }
  return [first, tiles];
}
const [infillFirst, infillTiles] = split(infill, 8);
const [treesFirst, treesTiles] = split(trees, 4);
// =====================================================================
// write
// =====================================================================
const [infillOut, infillNear] = nearFirst(infillFirst, 8);
const [treesOut, treesNear] = nearFirst(treesFirst, 4);
console.log('near water: infill', infillNear, 'of', infillFirst.length / 8, '| trees', treesNear, 'of', treesFirst.length / 4, '(first frame)');
const tileList = (() => {
  const keys = [...new Set([...infillTiles.keys(), ...treesTiles.keys()])];
  const c = ttBox.c; // nearest the opening view first (the bridge)
  const centre = (k) => { const [i, j] = k.split('_').map(Number); return [MINX + (i + 0.5) * TILE, MINZ + (j + 0.5) * TILE]; };
  keys.sort((p, q) => Math.hypot(...centre(p).map((v, n) => v - c[n])) - Math.hypot(...centre(q).map((v, n) => v - c[n])));
  let ti = treesOut.length / 4, ii = infillOut.length / 8;
  return keys.map((k) => {
    const [tr, trN] = nearFirst(treesTiles.get(k) || [], 4), [inf, infN] = nearFirst(infillTiles.get(k) || [], 8);
    const tile = { f: 'tiles/' + k + '.json', c: centre(k).map(q), trees: tr.length / 4, infill: inf.length / 8, body: { i0: [ti, ii], treesNear: trN, infillNear: infN, trees: tr, infill: inf } };
    ti += tile.trees; ii += tile.infill;
    return tile;
  });
})();
const out = {
  meta: {
    origin: ORIGIN,
    bounds: [q(MINX), q(MINZ), q(MAXX), q(MAXZ)],
    osmTimestamp: raw.osm3s && raw.osm3s.timestamp_osm_base,
    osmExtracts, // every extract merged, with its Overpass timestamp (null: fetched from the OSM API, no timestamp)
    // infill and trees: the whole model's; infillNear / treesNear: of the arrays in this file (the first frame's)
    counts: { buildings: buildings.length, infill: infill.length / 8, roads: roads.length, trees: trees.length / 4, infillNear, treesNear },
    // the rest of the trees and infill houses, fetched after the first frame in this order: file (under data/), centre (dm), counts
    tiles: tileList.map(({ f, c, trees: t, infill: n }) => ({ f, c, trees: t, infill: n })),
  },
  land: land.map(flatPoly),
  ponds: ponds.map(flatPoly),
  pondLv: pondLv.map((v) => Math.round(v * 10)),
  green: green.map((g) => [g.k, flatPoly(g.p)]),
  // 4th: carriageway width (dm) where it is not the class width; 5th: one width per point where it tapers (0: none);
  // 6th: the lane count of an unmarked road type (no lane dashes, no lamps)
  roads: roads.map((r) => {
    const e = [r.c, r.bridge, flat(r.pts)];
    if (r.ws || r.lanes || r.w !== ROAD_W[r.c]) e.push(q(r.w));
    if (r.ws || r.lanes) e.push(r.ws ? r.ws.map(q) : 0);
    if (r.lanes) e.push(r.lanes);
    return e;
  }),
  medians: medians.map((m) => [q(m.w), flat(m.pts), m.ws.map(q)]),
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
  riverLamps,
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
fs.rmSync(TILE_DIR, { recursive: true, force: true }); // a tile no longer in the list must not linger
fs.mkdirSync(TILE_DIR, { recursive: true });
for (const t of tileList) fs.writeFileSync('public/data/' + t.f, JSON.stringify(t.body));
{
  const size = (f) => fs.statSync(f).size, gz = (f) => zlib.gzipSync(fs.readFileSync(f)).length;
  const files = tileList.map((t) => 'public/data/' + t.f);
  console.log('wrote', files.length, 'tiles in', TILE_DIR, (files.reduce((s2, f) => s2 + size(f), 0) / 1e6).toFixed(2), 'MB (' + (files.reduce((s2, f) => s2 + gz(f), 0) / 1e6).toFixed(2), 'MB gzip) | first frame', OUT, (size(OUT) / 1e6).toFixed(2), 'MB (' + (gz(OUT) / 1e6).toFixed(2), 'MB gzip):', treesOut.length / 4, 'of', trees.length / 4, 'trees,', infillOut.length / 8, 'of', infill.length / 8, 'houses');
}
// ---- the place index: what search, the cards and the About dialog need, small enough to arrive before the city ----
// The app reads it first, so the search box works while hue.json downloads, and the 2D fallback (no WebGL) never
// fetches hue.json at all. `map` is a coarse plan for that fallback, in whole metres: the land (water is what is
// left) and the Citadel wall, simplified to a few metres.
{
  const simplify = (pts, tol) => { // Douglas-Peucker on an open polyline
    if (pts.length < 3) return pts;
    const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
      const [a, b] = stack.pop();
      const [ax, az] = pts[a], [bx, bz] = pts[b], dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
      let best = -1, bd = tol;
      for (let i = a + 1; i < b; i++) {
        const ex = pts[i][0] - ax, ez = pts[i][1] - az;
        const d = L > 1e-6 ? Math.abs(ex * dz - ez * dx) / L : Math.hypot(ex, ez); // a closed ring: distance from its start
        if (d > bd) { bd = d; best = i; }
      }
      if (best > 0) { keep[best] = 1; stack.push([a, best], [best, b]); }
    }
    return pts.filter((_, i) => keep[i]);
  };
  const ringArea = (r) => { let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[j][0] - r[i][0]) * (r[j][1] + r[i][1]); return Math.abs(s / 2); };
  const m = (pts) => pts.flatMap((p) => [Math.round(p[0]), Math.round(p[1])]);
  const ring = (r, tol, minArea) => { const o = openRing(r); if (ringArea(o) < minArea) return null; const s = simplify([...o, o[0]], tol).slice(0, -1); return s.length >= 3 ? m(s) : null; };
  const polys = (mp, tol, minArea) => mp.map((poly) => poly.map((r) => ring(r, tol, minArea)).filter(Boolean)).filter((p) => p.length);
  const index = {
    meta: { ...out.meta, tiles: undefined }, // the tile list is the scene's business
    places,
    waterLabels: water_labels,
    map: { land: polys(land, 6, 2500), wall: polys(wall, 3, 0) },
  };
  const PLACES_OUT = 'public/data/places.json';
  fs.writeFileSync(PLACES_OUT, JSON.stringify(index));
  console.log('wrote', PLACES_OUT, (fs.statSync(PLACES_OUT).size / 1e3).toFixed(1), 'kB');
}
console.log('truong tien obb', ttBox.w.toFixed(1), 'x', ttBox.d.toFixed(1), 'centre', ttBox.c.map((v) => v.toFixed(1)), 'centreline', tt.map((p) => p.map((v) => v.toFixed(1))));

// ---- checks: the terrain must not get worse without anyone noticing (see scripts/check-data.mjs) ----
{
  const { checkData, diffData } = await import('./check-data.mjs');
  const { withTiles } = await import('./lib/data.mjs');
  const { fails, notes } = checkData(withTiles(JSON.parse(JSON.stringify(out)), (f) => tileList.find((t) => t.f === f).body)); // the whole model, tiles included
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

// ---- label anchor heights: the scene built headless from the new hue.json, its model tops written into places.json ----
await (await import('./build-label-tops.mjs')).buildLabelTops();
