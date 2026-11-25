// No tree stands on the asphalt: every tree the app plants (the city's and every tile's, through scripts/lib/scene.mjs)
// is tested against
//   trunk  its foot (the middle and four points 0.35 m out) on a carriageway, a junction patch or a paved sliver;
//   crown  more of its crown's plan than the planting rule allows (geo/city.js CROWN_ROAD, plus SLACK for the rule's
//          coarser sampling) over the asphalt, on a 0.5 m grid across the crown as drawn (its instance scale).
// The asphalt is rebuilt here from the ribbons exactly as laid (world.marks: carriageway and sliver edges, the hole
// cells), triangle by triangle, not through the planting rule's own test.
// Run: npm run check:trees   (--list prints every offending tree)
import * as THREE from 'three';
import { buildScene } from '../lib/scene.mjs';

const list = process.argv.includes('--list');
const SLACK = 0.1;
const t0 = performance.now();
const { world } = await buildScene();
const { CROWN_ROAD } = await import(new URL('../../src/geo/city.ts', import.meta.url).href);
const { CELL } = await import(new URL('../../src/geo/junctions.ts', import.meta.url).href);
const { cw, paved = [], holeCells } = world.marks;

const G = 16, grid = new Map();
for (const { L, R } of [...cw, ...paved]) for (let i = 0; i + 1 < L.length; i++) for (const t of [[L[i], R[i], R[i + 1]], [L[i], R[i + 1], L[i + 1]]]) {
  const xs = t.map((p) => p[0]), zs = t.map((p) => p[1]);
  for (let x = Math.floor(Math.min(...xs) / G); x <= Math.floor(Math.max(...xs) / G); x++)
    for (let z = Math.floor(Math.min(...zs) / G); z <= Math.floor(Math.max(...zs) / G); z++) {
      const k = x + ',' + z;
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(t);
    }
}
const inTri = ([a, b, c], x, z) => {
  const d1 = (b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0]);
  const d2 = (c[0] - b[0]) * (z - b[1]) - (c[1] - b[1]) * (x - b[0]);
  const d3 = (a[0] - c[0]) * (z - c[1]) - (a[1] - c[1]) * (x - c[0]);
  return (d1 >= 0 && d2 >= 0 && d3 >= 0) || (d1 <= 0 && d2 <= 0 && d3 <= 0);
};
const hole = (x, z) => holeCells.has(Math.floor(x / CELL) * 1048576 + Math.floor(z / CELL));
const on = (x, z) => hole(x, z) || (grid.get(Math.floor(x / G) + ',' + Math.floor(z / G)) || []).some((t) => inTri(t, x, z));

const M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
const bad = { trunk: [], crown: [] };
let n = 0, worst = 0;
for (const mesh of world.trees) for (let k = 0; k < mesh.count; k++) {
  mesh.getMatrixAt(k, M);
  M.decompose(P, Q, S);
  n++;
  const x = P.x, z = P.z, r = Math.sqrt(S.x * S.z);
  if ([[0, 0], [0.35, 0], [-0.35, 0], [0, 0.35], [0, -0.35]].some(([u, v]) => on(x + u, z + v))) { bad.trunk.push({ x, z, r }); continue; }
  let inn = 0, all = 0;
  for (let u = -r; u <= r; u += 0.5) for (let v = -r; v <= r; v += 0.5) {
    if (u * u + v * v > r * r) continue;
    all++;
    if (on(x + u, z + v)) inn++;
  }
  const f = inn / Math.max(1, all);
  if (f > worst) worst = f;
  if (f > CROWN_ROAD + SLACK) bad.crown.push({ x, z, r, f });
}
const ms = performance.now() - t0;
console.log(`trees: ${n} planted, tested against ${cw.length} carriageways, ${paved.length} paved slivers and ${holeCells.size} junction cells (${Math.round(ms)} ms); most crown over asphalt ${(worst * 100).toFixed(0)}%, ${((CROWN_ROAD + SLACK) * 100).toFixed(0)}% allowed`);
for (const k of ['trunk', 'crown']) {
  console.log(`  ${k}: ${bad[k].length} tree(s)`);
  if (list || bad[k].length <= 10) for (const t of bad[k]) console.log(`    tree at ${t.x.toFixed(1)}, ${t.z.toFixed(1)} (crown ${t.r.toFixed(1)} m${t.f !== undefined ? `, ${(t.f * 100).toFixed(0)}% over asphalt` : ''})`);
}
const nb = bad.trunk.length + bad.crown.length;
console.log(nb ? `FAIL: ${nb} tree(s) on the asphalt` : 'OK: no tree on the asphalt');
process.exit(nb ? 1 : 0);
