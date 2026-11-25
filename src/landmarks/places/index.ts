import * as THREE from 'three';
import polygonClipping from 'polygon-clipping';
import { Buf, KIND, unflat } from '../../geo/buf.ts';
import { cityMaterial } from '../../geo/materials.ts';
import { releaseAfterUpload } from '../../geo/release.ts';
import type { HueData, PlaceModule, PlaceUpdateHandle, Vec2 } from '../../types.ts';

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
// Distant places (> 1.8 km from the opening view, with no city/road/clearing hooks) are lazy-loaded after first-frame
// in browser builds so their JS and geometry stay off the critical path. Headless Node checks still load all places
// eagerly via globalThis.__hueReplicas.
const LAZY_PLACE_IDS = new Set([
  'thieutri', 'dongkhanh', 'hoquyen', 'gate:Cửa An Hòa', 'quantuong', 'gate:Cửa Hữu', 'aeon',
  'gate:Cửa Chánh Tây', 'gate:Cửa Hậu', 'khaidinh', 'benxenam', 'xatac', 'benxebac', 'gate:Cửa Kẻ Trài', 'thuytien',
].map((id) => id.normalize('NFC')));

let list: PlaceModule[] | null = null, ids: Set<string> | null = null;
let lazyLoaders: Record<string, () => Promise<PlaceModule>> | null = null;
function load() {
  if (list) return;
  if (globalThis.__hueReplicas) {
    const mods = globalThis.__hueReplicas;
    list = (Object.values(mods) as PlaceModule[]).filter((m) => m && m.id && typeof m.build === 'function');
    ids = new Set(list.map((m) => String(m.id).normalize('NFC')));
    return;
  }
  const eagerMods = import.meta.glob([
    './*.ts',
    '!./index.ts',
    '!./thieutri.ts', '!./dongkhanh.ts', '!./hoquyen.ts', '!./gate-cua-an-hoa.ts',
    '!./quantuong.ts', '!./gate-cua-huu.ts', '!./aeon.ts', '!./gate-cua-chanh-tay.ts',
    '!./gate-cua-hau.ts', '!./khaidinh.ts', '!./benxenam.ts', '!./xatac.ts',
    '!./benxebac.ts', '!./gate-cua-ke-trai.ts', '!./thuytien.ts',
  ], { eager: true });
  lazyLoaders = import.meta.glob([
    './thieutri.ts', './dongkhanh.ts', './hoquyen.ts', './gate-cua-an-hoa.ts',
    './quantuong.ts', './gate-cua-huu.ts', './aeon.ts', './gate-cua-chanh-tay.ts',
    './gate-cua-hau.ts', './khaidinh.ts', './benxenam.ts', './xatac.ts',
    './benxebac.ts', './gate-cua-ke-trai.ts', './thuytien.ts',
  ], { eager: false }) as Record<string, () => Promise<PlaceModule>>;
  list = (Object.values(eagerMods) as PlaceModule[]).filter((m) => m && m.id && typeof m.build === 'function');
  ids = new Set([...list.map((m) => String(m.id).normalize('NFC')), ...LAZY_PLACE_IDS]);
}

export const replaced = (id: string): boolean => { load(); return ids.has(String(id).normalize('NFC')); };

// A place may also export ownsMapped(ring): true for a mapped building outline (data.bld, scene metres) that the
// place's model draws itself, so geo/city.js leaves it out even where the model's roofs do not cover it.
export function placeOwns(ring: Vec2[]): boolean {
  load();
  return list.some((m) => typeof m.ownsMapped === 'function' && m.ownsMapped(ring));
}

// A place that models a bridge deck may also export deckEnds(data): its end lines, [{ p, u, hw, reach }] (p on the
// deck's axis at the end, u the unit vector out of the deck, hw the half width, reach how far past the end a street
// may start and still be an approach). geo/city.js cuts the approach streets on those lines; check-joints tests them.
export function placeDeckEnds(data: HueData) {
  load();
  const out: Array<{ p: Vec2; u: Vec2; hw: number; reach: number; id: string }> = [];
  for (const m of list) {
    if (typeof m.deckEnds !== 'function') continue;
    try { for (const e of m.deckEnds(data)) out.push({ ...e, id: m.id }); } catch (e) { console.warn(`deck ends of ${m.id}:`, e); }
  }
  return out;
}

// A place may also export rampartCuts(data): rings ([[x, z], ...], metres) to leave out of the Citadel's rampart band
// (data.wall[0]), for a court sunk into a bastion beside a monument that stands on it (Kỳ Đài). They are cut before
// any place is built, so the rampart (kinhthanh.js) and the gates that find its faces all see the same band. A cut
// that would split the band in two is refused.
function withRampartCuts(data: HueData): HueData {
  const band = (data.wall || [])[0], cuts: Vec2[][] = [];
  for (const m of list) {
    if (typeof m.rampartCuts !== 'function') continue;
    try { cuts.push(...m.rampartCuts(data)); } catch (e) { console.warn(`rampart cuts of ${m.id}:`, e); }
  }
  if (!band || !cuts.length) return data;
  const close = (r: Vec2[]) => [...r, r[0]];
  try {
    const out = polygonClipping.difference(band.map((f: number[]) => close(unflat(f))), ...cuts.map((r) => [close(r)]));
    if (out.length !== 1) throw new Error(`the band would fall into ${out.length} pieces`);
    const flat = out[0].map((r) => r.slice(0, -1).flatMap(([x, z]) => [x * 10, z * 10]));
    return { ...data, wall: [flat, ...data.wall.slice(1)] };
  } catch (e) {
    console.warn('rampart cuts not applied:', e);
    return data;
  }
}

