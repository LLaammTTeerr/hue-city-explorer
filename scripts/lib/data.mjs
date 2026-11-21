// The bundle as the scripts read it. hue.json holds the trees and infill houses of the first frame; the rest are in
// tiles (public/data/tiles/, listed in meta.tiles; see "split" in build-data.mjs).
import fs from 'node:fs';

const root = new URL('../../', import.meta.url);
const dataDir = new URL('public/data/', root);

export const readTile = (f) => JSON.parse(fs.readFileSync(new URL(f, dataDir)));

// every tile, in load order
export const readTiles = (data) => (data.meta.tiles || []).map((t) => readTile(t.f));

// data with every tile's trees and infill appended to its own arrays (for the data checks, which test every record).
// The near-water counts then no longer describe the arrays: do not build a scene from it (scene.mjs adds the tiles the
// way the app does, through city.js addTile).
export function withTiles(data, read = readTile) {
  for (const t of data.meta.tiles || []) {
    const b = read(t.f);
    data.trees = (data.trees || []).concat(b.trees);
    data.infill = (data.infill || []).concat(b.infill);
  }
  data.meta.tiles = [];
  return data;
}

export const loadData = ({ tiles = true } = {}) => {
  const data = JSON.parse(fs.readFileSync(new URL('hue.json', dataDir)));
  return tiles ? withTiles(data) : data;
};
