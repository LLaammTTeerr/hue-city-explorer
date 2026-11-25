import * as THREE from 'three';

const IBL_CFG = {
  domeRadius: 20,
  domeWidthSegs: 32,
  domeHeightSegs: 16,
  keyLength: 16,
  rebuildCooldownS: 0.15,
  groundBounceScale: 0.5,
  pmremNear: 0.1,
  pmremFar: 100,
} as const;

// Image-based light from the mood's own sky: a small gradient dome (sky above, the land's bounce below, a broad
// glow round the sun but no disc, since the sun itself is a light) is prefiltered into scene.environment. Glass,
// glazed tile and wet stone then mirror the sky of the hour, and shade is filled by it rather than by a flat lamp.
// Nothing is downloaded. It is rebuilt only while the mood is changing.
export function createIBL(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const uniforms = {
    uTop: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uGround: { value: new THREE.Color() },
    uGlow: { value: new THREE.Color() },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunDisk: { value: 1 },
  };
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(
    new THREE.SphereGeometry(IBL_CFG.domeRadius, IBL_CFG.domeWidthSegs, IBL_CFG.domeHeightSegs),
    new THREE.ShaderMaterial({
      uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      vertexShader: 'varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
      fragmentShader: /* glsl */ `
        varying vec3 vDir; uniform vec3 uTop, uHorizon, uGround, uGlow, uSunDir; uniform float uSunDisk;
        void main() {
          vec3 d = normalize( vDir );
          vec3 col = mix( uHorizon, uTop, pow( smoothstep( 0.0, 0.85, d.y ), 0.68 ) );
          col = mix( col, uGround, smoothstep( 0.04, -0.12, d.y ) );
          float sd = max( dot( d, uSunDir ), 0.0 );
          col += uGlow * ( pow( sd, 5.0 ) * 0.35 + pow( sd, 40.0 ) * 0.5 ) * uSunDisk * smoothstep( -0.08, 0.05, d.y );
          gl_FragColor = vec4( col, 1.0 );
        }`,
    }),
  ));

  let currentTarget: THREE.WebGLRenderTarget | null = null;
  let cooldownS = 0;
  // the inputs, rounded about as finely as a hex colour, are compared in place each frame (no per-frame strings)
  const nextKey = new Float64Array(IBL_CFG.keyLength);
  const lastKey = new Float64Array(IBL_CFG.keyLength).fill(NaN);
  const writeColorKey = (color: THREE.Color, offset: number) => {
    nextKey[offset] = Math.round(color.r * 255);
    nextKey[offset + 1] = Math.round(color.g * 255);
    nextKey[offset + 2] = Math.round(color.b * 255);
  };

  return {
    // after a lost GPU context the probe's texture is gone: rebuild it on the next update
    invalidate() { lastKey.fill(NaN); cooldownS = 0; },
    // cur: the mood's current colours (src/env/mood.js)
    update(cur: any, sunDir: THREE.Vector3, dt: number) {
      cooldownS -= dt;
      writeColorKey(cur.skyTop, 0);
      writeColorKey(cur.skyHorizon, 3);
      writeColorKey(cur.hemiGround, 6);
      writeColorKey(cur.sunGlow, 9);
      nextKey[12] = Math.round(sunDir.x * 100);
      nextKey[13] = Math.round(sunDir.y * 100);
      nextKey[14] = Math.round(sunDir.z * 100);
      nextKey[15] = Math.round(cur.sunDisk * 100);

      let unchanged = true;
      for (let i = 0; i < IBL_CFG.keyLength; i++) {
        if (nextKey[i] !== lastKey[i]) { unchanged = false; break; }
      }
      if (unchanged || cooldownS > 0) return;

      lastKey.set(nextKey);
      cooldownS = IBL_CFG.rebuildCooldownS;
      uniforms.uTop.value.copy(cur.skyTop);
      uniforms.uHorizon.value.copy(cur.skyHorizon);
      uniforms.uGround.value.copy(cur.hemiGround).multiplyScalar(IBL_CFG.groundBounceScale);
      uniforms.uGlow.value.copy(cur.sunGlow);
      uniforms.uSunDir.value.copy(sunDir);
      uniforms.uSunDisk.value = cur.sunDisk;
      const nextTarget = pmrem.fromScene(envScene, 0, IBL_CFG.pmremNear, IBL_CFG.pmremFar);
      scene.environment = nextTarget.texture;
      if (currentTarget) currentTarget.dispose();
      currentTarget = nextTarget;
    },
  };
}
