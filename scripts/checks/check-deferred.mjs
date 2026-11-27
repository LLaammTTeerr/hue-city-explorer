// Regression check for deferred landmarks (LAZY_PLACE_IDS in src/landmarks/places/index.ts).
// Simulates production browser startup where EAGER_DROP_KEYS are deleted from `data` BEFORE `buildDeferredPlaces()`
// runs asynchronously after first-frame, and verifies against a full-data reference build that:
//   1. src/main.ts only deletes EAGER_DROP_KEYS before buildDeferredPlaces (no premature `delete data.<key>`),
//   2. every LAZY_PLACE_IDS module produces its own bounded `deferred-<id>` mesh (frustum-cullable, non-empty),
//   3. zero vertices, triangles, or dynamic child objects (glow points, emissive strips, plaques) are lost or shifted
//      when EAGER_DROP_KEYS have been deleted,
//   4. thuytien-ways.ts stays decoupled from thuytien.ts / thuytien-dragon.ts in src/geo/city-roads.ts.
// Run: npm run check:deferred
import fs from 'node:fs';
import * as THREE from 'three';
import { loadData } from '../lib/data.mjs';

const ctx2d = new Proxy(
  {},
  {
    get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {}, data: new Uint8ClampedArray(4) })),
    set: (t, k, v) => ((t[k] = v), true),
  },
);
Object.assign(globalThis, {
  innerWidth: 1280,
  innerHeight: 800,
  devicePixelRatio: 1,
  window: globalThis,
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  location: { search: '?keepgeo', hash: '' },
  localStorage: { getItem: () => null, setItem() {} },
  document: { createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => ctx2d }) },
});

const root = new URL('../../', import.meta.url);
const srcUrl = (p) => new URL('src/' + p, root).href;

const t0 = performance.now();
const fails = [];

// 1. Static source guards on main.ts and city-roads.ts
const mainSrc = fs.readFileSync(new URL('src/main.ts', root), 'utf8');
const deferredCallIdx = mainSrc.indexOf('buildDeferredPlaces(');
if (deferredCallIdx < 0) {
  fails.push('src/main.ts does not call buildDeferredPlaces(...)');
} else {
  const beforeDeferred = mainSrc.slice(0, deferredCallIdx);
  for (const m of beforeDeferred.matchAll(/delete\s+data\.(\w+)/g)) {
    fails.push(`src/main.ts prematurely deletes data.${m[1]} before buildDeferredPlaces`);
  }
  if (!beforeDeferred.includes('EAGER_DROP_KEYS')) {
    fails.push('src/main.ts must use EAGER_DROP_KEYS for pre-deferred heap cleanup');
  }
}

