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

export async function buildAppScene() {
  const b = await buildScene({ app: true });
  if (b.errors.length) throw new Error('scene build failed: ' + b.errors.join('; '));
  const scene = new THREE.Scene();
  scene.add(b.world.group, b.dyn);
  return { ...b, scene };
}

export async function buildLabelTops(file = new URL('../public/data/places.json', import.meta.url)) {
  const { scene, data, groundY } = await buildAppScene();
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
