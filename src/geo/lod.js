import * as THREE from 'three';
import { era } from '../era.js';

// Distance culling for chunked instanced meshes. Each registered mesh is drawn only while its chunk is within
// its reach of the camera; the reach grows with the camera's height, so the whole-model view still shows it all.
// A mesh can also be limited to a range of eras (the old houses that stood on today's plots, modern roof tanks).
const items = [];
const v = new THREE.Vector3();

export function lodAdd(mesh, reach, minEra = 0, maxEra = 2) {
  items.push([mesh, reach, minEra, maxEra]);
}
export function lodUpdate(camera, scale = 1) {
  const lift = Math.max(0, camera.position.y - 120) * 2.2, e = era.value;
  for (const [m, reach, lo, hi] of items) {
    if (e < lo || e > hi) { m.visible = false; continue; }
    const bs = m.boundingSphere;
    m.visible = !bs || v.copy(bs.center).distanceTo(camera.position) < reach * scale + lift + bs.radius;
  }
}
