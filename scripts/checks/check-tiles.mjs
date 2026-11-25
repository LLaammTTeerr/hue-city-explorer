// The trees and infill houses that hue.json leaves to the tiles (see "split" in build-data.mjs) must not change what
// any builder sees: a place builder that reads or edits data.trees or data.infill has to find every record of its
// ground in hue.json. This builds the scene twice, headless, in two processes: the app's way (hue.json, then the tiles
// through world.addTile) and from one data set with every tile merged in (the way it was built before the split), and
// compares
//   - every source's share of the static geometry (vertex count and a checksum of its positions) and object count,
//   - the trees and houses handed to the planters (as multisets of records): populate's own tests depend only on a
//     record's position and on the models' ground, which the first comparison covers.
// Run: npm run check:tiles
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

if (process.argv.includes('--digest')) {
  const whole = process.argv[process.argv.indexOf('--digest') + 1] === 'whole';
  const { buildScene } = await import('../lib/scene.mjs');
  const { data, tiles, S, sources, errors } = await buildScene({ whole });
  const geo = {};
  for (const { name, range: [a, b], objs } of sources) {
    if (name === 'tiles') continue;
    let sum = 0;
    for (let v = a; v < b; v++) sum += Math.round(S.pos[v * 3] * 100) + 3 * Math.round(S.pos[v * 3 + 1] * 100) + 7 * Math.round(S.pos[v * 3 + 2] * 100);
    geo[name] = [b - a, sum, name === 'populate' ? 0 : objs.length]; // populate's instanced meshes: split by tile on one side
  }
  const recs = (arrs, n) => {
    const out = [];
    for (const a of arrs) for (let i = 0; i + n <= a.length; i += n) out.push(a.slice(i, i + n).join(','));
    return out.sort();
  };
  const hash = (l) => createHash('sha1').update(l.join(';')).digest('hex');
  const trees = recs([data.trees || [], ...tiles.map((t) => t.trees)], 4);
  const infill = recs([data.infill || [], ...tiles.map((t) => t.infill)], 8);
  process.stdout.write('\n' + JSON.stringify({ geo, errors, trees: [trees.length, hash(trees)], infill: [infill.length, hash(infill)], tiles: tiles.length }));
  process.exit(0);
}

const t0 = Date.now();
const run = (m) => {
  const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--digest', m], { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
  return JSON.parse(r.stdout.slice(r.stdout.lastIndexOf('\n{"geo"') + 1));
};
const app = run('split'), whole = run('whole');
const fails = [];
for (const name of new Set([...Object.keys(app.geo), ...Object.keys(whole.geo)])) {
  const a = app.geo[name], w = whole.geo[name];
  if (!a || !w || a.join() !== w.join())
    fails.push(`${name}: ${a ? `${a[0]} vertices, ${a[2]} objects` : 'missing'} with tiles vs ${w ? `${w[0]} vertices, ${w[2]} objects` : 'missing'} whole (or the positions differ)`);
}
for (const k of ['trees', 'infill'])
  if (app[k].join() !== whole[k].join()) fails.push(`${k} handed to the planters: ${app[k][0]} with tiles vs ${whole[k][0]} whole (or different records)`);
for (const e of new Set([...app.errors, ...whole.errors])) fails.push(e);
console.log(`check:tiles — ${app.tiles} tiles; ${Object.keys(app.geo).length} sources, ${app.trees[0]} trees, ${app.infill[0]} houses compared (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
for (const f of fails) console.log('  FAIL ' + f);
if (fails.length) console.log("  a place builder reads or edits trees or houses beyond PLACE_REACH of its place point: give that place file an `export const dataReach = <metres>` (or raise PLACE_REACH in build-data.mjs)");
process.exit(fails.length ? 1 : 0);
