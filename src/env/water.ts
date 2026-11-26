import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { quality } from '../config.ts';
import { pondY } from '../geo/terrain.ts';
import { Buf } from '../geo/buf.ts';
import { createWaterShader } from './water-shader.ts';

const DECIMETRES_PER_METRE = 10;
const REFLECT_CFG = {
  scale: 0.5,
  maxWidth: 960,
  maxHeight: 540,
  clipBias: 0.0005,
  multisample: 2,
  movePosSqThreshold: 1e-6,
  moveQuatDotThreshold: 0.999999995,
  moveFovThreshold: 1e-4,
  moveNearThreshold: 1e-3,
  nightGlowThreshold: 0.05,
  fadeStartAltM: 750,
  fadeEndAltM: 1250,
} as const;

const FLOW_CFG = {
  defaultStepM: 40,
  endExtensionM: 3000,
  resampleStepM: 25,
  gaussianSigma: 10,
  bandFullM: 430,
  bandFadeEndM: 640,
  coarsePrefilterMarginM: 250,
  foldJumpFactor: 2.2,
} as const;

const POND_BUF_INITIAL = 4096;

function createRiverMesh(geo: THREE.PlaneGeometry, shader: ReturnType<typeof createWaterShader>) {
  if (!quality.reflection) {
    const uniforms = THREE.UniformsUtils.clone(shader.uniforms);
    uniforms.textureMatrix.value = new THREE.Matrix4();
    const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ ...shader, uniforms }));
    mesh.userData.resize = () => {};
    mesh.userData.invalidate = () => {};
    mesh.userData.setReflection = () => {};
    return mesh;
  }

  const targetWidth = (w: number, ratio: number) => Math.max(2, Math.min(REFLECT_CFG.maxWidth, Math.round(w * ratio * REFLECT_CFG.scale)));
  const targetHeight = (h: number, ratio: number) => Math.max(2, Math.min(REFLECT_CFG.maxHeight, Math.round(h * ratio * REFLECT_CFG.scale)));
  const reflector: any = new Reflector(geo, {
    shader,
    textureWidth: targetWidth(innerWidth, quality.pixelRatio),
    textureHeight: targetHeight(innerHeight, quality.pixelRatio),
    clipBias: REFLECT_CFG.clipBias,
    multisample: REFLECT_CFG.multisample,
  });

  // Update the planar water reflection every frame while moving (avoiding multi-frame stutter), skip when the camera
  // is still in daytime, and fade smoothly to analytic sky reflection at high altitude where Fresnel is negligible.
  const renderMirror = reflector.onBeforeRender;
  let enabled = true;
  let hasFrame = false;
  const lastPos = new THREE.Vector3(Infinity, Infinity, Infinity);
  const lastQuat = new THREE.Quaternion();
  let lastFov = NaN;
  let lastNear = NaN;
  let lastAspect = NaN;

  reflector.userData.invalidate = () => { hasFrame = false; };
  reflector.userData.setReflection = (on: boolean) => {
    enabled = !!on;
    reflector.material.uniforms.uReflect.value = enabled ? 1 : 0;
    if (enabled) hasFrame = false;
  };
  reflector.userData.resize = (width: number, height: number, ratioOrRenderer: any = quality.pixelRatio) => {
    const ratio = typeof ratioOrRenderer === 'object' && ratioOrRenderer?.getPixelRatio
      ? ratioOrRenderer.getPixelRatio()
      : ratioOrRenderer;
    reflector.getRenderTarget().setSize(targetWidth(width, ratio), targetHeight(height, ratio));
    hasFrame = false;
  };
  reflector.onBeforeRender = function (...args: any[]) {
    if (!enabled) return;
    const cam = args[2];
    const altFade = 1 - THREE.MathUtils.smoothstep(cam.position.y, REFLECT_CFG.fadeStartAltM, REFLECT_CFG.fadeEndAltM);
    reflector.material.uniforms.uReflect.value = altFade;
    if (altFade <= 0.01) return;
    const hasMoved = !hasFrame
      || cam.position.distanceToSquared(lastPos) > REFLECT_CFG.movePosSqThreshold
      || Math.abs(cam.quaternion.dot(lastQuat)) < REFLECT_CFG.moveQuatDotThreshold
      || Math.abs((cam.fov ?? 0) - lastFov) > REFLECT_CFG.moveFovThreshold
      || Math.abs((cam.near ?? 0) - lastNear) > REFLECT_CFG.moveNearThreshold
      || Math.abs((cam.aspect ?? 0) - lastAspect) > REFLECT_CFG.moveFovThreshold;
    const isNight = reflector.material.uniforms.uGlow.value > REFLECT_CFG.nightGlowThreshold;
    if (!hasMoved && !isNight) return;
    lastPos.copy(cam.position);
    lastQuat.copy(cam.quaternion);
    lastFov = cam.fov ?? 0;
    lastNear = cam.near ?? 0;
    lastAspect = cam.aspect ?? 0;
    hasFrame = true;
    reflector.getReflectionCamera(cam).layers.set(0);
    renderMirror.apply(this, args);
  };
  return reflector;
}

