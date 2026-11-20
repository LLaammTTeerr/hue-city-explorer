import * as THREE from 'three';

// Image-based light from the mood's own sky: a small gradient dome (sky above, the land's bounce below, a broad
// glow round the sun but no disc, since the sun itself is a light) is prefiltered into scene.environment. Glass,
// glazed tile and wet stone then mirror the sky of the hour, and shade is filled by it rather than by a flat lamp.
// Nothing is downloaded. It is rebuilt only while the mood is changing.
export function createIBL(renderer, scene) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const uniforms = {
    uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uGround: { value: new THREE.Color() },
    uGlow: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunDisk: { value: 1 },
  };
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.ShaderMaterial({
    uniforms, side: THREE.BackSide, depthWrite: false, depthTest: false,
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
  })));
  let target = null, last = '', wait = 0;
  const q = (c) => c.getHexString();
  return {
    // cur: the mood's current colours (src/env/mood.js)
    update(cur, sunDir, dt) {
      wait -= dt;
      const key = q(cur.skyTop) + q(cur.skyHorizon) + q(cur.hemiGround) + q(cur.sunGlow) + sunDir.toArray().map((v) => v.toFixed(2)).join() + cur.sunDisk.toFixed(2);
      if (key === last || wait > 0) return;
      last = key; wait = 0.15;
      uniforms.uTop.value.copy(cur.skyTop);
      uniforms.uHorizon.value.copy(cur.skyHorizon);
      uniforms.uGround.value.copy(cur.hemiGround).multiplyScalar(0.5);
      uniforms.uGlow.value.copy(cur.sunGlow);
      uniforms.uSunDir.value.copy(sunDir);
      uniforms.uSunDisk.value = cur.sunDisk;
      const next = pmrem.fromScene(env, 0, 0.1, 100);
      scene.environment = next.texture;
      if (target) target.dispose();
      target = next;
    },
  };
}
