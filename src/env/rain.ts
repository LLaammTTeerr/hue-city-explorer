import * as THREE from 'three';
import { quality } from '../config.ts';

const RAIN_RENDER_ORDER = 30;
const RAIN_DEFAULT_TINT = [0.8, 0.85, 0.92] as const;

// Rain streaks in a box that wraps around the camera, slanted by the same wind that flies the flag.
export function buildRain() {
  const dropCount = quality.rainCount;
  const seeds = new Float32Array(dropCount * 2 * 3);
  const endpoints = new Float32Array(dropCount * 2);
  for (let i = 0; i < dropCount; i++) {
    const x = Math.random();
    const y = Math.random();
    const z = Math.random();
    for (let k = 0; k < 2; k++) {
      seeds.set([x, y, z], (i * 2 + k) * 3);
      endpoints[i * 2 + k] = k;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(seeds, 3));
  geo.setAttribute('aEnd', new THREE.BufferAttribute(endpoints, 1));
  const uniforms = {
    uTime: { value: 0 },
    uRain: { value: 0 },
    uTint: { value: new THREE.Color(...RAIN_DEFAULT_TINT) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.SrcAlphaFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
    vertexShader: `
      attribute float aEnd; uniform float uTime; varying float vA;
      const vec3 BOX = vec3( 150.0, 100.0, 150.0 );
      void main() {
        vec3 vel = vec3( 17.0, -54.0, -9.2 );
        float sp = 0.8 + fract( position.x * 7.13 ) * 0.4;
        vec3 p = position * BOX + vel * uTime * sp;
        p = mod( p - cameraPosition, BOX ) - BOX * 0.5 + cameraPosition;
        p -= normalize( vel ) * aEnd * ( 1.4 + fract( position.z * 13.7 ) * 2.2 );
        vec4 mv = viewMatrix * vec4( p, 1.0 );
        vA = ( 1.0 - aEnd * 0.75 ) * smoothstep( 76.0, 30.0, -mv.z ) * smoothstep( 0.6, 4.0, -mv.z );
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uRain; uniform vec3 uTint; varying float vA;
      void main() { gl_FragColor = vec4( uTint, vA * uRain * 0.32 );
        #include <colorspace_fragment>
      }`,
  });

  const lines = new THREE.LineSegments(geo, mat);
  lines.layers.set(1);
  lines.frustumCulled = false;
  lines.renderOrder = RAIN_RENDER_ORDER;
  lines.visible = false;
  return { mesh: lines, uniforms };
}