function buildPondsMesh(data: any, shader: ReturnType<typeof createWaterShader>) {
  const buf = new Buf(POND_BUF_INITIAL);
  (data.ponds || []).forEach((poly: number[][], pondIdx: number) => {
    const surfaceY = pondY(data, pondIdx);
    const rings = poly.map((ring) => {
      const pts: THREE.Vector2[] = [];
      for (let i = 0; i < ring.length; i += 2) {
        pts.push(new THREE.Vector2(ring[i] / DECIMETRES_PER_METRE, ring[i + 1] / DECIMETRES_PER_METRE));
      }
      return pts;
    });
    let faces: number[][];
    try { faces = THREE.ShapeUtils.triangulateShape(rings[0], rings.slice(1)); } catch { return; }
    const pts = rings[0].concat(...rings.slice(1));
    for (const tri of faces) {
      buf.tri(
        [pts[tri[0]].x, surfaceY, pts[tri[0]].y],
        [pts[tri[1]].x, surfaceY, pts[tri[1]].y],
        [pts[tri[2]].x, surfaceY, pts[tri[2]].y],
        [1, 1, 1],
        [0, 1, 0],
      );
    }
  });
  const pondUniforms = THREE.UniformsUtils.clone(shader.uniforms);
  pondUniforms.textureMatrix.value = new THREE.Matrix4();
  pondUniforms.uReflect.value = 0;
  const ponds = new THREE.Mesh(buf.geometry(), new THREE.ShaderMaterial({ ...shader, uniforms: pondUniforms }));
  ponds.name = 'ponds';
  ponds.frustumCulled = false;
  return { ponds, pondUniforms };
}

// One sheet of river water under the slab; the land is cut out around the real banks. Lakes, ponds and the
// moat get their own, higher sheet (no mirror pass: they are small and mostly seen from above).
// Desktop gets a planar reflection (the bridge, its lights, the sky); phones get an analytic sky reflection.
export function buildWater(data: any) {
  const shader = createWaterShader();
  const bounds = data.meta.bounds.map((val: number) => val / DECIMETRES_PER_METRE);
  const geo = new THREE.PlaneGeometry(bounds[2] - bounds[0], bounds[3] - bounds[1]);
  const mesh = createRiverMesh(geo, shader);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set((bounds[0] + bounds[2]) / 2, 0, (bounds[1] + bounds[3]) / 2);
  mesh.name = 'water';
  mesh.frustumCulled = false;

  const { ponds, pondUniforms } = buildPondsMesh(data, shader);

  // the river sheet drifts downstream; the ponds keep their flow switched off
  const flow = buildFlow(data, bounds);
  if (flow) {
    const uniforms = mesh.material.uniforms;
    uniforms.tFlow.value = flow.tex;
    uniforms.uFlowBox.value.copy(flow.box);
    uniforms.uFlowSize.value.copy(flow.size);
    uniforms.uFlowOn.value = 1;
  }
  return { mesh, ponds, uniforms: mesh.material.uniforms, sets: [mesh.material.uniforms, pondUniforms] };
}

