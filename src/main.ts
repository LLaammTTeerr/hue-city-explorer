import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource-variable/fraunces/wght.css';
import '@fontsource-variable/fraunces/wght-italic.css';
import './ui/style.css';

import * as THREE from 'three';
import { LAND_Y, quality } from './config.ts';
import { buildCity, updateDetail } from './geo/city.ts';
import { createHeroLoader } from './geo/hero-gltf.ts';
import { releaseAfterUpload, releasedCount, KEEP_GEOMETRY } from './geo/release.ts';
import { hydrateHueData, decodeTileBin } from './geo/codec.ts';
import { buildLandmarks } from './landmarks/build.ts';
import { buildDeferredPlaces } from './landmarks/places/index.ts';
import { shared } from './geo/materials.ts';
import { buildSky } from './env/sky.ts';
import { buildWater } from './env/water.ts';
import { buildRain } from './env/rain.ts';
import { createMood } from './env/mood.ts';
import { createPost } from './env/post.ts';
import { createIBL } from './env/ibl.ts';
import { createCascades } from './env/csm.ts';
import { createCamera, fromForm } from './camera/controls.ts';
import { createLabels } from './ui/labels.ts';
import { createUI } from './ui/ui.ts';
import { createShare } from './ui/share.ts';
import { createCapture, type CapturePreset } from './ui/capture.ts';
import { VIEWS } from './ui/content.ts';
import { rise } from './geo/terrain.ts';
import { createFallback } from './ui/fallback.ts';

const DECIMETRES_PER_METRE = 10;
const MAX_POST_PIXELS = 3.7e6;
const TILE_PREFETCH_CONCURRENCY = 6;
const TILE_FRAME_BUDGET_MS = 6;
const CAMERA_BOUNDS_INSET_M = 250;
const SUN_SHADOW_RADIUS = 2.4;
const SKY_FAR_SCALE = 0.9;
const GLOW_VISIBLE_THRESHOLD = 0.01;
const MAX_FRAME_DT_S = 0.05;
const DRIFT_START_DELAY_MS = 1400;

const LOADER_PROGRESS = {
  indexReady: 0.05,
  geometryLoaded: 0.15,
  cityBuilt: 0.55,
  landmarksBuilt: 0.8,
  done: 1,
} as const;

const HOME_VIEW = {
  refAspect: 1.62,
  aspectRange: 2.5,
  back: [790, 1300] as const,
  side: [140, 110] as const,
  height: [250, 430] as const,
  ahead: [90, 150] as const,
  north: [40, 55] as const,
};

const OVERVIEW_VIEW = {
  refAspect: 1.4,
  aspectExponent: 0.9,
  offsetX: 4000,
  height: 3300,
  offsetZ: 5300,
  flyDurationS: 3,
} as const;

const PLACE_PICK = {
  maxMovePx: 6,
  maxTapMs: 450,
  reachM: { area: 0, island: 220, bridge: 150, default: 85 },
  flyDurationS: 2.6,
  portraitDistanceScale: 1.35,
  flyDistanceMargin: 1.2,
} as const;

const DBLCLICK_ZOOM = {
  distanceFactor: 0.45,
  minDistanceM: 60,
  flyDurationS: 1.1,
} as const;

const KEYBOARD_ZOOM = { inFactor: 0.65, outFactor: 1.5 } as const;

const SHADOW_EXTENT = { minM: 260, maxM: 2600, distRatio: 0.8 } as const;

const HIGH_ALT_FOG = { startM: 1000, endM: 3500, maxReduction: 0.78 } as const;
const DOF_ALTITUDE = { startM: 85, endM: 380, maxAperture: 0.56 } as const;

const ADAPTIVE_QUALITY = {
  slowFrameMs: 42,
  maxFrameCreditMs: 250,
  triggerBudgetMs: 2500,
  initialDetailReachLowM: 900,
  initialDetailReachHighM: 1500,
  tiers: [
    { minPixelRatio: 1.0, pixelRatioStep: 0.25 },
    { minPixelRatio: 1.0, pixelRatioStep: 0.2 },
  ],
} as const;

const RESIZE_NONE = 0;
const RESIZE_BUFFERS = 1;
const RESIZE_FULL = 2;

const canvas = document.getElementById('scene') as HTMLCanvasElement;
// yield to the event loop between build steps (a message task is not throttled in background tabs, unlike rAF and timers)
const nextMacrotask = () => new Promise<void>((resolve) => {
  const channel = new MessageChannel();
  channel.port1.onmessage = () => resolve();
  channel.port2.postMessage(0);
});

// `?nogl` (debugging): behave as a device without WebGL, so the recovery screen and the 2D fallback can be tried
const NOGL = new URLSearchParams(location.search).has('nogl');
if (NOGL) {
  const origGetContext = HTMLCanvasElement.prototype.getContext;
  (HTMLCanvasElement.prototype as any).getContext = function (type: string, ...rest: any[]) {
    return /webgl/i.test(type) ? null : (origGetContext as any).call(this, type, ...rest);
  };
}

