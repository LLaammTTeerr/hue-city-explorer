import { unflat, pathLength } from '../../geo/buf.js';
import { rise } from '../../geo/terrain.js';
import { LAND_Y, ROAD_W, ROAD_MAX, roadWidth } from '../../config.js';
import { bridgeProfiles } from '../../geo/bridges.js';
import { TT_LENGTH } from '../truongtien.js';
import { placeOwnsWay } from '../places/index.js';

// Shared deterministic PRNG and polyline-path helpers for animated traffic, pedestrians, and trains.
export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---------- shared helpers for things that move along polylines ----------

export const BRIDGE_TOP = LAND_Y + 0.42; // road bridge slab top (geo/city.js)
export const RAIL_BRIDGE_TOP = LAND_Y + 0.5; // rail bridge deck (geo/city.js)
export const ON_GROUND = 0.06; // things on the ground stand on the road overlay, not under it

// Same as `along` in geo/city.js, so lamp posts land exactly where the night glows are.
export function along(pts, dist) {
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

// Same as `widthAt` in geo/city.js, for tapering carriageways (r.ws).
export function widthAt(pts, ws, p) {
  let best = Infinity, w = ws[0];
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz;
    const t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2)) : 0;
    const d = Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz);
    if (d < best) { best = d; w = ws[i] + (ws[i + 1] - ws[i]) * t; }
  }
  return w;
}

// The roads as objects, defensively: anything malformed is dropped.
export function readRoads(data) {
  const out = [], owned = placeOwnsWay(data);
  for (const r of data.roads || []) {
    if (!Array.isArray(r) || !Array.isArray(r[2]) || r[2].length < 4 || owned(r)) continue; // a model's own paths
    const pts = unflat(r[2]);
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const p of pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < z0) z0 = p[1]; if (p[1] > z1) z1 = p[1]; }
    out.push({ c: Math.max(0, Math.min(ROAD_MAX, r[0] | 0)), w: roadWidth(r), ...(r[4] ? { ws: r[4].map((v) => v / 10) } : {}), bridge: !!r[1], flat: r[2], pts, len: pathLength(pts), ...(r[5] > 0 ? { unmarked: true } : {}), x0, x1, z0, z1 });
  }
  return out;
}

// A walkable/drivable path. ya/yb[i] are the heights at the two ends of segment i (pts[i-1] → pts[i]);
// NaN means "on the ground", which is then read from the terrain under the offset position.
export function mkPath(pts, ya = null, yb = null) {
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
export function seek(path, s, seg) {
  const acc = path.acc, n = acc.length;
  if (seg < 1) seg = 1; else if (seg > n - 1) seg = n - 1;
  while (seg < n - 1 && acc[seg] < s) seg++;
  while (seg > 1 && acc[seg - 1] > s) seg--;
  return seg;
}
// Position at arc length s, pushed `off` metres to the right of the direction of travel along the path.
// Near a corner the direction is blended with the neighbouring segment's, so offset agents round the corner
// instead of jumping across it. Writes into `o`.
export function place(path, s, seg, off, o) {
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
export function chain(lines, tol, canJoin) {
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
    // segment i runs from height ya[i] to yb[i] and has half-width hw[i]; preserve each bridge line's own start
    // height when its first vertex merges into the preceding ground road so the first (or only) bridge segment stays on deck
    const pts = [], ya = [], yb = [], hw = [];
    for (const s of seq) {
      const L = lines[s.i], Q = L.pts, n = Q.length;
      const hAt = (k) => (L.hs ? L.hs[s.rev ? n - 1 - k : k] : L.h);
      const wSeg = L.w ? L.w / 2 : 0;
      let lastH = hAt(0);
      for (let k = 0; k < n; k++) {
        const p = s.rev ? Q[n - 1 - k] : Q[k], h = hAt(k);
        if (pts.length) {
          const l = pts[pts.length - 1];
          if (Math.hypot(p[0] - l[0], p[1] - l[1]) < (k === 0 ? tol + 0.01 : 0.05)) {
            if (k === 0) lastH = h;
            continue;
          }
        }
        const ok = k > 0 && lastH === lastH && h === h;
        pts.push(p);
        ya.push(ok ? lastH : NaN);
        yb.push(ok ? h : NaN);
        hw.push(wSeg);
        lastH = h;
      }
    }
    if (pts.length < 2) continue;
    const path = mkPath(pts, Float32Array.from(ya), Float32Array.from(yb));
    path.hw = Float32Array.from(hw);
    path.c = lines[i0].c;
    out.push(path);
  }
  return out;
}

// Cut a polyline into the runs that satisfy keep(x, z), sampled every `step` metres.
export function clipRuns(pts, keep, step, minLen) {
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

export function placeById(data) {
  const m = new Map();
  for (const p of data.places || []) if (p && p.id && Number.isFinite(p.x) && Number.isFinite(p.z)) m.set(p.id, [p.x / 10, p.z / 10]);
  return m;
}

// Cầu Trường Tiền's deck, rebuilt from the same numbers as landmarks/truongtien.js (deck top 6.4 m above the river,
// 34 m ramps at each end, walkways cantilevered outside the trusses).
export function truongTienFrame(data) {
  const tt = data.truongtien;
  if (!tt || !tt.a || !tt.b || !tt.box || !tt.box.c) return null;
  const a = [tt.a[0] / 10, tt.a[1] / 10], b = [tt.b[0] / 10, tt.b[1] / 10];
  const dl = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (!(dl > 1)) return null;
  const d = [(b[0] - a[0]) / dl, (b[1] - a[1]) / dl], n = [-d[1], d[0]];
  const c = [tt.box.c[0] / 10, tt.box.c[1] / 10], L = TT_LENGTH, W = tt.box.d / 10;
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

export const tmp = { x: 0, y: 0, z: 0, dx: 1, dz: 0 };

