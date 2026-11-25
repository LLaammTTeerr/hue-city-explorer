import { populate, finishStructures } from '../geo/city.ts';
import { buildTruongTien } from './truongtien.ts';
import { buildCitadel } from './citadel.ts';
import { buildBoats, buildLanterns } from './boats.ts';
import { buildCivic } from './civic.ts';
import { buildBoardwalk } from './boardwalk.ts';
import { buildRiverLights } from './riverlights.ts';
import { buildLotus, buildTraffic, buildStreetLife } from './life.ts';
import { buildFloatingRestaurants } from './floating.ts';
import { buildPlaces } from './places/index.ts';
import { buildCourtyard } from './courtyard.ts';

// Every landmark, in one sequence, for the browser (src/main.js) and the headless geometry checks
// (scripts/lib/scene.mjs: check-overlap, check-burial, check-heights, check-joints). A new landmark goes in here and
// nowhere else, so the city and the checks always see the same models.
//
//   world   what buildCity returned: world.structures is the shared static buffer the models write into, world.group
//           takes the buildings, houses and trees populate adds and, with `finish`, the merged structures mesh
//   group   the dynamic THREE.Group for lights and moving parts
//   step(name, run)   optional observer, called once per named build step; it must call run() (the checks record what
//           S and the groups gained around it, and catch a throw so one broken builder does not hide the rest).
//           The default just runs it.
//   onPlace(id, [from, to], firstChild)   optional, passed to buildPlaces so the checks can tell the replicas apart
//   skip    names of steps to leave out (e.g. one that needs a browser-only resource)
//   finish  merge the static buffer into its mesh once populate is done (the browser; the checks read the buffer)
//
// The order matters: populate keeps buildings, houses and trees off the ground every model before it covers, and the
// moving things (boats, lanterns, lotus, traffic, street life) come after the static buffer is closed.
// Returns the handles the browser animates every frame.
export function buildLandmarks(data, world, group, { step = (name, run) => run(), onPlace = null, skip = [], finish = true } = {}) {
  const S = world.structures;
  const run = (name, f) => {
    if (skip.includes(name)) return undefined;
    let r;
    step(name, () => { r = f(); });
    return r;
  };
  const bridge = run('truongtien', () => buildTruongTien(data, S, group));
  const citadel = run('citadel', () => buildCitadel(data, S, group));
  run('civic', () => buildCivic(data, S));
  run('boardwalk', () => buildBoardwalk(data, S, group));
  run('riverlights', () => buildRiverLights(data, S, group)); // lamps along the Hương's banks and walkways (issue #21)
  const floating = run('floating', () => buildFloatingRestaurants(data, S, group)); // nhà hàng nổi Sông Hương, the lotus by Trường Tiền
  const replicas = run('replicas', () => buildPlaces(data, S, group, onPlace)); // per-place replica models in src/landmarks/places/
  run('courtyard', () => buildCourtyard(data, S)); // bronze cannons and cauldrons of the Imperial City's courts (courtyard.js)
  run('populate', () => populate(world, data)); // buildings, houses and trees, kept off the ground the landmark models cover
  if (finish) finishStructures(S, world.group);
  const boats = run('boats', () => buildBoats(data, group, S)); // S, closed: the fleet keeps clear of the bridges and landings in it
  if (finish) S.release(); // the structures mesh has its own copy and nothing reads S from here on (~170 MB)
  const lanterns = run('lanterns', () => buildLanterns(data, group)); // hoa đăng drifting past the Citadel after dark
  run('lotus', () => buildLotus(data, group));
  const traffic = run('traffic', () => buildTraffic(data, group));
  const street = run('street', () => buildStreetLife(data, group));
  return { bridge, citadel, extraGlows: [], floating, replicas, boats, lanterns, traffic, street };
}