// The renderer doubles as the capability check, made before anything heavy is fetched. null when WebGL is unavailable;
// the exception stays in the console. A second try without antialiasing and the high-performance hint catches the
// drivers that refuse only those.
function createRenderer() {
  const attempts = [
    { antialias: true, powerPreference: 'high-performance' as const },
    { antialias: false },
  ];
  for (const opts of attempts) {
    try { return new THREE.WebGLRenderer({ canvas, ...opts }); } catch (err) { console.error(err); }
  }
  return null;
}

declare const __APP_VERSION__: string | undefined;
declare const __APP_COMMIT__: string | undefined;
declare const __DATA_CACHE_NAME__: string | undefined;

const DATA_CACHE_NAME = typeof __DATA_CACHE_NAME__ !== 'undefined'
  ? __DATA_CACHE_NAME__
  : `hue-data-${typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0'}-${typeof __APP_COMMIT__ !== 'undefined' ? __APP_COMMIT__ || 'local' : 'dev'}`;
let dataCachePromise: Promise<Cache | null> | null = null;

function openDataCache(): Promise<Cache | null> {
  if (!dataCachePromise) {
    dataCachePromise = (typeof caches !== 'undefined' && caches.open)
      ? caches.open(DATA_CACHE_NAME).catch(() => null)
      : Promise.resolve(null);
  }
  return dataCachePromise;
}

function pruneStaleDataCaches() {
  if (typeof caches === 'undefined' || !caches.keys) return;
  caches.keys().then((keys) => {
    for (const key of keys) {
      if (key.startsWith('hue-data-') && key !== DATA_CACHE_NAME) caches.delete(key).catch(() => {});
    }
  }).catch(() => {});
}

async function fetchCachedResponse(name: string, prestarted?: Promise<Response | null> | null): Promise<Response> {
  const url = `${import.meta.env.BASE_URL}data/${name}`;
  const cache = await openDataCache();
  if (cache) {
    const hit = await cache.match(url).catch(() => undefined);
    if (hit && hit.ok) return hit;
  }
  const preRes = prestarted ? await prestarted : null;
  const res = (preRes && preRes.ok) ? preRes : await fetch(url);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  if (cache) {
    try { cache.put(url, res.clone()).catch(() => {}); } catch { /* body locked or quota full */ }
  }
  return res;
}

function consumeEarlyFetch(key: 'places' | 'hueJson' | 'hueBin'): Promise<Response | null> | null {
  const early = (window as any).__hueEarlyFetch;
  if (!early || !early[key]) return null;
  const p = early[key];
  early[key] = null;
  return p;
}

async function fetchDataJSON(name: string, prestarted?: Promise<Response | null> | null) {
  const res = await fetchCachedResponse(name, prestarted);
  return res.json();
}

async function fetchDataBin(name: string, prestarted?: Promise<Response | null> | null): Promise<ArrayBuffer> {
  const res = await fetchCachedResponse(name, prestarted);
  const ds = new DecompressionStream('gzip');
  return new Response(res.body!.pipeThrough(ds)).arrayBuffer();
}

async function fetchHueData() {
  const [json, binBuf] = await Promise.all([
    fetchDataJSON('hue.json', consumeEarlyFetch('hueJson')),
    fetchDataBin('hue.bin', consumeEarlyFetch('hueBin')).catch(() => null),
  ]);
  if (json.meta?.bin && binBuf) hydrateHueData(json, binBuf);
  return json;
}

// The post-processing targets are multisampled float buffers, so cap total pixels on big hi-dpi windows; the cap stops
// at 1, but the adaptive fallback may still take quality.pixelRatio below 1 on a slow 1x screen.
function fitPixelRatio() {
  if (quality.low) return quality.pixelRatio;
  const maxRatio = Math.max(1, Math.sqrt(MAX_POST_PIXELS / (innerWidth * innerHeight)));
  return Math.min(quality.pixelRatio, maxRatio);
}

// Opening frame: from above the river below the bridge, looking up-stream into the afternoon light.
// Trường Tiền crosses the foreground, chợ Đông Ba sits at its right-hand end, the Citadel wall and Kỳ Đài run off behind.
function computeHomeView(bridge: { centre: number[]; dir: number[] }) {
  const center = bridge.centre;
  const dir = bridge.dir;
  const upstream = [-dir[1], dir[0]];
  // narrower windows step back and up so the whole bridge and the market still share the frame
  const narrowBlend = Math.max(0, Math.min(1, (HOME_VIEW.refAspect / (innerWidth / innerHeight) - 1) / HOME_VIEW.aspectRange));
  const lerpPair = (pair: readonly [number, number]) => pair[0] + (pair[1] - pair[0]) * narrowBlend;
  const back = lerpPair(HOME_VIEW.back);
  const side = lerpPair(HOME_VIEW.side);
  const height = lerpPair(HOME_VIEW.height);
  const ahead = lerpPair(HOME_VIEW.ahead);
  const north = lerpPair(HOME_VIEW.north);
  const pos = new THREE.Vector3(
    center[0] - upstream[0] * back - dir[0] * side,
    height,
    center[1] - upstream[1] * back - dir[1] * side,
  );
  const target = new THREE.Vector3(
    center[0] + upstream[0] * ahead - dir[0] * north,
    LAND_Y,
    center[1] + upstream[1] * ahead - dir[1] * north,
  );
  return { pos, target };
}

