import * as THREE from 'three';

const NOISE = `
float hash21( vec2 p ) { p = fract( p * vec2( 123.34, 456.21 ) ); p += dot( p, p + 45.32 ); return fract( p.x * p.y ); }
float vnoise( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( hash21( i ), hash21( i + vec2( 1, 0 ) ), f.x ), mix( hash21( i + vec2( 0, 1 ) ), hash21( i + vec2( 1, 1 ) ), f.x ), f.y ); }
float fbm( vec2 p ) { float a = 0.5, s = 0.0; for ( int i = 0; i < 4; i++ ) { s += a * vnoise( p ); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
`;
export { NOISE };

// A calm studio backdrop for the diorama: one smooth gradient that carries on below the horizon
// (so the slab floats in it), with a soft sun for the water to catch.
export function buildSky() {
  const uniforms = {
    uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uBelow: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() },
    uFog: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3() }, uSunDisk: { value: 1 }, uHaze: { value: 0 }, uTime: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
    vertexShader: `varying vec3 vDir; void main() { vDir = position; vec4 p = projectionMatrix * viewMatrix * vec4( position + cameraPosition, 1.0 ); gl_Position = p.xyww; }`,
    fragmentShader: `
      varying vec3 vDir;
      uniform vec3 uTop, uHorizon, uBelow, uGlow, uFog, uSunDir; uniform float uSunDisk, uHaze, uTime;
      void main() {
        vec3 d = normalize( vDir );
        vec3 col = mix( uHorizon, uTop, pow( smoothstep( 0.0, 0.85, d.y ), 0.7 ) );
        col = mix( col, uBelow, smoothstep( 0.0, -0.55, d.y ) );
        float sd = max( dot( d, uSunDir ), 0.0 );
        col += uGlow * ( pow( sd, 6.0 ) * 0.16 + pow( sd, 64.0 ) * 0.4 ) * uSunDisk;
        col += vec3( 1.0, 0.95, 0.85 ) * smoothstep( 0.99925, 0.99965, sd ) * uSunDisk * 2.2;
        gl_FragColor = vec4( col, 1.0 );
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  return { mesh, uniforms };
}
