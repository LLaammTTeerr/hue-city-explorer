import * as THREE from 'three';
import { Buf, hex, shade, unflat } from '../geo/buf.js';
import { cityMaterial, enc } from '../geo/materials.js';
import { rise, pondY } from '../geo/terrain.js';
import { LAND_Y, POND_Y, quality } from '../config.js';
import { era, onEra } from '../era.js';
import { bridgeProfiles, resample } from '../geo/bridges.js';

// Small living things that make the model feel inhabited. All illustrative.

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const inRing = (x, z, r) => {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) if (r[i][1] > z !== r[j][1] > z && x < ((r[j][0] - r[i][0]) * (z - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) c = !c;
  return c;
};

// Lotus on the still water: the moat and the lakes of the Citadel are full of it in summer.
export function buildLotus(data, group) {
  const rnd = rng(20261119);
  const pads = [], blooms = [];
  const MAX = quality.low ? 5000 : 14000;
  (data.ponds || []).forEach((poly, pi) => {
    const Y = pondY(data, pi);
    const rings = poly.map(unflat), outer = rings[0];
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, area = 0;
    for (let i = 0; i < outer.length; i++) {
      const p = outer[i], q = outer[(i + 1) % outer.length];
      x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]);
      area += p[0] * q[1] - q[0] * p[1];
    }
    area = Math.abs(area) / 2;
    if (area < 900) return;
    const want = Math.min(1100, Math.round(area / 26));
    for (let k = 0, tries = 0; k < want && tries < want * 6 && pads.length < MAX; tries++) {
      const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0);
      // lotus grows in drifts, thickest toward the banks
      if (Math.sin(x * 0.045) * Math.cos(z * 0.052) + Math.sin((x + z) * 0.021) < 0.15 - rnd() * 0.5) continue;
      if (!inRing(x, z, outer) || rings.slice(1).some((h) => inRing(x, z, h))) continue;
      // leaves are drawn about twice life size so the drifts read from the air
      pads.push([x, z, 1.1 + rnd() * 1.2, rnd() * 6.28, Y]);
      if (rnd() < 0.2) blooms.push([x + (rnd() - 0.5) * 1.2, z + (rnd() - 0.5) * 1.2, 1.3 + rnd() * 0.9, Y]);
      k++;
    }
  });
  if (!pads.length) return;
  const mat = cityMaterial();
  const padGeo = new Buf(16);
  // a leaf: a disc with one notch, slightly dished
  for (let i = 0; i < 7; i++) {
    const a0 = 0.35 + (i / 7) * (Math.PI * 2 - 0.7), a1 = 0.35 + ((i + 1) / 7) * (Math.PI * 2 - 0.7);
    padGeo.tri([0, 0, 0], [Math.cos(a0), 0.07, Math.sin(a0)], [Math.cos(a1), 0.07, Math.sin(a1)], i % 2 ? [1, 1, 1] : [0.86, 0.86, 0.86], [0, 1, 0]);
  }
  const bloomGeo = new Buf(32);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2, b = a + 0.6;
    bloomGeo.tri([0, 0.1, 0], [Math.cos(a) * 0.42, 0.75, Math.sin(a) * 0.42], [Math.cos(b) * 0.42, 0.75, Math.sin(b) * 0.42], [1, 1, 1], [Math.cos(a), 0.6, Math.sin(a)]);
    bloomGeo.tri([0, 0.1, 0], [Math.cos(b) * 0.42, 0.75, Math.sin(b) * 0.42], [Math.cos(a) * 0.42, 0.75, Math.sin(a) * 0.42], [0.8, 0.8, 0.8], [-Math.cos(a), 0.3, -Math.sin(a)]);
  }
  bloomGeo.cyl(0, 0, -0.3, 0.12, 0.03, 0.03, 4, [0.3, 0.5, 0.3], { cap: false });
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
  const greens = ['#5f9a58', '#6aa460', '#4f8a52', '#79a965', '#8fb06a'].map(hex), pinks = ['#f2a7bd', '#ee8fb0', '#f7c6d4', '#fbe9ec'].map(hex);
  const padMesh = new THREE.InstancedMesh(padGeo.geometry(), mat, pads.length);
  pads.forEach(([x, z, r, a, y], i) => {
    q.setFromAxisAngle(up, a); p.set(x, y + 0.05, z); s.set(r, r, r);
    padMesh.setMatrixAt(i, m.compose(p, q, s));
    padMesh.setColorAt(i, enc(shade(greens[i % greens.length], 0.85 + ((i * 7) % 10) / 33), c));
  });
  const bloomMesh = new THREE.InstancedMesh(bloomGeo.geometry(), mat, Math.max(1, blooms.length));
  blooms.forEach(([x, z, r, y], i) => {
    q.setFromAxisAngle(up, i); p.set(x, y + 0.25, z); s.set(r, r, r);
    bloomMesh.setMatrixAt(i, m.compose(p, q, s));
    bloomMesh.setColorAt(i, enc(pinks[i % pinks.length], c));
  });
  for (const mesh of [padMesh, bloomMesh]) {
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.layers.set(1);
    group.add(mesh);
  }
}

// ---------- shared helpers for things that move along polylines ----------

const ROAD_W = [15, 12, 9.5, 6.5, 4, 2.2]; // carriageway widths by road class; must match ROAD_W in geo/city.js
const BRIDGE_TOP = LAND_Y + 0.42; // road bridge slab top (geo/city.js)
const RAIL_BRIDGE_TOP = LAND_Y + 0.5; // rail bridge deck (geo/city.js)
const ON_GROUND = 0.06; // things on the ground stand on the road overlay, not under it

function pathLength(pts) { let s = 0; for (let i = 0; i + 1 < pts.length; i++) s += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); return s; }
// Same as `along` in geo/city.js, so lamp posts land exactly where the night glows are.
function along(pts, dist) {
  let s = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (s + l >= dist && l > 0) { const t = (dist - s) / l; return { p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], a: Math.atan2(b[1] - a[1], b[0] - a[0]) }; }
    s += l;
  }
  const a = pts[pts.length - 2], b = pts[pts.length - 1];
  return { p: b, a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
}

// The roads as objects, defensively: anything malformed is dropped.
function readRoads(data) {
  const out = [];
  for (const r of data.roads || []) {
    if (!Array.isArray(r) || !Array.isArray(r[2]) || r[2].length < 4) continue;
    const pts = unflat(r[2]);
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const p of pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < z0) z0 = p[1]; if (p[1] > z1) z1 = p[1]; }
    out.push({ c: Math.max(0, Math.min(5, r[0] | 0)), bridge: !!r[1], flat: r[2], pts, len: pathLength(pts), x0, x1, z0, z1 });
  }
  return out;
}

