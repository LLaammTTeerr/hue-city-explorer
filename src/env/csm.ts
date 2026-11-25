import * as THREE from 'three';
import { lodFlips } from '../geo/lod.ts';

const CSM_CFG = {
  defaultTightSize: 2048,
  tightShadowRadius: 1.8,
  towardMarginM: 720,
  behindMarginM: 160,
  depthExtentRatio: 1.5,
  normalBiasTexels: 1.5,
  depthBiasTexels: 0.6,
  extentUpdateEpsM: 0.01,
  minWideExtentM: 260,
  extentStepRatio: 1.12,
  panDeadbandRatio: 0.08,
  nearMinExtentM: 36,
  nearExtentRatio: 0.27,
  cadenceWideSpanM: 1300,
  wideCadenceMinS: 0.5,
  wideCadenceMaxS: 1.0,
  nearCadenceMinS: 0.1,
  nearCadenceMaxS: 0.25,
  minVisibleShadowIntensity: 0.002,
  cadenceJitterS: 0.004,
  warmupFrames: 2,
} as const;

interface CascadeMap {
  light: THREE.DirectionalLight;
  key: number[];
  dirty: boolean;
  lastDrawnS: number;
  pendingFocus: THREE.Vector3;
  pendingDir: THREE.Vector3;
  pendingExtent: number;
}

