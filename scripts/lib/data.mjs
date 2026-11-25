// The bundle as the scripts read it. hue.json holds the metadata and polygons; hue.bin holds the gzipped columnar
// binary arrays (terrain heights, first-frame trees & infill); the rest are in tiles (public/data/tiles/, listed in
// meta.tiles; see "split" in build-data.mjs).
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { decodeHueBin, decodeTileBin } from '../../src/geo/codec.ts';

const root = new URL('../../', import.meta.url);
const dataDir = new URL('public/data/', root);

export function readTile(f, dir = dataDir) {
  const fileUrl = dir instanceof URL ? new URL(f, dir) : path.join(dir, f);
  const raw = fs.readFileSync(fileUrl);
  if (f.endsWith('.bin')) return decodeTileBin(zlib.gunzipSync(raw));
  return JSON.parse(raw);
}

export function hydrateHue(data, dir = dataDir) {
  if (data.meta?.bin) {
    const fileUrl = dir instanceof URL ? new URL(data.meta.bin, dir) : path.join(dir, data.meta.bin);
    const { h, trees, infill } = decodeHueBin(zlib.gunzipSync(fs.readFileSync(fileUrl)));
    if (data.terrain) data.terrain.h = h;
    data.trees = trees;
    data.infill = infill;
  }
  return data;
}

// every tile, in load order
export const readTiles = (data, dir = dataDir) => (data.meta.tiles || []).map((t) => readTile(t.f, dir));

function concatInt32(parts) {
  let len = 0;
  for (const p of parts) len += p.length;
  const out = new Int32Array(len);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

// data with every tile's trees and infill appended to its own arrays (for the data checks, which test every record).
// The near-water counts then no longer describe the arrays: do not build a scene from it (scene.mjs adds the tiles the
// way the app does, through city.js addTile).
export function withTiles(data, read = readTile) {
  const treeParts = [data.trees || []];
  const infillParts = [data.infill || []];
  for (const t of data.meta.tiles || []) {
    const b = read(t.f);
    treeParts.push(b.trees);
    infillParts.push(b.infill);
  }
  data.trees = concatInt32(treeParts);
  data.infill = concatInt32(infillParts);
  data.meta.tiles = [];
  return data;
}

export const loadData = ({ tiles = true, file = null } = {}) => {
  const f = file || new URL('hue.json', dataDir);
  const dir = file ? path.dirname(file) : dataDir;
  const data = hydrateHue(JSON.parse(fs.readFileSync(f)), dir);
  return tiles ? withTiles(data, (tf) => readTile(tf, dir)) : data;
};
