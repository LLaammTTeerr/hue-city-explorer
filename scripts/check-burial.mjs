// Builds the whole scene headless, in the order src/main.js does, and fails when a model is sunk into the ground:
// any floor, deck, terrace, step or roof face (a face that looks up) lying more than DEPTH under the terrain on land,
// over more than AREA per source. Run: npm run check:burial  (--all prints every hit, not just failures).
// Bedding is fine: foundations, piers and the rims of mounds go a little under on purpose, and are either walls (not
// looking up) or within DEPTH. Tree crowns are left out: on a steep hillside a crown brushes the uphill slope while
// its trunk stands on the ground; check-data guards trees by checking that the terrain grid covers every one.
import fs from 'node:fs';
import * as THREE from 'three';

const DEPTH = 1.0, AREA = 1.0;

// the builders read a few browser globals at import time and draw a few canvas textures
const ctx2d = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {}, data: new Uint8ClampedArray(4) })), set: (t, k, v) => ((t[k] = v), true) });
Object.assign(globalThis, {
  innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, window: globalThis,
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  location: { search: '', hash: '' }, localStorage: { getItem: () => null, setItem() {} },
  document: { createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => ctx2d }) },
});
const warn0 = console.warn;
console.warn = () => {}; // check-heights reports builder warnings; here only geometry matters

const root = new URL('../', import.meta.url);
const src = (p) => new URL('src/' + p, root).href;
const data = JSON.parse(fs.readFileSync(new URL('public/data/hue.json', root)));
const showAll = process.argv.includes('--all');

const { initTerrain, groundY } = await import(src('geo/terrain.js'));
const { initDistricts } = await import(src('geo/districts.js'));
initTerrain(data);
initDistricts(data);
const city = await import(src('geo/city.js'));
const L = (m) => import(src('landmarks/' + m + '.js'));
const [truongtien, citadel, more, civic, memorial, boardwalk, floating, south, tombs, boats, life] = await Promise.all(
  ['truongtien', 'citadel', 'more', 'civic', 'memorial', 'boardwalk', 'floating', 'south', 'tombs', 'boats', 'life'].map(L));
const isLand = boats.landTest(data, { ponds: true });

// ---- the scene; each step remembers the faces and objects it added ----
const world = city.buildCity(data);
const S = world.structures, dyn = new THREE.Group();
const sources = [{ name: 'walls', range: S.wallRange || [0, 0], objs: [] }], errors = [];
const step = (name, f) => {
  const a = S.n, k = dyn.children.length, g = world.group.children.length;
  try { f(); } catch (e) { errors.push(`${name} threw: ${e.message}`); }
  sources.push({ name, range: [a, S.n], objs: [...dyn.children.slice(k), ...world.group.children.slice(g)] });
};
step('truongtien', () => truongtien.buildTruongTien(data, S, dyn));
step('citadel', () => citadel.buildCitadel(data, S, dyn));
step('market', () => citadel.buildMarket(data, S, dyn));
step('thienmu', () => citadel.buildThienMu(data, S, dyn));
step('nguyenhoang', () => more.buildNguyenHoang(data, S, dyn));
step('quochocgate', () => more.buildQuocHocGate(data, S));
step('civic', () => civic.buildCivic(data, S));
step('biaquochoc', () => memorial.buildBiaQuocHoc(data, S));
step('boardwalk', () => boardwalk.buildBoardwalk(data, S, dyn));
step('floating', () => floating.buildFloatingRestaurants(data, S, dyn));
step('south', () => south.buildSouth(data, S));
step('tombs', () => tombs.buildTombs(data, S));
step('populate', () => city.populate(world, data));
step('street', () => life.buildStreetLife(data, dyn));

