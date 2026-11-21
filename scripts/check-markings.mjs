// Lane markings stop at the junction mouth: no dash lies on another road's carriageway or in a junction hole.
// Builds the roads headless (geo/city.js buildCity, through scripts/lib/scene.mjs's browser stand-ins) and tests every
// dash's outline (both sides, every 0.5 m) against
//   cross  the carriageway triangles of every other major road (class 0-2, not a bridge, not a piece of the same
//          street carrying on end to end): the ribbons exactly as drawn, not the centre-line distance the builder
//          uses, so the two are independent;
//   hole   the junction holes (geo/junctions.js): patches enclosed by carriageways, painted as asphalt.
// It also reports what the holes cover, so a change that fills a real island shows up.
// Run: npm run check:markings   (--list prints every offending dash)
import fs from 'node:fs';
import './lib/scene.mjs'; // the browser stand-ins the builders need at import time

const root = new URL('../', import.meta.url);
const list = process.argv.includes('--list');
const data = JSON.parse(fs.readFileSync(new URL('public/data/hue.json', root)));
// plain node has no import.meta.glob: hand places/index.js the replicas (their deck ends shape the roads), as scene.mjs does
globalThis.__hueReplicas = {};
for (const f of fs.readdirSync(new URL('src/landmarks/places/', root)).filter((f) => f.endsWith('.js') && f !== 'index.js'))
  globalThis.__hueReplicas[f] = await import(new URL('src/landmarks/places/' + f, root).href);
const city = await import(new URL('src/geo/city.js', root).href);
const { nearHole, continues, HOLE_MAX } = await import(new URL('src/geo/junctions.js', root).href);
const t0 = performance.now();
const world = city.buildCity(data);
const ms = performance.now() - t0;
const { roads, cw, holes, dashes } = world.marks;

// the carriageway triangles of the roads that stop markings, on a grid
const G = 24, grid = new Map();
for (const r of cw) {
  const road = roads[r.id];
  if (road.bridge || road.c > 2) continue;
  const { L, R } = r;
  for (let i = 0; i + 1 < L.length; i++) for (const t of [[L[i], R[i], R[i + 1]], [L[i], R[i + 1], L[i + 1]]]) {
    const xs = t.map((p) => p[0]), zs = t.map((p) => p[1]);
    for (let x = Math.floor(Math.min(...xs) / G); x <= Math.floor(Math.max(...xs) / G); x++)
      for (let z = Math.floor(Math.min(...zs) / G); z <= Math.floor(Math.max(...zs) / G); z++) {
        const k = x + ',' + z;
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push({ id: r.id, t });
      }
  }
}
const inTri = ([a, b, c], x, z) => {
  const d1 = (b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0]);
  const d2 = (c[0] - b[0]) * (z - b[1]) - (c[1] - b[1]) * (x - b[0]);
  const d3 = (a[0] - c[0]) * (z - c[1]) - (a[1] - c[1]) * (x - c[0]);
  return (d1 >= 0 && d2 >= 0 && d3 >= 0) || (d1 <= 0 && d2 <= 0 && d3 <= 0);
};
const own = new Map();
const isOwn = (id, o) => {
  const k = id + ':' + o;
  if (!own.has(k)) own.set(k, o === id || continues(roads[id].pts, roads[o].pts));
  return own.get(k);
};

const bad = { cross: [], hole: [] };
for (const d of dashes) {
  const dx = d.p1[0] - d.p0[0], dz = d.p1[1] - d.p0[1], len = Math.hypot(dx, dz) || 1;
  const nx = (-dz / len) * 0.16, nz = (dx / len) * 0.16;
  let why = null;
  for (let s = 0; s <= len + 1e-6 && !why; s += 0.5) for (const side of [-1, 1]) {
    const x = d.p0[0] + (dx * s) / len + nx * side, z = d.p0[1] + (dz * s) / len + nz * side;
    if (nearHole(world.marks.holeCells, x, z)) { why = 'hole'; break; }
    const hit = (grid.get(Math.floor(x / G) + ',' + Math.floor(z / G)) || []).find((e) => !isOwn(d.id, e.id) && inTri(e.t, x, z));
    if (hit) { why = 'cross'; d.other = hit.id; break; }
  }
  if (why) bad[why].push(d);
}

const area = holes.reduce((s, h) => s + h.area, 0);
console.log(`markings: ${dashes.length} dashes on ${new Set(dashes.map((d) => d.id)).size} roads; ${holes.length} junction holes painted (${Math.round(area)} m², largest ${Math.round(Math.max(0, ...holes.map((h) => h.area)))} m² of ${HOLE_MAX} allowed); roads built in ${Math.round(ms)} ms`);
for (const k of ['cross', 'hole']) {
  console.log(`  ${k}: ${bad[k].length} dash(es)`);
  if (list || bad[k].length <= 10) for (const d of bad[k]) console.log(`    road ${d.id} (class ${roads[d.id].c}) dash at ${d.p0.map((v) => v.toFixed(1))}${d.other !== undefined ? ` on road ${d.other} (class ${roads[d.other].c})` : ''}`);
}
const n = bad.cross.length + bad.hole.length;
console.log(n ? `FAIL: ${n} dash(es) inside a junction` : 'OK: no dash inside a junction');
process.exit(n ? 1 : 0);
