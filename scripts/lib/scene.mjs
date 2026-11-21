// The whole scene built headless through the same buildLandmarks (src/landmarks/build.js) src/main.js calls, for the
// geometry checks (check-burial, check-overlap, check-heights, check-joints). Each step remembers the faces it added
// to the shared static buffer (range) and the objects it added to the dynamic group (objs); the replicas come out one
// source per place ('place:<id>'). Builder warnings are kept per step (warnings: [step, text]) for check-heights.
import fs from 'node:fs';
import * as THREE from 'three';
import { readTiles, withTiles } from './data.mjs';

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

// opts.app: also merge the static buffer into its 'structures' mesh as src/main.js does, so build-label-tops.mjs sees
// the scene the browser sees (the geometry checks read the buffer instead).
// opts.whole: build from one data set with every tile merged in (check-tiles compares that with the app's way)
export async function buildScene(opts = {}) {
  const warn0 = console.warn, warnings = [];
  let current = 'city';
  console.warn = (...a) => { warnings.push([current, a.map(String).join(' ')]); };
  const data = JSON.parse(fs.readFileSync(new URL('public/data/hue.json', root)));
  if (opts.whole) withTiles(data);
  const { initTerrain, groundY } = await import(src('geo/terrain.js'));
  const { initDistricts } = await import(src('geo/districts.js'));
  initTerrain(data);
  initDistricts(data);
  // the per-place replicas (src/landmarks/places/*.js): plain node has no import.meta.glob, so hand them to
  // places/index.js before any builder asks for them, as check-heights does
  globalThis.__hueReplicas = {};
  for (const f of fs.readdirSync(new URL('src/landmarks/places/', root)).filter((f) => f.endsWith('.js') && f !== 'index.js'))
    globalThis.__hueReplicas[f] = await import(src('landmarks/places/' + f));
  const city = await import(src('geo/city.js'));
  const config = await import(src('config.js'));
  const { landTest } = await import(src('landmarks/boats.js'));
  const { buildLandmarks } = await import(src('landmarks/build.js'));
  const isLand = landTest(data, { ponds: true });

  const world = city.buildCity(data);
  const S = world.structures, dyn = new THREE.Group();
  const sources = [{ name: 'walls', range: S.wallRange || [0, 0], objs: [] }], errors = [];
  // the observer buildLandmarks calls around each named step. The replicas step is told apart per place (onPlace);
  // under its own name it keeps only what a replica put into world.group, if anything
  const step = (name, f) => {
    const a = S.n, k = dyn.children.length, g = world.group.children.length;
    current = name;
    try { f(); } catch (e) { errors.push(`${name} threw: ${e.message}`); }
    if (name !== 'replicas') sources.push({ name, range: [a, S.n], objs: [...dyn.children.slice(k), ...world.group.children.slice(g)] });
    else if (world.group.children.length > g) sources.push({ name, range: [S.n, S.n], objs: world.group.children.slice(g) });
  };
  const onPlace = (id, range, k) => sources.push({ name: 'place:' + id, range, objs: dyn.children.slice(k) });
  buildLandmarks(data, world, dyn, { step, onPlace, finish: !!opts.app }); // the checks read the buffer, not the merged mesh
  const tiles = readTiles(data); // the trees and houses the app plants after the first frame, the way it plants them
  step('tiles', () => { for (const t of tiles) world.addTile(t); });
  console.warn = warn0;
  return { data, tiles, world, S, dyn, sources, errors, warnings, groundY, isLand, ROAD_W: config.ROAD_W, LAND_Y: config.LAND_Y };
}
