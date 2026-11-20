import * as THREE from 'three';

// Shadow maps for an orbiting camera: boxes centred on the point of attention rather than slices of the view
// frustum (from the air the whole model lies beyond any sensible far slice). The sun carries the wide map, as it
// always did; `tight` adds a second, unlit directional light whose map covers the middle of the view at about four
// times the resolution. cityMaterial and landMaterial pick the tight map where it reaches (see LIGHTS in
// src/geo/materials.js); a stock material simply keeps the wide one.
// Each box hugs the model in depth too, so the bias is a few texels, not metres: shadows meet what casts them.
export function createCascades(scene, sun, { tight = true, tightSize = 2048 } = {}) {
  let near = null;
  if (tight) {
    near = new THREE.DirectionalLight(0xffffff, 0);
    near.castShadow = true;
    near.shadow.mapSize.set(tightSize, tightSize);
    near.shadow.radius = 1.8;
    scene.add(near, near.target);
  }
  const UP = new THREE.Vector3(0, 1, 0), r = new THREE.Vector3(), u = new THREE.Vector3(), f = new THREE.Vector3();
  function place(light, focus, dir, ext) {
    const texel = (ext * 2) / light.shadow.mapSize.x;
    // snap the centre to the map's own texel grid, so shadow edges do not crawl as the view pans
    r.crossVectors(UP, dir).normalize(); u.crossVectors(dir, r);
    f.copy(focus);
    const a = f.dot(r), b = f.dot(u);
    f.addScaledVector(r, Math.round(a / texel) * texel - a).addScaledVector(u, Math.round(b / texel) * texel - b);
    // toward the sun: far enough to catch a 250 m rise casting into the box; behind: the far corner of the box
    const toward = ext * 1.5 + 720, behind = ext * 1.5 + 160;
    light.target.position.copy(f);
    light.position.copy(f).addScaledVector(dir, toward);
    const cam = light.shadow.camera;
    if (Math.abs(cam.right - ext) > 0.01) {
      cam.left = -ext; cam.right = ext; cam.top = ext; cam.bottom = -ext; cam.near = 1; cam.far = toward + behind;
      cam.updateProjectionMatrix();
      light.shadow.normalBias = texel * 1.5;
      light.shadow.bias = -(texel * 0.6) / (toward + behind);
    }
  }
  // The maps are drawn by turns, one a frame: the city is too many vertices to send down twice. A map's matrix is
  // only renewed when it is drawn, so the one that waits stays true to what it holds. (It also keeps the water's
  // mirror pass, a second render of the scene, from drawing both maps again.)
  sun.shadow.autoUpdate = false;
  if (near) near.shadow.autoUpdate = false;
  let turn = 0;
  return {
    near,
    // ext: half-width of the wide map in metres
    update(focus, dir, ext) {
      // step the size in ~12 % stages, so zooming does not re-grid the map every frame
      const q = 260 * Math.pow(1.12, Math.ceil(Math.log(Math.max(260, ext) / 260) / Math.log(1.12)));
      place(sun, focus, dir, q);
      if (near) {
        place(near, focus, dir, Math.max(36, q * 0.27));
        near.shadow.intensity = sun.shadow.intensity;
      }
      turn++;
      if (!near || turn < 3) { sun.shadow.needsUpdate = true; if (near) near.shadow.needsUpdate = true; }
      else (turn & 1 ? sun : near).shadow.needsUpdate = true;
    },
  };
}