// The whole slab from the south-east, the way one would stand over a model on a table.
function computeOverviewView(bounds: number[]) {
  const aspectScale = Math.pow(Math.max(1, OVERVIEW_VIEW.refAspect / (innerWidth / innerHeight)), OVERVIEW_VIEW.aspectExponent);
  const centerX = (bounds[0] + bounds[2]) / 2;
  const centerZ = (bounds[1] + bounds[3]) / 2;
  return {
    pos: new THREE.Vector3(
      centerX + OVERVIEW_VIEW.offsetX * aspectScale,
      OVERVIEW_VIEW.height * aspectScale,
      centerZ + OVERVIEW_VIEW.offsetZ * aspectScale,
    ),
    target: new THREE.Vector3(centerX, LAND_Y, centerZ),
  };
}

function setupLighting(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  const hemi = new THREE.HemisphereLight(0xffffff, 0x887766, 1);
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality.shadowSize, quality.shadowSize);
  sun.shadow.radius = SUN_SHADOW_RADIUS;
  scene.add(hemi, sun, sun.target);
  const shadows = createCascades(scene, sun, { tight: !quality.low }); // after the sun, so the sun stays light 0
  const ibl = quality.low ? null : createIBL(renderer, scene);
  return { hemi, sun, shadows, ibl };
}

function findNearestPlace(places: any[], groundPos: THREE.Vector3) {
  let best = null;
  let bestDist = Infinity;
  for (const place of places) {
    const dist = Math.hypot(place.x / DECIMETRES_PER_METRE - groundPos.x, place.z / DECIMETRES_PER_METRE - groundPos.z);
    const reach = PLACE_PICK.reachM[place.k as keyof typeof PLACE_PICK.reachM] ?? PLACE_PICK.reachM.default;
    if (dist < reach && dist < bestDist) {
      bestDist = dist;
      best = place;
    }
  }
  return best;
}

