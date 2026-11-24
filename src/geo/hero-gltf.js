import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { cityMaterial } from './materials.js';
import { KIND } from './buf.js';
import { LAND_Y, quality } from '../config.js';
import { rise } from './terrain.js';
import { HERO_MODELS } from './hero-manifest.js';

export { HERO_MODELS };

// Mobile/low-tier GPU memory cap: evict least-recently-used distant hero roots when exceeding this count.
const MAX_LOW_HEROES = 24;

// Convert a loaded glTF Mesh to Hue's shared cityMaterial convention (sqrt-encoded linear vertex colors, aKind, aBase).
function bindCityMaterial(mesh, sharedMat) {
  const g = mesh.geometry;
  if (!g || !g.attributes.position) return;
  const count = g.attributes.position.count;
  if (!g.attributes.normal) g.computeVertexNormals();
  // Ensure vertex colors exist and are sqrt-encoded (cityMaterial squares vColor.rgb in fragment shader)
  if (!g.attributes.color) {
    const col = mesh.material?.color ? mesh.material.color : new THREE.Color(0xd8b25a);
    const arr = new Float32Array(count * 3);
    const r = Math.sqrt(Math.max(0, col.r));
    const gr = Math.sqrt(Math.max(0, col.g));
    const b = Math.sqrt(Math.max(0, col.b));
    for (let i = 0; i < count; i++) {
      arr[i * 3] = r;
      arr[i * 3 + 1] = gr;
      arr[i * 3 + 2] = b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  } else {
    // glTF COLOR_0 is linear (Float32 or normalized Uint8/Uint16; BufferAttribute.getX denormalizes to [0..1]);
    // sqrt-encode once so cityMaterial's vColor*vColor recovers exact linear RGB
    const c = g.attributes.color;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = Math.sqrt(Math.max(0, c.getX(i)));
      arr[i * 3 + 1] = Math.sqrt(Math.max(0, c.getY(i)));
      arr[i * 3 + 2] = Math.sqrt(Math.max(0, c.getZ(i)));
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  }
  const kind = mesh.userData?.hueKind ?? KIND.PLAIN;
  const kArr = new Float32Array(count);
  kArr.fill(kind);
  g.setAttribute('aKind', new THREE.BufferAttribute(kArr, 1));
  g.setAttribute('aBase', new THREE.BufferAttribute(new Float32Array(count), 1));
  mesh.material = sharedMat;
  mesh.castShadow = !quality.low;
  mesh.receiveShadow = true;
}

function disposeRoot(root) {
  root.traverse((o) => {
    if (o.isMesh && o.geometry) o.geometry.dispose();
  });
}

export function createHeroLoader(parentGroup, onLoaded = null) {
  const loader = new GLTFLoader();
  const mat = cityMaterial({ windows: false });
  const state = new Map(); // id -> 'loading' | 'loaded' | 'failed'
  const roots = new Map();
  const lastUsed = new Map(); // id -> timestamp for LRU eviction on quality.low
  let lastCheck = 0;

  function evictIfNeeded(camPos) {
    if (!quality.low || roots.size <= MAX_LOW_HEROES) return;
    const candidates = [];
    for (const entry of HERO_MODELS) {
      if (!roots.has(entry.id)) continue;
      const d = camPos ? Math.hypot(camPos.x - entry.pos[0], camPos.z - entry.pos[2]) : Infinity;
      if (d < entry.radius * 1.35) continue; // keep active/nearby heroes
      candidates.push({ id: entry.id, t: lastUsed.get(entry.id) || 0 });
    }
    candidates.sort((a, b) => a.t - b.t);
    for (const c of candidates) {
      if (roots.size <= MAX_LOW_HEROES) break;
      const root = roots.get(c.id);
      if (root) {
        parentGroup.remove(root);
        disposeRoot(root);
      }
      roots.delete(c.id);
      state.delete(c.id);
      lastUsed.delete(c.id);
    }
  }

  function loadEntry(entry) {
    lastUsed.set(entry.id, performance.now());
    if (state.has(entry.id)) return state.get(entry.id);
    const url = `${import.meta.env.BASE_URL}data/models/${entry.file}`;
    const p = new Promise((resolve) => {
      loader.load(
        url,
        (gltf) => {
          const root = gltf.scene;
          root.name = `hero:${entry.id}`;
          root.position.set(entry.pos[0], LAND_Y + rise(entry.pos[0], entry.pos[2]) + (entry.pos[1] || 0), entry.pos[2]);
          root.rotation.y = entry.rotY || 0;
          root.traverse((o) => {
            if (o.isMesh) {
              bindCityMaterial(o, mat);
              o.userData.landmark = entry.id;
            }
          });
          parentGroup.add(root);
          roots.set(entry.id, root);
          state.set(entry.id, 'loaded');
          lastUsed.set(entry.id, performance.now());
          if (onLoaded) onLoaded(entry.id, root);
          resolve(root);
        },
        undefined,
        (err) => {
          console.warn(`[hue] hero model ${entry.file} not loaded:`, err?.message || err);
          state.set(entry.id, 'failed');
          resolve(null);
        },
      );
    });
    state.set(entry.id, p);
    return p;
  }

  return {
    prefetch(id) {
      const entry = HERO_MODELS.find((m) => m.id === id);
      return entry ? loadEntry(entry) : Promise.resolve(null);
    },
    update(camPos) {
      const now = performance.now();
      if (now - lastCheck < 400) return;
      lastCheck = now;
      for (const entry of HERO_MODELS) {
        const d = Math.hypot(camPos.x - entry.pos[0], camPos.z - entry.pos[2]);
        if (d < entry.radius) {
          lastUsed.set(entry.id, now);
          if (!state.has(entry.id)) loadEntry(entry);
        }
      }
      evictIfNeeded(camPos);
    },
    status() {
      const out = {};
      for (const entry of HERO_MODELS) {
        const s = state.get(entry.id);
        out[entry.id] = typeof s === 'string' ? s : s ? 'loading' : 'idle';
      }
      return out;
    },
    roots,
  };
}
