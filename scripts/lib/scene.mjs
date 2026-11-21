// The whole scene built headless, in the order src/main.js builds it, for the geometry checks (check-burial,
// check-overlap). Each step remembers the faces it added to the shared static buffer (range) and the objects it
// added to the dynamic group (objs); the replicas come out one source per place ('place:<id>').
import fs from 'node:fs';
import * as THREE from 'three';

// the builders read a few browser globals at import time and draw a few canvas textures
const ctx2d = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {}, data: new Uint8ClampedArray(4) })), set: (t, k, v) => ((t[k] = v), true) });
Object.assign(globalThis, {
  innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, window: globalThis,
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  location: { search: '', hash: '' }, localStorage: { getItem: () => null, setItem() {} },
  document: { createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => ctx2d }) },
});

const root = new URL('../../', import.meta.url);
const src = (p) => new URL('src/' + p, root).href;

export async function buildScene() {
  const warn0 = console.warn;
  console.warn = () => {}; // check-heights reports builder warnings; here only geometry matters
  const data = JSON.parse(fs.readFileSync(new URL('public/data/hue.json', root)));
  const { initTerrain, groundY } = await import(src('geo/terrain.js'));
  const { initDistricts } = await import(src('geo/districts.js'));
  initTerrain(data);
  initDistricts(data);
  // the per-place replicas (src/landmarks/places/*.js): plain node has no import.meta.glob, so hand them to
  // places/index.js before any builder asks for them, as check-heights does
  globalThis.__hueReplicas = {};
  for (const f of fs.readdirSync(new URL('src/landmarks/places/', root)).filter((f) => f.endsWith('.js') && f !== 'index.js'))
    globalThis.__hueReplicas[f] = await import(src('landmarks/places/' + f));
  const { buildPlaces } = await import(src('landmarks/places/index.js'));
  const city = await import(src('geo/city.js'));
  const config = await import(src('config.js'));
  const L = (m) => import(src('landmarks/' + m + '.js'));
  const [truongtien, citadel, more, civic, memorial, boardwalk, floating, south, tombs, boats, life] = await Promise.all(
    ['truongtien', 'citadel', 'more', 'civic', 'memorial', 'boardwalk', 'floating', 'south', 'tombs', 'boats', 'life'].map(L));
  const isLand = boats.landTest(data, { ponds: true });

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
  {
    const g = world.group.children.length;
    try {
      buildPlaces(data, S, dyn, (id, range, k) => sources.push({ name: 'place:' + id, range, objs: dyn.children.slice(k) }));
    } catch (e) { errors.push(`replicas threw: ${e.message}`); }
    if (world.group.children.length > g) sources.push({ name: 'replicas', range: [S.n, S.n], objs: world.group.children.slice(g) });
  }
  step('populate', () => city.populate(world, data));
  step('street', () => life.buildStreetLife(data, dyn));
  console.warn = warn0;
  return { data, world, S, dyn, sources, errors, groundY, isLand, ROAD_W: config.ROAD_W, LAND_Y: config.LAND_Y };
}
