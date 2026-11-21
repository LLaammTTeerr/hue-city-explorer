import { populate, finishStructures } from '../geo/city.js';
import { buildTruongTien } from './truongtien.js';
import { buildCitadel, buildMarket, buildThienMu } from './citadel.js';
import { buildBoats, buildLanterns } from './boats.js';
import { buildNguyenHoang, buildQuocHocGate } from './more.js';
import { buildCivic } from './civic.js';
import { buildSouth } from './south.js';
import { buildTombs } from './tombs.js';
import { buildBiaQuocHoc } from './memorial.js';
import { buildBoardwalk } from './boardwalk.js';
import { buildRiverLights } from './riverlights.js';
import { buildLotus, buildTraffic, buildStreetLife } from './life.js';
import { buildFloatingRestaurants } from './floating.js';
import { buildPlaces } from './places/index.js';
import { buildCourtyard } from './courtyard.js';

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
  run('market', () => buildMarket(data, S, group));
  run('thienmu', () => buildThienMu(data, S, group));
  const extraGlows = run('nguyenhoang', () => buildNguyenHoang(data, S, group));
  run('quochocgate', () => buildQuocHocGate(data, S));
  run('civic', () => buildCivic(data, S));
  run('biaquochoc', () => buildBiaQuocHoc(data, S));
  run('boardwalk', () => buildBoardwalk(data, S, group));
  run('riverlights', () => buildRiverLights(data, S, group)); // lamps along the Hương's banks and walkways (issue #21)
  const floating = run('floating', () => buildFloatingRestaurants(data, S, group)); // nhà hàng nổi Sông Hương, the lotus by Trường Tiền
  run('south', () => buildSouth(data, S));
  run('tombs', () => buildTombs(data, S));
  const replicas = run('replicas', () => buildPlaces(data, S, group, onPlace)); // per-place replica models in src/landmarks/places/
  run('courtyard', () => buildCourtyard(data, S)); // bronze cannons and cauldrons of the Imperial City's courts (courtyard.js)
  run('populate', () => populate(world, data)); // buildings, houses and trees, kept off the ground the landmark models cover
  if (finish) finishStructures(S, world.group);
  const boats = run('boats', () => buildBoats(data, group));
  const lanterns = run('lanterns', () => buildLanterns(data, group)); // hoa đăng drifting past the Citadel after dark
  run('lotus', () => buildLotus(data, group));
  const traffic = run('traffic', () => buildTraffic(data, group));
  const street = run('street', () => buildStreetLife(data, group));
  return { bridge, citadel, extraGlows, floating, replicas, boats, lanterns, traffic, street };
}