function bindCanvasInteractions(opts: {
  rig: any;
  data: any;
  ui: any;
  mood: any;
  pick: (id: string, fly?: boolean, from?: any) => void;
  syncCard: (id?: string | null) => void;
  toggleLabels: () => void;
  toggleLook: () => void;
  captureView: () => void;
}) {
  const { rig, data, ui, mood, pick, syncCard, toggleLabels, toggleLook, captureView } = opts;
  const { camera, controls } = rig;

  // Tap / click on the ground near a landmark reveals it.
  // Every pointer is tracked: a second finger neither ends the first one's drag nor counts as a tap.
  const activePointers = new Map<number, { x: number; y: number; downAt: number; lastX: number; lastY: number; button: number; multi: boolean; dragged?: boolean }>();
  canvas.addEventListener('pointerdown', (event) => {
    const multi = activePointers.size > 0;
    if (multi) activePointers.forEach((ptr) => { ptr.multi = true; });
    activePointers.set(event.pointerId, {
      x: event.clientX, y: event.clientY, downAt: performance.now(),
      lastX: event.clientX, lastY: event.clientY, button: event.button, multi,
    });
    canvas.classList.add('dragging');
  });
  canvas.addEventListener('pointermove', (event) => {
    const ptr = activePointers.get(event.pointerId);
    if (!ptr) return;
    ptr.lastX = event.clientX;
    ptr.lastY = event.clientY;
    // a drag stays a drag even if it ends near its start
    if (Math.hypot(event.clientX - ptr.x, event.clientY - ptr.y) > PLACE_PICK.maxMovePx) ptr.dragged = true;
  });
  const handlePointerUp = (event: PointerEvent) => {
    const ptr = activePointers.get(event.pointerId);
    activePointers.delete(event.pointerId);
    if (!activePointers.size) canvas.classList.remove('dragging');
    if (!ptr) return;
    const moved = Math.hypot(event.clientX - ptr.x, event.clientY - ptr.y);
    const elapsed = performance.now() - ptr.downAt;
    if (ptr.button !== 0 || ptr.multi || ptr.dragged || moved > PLACE_PICK.maxMovePx || elapsed > PLACE_PICK.maxTapMs || event.type === 'pointercancel') return;
    const groundPos = rig.groundAt(event.clientX, event.clientY);
    if (!groundPos) return;
    const hitPlace = findNearestPlace(data.places, groundPos);
    if (hitPlace) pick(hitPlace.id, false);
    else if (ui.cardId) { ui.hideCard(); syncCard(null); }
  };
  addEventListener('pointerup', handlePointerUp);
  addEventListener('pointercancel', handlePointerUp);

  const clearPointers = () => { activePointers.clear(); canvas.classList.remove('dragging'); };
  addEventListener('blur', clearPointers);
  document.addEventListener('visibilitychange', clearPointers);

  canvas.addEventListener('dblclick', (event) => {
    const groundPos = rig.groundAt(event.clientX, event.clientY);
    if (!groundPos) return;
    const offset = camera.position.clone().sub(controls.target).multiplyScalar(DBLCLICK_ZOOM.distanceFactor);
    if (offset.length() < DBLCLICK_ZOOM.minDistanceM) offset.setLength(DBLCLICK_ZOOM.minDistanceM);
    groundPos.y = LAND_Y + rise(groundPos.x, groundPos.z);
    rig.flyTo(groundPos.clone().add(offset), groundPos, { duration: DBLCLICK_ZOOM.flyDurationS, arc: false });
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  addEventListener('keydown', (event) => {
    if (fromForm(event) || event.metaKey || event.ctrlKey || (document.getElementById('about') as HTMLDialogElement).open) return;
    const key = event.key.toLowerCase();
    if (key === 'escape') { ui.closeCaptureMenu(); ui.hideCard(); syncCard(null); }
    else if (key === 'h' || key === 'home') { rig.goHome(); ui.hideCard(); syncCard(null); }
    else if (key === 'r') mood.setRain(!mood.state.rainTarget);
    else if (key === 'n') mood.setTime((Math.round(mood.state.timeTarget) + 1) % 3);
    else if (key === 'l') toggleLabels();
    else if (key === 'v') toggleLook();
    else if (key === 'p') captureView();
    else if (key === '+' || key === '=') rig.zoomBy(KEYBOARD_ZOOM.inFactor);
    else if (key === '-' || key === '_') rig.zoomBy(KEYBOARD_ZOOM.outFactor);
  });
}

// Multi-tier adaptive quality controller: if the device cannot hold ~28 fps, step down gracefully through
// resolution, water reflection, SSAO/bloom, shadow cascade, and finally direct rendering so every device stays fluid.
function createAdaptiveQuality(opts: {
  renderer: THREE.WebGLRenderer;
  water: any;
  post: any;
  shadows: any;
  onRequestBufferResize: () => void;
  onDisablePost: () => void;
}) {
  const { renderer, water, post, shadows, onRequestBufferResize, onDisablePost } = opts;
  let slowBudgetMs = 0;
  let lastTimestamp = 0;
  let pixelRatio = quality.pixelRatio;
  let perfTier = 0;
  let detailReach: number = quality.low ? ADAPTIVE_QUALITY.initialDetailReachLowM : ADAPTIVE_QUALITY.initialDetailReachHighM;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      slowBudgetMs = 0;
      lastTimestamp = performance.now();
    }
  });

  function stepDown() {
    if (perfTier === 0) {
      const tier = ADAPTIVE_QUALITY.tiers[0];
      perfTier = 1;
      water.mesh.userData.setReflection?.(false);
      pixelRatio = Math.max(tier.minPixelRatio, Math.min(pixelRatio, renderer.getPixelRatio()) - tier.pixelRatioStep);
    } else if (perfTier === 1) {
      const tier = ADAPTIVE_QUALITY.tiers[1];
      perfTier = 2;
      if (post) post.setFast(true);
      pixelRatio = Math.max(tier.minPixelRatio, Math.min(pixelRatio, renderer.getPixelRatio()) - tier.pixelRatioStep);
    } else {
      return;
    }
    quality.pixelRatio = pixelRatio;
    onRequestBufferResize();
  }

  return {
    get detailReach() { return detailReach; },
    observe(now: number) {
      const frameMs = now - lastTimestamp;
      lastTimestamp = now;
      if (document.visibilityState !== 'visible') { slowBudgetMs = 0; return; }
      slowBudgetMs = frameMs > ADAPTIVE_QUALITY.slowFrameMs
        ? slowBudgetMs + Math.min(frameMs, ADAPTIVE_QUALITY.maxFrameCreditMs)
        : Math.max(0, slowBudgetMs - frameMs * 2);
      if (slowBudgetMs > ADAPTIVE_QUALITY.triggerBudgetMs) {
        slowBudgetMs = 0;
        stepDown();
      }
    },
  };
}

function syncGlowUniforms(opts: {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  world: any;
  bridge: any;
  extraGlows: any[];
  lanterns: any;
  lanternGlows: any[];
  glow: number;
}) {
  const { renderer, camera, world, bridge, extraGlows, lanterns, lanternGlows, glow } = opts;
  const pxScale = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  const isLit = glow > GLOW_VISIBLE_THRESHOLD;
  world.lamps.material.uniforms.uScale.value = pxScale;
  world.lamps.visible = isLit;
  bridge.lamps.material.uniforms.uScale.value = pxScale;
  bridge.lamps.visible = isLit;
  for (const light of bridge.lights) {
    light.material.uniforms.uScale.value = pxScale;
    light.visible = isLit;
  }
  for (const glowMesh of extraGlows) {
    glowMesh.material.uniforms.uScale.value = pxScale;
    glowMesh.visible = isLit;
  }
  if (lanterns.halo) lanterns.halo.material.uniforms.uScale.value = pxScale;
  for (const glowMesh of lanternGlows) {
    glowMesh.material.uniforms.uScale.value = pxScale;
    glowMesh.visible = isLit;
  }
}

