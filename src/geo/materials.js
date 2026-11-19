import * as THREE from 'three';
import { LAND_Y } from '../config.js';

// Uniforms shared by every patched material; the mood system writes to these.
export const shared = {
  uGlow: { value: 0 },
  uTime: { value: 0 },
  uLandY: { value: LAND_Y },
  uWet: { value: 0 },
  uWind: { value: 0.55 },
};

const COMMON = /* glsl */ `
varying vec3 vWPos;
varying vec3 vWNrm;
varying float vKind;
uniform float uGlow;
uniform float uLandY;
uniform float uWet;
float hueHash( vec2 p ) { p = fract( p * vec2( 123.34, 456.21 ) ); p += dot( p, p + 45.32 ); return fract( p.x * p.y ); }
float hueNoise( vec2 p ) {
  vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( hueHash( i ), hueHash( i + vec2( 1.0, 0.0 ) ), f.x ), mix( hueHash( i + vec2( 0.0, 1.0 ) ), hueHash( i + vec2( 1.0, 1.0 ) ), f.x ), f.y );
}
`;

// Surface detail, painted per face kind (see KIND in buf.js). Everything is in world
// space and fades to its average tone once a feature shrinks below a couple of pixels,
// so the far city stays calm and the near city has something to look at.
const SURFACE = /* glsl */ `
#if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
  diffuseColor.rgb *= vColor.rgb * vColor.rgb;
#endif
vec3 hueN = normalize( vWNrm );
float hueH = vWPos.y - uLandY;
float hueWall = 1.0 - smoothstep( 0.25, 0.6, abs( hueN.y ) );
float hueLit = 0.0;      // window light mask, used by the emissive term
vec2 hueCell = vec2( 0.0 );

#ifdef HUE_FOLIAGE
  // leaf clumps: two scales of mottling, cooler in the hollows
  float leafA = hueNoise( vWPos.xz * 1.9 + vWPos.y * 1.3 );
  float leafB = hueNoise( vWPos.xz * 6.0 - vWPos.y * 4.0 );
  float leafC = hueNoise( vWPos.xz * 13.0 + vWPos.y * 9.0 );
  float leaf = leafA * 0.5 + leafB * 0.3 + leafC * 0.2;
  diffuseColor.rgb *= 0.6 + 0.78 * leaf;
  // sunlit clumps go warmer and yellower, hollows cooler
  diffuseColor.rgb = mix( diffuseColor.rgb * vec3( 0.8, 0.94, 1.1 ), diffuseColor.rgb * vec3( 1.1, 1.06, 0.78 ), smoothstep( 0.35, 0.75, leaf ) );
#else

if ( vKind > 0.5 && vKind < 1.5 ) {
  // ---------------- facade ----------------
  diffuseColor.rgb *= mix( 1.0, mix( 0.74, 1.0, smoothstep( 0.0, 6.0, hueH ) ), hueWall );
  vec2 t = normalize( vec2( -hueN.z, hueN.x ) + 1e-5 );
  vec2 uv = vec2( dot( vWPos.xz, t ) / 2.9, hueH / 3.4 );
  vec2 cell = floor( uv ), f = fract( uv );
  hueCell = cell;
  float fw = fwidth( uv.x ) + fwidth( uv.y );
  float detail = ( 1.0 - smoothstep( 0.2, 0.7, fw ) ) * step( 0.5, hueWall ) * step( 0.02, hueH );
  float side = floor( hueN.x * 5.0 ) * 3.7 + floor( hueN.z * 5.0 ) * 1.9;
  float seed = hueHash( cell + side );
  float bay = hueHash( vec2( cell.x + side, 7.0 ) );
  vec3 base = diffuseColor.rgb;
  // plaster: soft blotches and rain streaks running down from the eaves
  float streak = hueNoise( vec2( uv.x * 9.0, uv.y * 0.7 ) );
  base *= 0.93 + 0.1 * hueNoise( uv * vec2( 1.7, 2.3 ) ) - 0.09 * streak * smoothstep( 0.2, 1.0, f.y );
  vec3 col = base;
  if ( cell.y < 0.5 ) {
    // street level: a shopfront or doorway under an awning
    float open = smoothstep( 0.1, 0.14, f.x ) * smoothstep( 0.9, 0.86, f.x ) * smoothstep( 0.02, 0.05, f.y ) * smoothstep( 0.72, 0.68, f.y );
    float awn = smoothstep( 0.04, 0.08, f.x ) * smoothstep( 0.96, 0.92, f.x ) * smoothstep( 0.7, 0.73, f.y ) * smoothstep( 0.86, 0.83, f.y );
    vec3 awnCol = bay < 0.25 ? vec3( 0.55, 0.16, 0.12 ) : bay < 0.5 ? vec3( 0.14, 0.32, 0.42 ) : bay < 0.75 ? vec3( 0.72, 0.56, 0.2 ) : vec3( 0.2, 0.38, 0.26 );
    awnCol *= 0.85 + 0.3 * step( 0.5, fract( uv.x * 9.0 ) );
    vec3 inside = mix( vec3( 0.05, 0.045, 0.045 ), vec3( 0.2, 0.15, 0.11 ), smoothstep( 0.0, 0.7, f.y ) * 0.6 );
    col = mix( col, inside, open * step( 0.22, bay ) );
    col = mix( col, awnCol, awn * step( 0.4, bay ) );
    hueLit = open * step( 0.22, bay ) * step( seed, 0.6 ) * 0.8;
  } else {
    float inX = smoothstep( 0.23, 0.26, f.x ) * smoothstep( 0.77, 0.74, f.x );
    float inY = smoothstep( 0.3, 0.33, f.y ) * smoothstep( 0.8, 0.77, f.y );
    float win = inX * inY;
    float frame = smoothstep( 0.18, 0.21, f.x ) * smoothstep( 0.82, 0.79, f.x ) * smoothstep( 0.25, 0.28, f.y ) * smoothstep( 0.85, 0.82, f.y );
    float sill = smoothstep( 0.15, 0.18, f.x ) * smoothstep( 0.85, 0.82, f.x ) * smoothstep( 0.2, 0.22, f.y ) * smoothstep( 0.27, 0.25, f.y );
    // glass picks up a little sky toward its top edge; mullion down the middle
    vec3 glass = mix( vec3( 0.06, 0.08, 0.11 ), vec3( 0.26, 0.36, 0.46 ), smoothstep( 0.3, 0.8, f.y ) );
    glass *= 1.0 - 0.6 * ( 1.0 - smoothstep( 0.0, 0.02, abs( f.x - 0.5 ) ) );
    // some windows keep their shutters closed
    float shut = step( 0.74, seed );
    vec3 shutCol = bay < 0.33 ? vec3( 0.17, 0.33, 0.27 ) : bay < 0.66 ? vec3( 0.2, 0.3, 0.4 ) : vec3( 0.36, 0.23, 0.15 );
    shutCol *= 0.8 + 0.2 * step( 0.5, fract( f.y * 22.0 ) );
    col = mix( col, base * 1.14, ( frame - win ) * 0.9 );
    col = mix( col, base * 0.62, sill );
    col = mix( col, mix( glass, shutCol, shut ), win );
    // floor line
    col *= 1.0 - 0.14 * ( 1.0 - smoothstep( 0.0, 0.035, f.y ) );
    hueLit = win * ( 1.0 - shut ) * step( seed, 0.44 );
  }
  diffuseColor.rgb = mix( base * 0.9, col, detail );
  hueLit = mix( 0.1, hueLit, detail ) * step( 0.5, hueWall ) * step( 0.3, hueH );
} else if ( vKind > 1.5 && vKind < 2.5 ) {
  // ---------------- roof tiles ----------------
  vec3 e = hueN.y > 0.985 ? vec3( 1.0, 0.0, 0.0 ) : normalize( cross( hueN, vec3( 0.0, 1.0, 0.0 ) ) );
  vec3 s = cross( e, hueN );
  vec2 uv = vec2( dot( vWPos, e ) / 1.15, dot( vWPos, s ) / 1.5 );
  float fw = fwidth( uv.x ) + fwidth( uv.y );
  float detail = 1.0 - smoothstep( 0.35, 1.2, fw );
  float ridge = pow( abs( sin( 3.14159 * uv.x ) ), 0.6 );
  float course = smoothstep( 0.0, 0.16, fract( uv.y ) );
  float jit = hueHash( floor( uv ) );
  float shade = ( 0.5 + 0.62 * ridge ) * ( 0.66 + 0.34 * course ) * ( 0.88 + 0.24 * jit );
  // age: darker patches, lighter where rain has washed the ridges
  float age = hueNoise( vWPos.xz * 0.45 ) * 0.6 + hueNoise( vWPos.xz * 1.7 ) * 0.4;
  diffuseColor.rgb *= mix( 0.9, shade, detail ) * ( 0.78 + 0.36 * age );
  // lichen and soot where tiles stay damp
  diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * vec3( 0.7, 0.74, 0.66 ), smoothstep( 0.55, 0.9, hueNoise( vWPos.xz * 0.23 + 31.0 ) ) * 0.45 );
} else if ( vKind > 3.5 && vKind < 4.5 ) {
  // ---------------- brick and stone ----------------
  diffuseColor.rgb *= mix( 1.0, mix( 0.76, 1.0, smoothstep( 0.0, 5.0, hueH ) ), hueWall );
  vec2 t = normalize( vec2( -hueN.z, hueN.x ) + 1e-5 );
  float along = dot( vWPos.xz, t );
  float rowf = vWPos.y / 0.62;
  float row = floor( rowf );
  float bu = along / 1.45 + 0.5 * mod( row, 2.0 );
  float fw = fwidth( bu ) + fwidth( rowf );
  float detail = ( 1.0 - smoothstep( 0.25, 0.8, fw ) ) * step( 0.5, hueWall );
  float joint = max( 1.0 - smoothstep( 0.0, 0.09, fract( rowf ) ), 1.0 - smoothstep( 0.0, 0.05, fract( bu ) ) );
  float jit = hueHash( vec2( floor( bu ), row ) );
  float bricks = ( 1.0 - 0.3 * joint ) * ( 0.84 + 0.3 * jit );
  diffuseColor.rgb *= mix( 0.96, bricks, detail );
  // damp and moss creeping over old masonry
  float moss = hueNoise( vec2( along * 0.12, vWPos.y * 0.45 ) ) * 0.7 + hueNoise( vec2( along * 0.5, vWPos.y * 1.3 ) ) * 0.3;
  diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * vec3( 0.72, 0.98, 0.62 ), smoothstep( 0.45, 0.85, moss ) * 0.55 * hueWall );
  diffuseColor.rgb *= 0.9 + 0.2 * hueNoise( vec2( along * 0.05, vWPos.y * 0.2 ) + 9.0 );
} else if ( vKind > 4.5 && vKind < 5.5 ) {
  // ---------------- planted ground ----------------
  float g = hueNoise( vWPos.xz * 0.11 ) * 0.6 + hueNoise( vWPos.xz * 0.9 ) * 0.25 + hueNoise( vWPos.xz * 5.0 ) * 0.15;
  diffuseColor.rgb *= 0.82 + 0.34 * g;
  diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * vec3( 1.1, 1.04, 0.8 ), smoothstep( 0.55, 0.9, g ) * 0.4 );
} else if ( vKind > 5.5 && vKind < 6.5 ) {
  // ---------------- paving ----------------
  diffuseColor.rgb *= 0.93 + 0.1 * hueNoise( vWPos.xz * 0.7 ) + 0.04 * hueNoise( vWPos.xz * 7.0 );
} else if ( vKind > 6.5 && vKind < 7.5 ) {
  // ---------------- lacquered timber hall: columns, panelled doors ----------------
  diffuseColor.rgb *= mix( 1.0, mix( 0.74, 1.0, smoothstep( 0.0, 5.0, hueH ) ), hueWall );
  vec2 t = normalize( vec2( -hueN.z, hueN.x ) + 1e-5 );
  float u = dot( vWPos.xz, t ) / 2.5;
  float f = fract( u );
  float detail = ( 1.0 - smoothstep( 0.2, 0.7, fwidth( u ) * 2.0 ) ) * step( 0.5, hueWall );
  float column = 1.0 - smoothstep( 0.05, 0.08, abs( f - 0.5 ) );
  float panel = smoothstep( 0.1, 0.13, abs( f - 0.5 ) ) * ( 1.0 - smoothstep( 0.42, 0.45, abs( f - 0.5 ) ) );
  float lattice = step( 0.5, fract( vWPos.y * 2.2 ) ) * step( 0.5, fract( u * 6.0 ) );
  vec3 base = diffuseColor.rgb;
  vec3 col = mix( base, base * 0.52 + vec3( 0.02, 0.012, 0.0 ) * lattice, panel );
  col = mix( col, base * 1.25 + vec3( 0.06, 0.03, 0.0 ), column );
  diffuseColor.rgb = mix( base * 0.82, col, detail );
  hueCell = vec2( floor( u ), 0.0 );
  hueLit = panel * 0.35 * detail * step( 0.3, hueH );
} else if ( vKind > 2.5 && vKind < 3.5 ) {
  // ---------------- flat roofs ----------------
  float c = hueNoise( vWPos.xz * 0.5 ) * 0.6 + hueNoise( vWPos.xz * 3.0 ) * 0.4;
  diffuseColor.rgb *= 0.84 + 0.26 * c;
} else {
  diffuseColor.rgb *= mix( 1.0, mix( 0.78, 1.0, smoothstep( 0.0, 5.0, hueH ) ), hueWall * step( 0.0, hueH ) );
}
#endif
// rain darkens what it soaks: ground and roofs most, walls a little
diffuseColor.rgb *= 1.0 - uWet * mix( 0.26, 0.1, hueWall );
`;

