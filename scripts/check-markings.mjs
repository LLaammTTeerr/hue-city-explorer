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
const { nearHole, continues, HOLE_MAX, PAR_DEG } = await import(new URL('src/geo/junctions.js', root).href);
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
    // the ribbon's heading along this quad (midpoint of one end to the other)
    const hx = (L[i + 1][0] + R[i + 1][0] - L[i][0] - R[i][0]) / 2, hz = (L[i + 1][1] + R[i + 1][1] - L[i][1] - R[i][1]) / 2, hl = Math.hypot(hx, hz) || 1;
    const xs = t.map((p) => p[0]), zs = t.map((p) => p[1]);
    for (let x = Math.floor(Math.min(...xs) / G); x <= Math.floor(Math.max(...xs) / G); x++)
      for (let z = Math.floor(Math.min(...zs) / G); z <= Math.floor(Math.max(...zs) / G); z++) {
        const k = x + ',' + z;
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push({ id: r.id, t, ux: hx / hl, uz: hz / hl });
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

const parSin = Math.sin((PAR_DEG * Math.PI) / 180); // a ribbon running alongside (twin carriageway, slip, fork arm) is not a crossing
const bad = { cross: [], hole: [] };
for (const d of dashes) {
  const dx = d.p1[0] - d.p0[0], dz = d.p1[1] - d.p0[1], len = Math.hypot(dx, dz) || 1;
  const nx = (-dz / len) * 0.16, nz = (dx / len) * 0.16, ux = dx / len, uz = dz / len;
  let why = null;
  for (let s = 0; s <= len + 1e-6 && !why; s += 0.5) for (const side of [-1, 1]) {
    const x = d.p0[0] + (dx * s) / len + nx * side, z = d.p0[1] + (dz * s) / len + nz * side;
    if (nearHole(world.marks.holeCells, x, z)) { why = 'hole'; break; }
    const hit = (grid.get(Math.floor(x / G) + ',' + Math.floor(z / G)) || []).find((e) => !isOwn(d.id, e.id) && Math.abs(ux * e.uz - uz * e.ux) >= parSin && inTri(e.t, x, z));
    if (hit) { why = 'cross'; d.other = hit.id; break; }
  }
  if (why) bad[why].push(d);
}

// Over-clipping: away from every junction a marked road keeps its dashes. Junction zones are found here on their own,
// not by the builder's rule: a point a major road shares with another major road that isn't its end-to-end
// continuation, out to the widest carriageway there plus room for the pad and a skewed crossing (2 × (w/2 + 1.5) + 5 m
// of dash), and the cells around the junction holes. Every dash slot (the builder's 13 m rhythm) clear of the zones
// must carry its dash.
const major = cw.filter((r) => r.c <= 2);
const at = new Map();
for (const r of major) for (const p of r.pts) { const k = Math.round(p[0] * 2) + ',' + Math.round(p[1] * 2); if (!at.has(k)) at.set(k, { p, ids: new Set() }); at.get(k).ids.add(r.id); }
const zones = [];
for (const { p, ids } of at.values()) {
  if (ids.size < 2) continue;
  const rs = [...ids];
  if (rs.length === 2 && isOwn(rs[0], rs[1])) continue; // one street carrying on
  const w = Math.max(...rs.map((id) => roads[id].w));
  zones.push({ x: p[0], z: p[1], r: 2 * (w / 2 + 1.5) + 5 });
}
const ZG = 32, zgrid = new Map();
for (const zn of zones) for (let x = Math.floor((zn.x - zn.r) / ZG); x <= Math.floor((zn.x + zn.r) / ZG); x++)
  for (let z = Math.floor((zn.z - zn.r) / ZG); z <= Math.floor((zn.z + zn.r) / ZG); z++) { const k = x + ',' + z; if (!zgrid.has(k)) zgrid.set(k, []); zgrid.get(k).push(zn); }
const inZone = (x, z) => nearHole(world.marks.holeCells, x, z, 3) || (zgrid.get(Math.floor(x / ZG) + ',' + Math.floor(z / ZG)) || []).some((zn) => Math.hypot(x - zn.x, z - zn.z) < zn.r);
const pointAt = (pts, s) => {
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (s <= l && l > 0) return [a[0] + ((b[0] - a[0]) * s) / l, a[1] + ((b[1] - a[1]) * s) / l];
    s -= l;
  }
  return pts.at(-1);
};
const drawn = new Set(dashes.map((d) => d.id + ':' + d.s0));
const OVERCLIP_MAX = 0.001; // share of clear slots allowed to go without a dash (parallel ways clipping each other: 0.17%)
let open = 0;
const missing = [];
roads.forEach((r, id) => {
  if (r.bridge || r.c > 1) return;
  let len = 0;
  for (let i = 0; i + 1 < r.pts.length; i++) len += Math.hypot(r.pts[i + 1][0] - r.pts[i][0], r.pts[i + 1][1] - r.pts[i][1]);
  for (let s0 = 4; s0 + 5 < len; s0 += 13) {
    let clear = true;
    for (let k = 0; k <= 5 && clear; k++) { const [x, z] = pointAt(r.pts, s0 + k); clear = !inZone(x, z); }
    if (!clear) continue;
    open++;
    if (!drawn.has(id + ':' + s0)) missing.push({ id, p: pointAt(r.pts, s0) });
  }
});
const overclip = missing.length / Math.max(1, open);

const area = holes.reduce((s, h) => s + h.area, 0);
console.log(`markings: ${dashes.length} dashes on ${new Set(dashes.map((d) => d.id)).size} roads; ${holes.length} junction holes painted (${Math.round(area)} m², largest ${Math.round(Math.max(0, ...holes.map((h) => h.area)))} m² of ${HOLE_MAX} allowed); roads built in ${Math.round(ms)} ms`);
for (const k of ['cross', 'hole']) {
  console.log(`  ${k}: ${bad[k].length} dash(es)`);
  if (list || bad[k].length <= 10) for (const d of bad[k]) console.log(`    road ${d.id} (class ${roads[d.id].c}) dash at ${d.p0.map((v) => v.toFixed(1))}${d.other !== undefined ? ` on road ${d.other} (class ${roads[d.other].c})` : ''}`);
}
console.log(`  clipped away from junctions: ${missing.length} of ${open} clear slots (${(overclip * 100).toFixed(2)}%, at most ${OVERCLIP_MAX * 100}% allowed)`);
if (list || missing.length <= 10) for (const m of missing) console.log(`    road ${m.id} (class ${roads[m.id].c}) slot at ${m.p.map((v) => v.toFixed(1))}`);
const n = bad.cross.length + bad.hole.length;
const over = overclip > OVERCLIP_MAX;
console.log(n ? `FAIL: ${n} dash(es) inside a junction` : 'OK: no dash inside a junction');
if (over) console.log(`FAIL: markings clipped away from junctions on ${missing.length} slots`);
process.exit(n || over ? 1 : 0);
