import * as THREE from 'three';

// The city is static: once a mesh's vertex data is on the GPU, the copy three.js keeps in JavaScript is only read
// again for raycasts against the mesh (the app picks the ground from the terrain function, not the meshes) or to
// re-upload after a lost WebGL context (main.js reloads the page instead). Dropping those copies after upload frees
// most of the JS heap (~250 MB on the full city). `?keepgeo` keeps them, for scripts that raycast the scene.
//
// Left alone: Points and Lines (small, some are recoloured every frame), attributes marked dynamic or instanced
// (instance matrices, colours, offsets are rewritten), and geometries flagged userData.keepArrays.
export const KEEP_GEOMETRY = typeof location !== 'undefined' && new URLSearchParams(location.search).has('keepgeo');

let released = 0; // attributes whose arrays have been dropped (main.js reloads on a restored context if > 0)
const watched = new WeakSet<THREE.BufferGeometry>();

function dropArray(this: THREE.BufferAttribute) {
  (this as any).array = null;
  released++;
}

const noRaycast = () => {};

function watch(geo: THREE.BufferGeometry) {
  if (watched.has(geo) || geo.userData.keepArrays) return;
  watched.add(geo);
  // bounds are read for culling and shadows for as long as the mesh lives: work them out while the data is here
  if (!geo.boundingBox) geo.computeBoundingBox();
  if (!geo.boundingSphere) geo.computeBoundingSphere();
  const attrs: THREE.BufferAttribute[] = Object.values(geo.attributes) as THREE.BufferAttribute[];
  if (geo.index) attrs.push(geo.index);
  for (const attr of attrs) {
    if (!attr.isBufferAttribute || (attr as any).isInstancedBufferAttribute) continue;
    if (attr.usage !== THREE.StaticDrawUsage || attr.onUploadCallback !== THREE.BufferAttribute.prototype.onUploadCallback) continue;
    attr.onUpload(dropArray);
  }
}

// Mark every static mesh under root so its vertex arrays are dropped right after their first upload.
export function releaseAfterUpload(root: THREE.Object3D) {
  if (KEEP_GEOMETRY) return;
  root.traverse((obj: any) => {
    if (!obj.isMesh || !obj.geometry || obj.userData.keepArrays) return;
    watch(obj.geometry);
    if (!obj.geometry.userData.keepArrays) obj.raycast = noRaycast; // a raycast would read the dropped positions
  });
}

export const releasedCount = () => released;
