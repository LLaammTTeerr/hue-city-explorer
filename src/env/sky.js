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
      ${NOISE}
      void main() {
        vec3 d = normalize( vDir );
        vec3 col = mix( uHorizon, uTop, pow( smoothstep( 0.0, 0.85, d.y ), 0.68 ) );
        col = mix( col, uBelow, smoothstep( 0.0, -0.55, d.y ) );
        float sd = max( dot( d, uSunDir ), 0.0 );
        // delicate high clouds that drift slowly above the hills and catch the warm horizon glow
        if ( d.y > 0.015 ) {
          vec2 cuv = d.xz / ( d.y + 0.22 ) * 0.85 + vec2( uTime * 0.0045, uTime * 0.0018 );
          float wisp = fbm( cuv + vec2( fbm( cuv * 1.4 ) * 0.35 ) );
          float mask = smoothstep( 0.48 - uHaze * 0.14, 0.78 - uHaze * 0.1, wisp )
                     * smoothstep( 0.02, 0.2, d.y ) * smoothstep( 0.88, 0.28, d.y );
          vec3 cloudCol = mix( uHorizon * 1.06, uGlow * 1.12, pow( sd, 2.5 ) * 0.65 * ( 1.0 - uHaze * 0.7 ) );
          col = mix( col, cloudCol, mask * mix( 0.34, 0.22, uHaze ) );
        }
        // soft misty horizon veil blending the distant ridges into the sky
        float band = exp( -abs( d.y ) * 11.0 );
        col = mix( col, mix( uFog, uGlow, pow( sd, 3.0 ) * 0.3 * uSunDisk ), band * ( 0.24 + uHaze * 0.22 ) );
        col += uGlow * ( pow( sd, 6.0 ) * 0.16 + pow( sd, 64.0 ) * 0.4 ) * uSunDisk;
        col += vec3( 1.0, 0.93, 0.8 ) * smoothstep( 0.9988, 0.99965, sd ) * uSunDisk * 1.6; // soft-edged disc, so focus blur and bloom do not ring it
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
