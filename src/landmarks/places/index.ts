import * as THREE from 'three';
import polygonClipping from 'polygon-clipping';
import { Buf, KIND, unflat } from '../../geo/buf.ts';
import { gateAxis, rectRing } from '../../geo/gates.ts';
import { cityMaterial } from '../../geo/materials.ts';
import { releaseAfterUpload } from '../../geo/release.ts';
import type { HueData, PlaceModule, PlaceUpdateHandle, Vec2 } from '../../types.ts';

// Replica models, one file per place: src/landmarks/places/<slug>.ts, picked up here without being listed.
//
// A place file exports
//   id     the place's id in hue.json's `places` (e.g. 'kydai', 'gate:Cửa Hậu')
//   build({ data, S, group, place, THREE })
//          S is the shared static buffer (world.structures), group the dynamic THREE.Group for lights and moving
//          parts, place the record from data.places with x/z already in metres. It may return
//          { update(time, glow, rain) } to be called every frame.
//          Flags (and other moving parts in ../anim.ts) animate on the shared clock and wind; they need no update().
//   joinRoofs  optional, false to opt out. A model's hip roofs that stand side by side (a double hall, halls end to
//          end, a gallery against a hall) meet in valley gutters instead of running through each other: build runs
//          inside S.joined (geo/buf.ts), so its roofs are drawn after the rest of it and an index range it reads
//          (S.paved, S.noCover) does not include them.
// The older builder that drew the same place checks `replaced(id)` and leaves it out, so the two never overlap.
// Vite collects the replica files; plain node (scripts/checks/check-heights.mjs) imports them itself and hands them
// over on globalThis.__hueReplicas. The list is read on first use, not at import: builders (and city.ts through
// citadel.ts) import this file before node has handed the replicas over, and place files may import builders.
// (Vite rewrites only the glob call itself, so test the node hand-over first, never import.meta.glob.)
// Distant places (> 1.8 km from the opening view) are lazy-loaded after first-frame in browser builds so their JS and
// geometry stay off the critical path. Headless Node checks still load all places eagerly via globalThis.__hueReplicas.
export const LAZY_PLACE_IDS = new Set([
  'thieutri', 'dongkhanh', 'hoquyen', 'gate:Cửa An Hòa', 'quantuong', 'gate:Cửa Hữu', 'aeon',
  'gate:Cửa Chánh Tây', 'gate:Cửa Hậu', 'khaidinh', 'benxenam', 'xatac', 'benxebac', 'gate:Cửa Kẻ Trài', 'thuytien',
].map((id) => id.normalize('NFC')));

// Keys in hue.json that can be dropped right after first-frame city/landmark/label build (none are read by
// LAZY_PLACE_IDS or streamRemainingTiles), vs keys that must stay alive until buildDeferredPlaces finishes.
export const EAGER_DROP_KEYS = [
  'terrain', 'medians', 'rails', 'bld', 'infill', 'trees', 'green', 'land',
  'iwalls', 'riverLamps', 'moorings', 'streetLabels', 'bridges', 'precomputed',
] as const;

export const DEFERRED_DROP_KEYS = [
  'roads', 'ponds', 'pondLv', 'wall', 'sites', 'gates', 'special',
] as const;

const DEFERRED_PLACE_BUF_INITIAL = 8192;

// Đàn Xã Tắc's flush ceremonial lawn & walks (matching xatac.ts clearings() so buildCity honors it before xatac loads).
const XATAC_CLEARING: Vec2[] = (() => {
  const top: Vec2[] = [[-1901.7, 424.0], [-1877.1, 406.1], [-1859.3, 430.1], [-1883.9, 448.1]];
  const ox = (top[0][0] + top[1][0] + top[2][0] + top[3][0]) / 4;
  const oz = (top[0][1] + top[1][1] + top[2][1] + top[3][1]) / 4;
  const ex = top[1][0] - top[0][0], ez = top[1][1] - top[0][1];
  const el = Math.hypot(ex, ez);
  const ax = ex / el, az = ez / el;
  const at = (a: number, q: number): Vec2 => [ox + a * ax - q * az, oz + a * az + q * ax];
  return [at(-36.5, -36.5), at(36.5, -36.5), at(36.5, 27), at(-36.5, 27)];
})();