function smoothCenterline(rawPoints: [number, number][]): [number, number][] {
  const resampled: [number, number][] = [rawPoints[0]];
  for (let i = 0; i + 1 < rawPoints.length; i++) {
    const start = rawPoints[i];
    const end = rawPoints[i + 1];
    const segCount = Math.max(1, Math.ceil(Math.hypot(end[0] - start[0], end[1] - start[1]) / FLOW_CFG.resampleStepM));
    for (let step = 1; step <= segCount; step++) {
      resampled.push([
        start[0] + ((end[0] - start[0]) * step) / segCount,
        start[1] + ((end[1] - start[1]) * step) / segCount,
      ]);
    }
  }
  const sigma = FLOW_CFG.gaussianSigma;
  const radius = 3 * sigma;
  const kernel: number[] = [];
  for (let offset = -radius; offset <= radius; offset++) {
    kernel.push(Math.exp(-(offset * offset) / (2 * sigma * sigma)));
  }
  return resampled.map((_, idx) => {
    let sumX = 0;
    let sumZ = 0;
    let weightSum = 0;
    kernel.forEach((weight, kIdx) => {
      const sample = resampled[Math.min(resampled.length - 1, Math.max(0, idx + kIdx - radius))];
      sumX += sample[0] * weight;
      sumZ += sample[1] * weight;
      weightSum += weight;
    });
    return [sumX / weightSum, sumZ / weightSum];
  });
}

function pointToSegDistSq(x: number, z: number, start: [number, number], end: [number, number]): [number, number] {
  const edgeX = end[0] - start[0];
  const edgeZ = end[1] - start[1];
  const lenSq = edgeX * edgeX + edgeZ * edgeZ || 1;
  const param = Math.max(0, Math.min(1, ((x - start[0]) * edgeX + (z - start[1]) * edgeZ) / lenSq));
  const dx = start[0] + edgeX * param - x;
  const dz = start[1] + edgeZ * param - z;
  return [dx * dx + dz * dz, param];
}