// A walkable/drivable path. ya/yb[i] are the heights at the two ends of segment i (pts[i-1] → pts[i]);
// NaN means "on the ground", which is then read from the terrain under the offset position.
function mkPath(pts, ya = null, yb = null) {
  const n = pts.length, acc = new Float64Array(n), ux = new Float32Array(n), uz = new Float32Array(n);
  for (let i = 1; i < n; i++) {
    const dx = pts[i][0] - pts[i - 1][0], dz = pts[i][1] - pts[i - 1][1], l = Math.hypot(dx, dz);
    acc[i] = acc[i - 1] + l;
    ux[i] = l > 1e-6 ? dx / l : NaN; uz[i] = l > 1e-6 ? dz / l : 0;
  }
  // a zero-length segment borrows its neighbour's direction
  for (let i = 2; i < n; i++) if (ux[i] !== ux[i]) { ux[i] = ux[i - 1]; uz[i] = uz[i - 1]; }
  for (let i = n - 2; i >= 1; i--) if (ux[i] !== ux[i]) { ux[i] = ux[i + 1]; uz[i] = uz[i + 1]; }
  for (let i = 1; i < n; i++) if (ux[i] !== ux[i]) { ux[i] = 1; uz[i] = 0; }
  return { pts, acc, ux, uz, len: acc[n - 1], ya, yb };
}
function seek(path, s, seg) {
  const acc = path.acc, n = acc.length;
  if (seg < 1) seg = 1; else if (seg > n - 1) seg = n - 1;
  while (seg < n - 1 && acc[seg] < s) seg++;
  while (seg > 1 && acc[seg - 1] > s) seg--;
  return seg;
}
// Position at arc length s, pushed `off` metres to the right of the direction of travel along the path.
// Near a corner the direction is blended with the neighbouring segment's, so offset agents round the corner
// instead of jumping across it. Writes into `o`.
function place(path, s, seg, off, o) {
  const a = path.pts[seg - 1], b = path.pts[seg], acc = path.acc, n = acc.length;
  const l = acc[seg] - acc[seg - 1];
  let t = l > 1e-6 ? (s - acc[seg - 1]) / l : 0;
  if (t < 0) t = 0; else if (t > 1) t = 1;
  let dx = path.ux[seg], dz = path.uz[seg];
  const R = Math.min(Math.abs(off) * 1.5 + 1, l / 2), ds = t * l, de = l - ds;
  if (ds >= de) { if (de < R && seg < n - 1) { const w = 0.5 * (1 - de / R); dx += (path.ux[seg + 1] - dx) * w; dz += (path.uz[seg + 1] - dz) * w; } }
  else if (ds < R && seg > 1) { const w = 0.5 * (1 - ds / R); dx += (path.ux[seg - 1] - dx) * w; dz += (path.uz[seg - 1] - dz) * w; }
  o.dx = dx; o.dz = dz;
  o.x = a[0] + (b[0] - a[0]) * t - dz * off;
  o.z = a[1] + (b[1] - a[1]) * t + dx * off;
  const ya = path.ya ? path.ya[seg] : NaN, g = LAND_Y + rise(o.x, o.z) + ON_GROUND;
  // a deck never sinks below the ground (bridges over hill streams are mapped as bridges too)
  o.y = ya === ya ? Math.max(g, ya + (path.yb[seg] - ya) * t) : g;
  return o;
}

// Join polylines whose ends meet into longer paths, preferring the straightest continuation.
// lines: [{ pts, h, len, c }] where h is the deck height of the whole line (NaN on the ground).
function chain(lines, tol, canJoin) {
  const cell = (v) => Math.round(v / tol);
  const grid = new Map();
  const endOf = (l, e) => (e ? l.pts[l.pts.length - 1] : l.pts[0]);
  lines.forEach((l, i) => {
    for (let e = 0; e < 2; e++) {
      const p = endOf(l, e), k = cell(p[0]) + ',' + cell(p[1]);
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(i * 2 + e);
    }
  });
  const used = new Uint8Array(lines.length);
  const order = lines.map((_, i) => i).sort((a, b) => lines[b].len - lines[a].len);
  const out = [];
  for (const i0 of order) {
    if (used[i0]) continue;
    used[i0] = 1;
    let seq = [{ i: i0, rev: false }];
    for (let pass = 0; pass < 2; pass++) {
      for (;;) {
        const last = seq[seq.length - 1], Q = lines[last.i].pts, n = Q.length;
        const tail = last.rev ? Q[0] : Q[n - 1], prev = last.rev ? Q[1] : Q[n - 2];
        const dl = Math.hypot(tail[0] - prev[0], tail[1] - prev[1]) || 1;
        const Dx = (tail[0] - prev[0]) / dl, Dz = (tail[1] - prev[1]) / dl;
        let best = null, bs = 0.25;
        const gx = cell(tail[0]), gz = cell(tail[1]);
        for (let ox = -1; ox <= 1; ox++) for (let oz = -1; oz <= 1; oz++) {
          const list = grid.get(gx + ox + ',' + (gz + oz));
          if (!list) continue;
          for (const code of list) {
            const i = code >> 1, e = code & 1;
            if (used[i] || !canJoin(lines[i0], lines[i])) continue;
            const R = lines[i].pts, m = R.length, q0 = e ? R[m - 1] : R[0], q1 = e ? R[m - 2] : R[1];
            if (Math.hypot(q0[0] - tail[0], q0[1] - tail[1]) > tol) continue;
            const ql = Math.hypot(q1[0] - q0[0], q1[1] - q0[1]) || 1;
            const sc = (Dx * (q1[0] - q0[0]) + Dz * (q1[1] - q0[1])) / ql;
            if (sc > bs) { bs = sc; best = { i, rev: e === 1 }; }
          }
        }
        if (!best) break;
        used[best.i] = 1;
        seq.push(best);
      }
      if (pass === 0) seq = seq.reverse().map((s) => ({ i: s.i, rev: !s.rev }));
    }
    const pts = [], hs = [];
    for (const s of seq) {
      const Q = lines[s.i].pts, n = Q.length;
      for (let k = 0; k < n; k++) {
        const p = s.rev ? Q[n - 1 - k] : Q[k];
        if (pts.length) {
          const l = pts[pts.length - 1];
          if (Math.hypot(p[0] - l[0], p[1] - l[1]) < (k === 0 ? tol + 0.01 : 0.05)) continue;
        }
        pts.push(p);
        hs.push(lines[s.i].hs ? lines[s.i].hs[s.rev ? n - 1 - k : k] : lines[s.i].h);
      }
    }
    if (pts.length < 2) continue;
    // segment i runs from height ya[i] to yb[i]; across a humped deck that follows its curve, while a segment
    // leaving a bridge for the road keeps to the ground as before
    const yb = Float32Array.from(hs), ya = Float32Array.from(hs, (h, i) => (i && h === h && hs[i - 1] === hs[i - 1] ? hs[i - 1] : h));
    const path = mkPath(pts, ya, yb);
    path.c = lines[i0].c;
    out.push(path);
  }
  return out;
}

// Cut a polyline into the runs that satisfy keep(x, z), sampled every `step` metres.
function clipRuns(pts, keep, step, minLen) {
  const runs = [];
  let cur = [];
  const flush = () => { if (cur.length >= 2 && pathLength(cur) >= minLen) runs.push(cur); cur = []; };
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = i === 0 ? 0 : 1; k <= n; k++) {
      const x = a[0] + ((b[0] - a[0]) * k) / n, z = a[1] + ((b[1] - a[1]) * k) / n;
      if (keep(x, z)) cur.push([x, z]); else flush();
    }
  }
  flush();
  return runs;
}

// Dry land: inside a land polygon, outside its holes and outside every pond. Without land data, everywhere is land.
function landTest(data) {
  const polys = [];
  for (const poly of data.land || []) {
    if (!Array.isArray(poly) || !poly.length) continue;
    const rings = poly.map(unflat);
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const p of rings[0]) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
    polys.push({ rings, x0, x1, z0, z1 });
  }
  const ponds = [];
  for (const poly of data.ponds || []) if (Array.isArray(poly) && poly[0]) ponds.push(unflat(poly[0]));
  if (!polys.length) return () => true;
  return (x, z) => {
    let on = false;
    for (const p of polys) {
      if (x < p.x0 || x > p.x1 || z < p.z0 || z > p.z1) continue;
      if (inRing(x, z, p.rings[0]) && !p.rings.slice(1).some((h) => inRing(x, z, h))) { on = true; break; }
    }
    return on && !ponds.some((r) => inRing(x, z, r));
  };
}

