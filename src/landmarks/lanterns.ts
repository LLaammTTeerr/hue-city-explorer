import * as THREE from 'three';
import { shared } from '../geo/materials.ts';
import { quality } from '../config.ts';

const DECIMETRES_PER_METRE = 10;
const TRACK_STEP_M = 2;
const COARSE_WIDTH_STEP_M = 20;
const MAX_WATER_REACH_M = 400;
const MIN_STRETCH_LEN_M = 100;
const EDGE_FADE_DIST_M = 25;
const GLOW_VISIBLE_THRESHOLD = 0.01;
const MAX_DT_S = 0.25;
const LANTERN_SEED = 0x5eed1a7;

const LANTERN_VERT_COMMON = /* glsl */ `
  attribute vec4 aOff; // x, z, yaw, scale
  attribute vec3 aCol;
  attribute float aPhase;
  uniform float uTime;
  varying vec3 vCol;
  vec3 lanternPos( vec3 p ) {
    float c = cos( aOff.z ), s = sin( aOff.z );
    p = vec3( c * p.x - s * p.z, p.y, s * p.x + c * p.z ) * aOff.w;
    return p + vec3( aOff.x, 0.03 + 0.025 * sin( uTime * 1.3 + aPhase * 1.7 ), aOff.y );
  }
  float flicker() { return 0.85 + 0.15 * sin( uTime * 2.2 + aPhase ); }
`;
const LANTERN_FRAG_END = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

function buildLotusGeometry() {
  const pos: number[] = [];
  const lum: number[] = [];
  const pushVert = (x: number, y: number, z: number, brightness: number) => { pos.push(x, y, z); lum.push(brightness); };
  const petalCount = 6, innerR = 0.16, outerR = 0.46;
  for (let i = 0; i < petalCount; i++) {
    const a0 = (i / petalCount) * Math.PI * 2;
    const a1 = ((i + 1) / petalCount) * Math.PI * 2;
    const mid = (a0 + a1) / 2;
    pushVert(Math.cos(a0) * innerR, 0.04, Math.sin(a0) * innerR, 0.45);
    pushVert(Math.cos(mid) * outerR, 0.26, Math.sin(mid) * outerR, 1.0);
    pushVert(Math.cos(a1) * innerR, 0.04, Math.sin(a1) * innerR, 0.45);
  }
  for (const [cx, cz] of [[1, 0], [0, 1]]) {
    const halfW = 0.07;
    pushVert(-cx * halfW, 0.2, -cz * halfW, 1.6); pushVert(cx * halfW, 0.2, cz * halfW, 1.6); pushVert(0, 0.48, 0, 0.9);
    pushVert(cx * halfW, 0.2, cz * halfW, 1.6); pushVert(-cx * halfW, 0.2, -cz * halfW, 1.6); pushVert(0, 0.1, 0, 1.2);
  }
  return { pos: new Float32Array(pos), lum: new Float32Array(lum) };
}

