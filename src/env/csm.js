import * as THREE from 'three';
import { lodFlips } from '../geo/lod.js';

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
  // The maps are drawn by turns, at most one a frame: the city is too many vertices to send down twice. A map's
  // matrix is only renewed when it is drawn, so the one that waits stays true to what it holds. (It also keeps the
  // water's mirror pass, a second render of the scene, from drawing both maps again.)
  // A map is redrawn as soon as what it holds changes: its snapped box (centre or size step), the sun's direction,
  // a casting chunk inside it shown or hidden (lodFlips: distance culling, chunks added later) or invalidate().
  // Otherwise only the moving casters (traffic, people, the train, boats, swaying tree cards) need it, and they get a
  // cadence rather than every frame: the near map ~30 Hz close in, slowing to ~10 Hz as the view widens and the
  // movers shrink to a few pixels; the wide map, which holds them at a few texels each, 10 Hz down to 3 Hz.
  sun.shadow.autoUpdate = false;
  if (near) near.shadow.autoUpdate = false;
  const maps = [sun, near].filter(Boolean).map((light) => ({ light, key: [], dirty: true, last: -Infinity }));
  const stats = { sun: 0, near: 0 }; // maps drawn so far, for measuring
  let prefer = 0, warm = 2; // the first frames draw both maps, so neither starts empty
  const c = new THREE.Vector3();
  function check(m, q, dir, lod) {
    const t = m.light.target.position;
    const nk = [t.x, t.y, t.z, q, dir.x, dir.y, dir.z];
    for (let i = 0; i < nk.length; i++) if (m.key[i] !== nk[i]) { m.dirty = true; m.key = nk; return; }
    if (lod.all) { m.dirty = true; return; }
    // a chunk shown or hidden matters only if it casts and its sphere reaches into this map's square
    const ext = m.light.shadow.camera.right;
    r.crossVectors(UP, dir).normalize(); u.crossVectors(dir, r);
    for (const o of lod.list) {
      if (!o.castShadow) continue;
      const bs = o.boundingSphere;
      if (!bs) { m.dirty = true; return; }
      c.copy(bs.center).applyMatrix4(o.matrixWorld).sub(t);
      const rad = bs.radius * o.matrixWorld.getMaxScaleOnAxis() + ext;
      if (Math.abs(c.dot(r)) < rad && Math.abs(c.dot(u)) < rad) { m.dirty = true; return; }
    }
  }
  function draw(m, now) {
    m.light.shadow.needsUpdate = true;
    m.dirty = false; m.last = now;
    stats[m.light === sun ? 'sun' : 'near']++;
  }
  return {
    near,
    stats,
    // redraw both maps (new casters that bypass lodAdd, a restored context, anything the keys cannot see)
    invalidate() { for (const m of maps) m.dirty = true; },
    // ext: half-width of the wide map in metres
    update(focus, dir, ext, now = performance.now() / 1000) { // now: seconds
      // step the size in ~12 % stages, so zooming does not re-grid the map every frame
      const q = 260 * Math.pow(1.12, Math.ceil(Math.log(Math.max(260, ext) / 260) / Math.log(1.12)));
      place(sun, focus, dir, q);
      if (near) {
        place(near, focus, dir, Math.max(36, q * 0.27));
        near.shadow.intensity = sun.shadow.intensity;
      }
      const lod = lodFlips();
      for (const m of maps) check(m, q, dir, lod);
      if (warm > 0) { warm--; for (const m of maps) draw(m, now); return; }
      // the movers' cadence in seconds, per map (wide, near); none while the shadows are faded out
      const s = Math.min(1, (q - 260) / 1300);
      const every = [THREE.MathUtils.lerp(0.1, 0.33, s), THREE.MathUtils.lerp(0.033, 0.1, s)];
      const shown = sun.shadow.intensity > 0.002;
      // a changed map before one that is only due; between equals, the one not drawn last
      let pick = -1;
      for (let pass = 0; pass < 2 && pick < 0; pass++) {
        for (let j = 0; j < maps.length; j++) {
          const i = (prefer + j) % maps.length, m = maps[i];
          if (m.dirty || (pass && shown && now - m.last >= every[i] - 0.004)) { pick = i; break; }
        }
      }
      if (pick < 0) return;
      draw(maps[pick], now);
      prefer = (pick + 1) % maps.length;
    },
  };
}