// Shadow maps for an orbiting camera: boxes centred on the point of attention rather than slices of the view
// frustum (from the air the whole model lies beyond any sensible far slice). The sun carries the wide map, as it
// always did; `tight` adds a second, unlit directional light whose map covers the middle of the view at about four
// times the resolution.
export function createCascades(scene: THREE.Scene, sun: THREE.DirectionalLight, { tight = true, tightSize = CSM_CFG.defaultTightSize } = {}) {
  let near: THREE.DirectionalLight | null = null;
  if (tight) {
    near = new THREE.DirectionalLight(0xffffff, 0);
    near.castShadow = true;
    near.shadow.mapSize.set(tightSize, tightSize);
    near.shadow.radius = CSM_CFG.tightShadowRadius;
    scene.add(near, near.target);
  }

  const worldUp = new THREE.Vector3(0, 1, 0);
  const axisRight = new THREE.Vector3();
  const axisUp = new THREE.Vector3();
  const snappedFocus = new THREE.Vector3();
  const sphereOffset = new THREE.Vector3();

  function snapFocus(light: THREE.DirectionalLight, focus: THREE.Vector3, dir: THREE.Vector3, extent: number, out: THREE.Vector3) {
    const texel = (extent * 2) / light.shadow.mapSize.x;
    // snap the centre to the map's own texel grid, so shadow edges do not crawl as the view pans
    axisRight.crossVectors(worldUp, dir).normalize();
    axisUp.crossVectors(dir, axisRight);
    out.copy(focus);
    const projRight = out.dot(axisRight);
    const projUp = out.dot(axisUp);
    out
      .addScaledVector(axisRight, Math.round(projRight / texel) * texel - projRight)
      .addScaledVector(axisUp, Math.round(projUp / texel) * texel - projUp);
  }

  function placeShadowBox(light: THREE.DirectionalLight, snapped: THREE.Vector3, dir: THREE.Vector3, extent: number) {
    const texel = (extent * 2) / light.shadow.mapSize.x;
    // toward the sun: far enough to catch a 250 m rise casting into the box; behind: the far corner of the box
    const toward = extent * CSM_CFG.depthExtentRatio + CSM_CFG.towardMarginM;
    const behind = extent * CSM_CFG.depthExtentRatio + CSM_CFG.behindMarginM;
    light.target.position.copy(snapped);
    light.position.copy(snapped).addScaledVector(dir, toward);

    const cam = light.shadow.camera;
    if (Math.abs(cam.right - extent) > CSM_CFG.extentUpdateEpsM) {
      cam.left = -extent;
      cam.right = extent;
      cam.top = extent;
      cam.bottom = -extent;
      cam.near = 1;
      cam.far = toward + behind;
      cam.updateProjectionMatrix();
      light.shadow.normalBias = texel * CSM_CFG.normalBiasTexels;
      light.shadow.bias = -(texel * CSM_CFG.depthBiasTexels) / (toward + behind);
    }
  }

  sun.shadow.autoUpdate = false;
  if (near) near.shadow.autoUpdate = false;
  const maps: CascadeMap[] = [sun, near].filter(Boolean).map((light) => ({
    light: light as THREE.DirectionalLight,
    key: [],
    dirty: true,
    lastDrawnS: -Infinity,
    pendingFocus: new THREE.Vector3(),
    pendingDir: new THREE.Vector3(0, 1, 0),
    pendingExtent: CSM_CFG.minWideExtentM,
  }));
  const stats = { sun: 0, near: 0 };
  let preferIdx = 0;
  let warmFrames = CSM_CFG.warmupFrames; // the first frames draw both maps, so neither starts empty

  function checkDirty(map: CascadeMap, focus: THREE.Vector3, quantizedExtent: number, dir: THREE.Vector3, lod: any) {
    snapFocus(map.light, focus, dir, quantizedExtent, snappedFocus);
    map.pendingFocus.copy(snappedFocus);
    map.pendingDir.copy(dir);
    map.pendingExtent = quantizedExtent;

    if (map.key.length === 0) { map.dirty = true; return; }
    // extent or sun direction changed -> redraw immediately
    if (map.key[3] !== quantizedExtent || map.key[4] !== dir.x || map.key[5] !== dir.y || map.key[6] !== dir.z) {
      map.dirty = true;
      return;
    }
    // only re-center the shadow box once the focus drifts past a small fraction of its half-width,
    // so panning does not re-render millions of shadow triangles every frame and shadows stay rock-solid
    const drift = Math.hypot(snappedFocus.x - map.key[0], snappedFocus.y - map.key[1], snappedFocus.z - map.key[2]);
    if (drift > quantizedExtent * CSM_CFG.panDeadbandRatio) {
      map.dirty = true;
      return;
    }
    if (lod.all) { map.dirty = true; return; }

    // a chunk shown or hidden matters only if it casts and its sphere reaches into this map's square
    const extent = map.light.shadow.camera.right;
    const targetPos = map.light.target.position;
    axisRight.crossVectors(worldUp, dir).normalize();
    axisUp.crossVectors(dir, axisRight);
    for (const obj of lod.list) {
      if (!obj.castShadow) continue;
      const boundsSphere = obj.boundingSphere;
      if (!boundsSphere) { map.dirty = true; return; }
      sphereOffset.copy(boundsSphere.center).applyMatrix4(obj.matrixWorld).sub(targetPos);
      const reach = boundsSphere.radius * obj.matrixWorld.getMaxScaleOnAxis() + extent;
      if (Math.abs(sphereOffset.dot(axisRight)) < reach && Math.abs(sphereOffset.dot(axisUp)) < reach) {
        map.dirty = true;
        return;
      }
    }
  }

  function redrawMap(map: CascadeMap, nowSec: number) {
    // apply box position, frustum and bias atomically with the redraw so a skipped cascade never mismatches its map
    placeShadowBox(map.light, map.pendingFocus, map.pendingDir, map.pendingExtent);
    map.key = [
      map.pendingFocus.x, map.pendingFocus.y, map.pendingFocus.z,
      map.pendingExtent, map.pendingDir.x, map.pendingDir.y, map.pendingDir.z,
    ];
    map.light.shadow.needsUpdate = true;
    map.dirty = false;
    map.lastDrawnS = nowSec;
    stats[map.light === sun ? 'sun' : 'near']++;
  }

  return {
    near,
    stats,
    // redraw both maps (new casters that bypass lodAdd, a restored context, anything the keys cannot see)
    invalidate() { for (const map of maps) map.dirty = true; },
    // allow adaptive quality to disable the second shadow cascade on struggling GPUs
    setNearEnabled(on: boolean) {
      if (!near || near.castShadow === !!on) return;
      near.castShadow = !!on;
      near.shadow.intensity = on ? sun.shadow.intensity : 0;
      for (const map of maps) map.dirty = true;
    },
    // extent: half-width of the wide map in metres
    update(focus: THREE.Vector3, dir: THREE.Vector3, extent: number, nowSec = performance.now() / 1000) {
      // step the size in ~12 % stages, so zooming does not re-grid the map every frame
      const stepPower = Math.ceil(Math.log(Math.max(CSM_CFG.minWideExtentM, extent) / CSM_CFG.minWideExtentM) / Math.log(CSM_CFG.extentStepRatio));
      const quantizedExtent = CSM_CFG.minWideExtentM * Math.pow(CSM_CFG.extentStepRatio, stepPower);
      const nearExtent = Math.max(CSM_CFG.nearMinExtentM, quantizedExtent * CSM_CFG.nearExtentRatio);
      if (near && near.castShadow) near.shadow.intensity = sun.shadow.intensity;

      const lod = lodFlips();
      for (const map of maps) {
        if (!map.light.castShadow) continue;
        checkDirty(map, focus, map.light === sun ? quantizedExtent : nearExtent, dir, lod);
      }
      if (warmFrames > 0) {
        warmFrames--;
        for (const map of maps) if (map.light.castShadow) redrawMap(map, nowSec);
        return;
      }

      // the movers' cadence in seconds, per map (wide, near); none while the shadows are faded out
      const sizeBlend = Math.min(1, (quantizedExtent - CSM_CFG.minWideExtentM) / CSM_CFG.cadenceWideSpanM);
      const cadences = [
        THREE.MathUtils.lerp(CSM_CFG.wideCadenceMinS, CSM_CFG.wideCadenceMaxS, sizeBlend),
        THREE.MathUtils.lerp(CSM_CFG.nearCadenceMinS, CSM_CFG.nearCadenceMaxS, sizeBlend),
      ];
      const shadowsVisible = sun.shadow.intensity > CSM_CFG.minVisibleShadowIntensity;

      // a changed map before one that is only due; between equals, the one not drawn last
      let chosenIdx = -1;
      for (let pass = 0; pass < 2 && chosenIdx < 0; pass++) {
        for (let offset = 0; offset < maps.length; offset++) {
          const idx = (preferIdx + offset) % maps.length;
          const map = maps[idx];
          if (!map.light.castShadow) continue;
          const isDue = pass > 0 && shadowsVisible && nowSec - map.lastDrawnS >= cadences[idx] - CSM_CFG.cadenceJitterS;
          if (map.dirty || isDue) { chosenIdx = idx; break; }
        }
      }
      if (chosenIdx < 0) return;
      redrawMap(maps[chosenIdx], nowSec);
      preferIdx = (chosenIdx + 1) % maps.length;
    },
  };
}
