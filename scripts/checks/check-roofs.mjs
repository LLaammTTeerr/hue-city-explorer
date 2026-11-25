// Builds the whole scene headless (scripts/lib/scene.mjs) and fails where one hip roof runs through another: the
// fault of two roofs set side by side closer than their two overhangs (a double hall, halls joined end to end, a
// gallery against a hall, neighbouring mapped houses), where an eave passes in and out of the neighbour's slope and
// its upturned corners stand up through it, instead of the two meeting in a valley.
//
// Every Buf.hip() call is recorded (Buf.roofLog): its slope faces and its eave line as drawn, after any clip. Each
// roof's slope is rasterised into a height map (CELL). For every pair of roofs whose plans overlap, the eave of one
// is sampled where it lies well inside the other's plan (ERODE in from its edge): an eave that is somewhere more than
// TOL above the other roof and somewhere more than TOL below it crosses that roof's slope. An eave wholly under the
// other roof (a valley, a porch roof tucked under a hall's eave) or wholly over it (the upper tier of a two-tier roof)
// passes. Pairs from any source are tested, the mapped buildings and the landmarks alike.
// Run: npm run check:roofs   (--all also lists pairs that cross by less than TOL)
import { buildScene } from '../lib/scene.mjs';

const CELL = 0.25, ERODE = 0.5, TOL = 0.15;
const showAll = process.argv.includes('--all');
const t0 = Date.now();

const { Buf } = await import(new URL('../../src/geo/buf.js', import.meta.url).href);
Buf.roofLog = [];
const { S, sources, errors } = await buildScene();
const roofs = Buf.roofLog;
Buf.roofLog = null;

const key = (ix, iz) => (ix + 1e5) * 2e5 + (iz + 1e5);
const sourceOf = (r) => {
  if (r.buf !== S) return 'buildings';
  const s = sources.find((q) => r.range[0] >= q.range[0] && r.range[0] < q.range[1] && q.range[1] > q.range[0]);
  return s ? s.name : '?';
};

// each roof's slope: cell -> height, and its plan box
for (const r of roofs) {
  const P = r.buf.pos, h = new Map();
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let v = r.range[0]; v + 2 < r.range[1]; v += 3) {
    const k = v * 3;
    const ax = P[k], ay = P[k + 1], az = P[k + 2], bx = P[k + 3], by = P[k + 4], bz = P[k + 5], cx = P[k + 6], cy = P[k + 7], cz = P[k + 8];
    const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
    if (Math.abs(det) < 1e-9) continue;
    const i0 = Math.floor(Math.min(ax, bx, cx) / CELL), i1 = Math.floor(Math.max(ax, bx, cx) / CELL);
    const j0 = Math.floor(Math.min(az, bz, cz) / CELL), j1 = Math.floor(Math.max(az, bz, cz) / CELL);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const px = (i + 0.5) * CELL, pz = (j + 0.5) * CELL;
      const l1 = ((bz - cz) * (px - cx) + (cx - bx) * (pz - cz)) / det, l2 = ((cz - az) * (px - cx) + (ax - cx) * (pz - cz)) / det, l3 = 1 - l1 - l2;
      if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
      const y = l1 * ay + l2 * by + l3 * cy, c = key(i, j), was = h.get(c);
      if (was === undefined || y > was) h.set(c, y);
    }
    x0 = Math.min(x0, ax, bx, cx); x1 = Math.max(x1, ax, bx, cx); z0 = Math.min(z0, az, bz, cz); z1 = Math.max(z1, az, bz, cz);
  }
  Object.assign(r, { h, box: [x0, x1, z0, z1], src: sourceOf(r) });
}

// the other roof's height under a point, when the point is at least ERODE inside its plan
const E = Math.round(ERODE / CELL);
const under = (r, x, z) => {
  const i = Math.floor(x / CELL), j = Math.floor(z / CELL), y = r.h.get(key(i, j));
  if (y === undefined) return undefined;
  for (const [a, b] of [[E, 0], [-E, 0], [0, E], [0, -E], [E, E], [-E, -E], [E, -E], [-E, E]]) if (!r.h.has(key(i + a, j + b))) return undefined;
  return y;
};

// pairs whose boxes overlap, through a coarse grid
const G = 20, grid = new Map();
roofs.forEach((r, n) => {
  if (!r.h.size) return;
  for (let i = Math.floor(r.box[0] / G); i <= Math.floor(r.box[1] / G); i++) for (let j = Math.floor(r.box[2] / G); j <= Math.floor(r.box[3] / G); j++) {
    const c = key(i, j); (grid.get(c) || grid.set(c, []).get(c)).push(n);
  }
});
const seen = new Set(), faults = [], minor = [];
for (const list of grid.values()) for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
  const A = roofs[list[a]], B = roofs[list[b]], pk = list[a] * 1e6 + list[b];
  if (seen.has(pk)) continue;
  seen.add(pk);
  if (A.box[1] < B.box[0] || B.box[1] < A.box[0] || A.box[3] < B.box[2] || B.box[3] < A.box[2]) continue;
  let worst = null;
  for (const [X, Y] of [[A, B], [B, A]]) {
    let up = -Infinity, down = Infinity, at = null;
    for (const p of X.edge) {
      const y = under(Y, p[0], p[2]);
      if (y === undefined) continue;
      const d = p[1] - y;
      if (d > up) { up = d; at = p; }
      if (d < down) down = d;
    }
    const depth = Math.min(up, -down);
    if (depth > 0 && (!worst || depth > worst.depth)) worst = { depth, at, X, Y };
  }
  if (!worst) continue;
  const rec = { a: worst.X.src, b: worst.Y.src, depth: worst.depth, at: worst.at, sites: [worst.X.site, worst.Y.site] };
  if (worst.depth > TOL) faults.push(rec); else minor.push(rec);
}

const fmt = (f) => `  ${f.a} × ${f.b}: an eave crosses the other roof by ${f.depth.toFixed(2)} m, near (${f.at[0].toFixed(1)}, ${f.at[2].toFixed(1)})${f.sites[0] ? `  [${f.sites.join(' | ')}]` : ''}`;
faults.sort((p, q) => q.depth - p.depth);
console.log(`check-roofs: ${roofs.length} hip roofs, ${seen.size} pairs near each other (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
for (const e of errors) console.log('  ' + e);
if (showAll && minor.length) { console.log(`under ${TOL} m:`); for (const f of minor.sort((p, q) => q.depth - p.depth)) console.log(fmt(f)); }
if (faults.length) {
  console.log(`${faults.length} pair(s) of roofs run through each other:`);
  for (const f of faults) console.log(fmt(f));
  process.exit(1);
}
if (errors.length) process.exit(1);
console.log('ok: no roof runs through another');