function axisBoxRing(origin: Vec2, angle: number, s0: number, s1: number, t0: number, t1: number): Vec2[] {
  const ux = Math.cos(angle), uz = Math.sin(angle);
  const at = (s: number, t: number): Vec2 => [origin[0] + ux * s - uz * t, origin[1] + uz * s + ux * t];
  return [at(s0, t0), at(s1, t0), at(s1, t1), at(s0, t1)];
}

function discRing(cx: number, cz: number, radius: number, segs = 16): Vec2[] {
  return Array.from({ length: segs }, (_, i) => {
    const a = (i / segs) * Math.PI * 2;
    return [cx + Math.cos(a) * radius, cz + Math.sin(a) * radius] as Vec2;
  });
}

// Ground-cover footprints for the 15 deferred places, applied to S.clearings before populate() in both eager Node
// checks and deferred browser startup so mapped buildings, infill houses, and trees (first-frame and streamed tiles)
// stay off the deferred precincts identically in both modes without erasing surrounding forest greens or lakeside walks.
function deferredCoverRings(data: HueData): Vec2[][] {
  const rings: Vec2[][] = [];
  const pushRing = (r: Vec2[] | null | undefined) => {
    if (r && r.length >= 3) rings.push(r);
  };

  // Deferred Citadel gates (Cửa An Hòa, Cửa Hữu, Cửa Chánh Tây, Cửa Hậu, Cửa Kẻ Trài)
  const kinhthanh = (data.places || []).find((p) => p.id === 'kinhthanh');
  const cityCenter: Vec2 = kinhthanh ? [kinhthanh.x / 10, kinhthanh.z / 10] : [0, 0];
  for (const gate of data.gates || []) {
    const gateId = ('gate:' + String(gate.n || '')).normalize('NFC');
    if (!LAZY_PLACE_IDS.has(gateId)) continue;
    const axis = gateAxis(gate, cityCenter);
    pushRing(rectRing(axis.cx, axis.cz, Math.max(axis.plen + 8, 22), axis.pwid + 2, axis.pa) as Vec2[]);
  }

  // Special footprints: AEON Mall, Bến xe phía Nam, Bến xe phía Bắc + their landscaped/concrete yards
  for (const key of ['aeon', 'benxenam', 'benxebac']) {
    const raw = data.special?.[key]?.ring;
    if (Array.isArray(raw) && raw.length >= 6) pushRing(unflat(raw));
  }
  pushRing([[2685, 1600], [2935, 1600], [2935, 1765], [2685, 1765]]); // AEON parking & Moon Garden
  pushRing(axisBoxRing([-4510, -1895], Math.atan2(16.5, 26), -43, 30, -46, 20)); // Bến xe phía Bắc yard
  pushRing([[1806, 1955], [1890, 1955], [1890, 2040], [1806, 2040]]); // Bến xe phía Nam yard

  // Hổ Quyền circular arena + apron (covers the mapped Hổ Quyền building in data.bld and keeps trees off the ring)
  pushRing(discRing(-3661.4, 2250.1, 31, 16));

  // Quan Tượng Đài: Nam Minh bastion terreplein + 51-step ramp to Tôn Thất Thiệp
  pushRing([[-1955.0, 706.0], [-1962.7, 709.7], [-1937.6, 761.4], [-1887.6, 737.1], [-1890.0, 715.0], [-1919.5, 707.5]]);
  pushRing(axisBoxRing([-1931.7, 740.8], Math.atan2(0.944, -0.33), -46, 10, -6.5, 8));

  // Lăng Khải Định: site items + concrete terraced court
  for (const item of data.sites?.khaidinh?.items || []) {
    if (item && item.k !== 'w' && Array.isArray(item.ring)) pushRing(unflat(item.ring));
  }
  pushRing(axisBoxRing([120.35, 7766.5], Math.atan2(-0.7249, 0.6889), -11, 117, -25, 25));

  // Lăng Đồng Khánh: site buildings/family tombs + Điện Ngưng Hy compound + Bửu Thành / Bái Đình court
  for (const item of data.sites?.dongkhanh?.items || []) {
    if (item && (item.k === 'b' || item.k === 'h') && Array.isArray(item.ring)) pushRing(unflat(item.ring));
  }
  pushRing(axisBoxRing([-2049.8, 4261.7], Math.atan2(0.81678, 0.57696), -24, 62, -30, 30));
  pushRing(axisBoxRing([-2195.1, 4335.9], Math.atan2(0.11496, 0.99337), -14, 64, -17, 17));

  // Lăng Thiệu Trị: mapped halls + Biểu Đức temple / Sân Tế axis + tomb axis + Bửu Thành mound (keep outer pine park)
  for (const item of data.sites?.thieutri?.items || []) {
    if (item && item.k === 'b' && Array.isArray(item.ring)) pushRing(unflat(item.ring));
  }
  pushRing(axisBoxRing([-1828.5, 5766.0], (42 * Math.PI) / 180, -61, 58, -22, 22));
  pushRing(axisBoxRing([-1742.0, 5637.5], (33.5 * Math.PI) / 180, -73, 118, -18, 18));
  pushRing(discRing(-1601.0, 5737.5, 43, 16));

  // Hồ Thủy Tiên: dragon aquarium, pools, plazas, amphitheatre, space simulator & aqua-park (keep surrounding pine woods)
  for (const item of data.sites?.thuytien?.items || []) {
    if (!item || !Array.isArray(item.ring)) continue;
    if (item.k === 'b' || item.k === 'p' || item.k === 'q' || item.k === 's' || item.id === 1527235543) {
      pushRing(unflat(item.ring));
    }
  }
  pushRing([[-1418, 6574], [-1350, 6574], [-1350, 6652], [-1418, 6652]]);

  return rings;
}

