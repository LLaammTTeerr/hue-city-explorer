// Label anchor heights and precomputed road/boat data. Builds the scene headless from public/data/hue.json + hue.bin,
// packs precomputed junction holes, slivers, lane dashes and boat routes directly into public/data/hue.bin, and writes
// each place's model top into public/data/places.json as `a` (world height in whole decimetres).
//
//   node scripts/build-label-tops.mjs     (run by build-data.mjs after it writes hue.json and places.json)
//   node scripts/checks/check-label-tops.mjs
import fs from 'node:fs';
import zlib from 'node:zlib';
import * as THREE from 'three';
import { buildScene } from './lib/scene.mjs';
import { modelTops } from './lib/label-tops.mjs';
import { encodeHueBin, decodeHueBin } from '../src/geo/codec.ts';

export async function buildAppScene(opts = {}) {
  const b = await buildScene({ app: true, ...opts });
  if (b.errors.length) throw new Error('scene build failed: ' + b.errors.join('; '));
  const scene = new THREE.Scene();
  scene.add(b.world.group, b.dyn);
  return { ...b, scene };
}

function encodePrecomputed(world, boats) {
  const r2 = (v) => Math.round(v * 100) / 100;
  const { holes = [], slivers = [], dashes = [] } = world.marks || {};
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
  const outDashes = dashes.map((d) => [d.id, d.s0]);
  return { holes: outHoles, holeCells, slivers: outSlivers, boatRoutes, dashes: outDashes };
}

export async function buildLabelTops(file = new URL('../public/data/places.json', import.meta.url)) {
  const hueBinFile = new URL('../public/data/hue.bin', import.meta.url);
  const hueFile = new URL('../public/data/hue.json', import.meta.url);
  // Read untouched binary payload before buildAppScene mutates data.bld / data.trees in-memory
  const unmutatedBin = fs.existsSync(hueBinFile) ? decodeHueBin(zlib.gunzipSync(fs.readFileSync(hueBinFile))) : null;

  const { scene, data, groundY, world, boats } = await buildAppScene({ freshPrecompute: true });
  const precomputed = encodePrecomputed(world, boats);

  if (unmutatedBin) {
    unmutatedBin.precomputed = precomputed;
    const gz = zlib.gzipSync(encodeHueBin(unmutatedBin), { level: 9 });
    fs.writeFileSync(hueBinFile, gz);
    const rawHue = JSON.parse(fs.readFileSync(hueFile));
    if ('precomputed' in rawHue) {
      delete rawHue.precomputed;
      fs.writeFileSync(hueFile, JSON.stringify(rawHue));
    }
    console.log('precomputed:', precomputed.holes.length, 'holes,', precomputed.slivers.length, 'slivers,', precomputed.dashes.length, 'dashes,', precomputed.boatRoutes.length, 'boat routes → public/data/hue.bin (' + (gz.length / 1e6).toFixed(2) + ' MB)');
  } else {
    const rawHue = JSON.parse(fs.readFileSync(hueFile));
    rawHue.precomputed = precomputed;
    fs.writeFileSync(hueFile, JSON.stringify(rawHue));
    console.log('precomputed:', precomputed.holes.length, 'holes,', precomputed.slivers.length, 'slivers,', precomputed.boatRoutes.length, 'boat routes → public/data/hue.json');
  }

  const index = JSON.parse(fs.readFileSync(file));
  const tops = modelTops(scene, data.places, THREE);
  const byId = new Map(data.places.map((p, i) => [p.id, { p, top: tops[i] }]));
  let n = 0;
  for (const p of index.places) {
    delete p.a;
    const { p: built, top } = byId.get(p.id) || {};
    if (built && (built.x !== p.x || built.z !== p.z)) { console.log(`label tops: ${p.id} moved by its model to ${built.x},${built.z}`); p.x = built.x; p.z = built.z; }
    if (top != null && top > groundY(p.x / 10, p.z / 10) + 2) { p.a = Math.round(top * 10); n++; }
  }
  fs.writeFileSync(file, JSON.stringify(index));
  console.log('label tops:', n, 'of', index.places.length, 'places stand on a model; wrote', file instanceof URL ? 'public/data/places.json' : file);
}

if (import.meta.url === `file://${process.argv[1]}`) await buildLabelTops();