// Lambert material for baked vertex-colour geometry (colours are stored sqrt-encoded
// in 8 bits, see Buf.tri) with the procedural surface detail above.
export function cityMaterial({ windows = false, foliage = false, ...opts } = {}) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, ...opts });
  m.defines = { ...(m.defines || {}) };
  if (windows) m.defines.HUE_WINDOWS = '';
  if (foliage) m.defines.HUE_FOLIAGE = '';
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uGlow = shared.uGlow;
    sh.uniforms.uLandY = shared.uLandY;
    sh.uniforms.uWet = shared.uWet;
    sh.uniforms.uTime = shared.uTime;
    sh.uniforms.uWind = shared.uWind;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aKind;\nvarying vec3 vWPos;\nvarying vec3 vWNrm;\nvarying float vKind;\nuniform float uTime;\nuniform float uWind;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #if defined( HUE_FOLIAGE ) && defined( USE_INSTANCING )
        {
          // wind: the whole crown leans and recovers, leaves shiver; one direction for the whole city
          mat3 wim = mat3( instanceMatrix );
          vec3 origin = instanceMatrix[ 3 ].xyz;
          float ph = origin.x * 0.045 + origin.z * 0.06;
          float gust = sin( uTime * 1.2 + ph ) + 0.5 * sin( uTime * 2.7 + ph * 1.7 ) + 0.25 * sin( uTime * 5.3 + ph * 2.9 );
          float lift = clamp( ( transformed.y + 1.75 ) / 2.75, 0.0, 1.0 );
          vec3 windL = ( vec3( 0.78, 0.0, -0.42 ) * wim ) / vec3( dot( wim[ 0 ], wim[ 0 ] ), dot( wim[ 1 ], wim[ 1 ] ), dot( wim[ 2 ], wim[ 2 ] ) );
          transformed += windL * gust * 0.22 * lift * lift * uWind;
          transformed += normal * sin( uTime * 6.0 + position.x * 11.0 + position.z * 9.0 + ph ) * 0.012 * uWind * lift;
        }
        #endif`,
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        {
          vec4 wp = vec4( transformed, 1.0 );
          vec3 wn = objectNormal;
          #ifdef USE_INSTANCING
            wp = instanceMatrix * wp;
            mat3 im = mat3( instanceMatrix );
            wn /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
            wn = im * wn;
          #endif
          vWPos = ( modelMatrix * wp ).xyz;
          vWNrm = normalize( mat3( modelMatrix ) * wn );
          vKind = aKind;
        }`,
      );
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + COMMON)
      .replace('#include <color_fragment>', SURFACE)
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        #ifdef HUE_WINDOWS
        if ( uGlow > 0.01 ) {
          vec3 warm = mix( vec3( 1.0, 0.62, 0.28 ), vec3( 1.0, 0.86, 0.62 ), hueHash( hueCell + 9.1 ) );
          totalEmissiveRadiance += warm * hueLit * uGlow * 1.9;
        }
        #endif`,
      );
  };
  m.customProgramCacheKey = () => 'hue-city-' + (windows ? 'w' : 'p') + (foliage ? 'f' : '');
  return m;
}

