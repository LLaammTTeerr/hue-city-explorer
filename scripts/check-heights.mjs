// Builds the landmark models headless (scripts/lib/scene.mjs, through buildLandmarks) and checks each one's height
// against the documented figure in docs/heights-reference.json. Run: npm run check:heights  (add --all to print every entry, not just failures).
// Exits 1 when a model is outside its range (with the tolerance), when a locator finds nothing, or when a
// builder throws or warns, so a regression shows up in CI before deploy.
import fs from 'node:fs';
import * as THREE from 'three';
import { buildScene } from './lib/scene.mjs';

const root = new URL('../', import.meta.url);
const src = (p) => new URL('src/' + p, root).href;
const ref = JSON.parse(fs.readFileSync(new URL('docs/heights-reference.json', root)));
const showAll = process.argv.includes('--all');

// ---- the scene, built through buildLandmarks as src/main.js builds it (scripts/lib/scene.mjs) ----
const { data, sources, S, errors, warnings, groundY } = await buildScene();
const { rise } = await import(src('geo/terrain.js'));

// every vertex of the landmark models: the faces each landmark step added to the merged buffer and the objects it
// added, minus the Citadel rampart, the city's own buildings, houses and trees (populate) and the moving things
const notLandmarks = new Set(['walls', 'populate', 'boats', 'lanterns', 'lotus', 'traffic', 'street']);
const pts = [];
{
  const P = S.pos, v = new THREE.Vector3();
  for (const s of sources) {
    if (notLandmarks.has(s.name)) continue;
    for (let i = s.range[0]; i < s.range[1]; i++) pts.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
    for (const r of s.objs) {
      r.updateMatrixWorld(true);
      r.traverse((o) => {
        const p = o.geometry?.attributes?.position;
        if (!p || o.isPoints || o.isSprite) return;
        for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); pts.push(v.x, v.y, v.z); }
      });
    }
  }
}

// ---- locating a reference entry ----
const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const unflat = (r) => { const o = []; for (let i = 0; i + 1 < r.length; i += 2) o.push([r[i] / 10, r[i + 1] / 10]); return o; };
const centroid = (poly) => poly.reduce((a, p) => [a[0] + p[0] / poly.length, a[1] + p[1] / poly.length], [0, 0]);
function locate(at) {
  if (at.special) { const s = data.special[at.special]; return s?.ring?.length >= 6 ? unflat(s.ring) : null; }
  if (at.point) { const [x, z] = at.point, r = at.r ?? 3; return Array.from({ length: 12 }, (_, i) => [x + r * Math.cos((i * Math.PI) / 6), z + r * Math.sin((i * Math.PI) / 6)]); }
  if (at.gate) { // a mapped gate: centre, size and angle as src/geo/gates.js reads them
    const g = (data.gates || []).find((q) => norm(q.n) === norm(at.gate));
    if (!g) return null;
    const cx = g.c[0] / 10, cz = g.c[1] / 10, w = g.w / 20, d = g.d / 20, a = g.a / 1000, u = [Math.cos(a), Math.sin(a)], v = [-u[1], u[0]];
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([s, t]) => [cx + u[0] * w * s + v[0] * d * t, cz + u[1] * w * s + v[1] * d * t]);
  }
  const site = data.sites[at.site];
  if (!site) return null;
  const items = site.items.filter((i) => i.ring?.length >= 6 && (i.k || 'b') === (at.k || 'b'));
  if (at.name) { const it = items.find((i) => norm(i.n) === norm(at.name)); return it ? unflat(it.ring) : null; }
  if (at.rel) { // same rule as nearest() in src/landmarks/tombs.js: offset from the site centre, within a tolerance
    const p = [site.c[0] / 10 + at.rel[0], site.c[1] / 10 + at.rel[1]];
    let best = null, bd = at.tol ?? 12;
    for (const it of items) { const c = centroid(unflat(it.ring)), d = Math.hypot(c[0] - p[0], c[1] - p[1]); if (d < bd) { bd = d; best = it; } }
    return best ? unflat(best.ring) : null;
  }
  return null;
}