const cityRoadsSrc = fs.readFileSync(new URL('src/geo/city-roads.ts', root), 'utf8');
if (/from\s+['"]\.\.\/landmarks\/thuytien\.ts['"]/.test(cityRoadsSrc)) {
  fails.push('src/geo/city-roads.ts still eagerly imports ../landmarks/thuytien.ts instead of thuytien-ways.ts');
}

// 2. Load data and set up browser-like eager replica list (excluding LAZY_PLACE_IDS)
const baseData = loadData({ tiles: false });
const { initTerrain } = await import(srcUrl('geo/terrain.ts'));
const { initDistricts } = await import(srcUrl('geo/districts.ts'));
initTerrain(baseData);
initDistricts(baseData);

const {
  LAZY_PLACE_IDS,
  EAGER_DROP_KEYS,
  DEFERRED_DROP_KEYS,
  placeClearings,
  buildDeferredPlaces,
} = await import(srcUrl('landmarks/places/index.ts'));

// Ensure EAGER_DROP_KEYS and DEFERRED_DROP_KEYS are disjoint
for (const k of DEFERRED_DROP_KEYS) {
  if (EAGER_DROP_KEYS.includes(k)) {
    fails.push(`key "${k}" appears in both EAGER_DROP_KEYS and DEFERRED_DROP_KEYS`);
  }
}

// Hand only non-lazy places to globalThis.__hueReplicas, mirroring browser startup
globalThis.__hueReplicas = {};
for (const f of fs.readdirSync(new URL('src/landmarks/places/', root)).filter((f) => f.endsWith('.ts') && f !== 'index.ts')) {
  const mod = await import(srcUrl('landmarks/places/' + f));
  const normId = String(mod.id || '').normalize('NFC');
  if (!LAZY_PLACE_IDS.has(normId)) {
    globalThis.__hueReplicas[f] = mod;
  }
}

// Verify xatac clearing is still present even when xatac is deferred
const clearings = placeClearings(baseData);
const hasXatacClearing = clearings.some((ring) =>
  ring.some(([x, z]) => Math.hypot(x + 1880.5, z - 427.1) < 60),
);
if (!hasXatacClearing) {
  fails.push('placeClearings(data) is missing Đàn Xã Tắc clearing when xatac is deferred');
}

function summarizeDeferredGroup(group) {
  const byPlace = new Map();
  for (const child of group.children) {
    if (child.isMesh && typeof child.name === 'string' && child.name.startsWith('deferred-')) {
      const id = child.name.slice('deferred-'.length).normalize('NFC');
      const pos = child.geometry?.attributes?.position;
      const verts = pos ? pos.count : 0;
      let checksum = 0;
      if (pos) {
        const arr = pos.array;
        for (let i = 0; i < arr.length; i += 3) {
          checksum += Math.round(arr[i] * 100) + 3 * Math.round(arr[i + 1] * 100) + 7 * Math.round(arr[i + 2] * 100);
        }
      }
      const entry = byPlace.get(id) || { verts: 0, tris: 0, checksum: 0, meshCount: 0, dynChildren: 0 };
      entry.verts += verts;
      entry.tris += Math.floor(verts / 3);
      entry.checksum += checksum;
      entry.meshCount += 1;
      byPlace.set(id, entry);
    } else {
      const id = String(child.userData?.landmark || 'unknown').normalize('NFC');
      const entry = byPlace.get(id) || { verts: 0, tris: 0, checksum: 0, meshCount: 0, dynChildren: 0 };
      entry.dynChildren += 1;
      byPlace.set(id, entry);
    }
  }
  return byPlace;
}

// Run A: full `data` intact (reference)
const dataA = structuredClone(baseData);
const groupA = new THREE.Group();
const replicasA = { update() {}, _deferredLive: [] };
await buildDeferredPlaces(dataA, groupA, replicasA);
const summaryA = summarizeDeferredGroup(groupA);

// Run B: production simulation — delete exact EAGER_DROP_KEYS before running buildDeferredPlaces
const dataB = structuredClone(baseData);
for (const k of EAGER_DROP_KEYS) {
  delete dataB[k];
}
const groupB = new THREE.Group();
const replicasB = { update() {}, _deferredLive: [] };
await buildDeferredPlaces(dataB, groupB, replicasB);
const summaryB = summarizeDeferredGroup(groupB);

let totalVerts = 0;
let totalDyn = 0;
for (const id of LAZY_PLACE_IDS) {
  const ref = summaryA.get(id);
  const prod = summaryB.get(id);
  if (!ref || ref.verts === 0 || ref.meshCount !== 1) {
    fails.push(`${id}: reference build produced ${ref ? `${ref.verts} verts across ${ref.meshCount} mesh(es)` : 'nothing'}`);
    continue;
  }
  totalVerts += prod ? prod.verts : 0;
  totalDyn += prod ? prod.dynChildren : 0;
  if (!prod) {
    fails.push(`${id}: missing completely in production simulation (expected ${ref.verts} verts, ${ref.dynChildren} dynamic children)`);
    continue;
  }
  if (prod.verts !== ref.verts || prod.tris !== ref.tris) {
    fails.push(`${id}: vertex/tri mismatch after eager delete — got ${prod.verts} verts (${prod.tris} tris), expected ${ref.verts} verts (${ref.tris} tris)`);
  } else if (prod.checksum !== ref.checksum) {
    fails.push(`${id}: geometry position checksum changed after eager delete (${prod.checksum} vs ${ref.checksum})`);
  }
  if (prod.dynChildren !== ref.dynChildren) {
    fails.push(`${id}: dynamic child count mismatch after eager delete — got ${prod.dynChildren}, expected ${ref.dynChildren}`);
  }
  if (prod.meshCount !== 1) {
    fails.push(`${id}: expected 1 frustum-culled mesh ('deferred-${id}'), got ${prod.meshCount}`);
  }
}

const ms = Math.round(performance.now() - t0);
console.log(
  `check:deferred — ${LAZY_PLACE_IDS.size} deferred places, ${totalVerts} vertices (${Math.floor(totalVerts / 3)} tris), ${totalDyn} dynamic children verified against full-data reference (${ms} ms)`,
);
for (const f of fails) console.log('  FAIL ' + f);
process.exit(fails.length ? 1 : 0);
