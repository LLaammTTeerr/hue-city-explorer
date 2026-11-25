import { KIND, hex } from '../geo/buf.ts';
import { glowPoints } from '../geo/materials.ts';
import { LAND_Y } from '../config.ts';
import { rise } from '../geo/terrain.ts';
import { ownLit } from '../geo/bridges.ts';
import { placeLightAreas } from './places/index.ts';

// Riverside lights along the Hương (issue #21):
//   type 0: lamp posts on the embankments, every ~24 m, a few metres in from the water
//   type 1: low garden lights along the riverside walkways and lanes, every ~16 m
const POST_H = 4.2;
const BOLLARD_H = 0.8;

function pointInRing(x, z, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    if ((ring[i][1] > z) !== (ring[j][1] > z) && x < ((ring[j][0] - ring[i][0]) * (z - ring[i][1])) / (ring[j][1] - ring[i][1]) + ring[i][0]) {
      inside = !inside;
    }
  }
  return inside;
}

export function buildRiverLights(data, S, group) {
  const lamps = data.riverLamps;
  if (!Array.isArray(lamps) || lamps.length < 3) return { glows: [] };
  const iron = hex('#2f3833'), glass = hex('#f4e3b6'), stone = hex('#8d867a');
  const postSet = { pos: [], col: [] };
  const lowSet = { pos: [], col: [] };
  const keepKind = S.kind;
  S.kind = KIND.PLAIN;
  const ownAreas = placeLightAreas(data);

  for (let i = 0; i + 2 < lamps.length; i += 3) {
    const x = lamps[i] / 10, z = lamps[i + 1] / 10, type = lamps[i + 2];
    if (type === 0 && ownLit(data, x, z)) continue;
    if (ownAreas.some((ring) => pointInRing(x, z, ring))) continue;
    const y = LAND_Y + rise(x, z);
    const tint = 0.92 + 0.08 * (((i / 3) * 7) % 5) / 4;
    if (type === 0) {
      S.box(x, z, y, y + 0.45, 0.42, 0.42, 0, stone);
      S.cyl(x, z, y + 0.45, y + POST_H - 0.45, 0.09, 0.06, 5, iron, { cap: false });
      S.cyl(x, z, y + POST_H - 0.45, y + POST_H, 0.2, 0.26, 6, glass);
      S.cyl(x, z, y + POST_H, y + POST_H + 0.14, 0.32, 0.06, 6, iron);
      postSet.pos.push(x, y + POST_H - 0.2, z);
      postSet.col.push(1.0 * tint, 0.8 * tint, 0.5 * tint);
    } else {
      S.box(x, z, y, y + BOLLARD_H, 0.16, 0.16, 0, iron, { top: glass });
      lowSet.pos.push(x, y + BOLLARD_H + 0.05, z);
      lowSet.col.push(1.0 * tint, 0.72 * tint, 0.4 * tint);
    }
  }
  S.kind = keepKind;

  const glows = [];
  for (const [set, size, boost] of [[postSet, 8.5, 1.0], [lowSet, 3.6, 0.75]] as [typeof postSet, number, number][]) {
    if (!set.pos.length) continue;
    const pts = glowPoints(set.pos, set.col, size);
    pts.material.uniforms.uBoost.value = boost;
    pts.userData.glow = true;
    pts.name = 'riverLights';
    group.add(pts);
    glows.push(pts);
  }
  return { glows };
}
