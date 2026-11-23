import * as THREE from 'three';
import { KIND } from '../../geo/buf.js';

// Replica models, one file per place: src/landmarks/places/<slug>.js, picked up here without being listed.
//
// A place file exports
//   id     the place's id in hue.json's `places` (e.g. 'kydai', 'gate:Cửa Hậu')
//   build({ data, S, group, place, THREE })
//          S is the shared static buffer (world.structures), group the dynamic THREE.Group for lights and moving
//          parts, place the record from data.places with x/z already in metres. It may return
//          { update(time, glow, rain) } to be called every frame.
//          Flags (and other moving parts in ../anim.js) animate on the shared clock and wind; they need no update().
//   joinRoofs  optional, false to opt out. A model's hip roofs that stand side by side (a double hall, halls end to
//          end, a gallery against a hall) meet in valley gutters instead of running through each other: build runs
//          inside S.joined (geo/buf.js), so its roofs are drawn after the rest of it and an index range it reads
//          (S.paved, S.noCover) does not include them.
// The older builder that drew the same place checks `replaced(id)` and leaves it out, so the two never overlap.
// Vite collects the replica files; plain node (scripts/check-heights.mjs) imports them itself and hands them over
// on globalThis.__hueReplicas. The list is read on first use, not at import: builders (and city.js through
// citadel.js) import this file before node has handed the replicas over, and place files may import builders.
// (Vite rewrites only the glob call itself, so test the node hand-over first, never import.meta.glob.)
let list = null, ids = null;
function load() {
  if (list) return;
  const mods = globalThis.__hueReplicas || import.meta.glob(['./*.js', '!./index.js'], { eager: true });
  list = Object.values(mods).filter((m) => m && m.id && typeof m.build === 'function');
  ids = new Set(list.map((m) => String(m.id).normalize('NFC')));
}

export const replaced = (id) => { load(); return ids.has(String(id).normalize('NFC')); };

// A place may also export ownsMapped(ring): true for a mapped building outline (data.bld, scene metres) that the
// place's model draws itself, so geo/city.js leaves it out even where the model's roofs do not cover it.
export function placeOwns(ring) {
  load();
  return list.some((m) => typeof m.ownsMapped === 'function' && m.ownsMapped(ring));
}

// A place that models a bridge deck may also export deckEnds(data): its end lines, [{ p, u, hw, reach }] (p on the
// deck's axis at the end, u the unit vector out of the deck, hw the half width, reach how far past the end a street
// may start and still be an approach). geo/city.js cuts the approach streets on those lines; check-joints tests them.
export function placeDeckEnds(data) {
  load();
  const out = [];
  for (const m of list) {
    if (typeof m.deckEnds !== 'function') continue;
    try { for (const e of m.deckEnds(data)) out.push({ ...e, id: m.id }); } catch (e) { console.warn(`deck ends of ${m.id}:`, e); }
  }
  return out;
}

// onEach(id, [from, to], firstChild): optional, for the headless checks, which tell the places apart
export function buildPlaces(data, S, group, onEach = null) {
  load();
  const live = [];
  for (const m of list) {
    const id = String(m.id).normalize('NFC');
    const p = (data.places || []).find((q) => String(q.id).normalize('NFC') === id);
    const place = p ? { ...p, x: p.x / 10, z: p.z / 10 } : null;
    const n0 = S.n, k0 = group ? group.children.length : 0; // on a throw, roll the shared buffer back so no half-built model is left behind
    try {
      let r;
      if (m.joinRoofs !== false) S.joined(() => { r = m.build({ data, S, group, place, THREE }); });
      else r = m.build({ data, S, group, place, THREE });
      if (r && typeof r.update === 'function') live.push(r);
    } catch (e) {
      S.n = n0;
      console.warn(`replica ${id} not built:`, e);
    }
    S.kind = KIND.PLAIN;
    S.base = 0;
    if (onEach) onEach(id, [n0, S.n], k0);
  }
  return { update(time, glow, rain) { for (const r of live) r.update(time, glow, rain); } };
}
