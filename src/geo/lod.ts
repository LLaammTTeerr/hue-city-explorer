import * as THREE from 'three';

// Distance culling for chunked instanced meshes. Each registered mesh is drawn only while its chunk is within
// its reach of the camera; the reach grows with the camera's height, so the whole-model view still shows it all.
const items = [];
const v = new THREE.Vector3();
// Chunks shown, hidden or added since the last lodFlips(): the shadow maps, which are only redrawn when something
// they hold changes, read them (src/env/csm.js). Past a few hundred the list gives up and reports `all`.
let flips = [], all = false;
const flip = (m) => { if (all) return; if (flips.length < 512) flips.push(m); else { all = true; flips = []; } };
export function lodFlips() { const out = { all, list: flips }; flips = []; all = false; return out; }

export function lodAdd(mesh, reach, { lift = true, farGeo = null, farDist = 0 } = {}) {
  items.push([mesh, reach, lift, mesh.geometry, farGeo, farDist]);
  flip(mesh);
}
export function lodUpdate(camera, scale = 1) {
  const lift = Math.max(0, camera.position.y - 120) * 3.5;
  for (const [m, reach, useLift, nearGeo, farGeo, farDist] of items) {
    const bs = m.boundingSphere;
    if (!bs) continue;
    // the sphere is in the mesh's own space: take its centre to world space (world.group is identity today, but need not stay so)
    const dist = v.copy(bs.center).applyMatrix4(m.matrixWorld).distanceTo(camera.position);
    const maxDist = reach * scale + (useLift ? lift : 0) + bs.radius;
    // 8% hysteresis deadband so chunks never flicker on/off when hovering near a LOD boundary
    const vis = m.visible ? dist < maxDist * 1.08 : dist < maxDist;
    if (m.visible !== vis) { m.visible = vis; flip(m); }
    if (vis && farGeo && farDist > 0) {
      const swapDist = farDist + bs.radius;
      const useFar = m.geometry === farGeo ? dist > swapDist * 0.9 : dist > swapDist * 1.1;
      const targetGeo = useFar ? farGeo : nearGeo;
      if (m.geometry !== targetGeo) m.geometry = targetGeo;
    }
  }
}