// ---- measuring: the highest model vertex over the footprint (plus a margin for eaves), above a base ----
//   base "ground": the ground at the footprint's centre (buildings standing on the street)
//   base "model":  the lowest model vertex over the footprint (buildings on terraces and plinths the model builds)
const inside = (x, z, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
const segD = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz); };
const near = (x, z, poly, m) => { if (inside(x, z, poly)) return true; if (m <= 0) return false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) if (segD(x, z, poly[j], poly[i]) <= m) return true; return false; };
function measure(poly, base, margin = 1.5) {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const [x, z] of poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  let top = -Infinity, low = Infinity;
  for (let i = 0; i < pts.length; i += 3) {
    const x = pts[i], y = pts[i + 1], z = pts[i + 2];
    if (x < x0 - margin || x > x1 + margin || z < z0 - margin || z > z1 + margin) continue;
    if (y > top && near(x, z, poly, margin)) top = y;
    if (base === 'model' && y < low && inside(x, z, poly)) low = y;
  }
  if (top === -Infinity) return null;
  const c = centroid(poly);
  return top - (base === 'model' ? low : groundY(c[0], c[1]));
}

// ---- the check ----
const tolFor = (e) => e.tolerance ?? (e.confidence === 'sourced' ? ref.tolerance.sourced : ref.tolerance.estimated);
const rows = [];
for (const e of ref.landmarks) {
  const poly = locate(e.at);
  const tol = tolFor(e);
  const [lo, hi] = Array.isArray(e.h) ? e.h : [e.h, e.h];
  const h = poly ? measure(poly, e.base || 'ground', e.margin) : null;
  const ok = h != null && h >= lo * (1 - tol) && h <= hi * (1 + tol);
  rows.push({ name: e.name, want: lo === hi ? `${lo}` : `${lo}–${hi}`, got: h == null ? (poly ? 'no model' : 'not found') : h.toFixed(1), ok, known: e.known, tol, note: e.base === 'model' ? 'on its floor' : '' });
}
for (const [, w] of warnings) errors.push(`warning while building: ${w}`);

if (process.argv.includes('--diag')) { // what each base would give, for working out why an entry fails
  for (const e of ref.landmarks) {
    const poly = locate(e.at);
    if (!poly) continue;
    const c = centroid(poly), r = poly.map(([x, z]) => rise(x, z));
    console.log(`  ${e.name}: rise centre ${rise(c[0], c[1]).toFixed(1)} min ${Math.min(...r).toFixed(1)} max ${Math.max(...r).toFixed(1)}; ` +
      `above ground ${measure(poly, 'ground', e.margin)?.toFixed(1)}, above model ${measure(poly, 'model', e.margin)?.toFixed(1)}`);
  }
}
const bad = rows.filter((r) => !r.ok && !r.known), warn = rows.filter((r) => !r.ok && r.known);
const pad = (s, n) => String(s).padEnd(n);
const show = showAll ? rows : [...bad, ...warn];
if (show.length) {
  console.log(pad('landmark', 34) + pad('reference m', 13) + pad('model m', 10) + '');
  for (const r of show) console.log(pad(r.name, 34) + pad(r.want, 13) + pad(r.got, 10) + (r.ok ? 'ok' : `${r.known ? 'WARN' : 'FAIL'} (±${Math.round(r.tol * 100)} %)`) + (r.note ? '  ' + r.note : '') + (!r.ok && r.known ? `\n    known: ${r.known}` : ''));
}
for (const e of errors) console.log('ERROR ' + e);
console.log(`check:heights — ${rows.length - bad.length - warn.length}/${rows.length} landmarks within range${warn.length ? `, ${warn.length} known discrepancy(ies)` : ''}${errors.length ? `, ${errors.length} build error(s)` : ''}`);
process.exit(bad.length || errors.length ? 1 : 0);