// ---- buried upward faces, summed per source in 8 m cells ----
const hits = new Map(); // source -> Map(cell -> { area, worst, x, z, y })
const e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
function tri(name, ax, ay, az, bx, by, bz, cx, cy, cz) {
  e1.set(bx - ax, by - ay, bz - az); e2.set(cx - ax, cy - ay, cz - az);
  const n = e1.cross(e2), ar = n.length() / 2;
  if (ar < 1e-4 || Math.abs(n.y) / (2 * ar) < 0.7) return; // walls and steep faces may be bedded
  // the centroid and a point 1/6 in from each corner: a face only grazing the ground at a corner is not sunk
  let worst = -Infinity, wx = 0, wz = 0, wy = 0;
  for (const [u, v] of [[1 / 3, 1 / 3], [2 / 3, 1 / 6], [1 / 6, 2 / 3], [1 / 6, 1 / 6]]) {
    const x = ax + (bx - ax) * u + (cx - ax) * v, y = ay + (by - ay) * u + (cy - ay) * v, z = az + (bz - az) * u + (cz - az) * v;
    const d = groundY(x, z) - y;
    if (d > worst) { worst = d; wx = x; wz = z; wy = y; }
  }
  if (worst < DEPTH || !isLand(wx, wz)) return; // in the river or a pond the terrain is not drawn
  let m = hits.get(name);
  if (!m) hits.set(name, (m = new Map()));
  const k = Math.floor(wx / 8) + ',' + Math.floor(wz / 8);
  let h = m.get(k);
  if (!h) m.set(k, (h = { area: 0, worst: 0, x: wx, z: wz, y: wy }));
  h.area += ar;
  if (worst > h.worst) Object.assign(h, { worst, x: wx, z: wz, y: wy });
}
const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), m4 = new THREE.Matrix4(), mi = new THREE.Matrix4();
for (const s of sources) {
  const P = S.pos;
  for (let i = s.range[0]; i + 2 < s.range[1]; i += 3) tri(s.name, P[i * 3], P[i * 3 + 1], P[i * 3 + 2], P[i * 3 + 3], P[i * 3 + 4], P[i * 3 + 5], P[i * 3 + 6], P[i * 3 + 7], P[i * 3 + 8]);
  for (const r of s.objs) {
    r.updateMatrixWorld(true);
    r.traverse((o) => {
      const p = o.geometry?.attributes?.position;
      if (!p || o.isPoints || o.isSprite || /^(land|terrain|base)$/.test(o.name) || /trees/.test(o.name)) return;
      const idx = o.geometry.index, nt = (idx ? idx.count : p.count) / 3, id = (j) => (idx ? idx.getX(j) : j);
      const n = o.isInstancedMesh ? o.count : 1, nm = s.name + (o.name ? ':' + o.name : '');
      for (let q = 0; q < n; q++) {
        if (o.isInstancedMesh) { o.getMatrixAt(q, mi); m4.multiplyMatrices(o.matrixWorld, mi); } else m4.copy(o.matrixWorld);
        for (let t = 0; t < nt; t++) {
          a.fromBufferAttribute(p, id(t * 3)).applyMatrix4(m4); b.fromBufferAttribute(p, id(t * 3 + 1)).applyMatrix4(m4); c.fromBufferAttribute(p, id(t * 3 + 2)).applyMatrix4(m4);
          tri(nm, a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
        }
      }
    });
  }
}

// ---- report ----
const placeName = (x, z) => { let best = '', bd = Infinity; for (const p of data.places || []) { const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = p.n; } } return best ? ` near ${best} (${bd.toFixed(0)} m)` : ''; };
console.warn = warn0;
let bad = 0;
for (const [name, m] of hits) {
  const list = [...m.values()].sort((p, q) => q.area * q.worst - p.area * p.worst);
  const area = list.reduce((t, h) => t + h.area, 0), fail = area > AREA;
  if (fail) bad++;
  if (!fail && !showAll) continue;
  console.log(`${fail ? 'FAIL' : 'ok  '} ${name}: ${area.toFixed(1)} m² of upward faces more than ${DEPTH} m under the ground`);
  for (const h of list.slice(0, showAll ? list.length : 6)) console.log(`       (${h.x.toFixed(0)}, ${h.z.toFixed(0)}) ${h.area.toFixed(1)} m², ${h.worst.toFixed(2)} m under: face at ${h.y.toFixed(1)}, ground ${groundY(h.x, h.z).toFixed(1)}${placeName(h.x, h.z)}`);
}
for (const e of errors) console.log('FAIL ' + e);
console.log(bad || errors.length ? `burial: ${bad} source(s) sunk into the ground` : `burial: ok, ${sources.length} sources, nothing more than ${DEPTH} m under the ground over ${AREA} m²`);
process.exit(bad || errors.length ? 1 : 0);
