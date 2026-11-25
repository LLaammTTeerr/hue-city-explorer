import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { cityMaterial } from './materials.ts';
import { KIND } from './buf.ts';
import { LAND_Y, quality } from '../config.ts';
import { rise } from './terrain.ts';
import { HERO_MODELS } from './hero-manifest.ts';

export { HERO_MODELS };

const MAX_LOW_HEROES = 24;
const HERO_CHECK_INTERVAL_MS = 400;
const HERO_EVICT_RADIUS_MULT = 1.35;
const DEFAULT_HERO_COLOR = 0xd8b25a;

// Convert a loaded glTF Mesh to Hue's shared cityMaterial convention (sqrt-encoded linear vertex colors, aKind, aBase).
function bindCityMaterial(mesh: THREE.Mesh, sharedMat: THREE.Material) {
  const geo = mesh.geometry;
  if (!geo || !geo.attributes.position) return;
  const vertCount = geo.attributes.position.count;
  if (!geo.attributes.normal) geo.computeVertexNormals();

  const encodedColors = new Float32Array(vertCount * 3);
  if (!geo.attributes.color) {
    const baseCol = (mesh.material as any)?.color ? (mesh.material as any).color : new THREE.Color(DEFAULT_HERO_COLOR);
    const sr = Math.sqrt(Math.max(0, baseCol.r));
    const sg = Math.sqrt(Math.max(0, baseCol.g));
    const sb = Math.sqrt(Math.max(0, baseCol.b));
    for (let i = 0; i < vertCount; i++) {
      encodedColors[i * 3] = sr;
      encodedColors[i * 3 + 1] = sg;
      encodedColors[i * 3 + 2] = sb;
    }
  } else {
    const colorAttr = geo.attributes.color;
    for (let i = 0; i < vertCount; i++) {
      encodedColors[i * 3] = Math.sqrt(Math.max(0, colorAttr.getX(i)));
      encodedColors[i * 3 + 1] = Math.sqrt(Math.max(0, colorAttr.getY(i)));
      encodedColors[i * 3 + 2] = Math.sqrt(Math.max(0, colorAttr.getZ(i)));
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(encodedColors, 3));

  const kindVal = mesh.userData?.hueKind ?? KIND.PLAIN;
  const kindArr = new Float32Array(vertCount).fill(kindVal);
  geo.setAttribute('aKind', new THREE.BufferAttribute(kindArr, 1));
  geo.setAttribute('aBase', new THREE.BufferAttribute(new Float32Array(vertCount), 1));
  mesh.material = sharedMat;
  mesh.castShadow = !quality.low;
  mesh.receiveShadow = true;
}

function disposeRoot(root: THREE.Object3D) {
  root.traverse((obj: any) => {
    if (obj.isMesh && obj.geometry) obj.geometry.dispose();
  });
}

export function createHeroLoader(parentGroup: THREE.Group, onLoaded: ((id: string, root: THREE.Object3D) => void) | null = null) {
  const loader = new GLTFLoader();
  const sharedMat = cityMaterial({ windows: false, hero: true });
  const loadState = new Map<string, any>(); // id -> Promise | 'loaded' | 'failed'
  const roots = new Map<string, THREE.Object3D>();
  const lastUsed = new Map<string, number>(); // id -> timestamp for LRU eviction on quality.low
  let lastCheckMs = 0;

  function evictIfNeeded(camPos: THREE.Vector3) {
    if (!quality.low || roots.size <= MAX_LOW_HEROES) return;
    const candidates: { id: string; lastUsedMs: number }[] = [];
    for (const entry of HERO_MODELS) {
      if (!roots.has(entry.id)) continue;
      const dist = camPos ? Math.hypot(camPos.x - entry.pos[0], camPos.z - entry.pos[2]) : Infinity;
      if (dist < entry.radius * HERO_EVICT_RADIUS_MULT) continue;
      candidates.push({ id: entry.id, lastUsedMs: lastUsed.get(entry.id) || 0 });
    }
    candidates.sort((a, b) => a.lastUsedMs - b.lastUsedMs);
    for (const candidate of candidates) {
      if (roots.size <= MAX_LOW_HEROES) break;
      const root = roots.get(candidate.id);
      if (root) {
        parentGroup.remove(root);
        disposeRoot(root);
      }
      roots.delete(candidate.id);
      loadState.delete(candidate.id);
      lastUsed.delete(candidate.id);
    }
  }

  function loadEntry(entry: (typeof HERO_MODELS)[number]) {
    lastUsed.set(entry.id, performance.now());
    if (loadState.has(entry.id)) return loadState.get(entry.id);
    const url = `${import.meta.env.BASE_URL}data/models/${entry.file}`;
    const promise = new Promise((resolve) => {
      loader.load(
        url,
        (gltf) => {
          const root = gltf.scene;
          root.name = `hero:${entry.id}`;
          root.position.set(entry.pos[0], LAND_Y + rise(entry.pos[0], entry.pos[2]) + (entry.pos[1] || 0), entry.pos[2]);
          root.rotation.y = entry.rotY || 0;
          root.traverse((obj: any) => {
            if (obj.isMesh) {
              bindCityMaterial(obj, sharedMat);
              obj.userData.landmark = entry.id;
            }
          });
          parentGroup.add(root);
          roots.set(entry.id, root);
          loadState.set(entry.id, 'loaded');
          lastUsed.set(entry.id, performance.now());
          if (onLoaded) onLoaded(entry.id, root);
          resolve(root);
        },
        undefined,
        (err: any) => {
          console.warn(`[hue] hero model ${entry.file} not loaded:`, err?.message || err);
          loadState.set(entry.id, 'failed');
          resolve(null);
        },
      );
    });
    loadState.set(entry.id, promise);
    return promise;
  }

  return {
    prefetch(id: string) {
      const entry = HERO_MODELS.find((item) => item.id === id);
      return entry ? loadEntry(entry) : Promise.resolve(null);
    },
    update(camPos: THREE.Vector3) {
      const now = performance.now();
      if (now - lastCheckMs < HERO_CHECK_INTERVAL_MS) return;
      lastCheckMs = now;
      for (const entry of HERO_MODELS) {
        const dist = Math.hypot(camPos.x - entry.pos[0], camPos.z - entry.pos[2]);
        if (dist < entry.radius) {
          lastUsed.set(entry.id, now);
          if (!loadState.has(entry.id)) loadEntry(entry);
        }
      }
      evictIfNeeded(camPos);
    },
    status() {
      const out: Record<string, string> = {};
      for (const entry of HERO_MODELS) {
        const current = loadState.get(entry.id);
        out[entry.id] = typeof current === 'string' ? current : current ? 'loading' : 'idle';
      }
      return out;
    },
    roots,
  };
}