// hue.json carries the first frame's trees and houses; the others come in tiles (data.meta.tiles, nearest the opening
// view first, see build-data.mjs), fetched one behind the other after the first frame and planted between two frames.
// Every tile added fires 'hue:scene-changed' on window (detail.meshes: what was added).
async function streamRemainingTiles(opts: {
  data: any;
  world: any;
  leafMats: Set<any>;
  shadows: any;
  sun: THREE.DirectionalLight;
  syncLeafLook: () => void;
}) {
  const { data, world, leafMats, shadows, sun, syncLeafLook } = opts;
  const tileList = data.meta.tiles || [];
  const fetchTile = (tile: { f: string }) => (
    tile.f.endsWith('.bin')
      ? fetchDataBin(tile.f).then(decodeTileBin)
      : fetchDataJSON(tile.f)
  ).catch((err) => {
    console.warn('[hue] tile not loaded', tile.f, err);
    return null;
  });

  // Bounded-concurrency prefetch window keeps HTTP/2 pipes saturated while planting strictly nearest-first.
  const inflight = new Array<Promise<any> | null>(tileList.length).fill(null);
  let nextFetchIdx = 0;
  const pumpPrefetch = () => {
    while (nextFetchIdx < tileList.length && nextFetchIdx < currentPlantIdx + TILE_PREFETCH_CONCURRENCY) {
      inflight[nextFetchIdx] = fetchTile(tileList[nextFetchIdx]);
      nextFetchIdx++;
    }
  };
  let currentPlantIdx = 0;
  pumpPrefetch();

  let sliceStartMs = performance.now();
  await nextMacrotask();
  sliceStartMs = performance.now();

  for (let i = 0; i < tileList.length; i++) {
    currentPlantIdx = i;
    pumpPrefetch();
    const body = await inflight[i];
    inflight[i] = null;
    if (!body) continue;
    if (performance.now() - sliceStartMs > TILE_FRAME_BUDGET_MS) {
      await nextMacrotask();
      sliceStartMs = performance.now();
    }
    const meshes = (world as any).addTile(body);
    for (const mesh of meshes) releaseAfterUpload(mesh);
    for (const mesh of meshes) {
      if (mesh.material?.defines && 'HUE_FOLIAGE' in mesh.material.defines && !leafMats.has(mesh.material)) {
        leafMats.add(mesh.material);
        syncLeafLook();
      }
    }
    if (shadows.invalidate) shadows.invalidate();
    else {
      sun.shadow.needsUpdate = true;
      if (shadows.near) shadows.near.shadow.needsUpdate = true;
    }
    dispatchEvent(new CustomEvent('hue:scene-changed', { detail: { meshes } }));
  }
  performance.mark('hue:tiles-loaded');
  setTimeout(pruneStaleDataCaches, 2000);
}

let ui: any = null;
let index: any = null;
let fallback: any = null;