// River coordinates on a coarse grid: for each cell, the distance along the (smoothed) centre line from its upstream
// end (s), the signed distance across it (d) and its unit tangent times a weight.
function buildFlow(data: any, bounds: number[], step = FLOW_CFG.defaultStepM) {
  const rawRiver = data.river;
  if (!rawRiver || rawRiver.length < 4) return null;

  let points: [number, number][] = [];
  for (let i = 0; i < rawRiver.length; i += 2) {
    points.push([rawRiver[i] / DECIMETRES_PER_METRE, rawRiver[i + 1] / DECIMETRES_PER_METRE]);
  }
  // run the ends on straight, so cells past either end still get a sensible frame
  const extendEnd = (tip: [number, number], prev: [number, number]): [number, number] => {
    const dx = tip[0] - prev[0];
    const dz = tip[1] - prev[1];
    const len = Math.hypot(dx, dz) || 1;
    return [tip[0] + (dx / len) * FLOW_CFG.endExtensionM, tip[1] + (dz / len) * FLOW_CFG.endExtensionM];
  };
  const coarse: [number, number][] = [extendEnd(points[0], points[1]), ...points, extendEnd(points[points.length - 1], points[points.length - 2])];
  points = smoothCenterline(coarse);

  const arcLen = [0];
  for (let i = 1; i < points.length; i++) {
    arcLen.push(arcLen[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  }
  const midArc = arcLen[arcLen.length - 1] / 2; // centred, to keep the numbers small in the shader
  const nx = Math.ceil((bounds[2] - bounds[0]) / step) + 1;
  const nz = Math.ceil((bounds[3] - bounds[1]) / step) + 1;
  const cellCount = nx * nz;
  const along = new Float32Array(cellCount);
  const across = new Float32Array(cellCount);
  const tanX = new Float32Array(cellCount);
  const tanZ = new Float32Array(cellCount);
  const weights = new Float32Array(cellCount);
  const prefilterDistSq = (FLOW_CFG.bandFadeEndM + FLOW_CFG.coarsePrefilterMarginM) ** 2;

  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const x = bounds[0] + (i + 0.5) * step;
      const z = bounds[1] + (j + 0.5) * step;
      let nearSq = Infinity;
      for (let k = 0; k + 1 < coarse.length; k++) nearSq = Math.min(nearSq, pointToSegDistSq(x, z, coarse[k], coarse[k + 1])[0]);
      if (nearSq > prefilterDistSq) continue;

      let bestSq = Infinity;
      let bestSeg = 0;
      let bestParam = 0;
      for (let k = 0; k + 1 < points.length; k++) {
        const [distSq, param] = pointToSegDistSq(x, z, points[k], points[k + 1]);
        if (distSq < bestSq) { bestSq = distSq; bestSeg = k; bestParam = param; }
      }
      const start = points[bestSeg];
      const end = points[bestSeg + 1];
      const edgeX = end[0] - start[0];
      const edgeZ = end[1] - start[1];
      const segLen = Math.hypot(edgeX, edgeZ) || 1;
      const unitX = edgeX / segLen;
      const unitZ = edgeZ / segLen;
      const idx = j * nx + i;
      along[idx] = arcLen[bestSeg] + bestParam * segLen - midArc;
      across[idx] = (x - start[0]) * -unitZ + (z - start[1]) * unitX;
      tanX[idx] = unitX;
      tanZ[idx] = unitZ;
      const absAcross = Math.abs(across[idx]);
      weights[idx] = absAcross <= FLOW_CFG.bandFullM
        ? 1
        : absAcross >= FLOW_CFG.bandFadeEndM
          ? 0
          : 1 - (absAcross - FLOW_CFG.bandFullM) / (FLOW_CFG.bandFadeEndM - FLOW_CFG.bandFullM);
    }
  }

  // where neighbouring cells disagree about along-stream distance, the frame folds over: drop the river frame there
  const foldMask = new Uint8Array(cellCount);
  const foldJump = step * FLOW_CFG.foldJumpFactor;
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const idx = j * nx + i;
      if (!weights[idx]) continue;
      const rightFold = i + 1 < nx && weights[idx + 1] && Math.abs(along[idx + 1] - along[idx]) > foldJump;
      const downFold = j + 1 < nz && weights[idx + nx] && Math.abs(along[idx + nx] - along[idx]) > foldJump;
      if (rightFold || downFold) {
        foldMask[idx] = 1;
        if (i + 1 < nx) foldMask[idx + 1] = 1;
        if (j + 1 < nz) foldMask[idx + nx] = 1;
      }
    }
  }

  const cleanWeights = new Float32Array(weights);
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      let nearFold = false;
      for (let dj = -1; dj <= 1 && !nearFold; dj++) {
        for (let di = -1; di <= 1; di++) {
          const ni = i + di;
          const nj = j + dj;
          if (ni >= 0 && nj >= 0 && ni < nx && nj < nz && foldMask[nj * nx + ni]) { nearFold = true; break; }
        }
      }
      if (nearFold) cleanWeights[j * nx + i] = 0;
    }
  }

  // soften the weight so the hand-over is gradual
  const texData = new Float32Array(cellCount * 4);
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      let sum = 0;
      let count = 0;
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const ni = i + di;
          const nj = j + dj;
          if (ni >= 0 && nj >= 0 && ni < nx && nj < nz) { sum += cleanWeights[nj * nx + ni]; count++; }
        }
      }
      const idx = j * nx + i;
      const smoothW = cleanWeights[idx] ? sum / count : 0;
      texData[idx * 4] = along[idx];
      texData[idx * 4 + 1] = across[idx];
      texData[idx * 4 + 2] = tanX[idx] * smoothW;
      texData[idx * 4 + 3] = tanZ[idx] * smoothW;
    }
  }

  const tex = new THREE.DataTexture(texData, nx, nz, THREE.RGBAFormat, THREE.FloatType);
  tex.minFilter = tex.magFilter = THREE.NearestFilter; // filtered by hand in the shader (float filtering isn't everywhere)
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return { tex, box: new THREE.Vector4(bounds[0], bounds[1], 1 / step, 1 / step), size: new THREE.Vector2(nx, nz) };
}