function placeById(data) {
  const m = new Map();
  for (const p of data.places || []) if (p && p.id && Number.isFinite(p.x) && Number.isFinite(p.z)) m.set(p.id, [p.x / 10, p.z / 10]);
  return m;
}

// Cầu Trường Tiền's deck, rebuilt from the same numbers as landmarks/truongtien.js (deck top 6.4 m above the river,
// 34 m ramps at each end, walkways cantilevered outside the trusses).
function truongTienFrame(data) {
  const tt = data.truongtien;
  if (!tt || !tt.a || !tt.b || !tt.box || !tt.box.c) return null;
  const a = [tt.a[0] / 10, tt.a[1] / 10], b = [tt.b[0] / 10, tt.b[1] / 10];
  const dl = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (!(dl > 1)) return null;
  const d = [(b[0] - a[0]) / dl, (b[1] - a[1]) / dl], n = [-d[1], d[0]];
  const c = [tt.box.c[0] / 10, tt.box.c[1] / 10], L = tt.box.w / 10, W = tt.box.d / 10;
  const deckTop = 6.4, trussX = W / 2 - 2.35;
  const at = (s, off) => [c[0] + d[0] * s + n[0] * off, c[1] + d[1] * s + n[1] * off];
  // a path along the bridge at lateral offset `off`, `dy` above the deck, down the ramps to `reach` metres beyond the deck
  const lane = (off, dy, reach = 33) => {
    const y0 = deckTop + (LAND_Y + 0.08 - deckTop) * (reach / 34);
    const pts = [at(-L / 2 - reach, off), at(-L / 2, off), at(L / 2, off), at(L / 2 + reach, off)];
    const ya = Float32Array.from([NaN, y0 + 0.04, deckTop + dy, deckTop + 0.04]);
    const yb = Float32Array.from([NaN, deckTop + 0.04, deckTop + dy, y0 + 0.04]);
    return mkPath(pts, ya, yb);
  };
  return { L, W, d, n, c, deckTop, trussX, walkOff: trussX + (W / 2 - trussX) / 2, lane };
}

const tmp = { x: 0, y: 0, z: 0, dx: 1, dz: 0 };

// ---------- the era switcher (era.js): who is on the street in 1885, 1935 and today ----------
//
// Historical fact:
//  - 1885: no railway (the line and Ga Huế came in 1908), no cầu Trường Tiền (1899), no Quốc Học (1896), no
//    French quarter on the south bank (Phố Tây, Nguyễn Đình Chiểu); no motor vehicles and no electric street
//    lighting. People went on foot; dignitaries were carried in palanquins (võng, kiệu) and goods went by ox- or
//    hand-cart. The nón lá was near-universal headwear and everyday clothes were undyed, brown, black and indigo.
//  - 1935: the train ran (steam, black locomotives); Trường Tiền was the only bridge over the Hương; the
//    hand-pulled rickshaw (xe kéo) was the common hired vehicle, the pedalled xích lô was only just appearing in
//    Indochina (late 1930s); bicycles were common, private cars few (dark colours of the period); there were no
//    motorbikes or city buses to speak of. Electric street lighting existed but only on the main central streets.
//  - The other bridges over the main river (Phú Xuân, Dã Viên, ...) are post-1950s.
// Illustrative: every number (a third of today's riders become rickshaws, one in eight cars survives, a third of
// the lamp posts, ~90 % nón lá, the shares of áo dài), the colours, the palanquins/ox-carts drawn with the cyclo
// mesh, the bicycles drawn with the motorbike mesh, which pedestrian hotspots are kept in 1885, and the rule used
// for missing bridges (any road-bridge run longer than 250 m is absent before today; Trường Tiền's deck before 1935).
// Agents whose route crosses an absent bridge keep to the bridge-free stretch of it that they are on.
const LONG_BRIDGE = 250;
// Arc-length ranges [a, b] of a chained path that lie on a road-bridge run longer than LONG_BRIDGE metres.
function longBridgeRuns(path) {
  const runs = [], ya = path.ya, n = path.acc.length;
  if (!ya) return runs;
  let st = -1;
  for (let i = 1; i <= n; i++) {
    const b = i < n && ya[i] === ya[i];
    if (b && st < 0) st = i;
    else if (!b && st >= 0) { const a = path.acc[st - 1], e = path.acc[i - 1]; if (e - a > LONG_BRIDGE) runs.push([a, e]); st = -1; }
  }
  return runs;
}
// The stretch of [s0, s1] clear of `runs` (padded) that contains s, else the longest; null if under minLen.
function freeRange(s0, s1, s, runs, pad = 15, minLen = 40) {
  if (!runs.length) return [s0, s1];
  const pieces = [];
  let a = s0;
  for (const [ra, rb] of runs) {
    if (rb + pad <= a || ra - pad >= s1) continue;
    if (ra - pad > a) pieces.push([a, ra - pad]);
    a = Math.max(a, rb + pad);
  }
  if (a < s1) pieces.push([a, s1]);
  let best = null;
  for (const p of pieces) if (p[1] - p[0] >= minLen) {
    if (s >= p[0] && s <= p[1]) return p;
    if (!best || p[1] - p[0] > best[1] - best[0]) best = p;
  }
  return best;
}

// ---------- traffic ----------

