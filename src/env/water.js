import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { NOISE } from './sky.js';
import { quality, POND_Y } from '../config.js';
import { Buf } from '../geo/buf.js';

// One sheet of river water under the slab; the land is cut out around the real banks. Lakes, ponds and the
// moat get their own, higher sheet (no mirror pass: they are small and mostly seen from above).
// Desktop gets a planar reflection (the bridge, its lights, the sky); phones get an analytic sky reflection.
export function buildWater(data) {
  const shader = {
    name: 'HueWater',
    uniforms: {
      color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null },
      uTime: { value: 0 }, uRain: { value: 0 }, uReflect: { value: quality.reflection ? 1 : 0 }, uGlow: { value: 0 },
      uDeep: { value: new THREE.Color() }, uShallow: { value: new THREE.Color() },
      uSkyTop: { value: new THREE.Color() }, uSkyHorizon: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3() }, uSunCol: { value: new THREE.Color() }, uSunDisk: { value: 1 },
      uFog: { value: new THREE.Color() }, uFogDensity: { value: 0.0001 },
    },
    vertexShader: `
      uniform mat4 textureMatrix;
      varying vec4 vUvR; varying vec3 vW;
      void main() {
        vUvR = textureMatrix * vec4( position, 1.0 );
        vW = ( modelMatrix * vec4( position, 1.0 ) ).xyz;
        gl_Position = projectionMatrix * viewMatrix * vec4( vW, 1.0 );
      }`,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float uTime, uRain, uReflect, uSunDisk, uFogDensity, uGlow;
      uniform vec3 uDeep, uShallow, uSkyTop, uSkyHorizon, uSunDir, uSunCol, uFog;
      varying vec4 vUvR; varying vec3 vW;
      ${NOISE}
      float height( vec2 p ) {
        float t = uTime;
        return vnoise( p * 0.035 + vec2( t * 0.05, t * 0.028 ) ) * 1.1
             + vnoise( p * 0.11 - vec2( t * 0.085, -t * 0.06 ) ) * 0.5
             + vnoise( p * 0.37 + vec2( -t * 0.21, t * 0.17 ) ) * 0.2;
      }
      // expanding rings where raindrops land
      float rings( vec2 p, float scale, float seed ) {
        vec2 g = p / scale + seed;
        vec2 id = floor( g ), f = fract( g ) - 0.5;
        float h = hash21( id + seed );
        float ph = fract( uTime * ( 0.7 + 0.6 * h ) + h * 9.0 );
        vec2 o = ( vec2( hash21( id + 3.1 ), hash21( id + 7.7 ) ) - 0.5 ) * 0.5;
        float dd = length( f - o );
        return smoothstep( 0.028, 0.0, abs( dd - ph * 0.4 ) ) * ( 1.0 - ph ) * ( 1.0 - ph ) * step( 0.3, h );
      }
      void main() {
        vec3 toCam = cameraPosition - vW;
        float dist = length( toCam );
        vec3 V = toCam / dist;
        float lod = clamp( 1.0 - dist / 3200.0, 0.12, 1.0 );
        vec2 p = vW.xz;
        float e = 0.9;
        float h0 = height( p );
        vec2 g = vec2( height( p + vec2( e, 0.0 ) ) - h0, height( p + vec2( 0.0, e ) ) - h0 ) / e;
        float amp = mix( 1.1, 2.0, uRain ) * lod;
        float rip = 0.0;
        if ( uRain > 0.01 ) {
          float near = smoothstep( 420.0, 40.0, dist );
          rip = ( rings( p, 1.6, 0.0 ) + rings( p, 2.7, 13.7 ) + rings( p + 40.0, 4.4, 31.1 ) ) * near * uRain;
        }
        vec3 n = normalize( vec3( -g.x * amp, 1.0, -g.y * amp ) );
        float ndv = max( dot( n, V ), 0.0 );
        float fres = clamp( 0.07 + 0.93 * pow( 1.0 - ndv, 3.2 ), 0.0, 1.0 );

        vec3 R = reflect( -V, n );
        vec3 sky = mix( uSkyHorizon, uSkyTop, pow( clamp( R.y * 1.6, 0.0, 1.0 ), 0.5 ) );
        vec3 refl = sky;
        if ( uReflect > 0.5 ) {
          vec4 uv = vUvR;
          uv.xy += n.xz * ( 0.085 + uRain * 0.06 ) * uv.w * ( 0.35 + 0.65 * lod );
          refl = texture2DProj( tDiffuse, uv ).rgb;
        }
        float tone = vnoise( p * 0.004 + 3.0 );
        vec3 body = mix( uDeep, uShallow, clamp( ndv * ndv * 0.55 + tone * 0.35, 0.0, 1.0 ) );
        vec3 col = mix( body, refl, fres * mix( 0.82, 0.7, uRain ) );

        // sun path
        float sd = max( dot( R, uSunDir ), 0.0 );
        col += uSunCol * ( pow( sd, 220.0 ) * 3.0 + pow( sd, 30.0 ) * 0.13 ) * uSunDisk;

        // rain: pale rings close by, a flatter, milkier surface further off
        col += mix( uFog, vec3( 1.0 ), 0.4 ) * rip * 0.45;
        col = mix( col, uFog, uRain * 0.16 );

        float f = 1.0 - exp( -pow( uFogDensity * dist, 2.0 ) );
        col = mix( col, uFog, f );
        gl_FragColor = vec4( col, 1.0 );
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  };

  const b = data.meta.bounds.map((v) => v / 10);
  const geo = new THREE.PlaneGeometry(b[2] - b[0], b[3] - b[1]);
  let mesh;
  if (quality.reflection) {
    const scale = 0.45;
    mesh = new Reflector(geo, {
      shader,
      textureWidth: Math.round(innerWidth * quality.pixelRatio * scale),
      textureHeight: Math.round(innerHeight * quality.pixelRatio * scale),
      clipBias: 0.02,
      multisample: 0,
    });
    mesh.userData.resize = (w, h) => mesh.getRenderTarget().setSize(Math.round(w * quality.pixelRatio * scale), Math.round(h * quality.pixelRatio * scale));
    // the mirror image is refreshed on alternate frames: it is soft and distorted anyway, and this halves its cost
    const renderMirror = mesh.onBeforeRender;
    let tick = 0;
    mesh.onBeforeRender = function (...args) { if (tick++ % 2 === 0) renderMirror.apply(this, args); };
  } else {
    const u = THREE.UniformsUtils.clone(shader.uniforms);
    u.textureMatrix.value = new THREE.Matrix4();
    mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ ...shader, uniforms: u }));
    mesh.userData.resize = () => {};
  }
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set((b[0] + b[2]) / 2, 0, (b[1] + b[3]) / 2);
  mesh.name = 'water';
  mesh.frustumCulled = false;

  // still water
  const P = new Buf(4096);
  for (const poly of data.ponds || []) {
    const rings = poly.map((r) => { const o = []; for (let i = 0; i < r.length; i += 2) o.push(new THREE.Vector2(r[i] / 10, r[i + 1] / 10)); return o; });
    let faces;
    try { faces = THREE.ShapeUtils.triangulateShape(rings[0], rings.slice(1)); } catch { continue; }
    const pts = rings[0].concat(...rings.slice(1));
    for (const f of faces) P.tri([pts[f[0]].x, POND_Y, pts[f[0]].y], [pts[f[1]].x, POND_Y, pts[f[1]].y], [pts[f[2]].x, POND_Y, pts[f[2]].y], [1, 1, 1], [0, 1, 0]);
  }
  const pu = THREE.UniformsUtils.clone(shader.uniforms);
  pu.textureMatrix.value = new THREE.Matrix4();
  pu.uReflect.value = 0;
  const ponds = new THREE.Mesh(P.geometry(), new THREE.ShaderMaterial({ ...shader, uniforms: pu }));
  ponds.name = 'ponds';
  ponds.frustumCulled = false;
  return { mesh, ponds, uniforms: mesh.material.uniforms, sets: [mesh.material.uniforms, pu] };
}
