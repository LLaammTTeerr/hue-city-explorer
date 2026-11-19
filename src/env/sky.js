import * as THREE from 'three';

const NOISE = `
float hash21( vec2 p ) { p = fract( p * vec2( 123.34, 456.21 ) ); p += dot( p, p + 45.32 ); return fract( p.x * p.y ); }
float vnoise( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( hash21( i ), hash21( i + vec2( 1, 0 ) ), f.x ), mix( hash21( i + vec2( 0, 1 ) ), hash21( i + vec2( 1, 1 ) ), f.x ), f.y ); }
float fbm( vec2 p ) { float a = 0.5, s = 0.0; for ( int i = 0; i < 4; i++ ) { s += a * vnoise( p ); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
`;
export { NOISE };

// Gradient dome with a soft sun, high cloud streaks, and the Trường Sơn foothills
// drawn as two hazy ridgelines on the west and south-west horizon (illustrative backdrop).
export function buildSky() {
  const uniforms = {
    uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() },
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
      uniform vec3 uTop, uHorizon, uGlow, uFog, uSunDir; uniform float uSunDisk, uHaze, uTime;
      ${NOISE}
      void main() {
        vec3 d = normalize( vDir );
        float h = max( d.y, 0.0 );
        vec3 col = mix( uHorizon, uTop, pow( smoothstep( 0.0, 0.7, h ), 0.62 ) );
        float sd = max( dot( d, uSunDir ), 0.0 );
        col += uGlow * ( pow( sd, 5.0 ) * 0.32 + pow( sd, 48.0 ) * 0.55 ) * mix( 0.35, 1.0, uSunDisk );
        // clouds: stretched toward the horizon
        vec2 cp = d.xz / ( d.y + 0.22 );
        float cl = fbm( cp * vec2( 0.9, 1.7 ) + vec2( uTime * 0.004, 0.0 ) );
        float cm = smoothstep( 0.5, 0.82, cl ) * smoothstep( 0.02, 0.3, d.y );
        vec3 cloudCol = mix( uHorizon, vec3( 1.0 ), 0.35 ) + uGlow * pow( sd, 3.0 ) * 0.5;
        col = mix( col, cloudCol, cm * mix( 0.55, 0.9, uHaze ) );
        col = mix( col, mix( uHorizon, uTop, 0.35 ), uHaze * 0.55 );
        // sun disk
        col += vec3( 1.0, 0.93, 0.8 ) * smoothstep( 0.99925, 0.99965, sd ) * uSunDisk * 2.5;
        // distant ridges, strongest toward the south-west
        vec2 sw = normalize( vec2( -0.62, 0.78 ) );
        float az = atan( dot( d.xz, vec2( sw.y, -sw.x ) ), dot( d.xz, sw ) ); // seam faces north-east, away from the ridges
        float mask = smoothstep( -0.35, 0.45, dot( normalize( d.xz + 1e-5 ), sw ) );
        float r1 = ( 0.018 + 0.03 * vnoise( vec2( az * 5.0, 1.0 ) ) + 0.012 * vnoise( vec2( az * 19.0, 4.0 ) ) ) * mask;
        float r2 = ( 0.008 + 0.022 * vnoise( vec2( az * 8.0, 9.0 ) ) + 0.008 * vnoise( vec2( az * 27.0, 2.0 ) ) ) * mask;
        vec3 ridgeFar = mix( uHorizon, uTop, 0.55 ) * vec3( 0.86, 0.88, 1.0 );
        vec3 ridgeNear = mix( ridgeFar, uFog * vec3( 0.62, 0.66, 0.82 ), 0.55 );
        float fade = 1.0 - uHaze * 0.9;
        col = mix( col, ridgeFar, smoothstep( r1 + 0.002, r1 - 0.002, d.y ) * 0.75 * fade );
        col = mix( col, ridgeNear, smoothstep( r2 + 0.0015, r2 - 0.0015, d.y ) * 0.8 * fade );
        // ground haze below the horizon
        col = mix( col, uFog, smoothstep( 0.012, -0.03, d.y ) );
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
