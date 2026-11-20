import * as THREE from 'three';

// Distance culling for chunked instanced meshes. Each registered mesh is drawn only while its chunk is within
// its reach of the camera; the reach grows with the camera's height, so the whole-model view still shows it all.
const items = [];
const v = new THREE.Vector3();

export function lodAdd(mesh, reach) {
  items.push([mesh, reach]);
}
export function lodUpdate(camera, scale = 1) {
  const lift = Math.max(0, camera.position.y - 120) * 2.2;
  for (const [m, reach] of items) {
    const bs = m.boundingSphere;
    m.visible = !bs || v.copy(bs.center).distanceTo(camera.position) < reach * scale + lift + bs.radius;
  }
}