// Motorbikes, cars, buses and cyclos on the main streets — Huế moves on two wheels.
// Real: the routes are the OSM class 0–2 streets (and their bridges, crossed at deck height), joined end to end;
// Trường Tiền's carriageway is driven at its own deck height. Illustrative: the vehicles, their mix and speeds.
export function buildTraffic(data, group) {
  const rnd = rng(1899);
  const roads = readRoads(data);
  const profiles = bridgeProfiles(data);
  const lines = roads.filter((r) => r.c <= 2 && r.len > 1).map((r) => {
    const P = r.bridge && profiles.get(r.flat);
    if (!P || !(P.rise > 0)) return { pts: r.pts, len: r.len, c: r.c, h: r.bridge ? BRIDGE_TOP + 0.02 : NaN };
    // a humped deck: points close enough together to ride its curve
    const R = resample(r.pts, 2);
    return { pts: R.pts, len: r.len, c: r.c, h: BRIDGE_TOP + 0.02, hs: R.s.map((s) => Math.max(BRIDGE_TOP, P.base(s)) + P.bump(s) + 0.02) };
  });
  const paths = chain(lines, 1.5, (a, b) => Math.abs(a.c - b.c) <= 1).filter((p) => p.len > 160);
  const tt = truongTienFrame(data);
  if (!paths.length && !tt) return { update() {} };
  const places = placeById(data);

  const low = quality.low;
  const N = low ? 250 : 700;
  const nBus = low ? 4 : 12, nCyclo = low ? 6 : 18, nTT = tt ? (low ? 14 : 40) : 0;
  const nRest = N - nBus - nCyclo - nTT;

  // busier towards the centre, as the real city is
  const weightOf = (p) => { const m = p.pts[p.pts.length >> 1]; return p.len * (1 + 2.5 * Math.exp(-Math.hypot(m[0], m[1]) / 1800)); };
  const picker = (list, w) => {
    const cum = []; let t = 0;
    for (const p of list) { t += w(p); cum.push(t); }
    return () => { const r = rnd() * t; let lo = 0, hi = cum.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < r) lo = mid + 1; else hi = mid; } return list[lo]; };
  };
  const V = [];
  const add = (kind, path, s0, s1, speed, lane, T, k = null) => {
    const dir = rnd() < 0.5 ? 1 : -1;
    V.push({ kind, path, s0, s1, s: s0 + rnd() * (s1 - s0), dir, speed, lane, off: dir * lane, turn: 0, T, seg: 1, k, mesh: null, i: 0 });
  };
  if (paths.length) {
    const pick = picker(paths, weightOf);
    for (let i = 0; i < nRest; i++) {
      const p = pick(), wide = p.c === 0;
      if (rnd() < 0.14) add('car', p, 0, p.len, 7 + rnd() * 4, 2.6 + rnd() * (wide ? 2.2 : 1.0), 2.2);
      else add('bike', p, 0, p.len, 5.5 + rnd() * 5, 1.6 + rnd() * (wide ? 2.4 : 1.0), 1.2);
    }
    // city buses on the widest roads
    const trunk = paths.filter((p) => p.c === 0 && p.len > 400);
    if (trunk.length) {
      const pickT = picker(trunk, (p) => p.len);
      for (let i = 0; i < nBus; i++) { const p = pickT(); add('bus', p, 0, p.len, 6 + rnd() * 2.5, 3.3 + rnd() * 0.8, 3.2, [2.7, 2.0, 1.4]); }
    }
    // xích lô work the Citadel, the market and the visitors' streets: each keeps to the stretch of its route near one of them
    const hubs = ['kydai', 'ngomon', 'dongba', 'photay', 'ndchieu'].map((id) => places.get(id)).filter(Boolean);
    const spans = [];
    for (const p of paths) {
      let a = Infinity, b = -Infinity;
      p.pts.forEach((q, j) => { if (hubs.some((h) => Math.hypot(q[0] - h[0], q[1] - h[1]) < 450)) { a = Math.min(a, p.acc[j]); b = Math.max(b, p.acc[j]); } });
      if (b - a > 80) spans.push({ p, a, b });
    }
    if (spans.length) {
      const pickS = picker(spans, (s) => s.b - s.a);
      for (let i = 0; i < nCyclo; i++) { const s = pickS(); add('cyclo', s.p, s.a, s.b, 2.2 + rnd() * 1.4, 1.5 + rnd() * 1.4, 2.0); }
    }
  }
  // Trường Tiền: motorbikes and bicycles only, between the trusses
  let ttPath = null;
  if (tt) {
    const p = (ttPath = tt.lane(0, 0.04));
    for (let i = 0; i < nTT; i++) add('bike', p, 0, p.len, 4 + rnd() * 4, 0.9 + rnd() * Math.max(0.3, tt.trussX - 1.3), 1.2);
  }

  // ---- era roles (see the note above longBridgeRuns); a separate generator keeps today exactly as it was
  const er = rng(1885);
  // 1885 only: palanquins and ox-carts on the streets around the Citadel's south front
  if (paths.length) {
    const hubs = ['kydai', 'ngomon', 'phuvanlau'].map((id) => places.get(id)).filter(Boolean);
    const spans = [];
    for (const p of paths) {
      let a = Infinity, b = -Infinity;
      p.pts.forEach((q, j) => { if (hubs.some((h) => Math.hypot(q[0] - h[0], q[1] - h[1]) < 500)) { a = Math.min(a, p.acc[j]); b = Math.max(b, p.acc[j]); } });
      if (b - a > 80) spans.push({ p, a, b });
    }
    const nPal = spans.length ? (low ? 6 : 12) : 0;
    for (let i = 0; i < nPal; i++) {
      const s = spans[Math.floor(er() * spans.length)];
      V.push({ kind: 'palanquin', path: s.p, s0: s.a, s1: s.b, s: s.a + er() * (s.b - s.a), dir: er() < 0.5 ? 1 : -1, speed: 0.9 + er() * 0.5, lane: 1.4 + er() * 1.2, off: 0, turn: 0, T: 2.4, seg: 1, k: null, mesh: null, i: 0 });
    }
  }
  const OLD = {
    bicycle: ['#e8e4da', '#6e4b3a', '#33415e', '#2a2a2e', '#d9cdb4'].map(hex),
    oldcar: ['#1c1c1e', '#24402f', '#5a1f24', '#1c1c1e'].map(hex),
    rickshaw: ['#1e1e20', '#3a2a22', '#5a1f24', '#2d2d33'].map(hex),
    palanquin: ['#8a2a20', '#6b4a2e', '#a8832e', '#6b4a2e'].map(hex),
  };
  const OLDCAR_K = [0.92, 1.08, 0.95], PAL_K = [1.15, 0.95, 1.1];
  const cnt = { bike: 0, car: 0, cyclo: 0 };
  for (let j = 0; j < V.length; j++) {
    const v = V[j], base = [v.s0, v.s1];
    v.roles = [null, null, null]; v.sp = [v.speed, v.speed, v.speed]; v.ks = [v.k, v.k, v.k]; v.pal = [null, null, null];
    if (v.kind === 'palanquin') { v.roles[0] = 'palanquin'; v.ks[0] = PAL_K; v.pal[0] = OLD.palanquin[j % 4]; }
    else if (v.kind === 'bike') {
      v.roles[2] = 'bike';
      const r = cnt.bike++ % 6;
      if (r === 0 || r === 3) { v.roles[1] = 'rickshaw'; v.sp[1] = 1.8 + er() * 1.3; v.pal[1] = OLD.rickshaw[r % 4]; }
      else if (r === 1) { v.roles[1] = 'bicycle'; v.sp[1] = 3 + er() * 1.6; v.pal[1] = OLD.bicycle[Math.floor(er() * 5)]; }
    } else if (v.kind === 'car') {
      v.roles[2] = 'car';
      if (cnt.car++ % 8 === 0) { v.roles[1] = 'oldcar'; v.sp[1] = v.speed * 0.7; v.ks[1] = OLDCAR_K; v.pal[1] = OLD.oldcar[Math.floor(er() * 4)]; }
    } else if (v.kind === 'bus') v.roles[2] = 'bus';
    else if (v.kind === 'cyclo') { v.roles[2] = 'cyclo'; v.roles[1] = 'rickshaw'; v.sp[1] = Math.min(v.speed, 1.8 + er() * 1.3); v.pal[1] = OLD.rickshaw[cnt.cyclo++ % 4]; }
    // where each may go: the deck of Trường Tiền exists from 1935, long road bridges only today
    v.rng = [base, base, base];
    if (v.path === ttPath) v.rng[0] = null;
    else {
      const runs = v.path.lbr || (v.path.lbr = longBridgeRuns(v.path));
      v.rng[0] = v.rng[1] = freeRange(v.s0, v.s1, v.s, runs);
    }
  }

  // geometry, +x forward
  const W = [1, 1, 1];
  const bikeGeo = new Buf(24); // machine and rider: 20 triangles
  bikeGeo.box(0, 0, 0.25, 0.85, 1.7, 0.42, 0, [0.45, 0.45, 0.45]);
  bikeGeo.box(-0.12, 0, 0.85, 1.72, 0.5, 0.46, 0, W, { taper: 0.6 });
  const carGeo = new Buf(24); // body and cabin: 20 triangles; a bus is the same shape scaled up
  carGeo.box(0, 0, 0.3, 0.95, 4.2, 1.75, 0, W);
  carGeo.box(-0.2, 0, 0.95, 1.5, 2.3, 1.6, 0, [0.42, 0.5, 0.56], { taper: 0.86 });
  const cycloGeo = new Buf(48); // passenger seat in front, driver pedalling behind: 40 triangles
  cycloGeo.box(0.55, 0, 0.35, 0.95, 0.9, 0.95, 0, W);
  cycloGeo.box(0.5, 0, 0.95, 1.5, 0.45, 0.5, 0, [0.95, 0.88, 0.78], { taper: 0.7 });
  cycloGeo.box(-0.45, 0, 0.3, 0.72, 1.1, 0.22, 0, [0.35, 0.35, 0.35]);
  cycloGeo.box(-0.8, 0, 0.72, 1.72, 0.42, 0.42, 0, [0.8, 0.75, 0.68], { taper: 0.65 });
  const mat = cityMaterial();
  const cols = {
    bike: ['#b3352b', '#2f4f7a', '#2a2a2e', '#e8e4da', '#d6a12e', '#3f7a5a', '#7a3f5a'].map(hex),
    car: ['#eeeae2', '#c9c9c6', '#2e3338', '#2f8a5a', '#8a2f2c', '#3f5f8a'].map(hex),
    bus: ['#e2b43c', '#2f7f9e', '#d9dcd6'].map(hex),
    cyclo: ['#3f6b5a', '#7a3a34', '#33415e', '#c8a24a'].map(hex),
  };
  const c = new THREE.Color();
  // which mesh draws each role; today's colours are picked exactly as before (by index within the mesh)
  const MESH_OF = { bike: 0, bicycle: 0, car: 1, bus: 1, oldcar: 1, cyclo: 2, rickshaw: 2, palanquin: 2 };
  const todayIdx = [0, 0, 0];
  for (const v of V) if (v.roles[2]) { const mi = MESH_OF[v.roles[2]], pal = cols[v.kind], i = todayIdx[mi]++; v.pal[2] = pal[i % pal.length]; }
  const cap = [0, 0, 0];
  for (let e = 0; e < 3; e++) {
    const n = [0, 0, 0];
    for (const v of V) if (v.roles[e] && v.rng[e]) n[MESH_OF[v.roles[e]]]++;
    for (let k = 0; k < 3; k++) cap[k] = Math.max(cap[k], n[k]);
  }
  const make = (geo, n) => {
    const mesh = new THREE.InstancedMesh(geo.geometry(), mat, Math.max(1, n));
    mesh.count = 0;
    mesh.castShadow = !quality.low;
    mesh.frustumCulled = false;
    mesh.layers.set(1);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(mesh);
    return mesh;
  };
  const meshes = [make(bikeGeo, cap[0]), make(carGeo, cap[1]), make(cycloGeo, cap[2])];

  // the agents on the street in the current era, packed at the front of each mesh (mesh.count = how many)
  const act = [];
  function apply(e) {
    act.length = 0;
    const n = [0, 0, 0];
    for (const v of V) {
      const role = v.roles[e], r = v.rng[e];
      if (!role || !r) continue;
      const mi = MESH_OF[role];
      v.mesh = meshes[mi]; v.i = n[mi]++;
      v.mesh.setColorAt(v.i, enc(v.pal[e], c));
      v.speed = v.sp[e]; v.k = v.ks[e];
      v.s0 = r[0]; v.s1 = r[1];
      if (v.s < v.s0) v.s = v.s0; else if (v.s > v.s1) v.s = v.s1;
      act.push(v);
    }
    meshes.forEach((mesh, k) => {
      mesh.count = n[k];
      mesh.visible = n[k] > 0;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
    update(0);
  }

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  function update(dt) {
    dt = Math.min(dt, 0.1);
    for (let i = 0; i < act.length; i++) {
      const v = act[i];
      if (v.turn > 0) v.turn = Math.max(0, v.turn - dt); // a slow U-turn at the end of the route, not a jump
      else {
        v.s += v.dir * v.speed * dt;
        if (v.s > v.s1) { v.s = v.s1; v.dir = -1; v.turn = v.T; } else if (v.s < v.s0) { v.s = v.s0; v.dir = 1; v.turn = v.T; }
      }
      // drift across to the right-hand lane for the current direction
      const want = v.dir * v.lane - v.off, mx = 2.5 * dt;
      v.off += want > mx ? mx : want < -mx ? -mx : want;
      v.seg = seek(v.path, v.s, v.seg);
      place(v.path, v.s, v.seg, v.off, tmp);
      const yaw = Math.atan2(-tmp.dz * v.dir, tmp.dx * v.dir) + (v.turn > 0 ? (Math.PI * v.turn) / v.T : 0);
      q.setFromAxisAngle(up, yaw);
      p.set(tmp.x, tmp.y, tmp.z);
      if (v.k) sc.set(v.k[0], v.k[1], v.k[2]); else sc.set(1, 1, 1);
      v.mesh.setMatrixAt(v.i, m.compose(p, q, sc));
    }
    for (const mesh of meshes) if (mesh.visible) mesh.instanceMatrix.needsUpdate = true;
  }
  apply(era.value);
  onEra(apply);
  return { update };
}

// ---------- street lamps, pedestrians, the train ----------

export function buildStreetLife(data, group) {
  const updates = [];
  const parts = [buildLampPosts, buildPedestrians, buildTrain];
  for (const build of parts) {
    try {
      const u = build(data, group);
      if (u) updates.push(u);
    } catch (e) {
      console.warn('street life: skipped', build.name, e); // one missing data field should not take the city down
    }
  }
  return { update(dt, time) { dt = Math.min(dt, 0.1); for (const u of updates) u(dt, time); } };
}

// Lamp posts. Real: each stands where geo/city.js puts a night-time glow (every 30–36 m along OSM class 0–2
// streets, alternating sides), so the glow sits in the lantern. Illustrative: the post design.
// To stay inside the triangle budget only the posts nearest the centre and the Citadel are built
// (LAMP_MAX); glows further out keep shining without a post.
const LAMP_MAX = () => (quality.low ? 800 : 3000);
function buildLampPosts(data, group) {
  const roads = readRoads(data);
  const profiles = bridgeProfiles(data);
  const kd = placeById(data).get('kydai') || [0, 0];
  const ARM = 0.9; // pole stands this far behind the lantern, away from the carriageway
  const spots = [];
  for (const r of roads) {
    if (r.c > 2 || r.pts.length < 2) continue;
    const step = r.c === 0 ? 30 : 36;
    for (let s = step / 2, k = 0; s < r.len; s += step, k++) {
      const { p, a } = along(r.pts, s);
      const side = k % 2 ? 1 : -1, off = (ROAD_W[r.c] / 2 + 0.5) * side;
      const lx = p[0] - Math.sin(a) * off, lz = p[1] + Math.cos(a) * off;
      const P = r.bridge && profiles.get(r.flat), up = P ? P.bump(s) : 0; // on a humped deck the post rides the curve
      const glowY = LAND_Y + rise(lx, lz) + (r.bridge ? 8 + up : 7.5);
      const baseY = r.bridge ? Math.max(BRIDGE_TOP, LAND_Y + rise(lx, lz)) + up : LAND_Y + rise(lx, lz);
      const ox = -Math.sin(a) * side, oz = Math.cos(a) * side; // outward, away from the road
      const far = Math.min(Math.hypot(lx, lz), Math.hypot(lx - kd[0], lz - kd[1]));
      spots.push([lx, lz, baseY, (glowY - baseY) / 7.5, Math.atan2(-oz, ox), far, r.bridge && r.len > LONG_BRIDGE]);
    }
  }
  if (!spots.length) return null;
  spots.sort((a, b) => a[5] - b[5]);
  if (spots.length > LAMP_MAX()) spots.length = LAMP_MAX();
  // 1935: only the third nearest the centre (and none on bridges not yet built), packed at the front
  const n1 = Math.round(spots.length / 3);
  let k1 = 0;
  for (let i = 0; i < spots.length && k1 < n1; i++) if (!spots[i][6]) { const t = spots[i]; spots.splice(i, 1); spots.splice(k1++, 0, t); }
  // 14 triangles: three-sided pole, a ridged arm, an inverted lantern whose centre is 7.5 m up
  const geo = new Buf(16);
  const dark = hex('#3a4641'), glass = hex('#f2e6c4');
  geo.cyl(ARM, 0, 0, 7.8, 0.11, 0.06, 3, dark, { cap: false });
  geo.quad([ARM, 7.85, 0], [-0.05, 7.8, 0], [-0.05, 7.7, -0.07], [ARM, 7.75, -0.07], dark, [0, 1, -1]);
  geo.quad([ARM, 7.85, 0], [-0.05, 7.8, 0], [-0.05, 7.7, 0.07], [ARM, 7.75, 0.07], dark, [0, 1, 1]);
  const ring = [0, 1, 2].map((k) => [Math.cos((k * 2 * Math.PI) / 3) * 0.27, 7.7, Math.sin((k * 2 * Math.PI) / 3) * 0.27]);
  for (let k = 0; k < 3; k++) {
    const a = ring[k], b = ring[(k + 1) % 3];
    geo.tri(a, b, [0, 7.28, 0], glass, [a[0] + b[0], -0.4, a[2] + b[2]]);
  }
  geo.tri(ring[0], ring[1], ring[2], dark, [0, 1, 0]);
  const mesh = new THREE.InstancedMesh(geo.geometry(), cityMaterial(), spots.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  spots.forEach(([x, z, y, k, yaw], i) => {
    q.setFromAxisAngle(up, yaw); p.set(x, y, z); s.set(1, k, 1);
    mesh.setMatrixAt(i, m.compose(p, q, s));
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = !quality.low;
  mesh.layers.set(1);
  group.add(mesh);
  const apply = (e) => { mesh.count = e >= 2 ? spots.length : e === 1 ? k1 : 0; mesh.visible = mesh.count > 0; };
  apply(era.value);
  onEra(apply);
  return null;
}

// Pedestrians. Real: where they walk — the OSM streets around Phố đi bộ Nguyễn Đình Chiểu, chợ Đông Ba, Phố Tây,
// the Ngọ Môn square, Phu Văn Lâu, Ga Huế and Quốc Học, the walkways of Trường Tiền, and the pavements of the
// central class 0–2 streets. Illustrative: the people, their numbers, clothes (áo dài, nón lá) and the short
// straight promenades laid where no mapped street fits.
function buildPedestrians(data, group) {
  const rnd = rng(1945);
  const roads = readRoads(data).filter((r) => !r.bridge && r.pts.length >= 2);
  const places = placeById(data);
  const onLand = landTest(data);
  const tt = truongTienFrame(data);
  const N = quality.low ? 300 : 900;

  // a pedestrian path keeps how far from its centreline people walk
  const roadPath = (pts, c) => {
    const p = mkPath(pts);
    if (c <= 2) { p.pav = ROAD_W[c] / 2 + 1.5; p.half = 0.4; } // on the pavements
    else { p.pav = 0; p.half = Math.max(0.3, ROAD_W[c] / 2 - 0.4); } // lanes and walking streets: anywhere across
    return p;
  };
  const freePath = (pts, half = 2.5) => { const p = mkPath(pts); p.pav = 0; p.half = half; return p; };
  const roadsNear = (cx, cz, r, maxC = 5) => {
    const out = [], r2 = r * r;
    for (const rd of roads) {
      if (rd.c > maxC || rd.x1 < cx - r || rd.x0 > cx + r || rd.z1 < cz - r || rd.z0 > cz + r) continue;
      for (const run of clipRuns(rd.pts, (x, z) => (x - cx) ** 2 + (z - cz) ** 2 < r2, 5, 14)) out.push(roadPath(run, rd.c));
    }
    return out;
  };
  // a straight promenade through (cx, cz) along (ux, uz), kept to dry land
  const promenade = (cx, cz, ux, uz, half, width = 2.5) => {
    const runs = clipRuns([[cx - ux * half, cz - uz * half], [cx + ux * half, cz + uz * half]], onLand, 4, 20);
    return runs.map((r) => freePath(r, width));
  };
  // the city grid around the river runs roughly along / across Trường Tiền
  const gx = tt ? tt.d : [0.73, 0.68], gn = tt ? tt.n : [-0.68, 0.73];

  const spots = []; // { paths, share, aodai }
  const P = (id) => places.get(id);
  if (P('ndchieu')) {
    const [x, z] = P('ndchieu');
    const paths = roadsNear(x, z, 220);
    // the riverside promenade: along the river (across the bridge axis), nudged toward the water if it is close
    let ox = 0, oz = 0;
    for (const sgn of [1, -1]) if (!onLand(x + gx[0] * 40 * sgn, z + gx[1] * 40 * sgn) && onLand(x + gx[0] * 12 * sgn, z + gx[1] * 12 * sgn)) { ox = gx[0] * 12 * sgn; oz = gx[1] * 12 * sgn; break; }
    paths.push(...promenade(x + ox, z + oz, gn[0], gn[1], 200, 3));
    spots.push({ paths, share: 0.17, aodai: 0.3, since: 1 });
  }
  if (tt) spots.push({ paths: [-1, 1].map((sd) => { const p = tt.lane(sd * tt.walkOff, 0.12); p.pav = 0; p.half = 0.5; return p; }), share: 0.07, aodai: 0.3, noGroups: true, since: 1 });
  if (P('dongba')) spots.push({ paths: roadsNear(...P('dongba'), 170), share: 0.14, aodai: 0.15, since: 0 });
  if (P('photay')) spots.push({ paths: roadsNear(...P('photay'), 200), share: 0.15, aodai: 0.08, since: 1 });
  if (P('kydai') && P('ngomon')) {
    // the esplanade between Kỳ Đài and Ngọ Môn: three walks along it and one across
    const [ax, az] = P('kydai'), [bx, bz] = P('ngomon');
    const dl = Math.hypot(bx - ax, bz - az) || 1, ux = (bx - ax) / dl, uz = (bz - az) / dl;
    const cx = (ax + bx) / 2, cz = (az + bz) / 2;
    const paths = roadsNear(cx, cz, dl * 0.6, 3);
    for (const o of [-28, 0, 28]) paths.push(...promenade(cx - uz * o, cz + ux * o, ux, uz, dl * 0.34, 4));
    paths.push(...promenade(cx, cz, -uz, ux, 45, 4));
    spots.push({ paths, share: 0.12, aodai: 0.35, since: 0 });
  }
  if (P('phuvanlau')) {
    // the river bank in front of the Citadel, Phu Văn Lâu to Nghênh Lương Đình
    const [ax, az] = P('phuvanlau');
    const paths = roadsNear(ax, az, 130, 3);
    if (P('nghenhluong')) {
      const [bx, bz] = P('nghenhluong'), dl = Math.hypot(bx - ax, bz - az) || 1;
      paths.push(...promenade((ax + bx) / 2, (az + bz) / 2, (bx - ax) / dl, (bz - az) / dl, dl / 2 + 90, 3));
    }
    spots.push({ paths, share: 0.05, aodai: 0.3, since: 0 });
  }
  if (P('gahue')) spots.push({ paths: roadsNear(...P('gahue'), 110), share: 0.03, aodai: 0.1, since: 1 });
  if (P('quochoc')) spots.push({ paths: roadsNear(...P('quochoc'), 110), share: 0.03, aodai: 0.6, since: 1 }); // students in white áo dài
  // thinner along the pavements of the main streets in the centre and the Citadel
  const ctr = [[0, 0, 1500]];
  if (P('kydai')) ctr.push([P('kydai')[0], P('kydai')[1] - 300, 1000]);
  const pave = [];
  // in 1885 only the pavements inside the Citadel are walked (the outer ring of the largest mapped wall)
  let cit = null;
  for (const poly of data.wall || []) if (Array.isArray(poly) && Array.isArray(poly[0]) && (!cit || poly[0].length > cit.length * 2)) cit = unflat(poly[0]);
  for (const rd of roads) {
    if (rd.c > 2) continue;
    for (const run of clipRuns(rd.pts, (x, z) => ctr.some(([cx, cz, r]) => (x - cx) ** 2 + (z - cz) ** 2 < r * r), 8, 30)) {
      const p = roadPath(run, rd.c), mid = run[run.length >> 1];
      p.since = cit && inRing(mid[0], mid[1], cit) ? 0 : 1;
      pave.push(p);
    }
  }
  spots.push({ paths: pave, share: 0.24, aodai: 0.12 });

  const live = spots.filter((s) => s.paths.length && s.paths.some((p) => p.len > 1));
  if (!live.length) return null;
  const shareSum = live.reduce((t, s) => t + s.share, 0);

  const AODAI = ['#f6f3ec', '#f6f3ec', '#7b4a9e', '#9566b8', '#b5cfe5', '#e6d6ee'].map(hex); // white, Huế violet, pale blue
  const EVERY = ['#2f3e5a', '#b8392f', '#e3d7bc', '#55744a', '#38383c', '#d48a3a', '#8fb1c8', '#efebe3', '#6e4b3a', '#c7c2b6', '#4d6a8a'].map(hex);
  const people = []; // { path, s, dir, lat, speed, phase, turn, wait, go, seg, aodai, hat, still, x, y, z, yaw }
  for (const spot of live) {
    const n = Math.round((N * spot.share) / shareSum);
    const paths = spot.paths.filter((p) => p.len > 1);
    const cum = []; let tot = 0;
    for (const p of paths) { tot += p.len; cum.push(tot); }
    const pick = () => { const r = rnd() * tot; for (let i = 0; i < cum.length; i++) if (r <= cum[i]) return paths[i]; return paths[paths.length - 1]; };
    const lateral = (p) => (p.pav ? (rnd() < 0.5 ? -1 : 1) * (p.pav + (rnd() - 0.5) * 2 * p.half) : (rnd() * 2 - 1) * p.half);
    const dress = () => { const aodai = rnd() < spot.aodai; return { aodai, hat: rnd() < (aodai ? 0.65 : 0.3) }; };
    let left = n;
    // a few stand about in small groups — chatting outside a shop, waiting to cross
    if (!spot.noGroups) {
      let still = Math.round(n * 0.12);
      while (still >= 3) {
        const k = Math.min(still, 3 + Math.floor(rnd() * 3));
        const p = pick(), s = rnd() * p.len, seg = seek(p, s, 1);
        place(p, s, seg, lateral(p), tmp);
        const cx = tmp.x, cz = tmp.z;
        for (let j = 0; j < k; j++) {
          const a = (j / k) * Math.PI * 2 + rnd() * 0.5, r = 0.55 + rnd() * 0.25;
          const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
          people.push({ still: true, x, z, y: LAND_Y + rise(x, z) + ON_GROUND, yaw: Math.atan2(Math.sin(a), -Math.cos(a)), since: spot.since ?? p.since ?? 0, ...dress() });
        }
        still -= k; left -= k;
      }
    }
    for (let i = 0; i < left; i++) {
      const p = pick();
      people.push({ still: false, path: p, s: rnd() * p.len, dir: rnd() < 0.5 ? 1 : -1, lat: lateral(p), speed: 0.9 + rnd() * 0.7, phase: rnd() * 6.28, turn: 0, wait: 0, go: 20 + rnd() * 120, seg: 1, since: spot.since ?? p.since ?? 0, ...dress() });
    }
  }
  if (!people.length) return null;

  // a person, feet at 0, about 1.8 m to the hat tip; body and head are separate meshes so clothes can be
  // coloured per person without tinting faces
  const body = new Buf(20); // 16 triangles: legs (or the lower áo dài panels) and a torso tapering to the neck
  body.cyl(0, 0, 0, 0.8, 0.1, 0.16, 4, [0.72, 0.72, 0.72], { cap: false, rot: Math.PI / 4 });
  body.cyl(0, 0, 0.8, 1.45, 0.17, 0.1, 4, [1, 1, 1], { cap: false, rot: Math.PI / 4 });
  const skin = hex('#c99a74'), straw = hex('#e4d6a8'), hair = hex('#1e1917');
  const hatHead = new Buf(16); // 14 triangles: head and a conical nón lá
  hatHead.cyl(0, 0, 1.43, 1.64, 0.1, 0.095, 4, skin, { cap: false, rot: Math.PI / 4 });
  hatHead.cyl(0, 0, 1.6, 1.84, 0.34, 0, 6, straw, { cap: false });
  const bareHead = new Buf(16); // 12 triangles: head and dark hair
  bareHead.cyl(0, 0, 1.43, 1.62, 0.1, 0.1, 4, skin, { cap: false, rot: Math.PI / 4 });
  bareHead.cyl(0, 0, 1.62, 1.71, 0.105, 0, 4, hair, { cap: false, rot: Math.PI / 4 });

  const mat = cityMaterial();
  const mk = (geo, n) => {
    const mesh = new THREE.InstancedMesh(geo.geometry(), mat, Math.max(1, n));
    mesh.count = n;
    mesh.castShadow = !quality.low;
    mesh.frustumCulled = false;
    mesh.layers.set(1);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(mesh);
    return mesh;
  };
  // two wardrobes prepared now: today's, and the older one (1885/1935) — darker, more áo dài, nearly all in nón lá;
  // a separate generator so today's colours are exactly what they were
  const OLD_AODAI = ['#f1ede4', '#26221f', '#2e3550', '#5e4232', '#3b2f28'].map(hex); // white, black, indigo, brown
  const OLD_EVERY = ['#4a3a2c', '#2b2724', '#3a3f52', '#d9cdb4', '#5a4a3a', '#6b5a44', '#2f3447'].map(hex); // brown, black, indigo, undyed
  const er = rng(1885);
  people.forEach((w) => {
    const pal = w.aodai ? AODAI : EVERY;
    w.col = shade(pal[Math.floor(rnd() * pal.length)], 0.88 + rnd() * 0.12);
    w.headCol = shade([1, 1, 1], 0.86 + rnd() * 0.14);
    const oldAodai = w.aodai || er() < 0.3, op = oldAodai ? OLD_AODAI : OLD_EVERY;
    w.colOld = shade(op[Math.floor(er() * op.length)], 0.85 + er() * 0.15);
    w.hatOld = w.hat || er() < 0.85;
  });
  const nHat = people.filter((w) => w.hat).length, nHatOld = people.filter((w) => w.hatOld).length;
  const bodies = mk(body, people.length), hats = mk(hatHead, Math.max(nHat, nHatOld)), bares = mk(bareHead, people.length - Math.min(nHat, nHatOld));
  const c = new THREE.Color();

  const SCALE = 1.1; // a touch over life size so they read from the usual viewing distance
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(SCALE, SCALE, SCALE), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  // On an era change the people of that era are packed at the front of each mesh (mesh.count = how many), get
  // that era's clothes, and those standing still are written once; the per-frame loop only visits walkers.
  const walkers = [];
  const apply = (e) => {
    walkers.length = 0;
    let nb = 0, nh = 0, nr = 0;
    for (const w of people) {
      if (w.since > e) continue;
      const hat = e >= 2 ? w.hat : w.hatOld;
      w.i = nb++;
      w.head = hat ? hats : bares;
      w.j = hat ? nh++ : nr++;
      bodies.setColorAt(w.i, enc(e >= 2 ? w.col : w.colOld, c));
      w.head.setColorAt(w.j, enc(w.headCol, c));
      if (w.still) {
        q.setFromAxisAngle(up, w.yaw); p.set(w.x, w.y, w.z);
        m.compose(p, q, sc);
        bodies.setMatrixAt(w.i, m); w.head.setMatrixAt(w.j, m);
      } else walkers.push(w);
    }
    bodies.count = nb; hats.count = nh; bares.count = nr;
    for (const mesh of [bodies, hats, bares]) {
      mesh.visible = mesh.count > 0;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    update(0);
  };
  const TURN = 0.8;
  const update = (dt) => {
    for (let i = 0; i < walkers.length; i++) {
      const w = walkers[i];
      let moving = false;
      if (w.wait > 0) w.wait -= dt; // stopped to look at something
      else if (w.turn > 0) w.turn = Math.max(0, w.turn - dt);
      else {
        const d = w.speed * dt;
        w.s += w.dir * d; w.go -= d; w.phase += d * 4.8; moving = true;
        if (w.s > w.path.len) { w.s = w.path.len; w.dir = -1; w.turn = TURN; } else if (w.s < 0) { w.s = 0; w.dir = 1; w.turn = TURN; } else if (w.go < 0) { w.go = 25 + rnd() * 110; w.wait = 1.5 + rnd() * 6; }
      }
      w.seg = seek(w.path, w.s, w.seg);
      place(w.path, w.s, w.seg, w.lat, tmp);
      const yaw = Math.atan2(-tmp.dz * w.dir, tmp.dx * w.dir) + (w.turn > 0 ? (Math.PI * w.turn) / TURN : 0) + (moving ? Math.sin(w.phase) * 0.06 : 0);
      q.setFromAxisAngle(up, yaw);
      p.set(tmp.x, tmp.y + (moving ? Math.abs(Math.sin(w.phase)) * 0.045 : 0), tmp.z);
      m.compose(p, q, sc);
      bodies.setMatrixAt(w.i, m);
      w.head.setMatrixAt(w.j, m);
    }
    bodies.instanceMatrix.needsUpdate = hats.instanceMatrix.needsUpdate = bares.instanceMatrix.needsUpdate = true;
  };
  apply(era.value);
  onEra(apply);
  return update;
}

// The train. Real: the track (the OSM main line through Huế, joined into one run, over cầu Bạch Hổ at deck
// height) and the stop at Ga Huế. Illustrative: the locomotive, six carriages, the timetable — it shuttles
// back and forth, slowing into the station and standing there ~20 s.
function buildTrain(data, group) {
  const lines = [];
  for (const r of data.rails || []) {
    if (!Array.isArray(r) || !Array.isArray(r[2]) || r[2].length < 4 || !r[0]) continue;
    const pts = unflat(r[2]);
    lines.push({ pts, len: pathLength(pts), c: 0, h: r[1] ? RAIL_BRIDGE_TOP : NaN });
  }
  if (!lines.length) return null;
  const chains = chain(lines, 3, () => true);
  const track = chains.reduce((a, b) => (b.len > a.len ? b : a), chains[0]);
  const UNITS = [16, 20, 20, 20, 20, 20, 20], GAP = 1; // locomotive first, at the high-arc end
  const LT = UNITS.reduce((t, l) => t + l, 0) + GAP * (UNITS.length - 1);
  if (!track || track.len < LT + 100) return null;
  const offs = []; // centre of each unit, measured back from the train's front
  for (let k = 0, o = 0; k < UNITS.length; k++) { offs.push(o + UNITS[k] / 2); o += UNITS[k] + GAP; }

  // the station: where the track passes closest to Ga Huế
  let sst = -1;
  const gh = placeById(data).get('gahue');
  if (gh) {
    let best = 300;
    for (let i = 1; i < track.pts.length; i++) {
      const a = track.pts[i - 1], b = track.pts[i], l = track.acc[i] - track.acc[i - 1];
      if (l < 1e-6) continue;
      const t = Math.max(0, Math.min(1, ((gh[0] - a[0]) * (b[0] - a[0]) + (gh[1] - a[1]) * (b[1] - a[1])) / (l * l)));
      const d = Math.hypot(a[0] + (b[0] - a[0]) * t - gh[0], a[1] + (b[1] - a[1]) * t - gh[1]);
      if (d < best) { best = d; sst = track.acc[i - 1] + t * l; }
    }
    if (sst >= 0) sst = Math.max(LT / 2 + 1, Math.min(track.len - LT / 2 - 1, sst)); // the whole train must fit
  }

  // unit-length carriage (scaled along x per unit): underframe, body, roof — 30 triangles
  const geo = new Buf(36);
  geo.box(0, 0, 0.3, 0.75, 1, 2.2, 0, [0.22, 0.22, 0.22]);
  geo.box(0, 0, 0.75, 3.6, 1, 2.9, 0, [1, 1, 1]);
  geo.box(0, 0, 3.6, 3.85, 0.98, 2.5, 0, [0.62, 0.62, 0.6]);
  const mesh = new THREE.InstancedMesh(geo.geometry(), cityMaterial(), UNITS.length);
  const c = new THREE.Color();
  UNITS.forEach((_, k) => mesh.setColorAt(k, enc(hex(k === 0 ? '#b8462f' : k % 2 ? '#2f5f8f' : '#33658f'), c)));
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  // no railway in 1885; in 1935 a steam train, so a black locomotive
  const LOCO = [hex('#1e1e20'), hex('#b8462f')];
  mesh.castShadow = !quality.low;
  mesh.frustumCulled = false;
  mesh.layers.set(1);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(mesh);

  const st = { front: sst > 0 ? sst + LT / 2 : LT + 40, dir: 1, wait: sst > 0 ? 6 : 0, served: sst > 0 };
  const segA = new Int32Array(UNITS.length).fill(1), segB = new Int32Array(UNITS.length).fill(1);
  const A = { x: 0, y: 0, z: 0, dx: 1, dz: 0 }, B = { x: 0, y: 0, z: 0, dx: 1, dz: 0 };
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const VMAX = 10;
  const update = (dt) => {
    if (!mesh.visible) return;
    if (st.wait > 0) st.wait -= dt;
    else {
      const mid = st.front - LT / 2;
      const v = sst > 0 ? VMAX * Math.max(0.12, Math.min(1, Math.abs(mid - sst) / 260)) : VMAX;
      const before = (sst - mid) * st.dir;
      st.front += st.dir * v * dt;
      const after = (sst - (st.front - LT / 2)) * st.dir;
      if (st.served && Math.abs(mid - sst) > 50) st.served = false;
      if (sst > 0 && !st.served && before > 0 && after <= 0) { st.front = sst + LT / 2; st.wait = 20; st.served = true; }
      // at the ends of the line it reverses (push-pull), after a pause
      if (st.front > track.len) { st.front = track.len; st.dir = -1; st.wait = 10; } else if (st.front - LT < 0) { st.front = LT; st.dir = 1; st.wait = 10; }
    }
    for (let k = 0; k < UNITS.length; k++) {
      const cs = st.front - offs[k], h = UNITS[k] * 0.36; // bogie centres
      segA[k] = seek(track, cs - h, segA[k]); segB[k] = seek(track, cs + h, segB[k]);
      place(track, cs - h, segA[k], 0, A); place(track, cs + h, segB[k], 0, B);
      const dx = B.x - A.x, dz = B.z - A.z;
      q.setFromAxisAngle(up, Math.atan2(-dz, dx));
      p.set((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
      sc.set(UNITS[k], 1, 1);
      mesh.setMatrixAt(k, m.compose(p, q, sc));
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  const apply = (e) => {
    mesh.visible = e >= 1;
    mesh.setColorAt(0, enc(LOCO[e >= 2 ? 1 : 0], c));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    update(0);
  };
  update(0);
  apply(era.value);
  onEra(apply);
  return update;
}