function toClearingBoxes(rings: Vec2[][]) {
  return rings.map((ring) => {
    const xs = ring.map((pt) => pt[0]);
    const zs = ring.map((pt) => pt[1]);
    return { ring, x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
  });
}

let list: PlaceModule[] | null = null, ids: Set<string> | null = null;
let lazyLoaders: Record<string, () => Promise<PlaceModule>> | null = null;
function load() {
  if (list) return;
  if (globalThis.__hueReplicas) {
    const mods = globalThis.__hueReplicas;
    list = (Object.values(mods) as PlaceModule[]).filter((m) => m && m.id && typeof m.build === 'function');
    ids = new Set([...list.map((m) => String(m.id).normalize('NFC')), ...LAZY_PLACE_IDS]);
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

function resolveLazyLoaders(): Record<string, () => Promise<PlaceModule>> | null {
  if (lazyLoaders) return lazyLoaders;
  if ((globalThis as any).__hueLazyLoaders) return (globalThis as any).__hueLazyLoaders;
  if (globalThis.__hueReplicas && list?.some((m) => LAZY_PLACE_IDS.has(String(m.id).normalize('NFC')))) {
    return null;
  }
  // Plain Node fallback when deferred places were held back from globalThis.__hueReplicas (scripts/checks/check-deferred.mjs)
  return {
    './thieutri.ts': () => import('./thieutri.ts') as Promise<PlaceModule>,
    './dongkhanh.ts': () => import('./dongkhanh.ts') as Promise<PlaceModule>,
    './hoquyen.ts': () => import('./hoquyen.ts') as Promise<PlaceModule>,
    './gate-cua-an-hoa.ts': () => import('./gate-cua-an-hoa.ts') as Promise<PlaceModule>,
    './quantuong.ts': () => import('./quantuong.ts') as Promise<PlaceModule>,
    './gate-cua-huu.ts': () => import('./gate-cua-huu.ts') as Promise<PlaceModule>,
    './aeon.ts': () => import('./aeon.ts') as Promise<PlaceModule>,
    './gate-cua-chanh-tay.ts': () => import('./gate-cua-chanh-tay.ts') as Promise<PlaceModule>,
    './gate-cua-hau.ts': () => import('./gate-cua-hau.ts') as Promise<PlaceModule>,
    './khaidinh.ts': () => import('./khaidinh.ts') as Promise<PlaceModule>,
    './benxenam.ts': () => import('./benxenam.ts') as Promise<PlaceModule>,
    './xatac.ts': () => import('./xatac.ts') as Promise<PlaceModule>,
    './benxebac.ts': () => import('./benxebac.ts') as Promise<PlaceModule>,
    './gate-cua-ke-trai.ts': () => import('./gate-cua-ke-trai.ts') as Promise<PlaceModule>,
    './thuytien.ts': () => import('./thuytien.ts') as Promise<PlaceModule>,
  };
}

export const replaced = (id: string): boolean => { load(); return ids.has(String(id).normalize('NFC')); };

// A place may also export ownsMapped(ring): true for a mapped building outline (data.bld, scene metres) that the
// place's model draws itself, so geo/city.ts leaves it out even where the model's roofs do not cover it.
export function placeOwns(ring: Vec2[]): boolean {
  load();
  return list.some((m) => typeof m.ownsMapped === 'function' && m.ownsMapped(ring));
}

// A place that models a bridge deck may also export deckEnds(data): its end lines, [{ p, u, hw, reach }] (p on the
// deck's axis at the end, u the unit vector out of the deck, hw the half width, reach how far past the end a street
// may start and still be an approach). geo/city.ts cuts the approach streets on those lines; check-joints tests them.
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
// any place is built, so the rampart (kinhthanh.ts) and the gates that find its faces all see the same band. A cut
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
// generic riverside lamps (riverlights.ts, data.riverLamps) are left out, so its own lamp design is the only one there.
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
// test on a data.roads record ([class, bridge, flat, ...]) that is true for the ways it draws itself. geo/city.ts and
// landmarks/life.ts leave those out of the street network, so no footway is laid at grade where the model stands.
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
// [x, z] in model metres where geo/city.ts draws none of the city's footways (class 5) or green patches (the ones
// whose middle lies inside) and plants no trees or houses. buildCity reads them before any model is built.
export function placeClearings(data: HueData): Vec2[][] {
  load();
  const out: Vec2[][] = [];
  let hasXatac = false;
  for (const m of list) {
    if (String(m.id).normalize('NFC') === 'xatac') hasXatac = true;
    if (typeof m.clearings !== 'function') continue;
    try { for (const ring of m.clearings(data)) if (ring && ring.length >= 3) out.push(ring); } catch (e) { console.warn(`clearings of ${m.id}:`, e); }
  }
  if (!hasXatac) out.push(XATAC_CLEARING);
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
  // Register deferred places' ground cover in S.clearings before populate() runs so mapped buildings, infill houses,
  // and trees (first-frame and streamed tiles) stay off deferred precincts consistently in eager and browser modes.
  S.clearings = [...(S.clearings || []), ...toClearingBoxes(deferredCoverRings(data))];
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

// Load and build the deferred distant place modules after first-frame, giving each place its own bounded THREE.Mesh
// so Three.js frustum culling can skip off-screen landmarks across the 14 km map, and releasing CPU arrays on upload.
export async function buildDeferredPlaces(
  data: HueData,
  worldGroup: THREE.Group,
  replicasHandle: PlaceUpdateHandle & { _deferredLive?: PlaceUpdateHandle[] },
): Promise<THREE.Object3D[]> {
  load();
  const loaders = resolveLazyLoaders();
  if (!loaders) return [];
  const mods = (await Promise.all(Object.values(loaders).map((fn) => fn())))
    .filter((m) => m && m.id && typeof m.build === 'function');
  if (!mods.length) return [];

  const structMat = cityMaterial({ windows: true });
  const live = replicasHandle?._deferredLive || [];
  const added: THREE.Object3D[] = [];

  for (const mod of mods) {
    const id = String(mod.id).normalize('NFC');
    const p = (data.places || []).find((q) => String(q.id).normalize('NFC') === id);
    const place = p ? { ...p, x: p.x / 10, z: p.z / 10 } : null;
    const placeBuf = new Buf(DEFERRED_PLACE_BUF_INITIAL);
    const childStart = worldGroup.children.length;
    try {
      let handle: PlaceUpdateHandle | void;
      if (mod.joinRoofs !== false) placeBuf.joined(() => { handle = mod.build({ data, S: placeBuf, group: worldGroup, place, THREE }); });
      else handle = mod.build({ data, S: placeBuf, group: worldGroup, place, THREE });
      if (handle && typeof handle.update === 'function') live.push(handle);
    } catch (e) {
      placeBuf.n = 0;
      console.warn(`deferred replica ${id} not built:`, e);
    }
    for (let k = childStart; k < worldGroup.children.length; k++) {
      const child = worldGroup.children[k];
      if (!child.userData.landmark) child.userData.landmark = id;
      added.push(child);
    }
    if (placeBuf.n > 0) {
      const mesh = new THREE.Mesh(placeBuf.geometry(), structMat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.name = 'deferred-' + mod.id;
      mesh.userData.landmark = id;
      worldGroup.add(mesh);
      added.push(mesh);
    }
    placeBuf.release();
  }

  for (const obj of added) releaseAfterUpload(obj);
  return added;
}