async function main() {
  const startTime = performance.now();
  // the place index (~30 kB: names, kinds, positions, counts) comes first: search and the cards need nothing else
  const indexPromise = fetchDataJSON('places.json', consumeEarlyFetch('places'));
  let renderer = createRenderer();
  // the geometry bundle (~3 MB) only once the device has shown it can render it, then alongside the index
  let geometryPromise = renderer ? fetchHueData() : null;
  if (geometryPromise) geometryPromise.catch(() => {}); // a failure is reported where it is awaited, below
  index = await indexPromise;

  let rig: any;
  let mood: any;
  let labels: any;
  let data: any;
  let sharing: any;
  let captureCtrl: ReturnType<typeof createCapture> | null = null;
  let isCapturing = false;
  let look = 1; // 1 illustrated (ink line and flat wash), the default, and 0 realistic
  let labelsOn = true;

  const whenReady = (fn: (...args: any[]) => any) => (...args: any[]) => (rig ? fn(...args) : undefined);
  const syncCard = (id: string | null = null) => { labels?.setActive?.(id); labels?.invalidateLayout?.(); };
  const toggleLabels = () => { labelsOn = !labelsOn; labels.setEnabled(labelsOn); ui.setLabels(labelsOn); };

  async function runCapture(preset?: CapturePreset) {
    if (!captureCtrl || captureCtrl.busy) return null;
    ui.closeCaptureMenu();
    ui.hint(ui.T.capturing, 0);
    await nextMacrotask(); // let the button state and hint paint before the synchronous high-res draw
    try {
      const result = await captureCtrl.capture(preset ?? (ui.capturePreset as CapturePreset));
      if (result) {
        ui.hint(ui.T.captured.replace('{w}', String(result.width)).replace('{h}', String(result.height)), 2800);
      }
      return result;
    } catch (err) {
      console.error('[hue] capture failed', err);
      ui.hint(ui.T.captureFailed, 3200);
      return null;
    }
  }

  function pick(id: string, fly?: boolean, from?: any) {
    const place = index.places.find((item: any) => item.id === id);
    if (!place) return;
    ui.showCard(id, from);
    if (!rig) { if (fallback) fallback.show(id); return; } // still loading, or the 2D map: the card alone
    heroes.prefetch(id);
    labels.markVisited(id);
    syncCard(id);
    if (fly) {
      const view = VIEWS[id] || VIEWS.default;
      const targetX = place.x / DECIMETRES_PER_METRE + view.look[0];
      const targetZ = place.z / DECIMETRES_PER_METRE + view.look[1];
      const target = new THREE.Vector3(targetX, LAND_Y + rise(targetX, targetZ), targetZ);
      const distScale = (innerWidth / innerHeight < 1 ? PLACE_PICK.portraitDistanceScale : 1) * PLACE_PICK.flyDistanceMargin;
      const groundY = LAND_Y + rise(place.x / DECIMETRES_PER_METRE, place.z / DECIMETRES_PER_METRE);
      const pos = new THREE.Vector3(
        place.x / DECIMETRES_PER_METRE + view.off[0] * distScale,
        groundY + view.off[1] * distScale,
        place.z / DECIMETRES_PER_METRE + view.off[2] * distScale,
      );
      rig.flyTo(pos, target, { duration: PLACE_PICK.flyDurationS });
    }
  }

  ui = createUI(index, {
    pick: (id: string, fly?: boolean, from?: any) => pick(id, fly, from),
    overview: () => {
      ui.hideCard();
      syncCard(null);
      if (!rig) { fallback?.home(); return; }
      const view = computeOverviewView(bounds);
      rig.flyTo(view.pos, view.target, { duration: OVERVIEW_VIEW.flyDurationS });
    },
    lang: () => { labels?.remeasure(); fallback?.relabel(); },
    labels: whenReady(() => toggleLabels()),
    osmOnly: whenReady((onlyOsm: boolean) => { world.infill.forEach((mesh: any) => { mesh.visible = !onlyOsm; }); }),
    home: () => { ui.hideCard(); syncCard(null); if (rig) rig.goHome(); else fallback?.home(); },
    zoom: (factor: number) => { if (rig) rig.zoomBy(factor); else fallback?.zoom(factor); },
    cardClosed: () => syncCard(null),
    rain: whenReady(() => mood.setRain(!mood.state.rainTarget)),
    time: whenReady((idx: number) => mood.setTime(idx)),
    season: whenReady((idx: number) => mood.setSeason(idx)),
    look: whenReady(() => setLook(!look, true)),
    capture: whenReady((preset?: CapturePreset) => runCapture(preset)),
    captureSize: (preset: CapturePreset) => captureCtrl?.sizeFor(preset) ?? null,
    share: (id: string | null) => sharing?.share(id),
  });
  performance.mark('hue:search-ready');
  fallback = createFallback({ ui, index, tryRenderer: createRenderer, onPick: (id: string) => pick(id, true) });
  ui.loaderProgress(LOADER_PROGRESS.indexReady);

  // no WebGL: the recovery screen, and hue.json is never fetched unless "Retry 3D" gets a renderer
  if (!renderer) renderer = await fallback.recover();
  data = await (geometryPromise || fetchHueData());
  performance.mark('hue:geometry-loaded');
  ui.loaderProgress(LOADER_PROGRESS.geometryLoaded);
  await nextMacrotask();

  // ---------- renderer & world ----------
  renderer.setPixelRatio(fitPixelRatio());
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();

  const world = buildCity(data);
  performance.mark('hue:city-built');
  ui.loaderProgress(LOADER_PROGRESS.cityBuilt);
  await nextMacrotask();

  const dynamic = new THREE.Group();
  // every landmark, populate and the moving things, in the sequence the geometry checks build too (src/landmarks/build.js)
  const { bridge, citadel, extraGlows, floating, replicas, boats, lanterns, traffic, street } = buildLandmarks(data, world, dynamic);
  const { hemi, sun, shadows, ibl } = setupLighting(scene, renderer);
  const heroes = createHeroLoader(dynamic, (_id, root) => {
    releaseAfterUpload(root);
    if (shadows?.invalidate) shadows.invalidate();
    else if (sun?.shadow) sun.shadow.needsUpdate = true;
  });
  scene.add(world.group, dynamic);
  const lanternGlows: any[] = []; // glow points that landmarks flagged for the per-frame update
  dynamic.traverse((obj) => { if (obj.userData.glow) lanternGlows.push(obj); });
  performance.mark('hue:landmarks-built');
  ui.loaderProgress(LOADER_PROGRESS.landmarksBuilt);
  await nextMacrotask();

  const sky = buildSky();
  const water = buildWater(data);
  const rain = buildRain();
  scene.add(sky.mesh, water.mesh, water.ponds, rain.mesh);
  performance.mark('hue:env-built');

  mood = createMood({ scene, renderer, sun, hemi, sky, water, rain, ibl });
  mood.onChange((state: any) => ui.setMood({ rain: state.rainTarget, time: state.timeTarget, season: state.season }));
  ui.setMood({ rain: mood.state.rainTarget, time: mood.state.timeTarget, season: mood.state.season });

  // ---------- camera & post ----------
  const bounds = data.meta.bounds.map((val: number) => val / DECIMETRES_PER_METRE);
  const cameraBounds = {
    minX: bounds[0] + CAMERA_BOUNDS_INSET_M,
    minZ: bounds[1] + CAMERA_BOUNDS_INSET_M,
    maxX: bounds[2] - CAMERA_BOUNDS_INSET_M,
    maxZ: bounds[3] - CAMERA_BOUNDS_INSET_M,
  };
  rig = createCamera(canvas, cameraBounds);
  const { camera, controls } = rig;
  camera.layers.enable(1); // layer 1: things kept out of the water reflection
  const post = quality.low ? null : createPost(renderer, scene, camera);
  let usePost = !!post;
  const draw = () => (usePost && post ? post.render() : renderer.render(scene, camera));

  let home = computeHomeView(bridge);
  rig.setHome(home.pos, home.target);
  rig.jumpHome();

  // ---------- labels, look & interactions ----------
  // anchor heights come with the index (`a`, scripts/build-label-tops.mjs)
  labels = createLabels(document.getElementById('labels'), index, camera, (id: string) => pick(id, true), data.streetLabels);
  // Drop raw city arrays from JS heap once all builders and labels have consumed them (sites/gates wait for deferred places).
  if (!KEEP_GEOMETRY) {
    for (const k of ['terrain', 'roads', 'medians', 'rails', 'bld', 'infill', 'trees', 'green', 'land', 'ponds', 'pondLv', 'wall', 'iwalls', 'riverLamps', 'moorings', 'streetLabels', 'bridges', 'precomputed']) {
      delete data[k];
    }
  }
  const leafMats = new Set<any>();
  world.group.traverse((obj: any) => {
    if (obj.material?.defines && 'HUE_FOLIAGE' in obj.material.defines) leafMats.add(obj.material);
  });

  function setLook(isInk: boolean | number, remember = false) {
    look = isInk ? 1 : 0;
    if (remember) { try { localStorage.setItem('hue-look', look ? 'ink' : 'real'); } catch { /* private mode */ } }
    // drawn leaves carry a mask in the alpha channel (post.js), which alpha-to-coverage would read as holes
    for (const mat of leafMats) {
      if (mat.alphaToCoverage !== !look) { mat.alphaToCoverage = !look; mat.needsUpdate = true; }
    }
    shared.uLook.value = look;
    mood.state.look = look;
    document.body.dataset.look = look ? 'ink' : 'real';
    ui.setLook(look);
    shadows.invalidate();
  }

  bindCanvasInteractions({
    rig, data, ui, mood, pick, syncCard, toggleLabels,
    toggleLook: () => setLook(!look, true),
    captureView: () => { void runCapture(); },
  });
  rig.onInteract(() => ui.hideHint());

  // ---------- resize & lost GPU context ----------
  // Changing the canvas size clears its drawing buffer, so size changes are deferred and applied at the top of step().
  let pendingResize = RESIZE_NONE;
  function resizeBuffers() {
    renderer.setPixelRatio(fitPixelRatio());
    renderer.setSize(innerWidth, innerHeight, false);
    if (post) post.resize(); // each resize reallocates the multisampled post targets and the mirror's
    water.mesh.userData.resize(innerWidth, innerHeight);
  }
  function resizeAll() {
    resizeBuffers();
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    labels.remeasure();
    home = computeHomeView(bridge);
    rig.setHome(home.pos, home.target);
    if (rig.opening && !rig.flying) rig.jumpHome(); // otherwise keep the current view or flight destination
  }
  addEventListener('resize', () => { pendingResize = RESIZE_FULL; });

  canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); console.warn('[hue] WebGL context lost'); });
  canvas.addEventListener('webglcontextrestored', () => {
    console.warn('[hue] WebGL context restored');
    if (releasedCount()) { location.reload(); return; } // the vertex data was dropped after upload: rebuild from scratch
    if (ibl) ibl.invalidate();
    shadows.invalidate();
    water.mesh.userData.invalidate?.();
    pendingResize = Math.max(pendingResize, RESIZE_BUFFERS);
  });

  // ---------- frame loop ----------
  const adaptive = createAdaptiveQuality({
    renderer, water, post, shadows,
    onRequestBufferResize: () => { pendingResize = Math.max(pendingResize, RESIZE_BUFFERS); },
    onDisablePost: () => { usePost = false; },
  });

  let lastFrameTime = performance.now();
  const shadowFocus = new THREE.Vector3();
  let elapsedTime = 0;

  function updateShadow() {
    const dist = camera.position.distanceTo(controls.target);
    shadowFocus.copy(controls.target);
    shadowFocus.y = LAND_Y + rise(shadowFocus.x, shadowFocus.z);
    const extent = Math.max(SHADOW_EXTENT.minM, Math.min(SHADOW_EXTENT.maxM, dist * SHADOW_EXTENT.distRatio));
    shadows.update(shadowFocus, mood.sunDir, extent);
  }

  function syncGlow() {
    syncGlowUniforms({ renderer, camera, world, bridge, extraGlows, lanterns, lanternGlows, glow: mood.cur.glow });
  }

  captureCtrl = createCapture({
    renderer,
    scene,
    camera,
    post,
    water,
    shadows,
    lowQuality: quality.low,
    getUsePost: () => usePost,
    setUsePost: (on) => { usePost = on; },
    syncGlow,
    updateShadow,
    restoreLiveView: () => {
      resizeBuffers();
      syncGlow();
      draw();
    },
    getPlaceId: () => ui.cardId || null,
    onBusy: (busy) => {
      isCapturing = busy;
      ui.setCapturing(busy);
    },
  });

  function step(dt: number) {
    if (pendingResize) {
      const fullResize = pendingResize === RESIZE_FULL;
      pendingResize = RESIZE_NONE;
      if (fullResize) resizeAll(); else resizeBuffers();
    }
    elapsedTime += dt;
    rig.update(dt);
    mood.update(dt, elapsedTime);

    const cameraAltitude = Math.max(0, camera.position.y - LAND_Y);
    if (scene.fog && 'density' in scene.fog && cameraAltitude > HIGH_ALT_FOG.startM) {
      const fade = THREE.MathUtils.smoothstep(cameraAltitude, HIGH_ALT_FOG.startM, HIGH_ALT_FOG.endM);
      (scene.fog as THREE.FogExp2).density *= 1 - HIGH_ALT_FOG.maxReduction * fade;
    }

    bridge.update(elapsedTime, mood.cur.glow, mood.state.rain);
    floating.update(elapsedTime);
    replicas.update(elapsedTime, mood.cur.glow, mood.state.rain);
    citadel.update(elapsedTime, 0.35 + 0.65 * Math.min(1, mood.cur.sunI / 2.2 + mood.cur.hemiI * 0.25));
    boats.update(dt, elapsedTime);
    lanterns.update(dt, elapsedTime);
    traffic.update(dt);
    street.update(dt, elapsedTime);
    heroes.update(camera.position);
    updateDetail(camera, adaptive.detailReach);
    updateShadow();
    sky.mesh.scale.setScalar(camera.far * SKY_FAR_SCALE);

    syncGlow();

    if (post) {
      const morningMist = (1 - THREE.MathUtils.smoothstep(mood.state.time, 0, 0.85)) * 0.52;
      const winterMist = mood.state.winter * 0.42;
      const mist = 0.38 + morningMist + winterMist + 0.45 * mood.state.rain + 0.1 * mood.cur.glow;
      post.setMood(mood.cur.glow, mood.state.rain, mood.cur.fog, mist, elapsedTime);
      // focus on what the camera is looking at; near the ground everything is sharp, illustrated look is sharp throughout
      const focusDist = camera.position.distanceTo(controls.target);
      const aperture = (1 - look) * DOF_ALTITUDE.maxAperture * THREE.MathUtils.smoothstep(camera.position.y - LAND_Y, DOF_ALTITUDE.startM, DOF_ALTITUDE.endM);
      post.setFocus(focusDist, aperture);
      post.setLook(look);
    }
    draw();
    labels.update(innerWidth, innerHeight);
    ui.setHeading(rig.heading());
  }

  function tick() {
    const now = performance.now();
    const dt = Math.min(MAX_FRAME_DT_S, (now - lastFrameTime) / 1000);
    lastFrameTime = now;
    if (!isCapturing) {
      step(dt);
      adaptive.observe(now);
    }
    requestAnimationFrame(tick);
  }

  // ---------- initial frame & startup ----------
  let savedLook: string | null = null;
  try { savedLook = localStorage.getItem('hue-look'); } catch { /* private mode */ }
  setLook((new URLSearchParams(location.search).get('look') || savedLook || 'ink') !== 'real');

  // a shared view (?v=1…, src/ui/share.js) replaces the opening: atmosphere, camera and card are set before the first draw
  sharing = createShare({ data, rig, mood, setLook, pick, ui, bounds: cameraBounds });
  const sharedView = sharing.apply();
  if (post?.ready) await post.ready;
  releaseAfterUpload(scene); // vertex arrays leave JS memory once they are on the GPU (geo/release.js)
  step(0); // update mood, detail, lights, shadows and compile shaders before the curtain lifts
  console.debug(`[hue] ready in ${Math.round(performance.now() - startTime)} ms`);
  ui.loaderProgress(LOADER_PROGRESS.done);
  await nextMacrotask();
  ui.loaderDone();
  performance.mark('hue:first-frame');
  if (ui.cardId && !sharedView) pick(ui.cardId, true); // a place opened from the search box while the city loaded: go there now

  // `?still`: no frame loop, no drift, no adaptive resolution (for deterministic screenshot capture)
  const isStill = new URLSearchParams(location.search).has('still');
  if (!isStill) {
    requestAnimationFrame(tick);
    setTimeout(() => { rig.startDrift(); if (!rig.touched) ui.firstHint(); }, DRIFT_START_DELAY_MS);
  }

  const tiles = Promise.all([
    streamRemainingTiles({ data, world, leafMats, shadows, sun, syncLeafLook: () => setLook(look) }),
    buildDeferredPlaces(data, dynamic, replicas).then((meshes) => {
      if (!KEEP_GEOMETRY) { delete data.sites; delete data.gates; }
      if (meshes.length) {
        if (shadows.invalidate) shadows.invalidate();
        dispatchEvent(new CustomEvent('hue:scene-changed', { detail: { meshes } }));
      }
    }),
  ]);

  // handle for debugging and automated checks (tiles: resolves once every tile is in the scene)
  window.__hue = {
    rig, mood, data, scene, renderer, world, bridge, pick, step, post, labels, THREE, setLook, shadows, sharing, tiles, heroes,
    capture: (preset?: CapturePreset, opts?: { download?: boolean }) => captureCtrl?.capture(preset, opts),
  };
}

main().catch((err) => {
  console.error(err);
  // the recovery screen with a reload; the 2D map too if the place index arrived
  (fallback || createFallback({ ui, index: ui && index })).fail(err);
});
