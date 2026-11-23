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
          float mask = smoothstep( 0.46 - uHaze * 0.14, 0.76 - uHaze * 0.1, wisp )
                     * smoothstep( 0.02, 0.18, d.y ) * smoothstep( 0.88, 0.26, d.y );
          vec3 cloudCol = mix( uHorizon * 1.08, uGlow * 1.14, pow( sd, 2.5 ) * 0.65 * ( 1.0 - uHaze * 0.7 ) );
          col = mix( col, cloudCol, mask * mix( 0.42, 0.26, uHaze ) );
        }
        // faint night stars above the horizon mist when the sky is clear
        float nightK = smoothstep( 0.45, 0.15, uSunDisk ) * ( 1.0 - uHaze * 0.85 );
        if ( nightK > 0.01 && d.y > 0.08 ) {
          vec2 sg = d.xz / ( d.y + 0.35 ) * 62.0;
          vec2 sid = floor( sg ), sf = fract( sg ) - 0.5;
          float sh = hash21( sid );
          float star = step( 0.986, sh ) * smoothstep( 0.22, 0.02, length( sf - ( vec2( hash21( sid + 4.3 ), hash21( sid + 9.1 ) ) - 0.5 ) * 0.55 ) );
          float twink = 0.7 + 0.3 * sin( uTime * ( 1.4 + sh * 3.0 ) + sh * 40.0 );
          col += vec3( 0.92, 0.94, 1.0 ) * star * twink * nightK * smoothstep( 0.08, 0.32, d.y ) * 0.55;
        }
        // distant Trường Sơn / Ngự Bình mountain ridge washes along the horizon (strongest south-west)
        if ( d.y > -0.02 && d.y < 0.095 ) {
          vec2 hor = normalize( d.xz + 1e-6 );
          float swBias = 0.55 + 0.45 * smoothstep( -0.6, 0.8, -d.x * 0.45 + d.z * 0.89 );
          float rFar = ( 0.018 + 0.036 * fbm( hor * 2.2 + vec2( 1.4, 2.7 ) ) ) * swBias;
          float rNear = ( 0.008 + 0.022 * fbm( hor * 4.0 + vec2( 6.2, 5.1 ) ) ) * swBias;
          float mFar = ( 1.0 - smoothstep( rFar - 0.006, rFar + 0.005, d.y ) ) * smoothstep( -0.018, 0.004, d.y );
          float mNear = ( 1.0 - smoothstep( rNear - 0.005, rNear + 0.004, d.y ) ) * smoothstep( -0.018, 0.003, d.y );
          vec3 ridgeFar = mix( uFog, uTop * 0.72, 0.36 );
          vec3 ridgeNear = mix( uFog * 0.82, uTop * 0.52, 0.42 );
          col = mix( col, ridgeFar, mFar * ( 0.34 - uHaze * 0.14 ) );
          col = mix( col, ridgeNear, mNear * ( 0.42 - uHaze * 0.18 ) );
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
