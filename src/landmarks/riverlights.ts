import { KIND, hex } from '../geo/buf.ts';
import { glowPoints } from '../geo/materials.ts';
import { LAND_Y } from '../config.ts';
import { rise } from '../geo/terrain.ts';
import { ownLit } from '../geo/bridges.ts';
import { placeLightAreas } from './places/index.ts';

// Riverside lights along the Hương (issue #21). Where they stand comes from the data (data.riverLamps, built in
// scripts/build-data.mjs from the river's own bank and the OSM footways along it):
//   type 0: lamp posts on the embankments, every ~24 m, a few metres in from the water
//   type 1: low garden lights along the riverside walkways and lanes, every ~16 m
// The floodlit facades facing the river are the third part; they are painted by the city shader (KIND_FLOOD).
// Illustrative: the lamp designs. The posts are part of the static structures (one mesh, there by day too); the lights
// are two point clouds, shown after dark only, and drawn into the river's reflection.
const POST_H = 4.2, BOLLARD_H = 0.8;

export function buildRiverLights(data, S, group) {
  const a = data.riverLamps;
  if (!Array.isArray(a) || a.length < 3) return { glows: [] };
  const iron = hex('#2f3833'), glass = hex('#f4e3b6'), stone = hex('#8d867a');
  const post = { p: [], c: [] }, low = { p: [], c: [] };
  const keepKind = S.kind;
  S.kind = KIND.PLAIN;
  // walks a place model lights with its own lamps (lightAreas in places/index.js)
  const own = placeLightAreas(data);
  const inside = (x, z, r) => {
    let c = false;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      if ((r[i][1] > z) !== (r[j][1] > z) && x < ((r[j][0] - r[i][0]) * (z - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) c = !c;
    }
    return c;
  };
  for (let i = 0; i + 2 < a.length; i += 3) {
    const x = a[i] / 10, z = a[i + 1] / 10, type = a[i + 2];
    if (type === 0 && ownLit(data, x, z)) continue; // beside a bridge's own lamp standards (geo/bridges.js `lit`)
    if (own.some((r) => inside(x, z, r))) continue; // inside a place's own lit walk (lightAreas)
    const y = LAND_Y + rise(x, z);
    const f = 0.92 + 0.08 * (((i / 3) * 7) % 5) / 4; // bulbs never quite alike
    if (type === 0) {
      // a cast-iron post on a stone foot, a lantern on top
      S.box(x, z, y, y + 0.45, 0.42, 0.42, 0, stone);
      S.cyl(x, z, y + 0.45, y + POST_H - 0.45, 0.09, 0.06, 5, iron, { cap: false });
      S.cyl(x, z, y + POST_H - 0.45, y + POST_H, 0.2, 0.26, 6, glass);
      S.cyl(x, z, y + POST_H, y + POST_H + 0.14, 0.32, 0.06, 6, iron);
      post.p.push(x, y + POST_H - 0.2, z);
      post.c.push(1.0 * f, 0.8 * f, 0.5 * f);
    } else {
      S.box(x, z, y, y + BOLLARD_H, 0.16, 0.16, 0, iron, { top: glass });
      low.p.push(x, y + BOLLARD_H + 0.05, z);
      low.c.push(1.0 * f, 0.72 * f, 0.4 * f);
    }
  }
  S.kind = keepKind;
  const glows = [];
  for (const [set, size, boost] of [[post, 8.5, 1.0], [low, 3.6, 0.75]] as [typeof post, number, number][]) {
    if (!set.p.length) continue;
    const pts = glowPoints(set.p, set.c, size);
    pts.material.uniforms.uBoost.value = boost;
    pts.userData.glow = true; // main.js feeds its pixel scale and shows it after dark
    pts.name = 'riverLights';
    group.add(pts);
    glows.push(pts);
  }
  return { glows };
}
