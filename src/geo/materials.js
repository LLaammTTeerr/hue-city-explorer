import * as THREE from 'three';
import { LAND_Y } from '../config.js';

// Uniforms shared by every patched material; the mood system writes to these.
export const shared = {
  uGlow: { value: 0 },
  uTime: { value: 0 },
  uLandY: { value: LAND_Y },
};

// Lambert material for baked vertex-colour geometry (colours are stored sqrt-encoded
// in 8 bits, see Buf.tri). Adds contact shading on walls and, optionally, lit windows.
export function cityMaterial({ windows = false, ...opts } = {}) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, ...opts });
  m.defines = { ...(m.defines || {}) };
  if (windows) m.defines.HUE_WINDOWS = '';
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uGlow = shared.uGlow;
    sh.uniforms.uLandY = shared.uLandY;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNrm;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        {
          vec4 wp = vec4( transformed, 1.0 );
          vec3 wn = objectNormal;
          #ifdef USE_INSTANCING
            wp = instanceMatrix * wp;
            wn = mat3( instanceMatrix ) * wn;
          #endif
          vWPos = ( modelMatrix * wp ).xyz;
          vWNrm = normalize( mat3( modelMatrix ) * wn );
        }`,
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vWPos;
        varying vec3 vWNrm;
        uniform float uGlow;
        uniform float uLandY;
        float hueHash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }`,
      )
      .replace(
        '#include <color_fragment>',
        `#if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
          diffuseColor.rgb *= vColor.rgb * vColor.rgb;
        #endif
        float hueWall = 1.0 - smoothstep( 0.25, 0.6, abs( vWNrm.y ) );
        float hueH = vWPos.y - uLandY;
        diffuseColor.rgb *= mix( 1.0, mix( 0.7, 1.0, smoothstep( 0.0, 7.0, hueH ) ), hueWall );
        #ifdef HUE_WINDOWS
          // one window bay per 2.7 m of wall and 3.4 m of height; fades to an even tone when bays shrink below a few pixels
          vec2 hueT = normalize( vec2( -vWNrm.z, vWNrm.x ) + 1e-5 );
          vec2 hueUV = vec2( dot( vWPos.xz, hueT ) / 2.7, hueH / 3.4 );
          vec2 hueCell = floor( hueUV );
          vec2 hueF = fract( hueUV );
          float hueShape = smoothstep( 0.2, 0.27, hueF.x ) * smoothstep( 0.8, 0.73, hueF.x ) * smoothstep( 0.3, 0.37, hueF.y ) * smoothstep( 0.8, 0.72, hueF.y );
          float hueDetail = ( 1.0 - smoothstep( 0.25, 0.8, fwidth( hueUV.x ) + fwidth( hueUV.y ) ) ) * step( 0.5, hueWall ) * step( 0.3, hueH );
          float hueSeed = hueHash( hueCell + floor( vWNrm.xz * 6.0 ) * 3.7 );
          diffuseColor.rgb *= 1.0 - hueShape * hueDetail * ( 0.3 + 0.18 * hueSeed );
        #endif`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        #ifdef HUE_WINDOWS
        if ( uGlow > 0.01 && hueWall > 0.5 && hueH > 0.3 ) {
          float lit = step( hueSeed, 0.46 );
          float amount = mix( 0.46 * 0.25, lit * hueShape, hueDetail );
          vec3 warm = mix( vec3( 1.0, 0.66, 0.32 ), vec3( 1.0, 0.86, 0.62 ), hueHash( hueCell + 9.1 ) );
          totalEmissiveRadiance += warm * amount * uGlow * 1.7;
        }
        #endif`,
      );
  };
  // one program per variant
  m.customProgramCacheKey = () => 'hue-city-' + (windows ? 'w' : 'p');
  return m;
}

// sqrt-encode a linear [r,g,b] for instanceColor (the shader squares it back)
export const enc = (c, target = new THREE.Color()) => target.setRGB(Math.sqrt(c[0]), Math.sqrt(c[1]), Math.sqrt(c[2]), THREE.LinearSRGBColorSpace);

// Soft additive light points (street lamps, bridge lamps). Never smaller than ~1.5 px,
// so lines of lamps stay readable from far above.
export function glowPoints(positions, colors, size = 9) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uGlow: shared.uGlow, uSize: { value: size }, uScale: { value: 1 }, uBoost: { value: 1 }, uTint: { value: new THREE.Color(1, 1, 1) } },
    vertexShader: `
      attribute vec3 color; varying vec3 vCol; varying float vFade;
      uniform float uSize, uScale;
      void main() {
        vCol = color;
        vec4 mv = modelViewMatrix * vec4( position, 1.0 );
        gl_Position = projectionMatrix * mv;
        float px = uSize * uScale / max( 1.0, -mv.z );
        vFade = clamp( px / 2.4, 0.16, 1.0 );
        gl_PointSize = clamp( px, 2.4, 110.0 );
      }`,
    fragmentShader: `
      varying vec3 vCol; varying float vFade; uniform float uGlow, uBoost; uniform vec3 uTint;
      void main() {
        float d = length( gl_PointCoord - 0.5 ) * 2.0;
        float a = pow( max( 0.0, 1.0 - d ), 2.6 ) + smoothstep( 0.35, 0.0, d ) * 0.6;
        gl_FragColor = vec4( vCol * uTint * a * uGlow * uBoost * vFade, 1.0 );
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 20;
  return pts;
}
