// Label anchor heights for the place index. Builds the scene headless from public/data/hue.json, as the browser
// builds it, finds the highest point of the model over each place (lib/label-tops.mjs) and writes it into
// public/data/places.json as `a`: world height in whole decimetres. Places with nothing standing at least 2 m over
// their ground (water, islands, streets, districts) get no `a`, and src/ui/labels.js keeps their hand-given `h`.
//
//   node scripts/build-label-tops.mjs     (run by build-data.mjs after it writes hue.json and places.json)
//   node scripts/check-label-tops.mjs     checks the shipped values against a fresh scene
import fs from 'node:fs';
import * as THREE from 'three';
import { buildScene } from './lib/scene.mjs';
import { modelTops } from './lib/label-tops.mjs';

export async function buildAppScene(opts = {}) {
  const b = await buildScene({ app: true, ...opts });
  if (b.errors.length) throw new Error('scene build failed: ' + b.errors.join('; '));
  const scene = new THREE.Scene();
  scene.add(b.world.group, b.dyn);
  return { ...b, scene };
}

function encodePrecomputed(world, boats) {
  const r2 = (v) => Math.round(v * 100) / 100;
  const { holes = [], slivers = [] } = world.marks || {};
  const byRow = new Map();
  const outHoles = holes.map((h) => {
    for (const [ci, cj] of h.cells || []) {
      let s = byRow.get(cj);
      if (!s) { s = new Set(); byRow.set(cj, s); }
      s.add(ci);
    }
    const flatRects = [];
    for (const [x0, x1, z0, z1] of h.rects || []) flatRects.push(r2(x0), r2(x1), r2(z0), r2(z1));
    return [h.c, r2(h.x), r2(h.z), r2(h.area || 0), flatRects];
  });
  const holeCells = [];
  for (const [cj, cols] of byRow) {
    const xs = [...cols].sort((a, b) => a - b);
    for (let i = 0; i < xs.length;) {
      let end = i;
      while (end + 1 < xs.length && xs[end + 1] === xs[end] + 1) end++;
      holeCells.push(cj, xs[i], xs[end]);
      i = end + 1;
    }
  }
  const outSlivers = slivers.map((s) => [
    s.c,
    s.pts.flatMap(([x, z]) => [r2(x), r2(z)]),
    s.ws.map(r2),
  ]);
  const boatRoutes = (boats?.routes || []).map(([lane, lo, hi]) => [r2(lane), r2(lo), r2(hi)]);
  return { holes: outHoles, holeCells, slivers: outSlivers, boatRoutes };
}

export async function buildLabelTops(file = new URL('../public/data/places.json', import.meta.url)) {
  const { scene, data, groundY, world, boats } = await buildAppScene({ freshPrecompute: true });
  const hueFile = new URL('../public/data/hue.json', import.meta.url);
  const rawHue = JSON.parse(fs.readFileSync(hueFile));
  rawHue.precomputed = encodePrecomputed(world, boats);
  fs.writeFileSync(hueFile, JSON.stringify(rawHue));
  console.log('precomputed:', rawHue.precomputed.holes.length, 'holes,', rawHue.precomputed.slivers.length, 'slivers,', rawHue.precomputed.boatRoutes.length, 'boat routes → public/data/hue.json');
  const index = JSON.parse(fs.readFileSync(file));
  const tops = modelTops(scene, data.places, THREE);
  const byId = new Map(data.places.map((p, i) => [p.id, { p, top: tops[i] }]));
  let n = 0;
  for (const p of index.places) {
    delete p.a;
    const { p: built, top } = byId.get(p.id) || {};
    // a replica may move its place record onto the model while it builds (places/vongcanh.js): the index takes the
    // moved point, so the tag, the card's flight and the 2D map all use the place the model stands on
    if (built && (built.x !== p.x || built.z !== p.z)) { console.log(`label tops: ${p.id} moved by its model to ${built.x},${built.z}`); p.x = built.x; p.z = built.z; }
    if (top != null && top > groundY(p.x / 10, p.z / 10) + 2) { p.a = Math.round(top * 10); n++; }
  }
  fs.writeFileSync(file, JSON.stringify(index));
  console.log('label tops:', n, 'of', index.places.length, 'places stand on a model; wrote', file instanceof URL ? 'public/data/places.json' : file);
}

if (import.meta.url === `file://${process.argv[1]}`) await buildLabelTops();