function buildChannelWidthTable(track: any, startS: number, endS: number, isLand: (x: number, z: number) => boolean) {
  const isPointOnLand = (pt: any, offset: number) => isLand(pt.x - pt.tz * offset, pt.z + pt.tx * offset);
  const measureReach = (pt: any, side: number) => {
    let dist = 0;
    while (dist < MAX_WATER_REACH_M && !isPointOnLand(pt, side * (dist + 8))) dist += 8;
    while (dist < MAX_WATER_REACH_M && !isPointOnLand(pt, side * (dist + 1))) dist += 1;
    return dist;
  };
  const coarse: ([number, number] | null)[] = [];
  for (let dist = startS; dist <= endS + COARSE_WIDTH_STEP_M; dist += COARSE_WIDTH_STEP_M) {
    const pt = track.at(dist);
    coarse.push(isPointOnLand(pt, 0) ? null : [-measureReach(pt, -1), measureReach(pt, 1)]);
  }
  const len = endS - startS;
  const sampleCount = Math.floor(len / TRACK_STEP_M) + 2;
  const table = new Float32Array(sampleCount * 6); // x, z, tx, tz, mid, half
  for (let i = 0; i < sampleCount; i++) {
    const dist = startS + i * TRACK_STEP_M;
    const pt = track.at(dist);
    const fracIdx = (dist - startS) / COARSE_WIDTH_STEP_M;
    const idx = Math.min(coarse.length - 2, Math.floor(fracIdx));
    const blend = Math.min(1, fracIdx - idx);
    const spanA = coarse[idx];
    const spanB = coarse[Math.min(coarse.length - 1, idx + 1)];
    let mid = 0, half = 0;
    if (spanA && spanB) {
      const lo = spanA[0] + (spanB[0] - spanA[0]) * blend;
      const hi = spanA[1] + (spanB[1] - spanA[1]) * blend;
      const margin = Math.max(18, (hi - lo) * 0.14);
      if (hi - lo > margin * 2 + 4) { mid = (lo + hi) / 2; half = (hi - lo) / 2 - margin; }
    }
    table.set([pt.x, pt.z, pt.tx, pt.tz, mid, half], i * 6);
  }
  return { table, sampleCount };
}

function createLanternMaterials(uTime: { value: number }) {
  const bodyMat = new THREE.ShaderMaterial({
    uniforms: { uGlow: shared.uGlow, uTime, uBoost: { value: 1.25 } },
    vertexShader: LANTERN_VERT_COMMON + `
      attribute float aLum;
      void main() {
        vCol = aCol * aLum * flicker();
        gl_Position = projectionMatrix * modelViewMatrix * vec4( lanternPos( position ), 1.0 );
      }`,
    fragmentShader: `
      varying vec3 vCol; uniform float uGlow, uBoost;
      void main() {
        float g = clamp( uGlow * 0.92, 0.0, 0.92 );
        vec3 lit = vCol * min( uBoost, 1.2 ) * 0.78;
        lit = lit / ( 1.0 + max( lit.r, max( lit.g, lit.b ) ) * 0.35 );
        gl_FragColor = vec4( lit * g, g );` + LANTERN_FRAG_END + '}',
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
    depthWrite: false,
    transparent: true,
    side: THREE.DoubleSide,
  });

  const haloMat = new THREE.ShaderMaterial({
    uniforms: { uGlow: shared.uGlow, uTime, uSize: { value: 2.6 }, uScale: { value: 0 }, uBoost: { value: 0.75 } },
    vertexShader: LANTERN_VERT_COMMON + `
      uniform float uSize, uScale; varying float vFade;
      void main() {
        vCol = aCol * flicker();
        vec4 mv = modelViewMatrix * vec4( lanternPos( position ), 1.0 );
        gl_Position = projectionMatrix * mv;
        float sc = uScale > 0.0 ? uScale : projectionMatrix[1][1] * 450.0;
        float px = uSize * aOff.w * sc / max( 1.0, -mv.z );
        vFade = clamp( px / 2.4, 0.12, 0.85 ) * step( 0.01, aOff.w );
        gl_PointSize = clamp( px, 1.8, 24.0 );
      }`,
    fragmentShader: `
      varying vec3 vCol; varying float vFade; uniform float uGlow, uBoost;
      void main() {
        float d = length( gl_PointCoord - 0.5 ) * 2.0;
        if ( d >= 1.0 ) discard;
        float a = pow( max( 0.0, 1.0 - d ), 3.0 );
        float w = clamp( a * clamp( uGlow, 0.0, 1.0 ) * uBoost * vFade, 0.0, 0.82 );
        gl_FragColor = vec4( vCol * w, w * 0.88 );` + LANTERN_FRAG_END + '}',
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
    depthWrite: false,
    transparent: true,
  });

  return { bodyMat, haloMat };
}