// The land slab: broad tonal drift plus fine grain, so open ground is not one flat colour.
export function landMaterial(color, turf = false) {
  const m = new THREE.MeshLambertMaterial({ color });
  if (turf) m.defines = { HUE_TURF: '' };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uWet = shared.uWet;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vWPos; uniform float uWet;
        float lHash( vec2 p ) { p = fract( p * vec2( 123.34, 456.21 ) ); p += dot( p, p + 45.32 ); return fract( p.x * p.y ); }
        float lNoise( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
          return mix( mix( lHash( i ), lHash( i + vec2( 1.0, 0.0 ) ), f.x ), mix( lHash( i + vec2( 0.0, 1.0 ) ), lHash( i + vec2( 1.0, 1.0 ) ), f.x ), f.y ); }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        // gardens and bare earth: Huế's plots are more green than paved
        float lg = lNoise( vWPos.xz * 0.012 ) * 0.5 + lNoise( vWPos.xz * 0.09 ) * 0.3 + lNoise( vWPos.xz * 0.9 ) * 0.2;
        float grass = smoothstep( 0.38, 0.62, lNoise( vWPos.xz * 0.035 + 4.0 ) * 0.6 + lNoise( vWPos.xz * 0.21 ) * 0.4 );
        vec3 turf = vec3( 0.37, 0.5, 0.24 ) * ( 0.8 + 0.4 * lNoise( vWPos.xz * 1.3 ) );
        #ifdef HUE_TURF
          diffuseColor.rgb = mix( diffuseColor.rgb, turf, grass * 0.62 );
        #endif
        diffuseColor.rgb *= 0.86 + 0.26 * lg;
        diffuseColor.rgb *= 1.0 - uWet * 0.26;`,
      );
  };
  m.customProgramCacheKey = () => 'hue-land' + (turf ? '-turf' : '');
  return m;
}

// sqrt-encode a linear [r,g,b] for instanceColor (the shader squares it back)
export const enc = (c, target = new THREE.Color()) => target.setRGB(Math.sqrt(c[0]), Math.sqrt(c[1]), Math.sqrt(c[2]), THREE.LinearSRGBColorSpace);

// Soft additive light points (street lamps, bridge lamps). Never smaller than ~2 px,
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