// A place that lights its own walk may also export lightAreas(data): rings ([[x, z], ...], metres) inside which the
// generic riverside lamps (riverlights.js, data.riverLamps) are left out, so its own lamp design is the only one there.
export function placeLightAreas(data: HueData): Vec2[][] {
  load();
  const out: Vec2[][] = [];
  for (const m of list) {
    if (typeof m.lightAreas !== 'function') continue;
    try { out.push(...m.lightAreas(data)); } catch (e) { console.warn(`light areas of ${m.id}:`, e); }
  }
  return out;
}

// A place that models paths OSM maps as ways (a gallery round a building, its steps) may export ownWays(data): a
// test on a data.roads record ([class, bridge, flat, ...]) that is true for the ways it draws itself. geo/city.js and
// landmarks/life.js leave those out of the street network, so no footway is laid at grade where the model stands.
export function placeOwnsWay(data: HueData): (road: any) => boolean {
  load();
  const tests: Array<(road: any) => boolean> = [];
  for (const m of list) {
    if (typeof m.ownWays !== 'function') continue;
    try { tests.push(m.ownWays(data)); } catch (e) { console.warn(`own ways of ${m.id}:`, e); }
  }
  return (r) => tests.some((t) => t(r));
}

// A place that lays its own ground flush with the land (a lawn, walks) may also export clearings(data): rings of
// [x, z] in model metres where geo/city.js draws none of the city's footways (class 5) or green patches (the ones
// whose middle lies inside) and plants no trees or houses. buildCity reads them before any model is built.
export function placeClearings(data: HueData): Vec2[][] {
  load();
  const out: Vec2[][] = [];
  for (const m of list) {
    if (typeof m.clearings !== 'function') continue;
    try { for (const ring of m.clearings(data)) if (ring && ring.length >= 3) out.push(ring); } catch (e) { console.warn(`clearings of ${m.id}:`, e); }
  }
  return out;
}

// onEach(id, [from, to], firstChild): optional, for the headless checks, which tell the places apart
export function buildPlaces(
  data0: HueData,
  S: Buf,
  group: THREE.Group,
  onEach: ((id: string, range: [number, number], firstChild: number) => void) | null = null,
): PlaceUpdateHandle {
  load();
  const data = withRampartCuts(data0);
  const live: PlaceUpdateHandle[] = [];
  for (const m of list) {
    const id = String(m.id).normalize('NFC');
    const p = (data.places || []).find((q) => String(q.id).normalize('NFC') === id);
    const place = p ? { ...p, x: p.x / 10, z: p.z / 10 } : null;
    const n0 = S.n, k0 = group ? group.children.length : 0; // on a throw, roll the shared buffer back so no half-built model is left behind
    try {
      let handle: PlaceUpdateHandle | void;
      if (m.joinRoofs !== false) S.joined(() => { handle = m.build({ data, S, group, place, THREE }); });
      else handle = m.build({ data, S, group, place, THREE });
      if (handle && typeof handle.update === 'function') live.push(handle);
    } catch (e) {
      S.n = n0;
      console.warn(`replica ${id} not built:`, e);
    }
    S.kind = KIND.PLAIN;
    S.base = 0;
    if (onEach) onEach(id, [n0, S.n], k0);
  }
  const deferredLive: PlaceUpdateHandle[] = [];
  return {
    update(time, glow, rain) {
      for (const r of live) r.update(time, glow, rain);
      for (const r of deferredLive) r.update(time, glow, rain);
    },
    _deferredLive: deferredLive,
  } as PlaceUpdateHandle & { _deferredLive: PlaceUpdateHandle[] };
}

// Load and build the deferred distant place modules after first-frame, uploading their geometry into chunked meshes
// and releasing CPU arrays once on the GPU.
export async function buildDeferredPlaces(
  data: HueData,
  group: THREE.Group,
  replicasHandle: PlaceUpdateHandle & { _deferredLive?: PlaceUpdateHandle[] },
): Promise<THREE.Object3D[]> {
  load();
  if (!lazyLoaders) return [];
  const mods = (await Promise.all(Object.values(lazyLoaders).map((fn) => fn())))
    .filter((m) => m && m.id && typeof m.build === 'function');
  const S = new Buf(32000);
  const live = replicasHandle._deferredLive || [];
  const beforeChildren = group.children.length;
  for (const m of mods) {
    const id = String(m.id).normalize('NFC');
    const p = (data.places || []).find((q) => String(q.id).normalize('NFC') === id);
    const place = p ? { ...p, x: p.x / 10, z: p.z / 10 } : null;
    const n0 = S.n;
    try {
      let handle: PlaceUpdateHandle | void;
      if (m.joinRoofs !== false) S.joined(() => { handle = m.build({ data, S, group, place, THREE }); });
      else handle = m.build({ data, S, group, place, THREE });
      if (handle && typeof handle.update === 'function') live.push(handle);
    } catch (e) {
      S.n = n0;
      console.warn(`deferred replica ${id} not built:`, e);
    }
    S.kind = KIND.PLAIN;
    S.base = 0;
  }
  const added: THREE.Object3D[] = group.children.slice(beforeChildren);
  if (S.n > 0) {
    const mesh = new THREE.Mesh(S.geometry(), cityMaterial());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'deferred-places';
    group.add(mesh);
    added.push(mesh);
  }
  S.release();
  for (const obj of added) releaseAfterUpload(obj);
  return added;
}