// Hoa đăng — paper lotus lanterns with a candle inside, set on the Hương in front of the Citadel.
export function makeLanterns(data: any, group: THREE.Group, track: any, isLand: (x: number, z: number) => boolean) {
  if (!track) return null;
  const nearestAlong = (x: number, z: number) => {
    let bestS = 0, bestDistSq = Infinity;
    for (let dist = 0; dist <= track.total; dist += TRACK_STEP_M) {
      const pt = track.at(dist);
      const distSq = (pt.x - x) ** 2 + (pt.z - z) ** 2;
      if (distSq < bestDistSq) { bestDistSq = distSq; bestS = dist; }
    }
    return bestS;
  };
  const placePos = (id: string) => {
    const rec = (data.places || []).find((entry: any) => entry && entry.id === id);
    return rec && Number.isFinite(rec.x) && Number.isFinite(rec.z) ? [rec.x / DECIMETRES_PER_METRE, rec.z / DECIMETRES_PER_METRE] : null;
  };

  const nghenhLuong = placePos('nghenhluong');
  const truongTien = data.truongtien?.box?.c
    ? [data.truongtien.box.c[0] / DECIMETRES_PER_METRE, data.truongtien.box.c[1] / DECIMETRES_PER_METRE]
    : placePos('truongtien') || placePos('ndchieu');
  if (!nghenhLuong || !truongTien) return null;

  const startS = Math.max(0, nearestAlong(nghenhLuong[0], nghenhLuong[1]) - 30);
  const endS = Math.min(track.total, nearestAlong(truongTien[0], truongTien[1]) - 14);
  const stretchLen = endS - startS;
  if (!(stretchLen > MIN_STRETCH_LEN_M)) return null;

  const { table, sampleCount } = buildChannelWidthTable(track, startS, endS, isLand);

  let seed = LANTERN_SEED;
  const rnd = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let hash = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    hash = (hash + Math.imul(hash ^ (hash >>> 7), 61 | hash)) ^ hash;
    return ((hash ^ (hash >>> 14)) >>> 0) / 4294967296;
  };
  const gauss = () => (rnd() + rnd() + rnd() - 1.5) * 1.15;

  const count = quality.low ? 60 : 160;
  const alongArr = new Float32Array(count);
  const speedArr = new Float32Array(count);
  const lateralFrac = new Float32Array(count);
  const wanderAmp = new Float32Array(count);
  const spinRate = new Float32Array(count);
  const phaseArr = new Float32Array(count);
  const scaleArr = new Float32Array(count);
  const offsets = new Float32Array(count * 4);
  const colors = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const palette = [new THREE.Color('#ffb84d'), new THREE.Color('#ff9668'), new THREE.Color('#f28ab2')];

  let idx = 0;
  while (idx < count) {
    const clusterSize = Math.min(count - idx, 3 + Math.floor(rnd() * 14));
    const clusterS = rnd() * stretchLen;
    const clusterLat = -0.35 + 1.1 * Math.pow(rnd(), 0.75);
    const clusterSpeed = 0.25 + rnd() * 0.15;
    const spread = 0.03 + rnd() * 0.05;
    for (let k = 0; k < clusterSize; k++, idx++) {
      alongArr[idx] = (((clusterS - Math.log(1 - rnd() * 0.97) * 14 + gauss() * 5) % stretchLen) + stretchLen) % stretchLen;
      speedArr[idx] = Math.max(0.24, Math.min(0.41, clusterSpeed + gauss() * 0.012));
      lateralFrac[idx] = Math.max(-0.5, Math.min(0.85, clusterLat + gauss() * spread));
      wanderAmp[idx] = 0.015 + rnd() * 0.03;
      spinRate[idx] = (0.03 + rnd() * 0.05) * (rnd() < 0.5 ? -1 : 1);
      phaseArr[idx] = rnd() * Math.PI * 2;
      scaleArr[idx] = 0.85 + rnd() * 0.35;
      const roll = rnd();
      const col = palette[roll < 0.68 ? 0 : roll < 0.92 ? 1 : 2];
      colors.set([col.r, col.g, col.b], idx * 3);
      phases[idx] = phaseArr[idx];
    }
  }

  const attrOff = new THREE.InstancedBufferAttribute(offsets, 4).setUsage(THREE.DynamicDrawUsage);
  const attrCol = new THREE.InstancedBufferAttribute(colors, 3);
  const attrPhase = new THREE.InstancedBufferAttribute(phases, 1);
  const uTime = { value: 0 };
  const shape = buildLotusGeometry();

  const bodyGeo = new THREE.InstancedBufferGeometry();
  bodyGeo.setAttribute('position', new THREE.BufferAttribute(shape.pos, 3));
  bodyGeo.setAttribute('aLum', new THREE.BufferAttribute(shape.lum, 1));
  bodyGeo.setAttribute('aOff', attrOff);
  bodyGeo.setAttribute('aCol', attrCol);
  bodyGeo.setAttribute('aPhase', attrPhase);
  bodyGeo.instanceCount = count;

  const haloGeo = new THREE.InstancedBufferGeometry();
  haloGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0.22, 0]), 3));
  haloGeo.setAttribute('aOff', attrOff);
  haloGeo.setAttribute('aCol', attrCol);
  haloGeo.setAttribute('aPhase', attrPhase);
  haloGeo.instanceCount = count;

  const { bodyMat, haloMat } = createLanternMaterials(uTime);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.frustumCulled = false;
  body.renderOrder = 19;
  body.raycast = () => {};

  const halo = new THREE.Points(haloGeo, haloMat);
  halo.frustumCulled = false;
  halo.renderOrder = 20;
  halo.raycast = () => {};

  const root = new THREE.Group();
  root.name = 'hoa-dang';
  root.add(body, halo);
  group.add(root);

  const updateLantern = (i: number, time: number) => {
    const pos = alongArr[i] / TRACK_STEP_M;
    const row = Math.min(sampleCount - 2, Math.floor(pos));
    const frac = pos - row;
    const baseA = row * 6, baseB = baseA + 6;
    const x = table[baseA] + (table[baseB] - table[baseA]) * frac;
    const z = table[baseA + 1] + (table[baseB + 1] - table[baseA + 1]) * frac;
    const tx = table[baseA + 2] + (table[baseB + 2] - table[baseA + 2]) * frac;
    const tz = table[baseA + 3] + (table[baseB + 3] - table[baseA + 3]) * frac;
    const mid = table[baseA + 4] + (table[baseB + 4] - table[baseA + 4]) * frac;
    const half = table[baseA + 5] + (table[baseB + 5] - table[baseA + 5]) * frac;
    const wander = lateralFrac[i] + wanderAmp[i] * Math.sin(time * 0.09 + phaseArr[i] * 3.1) + wanderAmp[i] * 0.5 * Math.sin(time * 0.23 + phaseArr[i]);
    const lat = mid + wander * half;
    const edgeFade = Math.min(1, alongArr[i] / EDGE_FADE_DIST_M, (stretchLen - alongArr[i]) / EDGE_FADE_DIST_M);
    const outIdx = i * 4;
    offsets[outIdx] = x - tz * lat;
    offsets[outIdx + 1] = z + tx * lat;
    offsets[outIdx + 2] = phaseArr[i] + time * spinRate[i];
    offsets[outIdx + 3] = table[baseA + 5] > 0 && table[baseB + 5] > 0 ? scaleArr[i] * Math.max(0, edgeFade) : 0;
  };

  for (let i = 0; i < count; i++) updateLantern(i, 0);
  attrOff.needsUpdate = true;

  return {
    group: root,
    halo,
    update(dt: number, time: number) {
      if (!(shared.uGlow.value >= GLOW_VISIBLE_THRESHOLD)) { root.visible = false; return; }
      root.visible = true;
      const stepDt = Math.min(Number.isFinite(dt) ? Math.max(0, dt) : 0, MAX_DT_S);
      const curTime = Number.isFinite(time) ? time : 0;
      uTime.value = curTime;
      for (let i = 0; i < count; i++) {
        alongArr[i] += speedArr[i] * stepDt;
        if (alongArr[i] >= stretchLen) alongArr[i] -= stretchLen;
        updateLantern(i, curTime);
      }
      attrOff.needsUpdate = true;
    },
  };
}
