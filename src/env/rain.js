import * as THREE from 'three';
import { quality } from '../config.js';

// Rain streaks in a box that wraps around the camera, slanted by the same wind that flies the flag.
export function buildRain() {
  const n = quality.rainCount;
  const seed = new Float32Array(n * 2 * 3), end = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const x = Math.random(), y = Math.random(), z = Math.random();
    for (let k = 0; k < 2; k++) { seed.set([x, y, z], (i * 2 + k) * 3); end[i * 2 + k] = k; }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(seed, 3));
  geo.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
  const uniforms = { uTime: { value: 0 }, uRain: { value: 0 }, uTint: { value: new THREE.Color(0.8, 0.85, 0.92) } };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: `
      attribute float aEnd; uniform float uTime; varying float vA;
      const vec3 BOX = vec3( 150.0, 100.0, 150.0 );
      void main() {
        vec3 vel = vec3( 11.0, -64.0, -7.0 );
        float sp = 0.8 + fract( position.x * 7.13 ) * 0.4;
        vec3 p = position * BOX + vel * uTime * sp;
        p = mod( p - cameraPosition, BOX ) - BOX * 0.5 + cameraPosition;
        p -= normalize( vel ) * aEnd * ( 1.4 + fract( position.z * 13.7 ) * 2.2 );
        vec4 mv = viewMatrix * vec4( p, 1.0 );
        vA = ( 1.0 - aEnd * 0.7 ) * smoothstep( 76.0, 30.0, -mv.z ) * smoothstep( 0.6, 4.0, -mv.z );
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uRain; uniform vec3 uTint; varying float vA;
      void main() { gl_FragColor = vec4( uTint, vA * uRain * 0.5 );
        #include <colorspace_fragment>
      }`,
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  lines.renderOrder = 30;
  lines.visible = false;
  return { mesh: lines, uniforms };
}
